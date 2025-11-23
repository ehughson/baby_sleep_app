/**
 * Authentication Service - React Native version
 * Ported from web version, using AsyncStorage/SecureStore instead of localStorage
 */
import axios from 'axios';
import { API_BASE_URL } from '../constants/api';
import { sessionStorage } from '../utils/storage';
import { logger } from '../utils/logger';
import { validatePassword, validateUsername, validateName, isValidEmail } from '../utils/validation';

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
    // Validate input data
    const nameValidation = validateName(data.firstName, 'First name');
    if (!nameValidation.isValid) {
      throw new Error(nameValidation.error || 'Invalid first name');
    }

    const lastNameValidation = validateName(data.lastName, 'Last name');
    if (!lastNameValidation.isValid) {
      throw new Error(lastNameValidation.error || 'Invalid last name');
    }

    if (!isValidEmail(data.email)) {
      throw new Error('Please enter a valid email address');
    }

    if (!data.useRandomUsername && data.username) {
      const usernameValidation = validateUsername(data.username);
      if (!usernameValidation.isValid) {
        throw new Error(usernameValidation.error || 'Invalid username');
      }
    }

    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.errors.join('. '));
    }

    const url = `${API_BASE_URL}/auth/signup`;
    logger.apiCall('POST', '/auth/signup', false);
    
    try {
      const payload: any = {
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password, // Server should hash this
        username: data.username ? data.username.trim() : '',
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
      
      logger.debug('Signup successful');
      return response.data;
    } catch (error: any) {
      // Don't log sensitive error details in production
      logger.error('Signup failed', __DEV__ ? error : undefined);
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      if (error.response) {
        // Use server error message if available, otherwise generic message
        const serverError = error.response.data?.error;
        throw new Error(serverError || 'Failed to create account. Please try again.');
      }
      if (error.request) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      }
      throw new Error('An unexpected error occurred. Please try again.');
    }
  },

  // Login
  login: async (data: LoginData): Promise<AuthResponse> => {
    // Validate input
    if (!data.username || !data.username.trim()) {
      throw new Error('Username is required');
    }
    if (!data.password) {
      throw new Error('Password is required');
    }

    logger.apiCall('POST', '/auth/login', false);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username: data.username.trim(),
        password: data.password, // Never log passwords
        remember_me: data.rememberMe || false,
      }, {
        timeout: 10000,
      });
      
      logger.debug('Login successful');
      return response.data;
    } catch (error: any) {
      // Don't log sensitive error details
      logger.error('Login failed', __DEV__ ? error : undefined);
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      if (error.response) {
        // Use generic error message to avoid information leakage
        const status = error.response.status;
        if (status === 401) {
          throw new Error('Invalid username or password');
        }
        const errorMessage = error.response.data?.error || 'Failed to login. Please try again.';
        throw new Error(errorMessage);
      }
      if (error.request) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
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
      logger.error('Logout error', __DEV__ ? error : undefined);
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
      throw new Error('Unable to connect to server. Please check your internet connection.');
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
      throw new Error('Unable to connect to server. Please check your internet connection.');
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
      throw new Error('Unable to connect to server. Please check your internet connection.');
    }
  },

  // Get profile
  getProfile: async (): Promise<any> => {
    try {
      const token = await sessionStorage.getToken();
      if (!token) {
        throw new Error('Not authenticated. Please login again.');
      }
      
      logger.apiCall('GET', '/auth/profile', true);
      const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to get profile');
      }
      throw new Error('Unable to connect to server. Please check your internet connection.');
    }
  },

  // Update profile
  updateProfile: async (profileData: any): Promise<any> => {
    try {
      const token = await sessionStorage.getToken();
      if (!token) {
        throw new Error('Not authenticated. Please login again.');
      }
      
      logger.apiCall('PUT', '/auth/profile', true);
      const response = await axios.put(`${API_BASE_URL}/auth/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to update profile');
      }
      throw new Error('Unable to connect to server. Please check your internet connection.');
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
      
      logger.apiCall('POST', '/auth/profile-picture', true);
      
      const response = await axios.post(`${API_BASE_URL}/auth/profile-picture`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });
      
      logger.debug('Profile picture upload successful');
      return response.data;
    } catch (error: any) {
      logger.error('Profile picture upload failed', __DEV__ ? error : undefined);
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('Upload timed out. Please try again.');
      }
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to upload profile picture');
      }
      if (error.request) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      }
      throw new Error('Failed to upload profile picture. Please try again.');
    }
  },

  // Get all baby profiles
  getBabyProfiles: async (): Promise<any> => {
    try {
      const token = await sessionStorage.getToken();
      if (!token) {
        throw new Error('Not authenticated. Please login again.');
      }
      
      logger.apiCall('GET', '/auth/baby-profile', true);
      const response = await axios.get(`${API_BASE_URL}/auth/baby-profile`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to get baby profiles');
      }
      throw new Error('Unable to connect to server. Please check your internet connection.');
    }
  },

  // Create baby profile
  createBabyProfile: async (babyProfileData: any): Promise<any> => {
    try {
      const token = await sessionStorage.getToken();
      if (!token) {
        throw new Error('Not authenticated. Please login again.');
      }
      
      logger.apiCall('POST', '/auth/baby-profile', true);
      const response = await axios.post(`${API_BASE_URL}/auth/baby-profile`, babyProfileData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to create baby profile');
      }
      throw new Error('Unable to connect to server. Please check your internet connection.');
    }
  },

  // Update baby profile
  updateBabyProfile: async (babyId: string | number, babyProfileData: any): Promise<any> => {
    try {
      const token = await sessionStorage.getToken();
      if (!token) {
        throw new Error('Not authenticated. Please login again.');
      }
      
      logger.apiCall('PUT', `/auth/baby-profile/${babyId}`, true);
      const response = await axios.put(`${API_BASE_URL}/auth/baby-profile/${babyId}`, babyProfileData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to update baby profile');
      }
      throw new Error('Unable to connect to server. Please check your internet connection.');
    }
  },

  // Delete baby profile
  deleteBabyProfile: async (babyId: string | number): Promise<any> => {
    try {
      const token = await sessionStorage.getToken();
      if (!token) {
        throw new Error('Not authenticated. Please login again.');
      }
      
      logger.apiCall('DELETE', `/auth/baby-profile/${babyId}`, true);
      const response = await axios.delete(`${API_BASE_URL}/auth/baby-profile/${babyId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to delete baby profile');
      }
      throw new Error('Unable to connect to server. Please check your internet connection.');
    }
  },

  // Get sleep goals
  getSleepGoals: async (): Promise<any> => {
    try {
      const token = await sessionStorage.getToken();
      if (!token) {
        throw new Error('Not authenticated. Please login again.');
      }
      
      logger.apiCall('GET', '/auth/sleep-goals', true);
      const response = await axios.get(`${API_BASE_URL}/auth/sleep-goals`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to get sleep goals');
      }
      throw new Error('Unable to connect to server. Please check your internet connection.');
    }
  },

  // Update sleep goals
  updateSleepGoals: async (sleepGoalsData: any): Promise<any> => {
    try {
      const token = await sessionStorage.getToken();
      if (!token) {
        throw new Error('Not authenticated. Please login again.');
      }
      
      logger.apiCall('PUT', '/auth/sleep-goals', true);
      const response = await axios.put(`${API_BASE_URL}/auth/sleep-goals`, sleepGoalsData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to update sleep goals');
      }
      throw new Error('Unable to connect to server. Please check your internet connection.');
    }
  },

  // Ping activity
  pingActivity: async (username: string): Promise<void> => {
    if (!username) return;
    try {
      await axios.post(`${API_BASE_URL}/activity/ping`, { username }, { timeout: 5000 });
    } catch (error) {
      // Silently fail for activity pings - don't log errors
      logger.debug('Activity ping failed');
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
      throw new Error('Unable to connect to server. Please check your internet connection.');
    }
  },
};

