# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-01-24

### Added
- **Documentation Structure**: Organized documentation into logical sections
  - `docs/deployment/` - Production deployment guides
  - `docs/features/` - Feature-specific documentation
  - `docs/development/` - Developer guides and tools
  - `docs/archive/` - Historical implementation notes
- **New Documentation**:
  - `docs/ARCHITECTURE.md` - Comprehensive system architecture documentation
  - `docs/API.md` - Complete API endpoint reference
  - `docs/README.md` - Documentation index and navigation guide
- **Sleep/Wake Detection**: Enhanced cron job documentation with laptop sleep/wake cycle detection
- **Health Check Script**: Documented `scripts/check-cron-health.js` for monitoring cron jobs

### Changed
- **Project Structure**: Reorganized root directory for better clarity
  - Moved test scripts from root to `test/` directory
  - Moved utility scripts from root to `scripts/` directory
  - Consolidated all documentation in organized `docs/` structure
- **README.md**: Updated project structure section to reflect current organization
- **TODO.md**: 
  - Updated to January 2026
  - Marked completed features (cron jobs, encryption, dark mode, health checks)
  - Reorganized priorities based on current state
  - Added "Recently Completed" section
- **CRON_JOBS.md**: Added comprehensive documentation for advanced features
  - Sleep/wake detection for laptop users
  - Concurrency protection
  - Performance monitoring
  - Health check script usage

### Removed
- **Redundant Docker Files**: 
  - `Dockerfile.alternative` - Backup/alternative version
  - `Dockerfile.backup` - Old backup version
  - `Dockerfile.prod` - Superseded by main Dockerfile
- **Unused Configuration**:
  - `docker-compose.prod-enhanced.yml` - Redundant configuration
- **Obsolete Code**:
  - `src/lib/cronManager.js` - Replaced by cronManagerSecure.js with encryption
- **Root Directory Cleanup**:
  - `test-user-issue.js` - Empty test file
  - `test.json` - Unused test data
  - `fix-docker-auth.sh` - One-time fix script no longer needed
- **Old Backup Files**: 
  - Removed 11 old SQL backup files from September 2025 (~176MB)
- **Reorganized Documentation** (moved, not deleted):
  - `DEPLOYMENT_ORACLE_VPS.md` → `docs/deployment/ORACLE-VPS.md`
  - `CRON_FIX_REPORT.md` → `docs/archive/`
  - `SLEEP_WAKE_SOLUTION.md` → `docs/archive/` (merged into CRON_JOBS.md)
  - `production-improvements.md` → `docs/archive/`
  - All implementation docs → `docs/archive/`

### Fixed
- **Import References**: Verified no broken imports after removing cronManager.js
- **File Organization**: Proper separation of tests, scripts, and documentation

### Security
- Retained `secure-setup.sh` for deployment security setup (generates encryption keys)
- All sensitive configuration files remain in .gitignore

## [1.0.0] - 2025-09-26

### Added
- **Automated Cron Job System**: Schedule database backups with cron expressions
- **AES-256-GCM Encryption**: Secure credential storage for cron jobs
- **Session-Based Authentication**: Modern login system with bcrypt password hashing
- **Backup Cleanup System**: Intelligent retention policies (days/count-based)
- **Navicat-Style Formatting**: Professional SQL dump formatting option
- **Confirmation Modal System**: Elegant UI confirmations for destructive actions
- **Health Check Endpoint**: `/health` for monitoring and uptime checks
- **Sleep/Wake Detection**: Smart detection for laptop-based development
- **Dark Mode UI**: Modern dark theme interface
- **Job-Specific Cleanup**: Isolated cleanup for each cron job
- **Docker Deployment**: Production-ready containerization
- **Comprehensive Documentation**: Feature guides and deployment docs

### Initial Features
- PostgreSQL backup creation with pg_dump
- Multiple output formats (plain, custom, tar, directory)
- Compression support for applicable formats
- Schema/data isolation options
- Backup file management (list, download, delete)
- Manual backup execution
- Environment-based configuration

---

## Release Notes

### v1.1.0 - Project Organization & Documentation
This release focuses on improving project organization and documentation quality without changing functionality:

**Key Improvements**:
- 📁 Clean, professional project structure
- 📚 Comprehensive documentation (900+ lines of new docs)
- 🗑️ Removed 22 redundant/obsolete files
- 💾 Freed ~176MB of storage
- ✅ No breaking changes - all features work as before

**For Existing Users**:
- No configuration changes required
- All existing backups and cron jobs remain intact
- Application behavior unchanged
- Update to latest version with `git pull`

**For New Users**:
- Start with [README.md](./README.md)
- Check [docs/deployment/](./docs/deployment/) for production setup
- Review [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for system understanding
- See [docs/API.md](./docs/API.md) for endpoint reference

---

## Migration Notes

### From v1.0.0 to v1.1.0

**No migration required!** This is a cleanup/documentation release.

**Optional Actions**:
1. Review new documentation structure in `docs/`
2. Check [docs/deployment/ORACLE-VPS.md](./docs/deployment/ORACLE-VPS.md) for updated deployment guide
3. Explore [docs/API.md](./docs/API.md) for programmatic access examples

**Deprecated**:
- None

**Breaking Changes**:
- None

---

## Versioning Strategy

We use [Semantic Versioning](https://semver.org/):
- **MAJOR** version: Incompatible API changes
- **MINOR** version: New functionality (backwards compatible)
- **PATCH** version: Bug fixes (backwards compatible)

---

## Links

- [Repository](https://github.com/mohammadalnajar/dump-postgres-app)
- [Issue Tracker](https://github.com/mohammadalnajar/dump-postgres-app/issues)
- [Documentation](./docs/)
- [Architecture Guide](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API.md)

---

## Contributors

Maintained by [@mohammadalnajar](https://github.com/mohammadalnajar)

---

[Unreleased]: https://github.com/mohammadalnajar/dump-postgres-app/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/mohammadalnajar/dump-postgres-app/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/mohammadalnajar/dump-postgres-app/releases/tag/v1.0.0
