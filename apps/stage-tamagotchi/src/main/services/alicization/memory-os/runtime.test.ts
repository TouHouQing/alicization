import { describe, expect, it, vi } from 'vitest'

import {
  runAlicizationMemoryOsTurn,
  runAlicizationMemoryOsTurnRuntime,
} from './runtime'

describe('memory-os runtime', () => {
  it('sanitizes deleted raw transcript protocol fields while preserving long-term owner context', () => {
    const retrievedFacts = [{ id: 'fact-1', subject: 'Alice', predicate: 'values', object: 'continuity' }]
    const recalledEpisodes = [{ id: 'episode-1', whatHappened: 'A durable long-term episode.' }]
    const proceduralMemories = [{ id: 'procedure-1', label: 'Return gently', approach: 'Resume the same thread.' }]
    const result = runAlicizationMemoryOsTurn({
      context: {
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts,
        recalledFragments: [],
        recalledEpisodes,
        proceduralMemories,
        recalledConversationHistory: [{
          turnId: 'turn-raw',
          userText: 'raw user transcript must not cross MemoryOS',
          assistantText: 'raw assistant transcript must not cross MemoryOS',
        }],
        recollectionIntent: {
          searchConversations: true,
        },
        memoryDeliberation: {
          selectedConversationTurnIds: ['turn-raw'],
          selectedBundles: [{
            id: 'legacy-bundle',
            conversationTurnId: 'turn-raw',
          }],
        },
      } as any,
    })

    expect(result.context.retrievedFacts).toBe(retrievedFacts)
    expect(result.context.recalledEpisodes).toBe(recalledEpisodes)
    expect(result.context.proceduralMemories).toBe(proceduralMemories)
    expect(result.context).not.toHaveProperty('recalledConversationHistory')
    expect(result.context.recollectionIntent).not.toHaveProperty('searchConversations')
    expect(result.context.memoryDeliberation).not.toHaveProperty('selectedConversationTurnIds')
    expect(result.context.memoryDeliberation?.selectedBundles?.[0]).not.toHaveProperty('conversationTurnId')
    expect(JSON.stringify(result.context)).not.toContain('raw user transcript')
    expect(JSON.stringify(result.context)).not.toContain('raw assistant transcript')
  })

  it('removes nested conversation candidates as whole objects across legacy discriminator shapes', () => {
    const result = runAlicizationMemoryOsTurn({
      context: {
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [{ id: 'fact-owner', subject: 'Alice', predicate: 'values', object: 'continuity' }],
        recalledFragments: [],
        nestedCandidateEnvelope: {
          candidates: [
            {
              kind: 'conversation',
              userText: 'kind raw user sentinel',
              assistantText: 'kind raw assistant sentinel',
            },
            {
              type: 'conversation-turn',
              userText: 'type raw user sentinel',
              assistantText: 'type raw assistant sentinel',
            },
            {
              candidateKind: 'conversation',
              userText: 'candidateKind raw user sentinel',
              assistantText: 'candidateKind raw assistant sentinel',
            },
            {
              sourceKind: 'conversation-turn',
              userText: 'sourceKind raw user sentinel',
              assistantText: 'sourceKind raw assistant sentinel',
            },
            {
              sourceKinds: ['fact', 'conversation'],
              userText: 'sourceKinds raw user sentinel',
              assistantText: 'sourceKinds raw assistant sentinel',
            },
            {
              kind: 'fact',
              id: 'fact-owner',
              summary: 'legitimate long-term owner context',
            },
          ],
        },
      } as any,
    })

    expect((result.context as any).nestedCandidateEnvelope.candidates).toEqual([{
      kind: 'fact',
      id: 'fact-owner',
      summary: 'legitimate long-term owner context',
    }])
    expect(JSON.stringify(result.context)).not.toContain('raw user sentinel')
    expect(JSON.stringify(result.context)).not.toContain('raw assistant sentinel')
  })

  it('does not pass reply governance fields into memory context tuning', async () => {
    const context = {
      hostAttitude: 'focused',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
    } as any
    const recallGovernor = {
      mode: 'thread',
    }
    const tuneContext = vi.fn(async input => input.context)

    await runAlicizationMemoryOsTurnRuntime({
      recallSeed: '继续当前记忆链路',
      recallGovernor,
      personaKernelMode: 'muted',
      resolveContext: async () => context,
      tuneContext,
      nowMs: () => 1,
    } as any)

    expect(tuneContext).toHaveBeenCalledWith({
      context,
      recallGovernor,
    })
  })
})
