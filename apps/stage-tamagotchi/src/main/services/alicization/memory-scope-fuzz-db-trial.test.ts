import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { runMemoryScopeFuzzDbTrial } from './memory-scope-fuzz-db-trial'

describe('memory scope fuzz DB trial', () => {
  it('runs every scope surface against isolated production repositories', async () => {
    const report = await runMemoryScopeFuzzDbTrial({
      cardId: 'scope-card',
      userId: 'scope-user',
      caseCount: 1,
      createDb: async (userDataPath, cardId) =>
        await setupAlicizationDb(userDataPath, { cardId }),
    })

    expect(report.passed, JSON.stringify(report.violations)).toBe(true)
    expect(report.caseCount).toBe(1)
    expect(report.surfaceSummaries.map(item => item.surface)).toEqual([
      'memory_facts',
      'memory_consolidations',
      'search_documents',
      'vectors',
      'review_queue',
      'persona_dataset',
    ])
    expect(report.surfaceSummaries.every(item => item.returnedRecordCount > 0)).toBe(true)
  }, 60_000)
})
