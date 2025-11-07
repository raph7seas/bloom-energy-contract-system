import { Contract, ContractFormData, ContractStats, LearnedRules } from '../types';
import { loadFromLocalStorage, saveToLocalStorage, STORAGE_KEYS } from '../utils/storage';
import { calculateYearlyRates, calculateTotalContractValue } from '../utils/calculations';

/**
 * Contract service for managing contract data
 * Now uses API endpoints with localStorage as fallback
 */

const API_BASE_URL = '/api';

class ContractService {
  // Helper method to get authentication headers
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }
  // Get all contracts
  async getContracts(): Promise<Contract[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/contracts`, {
        headers: this.getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Safe JSON parsing
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse JSON response:', text.substring(0, 100));
        throw new Error('Invalid response from server');
      }

      // Transform backend format to frontend format
      // API returns either an array directly or {contracts: [...]}
      const contractsArray = Array.isArray(data) ? data : (data.contracts || []);
      return contractsArray.map((contract: any) => this.transformContractFromAPI(contract));
    } catch (error) {
      console.error('Failed to fetch contracts from API, falling back to localStorage:', error);
      return loadFromLocalStorage(STORAGE_KEYS.CONTRACTS, []);
    }
  }

  // Get contract by ID
  async getContractById(id: string): Promise<Contract | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/contracts/${id}`, {
        headers: this.getAuthHeaders()
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const contract = await response.json();
      return this.transformContractFromAPI(contract);
    } catch (error) {
      console.error('Failed to fetch contract from API, falling back to localStorage:', error);
      const contracts = await this.getContracts();
      return contracts.find(contract => contract.id === id) || null;
    }
  }

  // Create new contract
  async createContract(formData: ContractFormData): Promise<Contract> {
    try {
      // Transform form data to API format
      const contractData = this.transformFormDataToAPI(formData);
      
      const response = await fetch(`${API_BASE_URL}/contracts`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(contractData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiContract = await response.json();
      const contract = this.transformContractFromAPI(apiContract);
      
      // Update learned rules
      await this.updateLearnedRules(contract);
      
      return contract;
    } catch (error) {
      console.error('Failed to create contract via API, falling back to localStorage:', error);
      return this.createContractLocally(formData);
    }
  }

  // Update existing contract
  async updateContract(id: string, formData: Partial<ContractFormData>): Promise<Contract | null> {
    try {
      // Get existing contract to build partial update data
      const existingContract = await this.getContractById(id);
      if (!existingContract) {
        return null;
      }

      // Transform form data to API update format
      const updateData = this.transformPartialFormDataToAPI(formData, existingContract);
      
      const response = await fetch(`${API_BASE_URL}/contracts/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiContract = await response.json();
      return this.transformContractFromAPI(apiContract);
    } catch (error) {
      console.error('Failed to update contract via API, falling back to localStorage:', error);
      return this.updateContractLocally(id, formData);
    }
  }

  // Delete contract
  async deleteContract(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/contracts/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) return false;
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to delete contract via API, falling back to localStorage:', error);
      const contracts = await this.getContracts();
      const filteredContracts = contracts.filter(contract => contract.id !== id);
      
      if (filteredContracts.length === contracts.length) {
        return false; // Contract not found
      }
      
      saveToLocalStorage(STORAGE_KEYS.CONTRACTS, filteredContracts);
      return true;
    }
  }

  // Search and filter contracts
  async searchContracts(query: string): Promise<Contract[]> {
    const contracts = await this.getContracts();
    
    if (!query.trim()) {
      return contracts;
    }
    
    const searchTerm = query.toLowerCase();
    
    return contracts.filter(contract => 
      contract.name.toLowerCase().includes(searchTerm) ||
      contract.client.toLowerCase().includes(searchTerm) ||
      contract.site.toLowerCase().includes(searchTerm) ||
      contract.id.toLowerCase().includes(searchTerm) ||
      contract.type.toLowerCase().includes(searchTerm) ||
      (contract.tags && contract.tags.some(tag => 
        tag.toLowerCase().includes(searchTerm)
      ))
    );
  }

  // Get contract statistics
  async getContractStats(): Promise<ContractStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/contracts/stats/overview`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const apiStats = await response.json();
      
      return {
        totalContracts: apiStats.totalContracts,
        totalValue: apiStats.totalValue,
        averageContractValue: apiStats.averageContractValue,
        contractsByStatus: apiStats.contractsByStatus,
        contractsByType: apiStats.contractsByType,
        monthlyGrowth: apiStats.monthlyGrowth,
        completionRate: apiStats.completionRate || 85.4
      };
    } catch (error) {
      console.error('Failed to fetch contract stats from API, falling back to localStorage:', error);
      return this.getContractStatsLocally();
    }
  }

  // Generate unique contract ID
  private generateContractId(): string {
    const prefix = 'BEC'; // Bloom Energy Contract
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Generate tags based on form data
  private generateTags(formData: ContractFormData): string[] {
    const tags: string[] = [];
    
    // Add location-based tags
    if (formData.siteLocation.includes(',')) {
      const [, state] = formData.siteLocation.split(',');
      tags.push(state.trim());
    }
    
    // Add capacity-based tags
    if (formData.ratedCapacity >= 2000) {
      tags.push('Large Scale');
    } else if (formData.ratedCapacity >= 1000) {
      tags.push('Medium Scale');
    } else {
      tags.push('Small Scale');
    }
    
    // Add system type tags
    if (formData.solutionType.includes('Microgrid')) {
      tags.push('Microgrid');
    } else {
      tags.push('Power Purchase');
    }
    
    // Add reliability tags
    if (formData.reliabilityLevel >= 99.99) {
      tags.push('High Reliability');
    }
    
    // Add component tags
    if (formData.selectedComponents.includes('BESS')) {
      tags.push('Battery Storage');
    }
    if (formData.selectedComponents.includes('Solar')) {
      tags.push('Solar Integration');
    }
    
    return tags;
  }

  // Update learned rules based on new contract
  private async updateLearnedRules(contract: Contract): Promise<void> {
    const currentRules = loadFromLocalStorage<LearnedRules>(STORAGE_KEYS.LEARNED_RULES, {
      capacityRange: { min: 325, max: 3900 },
      termRange: { min: 5, max: 20 },
      systemTypes: ['PP', 'MG', 'AMG', 'OG'],
      voltageOptions: ['208V', '480V', '4.16kV', '13.2kV', '34.5kV'],
      componentOptions: ['RI', 'AC', 'UC', 'BESS', 'Solar'],
      escalationRange: { min: 2.0, max: 5.0 }
    });

    // Update capacity range
    if (contract.capacity < currentRules.capacityRange.min) {
      currentRules.capacityRange.min = contract.capacity;
    }
    if (contract.capacity > currentRules.capacityRange.max) {
      currentRules.capacityRange.max = contract.capacity;
    }

    // Update term range
    if (contract.term < currentRules.termRange.min) {
      currentRules.termRange.min = contract.term;
    }
    if (contract.term > currentRules.termRange.max) {
      currentRules.termRange.max = contract.term;
    }

    // Add new system types if not present
    if (!currentRules.systemTypes.includes(contract.type as any)) {
      currentRules.systemTypes.push(contract.type as any);
    }

    // Add new voltage options if not present
    if (!currentRules.voltageOptions.includes(contract.parameters.technical.voltage)) {
      currentRules.voltageOptions.push(contract.parameters.technical.voltage);
    }

    // Add new components if not present
    contract.parameters.technical.components.forEach(component => {
      if (!currentRules.componentOptions.includes(component)) {
        currentRules.componentOptions.push(component);
      }
    });

    // Update escalation range
    const escalation = contract.parameters.financial.escalation;
    if (escalation < currentRules.escalationRange.min) {
      currentRules.escalationRange.min = escalation;
    }
    if (escalation > currentRules.escalationRange.max) {
      currentRules.escalationRange.max = escalation;
    }

    saveToLocalStorage(STORAGE_KEYS.LEARNED_RULES, currentRules);
  }

  // Transform contract from API format to frontend format
  private transformContractFromAPI(apiContract: any): Contract {
    // Support both database format (financial/technical/operating) and in-memory format (financialParams/technicalParams/operatingParams)
    const financial = apiContract.financial || apiContract.financialParams || {};
    const technical = apiContract.technical || apiContract.technicalParams || {};
    const operating = apiContract.operating || apiContract.operatingParams || {};

    return {
      id: apiContract.id,
      name: apiContract.name,
      client: apiContract.client,
      site: apiContract.site,
      capacity: apiContract.capacity,
      term: apiContract.term,
      type: this.mapSystemTypeFromAPI(apiContract.systemType),
      uploadDate: apiContract.createdAt?.split('T')[0] || apiContract.uploadDate,
      effectiveDate: apiContract.effectiveDate?.split('T')[0] || apiContract.effectiveDate,
      status: apiContract.status,
      totalValue: apiContract.totalValue || 0,
      yearlyRate: apiContract.yearlyRate || 0,
      parameters: {
        financial: {
          baseRate: financial.baseRate || 0,
          microgridAdder: financial.microgridAdder || 0,
          escalation: financial.escalation || 0,
          thermalCycleFee: financial.thermalCycleFee || 0,
          electricalBudget: financial.electricalBudget || 0,
          commissioningAllowance: financial.commissioningAllowance || 0
        },
        technical: {
          voltage: this.mapVoltageFromAPI(technical.voltage),
          gridVoltage: this.mapVoltageFromAPI(technical.gridVoltage || technical.voltage),
          servers: technical.servers || 0,
          components: this.mapComponentsFromAPI(technical.components) || [],
          recType: technical.recType
        },
        operating: {
          outputWarranty: operating.outputWarranty || 0,
          efficiency: operating.efficiency || 0,
          demandRange: {
            min: operating.minDemand || 0,
            max: operating.maxDemand || 0
          },
          criticalOutput: operating.criticalOutput || 0
        }
      },
      notes: apiContract.notes || '',
      tags: apiContract.tags || []
    };
  }

  // Transform form data to API format
  private transformFormDataToAPI(formData: ContractFormData): any {
    // Calculate derived values
    const yearlyRates = calculateYearlyRates(
      formData.baseRate,
      formData.annualEscalation,
      formData.contractTerm
    );
    
    const totalValue = calculateTotalContractValue(
      formData.ratedCapacity,
      yearlyRates
    );

    return {
      name: `${formData.customerName} - ${formData.siteLocation}`,
      client: formData.customerName,
      site: formData.siteLocation,
      capacity: formData.ratedCapacity,
      term: formData.contractTerm,
      systemType: this.mapSystemTypeToAPI(formData.solutionType),
      effectiveDate: formData.effectiveDate,
      status: 'DRAFT',
      totalValue: totalValue,
      yearlyRate: parseFloat(yearlyRates[0].rate),
      notes: formData.specialRequirements,
      tags: this.generateTags(formData),
      financial: {
        baseRate: formData.baseRate,
        microgridAdder: formData.microgridAdder || 0,
        escalation: formData.annualEscalation,
        thermalCycleFee: formData.thermalCycleFee || 0,
        electricalBudget: formData.electricalBudget || 0,
        commissioningAllowance: formData.commissioningAllowance || 0
      },
      technical: {
        voltage: this.mapVoltageToAPI(formData.gridParallelVoltage),
        gridVoltage: this.mapVoltageToAPI(formData.gridParallelVoltage),
        servers: formData.numberOfServers,
        components: this.mapComponentsToAPI(formData.selectedComponents),
        recType: formData.includeRECs ? formData.recType : null
      },
      operating: {
        outputWarranty: formData.outputWarrantyPercent,
        efficiency: formData.efficiencyWarrantyPercent,
        minDemand: formData.minDemandKW,
        maxDemand: formData.maxDemandKW,
        criticalOutput: formData.guaranteedCriticalOutput
      }
    };
  }

  // Create contract locally (fallback)
  private async createContractLocally(formData: ContractFormData): Promise<Contract> {
    const contracts = await this.getContracts();
    
    // Calculate derived values
    const yearlyRates = calculateYearlyRates(
      formData.baseRate,
      formData.annualEscalation,
      formData.contractTerm
    );
    
    const totalValue = calculateTotalContractValue(
      formData.ratedCapacity,
      yearlyRates
    );

    const newContract: Contract = {
      id: this.generateContractId(),
      name: `${formData.customerName} - ${formData.siteLocation}`,
      client: formData.customerName,
      site: formData.siteLocation,
      capacity: formData.ratedCapacity,
      term: formData.contractTerm,
      type: formData.solutionType,
      uploadDate: new Date().toISOString().split('T')[0],
      effectiveDate: formData.effectiveDate,
      status: 'Draft',
      totalValue: totalValue,
      yearlyRate: parseFloat(yearlyRates[0].rate),
      parameters: {
        financial: {
          baseRate: formData.baseRate,
          microgridAdder: formData.microgridAdder,
          escalation: formData.annualEscalation,
          thermalCycleFee: formData.thermalCycleFee,
          electricalBudget: formData.electricalBudget,
          commissioningAllowance: formData.commissioningAllowance
        },
        technical: {
          voltage: formData.gridParallelVoltage,
          gridVoltage: formData.gridParallelVoltage,
          servers: formData.numberOfServers,
          components: formData.selectedComponents,
          recType: formData.includeRECs ? formData.recType : undefined
        },
        operating: {
          outputWarranty: formData.outputWarrantyPercent,
          efficiency: formData.efficiencyWarrantyPercent,
          demandRange: {
            min: formData.minDemandKW,
            max: formData.maxDemandKW
          },
          criticalOutput: formData.guaranteedCriticalOutput
        }
      },
      notes: formData.specialRequirements,
      tags: this.generateTags(formData)
    };

    const updatedContracts = [...contracts, newContract];
    saveToLocalStorage(STORAGE_KEYS.CONTRACTS, updatedContracts);
    
    return newContract;
  }

  // Map system type to API enum
  private mapSystemTypeToAPI(type: string): string {
    const mapping: Record<string, string> = {
      'Power Purchase - Standard': 'POWER_PURCHASE_STANDARD',
      'Power Purchase - With Battery': 'POWER_PURCHASE_WITH_BATTERY', 
      'Microgrid - Constrained': 'MICROGRID_CONSTRAINED',
      'Microgrid - Unconstrained': 'MICROGRID_UNCONSTRAINED',
      'PP': 'PP',
      'MG': 'MG', 
      'AMG': 'AMG',
      'OG': 'OG'
    };
    return mapping[type] || 'POWER_PURCHASE_STANDARD';
  }

  // Map system type from API enum
  private mapSystemTypeFromAPI(apiType: string): string {
    const mapping: Record<string, string> = {
      'POWER_PURCHASE_STANDARD': 'Power Purchase - Standard',
      'POWER_PURCHASE_WITH_BATTERY': 'Power Purchase - With Battery',
      'MICROGRID_CONSTRAINED': 'Microgrid - Constrained',
      'MICROGRID_UNCONSTRAINED': 'Microgrid - Unconstrained',
      'PP': 'PP',
      'MG': 'MG',
      'AMG': 'AMG',
      'OG': 'OG'
    };
    return mapping[apiType] || apiType;
  }

  // Map voltage to API enum
  private mapVoltageToAPI(voltage: string): string {
    const mapping: Record<string, string> = {
      '208V': 'V_208',
      '480V': 'V_480',
      '4.16kV': 'V_4_16K',
      '13.2kV': 'V_13_2K',
      '34.5kV': 'V_34_5K'
    };
    return mapping[voltage] || 'V_480';
  }

  // Map voltage from API enum
  private mapVoltageFromAPI(apiVoltage: string): string {
    const mapping: Record<string, string> = {
      'V_208': '208V',
      'V_480': '480V',
      'V_4_16K': '4.16kV',
      'V_13_2K': '13.2kV',
      'V_34_5K': '34.5kV'
    };
    return mapping[apiVoltage] || '480V';
  }

  // Map components to API enum
  private mapComponentsToAPI(components: string[]): string[] {
    const mapping: Record<string, string> = {
      'RI': 'RI',
      'AC': 'AC',
      'UC': 'UC',
      'BESS': 'BESS',
      'Solar': 'SOLAR',
      'Wind': 'WIND'
    };
    return components.map(comp => mapping[comp] || comp);
  }

  // Map components from API enum
  private mapComponentsFromAPI(apiComponents: string[]): string[] {
    if (!apiComponents) return [];
    const mapping: Record<string, string> = {
      'RI': 'RI',
      'AC': 'AC', 
      'UC': 'UC',
      'BESS': 'BESS',
      'SOLAR': 'Solar',
      'WIND': 'Wind'
    };
    return apiComponents.map(comp => mapping[comp] || comp);
  }

  // Transform partial form data to API format for updates
  private transformPartialFormDataToAPI(formData: Partial<ContractFormData>, existingContract: Contract): any {
    const updateData: any = {};

    // Update main contract fields
    if (formData.customerName && formData.customerName !== existingContract.client) {
      updateData.client = formData.customerName;
      updateData.name = `${formData.customerName} - ${existingContract.site}`;
    }
    
    if (formData.siteLocation && formData.siteLocation !== existingContract.site) {
      updateData.site = formData.siteLocation;
      updateData.name = `${existingContract.client} - ${formData.siteLocation}`;
    }

    if (formData.ratedCapacity !== undefined) updateData.capacity = formData.ratedCapacity;
    if (formData.contractTerm !== undefined) updateData.term = formData.contractTerm;
    if (formData.effectiveDate !== undefined) updateData.effectiveDate = formData.effectiveDate;
    if (formData.specialRequirements !== undefined) updateData.notes = formData.specialRequirements;
    if (formData.solutionType !== undefined) updateData.systemType = this.mapSystemTypeToAPI(formData.solutionType);

    // Update financial parameters
    const financialUpdates: any = {};
    if (formData.baseRate !== undefined) financialUpdates.baseRate = formData.baseRate;
    if (formData.microgridAdder !== undefined) financialUpdates.microgridAdder = formData.microgridAdder;
    if (formData.annualEscalation !== undefined) financialUpdates.escalation = formData.annualEscalation;
    if (formData.thermalCycleFee !== undefined) financialUpdates.thermalCycleFee = formData.thermalCycleFee;
    if (formData.electricalBudget !== undefined) financialUpdates.electricalBudget = formData.electricalBudget;
    if (formData.commissioningAllowance !== undefined) financialUpdates.commissioningAllowance = formData.commissioningAllowance;
    
    if (Object.keys(financialUpdates).length > 0) {
      updateData.financial = financialUpdates;
    }

    // Update technical parameters
    const technicalUpdates: any = {};
    if (formData.gridParallelVoltage !== undefined) {
      technicalUpdates.voltage = this.mapVoltageToAPI(formData.gridParallelVoltage);
      technicalUpdates.gridVoltage = this.mapVoltageToAPI(formData.gridParallelVoltage);
    }
    if (formData.numberOfServers !== undefined) technicalUpdates.servers = formData.numberOfServers;
    if (formData.selectedComponents !== undefined) technicalUpdates.components = this.mapComponentsToAPI(formData.selectedComponents);
    if (formData.includeRECs !== undefined && formData.recType !== undefined) {
      technicalUpdates.recType = formData.includeRECs ? formData.recType : null;
    }
    
    if (Object.keys(technicalUpdates).length > 0) {
      updateData.technical = technicalUpdates;
    }

    // Update operating parameters
    const operatingUpdates: any = {};
    if (formData.outputWarrantyPercent !== undefined) operatingUpdates.outputWarranty = formData.outputWarrantyPercent;
    if (formData.efficiencyWarrantyPercent !== undefined) operatingUpdates.efficiency = formData.efficiencyWarrantyPercent;
    if (formData.minDemandKW !== undefined) operatingUpdates.minDemand = formData.minDemandKW;
    if (formData.maxDemandKW !== undefined) operatingUpdates.maxDemand = formData.maxDemandKW;
    if (formData.guaranteedCriticalOutput !== undefined) operatingUpdates.criticalOutput = formData.guaranteedCriticalOutput;
    
    if (Object.keys(operatingUpdates).length > 0) {
      updateData.operating = operatingUpdates;
    }

    // Recalculate values if financial data changed
    if (formData.baseRate || formData.annualEscalation || formData.contractTerm || formData.ratedCapacity) {
      const baseRate = formData.baseRate ?? existingContract.parameters.financial.baseRate;
      const escalation = formData.annualEscalation ?? existingContract.parameters.financial.escalation;
      const term = formData.contractTerm ?? existingContract.term;
      const capacity = formData.ratedCapacity ?? existingContract.capacity;
      
      const yearlyRates = calculateYearlyRates(baseRate, escalation, term);
      const totalValue = calculateTotalContractValue(capacity, yearlyRates);
      
      updateData.totalValue = totalValue;
      updateData.yearlyRate = parseFloat(yearlyRates[0].rate);
    }

    return updateData;
  }

  // Update contract locally (fallback)
  private async updateContractLocally(id: string, formData: Partial<ContractFormData>): Promise<Contract | null> {
    const contracts = await this.getContracts();
    const contractIndex = contracts.findIndex(contract => contract.id === id);
    
    if (contractIndex === -1) {
      return null;
    }

    const existingContract = contracts[contractIndex];
    
    // Merge and recalculate if financial data changed
    if (formData.baseRate || formData.annualEscalation || formData.contractTerm || formData.ratedCapacity) {
      const baseRate = formData.baseRate ?? existingContract.parameters.financial.baseRate;
      const escalation = formData.annualEscalation ?? existingContract.parameters.financial.escalation;
      const term = formData.contractTerm ?? existingContract.term;
      const capacity = formData.ratedCapacity ?? existingContract.capacity;
      
      const yearlyRates = calculateYearlyRates(baseRate, escalation, term);
      const totalValue = calculateTotalContractValue(capacity, yearlyRates);
      
      existingContract.totalValue = totalValue;
      existingContract.yearlyRate = parseFloat(yearlyRates[0].rate);
    }

    // Update contract fields
    if (formData.customerName) {
      existingContract.client = formData.customerName;
      existingContract.name = `${formData.customerName} - ${existingContract.site}`;
    }
    
    if (formData.siteLocation) {
      existingContract.site = formData.siteLocation;
      existingContract.name = `${existingContract.client} - ${formData.siteLocation}`;
    }

    // Update parameters
    if (formData.baseRate !== undefined) existingContract.parameters.financial.baseRate = formData.baseRate;
    if (formData.microgridAdder !== undefined) existingContract.parameters.financial.microgridAdder = formData.microgridAdder;
    if (formData.annualEscalation !== undefined) existingContract.parameters.financial.escalation = formData.annualEscalation;
    
    contracts[contractIndex] = existingContract;
    saveToLocalStorage(STORAGE_KEYS.CONTRACTS, contracts);
    
    return existingContract;
  }

  // Get contract statistics locally (fallback)
  private async getContractStatsLocally(): Promise<ContractStats> {
    const contracts = await this.getContracts();
    
    const totalValue = contracts.reduce((sum, contract) => sum + contract.totalValue, 0);
    const averageValue = contracts.length > 0 ? totalValue / contracts.length : 0;
    
    const statusCounts = contracts.reduce((acc, contract) => {
      acc[contract.status] = (acc[contract.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const typeCounts = contracts.reduce((acc, contract) => {
      acc[contract.type] = (acc[contract.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Calculate monthly growth (simplified)
    const currentMonth = new Date().getMonth();
    const currentMonthContracts = contracts.filter(contract => 
      new Date(contract.uploadDate).getMonth() === currentMonth
    ).length;
    
    const lastMonthContracts = contracts.filter(contract => 
      new Date(contract.uploadDate).getMonth() === currentMonth - 1
    ).length;
    
    const monthlyGrowth = lastMonthContracts > 0 
      ? ((currentMonthContracts - lastMonthContracts) / lastMonthContracts) * 100 
      : 0;

    return {
      totalContracts: contracts.length,
      totalValue,
      averageContractValue: averageValue,
      contractsByStatus: statusCounts as any,
      contractsByType: typeCounts as any,
      monthlyGrowth,
      completionRate: 85.4 // Mock completion rate
    };
  }
}

// Export singleton instance
export const contractService = new ContractService();