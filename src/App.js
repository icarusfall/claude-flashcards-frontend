import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Star, Target, Brain, Zap, Plus, BookOpen, User, LogOut } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://claude-flashcards-backend-production.up.railway.app';

export default function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // App state
  const [currentView, setCurrentView] = useState('subjects'); // 'subjects', 'study', 'create-subject'
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [subjectForm, setSubjectForm] = useState({ name: '', prompt: '' });

  // Session stats
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    streak: 0,
    maxStreak: 0,
    xp: 0,
    level: 1
  });

  // Check for existing auth on load
  useEffect(() => {
    if (token) {
      fetchUserData();
    }
  }, [token]);

  // API helper with auth
  const apiCall = async (endpoint, options = {}) => {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...options,
    };

    const response = await fetch(`${BACKEND_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  };

  // Auth functions
  const fetchUserData = async () => {
    try {
      const data = await apiCall('/subjects');
      setSubjects(data.subjects || []);
      setError('');
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    console.log('🔐 Attempting authentication:', authMode, loginForm.email);

    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      
      // Make auth call without token (for login/register)
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      console.log('✅ Auth successful:', data);
      
      // Set token and user
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      setCurrentView('subjects');
      
      // Fetch subjects with the new token
      console.log('📡 Fetching subjects with new token...');
      const subjectsResponse = await fetch(`${BACKEND_URL}/subjects`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.token}` // Use the token directly from response
        }
      });

      const subjectsData = await subjectsResponse.json();
      
      if (subjectsResponse.ok) {
        console.log('✅ Subjects loaded:', subjectsData.subjects?.length || 0);
        setSubjects(subjectsData.subjects || []);
      } else {
        console.error('❌ Failed to load subjects:', subjectsData);
      }
      
    } catch (error) {
      console.error('❌ Auth failed:', error);
      setAuthError(error.message);
    }
    setAuthLoading(false);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setCurrentView('subjects');
    setSubjects([]);
    setFlashcards([]);
  };

  // Subject management
  const createSubject = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await apiCall('/subjects', {
        method: 'POST',
        body: JSON.stringify(subjectForm),
      });

      setSubjects([data.subject, ...subjects]);
      setSubjectForm({ name: '', prompt: '' });
      setCurrentView('subjects');
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const generateCards = async (subjectId) => {
    setLoading(true);
    setError('');

    try {
      const data = await apiCall(`/subjects/${subjectId}/generate-cards`, {
        method: 'POST',
      });

      setFlashcards(data.flashcards);
      setCurrentCard(0);
      setShowAnswer(false);
      setCurrentView('study');
      
      // Update subjects list to reflect new card count
      fetchUserData();
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const startStudySession = async (subjectId) => {
    setLoading(true);
    setError('');

    try {
      const data = await apiCall(`/subjects/${subjectId}/study?limit=20`);
      
      if (data.cards.length === 0) {
        setError('No cards available for study. Generate some cards first!');
        setLoading(false);
        return;
      }

      setFlashcards(data.cards);
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
      setCurrentView('study');
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const handleAnswer = async (correct) => {
    const card = flashcards[currentCard];
    
    try {
      await apiCall(`/cards/${card.id}/progress`, {
        method: 'POST',
        body: JSON.stringify({ correct }),
      });

      // Update session stats
      const xpGained = correct ? 20 : 5;
      const newStats = {
        ...sessionStats,
        correct: sessionStats.correct + (correct ? 1 : 0),
        incorrect: sessionStats.incorrect + (correct ? 0 : 1),
        streak: correct ? sessionStats.streak + 1 : 0,
        maxStreak: correct ? Math.max(sessionStats.maxStreak, sessionStats.streak + 1) : sessionStats.maxStreak,
        xp: sessionStats.xp + xpGained
      };
      
      newStats.level = Math.floor(newStats.xp / 100) + 1;
      setSessionStats(newStats);

      // Move to next card
      setTimeout(() => {
        setShowAnswer(false);
        if (currentCard < flashcards.length - 1) {
          setCurrentCard(currentCard + 1);
        } else {
          // Session complete
          setCurrentView('session-complete');
        }
      }, 1500);
    } catch (error) {
      setError('Failed to save progress: ' + error.message);
    }
  };

  // Render functions
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <Brain className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Claude Cards</h1>
            <p className="text-blue-200">AI-Generated Spaced Repetition</p>
          </div>

          {authError && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
              <div className="text-red-200 text-sm">❌ {authError}</div>
            </div>
          )}

          <form onSubmit={handleAuth}>
            <input
              type="email"
              placeholder="Email"
              value={loginForm.email}
              onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-md text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3"
              required
            />
            
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-md text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
              required
            />

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition-all duration-200 flex items-center justify-center gap-2 mb-4"
            >
              {authLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                authMode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-blue-300 hover:text-blue-200 text-sm"
            >
              {authMode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
      <div className="max-w-md mx-auto">
        
        {/* Header with user info */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-yellow-400" />
              <h1 className="text-xl font-bold text-white">Claude Cards</h1>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-white/60" />
              <span className="text-white/80 text-sm">{user?.email || 'User'}</span>
              <button
                onClick={logout}
                className="text-white/60 hover:text-white/80 ml-2"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
          {user && (
            <div className="mt-2 text-xs text-white/60">
              Account: {user.authType} • Daily limit: {user.dailyLimit} cards
            </div>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
            <div className="text-red-200 text-sm">❌ {error}</div>
          </div>
        )}

        {/* Navigation */}
        {currentView !== 'study' && currentView !== 'session-complete' && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentView('subjects')}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200 ${
                  currentView === 'subjects'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/20 text-white/80 hover:bg-white/30'
                }`}
              >
                My Subjects
              </button>
              <button
                onClick={() => setCurrentView('create-subject')}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  currentView === 'create-subject'
                    ? 'bg-green-500 text-white'
                    : 'bg-white/20 text-white/80 hover:bg-white/30'
                }`}
              >
                <Plus className="w-4 h-4" />
                New Subject
              </button>
            </div>
          </div>
        )}

        {/* Subjects View */}
        {currentView === 'subjects' && (
          <div className="space-y-4">
            {subjects.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 text-center">
                <BookOpen className="w-12 h-12 text-white/60 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No subjects yet</h3>
                <p className="text-white/60 mb-4">Create your first subject to start learning!</p>
                <button
                  onClick={() => setCurrentView('create-subject')}
                  className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-medium py-2 px-4 rounded-md transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Subject
                </button>
              </div>
            ) : (
              subjects.map((subject) => (
                <div key={subject.id} className="bg-white/10 backdrop-blur-md rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-medium text-white">{subject.name}</h3>
                      <p className="text-white/60 text-sm">{subject.card_count} cards</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => startStudySession(subject.id)}
                      disabled={loading || subject.card_count === 0}
                      className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-200 font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50"
                    >
                      Study ({subject.card_count})
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSubject(subject);
                        generateCards(subject.id);
                      }}
                      disabled={loading}
                      className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-200 font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                    >
                      {loading && selectedSubject?.id === subject.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Generate
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Edit Subject View */}
        {currentView === 'edit-subject' && editingSubject && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Edit Subject</h2>
            
            <form onSubmit={updateSubject}>
              <div className="mb-4">
                <label className="block text-white text-sm font-medium mb-2">
                  Subject Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-md text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-white text-sm font-medium mb-2">
                  Study Prompt
                </label>
                <textarea
                  value={editForm.prompt}
                  onChange={(e) => setEditForm({...editForm, prompt: e.target.value})}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-md text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 h-32 resize-none"
                  required
                />
                <div className="mt-2 text-xs text-white/60">
                  💡 Tip: For French cards showing English first, try: "French GCSE vocabulary with English questions and French answers. Show English words/phrases first, then the French translation."
                </div>
                <div className="mt-2 text-xs text-orange-200">
                  ⚠️ After saving changes, generate new cards to see the updated format.
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentView('subjects')}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white/80 font-medium py-2 px-4 rounded-md transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Subject'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Create Subject View */}
        {currentView === 'create-subject' && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Create New Subject</h2>
            
            <form onSubmit={createSubject}>
              <div className="mb-4">
                <label className="block text-white text-sm font-medium mb-2">
                  Subject Name
                </label>
                <input
                  type="text"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({...subjectForm, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-md text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="e.g., French GCSE, Chemistry Basics"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-white text-sm font-medium mb-2">
                  Study Prompt (be specific for better results)
                </label>
                <textarea
                  value={subjectForm.prompt}
                  onChange={(e) => setSubjectForm({...subjectForm, prompt: e.target.value})}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-md text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 h-32 resize-none"
                  placeholder="e.g., French GCSE vocabulary focusing on family members, basic greetings, and common verbs in present tense. Include pronunciation guides where helpful."
                  required
                />
                <div className="mt-2 text-xs text-white/60">
                  💡 Tip: Be specific about level, topics, and any special requirements
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Subject'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Study Session View */}
        {currentView === 'study' && flashcards.length > 0 && (
          <>
            {/* Stats Bar */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 mb-4 text-white">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span>Level {sessionStats.level}</span>
                </div>
                <div className="text-sm">
                  XP: {sessionStats.xp}
                </div>
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
                  Card {currentCard + 1}/{flashcards.length}
                </span>
              </div>
            </div>

            {/* Flashcard */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-4 min-h-[300px]">
              <div className="text-center mb-4">
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

            <button
              onClick={() => setCurrentView('subjects')}
              className="w-full bg-white/10 hover:bg-white/20 text-white/80 font-medium py-2 px-4 rounded-lg transition-all duration-200"
            >
              Back to Subjects
            </button>
          </>
        )}

        {/* Session Complete */}
        {currentView === 'session-complete' && (
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

            <button
              onClick={() => setCurrentView('subjects')}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
            >
              Back to Subjects
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
