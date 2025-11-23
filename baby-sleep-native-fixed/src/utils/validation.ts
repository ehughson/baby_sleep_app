/**
 * Input validation and sanitization utilities
 */

/**
 * Sanitize string input - removes potentially dangerous characters
 */
export const sanitizeString = (input: string, maxLength: number = 10000): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove null bytes and control characters (except newlines and tabs for text content)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
};

/**
 * Sanitize username - alphanumeric, underscore, hyphen only
 */
export const sanitizeUsername = (username: string): string => {
  if (!username || typeof username !== 'string') {
    return '';
  }

  // Remove all non-alphanumeric characters except underscore and hyphen
  return username.trim().replace(/[^a-zA-Z0-9_-]/g, '');
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate password strength
 * Returns object with isValid flag and array of error messages
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' = 'weak';

  if (!password || typeof password !== 'string') {
    return { isValid: false, errors: ['Password is required'], strength: 'weak' };
  }

  // Minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else if (password.length < 12) {
    // Encourage longer passwords but don't require it
  }

  // Check for uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common weak passwords
  const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('Password is too common. Please choose a more unique password');
  }

  // Determine strength
  if (errors.length === 0) {
    if (password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      strength = 'strong';
    } else {
      strength = 'medium';
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
};

/**
 * Validate and sanitize message content
 */
export const sanitizeMessage = (message: string, maxLength: number = 5000): string => {
  return sanitizeString(message, maxLength);
};

/**
 * Validate and sanitize forum post content
 */
export const sanitizePostContent = (content: string, maxLength: number = 10000): string => {
  return sanitizeString(content, maxLength);
};

/**
 * Validate username format and length
 */
export const validateUsername = (username: string): { isValid: boolean; error?: string } => {
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

  // Only alphanumeric, underscore, and hyphen
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }

  return { isValid: true };
};

/**
 * Validate name fields (first name, last name)
 */
export const validateName = (name: string, fieldName: string = 'Name'): { isValid: boolean; error?: string } => {
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

  // Allow letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    return { isValid: false, error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
  }

  return { isValid: true };
};

