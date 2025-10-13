#!/usr/bin/env node

/**
 * Extraction Comparison Tool
 *
 * Compares the last 2 document analyses to show improvements from structured extraction
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
  gray: '\x1b[90m'
};

function formatValue(value) {
  if (value === null || value === undefined) return `${colors.gray}null${colors.reset}`;
  if (value === 'NOT SPECIFIED') return `${colors.red}NOT SPECIFIED${colors.reset}`;
  return `${colors.green}${JSON.stringify(value)}${colors.reset}`;
}

function compareField(fieldName, oldValue, newValue) {
  const hasImproved = (
    (oldValue === 'NOT SPECIFIED' || oldValue === null || oldValue === undefined) &&
    (newValue !== 'NOT SPECIFIED' && newValue !== null && newValue !== undefined)
  );

  const hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);

  if (hasImproved) {
    return `${colors.bright}${colors.green}✓ IMPROVED${colors.reset}`;
  } else if (hasChanged) {
    return `${colors.yellow}◉ CHANGED${colors.reset}`;
  } else {
    return `${colors.gray}○ SAME${colors.reset}`;
  }
}

async function compareLastTwoExtractions() {
  try {
    console.log(`\n${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║          EXTRACTION COMPARISON TOOL                        ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    // Fetch last 2 documents with extracted data
    const uploads = await prisma.uploadedFile.findMany({
      where: {
        extractedData: {
          not: null
        }
      },
      orderBy: {
        uploadDate: 'desc'
      },
      take: 2,
      select: {
        id: true,
        fileName: true,
        originalName: true,
        uploadDate: true,
        extractedData: true
      }
    });

    if (uploads.length < 2) {
      console.log(`${colors.yellow}⚠️  Need at least 2 analyzed documents to compare${colors.reset}`);
      console.log(`${colors.gray}   Found: ${uploads.length} document(s)${colors.reset}\n`);

      if (uploads.length === 1) {
        console.log(`${colors.cyan}💡 Upload and analyze another document to enable comparison${colors.reset}\n`);
      }
      return;
    }

    const [newer, older] = uploads;

    console.log(`${colors.bright}Comparing:${colors.reset}`);
    console.log(`  ${colors.cyan}[OLD]${colors.reset} ${older.fileName || older.originalName} (${new Date(older.uploadDate).toLocaleString()})`);
    console.log(`  ${colors.green}[NEW]${colors.reset} ${newer.fileName || newer.originalName} (${new Date(newer.uploadDate).toLocaleString()})`);
    console.log();

    // Parse analyses
    const oldAnalysis = typeof older.extractedData === 'string' ? JSON.parse(older.extractedData) : older.extractedData;
    const newAnalysis = typeof newer.extractedData === 'string' ? JSON.parse(newer.extractedData) : newer.extractedData;

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

    console.log(`${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
    console.log(`${colors.bright}FIELD COMPARISON:${colors.reset}\n`);

    let improvedCount = 0;
    let changedCount = 0;
    let sameCount = 0;

    for (const field of fieldsToCompare) {
      const oldValue = oldAnalysis.extractedData?.[field];
      const newValue = newAnalysis.extractedData?.[field];

      const status = compareField(field, oldValue, newValue);

      if (status.includes('IMPROVED')) improvedCount++;
      else if (status.includes('CHANGED')) changedCount++;
      else sameCount++;

      console.log(`${status} ${colors.bright}${field}${colors.reset}`);
      console.log(`  ${colors.cyan}OLD:${colors.reset} ${formatValue(oldValue)}`);
      console.log(`  ${colors.green}NEW:${colors.reset} ${formatValue(newValue)}`);
      console.log();
    }

    // Rules comparison
    const oldRules = oldAnalysis.extractedData?.businessRules || oldAnalysis.businessRules || [];
    const newRules = newAnalysis.extractedData?.businessRules || newAnalysis.businessRules || [];

    console.log(`${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
    console.log(`${colors.bright}BUSINESS RULES:${colors.reset}\n`);
    console.log(`  ${colors.cyan}OLD:${colors.reset} ${oldRules.length} rules`);
    console.log(`  ${colors.green}NEW:${colors.reset} ${newRules.length} rules`);

    if (newRules.length > oldRules.length) {
      console.log(`  ${colors.green}✓ ${newRules.length - oldRules.length} more rules extracted${colors.reset}`);
    } else if (newRules.length < oldRules.length) {
      console.log(`  ${colors.yellow}◉ ${oldRules.length - newRules.length} fewer rules${colors.reset}`);
    }
    console.log();

    // Structured extraction metadata (only in newer analysis if implemented)
    if (newAnalysis.structuredExtraction) {
      console.log(`${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
      console.log(`${colors.bright}STRUCTURED EXTRACTION INFO:${colors.reset}\n`);
      console.log(`  ${colors.bright}Document Type:${colors.reset} ${newAnalysis.structuredExtraction.documentType}`);
      console.log(`  ${colors.bright}Confidence:${colors.reset} ${(newAnalysis.structuredExtraction.confidence * 100).toFixed(1)}%`);
      console.log(`  ${colors.bright}Detected Cues:${colors.reset} ${newAnalysis.structuredExtraction.detectedCues?.join(', ') || 'None'}`);
      console.log(`  ${colors.bright}Candidates Found:${colors.reset} ${newAnalysis.structuredExtraction.candidateFieldsFound?.length || 0} fields`);
      console.log();
    }

    // Summary
    console.log(`${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
    console.log(`${colors.bright}SUMMARY:${colors.reset}\n`);
    console.log(`  ${colors.green}✓ Improved:${colors.reset} ${improvedCount} fields`);
    console.log(`  ${colors.yellow}◉ Changed:${colors.reset}  ${changedCount} fields`);
    console.log(`  ${colors.gray}○ Same:${colors.reset}     ${sameCount} fields`);
    console.log();

    if (improvedCount > 0) {
      console.log(`${colors.bright}${colors.green}🎉 Extraction quality improved on ${improvedCount} field(s)!${colors.reset}\n`);
    } else if (changedCount > 0) {
      console.log(`${colors.yellow}⚠️  Some values changed - review for accuracy${colors.reset}\n`);
    } else {
      console.log(`${colors.gray}No significant changes detected${colors.reset}\n`);
    }

  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run comparison
compareLastTwoExtractions().catch(console.error);
