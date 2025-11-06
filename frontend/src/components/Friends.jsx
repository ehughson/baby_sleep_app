import React, { useState, useEffect } from 'react';
import { forumService } from '../api/forumService';
import UserProfile from './UserProfile';

const Friends = ({ user, navigationOptions }) => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [authorName, setAuthorName] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = React.useRef(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const justSentMessageRef = React.useRef(false);
  const pollingIntervalRef = React.useRef(null);

  useEffect(() => {
    // Use logged-in user or saved name
    if (user && user.username && !user.isGuest) {
      setAuthorName(user.username);
      initializeUserAndFriends(user.username);
      localStorage.setItem('forum_author_name', user.username);
    } else {
      // Get saved author name from localStorage (guest mode)
      const savedName = localStorage.getItem('forum_author_name');
      if (savedName) {
        setAuthorName(savedName);
        initializeUserAndFriends(savedName);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const initializeUserAndFriends = async (username) => {
    try {
      // Create/get user
      await forumService.createOrGetUser(username);
      // Load friends
      loadFriends(username);
      // Load friend requests
      loadFriendRequests(username);
      // Load unread counts
      loadUnreadCounts(username);
    } catch (error) {
      console.error('Error initializing user:', error);
    }
  };

  // Handle navigation from notifications
  useEffect(() => {
    if (navigationOptions && authorName) {
      if (navigationOptions.showFriendRequests) {
        // Show friend requests section (they're already loaded, just ensure UI shows them)
        setShowAddFriend(false);
        setSelectedFriend(null); // Make sure we're not in a chat view
        // Scroll to friend requests section if needed
        setTimeout(() => {
          const requestsSection = document.querySelector('.friend-requests-section');
          if (requestsSection) {
            requestsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
        // Clear navigation options after handling
        sessionStorage.removeItem('notification_nav');
      } else if (navigationOptions.showMessages) {
        // Find first friend with unread messages and open that conversation
        setShowAddFriend(false);
        const friendWithUnread = friends.find(friend => {
          const friendUsername = friend.display_name || friend.friend_name || friend.username;
          return unreadCounts[friendUsername] > 0;
        });
        if (friendWithUnread) {
          const friendUsername = friendWithUnread.display_name || friendWithUnread.friend_name;
          setSelectedFriend(friendUsername);
          loadMessages(friendUsername);
        }
        // Clear navigation options after handling
        sessionStorage.removeItem('notification_nav');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigationOptions, authorName, friends, unreadCounts]);

  const loadUnreadCounts = async (username) => {
    try {
      const conversations = await forumService.getConversations(username);
      const counts = {};
      conversations.forEach(conv => {
        counts[conv.other_user] = conv.unread_count || 0;
      });
      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async (friendUsername, showLoading = false) => {
    if (!authorName || !friendUsername) return;
    
    // Only show loading state if explicitly requested (not for polling)
    if (showLoading) {
      setIsLoadingMessages(true);
    }
    
    try {
      const data = await forumService.getMessages(authorName, friendUsername);
      setMessages(data);
      // Reload unread counts after loading messages
      loadUnreadCounts(authorName);
      // Scroll to bottom after messages load (only if not just polling)
      if (showLoading || justSentMessageRef.current) {
        setTimeout(scrollToBottom, 100);
        justSentMessageRef.current = false;
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      // Don't clear messages on error during polling
      if (showLoading) {
        setMessages([]);
      }
    } finally {
      if (showLoading) {
        setIsLoadingMessages(false);
      }
    }
  };

  const handleSelectFriend = (friend) => {
    const friendUsername = friend.display_name || friend.friend_name;
    setSelectedFriend(friendUsername);
    loadMessages(friendUsername, true); // Show loading when selecting a friend
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedFriend || !authorName) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    // Optimistic update - add message immediately to prevent flickering
    const optimisticMessage = {
      id: Date.now(), // Temporary ID
      sender_name: authorName,
      receiver_name: selectedFriend,
      content: messageContent,
      created_at: new Date().toISOString(),
      is_read: 0
    };
    setMessages(prev => [...prev, optimisticMessage]);
    justSentMessageRef.current = true;
    
    // Scroll immediately for optimistic update
    setTimeout(scrollToBottom, 50);

    try {
      const sentMessage = await forumService.sendMessage(authorName, selectedFriend, messageContent);
      // Reload messages from backend to replace optimistic message with real one
      // Use a small delay to ensure backend has processed it
      setTimeout(async () => {
        await loadMessages(selectedFriend, false); // Don't show loading spinner
      }, 200);
      // Reload unread counts
      loadUnreadCounts(authorName);
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      // Restore message if send failed
      setNewMessage(messageContent);
      alert(error.message || 'Failed to send message');
      justSentMessageRef.current = false;
    }
  };

  // Auto-scroll when messages change (but only if we didn't just send a message)
  useEffect(() => {
    if (!justSentMessageRef.current) {
      scrollToBottom();
    }
  }, [messages]);

  // Poll for new messages when a friend is selected
  useEffect(() => {
    if (!selectedFriend || !authorName) return;

    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(() => {
      // Skip polling if we just sent a message (will reload manually)
      if (!justSentMessageRef.current) {
        loadMessages(selectedFriend, false); // Don't show loading during polling
      }
    }, 3000); // Poll every 3 seconds

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFriend, authorName]);

  const loadFriends = async (username) => {
    try {
      const data = await forumService.getFriends(username);
      setFriends(data);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadFriendRequests = async (username) => {
    try {
      const data = await forumService.getFriendRequests(username);
      setFriendRequests(data);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  const handleSearchUsers = async (query) => {
    if (!query.trim() || !authorName.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      const results = await forumService.searchUsers(query, authorName);
      setSearchResults(results || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
      // Show error to user
      alert(`Failed to search users: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSendFriendRequest = async (toUser) => {
    try {
      await forumService.sendFriendRequest(authorName, toUser);
      alert('Friend request sent!');
      setFriendSearchQuery('');
      setSearchResults([]);
      setShowAddFriend(false);
    } catch (error) {
      alert(error.message || 'Failed to send friend request');
    }
  };

  const handleAcceptFriendRequest = async (fromUser) => {
    try {
      await forumService.acceptFriendRequest(fromUser, authorName);
      // Reload friends and requests
      loadFriends(authorName);
      loadFriendRequests(authorName);
    } catch (error) {
      alert(error.message || 'Failed to accept friend request');
    }
  };

  useEffect(() => {
    // Debounce search
    if (!friendSearchQuery.trim() || !authorName.trim()) {
      setSearchResults([]);
      return;
    }
    
    const timer = setTimeout(() => {
      handleSearchUsers(friendSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendSearchQuery, authorName]);

  if (!authorName) {
    return (
      <div className="friends-container">
        <div className="friends-welcome">
          <h2>Welcome to Friends</h2>
          <p>Please enter your name to connect with other parents:</p>
          <input
            type="text"
            className="name-input"
            placeholder="Enter your name..."
            value={authorName}
            onChange={(e) => {
              const name = e.target.value;
              setAuthorName(name);
              if (name.trim()) {
                localStorage.setItem('forum_author_name', name);
                initializeUserAndFriends(name);
              }
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && authorName.trim()) {
                localStorage.setItem('forum_author_name', authorName);
                initializeUserAndFriends(authorName);
              }
            }}
          />
        </div>
      </div>
    );
  }

  // Show chat view if friend is selected
  if (selectedFriend) {
    return (
      <div className="friends-container">
        <div className="dm-header">
          <button
            className="back-to-friends-btn"
            onClick={() => {
              setSelectedFriend(null);
              setMessages([]);
            }}
          >
            ← Back
          </button>
          <div className="dm-friend-info">
            <div className="friend-avatar">
              {(() => {
                const friend = friends.find(f => (f.display_name || f.friend_name) === selectedFriend);
                return friend?.profile_picture ? (
                  <img 
                    src={forumService.getFileUrl(friend.profile_picture)} 
                    alt={selectedFriend}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      borderRadius: '50%', 
                      objectFit: 'cover' 
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.textContent = selectedFriend.charAt(0).toUpperCase();
                    }}
                  />
                ) : (
                  selectedFriend.charAt(0).toUpperCase()
                );
              })()}
            </div>
            <span className="dm-friend-name">{selectedFriend}</span>
          </div>
        </div>

        <div className="dm-messages-container">
          {isLoadingMessages ? (
            <div className="dm-loading">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="dm-empty">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="dm-messages-list">
              {messages.map((msg) => {
                const isOwn = msg.sender_name === authorName;
                return (
                  <div key={msg.id} className={`dm-message ${isOwn ? 'own' : 'other'}`}>
                    <div className="dm-message-content">{msg.content}</div>
                    <div className="dm-message-time">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="dm-input-section">
          <form className="dm-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="dm-input"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button
              type="submit"
              className="dm-send-btn"
              disabled={!newMessage.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="friends-container">
      <div className="friends-header-section">
        <h2>Your Village Friends</h2>
        <button
          className="add-friend-header-btn"
          onClick={() => setShowAddFriend(true)}
        >
          + Add Friend
        </button>
      </div>

      <div className="friends-content">
        {friendRequests.length > 0 && (
          <div className="friend-requests-section">
            <h3>Friend Requests ({friendRequests.length})</h3>
            <div className="friend-requests-list">
              {friendRequests.map((request, idx) => (
                <div key={idx} className="friend-request-card">
                  <div className="friend-request-info">
                    <div className="friend-avatar">
                      {request.profile_picture ? (
                        <img 
                          src={forumService.getFileUrl(request.profile_picture)} 
                          alt={request.from_user}
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            borderRadius: '50%', 
                            objectFit: 'cover' 
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.textContent = request.from_user.charAt(0).toUpperCase();
                          }}
                        />
                      ) : (
                        request.from_user.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="friend-request-name">{request.from_user}</span>
                  </div>
                  <button
                    className="accept-friend-btn"
                    onClick={() => handleAcceptFriendRequest(request.from_user)}
                    title="Accept"
                  >
                    Accept
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="friends-list-section">
          <h3>Your Friends ({friends.length})</h3>
          {friends.length === 0 ? (
            <div className="no-friends-message">
              <p>No friends yet. Add some to build your village!</p>
            </div>
          ) : (
            <div className="friends-grid">
              {friends.map((friend, idx) => {
                const friendUsername = friend.display_name || friend.friend_name;
                const unreadCount = unreadCounts[friendUsername] || 0;
                return (
                  <div 
                    key={idx} 
                    className="friend-card clickable"
                    onClick={() => handleSelectFriend(friend)}
                  >
                    <div className="friend-avatar">
                      {friend.profile_picture ? (
                        <img 
                          src={forumService.getFileUrl(friend.profile_picture)} 
                          alt={friendUsername}
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            borderRadius: '50%', 
                            objectFit: 'cover' 
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.textContent = friendUsername.charAt(0).toUpperCase();
                          }}
                        />
                      ) : (
                        friendUsername.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="friend-info">
                      <span className="friend-name">{friendUsername}</span>
                      <div className="friend-status">
                        <span className="status-dot online"></span>
                        <span>Online</span>
                      </div>
                    </div>
                    {unreadCount > 0 && (
                      <div className="unread-badge">{unreadCount}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div className="modal-overlay" onClick={() => {
          setShowAddFriend(false);
          setFriendSearchQuery('');
          setSearchResults([]);
        }}>
          <div className="modal-content-forum" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Friend</h2>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowAddFriend(false);
                  setFriendSearchQuery('');
                  setSearchResults([]);
                }}
              >
                ×
              </button>
            </div>
            <div className="add-friend-form">
              <div className="form-group">
                <label htmlFor="search-username">Search by username</label>
                <input
                  id="search-username"
                  type="text"
                  value={friendSearchQuery}
                  onChange={(e) => setFriendSearchQuery(e.target.value)}
                  placeholder="Enter username..."
                  autoFocus
                />
              </div>
              
              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((user) => (
                    <div key={user.username} className="search-result-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                        <div className="friend-avatar" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                          {user.profile_picture ? (
                            <img 
                              src={forumService.getFileUrl(user.profile_picture)} 
                              alt={user.username}
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                borderRadius: '50%', 
                                objectFit: 'cover' 
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.textContent = user.username.charAt(0).toUpperCase();
                              }}
                            />
                          ) : (
                            user.username.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div 
                          style={{ display: 'flex', flexDirection: 'column', flex: 1, cursor: 'pointer' }}
                          onClick={() => setViewingProfile(user.username)}
                        >
                          <span 
                            className="user-name"
                            style={{
                              textDecoration: 'underline',
                              textDecorationColor: 'transparent',
                              transition: 'text-decoration-color 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.textDecorationColor = '#a68cab';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.textDecorationColor = 'transparent';
                            }}
                          >
                            {user.username}
                          </span>
                          {user.bio && (
                            <span style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic', marginTop: '0.1rem' }}>
                              {user.bio}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        className="add-friend-btn-small"
                        onClick={() => handleSendFriendRequest(user.username)}
                      >
                        Add Friend
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {friendSearchQuery && searchResults.length === 0 && (
                <div className="no-results">No users found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {viewingProfile && (
        <UserProfile 
          username={viewingProfile} 
          onClose={() => setViewingProfile(null)} 
        />
      )}
    </div>
  );
};

export default Friends;

