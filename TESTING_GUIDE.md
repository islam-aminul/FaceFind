# FaceFind - Comprehensive Testing Guide

## 🧪 Testing Strategy

This guide covers all testing approaches for FaceFind, including AWS Amplify sandbox testing.

## Prerequisites

Before running tests, you need to fix npm permissions:

```bash
# Fix npm cache permissions (run this first)
sudo chown -R $(whoami) ~/.npm

# Then install dependencies
npm install
```

## 1. Unit Testing

### Running Unit Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Files

- `__tests__/lib/utils/crypto.test.ts` - Encryption and hashing tests
- `__tests__/lib/utils/qrcode.test.ts` - QR code generation tests

### Writing New Tests

Create test files in `__tests__` directory:

```typescript
import { yourFunction } from '@/lib/your-module';

describe('YourFunction', () => {
  it('should do something', () => {
    const result = yourFunction('input');
    expect(result).toBe('expected');
  });
});
```

## 2. AWS Amplify Sandbox Testing

### Setup Amplify Sandbox

1. **Fix npm permissions first:**
```bash
sudo chown -R $(whoami) ~/.npm
```

2. **Install Amplify dependencies:**
```bash
npm install
```

3. **Start Amplify sandbox:**
```bash
npx ampx sandbox
```

This will:
- Deploy temporary cloud resources
- Set up Auth, Data, and Storage
- Provide a local development environment
- Auto-sync changes to the cloud

### Amplify Sandbox Features

The sandbox provides:
- ✅ **Cognito User Pool** for authentication
- ✅ **DynamoDB tables** via GraphQL API
- ✅ **S3 bucket** for file storage
- ✅ **Real AWS services** in isolated environment
- ✅ **Hot reload** on code changes

### Testing with Sandbox

Once sandbox is running:

```bash
# In another terminal, start the app
npm run dev
```

Then test:
1. User registration and login
2. Event creation
3. Photo upload to S3
4. Face scanning (mock)
5. Session management

### Sandbox Commands

```bash
# Start sandbox
npx ampx sandbox

# Delete sandbox (cleanup)
npx ampx sandbox delete

# View sandbox status
npx ampx sandbox status
```

## 3. Integration Testing

### Manual Integration Tests

1. **Authentication Flow**
```bash
# Test user creation
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "role": "ORGANIZER",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+91 9999999999"
  }'

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "temporary_password_from_email"
  }'
```

2. **Event Management**
```bash
# Create event (requires auth token)
curl -X POST http://localhost:3000/api/admin/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "eventName": "Test Event",
    "organizerId": "user_123",
    ...
  }'
```

3. **Face Scanning Flow**
- Open http://localhost:3000/event/EVENT_ID
- Click "Scan Your Face"
- Allow camera access
- Capture face
- Verify session creation
- Check photo matching

## 4. AWS Services Testing

### DynamoDB Testing

```bash
# List tables
aws dynamodb list-tables --region ap-south-1

# Scan users table
aws dynamodb scan --table-name facefind-users --region ap-south-1

# Get specific item
aws dynamodb get-item \
  --table-name facefind-users \
  --key '{"userId": {"S": "user_123"}}' \
  --region ap-south-1
```

### S3 Testing

```bash
# List buckets
aws s3 ls

# List objects in bucket
aws s3 ls s3://facefind-photos/

# Upload test file
aws s3 cp test-image.jpg s3://facefind-photos/test/
```

### Rekognition Testing

```bash
# List collections
aws rekognition list-collections --region ap-south-1

# Describe collection
aws rekognition describe-collection \
  --collection-id facefind-event-EVENT_ID \
  --region ap-south-1
```

## 5. Sandbox Test Script

### Running the Sandbox Script

```bash
# Make sure you have AWS credentials configured
npx ts-node scripts/test-sandbox.ts
```

This script will:
- Create sample users (Admin, Organizer, Photographers)
- Create a test event
- Assign photographers
- Generate QR codes
- Show complete workflow

### Expected Output

```
🚀 FaceFind Sandbox Test
========================

Step 1: Creating Admin User...
✅ Admin created: admin@facefind.com

Step 2: Creating Organizer...
✅ Organizer created: organizer@example.com

Step 3: Creating Photographers...
✅ Photographer 1 created: photographer1@example.com
✅ Photographer 2 created: photographer2@example.com

...
```

## 6. End-to-End Testing

### E2E Test Scenarios

#### Scenario 1: Complete Attendee Flow
1. Admin creates event
2. Photographer uploads photos
3. Attendee scans QR code
4. Attendee scans face
5. Photos are matched and displayed
6. Attendee downloads photos
7. WhatsApp notification sent

#### Scenario 2: Photographer Workflow
1. Photographer logs in
2. Views assigned events
3. Uploads batch of photos
4. Photos are processed (resize, watermark)
5. Faces are detected and indexed
6. Upload progress tracked

#### Scenario 3: Admin Management
1. Admin creates organizer
2. Admin creates event
3. Admin assigns photographer
4. Admin marks event as paid
5. Admin downloads QR code
6. Admin monitors event stats

## 7. Performance Testing

### Load Testing with Artillery

Create `artillery.yml`:

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: 'Face Scanning'
    flow:
      - get:
          url: '/event/{{ eventId }}/landing'
      - post:
          url: '/event/{{ eventId }}/scan-face'
          json:
            faceImageData: '{{ faceData }}'
            deviceFingerprint: '{{ fingerprint }}'
```

Run:
```bash
npm install -g artillery
artillery run artillery.yml
```

### Expected Performance
- API response time: < 500ms
- Face recognition: < 5 seconds
- Photo upload: < 30 seconds per batch
- Concurrent users: 500+

## 8. Security Testing

### Authentication Tests
- [x] Test password hashing
- [x] Test JWT token generation
- [x] Test token expiration
- [x] Test invalid credentials
- [x] Test suspended user login

### Encryption Tests
- [x] Test face template hashing
- [x] Test phone number encryption
- [x] Test data decryption
- [x] Test encryption key rotation

### Authorization Tests
- [x] Test role-based access
- [x] Test API endpoint protection
- [x] Test resource ownership
- [x] Test cross-tenant isolation

## 9. Manual Testing Checklist

### User Management
- [ ] Create admin user
- [ ] Create organizer user
- [ ] Create photographer user
- [ ] Login with each role
- [ ] Suspend photographer
- [ ] Reactivate photographer
- [ ] Reset password

### Event Management
- [ ] Create event
- [ ] Upload event logo
- [ ] Set welcome message
- [ ] Generate QR code
- [ ] Assign photographer
- [ ] Check for conflicts
- [ ] Mark event as paid
- [ ] Update event status

### Photo Processing
- [ ] Upload single photo
- [ ] Upload batch of photos
- [ ] Verify resize
- [ ] Verify watermark
- [ ] Verify thumbnail
- [ ] Check face detection
- [ ] Verify face indexing

### Face Recognition
- [ ] Scan face with camera
- [ ] Match against photos
- [ ] Create session
- [ ] View matched photos
- [ ] Download photos
- [ ] Rescan face

### WhatsApp Integration
- [ ] Collect phone number
- [ ] Send OTP
- [ ] Verify OTP
- [ ] Send notification
- [ ] Send reminder
- [ ] Opt-out

## 10. Troubleshooting Tests

### Common Issues

**Test: npm install fails**
```bash
# Fix
sudo chown -R $(whoami) ~/.npm
rm -rf node_modules package-lock.json
npm install
```

**Test: AWS credentials not working**
```bash
# Verify
aws sts get-caller-identity

# Fix
aws configure
```

**Test: Amplify sandbox fails**
```bash
# Check
npx ampx sandbox status

# Delete and recreate
npx ampx sandbox delete
npx ampx sandbox
```

**Test: Face recognition errors**
- Verify Rekognition service enabled
- Check collection exists
- Verify image quality
- Check confidence threshold

## 11. Continuous Testing

### Pre-commit Hooks

Create `.husky/pre-commit`:
```bash
#!/bin/sh
npm test
npm run lint
```

### CI/CD Pipeline

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test
      - run: npm run build
```

## 12. Test Coverage Goals

- Unit Tests: 80%+ coverage
- Integration Tests: All critical paths
- E2E Tests: All user workflows
- Performance Tests: Load and stress
- Security Tests: OWASP Top 10

## 📊 Test Results

Track test results in this format:

```
Test Suite: Unit Tests
Status: ✅ PASSING
Coverage: 85%
Tests: 45 passed, 0 failed

Test Suite: Integration Tests
Status: ✅ PASSING
Scenarios: 15 passed, 0 failed

Test Suite: E2E Tests
Status: ⚠️ IN PROGRESS
Scenarios: 8 passed, 2 pending
```

## 🎯 Next Steps

1. Fix npm permissions: `sudo chown -R $(whoami) ~/.npm`
2. Install dependencies: `npm install`
3. Run unit tests: `npm test`
4. Start Amplify sandbox: `npx ampx sandbox`
5. Start dev server: `npm run dev`
6. Run sandbox script: `npx ts-node scripts/test-sandbox.ts`
7. Manual testing with browser
8. Check all test scenarios

---

**Ready to test?** Start with fixing npm permissions and installing dependencies!
