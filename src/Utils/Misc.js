
const PersistentHttpRq = require('./PersistentHttpRq.js');
const BadGateway = require("./Rej").BadGateway;
const querystring = require('querystring');

exports.hrtimeToDecimal = (hrtime) => {
	let [seconds, nanos] = hrtime;
	let rest = ('0'.repeat(9) + nanos).slice(-9);
	return seconds + '.' + rest;
};

exports.chunk = (arr, size) => {
	let chunks = [];
	for (let i = 0; i < arr.length; i += size) {
		chunks.push(arr.slice(i, i + size));
	}
	return chunks;
};

exports.escapeRegex = (str) => str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");

/**
 * @return RegExp
 *
 * to split complex regex into multiple lines, usage:
 * let regex = mkReg([
 *		/^>\$EX NAME\s+/,
 *		/(?<lastName>[A-Z][^\/]*)\//,
 *		/(?<firstName>[A-Z].*?)\s+/,
 *		/TX1\s+/,
 *		'(', mkReg([
 *			/(?<taxCurrency1>[A-Z]{3})\s+/,
 *			/(?<taxAmount1>\d*\.?\d+)\s+/,
 *			/(?<taxCode1>[A-Z0-9]{2})/,
 *		]), ')?\\s+',
 *	])
 */
exports.mkReg = (parts) => new RegExp(parts
	.map(r => typeof r === 'string' ? r : r.source)
	.join(''));

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

/**
 * @param {Promise[]} promises
 * wait till all promises are resolved or rejected, then return {resolved: [...], rejected: []}
 */
exports.allWrap = promises => new Promise((resolve) => {
	let resolved = [];
	let rejected = [];
	let checkResolved = () => {
		if (resolved.length + rejected.length === promises.length) {
			resolve({resolved, rejected});
		}
	};
	checkResolved();
	promises.forEach(p => p
		.then(result => resolved.push(result))
		.catch(exc => rejected.push(exc))
		.finally(checkResolved));
});

exports.timeout = (seconds, promise) => {
	return Promise.race([
		promise,
		new Promise((_, reject) => setTimeout(() =>
			reject(new Error('Timed out after ' + seconds + ' s.')), seconds * 1000)
		),
	]);
};

/**
 * this function makes a HTTP request to a service following the protocol created
 * by A. Prokopchuk, used across our company, common names of this protocol are:
 * "IQ JSON" (in RBS), "External Interface" (in BO), "client-component" (in CMS)...
 *
 * @return {Promise<{status: 'OK', result: *}>}
 */
exports.iqJson = async ({url, credentials, functionName, serviceName, params}) =>
	PersistentHttpRq({
		url: url,
		body: querystring.stringify({
			credentials: JSON.stringify(credentials),
			functionName: functionName,
			serviceName: serviceName || null,
			params: JSON.stringify(params || null),
		}),
		headers: {'Content-Type': 'application/x-www-form-urlencoded'},
		// I'm not sure, but it's possible that persisting connection caused RBS to be dying tonight
		// (I dunno, maybe Apache did not release resources due to keep-alive or something...)
		dropConnection: true,
	}).then(respRec => {
		let body = respRec.body;
		let resp;
		try {
			resp = JSON.parse(body);
		} catch (exc) {
			return BadGateway('Could not parse IQ service ' + functionName + ' json response - ' + body);
		}
		if (resp.status !== 'OK' || !('result' in resp)) {
			return BadGateway('Unexpected IQ service response format - ' + body, resp);
		} else {
			return Promise.resolve(resp);
		}
	});

/**
 * @return string = '2019-04-10 14:02:13'
 * use this when writing to mysql DATETIME since '2019-04-10T14:02:13Z'
 * is not a valid date string since recent MariaDB versions
 */
exports.sqlNow = () => {
	return new Date().toISOString()
		.replace('T', ' ')
		.replace('Z', '');
};