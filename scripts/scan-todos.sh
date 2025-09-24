#!/bin/bash

# TODO Scanner Script
# Scans the codebase for TODO comments and generates a report

echo "🔍 Scanning codebase for TODOs..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Function to scan for TODOs
scan_todos() {
    local pattern="$1"
    local label="$2"
    local color="$3"
    
    echo -e "\n${color}${label}:${NC}"
    echo "-------------------"
    
    # Find TODO comments in various file types
    grep -rn --include="*.js" --include="*.json" --include="*.md" --include="*.yml" --include="*.yaml" --include="*.sh" \
         -E "$pattern" . 2>/dev/null | \
         grep -v node_modules | \
         grep -v ".git/" | \
         sed 's/^/  /' || echo "  None found"
}

# Scan for different types of markers
scan_todos "(TODO|todo)" "📋 TODO Items" "$YELLOW"
scan_todos "(FIXME|fixme)" "🔧 FIXME Items" "$RED" 
scan_todos "(HACK|hack)" "⚡ HACK Items" "$RED"
scan_todos "(NOTE|note|Note)" "📝 NOTE Items" "$GREEN"
scan_todos "(BUG|bug)" "🐛 BUG Items" "$RED"

echo -e "\n✨ Scan complete!"
echo "💡 Add TODO comments in your code like: // TODO: FEAT-001 - Add user authentication"