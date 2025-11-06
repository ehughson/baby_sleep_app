import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import Forum from './components/Forum';
import Friends from './components/Friends';
import LoginPage from './components/LoginPage';
import Notifications from './components/Notifications';
import Profile from './components/Profile';
import BabyProfile from './components/BabyProfile';
import SleepGoals from './components/SleepGoals';
import { chatService } from './api/chatService';
import { authService } from './api/authService';
import { forumService } from './api/forumService';

function App() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'forum', or 'friends'
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const isInitialMount = useRef(true);
  
  // Authentication state
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showBabyProfile, setShowBabyProfile] = useState(false);
  const [showSleepGoals, setShowSleepGoals] = useState(false);

  // Removed autoscroll - user can manually scroll if needed

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsCheckingAuth(true);
      const token = localStorage.getItem('session_token');
      const username = localStorage.getItem('username');
      const rememberMe = localStorage.getItem('remember_me') === 'true';
      
      if (token && username) {
        try {
          const session = await authService.checkSession(token);
          if (session && session.authenticated) {
            setUser({ 
              username: session.username, 
              user_id: session.user_id,
              profile_picture: session.profile_picture,
              bio: session.bio
            });
          } else {
            // Only clear session if it's explicitly invalid (not a network error)
            // If remember_me was set, keep the user logged in even if session check fails
            if (!rememberMe) {
              localStorage.removeItem('session_token');
              localStorage.removeItem('username');
              localStorage.removeItem('user_id');
              localStorage.removeItem('remember_me');
              setUser(null);
            } else {
              // If remember me is set, keep user logged in with stored credentials
              setUser({ username: username, user_id: localStorage.getItem('user_id') });
            }
          }
        } catch (error) {
          console.error('Auth check error:', error);
          // Don't log out on network errors - keep user logged in if they have remember_me
          if (rememberMe) {
            // Keep user logged in with stored credentials
            setUser({ username: username, user_id: localStorage.getItem('user_id') });
          } else {
            // Only clear if it's not a network error and remember_me is not set
            if (error.response && error.response.status === 401) {
              localStorage.removeItem('session_token');
              localStorage.removeItem('username');
              localStorage.removeItem('user_id');
              localStorage.removeItem('remember_me');
              setUser(null);
            } else {
              // Network error - keep user logged in
              setUser({ username: username, user_id: localStorage.getItem('user_id') });
            }
          }
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
    setUser({ 
      username: authData.username, 
      user_id: authData.user_id,
      profile_picture: authData.profile_picture,
      bio: authData.bio
    });
  };

  const handleProfileUpdate = (updatedUser) => {
    setUser(prev => {
      // Update localStorage if username changed
      if (updatedUser.username && updatedUser.username !== prev?.username) {
        localStorage.setItem('username', updatedUser.username);
      }
      return { ...prev, ...updatedUser };
    });
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

    // Create placeholder for assistant message that will be updated via streaming
    const assistantMessageId = Date.now() + 1;
    const assistantMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Track displayed content for letter-by-letter animation
      let displayedLength = 0;
      let fullResponseText = '';
      let animationTimeout = null;
      
      // Function to animate one letter
      const animateNextLetter = () => {
        if (displayedLength < fullResponseText.length) {
          displayedLength++;
          const currentContent = fullResponseText.substring(0, displayedLength);
          
          // Update the assistant message
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: currentContent }
              : msg
          ));
          
          // Continue animating if there's more content
          if (displayedLength < fullResponseText.length) {
            animationTimeout = setTimeout(animateNextLetter, 20); // 20ms delay between letters (~50 letters per second)
          } else {
            animationTimeout = null; // Animation complete
          }
        } else {
          animationTimeout = null; // Animation complete
        }
      };
      
      // Handle streaming response
      const response = await chatService.sendMessage(
        message, 
        conversationId,
        (chunk, fullResponse) => {
          // Update the full response text
          fullResponseText = fullResponse;
          
          // Start animation if not already running
          if (!animationTimeout && displayedLength < fullResponseText.length) {
            animateNextLetter();
          }
          // If animation is running, it will naturally continue to the new content
        }
      );
      
      // Ensure final content is displayed (complete any remaining animation)
      const completeAnimation = () => {
        if (displayedLength < response.response.length) {
          displayedLength++;
          const currentContent = response.response.substring(0, displayedLength);
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: currentContent }
              : msg
          ));
          
          // Continue if more content remains
          if (displayedLength < response.response.length) {
            animationTimeout = setTimeout(completeAnimation, 20);
          }
        }
      };
      
      // Start completing animation if needed
      if (displayedLength < response.response.length) {
        completeAnimation();
      }
      
      // Clean up any pending animation after a delay to ensure it completes
      setTimeout(() => {
        if (animationTimeout) {
          clearTimeout(animationTimeout);
        }
      }, (response.response.length - displayedLength) * 20 + 100);

      // Set conversation ID if this is the first message
      if (!conversationId) {
        setConversationId(response.conversation_id);
      }
    } catch (err) {
      setError(err.message);
      // Remove both user and assistant messages if sending failed
      setMessages(prev => {
        const newMessages = prev.filter(msg => msg.id !== userMessage.id && msg.id !== assistantMessageId);
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
            {user?.profile_picture ? (
              <img 
                src={forumService.getFileUrl(user.profile_picture)} 
                alt="Profile" 
                className="header-profile-picture"
              />
            ) : (
              <span className="sleep-icon">🌙</span>
            )}
            <h1><span style={{ color: '#fff3d1' }}>REM</span>i</h1>
          </div>
          <p className="header-subtitle">Shaping sleep, one night at a time</p>
        </div>
        <div className="header-actions">
          {user && (
            <>
              <div className="user-menu">
                <span className="user-name">{user.username}</span>
                <Notifications 
                  user={user} 
                  onNavigate={(tab, options) => {
                    setActiveTab(tab);
                    // Store navigation options for child components
                    if (options) {
                      sessionStorage.setItem('notification_nav', JSON.stringify(options));
                    }
                  }}
                />
                <button
                  className="profile-btn"
                  onClick={() => setShowProfile(true)}
                  title="Profile"
                >
                  👤
                </button>
                <button
                  className="baby-profile-btn"
                  onClick={() => setShowBabyProfile(true)}
                  title="Baby Profile"
                >
                  👶
                </button>
                <button
                  className="sleep-goals-btn"
                  onClick={() => setShowSleepGoals(true)}
                  title="Sleep Goals"
                >
                  🎯
                </button>
                <button
                  className="logout-btn"
                  onClick={handleLogout}
                  title="Logout"
                >
                  Logout
                </button>
              </div>
            </>
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
                  <img 
                    src="/images/baby-icon.png" 
                    alt="Baby" 
                    className="baby-icon-image"
                    onError={(e) => {
                      console.error('Image failed to load from:', e.target.src);
                      console.error('Current location:', window.location.href);
                    }}
                  />
                </div>
                <h2>{user?.username ? `Hi there, ${user.username}!` : 'Hi there!'}</h2>
                <p>What sleep hurdle are we tackling?</p>
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
              <span>REMi is thinking...</span>
            </div>
          )}
          {error && (
            <div className="error">
              {error}
            </div>
          )}
        </div>

        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
      ) : activeTab === 'forum' ? (
        <Forum user={user} navigationOptions={activeTab === 'forum' ? JSON.parse(sessionStorage.getItem('notification_nav') || 'null') : null} />
      ) : (
        <Friends user={user} navigationOptions={activeTab === 'friends' ? JSON.parse(sessionStorage.getItem('notification_nav') || 'null') : null} />
      )}

      {showProfile && user && (
        <Profile 
          user={user} 
          onUpdate={handleProfileUpdate}
          onClose={() => setShowProfile(false)}
        />
      )}
      {showBabyProfile && user && (
        <BabyProfile 
          user={user} 
          onClose={() => setShowBabyProfile(false)}
        />
      )}
      {showSleepGoals && user && (
        <SleepGoals 
          user={user} 
          onClose={() => setShowSleepGoals(false)}
        />
      )}
    </div>
  );
}

export default App;
