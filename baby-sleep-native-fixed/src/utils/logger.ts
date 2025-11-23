/**
 * Safe logging utility
 * Only logs in development mode to prevent sensitive data exposure in production
 */

const isDevelopment = __DEV__;

export const logger = {
  /**
   * Log information (only in development)
   */
  log: (...args: any[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log errors (only in development, sanitized in production)
   */
  error: (message: string, error?: any): void => {
    if (isDevelopment) {
      console.error(message, error);
    } else {
      // In production, only log generic error messages
      console.error(message);
    }
  },

  /**
   * Log warnings (only in development)
   */
  warn: (...args: any[]): void => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Log debug information (only in development)
   */
  debug: (...args: any[]): void => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Safely log API calls without exposing sensitive data
   */
  apiCall: (method: string, endpoint: string, hasAuth: boolean = false): void => {
    if (isDevelopment) {
      console.log(`[API] ${method} ${endpoint}${hasAuth ? ' [AUTH]' : ''}`);
    }
  },

  /**
   * Never log sensitive data - this method exists to make it explicit
   */
  neverLog: {
    password: () => {
      // Intentionally empty - passwords should never be logged
    },
    token: () => {
      // Intentionally empty - tokens should never be logged
    },
    username: (username: string) => {
      // Only log in development, and even then be cautious
      if (isDevelopment) {
        logger.debug('Username operation (not logging actual username)');
      }
    },
  },
};

