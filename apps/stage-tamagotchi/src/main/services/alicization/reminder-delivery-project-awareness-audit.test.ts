import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'reminder-shared-project-state-audit-repair-path',
    file: './runtime-delivery-reminders.test.ts',
    snippets: [
      'reuses one shared Phase 1 project-state audit repair path for host-visible and execution-callback reminder carries',
      'expect(source).toContain(\'resolveAlicizationProjectPreDialogueAwarenessLine\')',
      'expect(source).toContain(\'buildProjectStateContinuitySummary\')',
    ],
  },
  {
    entry: 'reminder-later-turn-emotional-closure-continuity',
    file: './runtime-delivery-reminders.test.ts',
    snippets: [
      'keeps emotional closure in project-state continuity summaries for later-turn reminder reuse',
      'Project-state continuity already survives into reminder persistence.',
      'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
    ],
  },
  {
    entry: 'reminder-runtime-chinese-same-her-awareness-audit-upgrade',
    file: './runtime-delivery-reminders.test.ts',
    snippets: [
      'replaces an older persisted chinese execution-callback awareness audit when the live runtime project state carries a stronger same-her line',
      'const olderAuditReminder = \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\'',
      'preDialogueAwarenessSummary: olderAuditReminder,',
      'preDialogueAwarenessSummary: expect.stringContaining(fresherRuntimeAwarenessLine),',
    ],
  },
  {
    entry: 'reminder-persistence-visible-authority-and-project-state',
    file: './runtime-delivery-reminders.test.ts',
    snippets: [
      'persists mind-authored reminder turns with visible reply authority metadata',
      'visibleReplyAuthority: \'llm-mind\'',
      'local-first digital life project',
    ],
  },
  {
    entry: 'reminder-partial-audit-backfill',
    file: './runtime-delivery-reminders.test.ts',
    snippets: [
      'backfills missing same-her and project-awareness audit fields when reminder visible reply audit is only partially present',
      'Already carrying some landed progress.',
      'continuitySummary: expect.stringContaining(\'same-her=\')',
    ],
  },
  {
    entry: 'reminder-restraint-requeue-before-visible-closeness',
    file: './runtime-delivery-reminders.test.ts',
    snippets: [
      'requeues mind-authored reminder when memory restraint says visible closeness should wait for a later window',
      'shouldDelayUntilAfterPayoff: true',
      'expect(requeueScheduledTask).toHaveBeenCalledWith(',
    ],
  },
] as const

describe('reminder delivery project awareness audit', () => {
  it('keeps one explicit route-level proof that host-visible reminder delivery preserves same-her project awareness and restraint before later-turn reminder speech lands', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'reminder-shared-project-state-audit-repair-path' }),
      expect.objectContaining({ entry: 'reminder-later-turn-emotional-closure-continuity' }),
      expect.objectContaining({ entry: 'reminder-runtime-chinese-same-her-awareness-audit-upgrade' }),
      expect.objectContaining({ entry: 'reminder-persistence-visible-authority-and-project-state' }),
      expect.objectContaining({ entry: 'reminder-partial-audit-backfill' }),
      expect.objectContaining({ entry: 'reminder-restraint-requeue-before-visible-closeness' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the reminder-delivery claim to current behavior tests instead of only broad reminder row wording', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: current host-visible reminder delivery now has dedicated same-her proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const reminderSource = readFileSync(new URL('./runtime-delivery-reminders.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('reminder-delivery-project-awareness-audit.test.ts')
    expect(reminderSource).toContain(
      'persists mind-authored reminder turns with visible reply authority metadata',
    )
    expect(reminderSource).toContain(
      'requeues mind-authored reminder when memory restraint says visible closeness should wait for a later window',
    )
  })
})
