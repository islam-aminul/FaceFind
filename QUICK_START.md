# FaceFind - Quick Start Guide

Get FaceFind up and running in minutes!

## Prerequisites

- Node.js 18+ installed
- AWS Account
- Basic familiarity with Next.js and AWS

## Step 1: Install Dependencies (2 minutes)

```bash
npm install
```

This will install all required packages including:
- Next.js 14
- AWS SDK
- Image processing libraries
- Testing frameworks

## Step 2: Configure Environment (5 minutes)

1. **Copy the environment template:**

```bash
cp .env.local.example .env.local
```

2. **Edit `.env.local` and add your AWS credentials:**

```env
# Minimum required for local development
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Generate a random JWT secret (run this in terminal):
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_generated_secret_here

# Generate encryption key (run this in terminal):
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your_generated_key_here

# SES (use sandbox mode for development)
SES_FROM_EMAIL=your-verified-email@example.com
```

**Generate Secrets:**

```bash
# Generate JWT Secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate Encryption Key
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

## Step 3: Set Up AWS Resources (10 minutes)

Run the automated setup script:

```bash
chmod +x scripts/setup-aws.sh
./scripts/setup-aws.sh
```

This creates:
- ✅ S3 bucket with encryption
- ✅ 8 DynamoDB tables with indexes
- ✅ TTL configuration for auto-deletion

**Manual Steps:**

1. **Verify SES Email** (for sending invitations):
   - Go to AWS SES Console
   - Click "Verify a New Email Address"
   - Verify the email you want to use as sender

2. **Update .env.local** with table names if you changed them

## Step 4: Start Development Server (1 minute)

```bash
npm run dev
```

The app will be available at **http://localhost:3000**

## Step 5: Create Your First Admin User (5 minutes)

### Option A: Use the Sandbox Test Script

```bash
npx ts-node scripts/test-sandbox.ts
```

This will:
- Create sample admin, organizer, and photographers
- Create a test event
- Generate QR codes
- Show you how everything works

### Option B: Manual Creation (API call)

Use an API client like Postman or curl:

```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourcompany.com",
    "role": "ADMIN",
    "firstName": "Admin",
    "lastName": "User",
    "phone": "+91 9999999999"
  }'
```

Check your email for the temporary password.

## Step 6: Test the Application

1. **Login**
   - Go to http://localhost:3000/login
   - Use the email and temporary password from the invitation

2. **Create an Event**
   - As admin, create a test event
   - Upload a logo and welcome message
   - Download the QR code

3. **Test Face Scanning**
   - Open the event URL (or scan QR code)
   - Click "Scan Your Face"
   - Allow camera access
   - Capture your face
   - See matched photos (if any)

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Building for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Common Issues & Solutions

### Issue: AWS credentials not working
**Solution**:
- Verify credentials in AWS IAM Console
- Ensure IAM user has required permissions
- Check credentials in .env.local

### Issue: Tables not found
**Solution**:
- Run `./scripts/setup-aws.sh` again
- Check table names in AWS DynamoDB Console
- Update table names in .env.local

### Issue: SES not sending emails
**Solution**:
- Verify sender email in SES Console
- Check if account is in sandbox mode
- Request production access if needed

### Issue: Face recognition errors
**Solution**:
- Ensure Rekognition is enabled in your region
- Check IAM permissions for Rekognition
- Verify image quality and size

## Next Steps

### For Development
1. ✅ Review the code structure in PROJECT_SUMMARY.md
2. ✅ Read the full README.md
3. ✅ Explore the type definitions in types/index.ts
4. ✅ Check out the API services in lib/api/

### For Testing
1. ✅ Upload test photos (use your own photos)
2. ✅ Test face scanning with different faces
3. ✅ Try different event configurations
4. ✅ Test the complete attendee flow

### For Production
1. ✅ Read DEPLOYMENT.md for deployment options
2. ✅ Set up monitoring and alerting
3. ✅ Configure backups
4. ✅ Add legal documents (privacy policy, terms)

## Key URLs

- **Home**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Admin**: http://localhost:3000/admin
- **Organizer**: http://localhost:3000/organizer
- **Photographer**: http://localhost:3000/photographer
- **Event**: http://localhost:3000/event/[eventId]

## File Structure Quick Reference

```
FaceFind/
├── app/                    # Next.js pages and API routes
│   ├── api/               # API endpoints
│   ├── event/[id]/        # Event landing pages
│   ├── admin/             # Admin dashboard
│   ├── organizer/         # Organizer dashboard
│   └── photographer/      # Photographer dashboard
├── lib/                   # Core business logic
│   ├── aws/              # AWS service clients
│   ├── api/              # Business services
│   └── utils/            # Utility functions
├── types/                 # TypeScript definitions
├── __tests__/            # Test files
└── scripts/              # Utility scripts
```

## Getting Help

- 📖 Read the full [README.md](./README.md)
- 🚀 Check [DEPLOYMENT.md](./DEPLOYMENT.md) for production
- 📊 See [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) for implementation details
- 📋 Review [photo_share_requirements.txt](./photo_share_requirements.txt) for full requirements

## Tips for Success

1. **Start Small**: Test with 1-2 events first
2. **Use Test Data**: Don't use production data during development
3. **Monitor Costs**: Keep an eye on AWS billing
4. **Check Logs**: Use CloudWatch for debugging
5. **Backup Data**: Enable DynamoDB Point-in-Time Recovery

---

**Ready to build something amazing?** 🚀

Start with `npm install` and follow the steps above!

For questions or issues, check the troubleshooting section or review the detailed documentation.
