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

function buildStructuredSemantics(sourceTurnId?: string) {
  return JSON.stringify({
    act: 'ask-help',
    responseNeed: 'guide',
    truthExpectation: 'strict',
    affectiveTone: 'neutral',
    subjectPreference: 'task-knot',
    taskAnchor: '总结 airi-alice 项目',
    sharedAttentionDemand: 0.62,
    personaSuppression: 0.24,
    confidence: 0.96,
    reasonTags: ['explicit-project-delegation'],
    codingAgentDelegation: {
      intentKind: 'execute',
      requestedAgent: 'codex',
      verdict: 'delegate-coding-agent',
      scope: 'investigation',
      confidence: 0.97,
      ...(sourceTurnId ? { sourceTurnId } : {}),
    },
  })
}

async function buildInteractiveMindState(input: {
  sourceTurnId: string
  providerSourceTurnId: string
}) {
  const generateMainGatewayText = vi.fn(async ({ source }: { source: string }) => {
    if (source === 'dialogue-turn-semantics')
      return buildStructuredSemantics(input.providerSourceTurnId)
    return null
  })
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
    cognitionMode: 'interactive',
  })

  return {
    generateMainGatewayText,
    result,
  }
}

describe('runtime mind-state Coding Agent delegation', () => {
  it('uses structured cognition during an interactive turn and binds delegation to the current turn', async () => {
    const { generateMainGatewayText, result } = await buildInteractiveMindState({
      sourceTurnId: 'turn-explicit-codex',
      providerSourceTurnId: '',
    })

    expect(generateMainGatewayText).toHaveBeenCalledTimes(1)
    expect(generateMainGatewayText).toHaveBeenCalledWith(expect.objectContaining({
      source: 'dialogue-turn-semantics',
    }))
    const providerCall = generateMainGatewayText.mock.calls[0]?.[0] as unknown as {
      system: string
      user: string
    }
    expect(providerCall.system).not.toContain('"sourceTurnId"')
    expect(providerCall.user).not.toContain('"sourceTurnId"')
    expect(result.dialogueEncounter?.codingAgentDelegation).toEqual({
      intentKind: 'execute',
      requestedAgent: 'codex',
      verdict: 'delegate-coding-agent',
      scope: 'investigation',
      confidence: 0.97,
      sourceTurnId: 'turn-explicit-codex',
      source: 'structured-cognition',
    })
  })

  it('drops a structured delegation that does not belong to the current turn', async () => {
    const { result } = await buildInteractiveMindState({
      sourceTurnId: 'turn-current',
      providerSourceTurnId: 'turn-previous',
    })

    expect(result.dialogueEncounter?.codingAgentDelegation).toBeNull()
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
