/**
 * Friends Screen - Direct messaging with friends
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sessionStorage } from '../../src/utils/storage';
import { forumService } from '../../src/services/forumService';
import { authService } from '../../src/services/authService';
import { AppHeader } from '../../src/components/AppHeader';
import MinimalIcon from '../../src/components/icons/MinimalIcon';
import { Image, Modal } from 'react-native';

export default function FriendsScreen() {
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [friendProfilePicture, setFriendProfilePicture] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (username) {
      initializeUser();
      const interval = setInterval(() => {
        if (selectedFriend) {
          loadMessages(selectedFriend, false);
        }
        refreshFriendData();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [username, selectedFriend]);

  // Load friend's profile picture when selected
  useEffect(() => {
    if (selectedFriend) {
      const loadFriendProfile = async () => {
        try {
          const profile = await authService.getUserProfile(selectedFriend);
          setFriendProfilePicture(profile.profile_picture || null);
        } catch (error) {
          console.error('Failed to load friend profile:', error);
          setFriendProfilePicture(null);
        }
      };
      loadFriendProfile();
    } else {
      setFriendProfilePicture(null);
    }
  }, [selectedFriend]);

  useEffect(() => {
    if (friendSearchQuery.trim() && username) {
      const timer = setTimeout(() => {
        handleSearchUsers(friendSearchQuery);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [friendSearchQuery, username]);

  const loadUserData = async () => {
    try {
      const data = await sessionStorage.getUserData();
      setUsername(data.username);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const initializeUser = async () => {
    if (!username) return;
    try {
      await forumService.createOrGetUser(username);
      await refreshFriendData();
    } catch (error) {
      console.error('Error initializing user:', error);
    }
  };

  const refreshFriendData = async () => {
    if (!username) return;
    try {
      const [friendsData, requestsData] = await Promise.all([
        forumService.getFriends(username),
        forumService.getFriendRequests(username),
      ]);
      setFriends(Array.isArray(friendsData) ? friendsData : []);
      setFriendRequests(Array.isArray(requestsData) ? requestsData : []);
    } catch (error) {
      console.error('Error refreshing friend data:', error);
    }
  };

  const loadMessages = async (friendUsername: string, showLoading: boolean = true) => {
    if (!username || !friendUsername) return;
    if (showLoading) setIsLoadingMessages(true);
    try {
      const data = await forumService.getMessages(username, friendUsername);
      setMessages(Array.isArray(data) ? data : []);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      if (showLoading) setMessages([]);
    } finally {
      if (showLoading) setIsLoadingMessages(false);
    }
  };

  const handleSelectFriend = (friend: any) => {
    const friendUsername = friend.friend_name || friend.username || friend.display_name;
    if (!friendUsername) return;
    setSelectedFriend(friendUsername);
    loadMessages(friendUsername, true);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedFriend || !username) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    // Optimistic update
    const optimisticMessage = {
      id: Date.now(),
      sender_name: username,
      receiver_name: selectedFriend,
      content: messageContent,
      created_at: new Date().toISOString(),
      is_read: 0,
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      await forumService.sendMessage(username, selectedFriend, messageContent);
      setTimeout(() => {
        loadMessages(selectedFriend, false);
      }, 200);
    } catch (error: any) {
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
      setNewMessage(messageContent);
      Alert.alert('Error', error.message || 'Failed to send message');
    }
  };

  const handleSearchUsers = async (query: string) => {
    if (!query.trim() || !username) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await forumService.searchUsers(query.trim(), username);
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (error: any) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    }
  };

  const handleSendFriendRequest = async (toUser: string) => {
    if (!username) return;
    try {
      await forumService.sendFriendRequest(username, toUser);
      setFriendSearchQuery('');
      setSearchResults([]);
      setShowAddFriend(false);
      await refreshFriendData();
      Alert.alert('Success', 'Friend request sent!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send friend request');
    }
  };

  const handleAcceptFriendRequest = async (fromUser: string) => {
    if (!username) return;
    try {
      await forumService.acceptFriendRequest(fromUser, username);
      await refreshFriendData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept friend request');
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };


  if (!username) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3a1f35" />
        </View>
      </SafeAreaView>
    );
  }

  if (selectedFriend) {
    const friend = friends.find(
      (f) => (f.friend_name || f.username || f.display_name) === selectedFriend
    );
    const displayName = friend?.display_name || friend?.friend_name || selectedFriend;

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setSelectedFriend(null);
              setMessages([]);
            }}
          >
            <View style={styles.backButtonContent}>
              <MinimalIcon name="arrowLeft" size={16} color="#fff" />
              <Text style={styles.backButtonText}>Back</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.friendInfo}
            onPress={async () => {
              setIsLoadingProfile(true);
              setShowProfileModal(true);
              try {
                const profile = await authService.getUserProfile(selectedFriend);
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
            {friendProfilePicture ? (
              <Image
                source={{ uri: forumService.getFileUrl(friendProfilePicture) }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.friendName}>{displayName}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {isLoadingMessages ? (
            <ActivityIndicator size="large" color="#3a1f35" style={styles.loader} />
          ) : messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
            </View>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender_name === username;
              return (
                <View
                  key={msg.id}
                  style={[styles.message, isOwn ? styles.messageOwn : styles.messageOther]}
                >
                  <Text style={styles.messageContent}>{msg.content}</Text>
                  <Text style={styles.messageTime}>{formatTime(msg.created_at)}</Text>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={newMessage}
            onChangeText={setNewMessage}
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>

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
                      {profileData.username || selectedFriend}
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        subtitle="Shaping the future of baby sleep, one night at a time"
        showMenu={true}
      />
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.addFriendButton}
          onPress={() => setShowAddFriend(true)}
        >
          <Text style={styles.addFriendButtonText}>+ Add Friend</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
        {friendRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Friend Requests ({friendRequests.length})</Text>
            {friendRequests.map((request, idx) => (
              <View key={idx} style={styles.requestCard}>
                <View style={styles.requestInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{request.from_user.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.requestName}>{request.from_user}</Text>
                </View>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAcceptFriendRequest(request.from_user)}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Friends ({friends.length})</Text>
          {friends.length === 0 ? (
            <Text style={styles.emptyText}>No friends yet. Add some to build your village!</Text>
          ) : (
            friends.map((friend, idx) => {
              const friendUsername = friend.friend_name || friend.username || friend.display_name;
              const displayName = friend.display_name || friendUsername;
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.friendCard}
                  onPress={() => handleSelectFriend(friend)}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.friendCardName}>{displayName}</Text>
                  <Text style={styles.friendArrow}>→</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {showAddFriend && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Friend</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddFriend(false);
                  setFriendSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <MinimalIcon name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username..."
              placeholderTextColor="#999"
              value={friendSearchQuery}
              onChangeText={setFriendSearchQuery}
              autoFocus
            />
            {searchResults.length > 0 && (
              <ScrollView style={styles.searchResults}>
                {searchResults.map((user) => (
                  <View key={user.username} style={styles.searchResultItem}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{user.username.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.searchResultName}>{user.username}</Text>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => handleSendFriendRequest(user.username)}
                    >
                      <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            {friendSearchQuery && searchResults.length === 0 && (
              <Text style={styles.noResults}>No users found</Text>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#3a1f35',
    padding: 12,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
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
  headerActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#3a1f35',
    justifyContent: 'flex-end',
  },
  addFriendButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addFriendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentPadding: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  requestCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  acceptButton: {
    backgroundColor: '#3a1f35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  friendCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  friendArrow: {
    fontSize: 20,
    color: '#3a1f35',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3a1f35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  friendName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 12,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  message: {
    maxWidth: '50%',
    marginBottom: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  messageOwn: {
    alignSelf: 'flex-end',
    backgroundColor: '#3a1f35',
    borderBottomRightRadius: 4,
  },
  messageOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageContent: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
    marginBottom: -10,
    lineHeight: 18,
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    marginHorizontal: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 8,
    backgroundColor: '#f8f8f8',
  },
  sendButton: {
    backgroundColor: '#3a1f35',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  searchInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: '#f8f8f8',
  },
  searchResults: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchResultName: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  addButton: {
    backgroundColor: '#3a1f35',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  noResults: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
});
