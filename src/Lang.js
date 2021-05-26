
/**
 * this module provides core helper functions that extend the
 * language constructions, somehow similar to 'std' lib in C
 *
 * will mostly work with promises I guess
 */

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

/**
 * @template T
 * @param {function(): Promise<T>} fetchValue
 * @return {function(): Promise<T>}
 */
exports.onDemand = fetchValue => {
	let whenValue = null;
	return () => {
		if (whenValue === null) {
			whenValue = Promise.resolve()
				.then(fetchValue);
		}
		return whenValue;
	};
};

exports.timeout = (seconds, promise) => {
	return Promise.race([
		promise,
		new Promise((_, reject) => setTimeout(() => {
			let msg = 'Timed out after ' + seconds + ' s.';
			return reject(Rej.RequestTimeout.makeExc(msg));
		}, seconds * 1000)),
	]);
};
