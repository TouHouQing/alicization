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
        relationshipPrimaryIntent: 'same-her continuity repair',
        relationshipSignals: ['anti-tool-shell', 'repair-before-flourish'],
        emotionalResidueTags: ['slight-guilt', 'unfinishedness'],
        hostEmotionLabel: 'worried-continuity',
        hostEmotionSummary: '用户担心她又断线，别变成工具壳。',
        selfEmotionLabel: 'careful-repair',
        selfEmotionSummary: '她会先修连续性，再低压推进。',
        initiativeKind: 'low-pressure-follow-up',
        initiativeSuggestedWindow: '等你自己重新打开这条线时，我再轻轻接住。',
        initiativePressure: 'low',
        initiativeAntiSpamReason: 'This comes from an unresolved relationship-memory trace, not timer spam.',
        initiativeVisibleLine: '我没有催你，但我还记得这条线没收完。',
        embodimentSummary: 'Stable gaze with slower pacing.',
        embodimentRecallStrength: 'strongly-moved',
        embodimentModalityRisk: 'low',
        autobiographicalImpact: 'Learns to repair continuity before becoming playful.',
        stablePreferenceHint: 'Prefer repair-first, low-pressure same-her continuity when the host questions whether I stayed myself.',
        whyRemember: '关系连续性、未完成闭环和身体一致性同时出现。',
        confidence: 0.82,
        recallCertainty: 'steady',
        recallReason: '关系连续性和未完成闭环在这次回合里同时被点亮。',
        naturalRecallLine: '上次我们卡在 embodiment 闭环，我记得你更在意的是她不要变成工具壳。',
        userCorrectableFields: ['relationshipContext', 'naturalRecallLine'],
        revisionMemoryIds: ['old-status-memory'],
        revisionReasons: ['The stronger same-her continuity meaning should outrank the older status recap shell.'],
        downrankMemoryIds: ['generic-progress-memory'],
        mergeMemoryIds: [],
        forgetMemoryIds: [],
        metabolismReasons: [],
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
    expect(store.entries[0].revisionReasons).toEqual(expect.arrayContaining([
      expect.stringContaining('same-her continuity meaning'),
    ]))
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
        relationshipPrimaryIntent: 'same-her continuity repair',
        relationshipSignals: ['unfinishedness'],
        emotionalResidueTags: ['unfinishedness'],
        hostEmotionLabel: 'worried-continuity',
        hostEmotionSummary: '用户担心连续性。',
        selfEmotionLabel: 'careful-repair',
        selfEmotionSummary: '她会先修连续性。',
        initiativeKind: 'low-pressure-follow-up',
        initiativeSuggestedWindow: '等你自己重新打开这条线时，我再轻轻接住。',
        initiativePressure: 'low',
        initiativeAntiSpamReason: 'This comes from an unresolved relationship-memory trace, not timer spam.',
        initiativeVisibleLine: '我没有催你，但我还记得这条线没收完。',
        embodimentSummary: 'Stable gaze.',
        embodimentRecallStrength: 'lightly-noticed',
        embodimentModalityRisk: 'low',
        autobiographicalImpact: 'Repairs continuity first.',
        stablePreferenceHint: 'Prefer repair-first same-her continuity.',
        whyRemember: '关系连续性需要被记住。',
        confidence: 0.7,
        recallCertainty: 'steady',
        recallReason: '这条关系连续性仍然决定了之后的 same-her repair 顺序。',
        naturalRecallLine: '旧回忆',
        userCorrectableFields: ['naturalRecallLine'],
        revisionMemoryIds: [],
        revisionReasons: [],
        downrankMemoryIds: [],
        mergeMemoryIds: [],
        forgetMemoryIds: [],
        metabolismReasons: [],
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
      hostEmotionLabel: '',
      hostEmotionSummary: '',
      selfEmotionLabel: '',
      selfEmotionSummary: '',
      initiativeKind: '',
      initiativeSuggestedWindow: '',
      initiativePressure: '',
      initiativeAntiSpamReason: '',
      initiativeVisibleLine: '',
      embodimentSummary: '',
      embodimentRecallStrength: '',
      embodimentModalityRisk: '',
      autobiographicalImpact: '',
      stablePreferenceHint: '',
      whyRemember: '',
      confidence: 0,
      recallCertainty: 'tentative',
      recallReason: '',
      naturalRecallLine: '',
      userCorrectableFields: [],
      revisionMemoryIds: [],
      revisionReasons: [],
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
