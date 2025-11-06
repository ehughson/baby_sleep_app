import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export const forumService = {
  // Get all channels
  getChannels: async (username = '') => {
    try {
      const url = username 
        ? `${API_BASE_URL}/forum/channels?username=${encodeURIComponent(username)}`
        : `${API_BASE_URL}/forum/channels`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch channels');
    }
  },

  // Get posts for a channel
  getPosts: async (channelId, username = '') => {
    try {
      const url = username 
        ? `${API_BASE_URL}/forum/channels/${channelId}/posts?username=${encodeURIComponent(username)}`
        : `${API_BASE_URL}/forum/channels/${channelId}/posts`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      // If endpoint doesn't exist yet, return empty array
      if (error.response?.status === 404) {
        return [];
      }
      throw new Error('Failed to fetch posts');
    }
  },

  // Create a new post
  createPost: async (postData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/forum/posts`, postData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create post');
    }
  },

  // Create a new channel
  createChannel: async (channelData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/forum/channels`, channelData);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to create channel';
      throw new Error(errorMessage);
    }
  },

  // Friends API
  createOrGetUser: async (username) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/forum/users/${username}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create/get user');
    }
  },

  getFriends: async (username) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/forum/friends/${username}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch friends');
    }
  },

  getFriendRequests: async (username) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/forum/friend-requests?username=${username}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch friend requests');
    }
  },

  sendFriendRequest: async (fromUser, toUser) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/forum/friends`, {
        from_user: fromUser,
        to_user: toUser
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to send friend request';
      throw new Error(errorMessage);
    }
  },

  acceptFriendRequest: async (fromUser, toUser) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/forum/friends/accept`, {
        from_user: fromUser,
        to_user: toUser
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to accept friend request');
    }
  },

  searchUsers: async (query, currentUser) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/forum/users/search?q=${encodeURIComponent(query)}&current_user=${encodeURIComponent(currentUser)}`, {
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('Search users error:', error);
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to search users');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Channel management
  deleteChannel: async (channelId, username) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/forum/channels/${channelId}?username=${encodeURIComponent(username)}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to delete channel');
    }
  },

  updateChannelPrivacy: async (channelId, isPrivate, username) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/forum/channels/${channelId}/privacy`, {
        is_private: isPrivate,
        username: username
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update privacy');
    }
  },

  inviteToChannel: async (channelId, invitedBy, inviteeUsername) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/forum/channels/${channelId}/invite`, {
        invited_by: invitedBy,
        invitee_username: inviteeUsername
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to invite user');
    }
  },

  getChannelMembers: async (channelId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/forum/channels/${channelId}/members`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to get channel members');
    }
  },

  // File upload
  uploadFile: async (file) => {
    try {
      console.log('Creating FormData for file:', file.name, file.type, file.size);
      const formData = new FormData();
      formData.append('file', file);
      console.log('Sending upload request to:', `${API_BASE_URL}/forum/upload`);
      
      // Don't set Content-Type header - let axios set it automatically with boundary
      const response = await axios.post(`${API_BASE_URL}/forum/upload`, formData, {
        timeout: 30000 // 30 second timeout for file uploads
      });
      
      console.log('Upload response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Upload error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code
      });
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload file';
      throw new Error(errorMessage);
    }
  },

  getFileUrl: (filename) => {
    // The backend serves files at /api/forum/files/<filename>
    // Extract just the filename if a full path is provided
    const cleanFilename = filename.split('/').pop();
    // API_BASE_URL already includes /api, so we can use it directly
    return `${API_BASE_URL}/forum/files/${cleanFilename}`;
  },

  // Direct Messages
  getConversations: async (username) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dm/conversations?username=${encodeURIComponent(username)}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to get conversations');
    }
  },

  getMessages: async (username, friendUsername) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dm/messages?username=${encodeURIComponent(username)}&friend=${encodeURIComponent(friendUsername)}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to get messages');
    }
  },

  sendMessage: async (senderName, receiverName, content) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/dm/send`, {
        sender_name: senderName,
        receiver_name: receiverName,
        content: content
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to send message');
    }
  },

  getUnreadCount: async (username) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dm/unread-count?username=${encodeURIComponent(username)}`);
      return response.data.count || 0;
    } catch (error) {
      return 0;
    }
  }
};

