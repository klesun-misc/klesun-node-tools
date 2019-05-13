
const {getExcData} = require('../Utils/Misc.js');

let getRqBody = req => {
	let rqBody = req.body;
	if (Object.keys(rqBody).length === 0) {
		let querystring = require('querystring');
		let queryStr = req.url.split('?')[1] || '';
		rqBody = querystring.parse(queryStr);
	}
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
		.then(() => httpAction({rqBody, routeParams: req.params}))
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
			res.send(JSON.stringify(Object.assign({
				rqTakenMs: rqTakenMs,
				rsSentMs: Date.now(),
				message: 'GRECT HTTP OK',
			}, result)));
		})
		.catch(exc => {
			exc = exc || 'Empty error ' + exc;
			res.status(exc.httpStatusCode || 500);
			res.setHeader('Content-Type', 'application/json');
			res.send(JSON.stringify({error: (exc.message || exc + '').replace(/^Error: /, '')}));
			return Promise.reject(exc);
		});
};

exports.getRqBody = getRqBody;
exports.toHandleHttp = toHandleHttp;