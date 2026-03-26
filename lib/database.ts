import type { KeyOfString } from './utils';


export interface GenericRelationship {
    foreignKeyName: string;
    columns: string[];
    isOneToOne?: boolean;
    referencedRelation: string;
    referencedColumns: string[];
}

export interface GenericTable {
    Row: Record<string, unknown>;
    Insert: Record<string, unknown>;
    Update: Record<string, unknown>;
    Relationships: GenericRelationship[];
}

export interface GenericUpdatableView {
    Row: Record<string, unknown>;
    Insert: Record<string, unknown>;
    Update: Record<string, unknown>;
    Relationships: GenericRelationship[];
}

export interface GenericNonUpdatableView {
    Row: Record<string, unknown>;
    Relationships: GenericRelationship[];
}

export type GenericView = GenericUpdatableView | GenericNonUpdatableView;

export interface GenericSetofOption {
    isSetofReturn?: boolean | undefined;
    isOneToOne?: boolean | undefined;
    isNotNullable?: boolean | undefined;
    to: string;
    from: string;
}

export interface GenericFunction {
    Args: Record<string, unknown>;
    Returns: unknown;
    SetofOptions?: GenericSetofOption;
}

export interface GenericSchema {
    Tables: Record<string, GenericTable>;
    Views: Record<string, GenericView>;
    Functions: Record<string, GenericFunction>;
}

export type GenericDatabase<K extends string = string> = Record<K, GenericSchema>;

export interface ClientServerOptions {
    PostgrestVersion?: string;
}

export interface InternalSupabase extends ClientServerOptions {
}

export interface InternalSupabaseDatabase {
    __InternalSupabase: InternalSupabase;
}

export type ClientOptions<
    D,
> = D extends InternalSupabaseDatabase
    ? D['__InternalSupabase']
    : ClientServerOptions;

export type DefaultClientOptions<
    D,
> = ClientOptions<D> extends Required<ClientServerOptions> ? ClientOptions<D> : { PostgrestVersion: '12' };


// export type SchemaName<D> = Exclude<{
//     [K in KeyOfString<D>]: D[K] extends GenericSchema ? K : never;
// }[KeyOfString<D>], '__InternalSupabase'>;

export type SchemaName<D> = Exclude<KeyOfString<D>, '__InternalSupabase'>;

export type DefaultSchemaName<D> = 'public' extends SchemaName<D> ? 'public' : SchemaName<D>;

export type RelationType = 'Tables' | 'Views';
export type RelationName<D extends GenericDatabase<S>, S extends SchemaName<D> = SchemaName<D>, R extends RelationType = RelationType> = KeyOfString<D[S][R]>;
export type TableName<D extends GenericDatabase<S>, S extends SchemaName<D> = SchemaName<D>> = RelationName<D, S, 'Tables'>;
export type ViewName<D extends GenericDatabase<S>, S extends SchemaName<D> = SchemaName<D>> = RelationName<D, S, 'Views'>;
export type FunctionName<D extends GenericDatabase<S>, S extends SchemaName<D> = SchemaName<D>> = KeyOfString<D[S]['Functions']>;

export type ColumnName<
    D extends GenericDatabase<S>,
    S extends SchemaName<D> = SchemaName<D>,
    R extends RelationType = RelationType,
    T extends RelationName<D, S, R> = RelationName<D, S, R>,
> = KeyOfString<D[S][R][T]['Row']>;

export type TableColumnName<
    D extends GenericDatabase<S>,
    S extends SchemaName<D> = SchemaName<D>,
    T extends TableName<D, S> = TableName<D, S>,
> = ColumnName<D, S, 'Tables', T>;

export type ViewColumnName<
    D extends GenericDatabase<S>,
    S extends SchemaName<D> = SchemaName<D>,
    V extends ViewName<D, S> = ViewName<D, S>,
> = ColumnName<D, S, 'Views', V>;

export type Schema<
    D extends GenericDatabase<S>,
    S extends SchemaName<D> = SchemaName<D>,
> = D[S];

export type Relation<
    D extends GenericDatabase<S>,
    S extends SchemaName<D>,
    R extends RelationType,
    T extends RelationName<D, S, R>,
> = D[S][R][T];

export type Table<
    D extends GenericDatabase<S>,
    S extends SchemaName<D> = SchemaName<D>,
    T extends TableName<D, S> = TableName<D, S>,
> = D[S]['Tables'][T];

export type View<
    D extends GenericDatabase<S>,
    S extends SchemaName<D> = SchemaName<D>,
    V extends ViewName<D, S> = ViewName<D, S>,
> = D[S]['Views'][V];

export type Function<
    D extends GenericDatabase<S>,
    S extends SchemaName<D> = SchemaName<D>,
    F extends FunctionName<D, S> = FunctionName<D, S>,
> = D[S]['Functions'][F];

export type Args<
    D extends GenericDatabase<S>,
    S extends SchemaName<D>,
    F extends FunctionName<D, S>,
> = D[S]['Functions'][F]['Args'];

export type Row<
    D extends GenericDatabase<S>,
    S extends SchemaName<D>,
    R extends RelationType,
    T extends RelationName<D, S, R>,
> = D[S][R][T]['Row'];

export type Insert<
    D extends GenericDatabase<S>,
    S extends SchemaName<D>,
    R extends RelationType,
    T extends RelationName<D, S, R>,
> = D[S][R][T] extends { Insert: infer Insert } ? Insert : never;

export type Update<
    D extends GenericDatabase<S>,
    S extends SchemaName<D>,
    R extends RelationType,
    T extends RelationName<D, S, R>,
> = D[S][R][T] extends { Update: infer Update } ? Update : never;

export type Relationships<
    D extends GenericDatabase<S>,
    S extends SchemaName<D>,
    R extends RelationType,
    T extends RelationName<D, S, R>,
> = D[S][R][T]['Relationships'];

export type ID<
    D extends GenericDatabase<S>,
    S extends SchemaName<D>,
    R extends RelationType,
    T extends RelationName<D, S, R>,
> = D[S][R][T]['Row'] extends { id: infer ID } ? ID : never;

