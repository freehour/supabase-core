import { assert } from '@freehour/assert';
import type { PostgrestClientOptions, PostgrestFilterBuilder, PostgrestQueryBuilder, PostgrestResponseSuccess } from '@supabase/postgrest-js';

import type { GenericSchema, GenericTable, GenericView } from './database';
import type { Filter, FilterNode } from './filter';
import { encodeFilter, negateFilterNode } from './filter';
import type { CountMethod, Select, SelectColumns, SelectOptions } from './select';
import type { ElementOf } from './utils';
import { coerceArray } from './utils';

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

/**
 * Internal context for PostgREST filter extension. Keeps track of current filter state
 * modified by functions in the postgrestExtensions.filter chain.
 */
interface PostgrestFilterExtensionContext {
    pagination?: {
        page: number;
        limit: number;
        count?: number;
    };
}

/**
 * Database extensions for PostgREST queries.
 * Provides methods for column selection, filtering and pagination.
 *
 * @example
 * const selection = supabase.schema('public').from('my_table').select('*', { count: 'exact' });
 * const {data, error} = await postgrestExtensions.filter.enable(selection)
 *     .apply({ key: 'name', op: 'eq', value: 'John' })
 *     .paginate(1, 10)
 *     .collect();
 */
export const postgrestExtensions = {
    /**
     * Query extension for PostgREST queries.
     * Supports typesafe column selection and counting.
     * This extension can be used with any PostgREST query builder.
     *
     * @example
     * const table = supabase.schema('public').from('my_table');
     * const {data, error} = await postgrestExtensions.query.enable(table)
     *     .selectColumns(['id', 'name'])
     *     .then(({data}) => console.log(data)); // [{ id: 1, name: 'John' }, ...]
     */
    query: {
        enable: <
            ClientOptions extends PostgrestClientOptions,
            Schema extends GenericSchema,
            Relation extends GenericTable | GenericView,
            RelationName = unknown,
            Relationships = Relation extends { Relationships: infer R } ? R : unknown,
        >(
            builder: PostgrestQueryBuilder<ClientOptions, Schema, Relation, RelationName, Relationships>,
        ) => Object.assign(builder, {
            /**
             * Selects columns from the relation.
             *
             * @param columns The array of column names to select, or '*' to select all columns.
             * @param options The options for the selection, such as count.
             * @returns The PostgREST filter builder with selection applied and filter extension enabled.
             */
            select: <
                Columns extends SelectColumns<Relation['Row']>,
            >(columns: Columns, options?: SelectOptions) => postgrestExtensions.filter.enable(
                builder.select<
                    string,
                    Select<Relation['Row'], Columns>
                >(
                    coerceArray(columns as '*' | string[]).join(','),
                    options,
                ),
            ),

            /**
             * Counts the number of rows in the relation.
             * Does not select any columns, only counts the rows.
             *
             * @param method The counting method to use, defaults to 'exact'.
             * @returns The PostgREST filter builder with counting applied and filter extension enabled.
             */
            count: (method: CountMethod = 'exact') => postgrestExtensions.filter.enable(
                builder.select('*', { count: method, head: true }),
            ),

            /**
             * Deletes rows from the relation.
             * Returns a filter builder for further filtering before deletion.
             *
             * @returns The PostgREST filter builder with delete applied and filter extension enabled.
             */
            delete: () => postgrestExtensions.filter.enable(
                builder.delete(),
            ),
        }),
    },

    /**
     * Filter extension for PostgREST queries.
     * Supports applying filters, pagination and collecting results.
     * This extension can be used with any PostgREST filter builder.
     *
     * @example
     * const selection = supabase.schema('public').from('my_table').select('*', { count: 'exact' });
     * const {data, error} = await postgrestExtensions.filter.enable(selection)
     *     .apply({ key: 'name', op: 'eq', value: 'John' })
     *     .paginate(1, 10)
     *     .collect();
     */
    filter: {
        enable: <
            ClientOptions extends PostgrestClientOptions,
            Schema extends GenericSchema,
            Row extends Record<string, unknown>,
            Result,
            RelationName = unknown,
            Relationships = unknown,
            Method = unknown,
        >(
            builder: PostgrestFilterBuilder<ClientOptions, Schema, Row, Result, RelationName, Relationships, Method>,
            context: PostgrestFilterExtensionContext = {},
        ) => Object.assign(builder, {

            /**
             * Applies a filter to the query.
             * A filter is defined as an array of AST filter nodes including conditions and logical operators.
             * @param filter The filter to apply.
             */
            apply: <K extends string = string>(filter: Filter<K>) => postgrestExtensions.filter.enable(
                (
                    () => {
                        function applyFilterNode(
                            builder: PostgrestFilterBuilder<ClientOptions, Schema, Row, Result, RelationName, Relationships, Method>,
                            node: FilterNode<K>,
                        ): PostgrestFilterBuilder<ClientOptions, Schema, Row, Result, RelationName, Relationships, Method> {
                            if (node.type === 'logical') {
                                const args = encodeFilter(node.args, k => k, ',');
                                if (node.op === 'or') {
                                    return builder.or(args);
                                }
                                if (node.op === 'not.or') {
                                    return builder.or(args, { referencedTable: 'not' });
                                }
                                // postgrest-js does not support 'and', so we need to use 'or' and negate the filters accordingly
                                return applyFilterNode(builder, {
                                    type: 'logical',
                                    op: node.op === 'and' ? 'not.or' : 'or',
                                    args: node.args.map(negateFilterNode),
                                });
                            }

                            return builder.filter(node.key, node.op, node.value);
                        }

                        return filter.reduce(applyFilterNode, builder);
                    }
                )(),
                context,
            ),

            /**
             * Limits the range of results to a specific page given a page index and limit.
             * @param page The page index (0-based).
             * @param limit The number of items per page.
             * @param count Optional count of total items, if known.
             * If provided, it will be used to check if the pagination range is valid and resolve to an empty range if not.
             */
            paginate: (page: number, limit: number, count?: number) => postgrestExtensions.filter.enable(
                (
                    () => {
                        assert(page >= 0, 'Page index must be ≥ 0');
                        assert(limit >= 0, 'Page limit must be ≥ 0');

                        const start = page * limit;
                        const end = start + limit - 1;
                        if (count !== undefined) {
                            if (start >= count) {
                                return builder.limit(0);
                            }
                            if (end >= count) {
                                return builder.range(start, count - 1);
                            }
                        }
                        return builder.range(start, end);
                    }
                )(),
                {
                    ...context,
                    pagination: {
                        page,
                        limit,
                        count,
                    },
                },
            ),


            /**
             * Collects the results of a pagination query.
             * **Note:** For collect to work, paginate() must be called before collect() and the selection must include a `count`.
             * @returns The paginated list of queried items.
             */
            collect: () => builder.throwOnError().then((result): PaginatedList<ElementOf<Result>> => {
                const { data, count } = result as PostgrestResponseSuccess<ElementOf<Result>[]>;
                const { page, limit, ...pagination } = assert.defined(context.pagination, 'Pagination context is required for collect(). Make sure to call paginate() before collect()');
                const totalItems = count ?? pagination.count;

                assert(limit > 0, 'Page limit must be > 0');
                assert(Array.isArray(data), 'Data must be an array for pagination, make sure to select multiple rows in query');
                assert(totalItems !== undefined, 'Row count is required for pagination, make sure to count in query or pass `count` in paginate()');

                return {
                    items: data,
                    totalItems,
                    page,
                    totalPages: Math.ceil(totalItems / limit),
                    limit,
                };
            }),
        }),
    },
} as const;
