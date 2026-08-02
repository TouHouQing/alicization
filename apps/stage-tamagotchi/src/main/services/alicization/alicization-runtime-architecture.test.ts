import { describe, expect, it } from 'vitest'

import {
  deriveAlicizationAgentRuntimeTelemetryFromSession,
  deriveAlicizationRuntimeSnapshot,
  derivePostPolicyQuietHoldRuntimeSnapshot,
  projectAlicizationRuntimeDigest,
} from './alicization-runtime-architecture'

function createMinimalRuntimeSpine(input: {
  memory?: Record<string, unknown>
  initiative?: Record<string, unknown> | null
  autonomy?: Record<string, unknown> | null
  dialogue?: Record<string, unknown> | null
} = {}) {
  return {
    version: 'digital-life-spine-v1',
    runtimeSurface: {
      raw: null,
      dialogue: {
        discourseState: null,
        conversationState: null,
        answerCompiler: null,
        replyDeliberation: null,
        ...input.dialogue,
      },
      perception: {
        currentScene: null,
        attention: null,
        captureState: null,
        watchMode: null,
      },
      world: {
        worldModel: null,
        relationshipModel: null,
      },
      agency: {
        initiative: input.initiative ?? null,
        autonomy: input.autonomy ?? null,
        selfState: null,
        habitPolicy: null,
        actionEcology: null,
        deliberationState: null,
      },
      cognition: {
        privateThought: null,
        subjectiveInference: null,
        mindKernel: null,
        beliefLedger: null,
      },
      memory: {
        motiveEngine: null,
        recallGovernor: null,
        reflectionLedger: null,
        workingMemoryEpisodes: [],
        selfContinuity: null,
        goalStack: null,
        concerns: [],
        longHorizonMemory: null,
        autobiographicalSelf: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
        memoryDeliberation: null,
        ...input.memory,
      },
    },
    architecture: null,
    continuitySignal: null,
    proactiveSelection: {
      activeThread: null,
      leadingGoal: null,
      dominantConcern: null,
    },
    proactivePolicy: null,
  } as any
}

describe('alicization runtime architecture', () => {
  it('projects declared runtime facts without carrying unknown reply authority', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        dialogue: {
          currentConsciousFrame: {
            reasonTags: ['provider-failed'],
            focusAnchor: 'The current user question.',
            consciousNeed: 'Explain the observed failure.',
            speakingIntention: 'Report the Provider error.',
          },
        },
        memory: {
          derivedMindStateBundle: {
            version: 'derived-mind-state-bundle-v1',
            source: 'main-runtime',
            producedAt: 1,
            emotionalKernel: {
              version: 'emotional-kernel-v1',
              dominantEmotion: 'calm-focus',
              initiativeMode: 'responsive',
              memoryRecallMode: 'available',
              embodimentTone: 'steady',
              valence: 0.62,
              arousal: 0.34,
              guardedness: 0.18,
              closenessDrive: 0.48,
              repairNeed: 0.08,
              initiativePressure: 0.44,
              reasonTags: ['live-emotion'],
              why: 'The current exchange is calm and focused.',
            },
            dialogueRhythm: {
              activeClosenessContext: 'memory-review',
              burdenLine: 'Provider failed with HTTP 400: invalid parameter.',
            },
            unknownReplyAuthority: {
              reply: 'local reply text',
            },
            summary: 'Provider failed with HTTP 400: invalid parameter.',
          },
        },
      }),
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)
    const serialized = JSON.stringify({ snapshot, digest })

    expect(snapshot?.currentConsciousFrame).toEqual({
      reasonTags: ['provider-failed'],
      focusAnchor: 'The current user question.',
      consciousNeed: 'Explain the observed failure.',
      speakingIntention: 'Report the Provider error.',
    })
    expect(snapshot?.derivedMindStateBundle?.emotionalKernel?.dominantEmotion).toBe('calm-focus')
    expect(snapshot?.derivedMindStateBundle?.dialogueRhythm).toEqual({
      activeClosenessContext: 'memory-review',
      burdenLine: 'Provider failed with HTTP 400: invalid parameter.',
    })
    expect(serialized).not.toContain('unknownReplyAuthority')
    expect(serialized).not.toContain('local reply text')
  })

  it('preserves all structured provider, tool, execution, and memory reason tags', () => {
    const reasonTags = [
      'working-memory-linked',
      'long-term-recall-linked',
      'provider-failed',
      'tool-failed',
      'execution-failed',
    ]
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        dialogue: {
          currentConsciousFrame: {
            reasonTags,
          },
        },
      }),
    })

    expect(snapshot?.currentConsciousFrame?.reasonTags).toEqual(reasonTags)
    expect(projectAlicizationRuntimeDigest(snapshot)?.currentConsciousFrame?.reasonTags).toEqual(reasonTags)
  })

  it('keeps WorkingMemory, emotional state, and long-term recall evidence intact', () => {
    const emotionalKernel = {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'calm-focus',
      initiativeMode: 'responsive',
      memoryRecallMode: 'available',
      embodimentTone: 'steady',
      valence: 0.62,
      arousal: 0.34,
      guardedness: 0.18,
      closenessDrive: 0.48,
      repairNeed: 0.08,
      initiativePressure: 0.44,
      reasonTags: ['live-emotion'],
      why: 'The current exchange is calm and focused.',
    }
    const affectiveResidue = {
      version: 'affective-residue-memory-v1',
      afterglow: null,
      repairTrace: null,
      relationshipCadence: null,
      sourceTags: ['real-affect'],
      updatedAt: 1,
    }
    const recollectionPlan = {
      selectedConsolidationIds: ['reflection-1'],
      selectedWindowIds: [],
      selectedProceduralIds: [],
      selectedEpisodeIds: [],
      selectedConversationTurnIds: [],
      opening: 'A reviewed reflection matched the current question.',
      certainty: 'firm',
      rationale: 'The reflection matches.',
      confidence: 0.93,
    }
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        memory: {
          workingMemoryEpisodes: [{
            id: 'working-1',
            summary: 'The user is testing memory.',
          }],
          emotionalKernel,
          affectiveResidue,
          recollectionPlan,
          derivedMindStateBundle: {
            version: 'derived-mind-state-bundle-v1',
            source: 'main-runtime',
            producedAt: 1,
            emotionalKernel,
            affectiveResidue,
            recollectionPlan,
            summary: 'Reviewed long-term evidence is available.',
          },
        },
      }),
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.channels['active-memory'].summary).toContain('episodes=1')
    expect(snapshot?.emotionalKernel).toBe(emotionalKernel)
    expect(snapshot?.affectiveResidue).toBe(affectiveResidue)
    expect(snapshot?.derivedMindStateBundle?.recollectionPlan).toBe(recollectionPlan)
    expect(digest?.emotionalKernel?.dominantEmotion).toBe('calm-focus')
    expect(digest?.derivedMindStateBundle?.recollectionPlan).toBe(recollectionPlan)
  })

  it('lets actioning autonomy act without synthesizing proactive speech', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        autonomy: {
          selectedMode: 'prepare-act',
          shouldSpeak: false,
          shouldAct: true,
          speakReadiness: 0.1,
          actReadiness: 0.92,
          inhibition: 0.06,
          confidence: 0.9,
          visibleAction: 'inspect-file',
          executionIntent: {
            kind: 'inspect',
            summary: 'Inspect the requested file.',
          },
          deferReason: null,
          whyNow: 'The user requested the inspection.',
        },
      }),
    })

    expect(snapshot?.shouldProactivelyAct).toBe(true)
    expect(snapshot?.shouldProactivelySpeak).toBe(false)
    expect(snapshot?.autonomy).toEqual(expect.objectContaining({
      selectedMode: 'prepare-act',
      executionIntentKind: 'inspect',
    }))
  })

  it('counts task and capture telemetry from real session state', () => {
    expect(deriveAlicizationAgentRuntimeTelemetryFromSession({
      tasks: [
        { status: 'pending' },
        { status: 'completed' },
        { status: 'failed' },
        { status: 'completed' },
      ],
      continuitySignals: [{}, {}],
      lastSensorySnapshot: {
        capture: {
          health: 'healthy',
        },
      },
    })).toEqual({
      pendingTasks: 1,
      completedTasks: 2,
      failedTasks: 1,
      continuitySignals: 2,
      sensoryCaptureHealthy: true,
    })
  })

  it('applies a visible-presence-without-utterance policy result structurally', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        initiative: {
          shouldSpeak: true,
          shouldAct: true,
          confidence: 0.9,
          speakDrive: 0.9,
          selectedAction: 'inspect-file',
          preferredStyle: 'direct',
          why: 'The user requested it.',
        },
      }),
    })
    const adjusted = derivePostPolicyQuietHoldRuntimeSnapshot(snapshot, {
      shouldPersistVisibleUtterance: false,
      reason: 'proactive-visible-presence-without-utterance',
    })

    expect(adjusted?.shouldProactivelySpeak).toBe(false)
    expect(adjusted?.shouldProactivelyAct).toBe(false)
    expect(adjusted?.activeLoop?.continuityPressure).toBeTypeOf('number')
    expect(adjusted?.activeLoop?.companionshipPressure).toBeTypeOf('number')
  })
})
