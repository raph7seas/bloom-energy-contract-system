import { ContractFormData, ValidationError, SystemType, VoltageLevel } from '../types';

/**
 * Validation utilities for Bloom Energy contract forms
 * Based on business rules from the existing validation logic
 */

export const validateRequiredField = (value: any, fieldName: string): string | null => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }
  return null;
};

export const validatePhoneNumber = (phone: string): string | null => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  if (!phoneRegex.test(phone)) {
    return 'Invalid phone number format';
  }
  return null;
};

export const validateCapacity = (capacity: number): string | null => {
  if (capacity <= 0) {
    return 'Capacity must be greater than 0';
  }
  
  if (capacity % 325 !== 0) {
    return 'Capacity must be in multiples of 325 kW';
  }
  
  if (capacity < 325 || capacity > 3900) {
    return 'Capacity must be between 325 kW and 3900 kW';
  }
  
  return null;
};

export const validateContractTerm = (term: number): string | null => {
  const validTerms = [5, 10, 15, 20];
  if (!validTerms.includes(term)) {
    return 'Contract term must be 5, 10, 15, or 20 years';
  }
  return null;
};

export const validateEscalationRate = (rate: number): string | null => {
  if (rate < 2.0 || rate > 5.0) {
    return 'Escalation rate must be between 2.0% and 5.0%';
  }
  return null;
};

export const validateWarrantyPercentage = (percentage: number, type: string): string | null => {
  if (percentage < 0 || percentage > 100) {
    return `${type} warranty must be between 0% and 100%`;
  }
  return null;
};

export const validateDemandRange = (min: number, max: number, capacity: number): string | null => {
  if (min >= max) {
    return 'Minimum demand must be less than maximum demand';
  }
  
  if (min < 0) {
    return 'Minimum demand cannot be negative';
  }
  
  if (max > capacity) {
    return 'Maximum demand cannot exceed rated capacity';
  }
  
  return null;
};

export const validateCriticalOutput = (criticalOutput: number, capacity: number): string | null => {
  if (criticalOutput > capacity) {
    return 'Critical output cannot exceed rated capacity';
  }
  
  if (criticalOutput < 0) {
    return 'Critical output cannot be negative';
  }
  
  return null;
};

export const validateDate = (date: string, fieldName: string): string | null => {
  if (!date) {
    return `${fieldName} is required`;
  }
  
  const selectedDate = new Date(date);
  const today = new Date();
  
  if (selectedDate < today) {
    return `${fieldName} cannot be in the past`;
  }
  
  return null;
};

export const validateEffectiveDate = (effectiveDate: string, orderDate: string): string | null => {
  if (!effectiveDate || !orderDate) {
    return null; // Individual date validation will catch missing dates
  }
  
  const effective = new Date(effectiveDate);
  const order = new Date(orderDate);
  
  if (effective <= order) {
    return 'Effective date must be after order date';
  }
  
  return null;
};

// Comprehensive contract validation
export const validateContract = (formData: ContractFormData): ValidationError => {
  const errors: ValidationError = {};
  
  // Basic Information validation
  const customerNameError = validateRequiredField(formData.customerName, 'Customer name');
  if (customerNameError) errors.customerName = customerNameError;
  
  const siteLocationError = validateRequiredField(formData.siteLocation, 'Site location');
  if (siteLocationError) errors.siteLocation = siteLocationError;
  
  const orderDateError = validateDate(formData.orderDate, 'Order date');
  if (orderDateError) errors.orderDate = orderDateError;
  
  const effectiveDateError = validateDate(formData.effectiveDate, 'Effective date');
  if (effectiveDateError) errors.effectiveDate = effectiveDateError;
  
  const dateComparisonError = validateEffectiveDate(formData.effectiveDate, formData.orderDate);
  if (dateComparisonError) errors.effectiveDate = dateComparisonError;
  
  // System Configuration validation
  const capacityError = validateCapacity(formData.ratedCapacity);
  if (capacityError) errors.ratedCapacity = capacityError;
  
  const termError = validateContractTerm(formData.contractTerm);
  if (termError) errors.contractTerm = termError;
  
  // Financial Parameters validation
  if (formData.baseRate <= 0) {
    errors.baseRate = 'Base rate must be greater than 0';
  }
  
  const escalationError = validateEscalationRate(formData.annualEscalation);
  if (escalationError) errors.annualEscalation = escalationError;
  
  // Operating Parameters validation
  const outputWarrantyError = validateWarrantyPercentage(
    formData.outputWarrantyPercent, 
    'Output'
  );
  if (outputWarrantyError) errors.outputWarrantyPercent = outputWarrantyError;
  
  const efficiencyWarrantyError = validateWarrantyPercentage(
    formData.efficiencyWarrantyPercent, 
    'Efficiency'
  );
  if (efficiencyWarrantyError) errors.efficiencyWarrantyPercent = efficiencyWarrantyError;
  
  const demandRangeError = validateDemandRange(
    formData.minDemandKW,
    formData.maxDemandKW,
    formData.ratedCapacity
  );
  if (demandRangeError) errors.demandRange = demandRangeError;
  
  const criticalOutputError = validateCriticalOutput(
    formData.guaranteedCriticalOutput,
    formData.ratedCapacity
  );
  if (criticalOutputError) errors.criticalOutput = criticalOutputError;
  
  // Technical Specifications validation
  if (formData.numberOfServers <= 0) {
    errors.numberOfServers = 'Number of servers must be greater than 0';
  }
  
  if (!formData.selectedComponents || formData.selectedComponents.length === 0) {
    errors.selectedComponents = 'At least one component must be selected';
  }
  
  return errors;
};

// Tab-specific validation helpers
export const validateBasicTab = (formData: Partial<ContractFormData>): boolean => {
  return !!(
    formData.customerName &&
    formData.siteLocation &&
    formData.orderDate &&
    formData.effectiveDate
  );
};

export const validateSystemTab = (formData: Partial<ContractFormData>): boolean => {
  return !!(
    formData.solutionType &&
    formData.ratedCapacity &&
    formData.ratedCapacity > 0 &&
    formData.contractTerm &&
    formData.reliabilityLevel !== undefined
  );
};

export const validateFinancialTab = (formData: Partial<ContractFormData>): boolean => {
  return !!(
    formData.baseRate &&
    formData.baseRate > 0 &&
    formData.annualEscalation !== undefined &&
    formData.annualEscalation >= 2.0 &&
    formData.annualEscalation <= 5.0
  );
};

export const validateOperatingTab = (formData: Partial<ContractFormData>): boolean => {
  return !!(
    formData.outputWarrantyPercent !== undefined &&
    formData.efficiencyWarrantyPercent !== undefined &&
    formData.minDemandKW !== undefined &&
    formData.maxDemandKW !== undefined &&
    formData.guaranteedCriticalOutput !== undefined
  );
};

export const validateTechnicalTab = (formData: Partial<ContractFormData>): boolean => {
  return !!(
    formData.gridParallelVoltage &&
    formData.numberOfServers &&
    formData.numberOfServers > 0 &&
    formData.selectedComponents &&
    formData.selectedComponents.length > 0
  );
};

// Get all validation errors as a flat array
export const getValidationErrors = (errors: ValidationError): string[] => {
  return Object.values(errors).filter(error => error !== null);
};

// Check if form has any validation errors
export const hasValidationErrors = (errors: ValidationError): boolean => {
  return Object.values(errors).some(error => error !== null);
};