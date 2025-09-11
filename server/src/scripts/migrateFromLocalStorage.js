import { PrismaClient } from '@prisma/client';
import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class LocalStorageMigration {
  constructor() {
    this.contracts = [];
    this.templates = [];
    this.learnedRules = [];
    this.migrationResults = {
      contracts: { success: 0, failed: 0 },
      templates: { success: 0, failed: 0 },
      learnedRules: { success: 0, failed: 0 }
    };
  }

  // Prompt user for confirmation
  async prompt(question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer.toLowerCase().trim());
      });
    });
  }

  // Load localStorage data from JSON file or user input
  async loadLocalStorageData() {
    console.log('\n=== Bloom Energy Contract System - LocalStorage Migration ===\n');
    
    const method = await this.prompt(
      'How would you like to provide localStorage data?\n' +
      '1. Load from JSON file\n' +
      '2. Paste JSON data directly\n' +
      'Enter choice (1 or 2): '
    );

    if (method === '1') {
      await this.loadFromFile();
    } else if (method === '2') {
      await this.loadFromInput();
    } else {
      console.log('Invalid choice. Please run the script again.');
      process.exit(1);
    }
  }

  // Load data from JSON file
  async loadFromFile() {
    const filePath = await this.prompt('Enter the path to your localStorage JSON file: ');
    
    try {
      const fileContent = await fs.readFile(path.resolve(filePath), 'utf-8');
      const data = JSON.parse(fileContent);
      this.parseLocalStorageData(data);
      console.log('✅ Successfully loaded data from file');
    } catch (error) {
      console.error('❌ Error loading file:', error.message);
      console.log('\nExample file format:');
      console.log(JSON.stringify({
        'bloom-contracts': [{ id: 'BEC-001', name: 'Sample Contract', /* ... */ }],
        'bloom-templates': [{ id: 'TMPL-001', name: 'Sample Template', /* ... */ }],
        'bloom-learned-rules': [{ id: 'RULE-001', type: 'validation', /* ... */ }]
      }, null, 2));
      process.exit(1);
    }
  }

  // Load data from direct input
  async loadFromInput() {
    console.log('\nPlease paste your localStorage JSON data (press Enter twice when done):');
    
    let jsonData = '';
    const inputRL = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      inputRL.on('line', (line) => {
        if (line.trim() === '' && jsonData.trim() !== '') {
          inputRL.close();
          try {
            const data = JSON.parse(jsonData);
            this.parseLocalStorageData(data);
            console.log('✅ Successfully parsed JSON data');
            resolve();
          } catch (error) {
            console.error('❌ Invalid JSON:', error.message);
            process.exit(1);
          }
        } else {
          jsonData += line + '\n';
        }
      });
    });
  }

  // Parse localStorage data structure
  parseLocalStorageData(data) {
    // Extract contracts
    this.contracts = data['bloom-contracts'] || data.contracts || [];
    
    // Extract templates
    this.templates = data['bloom-templates'] || data.templates || [];
    
    // Extract learned rules
    this.learnedRules = data['bloom-learned-rules'] || data.learnedRules || [];

    console.log(`\nFound data:`);
    console.log(`- ${this.contracts.length} contracts`);
    console.log(`- ${this.templates.length} templates`);
    console.log(`- ${this.learnedRules.length} learned rules`);
  }

  // Transform contract data for database
  transformContract(localContract) {
    const now = new Date();
    
    return {
      id: localContract.id || `BEC-${Date.now()}`,
      name: localContract.name || localContract.customerName || 'Untitled Contract',
      client: localContract.customerName || localContract.client?.name || 'Unknown Client',
      site: localContract.site || localContract.client?.address?.city || 'Unknown Site',
      capacity: parseFloat(localContract.ratedCapacity || localContract.capacity || 0),
      term: parseInt(localContract.contractTerm || localContract.term || 10),
      systemType: localContract.solutionType || localContract.systemType || 'PP',
      status: localContract.status || 'DRAFT',
      effectiveDate: localContract.effectiveDate ? new Date(localContract.effectiveDate) : now,
      totalValue: parseFloat(localContract.totalValue || 0),
      tags: localContract.tags || [],
      createdAt: localContract.createdAt ? new Date(localContract.createdAt) : now,
      updatedAt: now,
      
      // Related data
      financial: localContract.financial ? {
        create: {
          baseRate: parseFloat(localContract.financial.baseRate || localContract.baseRate || 0),
          microgridAdder: parseFloat(localContract.financial.microgridAdder || 0),
          escalation: parseFloat(localContract.financial.escalation || localContract.annualEscalation || 2.5)
        }
      } : undefined,
      
      technical: localContract.technical ? {
        create: {
          voltage: localContract.technical.voltage || localContract.voltage || '480V',
          servers: parseInt(localContract.technical.servers || 1),
          components: localContract.technical.components || localContract.components || []
        }
      } : undefined,
      
      operating: localContract.operating ? {
        create: {
          outputWarranty: parseFloat(localContract.operating.outputWarranty || localContract.guaranteedCriticalOutput || 0),
          efficiency: parseFloat(localContract.operating.efficiency || localContract.efficiencyWarranty || 90),
          minDemand: parseFloat(localContract.operating.minDemand || 0),
          maxDemand: parseFloat(localContract.operating.maxDemand || localContract.guaranteedCriticalOutput || 0),
          criticalOutput: parseFloat(localContract.operating.criticalOutput || localContract.guaranteedCriticalOutput || 0)
        }
      } : undefined
    };
  }

  // Transform template data for database
  transformTemplate(localTemplate) {
    const now = new Date();
    
    return {
      id: localTemplate.id || `TMPL-${Date.now()}`,
      name: localTemplate.name || 'Untitled Template',
      description: localTemplate.description || null,
      category: localTemplate.category || 'GENERAL',
      industry: localTemplate.industry || null,
      systemType: localTemplate.systemType || null,
      isPublic: localTemplate.isPublic || false,
      isActive: localTemplate.isActive !== false,
      templateData: localTemplate.templateData || localTemplate,
      usageCount: parseInt(localTemplate.usageCount || 0),
      createdAt: localTemplate.createdAt ? new Date(localTemplate.createdAt) : now,
      updatedAt: now
    };
  }

  // Transform learned rule data for database
  transformLearnedRule(localRule) {
    const now = new Date();
    
    return {
      id: localRule.id || `RULE-${Date.now()}`,
      ruleType: localRule.type || localRule.ruleType || 'VALIDATION',
      field: localRule.field || 'unknown',
      condition: localRule.condition || localRule.rule || {},
      action: localRule.action || 'VALIDATE',
      priority: parseInt(localRule.priority || 1),
      confidenceScore: parseFloat(localRule.confidence || localRule.confidenceScore || 0.5),
      isActive: localRule.isActive !== false,
      sourceContractIds: localRule.sourceContracts || [],
      metadata: localRule.metadata || {},
      createdAt: localRule.createdAt ? new Date(localRule.createdAt) : now,
      updatedAt: now
    };
  }

  // Migrate contracts to database
  async migrateContracts() {
    if (this.contracts.length === 0) {
      console.log('No contracts to migrate.');
      return;
    }

    console.log(`\nMigrating ${this.contracts.length} contracts...`);
    
    for (const [index, contract] of this.contracts.entries()) {
      try {
        const transformedContract = this.transformContract(contract);
        
        // Check if contract already exists
        const existingContract = await prisma.contract.findUnique({
          where: { id: transformedContract.id }
        });

        if (existingContract) {
          const overwrite = await this.prompt(
            `Contract ${transformedContract.id} already exists. Overwrite? (y/n): `
          );
          
          if (overwrite === 'y') {
            await prisma.contract.update({
              where: { id: transformedContract.id },
              data: transformedContract,
              include: {
                financial: true,
                technical: true,
                operating: true
              }
            });
          } else {
            console.log(`Skipped contract ${transformedContract.id}`);
            continue;
          }
        } else {
          await prisma.contract.create({
            data: transformedContract,
            include: {
              financial: true,
              technical: true,
              operating: true
            }
          });
        }

        this.migrationResults.contracts.success++;
        console.log(`✅ [${index + 1}/${this.contracts.length}] Migrated contract: ${transformedContract.name}`);
        
      } catch (error) {
        this.migrationResults.contracts.failed++;
        console.error(`❌ [${index + 1}/${this.contracts.length}] Failed to migrate contract:`, error.message);
      }
    }
  }

  // Migrate templates to database
  async migrateTemplates() {
    if (this.templates.length === 0) {
      console.log('No templates to migrate.');
      return;
    }

    console.log(`\nMigrating ${this.templates.length} templates...`);
    
    for (const [index, template] of this.templates.entries()) {
      try {
        const transformedTemplate = this.transformTemplate(template);
        
        // Check if template already exists
        const existingTemplate = await prisma.contractTemplate.findUnique({
          where: { id: transformedTemplate.id }
        });

        if (existingTemplate) {
          const overwrite = await this.prompt(
            `Template ${transformedTemplate.id} already exists. Overwrite? (y/n): `
          );
          
          if (overwrite === 'y') {
            await prisma.contractTemplate.update({
              where: { id: transformedTemplate.id },
              data: transformedTemplate
            });
          } else {
            console.log(`Skipped template ${transformedTemplate.id}`);
            continue;
          }
        } else {
          await prisma.contractTemplate.create({
            data: transformedTemplate
          });
        }

        this.migrationResults.templates.success++;
        console.log(`✅ [${index + 1}/${this.templates.length}] Migrated template: ${transformedTemplate.name}`);
        
      } catch (error) {
        this.migrationResults.templates.failed++;
        console.error(`❌ [${index + 1}/${this.templates.length}] Failed to migrate template:`, error.message);
      }
    }
  }

  // Migrate learned rules to database
  async migrateLearnedRules() {
    if (this.learnedRules.length === 0) {
      console.log('No learned rules to migrate.');
      return;
    }

    console.log(`\nMigrating ${this.learnedRules.length} learned rules...`);
    
    for (const [index, rule] of this.learnedRules.entries()) {
      try {
        const transformedRule = this.transformLearnedRule(rule);
        
        // Check if rule already exists
        const existingRule = await prisma.learnedRule.findUnique({
          where: { id: transformedRule.id }
        });

        if (existingRule) {
          const overwrite = await this.prompt(
            `Rule ${transformedRule.id} already exists. Overwrite? (y/n): `
          );
          
          if (overwrite === 'y') {
            await prisma.learnedRule.update({
              where: { id: transformedRule.id },
              data: transformedRule
            });
          } else {
            console.log(`Skipped rule ${transformedRule.id}`);
            continue;
          }
        } else {
          await prisma.learnedRule.create({
            data: transformedRule
          });
        }

        this.migrationResults.learnedRules.success++;
        console.log(`✅ [${index + 1}/${this.learnedRules.length}] Migrated rule: ${transformedRule.field}`);
        
      } catch (error) {
        this.migrationResults.learnedRules.failed++;
        console.error(`❌ [${index + 1}/${this.learnedRules.length}] Failed to migrate rule:`, error.message);
      }
    }
  }

  // Generate backup of current database
  async generateBackup() {
    const shouldBackup = await this.prompt('Generate database backup before migration? (recommended) (y/n): ');
    
    if (shouldBackup === 'y') {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = `backup-${timestamp}.json`;
        
        const [contracts, templates, rules] = await Promise.all([
          prisma.contract.findMany({
            include: {
              financial: true,
              technical: true,
              operating: true
            }
          }),
          prisma.contractTemplate.findMany(),
          prisma.learnedRule.findMany()
        ]);

        const backup = {
          timestamp: new Date().toISOString(),
          contracts,
          templates,
          rules
        };

        await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));
        console.log(`✅ Database backup created: ${backupFile}`);
        
      } catch (error) {
        console.error('❌ Failed to create backup:', error.message);
        const continueWithoutBackup = await this.prompt('Continue migration without backup? (y/n): ');
        if (continueWithoutBackup !== 'y') {
          process.exit(1);
        }
      }
    }
  }

  // Display migration results
  displayResults() {
    console.log('\n=== Migration Results ===');
    console.log(`Contracts: ${this.migrationResults.contracts.success} success, ${this.migrationResults.contracts.failed} failed`);
    console.log(`Templates: ${this.migrationResults.templates.success} success, ${this.migrationResults.templates.failed} failed`);
    console.log(`Rules: ${this.migrationResults.learnedRules.success} success, ${this.migrationResults.learnedRules.failed} failed`);
    
    const totalSuccess = this.migrationResults.contracts.success + 
                        this.migrationResults.templates.success + 
                        this.migrationResults.learnedRules.success;
    
    const totalFailed = this.migrationResults.contracts.failed + 
                       this.migrationResults.templates.failed + 
                       this.migrationResults.learnedRules.failed;

    console.log(`\nTotal: ${totalSuccess} migrated successfully, ${totalFailed} failed`);
    
    if (totalSuccess > 0) {
      console.log('✅ Migration completed successfully!');
    }
    
    if (totalFailed > 0) {
      console.log('⚠️  Some items failed to migrate. Check the error messages above.');
    }
  }

  // Run the complete migration
  async run() {
    try {
      await this.loadLocalStorageData();
      await this.generateBackup();
      
      const proceed = await this.prompt('\nProceed with migration? (y/n): ');
      if (proceed !== 'y') {
        console.log('Migration cancelled.');
        process.exit(0);
      }

      await this.migrateContracts();
      await this.migrateTemplates();
      await this.migrateLearnedRules();
      
      this.displayResults();
      
    } catch (error) {
      console.error('Migration failed:', error);
    } finally {
      await prisma.$disconnect();
      rl.close();
    }
  }
}

// Export helper functions for programmatic use
export const migrateContractsFromData = async (contractsData) => {
  const migration = new LocalStorageMigration();
  migration.contracts = contractsData;
  await migration.migrateContracts();
  return migration.migrationResults.contracts;
};

export const migrateTemplatesFromData = async (templatesData) => {
  const migration = new LocalStorageMigration();
  migration.templates = templatesData;
  await migration.migrateTemplates();
  return migration.migrationResults.templates;
};

export const migrateRulesFromData = async (rulesData) => {
  const migration = new LocalStorageMigration();
  migration.learnedRules = rulesData;
  await migration.migrateLearnedRules();
  return migration.migrationResults.learnedRules;
};

// Run migration if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migration = new LocalStorageMigration();
  migration.run().catch(console.error);
}

export default LocalStorageMigration;