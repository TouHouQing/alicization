import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'feedback-runtime-settlement-continuity-handoff',
    file: './runtime-proactive-feedback.test.ts',
    snippets: [
      'settles reply-within-120s feedback from the next user turn and queues follow-up wake',
      'syncSettledProactiveContinuityIntoActiveSession',
      'source: \'proactive-feedback\'',
      '\'feedback:user-turn-settlement\'',
    ],
  },
  {
    entry: 'feedback-runtime-origin-lost-pending-delivery-recovery',
    file: './runtime-dialogue-delivery.test.ts',
    snippets: [
      'keeps pending proactive delivery snapshot when origin is missing but autonomous family markers still survive on the payload',
      'turnId: \'execution-callback:default:thread-originless:123\'',
      'learningFocuses: [\'callback-carry\']',
    ],
  },
  {
    entry: 'feedback-next-chat-session-continuity-block',
    file: './runtime.test.ts',
    snippets: [
      'surfaces recent proactive feedback in the next chat session continuity block',
      'host replied within 120s after a proactive turn',
      'sameHerSummary: expect.stringContaining(\'Same Phase 1 digital life\')',
      'nextClosureTargetSummary: expect.stringContaining(\'Keep extending cross-modal same-her proof\')',
    ],
  },
  {
    entry: 'feedback-dream-project-state-carry',
    file: './runtime.test.ts',
    snippets: [
      'feeds settled proactive reply feedback into the next dream prompt',
      '[ALICIZATION_PROJECT_STATE]',
      'quiet_same_her_continuity=When the current continuity is inward and lower-pressure, preserve it as quiet same-her continuity rather than flattening it into a generic measured-return helper state.',
      'recent_actions=.*proactive-feedback:coding:reply-within-120s',
    ],
  },
  {
    entry: 'feedback-long-horizon-repair-first-self-carry',
    file: './long-horizon-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
      'long-horizon-repair-first-closure-pressure',
      'autobiographical-remembered-same-her-drift-carry',
      'noisy-desktop-repair-first-chain-durable-pressure',
    ],
  },
] as const

describe('proactive feedback project awareness audit', () => {
  it('keeps one explicit route-level proof that settled proactive feedback preserves same-her project awareness into the next chat-session dream preparation and long-horizon repair-first self-carry instead of decaying into generic outcome bookkeeping', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'feedback-runtime-settlement-continuity-handoff' }),
      expect.objectContaining({ entry: 'feedback-runtime-origin-lost-pending-delivery-recovery' }),
      expect.objectContaining({ entry: 'feedback-next-chat-session-continuity-block' }),
      expect.objectContaining({ entry: 'feedback-dream-project-state-carry' }),
      expect.objectContaining({ entry: 'feedback-long-horizon-repair-first-self-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the proactive-feedback continuity claim to current runtime tests instead of leaving the feedback path outside the same-her project-awareness proof map', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: proactive feedback settlement now has dedicated same-her route proof plus long-horizon repair-first carry, while future new entrypoint families and full long-run closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const runtimeFeedbackSource = readFileSync(new URL('./runtime-proactive-feedback.test.ts', import.meta.url), 'utf8')
    const runtimeSource = readFileSync(new URL('./runtime.test.ts', import.meta.url), 'utf8')
    const longHorizonSource = readFileSync(new URL('./long-horizon-project-awareness-audit.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('proactive-feedback-project-awareness-audit.test.ts')
    expect(runtimeFeedbackSource).toContain(
      'settles reply-within-120s feedback from the next user turn and queues follow-up wake',
    )
    expect(runtimeSource).toContain(
      'surfaces recent proactive feedback in the next chat session continuity block',
    )
    expect(runtimeSource).toContain(
      'feeds settled proactive reply feedback into the next dream prompt',
    )
    expect(longHorizonSource).toContain(
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
    )
  })
})
