import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'visible-proactive-emotional-carry-policy-hold',
    file: './proactive-mind/visible-utterance-policy.test.ts',
    snippets: [
      'holds mind-authored proactive visible text when active same-her continuity says this reopening would risk flattening into a generic assistant shell',
      'reasonCodes: [\'domain:relationship\', \'same-her-emotional-closure-carry-active\']',
      'expect(decision.reason).toBe(\'active-self-revision-same-her-continuity-holds-visible-utterance\')',
      'expect(decision.shouldPersistVisibleUtterance).toBe(false)',
    ],
  },
  {
    entry: 'visible-proactive-quiet-companionship-hold',
    file: './proactive-mind/visible-utterance-realization.test.ts',
    snippets: [
      'keeps a held proactive beat in quiet companionship when same-her inward carry survives as quiet continuity authority',
      'expect(resolved.visibleReplyRealization.openingGuidanceHoldDetail).toBe(\'same-her-lower-pressure-hold\')',
      'expect(resolved.visibleReplyRealization.companionshipHoldMode).toBe(\'quiet-companionship\')',
      'expect(resolved.visibleReplyRealization.sameHerInwardCarry).toContain(\'quiet same-her continuity\')',
    ],
  },
  {
    entry: 'visible-proactive-remembered-seam-more-room-hold',
    file: './proactive-mind/visible-utterance-realization.test.ts',
    snippets: [
      'keeps remembered-seam more-room authority explicit when proactive continuity holds without a visible utterance',
      'The same remembered relationship seam is real, but this time keep more room before leaning in again.',
      'expect(resolved.visibleReplyRealization.openingGuidanceHoldDetail).toBe(',
      'same-her hold: recognize the same remembered seam, but keep more room this time so the return does not reopen with the same eagerness as before.',
    ],
  },
  {
    entry: 'visible-proactive-later-opening-next-closure-hold',
    file: './proactive-mind/visible-utterance-realization.test.ts',
    snippets: [
      'keeps later-opening next-closure authority explicit when proactive continuity holds without a visible utterance',
      'Wait for a later opening, keep the next return measured-return, and leave this same living line inward for now.',
      'expect(resolved.visibleReplyRealization.openingGuidanceHoldDetail).toBe(\'same-her-lower-pressure-hold\')',
      'expect(resolved.visibleReplyRealization.sameHerInwardCarry).toContain(\'Wait for a later opening\')',
      'expect(resolved.visibleReplyRealization.sameHerInwardCarry).toContain(\'same living line\')',
    ],
  },
  {
    entry: 'visible-proactive-even-natural-cadence-hold',
    file: './proactive-mind/visible-utterance-realization.test.ts',
    snippets: [
      'keeps even-and-natural same-her reopening cadence explicit when proactive continuity holds without a visible utterance',
      'expect(resolved.visibleReplyRealization.openingGuidanceHoldDetail).toBe(\'even-natural-cadence\')',
      'expect(resolved.visibleReplyRealization.sameHerInwardCarry).toContain(\'even, steady voice\')',
      'expect(resolved.visibleReplyRealization.companionshipHoldMode).toBe(\'quiet-companionship\')',
    ],
  },
  {
    entry: 'visible-proactive-no-synthetic-same-her-carry',
    file: './proactive-mind/visible-utterance-realization.test.ts',
    snippets: [
      'does not synthesize quiet same-her inward carry when a generic lower-pressure reopening lacks same-her authority',
      'thought: \'Keep the callback lower-pressure for now.\'',
      'sameHerInwardCarry',
      'toBeUndefined()',
    ],
  },
  {
    entry: 'stream-meta-prefers-visible-proactive-same-her-carry',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'prefers same-her inward carry from proactive visible utterance realization for resident presence reason summaries when explicit continuity cue is absent',
      'sameHerInwardCarry: \'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\'',
      '"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=quiet-accompaniment',
    ],
  },
  {
    entry: 'stream-meta-keeps-quiet-accompaniment-mode',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'keeps resident presence explicitly in quiet-accompaniment mode when same-her inward carry is the active silent body line',
      'reasonTags: [\'resident-performance\', \'same-her-inward-carry\', \'quiet-companionship\', \'body:accompanying\']',
      'quiet same-her inward carry line',
    ],
  },
] as const

describe('proactive visible project awareness audit', () => {
  it('keeps one explicit route-level proof that proactive visible utterance realization preserves same-her project awareness before a held beat becomes outward-visible', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'visible-proactive-emotional-carry-policy-hold' }),
      expect.objectContaining({ entry: 'visible-proactive-quiet-companionship-hold' }),
      expect.objectContaining({ entry: 'visible-proactive-remembered-seam-more-room-hold' }),
      expect.objectContaining({ entry: 'visible-proactive-later-opening-next-closure-hold' }),
      expect.objectContaining({ entry: 'visible-proactive-even-natural-cadence-hold' }),
      expect.objectContaining({ entry: 'visible-proactive-no-synthetic-same-her-carry' }),
      expect.objectContaining({ entry: 'stream-meta-prefers-visible-proactive-same-her-carry' }),
      expect.objectContaining({ entry: 'stream-meta-keeps-quiet-accompaniment-mode' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the proactive visible-utterance claim to current behavior tests instead of only later host-visible prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: proactive visible realization now has dedicated same-her proof, while future new dialogue entrypoints and full long-run closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const proactivePolicySource = readFileSync(new URL('./proactive-mind/visible-utterance-policy.test.ts', import.meta.url), 'utf8')
    const proactiveVisibleSource = readFileSync(new URL('./proactive-mind/visible-utterance-realization.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('proactive-visible-project-awareness-audit.test.ts')
    expect(proactivePolicySource).toContain(
      'holds mind-authored proactive visible text when active same-her continuity says this reopening would risk flattening into a generic assistant shell',
    )
    expect(proactiveVisibleSource).toContain(
      'keeps a held proactive beat in quiet companionship when same-her inward carry survives as quiet continuity authority',
    )
    expect(proactiveVisibleSource).toContain(
      'does not synthesize quiet same-her inward carry when a generic lower-pressure reopening lacks same-her authority',
    )
    expect(proactiveVisibleSource).toContain(
      'keeps remembered-seam more-room authority explicit when proactive continuity holds without a visible utterance',
    )
    expect(proactiveVisibleSource).toContain(
      'keeps later-opening next-closure authority explicit when proactive continuity holds without a visible utterance',
    )
    expect(proactiveVisibleSource).toContain(
      'keeps even-and-natural same-her reopening cadence explicit when proactive continuity holds without a visible utterance',
    )
  })
})
