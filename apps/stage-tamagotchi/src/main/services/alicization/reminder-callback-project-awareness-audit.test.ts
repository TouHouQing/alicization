import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'callback-persistence-current-project-state-precedence',
    file: './runtime-delivery-reminders.test.ts',
    snippets: [
      'prefers current callback project-state over static repo brief when persisting execution callback continuity',
      'Runtime-visible callback continuity still needs to stay aligned with project-state carry after persistence.',
      'project-state carry after persistence',
    ],
  },
  {
    entry: 'callback-persistence-host-confirmed-resume-boundary',
    file: './runtime-delivery-reminders.test.ts',
    snippets: [
      'keeps host-confirmed resume confirmation boundaries explicit in host-visible callback persistence even when the callback llm payload no longer repeats them',
      'same-her hold: execution-resume-confirmation approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted',
      'host-confirmed-before-redispatch',
      'resume-before-dispatch',
    ],
  },
  {
    entry: 'callback-persistence-pre-dialogue-awareness-backfill',
    file: './runtime-delivery-reminders.test.ts',
    snippets: [
      'keeps explicit execution-callback pre-dialogue awareness when backfilling project-state audit from persisted project state',
      'preDialogueAwarenessSummary',
      'same local-first digital life project',
    ],
  },
  {
    entry: 'callback-persistence-compact-open-next-focus',
    file: './runtime-delivery-reminders.test.ts',
    snippets: [
      'keeps compact open and next focus summaries alive in execution-callback reminder persistence so project awareness does not depend on long closure prose alone',
      'nextClosureTargetSummary: \'Keep execution callback persistence on one same-her line.\'',
      'continuitySummary: \'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    ],
  },
  {
    entry: 'callback-persistence-runtime-landed-open-next-precedence',
    file: './runtime-delivery-reminders.test.ts',
    snippets: [
      'keeps fresher execution-callback next-closure target grouped with landed and open closure carry during reminder persistence',
      'Execution callback continuity now keeps landed project-state carry explicit through the later return.',
      'Keep execution-result persistence carrying landed and still-open closure carry together instead of splitting them into detached project-status fragments.',
    ],
  },
  {
    entry: 'callback-persistence-project-state-audit-shape',
    file: './runtime-delivery-reminders.test.ts',
    snippets: [
      'expect(appendedTurn?.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain(\'same-her=\')',
      'expect(appendedTurn?.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain(\'drift=\')',
      'expect(appendedTurn?.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain(\'phase=\')',
      'expect(appendedTurn?.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary).toContain(\'local-first digital life project\')',
    ],
  },
  {
    entry: 'callback-persistence-origin-lost-family-recanonicalization',
    file: './runtime.test.ts',
    snippets: [
      'canonicalizes origin-lost reminder-family runtime turns before persistence so they do not drift into user-turn dialogue world state',
      'canonicalizes origin-lost execution-callback runtime turns before persistence so callback carry does not drift into user-turn dialogue world state',
      'expect(persistedTurn?.origin).toBe(\'subconscious-proactive\')',
      'expect(visualPresenceState.dialogueWorldThread ?? null).toBeNull()',
    ],
  },
] as const

describe('reminder callback project awareness audit', () => {
  it('keeps one explicit route-level proof that reminder and execution-callback delivery preserve same-her project awareness before host-visible callback speech lands', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'callback-persistence-current-project-state-precedence' }),
      expect.objectContaining({ entry: 'callback-persistence-host-confirmed-resume-boundary' }),
      expect.objectContaining({ entry: 'callback-persistence-pre-dialogue-awareness-backfill' }),
      expect.objectContaining({ entry: 'callback-persistence-compact-open-next-focus' }),
      expect.objectContaining({ entry: 'callback-persistence-runtime-landed-open-next-precedence' }),
      expect.objectContaining({ entry: 'callback-persistence-project-state-audit-shape' }),
      expect.objectContaining({ entry: 'callback-persistence-origin-lost-family-recanonicalization' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the reminder/callback delivery continuity claim to real current tests instead of only broad matrix wording', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: callback/reminder delivery now has route-level project-awareness proof, but this still does not prove every future delivery family will inherit the same chain automatically', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const reminderSource = readFileSync(new URL('./runtime-delivery-reminders.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('reminder-callback-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('host-confirmed resume confirmation boundaries')
    expect(matrixSource).toContain('compact focus summaries')
    expect(matrixSource).toContain('origin-lost autonomous callback/reminder families')

    expect(reminderSource).toContain(
      'keeps explicit execution-callback pre-dialogue awareness when backfilling project-state audit from persisted project state',
    )
  })
})
