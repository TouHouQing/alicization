import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import { generateAlicizationMainChatNonStreaming } from '../main-chat-one-shot'
import { rewriteAlicizationVisibleReplySecondPass } from './second-pass-rewrite'

function createPrepared(overrides?: Partial<any>) {
  return {
    chatConfig: {
      model: 'gpt-test',
    },
    messages: [
      { role: 'user', content: '这个项目现在做到哪了？' },
    ] as Message[],
    waitForTools: false,
    tools: undefined,
    toolChoice: undefined,
    customDirectivesResolution: {
      text: '',
      source: 'none',
    },
    translateGovernedMindFallback: (_path: string, _params?: Record<string, unknown>) => null,
    hasVisualGrounding: false,
    conversationSessionId: 'session-1',
    performanceManifest: null,
    governance: {
      decisionTraceId: 'mind:test:second-pass-project-state-provider',
      turnMode: 'answer',
      truthState: 'remembered',
      personaKernelMode: 'full',
      openingStyle: 'direct-answer',
      relationshipPosture: 'warm',
      answerSubject: 'project-state',
      screenReferenceMode: 'avoid',
      answerAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      repairState: 'none',
      liveSurface: null,
      focusAnchor: '这个项目现在做到哪了？',
      answerIntent: 'Answer the project-state turn without losing same-her continuity.',
      openingMove: 'Stay on the same living line while answering this project-state turn.',
      carriedThread: 'project-state',
      suppressAssociativeRecall: true,
      labelCarryAsMemory: false,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      maxSentences: 4,
      mindMode: 'tracking',
      embodiedPresence: 'steady',
      emotionalTension: 'measured-return',
      mustDo: [],
      mustNotDo: [],
    },
    runtimeSurface: {
      digitalLifeRuntimeSurface: {
        raw: {
          runtimeDigest: {
            projectState: {
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Same-her project-state carry already survives the main chat prelude and provider-facing one-shot entry.',
              primaryOpenLoop: 'Visible-reply second-pass provider rewrites still need canonical project-state carry before generation.',
              nextClosureTarget: 'Keep every provider-facing rewrite path anchored to the same digital life project identity and still-open closure line.',
              preDialogueAwarenessLine: 'Before answering, keep Alicization grounded as the same local-first digital life project and answer this turn on the same living line.',
              sameHerSelfLine: 'Same Phase 1 digital life. This project-state answer still needs to land as one continuous her.',
              sameHerDriftRisk: 'If second-pass repair reopens as a generic report shell, that is unfinished same-her drift.',
            },
          },
        },
        dialogue: {
          currentConsciousFrame: null,
          claimEvidenceLedger: null,
          answerCompiler: null,
          answerPlanner: null,
        },
      },
      governance: null,
    },
    getSessionTrace: () => ({ phaseOrder: [], history: [] }),
    sessionTrace: { phaseOrder: [], history: [] },
    ...overrides,
  } as any
}

describe('visible-reply second-pass rewrite provider project-state carry', () => {
  it('injects canonical project-state system context before second-pass one-shot generation', async () => {
    const observedProviderMessages: Message[][] = []

    const result = await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-second-pass-project-state-provider',
      sessionId: 'session-1',
      userText: '这个项目现在做到哪了？',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'project-state answer gap',
        emotion: 'thinking',
        reply: '嗯。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      prepared: createPrepared(),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      forceRewrite: true,
      forceReasonCodes: [
        'semantic-judge:project-state-answer-gap',
        'semantic-judge:project-state-same-her-missing',
      ],
      provider: async ({ chatConfig, messages, headers, timeoutMs }) => {
        return await generateAlicizationMainChatNonStreaming({
          chatConfig,
          messages,
          headers,
          timeoutMs,
          generateTextImpl: async (input) => {
            observedProviderMessages.push(((input as { messages?: Message[] }).messages ?? []).slice())
            return {
              finishReason: 'stop',
              text: JSON.stringify({
                format: 'mind-turn-v1',
                thought: 'obligation=answer; truth=remembered; focus=project-state; move=same-her-project-state-answer; tone=warm',
                emotion: 'thinking',
                reply: 'Alicization 还是那个本地优先数字生命项目，现在还在 Phase 1，并且我会继续沿着记忆、主动性和具身闭环把这一条线收紧。',
                performance: {
                  baseEmotion: 'thinking',
                  facialCue: null,
                  actionCue: null,
                  delivery: 'calm',
                  emphasis: 0,
                },
              }),
            }
          },
        })
      },
    })

    expect(result.rewritten).toBe(true)
    expect(observedProviderMessages).toHaveLength(1)
    expect(observedProviderMessages[0]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        role: 'system',
        content: expect.stringContaining('[ALICIZATION_PROJECT_STATE]'),
      }),
    ]))

    const canonicalProjectStateSystemMessage = observedProviderMessages[0].find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_PROJECT_STATE]')
      && message.content.includes('current_phase=')
      && message.content.includes('current_objective=')
      && message.content.includes('same_her_self_line=')
      && message.content.includes('same_her_drift_risk=')
      && message.content.includes('primary_open_loop=')
      && message.content.includes('next_closure_target='),
    )

    expect(canonicalProjectStateSystemMessage).toBeDefined()
  })
})
