const Xml = require('../../src/Utils/Xml.js');
const {assertSubTree} = require("../../src/Utils/Testing.js");

const provide_call = function*() {
	yield {
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
	};

	yield {
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
	};

	yield {
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
	};
};

const test_call = ({input, output}) => {
	const actual = input.toString();
	assertSubTree(output, actual);
};

const XmlTest = {
	testMapping: [
		[provide_call, test_call],
	],
}

module.exports = XmlTest;