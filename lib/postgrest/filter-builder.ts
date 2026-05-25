import { assert } from '@freehour/assert';
import * as Supabase from '@supabase/postgrest-js';

import type { ClientServerOptions, GenericSchema } from '@/database';
import type { KeyOfString } from '@/utils';
import { coerceArray } from '@/utils';

import type { FilterNode } from './filter';
import { encodeFilterNode } from './filter';
import { PostgrestPaginationBuilder } from './pagination-builder';


export class PostgrestFilterBuilder<
    ClientOptions extends ClientServerOptions,
    Schema extends GenericSchema,
    Row extends Record<string, unknown>,
    Result,
    RelationName = unknown,
    Relationships = unknown,
    Method = unknown,
    ThrowOnError extends boolean = false,
> extends Supabase.PostgrestFilterBuilder<
        ClientOptions,
        Schema,
        Row,
        Result,
        RelationName,
        Relationships,
        Method
    > {


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

    override throwOnError(): Supabase.PostgrestBuilder<ClientOptions, Result, true> & PostgrestFilterBuilder<ClientOptions, Schema, Row, Result, RelationName, Relationships, Method, true> & this {
        return super.throwOnError() as
            Supabase.PostgrestBuilder<ClientOptions, Result, true>
            & PostgrestFilterBuilder<ClientOptions, Schema, Row, Result, RelationName, Relationships, Method, true>
            & this;
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
        Method,
        ThrowOnError
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
     * Applies a list of filters (joined by logical AND) to the query.
     * A filter is defined as an AST of filter nodes including conditions and logical operators.
     * @param filters The filters to apply.
     */
    where(...filters: FilterNode<KeyOfString<Row>>[]): this {
        if (filters.length === 0) {
            return this;
        }
        if (filters.length === 1) {
            const filter = assert.value(filters[0]);
            if (filter.type === 'logical') {
                const filters = filter.args.map(arg => encodeFilterNode(arg)).join(',');
                this.url.searchParams.append(filter.op, `(${filters})`);
                return this;
            }
            return this.filter(filter.key, filter.op, filter.value);
        }
        return this.where({
            type: 'logical',
            op: 'and',
            args: filters,
        });
    }

    /**
     * Limits the range of results to a specific page given a page index and limit.
     * @param page The page index (0-based).
     * @param limit The number of items per page.
     */
    paginate(
        page: number,
        limit: number,
    ): PostgrestPaginationBuilder<
        ClientOptions,
        Schema,
        Row,
        Result,
        RelationName,
        Relationships,
        Method,
        ThrowOnError
    > {
        assert(page >= 0, 'Page index must be ≥ 0');
        assert(limit >= 0, 'Page limit must be ≥ 0');

        const start = page * limit;
        const end = start + limit - 1;
        const builder = this.range(start, end);

        return new PostgrestPaginationBuilder(
            builder,
            {
                page,
                limit,
            },
        );
    }
}
