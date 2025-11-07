import React, { useState, useEffect, useRef } from 'react';
import { authService } from '../api/authService';

const PROFANITY_LIST = [
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'asshole',
  'bastard',
  'dick',
  'damn',
  'slut',
  'whore',
  'nigger',
  'spic',
  'kike',
  'faggot',
  'hitler',
  'nazi',
  'retard'
];

const MAX_BABY_AGE_MONTHS = 60;

const containsBannedWord = (value) => {
  if (!value) return false;
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return PROFANITY_LIST.some((word) => normalized.includes(word));
};

const getDaysInMonth = (year, month) => {
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
};

const parseBirthDateParts = (birthDate) => {
  if (!birthDate) {
    return { year: '', month: '', day: '' };
  }
  const [year, month, day] = birthDate.split('-');
  return {
    year: year ? parseInt(year, 10) : '',
    month: month ? parseInt(month, 10) : '',
    day: day ? parseInt(day, 10) : ''
  };
};

const formatBirthDateParts = (year, month, day) => {
  if (!year || !month || !day) {
    return '';
  }
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);

  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
    return '';
  }

  return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
};

const calculateAgeInMonths = (birthDateStr) => {
  if (!birthDateStr) return null;
  const [year, month, day] = birthDateStr.split('-').map((part) => parseInt(part, 10));
  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null;
  }
  const birthDate = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  if (birthDate > todayUtc) {
    return -1;
  }

  let months =
    (todayUtc.getUTCFullYear() - birthDate.getUTCFullYear()) * 12 +
    (todayUtc.getUTCMonth() - birthDate.getUTCMonth());

  if (todayUtc.getUTCDate() < birthDate.getUTCDate()) {
    months -= 1;
  }

  return months;
};


const LoginPage = ({ onLoginSuccess }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [signupStep, setSignupStep] = useState(1); // 1 = account, 2 = baby info, 3 = sleep goals
  const formWrapperRef = useRef(null);
  
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
    sleep_issues: '',
    current_schedule: '',
    notes: ''
  }]);
  
  // Sleep goals fields
  const [goal1, setGoal1] = useState('');
  const [goal2, setGoal2] = useState('');
  const [goal3, setGoal3] = useState('');

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: Math.floor(MAX_BABY_AGE_MONTHS / 12) + 1 }, (_, idx) => currentYear - idx);
  const monthOptions = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

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

  const validateBabyEntries = () => {
    for (const baby of babies) {
      const trimmedName = (baby.name || '').trim();
      if (trimmedName && containsBannedWord(trimmedName)) {
        setError('Baby names cannot include inappropriate language.');
        return false;
      }

      const birthDateCandidate = baby.birth_date || (baby.birth_year && baby.birth_month && baby.birth_day
        ? formatBirthDateParts(parseInt(baby.birth_year, 10), parseInt(baby.birth_month, 10), parseInt(baby.birth_day, 10))
        : '');

      if (birthDateCandidate) {
        const ageMonths = calculateAgeInMonths(birthDateCandidate);
        if (ageMonths === null) {
          setError('Please select a valid birth date for your baby.');
          return false;
        }
        if (ageMonths < 0) {
          setError('Birth date cannot be in the future.');
          return false;
        }
        if (ageMonths > MAX_BABY_AGE_MONTHS) {
          setError('Baby age must be 5 years old or younger.');
          return false;
        }
      }
    }

    return true;
  };

  const handleBirthDatePartChange = (babyIndex, part, rawValue) => {
    const newBabies = [...babies];
    const baby = { ...newBabies[babyIndex] };

    const existingParts = parseBirthDateParts(baby.birth_date);
    let birthYear = (baby.birth_year ?? '').toString();
    let birthMonth = (baby.birth_month ?? '').toString();
    let birthDay = (baby.birth_day ?? '').toString();

    if (!birthYear && existingParts.year) {
      birthYear = existingParts.year.toString();
    }
    if (!birthMonth && existingParts.month) {
      birthMonth = existingParts.month.toString().padStart(2, '0');
    }
    if (!birthDay && existingParts.day) {
      birthDay = existingParts.day.toString().padStart(2, '0');
    }

    const value = rawValue ? rawValue.toString() : '';

    if (part === 'year') {
      birthYear = value.replace(/[^0-9]/g, '').slice(0, 4);
    } else if (part === 'month') {
      birthMonth = value ? value.toString().padStart(2, '0') : '';
    } else if (part === 'day') {
      birthDay = value ? value.toString().padStart(2, '0') : '';
    }

    const yearNum = birthYear ? parseInt(birthYear, 10) : null;
    const monthNum = birthMonth ? parseInt(birthMonth, 10) : null;

    if (yearNum && monthNum) {
      const maxDay = getDaysInMonth(yearNum, monthNum);
      if (birthDay) {
        let dayNum = parseInt(birthDay, 10);
        if (Number.isNaN(dayNum)) {
          dayNum = 1;
        }
        if (dayNum > maxDay) {
          dayNum = maxDay;
        }
        birthDay = dayNum.toString().padStart(2, '0');
      }
    } else if (part === 'month') {
      birthDay = '';
    }

    baby.birth_year = birthYear;
    baby.birth_month = birthMonth;
    baby.birth_day = birthDay;

    if (yearNum && monthNum && birthDay) {
      const dayNum = parseInt(birthDay, 10);
      if (!Number.isNaN(dayNum)) {
        baby.birth_date = formatBirthDateParts(yearNum, monthNum, dayNum);
      } else {
        baby.birth_date = '';
      }
    } else {
      baby.birth_date = '';
    }

    newBabies[babyIndex] = baby;
    setBabies(newBabies);
  };

  const handleSignupStep1 = (e) => {
    e.preventDefault();
    setError('');
    
    // Validate step 1 fields
    if (!firstName.trim() || !lastName.trim() || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (containsBannedWord(firstName.trim()) || containsBannedWord(lastName.trim())) {
      setError('Please use respectful language in your name.');
      return;
    }

    if (!username && !useRandomUsername) {
      setError('Please enter a username or select "Generate random username"');
      return;
    }

    // Move to step 2
    setSignupStep(2);
    // Scroll to top after render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        if (formWrapperRef.current) {
          formWrapperRef.current.scrollTop = 0;
        }
        const container = document.querySelector('.login-container');
        if (container) {
          container.scrollTop = 0;
        }
      });
    });
  };

  const handleSignupStep2 = (e) => {
    e.preventDefault();
    setError('');

    if (!validateBabyEntries()) {
      return;
    }

    // Move to step 3 (baby info is optional)
    setSignupStep(3);
    // Scroll to top after render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        if (formWrapperRef.current) {
          formWrapperRef.current.scrollTop = 0;
        }
        const container = document.querySelector('.login-container');
        if (container) {
          container.scrollTop = 0;
        }
      });
    });
  };

  const handleSignupStep3 = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (containsBannedWord(firstName.trim()) || containsBannedWord(lastName.trim())) {
      setError('Please use respectful language in your name.');
      return;
    }

    if (!validateBabyEntries()) {
      return;
    }

    setIsLoading(true);

    try {
      // If username was generated but user edited it, treat it as a custom username
      const shouldUseRandom = useRandomUsername && username && username.match(/^[a-z]+_[a-z]+_\d+$/);
      
      const response = await authService.signup(
        firstName.trim(),
        lastName.trim(),
        email,
        password,
        username,
        shouldUseRandom,
        rememberMe,
        babies
          .filter((baby) => baby.name.trim() || baby.birth_date || baby.sleep_issues || baby.current_schedule || baby.notes)
          .map((baby) => {
            const trimmedName = baby.name.trim();
            const birthDateCandidate = baby.birth_date || (baby.birth_year && baby.birth_month && baby.birth_day
              ? formatBirthDateParts(parseInt(baby.birth_year, 10), parseInt(baby.birth_month, 10), parseInt(baby.birth_day, 10))
              : null);
            const birthDate = birthDateCandidate || null;
            const ageMonths = birthDate ? calculateAgeInMonths(birthDate) : null;

            return {
              name: trimmedName,
              birth_date: birthDate,
              age_months: birthDate && ageMonths !== null && ageMonths >= 0 ? ageMonths : null,
              sleep_issues: baby.sleep_issues.trim() || null,
              current_schedule: baby.current_schedule.trim() || null,
              notes: baby.notes.trim() || null
            };
          }),
        {
          goal_1: goal1,
          goal_2: goal2,
          goal_3: goal3
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
      const errorMessage = err.message || 'An error occurred. Please try again.';
      setError(errorMessage);
      
      // If email is already registered, suggest logging in
      if (errorMessage.includes('Email already registered')) {
        setTimeout(() => {
          if (window.confirm('This email is already registered. Would you like to go to the login page instead?')) {
            setIsSignup(false);
            setError('');
          }
        }, 100);
      }
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
      // Use double requestAnimationFrame to ensure DOM has fully updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: 'instant' });
          if (formWrapperRef.current) {
            formWrapperRef.current.scrollTop = 0;
          }
          const container = document.querySelector('.login-container');
          if (container) {
            container.scrollTop = 0;
          }
        });
      });
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
        if (response.profile_picture) {
          localStorage.setItem('profile_picture', response.profile_picture);
        }
        if (response.bio !== undefined) {
          localStorage.setItem('bio', response.bio || '');
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
      birth_year: '',
      birth_month: '',
      birth_day: '',
      sleep_issues: '',
      current_schedule: '',
      notes: ''
    }]);
    setGoal1('');
    setGoal2('');
    setGoal3('');
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
            <h1 className="login-app-name"><span style={{ color: '#fff3d1' }}>REM</span>-i</h1>
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
            <h1 className="login-app-name"><span style={{ color: '#fff3d1' }}>REM</span>-i</h1>
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
            <h1 className="login-app-name"><span style={{ color: '#fff3d1' }}>REM</span>-i</h1>
            <p className="login-tagline">Shaping sleep, one night at a time</p>
          </div>

        <div className="login-form-wrapper" ref={formWrapperRef}>
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

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                  <label 
                    htmlFor="random-username-checkbox" 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem', 
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
                  
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                  
                  {babies.map((baby, index) => {
                    const parsedFromDate = parseBirthDateParts(baby.birth_date);
                    const birthYear = (baby.birth_year || (parsedFromDate.year ? parsedFromDate.year.toString() : '')).toString();
                    const birthMonth = (baby.birth_month || (parsedFromDate.month ? parsedFromDate.month.toString().padStart(2, '0') : '')).toString();
                    const birthDay = (baby.birth_day || (parsedFromDate.day ? parsedFromDate.day.toString().padStart(2, '0') : '')).toString();
                    const numericYear = birthYear ? parseInt(birthYear, 10) : null;
                    const numericMonth = birthMonth ? parseInt(birthMonth, 10) : null;
                    const daysInMonth = numericYear && numericMonth ? getDaysInMonth(numericYear, numericMonth) : 31;
                    const dayOptions = Array.from({ length: daysInMonth }, (_, dayIndex) => (dayIndex + 1).toString().padStart(2, '0'));
                    const disableDaySelect = !birthYear || !birthMonth;
                    const selectedYear = birthYear;
                    const selectedMonth = birthMonth;
                    const selectedDay = disableDaySelect ? '' : birthDay;

                    return (
                      <div key={index} style={{ marginBottom: '1.75rem', padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#f9f9f9', display: 'grid', gap: '1.25rem' }}>
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
                        <div className="birthdate-selects">
                          <select
                            id={`birth-month-${index}`}
                            value={selectedMonth}
                            onChange={(e) => handleBirthDatePartChange(index, 'month', e.target.value)}
                            disabled={isLoading}
                          >
                            <option value="">Month</option>
                            {monthOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <select
                            id={`birth-day-${index}`}
                            value={selectedDay}
                            onChange={(e) => handleBirthDatePartChange(index, 'day', e.target.value)}
                            disabled={isLoading || disableDaySelect}
                          >
                            <option value="">Day</option>
                            {dayOptions.map((dayOption) => (
                              <option key={dayOption} value={dayOption}>
                                {parseInt(dayOption, 10)}
                              </option>
                            ))}
                          </select>
                          <select
                            id={`birth-year-${index}`}
                            value={selectedYear}
                            onChange={(e) => handleBirthDatePartChange(index, 'year', e.target.value)}
                            disabled={isLoading}
                          >
                            <option value="">Year</option>
                            {yearOptions.map((yearOption) => (
                              <option key={yearOption} value={yearOption}>
                                {yearOption}
                              </option>
                            ))}
                          </select>
                        </div>
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
                    );
                  })}
                  
                  <button
                    type="button"
                    onClick={() => {
                      setBabies([...babies, {
                        name: '',
                        birth_date: '',
                        birth_year: '',
                        birth_month: '',
                        birth_day: '',
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
                      marginTop: '0.75rem'
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
