from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, StringConstraints, UUID4, field_validator
from typing import List, Optional, Dict, Any, Annotated
from contextlib import asynccontextmanager
from copy import deepcopy
import os
from dotenv import load_dotenv
import uuid
import json
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from openai import AsyncOpenAI
import pinyin

# Load environment variables
load_dotenv()

@asynccontextmanager
async def lifespan(app):
    global openai_client
    if not os.environ.get("OPENAI_API_KEY"):
        raise RuntimeError("OPENAI_API_KEY is not set. Set it before starting the server.")
    openai_client = AsyncOpenAI(timeout=30, max_retries=1)
    try:
        await check_database_permissions()
        yield
    finally:
        await openai_client.close()
        client.close()


app = FastAPI(lifespan=lifespan)

# CORS middleware
# Origins are configured via the ALLOWED_ORIGINS environment variable
# (comma-separated). Defaults to common local dev origins so the app works
# out of the box, but production deployments MUST set ALLOWED_ORIGINS to the
# real frontend domain(s) instead of relying on a wildcard.
_allowed_origins_env = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:8001,http://127.0.0.1:3000",
)
ALLOWED_ORIGINS = [
    origin.strip() for origin in _allowed_origins_env.split(",") if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
sessions_collection = db['learning_sessions']
progress_collection = db['user_progress']

# OpenAI client
openai_client = None  # Created and closed by the application lifespan.

# Model name is configurable via OPENAI_MODEL so the deployment is not locked
# to a single model (gpt-3.5-turbo is on a deprecation path in some accounts).
OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-3.5-turbo')

# Database status check
DATABASE_AVAILABLE = True
SESSIONS_CACHE = {}  # Fallback in-memory storage

async def check_database_permissions():
    """Check if we have database write permissions"""
    global DATABASE_AVAILABLE
    try:
        # Try to perform a simple operation
        test_doc = {"test": "connection", "timestamp": datetime.now()}
        result = await sessions_collection.insert_one(test_doc)
        await sessions_collection.delete_one({"_id": result.inserted_id})
        print(f"✅ Database connection successful to {DB_NAME}")
        DATABASE_AVAILABLE = True
    except Exception as e:
        print(f"❌ Database permission error: {type(e).__name__}")
        print(f"🔄 Falling back to in-memory storage")
        DATABASE_AVAILABLE = False

async def save_session_data(session_data):
    """Save session data with fallback to memory"""
    if DATABASE_AVAILABLE:
        try:
            await sessions_collection.insert_one(deepcopy(session_data))
            return True
        except Exception as e:
            print(f"❌ Database save error: {type(e).__name__}")
            # Fall back to memory storage
            SESSIONS_CACHE[session_data["session_id"]] = deepcopy(session_data)
            return False
    else:
        # Use memory storage
        SESSIONS_CACHE[session_data["session_id"]] = deepcopy(session_data)
        return False

async def get_session_data(session_id):
    """Get session data with fallback to memory"""
    if session_id in SESSIONS_CACHE:
        return deepcopy(SESSIONS_CACHE[session_id])
    if DATABASE_AVAILABLE:
        try:
            return await sessions_collection.find_one({"session_id": session_id})
        except Exception as e:
            print(f"❌ Database read error: {type(e).__name__}")
            return deepcopy(SESSIONS_CACHE.get(session_id))
    else:
        return deepcopy(SESSIONS_CACHE.get(session_id))

async def update_session_data(session_id, update_data, session_data=None):
    """Update session data with fallback to memory"""
    if session_id in SESSIONS_CACHE:
        SESSIONS_CACHE[session_id].update(deepcopy(update_data))
        return False
    if DATABASE_AVAILABLE:
        try:
            await sessions_collection.update_one(
                {"session_id": session_id},
                {"$set": update_data}
            )
            return True
        except Exception as e:
            print(f"❌ Database update error: {type(e).__name__}")
            # Preserve the loaded session if the database fails after a read.
            if session_data is not None:
                cached = deepcopy(session_data)
                cached.update(deepcopy(update_data))
                SESSIONS_CACHE[session_id] = cached
            return False
    else:
        if session_id in SESSIONS_CACHE:
            SESSIONS_CACHE[session_id].update(deepcopy(update_data))
        return False

# Pydantic models
class LanguageSelection(BaseModel):
    native_language: str

    @field_validator("native_language")
    @classmethod
    def supported_language(cls, value):
        if value not in SUPPORTED_LANGUAGES:
            raise ValueError("Unsupported native language")
        return value

class TopicInput(LanguageSelection):
    topic: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=200)]

class VocabularyItem(BaseModel):
    chinese: str
    pinyin: str
    translation: str
    example_sentence: str
    example_translation: str
    sentence_pattern: str
    pattern_explanation: str

class VocabularyResponse(BaseModel):
    session_id: str
    topic: str
    vocabulary: List[VocabularyItem]

class DialogueMessage(BaseModel):
    session_id: UUID4
    message: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
    is_user: bool

class DialogueResponse(BaseModel):
    response: str
    translation: str
    pinyin: str
    suggestions: List[str]
    errors_detected: List[str] = []

class LearningReport(BaseModel):
    session_id: str
    topic: str
    vocabulary_learned: int
    dialogue_turns: int
    strengths: List[str]
    areas_for_improvement: List[str]
    suggestions: List[str]
    overall_score: int
    errors_analysis: List[Dict[str, Any]] = []
    pronunciation_feedback: List[str] = []
    grammar_insights: List[str] = []
    progress_visualization: Dict[str, Any] = {}

# Supported languages
SUPPORTED_LANGUAGES = [
    "English", "Spanish", "French", "German", "Italian", "Portuguese", 
    "Russian", "Japanese", "Korean", "Arabic", "Hindi", "Dutch", 
    "Swedish", "Norwegian", "Danish", "Finnish", "Polish", "Czech",
    "Hungarian", "Turkish", "Greek", "Hebrew", "Thai", "Vietnamese"
]

def convert_to_pinyin(chinese_text: str) -> str:
    """Convert Chinese characters to Pinyin"""
    try:
        return pinyin.get(chinese_text, format="strip", delimiter=" ")
    except:
        return chinese_text

@app.get("/api/health")
async def health_check():
    db_status = "connected" if DATABASE_AVAILABLE else "fallback_mode"
    return {
        "status": "healthy", 
        "service": "Chinese Learning Agent",
        "database": db_status,
        "storage": "mongodb" if DATABASE_AVAILABLE else "memory"
    }

@app.get("/api/languages")
async def get_supported_languages():
    return {"languages": SUPPORTED_LANGUAGES}

@app.post("/api/generate-vocabulary")
async def generate_vocabulary(topic_input: TopicInput) -> VocabularyResponse:
    try:
        print(f"🚀 Starting vocabulary generation for topic: '{topic_input.topic}' in {topic_input.native_language}")
        session_id = str(uuid.uuid4())
        
        # Create prompt for vocabulary generation
        prompt = f"""
        Generate 8 essential Chinese vocabulary words related to the topic: "{topic_input.topic}"
        
        For each word, provide:
        1. Chinese character(s)
        2. Pinyin pronunciation
        3. Translation to {topic_input.native_language}
        4. A simple example sentence in Chinese
        5. Translation of the example sentence to {topic_input.native_language}
        6. A useful sentence pattern/structure using this word
        7. Explanation of the sentence pattern in {topic_input.native_language}
        
        Format as JSON with this structure:
        {{
            "vocabulary": [
                {{
                    "chinese": "你好",
                    "pinyin": "nǐ hǎo",
                    "translation": "hello",
                    "example_sentence": "你好，很高兴见到你。",
                    "example_translation": "Hello, nice to meet you.",
                    "sentence_pattern": "你好 + [polite expression]",
                    "pattern_explanation": "Use 你好 followed by a polite expression for formal greetings"
                }}
            ]
        }}
        
        Focus on practical, commonly used words and provide useful sentence patterns that learners can apply in real conversations about {topic_input.topic}.
        """
        
        print("📞 Calling OpenAI API...")
        start_time = datetime.now()
        
        response = await openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": f"You are a Chinese language teacher helping students learn vocabulary. Always respond with valid JSON. Translate to {topic_input.native_language}."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=3000,
            timeout=30  # 30 second timeout
        )
        
        end_time = datetime.now()
        print(f"⏱️ OpenAI API call took: {(end_time - start_time).total_seconds():.2f} seconds")
        print(f"✅ OpenAI API response received")
        
        # Parse the response
        response_content = response.choices[0].message.content.strip()
        print(f"📄 Raw response length: {len(response_content)} characters")
        
        try:
            vocabulary_data = json.loads(response_content)
            print(f"✅ JSON parsing successful")
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing failed: {e}")
            print("AI returned invalid JSON")
            raise HTTPException(status_code=500, detail="Invalid JSON response from AI")
        
        vocabulary_items = []
        
        for i, item in enumerate(vocabulary_data["vocabulary"]):
            print(f"Processing vocabulary item {i+1}: {item.get('chinese', 'N/A')}")
            # Convert to pinyin if not provided correctly
            if not item.get("pinyin") or item["pinyin"] == item["chinese"]:
                item["pinyin"] = convert_to_pinyin(item["chinese"])
            
            vocabulary_items.append(VocabularyItem(**item))
        
        print(f"✅ Created {len(vocabulary_items)} vocabulary items")
        
        # Store session in database
        session_data = {
            "session_id": session_id,
            "topic": topic_input.topic,
            "native_language": topic_input.native_language,
            "vocabulary": [item.model_dump() for item in vocabulary_items],
            "created_at": datetime.now(),
            "dialogue_history": [],
            "status": "vocabulary_generated"
        }
        
        db_saved = await save_session_data(session_data)
        storage_type = "database" if db_saved else "memory"
        print(f"💾 Session saved to {storage_type} with ID: {session_id}")
        
        return VocabularyResponse(
            session_id=session_id,
            topic=topic_input.topic,
            vocabulary=vocabulary_items
        )
        
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Unable to generate vocabulary")

@app.post("/api/start-dialogue")
async def start_dialogue(message: DialogueMessage) -> DialogueResponse:
    try:
        # Get session data
        session = await get_session_data(str(message.session_id))
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Build conversation context
        dialogue_history = session.get("dialogue_history", [])
        vocabulary_context = "\n".join([
            f"- {item['chinese']} ({item['pinyin']}) - {item['translation']}"
            for item in session["vocabulary"]
        ])
        
        # Create dialogue prompt
        system_prompt = f"""
        You are a Chinese language teacher conducting a conversation practice session about "{session['topic']}".
        
        Vocabulary for this session:
        {vocabulary_context}
        
        Guidelines:
        1. Respond primarily in Chinese with some {session['native_language']} explanations when needed
        2. Use vocabulary from the lesson when appropriate
        3. Keep responses at beginner-intermediate level
        4. Be encouraging and provide gentle corrections
        5. Ask follow-up questions to continue the conversation
        6. If the student makes mistakes, provide gentle corrections and note them
        7. Analyze the student's input for common errors (grammar, vocabulary usage, sentence structure)
        
        Format your response as JSON:
        {{
            "response": "Your Chinese response with some {session['native_language']} if needed",
            "translation": "Full translation to {session['native_language']}",
            "pinyin": "Pinyin for the Chinese response with tone marks",
            "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
            "errors_detected": ["error1 if any", "error2 if any"]
        }}
        
        Make sure to include accurate pinyin with tone marks for the Chinese response.
        """
        
        # Build message history for context
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add previous dialogue history
        for hist_msg in dialogue_history[-6:]:  # Keep last 6 messages for context
            role = "user" if hist_msg["is_user"] else "assistant"
            messages.append({"role": role, "content": hist_msg["message"]})
        
        # Add current user message
        messages.append({"role": "user", "content": message.message})
        
        response = await openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            temperature=0.8,
            max_tokens=3000
        )
        
        # Get the response content
        response_content = response.choices[0].message.content.strip()
        
        # Try to parse as JSON, if it fails, create a structured response
        try:
            ai_response = json.loads(response_content)
            # Ensure pinyin is provided
            if "pinyin" not in ai_response or not ai_response["pinyin"]:
                ai_response["pinyin"] = convert_to_pinyin(ai_response.get("response", ""))
            # Ensure errors_detected is provided
            if "errors_detected" not in ai_response:
                ai_response["errors_detected"] = []
        except json.JSONDecodeError:
            # If the AI didn't return valid JSON, create a structured response
            ai_response = {
                "response": response_content,
                "translation": f"Translation: {response_content}",
                "pinyin": convert_to_pinyin(response_content),
                "suggestions": ["Continue the conversation", "Ask follow-up questions", "Practice more vocabulary"],
                "errors_detected": []
            }
        
        # Validate the provider response before changing stored conversation data.
        validated_response = DialogueResponse(**ai_response)

        # Update dialogue history
        dialogue_history.extend([
            {
                "message": message.message,
                "is_user": True,
                "timestamp": datetime.now()
            },
            {
                "message": ai_response["response"],
                "is_user": False,
                "errors_detected": ai_response["errors_detected"],
                "timestamp": datetime.now()
            }
        ])
        
        # Update session in database
        update_data = {
            "dialogue_history": dialogue_history,
            "status": "dialogue_active",
            "last_updated": datetime.now()
        }
        await update_session_data(str(message.session_id), update_data, session)
        
        return validated_response

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Unable to process dialogue")

@app.post("/api/get-dialogue-translation")
async def get_dialogue_translation(session_id: UUID4) -> Dict[str, Any]:
    session_id = str(session_id)
    try:
        # Get session data
        session = await get_session_data(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        dialogue_history = session.get("dialogue_history", [])
        if not dialogue_history:
            return {"translations": []}
        
        # Prepare dialogue for translation
        dialogue_text = ""
        for msg in dialogue_history:
            speaker = "用户" if msg["is_user"] else "老师"
            dialogue_text += f"{speaker}: {msg['message']}\n"
        
        # Generate complete translation
        translation_prompt = f"""
        Please translate this complete Chinese learning dialogue to {session['native_language']}.
        Provide a natural, flowing translation that maintains the conversational context.
        
        Dialogue:
        {dialogue_text}
        
        Format as JSON:
        {{
            "dialogue_translations": [
                {{
                    "original": "original message",
                    "translation": "translated message",
                    "speaker": "user/teacher",
                    "is_user": true/false
                }}
            ]
        }}
        """
        
        response = await openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": f"You are a professional translator specializing in Chinese to {session['native_language']} translation. Respond only with valid JSON."},
                {"role": "user", "content": translation_prompt}
            ],
            temperature=0.3,
            max_tokens=3000
        )
        
        # Try to parse the response
        response_content = response.choices[0].message.content.strip()
        try:
            translation_data = json.loads(response_content)
        except json.JSONDecodeError:
            # If JSON parsing fails, create a basic structure
            translation_data = {
                "dialogue_translations": [
                    {
                        "original": msg["message"],
                        "translation": f"Translation of: {msg['message']}",
                        "speaker": "user" if msg["is_user"] else "teacher",
                        "is_user": msg["is_user"]
                    }
                    for msg in dialogue_history
                ]
            }
        
        return {
            "session_id": session_id,
            "topic": session["topic"],
            "translations": translation_data.get("dialogue_translations", [])
        }
        
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Unable to translate dialogue")

@app.post("/api/end-session")
async def end_session_and_generate_report(session_id: UUID4) -> LearningReport:
    session_id = str(session_id)
    try:
        # Get session data
        session = await get_session_data(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        dialogue_history = session.get("dialogue_history", [])
        vocabulary_count = len(session.get("vocabulary", []))
        dialogue_turns = len([msg for msg in dialogue_history if msg["is_user"]])
        
        # Collect errors from dialogue history
        all_errors = []
        for msg in dialogue_history:
            if not msg.get("is_user", True) and "errors_detected" in msg:
                all_errors.extend(msg.get("errors_detected", []))
        
        # Generate comprehensive learning report using GPT
        report_prompt = f"""
        Analyze this Chinese learning session and create a comprehensive, motivational learning report.
        
        Session Details:
        - Topic: {session['topic']}
        - Vocabulary words learned: {vocabulary_count}
        - Dialogue turns: {dialogue_turns}
        - Native language: {session['native_language']}
        - Errors detected: {all_errors}
        
        Dialogue History (last 10 messages):
        {json.dumps(dialogue_history[-10:], indent=2, default=str)}
        
        Create a detailed, motivational learning report in JSON format:
        {{
            "strengths": ["strength1", "strength2", "strength3"],
            "areas_for_improvement": ["area1", "area2", "area3"],
            "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
            "overall_score": 85,
            "errors_analysis": [
                {{
                    "error_type": "Grammar",
                    "description": "Specific error description",
                    "example": "错误的表达",
                    "correction": "正确的表达",
                    "explanation": "Why this is important"
                }}
            ],
            "pronunciation_feedback": ["feedback1", "feedback2"],
            "grammar_insights": ["insight1", "insight2"],
            "progress_visualization": {{
                "vocabulary_mastery": 80,
                "conversation_fluency": 75,
                "grammar_accuracy": 70,
                "pronunciation_clarity": 85,
                "confidence_level": 90
            }}
        }}
        
        Focus on:
        - Encouraging and motivational tone
        - Specific error analysis with examples and corrections
        - Visual progress indicators (percentages for different skills)
        - Actionable suggestions for improvement
        - Celebrating achievements and progress
        
        Score should be 1-100 based on engagement, vocabulary usage, conversation quality, and improvement shown.
        Make the report inspiring and educational!
        """
        
        response = await openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": f"You are an expert Chinese language teacher creating learning reports. Respond only with valid JSON. Be encouraging but constructive. Use {session['native_language']} for explanations."},
                {"role": "user", "content": report_prompt}
            ],
            temperature=0.6,
            max_tokens=3000
        )
        
        # Try to parse the response
        response_content = response.choices[0].message.content.strip()
        try:
            report_data = json.loads(response_content)
        except json.JSONDecodeError:
            # If JSON parsing fails, create a comprehensive basic report structure
            report_data = {
                "strengths": ["Good vocabulary usage", "Active participation in dialogue", "Willingness to practice"],
                "areas_for_improvement": ["Pronunciation practice", "Grammar structure", "Vocabulary expansion"],
                "suggestions": ["Practice more daily conversations", "Review vocabulary regularly", "Try speaking with native speakers"],
                "overall_score": max(60, min(85, vocabulary_count * 8 + dialogue_turns * 3)),
                "errors_analysis": [
                    {
                        "error_type": "General",
                        "description": "Continue practicing to improve accuracy",
                        "example": "需要更多练习",
                        "correction": "继续努力学习",
                        "explanation": "Regular practice leads to better fluency"
                    }
                ],
                "pronunciation_feedback": ["Focus on tone accuracy", "Practice with native speakers"],
                "grammar_insights": ["Review sentence patterns", "Study more complex structures"],
                "progress_visualization": {
                    "vocabulary_mastery": min(90, vocabulary_count * 10),
                    "conversation_fluency": min(85, dialogue_turns * 8),
                    "grammar_accuracy": 70,
                    "pronunciation_clarity": 75,
                    "confidence_level": 80
                }
            }
        
        # Create learning report
        learning_report = LearningReport(
            session_id=session_id,
            topic=session["topic"],
            vocabulary_learned=vocabulary_count,
            dialogue_turns=dialogue_turns,
            strengths=report_data["strengths"],
            areas_for_improvement=report_data["areas_for_improvement"],
            suggestions=report_data["suggestions"],
            overall_score=report_data["overall_score"],
            errors_analysis=report_data.get("errors_analysis", []),
            pronunciation_feedback=report_data.get("pronunciation_feedback", []),
            grammar_insights=report_data.get("grammar_insights", []),
            progress_visualization=report_data.get("progress_visualization", {})
        )
        
        # Update session status
        update_data = {
            "status": "completed",
            "learning_report": learning_report.model_dump(),
            "completed_at": datetime.now()
        }
        await update_session_data(session_id, update_data, session)
        
        # Store in progress collection for user tracking (if database available)
        if DATABASE_AVAILABLE:
            try:
                await progress_collection.insert_one({
                    "session_id": session_id,
                    "topic": session["topic"],
                    "native_language": session["native_language"],
                    "score": learning_report.overall_score,
                    "vocabulary_count": vocabulary_count,
                    "dialogue_turns": dialogue_turns,
                    "created_at": datetime.now()
                })
            except Exception as e:
                print(f"❌ Could not save to progress collection: {type(e).__name__}")
                # Continue without failing - this is not critical
        
        return learning_report
        
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Unable to generate report")

@app.get("/api/session/{session_id}")
async def get_session(session_id: UUID4):
    session_id = str(session_id)
    try:
        session = await get_session_data(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Convert ObjectId to string for JSON serialization if it exists
        if "_id" in session:
            session["_id"] = str(session["_id"])
        return session
        
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Unable to retrieve session")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
