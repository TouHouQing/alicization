import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'outcome-reinforcement-dialogue-closure-memory',
    file: './outcome-reinforcement.test.ts',
    snippets: [
      'writes ordinary dialogue robotic feedback back into the same long-horizon growth chain',
      'fact.subject === \'project\'',
      'fact.predicate === \'closure\'',
      'String(fact.object).includes(\'Same Phase 1 digital life\')',
      'expect(closure.episodicEvents[0]?.lesson).toContain(\'same digital life\')',
    ],
  },
  {
    entry: 'outcome-reinforcement-execution-closure-memory',
    file: './outcome-reinforcement.test.ts',
    snippets: [
      'writes valued execution-result feedback back into same-her Phase 1 closure memory instead of only procedure learning',
      'String(fact.object).includes(\'same-her\')',
      'String(fact.object).includes(\'Phase 1\')',
      'expect(closure.episodicEvents[0]?.tags).toEqual(expect.arrayContaining([',
      '\'phase-1-local-digital-life\'',
    ],
  },
  {
    entry: 'outcome-reinforcement-thread-briefing-preferred',
    file: './outcome-reinforcement.test.ts',
    snippets: [
      'prefers the execution thread project briefing when writing execution-result closure memory',
      'Execution-result feedback still needs to carry the same-her open loop into memory after execution settles.',
      'Close execute -> feedback -> remember without falling back to a generic task shell.',
      'expect(closure.episodicEvents[0]?.tags).toContain(\'same-her-drift-risk\')',
    ],
  },
  {
    entry: 'dialogue-feedback-runtime-outcome-builder-handoff',
    file: './runtime-dialogue-feedback.test.ts',
    snippets: [
      'settles ordinary dialogue feedback and triggers memory reconsolidation runtime',
      'buildDialogueReplyFeedbackOutcomeClosure: actualBuildDialogueReplyFeedbackOutcomeClosure',
      'predicate: \'closure\'',
      'lesson: expect.stringContaining(\'same digital life line\')',
      'source: \'dialogue-feedback:robotic\'',
    ],
  },
  {
    entry: 'execution-feedback-runtime-outcome-builder-handoff',
    file: './runtime-execution-feedback.test.ts',
    snippets: [
      'passes structured execution project briefing into result feedback closure so Phase 1 open-loop carry does not depend on thin summary text',
      'buildExecutionResultFeedbackOutcomeClosure).toHaveBeenCalledWith(expect.objectContaining({',
      'primaryOpenLoop: expect.stringContaining(\'Execution-result feedback still needs to preserve same-her closure\')',
      'nextClosureTarget: expect.stringContaining(\'Keep extending cross-modal same-her proof\')',
      'sameHerSelfLine: \'开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。\'',
    ],
  },
  {
    entry: 'execution-feedback-resume-confirmation-memory-handoff',
    file: './runtime-execution-feedback.test.ts',
    snippets: [
      'passes host-confirmed resume evidence from execution events into result feedback memory reconsolidation',
      'confirmationBoundary: \'host-confirmed-before-redispatch\'',
      'auditability: \'resume-before-dispatch\'',
      'resumeConfirmationSummary: \'approval=host-confirmed previous=needs-affirmation resumed=planned previousPermission=none permission=explicit effect=mutate risk=medium confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation\'',
    ],
  },
  {
    entry: 'execution-feedback-resume-confirmation-memory-writeback',
    file: './runtime-memory-reconsolidation.test.ts',
    snippets: [
      'resumeConfirmationSummary: \'approval=host-confirmed previous=needs-affirmation resumed=planned previousPermission=none permission=explicit effect=mutate risk=medium confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation\'',
      'execution-resume-confirmation:approval=host-confirmed previous=needs-affirmation resumed=planned previousPermission=none permission=explicit effect=mutate risk=medium confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation',
      'resumeMemoryMode: \'host-confirmed-before-redispatch\'',
      'rationale: expect.stringContaining(\'host-confirmed resume before redispatch\')',
    ],
  },
] as const

describe('outcome reinforcement project awareness audit', () => {
  it('keeps one explicit route-level proof that feedback outcome reinforcement writes same-her Phase 1 closure carry back into memory instead of letting dialogue or execution feedback settle as generic bookkeeping', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'outcome-reinforcement-dialogue-closure-memory' }),
      expect.objectContaining({ entry: 'outcome-reinforcement-execution-closure-memory' }),
      expect.objectContaining({ entry: 'outcome-reinforcement-thread-briefing-preferred' }),
      expect.objectContaining({ entry: 'dialogue-feedback-runtime-outcome-builder-handoff' }),
      expect.objectContaining({ entry: 'execution-feedback-runtime-outcome-builder-handoff' }),
      expect.objectContaining({ entry: 'execution-feedback-resume-confirmation-memory-handoff' }),
      expect.objectContaining({ entry: 'execution-feedback-resume-confirmation-memory-writeback' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the outcome-reinforcement closure writeback claim to current behavior tests instead of only downstream feedback-route prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: feedback outcome reinforcement now has dedicated same-her writeback proof while future new dialogue entrypoints and full noisy-desktop closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const reinforcementSource = readFileSync(new URL('./outcome-reinforcement.test.ts', import.meta.url), 'utf8')
    const dialogueFeedbackSource = readFileSync(new URL('./runtime-dialogue-feedback.test.ts', import.meta.url), 'utf8')
    const executionFeedbackSource = readFileSync(new URL('./runtime-execution-feedback.test.ts', import.meta.url), 'utf8')
    const reconsolidationSource = readFileSync(new URL('./runtime-memory-reconsolidation.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('outcome-reinforcement-project-awareness-audit.test.ts')
    expect(reinforcementSource).toContain(
      'writes valued execution-result feedback back into same-her Phase 1 closure memory instead of only procedure learning',
    )
    expect(reinforcementSource).toContain(
      'prefers the execution thread project briefing when writing execution-result closure memory',
    )
    expect(dialogueFeedbackSource).toContain(
      'settles ordinary dialogue feedback and triggers memory reconsolidation runtime',
    )
    expect(executionFeedbackSource).toContain(
      'passes structured execution project briefing into result feedback closure so Phase 1 open-loop carry does not depend on thin summary text',
    )
    expect(executionFeedbackSource).toContain(
      'passes host-confirmed resume evidence from execution events into result feedback memory reconsolidation',
    )
    expect(reconsolidationSource).toContain(
      'resumeMemoryMode: \'host-confirmed-before-redispatch\'',
    )
  })
})
