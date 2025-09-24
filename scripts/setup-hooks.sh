#!/bin/bash

# Git Hooks Setup Script
# This script sets up git hooks for the project

echo "🔧 Setting up git hooks..."

HOOKS_DIR=".githooks"
GIT_HOOKS_DIR=".git/hooks"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository root"
    exit 1
fi

# Check if .githooks directory exists
if [ ! -d "$HOOKS_DIR" ]; then
    echo "❌ Error: $HOOKS_DIR directory not found"
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$GIT_HOOKS_DIR"

# Copy hooks from .githooks to .git/hooks
for hook in "$HOOKS_DIR"/*; do
    if [ -f "$hook" ]; then
        hook_name=$(basename "$hook")
        echo "📋 Installing hook: $hook_name"
        cp "$hook" "$GIT_HOOKS_DIR/$hook_name"
        chmod +x "$GIT_HOOKS_DIR/$hook_name"
    fi
done

# Configure git to use our hooks directory (Git 2.9+)
git_version=$(git --version | sed -n 's/git version \([0-9]*\)\.\([0-9]*\).*/\1.\2/p')
git_major=$(echo $git_version | cut -d. -f1)
git_minor=$(echo $git_version | cut -d. -f2)

if [ "$git_major" -gt 2 ] || ([ "$git_major" -eq 2 ] && [ "$git_minor" -ge 9 ]); then
    echo "🎯 Configuring git hooks path..."
    git config core.hooksPath .githooks
    echo "✅ Git configured to use .githooks directory directly"
else
    echo "⚠️  Your git version ($git_version) doesn't support core.hooksPath"
    echo "   Hooks have been copied to .git/hooks instead"
fi

echo "✅ Git hooks setup complete!"
echo ""
echo "📋 Available hooks:"
ls -la "$HOOKS_DIR"
echo ""
echo "💡 To bypass TODO checks: git commit --no-verify"
echo "💡 To disable TODO checks: SKIP_TODO_CHECK=1 git commit ..."