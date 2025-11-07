/**
 * AI-to-Form Mapping Service
 * 
 * This service maps AI-extracted business rules from contracts to the specific
 * form fields in the contract creation interface. It translates natural language
 * business rules into structured form data that can be used to pre-populate
 * the 7-tab contract creation form.
 */

import { ContractFormData, SystemType, VoltageLevel, ComponentType, InstallationType, ReliabilityLevel } from '../types/contract.types';

// Business Rule interface (from AI extraction)
export interface BusinessRule {
  id: string;
  category: 'payment' | 'performance' | 'compliance' | 'risk' | 'operational' | 'system' | 'technical';
  type: 'conditional' | 'calculation' | 'threshold' | 'validation' | 'constraint' | 'workflow';
  name: string;
  description: string;
  condition: string;
  action: string;
  consequence?: string | null;
  parameters: Record<string, any>;
  confidence: number;
  sourceText: string;
  businessValue: string;
}

// AI Analysis Result interface (from AI extraction)
export interface BusinessRulesAnalysis {
  documentSummary: {
    contractType: string;
    parties: string[] | { buyer?: string; seller?: string; financialOwner?: string };
    effectiveDate: string;
    keyTerms?: string[];
    contractTerm?: number;
  };
  extractedRules: BusinessRule[];
  extractedData: {
    contractValue?: string;
    paymentTerms?: string;
    performanceMetrics?: string;
    effectiveDate?: string;
    governingLaw?: string;
    systemCapacity?: string | number;
    customerName?: string;
    siteLocation?: string;
    contractTerm?: number | string;
    baseRate?: number | string;
    annualEscalation?: number | string;
    efficiencyWarranty?: number | string;
    availabilityGuarantee?: number | string;
    outputWarranty?: number | string;
    voltage?: string | number;
    solutionType?: string;
  };
  riskFactors: string[];
  anomalies: string[];
  summary: {
    totalRulesExtracted: number;
    confidenceScore: number;
    processingNotes: string;
  };
  overallConfidence?: number;
}

// Mapping configuration for form fields
interface FieldMapping {
  formField: keyof ContractFormData;
  ruleCategories: BusinessRule['category'][];
  extractionPatterns: {
    parameter?: string;
    valueParser?: (value: any) => any;
    confidence?: number;
  }[];
}

// Field mapping configuration
const FIELD_MAPPINGS: FieldMapping[] = [
  // Basic Information Fields
  {
    formField: 'customerName',
    ruleCategories: ['operational'],
    extractionPatterns: [
      { parameter: 'customerName' },
      { parameter: 'clientName' }
    ]
  },
  {
    formField: 'siteLocation',
    ruleCategories: ['operational', 'technical'],
    extractionPatterns: [
      { parameter: 'siteLocation' },
      { parameter: 'location' },
      { parameter: 'facilityLocation' }
    ]
  },
  {
    formField: 'effectiveDate',
    ruleCategories: ['operational'],
    extractionPatterns: [
      { parameter: 'effectiveDate', valueParser: (date: string) => new Date(date).toISOString().split('T')[0] },
      { parameter: 'startDate', valueParser: (date: string) => new Date(date).toISOString().split('T')[0] }
    ]
  },
  
  // System Configuration Fields
  {
    formField: 'ratedCapacity',
    ruleCategories: ['system', 'technical'],
    extractionPatterns: [
      {
        parameter: 'systemCapacity',
        valueParser: (capacity: string | number) => {
          // Handle direct numeric values from AI
          if (typeof capacity === 'number') {
            return Math.round(capacity / 325) * 325;
          }

          // Handle string values (could be "5000" or "5000 kW")
          const stringVal = String(capacity);

          // Try with unit suffix first
          const matchWithUnit = stringVal.match(/(\d+(?:,\d+)?)\s*kW/i);
          if (matchWithUnit) {
            const value = parseInt(matchWithUnit[1].replace(',', ''));
            return Math.round(value / 325) * 325;
          }

          // Try plain number (AI often returns "5000" without unit)
          const matchPlainNumber = stringVal.match(/^(\d+(?:,\d+)?)$/);
          if (matchPlainNumber) {
            const value = parseInt(matchPlainNumber[1].replace(',', ''));
            return Math.round(value / 325) * 325;
          }

          return 0;
        }
      },
      { parameter: 'capacity', valueParser: (val: any) => parseFloat(val) || 0 }
    ]
  },
  {
    formField: 'solutionType',
    ruleCategories: ['system'],
    extractionPatterns: [
      {
        parameter: 'solutionType',
        valueParser: (type: string) => {
          const typeMap: Record<string, SystemType> = {
            'power purchase': 'Power Purchase - Standard',
            'pp': 'Power Purchase - Standard',
            'microgrid': 'Microgrid - Constrained',
            'mg': 'Microgrid - Constrained',
            'battery': 'Power Purchase - With Battery'
          };
          const normalized = type.toLowerCase();
          return typeMap[normalized] || 'Power Purchase - Standard';
        }
      }
    ]
  },

  // Financial Parameters Fields
  {
    formField: 'baseRate',
    ruleCategories: ['payment'],
    extractionPatterns: [
      {
        parameter: 'baseRate',
        valueParser: (rate: string | number) => {
          // Handle direct numeric values from AI
          if (typeof rate === 'number') {
            return rate;
          }

          // Handle string values like "$0.0847" or "0.0847"
          const stringVal = String(rate);
          const match = stringVal.match(/\$?([0-9,]+(?:\.[0-9]+)?)/);
          return match ? parseFloat(match[1].replace(',', '')) : 0;
        }
      },
      {
        parameter: 'amount',
        valueParser: (amount: string | number) => {
          if (typeof amount === 'number') return amount;
          const match = String(amount).match(/\$?([0-9,]+(?:\.[0-9]+)?)/);
          return match ? parseFloat(match[1].replace(',', '')) : 0;
        }
      }
    ]
  },
  {
    formField: 'annualEscalation',
    ruleCategories: ['payment'],
    extractionPatterns: [
      {
        parameter: 'escalationRate',
        valueParser: (rate: string) => {
          const match = rate.match(/([0-9.]+)%/);
          return match ? parseFloat(match[1]) : 2.5;
        }
      }
    ]
  },
  {
    formField: 'contractTerm',
    ruleCategories: ['operational'],
    extractionPatterns: [
      {
        parameter: 'contractTerm',
        valueParser: (term: string | number) => {
          // Handle direct numeric values from AI (often returns 15, not "15 years")
          if (typeof term === 'number') {
            return term;
          }

          // Handle string values
          const stringVal = String(term);

          // Try plain number first (AI often returns "15" not "15 years")
          const matchPlainNumber = stringVal.match(/^(\d+)$/);
          if (matchPlainNumber) {
            return parseInt(matchPlainNumber[1]);
          }

          // Try with "years" suffix
          const matchWithYears = stringVal.match(/(\d+)\s*years?/i);
          if (matchWithYears) {
            return parseInt(matchWithYears[1]);
          }

          return null;
        }
      },
      {
        parameter: 'termLength',
        valueParser: (term: string | number) => {
          if (typeof term === 'number') return term;
          const match = String(term).match(/(\d+)/);
          return match ? parseInt(match[1]) : null;
        }
      }
    ]
  },

  // Operating Parameters Fields
  {
    formField: 'outputWarrantyPercent',
    ruleCategories: ['performance'],
    extractionPatterns: [
      {
        parameter: 'minimumAvailability',
        valueParser: (availability: string) => {
          const match = availability.match(/([0-9.]+)%/);
          return match ? parseFloat(match[1]) : 95;
        }
      },
      { parameter: 'outputWarranty', valueParser: (val: any) => parseFloat(val) || 95 }
    ]
  },
  {
    formField: 'efficiencyWarrantyPercent',
    ruleCategories: ['performance'],
    extractionPatterns: [
      {
        parameter: 'minimumEfficiency',
        valueParser: (efficiency: string) => {
          const match = efficiency.match(/([0-9.]+)%/);
          return match ? parseFloat(match[1]) : 90;
        }
      },
      { parameter: 'efficiency', valueParser: (val: any) => parseFloat(val) || 90 }
    ]
  },

  // Technical Specifications Fields
  {
    formField: 'gridParallelVoltage',
    ruleCategories: ['technical'],
    extractionPatterns: [
      {
        parameter: 'voltage',
        valueParser: (voltage: string | number) => {
          const voltageMap: Record<string, VoltageLevel> = {
            '208': '208V',
            '480': '480V',
            '4.16': '4.16kV',
            '4160': '4.16kV',
            '13.2': '13.2kV',
            '13200': '13.2kV',
            '34.5': '34.5kV',
            '34500': '34.5kV'
          };

          // Handle numeric values
          if (typeof voltage === 'number') {
            const normalized = voltage.toString();
            return voltageMap[normalized] || '480V';
          }

          // Handle string values like "4160V" or "4160" or "4.16kV"
          const stringVal = String(voltage);
          const normalized = stringVal.replace(/[^0-9.]/g, '');
          return voltageMap[normalized] || '480V';
        }
      }
    ]
  },
  {
    formField: 'numberOfServers',
    ruleCategories: ['technical', 'system'],
    extractionPatterns: [
      {
        parameter: 'servers',
        valueParser: (servers: any) => parseInt(servers) || 1
      },
      {
        parameter: 'systemCapacity',
        valueParser: (capacity: string) => {
          // Calculate servers based on capacity (each server typically 325kW)
          const match = capacity.match(/(\d+(?:,\d+)?)\s*kW/i);
          if (match) {
            const totalKW = parseInt(match[1].replace(',', ''));
            return Math.ceil(totalKW / 325);
          }
          return 1;
        }
      }
    ]
  }
];

// Value parsing utilities
const parsePercentage = (value: string): number => {
  const match = value.match(/([0-9.]+)%/);
  return match ? parseFloat(match[1]) : 0;
};

const parseCurrency = (value: string): number => {
  const match = value.match(/\$?([0-9,]+(?:\.[0-9]+)?)/);
  return match ? parseFloat(match[1].replace(',', '')) : 0;
};

const parseCapacity = (value: string): number => {
  const match = value.match(/(\d+(?:,\d+)?)\s*kW/i);
  if (match) {
    const capacity = parseInt(match[1].replace(',', ''));
    // Round to nearest 325kW multiple (Bloom Energy constraint)
    return Math.round(capacity / 325) * 325;
  }
  return 325; // Default minimum
};

/**
 * AI Form Mapping Service
 * Converts AI-extracted business rules into structured form data
 */
export class AIFormMappingService {
  /**
   * Maps AI-extracted business rules to contract form data
   * @param analysis - AI business rules analysis result
   * @returns Partial contract form data with populated fields
   */
  static mapAnalysisToFormData(analysis: BusinessRulesAnalysis): Partial<ContractFormData> {
    const formData: Partial<ContractFormData> = {};
    const { extractedRules, extractedData, documentSummary } = analysis;

    // Start with document summary data
    // Handle both array format and object format for parties
    if (Array.isArray(documentSummary.parties) && documentSummary.parties.length > 1) {
      formData.customerName = documentSummary.parties.find(party =>
        !party.toLowerCase().includes('bloom energy')
      ) || documentSummary.parties[1];
    } else if (typeof documentSummary.parties === 'object' && documentSummary.parties.buyer) {
      formData.customerName = documentSummary.parties.buyer;
    }

    // Also check extractedData for customer name (AI often puts it here directly)
    if (!formData.customerName && extractedData.customerName) {
      formData.customerName = extractedData.customerName;
    }

    if (documentSummary.effectiveDate) {
      formData.effectiveDate = new Date(documentSummary.effectiveDate)
        .toISOString().split('T')[0];
      formData.orderDate = formData.effectiveDate; // Default order date to effective date
    }

    // Process each field mapping
    FIELD_MAPPINGS.forEach(mapping => {
      const relevantRules = extractedRules.filter(rule =>
        mapping.ruleCategories.includes(rule.category)
      );

      // Try each extraction pattern
      for (const pattern of mapping.extractionPatterns) {
        let value = null;

        // CRITICAL FIX: Check extractedData FIRST (AI returns clean data here)
        // This is where the AI puts direct field extractions like contractTerm: 15
        if (extractedData && pattern.parameter) {
          const dataKey = pattern.parameter as keyof typeof extractedData;
          if (extractedData[dataKey] !== undefined && extractedData[dataKey] !== null && extractedData[dataKey] !== 'NOT SPECIFIED') {
            value = extractedData[dataKey];
            console.log(`✅ Found ${mapping.formField} in extractedData.${pattern.parameter}:`, value);
          }
        }

        // Fallback: Look for the parameter in relevant rules (legacy approach)
        if (!value) {
          for (const rule of relevantRules) {
            if (pattern.parameter && rule.parameters[pattern.parameter]) {
              value = rule.parameters[pattern.parameter];
              console.log(`📋 Found ${mapping.formField} in rules.${pattern.parameter}:`, value);
              break;
            }
          }
        }

        if (value) {
          // Apply value parser if provided
          if (pattern.valueParser) {
            try {
              const parsedValue = pattern.valueParser(value);
              console.log(`🔄 Parsed ${mapping.formField} from "${value}" to "${parsedValue}"`);
              value = parsedValue;
            } catch (error) {
              console.warn(`Error parsing value for ${mapping.formField}:`, error);
              continue;
            }
          }

          // Set the form field value
          (formData as any)[mapping.formField] = value;
          break; // Stop trying patterns once we find a value
        }
      }
    });

    // Apply business logic and validation
    const finalFormData = this.applyBusinessLogic(formData, analysis);

    return finalFormData;
  }

  /**
   * Applies business logic and validation to the mapped form data
   */
  private static applyBusinessLogic(
    formData: Partial<ContractFormData>, 
    analysis: BusinessRulesAnalysis
  ): Partial<ContractFormData> {
    // Ensure capacity is in 325kW multiples
    if (formData.ratedCapacity) {
      formData.ratedCapacity = Math.max(325, Math.round(formData.ratedCapacity / 325) * 325);
    }

    // Set default number of servers based on capacity
    if (formData.ratedCapacity && !formData.numberOfServers) {
      formData.numberOfServers = Math.ceil(formData.ratedCapacity / 325);
    }

    // Set reasonable defaults for missing critical fields
    if (!formData.baseRate) {
      formData.baseRate = 150; // Default base rate
    }

    // DO NOT set defaults for critical contract parameters like contractTerm
    // Let null/undefined values show that extraction failed so user knows to review

    if (!formData.gridParallelVoltage) {
      formData.gridParallelVoltage = '480V';
    }

    if (!formData.installationType) {
      formData.installationType = 'Ground';
    }

    if (!formData.outputWarrantyPercent) {
      formData.outputWarrantyPercent = 95;
    }

    if (!formData.efficiencyWarrantyPercent) {
      formData.efficiencyWarrantyPercent = 50;
    }

    // Set default reliability level based on solution type
    if (!formData.reliabilityLevel) {
      formData.reliabilityLevel = formData.solutionType?.includes('Microgrid') ? 99.99 : 99.9;
    }

    // Set default component selection
    if (!formData.selectedComponents) {
      formData.selectedComponents = ['RI', 'AC', 'UC'];
      if (formData.solutionType?.includes('Battery')) {
        formData.selectedComponents.push('BESS');
      }
    }

    // Set default demand range based on capacity
    if (formData.ratedCapacity) {
      if (!formData.minDemandKW) {
        formData.minDemandKW = Math.round(formData.ratedCapacity * 0.3);
      }
      if (!formData.maxDemandKW) {
        formData.maxDemandKW = formData.ratedCapacity;
      }
      if (!formData.guaranteedCriticalOutput) {
        formData.guaranteedCriticalOutput = Math.round(formData.ratedCapacity * 0.8);
      }
    }

    return formData;
  }

  /**
   * Validates the mapped form data for completeness and business rules
   */
  static validateMappedData(formData: Partial<ContractFormData>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!formData.customerName) {
      errors.push('Customer name is required');
    }

    if (!formData.ratedCapacity || formData.ratedCapacity < 325) {
      errors.push('Rated capacity must be at least 325 kW');
    }

    if (formData.ratedCapacity && formData.ratedCapacity % 325 !== 0) {
      warnings.push('Capacity should be in multiples of 325 kW');
    }

    if (!formData.baseRate || formData.baseRate <= 0) {
      errors.push('Base rate must be greater than 0');
    }

    if (formData.annualEscalation && (formData.annualEscalation < 2.0 || formData.annualEscalation > 5.0)) {
      warnings.push('Annual escalation typically ranges from 2.0% to 5.0%');
    }

    if (formData.contractTerm && ![5, 10, 15, 20].includes(formData.contractTerm)) {
      warnings.push('Contract term should typically be 5, 10, 15, or 20 years');
    }

    if (formData.guaranteedCriticalOutput && formData.ratedCapacity && 
        formData.guaranteedCriticalOutput > formData.ratedCapacity) {
      errors.push('Guaranteed critical output cannot exceed rated capacity');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Gets confidence score for the mapping based on AI analysis
   */
  static getMappingConfidence(analysis: BusinessRulesAnalysis): number {
    const { summary, extractedRules } = analysis;
    
    // Base confidence from AI analysis
    let confidence = summary.confidenceScore;
    
    // Adjust based on number of rules extracted
    const ruleCount = extractedRules.length;
    if (ruleCount < 3) {
      confidence *= 0.7; // Lower confidence for few rules
    } else if (ruleCount > 10) {
      confidence *= 1.1; // Higher confidence for many rules
    }

    // Adjust based on rule confidence scores
    const avgRuleConfidence = extractedRules.reduce((sum, rule) => sum + rule.confidence, 0) / ruleCount;
    confidence = (confidence + avgRuleConfidence) / 2;

    return Math.min(confidence, 1.0);
  }

  /**
   * Extracts key insights from the AI analysis for user review
   */
  static extractInsights(analysis: BusinessRulesAnalysis): {
    keyFindings: string[];
    riskFactors: string[];
    recommendations: string[];
  } {
    const keyFindings: string[] = [];
    const recommendations: string[] = [];

    // Extract key financial findings
    const paymentRules = analysis.extractedRules.filter(rule => rule.category === 'payment');
    if (paymentRules.length > 0) {
      keyFindings.push(`Found ${paymentRules.length} payment-related rules`);
    }

    // Extract performance findings
    const performanceRules = analysis.extractedRules.filter(rule => rule.category === 'performance');
    if (performanceRules.length > 0) {
      keyFindings.push(`Identified ${performanceRules.length} performance requirements`);
    }

    // Generate recommendations
    if (analysis.summary.confidenceScore < 0.8) {
      recommendations.push('Review and verify extracted data due to lower confidence score');
    }

    if (analysis.extractedRules.some(rule => rule.confidence < 0.7)) {
      recommendations.push('Some rules extracted with low confidence - manual review recommended');
    }

    return {
      keyFindings,
      riskFactors: analysis.riskFactors,
      recommendations
    };
  }
}

export default AIFormMappingService;
