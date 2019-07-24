const Debug = require('../Debug.js');
const Lang = require('../Lang.js');
const DynUtils = require('../Dyn/DynUtils.js');

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

exports.escapeXml = (unsafe) =>
	unsafe.replace(/[<>&'"]/g, (c) => {
		switch (c) {
			case '<': return '&lt;';
			case '>': return '&gt;';
			case '&': return '&amp;';
			case '\'': return '&apos;';
			case '"': return '&quot;';
		}
	});

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

/** @deprecated - please use from 'Lang.js' */
exports.timeout = Lang.timeout;

/** @deprecated - please, use from DynUtils.js module */
exports.iqJson = DynUtils.iqJson;

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