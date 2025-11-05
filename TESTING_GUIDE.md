# Testing Guide - Bedrock PDF Extraction

## Quick Start - Choose Your Test Method

### 🚀 **Method 1: Automated Batch Test** (Comprehensive)

Tests multiple PDFs automatically:

```bash
node test-bedrock-pdf-extraction.js
```

**What it does:**
- Finds up to 3 PDFs in `./uploads/`
- Extracts data from each
- Shows confidence scores
- Saves detailed results to JSON files

**Expected output:**
```
🧪 Testing Bedrock PDF Extraction
================================================================================

✅ Found 3 PDF(s) to test

[1/3] Testing: contract-example.pdf
────────────────────────────────────────────────────────────────────────────────
📊 File size: 0.95 MB
🚀 Starting extraction...
✅ Using Converse API (file under 4.5MB)
...
```

---

### ⚡ **Method 2: Single File Test** (Fastest)

Test one specific PDF:

```bash
# Use default PDF
node test-single-pdf.js

# Test specific file
node test-single-pdf.js ./uploads/your-contract.pdf
```

**What it does:**
- Tests one PDF quickly
- Shows extracted data
- Displays confidence scores
- Perfect for debugging

---

### 🔍 **Method 3: Interactive Test** (Most Detailed)

Step-by-step test with explanations:

```bash
node test-interactive.js
```

**What it does:**
- Checks your configuration
- Explains each step
- Shows progress bars for confidence
- Provides troubleshooting tips
- Great for first-time testing

---

## Prerequisites

### 1. Check Your Environment

```bash
# Make sure .env file exists
ls -la .env

# Check AWS credentials are set
grep AWS_ACCESS_KEY_ID .env
```

Your `.env` should have:
```bash
DEFAULT_AI_PROVIDER="bedrock"
AWS_REGION="us-west-2"
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
AWS_SESSION_TOKEN="your-token"  # For SSO
BEDROCK_MODEL_ID="anthropic.claude-3-5-sonnet-20241022-v2:0"
```

### 2. Verify PDFs Exist

```bash
# List PDFs in uploads
ls -lh uploads/*.pdf | head -5
```

You should see some PDF files. If not:
```bash
# Copy test PDFs from another location
cp /path/to/test-contracts/*.pdf uploads/
```

---

## Running Tests

### Test 1: Quick Validation

```bash
# Run interactive test (easiest)
node test-interactive.js
```

**Expected result:** Should complete in 5-15 seconds and show extracted data.

### Test 2: Compare with Current System

```bash
# Extract with old system (current)
npm run dev:full
# Upload a PDF through the UI
# Note the extracted values

# Extract with new system
node test-single-pdf.js uploads/same-file.pdf
# Compare results
```

### Test 3: Batch Processing

```bash
# Test multiple files
node test-bedrock-pdf-extraction.js

# Check results
ls -l test-result-*.json
cat test-result-*.json | jq .extractedData
```

---

## Understanding Results

### Result File Format

```json
{
  "filename": "contract.pdf",
  "fileSizeMB": 0.95,
  "totalTime": 4523,
  "apiType": "converse",
  "extractedData": {
    "systemCapacity": "2800",
    "contractTerm": "15",
    "baseRate": "0.085",
    "annualEscalation": "2.5",
    "efficiencyWarranty": "47",
    "availabilityGuarantee": "95",
    "buyer": "Example Corp",
    "seller": "Bloom Energy",
    "effectiveDate": "2024-01-15",
    "systemType": "PP",
    "voltage": "480V"
  },
  "confidence": {
    "systemCapacity": 0.95,
    "contractTerm": 0.90,
    "baseRate": 0.85,
    "annualEscalation": 0.80,
    "efficiencyWarranty": 0.90,
    "availabilityGuarantee": 0.85,
    "buyer": 0.95,
    "seller": 0.98,
    "effectiveDate": 0.92,
    "systemType": 0.88,
    "voltage": 0.85
  },
  "usage": {
    "inputTokens": 12450,
    "outputTokens": 850,
    "totalTokens": 13300
  }
}
```

### Confidence Score Interpretation

| Score | Meaning | Action |
|-------|---------|--------|
| **0.9 - 1.0** | ✅ Very High | Use with confidence |
| **0.7 - 0.9** | ⚠️  Good | Review recommended |
| **0.5 - 0.7** | ⚠️  Moderate | Manual verification needed |
| **< 0.5** | ❌ Low | Likely incorrect, verify carefully |

---

## Troubleshooting

### Error: "Cannot find module"

```bash
# Install dependencies
npm install
```

### Error: "AWS credentials not found"

```bash
# Check .env file
cat .env | grep AWS

# Get new credentials from AWS SSO
# https://d-926752529b.awsapps.com/start/#
```

### Error: "AccessDeniedException"

**Problem:** Bedrock model access not enabled

**Solution:**
1. Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/)
2. Select region: **us-west-2** (top-right)
3. Click "Model access" (left sidebar)
4. Click "Manage model access"
5. Enable: ✅ Claude 3.5 Sonnet
6. Submit request

### Error: "ExpiredTokenException"

**Problem:** AWS SSO credentials expired

**Solution:**
1. Get new credentials from AWS SSO
2. Update `.env` file with new values
3. Retry test

### Error: "ThrottlingException" or "Rate limit exceeded"

**Problem:** Exceeded 50 requests/minute

**Solution:**
```bash
# Wait 60 seconds
sleep 60

# Then retry
node test-single-pdf.js
```

### Error: "PDF too large"

**Problem:** File exceeds 20MB

**Solution:**
```bash
# Check file size
ls -lh uploads/large-file.pdf

# Split PDF (if needed)
# Or process page-by-page
```

### Test hangs or takes very long

**Normal behavior:** Bedrock API calls take 5-15 seconds per PDF

If it takes longer than 30 seconds:
```bash
# Check AWS connectivity
curl -I https://bedrock-runtime.us-west-2.amazonaws.com

# Check logs
tail -f logs/application.log
```

---

## Validation Checklist

After running tests, verify:

- [ ] Test completes without errors
- [ ] Extracted data looks correct (spot-check a few values)
- [ ] Confidence scores are reasonable (>0.7 for most fields)
- [ ] Processing time is acceptable (5-15 seconds)
- [ ] API selection is correct (Converse <4.5MB, InvokeModel >4.5MB)
- [ ] Results saved to JSON files

---

## Comparing Results

### Old System vs New System

```bash
# Extract with old system
# (manually through UI or existing API)
# Save to old-result.json

# Extract with new system
node test-single-pdf.js uploads/same-file.pdf > new-result.json

# Compare
diff <(cat old-result.json | jq .extractedData) <(cat test-result-*.json | jq .extractedData)
```

Expected improvements:
- ✅ Faster processing (30-60s → 5-10s)
- ✅ Better accuracy (especially tables and formatted data)
- ✅ Higher confidence scores
- ✅ More consistent results

---

## Advanced Testing

### Test with Different Models

```bash
# Test with Haiku (faster, cheaper)
BEDROCK_MODEL_ID="anthropic.claude-3-5-haiku-20241022-v1:0" node test-single-pdf.js

# Test with Sonnet (recommended)
BEDROCK_MODEL_ID="anthropic.claude-3-5-sonnet-20241022-v2:0" node test-single-pdf.js
```

### Test with Custom Prompts

Edit `bedrockService.js` line 527 to customize the extraction prompt:

```javascript
_getDefaultExtractionPrompt() {
  return `Your custom prompt here...`;
}
```

### Stress Test (Batch Processing)

```bash
# Process all PDFs in uploads
ls uploads/*.pdf | while read pdf; do
  echo "Testing: $pdf"
  node test-single-pdf.js "$pdf"
  sleep 2  # Rate limiting
done
```

---

## Test Data

### Good Test Files

Use contracts with:
- Clear text (not scanned/poor quality)
- Standard Bloom Energy format
- Complete data (all fields present)
- Size < 10MB

### Challenging Test Files

Also test with:
- Large files (5-10MB) - tests InvokeModel API
- Scanned PDFs - tests OCR fallback
- Multi-page documents - tests context handling
- Documents with tables - tests layout parsing

---

## Next Steps

Once tests pass:

1. **Validate Accuracy**
   - Compare 5-10 contracts with manual review
   - Check confidence scores match accuracy
   - Verify edge cases (missing data, unusual formats)

2. **Performance Testing**
   - Test with various file sizes
   - Measure average processing time
   - Test rate limiting behavior

3. **Integration**
   - Update `multiDocumentProcessor.js`
   - Update `aiService.js`
   - Test end-to-end workflow

4. **Production Readiness**
   - Test with S3 integration
   - Set up monitoring
   - Deploy to staging environment

---

## Getting Help

If tests fail:

1. Check this troubleshooting guide
2. Review error messages carefully
3. Check AWS Bedrock console for issues
4. Review `BEDROCK_PDF_EXTRACTION.md` for detailed documentation
5. Check CloudWatch logs (in AWS)

Common issues are usually:
- ❌ AWS credentials expired
- ❌ Bedrock model access not enabled
- ❌ Rate limiting (wait and retry)
