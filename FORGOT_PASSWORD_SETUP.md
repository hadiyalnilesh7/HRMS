# Forgot Password Feature - Setup Guide

This document provides instructions for setting up and using the forgot password feature in your HRMS application.

## Overview
The forgot password feature allows users to reset their password by receiving a secure email with a password reset link. The link is valid for 1 hour.

## Installation

### 1. Install Dependencies
First, ensure nodemailer is installed:
```bash
npm install nodemailer
```

### 2. Configure Environment Variables
Create or update your `.env` file with email configuration:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### 3. Gmail Setup (Recommended)
If using Gmail:
1. Enable 2-Step Verification in your Google Account
2. Generate an App Password at: https://myaccount.google.com/apppasswords
3. Use this app-specific password in the `EMAIL_PASSWORD` variable

### 4. Other Email Providers
- **Outlook**: Use your Outlook email and password
- **SendGrid**: Use `apikey` as user and your API key as password
- **Other Providers**: Update `EMAIL_HOST` and `EMAIL_PORT` accordingly

## Files Modified/Created

### New Files:
- `src/config/emailConfig.js` - Email configuration and sending logic
- `src/views/forgotPassword.ejs` - Forgot password form
- `src/views/resetPassword.ejs` - Reset password form
- `.env.example` - Example environment variables

### Modified Files:
- `src/models/User.js` - Added `resetToken` and `resetTokenExpires` fields
- `src/controllers/authController.js` - Added forgot password controller functions
- `src/routes/authRoutes.js` - Added forgot password routes
- `src/views/login.ejs` - Added "Forgot Password?" link
- `package.json` - Added nodemailer dependency

## How It Works

### User Flow:
1. User clicks "Forgot Password?" on the login page
2. User enters their email address
3. System sends a password reset link to their email (valid for 1 hour)
4. User clicks the link and enters a new password
5. Password is updated and user can login with the new password

### Security Features:
- Reset tokens are cryptographically secure (crypto.randomBytes)
- Tokens expire after 1 hour
- Tokens can only be used once (deleted after password reset)
- Passwords are hashed with bcrypt before storage

## Routes

- `GET /forgot-password` - Display forgot password form
- `POST /forgot-password` - Process forgot password request
- `GET /reset-password/:token` - Display reset password form
- `POST /reset-password/:token` - Process password reset

## Email Template

The system sends an HTML email with:
- Password reset request notification
- Clickable reset link button
- Manual link URL (as fallback)
- Token expiration warning (1 hour)
- Note about ignoring if user didn't request

## Troubleshooting

### Email Not Sending
1. Check environment variables are set correctly
2. Verify email credentials are valid
3. Check firewall/network allows SMTP connection
4. Look for errors in server logs

### Token Expired
- Reset tokens are only valid for 1 hour
- User needs to request a new reset link if expired

### Gmail Not Working
- Ensure 2-Step Verification is enabled
- Use App Password (not regular password)
- Verify `EMAIL_SECURE=false` for port 587

## Testing

To test the feature:
1. Start your application
2. Go to login page and click "Forgot Password?"
3. Enter your email address
4. Check your email for the reset link
5. Click the link and enter a new password
6. Try logging in with the new password

## Production Considerations

1. Use a dedicated email service (SendGrid, AWS SES, etc.) for better reliability
2. Implement rate limiting on forgot password endpoint
3. Add CAPTCHA to prevent brute force attacks
4. Log password reset attempts for security audits
5. Consider adding email verification before creating account
