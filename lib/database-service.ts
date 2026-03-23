import type { SupabaseClient } from '@supabase/supabase-js';

import { DataService, TableDataService, ViewDataService } from './data-service';
import type { BaseDatabase, CoreDatabase } from './database';
import type { RelationName, RelationType, SchemaName, TableName, ViewName } from './relation';


export interface DatabaseServiceParams<
    Database,
> {
    supabase: SupabaseClient<Database>;
}


/**
 * Service for interacting with a supabase database.
 */
export class DatabaseService<
    Database extends BaseDatabase<Database> = CoreDatabase,
> {
    private readonly supabase: SupabaseClient<Database>;

    constructor({ supabase }: DatabaseServiceParams<Database>) {
        this.supabase = supabase;
    }

    get schema(): typeof this.supabase.schema {
        return this.supabase.schema.bind(this.supabase);
    }

    get rpc(): typeof this.supabase.rpc {
        return this.supabase.rpc.bind(this.supabase);
    }

    get from(): typeof this.supabase.from {
        return this.supabase.from.bind(this.supabase);
    }

    relation<
        Schema extends SchemaName<Database>,
        Relation extends RelationName<Database, Schema>,
    >(schema: Schema, relation: Relation): DataService<Database, Schema, RelationType, Relation> {
        return new DataService<Database, Schema, RelationType, Relation>({
            database: this as unknown as DatabaseService<Database>,
            schema,
            relation,
        });
    }

    table<
        Schema extends SchemaName<Database>,
        Table extends TableName<Database, Schema>,
    >(schema: Schema, table: Table): TableDataService<Database, Schema, Table> {
        return new TableDataService<Database, Schema, Table>({
            database: this as unknown as DatabaseService<Database>,
            schema,
            table,
        });
    }

    view<
        Schema extends SchemaName<Database>,
        View extends ViewName<Database, Schema>,
    >(schema: Schema, view: View): ViewDataService<Database, Schema, View> {
        return new ViewDataService<Database, Schema, View>({
            database: this as unknown as DatabaseService<Database>,
            schema,
            view,
        });
    }
}
