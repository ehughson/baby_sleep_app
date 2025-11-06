import React, { useState, useEffect, useRef } from 'react';
import { notificationService } from '../api/notificationService';

const Notifications = ({ user }) => {
  const [notifications, setNotifications] = useState({
    new_posts: [],
    new_messages: 0,
    new_friend_requests: []
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const lastCheckRef = useRef(new Date().toISOString());
  const dropdownRef = useRef(null);

  // Poll for notifications every 30 seconds
  useEffect(() => {
    if (!user || !user.username) return;

    const checkNotifications = async () => {
      try {
        const lastCheck = lastCheckRef.current;
        const data = await notificationService.getNotifications(user.username, lastCheck);
        
        // Ensure data structure is correct
        if (data) {
          setNotifications({
            new_posts: data.new_posts || [],
            new_messages: data.new_messages || 0,
            new_friend_requests: data.new_friend_requests || []
          });
          
          // Update last check time after successfully getting notifications
          lastCheckRef.current = new Date().toISOString();
        }
      } catch (error) {
        console.error('Error checking notifications:', error);
      }
    };

    // Check immediately
    checkNotifications();

    // Then check every 30 seconds
    const interval = setInterval(checkNotifications, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalCount = 
    (notifications.new_posts?.length || 0) + 
    (notifications.new_messages || 0) + 
    (notifications.new_friend_requests?.length || 0);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="notifications-container" ref={dropdownRef}>
      <button
        className="notifications-btn"
        onClick={() => setShowDropdown(!showDropdown)}
        title="Notifications"
      >
        🔔
        {totalCount > 0 && (
          <span className="notification-badge">{totalCount > 99 ? '99+' : totalCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notifications</h3>
            {totalCount > 0 && (
              <button
                className="clear-notifications-btn"
                onClick={() => {
                  setNotifications({
                    new_posts: [],
                    new_messages: 0,
                    new_friend_requests: []
                  });
                  lastCheckRef.current = new Date().toISOString();
                }}
              >
                Clear all
              </button>
            )}
          </div>

          <div className="notifications-list">
            {totalCount === 0 ? (
              <div className="no-notifications">No new notifications</div>
            ) : (
              <>
                {notifications.new_friend_requests && notifications.new_friend_requests.length > 0 && (
                  <div className="notification-section">
                    <h4 className="notification-section-title">Friend Requests</h4>
                    {notifications.new_friend_requests.map((req, idx) => (
                      <div key={idx} className="notification-item">
                        <span className="notification-icon">👤</span>
                        <div className="notification-content">
                          <p><strong>{req.from_user}</strong> sent you a friend request</p>
                          <span className="notification-time">{formatTime(req.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {notifications.new_messages > 0 && (
                  <div className="notification-section">
                    <h4 className="notification-section-title">Messages</h4>
                    <div className="notification-item">
                      <span className="notification-icon">💬</span>
                      <div className="notification-content">
                        <p>You have <strong>{notifications.new_messages}</strong> new message{notifications.new_messages !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                )}

                {notifications.new_posts && notifications.new_posts.length > 0 && (
                  <div className="notification-section">
                    <h4 className="notification-section-title">New Posts</h4>
                    {notifications.new_posts.map((post) => (
                      <div key={post.id} className="notification-item">
                        <span className="notification-icon">📝</span>
                        <div className="notification-content">
                          <p>
                            <strong>{post.author_name}</strong> posted in <strong>{post.channel_name}</strong>
                          </p>
                          <p className="notification-preview">{post.content ? post.content.substring(0, 50) : ''}{post.content && post.content.length > 50 ? '...' : ''}</p>
                          <span className="notification-time">{formatTime(post.timestamp)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;

