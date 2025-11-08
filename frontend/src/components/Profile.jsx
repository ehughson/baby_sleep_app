import React, { useState, useEffect } from 'react';
import { authService } from '../api/authService';
import { forumService } from '../api/forumService';
import MinimalIcon from './icons/MinimalIcon';

const Profile = ({ user, onUpdate, onClose }) => {
  const [profile, setProfile] = useState({
    username: user?.username || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    bio: user?.bio || '',
    profile_picture: user?.profile_picture || ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(
    user?.profile_picture ? forumService.getFileUrl(user.profile_picture) : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      loadProfile();
      // Also update previewUrl from user prop immediately
      if (user.profile_picture) {
        setPreviewUrl(forumService.getFileUrl(user.profile_picture));
      } else {
        setPreviewUrl(null);
      }
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const data = await authService.getProfile();
      setProfile({
        username: data.username || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        bio: data.bio || '',
        profile_picture: data.profile_picture || ''
      });
      
      if (data.profile_picture) {
        setPreviewUrl(forumService.getFileUrl(data.profile_picture));
      } else {
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (5MB limit for profile pictures)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      
      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      setSelectedFile(file);
      setError('');
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      // Upload profile picture if selected
      let profilePictureUrl = profile.profile_picture || '';
      if (selectedFile) {
        const uploadResult = await authService.uploadProfilePicture(selectedFile);
        profilePictureUrl = uploadResult.profile_picture || '';
      }

      // Update profile - ensure all values are strings, not null/undefined
      const updated = await authService.updateProfile({
        username: profile.username || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        bio: profile.bio || '',
        profile_picture: profilePictureUrl || ''
      });

      // Update local profile state with saved data
      setProfile({
        username: updated.username || profile.username,
        first_name: updated.first_name || profile.first_name,
        last_name: updated.last_name || profile.last_name,
        email: updated.email || profile.email,
        bio: updated.bio || profile.bio,
        profile_picture: updated.profile_picture || profile.profile_picture
      });
      
      setSuccess('Profile updated successfully!');
      if (onUpdate) {
        onUpdate({
          ...user,
          username: updated.username,
          first_name: updated.first_name,
          last_name: updated.last_name,
          email: updated.email,
          profile_picture: updated.profile_picture,
          bio: updated.bio
        });
      }
      
      // Clear file selection
      setSelectedFile(null);
      
      // Update preview URL with the saved profile picture
      const savedPictureUrl = updated.profile_picture || profilePictureUrl;
      if (savedPictureUrl) {
        setPreviewUrl(forumService.getFileUrl(savedPictureUrl));
      }
    } catch (error) {
      setError(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-modal-overlay" onClick={onClose}>
        <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
          <div className="profile-loading">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <h2>Edit Profile</h2>
        <button className="profile-close-btn" onClick={onClose} aria-label="Close">
          <MinimalIcon name="close" size={16} />
        </button>
        </div>

        <form onSubmit={handleSave} className="profile-form">
          {error && <div className="profile-error">{error}</div>}
          {success && <div className="profile-success">{success}</div>}

          <div className="profile-picture-section">
            <label className="profile-picture-label">Profile Picture</label>
            <div className="profile-picture-preview">
              {previewUrl ? (
                <img src={previewUrl} alt="Profile" className="profile-picture-img" />
              ) : (
                <div className="profile-picture-placeholder">
                  {profile.username?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <label className="profile-upload-btn" style={{ cursor: 'pointer' }}>
                {selectedFile ? 'Change Picture' : 'Upload Picture'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </label>
              {selectedFile && (
                <button
                  type="button"
                  className="profile-remove-btn"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(profile.profile_picture ? forumService.getFileUrl(profile.profile_picture) : null);
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="profile-info-section">
            <div className="profile-info-item">
              <label htmlFor="profile-username">Username</label>
              <input 
                id="profile-username"
                type="text" 
                value={profile.username} 
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                placeholder="Enter username"
                minLength={3}
              />
            </div>

            <div className="profile-info-item">
              <label htmlFor="profile-first-name">First Name</label>
              <input 
                id="profile-first-name"
                type="text" 
                value={profile.first_name} 
                onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                placeholder="Enter first name"
              />
            </div>

            <div className="profile-info-item">
              <label htmlFor="profile-last-name">Last Name</label>
              <input 
                id="profile-last-name"
                type="text" 
                value={profile.last_name} 
                onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                placeholder="Enter last name"
              />
            </div>

            <div className="profile-info-item">
              <label htmlFor="profile-email">Email</label>
              <input 
                id="profile-email"
                type="email" 
                value={profile.email} 
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>

            <div className="profile-info-item">
              <label htmlFor="profile-bio">Bio</label>
              <textarea
                id="profile-bio"
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={4}
                maxLength={500}
              />
              <small>{profile.bio.length}/500 characters</small>
            </div>
          </div>

          <div className="profile-actions">
            <button type="button" className="profile-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="profile-save-btn" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;

