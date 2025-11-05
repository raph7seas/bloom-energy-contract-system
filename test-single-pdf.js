/**
 * Quick single-file PDF extraction test
 * Usage: node test-single-pdf.js path/to/file.pdf
 */

import bedrockService from './server/src/services/bedrockService.js';
import fs from 'fs';

const pdfPath = process.argv[2] || './uploads/contract-temp-contract-1759295838836-1759295848805-51dydo-BBraun-MasterAgreementBEPPA-2022-12-20EXE.pdf';

console.log(`\n🧪 Testing PDF extraction with: ${pdfPath}\n`);

if (!fs.existsSync(pdfPath)) {
  console.error(`❌ File not found: ${pdfPath}`);
  console.log(`\nUsage: node test-single-pdf.js path/to/file.pdf`);
  process.exit(1);
}

try {
  const pdfBuffer = fs.readFileSync(pdfPath);
  const filename = pdfPath.split('/').pop();

  console.log(`📊 File size: ${(pdfBuffer.length / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`🚀 Starting extraction...\n`);

  const startTime = Date.now();
  const result = await bedrockService.extractFromPDF(pdfBuffer, filename);
  const totalTime = Date.now() - startTime;

  console.log(`\n✅ Extraction completed in ${totalTime}ms`);
  console.log(`📊 API used: ${result.apiType}`);
  console.log(`🤖 Model: ${result.model}\n`);

  // Parse JSON
  let extractedData;
  try {
    extractedData = JSON.parse(result.extractedText);
  } catch (e) {
    const cleaned = result.extractedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    extractedData = JSON.parse(cleaned);
  }

  console.log('📋 Extracted Data:');
  console.log(JSON.stringify(extractedData.extractedData, null, 2));

  if (extractedData.confidence) {
    console.log('\n🎯 Confidence Scores:');
    Object.entries(extractedData.confidence).forEach(([field, score]) => {
      const percent = (score * 100).toFixed(1);
      const emoji = score >= 0.8 ? '✅' : score >= 0.5 ? '⚠️' : '❌';
      console.log(`  ${emoji} ${field}: ${percent}%`);
    });
  }

  if (result.usage) {
    console.log(`\n📊 Token Usage:`);
    console.log(`  Input: ${result.usage.inputTokens || 'N/A'}`);
    console.log(`  Output: ${result.usage.outputTokens || 'N/A'}`);
  }

  console.log('\n✨ Test complete!\n');

} catch (error) {
  console.error(`\n❌ Test failed: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}
