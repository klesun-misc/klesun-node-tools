
/**
 * @param {{
 *     table: 'cmd_rq_log',
 *     as: 'crl',
 *     join?: [{
 *         table: 'terminal_command_log',
 *         as: 'tcl',
 *         on: [['tcl.cmd_rq_id', '=', 'crl.id']],
 *     }],
 *     where?: [
 *         ['gds', '=', 'apollo'],
 *         ['terminalNumber', '=', '2'],
 *     ],
 *     whereOr?: [
 *         [['rbsSessionId', '=', '12345']],
 *         [['gdsSessionDataMd5', '=', 'abcvsdadadajwnekjn']],
 *     ],
 *     orderBy?: 'id DESC',
 *     skip?: '0',
 *     limit?: '100',
 * }} params
 * @return {{sql: string, placedValues: []}} like
 *   SELECT * FROM terminalBuffering
 *   WHERE gds = 'apollo' AND terminalNumber = '2'
 *     AND (rbsSessionId = '12345' OR gdsSessionDataMd5 = 'abcvsdadadajwnekjn')
 *   ORDER BY id DESC
 *   LIMIT 0, 100
 */
exports.makeSelectQuery = (params) => {
	let {
		table, as, join = [], where = [], whereOr = [],
		orderBy = null, limit = null, skip = null,
	} = params;

	let makeConds = ands => ands.map(([col, operator]) => {
		let escCol = col
			.split('.')
			.map(p => '`' + p + '`')
			.join('.');
		return escCol + ' ' + operator + ' ?';
	}).join(' AND ');

	let sql = [
		`SELECT * FROM ${table}` + (as ? ' AS ' + as : ''),
		join.length === 0 ? '' : join
			.map(j => 'JOIN ' + j.table
				+ (j.as ? ' AS ' + j.as : '')
				+ ' ON ' + j.on.map(([l, op, r]) =>
					l + ' ' + op + ' ' + r))
			.join(''),
		`WHERE TRUE`,
		where.length === 0 ? '' :
			'AND ' + makeConds(where),
		whereOr.length === 0 ? '' :
			'AND (' + (whereOr.map(or => makeConds(or)).join(' OR ')) + ')',
		!orderBy ? '' : `ORDER BY ` + orderBy,
		!limit ? '' : `LIMIT ` + (+skip ? +skip + ', ' : '') + +limit,
	].join('\n');

	let placedValues = [].concat(
		where
			.map(([col, op, val]) => val),
		whereOr.map(or => or
			.map(([col, op, val]) => val))
			.reduce((a,b) => a.concat(b), []),
	);

	return {sql, placedValues};
};

exports.makeInsertQuery = ({table, rows}) => {
	if (!rows.length) {
		throw new Error('Can not create INSERT query: supplied rows are empty');
	}
	let $colNames = Object.keys(rows[0]);
	let $dataToInsert = [];
	for (let $i = 0; $i < rows.length; ++$i) {
		let $row = rows[$i];
		for (let $colName of $colNames) {
			if ($colName in $row) {
				let value = $row[$colName];
				let primitives = ['string', 'number', 'boolean', 'undefined'];
				if (!primitives.includes(typeof value) && value !== null) {
					let error = 'Invalid insert value on key `' + $colName +
						'` in the ' + $i + '-th row - ' + (typeof value);
					throw new Error(error);
				} else {
					$dataToInsert.push(value);
				}
			} else {
				let error = 'No key `' + $colName + '` in the ' +
					$i + '-th row required to insert many';
				throw new Error(error);
			}
		}
	}

	// setup the placeholders - a fancy way to make the long "(?, ?, ?)..." string
	let $rowPlaces = '(' + new Array($colNames.length).fill('?').join(', ') + ')';
	let $allPlaces = new Array(rows.length).fill($rowPlaces).join(', ');

	let sql = [
		'INSERT',
		'INTO ' + table + ' (' + $colNames.join(', ') + ')',
		'VALUES ' + $allPlaces,
		'ON DUPLICATE KEY UPDATE ' + $colNames
			.map(($colName) => $colName + ' = VALUES(' + $colName + ')')
			.join(', '),
	].join('\n');

	return {sql, placedValues: $dataToInsert};
};

exports.makeUpdateQuery = ({table, set, where}) => {
	let makeConds = ands => ands.map(([col, operator]) =>
		'`' + col + '` ' + operator + ' ?').join(' AND ');
	let sql = [
		`UPDATE ${table}`,
		`SET ` + Object.keys(set)
			.map(col => '`' + col + '` = ?')
			.join(', '),
		`WHERE TRUE`,
		where.length === 0 ? '' :
			'AND ' + makeConds(where),
	].join('\n');

	let placedValues = []
		.concat(Object.values(set))
		.concat(where.map(([col, op, val]) => val));

	return {sql, placedValues};
};