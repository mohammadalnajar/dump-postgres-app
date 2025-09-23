import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import basicAuth from 'basic-auth';
import session from 'express-session';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildPgDumpArgs, runPgDump, extensionFor, listBackups, ensureDir } from './lib/pgdump.js';
import { requireStr, optionalBool, optionalInt, enumOf } from './lib/validate.js';
import { sanitizeName, timestamp } from './lib/sanitize.js';
import {
    requireAuth,
    redirectIfAuthenticated,
    verifyCredentials,
    getAuthCredentials
} from './lib/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.APP_PORT || 8080;
const BASE = process.env.APP_BASE_PATH || '/';
const TITLE = process.env.APP_TITLE || 'Simple Postgres Backup';

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
ensureDir(BACKUP_DIR);

// Helmet (with minimal CSP so EJS works fine)
app.use(
    helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                'img-src': ["'self'"],
                'script-src': ["'self'"],
                'style-src': ["'self'"]
            }
        }
    })
);

app.use(compression());
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }
    })
);

// Rate limit
const limiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
    max: Number(process.env.RATE_LIMIT_MAX || 20),
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

// Stricter rate limiting for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

// Authentication middleware
const USE_SESSION_AUTH = process.env.USE_SESSION_AUTH !== 'false'; // Default to true
const BA_USER = process.env.BASIC_AUTH_USER;
const BA_PASS = process.env.BASIC_AUTH_PASS;

if (USE_SESSION_AUTH) {
    // Use new session-based authentication
    console.log('Using session-based authentication');
    const { username } = getAuthCredentials();
    console.log(
        `Default username: ${username} (change AUTH_USERNAME and AUTH_PASSWORD environment variables)`
    );
} else if (BA_USER && BA_PASS) {
    // Fallback to basic auth for backward compatibility
    console.log('Using basic authentication (legacy mode)');
    app.use((req, res, next) => {
        const creds = basicAuth(req);
        if (!creds || creds.name !== BA_USER || creds.pass !== BA_PASS) {
            res.set('WWW-Authenticate', 'Basic realm="Restricted"');
            return res.status(401).send('Authentication required');
        }
        next();
    });
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(morgan('tiny'));

// Authentication routes (only if using session auth)
if (USE_SESSION_AUTH) {
    // Login page
    app.get('/login', redirectIfAuthenticated, (req, res) => {
        res.render('login', {
            title: TITLE,
            error: req.query.error || null,
            username: req.query.username || ''
        });
    });

    // Login form submission
    app.post('/login', loginLimiter, redirectIfAuthenticated, (req, res) => {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.redirect(
                '/login?error=' + encodeURIComponent('Username and password are required')
            );
        }

        if (verifyCredentials(username, password)) {
            req.session.authenticated = true;
            req.session.username = username;
            res.redirect('/');
        } else {
            res.redirect(
                '/login?error=' +
                    encodeURIComponent('Invalid username or password') +
                    '&username=' +
                    encodeURIComponent(username)
            );
        }
    });

    // Logout
    app.post('/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
            }
            res.redirect('/login');
        });
    });
}

// Auto-clean old files (optional)
const AUTO_CLEAN_DAYS = Number(process.env.AUTO_CLEAN_DAYS || 0);
if (AUTO_CLEAN_DAYS > 0) {
    const ms = AUTO_CLEAN_DAYS * 24 * 60 * 60 * 1000;
    setInterval(() => {
        try {
            for (const f of listBackups(BACKUP_DIR)) {
                if (Date.now() - f.mtime.getTime() > ms) {
                    fs.rmSync(f.path, { recursive: true, force: true });
                }
            }
        } catch {}
    }, 6 * 60 * 60 * 1000); // every 6h
}

// Home: show form + backup list
app.get('/', USE_SESSION_AUTH ? requireAuth : (req, res, next) => next(), (req, res) => {
    const files = listBackups(BACKUP_DIR);

    // Get message from query parameters
    let message = null;
    if (req.query.message) {
        message = req.query.message;
    } else if (req.query.error) {
        message = `Error: ${req.query.error}`;
    }

    res.render('index', {
        title: TITLE,
        files,
        message,
        defaults: {
            format: process.env.DEFAULT_FORMAT || 'plain',
            outputStyle: process.env.DEFAULT_OUTPUT_STYLE || 'standard',
            insertFormat: process.env.DEFAULT_INSERT_FORMAT || 'copy',
            includeOwner:
                process.env.DEFAULT_INCLUDE_OWNER === 'true'
                    ? true
                    : process.env.DEFAULT_INCLUDE_OWNER === 'false'
                    ? false
                    : undefined,
            onlySchema: process.env.DEFAULT_ONLY_SCHEMA || '',
            onlyData: process.env.DEFAULT_ONLY_DATA === 'true',
            excludeSchema: process.env.DEFAULT_EXCLUDE_SCHEMA || '',
            compressLevel: Number(process.env.DEFAULT_COMPRESS_LEVEL || 0),
            extraArgs: process.env.DEFAULT_EXTRA_ARGS || ''
        }
    });
});

// Create backup
app.post(
    '/backup',
    USE_SESSION_AUTH ? requireAuth : (req, res, next) => next(),
    async (req, res) => {
        try {
            const host = requireStr(req.body.host, 'Host');
            const db = requireStr(req.body.db, 'Database');
            const user = requireStr(req.body.user, 'User');
            const password = requireStr(req.body.password, 'Password');
            const port = optionalInt(req.body.port, 1, 65535) ?? 5432;

            const format = enumOf(
                req.body.format || process.env.DEFAULT_FORMAT || 'plain',
                ['plain', 'custom', 'tar', 'directory'],
                'plain'
            );

            const outputStyle = enumOf(
                req.body.outputStyle || process.env.DEFAULT_OUTPUT_STYLE || 'standard',
                ['standard', 'navicat'],
                'standard'
            );

            const insertFormat = enumOf(
                req.body.insertFormat || process.env.DEFAULT_INSERT_FORMAT || 'copy',
                ['copy', 'inserts'],
                'copy'
            );

            const includeOwnerVal = req.body.includeOwner;
            const includeOwner = includeOwnerVal === '' ? undefined : optionalBool(includeOwnerVal);

            const onlySchema =
                (req.body.onlySchema || '').trim() || process.env.DEFAULT_ONLY_SCHEMA || '';
            const onlyData =
                optionalBool(req.body.onlyData) ?? process.env.DEFAULT_ONLY_DATA === 'true';
            const excludeSchema =
                (req.body.excludeSchema || '').trim() || process.env.DEFAULT_EXCLUDE_SCHEMA || '';

            const compressLevel =
                optionalInt(req.body.compressLevel, 0, 9) ??
                Number(process.env.DEFAULT_COMPRESS_LEVEL || 0);

            const extraArgs = (req.body.extraArgs || process.env.DEFAULT_EXTRA_ARGS || '').trim();

            // Compute filename
            const safeDb = sanitizeName(db);
            const stamp = timestamp();
            const ext = extensionFor(format, outputStyle);
            const baseName = `${safeDb}_${stamp}${ext || ''}`;
            const outPath = path.join(BACKUP_DIR, baseName);

            // Build args
            const args = buildPgDumpArgs({
                host,
                port,
                user,
                db,
                includeOwner,
                format,
                compressLevel,
                onlySchema,
                onlyData,
                excludeSchema,
                extraArgs,
                password,
                outputStyle,
                insertFormat
            });

            // If directory format, outPath must be a directory
            if (format === 'directory') {
                fs.mkdirSync(outPath, { recursive: true });
                // for directory format, pg_dump needs -F d -f <dir>
                // we pass -f via runPgDump (non-plain branch)
            }

            await runPgDump({
                args,
                envPassword: password,
                outputPath: outPath,
                format,
                outputStyle,
                connectionOptions: { host, port, db }
            });

            // Redirect to home page with success message
            return res.redirect('/?message=' + encodeURIComponent(`Backup created: ${baseName}`));
        } catch (err) {
            console.error('Backup error:', err);
            // Redirect to home page with error message
            return res.redirect('/?error=' + encodeURIComponent(err.message || String(err)));
        }
    }
);

// Download backup
app.get(
    '/download/:name',
    USE_SESSION_AUTH ? requireAuth : (req, res, next) => next(),
    (req, res) => {
        const name = path.basename(req.params.name);
        const p = path.join(BACKUP_DIR, name);
        if (!fs.existsSync(p)) return res.status(404).send('Not found');
        res.download(p);
    }
);

// Delete backup
app.post(
    '/delete/:name',
    USE_SESSION_AUTH ? requireAuth : (req, res, next) => next(),
    (req, res) => {
        const name = path.basename(req.params.name);
        const p = path.join(BACKUP_DIR, name);
        if (!fs.existsSync(p)) return res.status(404).send('Not found');
        fs.rmSync(p, { recursive: true, force: true });
        res.redirect('/');
    }
);

// Health check endpoint for Docker
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'dump-postgres-app'
    });
});

app.listen(PORT, () => {
    console.log(`Simple PG Backup running on :${PORT}${BASE}`);
});
