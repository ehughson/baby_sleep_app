import React, { useState, useEffect, useRef, useCallback } from 'react';
import { notificationService } from '../api/notificationService';
import MinimalIcon from './icons/MinimalIcon.jsx';

const Notifications = ({ user, onNavigate }) => {
  const [notifications, setNotifications] = useState({
    new_posts: [],
    new_messages: 0,
    new_message_senders: [],
    new_friend_requests: []
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const lastCheckRef = useRef(new Date().toISOString());
  const dropdownRef = useRef(null);

  const checkNotifications = useCallback(async () => {
    if (!user || !user.username) return;

    try {
      const lastCheck = lastCheckRef.current;
      const data = await notificationService.getNotifications(user.username, lastCheck);

      if (data) {
        setNotifications({
          new_posts: data.new_posts || [],
          new_messages: data.new_messages || 0,
          new_message_senders: data.new_message_senders || [],
          new_friend_requests: data.new_friend_requests || []
        });
        lastCheckRef.current = new Date().toISOString();
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  }, [user]);

  // Poll for notifications every 10 seconds
  useEffect(() => {
    if (!user || !user.username) return;

    checkNotifications();
    const interval = setInterval(checkNotifications, 10000);

    return () => clearInterval(interval);
  }, [user, checkNotifications]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkNotifications();
      }
    };

    const handleWindowFocus = () => {
      checkNotifications();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [checkNotifications]);

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
        aria-label="Notifications"
      >
        <MinimalIcon name="bell" size={18} />
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
                onClick={async () => {
                  setNotifications({
                    new_posts: [],
                    new_messages: 0,
                    new_friend_requests: []
                  });
                  lastCheckRef.current = new Date().toISOString();
                  if (user?.username) {
                    await notificationService.markNotificationsRead(user.username, { mark_all: true });
                  }
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
                      <div 
                        key={idx} 
                        className="notification-item clickable"
                        onClick={() => {
                          // Clear this notification by updating last check time
                          lastCheckRef.current = new Date().toISOString();
                          // Remove this friend request from notifications
                          setNotifications(prev => ({
                            ...prev,
                            new_friend_requests: prev.new_friend_requests.filter((r, i) => i !== idx)
                          }));
                          if (onNavigate) {
                            onNavigate('friends', { showFriendRequests: true });
                            setShowDropdown(false);
                          }
                        }}
                      >
                        <span className="notification-icon" aria-hidden="true">
                          <MinimalIcon name="profile" size={16} />
                        </span>
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
                    {(notifications.new_message_senders || []).length > 0 ? (
                      notifications.new_message_senders.map((sender, idx) => (
                        <div 
                          key={`${sender.sender_name}-${idx}`}
                          className="notification-item clickable"
                          onClick={() => {
                            // Clear message notifications for this sender
                            lastCheckRef.current = new Date().toISOString();
                            setNotifications(prev => {
                              const remainingSenders = prev.new_message_senders.filter((_, i) => i !== idx);
                              const remainingCount = remainingSenders.reduce((sum, s) => sum + (s.unread_count || 0), 0);
                              return {
                                ...prev,
                                new_message_senders: remainingSenders,
                                new_messages: remainingSenders.length > 0 ? remainingCount : 0
                              };
                            });
                            if (onNavigate) {
                              onNavigate('friends', { showMessages: true, focusFriend: sender.sender_name });
                              setShowDropdown(false);
                            }
                          }}
                        >
                          <span className="notification-icon" aria-hidden="true">
                            <MinimalIcon name="chat" size={16} />
                          </span>
                          <div className="notification-content">
                            <p>
                              <strong>{sender.sender_name}</strong> sent you {sender.unread_count} new message{sender.unread_count !== 1 ? 's' : ''}
                            </p>
                            {sender.last_message_time && (
                              <span className="notification-time">{formatTime(sender.last_message_time)}</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div 
                        className="notification-item clickable"
                        onClick={() => {
                          lastCheckRef.current = new Date().toISOString();
                          setNotifications(prev => ({
                            ...prev,
                            new_messages: 0
                          }));
                          if (onNavigate) {
                            onNavigate('friends', { showMessages: true });
                            setShowDropdown(false);
                          }
                        }}
                      >
                        <span className="notification-icon" aria-hidden="true">
                          <MinimalIcon name="chat" size={16} />
                        </span>
                        <div className="notification-content">
                          <p>You have <strong>{notifications.new_messages}</strong> new message{notifications.new_messages !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {notifications.new_posts && notifications.new_posts.length > 0 && (
                  <div className="notification-section">
                    <h4 className="notification-section-title">New Posts</h4>
                    {notifications.new_posts.map((post) => (
                      <div 
                        key={post.id} 
                        className="notification-item clickable"
                        onClick={async () => {
                          // Clear this post notification
                          lastCheckRef.current = new Date().toISOString();
                          setNotifications(prev => ({
                            ...prev,
                            new_posts: prev.new_posts.filter(p => p.id !== post.id)
                          }));
                          if (user?.username) {
                            const markPayload = post.notification_id 
                              ? { notification_ids: [post.notification_id] }
                              : { post_ids: [post.id] };
                            await notificationService.markNotificationsRead(user.username, markPayload);
                          }
                          if (onNavigate) {
                            onNavigate('forum', { channelId: post.channel_id, postId: post.id });
                            setShowDropdown(false);
                          }
                        }}
                      >
                        <span className="notification-icon" aria-hidden="true">
                          <MinimalIcon name="document" size={16} />
                        </span>
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

