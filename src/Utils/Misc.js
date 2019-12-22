const Xml = require('./Xml.js');
const Debug = require('../Debug.js');
const Lang = require('../Lang.js');

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

/** @deprecated - use from Xml.js directly */
exports.escapeXml = Xml.escape;

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

/** @deprecated - please, use from 'Debug.js' */
exports.jsExport = Debug.jsExport;

/** @deprecated - please, use from 'Debug.js' */
exports.getExcData = Debug.getExcData;

/** @deprecated - please use from 'Lang.js' */
exports.timeout = Lang.timeout;

exports.msToSqlDt = (ms) => {
	return new Date(ms).toISOString()
		.replace('T', ' ')
		.replace('Z', '');
};

/**
 * @return string = '2019-04-10 14:02:13'
 * use this when writing to mysql DATETIME since '2019-04-10T14:02:13Z'
 * is not a valid date string since recent MariaDB versions
 */
exports.sqlNow = () => {
	return exports.msToSqlDt(Date.now());
};