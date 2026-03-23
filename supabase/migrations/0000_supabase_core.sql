create extension if not exists "pg_trgm" with schema "extensions";

create schema if not exists "core";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION core.fuzzy_search(relation text, column_name text, search_term text, schema_name text DEFAULT 'public'::text, min_similarity double precision DEFAULT 0, limit_results integer DEFAULT 64)
 RETURNS SETOF json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
    query text;
BEGIN
    IF search_term = '' THEN
        query := format(
            $q$
            SELECT row_to_json(t) AS result
            FROM (
                SELECT *
                FROM %I.%I
                LIMIT %s
            ) t
            $q$,
            schema_name,
            relation,
            limit_results
        );
    ELSE
        query := format(
            $q$
            SELECT row_to_json(t) AS result
            FROM (
                SELECT *
                FROM (
                    SELECT *, extensions.similarity(lower(%I), lower(%L)) AS score
                    FROM %I.%I
                ) s
                WHERE score > %s
                ORDER BY score DESC
                LIMIT %s
            ) t
            $q$,
            column_name,
            search_term,
            schema_name,
            relation,
            min_similarity,
            limit_results
        );
    END IF;
    RETURN QUERY EXECUTE query;
END;
$function$
;


