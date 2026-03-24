import type { CoreDatabase } from './database';
import type { ColumnName, RelationName, RelationType, SchemaName } from './relation';
import type { CountMethod } from './select';

/**
 * Options for fuzzy searching within a database table or view.
 */
export interface FuzzySearchParams<
    Database extends CoreDatabase,
    Schema extends SchemaName<Database> = SchemaName<Database>,
    Type extends RelationType = RelationType,
    Relation extends RelationName<Database, Schema, Type> = RelationName<Database, Schema, Type>,
> {
    /**
     * The name of the column to search in.
     */
    column: ColumnName<Database, Schema, Type, Relation>;

    /**
     * The search term to use for the fuzzy search.
     * This is the term that will be matched against the specified column.
     * If empty or undefined, the function will return all rows sorted by the search column.
     * @default ''
     */
    searchTerm?: string;

    /**
     * The minimum similarity score for results to be included.
     * This is a number between 0 and 1, where 1 means an exact match.
     * @default 0
     */
    minSimilarity?: number;

    /**
     * The maximum number of results to return.
     * @default 64
     */
    limit?: number;
}

/**
 * Options for upserting data into a database.
 * Upserting means inserting a new row or updating an existing row if it already exists.
 */
export interface UpsertOptions<
    Database extends CoreDatabase,
    Schema extends SchemaName<Database> = SchemaName<Database>,
    Type extends RelationType = RelationType,
    Relation extends RelationName<Database, Schema, Type> = RelationName<Database, Schema, Type>,
> {
    /**
     * The name of the columns to use for conflict resolution.
     * This column is used to determine if a row already exists in the database.
     * If a row with the same value in this column exists, it will be updated instead of inserted.
     * If not specified, uses the primary key of the relation.
     */
    onConflict?: ColumnName<Database, Schema, Type, Relation>[];

    /**
     * If `true`, duplicate rows are ignored. If
     * `false`, duplicate rows are merged with existing rows.
     */
    ignoreDuplicates?: boolean;

    /**
     * Count algorithm to use to count upserted rows.
     */
    countMethod?: CountMethod;
}
