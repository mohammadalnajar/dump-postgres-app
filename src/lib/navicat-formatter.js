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
    let dollarQuoteTag = '';
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Detect start of blocks to skip
        if (!skipBlock) {
            // Skip extension functions (those with $libdir)
            if (
                (trimmedLine.startsWith('CREATE FUNCTION') ||
                    trimmedLine.startsWith('CREATE OR REPLACE FUNCTION')) &&
                (trimmedLine.includes('$libdir/') || trimmedLine.includes('pgcrypto'))
            ) {
                skipBlock = true;
                blockType = 'extension_function';
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

        // Handle skipping logic
        if (skipBlock) {
            if (blockType === 'extension_function') {
                // Look for end of function (either ; followed by empty line, or ALTER FUNCTION)
                if (
                    trimmedLine.endsWith(';') &&
                    i + 1 < lines.length &&
                    lines[i + 1].trim() === ''
                ) {
                    skipBlock = false;
                    blockType = '';
                    continue;
                }
                if (trimmedLine.startsWith('ALTER FUNCTION')) {
                    skipBlock = false;
                    blockType = '';
                    continue;
                }
                continue;
            }

            if (blockType === 'function_comment') {
                // Skip until we find the actual function definition or something else
                if (
                    trimmedLine.startsWith('CREATE FUNCTION') ||
                    trimmedLine.startsWith('CREATE OR REPLACE FUNCTION')
                ) {
                    // Check if this is an extension function we should skip
                    if (trimmedLine.includes('$libdir/') || trimmedLine.includes('pgcrypto')) {
                        blockType = 'extension_function';
                        continue;
                    } else {
                        // This is a user function, stop skipping
                        skipBlock = false;
                        blockType = '';
                    }
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

function formatSequencesAndTables(content) {
    // Add proper Navicat-style comments for sequences and tables
    let formatted = content;

    // Format sequence creation
    formatted = formatted.replace(
        /CREATE SEQUENCE ([\w.]+)\s*\n((?:.*\n)*?)ALTER SEQUENCE/g,
        (match, sequenceName, sequenceBody) => {
            const cleanName = sequenceName.replace('public.', '');
            return `-- ----------------------------
-- Sequence structure for ${cleanName}
-- ----------------------------
DROP SEQUENCE IF EXISTS "${cleanName}";
CREATE SEQUENCE "${cleanName}" 
${sequenceBody.trim().replace(/^\s+/gm, '')}
ALTER SEQUENCE`;
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

function convertCopyToInserts(content) {
    // Convert COPY statements to INSERT statements with transaction blocks
    let formatted = content;

    // Pattern to match COPY statements and their data
    formatted = formatted.replace(
        /COPY ([\w.]+) \(([^)]+)\) FROM stdin;\n((?:.*\n)*?)\\\.\n/g,
        (match, tableName, columns, data) => {
            const cleanTableName = tableName.replace('public.', '');
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
                .map((line) => {
                    const values = line
                        .split('\t')
                        .map((val) => {
                            if (val === '\\N') return 'NULL';
                            if (val.match(/^\d+$/)) return val;
                            if (val.match(/^\d+\.\d+$/)) return val;
                            if (val === 't') return 'true';
                            if (val === 'f') return 'false';
                            // Escape single quotes and wrap in quotes
                            return `'${val.replace(/'/g, "''")}'`;
                        })
                        .join(', ');

                    const columnList = columnNames.map((col) => `"${col}"`).join(', ');
                    return `INSERT INTO "${cleanTableName}" (${columnList}) VALUES (${values});`;
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
