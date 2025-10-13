#!/bin/bash
# Bloom Energy Contract Rules Engine - Cleanup Helper Script
# Created: October 13, 2025
# Purpose: Safe cleanup automation with backup and verification

set -e  # Exit on error

PROJECT_DIR="/Users/rapha/Documents/CLIENTS/Bloom Energy/ContractRulesEngine"
BACKUP_DIR="/Users/rapha/Documents/CLIENTS/Bloom Energy"
ARCHIVE_DIR="$PROJECT_DIR/docs/archive"
DATE=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_success() { echo -e "${GREEN}✅ $1${NC}"; }
echo_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
echo_error() { echo -e "${RED}❌ $1${NC}"; }

# Function: Create full project backup
backup() {
    echo_warning "Creating backup..."
    cd "$BACKUP_DIR"
    BACKUP_FILE="ContractRulesEngine-backup-${DATE}.tar.gz"
    tar -czf "$BACKUP_FILE" ContractRulesEngine/
    echo_success "Backup created: $BACKUP_FILE"
    ls -lh "$BACKUP_FILE"
}

# Function: Archive session documentation
archive_docs() {
    echo_warning "Archiving session documentation..."
    cd "$PROJECT_DIR"
    
    # Create archive directory
    mkdir -p "$ARCHIVE_DIR"
    
    # Move session docs
    SESSION_DOCS=(
        "ANALYSIS_FIX_READY_FOR_TESTING.md"
        "CRITICAL_FINDING.md"
        "DEBUGGING_ADDED.md"
        "DIAGNOSTIC_STEPS.md"
        "FINAL_FIX_COMPLETE.md"
        "FINAL_FIX_SIMPLE_APPROACH.md"
        "FINAL_FIX_STATUS.md"
        "ROOT_CAUSE_FIXED.md"
        "ROOT_CAUSE_FOUND_AND_FIXED.md"
        "SESSION_SUMMARY.md"
        "SYSTEM_READY_TEST_SUMMARY.md"
        "TEMP_CONTRACT_FIX_STATUS.md"
        "TEMP_CONTRACT_ID_FIX.md"
        "TROUBLESHOOTING.md"
        "AGENTS.md"
        "abstraction-rules.md"
        "MULTI-DOCUMENT-CONTRACT-WORKFLOW.md"
        "AWS_TEXTRACT_INTEGRATION.md"
        "BEDROCK_SETUP.md"
        "BLOOM_ENERGY_AWS_REQUIREMENTS.md"
        "TECHNOLOGY_STACK.md"
        "FEATURE-FLAGS.md"
        "FEATURE-FLAGS 2.md"
        "MIGRATION 2.md"
    )
    
    COUNT=0
    for doc in "${SESSION_DOCS[@]}"; do
        if [ -f "$doc" ]; then
            mv "$doc" "$ARCHIVE_DIR/"
            COUNT=$((COUNT + 1))
        fi
    done
    
    echo_success "Archived $COUNT session documents to docs/archive/"
}

# Function: Delete duplicate files with " 2" suffix
delete_dupes() {
    echo_warning "Deleting duplicate files..."
    cd "$PROJECT_DIR"
    
    # Delete SVG duplicates
    rm -f assets/*" 2.svg" assets/*" 2.png" 2>/dev/null || true
    
    # Delete env duplicates
    rm -f ".env 2.development" ".env 2.production" 2>/dev/null || true
    
    # Delete config duplicates
    rm -f "babel.config 2.js" "jest.config 2.js" "localStorage-export 2.js" 2>/dev/null || true
    
    # Delete server duplicates
    rm -f server/migrate\ 2.js 2>/dev/null || true
    rm -f server/prisma/seed\ 2.js 2>/dev/null || true
    rm -f server/scripts/health-check\ 2.js 2>/dev/null || true
    
    # Delete route/middleware/service duplicates
    rm -f server/src/routes/*" 2.js" 2>/dev/null || true
    rm -f server/src/middleware/*" 2.js" 2>/dev/null || true
    rm -f server/src/services/*" 2.js" 2>/dev/null || true
    
    # Delete infrastructure duplicates
    rm -f aws/cloudformation-template\ 2.yml 2>/dev/null || true
    rm -f docker/Dockerfile\ 2.production 2>/dev/null || true
    rm -f scripts/deploy\ 2.sh scripts/deploy-local\ 2.sh 2>/dev/null || true
    
    # Delete migration/context duplicates
    rm -f prisma/migrations/*/migration\ 2.sql 2>/dev/null || true
    rm -f src/contexts/AuthContext\ 2.jsx 2>/dev/null || true
    
    # Delete deployment/test duplicates
    rm -f "AWS-DEPLOYMENT 2.md" "DEPLOYMENT 2.md" 2>/dev/null || true
    rm -f src/test/setup\ 2.ts server/src/test/setup\ 2.js 2>/dev/null || true
    
    # Delete cache duplicate
    rm -f "server/src/routes/ai_chat_3b80d2cc07885302a96a42c7ed66e58c17f08e7779618d666a9898ef4513fa3b 2.json" 2>/dev/null || true
    
    echo_success "Deleted all duplicate files with ' 2' suffix"
}

# Function: Delete log files
delete_logs() {
    echo_warning "Deleting log files..."
    cd "$PROJECT_DIR"
    
    COUNT=$(ls *.log 2>/dev/null | wc -l)
    rm -f *.log 2>/dev/null || true
    
    echo_success "Deleted $COUNT log files"
}

# Function: Delete one-off test scripts
delete_tests() {
    echo_warning "Deleting one-off test scripts..."
    cd "$PROJECT_DIR"
    
    # Delete test data files
    rm -f test-contract.txt test-doc.txt test-simple-upload.txt 2>/dev/null || true
    
    # Delete one-off test scripts (keep strategic ones)
    TEST_SCRIPTS=(
        "test-ai-analysis.js"
        "test-ai-endpoint.js"
        "test-analyze.json"
        "test-anna-bedrock.py"
        "test-backend-api.py"
        "test-backend-bedrock-full.js"
        "test-backend-bedrock.js"
        "test-bedrock-connection.js"
        "test-bedrock-python.py"
        "test-bedrock-streaming.py"
        "test-bedrock.js"
        "test-bloom-contract.txt"
        "test-bulk-operations 2.js"
        "test-create-contract-from-blueprint.js"
        "test-error-handling-logging 2.js"
        "test-extraction-speed.js"
        "test-fast-mode.js"
        "test-haiku.js"
        "test-minimal.js"
        "test-password.js"
        "test-realtime-notifications 2.js"
        "test-server-load.js"
        "test-server-minimal.js"
        "test-server-simple.js"
        "test-upload-and-analyze.js"
        "test-upload-and-analyze.sh"
        "test-upload-document.sh"
        "test-upload-flow.js"
        "src/test-ai-analysis.js"
    )
    
    COUNT=0
    for script in "${TEST_SCRIPTS[@]}"; do
        if [ -f "$script" ]; then
            rm -f "$script"
            COUNT=$((COUNT + 1))
        fi
    done
    
    echo_success "Deleted $COUNT one-off test scripts"
}

# Function: Verify project integrity
verify() {
    echo_warning "Verifying project integrity..."
    cd "$PROJECT_DIR"
    
    # Check if key files exist
    CRITICAL_FILES=(
        "package.json"
        "tsconfig.json"
        "vite.config.ts"
        "prisma/schema.prisma"
        "server/src/server.js"
        "src/main.tsx"
        ".env"
    )
    
    MISSING=0
    for file in "${CRITICAL_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            echo_error "Missing critical file: $file"
            MISSING=$((MISSING + 1))
        fi
    done
    
    if [ $MISSING -eq 0 ]; then
        echo_success "All critical files present"
    else
        echo_error "$MISSING critical files missing!"
        return 1
    fi
    
    # Try to start the app (optional)
    echo_warning "Testing npm install..."
    npm install --silent 2>&1 | grep -i error || echo_success "npm install successful"
    
    echo_success "Project verification complete"
}

# Function: Full cleanup
full_clean() {
    echo_warning "Starting full cleanup process..."
    echo ""
    
    echo "Step 1/6: Creating backup..."
    backup
    echo ""
    
    echo "Step 2/6: Archiving documentation..."
    archive_docs
    echo ""
    
    echo "Step 3/6: Deleting duplicates..."
    delete_dupes
    echo ""
    
    echo "Step 4/6: Deleting logs..."
    delete_logs
    echo ""
    
    echo "Step 5/6: Deleting test scripts..."
    delete_tests
    echo ""
    
    echo "Step 6/6: Verifying project..."
    verify
    echo ""
    
    echo_success "Full cleanup complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Test the application: npm run dev:full"
    echo "  2. If everything works, commit changes: git add . && git commit -m 'chore: project cleanup - remove duplicates, archive docs, delete logs'"
    echo "  3. Review archived docs in: docs/archive/"
}

# Function: Show usage
usage() {
    echo "Bloom Energy Contract Rules Engine - Cleanup Helper"
    echo ""
    echo "Usage: ./cleanup-helper.sh [command]"
    echo ""
    echo "Commands:"
    echo "  backup         - Create full project backup"
    echo "  archive-docs   - Move session docs to docs/archive/"
    echo "  delete-dupes   - Delete duplicate ' 2' files"
    echo "  delete-logs    - Delete *.log files"
    echo "  delete-tests   - Delete one-off test scripts"
    echo "  verify         - Check project integrity"
    echo "  full-clean     - Execute all steps (recommended)"
    echo ""
    echo "Example:"
    echo "  ./cleanup-helper.sh full-clean"
}

# Main script logic
case "${1:-}" in
    backup)
        backup
        ;;
    archive-docs)
        archive_docs
        ;;
    delete-dupes)
        delete_dupes
        ;;
    delete-logs)
        delete_logs
        ;;
    delete-tests)
        delete_tests
        ;;
    verify)
        verify
        ;;
    full-clean)
        full_clean
        ;;
    *)
        usage
        ;;
esac
