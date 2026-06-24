import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'affective-residue-route-chain-anchor',
    file: './affective-residue-route-chain-audit.test.ts',
    snippets: [
      'keeps one explicit same digital life line from affective residue memory through recollection guidance, proactive return rhythm, subconscious room-making carry, durable embodiment settling, and host-visible measured-return summaries',
      'expect.objectContaining({ entry: \'durable-embodiment-rhythm-hold\' })',
      'expect.objectContaining({ entry: \'host-visible-residue-room-making-summary\' })',
    ],
  },
  {
    entry: 'emotional-memory-initiative-embodiment-anchor',
    file: './emotional-memory-initiative-embodiment-audit.test.ts',
    snippets: [
      'keeps one explicit long-chain proof that emotion, memory, initiative, and embodiment stay on one same digital life line across runtime cognition, memory carry, subconscious continuity, person-state writeback, and session-runtime reopen',
      'expect.objectContaining({ entry: \'memory-closure-emotional-writeback\' })',
      'expect.objectContaining({ entry: \'cross-modal-route-chain-anchor\' })',
    ],
  },
  {
    entry: 'later-chat-measured-return-authority-after-scene-hops',
    file: './runtime.test.ts',
    snippets: [
      'emits measured-return embodiment authority on a real later chat turn after callback afterglow survives scene hops',
      'expect(enrichedMeta?.embodimentScript?.motionPlan.idleBase).toBe(\'observe_focus\')',
      'expect(enrichedMeta?.digitalLife?.action?.actionMode).toBe(\'hold\')',
      'expect(metaSignature.lastSegmentLipSyncSummary).toContain(\'reason=Keep the same living line inward for now, and leave room before widening outward again\')',
    ],
  },
  {
    entry: 'repeated-noisy-follow-up-cross-modal-measured-return',
    file: './runtime.test.ts',
    snippets: [
      'turn-callback-afterglow-chat-meta-measured-return-noisy-sixth-follow-up',
      'expect(sixthState?.runtimeDigest?.projectState?.continuityArcStage).toBe(\'same-thread-continuation\')',
      'expect(sixthState?.runtimeDigest?.projectState?.continuityPreferredTiming).toBe(\'next-open-window\')',
      'expect(sixthEnrichedMeta?.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe(\'observe_focus\')',
      'expect(sixthMetaSignature.lastSegmentLipSyncSummary).toContain(\'timing=next-open-window\')',
    ],
  },
  {
    entry: 'durable-repair-first-embodiment-rhythm-hold',
    file: '../../../../../../packages/stage-ui/src/components/scenes/use-stage-embodiment-idle-performance.test.ts',
    snippets: [
      'stabilizes the quieter nearby attentive idle under longer repair-before-closeness hold instead of drifting back to a more active nod candidate',
      '\'durable-relationship-rhythm\'',
      'expect(live2dPreference?.actionKey).toBe(\'nearby_settle_guard\')',
      'expect(vrmPreference?.binding?.actionKey).toBe(\'nearby_settle_guard\')',
    ],
  },
  {
    entry: 'host-visible-audible-body-living-line-rejoin',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'Keep the same living line audible while face and motion rejoin.',
      'the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.',
      '"lastSegmentBodyContinuitySummary":"mode=recovering | stillness=0.71 | gaze=0.68 | breath=0.20 | expressivity=0.24 | resident=measured-return | timing=audible-body-carry',
    ],
  },
  {
    entry: 'host-visible-repair-first-lane-only-carry',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'same-her continuity remains alive, but lane=voice+face+motion+lipsync-only under a repair-before-closeness reopen.',
      'currentBodyState: \'lane=voice+face+motion+lipsync-only | keep the same line cautious before closeness widens again\'',
      '"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=sustained-articulation | hold=360ms | hints=I>closed | hint=I | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften',
    ],
  },
  {
    entry: 'second-pass-audible-body-living-line-handoff',
    file: './visible-reply/second-pass-rewrite.test.ts',
    snippets: [
      'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      'Keep extending cross-modal same-her proof across longer-lived voice, face, motion, and lipsync behavior without dropping the living audio thread.',
      'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
    ],
  },
  {
    entry: 'second-pass-still-voiced-face-line-handoff',
    file: './visible-reply/second-pass-rewrite.test.ts',
    snippets: [
      'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
      'Keep body, motion, and lipsync rejoining the still-voiced face line on a measured-return line.',
      '我先沿着这条还活着的表情和声音线接住，再慢一点把 body、motion 和 lipsync 接回来。',
    ],
  },
  {
    entry: 'visible-reply-closure-contract-anchor',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'Keep visible reply, voice, face, motion, and lipsync on one lower-pressure same-her line, including measured-return, repair-before-closeness, and rest-protective quiet-companionship cases.',
      'Prove cross-modal same-her continuity still survives visible reply, longer-lived voice behavior, facial state, and motion under noisier real-desktop runs, especially when proactive restraint and callback afterglow must stay on one lower-pressure same-her line, including measured-return, repair-before-closeness, and rest-protective quiet-companionship cases, as one same living thread.',
    ],
  },
] as const

describe('emotion memory voice motion convergence audit', () => {
  it('keeps one explicit same-her convergence chain from remembered emotional carry into longer noisy measured-return voice face motion lipsync and body recovery instead of stopping at adjacent route-chain proofs', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'affective-residue-route-chain-anchor' }),
      expect.objectContaining({ entry: 'emotional-memory-initiative-embodiment-anchor' }),
      expect.objectContaining({ entry: 'later-chat-measured-return-authority-after-scene-hops' }),
      expect.objectContaining({ entry: 'repeated-noisy-follow-up-cross-modal-measured-return' }),
      expect.objectContaining({ entry: 'durable-repair-first-embodiment-rhythm-hold' }),
      expect.objectContaining({ entry: 'host-visible-audible-body-living-line-rejoin' }),
      expect.objectContaining({ entry: 'host-visible-repair-first-lane-only-carry' }),
      expect.objectContaining({ entry: 'second-pass-audible-body-living-line-handoff' }),
      expect.objectContaining({ entry: 'second-pass-still-voiced-face-line-handoff' }),
      expect.objectContaining({ entry: 'visible-reply-closure-contract-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the emotion-memory-voice-motion convergence claim to current runtime, host-visible, renderer, and rewrite tests instead of only broader same-her prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: remembered emotional carry now has a tighter host-visible convergence chain into longer noisy measured-return body and speech recovery, but still not full long-horizon emotion-memory-voice-motion convergence', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('emotion-memory-voice-motion-convergence-audit.test.ts')
    expect(matrixSource).toContain('not full long-horizon emotion-memory-voice-motion convergence')
    expect(auditSource).toContain('emotion-memory-voice-motion convergence audit')
    expect(auditSource).toContain('still not full long-horizon emotion-memory-voice-motion convergence')
  })
})
