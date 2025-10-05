# FaceFind - Test Plan

## Test Execution Plan

### Phase 1: Environment Setup ⚠️

**Status**: Blocked - NPM permission issue

**Required Actions**:
```bash
# Run this command first to fix npm permissions:
sudo chown -R $(whoami) ~/.npm

# Then install dependencies:
npm install
```

**Verification**:
- [ ] npm install completes successfully
- [ ] node_modules directory created
- [ ] All dependencies installed

---

### Phase 2: Unit Testing

**Prerequisites**: Phase 1 complete

**Commands**:
```bash
npm test
npm run test:coverage
```

**Test Files**:
1. `__tests__/lib/utils/crypto.test.ts`
   - [x] Hash face template
   - [x] Encrypt/decrypt data
   - [x] Password hashing
   - [x] Password verification
   - [x] Generate temp password

2. `__tests__/lib/utils/qrcode.test.ts`
   - [x] Generate QR code buffer
   - [x] Generate QR code data URL

**Expected Results**:
- All tests pass
- Coverage > 70%
- No errors or warnings

---

### Phase 3: AWS Amplify Sandbox

**Prerequisites**: Phase 1 complete

**Setup**:
```bash
# Start Amplify sandbox
npx ampx sandbox
```

**Expected Output**:
```
Amplify Sandbox

Setting up local server...
✅ Auth configured
✅ Data configured
✅ Storage configured

Sandbox URL: https://xxxxx.amplifyapp.com
GraphQL endpoint: https://xxxxx.appsync-api.region.amazonaws.com/graphql

Watching for changes...
```

**Verification**:
- [ ] Cognito User Pool created
- [ ] AppSync GraphQL API created
- [ ] DynamoDB tables created
- [ ] S3 bucket created
- [ ] Local server running

---

### Phase 4: Sandbox Testing Script

**Prerequisites**: Phase 3 complete

**Command**:
```bash
npx ts-node scripts/test-sandbox.ts
```

**Test Scenarios**:

1. **User Creation**
   - [ ] Create admin user
   - [ ] Create organizer user
   - [ ] Create 2 photographer users
   - [ ] Verify email invitations would be sent

2. **Event Creation**
   - [ ] Create event with all required fields
   - [ ] Generate QR code
   - [ ] Create Rekognition collection
   - [ ] Verify event status = CREATED

3. **Event Payment**
   - [ ] Mark event as paid
   - [ ] Verify status = PAID

4. **Photographer Assignment**
   - [ ] Assign photographer 1 to event
   - [ ] Assign photographer 2 to event
   - [ ] Verify no overlap conflicts
   - [ ] Verify email notifications

5. **Event Stats**
   - [ ] Get total photos (0)
   - [ ] Get total attendees (0)
   - [ ] Get upload progress (0%)

**Expected Output**:
```
✅ Sandbox Test Complete!

📊 Summary:
   - Created 1 Admin, 1 Organizer, 2 Photographers
   - Created 1 Event with QR code
   - Assigned 2 Photographers to Event
   - Event is ready for photo uploads and attendee access
```

---

### Phase 5: Integration Testing

**Prerequisites**: Phase 3 complete, app running

**Start Application**:
```bash
# Terminal 1: Amplify sandbox (already running)
npx ampx sandbox

# Terminal 2: Dev server
npm run dev
```

**Test Scenarios**:

#### 5.1 Authentication API
```bash
# Test login endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@facefind.com",
    "password": "test_password"
  }'
```

Expected: 401 (invalid credentials - no real password set)

#### 5.2 Event Landing Page
```bash
# Test event info endpoint
curl http://localhost:3000/api/events/event_123/landing
```

Expected: Event not found or event details

#### 5.3 Face Scanning (Manual Browser Test)
- [ ] Open http://localhost:3000
- [ ] Navigate to event page
- [ ] Click "Scan Your Face"
- [ ] Allow camera access
- [ ] Verify camera preview
- [ ] Capture face
- [ ] Verify processing
- [ ] Check for matches

---

### Phase 6: AWS Services Verification

**Prerequisites**: AWS credentials configured

#### 6.1 DynamoDB Tables
```bash
# List tables
aws dynamodb list-tables --region ap-south-1

# Verify tables exist:
# - facefind-users
# - facefind-events
# - facefind-photos
# - facefind-face-templates
# - facefind-sessions
# - facefind-billing
# - facefind-audit-logs
# - facefind-photographer-assignments
```

#### 6.2 S3 Bucket
```bash
# List buckets
aws s3 ls | grep facefind

# List contents
aws s3 ls s3://facefind-photos/
```

#### 6.3 Rekognition
```bash
# List collections
aws rekognition list-collections --region ap-south-1
```

---

### Phase 7: End-to-End Testing

**Full User Flow Test**:

1. **Admin Setup** (Manual)
   - [ ] Login as admin
   - [ ] Create organizer account
   - [ ] Create photographer accounts
   - [ ] Create event
   - [ ] Assign photographers
   - [ ] Mark event as paid
   - [ ] Download QR code

2. **Photographer Upload** (Manual)
   - [ ] Login as photographer
   - [ ] View assigned events
   - [ ] Upload test photos
   - [ ] Verify processing
   - [ ] Check upload counter
   - [ ] View all event photos

3. **Attendee Experience** (Manual)
   - [ ] Scan QR code (or visit event URL)
   - [ ] See event landing page
   - [ ] Click "Scan Your Face"
   - [ ] Allow camera
   - [ ] Capture face
   - [ ] See matched photos (or no results)
   - [ ] Select photos
   - [ ] Download photos
   - [ ] Rescan face

---

### Phase 8: Performance Testing

**Prerequisites**: Application deployed

**Test Scenarios**:

1. **Concurrent Users**
   - [ ] 10 simultaneous face scans
   - [ ] 50 simultaneous face scans
   - [ ] 100 simultaneous face scans
   - Measure: Response time, error rate

2. **Photo Upload**
   - [ ] Upload 100 photos in batch
   - [ ] Upload 500 photos sequentially
   - Measure: Processing time, face detection accuracy

3. **Face Recognition**
   - [ ] Match against 100 photos
   - [ ] Match against 500 photos
   - [ ] Match against 1000 photos
   - Measure: Search time, accuracy

---

### Phase 9: Security Testing

**Test Scenarios**:

1. **Authentication**
   - [ ] Invalid credentials rejected
   - [ ] Suspended user cannot login
   - [ ] Token expiration works
   - [ ] Refresh token works
   - [ ] Password reset works

2. **Authorization**
   - [ ] Organizer cannot access admin endpoints
   - [ ] Photographer cannot delete others' photos
   - [ ] Unauthenticated users cannot access protected routes
   - [ ] Session isolation (no cross-event access)

3. **Data Protection**
   - [ ] Face templates are hashed
   - [ ] Phone numbers are encrypted
   - [ ] Passwords are hashed with bcrypt
   - [ ] JWTs are properly signed
   - [ ] S3 URLs expire after 24 hours

4. **Privacy**
   - [ ] Face templates auto-delete after grace period
   - [ ] Sessions auto-delete after grace period
   - [ ] Photos delete after retention period
   - [ ] No cross-event data leakage

---

## Test Results Summary

### Current Status

| Phase | Status | Blocker |
|-------|--------|---------|
| 1. Environment Setup | ⚠️ BLOCKED | NPM permissions |
| 2. Unit Testing | ⏸️ PENDING | Phase 1 |
| 3. Amplify Sandbox | ⏸️ PENDING | Phase 1 |
| 4. Sandbox Script | ⏸️ PENDING | Phase 3 |
| 5. Integration Testing | ⏸️ PENDING | Phase 3 |
| 6. AWS Verification | ✅ READY | Manual run |
| 7. E2E Testing | ⏸️ PENDING | Phase 5 |
| 8. Performance Testing | ⏸️ PENDING | Deployment |
| 9. Security Testing | ⏸️ PENDING | Phase 5 |

### Immediate Actions Required

1. **Fix NPM Permissions** (Critical)
   ```bash
   sudo chown -R $(whoami) ~/.npm
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run Unit Tests**
   ```bash
   npm test
   ```

4. **Start Amplify Sandbox**
   ```bash
   npx ampx sandbox
   ```

5. **Run Sandbox Test**
   ```bash
   npx ts-node scripts/test-sandbox.ts
   ```

---

## Test Coverage Goals

- ✅ Unit Tests: Files created, tests written
- ✅ Integration Tests: Scenarios defined
- ✅ E2E Tests: Workflows documented
- ✅ Performance Tests: Metrics defined
- ✅ Security Tests: Checklist complete
- ⚠️ Execution: Blocked on npm permissions

---

## Notes

- All test infrastructure is in place
- All test files are created
- All test scenarios are documented
- Only blocker is npm permission issue
- Once resolved, all tests can run
- Estimated time to complete all tests: 2-3 hours

---

**Next Step**: User needs to run `sudo chown -R $(whoami) ~/.npm` to fix permissions, then proceed with testing phases.
