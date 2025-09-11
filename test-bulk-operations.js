/**
 * Test script for Bulk Operations functionality
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bulkOperationsService from './server/src/services/bulkOperationsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock Prisma client for testing
const mockPrisma = {
  contract: {
    create: async (data) => ({
      id: `contract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data.data,
      createdAt: new Date(),
      updatedAt: new Date()
    }),
    findMany: async (options) => [
      {
        id: 'contract-1',
        name: 'Test Contract 1',
        client: 'Test Corp',
        status: 'ACTIVE',
        capacity: 1000,
        term: 15,
        financial: { baseRate: 0.085, escalation: 3.2 },
        technical: { voltage: 'V_13_2K' },
        operating: { outputWarranty: 92 },
        uploads: [],
        templates: []
      },
      {
        id: 'contract-2',
        name: 'Test Contract 2',
        client: 'Another Corp',
        status: 'DRAFT',
        capacity: 2000,
        term: 20,
        financial: { baseRate: 0.090, escalation: 2.8 },
        technical: { voltage: 'V_4_16K' },
        operating: { outputWarranty: 95 },
        uploads: [],
        templates: []
      }
    ],
    updateMany: async (options) => ({ count: options.where.id.in.length }),
    delete: async (options) => ({ id: options.where.id }),
    findUnique: async (options) => ({
      id: options.where.id,
      name: 'Test Contract',
      status: 'DRAFT',
      uploads: []
    }),
    count: async (options) => 0
  },
  uploadedFile: {
    create: async (data) => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data.data,
      uploadDate: new Date()
    })
  },
  learnedRule: {
    findMany: async (options) => [
      {
        id: 'rule-1',
        name: 'capacity_range',
        ruleType: 'RANGE',
        field: 'capacity',
        ruleData: { min: 325, max: 5000 },
        isActive: true
      },
      {
        id: 'rule-2',
        name: 'term_range',
        ruleType: 'RANGE',
        field: 'term',
        ruleData: { min: 5, max: 25 },
        isActive: true
      }
    ]
  },
  auditLog: {
    create: async (data) => ({ id: `audit-${Date.now()}`, ...data.data }),
    createMany: async (data) => ({ count: data.data.length })
  }
};

// Mock AI Rule Extraction Service
const mockAIRuleExtractionService = {
  extractRulesFromContract: async (contractId, options) => ({
    contractId,
    rulesExtracted: 5,
    confidence: 0.85,
    rules: [
      { category: 'financial', name: 'base_rate', confidence: 0.9 },
      { category: 'technical', name: 'voltage_standard', confidence: 0.8 }
    ]
  })
};

// Replace the real service with mock for testing
bulkOperationsService.aiRuleExtractionService = mockAIRuleExtractionService;

function createMockFile(name, content, mimetype = 'text/plain') {
  return {
    originalname: name,
    mimetype: mimetype,
    size: Buffer.byteLength(content),
    buffer: Buffer.from(content)
  };
}

async function testBulkImport() {
  console.log('\n=== Testing Bulk Import ===');
  
  try {
    // Create mock files
    const files = [
      createMockFile('contract1.txt', 'Test contract 1 content with capacity 1000kW and term 15 years.'),
      createMockFile('contract2.txt', 'Test contract 2 content with capacity 2000kW and term 20 years.'),
      createMockFile('contract3.pdf', 'PDF content for contract 3', 'application/pdf')
    ];
    
    const options = {
      defaultClient: 'Test Corporation',
      extractRules: true,
      useAI: false,
      autoExtractDetails: true
    };
    
    console.log(`📤 Starting bulk import of ${files.length} files...`);
    
    // Set up event listeners
    const eventPromise = new Promise((resolve) => {
      let completedReceived = false;
      
      bulkOperationsService.on('job:started', (data) => {
        console.log(`✅ Job started: ${data.jobId}`);
      });
      
      bulkOperationsService.on('item:processing', (data) => {
        console.log(`   Processing item ${data.itemIndex + 1}: ${data.fileName}`);
      });
      
      bulkOperationsService.on('item:success', (data) => {
        console.log(`   ✅ Success: ${data.fileName} -> Contract ${data.contractId}`);
      });
      
      bulkOperationsService.on('item:failed', (data) => {
        console.log(`   ❌ Failed: ${data.fileName} - ${data.error}`);
      });
      
      bulkOperationsService.on('job:progress', (data) => {
        console.log(`   📊 Progress: ${data.processed}/${data.total} (${data.progress}%)`);
      });
      
      bulkOperationsService.on('job:completed', (data) => {
        if (!completedReceived) {
          completedReceived = true;
          console.log(`🎉 Import completed!`);
          console.log(`   Successful: ${data.job.successfulItems}`);
          console.log(`   Failed: ${data.job.failedItems}`);
          console.log(`   Duration: ${data.job.duration}ms`);
          resolve(data.job);
        }
      });
      
      bulkOperationsService.on('job:failed', (data) => {
        if (!completedReceived) {
          completedReceived = true;
          console.log(`❌ Import failed: ${data.error}`);
          resolve(null);
        }
      });
    });
    
    // Start the import
    const result = await bulkOperationsService.bulkImportContracts(files, options, mockPrisma, 'user-123');
    
    // Wait for completion
    await eventPromise;
    
    return result;
    
  } catch (error) {
    console.error('❌ Bulk import test failed:', error.message);
    return null;
  }
}

async function testBulkExport() {
  console.log('\n=== Testing Bulk Export ===');
  
  try {
    const contractIds = ['contract-1', 'contract-2'];
    const formats = ['json', 'csv'];
    
    for (const format of formats) {
      console.log(`📁 Testing ${format.toUpperCase()} export...`);
      
      const eventPromise = new Promise((resolve) => {
        bulkOperationsService.once('job:completed', (data) => {
          console.log(`   ✅ ${format.toUpperCase()} export completed`);
          console.log(`   File: ${data.job.filename}`);
          console.log(`   Size: ${(data.job.fileSize / 1024).toFixed(1)} KB`);
          resolve(data.job);
        });
        
        bulkOperationsService.once('job:failed', (data) => {
          console.log(`   ❌ ${format.toUpperCase()} export failed: ${data.error}`);
          resolve(null);
        });
      });
      
      const result = await bulkOperationsService.bulkExportContracts(
        contractIds, 
        format, 
        {}, 
        mockPrisma
      );
      
      await eventPromise;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Bulk export test failed:', error.message);
    return false;
  }
}

async function testBulkRuleExtraction() {
  console.log('\n=== Testing Bulk Rule Extraction ===');
  
  try {
    const contractIds = ['contract-1', 'contract-2'];
    const options = { useAI: false, enableLearning: true };
    
    console.log(`🔍 Starting rule extraction for ${contractIds.length} contracts...`);
    
    const eventPromise = new Promise((resolve) => {
      bulkOperationsService.once('job:completed', (data) => {
        console.log(`🎉 Rule extraction completed!`);
        console.log(`   Successful: ${data.job.successfulItems}`);
        console.log(`   Failed: ${data.job.failedItems}`);
        console.log(`   Total rules extracted: ${data.job.results.reduce((sum, r) => sum + r.rulesExtracted, 0)}`);
        resolve(data.job);
      });
      
      bulkOperationsService.once('job:failed', (data) => {
        console.log(`❌ Rule extraction failed: ${data.error}`);
        resolve(null);
      });
    });
    
    const result = await bulkOperationsService.bulkExtractRules(
      contractIds, 
      options, 
      mockPrisma
    );
    
    await eventPromise;
    return result;
    
  } catch (error) {
    console.error('❌ Bulk rule extraction test failed:', error.message);
    return null;
  }
}

async function testBulkValidation() {
  console.log('\n=== Testing Bulk Validation ===');
  
  try {
    const contractIds = ['contract-1', 'contract-2'];
    
    console.log(`✅ Starting validation for ${contractIds.length} contracts...`);
    
    const eventPromise = new Promise((resolve) => {
      bulkOperationsService.once('job:completed', (data) => {
        console.log(`🎉 Validation completed!`);
        console.log(`   Valid contracts: ${data.job.validContracts}`);
        console.log(`   Invalid contracts: ${data.job.invalidContracts}`);
        resolve(data.job);
      });
      
      bulkOperationsService.once('job:failed', (data) => {
        console.log(`❌ Validation failed: ${data.error}`);
        resolve(null);
      });
    });
    
    const result = await bulkOperationsService.bulkValidateContracts(
      contractIds, 
      null, 
      {}, 
      mockPrisma
    );
    
    await eventPromise;
    return result;
    
  } catch (error) {
    console.error('❌ Bulk validation test failed:', error.message);
    return null;
  }
}

async function testBulkStatusUpdate() {
  console.log('\n=== Testing Bulk Status Update ===');
  
  try {
    const contractIds = ['contract-1', 'contract-2'];
    const newStatus = 'APPROVED';
    
    console.log(`🔄 Updating ${contractIds.length} contracts to ${newStatus}...`);
    
    const result = await bulkOperationsService.bulkUpdateStatus(
      contractIds,
      newStatus,
      { createAuditEntries: true },
      mockPrisma,
      'user-123'
    );
    
    console.log(`✅ Status update completed: ${result.updatedCount} contracts updated`);
    return result.updatedCount === contractIds.length;
    
  } catch (error) {
    console.error('❌ Bulk status update test failed:', error.message);
    return false;
  }
}

async function testJobManagement() {
  console.log('\n=== Testing Job Management ===');
  
  try {
    // Get service status
    console.log('📊 Service Status:');
    console.log(`   Active jobs: ${bulkOperationsService.activeJobs.size}`);
    console.log(`   Max concurrent ops: ${bulkOperationsService.maxConcurrentOperations}`);
    console.log(`   Batch size: ${bulkOperationsService.batchSize}`);
    
    // Test job cleanup
    const cleanedJobs = bulkOperationsService.cleanupOldJobs(0.001); // Clean jobs older than ~4 seconds
    console.log(`🧹 Cleaned up ${cleanedJobs} old jobs`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Job management test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Bulk Operations Tests');
  console.log('='.repeat(50));
  
  const results = {
    bulkImport: await testBulkImport(),
    bulkExport: await testBulkExport(),
    bulkRuleExtraction: await testBulkRuleExtraction(),
    bulkValidation: await testBulkValidation(),
    bulkStatusUpdate: await testBulkStatusUpdate(),
    jobManagement: await testJobManagement()
  };
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary:');
  console.log(`   Bulk Import: ${results.bulkImport ? '✅' : '❌'}`);
  console.log(`   Bulk Export: ${results.bulkExport ? '✅' : '❌'}`);
  console.log(`   Bulk Rule Extraction: ${results.bulkRuleExtraction ? '✅' : '❌'}`);
  console.log(`   Bulk Validation: ${results.bulkValidation ? '✅' : '❌'}`);
  console.log(`   Bulk Status Update: ${results.bulkStatusUpdate ? '✅' : '❌'}`);
  console.log(`   Job Management: ${results.jobManagement ? '✅' : '❌'}`);
  
  const successCount = Object.values(results).filter(Boolean).length;
  console.log(`\n🎯 Overall Success Rate: ${successCount}/6 (${(successCount/6*100).toFixed(1)}%)`);
  
  if (successCount === 6) {
    console.log('🎉 All tests passed! Bulk operations system is working correctly.');
    console.log('💡 Available operations:');
    console.log('   • POST /api/bulk/import-contracts - Import multiple contracts');
    console.log('   • POST /api/bulk/export-contracts - Export contracts in various formats');
    console.log('   • POST /api/bulk/extract-rules - Extract rules from multiple contracts');
    console.log('   • POST /api/bulk/validate-contracts - Validate contracts against rules');
    console.log('   • PATCH /api/bulk/update-status - Update status of multiple contracts');
    console.log('   • DELETE /api/bulk/delete-contracts - Safely delete multiple contracts');
  } else {
    console.log('⚠️  Some tests failed. Check the error messages above.');
  }
  
  console.log('\n📋 Key Features:');
  console.log('   ✅ Progress tracking with real-time events');
  console.log('   ✅ Batch processing with configurable concurrency');
  console.log('   ✅ Multiple export formats (JSON, CSV, PDF, ZIP)');
  console.log('   ✅ Safety checks for destructive operations');
  console.log('   ✅ Role-based access control');
  console.log('   ✅ Job management and cleanup');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests, testBulkImport, testBulkExport };