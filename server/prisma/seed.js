import { PrismaClient } from '../../generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create users
  console.log('👥 Creating users...');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@bloomenergy.com' },
    update: {},
    create: {
      email: 'admin@bloomenergy.com',
      password: await bcrypt.hash('AdminBloom123!', 12),
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true
    }
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@bloomenergy.com' },
    update: {},
    create: {
      email: 'manager@bloomenergy.com',
      password: await bcrypt.hash('ManagerBloom123!', 12),
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'MANAGER',
      isActive: true
    }
  });

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@bloomenergy.com' },
    update: {},
    create: {
      email: 'user@bloomenergy.com',
      password: await bcrypt.hash('UserBloom123!', 12),
      firstName: 'John',
      lastName: 'Smith',
      role: 'USER',
      isActive: true
    }
  });

  // Keep existing demo user
  const demoUser = await prisma.user.findUnique({
    where: { email: 'demo@bloomenergy.com' }
  });

  console.log('✅ Users created successfully');

  // Create contract templates
  console.log('📋 Creating contract templates...');
  const standardTemplate = await prisma.contractTemplate.upsert({
    where: { id: 'standard-template-1' },
    update: {},
    create: {
      id: 'standard-template-1',
      name: 'Standard Power Purchase Agreement',
      description: 'Standard template for power purchase agreements with typical Bloom Energy configurations',
      category: 'standard',
      isActive: true,
      formData: {
        capacity: 650,
        term: 10,
        systemType: 'POWER_PURCHASE_STANDARD',
        financial: {
          baseRate: 0.12,
          escalation: 2.5,
          microgridAdder: 0.02
        },
        technical: {
          voltage: 'V_480',
          components: ['RI', 'AC'],
          servers: 2
        },
        operating: {
          outputWarranty: 95,
          efficiency: 85,
          minDemand: 100,
          maxDemand: 600,
          criticalOutput: 500
        }
      },
      usageCount: 15,
      createdBy: adminUser.id
    }
  });

  const microgridTemplate = await prisma.contractTemplate.upsert({
    where: { id: 'microgrid-template-1' },
    update: {},
    create: {
      id: 'microgrid-template-1',
      name: 'Microgrid with Battery Storage',
      description: 'Template for microgrid installations with battery energy storage systems',
      category: 'custom',
      isActive: true,
      formData: {
        capacity: 975,
        term: 15,
        systemType: 'MICROGRID_CONSTRAINED',
        financial: {
          baseRate: 0.15,
          escalation: 3.0,
          microgridAdder: 0.05,
          thermalCycleFee: 0.01
        },
        technical: {
          voltage: 'V_4_16K',
          components: ['RI', 'AC', 'UC', 'BESS'],
          servers: 3
        },
        operating: {
          outputWarranty: 92,
          efficiency: 82,
          minDemand: 200,
          maxDemand: 900,
          criticalOutput: 800
        }
      },
      usageCount: 8,
      createdBy: managerUser.id
    }
  });

  const industrialTemplate = await prisma.contractTemplate.upsert({
    where: { id: 'industrial-template-1' },
    update: {},
    create: {
      id: 'industrial-template-1',
      name: 'Industrial High-Capacity System',
      description: 'Template for large industrial installations with high capacity requirements',
      category: 'industry',
      isActive: true,
      formData: {
        capacity: 1950,
        term: 20,
        systemType: 'POWER_PURCHASE_WITH_BATTERY',
        financial: {
          baseRate: 0.11,
          escalation: 2.0,
          electricalBudget: 50000,
          commissioningAllowance: 25000
        },
        technical: {
          voltage: 'V_13_2K',
          components: ['RI', 'AC', 'UC', 'BESS', 'SOLAR'],
          servers: 6
        },
        operating: {
          outputWarranty: 98,
          efficiency: 88,
          minDemand: 500,
          maxDemand: 1800,
          criticalOutput: 1600
        }
      },
      usageCount: 3,
      createdBy: adminUser.id
    }
  });

  console.log('✅ Templates created successfully');

  // Create sample contracts
  console.log('📄 Creating sample contracts...');
  
  // Contract 1 - Completed
  const contract1 = await prisma.contract.create({
    data: {
      name: 'Walmart Distribution Center - Phoenix',
      client: 'Walmart Inc.',
      site: 'Phoenix Distribution Center, AZ',
      capacity: 975,
      term: 15,
      systemType: 'POWER_PURCHASE_STANDARD',
      effectiveDate: new Date('2024-01-15'),
      status: 'ACTIVE',
      totalValue: 2850000,
      yearlyRate: 190000,
      notes: 'Large retail distribution center with high energy demands. System installed and operational.',
      tags: ['retail', 'distribution', 'high-capacity'],
      createdBy: managerUser.id,
      financial: {
        create: {
          baseRate: 0.125,
          escalation: 2.5,
          microgridAdder: 0.02,
          thermalCycleFee: 0.005
        }
      },
      technical: {
        create: {
          voltage: 'V_480',
          servers: 3,
          components: ['RI', 'AC', 'UC']
        }
      },
      operating: {
        create: {
          outputWarranty: 95,
          efficiency: 85,
          minDemand: 200,
          maxDemand: 900,
          criticalOutput: 800
        }
      }
    }
  });

  // Contract 2 - Active
  const contract2 = await prisma.contract.create({
    data: {
      name: 'University of California - Research Campus',
      client: 'University of California System',
      site: 'UC Research Campus, Berkeley, CA',
      capacity: 1300,
      term: 20,
      systemType: 'MICROGRID_CONSTRAINED',
      effectiveDate: new Date('2024-03-01'),
      status: 'ACTIVE',
      totalValue: 4200000,
      yearlyRate: 210000,
      notes: 'Research campus microgrid with battery storage for critical lab operations. Includes solar integration.',
      tags: ['education', 'research', 'microgrid', 'solar'],
      createdBy: regularUser.id,
      financial: {
        create: {
          baseRate: 0.14,
          escalation: 3.0,
          microgridAdder: 0.04,
          electricalBudget: 35000
        }
      },
      technical: {
        create: {
          voltage: 'V_4_16K',
          servers: 4,
          components: ['RI', 'AC', 'UC', 'BESS', 'SOLAR']
        }
      },
      operating: {
        create: {
          outputWarranty: 92,
          efficiency: 83,
          minDemand: 300,
          maxDemand: 1200,
          criticalOutput: 1100
        }
      }
    }
  });

  // Contract 3 - Draft
  const contract3 = await prisma.contract.create({
    data: {
      name: 'Amazon Fulfillment Center - Dallas',
      client: 'Amazon Web Services',
      site: 'Dallas Fulfillment Center, TX',
      capacity: 650,
      term: 10,
      systemType: 'POWER_PURCHASE_STANDARD',
      effectiveDate: new Date('2024-06-15'),
      status: 'DRAFT',
      totalValue: 1950000,
      yearlyRate: 195000,
      notes: 'Fulfillment center power purchase agreement. Currently in contract negotiation phase.',
      tags: ['logistics', 'fulfillment', 'draft'],
      createdBy: demoUser?.id || regularUser.id,
      financial: {
        create: {
          baseRate: 0.13,
          escalation: 2.0,
          microgridAdder: 0.015
        }
      },
      technical: {
        create: {
          voltage: 'V_480',
          servers: 2,
          components: ['RI', 'AC']
        }
      },
      operating: {
        create: {
          outputWarranty: 94,
          efficiency: 86,
          minDemand: 150,
          maxDemand: 600,
          criticalOutput: 550
        }
      }
    }
  });

  // Contract 4 - High capacity industrial
  const contract4 = await prisma.contract.create({
    data: {
      name: 'Intel Manufacturing Facility',
      client: 'Intel Corporation',
      site: 'Chandler Manufacturing, AZ',
      capacity: 2275,
      term: 25,
      systemType: 'MICROGRID_UNCONSTRAINED',
      effectiveDate: new Date('2024-02-01'),
      status: 'ACTIVE',
      totalValue: 8500000,
      yearlyRate: 340000,
      notes: 'Large semiconductor manufacturing facility with critical power requirements and advanced microgrid capabilities.',
      tags: ['manufacturing', 'semiconductor', 'critical-power', 'high-capacity'],
      createdBy: adminUser.id,
      financial: {
        create: {
          baseRate: 0.115,
          escalation: 1.8,
          microgridAdder: 0.06,
          electricalBudget: 75000,
          commissioningAllowance: 45000
        }
      },
      technical: {
        create: {
          voltage: 'V_13_2K',
          servers: 7,
          components: ['RI', 'AC', 'UC', 'BESS', 'SOLAR']
        }
      },
      operating: {
        create: {
          outputWarranty: 98,
          efficiency: 89,
          minDemand: 800,
          maxDemand: 2200,
          criticalOutput: 2000
        }
      }
    }
  });

  // Contract 5 - Small business
  const contract5 = await prisma.contract.create({
    data: {
      name: 'Local Hospital Emergency Power',
      client: 'St. Mary\'s Medical Center',
      site: 'San Francisco, CA',
      capacity: 325,
      term: 12,
      systemType: 'POWER_PURCHASE_WITH_BATTERY',
      effectiveDate: new Date('2024-04-01'),
      status: 'PENDING',
      totalValue: 1200000,
      yearlyRate: 100000,
      notes: 'Critical power backup system for hospital emergency operations. Includes battery storage for seamless power transition.',
      tags: ['healthcare', 'emergency', 'critical-power', 'small-scale'],
      createdBy: managerUser.id,
      financial: {
        create: {
          baseRate: 0.155,
          escalation: 2.8,
          microgridAdder: 0.03,
          thermalCycleFee: 0.008
        }
      },
      technical: {
        create: {
          voltage: 'V_208',
          servers: 1,
          components: ['RI', 'AC', 'BESS']
        }
      },
      operating: {
        create: {
          outputWarranty: 96,
          efficiency: 84,
          minDemand: 50,
          maxDemand: 300,
          criticalOutput: 275
        }
      }
    }
  });

  console.log('✅ Contracts created successfully');

  // Create learned rules
  console.log('🧠 Creating learned rules...');
  
  const capacityRule = await prisma.learnedRule.create({
    data: {
      ruleType: 'RANGE',
      category: 'technical',
      name: 'capacity_range',
      ruleData: {
        min: 325,
        max: 3250,
        step: 325,
        common: [650, 975, 1300, 1625, 1950],
        unit: 'kW',
        description: 'Valid capacity ranges for Bloom Energy systems'
      },
      confidence: 0.95,
      occurrences: 147,
      source: 'historical_contracts',
      isActive: true
    }
  });

  const escalationRule = await prisma.learnedRule.create({
    data: {
      ruleType: 'RANGE',
      category: 'financial',
      name: 'escalation_range',
      ruleData: {
        min: 1.5,
        max: 5.0,
        typical: 2.5,
        unit: 'percent',
        description: 'Annual escalation rates typically seen in contracts'
      },
      confidence: 0.89,
      occurrences: 134,
      source: 'financial_analysis',
      isActive: true
    }
  });

  const voltageRule = await prisma.learnedRule.create({
    data: {
      ruleType: 'ENUM',
      category: 'technical',
      name: 'voltage_options',
      ruleData: {
        values: ['V_208', 'V_480', 'V_4_16K', 'V_13_2K', 'V_34_5K'],
        common: ['V_480', 'V_4_16K'],
        descriptions: {
          V_208: '208V - Small commercial applications',
          V_480: '480V - Standard commercial/industrial',
          V_4_16K: '4.16kV - Large commercial/light industrial',
          V_13_2K: '13.2kV - Heavy industrial applications',
          V_34_5K: '34.5kV - Utility-scale applications'
        }
      },
      confidence: 0.92,
      occurrences: 89,
      source: 'technical_specifications',
      isActive: true
    }
  });

  const systemTypeRule = await prisma.learnedRule.create({
    data: {
      ruleType: 'CORRELATION',
      category: 'system',
      name: 'system_capacity_correlation',
      ruleData: {
        correlations: [
          {
            systemType: 'POWER_PURCHASE_STANDARD',
            capacityRange: [325, 1300],
            commonComponents: ['RI', 'AC']
          },
          {
            systemType: 'MICROGRID_CONSTRAINED',
            capacityRange: [650, 1950],
            commonComponents: ['RI', 'AC', 'UC', 'BESS']
          },
          {
            systemType: 'MICROGRID_UNCONSTRAINED',
            capacityRange: [975, 3250],
            commonComponents: ['RI', 'AC', 'UC', 'BESS', 'SOLAR']
          }
        ],
        description: 'System type correlations with capacity and component requirements'
      },
      confidence: 0.87,
      occurrences: 76,
      source: 'system_analysis',
      isActive: true
    }
  });

  console.log('✅ Learned rules created successfully');

  // Create system statistics
  console.log('📊 Creating system statistics...');
  
  const currentStats = await prisma.systemStats.create({
    data: {
      totalContracts: 5,
      totalValue: 19200000,
      averageContractValue: 3840000,
      monthlyGrowth: 12.5,
      completionRate: 85.2,
      contractsByStatus: {
        ACTIVE: 3,
        DRAFT: 1,
        PENDING: 1,
        COMPLETED: 0,
        CANCELLED: 0
      },
      contractsByType: {
        POWER_PURCHASE_STANDARD: 2,
        POWER_PURCHASE_WITH_BATTERY: 1,
        MICROGRID_CONSTRAINED: 1,
        MICROGRID_UNCONSTRAINED: 1
      },
      snapshotDate: new Date()
    }
  });

  console.log('✅ System statistics created successfully');

  // Create sample AI messages
  console.log('💬 Creating sample AI messages...');
  
  const sessionId = 'demo-session-' + Date.now();
  
  await prisma.aIMessage.createMany({
    data: [
      {
        sessionId,
        role: 'USER',
        content: 'What is the typical capacity range for Bloom Energy systems?',
        timestamp: new Date(Date.now() - 3600000) // 1 hour ago
      },
      {
        sessionId,
        role: 'ASSISTANT',
        content: 'Bloom Energy systems typically range from 325kW to 3,250kW capacity, in increments of 325kW. The most common configurations are 650kW, 975kW, 1,300kW, and 1,950kW. The choice depends on your facility\'s power requirements and system type.',
        timestamp: new Date(Date.now() - 3599000),
        metadata: {
          confidence: 0.95,
          source: 'learned_rules',
          ruleIds: [capacityRule.id]
        }
      },
      {
        sessionId,
        role: 'USER',
        content: 'What components are typically included in a microgrid system?',
        timestamp: new Date(Date.now() - 1800000) // 30 minutes ago
      },
      {
        sessionId,
        role: 'ASSISTANT',
        content: 'Microgrid systems typically include Renewable Integration (RI), Advanced Controls (AC), Utility Connections (UC), and Battery Energy Storage Systems (BESS). Larger unconstrained microgrids may also include Solar integration. The specific components depend on your power requirements and grid independence needs.',
        timestamp: new Date(Date.now() - 1799000),
        metadata: {
          confidence: 0.87,
          source: 'system_analysis',
          ruleIds: [systemTypeRule.id]
        }
      }
    ]
  });

  console.log('✅ AI messages created successfully');

  console.log('\n🎉 Database seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   👥 Users: 4 (admin, manager, user, demo)`);
  console.log(`   📋 Templates: 3 (standard, microgrid, industrial)`);
  console.log(`   📄 Contracts: 5 (various types and statuses)`);
  console.log(`   🧠 Learned Rules: 4 (capacity, escalation, voltage, system correlation)`);
  console.log(`   📊 System Stats: Current snapshot`);
  console.log(`   💬 AI Messages: Demo conversation history`);
  console.log('\n🔑 Test Credentials:');
  console.log(`   Admin: admin@bloomenergy.com / AdminBloom123!`);
  console.log(`   Manager: manager@bloomenergy.com / ManagerBloom123!`);
  console.log(`   User: user@bloomenergy.com / UserBloom123!`);
  console.log(`   Demo: demo@bloomenergy.com / BloomDemo123!`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });