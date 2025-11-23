/**
 * App Header Component - Shared header with REM-i logo and profile picture
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { sessionStorage } from '../utils/storage';
import { forumService } from '../services/forumService';
import { UserMenu } from './UserMenu';
import { Notifications } from './Notifications';
import { router, useFocusEffect } from 'expo-router';
import { authService } from '../services/authService';
import { Alert } from 'react-native';
import { useCallback } from 'react';
import MinimalIcon from './icons/MinimalIcon';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showMenu?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showMenu = true,
  showBackButton = false,
  onBack,
}) => {
  // Debug: Log subtitle to verify it's being passed
  if (subtitle) {
    console.log('AppHeader subtitle:', subtitle);
  }
  const [userData, setUserData] = useState<{
    profile_picture: string | null;
    username: string | null;
    first_name: string | null;
  }>({
    profile_picture: null,
    username: null,
    first_name: null,
  });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now()); // For cache busting

  useEffect(() => {
    loadUserData();
  }, []);

  // Reload user data when screen comes into focus (e.g., after profile update)
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      const data = await sessionStorage.getUserData();
      const newProfilePicture = data.profile_picture;
      // Update timestamp to force reload if profile picture changed
      if (newProfilePicture !== userData.profile_picture) {
        setImageTimestamp(Date.now());
      }
      setUserData({
        profile_picture: newProfilePicture,
        username: data.username,
        first_name: data.first_name,
      });
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    try {
      await authService.logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
      await sessionStorage.clearSession();
      router.replace('/(auth)/login');
    }
  };

  const handleDeactivate = async () => {
    setShowUserMenu(false);
    Alert.alert(
      'Deactivate Account',
      'Are you sure you want to deactivate your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              Alert.alert('Account Deactivated', 'Your account has been deactivated.');
              await sessionStorage.clearSession();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to deactivate account');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTitle}>
            {userData.profile_picture ? (
              <Image
                key={`${userData.profile_picture}-${imageTimestamp}`}
                source={{ 
                  uri: forumService.getFileUrl(userData.profile_picture) + `?t=${imageTimestamp}`
                }}
                style={styles.profilePicture}
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profilePlaceholderText}>
                  {userData.username?.charAt(0).toUpperCase() || 'R'}
                </Text>
              </View>
            )}
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>
                <Text style={styles.logoHighlight}>REM</Text>-
              </Text>
              <View style={styles.logoI}>
                <Text style={styles.logo}>ı</Text>
                <View style={[styles.moonDot, styles.moonFlipped]}>
                  <MinimalIcon name="moon" size={12} color="#fff3d1" />
                </View>
              </View>
            </View>
          </View>
          {subtitle ? (
            <View style={styles.headerSubtitleContainer}>
              {(() => {
                // Normalize the string - handle both actual newlines and escaped newlines
                let normalizedSubtitle = subtitle;
                // Replace escaped newline strings with actual newline characters
                normalizedSubtitle = normalizedSubtitle.replace(/\\n/g, '\n');
                
                // Check if we have a newline character
                if (normalizedSubtitle.includes('\n')) {
                  const lines = normalizedSubtitle.split('\n').filter(line => line.trim() !== '').slice(0, 2); // Limit to 2 lines
                  return (
                    <View>
                      {lines.map((line, index) => (
                        <Text key={index} style={styles.headerSubtitle}>
                          {line.trim()}
                        </Text>
                      ))}
                    </View>
                  );
                } else if (normalizedSubtitle.includes(', ')) {
                  const parts = normalizedSubtitle.split(', ');
                  return (
                    <Text style={styles.headerSubtitle}>
                      {parts[0]}, {parts[1]}
                    </Text>
                  );
                } else {
                  return <Text style={styles.headerSubtitle}>{normalizedSubtitle}</Text>;
                }
              })()}
            </View>
          ) : null}
        </View>
        {showBackButton && onBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        ) : showMenu ? (
          <View style={styles.headerActions}>
            {userData.username && (
              <Notifications user={{ username: userData.username }} />
            )}
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setShowUserMenu(true)}
            >
              <Text style={styles.menuButtonText}>☰</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {showMenu && (
        <UserMenu
          visible={showUserMenu}
          onClose={() => setShowUserMenu(false)}
          onProfile={() => {
            setShowUserMenu(false);
            console.log('Navigating to profile page');
            router.push('/profile');
          }}
          onBabyProfile={() => {
            setShowUserMenu(false);
            console.log('Navigating to baby-profile page');
            router.push('/baby-profile');
          }}
          onSleepGoals={() => {
            setShowUserMenu(false);
            console.log('Navigating to sleep-goals page');
            router.push('/sleep-goals');
          }}
          onSleepProgress={() => {
            setShowUserMenu(false);
            console.log('Navigating to sleep-progress page');
            router.push('/sleep-progress');
          }}
          onLogout={handleLogout}
          onDeactivate={handleDeactivate}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#3a1f35',
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
    paddingRight: 100, // Reduced padding to give more room for tagline
    flexDirection: 'column', // Ensure vertical layout
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profilePlaceholderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logo: {
    fontSize: 45,
    fontWeight: '700',
    color: '#fff3d1', // All cream color when logged in
  },
  logoHighlight: {
    color: '#fff3d1', // All cream color when logged in
  },
  logoI: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  moonDot: {
    position: 'absolute',
    top: 6, // Position lower where the dot would be on an "i"
    left: '50%', // Center horizontally
    marginLeft: -6, // Offset by half the icon width (12px / 2 = 6px) to center perfectly
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonFlipped: {
    transform: [{ scaleX: -1 }], // Flip the moon horizontally
  },
  headerSubtitleContainer: {
    marginLeft: 52, // Align with logo (40px profile + 12px gap)
    paddingRight: -8, // No padding to give maximum room for tagline
    flexShrink: 1, // Allow text to shrink if needed
    maxWidth: '100%', // Maximum width for tagline
    marginTop: -8, // Reduced margin to bring tagline closer to logo
    zIndex: 1, // Ensure it's above other elements
  },
  headerSubtitle: {
    fontSize: 8, // Smaller font to fit on one line
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 14, // Tighter line height
    includeFontPadding: false, // Prevent extra line spacing on Android
    flexShrink: 1, // Allow text to shrink if needed
  },
  menuButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingTop: 4, // Align with logo/title
  },
});

