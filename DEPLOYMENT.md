# 🚀 Bloom Energy Contract System - Deployment Guide

This guide covers deployment options for the Bloom Energy Contract Management System, from local Docker development to production AWS deployment.

## 📋 Prerequisites

### Required Tools
- **Docker & Docker Compose**: For containerized deployments
- **AWS CLI**: For AWS deployments (`aws configure` must be completed)
- **Node.js 20+**: For local development
- **Git**: Version control

### Required Credentials
- **Anthropic API Key**: Get from [console.anthropic.com](https://console.anthropic.com/account/keys)
- **AWS Account**: With appropriate permissions for ECS, RDS, S3, etc.
- **PostgreSQL Database**: Local or AWS RDS

---

## 🏠 Local Development Deployment

### Quick Start
```bash
# 1. Clone and setup
git clone <repository-url>
cd bloom-energy-contract-system

# 2. Install dependencies
npm install
cd server && npm install && cd ..

# 3. Setup environment
cp .env.example .env
# Edit .env with your values (especially ANTHROPIC_API_KEY)

# 4. Setup database
npx prisma generate
npx prisma migrate dev

# 5. Start development servers
npm run dev        # Frontend (Vite)
npm run server:dev # Backend (Node.js)
```

### Local Docker Deployment
```bash
# Start with Docker Compose
./scripts/deploy-local.sh up

# Other commands
./scripts/deploy-local.sh down     # Stop services
./scripts/deploy-local.sh logs     # View logs
./scripts/deploy-local.sh status   # Check status
./scripts/deploy-local.sh shell    # App shell
./scripts/deploy-local.sh db-shell # Database shell
```

**Access Points:**
- Application: http://localhost:4003
- Health Check: http://localhost:4003/api/health
- Database: localhost:5432
- Redis: localhost:6379

---

## ☁️ AWS Production Deployment

### 1. Prerequisites Setup

#### AWS CLI Configuration
```bash
aws configure
# Enter your AWS Access Key ID, Secret, Region (us-west-2), and output format (json)
```

#### Environment Variables
```bash
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export JWT_SECRET="your-secure-jwt-secret"
export AWS_REGION="us-west-2"
```

### 2. One-Click Deployment
```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production
```

### 3. Manual Step-by-Step Deployment

#### Step 1: Build and Push Docker Image
```bash
# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create ECR repository
aws ecr create-repository \
    --repository-name bloom-energy-contract-system \
    --region us-west-2

# Login to ECR
aws ecr get-login-password --region us-west-2 | \
    docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com

# Build and push
docker build -f docker/Dockerfile.production -t bloom-energy-contract-system:latest .
docker tag bloom-energy-contract-system:latest $AWS_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com/bloom-energy-contract-system:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com/bloom-energy-contract-system:latest
```

#### Step 2: Deploy Infrastructure
```bash
# Create CloudFormation stack
aws cloudformation create-stack \
    --stack-name bloom-contracts-production \
    --template-body file://aws/cloudformation-template.yml \
    --parameters \
        ParameterKey=EnvironmentName,ParameterValue=bloom-contracts-production \
        ParameterKey=AnthropicApiKey,ParameterValue=$ANTHROPIC_API_KEY \
        ParameterKey=JwtSecret,ParameterValue=$JWT_SECRET \
    --capabilities CAPABILITY_IAM \
    --region us-west-2
```

#### Step 3: Wait and Verify
```bash
# Wait for deployment
aws cloudformation wait stack-create-complete \
    --stack-name bloom-contracts-production \
    --region us-west-2

# Get load balancer URL
aws cloudformation describe-stacks \
    --stack-name bloom-contracts-production \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerUrl`].OutputValue' \
    --output text
```

---

## 🔄 CI/CD Pipeline Deployment

### GitHub Actions Setup

1. **Add Repository Secrets** (GitHub Settings > Secrets and variables > Actions):
   ```
   AWS_ACCESS_KEY_ID: <your-aws-access-key>
   AWS_SECRET_ACCESS_KEY: <your-aws-secret-key>
   ANTHROPIC_API_KEY: <your-anthropic-api-key>
   JWT_SECRET: <your-jwt-secret>
   ```

2. **Push to trigger deployment**:
   ```bash
   git push origin develop    # Deploy to staging
   git push origin main       # Deploy to production
   ```

### Pipeline Features
- ✅ Automated testing and linting
- 🔒 Security scanning with Snyk
- 🐳 Docker image building and pushing
- ☁️ AWS ECS deployment
- 🏥 Health checks and rollback
- 📊 Deployment notifications

---

## 🏗️ Infrastructure Overview

### AWS Resources Created
- **VPC**: Isolated network with public/private subnets
- **ECS Fargate**: Containerized application hosting
- **RDS PostgreSQL**: Managed database service
- **ElastiCache Redis**: In-memory caching
- **Application Load Balancer**: Traffic distribution
- **ECR**: Docker image registry
- **S3**: File upload storage
- **Secrets Manager**: Secure credential storage
- **CloudWatch**: Logging and monitoring

### Security Features
- 🔐 All services in private subnets
- 🛡️ Security groups with minimal access
- 🔒 Encrypted storage (RDS, S3, ElastiCache)
- 🎯 IAM roles with least privilege
- 🔑 Secrets managed via AWS Secrets Manager
- 📋 VPC endpoints for secure AWS service access

---

## 📊 Monitoring and Maintenance

### Health Checks
```bash
# Application health
curl https://your-domain.com/api/health

# Container health
docker exec bloom-app node server/scripts/health-check.js

# Database health
psql -h your-db-endpoint -U postgres -d bloom_contracts -c "SELECT 1;"
```

### Logs Access
```bash
# Local Docker
docker-compose logs -f app

# AWS CloudWatch
aws logs tail /ecs/bloom-contracts-production --follow
```

### Database Migrations
```bash
# Development
npx prisma migrate dev

# Production (via container)
docker exec bloom-app npx prisma migrate deploy
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Docker Build Failures
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker build --no-cache -f docker/Dockerfile.production -t bloom-app .
```

#### 2. Database Connection Issues
```bash
# Check environment variables
printenv | grep DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT version();"
```

#### 3. AWS Deployment Failures
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name bloom-contracts-production

# Check ECS service status
aws ecs describe-services \
    --cluster bloom-contracts-production-cluster \
    --services bloom-contracts-production-service
```

#### 4. Health Check Failures
```bash
# Check application logs
aws logs tail /ecs/bloom-contracts-production --follow

# Manual health check
curl -v http://your-load-balancer-url/api/health
```

### Performance Optimization

#### Database
- Enable connection pooling
- Add read replicas for high traffic
- Implement query optimization
- Regular VACUUM and ANALYZE

#### Application
- Enable Redis caching
- Implement CDN for static assets
- Use compression middleware
- Monitor memory usage

#### AWS Resources
- Auto Scaling Groups for ECS
- CloudFront CDN distribution
- ElastiCache cluster mode
- RDS Performance Insights

---

## 🔧 Configuration Reference

### Environment Variables
```bash
# Core Application
NODE_ENV=production
PORT=4003
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Authentication
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# AI Integration
ANTHROPIC_API_KEY=your-api-key
DEFAULT_AI_PROVIDER=anthropic
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# AWS
AWS_REGION=us-west-2
ENABLE_AWS_SECRETS_MANAGER=true

# File Uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/application.log
```

### Port Configuration
- **Development Frontend**: 4002 (Vite)
- **Development Backend**: 4003 (Node.js)
- **Production**: 4003 (Container)
- **Database**: 5432 (PostgreSQL)
- **Cache**: 6379 (Redis)

---

## 📚 Additional Resources

### Documentation Links
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Prisma Database Documentation](https://www.prisma.io/docs/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Anthropic API Documentation](https://docs.anthropic.com/)

### Monitoring Dashboards
- **AWS CloudWatch**: Application metrics and logs
- **ECS Console**: Container health and performance
- **RDS Console**: Database performance metrics
- **Application Health**: `/api/health` endpoint

### Support Contacts
- **AWS Support**: Through AWS Console
- **Database Issues**: Check CloudWatch logs
- **Application Issues**: GitHub Issues or internal support

---

**🎉 Congratulations! Your Bloom Energy Contract System is now deployed and ready for use.**

For questions or issues, refer to the troubleshooting section or create an issue in the repository.