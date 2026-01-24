#!/bin/bash

# Secure Setup Script for Encrypted Cron Jobs

echo "🔐 Setting up encrypted cron job storage..."

# 1. Add to .gitignore
echo "cron-jobs.json" >> .gitignore
echo "✅ Added cron-jobs.json to .gitignore"

# 2. Generate encryption key if not exists
if [ -z "$CRON_ENCRYPTION_KEY" ]; then
    ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo ""
    echo "🔑 Generated encryption key. Add this to your environment:"
    echo "export CRON_ENCRYPTION_KEY=\"$ENCRYPTION_KEY\""
    echo ""
    echo "For production, add this to your:"
    echo "- .env file"
    echo "- Docker environment variables"
    echo "- System environment variables"
    echo ""
else
    echo "✅ CRON_ENCRYPTION_KEY already set"
fi

# 3. Set secure file permissions
if [ -f "cron-jobs.json" ]; then
    chmod 600 cron-jobs.json
    echo "✅ Set secure file permissions (600) for cron-jobs.json"
fi

# 4. Create .env template
cat > .env.example << EOF
# Database Backup App Configuration

# Session configuration
SESSION_SECRET=your-session-secret-change-in-production

# Authentication (optional - defaults to admin/admin)
AUTH_USERNAME=admin
AUTH_PASSWORD=admin

# Cron job encryption key (REQUIRED for encrypted storage)
CRON_ENCRYPTION_KEY=your-32-character-hex-encryption-key

# Optional: Default backup settings
DEFAULT_FORMAT=plain
DEFAULT_OUTPUT_STYLE=standard
DEFAULT_COMPRESS_LEVEL=0

# Optional: Auto-cleanup old backups (days)
AUTO_CLEAN_DAYS=30
EOF

echo "✅ Created .env.example file"
echo ""
echo "🎯 Next steps:"
echo "1. Copy .env.example to .env"
echo "2. Set your CRON_ENCRYPTION_KEY in .env"
echo "3. Restart the application"
echo "4. Your passwords will now be encrypted in cron-jobs.json!"
echo ""
echo "⚠️  IMPORTANT: Keep your encryption key safe!"
echo "   Without it, you cannot decrypt existing cron jobs."