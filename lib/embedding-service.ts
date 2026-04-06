

import type { Embedding, EmbeddingSynchronizationFailure, EmbeddingSynchronizationResult, EmbeddingSynchronizationSuccess, Metadata, MetadataGeneratorFn } from './embedding';
import { UnsupportedMimeError } from './errors';
import type { FileRef, StorageLocation } from './storage';
import type { StorageService } from './storage-service';


export interface EmbeddingServiceParams<
    BucketName extends string = string,
> {
    storage: StorageService<BucketName>;
}

export abstract class EmbeddingService<
    BucketName extends string = string,
> {
    protected readonly storage: StorageService<BucketName>;

    constructor({
        storage,
    }: EmbeddingServiceParams<BucketName>) {
        this.storage = storage;
    }

    /**
     * Retrieves the embeddings associated with the given file reference.
     *
     * @param location The storage location of the file whose embeddings should be retrieved.
     * @return An array of embeddings.
     */
    protected abstract getEmbeddings(location: StorageLocation): Promise<Embedding[]>;

    /**
     * Generates and stores embeddings for the given text.
     *
     * @param location The storage location of the file content that is being embedded.
     * @param text The text to generate embeddings for.
     * @param file The metadata of the corresponding file.
     * @param metadata Additional metadata to store with the embedding.
     * @return An array of generated embeddings.
     */
    protected abstract createEmbeddings(location: StorageLocation, metadata?: Metadata): Promise<Embedding[]>;

    /**
     * Delete the embeddings associated with the given file reference.
     *
     * @param location The storage location of the file whose embeddings should be deleted.
     */
    protected abstract deleteEmbeddings(location: StorageLocation): Promise<void>;

    /**
     * Retrieves a list of files in the specified bucket that have either no embeddings or embeddings that are outdated.
     * Note: The base implementation of this method is expensive to run.
     * It is recommended to override it with a more efficient implementation (e.g. using pure SQL) if possible.
     *
     * @param bucket The name of the bucket to check for outdated embeddings.
     * @returns A promise that resolves to an array of file references with outdated embeddings.
     */
    protected async getOutdatedEmbeddings(bucket: BucketName): Promise<FileRef<BucketName>[]> {
        const files: FileRef<BucketName>[] = [];

        let hasNext = true;
        let nextCursor: string | undefined = undefined;
        while (hasNext) {
            const { objects, ...result } = await this.storage.getFiles(bucket, { cursor: nextCursor });
            const isOutdated = await Promise.all(
                objects.map(async file => {
                    const updatedAt = new Date(file.updated_at);
                    const location = await this.storage.getFileStorageLocation({ fileId: file.id });
                    const embeddings = await this.getEmbeddings(location);
                    return embeddings.length === 0 || embeddings.some(embedding => embedding.createdAt < updatedAt);
                }),
            );

            files.push(
                ...objects
                    .filter((_, i) => isOutdated[i])
                    .map(({ id }): FileRef<BucketName> => ({ fileId: id })),
            );

            ({ hasNext, nextCursor } = result);
        }
        return files;
    }


    async get(fileRef: FileRef<BucketName>): Promise<Embedding[]> {
        const location = await this.storage.getFileStorageLocation(fileRef);
        return this.getEmbeddings(location);
    }

    async ingest(fileRef: FileRef<BucketName>, metadata?: Metadata | MetadataGeneratorFn): Promise<Embedding[]> {
        const location = await this.storage.getFileStorageLocation(fileRef);

        // delete any existing embedding for the file before generating a new one
        await this.deleteEmbeddings(location);

        // generate embeddings
        return this.createEmbeddings(
            location,
            typeof metadata === 'function' ? metadata(location) : metadata,
        );
    }

    async synchronize(bucket: BucketName, metadata?: Metadata | MetadataGeneratorFn): Promise<EmbeddingSynchronizationResult[]> {
        const files = await this.getOutdatedEmbeddings(bucket);

        const results = await Promise.all(
            files
                .map(
                    async file => this.ingest(file, metadata)
                        .then((): EmbeddingSynchronizationSuccess => ({
                            file,
                            success: true,
                            error: null,
                        }))
                        .catch((error): EmbeddingSynchronizationFailure | null => {
                            if (error instanceof UnsupportedMimeError) {
                                return null;
                            }
                            return {
                                file,
                                error,
                                success: false,
                            };
                        }),
                ),
        );

        return results.filter(result => result !== null);
    }
}
