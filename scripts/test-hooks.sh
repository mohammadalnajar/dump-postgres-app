#!/bin/bash

# Test script for git hooks functionality
# This script helps test both the custom date and TODO checking features

echo "🧪 Git Hooks Test Script"
echo "========================"
echo ""

# Check if hooks are installed
if ! git config core.hooksPath | grep -q ".githooks"; then
    echo "❌ Git hooks not configured. Run: npm run setup:hooks"
    exit 1
fi

echo "✅ Git hooks are configured"
echo ""

# Create a temporary test file
TEST_FILE="test-hook-functionality.tmp"
echo "Creating test file: $TEST_FILE"

# Test 1: TODO checking
echo "📝 Test 1: TODO Comment Detection"
echo "// TODO: This is a test TODO comment" > "$TEST_FILE"
git add "$TEST_FILE" 2>/dev/null

echo "Attempting commit with TODO comment (should prompt for confirmation)..."
echo "Type 'n' when prompted to test the TODO warning"
echo ""

if SKIP_DATE_PROMPT=1 git commit -m "Test commit with TODO (should be blocked)"; then
    echo "⚠️  Commit succeeded (user chose to proceed)"
    git reset --soft HEAD~1
else
    echo "✅ Commit blocked by TODO check"
fi

# Test 2: Bypass TODO check
echo ""
echo "📝 Test 2: Bypass TODO Check"
echo "Testing SKIP_TODO_CHECK=1..."

if SKIP_DATE_PROMPT=1 SKIP_TODO_CHECK=1 git commit -m "Test commit bypassing TODO check"; then
    echo "✅ TODO check bypassed successfully"
    git reset --soft HEAD~1
else
    echo "❌ Failed to bypass TODO check"
fi

# Test 3: Date functionality (without actually committing)
echo ""
echo "📅 Test 3: Custom Date Functionality"
echo "Testing custom date prompt (will not actually commit)..."
echo ""
echo "To test custom date functionality manually:"
echo "1. Stage this test file: git add $TEST_FILE"
echo "2. Run: git commit -m 'Test custom date'"
echo "3. When prompted, enter a custom date like: 2025-09-24 08:51:20"
echo "4. The hook should set GIT_AUTHOR_DATE and GIT_COMMITTER_DATE"
echo ""

# Clean up
git reset HEAD "$TEST_FILE" 2>/dev/null
rm -f "$TEST_FILE"

echo "🎉 Test complete!"
echo ""
echo "💡 Manual testing suggestions:"
echo "   • Try different date formats: '2025-09-24 08:51:20', '2025-09-24T08:51:20+02:00'"
echo "   • Test bypass combinations: SKIP_DATE_PROMPT=1, SKIP_TODO_CHECK=1"
echo "   • Use --no-verify to skip all hooks"