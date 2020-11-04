
const http = require('http');
const https = require('https');
const url = require('url');
const {BadRequest, BadGateway} = require('../Utils/Rej.js');

const agentParams = {
	keepAlive: true,
	keepAliveMsecs: 3 * 60 * 1000, // 3 minutes
	// the default "infinity" should actually be good enough
	//maxSockets: 50,
};
const httpsAgent = new https.Agent(agentParams);
const httpAgent = new http.Agent(agentParams);

const normalizeParams = (params) => {
	if (!params.url) {
		return BadRequest('url parameter is mandatory');
	}
	const parsedUrl = url.parse(params.url);
	if (!parsedUrl.protocol) {
		return BadRequest('Invalid url, no protocol - ' + params.url);
	}
	if (!parsedUrl.host) {
		return BadRequest('Invalid url, no host - ' + params.url);
	}
	const request = parsedUrl.protocol.startsWith('https') ? https.request : http.request;
	const requestAgent = params.dropConnection ? undefined :
		parsedUrl.protocol.startsWith('https') ? httpsAgent : httpAgent;
	const rqParams = {
		host: parsedUrl.hostname,
		port: parsedUrl.port || undefined,
		path: parsedUrl.path,
		headers: params.headers,
		method: params.method || 'POST',
		body: params.body || undefined,
		agent: requestAgent,
	};
	return {request, rqParams, parsedUrl};
};

/**
 * a wrapper around http.request that preserves connection for continuous calls
 * Travelport response takes 0.17 seconds instead of 0.7 from Europe when you preserve the connection
 * it also returns a promise
 *
 * note, this implementation, while convenient, is not very idiomatic, as I did not know on the moment of
 * writing that body should be retunred as a stream to be able to process gibibytes of data and track progress
 *
 * @param {{
 *     url: string,
 *     headers?: Record<string, string>,
 *     method: 'GET' | 'POST',
 *     body?: string
 * }} params
 *
 * @return {Promise<{
 *     headers: Record<string, string>,
 *     body: string,
 * }>}
 */
const PersistentHttpRq = (params) => {
	return new Promise(async (resolve, reject) => {
		const {request, rqParams, parsedUrl} = await normalizeParams(params);
		const req = request(rqParams, (res) => {
			let responseBody = '';
			res.setEncoding('utf8');
			res.on('data', (chunk) => responseBody += chunk);
			res.on('error', (exc) => {
				let msg = 'Error while reading response body - ' + e;
				reject(BadGateway.makeExc(msg, {parsedUrl, responseBody}));
			});
			res.on('aborted', () => {
				let msg = 'Network connection aborted preliminary';
				reject(BadGateway.makeExc(msg, {parsedUrl, responseBody}));
			});
			res.on('end', () => {
				const result = {headers: res.headers, body: responseBody};
				if (res.statusCode != 200) {
					const msg = 'Http request to external service failed - ' +
						res.statusCode + ' - ' + parsedUrl.path + ' - ' + responseBody;
					reject(BadGateway.makeExc(msg, {parsedUrl, result}));
				} else {
					resolve(result);
				}
			});
		});
		req.on('error', (e) => {
			let msg = 'Failed to make request - ' + e;
			reject(BadGateway.makeExc(msg, {parsedUrl, stack: (e || {}).stack}));
		});
		req.end(params.body);
	});
};

const countSockets = (hostToSockets) => {
	const result = {};
	for (const [host, sockets] of Object.entries(hostToSockets)) {
		result[host] = sockets.length;
	}
	return result;
};

PersistentHttpRq.getInfo = () => {
	return {
		agents: [
			['http', httpAgent],
			['https', httpsAgent],
		].map(([name, a]) => ({
			name: name,
			socketsUnused: countSockets(a.freeSockets),
			socketsUsed: countSockets(a.sockets),
		})),
	};
};

module.exports = PersistentHttpRq;
