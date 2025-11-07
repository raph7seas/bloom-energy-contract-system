/**
 * AI-Powered Contract Optimization Service
 * Provides intelligent suggestions and analysis for contract optimization
 */

import { ContractFormData } from '../types';
import { dataService } from './dataService';

export interface OptimizationSuggestion {
  id: string;
  type: 'financial' | 'system' | 'operating' | 'technical';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  currentValue: any;
  suggestedValue: any;
  reasoning: string;
  confidence: number;
  potentialSavings?: number;
  implementationEffort?: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface ContractAnalysis {
  overallScore: number;
  optimizationPotential: number;
  suggestions: OptimizationSuggestion[];
  strengths: string[];
  risks: string[];
  marketComparison: {
    percentile: number;
    benchmark: string;
  };
}

export interface LearnedPattern {
  id: string;
  category: string;
  pattern: any;
  frequency: number;
  confidence: number;
  lastSeen: string;
}

class AIOptimizationService {
  private readonly apiUrl: string;
  private cache: Map<string, ContractAnalysis> = new Map();
  private patterns: LearnedPattern[] = [];

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4003/api';
  }

  /**
   * Analyze contract and provide optimization suggestions
   */
  async analyzeContract(contractData: ContractFormData): Promise<ContractAnalysis> {
    try {
      const cacheKey = this.generateCacheKey(contractData);
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!;
      }

      // Try to get analysis from backend AI service
      const response = await fetch(`${this.apiUrl}/ai/analyze-contract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dataService.getAuthToken()}`
        },
        body: JSON.stringify({
          contractData,
          includeOptimizations: true,
          analysisDepth: 'comprehensive'
        })
      });

      if (response.ok) {
        const analysis = await response.json();
        this.cache.set(cacheKey, analysis);
        return analysis;
      }

      throw new Error('API analysis failed');

    } catch (error) {
      console.warn('AI analysis service unavailable, using local analysis:', error);
      return this.performLocalAnalysis(contractData);
    }
  }

  /**
   * Get smart suggestions based on form context
   */
  async getSmartSuggestions(
    contractData: Partial<ContractFormData>, 
    currentField?: string
  ): Promise<OptimizationSuggestion[]> {
    try {
      const response = await fetch(`${this.apiUrl}/ai/smart-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dataService.getAuthToken()}`
        },
        body: JSON.stringify({
          contractData,
          currentField,
          context: 'form_completion'
        })
      });

      if (response.ok) {
        const suggestions = await response.json();
        return suggestions.suggestions || [];
      }

      throw new Error('API suggestions failed');

    } catch (error) {
      console.warn('Smart suggestions service unavailable, using local patterns:', error);
      return this.generateLocalSuggestions(contractData, currentField);
    }
  }

  /**
   * Auto-fill form fields based on learned patterns and AI analysis
   */
  async autoFillSuggestions(
    contractData: Partial<ContractFormData>
  ): Promise<Partial<ContractFormData>> {
    try {
      const response = await fetch(`${this.apiUrl}/ai/auto-fill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dataService.getAuthToken()}`
        },
        body: JSON.stringify({
          contractData,
          confidence_threshold: 0.7
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.suggestedFields || {};
      }

      throw new Error('Auto-fill API failed');

    } catch (error) {
      console.warn('Auto-fill service unavailable, using pattern matching:', error);
      return this.performPatternBasedAutoFill(contractData);
    }
  }

  /**
   * Learn from contract patterns to improve future suggestions
   */
  async learnFromContract(contractData: ContractFormData): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/ai/learn-pattern`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dataService.getAuthToken()}`
        },
        body: JSON.stringify({
          contractData,
          action: 'contract_created',
          timestamp: new Date().toISOString()
        })
      });

      // Also store patterns locally
      this.extractAndStorePatterns(contractData);

    } catch (error) {
      console.warn('Pattern learning service unavailable, storing locally only:', error);
      this.extractAndStorePatterns(contractData);
    }
  }

  /**
   * Get market benchmarks and comparisons
   */
  async getMarketBenchmarks(contractData: Partial<ContractFormData>): Promise<{
    capacity: { min: number; max: number; average: number };
    rates: { min: number; max: number; average: number };
    terms: { common: number[]; recommended: number };
    escalation: { min: number; max: number; typical: number };
  }> {
    try {
      const response = await fetch(`${this.apiUrl}/ai/market-benchmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dataService.getAuthToken()}`
        },
        body: JSON.stringify({
          industry: contractData.industry || 'general',
          systemType: contractData.systemType || 'MG',
          capacity: contractData.ratedCapacity || 0
        })
      });

      if (response.ok) {
        return await response.json();
      }

      throw new Error('Benchmarks API failed');

    } catch (error) {
      console.warn('Market benchmarks service unavailable, using defaults:', error);
      return this.getDefaultBenchmarks();
    }
  }

  // Private helper methods

  private generateCacheKey(contractData: ContractFormData): string {
    const keyData = {
      customer: contractData.customerName,
      capacity: contractData.ratedCapacity,
      system: contractData.systemType,
      term: contractData.contractTerm,
      rate: contractData.baseRate
    };
    return btoa(JSON.stringify(keyData));
  }

  private async performLocalAnalysis(contractData: ContractFormData): Promise<ContractAnalysis> {
    const suggestions: OptimizationSuggestion[] = [];

    // Financial optimizations
    if (contractData.baseRate && contractData.baseRate > 0.12) {
      suggestions.push({
        id: 'fin_rate_high',
        type: 'financial',
        priority: 'high',
        title: 'Base Rate Optimization',
        description: 'Your base rate appears higher than market average',
        impact: 'Cost reduction of 15-20% annually',
        currentValue: contractData.baseRate,
        suggestedValue: 0.095,
        reasoning: 'Based on similar capacity contracts in your industry',
        confidence: 0.85,
        potentialSavings: Math.round((contractData.baseRate - 0.095) * (contractData.ratedCapacity || 0) * 8760 * 1000),
        implementationEffort: 'medium',
        createdAt: new Date().toISOString()
      });
    }

    // System configuration optimizations
    if (contractData.ratedCapacity && contractData.ratedCapacity % 325 !== 0) {
      suggestions.push({
        id: 'sys_capacity_align',
        type: 'system',
        priority: 'medium',
        title: 'Capacity Alignment',
        description: 'Consider aligning capacity to Bloom Energy standard units',
        impact: 'Better system efficiency and maintenance',
        currentValue: contractData.ratedCapacity,
        suggestedValue: Math.ceil((contractData.ratedCapacity || 0) / 325) * 325,
        reasoning: 'Bloom systems work optimally in 325kW increments',
        confidence: 0.9,
        implementationEffort: 'low',
        createdAt: new Date().toISOString()
      });
    }

    // Operating optimizations
    if (contractData.guaranteedCriticalOutput && contractData.ratedCapacity && 
        contractData.guaranteedCriticalOutput > contractData.ratedCapacity * 0.95) {
      suggestions.push({
        id: 'op_critical_realistic',
        type: 'operating',
        priority: 'medium',
        title: 'Critical Output Target',
        description: 'Critical output guarantee may be too ambitious',
        impact: 'Reduced penalty risk and more achievable targets',
        currentValue: contractData.guaranteedCriticalOutput,
        suggestedValue: Math.round((contractData.ratedCapacity || 0) * 0.92),
        reasoning: 'Industry best practice suggests 90-95% of rated capacity',
        confidence: 0.8,
        implementationEffort: 'low',
        createdAt: new Date().toISOString()
      });
    }

    const overallScore = this.calculateOverallScore(contractData, suggestions);

    return {
      overallScore,
      optimizationPotential: suggestions.length > 0 ? 25 + suggestions.length * 5 : 5,
      suggestions,
      strengths: this.identifyStrengths(contractData),
      risks: this.identifyRisks(contractData),
      marketComparison: {
        percentile: overallScore,
        benchmark: overallScore > 80 ? 'Excellent' : overallScore > 60 ? 'Good' : 'Needs Improvement'
      }
    };
  }

  private generateLocalSuggestions(
    contractData: Partial<ContractFormData>, 
    currentField?: string
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Context-aware suggestions based on current field
    if (currentField === 'baseRate' && contractData.industry) {
      const industryRates = this.getIndustryTypicalRates(contractData.industry);
      suggestions.push({
        id: 'rate_industry_avg',
        type: 'financial',
        priority: 'medium',
        title: `Typical ${contractData.industry} Rate`,
        description: `Consider industry average for ${contractData.industry}`,
        impact: 'Market-competitive pricing',
        currentValue: contractData.baseRate || 0,
        suggestedValue: industryRates.average,
        reasoning: `Based on ${contractData.industry} industry patterns`,
        confidence: 0.75,
        implementationEffort: 'low',
        createdAt: new Date().toISOString()
      });
    }

    return suggestions;
  }

  private performPatternBasedAutoFill(contractData: Partial<ContractFormData>): Partial<ContractFormData> {
    const suggestions: Partial<ContractFormData> = {};

    // Auto-fill based on industry patterns
    if (contractData.industry && !contractData.contractTerm) {
      const industryPatterns = this.getIndustryPatterns(contractData.industry);
      suggestions.contractTerm = industryPatterns.commonTerm;
    }

    // Auto-fill system type based on capacity
    if (contractData.ratedCapacity && !contractData.systemType) {
      suggestions.systemType = contractData.ratedCapacity > 1000 ? 'MG' : 'PP';
    }

    // Auto-fill escalation based on contract term
    if (contractData.contractTerm && !contractData.annualEscalation) {
      suggestions.annualEscalation = contractData.contractTerm > 15 ? 2.5 : 3.0;
    }

    return suggestions;
  }

  private extractAndStorePatterns(contractData: ContractFormData): void {
    // Extract patterns for future learning
    const pattern: LearnedPattern = {
      id: `pattern_${Date.now()}`,
      category: 'contract_configuration',
      pattern: {
        industry: contractData.industry,
        systemType: contractData.systemType,
        capacityRange: this.getCapacityRange(contractData.ratedCapacity || 0),
        termRange: this.getTermRange(contractData.contractTerm || 0),
        rateRange: this.getRateRange(contractData.baseRate || 0)
      },
      frequency: 1,
      confidence: 0.6,
      lastSeen: new Date().toISOString()
    };

    // Update or add pattern
    const existingIndex = this.patterns.findIndex(p => 
      p.category === pattern.category && 
      JSON.stringify(p.pattern) === JSON.stringify(pattern.pattern)
    );

    if (existingIndex >= 0) {
      this.patterns[existingIndex].frequency++;
      this.patterns[existingIndex].confidence = Math.min(0.95, this.patterns[existingIndex].confidence + 0.1);
      this.patterns[existingIndex].lastSeen = pattern.lastSeen;
    } else {
      this.patterns.push(pattern);
    }

    // Save to localStorage as backup
    localStorage.setItem('ai_learned_patterns', JSON.stringify(this.patterns));
  }

  private calculateOverallScore(contractData: ContractFormData, suggestions: OptimizationSuggestion[]): number {
    let score = 100;
    
    // Deduct points for high-priority issues
    suggestions.forEach(suggestion => {
      if (suggestion.priority === 'high') score -= 15;
      else if (suggestion.priority === 'medium') score -= 8;
      else score -= 3;
    });

    return Math.max(0, score);
  }

  private identifyStrengths(contractData: ContractFormData): string[] {
    const strengths: string[] = [];

    if (contractData.contractTerm && contractData.contractTerm >= 15) {
      strengths.push('Long-term contract provides stability');
    }

    if (contractData.baseRate && contractData.baseRate < 0.10) {
      strengths.push('Competitive base rate');
    }

    if (contractData.systemType === 'MG') {
      strengths.push('Microgrid configuration offers enhanced reliability');
    }

    return strengths;
  }

  private identifyRisks(contractData: ContractFormData): string[] {
    const risks: string[] = [];

    if (contractData.annualEscalation && contractData.annualEscalation > 4.0) {
      risks.push('High escalation rate may impact long-term costs');
    }

    if (contractData.contractTerm && contractData.contractTerm < 10) {
      risks.push('Short contract term may limit economic benefits');
    }

    return risks;
  }

  private getDefaultBenchmarks() {
    return {
      capacity: { min: 325, max: 3900, average: 1625 },
      rates: { min: 0.08, max: 0.15, average: 0.105 },
      terms: { common: [10, 15, 20], recommended: 15 },
      escalation: { min: 2.0, max: 4.5, typical: 2.5 }
    };
  }

  private getIndustryTypicalRates(industry: string): { min: number; average: number; max: number } {
    const industryRates: Record<string, { min: number; average: number; max: number }> = {
      'Healthcare': { min: 0.09, average: 0.11, max: 0.13 },
      'Manufacturing': { min: 0.08, average: 0.095, max: 0.12 },
      'Data Center': { min: 0.085, average: 0.10, max: 0.115 },
      'Retail': { min: 0.095, average: 0.11, max: 0.135 },
      'Education': { min: 0.09, average: 0.105, max: 0.125 }
    };

    return industryRates[industry] || { min: 0.08, average: 0.105, max: 0.15 };
  }

  private getIndustryPatterns(industry: string): { commonTerm: number; commonSystem: string } {
    const patterns: Record<string, { commonTerm: number; commonSystem: string }> = {
      'Healthcare': { commonTerm: 20, commonSystem: 'MG' },
      'Manufacturing': { commonTerm: 15, commonSystem: 'PP' },
      'Data Center': { commonTerm: 15, commonSystem: 'MG' },
      'Retail': { commonTerm: 10, commonSystem: 'PP' },
      'Education': { commonTerm: 20, commonSystem: 'MG' }
    };

    return patterns[industry] || { commonTerm: 15, commonSystem: 'MG' };
  }

  private getCapacityRange(capacity: number): string {
    if (capacity < 650) return 'small';
    if (capacity < 1300) return 'medium';
    if (capacity < 2600) return 'large';
    return 'enterprise';
  }

  private getTermRange(term: number): string {
    if (term < 10) return 'short';
    if (term < 15) return 'medium';
    return 'long';
  }

  private getRateRange(rate: number): string {
    if (rate < 0.09) return 'low';
    if (rate < 0.12) return 'medium';
    return 'high';
  }

  /**
   * Clear cached analyses
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cached patterns count for debugging
   */
  getPatternsCount(): number {
    return this.patterns.length;
  }
}

export const aiOptimizationService = new AIOptimizationService();
export default aiOptimizationService;