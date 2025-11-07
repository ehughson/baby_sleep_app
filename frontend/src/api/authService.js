import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

// Debug logging
console.log('API Base URL:', API_BASE_URL);
console.log('Environment:', import.meta.env.MODE);

export const authService = {
  // Sign up new user
  signup: async (firstName, lastName, email, password, username, useRandomUsername, rememberMe = false, babyProfiles = [], sleepGoals = null) => {
    const url = `${API_BASE_URL}/auth/signup`;
    console.log('Signup request URL:', url);
    console.log('Signup payload:', { firstName, lastName, email, password: '***', username, useRandomUsername, remember_me: rememberMe, babyProfiles, sleepGoals });
    
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        username: username || '', // Send the username even if useRandomUsername is true, so backend can use it if available
        use_random_username: useRandomUsername,
        remember_me: rememberMe
      };
      
      // Add baby profiles if provided
      if (babyProfiles && babyProfiles.length > 0) {
        payload.baby_profiles = babyProfiles;
      }
      
      // Add sleep goals if provided
      if (sleepGoals) {
        payload.sleep_goals = sleepGoals;
      }
      
      const response = await axios.post(url, payload, {
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
      console.log('Login attempt:', { username, url: `${API_BASE_URL}/auth/login` });
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password,
        remember_me: rememberMe
      }, {
        timeout: 10000 // 10 second timeout
      });
      console.log('Login response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      if (error.response) {
        const errorMessage = error.response.data?.error || 'Failed to login';
        console.error('Login error response:', error.response.data);
        throw new Error(errorMessage);
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
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000 // 5 second timeout
      });
      return response.data;
    } catch (error) {
      // Re-throw the error so the caller can distinguish between network errors and auth failures
      if (error.response && error.response.status === 401) {
        return { authenticated: false };
      }
      // For network errors, throw so caller can handle gracefully
      throw error;
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
  },

  // Deactivate account
  deactivateAccount: async () => {
    try {
      const token = localStorage.getItem('session_token');
      if (!token) {
        throw new Error('Not authenticated');
      }
      const response = await axios.post(`${API_BASE_URL}/auth/deactivate`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to deactivate account');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        email
      }, {
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to process password reset request');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Reset password
  resetPassword: async (token, newPassword) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        token,
        password: newPassword
      }, {
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to reset password');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Get profile
  getProfile: async () => {
    try {
      const token = localStorage.getItem('session_token');
      const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to get profile');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Update profile
  updateProfile: async (profileData) => {
    try {
      const token = localStorage.getItem('session_token');
      const response = await axios.put(`${API_BASE_URL}/auth/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to update profile');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Upload profile picture
  uploadProfilePicture: async (file) => {
    try {
      const token = localStorage.getItem('session_token');
      if (!token) {
        throw new Error('Not authenticated. Please login again.');
      }
      
      const formData = new FormData();
      formData.append('file', file);
      
      const url = `${API_BASE_URL}/auth/profile-picture`;
      console.log('Uploading profile picture to:', url);
      console.log('File:', file.name, file.type, file.size);
      
      // Don't set Content-Type header - let axios set it automatically with boundary
      const response = await axios.post(url, formData, {
        headers: { 
          Authorization: `Bearer ${token}`
        },
        timeout: 30000
      });
      
      console.log('Upload response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Profile picture upload error:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        request: error.request
      });
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('Upload timed out. Please try again.');
      }
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to upload profile picture');
      }
      if (error.request) {
        const isRailway = API_BASE_URL.includes('railway.app');
        const message = isRailway 
          ? `Unable to connect to Railway backend. Please check if the backend is deployed and running.`
          : `Unable to connect to server at ${API_BASE_URL}. Please check if the backend is running.`;
        throw new Error(message);
      }
      throw new Error(error.message || 'Failed to upload profile picture');
    }
  },

  // Get all baby profiles
  getBabyProfiles: async () => {
    try {
      const token = localStorage.getItem('session_token');
      const response = await axios.get(`${API_BASE_URL}/auth/baby-profile`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to get baby profiles');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Create baby profile
  createBabyProfile: async (babyProfileData) => {
    try {
      const token = localStorage.getItem('session_token');
      const response = await axios.post(`${API_BASE_URL}/auth/baby-profile`, babyProfileData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to create baby profile');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Update baby profile
  updateBabyProfile: async (babyId, babyProfileData) => {
    try {
      const token = localStorage.getItem('session_token');
      const response = await axios.put(`${API_BASE_URL}/auth/baby-profile/${babyId}`, babyProfileData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to update baby profile');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Delete baby profile
  deleteBabyProfile: async (babyId) => {
    try {
      const token = localStorage.getItem('session_token');
      const response = await axios.delete(`${API_BASE_URL}/auth/baby-profile/${babyId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to delete baby profile');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Get sleep goals
  getSleepGoals: async () => {
    try {
      const token = localStorage.getItem('session_token');
      const response = await axios.get(`${API_BASE_URL}/auth/sleep-goals`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to get sleep goals');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Update sleep goals
  updateSleepGoals: async (sleepGoalsData) => {
    try {
      const token = localStorage.getItem('session_token');
      const response = await axios.put(`${API_BASE_URL}/auth/sleep-goals`, sleepGoalsData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to update sleep goals');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  pingActivity: async (username) => {
    if (!username) return;
    try {
      await axios.post(`${API_BASE_URL}/activity/ping`, { username }, { timeout: 5000 });
    } catch (error) {
      console.error('Activity ping failed:', error?.response?.data?.error || error.message || error);
    }
  },

  // Get another user's public profile
  getUserProfile: async (username) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/profile/${username}`, {
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to get user profile');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  }
};

