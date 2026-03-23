-- This file includes SQL commands for the core schema.
-- This schema is used by services of the supabase-core package.

-- Ensure the schema exists
CREATE SCHEMA IF NOT EXISTS core;

-- Grant access privileges
GRANT USAGE ON SCHEMA core TO "anon";
GRANT USAGE ON SCHEMA core TO "authenticated";
GRANT USAGE ON SCHEMA core TO "service_role";

