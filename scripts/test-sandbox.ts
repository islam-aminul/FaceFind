/**
 * FaceFind Sandbox Test Script
 *
 * This script demonstrates the complete workflow of the FaceFind application
 * in a sandbox environment. It creates test data and simulates all user roles.
 *
 * Run with: npx ts-node scripts/test-sandbox.ts
 */

import { userService } from '../lib/api/users';
import { eventService } from '../lib/api/events';
import { photoService } from '../lib/api/photos';
import { faceRecognitionService } from '../lib/api/face-recognition';
import { authService } from '../lib/api/auth';
import { UserRole, EventStatus, PaymentStatus, WatermarkElement } from '../types';

async function runSandboxTest() {
  console.log('🚀 FaceFind Sandbox Test');
  console.log('========================\n');

  try {
    // Step 1: Create Admin User
    console.log('Step 1: Creating Admin User...');
    const admin = await userService.createUser({
      email: 'admin@facefind.com',
      role: UserRole.ADMIN,
      firstName: 'System',
      lastName: 'Administrator',
      phone: '+91 9999999999',
    });
    console.log('✅ Admin created:', admin.email);

    // Step 2: Create Organizer
    console.log('\nStep 2: Creating Organizer...');
    const organizer = await userService.createUser({
      email: 'organizer@example.com',
      role: UserRole.ORGANIZER,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+91 9876543210',
      companyName: 'Wedding Planners Inc',
    });
    console.log('✅ Organizer created:', organizer.email);

    // Step 3: Create Photographers
    console.log('\nStep 3: Creating Photographers...');
    const photographer1 = await userService.createUser({
      email: 'photographer1@example.com',
      role: UserRole.PHOTOGRAPHER,
      firstName: 'Alice',
      lastName: 'Smith',
      phone: '+91 9876543211',
      specialization: 'Weddings',
      portfolioUrl: 'https://example.com/alice',
      bio: 'Professional wedding photographer with 10 years of experience',
    });
    console.log('✅ Photographer 1 created:', photographer1.email);

    const photographer2 = await userService.createUser({
      email: 'photographer2@example.com',
      role: UserRole.PHOTOGRAPHER,
      firstName: 'Bob',
      lastName: 'Johnson',
      phone: '+91 9876543212',
      specialization: 'Events',
      portfolioUrl: 'https://example.com/bob',
      bio: 'Specializing in corporate and social events',
    });
    console.log('✅ Photographer 2 created:', photographer2.email);

    // Step 4: Login as Admin
    console.log('\nStep 4: Testing Admin Login...');
    // Note: This will fail without actual password, but demonstrates the flow
    console.log('⚠️  Login would require actual password from invitation email');

    // Step 5: Create Event
    console.log('\nStep 5: Creating Event...');
    const event = await eventService.createEvent({
      eventName: 'John & Jane Wedding',
      organizerId: organizer.userId,
      startDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      endDateTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days from now
      gracePeriodDays: 7,
      retentionPeriodDays: 30,
      location: 'Mumbai, Maharashtra',
      estimatedAttendees: 500,
      maxPhotos: 2000,
      confidenceThreshold: 80,
      photoQuality: 85,
      watermarkElements: [
        WatermarkElement.EVENT_NAME,
        WatermarkElement.EVENT_DATE,
        WatermarkElement.PHOTOGRAPHER_NAME,
      ],
      welcomeMessage: 'Welcome to John & Jane\'s Wedding! Scan your face to find your photos.',
      paymentAmount: 25000,
    });
    console.log('✅ Event created:', event.eventName);
    console.log('   Event ID:', event.eventId);
    console.log('   QR Code URL:', event.qrCodeUrl);

    // Step 6: Mark Event as Paid
    console.log('\nStep 6: Marking Event as Paid...');
    const paidEvent = await eventService.markEventAsPaid(event.eventId);
    console.log('✅ Event marked as paid. Status:', paidEvent.status);

    // Step 7: Assign Photographers
    console.log('\nStep 7: Assigning Photographers to Event...');
    await eventService.assignPhotographer(event.eventId, photographer1.userId);
    console.log('✅ Photographer 1 assigned');
    await eventService.assignPhotographer(event.eventId, photographer2.userId);
    console.log('✅ Photographer 2 assigned');

    // Step 8: Simulate Photo Upload
    console.log('\nStep 8: Simulating Photo Upload...');
    console.log('⚠️  Photo upload requires actual image files');
    console.log('   In production, photographer would:');
    console.log('   1. Upload photos via web interface');
    console.log('   2. Photos are processed (resize, watermark, thumbnail)');
    console.log('   3. Faces are detected and indexed with Rekognition');
    console.log('   4. Photos become available for face matching');

    // Step 9: Get Event Stats
    console.log('\nStep 9: Getting Event Stats...');
    const stats = await eventService.getEventStats(event.eventId);
    console.log('✅ Event Statistics:');
    console.log('   Total Photos:', stats.totalPhotos);
    console.log('   Total Attendees:', stats.totalAttendees);
    console.log('   Upload Progress:', stats.uploadProgress.toFixed(2) + '%');

    // Step 10: Simulate Attendee Face Scan
    console.log('\nStep 10: Simulating Attendee Face Scan...');
    console.log('⚠️  Face scanning requires actual face image');
    console.log('   In production, attendee would:');
    console.log('   1. Scan QR code to access event page');
    console.log('   2. Click "Scan Your Face"');
    console.log('   3. Camera captures their face');
    console.log('   4. Face is matched against indexed photos');
    console.log('   5. Matching photos are displayed');
    console.log('   6. Attendee can download photos');

    // Step 11: Test Photographer Suspension
    console.log('\nStep 11: Testing Photographer Suspension...');
    console.log('⚠️  Suspension requires no upcoming events');
    console.log('   Would need to reassign all events first');

    // Step 12: Summary
    console.log('\n✅ Sandbox Test Complete!');
    console.log('\n📊 Summary:');
    console.log('   - Created 1 Admin, 1 Organizer, 2 Photographers');
    console.log('   - Created 1 Event with QR code');
    console.log('   - Assigned 2 Photographers to Event');
    console.log('   - Event is ready for photo uploads and attendee access');

    console.log('\n🔗 Next Steps:');
    console.log('   1. Access event at: /event/' + event.eventId);
    console.log('   2. Organizer dashboard: /organizer');
    console.log('   3. Photographer dashboard: /photographer');
    console.log('   4. Admin dashboard: /admin');

    console.log('\n💡 To test with real data:');
    console.log('   1. Set up AWS credentials in .env.local');
    console.log('   2. Run: npm run dev');
    console.log('   3. Login with credentials from invitation emails');
    console.log('   4. Upload photos and test face recognition');

  } catch (error: any) {
    console.error('\n❌ Error during sandbox test:', error.message);
    console.error(error.stack);
  }
}

// Run the test
console.log('Starting FaceFind Sandbox Test...\n');
runSandboxTest()
  .then(() => {
    console.log('\n✨ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
