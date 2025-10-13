/**
 * Pattern Matcher
 *
 * Uses regex patterns from the extraction spec to find candidate field values.
 * These candidates are hints for the LLM, not final values.
 *
 * Design: Flexible pattern matching that provides context snippets to LLM
 */

class PatternMatcher {
  constructor() {
    this.patternCache = new Map();
  }

  /**
   * Extract candidate values for all fields in a document type
   *
   * @param {string} text - Document text
   * @param {Object} fieldDefinitions - Field definitions from spec
   * @returns {Object} Map of fieldKey -> candidates
   */
  extractCandidates(text, fieldDefinitions) {
    const candidates = {};

    if (!fieldDefinitions) {
      return candidates;
    }

    Object.entries(fieldDefinitions).forEach(([fieldKey, fieldDef]) => {
      const fieldCandidates = this._extractFieldCandidates(
        text,
        fieldKey,
        fieldDef
      );

      if (fieldCandidates.length > 0) {
        candidates[fieldKey] = fieldCandidates;
      }
    });

    return candidates;
  }

  /**
   * Extract candidates for a specific field
   */
  _extractFieldCandidates(text, fieldKey, fieldDef) {
    const candidates = [];
    const patterns = fieldDef.patterns || [];

    patterns.forEach(pattern => {
      try {
        // Get or create regex
        const regex = this._getRegex(pattern);

        // Find all matches
        let match;
        while ((match = regex.exec(text)) !== null) {
          const matchedGroups = match.groups || {};

          // Extract the value from named groups
          const value = matchedGroups.value ||
                       matchedGroups.val ||
                       matchedGroups.name ||
                       matchedGroups.date ||
                       matchedGroups.rule ||
                       match[1]; // Fallback to first capture group

          if (value && value.trim()) {
            // Get surrounding context (50 chars before/after)
            const startIdx = Math.max(0, match.index - 50);
            const endIdx = Math.min(text.length, match.index + match[0].length + 50);
            const context = text.substring(startIdx, endIdx).trim();

            candidates.push({
              value: value.trim(),
              context: context,
              position: match.index,
              matchLength: match[0].length,
              pattern: pattern
            });
          }

          // Prevent infinite loop on zero-length matches
          if (match.index === regex.lastIndex) {
            regex.lastIndex++;
          }
        }
      } catch (error) {
        console.warn(`⚠️  Invalid pattern for ${fieldKey}:`, pattern, error.message);
      }
    });

    // Remove duplicates and sort by position
    const uniqueCandidates = this._deduplicateCandidates(candidates);

    return uniqueCandidates.slice(0, 5); // Keep top 5 candidates
  }

  /**
   * Get or create cached regex
   */
  _getRegex(pattern) {
    if (this.patternCache.has(pattern)) {
      return new RegExp(this.patternCache.get(pattern), 'g');
    }

    // Cache the pattern (remove 'g' flag from pattern string if present)
    const cleanPattern = pattern.replace(/\/g$/, '');
    this.patternCache.set(pattern, cleanPattern);

    return new RegExp(cleanPattern, 'g');
  }

  /**
   * Deduplicate candidates that have similar values
   */
  _deduplicateCandidates(candidates) {
    if (candidates.length === 0) {
      return [];
    }

    const unique = [];
    const seenValues = new Set();

    candidates.forEach(candidate => {
      // Normalize value for comparison
      const normalizedValue = candidate.value.toLowerCase().replace(/\s+/g, ' ').trim();

      if (!seenValues.has(normalizedValue)) {
        seenValues.add(normalizedValue);
        unique.push(candidate);
      }
    });

    // Sort by position (earlier matches first)
    return unique.sort((a, b) => a.position - b.position);
  }

  /**
   * Build context snippets for LLM prompt
   *
   * Groups related candidates and formats them for the LLM
   */
  buildContextSnippets(candidates, maxSnippets = 20) {
    const snippets = [];
    let snippetCount = 0;

    Object.entries(candidates).forEach(([fieldKey, fieldCandidates]) => {
      if (snippetCount >= maxSnippets) {
        return;
      }

      fieldCandidates.forEach(candidate => {
        if (snippetCount >= maxSnippets) {
          return;
        }

        snippets.push({
          field: fieldKey,
          value: candidate.value,
          context: candidate.context
        });

        snippetCount++;
      });
    });

    return snippets;
  }

  /**
   * Extract table data for fields marked as table_cues
   * This is a simple implementation - can be enhanced with proper table parsing
   */
  extractTableData(text, tableCues) {
    const tableData = [];

    if (!tableCues || tableCues.length === 0) {
      return tableData;
    }

    // Look for lines that contain table cues
    const lines = text.split('\n');

    tableCues.forEach(cue => {
      const cueLower = cue.toLowerCase();
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(cueLower)) {
          // Extract this line and next 5 lines as potential table rows
          const tableLines = lines.slice(index, Math.min(index + 6, lines.length));
          tableData.push({
            cue,
            lines: tableLines,
            startPosition: index
          });
        }
      });
    });

    return tableData;
  }
}

export default PatternMatcher;
