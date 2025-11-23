/**
 * API Configuration
 * Automatically detects the correct URL based on platform
 * 
 * SECURITY NOTE: In production, always use HTTPS and set EXPO_PUBLIC_API_BASE_URL
 * environment variable. Never hardcode IP addresses or use HTTP in production.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { logger } from '../utils/logger';

// For development: local IP address (set via environment variable or use defaults)
// For production: MUST use HTTPS and set EXPO_PUBLIC_API_BASE_URL
const getLocalIP = (): string => {
  // Try to get from environment variable first
  const envIP = process.env.EXPO_PUBLIC_LOCAL_IP;
  if (envIP) {
    return envIP;
  }
  
  // Fallback for development only (should not be used in production)
  // Users should set EXPO_PUBLIC_LOCAL_IP in their .env file
  if (__DEV__) {
    // Default development IP - users should override this
    return '192.168.0.73';
  }
  
  // Production should never reach here - should use EXPO_PUBLIC_API_BASE_URL
  return 'localhost';
};

// Helper to get the correct localhost URL for the platform
const getLocalhostUrl = (): string => {
  // Check if running on a physical device (not simulator/emulator)
  const isPhysicalDevice = Constants.isDevice;
  const localIP = getLocalIP();
  
  // For physical devices, use the computer's IP address
  if (isPhysicalDevice) {
    return `http://${localIP}:5001/api`;
  }
  
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
// SECURITY: Production MUST use HTTPS - set EXPO_PUBLIC_API_BASE_URL with https://
export const API_BASE_URL = 
  Constants.expoConfig?.extra?.apiBaseUrl || 
  process.env.EXPO_PUBLIC_API_BASE_URL || 
  getLocalhostUrl();

// Only log in development mode
if (__DEV__) {
  logger.debug('API Base URL configured');
  logger.debug('Platform:', Platform.OS);
  logger.debug('Is Physical Device:', Constants.isDevice);
  
  // Warn if using HTTP in what might be production
  if (API_BASE_URL.startsWith('http://') && !__DEV__) {
    logger.warn('WARNING: Using HTTP instead of HTTPS. This is insecure for production!');
  }
}

