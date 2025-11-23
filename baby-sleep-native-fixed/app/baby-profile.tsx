/**
 * Baby Profile Page - Manage baby profiles
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { authService } from '../src/services/authService';
import { AppHeader } from '../src/components/AppHeader';

export const options = {
  headerShown: false,
};

interface Baby {
  id?: number;
  name: string;
  birth_date: string;
  sleep_issues: string;
  current_schedule: string;
  notes: string;
}

export default function BabyProfileScreen() {
  const [babies, setBabies] = useState<Baby[]>([]);
  const [editingBaby, setEditingBaby] = useState<number | null>(null);
  const [newBaby, setNewBaby] = useState<Baby>({
    name: '',
    birth_date: '',
    sleep_issues: '',
    current_schedule: '',
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadBabyProfiles();
  }, []);

  const loadBabyProfiles = async () => {
    setIsLoading(true);
    try {
      const data = await authService.getBabyProfiles();
      if (data && Array.isArray(data)) {
        setBabies(data);
      } else {
        setBabies([]);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load baby profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (babyData: Baby, babyId: number | null = null) => {
    if (!babyData.name.trim()) {
      setError('Baby name is required');
      return;
    }

    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      let updated;
      if (babyId) {
        updated = await authService.updateBabyProfile(babyId, {
          name: babyData.name.trim(),
          birth_date: babyData.birth_date || null,
          sleep_issues: babyData.sleep_issues.trim() || null,
          current_schedule: babyData.current_schedule.trim() || null,
          notes: babyData.notes.trim() || null,
        });
        setBabies(babies.map((b) => (b.id === babyId ? updated : b)));
        setEditingBaby(null);
      } else {
        updated = await authService.createBabyProfile({
          name: babyData.name.trim(),
          birth_date: babyData.birth_date || null,
          sleep_issues: babyData.sleep_issues.trim() || null,
          current_schedule: babyData.current_schedule.trim() || null,
          notes: babyData.notes.trim() || null,
        });
        setBabies([...babies, updated]);
        setNewBaby({
          name: '',
          birth_date: '',
          sleep_issues: '',
          current_schedule: '',
          notes: '',
        });
      }
      setSuccess('Baby profile saved successfully!');
      
      // Auto-navigate back after 1.5 seconds (only if editing existing baby)
      if (editingBaby !== null) {
        setTimeout(() => {
          router.back();
        }, 1500);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to save baby profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (babyId: number) => {
    Alert.alert(
      'Delete Baby Profile',
      'Are you sure you want to delete this baby profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setError('');
            setIsSaving(true);
            try {
              await authService.deleteBabyProfile(babyId);
              setBabies(babies.filter((b) => b.id !== babyId));
              setSuccess('Baby profile deleted successfully!');
            } catch (error: any) {
              setError(error.message || 'Failed to delete baby profile');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader 
          subtitle="Manage baby profiles" 
          showMenu={false} 
          showBackButton={true}
          onBack={() => router.back()}
        />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3a1f35" />
          <Text style={styles.loadingText}>Loading baby profiles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader 
        subtitle="Manage baby profiles" 
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

        {/* Existing Babies */}
        {babies.map((baby) => (
          <View key={baby.id} style={styles.babyCard}>
            {editingBaby === baby.id ? (
              <BabyForm
                baby={baby}
                onSave={(data) => handleSave(data, baby.id!)}
                onCancel={() => setEditingBaby(null)}
                isSaving={isSaving}
              />
            ) : (
              <>
                <View style={styles.babyCardHeader}>
                  <Text style={styles.babyName}>{baby.name || 'Unnamed Baby'}</Text>
                  <View style={styles.babyActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => setEditingBaby(baby.id!)}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(baby.id!)}
                      disabled={isSaving}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <BabyView baby={baby} />
              </>
            )}
          </View>
        ))}

        {/* Add New Baby */}
        {!editingBaby && (
          <View style={styles.newBabyCard}>
            <Text style={styles.newBabyTitle}>Add New Baby</Text>
            <BabyForm
              baby={newBaby}
              onSave={(data) => handleSave(data)}
              onCancel={() =>
                setNewBaby({
                  name: '',
                  birth_date: '',
                  sleep_issues: '',
                  current_schedule: '',
                  notes: '',
                })
              }
              isSaving={isSaving}
              isNew={true}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const BabyView = ({ baby }: { baby: Baby }) => (
  <View style={styles.babyView}>
    {baby.birth_date && (
      <View style={styles.babyInfoItem}>
        <Text style={styles.babyInfoLabel}>Birth Date</Text>
        <Text style={styles.babyInfoValue}>{baby.birth_date}</Text>
      </View>
    )}
    {baby.sleep_issues && (
      <View style={styles.babyInfoItem}>
        <Text style={styles.babyInfoLabel}>Sleep Issues</Text>
        <Text style={styles.babyInfoValue}>{baby.sleep_issues}</Text>
      </View>
    )}
    {baby.current_schedule && (
      <View style={styles.babyInfoItem}>
        <Text style={styles.babyInfoLabel}>Current Sleep Schedule</Text>
        <Text style={styles.babyInfoValue}>{baby.current_schedule}</Text>
      </View>
    )}
    {baby.notes && (
      <View style={styles.babyInfoItem}>
        <Text style={styles.babyInfoLabel}>Additional Notes</Text>
        <Text style={styles.babyInfoValue}>{baby.notes}</Text>
      </View>
    )}
  </View>
);

const BabyForm = ({
  baby,
  onSave,
  onCancel,
  isSaving,
  isNew = false,
}: {
  baby: Baby;
  onSave: (data: Baby) => void;
  onCancel: () => void;
  isSaving: boolean;
  isNew?: boolean;
}) => {
  const [formData, setFormData] = useState<Baby>({
    name: baby.name || '',
    birth_date: baby.birth_date || '',
    sleep_issues: baby.sleep_issues || '',
    current_schedule: baby.current_schedule || '',
    notes: baby.notes || '',
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      return;
    }
    onSave(formData);
  };

  return (
    <View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Baby's Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="Enter baby's name"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Birth Date</Text>
        <TextInput
          style={styles.input}
          value={formData.birth_date}
          onChangeText={(text) => setFormData({ ...formData, birth_date: text })}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Sleep Issues</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.sleep_issues}
          onChangeText={(text) => setFormData({ ...formData, sleep_issues: text })}
          placeholder="Describe any sleep challenges (e.g., night wakings, bedtime resistance)"
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          maxLength={1000}
        />
        <Text style={styles.charCount}>{formData.sleep_issues.length}/1000 characters</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Current Sleep Schedule</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.current_schedule}
          onChangeText={(text) => setFormData({ ...formData, current_schedule: text })}
          placeholder="Describe current sleep schedule (e.g., naps at 9am and 2pm, bedtime at 7pm)"
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          maxLength={1000}
        />
        <Text style={styles.charCount}>
          {formData.current_schedule.length}/1000 characters
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Additional Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          placeholder="Any other information about your baby's sleep"
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          maxLength={1000}
        />
        <Text style={styles.charCount}>{formData.notes.length}/1000 characters</Text>
      </View>

      <View style={styles.formActions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={isSaving}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, (!formData.name.trim() || isSaving) && styles.saveButtonDisabled]}
          onPress={handleSubmit}
          disabled={!formData.name.trim() || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{isNew ? 'Add Baby' : 'Save Changes'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

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
  babyName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3a1f35',
  },
  babyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3a1f35',
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ff4444',
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  babyView: {
    gap: 12,
  },
  babyInfoItem: {
    marginBottom: 12,
  },
  babyInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  babyInfoValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  newBabyCard: {
    marginTop: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#3a1f35',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  newBabyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3a1f35',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
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
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#3a1f35',
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

