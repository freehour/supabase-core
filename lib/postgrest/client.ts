import type * as Supabase from '@supabase/postgrest-js';

import type { Args as BaseArgs, ClientServerOptions, FunctionName as BaseFunctionName, GenericDatabase, Relation, RelationName as BaseRelationName, Relationships, RelationType as BaseRelationType, Schema, SchemaName as BaseSchemaName, TableName as BaseTableName, ViewName as BaseViewName } from '@/database';

import { PostgrestFilterBuilder } from './filter-builder';
import type { SelectOptions } from './query-builder';
import { PostgrestQueryBuilder } from './query-builder';


/**
 * Options for calling a PostgREST RPC function.
 */
export interface RpcOptions extends SelectOptions {

    /**
     * When set to `true`, the function will be called with read-only access mode.
     */
    get?: boolean;
}


export class PostgrestClient<
    Database extends GenericDatabase<SchemaName>,
    ClientOptions extends ClientServerOptions,
    SchemaName extends BaseSchemaName<Database>,
> {

    protected readonly client: Supabase.PostgrestClient<Database, ClientOptions, SchemaName, Schema<Database, SchemaName>>;

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
    ): ReturnType<typeof this.client.rpc<FunctionName, Args>> extends Supabase.PostgrestFilterBuilder<any, any, infer Row, infer Result, infer RelationName, infer Relationships, any>
        ? PostgrestFilterBuilder<
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
