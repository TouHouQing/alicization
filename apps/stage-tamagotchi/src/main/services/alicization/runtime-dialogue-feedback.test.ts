import { describe, expect, it, vi } from 'vitest'

import {
  resolveAlicizationChatStartPayloadPreDialogueSendIdentity,
  summarizeAlicizationPreDialogueSendIdentityForDebug,
} from './main-chat-start-awareness'
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
      readLatestUserMessageText: () => '你这句太模板了',
      ensureActiveOrLatestSessionId: async () => 'session-1',
      withCardScope: async (_cardId, task) => await task(),
      ensureDialogueReplyFeedbackAck: async () => '',
      persistDialogueReplyFeedbackAck,
      parseStoredConversationStructured: () => ({
        format: 'mind-turn-v1',
        governance: {
          decisionTraceId: 'trace-1',
        },
        personStateProjection: {
          selfContinuityAuthority: {
            inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sourceTags: ['autobiographical-self', 'project-state-carry'],
          },
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
          assistantText: '上一句像模板壳。',
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
      memoryFacts: expect.arrayContaining([
        expect.objectContaining({
          subject: 'project',
          predicate: 'closure',
          object: expect.stringContaining('Same Phase 1 digital life'),
        }),
      ]),
      episodicEvents: expect.arrayContaining([
        expect.objectContaining({
          lesson: expect.stringContaining('same digital life line'),
        }),
      ]),
    }))
    expect(reconsolidateDialogueFeedbackMemoryTrace).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'card-1',
      decisionTraceId: 'trace-1',
      feedback: 'robotic',
      feedbackExperience: expect.objectContaining({
        felt: expect.stringContaining('same-her line shelled over'),
        relationshipMeaning: expect.stringContaining('tool shell'),
        lesson: expect.stringContaining('Let the body return like this'),
        tags: expect.arrayContaining([
          'dialogue-feedback',
          'feedback:robotic',
          'body-rehumanize',
          'continuity-same-her',
          'residue-shell-pressure',
        ]),
      }),
      selfContinuityInwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      selfContinuitySourceTags: ['autobiographical-self', 'project-state-carry'],
    }))
    expect(appendRelationshipDynamics).toHaveBeenCalledWith(expect.objectContaining({
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
              summary: 'The line is still settling inwardly before it can reopen.',
              sourceSignals: ['same-thread-afterglow'],
              lastUpdatedAt: 88_100,
            }],
            dominantResidueKind: 'afterglow',
            afterglowPressure: 0.68,
            repairPressure: 0.22,
            burdenPressure: 0.09,
            trustPressure: 0.47,
            restProtectivePressure: 0.18,
            relationshipCadence: {
              cadenceMode: 'measured-return',
              distancePosture: 'measured-room',
              companionshipDensity: 0.52,
              repairRecovery: 0.31,
              overreachRisk: 0.36,
              fatigueGuard: 0.19,
              afterglowCarry: 0.62,
              shouldDelayWarmth: true,
              shouldProtectRest: false,
              reasonTags: ['same-thread-afterglow'],
              summary: 'Leave measured room before reopening the same line.',
            },
            sourceSignals: ['same-thread-afterglow'],
            summary: 'The same line still wants a measured return.',
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
                summary: 'Repair still wants the line to stay quieter than before.',
                sourceSignals: ['repair-before-closeness'],
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
                distancePosture: 'protect-space',
                companionshipDensity: 0.44,
                repairRecovery: 0.72,
                overreachRisk: 0.39,
                fatigueGuard: 0.28,
                afterglowCarry: 0.46,
                shouldDelayWarmth: true,
                shouldProtectRest: false,
                reasonTags: ['repair-before-closeness'],
                summary: 'Repair cadence still wants quiet room.',
              },
              sourceSignals: ['repair-before-closeness'],
              summary: 'Repair residue is still carrying the line inwardly.',
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
          cadenceMode: 'measured-return',
        }),
      }),
    }))
  })

  it('re-normalizes missing pre-dialogue project awareness before settling dialogue feedback so auxiliary reply-feedback paths cannot skip the same-her project brief', async () => {
    const appendAuditLog = vi.fn(async () => {})
    const payload = {
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
      preDialogueSendIdentity: null,
    } as any
    const expectedDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(
      resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload),
    )
    const runtime = createAlicizationRuntimeDialogueFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '你这句太模板了',
      ensureActiveOrLatestSessionId: async () => 'session-1',
      withCardScope: async (_cardId, task) => await task(),
      ensureDialogueReplyFeedbackAck: async () => '',
      persistDialogueReplyFeedbackAck: vi.fn(async () => {}),
      parseStoredConversationStructured: () => ({
        format: 'mind-turn-v1',
      }),
      deriveDialogueReplyFeedbackKind: () => 'robotic',
      attachSynthesizedReflections: input => input,
      buildDialogueReplyFeedbackOutcomeClosure: input => input as any,
      persistOutcomeClosure: vi.fn(async () => {}),
      appendAuditLog,
      memoryReconsolidationRuntime: {
        reconsolidateDialogueFeedbackMemoryTrace: vi.fn(async () => {}),
      },
      alicizationDb: {
        listConversationTurnsBySession: async () => [{
          turnId: 'turn-1',
          sessionId: 'session-1',
          assistantText: '上一句像模板壳。',
          structuredJson: '{}',
          createdAt: 1,
        }],
        getLatestRelationshipDynamics: async () => null,
        appendRelationshipDynamics: vi.fn(async () => {}),
      },
    })

    await runtime.settleRecentDialogueReplyFeedbackFromUserTurn(payload, 10, 'test')

    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        preDialogueAwarenessStatus: expectedDebug?.preDialogueAwarenessStatus,
        preDialogueAwarenessLine: expectedDebug?.preDialogueAwarenessLine,
        preDialogueCompanionBriefingLine: expectedDebug?.preDialogueCompanionBriefingLine,
      }),
    }), 'card-1')
  })
})
