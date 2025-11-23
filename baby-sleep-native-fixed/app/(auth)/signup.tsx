/**
 * Signup Screen - 3-step questionnaire
 * Step 1: Account Information
 * Step 2: Baby Information (optional, multiple babies)
 * Step 3: Sleep Goals (optional)
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
import { validatePassword, validateUsername, validateName, isValidEmail } from '../../src/utils/validation';

export const options = {
  headerShown: false,
};

interface Baby {
  name: string;
  birth_date: string;
  sleep_issues: string;
  current_schedule: string;
  notes: string;
}

const MAX_BABY_AGE_MONTHS = 60;

const calculateAgeInMonths = (birthDateStr: string): number | null => {
  if (!birthDateStr) return null;
  const [year, month, day] = birthDateStr.split('-').map((part) => parseInt(part, 10));
  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null;
  }
  const birthDate = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  if (birthDate > todayUtc) {
    return -1;
  }

  let months =
    (todayUtc.getUTCFullYear() - birthDate.getUTCFullYear()) * 12 +
    (todayUtc.getUTCMonth() - birthDate.getUTCMonth());

  if (todayUtc.getUTCDate() < birthDate.getUTCDate()) {
    months -= 1;
  }

  return months;
};

export default function SignupScreen() {
  const [signupStep, setSignupStep] = useState(1); // 1 = account, 2 = baby info, 3 = sleep goals

  // Step 1: Account fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [useRandomUsername, setUseRandomUsername] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Step 2: Baby fields
  const [babies, setBabies] = useState<Baby[]>([
    {
      name: '',
      birth_date: '',
      sleep_issues: '',
      current_schedule: '',
      notes: '',
    },
  ]);

  // Step 3: Sleep goals
  const [goal1, setGoal1] = useState('');
  const [goal2, setGoal2] = useState('');
  const [goal3, setGoal3] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Generate random username function
  const generateRandomUsername = () => {
    const adjectives = ['sleepy', 'cozy', 'dreamy', 'calm', 'gentle', 'peaceful', 'serene', 'tranquil', 'restful', 'quiet'];
    const nouns = ['baby', 'star', 'moon', 'cloud', 'angel', 'bear', 'bunny', 'bird', 'butterfly', 'flower'];
    const number = Math.floor(Math.random() * 1000);
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adjective}_${noun}_${number}`;
  };

  const validateBabyEntries = (): boolean => {
    for (const baby of babies) {
      if (baby.birth_date) {
        const ageMonths = calculateAgeInMonths(baby.birth_date);
        if (ageMonths === null) {
          setError('Please select a valid birth date for your baby.');
          return false;
        }
        if (ageMonths < 0) {
          setError('Birth date cannot be in the future.');
          return false;
        }
        if (ageMonths > MAX_BABY_AGE_MONTHS) {
          setError('Baby age must be 5 years old or younger.');
          return false;
        }
      }
    }
    return true;
  };

  const handleStep1 = () => {
    // Validate first name
    const firstNameValidation = validateName(firstName, 'First name');
    if (!firstNameValidation.isValid) {
      setError(firstNameValidation.error || 'Invalid first name');
      return;
    }

    // Validate last name
    const lastNameValidation = validateName(lastName, 'Last name');
    if (!lastNameValidation.isValid) {
      setError(lastNameValidation.error || 'Invalid last name');
      return;
    }

    // Validate email
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate username if not using random
    if (!useRandomUsername) {
      if (!username.trim()) {
        setError('Please enter a username or select "Generate random username"');
        return;
      }
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.isValid) {
        setError(usernameValidation.error || 'Invalid username');
        return;
      }
    }

    // Validate password with strength requirements
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join('. '));
      return;
    }

    setError('');
    setSignupStep(2);
  };

  const handleStep2 = () => {
    if (!validateBabyEntries()) {
      return;
    }

    setError('');
    setSignupStep(3);
  };

  const handleStep3 = async () => {
    setError('');
    setIsLoading(true);

    try {
      const finalUsername = useRandomUsername && username.match(/^[a-z]+_[a-z]+_\d+$/)
        ? username
        : useRandomUsername
        ? generateRandomUsername()
        : username;

      const babyProfiles = babies
        .filter(
          (baby) =>
            baby.name.trim() ||
            baby.birth_date ||
            baby.sleep_issues ||
            baby.current_schedule ||
            baby.notes
        )
        .map((baby) => {
          const birthDate = baby.birth_date || null;
          const ageMonths = birthDate ? calculateAgeInMonths(birthDate) : null;

          return {
            name: baby.name.trim(),
            birth_date: birthDate,
            age_months:
              birthDate && ageMonths !== null && ageMonths >= 0 ? ageMonths : null,
            sleep_issues: baby.sleep_issues.trim() || null,
            current_schedule: baby.current_schedule.trim() || null,
            notes: baby.notes.trim() || null,
          };
        });

      const sleepGoals =
        goal1.trim() || goal2.trim() || goal3.trim()
          ? {
              goal_1: goal1.trim() || null,
              goal_2: goal2.trim() || null,
              goal_3: goal3.trim() || null,
            }
          : null;

      const response = await authService.signup({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        username: finalUsername,
        useRandomUsername: useRandomUsername && username.match(/^[a-z]+_[a-z]+_\d+$/),
        rememberMe,
        babyProfiles,
        sleepGoals,
      });

      if (response && response.session_token) {
        await sessionStorage.setToken(response.session_token);
        await sessionStorage.setUserData({
          username: response.username,
          user_id: response.user_id,
          first_name: response.first_name,
          profile_picture: response.profile_picture,
          bio: response.bio,
          remember_me: rememberMe,
        });

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

  const handleBack = () => {
    if (signupStep > 1) {
      setSignupStep(signupStep - 1);
      setError('');
    }
  };

  const renderStep1 = () => (
    <>
      <Text style={styles.stepTitle}>Create Your Account</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>First Name *</Text>
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
        <Text style={styles.label}>Last Name *</Text>
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
        <Text style={styles.label}>Email *</Text>
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
        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={styles.input}
          placeholder="Min 8 chars: uppercase, lowercase, number, special"
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
          placeholder={
            useRandomUsername
              ? 'Generated username (you can edit it)'
              : 'Choose a username (min 3 characters)'
          }
          value={username}
          onChangeText={(text) => {
            setUsername(text);
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
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={styles.stepTitle}>Baby Information</Text>
      <Text style={styles.stepSubtitle}>
        Tell us about your little one(s) (all fields are optional)
      </Text>

      {babies.map((baby, index) => (
        <View key={index} style={styles.babyCard}>
          {babies.length > 1 && (
            <View style={styles.babyCardHeader}>
              <Text style={styles.babyCardTitle}>Baby {index + 1}</Text>
              <TouchableOpacity
                style={styles.removeBabyButton}
                onPress={() => setBabies(babies.filter((_, i) => i !== index))}
                disabled={isLoading}
              >
                <Text style={styles.removeBabyButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Baby's Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter baby's name"
              value={baby.name}
              onChangeText={(text) => {
                const newBabies = [...babies];
                newBabies[index].name = text;
                setBabies(newBabies);
              }}
              editable={!isLoading}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Birth Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={baby.birth_date}
              onChangeText={(text) => {
                const newBabies = [...babies];
                newBabies[index].birth_date = text;
                setBabies(newBabies);
              }}
              editable={!isLoading}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sleep Issues (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe any sleep challenges (e.g., night wakings, bedtime resistance)"
              value={baby.sleep_issues}
              onChangeText={(text) => {
                const newBabies = [...babies];
                newBabies[index].sleep_issues = text;
                setBabies(newBabies);
              }}
              multiline
              numberOfLines={3}
              editable={!isLoading}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Sleep Schedule (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe current sleep schedule (e.g., naps at 9am and 2pm, bedtime at 7pm)"
              value={baby.current_schedule}
              onChangeText={(text) => {
                const newBabies = [...babies];
                newBabies[index].current_schedule = text;
                setBabies(newBabies);
              }}
              multiline
              numberOfLines={3}
              editable={!isLoading}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Additional Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any other information about your baby's sleep"
              value={baby.notes}
              onChangeText={(text) => {
                const newBabies = [...babies];
                newBabies[index].notes = text;
                setBabies(newBabies);
              }}
              multiline
              numberOfLines={3}
              editable={!isLoading}
              placeholderTextColor="#999"
            />
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={styles.addBabyButton}
        onPress={() => {
          setBabies([
            ...babies,
            {
              name: '',
              birth_date: '',
              sleep_issues: '',
              current_schedule: '',
              notes: '',
            },
          ]);
        }}
        disabled={isLoading}
      >
        <Text style={styles.addBabyButtonText}>+ Add Another Baby</Text>
      </TouchableOpacity>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={styles.stepTitle}>Sleep Goals</Text>
      <Text style={styles.stepSubtitle}>
        What are your main sleep goals? (all fields are optional)
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Sleep Goal 1</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="e.g., Establish a consistent bedtime routine"
          value={goal1}
          onChangeText={setGoal1}
          multiline
          numberOfLines={2}
          editable={!isLoading}
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Sleep Goal 2</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="e.g., Reduce night wakings"
          value={goal2}
          onChangeText={setGoal2}
          multiline
          numberOfLines={2}
          editable={!isLoading}
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Sleep Goal 3</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="e.g., Improve nap duration"
          value={goal3}
          onChangeText={setGoal3}
          multiline
          numberOfLines={2}
          editable={!isLoading}
          placeholderTextColor="#999"
        />
      </View>
    </>
  );

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
              <Text style={styles.tagline}>Shaping sleep, one night at a time</Text>
            </View>

            {/* Step Indicator */}
            {signupStep > 1 && (
              <View style={styles.stepIndicator}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBack}
                  disabled={isLoading}
                >
                  <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.stepText}>Step {signupStep} of 3</Text>
              </View>
            )}

            {/* Form */}
            <View style={styles.form}>
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {signupStep === 1 && renderStep1()}
              {signupStep === 2 && renderStep2()}
              {signupStep === 3 && renderStep3()}

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={
                  signupStep === 1
                    ? handleStep1
                    : signupStep === 2
                    ? handleStep2
                    : handleStep3
                }
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {signupStep === 3 ? 'Create Account' : 'Continue'}
                  </Text>
                )}
              </TouchableOpacity>

              {signupStep === 1 && (
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => router.back()}
                  disabled={isLoading}
                >
                  <Text style={styles.linkText}>
                    Already have an account? <Text style={styles.linkTextBold}>Login</Text>
                  </Text>
                </TouchableOpacity>
              )}
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
    color: '#3a1f35', // All purple on signup page
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  appNameHighlight: {
    color: '#3a1f35', // All purple on signup page
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#3a1f35',
    fontSize: 16,
    fontWeight: '600',
  },
  stepText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3a1f35',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
    borderColor: '#3a1f35',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3a1f35',
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
    color: '#3a1f35',
    fontSize: 14,
    fontWeight: '500',
  },
  babyCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  babyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  babyCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3a1f35',
  },
  removeBabyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ff4444',
    borderRadius: 6,
  },
  removeBabyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addBabyButton: {
    width: '100%',
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3a1f35',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addBabyButtonText: {
    color: '#3a1f35',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#3a1f35',
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
    color: '#3a1f35',
    fontWeight: '600',
  },
});
