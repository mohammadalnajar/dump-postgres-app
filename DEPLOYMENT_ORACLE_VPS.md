# Oracle VPS Deployment Instructions

## 🚨 Current Issue: Docker Hub Authentication

Your deployment failed due to Docker Hub requiring authentication. Here are the solutions:

## 🔧 Quick Fixes

### Option 1: Docker Hub Login (Recommended)
```bash
# On your Oracle VPS:
docker login
# Enter your Docker Hub username and password
# If you don't have an account, create one at https://hub.docker.com (free)

# Then retry deployment:
make deploy-prod
```

### Option 2: Use Alternative Registry
```bash
# Run the fix script to try alternative registries:
./fix-docker-auth.sh

# If successful, retry deployment:
make deploy-prod
```

### Option 3: Manual Image Pull
```bash
# Try pulling the image manually first:
docker pull node:20-alpine

# If that fails, try Amazon ECR Public:
docker pull public.ecr.aws/docker/library/node:20-alpine

# Then tag it for local use:
docker tag public.ecr.aws/docker/library/node:20-alpine node:20-alpine

# Now deploy:
make deploy-prod
```

## ✅ Other Issues Fixed

### 1. Removed Obsolete Version Fields
- ✅ Fixed `version: '3.8'` warnings in docker-compose files
- ✅ Modern Docker Compose doesn't need version field

### 2. Environment Variable Warnings
The warnings about `BASIC_AUTH_USER` and `BASIC_AUTH_PASS` are expected if you're using session-based auth (which you should be). These are fallback variables.

## 🚀 After Authentication Fix

Once Docker authentication is resolved, your deployment should work smoothly:

```bash
ubuntu@bmw-oracle-2025:~/apps/dump-postgres-app$ make deploy-prod
🔍 Running pre-deployment checks...
✅ Environment variables look customized
✅ Pre-deployment checks passed
🌐 Setting up Docker networks...
✅ Networks ready
[+] Building successful...
[+] Running container...
🏥 Running post-deployment health checks...
✅ Container is running
✅ Application is healthy
🚀 Production deployment completed successfully!
```

## 📋 Next Steps After Successful Deployment

1. **Configure Nginx** (if not already done):
   ```bash
   sudo cp nginx.conf.example /etc/nginx/sites-available/dump-postgres-app
   sudo ln -s /etc/nginx/sites-available/dump-postgres-app /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

2. **Set up SSL** with Let's Encrypt:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

3. **Configure firewall** to only allow your IP:
   ```bash
   sudo ufw allow from YOUR_IP_ADDRESS to any port 22
   sudo ufw allow from YOUR_IP_ADDRESS to any port 80
   sudo ufw allow from YOUR_IP_ADDRESS to any port 443
   sudo ufw --force enable
   ```

4. **Test the application**:
   - Open your browser to `https://your-domain.com`
   - Login with your configured credentials
   - Test a database backup

## 🔍 Troubleshooting

If you continue to have issues:

1. **Check Docker status**: `docker info`
2. **Check container logs**: `make logs`
3. **Check health**: `docker exec dump_postgres_app curl -f http://localhost:8080/health`
4. **Check nginx logs**: `sudo tail -f /var/log/nginx/error.log`

## 📞 Support

If you need additional help, provide the full error output from these commands:
- `docker info`
- `docker version`
- `make deploy-prod`