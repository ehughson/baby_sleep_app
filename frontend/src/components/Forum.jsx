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
      localStorage.setItem('forum_author_name', user.username);
    } else {
      // Get saved author name from localStorage (guest mode)
      const savedName = localStorage.getItem('forum_author_name');
      if (savedName) {
        setAuthorName(savedName);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
      const post = await forumService.createPost({
        channel_id: selectedChannel.id,
        author_name: authorName,
        content: newPostContent
      });
      setPosts([...posts, post]);
      setNewPostContent('');
    } catch (error) {
      console.error('Error creating post:', error);
      alert(error.message || 'Failed to create post');
    }
  };

  const loadChannels = async () => {
    setIsLoadingChannels(true);
    try {
      const data = await forumService.getChannels();
      setChannels(data);
    } catch (error) {
      console.error('Error loading channels:', error);
      setChannels([]);
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

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

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
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
    }
  };

  const iconOptions = ['💬', '🌙', '🛌', '😴', '💤', '💙', '👶', '⭐', '🎯', '📚', '💡', '🤗'];

  // Show topic selection view (grid of topics)
  if (!selectedChannel) {
    return (
      <div className="forum-container">
        <div className="village-header">
          <h2>Village Topics</h2>
          <button
            className="create-topic-btn"
            onClick={() => setShowCreateChannel(true)}
          >
            + New Topic
          </button>
        </div>
        
        <div className="topics-grid">
          {isLoadingChannels ? (
            <div className="forum-loading">Loading topics...</div>
          ) : channels.length === 0 ? (
            <div className="empty-forum">
              <div className="empty-icon">💭</div>
              <h3>No topics yet</h3>
              <p>Be the first to create a topic!</p>
            </div>
          ) : (
            channels.map((channel) => (
              <div
                key={channel.id}
                className="topic-card"
                onClick={() => setSelectedChannel(channel)}
              >
                <div className="topic-card-header">
                  <span className="topic-icon">{channel.icon}</span>
                  <span className="topic-name">{channel.name}</span>
                </div>
                <p className="topic-description">{channel.description || 'Join the conversation'}</p>
                <div className="topic-stats">
                  <span className="topic-stat">💬 {posts.length} posts</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Channel Modal */}
        {showCreateChannel && (
          <div className="modal-overlay" onClick={() => setShowCreateChannel(false)}>
            <div className="modal-content-forum" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create New Topic</h2>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowCreateChannel(false)}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleCreateChannel} className="create-channel-form">
                <div className="form-group">
                  <label htmlFor="channel-name">Topic Name *</label>
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
                    placeholder="Brief description of this topic..."
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
                    Create Topic
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show topic view (posts in selected topic)
  return (
    <div className="forum-container">
      <div className="topic-view-header">
        <button
          className="back-to-topics-btn"
          onClick={() => setSelectedChannel(null)}
          style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0.5rem' }}
        >
          ←
        </button>
        <span className="topic-view-icon">{selectedChannel.icon}</span>
        <div className="topic-view-title">
          <h2>{selectedChannel.name}</h2>
          {selectedChannel.description && (
            <p className="topic-view-description">{selectedChannel.description}</p>
          )}
        </div>
      </div>

      <div className="topic-posts">
        {isLoading ? (
          <div className="forum-loading">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="empty-forum">
            <div className="empty-icon">💭</div>
            <h3>No posts yet</h3>
            <p>Be the first to start a conversation!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="post-card">
              <div className="post-header">
                <div className="post-avatar">
                  {getInitials(post.author_name)}
                </div>
                <span className="post-author">{post.author_name}</span>
                <span className="post-time">{formatTime(post.timestamp)}</span>
              </div>
              <div className="post-message">{post.content}</div>
            </div>
          ))
        )}
      </div>

      {/* Author name input (if not set) */}
      {!authorName && (
        <div className="post-input-section">
          <input
            type="text"
            placeholder="Enter your name to post..."
            value={authorName}
            onChange={handleAuthorNameChange}
            className="post-input"
            style={{ width: '100%', marginBottom: '1rem' }}
            autoFocus
          />
        </div>
      )}

      {/* Post input */}
      {authorName && (
        <div className="post-input-section">
          <form className="post-input-form" onSubmit={handleCreatePost}>
            <textarea
              className="post-input"
              placeholder={`Share your thoughts in ${selectedChannel.name}...`}
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              rows={3}
            />
            <button
              type="submit"
              className="post-send-btn"
              disabled={!newPostContent.trim()}
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Forum;
