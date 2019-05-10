
exports.getConfig = require('./Config.js').getConfig;

exports.HttpUtil = require('./Utils/HttpUtil.js');
exports.Misc = require('./Utils/Misc.js');
exports.PersistentHttpRq = require('./Utils/PersistentHttpRq.js');
exports.Rej = require('./Utils/Rej.js');
exports.SqlUtil = require('./Utils/SqlUtil.js');

exports.getTestMessage = () => {
	return 'it works!';
};
