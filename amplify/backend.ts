import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { photoProcessor } from './functions/photo-processor/resource';
import { cleanupGracePeriod } from './functions/cleanup-grace-period/resource';
import { cleanupRetention } from './functions/cleanup-retention/resource';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  photoProcessor,
  cleanupGracePeriod,
  cleanupRetention,
});

// Enable USER_PASSWORD_AUTH flow for server-side authentication
const { cfnUserPoolClient } = backend.auth.resources.cfnResources;
cfnUserPoolClient.explicitAuthFlows = [
  'ALLOW_USER_PASSWORD_AUTH',
  'ALLOW_USER_SRP_AUTH',
  'ALLOW_REFRESH_TOKEN_AUTH',
];

// Configure S3 trigger for photo processing
// When a file is uploaded to the 'originals/' folder, trigger the Lambda
backend.storage.resources.bucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.LambdaDestination(backend.photoProcessor.resources.lambda),
  {
    prefix: 'originals/',
  }
);

// Grant Lambda permissions to access DynamoDB tables
backend.data.resources.tables['Photo'].grantReadWriteData(
  backend.photoProcessor.resources.lambda
);
backend.data.resources.tables['Event'].grantReadData(
  backend.photoProcessor.resources.lambda
);

// Grant Lambda permissions for Rekognition
backend.photoProcessor.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'rekognition:IndexFaces',
      'rekognition:DetectFaces',
      'rekognition:SearchFacesByImage',
    ],
    resources: ['*'],
  })
);

// Configure scheduled cleanup functions

// Grace Period Cleanup - runs daily at midnight UTC
const gracePeriodRule = new events.Rule(backend.cleanupGracePeriod.resources.lambda.stack, 'GracePeriodCleanupSchedule', {
  schedule: events.Schedule.cron({
    minute: '0',
    hour: '0',
    day: '*',
    month: '*',
    year: '*',
  }),
  description: 'Trigger grace period cleanup daily at midnight UTC',
});

gracePeriodRule.addTarget(
  new targets.LambdaFunction(backend.cleanupGracePeriod.resources.lambda)
);

// Grant permissions for cleanup-grace-period Lambda
backend.data.resources.tables['Event'].grantReadWriteData(
  backend.cleanupGracePeriod.resources.lambda
);
backend.data.resources.tables['Session'].grantReadWriteData(
  backend.cleanupGracePeriod.resources.lambda
);

backend.cleanupGracePeriod.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['ses:SendEmail'],
    resources: ['*'],
  })
);

// Retention Cleanup - runs daily at 1 AM UTC
const retentionRule = new events.Rule(backend.cleanupRetention.resources.lambda.stack, 'RetentionCleanupSchedule', {
  schedule: events.Schedule.cron({
    minute: '0',
    hour: '1',
    day: '*',
    month: '*',
    year: '*',
  }),
  description: 'Trigger retention cleanup daily at 1 AM UTC',
});

retentionRule.addTarget(
  new targets.LambdaFunction(backend.cleanupRetention.resources.lambda)
);

// Grant permissions for cleanup-retention Lambda
backend.data.resources.tables['Event'].grantReadWriteData(
  backend.cleanupRetention.resources.lambda
);
backend.data.resources.tables['Photo'].grantReadWriteData(
  backend.cleanupRetention.resources.lambda
);

backend.storage.resources.bucket.grantReadWrite(
  backend.cleanupRetention.resources.lambda
);

backend.cleanupRetention.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'rekognition:DeleteCollection',
      'ses:SendEmail',
    ],
    resources: ['*'],
  })
);

export default backend;
