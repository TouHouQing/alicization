import type { AlicizationChannelCapability } from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type { AlicizationSensoryCacheSnapshot } from '../../../shared/eventa'
import type { AlicizationPreparedMainChatPrelude } from './main-chat-session-runtime'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationAgentRuntime } from './agent-runtime'
import { buildHumanlikeMemoryRecallSeedFromMindTurnEvents } from './humanlike-memory-recall-seed'
import { createAlicizationMainChatSessionRuntime } from './main-chat-session-runtime'

const executionChannels = [
  'cli',
  'codex',
  'claude-code',
  'openclaw',
] as const

function createCapabilities(): AlicizationChannelCapability[] {
  return [
    { channel: 'cli', available: true, enabled: true, ready: true, sessionAffinity: false, reason: null },
    { channel: 'codex', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
    { channel: 'claude-code', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
    { channel: 'openclaw', available: false, enabled: false, ready: false, sessionAffinity: true, reason: 'offline' },
  ]
}

function createOpenAgentTurn(getSensorySnapshot: () => Promise<AlicizationSensoryCacheSnapshot>) {
  const runtime = createAlicizationAgentRuntime({
    getSensorySnapshot,
    resolveConversationSessionId: async () => 'session-1',
  })
  return async (input: {
    cardId: string
    decisionTraceId?: string | null
    turnId: string
  }) => await runtime.openTurn(input)
}

function createPrelude(memoryRecallSeed: string): AlicizationPreparedMainChatPrelude {
  const messages = [{
    role: 'user',
    content: '继续，但别把我刚才纠正过的关系含义忘掉。',
  }] satisfies Message[]

  return {
    actionObligation: {
      confidence: 0.74,
      kind: 'answer',
      source: 'dialogue-governance',
      reasonCodes: ['stay-on-thread', 'memory-continuity'],
      summary: 'Stay on the same dialogue line and answer with corrected memory continuity.',
    },
    chatConfig: {
      id: 'chat-config',
    } as any,
    messages,
    contextualStringPromise: Promise.resolve('recent contextual recall'),
    executionCallbackContextPromise: Promise.resolve({
      actions: [],
      callbacks: [],
      continuitySignals: [],
      recallText: '',
      systemBlock: '',
    }),
    executionLedgerContextPromise: Promise.resolve({
      entries: [],
      recallText: '',
      systemBlock: '',
    } as any),
    perceptionAugmentation: {
      messages,
      systemBlocks: [],
      promptSystemBlocks: [],
      digitalLifeRuntimeSurface: null,
      digitalLifeSpine: null,
      memoryRecallSeed,
      recallGovernor: null,
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        snapshot: null,
        fallbackReason: null,
      },
      chatGovernance: {
        turnMode: 'answer',
        personaKernelMode: 'full',
        mindTurnContract: null,
        mindTurnGovernance: null,
      },
    },
  }
}

describe('humanlike memory recall seed runtime regression', () => {
  it('carries humanlike memory recall seed lines into organic memory retrieval for the next reply turn', async () => {
    const memoryRecallSeed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([{
      kind: 'person-state-updated',
      payload: {
        humanlikeMemoryCandidate: {
          id: 'humanlike-memory-candidate:runtime-next-turn',
          turnId: 'turn-humanlike-runtime-next-turn',
          sessionId: 'session-humanlike-runtime',
          createdAt: 42_000,
          relationshipContext: {
            threadAnchor: 'delivery-address',
            summary: 'The host corrected the delivery destination to Building B.',
          },
          emotionalResidue: {
            tags: ['relief', 'unfinishedness'],
          },
          initiativeOpportunity: {
            kind: 'low-pressure-follow-up',
          },
          embodimentTrace: {
            summary: 'Reply should slow down and keep gaze stable when recalling this correction.',
          },
          autobiographicalImpact: {
            selfNarrativeDelta: 'I learned to carry corrected memory meaning instead of defending the first interpretation.',
          },
          auditTrail: {
            whyRemember: 'The host explicitly corrected a remembered fact.',
            confidence: 0.82,
          },
        },
      },
      createdAt: 42_000,
    }])

    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: '礼貌而克制，保持观察',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
    }))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-humanlike-runtime-regression',
        messages: [{
          role: 'user',
          content: '继续，但别把我刚才纠正过的关系含义忘掉。',
        }],
        supportsTools: true,
      } as any,
      prelude: createPrelude(memoryRecallSeed),
    })

    expect(resolveOrganicMemoryPromptContext).toHaveBeenCalledTimes(1)

    const lastOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const organicInput = (lastOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }
    const recallSeed = String(organicInput.recallSeed ?? '')

    expect(recallSeed).toContain('recent contextual recall')
    expect(recallSeed).toContain('humanlike_memory_recall:')
    expect(recallSeed).toContain('relationship=The host corrected the delivery destination to Building B.')
    expect(recallSeed).toContain('emotion=relief,unfinishedness')
    expect(recallSeed).toContain('initiative=low-pressure-follow-up')
    expect(recallSeed).not.toMatch(/\b(?:line|embodiment|self|why|reason|metabolism)=/u)
    expect(recallSeed).not.toContain('我记得你纠正过')
  })

  it('carries persisted affective residue recall seed lines into organic memory retrieval for the next reply turn even without an explicit humanlike candidate', async () => {
    const memoryRecallSeed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([{
      kind: 'person-state-updated',
      payload: {
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 88_850,
          residues: [],
          dominantResidueKind: 'afterglow',
          afterglowPressure: 0.26,
          repairPressure: 0.08,
          burdenPressure: 0.03,
          trustPressure: 0.22,
          restProtectivePressure: 0.04,
          relationshipCadence: {
            cadenceMode: 'measured-return',
            distancePosture: 'measured-room',
            companionshipDensity: 0.33,
            repairRecovery: 0.41,
            overreachRisk: 0.29,
            fatigueGuard: 0.18,
            afterglowCarry: 0.52,
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            reasonTags: ['observed-affect', 'initiative-learning'],
            summary: 'Keep the next return measured before increasing intensity.',
          },
          sourceSignals: ['proactive outcome learning'],
          summary: 'The proactive outcome supports a measured return.',
        },
      },
      createdAt: 89_000,
    }])

    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 10,
      nextTickAt: 20,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: { usagePercent: 10, windowMs: 1000 },
        memory: { freeMB: 1024, totalMB: 8192, usagePercent: 87.5 },
      },
      capture: null,
    } satisfies AlicizationSensoryCacheSnapshot))
    const resolveOrganicMemoryPromptContext = vi.fn(async () => ({
      hostAttitude: '礼貌而克制，保持观察',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
    }))
    const runtime = createAlicizationMainChatSessionRuntime({
      executionCapabilityChannels: executionChannels,
      buildMainRuntimeCorePromptBlocks: () => ['[CORE]'],
      executeMainGatewayTaskThread: vi.fn(),
      getPerformanceManifest: vi.fn(async () => null),
      getSensorySnapshot,
      latestUserMessageContainsVisualInput: () => false,
      openAgentTurn: createOpenAgentTurn(getSensorySnapshot),
      resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
      resolveCardHostName: vi.fn(async () => ''),
      resolveCardPersonaKernel: vi.fn(async () => null),
      resolveExecutionCapabilitiesForPrompt: vi.fn(async () => createCapabilities()),
      resolveOrganicMemoryPromptContext,
      resolveSessionContinuitySignals: vi.fn(async () => []),
      resolveTaskPlanningCapabilities: vi.fn(async () => createCapabilities()),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      tuneOrganicMemoryPromptContextForExecutiveTurn: input => input.context,
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    await runtime.prepareExecution({
      payload: {
        cardId: 'default',
        turnId: 'turn-humanlike-runtime-residue-regression',
        messages: [{
          role: 'user',
          content: '继续，但轻一点接这条还没收好的线。',
        }],
        supportsTools: true,
      } as any,
      prelude: createPrelude(memoryRecallSeed),
    })

    expect(resolveOrganicMemoryPromptContext).toHaveBeenCalledTimes(1)

    const lastOrganicCall = resolveOrganicMemoryPromptContext.mock.calls.at(-1) as unknown[] | undefined
    const organicInput = (lastOrganicCall?.[0] ?? {}) as {
      recallSeed?: string
    }
    const recallSeed = String(organicInput.recallSeed ?? '')

    expect(recallSeed).toContain('recent contextual recall')
    expect(recallSeed).toContain('humanlike_memory_recall:')
    expect(recallSeed).toContain('affective_residue_kind=afterglow')
    expect(recallSeed).toContain('affective_cadence_mode=measured-return')
    expect(recallSeed).toContain('affective_distance_posture=measured-room')
    expect(recallSeed).toContain('affective_should_delay_warmth=true')
    expect(recallSeed).toContain('affective_should_protect_rest=false')
    expect(recallSeed).toContain('affective_afterglow_carry=0.52')
    expect(recallSeed).toContain('affective_fatigue_guard=0.18')
    expect(recallSeed).toContain('affective_overreach_risk=0.29')
    expect(recallSeed).toContain('emotion=afterglow-carry,unfinishedness')
    expect(recallSeed).toContain('embodiment_gaze=stable')
    expect(recallSeed).toContain('embodiment_voice=lower-pressure')
    expect(recallSeed).toContain('embodiment_pacing=slower')
    expect(recallSeed).not.toMatch(/\b(?:line|relationship|initiative|embodiment|self|why|reason|metabolism)=/u)
    expect(recallSeed).not.toMatch(/Return with lower pressure|Recall with lower pressure|Keep body pressure|Affective residue says/iu)
    expect(recallSeed).not.toContain('中性可见占位')
  })
})
