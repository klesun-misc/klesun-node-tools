
class ExpectationFailed extends Error {}

/**
 * similar to `.toMatchObject()` in jest or `assertArrayElementsSubset()` in phpunit
 *
 * checks number of elements in non-associative arrays
 * (useful if you need to test that empty array is returned for example)
 *
 * @param {*} expectedSubTree
 * @param {*} actualTree
 * @param {string} message
 * @throws {ExpectationFailed}
 */
const assertSubTree = (expectedSubTree, actualTree, message = '') => {
  if (Array.isArray(expectedSubTree)) {
    if (!Array.isArray(actualTree)) {
      throw new ExpectationFailed(message + ' expected array, got ' + typeof actualTree);
    }
    if (expectedSubTree.length !== actualTree.length) {
      throw new ExpectationFailed(message + ' expected length: ' + expectedSubTree.length + ', got ' + actualTree.length);
    }
    for (let i = 0; i < expectedSubTree.length; ++i) {
      assertSubTree(expectedSubTree[i], actualTree[i], message + '[' + i + ']');
    }
  } else if (expectedSubTree !== null && typeof expectedSubTree === 'object') {
    if (actualTree === null) {
      throw new ExpectationFailed(message + ' expected object, got null');
    }
    if (typeof actualTree !== 'object') {
      throw new ExpectationFailed(message + ' expected object, got ' + typeof actualTree);
    }
    for (const [key, value] of Object.entries(expectedSubTree)) {
      if (value === undefined) {
        continue;
      }
      if (!(key in actualTree)) {
        throw new ExpectationFailed(message + ' missing expected key: ' + key);
      }
      assertSubTree(value, actualTree[key], message + '[' + key + ']');
    }
  } else {
    if (expectedSubTree !== actualTree) {
      if (typeof expectedSubTree === 'string' && typeof actualTree === 'string') {
        throw new ExpectationFailed(
            message + ' expected (+) != actual (-)\n' +
            expectedSubTree.split('\n').map(l => '+ ' + l).join('\n') + '\n' +
            actualTree.split('\n').map(l => '- ' + l).join('\n')
        );
      } else {
        throw new ExpectationFailed(message + ' expected ' + expectedSubTree + ', got ' + actualTree);
      }
    }
  }
};

/**
 * @template TTestCase
 * @typedef {[
 *     function(): Promise<Iterable<TTestCase>> | Iterable<TTestCase>,
 *     function(TTestCase): Promise<void> | void,
 * ]} TestMappingEntry
 */

/**
 * @param {Record<string, {
 *     testMapping: TestMappingEntry[],
 * }>} testSuites
 */
const runTestSuites = async function*(testSuites) {
  for (const [suiteName, testSuite] of Object.entries(testSuites)) {
    yield {kind: 'LOG', message: 'Processing test suite: ' + suiteName};
    for (let i = 0; i < testSuite.testMapping.length; ++i) {
      const [provider, test] = testSuite.testMapping[i];
      const testTitle = test.name || '#' + i;
      yield {kind: 'LOG', message: '  Processing test - ' + testTitle};
      let testCases;
      try {
        testCases = await provider();
      } catch (error) {
        yield {
          kind: 'PROVIDER_FAILURE',
          suiteName, testTitle, error,
        };
        continue;
      }
      let j = 0;
      for (const testCase of testCases) {
        const testCaseTitle = testCase?.title || '#' + j;
        yield {kind: 'LOG', message: '    Processing test case - ' + testCaseTitle};
        try {
          await test(testCase);
          yield {kind: 'SUCCESS'};
        } catch (error) {
          yield {
            kind: 'TEST_FAILURE',
            suiteName, testCaseTitle, testCaseNumber: j, error,
          };
        }
        ++j;
      }
    }
  }
}

exports.assertSubTree = assertSubTree;
exports.runTestSuites = runTestSuites;

exports.ExpectationFailed = ExpectationFailed;