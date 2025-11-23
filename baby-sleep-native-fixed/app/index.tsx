/**
 * Entry point - Checks if user is logged in and routes accordingly
 */
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { sessionStorage } from '../src/utils/storage';
import { authService } from '../src/services/authService';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Small delay to ensure router is ready
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const token = await sessionStorage.getToken();
      const userData = await sessionStorage.getUserData();

      console.log('Auth check - token:', token ? 'exists' : 'missing');
      console.log('Auth check - userData:', userData);

      if (token && userData.username) {
        // Verify token is still valid
        try {
          const session = await authService.checkSession(token);
          console.log('Session check result:', session);
          if (session && session.authenticated) {
            // Token is valid, go to main app
            console.log('Navigating to chat');
            router.replace('/(tabs)/chat');
            return;
          } else {
            console.log('Session not authenticated, clearing');
            await sessionStorage.clearSession();
          }
        } catch (error) {
          console.log('Session check failed, clearing session:', error);
          // Token invalid, clear and go to login
          await sessionStorage.clearSession();
        }
      }

      // No valid session, go to login
      console.log('No valid session, navigating to login');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Auth check error:', error);
      // Fallback to login on any error
      try {
        router.replace('/(auth)/login');
      } catch (navError) {
        console.error('Navigation error:', navError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Keep showing loading until navigation completes
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3a1f35" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

