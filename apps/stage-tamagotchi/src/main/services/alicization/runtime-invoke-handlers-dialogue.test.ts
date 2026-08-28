import type { AlicizationMindTurnEventRecord } from '../../../shared/eventa'

import {
  createAlicizationRuntimeEvent,
} from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import {
  electronAlicizationAckDialogue,
  electronAlicizationListHumanlikeMemoryAudit,
  electronAlicizationReplayDialogues,
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
      sessionId: 'session:primary:card-humanlike-audit',
      dialogue: {
        userText: '别把这次记成进度汇报，我是在确认她是否记得刚才的约定。',
        assistantText: '我会把它记成一次约定回想的检验。',
      },
      execution: {
        summary: 'Callback wrote the humanlike memory candidate, but the UI still needs an audit read surface.',
        status: 'partial',
      },
      hostEmotion: {
        label: 'memory-test',
        summary: 'The host wants the previous agreement to remain explainable and reviewable.',
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
        summary: 'This is a remembered agreement check',
        threadAnchor: 'agreement humanlike memory audit',
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
        id: 'old-agreement-echo',
        summary: 'The remembered agreement was repeated.',
        polarity: 'repeated-agreement',
        salience: 0.62,
        lastUpdatedAt: 82_000,
      }],
      autobiographical: {
        currentEra: 'local memory review period',
        lesson: 'When the host tests an agreement, keep memory auditability ahead of confident recap.',
      },
    })
    const mindTurnEvents: AlicizationMindTurnEventRecord[] = [
      {
        id: 'evt-humanlike-audit-read',
        decisionTraceId: 'mind:humanlike-audit-read',
        turnId: 'turn-humanlike-audit-read',
        sessionId: 'session:primary:card-humanlike-audit',
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
        sessionId: 'session:primary:card-humanlike-audit',
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
      localRuntimeUserId: 'local-user',
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
        listRuntimeEventScopes: vi.fn(async () => []),
        loadRuntimeCheckpoint: vi.fn(async () => null),
        listRuntimeEvents: vi.fn(async () => []),
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
        sessionId: 'session:primary:card-humanlike-audit',
        whyRemember: expect.stringContaining('remembered agreement check'),
        relationshipContext: expect.stringContaining('remembered agreement check'),
        relationshipPrimaryIntent: 'ordinary-relationship',
        relationshipSignals: [],
        relationshipThreadAnchor: 'agreement humanlike memory audit',
        hostEmotionLabel: 'memory-test',
        hostEmotionSummary: expect.stringContaining('reviewable'),
        selfEmotionLabel: 'careful-repair',
        selfEmotionSummary: '',
        recallCertainty: 'steady',
        recallReason: 'recall-evidence:steady',
        embodimentRecallStrength: 'strongly-moved',
        embodimentModalityRisk: 'low',
        initiativeKind: 'no-initiative',
        initiativeSuggestedWindow: '',
        initiativePressure: 'none',
        initiativeAntiSpamReason: '',
        initiativeVisibleLine: '',
        userCorrectableFields: expect.arrayContaining(['relationshipContext', 'emotionalResidue', 'metabolism']),
        revisionMemoryIds: [],
        revisionReasons: [],
        downrankMemoryIds: expect.arrayContaining(['old-progress-status']),
        mergeMemoryIds: expect.arrayContaining(['old-emotional-spike']),
        metabolismReasons: expect.arrayContaining([
          'memory-downrank:low-value-or-superseded',
          'memory-merge:repeated-trace',
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
      localRuntimeUserId: 'local-user',
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
        sessionId: 'session:primary:card-humanlike-audit',
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
      localRuntimeUserId: 'local-user',
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
        listRuntimeEventScopes: vi.fn(async () => []),
        loadRuntimeCheckpoint: vi.fn(async () => null),
        listRuntimeEvents: vi.fn(async () => []),
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

  it('lets user-visible dialogue delivery acks and replays bypass the card-scope queue when the card is already active', async () => {
    const registerInvokeHandler = vi.fn()
    const withCardScopeCalls: Array<{
      cardId: unknown
      options?: { label?: string, skipQueueWhenScopeAlreadyActive?: boolean }
    }> = []
    const withCardScope = async <T>(
      nextCardIdRaw: unknown,
      task: () => Promise<T>,
      options?: { label?: string, skipQueueWhenScopeAlreadyActive?: boolean },
    ): Promise<T> => {
      withCardScopeCalls.push({
        cardId: nextCardIdRaw,
        options,
      })
      return await task()
    }
    const ackDialogueDelivery = vi.fn(async () => {})
    const listConversationTurnsBySession = vi.fn(async () => [])

    registerAlicizationDialogueInvokeHandlers({
      registerInvokeHandler,
      withCardScope,
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      appendRuntimeDebugLine: vi.fn(async () => {}),
      getActiveCardId: () => 'card-fast-dialogue',
      localRuntimeUserId: 'local-user',
      persistActiveSessionId: vi.fn(async () => {}),
      appendConversationTurnWithGuards: vi.fn(async () => true),
      getDialogueAckCursor: vi.fn(() => 0),
      ackDialogueDelivery,
      ensureProactiveLoopState: vi.fn(async () => ({ pendingOutcomes: [] }) as any),
      reportExplicitProactiveFeedback: vi.fn(() => ({ appliedOutcomes: [], state: { outcomes: [] } }) as any),
      persistProactiveLoopState: vi.fn(async () => {}),
      persistProactiveFeedbackOutcomeClosure: vi.fn(async () => {}),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      appendAuditLog: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      getAlicizationDb: () => ({
        listConversationTurnsSince: vi.fn(async () => []),
        listConversationTurnsBySession,
        listRuntimeEventScopes: vi.fn(async () => []),
        loadRuntimeCheckpoint: vi.fn(async () => null),
        listRuntimeEvents: vi.fn(async () => []),
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

    const ackHandler = registerInvokeHandler.mock.calls.find(call => call[0] === electronAlicizationAckDialogue)?.[1] as (payload: {
      cardId: string
      sessionId: string
      turnId: string
      createdAt: number
    }) => Promise<void>
    const replayHandler = registerInvokeHandler.mock.calls.find(call => call[0] === electronAlicizationReplayDialogues)?.[1] as (payload: {
      cardId: string
      sessionId: string
      limit?: number
    }) => Promise<unknown>

    await ackHandler({
      cardId: 'card-fast-dialogue',
      sessionId: 'session-fast',
      turnId: 'turn-fast',
      createdAt: 1_000,
    })
    await replayHandler({
      cardId: 'card-fast-dialogue',
      sessionId: 'session-fast',
      limit: 20,
    })

    expect(withCardScopeCalls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        cardId: 'card-fast-dialogue',
        options: expect.objectContaining({
          label: 'dialogue-ack:card-fast-dialogue',
          skipQueueWhenScopeAlreadyActive: true,
        }),
      }),
      expect.objectContaining({
        cardId: 'card-fast-dialogue',
        options: expect.objectContaining({
          label: 'dialogue-replay:card-fast-dialogue',
          skipQueueWhenScopeAlreadyActive: true,
        }),
      }),
    ]))
    expect(ackDialogueDelivery).toHaveBeenCalled()
    expect(listConversationTurnsBySession).toHaveBeenCalled()
  })

  it('replays canonical tool projections for one card, user, and conversation without re-executing actions', async () => {
    const registerInvokeHandler = vi.fn()
    const withCardScope = async <T>(_nextCardIdRaw: unknown, task: () => Promise<T>): Promise<T> => await task()
    const scope = {
      turnId: 'turn-tool-replay',
      cardId: 'card-tool-replay',
      userId: 'local-user',
      conversationId: 'session:primary:card-tool-replay',
    }
    const listRuntimeEventScopes = vi.fn(async () => [{
      ...scope,
      startedAt: 1_000,
      updatedAt: 1_300,
    }])
    const loadRuntimeCheckpoint = vi.fn(async () => null)
    const listRuntimeEvents = vi.fn(async () => [
      createAlicizationRuntimeEvent({
        ...scope,
        eventId: 'evt-tool-replay-1',
        eventType: 'turn.accepted',
        sequence: 1,
        source: 'runtime',
        occurredAt: 1_000,
        payload: {
          deliveryOwner: 'inline',
        },
      }),
      createAlicizationRuntimeEvent({
        ...scope,
        eventId: 'evt-tool-replay-2',
        eventType: 'model.tool_call.proposed',
        sequence: 2,
        source: 'runtime',
        occurredAt: 1_100,
        payload: {
          actionId: 'action-tool-replay',
          toolCallId: 'tool-call-replay',
          capabilityId: 'coding_agent.codex',
          providerToolName: 'coding_agent',
          selectedChannel: 'codex',
        },
      }),
      createAlicizationRuntimeEvent({
        ...scope,
        eventId: 'evt-tool-replay-3',
        eventType: 'action.observation',
        sequence: 3,
        source: 'runtime',
        occurredAt: 1_300,
        payload: {
          actionId: 'action-tool-replay',
          observationId: 'observation-tool-replay',
          toolCallId: 'tool-call-replay',
          terminal: true,
          outcome: 'success',
          output: {
            status: 'completed',
            summary: '检查完成',
          },
        },
      }),
    ])
    const executeAction = vi.fn()

    registerAlicizationDialogueInvokeHandlers({
      registerInvokeHandler,
      withCardScope,
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      appendRuntimeDebugLine: vi.fn(async () => {}),
      getActiveCardId: () => 'card-tool-replay',
      localRuntimeUserId: 'local-user',
      persistActiveSessionId: vi.fn(async () => {}),
      appendConversationTurnWithGuards: vi.fn(async () => true),
      getDialogueAckCursor: vi.fn(() => 0),
      ackDialogueDelivery: vi.fn(async () => {}),
      ensureProactiveLoopState: vi.fn(async () => ({ pendingOutcomes: [] }) as any),
      reportExplicitProactiveFeedback: vi.fn(() => ({ appliedOutcomes: [], state: { outcomes: [] } }) as any),
      persistProactiveLoopState: vi.fn(async () => {}),
      persistProactiveFeedbackOutcomeClosure: vi.fn(async () => {}),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      appendAuditLog: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      getAlicizationDb: () => ({
        listConversationTurnsSince: vi.fn(async () => []),
        listConversationTurnsBySession: vi.fn(async () => []),
        listRuntimeEventScopes,
        loadRuntimeCheckpoint,
        listRuntimeEvents,
        getMemoryStats: vi.fn(async () => ({})),
        listMindTurnEvents: vi.fn(async () => []),
        overrideMemoryStats: vi.fn(async () => ({})),
        getMetaValue: vi.fn(async () => undefined),
        setMetaValue: vi.fn(async () => {}),
        executeAction,
      }) as any,
      getPerformanceManifest: vi.fn(async () => null),
      getSelfEvolutionState: vi.fn(async () => ({}) as any),
      toReplayDialogueRespondedPayload: vi.fn(() => null),
      clearAllConversationData: vi.fn(async () => {}),
      parseStructuredHint: () => ({}),
    })

    const replayRegistration = registerInvokeHandler.mock.calls.find((call) => {
      const channel = call[0] as { sendEvent?: { id?: string } } | undefined
      return channel?.sendEvent?.id === 'eventa:invoke:electron:alicization:conversation:list-tool-projections-send'
    })
    expect(replayRegistration).toBeTruthy()

    const handler = replayRegistration?.[1] as (payload: {
      cardId: string
      sessionId: string
      limit?: number
    }) => Promise<unknown>
    const result = await handler({
      cardId: 'card-tool-replay',
      sessionId: ' session-tool-replay ',
      limit: 20,
    })

    expect(listRuntimeEventScopes).toHaveBeenCalledWith({
      cardId: 'card-tool-replay',
      userId: 'local-user',
      conversationId: 'session:primary:card-tool-replay',
      eventTypes: [
        'model.tool_call.proposed',
        'action.started',
        'action.progress',
        'action.output.delta',
        'action.observation',
        'action.failed',
        'action.cancelled',
        'action.dead_lettered',
      ],
      limit: 20,
    })
    expect(loadRuntimeCheckpoint).toHaveBeenCalledWith(scope)
    expect(listRuntimeEvents).toHaveBeenCalledWith(scope, {
      afterSequence: 0,
    })
    expect(executeAction).not.toHaveBeenCalled()
    expect(result).toEqual([{
      cardId: 'card-tool-replay',
      turnId: 'turn-tool-replay',
      sessionId: 'session:primary:card-tool-replay',
      startedAt: 1_000,
      updatedAt: 1_300,
      cards: [
        expect.objectContaining({
          toolCallId: 'tool-call-replay',
          selectedChannel: 'codex',
          phase: 'completed',
          terminal: true,
          result: {
            status: 'completed',
            summary: '检查完成',
          },
        }),
      ],
      recoveryRequired: true,
      reasonCodes: ['runtime-replay:turn-started-without-terminal'],
      failure: null,
    }])
  })

  it('keeps healthy tool projections when one persisted turn cannot be replayed', async () => {
    const registerInvokeHandler = vi.fn()
    const withCardScope = async <T>(_nextCardIdRaw: unknown, task: () => Promise<T>): Promise<T> => await task()
    const healthyScope = {
      turnId: 'turn-replay-healthy',
      cardId: 'card-replay-partial',
      userId: 'local-user',
      conversationId: 'session-replay-partial',
    }
    const brokenScope = {
      ...healthyScope,
      turnId: 'turn-replay-broken',
    }
    const runtimeEventsByTurn = new Map([
      [healthyScope.turnId, [
        createAlicizationRuntimeEvent({
          ...healthyScope,
          eventId: 'evt-replay-healthy-1',
          eventType: 'turn.accepted',
          sequence: 1,
          source: 'runtime',
          occurredAt: 2_000,
          payload: {
            deliveryOwner: 'callback',
          },
        }),
        createAlicizationRuntimeEvent({
          ...healthyScope,
          eventId: 'evt-replay-healthy-2',
          eventType: 'model.tool_call.proposed',
          sequence: 2,
          source: 'model',
          occurredAt: 2_100,
          payload: {
            actionId: 'action-replay-healthy',
            toolCallId: 'tool-replay-healthy',
            capabilityId: 'coding_agent.cli',
            providerToolName: 'coding_agent',
            selectedChannel: 'cli',
          },
        }),
      ]],
      [brokenScope.turnId, [
        createAlicizationRuntimeEvent({
          ...brokenScope,
          eventId: 'evt-replay-broken-1',
          eventType: 'model.tool_call.proposed',
          sequence: 1,
          source: 'model',
          occurredAt: 3_000,
          payload: {
            actionId: 'action-replay-broken',
            toolCallId: 'tool-replay-broken',
            capabilityId: 'coding_agent.codex',
          },
        }),
      ]],
    ])

    registerAlicizationDialogueInvokeHandlers({
      registerInvokeHandler,
      withCardScope,
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      appendRuntimeDebugLine: vi.fn(async () => {}),
      getActiveCardId: () => 'card-replay-partial',
      localRuntimeUserId: 'local-user',
      persistActiveSessionId: vi.fn(async () => {}),
      appendConversationTurnWithGuards: vi.fn(async () => true),
      getDialogueAckCursor: vi.fn(() => 0),
      ackDialogueDelivery: vi.fn(async () => {}),
      ensureProactiveLoopState: vi.fn(async () => ({ pendingOutcomes: [] }) as any),
      reportExplicitProactiveFeedback: vi.fn(() => ({ appliedOutcomes: [], state: { outcomes: [] } }) as any),
      persistProactiveLoopState: vi.fn(async () => {}),
      persistProactiveFeedbackOutcomeClosure: vi.fn(async () => {}),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      appendAuditLog: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      getAlicizationDb: () => ({
        listConversationTurnsSince: vi.fn(async () => []),
        listConversationTurnsBySession: vi.fn(async () => []),
        listRuntimeEventScopes: vi.fn(async () => [
          {
            ...healthyScope,
            startedAt: 2_000,
            updatedAt: 2_100,
          },
          {
            ...brokenScope,
            startedAt: 3_000,
            updatedAt: 3_000,
          },
        ]),
        loadRuntimeCheckpoint: vi.fn(async () => null),
        listRuntimeEvents: vi.fn(async (scope: { turnId: string }) =>
          runtimeEventsByTurn.get(scope.turnId) ?? []),
        getMemoryStats: vi.fn(async () => ({})),
        listMindTurnEvents: vi.fn(async () => []),
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

    const replayRegistration = registerInvokeHandler.mock.calls.find((call) => {
      const channel = call[0] as { sendEvent?: { id?: string } } | undefined
      return channel?.sendEvent?.id === 'eventa:invoke:electron:alicization:conversation:list-tool-projections-send'
    })
    const handler = replayRegistration?.[1] as (payload: {
      cardId: string
      sessionId: string
    }) => Promise<any[]>
    const result = await handler({
      cardId: 'card-replay-partial',
      sessionId: 'session-replay-partial',
    })

    expect(result).toEqual([
      expect.objectContaining({
        turnId: 'turn-replay-healthy',
        cards: [
          expect.objectContaining({
            toolCallId: 'tool-replay-healthy',
            selectedChannel: 'cli',
          }),
        ],
        failure: null,
      }),
      expect.objectContaining({
        turnId: 'turn-replay-broken',
        cards: [],
        failure: {
          code: 'RUNTIME_REPLAY_FAILED',
          message: 'runtime replay delivery owner is missing from persisted facts',
        },
      }),
    ])
  })

  it('bounds concurrent persisted turn replay during session recovery', async () => {
    const registerInvokeHandler = vi.fn()
    const withCardScope = async <T>(_nextCardIdRaw: unknown, task: () => Promise<T>): Promise<T> => await task()
    const scopes = Array.from({ length: 24 }, (_, index) => ({
      turnId: `turn-replay-bounded-${index}`,
      cardId: 'card-replay-bounded',
      userId: 'local-user',
      conversationId: 'session-replay-bounded',
      startedAt: 1_000 + index,
      updatedAt: 2_000 + index,
    }))
    let activeCheckpointLoads = 0
    let peakCheckpointLoads = 0
    const loadRuntimeCheckpoint = vi.fn(async () => {
      activeCheckpointLoads += 1
      peakCheckpointLoads = Math.max(peakCheckpointLoads, activeCheckpointLoads)
      try {
        await new Promise(resolve => setTimeout(resolve, 5))
        return null
      }
      finally {
        activeCheckpointLoads -= 1
      }
    })

    registerAlicizationDialogueInvokeHandlers({
      registerInvokeHandler,
      withCardScope,
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      appendRuntimeDebugLine: vi.fn(async () => {}),
      getActiveCardId: () => 'card-replay-bounded',
      localRuntimeUserId: 'local-user',
      persistActiveSessionId: vi.fn(async () => {}),
      appendConversationTurnWithGuards: vi.fn(async () => true),
      getDialogueAckCursor: vi.fn(() => 0),
      ackDialogueDelivery: vi.fn(async () => {}),
      ensureProactiveLoopState: vi.fn(async () => ({ pendingOutcomes: [] }) as any),
      reportExplicitProactiveFeedback: vi.fn(() => ({ appliedOutcomes: [], state: { outcomes: [] } }) as any),
      persistProactiveLoopState: vi.fn(async () => {}),
      persistProactiveFeedbackOutcomeClosure: vi.fn(async () => {}),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      appendAuditLog: vi.fn(async () => {}),
      queueSubconsciousWake: vi.fn(),
      getAlicizationDb: () => ({
        listConversationTurnsSince: vi.fn(async () => []),
        listConversationTurnsBySession: vi.fn(async () => []),
        listRuntimeEventScopes: vi.fn(async () => scopes),
        loadRuntimeCheckpoint,
        listRuntimeEvents: vi.fn(async () => []),
        getMemoryStats: vi.fn(async () => ({})),
        listMindTurnEvents: vi.fn(async () => []),
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

    const replayRegistration = registerInvokeHandler.mock.calls.find((call) => {
      const channel = call[0] as { sendEvent?: { id?: string } } | undefined
      return channel?.sendEvent?.id === 'eventa:invoke:electron:alicization:conversation:list-tool-projections-send'
    })
    const handler = replayRegistration?.[1] as (payload: {
      cardId: string
      sessionId: string
      limit?: number
    }) => Promise<any[]>
    const result = await handler({
      cardId: 'card-replay-bounded',
      sessionId: 'session-replay-bounded',
      limit: scopes.length,
    })

    expect(result).toHaveLength(scopes.length)
    expect(peakCheckpointLoads).toBeGreaterThan(1)
    expect(peakCheckpointLoads).toBeLessThanOrEqual(8)
  })
})
