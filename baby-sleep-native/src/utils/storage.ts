/**
 * Storage utility - React Native replacement for localStorage
 * Uses AsyncStorage for general data and SecureStore for sensitive tokens
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEYS = {
  SESSION_TOKEN: 'session_token',
  USERNAME: 'username',
  USER_ID: 'user_id',
  FIRST_NAME: 'first_name',
  REMEMBER_ME: 'remember_me',
  PROFILE_PICTURE: 'profile_picture',
  BIO: 'bio',
  FORUM_AUTHOR_NAME: 'forum_author_name',
} as const;

export const storage = {
  // Get item from AsyncStorage
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Error getting ${key} from storage:`, error);
      return null;
    }
  },

  // Set item in AsyncStorage
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error setting ${key} in storage:`, error);
    }
  },

  // Remove item from AsyncStorage
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from storage:`, error);
    }
  },

  // Get secure token (uses SecureStore)
  async getSecureToken(key: string = STORAGE_KEYS.SESSION_TOKEN): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error getting secure token ${key}:`, error);
      return null;
    }
  },

  // Set secure token (uses SecureStore)
  async setSecureToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Error setting secure token ${key}:`, error);
    }
  },

  // Remove secure token
  async removeSecureToken(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Error removing secure token ${key}:`, error);
    }
  },

  // Clear all storage
  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
      // Note: SecureStore doesn't have a clear all method, so we'd need to remove items individually
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};

// Convenience methods for common operations
export const sessionStorage = {
  async getToken(): Promise<string | null> {
    return storage.getSecureToken(STORAGE_KEYS.SESSION_TOKEN);
  },

  async setToken(token: string): Promise<void> {
    await storage.setSecureToken(STORAGE_KEYS.SESSION_TOKEN, token);
  },

  async removeToken(): Promise<void> {
    await storage.removeSecureToken(STORAGE_KEYS.SESSION_TOKEN);
  },

  async getUsername(): Promise<string | null> {
    return storage.getItem(STORAGE_KEYS.USERNAME);
  },

  async setUsername(username: string): Promise<void> {
    await storage.setItem(STORAGE_KEYS.USERNAME, username);
  },

  async getUserData(): Promise<{
    username: string | null;
    user_id: string | null;
    first_name: string | null;
    profile_picture: string | null;
    bio: string | null;
  }> {
    const [username, user_id, first_name, profile_picture, bio] = await Promise.all([
      storage.getItem(STORAGE_KEYS.USERNAME),
      storage.getItem(STORAGE_KEYS.USER_ID),
      storage.getItem(STORAGE_KEYS.FIRST_NAME),
      storage.getItem(STORAGE_KEYS.PROFILE_PICTURE),
      storage.getItem(STORAGE_KEYS.BIO),
    ]);

    return {
      username,
      user_id,
      first_name,
      profile_picture,
      bio,
    };
  },

  async setUserData(userData: {
    username?: string;
    user_id?: string;
    first_name?: string;
    profile_picture?: string;
    bio?: string;
    remember_me?: boolean;
  }): Promise<void> {
    const promises: Promise<void>[] = [];

    if (userData.username) {
      promises.push(storage.setItem(STORAGE_KEYS.USERNAME, userData.username));
    }
    if (userData.user_id) {
      promises.push(storage.setItem(STORAGE_KEYS.USER_ID, userData.user_id));
    }
    if (userData.first_name) {
      promises.push(storage.setItem(STORAGE_KEYS.FIRST_NAME, userData.first_name));
    }
    if (userData.profile_picture !== undefined) {
      promises.push(storage.setItem(STORAGE_KEYS.PROFILE_PICTURE, userData.profile_picture || ''));
    }
    if (userData.bio !== undefined) {
      promises.push(storage.setItem(STORAGE_KEYS.BIO, userData.bio || ''));
    }
    if (userData.remember_me !== undefined) {
      promises.push(storage.setItem(STORAGE_KEYS.REMEMBER_ME, userData.remember_me ? 'true' : 'false'));
    }

    await Promise.all(promises);
  },

  async clearSession(): Promise<void> {
    await Promise.all([
      storage.removeSecureToken(STORAGE_KEYS.SESSION_TOKEN),
      storage.removeItem(STORAGE_KEYS.USERNAME),
      storage.removeItem(STORAGE_KEYS.USER_ID),
      storage.removeItem(STORAGE_KEYS.FIRST_NAME),
      storage.removeItem(STORAGE_KEYS.REMEMBER_ME),
      storage.removeItem(STORAGE_KEYS.PROFILE_PICTURE),
      storage.removeItem(STORAGE_KEYS.BIO),
      storage.removeItem(STORAGE_KEYS.FORUM_AUTHOR_NAME),
    ]);
  },
};

