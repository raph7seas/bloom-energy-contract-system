import Anthropic from '@anthropic-ai/sdk';

class AIService {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    this.model = 'claude-3-5-sonnet-20241022';
    this.maxTokens = 1500;
    
    // System prompts for different contexts
    this.systemPrompts = {
      contractOptimization: `You are an expert in Bloom Energy fuel cell contracts and energy service agreements. 
        You help optimize contract parameters, suggest improvements, and provide analysis.
        
        Key constraints to remember:
        - Capacity must be in multiples of 325kW (range: 325kW - 3900kW)
        - Contract terms: 5, 10, 15, or 20 years
        - Escalation rates: typically 2.0% - 5.0% annually
        - System types: Power Purchase (PP), Microgrid (MG), Advanced Microgrid (AMG), On-site Generation (OG)
        - Voltage levels: 208V, 480V, 4.16kV, 13.2kV, 34.5kV
        - Components: RI (Renewable Integration), AC (Advanced Controls), UC (Utility Connections), BESS (Battery Energy Storage)
        
        Provide concise, actionable recommendations focused on optimizing value, risk mitigation, and operational efficiency.`,
      
      contractAnalysis: `You are analyzing Bloom Energy contracts for patterns, anomalies, and insights.
        Look for trends in pricing, terms, system configurations, and identify opportunities for standardization.
        Provide data-driven insights and flag any unusual parameters that might need review.`,
      
      generalAssistant: `You are a helpful assistant for the Bloom Energy Contract Learning & Rules Management System.
        You help users create, analyze, and optimize energy service contracts. Provide clear, actionable guidance
        while adhering to Bloom Energy's business rules and industry best practices.`
    };
  }

  /**
   * Check if API key is configured
   */
  isConfigured() {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  /**
   * Generate contract optimization suggestions
   */
  async optimizeContract(contractData, context = {}) {
    if (!this.isConfigured()) {
      return this.generateMockResponse('optimization', contractData);
    }

    try {
      const prompt = this.buildOptimizationPrompt(contractData, context);
      
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this.systemPrompts.contractOptimization,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return this.parseOptimizationResponse(response.content[0].text);
    } catch (error) {
      console.error('AI optimization failed:', error);
      return this.generateMockResponse('optimization', contractData);
    }
  }

  /**
   * Analyze contract for insights and anomalies
   */
  async analyzeContract(contractData) {
    if (!this.isConfigured()) {
      return this.generateMockResponse('analysis', contractData);
    }

    try {
      const prompt = this.buildAnalysisPrompt(contractData);
      
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this.systemPrompts.contractAnalysis,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return this.parseAnalysisResponse(response.content[0].text);
    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.generateMockResponse('analysis', contractData);
    }
  }

  /**
   * General AI assistant chat
   */
  async chat(message, context = {}, conversationHistory = []) {
    if (!this.isConfigured()) {
      return this.generateMockChatResponse(message);
    }

    try {
      // Build conversation messages
      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: message
        }
      ];

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this.systemPrompts.generalAssistant,
        messages: messages
      });

      return {
        message: response.content[0].text,
        usage: response.usage,
        model: response.model,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('AI chat failed:', error);
      return this.generateMockChatResponse(message);
    }
  }

  /**
   * Streaming AI assistant chat
   */
  async chatStream(message, context = {}, conversationHistory = []) {
    if (!this.isConfigured()) {
      return this.generateMockStreamResponse(message);
    }

    try {
      // Build conversation messages
      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: message
        }
      ];

      const stream = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this.systemPrompts.generalAssistant,
        messages: messages,
        stream: true
      });

      return stream;
    } catch (error) {
      console.error('AI streaming chat failed:', error);
      return this.generateMockStreamResponse(message);
    }
  }

  /**
   * Streaming contract optimization
   */
  async optimizeContractStream(contractData, context = {}) {
    if (!this.isConfigured()) {
      return this.generateMockStreamResponse('optimization');
    }

    try {
      const prompt = this.buildOptimizationPrompt(contractData, context);
      
      const stream = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this.systemPrompts.contractOptimization,
        messages: [{
          role: 'user',
          content: prompt
        }],
        stream: true
      });

      return stream;
    } catch (error) {
      console.error('AI streaming optimization failed:', error);
      return this.generateMockStreamResponse('optimization');
    }
  }

  /**
   * Suggest contract terms based on partial data
   */
  async suggestTerms(partialContractData) {
    if (!this.isConfigured()) {
      return this.generateMockSuggestions(partialContractData);
    }

    try {
      const prompt = this.buildSuggestionsPrompt(partialContractData);
      
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 1000,
        system: this.systemPrompts.contractOptimization,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return this.parseSuggestionsResponse(response.content[0].text);
    } catch (error) {
      console.error('AI suggestions failed:', error);
      return this.generateMockSuggestions(partialContractData);
    }
  }

  // Private helper methods

  buildOptimizationPrompt(contractData, context) {
    return `Please analyze this Bloom Energy contract and provide optimization recommendations:

Contract Details:
- Client: ${contractData.client}
- Capacity: ${contractData.capacity}kW
- Term: ${contractData.term} years
- System Type: ${contractData.systemType}
- Base Rate: $${contractData.financial?.baseRate}/kWh
- Escalation: ${contractData.financial?.escalation}%/year
- Output Warranty: ${contractData.operating?.outputWarranty}%
- Efficiency: ${contractData.operating?.efficiency}%

Context: ${JSON.stringify(context, null, 2)}

Provide specific recommendations for:
1. Pricing optimization
2. Risk mitigation
3. Performance improvements
4. Any red flags or concerns

Format your response as actionable bullet points.`;
  }

  buildAnalysisPrompt(contractData) {
    return `Analyze this Bloom Energy contract for patterns and insights:

${JSON.stringify(contractData, null, 2)}

Provide analysis on:
1. Market positioning (how does this compare to typical contracts?)
2. Risk assessment
3. Unusual parameters or configurations
4. Optimization opportunities
5. Compliance with Bloom Energy standards`;
  }

  buildSuggestionsPrompt(partialData) {
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

  parseOptimizationResponse(text) {
    return {
      message: text,
      suggestions: this.extractSuggestions(text),
      actions: [
        {
          type: 'optimize_pricing',
          label: 'Apply Pricing Recommendations',
          data: this.extractPricingRecommendations(text)
        },
        {
          type: 'adjust_terms',
          label: 'Adjust Contract Terms',
          data: this.extractTermRecommendations(text)
        }
      ]
    };
  }

  parseAnalysisResponse(text) {
    return {
      message: text,
      insights: this.extractInsights(text),
      alerts: this.extractAlerts(text),
      score: this.calculateRiskScore(text)
    };
  }

  parseSuggestionsResponse(text) {
    return {
      message: text,
      suggestions: this.extractFieldSuggestions(text),
      confidence: 0.8
    };
  }

  extractSuggestions(text) {
    // Simple extraction - in production, would use more sophisticated parsing
    const suggestions = [];
    const lines = text.split('\n');
    
    lines.forEach(line => {
      if (line.includes('recommend') || line.includes('suggest')) {
        suggestions.push(line.trim());
      }
    });
    
    return suggestions.slice(0, 5); // Top 5 suggestions
  }

  extractPricingRecommendations(text) {
    // Extract pricing-related recommendations
    return {
      baseRate: null,
      escalation: null,
      reasoning: 'Based on AI analysis'
    };
  }

  extractTermRecommendations(text) {
    // Extract term-related recommendations
    return {
      term: null,
      warranty: null,
      reasoning: 'Based on AI analysis'
    };
  }

  extractInsights(text) {
    return ['AI-generated insights based on contract analysis'];
  }

  extractAlerts(text) {
    return text.toLowerCase().includes('concern') || text.toLowerCase().includes('risk') 
      ? ['Potential issues identified in contract terms']
      : [];
  }

  calculateRiskScore(text) {
    // Simple risk scoring based on text analysis
    const riskWords = ['risk', 'concern', 'unusual', 'high', 'problem'];
    const riskCount = riskWords.reduce((count, word) => {
      return count + (text.toLowerCase().match(new RegExp(word, 'g')) || []).length;
    }, 0);
    
    return Math.min(riskCount * 10, 100); // Cap at 100
  }

  extractFieldSuggestions(text) {
    return {
      capacity: null,
      term: null,
      baseRate: null,
      escalation: null
    };
  }

  // Mock response generators for fallback

  generateMockResponse(type, contractData) {
    switch (type) {
      case 'optimization':
        return {
          message: `Based on the contract parameters for ${contractData.client}, I recommend optimizing the base rate and considering a longer term to improve economics. The ${contractData.capacity}kW system appears well-sized for the application.`,
          suggestions: [
            'Consider negotiating base rate based on market conditions',
            'Evaluate extending contract term for better economics',
            'Review escalation rate alignment with inflation projections'
          ],
          actions: [
            {
              type: 'optimize_pricing',
              label: 'Apply Pricing Recommendations',
              data: { reasoning: 'Mock recommendation - API not configured' }
            }
          ]
        };
      
      case 'analysis':
        return {
          message: 'Contract analysis shows standard parameters within typical ranges for this system size and application.',
          insights: ['Standard contract configuration', 'Competitive pricing structure'],
          alerts: [],
          score: 25
        };
      
      default:
        return { message: 'AI service not configured. Using mock response.' };
    }
  }

  generateMockChatResponse(message) {
    const responses = [
      'I can help you with contract optimization and analysis. What specific aspect would you like to focus on?',
      'For contract suggestions, I\'d recommend reviewing the capacity requirements and financial terms.',
      'The Bloom Energy system configuration looks appropriate for your requirements.',
      'Consider the long-term economics when setting escalation rates and contract terms.'
    ];
    
    return {
      message: responses[Math.floor(Math.random() * responses.length)],
      usage: null,
      model: 'mock',
      timestamp: new Date().toISOString()
    };
  }

  generateMockSuggestions(partialData) {
    return {
      message: 'Based on similar contracts, here are my suggestions for the missing parameters.',
      suggestions: {
        capacity: '975kW (3 servers of 325kW each)',
        term: '15 years (optimal balance of economics and flexibility)',
        baseRate: '$0.135/kWh (competitive market rate)',
        escalation: '2.5%/year (aligned with inflation expectations)'
      },
      confidence: 0.7
    };
  }

  /**
   * Generate mock streaming response for fallback
   */
  async* generateMockStreamResponse(type) {
    const responses = {
      optimization: [
        'Based on the contract parameters provided, I can offer several optimization recommendations.\n\n',
        '**Pricing Optimization:**\n',
        '- The current base rate appears competitive for this system size\n',
        '- Consider negotiating the escalation rate based on current inflation projections\n',
        '- Evaluate volume discounts for multi-year commitments\n\n',
        '**Risk Mitigation:**\n',
        '- Review force majeure clauses for comprehensive coverage\n',
        '- Ensure appropriate insurance requirements are specified\n',
        '- Consider performance guarantees with clear measurement criteria\n\n',
        '**Performance Improvements:**\n',
        '- Optimize system configuration for peak efficiency\n',
        '- Include provisions for technology upgrades\n',
        '- Establish clear maintenance and support protocols\n\n',
        'These recommendations should help optimize both economic and operational aspects of the contract.'
      ],
      default: [
        'I\'m here to help with your Bloom Energy contract questions. ',
        'I can assist with contract optimization, analysis, and provide suggestions based on industry best practices.\n\n',
        'What specific aspect would you like to focus on today? ',
        'I can help with pricing, terms, technical specifications, or general contract guidance.'
      ]
    };

    const chunks = responses[type] || responses.default;
    
    for (const chunk of chunks) {
      yield {
        type: 'content_block_delta',
        delta: { text: chunk },
        index: 0
      };
      
      // Simulate streaming delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    yield {
      type: 'message_stop',
      usage: {
        input_tokens: 100,
        output_tokens: 200
      }
    };
  }
}

export default new AIService();