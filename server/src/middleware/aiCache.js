import cacheService from '../services/cacheService.js';

/**
 * AI Cache Middleware
 * Automatically caches AI responses based on request parameters
 */

/**
 * Generic cache middleware factory for AI endpoints
 */
export const createAICacheMiddleware = (type, options = {}) => {
  return async (req, res, next) => {
    const {
      skipCache = false,
      skipCacheSet = false,
      customKeyGenerator = null,
      ttl = null
    } = options;

    // Skip caching if explicitly disabled or for streaming requests
    if (skipCache || req.headers.accept === 'text/event-stream') {
      return next();
    }

    try {
      // Determine cache key input based on request
      let input;
      let cacheOptions = {
        modelId: req.body?.modelId,
        provider: req.body?.provider,
        context: req.body?.context,
        preferences: req.body?.preferences
      };

      switch (type) {
        case 'chat':
          input = {
            message: req.body?.message,
            conversationHistory: req.body?.conversationHistory || []
          };
          break;
        case 'optimization':
          input = req.body?.contractData;
          cacheOptions.context = req.body?.context;
          break;
        case 'analysis':
          input = req.body?.contractData;
          break;
        case 'suggestions':
          input = req.body?.partialData;
          break;
        default:
          input = req.body;
      }

      // Use custom key generator if provided
      if (customKeyGenerator) {
        input = customKeyGenerator(req);
      }

      // Try to get cached response
      const cachedResponse = await cacheService.get(type, input, cacheOptions);
      
      if (cachedResponse) {
        // Return cached response
        return res.json({
          success: true,
          [type === 'chat' ? 'response' : type]: cachedResponse,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      // Store original json method
      const originalJson = res.json.bind(res);
      
      // Override json method to cache the response
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode === 200 && data.success && !skipCacheSet) {
          // Extract the AI response data
          let responseData;
          if (type === 'chat') {
            responseData = data.response;
          } else {
            responseData = data[type];
          }

          if (responseData) {
            // Cache the response asynchronously
            setImmediate(async () => {
              try {
                await cacheService.set(type, input, responseData, {
                  ...cacheOptions,
                  ttl
                });
              } catch (error) {
                console.error('Failed to cache AI response:', error);
              }
            });
          }
        }
        
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('AI cache middleware error:', error);
      next(); // Continue without caching on error
    }
  };
};

/**
 * Specific cache middleware for different AI endpoints
 */
export const chatCacheMiddleware = createAICacheMiddleware('chat', {
  ttl: 1800 // 30 minutes
});

export const optimizationCacheMiddleware = createAICacheMiddleware('optimization', {
  ttl: 3600 // 1 hour
});

export const analysisCacheMiddleware = createAICacheMiddleware('analysis', {
  ttl: 7200 // 2 hours
});

export const suggestionsCacheMiddleware = createAICacheMiddleware('suggestions', {
  ttl: 1800 // 30 minutes
});

/**
 * Cache invalidation middleware
 * Invalidates cache when contract data changes
 */
export const contractUpdateCacheInvalidation = async (req, res, next) => {
  // Store original json method
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    // If contract was successfully updated, invalidate related cache
    if (res.statusCode === 200 && data.success) {
      setImmediate(async () => {
        try {
          const contractId = req.params?.id || data.contract?.id;
          if (contractId) {
            // Clear optimization and analysis cache for this contract
            await cacheService.clearType('optimization');
            await cacheService.clearType('analysis');
            console.log(`Cache invalidated for contract updates: ${contractId}`);
          }
        } catch (error) {
          console.error('Cache invalidation error:', error);
        }
      });
    }
    
    return originalJson(data);
  };

  next();
};

/**
 * Manual cache control middleware
 * Allows explicit cache control via headers or query params
 */
export const cacheControlMiddleware = (req, res, next) => {
  // Check for cache control headers/params
  const skipCache = req.headers['x-skip-cache'] === 'true' || 
                   req.query.skipCache === 'true';
  
  const forceRefresh = req.headers['x-force-refresh'] === 'true' || 
                      req.query.forceRefresh === 'true';

  // Set flags for other middleware
  req.cacheControl = {
    skipCache: skipCache || forceRefresh,
    skipCacheSet: skipCache && !forceRefresh
  };

  next();
};

/**
 * Cache warming middleware
 * Pre-populates cache with common queries
 */
export const cacheWarmingMiddleware = {
  async warmCommonQueries() {
    try {
      const commonQueries = [
        {
          type: 'chat',
          input: { message: 'What are typical Bloom Energy contract terms?' },
          options: {}
        },
        {
          type: 'suggestions',
          input: { capacity: 650, systemType: 'PP' },
          options: {}
        }
      ];

      console.log('Starting cache warming...');
      
      for (const query of commonQueries) {
        const cached = await cacheService.get(query.type, query.input, query.options);
        if (!cached) {
          console.log(`Cache warming needed for ${query.type}: ${JSON.stringify(query.input).slice(0, 50)}...`);
          // Note: In a real implementation, you would make actual AI calls here
          // For now, we just log what needs warming
        }
      }

      console.log('Cache warming completed');
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  }
};

/**
 * Cache statistics middleware
 * Adds cache stats to response headers
 */
export const cacheStatsMiddleware = (req, res, next) => {
  const stats = cacheService.getStats();
  
  res.setHeader('X-Cache-Hit-Rate', stats.hitRate);
  res.setHeader('X-Cache-Backend', stats.backend);
  
  next();
};

/**
 * Development cache utilities
 */
export const cacheDevUtils = {
  /**
   * Clear cache endpoint handler
   */
  async clearCache(req, res) {
    try {
      const { type } = req.params;
      
      if (type === 'all') {
        await cacheService.clearAll();
        res.json({ success: true, message: 'All cache cleared' });
      } else if (type) {
        await cacheService.clearType(type);
        res.json({ success: true, message: `Cache cleared for type: ${type}` });
      } else {
        res.status(400).json({ error: 'Cache type required' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Get cache statistics endpoint handler
   */
  async getCacheStats(req, res) {
    try {
      const stats = cacheService.getStats();
      const health = await cacheService.getHealth();
      
      res.json({
        success: true,
        stats,
        health
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Cache health check endpoint handler
   */
  async getCacheHealth(req, res) {
    try {
      const health = await cacheService.getHealth();
      res.json(health);
    } catch (error) {
      res.status(500).json({ 
        status: 'unhealthy',
        error: error.message 
      });
    }
  }
};

export default {
  createAICacheMiddleware,
  chatCacheMiddleware,
  optimizationCacheMiddleware,
  analysisCacheMiddleware,
  suggestionsCacheMiddleware,
  contractUpdateCacheInvalidation,
  cacheControlMiddleware,
  cacheWarmingMiddleware,
  cacheStatsMiddleware,
  cacheDevUtils
};