import type { Camelize, FileObjectV2, TransformOptions } from '@supabase/storage-js';
import { StorageClient as SupabaseStorageClient } from '@supabase/storage-js';

import type { Database } from './generated/database';
import type { OmitFrom } from './utils';


export declare class StorageClient<BucketName extends string = string> extends SupabaseStorageClient {
    from(bucket: BucketName | (string & {})): ReturnType<SupabaseStorageClient['from']>;
}

export type StorageObject = Database['storage']['Tables']['objects']['Row'];

export interface StorageLocation {
    fileId: string;
    bucket: string;
    path: string;
}

export interface FilePointer<BucketName extends string = string> {
    bucket: BucketName;
    path: string;
}

export type FileRef<BucketName extends string = string> = {
    fileId: string;
    bucket?: never;
    path?: never;
} | {
    fileId?: never;
    bucket: BucketName;
    path: string;
} | {
    fileId: string;
    bucket: BucketName;
    path: string;
};

export interface FileInfo extends OmitFrom<Camelize<FileObjectV2>, 'id' | 'bucketId'>, StorageLocation {
    properties: FilePropertyBag;
}

export interface PublicURLOptions {
    download?: string | boolean;
    transform?: TransformOptions;
}

export interface UploadFileOptions {
    overwriteExisting?: boolean;
}


export function isFilePointer<BucketName extends string>(ref: FileRef<BucketName>): ref is FilePointer<BucketName> {
    return ref.bucket !== undefined && ref.path !== undefined;
}

export function isStorageLocation(ref: FileRef): ref is StorageLocation {
    return ref.fileId !== undefined && ref.bucket !== undefined;
}
