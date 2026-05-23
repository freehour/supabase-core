import { assert } from '@freehour/assert';
import type * as Supabase from '@supabase/postgrest-js';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';

import type { ClientServerOptions, GenericSchema } from '@/database';
import type { ElementOf } from '@/utils';

import { PostgrestFilterBuilder } from './filter-builder';


/**
 * Defines a pagination range using a page index and a page limit.
 */
export interface Pagination {
    page: number;
    limit: number;
}

/**
 * Paginated list of items with pagination info.
 */
export interface PaginatedList<Item> extends Pagination {
    items: Item[];
    totalItems: number;
    totalPages: number;
}


export class PostgrestPaginationBuilder<
    ClientOptions extends ClientServerOptions,
    Schema extends GenericSchema,
    Row extends Record<string, unknown>,
    Result,
    RelationName = unknown,
    Relationships = unknown,
    Method = unknown,
> extends PostgrestFilterBuilder<
        ClientOptions,
        Schema,
        Row,
        Result,
        RelationName,
        Relationships,
        Method
    > {

    private readonly pagination: Pagination;

    constructor(
        builder: PostgrestFilterBuilder<
            ClientOptions,
            Schema,
            Row,
            Result,
            RelationName,
            Relationships,
            Method
        >,
        pagination: Pagination,
    ) {
        super(builder);
        this.pagination = pagination;
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
    ): PostgrestPaginationBuilder<
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
            Query,
            ResultOne
        >(
            columns,
        );
        return new PostgrestPaginationBuilder(builder, this.pagination);
    }

    /**
     * Collects the results of a pagination query.
     * **Note:** For pagination to work the selection must include a `count`.
     * @returns The paginated list of queried items.
     */
    collect(): PromiseLike<PostgrestSingleResponse<PaginatedList<ElementOf<Result>>>> {
        return this.then((result): PostgrestSingleResponse<PaginatedList<ElementOf<Result>>> => {
            if (result.success) {
                const { data, count, ...rest } = result;
                const { page, limit } = this.pagination;

                assert(limit > 0, 'Page limit must be > 0');
                assert(Array.isArray(data), 'Data must be an array for pagination, make sure to select multiple rows in query');
                const totalItems = assert.notNull(count, 'Row count is required for pagination, make sure to count in query');

                return {
                    data: {
                        items: data,
                        totalItems,
                        page,
                        totalPages: Math.ceil(totalItems / limit),
                        limit,
                    },
                    count,
                    ...rest,
                };
            }

            return result;
        });
    }
}
