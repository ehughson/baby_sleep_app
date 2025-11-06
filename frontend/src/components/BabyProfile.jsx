import React, { useState, useEffect } from 'react';
import { authService } from '../api/authService';

const BabyProfile = ({ user, onClose }) => {
  const [profile, setProfile] = useState({
    name: '',
    birth_date: '',
    age_months: '',
    sleep_issues: '',
    current_schedule: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadBabyProfile();
  }, [user]);

  const loadBabyProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const data = await authService.getBabyProfile();
      if (data && data !== null) {
        setProfile({
          name: data.name || '',
          birth_date: data.birth_date || '',
          age_months: data.age_months || '',
          sleep_issues: data.sleep_issues || '',
          current_schedule: data.current_schedule || '',
          notes: data.notes || ''
        });
      } else {
        // No baby profile yet, reset to empty
        setProfile({
          name: '',
          birth_date: '',
          age_months: '',
          sleep_issues: '',
          current_schedule: '',
          notes: ''
        });
      }
    } catch (error) {
      console.error('Error loading baby profile:', error);
      // If error is 404 or no profile, that's okay - user can create one
      if (error.response?.status !== 404) {
        setError('Failed to load baby profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const updated = await authService.updateBabyProfile({
        name: profile.name,
        birth_date: profile.birth_date,
        age_months: profile.age_months ? parseInt(profile.age_months) : null,
        sleep_issues: profile.sleep_issues,
        current_schedule: profile.current_schedule,
        notes: profile.notes
      });

      setSuccess('Baby profile updated successfully!');
      
      // Update local state
      setProfile({
        name: updated.name || '',
        birth_date: updated.birth_date || '',
        age_months: updated.age_months || '',
        sleep_issues: updated.sleep_issues || '',
        current_schedule: updated.current_schedule || '',
        notes: updated.notes || ''
      });
    } catch (error) {
      setError(error.message || 'Failed to update baby profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-modal-overlay" onClick={onClose}>
        <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
          <div className="profile-loading">Loading baby profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <h2>Baby Profile</h2>
          <button className="profile-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSave} className="profile-form">
          {error && <div className="profile-error">{error}</div>}
          {success && <div className="profile-success">{success}</div>}

          <div className="profile-info-section">
            <div className="profile-info-item">
              <label htmlFor="baby-name">Baby's Name *</label>
              <input 
                id="baby-name"
                type="text" 
                value={profile.name} 
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Enter baby's name"
                required
              />
            </div>

            <div className="profile-info-item">
              <label htmlFor="baby-birth-date">Birth Date</label>
              <input 
                id="baby-birth-date"
                type="date" 
                value={profile.birth_date} 
                onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })}
              />
            </div>

            <div className="profile-info-item">
              <label htmlFor="baby-age-months">Age (in months)</label>
              <input 
                id="baby-age-months"
                type="number" 
                min="0"
                max="60"
                value={profile.age_months} 
                onChange={(e) => setProfile({ ...profile, age_months: e.target.value })}
                placeholder="e.g., 6"
              />
            </div>

            <div className="profile-info-item">
              <label htmlFor="baby-sleep-issues">Sleep Issues</label>
              <textarea
                id="baby-sleep-issues"
                value={profile.sleep_issues}
                onChange={(e) => setProfile({ ...profile, sleep_issues: e.target.value })}
                placeholder="Describe any sleep challenges (e.g., night wakings, bedtime resistance)"
                rows={4}
                maxLength={1000}
              />
              <small>{profile.sleep_issues.length}/1000 characters</small>
            </div>

            <div className="profile-info-item">
              <label htmlFor="baby-schedule">Current Sleep Schedule</label>
              <textarea
                id="baby-schedule"
                value={profile.current_schedule}
                onChange={(e) => setProfile({ ...profile, current_schedule: e.target.value })}
                placeholder="Describe current sleep schedule (e.g., naps at 9am and 2pm, bedtime at 7pm)"
                rows={4}
                maxLength={1000}
              />
              <small>{profile.current_schedule.length}/1000 characters</small>
            </div>

            <div className="profile-info-item">
              <label htmlFor="baby-notes">Additional Notes</label>
              <textarea
                id="baby-notes"
                value={profile.notes}
                onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
                placeholder="Any other information about your baby's sleep"
                rows={4}
                maxLength={1000}
              />
              <small>{profile.notes.length}/1000 characters</small>
            </div>
          </div>

          <div className="profile-actions">
            <button type="button" className="profile-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="profile-save-btn" disabled={isSaving || !profile.name.trim()}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BabyProfile;

