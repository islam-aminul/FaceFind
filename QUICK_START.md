# FaceFind - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- AWS CLI configured with credentials
- AWS Amplify CLI installed

### Start Development

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Start development server
npm run dev
```

The application will be available at **http://localhost:3000**

### Test Login

1. Navigate to http://localhost:3000/login
2. Use these credentials:
   ```
   Email: test@facefind.com
   Password: Test@123456
   ```
3. You should be redirected to the admin dashboard

### API Testing

Test the login endpoint directly:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@facefind.com","password":"Test@123456"}'
```

### Amplify Sandbox

The Amplify sandbox is already deployed. To check status:

```bash
# Deploy/update sandbox
npx ampx sandbox --once

# Run sandbox in watch mode
npx ampx sandbox
```

### AWS Resources

All AWS resources are deployed in **ap-south-1** (Mumbai) region:

- **Cognito User Pool**: ap-south-1_Hef2kiqUJ
- **S3 Bucket**: amplify-facefind-aminulis-facefindphotosbucket7b5c-2t1fe2jpyeqn
- **AppSync API**: https://jxnl434qardy5nperfgw7ah4oa.appsync-api.ap-south-1.amazonaws.com/graphql

### User Roles

The application supports three user roles:

1. **ADMIN** - Full system access
2. **ORGANIZER** - Can create and manage events
3. **PHOTOGRAPHER** - Can upload photos to events

### Common Tasks

#### Create a New User in Cognito

```bash
aws cognito-idp admin-create-user \
  --user-pool-id ap-south-1_Hef2kiqUJ \
  --username user@example.com \
  --user-attributes Name=email,Value=user@example.com Name=given_name,Value=John Name=family_name,Value=Doe \
  --region ap-south-1
```

#### Set User Password

```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id ap-south-1_Hef2kiqUJ \
  --username user@example.com \
  --password "YourPassword123!" \
  --permanent \
  --region ap-south-1
```

#### Add User to Group

```bash
aws cognito-idp admin-add-user-to-group \
  --user-pool-id ap-south-1_Hef2kiqUJ \
  --username user@example.com \
  --group-name ORGANIZER \
  --region ap-south-1
```

### Troubleshooting

#### Port 3000 already in use

```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Then restart
npm run dev
```

#### Amplify configuration issues

```bash
# Regenerate amplify_outputs.json
npx ampx sandbox --once
```

#### Build errors

```bash
# Clean build
rm -rf .next
npm run build
```

### Development Workflow

1. **Make changes** to your code
2. **Test locally** at http://localhost:3000
3. **Run build** to check for TypeScript errors: `npm run build`
4. **Update sandbox** if backend changes: `npx ampx sandbox --once`
5. **Commit changes** when ready

### Production Deployment

For production deployment, see `DEPLOYMENT_STATUS.md` for detailed information about the deployed resources.

### Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [AWS Amplify Gen 2 Docs](https://docs.amplify.aws/)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)

---

**Happy Coding! 🎉**
