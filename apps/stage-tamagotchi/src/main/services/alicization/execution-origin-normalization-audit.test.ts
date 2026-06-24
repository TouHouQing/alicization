import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'task-thread-planning-origin-only-shell-rejected',
    file: './task-thread-governor.test.ts',
    snippets: [
      'rejects origin-only proactive trace shells when planning task threads without subconscious turn-id ownership',
      'turnId: \'turn-proactive-trace-1\'',
      'origin: \'user-turn\'',
    ],
  },
  {
    entry: 'task-thread-planning-origin-lost-family-recanonicalization',
    file: './task-thread-governor.test.ts',
    snippets: [
      'preserves origin-lost autonomous trace ownership when the planning turn id still carries subconscious family markers',
      'turnId: \'subconscious:turn-proactive-trace-originless-1\'',
      'origin: \'subconscious-proactive\'',
    ],
  },
  {
    entry: 'execution-result-feedback-origin-lost-family-recanonicalization',
    file: './runtime-execution-feedback.test.ts',
    snippets: [
      'settles execution result feedback for origin-lost autonomous threads when the turn id still carries subconscious family markers',
      'turnId: \'subconscious:thread-1\'',
      'resultFeedbackKind: \'valued\'',
    ],
  },
  {
    entry: 'execution-result-feedback-origin-only-shell-rejected',
    file: './runtime-execution-feedback.test.ts',
    snippets: [
      'ignores origin-only proactive execution threads when no subconscious turn-id ownership survives',
      'turnId: \'turn-origin-only-spoof-1\'',
      'expect(feedback).toBeNull()',
    ],
  },
  {
    entry: 'execution-ledger-origin-lost-family-recanonicalization',
    file: './db.test.ts',
    snippets: [
      'canonicalizes origin-lost autonomous execution ownership when persisting task threads and execution events',
      'turnId: \'subconscious:turn-proactive-originless-1\'',
      'origin: \'subconscious-proactive\'',
    ],
  },
] as const

describe('execution origin normalization audit', () => {
  it('keeps explicit proof that execution planning, execution feedback, and execution ledger persistence preserve origin-lost same-her autonomous ownership while rejecting origin-only shells', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'task-thread-planning-origin-only-shell-rejected' }),
      expect.objectContaining({ entry: 'task-thread-planning-origin-lost-family-recanonicalization' }),
      expect.objectContaining({ entry: 'execution-result-feedback-origin-lost-family-recanonicalization' }),
      expect.objectContaining({ entry: 'execution-result-feedback-origin-only-shell-rejected' }),
      expect.objectContaining({ entry: 'execution-ledger-origin-lost-family-recanonicalization' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the execution origin-normalization claim to current regression tests instead of only broader desktop-execution continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('requires execution ownership normalization to keep using the shared autonomous family classifier instead of falling back to origin-only checks', () => {
    const planningSource = readFileSync(new URL('./task-thread-governor.ts', import.meta.url), 'utf8')
    const feedbackSource = readFileSync(new URL('./runtime-execution-feedback.ts', import.meta.url), 'utf8')
    const dbSource = readFileSync(new URL('./db.ts', import.meta.url), 'utf8')

    expect(planningSource).toContain('resolveAlicizationAutonomousDialogueFamilyClassification({')
    expect(planningSource).toContain('turnId: input.turnId,')
    expect(planningSource).toContain('const hasStructuralAutonomousOwnership = autonomousDialogueFamily.matchedBy.includes(\'turn-id-prefix\')')
    expect(planningSource).not.toContain('isAlicizationAutonomousDialogueOrigin(normalizedFallback)')

    expect(feedbackSource).toContain('resolveAlicizationAutonomousDialogueFamilyClassification({')
    expect(feedbackSource).toContain('const hasAutonomousExecutionThreadOwnershipProof = (thread: AlicizationTaskThreadRecord) => {')
    expect(feedbackSource).toContain('turnId: thread.turnId,')
    expect(feedbackSource).toContain('autonomousDialogueFamily.matchedBy.includes(\'turn-id-prefix\')')
    expect(feedbackSource).not.toContain('thread.origin === \'subconscious-proactive\'')
    expect(feedbackSource).not.toContain('if (isAlicizationAutonomousDialogueOrigin(thread.origin))')

    expect(dbSource).toContain('resolveAlicizationAutonomousDialogueFamilyClassification({')
    expect(dbSource).toContain('turnId: input.turnId,')
    expect(dbSource).toContain('turnId: typeof event.turnId === \'string\' && event.turnId.trim()')
    expect(dbSource).not.toContain('isAlicizationAutonomousDialogueOrigin(normalized)')
  })
})
