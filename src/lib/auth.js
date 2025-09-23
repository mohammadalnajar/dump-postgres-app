import bcrypt from 'bcryptjs';

// Default credentials if not provided via environment variables
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin123'; // This should be changed in production

/**
 * Get the configured username and hashed password
 */
export function getAuthCredentials() {
    const username = process.env.AUTH_USERNAME || DEFAULT_USERNAME;
    const plainPassword = process.env.AUTH_PASSWORD || DEFAULT_PASSWORD;

    // Hash the password if it's not already hashed
    const password = plainPassword.startsWith('$2')
        ? plainPassword
        : bcrypt.hashSync(plainPassword, 10);

    return { username, password };
}

/**
 * Verify user credentials
 */
export function verifyCredentials(username, password) {
    const { username: validUsername, password: hashedPassword } = getAuthCredentials();

    if (username !== validUsername) {
        return false;
    }

    return bcrypt.compareSync(password, hashedPassword);
}

/**
 * Middleware to check if user is authenticated
 */
export function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
        return next();
    }

    // If it's an AJAX request, return JSON error
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Redirect to login page
    res.redirect('/login');
}

/**
 * Middleware to redirect authenticated users away from login page
 */
export function redirectIfAuthenticated(req, res, next) {
    if (req.session && req.session.authenticated) {
        return res.redirect('/');
    }
    next();
}
