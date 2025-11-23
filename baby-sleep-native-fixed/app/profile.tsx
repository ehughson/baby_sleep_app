/**
 * Profile Page - Edit user profile information
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { authService } from '../src/services/authService';
import { sessionStorage } from '../src/utils/storage';
import { forumService } from '../src/services/forumService';
import { AppHeader } from '../src/components/AppHeader';

export const options = {
  headerShown: false,
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    bio: '',
    profile_picture: '',
  });
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const data = await authService.getProfile();
      setProfile({
        username: data.username || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        bio: data.bio || '',
        profile_picture: data.profile_picture || '',
      });

      if (data.profile_picture) {
        setPreviewUrl(forumService.getFileUrl(data.profile_picture));
      } else {
        setPreviewUrl(null);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('File too large', 'File size must be less than 5MB');
          return;
        }
        setSelectedFile({
          uri: asset.uri,
          type: 'image/jpeg',
          name: asset.fileName || 'profile.jpg',
        });
        setPreviewUrl(asset.uri);
        setError('');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setError('Failed to pick image');
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      let profilePictureUrl = profile.profile_picture || '';
      if (selectedFile) {
        const uploadResult = await authService.uploadProfilePicture(
          selectedFile.uri,
          selectedFile.name,
          selectedFile.type
        );
        profilePictureUrl = uploadResult.profile_picture || '';
      }

      const updated = await authService.updateProfile({
        username: profile.username || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        bio: profile.bio || '',
        profile_picture: profilePictureUrl || '',
      });

      setProfile({
        ...profile,
        profile_picture: updated.profile_picture || profilePictureUrl,
      });

      if (updated.profile_picture || profilePictureUrl) {
        setPreviewUrl(
          forumService.getFileUrl(updated.profile_picture || profilePictureUrl)
        );
      }

      // Update session storage
      const userData = await sessionStorage.getUserData();
      await sessionStorage.setUserData({
        ...userData,
        username: updated.username,
        first_name: updated.first_name,
        profile_picture: updated.profile_picture,
        bio: updated.bio,
      });

      setSuccess('Profile updated successfully!');
      setSelectedFile(null);
      
      // Auto-navigate back after 1.5 seconds
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error: any) {
      setError(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader subtitle="Edit your profile" showMenu={false} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3a1f35" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader 
        subtitle="Edit your profile" 
        showMenu={false} 
        showBackButton={true}
        onBack={() => router.back()}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {success ? (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        <View style={styles.profilePictureSection}>
          <Text style={styles.sectionLabel}>Profile Picture</Text>
          <View style={styles.profilePictureContainer}>
            {previewUrl ? (
              <Image source={{ uri: previewUrl }} style={styles.profilePicture} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profilePlaceholderText}>
                  {profile.username?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.profilePictureActions}>
            <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
              <Text style={styles.uploadButtonText}>
                {selectedFile ? 'Change Picture' : 'Upload Picture'}
              </Text>
            </TouchableOpacity>
            {selectedFile && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => {
                  setSelectedFile(null);
                  setPreviewUrl(
                    profile.profile_picture
                      ? forumService.getFileUrl(profile.profile_picture)
                      : null
                  );
                }}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={profile.username}
              onChangeText={(text) => setProfile({ ...profile, username: text })}
              placeholder="Enter username"
              placeholderTextColor="#999"
              minLength={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={profile.first_name}
              onChangeText={(text) => setProfile({ ...profile, first_name: text })}
              placeholder="Enter first name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={profile.last_name}
              onChangeText={(text) => setProfile({ ...profile, last_name: text })}
              placeholder="Enter last name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={profile.email}
              onChangeText={(text) => setProfile({ ...profile, email: text })}
              placeholder="Enter email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={profile.bio}
              onChangeText={(text) => setProfile({ ...profile, bio: text })}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.charCount}>{profile.bio.length}/500 characters</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  errorText: {
    color: '#c33',
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#efe',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#cfc',
  },
  successText: {
    color: '#3c3',
    fontSize: 14,
    textAlign: 'center',
  },
  profilePictureSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  profilePictureContainer: {
    marginBottom: 16,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#3a1f35',
  },
  profilePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3a1f35',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#3a1f35',
  },
  profilePlaceholderText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '600',
  },
  profilePictureActions: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3a1f35',
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  removeButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  formSection: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#3a1f35',
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

