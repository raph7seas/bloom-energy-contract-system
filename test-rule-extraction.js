/**
 * Test script for the enhanced rules extraction engine
 */

import AIRuleExtractionService from './server/src/services/aiRuleExtractionService.js';
import BatchRuleExtractionService from './server/src/services/batchRuleExtractionService.js';
import aiIntegrationService from './server/src/services/aiIntegrationService.js';

// Mock Prisma client for testing
const mockPrisma = {
  contract: {
    findUnique: async (options) => ({
      id: 'test-contract-1',
      name: 'Test Energy Contract',
      client: 'Test Corp',
      capacity: 1000,
      term: 15,
      systemType: 'MICROGRID_CONSTRAINED',
      financial: {
        baseRate: 0.085,
        escalation: 3.2,
        thermalCycleFee: 750
      },
      technical: {
        voltage: 'V_13_2K',
        servers: 3,
        components: ['RI', 'AC', 'BESS']
      },
      operating: {
        outputWarranty: 92,
        efficiency: 48,
        minDemand: 200,
        maxDemand: 800,
        criticalOutput: 800
      },
      uploads: [{
        fileName: 'contract.pdf',
        extractedData: {
          content: {
            text: 'This energy service agreement has a base rate of $0.085 per kWh with annual escalation of 3.2%. The system capacity is 1000 kW with output warranty of 92% efficiency. Payment terms are NET30 with thermal cycle fee of $750.'
          }
        }
      }],
      notes: 'Standard microgrid configuration for healthcare facility.'
    }),
    findMany: async (options) => [
      // Return mock contract data
      await mockPrisma.contract.findUnique(options)
    ]
  },
  learnedRule: {
    findMany: async () => [],
    count: async () => 0,
    groupBy: async () => [],
    create: async (data) => ({ id: 'test-rule-1', ...data.data }),
    upsert: async (options) => ({ id: 'test-rule-1', ...options.create })
  }
};

async function testBasicRuleExtraction() {
  console.log('\n=== Testing Basic Rule Extraction ===');
  
  try {
    const service = new AIRuleExtractionService(mockPrisma, aiIntegrationService);
    const result = await service.extractRulesFromContract('test-contract-1', {
      useAI: false // Test without AI first
    });
    
    console.log('✅ Basic extraction successful');
    console.log(`   Rules extracted: ${result.rulesExtracted}`);
    console.log(`   Confidence: ${result.confidence}`);
    console.log(`   Categories found: ${result.rules.map(r => r.category).join(', ')}`);
    
    return result;
  } catch (error) {
    console.error('❌ Basic extraction failed:', error.message);
    return null;
  }
}

async function testAIEnhancedExtraction() {
  console.log('\n=== Testing AI-Enhanced Rule Extraction ===');
  
  try {
    const service = new AIRuleExtractionService(mockPrisma, aiIntegrationService);
    const result = await service.extractRulesFromContract('test-contract-1', {
      useAI: true
    });
    
    console.log('✅ AI-enhanced extraction successful');
    console.log(`   Rules extracted: ${result.rulesExtracted}`);
    console.log(`   AI enhancements: ${JSON.stringify(result.aiEnhancements, null, 2)}`);
    console.log(`   Anomalies detected: ${result.anomalies?.length || 0}`);
    
    return result;
  } catch (error) {
    console.error('❌ AI-enhanced extraction failed:', error.message);
    return null;
  }
}

async function testBatchExtraction() {
  console.log('\n=== Testing Batch Rule Extraction ===');
  
  try {
    const service = new BatchRuleExtractionService(mockPrisma, aiIntegrationService);
    
    // Listen for events
    service.on('job:started', (data) => {
      console.log(`📊 Batch job started: ${data.jobId}`);
    });
    
    service.on('contract:processed', (data) => {
      console.log(`   ✓ Contract ${data.contractId} processed (${data.rulesExtracted} rules, confidence: ${data.confidence})`);
    });
    
    service.on('job:completed', (data) => {
      console.log(`✅ Batch job completed: ${JSON.stringify(data.results, null, 2)}`);
    });
    
    const result = await service.extractRulesFromContracts(['test-contract-1'], {
      useAI: false,
      enableLearning: true
    });
    
    console.log('✅ Batch extraction successful');
    return result;
    
  } catch (error) {
    console.error('❌ Batch extraction failed:', error.message);
    return null;
  }
}

async function testAIServiceConnection() {
  console.log('\n=== Testing AI Service Connection ===');
  
  try {
    const status = aiIntegrationService.getStatus();
    console.log('AI Service Status:', JSON.stringify(status, null, 2));
    
    const testResult = await aiIntegrationService.testConnection();
    console.log('AI Connection Test:', JSON.stringify(testResult, null, 2));
    
    return testResult.success;
  } catch (error) {
    console.error('❌ AI service test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Rules Extraction Engine Tests');
  console.log('='.repeat(50));
  
  const results = {
    aiConnection: await testAIServiceConnection(),
    basicExtraction: await testBasicRuleExtraction(),
    aiEnhancedExtraction: await testAIEnhancedExtraction(),
    batchExtraction: await testBatchExtraction()
  };
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary:');
  console.log(`   AI Connection: ${results.aiConnection ? '✅' : '❌'}`);
  console.log(`   Basic Extraction: ${results.basicExtraction ? '✅' : '❌'}`);
  console.log(`   AI-Enhanced Extraction: ${results.aiEnhancedExtraction ? '✅' : '❌'}`);
  console.log(`   Batch Extraction: ${results.batchExtraction ? '✅' : '❌'}`);
  
  const successCount = Object.values(results).filter(Boolean).length;
  console.log(`\n🎯 Overall Success Rate: ${successCount}/4 (${(successCount/4*100).toFixed(1)}%)`);
  
  if (successCount === 4) {
    console.log('🎉 All tests passed! Rules extraction engine is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the error messages above.');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests, testBasicRuleExtraction, testAIEnhancedExtraction, testBatchExtraction };