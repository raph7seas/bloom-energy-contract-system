# AWS Bedrock Integration Setup Guide

## Overview
Your Bloom Energy Contract System now supports **AWS Bedrock** as an AI provider, allowing you to use Claude models through Amazon's managed service instead of direct API calls.

## Benefits of Using Bedrock
- ✅ **No API key management** - Uses AWS IAM credentials
- ✅ **Enterprise-grade security** - Integrated with AWS security controls
- ✅ **Better for production** - Built-in monitoring, logging, and cost tracking
- ✅ **Scalability** - AWS handles infrastructure scaling
- ✅ **Compliance** - Leverage AWS compliance certifications

---

## Installation

### 1. Install AWS SDK
```bash
npm install @aws-sdk/client-bedrock-runtime
```

### 2. Configure Environment Variables
Add these to your `.env` file:

```env
# Choose AI provider: "anthropic", "bedrock", or "openai"
DEFAULT_AI_PROVIDER="bedrock"

# AWS Configuration
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"

# Bedrock Model Configuration
BEDROCK_MODEL_ID="anthropic.claude-3-5-sonnet-20241022-v2:0"
BEDROCK_MAX_TOKENS="2000"
BEDROCK_TEMPERATURE="0.5"
BEDROCK_TOP_K="250"
BEDROCK_TOP_P="1"
```

### 3. AWS Bedrock Model Access
You must enable model access in AWS Bedrock console:

1. Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/)
2. Navigate to "Model access" in the left sidebar
3. Click "Manage model access"
4. Enable **Anthropic Claude 3.5 Sonnet** (or your desired model)
5. Wait for access to be granted (usually instant)

---

## Available Bedrock Models

### Anthropic Claude Models on Bedrock
```
anthropic.claude-3-5-sonnet-20241022-v2:0   # Balanced performance (recommended)
anthropic.claude-3-opus-20240229-v1:0       # Most capable
anthropic.claude-3-sonnet-20240229-v1:0     # Balanced (older)
anthropic.claude-3-haiku-20240307-v1:0      # Fast, efficient (older)
```

---

## Code Example

Your client provided this Bedrock code pattern:

```python
response = bedrock.invoke_model_with_response_stream(
    modelId='anthropic.claude-3-5-sonnet-20241022-v2:0',
    contentType='application/json',
    accept='application/json',
    body=json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "messages": messages,
        "max_tokens": 2000,
        "temperature": 0.5,
        "top_k": 250,
        "top_p": 1
    })
)

full_response = ""
for event in response['body']:
    if "chunk" in event:
        chunk_data = event["chunk"]["bytes"]
        full_response += chunk_data.decode("utf-8")
```

**This has been implemented** in [server/src/services/bedrockService.js](server/src/services/bedrockService.js)

---

## Usage

### Automatic Provider Selection
The system automatically uses the provider specified in `DEFAULT_AI_PROVIDER`:

```javascript
// In your .env
DEFAULT_AI_PROVIDER="bedrock"  // Uses AWS Bedrock
// or
DEFAULT_AI_PROVIDER="anthropic"  // Uses direct Anthropic API
```

### API Endpoints (No Changes Required)
All existing API endpoints work the same:

```bash
# Extract business rules from contract
POST /api/documents/analyze/:contractId

# AI chat assistant
POST /api/ai/chat

# Contract optimization
POST /api/contracts/optimize/:id
```

---

## AWS IAM Permissions

### Required IAM Policy
Your AWS user/role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
      ]
    }
  ]
}
```

### Using IAM Roles (Production)
For production deployments on AWS (EC2, ECS, Lambda):
- Don't set `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY`
- Attach an IAM role with Bedrock permissions to your compute resource
- The SDK will automatically use the IAM role credentials

---

## Testing the Integration

### 1. Test Bedrock Connection
```bash
# Check if Bedrock is accessible
curl -X GET http://localhost:4003/api/ai/health
```

### 2. Test Document Analysis
```bash
# Upload and analyze a document
curl -X POST http://localhost:4003/api/documents/analyze/1
```

### 3. Test AI Chat
```bash
curl -X POST http://localhost:4003/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the optimal contract term for a 2800kW system?"}'
```

---

## Architecture

### Service Layer Structure
```
aiService.js (main service)
├── Uses bedrockService.js (if DEFAULT_AI_PROVIDER=bedrock)
└── Uses @anthropic-ai/sdk (if DEFAULT_AI_PROVIDER=anthropic)

bedrockService.js
├── invokeModelStream() - Streaming responses
├── invokeModel() - Complete responses
├── extractBusinessRules() - Contract analysis
├── chat() - AI chat
└── chatStream() - Streaming chat
```

### Request Flow
```
Client Request
    ↓
API Route (e.g., /api/documents/analyze)
    ↓
aiService.extractBusinessRules()
    ↓
[if provider=bedrock]
    ↓
bedrockService.invokeModelStream()
    ↓
AWS Bedrock API
    ↓
Claude Model Response
    ↓
Stream Processing
    ↓
Return to Client
```

---

## Cost Comparison

### Direct Anthropic API
- Charged per token directly by Anthropic
- No additional AWS costs
- Simpler billing

### AWS Bedrock
- Charged per token through AWS billing
- Includes AWS infrastructure costs (minimal)
- Consolidated with other AWS services
- Better for enterprise cost tracking

### Pricing (as of 2025)
Model: Claude 3.5 Sonnet
- Input: ~$0.003 per 1K tokens
- Output: ~$0.015 per 1K tokens

*(Check AWS and Anthropic pricing pages for current rates)*

---

## Switching Between Providers

### Switch to Bedrock
```env
DEFAULT_AI_PROVIDER="bedrock"
```

### Switch to Direct Anthropic
```env
DEFAULT_AI_PROVIDER="anthropic"
ANTHROPIC_API_KEY="sk-ant-..."
```

### No Code Changes Required
The system handles provider selection automatically at runtime.

---

## Troubleshooting

### Error: "Bedrock not configured"
**Solution:** Set AWS credentials in `.env`:
```env
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
```

### Error: "AccessDeniedException"
**Solution:** Enable model access in Bedrock console:
1. Go to AWS Bedrock Console
2. Click "Model access"
3. Enable Anthropic Claude models

### Error: "Model not found"
**Solution:** Check model ID format:
```env
# Correct format
BEDROCK_MODEL_ID="anthropic.claude-3-5-sonnet-20241022-v2:0"

# Wrong format (missing version)
BEDROCK_MODEL_ID="anthropic.claude-3-5-sonnet"
```

### Error: "Rate limit exceeded"
**Solution:** Bedrock has higher default rate limits than direct API. If you hit limits:
1. Request quota increase in AWS Service Quotas console
2. Implement request queuing (already built-in)

---

## Monitoring

### CloudWatch Logs
Bedrock logs are automatically sent to CloudWatch:
```bash
aws logs tail /aws/bedrock/modelinvocations --follow
```

### Cost Tracking
View Bedrock costs in AWS Cost Explorer:
1. Go to AWS Cost Explorer
2. Filter by service: "Amazon Bedrock"
3. Group by model ID

---

## Production Deployment

### Using GitHub Actions
Your CI/CD pipeline automatically uses Bedrock if configured:

```yaml
# .github/workflows/ci-cd.yml
env:
  DEFAULT_AI_PROVIDER: bedrock
  AWS_REGION: us-west-2
  # AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from secrets
```

### Using ECS/Fargate
Attach IAM role to ECS task definition:
```json
{
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/BloomContractTaskRole",
  "containerDefinitions": [{
    "environment": [
      { "name": "DEFAULT_AI_PROVIDER", "value": "bedrock" },
      { "name": "AWS_REGION", "value": "us-west-2" }
    ]
  }]
}
```

---

## Files Modified

### New Files
- `server/src/services/bedrockService.js` - AWS Bedrock integration service

### Modified Files
- `server/src/services/aiService.js` - Updated to support multiple providers
- `.env.example` - Added Bedrock configuration options

---

## Support

For issues with:
- **Bedrock setup**: Check AWS Bedrock documentation
- **Model access**: Verify model access in Bedrock console
- **Permissions**: Review IAM policy above
- **Integration**: Check application logs for detailed errors

---

## Next Steps

1. **Install dependencies**: `npm install @aws-sdk/client-bedrock-runtime`
2. **Configure .env**: Set `DEFAULT_AI_PROVIDER="bedrock"` and AWS credentials
3. **Enable model access**: Go to AWS Bedrock console and enable Claude models
4. **Test**: Run a document analysis or chat request
5. **Monitor**: Check CloudWatch logs and Cost Explorer

---

**🎉 Your system is now ready to use AWS Bedrock!**
