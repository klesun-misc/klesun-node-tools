
export interface makeSelectQuery_rq {
    table: 'cmd_rq_log',
    as: 'crl',
    fields?: ['gds'],
    join?: [{
        type?: 'left',
        table: 'terminal_command_log',
        as: 'tcl',
        on: [['tcl.cmd_rq_id', '=', 'crl.id']],
    }],
    where?: [
        ['gds', '=', 'apollo'],
        ['terminalNumber', '=', '2']
    ],
    whereOr?: [
        [['rbsSessionId', '=', '12345']],
        [['gdsSessionDataMd5', '=', 'abcvsdadadajwnekjn']]
    ],
    orderBy?: [
        ['duration', 'ASC'],
        ['id', 'DESC']
    ],
    skip?: '0',
    limit?: '100',
}
