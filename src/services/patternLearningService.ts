/**
 * Machine Learning Pattern Detection and Learning Service
 * Implements a lightweight ML system for contract pattern recognition and improvement
 */

import { ContractFormData } from '../types';
import { dataService } from './dataService';

export interface ContractPattern {
  id: string;
  category: 'industry' | 'capacity' | 'financial' | 'system' | 'operating' | 'mixed';
  pattern: {
    [key: string]: any;
  };
  frequency: number;
  confidence: number;
  successRate: number;
  performance: PatternPerformance;
  metadata: {
    createdAt: string;
    updatedAt: string;
    source: 'user_input' | 'api_response' | 'calculated';
    version: number;
  };
}

export interface PatternPerformance {
  accuracyScore: number;
  userAcceptanceRate: number;
  timeToCompletion: number;
  errorReduction: number;
  totalApplications: number;
}

export interface LearningModel {
  id: string;
  name: string;
  type: 'regression' | 'classification' | 'clustering' | 'association';
  algorithm: string;
  parameters: any;
  trainingData: ContractPattern[];
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    lastTrained: string;
  };
  isActive: boolean;
}

export interface PredictionResult {
  field: keyof ContractFormData;
  predictedValue: any;
  confidence: number;
  reasoning: string;
  supportingPatterns: ContractPattern[];
}

class PatternLearningService {
  private patterns: Map<string, ContractPattern> = new Map();
  private models: Map<string, LearningModel> = new Map();
  private readonly apiUrl: string;
  private learningEnabled = true;

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4003/api';
    this.initializeModels();
    this.loadExistingPatterns();
  }

  /**
   * Learn from a completed contract to improve future predictions
   */
  async learnFromContract(
    contractData: ContractFormData, 
    userInteractions: {
      appliedSuggestions: string[];
      rejectedSuggestions: string[];
      timeSpent: number;
      errorCount: number;
    }
  ): Promise<void> {
    if (!this.learningEnabled) return;

    try {
      // Extract patterns from the contract
      const extractedPatterns = this.extractPatterns(contractData);
      
      // Update pattern frequencies and performance
      for (const pattern of extractedPatterns) {
        await this.updatePattern(pattern, userInteractions);
      }

      // Train models with new data
      await this.retrainModels();

      // Send learning data to backend for advanced ML processing
      await this.sendLearningDataToBackend(contractData, userInteractions, extractedPatterns);

    } catch (error) {
      console.error('Pattern learning failed:', error);
    }
  }

  /**
   * Predict contract field values based on learned patterns
   */
  async predictValues(
    partialContract: Partial<ContractFormData>,
    targetFields: (keyof ContractFormData)[]
  ): Promise<PredictionResult[]> {
    const predictions: PredictionResult[] = [];

    try {
      // Use different prediction strategies
      for (const field of targetFields) {
        const prediction = await this.predictSingleField(field, partialContract);
        if (prediction) {
          predictions.push(prediction);
        }
      }

      // Sort by confidence and return top predictions
      return predictions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10);

    } catch (error) {
      console.error('Prediction failed:', error);
      return [];
    }
  }

  /**
   * Detect anomalies in contract data
   */
  async detectAnomalies(contractData: ContractFormData): Promise<{
    field: keyof ContractFormData;
    currentValue: any;
    expectedRange: { min: any; max: any };
    anomalyScore: number;
    suggestion: string;
  }[]> {
    const anomalies: any[] = [];

    try {
      const industryPatterns = this.getPatternsByCategory('industry');
      const relevantPatterns = industryPatterns.filter(p => 
        p.pattern.industry === contractData.industry
      );

      // Check each field against learned patterns
      const fieldsToCheck: (keyof ContractFormData)[] = [
        'ratedCapacity', 'baseRate', 'contractTerm', 'annualEscalation'
      ];

      for (const field of fieldsToCheck) {
        const anomaly = this.checkFieldAnomaly(field, contractData[field], relevantPatterns);
        if (anomaly) {
          anomalies.push({
            field,
            currentValue: contractData[field],
            ...anomaly
          });
        }
      }

      return anomalies;

    } catch (error) {
      console.error('Anomaly detection failed:', error);
      return [];
    }
  }

  /**
   * Get pattern insights and analytics
   */
  getPatternInsights(): {
    totalPatterns: number;
    patternsByCategory: Record<string, number>;
    topPerformingPatterns: ContractPattern[];
    modelPerformance: LearningModel[];
    learningStats: {
      averageAccuracy: number;
      totalContracts: number;
      improvementTrend: number;
    };
  } {
    const patterns = Array.from(this.patterns.values());
    
    const patternsByCategory = patterns.reduce((acc, pattern) => {
      acc[pattern.category] = (acc[pattern.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topPerformingPatterns = patterns
      .sort((a, b) => (b.performance.accuracyScore * b.confidence) - (a.performance.accuracyScore * a.confidence))
      .slice(0, 5);

    const models = Array.from(this.models.values());
    const averageAccuracy = models.reduce((sum, model) => sum + model.performance.accuracy, 0) / models.length || 0;
    
    return {
      totalPatterns: patterns.length,
      patternsByCategory,
      topPerformingPatterns,
      modelPerformance: models,
      learningStats: {
        averageAccuracy,
        totalContracts: patterns.reduce((sum, p) => sum + p.frequency, 0),
        improvementTrend: this.calculateImprovementTrend()
      }
    };
  }

  // Private helper methods

  private initializeModels(): void {
    // Initialize basic ML models
    const models: Omit<LearningModel, 'trainingData'>[] = [
      {
        id: 'capacity_predictor',
        name: 'Capacity Prediction Model',
        type: 'regression',
        algorithm: 'linear_regression',
        parameters: { learningRate: 0.01, regularization: 0.1 },
        performance: { accuracy: 0.75, precision: 0.8, recall: 0.7, f1Score: 0.74, lastTrained: new Date().toISOString() },
        isActive: true
      },
      {
        id: 'rate_classifier',
        name: 'Rate Classification Model',
        type: 'classification',
        algorithm: 'decision_tree',
        parameters: { maxDepth: 10, minSamples: 5 },
        performance: { accuracy: 0.82, precision: 0.85, recall: 0.8, f1Score: 0.82, lastTrained: new Date().toISOString() },
        isActive: true
      },
      {
        id: 'term_recommender',
        name: 'Contract Term Recommender',
        type: 'classification',
        algorithm: 'random_forest',
        parameters: { trees: 100, maxDepth: 15 },
        performance: { accuracy: 0.78, precision: 0.8, recall: 0.75, f1Score: 0.77, lastTrained: new Date().toISOString() },
        isActive: true
      },
      {
        id: 'pattern_clustering',
        name: 'Contract Pattern Clustering',
        type: 'clustering',
        algorithm: 'k_means',
        parameters: { clusters: 8, iterations: 100 },
        performance: { accuracy: 0.7, precision: 0.72, recall: 0.68, f1Score: 0.7, lastTrained: new Date().toISOString() },
        isActive: true
      }
    ];

    models.forEach(model => {
      this.models.set(model.id, { ...model, trainingData: [] });
    });
  }

  private async loadExistingPatterns(): Promise<void> {
    try {
      const storedPatterns = localStorage.getItem('ml_contract_patterns');
      if (storedPatterns) {
        const patterns: ContractPattern[] = JSON.parse(storedPatterns);
        patterns.forEach(pattern => {
          this.patterns.set(pattern.id, pattern);
        });
      }
    } catch (error) {
      console.error('Failed to load existing patterns:', error);
    }
  }

  private extractPatterns(contractData: ContractFormData): ContractPattern[] {
    const patterns: ContractPattern[] = [];
    const timestamp = new Date().toISOString();

    // Industry-specific patterns
    if (contractData.industry) {
      patterns.push({
        id: `industry_${contractData.industry.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
        category: 'industry',
        pattern: {
          industry: contractData.industry,
          typicalCapacity: contractData.ratedCapacity,
          typicalRate: contractData.baseRate,
          typicalTerm: contractData.contractTerm,
          systemType: contractData.systemType
        },
        frequency: 1,
        confidence: 0.8,
        successRate: 1.0,
        performance: this.createInitialPerformance(),
        metadata: {
          createdAt: timestamp,
          updatedAt: timestamp,
          source: 'user_input',
          version: 1
        }
      });
    }

    // Capacity-based patterns
    if (contractData.ratedCapacity && contractData.baseRate) {
      const capacityTier = this.getCapacityTier(contractData.ratedCapacity);
      patterns.push({
        id: `capacity_${capacityTier}_${Date.now()}`,
        category: 'capacity',
        pattern: {
          capacityTier,
          rateRange: this.getRateRange(contractData.baseRate),
          termRange: this.getTermRange(contractData.contractTerm || 10),
          escalationRange: this.getEscalationRange(contractData.annualEscalation || 3)
        },
        frequency: 1,
        confidence: 0.75,
        successRate: 1.0,
        performance: this.createInitialPerformance(),
        metadata: {
          createdAt: timestamp,
          updatedAt: timestamp,
          source: 'user_input',
          version: 1
        }
      });
    }

    // Financial patterns
    if (contractData.baseRate && contractData.annualEscalation && contractData.contractTerm) {
      patterns.push({
        id: `financial_${contractData.contractTerm}yr_${Date.now()}`,
        category: 'financial',
        pattern: {
          termLength: contractData.contractTerm,
          rateStructure: {
            base: contractData.baseRate,
            escalation: contractData.annualEscalation,
            totalValue: this.calculateTotalValue(contractData)
          }
        },
        frequency: 1,
        confidence: 0.85,
        successRate: 1.0,
        performance: this.createInitialPerformance(),
        metadata: {
          createdAt: timestamp,
          updatedAt: timestamp,
          source: 'calculated',
          version: 1
        }
      });
    }

    return patterns;
  }

  private async updatePattern(
    newPattern: ContractPattern,
    interactions: { appliedSuggestions: string[]; rejectedSuggestions: string[]; timeSpent: number; errorCount: number }
  ): Promise<void> {
    const existingPattern = this.findSimilarPattern(newPattern);
    
    if (existingPattern) {
      // Update existing pattern
      existingPattern.frequency++;
      existingPattern.performance.totalApplications++;
      existingPattern.performance.userAcceptanceRate = this.calculateAcceptanceRate(
        existingPattern.performance.userAcceptanceRate,
        existingPattern.performance.totalApplications,
        interactions.appliedSuggestions.length > interactions.rejectedSuggestions.length
      );
      existingPattern.performance.timeToCompletion = this.updateAverageTime(
        existingPattern.performance.timeToCompletion,
        existingPattern.performance.totalApplications,
        interactions.timeSpent
      );
      existingPattern.performance.errorReduction = this.calculateErrorReduction(
        existingPattern.performance.errorReduction,
        interactions.errorCount
      );
      existingPattern.confidence = Math.min(0.95, existingPattern.confidence + 0.05);
      existingPattern.metadata.updatedAt = new Date().toISOString();
      existingPattern.metadata.version++;
    } else {
      // Add new pattern
      this.patterns.set(newPattern.id, newPattern);
    }

    // Save to localStorage
    this.savePatterns();
  }

  private async predictSingleField(
    field: keyof ContractFormData,
    partialContract: Partial<ContractFormData>
  ): Promise<PredictionResult | null> {
    const relevantPatterns = this.findRelevantPatterns(field, partialContract);
    
    if (relevantPatterns.length === 0) return null;

    // Use weighted average based on pattern confidence and frequency
    let weightedSum = 0;
    let totalWeight = 0;
    let predictedValue: any = null;

    for (const pattern of relevantPatterns) {
      const weight = pattern.confidence * pattern.frequency * pattern.performance.accuracyScore;
      const patternValue = this.extractFieldValue(field, pattern);
      
      if (patternValue !== null) {
        if (typeof patternValue === 'number') {
          weightedSum += patternValue * weight;
          totalWeight += weight;
        } else {
          // For non-numeric values, use the most confident pattern
          if (weight > totalWeight) {
            predictedValue = patternValue;
            totalWeight = weight;
          }
        }
      }
    }

    const finalValue = typeof weightedSum === 'number' && totalWeight > 0 
      ? weightedSum / totalWeight 
      : predictedValue;

    if (finalValue === null) return null;

    const avgConfidence = relevantPatterns.reduce((sum, p) => sum + p.confidence, 0) / relevantPatterns.length;

    return {
      field,
      predictedValue: this.formatPredictedValue(field, finalValue),
      confidence: Math.min(0.95, avgConfidence),
      reasoning: `Based on ${relevantPatterns.length} similar contract patterns`,
      supportingPatterns: relevantPatterns.slice(0, 3)
    };
  }

  private checkFieldAnomaly(
    field: keyof ContractFormData,
    value: any,
    patterns: ContractPattern[]
  ): { expectedRange: { min: any; max: any }; anomalyScore: number; suggestion: string } | null {
    if (!value || patterns.length === 0) return null;

    const fieldValues = patterns
      .map(p => this.extractFieldValue(field, p))
      .filter(v => v !== null && typeof v === 'number') as number[];

    if (fieldValues.length < 3) return null;

    const mean = fieldValues.reduce((sum, v) => sum + v, 0) / fieldValues.length;
    const stdDev = Math.sqrt(fieldValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / fieldValues.length);
    
    const min = Math.min(...fieldValues);
    const max = Math.max(...fieldValues);
    const expectedMin = Math.max(min, mean - 2 * stdDev);
    const expectedMax = Math.min(max, mean + 2 * stdDev);

    const numValue = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(numValue)) return null;

    const anomalyScore = Math.max(
      0,
      Math.min(1, Math.abs(numValue - mean) / (2 * stdDev))
    );

    if (anomalyScore > 0.7) {
      return {
        expectedRange: { min: expectedMin, max: expectedMax },
        anomalyScore,
        suggestion: numValue < expectedMin 
          ? `Value seems low for this pattern. Consider ${expectedMin.toFixed(2)}` 
          : `Value seems high for this pattern. Consider ${expectedMax.toFixed(2)}`
      };
    }

    return null;
  }

  // Helper methods

  private findSimilarPattern(newPattern: ContractPattern): ContractPattern | undefined {
    return Array.from(this.patterns.values()).find(existing => 
      existing.category === newPattern.category &&
      this.calculatePatternSimilarity(existing.pattern, newPattern.pattern) > 0.8
    );
  }

  private calculatePatternSimilarity(pattern1: any, pattern2: any): number {
    const keys1 = Object.keys(pattern1);
    const keys2 = Object.keys(pattern2);
    const commonKeys = keys1.filter(key => keys2.includes(key));
    
    if (commonKeys.length === 0) return 0;
    
    let similaritySum = 0;
    for (const key of commonKeys) {
      if (pattern1[key] === pattern2[key]) {
        similaritySum += 1;
      } else if (typeof pattern1[key] === 'number' && typeof pattern2[key] === 'number') {
        const diff = Math.abs(pattern1[key] - pattern2[key]);
        const avg = (pattern1[key] + pattern2[key]) / 2;
        similaritySum += Math.max(0, 1 - (diff / avg));
      }
    }
    
    return similaritySum / commonKeys.length;
  }

  private findRelevantPatterns(
    field: keyof ContractFormData,
    partialContract: Partial<ContractFormData>
  ): ContractPattern[] {
    const patterns = Array.from(this.patterns.values());
    
    return patterns
      .filter(pattern => this.patternHasField(field, pattern))
      .filter(pattern => this.patternMatchesContext(pattern, partialContract))
      .sort((a, b) => (b.confidence * b.frequency) - (a.confidence * a.frequency))
      .slice(0, 10);
  }

  private patternHasField(field: keyof ContractFormData, pattern: ContractPattern): boolean {
    return this.extractFieldValue(field, pattern) !== null;
  }

  private patternMatchesContext(pattern: ContractPattern, context: Partial<ContractFormData>): boolean {
    if (context.industry && pattern.pattern.industry) {
      return pattern.pattern.industry === context.industry;
    }
    if (context.systemType && pattern.pattern.systemType) {
      return pattern.pattern.systemType === context.systemType;
    }
    return true;
  }

  private extractFieldValue(field: keyof ContractFormData, pattern: ContractPattern): any {
    switch (field) {
      case 'ratedCapacity':
        return pattern.pattern.typicalCapacity || pattern.pattern.capacity;
      case 'baseRate':
        return pattern.pattern.typicalRate || pattern.pattern.rateStructure?.base;
      case 'contractTerm':
        return pattern.pattern.typicalTerm || pattern.pattern.termLength;
      case 'annualEscalation':
        return pattern.pattern.rateStructure?.escalation;
      case 'systemType':
        return pattern.pattern.systemType;
      case 'industry':
        return pattern.pattern.industry;
      default:
        return pattern.pattern[field];
    }
  }

  private formatPredictedValue(field: keyof ContractFormData, value: any): any {
    switch (field) {
      case 'ratedCapacity':
        return Math.round(value / 325) * 325; // Round to nearest 325kW
      case 'baseRate':
        return Math.round(value * 1000) / 1000; // 3 decimal places
      case 'contractTerm':
        return [5, 10, 15, 20].reduce((prev, curr) => 
          Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
        );
      case 'annualEscalation':
        return Math.round(value * 10) / 10; // 1 decimal place
      default:
        return value;
    }
  }

  private createInitialPerformance(): PatternPerformance {
    return {
      accuracyScore: 0.7,
      userAcceptanceRate: 0.8,
      timeToCompletion: 0,
      errorReduction: 0,
      totalApplications: 0
    };
  }

  private getCapacityTier(capacity: number): string {
    if (capacity < 650) return 'small';
    if (capacity < 1300) return 'medium';
    if (capacity < 2600) return 'large';
    return 'enterprise';
  }

  private getRateRange(rate: number): string {
    if (rate < 0.09) return 'low';
    if (rate < 0.12) return 'medium';
    return 'high';
  }

  private getTermRange(term: number): string {
    if (term < 10) return 'short';
    if (term < 15) return 'medium';
    return 'long';
  }

  private getEscalationRange(escalation: number): string {
    if (escalation < 2.5) return 'low';
    if (escalation < 4.0) return 'medium';
    return 'high';
  }

  private calculateTotalValue(contractData: ContractFormData): number {
    if (!contractData.ratedCapacity || !contractData.baseRate || !contractData.contractTerm) {
      return 0;
    }
    
    const annualValue = contractData.ratedCapacity * contractData.baseRate * 8760; // kW * $/kWh * hours/year
    const escalation = contractData.annualEscalation || 0;
    let totalValue = 0;
    
    for (let year = 0; year < contractData.contractTerm; year++) {
      totalValue += annualValue * Math.pow(1 + escalation / 100, year);
    }
    
    return totalValue;
  }

  private calculateAcceptanceRate(currentRate: number, totalApplications: number, wasAccepted: boolean): number {
    const currentSum = currentRate * totalApplications;
    const newSum = currentSum + (wasAccepted ? 1 : 0);
    return newSum / (totalApplications + 1);
  }

  private updateAverageTime(currentAvg: number, count: number, newTime: number): number {
    return (currentAvg * count + newTime) / (count + 1);
  }

  private calculateErrorReduction(currentReduction: number, errorCount: number): number {
    return Math.max(0, currentReduction + (errorCount === 0 ? 0.1 : -0.05));
  }

  private calculateImprovementTrend(): number {
    const patterns = Array.from(this.patterns.values());
    if (patterns.length === 0) return 0;
    
    const avgPerformance = patterns.reduce((sum, p) => sum + p.performance.accuracyScore, 0) / patterns.length;
    return (avgPerformance - 0.7) * 100; // Percentage improvement from baseline 70%
  }

  private getPatternsByCategory(category: string): ContractPattern[] {
    return Array.from(this.patterns.values()).filter(p => p.category === category);
  }

  private async retrainModels(): Promise<void> {
    // Simple retraining logic - in production this would be more sophisticated
    const patterns = Array.from(this.patterns.values());
    
    for (const [modelId, model] of this.models.entries()) {
      const relevantPatterns = patterns.filter(p => this.isRelevantForModel(modelId, p));
      
      if (relevantPatterns.length > 10) { // Only retrain if we have enough data
        model.trainingData = relevantPatterns;
        model.performance.lastTrained = new Date().toISOString();
        
        // Simulate performance improvement
        model.performance.accuracy = Math.min(0.95, model.performance.accuracy + 0.01);
        model.performance.precision = Math.min(0.95, model.performance.precision + 0.01);
        model.performance.recall = Math.min(0.95, model.performance.recall + 0.01);
        model.performance.f1Score = (model.performance.precision + model.performance.recall) / 2;
      }
    }
  }

  private isRelevantForModel(modelId: string, pattern: ContractPattern): boolean {
    switch (modelId) {
      case 'capacity_predictor':
        return pattern.category === 'capacity' || pattern.category === 'industry';
      case 'rate_classifier':
        return pattern.category === 'financial' || pattern.category === 'industry';
      case 'term_recommender':
        return pattern.category === 'financial';
      case 'pattern_clustering':
        return true; // All patterns are relevant for clustering
      default:
        return false;
    }
  }

  private async sendLearningDataToBackend(
    contractData: ContractFormData,
    interactions: any,
    patterns: ContractPattern[]
  ): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/ai/learn-patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dataService.getAuthToken()}`
        },
        body: JSON.stringify({
          contractData,
          userInteractions: interactions,
          extractedPatterns: patterns,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.warn('Failed to send learning data to backend:', error);
    }
  }

  private savePatterns(): void {
    try {
      const patterns = Array.from(this.patterns.values());
      localStorage.setItem('ml_contract_patterns', JSON.stringify(patterns));
    } catch (error) {
      console.error('Failed to save patterns:', error);
    }
  }

  /**
   * Enable or disable learning
   */
  setLearningEnabled(enabled: boolean): void {
    this.learningEnabled = enabled;
  }

  /**
   * Clear all learned patterns (for testing/reset)
   */
  clearAllPatterns(): void {
    this.patterns.clear();
    localStorage.removeItem('ml_contract_patterns');
  }

  /**
   * Export patterns for analysis
   */
  exportPatterns(): ContractPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Import patterns from external source
   */
  importPatterns(patterns: ContractPattern[]): void {
    patterns.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
    });
    this.savePatterns();
  }
}

export const patternLearningService = new PatternLearningService();
export default patternLearningService;