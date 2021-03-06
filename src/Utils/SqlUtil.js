
const {escapeRegex} = require('./Misc.js');

const escCol = col => col
	.split('.')
	.map(p => {
		if (p.includes('`')) {
			// too lazy to write proper escaping
			throw new Error('Backticks in column names are not supported');
		}
		return '`' + p + '`';
	})
	.join('.');

const makeCond = (tuple, level = 0) => {
	if (level > 100) {
		// could also use level for pretty printing...
		const msg = 'Circular references in SQL condition tree';
		throw new Error(msg);
	}
	if (!Array.isArray(tuple) && tuple.sql) {
		return {
			sql: '(' + tuple.sql + ')',
			placedValues: tuple.placedValues || [],
			needsParentheses: false,
		};
	} else if (tuple.length === 2) {
		// parentheses
		const [operator, operands] = tuple;
		const conds = operands
			.map(op => makeCond(op, level + 1))
			.filter(c => c.sql);
		if (conds.length === 1) {
			return conds[0];
		} else {
			return {
				sql: conds
					.map(c => c.needsParentheses
						? '(' + c.sql + ')' : c.sql)
					.join(' ' + operator + ' '),
				placedValues: conds.flatMap(c => c.placedValues),
				needsParentheses: true,
			};
		}
	} else if (tuple.length === 3) {
		// plain condition
		const [col, operator, value] = tuple;
		const escapedCol = escCol(col);
		const textAnds = [];
		const placedValues = [];
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
		let sql;
		if (textAnds.length === 0) {
			sql = ''; // empty condition, equivalent to TRUE
		} else if (textAnds.length === 1) {
			sql = textAnds[0];
		} else {
			sql = textAnds.join(' AND ');
		}
		return {
			sql, placedValues,
			needsParentheses: textAnds.length > 1,
		};
	} else {
		throw new Error('Unexpected condition tuple length: ' + tuple.length);
	}
};

const normalizeSelectParams = (params) => {
	let {
		table, as, fields = [], join = [], where = null,
		orderBy = [], groupBy = [], limit = null, skip = null,
	} = params;

	return {
		table, as, fields, join, where,
		orderBy, groupBy, limit, skip,
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
		table, as, fields, join, where,
		orderBy, groupBy, limit, skip,
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
	if (where) {
		let {sql, placedValues} = makeCond(where);
		if (sql) {
			allPlacedValues.push(...placedValues);
			sqlParts.push('WHERE ' + sql);
		}
	}
	if (groupBy.length > 0) {
		sqlParts.push('GROUP BY ' + groupBy.map(escCol).join(', '));
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

exports.makeInsertQuery = ({table, rows, insertType = 'insertOrUpdate', syntax = 'mysql'}) => {
	if (!rows.length) {
		let msg = 'Can not create INSERT query: supplied rows are empty';
		throw new Error(msg);
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
		insertType === 'replace' ? 'REPLACE' : 'INSERT',
		'INTO ' + table + ' (' + $colNames.join(', ') + ')',
		'VALUES ' + $allPlaces,
		insertType !== 'insertOrUpdate' ? '' :
			'ON DUPLICATE KEY UPDATE ' + $colNames
				.map(($colName) => $colName + ' = VALUES(' + $colName + ')')
				.join(', '),
	].join('\n');

	return {sql, placedValues: $dataToInsert};
};

exports.makeUpdateQuery = ({table, set, where}) => {
	let makeConds = ands => ands.map(([col, operator]) =>
		escCol(col) + ' ' + operator + ' ?').join(' AND ');
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

exports.makeDeleteQuery = (params) => {
	const {table, where = null} = normalizeSelectParams(params);
	const sqlParts = [`DELETE FROM ${table}`];
	const allPlacedValues = [];
	if (where) {
		const {sql, placedValues} = makeCond(where);
		allPlacedValues.push(...placedValues);
		sqlParts.push('WHERE ' + sql);
	}
	return {sql: sqlParts.join('\n'), placedValues: allPlacedValues};
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

const matchesCondition = (row, condTuple, level = 0) => {
	if (level > 100) {
		// probably should better check occurrences instead of depth limit
		const msg = 'Circular references in SQL condition tree';
		throw new Error(msg);
	}
	if (typeof condTuple === 'string') {
		throw new Error('Raw WHERE conditions not supported in array emulation: ' + condTuple);
	} else if (condTuple.length === 1) {
		const msg = 'Attempted to use custom SQL in array filtering';
		throw new Error(msg, condTuple);
	} else if (condTuple.length === 2) {
		const [operator, operands] = condTuple;
		if (operator.toUpperCase() === 'AND') {
			return operands.every(op => matchesCondition(row, op, level + 1));
		} else if ((operator.toUpperCase() === 'OR')) {
			return operands.some(op => matchesCondition(row, op, level + 1));
		} else {
			const msg = 'Unsupported conjunction operator - ' + operator;
			throw new Error(msg, condTuple);
		}
	} else {
		const [field, op, value] = condTuple;
		if (!(field in row)) {
			let msg = 'Attempted to filter by field ' + field +
				' not present in a row - ' + JSON.stringify(row);
			throw new Error(msg, condTuple);
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
			let msg = 'Unsupported field operator ' + op;
			throw new Error(msg);
		}
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
		table, as, fields, join, where,
		orderBy, groupBy, limit, skip,
	} = normalizeSelectParams(params);

	if (join.length > 0) {
		let msg = 'Attempted to use JOIN ' + JSON.stringify(join) +
			' on a collection - not supported yet (and maybe ever)';
		throw new Error(msg);
	}

	// note that it does not currently handle custom
	// expressions or joins anyhow for simplicity sake

	const occurrences = new Set();
	return allRows
		.filter(row => !where || matchesCondition(row, where))
		.filter(row => {
			if (groupBy.length > 0) {
				const occurrence = JSON.stringify(groupBy.map(f => row[f]));
				if (occurrences.has(occurrence)) {
					return false;
				}
				occurrences.add(occurrence);
			}
			return true;
		})
		.sort((aRow, bRow) => {
			for (let [field, direction = 'ASC'] of orderBy) {
				if (!(field in aRow) || !(field in bRow)) {
					let msg = 'Attempted to order by field ' + field +
						' not present in a row - ' + JSON.stringify({aRow, bRow});
					throw new Error(msg);
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
						throw new Error(msg);
					}
					result[field] = row[field];
				}
				return result;
			}
		});
};
