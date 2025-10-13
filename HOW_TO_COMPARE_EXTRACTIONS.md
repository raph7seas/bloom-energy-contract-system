# How to Compare Extractions

## ✅ Comparison Tool is Ready!

I've created a comparison tool that lets you see the difference between extractions before and after the structured extraction system was implemented.

## 🚀 Quick Start

### Option 1: Using npm script (recommended)

```bash
npm run compare
```

### Option 2: Direct execution

```bash
node compare-extractions.js
```

## 📋 How It Works

The tool:
1. **Fetches the last 2 analyzed documents** from the database
2. **Compares key fields** side-by-side
3. **Shows improvements** with color coding:
   - 🟢 **Green "✓ IMPROVED"** - Field went from empty to filled
   - 🟡 **Yellow "◉ CHANGED"** - Field value changed
   - ⚪ **Gray "○ SAME"** - Field unchanged
4. **Counts business rules** extracted
5. **Shows structured extraction metadata** (if available)

## 🎯 Testing the Structured Extraction System

To see if the new structured extraction system is working better:

### Step 1: Upload and Analyze a Document (Before)

If you want to compare against old extractions, use any documents already analyzed.

### Step 2: Restart Server (to load structured extraction)

Make sure the server is running with structured extraction enabled:

```bash
npm run server:dev
```

You should see in the console:
```
✅ Extraction spec loaded successfully
📋 Loaded field mappings for 8 document types
✅ Structured Extraction Service initialized and ready
```

### Step 3: Upload and Analyze the Same Document (After)

1. Go to **http://localhost:4000**
2. Navigate to **Documents** tab
3. Upload a Bloom contract
4. Click **"Analyze Documents"**

### Step 4: Run Comparison

```bash
npm run compare
```

You should see output like:

```
╔════════════════════════════════════════════════════════════╗
║          EXTRACTION COMPARISON TOOL                        ║
╚════════════════════════════════════════════════════════════╝

Comparing:
  [OLD] contract-lease-supplement.pdf (10/12/2025, 4:30:00 PM)
  [NEW] contract-lease-supplement.pdf (10/13/2025, 6:45:00 AM)

═══════════════════════════════════════════════════════════════

FIELD COMPARISON:

✓ IMPROVED systemCapacity
  OLD: "NOT SPECIFIED"
  NEW: "2800"

✓ IMPROVED baseRate
  OLD: "NOT SPECIFIED"
  NEW: "0.085"

✓ IMPROVED contractTerm
  OLD: "NOT SPECIFIED"
  NEW: "15"

◉ CHANGED customerName
  OLD: "Oracle Corporation"
  NEW: "Oracle America, Inc."

═══════════════════════════════════════════════════════════════

BUSINESS RULES:

  OLD: 12 rules
  NEW: 18 rules
  ✓ 6 more rules extracted

═══════════════════════════════════════════════════════════════

STRUCTURED EXTRACTION INFO:

  Document Type: Lease_Supplement
  Confidence: 87.3%
  Detected Cues: Lease Supplement, Customer Agreement
  Candidates Found: 12 fields

═══════════════════════════════════════════════════════════════

SUMMARY:

  ✓ Improved: 8 fields
  ◉ Changed:  2 fields
  ○ Same:     2 fields

🎉 Extraction quality improved on 8 field(s)!
```

## 📊 What to Look For

### Good Signs (Structured Extraction is Working!)

- ✅ **More "✓ IMPROVED" fields** - Previously empty fields now have values
- ✅ **"Structured Extraction Info" section appears** - Shows document classification
- ✅ **Higher business rule count** - More comprehensive extraction
- ✅ **High confidence (>70%)** - Document type correctly identified

### Things to Check

- ⚠️ **"◉ CHANGED" fields** - Review to ensure new value is more accurate
- ⚠️ **Low confidence (<30%)** - Document type might be ambiguous
- ⚠️ **No improvements** - May need to adjust patterns in YAML spec

## 🔧 Customizing the Comparison

### Compare Specific Fields

Edit `compare-extractions.js` line 104-117 to add/remove fields:

```javascript
const fieldsToCompare = [
  'customerName',
  'siteId',
  'systemCapacity',
  'contractTerm',
  'baseRate',
  // Add more fields here...
];
```

### Change Number of Documents

By default, it compares the last 2. To compare more:

Edit line 72:

```javascript
take: 5,  // Compare last 5 documents
```

## 🐛 Troubleshooting

### "Need at least 2 analyzed documents"

**Problem**: Not enough documents in database

**Solution**: Upload and analyze at least 2 documents via the web interface

### "All fields show null"

**Problem**: Documents uploaded but not analyzed

**Solution**:
1. Go to **Documents** tab in web UI
2. Click **"Analyze Documents"** button
3. Wait for analysis to complete
4. Run comparison again

### "No structured extraction info shown"

**Problem**: Old documents were analyzed before structured extraction was implemented

**Solution**:
1. Restart server to enable structured extraction
2. Upload and analyze a new document
3. Compare old vs new

## 📝 Example Workflow

```bash
# 1. Make sure server is running with structured extraction
npm run server:dev

# 2. In another terminal, check current extractions
npm run compare

# 3. Upload documents via web UI (http://localhost:4000)
# 4. Click "Analyze Documents" in the UI

# 5. Run comparison again to see improvements
npm run compare
```

## 💡 Pro Tips

1. **Test with same document type** - Compare same Lease Supplement before/after
2. **Focus on key fields** - systemCapacity, baseRate, contractTerm are most important
3. **Check console logs** - Server logs show detailed extraction process
4. **Iterate on patterns** - If field not extracted, update YAML spec patterns

## 🎯 Success Metrics

The structured extraction is successful if you see:

- **30%+ improvement** in filled fields
- **Document type correctly classified** (>70% confidence)
- **More business rules extracted**
- **Specialized fields populated** (e.g., rated_capacity_kw for Lease Supplements)

---

**Current Status**: Comparison tool ready! Upload and analyze documents to test improvements.
