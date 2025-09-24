# Production Deployment Guide: Secure Credential Management

## 🛡️ SECURITY RECOMMENDATIONS FOR PRODUCTION

### ❌ NEVER DO THIS IN PRODUCTION:
- Store plain text passwords in JSON files
- Commit credentials to version control
- Use default encryption keys
- Store credentials in application code

### ✅ RECOMMENDED APPROACHES:

## 1. Environment Variables (Simplest)

### Set credentials as environment variables:
```bash
# Database credentials
export CRON_DB_HOST_1="prod-db.company.com"
export CRON_DB_USER_1="backup_user"
export CRON_DB_PASS_1="secure_random_password_123"
export CRON_DB_NAME_1="production_db"

# Encryption key for job metadata
export CRON_ENCRYPTION_KEY="your-32-byte-encryption-key-here"
```

### JSON stores only references:
```json
{
  "id": "job-123",
  "name": "Production DB Backup",
  "credentialRefs": {
    "host": "CRON_DB_HOST_1",
    "user": "CRON_DB_USER_1", 
    "password": "CRON_DB_PASS_1",
    "database": "CRON_DB_NAME_1"
  }
}
```

## 2. Docker Secrets (Docker Swarm)

```yaml
# docker-compose.yml
version: '3.8'
services:
  backup-app:
    image: your-app:latest
    secrets:
      - db_password_1
      - db_password_2
    environment:
      - CRON_DB_PASS_1_FILE=/run/secrets/db_password_1

secrets:
  db_password_1:
    external: true
  db_password_2:
    external: true
```

## 3. Kubernetes Secrets

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:
  db-password-1: "secure_password_here"
  db-password-2: "another_secure_password"
---
# deployment.yaml
env:
- name: CRON_DB_PASS_1
  valueFrom:
    secretKeyRef:
      name: db-credentials
      key: db-password-1
```

## 4. Cloud Secret Managers

### AWS Secrets Manager
```javascript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

async function getDbPassword(secretId) {
    const client = new SecretsManagerClient({ region: "us-east-1" });
    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await client.send(command);
    return JSON.parse(response.SecretString);
}
```

### Azure Key Vault
```javascript
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential();
const client = new SecretClient("https://your-vault.vault.azure.net/", credential);

async function getDbPassword(secretName) {
    const secret = await client.getSecret(secretName);
    return secret.value;
}
```

## 5. File System Permissions (Linux/Unix)

```bash
# Create secure credentials directory
sudo mkdir -p /etc/backup-app/credentials
sudo chmod 700 /etc/backup-app/credentials
sudo chown backup-user:backup-user /etc/backup-app/credentials

# Store encrypted credential files
echo "encrypted_password_data" | sudo tee /etc/backup-app/credentials/db1.enc
sudo chmod 600 /etc/backup-app/credentials/db1.enc
```

## 6. Systemd with Environment Files (Linux)

```ini
# /etc/systemd/system/backup-app.service
[Unit]
Description=Backup Application
After=network.target

[Service]
Type=simple
User=backup-user
EnvironmentFile=/etc/backup-app/credentials.env
ExecStart=/usr/local/bin/node /opt/backup-app/src/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# /etc/backup-app/credentials.env (mode 600)
CRON_DB_PASS_1=secure_password_here
CRON_DB_PASS_2=another_secure_password
CRON_ENCRYPTION_KEY=your-encryption-key-here
```

## 🔐 ADDITIONAL SECURITY MEASURES:

### 1. Database User Permissions
```sql
-- Create dedicated backup user with minimal permissions
CREATE USER backup_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE production_db TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
```

### 2. Network Security
- Use SSL/TLS connections to database
- Restrict database access to backup server IP
- Use VPN or private networks
- Enable database connection logging

### 3. Audit and Monitoring
```javascript
// Log backup operations (without credentials)
console.log(`Backup started: ${job.name} -> ${job.config.host}:${job.config.port}/${job.config.db}`);
// Log to external monitoring system
await logToMonitoring({
    event: 'backup_started',
    job_id: job.id,
    database: job.config.db,
    timestamp: new Date().toISOString()
});
```

### 4. Credential Rotation
```javascript
// Implement automatic credential rotation
function scheduleCredentialRotation() {
    cron.schedule('0 0 1 * *', async () => { // Monthly
        await rotateCredentials();
    });
}
```

## 🚨 IMMEDIATE ACTIONS FOR CURRENT SETUP:

1. **Move credentials to environment variables**
2. **Add encryption for job metadata**  
3. **Set proper file permissions (600 or 700)**
4. **Use dedicated database users with minimal permissions**
5. **Enable SSL connections to database**
6. **Add audit logging**
7. **Implement credential rotation policy**

## 📋 PRODUCTION CHECKLIST:

- [ ] No plain text passwords in files
- [ ] Credentials in environment variables or secret manager
- [ ] Encrypted job metadata 
- [ ] Proper file system permissions
- [ ] SSL/TLS database connections
- [ ] Dedicated database users
- [ ] Network security (firewalls, VPN)
- [ ] Audit logging enabled
- [ ] Monitoring and alerting
- [ ] Backup of credential configuration
- [ ] Disaster recovery plan
- [ ] Regular security audits