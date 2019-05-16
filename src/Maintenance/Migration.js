
const sqlNow = require("../Utils/Misc").sqlNow;
const InternalServerError = require("../Utils/Rej").InternalServerError;

/**
 * @param {{
 *     query: function(string, Array): Promise,
 *     fetchAll: function({table: string, where: Array}): Promise<Array>,
 *     writeRows: function(string, Array): Promise,
 * }} db - a master connection, see 'gds-direct-nodejs/backend/Utils.Db.js'
 *
 * @param redis - ioredis connection instance
 * @param {{
 *     name: 'GRECT/2019.05.16001-create-command-log-table',
 *     perform: function({query, fetchAll, writeRows}): Promise,
 * }[]} migrations
 */
let Migration = ({db, redis, migrations, TABLE_NAME = 'migrations'}) => {
	let logs = [];
	let log = (msg, data) => {
		logs.push({dt: new Date().toISOString(), msg, data});
	};

	let runSingle = (migration, db) => {
		let {name, perform} = migration;
		return db.fetchAll({
			table: TABLE_NAME,
			where: [['name', '=', name]],
		}).then(rows => {
			if (rows.length > 0) {
				log('Skipping migration #' + name + ' completed at ' + rows[0].dt);
				return Promise.resolve();
			} else {
				return perform(db)
					.catch(exc => {
						return InternalServerError('Migration #' + name + ' failed ' + exc);
					})
					.then(result =>
						db.writeRows(TABLE_NAME, [{
							name: name,
							dt: sqlNow(),
						}]).then(writeResult => {
							log('Executed migration #' + name, result);
							return result;
						}));
			}
		});
	};

	let runLocked = async () => {
		let migrations = migrations.slice();
		let cnt = migrations.length;
		let runNext = (db) => {
			let next = migrations.shift();
			if (!next) {
				return Promise.resolve({cnt: cnt});
			} else {
				return runSingle(next, db)
					.then(() => runNext(db));
			}
		};

		let start = (db) =>
			db.query([
				'CREATE TABLE IF NOT EXISTS ' + TABLE_NAME + ' ( ',
				'    `id` INTEGER PRIMARY KEY AUTO_INCREMENT, ',
				'    `name` VARCHAR(255) DEFAULT NULL, ',
				'    `dt`  DATETIME DEFAULT NULL, ',
				'    UNIQUE KEY `name` (`name`) ',
				') ENGINE=InnoDb DEFAULT CHARSET=utf8;',
			].join('\n'))
				.then(() => runNext(db));

		return start(db).then(result => ({result: result, logs: logs}));
	};

	return {
		run: async () => {
			// there are currently 2 supposedly equal servers
			let lockSeconds = 5 * 60; // 5 minutes
			let lockKey = 'GDS_DIRECT_LIB_MIGRATION_CLUSTER_LOCK';
			let migrationLock = await redis.set(lockKey, process.pid, 'NX', 'EX', lockSeconds);
			if (!migrationLock) {
				let lastValue = await redis.get(lockKey);
				return Promise.resolve({
					status: 'alreadyHandled',
					message: 'Migration is already being handled by other cluster ' + JSON.stringify(migrationLock) + ' lock name: ' + lockKey + ' last value: ' + lastValue,
				});
			}
			return runLocked()
				.then(async (res) => {
					let delOut = await redis.del(lockKey);
					res.delOut = delOut;
					res.status = 'executed';
					return res;
				})
				.catch((exc) => {
					redis.del(lockKey);
					return Promise.reject(exc);
				});
		},
	};
};

module.exports = Migration;