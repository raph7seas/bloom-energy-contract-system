# AWS Textract Integration Guide

## Overview

The Bloom Energy Contract System now includes comprehensive AWS Textract integration for enhanced document processing capabilities. The system intelligently routes document processing between local OCR (Tesseract) and AWS Textract based on various factors including file size, cost thresholds, and required features.

## Architecture

### Components

1. **TextractManager** - Intelligent routing service that chooses between AWS and local processing
2. **AWSTextractService** - Full AWS Textract integration with S3 storage
3. **LocalTextractService** - Local Tesseract-based OCR processing
4. **DocumentProcessingService** - Updated to use the new Textract Manager

### Key Features

- ✅ **Intelligent Provider Selection** - Automatically chooses between AWS and local based on configuration
- ✅ **Cost Control** - Configurable cost thresholds and usage tracking
- ✅ **Fallback Support** - Automatic fallback to local processing if AWS fails
- ✅ **Advanced OCR Features** - Tables, forms, and layout analysis via AWS
- ✅ **Async Processing** - Support for large document processing via S3
- ✅ **Performance Tracking** - Detailed statistics and recommendations
- ✅ **S3 Integration** - Secure document storage with automatic cleanup

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
# AWS Textract Configuration
AWS_TEXTRACT_ENABLED="true"
PREFER_AWS_TEXTRACT="false"                    # Use local by default
MAX_LOCAL_TEXTRACT_SIZE="10485760"            # 10MB - use local for smaller files
AWS_COST_THRESHOLD="5.00"                     # Maximum cost per document in USD
AWS_S3_BUCKET="bloom-energy-contract-documents"
AWS_TEXTRACT_ROLE_ARN=""                      # Optional: IAM role for Textract
AWS_SNS_TOPIC_ARN=""                          # Optional: SNS topic for async notifications

# AWS Credentials
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
```

### AWS Setup Requirements

1. **IAM User/Role** with the following permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "textract:AnalyzeDocument",
           "textract:StartDocumentAnalysis",
           "textract:GetDocumentAnalysis",
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

2. **S3 Bucket** for temporary document storage:
   - Create bucket: `bloom-energy-contract-documents` (or your preferred name)
   - Enable versioning (optional but recommended)
   - Configure lifecycle rules to delete objects after 24-48 hours

3. **SNS Topic** (optional) for async notifications:
   - Create topic for Textract completion notifications
   - Add the topic ARN to your configuration

## Decision Logic

The TextractManager uses the following decision tree:

```
1. AWS not configured or disabled?
   → Use Local Textract

2. Document cost > threshold?
   → Use Local Textract

3. Advanced features required (tables, forms)?
   → Use AWS Textract

4. File size > local limit (default 10MB)?
   → Use AWS Textract

5. User preference set to AWS?
   → Use AWS Textract

6. Performance-based decision:
   → Compare success rates and choose optimal provider
```

## API Endpoints

### Enhanced Textract Endpoints

All existing endpoints now use the intelligent TextractManager:

#### Analyze Document (Enhanced)
```bash
POST /api/textract/analyze-document
```
- Supports up to 100MB files (increased from 10MB)
- Automatically routes to optimal service
- Returns enhanced metadata including provider and cost information

#### Service Status (Enhanced)
```bash
GET /api/textract/service-status
```
Returns comprehensive status including:
- Both AWS and Local service status
- Performance statistics
- Cost tracking
- Optimization recommendations

#### Example Response:
```json
{
  "manager": {
    "version": "1.0.0",
    "preferAWS": false,
    "awsEnabled": true,
    "maxLocalFileSize": 10485760,
    "costThreshold": 5.0
  },
  "aws": {
    "serviceName": "AWSTextractService",
    "isConfigured": true,
    "region": "us-east-1",
    "activeJobs": 0,
    "capabilities": [
      "TEXT_DETECTION",
      "TABLE_EXTRACTION", 
      "FORM_EXTRACTION",
      "LAYOUT_ANALYSIS",
      "ASYNC_PROCESSING",
      "S3_INTEGRATION"
    ]
  },
  "local": {
    "serviceName": "LocalTextractService",
    "useNativeTesseract": true,
    "activeJobs": 0,
    "capabilities": [
      "TEXT_DETECTION",
      "DOCUMENT_ANALYSIS", 
      "ASYNC_PROCESSING"
    ]
  },
  "stats": {
    "awsRequests": 15,
    "localRequests": 45,
    "awsErrors": 1,
    "localErrors": 2,
    "totalCost": 2.35,
    "averageProcessingTime": {
      "aws": 3500,
      "local": 8200
    }
  },
  "recommendations": [
    {
      "type": "cost_optimization",
      "message": "Consider increasing local processing threshold to reduce costs",
      "priority": "medium"
    }
  ]
}
```

## Usage Examples

### Basic Document Analysis
```javascript
const formData = new FormData();
formData.append('document', file);
formData.append('features', JSON.stringify(['TEXT', 'TABLES']));

const response = await fetch('/api/textract/analyze-document', {
  method: 'POST',
  body: formData,
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const result = await response.json();
console.log('Provider used:', result.processingMetadata.provider);
console.log('Processing time:', result.processingMetadata.processingTime);
```

### Advanced Table Extraction
```javascript
const response = await fetch('/api/textract/extract-tables', {
  method: 'POST',
  body: formData
});

const result = await response.json();
result.data.tables.forEach((table, index) => {
  console.log(`Table ${index}: ${table.rowCount}x${table.columnCount}`);
  table.data.forEach(row => {
    console.log(row.map(cell => cell.text).join(' | '));
  });
});
```

### Async Processing for Large Documents
```javascript
// Start async processing
const startResponse = await fetch('/api/textract/start-document-analysis', {
  method: 'POST', 
  body: formData
});
const { JobId } = await startResponse.json();

// Poll for results
const checkStatus = async () => {
  const statusResponse = await fetch(`/api/textract/get-document-analysis/${JobId}`);
  const result = await statusResponse.json();
  
  if (result.JobStatus === 'SUCCEEDED') {
    console.log('Analysis complete!', result);
  } else if (result.JobStatus === 'IN_PROGRESS') {
    setTimeout(checkStatus, 5000); // Check again in 5 seconds
  } else {
    console.error('Analysis failed:', result.StatusMessage);
  }
};

checkStatus();
```

## Cost Management

### Cost Tracking
- All AWS requests are tracked with estimated costs
- Real-time cost monitoring via analytics endpoints
- Configurable cost thresholds prevent runaway expenses

### Cost Optimization Tips
1. Use local processing for simple text extraction
2. Reserve AWS for documents requiring table/form extraction
3. Batch process multiple documents when possible
4. Monitor usage via the service status endpoint
5. Adjust `MAX_LOCAL_TEXTRACT_SIZE` based on your needs

### Current AWS Pricing (2024)
- **Text Detection**: ~$0.0015 per page
- **Document Analysis** (tables/forms): ~$0.05 per page
- **S3 Storage**: ~$0.023 per GB-month
- **S3 Requests**: ~$0.0004 per 1000 PUT requests

## Error Handling & Troubleshooting

### Common Issues

1. **AWS Configuration Errors**
   ```
   Error: AWS Textract is not properly configured
   ```
   - Verify AWS credentials are set
   - Check S3 bucket exists and is accessible
   - Confirm IAM permissions are correct

2. **Cost Threshold Exceeded**
   ```
   Provider: local, Reason: cost_threshold_exceeded
   ```
   - Document processing fell back to local due to cost limits
   - Increase `AWS_COST_THRESHOLD` if AWS processing is desired
   - Check document page count estimate

3. **S3 Upload Failures**
   ```
   Failed to upload document to S3: Access Denied
   ```
   - Verify S3 bucket permissions
   - Check AWS credentials have PutObject permissions
   - Ensure bucket exists in the correct region

### Fallback Behavior
- If AWS fails, system automatically tries local processing
- If local fails after AWS failure, both error messages are returned
- Fallback success is tracked in processing metadata

## Performance Monitoring

### Metrics Tracked
- Request counts per provider
- Error rates
- Average processing times
- Cost tracking
- Success/failure rates

### Optimization Recommendations
The system provides automatic recommendations based on usage patterns:
- High error rates → Configuration suggestions
- High costs → Cost optimization tips
- Slow performance → Hardware/configuration recommendations

## Migration Guide

### From Local-Only Setup
1. Add AWS environment variables
2. Create S3 bucket and IAM permissions
3. Set `AWS_TEXTRACT_ENABLED="true"`
4. Start with `PREFER_AWS_TEXTRACT="false"` for gradual rollout
5. Monitor costs and adjust thresholds as needed

### Testing the Integration
```bash
# Test service status
curl -X GET "http://localhost:4003/api/textract/service-status"

# Test document analysis with a sample image
curl -X POST "http://localhost:4003/api/textract/analyze-document" \
  -F "document=@sample.pdf" \
  -F "features=[\"TEXT\",\"TABLES\"]" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Security Considerations

1. **AWS Credentials**: Use IAM roles in production, avoid hardcoded keys
2. **S3 Security**: Enable bucket encryption and access logging
3. **Document Cleanup**: Automatic cleanup prevents data retention issues
4. **Network Security**: Use VPC endpoints for AWS services if available
5. **Access Control**: All endpoints require authentication

## Support & Maintenance

### Monitoring
- Set up CloudWatch alerts for AWS service failures
- Monitor S3 costs and storage usage
- Track processing success rates via application logs

### Maintenance Tasks
- Review and adjust cost thresholds monthly
- Clean up old S3 objects (automated via lifecycle policies)
- Update IAM permissions as needed
- Monitor for new AWS Textract features and pricing updates

---

## Quick Start Checklist

- [ ] Add AWS environment variables to `.env`
- [ ] Create S3 bucket with appropriate permissions
- [ ] Set up IAM user/role with required permissions
- [ ] Test with a sample document
- [ ] Monitor costs and adjust thresholds
- [ ] Set up CloudWatch monitoring (optional)

For additional support, check the application logs or contact the development team.