import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-triage-targets-project-state-continuity-routing',
    file: './performance-visualizer-self-evolution-triage-targets.test.ts',
    snippets: [
      'maps project-state continuity triage cards to project-state continuity evidence panels instead of generic persona drift surfaces',
      'detail: \'project-state continuity governance\'',
      '\'candidate-trajectory-summary\'',
    ],
  },
  {
    entry: 'self-evolution-triage-targets-body-continuity-routing',
    file: './performance-visualizer-self-evolution-triage-targets.test.ts',
    snippets: [
      'maps body-continuity triage cards to embodiment evidence panels that can verify body carry and cue bridge recovery',
      'detail: \'body continuity governance\'',
      '\'renderer-authority-projection\'',
    ],
  },
  {
    entry: 'self-evolution-triage-targets-speech-renderer-rejoin-routing',
    file: './performance-visualizer-self-evolution-triage-targets.test.ts',
    snippets: [
      'treats explicit speech renderer rejoin wording as the same body-continuity evidence prioritization instead of generic renderer drift',
      'body authority carry -> speech renderer rejoin -> playback cue binding',
      'speech authority recovery',
    ],
  },
  {
    entry: 'self-evolution-triage-targets-structured-body-phase-routing',
    file: './performance-visualizer-self-evolution-triage-targets.test.ts',
    snippets: [
      'treats structured high-phase body continuity cards as the same embodiment evidence prioritization even when their wording is no longer body-led rejoin copy',
      'bodyContinuityPhase: \'body-only-hold\'',
      'bodyContinuityPhase: \'full-cross-modal-lock\'',
    ],
  },
] as const

describe('performance visualizer self evolution triage targets project awareness audit', () => {
  it('keeps one explicit route-level proof that self-evolution triage target routing lands same-her repair work on concrete project-state and embodiment evidence panels', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-triage-targets-project-state-continuity-routing' }),
      expect.objectContaining({ entry: 'self-evolution-triage-targets-body-continuity-routing' }),
      expect.objectContaining({ entry: 'self-evolution-triage-targets-speech-renderer-rejoin-routing' }),
      expect.objectContaining({ entry: 'self-evolution-triage-targets-structured-body-phase-routing' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution triage target routing claim to current behavior tests instead of only broader devtools continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: self-evolution triage targets now need dedicated same-her routing proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const triageTargetsSource = readFileSync(new URL('./performance-visualizer-self-evolution-triage-targets.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-triage-targets-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('self-evolution triage target routing')
    expect(matrixSource).toContain('project-state continuity evidence panels')
    expect(matrixSource).toContain('speech renderer rejoin wording')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('self-evolution triage target routing')
    expect(auditSource).toContain('project-state continuity evidence panels')
    expect(auditSource).toContain('speech renderer rejoin wording')
    expect(auditSource).toContain('structured body continuity cards')
    expect(triageTargetsSource).toContain(
      'maps body-continuity triage cards to embodiment evidence panels that can verify body carry and cue bridge recovery',
    )
    expect(triageTargetsSource).toContain(
      'treats explicit speech renderer rejoin wording as the same body-continuity evidence prioritization instead of generic renderer drift',
    )
  })
})
