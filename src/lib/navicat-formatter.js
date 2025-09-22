import fs from 'node:fs';
import path from 'node:path';

/**
 * Post-process pg_dump output to make it look more like Navicat
 */
export function formatToNavicatStyle(sqlContent, options = {}) {
    const {
        sourceServer = 'PostgreSQL Server',
        sourceVersion = 'Unknown',
        sourceHost = options.host || 'localhost',
        sourcePort = options.port || 5432,
        sourceDatabase = options.db || 'database',
        targetVersion = 'PostgreSQL',
        fileEncoding = '65001'
    } = options;

    // Generate Navicat-style header
    const header = generateNavicatHeader({
        sourceServer,
        sourceVersion,
        sourceHost,
        sourcePort,
        sourceDatabase,
        targetVersion,
        fileEncoding
    });

    // Remove pg_dump specific headers and settings
    let processedContent = removePgDumpHeaders(sqlContent);

    // Format sequences and tables
    processedContent = formatSequencesAndTables(processedContent);

    // Convert COPY statements to INSERT statements with BEGIN/COMMIT blocks
    processedContent = convertCopyToInserts(processedContent);

    // Add proper sectioning comments
    processedContent = addNavicatSectionComments(processedContent);

    return header + '\n\n' + processedContent;
}

function generateNavicatHeader(options) {
    const now = new Date();
    const dateStr =
        now
            .toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            })
            .replace(/\//g, '/') +
        ' ' +
        now.toLocaleTimeString('en-GB');

    return `/*
 Navicat Premium Data Transfer

 Source Server         : ${options.sourceServer}
 Source Server Type    : PostgreSQL
 Source Server Version : ${options.sourceVersion}
 Source Host           : ${options.sourceHost}:${options.sourcePort}
 Source Catalog        : ${options.sourceDatabase}
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : ${options.targetVersion}
 File Encoding         : ${options.fileEncoding}

 Date: ${dateStr}
*/`;
}

function removePgDumpHeaders(content) {
    // Remove pg_dump standard headers and settings
    const linesToRemove = [
        /^--$/,
        /^-- PostgreSQL database dump$/,
        /^--$/,
        /^-- Dumped from database version/,
        /^-- Dumped by pg_dump version/,
        /^SET statement_timeout/,
        /^SET lock_timeout/,
        /^SET idle_in_transaction_session_timeout/,
        /^SET client_encoding/,
        /^SET standard_conforming_strings/,
        /^SELECT pg_catalog\.set_config/,
        /^SET check_function_bodies/,
        /^SET xmloption/,
        /^SET client_min_messages/,
        /^SET row_security/,
        /^SET default_table_access_method/,
        /^COMMENT ON EXTENSION/,
        /^CREATE EXTENSION/,
        /^ALTER FUNCTION .* OWNER TO/,
        /^ALTER TABLE .* OWNER TO/,
        /^ALTER SEQUENCE .* OWNED BY/,
        /^ALTER SEQUENCE .* OWNER TO/
    ];

    const lines = content.split('\n');
    const filteredLines = [];
    let skipBlock = false;
    let blockType = '';
    let functionBuffer = [];
    let collectingFunction = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Detect start of blocks to skip
        if (!skipBlock && !collectingFunction) {
            // Start collecting function definition when we see CREATE FUNCTION
            if (
                trimmedLine.startsWith('CREATE FUNCTION') ||
                trimmedLine.startsWith('CREATE OR REPLACE FUNCTION')
            ) {
                collectingFunction = true;
                functionBuffer = [line];
                continue;
            }

            // Skip postgres system function comments
            if (
                trimmedLine.startsWith('-- Name:') &&
                trimmedLine.includes('Type: FUNCTION') &&
                trimmedLine.includes('Owner: postgres')
            ) {
                skipBlock = true;
                blockType = 'function_comment';
                continue;
            }
        }

        // Collect function definition until we find the complete statement
        if (collectingFunction) {
            functionBuffer.push(line);

            // Check if function definition is complete (ends with ;)
            if (trimmedLine.endsWith(';')) {
                const fullFunction = functionBuffer.join('\n');

                // Check if this is an extension function we should skip
                if (
                    fullFunction.includes('$libdir/') ||
                    fullFunction.includes('pgcrypto') ||
                    fullFunction.includes('LANGUAGE c')
                ) {
                    // Skip this extension function
                    collectingFunction = false;
                    functionBuffer = [];
                    continue;
                } else {
                    // This is a user function, format it with Navicat style
                    const formattedFunction = formatUserFunction(fullFunction);
                    filteredLines.push(...formattedFunction.split('\n'));
                    collectingFunction = false;
                    functionBuffer = [];
                    continue;
                }
            }
            // Continue collecting lines for this function
            continue;
        }

        // Handle skipping logic for non-function blocks
        if (skipBlock) {
            if (blockType === 'function_comment') {
                // Skip until we find the actual function definition or something else
                if (
                    trimmedLine.startsWith('CREATE FUNCTION') ||
                    trimmedLine.startsWith('CREATE OR REPLACE FUNCTION')
                ) {
                    // Start collecting this function to check if it's an extension function
                    collectingFunction = true;
                    functionBuffer = [line];
                    skipBlock = false;
                    blockType = '';
                    continue;
                } else if (
                    trimmedLine.startsWith('CREATE ') ||
                    trimmedLine.startsWith('-- ') ||
                    trimmedLine === ''
                ) {
                    // Continue skipping
                    continue;
                } else {
                    // This might be a stray function body, skip it
                    continue;
                }
            }
        }

        // Check if line should be removed based on patterns
        const shouldRemove = linesToRemove.some((pattern) => pattern.test(trimmedLine));
        if (!shouldRemove && !skipBlock) {
            filteredLines.push(line);
        }
    }

    return filteredLines.join('\n');
}

function formatUserFunction(functionContent) {
    // Extract function name and arguments from the CREATE FUNCTION statement
    const lines = functionContent.split('\n');
    const createLine = lines.find(
        (line) =>
            line.trim().startsWith('CREATE FUNCTION') ||
            line.trim().startsWith('CREATE OR REPLACE FUNCTION')
    );

    if (!createLine) return functionContent;

    // Extract function signature: function_name(args)
    const match = createLine.match(
        /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([\w.]+)\s*\(([^)]*)\)/i
    );
    if (!match) return functionContent;

    const fullFunctionName = match[1];
    const functionArgs = match[2].trim();
    const cleanFunctionName = fullFunctionName.replace('public.', '');

    // Build the argument signature for DROP statement
    let dropSignature = '';
    if (functionArgs) {
        // For DROP FUNCTION, we need just the parameter types, not names
        const argTypes = functionArgs
            .split(',')
            .map((arg) => {
                const trimmed = arg.trim();
                // Extract just the type part (after the parameter name)
                const typeMatch = trimmed.match(/\w+\s+(.+)/);
                return typeMatch ? typeMatch[1].trim() : trimmed;
            })
            .join(', ');
        dropSignature = `(${argTypes})`;
    } else {
        dropSignature = '()';
    }

    // Format the function with Navicat style
    const formattedFunction = functionContent
        .replace(/CREATE\s+FUNCTION/i, 'CREATE OR REPLACE FUNCTION')
        .replace(/CREATE\s+OR\s+REPLACE\s+FUNCTION/i, 'CREATE OR REPLACE FUNCTION');

    return `-- ----------------------------
-- Function structure for ${cleanFunctionName}
-- ----------------------------
DROP FUNCTION IF EXISTS "${cleanFunctionName}"${dropSignature};
${formattedFunction}`;
}

function formatSequencesAndTables(content) {
    // Add proper Navicat-style comments for sequences and tables
    let formatted = content;

    // Format sequence creation - handle sequences with or without following ALTER statements
    formatted = formatted.replace(
        /CREATE SEQUENCE ([\w.]+)([^;]*);/g,
        (match, sequenceName, sequenceBody) => {
            const cleanName = sequenceName.replace('public.', '');
            const bodyLines = sequenceBody.trim().split('\n');
            const formattedBody = bodyLines
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
                .join('\n');

            return `-- ----------------------------
-- Sequence structure for ${cleanName}
-- ----------------------------
DROP SEQUENCE IF EXISTS "${cleanName}";
CREATE SEQUENCE "${cleanName}"${formattedBody ? '\n' + formattedBody : ''};`;
        }
    );

    // Format table creation
    formatted = formatted.replace(
        /CREATE TABLE ([\w.]+) \(((?:[^;]|\n)*?)\);/g,
        (match, tableName, tableBody) => {
            const cleanName = tableName.replace('public.', '');
            return `-- ----------------------------
-- Table structure for ${cleanName}
-- ----------------------------
DROP TABLE IF EXISTS "${cleanName}";
CREATE TABLE "${cleanName}" (
${tableBody.trim()}
)
;`;
        }
    );

    return formatted;
}

/**
 * Properly escape a value for PostgreSQL INSERT statements
 * Handles JSON strings, regular strings, and maintains proper escaping
 */
function escapePostgreSQLValue(val) {
    if (val === undefined || val === '\\N') return 'NULL';
    if (val.match(/^\d+$/)) return val; // Integer
    if (val.match(/^\d+\.\d+$/)) return val; // Decimal
    if (val === 't') return 'true'; // Boolean true
    if (val === 'f') return 'false'; // Boolean false

    // For string values, we need to handle PostgreSQL's COPY format escape sequences
    // and convert them to proper SQL string literals
    let escaped = val;

    // Check if this is likely a JSON string before processing escape sequences
    const isJson = isLikelyJsonString(escaped);

    if (isJson) {
        // For JSON strings, we need special handling to preserve JSON validity
        escaped = escapeJsonForPostgreSQL(escaped);
    } else {
        // For non-JSON strings, handle normal escape sequences
        // Handle PostgreSQL COPY format escape sequences
        escaped = escaped.replace(/\\t/g, '\t');
        escaped = escaped.replace(/\\n/g, '\n');
        escaped = escaped.replace(/\\r/g, '\r');

        // Handle escaped backslashes - PostgreSQL COPY format uses \\ for literal \
        escaped = escaped.replace(/\\\\/g, '\x00TEMP_BACKSLASH\x00'); // Temporary placeholder

        // Handle other escapes
        escaped = escaped.replace(/\\(.)/g, '$1'); // Remove escape character for other chars

        // Restore the actual backslashes
        escaped = escaped.replace(/\x00TEMP_BACKSLASH\x00/g, '\\');

        // Escape for SQL string literal
        escaped = escaped.replace(/'/g, "''");
        escaped = escaped.replace(/\\/g, '\\\\');
    }

    return `'${escaped}'`;
}

/**
 * Special escaping function for JSON strings to ensure PostgreSQL compatibility
 */
function escapeJsonForPostgreSQL(jsonStr) {
    let escaped = jsonStr;

    try {
        // Handle PostgreSQL COPY format escape sequences while preserving JSON structure
        // First, handle escaped backslashes
        escaped = escaped.replace(/\\\\/g, '\x00TEMP_BACKSLASH\x00');

        // Handle escaped quotes within JSON strings
        escaped = escaped.replace(/\\"/g, '\x00TEMP_QUOTE\x00');

        // Handle escaped tabs, but preserve them as escaped for JSON
        escaped = escaped.replace(/\\t/g, '\x00TEMP_TAB\x00');

        // Handle escaped carriage returns, but preserve them as escaped for JSON
        escaped = escaped.replace(/\\r/g, '\x00TEMP_CR\x00');

        // Critical: Handle escaped newlines properly for JSON
        // In COPY format, \\n represents a literal \n in the JSON
        // We need to preserve this as \\n for valid JSON
        escaped = escaped.replace(/\\n/g, '\x00TEMP_NEWLINE\x00');

        // Handle other single-character escapes
        escaped = escaped.replace(/\\(.)/g, '$1');

        // Restore the preserved sequences with proper JSON escaping
        escaped = escaped.replace(/\x00TEMP_BACKSLASH\x00/g, '\\\\');
        escaped = escaped.replace(/\x00TEMP_QUOTE\x00/g, '\\"');
        escaped = escaped.replace(/\x00TEMP_TAB\x00/g, '\\t');
        escaped = escaped.replace(/\x00TEMP_CR\x00/g, '\\r');
        escaped = escaped.replace(/\x00TEMP_NEWLINE\x00/g, '\\n');

        // Now escape single quotes for SQL string literal
        escaped = escaped.replace(/'/g, "''");

        // Double backslashes for SQL string literal containing JSON
        escaped = escaped.replace(/\\/g, '\\\\');

        // Validate that the resulting JSON is well-formed (if it looks like complete JSON)
        if (escaped.trim().startsWith('{') && escaped.trim().endsWith('}')) {
            try {
                // Create a test version to validate JSON structure
                const testJson = escaped.replace(/''/g, "'").replace(/\\\\/g, '\\');
                JSON.parse(testJson);
            } catch (parseError) {
                console.warn('Warning: Generated JSON may not be valid:', parseError.message);
                console.warn('Original:', jsonStr);
                console.warn('Escaped:', escaped);
            }
        }

        return escaped;
    } catch (error) {
        console.warn('Error in escapeJsonForPostgreSQL:', error.message);
        console.warn('Input:', jsonStr);
        // Fallback to basic escaping
        return jsonStr.replace(/'/g, "''").replace(/\\/g, '\\\\');
    }
}

/**
 * Detect if a string is likely a JSON string
 */
function isLikelyJsonString(str) {
    if (!str || typeof str !== 'string') return false;

    const trimmed = str.trim();

    // Empty string is not JSON
    if (!trimmed) return false;

    // Check for JSON object, array patterns
    if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
        return true;
    }

    // Check for strings that contain JSON-like patterns
    // This covers partially escaped JSON or malformed JSON that still needs careful handling
    if (trimmed.includes('"') && trimmed.includes(':')) {
        // Look for key-value patterns typical of JSON objects
        const hasJsonPattern = /"\s*:\s*/.test(trimmed);
        return hasJsonPattern;
    }

    // Check for simple JSON string values (quoted strings)
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.includes('\\')) {
        return true;
    }

    return false;
}

function convertCopyToInserts(content) {
    // Convert COPY statements to INSERT statements with transaction blocks
    let formatted = content;

    // Pattern to match COPY statements and their data
    // Updated to handle quoted table names and be more flexible with the ending
    formatted = formatted.replace(
        /COPY ((?:"[^"]+"|[\w.]+)) \(([^)]+)\) FROM stdin;\n((?:.*\n)*?)\\\.\n?/g,
        (match, tableName, columns, data) => {
            // Clean table name - remove quotes and schema prefix
            const cleanTableName = tableName.replace(/"/g, '').replace('public.', '');

            // Parse column names - handle quoted column names
            const columnNames = columns.split(',').map((col) => col.trim().replace(/"/g, ''));

            const dataLines = data
                .trim()
                .split('\n')
                .filter((line) => line.trim() !== '');

            if (dataLines.length === 0) {
                return `-- ----------------------------
-- Records of ${cleanTableName}
-- ----------------------------
BEGIN;
COMMIT;\n\n`;
            }

            const insertStatements = dataLines
                .map((line, lineIndex) => {
                    try {
                        // Split by tabs, but we need to be careful about the number of expected columns
                        const rawValues = parseTabSeparatedLine(line, columnNames.length);

                        // Ensure we have the same number of values as columns
                        const values = Array(columnNames.length)
                            .fill(null)
                            .map((_, index) => {
                                const val = rawValues[index];
                                try {
                                    return escapePostgreSQLValue(val);
                                } catch (escapeError) {
                                    console.warn(
                                        `Warning: Error escaping value at column ${index} (${
                                            columnNames[index]
                                        }) on line ${lineIndex + 1} of table ${cleanTableName}:`,
                                        escapeError.message
                                    );
                                    console.warn(`Problematic value:`, val);
                                    // Return a safe fallback
                                    return 'NULL';
                                }
                            })
                            .join(', ');

                        const columnList = columnNames.map((col) => `"${col}"`).join(', ');
                        return `INSERT INTO "${cleanTableName}" (${columnList}) VALUES (${values});`;
                    } catch (lineError) {
                        console.warn(
                            `Warning: Error processing line ${
                                lineIndex + 1
                            } of table ${cleanTableName}:`,
                            lineError.message
                        );
                        console.warn(`Problematic line:`, line);
                        // Return a comment instead of breaking the entire process
                        return `-- ERROR: Could not process line ${lineIndex + 1}: ${
                            lineError.message
                        }`;
                    }
                })
                .join('\n');

            return `-- ----------------------------
-- Records of ${cleanTableName}
-- ----------------------------
BEGIN;
${insertStatements}
COMMIT;\n\n`;
        }
    );

    return formatted;
}

/**
 * Parse a tab-separated line while being careful about the expected number of columns
 * This handles cases where tab characters might appear within the data itself
 */
function parseTabSeparatedLine(line, expectedColumns) {
    const parts = line.split('\t');

    // If we have exactly the expected number of columns, return as-is
    if (parts.length === expectedColumns) {
        return parts;
    }

    // If we have more parts than expected, we need to join some back together
    // This typically happens when tab characters exist within the data
    if (parts.length > expectedColumns) {
        const result = [];

        // Take the first (expectedColumns - 1) parts as-is
        for (let i = 0; i < expectedColumns - 1; i++) {
            result.push(parts[i]);
        }

        // Join the remaining parts for the last column
        result.push(parts.slice(expectedColumns - 1).join('\t'));

        return result;
    }

    // If we have fewer parts than expected, pad with undefined
    const result = [...parts];
    while (result.length < expectedColumns) {
        result.push(undefined);
    }

    return result;
}

function addNavicatSectionComments(content) {
    // This function can be extended to add more Navicat-specific formatting
    // For now, it ensures proper spacing and organization
    return content.replace(/\n{3,}/g, '\n\n');
}

/**
 * Create a post-processor that converts pg_dump output to Navicat style
 */
export async function postProcessToNavicatStyle(inputPath, outputPath, options = {}) {
    try {
        const content = fs.readFileSync(inputPath, 'utf8');
        const formatted = formatToNavicatStyle(content, options);
        fs.writeFileSync(outputPath, formatted, 'utf8');
        return { success: true, outputPath };
    } catch (error) {
        throw new Error(`Failed to post-process to Navicat style: ${error.message}`);
    }
}
