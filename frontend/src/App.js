import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [currentStep, setCurrentStep] = useState('language-selection');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [topic, setTopic] = useState('');
  const [sessionData, setSessionData] = useState(null);
  const [dialogueMessages, setDialogueMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [learningReport, setLearningReport] = useState(null);
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSupportedLanguages();
  }, []);

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
    setSelectedLanguage(language);
    setCurrentStep('topic-input');
  };

  const handleTopicSubmit = async () => {
    if (!topic.trim()) {
      setError('Please enter a conversation topic');
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
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to get response. Please try again.');
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
    setError('');
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
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Choose Your Conversation Topic</h2>
          <p className="text-gray-600">Native Language: <span className="font-semibold text-blue-600">{selectedLanguage}</span></p>
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
            onClick={() => setCurrentStep('language-selection')}
            className="flex-1 py-3 px-6 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
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
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Vocabulary for: {topic}</h2>
            <p className="text-gray-600">Study these words before starting the conversation</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {sessionData?.vocabulary.map((item, index) => (
              <div key={index} className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-6 border-l-4 border-green-500">
                <div className="mb-3">
                  <div className="text-2xl font-bold text-gray-800 mb-1">{item.chinese}</div>
                  <div className="text-lg text-gray-600 mb-2">{item.pinyin}</div>
                  <div className="text-lg font-semibold text-green-700">{item.translation}</div>
                </div>
                <div className="border-t border-green-200 pt-3">
                  <div className="text-gray-800 mb-1">{item.example_sentence}</div>
                  <div className="text-gray-600 text-sm">{item.example_translation}</div>
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
        <div className="bg-white rounded-3xl shadow-2xl h-[80vh] flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">Conversation Practice: {topic}</h2>
            <div className="flex justify-between items-center mt-2">
              <p className="text-gray-600">Practice using your new vocabulary!</p>
              <button
                onClick={endSession}
                className="py-2 px-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                End Session
              </button>
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
              <button
                onClick={sendMessage}
                disabled={isLoading || !currentMessage.trim()}
                className="py-4 px-6 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLearningReport = () => (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-4xl w-full">
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

        <div className="text-center mt-8">
          <button
            onClick={resetApp}
            className="py-4 px-8 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-semibold text-lg hover:from-amber-700 hover:to-orange-700 transition-all transform hover:scale-105"
          >
            Start New Learning Session 🚀
          </button>
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
