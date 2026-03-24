import type { SupabaseClient } from '@supabase/supabase-js';

import { DataService, TableDataService, ViewDataService } from './data-service';
import type { CoreDatabase } from './database';
import type { RelationName, RelationType, SchemaName, TableName, ViewName } from './relation';
import type { KeyOfString } from './utils';


export interface DatabaseServiceParams<
    Database extends CoreDatabase = CoreDatabase,
> {
    supabase: SupabaseClient<Database>;
}


class _DatabaseService<
    Database extends CoreDatabase,
> {
    private readonly supabase: SupabaseClient<Database>;

    constructor({ supabase }: DatabaseServiceParams<Database>) {
        this.supabase = supabase;
    }

    schema<DynamicSchema extends Exclude<KeyOfString<Database>, '__InternalSupabase'>>(schema: DynamicSchema) {
        return this.supabase.schema(schema);
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

/**
 * Service for interacting with a supabase database.
 */
export type DatabaseService<
    Database extends CoreDatabase = CoreDatabase,
> = _DatabaseService<Database> & _DatabaseService<CoreDatabase>;

export const DatabaseService = _DatabaseService as unknown as new<
    Database extends CoreDatabase = CoreDatabase,
>(params: DatabaseServiceParams<Database>) => DatabaseService<Database>;
