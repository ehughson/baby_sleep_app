/**
 * Input validation utilities to match backend requirements
 */

/**
 * Validate password strength - matches backend security_utils.py
 * Returns { isValid: boolean, error: string }
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password must be less than 128 characters' };
  }

  // Check for uppercase
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }

  // Check for lowercase
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)' };
  }

  // Check against common weak passwords
  const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123', 'letmein', 'welcome', 'monkey', '1234567890', 'qwerty123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    return { isValid: false, error: 'Password is too common. Please choose a more unique password' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate email format - matches backend
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmed = email.trim();

  if (trimmed.length > 255) {
    return { isValid: false, error: 'Email must be less than 255 characters' };
  }

  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!pattern.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate username - matches backend
 */
export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();

  if (trimmed.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }

  if (trimmed.length > 30) {
    return { isValid: false, error: 'Username must be less than 30 characters' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate name fields - matches backend
 */
export const validateName = (name, fieldName = 'Name') => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const trimmed = name.trim();

  if (trimmed.length < 1) {
    return { isValid: false, error: `${fieldName} cannot be empty` };
  }

  if (trimmed.length > 50) {
    return { isValid: false, error: `${fieldName} must be less than 50 characters` };
  }

  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    return { isValid: false, error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
  }

  return { isValid: true, error: null };
};

