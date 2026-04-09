import { assert } from '@freehour/assert';
import type { Camelize, FileObjectV2, SearchV2Options, SearchV2Result } from '@supabase/storage-js';

import type { Database } from './generated/database';
import type { TableDataService } from './data-service';
import type { DatabaseService } from './database-service';
import { FileNotFoundError } from './errors';
import type { FileInfo, FilePointer, FileRef, PublicURLOptions, StorageClient, StorageLocation, UploadFileOptions } from './storage';
import { isFilePointer, isStorageLocation } from './storage';
import { entries, groupBy, splitPath } from './utils';


export interface StorageServiceParams<
    BucketName extends string = string,
> {
    client: StorageClient<BucketName>;
    database: DatabaseService<any>;
}

/**
 * Service for interacting with supabase storage.
 */
export class StorageService<
    BucketName extends string = string,
> {
    private readonly client: StorageClient<BucketName>;
    private readonly database: DatabaseService;

    constructor({
        client,
        database,
    }: StorageServiceParams<BucketName>) {
        this.client = client;
        this.database = database;
    }

    private get files(): TableDataService<Database, any, 'storage', 'objects'> {
        return this.database.table('storage', 'objects');
    }

    private async getFileObject({ bucket, path }: FilePointer): Promise<Camelize<FileObjectV2>> {
        const { data, error } = await this.client
            .from(bucket)
            .info(path);

        if (error) {
            throw error;
        }
        return data;
    }

    async getFiles(bucket: BucketName, options?: SearchV2Options): Promise<SearchV2Result> {
        const { data, error } = await this.client
            .from(bucket)
            .listV2(options);

        if (error) {
            throw error;
        }

        return data;
    }

    async getFileStorageLocation(ref: FileRef<BucketName>): Promise<StorageLocation<BucketName>> {
        if (isStorageLocation(ref)) {
            return ref;
        }

        if (isFilePointer(ref)) {
            const { id } = await this.getFileObject(ref);
            return { fileId: id, ...ref };
        }

        const { fileId } = ref;
        const fileInfo = await this.files.get(fileId, ['bucket_id', 'path_tokens']);
        if (!fileInfo) {
            throw new FileNotFoundError(`File with ID ${fileId} not found`, { fileId });
        }

        return {
            fileId,
            bucket: assert.notNull(fileInfo.bucket_id, 'bucket_id must not be null') as BucketName,
            path: assert.notNull(fileInfo.path_tokens, 'path_tokens must not be null').join('/'),
        };
    }

    async getFileInfo(fileRef: FileRef<BucketName>): Promise<FileInfo<BucketName>> {
        const location = await this.getFileStorageLocation(fileRef);
        const { id, bucketId, metadata, ...info } = await this.getFileObject(location);

        assert(id === location.fileId, 'file ID from storage client must match file ID from database');
        assert(bucketId === location.bucket, 'bucketId from storage client must match bucket from database');

        return {
            ...info,
            ...location,
            metadata,
            properties: metadata
                ? {
                    type: metadata.mimetype,
                    lastModified: new Date(metadata.lastModified).getTime(),
                }
                : {},
        };
    }

    async getPublicURL(fileRef: FileRef<BucketName>, options?: PublicURLOptions): Promise<string> {
        const { bucket, path } = await this.getFileStorageLocation(fileRef);

        const { data: { publicUrl } } = this.client
            .from(bucket)
            .getPublicUrl(path, options);

        return publicUrl;
    }

    async existsFile(fileRef: FileRef<BucketName>): Promise<boolean> {
        const { bucket, path } = await this.getFileStorageLocation(fileRef);

        const { data: exists, error } = await this.client
            .from(bucket)
            .exists(path);

        if (error) {
            throw error;
        }

        return exists;
    }

    async assertExistsFile(fileRef: FileRef<BucketName>): Promise<void> {
        const { bucket, path } = await this.getFileStorageLocation(fileRef);

        const { data: exists, error } = await this.client
            .from(bucket)
            .exists(path);

        if (error) {
            throw error;
        }

        if (!exists) {
            throw new FileNotFoundError(`File not found in bucket '${bucket}' at path '${path}'`, { bucket, path });
        }
    }

    async uploadFile(
        file: File,
        { bucket, path }: FilePointer<BucketName>,
        { overwriteExisting = false }: UploadFileOptions = {},
    ): Promise<StorageLocation<BucketName>> {
        const { data, error } = await this.client
            .from(bucket)
            .upload(
                `${path}/${file.name}`,
                file,
                {
                    upsert: overwriteExisting,
                },
            );

        if (error) {
            throw error;
        }

        return {
            fileId: data.id,
            bucket,
            path: data.path,
        };
    }

    async downloadFile(fileRef: FileRef<BucketName>): Promise<StorageLocation<BucketName> & { file: File }> {
        const { fileId, bucket, path, properties } = await this.getFileInfo(fileRef);

        const { data, error } = await this.client
            .from(bucket)
            .download(path);

        if (error) {
            throw error;
        }

        const [, name] = splitPath(path);
        return {
            fileId,
            bucket,
            path,
            file: new File([data], name, properties),
        };
    }

    async deleteFiles(fileRefs: FileRef<BucketName>[]): Promise<StorageLocation<BucketName>[]> {
        const fileIds = fileRefs.filter(ref => 'fileId' in ref).map(ref => ref.fileId);
        const queryFiles = await this.files.query
            .select(['bucket_id', 'path_tokens'])
            .containedBy('id', fileIds)
            .throwOnError();

        const resolvedFilePointers = queryFiles.data.map(({ bucket_id, path_tokens }) => ({
            bucket: assert.notNull(bucket_id, 'bucket_id must not be null') as BucketName,
            path: assert.notNull(path_tokens, 'path_tokens must not be null').join('/'),
        }));

        const filePointers = fileRefs
            .filter(ref => isFilePointer(ref))
            .concat(resolvedFilePointers);

        const filePointersByBucket = entries(
            groupBy(filePointers, item => item.bucket),
        )
            .map(([bucket, items]) => ({
                bucket,
                paths: items.map(item => item.path),
            }));

        const results = await Promise.all(filePointersByBucket.map(
            async ({ bucket, paths }) => this.client
                .from(bucket)
                .remove(paths)
                .then(({ data, error }): StorageLocation<BucketName>[] => {
                    if (error) {
                        throw error;
                    }
                    return data.map((file, index) => ({
                        fileId: assert.notNull(file.id, 'file id must not be null'),
                        bucket,
                        path: assert.defined(paths[index], 'path must not be null'),
                    }));
                }),
        ));

        return results.flat();
    }

}
