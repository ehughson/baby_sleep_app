# Email Setup Guide for REMi

This guide will help you set up email functionality to send welcome emails to new users.

## Option 1: SendGrid (Recommended - Free Tier Available)

SendGrid offers a free tier with 100 emails per day, which is perfect for getting started.

### Step 1: Create a SendGrid Account

1. Go to [https://sendgrid.com](https://sendgrid.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Create an API Key

1. Log in to your SendGrid dashboard
2. Go to **Settings** → **API Keys**
3. Click **Create API Key**
4. Give it a name (e.g., "REMi App")
5. Select **Full Access** or **Restricted Access** with Mail Send permissions
6. Click **Create & View**
7. **Copy the API key immediately** - you won't be able to see it again!

### Step 3: Verify Your Sender Email

1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in your information:
   - **From Email Address**: The email you want to send from (e.g., `noreply@yourdomain.com` or `hello@yourdomain.com`)
   - **From Name**: Your name or company name (e.g., "REMi Team")
   - Complete the rest of the form
4. Check your email and click the verification link

### Step 4: Add Environment Variables

Add these to your `.env` file in the `backend` directory:

```env
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=your_verified_email@yourdomain.com
```

**Important**: Make sure `.env` is in your `.gitignore` file (it should already be there).

### Step 5: Install Dependencies

The `sendgrid` package is already added to `requirements.txt`. Install it:

```bash
cd backend
pip install -r requirements.txt
```

Or if using a virtual environment:

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 6: Deploy to Railway/Production

If deploying to Railway or another platform:

1. Add the environment variables in your platform's dashboard:
   - `SENDGRID_API_KEY`: Your SendGrid API key
   - `SENDGRID_FROM_EMAIL`: Your verified sender email

2. Restart your backend service

## Option 2: SMTP (Alternative)

If you prefer to use your own SMTP server (Gmail, Outlook, etc.), you can modify the email function to use SMTP instead of SendGrid. However, this is less recommended for production as:

- Gmail/Outlook have strict sending limits
- Requires app-specific passwords
- Less reliable for production use

## Testing

1. Sign up a new account with a real email address
2. Check the email inbox (and spam folder)
3. You should receive a welcome email with the REMi branding

## Troubleshooting

### Emails not sending?

1. **Check your SendGrid API key**: Make sure it's correctly set in your `.env` file
2. **Verify sender email**: The `SENDGRID_FROM_EMAIL` must be a verified sender in SendGrid
3. **Check SendGrid dashboard**: Go to **Activity** → **Email Activity** to see if emails are being sent
4. **Check backend logs**: Look for error messages about email sending
5. **Free tier limits**: Make sure you haven't exceeded 100 emails/day on the free tier

### Email goes to spam?

1. **Verify your sender domain**: In SendGrid, set up domain authentication instead of single sender
2. **Use a professional email**: Use an email from your own domain (e.g., `noreply@yourdomain.com`)
3. **Warm up your domain**: Start with small volumes and gradually increase

## Email Template

The welcome email includes:
- REMi branding with the yellow "REM" color
- Personalized greeting with the user's first name
- Their username
- Information about app features
- Professional styling matching the app theme

You can customize the email template in the `send_welcome_email()` function in `backend/app.py`.

