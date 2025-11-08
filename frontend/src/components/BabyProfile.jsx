import React, { useState, useEffect } from 'react';
import { authService } from '../api/authService';
import MinimalIcon from './icons/MinimalIcon.jsx';

const BabyProfile = ({ user, onClose }) => {
  const [babies, setBabies] = useState([]);
  const [editingBaby, setEditingBaby] = useState(null);
  const [newBaby, setNewBaby] = useState({
    name: '',
    birth_date: '',
    sleep_issues: '',
    current_schedule: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadBabyProfiles();
  }, [user]);

  const loadBabyProfiles = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const data = await authService.getBabyProfiles();
      if (data && Array.isArray(data)) {
        setBabies(data);
      } else {
        setBabies([]);
      }
    } catch (error) {
      console.error('Error loading baby profiles:', error);
      setError('Failed to load baby profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (babyData, babyId = null) => {
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      let updated;
      if (babyId) {
        // Update existing baby
        updated = await authService.updateBabyProfile(babyId, babyData);
        setBabies(babies.map(b => b.id === babyId ? updated : b));
        setEditingBaby(null);
      } else {
        // Create new baby
        updated = await authService.createBabyProfile(babyData);
        setBabies([...babies, updated]);
        setNewBaby({
          name: '',
          birth_date: '',
          sleep_issues: '',
          current_schedule: '',
          notes: ''
        });
      }
      setSuccess('Baby profile saved successfully!');
    } catch (error) {
      setError(error.message || 'Failed to save baby profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (babyId) => {
    if (!window.confirm('Are you sure you want to delete this baby profile?')) {
      return;
    }

    setError('');
    setIsSaving(true);

    try {
      await authService.deleteBabyProfile(babyId);
      setBabies(babies.filter(b => b.id !== babyId));
      setSuccess('Baby profile deleted successfully!');
    } catch (error) {
      setError(error.message || 'Failed to delete baby profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-modal-overlay" onClick={onClose}>
        <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
          <div className="profile-loading">Loading baby profiles...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="profile-modal-header">
          <h2>Baby Profiles</h2>
        <button className="profile-close-btn" onClick={onClose} aria-label="Close">
          <MinimalIcon name="close" size={16} />
        </button>
        </div>

        <div className="profile-form" style={{ padding: '1.5rem' }}>
          {error && <div className="profile-error">{error}</div>}
          {success && <div className="profile-success">{success}</div>}

          {/* Existing Babies */}
          {babies.map((baby) => (
            <div key={baby.id} style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#f9f9f9' }}>
              {editingBaby === baby.id ? (
                <BabyForm
                  baby={baby}
                  onSave={(data) => handleSave(data, baby.id)}
                  onCancel={() => setEditingBaby(null)}
                  isSaving={isSaving}
                />
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, color: '#a68cab', fontFamily: 'Nunito, sans-serif' }}>
                      {baby.name || 'Unnamed Baby'}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setEditingBaby(baby.id)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          background: '#a68cab',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(baby.id)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          background: '#ff4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                        disabled={isSaving}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <BabyView baby={baby} />
                </>
              )}
            </div>
          ))}

          {/* Add New Baby */}
          {!editingBaby && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', border: '2px dashed #a68cab', borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#a68cab', fontFamily: 'Nunito, sans-serif' }}>Add New Baby</h3>
              <BabyForm
                baby={newBaby}
                onSave={(data) => handleSave(data)}
                onCancel={() => setNewBaby({
                  name: '',
                  birth_date: '',
                  sleep_issues: '',
                  current_schedule: '',
                  notes: ''
                })}
                isSaving={isSaving}
                isNew={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BabyView = ({ baby }) => (
  <div className="profile-info-section">
    {baby.birth_date && (
      <div className="profile-info-item">
        <label>Birth Date</label>
        <div>{baby.birth_date}</div>
      </div>
    )}
    {baby.sleep_issues && (
      <div className="profile-info-item">
        <label>Sleep Issues</label>
        <div style={{ whiteSpace: 'pre-wrap' }}>{baby.sleep_issues}</div>
      </div>
    )}
    {baby.current_schedule && (
      <div className="profile-info-item">
        <label>Current Sleep Schedule</label>
        <div style={{ whiteSpace: 'pre-wrap' }}>{baby.current_schedule}</div>
      </div>
    )}
    {baby.notes && (
      <div className="profile-info-item">
        <label>Additional Notes</label>
        <div style={{ whiteSpace: 'pre-wrap' }}>{baby.notes}</div>
      </div>
    )}
  </div>
);

const BabyForm = ({ baby, onSave, onCancel, isSaving, isNew = false }) => {
  const [formData, setFormData] = useState({
    name: baby.name || '',
    birth_date: baby.birth_date || '',
    sleep_issues: baby.sleep_issues || '',
    current_schedule: baby.current_schedule || '',
    notes: baby.notes || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return;
    }
    onSave({
      name: formData.name.trim(),
      birth_date: formData.birth_date || null,
      sleep_issues: formData.sleep_issues.trim() || null,
      current_schedule: formData.current_schedule.trim() || null,
      notes: formData.notes.trim() || null
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="profile-info-item">
        <label htmlFor={`baby-name-${baby.id || 'new'}`}>Baby's Name *</label>
        <input
          id={`baby-name-${baby.id || 'new'}`}
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter baby's name"
          required
        />
      </div>

      <div className="profile-info-item">
        <label htmlFor={`baby-birth-date-${baby.id || 'new'}`}>Birth Date</label>
        <input
          id={`baby-birth-date-${baby.id || 'new'}`}
          type="date"
          value={formData.birth_date}
          onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
        />
      </div>

      <div className="profile-info-item">
        <label htmlFor={`baby-sleep-issues-${baby.id || 'new'}`}>Sleep Issues</label>
        <textarea
          id={`baby-sleep-issues-${baby.id || 'new'}`}
          value={formData.sleep_issues}
          onChange={(e) => setFormData({ ...formData, sleep_issues: e.target.value })}
          placeholder="Describe any sleep challenges (e.g., night wakings, bedtime resistance)"
          rows={4}
          maxLength={1000}
        />
        <small>{formData.sleep_issues.length}/1000 characters</small>
      </div>

      <div className="profile-info-item">
        <label htmlFor={`baby-schedule-${baby.id || 'new'}`}>Current Sleep Schedule</label>
        <textarea
          id={`baby-schedule-${baby.id || 'new'}`}
          value={formData.current_schedule}
          onChange={(e) => setFormData({ ...formData, current_schedule: e.target.value })}
          placeholder="Describe current sleep schedule (e.g., naps at 9am and 2pm, bedtime at 7pm)"
          rows={4}
          maxLength={1000}
        />
        <small>{formData.current_schedule.length}/1000 characters</small>
      </div>

      <div className="profile-info-item">
        <label htmlFor={`baby-notes-${baby.id || 'new'}`}>Additional Notes</label>
        <textarea
          id={`baby-notes-${baby.id || 'new'}`}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any other information about your baby's sleep"
          rows={4}
          maxLength={1000}
        />
        <small>{formData.notes.length}/1000 characters</small>
      </div>

      <div className="profile-actions">
        <button type="button" className="profile-cancel-btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="profile-save-btn" disabled={isSaving || !formData.name.trim()}>
          {isSaving ? 'Saving...' : (isNew ? 'Add Baby' : 'Save Changes')}
        </button>
      </div>
    </form>
  );
};

export default BabyProfile;
