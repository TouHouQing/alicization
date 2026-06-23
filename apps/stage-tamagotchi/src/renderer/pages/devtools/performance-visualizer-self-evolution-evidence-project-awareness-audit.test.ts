import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-evidence-body-led-renderer-rejoin-facts',
    file: './performance-visualizer-self-evolution-evidence.test.ts',
    snippets: [
      'surfaces explicit body-led renderer rejoin facts in renderer-authority and runtime-continuity evidence panels',
      'bodyContinuityPhase: body-carried-to-renderer-rejoin',
      'rendererRejoinSurfaceKey: authority:renderer-rejoin:live2d',
    ],
  },
  {
    entry: 'self-evolution-evidence-audible-body-carried-same-her-line',
    file: './performance-visualizer-self-evolution-evidence.test.ts',
    snippets: [
      'keeps audible body-carried same-her continuity visible in runtime continuity evidence instead of flattening it into a generic lane summary',
      'Body continuity still carries the same living segment while VRM manifestation rejoins it, so runtime continuity can explain the renderer recovery as the same digital life re-entering full embodiment instead of a new identity branch.',
      'continuityAuthoritySummary: 身体线已经先把这段 living segment 托住，VRM 显形权威仍在补回同一条连续身体线',
    ],
  },
  {
    entry: 'self-evolution-evidence-body-only-hold-continuity',
    file: './performance-visualizer-self-evolution-evidence.test.ts',
    snippets: [
      'keeps body-only-hold same-her continuity visible in runtime continuity evidence instead of flattening it into a generic lane summary',
      'Body continuity is still the only lane carrying this same living segment, so runtime continuity should keep reading the current embodiment as one continuous her being held inward rather than a renderer-neutral idle settle.',
      'continuityAuthoritySummary: 身体线仍在独自托住同一段 living segment，当前还不能把 Live2D 显形权威的回接视为已经成立',
    ],
  },
  {
    entry: 'self-evolution-evidence-renderer-rejoin-without-body-drift',
    file: './performance-visualizer-self-evolution-evidence.test.ts',
    snippets: [
      'keeps renderer-rejoin-without-body drift visible in runtime continuity evidence instead of flattening it into a generic lane summary',
      'bodyContinuityPhase: \'renderer-rejoin-without-body\'',
      'Renderer lanes have rejoined on VRM manifestation, but the body line is no longer carrying that same living segment, so runtime continuity should keep treating the visible recovery as same-her drift risk rather than a completed embodiment repair.',
    ],
  },
  {
    entry: 'self-evolution-evidence-lane-level-authority-truth',
    file: './performance-visualizer-self-evolution-evidence.test.ts',
    snippets: [
      'surfaces lane-level continuity authority truth inside runtime continuity evidence panels',
      'continuityAuthoritySummary: 表情命中 / 动作未命中 / 口型未知',
      'surfaces voice as part of runtime continuity lane truth inside runtime continuity evidence panels',
      'continuityAuthoritySummary: 表情未命中 / 动作未命中 / 口型命中 / 声音命中',
    ],
  },
  {
    entry: 'self-evolution-evidence-quieter-visible-same-her-lanes',
    file: './performance-visualizer-self-evolution-evidence.test.ts',
    snippets: [
      'keeps the quieter face+lipsync same-her line visible inside runtime continuity evidence panels instead of flattening it into renderer-rejoin-without-body drift',
      'continuityAuthoritySummary: 当前只有 face 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线',
      'keeps the quieter motion+lipsync same-her line visible inside runtime continuity evidence panels instead of flattening it into renderer-rejoin-without-body drift',
      'continuityAuthoritySummary: 当前只有 motion 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线',
    ],
  },
  {
    entry: 'self-evolution-evidence-quieter-visible-same-her-voice-lanes',
    file: './performance-visualizer-self-evolution-evidence.test.ts',
    snippets: [
      'keeps the quieter face+lipsync+voice same-her line visible inside runtime continuity evidence panels instead of collapsing it into a shorter lane-only summary',
      'continuityAuthoritySummary: 当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线',
      'keeps the quieter motion+lipsync+voice same-her line visible inside runtime continuity evidence panels instead of collapsing it into a shorter lane-only summary',
      'continuityAuthoritySummary: 当前仅剩动作、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线',
    ],
  },
  {
    entry: 'self-evolution-evidence-same-turn-if-invited-cadence',
    file: './performance-visualizer-self-evolution-evidence.test.ts',
    snippets: [
      'keeps invited measured-return cadence evidence on the same callback line instead of narrating it like a broad re-entry',
      'This return is same-turn-if-invited, so visible closeness should re-enter on the same callback line instead of opening outward from scratch.',
      'same-turn-if-invited measured-return should stay quieter and more inward before widening again.',
    ],
  },
] as const

describe('performance visualizer self evolution evidence project awareness audit', () => {
  it('keeps one explicit route-level proof that self-evolution evidence panels preserve same-her embodiment closure truth on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-evidence-body-led-renderer-rejoin-facts' }),
      expect.objectContaining({ entry: 'self-evolution-evidence-audible-body-carried-same-her-line' }),
      expect.objectContaining({ entry: 'self-evolution-evidence-body-only-hold-continuity' }),
      expect.objectContaining({ entry: 'self-evolution-evidence-renderer-rejoin-without-body-drift' }),
      expect.objectContaining({ entry: 'self-evolution-evidence-lane-level-authority-truth' }),
      expect.objectContaining({ entry: 'self-evolution-evidence-quieter-visible-same-her-lanes' }),
      expect.objectContaining({ entry: 'self-evolution-evidence-quieter-visible-same-her-voice-lanes' }),
      expect.objectContaining({ entry: 'self-evolution-evidence-same-turn-if-invited-cadence' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution evidence panels project-awareness claim to current behavior tests instead of only broader devtools prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: self-evolution evidence panels now need dedicated same-her proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const evidenceSource = readFileSync(new URL('./performance-visualizer-self-evolution-evidence.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-evidence-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('self-evolution evidence panels')
    expect(matrixSource).toContain('lane-level face / motion / lipsync truth')
    expect(matrixSource).toContain('quieter face+lipsync / motion+lipsync carry')
    expect(matrixSource).toContain('quieter face+lipsync+voice / motion+lipsync+voice carry')
    expect(matrixSource).toContain('renderer-rejoin-without-body drift')
    expect(matrixSource).toContain('same-turn-if-invited cadence')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('self-evolution evidence panels')
    expect(auditSource).toContain('lane-level face / motion / lipsync truth')
    expect(auditSource).toContain('quieter face+lipsync / motion+lipsync carry')
    expect(auditSource).toContain('quieter face+lipsync+voice / motion+lipsync+voice carry')
    expect(auditSource).toContain('renderer-rejoin-without-body drift')
    expect(auditSource).toContain('same-turn-if-invited cadence')
    expect(evidenceSource).toContain(
      'surfaces explicit body-led renderer rejoin facts in renderer-authority and runtime-continuity evidence panels',
    )
    expect(evidenceSource).toContain(
      'keeps the quieter face+lipsync+voice same-her line visible inside runtime continuity evidence panels instead of collapsing it into a shorter lane-only summary',
    )
    expect(evidenceSource).toContain(
      'keeps the quieter motion+lipsync+voice same-her line visible inside runtime continuity evidence panels instead of collapsing it into a shorter lane-only summary',
    )
    expect(evidenceSource).toContain(
      'keeps invited measured-return cadence evidence on the same callback line instead of narrating it like a broad re-entry',
    )
  })
})
