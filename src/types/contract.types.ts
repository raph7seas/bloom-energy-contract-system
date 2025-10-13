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
  aiMetadata?: AIExtractionMetadata;
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
  invoiceFrequency?: string;
  paymentTerms?: string;
  latePaymentFee?: number;
}

export interface TechnicalParameters {
  voltage: VoltageLevel;
  gridVoltage?: VoltageLevel;
  servers: number;
  components: string[];
  recType?: string;
  averageLoad?: number;
  peakLoad?: number;
  baseLoad?: number;
  loadFactor?: number;
  powerQuality?: string;
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
  industry?: string;
  facilitySize?: string;
  employees?: number;
  operatingHours?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  
  // System Configuration
  solutionType: SystemType | string;
  systemType?: SystemType | string;
  ratedCapacity: number;
  reliabilityLevel: number;
  installationType: InstallationType;
  powerQuality?: string;
  averageLoad?: number;
  peakLoad?: number;
  baseLoad?: number;
  loadFactor?: number;
  
  // Financial Parameters
  baseRate: number;
  annualEscalation: number;
  contractTerm: number;
  microgridAdder: number;
  thermalCycleFee: number;
  electricalBudget: number;
  commissioningAllowance: number;
  invoiceFrequency?: string;
  paymentTerms?: string;
  latePaymentFee?: number;
  
  // Operating Parameters
  outputWarrantyPercent: number;
  efficiencyWarrantyPercent: number;
  minDemandKW: number;
  maxDemandKW: number;
  guaranteedCriticalOutput: number;
  includeRECs: boolean;
  recType: string;
  
  // Technical Specifications
  gridParallelVoltage: VoltageLevel | string;
  voltage?: VoltageLevel | string;
  numberOfServers: number;
  selectedComponents: string[];
  
  // Additional Information
  specialRequirements: string;

  [key: string]: any;
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

// AI Extraction Metadata
export interface AIExtractionMetadata {
  isAiExtracted: boolean;
  sourceDocument: {
    id: string;
    name: string;
    uploadDate: string;
    fileType: string;
  };
  extractionDate: string;
  overallConfidence: number;
  fieldConfidences: {
    [fieldName: string]: number;
  };
  extractionMethod: 'anthropic_claude' | 'aws_textract' | 'manual';
  version: string; // AI model version used
  manualCorrections: {
    [fieldName: string]: {
      originalValue: any;
      correctedValue: any;
      correctionDate: string;
    };
  };
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
  status: 'uploading' | 'processing' | 'completed' | 'error' | 'analyzed';
  progress: number;
  extractedData?: Partial<ContractFormData>;
  aiAnalysis?: BusinessRulesAnalysis;
  createdContractId?: string; // Link to auto-created contract
}

// Enhanced contract creation from AI
export interface AIExtractedContract extends Omit<Contract, 'id' | 'uploadDate' | 'status'> {
  sourceFileId: string;
  extractionAnalysis: BusinessRulesAnalysis;
}

// Enhanced structured extraction types
export interface PaymentRule {
  type: 'base_payment' | 'escalation' | 'late_fee' | 'deposit' | 'milestone' | 'change_order';
  description: string;
  amount?: number | string;
  frequency?: 'monthly' | 'quarterly' | 'annual' | 'one-time';
  dueDate?: string;
  penaltyForLate?: string;
  sourceText?: string;
}

export interface PerformanceGuarantee {
  metric: 'availability' | 'efficiency' | 'capacity' | 'response_time' | 'uptime';
  targetValue: string | number;
  measurementPeriod?: string;
  consequences?: string;
  testingProcedure?: string;
  sourceText?: string;
}

export interface OperationalRequirement {
  requirement: 'maintenance' | 'inspection' | 'reporting' | 'access' | 'training' | 'spare_parts';
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'as_needed';
  responsibleParty?: 'buyer' | 'seller' | 'operator' | 'shared';
  procedure?: string;
  consequences?: string;
  sourceText?: string;
}

export interface TerminationClause {
  triggerCondition: string;
  noticeRequired?: string;
  penalties?: string;
  obligationsAfter?: string;
  sourceText?: string;
}

export interface ComplianceRequirement {
  type: 'environmental' | 'safety' | 'reporting' | 'regulatory' | 'audit';
  requirement: string;
  standard?: string;
  frequency?: string;
  evidence?: string;
  sourceText?: string;
}

export interface RiskFactor {
  category: 'financial' | 'operational' | 'legal' | 'technical' | 'market';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  mitigation?: string;
  probability?: 'high' | 'medium' | 'low';
}

export interface ContractMilestone {
  date: string;
  description: string;
  type: 'cod' | 'payment' | 'inspection' | 'renewal' | 'termination' | 'warranty_expiration' | 'notice_deadline';
  responsibleParty?: string;
  dependencies?: string[];
}

export interface Stakeholder {
  name: string;
  role: 'buyer' | 'seller' | 'financial_owner' | 'guarantor' | 'lender' | 'operator' | 'subcontractor';
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
  };
}

// Business Rules Analysis (for AI processing)
export interface BusinessRulesAnalysis {
  documentId?: string;
  filename?: string;
  extractedRules: BusinessRule[];
  overallConfidence?: number;
  extractionDate?: string;
  contractMetadata?: {
    parties?: string[];
    effectiveDate?: string;
    term?: string;
    totalValue?: number;
    commercialOperationDate?: string;
    [key: string]: any;
  };
  riskFlags?: string[];
  recommendations?: string[];
  riskFactors?: RiskFactor[];
  anomalies?: any[];
  summary?: {
    totalRulesExtracted?: number;
    confidenceScore?: number;
    processingNotes?: string;
    [key: string]: any;
  };
  extractedData?: Record<string, any>;

  // Enhanced structured data
  paymentRules?: PaymentRule[];
  performanceGuarantees?: PerformanceGuarantee[];
  operationalRequirements?: OperationalRequirement[];
  terminationClauses?: TerminationClause[];
  complianceRequirements?: ComplianceRequirement[];
  keyMilestones?: ContractMilestone[];
  stakeholders?: Stakeholder[];

  [key: string]: any;
}

export interface BusinessRule {
  id: string;
  category: string;
  subcategory?: string;
  type?: string;
  name?: string;
  description?: string;
  extractedText?: string;
  confidence?: number;
  conditions?: string[];
  exceptions?: string[];
  relatedClauses?: string[];
  mappedFormField?: keyof ContractFormData | string;
  mappedValue?: any;
  parameters?: Record<string, any>;
  sourceText?: string;
  sourceSection?: string;
  businessValue?: string;

  // Enhanced fields
  priority?: 'critical' | 'high' | 'medium' | 'low';
  applicablePhase?: 'construction' | 'operation' | 'termination' | 'all';
  frequency?: 'one-time' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'conditional';
  dependencies?: string[]; // IDs of related rules
  responsibleParty?: string;
  notificationRequired?: boolean;
  escalationProcedure?: string;

  financialImpact?: {
    type: 'cost' | 'revenue' | 'penalty' | 'savings';
    amount?: number | string;
    recurrence?: 'one-time' | 'monthly' | 'annual';
    currency?: string;
  };

  complianceType?: 'regulatory' | 'contractual' | 'operational' | 'safety' | 'environmental';

  [key: string]: any;
}

export interface BlueprintRuleMapping {
  id: string;
  name: string;
  category: string;
  mappedField: keyof ContractFormData | string;
  mappedValue: any;
  confidence?: number;
  sourceText?: string;
  description?: string;
}

export interface ContractBlueprintMetadata {
  parties: string[];
  contractType: string;
  documents: Array<{
    documentId: string;
    filename: string;
    confidence?: number;
  }>;
}

export interface ContractBlueprint {
  formData: ContractFormData;
  sections: Record<string, Partial<ContractFormData>>;
  rulesBySection: Record<string, BlueprintRuleMapping[]>;
  metadata: ContractBlueprintMetadata;
}
