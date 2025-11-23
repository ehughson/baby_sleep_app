/**
 * Sleep Goals Page - Manage sleep goals
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { authService } from '../src/services/authService';
import { AppHeader } from '../src/components/AppHeader';

export const options = {
  headerShown: false,
};

export default function SleepGoalsScreen() {
  const [goals, setGoals] = useState({
    goal_1: '',
    goal_2: '',
    goal_3: '',
    goal_4: '',
    goal_5: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSleepGoals();
  }, []);

  const loadSleepGoals = async () => {
    setIsLoading(true);
    try {
      const data = await authService.getSleepGoals();
      if (data && data !== null) {
        setGoals({
          goal_1: data.goal_1 || '',
          goal_2: data.goal_2 || '',
          goal_3: data.goal_3 || '',
          goal_4: data.goal_4 || '',
          goal_5: data.goal_5 || '',
        });
      } else {
        setGoals({
          goal_1: '',
          goal_2: '',
          goal_3: '',
          goal_4: '',
          goal_5: '',
        });
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        setError(error.message || 'Failed to load sleep goals');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const updated = await authService.updateSleepGoals(goals);
      setGoals({
        goal_1: updated.goal_1 || '',
        goal_2: updated.goal_2 || '',
        goal_3: updated.goal_3 || '',
        goal_4: updated.goal_4 || '',
        goal_5: updated.goal_5 || '',
      });
      setSuccess('Sleep goals updated successfully!');
      
      // Auto-navigate back after 1.5 seconds
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error: any) {
      setError(error.message || 'Failed to update sleep goals');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader 
          subtitle="Manage your sleep goals" 
          showMenu={false} 
          showBackButton={true}
          onBack={() => router.back()}
        />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3a1f35" />
          <Text style={styles.loadingText}>Loading sleep goals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader 
        subtitle="Manage your sleep goals" 
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

        <Text style={styles.description}>
          What are your main sleep goals? These will help REMi provide personalized advice.
        </Text>

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sleep Goal 1</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={goals.goal_1}
              onChangeText={(text) => setGoals({ ...goals, goal_1: text })}
              placeholder="e.g., Establish a consistent bedtime routine"
              placeholderTextColor="#999"
              multiline
              numberOfLines={2}
              maxLength={500}
            />
            <Text style={styles.charCount}>{goals.goal_1.length}/500 characters</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sleep Goal 2</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={goals.goal_2}
              onChangeText={(text) => setGoals({ ...goals, goal_2: text })}
              placeholder="e.g., Reduce night wakings"
              placeholderTextColor="#999"
              multiline
              numberOfLines={2}
              maxLength={500}
            />
            <Text style={styles.charCount}>{goals.goal_2.length}/500 characters</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sleep Goal 3</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={goals.goal_3}
              onChangeText={(text) => setGoals({ ...goals, goal_3: text })}
              placeholder="e.g., Improve nap duration"
              placeholderTextColor="#999"
              multiline
              numberOfLines={2}
              maxLength={500}
            />
            <Text style={styles.charCount}>{goals.goal_3.length}/500 characters</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sleep Goal 4</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={goals.goal_4}
              onChangeText={(text) => setGoals({ ...goals, goal_4: text })}
              placeholder="e.g., Help baby fall asleep independently"
              placeholderTextColor="#999"
              multiline
              numberOfLines={2}
              maxLength={500}
            />
            <Text style={styles.charCount}>{goals.goal_4.length}/500 characters</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sleep Goal 5</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={goals.goal_5}
              onChangeText={(text) => setGoals({ ...goals, goal_5: text })}
              placeholder="e.g., Create a peaceful sleep environment"
              placeholderTextColor="#999"
              multiline
              numberOfLines={2}
              maxLength={500}
            />
            <Text style={styles.charCount}>{goals.goal_5.length}/500 characters</Text>
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
              <Text style={styles.saveButtonText}>Save Goals</Text>
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
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
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
    minHeight: 80,
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

