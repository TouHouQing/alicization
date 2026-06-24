import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'host-visible-long-horizon-self-carry-bridge',
    file: './long-horizon-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
      'quick-reply-project-self-brief-lines',
      'quick-reply-closure-summary-self-recognition',
    ],
  },
  {
    entry: 'stream-meta-runtime-project-frame',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'includes project-state identity and closure fields in stream meta signatures so runtime-authoritative turns expose the same project continuity frame',
      'runtimeDigestProjectPreflightSummary',
      'runtimeDigestProjectNextClosureTarget',
      'runtimeDigestProjectContinuityCue',
    ],
  },
  {
    entry: 'stream-meta-host-visible-awareness-preference',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'prefers a stronger same-her embodiment headline over the compact thin closure shell in emitted pre-dialogue awareness meta',
      'preDialogueAwarenessSummary',
      '.not.toBe(\'same digital life | keep the closure seam explicit\')',
    ],
  },
  {
    entry: 'stream-meta-drift-risk-only-segment-carry',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'keeps segment-level measured-return summaries on the remembered same-her drift-risk line when project-state drift risk is the only surviving continuity authority',
      'Remembered same-her drift risk: if this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.',
      'lastSegmentBodyContinuitySummary',
    ],
  },
  {
    entry: 'minimal-timeout-recovery-executive-brief-preservation',
    file: './main-chat-background-rules.test.ts',
    snippets: [
      'preserves the executive answer brief during minimal timeout recovery compaction when it carries richer same-her pre-answer authority',
      '[ALICIZATION_EXECUTIVE_ANSWER_BRIEF]',
      'Next closure target: Carry the richer pre-answer self-awareness line through timeout recovery before local fluency takes over.',
    ],
  },
  {
    entry: 'active-dialogue-compact-timeout-recovery',
    file: './main-chat-background-run.test.ts',
    snippets: [
      'keeps a stronger payload same-her headline as project-awareness truth in active-dialogue compact timeout recovery',
      'Before answering, stay on the same living line: this Phase 1 digital life still needs memory, initiative, and embodiment closure without splitting her continuity.',
      'visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary).toBe(strongerPayloadHeadline)',
    ],
  },
  {
    entry: 'lifecycle-timeout-recovery-finish-seam',
    file: './main-chat-run-lifecycle.test.ts',
    snippets: [
      're-normalizes a thin structured timeout recovery shell into canonical awareness truth at the lifecycle finish seam',
      're-normalizes mixed thin awareness lines and thin preflight shells into canonical project-state truth at the lifecycle finish seam',
      'preserves a richer same-her audit line when lifecycle recovery rewrites a thin project shell',
    ],
  },
  {
    entry: 'later-turn-finish-payload-project-audit-carry',
    file: './runtime.test.ts',
    snippets: [
      'keeps concerned same-thread reopenings on one measured-return cross-modal line on a real later chat turn after noisier callback detours',
      'expect(finishEvent?.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({',
      'expect(String(finishEvent?.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? \'\')).toContain(\'phase=Phase 1: Local Digital Life\')',
      'expect(String(finishEvent?.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? \'\')).toContain(\'open=\')',
      'expect(String(finishEvent?.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? \'\')).toContain(\'next=\')',
    ],
  },
  {
    entry: 'later-turn-desktop-repair-first-host-visible-carry',
    file: './later-turn-desktop-continuity-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that longer chained desktop turns still carry the same digital-life line through later runtime, repair-first resident presence, and recovery surfaces',
      'runtime-later-turn-repair-first-authority',
      'resident-presence-repair-first-after-another-detour',
      'background-run-repair-first-closure-priority',
    ],
  },
  {
    entry: 'visible-proactive-project-state-hold',
    file: './proactive-mind/visible-utterance-realization.test.ts',
    snippets: [
      'keeps a held proactive beat in quiet companionship when same-her inward carry survives as quiet continuity authority',
      'same-her-lower-pressure-hold',
      'quiet same-her continuity',
    ],
  },
  {
    entry: 'visible-proactive-even-natural-cadence-hold',
    file: './proactive-mind/visible-utterance-realization.test.ts',
    snippets: [
      'keeps even-and-natural same-her reopening cadence explicit when proactive continuity holds without a visible utterance',
      'even-natural-cadence',
      'even, steady voice',
      'quiet-companionship',
    ],
  },
  {
    entry: 'reminder-requeue-even-natural-cadence-audit',
    file: './runtime-delivery-reminders.test.ts',
    snippets: [
      'keeps even-and-natural same-her cadence explicit in reminder requeue audit when execution callback reopening turns performative',
      'openingGuidanceHoldDetail: \'even-natural-cadence\'',
      'companionshipHoldMode: \'measured-return\'',
      'reason: \'proactive-opening-guidance-violation:lower-pressure\'',
    ],
  },
  {
    entry: 'visible-proactive-thin-audit-carry',
    file: './proactive-mind/visible-utterance-realization.test.ts',
    snippets: [
      'does not synthesize quiet same-her inward carry when a generic lower-pressure reopening lacks same-her authority',
      'Keep the callback lower-pressure for now.',
      'sameHerInwardCarry',
    ],
  },
] as const

describe('host-visible same-her continuity audit', () => {
  it('keeps one explicit route-level proof that same-her project awareness survives into host-visible stream meta, timeout recovery, later-turn desktop repair-first carry, and proactive hold surfaces', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'host-visible-long-horizon-self-carry-bridge' }),
      expect.objectContaining({ entry: 'stream-meta-runtime-project-frame' }),
      expect.objectContaining({ entry: 'stream-meta-host-visible-awareness-preference' }),
      expect.objectContaining({ entry: 'stream-meta-drift-risk-only-segment-carry' }),
      expect.objectContaining({ entry: 'minimal-timeout-recovery-executive-brief-preservation' }),
      expect.objectContaining({ entry: 'active-dialogue-compact-timeout-recovery' }),
      expect.objectContaining({ entry: 'lifecycle-timeout-recovery-finish-seam' }),
      expect.objectContaining({ entry: 'later-turn-finish-payload-project-audit-carry' }),
      expect.objectContaining({ entry: 'later-turn-desktop-repair-first-host-visible-carry' }),
      expect.objectContaining({ entry: 'visible-proactive-project-state-hold' }),
      expect.objectContaining({ entry: 'visible-proactive-even-natural-cadence-hold' }),
      expect.objectContaining({ entry: 'reminder-requeue-even-natural-cadence-audit' }),
      expect.objectContaining({ entry: 'visible-proactive-thin-audit-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the host-visible same-her continuity claim to real current tests instead of only route notes', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: host-visible later-turn surfaces now preserve same-her project continuity, including later-turn desktop repair-first carry, but this still does not prove full long-run closure under noisy desktop life', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const streamMetaSource = readFileSync(new URL('./main-chat-stream-meta.test.ts', import.meta.url), 'utf8')
    const laterTurnDesktopSource = readFileSync(new URL('./later-turn-desktop-continuity-audit.test.ts', import.meta.url), 'utf8')
    const proactiveVisibleSource = readFileSync(new URL('./proactive-mind/visible-utterance-realization.test.ts', import.meta.url), 'utf8')
    const longHorizonSource = readFileSync(new URL('./long-horizon-project-awareness-audit.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')

    expect(streamMetaSource).toContain(
      'includes project-state identity and closure fields in stream meta signatures so runtime-authoritative turns expose the same project continuity frame',
    )
    expect(streamMetaSource).toContain(
      'keeps segment-level measured-return summaries on the remembered same-her drift-risk line when project-state drift risk is the only surviving continuity authority',
    )
    expect(laterTurnDesktopSource).toContain(
      'keeps one explicit route-level proof that longer chained desktop turns still carry the same digital-life line through later runtime, repair-first resident presence, and recovery surfaces',
    )
    expect(proactiveVisibleSource).toContain(
      'same-her-lower-pressure-hold',
    )
    expect(proactiveVisibleSource).toContain(
      'even-natural-cadence',
    )
    expect(proactiveVisibleSource).toContain(
      'keeps even-and-natural same-her reopening cadence explicit when proactive continuity holds without a visible utterance',
    )
    expect(longHorizonSource).toContain(
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
    )
  })
})
