
import requests
import sys
import json
from datetime import datetime

class ChineseLearnAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.session_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.text}")
                    return False, response.json()
                except:
                    return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test the health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        if success:
            print(f"Health check response: {response}")
        return success

    def test_get_languages(self):
        """Test getting supported languages"""
        success, response = self.run_test(
            "Get Supported Languages",
            "GET",
            "api/languages",
            200
        )
        if success:
            languages = response.get('languages', [])
            print(f"Supported languages count: {len(languages)}")
            print(f"Sample languages: {languages[:5]}...")
        return success

    def test_generate_vocabulary(self, topic="餐厅点餐", native_language="English"):
        """Test vocabulary generation with enhanced features"""
        success, response = self.run_test(
            "Generate Vocabulary",
            "POST",
            "api/generate-vocabulary",
            200,
            data={
                "topic": topic,
                "native_language": native_language
            }
        )
        if success:
            self.session_id = response.get('session_id')
            vocabulary = response.get('vocabulary', [])
            print(f"Session ID: {self.session_id}")
            print(f"Vocabulary items count: {len(vocabulary)}")
            
            # Verify enhanced vocabulary features
            if vocabulary:
                sample_item = vocabulary[0]
                print(f"Sample vocabulary item:")
                print(f"  Chinese: {sample_item.get('chinese')}")
                print(f"  Pinyin: {sample_item.get('pinyin')}")
                print(f"  Translation: {sample_item.get('translation')}")
                print(f"  Example sentence: {sample_item.get('example_sentence')}")
                print(f"  Example translation: {sample_item.get('example_translation')}")
                
                # Check for new features
                has_pattern = 'sentence_pattern' in sample_item and sample_item.get('sentence_pattern')
                has_explanation = 'pattern_explanation' in sample_item and sample_item.get('pattern_explanation')
                
                if has_pattern and has_explanation:
                    print(f"  ✅ NEW FEATURE - Sentence pattern: {sample_item.get('sentence_pattern')}")
                    print(f"  ✅ NEW FEATURE - Pattern explanation: {sample_item.get('pattern_explanation')}")
                else:
                    print(f"  ❌ Missing new vocabulary features")
                    if not has_pattern:
                        print(f"    - Missing sentence_pattern")
                    if not has_explanation:
                        print(f"    - Missing pattern_explanation")
                    success = False
                    self.tests_passed -= 1
        return success

    def test_start_dialogue(self, message="你好，我想点菜"):
        """Test dialogue interaction"""
        if not self.session_id:
            print("❌ Cannot test dialogue without a session ID")
            return False
            
        success, response = self.run_test(
            "Start Dialogue",
            "POST",
            "api/start-dialogue",
            200,
            data={
                "session_id": self.session_id,
                "message": message,
                "is_user": True
            }
        )
        if success:
            print(f"AI Response: {response.get('response')}")
            print(f"Translation: {response.get('translation')}")
            print(f"Suggestions count: {len(response.get('suggestions', []))}")
        return success

    def test_get_dialogue_translation(self):
        """Test the dialogue translation feature"""
        if not self.session_id:
            print("❌ Cannot test dialogue translation without a session ID")
            return False
            
        success, response = self.run_test(
            "Get Dialogue Translation",
            "POST",
            f"api/get-dialogue-translation?session_id={self.session_id}",
            200
        )
        
        if success:
            translations = response.get('translations', [])
            print(f"Dialogue translations count: {len(translations)}")
            
            if translations:
                print("Sample translation:")
                sample = translations[0]
                print(f"  Original: {sample.get('original')}")
                print(f"  Translation: {sample.get('translation')}")
                print(f"  Speaker: {sample.get('speaker')}")
            else:
                print("No translations returned")
                if len(translations) == 0:
                    # This might be expected if no dialogue has occurred yet
                    print("Note: Empty translations may be expected if no dialogue has occurred")
        
        return success

    def test_end_session(self):
        """Test ending session and getting learning report"""
        if not self.session_id:
            print("❌ Cannot end session without a session ID")
            return False
            
        success, response = self.run_test(
            "End Session",
            "POST",
            f"api/end-session?session_id={self.session_id}",
            200
        )
        if success:
            print(f"Learning report:")
            print(f"  Topic: {response.get('topic')}")
            print(f"  Vocabulary learned: {response.get('vocabulary_learned')}")
            print(f"  Dialogue turns: {response.get('dialogue_turns')}")
            print(f"  Overall score: {response.get('overall_score')}")
            print(f"  Strengths: {response.get('strengths')}")
        return success

    def test_get_session(self):
        """Test retrieving session data"""
        if not self.session_id:
            print("❌ Cannot get session without a session ID")
            return False
            
        success, response = self.run_test(
            "Get Session",
            "GET",
            f"api/session/{self.session_id}",
            200
        )
        if success:
            print(f"Session data retrieved successfully")
            print(f"  Topic: {response.get('topic')}")
            print(f"  Status: {response.get('status')}")
        return success

    def run_conversation_flow(self):
        """Run a complete conversation flow to test all features"""
        print("\n🔄 Testing complete conversation flow with new features...")
        
        # Step 1: Generate vocabulary
        vocab_success = self.test_generate_vocabulary()
        if not vocab_success:
            print("❌ Failed at vocabulary generation step")
            return False
            
        # Step 2: Start dialogue with multiple messages
        messages = [
            "你好，我想点菜",
            "我想要一碗米饭和一份鱼",
            "这个菜多少钱？"
        ]
        
        for msg in messages:
            dialogue_success = self.test_start_dialogue(msg)
            if not dialogue_success:
                print(f"❌ Failed during dialogue with message: {msg}")
                return False
        
        # Step 3: Test dialogue translation
        translation_success = self.test_get_dialogue_translation()
        if not translation_success:
            print("❌ Failed at dialogue translation step")
            return False
            
        # Step 4: End session and get report
        end_success = self.test_end_session()
        if not end_success:
            print("❌ Failed at session end step")
            return False
            
        print("✅ Complete conversation flow test passed")
        return True

def main():
    # Get backend URL from frontend .env file
    with open('/app/frontend/.env', 'r') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                backend_url = line.strip().split('=')[1].strip('"\'')
                break
    
    print(f"Using backend URL: {backend_url}")
    
    # Setup tester
    tester = ChineseLearnAPITester(backend_url)
    
    # Run basic tests
    basic_tests = [
        tester.test_health_check,
        tester.test_get_languages
    ]
    
    for test_func in basic_tests:
        test_func()
    
    # Run the complete conversation flow test
    tester.run_conversation_flow()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print("\n🔍 Test Summary:")
    print("1. Enhanced vocabulary features (sentence patterns and explanations)")
    print("2. Dialogue interaction")
    print("3. Dialogue translation")
    print("4. Session management and reporting")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
