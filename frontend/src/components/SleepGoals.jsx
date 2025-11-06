import React, { useState, useEffect } from 'react';
import { authService } from '../api/authService';

const SleepGoals = ({ user, onClose }) => {
  const [goals, setGoals] = useState({
    goal_1: '',
    goal_2: '',
    goal_3: '',
    goal_4: '',
    goal_5: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSleepGoals();
  }, [user]);

  const loadSleepGoals = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const data = await authService.getSleepGoals();
      if (data && data !== null) {
        setGoals({
          goal_1: data.goal_1 || '',
          goal_2: data.goal_2 || '',
          goal_3: data.goal_3 || '',
          goal_4: data.goal_4 || '',
          goal_5: data.goal_5 || ''
        });
      } else {
        // No sleep goals yet, reset to empty
        setGoals({
          goal_1: '',
          goal_2: '',
          goal_3: '',
          goal_4: '',
          goal_5: ''
        });
      }
    } catch (error) {
      console.error('Error loading sleep goals:', error);
      // If error is 404 or no goals, that's okay - user can create one
      if (error.response?.status !== 404) {
        setError('Failed to load sleep goals');
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
      const updated = await authService.updateSleepGoals(goals);
      setSuccess('Sleep goals updated successfully!');
      
      // Update local state
      setGoals({
        goal_1: updated.goal_1 || '',
        goal_2: updated.goal_2 || '',
        goal_3: updated.goal_3 || '',
        goal_4: updated.goal_4 || '',
        goal_5: updated.goal_5 || ''
      });
    } catch (error) {
      setError(error.message || 'Failed to update sleep goals');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-modal-overlay" onClick={onClose}>
        <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
          <div className="profile-loading">Loading sleep goals...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <h2>Sleep Goals</h2>
          <button className="profile-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSave} className="profile-form">
          {error && <div className="profile-error">{error}</div>}
          {success && <div className="profile-success">{success}</div>}

          <div className="profile-info-section">
            <p style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
              What are your main sleep goals? These will help REMi provide personalized advice.
            </p>

            <div className="profile-info-item">
              <label htmlFor="goal-1">Sleep Goal 1</label>
              <textarea
                id="goal-1"
                value={goals.goal_1}
                onChange={(e) => setGoals({ ...goals, goal_1: e.target.value })}
                placeholder="e.g., Establish a consistent bedtime routine"
                rows={2}
                maxLength={500}
              />
              <small>{goals.goal_1.length}/500 characters</small>
            </div>

            <div className="profile-info-item">
              <label htmlFor="goal-2">Sleep Goal 2</label>
              <textarea
                id="goal-2"
                value={goals.goal_2}
                onChange={(e) => setGoals({ ...goals, goal_2: e.target.value })}
                placeholder="e.g., Reduce night wakings"
                rows={2}
                maxLength={500}
              />
              <small>{goals.goal_2.length}/500 characters</small>
            </div>

            <div className="profile-info-item">
              <label htmlFor="goal-3">Sleep Goal 3</label>
              <textarea
                id="goal-3"
                value={goals.goal_3}
                onChange={(e) => setGoals({ ...goals, goal_3: e.target.value })}
                placeholder="e.g., Improve nap duration"
                rows={2}
                maxLength={500}
              />
              <small>{goals.goal_3.length}/500 characters</small>
            </div>

            <div className="profile-info-item">
              <label htmlFor="goal-4">Sleep Goal 4</label>
              <textarea
                id="goal-4"
                value={goals.goal_4}
                onChange={(e) => setGoals({ ...goals, goal_4: e.target.value })}
                placeholder="e.g., Help baby fall asleep independently"
                rows={2}
                maxLength={500}
              />
              <small>{goals.goal_4.length}/500 characters</small>
            </div>

            <div className="profile-info-item">
              <label htmlFor="goal-5">Sleep Goal 5</label>
              <textarea
                id="goal-5"
                value={goals.goal_5}
                onChange={(e) => setGoals({ ...goals, goal_5: e.target.value })}
                placeholder="e.g., Create a peaceful sleep environment"
                rows={2}
                maxLength={500}
              />
              <small>{goals.goal_5.length}/500 characters</small>
            </div>
          </div>

          <div className="profile-actions">
            <button type="button" className="profile-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="profile-save-btn" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Goals'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SleepGoals;

