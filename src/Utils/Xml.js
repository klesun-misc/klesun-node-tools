
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

const Xml = (tagName, attributes = {}, children = []) => {
	const normName = escape(tagName);
	const attrTokens = Object.entries(attributes).map(([k,v]) => {
		return `${escape(k)}="${escape(v)}"`;
	});
	return {
		toString: () => `<${normName} ${attrTokens.join(' ')}>${children.join('')}</${normName}>`,
	};
};

Xml.escape = escape;

module.exports = Xml;