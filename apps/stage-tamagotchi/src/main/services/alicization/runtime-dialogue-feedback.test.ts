import { describe, expect, it, vi } from 'vitest'

import {
  attachSynthesizedReflections as actualAttachSynthesizedReflections,
  buildDialogueReplyFeedbackOutcomeClosure as actualBuildDialogueReplyFeedbackOutcomeClosure,
} from './outcome-reinforcement'
import { buildDialogueReplyFeedbackAckKey, createAlicizationRuntimeDialogueFeedback, isOrdinaryDialogueConversationRow } from './runtime-dialogue-feedback'

describe('runtime dialogue feedback', () => {
  it('filters non-ordinary dialogue rows and builds stable ack keys', () => {
    const parseStoredConversationStructured = vi.fn(() => ({
      format: 'mind-turn-v1',
    }))
    expect(isOrdinaryDialogueConversationRow({
      row: {
        turnId: 'turn-1',
        sessionId: 'session-1',
        structuredJson: '{}',
        createdAt: 1,
      },
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      parseStoredConversationStructured,
    })).toBe(true)
    expect(buildDialogueReplyFeedbackAckKey({
      turnId: 'turn-1',
      sessionId: 'session-1',
      createdAt: 1,
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    })).toBe('session-1::turn-1')
  })

  it('settles ordinary dialogue feedback and triggers memory reconsolidation runtime', async () => {
    const persistOutcomeClosure = vi.fn(async () => {})
    const reconsolidateDialogueFeedbackMemoryTrace = vi.fn(async () => {})
    const appendRelationshipDynamics = vi.fn(async () => {})
    const persistDialogueReplyFeedbackAck = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeDialogueFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '你漏掉了刚才的关键事实',
      ensureActiveOrLatestSessionId: async () => 'session-1',
      withCardScope: async (_cardId, task) => await task(),
      ensureDialogueReplyFeedbackAck: async () => '',
      persistDialogueReplyFeedbackAck,
      parseStoredConversationStructured: () => ({
        format: 'mind-turn-v1',
        governance: {
          decisionTraceId: 'trace-1',
        },
      }),
      deriveDialogueReplyFeedbackKind: () => 'robotic',
      attachSynthesizedReflections: actualAttachSynthesizedReflections,
      buildDialogueReplyFeedbackOutcomeClosure: actualBuildDialogueReplyFeedbackOutcomeClosure,
      persistOutcomeClosure,
      appendAuditLog,
      memoryReconsolidationRuntime: {
        reconsolidateDialogueFeedbackMemoryTrace,
      },
      alicizationDb: {
        listConversationTurnsBySession: async () => [{
          turnId: 'turn-1',
          sessionId: 'session-1',
          assistantText: '我刚才遗漏了关键事实。',
          structuredJson: '{}',
          createdAt: 1,
        }],
        getLatestRelationshipDynamics: async () => null,
        appendRelationshipDynamics,
      },
    })

    const result = await runtime.settleRecentDialogueReplyFeedbackFromUserTurn({
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
    } as any, 10, 'test')

    expect(result).toBe('robotic')
    expect(persistOutcomeClosure).toHaveBeenCalled()
    expect(persistOutcomeClosure).toHaveBeenCalledWith('card-1', expect.objectContaining({
      memoryFacts: [],
      reflections: [],
      episodicEvents: expect.arrayContaining([
        expect.objectContaining({
          sourceKind: 'dialogue-feedback',
          whatHappened: expect.stringContaining('feedback=robotic'),
          felt: null,
          relationshipMeaning: null,
          lesson: null,
        }),
      ]),
    }))
    expect(reconsolidateDialogueFeedbackMemoryTrace).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'card-1',
      decisionTraceId: 'trace-1',
      feedback: 'robotic',
      feedbackExperience: {
        felt: null,
        relationshipMeaning: null,
        lesson: null,
        tags: ['dialogue-feedback', 'feedback:robotic'],
      },
    }))
    expect(appendRelationshipDynamics).toHaveBeenCalledWith(expect.objectContaining({
      hostAttitude: 'dialogue_feedback=robotic',
      source: 'dialogue-feedback:robotic',
    }))
    expect(persistDialogueReplyFeedbackAck).toHaveBeenCalled()
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'reply-feedback-settled',
    }), 'card-1')
  })

  it('carries structured affective residue from the previous reply runtime digest into the dialogue-feedback closure instead of dropping it as prose-only feedback', async () => {
    const persistOutcomeClosure = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeDialogueFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '这句还是太用力了',
      ensureActiveOrLatestSessionId: async () => 'session-structured-residue',
      withCardScope: async (_cardId, task) => await task(),
      ensureDialogueReplyFeedbackAck: async () => '',
      persistDialogueReplyFeedbackAck: vi.fn(async () => {}),
      parseStoredConversationStructured: () => ({
        format: 'mind-turn-v1',
        governance: {
          decisionTraceId: 'trace-structured-residue',
        },
        runtimeDigest: {
          affectiveResidue: {
            version: 'affective-residue-memory-v1',
            updatedAt: 88_100,
            residues: [{
              kind: 'afterglow',
              intensity: 0.66,
              persistence: 0.71,
              confidence: 0.84,
              polarity: 'warm',
              releaseMode: 'delay-until-open-window',
              summary: 'The previous turn remains emotionally salient.',
              sourceSignals: ['previous-turn-affect'],
              lastUpdatedAt: 88_100,
            }],
            dominantResidueKind: 'afterglow',
            afterglowPressure: 0.68,
            repairPressure: 0.22,
            burdenPressure: 0.09,
            trustPressure: 0.47,
            restProtectivePressure: 0.18,
            relationshipCadence: {
              cadenceMode: 'repair',
              distancePosture: 'observed',
              companionshipDensity: 0.52,
              repairRecovery: 0.31,
              overreachRisk: 0.36,
              fatigueGuard: 0.19,
              afterglowCarry: 0.62,
              shouldDelayWarmth: true,
              shouldProtectRest: false,
              reasonTags: ['previous-turn-affect'],
              summary: 'Relationship cadence evidence from the previous turn.',
            },
            sourceSignals: ['previous-turn-affect'],
            summary: 'The previous turn remains emotionally salient.',
          },
          derivedMindStateBundle: {
            affectiveResidue: {
              version: 'affective-residue-memory-v1',
              updatedAt: 88_200,
              residues: [{
                kind: 'repair',
                intensity: 0.74,
                persistence: 0.78,
                confidence: 0.87,
                polarity: 'protective',
                releaseMode: 'delay-until-open-window',
                summary: 'The host correction remains emotionally salient.',
                sourceSignals: ['host-correction'],
                lastUpdatedAt: 88_200,
              }],
              dominantResidueKind: 'repair',
              afterglowPressure: 0.19,
              repairPressure: 0.79,
              burdenPressure: 0.12,
              trustPressure: 0.41,
              restProtectivePressure: 0.26,
              relationshipCadence: {
                cadenceMode: 'repair',
                distancePosture: 'observed',
                companionshipDensity: 0.44,
                repairRecovery: 0.72,
                overreachRisk: 0.39,
                fatigueGuard: 0.28,
                afterglowCarry: 0.46,
                shouldDelayWarmth: true,
                shouldProtectRest: false,
                reasonTags: ['host-correction'],
                summary: 'Relationship cadence evidence from the host correction.',
              },
              sourceSignals: ['host-correction'],
              summary: 'The host correction remains emotionally salient.',
            },
          },
        },
      }),
      deriveDialogueReplyFeedbackKind: () => 'intrusive',
      attachSynthesizedReflections: actualAttachSynthesizedReflections,
      buildDialogueReplyFeedbackOutcomeClosure: actualBuildDialogueReplyFeedbackOutcomeClosure,
      persistOutcomeClosure,
      appendAuditLog: vi.fn(async () => {}),
      memoryReconsolidationRuntime: {
        reconsolidateDialogueFeedbackMemoryTrace: vi.fn(async () => {}),
      },
      alicizationDb: {
        listConversationTurnsBySession: async () => [{
          turnId: 'turn-structured-residue',
          sessionId: 'session-structured-residue',
          assistantText: '我先靠近一点把这条线接住。',
          structuredJson: '{}',
          createdAt: 88_000,
        }],
        getLatestRelationshipDynamics: async () => null,
        appendRelationshipDynamics: vi.fn(async () => {}),
      },
    })

    const result = await runtime.settleRecentDialogueReplyFeedbackFromUserTurn({
      cardId: 'card-1',
      turnId: 'turn-user-structured-residue',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
    } as any, 88_300, 'test')

    expect(result).toBe('intrusive')
    expect(persistOutcomeClosure).toHaveBeenCalledWith('card-1', expect.objectContaining({
      affectiveResidue: expect.objectContaining({
        dominantResidueKind: 'afterglow',
        relationshipCadence: expect.objectContaining({
          cadenceMode: 'repair',
        }),
      }),
    }))
  })
})
