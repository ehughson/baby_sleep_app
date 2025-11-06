import React, { useState, useEffect } from 'react';
import { authService } from '../api/authService';
import { forumService } from '../api/forumService';

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
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProfile();
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
      let profilePictureUrl = profile.profile_picture;
      if (selectedFile) {
        const uploadResult = await authService.uploadProfilePicture(selectedFile);
        profilePictureUrl = uploadResult.profile_picture;
      }

      // Update profile
      const updated = await authService.updateProfile({
        bio: profile.bio,
        profile_picture: profilePictureUrl
      });

      setSuccess('Profile updated successfully!');
      if (onUpdate) {
        onUpdate({
          ...user,
          profile_picture: updated.profile_picture,
          bio: updated.bio
        });
      }
      
      // Clear file selection
      setSelectedFile(null);
      
      // Update preview URL
      if (profilePictureUrl) {
        setPreviewUrl(forumService.getFileUrl(profilePictureUrl));
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
          <button className="profile-close-btn" onClick={onClose}>×</button>
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
            <label className="profile-upload-btn">
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

          <div className="profile-info-section">
            <div className="profile-info-item">
              <label>Username</label>
              <input type="text" value={profile.username} disabled />
            </div>

            <div className="profile-info-item">
              <label>Name</label>
              <input type="text" value={`${profile.first_name || ''} ${profile.last_name || ''}`.trim()} disabled />
            </div>

            <div className="profile-info-item">
              <label>Email</label>
              <input type="email" value={profile.email} disabled />
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

