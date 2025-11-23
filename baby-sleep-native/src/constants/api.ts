/**
 * API Configuration
 * Automatically detects the correct URL based on platform
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Helper to get the correct localhost URL for the platform
const getLocalhostUrl = () => {
  // iOS Simulator can use localhost
  if (Platform.OS === 'ios') {
    return 'http://localhost:5001/api';
  }
  // Android Emulator needs special IP
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5001/api';
  }
  // Default for web
  return 'http://localhost:5001/api';
};

// Get API URL from environment or use platform-specific default
export const API_BASE_URL = 
  Constants.expoConfig?.extra?.apiBaseUrl || 
  process.env.EXPO_PUBLIC_API_BASE_URL || 
  getLocalhostUrl();

console.log('API Base URL:', API_BASE_URL);
console.log('Platform:', Platform.OS);

