import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import Forum from './components/Forum';
import Friends from './components/Friends';
import LoginPage from './components/LoginPage';
import { chatService } from './api/chatService';
import { authService } from './api/authService';

function App() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'forum', or 'friends'
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  const isInitialMount = useRef(true);
  
  // Authentication state
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsCheckingAuth(true);
      const token = localStorage.getItem('session_token');
      const username = localStorage.getItem('username');
      
      if (token && username) {
        try {
          const session = await authService.checkSession(token);
          if (session.authenticated) {
            setUser({ username: session.username, user_id: session.user_id });
          } else {
            // Invalid session, clear it
            localStorage.removeItem('session_token');
            localStorage.removeItem('username');
            localStorage.removeItem('user_id');
            localStorage.removeItem('remember_me');
            setUser(null);
          }
        } catch (error) {
          console.error('Auth check error:', error);
          // Clear invalid session
          localStorage.removeItem('session_token');
          localStorage.removeItem('username');
          localStorage.removeItem('user_id');
          localStorage.removeItem('remember_me');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsCheckingAuth(false);
    };
    
    checkAuth();
  }, []);

  // Initialize browser history on mount
  useEffect(() => {
    // Set initial state in history with URL hash for better browser support
    if (isInitialMount.current) {
      if (!window.location.hash) {
        window.history.replaceState({ view: 'welcome', hasMessages: false }, '', window.location.href + '#welcome');
      }
      isInitialMount.current = false;
    }
  }, []);

  const handleLoginSuccess = (authData) => {
    setUser({ username: authData.username, user_id: authData.user_id });
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('session_token');
    if (token) {
      await authService.logout(token);
    }
    localStorage.removeItem('session_token');
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');
    localStorage.removeItem('remember_me');
    localStorage.removeItem('forum_author_name'); // Clear forum name too
    setUser(null);
  };

  // Handle browser back/forward buttons and trackpad swipe gestures
  useEffect(() => {
    const handlePopState = (event) => {
      // When user goes back (via browser back button or trackpad swipe)
      const state = event.state;
      const hash = window.location.hash;
      
      // If going back to welcome (check both state and URL hash)
      const isWelcome = !state || state.view === 'welcome' || !state.hasMessages || hash === '#welcome' || hash === '';
      
      if (isWelcome) {
        setMessages([]);
        setConversationId(null);
        setError('');
        setIsLoading(false); // Reset loading state when going back
        // Ensure hash is set correctly
        if (window.location.hash !== '#welcome' && window.location.hash !== '') {
          window.history.replaceState({ view: 'welcome', hasMessages: false }, '', window.location.pathname + '#welcome');
        }
      }
    };

    // Also check URL hash on mount/load
    const checkInitialState = () => {
      const hash = window.location.hash;
      if (hash === '#welcome' || hash === '') {
        setMessages([]);
        setConversationId(null);
        setError('');
        setIsLoading(false); // Reset loading state on initial load
      }
    };
    
    checkInitialState();
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const handleSendMessage = async (message) => {
    if (!message.trim()) return;

    setIsLoading(true);
    setError('');

    // If this is the first message, push to history BEFORE adding message
    // This ensures browser back button works correctly
    const isFirstMessage = !conversationId && messages.length === 0;
    if (isFirstMessage) {
      const newUrl = window.location.pathname + '#chat';
      window.history.pushState({ view: 'conversation', hasMessages: true }, '', newUrl);
    }

    // Add user message immediately
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await chatService.sendMessage(message, conversationId);
      
      // Add assistant response
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Set conversation ID if this is the first message
      if (!conversationId) {
        setConversationId(response.conversation_id);
      }
    } catch (err) {
      setError(err.message);
      // Remove the user message if sending failed
      setMessages(prev => {
        const newMessages = prev.slice(0, -1);
        // If this was the first message and it failed, restore welcome state
        if (isFirstMessage && newMessages.length === 0) {
          window.history.replaceState({ view: 'welcome', hasMessages: false }, '', window.location.pathname + '#welcome');
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    // Use browser history API to go back
    // This works with browser back button, trackpad swipe, and our back button
    const currentState = window.history.state;
    const currentHash = window.location.hash;
    
    if (currentState && currentState.hasMessages || currentHash === '#chat') {
      // Go back in browser history (triggers popstate event)
      window.history.back();
    } else {
      // If we're not in a conversation state, just clear directly
      setMessages([]);
      setConversationId(null);
      setError('');
      setIsLoading(false); // Reset loading state
      window.history.replaceState({ view: 'welcome', hasMessages: false }, '', window.location.pathname + '#welcome');
    }
  };

  // Show login page if not authenticated
  if (isCheckingAuth) {
    return (
      <div className="app">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage onLoginSuccess={handleLoginSuccess} />
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          {activeTab === 'chat' && messages.length > 0 && (
            <button
              className="back-btn"
              onClick={handleNewConversation}
              title="Back to Welcome"
            >
              <span className="btn-icon">←</span>
            </button>
          )}
          <div className="header-title">
            <span className="sleep-icon">🌙</span>
            <h1>REMi</h1>
          </div>
          <p className="header-subtitle">Shaping sleep, one night at a time</p>
        </div>
        <div className="header-actions">
          {user && (
            <div className="user-menu">
              <span className="user-name">{user.username}</span>
              <button
                className="logout-btn"
                onClick={handleLogout}
                title="Logout"
              >
                Logout
              </button>
            </div>
          )}
          {activeTab === 'chat' && conversationId && (
            <button
              className="new-conversation-btn"
              onClick={handleNewConversation}
              title="Start New Conversation"
            >
              <span className="btn-icon">💬</span>
              New Chat
            </button>
          )}
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <span className="tab-icon">💬</span>
          Sleep Assistant
        </button>
        <button
          className={`tab-btn ${activeTab === 'forum' ? 'active' : ''}`}
          onClick={() => setActiveTab('forum')}
        >
          <span className="tab-icon">💭</span>
          Village
        </button>
        <button
          className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          <span className="tab-icon">👥</span>
          Friends
        </button>
      </div>

      {activeTab === 'chat' ? (
      <div className="chat-container">
        <div className="messages">
          {messages.length === 0 ? (
            <div className="welcome-section">
              <div className="welcome-content">
                <div className="welcome-icon">
                  <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" className="baby-icon-image">
                    {/* Head - perfectly round */}
                    <circle cx="60" cy="60" r="50" fill="#FFF8F0" stroke="#8B6F5E" strokeWidth="2.5"/>
                    
                    {/* Small tuft of hair on top - several short curved lines swirling to the left */}
                    <path d="M 52 20 Q 54 18 56 22" stroke="#8B6F5E" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    <path d="M 56 22 Q 58 20 60 24" stroke="#8B6F5E" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    <path d="M 60 24 Q 62 22 64 26" stroke="#8B6F5E" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    <path d="M 56 22 Q 58 26 60 24" stroke="#8B6F5E" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    
                    {/* Left ear - small rounded */}
                    <ellipse cx="25" cy="58" rx="7" ry="10" fill="#FFF8F0" stroke="#8B6F5E" strokeWidth="2"/>
                    <path d="M 22 56 Q 24 54 26 56 Q 28 54 30 56" stroke="#8B6F5E" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    
                    {/* Right ear - small rounded */}
                    <ellipse cx="95" cy="58" rx="7" ry="10" fill="#FFF8F0" stroke="#8B6F5E" strokeWidth="2"/>
                    <path d="M 92 56 Q 94 54 96 56 Q 98 54 100 56" stroke="#8B6F5E" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    
                    {/* Closed eyes - two short upward-curving lines */}
                    <path d="M 48 52 Q 52 50 56 52" stroke="#8B6F5E" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                    <path d="M 64 52 Q 68 50 72 52" stroke="#8B6F5E" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                    
                    {/* Very small upward-curving nose */}
                    <path d="M 58 62 Q 60 60 62 62" stroke="#8B6F5E" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    
                    {/* Gentle upward-curving smile */}
                    <path d="M 50 75 Q 55 82 60 82 Q 65 82 70 75" stroke="#8B6F5E" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                    
                    {/* Left cheek blush - soft circular */}
                    <ellipse cx="32" cy="68" rx="9" ry="7" fill="#FFB6C1" opacity="0.5"/>
                    
                    {/* Right cheek blush - soft circular */}
                    <ellipse cx="88" cy="68" rx="9" ry="7" fill="#FFB6C1" opacity="0.5"/>
                  </svg>
                </div>
                <h2>{user?.username ? `Hi there ${user.username}!` : 'Hi there!'}</h2>
                <p>what sleep hurdle are we tackling?</p>
                <div className="suggestion-chips">
                  <button 
                    className="chip" 
                    onClick={() => handleSendMessage("Tell me about night wakings")}
                  >
                    night wakings
                  </button>
                  <button 
                    className="chip" 
                    onClick={() => handleSendMessage("Tell me about bedtime resistance")}
                  >
                    bedtime resistance
                  </button>
                  <button 
                    className="chip" 
                    onClick={() => handleSendMessage("Tell me about short naps")}
                  >
                    short naps
                  </button>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}
          {isLoading && (
            <div className="loading">
              <span>AI is thinking...</span>
            </div>
          )}
          {error && (
            <div className="error">
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
      ) : activeTab === 'forum' ? (
        <Forum user={user} />
      ) : (
        <Friends user={user} />
      )}

    </div>
  );
}

export default App;
