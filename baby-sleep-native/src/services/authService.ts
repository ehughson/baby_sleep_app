/**
 * Authentication Service - React Native version
 * Ported from web version, using AsyncStorage/SecureStore instead of localStorage
 */
import axios from 'axios';
import { API_BASE_URL } from '../constants/api';
import { sessionStorage } from '../utils/storage';

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  username: string;
  useRandomUsername: boolean;
  rememberMe?: boolean;
  babyProfiles?: any[];
  sleepGoals?: {
    goal_1?: string;
    goal_2?: string;
    goal_3?: string;
  };
}

export interface LoginData {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  session_token: string;
  username: string;
  user_id: string;
  first_name?: string;
  profile_picture?: string;
  bio?: string;
}

export const authService = {
  // Sign up new user
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const url = `${API_BASE_URL}/auth/signup`;
    console.log('Signup request URL:', url);
    
    try {
      const payload: any = {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        password: data.password,
        username: data.username || '',
        use_random_username: data.useRandomUsername,
        remember_me: data.rememberMe || false,
      };
      
      // Add baby profiles if provided
      if (data.babyProfiles && data.babyProfiles.length > 0) {
        payload.baby_profiles = data.babyProfiles;
      }
      
      // Add sleep goals if provided
      if (data.sleepGoals) {
        payload.sleep_goals = data.sleepGoals;
      }
      
      const response = await axios.post(url, payload, {
        timeout: 10000,
      });
      
      console.log('Signup response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Signup error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
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
  login: async (data: LoginData): Promise<AuthResponse> => {
    try {
      console.log('Login attempt:', { username: data.username, url: `${API_BASE_URL}/auth/login` });
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username: data.username,
        password: data.password,
        remember_me: data.rememberMe || false,
      }, {
        timeout: 10000,
      });
      
      console.log('Login response:', response.data);
      return response.data;
    } catch (error: any) {
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
  checkSession: async (token: string): Promise<any> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/session`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      return response.data;
    } catch (error: any) {
      // Re-throw the error so the caller can distinguish between network errors and auth failures
      if (error.response && error.response.status === 401) {
        return { authenticated: false };
      }
      // For network errors, throw so caller can handle gracefully
      throw error;
    }
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      const token = await sessionStorage.getToken();
      if (token) {
        await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await sessionStorage.clearSession();
    }
  },

  // Deactivate account
  deactivateAccount: async (): Promise<any> => {
    try {
      const token = await sessionStorage.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      const response = await axios.post(`${API_BASE_URL}/auth/deactivate`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      await sessionStorage.clearSession();
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to deactivate account');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Forgot password
  forgotPassword: async (email: string): Promise<any> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        email,
      }, {
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to process password reset request');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Reset password
  resetPassword: async (token: string, newPassword: string): Promise<any> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        token,
        password: newPassword,
      }, {
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to reset password');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Get profile
  getProfile: async (): Promise<any> => {
    try {
      const token = await sessionStorage.getToken();
      const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to get profile');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Update profile
  updateProfile: async (profileData: any): Promise<any> => {
    try {
      const token = await sessionStorage.getToken();
      const response = await axios.put(`${API_BASE_URL}/auth/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to update profile');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Upload profile picture
  uploadProfilePicture: async (fileUri: string, fileName: string, fileType: string): Promise<any> => {
    try {
      const token = await sessionStorage.getToken();
      if (!token) {
        throw new Error('Not authenticated. Please login again.');
      }
      
      // In React Native, we need to create FormData differently
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: fileType,
      } as any);
      
      const url = `${API_BASE_URL}/auth/profile-picture`;
      console.log('Uploading profile picture to:', url);
      
      const response = await axios.post(url, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });
      
      console.log('Upload response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Profile picture upload error:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
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
  getBabyProfiles: async (): Promise<any> => {
    try {
      const token = await sessionStorage.getToken();
      const response = await axios.get(`${API_BASE_URL}/auth/baby-profile`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to get baby profiles');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Create baby profile
  createBabyProfile: async (babyProfileData: any): Promise<any> => {
    try {
      const token = await sessionStorage.getToken();
      const response = await axios.post(`${API_BASE_URL}/auth/baby-profile`, babyProfileData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to create baby profile');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Update baby profile
  updateBabyProfile: async (babyId: string | number, babyProfileData: any): Promise<any> => {
    try {
      const token = await sessionStorage.getToken();
      const response = await axios.put(`${API_BASE_URL}/auth/baby-profile/${babyId}`, babyProfileData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to update baby profile');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Delete baby profile
  deleteBabyProfile: async (babyId: string | number): Promise<any> => {
    try {
      const token = await sessionStorage.getToken();
      const response = await axios.delete(`${API_BASE_URL}/auth/baby-profile/${babyId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to delete baby profile');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Get sleep goals
  getSleepGoals: async (): Promise<any> => {
    try {
      const token = await sessionStorage.getToken();
      const response = await axios.get(`${API_BASE_URL}/auth/sleep-goals`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to get sleep goals');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Update sleep goals
  updateSleepGoals: async (sleepGoalsData: any): Promise<any> => {
    try {
      const token = await sessionStorage.getToken();
      const response = await axios.put(`${API_BASE_URL}/auth/sleep-goals`, sleepGoalsData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to update sleep goals');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  // Ping activity
  pingActivity: async (username: string): Promise<void> => {
    if (!username) return;
    try {
      await axios.post(`${API_BASE_URL}/activity/ping`, { username }, { timeout: 5000 });
    } catch (error) {
      console.error('Activity ping failed:', error);
    }
  },

  // Get another user's public profile
  getUserProfile: async (username: string): Promise<any> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/profile/${username}`, {
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to get user profile');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },
};

