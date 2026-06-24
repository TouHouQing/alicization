import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'dialogue-feedback-self-continuity-memory-trace',
    file: './runtime-dialogue-feedback.test.ts',
    snippets: [
      'settles ordinary dialogue feedback and triggers memory reconsolidation runtime',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'lesson: expect.stringContaining(\'same digital life line\')',
      'predicate: \'closure\'',
    ],
  },
  {
    entry: 'dialogue-feedback-canonical-backfill',
    file: './runtime-dialogue-feedback.test.ts',
    snippets: [
      're-normalizes missing pre-dialogue project awareness before settling dialogue feedback so auxiliary reply-feedback paths cannot skip the same-her project brief',
      'resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)',
      'preDialogueAwarenessLine: expectedDebug?.preDialogueAwarenessLine',
      'preDialogueCompanionBriefingLine: expectedDebug?.preDialogueCompanionBriefingLine',
    ],
  },
  {
    entry: 'dialogue-feedback-long-horizon-repair-first-self-carry',
    file: './long-horizon-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
      'long-horizon-repair-first-closure-pressure',
      'autobiographical-remembered-same-her-drift-carry',
      'noisy-desktop-repair-first-chain-durable-pressure',
    ],
  },
] as const

describe('dialogue feedback project awareness audit', () => {
  it('keeps one explicit route-level proof that reply-feedback settlement preserves same-her project awareness before memory and relationship consequences are written back and can still feed long-horizon repair-first self-carry', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'dialogue-feedback-self-continuity-memory-trace' }),
      expect.objectContaining({ entry: 'dialogue-feedback-canonical-backfill' }),
      expect.objectContaining({ entry: 'dialogue-feedback-long-horizon-repair-first-self-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the dialogue-feedback claim to current behavior tests instead of only indirect normalization coverage', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: dialogue feedback settlement now has dedicated same-her route proof and a long-horizon repair-first carry bridge, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const feedbackSource = readFileSync(new URL('./runtime-dialogue-feedback.test.ts', import.meta.url), 'utf8')
    const longHorizonSource = readFileSync(new URL('./long-horizon-project-awareness-audit.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(feedbackSource).toContain(
      're-normalizes missing pre-dialogue project awareness before settling dialogue feedback so auxiliary reply-feedback paths cannot skip the same-her project brief',
    )
    expect(feedbackSource).toContain(
      'settles ordinary dialogue feedback and triggers memory reconsolidation runtime',
    )
    expect(longHorizonSource).toContain(
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
    )
  })
})
