# ==== config ====
COMPOSE_PROD = docker compose -f docker-compose.yml
COMPOSE_PROD_NET = docker compose -f docker-compose.yml -f docker-compose.prod.yml
COMPOSE_DEV = docker compose -f docker-compose.dev.yml

APP_PROD = dump_postgres_app
APP_DEV = dump_postgres_app_dev

# ==== helpers ====
.PHONY: ps logs logs-dev status build-dev up-dev down-dev build-prod up-prod down-prod clean

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
# DEVELOPMENT
# =========================
build-dev:
	$(COMPOSE_DEV) build app

up-dev:
	$(COMPOSE_DEV) up -d app

down-dev:
	$(COMPOSE_DEV) down

restart-dev: down-dev up-dev

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

backup-clean:
	@echo "Cleaning old backup files..."
	@find backups/ -name "*.sql*" -type f -mtime +7 -delete 2>/dev/null || true
	@echo "Old backups cleaned (older than 7 days)"

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