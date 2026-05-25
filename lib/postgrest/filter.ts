import type { ZodObject } from 'zod';
import z from 'zod';

import { assert } from '@freehour/assert';

import { ParseError } from '@/errors';
import type { KeyOfString } from '@/utils';


/**
 * Type of filterable items.
 * They must have a string key to form valid filter expressions.
 */
export type FilterItem = Record<string, unknown>;

/**
 * Filter operators.
 * @see https://postgrest.org/en/stable/api.html#operators
 */
export const FilterOp = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'match', 'imatch', 'in', 'is', 'isdistinct', 'fts', 'plfts', 'phfts', 'wfts', 'cs', 'cd', 'ov', 'sl', 'sr', 'nxr', 'nxl', 'adj'] as const;
export type FilterOp = `${'' | 'not.'}${typeof FilterOp[number]}`;

/**
 * Logical operators for combining filters.
 * These operators can be used to create complex filter expressions.
 * @see https://docs.postgrest.org/en/stable/api.html#logical-operators
 */
export const LogicalOp = ['and', 'or'] as const;
export type LogicalOp = `${'' | 'not.'}${typeof LogicalOp[number]}`;

/**
 * A single filter condition in an abstract syntax tree (AST) of filter nodes.
 * @param K The type of keys in the filter expression.
 * @return The Zod schema representing the filter condition node.
 */
export interface FilterConditionNode<K extends string = string> {
    type?: 'condition';
    op: FilterOp;
    value: string | number | boolean | null;
    key: K;
}

/**
 * A logical operator in an abstract syntax tree (AST) of filter nodes.
 * This node combines multiple filter expressions using logical operators like `and` or `or`.
 *
 * @template K The type of keys in the filter expressions.
 * @param keys The list of valid keys in the filter expressions.
 * @returns The Zod schema representing the logical filter node.
 */
export interface FilterLogicalNode<K extends string = string> {
    type: 'logical';
    op: LogicalOp;

    args: FilterNode<K>[];
}

/**
 * A node in the abstract syntax tree (AST) representing any filter expression.
 * It can be either a filter condition or a logical operator.
 *
 * @template K The type of keys in the filter expressions.
 * @param keys The list of valid keys in the filter expressions.
 * @returns The Zod schema representing the filter node.
 */
export type FilterNode<K extends string = string> = FilterConditionNode<K> | FilterLogicalNode<K>;

/**
 * A filter key is a string that represents a key in a filter condition.
 * It can be any key from the item being filtered, excluding symbols and numbers.
 * @example
 * For an item like `{ name: string, age: number }`, the filter keys would be `'name'` and `'age'`.
 * @template Item The type of the item being filtered.
 */
export type FilterKey<Item extends object> = KeyOfString<Item>;


/**
 * An array of filter AST nodes, representing a chain of filter expressions joined by a logical `and`.
 * It can be decoded from a string containing one or more filter expressions, chained with the {@link FilterChainSeparator chain separator `~`} .
 */
export const FilterNode = <Item extends ZodObject>(item: Item) => <DecodeKey extends string = string>(
    mapping: Partial<Record<FilterKey<z.infer<Item>>, DecodeKey>> = {},
): z.ZodPipe<z.ZodString, z.ZodTransform<FilterNode<DecodeKey>, string>> => {
    const decodeKey = (key: FilterKey<z.infer<Item>>): DecodeKey => mapping[key] ?? key as unknown as DecodeKey;
    const inputKeys = Object.keys(item.shape) as FilterKey<z.infer<Item>>[];

    return z
        .string()
        .transform<FilterNode<DecodeKey>>((expression, ctx) => {
            try {
                return parseFilterExpression(expression, inputKeys, decodeKey);
            } catch (error) {
                ctx.addIssue({
                    code: 'custom',
                    input: expression,
                    message: error instanceof Error ? error.message : undefined,
                    params: error instanceof ParseError
                        ? {
                            expression: error.expression,
                            format: error.format,
                        }
                        : undefined,
                });
                return z.NEVER;
            }
        });
};
export type Filter<K extends string = string> = FilterNode<K>[];


/**
 * Negates a filter or logical operator.
 *
 * If the operator starts with 'not.', it removes the 'not.' prefix.
 * Otherwise, it adds 'not.' as a prefix.
 *
 * @param op The filter or logical operator to negate.
 * @returns The negated operator.
 */
export function negateOp<Op extends FilterOp | LogicalOp>(op: Op): Op {
    return (op.startsWith('not.') ? op.slice(4) : `not.${op}`) as Op;
}

/**
 * Negates a filter AST node, by applying the negation to its operator.
 *
 * @param node The filter AST node to negate.
 * @returns The negated filter.
 */
export function negateFilterNode<K extends string = string, F extends FilterNode<K> = FilterNode<K>>(node: F): F {
    return {
        ...node,
        op: negateOp(node.op),
    };
}

/**
 * Encodes a filter AST node into a filter expression string.
 * The expression follows the dot notation of [PostgREST](https://docs.postgrest.org/en/v13/references/api/tables_views.html#horizontal-filtering).
 *
 * @template InputKey - The type of keys in the filter AST.
 * @template OutputKey - The type of keys in the expression.
 * @param node The filter AST node to encode to a string.
 * @param transformKey An optional function to transform keys from InputKey to OutputKey.
 * @returns The encoded filter expression as a string.
 * @see https://docs.postgrest.org/en/stable/api.html#horizontal-filtering
 */
export function encodeFilterNode<K extends string = string>(
    node: FilterNode<K>,
    transformKey: (key: K) => string = key => key,
): string {
    // Logical
    if (node.type === 'logical') {
        const args = node.args.map(arg => encodeFilterNode(arg, transformKey));
        return `${node.op}(${args})`;
    }
    // Condition
    return `${transformKey(node.key)}.${node.op}.${node.value}`;
}

/**
 * Parses a filter expression into a filter AST node.
 * The expression must follow the dot notation of [PostgREST](https://docs.postgrest.org/en/v13/references/api/tables_views.html#horizontal-filtering).
 * See also {@link parseFilterExpressionChain}.
 *
 * @template InputKey - The type of keys in the filter expression.
 * @template OutputKey - The type of keys in the filter AST node.
 * @param expression The filter expression to parse.
 * @param inputKeys An optional list of valid input keys.
 * This is used to validate the keys in the expression. If not provided, any key is valid.
 * @param transformKey An optional function to transform keys from InputKey to OutputKey.
 * @returns The parsed filter AST node.
 * @throws ParseError if any expression in the filter string can not be parsed, e.g. has invalid syntax, unsupported operators or unsupported keys.
 */
export function parseFilterExpression<InputKey extends string = string, OutputKey extends string = InputKey>(
    expression: string,
    inputKeys: InputKey[] = [],
    transformKey: (key: InputKey) => OutputKey = key => key as unknown as OutputKey,
): FilterNode<OutputKey> {
    // Split comma-separated args at top level, respecting nested parentheses
    function splitArgs(s: string): string[] {
        const args: string[] = [];
        let depth = 0;
        let buf = '';
        let inQuotes = false;
        for (const c of s) {
            if (c === '"') {
                inQuotes = !inQuotes;
                buf += c;
            } else if (c === '(' && !inQuotes) {
                depth++;
                buf += c;
            } else if (c === ')' && !inQuotes) {
                depth--;
                buf += c;
            } else if (c === ',' && depth === 0 && !inQuotes) {
                args.push(buf.trim());
                buf = '';
            } else {
                buf += c;
            }
        }
        return args;
    }

    // Logical operators
    if (expression.endsWith(')')) {
        if (expression.startsWith('and(')) {
            return {
                type: 'logical',
                op: 'and',
                args: splitArgs(expression.slice(4, -1)).map(e => parseFilterExpression(e, inputKeys, transformKey)),
            };
        }
        if (expression.startsWith('or(')) {
            return {
                type: 'logical',
                op: 'or',
                args: splitArgs(expression.slice(3, -1)).map(e => parseFilterExpression(e, inputKeys, transformKey)),
            };
        }
        if (expression.startsWith('not.and(')) {
            return {
                type: 'logical',
                op: 'not.and',
                args: splitArgs(expression.slice(8, -1)).map(e => parseFilterExpression(e, inputKeys, transformKey)),
            };
        }
        if (expression.startsWith('not.or(')) {
            return {
                type: 'logical',
                op: 'not.or',
                args: splitArgs(expression.slice(7, -1)).map(e => parseFilterExpression(e, inputKeys, transformKey)),
            };
        }
    }


    // Filters
    const keyPattern = inputKeys.length === 0 ? '[a-zA-Z_][a-zA-Z0-9_]*' : inputKeys.join('|');
    const pattern = `^(${keyPattern})\\.((?:not\\.)?(?:${FilterOp.join('|')}))\\.(.+)$`; // key.(not.)op.value
    const regex = new RegExp(pattern);
    const match = regex.exec(expression);

    if (!match) {
        throw new ParseError(`Invalid filter expression '${expression}'`, {
            expression: expression,
            format: {
                syntax: 'key.(not.)op.value',
                keys: inputKeys.length === 0 ? '*' : inputKeys,
                operators: FilterOp,
            },
        });
    }

    const [, key, op, value] = match;
    return {
        type: 'condition',
        key: transformKey(key as InputKey),
        op: op as FilterOp,
        value: assert.defined(value),
    };
}

