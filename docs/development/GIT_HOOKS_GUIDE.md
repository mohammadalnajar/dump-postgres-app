# 🪝 Git Hooks Setup Guide

This project uses git hooks to enhance the development workflow, particularly for TODO tracking and code quality checks.

## 📁 **File Structure**

```
.githooks/           # Tracked git hooks (committed to repository)
├── pre-commit       # Pre-commit hook for TODO checking
└── ...

scripts/
├── setup-hooks.sh   # Hook installation script
└── ...
```

## 🚀 **Quick Setup**

### **Automatic Setup (Recommended)**
```bash
# Setup is automatic when you install dependencies
npm install

# Or manually run setup
npm run setup:hooks
# OR
make setup-hooks
# OR
bash scripts/setup-hooks.sh
```

### **What the Setup Does**
1. ✅ Configures git to use `.githooks` directory (Git 2.9+)
2. ✅ Falls back to copying hooks to `.git/hooks` for older git versions
3. ✅ Makes all hooks executable
4. ✅ Shows available hooks and usage tips

## 🔧 **Available Hooks**

### **Pre-commit Hook**
- **Purpose**: 
  - Optionally prompts for custom commit date/time
  - Warns about TODO comments in code files before committing
- **Features**:
  - **Custom Date/Time**: Prompts to set custom `GIT_AUTHOR_DATE` and `GIT_COMMITTER_DATE`
  - **TODO Checking**: Scans staged files for `TODO`, `FIXME`, `HACK`, `BUG` comments
  - **Smart Exclusions**: Excludes documentation files (`.md` files) that should contain TODOs
  - **User Prompts**: Asks for confirmation before allowing commit
  - **Multiple Bypass Options**: Environment variables and git flags

### **Usage Examples**
```bash
# Normal commit (will prompt for custom date and check TODOs)
git commit -m "Add new feature"

# Skip all hooks for this commit  
git commit --no-verify -m "WIP: debugging issue"

# Skip only TODO check (still prompts for date)
SKIP_TODO_CHECK=1 git commit -m "Add feature with TODOs"

# Skip only date prompt (still checks TODOs)
SKIP_DATE_PROMPT=1 git commit -m "Quick fix"

# Skip both date prompt and TODO check
SKIP_DATE_PROMPT=1 SKIP_TODO_CHECK=1 git commit -m "Emergency fix"
```

### **Custom Date Examples**
When prompted for custom date/time, you can use various formats:
```bash
# Date and time formats supported:
2025-09-24 08:51:20                 # Space-separated
2025-09-24T08:51:20                # ISO format
2025-09-24T08:51:20+02:00          # ISO with timezone
2025-09-24T08:51:20-05:00          # ISO with negative timezone
```

## 🎯 **For New Team Members**

When someone clones this repository:

1. **First time setup**:
   ```bash
   git clone <repository>
   cd <repository>
   npm install  # This automatically runs setup:hooks
   ```

2. **Manual setup if needed**:
   ```bash
   npm run setup:hooks
   ```

3. **Verify hooks are working**:
   ```bash
   # Add a TODO comment to a .js file and try to commit
   echo "// TODO: test comment" >> src/server.js
   git add src/server.js
   git commit -m "test commit"
   # Should prompt for confirmation
   ```

## 🛠️ **Hook Development**

### **Adding New Hooks**
1. Create hook in `.githooks/` directory
2. Make it executable: `chmod +x .githooks/new-hook`
3. Run setup: `npm run setup:hooks`
4. Test the hook

### **Modifying Existing Hooks**
1. Edit the hook in `.githooks/` directory
2. Run setup to update: `npm run setup:hooks`
3. Test changes

### **Hook Best Practices**
- ✅ Always provide bypass options (`--no-verify`)
- ✅ Include helpful error messages and tips
- ✅ Handle edge cases (non-terminal environments)
- ✅ Keep hooks fast (< 2 seconds)
- ✅ Test on different operating systems

## 🚨 **Troubleshooting**

### **Hooks Not Working**
```bash
# Check if hooks are configured
git config core.hooksPath

# Should output: .githooks

# If empty, run setup again
npm run setup:hooks
```

### **Permission Issues**
```bash
# Make hooks executable
chmod +x .githooks/*

# Re-run setup
npm run setup:hooks
```

### **Git Version Issues**
- **Git 2.9+**: Uses `core.hooksPath` (recommended)
- **Older Git**: Copies hooks to `.git/hooks`
- **Upgrade Git** for better experience

### **Skip Hooks Temporarily**
```bash
# Skip all hooks for one commit
git commit --no-verify -m "emergency fix"

# Skip TODO check only (still prompts for custom date)
SKIP_TODO_CHECK=1 git commit -m "commit message"

# Skip date prompt only (still checks TODOs)
SKIP_DATE_PROMPT=1 git commit -m "commit message"

# Skip both date prompt and TODO check
SKIP_DATE_PROMPT=1 SKIP_TODO_CHECK=1 git commit -m "commit message"
```

### **Environment Variables Reference**
```bash
SKIP_TODO_CHECK=1     # Skip TODO comment checking
SKIP_DATE_PROMPT=1    # Skip custom date/time prompt
```

## 📋 **Integration with TODO System**

The pre-commit hook is integrated with our TODO tracking system:

- **Warns** about TODO comments in code files
- **Excludes** documentation files that should contain TODOs
- **Suggests** running `make todos` to see all TODO items
- **Encourages** updating `TODO.md` with tracked tasks

## � **Custom Date/Time Feature**

The pre-commit hook now supports setting custom commit dates:

- **Prompts** for custom date/time before each commit
- **Supports** multiple date formats (ISO, space-separated, with/without timezone)
- **Sets** both `GIT_AUTHOR_DATE` and `GIT_COMMITTER_DATE`
- **Validates** date format before applying
- **Fallback** to current time on invalid input
- **Bypass** with `SKIP_DATE_PROMPT=1` environment variable

### **Use Cases**
- **Backdating commits** for proper chronological order
- **Batch commits** with specific timestamps
- **Time zone adjustments** for distributed teams
- **Historical reconstruction** of development timeline

## �🔄 **Continuous Integration**

For CI/CD environments, hooks can be bypassed:

```yaml
# GitHub Actions example
- name: Commit changes
  run: git commit --no-verify -m "CI: automated changes"

# Or with environment variables
- name: Commit changes  
  run: git commit -m "CI: automated changes"
  env:
    SKIP_TODO_CHECK: 1
    SKIP_DATE_PROMPT: 1
```

## 🎉 **Benefits**

- ✅ **Shared hooks**: Everyone gets the same git hooks
- ✅ **Version controlled**: Hook changes are tracked
- ✅ **Easy setup**: Automatic installation with npm
- ✅ **Flexible**: Multiple bypass options
- ✅ **Maintainable**: Easy to update and modify