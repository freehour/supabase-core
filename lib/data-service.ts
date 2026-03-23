
import { assert } from '@freehour/assert';
import type { PostgrestResponseSuccess } from '@supabase/postgrest-js';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';

import type { FuzzySearchParams, UpsertOptions } from './data';
import type { BaseDatabase, CoreDatabase } from './database';
import type { DatabaseService } from './database-service';
import { RecordNotFoundError } from './errors';
import { postgrestExtensions } from './postgrest-extensions';
import type { ColumnName, ID, Insert, RelationName, RelationType, Row, SchemaName, TableName, Update, ViewName } from './relation';
import type { Select, SelectColumns } from './select';
import type { OmitFrom } from './utils';


export interface DataServiceParams<
    Database extends BaseDatabase<Database>,
    Schema extends SchemaName<Database>,
    Type extends RelationType = RelationType,
    Relation extends RelationName<Database, Schema, Type> = RelationName<Database, Schema, Type>,
> {
    /**
     * The database service instance to use for database operations.
     */
    database: DatabaseService<Database>;

    /**
     * The name of the schema containing the table or view.
     */
    schema: Schema;

    /**
     * The name of the table or view that this service interacts with.
     */
    relation: Relation;
}

/**
 * A service for interacting with a specific table or view in a database.
 *
 * @template Database The database type.
 * @template Schema The name of the schema containing the table or view.
 * @template Type The type of relation, either 'Tables' or 'Views'.
 * @template Relation The name of the table or view.
 * @example
 * const service = new DataService({database, schema: 'public', relation: 'my_view'});
 * const records = await service.list();
 * const record = await service.find('some-id');
 */
export class DataService<
    Database extends BaseDatabase<Database>,
    Schema extends SchemaName<Database> = SchemaName<Database>,
    Type extends RelationType = RelationType,
    Relation extends RelationName<Database, Schema, Type> = RelationName<Database, Schema, Type>,
> {

    private readonly database: DatabaseService<Database & CoreDatabase>;

    /**
     * The name of the schema containing the view.
     */
    readonly schema: Schema;

    /**
     * The name of the view or table that this service interacts with.
     */
    readonly relation: Relation;


    constructor({
        database,
        schema,
        relation,
    }: DataServiceParams<Database, Schema, Type, Relation>) {
        this.database = database;
        this.schema = schema;
        this.relation = relation;
    }

    private recordNotFoundError(id: ID<Database, Schema, Type, Relation>): RecordNotFoundError {
        return new RecordNotFoundError(`Record with id ${id} not found in ${this.schema}.${this.relation}`, {
            schema: this.schema,
            relation: this.relation,
            id: id as string | number,
        });
    }

    /**
     * The PostgREST query builder for this relation.
     *
     * @example
     * const { data, error } = await dataService.query.select('*');
     */
    get query() {
        const relation = this.database
            .schema(this.schema)
            .from(this.relation);
        return postgrestExtensions.query.enable(relation);
    }

    /**
     * Performs a fuzzy search on the specified column of the relation.
     * @returns The rows that match the search criteria in descending order of similarity.
     * @throws DatabaseApiError if the query fails.
     */
    async fuzzySearch(
        {
            column,
            searchTerm = '',
            minSimilarity = 0,
            limit = 64,
        }: FuzzySearchParams<Database, Schema, Type, Relation>,
    ): Promise<Row<Database, Schema, Type, Relation>[]> {
        const { data } = await this.database.schema('supabase_core')
            .rpc('fuzzy_search', {
                relation: this.relation,
                schema_name: this.schema,
                column_name: column,
                search_term: searchTerm,
                min_similarity: minSimilarity,
                limit_results: limit,
            })
            .throwOnError();

        return data as unknown as Row<Database, Schema, Type, Relation>[];
    }

    /**
     * List all rows in the relation.
     * Equivalent to `select('*')` with no filters or pagination.
     * @returns Array of rows in the relation.
     */
    async list(): Promise<Row<Database, Schema, Type, Relation>[]> {
        const { data } = await this.query.select('*').throwOnError();
        return data;
    }

    /**
     * Gets a single row by its ID.
     * @param id The ID of the row to find.
     * @param columns The columns to select from the row. Defaults to all columns.
     * @returns The found row or `undefined` if no row with the specified ID exists.
     * @throws DatabaseApiError if the query fails.
     */
    async get<
        Columns extends SelectColumns<Row<Database, Schema, Type, Relation>>,
    >(id: ID<Database, Schema, Type, Relation>, columns: Columns = '*' as Columns): Promise<
        Select<Row<Database, Schema, Type, Relation>, Columns> | undefined
    > {
        const { data } = await this.query
            .select(columns)
            .eq('id', id as any)
            .throwOnError();

        return data[0];
    }

    /**
     * Gets a single row by its ID, throwing an error if no such row exists.
     * @param id The ID of the row to find.
     * @param columns The columns to select from the row. Defaults to all columns.
     * @returns The found row.
     * @throws RecordNotFoundError if no row with the specified ID exists.
     * @throws DatabaseApiError if the query fails for any other reason.
     */
    async getOrThrow<
        Columns extends SelectColumns<Row<Database, Schema, Type, Relation>>,
    >(id: ID<Database, Schema, Type, Relation>, columns: Columns = '*' as Columns): Promise<
        Select<Row<Database, Schema, Type, Relation>, Columns>
    > {
        const row = await this.get(id, columns);
        if (row === undefined) {
            throw this.recordNotFoundError(id);
        }
        return row;
    }

    /**
     * Deletes a row from the relation by its ID, i.e. by the `id` column.
     * @param id The ID of the row to delete.
     * @return The deleted row, or `undefined` if no row with the specified ID existed.
     * @throws DatabaseApiError if the deletion fails.
     */
    async delete(id: ID<Database, Schema, Type, Relation>): Promise<
        Row<Database, Schema, Type, Relation> | undefined
    > {
        const { data } = await this.query
            .delete()
            .eq('id', id as any)
            .select()
            .throwOnError();

        return data[0];
    }

    /**
     * Deletes a row from the relation by its ID, throwing an error if no such row exists.
     * @param id The ID of the row to delete.
     * @returns The deleted row.
     * @throws RecordNotFoundError if no row with the specified ID exists.
     * @throws DatabaseApiError if the deletion fails for any other reason.
     */
    async deleteOrThrow(id: ID<Database, Schema, Type, Relation>): Promise<
        Row<Database, Schema, Type, Relation>
    > {
        const row = await this.delete(id);
        if (row === undefined) {
            throw this.recordNotFoundError(id);
        }
        return row;
    }

    /**
     * Inserts a new row into the relation.
     * @param insert The data to insert into the relation.
     * @returns The inserted row.
     * @throws DatabaseApiError if the insertion fails.
     */
    async insert(insert: Insert<Database, Schema, Type, Relation>): Promise<
        Row<Database, Schema, Type, Relation>
    > {
        const { data } = await this.query
            .insert(insert as any)
            .select()
            .single()
            .throwOnError();

        return data;
    }

    /**
     * Inserts or updates a row in the relation.
     * @param insert The data to insert or update in the relation.
     * @returns The inserted or updated row.
     * @throws DatabaseApiError if the upsert operation fails.
     */
    async upsert(
        insert: Insert<Database, Schema, Type, Relation>,
        {
            onConflict,
            ...options
        }: UpsertOptions<Database, Schema, Type, Relation> = {},
    ): Promise<Row<Database, Schema, Type, Relation>> {
        const { data } = await this.query
            .upsert(insert as any, {
                onConflict: onConflict?.join(','),
                ...options,
            })
            .select()
            .single()
            .throwOnError();

        return data;
    }

    /**
     * Updates an existing row in the relation by its ID.
     *
     * @param id The ID of the row to update.
     * @param update The data to update in the row.
     * @returns The updated row.
     * @throws DatabaseApiError if the update fails.
     */
    async update(
        id: ID<Database, Schema, Type, Relation>,
        update: Update<Database, Schema, Type, Relation>,
    ): Promise<Row<Database, Schema, Type, Relation>> {
        const { data } = await this.query
            .update(update as any)
            .eq('id', id as any)
            .select()
            .single()
            .throwOnError();

        return data;
    }
}

export type TDatabase<Service> = Service extends DataService<infer D> ? D : never;
export type TSchema<Service> = Service extends DataService<any, infer S> ? S : never;
export type TRelation<Service> = Service extends DataService<any, any, infer R> ? R : never;
export type TColumn<Service> = Service extends DataService<infer D, infer S, infer R, infer T> ? ColumnName<D, S, R, T> : never;
export type TRow<Service> = Service extends DataService<infer D, infer S, infer R, infer T> ? Row<D, S, R, T> : never;


export interface TableDataServiceParams<
    Database extends BaseDatabase<Database>,
    Schema extends SchemaName<Database>,
    Table extends TableName<Database, Schema>,
> extends OmitFrom<DataServiceParams<Database, Schema>, 'relation'> {
    /**
     * The name of the table that this service interacts with.
     */
    table: Table;
}

/**
 * A service for interacting with a specific table in a database.
 * Provides methods for select, insert, delete, and other table operations.
 *
 * @template Database The database type.
 * @template SchemaName The name of the schema containing the table.
 * @template TableName The name of the table.
 * @example
 * const table = new TableDataService({database, schema: 'public', table: 'my_table'});
 * const records = await table.list();
 * const record = await table.find('some-id');
 * await table.insert({ id: 'new-id', name: 'New Record' });
 * await table.delete('some-id');
 */
export class TableDataService<
    Database extends BaseDatabase<Database>,
    Schema extends SchemaName<Database> = SchemaName<Database>,
    Table extends TableName<Database, Schema> = TableName<Database, Schema>,
> extends DataService<Database, Schema, 'Tables', Table> {

    constructor({
        database,
        schema,
        table,
    }: TableDataServiceParams<Database, Schema, Table>) {
        super({
            database,
            schema,
            relation: table,
        });
    }
}

export interface ViewDataServiceParams<
    Database extends BaseDatabase<Database>,
    Schema extends SchemaName<Database>,
    View extends ViewName<Database, Schema> = ViewName<Database, Schema>,
> extends OmitFrom<DataServiceParams<Database, Schema>, 'relation'> {
    /**
     * The name of the view that this service interacts with.
     */
    view: View;
}

/**
 * A service for interacting with a specific view in a database.
 * Provides methods for select, insert, delete, and other view operations.
 * Note mutations require an updatable view.
 *
 * @template Database The database type.
 * @template Schema The name of the schema containing the view.
 * @template View The name of the view.
 * @example
 * const view = new ViewDataService({database, schema: 'public', view: 'my_view'});
 * const records = await view.list();
 * const record = await view.find('some-id');
 */
export class ViewDataService<
    Database extends BaseDatabase<Database>,
    Schema extends SchemaName<Database> = SchemaName<Database>,
    View extends ViewName<Database, Schema> = ViewName<Database, Schema>,
> extends DataService<Database, Schema, 'Views', View> {

    constructor({
        database,
        schema,
        view,
    }: ViewDataServiceParams<Database, Schema, View>) {
        super({
            database,
            schema,
            relation: view,
        });
    }
}

/**
 * Asserts that a PostgREST response contains a count, that is the request was successful
 * and `count` was set in the {@link SelectOptions} of the request.
 *
 * @param response The PostgREST response.
 * @returns The response with the count included.
 * @throws DatabaseApiError if the response contains an error.
 * @throws AssertionError if the response does not contain a count.
 */
export function assertCounted<TData>(
    response: PostgrestSingleResponse<TData>,
): PostgrestResponseSuccess<NonNullable<TData>> & { count: number } {
    if (response.error) {
        throw response.error;
    }
    assert(response.count !== null, 'Response does not contain a count. Make sure to set the `count` option in the request.');
    return response as PostgrestResponseSuccess<NonNullable<TData>> & { count: number };
}
