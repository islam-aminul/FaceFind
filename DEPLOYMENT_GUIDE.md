# FaceFind - Complete Deployment Guide

This guide walks you through deploying FaceFind from scratch.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ and npm installed
- **AWS Account** with appropriate permissions
- **AWS CLI** configured with credentials
- **Git** installed
- **System dependencies** for canvas (see below)

## Step 1: Install System Dependencies

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

### macOS
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

### Windows
Follow the [node-canvas installation guide](https://github.com/Automattic/node-canvas/wiki/Installation:-Windows) for Windows-specific instructions.

## Step 2: Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd FaceFind

# Install dependencies
npm install

# Install Amplify dependencies
cd amplify
npm install
cd ..
```

## Step 3: Configure Environment Variables

### Main Application (.env.local)

The `.env.local` file is already created with placeholders. Update the following values:

```bash
# AWS Configuration
AWS_REGION=ap-south-1  # Your AWS region
AWS_ACCESS_KEY_ID=your_actual_access_key
AWS_SECRET_ACCESS_KEY=your_actual_secret_key

# Cognito (will be created by Amplify)
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your_user_pool_id
NEXT_PUBLIC_COGNITO_CLIENT_ID=your_client_id
COGNITO_REGION=ap-south-1

# S3
S3_BUCKET_NAME=facefind-photos  # Will be created by Amplify
S3_REGION=ap-south-1

# DynamoDB
DYNAMODB_REGION=ap-south-1

# Rekognition
REKOGNITION_REGION=ap-south-1

# AiSensy WhatsApp API (Optional - for WhatsApp features)
AISENSY_API_KEY=your_aisensy_api_key  # Get from https://backend.aisensy.com
AISENSY_BASE_URL=https://backend.aisensy.com
AISENSY_CAMPAIGN_OTP=otp_verification
AISENSY_CAMPAIGN_PHOTO_MATCH=photo_match_notification
AISENSY_CAMPAIGN_REMINDER=download_reminder
AISENSY_CAMPAIGN_EVENT_START=event_start_notification

# Google Photos API (Optional - for Google Photos integration)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/photographer/google-photos/callback

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change for production
JWT_SECRET=generate_a_secure_random_string_min_32_chars

# Email (SES)
SES_FROM_EMAIL=noreply@facefind.com  # Verify this email in AWS SES
SES_REGION=ap-south-1

# Environment
NODE_ENV=development
```

### Generate Secure Keys

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 4: AWS SES Setup

1. **Verify Sender Email**:
   - Go to AWS SES Console
   - Click "Verify a New Email Address"
   - Enter your `SES_FROM_EMAIL`
   - Verify via email

2. **Request Production Access** (Optional):
   - By default, SES is in sandbox mode (limited to verified emails)
   - Request production access for sending to any email

## Step 5: AiSensy WhatsApp Setup (Optional)

If you want WhatsApp notifications:

1. Sign up at https://backend.aisensy.com
2. Get your API key from Settings
3. Create these campaigns in AiSensy dashboard:
   - `otp_verification` - For OTP messages
   - `photo_match_notification` - When photos are found
   - `download_reminder` - Reminder before grace period ends
   - `event_start_notification` - When event starts

See `AISENSY_SETUP.md` for detailed instructions.

## Step 6: Google Photos Setup (Optional)

If you want Google Photos integration:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "Photos Library API"
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/v1/photographer/google-photos/callback`
   - For production: `https://yourdomain.com/api/v1/photographer/google-photos/callback`
5. Copy Client ID and Client Secret to `.env.local`

See `GOOGLE_PHOTOS_SETUP.md` for detailed instructions.

## Step 7: Deploy AWS Infrastructure with Amplify

```bash
# Install Amplify CLI globally (if not already installed)
npm install -g @aws-amplify/cli

# Configure Amplify with your AWS credentials
amplify configure

# Initialize and deploy Amplify backend
npx ampx sandbox

# This will create:
# - Cognito User Pool
# - DynamoDB Tables (12 tables)
# - S3 Bucket
# - Lambda Functions (3 functions)
# - EventBridge Rules (2 scheduled tasks)
# - IAM Roles and Policies
```

After deployment completes, update `.env.local` with the generated values:
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- `NEXT_PUBLIC_COGNITO_CLIENT_ID`
- `S3_BUCKET_NAME`

These values will be in `amplify_outputs.json`.

## Step 8: Create Initial Admin User

After Amplify deployment, create an admin user via AWS Cognito Console:

1. Go to AWS Cognito Console
2. Select your User Pool
3. Click "Users" → "Create user"
4. Enter:
   - Username: `admin@facefind.com`
   - Email: `admin@facefind.com`
   - Temporary password: `TempPass@123`
5. Manually create a user record in DynamoDB:

```javascript
// Run this via AWS DynamoDB Console or AWS CLI
{
  "id": "unique-user-id",  // Generate a UUID
  "email": "admin@facefind.com",
  "role": "ADMIN",
  "firstName": "Admin",
  "lastName": "User",
  "status": "ACTIVE",
  "createdAt": "2025-11-05T00:00:00.000Z",
  "updatedAt": "2025-11-05T00:00:00.000Z"
}
```

## Step 9: Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000 and login with:
- Email: `admin@facefind.com`
- Password: `TempPass@123` (you'll be prompted to change it)

## Step 10: Production Deployment

### Option A: Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add all environment variables from `.env.local`
4. Deploy

### Option B: Deploy to AWS with Amplify Hosting

```bash
amplify add hosting
amplify publish
```

### Option C: Self-Hosted with Docker

```bash
# Build production
npm run build

# Start production server
npm start
```

## Post-Deployment Configuration

### 1. Billing Settings

Login as admin and configure billing parameters:
- Navigate to: http://localhost:3000/admin/settings/billing
- Configure:
  - Profit Margin (%)
  - Average Photo Size (MB)
  - Face Scans per Attendee

### 2. System Settings

Configure system-wide settings:
- Navigate to: http://localhost:3000/admin/settings/system
- Set:
  - Application Name
  - Support Email
  - Terms & Privacy URLs

### 3. Security Settings

Configure security parameters:
- Navigate to: http://localhost:3000/admin/settings/security
- Set password policies

### 4. Face Recognition Settings

Configure Rekognition parameters:
- Navigate to: http://localhost:3000/admin/settings/face-recognition
- Set confidence thresholds

## Testing the Application

### Create Test Organizer

1. Login as admin
2. Go to Users → Create User
3. Role: ORGANIZER
4. Fill details and create

### Create Test Event

1. Login as admin
2. Go to Events → Create Event
3. Fill all required fields
4. Select the organizer
5. Generate QR code after creation

### Upload Photos

1. Login as photographer (create one first)
2. Go to assigned event
3. Upload photos via drag-and-drop
4. Photos will be automatically processed by Lambda

### Test Face Recognition

1. Open event landing page (scan QR or visit `/event/[event-id]`)
2. Click "Scan Your Face"
3. Allow camera access
4. Capture photo
5. View matched photos

## Monitoring and Logs

### CloudWatch Logs

Check Lambda function logs in CloudWatch:
- `photo-processor` - Photo processing logs
- `cleanup-grace-period` - Grace period cleanup logs
- `cleanup-retention` - Retention cleanup logs

### DynamoDB

Monitor tables in DynamoDB Console:
- Check item counts
- Review indexes
- Monitor read/write capacity

### S3

Monitor bucket in S3 Console:
- Check storage usage
- Review lifecycle policies
- Monitor costs

## Troubleshooting

### Issue: Photos not processing

**Check:**
1. Lambda function logs in CloudWatch
2. S3 trigger is properly configured
3. Lambda has permissions for Rekognition

### Issue: Face recognition not working

**Check:**
1. Rekognition collection exists (created during event creation)
2. Lambda indexed faces properly (check logs)
3. Confidence threshold is not too high

### Issue: Email notifications not sending

**Check:**
1. SES email is verified
2. SES is not in sandbox mode (or recipient email is verified)
3. Lambda has SES permissions

### Issue: WhatsApp not working

**Check:**
1. AiSensy API key is valid
2. Campaigns are created in AiSensy dashboard
3. Campaign names match exactly

### Issue: Build fails with canvas error

**Check:**
1. System dependencies are installed (cairo, pango, etc.)
2. Node version is 18+
3. Try: `npm rebuild canvas`

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET (32+ chars)
- [ ] Enable MFA for admin accounts
- [ ] Review IAM permissions
- [ ] Enable CloudTrail logging
- [ ] Set up CloudWatch alarms
- [ ] Configure S3 bucket policies
- [ ] Enable DynamoDB backups
- [ ] Use HTTPS in production
- [ ] Verify SES domain (not just email)
- [ ] Review Cognito password policies
- [ ] Enable AWS WAF for API protection

## Cost Optimization

1. **S3 Lifecycle Policies**: Automatically enabled, photos deleted after retention period
2. **DynamoDB On-Demand**: Consider switching to Provisioned if traffic is predictable
3. **Lambda Memory**: Adjust if needed (currently 2GB for photo-processor)
4. **CloudFront**: Enable for S3 to reduce costs and improve performance
5. **Reserved Capacity**: Consider reserved capacity for consistent workloads

## Maintenance

### Daily Tasks (Automated)
- Grace period cleanup (midnight UTC)
- Retention cleanup (1 AM UTC)

### Weekly Tasks
- Review CloudWatch logs
- Check error rates
- Monitor costs

### Monthly Tasks
- Review and update billing parameters
- Check S3 storage usage
- Review security settings
- Update dependencies

## Support and Documentation

- **README.md** - Project overview
- **IMPLEMENTATION_STATUS.md** - Feature completion status
- **AISENSY_SETUP.md** - WhatsApp integration guide
- **GOOGLE_PHOTOS_SETUP.md** - Google Photos integration guide
- **DEPLOYMENT_GUIDE.md** - This file

## Architecture Overview

```
User Request
     ↓
Next.js App (Frontend + API Routes)
     ↓
├── Authentication → Cognito
├── Data → DynamoDB (via Amplify Data API)
├── Storage → S3
│   └── Upload Trigger → Lambda (photo-processor)
│       └── Rekognition (face detection)
├── Face Recognition → Rekognition Collections
├── Email → SES
├── WhatsApp → AiSensy API
└── Scheduled Tasks → EventBridge → Lambda
```

## Backup Strategy

1. **DynamoDB**: Enable Point-in-Time Recovery
2. **S3**: Enable versioning
3. **Cognito**: Export user pool periodically
4. **Code**: Keep in version control (Git)

## Scaling Considerations

- **Next.js**: Deploy to multiple regions via CDN
- **DynamoDB**: Automatically scales with On-Demand
- **Lambda**: Automatically scales, configure concurrency limits
- **S3**: No scaling needed, handles any traffic
- **Rekognition**: No scaling needed, pay per use

---

**Version**: 1.0.0
**Last Updated**: November 5, 2025
**Status**: Production Ready ✅

For issues or questions, contact: support@facefind.com
