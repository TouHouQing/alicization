import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'chat-start-thin-chinese-same-her-reminder-recanonicalization',
    file: './main-chat-start-awareness.test.ts',
    snippets: [
      'replaces a thin Chinese same-her reminder shell with the canonical richer project awareness before direct chat start',
      'const thinChineseReminderShell = \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\'',
      'expect(resolved.preDialogueSendIdentity?.awarenessLine).not.toBe(thinChineseReminderShell)',
    ],
  },
  {
    entry: 'stream-runner-thin-chinese-same-her-reminder-recanonicalization',
    file: './main-chat-stream-runner.test.ts',
    snippets: [
      'prefers richer prepared phase-1 awareness over a payload continuation headline when the payload only carries a thin Chinese reminder shell',
      'const thinnerChinesePayloadReminder = \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\'',
      'const richerPreparedRuntimeAwarenessLine = \'我会先沿着同一个她这条线回答你：Alicization 还是本地优先数字生命项目。',
    ],
  },
  {
    entry: 'answer-planner-thin-chinese-same-her-reminder-rejected',
    file: './answer-planner.test.ts',
    snippets: [
      'does not let a thin Chinese same-her reminder shell stay visible in governingProject when richer same-her project carry already exists',
      'preDialogueAwarenessLine: \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\'',
      'expect(planner.governingProject).not.toContain(\'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\')',
    ],
  },
  {
    entry: 'answer-compiler-thin-chinese-same-her-reminder-rejected',
    file: './answer-compiler.test.ts',
    snippets: [
      'does not let a thin Chinese same-her reminder shell survive into supporting reality when same-her closure carry is already explicit',
      'preDialogueAwarenessLine: \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\'',
      'expect(projectAwarenessLine).not.toContain(\'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\')',
    ],
  },
  {
    entry: 'response-charter-thin-chinese-same-her-reminder-rejected',
    file: './response-charter.test.ts',
    snippets: [
      'prefers a richer same-her preDialogueAwarenessSummary over a thin Chinese project-awareness shell when charter rebuilds the visible reply posture',
      'const thinChineseReminderShell = \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\'',
      'expect(awarenessMustDo).not.toContain(thinChineseReminderShell)',
    ],
  },
  {
    entry: 'executive-brief-thin-chinese-same-her-reminder-rejected',
    file: './executive-answer-brief.test.ts',
    snippets: [
      'does not let a thin Chinese same-her reminder shell stay visible in the executive system brief when richer same-her closure carry already exists',
      'preDialogueAwarenessLine: \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\'',
      'expect(result.systemBlock).not.toContain(\'Project pre-dialogue awareness line: 回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\')',
    ],
  },
  {
    entry: 'runtime-delivery-reminders-thin-chinese-same-her-reminder-rejected',
    file: './runtime-delivery-reminders.test.ts',
    snippets: [
      'replaces an older persisted chinese execution-callback awareness audit when the live runtime project state carries a stronger same-her line',
      'const olderAuditReminder = \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\'',
      'preDialogueAwarenessSummary: olderAuditReminder,',
      'preDialogueAwarenessSummary: expect.stringContaining(fresherRuntimeAwarenessLine),',
    ],
  },
  {
    entry: 'runtime-governance-thin-chinese-same-her-reminder-treated-thin',
    file: './runtime-governance.test.ts',
    snippets: [
      'treats thin chinese reminder awareness shells as thin when governed rewrite continuity carry already has richer same-her phase closure lines',
      'const thinChineseReminder = \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\'',
      'answer project-state status from one same-her continuity, not as a detached shell',
    ],
  },
  {
    entry: 'visible-reply-realization-thin-chinese-same-her-reminder-rejected',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'prefers a stronger Chinese prepared-runtime project re-anchor over a thinner Chinese carried reminder shell',
      'rawSummary: \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\'',
      '我会先沿着同一个她这条线回答你：Alicization 还是本地优先数字生命项目。',
    ],
  },
  {
    entry: 'visible-reply-settlement-thin-chinese-same-her-reminder-rejected',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'preserves richer chinese phase-1 awareness carry through final settlement when runtime project-state is already stronger than thin chinese shells',
      'const thinCarriedReminder = \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\'',
      '.toBe(richerChineseAwarenessLine)',
      '.toContain(\'本地优先数字生命项目\')',
    ],
  },
] as const

describe('thin chinese same-her reminder audit', () => {
  it('keeps one explicit cross-boundary proof that the thin chinese same-her reminder shell is re-expanded before reply shaping widens outward', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'chat-start-thin-chinese-same-her-reminder-recanonicalization' }),
      expect.objectContaining({ entry: 'stream-runner-thin-chinese-same-her-reminder-recanonicalization' }),
      expect.objectContaining({ entry: 'answer-planner-thin-chinese-same-her-reminder-rejected' }),
      expect.objectContaining({ entry: 'answer-compiler-thin-chinese-same-her-reminder-rejected' }),
      expect.objectContaining({ entry: 'response-charter-thin-chinese-same-her-reminder-rejected' }),
      expect.objectContaining({ entry: 'executive-brief-thin-chinese-same-her-reminder-rejected' }),
      expect.objectContaining({ entry: 'runtime-delivery-reminders-thin-chinese-same-her-reminder-rejected' }),
      expect.objectContaining({ entry: 'runtime-governance-thin-chinese-same-her-reminder-treated-thin' }),
      expect.objectContaining({ entry: 'visible-reply-realization-thin-chinese-same-her-reminder-rejected' }),
      expect.objectContaining({ entry: 'visible-reply-settlement-thin-chinese-same-her-reminder-rejected' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the thin chinese same-her reminder claim to current behavior tests instead of broader project-awareness prose alone', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: these audited seams reject the thinner same-her reminder shell, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('answer-planner.test.ts')
    expect(matrixSource).toContain('answer-compiler.test.ts')
    expect(matrixSource).toContain('response-charter.test.ts')
  })
})
