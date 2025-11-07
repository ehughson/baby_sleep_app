import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export const notificationService = {
  // Get all notifications
  getNotifications: async (username, lastCheck = null) => {
    try {
      const params = new URLSearchParams({ username });
      if (lastCheck) {
        params.append('last_check', lastCheck);
      }
      const response = await axios.get(`${API_BASE_URL}/notifications?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return {
        new_posts: [],
        new_messages: 0,
        new_message_senders: [],
        new_friend_requests: []
      };
    }
  }
};

