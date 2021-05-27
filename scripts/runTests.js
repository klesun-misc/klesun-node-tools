
require('./polyfills.js');

const SqlUtilTest = require("../tests/Utils/SqlUtilTest.js");
const XmlTest = require("../tests/Utils/XmlTest.js");
const {runTestSuites} = require("../src/Utils/Testing.js");

const Reset = "\x1b[0m";
const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";

const main = async () => {
  console.log('Starting unit tests');
  const testSuites = {
    SqlUtilTest,
    XmlTest,
  };
  let successCount = 0;
  let errorCount = 0;
  for await (const {kind, ...data} of runTestSuites(testSuites)) {
    if (kind === 'LOG') {
      process.stdout.write('\n' + data.message);
    } else if (kind === 'SUCCESS') {
      ++successCount;
      process.stdout.write(FgGreen + ' ✓' + Reset);
    } else {
      ++errorCount;
      const {error, ...rest} = data;
      console.error(FgRed + ' ✗\n      !!! ' + kind, error, '\nat', rest, Reset);
    }
  }
  process.stdout.write('\n');
  console.log('Successful tests: ' + successCount);
  console.log((errorCount > 0 ? FgRed : '') + 'Failed tests: ' + errorCount + Reset);
};

main().catch(error => {
  console.error('Tests execution script failed', error);
  process.exit(1);
});
