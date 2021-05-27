
type Operator = '=' | '>=' | '<=' | '!=' | '>' | '<';

type PlacedValue = string | number | boolean;

type ColumnName = string;

type condition =
    ['AND', condition[]] |
    ['OR', condition[]] |
    [string, Operator, PlacedValue] |
    [string, 'IN' | 'NOT IN', Array<PlacedValue>] |
    [string, 'IS' | 'IS NOT', null] |
    [string, 'LIKE', string] |
    BuiltQuery;

interface UntabledQueryBase {
    join?: Array<{
        type?: 'left' | string,
        table: 'terminal_command_log' | string,
        as: 'tcl' | string,
        on: Array<['tcl.cmd_rq_id' | string, Operator, 'crl.id' | string]>,
    }>;
    where?: condition;
    groupBy?: ColumnName[],
    orderBy?: [ColumnName, 'ASC' | 'DESC'][];
    skip?: '0' | number;
    limit?: '100' | number;
}

interface TabledQueryBase extends UntabledQueryBase {
    table: 'cmd_rq_log' | string;
}

interface BuiltQuery {
    sql: string,
    placedValues: PlacedValue[],
}

interface SelectSpecificFields {
    as?: 'crl' | string;
    fields?: Array<'gds' | string>;
}

export interface makeSelectQuery_rq extends TabledQueryBase, SelectSpecificFields {}
export interface selectFromArray_rq extends UntabledQueryBase, SelectSpecificFields {}

export declare const makeSelectQuery: (params: makeSelectQuery_rq) => BuiltQuery;

export declare const makeInsertQuery: <TRow extends Record<string, PlacedValue>>(params: {
    table: TabledQueryBase['table'],
    rows: TRow[],
    insertType?: 'insertOrUpdate' | 'replace' | 'insertNew',
}) => BuiltQuery;

export declare const makeUpdateQuery: (params: {
    table: TabledQueryBase['table'],
    set: Record<string, PlacedValue>,
    where: TabledQueryBase['where'],
}) => BuiltQuery;

export declare const makeDeleteQuery: (params: TabledQueryBase) => BuiltQuery;

export declare const selectFromArray: <T>(params: selectFromArray_rq, allRows: T[]) => T[];
