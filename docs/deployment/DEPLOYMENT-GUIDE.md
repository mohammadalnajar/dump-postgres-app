# Deployment Guide

## 🚀 Quick Reference

### Common Deployment Scenarios

| Scenario                     | Command                                | When to Use                           |
| ---------------------------- | -------------------------------------- | ------------------------------------- |
| **Made code changes (dev)**  | `make redeploy-dev`                    | After editing code locally            |
| **Made code changes (prod)** | `make redeploy-prod`                   | After testing changes, ready for prod |
| **Pulled git changes**       | `make update` then `make redeploy-dev` | After `git pull`                      |
| **First deployment**         | `make deploy-prod`                     | Initial production deployment         |
| **Check status**             | `make status`                          | See if containers are running         |
| **View logs**                | `make logs` or `make logs-dev`         | Debug issues                          |
| **Pre-deployment check**     | `make validate`                        | Before any deployment                 |
| **Help/Commands list**       | `make help`                            | See all available commands            |

---

## 📖 Detailed Workflows

### 1. Development Workflow (Local Changes)

**Scenario:** You just modified some code and want to test it.

```bash
# Quick redeploy (recommended)
make redeploy-dev
```

**What it does:**
1. ✅ Stops existing development container
2. ✅ Rebuilds with your latest code changes
3. ✅ Starts new container
4. ✅ Shows status and tails logs automatically

**Alternative (manual steps):**
```bash
make down-dev
make build-dev
make up-dev
make logs-dev
```

---

### 2. After Pulling Changes from Git

**Scenario:** You ran `git pull` and got new changes from the repository.

```bash
# Step 1: Pull and review changes
make update

# Step 2: Redeploy
make redeploy-dev    # For development
# OR
make redeploy-prod   # For production (after validation)
```

**What `make update` does:**
1. ✅ Fetches latest from origin
2. ✅ Shows what commits will be pulled
3. ✅ Pulls the changes
4. ✅ Lists changed files
5. ✅ Suggests next deployment steps

---

### 3. Production Deployment (New Changes)

**Scenario:** Your code is tested and ready for production.

```bash
# Step 1: Validate environment (recommended)
make validate

# Step 2: Deploy to production
make redeploy-prod
```

**What `make validate` checks:**
- ✅ Docker daemon is running
- ✅ `.env` file exists
- ✅ No default placeholder values in `.env`
- ✅ Git status (uncommitted changes warning)
- ✅ Current container status

**What `make redeploy-prod` does:**
1. ✅ Runs validation checks
2. ✅ Builds new Docker image
3. ✅ Starts new container
4. ✅ Health checks the new container
5. ✅ **Rolls back automatically** if health check fails
6. ✅ Shows status and logs

**Key Features:**
- 🛡️ **Automatic rollback** on failure
- 🏥 **Health checks** before accepting deployment
- 📊 **Status reporting** throughout process
- 📝 **Automatic logs** after deployment

---

### 4. Fresh Production Deployment (First Time)

**Scenario:** First time deploying to a new server/environment.

```bash
# Full deployment with all setup
make deploy-prod
```

**What it does:**
1. ✅ Pre-deployment checks (.env, Docker, etc.)
2. ✅ Sets up Docker networks (proxy, db_net)
3. ✅ Builds production image
4. ✅ Starts container with networks
5. ✅ Post-deployment health checks
6. ✅ Verifies application is healthy

**Before running:**
1. Copy `.env.prod-template` to `.env`
2. Customize all `REPLACE_WITH` values
3. Ensure Docker daemon is running
4. Review `docs/deployment/PRODUCTION-SECURITY.md`

---

## 🛠️ Makefile Commands Reference

### Status & Monitoring

```bash
make help           # Show all available commands
make status         # Check container status (dev & prod)
make ps             # List all running containers
make logs           # View production logs (live)
make logs-dev       # View development logs (live)
make health-dev     # Health check dev container
make health-prod    # Health check prod container
```

### Development Commands

```bash
make dev            # Start development environment
make redeploy-dev   # Rebuild & restart dev (after changes)
make restart-dev    # Quick restart dev container
make down-dev       # Stop development environment
make build-dev      # Build development image only
make up-dev         # Start development container only
```

### Production Commands

```bash
make validate       # Pre-deployment validation checks
make deploy-prod    # Full production deployment (first time)
make redeploy-prod  # Redeploy production (after changes)
make restart-prod   # Quick restart prod container
make down-prod      # Stop production environment
make build-prod     # Build production image only
make up-prod        # Start production container only
```

### Update Commands

```bash
make update         # Git pull and show changes
```

### Cleanup Commands

```bash
make clean          # Remove containers and prune system
make clean-volumes  # Remove backup volumes (DANGER!)
```

### Development Tools

```bash
make todos          # Scan codebase for TODOs
make todo-stats     # Show TODO statistics
make plan           # Open planning documents
make setup-hooks    # Install git hooks
make backup-list    # List current backups
```

---

## 🔄 Complete Deployment Workflows

### Workflow A: Daily Development Cycle

```bash
# 1. Start your day
git pull
make update

# 2. Make code changes
# ... edit files ...

# 3. Test changes
make redeploy-dev

# 4. Review logs
make logs-dev    # Ctrl+C to exit

# 5. Repeat as needed
# ... more edits ...
make redeploy-dev
```

### Workflow B: Production Release

```bash
# 1. Ensure latest code
git pull
make update

# 2. Test in development
make redeploy-dev
# ... test thoroughly ...

# 3. Commit and push
git add .
git commit -m "Feature: description"
git push

# 4. Validate production environment
make validate

# 5. Deploy to production
make redeploy-prod

# 6. Monitor deployment
# (logs show automatically)
# Ctrl+C when satisfied

# 7. Verify health
make health-prod
```

### Workflow C: Hotfix Deployment

```bash
# 1. Quick fix in code
# ... make emergency fix ...

# 2. Test locally
make redeploy-dev

# 3. Commit (can skip hooks with --no-verify if urgent)
git commit -m "Hotfix: critical bug" --no-verify
git push

# 4. Deploy to production immediately
make redeploy-prod

# 5. Monitor closely
make logs    # Watch for errors
```

---

## 🚨 Troubleshooting

### Container Won't Start

```bash
# 1. Check status
make status

# 2. Check logs for errors
make logs

# 3. Validate environment
make validate

# 4. Check Docker daemon
docker info

# 5. Try clean restart
make down-prod
make clean
make deploy-prod
```

### Health Check Failing

```bash
# 1. Check logs
make logs

# 2. Check if container is running
docker ps

# 3. Manual health check
curl http://localhost:8080/health

# 4. Check inside container
docker exec -it dump_postgres_app /bin/sh
```

### Build Failing

```bash
# 1. Check Docker daemon
docker info

# 2. Clean Docker cache
make clean
docker system prune -a

# 3. Rebuild from scratch
make build-dev    # or build-prod
```

### Port Already in Use

```bash
# 1. Check what's using the port
lsof -i :8080

# 2. Stop old containers
make down-dev
make down-prod

# 3. Clean up
make clean
```

---

## 🔐 Security Best Practices

### Before Production Deployment

**Checklist:**
- [ ] Reviewed and customized `.env` file
- [ ] Changed default credentials (`AUTH_USERNAME`, `AUTH_PASSWORD`)
- [ ] Generated secure `SESSION_SECRET`
- [ ] Generated secure `CRON_ENCRYPTION_KEY`
- [ ] Reviewed `docs/deployment/PRODUCTION-SECURITY.md`
- [ ] Set up Nginx reverse proxy (if applicable)
- [ ] Configured SSL/TLS certificates
- [ ] Set up firewall rules
- [ ] Configured backup retention policies
- [ ] Tested health check endpoint

### Production Environment Variables

**Critical variables to customize:**
```bash
# Authentication
AUTH_USERNAME=your-admin-username
AUTH_PASSWORD=your-secure-password
SESSION_SECRET=your-very-long-random-secret-key

# Encryption
CRON_ENCRYPTION_KEY=your-64-character-hex-encryption-key

# Application
APP_PORT=8080
APP_TITLE=Your App Title
NODE_ENV=production
```

**Generate secure keys:**
```bash
# Session secret (32+ characters)
openssl rand -base64 32

# Encryption key (64 hex characters)
openssl rand -hex 32
```

---

## 📊 Monitoring Production

### Daily Checks

```bash
# Morning routine
make status           # Check containers running
make health-prod      # Verify app is healthy
make backup-list      # Check backups are created
```

### Log Monitoring

```bash
# Real-time monitoring
make logs

# Last 100 lines
docker logs --tail=100 dump_postgres_app

# Since specific time
docker logs --since 1h dump_postgres_app

# Follow with timestamp
docker logs -f -t dump_postgres_app
```

### Health Monitoring

```bash
# Quick health check
make health-prod

# Detailed health check
curl -v http://localhost:8080/health

# From outside server (if reverse proxy configured)
curl -v https://your-domain.com/health
```

---

## 🔄 Rollback Procedures

### Quick Rollback (If Deployment Just Failed)

```bash
# Automatic rollback
# - redeploy-prod rolls back automatically on health check failure

# Manual rollback to previous image
docker ps -a    # Find previous container ID
docker start <previous-container-id>
docker stop dump_postgres_app
```

### Rollback to Previous Git Commit

```bash
# 1. Check git history
git log --oneline -10

# 2. Revert to previous commit
git revert <commit-hash>

# 3. Redeploy
make redeploy-prod
```

### Rollback to Specific Version

```bash
# 1. Checkout specific version
git checkout <commit-hash>

# 2. Deploy
make deploy-prod

# 3. Return to main (after fix)
git checkout main
```

---

## 💾 Backup Management

### Manual Backup Before Deployment

```bash
# List current backups
make backup-list

# Check cron job status
node scripts/check-cron-health.js

# Trigger manual backup via UI
# Navigate to http://localhost:8080
# Fill form and create backup
```

### Backup Best Practices

- ✅ Test backups regularly
- ✅ Store backups off-server
- ✅ Verify backup integrity
- ✅ Document restore procedures
- ✅ Set appropriate retention policies
- ✅ Monitor backup job health

---

## 🆘 Emergency Procedures

### Application Down - Quick Recovery

```bash
# 1. Stop everything
make down-prod

# 2. Clean up
make clean

# 3. Fresh deployment
make deploy-prod

# 4. Monitor logs
make logs
```

### Database Connection Issues

```bash
# 1. Check environment variables
cat .env | grep -E "DB_|POSTGRES_"

# 2. Test database connectivity
docker exec dump_postgres_app pg_isready -h <db-host>

# 3. Review cron job credentials
# Via UI: http://localhost:8080
```

### Container Crashed

```bash
# 1. Check exit code
docker inspect dump_postgres_app | grep ExitCode

# 2. Review logs
docker logs dump_postgres_app

# 3. Restart
make restart-prod

# 4. If persistent, rebuild
make redeploy-prod
```

---

## 📚 Additional Resources

- [Architecture Documentation](../ARCHITECTURE.md)
- [API Reference](../API.md)
- [Production Security Guide](./PRODUCTION-SECURITY.md)
- [Oracle VPS Deployment](./ORACLE-VPS.md)
- [Feature Documentation](../features/)

---

## 🎯 Quick Decision Tree

**Need to deploy?**
```
Has code changed?
├─ YES → Was it tested?
│  ├─ YES → make validate && make redeploy-prod
│  └─ NO  → make redeploy-dev (test first!)
└─ NO → No deployment needed
```

**After git pull?**
```
Got new changes?
├─ YES → make update, then make redeploy-dev
└─ NO → Already up to date
```

**Container issues?**
```
Container running?
├─ YES → Check logs: make logs
└─ NO → make status, then make redeploy-prod
```

---

**Last Updated:** January 24, 2026  
**Version:** 1.1.0
