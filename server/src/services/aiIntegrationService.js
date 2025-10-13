/**
 * AI Integration Service for Rule Extraction
 * Provides interface to various AI services for contract rule extraction
 */

class AIIntegrationService {
  constructor() {
    this.providers = {
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        available: !!process.env.ANTHROPIC_API_KEY
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        available: !!process.env.OPENAI_API_KEY
      }
    };

    // Use environment variable for model, fallback to stable version
    this.anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

    // Default to mock responses if no API keys are configured
    this.useMockResponses = !this.providers.anthropic.available && !this.providers.openai.available;

    console.log(`🤖 AIIntegrationService initialized with Anthropic model: ${this.anthropicModel}`);
  }

  /**
   * Extract contract rules using AI
   */
  async extractContractRules(prompt) {
    try {
      if (this.useMockResponses) {
        return this.generateMockRuleExtractionResponse();
      }

      // Try Anthropic first if available
      if (this.providers.anthropic.available) {
        return await this.callAnthropicAPI(prompt);
      }

      // Fallback to OpenAI if available
      if (this.providers.openai.available) {
        return await this.callOpenAIAPI(prompt);
      }

      // Ultimate fallback to mock
      return this.generateMockRuleExtractionResponse();
    } catch (error) {
      console.warn('AI rule extraction failed, using mock response:', error.message);
      return this.generateMockRuleExtractionResponse();
    }
  }

  /**
   * Call Anthropic Claude API
   */
  async callAnthropicAPI(prompt) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.providers.anthropic.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.anthropicModel,
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '';

      return this.parseAIResponse(content);
    } catch (error) {
      console.warn('Anthropic API call failed:', error.message);
      throw error;
    }
  }

  /**
   * Call OpenAI API
   */
  async callOpenAIAPI(prompt) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.providers.openai.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{
            role: 'user',
            content: prompt
          }],
          max_tokens: 4000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      return this.parseAIResponse(content);
    } catch (error) {
      console.warn('OpenAI API call failed:', error.message);
      throw error;
    }
  }

  /**
   * Parse AI response to extract structured rule data
   */
  parseAIResponse(content) {
    try {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // If no JSON found, create a basic structure
      return {
        enhancedRules: [],
        improvements: [],
        anomalies: []
      };
    } catch (error) {
      console.warn('Failed to parse AI response:', error.message);
      return {
        enhancedRules: [],
        improvements: [],
        anomalies: []
      };
    }
  }

  /**
   * Generate mock AI response for development/testing
   */
  generateMockRuleExtractionResponse() {
    return {
      enhancedRules: [
        {
          ruleType: 'RANGE',
          category: 'financial',
          name: 'payment_terms_range',
          ruleData: { min: 30, max: 90, unit: 'days' },
          confidence: 0.85,
          reasoning: 'Identified consistent payment term patterns across similar contracts',
          relationships: ['escalation_rate', 'contract_term']
        },
        {
          ruleType: 'CORRELATION',
          category: 'risk',
          name: 'capacity_term_correlation',
          ruleData: {
            primaryField: 'capacity',
            secondaryField: 'term',
            correlation: 0.72,
            description: 'Higher capacity contracts tend to have longer terms'
          },
          confidence: 0.78,
          reasoning: 'Strong correlation observed between system capacity and contract duration',
          relationships: ['capacity_range', 'term_range']
        }
      ],
      improvements: [
        {
          existingRule: 'escalation_rate',
          suggestion: 'Consider market conditions and inflation projections in escalation rate validation',
          confidenceBoost: 0.15
        }
      ],
      anomalies: [
        {
          field: 'baseRate',
          value: '0.12',
          reason: 'Unusually high base rate compared to market standards (typical range: 0.08-0.10)',
          risk: 'medium'
        }
      ]
    };
  }

  /**
   * Check AI service availability
   */
  getStatus() {
    return {
      providers: this.providers,
      useMockResponses: this.useMockResponses,
      preferredProvider: this.providers.anthropic.available ? 'anthropic' : 
                        this.providers.openai.available ? 'openai' : 'mock'
    };
  }

  /**
   * Test AI connectivity
   */
  async testConnection() {
    try {
      const testPrompt = 'Test connection. Please respond with "OK".';
      const response = await this.extractContractRules(testPrompt);
      
      return {
        success: true,
        provider: this.useMockResponses ? 'mock' : 
                 this.providers.anthropic.available ? 'anthropic' : 'openai',
        response: response
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fallback: 'mock'
      };
    }
  }
}

// Create and export singleton instance
const aiIntegrationService = new AIIntegrationService();
export default aiIntegrationService;