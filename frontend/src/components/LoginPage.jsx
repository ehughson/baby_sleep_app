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

  // Generate random username function (matches backend logic)
  const generateRandomUsername = () => {
    const adjectives = ['sleepy', 'cozy', 'dreamy', 'calm', 'gentle', 'peaceful', 'serene', 'tranquil', 'restful', 'quiet'];
    const nouns = ['baby', 'star', 'moon', 'cloud', 'angel', 'bear', 'bunny', 'bird', 'butterfly', 'flower'];
    const number = Math.floor(Math.random() * 1000);
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adjective}_${noun}_${number}`;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      // If username was generated but user edited it, treat it as a custom username
      const shouldUseRandom = useRandomUsername && username && username.match(/^[a-z]+_[a-z]+_\d+$/);
      
      const response = await authService.signup(
        firstName,
        lastName,
        email,
        password,
        username,
        shouldUseRandom,
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
            <h1 className="login-app-name"><span style={{ color: '#fff3d1' }}>REM</span>i</h1>
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
            <h1 className="login-app-name"><span style={{ color: '#fff3d1' }}>REM</span>i</h1>
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
                    name="last-name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    required
                    disabled={isLoading}
                    autoComplete="family-name"
                    data-form-type="other"
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
                  <label 
                    htmlFor="random-username-checkbox" 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      marginBottom: '0.5rem',
                      cursor: 'pointer',
                      fontWeight: 400,
                      fontSize: '0.95rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      id="random-username-checkbox"
                      checked={useRandomUsername}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseRandomUsername(checked);
                        if (checked) {
                          // Generate a random username when checked
                          setUsername(generateRandomUsername());
                        } else {
                          // Clear username when unchecked
                          setUsername('');
                        }
                      }}
                      disabled={isLoading}
                      style={{ margin: 0, width: 'auto', flexShrink: 0 }}
                    />
                    <span style={{ whiteSpace: 'nowrap' }}>Generate random username</span>
                  </label>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      id="signup-username"
                      type="text"
                      value={username}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setUsername(newValue);
                        // If user manually edits the generated username (doesn't match pattern), uncheck random option
                        if (useRandomUsername && !newValue.match(/^[a-z]+_[a-z]+_\d+$/)) {
                          setUseRandomUsername(false);
                        }
                      }}
                      placeholder={useRandomUsername ? "Generated username (you can edit it)" : "Choose a username (min 3 characters)"}
                      required
                      minLength={3}
                      disabled={isLoading}
                      style={{ flex: 1 }}
                    />
                    {useRandomUsername && (
                      <button
                        type="button"
                        onClick={() => setUsername(generateRandomUsername())}
                        disabled={isLoading}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#f0f0f0',
                          border: '2px solid #e0e0e0',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          fontFamily: 'Nunito, sans-serif',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          if (!isLoading) {
                            e.target.style.background = '#e0e0e0';
                            e.target.style.borderColor = '#a68cab';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isLoading) {
                            e.target.style.background = '#f0f0f0';
                            e.target.style.borderColor = '#e0e0e0';
                          }
                        }}
                      >
                        Generate New
                      </button>
                    )}
                  </div>
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
