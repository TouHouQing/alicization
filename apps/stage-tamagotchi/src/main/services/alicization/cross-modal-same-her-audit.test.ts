import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'embodiment-seed-project-state-carry',
    file: './embodiment/runtime-embodiment-seed.test.ts',
    snippets: [
      'falls back to structured runtime project-state closure carry when person-state projection continuity text has not been surfaced yet',
      'same local-first digital life project',
      'Current dialogue shaping already keeps project identity, landed closure progress, and same-her restraint visible before speaking.',
      'Keep extending cross-modal same-her proof across voice, motion, facial state, and resident presence with measured-return body settling.',
      'manifestationCadenceSummary: expect.stringContaining(\'cross-modal same-her proof\')',
    ],
  },
  {
    entry: 'embodiment-coordinator-cross-modal-settling',
    file: './embodiment/runtime-embodiment-coordinator.test.ts',
    snippets: [
      'derives measured-return embodiment settling directly from Phase 1 project-state continuity when same-her embodiment closure is still explicitly open',
      'same-her personhood continuity and embodiment closure are still open across one same digital life.',
      'Keep extending cross-modal same-her proof across voice, motion, facial state, and resident presence with measured-return body settling.',
      'expect(authority.embodimentScript?.state.residentMode).toBe(\'measured-return\')',
      'expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(280)',
    ],
  },
  {
    entry: 'memory-closure-emotional-carry-bridge',
    file: './runtime-memory-closure.test.ts',
    snippets: [
      'persists richer emotional closure carry into the person-state memory ledger instead of flattening it to the canonical project brief',
      'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the same living line.',
      'Rest-protective companionship helped the same living line stay believable.',
    ],
  },
  {
    entry: 'organic-memory-emotional-carry-cadence-bridge',
    file: './runtime-organic-memory-access.test.ts',
    snippets: [
      'carries richer same-her emotional closure cues from the active self-revision patch into self-evolution cadence so initiative and embodiment can stay on that living line',
      'reasonCodes: [\'domain:relationship\', \'same-her-emotional-closure-carry-active\']',
      'expect(snapshot.selfEvolution?.relationshipCadenceSummary?.toLowerCase()).toContain(\'same living line\')',
      'expect((snapshot as any).activeContinuityGovernance?.summary?.toLowerCase()).toContain(\'repair-before-closeness\')',
    ],
  },
  {
    entry: 'cross-modal-proactive-visible-embodiment-bridge',
    file: './embodiment-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that embodiment-facing body, voice, face, and motion surfaces preserve the same-her Phase 1 project line',
      'embodiment-proactive-visible-hold-bridge',
      'proactive visible utterance realization preserves same-her project awareness before a held beat becomes outward-visible',
    ],
  },
  {
    entry: 'resident-performance-same-her-companionship',
    file: '../../../../../../packages/stage-ui/src/components/scenes/stage-embodiment-resident-performance.test.ts',
    snippets: [
      'promotes same-her inward carry from emotional-kernel self-continuity into explicit quiet resident companionship instead of leaving it as a generic ambient fallback',
      'Companionship is still being carried on one inward same-her line, so memory, initiative, and embodiment should hold quietly nearby before widening outward.',
      'expect(resolved.variationToken).toContain(\'same-her-inward-carry\')',
    ],
  },
  {
    entry: 'diagnostics-lane-summary',
    file: '../../../../../../packages/stage-ui/src/components/scenes/stage-embodiment-diagnostics-alerts.test.ts',
    snippets: [
      'builds an audible-body partial-lane continuity reason summary when the surviving line is specifically the resident body plus audible same-her carry',
      'resident body、lipsync 和 voice 仍在同一段数字生命表达上',
      'face 和 motion 还没有重新接回这条活着的身体线',
    ],
  },
  {
    entry: 'session-runtime-recall-and-planner',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs',
      'mindTurnContractSystemText',
      'answerPlanner?.governingProject',
    ],
  },
  {
    entry: 'initiative-and-proactive-restraint',
    file: './initiative-engine.test.ts',
    snippets: [
      'Keep extending cross-modal same-her proof across longer real-desktop runs.',
      'threads self continuity project-state carry into initiative why so proactive restraint still sounds like one same digital life',
    ],
  },
  {
    entry: 'action-ecology-companionship-body-line',
    file: './action-ecology.test.ts',
    snippets: [
      'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs',
      'keeps a ripe same-her closure return in quiet measured companionship when the next closure target still says reopen gently',
    ],
  },
  {
    entry: 'visible-reply-cross-modal-judgement',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'Prove cross-modal same-her continuity still survives visible reply, longer-lived voice behavior, facial state, and motion under noisier real-desktop runs',
      'memory, initiative, voice, face, motion, and embodiment still have not fully closed as one same living line',
    ],
  },
  {
    entry: 'runtime-project-awareness-carry',
    file: './runtime.test.ts',
    snippets: [
      'next_closure_target=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs',
      'same-her closure audit',
    ],
  },
] as const

describe('cross-modal same-her audit', () => {
  it('keeps an explicit proof set for the still-open Phase 1 same-her closure line across memory, initiative, dialogue, and embodiment', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'embodiment-seed-project-state-carry' }),
      expect.objectContaining({ entry: 'embodiment-coordinator-cross-modal-settling' }),
      expect.objectContaining({ entry: 'memory-closure-emotional-carry-bridge' }),
      expect.objectContaining({ entry: 'organic-memory-emotional-carry-cadence-bridge' }),
      expect.objectContaining({ entry: 'cross-modal-proactive-visible-embodiment-bridge' }),
      expect.objectContaining({ entry: 'resident-performance-same-her-companionship' }),
      expect.objectContaining({ entry: 'diagnostics-lane-summary' }),
      expect.objectContaining({ entry: 'session-runtime-recall-and-planner' }),
      expect.objectContaining({ entry: 'initiative-and-proactive-restraint' }),
      expect.objectContaining({ entry: 'action-ecology-companionship-body-line' }),
      expect.objectContaining({ entry: 'visible-reply-cross-modal-judgement' }),
      expect.objectContaining({ entry: 'runtime-project-awareness-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the cross-modal same-her open-loop claim to real current test evidence instead of only docs prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current runtime proof boundary explicit: action ecology now surfaces the fuller cross-modal target for the explicit same-her reopen branch, while other runtime-facing seams may still stay thinner', () => {
    const actionEcologySource = readFileSync(new URL('./action-ecology.test.ts', import.meta.url), 'utf8')
    const criticSource = readFileSync(new URL('./visible-reply/critic.test.ts', import.meta.url), 'utf8')
    const organicMemorySource = readFileSync(new URL('./runtime-organic-memory-access.test.ts', import.meta.url), 'utf8')
    const embodimentSource = readFileSync(new URL('./embodiment-project-awareness-audit.test.ts', import.meta.url), 'utf8')

    expect(actionEcologySource).toContain(
      'expect(ecology.why).toContain(\'Phase 1 still has open digital-life closure work\')',
    )
    expect(actionEcologySource).toContain(
      'expect(ecology.why).toContain(\'same-her closure line\')',
    )
    expect(actionEcologySource).toContain(
      'expect(ecology.why).toContain(\'cross-modal same-her proof\')',
    )

    expect(criticSource).toContain(
      'Prove cross-modal same-her continuity still survives visible reply, longer-lived voice behavior, facial state, and motion under noisier real-desktop runs',
    )
    expect(criticSource).toContain(
      'memory, initiative, voice, face, motion, and embodiment still have not fully closed as one same living line',
    )
    expect(organicMemorySource).toContain(
      'carries richer same-her emotional closure cues from the active self-revision patch into self-evolution cadence so initiative and embodiment can stay on that living line',
    )
    expect(embodimentSource).toContain(
      'embodiment-proactive-visible-hold-bridge',
    )
  })

  it('keeps one explicit route-level embodiment proof chain from project-state carry into body, audible continuity, resident presence, and lane diagnostics', () => {
    const seedSource = readFileSync(new URL('./embodiment/runtime-embodiment-seed.test.ts', import.meta.url), 'utf8')
    const coordinatorSource = readFileSync(new URL('./embodiment/runtime-embodiment-coordinator.test.ts', import.meta.url), 'utf8')
    const residentSource = readFileSync(
      new URL('../../../../../../packages/stage-ui/src/components/scenes/stage-embodiment-resident-performance.test.ts', import.meta.url),
      'utf8',
    )
    const diagnosticsSource = readFileSync(
      new URL('../../../../../../packages/stage-ui/src/components/scenes/stage-embodiment-diagnostics-alerts.test.ts', import.meta.url),
      'utf8',
    )

    expect(seedSource).toContain(
      'Keep extending cross-modal same-her proof across voice, motion, facial state, and resident presence with measured-return body settling.',
    )
    expect(seedSource).toContain(
      'Current dialogue shaping already keeps project identity, landed closure progress, and same-her restraint visible before speaking.',
    )

    expect(coordinatorSource).toContain(
      'derives measured-return embodiment settling directly from Phase 1 project-state continuity when same-her embodiment closure is still explicitly open',
    )
    expect(coordinatorSource).toContain(
      'expect(authority.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(280)',
    )

    expect(residentSource).toContain(
      'Companionship is still being carried on one inward same-her line, so memory, initiative, and embodiment should hold quietly nearby before widening outward.',
    )
    expect(residentSource).toContain(
      'expect(resolved.variationToken).toContain(\'same-her-inward-carry\')',
    )

    expect(diagnosticsSource).toContain(
      'resident body、lipsync 和 voice 仍在同一段数字生命表达上',
    )
    expect(diagnosticsSource).toContain(
      'face 和 motion 还没有重新接回这条活着的身体线',
    )
  })
})
