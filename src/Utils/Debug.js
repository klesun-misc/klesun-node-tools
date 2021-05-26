
/**
 * keep in mind when using this, that it is not very optimal for large sets of data, since it tries
 * to JSON.stringify _every value_ to check if it's inline representation is shorter than inlineLimit
 * this can be fixed, given the time
 *
 * @param {any} $var = {"cmd":"$BB0","output":">$BB0\nNO REBOOK REQUIRED\n\n*FARE GUARANTEED AT TICKET ISSUANCE*\n\n*FARE HAS A PLATING CARRIER RESTRICTION*\nE-TKT REQUIRED\n*PENALTY APPLIES*\nLAST DATE TO PURCHASE TICKET: 23OCT19\n$BB0-1 C10MAY19     \nYVR BR X/TPE BR MNL 236.01VLXN BR X/TPE BR YVR 236.02VLXN\nNUC472.03END ROE1.334634\nFARE CAD 630.00 TAX 25.91CA TAX 20.00SQ TAX 14.20LI TAX 1.00XG\n)><","duration":"0.884114206","type":"priceItinerary","scrolledCmd":"$BB0","state":{"area":"A","pcc":"2E4T","scrolledCmd":"$BB0"}}
 * @return {string} = `{
 *     "cmd": "$BB0",
 *     "output": [
 *         ">$BB0",
 *         "NO REBOOK REQUIRED",
 *         "",
 *         "*FARE GUARANTEED AT TICKET ISSUANCE*",
 *         "",
 *         "*FARE HAS A PLATING CARRIER RESTRICTION*",
 *         "E-TKT REQUIRED",
 *         "*PENALTY APPLIES*",
 *         "LAST DATE TO PURCHASE TICKET: 23OCT19",
 *         "$BB0-1 C10MAY19     ",
 *         "YVR BR X/TPE BR MNL 236.01VLXN BR X/TPE BR YVR 236.02VLXN",
 *         "NUC472.03END ROE1.334634",
 *         "FARE CAD 630.00 TAX 25.91CA TAX 20.00SQ TAX 14.20LI TAX 1.00XG",
 *         ")><"
 *     ].join("\n"),
 *     "duration": "0.884114206",
 *     "type": "priceItinerary",
 *     "scrolledCmd": "$BB0",
 *     "state": {"area":"A","pcc":"2E4T","scrolledCmd":"$BB0"}
 * }`
 */
let jsExport = ($var, $margin, inlineLimit) => {
	"use strict";
	var ind = '    ';
	$margin = $margin || '';
	inlineLimit = inlineLimit || 64;

	let varType = typeof $var;
	if (['undefined', 'function', 'symbol'].includes(varType)) {
		return varType;
	}

	return typeof $var === 'string' && $var.match(/\r\n|\n|\r/)
			? jsExport($var.split(/\r\n|\n|\r/g), $margin, 1) + '.join("\\n")'
		: JSON.stringify($var).length < inlineLimit
			? JSON.stringify($var)
		: Array.isArray($var)
			? '[\n'
			+ $var.map((el) => $margin + ind + jsExport(el, $margin + ind, inlineLimit)).join(',\n')
			+ '\n' + $margin + ']'
		: (typeof $var === 'object' && $var !== null)
			? '{\n'
			+ Object.keys($var).map(k => $margin + ind + JSON.stringify(k) + ': ' +
				jsExport($var[k], $margin + ind, inlineLimit)).join(',\n')
			+ '\n' + $margin + '}'
		: JSON.stringify($var);
};

/**
 * similar to JSON.stringify, but shows multi-line strings
 * as ['...', '...'].join('\n') and prints small objects inline
 */
exports.jsExport = ($var, $margin = null, inlineLimit = 64) =>
	jsExport($var, $margin, inlineLimit);

exports.getExcData = (exc, moreData = null) => {
	exc = exc || '(empty error)';
	let props = {message: exc.message || exc + ''};
	if (typeof exc === 'string') {
		if (!moreData) {
			return exc;
		}
	} else {
		props = {...props, ...exc};
		props.errorClass = props.errorClass || exc.constructor.name;
		props.stack = exc.stack;
	}
	props = {...props, ...(moreData || {})};
	return props;
};
