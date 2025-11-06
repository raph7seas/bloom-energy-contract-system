/**
 * S3 Document Service
 * Handles document retrieval from S3 and coordination with AI extraction services
 */
import bedrockService from './bedrockService.js';
import aiService from './aiService.js';

class S3DocumentService {
  constructor() {
    this.s3Client = null;
    this.bucketName = process.env.S3_CONTRACT_BUCKET || 'bloom-contracts';
    this.incomingPrefix = 'incoming/';
    this.processedPrefix = 'processed/';
    this.failedPrefix = 'failed/';
    this.useLocalStorage = process.env.USE_LOCAL_STORAGE === 'true';
  }

  /**
   * Initialize S3 client (lazy loading)
   */
  async getS3Client() {
    if (!this.s3Client && !this.useLocalStorage) {
      const { S3Client } = await import('@aws-sdk/client-s3');
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-west-2',
        credentials: process.env.AWS_ACCESS_KEY_ID ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          sessionToken: process.env.AWS_SESSION_TOKEN
        } : undefined
      });
      console.log(`✅ S3 client initialized for bucket: ${this.bucketName}`);
    }
    return this.s3Client;
  }

  /**
   * Process a document from S3
   * @param {string} s3Key - S3 object key
   * @param {Object} options - Processing options
   * @param {string} options.aiProvider - AI provider to use ('bedrock' or 'anthropic')
   * @returns {Object} Processing result
   */
  async processDocumentFromS3(s3Key, options = {}) {
    console.log(`\n📥 Processing document from S3: ${s3Key}`);

    try {
      // 1. Download PDF from S3
      const pdfBuffer = await this.downloadFromS3(s3Key);
      const filename = s3Key.split('/').pop();

      // 2. Extract data using selected AI provider (from options or env variable)
      const provider = options.aiProvider || process.env.DEFAULT_AI_PROVIDER || 'bedrock';
      console.log(`🤖 Extracting data with ${provider}...`);

      const extractionResult = provider === 'bedrock'
        ? await bedrockService.extractFromPDF(pdfBuffer, filename, options)
        : await aiService.extractFromPDF(pdfBuffer, filename, options);

      // 3. Parse extracted JSON
      let extractedData;
      try {
        extractedData = JSON.parse(extractionResult.extractedText);
      } catch (parseError) {
        console.warn('⚠️  Failed to parse JSON, attempting cleanup...');
        // Remove markdown code blocks if present
        const cleanedText = extractionResult.extractedText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        extractedData = JSON.parse(cleanedText);
      }

      // 4. Move to processed folder
      const processedKey = s3Key.replace(this.incomingPrefix, this.processedPrefix);
      await this.moveInS3(s3Key, processedKey);

      console.log(`✅ Document processed successfully: ${filename}`);

      return {
        success: true,
        filename,
        originalS3Key: s3Key,
        processedS3Key: processedKey,
        extractedData: extractedData.extractedData || extractedData,
        confidence: extractedData.confidence || {},
        notes: extractedData.notes,
        citations: extractionResult.citations,
        usage: extractionResult.usage,
        processingTime: extractionResult.processingTime,
        apiType: extractionResult.apiType
      };

    } catch (error) {
      console.error(`❌ Failed to process ${s3Key}:`, error);

      // Move to failed folder
      try {
        const failedKey = s3Key.replace(this.incomingPrefix, this.failedPrefix);
        await this.moveInS3(s3Key, failedKey);
      } catch (moveError) {
        console.error(`❌ Failed to move to failed folder:`, moveError);
      }

      throw error;
    }
  }

  /**
   * Download file from S3
   */
  async downloadFromS3(s3Key) {
    console.log(`📥 Downloading from S3: s3://${this.bucketName}/${s3Key}`);

    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.getS3Client();

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key
    });

    const response = await client.send(command);
    const chunks = [];

    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Upload file to S3
   */
  async uploadToS3(buffer, s3Key, metadata = {}) {
    console.log(`📤 Uploading to S3: s3://${this.bucketName}/${s3Key}`);

    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.getS3Client();

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: buffer,
      Metadata: metadata
    });

    await client.send(command);
    return `s3://${this.bucketName}/${s3Key}`;
  }

  /**
   * Move file within S3 (copy + delete)
   */
  async moveInS3(sourceKey, destinationKey) {
    const { CopyObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.getS3Client();

    // Copy
    await client.send(new CopyObjectCommand({
      Bucket: this.bucketName,
      CopySource: `${this.bucketName}/${sourceKey}`,
      Key: destinationKey
    }));

    // Delete original
    await client.send(new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: sourceKey
    }));

    console.log(`📦 Moved: ${sourceKey} → ${destinationKey}`);
  }

  /**
   * List incoming documents waiting for processing
   */
  async listIncomingDocuments() {
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const client = await this.getS3Client();

    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: this.incomingPrefix
    });

    const response = await client.send(command);
    return response.Contents || [];
  }

  /**
   * Batch process all documents in incoming folder
   */
  async processBatch(options = {}) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 Starting batch processing from S3...`);
    console.log(`${'='.repeat(80)}\n`);

    const documents = await this.listIncomingDocuments();

    if (documents.length === 0) {
      console.log('📭 No documents found in incoming folder');
      return { processed: 0, failed: 0, results: [] };
    }

    console.log(`📚 Found ${documents.length} document(s) to process\n`);

    const results = [];
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      console.log(`\n[${i + 1}/${documents.length}] Processing: ${doc.Key}`);

      try {
        const result = await this.processDocumentFromS3(doc.Key, options);
        results.push(result);
        processed++;
      } catch (error) {
        console.error(`❌ Failed: ${error.message}`);
        results.push({
          success: false,
          s3Key: doc.Key,
          error: error.message
        });
        failed++;
      }

      // Rate limiting: wait between documents
      if (i < documents.length - 1) {
        const delay = options.delayBetweenDocs || 2000; // 2 seconds default
        console.log(`⏳ Waiting ${delay}ms before next document...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ Batch processing complete`);
    console.log(`📊 Processed: ${processed}, Failed: ${failed}`);
    console.log(`${'='.repeat(80)}\n`);

    return { processed, failed, results };
  }
}

export default new S3DocumentService();
