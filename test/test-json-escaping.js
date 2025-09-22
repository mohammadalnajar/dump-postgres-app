#!/usr/bin/env node

/**
 * Unit tests for JSON escaping in Navicat formatter
 *
 * This test file ensures that JSON strings with newlines and other special characters
 * are properly escaped for PostgreSQL INSERT statements.
 */

import { formatToNavicatStyle } from '../src/lib/navicat-formatter.js';

// Test cases for JSON escaping issues
const testCases = [
    {
        name: 'JSON with newlines (original issue)',
        input: `COPY "test_table" ("id", "json_data") FROM stdin;
1	{"note": "Line 1\\nLine 2", "type": "test"}
\\.`,
        expectedPatterns: [
            /INSERT INTO "test_table"/,
            /Line 1\\\\nLine 2/ // Should be double-escaped for SQL
        ]
    },
    {
        name: 'JSON with tabs and quotes',
        input: `COPY "test_table" ("id", "json_data") FROM stdin;
2	{"note": "Tab\\there", "quote": "He said \\"hello\\""}
\\.`,
        expectedPatterns: [/INSERT INTO "test_table"/, /Tab\\\\there/, /He said \\\\"hello\\\\"/]
    },
    {
        name: 'Complex audit table case (user issue)',
        input: `COPY "xyz_audit_row_changes" ("id", "new_row") FROM stdin;
44	{"tsk_note": "- 15 min van tevoren aanwezig\\n- actieve houding", "tsk_type": "Beveiliging"}
\\.`,
        expectedPatterns: [
            /INSERT INTO "xyz_audit_row_changes"/,
            /- 15 min van tevoren aanwezig\\\\n- actieve houding/
        ]
    }
];

console.log('🧪 Running JSON escaping unit tests...\n');

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);

    try {
        const result = formatToNavicatStyle(testCase.input);

        let testPassed = true;
        for (const pattern of testCase.expectedPatterns) {
            if (!pattern.test(result)) {
                console.log(`  ❌ Pattern failed: ${pattern.source}`);
                testPassed = false;
            }
        }

        if (testPassed) {
            console.log(`  ✅ PASSED`);
            passed++;
        } else {
            console.log(`  ❌ FAILED`);
            console.log(
                `  Generated result preview: ${result.substring(
                    result.indexOf('INSERT'),
                    result.indexOf('INSERT') + 200
                )}...`
            );
            failed++;
        }

        // Also test that the generated JSON is valid
        const insertMatch = result.match(/INSERT INTO[^;]+;/);
        if (insertMatch) {
            const jsonMatch = insertMatch[0].match(/'(\{[^']*\})'/);
            if (jsonMatch) {
                try {
                    const unescapedJson = jsonMatch[1].replace(/''/g, "'").replace(/\\\\/g, '\\');
                    JSON.parse(unescapedJson);
                    console.log(`  ✅ JSON validation passed`);
                } catch (parseError) {
                    console.log(`  ❌ JSON validation failed: ${parseError.message}`);
                    failed++;
                    passed--;
                }
            }
        }
    } catch (error) {
        console.log(`  ❌ ERROR: ${error.message}`);
        failed++;
    }

    console.log('');
}

console.log('='.repeat(50));
console.log(`Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
    console.log('🎉 All tests passed! JSON escaping is working correctly.');
} else {
    console.log('❌ Some tests failed. Please check the JSON escaping implementation.');
    process.exit(1);
}
