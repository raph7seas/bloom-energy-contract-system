/**
 * AI Request Queue Service
 * Handles rate limiting and retry logic for Anthropic API calls
 * Prevents 429 errors by queuing requests and processing them sequentially
 */
class AIRequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.requestDelay = 5000; // 5 seconds between requests (increased to prevent rate limiting)
    this.maxRetries = 4; // Increased to 4 retries for better reliability
    this.baseRetryDelay = 10000; // 10 seconds for first retry (faster than before)
  }

  /**
   * Add a request to the queue and wait for it to process
   * @param {Function} requestFn - Async function that makes the AI API call
   * @param {Object} context - Context info for logging (documentName, etc.)
   * @returns {Promise} - Resolves with the API response
   */
  async enqueue(requestFn, context = {}) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        requestFn,
        context,
        resolve,
        reject,
        retries: 0,
        addedAt: Date.now()
      };

      this.queue.push(queueItem);
      console.log(`📋 Added AI request to queue: ${context.documentName || 'unknown'} (queue size: ${this.queue.length})`);

      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued requests sequentially
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    console.log(`🔄 Starting AI request queue processing (${this.queue.length} requests pending)`);

    while (this.queue.length > 0) {
      const item = this.queue[0]; // Peek at first item (don't remove yet)

      try {
        console.log(`⏳ Processing AI request: ${item.context.documentName || 'unknown'} (attempt ${item.retries + 1}/${this.maxRetries + 1}, ${this.queue.length - 1} remaining in queue)`);

        // Execute the API request
        const result = await item.requestFn();

        // Success - resolve and remove from queue
        console.log(`✅ AI request completed: ${item.context.documentName || 'unknown'}`);
        item.resolve(result);
        this.queue.shift(); // Remove from queue

        // Wait before next request to avoid rate limits
        if (this.queue.length > 0) {
          console.log(`⏸️  Waiting ${this.requestDelay}ms before next request...`);
          await this.delay(this.requestDelay);
        }

      } catch (error) {
        console.error(`❌ AI request failed: ${item.context.documentName || 'unknown'} - ${error.message}`);

        // Check if it's a retriable error (rate limit or connection error)
        const isRateLimitError = error.message.includes('Rate limit') ||
                                 error.message.includes('429') ||
                                 error.status === 429;

        const isConnectionError = error.message.includes('ENOTFOUND') ||
                                  error.message.includes('ETIMEDOUT') ||
                                  error.message.includes('ECONNRESET') ||
                                  error.message.includes('ECONNREFUSED') ||
                                  error.message.includes('Connection error') ||
                                  error.code === 'ENOTFOUND' ||
                                  error.code === 'ETIMEDOUT' ||
                                  error.code === 'ECONNRESET' ||
                                  error.code === 'ECONNREFUSED';

        const isRetriable = (isRateLimitError || isConnectionError) && item.retries < this.maxRetries;

        if (isRetriable) {
          // Retry with exponential backoff
          item.retries++;
          const retryDelay = this.baseRetryDelay * Math.pow(2, item.retries - 1); // 10s, 20s, 40s, 80s

          if (isRateLimitError) {
            console.log(`🔄 Rate limit hit - retrying in ${retryDelay / 1000}s (attempt ${item.retries + 1}/${this.maxRetries + 1})`);
          } else {
            console.log(`🔄 Connection error - retrying in ${retryDelay / 1000}s (attempt ${item.retries + 1}/${this.maxRetries + 1})`);
          }

          await this.delay(retryDelay);

          // Keep in queue for retry (don't remove)
          continue;
        } else {
          // Max retries reached or non-retryable error - reject and remove from queue
          console.error(`💥 AI request failed permanently: ${item.context.documentName || 'unknown'}`);
          item.reject(error);
          this.queue.shift(); // Remove from queue

          // Continue with next item after a short delay
          if (this.queue.length > 0) {
            await this.delay(this.requestDelay);
          }
        }
      }
    }

    this.processing = false;
    console.log('✨ AI request queue processing complete');
  }

  /**
   * Helper to delay execution
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      oldestRequest: this.queue.length > 0 ? {
        documentName: this.queue[0].context.documentName,
        waitTime: Date.now() - this.queue[0].addedAt,
        retries: this.queue[0].retries
      } : null
    };
  }

  /**
   * Clear the entire queue (use with caution)
   */
  clear() {
    const clearedCount = this.queue.length;

    // Reject all pending requests
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });

    this.queue = [];
    console.log(`🗑️  Cleared ${clearedCount} requests from AI queue`);
  }
}

// Export singleton instance
export default new AIRequestQueue();
