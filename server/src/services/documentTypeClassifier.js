/**
 * Document Type Classifier
 *
 * Intelligently classifies Bloom Energy contracts by analyzing content patterns.
 * Designed to be flexible - handles variations and hybrid documents.
 *
 * Returns: { type, confidence, hints }
 */

class DocumentTypeClassifier {
  constructor(spec) {
    this.spec = spec;
    this.classifierConfig = spec?.strategy || {};
  }

  /**
   * Classify a document by analyzing its content
   *
   * @param {string} text - Document text content
   * @param {string} filename - Optional filename for additional hints
   * @returns {Object} { type, confidence, detectedCues, alternativeTypes }
   */
  classify(text, filename = '') {
    if (!this.spec) {
      return this._genericClassification();
    }

    const results = [];

    // Extract header cues from spec
    const headerCues = this.classifierConfig.header_cues || {};
    const negativeCues = this.classifierConfig.negative_cues || [];

    // Analyze text for each document type
    Object.entries(headerCues).forEach(([docType, cues]) => {
      const matches = this._analyzeDocType(text, filename, docType, cues, negativeCues);
      if (matches.score > 0) {
        results.push({
          type: docType,
          confidence: matches.confidence,
          score: matches.score,
          matchedCues: matches.matchedCues,
          penalizedBy: matches.penalizedBy
        });
      }
    });

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    if (results.length === 0) {
      console.log('📄 No specific document type detected, using GENERIC');
      return this._genericClassification();
    }

    const primary = results[0];
    const alternatives = results.slice(1, 3).map(r => ({
      type: r.type,
      confidence: r.confidence
    }));

    console.log(`📄 Classified as: ${primary.type} (confidence: ${Math.round(primary.confidence * 100)}%)`);
    if (primary.matchedCues.length > 0) {
      console.log(`   Matched cues: ${primary.matchedCues.join(', ')}`);
    }

    return {
      type: primary.type,
      confidence: primary.confidence,
      detectedCues: primary.matchedCues,
      penalizedBy: primary.penalizedBy,
      alternativeTypes: alternatives,
      isGeneric: false
    };
  }

  /**
   * Analyze text for a specific document type
   */
  _analyzeDocType(text, filename, docType, cues, negativeCues) {
    let score = 0;
    const matchedCues = [];
    const penalizedBy = [];

    // Normalize text for matching
    const normalizedText = text.substring(0, 5000).toLowerCase(); // Check first 5000 chars for header
    const normalizedFilename = filename.toLowerCase();

    // Check positive cues
    cues.forEach(cue => {
      const normalizedCue = cue.toLowerCase();

      // Check in text
      if (normalizedText.includes(normalizedCue)) {
        score += 10;
        matchedCues.push(cue);
      }

      // Check in filename (bonus points)
      if (normalizedFilename.includes(normalizedCue.replace(/\s+/g, ''))) {
        score += 5;
        matchedCues.push(`filename: ${cue}`);
      }
    });

    // Check for execution markers (boost confidence)
    const executionMarkers = [
      'execution version',
      'executed',
      'duly executed',
      'counterparts',
      'witness whereof'
    ];

    executionMarkers.forEach(marker => {
      if (normalizedText.includes(marker)) {
        score += 3;
      }
    });

    // Check negative cues (penalize)
    negativeCues.forEach(negativeCue => {
      const normalizedNegative = negativeCue.toLowerCase();
      if (normalizedText.includes(normalizedNegative)) {
        score -= 15;
        penalizedBy.push(negativeCue);
      }
    });

    // Ensure score doesn't go negative
    score = Math.max(0, score);

    // Convert score to confidence (0-1 scale)
    // Max realistic score is ~30 (3 cues * 10 points)
    const confidence = Math.min(1.0, score / 30);

    return {
      score,
      confidence,
      matchedCues,
      penalizedBy
    };
  }

  /**
   * Return generic classification for unknown documents
   */
  _genericClassification() {
    return {
      type: 'GENERIC',
      confidence: 0.5,
      detectedCues: [],
      penalizedBy: [],
      alternativeTypes: [],
      isGeneric: true
    };
  }

  /**
   * Detect multiple document types in a single file (e.g., Framework + Addendum)
   * This is for future enhancement
   */
  detectMultipleTypes(text, filename = '') {
    // For now, just return single classification
    // Future: Implement section-based multi-type detection
    return [this.classify(text, filename)];
  }
}

export default DocumentTypeClassifier;
