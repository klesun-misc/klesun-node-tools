
type operator = '=' | '>=' | '<=' | '!=';

type condition =
    ['gds', '=', 'apollo'] |
    ['terminalNumber', '=', '2'] |
    [string, operator, string | number] |
    [string, 'IN', Array<string | number>] |
    [string, 'LIKE', string];

export interface makeSelectQuery_rq {
    table: 'cmd_rq_log' | string;
    as?: 'crl' | string;
    fields?: Array<'gds' | string>;
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
