import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

export const chatService = {
  // Send message and get response
  sendMessage: async (message, conversationId = null) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        message,
        conversation_id: conversationId
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to send message');
    }
  },

  // Get all conversations
  getConversations: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/conversations`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch conversations');
    }
  },

  // Create new conversation
  createConversation: async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/conversations`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to create conversation');
    }
  },

  // Get messages for a conversation
  getMessages: async (conversationId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/conversations/${conversationId}/messages`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch messages');
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.data;
    } catch (error) {
      throw new Error('Backend is not available');
    }
  }
};
