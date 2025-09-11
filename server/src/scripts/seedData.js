import { PrismaClient } from '../../../generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const sampleContracts = [
  {
    name: 'PG&E Microgrid Contract',
    client: 'Pacific Gas & Electric',
    site: 'San Francisco, CA',
    capacity: 1000,
    term: 15,
    systemType: 'MG',
    effectiveDate: new Date('2024-01-15'),
    status: 'ACTIVE',
    totalValue: 12000000,
    yearlyRate: 0.12,
    notes: 'Utility-scale microgrid deployment for grid resilience',
    tags: ['utility', 'microgrid', 'california']
  },
  {
    name: 'Google Data Center Power Purchase',
    client: 'Google Data Center',
    site: 'Mountain View, CA',
    capacity: 2000,
    term: 20,
    systemType: 'PP',
    effectiveDate: new Date('2024-02-20'),
    status: 'ACTIVE',
    totalValue: 16000000,
    yearlyRate: 0.08,
    notes: 'High-capacity power purchase agreement for data center operations',
    tags: ['technology', 'datacenter', 'high-capacity']
  },
  {
    name: 'Kaiser Permanente Hospital Backup Power',
    client: 'Kaiser Permanente Hospital',
    site: 'Oakland, CA',
    capacity: 650,
    term: 10,
    systemType: 'AMG',
    effectiveDate: new Date('2024-03-10'),
    status: 'DRAFT',
    totalValue: 9100000,
    yearlyRate: 0.14,
    notes: 'Critical healthcare facility backup power system',
    tags: ['healthcare', 'backup', 'critical-infrastructure']
  },
  {
    name: 'Tesla Gigafactory Microgrid',
    client: 'Tesla Gigafactory',
    site: 'Fremont, CA',
    capacity: 3250,
    term: 25,
    systemType: 'MG',
    effectiveDate: new Date('2024-04-01'),
    status: 'PENDING',
    totalValue: 19500000,
    yearlyRate: 0.06,
    notes: 'Large-scale manufacturing facility microgrid with energy storage',
    tags: ['manufacturing', 'automotive', 'energy-storage']
  },
  {
    name: 'UC Berkeley Campus Power Grid',
    client: 'UC Berkeley Campus',
    site: 'Berkeley, CA',
    capacity: 975,
    term: 12,
    systemType: 'OG',
    effectiveDate: new Date('2024-05-15'),
    status: 'ACTIVE',
    totalValue: 11700000,
    yearlyRate: 0.10,
    notes: 'Educational institution campus-wide power grid modernization',
    tags: ['education', 'campus', 'sustainability']
  }
];

const sampleUsers = [
  {
    email: 'admin@bloomenergy.com',
    password: 'admin123',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'ADMIN'
  },
  {
    email: 'manager@bloomenergy.com',
    password: 'manager123',
    firstName: 'Contract',
    lastName: 'Manager',
    role: 'MANAGER'
  },
  {
    email: 'user@bloomenergy.com',
    password: 'user123',
    firstName: 'Contract',
    lastName: 'Specialist',
    role: 'USER'
  }
];

const sampleLearnedRules = [
  {
    ruleType: 'RANGE',
    category: 'system',
    name: 'Capacity Multiple Rule',
    ruleData: {
      description: 'System capacity must be in multiples of 325 kW',
      pattern: 'capacity % 325 === 0',
      examples: ['325', '650', '975', '1300'],
      validationLogic: {
        minValue: 325,
        increment: 325,
        maxValue: 5000
      }
    },
    confidence: 0.95,
    occurrences: 15
  },
  {
    ruleType: 'RANGE',
    category: 'financial',
    name: 'Base Rate Range Rule',
    ruleData: {
      description: 'Base rates typically range from $0.06 to $0.18 per kWh',
      pattern: 'baseRate >= 0.06 && baseRate <= 0.18',
      examples: ['0.08', '0.12', '0.14', '0.16'],
      validationLogic: {
        minValue: 0.06,
        maxValue: 0.18,
        unit: 'USD/kWh'
      }
    },
    confidence: 0.88,
    occurrences: 12
  },
  {
    ruleType: 'ENUM',
    category: 'commercial',
    name: 'Standard Contract Term Rule',
    ruleData: {
      description: 'Contract terms are typically 5, 10, 15, 20, or 25 years',
      pattern: '[5, 10, 15, 20, 25].includes(contractTerm)',
      examples: ['5', '10', '15', '20', '25'],
      validationLogic: {
        allowedValues: [5, 10, 15, 20, 25],
        unit: 'years'
      }
    },
    confidence: 0.92,
    occurrences: 18
  },
  {
    ruleType: 'CORRELATION',
    category: 'technical', 
    name: 'Voltage Compatibility Rule',
    ruleData: {
      description: 'Standard voltage levels for different capacity ranges',
      pattern: 'capacity < 1000 ? ["480V", "4.16kV"] : ["4.16kV", "13.2kV", "34.5kV"]',
      examples: ['480V for <1MW', '4.16kV for 1-2MW', '13.2kV for >2MW'],
      validationLogic: {
        ranges: [
          { maxCapacity: 1000, voltages: ['480V', '4.16kV'] },
          { minCapacity: 1000, voltages: ['4.16kV', '13.2kV', '34.5kV'] }
        ]
      }
    },
    confidence: 0.85,
    occurrences: 10
  },
  {
    ruleType: 'RANGE',
    category: 'financial',
    name: 'Escalation Rate Rule',
    ruleData: {
      description: 'Annual escalation rates typically range from 1.5% to 4.0%',
      pattern: 'annualEscalation >= 1.5 && annualEscalation <= 4.0',
      examples: ['1.5', '2.0', '2.5', '3.0', '3.5'],
      validationLogic: {
        minValue: 1.5,
        maxValue: 4.0,
        unit: 'percent'
      }
    },
    confidence: 0.90,
    occurrences: 14
  }
];

const sampleTemplates = [
  {
    name: 'Standard Microgrid Template',
    description: 'Standard microgrid configuration for commercial facilities',
    category: 'microgrid',
    formData: {
      capacity: 1000,
      term: 15,
      systemType: 'MG',
      yearlyRate: 0.12,
      totalValue: 12000000,
      tags: ['standard', 'commercial', 'microgrid'],
      notes: 'Standard commercial microgrid configuration with 15-year term'
    }
  },
  {
    name: 'Healthcare Backup Power Template',
    description: 'Reliable backup power solution for healthcare facilities',
    category: 'backup-power',
    formData: {
      capacity: 650,
      term: 10,
      systemType: 'AMG',
      yearlyRate: 0.14,
      totalValue: 9100000,
      tags: ['healthcare', 'backup', 'critical'],
      notes: 'Critical backup power system for healthcare facilities requiring high reliability'
    }
  },
  {
    name: 'Large Scale Manufacturing Template',
    description: 'High-capacity power solution for manufacturing facilities',
    category: 'manufacturing',
    formData: {
      capacity: 3250,
      term: 25,
      systemType: 'MG',
      yearlyRate: 0.06,
      totalValue: 19500000,
      tags: ['manufacturing', 'high-capacity', 'long-term'],
      notes: 'Large-scale manufacturing facility power solution with extended 25-year term'
    }
  },
  {
    name: 'Educational Institution Template',
    description: 'Campus-wide power grid solution for educational institutions',
    category: 'education',
    formData: {
      capacity: 975,
      term: 12,
      systemType: 'OG',
      yearlyRate: 0.10,
      totalValue: 11700000,
      tags: ['education', 'campus', 'sustainability'],
      notes: 'Educational institution campus power grid with focus on sustainability'
    }
  },
  {
    name: 'Data Center Power Purchase Template',
    description: 'High-reliability power purchase agreement for data centers',
    category: 'datacenter',
    formData: {
      capacity: 2000,
      term: 20,
      systemType: 'PP',
      yearlyRate: 0.08,
      totalValue: 16000000,
      tags: ['datacenter', 'technology', 'high-reliability'],
      notes: 'Data center power purchase agreement with 99.999% uptime guarantee'
    }
  }
];

const sampleAnalytics = [
  { date: '2024-01-01', contractsCreated: 3, totalValue: 2500000, averageCapacity: 850 },
  { date: '2024-02-01', contractsCreated: 5, totalValue: 4200000, averageCapacity: 920 },
  { date: '2024-03-01', contractsCreated: 4, totalValue: 3800000, averageCapacity: 1100 },
  { date: '2024-04-01', contractsCreated: 6, totalValue: 5100000, averageCapacity: 975 },
  { date: '2024-05-01', contractsCreated: 7, totalValue: 6300000, averageCapacity: 1050 },
  { date: '2024-06-01', contractsCreated: 4, totalValue: 3600000, averageCapacity: 800 },
  { date: '2024-07-01', contractsCreated: 5, totalValue: 4800000, averageCapacity: 1200 },
  { date: '2024-08-01', contractsCreated: 8, totalValue: 7200000, averageCapacity: 1150 },
  { date: '2024-09-01', contractsCreated: 6, totalValue: 5400000, averageCapacity: 950 }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await prisma.auditLog.deleteMany();
    await prisma.entityVersion.deleteMany();
    await prisma.contractTemplate.deleteMany();
    await prisma.learnedRule.deleteMany();
    await prisma.contract.deleteMany();
    await prisma.user.deleteMany();

    // Create users
    console.log('👥 Creating users...');
    const users = [];
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword
        }
      });
      users.push(user);
      console.log(`   ✅ Created user: ${user.email}`);
    }

    // Create contracts
    console.log('📋 Creating contracts...');
    const contracts = [];
    for (const contractData of sampleContracts) {
      const contract = await prisma.contract.create({
        data: {
          ...contractData,
          createdBy: users[Math.floor(Math.random() * users.length)].id
        }
      });
      contracts.push(contract);
      console.log(`   ✅ Created contract: ${contract.contractId}`);
    }

    // Create learned rules
    console.log('🧠 Creating learned rules...');
    for (const ruleData of sampleLearnedRules) {
      const rule = await prisma.learnedRule.create({
        data: ruleData
      });
      console.log(`   ✅ Created rule: ${rule.name}`);
    }

    // Create contract templates
    console.log('📋 Creating contract templates...');
    for (const templateData of sampleTemplates) {
      const template = await prisma.contractTemplate.create({
        data: {
          ...templateData,
          createdBy: users[0].id // Admin user
        }
      });
      console.log(`   ✅ Created template: ${template.name}`);
    }

    // Create some audit logs
    console.log('📊 Creating audit logs...');
    for (const contract of contracts.slice(0, 3)) {
      await prisma.auditLog.create({
        data: {
          entityType: 'CONTRACT',
          entityId: contract.id,
          action: 'CREATE',
          userId: users[0].id,
          auditHash: `hash-${Date.now()}-${Math.random()}`,
          oldValues: null,
          newValues: JSON.stringify(contract),
          ipAddress: '127.0.0.1',
          userAgent: 'Seed Script'
        }
      });
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log(`
📊 Summary:
   • ${users.length} users created
   • ${contracts.length} contracts created
   • ${sampleLearnedRules.length} learned rules created
   • ${sampleTemplates.length} contract templates created
   • Sample audit logs created

🔐 Test Accounts:
   • Admin: admin@bloomenergy.com / admin123
   • Manager: manager@bloomenergy.com / manager123  
   • User: user@bloomenergy.com / user123

🚀 You can now test the application with realistic data!
    `);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedDatabase()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });