import React, { useState } from 'react';
import { authService } from '../api/authService';

const LoginPage = ({ onLoginSuccess }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  
  // Signup fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [useRandomUsername, setUseRandomUsername] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Login fields
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRememberMe, setLoginRememberMe] = useState(false);
  
  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await authService.signup(
        firstName,
        lastName,
        email,
        password,
        username,
        useRandomUsername,
        rememberMe
      );
      
      if (response && response.session_token) {
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
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await authService.login(loginUsername, loginPassword, loginRememberMe);
      
      if (response && response.session_token) {
        localStorage.setItem('session_token', response.session_token);
        localStorage.setItem('username', response.username);
        localStorage.setItem('user_id', response.user_id);
        if (loginRememberMe) {
          localStorage.setItem('remember_me', 'true');
        } else {
          localStorage.removeItem('remember_me');
        }
        onLoginSuccess(response);
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await authService.forgotPassword(forgotEmail);
      setSuccess(response.message || 'Password reset instructions have been sent to your email.');
      
      // In development, show the token (remove in production)
      if (response.reset_token) {
        setSuccess(`Password reset token: ${response.reset_token} (Check console for details)`);
        console.log('Reset token:', response.reset_token);
      }
      
      // Show reset password form
      setShowForgotPassword(false);
      setShowResetPassword(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.message || 'Failed to process password reset request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.resetPassword(resetToken, newPassword);
      setSuccess(response.message || 'Password has been reset successfully. You can now login.');
      setShowResetPassword(false);
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setError('');
    setSuccess('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setUsername('');
    setUseRandomUsername(false);
    setRememberMe(false);
    setLoginUsername('');
    setLoginPassword('');
    setLoginRememberMe(false);
    setForgotEmail('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
  };

  if (showResetPassword) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <h1 className="login-app-name">REMi</h1>
            <p className="login-tagline">Reset Your Password</p>
          </div>

          <div className="login-form-wrapper">
            <form onSubmit={handleResetPassword} className="login-form">
              {error && <div className="login-error">{error}</div>}
              {success && <div className="login-success">{success}</div>}
              
              <div className="form-group">
                <label htmlFor="reset-token">Reset Token</label>
                <input
                  id="reset-token"
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Enter reset token from email"
                  required
                  disabled={isLoading}
                />
                <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  Check your email or console for the reset token
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                className="login-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>

              <button
                type="button"
                className="login-link-btn"
                onClick={() => {
                  setShowResetPassword(false);
                  resetForm();
                }}
                disabled={isLoading}
              >
                Back to Login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <h1 className="login-app-name">REMi</h1>
            <p className="login-tagline">Forgot Password</p>
          </div>

          <div className="login-form-wrapper">
            <form onSubmit={handleForgotPassword} className="login-form">
              {error && <div className="login-error">{error}</div>}
              {success && <div className="login-success">{success}</div>}
              
              <div className="form-group">
                <label htmlFor="forgot-email">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="login-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <button
                type="button"
                className="login-link-btn"
                onClick={() => {
                  setShowForgotPassword(false);
                  resetForm();
                }}
                disabled={isLoading}
              >
                Back to Login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

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
                resetForm();
              }}
            >
              Login
            </button>
            <button
              type="button"
              className={`login-tab ${isSignup ? 'active' : ''}`}
              onClick={() => {
                setIsSignup(true);
                resetForm();
              }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={isSignup ? handleSignup : handleLogin} className="login-form">
            {error && <div className="login-error">{error}</div>}
            {success && <div className="login-success">{success}</div>}
            
            {isSignup ? (
              <>
                <div className="form-group">
                  <label htmlFor="first-name">First Name</label>
                  <input
                    id="first-name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="last-name">Last Name</label>
                  <input
                    id="last-name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="signup-email">Email</label>
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="signup-password">Password</label>
                  <input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={useRandomUsername}
                      onChange={(e) => {
                        setUseRandomUsername(e.target.checked);
                        if (e.target.checked) {
                          setUsername('');
                        }
                      }}
                      disabled={isLoading}
                    />
                    <span>Generate random username</span>
                  </label>
                  
                  {!useRandomUsername && (
                    <input
                      id="signup-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username (min 3 characters)"
                      required={!useRandomUsername}
                      minLength={3}
                      disabled={isLoading}
                    />
                  )}
                </div>

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
              </>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="login-username">Username</label>
                  <input
                    id="login-username"
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Enter username"
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group remember-me">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={loginRememberMe}
                      onChange={(e) => setLoginRememberMe(e.target.checked)}
                      disabled={isLoading}
                    />
                    <span>Remember me</span>
                  </label>
                </div>
              </>
            )}

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Please wait...' : (isSignup ? 'Create Account' : 'Login')}
            </button>

            {!isSignup && (
              <button
                type="button"
                className="login-link-btn"
                onClick={() => setShowForgotPassword(true)}
                disabled={isLoading}
              >
                Forgot Password?
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
