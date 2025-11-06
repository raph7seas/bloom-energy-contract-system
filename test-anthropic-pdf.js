/**
 * Test Anthropic Direct API PDF Extraction with Sonnet 4.5
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

console.log('\n🧪 Testing Anthropic Direct API PDF Extraction\n');

// Check API key
console.log('Step 1: Configuration');
const apiKey = process.env.ANTHROPIC_API_KEY;
const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';

if (!apiKey) {
  console.error('❌ ANTHROPIC_API_KEY not found in environment');
  process.exit(1);
}

console.log(`  API Key: ${apiKey.substring(0, 15)}...`);
console.log(`  Model: ${model}`);

// Find a test PDF
console.log('\nStep 2: Finding test PDF...');
const uploadsDir = './uploads';
let testPDF = null;

try {
  const files = fs.readdirSync(uploadsDir);
  // Sort by file size and pick a smaller one (under 500KB to avoid 100-page limit)
  const pdfFiles = files
    .filter(f => f.endsWith('.pdf'))
    .map(f => ({
      name: f,
      path: path.join(uploadsDir, f),
      size: fs.statSync(path.join(uploadsDir, f)).size
    }))
    .filter(f => f.size < 500 * 1024) // Under 500KB
    .sort((a, b) => a.size - b.size);

  if (pdfFiles.length === 0) {
    console.error('❌ No small PDF files found in ./uploads directory (looking for files < 500KB)');
    process.exit(1);
  }

  testPDF = pdfFiles[0].path;
  console.log(`  Found: ${pdfFiles[0].name}`);
  console.log(`  Size: ${(pdfFiles[0].size / 1024).toFixed(2)} KB`);
} catch (error) {
  console.error(`❌ Error reading uploads directory: ${error.message}`);
  process.exit(1);
}

// Read PDF and convert to base64
console.log('\nStep 3: Preparing PDF...');
const pdfBuffer = fs.readFileSync(testPDF);
const base64PDF = pdfBuffer.toString('base64');
console.log(`  Base64 length: ${base64PDF.length} characters`);

// Initialize Anthropic client
console.log('\nStep 4: Creating Anthropic client...');
const anthropic = new Anthropic({
  apiKey: apiKey
});
console.log('✅ Client created');

// Extract data from PDF
console.log('\nStep 5: Extracting contract data from PDF...');
console.log('⏳ Calling Anthropic API with PDF document...');

const extractionPrompt = `You are analyzing a Bloom Energy contract document. Extract the following information in JSON format:

{
  "extractedData": {
    "contractTerm": "number of years or NOT SPECIFIED",
    "baseRate": "rate per kWh in dollars or NOT SPECIFIED",
    "escalationRate": "annual percentage or NOT SPECIFIED",
    "systemCapacity": "capacity in kW or NOT SPECIFIED",
    "efficiencyWarranty": "efficiency percentage or NOT SPECIFIED",
    "availabilityGuarantee": "availability percentage or NOT SPECIFIED",
    "customerName": "company name or NOT SPECIFIED",
    "siteName": "site location or NOT SPECIFIED",
    "effectiveDate": "contract start date or NOT SPECIFIED",
    "expirationDate": "contract end date or NOT SPECIFIED"
  },
  "confidence": {
    "contractTerm": 0.0-1.0,
    "baseRate": 0.0-1.0,
    "escalationRate": 0.0-1.0,
    "systemCapacity": 0.0-1.0,
    "efficiencyWarranty": 0.0-1.0,
    "availabilityGuarantee": 0.0-1.0,
    "customerName": 0.0-1.0,
    "siteName": 0.0-1.0,
    "effectiveDate": 0.0-1.0,
    "expirationDate": 0.0-1.0
  },
  "notes": "Any important observations"
}

Return ONLY the JSON object, no other text.`;

const startTime = Date.now();

try {
  const response = await anthropic.messages.create({
    model: model,
    max_tokens: 8000,
    temperature: 0.3,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64PDF
          }
        },
        {
          type: 'text',
          text: extractionPrompt
        }
      ]
    }]
  });

  const duration = Date.now() - startTime;

  console.log(`\n✅ Success! (${(duration / 1000).toFixed(2)}s)`);
  console.log(`\nModel: ${model}`);
  console.log(`\nToken usage:`);
  console.log(`  Input: ${response.usage.input_tokens}`);
  console.log(`  Output: ${response.usage.output_tokens}`);
  console.log(`  Total: ${response.usage.input_tokens + response.usage.output_tokens}`);

  console.log(`\nExtracted Data:`);
  console.log('─────────────────────────────────────────────────────────────');
  const extractedText = response.content[0].text;
  console.log(extractedText);
  console.log('─────────────────────────────────────────────────────────────');

  // Try to parse as JSON
  try {
    const cleanedText = extractedText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const parsed = JSON.parse(cleanedText);

    console.log('\n📊 Parsed Results:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`Customer: ${parsed.extractedData.customerName}`);
    console.log(`Contract Term: ${parsed.extractedData.contractTerm}`);
    console.log(`System Capacity: ${parsed.extractedData.systemCapacity}`);
    console.log(`Base Rate: ${parsed.extractedData.baseRate}`);
    console.log(`Escalation: ${parsed.extractedData.escalationRate}`);
    console.log(`Efficiency Warranty: ${parsed.extractedData.efficiencyWarranty}`);
    console.log(`Availability: ${parsed.extractedData.availabilityGuarantee}`);
  } catch (parseError) {
    console.log('\n⚠️  Could not parse as JSON - response may need cleanup');
  }

  console.log('\n🎉 Anthropic PDF extraction test PASSED!\n');

} catch (error) {
  const duration = Date.now() - startTime;
  console.error(`\n❌ Test failed after ${(duration / 1000).toFixed(2)}s: ${error.message}\n`);

  if (error.message.includes('api_key')) {
    console.log('💡 Tip: Check your ANTHROPIC_API_KEY in .env file');
  } else if (error.message.includes('document')) {
    console.log('💡 Tip: The Anthropic SDK might not support the document type yet');
    console.log('   Try using image conversion or check SDK version');
  }

  console.error('\nFull error:');
  console.error(error);
  process.exit(1);
}
