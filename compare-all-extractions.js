#!/usr/bin/env node

/**
 * Bulk Extraction Comparison Tool
 *
 * Compares ALL documents before/after structured extraction
 * Groups documents by upload batch and shows aggregate improvements
 */

import { PrismaClient } from './generated/prisma/index.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const prisma = new PrismaClient();

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m'
};

function formatValue(value) {
  if (value === null || value === undefined) return `${colors.gray}null${colors.reset}`;
  if (value === 'NOT SPECIFIED') return `${colors.red}NOT SPECIFIED${colors.reset}`;
  return `${colors.green}${JSON.stringify(value)}${colors.reset}`;
}

function getFieldScore(value) {
  if (value === null || value === undefined || value === 'NOT SPECIFIED') return 0;
  return 1;
}

function compareField(fieldName, oldValue, newValue) {
  const hasImproved = (
    (oldValue === 'NOT SPECIFIED' || oldValue === null || oldValue === undefined) &&
    (newValue !== 'NOT SPECIFIED' && newValue !== null && newValue !== undefined)
  );

  const hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);
  const hasRegressed = (
    (oldValue !== 'NOT SPECIFIED' && oldValue !== null && oldValue !== undefined) &&
    (newValue === 'NOT SPECIFIED' || newValue === null || newValue === undefined)
  );

  if (hasImproved) {
    return { status: 'IMPROVED', symbol: '✓', color: colors.green };
  } else if (hasRegressed) {
    return { status: 'REGRESSED', symbol: '✗', color: colors.red };
  } else if (hasChanged) {
    return { status: 'CHANGED', symbol: '◉', color: colors.yellow };
  } else {
    return { status: 'SAME', symbol: '○', color: colors.gray };
  }
}

async function compareAllExtractions() {
  try {
    console.log(`\n${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║        BULK EXTRACTION COMPARISON - ALL DOCUMENTS                  ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    // Fetch ALL documents with extracted data
    const allUploads = await prisma.uploadedFile.findMany({
      where: {
        extractedData: {
          not: null
        }
      },
      orderBy: {
        uploadDate: 'asc'
      },
      select: {
        id: true,
        fileName: true,
        originalName: true,
        uploadDate: true,
        extractedData: true
      }
    });

    if (allUploads.length === 0) {
      console.log(`${colors.yellow}⚠️  No analyzed documents found${colors.reset}\n`);
      return;
    }

    console.log(`${colors.cyan}📊 Found ${allUploads.length} analyzed document(s)${colors.reset}\n`);

    // Group documents by upload session (within 5 minutes = same session)
    const sessions = [];
    let currentSession = [];
    let lastUploadTime = null;

    for (const upload of allUploads) {
      if (!lastUploadTime || (upload.uploadDate - lastUploadTime) > 5 * 60 * 1000) {
        // New session
        if (currentSession.length > 0) {
          sessions.push(currentSession);
        }
        currentSession = [upload];
      } else {
        currentSession.push(upload);
      }
      lastUploadTime = upload.uploadDate;
    }
    if (currentSession.length > 0) {
      sessions.push(currentSession);
    }

    console.log(`${colors.magenta}📦 Upload Sessions: ${sessions.length}${colors.reset}`);
    sessions.forEach((session, idx) => {
      console.log(`   ${colors.gray}Session ${idx + 1}: ${session.length} document(s) at ${new Date(session[0].uploadDate).toLocaleString()}${colors.reset}`);
    });
    console.log();

    // Key fields to compare
    const fieldsToCompare = [
      'customerName',
      'siteId',
      'systemCapacity',
      'contractTerm',
      'baseRate',
      'escalationRate',
      'availabilityGuarantee',
      'efficiencyWarranty',
      'outputWarranty',
      'voltage',
      'solutionType',
      'documentType'
    ];

    // If we have 2+ sessions, compare session-by-session
    if (sessions.length >= 2) {
      console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════════${colors.reset}`);
      console.log(`${colors.bright}SESSION COMPARISON MODE${colors.reset}`);
      console.log(`${colors.gray}Comparing documents from different upload sessions...${colors.reset}\n`);

      // Compare each session to the previous one
      for (let i = 1; i < sessions.length; i++) {
        const oldSession = sessions[i - 1];
        const newSession = sessions[i];

        console.log(`${colors.bright}${colors.magenta}▼ SESSION ${i} vs SESSION ${i + 1}${colors.reset}`);
        console.log(`  ${colors.cyan}Session ${i}:${colors.reset} ${oldSession.length} doc(s) at ${new Date(oldSession[0].uploadDate).toLocaleString()}`);
        console.log(`  ${colors.green}Session ${i + 1}:${colors.reset} ${newSession.length} doc(s) at ${new Date(newSession[0].uploadDate).toLocaleString()}\n`);

        // Aggregate statistics across all docs in both sessions
        let totalImprovements = 0;
        let totalRegressions = 0;
        let totalChanges = 0;
        let totalFields = 0;
        let oldTotalRules = 0;
        let newTotalRules = 0;
        let documentsWithStructuredExtraction = 0;

        const documentResults = [];

        // Compare each document in old session with corresponding document in new session
        const maxDocs = Math.min(oldSession.length, newSession.length);

        for (let docIdx = 0; docIdx < maxDocs; docIdx++) {
          const oldDoc = oldSession[docIdx];
          const newDoc = newSession[docIdx];

          const oldAnalysis = typeof oldDoc.extractedData === 'string' ? JSON.parse(oldDoc.extractedData) : oldDoc.extractedData;
          const newAnalysis = typeof newDoc.extractedData === 'string' ? JSON.parse(newDoc.extractedData) : newDoc.extractedData;

          let docImprovements = 0;
          let docRegressions = 0;
          let docChanges = 0;
          let oldScore = 0;
          let newScore = 0;

          for (const field of fieldsToCompare) {
            // Handle both data structures: data.analysis.extractedData or data.extractedData
            const oldValue = oldAnalysis.analysis?.extractedData?.[field] || oldAnalysis.extractedData?.[field] || oldAnalysis[field];
            const newValue = newAnalysis.analysis?.extractedData?.[field] || newAnalysis.extractedData?.[field] || newAnalysis[field];

            oldScore += getFieldScore(oldValue);
            newScore += getFieldScore(newValue);

            const comparison = compareField(field, oldValue, newValue);

            if (comparison.status === 'IMPROVED') {
              docImprovements++;
              totalImprovements++;
            } else if (comparison.status === 'REGRESSED') {
              docRegressions++;
              totalRegressions++;
            } else if (comparison.status === 'CHANGED') {
              docChanges++;
              totalChanges++;
            }
          }

          totalFields += fieldsToCompare.length;

          // Handle both data structures
          const oldRules = oldAnalysis.analysis?.extractedRules || oldAnalysis.extractedData?.businessRules || oldAnalysis.businessRules || [];
          const newRules = newAnalysis.analysis?.extractedRules || newAnalysis.extractedData?.businessRules || newAnalysis.businessRules || [];
          oldTotalRules += oldRules.length;
          newTotalRules += newRules.length;

          // Check for structured extraction in multiple places
          const hasStructuredExtraction = newAnalysis.structuredExtraction || newAnalysis.analysis?.structuredExtraction;
          if (hasStructuredExtraction) {
            documentsWithStructuredExtraction++;
          }

          const oldFilename = (oldDoc.fileName || oldDoc.originalName).substring(0, 60);
          const newFilename = (newDoc.fileName || newDoc.originalName).substring(0, 60);

          documentResults.push({
            docIdx,
            oldFilename,
            newFilename,
            improvements: docImprovements,
            regressions: docRegressions,
            changes: docChanges,
            oldScore,
            newScore,
            oldRules: oldRules.length,
            newRules: newRules.length,
            hasStructuredExtraction: hasStructuredExtraction,
            documentType: hasStructuredExtraction?.documentType,
            confidence: hasStructuredExtraction?.confidence
          });
        }

        // Print document-by-document results
        console.log(`${colors.bright}DOCUMENT RESULTS:${colors.reset}\n`);

        documentResults.forEach((result, idx) => {
          const scoreChange = result.newScore - result.oldScore;
          const scoreColor = scoreChange > 0 ? colors.green : scoreChange < 0 ? colors.red : colors.gray;
          const scoreSymbol = scoreChange > 0 ? '▲' : scoreChange < 0 ? '▼' : '●';

          console.log(`${colors.bright}[${idx + 1}]${colors.reset} ${colors.gray}${result.oldFilename}${colors.reset}`);
          console.log(`    ${scoreColor}${scoreSymbol} Score: ${result.oldScore}/${fieldsToCompare.length} → ${result.newScore}/${fieldsToCompare.length} (${scoreChange >= 0 ? '+' : ''}${scoreChange})${colors.reset}`);

          if (result.improvements > 0) {
            console.log(`    ${colors.green}✓ ${result.improvements} field(s) improved${colors.reset}`);
          }
          if (result.regressions > 0) {
            console.log(`    ${colors.red}✗ ${result.regressions} field(s) regressed${colors.reset}`);
          }
          if (result.changes > 0) {
            console.log(`    ${colors.yellow}◉ ${result.changes} field(s) changed${colors.reset}`);
          }

          const ruleDiff = result.newRules - result.oldRules;
          if (ruleDiff !== 0) {
            const ruleColor = ruleDiff > 0 ? colors.green : colors.red;
            console.log(`    ${ruleColor}📋 Rules: ${result.oldRules} → ${result.newRules} (${ruleDiff >= 0 ? '+' : ''}${ruleDiff})${colors.reset}`);
          }

          if (result.hasStructuredExtraction) {
            console.log(`    ${colors.cyan}🔍 Doc Type: ${result.documentType} (${Math.round(result.confidence * 100)}%)${colors.reset}`);
          }

          console.log();
        });

        // Session aggregate summary
        console.log(`${colors.bright}═══════════════════════════════════════════════════════════════════${colors.reset}\n`);
        console.log(`${colors.bright}SESSION AGGREGATE SUMMARY:${colors.reset}\n`);

        const improvementRate = (totalImprovements / totalFields * 100).toFixed(1);
        const regressionRate = (totalRegressions / totalFields * 100).toFixed(1);

        console.log(`  ${colors.green}✓ Improved:${colors.reset}    ${totalImprovements} fields (${improvementRate}%)`);
        console.log(`  ${colors.red}✗ Regressed:${colors.reset}   ${totalRegressions} fields (${regressionRate}%)`);
        console.log(`  ${colors.yellow}◉ Changed:${colors.reset}    ${totalChanges} fields`);
        console.log(`  ${colors.gray}○ Same:${colors.reset}        ${totalFields - totalImprovements - totalRegressions - totalChanges} fields`);
        console.log();

        const ruleIncrease = newTotalRules - oldTotalRules;
        console.log(`  ${colors.bright}📋 Business Rules:${colors.reset}`);
        console.log(`     Old Total: ${oldTotalRules}`);
        console.log(`     New Total: ${newTotalRules}`);
        if (ruleIncrease > 0) {
          console.log(`     ${colors.green}+${ruleIncrease} more rules extracted${colors.reset}`);
        } else if (ruleIncrease < 0) {
          console.log(`     ${colors.red}${ruleIncrease} fewer rules${colors.reset}`);
        }
        console.log();

        if (documentsWithStructuredExtraction > 0) {
          console.log(`  ${colors.cyan}🔍 Structured Extraction:${colors.reset} ${documentsWithStructuredExtraction}/${newSession.length} document(s)`);
          console.log();
        }

        if (totalImprovements > totalRegressions) {
          console.log(`${colors.bright}${colors.green}🎉 NET IMPROVEMENT: +${totalImprovements - totalRegressions} fields${colors.reset}\n`);
        } else if (totalRegressions > totalImprovements) {
          console.log(`${colors.bright}${colors.red}⚠️  NET REGRESSION: -${totalRegressions - totalImprovements} fields${colors.reset}\n`);
        } else {
          console.log(`${colors.gray}No net change in extraction quality${colors.reset}\n`);
        }

        console.log(`${colors.bright}═══════════════════════════════════════════════════════════════════${colors.reset}\n`);
      }
    } else {
      // Single session - show all documents individually
      console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════════${colors.reset}`);
      console.log(`${colors.bright}SINGLE SESSION MODE${colors.reset}`);
      console.log(`${colors.gray}All documents from same upload session - showing individual results...${colors.reset}\n`);

      allUploads.forEach((doc, idx) => {
        const analysis = typeof doc.extractedData === 'string' ? JSON.parse(doc.extractedData) : doc.extractedData;

        let score = 0;
        for (const field of fieldsToCompare) {
          // Handle both data structures
          const value = analysis.analysis?.extractedData?.[field] || analysis.extractedData?.[field] || analysis[field];
          score += getFieldScore(value);
        }

        // Handle both data structures
        const rules = analysis.analysis?.extractedRules || analysis.extractedData?.businessRules || analysis.businessRules || [];

        console.log(`${colors.bright}[${idx + 1}/${allUploads.length}]${colors.reset} ${colors.cyan}${doc.fileName || doc.originalName}${colors.reset}`);
        console.log(`    Score: ${score}/${fieldsToCompare.length} fields filled`);
        console.log(`    Rules: ${rules.length}`);

        if (analysis.structuredExtraction) {
          console.log(`    ${colors.cyan}Doc Type: ${analysis.structuredExtraction.documentType} (${Math.round(analysis.structuredExtraction.confidence * 100)}%)${colors.reset}`);
        } else {
          console.log(`    ${colors.gray}Structured Extraction: Not available${colors.reset}`);
        }
        console.log();
      });

      console.log(`${colors.bright}${colors.yellow}💡 TIP:${colors.reset} Upload and analyze the same documents again to see improvements!${colors.reset}\n`);
    }

  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run comparison
compareAllExtractions().catch(console.error);
