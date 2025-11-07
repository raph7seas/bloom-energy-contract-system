/**
 * Multi-Document Processor Service
 * Minimal stub implementation for processing multiple documents
 */

import { EventEmitter } from 'events';

class MultiDocumentProcessor extends EventEmitter {
  constructor() {
    super();
    this.documents = [];
  }

  /**
   * Adds a document to the processor
   * @param {Object} document - Document to add
   */
  addDocument(document) {
    if (document) {
      this.documents.push(document);
    }
  }

  /**
   * Processes all added documents
   * @returns {Promise<Object[]>} Array of processed documents
   */
  async processAll() {
    // Simple passthrough implementation
    return this.documents;
  }

  /**
   * Clears all documents from the processor
   */
  clear() {
    this.documents = [];
  }

  /**
   * Gets all documents
   * @returns {Object[]} Array of documents
   */
  getDocuments() {
    return this.documents;
  }
}

export default MultiDocumentProcessor;
