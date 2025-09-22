# Simple Postgres Backup (Express + pg_dump)

A tiny, single-page Node.js/Express app to generate PostgreSQL backups (via `pg_dump`) from any reachable Postgres server. Fill a form (host/user/db/password + a few options), click **Backup**, and download your `.sql` / `.dump` / `.tar## "Navicat-like" behavior

The app now offers **two output styles**:

### Standard pg_dump Style
- Traditional PostgreSQL dump format
- Includes all pg_dump metadata and settings
- Uses COPY statements for data (faster for large datasets)
- Maintains all PostgreSQL-specific features

### Navicat-like Style  
- **Professional header** with source server information, version, and timestamp
- **Organized structure** with clear section comments for sequences, tables, and data
- **Clean formatting** with proper DROP TABLE IF EXISTS statements
- **Transaction blocks** for data inserts (BEGIN/COMMIT)
- **Choice of data format**: COPY statements or INSERT statements
- **Simplified output** without pg_dump metadata and function definitions

**Key differences from standard pg_dump:**
- Rich metadata header similar to Navicat exports
- Better organization with descriptive section comments
- Optional INSERT statements instead of COPY (useful for selective imports)
- Cleaner, more readable structure
- Consistent formatting and spacing

**When to use Navicat-like style:**
- When you need cleaner, more readable SQL files
- For sharing database structures with team members
- When migrating between different database management tools
- For documentation and version control purposes
- When you prefer INSERT statements for selective data importsdirectory) file. Designed to be simple, professional, and production-friendly. Runs in Docker.

**NEW:** Supports **Navicat-style formatting** to generate SQL dumps that match the structure and formatting of Navicat-generated exports!

---

## Features

- ✅ One-page UI (EJS) with a clean dark theme  
- ✅ Uses official `pg_dump` (PostgreSQL client) under the hood  
- ✅ Output formats: **plain SQL**, **custom** (`.dump`), **tar**, **directory**  
- ✅ **NEW: Navicat-style formatting** with professional header and organized structure
- ✅ **NEW: Flexible data output** - choose between COPY statements or INSERT statements
- ✅ Options: include owner, schema-only, data-only, exclude schema, compression, extra args  
- ✅ Timestamped, sanitized filenames (Navicat-style vibe)  
- ✅ List, download, and delete backup files  
- ✅ Basic security: optional HTTP Basic Auth, rate limiting, Helmet, no password logging  
- ✅ Dockerized with `docker-compose`  
- ✅ Optional auto-clean of old backups

---

## Project Structure

```
simple-pg-backup/
├─ docker-compose.yml
├─ Dockerfile
├─ .env.example            # copy to .env and edit
├─ .env
├─ package.json
├─ src/
│  ├─ server.js
│  ├─ views/
│  │  └─ index.ejs
│  ├─ lib/
│  │  ├─ pgdump.js
│  │  ├─ navicat-formatter.js    # NEW: Navicat-style formatting
│  │  ├─ sanitize.js
│  │  └─ validate.js
│  └─ public/
│     └─ style.css
├─ backups/                # generated dumps (volume)
└─ scripts/
   └─ backup.sh            # optional CLI wrapper (inside container)
```

---

## Requirements

- Docker + Docker Compose
- (Optional for local dev) Node.js ≥ 18

> The Docker image installs `postgresql16-client` to provide `pg_dump`.

---

## Quick Start (Docker)

1) **Clone & configure**

```bash
cp .env.example .env
# edit .env — set BASIC_AUTH_USER/BASIC_AUTH_PASS (recommended),
# APP_PORT, and any DEFAULT_* options you prefer.
```

2) **Build & run**

```bash
docker compose up -d --build
```

3) **Open the app**

```
http://YOUR_SERVER_IP:8080
```

If you configured Basic Auth, your browser will prompt for credentials.

---

## Environment Variables

| Variable                 |                  Default | Description                                                           |
| ------------------------ | -----------------------: | --------------------------------------------------------------------- |
| `APP_PORT`               |                   `8080` | Internal Express port (exposed via Compose).                          |
| `APP_BASE_PATH`          |                      `/` | Set if you’ll run under a sub-path behind a reverse proxy.            |
| `APP_TITLE`              | `Simple Postgres Backup` | Page title.                                                           |
| `BASIC_AUTH_USER`        |                *(empty)* | If set along with `BASIC_AUTH_PASS`, enables Basic Auth.              |
| `BASIC_AUTH_PASS`        |                *(empty)* | Basic Auth password.                                                  |
| `RATE_LIMIT_WINDOW_MS`   |                  `60000` | Rate limit window in ms.                                              |
| `RATE_LIMIT_MAX`         |                     `20` | Max requests per window per IP.                                       |
| `DEFAULT_FORMAT`         |                  `plain` | `plain` \| `custom` \| `directory` \| `tar`.                          |
| `DEFAULT_OUTPUT_STYLE`   |               `standard` | `standard` \| `navicat` - Output formatting style.                    |
| `DEFAULT_INSERT_FORMAT`  |                   `copy` | `copy` \| `inserts` - Data format for Navicat style.                  |
| `DEFAULT_INCLUDE_OWNER`  |                   `true` | `true`/`false` to include owner statements (`--no-owner` when false). |
| `DEFAULT_COMPRESS_LEVEL` |                      `0` | `0..9` (for `custom`/`tar`).                                          |
| `DEFAULT_EXCLUDE_SCHEMA` |                *(empty)* | Schema name to exclude (e.g., `information_schema`).                  |
| `DEFAULT_ONLY_SCHEMA`    |                *(empty)* | Schema name to dump only (e.g., `public`).                            |
| `DEFAULT_ONLY_DATA`      |                  `false` | If true, `--data-only`.                                               |
| `DEFAULT_EXTRA_ARGS`     |                *(empty)* | Additional pg_dump flags (e.g., `--no-privileges`).                   |
| `AUTO_CLEAN_DAYS`        |                *(empty)* | If set (e.g., `14`), delete backups older than N days.                |

---

## Usage

1. Go to the home page.
2. Fill connection details: **Host**, **Port**, **Database**, **User**, **Password**.
3. Choose **Format** and **Output Style**:
   - **Standard pg_dump**: Traditional PostgreSQL dump format
   - **Navicat-like**: Professional formatting with Navicat-style headers and organization
4. For Navicat-like style, choose **Data Format**:
   - **COPY statements**: Traditional COPY FROM stdin format
   - **INSERT statements**: Individual INSERT statements with column names
5. Configure other options (include owner, schema-only, etc.).
6. Click **Create Backup**.
7. Scroll to **Backups** list to **Download** or **Delete** files.

> Password is passed to `pg_dump` via the `PGPASSWORD` environment variable **only** for the spawned process. The app does not log or persist credentials.

## Output Formats Comparison

### Standard pg_dump Format
```sql
--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
...

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(255)
);

COPY public.users (id, name) FROM stdin;
1	John Doe
2	Jane Smith
\.
```

### Navicat-like Format
```sql
/*
 Navicat Premium Data Transfer

 Source Server         : PostgreSQL Server
 Source Server Type    : PostgreSQL
 Source Host           : localhost:5432
 Source Catalog        : mydb
 Source Schema         : public

 Date: 22/09/2025 08:17:22
*/

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS "users";
CREATE TABLE "users" (
  "id" int4 NOT NULL,
  "name" varchar(255) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Records of users
-- ----------------------------
BEGIN;
INSERT INTO "users" ("id", "name") VALUES (1, 'John Doe');
INSERT INTO "users" ("id", "name") VALUES (2, 'Jane Smith');
COMMIT;
```

---

## Output & Restore

**Formats**
- **Plain** (`.sql`): human-readable
- **Custom** (`.dump`): recommended for `pg_restore`, supports selective restore & compression
- **Tar** (`.tar`): for `pg_restore`
- **Directory**: folder output (good for very large dumps)

**Restore examples**

```bash
# Plain SQL
psql -h HOST -U USER -d TARGETDB -f mydb_20250101_120000.sql

# Custom/Tar/Directory (pg_restore)
pg_restore -h HOST -U USER -d TARGETDB mydb_20250101_120000.dump
# common flags:
#   --clean --if-exists --create --schema=public --table=...
```

---

## CLI (inside the container)

You can also trigger a backup via the optional shell script:

```bash
docker exec -it simple-pg-backup   /app/scripts/backup.sh   --host db.example.com --port 5432 --db mydb --user dbuser --password 'secret'   --format custom --include-owner true --compress-level 5   --extra-args "--no-privileges"
```

The file will appear in `/app/backups` (mounted to `./backups` on the host).

---

## Scheduling (optional)

Use host cron to run periodic backups via `docker exec`:

```bash
# Edit root crontab
sudo crontab -e

# Every night at 02:15 (UTC): custom format, compress level 5
15 2 * * * docker exec simple-pg-backup /app/scripts/backup.sh   --host db.example.com --port 5432 --db mydb --user dbuser --password 'secret'   --format custom --include-owner true --compress-level 5 >> /var/log/pgbackup.log 2>&1
```

Or run a small scheduler container that POSTs to `http://app:8080/backup` with Basic Auth.

---

## Reverse Proxy (Nginx example)

```nginx
server {
  listen 80;
  server_name backup.example.com;

  location / {
    proxy_pass         http://127.0.0.1:8080/;
    proxy_http_version 1.1;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
  }
}
```

> Use HTTPS (e.g., with Caddy or Nginx + Let’s Encrypt). Consider IP allowlists or VPN access.

---

## Security Notes

- Protect the app with **Basic Auth** (set both `BASIC_AUTH_USER` and `BASIC_AUTH_PASS`).
- Run behind HTTPS and, ideally, behind a reverse proxy with IP allowlists or VPN.
- Keep Docker image updated (rebuild periodically to get latest Postgres client).
- Avoid logging sensitive envs. This app doesn’t log passwords; don’t add verbose child logs.
- Store backups on an encrypted volume or sync off-site (S3/MinIO/rclone) if needed.

---

## Troubleshooting

- **`pg_dump: command not found`**  
  You’re likely running outside the container. Use Docker or install PostgreSQL client tools locally.

- **Authentication failed**  
  Verify credentials and that `pg_hba.conf` allows connections from your VPS IP.

- **Timeouts / cannot connect**  
  Check firewall/security groups; ensure DB port (default 5432) is reachable. Use a VPN or SSH tunnel if necessary.

- **Permission denied writing backups**  
  Ensure `./backups` exists on the host and is writable by Docker (Compose mounts it to `/app/backups`).

---

## “Navicat-like” behavior

- Navicat’s “Include Owner” toggles ownership/ACL statements.  
  `pg_dump` includes owner by default; choosing **No** adds `--no-owner`.  
- File naming is timestamped: `db_YYYYMMDD_HHMMSS.ext`.
- Use **custom** format (`.dump`) to get Navicat-like flexible restores via `pg_restore`.

---

## Development (optional)

Run locally (requires Node 18+ and Postgres client installed):

```bash
npm ci
npm run dev
# open http://localhost:8080
```

---

## Roadmap (optional ideas)

- Saved “connection profiles” with encrypted secrets  
- S3/MinIO storage target (upload after dump)  
- JSON API endpoints for automation  
- Healthcheck & Prometheus metrics

---

## License

MIT — do what you want, but no warranty.
