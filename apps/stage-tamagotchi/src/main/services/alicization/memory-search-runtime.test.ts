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
      recallSeed: governor?.recallSeed ?? 'runtime seam',
      recallGovernor: governor,
    })

    expect(context.hostAttitude).toBe('warm')
    expect(context.recollectionIntent?.mode).toBe('execution-procedure')
  })
})
