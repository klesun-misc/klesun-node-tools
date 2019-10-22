
const Rej = require('../Rej.js');

let {escapeRegex} = require('./Misc.js');

let escCol = col => col
	.split('.')
	.map(p => '`' + p + '`')
	.join('.');

let makeConds = (dataAnds) => {
	let placedValues = [];
	let textAnds = [];
	for (let tuple of dataAnds) {
		if (tuple.length === 1) {
			// custom SQL condition, no placeholder
			textAnds.push('(' + tuple[0] + ')');
		} else {
			let [col, operator, value] = tuple;
			let escapedCol = escCol(col);
			if (operator.toUpperCase() === 'IN' ||
				operator.toUpperCase() === 'NOT IN'
			) {
				textAnds.push(escapedCol + ' ' + operator + ' (' + value
					.map(v => '?').join(', ') + ')');
				placedValues.push(...value);
			} else {
				textAnds.push(escapedCol + ' ' + operator + ' ?');
				placedValues.push(value);
			}
		}
	}
	let sql = textAnds.join(' AND ');
	return {sql, placedValues};
};

let normalizeSelectParams = (params) => {
	let {
		table, as, fields = [], join = [], where = [], whereOr = [],
		orderBy = [], limit = null, skip = null,
	} = params;

	if (whereOr.length === 0) {
		whereOr = [where];
	} else {
		// supposedly you would not use both "whereOr" and "where" at once, but
		// if you happen to, add the global "where" condition to all "or" condition
		whereOr = whereOr.map(ands => where.concat(ands));
	}

	// legacy
	if (typeof orderBy === 'string') {
		orderBy = orderBy
			.split(',')
			.map(p => p.match(/^(.+?)(\s+ASC|\s+DESC|)\s*$/))
			.map(([, expr, direction]) => [expr, direction.trim()]);
	}

	return {
		table, as, fields, join, whereOr,
		orderBy, limit, skip,
	};
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
		table, as, fields, join, whereOr,
		orderBy, limit, skip,
	} = normalizeSelectParams(params);

	let makeFields = fieldList => fieldList.length > 0 ? fieldList.join(',') : '*';

	let allPlacedValues = [];
	let sqlParts = [
		`SELECT ${makeFields(fields)} FROM ${table}` + (as ? ' AS ' + as : ''),
		join.length === 0 ? '' : join
			.map(j => ` ${j.type || ''} JOIN ${j.table}`
				+ (j.as ? ' AS ' + j.as : '')
				+ ' ON ' + j.on.map(([l, op, r]) =>
					l + ' ' + op + ' ' + r))
			.join('\n'),
	];
	if (whereOr.length > 0 && whereOr[0].length > 0) {
		let textOrs = [];
		for (let dataOr of whereOr) {
			let {sql, placedValues} = makeConds(dataOr);
			textOrs.push(sql);
			allPlacedValues.push(...placedValues);
		}
		sqlParts.push('WHERE ' + textOrs.join('\n   OR '));
	}
	if (orderBy.length > 0) {
		sqlParts.push(`ORDER BY ` + orderBy
			.map(([expr, direction]) => escCol(expr) + ' ' + (direction || ''))
			.join(', '));
	}
	if (limit) {
		sqlParts.push(`LIMIT ` + (+skip ? +skip + ', ' : '') + +limit);
	}
	let sql = sqlParts.join('\n');

	return {sql, placedValues: allPlacedValues};
};

exports.makeInsertQuery = ({table, rows, newOnly = false}) => {
	if (!rows.length) {
		let msg = 'Can not create INSERT query: supplied rows are empty';
		throw Rej.BadRequest.makeExc(msg);
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
					throw Rej.BadRequest.makeExc(error);
				} else {
					$dataToInsert.push(value);
				}
			} else {
				let error = 'No key `' + $colName + '` in the ' +
					$i + '-th row required to insert many';
				throw Rej.BadRequest.makeExc(error);
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
		newOnly ? '' :
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

exports.makeDeleteQuery = ({table, where = []}) => {
	let makeConds = ands => ands.map(([col, operator]) =>
		'`' + col + '` ' + operator + ' ?').join(' AND ');
	let sql = [
		`DELETE FROM ${table}`,
		`WHERE TRUE`,
		where.length === 0 ? '' :
			'AND ' + makeConds(where),
	].join('\n');

	let placedValues = where.map(([col, op, val]) => val);

	return {sql, placedValues};
};

let isStrLike = (str, pattern) => {
	let regexStr = '^' + pattern
		.split('%')
		.map(escapeRegex)
		.join('.*') + '$';
	return new RegExp(regexStr).test(str);
};

let isValue = (rowValue, value) => {
	if (value === null || value === undefined) {
		return rowValue === null || rowValue === undefined;
	} else {
		return value == rowValue;
	}
};

/**
 * SQL queries in unit tests, yay!
 *
 * @template T
 * @param {makeSelectQuery_rq} params
 * @param {T[]} allRows
 * @return {T[]}
 */
exports.selectFromArray = (params, allRows) => {
	let {
		table, as, fields, join, whereOr,
		orderBy, limit, skip,
	} = normalizeSelectParams(params);

	if (join.length > 0) {
		let msg = 'Attempted to use JOIN ' + JSON.stringify(join) +
			' on a collection - not supported yet (and maybe ever)';
		throw Rej.NotImplemented.makeExc(msg);
	}

	// note that it does not currently handle custom
	// expressions or joins anyhow for simplicity sake

	return allRows
		.filter(row => {
			if (whereOr.length === 0) {
				return true;
			} else {
				return whereOr.some(ands => ands
					.every(([field, op, value]) => {
						if (!(field in row)) {
							let msg = 'Attempted to filter by field ' + field +
								' not present in a row - ' + JSON.stringify(row);
							throw Rej.BadRequest.makeExc(msg);
						}
						let rowValue = row[field];
						if (op === '=') {
							return rowValue == value;
						} else if (op === '!=') {
							return rowValue != value;
						} else if (op === '>=') {
							return rowValue >= value;
						} else if (op === '>') {
							return rowValue > value;
						} else if (op === '<=') {
							return rowValue <= value;
						} else if (op === '<') {
							return rowValue < value;
						} else if (op.toUpperCase() === 'IS') {
							return isValue(rowValue, value);
						} else if (op.toUpperCase() === 'IS NOT') {
							return !isValue(rowValue, value);
						} else if (op.toUpperCase() === 'LIKE') {
							return isStrLike(rowValue, value);
						} else if (op.toUpperCase() === 'NOT LIKE') {
							return !isStrLike(rowValue, value);
						} else if (op.toUpperCase() === 'IN') {
							return value.includes(rowValue);
						} else if (op.toUpperCase() === 'NOT IN') {
							return !value.includes(rowValue);
						} else {
							let msg = 'Unsupported operator ' + op;
							throw Rej.NotImplemented.makeExc(msg);
						}
					}));
			}
		})
		.sort((aRow, bRow) => {
			for (let [field, direction = 'ASC'] of orderBy) {
				if (!(field in aRow) || !(field in bRow)) {
					let msg = 'Attempted to order by field ' + field +
						' not present in a row - ' + JSON.stringify({aRow, bRow});
					throw Rej.BadRequest.makeExc(msg);
				}
				let aVal = aRow[field];
				let bVal = bRow[field];
				let result = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
				if (result) {
					if (direction === 'DESC') {
						result = -result;
					}
					return result;
				}
			}
			return 0;
		})
		.slice(skip || 0, limit ? (skip || 0) + limit : undefined)
		.map(row => {
			if (fields.length === 0) {
				return row;
			} else {
				let result = {};
				for (let field of fields) {
					if (!(field in row)) {
						let msg = 'Attempted to return field ' + field +
							' not present in a row - ' + JSON.stringify(row);
						throw Rej.BadRequest.makeExc(msg);
					}
					result[field] = row[field];
				}
				return result;
			}
		});
};
