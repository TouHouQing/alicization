import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'second-pass-lipsync-voice-living-audio-thread-handoff',
    file: './visible-reply/second-pass-rewrite.test.ts',
    snippets: [
      'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
      'Keep body, face, and motion rejoining the living audio thread on the same living line.',
      'expect(rewritePayload).toContain(\'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.\')',
    ],
  },
  {
    entry: 'coordinator-still-voiced-motion-line-authority',
    file: './embodiment/runtime-embodiment-coordinator.test.ts',
    snippets: [
      'keeps renderer-native VRM motion authority on the still-voiced motion-line measured-return instead of collapsing into generic callback carry',
      'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.',
      'Keep body, face, and lipsync rejoining the still-voiced motion line on a measured-return line.',
      'keep the still-voiced motion line measured-return even on VRM',
    ],
  },
  {
    entry: 'coordinator-lipsync-voice-only-not-overstated-into-audible-body',
    file: './embodiment/runtime-embodiment-coordinator.test.ts',
    snippets: [
      'keeps lipsync+voice-only measured-return continuity authoritative in coordinator output without overstating it into audible-body carry',
      'reasonTags: expect.arrayContaining([\'embodiment:lipsync+voice-only\'])',
      'expect(authority.embodimentScript?.state.rendererHints?.reasonTags).not.toContain(\'embodiment:audible_same_her_line\')',
    ],
  },
  {
    entry: 'quick-reply-still-voiced-motion-host-summary',
    file: '../../../../../../packages/stage-ui/src/components/scenes/stage-quick-reply-closure-summary.test.ts',
    snippets: [
      'keeps a still-voiced motion-line headline as the host-facing closure summary when motion and voice are carrying the same-her line',
      'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.',
      'Next, help me close: Rejoin body, face, and lipsync onto the still-voiced motion line without flattening the audible same-her carry.',
    ],
  },
  {
    entry: 'driver-surface-lipsync-voice-only-cautious-line',
    file: '../../../../../../packages/stage-ui/src/components/scenes/stage-embodiment-diagnostics-overlay-summary.test.ts',
    snippets: [
      'keeps repair-before-closeness visible when only lipsync and voice are still carrying the same cautious line',
      'reason=hold the same cautious line in voice and mouth before closeness widens again',
      'lane=lipsync+voice-only',
    ],
  },
  {
    entry: 'renderer-alignment-lipsync-voice-recovery',
    file: '../../../../../../packages/stage-ui/src/components/scenes/stage-embodiment-diagnostics-overlay-summary.test.ts',
    snippets: [
      'builds a renderer lane focus summary when only lipsync and voice have re-formed the audible same-her line',
      'focus=lipsync+voice | pending=body+face+motion',
      'keeps lipsync+voice recovery visible on the renderer alignment surface summary when the audible same-her line re-forms before body face and motion return',
      'Soft Gaze -> Resident Hold | mode=measured-return | blink=linger | gaze=soften | drifted | runtime-only-visible | resident-audible-voice-first | lipsync+voice recovery@segment-live2d-audible-voice-first-return | pending-rejoin=body+face+motion',
    ],
  },
] as const

describe('voice lane host-visible project awareness audit', () => {
  it('keeps one explicit route-level proof that host-visible voice-lane continuity stays legible across rewrite handoff, coordinator authority, quick-reply closure, and renderer diagnostics', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'second-pass-lipsync-voice-living-audio-thread-handoff' }),
      expect.objectContaining({ entry: 'coordinator-still-voiced-motion-line-authority' }),
      expect.objectContaining({ entry: 'coordinator-lipsync-voice-only-not-overstated-into-audible-body' }),
      expect.objectContaining({ entry: 'quick-reply-still-voiced-motion-host-summary' }),
      expect.objectContaining({ entry: 'driver-surface-lipsync-voice-only-cautious-line' }),
      expect.objectContaining({ entry: 'renderer-alignment-lipsync-voice-recovery' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the host-visible voice-lane claim to current rewrite, coordinator, quick-reply, and renderer tests instead of only broader cross-modal prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: host-visible voice-lane continuity is now separately auditable, but this still does not prove full noisy-desktop convergence or full cross-modal reunion', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('voice-lane-host-visible-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('partial-lane continuity remains legible even before full audible-body or multi-lane reunion settles')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
  })
})
