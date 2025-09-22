import { formatToNavicatStyle } from './src/lib/navicat-formatter.js';

// Test sample PostgreSQL dump content
const testPgDumpContent = `--
-- PostgreSQL database dump
--

-- Dumped from database version 15.1
-- Dumped by pg_dump version 15.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';

--
-- Name: test_trigger_function(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.test_trigger_function() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status != OLD.status THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$;

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;

CREATE TABLE public.users (
    id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    name character varying(255),
    email character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

COPY public.users (id, name, email, created_at) FROM stdin;
1	John Doe	john@example.com	2025-09-22 08:00:00+00
2	Jane Smith	jane@example.com	2025-09-22 09:00:00+00
\\.
`;

console.log('Testing Navicat formatter...\n');

const formatted = formatToNavicatStyle(testPgDumpContent, {
    host: 'localhost',
    port: 5432,
    db: 'testdb'
});

console.log('Formatted output:');
console.log('='.repeat(50));
console.log(formatted);
console.log('='.repeat(50));

// Check if there are orphaned BEGIN statements (BEGIN without CREATE FUNCTION)
const lines = formatted.split('\n');
let hasOrphanedBegin = false;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === 'BEGIN') {
        // Check if this BEGIN is part of a function (should have CREATE FUNCTION before it)
        let foundFunction = false;
        for (let j = i - 1; j >= 0 && j >= i - 20; j--) {
            if (
                lines[j].includes('CREATE FUNCTION') ||
                lines[j].includes('CREATE OR REPLACE FUNCTION')
            ) {
                foundFunction = true;
                break;
            }
        }
        if (!foundFunction) {
            hasOrphanedBegin = true;
            break;
        }
    }
}

if (hasOrphanedBegin) {
    console.log('❌ ERROR: Found orphaned BEGIN statement - formatter needs more work');
} else {
    console.log('✅ SUCCESS: No orphaned BEGIN statements found');
}

// Check if function is properly formatted
if (
    formatted.includes('CREATE FUNCTION') &&
    formatted.includes('BEGIN') &&
    formatted.includes('END;')
) {
    console.log('✅ SUCCESS: Function properly preserved');
} else {
    console.log('❌ WARNING: Function may not be properly preserved');
}
