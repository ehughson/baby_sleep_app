# Email Setup Complete ✅

Email functionality has been successfully implemented for REMi using **Resend**! This includes:

## Features Implemented

### 1. Email Verification
- New users receive a verification email upon signup
- Email verification token expires after 24 hours
- Users must verify their email to complete registration
- Verification endpoint: `POST /api/auth/verify-email`

### 2. Password Reset
- Users can request a password reset via email
- Reset token expires after 1 hour
- Secure password reset flow with email confirmation
- Endpoint: `POST /api/auth/forgot-password`

## Environment Variables Required

You need to set the following environment variables in your backend:

```bash
# Resend API Key (required)
# Get your API key from https://resend.com/api-keys
RESEND_API_KEY=re_your_api_key_here

# Email address to send from (required)
# This should be a verified domain in Resend
# Format: noreply@yourdomain.com or your-email@yourdomain.com
RESEND_FROM_EMAIL=noreply@remi.app

# Frontend URL (required for email links)
# This is used to generate verification and reset links
FRONTEND_URL=https://your-frontend-url.com
# For local development: http://localhost:3000
```

## Database Changes

The following columns have been added to the `auth_users` table:
- `email_verified` (INTEGER, default 0) - Tracks if email is verified
- `verification_token` (TEXT) - Token for email verification
- `verification_token_expires` (TIMESTAMP) - Expiration time for verification token

## API Endpoints

### Verify Email
```
POST /api/auth/verify-email
Body: { "token": "verification_token_from_email" }
Response: { "message": "Email verified successfully" }
```

### Forgot Password
```
POST /api/auth/forgot-password
Body: { "email": "user@example.com" }
Response: { "message": "If an account with that email exists, a password reset link has been sent." }
```

### Reset Password
```
POST /api/auth/reset-password
Body: { "token": "reset_token_from_email", "password": "new_password" }
Response: { "message": "Password has been reset successfully" }
```

## Email Templates

All emails use the REMi branding with:
- Purple header color (#3a1f35)
- Professional HTML templates
- Clear call-to-action buttons
- Security notices where appropriate

## Next Steps

1. **Set up Resend account** (if not already done):
   - Go to https://resend.com
   - Create a free account (3,000 emails/month free)
   - Generate an API key from https://resend.com/api-keys
   - Add and verify your domain (or use Resend's test domain for development)

2. **Configure environment variables**:
   - Add `RESEND_API_KEY` to your backend environment
   - Add `RESEND_FROM_EMAIL` (must be from a verified domain in Resend)
   - Add `FRONTEND_URL` (your frontend URL)

3. **Install Resend package**:
   ```bash
   pip install resend==2.1.0
   ```
   Or if using requirements.txt:
   ```bash
   pip install -r requirements.txt
   ```

4. **Test the functionality**:
   - Sign up a new user and check for verification email
   - Click the verification link
   - Test password reset flow

5. **Frontend Integration** (if needed):
   - Create email verification page at `/verify-email?token=...`
   - Create password reset page at `/reset-password?token=...`
   - Update signup flow to show "Check your email" message

## Resend Free Tier

- **3,000 emails per month** free
- Perfect for getting started
- No credit card required
- Easy to upgrade when needed

## Security Notes

- Verification tokens expire after 24 hours
- Password reset tokens expire after 1 hour
- Tokens are cryptographically secure (using `secrets.token_urlsafe`)
- Email addresses are not revealed in error messages (security best practice)
- Failed email sends don't block user registration (graceful degradation)

## Troubleshooting

If emails aren't sending:
1. Check that `RESEND_API_KEY` is set correctly (starts with `re_`)
2. Verify `RESEND_FROM_EMAIL` is from a verified domain in Resend
3. Check backend logs for email sending errors
4. Ensure Resend account has sufficient quota (check dashboard)
5. Verify `FRONTEND_URL` is correct for email links
6. For development, you can use Resend's test domain: `onboarding@resend.dev`

