import React, { useState, useEffect } from 'react';
import { authService } from '../api/authService';
import { forumService } from '../api/forumService';

const UserProfile = ({ username, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (username) {
      loadProfile();
    }
  }, [username]);

  const loadProfile = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await authService.getUserProfile(username);
      setProfile(data);
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Profile</h2>
            <button className="modal-close-btn" onClick={onClose}>×</button>
          </div>
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading profile...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Profile</h2>
            <button className="modal-close-btn" onClick={onClose}>×</button>
          </div>
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ff4444' }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Profile</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="profile-view-content" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '50%', 
              overflow: 'hidden',
              marginBottom: '1rem',
              border: '3px solid #a68cab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f0f0f0',
              fontSize: '3rem',
              fontWeight: 'bold',
              color: '#a68cab'
            }}>
              {profile.profile_picture ? (
                <img 
                  src={forumService.getFileUrl(profile.profile_picture)} 
                  alt={profile.username}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.textContent = profile.username?.charAt(0).toUpperCase() || '?';
                  }}
                />
              ) : (
                profile.username?.charAt(0).toUpperCase() || '?'
              )}
            </div>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#333', fontFamily: 'Nunito, sans-serif' }}>
              {profile.username}
            </h3>
          </div>

          {profile.bio && (
            <div style={{ 
              padding: '1.5rem', 
              background: '#f8f8f8', 
              borderRadius: '12px',
              marginTop: '1rem'
            }}>
              <h4 style={{ 
                margin: '0 0 0.75rem 0', 
                fontSize: '1rem', 
                color: '#666',
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 600
              }}>
                Bio
              </h4>
              <p style={{ 
                margin: 0, 
                color: '#333', 
                lineHeight: '1.6',
                fontFamily: 'Nunito, sans-serif',
                whiteSpace: 'pre-wrap'
              }}>
                {profile.bio}
              </p>
            </div>
          )}

          {!profile.bio && (
            <div style={{ 
              padding: '1.5rem', 
              textAlign: 'center',
              color: '#999',
              fontStyle: 'italic'
            }}>
              No bio available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;

