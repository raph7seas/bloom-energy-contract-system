export interface Contract {
  id: string;
  name: string;
  client: string;
  site: string;
  capacity: number;
  term: number;
  type: SystemType;
  uploadDate: string;
  effectiveDate: string;
  status: ContractStatus;
  totalValue: number;
  yearlyRate: number;
  parameters: ContractParameters;
  notes?: string;
  tags?: string[];
}

export interface ContractParameters {
  financial: FinancialParameters;
  technical: TechnicalParameters;
  operating: OperatingParameters;
}

export interface FinancialParameters {
  baseRate: number;
  microgridAdder?: number;
  escalation: number;
  thermalCycleFee?: number;
  electricalBudget?: number;
  commissioningAllowance?: number;
}

export interface TechnicalParameters {
  voltage: VoltageLevel;
  gridVoltage?: VoltageLevel;
  servers: number;
  components: ComponentType[];
  recType?: string;
}

export interface OperatingParameters {
  outputWarranty: number;
  efficiency: number;
  demandRange: {
    min: number;
    max: number;
  };
  criticalOutput: number;
}

export interface LearnedRules {
  capacityRange: { min: number; max: number };
  termRange: { min: number; max: number };
  systemTypes: SystemType[];
  voltageOptions: VoltageLevel[];
  componentOptions: ComponentType[];
  escalationRange: { min: number; max: number };
}

export interface ContractFormData {
  // Basic Information
  customerName: string;
  siteLocation: string;
  orderDate: string;
  effectiveDate: string;
  
  // System Configuration
  solutionType: SystemType;
  ratedCapacity: number;
  reliabilityLevel: number;
  installationType: InstallationType;
  
  // Financial Parameters
  baseRate: number;
  annualEscalation: number;
  contractTerm: number;
  microgridAdder: number;
  thermalCycleFee: number;
  electricalBudget: number;
  commissioningAllowance: number;
  
  // Operating Parameters
  outputWarrantyPercent: number;
  efficiencyWarrantyPercent: number;
  minDemandKW: number;
  maxDemandKW: number;
  guaranteedCriticalOutput: number;
  includeRECs: boolean;
  recType: string;
  
  // Technical Specifications
  gridParallelVoltage: VoltageLevel;
  numberOfServers: number;
  selectedComponents: ComponentType[];
  
  // Additional Information
  specialRequirements: string;
}

export interface YearlyRate {
  year: number;
  rate: string;
  amount: number;
}

export interface ValidationError {
  [key: string]: string;
}

// Enums and Union Types
export type SystemType = 
  | 'Power Purchase - Standard' 
  | 'Power Purchase - With Battery' 
  | 'Microgrid - Constrained' 
  | 'Microgrid - Unconstrained'
  | 'PP'  // Legacy abbreviation
  | 'MG'  // Legacy abbreviation
  | 'AMG' // Legacy abbreviation
  | 'OG'; // Legacy abbreviation

export type ContractStatus = 'Active' | 'Draft' | 'Expired' | 'Cancelled' | 'Pending';

export type VoltageLevel = 
  | '208V' 
  | '480V' 
  | '4.16kV' 
  | '13.2kV' 
  | '34.5kV';

export type ComponentType = 
  | 'RI'    // Renewable Integration
  | 'AC'    // Advanced Controls
  | 'UC'    // Utility Connections
  | 'BESS'  // Battery Energy Storage System
  | 'Solar' // Solar Integration
  | 'Wind'; // Wind Integration

export type InstallationType = 
  | 'PES'     // Power Electronics System
  | 'Ground'  // Ground Mount
  | 'Stacked' // Stacked Configuration
  | 'Indoor'  // Indoor Installation
  | 'Outdoor'; // Outdoor Installation

export type ReliabilityLevel = 
  | '99.9%'   // 3-9s
  | '99.95%'  // 4-9s (3.5-9s)
  | '99.99%'  // 4-9s
  | '99.999%'; // 5-9s

// Form-specific types
export interface TabValidationState {
  [tabId: string]: boolean;
}

export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  formData: Partial<ContractFormData>;
  createdDate: string;
  lastUsed?: string;
  usageCount: number;
}

export interface ContractComparison {
  contracts: Contract[];
  differences: {
    [key: string]: {
      values: any[];
      isDifferent: boolean;
    };
  };
}

// AI Assistant types
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AIResponse {
  message: string;
  suggestions?: string[];
  actions?: AIAction[];
}

export interface AIAction {
  type: 'fill_field' | 'optimize_pricing' | 'suggest_terms';
  label: string;
  data: any;
}

// Statistics and Analytics
export interface ContractStats {
  totalContracts: number;
  totalValue: number;
  averageContractValue: number;
  contractsByStatus: Record<ContractStatus, number>;
  contractsByType: Record<SystemType, number>;
  monthlyGrowth: number;
  completionRate: number;
}

// File Upload types
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  extractedData?: Partial<ContractFormData>;
}