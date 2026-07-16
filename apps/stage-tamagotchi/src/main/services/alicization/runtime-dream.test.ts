import { describe, expect, it, vi } from 'vitest'

import { createDefaultProactiveLoopState } from './proactive-feedback'
import { createAlicizationDreamRuntime } from './runtime-dream'

describe('runtime dream', () => {
  it('feeds refined consolidation summaries into autobiographical synthesis so same-her memory refinement stays on one life line', async () => {
    const refinedSummary = 'structured continuity digest.'
    const autobiographicalGateway = vi.fn(async () => [])
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
        listConversationTurnsSince: vi.fn(async () => [{
          turnId: 'turn-dream-runtime-1',
          sessionId: 'session-dream-runtime',
          userText: '继续把这条数字生命主线记稳一点。',
          assistantText: '我会沿着同一个她的线继续记住。',
          structuredJson: JSON.stringify({ emotion: 'thinking' }),
          createdAt: 1_700_000_000_000,
        }]),
        listActiveThoughts: vi.fn(async () => []),
        appendAuditLog: vi.fn(async () => undefined),
        appendRelationshipDynamics: vi.fn(async () => undefined),
        appendEpisodicEvents: vi.fn(async () => undefined),
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
        replaceActiveThoughts: vi.fn(async () => undefined),
        appendSubconsciousFragments: vi.fn(async () => undefined),
      }),
      getSoulSnapshot: () => ({
        content: '',
        frontmatter: {
          host_attitude: '继续沿着同一个她的线慢慢收口。',
          core_incarnation: 'One local-first digital life still growing into one identity-continuity',
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
          host_attitude: '继续沿着同一个她的线慢慢收口。',
          core_incarnation: 'One local-first digital life still growing into one identity-continuity',
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
      generateDreamMetabolismWithGateway: vi.fn(async () => ({
        host_attitude: '继续沿着同一个她的线慢慢收口。',
        soul_shift: {
          obedience_delta: 0,
          liveliness_delta: 0,
          sensibility_delta: 0,
        },
        next_active_thoughts: [{ text: 'Keep the continuity state explicit across dream memory.' }],
        explicit_demoted_thoughts: [],
        new_sediment_fragments: [],
        shattering_event: null,
      })),
      generateCoreIncarnationReforgeWithGateway: vi.fn(async () => null),
      generateMemoryConsolidationRefinementWithGateway: vi.fn(async () => [{
        id: 'consolidation-phase1-1',
        summary: refinedSummary,
        lesson: 'Keep autobiographical memory on one identity-continuity',
        cues: ['same-her', 'phase1'],
        confidence: 0.84,
      }]),
      generateDreamAutobiographicalSummariesWithGateway: autobiographicalGateway,
      appendAuditLog: vi.fn(async () => undefined),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      hydrateAgentTurnFromCurrentCardState: vi.fn(async () => undefined),
      buildAgentTurnContinuitySystemMessages: vi.fn(() => []),
      truncateForDream: (value: string | null | undefined) => value ?? '',
      parseStructuredHint: (raw: string | null | undefined) => raw ? JSON.parse(raw) : {},
      clampSoulDelta: (value: number) => value,
      normalizeOrganicMemoryItemText: (raw: unknown) => typeof raw === 'string' ? raw : '',
      normalizeOrganicMemoryItemArray: (raw: unknown) => Array.isArray(raw)
        ? raw
            .map(item => ({ text: typeof (item as { text?: unknown })?.text === 'string' ? (item as { text: string }).text : '' }))
            .filter(item => item.text)
        : [],
      sanitizeBriefText: (raw: string) => raw,
      queueSoulMutation: vi.fn(async () => undefined),
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
    expect(autobiographicalGateway).toBeCalledWith(expect.objectContaining({
      consolidations: expect.arrayContaining([
        expect.objectContaining({
          id: 'consolidation-phase1-1',
          summary: refinedSummary,
        }),
      ]),
    }))
  })
})
