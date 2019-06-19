
/**
 * this module provides core helper functions that extend the
 * language constructions, somehow similar to 'std' lib in C
 *
 * will mostly work with promises I guess
 */

/**
 * @template T
 * @param {function(Error): T} defaultValueFunc
 * @param {{httpStatusCode}[]} allowedKinds - Rej.* http status codes
 * @return {function(Error): Promise<T>} - resolve if exc was created with Rej.* and it's
 *           status is in allowedStatuses, otherwise reject with original exc
 * supposed to be used with promise.catch(coverExc([Rej.NotFound], () => null)) to catch particular kinds of exceptions
 */
exports.coverExc = (allowedKinds, defaultValueFunc) => {
	return (exc) => {
		let allowedCodes = allowedKinds.map(r => r.httpStatusCode);
		if (exc && allowedCodes.includes(exc.httpStatusCode)) {
			return Promise.resolve()
				.then(() => defaultValueFunc(exc));
		} else {
			return Promise.reject(exc);
		}
	};
};

/**
 * @param {Promise[]} promises
 * wait till all promises are resolved or rejected, then return {resolved: [...], rejected: []}
 */
exports.allWrap = promises => new Promise((resolve) => {
	let resolved = [];
	let rejected = [];
	let checkResolved = () => {
		if (resolved.length + rejected.length === promises.length) {
			resolve({resolved, rejected});
		}
	};
	checkResolved();
	promises.forEach(p => p
		.then(result => resolved.push(result))
		.catch(exc => rejected.push(exc))
		.finally(checkResolved));
});