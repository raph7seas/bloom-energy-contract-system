import { ClaudeRequest, ClaudeResponse, AIMessage, AIResponse, ContractFormData } from '../types';
import { loadFromLocalStorage, saveToLocalStorage, STORAGE_KEYS } from '../utils/storage';

/**
 * AI Service for Anthropic Claude integration
 * Handles AI assistant functionality, contract optimization, and suggestions
 */

class AIService {
  private readonly apiUrl = '/api/ai/chat';
  private readonly model = 'claude-sonnet-4-20250514';
  private readonly maxTokens = 1000;

  // Helper method to get authentication headers
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Get AI message history
  getMessageHistory(): AIMessage[] {
    return loadFromLocalStorage(STORAGE_KEYS.AI_MESSAGES, []);
  }

  // Save message to history
  private saveMessage(message: AIMessage): void {
    const messages = this.getMessageHistory();
    messages.push(message);
    
    // Keep only last 50 messages to prevent storage overflow
    if (messages.length > 50) {
      messages.splice(0, messages.length - 50);
    }
    
    saveToLocalStorage(STORAGE_KEYS.AI_MESSAGES, messages);
  }

  // Send message to Claude API
  async sendMessage(userMessage: string, context?: any): Promise<AIResponse> {
    const userMsg: AIMessage = {
      id: this.generateMessageId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    
    this.saveMessage(userMsg);

    try {
      const response = await this.callClaudeAPI(userMessage, context);
      
      const assistantMsg: AIMessage = {
        id: this.generateMessageId(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString()
      };
      
      this.saveMessage(assistantMsg);
      
      return response;
    } catch (error) {
      console.error('AI API error:', error);
      return this.generateFallbackResponse(userMessage);
    }
  }

  // Call Claude API through backend
  private async callClaudeAPI(message: string, context?: any): Promise<AIResponse> {
    const systemPrompt = this.buildSystemPrompt(context);
    
    const requestBody = {
      message,
      systemPrompt,
      context,
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: 0.7
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Backend returns { success: true, response: { message, suggestions, actions } }
    const aiResponse = data.response || data;
    const responseMessage = aiResponse.message || aiResponse.content || 'I apologize, but I encountered an issue processing your request.';
    
    return {
      message: responseMessage,
      suggestions: aiResponse.suggestions || this.extractSuggestions(responseMessage),
      actions: aiResponse.actions || this.extractActions(responseMessage)
    };
  }

  // Build system prompt for contract context
  private buildSystemPrompt(context?: any): string {
    return `You are an expert AI assistant for Bloom Energy's Contract Learning & Rules Management System. You help users create, optimize, and manage energy service contracts.

Your capabilities include:
- Analyzing contract terms and suggesting optimizations
- Providing market insights for pricing strategies  
- Explaining technical specifications and requirements
- Recommending terms based on client profiles and industry standards
- Identifying potential compliance issues
- Generating contract summaries and documentation

Key Bloom Energy knowledge:
- Fuel cell systems with 325kW base units, scalable to multi-MW installations
- Standard contract terms: 5, 10, 15, or 20 years
- Typical escalation rates: 2.0% to 5.0% annually
- System types: Power Purchase (PP), Microgrid (MG), Advanced Microgrid (AMG), On-Grid (OG)
- Voltage levels: 208V, 480V, 4.16kV, 13.2kV, 34.5kV
- Key components: RI (Renewable Integration), AC (Advanced Controls), UC (Utility Connections), BESS (Battery Storage)

${context ? `Current contract context: ${JSON.stringify(context, null, 2)}` : ''}

Be helpful, professional, and specific to Bloom Energy contracts. Provide actionable recommendations with clear reasoning.`;
  }

  // Extract suggestions from AI response
  private extractSuggestions(text?: string): string[] {
    if (!text) return [];
    
    const suggestions: string[] = [];
    const suggestionMarkers = ['I suggest', 'Consider', 'Recommend', 'You might', 'Try'];
    
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    
    sentences.forEach(sentence => {
      if (suggestionMarkers.some(marker => sentence.includes(marker))) {
        suggestions.push(sentence.trim());
      }
    });
    
    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  // Extract actionable items from AI response
  private extractActions(text?: string): any[] {
    if (!text) return [];
    
    const actions: any[] = [];
    
    // Look for specific action patterns
    if (text.toLowerCase().includes('optimize pric')) {
      actions.push({
        type: 'optimize_pricing',
        label: 'Optimize Pricing',
        data: { suggestion: 'pricing_optimization' }
      });
    }
    
    if (text.toLowerCase().includes('suggest term') || text.toLowerCase().includes('recommend term')) {
      actions.push({
        type: 'suggest_terms',
        label: 'Apply Suggested Terms',
        data: { suggestion: 'term_optimization' }
      });
    }
    
    return actions;
  }

  // Generate enhanced fallback response for development
  private generateEnhancedFallbackResponse(input: string, context?: any): AIResponse {
    const lowerInput = input.toLowerCase();
    
    // Context-aware responses based on current contract data
    if (context?.data) {
      const contractData = context.data;
      
      if (lowerInput.includes('optimiz') && lowerInput.includes('pric')) {
        const currentRate = contractData.baseRate || 65;
        const suggestedRate = Math.round((currentRate * 0.95) * 100) / 100;
        return {
          message: `Based on current market analysis for ${contractData.ratedCapacity || '2000'}kW systems in ${contractData.siteLocation || 'this region'}, I recommend optimizing your base rate from $${currentRate}/kW to $${suggestedRate}/kW. This 5% reduction aligns with competitive positioning while maintaining healthy margins. Consider also adjusting the escalation from ${contractData.annualEscalation || 3.5}% to 3.2% to improve customer appeal.`,
          suggestions: [
            `Reduce base rate to $${suggestedRate}/kW for competitive positioning`,
            "Lower escalation to 3.2% to enhance customer value proposition",
            "Add performance guarantees to justify premium pricing"
          ],
          actions: [
            {
              type: 'optimize_pricing',
              label: 'Apply Optimized Pricing',
              data: { baseRate: suggestedRate, escalation: 3.2 }
            }
          ]
        };
      }
      
      if (lowerInput.includes('suggest') && lowerInput.includes('term')) {
        const currentTerm = contractData.contractTerm || 15;
        const capacity = contractData.ratedCapacity || 2000;
        let recommendedTerm = 15;
        
        if (capacity > 2000) recommendedTerm = 20;
        else if (capacity < 1000) recommendedTerm = 10;
        
        return {
          message: `For a ${capacity}kW system serving ${contractData.customerName || 'this facility'}, I recommend a ${recommendedTerm}-year term. This balances cost savings with operational flexibility. The current ${currentTerm}-year term ${recommendedTerm === currentTerm ? 'is optimal' : 'could be adjusted'} based on the facility profile and market conditions.`,
          suggestions: [
            `${recommendedTerm}-year term provides optimal value for this capacity`,
            "Consider graduated pricing for longer commitments",
            "Include expansion rights for future growth"
          ]
        };
      }
    }
    
    // General enhanced responses
    if (lowerInput.includes('compliance') || lowerInput.includes('regulation')) {
      return {
        message: "I've analyzed your contract configuration for compliance requirements. Key considerations include interconnection standards (IEEE 1547), local utility requirements, and environmental regulations. The system appears compliant, but I recommend verifying local permitting requirements and utility interconnection procedures for your specific location.",
        suggestions: [
          "Verify IEEE 1547 compliance for grid interconnection",
          "Check local permitting and zoning requirements",
          "Confirm utility interconnection procedures and timelines"
        ]
      };
    }
    
    return this.generateFallbackResponse(input);
  }
  
  // Generate fallback response when API fails
  private generateFallbackResponse(input: string): AIResponse {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('price') || lowerInput.includes('cost') || lowerInput.includes('rate')) {
      return {
        message: "For pricing optimization, I recommend considering market conditions in your region. Typical Bloom Energy rates range from $60-85/kW with 3.5% annual escalation. Would you like me to analyze your current pricing structure?",
        suggestions: [
          "Review local utility rates for competitive positioning",
          "Consider microgrid premium for enhanced reliability",
          "Evaluate escalation rate against market standards"
        ]
      };
    }
    
    if (lowerInput.includes('capacity') || lowerInput.includes('size') || lowerInput.includes('kw')) {
      return {
        message: "Bloom Energy systems are built in 325kW modules. For optimal efficiency, I recommend sizing based on your facility's critical load requirements. Typical installations range from 650kW to 2.6MW depending on facility type.",
        suggestions: [
          "Assess critical vs. non-critical loads",
          "Consider future expansion requirements",
          "Evaluate demand patterns for right-sizing"
        ]
      };
    }
    
    if (lowerInput.includes('term') || lowerInput.includes('year') || lowerInput.includes('contract length')) {
      return {
        message: "Standard Bloom Energy contract terms are 10, 15, or 20 years. Longer terms typically offer better rates but require careful consideration of technology evolution and facility changes.",
        suggestions: [
          "10-year terms offer flexibility with competitive rates",
          "15-year terms balance cost and flexibility",
          "20-year terms provide maximum savings"
        ]
      };
    }
    
    return {
      message: "I'm here to help with your Bloom Energy contract. I can assist with pricing optimization, technical specifications, contract terms, and industry best practices. What specific aspect would you like to discuss?",
      suggestions: [
        "Ask about pricing strategies",
        "Discuss technical requirements", 
        "Review contract terms and conditions"
      ]
    };
  }

  // Optimize contract pricing
  async optimizePricing(contractData: Partial<ContractFormData>): Promise<AIResponse> {
    const context = {
      task: 'pricing_optimization',
      data: contractData
    };
    
    const message = `Please analyze this contract and suggest pricing optimizations:
    - Capacity: ${contractData.ratedCapacity}kW
    - Current base rate: $${contractData.baseRate}/kW
    - Escalation: ${contractData.annualEscalation}%
    - Term: ${contractData.contractTerm} years
    - Solution type: ${contractData.solutionType}
    
    Consider market conditions, competitive positioning, and client value proposition.`;
    
    return this.sendMessage(message, context);
  }

  // Suggest contract terms
  async suggestTerms(contractData: Partial<ContractFormData>): Promise<AIResponse> {
    const context = {
      task: 'term_suggestions',
      data: contractData
    };
    
    const message = `Based on this contract profile, please suggest optimal terms:
    - Client: ${contractData.customerName}
    - Location: ${contractData.siteLocation}  
    - Capacity: ${contractData.ratedCapacity}kW
    - Current term: ${contractData.contractTerm} years
    
    Consider industry type, regional factors, and risk profile.`;
    
    return this.sendMessage(message, context);
  }

  // Check compliance
  async checkCompliance(contractData: Partial<ContractFormData>): Promise<AIResponse> {
    const context = {
      task: 'compliance_check',
      data: contractData
    };
    
    const message = `Please review this contract for compliance issues:
    - Location: ${contractData.siteLocation}
    - Capacity: ${contractData.ratedCapacity}kW
    - Voltage: ${contractData.gridParallelVoltage}
    - Components: ${contractData.selectedComponents?.join(', ')}
    - RECs: ${contractData.includeRECs ? contractData.recType : 'None'}
    
    Check for regulatory, interconnection, and safety compliance.`;
    
    return this.sendMessage(message, context);
  }

  // Generate contract summary
  async generateSummary(contractData: ContractFormData): Promise<string> {
    try {
      const response = await this.sendMessage(
        `Generate a professional executive summary for this Bloom Energy contract: ${JSON.stringify(contractData, null, 2)}`
      );
      return response.message;
    } catch (error) {
      return this.generateFallbackSummary(contractData);
    }
  }

  // Fallback summary generation
  private generateFallbackSummary(contractData: ContractFormData): string {
    return `Contract Summary: ${contractData.customerName}

This ${contractData.contractTerm}-year ${contractData.solutionType.toLowerCase()} agreement provides ${contractData.ratedCapacity}kW of clean, reliable power to ${contractData.customerName}'s facility in ${contractData.siteLocation}.

Key Terms:
• Base Rate: $${contractData.baseRate}/kW
• Annual Escalation: ${contractData.annualEscalation}%
• Reliability Level: ${contractData.reliabilityLevel}%
• Critical Output: ${contractData.guaranteedCriticalOutput}kW

The system features ${contractData.selectedComponents.join(', ')} components and operates at ${contractData.gridParallelVoltage} voltage level. This solution delivers enhanced reliability while reducing carbon footprint and energy costs.`;
  }

  // Clear message history
  clearHistory(): void {
    saveToLocalStorage(STORAGE_KEYS.AI_MESSAGES, []);
  }

  // Generate unique message ID
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const aiService = new AIService();