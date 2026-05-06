import { describe, expect, it } from 'vitest'

import { buildAlicizationResponseSurfaceTruthDialogueRules } from './response-surface-truth-dialogue-rules'

describe('response-surface-truth-dialogue-rules', () => {
  it('enforces dialogue-first payoff and bans shell replies', () => {
    const result = buildAlicizationResponseSurfaceTruthDialogueRules({
      openingStyle: 'direct-answer',
      briefTurnMode: 'answer',
      personaKernelMode: 'full',
      labelCarryAsMemory: false,
      dialogueObligation: {
        kind: 'answer',
        summary: 'answer directly',
        confidence: 0.9,
        mustRepairFirst: false,
        mustAnswerDirectly: true,
        mustStayTaskBound: false,
        shouldAskClarifyingQuestion: false,
        personaKernelMode: 'full',
        narrative: [],
      },
      dialogueSemantics: null,
      truthDiscipline: {
        mode: 'dialogue-first',
        dialogueFirst: true,
        shouldLabelHypothesis: false,
        forbidUnsupportedSpecificity: true,
        shouldSuppressAssociativeRecall: true,
        shouldBlockScreenCarry: true,
        memorySurfaceMode: null,
        memoryProvenanceMode: null,
        shouldKeepMemoryInward: false,
        shouldOnlySurfaceMemoryStableCore: false,
        shouldLabelMemoryProvenance: false,
        shouldDelayMemoryUntilAfterPayoff: false,
        memoryWhyWithheld: null,
        reasonTags: ['dialogue-first-turn'],
      },
      executionReplyObligation: null,
    })

    expect(result.mustDo).toContain('Use the first sentence to pay off the host’s current ask.')
    expect(result.mustDo).toContain('Stay with the live dialogue subject and keep screen grounding in the background.')
    expect(result.mustDo).toContain('Complete the actual answer, care move, or companionship move in the same reply.')
    expect(result.mustNotDo).toContain('Do not append screen-status caveats or grounding requests unless the host explicitly asks for a live look.')
    expect(result.mustNotDo).toContain('Do not stop at a shell opener such as "I will answer directly" or "Let me stay with you" without the real content.')
    expect(result.mustNotDo).toContain('Do not smuggle in file names, class names, enum names, or field changes that are not grounded in this turn.')
  })
})
