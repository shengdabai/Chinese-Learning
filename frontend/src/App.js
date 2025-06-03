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
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          setError('麦克风权限被拒绝。请在浏览器设置中允许麦克风访问，然后刷新页面。');
        } else if (event.error === 'no-speech') {
          setError('没有检测到语音输入，请重试。');
        } else if (event.error === 'network') {
          setError('网络错误，请检查网络连接。');
        } else {
          setError(`语音识别错误: ${event.error}。请尝试使用文字输入。`);
        }
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
      
      setSpeechSupported(true);
      
      // Initialize speech synthesis with better Chinese voice selection
      if ('speechSynthesis' in window) {
        synthRef.current = window.speechSynthesis;
        // Load voices asynchronously
        if (synthRef.current.getVoices().length === 0) {
          synthRef.current.addEventListener('voiceschanged', () => {
            console.log('Voices loaded:', synthRef.current.getVoices().length);
          });
        }
      }
    } else {
      console.log('Speech recognition not supported');
      setSpeechSupported(false);
      setError('您的浏览器不支持语音识别功能。建议使用最新版本的Chrome、Edge或Safari浏览器。');
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      // Request microphone permission explicitly
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setError(''); // Clear any previous permission errors
      return true;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setError('需要麦克风权限才能使用语音输入功能。请点击地址栏的麦克风图标并选择"允许"。');
      return false;
    }
  };

  const startListening = async () => {
    if (recognitionRef.current && !isListening) {
      // Request microphone permission first
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        return;
      }
      
      setCurrentMessage('');
      setError('');
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setError('无法启动语音识别，请稍后重试。');
      }
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
      
      // Clean the text - only speak Chinese characters, remove pinyin and other annotations
      const chineseText = text.replace(/[a-zA-Z\u0100-\u017F\u1E00-\u1EFF]/g, '').trim();
      if (!chineseText) return;
      
      const utterance = new SpeechSynthesisUtterance(chineseText);
      utterance.lang = lang;
      utterance.rate = 0.75; // Slower for learning
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Enhanced Chinese voice selection with better quality priority
      const voices = synthRef.current.getVoices();
      let selectedVoice = null;
      
      // Priority order for high-quality Chinese voices
      const preferredVoices = [
        // Windows high-quality voices
        'Microsoft Xiaoxiao - Chinese (Simplified, PRC)',
        'Microsoft Yaoyao - Chinese (Simplified, PRC)',
        'Microsoft Kangkang - Chinese (Simplified, PRC)',
        'Microsoft Huihui - Chinese (Simplified, PRC)',
        // Google/Chrome voices
        'Google 普通话（中国大陆）',
        'Google Chinese (China)',
        // macOS voices
        'Ting-Ting',
        'Sin-ji',
        // Android voices
        'CMU_US_CLB',
        // Generic fallbacks
        'Chinese Female',
        'Chinese Male'
      ];
      
      // Find the best available Chinese voice
      for (const preferredName of preferredVoices) {
        selectedVoice = voices.find(voice => 
          voice.name.includes(preferredName) ||
          (voice.lang.includes('zh-CN') && voice.name.toLowerCase().includes('chinese'))
        );
        if (selectedVoice) break;
      }
      
      // If still no voice found, find any Chinese voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.lang.startsWith('zh') ||
          voice.name.toLowerCase().includes('chinese') ||
          voice.name.toLowerCase().includes('mandarin')
        );
      }
      
      // Prefer female voices for language learning (generally clearer)
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.lang.includes('zh') && 
          (voice.name.toLowerCase().includes('female') || voice.name.toLowerCase().includes('xiaoxiao'))
        );
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('🔊 Using voice:', selectedVoice.name, selectedVoice.lang);
      } else {
        console.log('⚠️ No Chinese voice found, using default');
      }
      
      // Add speech event handlers
      utterance.onstart = () => {
        console.log('🗣️ Speech started:', chineseText);
      };
      
      utterance.onend = () => {
        console.log('✅ Speech ended');
      };
      
      utterance.onerror = (event) => {
        console.error('❌ Speech error:', event.error);
      };
      
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
      console.log('Calling API with topic:', topic, 'language:', selectedLanguage);
      console.log('API URL:', `${API_BASE_URL}/api/generate-vocabulary`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch(`${API_BASE_URL}/api/generate-vocabulary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic,
          native_language: selectedLanguage
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('API Response data:', data);
      setSessionData(data);
      setCurrentStep('vocabulary-review');
    } catch (error) {
      console.error('Error generating vocabulary:', error);
      
      if (error.name === 'AbortError') {
        setError('Request timed out. Please check your internet connection and try again.');
      } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(`Failed to generate vocabulary: ${error.message}. Please try again.`);
      }
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
        pinyin: data.pinyin,
        isUser: false,
        suggestions: data.suggestions,
        errors_detected: data.errors_detected || []
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
          {isLoading && (
            <div className="mt-2 text-center text-sm text-blue-600">
              ⏳ Generating vocabulary... This may take 10-20 seconds
            </div>
          )}
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
            <h2 className="text-2xl font-bold text-gray-800">对话练习: {topic}</h2>
            <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
              <p className="text-gray-600">使用学到的词汇进行中文对话练习</p>
              <div className="flex gap-2">
                {speechSupported && (
                  <div className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    🎤 语音功能已启用
                  </div>
                )}
                <button
                  onClick={endSession}
                  className="py-2 px-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  结束对话
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {dialogueMessages.map((msg, index) => (
              <div key={index} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl ${msg.isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'} rounded-2xl p-4 relative`}>
                  {/* Chinese Text */}
                  <div className="font-medium mb-2 chinese-text text-lg">{msg.message}</div>
                  
                  {/* Pinyin for AI responses */}
                  {!msg.isUser && msg.pinyin && (
                    <div className="text-sm text-gray-600 mb-2 pinyin-text italic">
                      {msg.pinyin}
                    </div>
                  )}
                  
                  {/* Audio button for AI responses */}
                  {!msg.isUser && (
                    <button
                      onClick={() => speakText(msg.message)}
                      className="absolute top-2 right-2 p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors text-sm"
                      title="播放发音"
                    >
                      🔊
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 rounded-2xl p-4">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span>老师正在思考...</span>
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
                placeholder="用中文输入或点击麦克风说话..."
                className="flex-1 p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none text-lg chinese-text"
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
                  title={isListening ? "停止录音" : "中文语音输入"}
                >
                  {isListening ? '🛑' : '🎤'}
                </button>
              )}
              <button
                onClick={sendMessage}
                disabled={isLoading || !currentMessage.trim()}
                className="py-4 px-6 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                发送
              </button>
            </div>
            {isListening && (
              <div className="mt-2 text-center text-sm text-gray-600">
                🎤 正在录音，请用中文说话...
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
          {/* Left Column */}
          <div className="space-y-6">
            <div className="bg-green-100 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-green-800 mb-3">✅ Strengths 优势</h3>
              <ul className="space-y-2">
                {learningReport?.strengths.map((strength, index) => (
                  <li key={index} className="text-green-700 flex items-start">
                    <span className="mr-2">🌟</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-100 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-blue-800 mb-3">💡 Suggestions 建议</h3>
              <ul className="space-y-2">
                {learningReport?.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-blue-700 flex items-start">
                    <span className="mr-2">💡</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>

            {/* Error Analysis Section */}
            {learningReport?.errors_analysis && learningReport.errors_analysis.length > 0 && (
              <div className="bg-orange-100 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-orange-800 mb-3">🔍 Error Analysis 错误分析</h3>
                <div className="space-y-3">
                  {learningReport.errors_analysis.map((error, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border-l-4 border-orange-400">
                      <div className="font-semibold text-orange-800 mb-1">{error.error_type}</div>
                      <div className="text-sm text-gray-700 mb-2">{error.description}</div>
                      {error.example && (
                        <div className="text-sm">
                          <span className="text-red-600 line-through chinese-text">{error.example}</span>
                          <span className="mx-2">→</span>
                          <span className="text-green-600 chinese-text font-semibold">{error.correction}</span>
                        </div>
                      )}
                      {error.explanation && (
                        <div className="text-xs text-gray-600 mt-1 italic">{error.explanation}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="bg-yellow-100 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-yellow-800 mb-3">🎯 Areas for Improvement 改进方向</h3>
              <ul className="space-y-2">
                {learningReport?.areas_for_improvement.map((area, index) => (
                  <li key={index} className="text-yellow-700 flex items-start">
                    <span className="mr-2">🎯</span>
                    {area}
                  </li>
                ))}
              </ul>
            </div>

            {/* Progress Visualization */}
            {learningReport?.progress_visualization && (
              <div className="bg-purple-100 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-purple-800 mb-3">📊 Progress Visualization 进度可视化</h3>
                <div className="space-y-4">
                  {Object.entries(learningReport.progress_visualization).map(([skill, score]) => (
                    <div key={skill} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-purple-700 capitalize">
                          {skill.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-bold text-purple-800">{score}%</span>
                      </div>
                      <div className="w-full bg-purple-200 rounded-full h-3">
                        <div 
                          className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-1000"
                          style={{ width: `${score}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-indigo-100 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-indigo-800 mb-3">📈 Session Stats 学习统计</h3>
              <div className="space-y-3 text-indigo-700">
                <div className="flex items-center">
                  <span className="mr-3 text-2xl">📚</span>
                  <div>
                    <div className="font-semibold">Vocabulary learned: {learningReport?.vocabulary_learned} words</div>
                    <div className="text-sm text-indigo-600">New words mastered in this session</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="mr-3 text-2xl">💬</span>
                  <div>
                    <div className="font-semibold">Dialogue turns: {learningReport?.dialogue_turns}</div>
                    <div className="text-sm text-indigo-600">Active conversation participation</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="mr-3 text-2xl">🏆</span>
                  <div className="flex items-center">
                    <span className="mr-2 font-semibold">Overall score:</span>
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full px-4 py-2 font-bold text-lg">
                      {learningReport?.overall_score}/100
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dialogue Translation & Analysis Section */}
            <div className="bg-teal-100 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-teal-800 mb-3">💬 对话翻译与分析</h3>
              
              {/* Show translations for recent dialogue */}
              <div className="mb-4">
                <h4 className="font-semibold text-teal-700 mb-2">🗣️ 对话翻译:</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {dialogueMessages.slice(-4).map((msg, index) => (
                    <div key={index} className={`p-2 rounded text-sm ${
                      msg.isUser ? 'bg-blue-50 border-l-4 border-blue-400' : 'bg-green-50 border-l-4 border-green-400'
                    }`}>
                      <div className="font-medium chinese-text">{msg.message}</div>
                      {msg.translation && (
                        <div className="text-gray-600 mt-1">{msg.translation}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Learning suggestions from dialogue */}
              <div>
                <h4 className="font-semibold text-teal-700 mb-2">📚 对话学习建议:</h4>
                <div className="space-y-1">
                  {dialogueMessages
                    .filter(msg => !msg.isUser && msg.suggestions && msg.suggestions.length > 0)
                    .slice(-3)
                    .map((msg, index) => (
                      <div key={index} className="text-sm text-teal-600">
                        {msg.suggestions.map((suggestion, idx) => (
                          <div key={idx} className="flex items-start mb-1">
                            <span className="mr-2">💡</span>
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    ))
                  }
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

  const renderSettings = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800">设置 Settings</h3>
          <button
            onClick={closeSettings}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-700 mb-4">Mother Language 母语</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
            {supportedLanguages.map((language) => (
              <button
                key={language}
                onClick={() => changeLanguage(language)}
                className={`p-3 text-left border-2 rounded-xl transition-all duration-200 transform hover:scale-105 ${
                  selectedLanguage === language
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                    : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                }`}
              >
                {language}
                {selectedLanguage === language && (
                  <span className="ml-2 text-blue-500">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t pt-6">
          <h4 className="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h4>
          <div className="space-y-3">
            <button
              onClick={() => {
                closeSettings();
                startNewTopic();
              }}
              className="w-full py-3 px-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              🆕 Start New Topic 开始新话题
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('chineseLearningLanguage');
                resetApp();
                closeSettings();
              }}
              className="w-full py-3 px-4 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
            >
              🔄 Reset All Settings 重置所有设置
            </button>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <button
            onClick={closeSettings}
            className="py-3 px-6 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors"
          >
            关闭 Close
          </button>
        </div>
      </div>
    </div>
  );

  const renderLoadingScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">Loading Chinese Learning Agent...</p>
      </div>
    </div>
  );

  return (
    <div className="App">
      {currentStep === 'loading' && renderLoadingScreen()}
      {currentStep === 'language-selection' && renderLanguageSelection()}
      {currentStep === 'topic-input' && renderTopicInput()}
      {currentStep === 'vocabulary-review' && renderVocabularyReview()}
      {currentStep === 'dialogue-practice' && renderDialoguePractice()}
      {currentStep === 'learning-report' && renderLearningReport()}
      
      {/* Settings Modal */}
      {showSettings && renderSettings()}
      
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
  );
}

export default App;
