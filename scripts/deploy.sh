#!/bin/bash

# Bloom Energy Contract System - Deployment Script
# Usage: ./scripts/deploy.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
AWS_REGION=${AWS_REGION:-us-west-2}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REPOSITORY_NAME="bloom-energy-contract-system"

echo "🚀 Starting deployment for environment: $ENVIRONMENT"
echo "📍 Region: $AWS_REGION"
echo "🏗️  Account ID: $AWS_ACCOUNT_ID"

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo "❌ Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

# Check if required tools are installed
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI is required but not installed. Aborting." >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }

echo "✅ Prerequisites check passed"

# Create ECR repository if it doesn't exist
echo "📦 Setting up ECR repository..."
aws ecr describe-repositories --repository-names $REPOSITORY_NAME --region $AWS_REGION >/dev/null 2>&1 || {
    echo "🔨 Creating ECR repository..."
    aws ecr create-repository \
        --repository-name $REPOSITORY_NAME \
        --region $AWS_REGION \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256
}

# Get ECR login token
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and tag Docker image
IMAGE_TAG=$(git rev-parse --short HEAD)
IMAGE_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_NAME:$IMAGE_TAG"
LATEST_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_NAME:latest"

echo "🔨 Building Docker image..."
docker build -f docker/Dockerfile.production -t $REPOSITORY_NAME:$IMAGE_TAG .
docker tag $REPOSITORY_NAME:$IMAGE_TAG $IMAGE_URI
docker tag $REPOSITORY_NAME:$IMAGE_TAG $LATEST_URI

echo "⬆️  Pushing Docker image to ECR..."
docker push $IMAGE_URI
docker push $LATEST_URI

# Deploy CloudFormation stack if it's the first deployment
STACK_NAME="bloom-contracts-$ENVIRONMENT"

if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $AWS_REGION >/dev/null 2>&1; then
    echo "📋 Stack $STACK_NAME already exists, updating..."
    OPERATION="update-stack"
else
    echo "🆕 Creating new stack $STACK_NAME..."
    OPERATION="create-stack"
fi

# Prepare CloudFormation parameters
PARAMETERS="ParameterKey=EnvironmentName,ParameterValue=bloom-contracts-$ENVIRONMENT"

# Add Anthropic API Key if provided
if [[ -n "$ANTHROPIC_API_KEY" ]]; then
    PARAMETERS="$PARAMETERS ParameterKey=AnthropicApiKey,ParameterValue=$ANTHROPIC_API_KEY"
else
    echo "⚠️  Warning: ANTHROPIC_API_KEY not provided. You'll need to update it manually in AWS Secrets Manager."
fi

# Add JWT Secret if provided
if [[ -n "$JWT_SECRET" ]]; then
    PARAMETERS="$PARAMETERS ParameterKey=JwtSecret,ParameterValue=$JWT_SECRET"
fi

echo "☁️  Deploying CloudFormation stack..."
aws cloudformation $OPERATION \
    --stack-name $STACK_NAME \
    --template-body file://aws/cloudformation-template.yml \
    --parameters $PARAMETERS \
    --capabilities CAPABILITY_IAM \
    --region $AWS_REGION

echo "⏳ Waiting for stack deployment to complete..."
if [[ "$OPERATION" == "create-stack" ]]; then
    aws cloudformation wait stack-create-complete --stack-name $STACK_NAME --region $AWS_REGION
else
    aws cloudformation wait stack-update-complete --stack-name $STACK_NAME --region $AWS_REGION
fi

# Update ECS service to use new image
echo "🔄 Updating ECS service..."
aws ecs update-service \
    --cluster bloom-contracts-$ENVIRONMENT-cluster \
    --service bloom-contracts-$ENVIRONMENT-service \
    --task-definition bloom-contracts-$ENVIRONMENT-task \
    --region $AWS_REGION

echo "⏳ Waiting for ECS deployment to complete..."
aws ecs wait services-stable \
    --cluster bloom-contracts-$ENVIRONMENT-cluster \
    --services bloom-contracts-$ENVIRONMENT-service \
    --region $AWS_REGION

# Get deployment outputs
LOAD_BALANCER_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $AWS_REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerUrl`].OutputValue' \
    --output text)

echo ""
echo "🎉 Deployment completed successfully!"
echo "📍 Environment: $ENVIRONMENT"
echo "🌐 Application URL: $LOAD_BALANCER_URL"
echo "📊 Health Check: $LOAD_BALANCER_URL/api/health"
echo ""
echo "🔧 Next steps:"
echo "   1. Update your DNS to point to: $LOAD_BALANCER_URL"
echo "   2. Configure SSL certificate in AWS Certificate Manager"
echo "   3. Update the load balancer listener to use HTTPS"
echo "   4. Run database migrations if this is the first deployment"
echo ""

# Optional: Run health check
if command -v curl >/dev/null 2>&1; then
    echo "🏥 Running health check..."
    sleep 30  # Wait for service to be ready
    if curl -f "$LOAD_BALANCER_URL/api/health" >/dev/null 2>&1; then
        echo "✅ Health check passed!"
    else
        echo "⚠️  Health check failed. Please check the logs."
    fi
fi

echo "🎉 Deployment script completed!"