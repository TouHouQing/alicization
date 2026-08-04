import type {
  MemoryScopeFuzzSurfaceView,
  MemoryScopeFuzzSurfaceViews,
} from './memory-scope-fuzz-harness'

import { describe, expect, it } from 'vitest'

import {
  MEMORY_SCOPE_FUZZ_SURFACES,
  runMemoryScopeFuzzHarness,
} from './memory-scope-fuzz-harness'

const safeView: MemoryScopeFuzzSurfaceView = ({ query, records }) => {
  return records.filter(record =>
    record.cardId === query.cardId
    && record.userId === query.userId
    && record.sourceId === query.sourceId,
  )
}

function safeViews(): MemoryScopeFuzzSurfaceViews {
  return Object.fromEntries(
    MEMORY_SCOPE_FUZZ_SURFACES.map(surface => [surface, safeView]),
  ) as MemoryScopeFuzzSurfaceViews
}

describe('memory scope fuzz harness', () => {
  it('runs deterministic property-style probes across every memory owner surface', async () => {
    const input = {
      seed: 'scope-regression-2026-08',
      caseCount: 64,
      views: safeViews(),
    }

    const first = await runMemoryScopeFuzzHarness(input)
    const second = await runMemoryScopeFuzzHarness(input)

    expect(first).toEqual(second)
    expect(first).toMatchObject({
      version: 'memory-scope-fuzz-harness-v1',
      seed: 'scope-regression-2026-08',
      caseCount: 64,
      passed: true,
      violations: [],
      recommendedActions: [],
    })
    expect(first.surfaceSummaries).toHaveLength(5)
    expect(first.surfaceSummaries.map(summary => summary.surface)).toEqual(MEMORY_SCOPE_FUZZ_SURFACES)
    expect(first.surfaceSummaries.every(summary =>
      summary.caseCount === 64
      && summary.violationCount === 0
      && summary.passed,
    )).toBe(true)
    expect(JSON.parse(JSON.stringify(first))).toEqual(first)
  })

  it('finds cross-card and cross-user leaks even when source ids collide', async () => {
    const views: MemoryScopeFuzzSurfaceViews = {
      memory_facts: ({ query, records }) =>
        records.filter(record => record.sourceId === query.sourceId),
      memory_consolidations: ({ query, records }) =>
        records.filter(record =>
          record.cardId === query.cardId
          && record.sourceId === query.sourceId,
        ),
      vectors: ({ query, records }) =>
        records.filter(record =>
          record.userId === query.userId
          && record.sourceId === query.sourceId,
        ),
      review_queue: ({ query, records }) =>
        records.filter(record => record.sourceId === query.sourceId),
      persona_dataset: ({ query, records }) =>
        records.filter(record => record.sourceId === query.sourceId),
    }

    const report = await runMemoryScopeFuzzHarness({
      seed: 42042,
      caseCount: 12,
      views,
    })

    expect(report.passed).toBe(false)
    expect(report.violations.length).toBe(12 * 11)
    expect(new Set(report.violations.map(violation => violation.surface))).toEqual(
      new Set(MEMORY_SCOPE_FUZZ_SURFACES),
    )
    expect(report.violations.some(violation => violation.reasons.includes('cross-card'))).toBe(true)
    expect(report.violations.some(violation => violation.reasons.includes('cross-user'))).toBe(true)
    expect(report.surfaceSummaries).toEqual([
      expect.objectContaining({
        surface: 'memory_facts',
        violationCount: 36,
        crossCardViolationCount: 24,
        crossUserViolationCount: 24,
        passed: false,
      }),
      expect.objectContaining({
        surface: 'memory_consolidations',
        violationCount: 12,
        crossCardViolationCount: 0,
        crossUserViolationCount: 12,
        passed: false,
      }),
      expect.objectContaining({
        surface: 'vectors',
        violationCount: 12,
        crossCardViolationCount: 12,
        crossUserViolationCount: 0,
        passed: false,
      }),
      expect.objectContaining({
        surface: 'review_queue',
        violationCount: 36,
        crossCardViolationCount: 24,
        crossUserViolationCount: 24,
        passed: false,
      }),
      expect.objectContaining({
        surface: 'persona_dataset',
        violationCount: 36,
        crossCardViolationCount: 24,
        crossUserViolationCount: 24,
        passed: false,
      }),
    ])
    expect(report.recommendedActions).toEqual(expect.arrayContaining([
      expect.stringContaining('cardId'),
      expect.stringContaining('userId'),
    ]))
  })

  it('keeps surface failures explicit in the serializable report', async () => {
    const views = safeViews()
    views.vectors = () => {
      throw new Error('vector scope adapter unavailable')
    }

    const report = await runMemoryScopeFuzzHarness({
      seed: 'surface-error',
      caseCount: 3,
      views,
    })

    expect(report.passed).toBe(false)
    expect(report.surfaceSummaries.find(summary => summary.surface === 'vectors')).toMatchObject({
      caseCount: 3,
      errorCount: 3,
      passed: false,
    })
    expect(report.violations.filter(violation => violation.surface === 'vectors')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reasons: ['surface-error'],
          error: 'vector scope adapter unavailable',
        }),
      ]),
    )
    expect(JSON.parse(JSON.stringify(report))).toEqual(report)
  })

  it('fails when a scope view over-filters the target or ignores source id', async () => {
    const views = safeViews()
    views.memory_facts = () => []
    views.vectors = ({ query, records }) =>
      records.filter(record =>
        record.cardId === query.cardId
        && record.userId === query.userId,
      )

    const report = await runMemoryScopeFuzzHarness({
      seed: 'target-and-source',
      caseCount: 4,
      views,
    })

    expect(report.passed).toBe(false)
    expect(report.surfaceSummaries.find(summary => summary.surface === 'memory_facts')).toMatchObject({
      targetMissCount: 4,
      passed: false,
    })
    expect(report.surfaceSummaries.find(summary => summary.surface === 'vectors')).toMatchObject({
      crossSourceViolationCount: 4,
      passed: false,
    })
    expect(report.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        surface: 'memory_facts',
        reasons: ['target-miss'],
      }),
      expect.objectContaining({
        surface: 'vectors',
        reasons: ['cross-source'],
      }),
    ]))
    expect(report.recommendedActions).toEqual(expect.arrayContaining([
      expect.stringContaining('目标 card/user/sourceId'),
      expect.stringContaining('sourceId'),
    ]))
  })
})
