import { createRequire } from 'node:module'

import { expect, it } from 'vitest'

const { assertExecutedVitestReport } = createRequire(import.meta.url)('../../../../../scripts/life-acceptance/release-test-report.cjs')
const report = { success: true, numTotalTests: 10, numPassedTests: 9, numPendingTests: 1, numFailedTests: 0, numFailedTestSuites: 0 }

it('accepts executed passing tests while keeping explicit skips separate', () => {
  expect(() => assertExecutedVitestReport(report)).not.toThrow()
})

it.each([
  { success: false },
  { success: undefined },
  { numTotalTests: 0, numPassedTests: 0, numPendingTests: 0 },
  { numTotalTests: 10, numPassedTests: 0, numPendingTests: 10 },
  { numFailedTests: 1 },
  { numFailedTestSuites: 1 },
  { numPassedTests: 10 },
  { numPendingTests: -1 },
])('rejects incomplete, skipped-only or unsuccessful evidence: %j', (change) => {
  expect(() => assertExecutedVitestReport({ ...report, ...change })).toThrow()
})
