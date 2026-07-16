import type { AlicizationMindTurnEventRecord } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import {
  electronAlicizationListHumanlikeMemoryAudit,
  electronAlicizationReportProactiveFeedback,
} from '../../../shared/eventa'
import { buildHumanlikeMemoryCandidate } from './humanlike-memory'
import { registerAlicizationDialogueInvokeHandlers } from './runtime-invoke-handlers-dialogue'

describe('runtime invoke handlers dialogue', () => {
  it('lists humanlike memory audit entries through a stable invoke surface instead of raw mind-turn payload parsing', async () => {
    const registerInvokeHandler = vi.fn()
    const withCardScopeCalls: unknown[] = []
    const withCardScope = async <T>(nextCardIdRaw: unknown, task: () => Promise<T>): Promise<T> => {
      withCardScopeCalls.push(nextCardIdRaw)
      return await task()
    }
    const candidate = buildHumanlikeMemoryCandidate({
      now: 120_000,
      turnId: 'turn-humanlike-audit-read',
      sessionId: 'session-humanlike-audit-read',
      dialogue: {
        userText: '别把这次记成进度汇报，我是在确认她是不是同一个她。',
        assistantText: '我会把它记成一次关系连续性的检验。',
      },
      execution: {
        summary: 'Callback wrote the humanlike memory candidate, but the UI still needs an audit read surface.',
        status: 'partial',
      },
      hostEmotion: {
        label: 'continuity-test',
        summary: 'The host is worried she may become a tool shell and wants explainable memory.',
        intensity: 0.74,
      },
      selfEmotion: {
        label: 'careful-repair',
        summary: 'I should keep slight guilt and unfinishedness traceable instead of sounding certain.',
        intensity: 0.62,
      },
      embodiment: {
        summary: 'gaze=stable voice=lower-pressure pause=longer lipsync=restrained',
        recallStrength: 'strongly-moved',
        modalityConsistency: 'consistent',
      },
      relationship: {
        summary: 'This is a identity-continuity',
        threadAnchor: 'same-her humanlike memory audit',
      },
      priorMemories: [{
        id: 'old-progress-status',
        summary: 'The host asked for a progress status update.',
        polarity: 'generic-status',
        salience: 0.34,
      }, {
        id: 'old-emotional-spike',
        summary: 'A tired anxious spike made the line feel heavier for a moment, but it was only a passing emotional wobble.',
        polarity: 'anxious-spike',
        salience: 0.18,
        lastUpdatedAt: 2_000,
      }, {
        id: 'old-same-thread-echo',
        summary: 'The identity-continuity',
        polarity: 'same-thread-continuity',
        salience: 0.62,
        lastUpdatedAt: 82_000,
      }],
      autobiographical: {
        currentEra: 'Phase 1 local digital life memory closure',
        lesson: 'When the host tests continuity, keep memory auditability ahead of confident recap.',
      },
    })
    const mindTurnEvents: AlicizationMindTurnEventRecord[] = [
      {
        id: 'evt-humanlike-audit-read',
        decisionTraceId: 'mind:humanlike-audit-read',
        turnId: 'turn-humanlike-audit-read',
        sessionId: 'session-humanlike-audit-read',
        origin: 'user-turn',
        kind: 'person-state-updated',
        payload: {
          humanlikeMemoryCandidate: candidate,
        },
        createdAt: 120_100,
      },
      {
        id: 'evt-unrelated',
        decisionTraceId: 'mind:humanlike-audit-read',
        turnId: 'turn-humanlike-audit-read',
        sessionId: 'session-humanlike-audit-read',
        origin: 'user-turn',
        kind: 'reply-memory-coherence',
        payload: { summary: 'raw coherence event should not leak into humanlike audit list' },
        createdAt: 120_090,
      },
    ]
    const listMindTurnEvents = vi.fn(async () => mindTurnEvents)

    registerAlicizationDialogueInvokeHandlers({
      registerInvokeHandler,
      withCardScope,
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      appendRuntimeDebugLine: vi.fn(async () => {}),
      getActiveCardId: () => 'card-humanlike-audit',
      persistActiveSessionId: vi.fn(async () => {}),
      appendConversationTurnWithGuards: vi.fn(async () => true),
      getDialogueAckCursor: vi.fn(() => 0),
      ackDialogueDelivery: vi.fn(async () => {}),
      ensureProactiveLoopState: vi.fn(async () => ({ outcomes: [] }) as any),
      reportExplicitProactiveFeedback: vi.fn(() => ({ appliedOutcomes: [], state: { outcomes: [] } }) as any),
      persistProactiveLoopState: vi.fn(async () => {}),
      persistProactiveFeedbackOutcomeClosure: vi.fn(async () => {}),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      appendAuditLog: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      getAlicizationDb: () => ({
        listConversationTurnsSince: vi.fn(async () => []),
        listConversationTurnsBySession: vi.fn(async () => []),
        getMemoryStats: vi.fn(async () => ({})),
        listMindTurnEvents,
        overrideMemoryStats: vi.fn(async () => ({})),
        getMetaValue: vi.fn(async () => undefined),
        setMetaValue: vi.fn(async () => {}),
      }),
      getPerformanceManifest: vi.fn(async () => null),
      getSelfEvolutionState: vi.fn(async () => ({}) as any),
      toReplayDialogueRespondedPayload: vi.fn(() => null),
      clearAllConversationData: vi.fn(async () => {}),
      parseStructuredHint: () => ({}),
    })

    const humanlikeAuditRegistration = registerInvokeHandler.mock.calls.find(call => call[0] === electronAlicizationListHumanlikeMemoryAudit)
    expect(humanlikeAuditRegistration).toBeTruthy()

    const handler = humanlikeAuditRegistration?.[1] as (payload: {
      cardId: string
      decisionTraceId?: string
      turnId?: string
      limit?: number
    }) => Promise<unknown>
    const result = await handler({
      cardId: 'card-humanlike-audit',
      decisionTraceId: 'mind:humanlike-audit-read',
      turnId: 'turn-humanlike-audit-read',
      limit: 3,
    })

    expect(withCardScopeCalls).toContain('card-humanlike-audit')
    expect(listMindTurnEvents).toHaveBeenCalledWith({
      decisionTraceId: 'mind:humanlike-audit-read',
      turnId: 'turn-humanlike-audit-read',
      limit: 18,
    })
    expect(result).toEqual([
      expect.objectContaining({
        id: candidate.id,
        turnId: 'turn-humanlike-audit-read',
        sessionId: 'session-humanlike-audit-read',
        whyRemember: expect.stringContaining('relationship continuity'),
        relationshipContext: expect.stringContaining('identity-continuity'),
        relationshipPrimaryIntent: 'same-person-test',
        relationshipSignals: expect.arrayContaining(['same-person-test']),
        hostEmotionLabel: 'continuity-test',
        hostEmotionSummary: expect.stringContaining('tool shell'),
        selfEmotionLabel: 'careful-repair',
        selfEmotionSummary: expect.stringContaining('unfinishedness'),
        recallCertainty: 'tentative',
        recallReason: expect.stringContaining('conflicting'),
        embodimentRecallStrength: 'cautious-avoidance',
        embodimentModalityRisk: 'low',
        initiativeKind: 'low-pressure-follow-up',
        initiativeSuggestedWindow: expect.stringContaining('same-person continuity reopening'),
        initiativePressure: 'none',
        initiativeAntiSpamReason: expect.stringContaining('timer spam'),
        initiativeVisibleLine: expect.stringContaining('wait for a clearer opening'),
        userCorrectableFields: expect.arrayContaining(['relationshipContext', 'emotionalResidue', 'metabolism']),
        revisionMemoryIds: expect.arrayContaining(['old-progress-status']),
        revisionReasons: expect.arrayContaining([
          expect.stringContaining('identity-continuity'),
        ]),
        downrankMemoryIds: expect.arrayContaining(['old-progress-status']),
        mergeMemoryIds: expect.arrayContaining(['old-emotional-spike', 'old-same-thread-echo']),
        metabolismReasons: expect.arrayContaining([
          'Downrank low-value, generic, or superseded summaries.',
          'Merge repeated embodiment traces or same-thread continuity echoes into the stronger same-thread memory.',
        ]),
        forgetMemoryIds: [],
        sourceChannels: expect.arrayContaining(['dialogue', 'execution', 'host-emotion', 'self-emotion', 'embodiment']),
      }),
    ])
  })

  it('records host corrections to humanlike memory audit entries back into the same mind-turn audit stream', async () => {
    const registerInvokeHandler = vi.fn()
    const withCardScopeCalls: unknown[] = []
    const withCardScope = async <T>(nextCardIdRaw: unknown, task: () => Promise<T>): Promise<T> => {
      withCardScopeCalls.push(nextCardIdRaw)
      return await task()
    }
    const listMindTurnEvents = vi.fn(async (): Promise<AlicizationMindTurnEventRecord[]> => [])
    const appendMindTurnEvents = vi.fn(async () => {})

    registerAlicizationDialogueInvokeHandlers({
      registerInvokeHandler,
      withCardScope,
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      appendRuntimeDebugLine: vi.fn(async () => {}),
      getActiveCardId: () => 'card-humanlike-audit',
      persistActiveSessionId: vi.fn(async () => {}),
      appendConversationTurnWithGuards: vi.fn(async () => true),
      getDialogueAckCursor: vi.fn(() => 0),
      ackDialogueDelivery: vi.fn(async () => {}),
      ensureProactiveLoopState: vi.fn(async () => ({ outcomes: [] }) as any),
      reportExplicitProactiveFeedback: vi.fn(() => ({ appliedOutcomes: [], state: { outcomes: [] } }) as any),
      persistProactiveLoopState: vi.fn(async () => {}),
      persistProactiveFeedbackOutcomeClosure: vi.fn(async () => {}),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      appendAuditLog: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      getAlicizationDb: () => ({
        listConversationTurnsSince: vi.fn(async () => []),
        listConversationTurnsBySession: vi.fn(async () => []),
        getMemoryStats: vi.fn(async () => ({})),
        listMindTurnEvents,
        appendMindTurnEvents,
        overrideMemoryStats: vi.fn(async () => ({})),
        getMetaValue: vi.fn(async () => undefined),
        setMetaValue: vi.fn(async () => {}),
      }) as any,
      getPerformanceManifest: vi.fn(async () => null),
      getSelfEvolutionState: vi.fn(async () => ({}) as any),
      toReplayDialogueRespondedPayload: vi.fn(() => null),
      clearAllConversationData: vi.fn(async () => {}),
      parseStructuredHint: () => ({}),
    })

    const correctionRegistration = registerInvokeHandler.mock.calls.find((call) => {
      const channel = call[0] as { sendEvent?: { id?: string } } | undefined
      return channel?.sendEvent?.id === 'eventa:invoke:electron:alicization:conversation:correct-humanlike-memory-audit-send'
    })
    expect(correctionRegistration).toBeTruthy()

    const handler = correctionRegistration?.[1] as (payload: {
      cardId: string
      decisionTraceId: string
      turnId: string
      sessionId: string
      candidateId: string
      field: string
      previousValue?: string
      correctedValue: string
      reason?: string
    }) => Promise<unknown>
    const result = await handler({
      cardId: 'card-humanlike-audit',
      decisionTraceId: 'mind:humanlike-audit-correction',
      turnId: 'turn-humanlike-audit-read',
      sessionId: 'session-humanlike-audit-read',
      candidateId: 'humanlike-memory-candidate:turn-humanlike-audit-read',
      field: 'relationshipContext',
      previousValue: 'identity-continuity',
      correctedValue: '这是我在测试她是不是持续的人，不是单纯催进度。',
      reason: 'Host corrected why this should be remembered.',
    })

    expect(withCardScopeCalls).toContain('card-humanlike-audit')
    expect(appendMindTurnEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        decisionTraceId: 'mind:humanlike-audit-correction',
        turnId: 'turn-humanlike-audit-read',
        sessionId: 'session-humanlike-audit-read',
        origin: 'user-turn',
        kind: 'humanlike-memory-corrected',
        payload: expect.objectContaining({
          candidateId: 'humanlike-memory-candidate:turn-humanlike-audit-read',
          field: 'relationshipContext',
          previousValue: 'identity-continuity',
          correctedValue: '这是我在测试她是不是持续的人，不是单纯催进度。',
          reason: 'Host corrected why this should be remembered.',
        }),
      }),
    ])
    expect(result).toEqual(expect.objectContaining({
      candidateId: 'humanlike-memory-candidate:turn-humanlike-audit-read',
      field: 'relationshipContext',
      correctedValue: '这是我在测试她是不是持续的人，不是单纯催进度。',
    }))
  })

  it('passes sanitized user text through explicit proactive feedback handling', async () => {
    const registerInvokeHandler = vi.fn()
    const withCardScope = async <T>(_nextCardIdRaw: unknown, task: () => Promise<T>): Promise<T> => await task()
    const reportExplicitProactiveFeedback = vi.fn(() => ({
      appliedOutcomes: [{ outcome: 'dismiss', scenario: 'coding' }],
      state: { outcomes: [] },
    }) as any)
    const persistProactiveLoopState = vi.fn(async () => {})
    const persistProactiveFeedbackOutcomeClosure = vi.fn(async () => {})
    const syncSessionMirrorFromCurrentCardState = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()

    registerAlicizationDialogueInvokeHandlers({
      registerInvokeHandler,
      withCardScope,
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      appendRuntimeDebugLine: vi.fn(async () => {}),
      getActiveCardId: () => 'card-proactive-feedback',
      persistActiveSessionId: vi.fn(async () => {}),
      appendConversationTurnWithGuards: vi.fn(async () => true),
      getDialogueAckCursor: vi.fn(() => 0),
      ackDialogueDelivery: vi.fn(async () => {}),
      ensureProactiveLoopState: vi.fn(async () => ({ pendingOutcomes: [] }) as any),
      reportExplicitProactiveFeedback,
      persistProactiveLoopState,
      persistProactiveFeedbackOutcomeClosure,
      syncSessionMirrorFromCurrentCardState,
      appendAuditLog,
      queueSubconsciousWake,
      getAlicizationDb: () => ({
        listConversationTurnsSince: vi.fn(async () => []),
        listConversationTurnsBySession: vi.fn(async () => []),
        getMemoryStats: vi.fn(async () => ({})),
        listMindTurnEvents: vi.fn(async () => []),
        overrideMemoryStats: vi.fn(async () => ({})),
        getMetaValue: vi.fn(async () => undefined),
        setMetaValue: vi.fn(async () => {}),
      }),
      getPerformanceManifest: vi.fn(async () => null),
      getSelfEvolutionState: vi.fn(async () => ({}) as any),
      toReplayDialogueRespondedPayload: vi.fn(() => null),
      clearAllConversationData: vi.fn(async () => {}),
      parseStructuredHint: () => ({}),
    })

    const proactiveFeedbackRegistration = registerInvokeHandler.mock.calls.find(
      call => call[0] === electronAlicizationReportProactiveFeedback,
    )
    expect(proactiveFeedbackRegistration).toBeTruthy()

    const handler = proactiveFeedbackRegistration?.[1] as (payload: {
      cardId: string
      turnId: string
      feedback: 'dismiss' | 'positive'
      userText?: string | null
    }) => Promise<void>
    await handler({
      cardId: 'card-proactive-feedback',
      turnId: 'turn-proactive-feedback',
      feedback: 'dismiss',
      userText: '  先别提醒我了  ',
    })

    expect(reportExplicitProactiveFeedback).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        turnId: 'turn-proactive-feedback',
        feedback: 'dismiss',
        userText: '先别提醒我了',
      }),
    )
    expect(persistProactiveLoopState).toHaveBeenCalled()
    expect(syncSessionMirrorFromCurrentCardState).toHaveBeenCalledWith(expect.objectContaining({
      source: 'proactive-feedback-explicit',
      turnId: 'turn-proactive-feedback',
    }))
    expect(persistProactiveFeedbackOutcomeClosure).toHaveBeenCalled()
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'proactive-feedback-explicit',
    }))
    expect(queueSubconsciousWake).toHaveBeenCalledWith('card-proactive-feedback', 'feedback:dismiss', 300)
  })
})
