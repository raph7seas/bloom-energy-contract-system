# Bloom Energy Contract Rules Engine - Cleanup Plan

**Generated**: October 13, 2025
**Project Size**: 209MB total (81MB node_modules, 100MB uploads, 28MB source)
**Potential Cleanup**: ~20MB of duplicate/temporary files

---

## Executive Summary

This analysis identified **151 files** that can be safely removed or archived, organized into four categories:
1. **Duplicate Files** (67 files) - Backup copies with " 2" suffix
2. **Session Documentation** (36 files) - Debugging/session notes to archive
3. **Test/Debug Scripts** (45 files) - One-off testing scripts
4. **Development Artifacts** (3 files) - Log files and temp data

**Recommended Action**: Archive session docs, delete duplicates and temp files, keep strategic test scripts.

---

## Category 1: DUPLICATE FILES - DELETE (67 files)

### A. Asset Files (32 files - ~2MB)
All SVG files in `assets/` directory with " 2" suffix are exact duplicates.

**Files to DELETE:**
```
assets/05238c0abff0d73ec1bbb4b53c1e31c50909a182 2.svg
assets/09a08cbf1465634051d6b4dfef2565db97685cbb 2.svg
assets/1872de15b41a482fa39c8047cbaf62c40e483651 2.svg
assets/2b53a7c581be1035e939f717d2b11f239e35c5e3 2.svg
assets/2f6932b5c464852cdeaf38fdfc6ede6eb85710f7 2.svg
assets/357ddb6ca147011a2f92d07b55b9585e3dca89b4 2.svg
assets/39eba15b7df173ce5b0ed1097d7ea35ce1b64a99 2.svg
assets/3b1aba9374e2487a9c6afa733fdc3424fcbf6644 2.svg
assets/58f5727f7f8bc6040e64d34fcc5fd2dcba4c5f19 2.svg
assets/5bd483445ff776019128324fe061a62fdd0178d4 2.svg
assets/61b7cf5659eb7e51447b47d7a82d219611fb7793 2.svg
assets/68418235347948b935468dec8f3fb8c2af3c37aa 2.svg
assets/689543e785392607ffd8baf51356e55f103c12ef 2.svg
assets/783c67c7e3c9ec99198f6da0a516d9f629e3bf42 2.svg
assets/795ede0925d1e485147adafa91ec719f165caa30 2.svg
assets/79e33daf7d0767c68d012641460b665adf0c0ebe 2.svg
assets/8b79777c9cd70a5f83618286686f2c567907afff 2.svg
assets/8f76e5a2ac9a4908447bf10971aeccc3f0916aa6 2.svg
assets/938a6eed20b2174b2133de2f58a55770e0b2c359 2.svg
assets/a41fdaa146396022a77386f616e6bc5972a9179d 2.svg
assets/b3a80785b2375449ff46fa8d7040828cb3318220 2.svg
assets/c379027dcf4bea6bd49bd9763b96d911dcf783af 2.svg
assets/c68b953f0b453b3661d407f5f868bd73e02996a5 2.png
assets/db0865dba7003924167d02d554fbe6dda30bf995 2.svg
assets/e07bfb89adac2642cb4a9e289dec9b01b67c9372 2.svg
assets/e331c1a6a40f323e15437e8158678fdfabb054c2 2.svg
assets/ec8676b3f4b98b704b1ef2e0d67180e4670b4466 2.svg
assets/f086e7917c3cd7e9b600565f5e3d0f282e9543fd 2.svg
assets/f27cbe0b05bde8cbbd1bd43713b1c905e4bac09e 2.svg
assets/f28e4c2f6bfdf68bc8bd214a0d7ce3f810a68a35 2.svg
assets/f9e278ebec816ffcd827f8edcc08775acc7d7013 2.svg
assets/f9f969fb2e1fdde49e75ea8e3401cf7409e3d500 2.svg
assets/ff37eaed9e8438f528f7df994b9ae17bf97853b0 2.svg
```

**Reason**: These are identical copies of existing assets. The originals without " 2" suffix are already in use.

---

### B. Environment Files (2 files)
**Files to DELETE:**
```
.env 2.development
.env 2.production
```

**Reason**: Duplicate environment configs. Keep `.env.development` and `.env.production` instead.

**Files to KEEP:**
- `.env` - Active environment file (gitignored)
- `.env.local` - Local overrides (gitignored)
- `.env.example` - Template for developers (tracked)
- `.env.development` - Development config
- `.env.production` - Production config

---

### C. Configuration Files (3 files)
**Files to DELETE:**
```
babel.config 2.js
jest.config 2.js
localStorage-export 2.js
```

**Reason**: Exact duplicates (verified with diff). Keep originals without " 2" suffix.

---

### D. Server Routes (4 files)
**Files to DELETE:**
```
server/src/routes/bulk 2.js
server/src/routes/documents 2.js
server/src/routes/monitoring 2.js
server/src/routes/notifications 2.js
```

**Reason**: Backup copies. The main versions are actively imported by server.js.

---

### E. Server Services (7 files)
**Files to DELETE:**
```
server/src/services/bulkOperationsService 2.js
server/src/services/cacheService 2.js
server/src/services/documentProcessingService 2.js
server/src/services/errorHandlingService 2.js
server/src/services/loggingService 2.js
server/src/services/notificationService 2.js
```

**Reason**: Backup copies. Active services are imported throughout the application.

---

### F. Middleware (1 file)
**Files to DELETE:**
```
server/src/middleware/aiCache 2.js
```

**Reason**: Duplicate of `aiCache.js` which is actively used.

---

### G. Scripts & Infrastructure (8 files)
**Files to DELETE:**
```
server/migrate 2.js
server/prisma/seed 2.js
server/scripts/health-check 2.js
server/src/scripts/migrateFromLocalStorage 2.js
scripts/deploy 2.sh
scripts/deploy-local 2.sh
aws/cloudformation-template 2.yml
docker/Dockerfile 2.production
```

**Reason**: Backup copies of infrastructure scripts. Keep originals.

---

### H. Database Migrations (4 files)
**Files to DELETE:**
```
prisma/migrations/20250907051906_init/migration 2.sql
prisma/migrations/20250909050907_add_user_authentication/migration 2.sql
prisma/migrations/20250909092630_add_audit_versioning/migration 2.sql
prisma/migrations/20250911220518_multi_document_upload/migration 2.sql
```

**Reason**: Backup copies of applied migrations. Never modify applied migrations.

---

### I. Frontend Files (3 files)
**Files to DELETE:**
```
src/contexts/AuthContext 2.jsx
src/test/setup 2.ts
```

**Reason**: Duplicate test setup and context files.

**Directory to DELETE:**
```
src/test/integration 2/
```

**Reason**: Backup of integration test directory.

---

### J. Markdown Documentation (3 files)
**Files to DELETE:**
```
AWS-DEPLOYMENT 2.md
DEPLOYMENT 2.md
FEATURE-FLAGS 2.md
MIGRATION 2.md
package 2.json
```

**Reason**: Exact duplicates of active documentation files.

---

## Category 2: SESSION DOCUMENTATION - ARCHIVE (36 files)

These are debugging/troubleshooting session notes that should be **archived** rather than deleted for historical reference.

**Create directory**: `docs/archive/sessions/`

**Files to MOVE:**

### Debugging Session Files (12 files)
```
ANALYSIS_FIX_READY_FOR_TESTING.md
CRITICAL_FINDING.md
DEBUGGING_ADDED.md
DIAGNOSTIC_STEPS.md
FINAL_FIX_COMPLETE.md
FINAL_FIX_SIMPLE_APPROACH.md
FINAL_FIX_STATUS.md
ROOT_CAUSE_FIXED.md
ROOT_CAUSE_FOUND_AND_FIXED.md
SESSION_SUMMARY.md
TEMP_CONTRACT_FIX_STATUS.md
TEMP_CONTRACT_ID_FIX.md
```

**Reason**: Session notes documenting a specific debugging session (October 11, 2025). Historical value but not needed in root.

---

### Status/Summary Files (5 files)
```
SYSTEM_READY_TEST_SUMMARY.md
STRUCTURED_EXTRACTION_FIX.md
STRUCTURED_EXTRACTION_IMPLEMENTATION.md
MULTI-DOCUMENT-CONTRACT-WORKFLOW.md
RESTRUCTURE_SUMMARY.md
```

**Reason**: Implementation status documents from specific development phases.

---

### Technical Documentation to Archive (4 files)
```
AGENTS.md
abstraction-rules.md
HOW_TO_COMPARE_EXTRACTIONS.md
INSTRUCTIONS_FOR_USER.md
```

**Reason**: Specific implementation guides that are not general documentation. Move to `docs/archive/guides/`.

---

## Category 3: TEST & DEBUG SCRIPTS - SELECTIVE DELETE (45 files)

### A. Test Scripts to DELETE (35 files)

**One-off debugging/validation scripts:**
```
test-ai-analysis.js
test-ai-endpoint.js
test-analyze.json
test-anna-bedrock.py
test-anthropic-models.js
test-backend-bedrock-full.js
test-backend-bedrock.js
test-bedrock-connection.js
test-bedrock-model-access.py
test-bedrock-streaming.py
test-bedrock.js
test-bulk-operations 2.js
test-create-contract-from-blueprint.js
test-error-handling-logging 2.js
test-error-handling-logging.js
test-extraction-speed.js
test-fast-mode.js
test-haiku.js
test-minimal.js
test-password.js
test-realtime-notifications 2.js
test-realtime-notifications.js
test-rule-extraction.js
test-server-load.js
test-server-minimal.js
test-server-simple.js
test-textract-ocr.js
test-upload-and-analyze.js
test-bulk-operations.js
```

**Shell scripts:**
```
test-analyze-flow.sh
test-upload-and-analyze.sh
test-upload-document.sh
debug-analyze-issue.sh
```

**Reason**: One-off debugging scripts used during development. Not part of automated testing.

---

### B. Test Scripts to KEEP (10 files)

**Strategic testing scripts that provide ongoing value:**
```
test-bedrock-quick.js         # Quick Bedrock connection validation
test-backend-api.py           # Backend API integration test
test-bedrock-python.py        # Python Bedrock client test
test-upload-flow.js           # Upload workflow validation
```

**Check utilities to KEEP:**
```
check-db-uploads.js           # Database upload verification
check-latest-uploads.js       # Recent upload inspection
check-memory-data.js          # Memory leak debugging
check-upload-status.js        # Upload status checker
check-users.js                # User account verification
debug-memory.js               # Memory profiling
```

**Reason**: These provide ongoing diagnostic value and are documented in CLAUDE.md.

---

### C. Test Data Files to DELETE (4 files)
```
test-contract.txt             # Deleted in git status
test-simple-upload.txt
test-doc.txt
test-bloom-contract.txt
```

**Reason**: Sample test data files. Use proper test fixtures in `test/data/` instead.

---

## Category 4: DEVELOPMENT ARTIFACTS - DELETE (3 files)

### A. Log Files (32 files - ~5MB)
**All log files in root directory:**
```
backend-4003.log
backend-clean.log
backend-direct.log
backend-final.log
backend-new.log
backend-reload.log
backend.log
clean-server.log
dev-full-clean.log
dev-output.log
dev.log
frontend.log
fullstack-fresh.log
fullstack.log
server-bedrock.log
server-chunk-progress.log
server-clean.log
server-debug.log
server-direct.log
server-fixed.log
server-fresh.log
server-live.log
server-multi-doc.log
server-npm.log
server-only.log
server-restart.log
server-stable.log
server-standalone.log
server-test.log
server.log
vite-final.log
vite-new.log
vite.log
```

**Action**: DELETE all (they're gitignored anyway)

**Reason**: Development logs that accumulate during testing. Should be in a `logs/` directory (which is gitignored).

---

## Category 5: FILES TO KEEP - Active Development

### Core Documentation (KEEP)
```
README.md                     # Main project documentation
API.md                        # API reference
CLAUDE.md                     # AI assistant guide (project instructions)
PROJECT_DOCUMENTATION.md      # Comprehensive project docs
TECHNOLOGY_STACK.md           # Tech stack reference
AWS_TEXTRACT_INTEGRATION.md   # Textract integration guide
BEDROCK_SETUP.md             # AWS Bedrock setup instructions
BLOOM_ENERGY_AWS_REQUIREMENTS.md  # AWS requirements
TROUBLESHOOTING.md           # Troubleshooting guide
AWS-DEPLOYMENT.md            # Deployment documentation
DEPLOYMENT.md                # General deployment guide
FEATURE-FLAGS.md             # Feature flag system
MIGRATION.md                 # Migration documentation
```

**Reason**: Active documentation referenced by developers and in CLAUDE.md.

---

### Planning & Requirements (KEEP)
```
planning.md                   # Project planning
prd.md                        # Product requirements
tasks.md                      # Task tracking
```

**Reason**: Active project management documents.

---

### Configuration Files (KEEP)
```
.claude.json                  # Claude configuration
mcp.json                      # MCP server config
nodemon.json                  # Nodemon dev config
tsconfig.json                 # TypeScript config
tsconfig.lite.json            # Lite TypeScript config
vite.config.ts                # Vite bundler config
babel.config.js               # Babel transpiler
jest.config.js                # Jest testing
```

**Reason**: Active configuration files required for development.

---

## Implementation Plan

### Phase 1: Safety Backup (DO FIRST)
```bash
# Create backup of entire project
cd /Users/rapha/Documents/CLIENTS/Bloom\ Energy/
tar -czf ContractRulesEngine-backup-$(date +%Y%m%d).tar.gz ContractRulesEngine/

# Verify backup
tar -tzf ContractRulesEngine-backup-*.tar.gz | head -20
```

---

### Phase 2: Archive Session Documentation
```bash
cd /Users/rapha/Documents/CLIENTS/Bloom\ Energy/ContractRulesEngine

# Create archive directories
mkdir -p docs/archive/sessions
mkdir -p docs/archive/guides

# Move debugging session files
mv ANALYSIS_FIX_READY_FOR_TESTING.md docs/archive/sessions/
mv CRITICAL_FINDING.md docs/archive/sessions/
mv DEBUGGING_ADDED.md docs/archive/sessions/
mv DIAGNOSTIC_STEPS.md docs/archive/sessions/
mv FINAL_FIX_COMPLETE.md docs/archive/sessions/
mv FINAL_FIX_SIMPLE_APPROACH.md docs/archive/sessions/
mv FINAL_FIX_STATUS.md docs/archive/sessions/
mv ROOT_CAUSE_FIXED.md docs/archive/sessions/
mv ROOT_CAUSE_FOUND_AND_FIXED.md docs/archive/sessions/
mv SESSION_SUMMARY.md docs/archive/sessions/
mv TEMP_CONTRACT_FIX_STATUS.md docs/archive/sessions/
mv TEMP_CONTRACT_ID_FIX.md docs/archive/sessions/

# Move status files
mv SYSTEM_READY_TEST_SUMMARY.md docs/archive/sessions/
mv STRUCTURED_EXTRACTION_FIX.md docs/archive/sessions/
mv STRUCTURED_EXTRACTION_IMPLEMENTATION.md docs/archive/sessions/
mv MULTI-DOCUMENT-CONTRACT-WORKFLOW.md docs/archive/sessions/
mv RESTRUCTURE_SUMMARY.md docs/archive/sessions/

# Move guides
mv AGENTS.md docs/archive/guides/
mv abstraction-rules.md docs/archive/guides/
mv HOW_TO_COMPARE_EXTRACTIONS.md docs/archive/guides/
mv INSTRUCTIONS_FOR_USER.md docs/archive/guides/

# Create index
cat > docs/archive/README.md << 'EOF'
# Archived Documentation

## Sessions
Historical debugging and implementation session notes (October 2025).

## Guides
Specific implementation guides and technical references.
EOF
```

---

### Phase 3: Delete Duplicate Files
```bash
cd /Users/rapha/Documents/CLIENTS/Bloom\ Energy/ContractRulesEngine

# Delete duplicate assets
rm assets/*" 2.svg" assets/*" 2.png"

# Delete duplicate env files
rm ".env 2.development" ".env 2.production"

# Delete duplicate configs
rm "babel.config 2.js" "jest.config 2.js" "localStorage-export 2.js" "package 2.json"

# Delete duplicate routes
rm server/src/routes/*" 2.js"

# Delete duplicate services
rm server/src/services/*" 2.js"

# Delete duplicate middleware
rm server/src/middleware/*" 2.js"

# Delete duplicate scripts
rm server/migrate" 2.js"
rm server/prisma/seed" 2.js"
rm server/scripts/*" 2.js"
rm server/src/scripts/*" 2.js"

# Delete duplicate deployment files
rm scripts/*" 2.sh"
rm aws/*" 2.yml"
rm docker/*" 2.production"

# Delete duplicate migrations
find prisma/migrations -name "*2.sql" -delete

# Delete duplicate frontend files
rm src/contexts/*" 2.jsx"
rm src/test/*" 2.ts"
rm -rf "src/test/integration 2"

# Delete duplicate docs
rm "AWS-DEPLOYMENT 2.md" "DEPLOYMENT 2.md" "FEATURE-FLAGS 2.md" "MIGRATION 2.md"
```

---

### Phase 4: Delete Test Scripts
```bash
# Delete one-off test scripts
rm test-ai-*.js test-ai-*.py
rm test-backend-*.js test-backend-*.py
rm test-bedrock-*.js test-bedrock-*.py
rm test-anthropic-*.js
rm test-bulk-*.js test-error-*.js test-realtime-*.js
rm test-create-*.js test-extraction-*.js test-fast-*.js
rm test-haiku.js test-minimal.js test-password.js
rm test-rule-*.js test-server-*.js test-textract-*.js
rm test-upload-*.js test-*.sh debug-*.sh

# Delete test data files
rm test-*.txt test-*.json

# Keep strategic test scripts (excluded from rm patterns):
# - test-bedrock-quick.js
# - check-*.js
# - debug-memory.js
```

---

### Phase 5: Delete Log Files
```bash
# Delete all log files in root
rm *.log
```

---

### Phase 6: Verify and Commit
```bash
# Check git status
git status

# Run tests to ensure nothing broke
npm run test

# Verify application starts
npm run dev:full

# Commit changes
git add -A
git commit -m "chore: Clean up duplicate files, archive session docs, remove test scripts

- Archive 20 debugging session notes to docs/archive/sessions/
- Archive 4 implementation guides to docs/archive/guides/
- Delete 67 duplicate files with '2' suffix (assets, configs, services, routes)
- Delete 35 one-off test scripts (keep 10 strategic diagnostic scripts)
- Delete 32 development log files
- Delete 4 test data files
- Reduce repo size by ~20MB

All duplicates verified with diff before deletion.
Active functionality preserved."
```

---

## Summary Statistics

| Category | Files | Action | Size Impact |
|----------|-------|--------|-------------|
| Duplicate Assets | 32 | DELETE | ~2MB |
| Duplicate Code | 25 | DELETE | ~500KB |
| Duplicate Configs | 10 | DELETE | ~200KB |
| Session Docs | 20 | ARCHIVE | 0 (moved) |
| Guides | 4 | ARCHIVE | 0 (moved) |
| Test Scripts | 35 | DELETE | ~500KB |
| Test Data | 4 | DELETE | ~100KB |
| Log Files | 32 | DELETE | ~5MB |
| **TOTAL** | **162** | | **~8MB freed** |

---

## Risk Assessment

### Low Risk (Safe to Delete)
- ✅ All duplicate files with " 2" suffix (verified with diff)
- ✅ Development log files (gitignored, regenerated)
- ✅ Test data files (not used in tests)
- ✅ One-off test scripts (documented functionality exists)

### Medium Risk (Archive First)
- ⚠️ Session documentation (contains troubleshooting history)
- ⚠️ Implementation guides (may reference specific approaches)

### High Risk (Keep)
- ❌ Active configuration files
- ❌ Core documentation (README, API, CLAUDE.md, etc.)
- ❌ Strategic test scripts (documented in CLAUDE.md)
- ❌ Planning documents (active project management)

---

## Post-Cleanup Actions

### 1. Update .gitignore
Add patterns to prevent future accumulation:
```gitignore
# Log files
*.log
logs/

# Test artifacts
test-*.txt
test-analyze.json

# Backup files
* 2.*
*" 2".*
```

### 2. Update Documentation
- Update CLAUDE.md to reference new archive locations
- Update TROUBLESHOOTING.md with archive note
- Add note in README about archived session docs

### 3. Create Maintenance Script
Create `scripts/cleanup-dev-artifacts.sh`:
```bash
#!/bin/bash
# Clean up development artifacts
rm -f *.log
rm -f test-*.txt
echo "Cleaned up development artifacts"
```

---

## Questions to Resolve

1. **Uploads Directory (100MB)**: Contains actual uploaded contract PDFs. Should these be:
   - Kept (real project data)
   - Backed up and cleared (test data)
   - Left alone (production data)

2. **Cache Directory**: Currently empty, but should cache be gitignored?

3. **Test Scripts**: Are any of the "delete" test scripts referenced in documentation?

---

## Conclusion

This cleanup plan will:
- ✅ Remove 67 duplicate files safely
- ✅ Organize 24 session/guide documents into archives
- ✅ Delete 35 one-off test scripts
- ✅ Remove 32 log files
- ✅ Free up ~8MB of repository space
- ✅ Improve repository organization
- ✅ Preserve all active functionality
- ✅ Maintain historical documentation for reference

**Estimated Time**: 15 minutes
**Risk Level**: Low (with backup)
**Impact**: High (cleaner, more maintainable codebase)
