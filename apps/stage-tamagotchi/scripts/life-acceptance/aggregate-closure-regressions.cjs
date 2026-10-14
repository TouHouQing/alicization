const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')
const process = require('node:process')

async function main() {
  const workspace = path.resolve(__dirname, '../../../..')
  const reportFiles = [
    'life-closure-regressions.json',
    ...[1, 2, 3, 4].map(batch => `life-closure-recovery-batch-${batch}.json`),
    'life-closure-timeout-recheck.json',
    'life-closure-feedback-regression.json',
    'life-closure-file-edits-fixed-tests.json',
    'life-closure-speech-and-continuity-tests.json',
    'life-closure-final-speech-cleanup-tests.json',
    'life-closure-presentation-outbox-tests.json',
    'life-closure-main-meta-final-tests.json',
    'life-closure-host-quiet-read-tests.json',
    'life-closure-latest-boundary-read-tests.json',
    'life-closure-immediate-care-tests.json',
    'life-closure-card-embodiment-tests.json',
    'life-closure-card-final-tests.json',
    'life-closure-presentation-scope-first-tests.json',
    'life-closure-presentation-scope-tests.json',
    'life-closure-quiet-time-first-tests.json',
    'life-closure-quiet-time-tests.json',
    'life-closure-event-port-tests.json',
    'life-closure-audit-quotes-tests.json',
    'life-closure-audit-quotes-fixed-tests.json',
    'life-closure-memory-outcome-tests.json',
    'life-closure-action-refresh-tests.json',
    'life-closure-action-refresh-fixed-tests.json',
    'life-closure-action-life-regression.json',
    'life-closure-tool-outcome-speech-tests.json',
    'life-closure-negative-context-tests.json',
    'life-closure-negative-context-fixed-tests.json',
    'life-closure-tool-speech-invalid-tests.json',
    'life-closure-budget-diagnostic-tests.json',
    'life-closure-file-perception-tests.json',
    'life-closure-preference-ack-regression.json',
    'life-closure-current-historical-recall-tests.json',
    'life-closure-provider-memory-snapshot-tests.json',
    'life-closure-provider-memory-snapshot-fixed-tests.json',
    'life-closure-memory-final-budget-tests.json',
  ]
  const reports = await Promise.all(reportFiles.map(async (name) => {
    const bytes = await fs.readFile(path.join(workspace, 'output', name))
    const report = JSON.parse(bytes)
    return { name, report, sha256: createHash('sha256').update(bytes).digest('hex') }
  }))
  reports.sort((a, b) => a.report.startTime - b.report.startTime)
  const files = new Map()
  const history = []
  for (const { name, report, sha256 } of reports) {
    history.push({ path: `output/${name}`, sha256, failedTests: report.numFailedTests, failedSuites: report.numFailedTestSuites })
    for (const suite of report.testResults) {
      const file = path.relative(workspace, suite.name).replaceAll('\\', '/')
      assert.ok(!file.startsWith('../'), 'Only workspace tests belong in this matrix')
      const entry = files.get(file) ?? { file, assertions: new Map(), importFailure: null, reports: [] }
      entry.reports.push(`output/${name}`)
      if (suite.status === 'failed' && suite.assertionResults.length === 0)
        entry.importFailure = { report: name, message: suite.message }
      // A loaded, intentionally skipped suite repairs import failure, while its assertions remain skipped.
      if (suite.status === 'passed' && !suite.message && suite.assertionResults.length > 0)
        entry.importFailure = null
      const occurrences = new Map()
      for (const result of suite.assertionResults) {
        const ordinal = (occurrences.get(result.fullName) ?? 0) + 1
        occurrences.set(result.fullName, ordinal)
        const key = `${result.fullName}#${ordinal}`
        const previous = entry.assertions.get(key)
        // A name-filtered rerun does not erase an earlier executed verdict.
        if (['skipped', 'pending', 'todo'].includes(result.status) && previous && ['passed', 'failed'].includes(previous.status))
          continue
        entry.assertions.set(key, { name: result.fullName, ordinal, status: result.status, report: `output/${name}` })
      }
      files.set(file, entry)
    }
  }
  const results = [...files.values()].sort((a, b) => a.file.localeCompare(b.file)).map(entry => ({ ...entry, assertions: [...entry.assertions.values()] }))
  const assertions = results.flatMap(entry => entry.assertions)
  const unresolved = results.filter(entry => entry.importFailure || entry.assertions.some(result => result.status === 'failed'))
  const report = {
    format: 'life-regression-latest-verdict-matrix-v1',
    createdAt: new Date().toISOString(),
    scope: 'Deduplicated executed verdicts from broad regression, import recovery batches and subsequent targeted fixes. Original failed runs are retained, not reported as passing.',
    numTotalTestSuites: results.length,
    numFailedTestSuites: unresolved.length,
    numTotalTests: assertions.length,
    numPassedTests: assertions.filter(result => result.status === 'passed').length,
    numFailedTests: assertions.filter(result => result.status === 'failed').length,
    numPendingTests: assertions.filter(result => !['passed', 'failed'].includes(result.status)).length,
    success: unresolved.length === 0,
    history,
    files: results,
  }
  const target = path.join(workspace, 'output/life-closure-regression-matrix.json')
  await fs.writeFile(target, JSON.stringify(report, null, 2))
  console.info(JSON.stringify({ report: target, files: results.length, passed: report.numPassedTests, skipped: report.numPendingTests, failed: report.numFailedTests, unresolved: unresolved.map(entry => entry.file) }))
  assert.equal(unresolved.length, 0, 'Every failed assertion needs a later pass and every failed import needs a later loaded suite')
}
main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
