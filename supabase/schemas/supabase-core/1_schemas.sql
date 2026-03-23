-- This file includes SQL commands for the supabase_core schema.
-- This schema is used by services of the supabase-core package.

-- Ensure the schema exists
CREATE SCHEMA IF NOT EXISTS supabase_core;

-- Grant access privileges
GRANT USAGE ON SCHEMA supabase_core TO "anon";
GRANT USAGE ON SCHEMA supabase_core TO "authenticated";
GRANT USAGE ON SCHEMA supabase_core TO "service_role";

