import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export const authService = {
  // Sign up new user
  signup: async (username, email, password, rememberMe = false) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/signup`, {
        username,
        email,
        password,
        remember_me: rememberMe
      }, {
        timeout: 10000 // 10 second timeout
      });
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to create account');
      }
      if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      throw new Error('An unexpected error occurred. Please try again.');
    }
  },

  // Login
  login: async (username, password, rememberMe = false) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password,
        remember_me: rememberMe
      }, {
        timeout: 10000 // 10 second timeout
      });
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to login');
      }
      if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      throw new Error('An unexpected error occurred. Please try again.');
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

