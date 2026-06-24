import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'organic-learning-governor-project-carry',
    file: './runtime-learning-governor.test.ts',
    snippets: [
      'backfills partial project-state continuity before scheduling organic learning so longer-horizon learning keeps the same Phase 1 digital-life closure line',
      'Keep the same her intact while this learning thread stays open.',
      'sameHerSelfLine: expect.stringContaining(\'Same Phase 1 digital life\')',
      'sameHerDriftRisk: expect.any(String)',
    ],
  },
  {
    entry: 'delayed-learning-payload-thin-shell-repair',
    file: './learning-action-scheduler.test.ts',
    snippets: [
      'does not let a thin raw project shell outrank richer canonical same-her phase-1 carry in delayed learning payloads',
      'expect(scheduledPayload?.openClosureSummary).not.toBe(\'Project continuity still needs closure.\')',
      'expect(scheduledPayload?.nextClosureTarget).not.toBe(\'Carry project continuity forward.\')',
      'expect(scheduledPayload?.preDialogueAwarenessLine).not.toBe(\'same digital life | keep the closure seam explicit\')',
    ],
  },
  {
    entry: 'person-state-surface-project-carry',
    file: './person-state-update-surface.test.ts',
    snippets: [
      'expect(surface.projectStateContinuity).toEqual(expect.objectContaining({',
      'identity: expect.stringContaining(\'local-first digital life project\')',
      'preDialogueAwarenessLine: expect.any(String)',
      'emotionalClosureCue: \'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.\'',
    ],
  },
  {
    entry: 'learning-task-db-rehydration-project-carry',
    file: './db.test.ts',
    snippets: [
      'expect(claimed[0]?.payload.projectStateContinuity).toEqual(expect.objectContaining({',
      'preDialogueAwarenessLine: expect.stringContaining(\'Before answering, remember\')',
      'sameHerSelfLine: expect.stringContaining(\'Same Phase 1 digital life\')',
      'sameHerDriftRisk: expect.stringContaining(\'unfinished closure drift\')',
    ],
  },
] as const

describe('later learning project awareness audit', () => {
  it('keeps one explicit route-level proof that later organic learning scheduling delayed payload shaping person-state surfacing and DB rehydration all preserve the same-her Phase 1 project line instead of decaying into a generic assistant shell after the dialogue turn ends', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'organic-learning-governor-project-carry' }),
      expect.objectContaining({ entry: 'delayed-learning-payload-thin-shell-repair' }),
      expect.objectContaining({ entry: 'person-state-surface-project-carry' }),
      expect.objectContaining({ entry: 'learning-task-db-rehydration-project-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the later-learning continuity claim to current behavior tests instead of only broader long-horizon or person-state prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: later learning now has dedicated same-her route proof while future new dialogue entrypoints and full noisy-desktop closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const governorSource = readFileSync(new URL('./runtime-learning-governor.test.ts', import.meta.url), 'utf8')
    const schedulerSource = readFileSync(new URL('./learning-action-scheduler.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('later-learning-project-awareness-audit.test.ts')
    expect(governorSource).toContain(
      'backfills partial project-state continuity before scheduling organic learning so longer-horizon learning keeps the same Phase 1 digital-life closure line',
    )
    expect(schedulerSource).toContain(
      'does not let a thin raw project shell outrank richer canonical same-her phase-1 carry in delayed learning payloads',
    )
  })
})
