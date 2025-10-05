import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: 'CODE',
      verificationEmailSubject: 'Welcome to FaceFind - Verify your email',
      verificationEmailBody: (createCode) =>
        `Your verification code is {${createCode()}}. Welcome to FaceFind!`,
    },
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
    givenName: {
      required: true,
      mutable: true,
    },
    familyName: {
      required: true,
      mutable: true,
    },
    phoneNumber: {
      required: false,
      mutable: true,
    },
    'custom:role': {
      dataType: 'String',
      mutable: true,
    },
    'custom:companyName': {
      dataType: 'String',
      mutable: true,
    },
  },
  groups: ['ADMIN', 'ORGANIZER', 'PHOTOGRAPHER'],
});
