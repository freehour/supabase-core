import type { MimeString } from '@freehour/mime';

import type { Json } from './json';
import type { FileRef, StorageLocation } from './storage';


export type Metadata = Record<string, Json>;
export type MetadataGeneratorFn = (location: StorageLocation) => Metadata;

export interface FileMetadata {
    name: string;
    type: MimeString;
    size: number;
}

export interface Embedding extends StorageLocation {
    text: string;
    vector: number[];
    metadata: Metadata;
    createdAt: Date;
}

export interface EmbeddingSynchronizationSuccess {
    file: FileRef;
    success: true;
    error: null;
}

export interface EmbeddingSynchronizationFailure {
    file: FileRef;
    success: false;
    error: Error;
}

export type EmbeddingSynchronizationResult = EmbeddingSynchronizationSuccess | EmbeddingSynchronizationFailure;

