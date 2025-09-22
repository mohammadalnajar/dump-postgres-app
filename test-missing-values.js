import { formatToNavicatStyle } from './src/lib/navicat-formatter.js';

// Test sample with missing values (like the problematic case)
const testPgDumpContentWithMissingValues = `--
-- PostgreSQL database dump
--

COPY public.xyz_availability (id, avail_employee_id, avail_date, avail_start_time, avail_end_time, avail_created_at, avail_updated_at, avail_status, avail_note) FROM stdin;
1	1	2025-09-05	08:00:00	17:00:00	2025-09-05 19:37:24.646066	2025-09-05 19:37:24.646066	available	
2	2	2025-09-05	08:00:00	17:00:00	2025-09-05 19:37:24.646066	2025-09-05 19:37:24.646066	available	
3	3	2025-09-12	07:00:00	15:00:00	2025-09-12 19:37:24.646066	2025-09-12 19:37:24.646066	available
\\.
`;

console.log('Testing Navicat formatter with missing values...\n');

const formatted = formatToNavicatStyle(testPgDumpContentWithMissingValues, {
    host: 'localhost',
    port: 5432,
    db: 'testdb'
});

console.log('Formatted output:');
console.log('='.repeat(80));
console.log(formatted);
console.log('='.repeat(80));

// Check if all INSERT statements have the same number of columns and values
const lines = formatted.split('\n');
const insertLines = lines.filter((line) => line.trim().startsWith('INSERT INTO'));

console.log('\nAnalyzing INSERT statements:');
insertLines.forEach((line, index) => {
    const match = line.match(/INSERT INTO "([^"]+)" \(([^)]+)\) VALUES \(([^)]+)\)/);
    if (match) {
        const tableName = match[1];
        const columns = match[2].split(',').map((s) => s.trim());
        const values = match[3].split(',').map((s) => s.trim());

        console.log(`${index + 1}. Table: ${tableName}`);
        console.log(`   Columns: ${columns.length}, Values: ${values.length}`);

        if (columns.length !== values.length) {
            console.log(`   ❌ MISMATCH: ${columns.length} columns but ${values.length} values`);
        } else {
            console.log(`   ✅ OK: Columns and values match`);
        }
    }
});
