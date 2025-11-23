/**
 * Notifications Component - Displays notification dropdown
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { notificationService, NotificationData } from '../services/notificationService';
import { forumService } from '../services/forumService';
import MinimalIcon from './icons/MinimalIcon';

interface NotificationsProps {
  user: {
    username: string;
  } | null;
}

export const Notifications: React.FC<NotificationsProps> = ({ user }) => {
  const [notifications, setNotifications] = useState<NotificationData>({
    new_posts: [],
    new_messages: 0,
    new_message_senders: [],
    new_friend_requests: [],
    channel_invites: [],
    invite_approvals: [],
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const lastCheckRef = useRef<string>(new Date().toISOString());

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
          new_friend_requests: data.new_friend_requests || [],
          channel_invites: data.channel_invites || [],
          invite_approvals: data.invite_approvals || [],
        });
        lastCheckRef.current = new Date().toISOString();
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  }, [user]);

  // Poll for notifications every 10 seconds when visible
  useEffect(() => {
    if (!user || !user.username) return;

    checkNotifications();
    const interval = setInterval(checkNotifications, 10000);

    return () => clearInterval(interval);
  }, [user, checkNotifications]);

  // Check notifications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.username) {
        checkNotifications();
      }
    }, [user, checkNotifications])
  );

  const totalCount =
    (notifications.new_posts?.length || 0) +
    (notifications.new_messages || 0) +
    (notifications.new_friend_requests?.length || 0) +
    (notifications.channel_invites?.length || 0) +
    (notifications.invite_approvals?.length || 0);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleRecipientInviteAction = async (invite: any, action: 'accept' | 'decline') => {
    if (!user?.username) return;
    try {
      const result = await forumService.respondToInvite(invite.id, user.username, action);
      setNotifications((prev) => ({
        ...prev,
        channel_invites: prev.channel_invites.filter((item) => item.id !== invite.id),
      }));
      await checkNotifications();
      if (action === 'accept') {
        router.push(`/(tabs)/forum`);
        setShowDropdown(false);
      }
      if (result?.message) {
        Alert.alert('Success', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update invite');
    }
  };

  const handleOwnerInviteAction = async (invite: any, action: 'approve' | 'decline') => {
    if (!user?.username) return;
    try {
      const result = await forumService.approveInvite(invite.id, user.username, action);
      setNotifications((prev) => ({
        ...prev,
        invite_approvals: prev.invite_approvals.filter((item) => item.id !== invite.id),
      }));
      await checkNotifications();
      if (result?.message) {
        Alert.alert('Success', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update invite');
    }
  };

  const handleClearAll = async () => {
    setNotifications({
      new_posts: [],
      new_messages: 0,
      new_message_senders: [],
      new_friend_requests: [],
      channel_invites: [],
      invite_approvals: [],
    });
    lastCheckRef.current = new Date().toISOString();
    if (user?.username) {
      await notificationService.markNotificationsRead(user.username, { mark_all: true });
    }
  };

  const handlePostClick = async (post: any) => {
    lastCheckRef.current = new Date().toISOString();
    setNotifications((prev) => ({
      ...prev,
      new_posts: prev.new_posts.filter((p) => p.id !== post.id),
    }));
    if (user?.username) {
      const markPayload = post.notification_id
        ? { notification_ids: [post.notification_id] }
        : { post_ids: [post.id] };
      await notificationService.markNotificationsRead(user.username, markPayload);
    }
    router.push(`/(tabs)/forum`);
    setShowDropdown(false);
  };

  const handleMessageClick = (sender?: any) => {
    lastCheckRef.current = new Date().toISOString();
    if (sender) {
      setNotifications((prev) => {
        const remainingSenders = prev.new_message_senders.filter((s) => s.sender_name !== sender.sender_name);
        const remainingCount = remainingSenders.reduce((sum, s) => sum + (s.unread_count || 0), 0);
        return {
          ...prev,
          new_message_senders: remainingSenders,
          new_messages: remainingCount,
        };
      });
    } else {
      setNotifications((prev) => ({
        ...prev,
        new_messages: 0,
      }));
    }
    router.push(`/(tabs)/friends`);
    setShowDropdown(false);
  };

  const handleFriendRequestClick = (req: any, index: number) => {
    lastCheckRef.current = new Date().toISOString();
    setNotifications((prev) => ({
      ...prev,
      new_friend_requests: prev.new_friend_requests.filter((_, i) => i !== index),
    }));
    router.push(`/(tabs)/friends`);
    setShowDropdown(false);
  };

  if (!user) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.notificationButton}
        onPress={() => setShowDropdown(true)}
      >
        <MinimalIcon name="bell" size={18} color="#fff" />
        {totalCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalCount > 99 ? '99+' : totalCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.dropdown} onStartShouldSetResponder={() => true}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Notifications</Text>
              {totalCount > 0 && (
                <TouchableOpacity onPress={handleClearAll}>
                  <Text style={styles.clearButton}>Clear all</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setShowDropdown(false)}
                style={styles.closeButton}
              >
                <MinimalIcon name="close" size={18} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={true}>
              {totalCount === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No new notifications</Text>
                </View>
              ) : (
                <>
                  {/* Friend Requests */}
                  {notifications.new_friend_requests && notifications.new_friend_requests.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Friend Requests</Text>
                      {notifications.new_friend_requests.map((req, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.item}
                          onPress={() => handleFriendRequestClick(req, idx)}
                        >
                          <View style={styles.itemIcon}>
                            <MinimalIcon name="profile" size={16} color="#7f6aa4" />
                          </View>
                          <View style={styles.itemContent}>
                            <Text style={styles.itemText}>
                              <Text style={styles.itemBold}>{req.from_user}</Text> sent you a friend request
                            </Text>
                            <Text style={styles.itemTime}>{formatTime(req.created_at)}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Channel Invites */}
                  {notifications.channel_invites && notifications.channel_invites.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Channel Invites</Text>
                      {notifications.channel_invites.map((invite) => (
                        <View key={invite.id} style={styles.item}>
                          <View style={styles.itemIcon}>
                            <MinimalIcon name="forum" size={16} color="#7f6aa4" />
                          </View>
                          <View style={styles.itemContent}>
                            <Text style={styles.itemText}>
                              <Text style={styles.itemBold}>{invite.invited_by}</Text> invited you to join{' '}
                              <Text style={styles.itemBold}>{invite.channel_name}</Text>
                            </Text>
                            <Text style={styles.itemTime}>{formatTime(invite.created_at)}</Text>
                            <View style={styles.actions}>
                              <TouchableOpacity
                                style={[styles.actionButton, styles.actionButtonPrimary]}
                                onPress={() => handleRecipientInviteAction(invite, 'accept')}
                              >
                                <Text style={styles.actionButtonText}>Accept</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.actionButton, styles.actionButtonSecondary]}
                                onPress={() => handleRecipientInviteAction(invite, 'decline')}
                              >
                                <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
                                  Decline
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Invite Approvals */}
                  {notifications.invite_approvals && notifications.invite_approvals.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Invite Approvals</Text>
                      {notifications.invite_approvals.map((invite) => (
                        <View key={invite.id} style={styles.item}>
                          <View style={styles.itemIcon}>
                            <MinimalIcon name="lock" size={16} color="#7f6aa4" />
                          </View>
                          <View style={styles.itemContent}>
                            <Text style={styles.itemText}>
                              <Text style={styles.itemBold}>{invite.invited_by}</Text> requested to add{' '}
                              <Text style={styles.itemBold}>{invite.invitee_username}</Text> to{' '}
                              <Text style={styles.itemBold}>{invite.channel_name}</Text>
                            </Text>
                            <Text style={styles.itemTime}>{formatTime(invite.created_at)}</Text>
                            <View style={styles.actions}>
                              <TouchableOpacity
                                style={[styles.actionButton, styles.actionButtonPrimary]}
                                onPress={() => handleOwnerInviteAction(invite, 'approve')}
                              >
                                <Text style={styles.actionButtonText}>Approve</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.actionButton, styles.actionButtonSecondary]}
                                onPress={() => handleOwnerInviteAction(invite, 'decline')}
                              >
                                <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
                                  Decline
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Messages */}
                  {notifications.new_messages > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Messages</Text>
                      {notifications.new_message_senders && notifications.new_message_senders.length > 0 ? (
                        notifications.new_message_senders.map((sender, idx) => (
                          <TouchableOpacity
                            key={`${sender.sender_name}-${idx}`}
                            style={styles.item}
                            onPress={() => handleMessageClick(sender)}
                          >
                            <View style={styles.itemIcon}>
                              <MinimalIcon name="chat" size={16} color="#7f6aa4" />
                            </View>
                            <View style={styles.itemContent}>
                              <Text style={styles.itemText}>
                                <Text style={styles.itemBold}>{sender.sender_name}</Text> sent you{' '}
                                {sender.unread_count} new message{sender.unread_count !== 1 ? 's' : ''}
                              </Text>
                              {sender.last_message_time && (
                                <Text style={styles.itemTime}>{formatTime(sender.last_message_time)}</Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <TouchableOpacity style={styles.item} onPress={() => handleMessageClick()}>
                          <View style={styles.itemIcon}>
                            <MinimalIcon name="chat" size={16} color="#7f6aa4" />
                          </View>
                          <View style={styles.itemContent}>
                            <Text style={styles.itemText}>
                              You have <Text style={styles.itemBold}>{notifications.new_messages}</Text> new
                              message{notifications.new_messages !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* New Posts */}
                  {notifications.new_posts && notifications.new_posts.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>New Posts</Text>
                      {notifications.new_posts.map((post) => (
                        <TouchableOpacity
                          key={post.id}
                          style={styles.item}
                          onPress={() => handlePostClick(post)}
                        >
                          <View style={styles.itemIcon}>
                            <MinimalIcon name="document" size={16} color="#7f6aa4" />
                          </View>
                          <View style={styles.itemContent}>
                            <Text style={styles.itemText}>
                              <Text style={styles.itemBold}>{post.author_name}</Text> posted in{' '}
                              <Text style={styles.itemBold}>{post.channel_name}</Text>
                            </Text>
                            {post.content && (
                              <Text style={styles.itemPreview} numberOfLines={2}>
                                {post.content.substring(0, 50)}
                                {post.content.length > 50 ? '...' : ''}
                              </Text>
                            )}
                            <Text style={styles.itemTime}>{formatTime(post.timestamp)}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: 16,
  },
  dropdown: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: 320,
    maxHeight: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  clearButton: {
    fontSize: 14,
    color: '#7f6aa4',
    fontWeight: '600',
    marginRight: 12,
  },
  closeButton: {
    padding: 4,
  },
  list: {
    maxHeight: 400,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  section: {
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
  },
  item: {
    flexDirection: 'row',
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  itemBold: {
    fontWeight: '600',
  },
  itemPreview: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  itemTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: '#7f6aa4',
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#7f6aa4',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtonTextSecondary: {
    color: '#7f6aa4',
  },
});

