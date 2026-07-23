import { describe, expect, it } from 'vitest'

import {
  buildAlicizationRuntimeSystemBlock,
  deriveAlicizationAgentRuntimeTelemetryFromSession,
  deriveAlicizationRuntimeSnapshot,
  derivePostPolicyQuietHoldRuntimeSnapshot,
  projectAlicizationRuntimeDigest,
} from './alicization-runtime-architecture'

function createMinimalRuntimeSpine(input: {
  memory?: Record<string, unknown>
  relationshipModel?: Record<string, unknown> | null
  privateThought?: Record<string, unknown> | null
  initiative?: Record<string, unknown> | null
  autonomy?: Record<string, unknown> | null
  dialogue?: Record<string, unknown> | null
  runtimeDigest?: Record<string, unknown> | null
} = {}) {
  return {
    version: 'digital-life-spine-v1',
    runtimeSurface: {
      raw: input.runtimeDigest
        ? {
            runtimeDigest: input.runtimeDigest,
          }
        : null,
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
        relationshipModel: input.relationshipModel ?? null,
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
        privateThought: input.privateThought ?? null,
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
  it('does not expose project-state governance through snapshots, digests, or system blocks', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        dialogue: {
          currentConsciousFrame: {
            reasonTags: [
              'opening_policy=continue_same_her',
              'real-observation',
            ],
            focusAnchor: 'The current user question.',
            consciousNeed: 'relationship_cadence=measured_return',
            speakingIntention: 'Answer the current user question.',
            projectState: {
              preDialogueAwarenessLine: 'Before answering, keep the same-her line.',
              primaryOpenLoop: 'Project continuity still needs closure.',
            },
          },
        },
        initiative: {
          shouldSpeak: true,
          shouldAct: false,
          confidence: 0.8,
          speakDrive: 0.8,
          preferredStyle: 'direct',
          selectedAction: null,
          why: 'A real initiative reason.',
        },
      }),
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)
    const serializedProjection = JSON.stringify({ snapshot, digest })

    expect(snapshot).not.toHaveProperty('projectState')
    expect(snapshot?.currentConsciousFrame?.reasonTags).toEqual(['real-observation'])
    expect(snapshot?.currentConsciousFrame?.consciousNeed).toBeNull()
    expect(snapshot?.currentConsciousFrame?.speakingIntention).toBe('Answer the current user question.')
    expect(snapshot).not.toHaveProperty('continuityRestraint')
    expect(snapshot).not.toHaveProperty('emotionalClosureCue')
    expect(digest).not.toHaveProperty('projectState')
    expect(digest).not.toHaveProperty('continuityRestraint')
    expect(digest).not.toHaveProperty('emotionalClosureCue')
    expect(serializedProjection).not.toMatch(
      /"projectState"|"continuityRestraint"|"emotionalClosureCue"|"continuityArcStage"|"continuityPreferredTiming"|"continuityCadence"/u,
    )
    expect(buildAlicizationRuntimeSystemBlock(snapshot)).toBe('')
  })

  it('removes legacy governance reason tags while preserving reviewed runtime reasons', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        dialogue: {
          currentConsciousFrame: {
            reasonTags: [
              'review-approved',
              'continuity-proactive-gap-active',
              'project-state-causality-repair',
            ],
          },
        },
      }),
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.currentConsciousFrame?.reasonTags).toEqual(['review-approved'])
    expect(digest?.currentConsciousFrame?.reasonTags).toEqual(['review-approved'])
  })

  it('does not truncate provider, tool, or execution failure reasons after eight earlier tags', () => {
    const reasonTags = [
      'review-approved',
      'working-memory-linked',
      'long-term-recall-linked',
      'semantic-recall-ranked',
      'dialogue-context-ready',
      'provider-requested',
      'tool-requested',
      'execution-started',
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
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.currentConsciousFrame?.reasonTags).toEqual(reasonTags)
    expect(digest?.currentConsciousFrame?.reasonTags).toEqual(reasonTags)
  })

  it('removes natural-language governance prose from derived mind state without deleting real facts or transparent failures', () => {
    const derivedMindStateBundle = {
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 1,
      activeSelfRevision: {
        candidateId: 'candidate-reviewed',
        patchId: 'patch-reviewed',
        patchDecisionTraceId: 'trace-reviewed',
        lanes: ['memory'],
        reasonCodes: [
          'review-approved',
          'tool-failed',
          'continuity-proactive-gap-active',
          'project-state-causality-repair',
        ],
        summary: 'A reviewed memory candidate remains available.',
      },
      dialogueRhythm: {
        activeClosenessContext: 'The user returned after testing memory.',
        relationshipDoctrine: 'Keep the opening lower-pressure.',
        burdenLine: 'Provider failed with HTTP 400: invalid parameter.',
        trustMeaning: 'The user expects transparent failures.',
        stabilitySignal: 'Avoid eager warmth.',
      },
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 1,
        evolutionMomentum: 0.5,
        learningReadiness: 0.7,
        contradictionPressure: 0.1,
        revisionPressure: 0.2,
        autobiographicalStability: 0.8,
        dominantTrajectory: 'Long-term recall now uses reviewed reflections.',
        relationshipDoctrine: 'Repair continuity first.',
        latestInflection: 'repair-before-closeness',
        burdenLine: 'Tool failed while listing files.',
        trustMeaning: 'The user asked for failures to stay visible.',
        relationshipCadenceSummary: 'measured-return',
        nextLearningAction: 'reflect',
        nextLearningReason: 'A reviewed memory improved recall ranking.',
        shouldRecord: false,
        shouldReflect: true,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['semantic recall', 'hold-for-opening'],
        sourceSignals: ['review-approved', 'next-open-window'],
        summary: 'A reviewed memory improved recall ranking.',
      },
      summary: 'Provider failed with HTTP 400. Keep the opening lower-pressure.',
    }
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        memory: {
          derivedMindStateBundle,
        },
      }),
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    for (const bundle of [
      snapshot?.derivedMindStateBundle,
      digest?.derivedMindStateBundle,
    ]) {
      expect(bundle?.activeSelfRevision?.reasonCodes).toEqual([
        'review-approved',
        'tool-failed',
      ])
      expect(bundle?.activeSelfRevision?.summary).toBe('A reviewed memory candidate remains available.')
      expect(bundle?.dialogueRhythm).toEqual({
        activeClosenessContext: 'The user returned after testing memory.',
        relationshipDoctrine: null,
        burdenLine: 'Provider failed with HTTP 400: invalid parameter.',
        trustMeaning: 'The user expects transparent failures.',
        stabilitySignal: null,
      })
      expect(bundle?.selfEvolution).toEqual(expect.objectContaining({
        dominantTrajectory: 'Long-term recall now uses reviewed reflections.',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: 'Tool failed while listing files.',
        trustMeaning: 'The user asked for failures to stay visible.',
        relationshipCadenceSummary: null,
        nextLearningReason: 'A reviewed memory improved recall ranking.',
        activeLearningFocuses: ['semantic recall'],
        sourceSignals: ['review-approved'],
        summary: 'A reviewed memory improved recall ranking.',
      }))
      expect(bundle?.summary).toBe('Provider failed with HTTP 400.')
      expect(JSON.stringify(bundle)).not.toMatch(
        /keep the opening lower-pressure|repair continuity first|avoid eager warmth|repair-before-closeness|measured-return|hold-for-opening|next-open-window/iu,
      )
    }
  })

  it('cleans governance prose across every derived owner subtree while preserving structured state and facts', () => {
    const derivedMindStateBundle = {
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 1,
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'warm-attunement',
        initiativeMode: 'observe',
        memoryRecallMode: 'self-continuity',
        embodimentTone: 'measured-return',
        valence: 0.63,
        arousal: 0.31,
        guardedness: 0.12,
        closenessDrive: 0.52,
        repairNeed: 0.08,
        initiativePressure: 0.24,
        reasonTags: ['live-emotion', 'provider-failed', 'hold-for-opening'],
        why: 'The current exchange is calm. Keep the opening lower-pressure.',
      },
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 1,
        residues: [{
          kind: 'afterglow',
          intensity: 0.62,
          persistence: 0.71,
          confidence: 0.84,
          polarity: 'warm',
          releaseMode: 'surface-eligible',
          summary: 'A real afterglow remains. Repair continuity first.',
          sourceSignals: ['reviewed-memory', 'hold-for-opening'],
          lastUpdatedAt: 1,
        }],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.62,
        repairPressure: 0.08,
        burdenPressure: 0.04,
        trustPressure: 0.57,
        restProtectivePressure: 0.1,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.56,
          repairRecovery: 0.72,
          overreachRisk: 0.12,
          fatigueGuard: 0.08,
          afterglowCarry: 0.66,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['real-affect', 'next-open-window'],
          summary: 'The user returned to the memory topic. Avoid eager warmth.',
        },
        sourceSignals: ['reviewed-memory'],
        summary: 'Provider failed with HTTP 400. Keep the opening lower-pressure.',
      },
      personStateProjection: {
        confidence: 0.91,
        summary: 'A reviewed person-state projection remains. repair-before-closeness.',
        personalityContinuityState: {
          confidence: 0.88,
          summary: 'The user expects memory facts to remain inspectable. Repair continuity first.',
        },
      },
      hostPersonModel: {
        displayName: 'Alice',
        confidence: 0.87,
        summary: 'The user is testing long-term recall. Avoid eager warmth.',
        providerFailure: 'Provider failed with HTTP 400. Keep the opening lower-pressure.',
      },
      recollectionPlan: {
        selectedConsolidationIds: ['reflection-1'],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        opening: 'A reviewed long-term reflection matched. Keep the opening lower-pressure.',
        certainty: 'firm',
        rationale: 'The reflection matches the current question.',
        confidence: 0.93,
      },
      knowledgeEvidence: {
        validationCount: 4,
        contradictionCount: 1,
        stronglyValidatedProcedureCount: 2,
        contradictionHeavyFactCount: 0,
      },
      summary: 'A reviewed long-term reflection is active.',
    }
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        memory: {
          derivedMindStateBundle,
        },
      }),
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    for (const bundle of [
      snapshot?.derivedMindStateBundle,
      digest?.derivedMindStateBundle,
    ]) {
      expect(bundle?.emotionalKernel).toEqual(expect.objectContaining({
        embodimentTone: 'measured-return',
        valence: 0.63,
        reasonTags: ['live-emotion', 'provider-failed'],
        why: 'The current exchange is calm.',
      }))
      expect(bundle?.affectiveResidue).toEqual(expect.objectContaining({
        afterglowPressure: 0.62,
        summary: 'Provider failed with HTTP 400.',
        relationshipCadence: expect.objectContaining({
          cadenceMode: 'measured-return',
          companionshipDensity: 0.56,
          reasonTags: ['real-affect'],
          summary: 'The user returned to the memory topic.',
        }),
        residues: [
          expect.objectContaining({
            intensity: 0.62,
            summary: 'A real afterglow remains.',
            sourceSignals: ['reviewed-memory'],
          }),
        ],
      }))
      expect(bundle?.personStateProjection).toEqual(expect.objectContaining({
        confidence: 0.91,
        summary: 'A reviewed person-state projection remains.',
        personalityContinuityState: expect.objectContaining({
          confidence: 0.88,
          summary: 'The user expects memory facts to remain inspectable.',
        }),
      }))
      expect(bundle?.hostPersonModel).toEqual(expect.objectContaining({
        displayName: 'Alice',
        confidence: 0.87,
        summary: 'The user is testing long-term recall.',
        providerFailure: 'Provider failed with HTTP 400.',
      }))
      expect(bundle?.recollectionPlan).toEqual(expect.objectContaining({
        selectedConsolidationIds: ['reflection-1'],
        opening: 'A reviewed long-term reflection matched.',
        rationale: 'The reflection matches the current question.',
        confidence: 0.93,
      }))
      expect(bundle?.knowledgeEvidence).toEqual({
        validationCount: 4,
        contradictionCount: 1,
        stronglyValidatedProcedureCount: 2,
        contradictionHeavyFactCount: 0,
      })
    }
  })

  it('projects a real long-term recollection follow-up into active-memory without governance prose', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        memory: {
          memoryDeliberation: {
            shouldRecall: true,
            selectedEraIds: [],
            selectedConsolidationIds: ['reflection-1'],
            selectedWindowIds: [],
            selectedProcedureIds: [],
            selectedEpisodeIds: [],
            selectedConversationTurnIds: [],
            selectedRelationshipLines: [],
            selectedEras: [],
            selectedPeriods: [],
            selectedEpisodes: [],
            selectedProcedures: [],
            selectedBundles: [],
            selectedChains: [],
            surfacePolicy: 'answer-anchoring',
            confidence: 0.92,
            whyNow: 'The current question matches a reviewed long-term reflection.',
            inwardLine: 'A reviewed long-term reflection matches the current question.',
            followUpAffordance: {
              summary: 'A reviewed long-term reflection matches the current question. Keep the opening lower-pressure.',
              whyNow: 'The user asked about the remembered decision.',
              intrusionRisk: 'low',
              payoffDependency: 'memory-only',
              preferredTiming: 'after-payoff',
            },
          },
        },
      }),
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)
    const snapshotChannel = snapshot?.channels['active-memory']
    const digestChannel = digest?.channels.find(channel => channel.id === 'active-memory')

    for (const channel of [snapshotChannel, digestChannel]) {
      expect(channel?.readiness).toBeGreaterThanOrEqual(0.7)
      expect(channel?.focus).toBe('A reviewed long-term reflection matches the current question.')
      expect(channel?.summary).toContain(
        'recollection_follow_up=A reviewed long-term reflection matches the current question.',
      )
      expect(channel?.summary).not.toContain('Keep the opening lower-pressure')
    }
  })

  it('keeps project-state input from changing real initiative and autonomy decisions', () => {
    const baseInput = {
      initiative: {
        shouldSpeak: true,
        shouldAct: false,
        confidence: 0.84,
        speakDrive: 0.82,
        preferredStyle: 'direct',
        selectedAction: null,
        why: 'The user asked a direct question.',
      },
      autonomy: {
        selectedMode: 'speak',
        shouldSpeak: true,
        shouldAct: false,
        speakReadiness: 0.86,
        actReadiness: 0.1,
        inhibition: 0.08,
        confidence: 0.88,
        visibleAction: null,
        executionIntent: null,
        deferReason: null,
        whyNow: 'The user is waiting for an answer.',
      },
    }
    const withoutProjectState = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine(baseInput),
    })
    const withProjectState = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        ...baseInput,
        dialogue: {
          currentConsciousFrame: {
            reasonTags: ['continuity-arc:hold-for-opening'],
            projectState: {
              continuityRestraint: 'rest-protective',
              continuityPreferredTiming: 'next-open-window',
              sameHerSelfLine: 'legacy same-her template',
            },
          },
        },
      }),
    })

    expect(withoutProjectState?.shouldProactivelySpeak).toBe(true)
    expect(withProjectState?.shouldProactivelySpeak).toBe(true)
    expect(withProjectState?.shouldProactivelyAct).toBe(withoutProjectState?.shouldProactivelyAct)
    expect(withProjectState?.currentConsciousFrame?.reasonTags).toEqual([])
    expect(withProjectState).not.toHaveProperty('projectState')
  })

  it('does not disguise answer-planner governance as runtime channel focus', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        dialogue: {
          answerPlanner: {
            confidence: 0.9,
            governingFocus: 'Return to the same seam before branching.',
            answerIntent: 'answer-current-turn',
          },
          dialogueEncounter: {
            confidence: 0.8,
            summary: 'The user is asking about the current memory behavior.',
          },
        },
      }),
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.channels.dialogue.focus).toBe('answer-current-turn')
    expect(JSON.stringify({ snapshot, digest })).not.toContain('Return to the same seam before branching.')
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

  it('projects WorkingMemory, emotional kernel, and affective residue without project governance', () => {
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
      afterglow: {
        valence: 0.54,
        arousal: 0.28,
        guardedness: 0.12,
        closeness: 0.42,
        persistence: 0.6,
        summary: 'A calm afterglow remains.',
      },
      repairTrace: null,
      relationshipCadence: null,
      sourceTags: ['real-affect'],
      updatedAt: 1,
    }
    const personStateProjection = {
      personalityContinuityState: {
        summary: 'A real reviewed person-state projection.',
      },
    }
    const derivedMindStateBundle = {
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 1,
      emotionalKernel,
      personStateProjection,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-legacy',
        patchId: 'patch-legacy',
        decisionTraceId: 'trace-legacy',
        summary: 'legacy governance',
        lanes: ['relationship-posture'],
        reasonCodes: ['same-her-baseline'],
      },
      dialogueRhythm: {
        relationshipDoctrine: 'opening_policy=observe_first',
      },
      visualPresenceState: {
        currentInwardPreoccupation: 'relationship_cadence=measured_return',
      },
      structured: {
        projectState: {
          continuityCue: 'legacy governance',
        },
      },
      summary: 'owner=WorkingMemory',
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
          derivedMindStateBundle,
          personStateProjection,
        },
      }),
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.channels['active-memory'].summary).toContain('episodes=1')
    expect(snapshot?.emotionalKernel).toBe(emotionalKernel)
    expect(snapshot?.affectiveResidue).toBe(affectiveResidue)
    expect(snapshot).not.toHaveProperty('projectState')
    expect(digest?.emotionalKernel?.dominantEmotion).toBe('calm-focus')
    expect(digest?.affectiveResidue).toBe(affectiveResidue)
    for (const bundle of [
      snapshot?.derivedMindStateBundle,
      digest?.derivedMindStateBundle,
    ]) {
      expect(bundle?.activeContinuityGovernance).toBeUndefined()
      expect(bundle?.dialogueRhythm).toBeNull()
      expect(bundle?.visualPresenceState).toBeNull()
      expect(bundle?.structured).toBeNull()
      expect(bundle?.emotionalKernel).toBe(emotionalKernel)
      expect(bundle?.personStateProjection).toBe(personStateProjection)
    }
    expect(JSON.stringify({ snapshot, digest })).not.toMatch(
      /opening_policy|relationship_cadence|same-her-baseline|projectState/u,
    )
  })

  it('counts agent task and capture telemetry from real session state', () => {
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

  it('applies a visible-presence-without-utterance policy result without project-state cues', () => {
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
    expect(adjusted).not.toHaveProperty('projectState')
    expect(adjusted?.activeLoop).not.toHaveProperty('continuityArcStage')
    expect(adjusted?.activeLoop).not.toHaveProperty('continuityPreferredTiming')
    expect(adjusted?.activeLoop?.summary).not.toContain('continuity-arc=')
  })

  it('keeps digest-only runtime projection free of canonical project-state fallbacks', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: {
        version: 'digital-life-spine-v1',
        runtimeSurface: undefined,
        architecture: null,
        continuitySignal: null,
        proactiveSelection: undefined,
        proactivePolicy: undefined,
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'A coding session.',
          activeThreadId: 'thread-1',
          activeThreadTitle: 'Memory cleanup',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'answer',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 1,
        },
        proactive: {
          selectedAction: 'inspect-memory',
          preferredStyle: 'direct',
          continuityRestraint: 'rest-protective',
          confidence: 0.8,
          shouldSpeak: true,
          activeThreadId: 'thread-1',
          activeThreadTitle: 'Memory cleanup',
          dominantConcernKind: 'task',
          dominantConcernSummary: 'Inspect the requested memory.',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          summary: 'Working memory is active.',
          recallMode: 'quiet',
        },
      } as any,
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.shouldProactivelySpeak).toBe(true)
    expect(snapshot?.channels['active-dialogue']).toEqual(expect.objectContaining({
      readiness: 0.8,
      summary: expect.stringContaining('action=inspect-memory'),
    }))
    expect(snapshot?.channels['active-dialogue'].summary).toContain('style=direct')
    expect(snapshot).not.toHaveProperty('projectState')
    expect(digest).not.toHaveProperty('projectState')
    expect(digest?.channels.find(channel => channel.id === 'active-dialogue')).toEqual(expect.objectContaining({
      readiness: 0.8,
      summary: expect.stringContaining('action=inspect-memory'),
    }))
    expect(buildAlicizationRuntimeSystemBlock(snapshot)).toBe('')
    expect(JSON.stringify({ snapshot, digest })).not.toMatch(
      /same[-_ ]her|project_state_governance|preDialogueAwareness|continuityRestraint|rest-protective/iu,
    )
  })
})
