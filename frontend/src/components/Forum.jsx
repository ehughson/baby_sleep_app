import React, { useState, useEffect } from 'react';
import { forumService } from '../api/forumService';

const Forum = ({ user }) => {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [authorName, setAuthorName] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelIcon, setNewChannelIcon] = useState('💬');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  
  // Friends state
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showFriends, setShowFriends] = useState(true);

  const loadPosts = async (channelId) => {
    setIsLoading(true);
    try {
      const data = await forumService.getPosts(channelId);
      setPosts(data);
    } catch (error) {
      console.error('Error loading posts:', error);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load channels from backend
    loadChannels();

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
    // Select first channel by default when channels are loaded
    if (channels.length > 0 && !selectedChannel && !isLoadingChannels) {
      setSelectedChannel(channels[0]);
      loadPosts(channels[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels, isLoadingChannels]);

  useEffect(() => {
    if (selectedChannel && !isLoadingChannels) {
      loadPosts(selectedChannel.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannel, isLoadingChannels]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim() || !authorName.trim()) return;

    try {
      const newPost = await forumService.createPost({
        channel_id: selectedChannel.id,
        content: newPostContent,
        author_name: authorName
      });
      
      setPosts([...posts, newPost]);
      setNewPostContent('');
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
             date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleAuthorNameChange = (e) => {
    const name = e.target.value;
    setAuthorName(name);
    if (name.trim()) {
      localStorage.setItem('forum_author_name', name);
      initializeUserAndFriends(name);
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

  const loadChannels = async () => {
    setIsLoadingChannels(true);
    try {
      const data = await forumService.getChannels();
      setChannels(data);
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) {
      alert('Please enter a channel name');
      return;
    }

    try {
      const newChannel = await forumService.createChannel({
        name: newChannelName,
        icon: newChannelIcon,
        description: newChannelDescription
      });
      
      // Add new channel to list
      const updatedChannels = [...channels, newChannel].sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      setChannels(updatedChannels);
      
      // Select the new channel
      setSelectedChannel(newChannel);
      loadPosts(newChannel.id);
      
      // Reset form
      setNewChannelName('');
      setNewChannelIcon('💬');
      setNewChannelDescription('');
      setShowCreateChannel(false);
    } catch (error) {
      console.error('Error creating channel:', error);
      alert(error.message || 'Failed to create channel. Please try again.');
    }
  };

  const iconOptions = ['💬', '🌙', '🛌', '😴', '💤', '💙', '👶', '⭐', '🎯', '📚', '💡', '🤗'];

  return (
    <div className="forum-container">
      {/* Sidebar with channels */}
      <div className="forum-sidebar">
        <div className="forum-sidebar-header">
          <h3>Channels</h3>
          <button
            className="create-channel-btn"
            onClick={() => setShowCreateChannel(true)}
            title="Create Channel"
          >
            +
          </button>
        </div>
        <div className="channels-list">
          {isLoadingChannels ? (
            <div className="forum-loading" style={{ padding: '1rem' }}>Loading channels...</div>
          ) : (
            channels.map((channel) => (
            <button
              key={channel.id}
              className={`channel-item ${selectedChannel?.id === channel.id ? 'active' : ''}`}
              onClick={() => setSelectedChannel(channel)}
            >
              <span className="channel-icon">{channel.icon}</span>
              <span className="channel-name">{channel.name}</span>
            </button>
          )))}
        </div>

        {/* Friends Section */}
        {authorName && (
          <>
            <div className="forum-sidebar-header friends-header">
              <h3>Friends</h3>
              <button
                className="add-friend-btn"
                onClick={() => setShowAddFriend(true)}
                title="Add Friend"
              >
                +
              </button>
            </div>
            <div className="friends-section">
              {friendRequests.length > 0 && (
                <div className="friend-requests-list">
                  <div className="section-title">Friend Requests</div>
                  {friendRequests.map((request, idx) => (
                    <div key={idx} className="friend-request-item">
                      <span className="friend-name">{request.from_user}</span>
                      <button
                        className="accept-friend-btn"
                        onClick={() => handleAcceptFriendRequest(request.from_user)}
                        title="Accept"
                      >
                        ✓
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="friends-list">
                {showFriends && (
                  <>
                    <div className="section-title">Online ({friends.length})</div>
                    {friends.length === 0 ? (
                      <div className="no-friends">No friends yet. Add some!</div>
                    ) : (
                      friends.map((friend, idx) => (
                        <div key={idx} className="friend-item">
                          <div className="friend-status-indicator online"></div>
                          <span className="friend-name">{friend.display_name || friend.friend_name}</span>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main forum area */}
      <div className="forum-main">
        {selectedChannel && (
          <>
            {/* Channel header */}
            <div className="channel-header">
              <span className="channel-header-icon">{selectedChannel.icon}</span>
              <h2>{selectedChannel.name}</h2>
              <p className="channel-description">{selectedChannel.description}</p>
            </div>

            {/* Posts area */}
            <div className="posts-container">
              {isLoading ? (
                <div className="forum-loading">Loading posts...</div>
              ) : posts.length === 0 ? (
                <div className="empty-forum">
                  <div className="empty-icon">💭</div>
                  <h3>No posts yet</h3>
                  <p>Be the first to start a conversation in #{selectedChannel.name}!</p>
                </div>
              ) : (
                posts.map((post) => (
                  <div key={post.id} className="forum-post">
                    <div className="post-avatar">
                      {getInitials(post.author_name)}
                    </div>
                    <div className="post-content">
                      <div className="post-header">
                        <span className="post-author">{post.author_name}</span>
                        <span className="post-time">{formatTime(post.timestamp)}</span>
                      </div>
                      <div className="post-message">{post.content}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Author name input (if not set) */}
            {!authorName && (
              <div className="author-setup">
                <input
                  type="text"
                  placeholder="Enter your name to post..."
                  value={authorName}
                  onChange={handleAuthorNameChange}
                  className="author-input"
                  autoFocus
                />
              </div>
            )}

            {/* Post input */}
            {authorName && (
              <form className="forum-input-container" onSubmit={handleCreatePost}>
                <input
                  type="text"
                  className="forum-input"
                  placeholder={`Message #${selectedChannel.name}`}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                />
                <button
                  type="submit"
                  className="forum-send-btn"
                  disabled={!newPostContent.trim()}
                >
                  Send
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="modal-overlay" onClick={() => setShowCreateChannel(false)}>
          <div className="modal-content-forum" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Channel</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowCreateChannel(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateChannel} className="create-channel-form">
              <div className="form-group">
                <label htmlFor="channel-name">Channel Name *</label>
                <input
                  id="channel-name"
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="e.g. sleep-regression"
                  required
                  pattern="[a-z0-9-]+"
                  title="Only lowercase letters, numbers, and hyphens allowed"
                />
                <small>Use lowercase letters, numbers, and hyphens only</small>
              </div>
              
              <div className="form-group">
                <label htmlFor="channel-icon">Icon</label>
                <div className="icon-selector">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      className={`icon-option ${newChannelIcon === icon ? 'selected' : ''}`}
                      onClick={() => setNewChannelIcon(icon)}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="channel-description">Description</label>
                <input
                  id="channel-description"
                  type="text"
                  value={newChannelDescription}
                  onChange={(e) => setNewChannelDescription(e.target.value)}
                  placeholder="Brief description of this channel..."
                />
              </div>
              
              <div className="modal-buttons">
                <button
                  type="button"
                  className="modal-btn-cancel"
                  onClick={() => setShowCreateChannel(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="modal-btn-create">
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default Forum;

