import type * as Supabase from '@supabase/postgrest-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database as CoreDatabase } from './generated/database';
import { DataService, TableDataService, ViewDataService } from './data-service';
import type { ClientServerOptions, DefaultClientOptions, GenericDatabase, RelationName as BaseRelationName, RelationType, SchemaName as BaseSchemaName, TableName as BaseTableName, ViewName as BaseViewName } from './database';
import { PostgrestClient } from './postgrest';


class DatabaseServiceImpl<
    Database extends GenericDatabase<BaseSchemaName<Database>> & CoreDatabase = CoreDatabase,
    ClientOptions extends Required<ClientServerOptions> = DefaultClientOptions<Database>,
> {
    private readonly supabase: SupabaseClient<Database, ClientOptions>;

    constructor({ supabase }: DatabaseServiceParams<Database, ClientOptions>) {
        this.supabase = supabase;
    }

    schema<SchemaName extends BaseSchemaName<Database>>(
        schema: SchemaName,
    ): PostgrestClient<Database, ClientOptions, SchemaName> {
        const client = this.supabase.schema(schema) as unknown as Supabase.PostgrestClient<Database, ClientOptions, SchemaName>;
        return new PostgrestClient(client);
    }

    relation<
        SchemaName extends BaseSchemaName<Database>,
        RelationName extends BaseRelationName<Database, SchemaName>,
    >(schema: SchemaName, relation: RelationName): DataService<Database, ClientOptions, SchemaName, RelationType, RelationName> {
        return new DataService<Database, ClientOptions, SchemaName, RelationType, RelationName>({
            database: this as unknown as DatabaseService<Database, ClientOptions>,
            schema,
            relation,
        });
    }

    table<
        SchemaName extends BaseSchemaName<Database>,
        TableName extends BaseTableName<Database, SchemaName>,
    >(schema: SchemaName, table: TableName): TableDataService<Database, ClientOptions, SchemaName, TableName> {
        return new TableDataService<Database, ClientOptions, SchemaName, TableName>({
            database: this as unknown as DatabaseService<Database, ClientOptions>,
            schema,
            table,
        });
    }

    view<
        SchemaName extends BaseSchemaName<Database>,
        ViewName extends BaseViewName<Database, SchemaName>,
    >(schema: SchemaName, view: ViewName): ViewDataService<Database, ClientOptions, SchemaName, ViewName> {
        return new ViewDataService<Database, ClientOptions, SchemaName, ViewName>({
            database: this as unknown as DatabaseService<Database, ClientOptions>,
            schema,
            view,
        });
    }
}


/**
 * Service for interacting with a supabase database.
 */
export type DatabaseService<
    Database extends GenericDatabase<BaseSchemaName<Database>> & CoreDatabase = CoreDatabase,
    ClientOptions extends Required<ClientServerOptions> = DefaultClientOptions<Database>,
> = DatabaseServiceImpl<Database, ClientOptions> & DatabaseServiceImpl<CoreDatabase, ClientOptions>;

export interface DatabaseServiceParams<
    Database extends GenericDatabase<BaseSchemaName<Database>> & CoreDatabase = CoreDatabase,
    ClientOptions extends Required<ClientServerOptions> = DefaultClientOptions<Database>,
> {
    supabase: SupabaseClient<Database, ClientOptions>;
}

export const DatabaseService = DatabaseServiceImpl as unknown as new<
    Database extends GenericDatabase<BaseSchemaName<Database>> & CoreDatabase = CoreDatabase,
    ClientOptions extends Required<ClientServerOptions> = DefaultClientOptions<Database>,
>(params: DatabaseServiceParams<Database, ClientOptions>) => DatabaseService<Database, ClientOptions>;

