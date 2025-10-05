# FaceFind - Face Recognition Photo Sharing Application

**Tagline:** "Find Yourself in Every Event"

FaceFind is a web-based face recognition photo sharing application designed for events like weddings and gatherings. Attendees can instantly access their photos by scanning their faces, while organizers and photographers efficiently manage event photography.

## 🚀 Features

### For Attendees
- **Face Scanning**: Scan your face using your device camera to instantly find all your photos
- **No Account Needed**: Session-based access without registration
- **Instant Download**: Download individual photos or bulk download as ZIP
- **WhatsApp Notifications**: Optional notifications when new photos are uploaded
- **Privacy Protected**: Face data is encrypted and automatically deleted

### For Organizers
- **Event Management**: View all your events and their details
- **Customizable Landing Pages**: Add logos, welcome messages, and pictures
- **QR Code Generation**: Download QR codes for easy attendee access
- **Photo Downloads**: Download all event photos

### For Photographers
- **Photo Upload**: Drag-and-drop or batch upload photos
- **Google Photos Integration**: Sync photos directly from Google Photos
- **Upload Tracking**: Real-time progress tracking with limits
- **Public Portfolio**: Auto-generated portfolio page with stats

### For Administrators
- **User Management**: Create and manage organizers and photographers
- **Event Management**: Create events, assign photographers, mark as paid
- **Content Moderation**: Flag/unflag photos, manage content
- **Billing & Reports**: Track payments and generate reports
- **Photographer Suspension**: Suspend/reactivate photographers with validation

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form
- **Camera**: WebRTC

### Backend (AWS)
- **Authentication**: AWS Cognito
- **Database**: DynamoDB
- **Storage**: S3
- **Face Recognition**: AWS Rekognition
- **Functions**: AWS Lambda
- **Email**: SES
- **CDN**: CloudFront

### Integrations
- **WhatsApp**: Business API for notifications
- **Google Photos**: OAuth integration for photo sync

## 📋 Prerequisites

- Node.js 18+ and npm
- AWS Account with appropriate permissions
- WhatsApp Business API account (optional)
- Google Cloud Console project (optional, for Google Photos integration)

## 🔧 Installation

### 1. Clone the Repository

\`\`\`bash
git clone <repository-url>
cd FaceFind
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Configure Environment Variables

Create a \`.env.local\` file based on \`.env.local.example\`:

\`\`\`bash
cp .env.local.example .env.local
\`\`\`

Edit \`.env.local\` and add your AWS credentials and configuration:

\`\`\`env
# AWS Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Cognito
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your_user_pool_id
NEXT_PUBLIC_COGNITO_CLIENT_ID=your_client_id

# S3
S3_BUCKET_NAME=facefind-photos

# DynamoDB Table Names
DYNAMODB_USERS_TABLE=facefind-users
DYNAMODB_EVENTS_TABLE=facefind-events
DYNAMODB_PHOTOS_TABLE=facefind-photos
DYNAMODB_FACE_TEMPLATES_TABLE=facefind-face-templates
DYNAMODB_SESSIONS_TABLE=facefind-sessions
DYNAMODB_BILLING_TABLE=facefind-billing
DYNAMODB_AUDIT_LOGS_TABLE=facefind-audit-logs
DYNAMODB_PHOTOGRAPHER_ASSIGNMENTS_TABLE=facefind-photographer-assignments

# WhatsApp (optional)
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id

# Google Photos (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret_min_32_chars_long
ENCRYPTION_KEY=your_32_byte_hex_encryption_key

# Email
SES_FROM_EMAIL=noreply@facefind.com
\`\`\`

### 4. Set Up AWS Resources

You need to create the following AWS resources:

#### DynamoDB Tables

Create the following tables with these primary keys:

- **facefind-users**: userId (String)
- **facefind-events**: eventId (String)
- **facefind-photos**: photoId (String)
- **facefind-face-templates**: faceId (String)
- **facefind-sessions**: sessionId (String)
- **facefind-billing**: billingId (String)
- **facefind-audit-logs**: logId (String)
- **facefind-photographer-assignments**: assignmentId (String)

Add these Global Secondary Indexes:
- **facefind-events**: organizerId-index (organizerId)
- **facefind-photos**: eventId-index (eventId), photographerId-index (photographerId)
- **facefind-face-templates**: eventId-index (eventId)
- **facefind-sessions**: eventId-index (eventId)
- **facefind-photographer-assignments**: photographerId-index (photographerId), eventId-index (eventId)

#### S3 Bucket

Create an S3 bucket (e.g., \`facefind-photos\`) with:
- Server-side encryption enabled
- Versioning enabled
- Lifecycle policies for automatic deletion

#### Rekognition Collections

Collections are created automatically when events are created.

#### SES Email

Verify your sender email address in AWS SES.

## 🚀 Running the Application

### Development Mode

\`\`\`bash
npm run dev
\`\`\`

The application will be available at [http://localhost:3000](http://localhost:3000)

### Production Build

\`\`\`bash
npm run build
npm start
\`\`\`

## 🧪 Testing

### Run All Tests

\`\`\`bash
npm test
\`\`\`

### Run Tests in Watch Mode

\`\`\`bash
npm run test:watch
\`\`\`

### Generate Coverage Report

\`\`\`bash
npm run test:coverage
\`\`\`

## 📁 Project Structure

\`\`\`
FaceFind/
├── app/                          # Next.js app directory
│   ├── admin/                    # Admin dashboard
│   ├── organizer/                # Organizer dashboard
│   ├── photographer/             # Photographer dashboard
│   ├── event/[id]/               # Attendee event pages
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── events/               # Event endpoints
│   │   ├── photos/               # Photo endpoints
│   │   ├── admin/                # Admin endpoints
│   │   ├── organizer/            # Organizer endpoints
│   │   └── photographer/         # Photographer endpoints
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/                   # React components
│   ├── admin/                    # Admin components
│   ├── organizer/                # Organizer components
│   ├── photographer/             # Photographer components
│   ├── attendee/                 # Attendee components
│   ├── ui/                       # Reusable UI components
│   └── shared/                   # Shared components
├── lib/                          # Library code
│   ├── aws/                      # AWS service clients
│   │   ├── config.ts             # AWS configuration
│   │   ├── dynamodb.ts           # DynamoDB service
│   │   ├── s3.ts                 # S3 service
│   │   ├── rekognition.ts        # Rekognition service
│   │   └── ses.ts                # SES service
│   ├── api/                      # Business logic
│   │   ├── auth.ts               # Authentication service
│   │   ├── users.ts              # User service
│   │   ├── events.ts             # Event service
│   │   ├── photos.ts             # Photo service
│   │   └── face-recognition.ts   # Face recognition service
│   ├── utils/                    # Utility functions
│   │   ├── crypto.ts             # Encryption/hashing
│   │   ├── jwt.ts                # JWT handling
│   │   ├── qrcode.ts             # QR code generation
│   │   ├── image-processing.ts   # Image manipulation
│   │   └── whatsapp.ts           # WhatsApp integration
│   ├── hooks/                    # React hooks
│   └── validators/               # Input validation
├── types/                        # TypeScript type definitions
│   └── index.ts                  # All type definitions
├── __tests__/                    # Test files
├── public/                       # Static files
├── .env.local.example            # Environment variables template
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.ts            # Tailwind config
├── next.config.js                # Next.js config
├── jest.config.js                # Jest config
└── README.md                     # This file
\`\`\`

## 🔐 Security Features

- **Encryption**: Face templates and phone numbers encrypted with AES-256-GCM
- **HTTPS**: All communications over TLS 1.3
- **JWT**: Secure token-based authentication
- **RBAC**: Role-based access control
- **Input Validation**: All inputs sanitized and validated
- **Rate Limiting**: API rate limiting to prevent abuse
- **Auto-Deletion**: Face data automatically deleted after grace period

## 📊 Key Workflows

### Event Lifecycle
1. **CREATED** → Admin creates event
2. **PAID** → Admin marks as paid
3. **ACTIVE** → During event dates
4. **GRACE_PERIOD** → After event, attendees can still scan
5. **DOWNLOAD_PERIOD** → Grace ended, organizer/photographer only
6. **ARCHIVED** → After retention, photos deleted

### Attendee Access Flow
1. Scan QR code → Event landing page
2. Click "Scan Your Face"
3. Camera activates → Capture photo
4. Face recognition → Match photos
5. View gallery → Select photos
6. Download (single/bulk)

### Photo Upload Flow
1. Photographer uploads photos
2. Upload to S3 (original)
3. Resize + watermark + thumbnail
4. Face detection with Rekognition
5. Index faces in collection
6. Photos go live immediately
7. Notify matching attendees (WhatsApp)

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Refresh access token

### Events (Public)
- `GET /api/events/[id]/landing` - Get event landing page info
- `POST /api/events/[id]/scan-face` - Scan face and match photos
- `GET /api/events/[id]/my-photos` - Get session photos

### Admin
- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `POST /api/admin/events` - Create event
- `POST /api/admin/users` - Create user
- `POST /api/admin/users/[id]/suspend` - Suspend photographer

### Organizer
- `GET /api/organizer/events` - List my events
- `GET /api/organizer/events/[id]/photos` - Get event photos

### Photographer
- `POST /api/photographer/events/[id]/photos` - Upload photos
- `GET /api/photographer/events` - List assigned events

## 🧩 Environment-Specific Configuration

### Development
- Local DynamoDB (optional)
- LocalStack for AWS services (optional)
- Mock WhatsApp/Google integrations

### Staging
- Separate AWS resources
- Test data
- Full integration testing

### Production
- Production AWS resources
- Monitoring and alerts
- Backup and disaster recovery

## 📝 License

This project is proprietary and confidential.

## 🤝 Contributing

This is a private project. Contribution guidelines will be provided to team members.

## 📧 Support

For support, please contact: support@facefind.com

---

**Built with ❤️ for seamless event photo sharing**

Version: 1.0.0
Last Updated: October 2025
