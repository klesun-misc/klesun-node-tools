
type operator = '=' | '>=' | '<=' | '!=';

type PlacedValue = string | number;

type condition =
    ['gds', '=', 'apollo'] |
    ['terminalNumber', '=', '2'] |
    [string, operator, PlacedValue] |
    [string, 'IN', Array<PlacedValue>] |
    [string, 'LIKE', string];

interface TargetedQueryBase {
    table: 'cmd_rq_log' | string;
    join?: Array<{
        type?: 'left' | string,
        table: 'terminal_command_log' | string,
        as: 'tcl' | string,
        on: Array<['tcl.cmd_rq_id' | string, operator, 'crl.id' | string]>,
    }>;
    where?: condition[];
    whereOr?: condition[][];
    orderBy?: Array<
      ['duration', 'ASC'] |
      ['id', 'DESC'] |
      [string, 'ASC' | 'DESC']
      >;
    skip?: '0' | number;
    limit?: '100' | number;
}

interface BuiltQuery {
    sql: string,
    placedValues: PlacedValue[],
}

export interface makeSelectQuery_rq extends TargetedQueryBase {
    as?: 'crl' | string;
    fields?: Array<'gds' | string>;
}

export declare const makeSelectQuery: (params: makeSelectQuery_rq) => BuiltQuery;

export declare const makeInsertQuery: <TRow extends Record<string, PlacedValue>>(params: {
    table: TargetedQueryBase['table'],
    rows: TRow[],
    insertType: 'insertOrUpdate' | 'replace' | 'insertOrUpdate' | 'insertNew',
}) => BuiltQuery;

export declare const makeUpdateQuery: (params: {
    table: TargetedQueryBase['table'],
    set: Record<string, PlacedValue>,
    where: TargetedQueryBase['where'],
}) => BuiltQuery;

export declare const makeDeleteQuery: (params: TargetedQueryBase) => BuiltQuery;

export declare const selectFromArray: <T>(params: makeSelectQuery_rq, allRows: T[]) => T[];
