import { PrismaClient } from '../../../generated/prisma/index.js';
import { AppError } from '../middleware/errorHandler.js';
import crypto from 'crypto';

const prisma = new PrismaClient();

class LearningService {
  constructor() {
    this.INTERACTION_TYPES = {
      CONTRACT_CREATE: 'CONTRACT_CREATE',
      CONTRACT_UPDATE: 'CONTRACT_UPDATE',
      FIELD_VALIDATION: 'FIELD_VALIDATION',
      USER_CORRECTION: 'USER_CORRECTION',
      TEMPLATE_USE: 'TEMPLATE_USE',
      AI_SUGGESTION_ACCEPTED: 'AI_SUGGESTION_ACCEPTED',
      AI_SUGGESTION_REJECTED: 'AI_SUGGESTION_REJECTED'
    };

    this.RULE_CONFIDENCE_THRESHOLDS = {
      HIGH: 0.85,
      MEDIUM: 0.70,
      LOW: 0.50
    };

    this.LEARNING_WEIGHTS = {
      CONTRACT_CREATE: 1.0,
      CONTRACT_UPDATE: 0.8,
      USER_CORRECTION: 1.2,
      AI_SUGGESTION_ACCEPTED: 0.9,
      AI_SUGGESTION_REJECTED: -0.3
    };
  }

  // Capture user interaction for learning
  async captureInteraction(interactionData, userId) {
    try {
      const { 
        type, 
        fieldName, 
        oldValue, 
        newValue, 
        context = {},
        contractId = null 
      } = interactionData;

      // Store the interaction in audit log for tracking
      await prisma.auditLog.create({
        data: {
          entityType: 'USER_INTERACTION',
          entityId: contractId || 'system',
          action: type,
          userId,
          oldValues: JSON.stringify({ fieldName, oldValue }),
          newValues: JSON.stringify({ fieldName, newValue, context }),
          auditHash: this.generateHash({ type, fieldName, oldValue, newValue, timestamp: new Date() }),
          metadata: {
            interactionType: type,
            fieldName,
            context,
            learningData: true
          }
        }
      });

      // Immediately process this interaction for learning
      await this.processInteractionForLearning({
        type,
        fieldName,
        oldValue,
        newValue,
        context,
        contractId,
        userId
      });

      return { success: true, message: 'Interaction captured successfully' };
    } catch (error) {
      console.error('Error capturing interaction:', error);
      throw new AppError('Failed to capture interaction: ' + error.message);
    }
  }

  // Process interaction and update learned rules
  async processInteractionForLearning(interaction) {
    try {
      const { type, fieldName, oldValue, newValue, context } = interaction;

      // Different processing based on interaction type
      switch (type) {
        case this.INTERACTION_TYPES.CONTRACT_CREATE:
        case this.INTERACTION_TYPES.CONTRACT_UPDATE:
          await this.learnFromContractData(newValue, fieldName, context);
          break;

        case this.INTERACTION_TYPES.USER_CORRECTION:
          await this.learnFromUserCorrection(fieldName, oldValue, newValue, context);
          break;

        case this.INTERACTION_TYPES.AI_SUGGESTION_ACCEPTED:
          await this.reinforceRule(fieldName, newValue, true, context);
          break;

        case this.INTERACTION_TYPES.AI_SUGGESTION_REJECTED:
          await this.reinforceRule(fieldName, oldValue, false, context);
          break;

        case this.INTERACTION_TYPES.TEMPLATE_USE:
          await this.learnFromTemplateUsage(context.templateId, context.modifications);
          break;

        default:
          console.log(`Unknown interaction type: ${type}`);
      }
    } catch (error) {
      console.error('Error processing interaction for learning:', error);
    }
  }

  // Learn patterns from contract data
  async learnFromContractData(contractData, fieldName, context) {
    try {
      // Extract field-specific patterns
      if (fieldName === 'capacity' && contractData.capacity) {
        await this.updateCapacityRules(contractData.capacity);
      }

      if (fieldName === 'term' && contractData.term) {
        await this.updateTermRules(contractData.term);
      }

      if (fieldName === 'yearlyRate' && contractData.yearlyRate) {
        await this.updateRateRules(contractData.yearlyRate, context);
      }

      if (fieldName === 'systemType' && contractData.systemType) {
        await this.updateSystemTypeRules(contractData.systemType, contractData);
      }

      // Learn correlations between fields
      await this.learnFieldCorrelations(contractData);

    } catch (error) {
      console.error('Error learning from contract data:', error);
    }
  }

  // Update capacity-related rules
  async updateCapacityRules(capacity) {
    try {
      // Check if capacity follows the 325kW multiple rule
      const is325Multiple = capacity % 325 === 0;
      
      await this.updateOrCreateRule({
        ruleType: 'RANGE',
        category: 'system',
        name: 'Capacity Multiple Rule',
        pattern: 'capacity % 325 === 0',
        validationLogic: {
          minValue: 325,
          increment: 325,
          maxValue: 5000
        },
        newValue: capacity,
        isValid: is325Multiple
      });

      // Update capacity range rules
      await this.updateRangeRule('system', 'Capacity Range Rule', capacity, {
        description: 'System capacity range based on historical data',
        unit: 'kW'
      });

    } catch (error) {
      console.error('Error updating capacity rules:', error);
    }
  }

  // Update contract term rules
  async updateTermRules(term) {
    try {
      const standardTerms = [5, 10, 15, 20, 25];
      const isStandardTerm = standardTerms.includes(term);

      await this.updateOrCreateRule({
        ruleType: 'ENUM',
        category: 'commercial',
        name: 'Standard Contract Term Rule',
        pattern: '[5, 10, 15, 20, 25].includes(contractTerm)',
        validationLogic: {
          allowedValues: standardTerms,
          unit: 'years'
        },
        newValue: term,
        isValid: isStandardTerm
      });

    } catch (error) {
      console.error('Error updating term rules:', error);
    }
  }

  // Update rate-related rules
  async updateRateRules(yearlyRate, context) {
    try {
      await this.updateRangeRule('financial', 'Base Rate Range Rule', yearlyRate, {
        description: 'Base rates typically observed in contracts',
        unit: 'USD/kWh',
        context: context.systemType
      });

    } catch (error) {
      console.error('Error updating rate rules:', error);
    }
  }

  // Update system type correlation rules
  async updateSystemTypeRules(systemType, contractData) {
    try {
      // Learn correlations between system type and other fields
      const correlations = {
        capacity: contractData.capacity,
        term: contractData.term,
        yearlyRate: contractData.yearlyRate
      };

      await this.updateCorrelationRule('technical', 'System Type Correlations', systemType, correlations);

    } catch (error) {
      console.error('Error updating system type rules:', error);
    }
  }

  // Learn from user corrections
  async learnFromUserCorrection(fieldName, oldValue, newValue, context) {
    try {
      // User corrections are strong signals for rule learning
      const weight = this.LEARNING_WEIGHTS.USER_CORRECTION;
      
      // Update the rule that would have suggested the old value
      await this.adjustRuleConfidence(fieldName, oldValue, -weight, context);
      
      // Strengthen the rule that supports the new value
      await this.adjustRuleConfidence(fieldName, newValue, weight, context);

      console.log(`Learned from user correction: ${fieldName} from ${oldValue} to ${newValue}`);
    } catch (error) {
      console.error('Error learning from user correction:', error);
    }
  }

  // Reinforce or weaken rules based on AI suggestion acceptance/rejection
  async reinforceRule(fieldName, value, wasAccepted, context) {
    try {
      const weight = wasAccepted 
        ? this.LEARNING_WEIGHTS.AI_SUGGESTION_ACCEPTED 
        : this.LEARNING_WEIGHTS.AI_SUGGESTION_REJECTED;

      await this.adjustRuleConfidence(fieldName, value, weight, context);

      console.log(`${wasAccepted ? 'Reinforced' : 'Weakened'} rule for ${fieldName}: ${value}`);
    } catch (error) {
      console.error('Error reinforcing rule:', error);
    }
  }

  // Generic method to update or create rules
  async updateOrCreateRule({ ruleType, category, name, pattern, validationLogic, newValue, isValid }) {
    try {
      const existingRule = await prisma.learnedRule.findUnique({
        where: {
          ruleType_category_name: {
            ruleType,
            category,
            name
          }
        }
      });

      if (existingRule) {
        // Update existing rule
        const confidenceAdjustment = isValid ? 0.1 : -0.05;
        const newConfidence = Math.max(0, Math.min(1, existingRule.confidence + confidenceAdjustment));
        
        await prisma.learnedRule.update({
          where: { id: existingRule.id },
          data: {
            confidence: newConfidence,
            occurrences: existingRule.occurrences + 1,
            lastSeen: new Date(),
            ruleData: {
              ...existingRule.ruleData,
              examples: this.updateExamples(existingRule.ruleData.examples, newValue),
              validationLogic
            }
          }
        });
      } else {
        // Create new rule
        await prisma.learnedRule.create({
          data: {
            ruleType,
            category,
            name,
            ruleData: {
              description: `Auto-learned rule for ${name}`,
              pattern,
              examples: [String(newValue)],
              validationLogic
            },
            confidence: isValid ? 0.6 : 0.3,
            occurrences: 1
          }
        });
      }
    } catch (error) {
      console.error('Error updating or creating rule:', error);
    }
  }

  // Update range-based rules
  async updateRangeRule(category, name, value, metadata = {}) {
    try {
      const existingRule = await prisma.learnedRule.findUnique({
        where: {
          ruleType_category_name: {
            ruleType: 'RANGE',
            category,
            name
          }
        }
      });

      if (existingRule) {
        const currentLogic = existingRule.ruleData.validationLogic || {};
        const newMinValue = Math.min(currentLogic.minValue || value, value);
        const newMaxValue = Math.max(currentLogic.maxValue || value, value);

        await prisma.learnedRule.update({
          where: { id: existingRule.id },
          data: {
            confidence: Math.min(1, existingRule.confidence + 0.05),
            occurrences: existingRule.occurrences + 1,
            lastSeen: new Date(),
            ruleData: {
              ...existingRule.ruleData,
              examples: this.updateExamples(existingRule.ruleData.examples, value),
              validationLogic: {
                ...currentLogic,
                minValue: newMinValue,
                maxValue: newMaxValue,
                ...metadata
              }
            }
          }
        });
      } else {
        await prisma.learnedRule.create({
          data: {
            ruleType: 'RANGE',
            category,
            name,
            ruleData: {
              description: `Auto-learned range rule for ${name}`,
              pattern: `value >= ${value} && value <= ${value}`,
              examples: [String(value)],
              validationLogic: {
                minValue: value,
                maxValue: value,
                ...metadata
              }
            },
            confidence: 0.5,
            occurrences: 1
          }
        });
      }
    } catch (error) {
      console.error('Error updating range rule:', error);
    }
  }

  // Learn field correlations
  async learnFieldCorrelations(contractData) {
    try {
      // Example: Learn capacity vs. system type correlations
      if (contractData.capacity && contractData.systemType) {
        const ruleName = `${contractData.systemType} Capacity Correlation`;
        
        await this.updateCorrelationRule(
          'technical',
          ruleName,
          contractData.systemType,
          { capacity: contractData.capacity }
        );
      }

      // Example: Learn term vs. rate correlations
      if (contractData.term && contractData.yearlyRate) {
        const ruleName = 'Term Rate Correlation';
        
        await this.updateCorrelationRule(
          'financial',
          ruleName,
          contractData.term,
          { yearlyRate: contractData.yearlyRate }
        );
      }
    } catch (error) {
      console.error('Error learning field correlations:', error);
    }
  }

  // Update correlation rules
  async updateCorrelationRule(category, name, primaryValue, correlatedValues) {
    try {
      const existingRule = await prisma.learnedRule.findUnique({
        where: {
          ruleType_category_name: {
            ruleType: 'CORRELATION',
            category,
            name
          }
        }
      });

      if (existingRule) {
        const correlations = existingRule.ruleData.correlations || {};
        
        // Update correlations
        Object.keys(correlatedValues).forEach(key => {
          if (!correlations[key]) correlations[key] = {};
          if (!correlations[key][primaryValue]) correlations[key][primaryValue] = { count: 0, values: [] };
          
          correlations[key][primaryValue].count += 1;
          correlations[key][primaryValue].values.push(correlatedValues[key]);
        });

        await prisma.learnedRule.update({
          where: { id: existingRule.id },
          data: {
            confidence: Math.min(1, existingRule.confidence + 0.03),
            occurrences: existingRule.occurrences + 1,
            lastSeen: new Date(),
            ruleData: {
              ...existingRule.ruleData,
              correlations,
              examples: this.updateExamples(existingRule.ruleData.examples, primaryValue)
            }
          }
        });
      } else {
        const correlations = {};
        Object.keys(correlatedValues).forEach(key => {
          correlations[key] = {
            [primaryValue]: { count: 1, values: [correlatedValues[key]] }
          };
        });

        await prisma.learnedRule.create({
          data: {
            ruleType: 'CORRELATION',
            category,
            name,
            ruleData: {
              description: `Auto-learned correlation rule for ${name}`,
              pattern: `Correlations observed for ${name}`,
              examples: [String(primaryValue)],
              correlations
            },
            confidence: 0.4,
            occurrences: 1
          }
        });
      }
    } catch (error) {
      console.error('Error updating correlation rule:', error);
    }
  }

  // Adjust rule confidence based on user feedback
  async adjustRuleConfidence(fieldName, value, weight, context) {
    try {
      // Find rules that might apply to this field/value combination
      const applicableRules = await this.findApplicableRules(fieldName, value, context);

      for (const rule of applicableRules) {
        const newConfidence = Math.max(0, Math.min(1, rule.confidence + weight * 0.1));
        
        await prisma.learnedRule.update({
          where: { id: rule.id },
          data: {
            confidence: newConfidence,
            lastSeen: new Date()
          }
        });
      }
    } catch (error) {
      console.error('Error adjusting rule confidence:', error);
    }
  }

  // Find rules that apply to a specific field/value
  async findApplicableRules(fieldName, value, context) {
    try {
      // Map field names to rule categories and names
      const ruleMapping = {
        capacity: { category: 'system', names: ['Capacity Multiple Rule', 'Capacity Range Rule'] },
        term: { category: 'commercial', names: ['Standard Contract Term Rule'] },
        yearlyRate: { category: 'financial', names: ['Base Rate Range Rule'] },
        systemType: { category: 'technical', names: ['System Type Correlations'] }
      };

      const mapping = ruleMapping[fieldName];
      if (!mapping) return [];

      const rules = await prisma.learnedRule.findMany({
        where: {
          category: mapping.category,
          name: { in: mapping.names },
          isActive: true
        }
      });

      return rules;
    } catch (error) {
      console.error('Error finding applicable rules:', error);
      return [];
    }
  }

  // Update examples array with new values
  updateExamples(currentExamples, newValue) {
    const examples = currentExamples || [];
    const newValueStr = String(newValue);
    
    if (!examples.includes(newValueStr)) {
      examples.push(newValueStr);
      // Keep only the last 10 examples
      return examples.slice(-10);
    }
    
    return examples;
  }

  // Get learning statistics
  async getLearningStats() {
    try {
      const totalRules = await prisma.learnedRule.count();
      const activeRules = await prisma.learnedRule.count({
        where: { isActive: true }
      });

      const highConfidenceRules = await prisma.learnedRule.count({
        where: {
          isActive: true,
          confidence: { gte: this.RULE_CONFIDENCE_THRESHOLDS.HIGH }
        }
      });

      const mediumConfidenceRules = await prisma.learnedRule.count({
        where: {
          isActive: true,
          confidence: { gte: this.RULE_CONFIDENCE_THRESHOLDS.MEDIUM, lt: this.RULE_CONFIDENCE_THRESHOLDS.HIGH }
        }
      });

      const lowConfidenceRules = await prisma.learnedRule.count({
        where: {
          isActive: true,
          confidence: { lt: this.RULE_CONFIDENCE_THRESHOLDS.MEDIUM }
        }
      });

      const recentInteractions = await prisma.auditLog.count({
        where: {
          entityType: 'USER_INTERACTION',
          timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        }
      });

      return {
        totalRules,
        activeRules,
        confidenceBreakdown: {
          high: highConfidenceRules,
          medium: mediumConfidenceRules,
          low: lowConfidenceRules
        },
        recentInteractions
      };
    } catch (error) {
      console.error('Error getting learning stats:', error);
      throw new Error('Failed to get learning statistics');
    }
  }

  // Cleanup low-confidence rules
  async cleanupLowConfidenceRules(threshold = 0.2) {
    try {
      const result = await prisma.learnedRule.updateMany({
        where: {
          confidence: { lt: threshold },
          isActive: true
        },
        data: {
          isActive: false
        }
      });

      return {
        message: `Deactivated ${result.count} low-confidence rules`,
        deactivatedCount: result.count
      };
    } catch (error) {
      console.error('Error cleaning up low-confidence rules:', error);
      throw new Error('Failed to cleanup rules');
    }
  }

  // Generate hash for audit trail
  generateHash(data) {
    return crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }
}

export default new LearningService();