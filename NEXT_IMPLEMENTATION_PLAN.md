# FaceFind - Next Implementation Plan

## Priority 1: Complete User Management System (Current)

### API Endpoints
- ✅ `/api/v1/admin/users/create` - Already exists
- ⏳ `/api/v1/admin/users/[id]` - GET, PUT, DELETE user
- ⏳ `/api/v1/admin/users/[id]/suspend` - Suspend user
- ⏳ `/api/v1/admin/users/[id]/reactivate` - Reactivate user

### Pages
- ⏳ `/admin/users/create` - Create user form
- ⏳ `/admin/users/[id]` - User details view
- ⏳ `/admin/users/[id]/edit` - Edit user form
- ⏳ Update `/admin/users` - Add create/edit/view buttons

### Features
- Create users with Cognito integration
- Edit user details
- Suspend/reactivate users
- View user details
- Role-specific fields (ORGANIZER vs PHOTOGRAPHER)

---

## Priority 2: Enhance Event Management

### Missing Features from Requirements
- Photographer assignment (already has API, needs UI improvement)
- Event status transitions with validation
- Bulk event actions

---

## Priority 3: Organizer Dashboard & Features

### Pages Needed
- `/organizer/events` - List of organizer's events
- `/organizer/events/[id]` - Event details (read-only)
- `/organizer/events/[id]/photos` - View all event photos
- `/organizer/events/[id]/customize` - Edit landing page customization
- `/organizer/profile` - Edit profile

### API Endpoints
- `/api/v1/organizer/events/list` - GET organizer's events
- `/api/v1/organizer/events/[id]` - GET event details
- `/api/v1/organizer/events/[id]/photos` - GET all photos
- `/api/v1/organizer/events/[id]/landing-page` - PUT customization
- `/api/v1/organizer/events/[id]/download-all` - GET ZIP download
- `/api/v1/organizer/profile` - GET/PUT profile

---

## Priority 4: Photographer Dashboard & Features

### Pages Needed
- `/photographer/events` - List of assigned events
- `/photographer/events/[id]` - Event details
- `/photographer/events/[id]/upload` - Photo upload interface
- `/photographer/events/[id]/photos` - View uploaded photos
- `/photographer/portfolio` - Edit portfolio/bio
- `/photographer/[id]` - Public portfolio page

### API Endpoints
- `/api/v1/photographer/events/list` - GET assigned events
- `/api/v1/photographer/events/[id]` - GET event details
- `/api/v1/photographer/events/[id]/photos/upload` - POST photo upload
- `/api/v1/photographer/events/[id]/photos` - GET all photos
- `/api/v1/photographer/photos/[id]` - DELETE own photo
- `/api/v1/photographer/portfolio` - GET/PUT portfolio
- `/api/v1/public/photographer/[id]` - GET public portfolio

---

## Priority 5: Photo Upload & Processing Pipeline

### Components Needed
- Drag & drop upload interface
- Progress indicators
- Image preview
- Bulk upload support

### Backend Processing (Lambda)
1. S3 upload to `originals/`
2. Image resizing based on event config
3. Watermark application
4. Face detection with Rekognition
5. Face template extraction
6. Rekognition collection indexing
7. Thumbnail generation
8. DynamoDB metadata storage
9. Status update to LIVE

### Requirements
- Install: `sharp`, `@aws-sdk/client-rekognition`
- Lambda function for processing
- S3 event triggers
- Error handling & retry logic

---

## Priority 6: Attendee Experience (Public Pages)

### Landing Page (`/event/[id]`)
- Display event branding (logo, welcome message, picture)
- Check for existing session
- "Scan Your Face" button
- "View My Photos" if session exists
- Mobile-responsive design
- No authentication required

### Face Scanner Component
- WebRTC camera access
- Live preview with face detection guide
- Privacy consent dialog
- Single face detection
- Auto/manual capture
- Quality validation
- Error handling

### Photo Gallery (`/event/[id]/gallery`)
- Grid layout of matched photos
- Multi-select functionality
- Download single/multiple photos
- Share to social media
- Real-time updates
- Infinite scroll

### API Endpoints
- `/api/v1/events/[id]/landing` - GET event public info
- `/api/v1/events/[id]/scan-face` - POST face scan & matching
- `/api/v1/events/[id]/my-photos` - GET matched photos
- `/api/v1/events/[id]/rescan` - POST rescan face
- `/api/v1/photos/download-bulk` - POST bulk download as ZIP

---

## Priority 7: Content Moderation

### Pages
- `/admin/photos` - All photos across events
- `/admin/photos/flagged` - Flagged content queue

### API Endpoints
- `/api/v1/admin/photos` - GET all photos with filters
- `/api/v1/admin/photos/flagged` - GET flagged photos
- `/api/v1/admin/photos/[id]/flag` - POST flag photo
- `/api/v1/admin/photos/[id]/unflag` - POST unflag photo
- `/api/v1/admin/photos/[id]` - DELETE photo
- `/api/v1/admin/photos/bulk-action` - POST bulk actions

---

## Priority 8: WhatsApp Integration

### Features
- Phone number collection & OTP verification
- Consent management
- Notification sending:
  - Initial match with compressed previews
  - New matching photos
  - Grace period reminders
- Opt-out handling

### API Endpoints
- `/api/v1/whatsapp/send-otp` - POST send OTP
- `/api/v1/whatsapp/verify-otp` - POST verify OTP
- `/api/v1/events/[id]/whatsapp-subscribe` - POST subscribe
- `/api/v1/whatsapp/send-notification` - POST (Lambda triggered)

### Requirements
- WhatsApp Business API account
- Message template approval
- Webhook setup
- Phone number encryption (AWS KMS)

---

## Priority 9: Google Photos Integration

### Features
- OAuth flow with Google
- Date range selection
- Photo preview & selection
- Manual import trigger
- Disconnect option

### API Endpoints
- `/api/v1/photographer/google-photos/auth` - POST OAuth
- `/api/v1/photographer/google-photos/sync` - POST sync photos
- `/api/v1/photographer/google-photos/disconnect` - POST disconnect

### Requirements
- Google Cloud Project
- OAuth 2.0 credentials
- Google Photos API enabled
- Scopes: `photoslibrary.readonly`

---

## Priority 10: Reports & Analytics

### Pages
- `/admin/reports` - Analytics dashboard

### Features
- Revenue tracking
- Event analytics
- User statistics
- Photo statistics
- Export to CSV/PDF

### API Endpoints
- `/api/v1/admin/reports/revenue` - GET revenue data
- `/api/v1/admin/reports/analytics` - GET analytics
- `/api/v1/admin/reports/export` - POST export

---

## Priority 11: Data Lifecycle & Cleanup

### Lambda Functions
- `cleanup-expired-sessions` - Daily cleanup
- `cleanup-expired-face-templates` - Daily cleanup
- `archive-events` - Daily archival
- `send-grace-period-reminders` - Daily notifications

### EventBridge Rules
- Daily midnight: Grace period checks
- Daily midnight: Retention period checks
- Daily midnight: Cleanup jobs

### Process
1. **Grace Period End**:
   - Delete face templates
   - Delete sessions
   - Delete phone numbers
   - Keep photos

2. **Retention Period End**:
   - Delete all photos from S3
   - Delete photo metadata
   - Archive event
   - Delete Rekognition collection

---

## Implementation Order

1. ✅ Complete Event Management (DONE)
2. **⏳ User Management** (CURRENT - 70% DONE)
3. Photographer Assignment UI
4. Organizer Features
5. Photographer Features
6. Photo Upload Pipeline
7. Attendee Landing Page
8. Face Scanner
9. Photo Gallery
10. WhatsApp Integration
11. Content Moderation
12. Google Photos
13. Reports & Analytics
14. Data Lifecycle

---

## Estimated Timeline

- **Week 1-2**: User Management + Photographer Assignment UI
- **Week 3**: Organizer & Photographer Features
- **Week 4-5**: Photo Upload Pipeline + Face Detection
- **Week 6**: Attendee Experience (Landing, Scanner, Gallery)
- **Week 7**: WhatsApp Integration
- **Week 8**: Content Moderation + Google Photos
- **Week 9**: Reports & Analytics
- **Week 10**: Data Lifecycle + Testing
- **Week 11-12**: Bug fixes, optimization, deployment

---

## Next Immediate Tasks

1. Complete User Management API endpoints
2. Build User Management UI pages
3. Update Users list page with actions
4. Test complete user workflow
5. Move to Photographer Assignment UI
