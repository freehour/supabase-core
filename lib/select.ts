/**
 * The method to use to count rows returned by the function.
 * - `exact`: Counts the rows exactly.
 * - `planned`: Uses statistics to get a fairly accurate and fast count.
 * - `estimated`: Uses an estimated count which is the exact count up until a threshold and the planned count when that threshold is surpassed.
 *
 * @see https://docs.postgrest.org/en/v12/references/api/pagination_count.html#counting
 */
export type CountMethod = 'exact' | 'planned' | 'estimated';

/**
 * Options for selecting rows from a database table.
 */
export interface SelectOptions {
    /**
     * When set to `true`, `data` will not be returned, useful if you only need the count.
     */
    head?: boolean;

    /**
     * The method to use to count rows returned by the function.
     * If not set, no count will be performed.
     */
    count?: CountMethod;
}

export type SelectColumns<Row> = (keyof Row)[] | '*';
export type Select<
    Row,
    Columns extends SelectColumns<Row> = SelectColumns<Row>,
> = Pick<Row, Columns extends '*' ? keyof Row : Columns[number]>;
