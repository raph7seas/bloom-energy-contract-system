import { YearlyRate } from '../types';

/**
 * Financial calculation utilities for Bloom Energy contracts
 * Based on the existing calculation logic from the monolithic component
 */

export const calculateYearlyRates = (
  baseRate: number,
  annualEscalation: number,
  contractTerm: number
): YearlyRate[] => {
  const rates: YearlyRate[] = [];
  
  for (let year = 1; year <= contractTerm; year++) {
    const escalationMultiplier = Math.pow(1 + annualEscalation / 100, year - 1);
    const yearlyRate = baseRate * escalationMultiplier;
    
    rates.push({
      year,
      rate: yearlyRate.toFixed(2),
      amount: yearlyRate
    });
  }
  
  return rates;
};

export const calculateTotalContractValue = (
  ratedCapacity: number,
  yearlyRates: YearlyRate[]
): number => {
  const sumOfYearlyRates = yearlyRates.reduce((sum, rate) => sum + rate.amount, 0);
  return ratedCapacity * sumOfYearlyRates * 12; // Monthly billing
};

export const calculateMonthlyPayment = (
  ratedCapacity: number,
  yearlyRate: number
): number => {
  return (ratedCapacity * yearlyRate) / 12;
};

export const calculateEffectiveRate = (
  totalValue: number,
  capacity: number,
  termYears: number
): number => {
  return totalValue / (capacity * termYears * 12);
};

export const calculateSavings = (
  bloomRate: number,
  utilityRate: number,
  annualUsageKWh: number
): number => {
  return (utilityRate - bloomRate) * annualUsageKWh;
};

export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCurrencyDetailed = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (value: number, decimals = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatPercentage = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatCapacity = (kw: number): string => {
  if (kw >= 1000) {
    return `${(kw / 1000).toFixed(1)} MW`;
  }
  return `${kw} kW`;
};

// Bloom Energy specific business rules
export const validateCapacityMultiple = (capacity: number): boolean => {
  // Must be in multiples of 325 kW
  return capacity % 325 === 0;
};

export const getValidCapacityRange = (): { min: number; max: number } => {
  return { min: 325, max: 3900 }; // Based on Bloom Configurator specs
};

export const calculateMicrogridAdder = (
  solutionType: string,
  baseCapacity: number
): number => {
  const microgridTypes = ['Microgrid - Constrained', 'Microgrid - Unconstrained', 'MG', 'AMG'];
  
  if (!microgridTypes.includes(solutionType)) {
    return 0;
  }
  
  // Base microgrid adder calculation (simplified)
  const baseAdder = 8.0; // $/kW base adder
  const capacityMultiplier = Math.min(baseCapacity / 1000, 2); // Scale with capacity, cap at 2x
  
  return baseAdder * capacityMultiplier;
};

export const calculateThermalCycleFee = (capacity: number, usage: number): number => {
  // Base fee per kW based on expected thermal cycling
  const baseFeePerKW = 1.5;
  const usageFactor = Math.max(usage / 8760, 0.5); // Minimum 50% usage assumption
  
  return capacity * baseFeePerKW * usageFactor;
};

export const calculateROI = (
  totalSavings: number,
  totalInvestment: number,
  termYears: number
): {
  simple: number;
  annualized: number;
  paybackYears: number;
} => {
  const simple = (totalSavings / totalInvestment) * 100;
  const annualized = (Math.pow(totalSavings / totalInvestment, 1 / termYears) - 1) * 100;
  const paybackYears = totalInvestment / (totalSavings / termYears);
  
  return {
    simple,
    annualized,
    paybackYears
  };
};