import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { postProcessToNavicatStyle } from './navicat-formatter.js';

export function buildPgDumpArgs({
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
    outputStyle = 'standard',
    insertFormat = 'copy'
}) {
    const args = [];

    if (host) args.push('-h', host);
    if (port) args.push('-p', String(port));
    if (user) args.push('-U', user);

    // Format
    // plain -> .sql ; custom -> .dump ; directory -> dir ; tar -> .tar
    if (format) args.push('-F', format);

    // Handle Navicat-style formatting options
    if (outputStyle === 'navicat') {
        // Force plain format for Navicat style processing
        args.push('-F', 'plain');

        // Navicat-like options
        args.push('--no-privileges'); // Don't dump privileges
        args.push('--no-tablespaces'); // Don't dump tablespaces

        if (insertFormat === 'inserts') {
            args.push('--inserts'); // Use INSERT statements instead of COPY
            args.push('--column-inserts'); // Include column names in INSERTs
        }
    } else {
        // Standard format handling
        if (format) args.push('-F', format);
    }

    if (includeOwner === true) {
        args.push('--no-acl'); // keep ownership statements only? Navicat-like behavior varies.
        // Note: Navicat "Include Owner" toggles OWNER/ACL statements;
        // pg_dump by default includes ownership unless --no-owner is used.
        // To be closer to Navicat, omit --no-owner unless user disables it.
    } else if (includeOwner === false) {
        args.push('--no-owner');
    }

    if (onlySchema) args.push('--schema', onlySchema);
    if (onlyData === true) args.push('--data-only');
    if (excludeSchema) args.push('--exclude-schema', excludeSchema);

    if (format && (format === 'custom' || format === 'tar') && Number.isInteger(compressLevel)) {
        args.push('-Z', String(compressLevel));
    }

    if (extraArgs) {
        const split = extraArgs.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
        for (const s of split) args.push(s.replaceAll('"', ''));
    }

    args.push(db);
    return args;
}

export async function runPgDump({
    args,
    envPassword,
    outputPath,
    format,
    outputStyle = 'standard',
    connectionOptions = {}
}) {
    return new Promise((resolve, reject) => {
        // For plain format, we redirect stdout to a .sql file.
        // For custom/tar, use -f, but we kept outputPath for both cases by adding -f when not plain.
        // Here, ensure we pass -f for non-plain; for plain we capture stdout.
        const useStdout = format === 'plain' || outputStyle === 'navicat';

        const effectiveArgs = [...args];
        if (!useStdout) {
            // ensure -f outputPath is last
            effectiveArgs.splice(effectiveArgs.length - 1, 0, '-f', outputPath);
        }

        const child = spawn('pg_dump', effectiveArgs, {
            env: { ...process.env, PGPASSWORD: envPassword || '' }
        });

        if (useStdout) {
            const tempPath = outputStyle === 'navicat' ? `${outputPath}.tmp` : outputPath;
            const fileStream = fs.createWriteStream(tempPath, { flags: 'w' });
            child.stdout.pipe(fileStream);

            // If Navicat style, we'll post-process after completion
            child.on('close', (code) => {
                if (code === 0) {
                    if (outputStyle === 'navicat') {
                        // Post-process the temporary file to Navicat style
                        postProcessToNavicatStyle(tempPath, outputPath, connectionOptions)
                            .then(() => {
                                // Clean up temp file
                                fs.unlinkSync(tempPath);
                                resolve({ ok: true, outputPath, stderr: '' });
                            })
                            .catch(reject);
                    } else {
                        resolve({ ok: true, outputPath, stderr: '' });
                    }
                } else {
                    const errorMsg = stderr.trim() || `pg_dump exited with code ${code}`;
                    reject(new Error(`pg_dump failed: ${errorMsg}`));
                }
            });
        }

        let stderr = '';
        child.stderr.on('data', (d) => {
            stderr += d.toString();
        });

        if (!useStdout) {
            child.on('close', (code) => {
                if (code === 0) return resolve({ ok: true, outputPath, stderr });
                const errorMsg = stderr.trim() || `pg_dump exited with code ${code}`;
                reject(new Error(`pg_dump failed: ${errorMsg}`));
            });
        }
    });
}

export function extensionFor(format, outputStyle = 'standard') {
    // For Navicat style, always use .sql regardless of format
    if (outputStyle === 'navicat') {
        return '.sql';
    }

    switch (format) {
        case 'custom':
            return '.dump';
        case 'tar':
            return '.tar';
        case 'directory':
            return ''; // will be a folder
        default:
            return '.sql';
    }
}

export function ensureDir(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export function listBackups(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs
        .readdirSync(dir)
        .filter((n) => !n.startsWith('.'))
        .map((n) => ({
            name: n,
            path: path.join(dir, n),
            size: fs.statSync(path.join(dir, n)).size,
            mtime: fs.statSync(path.join(dir, n)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);
}
