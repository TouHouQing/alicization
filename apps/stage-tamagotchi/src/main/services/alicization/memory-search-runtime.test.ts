import { describe, expect, it } from 'vitest'

import {
  buildMemorySearchGovernorSystemBlock,
  buildTurnRecallGovernor,
  createAlicizationMemorySearchRuntime,
} from './memory-search-runtime'

describe('memory-search-runtime', () => {
  it('acts as the single external facade over recall governor and organic memory search', async () => {
    const runtime = createAlicizationMemorySearchRuntime({
      organicMemoryPrompt: {
        normalizeOrganicRecallText: raw => raw.trim().toLowerCase(),
        selectPromptActiveThoughts: ({ activeThoughts }) => activeThoughts,
        getOrganicMemorySnapshot: async () => ({
          hostAttitude: 'warm',
          coreIncarnation: '',
          activeThoughts: [],
        }),
        getLatestRelationshipDynamics: async () => null,
        retrieveMemoryFacts: async () => [],
        recallSubconsciousFragmentsWithGovernor: async () => [],
        recallEpisodicEventsWithGovernor: async () => [],
        buildHostPersonModel: async () => null,
        recallConversationHistory: async () => [],
        recallMemoryConsolidations: async () => [],
        isPersonaResidueMemoryText: () => false,
      },
    })

    const governor = buildTurnRecallGovernor({
      now: 10_000,
      dialogueWorldThread: {
        activeThread: 'keep repairing the runtime seam',
        currentQuestion: '上次那样做还适合吗',
        openLoops: ['runtime seam'],
        recentlyResolvedLoops: [],
        carriedFacts: [],
        relationDrift: 'steady',
        memoryMode: 'task-thread',
        recallKeys: ['runtime seam'],
        lastUserMove: '继续按之前那样修',
        lastAssistantMove: '先沿着同一条 seam 走。',
        lastOutcome: 'pending',
        pendingValidation: null,
        confidence: 0.82,
        narrative: [],
        updatedAt: 10_000,
      },
      conversationState: {
        jointThread: 'runtime seam',
        hostMove: '继续按之前那样修',
        activeProject: 'runtime seam',
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'guide',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: ['runtime seam'],
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: [],
        updatedAt: 10_000,
      },
    })

    expect(buildMemorySearchGovernorSystemBlock(governor)).toContain('[ALICIZATION_RECALL_GOVERNOR]')

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: [
        governor?.recallSeed ?? 'runtime seam',
        'mirror_runtime_continuity: loop=runtime seam | thread=keep repairing the runtime seam | stage=same-thread-continuation | reason=continue the same runtime repair workflow',
      ].join('\n'),
      recallGovernor: governor,
    })

    expect(context.hostAttitude).toBe('warm')
    expect(context.recollectionIntent?.mode).toBe('execution-procedure')
  })

  it('keeps fresher runtime self continuity carry together with richer same-her doctrine in recall governor anchors', () => {
    const governor = buildTurnRecallGovernor({
      now: 20_000,
      projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work. | next=Keep extending cross-modal identity-continuity',
      dialogueWorldThread: {
        activeThread: 'same callback line still lives here',
        currentQuestion: '是不是还该沿着同一条线回来',
        openLoops: ['callback continuity'],
        recentlyResolvedLoops: [],
        carriedFacts: [],
        relationDrift: 'steady',
        memoryMode: 'dialogue-carry',
        recallKeys: ['callback continuity'],
        lastUserMove: '继续沿着刚才那条线说',
        lastAssistantMove: '我还在这条线里。',
        lastOutcome: 'pending',
        pendingValidation: null,
        confidence: 0.84,
        narrative: [],
        updatedAt: 20_000,
      },
      conversationState: {
        jointThread: 'callback continuity',
        hostMove: '继续沿着刚才那条线说',
        activeProject: 'callback continuity',
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['callback continuity'],
        shouldHoldThread: true,
        carryEligible: true,
        confidence: 0.82,
        narrative: [],
        updatedAt: 20_000,
      } as any,
      answerCompiler: {
        answerSubject: 'relationship',
        recommendedAct: 'continue-thread',
      } as any,
      replyDeliberation: {
        selectedMotive: 'attune',
      } as any,
      selfContinuityAuthority: {
        selfLine: 'I am still here in this exact return, picking up the continuity state.',
        relationshipLine: 'When I come back, I should reopen gently and let trust arrive before closeness widens.',
        motiveLine: null,
        habitLine: null,
        inwardLine: 'Return softly first, then let the warmer line breathe.',
        authoritySummary: 'I am still here in this exact return, carrying the same bond back gently before widening.',
        sourceTags: ['runtime-current-turn', 'same-thread-continuation'],
      },
    })

    expect(governor?.mode).toBe('self-continuity')
    expect(governor?.recallSeed).toContain('self:I am still here in this exact return')
    expect(governor?.recallSeed).toContain('relationship:When I come back, I should reopen gently')
    expect(governor?.recallSeed).toContain('inward:Return softly first')
    expect(governor?.recallSeed).toContain('authority:I am still here in this exact return, carrying the same bond back gently')
    expect(governor?.recallSeed).toContain('project:Alicization is a local-first digital life project')
    expect(governor?.narrative).toEqual(expect.arrayContaining([
      expect.stringContaining('project-preflight:project:Alicization is a local-first digital life project'),
    ]))
  })
})
