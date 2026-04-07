import type { Message } from '@xsai/shared-chat'

import { describe, expect, it, vi } from 'vitest'

import {
  buildAlicizationChatStreamEmbodimentMeta,
  buildMindTurnTraceEvents,
  latestUserMessageContainsVisualInput,
  messageContainsVisualInput,
  normalizeDialogueRespondedPayload,
  parsePerformanceManifestFromMeta,
  sanitizePerformanceManifest,
} from './runtime-governance'

vi.mock('electron', () => ({
  app: {
    getLocale: () => 'en-US',
  },
}))

describe('runtime governance visual input detection', () => {
  it('detects historical visual inputs but does not treat them as current-turn visual grounding', () => {
    const messages: Message[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'older screenshot' },
          {
            type: 'image_url',
            image_url: {
              url: 'data:image/png;base64,older',
            },
          },
        ],
      },
      {
        role: 'assistant',
        content: 'thanks, I checked it',
      },
      {
        role: 'user',
        content: 'continue without looking at the old screenshot again',
      },
    ]

    expect(messageContainsVisualInput(messages)).toBe(true)
    expect(latestUserMessageContainsVisualInput(messages)).toBe(false)
  })

  it('treats latest user multimodal payload as active visual grounding', () => {
    const messages: Message[] = [
      {
        role: 'assistant',
        content: 'please send the screenshot',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'latest screenshot attached' },
          {
            type: 'image_url',
            image_url: {
              url: 'data:image/png;base64,current',
            },
          },
        ],
      },
    ]

    expect(latestUserMessageContainsVisualInput(messages)).toBe(true)
  })

  it('keeps embodiment hints when sanitizing performance manifests', () => {
    expect(sanitizePerformanceManifest({
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'thinking'],
      supportedFacialCues: [],
      supportedActions: [],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
      embodimentHints: {
        thinking: {
          preferredActionCues: ['observe_focus'],
          preferredMotionAliases: ['ObserveSoft'],
        },
      },
    })).toEqual(expect.objectContaining({
      embodimentHints: {
        thinking: {
          preferredActionCues: ['observe_focus'],
          preferredMotionAliases: ['ObserveSoft'],
        },
      },
    }))
  })

  it('parses embodiment hints from serialized manifest meta', () => {
    expect(parsePerformanceManifestFromMeta(JSON.stringify({
      renderer: 'vrm',
      supportedBaseEmotions: ['neutral', 'thinking'],
      supportedFacialCues: [],
      supportedActions: [],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
      embodimentHints: {
        thinking: {
          preferredFacialCues: ['relaxed'],
          preferredExpressionAliases: ['CalmLook'],
        },
      },
    }))).toEqual(expect.objectContaining({
      embodimentHints: {
        thinking: {
          preferredFacialCues: ['relaxed'],
          preferredExpressionAliases: ['CalmLook'],
        },
      },
    }))
  })

  it('adds a normalized embodiment envelope to dialogue responded payloads', () => {
    const payload = normalizeDialogueRespondedPayload({
      turnId: 'turn-embodiment-1',
      sessionId: 'session-1',
      assistantText: '我先盯着这个地方，你继续操作。',
      structured: {
        thought: 'obligation=guide; truth=grounded; focus=visible-scene; move=inspect; tone=direct',
        emotion: 'thinking',
        reply: '我先盯着这个地方，你继续操作。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'firm',
          emphasis: 1,
        },
        format: 'mind-turn-v1',
        governance: {
          turnMode: 'grounded-inspection',
          truthState: 'live-grounded',
          personaKernelMode: 'backgrounded',
          openingStyle: 'direct-observation',
          relationshipPosture: 'restrained',
          answerSubject: 'visible-scene',
          screenReferenceMode: 'required',
          repairState: 'none',
          suppressAssociativeRecall: false,
          labelCarryAsMemory: false,
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
        },
      },
    })

    expect(payload?.structured.embodiment).toEqual(expect.objectContaining({
      variationToken: expect.stringContaining('turn-embodiment-1'),
      postureHint: 'inspection',
      emotion: 'thinking',
      rendererHints: expect.objectContaining({
        preferredExpressionAliases: expect.arrayContaining(['relaxed']),
        preferredMotionAliases: expect.arrayContaining(['Think']),
      }),
      performance: expect.objectContaining({
        baseEmotion: 'thinking',
        emotion: 'thinking',
      }),
      speechStyle: expect.objectContaining({
        pitchDelta: expect.any(Number),
        rateMultiplier: expect.any(Number),
      }),
    }))
    expect(payload?.structured.performance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      delivery: 'firm',
    }))
    expect(payload?.structured.speechTimeline).toEqual(expect.objectContaining({
      version: 'speech-timeline-v1',
      variationToken: expect.stringContaining('turn-embodiment-1'),
      emotion: 'thinking',
      segments: expect.arrayContaining([
        expect.objectContaining({
          emotion: 'thinking',
          actionWindow: expect.any(String),
          prosodyWeight: expect.any(Number),
          emotionHoldMs: expect.any(Number),
          settleMode: expect.any(String),
          rendererSettle: expect.objectContaining({
            live2dFacialReleaseMs: expect.any(Number),
            live2dMotionFollowThroughMs: expect.any(Number),
            vrmActionFadeMs: expect.any(Number),
            vrmExpressionBlendMs: expect.any(Number),
          }),
          rendererHints: expect.objectContaining({
            preferredExpressionAliases: expect.arrayContaining(['relaxed']),
            preferredMotionAliases: expect.arrayContaining(['Think']),
          }),
        }),
      ]),
    }))
  })

  it('preserves digital life spine digest on dialogue responded payloads', () => {
    const payload = normalizeDialogueRespondedPayload({
      turnId: 'turn-spine-1',
      sessionId: 'session-1',
      assistantText: '我先盯着这个 diff。',
      structured: {
        thought: 'obligation=guide; truth=grounded; focus=visible-scene; move=inspect; tone=direct',
        emotion: 'thinking',
        reply: '我先盯着这个 diff。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'firm',
          emphasis: 1,
        },
        format: 'mind-turn-v1',
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          runtime: {
            watchMode: 'symbiotic-vision',
            sceneScenario: 'coding',
            sceneSummary: 'inspect the current diff',
            activeThreadId: 'thread-1',
            activeThreadTitle: 'current diff',
            dominantMode: 'tracking',
            dominantDrive: 'understand',
            answerIntent: 'guide',
            preferredPresence: 'attentive',
            selectedAction: 'wait',
            updatedAt: 1_234,
          },
          architecture: {
            operatingMode: 'speaking',
            dominantSystem: 'dialogue',
            supportingSystems: ['perception'],
            governingFocus: 'guide the current diff',
            summary: 'dialogue leads while perception stays warm',
          },
          continuitySignal: {
            label: 'digital-life-line',
            summary: 'watch=symbiotic-vision | scene=coding | mode=tracking',
            signature: 'spine-1',
            createdAt: 1_234,
            watchMode: 'symbiotic-vision',
            sceneScenario: 'coding',
            activeThreadId: 'thread-1',
            dominantMode: 'tracking',
            dominantDrive: 'understand',
            answerIntent: 'guide',
            preferredPresence: 'attentive',
          },
          proactive: {
            selectedAction: 'wait',
            preferredStyle: 'silent-observe',
            confidence: 0.7,
            shouldSpeak: false,
            activeThreadId: 'thread-1',
            activeThreadTitle: 'current diff',
            dominantConcernKind: null,
            dominantConcernSummary: null,
            leadingGoalId: null,
            leadingGoalSummary: null,
            preferredPresence: 'attentive',
          },
          memory: {
            summary: null,
            recentEpisodeSummary: null,
            recentEpisodeCount: 0,
            focusBeliefStatement: null,
            focusBeliefConfidence: null,
            leadingGoalSummary: null,
            dominantConcernSummary: null,
            reflectionSummary: null,
            reflectionPressure: null,
            recallMode: null,
            recallSeed: null,
            thoughtThreadSummary: null,
          },
        },
      },
    })

    expect(payload?.structured.digitalLifeSpine).toEqual(expect.objectContaining({
      runtime: expect.objectContaining({
        sceneScenario: 'coding',
        activeThreadId: 'thread-1',
      }),
      architecture: expect.objectContaining({
        dominantSystem: 'dialogue',
      }),
    }))
  })

  it('carries digital-life spine summary into replayable mind-turn trace events', () => {
    const events = buildMindTurnTraceEvents({
      payload: {
        turnId: 'turn-trace-1',
        sessionId: 'session-trace-1',
        origin: 'user-turn',
        userText: '继续',
        assistantText: '先把这段稳定下来。',
        structured: {
          format: 'mind-turn-v1',
          reply: '先把这段稳定下来。',
          emotion: 'thinking',
          digitalLifeSpine: {
            version: 'digital-life-spine-digest-v1',
            runtime: {
              watchMode: 'symbiotic-vision',
              sceneScenario: 'coding',
              sceneSummary: 'runtime branch',
              activeThreadId: 'thread-42',
              activeThreadTitle: 'runtime branch',
              dominantMode: 'tracking',
              dominantDrive: 'stabilize',
              answerIntent: 'guide',
              preferredPresence: 'attentive',
              selectedAction: 'warn',
              updatedAt: 42,
            },
            architecture: {
              operatingMode: 'thinking',
              dominantSystem: 'memory',
              supportingSystems: ['dialogue'],
              governingFocus: 'stabilize runtime',
              summary: 'memory-first reasoning',
            },
            continuitySignal: null,
            proactive: {
              selectedAction: 'warn',
              preferredStyle: 'firm-warning',
              confidence: 0.92,
              shouldSpeak: false,
              activeThreadId: 'thread-42',
              activeThreadTitle: 'runtime branch',
              dominantConcernKind: 'integrity',
              dominantConcernSummary: 'unsupported specificity',
              leadingGoalId: 'goal-1',
              leadingGoalSummary: 'stabilize runtime',
              preferredPresence: 'attentive',
            },
            memory: {
              summary: 'trace-backed line',
              recentEpisodeSummary: null,
              recentEpisodeCount: 0,
              focusBeliefStatement: null,
              focusBeliefConfidence: null,
              leadingGoalSummary: 'stabilize runtime',
              dominantConcernSummary: null,
              reflectionSummary: null,
              reflectionPressure: null,
              recallMode: 'working-memory',
              recallSeed: 'runtime:trace',
              thoughtThreadSummary: 'runtime truth discipline',
            },
          },
        },
        governance: {
          decisionTraceId: 'mind:test:feedfacecafe',
          turnMode: 'guide-current-knot',
          truthState: 'live-observed',
          personaKernelMode: 'backgrounded',
          openingStyle: 'direct-answer',
          relationshipPosture: 'warm',
          repairState: 'none',
          suppressAssociativeRecall: false,
          labelCarryAsMemory: false,
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
        },
        createdAt: 42,
      } as any,
      governedTurn: {
        governance: {
          decisionTraceId: 'mind:test:feedfacecafe',
          turnMode: 'guide-current-knot',
          truthState: 'live-observed',
          personaKernelMode: 'backgrounded',
          openingStyle: 'direct-answer',
          relationshipPosture: 'warm',
          repairState: 'none',
          suppressAssociativeRecall: false,
          labelCarryAsMemory: false,
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
        },
        tookOver: false,
        replyOverridden: false,
        overrideClass: null,
        fallbackPatternId: null,
        reasons: [],
      } as any,
      createdAt: 42,
      dialoguePayload: {
        turnId: 'turn-trace-1',
        sessionId: 'session-trace-1',
        origin: 'user-turn',
        isFallback: false,
        createdAt: 42,
        thought: '',
        emotion: 'thinking',
        rawEmotion: 'thinking',
        reply: '先把这段稳定下来。',
        structured: {
          format: 'mind-turn-v1',
          thought: '',
          emotion: 'thinking',
          rawEmotion: 'thinking',
          reply: '先把这段稳定下来。',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: null,
            actionCue: null,
            delivery: 'firm',
            emphasis: 1,
          },
          embodiment: null,
          speechTimeline: null,
          digitalLife: null,
          digitalLifeSpine: {
            version: 'digital-life-spine-digest-v1',
            runtime: {
              watchMode: 'symbiotic-vision',
              sceneScenario: 'coding',
              sceneSummary: 'runtime branch',
              activeThreadId: 'thread-42',
              activeThreadTitle: 'runtime branch',
              dominantMode: 'tracking',
              dominantDrive: 'stabilize',
              answerIntent: 'guide',
              preferredPresence: 'attentive',
              selectedAction: 'warn',
              updatedAt: 42,
            },
            architecture: {
              operatingMode: 'thinking',
              dominantSystem: 'memory',
              supportingSystems: ['dialogue'],
              governingFocus: 'stabilize runtime',
              summary: 'memory-first reasoning',
            },
            continuitySignal: null,
            proactive: null,
            memory: null,
          },
          contractFailed: false,
          governance: null,
        } as any,
      } as any,
    })

    expect(events.map(event => event.kind)).toEqual([
      'governance-normalized',
      'persistence-written',
      'dialogue-emitted',
    ])

    expect((events[0]?.payload as any)?.digitalLifeSpine).toEqual(expect.objectContaining({
      runtime: expect.objectContaining({
        watchMode: 'symbiotic-vision',
        activeThreadId: 'thread-42',
      }),
      architecture: expect.objectContaining({
        dominantSystem: 'memory',
      }),
    }))
    expect((events[1]?.payload as any)?.digitalLifeSpine).toEqual(expect.objectContaining({
      proactive: expect.objectContaining({
        selectedAction: 'warn',
      }),
    }))
    expect((events[2]?.payload as any)?.digitalLifeSpine).toEqual(expect.objectContaining({
      architecture: expect.objectContaining({
        operatingMode: 'thinking',
      }),
    }))
  })

  it('merges renderer-specific manifest aliases into the runtime embodiment envelope', () => {
    const payload = normalizeDialogueRespondedPayload({
      turnId: 'turn-embodiment-2',
      sessionId: 'session-2',
      assistantText: '我会继续盯着这个区域。',
      structured: {
        thought: 'obligation=guide; truth=grounded; focus=visible-scene; move=inspect; tone=direct',
        emotion: 'thinking',
        reply: '我会继续盯着这个区域。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'firm',
          emphasis: 1,
        },
        format: 'mind-turn-v1',
      },
    }, {
      renderer: 'vrm',
      supportedBaseEmotions: ['neutral', 'thinking'],
      supportedFacialCues: [],
      supportedActions: [],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
      embodimentHints: {
        thinking: {
          preferredExpressionAliases: ['CalmInspect'],
        },
      },
    })

    expect(payload?.structured.embodiment?.rendererHints).toEqual(expect.objectContaining({
      preferredExpressionAliases: expect.arrayContaining(['CalmInspect', 'relaxed']),
      preferredMotionAliases: expect.arrayContaining(['Think']),
    }))
    expect(payload?.structured.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
    }))
  })

  it('seeds sparse dialogue performance from resident snapshot and keeps embodiment chain coherent', () => {
    const residentPerformance = {
      version: 'resident-performance-v1',
      source: 'main-runtime',
      performance: {
        baseEmotion: 'concerned',
        emotion: 'concerned',
        facialCue: 'watchful',
        actionCue: 'lean-forward',
        delivery: 'firm',
        emphasis: 2,
      },
      embodiedPresence: 'concerned',
      stance: 'care',
      emotionalTension: 'tense-debug',
      confidence: 0.88,
      reasonTags: ['resident-performance'],
      signature: 'resident|concerned',
      updatedAt: 12_345,
    } as const
    const payload = normalizeDialogueRespondedPayload({
      turnId: 'turn-resident-seed-1',
      sessionId: 'session-resident-seed-1',
      assistantText: '先把这个空值分支看清楚。',
      structured: {
        thought: 'obligation=guide; truth=grounded; focus=visible-scene; move=inspect; tone=direct',
        emotion: 'neutral',
        reply: '先把这个空值分支看清楚。',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        format: 'mind-turn-v1',
        governance: {
          turnMode: 'grounded-inspection',
          truthState: 'live-grounded',
          personaKernelMode: 'backgrounded',
          openingStyle: 'direct-observation',
          relationshipPosture: 'restrained',
          answerSubject: 'visible-scene',
          screenReferenceMode: 'required',
          repairState: 'none',
          suppressAssociativeRecall: false,
          labelCarryAsMemory: false,
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
        },
      },
    }, undefined, {
      residentPerformance: residentPerformance as any,
    })

    expect(payload?.structured.performance).toEqual(expect.objectContaining({
      baseEmotion: 'concerned',
      emotion: 'concerned',
      facialCue: 'watchful',
      actionCue: 'lean-forward',
      delivery: 'firm',
      emphasis: 2,
    }))
    expect(payload?.structured.embodiment?.emotion).toBe('concerned')
    expect(payload?.structured.embodiment?.performance).toEqual(expect.objectContaining({
      baseEmotion: 'concerned',
      emotion: 'concerned',
      facialCue: 'watchful',
      actionCue: 'lean-forward',
      delivery: 'firm',
      emphasis: 2,
    }))
    expect(payload?.structured.speechTimeline).toEqual(expect.objectContaining({
      version: 'speech-timeline-v1',
      reply: '先把这个空值分支看清楚。',
      emotion: 'concerned',
    }))
    expect(payload?.structured.digitalLife).toEqual(expect.objectContaining({
      version: 'digital-life-v1',
      emotion: 'concerned',
      performance: expect.objectContaining({
        baseEmotion: 'concerned',
        emotion: 'concerned',
        facialCue: 'watchful',
        actionCue: 'lean-forward',
        delivery: 'firm',
        emphasis: 2,
      }),
    }))
  })

  it('seeds stream embodiment meta from resident performance when runtime output is sparse', () => {
    const meta = buildAlicizationChatStreamEmbodimentMeta({
      turnId: 'turn-stream-resident-1',
      reply: '继续看这里。',
      governance: {
        turnMode: 'answer',
        truthState: 'live-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        repairState: 'none',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'observe_focus',
          delivery: 'hesitant',
          emphasis: 1,
        },
        embodiedPresence: 'attentive',
        stance: 'observe',
        emotionalTension: 'focused-flow',
        confidence: 0.79,
        reasonTags: ['resident-performance'],
        signature: 'resident|thinking',
        updatedAt: 12_345,
      },
    })

    expect(meta.embodiment).toEqual(expect.objectContaining({
      performance: expect.objectContaining({
        baseEmotion: expect.any(String),
        emotion: expect.any(String),
      }),
    }))
    expect(meta.speechTimeline).toEqual(expect.objectContaining({
      version: 'speech-timeline-v1',
      reply: '继续看这里。',
    }))
    expect(meta.digitalLife).toEqual(expect.objectContaining({
      version: 'digital-life-v1',
      performance: expect.objectContaining({
        baseEmotion: meta.embodiment?.performance.baseEmotion,
        emotion: meta.embodiment?.performance.emotion,
      }),
    }))
  })
})
