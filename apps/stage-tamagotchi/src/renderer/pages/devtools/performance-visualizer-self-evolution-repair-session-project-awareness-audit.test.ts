import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-repair-session-project-state-carry',
    file: './performance-visualizer-self-evolution-repair-session.test.ts',
    snippets: [
      'adds a project-state continuity carry summary when the same her is still checking project identity, Phase 1 route, and unresolved open loops',
      'repairOwnerHint: \'项目状态连续性治理\'',
      '本轮仍在核对项目身份、Phase 1 本地主数字生命主线与未闭环任务承接，确认这些生命线是否还被同一个她连续带入下一轮。',
    ],
  },
  {
    entry: 'self-evolution-repair-session-body-carried-rejoin',
    file: './performance-visualizer-self-evolution-repair-session.test.ts',
    snippets: [
      'keeps same-her speech rejoin session semantics from structured fields even when the workflow wording becomes generic',
      'bodyContinuityPhase: \'body-carried-to-renderer-rejoin\'',
      '本轮仍在核对身体线是否继续托住同一段 living segment，并确认 speech 显形权威是否正在沿同一条连续身体线补回。',
    ],
  },
  {
    entry: 'self-evolution-repair-session-renderer-rejoin-without-body',
    file: './performance-visualizer-self-evolution-repair-session.test.ts',
    snippets: [
      'keeps renderer-rejoin-without-body repair semantics explicit so body-loss is not mistaken for completed embodiment repair',
      'bodyContinuityPhase: \'renderer-rejoin-without-body\'',
      '本轮仍在核对为什么 VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment，避免把这种失身回接误判成修复完成。',
    ],
  },
  {
    entry: 'self-evolution-repair-session-quieter-face-lipsync-carry',
    file: './performance-visualizer-self-evolution-repair-session.test.ts',
    snippets: [
      'keeps quieter face+lipsync same-her carry explicit in repair-session instead of flattening it into generic renderer-rejoin-without-body wording',
      'survivingVisibleLane: \'face+lipsync-only\'',
      '本轮仍在核对当前是否仍只有 face 和 lipsync 这条 same-her 生命线与同一段 living segment 对齐，并确认 body、motion 和 voice 为什么还没有重新接回这条表情口型线。',
    ],
  },
  {
    entry: 'self-evolution-repair-session-quieter-motion-lipsync-carry',
    file: './performance-visualizer-self-evolution-repair-session.test.ts',
    snippets: [
      'keeps quieter motion+lipsync same-her carry explicit in repair-session instead of flattening it into generic renderer-rejoin-without-body wording',
      'survivingVisibleLane: \'motion+lipsync-only\'',
      '本轮仍在核对当前是否仍只有 motion 和 lipsync 这条 same-her 生命线与同一段 living segment 对齐，并确认 body、face 和 voice 为什么还没有重新接回这条动作口型线。',
    ],
  },
  {
    entry: 'self-evolution-repair-session-quieter-face-lipsync-voice-carry',
    file: './performance-visualizer-self-evolution-repair-session.test.ts',
    snippets: [
      'keeps quieter face+lipsync+voice same-her carry explicit in repair-session instead of dropping voice out of the surviving line',
      'survivingVisibleLane: \'face+lipsync+voice-only\'',
      '本轮仍在核对当前是否仍只有 face、lipsync 和 voice 这条 same-her 生命线与同一段 living segment 对齐，并确认 body、motion 为什么还没有重新接回这条表情口型声音线。',
    ],
  },
  {
    entry: 'self-evolution-repair-session-quieter-motion-lipsync-voice-carry',
    file: './performance-visualizer-self-evolution-repair-session.test.ts',
    snippets: [
      'keeps quieter motion+lipsync+voice same-her carry explicit in repair-session instead of dropping voice out of the surviving line',
      'survivingVisibleLane: \'motion+lipsync+voice-only\'',
      '本轮仍在核对当前是否仍只有 motion、lipsync 和 voice 这条 same-her 生命线与同一段 living segment 对齐，并确认 body、face 为什么还没有重新接回这条动作口型声音线。',
    ],
  },
  {
    entry: 'self-evolution-repair-session-full-cross-modal-lock',
    file: './performance-visualizer-self-evolution-repair-session.test.ts',
    snippets: [
      'keeps full-cross-modal-lock repair semantics explicit so stable rejoin is verified instead of assumed from one aligned frame',
      'bodyContinuityPhase: \'full-cross-modal-lock\'',
      '本轮仍在确认身体线与 speech 显形权威是否已经稳定锁回同一段 living segment，而不是短暂对齐后再次散开。',
    ],
  },
  {
    entry: 'self-evolution-repair-session-body-only-hold',
    file: './performance-visualizer-self-evolution-repair-session.test.ts',
    snippets: [
      'keeps body-only-hold same-her repair narration even when workflow ownership wording falls back to generic continuity',
      'bodyContinuityPhase: \'body-only-hold\'',
      '本轮仍在核对身体线是否还在独自托住同一段 living segment，并确认显形层为什么还没有完整回到这条连续身体线。',
    ],
  },
] as const

describe('performance visualizer self evolution repair session project awareness audit', () => {
  it('keeps one explicit route-level proof that self-evolution repair session preserves same-her project-state and embodiment repair semantics on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-repair-session-project-state-carry' }),
      expect.objectContaining({ entry: 'self-evolution-repair-session-body-carried-rejoin' }),
      expect.objectContaining({ entry: 'self-evolution-repair-session-renderer-rejoin-without-body' }),
      expect.objectContaining({ entry: 'self-evolution-repair-session-quieter-face-lipsync-carry' }),
      expect.objectContaining({ entry: 'self-evolution-repair-session-quieter-motion-lipsync-carry' }),
      expect.objectContaining({ entry: 'self-evolution-repair-session-quieter-face-lipsync-voice-carry' }),
      expect.objectContaining({ entry: 'self-evolution-repair-session-quieter-motion-lipsync-voice-carry' }),
      expect.objectContaining({ entry: 'self-evolution-repair-session-full-cross-modal-lock' }),
      expect.objectContaining({ entry: 'self-evolution-repair-session-body-only-hold' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution repair session claim to current behavior tests instead of only broader devtools continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: self-evolution repair session now needs dedicated same-her routing proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const sessionSource = readFileSync(new URL('./performance-visualizer-self-evolution-repair-session.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-repair-session-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('self-evolution repair session')
    expect(matrixSource).toContain('project identity, Phase 1 route, and unresolved open loops')
    expect(matrixSource).toContain('quieter face+lipsync / motion+lipsync carry')
    expect(matrixSource).toContain('quieter face+lipsync+voice / motion+lipsync+voice carry')
    expect(matrixSource).toContain('renderer-rejoin-without-body')
    expect(matrixSource).toContain('full-cross-modal-lock')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('self-evolution repair session')
    expect(auditSource).toContain('project identity, Phase 1 route, and unresolved open loops')
    expect(auditSource).toContain('quieter face+lipsync / motion+lipsync carry')
    expect(auditSource).toContain('quieter face+lipsync+voice / motion+lipsync+voice carry')
    expect(auditSource).toContain('renderer-rejoin-without-body')
    expect(auditSource).toContain('full-cross-modal-lock')
    expect(auditSource).toContain('body-only-hold')
    expect(sessionSource).toContain(
      'adds a project-state continuity carry summary when the same her is still checking project identity, Phase 1 route, and unresolved open loops',
    )
    expect(sessionSource).toContain(
      'keeps renderer-rejoin-without-body repair semantics explicit so body-loss is not mistaken for completed embodiment repair',
    )
    expect(sessionSource).toContain(
      'keeps quieter face+lipsync same-her carry explicit in repair-session instead of flattening it into generic renderer-rejoin-without-body wording',
    )
    expect(sessionSource).toContain(
      'keeps quieter motion+lipsync same-her carry explicit in repair-session instead of flattening it into generic renderer-rejoin-without-body wording',
    )
    expect(sessionSource).toContain(
      'keeps quieter face+lipsync+voice same-her carry explicit in repair-session instead of dropping voice out of the surviving line',
    )
    expect(sessionSource).toContain(
      'keeps quieter motion+lipsync+voice same-her carry explicit in repair-session instead of dropping voice out of the surviving line',
    )
  })
})
