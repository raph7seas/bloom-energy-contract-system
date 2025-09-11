# AWS Deployment Configuration - Claude-Only

## 🔒 Secure Claude Integration for AWS

This system is configured to use **Claude (Anthropic) exclusively** for maximum security in AWS environments where AI services cannot leave the secure network perimeter.

## 🏗️ AWS Architecture

### Security-First Design
```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   VPC Private       │    │   Application       │    │   Database          │
│   Subnet            │◄──►│   Load Balancer     │◄──►│   RDS PostgreSQL    │
│                     │    │   (ALB)            │    │   (Private)         │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
         │                            │                            │
         ▼                            ▼                            ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   NAT Gateway       │    │   ECS Fargate       │    │   ElastiCache       │
│   (Claude API)      │    │   (App Container)   │    │   Redis (Cache)     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

### Key Security Features
- **VPC Isolation**: All resources in private subnets
- **NAT Gateway**: Controlled outbound access to Claude API only
- **No Internet Gateway**: Prevents unauthorized external access
- **Security Groups**: Restrictive firewall rules
- **IAM Roles**: Minimal permissions principle
- **Secrets Manager**: Secure API key storage
- **CloudTrail**: Full audit logging

## 🔧 Environment Variables for Production

### Core Configuration
```bash
# Application
NODE_ENV=production
PORT=3001

# Database (from RDS)
DATABASE_URL=${AWS_RDS_DATABASE_URL}

# Security
JWT_SECRET=${AWS_SECRET_MANAGER_JWT_SECRET}
CORS_ORIGIN=${CLOUDFRONT_DOMAIN}

# Claude Configuration
ANTHROPIC_API_KEY=${AWS_SECRET_MANAGER_ANTHROPIC_KEY}
DEFAULT_AI_PROVIDER=anthropic
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_MAX_TOKENS=4000
ANTHROPIC_TEMPERATURE=0.7
AI_REQUEST_TIMEOUT=30000

# AWS Integration
AWS_REGION=us-west-2
ENABLE_AWS_SECRETS_MANAGER=true
ENABLE_VPC_ENDPOINT=true

# Caching (Redis)
REDIS_URL=${ELASTICACHE_REDIS_URL}
USE_REDIS=true
CACHE_TTL=3600

# Logging
LOG_LEVEL=info
CLOUDWATCH_LOG_GROUP=/aws/ecs/bloom-energy-contracts
```

## 📦 Docker Configuration

### Production Dockerfile
```dockerfile
FROM node:20-alpine AS production

# Security: Non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application
COPY --chown=nextjs:nodejs . .

# Security: Remove unnecessary files
RUN rm -rf .git .env.example *.md docs/ tests/

USER nextjs
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

CMD ["node", "server/src/server.js"]
```

## 🔐 Security Considerations

### 1. Network Security
```bash
# Security Group Rules (Inbound)
Port 3001: ALB Security Group only
Port 443: CloudFront only

# Security Group Rules (Outbound)
Port 443: Claude API (anthropic.com) only
Port 5432: RDS Security Group only
Port 6379: ElastiCache Security Group only
```

### 2. IAM Permissions
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:*:*:secret:bloom-energy-*"
      ]
    },
    {
      "Effect": "Allow", 
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/ecs/bloom-energy-*"
    }
  ]
}
```

### 3. Secrets Management
```bash
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name "bloom-energy-anthropic-key" \
  --description "Anthropic Claude API Key" \
  --secret-string "sk-ant-api03-..."

aws secretsmanager create-secret \
  --name "bloom-energy-jwt-secret" \
  --description "JWT Signing Secret" \
  --generate-secret-string SecretStringTemplate='{"jwt":""}' \
    --generate-secret-string GenerateStringKey='jwt' \
    --generate-secret-string PasswordLength=64 \
    --generate-secret-string ExcludeCharacters=' "%@\'
```

## 🚀 Deployment Steps

### 1. Infrastructure as Code (CDK)
```typescript
// lib/bloom-energy-stack.ts
const vpc = new ec2.Vpc(this, 'BloomEnergyVPC', {
  natGateways: 1,
  maxAzs: 2,
  subnetConfiguration: [
    {
      cidrMask: 24,
      name: 'private',
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    },
    {
      cidrMask: 24, 
      name: 'public',
      subnetType: ec2.SubnetType.PUBLIC,
    }
  ]
});

// ECS Cluster
const cluster = new ecs.Cluster(this, 'BloomEnergyCluster', {
  vpc,
  containerInsights: true
});

// RDS Database
const database = new rds.DatabaseInstance(this, 'BloomEnergyDB', {
  engine: rds.DatabaseInstanceEngine.postgres({
    version: rds.PostgresEngineVersion.VER_15
  }),
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MEDIUM),
  allocatedStorage: 100,
  storageEncrypted: true,
  backupRetention: Duration.days(7),
  deletionProtection: true
});
```

### 2. ECS Task Definition
```json
{
  "family": "bloom-energy-contracts",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/BloomEnergyTaskRole",
  "containerDefinitions": [
    {
      "name": "bloom-energy-api",
      "image": "ACCOUNT.dkr.ecr.us-west-2.amazonaws.com/bloom-energy:latest",
      "portMappings": [{"containerPort": 3001, "protocol": "tcp"}],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "AWS_REGION", "value": "us-west-2"}
      ],
      "secrets": [
        {
          "name": "ANTHROPIC_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-west-2:ACCOUNT:secret:bloom-energy-anthropic-key"
        },
        {
          "name": "JWT_SECRET", 
          "valueFrom": "arn:aws:secretsmanager:us-west-2:ACCOUNT:secret:bloom-energy-jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/aws/ecs/bloom-energy-contracts",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

## 📊 Monitoring & Observability

### CloudWatch Metrics
- API response times
- Claude API usage/costs  
- Database connection pool
- Cache hit rates
- Error rates by endpoint

### CloudWatch Alarms
- High error rates (>5%)
- Slow response times (>2s)
- Database connection failures
- Memory utilization (>80%)
- Claude API rate limits

### AWS X-Ray Tracing
- Request flow visualization
- Performance bottlenecks
- Third-party dependency tracking

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Deploy to AWS ECS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
        aws-region: us-west-2
    
    - name: Build and push Docker image
      run: |
        aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
        docker build -t bloom-energy:latest .
        docker tag bloom-energy:latest $ECR_REGISTRY/bloom-energy:latest
        docker push $ECR_REGISTRY/bloom-energy:latest
    
    - name: Deploy to ECS
      run: |
        aws ecs update-service --cluster bloom-energy --service bloom-energy-api --force-new-deployment
```

## 🛡️ Security Checklist

- [ ] VPC with private subnets configured
- [ ] Security groups restrict access appropriately  
- [ ] NAT Gateway configured for Claude API access only
- [ ] RDS in private subnet with encryption at rest
- [ ] Secrets stored in AWS Secrets Manager
- [ ] IAM roles follow principle of least privilege
- [ ] CloudTrail logging enabled
- [ ] WAF configured on ALB
- [ ] SSL/TLS certificates from ACM
- [ ] Regular security scanning enabled

## 💰 Cost Optimization

### Claude Usage Optimization
- Implement request caching (reduces API calls by ~70%)
- Set appropriate max tokens limit (4000 recommended)
- Use batch processing for bulk operations
- Monitor usage with CloudWatch metrics

### Infrastructure Optimization
- Use Fargate Spot instances for non-critical workloads
- Right-size RDS instances based on usage patterns
- Implement auto-scaling for ECS services
- Use Reserved Instances for predictable workloads

This architecture ensures maximum security while maintaining high performance and cost efficiency for the Bloom Energy Contract Management System.