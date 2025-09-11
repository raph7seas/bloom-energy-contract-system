import OpenAI from 'openai';
import { AIProvider } from './AIProvider.js';

/**
 * OpenAI GPT Provider
 * Implements all GPT models including current and upcoming releases
 */
export class OpenAIProvider extends AIProvider {
  constructor() {
    super('openai');
    this.openai = null;
    this._registerAllModels();
  }

  async initialize() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OpenAI API key not configured');
      this.isConfigured = false;
      return;
    }

    try {
      this.openai = new OpenAI({ apiKey });
      this.isConfigured = true;
      console.log(`✅ OpenAI provider initialized with ${this.models.size} models`);
    } catch (error) {
      console.error('Failed to initialize OpenAI provider:', error);
      this.isConfigured = false;
    }
  }

  async chat(message, options = {}) {
    if (!this.isConfigured) {
      return this._generateMockResponse(message, 'chat');
    }

    const {
      model = 'gpt-4o',
      context = {},
      conversationHistory = [],
      maxTokens = 1500,
      temperature = 0.7
    } = options;

    try {
      const messages = [
        { role: 'system', content: this._buildSystemPrompt('chat') },
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: message }
      ];

      const response = await this.openai.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature
      });

      const responseText = response.choices[0].message.content;
      const inputTokens = response.usage.prompt_tokens;
      const outputTokens = response.usage.completion_tokens;

      return {
        message: responseText,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost: this.calculateCost(inputTokens, outputTokens, model)
        },
        model,
        provider: this.name,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('OpenAI chat error:', error);
      return this._generateMockResponse(message, 'chat');
    }
  }

  async optimize(contractData, options = {}) {
    if (!this.isConfigured) {
      return this._generateMockResponse(contractData, 'optimization');
    }

    const {
      model = 'gpt-4o',
      context = {},
      maxTokens = 1500,
      temperature = 0.3
    } = options;

    try {
      const prompt = this._buildOptimizationPrompt(contractData, context);
      
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: this._buildSystemPrompt('optimization') },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature
      });

      const responseText = response.choices[0].message.content;
      const inputTokens = response.usage.prompt_tokens;
      const outputTokens = response.usage.completion_tokens;

      return {
        ...this._parseResponse(responseText, 'optimization'),
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost: this.calculateCost(inputTokens, outputTokens, model)
        },
        model
      };
    } catch (error) {
      console.error('OpenAI optimization error:', error);
      return this._generateMockResponse(contractData, 'optimization');
    }
  }

  async analyze(contractData, options = {}) {
    if (!this.isConfigured) {
      return this._generateMockResponse(contractData, 'analysis');
    }

    const {
      model = 'gpt-4o',
      maxTokens = 1500,
      temperature = 0.2
    } = options;

    try {
      const prompt = this._buildAnalysisPrompt(contractData);
      
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: this._buildSystemPrompt('analysis') },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature
      });

      const responseText = response.choices[0].message.content;
      const inputTokens = response.usage.prompt_tokens;
      const outputTokens = response.usage.completion_tokens;

      return {
        ...this._parseResponse(responseText, 'analysis'),
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost: this.calculateCost(inputTokens, outputTokens, model)
        },
        model
      };
    } catch (error) {
      console.error('OpenAI analysis error:', error);
      return this._generateMockResponse(contractData, 'analysis');
    }
  }

  async suggest(partialData, options = {}) {
    if (!this.isConfigured) {
      return this._generateMockResponse(partialData, 'suggestion');
    }

    const {
      model = 'gpt-4o-mini', // Use faster, cheaper model for suggestions
      maxTokens = 1000,
      temperature = 0.4
    } = options;

    try {
      const prompt = this._buildSuggestionsPrompt(partialData);
      
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: this._buildSystemPrompt('suggestion') },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature
      });

      const responseText = response.choices[0].message.content;
      const inputTokens = response.usage.prompt_tokens;
      const outputTokens = response.usage.completion_tokens;

      return {
        ...this._parseResponse(responseText, 'suggestion'),
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost: this.calculateCost(inputTokens, outputTokens, model)
        },
        model
      };
    } catch (error) {
      console.error('OpenAI suggestion error:', error);
      return this._generateMockResponse(partialData, 'suggestion');
    }
  }

  estimateTokens(text, model = 'gpt-4o') {
    // Rough estimation: ~3.5 characters per token for GPT models
    // This is an approximation - actual tokenization may vary
    return Math.ceil(text.length / 3.5);
  }

  _registerAllModels() {
    // Current Production Models
    this._registerModel('gpt-4o', {
      name: 'GPT-4o',
      description: 'Most capable multimodal flagship model, cheaper and faster than GPT-4 Turbo',
      pricing: { input: 2.50, output: 10.00 },
      contextLength: 128000,
      capabilities: ['reasoning', 'analysis', 'code', 'multimodal'],
      speed: 'fast',
      quality: 'excellent',
      bestFor: ['complex analysis', 'reasoning', 'multimodal tasks']
    });

    this._registerModel('gpt-4o-mini', {
      name: 'GPT-4o Mini',
      description: 'Affordable and intelligent small model for fast, lightweight tasks',
      pricing: { input: 0.15, output: 0.60 },
      contextLength: 128000,
      capabilities: ['chat', 'simple reasoning', 'lightweight tasks'],
      speed: 'very_fast',
      quality: 'good',
      bestFor: ['quick tasks', 'chat', 'simple analysis']
    });

    this._registerModel('gpt-4-turbo', {
      name: 'GPT-4 Turbo',
      description: 'Previous flagship model, strong performance across domains',
      pricing: { input: 10.00, output: 30.00 },
      contextLength: 128000,
      capabilities: ['reasoning', 'analysis', 'code'],
      speed: 'medium',
      quality: 'excellent',
      bestFor: ['complex tasks', 'detailed analysis']
    });

    this._registerModel('gpt-4', {
      name: 'GPT-4',
      description: 'Original GPT-4 model with broad general knowledge',
      pricing: { input: 30.00, output: 60.00 },
      contextLength: 8192,
      capabilities: ['reasoning', 'analysis'],
      speed: 'slow',
      quality: 'very_good',
      bestFor: ['detailed reasoning', 'complex problem solving']
    });

    this._registerModel('gpt-3.5-turbo', {
      name: 'GPT-3.5 Turbo',
      description: 'Fast, cost-effective model for simpler tasks',
      pricing: { input: 0.50, output: 1.50 },
      contextLength: 16385,
      capabilities: ['chat', 'simple tasks'],
      speed: 'very_fast',
      quality: 'good',
      bestFor: ['chat', 'simple tasks', 'cost optimization']
    });

    // Reasoning Models
    this._registerModel('o1-preview', {
      name: 'o1-preview',
      description: 'Reasoning model designed to solve hard problems across domains',
      pricing: { input: 15.00, output: 60.00 },
      contextLength: 128000,
      capabilities: ['advanced reasoning', 'problem solving', 'mathematics'],
      speed: 'slow',
      quality: 'outstanding',
      reasoning: true,
      bestFor: ['complex reasoning', 'mathematics', 'scientific problems']
    });

    this._registerModel('o1-mini', {
      name: 'o1-mini',
      description: 'Faster and cheaper reasoning model, particularly effective at coding',
      pricing: { input: 3.00, output: 12.00 },
      contextLength: 128000,
      capabilities: ['reasoning', 'coding', 'mathematics'],
      speed: 'medium',
      quality: 'very_good',
      reasoning: true,
      bestFor: ['coding', 'mathematics', 'STEM reasoning']
    });

    // Future/Beta Models (if ENABLE_BETA_MODELS is true)
    if (process.env.ENABLE_BETA_MODELS === 'true') {
      this._registerModel('gpt-5', {
        name: 'GPT-5',
        description: 'Next-generation flagship model with enhanced capabilities',
        pricing: { input: 5.00, output: 20.00 }, // Estimated pricing
        contextLength: 256000,
        capabilities: ['advanced reasoning', 'multimodal', 'long context'],
        speed: 'medium',
        quality: 'exceptional',
        beta: true,
        bestFor: ['complex analysis', 'long documents', 'advanced reasoning']
      });

      this._registerModel('gpt-4.5-turbo', {
        name: 'GPT-4.5 Turbo',
        description: 'Enhanced GPT-4 with improved performance and capabilities',
        pricing: { input: 7.50, output: 22.50 }, // Estimated pricing
        contextLength: 128000,
        capabilities: ['enhanced reasoning', 'improved accuracy'],
        speed: 'fast',
        quality: 'excellent',
        beta: true,
        bestFor: ['enhanced analysis', 'improved accuracy tasks']
      });

      this._registerModel('o1', {
        name: 'o1',
        description: 'Full reasoning model with enhanced problem-solving capabilities',
        pricing: { input: 20.00, output: 80.00 }, // Estimated pricing
        contextLength: 200000,
        capabilities: ['superior reasoning', 'complex problem solving', 'research'],
        speed: 'slow',
        quality: 'exceptional',
        reasoning: true,
        beta: true,
        bestFor: ['research', 'complex reasoning', 'scientific analysis']
      });
    }
  }

  _buildOptimizationPrompt(contractData, context) {
    return `Please analyze this Bloom Energy contract and provide optimization recommendations:

Contract Details:
- Client: ${contractData.client || 'N/A'}
- Capacity: ${contractData.capacity || 'N/A'}kW
- Term: ${contractData.term || 'N/A'} years
- System Type: ${contractData.systemType || 'N/A'}
- Base Rate: $${contractData.financial?.baseRate || 'N/A'}/kWh
- Escalation: ${contractData.financial?.escalation || 'N/A'}%/year
- Output Warranty: ${contractData.operating?.outputWarranty || 'N/A'}%
- Efficiency: ${contractData.operating?.efficiency || 'N/A'}%

Context: ${JSON.stringify(context, null, 2)}

Provide specific recommendations for:
1. Pricing optimization
2. Risk mitigation  
3. Performance improvements
4. Any red flags or concerns

Format your response as actionable bullet points.`;
  }

  _buildAnalysisPrompt(contractData) {
    return `Analyze this Bloom Energy contract for patterns and insights:

${JSON.stringify(contractData, null, 2)}

Provide analysis on:
1. Market positioning (how does this compare to typical contracts?)
2. Risk assessment
3. Unusual parameters or configurations
4. Optimization opportunities
5. Compliance with Bloom Energy standards`;
  }

  _buildSuggestionsPrompt(partialData) {
    return `Based on this partial contract information, suggest appropriate values for missing fields:

Current Data:
${JSON.stringify(partialData, null, 2)}

Please suggest:
1. Appropriate capacity if not specified
2. Recommended contract term
3. Competitive base rate
4. Suitable escalation rate
5. Technical specifications that make sense for this configuration

Consider industry standards and Bloom Energy best practices.`;
  }

  _generateMockResponse(input, context) {
    const mockResponses = {
      chat: {
        message: 'I can help you with contract optimization and analysis using OpenAI GPT models. What specific aspect would you like to focus on?',
        usage: { inputTokens: 50, outputTokens: 100, totalTokens: 150, cost: 0.001 },
        model: 'mock',
        provider: this.name,
        timestamp: new Date().toISOString()
      },
      optimization: {
        message: `Based on the contract parameters, I recommend optimizing the pricing structure and considering longer terms for better economics.`,
        suggestions: [
          'Consider negotiating base rate based on current market conditions',
          'Evaluate extending contract term for improved financial returns',
          'Review escalation rate alignment with inflation projections'
        ],
        actions: [
          {
            type: 'optimize_pricing',
            label: 'Apply Pricing Recommendations',
            data: { reasoning: 'Mock recommendation - API not configured' }
          }
        ],
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300, cost: 0.003 },
        model: 'mock',
        provider: this.name,
        timestamp: new Date().toISOString()
      },
      analysis: {
        message: 'Contract analysis shows standard parameters within typical ranges for this system size and application.',
        insights: ['Standard contract configuration', 'Competitive pricing structure'],
        alerts: [],
        riskScore: 25,
        usage: { inputTokens: 150, outputTokens: 150, totalTokens: 300, cost: 0.003 },
        model: 'mock',
        provider: this.name,
        timestamp: new Date().toISOString()
      },
      suggestion: {
        message: 'Based on similar contracts, here are my suggestions for the missing parameters.',
        suggestions: {
          capacity: '975kW (3 servers of 325kW each)',
          term: '15 years (optimal balance of economics and flexibility)',
          baseRate: '$0.135/kWh (competitive market rate)',
          escalation: '2.5%/year (aligned with inflation expectations)'
        },
        confidence: 0.75,
        usage: { inputTokens: 80, outputTokens: 120, totalTokens: 200, cost: 0.002 },
        model: 'mock',
        provider: this.name,
        timestamp: new Date().toISOString()
      }
    };

    return mockResponses[context] || mockResponses.chat;
  }
}