import React, { useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, Star, Target, Brain, Zap } from 'lucide-react';

// Get backend URL from environment variable, fallback for development
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://claude-flashcards-backend-production.up.railway.app';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [prompt, setPrompt] = useState('French GCSE vocabulary - basic family members and greetings');
  const [flashcards, setFlashcards] = useState([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    streak: 0,
    maxStreak: 0,
    xp: 0,
    level: 1
  });
  const [cardResults, setCardResults] = useState({});

  const generateSampleCards = () => {
    const sampleCards = [
      { front: "Hello", back: "Bonjour", difficulty: "easy", category: "Greetings" },
      { front: "How are you?", back: "Comment allez-vous?", difficulty: "medium", category: "Greetings" },
      { front: "My name is...", back: "Je m'appelle...", difficulty: "easy", category: "Introductions" },
      { front: "Mother", back: "Mère", difficulty: "easy", category: "Family" },
      { front: "Father", back: "Père", difficulty: "easy", category: "Family" },
      { front: "Brother", back: "Frère", difficulty: "easy", category: "Family" },
      { front: "Sister", back: "Sœur", difficulty: "easy", category: "Family" },
      { front: "Goodbye", back: "Au revoir", difficulty: "easy", category: "Greetings" },
      { front: "Please", back: "S'il vous plaît", difficulty: "medium", category: "Politeness" },
      { front: "Thank you very much", back: "Merci beaucoup", difficulty: "medium", category: "Politeness" }
    ];
    
    setFlashcards(sampleCards);
    setCurrentCard(0);
    setShowAnswer(false);
    setCardResults({});
    setError('');
  };

  const generateFlashcards = async () => {
    console.log('🔵 Generating flashcards...');
    console.log('🔍 Backend URL:', BACKEND_URL);
    
    setError('');
    
    if (!apiKey || apiKey.trim() === '') {
      setError('Please enter your Claude API key first');
      return;
    }

    if (!apiKey.startsWith('sk-ant-')) {
      setError('API key should start with "sk-ant-". Please check your key.');
      return;
    }

    setLoading(true);
    
    try {
      console.log('🚀 Making request to backend...');
      
      const response = await fetch(`${BACKEND_URL}/generate-cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          apiKey: apiKey
        })
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Received flashcards:', data.flashcards?.length || 0);
      
      if (data.flashcards && data.flashcards.length > 0) {
        setFlashcards(data.flashcards);
        setCurrentCard(0);
        setShowAnswer(false);
        setCardResults({});
        setError('');
      } else {
        throw new Error('No flashcards received from server');
      }

    } catch (error) {
      console.error('🔥 Error:', error);
      setError(`Failed to generate flashcards: ${error.message}`);
    }
    
    setLoading(false);
  };

  const calculateXP = (difficulty, correct) => {
    const baseXP = { easy: 10, medium: 20, hard: 30 };
    const multiplier = correct ? 1 : 0.3;
    return Math.floor(baseXP[difficulty] * multiplier);
  };

  const updateLevel = (xp) => {
    return Math.floor(xp / 100) + 1;
  };

  const handleAnswer = (correct) => {
    const card = flashcards[currentCard];
    const xpGained = calculateXP(card.difficulty, correct);
    
    const newStats = {
      ...sessionStats,
      correct: sessionStats.correct + (correct ? 1 : 0),
      incorrect: sessionStats.incorrect + (correct ? 0 : 1),
      streak: correct ? sessionStats.streak + 1 : 0,
      maxStreak: correct ? Math.max(sessionStats.maxStreak, sessionStats.streak + 1) : sessionStats.maxStreak,
      xp: sessionStats.xp + xpGained
    };
    
    newStats.level = updateLevel(newStats.xp);
    setSessionStats(newStats);

    setCardResults({
      ...cardResults,
      [currentCard]: {
        correct,
        attempts: (cardResults[currentCard]?.attempts || 0) + 1,
        difficulty: card.difficulty
      }
    });

    setTimeout(() => {
      setShowAnswer(false);
      if (currentCard < flashcards.length - 1) {
        setCurrentCard(currentCard + 1);
      }
    }, 1500);
  };

  const resetSession = () => {
    setCurrentCard(0);
    setShowAnswer(false);
    setSessionStats({
      correct: 0,
      incorrect: 0,
      streak: 0,
      maxStreak: 0,
      xp: 0,
      level: 1
    });
    setCardResults({});
  };

  const exportProgress = () => {
    const data = {
      sessionStats,
      cardResults,
      prompt,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claude-flashcard-progress-${Date.now()}.json`;
    a.click();
  };

  const isSessionComplete = currentCard >= flashcards.length;
  const accuracy = sessionStats.correct + sessionStats.incorrect > 0 
    ? Math.round((sessionStats.correct / (sessionStats.correct + sessionStats.incorrect)) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
      <div className="max-w-md mx-auto">
        
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <Brain className="w-8 h-8 text-yellow-400" />
            Claude Cards
          </h1>
          <p className="text-blue-200">AI-Generated Spaced Repetition</p>
        </div>

        {/* Stats Bar */}
        {flashcards.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 mb-4 text-white">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <span>Level {sessionStats.level}</span>
              </div>
              <div className="text-sm">
                XP: {sessionStats.xp} / {sessionStats.level * 100}
              </div>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 mb-3">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-orange-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((sessionStats.xp % 100) / 100) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-400" />
                {sessionStats.correct}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-orange-400" />
                Streak: {sessionStats.streak}
              </span>
              <span className="flex items-center gap-1">
                <Target className="w-4 h-4 text-blue-400" />
                {accuracy}%
              </span>
            </div>
          </div>
        )}

        {/* API Key Input */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 mb-4">
          <label className="block text-white text-sm font-medium mb-2">
            Claude API Key
          </label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-md text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="sk-ant-..."
          />
          {apiKey && !apiKey.startsWith('sk-ant-') && (
            <div className="mt-2 text-yellow-300 text-sm">
              ⚠️ API key should start with 'sk-ant-'
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
            <div className="text-red-200 text-sm">
              ❌ {error}
            </div>
          </div>
        )}

        {/* Prompt Input */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 mb-4">
          <label className="block text-white text-sm font-medium mb-2">
            What would you like to study?
          </label>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-md text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="e.g., Spanish verbs, German numbers 1-100, Japanese hiragana"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={generateFlashcards}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Cards'
              )}
            </button>
            <button
              onClick={generateSampleCards}
              className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-200 font-medium py-2 px-4 rounded-md transition-all duration-200"
            >
              Try Demo
            </button>
          </div>
        </div>

        {/* Flashcard Display */}
        {flashcards.length > 0 && !isSessionComplete && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-4 min-h-[300px]">
            <div className="text-center mb-4">
              <div className="text-white/60 text-sm">
                Card {currentCard + 1} of {flashcards.length}
              </div>
              <div className="w-full bg-white/20 rounded-full h-1 mt-2">
                <div 
                  className="bg-gradient-to-r from-green-400 to-blue-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${((currentCard + 1) / flashcards.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="text-center mb-6">
              <div className="inline-block px-2 py-1 bg-white/20 rounded text-white/80 text-xs mb-4">
                {flashcards[currentCard]?.category} • {flashcards[currentCard]?.difficulty}
              </div>
              
              <div 
                className="bg-white/20 rounded-lg p-6 cursor-pointer transition-all duration-300 hover:bg-white/30 min-h-[120px] flex items-center justify-center"
                onClick={() => setShowAnswer(!showAnswer)}
              >
                <div className="text-center">
                  <div className="text-2xl font-medium text-white mb-2">
                    {showAnswer ? flashcards[currentCard]?.back : flashcards[currentCard]?.front}
                  </div>
                  {!showAnswer && (
                    <div className="text-white/60 text-sm">
                      Tap to reveal answer
                    </div>
                  )}
                </div>
              </div>
            </div>

            {showAnswer && (
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => handleAnswer(false)}
                  className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-200 font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Incorrect
                </button>
                <button
                  onClick={() => handleAnswer(true)}
                  className="flex-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-200 font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Correct
                </button>
              </div>
            )}
          </div>
        )}

        {/* Session Complete */}
        {isSessionComplete && flashcards.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-4 text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-4">Session Complete!</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6 text-center">
              <div className="bg-white/20 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-400">{sessionStats.correct}</div>
                <div className="text-white/80 text-sm">Correct</div>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-400">{sessionStats.incorrect}</div>
                <div className="text-white/80 text-sm">Incorrect</div>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <div className="text-2xl font-bold text-yellow-400">{sessionStats.maxStreak}</div>
                <div className="text-white/80 text-sm">Best Streak</div>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-400">{sessionStats.xp} XP</div>
                <div className="text-white/80 text-sm">Points Earned</div>
              </div>
            </div>

            <div className="text-white mb-4">
              <div className="text-lg">Final Accuracy: {accuracy}%</div>
              <div className="text-lg">Reached Level {sessionStats.level}!</div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={resetSession}
                className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-200 font-medium py-2 px-4 rounded-lg transition-all duration-200"
              >
                Study Again
              </button>
              <button
                onClick={exportProgress}
                className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-200 font-medium py-2 px-4 rounded-lg transition-all duration-200"
              >
                Export Progress
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white/5 backdrop-blur-md rounded-lg p-4 text-white/80 text-sm">
          <h3 className="font-medium mb-2">How to use:</h3>
          <ol className="space-y-1 text-xs">
            <li>1. Enter your Claude API key (get one at console.anthropic.com)</li>
            <li>2. Describe what you want to study</li>
            <li>3. Click "Generate Cards" to create AI-powered questions</li>
            <li>4. Tap cards to reveal answers, then mark correct/incorrect</li>
            <li>5. Earn XP and level up as you learn!</li>
          </ol>
          
          <div className="mt-4 pt-3 border-t border-white/20">
            <p className="text-xs text-white/60">
              💡 <strong>Pro tip:</strong> Be specific in your prompts like "French past tense verbs" or "Spanish food vocabulary for beginners" for better results.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
