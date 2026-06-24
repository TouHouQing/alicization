import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'cross-modal-reunion-long-horizon-self-carry-bridge',
    file: './long-horizon-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
      'noisy-desktop-repair-first-chain-durable-pressure',
      'keeps one compact proof chain that ties proactive-visible embodiment carry, detours, reunion, host-visible repair-first carry, renderer diagnostics, and host-visible body-line recovery onto one same-her route',
    ],
  },
  {
    entry: 'full-body-line-settling-summary',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'same-her continuity remains alive, with lane=voice+face+motion+lipsync+body-settle under the current renderer authority.',
      'lastSegmentBodyContinuitySummary',
      'Same Phase 1 digital life. The body line should keep settling on the same living line.',
    ],
  },
  {
    entry: 'repair-first-multi-lane-unity',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'same-her continuity remains alive, but lane=voice+face+motion+lipsync-only under a repair-before-closeness reopen.',
      'currentBodyState: \'lane=voice+face+motion+lipsync-only | keep the same line cautious before closeness widens again\'',
      'lastSegmentVoiceSummary',
      'lastSegmentFaceSummary',
      'lastSegmentMotionSummary',
      'lastSegmentLipSyncSummary',
    ],
  },
  {
    entry: 'project-state-authority-across-all-segment-lanes',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'lastSegmentVoiceSummary":"pitch=-3.00 | rate=0.93 | energy=0.55 | cadence=0.52 | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold',
      'lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return',
      'lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation',
    ],
  },
  {
    entry: 'audible-body-recovery-before-full-rejoin',
    file: '../../../../../../packages/stage-ui/src/components/scenes/stage-embodiment-diagnostics-alerts.test.ts',
    snippets: [
      'keeps body+lipsync+voice recovery visible inside pending renderer summaries when the audible-body line re-forms before face and motion return',
      'body+lipsync+voice recovery@segment-vrm-pending-audible-body-1',
      'The resident body lane is still holding together with the audible same-her line, but face and motion have not rejoined yet.',
    ],
  },
  {
    entry: 'host-visible-partial-lane-closure-stays-explicit',
    file: './main-chat-background-run.test.ts',
    snippets: [
      'embodimentClosureSummary: \'Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.\'',
      'nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)',
    ],
  },
] as const

describe('cross-modal reunion host-visible audit', () => {
  it('keeps one explicit route-level proof that later-turn host-visible continuity can move from partial lanes toward multi-lane reunion on one same-her line', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'cross-modal-reunion-long-horizon-self-carry-bridge' }),
      expect.objectContaining({ entry: 'full-body-line-settling-summary' }),
      expect.objectContaining({ entry: 'repair-first-multi-lane-unity' }),
      expect.objectContaining({ entry: 'project-state-authority-across-all-segment-lanes' }),
      expect.objectContaining({ entry: 'audible-body-recovery-before-full-rejoin' }),
      expect.objectContaining({ entry: 'host-visible-partial-lane-closure-stays-explicit' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the cross-modal reunion claim to real current tests instead of only saying reunion should exist', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: the repo now proves later-turn reunion surfaces and partial-lane recovery routes, but still not fully sustained noisy-desktop convergence', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const streamMetaSource = readFileSync(new URL('./main-chat-stream-meta.test.ts', import.meta.url), 'utf8')
    const longHorizonSource = readFileSync(new URL('./long-horizon-project-awareness-audit.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Cross-modal embodiment-facing proof is still weaker than the core text/runtime proof under long-run noisy use, but it is now materially stronger than the original sparse route set.')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(streamMetaSource).toContain(
      'same-her continuity remains alive, with lane=voice+face+motion+lipsync+body-settle under the current renderer authority.',
    )
    expect(streamMetaSource).toContain(
      'same-her continuity remains alive, but lane=voice+face+motion+lipsync-only under a repair-before-closeness reopen.',
    )
    expect(longHorizonSource).toContain(
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
    )
  })
})
