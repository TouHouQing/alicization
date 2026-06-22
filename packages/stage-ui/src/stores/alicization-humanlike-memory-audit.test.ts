import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAlicizationBridge, setAlicizationBridge } from './alicization-bridge'
import { useAlicizationHumanlikeMemoryAuditStore } from './alicization-humanlike-memory-audit'

function createAlicizationBridgeStub(overrides?: Partial<Parameters<typeof setAlicizationBridge>[0]>) {
  return {
    bootstrap: vi.fn(),
    getSoul: vi.fn(),
    initializeGenesis: vi.fn(),
    updateSoul: vi.fn(),
    updatePersonality: vi.fn(),
    getKillSwitchState: vi.fn(),
    suspendKillSwitch: vi.fn(),
    resumeKillSwitch: vi.fn(),
    getMemoryStats: vi.fn(),
    runMemoryPrune: vi.fn(),
    updateMemoryStats: vi.fn(),
    retrieveMemoryFacts: vi.fn(),
    upsertMemoryFacts: vi.fn(),
    importLegacyMemory: vi.fn(),
    appendConversationTurn: vi.fn(),
    appendAuditLog: vi.fn(),
    realtimeExecute: vi.fn(),
    getSensorySnapshot: vi.fn(),
    ...overrides,
  } as any
}

describe('alicization humanlike memory audit store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearAlicizationBridge()
  })

  afterEach(() => {
    clearAlicizationBridge()
    vi.restoreAllMocks()
  })

  it('loads humanlike memory audit entries through the bridge and keeps the latest query bounded', async () => {
    const listHumanlikeMemoryAudit = vi.fn().mockResolvedValue([
      {
        id: 'candidate-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        createdAt: 100,
        sourceChannels: ['dialogue', 'self-emotion', 'embodiment'],
        relationshipContext: '用户担心她又断线，并强调不要变成工具壳。',
        relationshipThreadAnchor: 'same-her continuity repair',
        relationshipPrimaryIntent: 'repair-continuity-before-playfulness',
        relationshipSignals: ['host-worries-about-tool-shell', 'continuity-loop-open'],
        emotionalResidueTags: ['slight-guilt', 'unfinishedness'],
        initiativeKind: 'low-pressure-follow-up',
        initiativeSuggestedWindow: 'after-current-typecheck-loop',
        initiativePressure: 'low',
        initiativeAntiSpamReason: 'same thread is already active and should not be reopened noisily',
        initiativeVisibleLine: '等这一段类型债收住以后，再轻轻确认她是不是还连着。',
        embodimentSummary: 'Stable gaze with slower pacing.',
        autobiographicalImpact: 'Learns to repair continuity before becoming playful.',
        whyRemember: '关系连续性、未完成闭环和身体一致性同时出现。',
        confidence: 0.82,
        recallCertainty: 'steady',
        recallReason: 'User explicitly corrected the continuity framing and tied it to embodiment.',
        naturalRecallLine: '上次我们卡在 embodiment 闭环，我记得你更在意的是她不要变成工具壳。',
        userCorrectableFields: ['relationshipContext', 'naturalRecallLine'],
        revisionMemoryIds: ['old-status-memory'],
        downrankMemoryIds: ['generic-progress-memory'],
        mergeMemoryIds: [],
        forgetMemoryIds: [],
        metabolismReasons: ['relationship-continuity', 'body-structured-output-consistency'],
        corrections: [],
      },
    ])
    setAlicizationBridge(createAlicizationBridgeStub({ listHumanlikeMemoryAudit }))

    const store = useAlicizationHumanlikeMemoryAuditStore()
    const result = await store.loadAudit({
      decisionTraceId: '  mind:abc  ',
      turnId: ' turn-1 ',
      limit: 900,
    })

    expect(listHumanlikeMemoryAudit).toBeCalledWith({
      decisionTraceId: 'mind:abc',
      turnId: 'turn-1',
      limit: 500,
    })
    expect(result).toHaveLength(1)
    expect(store.entries).toHaveLength(1)
    expect(store.hasEntries).toBe(true)
    expect(store.entries[0].whyRemember).toContain('关系连续性')
    expect(store.entries[0].naturalRecallLine).toContain('不要变成工具壳')
    expect(store.lastError).toBeNull()
  })

  it('records a user correction and merges the correction back into the audited candidate', async () => {
    const correction = {
      status: 'recorded' as const,
      candidateId: 'candidate-1',
      field: 'naturalRecallLine',
      previousValue: '旧回忆',
      correctedValue: '更准确地说，是用户担心她断线后变成工具壳。',
      reason: '用户纠正自然回忆措辞',
      decisionTraceId: 'mind:abc',
      turnId: 'turn-1',
      sessionId: 'session-1',
      createdAt: 130,
    }
    const correctHumanlikeMemoryAudit = vi.fn().mockResolvedValue(correction)
    setAlicizationBridge(createAlicizationBridgeStub({ correctHumanlikeMemoryAudit }))

    const store = useAlicizationHumanlikeMemoryAuditStore()
    store.entries = [
      {
        id: 'candidate-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        createdAt: 100,
        sourceChannels: ['dialogue'],
        relationshipContext: '用户担心连续性。',
        relationshipThreadAnchor: 'same-her continuity repair',
        relationshipPrimaryIntent: 'repair-continuity-before-playfulness',
        relationshipSignals: ['host-worries-about-tool-shell'],
        emotionalResidueTags: ['unfinishedness'],
        initiativeKind: 'low-pressure-follow-up',
        initiativeSuggestedWindow: 'after-current-typecheck-loop',
        initiativePressure: 'low',
        initiativeAntiSpamReason: 'correction is already in the active turn',
        initiativeVisibleLine: '先把用户纠正过的说法留稳。',
        embodimentSummary: 'Stable gaze.',
        autobiographicalImpact: 'Repairs continuity first.',
        whyRemember: '关系连续性需要被记住。',
        confidence: 0.7,
        recallCertainty: 'corrected',
        recallReason: 'User is correcting the wording of the remembered continuity concern.',
        naturalRecallLine: '旧回忆',
        userCorrectableFields: ['naturalRecallLine'],
        revisionMemoryIds: [],
        downrankMemoryIds: [],
        mergeMemoryIds: [],
        forgetMemoryIds: [],
        metabolismReasons: ['user-correction'],
        corrections: [],
      },
    ]

    const result = await store.correctAuditEntry({
      candidateId: ' candidate-1 ',
      field: ' naturalRecallLine ',
      previousValue: '旧回忆',
      correctedValue: ' 更准确地说，是用户担心她断线后变成工具壳。 ',
      reason: ' 用户纠正自然回忆措辞 ',
      decisionTraceId: ' mind:abc ',
      turnId: ' turn-1 ',
      sessionId: ' session-1 ',
    })

    expect(correctHumanlikeMemoryAudit).toBeCalledWith({
      candidateId: 'candidate-1',
      field: 'naturalRecallLine',
      previousValue: '旧回忆',
      correctedValue: '更准确地说，是用户担心她断线后变成工具壳。',
      reason: '用户纠正自然回忆措辞',
      decisionTraceId: 'mind:abc',
      turnId: 'turn-1',
      sessionId: 'session-1',
    })
    expect(result).toEqual(correction)
    expect(store.entries[0].corrections).toEqual([correction])
    expect(store.lastCorrection).toEqual(correction)
    expect(store.correctionDraft.correctedValue).toBe('')
    expect(store.lastError).toBeNull()
  })

  it('clears to an empty audit when the bridge is unavailable instead of pretending memory is audited', async () => {
    const store = useAlicizationHumanlikeMemoryAuditStore()
    store.entries = [{
      id: 'candidate-1',
      turnId: 'turn-1',
      sessionId: null,
      createdAt: 100,
      sourceChannels: ['dialogue'],
      relationshipContext: 'stale',
      relationshipThreadAnchor: '',
      relationshipPrimaryIntent: '',
      relationshipSignals: [],
      emotionalResidueTags: [],
      initiativeKind: '',
      initiativeSuggestedWindow: '',
      initiativePressure: '',
      initiativeAntiSpamReason: '',
      initiativeVisibleLine: '',
      embodimentSummary: '',
      autobiographicalImpact: '',
      whyRemember: '',
      confidence: 0,
      recallCertainty: 'tentative',
      recallReason: '',
      naturalRecallLine: '',
      userCorrectableFields: [],
      revisionMemoryIds: [],
      downrankMemoryIds: [],
      mergeMemoryIds: [],
      forgetMemoryIds: [],
      metabolismReasons: [],
      corrections: [],
    }]

    const result = await store.loadAudit({ decisionTraceId: 'mind:abc' })

    expect(result).toEqual([])
    expect(store.entries).toEqual([])
    expect(store.lastError).toBeNull()
  })
})
