# FaceFind Deployment Guide

This guide covers the deployment of FaceFind to production environments.

## Prerequisites

- AWS Account with appropriate permissions
- Domain name (optional, for custom domain)
- Node.js 18+ installed locally
- AWS CLI configured
- Git repository set up

## Environment Setup

### 1. AWS Resources Setup

Run the setup script to create all required AWS resources:

\`\`\`bash
chmod +x scripts/setup-aws.sh
./scripts/setup-aws.sh
\`\`\`

This script creates:
- S3 bucket for photos with encryption and versioning
- DynamoDB tables with appropriate indexes
- TTL configuration for automatic data deletion

### 2. Additional AWS Configuration

#### SES Email Verification

1. Go to AWS SES Console
2. Verify your sender email address
3. Request production access (if needed)

#### IAM User/Role

Create an IAM user with these policies:
- AmazonS3FullAccess (or custom policy for your bucket)
- AmazonDynamoDBFullAccess (or custom policy for your tables)
- AmazonRekognitionFullAccess
- AmazonSESFullAccess
- CloudWatchLogsFullAccess

#### Encryption Key

Generate a secure encryption key:

\`\`\`bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
\`\`\`

Save this key in your environment variables.

## Deployment Options

### Option 1: Vercel Deployment (Recommended)

1. **Install Vercel CLI**

\`\`\`bash
npm i -g vercel
\`\`\`

2. **Login to Vercel**

\`\`\`bash
vercel login
\`\`\`

3. **Configure Environment Variables**

Add all environment variables from \`.env.local.example\` to Vercel:

\`\`\`bash
vercel env add AWS_REGION
vercel env add AWS_ACCESS_KEY_ID
vercel env add AWS_SECRET_ACCESS_KEY
# ... add all other variables
\`\`\`

4. **Deploy**

\`\`\`bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
\`\`\`

### Option 2: AWS Amplify Hosting

1. **Connect Repository**
   - Go to AWS Amplify Console
   - Connect your GitHub/GitLab repository

2. **Configure Build Settings**

Create \`amplify.yml\`:

\`\`\`yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
\`\`\`

3. **Add Environment Variables**
   - In Amplify Console, add all environment variables

4. **Deploy**
   - Amplify will automatically deploy on git push

### Option 3: Docker Deployment

1. **Create Dockerfile**

\`\`\`dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
\`\`\`

2. **Build and Run**

\`\`\`bash
docker build -t facefind .
docker run -p 3000:3000 --env-file .env.local facefind
\`\`\`

### Option 4: Traditional VPS/EC2

1. **Provision Server**
   - Ubuntu 22.04 LTS recommended
   - Minimum 2GB RAM, 2 vCPUs

2. **Install Dependencies**

\`\`\`bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
\`\`\`

3. **Deploy Application**

\`\`\`bash
# Clone repository
git clone <your-repo-url> /var/www/facefind
cd /var/www/facefind

# Install dependencies
npm ci

# Build application
npm run build

# Create .env.local with production values
nano .env.local

# Start with PM2
pm2 start npm --name "facefind" -- start
pm2 save
pm2 startup
\`\`\`

4. **Configure Nginx**

\`\`\`nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
\`\`\`

5. **Enable HTTPS with Let's Encrypt**

\`\`\`bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
\`\`\`

## Post-Deployment

### 1. Create Admin User

After deployment, create the first admin user by directly inserting into DynamoDB or using AWS CLI:

\`\`\`bash
# This would typically be done through a setup script
# For now, use the API endpoint to create the admin user
\`\`\`

### 2. Configure Monitoring

Set up CloudWatch alarms for:
- API Gateway errors
- Lambda function errors
- DynamoDB throttling
- S3 bucket size
- Rekognition API calls

### 3. Set Up Backup

- Enable DynamoDB Point-in-Time Recovery
- Configure S3 versioning (already done in setup script)
- Set up automated snapshots

### 4. Performance Optimization

- Enable CloudFront CDN for static assets
- Configure S3 Transfer Acceleration
- Optimize DynamoDB capacity (switch to on-demand if needed)

### 5. Security Hardening

- Review IAM permissions (principle of least privilege)
- Enable AWS WAF on API Gateway
- Configure rate limiting
- Review security groups and VPC settings
- Enable AWS GuardDuty for threat detection

## Monitoring and Maintenance

### CloudWatch Dashboards

Create dashboards for:
- API request/error rates
- Face recognition success rates
- Photo upload rates
- Active sessions

### Logs

Configure centralized logging:
- API Gateway access logs
- Lambda function logs
- Application logs

### Scheduled Tasks

Set up Lambda functions with EventBridge for:
- Daily data cleanup (expired sessions, face templates)
- Retention policy enforcement
- Event status updates
- WhatsApp grace period reminders

## Rollback Procedure

If deployment fails:

1. **Vercel**: Revert to previous deployment in dashboard
2. **Amplify**: Redeploy previous commit
3. **PM2**: `pm2 reload facefind` with previous build
4. **Database**: Use Point-in-Time Recovery if needed

## Troubleshooting

### Common Issues

**Issue**: Face recognition not working
- Check Rekognition permissions
- Verify collection IDs
- Check image quality and size

**Issue**: Photos not uploading
- Verify S3 permissions
- Check bucket CORS configuration
- Verify file size limits

**Issue**: Email not sending
- Verify SES sender email
- Check SES sending limits
- Review SES bounce/complaint rates

### Support Checklist

- [ ] All environment variables set correctly
- [ ] AWS credentials have required permissions
- [ ] DynamoDB tables created with indexes
- [ ] S3 bucket accessible
- [ ] SES email verified
- [ ] CloudWatch logs configured
- [ ] Monitoring dashboards set up

## Scaling Considerations

### For High Traffic

- Switch DynamoDB to on-demand billing
- Enable DynamoDB auto-scaling
- Use S3 Transfer Acceleration
- Implement CloudFront caching
- Consider Lambda reserved concurrency
- Implement API Gateway caching

### Cost Optimization

- Use S3 Intelligent-Tiering
- Implement S3 lifecycle policies
- Review and optimize DynamoDB capacity
- Monitor and optimize Rekognition usage
- Use spot instances for batch processing

---

For additional support or questions, contact the development team.
