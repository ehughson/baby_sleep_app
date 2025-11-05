import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

// Debug logging
console.log('API Base URL:', API_BASE_URL);
console.log('Environment:', import.meta.env.MODE);

export const authService = {
  // Sign up new user
  signup: async (username, email, password, rememberMe = false) => {
    const url = `${API_BASE_URL}/auth/signup`;
    console.log('Signup request URL:', url);
    console.log('Signup payload:', { username, email, password: '***', remember_me: rememberMe });
    
    try {
      const response = await axios.post(url, {
        username,
        email,
        password,
        remember_me: rememberMe
      }, {
        timeout: 10000 // 10 second timeout
      });
      console.log('Signup response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Signup error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        request: error.request
      });
      
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Request timed out. Backend may not be running. Please check: ${url}`);
      }
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to create account');
      }
      if (error.request) {
        const isRailway = url.includes('railway.app');
        const message = isRailway 
          ? `Unable to connect to Railway backend at ${url}. Please check Railway logs and ensure the service is deployed and running.`
          : `Unable to connect to server at ${url}. Please check if the backend is running on port 5001.`;
        throw new Error(message);
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

