import { assert } from '@freehour/assert';
import * as Supabase from '@supabase/postgrest-js';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';

import type { Args as BaseArgs, ClientServerOptions, ColumnName, FunctionName as BaseFunctionName, GenericDatabase, GenericSchema, Insert, Relation, RelationName as BaseRelationName, Relationships, RelationType as BaseRelationType, Row, Schema, SchemaName as BaseSchemaName, TableName as BaseTableName, Update, ViewName as BaseViewName } from './database';
import type { FilterNode } from './filter';
import { encodeFilterNode } from './filter';
import type { ElementOf, KeyOfString, MaybeArray, OmitFrom } from './utils';
import { coerceArray } from './utils';


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

/**
 * Options for calling a PostgREST RPC function.
 */
export interface RpcOptions extends SelectOptions {
    /**
     * When set to `true`, the function will be called with read-only access mode.
     */
    get?: boolean;
}


/**
 * Paginated list of items with pagination info.
 */
export interface PaginatedList<Item> {
    items: Item[];
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
}


export class PostgrestFilterBuilder<
    ClientOptions extends ClientServerOptions,
    Schema extends GenericSchema,
    Row extends Record<string, unknown>,
    Result,
    RelationName = unknown,
    Relationships = unknown,
    Method = unknown,
> extends Supabase.PostgrestFilterBuilder<
        ClientOptions,
        Schema,
        Row,
        Result,
        RelationName,
        Relationships,
        Method
    > {

    private pagination?: {
        page: number;
        limit: number;
        count?: number;
    };


    constructor(
        builder: Supabase.PostgrestFilterBuilder<
            ClientOptions,
            Schema,
            Row,
            Result,
            RelationName,
            Relationships,
            Method
        >,
    ) {
        super(builder as unknown as {
            method: 'GET' | 'HEAD' | 'POST' | 'PATCH' | 'DELETE';
            url: URL;
            headers: Headers;
            schema?: string;
            body?: unknown;
            shouldThrowOnError: boolean;
            signal?: AbortSignal;
            fetch: typeof fetch;
            isMaybeSingle: boolean;
            urlLengthLimit: number;
        });
    }


    override select<
        Query extends (keyof Row)[] | '*' | (string & {}) = '*',
        ResultOne = Query extends '*'
            ? Row
            : Query extends string
                ? Supabase.UnstableGetResult<
                    Schema,
                    Row,
                    RelationName,
                    Relationships,
                    Query,
                    ClientServerOptions
                >
                : Pick<Row, Query[number]>,
    >(
        columns: Query = '*' as Query,
    ): PostgrestFilterBuilder<
            ClientOptions,
            Schema,
            Row,
            Method extends 'RPC'
                ? Result extends unknown[]
                    ? ResultOne[]
                    : ResultOne
                : ResultOne[],
            RelationName,
            Relationships,
            Method
        > {
        const builder = super.select<
            string,
            ResultOne
        >(
            coerceArray(columns).join(','),
        );
        return new PostgrestFilterBuilder(builder);
    }

    /**
     * Applies a filter to the query.
     * A filter is defined as an AST of filter nodes including conditions and logical operators.
     * @param filter The filter to apply.
     */
    where(filter: FilterNode<KeyOfString<Row>>): this {
        if (filter.type === 'logical') {
            const filters = filter.args.map(arg => encodeFilterNode(arg)).join(',');
            this.url.searchParams.append(filter.op, `(${filters})`);
        } else {
            this.url.searchParams.append(filter.key, `${filter.op}.${filter.value}`);
        }
        return this;
    }

    /**
     * Limits the range of results to a specific page given a page index and limit.
     * @param page The page index (0-based).
     * @param limit The number of items per page.
     * @param count Optional count of total items, if known.
     * If provided, it will be used to check if the pagination range is valid and resolve to an empty range if not.
     */
    paginate(page: number, limit: number, count?: number): this {
        assert(page >= 0, 'Page index must be ≥ 0');
        assert(limit >= 0, 'Page limit must be ≥ 0');

        const start = page * limit;
        const end = start + limit - 1;
        if (count !== undefined) {
            if (start >= count) {
                return this.limit(0);
            }
            if (end >= count) {
                return this.range(start, count - 1);
            }
        }

        this.pagination = {
            ...this.pagination,
            page,
            limit,
            count,
        };

        return this.range(start, end);
    }

    /**
     * Collects the results of a pagination query.
     * **Note:** For collect to work, paginate() must be called before collect() and the selection must include a `count`.
     * @returns The paginated list of queried items.
     */
    collect(): PromiseLike<PostgrestSingleResponse<PaginatedList<ElementOf<Result>>>> {
        return this.then(({ data, count, error, ...result }): PostgrestSingleResponse<PaginatedList<ElementOf<Result>>> => {
            if (error) {
                return { data, count, error, ...result };
            }

            const { page, limit, ...pagination } = assert.defined(this.pagination, 'Pagination is required for collect(). Make sure to call paginate() before collect()');
            const totalItems = count ?? pagination.count;

            assert(limit > 0, 'Page limit must be > 0');
            assert(Array.isArray(data), 'Data must be an array for pagination, make sure to select multiple rows in query');
            assert(totalItems !== undefined, 'Row count is required for pagination, make sure to count in query or pass `count` in paginate()');

            return {
                data: {
                    items: data,
                    totalItems,
                    page,
                    totalPages: Math.ceil(totalItems / limit),
                    limit,
                },
                error,
                count,
                ...result,
            };
        });
    }

}


export class PostgrestQueryBuilder<
    Database extends GenericDatabase<SchemaName>,
    ClientOptions extends ClientServerOptions,
    SchemaName extends BaseSchemaName<Database>,
    RelationType extends BaseRelationType = BaseRelationType,
    RelationName extends BaseRelationName<Database, SchemaName, RelationType> = BaseRelationName<Database, SchemaName, RelationType>,
> extends Supabase.PostgrestQueryBuilder<
        ClientOptions,
        Schema<Database, SchemaName>,
        Relation<Database, SchemaName, RelationType, RelationName>,
        RelationName,
        Relationships<Database, SchemaName, RelationType, RelationName>
    > {

    constructor(
        builder: Supabase.PostgrestQueryBuilder<
            ClientOptions,
            Schema<Database, SchemaName>,
            Relation<Database, SchemaName, RelationType, RelationName>,
            RelationName,
            Relationships<Database, SchemaName, RelationType, RelationName>
        >,
    ) {
        super(builder.url, builder);
    }

    override select<
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
        const builder = super.select<
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

    override insert(
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
    override insert(
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
    override insert(
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
        const builder = super.insert<
            Insert<Database, SchemaName, RelationType, RelationName>
        >(values as any, options);
        return new PostgrestFilterBuilder(builder);
    }

    override upsert(
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
    override upsert(
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
    override upsert(
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
        const builder = super.upsert<
            Insert<Database, SchemaName, RelationType, RelationName>
        >(values as any, {
            onConflict: coerceArray(onConflict).join(','),
            ...options,
        });
        return new PostgrestFilterBuilder(builder);
    }

    // @ts-expect-error the signatures are compatible but typescript can't verify it
    override update(
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
        const builder = super.update(value, options);
        return new PostgrestFilterBuilder(builder);
    }

    override delete(): PostgrestFilterBuilder<
        ClientOptions,
        Schema<Database, SchemaName>,
        Row<Database, SchemaName, RelationType, RelationName>,
        null,
        RelationName,
        Relationships<Database, SchemaName, RelationType, RelationName>,
        'DELETE'
    > {
        const builder = super.delete();
        return new PostgrestFilterBuilder(builder);
    }
}


export class PostgrestClient<
    Database extends GenericDatabase<SchemaName>,
    ClientOptions extends ClientServerOptions,
    SchemaName extends BaseSchemaName<Database>,
> {

    private readonly client: Supabase.PostgrestClient<Database, ClientOptions, SchemaName, Schema<Database, SchemaName>>;

    constructor(
        client: Supabase.PostgrestClient<Database, ClientOptions, SchemaName, Schema<Database, SchemaName>>,
    ) {
        this.client = client;
    }

    from<
        TableName extends BaseTableName<Database, SchemaName>,
    >(relation: TableName): PostgrestQueryBuilder<Database, ClientOptions, SchemaName, 'Tables', TableName>;
    from<
        ViewName extends BaseViewName<Database, SchemaName>,
    >(relation: ViewName): PostgrestQueryBuilder<Database, ClientOptions, SchemaName, 'Views', ViewName>;
    from<
        RelationType extends BaseRelationType,
        RelationName extends BaseRelationName<Database, SchemaName, RelationType>,
    >(
        relation: RelationName,
    ): PostgrestQueryBuilder<Database, ClientOptions, SchemaName, RelationType, RelationName>;
    from<
        RelationType extends BaseRelationType,
        RelationName extends BaseRelationName<Database, SchemaName, RelationType>,
    >(
        relation: RelationName,
    ): PostgrestQueryBuilder<
            Database,
            ClientOptions,
            SchemaName,
            RelationType,
            RelationName
        > {
        const builder = this.client.from(relation) as Supabase.PostgrestQueryBuilder<
            ClientOptions,
            Schema<Database, SchemaName>,
            Relation<Database, SchemaName, RelationType, RelationName>,
            RelationName,
            Relationships<Database, SchemaName, RelationType, RelationName>
        >;
        return new PostgrestQueryBuilder(builder);
    }

    rpc<
        FunctionName extends BaseFunctionName<Database, SchemaName>,
        Args extends BaseArgs<Database, SchemaName, FunctionName>,
    >(
        fn: FunctionName,
        args?: Args,
        options?: RpcOptions,
    ): ReturnType<typeof this.client.rpc<FunctionName, Args>> extends Supabase.PostgrestFilterBuilder<any, any, infer Row, infer Result, infer RelationName, infer Relationships, any> ?
            PostgrestFilterBuilder<
                ClientOptions,
                Schema<Database, SchemaName>,
                Row,
                Result,
                RelationName,
                Relationships,
                'RPC'
            >
            : never {
        const builder = this.client.rpc(fn, args, options);
        return new PostgrestFilterBuilder(builder);
    }
}
