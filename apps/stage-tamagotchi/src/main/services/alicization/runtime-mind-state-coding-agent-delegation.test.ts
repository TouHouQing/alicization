import type { Message } from '@xsai/shared-chat'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationMindStateRuntime } from './runtime-mind-state'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

const turnContext = {
  localTime: '2026-08-09T04:30:00+08:00',
  system: {
    cpuUsage: 0.18,
    idleSeconds: 0,
    inputActivity: 'active',
    fullscreenLikely: false,
    foregroundWindow: {
      appName: 'Alicization',
      processName: 'Alicization',
      title: 'Chat',
      pid: 7,
    },
    degradedSignals: [],
  },
  workload: {
    kind: 'coding',
    confidence: 0.8,
    source: 'dialogue',
    matchedLabels: [],
  },
  content: {
    kind: 'other',
    confidence: 0.7,
    source: 'dialogue',
    summary: '',
    matchedLabels: [],
  },
  relationship: {
    hostAttitude: 'focused',
    fatigue: 0.1,
    minutesSinceLastUserTurn: 0,
    reminderBacklog: 0,
    lateNightActiveMinutes: 0,
    recentProactiveOutcomes: [],
  },
} as any

function createRuntime(generateMainGatewayText: any) {
  const previousVisualPresenceState = createDefaultVisualPresenceState(10_000)
  return {
    previousVisualPresenceState,
    runtime: createAlicizationMindStateRuntime({
      previousVisualPresenceState,
      buildDialogueIngressContext: () => ({
        context: turnContext,
        currentScene: null,
        worldModel: null,
      }),
      generateMainGatewayText,
      buildMainGatewayAgentTurnId: (...segments) => segments.join(':'),
      readLatestAssistantMessageText: messages => messages
        .filter(message => message.role === 'assistant')
        .map(message => String(message.content ?? ''))
        .at(-1) ?? '',
      readTransportContentAsText: content => typeof content === 'string' ? content : JSON.stringify(content),
      retrieveMemoryFacts: async () => [],
      listRelationshipOutcomes: async () => [],
      listPersonaReinforcementEvents: async () => [],
      listMemoryReflections: async () => [],
      listMemoryConsolidations: async () => [],
      getPersonStateEvolutionSummary: async () => null,
      readMindHead: async () => null,
    }),
  }
}

async function buildInteractiveMindState(input: {
  sourceTurnId: string
  cognitionMode?: 'interactive' | 'background'
}) {
  const generateMainGatewayText = vi.fn(async () => null)
  const { runtime, previousVisualPresenceState } = createRuntime(generateMainGatewayText)
  const userText = '用 Codex 帮我总结一下 airi-alice 这个项目'

  const result = await runtime.buildDigitalLifeMindState({
    cardId: 'default',
    turnId: input.sourceTurnId,
    now: 20_000,
    context: turnContext,
    userText,
    recentMessages: [{
      role: 'user',
      content: userText,
    } satisfies Message],
    previousVisualPresenceState,
    visualHeartbeat: {
      watchMode: 'symbiotic-vision',
      scene: null,
      recentTransition: null,
      nextSuggestedProbeMs: 30_000,
    } as any,
    attention: null as any,
    cognitionMode: input.cognitionMode ?? 'interactive',
  })

  return {
    generateMainGatewayText,
    result,
  }
}

describe('runtime mind-state Coding Agent delegation', () => {
  it('does not block an interactive turn on an auxiliary semantics Provider request', async () => {
    const { generateMainGatewayText, result } = await buildInteractiveMindState({
      sourceTurnId: 'turn-explicit-codex',
    })

    expect(generateMainGatewayText).not.toHaveBeenCalled()
    expect(result.dialogueEncounter).not.toBeNull()
  })

  it('keeps interactive cognition usable when the auxiliary Provider is unavailable', async () => {
    const { result } = await buildInteractiveMindState({
      sourceTurnId: 'turn-current',
    })

    expect(result.dialogueEncounter).not.toBeNull()
  })

  it('does not retain the removed dialogue semantics Provider side path in background cognition', async () => {
    const { generateMainGatewayText } = await buildInteractiveMindState({
      sourceTurnId: 'turn-background',
      cognitionMode: 'background',
    })

    expect(generateMainGatewayText.mock.calls.some((call: unknown[]) => (
      (call[0] as { source?: string } | undefined)?.source === 'dialogue-turn-semantics'
    ))).toBe(false)
  })

  it('rejects interactive cognition without a real turn id', async () => {
    const generateMainGatewayText = vi.fn()
    const { runtime, previousVisualPresenceState } = createRuntime(generateMainGatewayText)

    await expect(runtime.buildDigitalLifeMindState({
      cardId: 'default',
      now: 20_000,
      context: turnContext,
      userText: '用 Codex 检查当前项目',
      recentMessages: [{
        role: 'user',
        content: '用 Codex 检查当前项目',
      } satisfies Message],
      previousVisualPresenceState,
      visualHeartbeat: {
        watchMode: 'symbiotic-vision',
        scene: null,
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
      } as any,
      attention: null as any,
      cognitionMode: 'interactive',
    })).rejects.toThrow('interactive cognition requires a real turnId')
    expect(generateMainGatewayText).not.toHaveBeenCalled()
  })
})
