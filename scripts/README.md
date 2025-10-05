# Scripts Directory

This directory contains utility scripts for setting up and testing FaceFind.

## Available Scripts

### setup-aws.sh
Automated AWS resource provisioning script.

**Usage:**
```bash
chmod +x setup-aws.sh
./setup-aws.sh
```

**What it does:**
- Creates S3 bucket with encryption and versioning
- Creates all DynamoDB tables with proper indexes
- Configures TTL for auto-deletion
- Sets up initial AWS infrastructure

**Requirements:**
- AWS CLI installed and configured
- Appropriate IAM permissions

### test-sandbox.ts
Comprehensive sandbox test demonstrating all features.

**Usage:**
```bash
npx ts-node test-sandbox.ts
```

**What it does:**
- Creates sample users (admin, organizer, photographers)
- Creates a test event
- Assigns photographers
- Demonstrates the complete workflow

**Note:** Requires AWS resources to be set up first.

## Adding New Scripts

When adding new scripts:
1. Add clear documentation at the top
2. Use descriptive error messages
3. Include usage examples
4. Make bash scripts executable: `chmod +x script.sh`
5. Update this README

## Troubleshooting

### Script fails with "command not found"
- Install required dependencies (aws-cli, node, ts-node)
- Ensure scripts are executable: `chmod +x script.sh`

### Permission errors
- Check AWS IAM permissions
- Verify credentials in .env.local

### Table/bucket already exists
- Scripts are idempotent and will skip existing resources
- Check AWS Console to verify resources
