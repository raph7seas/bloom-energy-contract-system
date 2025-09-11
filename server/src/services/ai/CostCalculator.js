/**
 * Cost Calculator Engine
 * Real-time pricing calculator for AI model usage across providers
 */
export class CostCalculator {
  constructor(modelRegistry) {
    this.modelRegistry = modelRegistry;
    this.pricingCache = new Map();
    this.usageHistory = [];
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Calculate cost for a specific request
   * @param {string} modelId - Model identifier (provider:model)
   * @param {number} inputTokens - Number of input tokens
   * @param {number} outputTokens - Number of output tokens
   * @returns {Object} Detailed cost breakdown
   */
  calculateRequestCost(modelId, inputTokens, outputTokens) {
    const model = this.modelRegistry.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const inputCost = (inputTokens / 1000000) * model.pricing.input;
    const outputCost = (outputTokens / 1000000) * model.pricing.output;
    const totalCost = inputCost + outputCost;
    const totalTokens = inputTokens + outputTokens;

    return {
      modelId: model.id,
      modelName: model.name,
      provider: model.providerId,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: totalTokens
      },
      costs: {
        input: inputCost,
        output: outputCost,
        total: totalCost,
        perToken: totalTokens > 0 ? totalCost / totalTokens : 0,
        per1kTokens: totalTokens > 0 ? (totalCost * 1000) / totalTokens : 0
      },
      pricing: {
        inputRate: model.pricing.input,
        outputRate: model.pricing.output,
        unit: 'per 1M tokens'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Estimate costs for different text lengths
   * @param {string} modelId - Model identifier
   * @param {Array} textLengths - Array of text lengths to estimate
   * @param {Object} options - Options for estimation
   * @returns {Object} Cost estimates for different scenarios
   */
  estimateCostsByLength(modelId, textLengths = [1000, 5000, 10000, 50000], options = {}) {
    const model = this.modelRegistry.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const provider = this.modelRegistry.providers.get(model.providerId);
    const outputTokenRatio = options.outputRatio || 0.3; // Default 30% output vs input

    return {
      modelId: model.id,
      modelName: model.name,
      provider: model.providerId,
      scenarios: textLengths.map(textLength => {
        const inputTokens = provider.estimateTokens('x'.repeat(textLength), model.id);
        const outputTokens = Math.round(inputTokens * outputTokenRatio);
        const cost = this.calculateRequestCost(modelId, inputTokens, outputTokens);

        return {
          textLength,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost: cost.costs.total,
          costBreakdown: cost.costs
        };
      }),
      assumptions: {
        outputRatio,
        tokenEstimation: `~${provider.name} tokenization`
      }
    };
  }

  /**
   * Compare costs across multiple models
   * @param {Array} modelIds - Array of model identifiers
   * @param {number} inputTokens - Number of input tokens
   * @param {number} outputTokens - Number of output tokens
   * @returns {Object} Cost comparison data
   */
  compareModelCosts(modelIds, inputTokens, outputTokens) {
    const comparisons = modelIds.map(modelId => {
      try {
        return this.calculateRequestCost(modelId, inputTokens, outputTokens);
      } catch (error) {
        return {
          modelId,
          error: error.message
        };
      }
    }).filter(result => !result.error);

    if (comparisons.length === 0) {
      throw new Error('No valid models for comparison');
    }

    // Sort by cost (lowest first)
    comparisons.sort((a, b) => a.costs.total - b.costs.total);

    const cheapest = comparisons[0];
    const mostExpensive = comparisons[comparisons.length - 1];
    const savings = mostExpensive.costs.total - cheapest.costs.total;
    const savingsPercentage = mostExpensive.costs.total > 0 ? 
      (savings / mostExpensive.costs.total) * 100 : 0;

    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      comparisons,
      analysis: {
        cheapest: {
          model: cheapest.modelId,
          provider: cheapest.provider,
          cost: cheapest.costs.total
        },
        mostExpensive: {
          model: mostExpensive.modelId,
          provider: mostExpensive.provider,
          cost: mostExpensive.costs.total
        },
        savings: {
          amount: savings,
          percentage: savingsPercentage
        },
        costRange: {
          min: cheapest.costs.total,
          max: mostExpensive.costs.total,
          median: this._calculateMedian(comparisons.map(c => c.costs.total))
        }
      },
      recommendations: this._generateCostRecommendations(comparisons)
    };
  }

  /**
   * Calculate monthly cost projections
   * @param {string} modelId - Model identifier
   * @param {Object} usage - Usage patterns
   * @returns {Object} Monthly cost projection
   */
  calculateMonthlyProjection(modelId, usage) {
    const {
      requestsPerDay = 100,
      averageInputTokens = 1000,
      averageOutputTokens = 500,
      workingDaysPerMonth = 22
    } = usage;

    const dailyCost = this.calculateRequestCost(
      modelId, 
      averageInputTokens, 
      averageOutputTokens
    );

    const totalDailyRequests = requestsPerDay;
    const dailyTotalCost = dailyCost.costs.total * totalDailyRequests;
    const monthlyTotalCost = dailyTotalCost * workingDaysPerMonth;
    
    const monthlyTokens = {
      input: averageInputTokens * totalDailyRequests * workingDaysPerMonth,
      output: averageOutputTokens * totalDailyRequests * workingDaysPerMonth,
      total: (averageInputTokens + averageOutputTokens) * totalDailyRequests * workingDaysPerMonth
    };

    return {
      modelId: dailyCost.modelId,
      modelName: dailyCost.modelName,
      provider: dailyCost.provider,
      assumptions: {
        requestsPerDay,
        averageInputTokens,
        averageOutputTokens,
        workingDaysPerMonth
      },
      daily: {
        requests: totalDailyRequests,
        cost: dailyTotalCost,
        tokens: {
          input: averageInputTokens * totalDailyRequests,
          output: averageOutputTokens * totalDailyRequests,
          total: (averageInputTokens + averageOutputTokens) * totalDailyRequests
        }
      },
      monthly: {
        requests: totalDailyRequests * workingDaysPerMonth,
        cost: monthlyTotalCost,
        tokens: monthlyTokens,
        breakdown: {
          inputCost: (monthlyTokens.input / 1000000) * dailyCost.pricing.inputRate,
          outputCost: (monthlyTokens.output / 1000000) * dailyCost.pricing.outputRate
        }
      },
      costBreakdown: {
        perRequest: dailyCost.costs.total,
        perDay: dailyTotalCost,
        perMonth: monthlyTotalCost,
        perToken: dailyCost.costs.perToken
      }
    };
  }

  /**
   * Analyze cost efficiency across models for different use cases
   * @param {Array} modelIds - Models to analyze
   * @param {Object} useCases - Different use case scenarios
   * @returns {Object} Efficiency analysis
   */
  analyzeCostEfficiency(modelIds, useCases = {}) {
    const defaultUseCases = {
      quickChat: { input: 200, output: 150, priority: 'speed' },
      analysis: { input: 2000, output: 1000, priority: 'quality' },
      optimization: { input: 1500, output: 800, priority: 'balance' },
      longDocument: { input: 10000, output: 2000, priority: 'cost' }
    };

    const scenarios = { ...defaultUseCases, ...useCases };
    const results = {};

    Object.entries(scenarios).forEach(([useCase, config]) => {
      const comparison = this.compareModelCosts(
        modelIds, 
        config.input, 
        config.output
      );

      // Apply priority-based scoring
      const scoredModels = comparison.comparisons.map(model => {
        const modelInfo = this.modelRegistry.models.get(
          `${model.provider}:${model.modelId}`
        );
        
        let score = 0;
        
        // Cost score (lower is better, normalized 0-10)
        const costScore = this._normalizeScore(
          model.costs.total, 
          comparison.analysis.costRange.min, 
          comparison.analysis.costRange.max, 
          true
        );
        
        // Speed score based on model speed rating
        const speedScores = { very_fast: 10, fast: 7, medium: 5, slow: 2 };
        const speedScore = speedScores[modelInfo?.speed] || 5;
        
        // Quality score based on model quality rating
        const qualityScores = { exceptional: 10, outstanding: 8, excellent: 6, very_good: 4, good: 2 };
        const qualityScore = qualityScores[modelInfo?.quality] || 5;

        // Apply priority weighting
        switch (config.priority) {
          case 'speed':
            score = speedScore * 0.5 + costScore * 0.3 + qualityScore * 0.2;
            break;
          case 'quality':
            score = qualityScore * 0.5 + speedScore * 0.2 + costScore * 0.3;
            break;
          case 'cost':
            score = costScore * 0.6 + speedScore * 0.2 + qualityScore * 0.2;
            break;
          case 'balance':
          default:
            score = (costScore + speedScore + qualityScore) / 3;
            break;
        }

        return {
          ...model,
          efficiency: {
            score: parseFloat(score.toFixed(2)),
            costScore: parseFloat(costScore.toFixed(2)),
            speedScore,
            qualityScore,
            priority: config.priority
          }
        };
      });

      // Sort by efficiency score (highest first)
      scoredModels.sort((a, b) => b.efficiency.score - a.efficiency.score);

      results[useCase] = {
        scenario: config,
        models: scoredModels,
        recommended: scoredModels[0],
        alternatives: scoredModels.slice(1, 3)
      };
    });

    return {
      analysis: results,
      summary: this._generateEfficiencySummary(results),
      methodology: {
        scoring: 'Weighted combination of cost, speed, and quality',
        priorities: 'Speed (response time), Quality (output quality), Cost (financial efficiency), Balance (equal weighting)'
      }
    };
  }

  /**
   * Track usage and costs over time
   * @param {Object} usage - Usage record
   */
  recordUsage(usage) {
    const record = {
      ...usage,
      timestamp: new Date().toISOString(),
      id: this._generateUsageId()
    };

    this.usageHistory.push(record);

    // Keep only last 1000 records to prevent memory issues
    if (this.usageHistory.length > 1000) {
      this.usageHistory = this.usageHistory.slice(-1000);
    }
  }

  /**
   * Get usage analytics
   * @param {Object} filters - Time and model filters
   * @returns {Object} Usage analytics
   */
  getUsageAnalytics(filters = {}) {
    let filteredUsage = [...this.usageHistory];

    // Apply time filter
    if (filters.since) {
      const since = new Date(filters.since);
      filteredUsage = filteredUsage.filter(usage => 
        new Date(usage.timestamp) >= since
      );
    }

    // Apply model filter
    if (filters.modelId) {
      filteredUsage = filteredUsage.filter(usage => 
        usage.modelId === filters.modelId
      );
    }

    // Apply provider filter
    if (filters.provider) {
      filteredUsage = filteredUsage.filter(usage => 
        usage.provider === filters.provider
      );
    }

    const totalUsage = filteredUsage.reduce((acc, usage) => {
      acc.requests++;
      acc.inputTokens += usage.inputTokens || 0;
      acc.outputTokens += usage.outputTokens || 0;
      acc.totalCost += usage.cost || 0;
      return acc;
    }, { requests: 0, inputTokens: 0, outputTokens: 0, totalCost: 0 });

    const modelBreakdown = this._groupBy(filteredUsage, 'modelId');
    const providerBreakdown = this._groupBy(filteredUsage, 'provider');

    return {
      period: {
        start: filteredUsage[0]?.timestamp,
        end: filteredUsage[filteredUsage.length - 1]?.timestamp,
        duration: filteredUsage.length > 0 ? 
          new Date(filteredUsage[filteredUsage.length - 1].timestamp) - 
          new Date(filteredUsage[0].timestamp) : 0
      },
      total: totalUsage,
      averages: {
        costPerRequest: totalUsage.requests > 0 ? totalUsage.totalCost / totalUsage.requests : 0,
        tokensPerRequest: totalUsage.requests > 0 ? 
          (totalUsage.inputTokens + totalUsage.outputTokens) / totalUsage.requests : 0,
        requestsPerDay: this._calculateDailyAverage(filteredUsage)
      },
      breakdowns: {
        byModel: Object.entries(modelBreakdown).map(([modelId, usages]) => ({
          modelId,
          requests: usages.length,
          totalCost: usages.reduce((sum, u) => sum + (u.cost || 0), 0),
          totalTokens: usages.reduce((sum, u) => sum + (u.inputTokens || 0) + (u.outputTokens || 0), 0)
        })),
        byProvider: Object.entries(providerBreakdown).map(([provider, usages]) => ({
          provider,
          requests: usages.length,
          totalCost: usages.reduce((sum, u) => sum + (u.cost || 0), 0),
          totalTokens: usages.reduce((sum, u) => sum + (u.inputTokens || 0) + (u.outputTokens || 0), 0)
        }))
      }
    };
  }

  // Private helper methods
  _calculateMedian(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? 
      sorted[mid] : 
      (sorted[mid - 1] + sorted[mid]) / 2;
  }

  _normalizeScore(value, min, max, inverse = false) {
    if (max === min) return 5; // Default middle score if no range
    const normalized = (value - min) / (max - min);
    const score = inverse ? (1 - normalized) * 10 : normalized * 10;
    return Math.max(0, Math.min(10, score));
  }

  _generateCostRecommendations(comparisons) {
    const recommendations = [];

    // Budget recommendation
    const budgetFriendly = comparisons.filter(c => c.costs.total < 0.01);
    if (budgetFriendly.length > 0) {
      recommendations.push({
        type: 'budget',
        title: 'Budget-Friendly Options',
        models: budgetFriendly.slice(0, 2).map(c => c.modelId),
        reason: 'Cost under $0.01 per request'
      });
    }

    // Premium recommendation
    const premium = comparisons.filter(c => 
      this.modelRegistry.models.get(`${c.provider}:${c.modelId}`)?.quality === 'exceptional'
    );
    if (premium.length > 0) {
      recommendations.push({
        type: 'premium',
        title: 'Premium Quality',
        models: premium.slice(0, 2).map(c => c.modelId),
        reason: 'Highest quality models for critical tasks'
      });
    }

    // Balanced recommendation
    const balanced = comparisons.slice(Math.floor(comparisons.length / 4), Math.floor(3 * comparisons.length / 4));
    if (balanced.length > 0) {
      recommendations.push({
        type: 'balanced',
        title: 'Balanced Choice',
        models: balanced.slice(0, 2).map(c => c.modelId),
        reason: 'Good balance of cost and capability'
      });
    }

    return recommendations;
  }

  _generateEfficiencySummary(results) {
    const summary = {
      bestOverall: null,
      bestValue: null,
      mostVersatile: null,
      providerComparison: {}
    };

    // Count wins for each model across use cases
    const modelWins = {};
    const modelAppearances = {};

    Object.values(results).forEach(useCase => {
      const winner = useCase.recommended;
      const modelKey = `${winner.provider}:${winner.modelId}`;
      
      modelWins[modelKey] = (modelWins[modelKey] || 0) + 1;
      
      useCase.models.forEach(model => {
        const key = `${model.provider}:${model.modelId}`;
        modelAppearances[key] = (modelAppearances[key] || 0) + 1;
      });
    });

    // Find best overall (most wins)
    const bestOverallKey = Object.keys(modelWins).reduce((a, b) => 
      modelWins[a] > modelWins[b] ? a : b, Object.keys(modelWins)[0]
    );
    summary.bestOverall = bestOverallKey;

    // Find most versatile (appears in most use cases)
    const mostVersatileKey = Object.keys(modelAppearances).reduce((a, b) => 
      modelAppearances[a] > modelAppearances[b] ? a : b, Object.keys(modelAppearances)[0]
    );
    summary.mostVersatile = mostVersatileKey;

    return summary;
  }

  _groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key];
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
      return groups;
    }, {});
  }

  _calculateDailyAverage(usage) {
    if (usage.length < 2) return 0;
    
    const start = new Date(usage[0].timestamp);
    const end = new Date(usage[usage.length - 1].timestamp);
    const days = (end - start) / (1000 * 60 * 60 * 24);
    
    return days > 0 ? usage.length / days : 0;
  }

  _generateUsageId() {
    return `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}