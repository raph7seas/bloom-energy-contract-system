import express from 'express';
import { AIManager } from '../services/ai/AIManager.js';
import { captureAISuggestionInteraction } from '../middleware/learningMiddleware.js';
import { 
  chatCacheMiddleware,
  optimizationCacheMiddleware,
  analysisCacheMiddleware,
  suggestionsCacheMiddleware,
  cacheControlMiddleware,
  cacheStatsMiddleware,
  cacheDevUtils
} from '../middleware/aiCache.js';

const router = express.Router();
const aiManager = new AIManager();

// Initialize AI Manager (ensure it's initialized before use)
router.use(async (req, res, next) => {
  if (!aiManager.initialized) {
    try {
      await aiManager.initialize();
    } catch (error) {
      console.error('Failed to initialize AI Manager:', error);
      return res.status(503).json({
        error: 'AI service temporarily unavailable',
        details: 'Failed to initialize AI providers'
      });
    }
  }
  next();
});

// Chat endpoint for AI assistant
router.post('/chat', cacheControlMiddleware, chatCacheMiddleware, async (req, res) => {
  try {
    const { 
      message, 
      context, 
      conversationHistory, 
      modelId, 
      provider, 
      preferences 
    } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Message is required and must be a string' 
      });
    }

    const response = await aiManager.chat(message, {
      context: context || {},
      conversationHistory: conversationHistory || [],
      modelId,
      provider,
      preferences: preferences || {}
    });

    res.json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message 
    });
  }
});

// Streaming chat endpoint for AI assistant
router.post('/chat/stream', async (req, res) => {
  try {
    const { 
      message, 
      context, 
      conversationHistory, 
      modelId, 
      provider, 
      preferences 
    } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Message is required and must be a string' 
      });
    }

    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type'
    });

    try {
      // Check if aiManager supports streaming
      if (aiManager.chatStream) {
        const stream = await aiManager.chatStream(message, {
          context: context || {},
          conversationHistory: conversationHistory || [],
          modelId,
          provider,
          preferences: preferences || {}
        });

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
            res.write(`data: ${JSON.stringify({ 
              type: 'content', 
              content: chunk.delta.text 
            })}\n\n`);
          } else if (chunk.type === 'message_stop') {
            res.write(`data: ${JSON.stringify({ 
              type: 'end', 
              usage: chunk.usage 
            })}\n\n`);
            break;
          }
        }
      } else {
        // Fallback to regular chat and simulate streaming
        const response = await aiManager.chat(message, {
          context: context || {},
          conversationHistory: conversationHistory || [],
          modelId,
          provider,
          preferences: preferences || {}
        });

        const words = response.response.message.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = words.slice(0, i + 1).join(' ');
          res.write(`data: ${JSON.stringify({ 
            type: 'content', 
            content: chunk 
          })}\n\n`);
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        res.write(`data: ${JSON.stringify({ 
          type: 'end',
          usage: response.usage 
        })}\n\n`);
      }
    } catch (streamError) {
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: streamError.message 
      })}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error('Streaming chat endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to process streaming chat message',
      details: error.message 
    });
  }
});

// Contract optimization endpoint
router.post('/optimize', cacheControlMiddleware, optimizationCacheMiddleware, async (req, res) => {
  try {
    const { 
      contractData, 
      context, 
      modelId, 
      provider, 
      preferences 
    } = req.body;
    
    if (!contractData) {
      return res.status(400).json({ 
        error: 'Contract data is required' 
      });
    }

    const optimization = await aiManager.optimize(contractData, {
      context: context || {},
      modelId,
      provider,
      preferences: preferences || {}
    });

    res.json({
      success: true,
      optimization,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Optimization endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to optimize contract',
      details: error.message 
    });
  }
});

// Streaming contract optimization endpoint
router.post('/optimize/stream', async (req, res) => {
  try {
    const { 
      contractData, 
      context, 
      modelId, 
      provider, 
      preferences 
    } = req.body;
    
    if (!contractData) {
      return res.status(400).json({ 
        error: 'Contract data is required' 
      });
    }

    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type'
    });

    try {
      // Check if aiManager supports streaming optimization
      if (aiManager.optimizeStream) {
        const stream = await aiManager.optimizeStream(contractData, {
          context: context || {},
          modelId,
          provider,
          preferences: preferences || {}
        });

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
            res.write(`data: ${JSON.stringify({ 
              type: 'optimization_content', 
              content: chunk.delta.text 
            })}\n\n`);
          } else if (chunk.type === 'message_stop') {
            res.write(`data: ${JSON.stringify({ 
              type: 'optimization_complete', 
              usage: chunk.usage 
            })}\n\n`);
            break;
          }
        }
      } else {
        // Fallback to regular optimization and simulate streaming
        const optimization = await aiManager.optimize(contractData, {
          context: context || {},
          modelId,
          provider,
          preferences: preferences || {}
        });

        const message = optimization.message || optimization.optimization?.message || 'Optimization complete';
        const words = message.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = words.slice(0, i + 1).join(' ');
          res.write(`data: ${JSON.stringify({ 
            type: 'optimization_content', 
            content: chunk 
          })}\n\n`);
          await new Promise(resolve => setTimeout(resolve, 75));
        }

        res.write(`data: ${JSON.stringify({ 
          type: 'optimization_complete',
          optimization: optimization,
          usage: optimization.usage 
        })}\n\n`);
      }
    } catch (streamError) {
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: streamError.message 
      })}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error('Streaming optimization endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to process streaming optimization',
      details: error.message 
    });
  }
});

// Contract analysis endpoint - supports both structured contract data and raw text
router.post('/analyze', cacheControlMiddleware, analysisCacheMiddleware, async (req, res) => {
  try {
    const {
      contractData,
      text,
      analysisType,
      modelId,
      provider,
      preferences
    } = req.body;

    // Support both text-based analysis (from document uploads) and structured data analysis
    if (!contractData && !text) {
      return res.status(400).json({
        error: 'Contract data or text is required'
      });
    }

    let analysis;

    // If text is provided, use it for analysis (document upload use case)
    if (text) {
      // For text-based analysis, we'll use the chat endpoint with a specialized prompt
      const prompt = `Analyze the following contract text and extract key information including:
- Contract type
- Parties involved
- Effective date
- Key terms and conditions
- Financial information
- Performance metrics
- Risk factors

Contract Text:
${text}

Please provide a structured analysis in JSON format.`;

      const chatResponse = await aiManager.chat(prompt, {
        context: { analysisType: analysisType || 'contract_extraction' },
        modelId,
        provider,
        preferences: preferences || {}
      });

      // Parse the AI response and structure it
      analysis = {
        success: true,
        analysis: chatResponse.response,
        extractedFromText: true,
        timestamp: new Date().toISOString()
      };
    } else {
      // Use structured contract data analysis
      analysis = await aiManager.analyze(contractData, {
        modelId,
        provider,
        preferences: preferences || {}
      });
    }

    res.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Analysis endpoint error:', error);
    res.status(500).json({
      error: 'Failed to analyze contract',
      details: error.message
    });
  }
});

// Suggest terms endpoint
router.post('/suggest', cacheControlMiddleware, suggestionsCacheMiddleware, captureAISuggestionInteraction, async (req, res) => {
  try {
    const { 
      partialData, 
      modelId, 
      provider, 
      preferences 
    } = req.body;
    
    if (!partialData) {
      return res.status(400).json({ 
        error: 'Partial contract data is required' 
      });
    }

    const suggestions = await aiManager.suggest(partialData, {
      modelId,
      provider,
      preferences: preferences || {}
    });

    res.json({
      success: true,
      suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Suggestions endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to generate suggestions',
      details: error.message 
    });
  }
});

// Quick actions endpoint
router.post('/actions/:actionType', async (req, res) => {
  try {
    const { actionType } = req.params;
    const { 
      contractData, 
      parameters, 
      modelId, 
      provider, 
      preferences 
    } = req.body;
    
    if (!contractData) {
      return res.status(400).json({ 
        error: 'Contract data is required' 
      });
    }

    const options = {
      modelId,
      provider,
      preferences: preferences || {},
      ...parameters
    };

    let result;
    
    switch (actionType) {
      case 'optimize_pricing':
        result = await aiManager.optimize(contractData, {
          ...options,
          context: { focus: 'pricing' }
        });
        break;
      
      case 'suggest_terms':
        result = await aiManager.suggest(contractData, options);
        break;
      
      case 'check_compliance':
        result = await aiManager.analyze(contractData, options);
        break;
      
      case 'generate_summary':
        result = await aiManager.chat(
          `Please provide a concise summary of this contract: ${JSON.stringify(contractData)}`,
          { ...options, context: { action: 'summary' } }
        );
        break;
      
      default:
        return res.status(400).json({ 
          error: `Unknown action type: ${actionType}` 
        });
    }

    res.json({
      success: true,
      actionType,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Action ${req.params.actionType} error:`, error);
    res.status(500).json({ 
      error: `Failed to execute action: ${req.params.actionType}`,
      details: error.message 
    });
  }
});

// Health check for AI service
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await aiManager.getHealthStatus();
    
    res.json({
      ...healthStatus,
      capabilities: [
        'multi_provider_chat',
        'contract_optimization',
        'contract_analysis',
        'term_suggestions',
        'cost_comparison',
        'model_selection',
        'usage_analytics'
      ]
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get providers and models
router.get('/providers', async (req, res) => {
  try {
    const providers = aiManager.getProviders();
    res.json({
      success: true,
      providers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get providers',
      details: error.message
    });
  }
});

// Get available models
router.get('/models', async (req, res) => {
  try {
    const filters = req.query;
    const models = aiManager.getModels(filters);
    res.json({
      success: true,
      models,
      filters: filters,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get models',
      details: error.message
    });
  }
});

// Compare model costs
router.post('/costs/compare', async (req, res) => {
  try {
    const { modelIds, inputTokens, outputTokens } = req.body;
    
    if (!modelIds || !Array.isArray(modelIds) || modelIds.length === 0) {
      return res.status(400).json({
        error: 'modelIds array is required'
      });
    }
    
    if (typeof inputTokens !== 'number' || typeof outputTokens !== 'number') {
      return res.status(400).json({
        error: 'inputTokens and outputTokens must be numbers'
      });
    }

    const comparison = aiManager.compareModelCosts(modelIds, inputTokens, outputTokens);
    
    res.json({
      success: true,
      comparison,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to compare costs',
      details: error.message
    });
  }
});

// Estimate costs for different text lengths
router.post('/costs/estimate', async (req, res) => {
  try {
    const { modelId, textLengths, options = {} } = req.body;
    
    if (!modelId) {
      return res.status(400).json({
        error: 'modelId is required'
      });
    }

    const estimates = aiManager.estimateCosts(modelId, textLengths, options);
    
    res.json({
      success: true,
      estimates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to estimate costs',
      details: error.message
    });
  }
});

// Calculate monthly projections
router.post('/costs/monthly', async (req, res) => {
  try {
    const { modelId, usage } = req.body;
    
    if (!modelId) {
      return res.status(400).json({
        error: 'modelId is required'
      });
    }

    const projection = aiManager.calculateMonthlyProjection(modelId, usage || {});
    
    res.json({
      success: true,
      projection,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to calculate monthly projection',
      details: error.message
    });
  }
});

// Analyze cost efficiency
router.post('/costs/efficiency', async (req, res) => {
  try {
    const { modelIds, useCases = {} } = req.body;
    
    if (!modelIds || !Array.isArray(modelIds)) {
      return res.status(400).json({
        error: 'modelIds array is required'
      });
    }

    const analysis = aiManager.analyzeCostEfficiency(modelIds, useCases);
    
    res.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to analyze cost efficiency',
      details: error.message
    });
  }
});

// Get model recommendations
router.post('/recommendations', async (req, res) => {
  try {
    const { useCase, preferences = {} } = req.body;
    
    if (!useCase) {
      return res.status(400).json({
        error: 'useCase is required'
      });
    }

    const recommendations = aiManager.getModelRecommendations(useCase, preferences);
    
    res.json({
      success: true,
      recommendations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get recommendations',
      details: error.message
    });
  }
});

// Get usage analytics
router.get('/analytics', async (req, res) => {
  try {
    const filters = req.query;
    const analytics = aiManager.getUsageAnalytics(filters);
    
    res.json({
      success: true,
      analytics,
      filters,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get analytics',
      details: error.message
    });
  }
});

// Refresh providers
router.post('/refresh', async (req, res) => {
  try {
    const results = await aiManager.refreshProviders();
    
    res.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to refresh providers',
      details: error.message
    });
  }
});

// Get AI service configuration (legacy compatibility)
router.get('/config', async (req, res) => {
  try {
    const healthStatus = await aiManager.getHealthStatus();
    const models = aiManager.getModels({ available: true });
    
    res.json({
      configured: healthStatus.initialized,
      providers: aiManager.getProviders(),
      availableModels: models.length,
      defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'anthropic',
      availableActions: [
        'optimize_pricing',
        'suggest_terms', 
        'check_compliance',
        'generate_summary'
      ],
      features: [
        'multi_provider_support',
        'cost_comparison',
        'model_recommendations',
        'usage_analytics',
        'real_time_pricing',
        'response_caching'
      ]
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get configuration',
      details: error.message
    });
  }
});

// Cache management endpoints
router.get('/cache/health', cacheDevUtils.getCacheHealth);
router.get('/cache/stats', cacheStatsMiddleware, cacheDevUtils.getCacheStats);
router.delete('/cache/clear/:type', cacheDevUtils.clearCache);
router.delete('/cache/clear', (req, res) => {
  req.params.type = 'all';
  cacheDevUtils.clearCache(req, res);
});

export default router;