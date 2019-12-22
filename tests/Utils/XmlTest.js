const Xml = require('../../src/Utils/Xml.js');
const TestCase = require('../../src/Transpiled/Lib/TestCase.js');

const provide_call = () => {
	const testCases = [];

	testCases.push({
		title: 'real life example',
		input: Xml('PNRBFManagement_51', {}, [
			Xml('PNRBFRetrieveMods', {}, [
				Xml('CustNameInfo', {}, [
					Xml('NameType', {}, [' ']),
					Xml('CustName', {}, 'KLES'),
				]),
			]),
		]),
		output: "<PNRBFManagement_51 ><PNRBFRetrieveMods ><CustNameInfo ><NameType > </NameType><CustName >KLES</CustName></CustNameInfo></PNRBFRetrieveMods></PNRBFManagement_51>",
	});

	testCases.push({
		title: 'example with special character values',
		input: Xml('PNRBFManagement_51', {}, [
			Xml('PNRBFRetrieveMods', {}, [
				Xml('CustNameInfo', {}, [
					Xml('NameType', {badAttr: "olo\"l&234<o"}, [' ']),
					Xml('CustName', {}, 'KL</CustName>ES'),
				]),
			]),
		]),
		output: '<PNRBFManagement_51 ><PNRBFRetrieveMods ><CustNameInfo ><NameType badAttr="olo&quot;l&amp;234&lt;o"> </NameType><CustName >KL&lt;/CustName&gt;ES</CustName></CustNameInfo></PNRBFRetrieveMods></PNRBFManagement_51>',
	});

	testCases.push({
		title: 'xml string passed as one of child nodes',
		input: Xml('PNRBFManagement_51', {}, [
			Xml('PNRBFRetrieveMods', {}, [
				Xml('CustNameInfo', {}, [
					Xml('NameType', {}, [' ']),
					Xml('CustName', {}, ['K<b>LE</b>S']),
				]),
			]),
		]),
		output: "<PNRBFManagement_51 ><PNRBFRetrieveMods ><CustNameInfo ><NameType > </NameType><CustName >K<b>LE</b>S</CustName></CustNameInfo></PNRBFRetrieveMods></PNRBFManagement_51>",
	});

	return testCases.map(tc => [tc]);
};

class XmlTest extends TestCase {
	test_call({input, output}) {
		const actual = input.toString();
		this.assertEquals(output, actual);
	}

	getTestMapping() {
		return [
			[provide_call, this.test_call],
		];
	}
}

module.exports = XmlTest;