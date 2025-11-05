/**
 * Check available Bedrock models and access status
 */

import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';

console.log('\n🔍 Checking Bedrock Model Access\n');

// Check credentials
console.log('Configuration:');
console.log(`  AWS Region: ${process.env.AWS_REGION || 'not set'}`);
console.log(`  AWS Access Key: ${process.env.AWS_ACCESS_KEY_ID ? 'Present' : 'Not found'}`);

if (!process.env.AWS_ACCESS_KEY_ID) {
  console.error('\n❌ AWS credentials not found in environment');
  process.exit(1);
}

// Create Bedrock client (NOT BedrockRuntime - different service for listing models)
const client = new BedrockClient({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN
  }
});

console.log('\n📋 Fetching available models...\n');

try {
  const command = new ListFoundationModelsCommand({
    byProvider: 'Anthropic' // Filter to only show Claude models
  });

  const response = await client.send(command);

  if (!response.modelSummaries || response.modelSummaries.length === 0) {
    console.log('⚠️  No Anthropic models found or no access granted');
    console.log('\n💡 You may need to enable model access in AWS Console:');
    console.log('   https://console.aws.amazon.com/bedrock/');
    console.log('   Region: us-west-2');
    process.exit(1);
  }

  console.log(`✅ Found ${response.modelSummaries.length} Anthropic model(s):\n`);

  // Group by model family
  const claudeModels = response.modelSummaries.filter(m =>
    m.modelId.includes('claude')
  );

  // Show Claude 3.5 models (what we want)
  console.log('Claude 3.5 Models:');
  console.log('─────────────────────────────────────────────────────────────');

  const claude35 = claudeModels.filter(m => m.modelId.includes('claude-3-5'));
  if (claude35.length > 0) {
    claude35.forEach(model => {
      console.log(`  ✅ ${model.modelId}`);
      console.log(`      Name: ${model.modelName}`);
      if (model.inputModalities) {
        console.log(`      Input: ${model.inputModalities.join(', ')}`);
      }
      if (model.outputModalities) {
        console.log(`      Output: ${model.outputModalities.join(', ')}`);
      }
      console.log('');
    });
  } else {
    console.log('  ❌ No Claude 3.5 models available');
  }

  // Show Claude 3 models
  console.log('\nClaude 3 Models:');
  console.log('─────────────────────────────────────────────────────────────');

  const claude3 = claudeModels.filter(m =>
    m.modelId.includes('claude-3') && !m.modelId.includes('claude-3-5')
  );
  if (claude3.length > 0) {
    claude3.forEach(model => {
      console.log(`  • ${model.modelId}`);
    });
  } else {
    console.log('  (none)');
  }

  // Show recommended models
  console.log('\n\n📌 Recommended Models for PDF Extraction:');
  console.log('─────────────────────────────────────────────────────────────');

  const haiku = claude35.find(m => m.modelId.includes('haiku'));
  const sonnet = claude35.find(m => m.modelId.includes('sonnet'));

  if (haiku) {
    console.log(`  1️⃣  ${haiku.modelId}`);
    console.log('      ✓ Fast and cost-effective');
    console.log('      ✓ Good for simple extractions');
    console.log('');
  }

  if (sonnet) {
    console.log(`  2️⃣  ${sonnet.modelId}`);
    console.log('      ✓ Higher accuracy');
    console.log('      ✓ Better for complex documents');
    console.log('      ✓ Recommended for production');
    console.log('');
  }

  // Update .env recommendation
  console.log('\n💡 Update your .env file:');
  console.log('─────────────────────────────────────────────────────────────');
  if (sonnet) {
    console.log(`BEDROCK_MODEL_ID="${sonnet.modelId}"`);
  } else if (haiku) {
    console.log(`BEDROCK_MODEL_ID="${haiku.modelId}"`);
  } else {
    console.log('⚠️  No suitable models found');
  }

  console.log('\n✅ Model access check complete!\n');

} catch (error) {
  console.error(`\n❌ Error: ${error.message}\n`);

  if (error.name === 'AccessDeniedException') {
    console.log('💡 Access Denied - Possible reasons:');
    console.log('   1. Bedrock model access not enabled in AWS Console');
    console.log('   2. Your IAM role lacks bedrock:ListFoundationModels permission');
    console.log('   3. Service not available in your region (should be us-west-2)');
    console.log('\n📍 Enable model access:');
    console.log('   https://console.aws.amazon.com/bedrock/');
    console.log('   → Select region: us-west-2');
    console.log('   → Click "Model access"');
    console.log('   → Click "Manage model access"');
    console.log('   → Enable Anthropic Claude models');
  } else if (error.name === 'UnrecognizedClientException') {
    console.log('💡 Invalid AWS credentials');
    console.log('   Check your .env file has correct AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
  } else if (error.message.includes('credentials')) {
    console.log('💡 Credentials issue:');
    console.log('   - Check .env file has AWS credentials');
    console.log('   - AWS SSO credentials may have expired');
  }

  console.error('\nFull error details:');
  console.error(error);
  process.exit(1);
}
