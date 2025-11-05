import React, { useState, useEffect } from 'react';
import { forumService } from '../api/forumService';

const Friends = ({ user }) => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [authorName, setAuthorName] = useState('');

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
    } catch (error) {
      console.error('Error initializing user:', error);
    }
  };

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
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
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
                      {request.from_user.charAt(0).toUpperCase()}
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
              {friends.map((friend, idx) => (
                <div key={idx} className="friend-card">
                  <div className="friend-avatar">
                    {(friend.display_name || friend.friend_name).charAt(0).toUpperCase()}
                  </div>
                  <div className="friend-info">
                    <span className="friend-name">{friend.display_name || friend.friend_name}</span>
                    <div className="friend-status">
                      <span className="status-dot online"></span>
                      <span>Online</span>
                    </div>
                  </div>
                </div>
              ))}
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
                      <span className="user-name">{user.username}</span>
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
    </div>
  );
};

export default Friends;

