// Basic filename sanitization & helpers (no path traversal)
export function sanitizeName(str) {
    return (
        String(str || '')
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .slice(0, 80) || 'db'
    );
}

export function timestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(
        d.getMinutes()
    )}${pad(d.getSeconds())}`;
}
