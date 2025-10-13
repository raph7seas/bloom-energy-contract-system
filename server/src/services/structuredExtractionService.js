/**
 * Structured Extraction Service
 *
 * Orchestrates the hybrid extraction pipeline:
 * 1. Classify document type
 * 2. Extract pattern-based candidates
 * 3. Build enhanced LLM prompt
 * 4. Extract structured data
 * 5. Merge with generic extraction
 * 6. Validate results (optional)
 *
 * Design: Flexible, graceful degradation, observable
 */

import extractionSpecParser from './extractionSpecParser.js';
import DocumentTypeClassifier from './documentTypeClassifier.js';
import PatternMatcher from './patternMatcher.js';

class StructuredExtractionService {
  constructor() {
    this.initialized = false;
    this.specParser = extractionSpecParser;
    this.classifier = null;
    this.patternMatcher = new PatternMatcher();
    this.promptTemplate = null;
  }

  /**
   * Initialize the service (call once at startup)
   */
  async initialize() {
    if (this.initialized) {
      return this.isAvailable();
    }

    console.log('🔧 Initializing Structured Extraction Service...');

    // Load extraction spec
    const spec = await this.specParser.loadSpec();

    if (!spec) {
      console.log('⚠️  Structured extraction not available (spec not loaded)');
      this.initialized = true;
      return false;
    }

    // Initialize classifier
    const classifierConfig = this.specParser.getDocTypeClassifier();
    this.classifier = new DocumentTypeClassifier(classifierConfig);

    // Load prompt template
    this.promptTemplate = this.specParser.getPromptTemplate();

    this.initialized = true;
    console.log('✅ Structured Extraction Service initialized');

    return true;
  }

  /**
   * Check if structured extraction is available
   */
  isAvailable() {
    return this.initialized && this.specParser.isAvailable();
  }

  /**
   * Perform structured extraction on a document
   *
   * @param {string} text - Document text content
   * @param {string} filename - Document filename
   * @param {Object} options - { genericResults, aiProvider }
   * @returns {Object} Enhanced extraction results
   */
  async extract(text, filename, options = {}) {
    if (!this.isAvailable()) {
      console.log('⏭️  Structured extraction not available, skipping');
      return null;
    }

    try {
      console.log('🔍 Starting structured extraction...');

      // Step 1: Classify document type
      const classification = this.classifier.classify(text, filename);

      console.log(`📄 Document type: ${classification.type} (${Math.round(classification.confidence * 100)}% confidence)`);

      // Step 2: Get field definitions for this document type
      const fieldSpec = this.specParser.getFieldsForDocType(classification.type);

      if (!fieldSpec && !classification.isGeneric) {
        console.log(`⚠️  No field spec found for ${classification.type}, falling back to generic`);
        return this._addClassificationMetadata(options.genericResults, classification);
      }

      // Step 3: Extract candidate values using patterns
      let candidates = {};
      if (fieldSpec && fieldSpec.fieldDefinitions) {
        candidates = this.patternMatcher.extractCandidates(
          text,
          fieldSpec.fieldDefinitions
        );

        console.log(`📊 Extracted ${Object.keys(candidates).length} field candidates`);
      }

      // Step 4: Build enhanced extraction results
      const enhancedResults = {
        ...options.genericResults,
        structuredExtraction: {
          enabled: true,
          documentType: classification.type,
          confidence: classification.confidence,
          detectedCues: classification.detectedCues,
          alternativeTypes: classification.alternativeTypes,
          candidateFields: Object.keys(candidates),
          extractedCandidates: candidates
        }
      };

      // Step 5: Add field-specific guidance to extraction metadata
      if (fieldSpec) {
        enhancedResults.extractionGuidance = {
          expectedFields: fieldSpec.fields,
          documentTypePriority: classification.type
        };
      }

      console.log('✅ Structured extraction complete');

      return enhancedResults;

    } catch (error) {
      console.error('❌ Structured extraction failed:', error);
      console.error(error.stack);

      // Graceful degradation - return original results
      return options.genericResults;
    }
  }

  /**
   * Build enhanced prompt for LLM with structured guidance
   *
   * This creates a prompt that guides the LLM to extract specific fields
   * based on the document type and pattern matches.
   */
  buildEnhancedPrompt(text, docType, candidates, originalPrompt) {
    if (!this.promptTemplate || docType === 'GENERIC') {
      return originalPrompt;
    }

    try {
      // Get field spec for this document type
      const fieldSpec = this.specParser.getFieldsForDocType(docType);

      if (!fieldSpec) {
        return originalPrompt;
      }

      // Build the enhanced prompt
      let enhancedPrompt = this.promptTemplate;

      // Add document type context
      enhancedPrompt += `\n\n## Current Document\n`;
      enhancedPrompt += `**DOC_TYPE**: ${docType}\n`;
      enhancedPrompt += `**Expected Fields**: ${fieldSpec.fields.join(', ')}\n\n`;

      // Add candidate hints if available
      if (Object.keys(candidates).length > 0) {
        enhancedPrompt += `## Pattern Matches Found\n`;
        enhancedPrompt += `The following potential field values were detected:\n\n`;

        Object.entries(candidates).forEach(([fieldKey, fieldCandidates]) => {
          enhancedPrompt += `**${fieldKey}**: `;

          const values = fieldCandidates.map(c => `"${c.value}"`).slice(0, 3);
          enhancedPrompt += values.join(', ');
          enhancedPrompt += '\n';
        });

        enhancedPrompt += `\n`;
      }

      // Add original extraction instructions
      enhancedPrompt += `## Additional Instructions\n`;
      enhancedPrompt += originalPrompt;

      return enhancedPrompt;

    } catch (error) {
      console.error('❌ Failed to build enhanced prompt:', error);
      return originalPrompt;
    }
  }

  /**
   * Validate extraction results (optional quality gate)
   */
  validateResults(results, docType) {
    const validationRules = this.specParser.getValidationRules();

    if (!validationRules || docType === 'GENERIC') {
      return { valid: true, warnings: [], errors: [] };
    }

    const warnings = [];
    const errors = [];

    try {
      // Check mandatory fields
      const mandatoryFields = validationRules.gates?.mandatory_fields || {};

      Object.entries(mandatoryFields).forEach(([section, fields]) => {
        fields.forEach(field => {
          if (!results.extractedData || !results.extractedData[field]) {
            warnings.push(`Missing mandatory field: ${field} in ${section}`);
          }
        });
      });

      // Check unit consistency
      const unitChecks = validationRules.gates?.unit_checks || {};

      Object.entries(unitChecks).forEach(([field, requirements]) => {
        const fieldValue = results.extractedData?.[field];
        if (fieldValue) {
          const valueStr = typeof fieldValue === 'string' ? fieldValue : JSON.stringify(fieldValue);

          requirements.must_include?.forEach(unit => {
            if (!valueStr.includes(unit)) {
              warnings.push(`Field ${field} should include unit: ${unit}`);
            }
          });
        }
      });

    } catch (error) {
      console.error('❌ Validation error:', error);
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Add classification metadata to existing results
   */
  _addClassificationMetadata(results, classification) {
    return {
      ...results,
      structuredExtraction: {
        enabled: true,
        documentType: classification.type,
        confidence: classification.confidence,
        detectedCues: classification.detectedCues,
        isGeneric: classification.isGeneric
      }
    };
  }

  /**
   * Merge structured extraction with generic extraction
   * Prioritizes structured results when confidence is high
   */
  mergeResults(structuredResults, genericResults) {
    if (!structuredResults) {
      return genericResults;
    }

    // If structured extraction failed or is generic, return generic
    if (structuredResults.structuredExtraction?.isGeneric) {
      return genericResults;
    }

    // If confidence is low, prefer generic extraction
    const confidence = structuredResults.structuredExtraction?.confidence || 0;
    if (confidence < 0.3) {
      console.log('⚠️  Low confidence in document type, preferring generic extraction');
      return {
        ...genericResults,
        structuredExtractionAttempted: true,
        documentType: structuredResults.structuredExtraction?.documentType,
        documentTypeConfidence: confidence
      };
    }

    // Merge results - structured takes precedence where available
    return {
      ...genericResults,
      ...structuredResults,
      mergedFrom: 'structured_and_generic',
      documentType: structuredResults.structuredExtraction?.documentType,
      documentTypeConfidence: confidence
    };
  }
}

// Singleton instance
const service = new StructuredExtractionService();

export default service;
