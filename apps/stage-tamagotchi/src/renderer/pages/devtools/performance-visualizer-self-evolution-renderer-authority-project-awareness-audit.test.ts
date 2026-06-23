import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-renderer-authority-full-cross-modal-lock',
    file: './performance-visualizer-self-evolution-renderer-authority.test.ts',
    snippets: [
      'keeps the concrete renderer surface attached when body continuity has already re-locked with live2d on the same living segment',
      'expect(projection?.bodyContinuityPhase).toBe(\'full-cross-modal-lock\')',
      'Body continuity and Live2D manifestation are now locked back onto the same living segment together, so voice, face, motion, and lipsync are re-forming one explicit same-her embodiment line instead of merely approximating it.',
    ],
  },
  {
    entry: 'self-evolution-renderer-authority-body-carried-rejoin',
    file: './performance-visualizer-self-evolution-renderer-authority.test.ts',
    snippets: [
      'projects body-led renderer rejoin as same-her continuity instead of generic drift when body and a renderer lane stay on the same segment',
      'expect(projection?.bodyContinuityPhase).toBe(\'body-carried-to-renderer-rejoin\')',
      'Body continuity is still carrying the same living segment while Live2D manifestation rejoins that exact line, so the visible renderer recovery is a same-her manifestation repair instead of a fresh shell takeover.',
    ],
  },
  {
    entry: 'self-evolution-renderer-authority-audible-body-carry',
    file: './performance-visualizer-self-evolution-renderer-authority.test.ts',
    snippets: [
      'keeps audible body-carried same-her continuity visible in self-evolution renderer authority projection when body lipsync and voice still hold one living segment',
      'driverExecutionSummary: \'body=measured-return seg=segment-audible-body-self-evolution-1 | lipsync=energy-phoneme-hybrid phase=playing seg=segment-audible-body-self-evolution-1 | closure=audible-body-carry\'',
      'expect(projection?.matchedSignals).toContain(\'authority-voice:yes\')',
      'expect(projection?.matchedSignals).toContain(\'lane=lipsync+voice-only\')',
    ],
  },
  {
    entry: 'self-evolution-renderer-authority-renderer-rejoin-without-body-drift-risk',
    file: './performance-visualizer-self-evolution-renderer-authority.test.ts',
    snippets: [
      'treats body-segment authority loss as real drift because same-her continuity is broken before renderer lanes can meaningfully rejoin',
      'expect(projection?.bodyContinuityPhase).toBe(\'renderer-rejoin-without-body\')',
      'Renderer lanes have rejoined on VRM manifestation, but the body line is no longer carrying that same living segment, so the visible recovery should still be treated as same-her drift risk rather than a completed embodiment repair.',
    ],
  },
  {
    entry: 'self-evolution-renderer-authority-thin-affective-room-making',
    file: './performance-visualizer-self-evolution-renderer-authority.test.ts',
    snippets: [
      'keeps thin affective settle reasons visible in renderer authority projection when playback cue authority still carries them',
      'keeps thin affective companionship wording visible in renderer authority projection when only authority trust still carries it',
      '余韵还在，先留白，别立刻把温度放大',
    ],
  },
] as const

describe('performance visualizer self evolution renderer authority project awareness audit', () => {
  it('keeps one explicit route-level proof that self-evolution renderer-authority projection preserves same-her embodiment closure truth on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-renderer-authority-full-cross-modal-lock' }),
      expect.objectContaining({ entry: 'self-evolution-renderer-authority-body-carried-rejoin' }),
      expect.objectContaining({ entry: 'self-evolution-renderer-authority-audible-body-carry' }),
      expect.objectContaining({ entry: 'self-evolution-renderer-authority-renderer-rejoin-without-body-drift-risk' }),
      expect.objectContaining({ entry: 'self-evolution-renderer-authority-thin-affective-room-making' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution renderer-authority project-awareness claim to current behavior tests instead of only broader noisy-desktop prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: self-evolution renderer-authority projection now needs dedicated same-her proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const rendererAuthoritySource = readFileSync(new URL('./performance-visualizer-self-evolution-renderer-authority.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-renderer-authority-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('self-evolution renderer-authority projection')
    expect(matrixSource).toContain('full-cross-modal-lock embodiment line')
    expect(matrixSource).toContain('renderer-rejoin-without-body drift risk')
    expect(matrixSource).toContain('thinner affective-residue room-making wording')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('self-evolution renderer-authority projection')
    expect(auditSource).toContain('renderer-rejoin-without-body drift risk')
    expect(auditSource).toContain('thinner affective-residue room-making wording')
    expect(rendererAuthoritySource).toContain(
      'keeps audible body-carried same-her continuity visible in self-evolution renderer authority projection when body lipsync and voice still hold one living segment',
    )
    expect(rendererAuthoritySource).toContain(
      'keeps thin affective companionship wording visible in renderer authority projection when only authority trust still carries it',
    )
  })
})
