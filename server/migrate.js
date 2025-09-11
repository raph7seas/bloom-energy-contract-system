#!/usr/bin/env node

/**
 * Bloom Energy Contract System - LocalStorage Migration CLI
 * 
 * This script helps users migrate their localStorage data to PostgreSQL database.
 * 
 * Usage:
 *   node migrate.js
 *   npm run migrate
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import LocalStorageMigration from './src/scripts/migrateFromLocalStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('🚀 Starting Bloom Energy Contract System Migration...\n');
  
  // Check if required environment variables are set
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    console.error('❌ DATABASE_URL or POSTGRES_URL environment variable is required.');
    console.error('Please set your PostgreSQL connection string in .env file:');
    console.error('DATABASE_URL="postgresql://username:password@localhost:5432/bloom_contracts"');
    process.exit(1);
  }

  try {
    const migration = new LocalStorageMigration();
    await migration.run();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the migration
main();