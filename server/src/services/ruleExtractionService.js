class RuleExtractionService {
  constructor(prisma) {
    this.prisma = prisma;
    
    // Pre-defined patterns for contract rule extraction
    this.extractionPatterns = {
      financial: {
        baseRate: {
          patterns: [
            /base\s*rate\s*(?:of\s*)?[$]?([\d.,]+)(?:\s*per\s*kwh|\s*\/kwh)?/gi,
            /rate\s*[:=]\s*[$]?([\d.,]+)(?:\s*per\s*kwh|\s*\/kwh)?/gi,
            /[$]([\d.,]+)\s*per\s*kwh/gi
          ],
          type: 'RANGE',
          category: 'financial'
        },
        escalation: {
          patterns: [
            /escalation\s*(?:rate\s*)?(?:of\s*)?(\d+(?:\.\d+)?)%?/gi,
            /annual\s*escalation\s*(?:of\s*)?(\d+(?:\.\d+)?)%?/gi,
            /(?:increase\s*(?:of\s*)?)?(\d+(?:\.\d+)?)%?\s*(?:per\s*)?(?:year|annually)/gi
          ],
          type: 'RANGE',
          category: 'financial'
        },
        term: {
          patterns: [
            /term\s*(?:of\s*)?(\d+)\s*years?/gi,
            /(\d+)\s*year\s*(?:contract|agreement|term)/gi,
            /contract\s*(?:term\s*)?(?:of\s*)?(\d+)\s*years?/gi
          ],
          type: 'RANGE',
          category: 'financial'
        }
      },
      technical: {
        capacity: {
          patterns: [
            /capacity\s*(?:of\s*)?(\d+(?:,\d+)?)\s*kw/gi,
            /(\d+(?:,\d+)?)\s*kw\s*(?:capacity|system)/gi,
            /rated\s*(?:capacity\s*)?(?:of\s*)?(\d+(?:,\d+)?)\s*kw/gi
          ],
          type: 'RANGE',
          category: 'technical'
        },
        voltage: {
          patterns: [
            /voltage\s*(?:of\s*|:|=)\s*(\d+(?:\.\d+)?)\s*kv/gi,
            /(\d+(?:\.\d+)?)\s*kv\s*voltage/gi,
            /(\d+)\s*v(?:olt)?(?:\s*voltage)?/gi
          ],
          type: 'ENUM',
          category: 'technical'
        },
        components: {
          patterns: [
            /components?\s*(?:include|:)\s*([^.]*)/gi,
            /(?:with|including)\s*(ri|ac|uc|bess|solar|wind)(?:\s*and\s*(ri|ac|uc|bess|solar|wind))*/gi
          ],
          type: 'ENUM',
          category: 'technical'
        }
      },
      operating: {
        efficiency: {
          patterns: [
            /efficiency\s*(?:of\s*)?(\d+(?:\.\d+)?)%?/gi,
            /(\d+(?:\.\d+)?)%?\s*efficiency/gi,
            /operating\s*efficiency\s*(?:of\s*)?(\d+(?:\.\d+)?)%?/gi
          ],
          type: 'RANGE',
          category: 'operating'
        },
        outputWarranty: {
          patterns: [
            /output\s*warranty\s*(?:of\s*)?(\d+(?:\.\d+)?)%?/gi,
            /warranty\s*(?:of\s*)?(\d+(?:\.\d+)?)%?\s*output/gi,
            /guaranteed\s*output\s*(?:of\s*)?(\d+(?:\.\d+)?)%?/gi
          ],
          type: 'RANGE',
          category: 'operating'
        }
      },
      system: {
        type: {
          patterns: [
            /(power\s*purchase\s*(?:standard|with\s*battery)?|microgrid\s*(?:constrained|unconstrained)?|pp|mg|amg|og)/gi,
            /system\s*type\s*(?::|=)\s*(power\s*purchase\s*(?:standard|with\s*battery)?|microgrid\s*(?:constrained|unconstrained)?|pp|mg|amg|og)/gi
          ],
          type: 'ENUM',
          category: 'system'
        }
      }
    };

    // Confidence thresholds for rule acceptance
    this.confidenceThresholds = {
      high: 0.8,
      medium: 0.6,
      low: 0.4
    };
  }

  async extractRulesFromContract(contractId) {
    try {
      const contract = await this.prisma.contract.findUnique({
        where: { id: contractId },
        include: {
          financial: true,
          technical: true,
          operating: true,
          uploads: {
            where: {
              extractedData: { not: null }
            }
          }
        }
      });

      if (!contract) {
        throw new Error('Contract not found');
      }

      const extractedRules = [];
      const textSources = [];

      // Collect text from uploaded documents
      if (contract.uploads?.length > 0) {
        for (const upload of contract.uploads) {
          if (upload.extractedData?.content?.text) {
            textSources.push({
              source: `upload:${upload.fileName}`,
              text: upload.extractedData.content.text
            });
          }
        }
      }

      // Add contract notes as text source
      if (contract.notes) {
        textSources.push({
          source: 'contract:notes',
          text: contract.notes
        });
      }

      // Extract rules from each text source
      for (const source of textSources) {
        const rules = await this.extractRulesFromText(source.text, source.source);
        extractedRules.push(...rules);
      }

      // Extract rules from structured contract data
      const structuredRules = await this.extractRulesFromStructuredData(contract);
      extractedRules.push(...structuredRules);

      // Save extracted rules to database
      const savedRules = [];
      for (const rule of extractedRules) {
        const savedRule = await this.saveOrUpdateRule(rule, contractId);
        savedRules.push(savedRule);
      }

      return {
        contractId,
        rulesExtracted: savedRules.length,
        rules: savedRules,
        sources: textSources.length,
        confidence: this.calculateOverallConfidence(savedRules)
      };
    } catch (error) {
      throw new Error(`Rule extraction failed: ${error.message}`);
    }
  }

  async extractRulesFromText(text, source) {
    const rules = [];

    for (const [category, patterns] of Object.entries(this.extractionPatterns)) {
      for (const [ruleName, config] of Object.entries(patterns)) {
        for (const pattern of config.patterns) {
          const matches = [...text.matchAll(pattern)];
          
          if (matches.length > 0) {
            const values = matches.map(match => {
              // Extract the captured value (usually the first capture group)
              let value = match[1]?.trim();
              
              // Clean up the value
              if (value) {
                // Remove currency symbols and normalize
                value = value.replace(/[$,]/g, '');
                
                // Handle percentage signs
                if (value.endsWith('%')) {
                  value = parseFloat(value.replace('%', ''));
                } else if (!isNaN(value)) {
                  value = parseFloat(value);
                }
              }
              
              return {
                raw: match[0],
                value: value,
                index: match.index
              };
            });

            if (values.length > 0) {
              rules.push({
                ruleType: config.type,
                category: config.category,
                name: ruleName,
                values: values,
                confidence: this.calculatePatternConfidence(values, matches),
                source: source,
                pattern: pattern.toString()
              });
            }
          }
        }
      }
    }

    return rules;
  }

  async extractRulesFromStructuredData(contract) {
    const rules = [];

    try {
      // Financial rules
      if (contract.financial) {
        const financial = contract.financial;
        
        if (financial.baseRate) {
          rules.push({
            ruleType: 'RANGE',
            category: 'financial',
            name: 'baseRate',
            values: [{ value: financial.baseRate, confidence: 1.0 }],
            confidence: 1.0,
            source: 'contract:financial_data'
          });
        }
        
        if (financial.escalation) {
          rules.push({
            ruleType: 'RANGE',
            category: 'financial',
            name: 'escalation',
            values: [{ value: financial.escalation, confidence: 1.0 }],
            confidence: 1.0,
            source: 'contract:financial_data'
          });
        }
      }

      // Technical rules
      if (contract.technical) {
        const technical = contract.technical;
        
        if (technical.voltage) {
          rules.push({
            ruleType: 'ENUM',
            category: 'technical',
            name: 'voltage',
            values: [{ value: technical.voltage, confidence: 1.0 }],
            confidence: 1.0,
            source: 'contract:technical_data'
          });
        }
        
        if (technical.components?.length > 0) {
          rules.push({
            ruleType: 'ENUM',
            category: 'technical',
            name: 'components',
            values: technical.components.map(comp => ({ value: comp, confidence: 1.0 })),
            confidence: 1.0,
            source: 'contract:technical_data'
          });
        }
      }

      // Operating rules
      if (contract.operating) {
        const operating = contract.operating;
        
        if (operating.efficiency) {
          rules.push({
            ruleType: 'RANGE',
            category: 'operating',
            name: 'efficiency',
            values: [{ value: operating.efficiency, confidence: 1.0 }],
            confidence: 1.0,
            source: 'contract:operating_data'
          });
        }
        
        if (operating.outputWarranty) {
          rules.push({
            ruleType: 'RANGE',
            category: 'operating',
            name: 'outputWarranty',
            values: [{ value: operating.outputWarranty, confidence: 1.0 }],
            confidence: 1.0,
            source: 'contract:operating_data'
          });
        }
      }

      // System rules
      if (contract.systemType) {
        rules.push({
          ruleType: 'ENUM',
          category: 'system',
          name: 'type',
          values: [{ value: contract.systemType, confidence: 1.0 }],
          confidence: 1.0,
          source: 'contract:system_data'
        });
      }

      if (contract.capacity) {
        rules.push({
          ruleType: 'RANGE',
          category: 'technical',
          name: 'capacity',
          values: [{ value: contract.capacity, confidence: 1.0 }],
          confidence: 1.0,
          source: 'contract:main_data'
        });
      }

      if (contract.term) {
        rules.push({
          ruleType: 'RANGE',
          category: 'financial',
          name: 'term',
          values: [{ value: contract.term, confidence: 1.0 }],
          confidence: 1.0,
          source: 'contract:main_data'
        });
      }
    } catch (error) {
      console.error('Error extracting structured rules:', error);
    }

    return rules;
  }

  calculatePatternConfidence(values, matches) {
    // Base confidence on pattern specificity and value consistency
    let confidence = 0.5; // Base confidence

    // Increase confidence for more matches
    if (matches.length > 1) {
      confidence += Math.min(matches.length * 0.1, 0.3);
    }

    // Increase confidence for numeric values
    const numericValues = values.filter(v => !isNaN(v.value)).length;
    if (numericValues > 0) {
      confidence += 0.2;
    }

    // Decrease confidence if values are wildly different (for ranges)
    if (values.length > 1) {
      const numValues = values.map(v => parseFloat(v.value)).filter(v => !isNaN(v));
      if (numValues.length > 1) {
        const min = Math.min(...numValues);
        const max = Math.max(...numValues);
        const variance = max - min;
        const average = numValues.reduce((a, b) => a + b, 0) / numValues.length;
        
        if (variance / average > 0.5) { // High variance relative to average
          confidence -= 0.2;
        }
      }
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  calculateOverallConfidence(rules) {
    if (rules.length === 0) return 0;

    const totalConfidence = rules.reduce((sum, rule) => sum + rule.confidence, 0);
    return totalConfidence / rules.length;
  }

  async saveOrUpdateRule(rule, sourceContractId) {
    try {
      // Check if similar rule exists
      const existingRule = await this.prisma.learnedRule.findFirst({
        where: {
          ruleType: rule.ruleType,
          category: rule.category,
          name: rule.name
        }
      });

      const ruleData = {
        values: rule.values,
        patterns: rule.pattern ? [rule.pattern] : [],
        confidence: rule.confidence,
        sources: [rule.source],
        lastExtracted: new Date(),
        sourceContracts: [sourceContractId]
      };

      if (existingRule) {
        // Update existing rule
        const existingData = existingRule.ruleData || {};
        const mergedData = {
          values: [...(existingData.values || []), ...ruleData.values],
          patterns: [...new Set([...(existingData.patterns || []), ...(ruleData.patterns || [])])],
          sources: [...new Set([...(existingData.sources || []), ...ruleData.sources])],
          sourceContracts: [...new Set([...(existingData.sourceContracts || []), ...ruleData.sourceContracts])],
          lastExtracted: ruleData.lastExtracted
        };

        // Recalculate confidence based on occurrences
        const newOccurrences = existingRule.occurrences + 1;
        const newConfidence = Math.min(1.0, (existingRule.confidence + rule.confidence) / 2 + (newOccurrences * 0.05));

        const updatedRule = await this.prisma.learnedRule.update({
          where: { id: existingRule.id },
          data: {
            ruleData: mergedData,
            confidence: newConfidence,
            occurrences: newOccurrences,
            lastSeen: new Date()
          }
        });

        return updatedRule;
      } else {
        // Create new rule
        const newRule = await this.prisma.learnedRule.create({
          data: {
            ruleType: rule.ruleType,
            category: rule.category,
            name: rule.name,
            ruleData: ruleData,
            confidence: rule.confidence,
            occurrences: 1,
            source: rule.source
          }
        });

        return newRule;
      }
    } catch (error) {
      console.error('Error saving rule:', error);
      throw error;
    }
  }

  async getAllRules(filters = {}) {
    try {
      const where = {};
      
      if (filters.category) where.category = filters.category;
      if (filters.ruleType) where.ruleType = filters.ruleType;
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      if (filters.minConfidence) where.confidence = { gte: parseFloat(filters.minConfidence) };

      const rules = await this.prisma.learnedRule.findMany({
        where,
        orderBy: [
          { confidence: 'desc' },
          { occurrences: 'desc' },
          { lastSeen: 'desc' }
        ]
      });

      return rules;
    } catch (error) {
      throw new Error(`Failed to get rules: ${error.message}`);
    }
  }

  async validateContractAgainstRules(contractData) {
    try {
      const rules = await this.getAllRules({ isActive: true, minConfidence: this.confidenceThresholds.medium });
      const validationResults = [];

      for (const rule of rules) {
        const result = await this.validateFieldAgainstRule(contractData, rule);
        if (result) {
          validationResults.push(result);
        }
      }

      return {
        validationResults,
        overallValid: validationResults.every(r => r.isValid),
        warnings: validationResults.filter(r => !r.isValid).length,
        suggestions: validationResults.filter(r => r.suggestion)
      };
    } catch (error) {
      throw new Error(`Validation failed: ${error.message}`);
    }
  }

  async validateFieldAgainstRule(contractData, rule) {
    try {
      const fieldValue = this.getFieldValue(contractData, rule.category, rule.name);
      
      if (fieldValue === null || fieldValue === undefined) {
        return null; // Field not present in contract
      }

      const ruleData = rule.ruleData || {};
      const values = ruleData.values || [];
      
      if (rule.ruleType === 'RANGE') {
        return this.validateRangeRule(fieldValue, values, rule);
      } else if (rule.ruleType === 'ENUM') {
        return this.validateEnumRule(fieldValue, values, rule);
      }

      return null;
    } catch (error) {
      console.error('Error validating field:', error);
      return null;
    }
  }

  validateRangeRule(fieldValue, ruleValues, rule) {
    const numericValues = ruleValues
      .map(v => parseFloat(v.value))
      .filter(v => !isNaN(v));

    if (numericValues.length === 0) return null;

    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
    
    const fieldVal = parseFloat(fieldValue);
    const isValid = fieldVal >= min && fieldVal <= max;
    
    let suggestion = null;
    if (!isValid) {
      if (fieldVal < min) {
        suggestion = `Value ${fieldVal} is below typical range (${min}-${max}). Consider ${min}.`;
      } else {
        suggestion = `Value ${fieldVal} is above typical range (${min}-${max}). Consider ${max}.`;
      }
    }

    return {
      field: `${rule.category}.${rule.name}`,
      isValid,
      fieldValue: fieldVal,
      ruleRange: { min, max, average: avg },
      confidence: rule.confidence,
      suggestion,
      occurrences: rule.occurrences
    };
  }

  validateEnumRule(fieldValue, ruleValues, rule) {
    const validValues = ruleValues.map(v => v.value);
    const isValid = validValues.some(validValue => 
      String(fieldValue).toLowerCase() === String(validValue).toLowerCase()
    );

    let suggestion = null;
    if (!isValid) {
      const mostCommon = validValues.reduce((a, b) => 
        ruleValues.filter(v => v.value === a).length > ruleValues.filter(v => v.value === b).length ? a : b
      );
      suggestion = `Value '${fieldValue}' not typical. Most common: '${mostCommon}'. Valid options: ${validValues.join(', ')}`;
    }

    return {
      field: `${rule.category}.${rule.name}`,
      isValid,
      fieldValue,
      validOptions: validValues,
      confidence: rule.confidence,
      suggestion,
      occurrences: rule.occurrences
    };
  }

  getFieldValue(contractData, category, name) {
    try {
      if (category === 'financial' && contractData.financial) {
        return contractData.financial[name];
      }
      if (category === 'technical' && contractData.technical) {
        return contractData.technical[name];
      }
      if (category === 'operating' && contractData.operating) {
        return contractData.operating[name];
      }
      if (category === 'system') {
        if (name === 'type') return contractData.systemType;
      }
      
      // Main contract fields
      if (contractData[name]) {
        return contractData[name];
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async getRuleStatistics() {
    try {
      const stats = await this.prisma.learnedRule.aggregate({
        _count: { id: true },
        _avg: { confidence: true, occurrences: true }
      });

      const byCategory = await this.prisma.learnedRule.groupBy({
        by: ['category'],
        _count: true,
        _avg: { confidence: true }
      });

      const byType = await this.prisma.learnedRule.groupBy({
        by: ['ruleType'],
        _count: true,
        _avg: { confidence: true }
      });

      const highConfidenceCount = await this.prisma.learnedRule.count({
        where: { confidence: { gte: this.confidenceThresholds.high } }
      });

      return {
        totalRules: stats._count.id,
        averageConfidence: stats._avg.confidence,
        averageOccurrences: stats._avg.occurrences,
        highConfidenceRules: highConfidenceCount,
        byCategory: byCategory.reduce((acc, item) => {
          acc[item.category] = {
            count: item._count,
            avgConfidence: item._avg.confidence
          };
          return acc;
        }, {}),
        byType: byType.reduce((acc, item) => {
          acc[item.ruleType] = {
            count: item._count,
            avgConfidence: item._avg.confidence
          };
          return acc;
        }, {}),
        confidenceThresholds: this.confidenceThresholds
      };
    } catch (error) {
      throw new Error(`Failed to get rule statistics: ${error.message}`);
    }
  }
}

export default RuleExtractionService;