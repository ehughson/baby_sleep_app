import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

// Log API URL on load for debugging
console.log('API Base URL:', API_BASE_URL);

export const chatService = {
  // Send message and get response
  sendMessage: async (message, conversationId = null) => {
    try {
      console.log('Sending message to:', `${API_BASE_URL}/chat`);
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        message,
        conversation_id: conversationId
      });
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      console.error('API URL:', API_BASE_URL);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // More detailed error messages
      if (error.response) {
        // Server responded with error
        throw new Error(error.response?.data?.error || `Server error: ${error.response.status} ${error.response.statusText}`);
      } else if (error.request) {
        // Request made but no response (network error)
        throw new Error(`Cannot connect to backend. Check if ${API_BASE_URL} is correct and backend is running.`);
      } else {
        // Something else happened
        throw new Error(error.message || 'Failed to send message');
      }
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
