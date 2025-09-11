/**
 * Local Textract Service - Mimics AWS Textract API for OCR processing
 * Provides AWS-compatible response format for seamless migration later
 */

import { createWorker } from 'tesseract.js';
import tesseract from 'node-tesseract-ocr';
import sharp from 'sharp';
import { EventEmitter } from 'events';

class LocalTextractService extends EventEmitter {
  constructor() {
    super();
    this.useNativeTesseract = process.env.USE_NATIVE_TESSERACT !== 'false'; // Default to native for better compatibility
    this.ocrConfig = {
      lang: 'eng',
      oem: 1,
      psm: 6,
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,!?@#$%^&*()-_=+[]{}|;:\'\"<>/\\~` \n\t'
    };
    
    // Track active jobs for async processing
    this.activeJobs = new Map();
    this.jobCounter = 1;
  }

  /**
   * Analyze document - Main entry point mimicking AWS Textract
   */
  async analyzeDocument(buffer, options = {}) {
    try {
      const {
        documentType = 'image',
        features = ['TEXT'],
        blocks = true
      } = options;

      // Convert buffer to image if needed
      const imageBuffer = await this.prepareImageForOCR(buffer, documentType);
      
      // Perform OCR
      const ocrResult = await this.performOCR(imageBuffer);
      
      // Convert to AWS Textract format
      const textractResponse = await this.buildTextractResponse(ocrResult, imageBuffer);
      
      return {
        JobStatus: 'SUCCEEDED',
        StatusMessage: 'Document analysis completed successfully',
        DocumentMetadata: {
          Pages: 1
        },
        Blocks: textractResponse.blocks,
        DetectDocumentTextModelVersion: '1.0',
        AnalyzeDocumentModelVersion: '1.0',
        ProcessingTime: textractResponse.processingTime
      };
      
    } catch (error) {
      console.error('LocalTextract analysis failed:', error);
      return {
        JobStatus: 'FAILED',
        StatusMessage: error.message,
        DocumentMetadata: { Pages: 0 },
        Blocks: []
      };
    }
  }

  /**
   * Start async document analysis job
   */
  async startDocumentAnalysis(buffer, options = {}) {
    const jobId = `local-textract-${this.jobCounter++}-${Date.now()}`;
    
    this.activeJobs.set(jobId, {
      status: 'IN_PROGRESS',
      startTime: new Date(),
      options
    });

    // Process asynchronously
    setImmediate(async () => {
      try {
        const result = await this.analyzeDocument(buffer, options);
        this.activeJobs.set(jobId, {
          ...this.activeJobs.get(jobId),
          status: result.JobStatus,
          result: result,
          completedTime: new Date()
        });
        
        this.emit('job:completed', { jobId, result });
      } catch (error) {
        this.activeJobs.set(jobId, {
          ...this.activeJobs.get(jobId),
          status: 'FAILED',
          error: error.message,
          completedTime: new Date()
        });
        
        this.emit('job:failed', { jobId, error: error.message });
      }
    });

    return {
      JobId: jobId,
      JobStatus: 'IN_PROGRESS'
    };
  }

  /**
   * Get document analysis job status
   */
  getDocumentAnalysis(jobId) {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      return {
        JobStatus: 'FAILED',
        StatusMessage: 'Job not found'
      };
    }

    return {
      JobId: jobId,
      JobStatus: job.status,
      StatusMessage: job.status === 'FAILED' ? job.error : 'Processing completed',
      DocumentMetadata: job.result?.DocumentMetadata || { Pages: 0 },
      Blocks: job.result?.Blocks || []
    };
  }

  /**
   * Prepare image buffer for OCR processing
   */
  async prepareImageForOCR(buffer, documentType) {
    try {
      // If it's a PDF page image, it should already be processed
      // Otherwise, ensure it's in a good format for OCR
      const imageInfo = await sharp(buffer).metadata();
      
      // Convert to high-quality grayscale PNG for better OCR
      const processedBuffer = await sharp(buffer)
        .greyscale()
        .png({ quality: 100 })
        .resize({
          width: Math.max(imageInfo.width, 1600),
          height: Math.max(imageInfo.height, 1200),
          fit: 'inside',
          withoutEnlargement: false
        })
        .sharpen()
        .toBuffer();

      return processedBuffer;
    } catch (error) {
      console.warn('Image preprocessing failed, using original buffer:', error.message);
      return buffer;
    }
  }

  /**
   * Perform OCR using either native tesseract or tesseract.js
   */
  async performOCR(imageBuffer) {
    const startTime = Date.now();
    
    try {
      if (this.useNativeTesseract) {
        // Use native tesseract for better performance
        const text = await tesseract.recognize(imageBuffer, {
          lang: this.ocrConfig.lang,
          oem: this.ocrConfig.oem,
          psm: this.ocrConfig.psm
        });
        
        return {
          text: text.trim(),
          confidence: 85, // Default confidence for native tesseract
          words: this.parseWordsFromText(text),
          processingTime: Date.now() - startTime
        };
      } else {
        // Use tesseract.js for detailed word/line information
        const worker = await createWorker('eng');
        
        const { data } = await worker.recognize(imageBuffer);
        
        await worker.terminate();
        
        return {
          text: data.text.trim(),
          confidence: data.confidence,
          words: data.words || [],
          lines: data.lines || [],
          paragraphs: data.paragraphs || [],
          processingTime: Date.now() - startTime
        };
      }
    } catch (error) {
      console.error('OCR processing failed:', error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Parse words from text for native tesseract fallback
   */
  parseWordsFromText(text) {
    const words = [];
    const lines = text.split('\n');
    let wordId = 1;

    lines.forEach((line, lineIndex) => {
      const lineWords = line.split(/\s+/).filter(word => word.length > 0);
      lineWords.forEach((word, wordIndex) => {
        words.push({
          text: word,
          confidence: 85,
          bbox: {
            x0: wordIndex * 50,
            y0: lineIndex * 20,
            x1: (wordIndex + 1) * 50,
            y1: (lineIndex + 1) * 20
          },
          block_num: 0,
          par_num: 0,
          line_num: lineIndex,
          word_num: wordId++
        });
      });
    });

    return words;
  }

  /**
   * Build AWS Textract compatible response format
   */
  async buildTextractResponse(ocrResult, imageBuffer) {
    const blocks = [];
    const imageInfo = await sharp(imageBuffer).metadata();
    let blockId = 1;

    // PAGE block
    const pageBlock = {
      BlockType: 'PAGE',
      Id: `page-${blockId++}`,
      Confidence: ocrResult.confidence,
      Geometry: {
        BoundingBox: {
          Width: 1.0,
          Height: 1.0,
          Left: 0.0,
          Top: 0.0
        },
        Polygon: [
          { X: 0.0, Y: 0.0 },
          { X: 1.0, Y: 0.0 },
          { X: 1.0, Y: 1.0 },
          { X: 0.0, Y: 1.0 }
        ]
      },
      Relationships: []
    };
    blocks.push(pageBlock);

    // Process lines and words
    const lineBlocks = [];
    const wordBlocks = [];

    if (ocrResult.lines && ocrResult.lines.length > 0) {
      // Use tesseract.js detailed line/word data
      ocrResult.lines.forEach((line, lineIndex) => {
        const lineId = `line-${blockId++}`;
        const lineWordIds = [];

        // Create word blocks for this line
        line.words?.forEach((word, wordIndex) => {
          const wordId = `word-${blockId++}`;
          lineWordIds.push(wordId);

          wordBlocks.push({
            BlockType: 'WORD',
            Id: wordId,
            Text: word.text,
            Confidence: word.confidence,
            Geometry: this.normalizeGeometry(word.bbox, imageInfo),
            TextType: 'PRINTED'
          });
        });

        // Create line block
        lineBlocks.push({
          BlockType: 'LINE',
          Id: lineId,
          Text: line.text,
          Confidence: line.confidence,
          Geometry: this.normalizeGeometry(line.bbox, imageInfo),
          Relationships: lineWordIds.length > 0 ? [{
            Type: 'CHILD',
            Ids: lineWordIds
          }] : []
        });
      });
    } else {
      // Fallback: create basic line/word structure from text
      const lines = ocrResult.text.split('\n').filter(line => line.trim());
      
      lines.forEach((lineText, lineIndex) => {
        const lineId = `line-${blockId++}`;
        const lineWordIds = [];
        const words = lineText.split(/\s+/).filter(word => word.length > 0);

        words.forEach((wordText, wordIndex) => {
          const wordId = `word-${blockId++}`;
          lineWordIds.push(wordId);

          wordBlocks.push({
            BlockType: 'WORD',
            Id: wordId,
            Text: wordText,
            Confidence: ocrResult.confidence,
            Geometry: this.createFallbackGeometry(wordIndex, lineIndex, words.length, lines.length),
            TextType: 'PRINTED'
          });
        });

        lineBlocks.push({
          BlockType: 'LINE',
          Id: lineId,
          Text: lineText,
          Confidence: ocrResult.confidence,
          Geometry: this.createFallbackGeometry(0, lineIndex, 1, lines.length),
          Relationships: lineWordIds.length > 0 ? [{
            Type: 'CHILD',
            Ids: lineWordIds
          }] : []
        });
      });
    }

    // Add relationships to page
    if (lineBlocks.length > 0) {
      pageBlock.Relationships.push({
        Type: 'CHILD',
        Ids: lineBlocks.map(block => block.Id)
      });
    }

    // Combine all blocks
    blocks.push(...lineBlocks, ...wordBlocks);

    return {
      blocks,
      processingTime: ocrResult.processingTime
    };
  }

  /**
   * Normalize geometry coordinates to AWS Textract format (0-1 range)
   */
  normalizeGeometry(bbox, imageInfo) {
    if (!bbox || !imageInfo.width || !imageInfo.height) {
      return this.createFallbackGeometry();
    }

    const left = Math.max(0, bbox.x0 / imageInfo.width);
    const top = Math.max(0, bbox.y0 / imageInfo.height);
    const width = Math.min(1, (bbox.x1 - bbox.x0) / imageInfo.width);
    const height = Math.min(1, (bbox.y1 - bbox.y0) / imageInfo.height);

    return {
      BoundingBox: {
        Width: width,
        Height: height,
        Left: left,
        Top: top
      },
      Polygon: [
        { X: left, Y: top },
        { X: left + width, Y: top },
        { X: left + width, Y: top + height },
        { X: left, Y: top + height }
      ]
    };
  }

  /**
   * Create fallback geometry when detailed positioning isn't available
   */
  createFallbackGeometry(wordIndex = 0, lineIndex = 0, wordsInLine = 1, totalLines = 1) {
    const lineHeight = 1.0 / Math.max(totalLines, 1);
    const wordWidth = 1.0 / Math.max(wordsInLine, 1);
    
    const left = wordIndex * wordWidth;
    const top = lineIndex * lineHeight;
    
    return {
      BoundingBox: {
        Width: wordWidth * 0.8, // Leave some spacing
        Height: lineHeight * 0.8,
        Left: left,
        Top: top
      },
      Polygon: [
        { X: left, Y: top },
        { X: left + wordWidth * 0.8, Y: top },
        { X: left + wordWidth * 0.8, Y: top + lineHeight * 0.8 },
        { X: left, Y: top + lineHeight * 0.8 }
      ]
    };
  }

  /**
   * Extract text from Textract response (utility method)
   */
  extractTextFromBlocks(blocks) {
    return blocks
      .filter(block => block.BlockType === 'LINE')
      .map(block => block.Text)
      .join('\n');
  }

  /**
   * Extract form key-value pairs (future enhancement)
   */
  extractKeyValuePairs(blocks) {
    // This would be enhanced in the future to detect forms
    // For now, return empty array
    return [];
  }

  /**
   * Extract tables (future enhancement)
   */
  extractTables(blocks) {
    // This would be enhanced in the future to detect tables
    // For now, return empty array
    return [];
  }

  /**
   * Get service status and configuration
   */
  getStatus() {
    return {
      serviceName: 'LocalTextractService',
      version: '1.0.0',
      useNativeTesseract: this.useNativeTesseract,
      activeJobs: this.activeJobs.size,
      ocrConfig: this.ocrConfig,
      capabilities: [
        'TEXT_DETECTION',
        'DOCUMENT_ANALYSIS',
        'ASYNC_PROCESSING'
      ]
    };
  }

  /**
   * Clean up completed jobs (call periodically)
   */
  cleanupCompletedJobs(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const now = Date.now();
    for (const [jobId, job] of this.activeJobs.entries()) {
      if (job.completedTime && (now - job.completedTime.getTime()) > maxAge) {
        this.activeJobs.delete(jobId);
      }
    }
    return this.activeJobs.size;
  }
}

// Create singleton instance
const localTextractService = new LocalTextractService();
export default localTextractService;