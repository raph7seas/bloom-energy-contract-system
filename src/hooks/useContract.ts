import { useState, useEffect, useCallback } from 'react';
import { Contract, ContractFormData, ValidationError, TabValidationState } from '../types';
import { contractService } from '../services';
import { validateContract, DEFAULT_FORM_VALUES, TAB_CONFIG } from '../utils';

/**
 * Custom hook for contract state management
 * Handles form data, validation, and contract operations
 */

export const useContract = (initialData?: Partial<ContractFormData>) => {
  // Form state
  const [formData, setFormData] = useState<ContractFormData>({
    ...DEFAULT_FORM_VALUES,
    ...initialData
  });
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState<ValidationError>({});
  const [tabValidation, setTabValidation] = useState<TabValidationState>({});
  
  // UI state
  const [activeTab, setActiveTab] = useState('create');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Update form data
  const updateFormData = useCallback((updates: Partial<ContractFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
    setIsDirty(true);
  }, []);

  // Update single field
  const updateField = useCallback((field: keyof ContractFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  }, []);

  // Validate current form data
  const validateForm = useCallback(() => {
    const errors = validateContract(formData);
    setValidationErrors(errors);
    
    // Update tab validation state
    const newTabValidation: TabValidationState = {};
    TAB_CONFIG.forEach(tab => {
      if (tab.required) {
        newTabValidation[tab.id] = Object.keys(errors).length === 0;
      }
    });
    setTabValidation(newTabValidation);
    
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Check if specific tab is valid
  const isTabValid = useCallback((tabId: string): boolean => {
    switch (tabId) {
      case 'basic':
        return !!(
          formData.customerName &&
          formData.siteLocation &&
          formData.orderDate &&
          formData.effectiveDate
        );
      case 'system':
        return !!(
          formData.solutionType &&
          formData.ratedCapacity > 0 &&
          formData.contractTerm &&
          formData.reliabilityLevel
        );
      case 'financial':
        return !!(
          formData.baseRate > 0 &&
          formData.annualEscalation >= 2.0 &&
          formData.annualEscalation <= 5.0
        );
      case 'operating':
        return !!(
          formData.outputWarrantyPercent >= 0 &&
          formData.efficiencyWarrantyPercent >= 0 &&
          formData.minDemandKW >= 0 &&
          formData.maxDemandKW >= 0 &&
          formData.guaranteedCriticalOutput >= 0
        );
      case 'technical':
        return !!(
          formData.gridParallelVoltage &&
          formData.numberOfServers > 0 &&
          formData.selectedComponents.length > 0
        );
      default:
        return true;
    }
  }, [formData]);

  // Generate contract
  const generateContract = useCallback(async (): Promise<Contract | null> => {
    setIsGenerating(true);
    
    try {
      if (!validateForm()) {
        throw new Error('Form validation failed');
      }
      
      const contract = await contractService.createContract(formData);
      setIsDirty(false);
      return contract;
    } catch (error) {
      console.error('Failed to generate contract:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [formData, validateForm]);

  // Load contract data into form
  const loadContract = useCallback((contract: Contract) => {
    const contractFormData: ContractFormData = {
      customerName: contract.client,
      siteLocation: contract.site,
      orderDate: new Date().toISOString().split('T')[0],
      effectiveDate: contract.effectiveDate,
      solutionType: contract.type,
      ratedCapacity: contract.capacity,
      reliabilityLevel: 99.9, // Default, would need to be stored in contract
      installationType: 'Ground', // Default, would need to be stored
      baseRate: contract.parameters.financial.baseRate,
      annualEscalation: contract.parameters.financial.escalation,
      contractTerm: contract.term,
      microgridAdder: contract.parameters.financial.microgridAdder || 0,
      thermalCycleFee: contract.parameters.financial.thermalCycleFee || 0,
      electricalBudget: contract.parameters.financial.electricalBudget || 0,
      commissioningAllowance: contract.parameters.financial.commissioningAllowance || 0,
      outputWarrantyPercent: contract.parameters.operating.outputWarranty,
      efficiencyWarrantyPercent: contract.parameters.operating.efficiency,
      minDemandKW: contract.parameters.operating.demandRange.min,
      maxDemandKW: contract.parameters.operating.demandRange.max,
      guaranteedCriticalOutput: contract.parameters.operating.criticalOutput,
      includeRECs: !!contract.parameters.technical.recType,
      recType: contract.parameters.technical.recType || 'CT-Class-I',
      gridParallelVoltage: contract.parameters.technical.voltage,
      numberOfServers: contract.parameters.technical.servers,
      selectedComponents: contract.parameters.technical.components,
      specialRequirements: contract.notes || ''
    };
    
    setFormData(contractFormData);
    setIsDirty(false);
    validateForm();
  }, [validateForm]);

  // Reset form to defaults
  const resetForm = useCallback(() => {
    setFormData(DEFAULT_FORM_VALUES);
    setValidationErrors({});
    setTabValidation({});
    setActiveTab('create');
    setIsDirty(false);
  }, []);

  // Auto-validate when form data changes
  useEffect(() => {
    if (isDirty) {
      validateForm();
    }
  }, [formData, isDirty, validateForm]);

  return {
    // Data
    formData,
    validationErrors,
    tabValidation,
    
    // State
    activeTab,
    isGenerating,
    isDirty,
    
    // Actions
    updateFormData,
    updateField,
    setActiveTab,
    validateForm,
    isTabValid,
    generateContract,
    loadContract,
    resetForm,
    
    // Computed values
    isFormValid: Object.keys(validationErrors).length === 0,
    canGenerate: Object.keys(validationErrors).length === 0 && !isGenerating
  };
};