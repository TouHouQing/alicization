import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'mind-state-seed-motive-project-bridge',
    file: './runtime-mind-state-project-awareness-regression.test.ts',
    snippets: [
      're-expands a thin runtime project-state shell into canonical same-her Phase 1 closure cues before mind-state gateway prompts are generated',
      'expect(projectState.preDialogueAwarenessLine).toContain(\'Same Phase 1 digital life\')',
      'expect(projectState.sameHerSelfLine).toContain(\'Same Phase 1 digital life\')',
      'expect(projectState.nextClosureTarget.length).toBeGreaterThan(20)',
    ],
  },
  {
    entry: 'motive-engine-phase1-open-loop-pressure',
    file: './motive-engine.test.ts',
    snippets: [
      'raises return and boundary motive pressure while lowering companionship when Phase 1 digital-life closure is still open',
      'agenda.sourceTags.includes(\'project-state\')',
      'agenda.sourceTags.includes(\'same-her-closure-direction\')',
      'expect(motive.narrative).toContain(\'project-phase1-life-loop:open\')',
    ],
  },
  {
    entry: 'motive-engine-autobiographical-project-carry',
    file: './motive-engine.test.ts',
    snippets: [
      'turns autobiographical project carry into a durable return motive instead of leaving it as self-description only',
      'expect(motive.backgroundAgendas.some(agenda => agenda.sourceTags.includes(\'project-state-carry\'))).toBe(true)',
      'expect(motive.backgroundAgendas.some(agenda => agenda.summary.includes(\'same living line\'))).toBe(true)',
      'expect(motive.narrative).toContain(\'autobiographical-project-carry:active\')',
    ],
  },
  {
    entry: 'motive-engine-canonical-project-state-fallback',
    file: './motive-engine.test.ts',
    snippets: [
      'falls back to the canonical project-state snapshot when motive project-state inputs arrive thin, so the durable agenda still tracks the same open Phase 1 line',
      'expect(motive.backgroundAgendas.some(agenda => agenda.sourceTags.includes(\'project-state-carry\'))).toBe(true)',
      'expect(motive.backgroundAgendas.some(agenda => agenda.summary.includes(\'same living line\'))).toBe(true)',
      'expect(brief.sameHerSelfLine).toContain(\'same living line\')',
    ],
  },
  {
    entry: 'motive-engine-resume-confirmation-boundary-restraint',
    file: './motive-engine.test.ts',
    snippets: [
      'turns remembered host-confirmed resume confirmation into explicit boundary-restraint motive instead of generic open-loop pressure',
      'agenda.sourceTags.includes(\'resume-confirmation-boundary\')',
      'expect(motive.drives.boundaryRespect).toBeGreaterThan(0.58)',
      'expect(resumeBoundaryAgenda?.summary.toLowerCase()).toContain(\'not permanent execution permission\')',
      'expect(resumeBoundaryAgenda?.summary.toLowerCase()).toContain(\'new boundary\')',
    ],
  },
] as const

describe('motive engine project awareness audit', () => {
  it('keeps one explicit route-level proof that earliest motive seeding keeps same-her Phase 1 project pressure explicit before later initiative reasoning widens outward', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'mind-state-seed-motive-project-bridge' }),
      expect.objectContaining({ entry: 'motive-engine-phase1-open-loop-pressure' }),
      expect.objectContaining({ entry: 'motive-engine-autobiographical-project-carry' }),
      expect.objectContaining({ entry: 'motive-engine-canonical-project-state-fallback' }),
      expect.objectContaining({ entry: 'motive-engine-resume-confirmation-boundary-restraint' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the motive-engine same-her pressure claim to current behavior tests instead of only broader initiative or prompt-era prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: motive seeding now has dedicated same-her route proof while future new dialogue entrypoints and full noisy-desktop closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const motiveSource = readFileSync(new URL('./motive-engine.test.ts', import.meta.url), 'utf8')
    const mindStateSource = readFileSync(new URL('./runtime-mind-state-project-awareness-regression.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('motive-engine-project-awareness-audit.test.ts')
    expect(motiveSource).toContain(
      'raises return and boundary motive pressure while lowering companionship when Phase 1 digital-life closure is still open',
    )
    expect(motiveSource).toContain(
      'falls back to the canonical project-state snapshot when motive project-state inputs arrive thin, so the durable agenda still tracks the same open Phase 1 line',
    )
    expect(motiveSource).toContain(
      'turns remembered host-confirmed resume confirmation into explicit boundary-restraint motive instead of generic open-loop pressure',
    )
    expect(mindStateSource).toContain(
      're-expands a thin runtime project-state shell into canonical same-her Phase 1 closure cues before mind-state gateway prompts are generated',
    )
  })
})
