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

