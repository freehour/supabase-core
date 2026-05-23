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
            return this;
        }
        return this.filter(filter.key, filter.op, filter.value);
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
        Method
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
