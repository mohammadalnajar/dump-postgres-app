# ==== config ====
COMPOSE_PROD = docker compose -f docker-compose.yml
COMPOSE_PROD_NET = docker compose -f docker-compose.yml -f docker-compose.prod.yml
COMPOSE_DEV = docker compose -f docker-compose.dev.yml

APP_PROD = dump_postgres_app
APP_DEV = dump_postgres_app_dev

# ==== helpers ====
.PHONY: help ps logs logs-dev status validate update build-dev up-dev down-dev redeploy-dev build-prod up-prod down-prod redeploy-prod clean

help:
	@echo "╔════════════════════════════════════════════════════════════════╗"
	@echo "║         PostgreSQL Dump App - Makefile Commands               ║"
	@echo "╚════════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📋 MONITORING"
	@echo "  make ps              - List all Docker containers"
	@echo "  make status          - Show app container status"
	@echo "  make logs            - Follow production logs"
	@echo "  make logs-dev        - Follow development logs"
	@echo ""
	@echo "🔍 VALIDATION & UPDATES"
	@echo "  make validate        - Run pre-deployment checks"
	@echo "  make update          - Pull latest changes from git"
	@echo ""
	@echo "💻 DEVELOPMENT"
	@echo "  make build-dev       - Build development image"
	@echo "  make up-dev          - Start development container"
	@echo "  make down-dev        - Stop development container"
	@echo "  make redeploy-dev    - Quick redeploy (stop→build→start→logs)"
	@echo "  make dev             - Build and start dev environment"
	@echo ""
	@echo "🚀 PRODUCTION"
	@echo "  make build-prod      - Build production image"
	@echo "  make up-prod         - Start production container"
	@echo "  make down-prod       - Stop production container"
	@echo "  make redeploy-prod   - Safe redeploy with health checks"
	@echo "  make prod            - Build and start production"
	@echo ""
	@echo "🔧 MAINTENANCE"
	@echo "  make clean           - Remove all containers and volumes"
	@echo ""
	@echo "💡 COMMON WORKFLOWS"
	@echo "  After code changes:    make redeploy-dev"
	@echo "  After git pull:        make update && make redeploy-dev"
	@echo "  Production deploy:     make validate && make redeploy-prod"
	@echo ""

ps:
	@docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

status:
	@echo "Checking dump-postgres-app containers..."
	@dev_status=$$(docker inspect --format='{{.State.Status}}' $(APP_DEV) 2>/dev/null || echo "not found"); \
	prod_status=$$(docker inspect --format='{{.State.Status}}' $(APP_PROD) 2>/dev/null || echo "not found"); \
	echo "  DEV ($(APP_DEV)): $$dev_status"; \
	echo "  PROD ($(APP_PROD)): $$prod_status"

logs:
	@docker logs -f $(APP_PROD)

logs-dev:
	@docker logs -f $(APP_DEV)

# =========================
# VALIDATION & UPDATES
# =========================
validate:
	@echo "🔍 Running pre-deployment validation..."
	@echo ""
	@# Check Docker daemon
	@docker info >/dev/null 2>&1 || (echo "❌ Docker daemon not running!" && exit 1)
	@echo "✅ Docker daemon is running"
	@# Check .env file
	@test -f .env || (echo "⚠️  Warning: .env file not found" && exit 0)
	@echo "✅ .env file exists"
	@# Check for default values in .env
	@grep -q "REPLACE_WITH" .env 2>/dev/null && echo "⚠️  Warning: Found default values in .env - customize before production!" || echo "✅ .env appears customized"
	@# Check for uncommitted changes
	@if [ -d .git ]; then \
		if [ -n "$$(git status --porcelain)" ]; then \
			echo "⚠️  Warning: Uncommitted changes detected"; \
			echo "   Consider committing before deployment"; \
		else \
			echo "✅ No uncommitted changes"; \
		fi; \
	fi
	@echo ""
	@# Show current status
	@$(MAKE) status
	@echo ""
	@echo "✅ Validation complete!"

update:
	@echo "📥 Pulling latest changes from git..."
	@echo ""
	@if [ ! -d .git ]; then \
		echo "❌ Not a git repository"; \
		exit 1; \
	fi
	@# Fetch and show status before pull
	@git fetch origin
	@echo "Changes to be pulled:"
	@git log HEAD..origin/$$(git rev-parse --abbrev-ref HEAD) --oneline 2>/dev/null || echo "Already up to date"
	@echo ""
	@# Pull changes
	@git pull
	@echo ""
	@echo "📋 Changed files:"
	@git diff --name-only HEAD@{1} HEAD 2>/dev/null || echo "No changes"
	@echo ""
	@echo "✅ Update complete!"
	@echo ""
	@echo "💡 Next steps:"
	@echo "  Development: make redeploy-dev"
	@echo "  Production:  make validate && make redeploy-prod"

# =========================
# DEVELOPMENT
# =========================
build-dev:
	$(COMPOSE_DEV) build app

up-dev:
	$(COMPOSE_DEV) up -d app

down-dev:
	$(COMPOSE_DEV) down

restart-dev: down-dev up-dev

redeploy-dev:
	@echo "🔄 Redeploying development environment..."
	@echo ""
	@# Stop existing container
	@echo "⏹️  Stopping existing container..."
	@$(COMPOSE_DEV) down 2>/dev/null || true
	@# Rebuild with latest code
	@echo "🔨 Building with latest code..."
	@$(COMPOSE_DEV) build app
	@# Start new container
	@echo "🚀 Starting new container..."
	@$(COMPOSE_DEV) up -d app
	@# Wait a moment for startup
	@sleep 3
	@# Show status
	@echo ""
	@echo "✅ Development redeployment complete!"
	@echo ""
	@$(MAKE) status
	@echo ""
	@echo "📋 Viewing logs (Ctrl+C to exit):"
	@echo ""
	@docker logs -f --tail=50 $(APP_DEV)

dev: build-dev up-dev
	@echo "Development environment started. Check with 'make logs-dev'"

# =========================
# PRODUCTION
# =========================
build-prod:
	$(COMPOSE_PROD) build app

up-prod:
	$(COMPOSE_PROD) up -d app

down-prod:
	$(COMPOSE_PROD) down

restart-prod: down-prod up-prod

redeploy-prod:
	@echo "🚀 Redeploying production environment..."
	@echo ""
	@# Pre-deployment validation
	@echo "🔍 Step 1/5: Validation"
	@$(MAKE) validate
	@echo ""
	@# Build new image
	@echo "🔨 Step 2/5: Building new image..."
	@$(COMPOSE_PROD_NET) build app
	@echo ""
	@# Create temp container name
	@NEW_CONTAINER=$(APP_PROD)_new_$$(date +%s); \
	OLD_CONTAINER=$(APP_PROD); \
	echo "📦 Step 3/5: Starting new container ($$NEW_CONTAINER)..."; \
	$(COMPOSE_PROD_NET) up -d app && \
	sleep 5 && \
	echo ""; \
	echo "🏥 Step 4/5: Health checking new container..."; \
	if docker exec $(APP_PROD) curl -f http://localhost:8080/health >/dev/null 2>&1; then \
		echo "✅ New container is healthy"; \
		echo ""; \
		echo "🔄 Step 5/5: Deployment complete!"; \
	else \
		echo "❌ Health check failed!"; \
		echo "Rolling back..."; \
		$(COMPOSE_PROD_NET) down; \
		exit 1; \
	fi
	@echo ""
	@echo "✅ Production redeployment successful!"
	@echo ""
	@$(MAKE) status
	@echo ""
	@echo "📋 Viewing logs (Ctrl+C to exit):"
	@echo ""
	@docker logs -f --tail=50 $(APP_PROD)

prod: build-prod up-prod
	@echo "Production environment started. Check with 'make logs'"

# Production with external networks (for deployment behind reverse proxy)
build-prod-net:
	$(COMPOSE_PROD_NET) build app

up-prod-net:
	$(COMPOSE_PROD_NET) up -d app

down-prod-net:
	$(COMPOSE_PROD_NET) down

restart-prod-net: down-prod-net up-prod-net

prod-net: build-prod-net up-prod-net
	@echo "Production environment with external networks started."

# Enhanced production deployment with security checks
deploy-prod: pre-deploy-checks setup-networks build-prod-net up-prod-net post-deploy-checks
	@echo "🚀 Production deployment completed successfully!"

pre-deploy-checks:
	@echo "🔍 Running pre-deployment checks..."
	@test -f .env || (echo "❌ Missing .env file! Copy from .env.prod-template" && exit 1)
	@grep -q "REPLACE_WITH" .env && (echo "❌ Found default values in .env - please customize!" && exit 1) || echo "✅ Environment variables look customized"
	@docker --version >/dev/null 2>&1 || (echo "❌ Docker not found" && exit 1)
	@echo "✅ Pre-deployment checks passed"

setup-networks:
	@echo "🌐 Setting up Docker networks..."
	@docker network inspect proxy >/dev/null 2>&1 || docker network create proxy
	@docker network inspect db_net >/dev/null 2>&1 || docker network create db_net
	@echo "✅ Networks ready"

post-deploy-checks:
	@echo "🏥 Running post-deployment health checks..."
	@sleep 10
	@docker ps | grep -q dump_postgres_app || (echo "❌ Container not running!" && exit 1)
	@echo "✅ Container is running"
	@docker exec dump_postgres_app curl -f http://localhost:8080/health >/dev/null 2>&1 || (echo "❌ Health check failed!" && exit 1)
	@echo "✅ Application is healthy"

# =========================
# CLEANUP
# =========================
clean:
	@echo "Cleaning up containers and images..."
	-@docker rm -f $(APP_DEV) $(APP_PROD) 2>/dev/null || true
	@docker system prune -f
	@echo "Cleanup complete"

clean-volumes:
	@echo "WARNING: This will remove backup volumes!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker volume prune -f; \
		echo "Volumes cleaned"; \
	else \
		echo "Cancelled"; \
	fi

# =========================
# HEALTH CHECKS
# =========================
health-dev:
	@echo "Checking health of development container..."
	@curl -s http://localhost:$${APP_PORT:-8080}/health | jq . || echo "Health check failed"

health-prod:
	@echo "Checking health of production container..."
	@curl -s http://localhost:$${APP_PORT:-8080}/health | jq . || echo "Health check failed"

# =========================
# BACKUP MANAGEMENT
# =========================
backup-list:
	@echo "Current backups:"
	@ls -la backups/ 2>/dev/null || echo "No backups directory found"

# backup-clean:
# 	@echo "Cleaning old backup files..."
# 	@find backups/ -name "*.sql*" -type f -mtime +7 -delete 2>/dev/null || true
# 	@echo "Old backups cleaned (older than 7 days)"

# =========================
# TODO MANAGEMENT
# =========================
todos:
	@echo "📋 Scanning for TODOs in codebase..."
	@bash scripts/scan-todos.sh

plan:
	@echo "📋 Opening planning files..."
	@code TODO.md JOURNAL.md

setup-hooks:
	@echo "🔧 Setting up git hooks..."
	@bash scripts/setup-hooks.sh

todo-stats:
	@echo "📊 TODO Statistics:"
	@echo "-------------------"
	@# Count unchecked TODOs in each priority section
	@high_count=$$(sed -n '/## 🔥.*High Priority/,/^## /p' TODO.md | grep -c '^- \[ \]' 2>/dev/null || echo 0); \
	medium_count=$$(sed -n '/## 🟡.*Medium Priority/,/^## /p' TODO.md | grep -c '^- \[ \]' 2>/dev/null || echo 0); \
	low_count=$$(sed -n '/## 🟢.*Low Priority/,/^## /p' TODO.md | grep -c '^- \[ \]' 2>/dev/null || echo 0); \
	completed_count=$$(grep -c -E '^- \[x\]' TODO.md 2>/dev/null || echo 0); \
	code_todos=$$(grep -r --include="*.js" --exclude="*test*" -E '//.*TODO|//.*FIXME|//.*HACK' . 2>/dev/null | wc -l | xargs); \
	total_pending=$$(( high_count + medium_count + low_count )); \
	echo "High Priority TODOs: $$high_count"; \
	echo "Medium Priority TODOs: $$medium_count"; \
	echo "Low Priority TODOs: $$low_count"; \
	echo "Total Pending: $$total_pending"; \
	echo "Completed TODOs: $$completed_count"; \
	echo "-------------------"; \
	echo "In-code TODOs: $$code_todos"