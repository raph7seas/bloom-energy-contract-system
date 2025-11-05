/**
 * Simple Bedrock connection test
 */

import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

console.log('\n🧪 Testing AWS Bedrock Connection\n');

// Check credentials
console.log('Step 1: Configuration');
console.log(`  AWS Region: ${process.env.AWS_REGION || 'not set'}`);
console.log(`  AWS Access Key: ${process.env.AWS_ACCESS_KEY_ID ? 'Present' : 'Not found'}`);
console.log(`  Model ID: ${process.env.BEDROCK_MODEL_ID || 'not set'}`);

if (!process.env.AWS_ACCESS_KEY_ID) {
  console.error('\n❌ AWS credentials not found in environment');
  process.exit(1);
}

// Test connection
console.log('\nStep 2: Creating Bedrock client...');
const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN
  }
});

console.log('✅ Client created');

console.log('\nStep 3: Testing simple text message...');
try {
  const command = new ConverseCommand({
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-haiku-20241022-v1:0',
    messages: [{
      role: 'user',
      content: [{ text: 'Say "Hello from Bedrock!"' }]
    }]
  });

  console.log('⏳ Calling Bedrock API...');
  const startTime = Date.now();
  const response = await client.send(command);
  const duration = Date.now() - startTime;

  console.log(`\n✅ Success! (${duration}ms)`);
  console.log(`\nResponse: ${response.output.message.content[0].text}`);
  console.log(`\nToken usage:`);
  console.log(`  Input: ${response.usage.inputTokens}`);
  console.log(`  Output: ${response.usage.outputTokens}`);

  console.log('\n🎉 Bedrock connection test PASSED!\n');

} catch (error) {
  console.error(`\n❌ Test failed: ${error.message}`);

  if (error.name === 'AccessDeniedException') {
    console.log('\n💡 Tip: Enable Bedrock model access in AWS Console');
    console.log('   https://console.aws.amazon.com/bedrock/');
    console.log('   Region: us-west-2');
    console.log('   Enable: Claude 3.5 Haiku');
  } else if (error.message.includes('credentials')) {
    console.log('\n💡 Tip: Check your AWS credentials in .env file');
  }

  console.error('\nFull error:');
  console.error(error);
  process.exit(1);
}
