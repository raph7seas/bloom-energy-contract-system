import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

/**
 * AI Response Cache Service
 * Provides intelligent caching for AI responses with different storage backends
 */
class CacheService {
  constructor() {
    this.useRedis = process.env.REDIS_URL || process.env.USE_REDIS === 'true';
    this.redisClient = null;
    this.memoryCache = new Map();
    this.cacheDir = process.env.CACHE_DIR || './cache';
    this.maxMemoryItems = parseInt(process.env.MAX_MEMORY_CACHE_ITEMS) || 1000;
    this.defaultTTL = parseInt(process.env.CACHE_TTL) || 3600; // 1 hour
    
    // AI-specific cache settings
    this.aiCacheSettings = {
      chat: { ttl: 1800, maxItems: 500 },        // 30 minutes
      optimization: { ttl: 3600, maxItems: 200 }, // 1 hour
      analysis: { ttl: 7200, maxItems: 100 },     // 2 hours
      suggestions: { ttl: 1800, maxItems: 300 }   // 30 minutes
    };

    this.initialized = false;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  async initialize() {
    try {
      if (this.useRedis) {
        await this.initializeRedis();
      } else {
        await this.initializeFileSystem();
      }
      this.initialized = true;
      console.log(`Cache service initialized: ${this.useRedis ? 'Redis' : 'Memory/File'}`);
    } catch (error) {
      console.error('Failed to initialize cache service:', error);
      // Fallback to memory cache
      this.useRedis = false;
      this.initialized = true;
    }
  }

  async initializeRedis() {
    try {
      const { createClient } = await import('redis');
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redisClient.on('error', (err) => {
        console.error('Redis client error:', err);
        this.stats.errors++;
      });
      
      await this.redisClient.connect();
    } catch (error) {
      console.warn('Redis not available, falling back to memory cache:', error.message);
      throw error;
    }
  }

  async initializeFileSystem() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create cache directory:', error);
      throw error;
    }
  }

  /**
   * Generate cache key for AI requests
   */
  generateCacheKey(type, input, options = {}) {
    const { modelId, provider, context = {}, preferences = {} } = options;
    
    const keyData = {
      type,
      input: typeof input === 'string' ? input : JSON.stringify(input),
      modelId: modelId || 'default',
      provider: provider || 'default',
      contextHash: this.hashObject(context),
      preferencesHash: this.hashObject(preferences)
    };

    const keyString = JSON.stringify(keyData);
    const hash = crypto.createHash('sha256').update(keyString).digest('hex');
    
    return `ai:${type}:${hash}`;
  }

  /**
   * Get cached AI response
   */
  async get(type, input, options = {}) {
    if (!this.initialized) await this.initialize();

    try {
      const key = this.generateCacheKey(type, input, options);
      let result = null;

      if (this.useRedis && this.redisClient) {
        const cached = await this.redisClient.get(key);
        if (cached) {
          result = JSON.parse(cached);
        }
      } else {
        // Try memory cache first
        if (this.memoryCache.has(key)) {
          const cached = this.memoryCache.get(key);
          if (cached.expires > Date.now()) {
            result = cached.value;
          } else {
            this.memoryCache.delete(key);
          }
        }
        
        // Try file cache if not in memory
        if (!result) {
          try {
            const filePath = this.getFilePath(key);
            const fileData = await fs.readFile(filePath, 'utf8');
            const cached = JSON.parse(fileData);
            if (cached.expires > Date.now()) {
              result = cached.value;
              // Store in memory for faster future access
              this.setMemoryCache(key, result, cached.expires);
            } else {
              await fs.unlink(filePath).catch(() => {});
            }
          } catch {
            // File doesn't exist or is invalid
          }
        }
      }

      if (result) {
        this.stats.hits++;
        console.log(`Cache HIT for ${type}: ${key.slice(0, 16)}...`);
        return {
          ...result,
          cached: true,
          cacheKey: key
        };
      } else {
        this.stats.misses++;
        console.log(`Cache MISS for ${type}: ${key.slice(0, 16)}...`);
        return null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set AI response in cache
   */
  async set(type, input, response, options = {}) {
    if (!this.initialized) await this.initialize();

    try {
      const key = this.generateCacheKey(type, input, options);
      const settings = this.aiCacheSettings[type] || { ttl: this.defaultTTL, maxItems: 100 };
      const ttl = options.ttl || settings.ttl;
      const expires = Date.now() + (ttl * 1000);

      const cacheData = {
        ...response,
        cacheMetadata: {
          type,
          cached_at: new Date().toISOString(),
          expires_at: new Date(expires).toISOString(),
          ttl,
          key
        }
      };

      if (this.useRedis && this.redisClient) {
        await this.redisClient.setEx(key, ttl, JSON.stringify(cacheData));
      } else {
        // Store in memory cache
        this.setMemoryCache(key, cacheData, expires);
        
        // Store in file cache
        try {
          const filePath = this.getFilePath(key);
          await fs.writeFile(filePath, JSON.stringify({
            value: cacheData,
            expires
          }));
        } catch (error) {
          console.warn('Failed to write file cache:', error);
        }
      }

      this.stats.sets++;
      console.log(`Cache SET for ${type}: ${key.slice(0, 16)}... (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete cached response
   */
  async delete(type, input, options = {}) {
    if (!this.initialized) await this.initialize();

    try {
      const key = this.generateCacheKey(type, input, options);

      if (this.useRedis && this.redisClient) {
        await this.redisClient.del(key);
      } else {
        this.memoryCache.delete(key);
        try {
          const filePath = this.getFilePath(key);
          await fs.unlink(filePath);
        } catch {
          // File might not exist
        }
      }

      this.stats.deletes++;
      console.log(`Cache DELETE for ${type}: ${key.slice(0, 16)}...`);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Clear all cache entries for a specific type
   */
  async clearType(type) {
    if (!this.initialized) await this.initialize();

    try {
      if (this.useRedis && this.redisClient) {
        const keys = await this.redisClient.keys(`ai:${type}:*`);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } else {
        // Clear memory cache
        for (const key of this.memoryCache.keys()) {
          if (key.startsWith(`ai:${type}:`)) {
            this.memoryCache.delete(key);
          }
        }
        
        // Clear file cache
        try {
          const files = await fs.readdir(this.cacheDir);
          const typeFiles = files.filter(file => file.startsWith(`ai_${type}_`));
          await Promise.all(
            typeFiles.map(file => 
              fs.unlink(path.join(this.cacheDir, file)).catch(() => {})
            )
          );
        } catch {
          // Directory might not exist
        }
      }

      console.log(`Cache CLEAR for type: ${type}`);
      return true;
    } catch (error) {
      console.error('Cache clear type error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAll() {
    if (!this.initialized) await this.initialize();

    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.flushAll();
      } else {
        this.memoryCache.clear();
        try {
          const files = await fs.readdir(this.cacheDir);
          const cacheFiles = files.filter(file => file.startsWith('ai_'));
          await Promise.all(
            cacheFiles.map(file => 
              fs.unlink(path.join(this.cacheDir, file)).catch(() => {})
            )
          );
        } catch {
          // Directory might not exist
        }
      }

      this.resetStats();
      console.log('Cache CLEAR ALL');
      return true;
    } catch (error) {
      console.error('Cache clear all error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : '0.00';

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      backend: this.useRedis ? 'redis' : 'memory/file',
      memoryItems: this.memoryCache.size,
      initialized: this.initialized
    };
  }

  /**
   * Get cache health status
   */
  async getHealth() {
    const stats = this.getStats();
    let redisHealth = null;

    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.ping();
        redisHealth = 'healthy';
      } catch (error) {
        redisHealth = 'unhealthy';
      }
    }

    return {
      status: this.initialized ? 'healthy' : 'unhealthy',
      backend: this.useRedis ? 'redis' : 'memory/file',
      redisHealth,
      stats,
      settings: this.aiCacheSettings
    };
  }

  // Private helper methods

  hashObject(obj) {
    return crypto.createHash('md5')
      .update(JSON.stringify(obj, Object.keys(obj).sort()))
      .digest('hex');
  }

  getFilePath(key) {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.cacheDir, `${safeKey}.json`);
  }

  setMemoryCache(key, value, expires) {
    // Implement LRU eviction if memory cache is full
    if (this.memoryCache.size >= this.maxMemoryItems) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    this.memoryCache.set(key, { value, expires });
  }

  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Cleanup expired entries (for memory and file cache)
   */
  async cleanup() {
    if (!this.initialized) return;

    try {
      const now = Date.now();
      
      // Cleanup memory cache
      for (const [key, cached] of this.memoryCache.entries()) {
        if (cached.expires <= now) {
          this.memoryCache.delete(key);
        }
      }

      // Cleanup file cache
      if (!this.useRedis) {
        try {
          const files = await fs.readdir(this.cacheDir);
          const cacheFiles = files.filter(file => file.startsWith('ai_'));
          
          for (const file of cacheFiles) {
            try {
              const filePath = path.join(this.cacheDir, file);
              const fileData = await fs.readFile(filePath, 'utf8');
              const cached = JSON.parse(fileData);
              if (cached.expires <= now) {
                await fs.unlink(filePath);
              }
            } catch {
              // File might be corrupted, delete it
              await fs.unlink(path.join(this.cacheDir, file)).catch(() => {});
            }
          }
        } catch {
          // Directory might not exist
        }
      }

      console.log('Cache cleanup completed');
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  /**
   * Start periodic cleanup
   */
  startCleanupSchedule(intervalMinutes = 30) {
    setInterval(() => {
      this.cleanup();
    }, intervalMinutes * 60 * 1000);
    
    console.log(`Cache cleanup scheduled every ${intervalMinutes} minutes`);
  }
}

export default new CacheService();