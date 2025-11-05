/**
 * AWS Bedrock AI Service for Claude models
 * Provides streaming and non-streaming inference using Amazon Bedrock
 */
class BedrockService {
  constructor() {
    this.client = null;
    this.awsSDK = null; // Lazy-load AWS SDK to avoid hanging on invalid credentials
    // Don't read env vars in constructor - they may not be loaded yet
    // Read them lazily in getClient() and when needed
  }

  /**
   * Lazy-load AWS SDK modules (only when needed)
   */
  async loadAWSSDK() {
    if (!this.awsSDK) {
      this.awsSDK = await import('@aws-sdk/client-bedrock-runtime');
    }
    return this.awsSDK;
  }

  /**
   * Get region from environment (lazy load)
   */
  getRegion() {
    return process.env.AWS_REGION || 'us-west-2';
  }

  /**
   * Get model ID from environment (lazy load)
   */
  getModelId() {
    return process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-haiku-20241022-v1:0';
  }

  /**
   * Get max tokens from environment (lazy load)
   */
  getMaxTokens() {
    return parseInt(process.env.BEDROCK_MAX_TOKENS) || 2000;
  }

  /**
   * Get temperature from environment (lazy load)
   */
  getTemperature() {
    return parseFloat(process.env.BEDROCK_TEMPERATURE) || 0.5;
  }

  /**
   * Get top K from environment (lazy load)
   */
  getTopK() {
    return parseInt(process.env.BEDROCK_TOP_K) || 250;
  }

  /**
   * Get top P from environment (lazy load)
   */
  getTopP() {
    return parseFloat(process.env.BEDROCK_TOP_P) || 1;
  }

  /**
   * Initialize Bedrock client (async to support lazy SDK loading)
   */
  async getClient() {
    if (!this.client) {
      const { BedrockRuntimeClient } = await this.loadAWSSDK();
      const region = this.getRegion();
      this.client = new BedrockRuntimeClient({
        region: region,
        // AWS credentials will be loaded from environment or IAM role
        credentials: process.env.AWS_ACCESS_KEY_ID ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          sessionToken: process.env.AWS_SESSION_TOKEN
        } : undefined
      });
      console.log(`✅ AWS Bedrock client initialized`);
      console.log(`📊 Region: ${region}`);
      console.log(`📊 Model: ${this.getModelId()}`);
    }
    return this.client;
  }

  /**
   * Check if Bedrock is configured
   */
  isConfigured() {
    return !!(process.env.AWS_REGION && (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_EXECUTION_ENV));
  }

  /**
   * Invoke Bedrock model with streaming response
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options (system prompt, etc.)
   * @returns {AsyncGenerator} Streaming response
   */
  async* invokeModelStream(messages, options = {}) {
    const { InvokeModelWithResponseStreamCommand } = await this.loadAWSSDK();
    const client = await this.getClient();

    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      messages: messages,
      max_tokens: options.maxTokens || this.getMaxTokens(),
      temperature: options.temperature || this.getTemperature(),
      top_k: options.topK || this.getTopK(),
      top_p: options.topP || this.getTopP(),
      ...(options.system && { system: options.system })
    });

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: options.modelId || this.getModelId(),
      contentType: 'application/json',
      accept: 'application/json',
      body: body
    });

    try {
      console.log(`🚀 Invoking Bedrock model: ${options.modelId || this.getModelId()}`);
      const response = await client.send(command);

      // Process the stream
      if (response.body) {
        for await (const event of response.body) {
          if (event.chunk) {
            const chunkData = JSON.parse(new TextDecoder().decode(event.chunk.bytes));

            // Handle different event types from Bedrock
            if (chunkData.type === 'content_block_delta') {
              yield {
                type: 'content_block_delta',
                delta: chunkData.delta,
                index: chunkData.index
              };
            } else if (chunkData.type === 'message_stop') {
              yield {
                type: 'message_stop',
                usage: chunkData.usage
              };
            } else if (chunkData.type === 'content_block_start') {
              yield {
                type: 'content_block_start',
                content_block: chunkData.content_block,
                index: chunkData.index
              };
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Bedrock streaming error:', error);
      throw new Error(`Bedrock invocation failed: ${error.message}`);
    }
  }

  /**
   * Invoke Bedrock model with complete response (non-streaming)
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options
   * @returns {Object} Complete response object
   */
  async invokeModel(messages, options = {}) {
    const client = await this.getClient();

    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      messages: messages,
      max_tokens: options.maxTokens || this.maxTokens,
      temperature: options.temperature || this.temperature,
      top_k: options.topK || this.topK,
      top_p: options.topP || this.topP,
      ...(options.system && { system: options.system })
    });

    // For non-streaming, we collect all chunks
    let fullResponse = '';
    let usage = null;

    try {
      const stream = this.invokeModelStream(messages, options);

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta?.text) {
          fullResponse += event.delta.text;
        } else if (event.type === 'message_stop' && event.usage) {
          usage = event.usage;
        }
      }

      return {
        content: [{ type: 'text', text: fullResponse }],
        usage: usage,
        model: options.modelId || this.modelId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Bedrock invocation error:', error);
      throw error;
    }
  }

  /**
   * Extract business rules from document using Bedrock
   * @param {string} documentContent - The document text to analyze
   * @param {Object} options - Options including system prompt
   * @returns {Object} Extracted rules and data
   */
  async extractBusinessRules(documentContent, options = {}) {
    const systemPrompt = options.systemPrompt || `You are an expert business rules analyst specializing in energy contracts and service agreements.
Extract actionable business rules AND specific contract values from contract documents.`;

    const userPrompt = `Extract contract data and comprehensive business rules from this document.

DOCUMENT: ${options.filename || 'document'}

${documentContent}

Extract the following information. If a value is not in the document, use "NOT SPECIFIED".

Return ONLY valid JSON (no markdown, no code blocks) with the following structure:
{
  "documentSummary": {
    "contractType": "type of agreement",
    "parties": {
      "buyer": "buyer name",
      "seller": "seller name",
      "financialOwner": "financial owner if mentioned"
    },
    "effectiveDate": "YYYY-MM-DD or NOT SPECIFIED",
    "contractTerm": "years as number or NOT SPECIFIED"
  },
  "extractedData": {
    "systemCapacity": "exact kW value",
    "contractTerm": "exact years as number",
    "baseRate": "exact rate",
    "annualEscalation": "exact %",
    "efficiencyWarranty": "exact %",
    "availabilityGuarantee": "exact %"
  },
  "extractedRules": [
    {
      "category": "payment|performance|operational|compliance",
      "name": "rule name",
      "description": "what the rule does",
      "condition": "IF condition",
      "action": "THEN action",
      "confidence": 0.0-1.0,
      "sourceText": "exact quote"
    }
  ]
}`;

    const messages = [
      {
        role: 'user',
        content: userPrompt
      }
    ];

    try {
      console.log(`🤖 Using Bedrock model: ${this.getModelId()}`);
      const response = await this.invokeModel(messages, {
        system: systemPrompt,
        maxTokens: 5000
      });

      return {
        text: response.content[0].text,
        usage: response.usage,
        model: response.model
      };
    } catch (error) {
      console.error('❌ Bedrock business rules extraction failed:', error);
      throw error;
    }
  }

  /**
   * Chat completion using Bedrock
   * @param {string} userMessage - User's message
   * @param {Array} conversationHistory - Previous messages
   * @param {string} systemPrompt - System prompt
   * @returns {Object} Response object
   */
  async chat(userMessage, conversationHistory = [], systemPrompt = '') {
    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: userMessage
      }
    ];

    try {
      const response = await this.invokeModel(messages, {
        system: systemPrompt
      });

      return {
        message: response.content[0].text,
        usage: response.usage,
        model: response.model,
        timestamp: response.timestamp
      };
    } catch (error) {
      console.error('❌ Bedrock chat failed:', error);
      throw error;
    }
  }

  /**
   * Streaming chat completion using Bedrock
   * @param {string} userMessage - User's message
   * @param {Array} conversationHistory - Previous messages
   * @param {string} systemPrompt - System prompt
   * @returns {AsyncGenerator} Streaming response
   */
  async* chatStream(userMessage, conversationHistory = [], systemPrompt = '') {
    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: userMessage
      }
    ];

    try {
      const stream = this.invokeModelStream(messages, {
        system: systemPrompt
      });

      for await (const event of stream) {
        yield event;
      }
    } catch (error) {
      console.error('❌ Bedrock streaming chat failed:', error);
      throw error;
    }
  }

  /**
   * Extract data from PDF using Bedrock (supports up to 20MB via InvokeModel)
   * Automatically chooses best API based on file size
   *
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @param {string} filename - Original filename
   * @param {Object} options - Extraction options
   * @returns {Object} Extracted data with citations
   */
  async extractFromPDF(pdfBuffer, filename, options = {}) {
    const fileSizeMB = pdfBuffer.length / (1024 * 1024);
    console.log(`📄 PDF Size: ${fileSizeMB.toFixed(2)} MB - ${filename}`);

    // Choose API based on file size
    if (fileSizeMB <= 4.5) {
      console.log(`✅ Using Converse API (file under 4.5MB)`);
      return await this._extractViaConverseAPI(pdfBuffer, filename, options);
    } else if (fileSizeMB <= 20) {
      console.log(`⚠️  Using InvokeModel API (file 4.5-20MB)`);
      return await this._extractViaInvokeModelAPI(pdfBuffer, filename, options);
    } else {
      throw new Error(`PDF too large (${fileSizeMB.toFixed(2)} MB). Maximum supported: 20MB`);
    }
  }

  /**
   * Sanitize filename for Bedrock API requirements
   * Bedrock only allows: alphanumeric, whitespace, hyphens, parentheses, square brackets
   * No consecutive whitespace allowed
   */
  _sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9\s\-\(\)\[\]]/g, '-') // Replace invalid chars with hyphen
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/-+/g, '-')   // Replace multiple hyphens with single hyphen
      .substring(0, 200);    // Limit length
  }

  /**
   * Converse API - Better for smaller files (< 4.5MB)
   * Supports native document objects and citations
   */
  async _extractViaConverseAPI(pdfBuffer, filename, options = {}) {
    const { ConverseCommand } = await this.loadAWSSDK();
    const client = await this.getClient();

    // Sanitize filename for Bedrock API requirements
    const sanitizedFilename = this._sanitizeFilename(filename);

    const command = new ConverseCommand({
      modelId: options.modelId || this.getModelId(),
      messages: [
        {
          role: 'user',
          content: [
            {
              document: {
                format: 'pdf',
                name: sanitizedFilename,
                source: {
                  bytes: pdfBuffer
                }
              }
            },
            {
              text: options.extractionPrompt || this._getDefaultExtractionPrompt()
            }
          ]
        }
      ],
      inferenceConfig: {
        maxTokens: options.maxTokens || 8000,
        temperature: options.temperature || 0.3
        // Note: Claude 4.5 models don't support both temperature and top_p
        // topK: this.getTopK(),
        // topP: this.getTopP()
      }
      // Note: Citations not supported on all models (e.g., Haiku)
      // additionalModelRequestFields: {
      //   citations: { enabled: true }
      // }
    });

    try {
      console.log(`🚀 Calling Bedrock Converse API...`);
      const startTime = Date.now();
      const response = await client.send(command);
      const processingTime = Date.now() - startTime;

      // Extract text from response
      const outputText = response.output.message.content
        .filter(c => c.text)
        .map(c => c.text)
        .join('');

      console.log(`✅ Converse API completed in ${processingTime}ms`);

      return {
        success: true,
        extractedText: outputText,
        citations: response.citations || [],
        usage: response.usage,
        model: options.modelId || this.getModelId(),
        apiType: 'converse',
        processingTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Converse API failed:', error);
      throw new Error(`Bedrock Converse API failed: ${error.message}`);
    }
  }

  /**
   * InvokeModel API - For larger files (4.5MB - 20MB)
   * Uses Messages API format with base64-encoded PDF
   */
  async _extractViaInvokeModelAPI(pdfBuffer, filename, options = {}) {
    const { InvokeModelCommand } = await this.loadAWSSDK();
    const client = await this.getClient();

    // Convert PDF to base64
    const pdfBase64 = pdfBuffer.toString('base64');

    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64
              }
            },
            {
              type: 'text',
              text: options.extractionPrompt || this._getDefaultExtractionPrompt()
            }
          ]
        }
      ],
      max_tokens: options.maxTokens || 8000,
      temperature: options.temperature || 0.3,
      top_k: this.getTopK(),
      top_p: this.getTopP()
    };

    const command = new InvokeModelCommand({
      modelId: options.modelId || this.getModelId(),
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody)
    });

    try {
      console.log(`🚀 Calling Bedrock InvokeModel API...`);
      const startTime = Date.now();
      const response = await client.send(command);
      const processingTime = Date.now() - startTime;

      // Parse response
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const outputText = responseBody.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('');

      console.log(`✅ InvokeModel API completed in ${processingTime}ms`);

      return {
        success: true,
        extractedText: outputText,
        usage: responseBody.usage,
        model: options.modelId || this.getModelId(),
        apiType: 'invoke_model',
        processingTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ InvokeModel API failed:', error);
      throw new Error(`Bedrock InvokeModel API failed: ${error.message}`);
    }
  }

  /**
   * Default extraction prompt - Simple and effective
   */
  _getDefaultExtractionPrompt() {
    return `Analyze this Bloom Energy fuel cell contract and extract key data.

**Extract the following fields:**
- systemCapacity: System capacity in kW (must be multiple of 325kW)
- contractTerm: Contract term in years (5, 10, 15, or 20)
- baseRate: Base energy rate in $/kWh
- annualEscalation: Annual price escalation percentage
- efficiencyWarranty: LHV efficiency warranty percentage
- availabilityGuarantee: System availability guarantee percentage
- buyer: Buyer/customer name
- seller: Seller name (typically Bloom Energy)
- effectiveDate: Contract effective date (YYYY-MM-DD format)
- systemType: System type (PP, MG, AMG, OG)
- voltage: System voltage level

**Rules:**
- If a field is not found, use "NOT SPECIFIED"
- Provide confidence score (0-1) for each field
- Extract exact values from document, don't infer

**Return valid JSON only** (no markdown, no code blocks):
{
  "extractedData": {
    "systemCapacity": "value",
    "contractTerm": "value",
    ...
  },
  "confidence": {
    "systemCapacity": 0.95,
    "contractTerm": 0.90,
    ...
  },
  "notes": "any relevant observations"
}`;
  }
}

export default new BedrockService();
