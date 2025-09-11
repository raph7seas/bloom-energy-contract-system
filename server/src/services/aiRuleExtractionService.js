/**
 * AI-Enhanced Rule Extraction Service
 * Uses machine learning and NLP to automatically learn patterns and extract rules from contracts
 */

import RuleExtractionService from './ruleExtractionService.js';

class AIRuleExtractionService extends RuleExtractionService {
  constructor(prisma, aiService = null) {
    super(prisma);
    this.aiService = aiService;
    
    // Enhanced pattern learning capabilities
    this.patternLearningConfig = {
      minOccurrences: 3, // Minimum times a pattern must appear to be learned
      confidenceBoost: 0.1, // Boost applied when AI confirms a pattern
      humanValidationBoost: 0.2, // Boost applied when human validates a pattern
      maxPatternsPerRule: 10, // Maximum patterns to maintain per rule type
      learningEnabled: true
    };

    // Machine learning features for pattern recognition
    this.mlFeatures = {
      contextWords: ['contract', 'agreement', 'terms', 'rate', 'price', 'cost'],
      numericalPatterns: [
        /\$[\d,.]+/, // Currency
        /\d+\.?\d*%/, // Percentages  
        /\d+\.?\d*\s*(?:kw|mw|gw)/i, // Power units
        /\d+\s*(?:year|month|day)s?/i, // Time periods
        /\d+\.?\d*\s*(?:v|volt|voltage)/i // Voltage
      ],
      contractSections: [
        'financial terms',
        'technical specifications', 
        'performance guarantees',
        'payment terms',
        'system requirements'
      ]
    };
  }

  /**
   * Enhanced rule extraction with AI assistance
   */
  async extractRulesFromContract(contractId, options = {}) {
    try {
      // Get base extraction results
      const baseResults = await super.extractRulesFromContract(contractId, options);
      
      // Enhance with AI if available
      if (this.aiService && options.useAI !== false) {
        const aiEnhancedResults = await this.enhanceWithAI(baseResults, contractId);
        return this.combineResults(baseResults, aiEnhancedResults);
      }
      
      return baseResults;
    } catch (error) {
      throw new Error(`AI rule extraction failed: ${error.message}`);
    }
  }

  /**
   * Use AI to enhance rule extraction results
   */
  async enhanceWithAI(baseResults, contractId) {
    try {
      const contract = await this.prisma.contract.findUnique({
        where: { id: contractId },
        include: {
          financial: true,
          technical: true,
          operating: true,
          uploads: true
        }
      });

      const aiPrompt = this.buildAIExtractionPrompt(contract, baseResults);
      const aiResponse = await this.aiService.extractContractRules(aiPrompt);
      
      return this.parseAIResponse(aiResponse, contractId);
    } catch (error) {
      console.warn('AI enhancement failed, using base results:', error.message);
      return { rules: [], confidence: 0 };
    }
  }

  /**
   * Build AI prompt for rule extraction
   */
  buildAIExtractionPrompt(contract, baseResults) {
    const contractSummary = {
      name: contract.name,
      client: contract.client,
      capacity: contract.capacity,
      term: contract.term,
      systemType: contract.systemType,
      financial: contract.financial,
      technical: contract.technical,
      operating: contract.operating
    };

    return `
    Analyze this energy contract and extract business rules:

    CONTRACT SUMMARY:
    ${JSON.stringify(contractSummary, null, 2)}

    CURRENT EXTRACTED RULES:
    ${JSON.stringify(baseResults.rules.map(r => ({
      type: r.ruleType,
      category: r.category,
      name: r.name,
      confidence: r.confidence
    })), null, 2)}

    TASK:
    1. Identify additional business rules not captured by regex patterns
    2. Suggest improvements to existing rules
    3. Extract complex relationships between contract terms
    4. Identify anomalies or unusual patterns
    5. Provide confidence scores for each rule

    FOCUS AREAS:
    - Financial terms and pricing models
    - Performance guarantees and warranties
    - Technical specifications and requirements
    - Operational parameters and limits
    - Risk factors and penalty clauses

    RESPONSE FORMAT:
    Return a JSON object with:
    {
      "enhancedRules": [
        {
          "ruleType": "RANGE|ENUM|CORRELATION|VALIDATION|CALCULATION",
          "category": "financial|technical|operating|system|risk",
          "name": "descriptive_rule_name",
          "ruleData": { "specific": "rule data" },
          "confidence": 0.0-1.0,
          "reasoning": "why this rule was identified",
          "relationships": ["related_rule_names"]
        }
      ],
      "improvements": [
        {
          "existingRule": "rule_name",
          "suggestion": "improvement suggestion",
          "confidenceBoost": 0.0-0.3
        }
      ],
      "anomalies": [
        {
          "field": "field_name",
          "value": "anomalous_value", 
          "reason": "why this is unusual",
          "risk": "low|medium|high"
        }
      ]
    }
    `;
  }

  /**
   * Parse AI response and convert to rule format
   */
  parseAIResponse(aiResponse, contractId) {
    try {
      // Try to parse JSON response
      let parsedResponse;
      if (typeof aiResponse === 'string') {
        // Extract JSON from response if wrapped in text
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        parsedResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } else {
        parsedResponse = aiResponse;
      }

      const enhancedRules = [];
      
      // Process enhanced rules
      if (parsedResponse.enhancedRules) {
        for (const aiRule of parsedResponse.enhancedRules) {
          enhancedRules.push({
            ruleType: aiRule.ruleType || 'VALIDATION',
            category: aiRule.category || 'general',
            name: aiRule.name,
            ruleData: aiRule.ruleData || {},
            confidence: Math.max(0, Math.min(1, aiRule.confidence || 0.7)),
            source: `ai:${contractId}`,
            reasoning: aiRule.reasoning,
            relationships: aiRule.relationships || [],
            isAIGenerated: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }

      return {
        rules: enhancedRules,
        improvements: parsedResponse.improvements || [],
        anomalies: parsedResponse.anomalies || [],
        confidence: this.calculateAIConfidence(enhancedRules)
      };
    } catch (error) {
      console.warn('Failed to parse AI response:', error.message);
      return { rules: [], confidence: 0 };
    }
  }

  /**
   * Combine base results with AI enhancements
   */
  combineResults(baseResults, aiResults) {
    const combinedRules = [...baseResults.rules];
    
    // Add AI-generated rules
    combinedRules.push(...aiResults.rules);
    
    // Apply AI improvements to existing rules
    for (const improvement of aiResults.improvements || []) {
      const existingRule = combinedRules.find(r => r.name === improvement.existingRule);
      if (existingRule && improvement.confidenceBoost) {
        existingRule.confidence = Math.min(1, existingRule.confidence + improvement.confidenceBoost);
        existingRule.aiImproved = true;
        existingRule.improvementReason = improvement.suggestion;
      }
    }

    return {
      contractId: baseResults.contractId,
      rulesExtracted: combinedRules.length,
      rules: combinedRules,
      sources: baseResults.sources,
      confidence: this.calculateCombinedConfidence(baseResults, aiResults),
      aiEnhancements: {
        rulesAdded: aiResults.rules.length,
        improvementsApplied: (aiResults.improvements || []).length,
        anomaliesDetected: (aiResults.anomalies || []).length
      },
      anomalies: aiResults.anomalies || []
    };
  }

  /**
   * Learn new patterns from successful extractions
   */
  async learnNewPatterns(contractId, validatedRules) {
    if (!this.patternLearningConfig.learningEnabled) return;

    try {
      for (const rule of validatedRules) {
        if (rule.confidence >= this.confidenceThresholds.medium) {
          await this.analyzeAndLearnPattern(rule, contractId);
        }
      }
    } catch (error) {
      console.warn('Pattern learning failed:', error.message);
    }
  }

  /**
   * Analyze successful rules to learn new patterns
   */
  async analyzeAndLearnPattern(rule, contractId) {
    try {
      // Check if we should learn a new pattern for this rule type
      const existingPatterns = this.extractionPatterns[rule.category]?.[rule.name]?.patterns || [];
      
      if (existingPatterns.length >= this.patternLearningConfig.maxPatternsPerRule) {
        return; // Already have enough patterns
      }

      // Find text that generated this rule
      const contract = await this.prisma.contract.findUnique({
        where: { id: contractId },
        include: { uploads: true }
      });

      if (!contract) return;

      // Extract context around the rule values
      const contexts = this.extractRuleContexts(rule, contract);
      
      // Generate new patterns from contexts
      const newPatterns = this.generatePatternsFromContexts(contexts, rule);
      
      // Add promising patterns to the extraction patterns
      for (const pattern of newPatterns) {
        if (this.validateNewPattern(pattern, rule)) {
          this.addLearnedPattern(rule.category, rule.name, pattern);
        }
      }
    } catch (error) {
      console.warn('Pattern analysis failed:', error.message);
    }
  }

  /**
   * Extract contexts where rule values were found
   */
  extractRuleContexts(rule, contract) {
    const contexts = [];
    
    // Search in notes
    if (contract.notes) {
      contexts.push(...this.findValueContexts(contract.notes, rule.values));
    }
    
    // Search in uploaded documents
    for (const upload of contract.uploads || []) {
      if (upload.extractedData?.content?.text) {
        contexts.push(...this.findValueContexts(upload.extractedData.content.text, rule.values));
      }
    }
    
    return contexts;
  }

  /**
   * Find text contexts around specific values
   */
  findValueContexts(text, values, contextLength = 50) {
    const contexts = [];
    
    for (const value of values || []) {
      if (!value.raw) continue;
      
      const index = text.toLowerCase().indexOf(value.raw.toLowerCase());
      if (index !== -1) {
        const start = Math.max(0, index - contextLength);
        const end = Math.min(text.length, index + value.raw.length + contextLength);
        contexts.push({
          text: text.substring(start, end),
          value: value,
          position: index
        });
      }
    }
    
    return contexts;
  }

  /**
   * Generate new regex patterns from successful contexts
   */
  generatePatternsFromContexts(contexts, rule) {
    const patterns = [];
    
    for (const context of contexts) {
      // Generate patterns based on the context structure
      const beforeWords = this.extractKeyWords(context.text.substring(0, context.text.indexOf(context.value.raw)));
      const afterWords = this.extractKeyWords(context.text.substring(context.text.indexOf(context.value.raw) + context.value.raw.length));
      
      // Create pattern variations
      if (beforeWords.length > 0) {
        const pattern = new RegExp(`${beforeWords[0]}\\s*(?:of\\s*|:|=)?\\s*([\\d.,]+)`, 'gi');
        patterns.push(pattern);
      }
    }
    
    return patterns;
  }

  /**
   * Extract key words that might be useful for patterns
   */
  extractKeyWords(text) {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    return words.filter(word => 
      word.length > 2 && 
      this.mlFeatures.contextWords.includes(word)
    );
  }

  /**
   * Validate new pattern before adding it
   */
  validateNewPattern(pattern, rule) {
    try {
      // Test pattern compilation
      new RegExp(pattern);
      
      // Check if pattern is too generic or too specific
      const patternStr = pattern.toString();
      if (patternStr.length < 10 || patternStr.length > 200) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Add learned pattern to extraction patterns
   */
  addLearnedPattern(category, ruleName, pattern) {
    if (!this.extractionPatterns[category]) {
      this.extractionPatterns[category] = {};
    }
    
    if (!this.extractionPatterns[category][ruleName]) {
      this.extractionPatterns[category][ruleName] = {
        patterns: [],
        type: 'RANGE',
        category: category
      };
    }
    
    this.extractionPatterns[category][ruleName].patterns.push(pattern);
    
    console.log(`Learned new pattern for ${category}.${ruleName}:`, pattern.toString());
  }

  /**
   * Calculate AI confidence score
   */
  calculateAIConfidence(aiRules) {
    if (!aiRules.length) return 0;
    
    const avgConfidence = aiRules.reduce((sum, rule) => sum + rule.confidence, 0) / aiRules.length;
    return Math.round(avgConfidence * 100) / 100;
  }

  /**
   * Calculate combined confidence from base and AI results
   */
  calculateCombinedConfidence(baseResults, aiResults) {
    const baseWeight = 0.7;
    const aiWeight = 0.3;
    
    const combinedConfidence = 
      (baseResults.confidence * baseWeight) + 
      (aiResults.confidence * aiWeight);
      
    return Math.round(combinedConfidence * 100) / 100;
  }

  /**
   * Get rule extraction analytics
   */
  async getExtractionAnalytics(options = {}) {
    try {
      const analytics = await super.getRuleStatistics(options);
      
      // Add AI-specific analytics
      const aiRulesCount = await this.prisma.learnedRule.count({
        where: {
          source: { contains: 'ai:' },
          isActive: true
        }
      });
      
      const patternLearningStats = {
        totalPatternsLearned: Object.values(this.extractionPatterns)
          .reduce((total, category) => 
            total + Object.values(category).reduce((catTotal, rule) => 
              catTotal + (rule.patterns?.length || 0), 0), 0),
        aiGeneratedRules: aiRulesCount,
        learningEnabled: this.patternLearningConfig.learningEnabled
      };
      
      return {
        ...analytics,
        aiEnhancements: patternLearningStats
      };
    } catch (error) {
      throw new Error(`Analytics generation failed: ${error.message}`);
    }
  }
}

export default AIRuleExtractionService;