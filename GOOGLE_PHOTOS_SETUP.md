# Google Photos Integration Setup Guide

This guide explains how to set up Google Photos integration for FaceFind, allowing photographers to import photos directly from their Google Photos library into events.

## Overview

The Google Photos integration enables:
- OAuth 2.0 authentication with Google
- Browse photos from Google Photos by date range
- Preview and select photos to import
- Automatic import with face detection
- Secure token storage and management

## Prerequisites

1. Google Cloud Platform (GCP) account
2. FaceFind application running
3. Domain or localhost setup for OAuth redirect

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name: `FaceFind` (or your preferred name)
4. Click **Create**
5. Wait for project creation to complete
6. Select your new project from the dropdown

## Step 2: Enable Google Photos Library API

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for **"Photos Library API"**
3. Click on **Photos Library API**
4. Click **Enable**
5. Wait for the API to be enabled

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (or **Internal** if using Google Workspace)
3. Click **Create**

### App Information:
- **App name**: FaceFind
- **User support email**: Your email address
- **Developer contact email**: Your email address

### App Domain (Optional):
- **Application home page**: Your website URL
- **Privacy policy**: Your privacy policy URL
- **Terms of service**: Your terms of service URL

4. Click **Save and Continue**

### Scopes:
5. Click **Add or Remove Scopes**
6. Find and select:
   - `.../auth/photoslibrary.readonly` (Read-only access to Google Photos)
7. Click **Update**
8. Click **Save and Continue**

### Test Users (for External apps in testing mode):
9. Click **Add Users**
10. Add email addresses of photographers who will test the integration
11. Click **Save and Continue**
12. Review summary and click **Back to Dashboard**

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Application type**: **Web application**
4. Enter name: `FaceFind Web Client`

### Authorized JavaScript origins:
Add your application URLs:
- For production: `https://yourdomain.com`
- For development: `http://localhost:3000`

### Authorized redirect URIs:
Add your callback URLs:
- For production: `https://yourdomain.com/api/v1/photographer/google-photos/callback`
- For development: `http://localhost:3000/api/v1/photographer/google-photos/callback`

5. Click **Create**
6. Copy the **Client ID** and **Client Secret** that appear
7. Click **OK**

## Step 5: Configure Environment Variables

Add the following variables to your `.env.local` file:

```env
# Google Photos API
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here

# Make sure NEXT_PUBLIC_APP_URL is set correctly
NEXT_PUBLIC_APP_URL=http://localhost:3000
# For production: NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Finding Your Credentials:
- **Client ID**: Go to **APIs & Services** → **Credentials** → Click your OAuth client name
- **Client Secret**: Shown on the same page (click the eye icon to reveal)

## Step 6: Update Database Schema

The GooglePhotosToken model has been added to the database schema. Deploy the updated schema:

```bash
npx ampx sandbox
```

Or if deploying to production:

```bash
npx ampx pipeline-deploy --branch main
```

## Step 7: Restart Application

Restart your Next.js application to load the new environment variables:

```bash
npm run dev
```

For production:

```bash
npm run build
npm start
```

## Step 8: Test the Integration

1. Log in as a photographer
2. Go to an event details page
3. Navigate to **Google Photos Integration** (or add a link to `/photographer/events/[eventId]/google-photos`)
4. Click **Connect Google Photos**
5. Authorize the application in Google's OAuth consent screen
6. You should be redirected back to FaceFind with a success message
7. Select a date range and click **Load Photos**
8. Preview photos, select the ones you want to import
9. Click **Import [N] Photo(s)**
10. Photos will be imported, processed, and faces indexed automatically

## Architecture Overview

### OAuth Flow:
```
User clicks "Connect"
  → POST /api/v1/photographer/google-photos/auth
  → Redirects to Google OAuth
  → User authorizes
  → Google redirects to /api/v1/photographer/google-photos/callback
  → Token stored in DynamoDB
  → Redirected back to integration page
```

### Photo Import Flow:
```
User selects photos
  → POST /api/v1/photographer/google-photos/sync
  → Downloads photos from Google Photos API
  → Uploads to S3 (originals/{eventId}/{photoId}.{ext})
  → Creates Photo record in DynamoDB (status: UPLOADING)
  → S3 triggers Lambda (photo-processor)
  → Lambda processes: resize, watermark, thumbnail, face indexing
  → Photo status updated to LIVE
  → Photos appear in event gallery
```

### Token Management:
- Access tokens expire after 1 hour
- Refresh tokens are used to get new access tokens automatically
- Tokens are stored encrypted in DynamoDB
- User can disconnect at any time (revokes token and deletes from DB)

## API Endpoints

### 1. Initiate OAuth Flow
```
POST /api/v1/photographer/google-photos/auth
Headers:
  Authorization: Bearer {token}
  X-User-Id: {userId}

Response:
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "base64_encoded_state"
}
```

### 2. OAuth Callback (handled automatically)
```
GET /api/v1/photographer/google-photos/callback?code={code}&state={state}
Redirects to: /photographer/settings?google_photos_success=true
```

### 3. List Photos
```
GET /api/v1/photographer/google-photos/sync?eventId={id}&startDate={date}&endDate={date}&pageSize=50
Headers:
  Authorization: Bearer {token}
  X-User-Id: {userId}

Response:
{
  "photos": [
    {
      "id": "google_photo_id",
      "baseUrl": "https://...",
      "filename": "IMG_1234.jpg",
      "mediaMetadata": {
        "creationTime": "2025-01-01T12:00:00Z",
        "width": "4000",
        "height": "3000"
      }
    }
  ],
  "nextPageToken": "token_for_next_page",
  "message": "Found 50 photos"
}
```

### 4. Import Photos
```
POST /api/v1/photographer/google-photos/sync
Headers:
  Authorization: Bearer {token}
  X-User-Id: {userId}
  Content-Type: application/json

Body:
{
  "eventId": "event_id",
  "photoIds": ["google_photo_id_1", "google_photo_id_2"],
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-02T00:00:00Z"
}

Response:
{
  "imported": [
    {
      "photoId": "uuid",
      "googlePhotoId": "google_id",
      "filename": "IMG_1234.jpg",
      "status": "UPLOADING"
    }
  ],
  "failed": [],
  "message": "Successfully imported 2 photo(s). 0 failed.",
  "currentCount": 52,
  "maxPhotos": 1000,
  "remaining": 948
}
```

### 5. Disconnect
```
POST /api/v1/photographer/google-photos/disconnect
Headers:
  Authorization: Bearer {token}
  X-User-Id: {userId}

Response:
{
  "success": true,
  "message": "Google Photos disconnected successfully"
}
```

## Security Considerations

1. **OAuth State Parameter**: Used for CSRF protection during OAuth flow
2. **Token Storage**: Access and refresh tokens stored encrypted in DynamoDB
3. **Token Expiry**: Tokens automatically refreshed when expired
4. **Scope Limitation**: Only read-only access to photos (photoslibrary.readonly)
5. **User Authorization**: Each photographer must authorize their own account
6. **Revocation**: Tokens revoked on disconnect

## Troubleshooting

### "Redirect URI mismatch" Error
- Check that the redirect URI in Google Cloud Console exactly matches your callback URL
- Include both localhost (for development) and production URLs
- Ensure no trailing slashes

### "Access blocked: This app's request is invalid"
- Make sure you've enabled the Photos Library API
- Check that the OAuth consent screen is properly configured
- Verify all required scopes are added

### "Failed to refresh token"
- Refresh token may have expired (happens after 6 months of inactivity)
- User needs to disconnect and reconnect
- Check that client secret is correct in environment variables

### Photos not loading
- Check date range (must be valid ISO 8601 dates)
- Verify photographer has photos in their Google Photos during that date range
- Check browser console for API errors
- Verify access token hasn't expired

### Import fails
- Check event photo limit (maxPhotos)
- Verify S3 bucket permissions
- Check Lambda function logs for processing errors
- Ensure Rekognition collection exists for the event

## Rate Limits

Google Photos Library API has the following limits:
- **10,000 requests per day** (default quota)
- **1,000 requests per 100 seconds** (per user)

If you need higher limits, request a quota increase in Google Cloud Console.

## Cost Considerations

### Google Cloud:
- Photos Library API: **Free** (no charges for API calls)
- Cloud Storage: Only if you store data in GCP (we don't)

### AWS (FaceFind infrastructure):
- S3 storage for imported photos
- Lambda processing costs
- Rekognition face indexing costs
- Standard FaceFind pricing applies to imported photos

## Support

For issues specific to:
- **Google Photos API**: [Google Photos API Documentation](https://developers.google.com/photos)
- **OAuth 2.0**: [Google Identity Documentation](https://developers.google.com/identity)
- **FaceFind Integration**: Check application logs and API responses

## Additional Resources

- [Google Photos API Reference](https://developers.google.com/photos/library/reference/rest)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- [Google Cloud Console](https://console.cloud.google.com/)

## Migration Notes

If you need to migrate credentials or change redirect URIs:

1. Update redirect URIs in Google Cloud Console
2. Update `NEXT_PUBLIC_APP_URL` in environment variables
3. Restart application
4. Existing tokens will continue to work
5. New authorizations will use the new redirect URI
