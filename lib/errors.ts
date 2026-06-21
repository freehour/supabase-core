import z from 'zod';

import { PostgrestError } from '@supabase/supabase-js';

import type { FileRef } from './storage';


/**
 * Automatically captures the stack trace for the error.
 */
export class TracedError extends Error {
    constructor(message?: string, options: ErrorOptions = {}) {
        super(message, options);
        Error.captureStackTrace(this, this.constructor);
    }
}


export interface FileNotFoundErrorOptions {

    /**
     * A reference to the file that was expected to be found.
     */
    ref: FileRef;
}

/**
 * Error indicating that a file with a specified ID could not be found in storage.
 */
export class FileNotFoundError extends TracedError {

    /**
     * A reference to the file that was expected to be found.
     */
    readonly ref: FileRef;

    constructor(
        message: string,
        {
            ref,
        }: FileNotFoundErrorOptions,
    ) {
        super(message);
        this.name = 'FileNotFoundError';
        this.ref = ref;
    }
}


export interface ParseErrorOptions extends ErrorOptions {

    /**
     * The encountered expression that could not be parsed.
     */
    expression: string;

    /**
     * Additional context about the expected format or structure.
     */
    format?: unknown;
}

/**
 * An error that indicates that an expression could not be parsed.
 */
export class ParseError extends TracedError {

    /**
     * The encountered expression that could not be parsed.
     */
    readonly expression: string;

    /**
     * Additional context about the expected format or structure.
     */
    readonly format?: unknown;

    constructor(
        message: string,
        {
            expression,
            format,
            ...options
        }: ParseErrorOptions,
    ) {
        super(message, options);
        this.name = 'ParseError';
        this.expression = expression;
        this.format = format;
    }
}


export interface RecordNotFoundErrorOptions {

    /**
     * The schema where the record was expected to be found.
     */
    schema: string;

    /**
     * The table or view where the record was expected to be found.
     */
    relation: string;

    /**
     * The ID of the record that was not found.
     */
    id: string | number;
}

/**
 * Error indicating that a record with a specified ID could not be found in a database table or view.
 * It can provide more context about the missing record, such as the schema and relation it was expected to be in.
 * Note this is a very generic error that is thrown by the `DataService`,
 * you may want to throw a more specific error in the service that uses it.
 */
export class RecordNotFoundError extends TracedError {

    /**
     * The schema where the record was expected to be found.
     */
    readonly schema: string;

    /**
     * The table or view where the record was expected to be found.
     */
    readonly relation: string;

    /**
     * The ID of the record that was not found.
     */
    readonly id: string | number;

    constructor(
        message: string,
        {
            schema,
            relation,
            id,
        }: RecordNotFoundErrorOptions,
    ) {
        super(message);
        this.name = 'RecordNotFoundError';
        this.schema = schema;
        this.relation = relation;
        this.id = id;
    }
}

/**
 * PostgREST errors are sometimes returned in this format instead of the declared PostgrestError class.
 */
export const PostgrestErrorInterface = z
    .object({
        code: z
            .string(),
        details: z
            .string()
            .nullable(),
        hint: z
            .string()
            .nullable(),
        name: z
            .string()
            .optional(),
        message: z
            .string()
            .optional(),
    });

export type PostgrestErrorInterface = z.infer<typeof PostgrestErrorInterface>;

/**
 * An error indicating that a database request failed.
 */
export type DatabaseApiError = PostgrestError | PostgrestErrorInterface;

export function isDatabaseApiError(error: unknown): error is DatabaseApiError {
    return error instanceof PostgrestError || PostgrestErrorInterface.safeParse(error).success;
}
