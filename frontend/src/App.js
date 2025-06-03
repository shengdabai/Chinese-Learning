import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [currentStep, setCurrentStep] = useState('loading'); // Start with loading to check saved language
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [topic, setTopic] = useState('');
  const [sessionData, setSessionData] = useState(null);
  const [dialogueMessages, setDialogueMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [learningReport, setLearningReport] = useState(null);
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [error, setError] = useState('');
  
  // Speech recognition states
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [dialogueTranslations, setDialogueTranslations] = useState([]);
  const [showTranslations, setShowTranslations] = useState(false);
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  
  // Speech refs
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  useEffect(() => {
    fetchSupportedLanguages();
    initializeSpeechRecognition();
    checkSavedLanguage();
  }, []);

  const checkSavedLanguage = () => {
    const savedLanguage = localStorage.getItem('chineseLearningLanguage');
    if (savedLanguage) {
      setSelectedLanguage(savedLanguage);
      setIsFirstTime(false);
      setCurrentStep('topic-input');
    } else {
      setIsFirstTime(true);
      setCurrentStep('language-selection');
    }
  };

  const saveLanguagePreference = (language) => {
    localStorage.setItem('chineseLearningLanguage', language);
    setSelectedLanguage(language);
  };

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'zh-CN'; // Chinese Mandarin
      
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError('');
      };
      
      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setCurrentMessage(transcript);
      };
      
      recognitionRef.current.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
      
      setSpeechSupported(true);
      
      // Initialize speech synthesis
      if ('speechSynthesis' in window) {
        synthRef.current = window.speechSynthesis;
      }
    } else {
      console.log('Speech recognition not supported');
      setSpeechSupported(false);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setCurrentMessage('');
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const speakText = (text, lang = 'zh-CN') => {
    if (synthRef.current && text) {
      // Stop any ongoing speech
      synthRef.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.8;
      utterance.pitch = 1;
      
      // Try to find a Chinese voice
      const voices = synthRef.current.getVoices();
      const chineseVoice = voices.find(voice => voice.lang.includes('zh'));
      if (chineseVoice) {
        utterance.voice = chineseVoice;
      }
      
      synthRef.current.speak(utterance);
    }
  };

  const convertToPinyin = (chineseText) => {
    // This is a basic implementation - in production you might want to use the backend
    // For now, we'll rely on the backend to provide pinyin
    return chineseText;
  };

  const fetchSupportedLanguages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/languages`);
      const data = await response.json();
      setSupportedLanguages(data.languages);
    } catch (error) {
      console.error('Error fetching languages:', error);
      setError('Failed to load supported languages');
    }
  };

  const handleLanguageSelection = (language) => {
    saveLanguagePreference(language);
    setCurrentStep('topic-input');
  };

  const startNewTopic = () => {
    setTopic('');
    setSessionData(null);
    setDialogueMessages([]);
    setCurrentMessage('');
    setLearningReport(null);
    setDialogueTranslations([]);
    setShowTranslations(false);
    setError('');
    setCurrentStep('topic-input');
    
    // Stop any ongoing speech
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const handleTopicSubmit = async () => {
    if (!topic.trim()) {
      setError('Please enter a conversation topic');
      return;
    }
    
    if (topic.trim().length < 3) {
      setError('Please enter a more detailed conversation topic (at least 3 characters)');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-vocabulary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic,
          native_language: selectedLanguage
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate vocabulary');
      }

      const data = await response.json();
      setSessionData(data);
      setCurrentStep('vocabulary-review');
    } catch (error) {
      console.error('Error generating vocabulary:', error);
      setError('Failed to generate vocabulary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startDialogue = () => {
    setCurrentStep('dialogue-practice');
    setDialogueMessages([
      {
        message: `Let's start practicing Chinese conversation about "${topic}"! Try using the vocabulary words we learned. How would you start this conversation?`,
        translation: `Let's start practicing Chinese conversation about "${topic}"! Try using the vocabulary words we learned. How would you start this conversation?`,
        isUser: false,
        suggestions: ['Start with a greeting', 'Ask a question about the topic', 'Make a simple statement']
      }
    ]);
  };

  const sendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage = {
      message: currentMessage,
      isUser: true,
      translation: '',
      suggestions: []
    };

    setDialogueMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/start-dialogue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionData.session_id,
          message: currentMessage,
          is_user: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const aiMessage = {
        message: data.response,
        translation: data.translation,
        isUser: false,
        suggestions: data.suggestions
      };

      setDialogueMessages(prev => [...prev, aiMessage]);
      
      // Auto-play AI response
      setTimeout(() => {
        speakText(data.response, 'zh-CN');
      }, 500);
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getDialogueTranslations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/get-dialogue-translation?session_id=${sessionData.session_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get translations');
      }

      const data = await response.json();
      setDialogueTranslations(data.translations);
      setShowTranslations(true);
    } catch (error) {
      console.error('Error getting translations:', error);
      setError('Failed to get dialogue translations.');
    } finally {
      setIsLoading(false);
    }
  };

  const endSession = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/end-session?session_id=${sessionData.session_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const report = await response.json();
      setLearningReport(report);
      setCurrentStep('learning-report');
    } catch (error) {
      console.error('Error ending session:', error);
      setError('Failed to generate learning report.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetApp = () => {
    setCurrentStep('language-selection');
    setSelectedLanguage('');
    setTopic('');
    setSessionData(null);
    setDialogueMessages([]);
    setCurrentMessage('');
    setLearningReport(null);
    setDialogueTranslations([]);
    setShowTranslations(false);
    setError('');
    
    // Stop any ongoing speech
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  const changeLanguage = (language) => {
    saveLanguagePreference(language);
    setShowSettings(false);
    // If user is in the middle of a session, they might want to restart with new language
    if (currentStep !== 'topic-input') {
      startNewTopic();
    }
  };

  const renderLanguageSelection = () => (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🇨🇳 Chinese Learning Agent</h1>
          <p className="text-gray-600 text-lg">Select your native language to begin your Chinese learning journey</p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
          {supportedLanguages.map((language) => (
            <button
              key={language}
              onClick={() => handleLanguageSelection(language)}
              className="p-4 text-left border-2 border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all duration-200 transform hover:scale-105"
            >
              <span className="font-medium text-gray-800">{language}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTopicInput = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full relative">
        {/* Settings Button */}
        <button
          onClick={openSettings}
          className="absolute top-6 right-6 p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
          title="设置 Settings"
        >
          ⚙️
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {isFirstTime ? 'Welcome to Chinese Learning!' : 'Choose Your Next Topic'}
          </h2>
          <p className="text-gray-600">
            Native Language: <span className="font-semibold text-blue-600">{selectedLanguage}</span>
          </p>
          {!isFirstTime && (
            <p className="text-gray-500 text-sm mt-2">
              🎯 Continue your Chinese learning journey with a new conversation topic
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="mb-6">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a conversation topic (e.g., 'ordering food at a restaurant', 'introducing yourself', 'talking about hobbies')"
            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none h-32 text-lg"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleTopicSubmit}
            disabled={isLoading || !topic.trim()}
            className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Generating...' : 'Generate Vocabulary'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderVocabularyReview = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8 relative">
          {/* Settings Button */}
          <button
            onClick={openSettings}
            className="absolute top-6 right-6 p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
            title="设置 Settings"
          >
            ⚙️
          </button>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Vocabulary for: {topic}</h2>
            <p className="text-gray-600">Study these words before starting the conversation</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {sessionData?.vocabulary.map((item, index) => (
              <div key={index} className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-6 border-l-4 border-green-500">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-2xl font-bold text-gray-800">{item.chinese}</div>
                    <button
                      onClick={() => speakText(item.chinese)}
                      className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                      title="发音"
                    >
                      🔊
                    </button>
                  </div>
                  <div className="text-lg text-gray-600 mb-2 pinyin-text">{item.pinyin}</div>
                  <div className="text-lg font-semibold text-green-700">{item.translation}</div>
                </div>
                
                <div className="border-t border-green-200 pt-3 mb-3">
                  <div className="text-sm font-semibold text-green-800 mb-1">例句 Example:</div>
                  <div className="text-gray-800 mb-1 chinese-text">{item.example_sentence}</div>
                  <div className="text-gray-600 text-sm">{item.example_translation}</div>
                </div>
                
                <div className="border-t border-green-200 pt-3">
                  <div className="text-sm font-semibold text-green-800 mb-1">句型 Pattern:</div>
                  <div className="text-gray-800 mb-1 font-mono bg-green-50 px-2 py-1 rounded">{item.sentence_pattern}</div>
                  <div className="text-gray-600 text-sm">{item.pattern_explanation}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={startDialogue}
              className="py-4 px-8 bg-green-600 text-white rounded-xl font-semibold text-lg hover:bg-green-700 transition-colors transform hover:scale-105"
            >
              Start Conversation Practice 🗣️
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDialoguePractice = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl h-[80vh] flex flex-col relative">
          {/* Settings Button */}
          <button
            onClick={openSettings}
            className="absolute top-4 right-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors z-10"
            title="设置 Settings"
          >
            ⚙️
          </button>

          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">Conversation Practice: {topic}</h2>
            <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
              <p className="text-gray-600">Practice using your new vocabulary!</p>
              <div className="flex gap-2">
                {speechSupported && (
                  <div className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    🎤 语音功能已启用
                  </div>
                )}
                <button
                  onClick={getDialogueTranslations}
                  className="py-2 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  disabled={isLoading}
                >
                  获取翻译
                </button>
                <button
                  onClick={endSession}
                  className="py-2 px-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  End Session
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {dialogueMessages.map((msg, index) => (
              <div key={index} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl ${msg.isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'} rounded-2xl p-4`}>
                  <div className="font-medium mb-2">{msg.message}</div>
                  {msg.translation && (
                    <div className={`text-sm ${msg.isUser ? 'text-blue-100' : 'text-gray-600'} mb-2`}>
                      Translation: {msg.translation}
                    </div>
                  )}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm font-semibold mb-2">Suggestions:</div>
                      <div className="space-y-1">
                        {msg.suggestions.map((suggestion, idx) => (
                          <div key={idx} className={`text-sm ${msg.isUser ? 'text-blue-100' : 'text-gray-600'}`}>
                            • {suggestion}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 rounded-2xl p-4">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span>Teacher is typing...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="px-6 py-2">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
                {error}
              </div>
            </div>
          )}

          <div className="p-6 border-t border-gray-200">
            <div className="flex space-x-4">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
                placeholder="Type your message in Chinese or English..."
                className="flex-1 p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none text-lg"
                disabled={isLoading}
              />
              {speechSupported && (
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`py-4 px-4 rounded-xl font-semibold transition-colors ${
                    isListening 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                  disabled={isLoading}
                  title={isListening ? "停止录音" : "开始语音输入"}
                >
                  {isListening ? '🛑' : '🎤'}
                </button>
              )}
              <button
                onClick={sendMessage}
                disabled={isLoading || !currentMessage.trim()}
                className="py-4 px-6 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
            {isListening && (
              <div className="mt-2 text-center text-sm text-gray-600">
                🎤 正在录音... 请说中文
              </div>
            )}
          </div>
        </div>
        
        {/* Dialogue Translations Modal */}
        {showTranslations && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">对话翻译 Dialogue Translation</h3>
                <button
                  onClick={() => setShowTranslations(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                {dialogueTranslations.map((translation, index) => (
                  <div key={index} className={`p-4 rounded-xl ${
                    translation.is_user 
                      ? 'bg-blue-100 border-l-4 border-blue-500' 
                      : 'bg-green-100 border-l-4 border-green-500'
                  }`}>
                    <div className="font-semibold mb-2 text-gray-700">
                      {translation.is_user ? '学生 Student' : '老师 Teacher'}
                    </div>
                    <div className="text-lg mb-2 chinese-text">{translation.original}</div>
                    <div className="text-gray-600">{translation.translation}</div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowTranslations(false)}
                  className="py-3 px-6 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
                >
                  关闭 Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderLearningReport = () => (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-4xl w-full relative">
        {/* Settings Button */}
        <button
          onClick={openSettings}
          className="absolute top-6 right-6 p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
          title="设置 Settings"
        >
          ⚙️
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Learning Report 📊</h2>
          <p className="text-gray-600">Session completed for topic: <span className="font-semibold">{topic}</span></p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-green-100 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-green-800 mb-3">✅ Strengths</h3>
              <ul className="space-y-2">
                {learningReport?.strengths.map((strength, index) => (
                  <li key={index} className="text-green-700">• {strength}</li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-100 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-blue-800 mb-3">💡 Suggestions</h3>
              <ul className="space-y-2">
                {learningReport?.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-blue-700">• {suggestion}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-yellow-100 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-yellow-800 mb-3">🎯 Areas for Improvement</h3>
              <ul className="space-y-2">
                {learningReport?.areas_for_improvement.map((area, index) => (
                  <li key={index} className="text-yellow-700">• {area}</li>
                ))}
              </ul>
            </div>

            <div className="bg-purple-100 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-purple-800 mb-3">📈 Session Stats</h3>
              <div className="space-y-3 text-purple-700">
                <div>📚 Vocabulary learned: {learningReport?.vocabulary_learned} words</div>
                <div>💬 Dialogue turns: {learningReport?.dialogue_turns}</div>
                <div className="flex items-center">
                  <span className="mr-2">🏆 Overall score:</span>
                  <div className="bg-purple-600 text-white rounded-full px-4 py-1 font-bold">
                    {learningReport?.overall_score}/100
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 space-y-4">
          <button
            onClick={startNewTopic}
            className="py-4 px-8 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-semibold text-lg hover:from-amber-700 hover:to-orange-700 transition-all transform hover:scale-105 mr-4"
          >
            Continue Learning 继续练习 🚀
          </button>
          <div className="text-sm text-gray-500">
            Choose a new topic to continue your Chinese learning journey
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="App">
      {currentStep === 'language-selection' && renderLanguageSelection()}
      {currentStep === 'topic-input' && renderTopicInput()}
      {currentStep === 'vocabulary-review' && renderVocabularyReview()}
      {currentStep === 'dialogue-practice' && renderDialoguePractice()}
      {currentStep === 'learning-report' && renderLearningReport()}
    </div>
  );
}

export default App;
