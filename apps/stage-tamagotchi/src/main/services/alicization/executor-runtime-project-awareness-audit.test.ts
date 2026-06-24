import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'resume-confirmed-thread-project-triad-carry',
    file: './executor-runtime.test.ts',
    snippets: [
      'keeps project identity, current phase, and still-open closure explicit when resuming a confirmed execution thread',
      'project_identity=Alicization is a local-first digital life project building one continuous "her" on the host computer.',
      'project_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      'primary_open_loop=Memory still needs stronger end-to-end closure across turns so Project identity carry remains explicit.',
      'project_awareness=Before answering, remember: Alicization is a local-first digital life project building one continuous "her"',
    ],
  },
  {
    entry: 'resume-legacy-blank-field-thin-shell-repair',
    file: './executor-runtime.test.ts',
    snippets: [
      'does not let blank legacy resume project briefing fields block richer summary-only project-state carry when redispatching a confirmed execution thread',
      'latest_landed_progress=Same-session mirror carry already survives execution preflight even after the explicit legacy slot went blank.',
      'primary_open_loop=Memory still needs stronger end-to-end closure across turns so project identity carry remains explicit before execution resumes.',
      'next_closure_target=Keep extending cross-modal same-her proof so execution, initiative, and embodiment stay on one living line.',
      'same_her_drift_risk=If blank legacy project briefing slots collapse redispatch back into a generic shell, treat that as unfinished same-her drift.',
      'project_awareness=Before answering, remember: Alicization is a local-first digital life project building one continuous "her"',
    ],
  },
] as const

describe('executor runtime project awareness audit', () => {
  it('keeps one explicit route-level proof that confirmed execution-thread resume preserves same-her project awareness before redispatch opens outward again', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'resume-confirmed-thread-project-triad-carry' }),
      expect.objectContaining({ entry: 'resume-legacy-blank-field-thin-shell-repair' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the confirmed-thread resume claim to current executor-runtime behavior tests instead of only broader execution-preflight prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: confirmed-thread execution resume now has route-level project-awareness proof, while future execution-preflight families still need explicit classification', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const runtimeSource = readFileSync(new URL('./executor-runtime.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Execution callback generation and execution-first inline replies')
    expect(matrixSource).toContain('executor-runtime-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('future execution-preflight families still need explicit classification')
    expect(coverageSource).toContain('executor-runtime-project-awareness-audit.test.ts')
    expect(runtimeSource).toContain('keeps project identity, current phase, and still-open closure explicit when resuming a confirmed execution thread')
    expect(runtimeSource).toContain(
      'does not let blank legacy resume project briefing fields block richer summary-only project-state carry when redispatching a confirmed execution thread',
    )
  })
})
