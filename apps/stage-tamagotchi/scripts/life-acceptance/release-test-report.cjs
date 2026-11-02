const assert = require('node:assert/strict')

/** A zero failed count alone does not prove that Vitest completed successfully. */
exports.assertExecutedVitestReport = function (report) {
  assert.equal(report.success, true)
  assert.ok(Number.isSafeInteger(report.numTotalTests) && report.numTotalTests > 0)
  assert.ok(Number.isSafeInteger(report.numPassedTests) && report.numPassedTests > 0)
  assert.equal(report.numFailedTests, 0)
  assert.equal(report.numFailedTestSuites, 0)
  assert.ok(Number.isSafeInteger(report.numPendingTests) && report.numPendingTests >= 0)
  assert.equal(report.numTotalTests, report.numPassedTests + report.numPendingTests)
}
