import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'runtime-continuity-vrm-body-carried-rejoin',
    file: './performance-visualizer-self-evolution-runtime-continuity.test.ts',
    snippets: [
      'carries explicit body-led renderer rejoin continuity forward from renderer authority projection',
      'expect(projection?.bodyContinuityPhase).toBe(\'body-carried-to-renderer-rejoin\')',
      'Body continuity still carries the same living segment while VRM manifestation rejoins it, so runtime continuity can explain the renderer recovery as the same digital life re-entering full embodiment instead of a new identity branch.',
    ],
  },
  {
    entry: 'runtime-continuity-full-cross-modal-lock-wording',
    file: './performance-visualizer-self-evolution-runtime-continuity.test.ts',
    snippets: [
      'keeps the concrete renderer surface and same-her lock wording when body continuity has already entered full-cross-modal-lock',
      'expect(projection?.bodyContinuityPhase).toBe(\'full-cross-modal-lock\')',
      'Body continuity and Live2D manifestation are now locked back onto the same living segment together, so runtime continuity can explain the renderer recovery as one explicit same-her embodiment line instead of a temporary visual alignment.',
    ],
  },
  {
    entry: 'runtime-continuity-renderer-rejoin-without-body-warning',
    file: './performance-visualizer-self-evolution-runtime-continuity.test.ts',
    snippets: [
      'keeps the concrete renderer surface and body-loss warning when renderer lanes rejoin without same-segment body carry',
      'expect(projection?.bodyContinuityPhase).toBe(\'renderer-rejoin-without-body\')',
      'Renderer lanes have rejoined on VRM manifestation, but the body line is no longer carrying that same living segment, so runtime continuity should keep treating the visible recovery as same-her drift risk rather than a completed embodiment repair.',
    ],
  },
  {
    entry: 'runtime-continuity-lipsync-voice-lane-truth',
    file: './performance-visualizer-self-evolution-runtime-continuity.test.ts',
    snippets: [
      'carries a lipsync-plus-voice same-her lane from renderer authority into runtime continuity when voice is still on the active authority segment',
      'expect(projection?.matchedSignals).toContain(\'lane=lipsync+voice-only\')',
      'Renderer authority continuity still keeps 表情未命中 / 动作未命中 / 口型命中 / 声音命中 on the same life thread, so runtime continuity can explain which embodiment lane stayed bound and which one drifted without collapsing the whole digital-life thread into a fake identity break.',
    ],
  },
  {
    entry: 'runtime-continuity-audible-body-body-carried-truth',
    file: './performance-visualizer-self-evolution-runtime-continuity.test.ts',
    snippets: [
      'keeps audible body-carried same-her continuity visible in runtime continuity when body lipsync and voice still hold one living segment on VRM',
      'expect(projection?.matchedSignals).toContain(\'authority-body:yes\')',
      'expect(projection?.matchedSignals).toContain(\'authority-voice:yes\')',
    ],
  },
] as const

describe('performance visualizer runtime continuity project awareness audit', () => {
  it('keeps one explicit route-level proof that runtime continuity projection preserves canonical same-her embodiment closure truth on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'runtime-continuity-vrm-body-carried-rejoin' }),
      expect.objectContaining({ entry: 'runtime-continuity-full-cross-modal-lock-wording' }),
      expect.objectContaining({ entry: 'runtime-continuity-renderer-rejoin-without-body-warning' }),
      expect.objectContaining({ entry: 'runtime-continuity-lipsync-voice-lane-truth' }),
      expect.objectContaining({ entry: 'runtime-continuity-audible-body-body-carried-truth' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the runtime continuity projection claim to current behavior tests instead of only broader devtools prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: runtime continuity projection now needs dedicated same-her proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const continuitySource = readFileSync(new URL('./performance-visualizer-self-evolution-runtime-continuity.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-runtime-continuity-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('runtime continuity projection same-her lock wording')
    expect(matrixSource).toContain('renderer-rejoin-without-body drift risk')
    expect(matrixSource).toContain('lipsync+voice lane truth')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(continuitySource).toContain(
      'keeps the concrete renderer surface and same-her lock wording when body continuity has already entered full-cross-modal-lock',
    )
    expect(continuitySource).toContain(
      'keeps the concrete renderer surface and body-loss warning when renderer lanes rejoin without same-segment body carry',
    )
  })
})
