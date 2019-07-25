
const PersistentHttpRq = require('../Utils/PersistentHttpRq.js');
const BadGateway = require("../Utils/Rej").BadGateway;
const querystring = require('querystring');

const {getEnvConfig} = require('../Config.js');
const os = require('os');

/** describe current process instance */
exports.descrProc = () => {
	let pid = process.pid;
	let pmId = process.env.pm_id;
	let hostname = os.hostname();
	let shortHostName = hostname.replace(/^(ap\d+prtr)\.dyninno\.net$/, '$1');
	let httpPort = getEnvConfig().HTTP_PORT;
	let socketPort = getEnvConfig().SOCKET_PORT;
	return shortHostName +
		':' + httpPort +
		':' + socketPort +
		'_' + pmId +
		'_' + pid;
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
	}).catch(exc => {
		exc.message = 'IQ func ' + functionName + ' - ';
		return Promise.reject(exc);
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