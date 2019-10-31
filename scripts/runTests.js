
require('./polyfills.js');

const RunTests = require('../src/Transpiled/RunTests.js');

console.log('Starting unit tests');
RunTests({rootPath: __dirname + '/../tests/'});
