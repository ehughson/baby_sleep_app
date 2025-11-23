"""
Security utilities for password validation, input sanitization, and error handling
"""
import re
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Common weak passwords to check against
COMMON_PASSWORDS = [
    'password', '12345678', 'qwerty', 'abc123', 'password123',
    'letmein', 'welcome', 'monkey', '1234567890', 'qwerty123'
]

# Input length limits
MAX_USERNAME_LENGTH = 30
MAX_EMAIL_LENGTH = 255
MAX_MESSAGE_LENGTH = 5000
MAX_POST_LENGTH = 10000
MAX_BIO_LENGTH = 500
MAX_NAME_LENGTH = 50


def validate_password_strength(password):
    """
    Validate password meets security requirements.
    Returns (is_valid, error_message)
    """
    if not password or not isinstance(password, str):
        return False, 'Password is required'
    
    if len(password) < 8:
        return False, 'Password must be at least 8 characters long'
    
    if len(password) > 128:
        return False, 'Password must be less than 128 characters'
    
    # Check for uppercase
    if not re.search(r'[A-Z]', password):
        return False, 'Password must contain at least one uppercase letter'
    
    # Check for lowercase
    if not re.search(r'[a-z]', password):
        return False, 'Password must contain at least one lowercase letter'
    
    # Check for number
    if not re.search(r'[0-9]', password):
        return False, 'Password must contain at least one number'
    
    # Check for special character
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', password):
        return False, 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)'
    
    # Check against common weak passwords
    if password.lower() in COMMON_PASSWORDS:
        return False, 'Password is too common. Please choose a more unique password'
    
    return True, None


def validate_email(email):
    """
    Validate email format.
    Returns (is_valid, error_message)
    """
    if not email or not isinstance(email, str):
        return False, 'Email is required'
    
    email = email.strip()
    
    if len(email) > MAX_EMAIL_LENGTH:
        return False, f'Email must be less than {MAX_EMAIL_LENGTH} characters'
    
    # Basic email regex
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        return False, 'Please enter a valid email address'
    
    return True, None


def validate_username(username):
    """
    Validate username format and length.
    Returns (is_valid, error_message)
    """
    if not username or not isinstance(username, str):
        return False, 'Username is required'
    
    username = username.strip()
    
    if len(username) < 3:
        return False, 'Username must be at least 3 characters long'
    
    if len(username) > MAX_USERNAME_LENGTH:
        return False, f'Username must be less than {MAX_USERNAME_LENGTH} characters'
    
    # Only alphanumeric, underscore, and hyphen
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        return False, 'Username can only contain letters, numbers, underscores, and hyphens'
    
    return True, None


def validate_name(name, field_name='Name'):
    """
    Validate name fields (first name, last name).
    Returns (is_valid, error_message)
    """
    if not name or not isinstance(name, str):
        return False, f'{field_name} is required'
    
    name = name.strip()
    
    if len(name) < 1:
        return False, f'{field_name} cannot be empty'
    
    if len(name) > MAX_NAME_LENGTH:
        return False, f'{field_name} must be less than {MAX_NAME_LENGTH} characters'
    
    # Allow letters, spaces, hyphens, and apostrophes
    if not re.match(r"^[a-zA-Z\s'-]+$", name):
        return False, f'{field_name} can only contain letters, spaces, hyphens, and apostrophes'
    
    return True, None


def validate_input_length(value, max_length, field_name):
    """
    Validate input length.
    Returns (is_valid, error_message)
    """
    if value is None:
        return True, None
    
    if not isinstance(value, str):
        value = str(value)
    
    if len(value) > max_length:
        return False, f'{field_name} must be less than {max_length} characters'
    
    return True, None


def handle_error(error, generic_message="An error occurred", status_code=500):
    """
    Handle errors securely - don't leak information in production.
    Returns Flask response tuple.
    """
    from flask import jsonify
    
    # Log error details server-side only
    logger.error(f"{generic_message}: {type(error).__name__}", exc_info=True)
    
    # In production, return generic message
    if os.getenv('FLASK_ENV') == 'production' or os.getenv('ENVIRONMENT') == 'production':
        return jsonify({'error': generic_message}), status_code
    else:
        # In development, show details for debugging
        return jsonify({'error': f'{generic_message}: {str(error)}'}), status_code


def sanitize_log_message(message, sensitive_fields=None):
    """
    Sanitize log messages to remove sensitive data.
    """
    if sensitive_fields is None:
        sensitive_fields = ['password', 'token', 'session_token', 'reset_token', 'verification_token']
    
    sanitized = message
    for field in sensitive_fields:
        # Replace patterns like "password: 'xxx'" or "password=xxx"
        patterns = [
            rf"{field}\s*[:=]\s*['\"]?[^'\"]+['\"]?",
            rf"{field}\s*:\s*[^\s]+",
        ]
        for pattern in patterns:
            sanitized = re.sub(pattern, f"{field}: [REDACTED]", sanitized, flags=re.IGNORECASE)
    
    return sanitized


def safe_log(level, message, *args, **kwargs):
    """
    Safe logging that redacts sensitive information.
    """
    sanitized_message = sanitize_log_message(str(message))
    if level == 'info':
        logger.info(sanitized_message, *args, **kwargs)
    elif level == 'error':
        logger.error(sanitized_message, *args, **kwargs)
    elif level == 'warning':
        logger.warning(sanitized_message, *args, **kwargs)
    elif level == 'debug':
        logger.debug(sanitized_message, *args, **kwargs)
    else:
        logger.info(sanitized_message, *args, **kwargs)

