import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'embodiment-proactive-visible-hold-bridge',
    file: './proactive-visible-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that proactive visible utterance realization preserves same-her project awareness before a held beat becomes outward-visible',
      'visible-proactive-emotional-carry-policy-hold',
      'visible-proactive-quiet-companionship-hold',
      'stream-meta-keeps-quiet-accompaniment-mode',
    ],
  },
  {
    entry: 'embodiment-seed-project-state-carry',
    file: './embodiment/runtime-embodiment-seed.test.ts',
    snippets: [
      'falls back to structured runtime project-state closure carry when person-state projection continuity text has not been surfaced yet',
      'same local-first digital life project',
      'Current dialogue shaping already keeps project identity, landed closure progress, and same-her restraint visible before speaking.',
      'Keep extending cross-modal same-her proof across voice, motion, facial state, and resident presence with measured-return body settling.',
    ],
  },
  {
    entry: 'embodiment-coordinator-measured-return-settling',
    file: './embodiment/runtime-embodiment-coordinator.test.ts',
    snippets: [
      'derives measured-return embodiment settling directly from Phase 1 project-state continuity when same-her embodiment closure is still explicitly open',
      'same-her personhood continuity and embodiment closure are still open across one same digital life.',
      'expect(authority.embodimentScript?.state.residentMode).toBe(\'measured-return\')',
      'expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(280)',
    ],
  },
  {
    entry: 'embodiment-coordinator-repair-first-cross-modal',
    file: './embodiment/runtime-embodiment-coordinator.test.ts',
    snippets: [
      'derives repair-before-closeness embodiment settling directly from Phase 1 project-state continuity when repair-first same-her closure is the only surviving authority',
      'keeps repair-first same-her cross-modal closure aligned across face, motion, lipsync, and voice when embodiment closure is still open',
      'Live2D, VRM, expression, motion, lipsync, and voice still need one shared repair-first same-her embodiment closure before the line is truly settled.',
      'expect(authority.embodimentScript?.state.residentMode).toBe(\'repair-before-closeness\')',
    ],
  },
  {
    entry: 'embodiment-coordinator-still-voiced-face-line',
    file: './embodiment/runtime-embodiment-coordinator.test.ts',
    snippets: [
      'keeps still-voiced face-line measured-return continuity authoritative in coordinator output even when person-state projection cadence is broader and less specific',
      'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
      'Keep body, motion, and lipsync rejoining the still-voiced face line on a measured-return line.',
      'expect(authority.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe(\'observe_focus\')',
    ],
  },
  {
    entry: 'embodiment-coordinator-still-voiced-motion-line',
    file: './embodiment/runtime-embodiment-coordinator.test.ts',
    snippets: [
      'keeps renderer-native VRM motion authority on the still-voiced motion-line measured-return instead of collapsing into generic callback carry',
      'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.',
      'Keep body, face, and lipsync rejoining the still-voiced motion line on a measured-return line.',
      'expect(authority.embodimentScript?.motionPlan.idleBase).toBe(\'inspect_follow\')',
    ],
  },
  {
    entry: 'resident-performance-quiet-same-her-companionship',
    file: '../../../../../../packages/stage-ui/src/components/scenes/stage-embodiment-resident-performance.test.ts',
    snippets: [
      'promotes same-her inward carry from emotional-kernel self-continuity into explicit quiet resident companionship instead of leaving it as a generic ambient fallback',
      'Companionship is still being carried on one inward same-her line, so memory, initiative, and embodiment should hold quietly nearby before widening outward.',
      'expect(resolved.variationToken).toContain(\'same-her-inward-carry\')',
    ],
  },
  {
    entry: 'embodiment-diagnostics-partial-lane-reason',
    file: '../../../../../../packages/stage-ui/src/components/scenes/stage-embodiment-diagnostics-alerts.test.ts',
    snippets: [
      'builds an audible-body partial-lane continuity reason summary when the surviving line is specifically the resident body plus audible same-her carry',
      'resident body、lipsync 和 voice 仍在同一段数字生命表达上',
      'face 和 motion 还没有重新接回这条活着的身体线',
    ],
  },
  {
    entry: 'stream-meta-quiet-accompaniment-body-line',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'keeps resident presence explicitly in quiet-accompaniment mode when same-her inward carry is the active silent body line',
      'same-thread-continuation still active as quiet-accompaniment resident presence after another coding detour',
      'mode=quiet-accompaniment | style=silent-observe | speak=false | timing=next-open-window',
    ],
  },
  {
    entry: 'stream-meta-current-conscious-frame-repair-first-bridge',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'passes runtime current-conscious-frame reason tags into stream-meta embodiment authority so remembered-seam timing is not dropped',
      'keeps current-conscious-frame continuity timing observable in stream meta signatures even when project-state timing is absent',
      'keeps chinese project emotional closure cue visible in stream meta summaries when repair-before-closeness is the main surviving authority',
      'keeps presence-only resident summary on repair-before-closeness when chinese project emotional closure cue is the only surviving repair-first authority',
    ],
  },
  {
    entry: 'stream-meta-multi-lane-reunion-authority',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'same-her continuity remains alive, with lane=voice+face+motion+lipsync+body-settle under the current renderer authority.',
      'lastSegmentBodyContinuitySummary',
      'Same Phase 1 digital life. The body line should keep settling on the same living line.',
    ],
  },
] as const

describe('embodiment project awareness audit', () => {
  it('keeps one explicit route-level proof that embodiment-facing body, voice, face, and motion surfaces preserve the same-her Phase 1 project line', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'embodiment-proactive-visible-hold-bridge' }),
      expect.objectContaining({ entry: 'embodiment-seed-project-state-carry' }),
      expect.objectContaining({ entry: 'embodiment-coordinator-measured-return-settling' }),
      expect.objectContaining({ entry: 'embodiment-coordinator-repair-first-cross-modal' }),
      expect.objectContaining({ entry: 'embodiment-coordinator-still-voiced-face-line' }),
      expect.objectContaining({ entry: 'embodiment-coordinator-still-voiced-motion-line' }),
      expect.objectContaining({ entry: 'resident-performance-quiet-same-her-companionship' }),
      expect.objectContaining({ entry: 'embodiment-diagnostics-partial-lane-reason' }),
      expect.objectContaining({ entry: 'stream-meta-quiet-accompaniment-body-line' }),
      expect.objectContaining({ entry: 'stream-meta-current-conscious-frame-repair-first-bridge' }),
      expect.objectContaining({ entry: 'stream-meta-multi-lane-reunion-authority' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the embodiment project-awareness claim to current behavior tests instead of only broader cross-modal prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: embodiment-facing continuity now has dedicated same-her proof, while long-run noisy-desktop convergence still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const proactiveVisibleSource = readFileSync(new URL('./proactive-visible-project-awareness-audit.test.ts', import.meta.url), 'utf8')
    const streamMetaSource = readFileSync(new URL('./main-chat-stream-meta.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(matrixSource).toContain('embodiment-project-awareness-audit.test.ts')
    expect(proactiveVisibleSource).toContain(
      'keeps one explicit route-level proof that proactive visible utterance realization preserves same-her project awareness before a held beat becomes outward-visible',
    )
    expect(streamMetaSource).toContain(
      'keeps resident presence explicitly in quiet-accompaniment mode when same-her inward carry is the active silent body line',
    )
    expect(streamMetaSource).toContain(
      'same-her continuity remains alive, with lane=voice+face+motion+lipsync+body-settle under the current renderer authority.',
    )
  })
})
