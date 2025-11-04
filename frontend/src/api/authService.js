import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export const authService = {
  // Sign up new user
  signup: async (username, email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/signup`, {
        username,
        email,
        password
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create account');
    }
  },

  // Login
  login: async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to login');
    }
  },

  // Check session
  checkSession: async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/session`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      return { authenticated: false };
    }
  },

  // Logout
  logout: async (token) => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
};

