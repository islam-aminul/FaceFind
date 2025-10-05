#!/bin/bash

# FaceFind AWS Setup Script
# This script creates all required AWS resources

set -e

echo "🚀 FaceFind AWS Setup"
echo "====================="

# Configuration
REGION="ap-south-1"
S3_BUCKET="facefind-photos"
TABLES=(
  "facefind-users"
  "facefind-events"
  "facefind-photos"
  "facefind-face-templates"
  "facefind-sessions"
  "facefind-billing"
  "facefind-audit-logs"
  "facefind-photographer-assignments"
)

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first."
    exit 1
fi

echo "✅ AWS CLI found"

# Create S3 Bucket
echo ""
echo "📦 Creating S3 bucket: $S3_BUCKET"
aws s3 mb s3://$S3_BUCKET --region $REGION 2>/dev/null || echo "Bucket already exists"

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket $S3_BUCKET \
  --versioning-configuration Status=Enabled \
  --region $REGION

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket $S3_BUCKET \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }' \
  --region $REGION

echo "✅ S3 bucket configured"

# Create DynamoDB Tables
echo ""
echo "📊 Creating DynamoDB tables..."

# Users table
aws dynamodb create-table \
  --table-name facefind-users \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=email,AttributeType=S \
    AttributeName=role,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --global-secondary-indexes \
    "IndexName=email-index,KeySchema=[{AttributeName=email,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}" \
    "IndexName=role-index,KeySchema=[{AttributeName=role,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}" \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION 2>/dev/null || echo "Table facefind-users already exists"

# Events table
aws dynamodb create-table \
  --table-name facefind-events \
  --attribute-definitions \
    AttributeName=eventId,AttributeType=S \
    AttributeName=organizerId,AttributeType=S \
  --key-schema AttributeName=eventId,KeyType=HASH \
  --global-secondary-indexes \
    "IndexName=organizerId-index,KeySchema=[{AttributeName=organizerId,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}" \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION 2>/dev/null || echo "Table facefind-events already exists"

# Photos table
aws dynamodb create-table \
  --table-name facefind-photos \
  --attribute-definitions \
    AttributeName=photoId,AttributeType=S \
    AttributeName=eventId,AttributeType=S \
    AttributeName=photographerId,AttributeType=S \
  --key-schema AttributeName=photoId,KeyType=HASH \
  --global-secondary-indexes \
    "IndexName=eventId-index,KeySchema=[{AttributeName=eventId,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}" \
    "IndexName=photographerId-index,KeySchema=[{AttributeName=photographerId,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}" \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION 2>/dev/null || echo "Table facefind-photos already exists"

# Face Templates table (with TTL)
aws dynamodb create-table \
  --table-name facefind-face-templates \
  --attribute-definitions \
    AttributeName=faceId,AttributeType=S \
    AttributeName=eventId,AttributeType=S \
  --key-schema AttributeName=faceId,KeyType=HASH \
  --global-secondary-indexes \
    "IndexName=eventId-index,KeySchema=[{AttributeName=eventId,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}" \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION 2>/dev/null || echo "Table facefind-face-templates already exists"

# Enable TTL on face templates
aws dynamodb update-time-to-live \
  --table-name facefind-face-templates \
  --time-to-live-specification "Enabled=true,AttributeName=expiresAt" \
  --region $REGION 2>/dev/null || echo "TTL already enabled"

# Sessions table (with TTL)
aws dynamodb create-table \
  --table-name facefind-sessions \
  --attribute-definitions \
    AttributeName=sessionId,AttributeType=S \
    AttributeName=eventId,AttributeType=S \
  --key-schema AttributeName=sessionId,KeyType=HASH \
  --global-secondary-indexes \
    "IndexName=eventId-index,KeySchema=[{AttributeName=eventId,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}" \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION 2>/dev/null || echo "Table facefind-sessions already exists"

# Enable TTL on sessions
aws dynamodb update-time-to-live \
  --table-name facefind-sessions \
  --time-to-live-specification "Enabled=true,AttributeName=expiresAt" \
  --region $REGION 2>/dev/null || echo "TTL already enabled"

# Billing table
aws dynamodb create-table \
  --table-name facefind-billing \
  --attribute-definitions \
    AttributeName=billingId,AttributeType=S \
    AttributeName=eventId,AttributeType=S \
  --key-schema AttributeName=billingId,KeyType=HASH \
  --global-secondary-indexes \
    "IndexName=eventId-index,KeySchema=[{AttributeName=eventId,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}" \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION 2>/dev/null || echo "Table facefind-billing already exists"

# Audit Logs table
aws dynamodb create-table \
  --table-name facefind-audit-logs \
  --attribute-definitions \
    AttributeName=logId,AttributeType=S \
  --key-schema AttributeName=logId,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION 2>/dev/null || echo "Table facefind-audit-logs already exists"

# Photographer Assignments table
aws dynamodb create-table \
  --table-name facefind-photographer-assignments \
  --attribute-definitions \
    AttributeName=assignmentId,AttributeType=S \
    AttributeName=photographerId,AttributeType=S \
    AttributeName=eventId,AttributeType=S \
  --key-schema AttributeName=assignmentId,KeyType=HASH \
  --global-secondary-indexes \
    "IndexName=photographerId-index,KeySchema=[{AttributeName=photographerId,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}" \
    "IndexName=eventId-index,KeySchema=[{AttributeName=eventId,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}" \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION 2>/dev/null || echo "Table facefind-photographer-assignments already exists"

echo "✅ DynamoDB tables configured"

echo ""
echo "🎉 AWS setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env.local file with AWS credentials"
echo "2. Verify your SES sender email"
echo "3. Run 'npm install' to install dependencies"
echo "4. Run 'npm run dev' to start the development server"
