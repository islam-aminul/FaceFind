import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'facefindPhotos',
  access: (allow) => ({
    'originals/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
    'processed/*': [
      allow.authenticated.to(['read', 'write']),
      allow.guest.to(['read']),
    ],
    'thumbnails/*': [
      allow.authenticated.to(['read', 'write']),
      allow.guest.to(['read']),
    ],
    'qr-codes/*': [
      allow.authenticated.to(['read', 'write']),
      allow.guest.to(['read']),
    ],
    'event-assets/*': [
      allow.authenticated.to(['read', 'write']),
      allow.guest.to(['read']),
    ],
  }),
});
