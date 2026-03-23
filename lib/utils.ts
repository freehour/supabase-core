/**
 * Typesafe and autocompleting version of `Omit` that omits keys from a base type.
 */
export type OmitFrom<Base, Keys extends keyof Base> = Omit<Base, Keys>;

/**
 * A type for keys that excludes symbols and numbers.
 * This is useful for objects with string keys only.
 * @template T The type to extract keys from.
 */
export type KeyOfString<T> = Exclude<keyof T, symbol | number>;

/**
 * Extracts the element type from an array type.
 * If the type is not an array, it returns the type itself.
 *
 * @template T - The type to extract the element from.
 * @returns The element type if T is an array, otherwise T itself.
 *
 * @example
 * type MyArray = number[];
 * type Element = ElementOf<MyArray>; // number
 *
 * type MyType = string;
 * type Element2 = ElementOf<MyType>; // string
 */
export type ElementOf<T> = T extends (infer U)[] ? U : T;

/**
 * Equivalent to `T | T[]`, used to indicate that a value can be either a single item or an array of items.
 */
export type MaybeArray<T> = T | T[];

/**
 * Splits a path into its directory and file name components.
 * @param path The path to split.
 * @param separator The separator to use for splitting. Defaults to '/'.
 * To split at the extension, you can pass '.' as the separator.
 * @returns The directory and file name as a tuple.
 * If no separator is found, the first element will be an empty string and the second will be the entire path.
 *
 * @example
 * splitPath('/path/to/file.txt'); // returns ['/path/to', 'file.txt']
 * splitPath('file.txt'); // returns ['', 'file.txt']
 * splitPath('path/to/file.txt', '.'); // returns ['path/to/file', 'txt']
 */
export function splitPath(path: string, separator = '/'): [string, string] {
    const idx = path.lastIndexOf(separator);
    if (idx === -1) {
        return ['', path];
    }
    return [path.substring(0, idx), path.substring(idx + 1)];
}

/**
 * Returns the input as an array if it is not already an array.
 * @param input The input to coerce into an array.
 * @returns The input as an array.
 */
export function coerceArray<T>(input: MaybeArray<T>): T[] {
    return Array.isArray(input) ? input : [input];
}

/**
 * Groups an array of items by a key function.
 * @param items The array of items to group.
 * @param groupFn The function that extracts the grouping key from each item.
 * @returns The grouped items as a record where keys are the grouping keys and values are the grouped items.
 */
export function groupBy<T, G extends PropertyKey>(
    items: T[],
    groupFn: (item: T) => G,
): Record<G, T[]> {
    return items.reduce<Partial<Record<G, T[]>>>((acc, item) => {
        const key = groupFn(item);
        (acc[key] ??= []).push(item);
        return acc;
    }, {}) as Record<G, T[]>;
}

/**
 * Removes the first element from an array that matches a given predicate function.
 * @param array The array from which to remove the element.
 * @param predicate The function that determines whether an element should be removed. It should return `true` for the element to remove.
 * @returns The modified array with the element removed, if found. If no element matches the predicate, the original array is returned unchanged.
 */
export function removeElement<T>(array: T[], predicate: (item: T) => boolean): T[] {
    const index = array.findIndex(predicate);
    if (index !== -1) {
        array.splice(index, 1);
    }
    return array;
}

/**
 * Extracts entries from an object as tuples of key-value pairs.
 * This is a typesafe version of `Object.entries` that preserves the types of the keys and values.
 *
 * @template T The type of the object from which to extract entries.
 * @param obj The object from which to extract entries.
 * @returns The entries of the object as tuples of key-value pairs.
 */
export function entries<T extends object>(obj: T): [keyof T, T[keyof T]][];
export function entries<T extends object>(obj: T): [string, any][] {
    return Object.entries(obj);
}
