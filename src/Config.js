
const PersistentHttpRq = require('./Utils/PersistentHttpRq.js');

let env = process.env || {};

// set by admins in env variable
let envConfig = {
	NODE_ENV: env.NODE_ENV, // example: 'production', 'development'
	HOST: env.HOST, // example: '0.0.0.0'
	HTTP_PORT: env.HTTP_PORT, // example: 3012
	SOCKET_PORT: env.SOCKET_PORT, // example: 3022
	RANDOM_KEY: env.RANDOM_KEY,
};

let fetchDbConfig = (dbUrl) => PersistentHttpRq({
	url: dbUrl,
	method: 'GET',
	dropConnection: true,
}).then(rs => JSON.parse(rs.body)).then((body) => {
	let dbConfig = {};
	if (body['dbhost'] && body.dbhost.length) {
		dbConfig.DB_USER = body.dbuser;
		dbConfig.DB_PASS = body.dbpass;
		dbConfig.DB_NAME = body.dbname;
		// should probably support when there are more of them...
		const host = body.dbhost[0];
		const h = host.split(":");
		dbConfig.DB_HOST = h[0];
		dbConfig.DB_PORT = parseInt(h[1]);
	}
	return dbConfig;
});
let whenDbConfig = null;
let getDbConfig = () => {
	if (whenDbConfig === null) {
		const dbUrl = env.CONFIG_LAN + '/db.php?db=' + env.DB_NAME;
		whenDbConfig = fetchDbConfig(dbUrl);
	}
	return whenDbConfig;
};

let fetchRedisConfig = (redisUrl) => PersistentHttpRq({
	url: redisUrl,
	method: 'GET',
}).then(rs => JSON.parse(rs.body)).then((body) => {
	let redisConfig = {};
	if (body && body.length) {
		const t = body[0].split(':');
		redisConfig.REDIS_HOST = t[0];
		redisConfig.REDIS_PORT = parseInt(t[1]);
	}
	return redisConfig;
});
let whenRedisConfig = null;
let getRedisConfig = () => {
	if (whenRedisConfig === null) {
		const redisUrl = env.CONFIG_LAN + '/v0/redis/' + env.REDIS_CLUSTER_NAME;
		whenRedisConfig = fetchRedisConfig(redisUrl);
	}
	return whenRedisConfig;
};

let fetchExternalConfig = () => {
	const promises = [];

	promises.push(getDbConfig());
	promises.push(getRedisConfig());

	return Promise.all(promises)
		.then((configs) => Object.assign({}, ...configs));
};

let fetching = null;
exports.getConfig = async () => {
	if (fetching) {
		return fetching;
	}
	fetching = fetchExternalConfig().then((lanConfig) => {
		return Object.assign({}, envConfig, lanConfig);
	});
	return fetching;
};
exports.getEnvConfig = () => envConfig;
exports.getDbConfig = getDbConfig;
exports.getRedisConfig = getRedisConfig;