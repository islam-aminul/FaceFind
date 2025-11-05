# AiSensy WhatsApp Integration Setup Guide

This guide explains how to set up AiSensy WhatsApp Business API integration for FaceFind.

## Overview

FaceFind uses AiSensy for WhatsApp messaging to:
- Send OTP verification codes for phone number verification
- Send photo match notifications when photos are found
- Send download reminders before grace period expires
- Send event start notifications

## Prerequisites

1. **AiSensy Account**: Sign up at [aisensy.com](https://aisensy.com)
2. **WhatsApp Business API Access**: Follow [AiSensy's guide](https://aisensy.com/tutorials/how-to-apply-for-whatsapp-business-api) to apply for WhatsApp Business API access (Free)
3. **API Key**: Obtain your API key from AiSensy dashboard

## Step 1: Create WhatsApp Message Templates

WhatsApp requires pre-approved message templates. Create the following templates in your AiSensy dashboard:

### 1. OTP Verification Template

**Template Name**: `otp_verification`
**Category**: Authentication
**Language**: English

**Template Format** (Pre-configured by WhatsApp):
```
Your verification code is {{1}}. This code will expire in 10 minutes.
```

**Parameters**:
- `{{1}}`: OTP code (6 digits)

**Setup Instructions**:
1. Go to AiSensy Dashboard → Templates
2. Click "Create Template"
3. Select "Authentication" as Template Category
4. The message body is pre-configured and cannot be edited
5. Add the OTP code parameter `{{1}}`
6. Submit for approval (usually takes 15 seconds - 2 minutes)

---

### 2. Photo Match Notification Template

**Template Name**: `photo_match_notification`
**Category**: Marketing
**Language**: English

**Template Body**:
```
🎉 Great news! We found {{1}} photos of you at {{2}}!

View and download your photos: {{3}}

This link will be available until the event retention period ends.
```

**Parameters**:
- `{{1}}`: Event name
- `{{2}}`: Photo count
- `{{3}}`: Session URL

**Setup Instructions**:
1. Go to AiSensy Dashboard → Templates
2. Click "Create Template"
3. Select "Marketing" as Template Category
4. Enter the template body with parameters
5. Submit for approval

---

### 3. Download Reminder Template

**Template Name**: `download_reminder`
**Category**: Marketing
**Language**: English

**Template Body**:
```
⏰ Reminder: Your photos from {{1}} will be deleted in {{2}} days!

Download them now: {{3}}

Don't miss out on your memories!
```

**Parameters**:
- `{{1}}`: Event name
- `{{2}}`: Days remaining
- `{{3}}`: Session URL

---

### 4. Event Start Notification Template

**Template Name**: `event_start_notification`
**Category**: Marketing
**Language**: English

**Template Body**:
```
📸 {{1}} is now live!

Scan your face to find your photos: {{2}}

Enjoy the event!
```

**Parameters**:
- `{{1}}`: Event name
- `{{2}}`: Scan URL

---

## Step 2: Create API Campaigns

For each template, create an API campaign:

1. Go to AiSensy Dashboard → Campaigns → API Campaigns
2. Click "Create Campaign"
3. Select the template you created
4. Copy the cURL example provided
5. Note the campaign name (you'll need this for environment variables)

**Campaign Names** (must match your templates):
- `otp_verification`
- `photo_match_notification`
- `download_reminder`
- `event_start_notification`

---

## Step 3: Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# AiSensy WhatsApp API
AISENSY_API_KEY=your_aisensy_api_key_here
AISENSY_BASE_URL=https://backend.aisensy.com

# Campaign names (must match campaigns created in AiSensy dashboard)
AISENSY_CAMPAIGN_OTP=otp_verification
AISENSY_CAMPAIGN_PHOTO_MATCH=photo_match_notification
AISENSY_CAMPAIGN_REMINDER=download_reminder
AISENSY_CAMPAIGN_EVENT_START=event_start_notification
```

**To find your API Key**:
1. Log in to AiSensy Dashboard
2. Go to Settings → API Settings
3. Copy your API Key

---

## Step 4: Test the Integration

### Test OTP Sending

```bash
curl -X POST http://localhost:3000/api/v1/whatsapp/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919876543210"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": 600
}
```

### Test OTP Verification

```bash
curl -X POST http://localhost:3000/api/v1/whatsapp/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919876543210",
    "otp": "123456",
    "sessionId": "your-session-id"
  }'
```

---

## API Endpoint Reference

### AiSensy API Endpoint

**URL**: `https://backend.aisensy.com/campaign/t1/api/v2`

**Method**: POST

**Headers**:
```json
{
  "Content-Type": "application/json"
}
```

**Request Body**:
```json
{
  "apiKey": "your_api_key",
  "campaignName": "campaign_name",
  "destination": "919876543210",
  "userName": "User",
  "source": "FaceFind",
  "templateParams": ["param1", "param2"],
  "tags": ["tag1"],
  "attributes": {}
}
```

**Parameters**:
- `apiKey` (required): Your AiSensy API key
- `campaignName` (required): Campaign name from AiSensy dashboard
- `destination` (required): Phone number (without + sign, include country code)
- `userName` (required): Recipient's name
- `source` (optional): Source identifier
- `templateParams` (required): Array of template parameters
- `tags` (optional): Array of tags for categorization
- `attributes` (optional): Custom attributes

**Response**:
```json
{
  "status": "success",
  "message_id": "wamid.xxx"
}
```

---

## Phone Number Format

AiSensy expects phone numbers in **E.164 format without the + sign**:

- ✅ Correct: `919876543210` (India)
- ✅ Correct: `14155552671` (USA)
- ❌ Wrong: `+919876543210` (includes +)
- ❌ Wrong: `9876543210` (missing country code)

The service automatically removes `+` and spaces from phone numbers.

---

## Template Parameter Mapping

### OTP Template
```javascript
templateParams: [otp] // e.g., ["123456"]
```

### Photo Match Template
```javascript
templateParams: [eventName, photoCount, sessionUrl]
// e.g., ["Birthday Party", "15", "https://facefind.com/event/abc123/gallery"]
```

### Download Reminder Template
```javascript
templateParams: [eventName, daysRemaining, sessionUrl]
// e.g., ["Wedding Ceremony", "3", "https://facefind.com/event/xyz789/gallery"]
```

### Event Start Template
```javascript
templateParams: [eventName, scanUrl]
// e.g., ["Conference 2025", "https://facefind.com/event/def456"]
```

---

## Important Notes

### Template Approval
- Authentication templates: 15 seconds - 2 minutes
- Marketing templates: Up to 24 hours
- Templates must be approved before you can send messages

### Contact Management
- If a phone number doesn't exist in your AiSensy contacts, it will be automatically created
- Contacts are stored in AiSensy dashboard for future reference

### Media Support
- AiSensy supports sending images with messages
- Media URLs must be publicly accessible
- Currently not implemented in FaceFind (can be added if needed)

### Rate Limits
- Check your AiSensy plan for rate limits
- WhatsApp Business API has messaging limits based on your tier
- Start with lower volume and scale up as tier increases

### Opt-out Handling
- Users can reply "STOP" to opt out
- AiSensy automatically handles opt-outs
- Opted-out users won't receive further messages

---

## Troubleshooting

### "WhatsApp service not configured" Error
**Cause**: `AISENSY_API_KEY` is not set
**Solution**: Add the API key to your `.env.local` file and restart the server

### "Campaign not found" Error
**Cause**: Campaign name in code doesn't match AiSensy dashboard
**Solution**: Verify campaign names match exactly (case-sensitive)

### "Invalid phone number" Error
**Cause**: Phone number format is incorrect
**Solution**: Ensure phone number is in E.164 format with country code

### "Template not approved" Error
**Cause**: Template is still pending approval
**Solution**: Wait for template approval in AiSensy dashboard

### API Request Failed
**Cause**: Invalid API key or network issues
**Solution**:
1. Verify API key is correct
2. Check network connectivity
3. Verify AiSensy service is not down

---

## Production Considerations

### OTP Storage
Current implementation uses in-memory storage for OTPs. For production:
- Use **Redis** with TTL for distributed systems
- Use **DynamoDB** with TTL attribute
- Implement rate limiting to prevent abuse

### Security
- Never expose your API key in client-side code
- Store API key in environment variables only
- Use HTTPS for all API calls
- Implement phone number encryption for stored data

### Monitoring
- Log all WhatsApp message attempts
- Track delivery status
- Monitor failed deliveries
- Set up alerts for API failures

### Compliance
- Obtain user consent before sending messages
- Provide opt-out mechanism (automatic with AiSensy)
- Follow WhatsApp Business Policy
- Comply with local data protection regulations (GDPR, etc.)

---

## Migration from Twilio

If you were previously using Twilio:

1. **Environment Variables**: Remove old Twilio variables:
   ```bash
   # Remove these
   TWILIO_ACCOUNT_SID=
   TWILIO_AUTH_TOKEN=
   TWILIO_WHATSAPP_NUMBER=
   ```

2. **Code Changes**: No code changes needed! The service interface remains the same.

3. **Testing**: Test all WhatsApp features before removing Twilio credentials.

---

## Support

- **AiSensy Documentation**: [wiki.aisensy.com](https://wiki.aisensy.com)
- **AiSensy Support**: Available in the dashboard
- **FaceFind Issues**: Report at your project repository

---

## Next Steps

1. ✅ Create AiSensy account
2. ✅ Apply for WhatsApp Business API access
3. ✅ Create message templates
4. ✅ Create API campaigns
5. ✅ Configure environment variables
6. ✅ Test OTP sending
7. ✅ Test notification sending
8. 🚀 Deploy to production

---

**Last Updated**: November 5, 2025
**Version**: 1.0.0
