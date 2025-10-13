/**
 * Extraction Spec Parser
 *
 * Parses the YAML extraction specification and builds runtime-efficient
 * data structures for field extraction.
 *
 * Design: Parse once at startup, reuse for all requests
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ExtractionSpecParser {
  constructor() {
    this.spec = null;
    this.fieldsByDocType = {};
    this.patternCache = {};
    this.loaded = false;
  }

  /**
   * Load and parse the YAML specification
   */
  async loadSpec() {
    if (this.loaded) {
      return this.spec;
    }

    try {
      const specPath = path.join(__dirname, '../../..', '.github', 'Improvement-docs', 'contract_extraction_spec.yaml');

      if (!fs.existsSync(specPath)) {
        console.warn('⚠️  Extraction spec not found, structured extraction disabled');
        this.loaded = true;
        return null;
      }

      const specContent = fs.readFileSync(specPath, 'utf8');
      this.spec = yaml.load(specContent);

      console.log('✅ Extraction spec loaded successfully');

      // Build optimized field mappings
      this._buildFieldMappings();

      this.loaded = true;
      return this.spec;
    } catch (error) {
      console.error('❌ Failed to load extraction spec:', error.message);
      this.loaded = true;
      return null;
    }
  }

  /**
   * Build field mappings organized by document type for efficient lookup
   */
  _buildFieldMappings() {
    if (!this.spec || !this.spec.extraction_order) {
      return;
    }

    // Build field index from extraction_fields
    const allFields = {};
    const fieldSections = this.spec.extraction_fields || {};

    Object.entries(fieldSections).forEach(([section, fields]) => {
      if (Array.isArray(fields)) {
        fields.forEach(field => {
          if (field.key) {
            allFields[field.key] = {
              ...field,
              section,
              patterns: field.patterns || [],
              doc_priority: field.doc_priority || []
            };
          }
        });
      }
    });

    // Organize by document type
    this.spec.extraction_order.forEach(docTypeSpec => {
      const docType = docTypeSpec.doc_type;
      this.fieldsByDocType[docType] = {
        fields: docTypeSpec.fields || [],
        fieldDefinitions: {}
      };

      // Link field definitions
      docTypeSpec.fields.forEach(fieldKey => {
        if (allFields[fieldKey]) {
          this.fieldsByDocType[docType].fieldDefinitions[fieldKey] = allFields[fieldKey];
        }
      });
    });

    console.log(`📋 Loaded field mappings for ${Object.keys(this.fieldsByDocType).length} document types`);
  }

  /**
   * Get document type classification hints
   */
  getDocTypeClassifier() {
    if (!this.spec || !this.spec.doc_type_classifier) {
      return null;
    }

    return this.spec.doc_type_classifier;
  }

  /**
   * Get field definitions for a specific document type
   */
  getFieldsForDocType(docType) {
    return this.fieldsByDocType[docType] || null;
  }

  /**
   * Get all supported document types
   */
  getSupportedDocTypes() {
    return Object.keys(this.fieldsByDocType);
  }

  /**
   * Get role aliases and mappings
   */
  getRoleAliases() {
    return this.spec?.roles_and_aliases || null;
  }

  /**
   * Get validation rules
   */
  getValidationRules() {
    try {
      const validationPath = path.join(__dirname, '../../..', '.github', 'Improvement-docs', 'contract_validation_rules.json');

      if (fs.existsSync(validationPath)) {
        const content = fs.readFileSync(validationPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('⚠️  Could not load validation rules:', error.message);
    }

    return null;
  }

  /**
   * Get LLM prompt template
   */
  getPromptTemplate() {
    try {
      const promptPath = path.join(__dirname, '../../..', '.github', 'Improvement-docs', 'llm_prompt_template_contracts.md');

      if (fs.existsSync(promptPath)) {
        return fs.readFileSync(promptPath, 'utf8');
      }
    } catch (error) {
      console.warn('⚠️  Could not load prompt template:', error.message);
    }

    return null;
  }

  /**
   * Check if structured extraction is available
   */
  isAvailable() {
    return this.loaded && this.spec !== null;
  }
}

// Singleton instance
const parser = new ExtractionSpecParser();

export default parser;
