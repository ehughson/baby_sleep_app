import React, { useState, useEffect } from 'react';
import { authService } from '../api/authService';

const LoginPage = ({ onLoginSuccess }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [signupStep, setSignupStep] = useState(1); // 1 = account, 2 = baby info, 3 = sleep goals
  
  // Signup fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [useRandomUsername, setUseRandomUsername] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Baby profile fields (support multiple babies)
  const [babies, setBabies] = useState([{
    name: '',
    birth_date: '',
    age_months: '',
    sleep_issues: '',
    current_schedule: '',
    notes: ''
  }]);
  
  // Sleep goals fields
  const [goal1, setGoal1] = useState('');
  const [goal2, setGoal2] = useState('');
  const [goal3, setGoal3] = useState('');
  const [goal4, setGoal4] = useState('');
  const [goal5, setGoal5] = useState('');
  
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

  const handleSignupStep1 = (e) => {
    e.preventDefault();
    setError('');
    
    // Validate step 1 fields
    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (!username && !useRandomUsername) {
      setError('Please enter a username or select "Generate random username"');
      return;
    }
    
    // Move to step 2
    setSignupStep(2);
    // Scroll to top
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      const container = document.querySelector('.login-container') || document.querySelector('.login-form-wrapper');
      if (container) {
        container.scrollTop = 0;
      }
    }, 0);
  };

  const handleSignupStep2 = (e) => {
    e.preventDefault();
    setError('');
    
    // Move to step 3 (baby info is optional)
    setSignupStep(3);
    // Scroll to top
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      const container = document.querySelector('.login-container') || document.querySelector('.login-form-wrapper');
      if (container) {
        container.scrollTop = 0;
      }
    }, 0);
  };

  const handleSignupStep3 = async (e) => {
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
        rememberMe,
        babies.filter(baby => baby.name.trim() || baby.birth_date || baby.age_months || baby.sleep_issues || baby.current_schedule || baby.notes).map(baby => ({
          name: baby.name.trim(),
          birth_date: baby.birth_date || null,
          age_months: baby.age_months ? parseInt(baby.age_months) : null,
          sleep_issues: baby.sleep_issues.trim() || null,
          current_schedule: baby.current_schedule.trim() || null,
          notes: baby.notes.trim() || null
        })),
        {
          goal_1: goal1,
          goal_2: goal2,
          goal_3: goal3,
          goal_4: goal4,
          goal_5: goal5
        }
      );
      
      if (response && response.session_token) {
        localStorage.setItem('session_token', response.session_token);
        localStorage.setItem('username', response.username);
        localStorage.setItem('user_id', response.user_id);
        if (response.first_name) {
          localStorage.setItem('first_name', response.first_name);
        }
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

  const handleBack = () => {
    if (signupStep > 1) {
      setSignupStep(signupStep - 1);
      setError('');
    }
  };

  // Scroll to top when signup step changes
  useEffect(() => {
    if (isSignup && signupStep) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        // Also scroll the container if it exists
        const container = document.querySelector('.login-container') || document.querySelector('.login-form-wrapper');
        if (container) {
          container.scrollTop = 0;
        }
      }, 0);
    }
  }, [signupStep, isSignup]);

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
        if (response.first_name) {
          localStorage.setItem('first_name', response.first_name);
        }
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
    setSignupStep(1);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setUsername('');
    setUseRandomUsername(false);
    setRememberMe(false);
    setBabies([{
      name: '',
      birth_date: '',
      age_months: '',
      sleep_issues: '',
      current_schedule: '',
      notes: ''
    }]);
    setGoal1('');
    setGoal2('');
    setGoal3('');
    setGoal4('');
    setGoal5('');
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
            <h1 className="login-app-name"><span style={{ color: '#fff3d1' }}>REM</span>i</h1>
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

          <form 
            onSubmit={
              isSignup 
                ? (signupStep === 1 ? handleSignupStep1 : signupStep === 2 ? handleSignupStep2 : handleSignupStep3)
                : handleLogin
            } 
            className="login-form"
            autoComplete="off"
          >
            {error && <div className="login-error">{error}</div>}
            {success && <div className="login-success">{success}</div>}
            
            {isSignup && signupStep > 1 && (
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isLoading}
                  style={{
                    background: 'transparent',
                    border: '1px solid #a68cab',
                    color: '#a68cab',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  ← Back
                </button>
                <div style={{ flex: 1, textAlign: 'center', fontSize: '0.9rem', color: '#666' }}>
                  Step {signupStep} of 3
                </div>
              </div>
            )}
            
            {isSignup ? (
              signupStep === 1 ? (
                <>
                  {/* Step 1: Account Information */}
                  <h3 style={{ marginBottom: '0.25rem', color: '#a68cab', fontFamily: 'Nunito, sans-serif' }}>Create Your Account</h3>
                  {/* Hidden field to prevent password autofill on name fields */}
                  <input type="password" style={{ display: 'none' }} autoComplete="new-password" tabIndex="-1" />
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
                    autoComplete="off"
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
                    autoComplete="off"
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
                    autoComplete="email"
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
                    autoComplete="new-password"
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
              ) : signupStep === 2 ? (
                <>
                  {/* Step 2: Baby Information */}
                  <h3 style={{ marginBottom: '0.1rem', color: '#a68cab', fontFamily: 'Nunito, sans-serif', lineHeight: '1.2' }}>Baby Information</h3>
                  <p style={{ marginBottom: '0.1rem', color: '#666', fontSize: '0.9rem', lineHeight: '1.3' }}>Tell us about your little one(s) (all fields are optional)</p>
                  
                  {babies.map((baby, index) => (
                    <div key={index} style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#f9f9f9' }}>
                      {babies.length > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h4 style={{ margin: 0, color: '#a68cab', fontFamily: 'Nunito, sans-serif' }}>Baby {index + 1}</h4>
                          {babies.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setBabies(babies.filter((_, i) => i !== index));
                              }}
                              style={{
                                background: '#ff4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.25rem 0.5rem',
                                cursor: 'pointer',
                                fontSize: '0.8rem'
                              }}
                              disabled={isLoading}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                      
                      <div className="form-group">
                        <label htmlFor={`baby-name-${index}`}>Baby's Name</label>
                        <input
                          id={`baby-name-${index}`}
                          type="text"
                          value={baby.name}
                          onChange={(e) => {
                            const newBabies = [...babies];
                            newBabies[index].name = e.target.value;
                            setBabies(newBabies);
                          }}
                          placeholder="Enter baby's name"
                          disabled={isLoading}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`birth-date-${index}`}>Birth Date</label>
                        <input
                          id={`birth-date-${index}`}
                          type="date"
                          value={baby.birth_date}
                          onChange={(e) => {
                            const newBabies = [...babies];
                            newBabies[index].birth_date = e.target.value;
                            setBabies(newBabies);
                          }}
                          disabled={isLoading}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`age-months-${index}`}>Age (in months)</label>
                        <input
                          id={`age-months-${index}`}
                          type="number"
                          min="0"
                          max="60"
                          value={baby.age_months}
                          onChange={(e) => {
                            const newBabies = [...babies];
                            newBabies[index].age_months = e.target.value;
                            setBabies(newBabies);
                          }}
                          placeholder="e.g., 6"
                          disabled={isLoading}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`sleep-issues-${index}`}>Sleep Issues (optional)</label>
                        <textarea
                          id={`sleep-issues-${index}`}
                          value={baby.sleep_issues}
                          onChange={(e) => {
                            const newBabies = [...babies];
                            newBabies[index].sleep_issues = e.target.value;
                            setBabies(newBabies);
                          }}
                          placeholder="Describe any sleep challenges (e.g., night wakings, bedtime resistance)"
                          rows={3}
                          disabled={isLoading}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`current-schedule-${index}`}>Current Sleep Schedule (optional)</label>
                        <textarea
                          id={`current-schedule-${index}`}
                          value={baby.current_schedule}
                          onChange={(e) => {
                            const newBabies = [...babies];
                            newBabies[index].current_schedule = e.target.value;
                            setBabies(newBabies);
                          }}
                          placeholder="Describe current sleep schedule (e.g., naps at 9am and 2pm, bedtime at 7pm)"
                          rows={3}
                          disabled={isLoading}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`baby-notes-${index}`}>Additional Notes (optional)</label>
                        <textarea
                          id={`baby-notes-${index}`}
                          value={baby.notes}
                          onChange={(e) => {
                            const newBabies = [...babies];
                            newBabies[index].notes = e.target.value;
                            setBabies(newBabies);
                          }}
                          placeholder="Any other information about your baby's sleep"
                          rows={3}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => {
                      setBabies([...babies, {
                        name: '',
                        birth_date: '',
                        age_months: '',
                        sleep_issues: '',
                        current_schedule: '',
                        notes: ''
                      }]);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#f0f0f0',
                      border: '2px dashed #a68cab',
                      borderRadius: '8px',
                      color: '#a68cab',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      marginTop: '1rem'
                    }}
                    disabled={isLoading}
                  >
                    + Add Another Baby
                  </button>
                </>
              ) : (
                <>
                  {/* Step 3: Sleep Goals */}
                  <h3 style={{ marginBottom: '0.1rem', color: '#a68cab', fontFamily: 'Nunito, sans-serif', lineHeight: '1.2' }}>Sleep Goals</h3>
                  <p style={{ marginBottom: '0.1rem', color: '#666', fontSize: '0.9rem', lineHeight: '1.3' }}>What are your main sleep goals? (all fields are optional)</p>
                  
                  <div className="form-group">
                    <label htmlFor="goal-1">Sleep Goal 1</label>
                    <textarea
                      id="goal-1"
                      value={goal1}
                      onChange={(e) => setGoal1(e.target.value)}
                      placeholder="e.g., Establish a consistent bedtime routine"
                      rows={2}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="goal-2">Sleep Goal 2</label>
                    <textarea
                      id="goal-2"
                      value={goal2}
                      onChange={(e) => setGoal2(e.target.value)}
                      placeholder="e.g., Reduce night wakings"
                      rows={2}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="goal-3">Sleep Goal 3</label>
                    <textarea
                      id="goal-3"
                      value={goal3}
                      onChange={(e) => setGoal3(e.target.value)}
                      placeholder="e.g., Improve nap duration"
                      rows={2}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="goal-4">Sleep Goal 4</label>
                    <textarea
                      id="goal-4"
                      value={goal4}
                      onChange={(e) => setGoal4(e.target.value)}
                      placeholder="e.g., Help baby fall asleep independently"
                      rows={2}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="goal-5">Sleep Goal 5</label>
                    <textarea
                      id="goal-5"
                      value={goal5}
                      onChange={(e) => setGoal5(e.target.value)}
                      placeholder="e.g., Create a peaceful sleep environment"
                      rows={2}
                      disabled={isLoading}
                    />
                  </div>
                </>
              )
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
              {isLoading 
                ? 'Please wait...' 
                : isSignup 
                  ? (signupStep === 3 ? 'Create Account' : 'Continue')
                  : 'Login'
              }
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
