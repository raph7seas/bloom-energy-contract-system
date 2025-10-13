# Multi-Document Contract Creation Workflow

## Overview
This workflow allows you to upload multiple contract documents, analyze them collectively to extract business rules, and create a single consolidated contract with all extracted rules.

## API Workflow

### Step 1: Upload Documents
Upload your contract documents (PDFs, DOCX, TXT, images) using the existing upload endpoints.

```bash
# Upload multiple documents
POST /api/uploads/single
POST /api/uploads/multiple
```

Each upload will be associated with a `contractId` (either provided or auto-generated).

### Step 2: Analyze Documents
Once all documents are uploaded, trigger AI analysis to extract business rules from all documents:

```bash
POST /api/documents/analyze/:contractId
```

**Response includes:**
- `results[]` - Array of analysis results for each document
- `contractBlueprint` - Consolidated contract data structure
- `summary` - Statistics about extracted rules
- `contractSummaryNarrative` - Human-readable summary

**Example Response:**
```json
{
  "success": true,
  "contractId": "abc-123",
  "documentsAnalyzed": 7,
  "results": [
    {
      "documentId": "doc-1",
      "filename": "contract-terms.pdf",
      "extractedRules": [
        {
          "id": "rule-1",
          "name": "Base Rate",
          "category": "payment",
          "mappedFormField": "baseRate",
          "mappedValue": "0.095",
          "confidence": 0.92
        }
      ]
    }
  ],
  "contractBlueprint": {
    "formData": {
      "customerName": "ABC Manufacturing Inc.",
      "siteLocation": "Customer Facility",
      "ratedCapacity": 650,
      "baseRate": 0.095,
      "contractTerm": 15,
      ...
    },
    "metadata": {
      "parties": ["Bloom Energy Corporation", "ABC Manufacturing Inc."],
      "documents": [...]
    },
    "rulesBySection": {
      "financialParameters": [...],
      "technicalSpecifications": [...]
    }
  },
  "summary": {
    "totalRulesExtracted": 42,
    "averageConfidence": 0.89,
    "rulesByCategory": {
      "payment": 8,
      "technical": 12,
      "performance": 6
    }
  }
}
```

### Step 3: Create Contract from Blueprint (NEW!)
Use the new endpoint to save the analyzed data as a contract:

```bash
POST /api/contracts/from-blueprint
Content-Type: application/json

{
  "blueprint": { ... },           // From step 2 response
  "contractId": "abc-123",        // Original contract ID
  "analysisResults": [ ... ]      // From step 2 response
}
```

**What it does:**
- Creates a contract record with all extracted data
- Includes all business rules from all analyzed documents
- Stores rules organized by section (financial, technical, operating, etc.)
- Saves to database if Prisma available, otherwise in-memory
- Returns the created contract with full details

**Response:**
```json
{
  "success": true,
  "contract": {
    "id": "generated-uuid",
    "name": "ABC Manufacturing Inc. - Power Purchase - Standard",
    "client": "ABC Manufacturing Inc.",
    "capacity": 650,
    "term": 15,
    "systemType": "Power Purchase - Standard",
    "totalValue": 111150,
    "extractedRules": [
      { ... all 42 rules from all documents ... }
    ],
    "rulesBySection": {
      "financialParameters": [ ... ],
      "technicalSpecifications": [ ... ],
      "operatingParameters": [ ... ]
    },
    "blueprintMetadata": {
      "sourceDocuments": [
        { "documentId": "doc-1", "filename": "contract-terms.pdf" },
        { "documentId": "doc-2", "filename": "technical-specs.pdf" }
      ],
      "extractionMethod": "multi_document_analysis"
    }
  },
  "extractedRulesCount": 42,
  "documentsAnalyzed": 7,
  "inMemory": true
}
```

### Step 4: View Contract
The created contract will now appear in your contracts list:

```bash
GET /api/contracts
```

You can also retrieve it by ID:

```bash
GET /api/contracts/:id
```

## Frontend Integration

### Example JavaScript/TypeScript Usage

```typescript
// After analyzing documents
const analyzeDocuments = async (contractId: string) => {
  const response = await fetch(`/api/documents/analyze/${contractId}`, {
    method: 'POST'
  });
  const analysisData = await response.json();

  if (analysisData.success) {
    // Show analysis results to user
    displayAnalysisResults(analysisData);

    // Enable "Create Contract" button
    return analysisData;
  }
};

// Create contract from analysis
const createContractFromAnalysis = async (analysisData: any) => {
  const response = await fetch('/api/contracts/from-blueprint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blueprint: analysisData.contractBlueprint,
      contractId: analysisData.contractId,
      analysisResults: analysisData.results
    })
  });

  const result = await response.json();

  if (result.success) {
    console.log('✅ Contract created!', result.contract);
    console.log(`📊 ${result.extractedRulesCount} rules from ${result.documentsAnalyzed} documents`);

    // Navigate to contract view or contracts list
    navigateToContract(result.contract.id);
  }
};

// Complete workflow
const completeWorkflow = async (contractId: string) => {
  // Step 1: Analyze all uploaded documents
  const analysisData = await analyzeDocuments(contractId);

  // Step 2: Create contract from analysis
  const contract = await createContractFromAnalysis(analysisData);

  return contract;
};
```

### UI Flow Suggestion

1. **Upload Tab**
   - User uploads 7 PDFs
   - Shows progress for each upload
   - All uploads complete → Enable "Analyze Documents" button

2. **Analysis Tab**
   - User clicks "Analyze Documents"
   - Shows AI analysis progress
   - Displays extracted rules grouped by category
   - Shows contract blueprint preview
   - Enable "Create Contract" button

3. **Create Contract**
   - User clicks "Create Contract"
   - Calls `/api/contracts/from-blueprint` endpoint
   - Shows success message
   - Redirects to contract details or library

4. **Contract Library**
   - Shows the new contract in the list
   - Displays all extracted rules when viewing contract details

## Benefits

✅ **Consolidated Analysis**: All documents analyzed together for comprehensive rule extraction

✅ **Complete Rule Coverage**: Every rule from every document included in final contract

✅ **Confidence Tracking**: Each rule includes confidence score and source document

✅ **Traceable**: Full metadata about source documents and extraction method

✅ **Database or In-Memory**: Works with or without Prisma database

## Storage Modes

### With Database (Prisma)
- Contract saved to PostgreSQL
- Full relationships (financial params, technical params, etc.)
- Persistent across server restarts

### Without Database (In-Memory)
- Contract stored in `global.contracts` array
- All data embedded in single object
- Lost on server restart (temporary solution)

## Testing

Run the test script to see the complete workflow:

```bash
node test-create-contract-from-blueprint.js
```

This demonstrates:
- Creating a mock blueprint with analysis results
- Calling the endpoint to create a contract
- Verifying the contract appears in the contracts list
- Displaying all extracted rules organized by section
