# Product Requirements Document (PRD)

## FaceFind — Find Yourself in Every Event

**Version:** 1.0
**Last Updated:** 2026-02-11
**Status:** In Development (~85% Complete)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision & Goals](#3-product-vision--goals)
4. [Target Users & Personas](#4-target-users--personas)
5. [Core Features & Requirements](#5-core-features--requirements)
6. [System Architecture](#6-system-architecture)
7. [Data Models](#7-data-models)
8. [API Specification](#8-api-specification)
9. [User Flows](#9-user-flows)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Security & Privacy](#11-security--privacy)
12. [Third-Party Integrations](#12-third-party-integrations)
13. [Event Lifecycle](#13-event-lifecycle)
14. [Billing & Pricing](#14-billing--pricing)
15. [Success Metrics](#15-success-metrics)
16. [Implementation Status](#16-implementation-status)
17. [Future Roadmap](#17-future-roadmap)
18. [Risks & Mitigations](#18-risks--mitigations)
19. [Glossary](#19-glossary)

---

## 1. Executive Summary

FaceFind is a web-based face recognition photo-sharing platform designed for events such as weddings, corporate gatherings, conferences, and parties. It enables event attendees to instantly find and download all photos they appear in by scanning their face — no registration required.

The platform connects four types of users: **Administrators** who manage the system, **Organizers** who create and customize events, **Photographers** who upload event photos, and **Attendees** who scan their face to find their photos.

FaceFind is built on a serverless AWS architecture using Next.js 14, TypeScript, and AWS services including Rekognition, DynamoDB, S3, Lambda, and Cognito.

---

## 2. Problem Statement

### The Core Problem

At events with professional photography, attendees face a common frustration: hundreds or thousands of photos are captured, but finding the specific ones you appear in is tedious, manual work. Current solutions require:

- Scrolling through entire event galleries
- Waiting for photographers to manually tag and share photos
- Creating accounts on photo-sharing platforms
- Relying on social media posts that may never materialize

### Who Is Affected

- **Attendees** who want their event photos quickly and easily
- **Event organizers** who want to deliver a modern, delightful attendee experience
- **Photographers** who spend excessive time on post-event photo distribution

### Market Gap

Existing photo-sharing solutions either lack face recognition capability, require attendee registration (creating friction), or are prohibitively expensive for mid-market events. There is no widely adopted solution that combines frictionless face-based search with a complete event management workflow.

---

## 3. Product Vision & Goals

### Vision

Make every event photo instantly discoverable by the people in them, with zero friction for attendees.

### Product Goals

| # | Goal | Description |
|---|------|-------------|
| G1 | Frictionless attendee experience | Attendees find their photos via a face scan — no account, no login, no browsing |
| G2 | Complete event workflow | End-to-end platform covering event creation, photo upload, processing, distribution, and archival |
| G3 | Privacy by design | Face data is ephemeral (TTL-deleted), phone numbers are encrypted, and no persistent attendee accounts exist |
| G4 | Scalable & cost-efficient | Serverless architecture that scales with demand and charges organizers based on actual usage |
| G5 | Multi-role platform | Dedicated dashboards for admins, organizers, and photographers with appropriate access controls |

---

## 4. Target Users & Personas

### 4.1 Administrator

| Attribute | Detail |
|-----------|--------|
| **Role** | System operator / FaceFind staff |
| **Goals** | Manage all events, users, photos, billing, and system settings |
| **Access** | Full platform access including content moderation, user suspension, analytics, and system configuration |
| **Key Tasks** | Create events, manage users (organizers & photographers), approve payments, flag inappropriate content, view analytics |

### 4.2 Event Organizer

| Attribute | Detail |
|-----------|--------|
| **Role** | Person or company hosting the event |
| **Goals** | Create a seamless photo experience for event attendees |
| **Access** | Own events only — landing page customization, photo viewing, QR code download, event reports |
| **Key Tasks** | Customize event landing page (logo, welcome message, picture), view event photos, download all photos, share QR code with attendees |

### 4.3 Photographer

| Attribute | Detail |
|-----------|--------|
| **Role** | Professional photographer covering the event |
| **Goals** | Upload photos efficiently and manage their portfolio |
| **Access** | Assigned events only — photo upload, Google Photos sync, portfolio management |
| **Key Tasks** | Upload event photos (drag-and-drop or batch), import from Google Photos, manage portfolio profile |

### 4.4 Event Attendee

| Attribute | Detail |
|-----------|--------|
| **Role** | Guest at the event |
| **Goals** | Find and download their photos instantly |
| **Access** | Public event landing page — no account needed |
| **Key Tasks** | Scan face via camera, browse matched photos, download individual or bulk photos, optionally opt in for WhatsApp notifications |

---

## 5. Core Features & Requirements

### 5.1 Authentication & Authorization

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| AUTH-01 | JWT-based authentication with access tokens (24h) and refresh tokens (7d) | P0 | Done |
| AUTH-02 | AWS Cognito integration for credential management | P0 | Done |
| AUTH-03 | Role-based access control (RBAC) for Admin, Organizer, Photographer | P0 | Done |
| AUTH-04 | Password hashing with bcrypt (10 salt rounds) | P0 | Done |
| AUTH-05 | Device fingerprinting for attendee sessions (SHA-256 of user agent + IP) | P0 | Done |
| AUTH-06 | API middleware for authorization header validation on all protected routes | P0 | Done |

### 5.2 Event Management

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| EVT-01 | Create events with name, dates, location, estimated attendees, max photos | P0 | Done |
| EVT-02 | Configure photo processing settings (resize dimensions, JPEG quality, watermark) | P0 | Done |
| EVT-03 | Set face recognition confidence threshold per event | P0 | Done |
| EVT-04 | Set grace period (days after event for attendee access) and retention period (days to keep photos) | P0 | Done |
| EVT-05 | Generate and download QR codes linking to event landing page | P0 | Done |
| EVT-06 | Assign photographers to events | P0 | Done |
| EVT-07 | Mark events as paid and manage billing status | P0 | Done |
| EVT-08 | Automatic event status transitions through lifecycle | P0 | Done |
| EVT-09 | Customize event landing page (logo, welcome message, welcome picture) | P1 | Done |

### 5.3 Photo Processing Pipeline

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| PHT-01 | Photographers upload photos to S3 via presigned URLs | P0 | Done |
| PHT-02 | Lambda triggers on S3 upload to process photos automatically | P0 | Done |
| PHT-03 | Resize photos to event-configured dimensions (maintaining aspect ratio) | P0 | Done |
| PHT-04 | Apply configurable watermarks (event name, date, photographer name) | P0 | Done |
| PHT-05 | Generate thumbnails (400x400, JPEG, cover crop) | P0 | Done |
| PHT-06 | Index faces in AWS Rekognition (per-event collection) | P0 | Done |
| PHT-07 | Store processed/thumbnail URLs and face IDs in DynamoDB | P0 | Done |
| PHT-08 | Track photo status: UPLOADING -> PROCESSING -> LIVE -> FLAGGED -> DELETED | P0 | Done |

### 5.4 Face Recognition & Matching

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FACE-01 | Create per-event Rekognition collections for face indexing | P0 | Done |
| FACE-02 | Index all detected faces from uploaded photos with photoId reference | P0 | Done |
| FACE-03 | SearchFacesByImage using attendee's captured face with configurable confidence threshold | P0 | Done |
| FACE-04 | Return all matching photos sorted by confidence score | P0 | Done |
| FACE-05 | Store face template hashes (SHA-256) for deduplication | P1 | Done |
| FACE-06 | TTL-based automatic deletion of face templates after grace period | P0 | Done |

### 5.5 Attendee Experience

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| ATT-01 | Public event landing page accessible via QR code or direct URL (no login required) | P0 | Done |
| ATT-02 | WebRTC camera capture for face scanning | P0 | Done |
| ATT-03 | Display matched photos in a gallery with thumbnails | P0 | Done |
| ATT-04 | Individual photo download via presigned S3 URLs | P0 | Done |
| ATT-05 | Bulk download as ZIP archive | P0 | Done |
| ATT-06 | Ability to rescan with a different face | P1 | Done |
| ATT-07 | Optional WhatsApp consent for notifications | P1 | Done |
| ATT-08 | Session-based access (no persistent account) | P0 | Done |

### 5.6 Admin Dashboard

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| ADM-01 | Dashboard with aggregate stats (events, users, photos, revenue) | P0 | Done |
| ADM-02 | Full CRUD for users (organizers and photographers) | P0 | Done |
| ADM-03 | Suspend and reactivate user accounts | P0 | Done |
| ADM-04 | Content moderation: flag and unflag photos | P0 | Done |
| ADM-05 | System settings management (billing, security, storage, notifications, face recognition) | P1 | Done |
| ADM-06 | Analytics overview and per-event analytics | P1 | Done |
| ADM-07 | Audit logging for administrative actions | P1 | Done |

### 5.7 Organizer Dashboard

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| ORG-01 | View list of assigned events with status | P0 | Done |
| ORG-02 | View event details and photo gallery | P0 | Done |
| ORG-03 | Customize event landing page (logo, welcome message, picture) | P0 | Done |
| ORG-04 | Download QR code for event | P0 | Done |
| ORG-05 | Download all event photos as ZIP | P1 | Done |

### 5.8 Photographer Dashboard

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| PHOT-01 | View list of assigned events | P0 | Done |
| PHOT-02 | Upload photos via drag-and-drop or batch selection | P0 | Done |
| PHOT-03 | Import photos from Google Photos | P1 | Done |
| PHOT-04 | Manage portfolio (bio, specialization, links) | P2 | Done |
| PHOT-05 | View own uploads and other photographers' uploads per event | P1 | Done |

### 5.9 Notification System

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| NOTIF-01 | Email notifications via AWS SES (user invitations, event creation, assignments) | P1 | Done |
| NOTIF-02 | WhatsApp OTP verification via AiSensy | P1 | Done |
| NOTIF-03 | WhatsApp photo match notifications | P1 | Done |
| NOTIF-04 | WhatsApp download reminders during grace period | P2 | Done |
| NOTIF-05 | WhatsApp event start notifications | P2 | Done |

---

## 6. System Architecture

### 6.1 Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, React Hook Form, Zod |
| **Authentication** | AWS Cognito (User Pools with RBAC) |
| **API** | Next.js API Routes (REST), AppSync (GraphQL) |
| **Database** | Amazon DynamoDB (8 tables) |
| **Storage** | Amazon S3 + CloudFront CDN |
| **Face Recognition** | AWS Rekognition (Collection-based indexing and search) |
| **Compute** | AWS Lambda (3 functions) |
| **Email** | AWS SES |
| **Orchestration** | AWS Amplify Gen 2 |
| **Image Processing** | Sharp (libvips-based) |

### 6.2 Architecture Diagram (Conceptual)

```
                                    ┌──────────────────┐
                                    │   CloudFront CDN  │
                                    └────────┬─────────┘
                                             │
┌─────────────┐    HTTPS    ┌───────────────┴───────────────┐
│  Attendee   │ ──────────> │        Next.js 14 App         │
│  (Browser)  │ <────────── │   (Frontend + API Routes)     │
└─────────────┘             └───┬───────┬───────┬───────┬───┘
                                │       │       │       │
                    ┌───────────┘   ┌───┘   ┌───┘   ┌───┘
                    ▼               ▼       ▼       ▼
             ┌──────────┐   ┌──────────┐ ┌─────┐ ┌──────────────┐
             │ Cognito   │   │ DynamoDB │ │ S3  │ │ Rekognition  │
             │ (Auth)    │   │ (8 tables│ │     │ │ (Face Match) │
             └──────────┘   └──────────┘ └──┬──┘ └──────────────┘
                                             │
                                    ┌────────┴─────────┐
                                    │  Lambda Functions │
                                    │  - Photo Process  │
                                    │  - Grace Cleanup  │
                                    │  - Retain Cleanup │
                                    └──────────────────┘
                                             │
                                    ┌────────┴─────────┐
                                    │  AWS SES (Email)  │
                                    └──────────────────┘
```

### 6.3 Lambda Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| **Photo Processor** | S3 upload to `originals/` | Resize, watermark, thumbnail, Rekognition indexing |
| **Grace Period Cleanup** | Scheduled daily (00:00 UTC) | Delete sessions, update event status to DOWNLOAD_PERIOD |
| **Retention Cleanup** | Scheduled daily (01:00 UTC) | Delete photos from S3, delete Rekognition collection, archive event |

---

## 7. Data Models

### 7.1 Users

```
userId (PK)  |  email  |  role  |  firstName  |  lastName  |  phone (encrypted)
companyName  |  portfolioUrl  |  specialization  |  bio  |  status  |  password (hashed)
createdAt  |  updatedAt
```

- **Roles:** ADMIN, ORGANIZER, PHOTOGRAPHER
- **Statuses:** ACTIVE, SUSPENDED, INACTIVE

### 7.2 Events

```
eventId (PK)  |  eventName  |  organizerId  |  startDateTime  |  endDateTime
gracePeriodDays  |  retentionPeriodDays  |  location  |  estimatedAttendees  |  maxPhotos
confidenceThreshold  |  photoResizeWidth  |  photoResizeHeight  |  photoQuality
watermarkElements[]  |  eventLogoUrl  |  welcomeMessage  |  welcomePictureUrl
qrCodeUrl  |  paymentStatus  |  paymentAmount  |  status  |  rekognitionCollectionId
createdAt  |  updatedAt
```

- **Statuses:** CREATED -> PAID -> ACTIVE -> GRACE_PERIOD -> DOWNLOAD_PERIOD -> ARCHIVED
- **GSI:** organizerId-index

### 7.3 Photos

```
photoId (PK)  |  eventId (GSI)  |  photographerId (GSI)  |  originalUrl  |  processedUrl
thumbnailUrl  |  fileSize  |  dimensions {width, height}  |  capturedAt  |  uploadedAt
status  |  faceCount  |  rekognitionFaceIds[]  |  flaggedBy  |  flagReason  |  updatedAt
```

- **Statuses:** UPLOADING -> PROCESSING -> LIVE -> FLAGGED -> DELETED

### 7.4 Face Templates

```
faceId (PK)  |  photoId  |  eventId (GSI)  |  rekognitionFaceId
boundingBox {width, height, left, top}  |  confidence  |  faceTemplateHash
expiresAt (TTL)  |  createdAt
```

### 7.5 Sessions

```
sessionId (PK)  |  eventId (GSI)  |  faceTemplateHash  |  matchedPhotoIds[]
deviceFingerprint  |  phoneNumber (encrypted)  |  whatsappConsent
createdAt  |  expiresAt (TTL)
```

### 7.6 Billing

```
billingId (PK)  |  eventId  |  estimatedAttendees  |  estimatedPhotos
actualAttendees  |  actualPhotos  |  retentionDays  |  calculatedAmount
paymentStatus  |  paymentDate  |  paymentReference  |  createdAt  |  updatedAt
```

### 7.7 Audit Logs

```
logId (PK)  |  userId  |  action  |  resourceType  |  resourceId
details {}  |  timestamp  |  ipAddress
```

### 7.8 Photographer Assignments

```
assignmentId (PK)  |  eventId (GSI)  |  photographerId (GSI)  |  assignedAt
```

---

## 8. API Specification

### 8.1 Authentication (3 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Authenticate user, return JWT tokens |
| POST | `/api/auth/logout` | Invalidate session |
| POST | `/api/auth/refresh-token` | Refresh access token using refresh token |

### 8.2 Public Event Access (3 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events/[id]/landing` | Get event landing page data |
| POST | `/api/events/[id]/scan-face` | Submit face image, return matched photos |
| GET | `/api/events/[id]/my-photos` | Get matched photos for current session |

### 8.3 Admin Endpoints (26 endpoints)

**Dashboard & Analytics:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/dashboard/stats` | Aggregate platform stats |
| GET | `/api/v1/admin/analytics/overview` | Analytics overview |
| GET | `/api/v1/admin/analytics/events/[id]` | Per-event analytics |

**Event Management:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/admin/events/create` | Create new event |
| GET | `/api/v1/admin/events/list` | List all events |
| GET | `/api/v1/admin/events/[id]` | Get event details |
| PUT | `/api/v1/admin/events/[id]` | Update event |
| DELETE | `/api/v1/admin/events/[id]` | Delete event |
| POST | `/api/v1/admin/events/[id]/mark-paid` | Mark event as paid |
| POST | `/api/v1/admin/events/[id]/generate-qr` | Generate QR code |
| GET | `/api/v1/admin/events/[id]/qr-download` | Download QR code |
| DELETE | `/api/v1/admin/events/[id]/delete-qr` | Delete QR code |
| POST | `/api/v1/admin/events/[id]/assign-photographer` | Assign photographer |
| POST | `/api/v1/admin/events/upload` | Upload event photo (admin) |

**User Management:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/admin/users/create` | Create user (organizer/photographer) |
| GET | `/api/v1/admin/users/list` | List all users |
| GET | `/api/v1/admin/users/[id]` | Get user details |
| PUT | `/api/v1/admin/users/[id]` | Update user |
| DELETE | `/api/v1/admin/users/[id]` | Delete user |
| POST | `/api/v1/admin/users/[id]/suspend` | Suspend user |
| POST | `/api/v1/admin/users/[id]/reactivate` | Reactivate user |

**Photo Management:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/photos` | List photos (filterable) |
| GET | `/api/v1/admin/photos/[id]` | Get photo details |
| POST | `/api/v1/admin/photos/[id]/flag` | Flag photo for moderation |
| POST | `/api/v1/admin/photos/[id]/unflag` | Unflag photo |
| POST | `/api/v1/admin/photos/[id]/process` | Reprocess photo |

**System Settings:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT | `/api/v1/admin/settings/system` | General system settings |
| GET/PUT | `/api/v1/admin/settings/security` | Security settings |
| GET/PUT | `/api/v1/admin/settings/billing` | Billing settings |
| GET/PUT | `/api/v1/admin/settings/face-recognition` | Rekognition settings |
| GET/PUT | `/api/v1/admin/settings/storage` | Storage settings |
| GET/PUT | `/api/v1/admin/settings/notifications` | Notification settings |

### 8.4 Organizer Endpoints (6 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/organizer/events/list` | List organizer's events |
| GET | `/api/v1/organizer/events/[id]` | Get event details |
| GET | `/api/v1/organizer/events/[id]/photos` | View event photos |
| PUT | `/api/v1/organizer/events/[id]/landing-page` | Customize landing page |
| GET | `/api/v1/organizer/events/[id]/download-all` | Download all photos (ZIP) |

### 8.5 Photographer Endpoints (8 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/photographer/events/list` | List assigned events |
| GET | `/api/v1/photographer/events/[id]` | Get event details |
| GET | `/api/v1/photographer/events/[id]/photos` | View event photos |
| POST | `/api/v1/photographer/events/[id]/photos/upload` | Upload photos |
| GET | `/api/v1/photographer/portfolio` | Get portfolio |
| PUT | `/api/v1/photographer/portfolio` | Update portfolio |
| GET | `/api/v1/photographer/google-photos/auth` | Google Photos OAuth start |
| GET | `/api/v1/photographer/google-photos/callback` | Google Photos OAuth callback |
| POST | `/api/v1/photographer/google-photos/sync` | Sync from Google Photos |
| POST | `/api/v1/photographer/google-photos/disconnect` | Disconnect Google Photos |

### 8.6 Other Endpoints (4 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/whatsapp/send-otp` | Send WhatsApp OTP |
| POST | `/api/v1/whatsapp/verify-otp` | Verify WhatsApp OTP |
| POST | `/api/v1/photos/download-bulk` | Bulk photo download (ZIP) |
| GET | `/api/v1/settings/defaults` | Get default system settings |
| GET | `/api/v1/public/photographer/[id]` | Public photographer profile |

---

## 9. User Flows

### 9.1 Attendee Flow (Primary User Journey)

```
1. Attendee receives QR code (printed at event or shared digitally)
2. Scans QR code → opens event landing page in browser
3. Sees event welcome message, logo, and "Find My Photos" button
4. Taps "Find My Photos" → camera opens (WebRTC)
5. Captures face photo → submitted to backend
6. Backend sends face to AWS Rekognition → SearchFacesByImage
7. Matching photos returned, displayed as gallery with thumbnails
8. Attendee browses, selects photos, downloads individually or as ZIP
9. Optionally opts in for WhatsApp notifications (enters phone, receives OTP)
10. Session persisted via device fingerprint (can return later during grace period)
```

### 9.2 Event Setup Flow (Admin/Organizer)

```
1. Admin creates event (name, dates, location, attendees, settings)
2. System creates Rekognition collection for the event
3. Admin assigns organizer and photographer(s) to event
4. System sends invitation emails to assigned users
5. Admin generates QR code for event
6. Organizer customizes landing page (logo, welcome message, picture)
7. Admin marks event as paid → status transitions to ACTIVE
8. QR code distributed to attendees
```

### 9.3 Photo Upload Flow (Photographer)

```
1. Photographer logs in → sees assigned events
2. Selects event → navigates to photo upload page
3. Option A: Drag-and-drop files or select from file browser
4. Option B: Import from Google Photos (OAuth → select → import)
5. Photos uploaded to S3 originals/ folder via presigned URLs
6. S3 trigger fires Lambda Photo Processor
7. Lambda: resize → watermark → thumbnail → Rekognition index
8. Photo status: UPLOADING → PROCESSING → LIVE
9. Photos appear in event gallery for all users
```

### 9.4 Content Moderation Flow (Admin)

```
1. Admin navigates to Photos section in admin dashboard
2. Reviews photos (filter by event, status, photographer)
3. Flags inappropriate photo with reason
4. Photo status changes to FLAGGED (excluded from attendee results)
5. Can unflag if determined to be acceptable
```

---

## 10. Non-Functional Requirements

### 10.1 Performance

| Requirement | Target |
|-------------|--------|
| Face scan response time | < 3 seconds (including Rekognition API call) |
| Photo upload processing | < 60 seconds per photo (resize + watermark + index) |
| Page load time | < 2 seconds (initial load) |
| API response time | < 500ms for database queries |
| Concurrent users per event | Support 500+ simultaneous attendees |
| Photo gallery rendering | Lazy-loaded thumbnails, < 1 second for first 20 |

### 10.2 Scalability

| Requirement | Detail |
|-------------|--------|
| Serverless auto-scaling | Lambda scales with upload volume |
| DynamoDB on-demand | Auto-scales read/write capacity |
| S3 unlimited storage | No practical storage limits |
| CloudFront CDN | Global photo delivery |
| Concurrent events | No hard limit on simultaneous active events |

### 10.3 Availability & Reliability

| Requirement | Target |
|-------------|--------|
| Uptime | 99.9% (aligned with AWS SLAs) |
| Data durability | 99.999999999% (S3 standard) |
| Disaster recovery | Multi-AZ DynamoDB, S3 cross-region replication (optional) |
| Backup strategy | DynamoDB point-in-time recovery enabled |

### 10.4 Browser Compatibility

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 90+ |
| Safari | 14+ |
| Firefox | 90+ |
| Edge | 90+ |
| Mobile Safari (iOS) | 14+ |
| Chrome for Android | 90+ |

WebRTC camera access required for face scanning — all listed browsers support this.

---

## 11. Security & Privacy

### 11.1 Data Encryption

| Data | Method |
|------|--------|
| Passwords | bcrypt (10 salt rounds) |
| Phone numbers | AES-256-GCM (random IV per encryption) |
| Face template hashes | SHA-256 |
| JWT tokens | HMAC-SHA256 (32+ character secret) |
| S3 objects | Server-side encryption (AES-256) |
| Data in transit | TLS 1.2+ (HTTPS enforced) |

### 11.2 Access Control

- **RBAC** enforced at API route level via middleware
- **Admin**: Full access to all resources
- **Organizer**: Read-only access to own events; write access to landing page customization
- **Photographer**: Read/write access to assigned events only
- **Attendee**: Session-based access to matched photos within grace period

### 11.3 Privacy Compliance

| Measure | Implementation |
|---------|----------------|
| Face data TTL | Auto-deleted after grace period via DynamoDB TTL |
| Session TTL | Auto-deleted after grace period |
| No attendee accounts | Session-based only, no persistent PII stored beyond session |
| Encrypted PII | Phone numbers encrypted at rest |
| Photo retention | Auto-deleted after retention period via Lambda cleanup |
| Rekognition cleanup | Collection deleted when event archived |
| Audit trail | All admin actions logged with timestamp, user, and details |

### 11.4 Input Validation

- Zod schema validation on all API inputs
- File type validation on photo uploads (JPEG, PNG, WebP)
- File size limits enforced
- SQL injection N/A (DynamoDB, no SQL)
- XSS prevention via React's default escaping and server-side sanitization

---

## 12. Third-Party Integrations

### 12.1 AWS Services

| Service | Purpose | Region |
|---------|---------|--------|
| **Cognito** | User authentication and management | ap-south-1 |
| **DynamoDB** | Primary database (8 tables) | ap-south-1 |
| **S3** | Photo storage (originals, processed, thumbnails) | ap-south-1 |
| **CloudFront** | CDN for photo delivery | Global |
| **Rekognition** | Face detection, indexing, and search | ap-south-1 |
| **Lambda** | Serverless compute (3 functions) | ap-south-1 |
| **SES** | Transactional email | ap-south-1 |
| **Amplify Gen 2** | Infrastructure orchestration | ap-south-1 |

### 12.2 AiSensy (WhatsApp Business API)

| Campaign | Purpose |
|----------|---------|
| `otp_verification` | Phone number verification for attendees |
| `photo_match_notification` | Notify attendees when their photos are ready |
| `download_reminder` | Remind attendees to download before grace period expires |
| `event_start_notification` | Notify about event commencement |

### 12.3 Google Photos

| Feature | Detail |
|---------|--------|
| OAuth 2.0 | Authorization code grant flow |
| Scopes | `photoslibrary.readonly` |
| Token management | Access + refresh token storage |
| Photo sync | List albums, select photos, batch import to S3 |

---

## 13. Event Lifecycle

```
┌──────────┐    Payment     ┌──────────┐    Event      ┌──────────┐
│ CREATED  │ ──────────────>│   PAID   │ ──starts────> │  ACTIVE  │
└──────────┘    Received     └──────────┘               └────┬─────┘
                                                              │
                                                         Event ends
                                                              │
                                                              ▼
┌──────────┐    Retention   ┌──────────────┐  Grace     ┌────────────┐
│ ARCHIVED │ <──expires───  │DOWNLOAD_PERIOD│ <─expires─ │GRACE_PERIOD│
└──────────┘                └──────────────┘            └────────────┘
```

| Status | Description | Attendee Access | Photo Access |
|--------|-------------|-----------------|--------------|
| **CREATED** | Event created, awaiting payment | No | No |
| **PAID** | Payment received, awaiting event start | No | Photographers can upload |
| **ACTIVE** | Event is live | Face scan + download | Upload + view + download |
| **GRACE_PERIOD** | Event ended, grace period active | Face scan + download | View + download (no new uploads) |
| **DOWNLOAD_PERIOD** | Grace period expired | Download only (existing sessions) | View + download |
| **ARCHIVED** | Retention expired, data deleted | No | No (photos deleted) |

### Cleanup Automation

- **Grace Period Cleanup** (daily at 00:00 UTC): Transitions events past grace period to DOWNLOAD_PERIOD, deletes face templates and sessions
- **Retention Cleanup** (daily at 01:00 UTC): Transitions events past retention period to ARCHIVED, deletes all photos from S3, removes Rekognition collection

---

## 14. Billing & Pricing

### 14.1 Cost Components

| Component | Basis |
|-----------|-------|
| AWS Rekognition | Per-face indexed + per-search |
| S3 Storage | Per-GB per-month |
| DynamoDB | Read/write capacity units |
| Lambda | Per-invocation + duration |
| CloudFront | Per-GB transferred |
| SES | Per-email sent |
| WhatsApp (AiSensy) | Per-message sent |

### 14.2 Pricing Model

The billing calculator factors in:

- **Estimated attendees** (affects Rekognition search volume)
- **Estimated photos** (affects storage, processing, indexing)
- **Retention days** (affects storage duration, with tiered multiplier)
- **Processing overhead** (Lambda, S3 transfer)
- **Profit margin** (20% on top of costs)

### 14.3 Retention Tier Multipliers

| Retention Period | Multiplier |
|-----------------|------------|
| 1-7 days | 1.0x |
| 8-14 days | 1.2x |
| 15-30 days | 1.4x |
| 31-60 days | 1.6x |
| 61-90 days | 1.8x |
| 90+ days | 2.0x |

---

## 15. Success Metrics

### 15.1 Product KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Face match accuracy | > 95% true positive rate | Rekognition confidence vs. manual verification |
| Attendee conversion rate | > 60% of event attendees scan face | Sessions created / estimated attendees |
| Photo download rate | > 40% of matched photos downloaded | Downloads / matched photos shown |
| Time to first photo | < 5 seconds from face scan | End-to-end latency measurement |
| Organizer satisfaction | > 4.5/5 rating | Post-event survey |

### 15.2 Technical KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| System uptime | 99.9% | AWS CloudWatch monitoring |
| API error rate | < 0.1% | Error count / total requests |
| Photo processing success rate | > 99.5% | Successful / total processing jobs |
| Lambda cold start rate | < 5% | Cold starts / total invocations |
| Average API latency | < 300ms (p95) | CloudWatch API Gateway metrics |

---

## 16. Implementation Status

### Overall: ~85% Complete

| Module | Status | Notes |
|--------|--------|-------|
| Infrastructure & DevOps | 100% | AWS Amplify Gen 2 configured |
| Authentication (Cognito + JWT) | 100% | Full RBAC implemented |
| Admin Dashboard | 100% | All CRUD, analytics, settings |
| Organizer Dashboard | 100% | Event view, landing page customization |
| Photographer Dashboard | 100% | Upload, Google Photos, portfolio |
| Event Management | 100% | Full lifecycle management |
| User Management | 100% | CRUD + suspend/reactivate |
| Photo Processing Pipeline | 100% | Lambda, Sharp, Rekognition |
| Attendee Landing Page | 100% | Customizable, responsive |
| Bulk Download | 100% | ZIP generation with presigned URLs |
| Billing Calculator | 100% | Automatic pricing with tier multipliers |
| Google Photos Integration | 100% | OAuth + sync |
| WhatsApp Integration | 100% | AiSensy campaigns |
| Email Notifications | 100% | SES templates |
| Attendee Face Matching | ~60% | UI ready, Rekognition integration pending full end-to-end testing |
| Test Coverage | ~30% | 2 test suites (crypto, QR code); more coverage needed |
| Advanced Analytics | Not started | Planned for future iteration |
| Real-Time Updates | Not started | WebSocket-based live photo feed |

---

## 17. Future Roadmap

### Phase 2 (Planned)

| Feature | Description | Priority |
|---------|-------------|----------|
| Advanced Analytics Dashboard | Detailed event performance, attendee behavior, photographer stats | P1 |
| Real-Time Photo Feed | WebSocket-based live updates as photos are processed | P1 |
| Payment Gateway Integration | Stripe/Razorpay for online event payments | P1 |
| Expanded Test Coverage | Unit, integration, and E2E tests across all modules | P1 |

### Phase 3 (Future)

| Feature | Description | Priority |
|---------|-------------|----------|
| Mobile App (iOS/Android) | Native mobile experience for attendees and photographers | P2 |
| AI Photo Recommendations | ML-powered best-photo suggestions per attendee | P2 |
| Multi-Language Support | i18n for global event audiences | P2 |
| Social Media Sharing | Direct share to Instagram, Facebook, Twitter | P2 |
| Event Templates | Pre-configured event types (wedding, corporate, concert) | P3 |
| Photographer Marketplace | In-app photographer discovery and booking | P3 |

---

## 18. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Rekognition accuracy in poor lighting** | Attendees can't find their photos | Medium | Configurable confidence threshold; ability to rescan; guidance on camera positioning |
| **High AWS costs at scale** | Reduced margins | Medium | Usage-based billing passed to organizers; retention tier pricing; auto-cleanup to limit storage duration |
| **Privacy regulatory compliance (GDPR, etc.)** | Legal liability | Medium | TTL-based data deletion; no persistent attendee PII; encrypted sensitive data; audit logging |
| **S3/Lambda cold start latency** | Slow user experience | Low | CloudFront caching for photos; provisioned concurrency for Lambda (optional) |
| **WhatsApp API rate limits** | Missed notifications | Low | Queue-based message sending; retry logic; fallback to email |
| **Google Photos API changes** | Broken import feature | Low | Abstracted service layer; feature flag to disable; manual upload as fallback |
| **Large event photo volume (10,000+ photos)** | Processing backlog | Medium | Lambda auto-scaling; parallel processing; upload throttling per photographer |
| **Browser camera permission denied** | Attendee can't scan face | Medium | Clear permission prompts; fallback instructions; support for photo upload instead of live capture |

---

## 19. Glossary

| Term | Definition |
|------|------------|
| **Attendee** | A guest at an event who uses FaceFind to find their photos |
| **Confidence Threshold** | Minimum similarity score (0-100) required for a face match to be considered valid |
| **Device Fingerprint** | SHA-256 hash of user agent + IP address used to identify attendee sessions |
| **Face Template** | Metadata about a detected face stored in DynamoDB, linked to a Rekognition face ID |
| **Grace Period** | Number of days after event ends during which attendees can still scan and download photos |
| **Presigned URL** | Time-limited S3 URL that allows direct browser download without authentication |
| **Rekognition Collection** | AWS Rekognition construct that stores indexed face vectors for a specific event |
| **Retention Period** | Number of days after event ends during which photos are stored before automatic deletion |
| **Session** | A temporary record linking an attendee's face scan to their matched photos |
| **TTL** | Time-To-Live — DynamoDB feature that automatically deletes records after a specified timestamp |
| **Watermark** | Text overlay applied to processed photos (event name, date, photographer attribution) |
