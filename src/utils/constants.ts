import { SystemType, VoltageLevel, ComponentType, InstallationType } from '../types';

/**
 * Business constants and configuration values for Bloom Energy contracts
 * Based on the Bloom Configurator specifications and business rules
 */

// System Configuration Constants
export const SYSTEM_TYPES: { value: SystemType; label: string; description: string }[] = [
  {
    value: 'Power Purchase - Standard',
    label: 'Power Purchase - Standard',
    description: 'Standard grid-parallel power generation with utility backup'
  },
  {
    value: 'Power Purchase - With Battery',
    label: 'Power Purchase - With Battery',
    description: 'Grid-parallel with integrated battery storage system'
  },
  {
    value: 'Microgrid - Constrained',
    label: 'Microgrid - Constrained',
    description: 'Limited islanding capability with selective loads'
  },
  {
    value: 'Microgrid - Unconstrained',
    label: 'Microgrid - Unconstrained',
    description: 'Full islanding capability with complete facility backup'
  }
];

export const VOLTAGE_LEVELS: { value: VoltageLevel; label: string }[] = [
  { value: '208V', label: '208V' },
  { value: '480V', label: '480V' },
  { value: '4.16kV', label: '4.16kV' },
  { value: '13.2kV', label: '13.2kV' },
  { value: '34.5kV', label: '34.5kV' }
];

export const COMPONENT_TYPES: { value: ComponentType; label: string; description: string }[] = [
  {
    value: 'RI',
    label: 'Renewable Integration (RI)',
    description: 'Solar and wind integration capabilities'
  },
  {
    value: 'AC',
    label: 'Advanced Controls (AC)',
    description: 'Enhanced monitoring and control systems'
  },
  {
    value: 'UC',
    label: 'Utility Connections (UC)',
    description: 'Advanced utility interconnection features'
  },
  {
    value: 'BESS',
    label: 'Battery Energy Storage System (BESS)',
    description: 'Integrated battery storage for peak shaving and backup'
  },
  {
    value: 'Solar',
    label: 'Solar Integration',
    description: 'Direct solar panel integration and management'
  },
  {
    value: 'Wind',
    label: 'Wind Integration',
    description: 'Wind turbine integration and management'
  }
];

export const INSTALLATION_TYPES: { value: InstallationType; label: string }[] = [
  { value: 'PES', label: 'Power Electronics System (PES)' },
  { value: 'Ground', label: 'Ground Mount' },
  { value: 'Stacked', label: 'Stacked Configuration' },
  { value: 'Indoor', label: 'Indoor Installation' },
  { value: 'Outdoor', label: 'Outdoor Installation' }
];

export const RELIABILITY_LEVELS = [
  { value: 99.9, label: '99.9% (3-9s)' },
  { value: 99.95, label: '99.95% (3.5-9s)' },
  { value: 99.99, label: '99.99% (4-9s)' },
  { value: 99.999, label: '99.999% (5-9s)' }
];

export const CONTRACT_TERMS = [5, 10, 15, 20]; // Years

// Business Rules Constants
export const CAPACITY_RULES = {
  MIN: 325,           // Minimum capacity in kW
  MAX: 3900,          // Maximum capacity in kW
  MULTIPLE: 325,      // Must be multiple of this value
  TYPICAL_RANGE: {    // Most common range
    MIN: 650,
    MAX: 2600
  }
};

export const FINANCIAL_RULES = {
  ESCALATION: {
    MIN: 2.0,         // Minimum escalation percentage
    MAX: 5.0,         // Maximum escalation percentage
    TYPICAL: 3.5      // Typical escalation rate
  },
  BASE_RATE: {
    MIN: 50,          // Minimum base rate $/kW
    MAX: 100,         // Maximum base rate $/kW
    TYPICAL: 65       // Typical base rate
  },
  MICROGRID_ADDER: {
    BASE: 8.0,        // Base microgrid adder $/kW
    MAX_MULTIPLIER: 2.0 // Maximum capacity multiplier
  }
};

export const OPERATING_RULES = {
  WARRANTY: {
    OUTPUT: {
      MIN: 85,        // Minimum output warranty %
      MAX: 95,        // Maximum output warranty %
      TYPICAL: 90     // Typical output warranty %
    },
    EFFICIENCY: {
      MIN: 45,        // Minimum efficiency warranty %
      MAX: 55,        // Maximum efficiency warranty %
      TYPICAL: 50     // Typical efficiency warranty %
    }
  },
  DEMAND: {
    MIN_FACTOR: 0.2,  // Minimum demand as factor of capacity
    MAX_FACTOR: 0.8   // Maximum demand as factor of capacity
  }
};

// REC (Renewable Energy Certificate) Types
export const REC_TYPES = [
  'CT-Class-I',
  'CT-Class-II', 
  'MA-Class-I',
  'MA-Class-II',
  'NY-Tier-1',
  'NY-Tier-2',
  'RGGI',
  'National'
];

// Industries and typical configurations
export const INDUSTRY_TYPES = [
  { value: 'Healthcare', label: 'Healthcare', typicalCapacity: 1040, reliability: 99.99 },
  { value: 'Manufacturing', label: 'Manufacturing', typicalCapacity: 1950, reliability: 99.9 },
  { value: 'Data Center', label: 'Data Center', typicalCapacity: 2600, reliability: 99.999 },
  { value: 'Retail', label: 'Retail', typicalCapacity: 650, reliability: 99.95 },
  { value: 'Education', label: 'Education', typicalCapacity: 975, reliability: 99.9 },
  { value: 'Government', label: 'Government', typicalCapacity: 1300, reliability: 99.99 },
  { value: 'Hospitality', label: 'Hospitality', typicalCapacity: 975, reliability: 99.95 },
  { value: 'Other', label: 'Other', typicalCapacity: 975, reliability: 99.9 }
];

// Quick Actions for AI Assistant
export const AI_QUICK_ACTIONS = [
  {
    id: 'optimize_pricing',
    label: 'Optimize Pricing',
    description: 'Analyze and suggest optimal pricing based on market conditions',
    icon: 'TrendingUp'
  },
  {
    id: 'suggest_terms',
    label: 'Suggest Terms',
    description: 'Recommend contract terms based on client profile',
    icon: 'FileText'
  },
  {
    id: 'check_compliance',
    label: 'Check Compliance',
    description: 'Verify contract meets regulatory requirements',
    icon: 'Shield'
  },
  {
    id: 'generate_summary',
    label: 'Generate Summary',
    description: 'Create executive summary of contract terms',
    icon: 'FileSearch'
  }
];

// Navigation tabs configuration
export const TAB_CONFIG = [
  { id: 'create', label: 'Create', icon: 'Plus', required: false },
  { id: 'basic', label: 'Basic', icon: 'User', required: true },
  { id: 'system', label: 'System', icon: 'Zap', required: true },
  { id: 'financial', label: 'Financial', icon: 'DollarSign', required: true },
  { id: 'operating', label: 'Operating', icon: 'Settings', required: true },
  { id: 'technical', label: 'Technical', icon: 'Cpu', required: true },
  { id: 'summary', label: 'Summary', icon: 'FileText', required: false, readonly: true }
];

// Default form values
export const DEFAULT_FORM_VALUES = {
  customerName: '',
  siteLocation: '',
  orderDate: new Date().toISOString().split('T')[0],
  effectiveDate: '',
  solutionType: 'Power Purchase - Standard' as SystemType,
  ratedCapacity: 975,
  reliabilityLevel: 99.9,
  installationType: 'Ground' as InstallationType,
  baseRate: 65,
  annualEscalation: 3.5,
  contractTerm: 10,
  microgridAdder: 0,
  thermalCycleFee: 0,
  electricalBudget: 0,
  commissioningAllowance: 0,
  outputWarrantyPercent: 90,
  efficiencyWarrantyPercent: 50,
  minDemandKW: 200,
  maxDemandKW: 800,
  guaranteedCriticalOutput: 800,
  includeRECs: false,
  recType: 'CT-Class-I',
  gridParallelVoltage: '480V' as VoltageLevel,
  numberOfServers: 3,
  selectedComponents: ['RI', 'AC'] as ComponentType[],
  specialRequirements: ''
};

// File upload constraints
export const FILE_UPLOAD_RULES = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'image/jpeg',
    'image/png'
  ],
  ALLOWED_EXTENSIONS: ['.pdf', '.docx', '.doc', '.txt', '.jpg', '.jpeg', '.png']
};