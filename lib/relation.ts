import type { GenericDatabase } from './database';
import type { KeyOfString } from './utils';


export type SchemaName<D extends GenericDatabase> = Exclude<KeyOfString<D>, '__InternalSupabase'>;

export type RelationType = 'Tables' | 'Views';
export type RelationName<D extends GenericDatabase<S>, S extends SchemaName<D> = SchemaName<D>, R extends RelationType = RelationType> = KeyOfString<D[S][R]>;
export type TableName<D extends GenericDatabase<S>, S extends SchemaName<D> = SchemaName<D>> = RelationName<D, S, 'Tables'>;
export type ViewName<D extends GenericDatabase<S>, S extends SchemaName<D> = SchemaName<D>> = RelationName<D, S, 'Views'>;

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

export type Relation<
    D extends GenericDatabase<KeyOfString<D>>,
    S extends SchemaName<D>,
    R extends RelationType,
    T extends RelationName<D, S, R>,
> = D[S][R][T] extends {
    Row: infer R;
    Insert?: infer I;
    Update?: infer U;
    Relationships: infer Rel;
} ? {
        Row: R;
        Insert: I;
        Update: U;
        Relationships: Rel;
    } : never;

export type Row<
    D extends GenericDatabase<KeyOfString<D>>,
    S extends SchemaName<D>,
    R extends RelationType,
    T extends RelationName<D, S, R>,
> = Relation<D, S, R, T>['Row'];

export type Insert<
    D extends GenericDatabase<KeyOfString<D>>,
    S extends SchemaName<D>,
    R extends RelationType,
    T extends RelationName<D, S, R>,
> = Relation<D, S, R, T>['Insert'];

export type Update<
    D extends GenericDatabase<KeyOfString<D>>,
    S extends SchemaName<D>,
    R extends RelationType,
    T extends RelationName<D, S, R>,
> = Relation<D, S, R, T>['Update'];

export type Relationships<
    D extends GenericDatabase<KeyOfString<D>>,
    S extends SchemaName<D>,
    R extends RelationType,
    T extends RelationName<D, S, R>,
> = Relation<D, S, R, T>['Relationships'];

export type ID<
    D extends GenericDatabase<KeyOfString<D>>,
    S extends SchemaName<D>,
    R extends RelationType,
    T extends RelationName<D, S, R>,
> = Row<D, S, R, T> extends { id: infer ID } ? ID : never;
