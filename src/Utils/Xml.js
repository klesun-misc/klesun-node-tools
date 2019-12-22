
const escape = (unsafe) =>
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
 * @param {{toString()}[]|string} content - either array of other Xml()
 *     element instances or a single string value to be escaped
 *
 *     note, that even though it is possible to pass strings in the array in place of Xml() instances,
 *     this is 99.99% not what you want to do since xml entities won't be escaped in these strings
 *     (the only valid use case is when you want to inject some already generated xml string in your structure)
 */
const Xml = (tagName, attributes = {}, content = []) => {
	const normName = escape(tagName);
	const attrTokens = Object.entries(attributes).map(([k,v]) => {
		return `${escape(k)}="${escape(v)}"`;
	});
	const children = Array.isArray(content) ? content : [escape(content)];
	return {
		toString: () => `<${normName} ${attrTokens.join(' ')}>${children.join('')}</${normName}>`,
	};
};

Xml.escape = escape;

module.exports = Xml;