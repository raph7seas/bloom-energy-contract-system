# How to Test - Quick Guide

## 🚀 Fastest Way to Test (30 seconds)

```bash
node test-interactive.js
```

This will:
1. Check your configuration
2. Find a PDF in `./uploads/`
3. Extract data using Bedrock
4. Show you the results

**That's it!** ✨

---

## 📋 Three Test Options

### Option 1: Interactive Test (Recommended for first time)
```bash
node test-interactive.js
```
- Most detailed output
- Shows each step
- Provides troubleshooting tips
- Saves result to `test-interactive-result.json`

### Option 2: Single File Test (Fastest)
```bash
# Test specific file
node test-single-pdf.js uploads/your-contract.pdf

# Or use default
node test-single-pdf.js
```
- Quick and simple
- Test one file at a time
- Perfect for debugging

### Option 3: Batch Test (Most comprehensive)
```bash
node test-bedrock-pdf-extraction.js
```
- Tests multiple PDFs (up to 3)
- Saves detailed results
- Currently running in background

---

## ✅ What to Expect

**Processing time:** 5-15 seconds per PDF (normal for Bedrock API)

**Output looks like:**
```
✅ Extraction completed in 4523ms
📊 API used: converse
🤖 Model: anthropic.claude-3-5-sonnet-20241022-v2:0

📋 Extracted Data:
{
  "systemCapacity": "2800",
  "contractTerm": "15",
  "baseRate": "0.085",
  ...
}

🎯 Confidence Scores:
  ✅ systemCapacity: 95.0%
  ✅ contractTerm: 90.0%
  ⚠️  baseRate: 85.0%
```

---

## 🔧 Prerequisites

Make sure your `.env` file has:
```bash
DEFAULT_AI_PROVIDER="bedrock"
AWS_REGION="us-west-2"
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
BEDROCK_MODEL_ID="anthropic.claude-3-5-sonnet-20241022-v2:0"
```

---

## ❌ Common Issues

### "AWS credentials not found"
➡️ Check your `.env` file has AWS credentials

### "AccessDeniedException"
➡️ Enable Bedrock model access in [AWS Console](https://console.aws.amazon.com/bedrock/)

### "ThrottlingException"
➡️ Wait 60 seconds and try again (rate limit)

### "ExpiredTokenException"
➡️ Get new AWS SSO credentials and update `.env`

---

## 📊 View Results

```bash
# List result files
ls -la test-*.json

# View a result
cat test-interactive-result.json | jq .

# Or open in your editor
code test-interactive-result.json
```

---

## 🎯 Success Criteria

Your test is successful if:
- ✅ Completes without errors
- ✅ Extracts at least some fields (not all "NOT SPECIFIED")
- ✅ Confidence scores > 0.7 for most fields
- ✅ Processing time < 30 seconds

---

## 📚 More Info

- Full testing guide: `TESTING_GUIDE.md`
- Implementation details: `BEDROCK_PDF_EXTRACTION.md`
- Project summary: `IMPLEMENTATION_SUMMARY.md`

---

## 💡 Quick Tips

1. Start with `test-interactive.js` - it's the most helpful
2. Processing takes 5-15 seconds - be patient!
3. Check result files after test completes
4. Compare extracted values with actual PDF to validate accuracy

**Ready? Run this now:**
```bash
node test-interactive.js
```
