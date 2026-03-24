import type { FileMetadata } from '@supabase/storage-js';

import type { Json } from './json';


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

export type GenericDatabase<K extends string = (string & {})> = Record<K, GenericSchema>;


export interface StorageObjectsTable extends GenericTable {
    Row: {
        bucket_id: string | null;
        created_at: string | null;
        id: string;
        last_accessed_at: string | null;
        metadata: FileMetadata | null;
        name: string | null;
        owner: string | null;
        owner_id: string | null;
        path_tokens: string[] | null;
        updated_at: string | null;
        user_metadata: Json | null;
        version: string | null;
    };
}

export interface StorageSchema extends GenericSchema {
    Tables: {
        objects: StorageObjectsTable;
    };
}

export interface FuzzySearchFunction extends GenericFunction {
    Args: {
        column_name: string;
        limit_results?: number;
        min_similarity?: number;
        schema_name?: string;
        search_term: string;
        relation: string;
    };
    Returns: Json[];
}

export interface CoreSchema extends GenericSchema {
    Functions: {
        fuzzy_search: FuzzySearchFunction;
    };
}

export interface CoreDatabase extends GenericDatabase {
    storage: StorageSchema;
    core: CoreSchema;
}

