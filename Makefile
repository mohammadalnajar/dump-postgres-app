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