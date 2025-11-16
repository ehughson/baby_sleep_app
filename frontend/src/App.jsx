import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import Forum from './components/Forum';
import Friends from './components/Friends';
import LoginPage from './components/LoginPage';
import Notifications from './components/Notifications';
import MinimalIcon from './components/icons/MinimalIcon.jsx';
import Profile from './components/Profile';
import SleepProgress from './components/SleepProgress';
import BabyProfile from './components/BabyProfile';
import SleepGoals from './components/SleepGoals';
import { chatService } from './api/chatService';
import { authService } from './api/authService';
import { forumService } from './api/forumService';

// Version check utility
const checkForUpdates = async (currentVersionData) => {
  try {
    // Add cache-busting query parameter
    const response = await fetch(`/version.json?t=${Date.now()}`);
    const newVersionData = await response.json();
    
    // Compare version and buildTime
    if (!currentVersionData) return false;
    
    return newVersionData.version !== currentVersionData.version || 
           newVersionData.buildTime !== currentVersionData.buildTime;
  } catch (error) {
    console.error('Error checking for updates:', error);
    return false;
  }
};

function App() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'forum', or 'friends'
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitchingConversation, setIsSwitchingConversation] = useState(false);
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [conversationTitle, setConversationTitle] = useState('');
  const [conversations, setConversations] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const isInitialMount = useRef(true);
  
  // Authentication state
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showBabyProfile, setShowBabyProfile] = useState(false);
  const [showSleepGoals, setShowSleepGoals] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [showConversationMenu, setShowConversationMenu] = useState(false);
  const currentVersionRef = useRef(null);
  const loadConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setIsLoadingConversations(false);
      return;
    }

    setIsLoadingConversations(true);
    try {
      const conversationList = await chatService.getConversations();
      if (Array.isArray(conversationList)) {
        setConversations(conversationList);
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user]);

  // Removed autoscroll - user can manually scroll if needed

  // Check for app updates periodically
  useEffect(() => {
    // Load initial version
    const loadVersion = async () => {
      try {
        const response = await fetch('/version.json');
        const data = await response.json();
        currentVersionRef.current = data;
      } catch (error) {
        console.error('Error loading version:', error);
      }
    };
    loadVersion();

    // Check for updates every 15 seconds
    const checkInterval = setInterval(async () => {
      if (currentVersionRef.current) {
        try {
          const hasUpdate = await checkForUpdates(currentVersionRef.current);
          if (hasUpdate) {
            // Auto-reload when update is detected
            console.log('New version detected, reloading...');
            window.location.reload();
          }
        } catch (error) {
          console.error('Error checking for updates:', error);
        }
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(checkInterval);
  }, []);

  // Keep activity heartbeat while logged in
  useEffect(() => {
    if (!user?.username) {
      return;
    }

    let isMounted = true;

    const pingActivity = async () => {
      if (!user?.username) return;
      try {
        await authService.pingActivity(user.username);
      } catch (error) {
        console.error('Activity ping failed:', error?.message || error);
      }
    };

    pingActivity();
    const interval = setInterval(() => {
      if (isMounted) {
        pingActivity();
      }
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.username]);

  useEffect(() => {
    if (user) {
      loadConversations();
    } else {
      setConversations([]);
      setConversationTitle('');
    }
  }, [user, loadConversations]);

  useEffect(() => {
    if (showUserMenu || showConversationMenu) {
      loadConversations();
    }
  }, [showUserMenu, showConversationMenu, loadConversations]);

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
            // Update localStorage with latest session data
            if (session.username) localStorage.setItem('username', session.username);
            if (session.user_id) localStorage.setItem('user_id', session.user_id);
            if (session.first_name) localStorage.setItem('first_name', session.first_name);
            if (session.profile_picture) localStorage.setItem('profile_picture', session.profile_picture);
            if (session.bio !== undefined) localStorage.setItem('bio', session.bio || '');
            
            setUser({ 
              username: session.username, 
              user_id: session.user_id,
              first_name: session.first_name,
              profile_picture: session.profile_picture,
              bio: session.bio
            });
          } else {
            // Session check returned false (401 or expired)
            // If remember_me was set, keep the user logged in with stored credentials
            if (rememberMe) {
              // Keep user logged in with stored credentials
              const storedProfilePicture = localStorage.getItem('profile_picture');
              const storedBio = localStorage.getItem('bio');
              setUser({ 
                username: username, 
                user_id: localStorage.getItem('user_id'),
                first_name: localStorage.getItem('first_name'),
                profile_picture: storedProfilePicture || null,
                bio: storedBio || null
              });
            } else {
              // No remember_me - clear session and log out
              localStorage.removeItem('session_token');
              localStorage.removeItem('username');
              localStorage.removeItem('user_id');
              localStorage.removeItem('first_name');
              localStorage.removeItem('remember_me');
              localStorage.removeItem('profile_picture');
              localStorage.removeItem('bio');
              setUser(null);
            }
          }
        } catch (error) {
          console.error('Auth check error:', error);
          // On network errors or other exceptions, keep user logged in if remember_me is set
          if (rememberMe) {
            // Keep user logged in with stored credentials
            const storedProfilePicture = localStorage.getItem('profile_picture');
            const storedBio = localStorage.getItem('bio');
            setUser({ 
              username: username, 
              user_id: localStorage.getItem('user_id'),
              first_name: localStorage.getItem('first_name'),
              profile_picture: storedProfilePicture || null,
              bio: storedBio || null
            });
          } else {
            // Only clear if it's an explicit 401 (unauthorized) and remember_me is not set
            if (error.response && error.response.status === 401) {
              localStorage.removeItem('session_token');
              localStorage.removeItem('username');
              localStorage.removeItem('user_id');
              localStorage.removeItem('first_name');
              localStorage.removeItem('remember_me');
              localStorage.removeItem('profile_picture');
              localStorage.removeItem('bio');
              setUser(null);
            } else {
              // Network error or other error - keep user logged in
              const storedProfilePicture = localStorage.getItem('profile_picture');
              const storedBio = localStorage.getItem('bio');
              setUser({ 
                username: username, 
                user_id: localStorage.getItem('user_id'),
                first_name: localStorage.getItem('first_name'),
                profile_picture: storedProfilePicture || null,
                bio: storedBio || null
              });
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
    // Save to localStorage for persistence
    if (authData.username) localStorage.setItem('username', authData.username);
    if (authData.user_id) localStorage.setItem('user_id', authData.user_id);
    if (authData.first_name) localStorage.setItem('first_name', authData.first_name);
    if (authData.profile_picture) localStorage.setItem('profile_picture', authData.profile_picture);
    if (authData.bio !== undefined) localStorage.setItem('bio', authData.bio || '');
    
    setUser({ 
      username: authData.username, 
      user_id: authData.user_id,
      first_name: authData.first_name,
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
    localStorage.removeItem('first_name');
    localStorage.removeItem('remember_me');
    localStorage.removeItem('profile_picture');
    localStorage.removeItem('bio');
    localStorage.removeItem('forum_author_name'); // Clear forum name too
    setUser(null);
  };

  const handleDeactivate = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to deactivate your account? This action cannot be undone. You will be logged out immediately.'
    );
    
    if (!confirmed) {
      return;
    }
    
    try {
      await authService.deactivateAccount();
      // Clear all local storage
      localStorage.removeItem('session_token');
      localStorage.removeItem('username');
      localStorage.removeItem('user_id');
      localStorage.removeItem('first_name');
      localStorage.removeItem('remember_me');
      localStorage.removeItem('forum_author_name');
      setUser(null);
      setShowUserMenu(false);
      alert('Your account has been deactivated. You have been logged out.');
    } catch (error) {
      alert(`Failed to deactivate account: ${error.message}`);
    }
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
        setConversationTitle('');
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
        setConversationTitle('');
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

  const handleSelectConversation = async (targetConversationId) => {
    if (targetConversationId === null || targetConversationId === undefined || isLoading || isSwitchingConversation) {
      return;
    }

    const normalizedId = Number(targetConversationId);
    const resolvedConversationId = Number.isNaN(normalizedId) ? targetConversationId : normalizedId;

    setError('');
    setIsSwitchingConversation(true);

    try {
      setShowConversationMenu(false);
      setShowUserMenu(false);

      const conversationMessages = await chatService.getMessages(resolvedConversationId);
      const normalizedMessages = Array.isArray(conversationMessages)
        ? conversationMessages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          }))
        : [];

      setMessages(normalizedMessages);
      setConversationId(resolvedConversationId);

      const selectedConversation = conversations.find(
        (conv) => String(conv.id) === String(resolvedConversationId)
      );
      const resolvedTitle = selectedConversation?.title || conversationTitle || 'Sleep Chat';
      setConversationTitle(resolvedTitle);

      setActiveTab('chat');
      window.history.replaceState(
        { view: 'conversation', hasMessages: normalizedMessages.length > 0 },
        '',
        window.location.pathname + '#chat'
      );
    } catch (err) {
      console.error('Failed to load conversation', err);
      setError(err?.message || 'Failed to load conversation');
    } finally {
      setIsSwitchingConversation(false);
    }
  };

  const handleSendMessage = async (message) => {
    if (!message.trim()) return;
    if (isSwitchingConversation) return;

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

      const responseConversationId = response.conversation_id ?? conversationId;
      if (responseConversationId !== undefined && responseConversationId !== null) {
        setConversationId(responseConversationId);
      }

      const updatedConversationTitle = response.conversation_title || conversationTitle || 'Sleep Chat';
      setConversationTitle(updatedConversationTitle);
      loadConversations();
      
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
      if (isFirstMessage) {
        setConversationTitle('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    setShowUserMenu(false);
    setShowConversationMenu(false);
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
      setConversationTitle('');
      setError('');
      setIsLoading(false); // Reset loading state
      setIsSwitchingConversation(false);
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

  const messagesClassName = messages.length === 0 ? 'messages messages--welcome' : 'messages';

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            {user?.profile_picture ? (
              <img 
                src={forumService.getFileUrl(user.profile_picture)} 
                alt="Profile" 
                className="header-profile-picture"
              />
            ) : (
              <span className="sleep-icon" aria-hidden="true">
                <MinimalIcon name="moon" size={20} />
              </span>
            )}
            <h1><span style={{ color: '#fff3d1' }}>REM</span>-i</h1>
          </div>
          <p className="header-subtitle">Shaping the future of baby sleep, one night at a time</p>
        </div>
        <div className="header-actions">
          {user && (
            <>
              <div className="user-menu">
                <span className="user-name">{user.username}</span>
                <div className="header-action-buttons">
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
                  <div className="conversation-menu">
                    <button
                      className={`conversation-menu-toggle ${showConversationMenu ? 'active' : ''}`}
                      onClick={() => {
                        const nextState = !showConversationMenu;
                        setShowConversationMenu(nextState);
                        if (nextState) {
                          setShowUserMenu(false);
                        }
                      }}
                      title="Previous Chats"
                      aria-label="Previous Chats"
                    >
                      <MinimalIcon name="history" size={18} />
                    </button>
                    {showConversationMenu && (
                      <div className="conversation-menu-dropdown">
                        <div className="conversation-menu-header">Previous Chats</div>
                        {isLoadingConversations ? (
                          <div className="conversation-menu-empty">Loading history…</div>
                        ) : conversations.length > 0 ? (
                          <div className="conversation-menu-list">
                            {conversations.map((conv) => (
                              <button
                                key={conv.id}
                                className={`conversation-menu-item ${String(conversationId) === String(conv.id) ? 'active' : ''}`}
                                onClick={() => handleSelectConversation(conv.id)}
                                disabled={isSwitchingConversation}
                              >
                                <span className="conversation-menu-icon" aria-hidden="true">
                                  <MinimalIcon name="sleep" size={16} />
                                </span>
                                <span className="conversation-menu-title">{conv.title}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="conversation-menu-empty">No saved chats yet</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="user-menu-dropdown">
                    <button
                      className="user-menu-toggle"
                      onClick={() => {
                        const nextState = !showUserMenu;
                        setShowUserMenu(nextState);
                        if (nextState) {
                          setShowConversationMenu(false);
                        }
                      }}
                      title="Menu"
                      aria-label="Account menu"
                    >
                      <MinimalIcon name="options" size={16} />
                    </button>
                    {showUserMenu && (
                      <div className="user-menu-dropdown-content">
                        <button
                          className="user-menu-item"
                          onClick={() => {
                            setShowProfile(true);
                            setShowUserMenu(false);
                          }}
                        >
                          <span className="menu-icon" aria-hidden="true">
                            <MinimalIcon name="profile" size={16} />
                          </span>
                          <span>Profile</span>
                        </button>
                        <button
                          className="user-menu-item"
                          onClick={() => {
                            setShowBabyProfile(true);
                            setShowUserMenu(false);
                          }}
                        >
                          <span className="menu-icon" aria-hidden="true">
                            <MinimalIcon name="baby" size={16} />
                          </span>
                          <span>Baby Profile</span>
                        </button>
                        <button
                          className="user-menu-item"
                          onClick={() => {
                            setShowSleepGoals(true);
                            setShowUserMenu(false);
                          }}
                        >
                          <span className="menu-icon" aria-hidden="true">
                            <MinimalIcon name="target" size={16} />
                          </span>
                          <span>Sleep Goals</span>
                        </button>
                        <div className="user-menu-divider"></div>
                        <button
                          className="user-menu-item"
                          onClick={() => {
                            handleDeactivate();
                            setShowUserMenu(false);
                          }}
                          style={{ color: '#dc3545' }}
                        >
                          <span className="menu-icon" aria-hidden="true">
                            <MinimalIcon name="warning" size={16} />
                          </span>
                          <span>Deactivate Account</span>
                        </button>
                        <button
                          className="user-menu-item"
                          onClick={() => {
                            handleLogout();
                            setShowUserMenu(false);
                          }}
                        >
                          <span className="menu-icon" aria-hidden="true">
                            <MinimalIcon name="exit" size={16} />
                          </span>
                          <span>Logout</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
          {activeTab === 'chat' && conversationId && (
            <button
              className="new-conversation-btn"
              onClick={handleNewConversation}
              title="Start New Conversation"
            >
              <span className="btn-icon" aria-hidden="true">
                <MinimalIcon name="chat" size={16} />
              </span>
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
          <span className="tab-icon" aria-hidden="true">
            <MinimalIcon name="chat" size={16} />
          </span>
          Sleep Assistant
        </button>
        <button
          className={`tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          <span className="tab-icon" aria-hidden="true">
            <MinimalIcon name="target" size={16} />
          </span>
          Sleep Progress
        </button>
        <button
          className={`tab-btn ${activeTab === 'forum' ? 'active' : ''}`}
          onClick={() => setActiveTab('forum')}
        >
          <span className="tab-icon" aria-hidden="true">
            <MinimalIcon name="forum" size={16} />
          </span>
          Village
        </button>
        <button
          className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          <span className="tab-icon" aria-hidden="true">
            <MinimalIcon name="users" size={16} />
          </span>
          Friends
        </button>
      </div>

      {activeTab === 'chat' ? (
      <div className="chat-container">
        <div className={messagesClassName}>
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
                <h2>{user?.first_name ? `Hi there, ${user.first_name}!` : 'Hi there!'}</h2>
                <p>What sleep hurdle are we tackling?</p>
                <div className="suggestion-chips">
                  <button 
                    className="chip" 
                    onClick={() => handleSendMessage("Tell me about night wakings")}
                  >
                    Night Wakings
                  </button>
                  <button 
                    className="chip" 
                    onClick={() => handleSendMessage("Tell me about bedtime resistance")}
                  >
                    Bedtime Resistance
                  </button>
                  <button 
                    className="chip" 
                    onClick={() => handleSendMessage("Tell me about short naps")}
                  >
                    Short Naps
                  </button>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}
          {error && (
            <div className="error">
              {error}
            </div>
          )}
        </div>

        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading || isSwitchingConversation}
        />
      </div>
      ) : activeTab === 'progress' ? (
        <SleepProgress user={user} />
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
      
      {/* Close dropdown when clicking outside */}
      {(showUserMenu || showConversationMenu) && (
        <div 
          className="dropdown-overlay"
          onClick={() => {
            setShowUserMenu(false);
            setShowConversationMenu(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
