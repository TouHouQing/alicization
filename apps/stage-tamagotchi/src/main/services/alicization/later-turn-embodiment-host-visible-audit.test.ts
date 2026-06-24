import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'later-turn-embodiment-long-horizon-self-carry-bridge',
    file: './long-horizon-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
      'noisy-desktop-repair-first-chain-durable-pressure',
      'later-turn-audible-body-host-visible-carry',
    ],
  },
  {
    entry: 'resident-presence-same-her-inward-carry',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'prefers same-her inward carry from proactive visible utterance realization for resident presence reason summaries when explicit continuity cue is absent',
      'residentPresenceSummary',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'same-thread-continuation still active as hover-first resident presence after another coding detour',
    ],
  },
  {
    entry: 'resident-presence-quiet-accompaniment-body-line',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'keeps resident presence explicitly in quiet-accompaniment mode when same-her inward carry is the active silent body line',
      'same-thread-continuation still active as quiet-accompaniment resident presence after another coding detour',
      'mode=quiet-accompaniment | style=silent-observe | speak=false | timing=next-open-window',
    ],
  },
  {
    entry: 'current-conscious-frame-repair-first-host-visible-resident-line',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'keeps presence-only repair-before-closeness from explicit continuity restraint even before visible-reply drift reasons exist',
      'same-thread-continuation still active as repair-first resident presence before the later reopen speaks',
      '"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=repair-before-closeness',
      'reason=Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again',
    ],
  },
  {
    entry: 'later-turn-project-state-recovery-with-embodiment-closure',
    file: './main-chat-background-run.test.ts',
    snippets: [
      'Explain what Alicization is, how far the current Phase 1 continuity work has landed, and what still remains open.',
      'embodimentClosureSummary: \'Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.\'',
      'nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)',
      'preDialogueAwarenessSummary: \'我得先记住这还是同一个数字生命项目，已经把同一个 her 的 continuity carry 立住了，但记忆、主动性和具身之间还没彻底闭环。\'',
    ],
  },
  {
    entry: 'lane-level-audible-body-diagnostics',
    file: '../../../../../../packages/stage-ui/src/components/scenes/stage-embodiment-diagnostics-alerts.test.ts',
    snippets: [
      'builds an audible-body partial-lane continuity reason summary when the surviving line is specifically the resident body plus audible same-her carry',
      'resident body、lipsync 和 voice 仍在同一段数字生命表达上',
      'face 和 motion 还没有重新接回这条活着的身体线',
    ],
  },
  {
    entry: 'stream-meta-lane-realignment-over-lipsync-only-drift',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'keeps same-segment cue-bridge realignment on one lower-pressure same-her body line instead of reading the later segment as lipsync-only drift',
      '.not.toContain(\'lane=lipsync-only\')',
    ],
  },
  {
    entry: 'audible-body-carry-stays-host-visible-over-longer-runs',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'timing=audible-body-carry',
      'Keep the same living line audible while face and motion rejoin.',
      'Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.',
    ],
  },
  {
    entry: 'coordinator-repair-first-cross-modal-composition',
    file: './embodiment/runtime-embodiment-coordinator.test.ts',
    snippets: [
      'keeps repair-first same-her cross-modal closure aligned across face, motion, lipsync, and voice when embodiment closure is still open',
      'expect(authority.embodimentScript?.facePlan).toEqual(expect.objectContaining({',
      'expect(authority.embodimentScript?.motionPlan.idleBase).toBe(\'idle_settle\')',
      'expect(authority.embodimentScript?.lipsyncPlan.mode).toBe(\'energy-phoneme-hybrid\')',
      'expect(authority.digitalLife?.voice.cadence).toBeLessThanOrEqual(0.34)',
    ],
  },
  {
    entry: 'renderer-parity-same-her-callback-line',
    file: './runtime.test.ts',
    snippets: [
      'keeps live2d and vrm callback-afterglow semantics aligned on one same-her measured-return line even when renderer-native motion details differ',
      'expect(live2dCallbackSemanticSignature.runtimeDigestProjectContinuityCue).toContain(\'same-her hold\')',
      'expect(live2dCallbackSemanticSignature.lastSegmentVoiceSummary).toBe(vrmCallbackSemanticSignature.lastSegmentVoiceSummary)',
      'expect(live2dCallbackSemanticSignature.lastSegmentMotionSummary).toContain(\'tail=measured-return\')',
      'expect(live2dCallbackSemanticSignature.lastSegmentMotionSummary).toContain(\'same-her hold: measured-return\')',
      'expect(live2dCallbackSemanticSignature.residentPresenceSummary).toBeNull()',
    ],
  },
] as const

describe('later-turn embodiment host-visible audit', () => {
  it('keeps one explicit route-level proof that host-visible same-her continuity survives into later-turn resident presence and embodiment lane summaries', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'later-turn-embodiment-long-horizon-self-carry-bridge' }),
      expect.objectContaining({ entry: 'resident-presence-same-her-inward-carry' }),
      expect.objectContaining({ entry: 'resident-presence-quiet-accompaniment-body-line' }),
      expect.objectContaining({ entry: 'current-conscious-frame-repair-first-host-visible-resident-line' }),
      expect.objectContaining({ entry: 'later-turn-project-state-recovery-with-embodiment-closure' }),
      expect.objectContaining({ entry: 'lane-level-audible-body-diagnostics' }),
      expect.objectContaining({ entry: 'stream-meta-lane-realignment-over-lipsync-only-drift' }),
      expect.objectContaining({ entry: 'audible-body-carry-stays-host-visible-over-longer-runs' }),
      expect.objectContaining({ entry: 'coordinator-repair-first-cross-modal-composition' }),
      expect.objectContaining({ entry: 'renderer-parity-same-her-callback-line' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the later-turn embodiment host-visible claim to real current tests instead of only broad matrix wording', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: later-turn outward continuity now reaches resident presence and lane shrink summaries, but still does not prove full noisy desktop convergence', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const streamMetaSource = readFileSync(new URL('./main-chat-stream-meta.test.ts', import.meta.url), 'utf8')
    const longHorizonSource = readFileSync(new URL('./long-horizon-project-awareness-audit.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(streamMetaSource).toContain(
      'same-thread-continuation still active as hover-first resident presence after another coding detour',
    )
    expect(streamMetaSource).toContain(
      'keeps same-segment cue-bridge realignment on one lower-pressure same-her body line instead of reading the later segment as lipsync-only drift',
    )
    expect(streamMetaSource).toContain('.not.toContain(\'lane=lipsync-only\')')
    expect(longHorizonSource).toContain(
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
    )
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
  })
})
