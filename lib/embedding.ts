import type { MimeString } from '@freehour/mime';

import type { Json } from './json';
import type { FileRef, StorageLocation } from './storage';


export type Metadata = Record<string, Json>;
export type MetadataGeneratorFn = ((file: File, location: StorageLocation) => Metadata);

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

export interface EmbeddingPreprocessingStep {
    name: string;
    run: (text: string, metadata: FileMetadata) => string;
}

export const preprocessingSteps: Record<string, EmbeddingPreprocessingStep> = {
    removeImagesFromMarkdown: {
        name: 'removeImagesFromMarkdown',
        run(text, metadata) {
            if (metadata.type === 'text/markdown') {
            // ![Alt Text](image-url)
                const regex = /!\[([^\]]*)\]\([^)]*\)/g;
                return text.replace(regex, (match, altText: string) => `![${altText}]()`);
            }
            return text;
        },
    },

    removeLinksFromMarkdown: {
        name: 'removeLinksFromMarkdown',
        run(text, metadata) {
            if (metadata.type === 'text/markdown') {
                // [Link Text](url)
                const regex = /\[([^\]]*)\]\([^)]*\)/g;
                return text.replace(regex, (match, linkText: string) => `[${linkText}]()`);
            }
            return text;
        },
    },
};

