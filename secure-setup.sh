# Secure your current setup immediately

# 1. Add to .gitignore
echo "cron-jobs.json" >> .gitignore

# 2. Set secure file permissions
chmod 600 cron-jobs.json

# 3. Use environment variables for new jobs
export PROD_DB_PASSWORD="your_secure_password_here"

# 4. Move existing credentials to environment variables
# Then update cron-jobs.json to reference them instead of storing passwords