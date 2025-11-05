import React, { useState } from 'react';
import { authService } from '../api/authService';

const LoginPage = ({ onLoginSuccess }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignup) {
        const response = await authService.signup(username, email, password, rememberMe);
        if (response && response.session_token) {
          // Store session info
          localStorage.setItem('session_token', response.session_token);
          localStorage.setItem('username', response.username);
          localStorage.setItem('user_id', response.user_id);
          if (rememberMe) {
            localStorage.setItem('remember_me', 'true');
          } else {
            localStorage.removeItem('remember_me');
          }
          onLoginSuccess(response);
        } else {
          setError('Invalid response from server');
        }
      } else {
        const response = await authService.login(username, password, rememberMe);
        if (response && response.session_token) {
          // Store session info
          localStorage.setItem('session_token', response.session_token);
          localStorage.setItem('username', response.username);
          localStorage.setItem('user_id', response.user_id);
          if (rememberMe) {
            localStorage.setItem('remember_me', 'true');
          } else {
            localStorage.removeItem('remember_me');
          }
          onLoginSuccess(response);
        } else {
          setError('Invalid response from server');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      const errorMessage = err.message || 'An error occurred. Please try again.';
      setError(errorMessage);
      
      // If it's a connection error, provide more helpful guidance
      if (errorMessage.includes('Unable to connect') || errorMessage.includes('timed out')) {
        console.error('Backend connection issue. Make sure:');
        console.error('1. Backend server is running (cd backend && python app.py)');
        console.error('2. Backend is running on port 5001');
        console.error('3. Check browser console for the API Base URL');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-app-name">REMi</h1>
          <p className="login-tagline">Shaping sleep, one night at a time</p>
        </div>

        <div className="login-form-wrapper">
          <div className="login-tabs">
            <button
              type="button"
              className={`login-tab ${!isSignup ? 'active' : ''}`}
              onClick={() => {
                setIsSignup(false);
                setError('');
              }}
            >
              Login
            </button>
            <button
              type="button"
              className={`login-tab ${isSignup ? 'active' : ''}`}
              onClick={() => {
                setIsSignup(true);
                setError('');
              }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="login-error">{error}</div>
            )}
            
            <div className="form-group">
              <label htmlFor="login-username">Username</label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                minLength={3}
                disabled={isLoading}
                autoFocus
              />
            </div>

            {isSignup && (
              <div className="form-group">
                <label htmlFor="login-email">Email (optional)</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? "At least 6 characters" : "Enter password"}
                required
                minLength={isSignup ? 6 : undefined}
                disabled={isLoading}
              />
            </div>

            {!isSignup && (
              <div className="form-group remember-me">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                  />
                  <span>Remember me</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Please wait...' : (isSignup ? 'Create Account' : 'Login')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

