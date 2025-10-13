# LocalStorage to PostgreSQL Migration Guide

This guide will help you migrate your Bloom Energy Contract System data from browser localStorage to the PostgreSQL database.

## Overview

The migration process involves:
1. **Exporting** data from your browser's localStorage
2. **Running** the migration script to import data into PostgreSQL
3. **Verifying** that all data was transferred correctly

## Prerequisites

Before starting the migration:

- ✅ PostgreSQL database is set up and running
- ✅ Environment variables are configured (`DATABASE_URL` or `POSTGRES_URL`)
- ✅ All dependencies are installed (`npm install`)
- ✅ Database schema is up to date (`npm run db:migrate`)

## Step 1: Export localStorage Data

### Method A: Automatic Export (Recommended)

1. **Open your browser** and navigate to your Bloom Energy Contract System
2. **Open Developer Tools** (F12 or right-click → Inspect)
3. **Go to the Console tab**
4. **Copy and paste** the contents of `localStorage-export.js` into the console
5. **Press Enter** to run the script
6. **Download** the generated JSON file or copy the displayed JSON data

### Method B: Manual Export

1. Open Developer Tools (F12)
2. Go to **Application** tab → **Storage** → **Local Storage**
3. Look for keys starting with `bloom-`:
   - `bloom-contracts`
   - `bloom-templates`
   - `bloom-learned-rules`
4. Copy the values and create a JSON file in this format:

```json
{
  "contracts": [...],
  "templates": [...],
  "learnedRules": [...]
}
```

## Step 2: Run Migration Script

### Option A: Interactive Migration

Run the migration script and follow the prompts:

```bash
npm run migrate
```

The script will ask you to:
1. Choose how to provide your data (file or paste JSON)
2. Confirm backup creation
3. Review migration summary
4. Handle conflicts for existing data

### Option B: File-based Migration

If you have your data in a JSON file:

```bash
npm run migrate
# Choose option 1 when prompted
# Enter the path to your JSON file
```

### Option C: Direct JSON Input

If you want to paste JSON directly:

```bash
npm run migrate  
# Choose option 2 when prompted
# Paste your JSON data and press Enter twice
```

## Step 3: Verify Migration

After the migration completes:

1. **Check the summary** displayed by the migration script
2. **Review any error messages** for failed migrations
3. **Test your application** to ensure data is accessible
4. **Use database tools** to verify data integrity:

```bash
# View your data using Prisma Studio
npm run db:studio

# Or use direct database queries
psql $DATABASE_URL -c "SELECT COUNT(*) FROM contracts;"
```

## Data Transformation

The migration script automatically transforms your localStorage data to match the database schema:

### Contracts

| localStorage Field | Database Field | Notes |
|-------------------|----------------|-------|
| `customerName` | `client` | |
| `ratedCapacity` | `capacity` | Converted to number |
| `contractTerm` | `term` | Converted to number |
| `solutionType` | `systemType` | |
| `annualEscalation` | `financial.escalation` | |
| `guaranteedCriticalOutput` | `operating.criticalOutput` | |

### Templates

| localStorage Field | Database Field | Notes |
|-------------------|----------------|-------|
| `name` | `name` | |
| `description` | `description` | |
| `category` | `category` | Default: 'GENERAL' |
| `templateData` | `templateData` | Stored as JSON |
| `isPublic` | `isPublic` | Default: false |

### Learned Rules

| localStorage Field | Database Field | Notes |
|-------------------|----------------|-------|
| `type` | `ruleType` | Default: 'VALIDATION' |
| `rule` | `condition` | Stored as JSON |
| `confidence` | `confidenceScore` | Converted to number |
| `sourceContracts` | `sourceContractIds` | Array of contract IDs |

## Troubleshooting

### Common Issues

**1. Database Connection Error**
```
❌ DATABASE_URL or POSTGRES_URL environment variable is required
```
**Solution:** Check your `.env` file and ensure the database URL is correct.

**2. Invalid JSON Data**
```
❌ Invalid JSON: Unexpected token
```
**Solution:** Validate your JSON using an online JSON validator before running the migration.

**3. Migration Timeout**
```
Migration appears to be stuck...
```
**Solution:** Check your database connection and ensure PostgreSQL is running.

**4. Data Conflicts**
```
Contract BEC-001 already exists. Overwrite? (y/n)
```
**Solution:** Choose 'y' to overwrite existing data or 'n' to skip.

### Advanced Troubleshooting

**Enable Debug Logging:**
```bash
DEBUG=migration npm run migrate
```

**Check Database Schema:**
```bash
npm run db:studio
```

**Verify Data Integrity:**
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.contract.count().then(count => console.log(\`Contracts: \${count}\`));
prisma.contractTemplate.count().then(count => console.log(\`Templates: \${count}\`));
prisma.learnedRule.count().then(count => console.log(\`Rules: \${count}\`));
"
```

## Backup and Recovery

### Creating Backups

The migration script automatically offers to create a backup. You can also create manual backups:

```bash
# Export current database to JSON
node -e "
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

Promise.all([
  prisma.contract.findMany({ include: { financial: true, technical: true, operating: true } }),
  prisma.contractTemplate.findMany(),
  prisma.learnedRule.findMany()
]).then(([contracts, templates, rules]) => {
  const backup = { timestamp: new Date().toISOString(), contracts, templates, rules };
  fs.writeFileSync(\`backup-\${Date.now()}.json\`, JSON.stringify(backup, null, 2));
  console.log('Backup created successfully');
}).finally(() => prisma.\$disconnect());
"
```

### Restoring from Backup

```bash
# Reset database and restore from backup
npm run db:reset
npm run migrate
# Use your backup JSON file when prompted
```

## Migration Script Options

### Programmatic Usage

You can also use the migration functions programmatically:

```javascript
import { migrateContractsFromData, migrateTemplatesFromData } from './server/src/scripts/migrateFromLocalStorage.js';

// Migrate contracts only
const contractResults = await migrateContractsFromData(contractsArray);
console.log(`Migrated ${contractResults.success} contracts`);

// Migrate templates only  
const templateResults = await migrateTemplatesFromData(templatesArray);
console.log(`Migrated ${templateResults.success} templates`);
```

### Custom Data Transformations

If you need custom data transformations, modify the transform functions in `server/src/scripts/migrateFromLocalStorage.js`:

- `transformContract()` - Transform contract data
- `transformTemplate()` - Transform template data
- `transformLearnedRule()` - Transform learned rule data

## Performance Considerations

For large datasets:

1. **Run migration during off-peak hours**
2. **Increase database connection timeout**
3. **Consider batch processing** for datasets > 1000 items
4. **Monitor database performance** during migration

## Security Notes

- 🔐 **Backup sensitive data** before migration
- 🔐 **Use secure database connections** (SSL)
- 🔐 **Limit database permissions** for migration user
- 🔐 **Validate data integrity** after migration

## Post-Migration Steps

After successful migration:

1. **Test application functionality** thoroughly
2. **Update frontend code** to use API endpoints instead of localStorage
3. **Clear localStorage** to prevent conflicts
4. **Monitor application logs** for any issues
5. **Update deployment scripts** to use database instead of localStorage

## Getting Help

If you encounter issues:

1. **Check the troubleshooting section** above
2. **Review error logs** in the console
3. **Verify database schema** matches expectations
4. **Test with smaller datasets** first
5. **Contact support** with error details and migration logs

---

## Quick Reference

```bash
# Complete migration workflow
npm run migrate                    # Run interactive migration
npm run db:studio                  # View migrated data
npm run db:reset                   # Reset database if needed
npm run db:setup                   # Reinitialize database
```

**Migration Files:**
- `server/src/scripts/migrateFromLocalStorage.js` - Main migration logic
- `server/migrate.js` - CLI wrapper
- `localStorage-export.js` - Browser export utility
- `MIGRATION.md` - This documentation

**Environment Variables:**
- `DATABASE_URL` or `POSTGRES_URL` - Database connection string
- `NODE_ENV` - Environment mode (development/production)