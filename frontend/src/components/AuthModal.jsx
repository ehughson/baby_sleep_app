import React, { useState } from 'react';
import { authService } from '../api/authService';
import MinimalIcon from './icons/MinimalIcon.jsx';

const AuthModal = ({ onClose, onSuccess, mode = 'login' }) => {
  const [isSignup, setIsSignup] = useState(mode === 'signup');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignup) {
        const response = await authService.signup(username, email, password);
        localStorage.setItem('session_token', response.session_token);
        localStorage.setItem('username', response.username);
        onSuccess(response);
      } else {
        const response = await authService.login(username, password);
        localStorage.setItem('session_token', response.session_token);
        localStorage.setItem('username', response.username);
        onSuccess(response);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-auth" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isSignup ? 'Create Account' : 'Login'}</h2>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close">
          <MinimalIcon name="close" size={16} />
        </button>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error">{error}</div>
          )}
          
          <div className="form-group">
            <label htmlFor="auth-username">Username</label>
            <input
              id="auth-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              minLength={3}
              disabled={isLoading}
            />
          </div>

          {isSignup && (
            <div className="form-group">
              <label htmlFor="auth-email">Email (optional)</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                disabled={isLoading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? "At least 6 characters" : "Enter password"}
              required
              minLength={isSignup ? 6 : undefined}
              disabled={isLoading}
            />
          </div>

          <div className="auth-toggle">
            {isSignup ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => setIsSignup(false)}
                  disabled={isLoading}
                >
                  Login
                </button>
              </span>
            ) : (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => setIsSignup(true)}
                  disabled={isLoading}
                >
                  Sign Up
                </button>
              </span>
            )}
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Please wait...' : (isSignup ? 'Create Account' : 'Login')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;

