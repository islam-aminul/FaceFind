# FaceFind - Quick Start Guide

Get FaceFind running in 15 minutes (basic setup without optional integrations).

## Prerequisites
- Node.js 18+
- AWS Account
- AWS CLI configured

## Quick Setup

### 1. System Dependencies (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

### 2. Install Dependencies
```bash
npm install
cd amplify && npm install && cd ..
```

### 3. Configure Environment

The `.env.local` file already exists. Update these critical values:

```bash
# AWS (use your credentials)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your_secure_random_string_32_chars_min

# SES (verify this email in AWS SES first)
SES_FROM_EMAIL=noreply@yourdomain.com

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Verify SES Email
```bash
# In AWS Console:
# SES → Email Addresses → Verify a New Email Address
# Enter your SES_FROM_EMAIL and verify via email
```

### 5. Deploy AWS Infrastructure
```bash
npx ampx sandbox
```

Wait for deployment to complete (5-10 minutes). This creates:
- Cognito User Pool
- DynamoDB Tables
- S3 Bucket
- Lambda Functions
- EventBridge Rules

### 6. Update .env.local with Amplify Outputs

After deployment, update these values from `amplify_outputs.json`:
```bash
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<from amplify_outputs.json>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<from amplify_outputs.json>
S3_BUCKET_NAME=<from amplify_outputs.json>
```

### 7. Create Admin User

**In AWS Cognito Console:**
1. Go to your User Pool
2. Users → Create user
3. Username: `admin@facefind.com`
4. Email: `admin@facefind.com`
5. Temporary password: `TempPass@123`

**In DynamoDB Console:**
1. Go to the User table
2. Create item with:
```json
{
  "id": "admin-user-id",
  "email": "admin@facefind.com",
  "role": "ADMIN",
  "firstName": "Admin",
  "lastName": "User",
  "status": "ACTIVE",
  "createdAt": "2025-11-05T00:00:00.000Z",
  "updatedAt": "2025-11-05T00:00:00.000Z"
}
```

### 8. Start Development Server
```bash
npm run dev
```

### 9. Login and Configure

Visit http://localhost:3000/login

Login with:
- Email: `admin@facefind.com`
- Password: `TempPass@123`

You'll be prompted to change your password.

### 10. Initial Configuration

**Configure Billing (Required):**
1. Go to Settings → Billing
2. Set Profit Margin, Photo Size, Face Scans
3. Save

**Configure System (Optional):**
1. Go to Settings → System
2. Set App Name, Support Email, etc.

## Quick Test

### Create an Event
1. Users → Create User (Organizer)
2. Events → Create Event
3. Fill details, select organizer
4. Generate QR code

### Test as Attendee
1. Open `/event/[event-id]`
2. Click "Scan Your Face"
3. Allow camera
4. Take photo

## Optional Integrations

### WhatsApp (AiSensy)
See `AISENSY_SETUP.md`

### Google Photos
See `GOOGLE_PHOTOS_SETUP.md`

## Common Issues

**Issue: Canvas build error**
```bash
# Install system dependencies first (Step 1)
npm rebuild canvas
```

**Issue: Amplify deployment fails**
```bash
# Check AWS credentials
aws sts get-caller-identity

# Try again
npx ampx sandbox --once
```

**Issue: Can't login**
- Verify Cognito user exists
- Verify DynamoDB User record exists
- Check console for errors

## Next Steps

1. Read `DEPLOYMENT_GUIDE.md` for production deployment
2. Review `IMPLEMENTATION_STATUS.md` for features
3. Check `README.md` for architecture

## Production Checklist

Before going to production:
- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET
- [ ] Verify SES domain (not just email)
- [ ] Enable MFA for admin
- [ ] Set up CloudWatch alarms
- [ ] Enable DynamoDB backups
- [ ] Configure S3 lifecycle policies
- [ ] Review IAM permissions
- [ ] Enable CloudTrail
- [ ] Set up monitoring
- [ ] Test disaster recovery

## Architecture Summary

```
Frontend (Next.js)
    ↓
API Routes
    ↓
├── Cognito (Auth)
├── DynamoDB (Data via Amplify)
├── S3 (Storage)
│   └── Lambda Trigger (photo-processor)
├── Rekognition (Face Detection)
├── SES (Email)
└── EventBridge (Scheduled Tasks)
```

## Key URLs (After Login)

- **Admin Dashboard**: `/admin`
- **Create Event**: `/admin/events/create`
- **Create User**: `/admin/users/create`
- **Billing Settings**: `/admin/settings/billing`
- **Event Landing**: `/event/[event-id]`

## Support

- Documentation: See `DEPLOYMENT_GUIDE.md`
- Issues: Check `IMPLEMENTATION_STATUS.md`
- Email: support@facefind.com

---

**Quick Start Complete!** 🎉

You now have a working FaceFind installation. Create events, upload photos, and test face recognition.
