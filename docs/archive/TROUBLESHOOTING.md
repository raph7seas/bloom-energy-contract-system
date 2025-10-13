# Troubleshooting: Contract Not Appearing in List

## Your Contract Details
- **Contract ID**: `f6482f55-6938-4f3e-87a5-d1dc44a35558`
- **Name**: Customer Entity - Power Purchase - Standard
- **Client**: Customer Entity
- **Capacity**: 325 kW
- **Term**: 10 years
- **Extracted Rules**: 21 rules from 7 documents
- **Tags**: AI Generated, Multi-Document

## Quick Fixes

### 1. Hard Refresh the Page
- **Windows/Linux**: Ctrl + Shift + R or Ctrl + F5
- **Mac**: Cmd + Shift + R

### 2. Clear Browser Cache
- Open Developer Tools (F12)
- Right-click the refresh button
- Select "Empty Cache and Hard Reload"

### 3. Check Browser Console
- Press F12 to open Developer Tools
- Go to "Console" tab
- Look for any errors related to `/api/contracts`
- The API should return 2 contracts

### 4. Manual Verification

Open this URL in your browser:
```
http://localhost:4000/api/contracts
```

You should see JSON with 2 contracts. Look for this one:
```json
{
  "id": "f6482f55-6938-4f3e-87a5-d1dc44a35558",
  "name": "Customer Entity - Power Purchase - Standard",
  "client": "Customer Entity",
  "extractedRules": [... 21 rules ...]
}
```

### 5. Check Frontend Service

The ContractLibrary component uses `contractService.getContracts()` which calls:
```
GET /api/contracts
```

Verify the response in Network tab (F12 → Network → filter by "contracts")

## What We Know is Working

✅ Backend API returns 2 contracts
✅ Your contract was created successfully
✅ 21 rules were extracted from 7 documents
✅ Contract is stored in `global.contracts` array
✅ GET /api/contracts includes in-memory contracts

## Most Likely Issue

The frontend component needs to refresh. This can happen if:
- The component didn't reload after the contract was created
- There's a caching issue in the browser
- The ContractLibrary component isn't watching for changes

## Solution

**Option A: Simple Refresh**
1. Navigate to "Contracts Library" tab
2. Press F5 or click refresh button in the app
3. Contract should appear

**Option B: Programmatic Refresh**
After clicking "Save as Contract", the success dialog appears but the contract list might not auto-refresh. Add this code to refresh:

```typescript
// In saveAsContract function after success
window.location.reload(); // Force page refresh
// OR
loadContracts(); // If this function exists in parent
```

## Verify Contract Details

Once you see the contract, click on it to view:
- All 21 extracted business rules
- Rules organized by section (Financial, Technical, Operating)
- Source documents metadata
- AI confidence scores
- Contract parameters populated from analysis

## Next Steps if Still Not Working

1. Check if `ContractLibrary.tsx` has auto-refresh on mount
2. Verify the component is actually calling the API
3. Check if localStorage is interfering with API results
4. Look for transform functions that might filter out in-memory contracts
