
let makeConds = (dataAnds) => {
	let placedValues = [];
	let textAnds = [];
	for (let tuple of dataAnds) {
		if (tuple.length === 1) {
			// custom SQL condition, no placeholder
			textAnds.push(tuple[0]);
		} else {
			let [col, operator, value] = tuple;
			let escCol = col
				.split('.')
				.map(p => '`' + p + '`')
				.join('.');
			textAnds.push(escCol + ' ' + operator + ' ?');
			placedValues.push(value);
		}
	}
	let sql = textAnds.join(' AND ');
	return {sql, placedValues};
};

/**
 * @param {makeSelectQuery_rq} params
 * @return {{sql: string, placedValues: []}} like
 *   SELECT * FROM terminalBuffering
 *   WHERE gds = 'apollo' AND terminalNumber = '2'
 *     AND (rbsSessionId = '12345' OR gdsSessionDataMd5 = 'abcvsdadadajwnekjn')
 *   ORDER BY id DESC
 *   LIMIT 0, 100
 */
exports.makeSelectQuery = (params) => {
	let {
		table, as, fields = [], join = [], where = [], whereOr = [],
		orderBy = null, limit = null, skip = null,
	} = params;

	let makeFields = fieldList => fieldList.length > 0 ? fieldList.join(',') : '*';

	let allPlacedValues = [];
	let sqlParts = [
		`SELECT ${makeFields(fields)} FROM ${table}` + (as ? ' AS ' + as : ''),
		join.length === 0 ? '' : join
			.map(j => ` ${j.type || ''} JOIN ${j.table}`
				+ (j.as ? ' AS ' + j.as : '')
				+ ' ON ' + j.on.map(([l, op, r]) =>
					l + ' ' + op + ' ' + r))
			.join(''),
		`WHERE TRUE`,
	];
	if (where.length > 0) {
		let {sql, placedValues} = makeConds(where);
		allPlacedValues.push(...placedValues);
		sqlParts.push('AND ' + sql);
	}
	if (whereOr.length > 0) {
		let textOrs = [];
		for (let dataOr of whereOr) {
			let {sql, placedValues} = makeConds(dataOr);
			textOrs.push(sql);
			allPlacedValues.push(...placedValues);
		}
		sqlParts.push('AND (' + textOrs.join(' OR ') + ')');
	}
	if (orderBy) {
		sqlParts.push(`ORDER BY ` + orderBy);
	}
	if (limit) {
		sqlParts.push(`LIMIT ` + (+skip ? +skip + ', ' : '') + +limit);
	}
	let sql = sqlParts.join('\n');

	return {sql, placedValues: allPlacedValues};
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