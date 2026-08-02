import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./runtime-chat-perception-augment.ts', import.meta.url), 'utf8')

describe('runtime-chat-perception-augment reply authority boundary', () => {
  it('does not inject reply-governance system blocks or compact reply controls', () => {
    expect(source).toContain('const systemBlocks: string[] = []')
    expect(source).not.toMatch(
      /systemBlocks\.(?:executiveAnswerBrief|responseSurfaceContract|mindTurnContract|responseCharter|answerPlanner)/u,
    )
    expect(source).not.toMatch(
      /build(?:DialogueActKernel|DiscourseState|MindSynthesis|ConversationState|DialogueWorldThread|AnswerCompiler|CurrentConsciousFrame|ClaimEvidenceLedger|ReplyDeliberation|MemorySearchGovernor|DialogueTurnEncounter|AlicizationDialogueObligation|DialogueFocusGovernance)SystemBlock/u,
    )
    expect(source).not.toContain('buildAlicizationAnswerPlannerSystemBlock')
    expect(source).not.toContain('buildCompactMindTurnControlSystemBlock')
    expect(source).not.toContain('buildAlicizationVisibleReplySurfacePlan')
    expect(source).not.toContain('buildAlicizationMindTurnGovernance')
    expect(source).not.toContain('compactMindGovernedChatMessages')
    expect(source).not.toContain('executiveAnswerBrief')
    expect(source).not.toContain('responseCharter')
    expect(source).not.toContain('responseSurfaceContract')
    expect(source).not.toContain('getActiveSelfRevisionStatePatch')
    expect(source).toContain('turnMode: \'answer\' as const')
    expect(source).toContain('personaKernelMode: \'full\' as const')
    expect(source).toContain('mindTurnContract: null')
    expect(source).toContain('mindTurnGovernance: null')
  })

  it('keeps perception facts and invited inspection context available', () => {
    expect(source).toContain('buildChatPerceptionSystemBlock')
    expect(source).toContain('buildChatInspectionContractSystemBlock')
    expect(source).not.toContain('buildChatVisualPresenceSystemBlock')
  })

  it('keeps fresh memory candidates in the recall seed', () => {
    expect(source).toContain('resolveHumanlikeMemoryRecallSeedFromEventHistory')
    expect(source).toContain('humanlikeMemoryRecallSeed,')
    expect(source).toContain('limit: 24,')
  })
})
