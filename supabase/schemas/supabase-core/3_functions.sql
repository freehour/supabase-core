-- Function to perform a fuzzy search on a specified table and column.
-- It returns records where the similarity score exceeds a specified threshold (optional).
-- The results are ordered by similarity score in descending order.
CREATE OR REPLACE FUNCTION supabase_core.fuzzy_search(
    relation text, -- The name of the table or view to search
    column_name text,
    search_term text,
    schema_name text DEFAULT 'public',
    min_similarity float DEFAULT 0,
    limit_results int DEFAULT 64
)
RETURNS SETOF json
SET search_path = ''
AS $$
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
$$ LANGUAGE plpgsql STABLE;
