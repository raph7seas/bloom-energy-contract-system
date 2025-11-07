import { BusinessRulesAnalysis, BusinessRule, ContractFormData, Contract, AIExtractionMetadata } from '../types';
import { contractService } from './contractService';

/**
 * Service to automatically create contracts from AI-extracted document data
 */
export class AIToContractService {
  /**
   * Create a contract automatically from AI analysis results
   */
  async createContractFromAIAnalysis(
    analysisResult: BusinessRulesAnalysis,
    documentId: string,
    documentName: string,
    fileType: string
  ): Promise<Contract | null> {
    try {
      // Map extracted business rules to contract form data
      const formData = this.mapBusinessRulesToFormData(analysisResult);
      
      // Validate that we have minimum required data
      if (!this.hasMinimumRequiredData(formData)) {
        console.warn('Insufficient data extracted to create contract automatically');
        return null;
      }

      // Create AI metadata
      const aiMetadata: AIExtractionMetadata = {
        isAiExtracted: true,
        sourceDocument: {
          id: documentId,
          name: documentName,
          uploadDate: new Date().toISOString(),
          fileType: fileType
        },
        extractionDate: analysisResult.extractionDate,
        overallConfidence: analysisResult.overallConfidence,
        fieldConfidences: this.extractFieldConfidences(analysisResult.extractedRules),
        extractionMethod: 'anthropic_claude',
        version: '1.0',
        manualCorrections: {}
      };

      // Create the contract using the contract service
      const contract = await contractService.createContract(formData);
      
      // Add AI metadata to the created contract
      contract.aiMetadata = aiMetadata;
      
      // Update the contract in storage with AI metadata
      await contractService.updateContract(contract.id, formData);

      console.log(`Successfully created contract ${contract.id} from AI analysis of ${documentName}`);
      return contract;

    } catch (error) {
      console.error('Failed to create contract from AI analysis:', error);
      return null;
    }
  }

  /**
   * Map business rules to contract form data
   */
  private mapBusinessRulesToFormData(analysis: BusinessRulesAnalysis): ContractFormData {
    const rules = analysis.extractedRules;
    const metadata = analysis.contractMetadata;

    // Initialize form data with defaults
    const formData: ContractFormData = {
      // Basic Information
      customerName: this.extractCustomerName(rules, metadata),
      siteLocation: this.extractSiteLocation(rules, metadata),
      orderDate: new Date().toISOString().split('T')[0], // Today's date as default
      effectiveDate: metadata.effectiveDate || new Date().toISOString().split('T')[0],
      
      // System Configuration
      solutionType: this.extractSolutionType(rules),
      ratedCapacity: this.extractCapacity(rules),
      reliabilityLevel: this.extractReliability(rules),
      installationType: this.extractInstallationType(rules),
      
      // Financial Parameters  
      baseRate: this.extractBaseRate(rules),
      annualEscalation: this.extractEscalation(rules),
      contractTerm: this.extractContractTerm(rules, metadata),
      microgridAdder: this.extractMicrogridAdder(rules),
      thermalCycleFee: this.extractThermalCycleFee(rules),
      electricalBudget: this.extractElectricalBudget(rules),
      commissioningAllowance: this.extractCommissioningAllowance(rules),
      
      // Operating Parameters
      outputWarrantyPercent: this.extractOutputWarranty(rules),
      efficiencyWarrantyPercent: this.extractEfficiencyWarranty(rules),
      minDemandKW: this.extractMinDemand(rules),
      maxDemandKW: this.extractMaxDemand(rules),
      guaranteedCriticalOutput: this.extractCriticalOutput(rules),
      includeRECs: this.extractIncludeRECs(rules),
      recType: this.extractRECType(rules),
      
      // Technical Specifications
      gridParallelVoltage: this.extractVoltage(rules),
      numberOfServers: this.extractNumberOfServers(rules),
      selectedComponents: this.extractComponents(rules),
      
      // Additional Information
      specialRequirements: this.extractSpecialRequirements(rules)
    };

    return formData;
  }

  /**
   * Extract field confidences from business rules
   */
  private extractFieldConfidences(rules: BusinessRule[]): { [fieldName: string]: number } {
    const confidences: { [fieldName: string]: number } = {};
    
    for (const rule of rules) {
      if (rule.mappedFormField && rule.confidence) {
        confidences[rule.mappedFormField] = rule.confidence;
      }
    }

    return confidences;
  }

  /**
   * Check if we have minimum required data to create a contract
   */
  private hasMinimumRequiredData(formData: ContractFormData): boolean {
    return !!(
      formData.customerName &&
      formData.solutionType &&
      formData.ratedCapacity > 0 &&
      formData.contractTerm > 0 &&
      formData.baseRate > 0
    );
  }

  // Extraction methods for specific fields
  private extractCustomerName(rules: BusinessRule[], metadata: any): string {
    const parties = metadata.parties || [];
    if (parties.length > 0) {
      // Look for the non-Bloom Energy party
      const customer = parties.find((party: string) => 
        !party.toLowerCase().includes('bloom') && 
        !party.toLowerCase().includes('energy')
      );
      return customer || parties[0] || 'Unknown Customer';
    }
    
    // Look in extracted text
    const customerRule = rules.find(rule => 
      rule.type.toLowerCase().includes('customer') ||
      rule.type.toLowerCase().includes('client')
    );
    return customerRule?.mappedValue || 'Unknown Customer';
  }

  private extractSiteLocation(rules: BusinessRule[], metadata: any): string {
    const locationRule = rules.find(rule => 
      rule.type.toLowerCase().includes('location') ||
      rule.type.toLowerCase().includes('site') ||
      rule.type.toLowerCase().includes('address')
    );
    return locationRule?.mappedValue || 'Unknown Location';
  }

  private extractSolutionType(rules: BusinessRule[]): any {
    const solutionRule = rules.find(rule => 
      rule.type.toLowerCase().includes('solution') ||
      rule.type.toLowerCase().includes('system') ||
      rule.type.toLowerCase().includes('microgrid')
    );
    
    const value = solutionRule?.mappedValue?.toLowerCase() || '';
    
    if (value.includes('microgrid')) {
      if (value.includes('constrained')) return 'Microgrid - Constrained';
      if (value.includes('unconstrained')) return 'Microgrid - Unconstrained';
      return 'Microgrid - Constrained'; // Default microgrid type
    }
    
    if (value.includes('battery')) return 'Power Purchase - With Battery';
    
    return 'Power Purchase - Standard'; // Default
  }

  private extractCapacity(rules: BusinessRule[]): number {
    const capacityRule = rules.find(rule => 
      rule.type.toLowerCase().includes('capacity') ||
      rule.type.toLowerCase().includes('power') ||
      rule.description.toLowerCase().includes('kw')
    );
    
    if (capacityRule?.mappedValue) {
      const value = parseFloat(capacityRule.mappedValue);
      if (!isNaN(value)) return Math.round(value / 325) * 325; // Round to nearest 325kW multiple
    }
    
    return 325; // Default minimum
  }

  private extractReliability(rules: BusinessRule[]): number {
    const reliabilityRule = rules.find(rule => 
      rule.type.toLowerCase().includes('reliability') ||
      rule.description.toLowerCase().includes('uptime')
    );
    return reliabilityRule?.mappedValue ? parseFloat(reliabilityRule.mappedValue) : 99.9;
  }

  private extractInstallationType(rules: BusinessRule[]): any {
    const installRule = rules.find(rule => 
      rule.type.toLowerCase().includes('installation') ||
      rule.type.toLowerCase().includes('mount')
    );
    return installRule?.mappedValue || 'Ground';
  }

  private extractBaseRate(rules: BusinessRule[]): number {
    const rateRule = rules.find(rule => 
      rule.category === 'payment' &&
      (rule.type.toLowerCase().includes('rate') ||
       rule.type.toLowerCase().includes('price') ||
       rule.description.toLowerCase().includes('kwh'))
    );
    
    if (rateRule?.mappedValue) {
      const value = parseFloat(rateRule.mappedValue);
      if (!isNaN(value)) return value;
    }
    
    return 0.085; // Default base rate
  }

  private extractEscalation(rules: BusinessRule[]): number {
    const escalationRule = rules.find(rule => 
      rule.type.toLowerCase().includes('escalation') ||
      rule.type.toLowerCase().includes('increase') ||
      rule.description.toLowerCase().includes('annual')
    );
    return escalationRule?.mappedValue ? parseFloat(escalationRule.mappedValue) : 2.5;
  }

  private extractContractTerm(rules: BusinessRule[], metadata: any): number {
    if (metadata.term) {
      const termMatch = metadata.term.match(/(\d+)/);
      if (termMatch) return parseInt(termMatch[1]);
    }
    
    const termRule = rules.find(rule => 
      rule.type.toLowerCase().includes('term') ||
      rule.type.toLowerCase().includes('duration') ||
      rule.description.toLowerCase().includes('year')
    );
    
    if (termRule?.mappedValue) {
      const value = parseInt(termRule.mappedValue);
      if (!isNaN(value)) return value;
    }

    console.warn('⚠️  Contract term not found in extracted rules - returning null');
    return null; // Return null if extraction failed - DO NOT default to 10
  }

  private extractMicrogridAdder(rules: BusinessRule[]): number {
    const adderRule = rules.find(rule => 
      rule.type.toLowerCase().includes('microgrid') &&
      rule.type.toLowerCase().includes('adder')
    );
    return adderRule?.mappedValue ? parseFloat(adderRule.mappedValue) : 0;
  }

  private extractThermalCycleFee(rules: BusinessRule[]): number {
    const cycleRule = rules.find(rule => 
      rule.type.toLowerCase().includes('thermal') ||
      rule.type.toLowerCase().includes('cycle')
    );
    return cycleRule?.mappedValue ? parseFloat(cycleRule.mappedValue) : 0;
  }

  private extractElectricalBudget(rules: BusinessRule[]): number {
    const budgetRule = rules.find(rule => 
      rule.type.toLowerCase().includes('electrical') &&
      rule.type.toLowerCase().includes('budget')
    );
    return budgetRule?.mappedValue ? parseFloat(budgetRule.mappedValue) : 0;
  }

  private extractCommissioningAllowance(rules: BusinessRule[]): number {
    const commissioningRule = rules.find(rule => 
      rule.type.toLowerCase().includes('commissioning') ||
      rule.type.toLowerCase().includes('allowance')
    );
    return commissioningRule?.mappedValue ? parseFloat(commissioningRule.mappedValue) : 0;
  }

  private extractOutputWarranty(rules: BusinessRule[]): number {
    const warrantyRule = rules.find(rule => 
      rule.type.toLowerCase().includes('output') &&
      rule.type.toLowerCase().includes('warranty')
    );
    return warrantyRule?.mappedValue ? parseFloat(warrantyRule.mappedValue) : 90;
  }

  private extractEfficiencyWarranty(rules: BusinessRule[]): number {
    const efficiencyRule = rules.find(rule => 
      rule.type.toLowerCase().includes('efficiency') &&
      rule.type.toLowerCase().includes('warranty')
    );
    return efficiencyRule?.mappedValue ? parseFloat(efficiencyRule.mappedValue) : 47;
  }

  private extractMinDemand(rules: BusinessRule[]): number {
    const demandRule = rules.find(rule => 
      rule.type.toLowerCase().includes('demand') &&
      rule.type.toLowerCase().includes('min')
    );
    return demandRule?.mappedValue ? parseFloat(demandRule.mappedValue) : 0;
  }

  private extractMaxDemand(rules: BusinessRule[]): number {
    const demandRule = rules.find(rule => 
      rule.type.toLowerCase().includes('demand') &&
      rule.type.toLowerCase().includes('max')
    );
    return demandRule?.mappedValue ? parseFloat(demandRule.mappedValue) : 1000;
  }

  private extractCriticalOutput(rules: BusinessRule[]): number {
    const criticalRule = rules.find(rule => 
      rule.type.toLowerCase().includes('critical') ||
      rule.type.toLowerCase().includes('backup')
    );
    return criticalRule?.mappedValue ? parseFloat(criticalRule.mappedValue) : 0;
  }

  private extractIncludeRECs(rules: BusinessRule[]): boolean {
    const recRule = rules.find(rule => 
      rule.type.toLowerCase().includes('rec') ||
      rule.type.toLowerCase().includes('renewable')
    );
    return !!recRule;
  }

  private extractRECType(rules: BusinessRule[]): string {
    const recRule = rules.find(rule => 
      rule.type.toLowerCase().includes('rec')
    );
    return recRule?.mappedValue || 'CT-Class-I';
  }

  private extractVoltage(rules: BusinessRule[]): any {
    const voltageRule = rules.find(rule => 
      rule.type.toLowerCase().includes('voltage') ||
      rule.description.toLowerCase().includes('v')
    );
    
    const voltage = voltageRule?.mappedValue || '';
    if (voltage.includes('480')) return '480V';
    if (voltage.includes('4.16') || voltage.includes('4160')) return '4.16kV';
    if (voltage.includes('13.2') || voltage.includes('13200')) return '13.2kV';
    if (voltage.includes('34.5') || voltage.includes('34500')) return '34.5kV';
    
    return '480V'; // Default
  }

  private extractNumberOfServers(rules: BusinessRule[]): number {
    const serverRule = rules.find(rule => 
      rule.type.toLowerCase().includes('server') ||
      rule.type.toLowerCase().includes('unit')
    );
    return serverRule?.mappedValue ? parseInt(serverRule.mappedValue) : 1;
  }

  private extractComponents(rules: BusinessRule[]): any[] {
    const components: any[] = [];
    
    const componentRules = rules.filter(rule => 
      rule.type.toLowerCase().includes('component') ||
      rule.type.toLowerCase().includes('feature')
    );
    
    for (const rule of componentRules) {
      const value = rule.mappedValue?.toLowerCase() || '';
      if (value.includes('renewable')) components.push('RI');
      if (value.includes('advanced') || value.includes('control')) components.push('AC');
      if (value.includes('utility')) components.push('UC');
      if (value.includes('battery') || value.includes('storage')) components.push('BESS');
      if (value.includes('solar')) components.push('Solar');
      if (value.includes('wind')) components.push('Wind');
    }
    
    return components.length > 0 ? components : [];
  }

  private extractSpecialRequirements(rules: BusinessRule[]): string {
    const specialRules = rules.filter(rule => 
      rule.type.toLowerCase().includes('special') ||
      rule.type.toLowerCase().includes('requirement') ||
      rule.type.toLowerCase().includes('note')
    );
    
    return specialRules.map(rule => rule.description).join('; ') || '';
  }
}

// Export singleton instance
export const aiToContractService = new AIToContractService();