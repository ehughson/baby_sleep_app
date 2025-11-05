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
  getPosts: async (channelId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/forum/channels/${channelId}/posts`);
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
      const response = await axios.get(`${API_BASE_URL}/forum/users/search?q=${encodeURIComponent(query)}&current_user=${encodeURIComponent(currentUser)}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to search users');
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
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(`${API_BASE_URL}/forum/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to upload file');
    }
  },

  getFileUrl: (filename) => {
    return `${API_BASE_URL.replace('/api', '')}/forum/files/${filename}`;
  }
};

