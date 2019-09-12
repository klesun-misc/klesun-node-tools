
const {getExcData} = require('../Debug.js');

let getRqBody = req => {
	const rqBody = req.body;
	const querystring = require('querystring');
	const queryStr = req.url.split('?')[1] || '';
	Object.assign(rqBody, querystring.parse(queryStr));

	return rqBody;
};

/**
 * this function maps HTTP request to an action that returns promise of a json data
 *
 * @param {function} httpAction - an action that returns a promise wrapping the json data for response
 * @return {function} - the function to pass as second argument to app.post() where app is 'express' lib instance
 */
let toHandleHttp = (httpAction) => (req, res) => {
	let rqBody = getRqBody(req);
	let rqTakenMs = Date.now();
	return Promise.resolve()
		.then(() => httpAction({rqBody, routeParams: req.params, request: req}))
		.catch(exc => {
			let excData = getExcData(exc);
			if (typeof excData === 'string') {
				excData = new Error('HTTP action failed - ' + excData);
			}
			excData.httpStatusCode = exc.httpStatusCode || 520;
			return Promise.reject(excData);
		})
		.then(result => {
			res.setHeader('Content-Type', 'application/json');
			res.status(200);
			let isObj = Object(result) === Object(result) && !Array.isArray(result);
			let withMeta = !isObj ? result : Object.assign({
				rqTakenMs: rqTakenMs,
				rsSentMs: Date.now(),
			}, result);
			res.send(JSON.stringify(withMeta));
		})
		.catch(exc => {
			exc = exc || 'Empty error ' + exc;
			res.status(exc.httpStatusCode || 500);
			res.setHeader('Content-Type', 'application/json');
			let error;
			if (exc.message) {
				// in AbstractClient error message is not string sometimes
				error = typeof exc.message === 'string' ? exc.message
					: 'data-message: ' + JSON.stringify(exc.message);
			} else {
				error = (exc + '').replace(/^Error: /, '');
			}
			let data = (exc.data || {}).passToClient ? exc.data : null;
			res.send(JSON.stringify({error: error, payload: data}));
			return Promise.reject(exc);
		});
};

exports.getRqBody = getRqBody;
exports.toHandleHttp = toHandleHttp;
