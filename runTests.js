
process.env.CONFIG_LAN = "http://intranet.dyninno.net/~aklesuns/fake_config_lan/grect/";
process.env.REDIS_CLUSTER_NAME = "some-grect-redis";

const RunTests = require('./src/Transpiled/RunTests.js');

console.log('Starting unit tests');
RunTests({rootPath: __dirname + '/tests/'});