import type { PostgrestResponseSuccess } from '@supabase/postgrest-js';
import * as Supabase from '@supabase/postgrest-js';
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

export type CollectResult<Result, ThrowOnError extends boolean> = ThrowOnError extends true
    ? PromiseLike<PostgrestResponseSuccess<PaginatedList<ElementOf<Result>>>>
    : PromiseLike<PostgrestSingleResponse<PaginatedList<ElementOf<Result>>>>;


export class PostgrestPaginationBuilder<
    ClientOptions extends ClientServerOptions,
    Schema extends GenericSchema,
    Row extends Record<string, unknown>,
    Result,
    RelationName = unknown,
    Relationships = unknown,
    Method = unknown,
    ThrowOnError extends boolean = false,
> extends PostgrestFilterBuilder<
        ClientOptions,
        Schema,
        Row,
        Result,
        RelationName,
        Relationships,
        Method,
        ThrowOnError
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
            Method,
            ThrowOnError
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
        Method,
        ThrowOnError
    > {
        const builder = super.select<
            Query,
            ResultOne
        >(
            columns,
        );
        return new PostgrestPaginationBuilder(builder, this.pagination);
    }

    override throwOnError(): Supabase.PostgrestBuilder<ClientOptions, Result, true> & PostgrestPaginationBuilder<ClientOptions, Schema, Row, Result, RelationName, Relationships, Method, true> & this {
        return super.throwOnError() as
            Supabase.PostgrestBuilder<ClientOptions, Result, true>
            & PostgrestPaginationBuilder<ClientOptions, Schema, Row, Result, RelationName, Relationships, Method, true>
            & this;
    }

    /**
     * Collects the results of a pagination query.
     * **Note:** For pagination to work the selection must include a `count`.
     * @returns The paginated list of queried items.
     */
    collect(): CollectResult<Result, ThrowOnError> {
        const result = this.then<
            PostgrestSingleResponse<PaginatedList<ElementOf<Result>>>,
            Supabase.PostgrestResponseFailure
        >(
            result => {
                const { page, limit } = this.pagination;
                const { success, data, count, error, ...rest } = result;
                if (success) {
                    const badRequest = {
                        data: null,
                        count: null,
                        status: 400,
                        statusText: 'Bad Request',
                        success: false,
                    } as const;
                    if (limit <= 0) {
                        return {
                            error: new Supabase.PostgrestError({
                                message: 'Page limit must be > 0',
                                details: 'Invalid pagination limit',
                                hint: 'Provide a valid page limit greater than 0',
                                code: '',
                            }),
                            ...badRequest,
                        };
                    }
                    if (!Array.isArray(data)) {
                        return {
                            error: new Supabase.PostgrestError({
                                message: 'Data must be an array for pagination, make sure to select multiple rows in query',
                                details: 'Invalid data format',
                                hint: 'Ensure the query selects multiple rows resulting in an array',
                                code: '',
                            }),
                            ...badRequest,
                        };
                    }
                    if (count === null) {
                        return {
                            error: new Supabase.PostgrestError({
                                message: 'Row count is required for pagination, make sure to count in query',
                                details: 'Missing row count',
                                hint: 'Include a count in the query to enable pagination',
                                code: '',
                            }),
                            ...badRequest,
                        };
                    }
                    return {
                        success: true,
                        data: {
                            items: data,
                            totalItems: count,
                            page,
                            totalPages: Math.ceil(count / limit),
                            limit,
                        },
                        count,
                        error,
                        ...rest,
                    };
                }

                return result;
            },
            reason => ({
                success: false,
                data: null,
                count: null,
                error: reason instanceof Supabase.PostgrestError
                    ? reason
                    : new Supabase.PostgrestError({
                        message: reason instanceof Error ? reason.message : String(reason),
                        details: '',
                        hint: '',
                        code: '',
                    }),
                status: 0,
                statusText: '',
            }),
        );

        if (this.shouldThrowOnError) {
            return result.then(
                res => {
                    if (!res.success) {
                        throw res.error;
                    }
                    return res;
                },
                reason => {
                    throw reason;
                },
            );
        }

        return result as CollectResult<Result, ThrowOnError>;
    }
}
