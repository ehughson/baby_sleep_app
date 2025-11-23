/**
 * Forum (Village) Screen - Full featured community discussion
 * Includes: channel list, create channel, posts, replies, reactions, file uploads, invites
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { sessionStorage } from '../../src/utils/storage';
import { forumService } from '../../src/services/forumService';
import { authService } from '../../src/services/authService';
import { AppHeader } from '../../src/components/AppHeader';
import MinimalIcon from '../../src/components/icons/MinimalIcon';
import { resolveIconName } from '../../src/components/icons/MinimalIcon';

const ICON_OPTIONS = [
  { emoji: '💬', label: 'Chat' },
  { emoji: '🌙', label: 'Night' },
  { emoji: '🛌', label: 'Bedtime' },
  { emoji: '😴', label: 'Sleep' },
  { emoji: '💤', label: 'Rest' },
  { emoji: '💙', label: 'Support' },
  { emoji: '⭐', label: 'Shine' },
  { emoji: '🎯', label: 'Goals' },
  { emoji: '📚', label: 'Learning' },
  { emoji: '💡', label: 'Ideas' },
  { emoji: '🤗', label: 'Community' },
  { emoji: '🍼', label: 'Feeding' },
  { emoji: '🌟', label: 'Highlights' },
  { emoji: '🧸', label: 'Play' },
  { emoji: '🎵', label: 'Soothing' },
  { emoji: '☕️', label: 'Caregivers' },
  { emoji: '🦉', label: 'Late Night' },
  { emoji: '🌈', label: 'Bright Spots' },
  { emoji: '🧘', label: 'Calm' },
  { emoji: '🕰️', label: 'Schedule' },
  { emoji: '🧠', label: 'Growth' },
  { emoji: '🍃', label: 'Fresh Air' },
  { emoji: '🥰', label: 'Love' },
  { emoji: '📅', label: 'Planning' },
  { emoji: '✨', label: 'Spark' },
  { emoji: '🪄', label: 'Magic' },
  { emoji: '🪺', label: 'Nest' },
  { emoji: '🛁', label: 'Bath' },
  { emoji: '🧴', label: 'Care' },
  { emoji: '🧦', label: 'Cozy' },
];

const REACTION_OPTIONS = ['👍', '❤️', '👏', '😂', '😮', '🎉', '🙏'];

const getIconName = (token: string | null | undefined, fallback: string = 'chat'): string => {
  if (!resolveIconName) {
    console.error('resolveIconName is not available');
    return fallback;
  }
  const resolved = resolveIconName(token, fallback);
  const result = resolved || fallback;
  // Log for debugging
  if (__DEV__ && !resolved) {
    console.warn(`getIconName: Could not resolve icon for token "${token}", using fallback "${fallback}"`);
  }
  return result;
};

export default function ForumScreen() {
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [backendError, setBackendError] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelIcon, setNewChannelIcon] = useState('💬');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [newChannelPrivate, setNewChannelPrivate] = useState(false);
  const [channelSearch, setChannelSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [activeReactionPicker, setActiveReactionPicker] = useState<number | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [friendSearchTerm, setFriendSearchTerm] = useState('');
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [channelMembers, setChannelMembers] = useState<any[]>([]);
  const [postsTimestamp, setPostsTimestamp] = useState(Date.now()); // For cache busting profile pictures
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const postsPollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (username) {
      loadChannels();
      const interval = setInterval(() => {
        loadChannels();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [username]);

  // Reload posts when screen comes into focus (e.g., after profile picture update)
  useFocusEffect(
    useCallback(() => {
      if (selectedChannel && username) {
        loadPosts(selectedChannel.id);
      }
    }, [selectedChannel, username])
  );

  useEffect(() => {
    if (selectedChannel && username) {
      loadPosts();
      loadChannelMembers();
    }
  }, [selectedChannel, username]);

  useEffect(() => {
    if (selectedChannel && username) {
      if (postsPollingRef.current) {
        clearInterval(postsPollingRef.current);
      }
      postsPollingRef.current = setInterval(() => {
        loadPosts(false);
      }, 5000);
      return () => {
        if (postsPollingRef.current) {
          clearInterval(postsPollingRef.current);
          postsPollingRef.current = null;
        }
      };
    }
  }, [selectedChannel, username]);

  useEffect(() => {
    if (showInviteModal && username) {
      loadFriendsList();
    }
  }, [showInviteModal, username]);

  const loadUserData = async () => {
    try {
      const data = await sessionStorage.getUserData();
      setUsername(data.username);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const loadChannels = async () => {
    if (!username) return;
    setIsLoadingChannels(true);
    setBackendError(false);
    try {
      const data = await forumService.getChannels(username);
      setChannels(Array.isArray(data) ? data : []);
      setBackendError(false);
    } catch (error: any) {
      if (error.message?.includes('Cannot connect')) {
        setBackendError(true);
        setChannels([]);
      } else {
        console.error('Error loading channels:', error);
        Alert.alert('Error', error.message || 'Failed to load channels');
      }
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const loadPosts = async (showLoading: boolean = true) => {
    if (!selectedChannel || !username) return;
    if (showLoading) setIsLoading(true);
    try {
      const data = await forumService.getPosts(selectedChannel.id, username);
      setPosts(Array.isArray(data) ? data : []);
      setPostsTimestamp(Date.now()); // Update timestamp for cache busting
    } catch (error: any) {
      console.error('Error loading posts:', error);
      if (error.message?.includes('403')) {
        Alert.alert('Access Denied', 'You do not have access to this channel');
        setSelectedChannel(null);
      }
      if (showLoading) setPosts([]);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const loadChannelMembers = async () => {
    if (!selectedChannel) return;
    try {
      const data = await forumService.getChannelMembers(selectedChannel.id);
      setChannelMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading channel members:', error);
    }
  };

  const loadFriendsList = async () => {
    if (!username) return;
    try {
      const data = await forumService.getFriends(username);
      setFriendsList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading friends list:', error);
      setFriendsList([]);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !username) return;

    try {
      const newChannel = await forumService.createChannel({
        name: newChannelName.trim(),
        icon: newChannelIcon,
        description: newChannelDescription.trim(),
        is_private: newChannelPrivate,
        owner_name: username,
      });

      setChannels((prev) => [...prev, newChannel].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedChannel(newChannel);
      setNewChannelName('');
      setNewChannelIcon('💬');
      setNewChannelDescription('');
      setNewChannelPrivate(false);
      setShowCreateChannel(false);
      loadPosts();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create channel');
    }
  };

  const handleCreatePost = async () => {
    const content = replyingTo ? replyContent : newPostContent;
    if (!content.trim() || !selectedChannel || !username) return;

    try {
      let fileData = null;
      if (selectedFile) {
        setUploadingFile(true);
        try {
          fileData = await forumService.uploadFile(selectedFile);
        } catch (uploadError: any) {
          Alert.alert('Upload Error', uploadError.message || 'Failed to upload file');
          setUploadingFile(false);
          setSelectedFile(null);
          return;
        }
        setUploadingFile(false);
      }

      const post = await forumService.createPost({
        channel_id: selectedChannel.id,
        author_name: username,
        content: content.trim(),
        file_path: fileData?.file_path,
        file_type: fileData?.file_type,
        file_name: fileData?.file_name,
        parent_post_id: replyingTo || null,
      });

      if (replyingTo) {
        loadPosts(false);
        setReplyingTo(null);
        setReplyContent('');
      } else {
        setPosts((prev) => [...prev, post]);
        setNewPostContent('');
      }
      setSelectedFile(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create post');
    }
  };

  const handleAddReaction = async (postId: number, emoji: string) => {
    if (!username) return;
    try {
      const response = await forumService.addPostReaction(postId, username, emoji);
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id === postId) {
            const wasReacted = (post.user_reactions || []).includes(emoji);
            const newUserReactions = wasReacted
              ? (post.user_reactions || []).filter((e: string) => e !== emoji)
              : [...(post.user_reactions || []), emoji];
            return { ...post, reactions: response.reactions, user_reactions: newUserReactions };
          }
          return post;
        })
      );
      setActiveReactionPicker(null);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert('File too large', 'File size must be less than 10MB');
          return;
        }
        setSelectedFile({
          uri: asset.uri,
          type: asset.type || 'image',
          name: asset.fileName || 'image.jpg',
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleDeleteChannel = async () => {
    if (!selectedChannel || !username) return;
    Alert.alert(
      'Delete Channel',
      `Are you sure you want to delete "${selectedChannel.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await forumService.deleteChannel(selectedChannel.id, username);
              setSelectedChannel(null);
              await loadChannels();
              Alert.alert('Success', 'Channel deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete channel');
            }
          },
        },
      ]
    );
  };

  const handleLeaveChannel = async () => {
    if (!selectedChannel || !username) return;
    Alert.alert(
      'Leave Channel',
      `Leave the "${selectedChannel.name}" channel? You can rejoin later if invited.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          onPress: async () => {
            try {
              await forumService.leaveChannel(selectedChannel.id, username);
              setSelectedChannel(null);
              setPosts([]);
              await loadChannels();
              Alert.alert('Success', 'You have left the channel');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to leave channel');
            }
          },
        },
      ]
    );
  };

  const handleTogglePrivacy = async () => {
    if (!selectedChannel || !username) return;
    try {
      const newPrivacy = !selectedChannel.is_private;
      await forumService.updateChannelPrivacy(selectedChannel.id, newPrivacy, username);
      setSelectedChannel({ ...selectedChannel, is_private: newPrivacy ? 1 : 0 });
      await loadChannels();
      Alert.alert('Success', `Channel is now ${newPrivacy ? 'private' : 'public'}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update privacy');
    }
  };

  const handleInvite = async () => {
    if (!inviteUsername.trim() || !selectedChannel || !username) return;

    const memberUsernames = new Set(
      channelMembers.map((member) => (member.username || '').toLowerCase())
    );
    if (memberUsernames.has(inviteUsername.toLowerCase())) {
      Alert.alert('Already a member', `${inviteUsername} is already part of this channel.`);
      return;
    }

    try {
      await forumService.inviteToChannel(selectedChannel.id, username, inviteUsername.trim());
      setInviteUsername('');
      setFriendSearchTerm('');
      setShowInviteModal(false);
      loadChannelMembers();
      Alert.alert('Success', `Invited ${inviteUsername} to the channel!`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to invite user');
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredChannels = channels.filter((channel) => {
    if (!channelSearch.trim()) return true;
    const search = channelSearch.trim().toLowerCase();
    return (
      channel.name.toLowerCase().includes(search) ||
      (channel.description || '').toLowerCase().includes(search)
    );
  });

  const availableFriends = friendsList.filter((friend) => {
    const friendUsername = friend.friend_name || friend.username || friend.display_name || '';
    const memberUsernames = new Set(
      channelMembers.map((member) => (member.username || '').toLowerCase())
    );
    const currentUser = (username || '').toLowerCase();
    const searchTerm = friendSearchTerm.trim().toLowerCase();

    if (friendUsername.toLowerCase() === currentUser) return false;
    if (memberUsernames.has(friendUsername.toLowerCase())) return false;
    if (!searchTerm) return true;

    const displayName = friend.display_name || friendUsername;
    return (
      friendUsername.toLowerCase().includes(searchTerm) ||
      displayName.toLowerCase().includes(searchTerm)
    );
  });

  // Show channel list view
  if (!selectedChannel) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader
          subtitle="Shaping the future of baby sleep, one night at a time"
          showMenu={true}
        />

        <View style={styles.headerSection}>
          <Text style={styles.sectionTitle}>Village Topics</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateChannel(true)}
          >
            <Text style={styles.createButtonText}>+ New Topic</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MinimalIcon name="search" size={16} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for topics..."
              placeholderTextColor="#999"
              value={channelSearch}
              onChangeText={setChannelSearch}
            />
            {channelSearch ? (
              <TouchableOpacity onPress={() => setChannelSearch('')}>
                <MinimalIcon name="close" size={14} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {isLoadingChannels ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#3a1f35" />
          </View>
        ) : backendError ? (
          <View style={styles.centerContent}>
            <Text style={styles.emptyText}>Backend not connected</Text>
            <Text style={styles.errorSubtext}>
              Start your Flask server on port 5001 to view channels
            </Text>
          </View>
        ) : filteredChannels.length === 0 ? (
          <View style={styles.centerContent}>
            <Text style={styles.emptyText}>
              {channelSearch.trim() ? 'No topics found' : 'No topics available'}
            </Text>
            <Text style={styles.errorSubtext}>
              {channelSearch.trim()
                ? 'Try adjusting your search or create a new topic.'
                : 'Be the first to create a topic!'}
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.channelsContainer} contentContainerStyle={styles.channelsContent}>
            {filteredChannels.map((channel) => (
              <TouchableOpacity
                key={channel.id}
                style={styles.channelCard}
                onPress={() => setSelectedChannel(channel)}
              >
                <View style={styles.channelCardHeader}>
                  <View style={styles.channelIconContainer}>
                    <MinimalIcon 
                      name={getIconName(channel.icon)} 
                      size={18} 
                      color="#7f6aa4" 
                    />
                  </View>
                  <Text style={styles.channelName}>{channel.name}</Text>
                </View>
                {channel.description && (
                  <Text style={styles.channelDescription}>{channel.description}</Text>
                )}
                <View style={styles.channelStats}>
                  {channel.is_private === 1 && (
                    <View style={styles.privateBadgeContainer}>
                      <MinimalIcon name="lock" size={14} color="#3a1f35" />
                      <Text style={styles.privateBadge}>Private</Text>
                    </View>
                  )}
                  <View style={styles.statsContainer}>
                    <MinimalIcon name="users" size={14} color="#666" />
                    <Text style={styles.statsText}>
                      {channel.active_users || 0} online
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Create Channel Modal */}
        <Modal
          visible={showCreateChannel}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCreateChannel(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create New Topic</Text>
                <TouchableOpacity onPress={() => setShowCreateChannel(false)}>
                  <MinimalIcon name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Topic Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Gentle Nights Club"
                    value={newChannelName}
                    onChangeText={setNewChannelName}
                    maxLength={80}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Icon</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.iconSelector}>
                      {ICON_OPTIONS.map((option) => {
                        const iconName = getIconName(option.emoji);
                        return (
                          <TouchableOpacity
                            key={option.emoji}
                            style={[
                              styles.iconOption,
                              newChannelIcon === option.emoji && styles.iconOptionSelected,
                            ]}
                            onPress={() => setNewChannelIcon(option.emoji)}
                          >
                            <MinimalIcon name={iconName} size={20} color={newChannelIcon === option.emoji ? '#3a1f35' : '#666'} />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Brief description of this topic..."
                    value={newChannelDescription}
                    onChangeText={setNewChannelDescription}
                    multiline
                  />
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.checkboxRow}>
                    <Switch
                      value={newChannelPrivate}
                      onValueChange={setNewChannelPrivate}
                      trackColor={{ false: '#ccc', true: '#3a1f35' }}
                    />
                    <Text style={styles.checkboxLabel}>Make this topic private</Text>
                  </View>
                  <Text style={styles.helpText}>
                    Private topics are only visible to invited members
                  </Text>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowCreateChannel(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.createButton]}
                    onPress={handleCreateChannel}
                    disabled={!newChannelName.trim()}
                  >
                    <Text style={styles.createButtonText}>Create Topic</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Show channel posts view
  const topLevelPosts = posts.filter((p) => !p.parent_post_id);
  const repliesByParent: Record<number, any[]> = {};
  posts.filter((p) => p.parent_post_id).forEach((reply) => {
    if (!repliesByParent[reply.parent_post_id]) {
      repliesByParent[reply.parent_post_id] = [];
    }
    repliesByParent[reply.parent_post_id].push(reply);
  });

  const isOwner = selectedChannel.owner_name === username;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        subtitle="Shaping the future of baby sleep, one night at a time"
        showMenu={true}
      />

      {/* Channel Header */}
      <View style={styles.channelHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setSelectedChannel(null);
            setPosts([]);
            setReplyingTo(null);
          }}
        >
          <View style={styles.backButtonContent}>
            <MinimalIcon name="arrowLeft" size={18} color="#fff" />
            <Text style={styles.backButtonText}>Back</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.channelHeaderInfo}>
          <View style={styles.channelHeaderIconContainer}>
            <MinimalIcon 
              name={getIconName(selectedChannel.icon)} 
              size={22} 
              color="#fff" 
            />
          </View>
          <View style={styles.channelHeaderText}>
            <View style={styles.channelTitleRow}>
              <Text style={styles.channelHeaderTitle}>{selectedChannel.name}</Text>
              {selectedChannel.is_private === 1 && (
                <View style={styles.privateBadgeSmallContainer}>
                  <MinimalIcon name="lock" size={14} color="#fff3d1" />
                </View>
              )}
            </View>
            {selectedChannel.description && (
              <Text style={styles.channelHeaderDescription}>{selectedChannel.description}</Text>
            )}
          </View>
        </View>
        <View style={styles.channelActions}>
          {isOwner && (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleTogglePrivacy}
              >
                <MinimalIcon 
                  name={selectedChannel.is_private ? 'globe' : 'lock'} 
                  size={18} 
                  color="#fff" 
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setInviteUsername('');
                  setFriendSearchTerm('');
                  setShowInviteModal(true);
                }}
              >
                <MinimalIcon name="userPlus" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleDeleteChannel}>
                <MinimalIcon name="trash" size={18} color="#fff" />
              </TouchableOpacity>
            </>
          )}
          {!isOwner && selectedChannel.is_private === 1 && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setInviteUsername('');
                setFriendSearchTerm('');
                setShowInviteModal(true);
              }}
            >
              <MinimalIcon name="userPlus" size={18} color="#fff" />
            </TouchableOpacity>
          )}
          {!isOwner && (
            <TouchableOpacity style={styles.actionButton} onPress={handleLeaveChannel}>
              <MinimalIcon name="exit" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Posts List */}
      <ScrollView style={styles.postsContainer} contentContainerStyle={styles.postsContent}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#3a1f35" style={styles.loader} />
        ) : posts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MinimalIcon name="forum" size={40} color="#999" />
            </View>
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>Be the first to start a conversation!</Text>
          </View>
        ) : (
          topLevelPosts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <TouchableOpacity
                  onPress={async () => {
                    if (!post.author_name) return;
                    setIsLoadingProfile(true);
                    setShowProfileModal(true);
                    try {
                      const profile = await authService.getUserProfile(post.author_name);
                      setProfileData(profile);
                    } catch (error) {
                      console.error('Failed to load profile:', error);
                      Alert.alert('Error', 'Failed to load profile');
                      setShowProfileModal(false);
                    } finally {
                      setIsLoadingProfile(false);
                    }
                  }}
                >
                  <View style={styles.postAvatar}>
                    {post.profile_picture ? (
                      <Image
                        source={{ 
                          uri: forumService.getFileUrl(post.profile_picture) + `?t=${postsTimestamp}`
                        }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.avatarText}>
                        {getInitials(post.author_name || 'U')}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    if (!post.author_name) return;
                    setIsLoadingProfile(true);
                    setShowProfileModal(true);
                    try {
                      const profile = await authService.getUserProfile(post.author_name);
                      setProfileData(profile);
                    } catch (error) {
                      console.error('Failed to load profile:', error);
                      Alert.alert('Error', 'Failed to load profile');
                      setShowProfileModal(false);
                    } finally {
                      setIsLoadingProfile(false);
                    }
                  }}
                >
                  <Text style={styles.postAuthor}>{post.author_name}</Text>
                </TouchableOpacity>
                <Text style={styles.postTime}>{formatTime(post.timestamp)}</Text>
              </View>
              <Text style={styles.postContent}>{post.content}</Text>
              {post.file_path && (
                <View style={styles.postAttachment}>
                  {post.file_type === 'image' ? (
                    <Image
                      source={{ uri: forumService.getFileUrl(post.file_path) }}
                      style={styles.postImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        // Open file URL
                        Alert.alert('File', post.file_name || post.file_path);
                      }}
                    >
                      <Text style={styles.fileLink}>📎 {post.file_name || post.file_path}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Reactions */}
              <View style={styles.reactionsBar}>
                <View style={styles.reactionsList}>
                  {(post.reactions || []).map((reaction: any) => (
                    <TouchableOpacity
                      key={reaction.emoji}
                      style={[
                        styles.reactionChip,
                        (post.user_reactions || []).includes(reaction.emoji) &&
                          styles.reactionChipActive,
                      ]}
                      onPress={() => handleAddReaction(post.id, reaction.emoji)}
                    >
                      <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                      <Text style={styles.reactionCount}>{reaction.count}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.reactionActions}>
                  <TouchableOpacity
                    style={styles.reactButton}
                    onPress={() =>
                      setActiveReactionPicker(
                        activeReactionPicker === post.id ? null : post.id
                      )
                    }
                  >
                    <View style={styles.reactButtonContent}>
                      <MinimalIcon name="spark" size={14} color="#3a1f35" />
                      <Text style={styles.reactButtonText}>React</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.replyButton}
                    onPress={() => {
                      setReplyingTo(replyingTo === post.id ? null : post.id);
                      if (replyingTo === post.id) {
                        setReplyContent('');
                      }
                    }}
                  >
                    <Text style={styles.replyButtonText}>
                      {replyingTo === post.id ? 'Cancel' : 'Reply'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {activeReactionPicker === post.id && (
                <View style={styles.reactionPicker}>
                  {REACTION_OPTIONS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={styles.reactionOption}
                      onPress={() => {
                        handleAddReaction(post.id, emoji);
                        setActiveReactionPicker(null);
                      }}
                    >
                      <Text style={styles.reactionOptionEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Replies */}
              {repliesByParent[post.id] && repliesByParent[post.id].length > 0 && (
                <View style={styles.repliesThread}>
                  {repliesByParent[post.id].map((reply) => (
                    <View key={reply.id} style={styles.replyCard}>
                      <View style={styles.postHeader}>
                        <TouchableOpacity
                          onPress={async () => {
                            if (!reply.author_name) return;
                            setIsLoadingProfile(true);
                            setShowProfileModal(true);
                            try {
                              const profile = await authService.getUserProfile(reply.author_name);
                              setProfileData(profile);
                            } catch (error) {
                              console.error('Failed to load profile:', error);
                              Alert.alert('Error', 'Failed to load profile');
                              setShowProfileModal(false);
                            } finally {
                              setIsLoadingProfile(false);
                            }
                          }}
                        >
                          <View style={[styles.postAvatar, styles.replyAvatar]}>
                            {reply.profile_picture ? (
                              <Image
                                source={{ 
                                  uri: forumService.getFileUrl(reply.profile_picture) + `?t=${postsTimestamp}`
                                }}
                                style={styles.replyAvatarImage}
                              />
                            ) : (
                              <Text style={styles.avatarText}>
                                {getInitials(reply.author_name || 'U')}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={async () => {
                            if (!reply.author_name) return;
                            setIsLoadingProfile(true);
                            setShowProfileModal(true);
                            try {
                              const profile = await authService.getUserProfile(reply.author_name);
                              setProfileData(profile);
                            } catch (error) {
                              console.error('Failed to load profile:', error);
                              Alert.alert('Error', 'Failed to load profile');
                              setShowProfileModal(false);
                            } finally {
                              setIsLoadingProfile(false);
                            }
                          }}
                        >
                          <Text style={[styles.postAuthor, styles.replyAuthor]}>
                            {reply.author_name}
                          </Text>
                        </TouchableOpacity>
                        <Text style={[styles.postTime, styles.replyTime]}>
                          {formatTime(reply.timestamp)}
                        </Text>
                      </View>
                      <Text style={[styles.postContent, styles.replyContent]}>
                        {reply.content}
                      </Text>
                      {reply.file_path && (
                        <View style={styles.postAttachment}>
                          {reply.file_type === 'image' ? (
                            <Image
                              source={{ uri: forumService.getFileUrl(reply.file_path) }}
                              style={styles.replyImage}
                              resizeMode="contain"
                            />
                          ) : (
                            <TouchableOpacity>
                              <Text style={styles.fileLink}>
                                📎 {reply.file_name || reply.file_path}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                      <View style={styles.reactionsBar}>
                        <View style={styles.reactionsList}>
                          {(reply.reactions || []).map((reaction: any) => (
                            <TouchableOpacity
                              key={reaction.emoji}
                              style={[
                                styles.reactionChip,
                                (reply.user_reactions || []).includes(reaction.emoji) &&
                                  styles.reactionChipActive,
                              ]}
                              onPress={() => handleAddReaction(reply.id, reaction.emoji)}
                            >
                              <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                              <Text style={styles.reactionCount}>{reaction.count}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        {activeReactionPicker === reply.id && (
                          <View style={styles.reactionPicker}>
                            {REACTION_OPTIONS.map((emoji) => (
                              <TouchableOpacity
                                key={emoji}
                                style={styles.reactionOption}
                                onPress={() => {
                                  handleAddReaction(reply.id, emoji);
                                  setActiveReactionPicker(null);
                                }}
                              >
                                <Text style={styles.reactionOptionEmoji}>{emoji}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                        <TouchableOpacity
                          style={styles.reactButton}
                          onPress={() =>
                            setActiveReactionPicker(
                              activeReactionPicker === reply.id ? null : reply.id
                            )
                          }
                        >
                          <MinimalIcon name="spark" size={14} color="#3a1f35" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Reply Input */}
              {replyingTo === post.id && (
                <View style={styles.replyInputSection}>
                  <Text style={styles.replyLabel}>Replying to a post</Text>
                  <TextInput
                    style={styles.replyInput}
                    placeholder="Write your reply..."
                    placeholderTextColor="#999"
                    value={replyContent}
                    onChangeText={setReplyContent}
                    multiline
                  />
                  <View style={styles.replyActions}>
                    <TouchableOpacity
                      style={styles.cancelReplyButton}
                      onPress={() => {
                        setReplyingTo(null);
                        setReplyContent('');
                      }}
                    >
                      <Text style={styles.cancelReplyText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.sendReplyButton,
                        !replyContent.trim() && styles.sendReplyButtonDisabled,
                      ]}
                      onPress={handleCreatePost}
                      disabled={!replyContent.trim()}
                    >
                      <Text style={styles.sendReplyText}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Post Input */}
      {!replyingTo && (
        <View style={styles.inputContainer}>
          {selectedFile && (
            <View style={styles.filePreview}>
              <Text style={styles.filePreviewText}>
                📎 {selectedFile.name || 'Selected file'}
              </Text>
              <TouchableOpacity onPress={() => setSelectedFile(null)}>
                <MinimalIcon name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          )}
          <TextInput
            style={styles.postInput}
            placeholder={`Share your thoughts in ${selectedChannel.name}...`}
            placeholderTextColor="#999"
            value={newPostContent}
            onChangeText={setNewPostContent}
            multiline
          />
          <View style={styles.inputActions}>
            <TouchableOpacity style={styles.attachButton} onPress={handlePickImage}>
              <Text style={styles.attachButtonText}>📎 Attach</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newPostContent.trim() && !selectedFile) || uploadingFile
                  ? styles.sendButtonDisabled
                  : null,
              ]}
              onPress={handleCreatePost}
              disabled={(!newPostContent.trim() && !selectedFile) || uploadingFile}
            >
              <Text style={styles.sendButtonText}>
                {uploadingFile ? 'Uploading...' : 'Post'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowInviteModal(false);
          setInviteUsername('');
          setFriendSearchTerm('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite to Topic</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowInviteModal(false);
                  setInviteUsername('');
                  setFriendSearchTerm('');
                }}
              >
                <MinimalIcon name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Search your friends</Text>
              <TextInput
                style={styles.input}
                placeholder="Type a friend's name..."
                placeholderTextColor="#999"
                value={friendSearchTerm}
                onChangeText={setFriendSearchTerm}
              />
            </View>

            <ScrollView style={styles.friendsList}>
              {friendsList.length === 0 ? (
                <Text style={styles.emptyText}>
                  You need to add friends before inviting them to topics.
                </Text>
              ) : availableFriends.length === 0 ? (
                <Text style={styles.emptyText}>
                  {friendSearchTerm.trim()
                    ? 'No matching friends found.'
                    : 'All of your friends are already part of this topic.'}
                </Text>
              ) : (
                availableFriends.map((friend) => {
                  const friendUsername =
                    friend.friend_name || friend.username || friend.display_name || '';
                  const displayName = friend.display_name || friendUsername;
                  const isSelected = inviteUsername === friendUsername;
                  return (
                    <TouchableOpacity
                      key={friendUsername}
                      style={[
                        styles.friendOption,
                        isSelected && styles.friendOptionSelected,
                      ]}
                      onPress={() => setInviteUsername(friendUsername)}
                    >
                      <Text style={styles.friendName}>{displayName}</Text>
                      <Text style={styles.friendUsername}>@{friendUsername}</Text>
                      {isSelected && <Text style={styles.selectedBadge}>Selected</Text>}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowInviteModal(false);
                  setInviteUsername('');
                  setFriendSearchTerm('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton, !inviteUsername && styles.createButtonDisabled]}
                onPress={handleInvite}
                disabled={!inviteUsername}
              >
                <Text style={styles.createButtonText}>Invite</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <TouchableOpacity
          style={styles.profileModalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfileModal(false)}
        >
          <View style={styles.profileModalContent} onStartShouldSetResponder={() => true}>
            {isLoadingProfile ? (
              <ActivityIndicator size="large" color="#3a1f35" />
            ) : profileData ? (
              <>
                <View style={styles.profileModalHeader}>
                  <Text style={styles.profileModalTitle}>Profile</Text>
                  <TouchableOpacity
                    onPress={() => setShowProfileModal(false)}
                    style={styles.profileModalClose}
                  >
                    <MinimalIcon name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
                <View style={styles.profileModalBody}>
                  {profileData.profile_picture ? (
                    <Image
                      source={{ uri: forumService.getFileUrl(profileData.profile_picture) }}
                      style={styles.profileModalPicture}
                    />
                  ) : (
                    <View style={styles.profileModalPlaceholder}>
                      <Text style={styles.profileModalPlaceholderText}>
                        {profileData.username?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.profileModalUsername}>
                    {profileData.username || 'Unknown'}
                  </Text>
                  {profileData.first_name && (
                    <Text style={styles.profileModalName}>
                      {profileData.first_name} {profileData.last_name || ''}
                    </Text>
                  )}
                  {profileData.bio ? (
                    <View style={styles.profileModalBioContainer}>
                      <Text style={styles.profileModalBio}>{profileData.bio}</Text>
                    </View>
                  ) : (
                    <Text style={styles.profileModalNoBio}>No bio available</Text>
                  )}
                </View>
              </>
            ) : null}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#3a1f35',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  createButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 15,
    backgroundColor: 'transparent',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  channelsContainer: {
    flex: 1,
  },
  channelsContent: {
    padding: 16,
  },
  channelCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  channelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  channelIconContainer: {
    marginRight: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  channelName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  channelDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  channelStats: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  privateBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  privateBadge: {
    fontSize: 12,
    color: '#3a1f35',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsText: {
    fontSize: 12,
    color: '#666',
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#3a1f35',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  backButton: {
    marginRight: 12,
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  channelHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelHeaderIconContainer: {
    marginRight: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelHeaderIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  channelHeaderText: {
    flex: 1,
  },
  channelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  channelHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  privateBadgeSmallContainer: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privateBadgeSmall: {
    fontSize: 14,
  },
  channelHeaderDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  channelActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postsContainer: {
    flex: 1,
  },
  postsContent: {
    padding: 16,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIconContainer: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  postCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3a1f35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  replyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  replyAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  postAuthor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  replyAuthor: {
    fontSize: 14,
  },
  postTime: {
    fontSize: 12,
    color: '#999',
  },
  replyTime: {
    fontSize: 11,
  },
  postContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  replyContent: {
    fontSize: 14,
  },
  postAttachment: {
    marginTop: 12,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  replyImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  fileLink: {
    fontSize: 14,
    color: '#3a1f35',
    textDecorationLine: 'underline',
  },
  reactionsBar: {
    marginTop: 8,
  },
  reactionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  reactionChipActive: {
    backgroundColor: '#f0e6f3',
    borderColor: '#3a1f35',
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    color: '#666',
  },
  reactionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  reactButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  reactButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reactButtonText: {
    fontSize: 12,
    color: '#666',
  },
  replyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  replyButtonText: {
    fontSize: 12,
    color: '#666',
  },
  reactionPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  reactionOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionOptionEmoji: {
    fontSize: 20,
  },
  repliesThread: {
    marginTop: 16,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#e0e0e0',
  },
  replyCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  replyInputSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  replyLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  replyInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelReplyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  cancelReplyText: {
    fontSize: 14,
    color: '#666',
  },
  sendReplyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3a1f35',
  },
  sendReplyButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  sendReplyText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  filePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
  },
  filePreviewText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  filePreviewClose: {
    fontSize: 18,
    color: '#999',
  },
  postInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    marginBottom: 8,
    backgroundColor: '#f8f8f8',
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attachButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  attachButtonText: {
    fontSize: 14,
    color: '#666',
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#3a1f35',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#999',
  },
  modalScroll: {
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f8f8f8',
  },
  iconSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  iconOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: '#3a1f35',
    backgroundColor: '#f0e6f3',
  },
  iconEmoji: {
    fontSize: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#333',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  friendsList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  friendOption: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  friendOptionSelected: {
    borderColor: '#3a1f35',
    backgroundColor: '#f0e6f3',
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  friendUsername: {
    fontSize: 14,
    color: '#666',
  },
  selectedBadge: {
    fontSize: 12,
    color: '#3a1f35',
    fontWeight: '600',
    marginTop: 4,
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  profileModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  profileModalClose: {
    padding: 4,
  },
  profileModalBody: {
    padding: 24,
    alignItems: 'center',
  },
  profileModalPicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#3a1f35',
  },
  profileModalPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3a1f35',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#3a1f35',
  },
  profileModalPlaceholderText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '700',
  },
  profileModalUsername: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  profileModalName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  profileModalBioContainer: {
    width: '100%',
    marginTop: 8,
  },
  profileModalBio: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    textAlign: 'center',
  },
  profileModalNoBio: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
});
