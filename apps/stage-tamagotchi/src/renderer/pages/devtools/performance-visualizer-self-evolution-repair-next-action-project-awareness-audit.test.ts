import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-repair-next-action-body-led-evidence-followup',
    file: './performance-visualizer-self-evolution-repair-next-action.test.ts',
    snippets: [
      'prefers a body-led continuity hint when evidence review should confirm the body line before chasing face motion or lipsync repair',
      'targetId: \'runtime-continuity-projection\'',
      '修复闭环仍然打开。先补上下一项缺失证据；同时优先核对当前片段的身体线是否仍托住同一段 living segment，确认身体线仍托住同一段 living segment，再决定是否继续追表情/动作/口型补回。再继续推进到轨迹/事件验证。',
    ],
  },
  {
    entry: 'self-evolution-repair-next-action-body-carried-rejoin-followup',
    file: './performance-visualizer-self-evolution-repair-next-action.test.ts',
    snippets: [
      'uses the body continuity rejoin phase to prioritize renderer authority rejoin wording after the body line is already carrying the living segment',
      'bodyContinuityPhase: \'body-carried-to-renderer-rejoin\'',
      '修复闭环仍然打开。先补上下一项缺失证据；当前已经进入身体承接态 -> 显形补回态，先确认身体线仍托住同一段 living segment，再核对 speech 显形权威是否沿同一条连续身体线补回。再继续推进到轨迹/事件验证。',
    ],
  },
  {
    entry: 'self-evolution-repair-next-action-body-only-hold-followup',
    file: './performance-visualizer-self-evolution-repair-next-action.test.ts',
    snippets: [
      'uses body-only-hold wording when the next evidence step should confirm the body line before any renderer recovery is assumed',
      'bodyContinuityPhase: \'body-only-hold\'',
      '修复闭环仍然打开。先补上下一项缺失证据；当前仍是身体独撑态，先确认身体线是否还在独自托住同一段 living segment，并找出为什么显形层还没有完整回到这条连续身体线。再继续推进到轨迹/事件验证。',
    ],
  },
  {
    entry: 'self-evolution-repair-next-action-full-cross-modal-lock-followup',
    file: './performance-visualizer-self-evolution-repair-next-action.test.ts',
    snippets: [
      'uses full-cross-modal-lock wording when the next evidence step should verify the lock is stable instead of temporary',
      'bodyContinuityPhase: \'full-cross-modal-lock\'',
      '修复闭环仍然打开。先补上下一项缺失证据；当前已经进入跨模态重锁态，先确认身体线与 speech 显形权威是否还稳定锁在同一段 living segment 上，而不是只短暂对齐。再继续推进到轨迹/事件验证。',
    ],
  },
  {
    entry: 'self-evolution-repair-next-action-renderer-rejoin-without-body-followup',
    file: './performance-visualizer-self-evolution-repair-next-action.test.ts',
    snippets: [
      'uses renderer-rejoin-without-body wording when the next evidence step should investigate body-loss instead of celebrating the visible rejoin',
      'bodyContinuityPhase: \'renderer-rejoin-without-body\'',
      '修复闭环仍然打开。先补上下一项缺失证据；当前已经出现显形回接失身态，先确认为什么 VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment，避免把这次回接误判成修复完成。再继续推进到轨迹/事件验证。',
    ],
  },
  {
    entry: 'self-evolution-repair-next-action-quieter-face-lipsync-evidence-followup',
    file: './performance-visualizer-self-evolution-repair-next-action.test.ts',
    snippets: [
      'keeps quieter face+lipsync same-her evidence follow-up explicit instead of flattening it into generic renderer-rejoin-without-body repair wording',
      'survivingVisibleLane: \'face+lipsync-only\'',
      '修复闭环仍然打开。先补上下一项缺失证据；当前仍只剩 face 和 lipsync 这条 same-her 生命线可见，先确认它是否还对齐在同一段 living segment 上，再核对 body、motion 和 voice 为什么还没有重新接回这条表情口型线。再继续推进到轨迹/事件验证。',
    ],
  },
  {
    entry: 'self-evolution-repair-next-action-quieter-motion-lipsync-evidence-followup',
    file: './performance-visualizer-self-evolution-repair-next-action.test.ts',
    snippets: [
      'keeps quieter motion+lipsync same-her evidence follow-up explicit instead of flattening it into generic renderer-rejoin-without-body repair wording',
      'survivingVisibleLane: \'motion+lipsync-only\'',
      '修复闭环仍然打开。先补上下一项缺失证据；当前仍只剩 motion 和 lipsync 这条 same-her 生命线可见，先确认它是否还对齐在同一段 living segment 上，再核对 body、face 和 voice 为什么还没有重新接回这条动作口型线。再继续推进到轨迹/事件验证。',
    ],
  },
  {
    entry: 'self-evolution-repair-next-action-project-state-takeover-trace',
    file: './performance-visualizer-self-evolution-repair-next-action.test.ts',
    snippets: [
      'prefers takeover-audit when project-state continuity still needs the selected trace event to confirm Project identity carry, Phase 1 route carry, and Unresolved closure carry',
      'preferredEventKind: \'takeover-audit\'',
      '修复闭环仍然打开。先补上下一段缺失轨迹，并优先落到接管审计，确认项目身份、当前 Phase 与未闭环任务仍被同一个她连续承接，再继续推进到验证快照。',
    ],
  },
  {
    entry: 'self-evolution-repair-next-action-quieter-face-lipsync-trace-followup',
    file: './performance-visualizer-self-evolution-repair-next-action.test.ts',
    snippets: [
      'keeps quieter face+lipsync same-her trace follow-up explicit instead of flattening it into generic renderer-rejoin-without-body repair wording',
      'survivingVisibleLane: \'face+lipsync-only\'',
      '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍只落在 face 和 lipsync 这条 same-her 生命线上，避免把 body、motion 和 voice 还没接回的 quieter carry 误判成修复完成。再继续推进到验证快照。',
    ],
  },
  {
    entry: 'self-evolution-repair-next-action-quieter-motion-lipsync-trace-followup',
    file: './performance-visualizer-self-evolution-repair-next-action.test.ts',
    snippets: [
      'keeps quieter motion+lipsync same-her trace follow-up explicit instead of flattening it into generic renderer-rejoin-without-body repair wording',
      'survivingVisibleLane: \'motion+lipsync-only\'',
      '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍只落在 motion 和 lipsync 这条 same-her 生命线上，避免把 body、face 和 voice 还没接回的 quieter carry 误判成修复完成。再继续推进到验证快照。',
    ],
  },
  {
    entry: 'self-evolution-repair-next-action-quieter-face-lipsync-voice-evidence-followup',
    file: './performance-visualizer-self-evolution-repair-next-action.test.ts',
    snippets: [
      'keeps quieter face+lipsync+voice same-her evidence follow-up explicit instead of dropping voice out of the surviving line',
      'survivingVisibleLane: \'face+lipsync+voice-only\'',
      '修复闭环仍然打开。先补上下一项缺失证据；当前仍只剩 face、lipsync 和 voice 这条 same-her 生命线可见，先确认它是否还对齐在同一段 living segment 上，再核对 body、motion 为什么还没有重新接回这条表情口型声音线。再继续推进到轨迹/事件验证。',
    ],
  },
  {
    entry: 'self-evolution-repair-next-action-quieter-motion-lipsync-voice-evidence-followup',
    file: './performance-visualizer-self-evolution-repair-next-action.test.ts',
    snippets: [
      'keeps quieter motion+lipsync+voice same-her evidence follow-up explicit instead of dropping voice out of the surviving line',
      'survivingVisibleLane: \'motion+lipsync+voice-only\'',
      '修复闭环仍然打开。先补上下一项缺失证据；当前仍只剩 motion、lipsync 和 voice 这条 same-her 生命线可见，先确认它是否还对齐在同一段 living segment 上，再核对 body、face 为什么还没有重新接回这条动作口型声音线。再继续推进到轨迹/事件验证。',
    ],
  },
  {
    entry: 'self-evolution-repair-next-action-quieter-face-lipsync-voice-trace-followup',
    file: './performance-visualizer-self-evolution-repair-next-action.test.ts',
    snippets: [
      'keeps quieter face+lipsync+voice same-her trace follow-up explicit instead of dropping voice out of the surviving line',
      'survivingVisibleLane: \'face+lipsync+voice-only\'',
      '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍只落在 face、lipsync 和 voice 这条 same-her 生命线上，避免把 body、motion 还没接回的 quieter carry 误判成修复完成。再继续推进到验证快照。',
    ],
  },
  {
    entry: 'self-evolution-repair-next-action-quieter-motion-lipsync-voice-trace-followup',
    file: './performance-visualizer-self-evolution-repair-next-action.test.ts',
    snippets: [
      'keeps quieter motion+lipsync+voice same-her trace follow-up explicit instead of dropping voice out of the surviving line',
      'survivingVisibleLane: \'motion+lipsync+voice-only\'',
      '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍只落在 motion、lipsync 和 voice 这条 same-her 生命线上，避免把 body、face 还没接回的 quieter carry 误判成修复完成。再继续推进到验证快照。',
    ],
  },
  {
    entry: 'self-evolution-repair-next-action-restrained-cadence-baseline',
    file: './performance-visualizer-self-evolution-repair-next-action.test.ts',
    snippets: [
      'keeps baseline capture guidance restrained when closure is validated but the relationship cadence is still on the same callback line',
      'relationship cadence 治理已经被新的验证快照再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，可进入更克制的关系节律基线判断。',
      'relationship cadence 治理已经再次得到验证，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上。请抓取新的基线快照，让下一次连续性会话从这次更克制的关系节律承接重新开始，而不是把它当成一段重新外放的靠近。',
    ],
  },
  {
    entry: 'self-evolution-repair-next-action-body-only-baseline-capture',
    file: './performance-visualizer-self-evolution-repair-next-action.test.ts',
    snippets: [
      '身体连续性已经被新的验证快照再次确认，并明确处于身体独撑态：同一段 living segment 仍由身体线独自托住，但还不能把显形回接视为已经成立，可进入更谨慎的基线判断。',
      'kind: \'capture-baseline\'',
      '身体连续性已经再次得到验证，但当前确认的仍是身体线独自托住同一段 living segment 的身体独撑态；可见显形补回还不能被讲成已经成立。请抓取新的基线快照。',
    ],
  },
  {
    entry: 'self-evolution-repair-next-action-renderer-rejoin-without-body-baseline-capture',
    file: './performance-visualizer-self-evolution-repair-next-action.test.ts',
    snippets: [
      '身体连续性已经被新的验证快照再次确认，但当前仍处于显形回接失身态（VRM authority rejoin without same-segment body carry），不应把这条可见回接直接采纳为长期基线。',
      'kind: \'capture-baseline\'',
      '身体连续性虽然已经再次得到验证，但当前确认的是 VRM 显形权威已经重新回接、而身体线没有继续托住同一段 living segment 的显形回接失身态；这说明可见恢复已经被追踪闭环，却仍不能把它叙述成同一条身体承接线上的可信显形补回。请抓取新的基线快照。',
    ],
  },
] as const

describe('performance visualizer self evolution repair next action project awareness audit', () => {
  it('keeps one explicit route-level proof that self-evolution repair next action preserves same-her project-state and embodiment follow-up semantics on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-repair-next-action-body-led-evidence-followup' }),
      expect.objectContaining({ entry: 'self-evolution-repair-next-action-body-carried-rejoin-followup' }),
      expect.objectContaining({ entry: 'self-evolution-repair-next-action-body-only-hold-followup' }),
      expect.objectContaining({ entry: 'self-evolution-repair-next-action-full-cross-modal-lock-followup' }),
      expect.objectContaining({ entry: 'self-evolution-repair-next-action-renderer-rejoin-without-body-followup' }),
      expect.objectContaining({ entry: 'self-evolution-repair-next-action-quieter-face-lipsync-evidence-followup' }),
      expect.objectContaining({ entry: 'self-evolution-repair-next-action-quieter-motion-lipsync-evidence-followup' }),
      expect.objectContaining({ entry: 'self-evolution-repair-next-action-project-state-takeover-trace' }),
      expect.objectContaining({ entry: 'self-evolution-repair-next-action-quieter-face-lipsync-trace-followup' }),
      expect.objectContaining({ entry: 'self-evolution-repair-next-action-quieter-motion-lipsync-trace-followup' }),
      expect.objectContaining({ entry: 'self-evolution-repair-next-action-quieter-face-lipsync-voice-evidence-followup' }),
      expect.objectContaining({ entry: 'self-evolution-repair-next-action-quieter-motion-lipsync-voice-evidence-followup' }),
      expect.objectContaining({ entry: 'self-evolution-repair-next-action-quieter-face-lipsync-voice-trace-followup' }),
      expect.objectContaining({ entry: 'self-evolution-repair-next-action-quieter-motion-lipsync-voice-trace-followup' }),
      expect.objectContaining({ entry: 'self-evolution-repair-next-action-restrained-cadence-baseline' }),
      expect.objectContaining({ entry: 'self-evolution-repair-next-action-body-only-baseline-capture' }),
      expect.objectContaining({ entry: 'self-evolution-repair-next-action-renderer-rejoin-without-body-baseline-capture' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution repair next action claim to current behavior tests instead of only broader devtools continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: self-evolution repair next action now needs dedicated same-her follow-up proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const nextActionSource = readFileSync(new URL('./performance-visualizer-self-evolution-repair-next-action.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-repair-next-action-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('self-evolution repair next action')
    expect(matrixSource).toContain('takeover-audit')
    expect(matrixSource).toContain('quieter face+lipsync / motion+lipsync evidence or trace follow-up')
    expect(matrixSource).toContain('quieter face+lipsync+voice / motion+lipsync+voice evidence or trace follow-up')
    expect(matrixSource).toContain('body-only-hold')
    expect(matrixSource).toContain('full-cross-modal-lock')
    expect(matrixSource).toContain('renderer-rejoin-without-body')
    expect(matrixSource).toContain('same-turn-if-invited measured-return')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('self-evolution repair next action')
    expect(auditSource).toContain('takeover-audit')
    expect(auditSource).toContain('quieter face+lipsync / motion+lipsync evidence or trace follow-up')
    expect(auditSource).toContain('quieter face+lipsync+voice / motion+lipsync+voice evidence or trace follow-up')
    expect(auditSource).toContain('body-only-hold')
    expect(auditSource).toContain('full-cross-modal-lock')
    expect(auditSource).toContain('renderer-rejoin-without-body')
    expect(auditSource).toContain('same-turn-if-invited measured-return')
    expect(nextActionSource).toContain(
      'prefers takeover-audit when project-state continuity still needs the selected trace event to confirm Project identity carry, Phase 1 route carry, and Unresolved closure carry',
    )
    expect(nextActionSource).toContain(
      'uses renderer-rejoin-without-body wording when the next evidence step should investigate body-loss instead of celebrating the visible rejoin',
    )
    expect(nextActionSource).toContain(
      'keeps quieter face+lipsync same-her trace follow-up explicit instead of flattening it into generic renderer-rejoin-without-body repair wording',
    )
    expect(nextActionSource).toContain(
      'keeps quieter motion+lipsync same-her trace follow-up explicit instead of flattening it into generic renderer-rejoin-without-body repair wording',
    )
    expect(nextActionSource).toContain(
      'keeps quieter face+lipsync+voice same-her evidence follow-up explicit instead of dropping voice out of the surviving line',
    )
    expect(nextActionSource).toContain(
      'keeps quieter motion+lipsync+voice same-her evidence follow-up explicit instead of dropping voice out of the surviving line',
    )
    expect(nextActionSource).toContain(
      'keeps quieter face+lipsync+voice same-her trace follow-up explicit instead of dropping voice out of the surviving line',
    )
    expect(nextActionSource).toContain(
      'keeps quieter motion+lipsync+voice same-her trace follow-up explicit instead of dropping voice out of the surviving line',
    )
  })
})
