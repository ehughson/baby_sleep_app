/**
 * Signup Screen - Simplified version for now
 * Can be expanded later with multi-step form like the web version
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { authService } from '../../src/services/authService';
import { sessionStorage } from '../../src/utils/storage';

export default function SignupScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [useRandomUsername, setUseRandomUsername] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Generate random username function (matches backend logic)
  const generateRandomUsername = () => {
    const adjectives = ['sleepy', 'cozy', 'dreamy', 'calm', 'gentle', 'peaceful', 'serene', 'tranquil', 'restful', 'quiet'];
    const nouns = ['baby', 'star', 'moon', 'cloud', 'angel', 'bear', 'bunny', 'bird', 'butterfly', 'flower'];
    const number = Math.floor(Math.random() * 1000);
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adjective}_${noun}_${number}`;
  };

  const handleSignup = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (!username.trim() && !useRandomUsername) {
      setError('Please enter a username or select "Generate random username"');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const finalUsername = useRandomUsername && username.match(/^[a-z]+_[a-z]+_\d+$/) 
        ? username 
        : (useRandomUsername ? generateRandomUsername() : username);

      const response = await authService.signup({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        username: finalUsername,
        useRandomUsername: useRandomUsername && username.match(/^[a-z]+_[a-z]+_\d+$/),
        rememberMe,
        babyProfiles: [], // Can add baby profiles later
        sleepGoals: null, // Can add sleep goals later
      });

      if (response && response.session_token) {
        // Save session data
        await sessionStorage.setToken(response.session_token);
        await sessionStorage.setUserData({
          username: response.username,
          user_id: response.user_id,
          first_name: response.first_name,
          profile_picture: response.profile_picture,
          bio: response.bio,
          remember_me: rememberMe,
        });

        // Navigate to main app
        router.replace('/(tabs)/chat');
      } else {
        setError('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.appName}>
                <Text style={styles.appNameHighlight}>REM</Text>-i
              </Text>
              <Text style={styles.tagline}>Create Your Account</Text>
            </View>

            {/* Signup Form */}
            <View style={styles.form}>
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter first name"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isLoading}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter last name"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isLoading}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => {
                    const newValue = !useRandomUsername;
                    setUseRandomUsername(newValue);
                    if (newValue) {
                      setUsername(generateRandomUsername());
                    } else {
                      setUsername('');
                    }
                  }}
                  disabled={isLoading}
                >
                  <View style={[styles.checkbox, useRandomUsername && styles.checkboxChecked]}>
                    {useRandomUsername && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Generate random username</Text>
                </TouchableOpacity>

                <TextInput
                  style={styles.input}
                  placeholder={useRandomUsername ? "Generated username (you can edit it)" : "Choose a username (min 3 characters)"}
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    // If user manually edits, uncheck random option if it doesn't match pattern
                    if (useRandomUsername && !text.match(/^[a-z]+_[a-z]+_\d+$/)) {
                      setUseRandomUsername(false);
                    }
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  placeholderTextColor="#999"
                />
                {useRandomUsername && (
                  <TouchableOpacity
                    style={styles.generateButton}
                    onPress={() => setUsername(generateRandomUsername())}
                    disabled={isLoading}
                  >
                    <Text style={styles.generateButtonText}>Generate New</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRememberMe(!rememberMe)}
                disabled={isLoading}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => router.back()}
                disabled={isLoading}
              >
                <Text style={styles.linkText}>
                  Already have an account? <Text style={styles.linkTextBold}>Login</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#a68cab',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  appNameHighlight: {
    color: '#fff3d1',
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    width: '100%',
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#a68cab',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#a68cab',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  generateButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  generateButtonText: {
    color: '#a68cab',
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#a68cab',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    padding: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#666',
  },
  linkTextBold: {
    color: '#a68cab',
    fontWeight: '600',
  },
});

