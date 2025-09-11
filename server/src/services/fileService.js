import fs from 'fs/promises';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import mammoth from 'mammoth';
import pdf2pic from 'pdf2pic';
import { exec } from 'child_process';
import { promisify } from 'util';
import localTextractService from './localTextractService.js';

const execAsync = promisify(exec);

class FileService {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedTypes = {
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'text/plain': '.txt',
      'application/json': '.json',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp'
    };
    this.initializeUploadDir();
  }

  async initializeUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch (error) {
      // Directory doesn't exist, create it
      await fs.mkdir(this.uploadDir, { recursive: true });
      console.log(`📁 Created upload directory: ${this.uploadDir}`);
    }
  }

  validateFile(file, buffer) {
    const errors = [];

    // Check file size
    if (buffer.length > this.maxFileSize) {
      errors.push(`File size exceeds maximum of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check file type
    if (!this.allowedTypes[file.mimetype]) {
      errors.push(`File type ${file.mimetype} is not supported`);
    }

    // Check filename
    if (!file.originalname || file.originalname.length > 255) {
      errors.push('Invalid filename');
    }

    return errors;
  }

  generateUniqueFilename(originalName, contractId = null) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const safeName = baseName.replace(/[^a-zA-Z0-9\-_]/g, '');
    
    const prefix = contractId ? `contract-${contractId}` : 'upload';
    return `${prefix}-${timestamp}-${random}-${safeName}${ext}`;
  }

  async saveFile(buffer, filename) {
    const filePath = path.join(this.uploadDir, filename);
    await fs.writeFile(filePath, buffer);
    return filePath;
  }

  async extractTextFromPDF(buffer) {
    try {
      // Save buffer to temporary file for processing
      const tempDir = path.join(this.uploadDir, 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      
      const tempFilePath = path.join(tempDir, `pdf-${Date.now()}.pdf`);
      await fs.writeFile(tempFilePath, buffer);

      try {
        // Try using pdftotext (if available on system)
        const { stdout } = await execAsync(`pdftotext "${tempFilePath}" -`);
        
        // Clean up temp file
        await fs.unlink(tempFilePath);
        
        return {
          text: stdout.trim(),
          pages: (stdout.match(/\f/g) || []).length + 1,
          metadata: { extractionMethod: 'pdftotext' },
          message: 'Text extracted successfully using pdftotext'
        };
      } catch (pdfToTextError) {
        // Fallback to pdf2pic for image conversion + OCR placeholder
        try {
          const convert = pdf2pic.fromPath(tempFilePath, {
            density: 200,
            saveFilename: "page",
            savePath: tempDir,
            format: "png",
            width: 2048,
            height: 2048
          });

          const results = await convert.bulk(-1);
          
          // Clean up temp file
          await fs.unlink(tempFilePath);
          
          // Clean up generated images
          for (const result of results) {
            try {
              await fs.unlink(result.path);
            } catch (e) {
              // Ignore cleanup errors
            }
          }

          return {
            text: '',
            pages: results.length,
            metadata: { 
              extractionMethod: 'pdf2pic',
              convertedPages: results.length 
            },
            message: `PDF converted to ${results.length} images. OCR text extraction would be needed for full text content.`
          };
        } catch (pdf2picError) {
          // Clean up temp file
          await fs.unlink(tempFilePath);
          
          return {
            text: '',
            pages: 0,
            metadata: { extractionMethod: 'none' },
            error: 'PDF processing failed',
            message: 'PDF text extraction requires additional system dependencies (pdftotext or poppler-utils)'
          };
        }
      }
    } catch (error) {
      return {
        text: '',
        pages: 0,
        metadata: {},
        error: error.message,
        message: 'PDF processing failed - please try a different file format'
      };
    }
  }

  async extractTextFromDocx(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return {
        text: result.value,
        messages: result.messages
      };
    } catch (error) {
      throw new Error(`DOCX parsing failed: ${error.message}`);
    }
  }

  async extractTextFromDoc(buffer) {
    // For .doc files, we'll return a message that advanced processing is needed
    return {
      text: '',
      message: 'Legacy .doc format requires additional processing. Please convert to .docx for better text extraction.'
    };
  }

  async processImage(buffer, options = {}) {
    try {
      const { resize = null, quality = 80, format = 'jpeg' } = options;
      
      let image = sharp(buffer);
      
      if (resize) {
        image = image.resize(resize.width, resize.height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      const processedBuffer = await image
        .toFormat(format, { quality })
        .toBuffer();

      return {
        buffer: processedBuffer,
        metadata: await sharp(buffer).metadata()
      };
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  async extractTextFromImage(buffer) {
    try {
      // Use LocalTextractService for OCR processing
      const textractResult = await localTextractService.analyzeDocument(buffer, {
        documentType: 'image',
        features: ['TEXT'],
        blocks: true
      });

      if (textractResult.JobStatus === 'SUCCEEDED') {
        // Extract text from Textract blocks
        const extractedText = localTextractService.extractTextFromBlocks(textractResult.Blocks);
        
        // Calculate average confidence from blocks
        const confidenceScores = textractResult.Blocks
          .filter(block => block.Confidence)
          .map(block => block.Confidence);
        const avgConfidence = confidenceScores.length > 0 
          ? confidenceScores.reduce((a, b) => a + b) / confidenceScores.length 
          : 0;

        return {
          text: extractedText,
          confidence: avgConfidence,
          textractData: {
            blocks: textractResult.Blocks,
            metadata: textractResult.DocumentMetadata,
            processingTime: textractResult.ProcessingTime
          },
          metadata: {
            extractionMethod: 'textract',
            pagesProcessed: textractResult.DocumentMetadata?.Pages || 1,
            confidence: avgConfidence,
            blocksFound: textractResult.Blocks?.length || 0,
            wordsFound: textractResult.Blocks?.filter(b => b.BlockType === 'WORD').length || 0,
            linesFound: textractResult.Blocks?.filter(b => b.BlockType === 'LINE').length || 0
          },
          message: `OCR completed successfully. Extracted ${extractedText.split('\n').length} lines with ${avgConfidence.toFixed(1)}% confidence.`
        };
      } else {
        // OCR failed, return error but still process basic image metadata
        const imageData = await this.processImage(buffer);
        return {
          text: '',
          metadata: imageData.metadata,
          error: textractResult.StatusMessage || 'OCR processing failed',
          message: 'Image file processed but text extraction failed. Please try a clearer image.'
        };
      }
    } catch (error) {
      console.error('Image OCR extraction failed:', error);
      
      // Fallback to basic image processing
      try {
        const imageData = await this.processImage(buffer);
        return {
          text: '',
          metadata: imageData.metadata,
          error: error.message,
          message: 'OCR service unavailable. Image processed for metadata only.'
        };
      } catch (fallbackError) {
        return {
          text: '',
          error: `Image processing failed: ${fallbackError.message}`,
          message: 'Unable to process image file.'
        };
      }
    }
  }

  async extractFileContent(buffer, mimetype) {
    try {
      switch (mimetype) {
        case 'application/pdf':
          return await this.extractTextFromPDF(buffer);
          
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractTextFromDocx(buffer);
          
        case 'application/msword':
          return await this.extractTextFromDoc(buffer);
          
        case 'text/plain':
          return {
            text: buffer.toString('utf-8')
          };
          
        case 'application/json':
          try {
            const jsonData = JSON.parse(buffer.toString('utf-8'));
            return {
              text: JSON.stringify(jsonData, null, 2),
              data: jsonData
            };
          } catch (error) {
            return {
              text: buffer.toString('utf-8'),
              error: 'Invalid JSON format'
            };
          }
          
        case 'image/jpeg':
        case 'image/png':
        case 'image/gif':
        case 'image/webp':
          return await this.extractTextFromImage(buffer);
          
        default:
          return {
            text: '',
            message: `Content extraction not supported for ${mimetype}`
          };
      }
    } catch (error) {
      return {
        text: '',
        error: error.message
      };
    }
  }

  async analyzeFileContent(extractedContent, filename) {
    const analysis = {
      filename,
      hasText: Boolean(extractedContent.text && extractedContent.text.trim()),
      textLength: extractedContent.text ? extractedContent.text.length : 0,
      wordCount: extractedContent.text ? extractedContent.text.split(/\s+/).length : 0,
      containsContractTerms: false,
      detectedLanguage: 'en', // Default to English
      confidenceScore: 0.5
    };

    if (extractedContent.text) {
      // Look for contract-related terms
      const contractKeywords = [
        'contract', 'agreement', 'terms', 'conditions', 'party', 'parties',
        'whereas', 'therefore', 'consideration', 'payment', 'term', 'termination',
        'liability', 'obligation', 'warranty', 'indemnify', 'governing', 'jurisdiction',
        'capacity', 'power', 'energy', 'installation', 'maintenance', 'service',
        'bloom', 'microgrid', 'electrical', 'generator'
      ];

      const text = extractedContent.text.toLowerCase();
      const foundKeywords = contractKeywords.filter(keyword => text.includes(keyword));
      
      analysis.containsContractTerms = foundKeywords.length >= 3;
      analysis.foundKeywords = foundKeywords;
      analysis.confidenceScore = Math.min(foundKeywords.length / 10, 1.0);
      
      // Basic language detection (very simple)
      const englishIndicators = ['the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with'];
      const englishMatches = englishIndicators.filter(word => text.includes(` ${word} `));
      analysis.detectedLanguage = englishMatches.length >= 3 ? 'en' : 'unknown';
    }

    return analysis;
  }

  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error);
      return false;
    }
  }

  async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime
      };
    } catch (error) {
      return null;
    }
  }

  async cleanupOldFiles(maxAgeHours = 24) {
    try {
      const files = await fs.readdir(this.uploadDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;
      
      let deleted = 0;
      
      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = await this.getFileStats(filePath);
        
        if (stats && (now - stats.created.getTime()) > maxAge) {
          const success = await this.deleteFile(filePath);
          if (success) deleted++;
        }
      }
      
      console.log(`🧹 Cleaned up ${deleted} old files`);
      return deleted;
    } catch (error) {
      console.error('File cleanup failed:', error);
      return 0;
    }
  }
}

export default new FileService();