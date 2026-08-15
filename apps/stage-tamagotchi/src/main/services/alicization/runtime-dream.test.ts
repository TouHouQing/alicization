import { describe, expect, it, vi } from 'vitest'

import { createDefaultProactiveLoopState } from './proactive-feedback'
import { createAlicizationDreamRuntime } from './runtime-dream'

describe('runtime dream', () => {
  it('preserves personality and memory when the dream Provider is unavailable', async () => {
    const appendAuditLog = vi.fn(async () => undefined)
    const appendRelationshipDynamics = vi.fn(async () => undefined)
    const appendEpisodicEvents = vi.fn(async () => undefined)
    const replaceActiveThoughts = vi.fn(async () => undefined)
    const appendSubconsciousFragments = vi.fn(async () => undefined)
    const queueSoulMutation = vi.fn(async () => undefined)
    const persistSubconsciousState = vi.fn(async () => undefined)
    const persistProactiveLoopState = vi.fn(async () => undefined)
    const listConversationTurnsSince = vi.fn(async () => [{
      turnId: 'turn-provider-unavailable',
      sessionId: 'session-provider-unavailable',
      userText: '闭嘴，别再问了。',
      assistantText: 'Provider request failed.',
      structuredJson: JSON.stringify({ emotion: 'angry' }),
      createdAt: 1_700_000_000_000,
    }])
    const generateDreamMetabolismWithGateway = vi.fn(async () => null)
    const runtime = createAlicizationDreamRuntime({
      ensureSubconsciousState: vi.fn(async () => ({
        boredom: 10,
        loneliness: 10,
        fatigue: 40,
        lastTickAt: 0,
        lastInteractionAt: 0,
        lastDreamedAt: 0,
        lastSavedAt: 0,
        updatedAt: 0,
      })),
      ensureProactiveLoopState: vi.fn(async () => createDefaultProactiveLoopState(0)),
      getAlicizationDb: () => ({
        listConversationTurnsSince,
        listActiveThoughts: vi.fn(async () => [{ text: '保留已有活跃思绪' }]),
        appendRelationshipDynamics,
        appendEpisodicEvents,
        listMemoryConsolidations: vi.fn(async () => [{
          id: 'consolidation-provider-unavailable',
          kind: 'daily',
          periodKey: 'accepted-memory-period',
          periodStartedAt: 1_700_000_000_000,
          periodEndedAt: 1_700_000_000_000,
          summary: '已清洗并准入的长期记忆摘要。',
          lesson: '只允许长期记忆证据参与 Dream。',
          cues: ['长期记忆', '准入'],
          confidence: 0.9,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-accepted-memory'],
          updatedAt: 1_700_000_000_000,
        }]),
        replaceActiveThoughts,
        appendSubconsciousFragments,
      }),
      getSoulSnapshot: () => ({
        content: '',
        frontmatter: {
          host_attitude: '保留当前关系理解。',
          core_incarnation: '保留当前人格基座。',
          personality: {
            obedience: 0.5,
            liveliness: 0.5,
            sensibility: 0.5,
          },
        },
      }) as any,
      bootstrap: vi.fn(async () => {
        throw new Error('bootstrap should not run')
      }),
      buildMainGatewayAgentTurnId: (...segments: Array<unknown>) => segments.join(':'),
      getActiveCardId: () => 'default',
      openAgentTurn: vi.fn(async () => ({
        getSessionSnapshot: () => ({
          id: 'agent-session-provider-unavailable',
          conversationSessionId: 'session-provider-unavailable',
          continuitySignals: [],
        }),
      }) as any),
      generateDreamMetabolismWithGateway,
      generateCoreIncarnationReforgeWithGateway: vi.fn(async () => {
        throw new Error('reforge should not run')
      }),
      generateMemoryConsolidationRefinementWithGateway: vi.fn(async () => {
        throw new Error('consolidation refinement should not run')
      }),
      generateDreamAutobiographicalSummariesWithGateway: vi.fn(async () => {
        throw new Error('autobiographical synthesis should not run')
      }),
      appendAuditLog,
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => undefined),
      truncateForDream: (value: string | null | undefined) => value ?? '',
      clampSoulDelta: (value: number) => value,
      normalizeOrganicMemoryItemText: (raw: unknown) => typeof raw === 'string' ? raw : '',
      normalizeOrganicMemoryItemArray: (raw: unknown) => Array.isArray(raw)
        ? raw
            .map(item => ({ text: typeof (item as { text?: unknown })?.text === 'string' ? (item as { text: string }).text : '' }))
            .filter(item => item.text)
        : [],
      sanitizeBriefText: (raw: string) => raw,
      queueSoulMutation,
      snapshotFromContent: vi.fn((content: string) => ({ content }) as any),
      persistSubconsciousState,
      persistProactiveLoopState,
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => undefined),
      recoverProactiveRhythmAfterDream: vi.fn(state => state),
      clampNeed: (value: number) => value,
      dreamMaxTurns: 8,
      dreamMaxCharsPerAssistantTurn: 400,
      dreamMaxCharsPerUserTurn: 400,
      dreamMaxTotalChars: 8_000,
    })

    const result = await runtime.runDreamForCurrentCard('unit-provider-unavailable')

    expect(result).toEqual({
      processed: false,
      skippedReason: 'provider-unavailable',
    })
    expect(listConversationTurnsSince).not.toBeCalled()
    expect(generateDreamMetabolismWithGateway).toBeCalledWith(expect.objectContaining({
      serializedTurns: expect.arrayContaining([
        expect.stringContaining('已清洗并准入的长期记忆摘要。'),
      ]),
    }))
    expect(JSON.stringify(generateDreamMetabolismWithGateway.mock.calls)).not.toContain('闭嘴，别再问了。')
    expect(JSON.stringify(generateDreamMetabolismWithGateway.mock.calls)).not.toContain('Provider request failed.')
    expect(appendAuditLog).toBeCalledWith(expect.objectContaining({
      category: 'alicization.dream',
      action: 'metabolism-provider-unavailable',
    }))
    expect(appendRelationshipDynamics).not.toBeCalled()
    expect(appendEpisodicEvents).not.toBeCalled()
    expect(replaceActiveThoughts).not.toBeCalled()
    expect(appendSubconsciousFragments).not.toBeCalled()
    expect(queueSoulMutation).not.toBeCalled()
    expect(persistSubconsciousState).not.toBeCalled()
    expect(persistProactiveLoopState).not.toBeCalled()
  })

  it('feeds refined consolidation summaries into autobiographical synthesis', async () => {
    const refinedSummary = '她记住了今晚一起整理书桌的约定。'
    const autobiographicalGateway = vi.fn(async () => [])
    const listConversationTurnsSince = vi.fn(async () => [{
      turnId: 'turn-dream-runtime-1',
      sessionId: 'session-dream-runtime',
      userText: '这段原始用户对话绝不能进入 Dream。',
      assistantText: 'Provider request failed.',
      structuredJson: JSON.stringify({ emotion: 'thinking' }),
      createdAt: 1_700_000_000_000,
    }])
    const appendRelationshipDynamics = vi.fn(async () => undefined)
    const appendEpisodicEvents = vi.fn(async () => undefined)
    const replaceActiveThoughts = vi.fn(async () => undefined)
    const appendSubconsciousFragments = vi.fn(async () => undefined)
    const queueSoulMutation = vi.fn(async () => undefined)
    const generateDreamMetabolismWithGateway = vi.fn(async () => ({
      host_attitude: '继续沿着这轮约定慢慢收口。',
      soul_shift: {
        obedience_delta: 0,
        liveliness_delta: 0,
        sensibility_delta: 0,
      },
      next_active_thoughts: [{ text: 'Keep remembered evidence explicit across dream memory.' }],
      explicit_demoted_thoughts: [],
      new_sediment_fragments: [],
      shattering_event: null,
    }))
    const runtime = createAlicizationDreamRuntime({
      ensureSubconsciousState: vi.fn(async () => ({
        boredom: 10,
        loneliness: 10,
        fatigue: 40,
        lastTickAt: 0,
        lastInteractionAt: 0,
        lastDreamedAt: 0,
        lastSavedAt: 0,
        updatedAt: 0,
      })),
      ensureProactiveLoopState: vi.fn(async () => createDefaultProactiveLoopState(0)),
      getAlicizationDb: () => ({
        listConversationTurnsSince,
        listActiveThoughts: vi.fn(async () => []),
        appendAuditLog: vi.fn(async () => undefined),
        appendRelationshipDynamics,
        appendEpisodicEvents,
        listMemoryConsolidations: vi.fn(async () => [{
          id: 'consolidation-phase1-1',
          kind: 'autobiographical',
          facet: 'phase',
          periodKey: '2026-06-03',
          periodStartedAt: 1_700_000_000_000,
          periodEndedAt: 1_700_000_000_000,
          summary: 'Old deterministic summary.',
          lesson: 'Old lesson.',
          cues: ['old-cue'],
          confidence: 0.62,
          dominantProvenance: 'dialogue',
          derivedEventIds: [],
          updatedAt: 1_700_000_000_000,
        }]),
        upsertMemoryConsolidations: vi.fn(async () => undefined),
        replaceActiveThoughts,
        appendSubconsciousFragments,
      }),
      getSoulSnapshot: () => ({
        content: '',
        frontmatter: {
          host_attitude: '继续沿着这轮约定慢慢收口。',
          core_incarnation: 'A local companion profile still growing through remembered evidence',
          personality: {
            obedience: 0.5,
            liveliness: 0.5,
            sensibility: 0.5,
          },
        },
      }) as any,
      bootstrap: vi.fn(async () => ({
        content: '',
        frontmatter: {
          host_attitude: '继续沿着这轮约定慢慢收口。',
          core_incarnation: 'A local companion profile still growing through remembered evidence',
          personality: {
            obedience: 0.5,
            liveliness: 0.5,
            sensibility: 0.5,
          },
        },
      }) as any),
      buildMainGatewayAgentTurnId: (...segments: Array<unknown>) => segments.join(':'),
      getActiveCardId: () => 'default',
      openAgentTurn: vi.fn(async () => ({
        getSessionSnapshot: () => ({
          id: 'agent-session-dream-runtime',
          conversationSessionId: 'session-dream-runtime',
          continuitySignals: [],
        }),
      }) as any),
      generateDreamMetabolismWithGateway,
      generateCoreIncarnationReforgeWithGateway: vi.fn(async () => null),
      generateMemoryConsolidationRefinementWithGateway: vi.fn(async () => [{
        id: 'consolidation-phase1-1',
        summary: refinedSummary,
        lesson: '下次继续询问书桌整理后的感受。',
        cues: ['书桌', '今晚'],
        confidence: 0.84,
      }]),
      generateDreamAutobiographicalSummariesWithGateway: autobiographicalGateway,
      appendAuditLog: vi.fn(async () => undefined),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => undefined),
      truncateForDream: (value: string | null | undefined) => value ?? '',
      clampSoulDelta: (value: number) => value,
      normalizeOrganicMemoryItemText: (raw: unknown) => typeof raw === 'string' ? raw : '',
      normalizeOrganicMemoryItemArray: (raw: unknown) => Array.isArray(raw)
        ? raw
            .map(item => ({ text: typeof (item as { text?: unknown })?.text === 'string' ? (item as { text: string }).text : '' }))
            .filter(item => item.text)
        : [],
      sanitizeBriefText: (raw: string) => raw,
      queueSoulMutation,
      snapshotFromContent: vi.fn((content: string) => ({ content }) as any),
      persistSubconsciousState: vi.fn(async () => undefined),
      persistProactiveLoopState: vi.fn(async () => undefined),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => undefined),
      recoverProactiveRhythmAfterDream: vi.fn(state => state),
      clampNeed: (value: number) => value,
      dreamMaxTurns: 8,
      dreamMaxCharsPerAssistantTurn: 400,
      dreamMaxCharsPerUserTurn: 400,
      dreamMaxTotalChars: 8_000,
    })

    const result = await runtime.runDreamForCurrentCard('unit-runtime-dream-refinement-carry')

    expect(result).toEqual({ processed: true })
    expect(listConversationTurnsSince).not.toBeCalled()
    expect(generateDreamMetabolismWithGateway).toBeCalledWith(expect.objectContaining({
      serializedTurns: expect.arrayContaining([
        expect.stringContaining('Old deterministic summary.'),
      ]),
    }))
    expect(autobiographicalGateway).toBeCalledWith(expect.objectContaining({
      consolidations: expect.arrayContaining([
        expect.objectContaining({
          id: 'consolidation-phase1-1',
          summary: refinedSummary,
        }),
      ]),
    }))
    const persistedDreamState = JSON.stringify([
      appendRelationshipDynamics.mock.calls,
      appendEpisodicEvents.mock.calls,
      replaceActiveThoughts.mock.calls,
      appendSubconsciousFragments.mock.calls,
      queueSoulMutation.mock.calls,
    ])
    expect(JSON.stringify(generateDreamMetabolismWithGateway.mock.calls)).not.toContain('这段原始用户对话绝不能进入 Dream。')
    expect(JSON.stringify(generateDreamMetabolismWithGateway.mock.calls)).not.toContain('Provider request failed.')
    expect(persistedDreamState).not.toContain('这段原始用户对话绝不能进入 Dream。')
    expect(persistedDreamState).not.toContain('Provider request failed.')
  })
})
