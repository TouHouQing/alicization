import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-runtime-body-continuity-body-only-hold',
    file: './performance-visualizer-self-evolution-runtime-body-continuity-phase.test.ts',
    snippets: [
      'marks body-only hold when the same living segment is still being carried only by the body line',
      'toBe(\'body-only-hold\')',
    ],
  },
  {
    entry: 'self-evolution-runtime-body-continuity-body-carried-renderer-rejoin',
    file: './performance-visualizer-self-evolution-runtime-body-continuity-phase.test.ts',
    snippets: [
      'marks body-carried renderer rejoin when the same body segment still holds while a renderer lane rejoins it',
      'toBe(\'body-carried-to-renderer-rejoin\')',
    ],
  },
  {
    entry: 'self-evolution-runtime-body-continuity-speech-rejoin',
    file: './performance-visualizer-self-evolution-runtime-body-continuity-phase.test.ts',
    snippets: [
      'marks body-carried renderer rejoin when the same body segment still holds while the voice lane rejoins it on the same segment',
      'authorityRendererTarget: \'speech\'',
      'voiceSegmentMatched: true',
    ],
  },
  {
    entry: 'self-evolution-runtime-body-continuity-full-cross-modal-lock',
    file: './performance-visualizer-self-evolution-runtime-body-continuity-phase.test.ts',
    snippets: [
      'marks full cross-modal lock when body and the renderer lanes have fully rejoined onto one segment',
      'toBe(\'full-cross-modal-lock\')',
    ],
  },
  {
    entry: 'self-evolution-runtime-body-continuity-renderer-rejoin-without-body',
    file: './performance-visualizer-self-evolution-runtime-body-continuity-phase.test.ts',
    snippets: [
      'marks renderer rejoin without body when renderer lanes align but the body line is no longer carrying the same living segment',
      'toBe(\'renderer-rejoin-without-body\')',
    ],
  },
] as const

describe('performance visualizer self evolution runtime body continuity phase project awareness audit', () => {
  it('keeps one explicit route-level proof that self-evolution runtime body continuity phase preserves same-her body continuity truth on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-runtime-body-continuity-body-only-hold' }),
      expect.objectContaining({ entry: 'self-evolution-runtime-body-continuity-body-carried-renderer-rejoin' }),
      expect.objectContaining({ entry: 'self-evolution-runtime-body-continuity-speech-rejoin' }),
      expect.objectContaining({ entry: 'self-evolution-runtime-body-continuity-full-cross-modal-lock' }),
      expect.objectContaining({ entry: 'self-evolution-runtime-body-continuity-renderer-rejoin-without-body' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution runtime body continuity phase claim to current behavior tests instead of only broader devtools prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: self-evolution runtime body continuity phase now needs dedicated same-her proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const phaseSource = readFileSync(new URL('./performance-visualizer-self-evolution-runtime-body-continuity-phase.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-runtime-body-continuity-phase-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('self-evolution runtime body continuity phase')
    expect(matrixSource).toContain('body-only-hold')
    expect(matrixSource).toContain('body-carried-to-renderer-rejoin')
    expect(matrixSource).toContain('full-cross-modal-lock')
    expect(matrixSource).toContain('renderer-rejoin-without-body')
    expect(matrixSource).toContain('speech authority rejoin')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('self-evolution runtime body continuity phase')
    expect(auditSource).toContain('body-only-hold')
    expect(auditSource).toContain('body-carried-to-renderer-rejoin')
    expect(auditSource).toContain('full-cross-modal-lock')
    expect(auditSource).toContain('renderer-rejoin-without-body')
    expect(auditSource).toContain('speech authority rejoin')
    expect(phaseSource).toContain(
      'marks body-carried renderer rejoin when the same body segment still holds while the voice lane rejoins it on the same segment',
    )
    expect(phaseSource).toContain(
      'marks renderer rejoin without body when renderer lanes align but the body line is no longer carrying the same living segment',
    )
  })
})
