/**
 * Interactive test - Step by step with explanations
 */

import bedrockService from './server/src/services/bedrockService.js';
import fs from 'fs';

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Interactive Bedrock PDF Extraction Test                      ║
╚════════════════════════════════════════════════════════════════╝
`);

// Step 1: Check configuration
console.log('Step 1: Checking Configuration...');
console.log(`  ✓ AWS Region: ${process.env.AWS_REGION || 'us-west-2'}`);
console.log(`  ✓ Default Provider: ${process.env.DEFAULT_AI_PROVIDER || 'not set'}`);
console.log(`  ✓ Bedrock Model: ${process.env.BEDROCK_MODEL_ID || 'default'}`);
console.log(`  ✓ AWS Credentials: ${process.env.AWS_ACCESS_KEY_ID ? 'Present' : 'Not found'}`);

if (!process.env.AWS_ACCESS_KEY_ID) {
  console.log('\n⚠️  Warning: AWS credentials not found in environment');
  console.log('   Make sure your .env file has AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
}

// Step 2: Find test PDFs
console.log('\nStep 2: Finding test PDFs...');
const uploadsDir = './uploads';
const pdfFiles = fs.readdirSync(uploadsDir)
  .filter(f => f.endsWith('.pdf'))
  .slice(0, 5);

if (pdfFiles.length === 0) {
  console.log('  ❌ No PDFs found in ./uploads/');
  process.exit(1);
}

console.log(`  ✓ Found ${pdfFiles.length} PDF(s)`);
pdfFiles.forEach((f, i) => {
  const size = fs.statSync(`${uploadsDir}/${f}`).size / (1024 * 1024);
  console.log(`    ${i + 1}. ${f.substring(0, 50)}... (${size.toFixed(2)} MB)`);
});

// Step 3: Test with first PDF
const testFile = pdfFiles[0];
const testPath = `${uploadsDir}/${testFile}`;

console.log(`\nStep 3: Testing with: ${testFile.substring(0, 60)}...`);

const pdfBuffer = fs.readFileSync(testPath);
const fileSizeMB = pdfBuffer.length / (1024 * 1024);

console.log(`  📊 File size: ${fileSizeMB.toFixed(2)} MB`);
console.log(`  📊 Expected API: ${fileSizeMB <= 4.5 ? 'Converse (<4.5MB)' : 'InvokeModel (4.5-20MB)'}`);

console.log('\nStep 4: Calling Bedrock...');
console.log('  ⏳ This may take 5-15 seconds...\n');

try {
  const result = await bedrockService.extractFromPDF(pdfBuffer, testFile);

  console.log('Step 5: Results');
  console.log(`  ✅ Success!`);
  console.log(`  ⏱️  Processing time: ${result.processingTime}ms`);
  console.log(`  🤖 Model: ${result.model}`);
  console.log(`  📊 API used: ${result.apiType}`);

  // Parse result
  let data;
  try {
    data = JSON.parse(result.extractedText);
  } catch (e) {
    const cleaned = result.extractedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    data = JSON.parse(cleaned);
  }

  console.log('\nStep 6: Extracted Data Preview');
  const extracted = data.extractedData || data;
  Object.entries(extracted).slice(0, 5).forEach(([key, value]) => {
    console.log(`  • ${key}: ${value}`);
  });

  if (data.confidence) {
    console.log('\nStep 7: Confidence Scores (Top 5)');
    Object.entries(data.confidence).slice(0, 5).forEach(([key, score]) => {
      const bar = '█'.repeat(Math.floor(score * 20));
      console.log(`  ${key.padEnd(20)} ${bar} ${(score * 100).toFixed(1)}%`);
    });
  }

  if (result.usage) {
    console.log('\nStep 8: Token Usage');
    console.log(`  Input tokens:  ${result.usage.inputTokens || 'N/A'}`);
    console.log(`  Output tokens: ${result.usage.outputTokens || 'N/A'}`);
    console.log(`  Total tokens:  ${result.usage.totalTokens || 'N/A'}`);
  }

  // Save result
  const outputFile = `test-interactive-result.json`;
  fs.writeFileSync(outputFile, JSON.stringify({
    filename: testFile,
    result: data,
    metadata: {
      processingTime: result.processingTime,
      apiType: result.apiType,
      model: result.model,
      usage: result.usage
    }
  }, null, 2));

  console.log(`\n✨ Complete! Result saved to: ${outputFile}\n`);

} catch (error) {
  console.log('\nStep 5: Error Occurred');
  console.error(`  ❌ ${error.message}`);

  if (error.message.includes('credentials')) {
    console.log('\n💡 Tip: Check your AWS credentials in .env file');
  } else if (error.message.includes('AccessDenied')) {
    console.log('\n💡 Tip: Enable Bedrock model access in AWS Console');
    console.log('   https://console.aws.amazon.com/bedrock/');
  } else if (error.message.includes('ThrottlingException')) {
    console.log('\n💡 Tip: Wait a minute and try again (rate limit)');
  }

  console.log(`\n🔍 Full error:`);
  console.error(error);
  process.exit(1);
}
