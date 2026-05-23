import type * as Supabase from '@supabase/postgrest-js';

import type { ClientServerOptions, ColumnName, GenericDatabase, Insert, Relation, RelationName as BaseRelationName, Relationships, RelationType as BaseRelationType, Row, Schema, SchemaName as BaseSchemaName, Update } from '@/database';
import type { MaybeArray, OmitFrom } from '@/utils';
import { coerceArray } from '@/utils';

import { PostgrestFilterBuilder } from './filter-builder';


export type SelectQuery<
    Database extends GenericDatabase,
    SchemaName extends BaseSchemaName<Database>,
    RelationType extends BaseRelationType,
    RelationName extends BaseRelationName<Database, SchemaName, RelationType>,
> = (keyof Row<Database, SchemaName, RelationType, RelationName>)[] | '*' | (string & {});

export type SelectResult<
    Database extends GenericDatabase,
    SchemaName extends BaseSchemaName<Database>,
    RelationType extends BaseRelationType,
    RelationName extends BaseRelationName<Database, SchemaName, RelationType>,
    Query extends SelectQuery<Database, SchemaName, RelationType, RelationName>,
> = Query extends '*'
    ? Row<Database, SchemaName, RelationType, RelationName>
    : Query extends string
        ? Supabase.UnstableGetResult<
            Schema<Database, SchemaName>,
            Row<Database, SchemaName, RelationType, RelationName>,
            RelationName,
            Relationships<Database, SchemaName, RelationType, RelationName>,
            Query,
            ClientServerOptions
        >
        : Pick<Row<Database, SchemaName, RelationType, RelationName>, Query[number]>;

/**
 * The method to use to count rows returned by the function.
 * - `exact`: Counts the rows exactly.
 * - `planned`: Uses statistics to get a fairly accurate and fast count.
 * - `estimated`: Uses an estimated count which is the exact count up until a threshold and the planned count when that threshold is surpassed.
 *
 * @see https://docs.postgrest.org/en/v12/references/api/pagination_count.html#counting
 */
export type CountMethod = 'exact' | 'planned' | 'estimated';

/**
 * Options for selecting rows from a database table.
 */
export interface SelectOptions {

    /**
     * When set to `true`, `data` will not be returned, useful if you only need the count.
     */
    head?: boolean;

    /**
     * The method to use to count rows returned by the function.
     * If not set, no count will be performed.
     */
    count?: CountMethod;
}

/**
 * Options for inserting rows into a database table.
 */
export interface InsertOptions {

    /**
     * The method to use to count rows returned by the function.
     * If not set, no count will be performed.
     */
    count?: CountMethod;

    /**
     * Make missing fields default to `null`.
     * Otherwise, use the default value for the column. Only applies for bulk
     * inserts.
     * @default true
     */
    defaultToNull?: boolean;
}

/**
 * Options for upserting data into a database.
 * Upserting means inserting a new row or updating an existing row if it already exists.
 */
export interface UpsertOptions<
    Database extends GenericDatabase,
    SchemaName extends BaseSchemaName<Database> = BaseSchemaName<Database>,
    RelationType extends BaseRelationType = BaseRelationType,
    RelationName extends BaseRelationName<Database, SchemaName, RelationType> = BaseRelationName<Database, SchemaName, RelationType>,
> {

    /**
     * Comma-separated UNIQUE column(s) to use for conflict resolution.
     * This column is used to determine if a row already exists in the database.
     * If a row with the same value in this column exists, it will be updated instead of inserted.
     * If not specified, uses the primary key of the relation.
     */
    onConflict?: ColumnName<Database, SchemaName, RelationType, RelationName>[] | string;

    /**
     * If `true`, duplicate rows are ignored. If
     * `false`, duplicate rows are merged with existing rows.
     * @default false
     */
    ignoreDuplicates?: boolean;

    /**
     * Count algorithm to use to count upserted rows.
     */
    count?: CountMethod;

    /**
     * Make missing fields default to `null`.
     * Otherwise, use the default value for the column. This only applies when
     * inserting new rows, not when merging with existing rows under
     * `ignoreDuplicates: false`. This also only applies when doing bulk upserts.
     * @default true
     */
    defaultToNull?: boolean;
}

/**
 * Options for updating rows in a database table.
 */
export interface UpdateOptions {

    /**
     * The method to use to count rows returned by the function.
     * If not set, no count will be performed.
     */
    count?: CountMethod;
}


export class PostgrestQueryBuilder<
    Database extends GenericDatabase<SchemaName>,
    ClientOptions extends ClientServerOptions,
    SchemaName extends BaseSchemaName<Database>,
    RelationType extends BaseRelationType = BaseRelationType,
    RelationName extends BaseRelationName<Database, SchemaName, RelationType> = BaseRelationName<Database, SchemaName, RelationType>,
> {

    protected readonly builder: Supabase.PostgrestQueryBuilder<
        ClientOptions,
        Schema<Database, SchemaName>,
        Relation<Database, SchemaName, RelationType, RelationName>,
        RelationName,
        Relationships<Database, SchemaName, RelationType, RelationName>
    >;

    constructor(
        builder: Supabase.PostgrestQueryBuilder<
            ClientOptions,
            Schema<Database, SchemaName>,
            Relation<Database, SchemaName, RelationType, RelationName>,
            RelationName,
            Relationships<Database, SchemaName, RelationType, RelationName>
        >,
    ) {
        this.builder = builder;
    }

    select<
        Query extends SelectQuery<Database, SchemaName, RelationType, RelationName> = '*',
        ResultOne = SelectResult<Database, SchemaName, RelationType, RelationName, Query>,
    >(
        columns: Query = '*' as Query,
        options?: SelectOptions,
    ): PostgrestFilterBuilder<
        ClientOptions,
        Schema<Database, SchemaName>,
        Row<Database, SchemaName, RelationType, RelationName>,
        ResultOne[],
        RelationName,
        Relationships<Database, SchemaName, RelationType, RelationName>,
        'GET'
    > {
        const builder = this.builder.select<
            string,
            ResultOne
        >(
            coerceArray(columns).join(','),
            options,
        );
        return new PostgrestFilterBuilder(builder);
    }

    /**
     * Counts the number of rows in the relation.
     * Does not select any columns, only counts the rows.
     *
     * @param method The counting method to use, defaults to 'exact'.
     * @returns The PostgREST filter builder with counting applied and filter extension enabled.
     */
    count(method: CountMethod = 'exact'): PostgrestFilterBuilder<
        ClientOptions,
        Schema<Database, SchemaName>,
        Row<Database, SchemaName, RelationType, RelationName>,
        Row<Database, SchemaName, RelationType, RelationName>[],
        RelationName,
        Relationships<Database, SchemaName, RelationType, RelationName>,
        'GET'
    > {
        const builder = this.select('*', { count: method, head: true });
        return new PostgrestFilterBuilder(builder);
    }

    insert(
        value: Insert<Database, SchemaName, RelationType, RelationName>,
        options?: OmitFrom<InsertOptions, 'defaultToNull'>,
    ): PostgrestFilterBuilder<
        ClientOptions,
        Schema<Database, SchemaName>,
        Row<Database, SchemaName, RelationType, RelationName>,
        null,
        RelationName,
        Relationships<Database, SchemaName, RelationType, RelationName>,
        'POST'
    >;
    insert(
        values: Insert<Database, SchemaName, RelationType, RelationName>[],
        options?: InsertOptions,
    ): PostgrestFilterBuilder<
        ClientOptions,
        Schema<Database, SchemaName>,
        Row<Database, SchemaName, RelationType, RelationName>,
        null,
        RelationName,
        Relationships<Database, SchemaName, RelationType, RelationName>,
        'POST'
    >;
    insert(
        values: MaybeArray<Insert<Database, SchemaName, RelationType, RelationName>>,
        options?: InsertOptions,
    ): PostgrestFilterBuilder<
        ClientOptions,
        Schema<Database, SchemaName>,
        Row<Database, SchemaName, RelationType, RelationName>,
        null,
        RelationName,
        Relationships<Database, SchemaName, RelationType, RelationName>,
        'POST'
    > {
        const builder = this.builder.insert<
            Insert<Database, SchemaName, RelationType, RelationName>
        >(values as any, options);
        return new PostgrestFilterBuilder(builder);
    }

    upsert(
        value: Insert<Database, SchemaName, RelationType, RelationName>,
        options?: OmitFrom<UpsertOptions<Database, SchemaName, RelationType, RelationName>, 'defaultToNull'>,
    ): PostgrestFilterBuilder<
        ClientOptions,
        Schema<Database, SchemaName>,
        Row<Database, SchemaName, RelationType, RelationName>,
        null,
        RelationName,
        Relationships<Database, SchemaName, RelationType, RelationName>,
        'POST'
    >;
    upsert(
        values: Insert<Database, SchemaName, RelationType, RelationName>[],
        options?: UpsertOptions<Database, SchemaName, RelationType, RelationName>,
    ): PostgrestFilterBuilder<
        ClientOptions,
        Schema<Database, SchemaName>,
        Row<Database, SchemaName, RelationType, RelationName>,
        null,
        RelationName,
        Relationships<Database, SchemaName, RelationType, RelationName>,
        'POST'
    >;
    upsert(
        values: MaybeArray<Insert<Database, SchemaName, RelationType, RelationName>>,
        { onConflict, ...options }: UpsertOptions<Database, SchemaName, RelationType, RelationName> = {},
    ): PostgrestFilterBuilder<
        ClientOptions,
        Schema<Database, SchemaName>,
        Row<Database, SchemaName, RelationType, RelationName>,
        null,
        RelationName,
        Relationships<Database, SchemaName, RelationType, RelationName>,
        'POST'
    > {
        const builder = this.builder.upsert<
            Insert<Database, SchemaName, RelationType, RelationName>
        >(values as any, {
            onConflict: coerceArray(onConflict).join(','),
            ...options,
        });
        return new PostgrestFilterBuilder(builder);
    }

    update(
        value: Update<Database, SchemaName, RelationType, RelationName>,
        options?: UpdateOptions,
    ): PostgrestFilterBuilder<
        ClientOptions,
        Schema<Database, SchemaName>,
        Row<Database, SchemaName, RelationType, RelationName>,
        null,
        RelationName,
        Relationships<Database, SchemaName, RelationType, RelationName>,
        'PATCH'
    > {
        const builder = this.builder.update(value as any, options);
        return new PostgrestFilterBuilder(builder);
    }

    delete(): PostgrestFilterBuilder<
        ClientOptions,
        Schema<Database, SchemaName>,
        Row<Database, SchemaName, RelationType, RelationName>,
        null,
        RelationName,
        Relationships<Database, SchemaName, RelationType, RelationName>,
        'DELETE'
    > {
        const builder = this.builder.delete();
        return new PostgrestFilterBuilder(builder);
    }
}
