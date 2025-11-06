import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { forumService } from '../api/forumService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

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
  const [newChannelPrivate, setNewChannelPrivate] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [channelMembers, setChannelMembers] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);


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

  // Removed auto-selection of first channel - start on channel list instead

  useEffect(() => {
    if (selectedChannel && !isLoadingChannels) {
      const username = user?.username || authorName || '';
      loadPosts(selectedChannel.id, username);
      loadChannelMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannel, isLoadingChannels]);

  const loadPosts = async (channelId, username = '') => {
    setIsLoading(true);
    try {
      const url = username 
        ? `${API_BASE_URL}/forum/channels/${channelId}/posts?username=${encodeURIComponent(username)}`
        : `${API_BASE_URL}/forum/channels/${channelId}/posts`;
      const response = await axios.get(url);
      setPosts(response.data);
    } catch (error) {
      console.error('Error loading posts:', error);
      if (error.response?.status === 403) {
        alert('You do not have access to this private channel');
        setSelectedChannel(null);
      }
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim() || !authorName.trim()) return;

    try {
      let fileData = null;
      if (selectedFile) {
        setUploadingFile(true);
        try {
          console.log('Uploading file:', selectedFile.name);
          fileData = await forumService.uploadFile(selectedFile);
          console.log('File upload successful:', fileData);
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          alert('Failed to upload file: ' + uploadError.message);
          setUploadingFile(false);
          setSelectedFile(null);
          return;
        }
        setUploadingFile(false);
      }

      const post = await forumService.createPost({
        channel_id: selectedChannel.id,
        author_name: authorName,
        content: newPostContent,
        file_path: fileData?.file_path,
        file_type: fileData?.file_type,
        file_name: fileData?.file_name
      });
      setPosts([...posts, post]);
      setNewPostContent('');
      setSelectedFile(null);
    } catch (error) {
      console.error('Error creating post:', error);
      alert(error.message || 'Failed to create post');
    }
  };

  const handleDeleteChannel = async () => {
    if (!selectedChannel) return;
    if (!confirm(`Are you sure you want to delete "${selectedChannel.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const username = user?.username || authorName || '';
      if (!username) {
        alert('You must be logged in to delete a channel');
        return;
      }
      await forumService.deleteChannel(selectedChannel.id, username);
      setSelectedChannel(null);
      loadChannels();
      alert('Channel deleted successfully');
    } catch (error) {
      alert(error.message || 'Failed to delete channel');
    }
  };

  const handleTogglePrivacy = async () => {
    if (!selectedChannel) return;
    try {
      const username = user?.username || authorName;
      const newPrivacy = !selectedChannel.is_private;
      await forumService.updateChannelPrivacy(selectedChannel.id, newPrivacy, username);
      // Update local channel state
      setSelectedChannel({ ...selectedChannel, is_private: newPrivacy ? 1 : 0 });
      loadChannels();
      alert(`Channel is now ${newPrivacy ? 'private' : 'public'}`);
    } catch (error) {
      alert(error.message || 'Failed to update privacy');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;

    try {
      const username = user?.username || authorName;
      await forumService.inviteToChannel(selectedChannel.id, username, inviteUsername);
      setInviteUsername('');
      setShowInviteModal(false);
      loadChannelMembers();
      alert(`Invited ${inviteUsername} to the channel!`);
    } catch (error) {
      alert(error.message || 'Failed to invite user');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        e.target.value = ''; // Reset file input
        return;
      }
      console.log('File selected:', file.name, file.type, file.size);
      setSelectedFile(file);
    } else {
      console.log('No file selected');
    }
  };

  const loadChannels = async () => {
    setIsLoadingChannels(true);
    try {
      const username = user?.username || authorName || '';
      const data = await forumService.getChannels(username);
      setChannels(data);
    } catch (error) {
      console.error('Error loading channels:', error);
      setChannels([]);
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const loadChannelMembers = async () => {
    if (!selectedChannel) return;
    try {
      const data = await forumService.getChannelMembers(selectedChannel.id);
      setChannelMembers(data);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    try {
      const username = user?.username || authorName;
      const newChannel = await forumService.createChannel({
        name: newChannelName,
        icon: newChannelIcon,
        description: newChannelDescription,
        is_private: newChannelPrivate,
        owner_name: username
      });
      
      // Add new channel to list
      const updatedChannels = [...channels, newChannel].sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      setChannels(updatedChannels);
      
      // Select the new channel
      setSelectedChannel(newChannel);
      loadPosts(newChannel.id, username || '');
      
      // Reset form
      setNewChannelName('');
      setNewChannelIcon('💬');
      setNewChannelDescription('');
      setNewChannelPrivate(false);
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

  const iconOptions = ['💬', '🌙', '🛌', '😴', '💤', '💙', '⭐', '🎯', '📚', '💡', '🤗'];

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
                  {channel.is_private === 1 && (
                    <span className="topic-stat" style={{ color: '#a68cab' }}>🔒 Private</span>
                  )}
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

                <div className="form-group" style={{ width: '100%' }}>
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', width: '100%', justifyContent: 'flex-start' }}>
                    <input
                      type="checkbox"
                      checked={newChannelPrivate}
                      onChange={(e) => setNewChannelPrivate(e.target.checked)}
                      style={{ flexShrink: 0, width: 'auto', margin: 0 }}
                    />
                    <span style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Make this topic private</span>
                  </label>
                  <small style={{ display: 'block', marginTop: '0.25rem', textAlign: 'left', width: '100%' }}>Private topics are only visible to invited members</small>
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
          style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0.5rem', color: '#333' }}
        >
          ←
        </button>
        <span className="topic-view-icon">{selectedChannel.icon}</span>
        <div className="topic-view-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2>{selectedChannel.name}</h2>
            {selectedChannel.is_private === 1 && (
              <span style={{ fontSize: '0.85rem', color: '#a68cab', fontWeight: 600 }}>🔒 Private</span>
            )}
          </div>
          {selectedChannel.description && (
            <p className="topic-view-description">{selectedChannel.description}</p>
          )}
        </div>
        <div className="topic-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          {(!selectedChannel.owner_name || selectedChannel.owner_name === (user?.username || authorName)) && (
            <>
              <button
                className="topic-action-btn"
                onClick={handleTogglePrivacy}
                title={selectedChannel.is_private ? 'Make Public' : 'Make Private'}
              >
                {selectedChannel.is_private ? '🌐' : '🔒'}
              </button>
              <button
                className="topic-action-btn"
                onClick={() => setShowInviteModal(true)}
                title="Invite Members"
              >
                👥
              </button>
              <button
                className="topic-action-btn delete-btn"
                onClick={handleDeleteChannel}
                title="Delete Topic"
              >
                🗑️
              </button>
            </>
          )}
          {selectedChannel.is_private === 1 && selectedChannel.owner_name !== (user?.username || authorName) && (
            <button
              className="topic-action-btn"
              onClick={() => setShowInviteModal(true)}
              title="Invite Members"
            >
              👥
            </button>
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
              {post.file_path && (
                <div className="post-attachment">
                  {post.file_type === 'image' ? (
                    <img 
                      src={forumService.getFileUrl(post.file_path)} 
                      alt={post.file_name || 'Uploaded image'}
                      style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', marginTop: '1rem', display: 'block' }}
                      onError={(e) => {
                        console.error('Failed to load image:', forumService.getFileUrl(post.file_path));
                        console.error('File path:', post.file_path);
                        console.error('File type:', post.file_type);
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `<p style="color: #999; font-style: italic;">Image failed to load: ${post.file_name || post.file_path}</p>`;
                      }}
                    />
                  ) : (
                    <a 
                      href={forumService.getFileUrl(post.file_path)} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="file-link"
                    >
                      📎 {post.file_name || post.file_path}
                    </a>
                  )}
                </div>
              )}
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
          {selectedFile && (
            <div className="file-preview" style={{ padding: '0.5rem 1rem', background: '#f8f8f8', borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.9rem', color: '#666' }}>
                📎 {selectedFile.name}
              </span>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ×
              </button>
            </div>
          )}
          <form className="post-input-form" onSubmit={handleCreatePost}>
            <textarea
              className="post-input"
              placeholder={`Share your thoughts in ${selectedChannel.name}...`}
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              rows={3}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="file-upload-btn" style={{ cursor: 'pointer', padding: '0.5rem 1rem', background: '#f0f0f0', borderRadius: '8px', fontSize: '0.9rem', alignSelf: 'flex-start' }}>
                📎 Attach
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </label>
              <button
                type="submit"
                className="post-send-btn"
                disabled={(!newPostContent.trim() && !selectedFile) || uploadingFile}
                style={{ alignSelf: 'flex-end' }}
              >
                {uploadingFile ? 'Uploading...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => {
          setShowInviteModal(false);
          setInviteUsername('');
        }}>
          <div className="modal-content-forum" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invite to Topic</h2>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteUsername('');
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleInvite} className="add-friend-form">
              <div className="form-group">
                <label htmlFor="invite-username">Username</label>
                <input
                  id="invite-username"
                  type="text"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  placeholder="Enter username to invite..."
                  autoFocus
                  required
                />
              </div>
              {channelMembers.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>Current Members:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {channelMembers.map((member, idx) => (
                      <span key={idx} style={{ padding: '0.25rem 0.75rem', background: '#f0f0f0', borderRadius: '12px', fontSize: '0.85rem' }}>
                        {member.username} {member.role === 'owner' && '👑'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="modal-buttons">
                <button
                  type="button"
                  className="modal-btn-cancel"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteUsername('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="modal-btn-create">
                  Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Forum;
