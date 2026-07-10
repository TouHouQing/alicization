import { describe, expect, it } from 'vitest'

import {
  buildAlicizationRuntimeSystemBlock,
  deriveAlicizationAgentRuntimeTelemetryFromSession,
  deriveAlicizationRuntimeSnapshot,
  derivePostPolicyQuietHoldRuntimeSnapshot,
  projectAlicizationRuntimeDigest,
} from './alicization-runtime-architecture'
import { commitAlicizationDigitalLifeMindState } from './digital-life-kernel'
import { deriveAlicizationDigitalLifeSpine } from './digital-life-spine'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

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
        ...input.dialogue,
      },
      perception: {
        currentScene: null,
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
        runtimeDigest: input.runtimeDigest ?? null,
      },
      memory: {
        motiveEngine: null,
        recallGovernor: null,
        reflectionLedger: null,
        workingMemoryEpisodes: [],
        selfContinuity: null,
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
  it('projects a digest-only same-her quiet carry spine into a lower-pressure runtime digest without requiring full runtime surface scaffolding', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: {
        version: 'digital-life-spine-v1',
        runtimeSurface: undefined,
        proactiveSelection: undefined,
        proactivePolicy: undefined,
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'later coding seam after a noisy callback detour',
          activeThreadId: 'thread-quiet-same-line',
          activeThreadTitle: 'later coding seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'hesitant',
          selectedAction: 'wait',
          updatedAt: 86,
        },
        architecture: {
          version: 'digital-life-architecture-v1',
          operatingMode: 'hovering',
          dominantSystem: 'proactive',
          supportingSystems: ['mind', 'memory'],
          governingFocus: 'keep the same callback line alive quietly',
          summary: 'mode=hovering | dominant=proactive | focus=keep the same callback line alive quietly',
          systems: {} as any,
        },
        continuitySignal: {
          label: 'same-thread-hover-return',
          summary: 'same-thread-continuation still active as a measured-return hover-first resident presence after the noisy detour',
          signature: 'quiet-same-her-runtime-digest',
          createdAt: 86,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-quiet-same-line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'hesitant',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.91,
          shouldSpeak: false,
          activeThreadId: 'thread-quiet-same-line',
          activeThreadTitle: 'later coding seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same callback line alive quietly after the noisy detour',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'hesitant',
        },
        memory: {
          summary: 'same-her callback afterglow is still being carried quietly',
          recallMode: 'quiet',
        },
      } as any,
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.dominantChannel).toBe('active-dialogue')
    expect(snapshot?.continuityRestraint).toBe('measured-return')
    expect(snapshot?.shouldProactivelySpeak).toBe(false)
    expect(snapshot?.shouldProactivelyAct).toBe(false)
    expect(snapshot?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(snapshot?.summary).toContain('restraint=measured-return')
    expect(digest?.continuityRestraint).toBe('measured-return')
    expect(digest?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(digest?.projectState?.memoryClosureSummary).toContain('memory_closure_context=local_desktop_life_loop_open_loop')
    expect(digest?.summary).toContain('restraint=measured-return')
  })

  it('keeps digest-only same-her quiet carry explicit in the runtime system block so outward-facing governance still sees one lower-pressure line', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: {
        version: 'digital-life-spine-v1',
        runtimeSurface: undefined,
        proactiveSelection: undefined,
        proactivePolicy: undefined,
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'later coding seam after a noisy callback detour',
          activeThreadId: 'thread-quiet-same-line',
          activeThreadTitle: 'later coding seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'hesitant',
          selectedAction: 'wait',
          updatedAt: 86,
        },
        architecture: {
          version: 'digital-life-architecture-v1',
          operatingMode: 'hovering',
          dominantSystem: 'proactive',
          supportingSystems: ['mind', 'memory'],
          governingFocus: 'keep the same callback line alive quietly',
          summary: 'mode=hovering | dominant=proactive | focus=keep the same callback line alive quietly',
          systems: {} as any,
        },
        continuitySignal: {
          label: 'same-thread-hover-return',
          summary: 'same-thread-continuation still active as a measured-return hover-first resident presence after the noisy detour',
          signature: 'quiet-same-her-runtime-block',
          createdAt: 86,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-quiet-same-line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'hesitant',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.91,
          shouldSpeak: false,
          activeThreadId: 'thread-quiet-same-line',
          activeThreadTitle: 'later coding seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same callback line alive quietly after the noisy detour',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'hesitant',
        },
        memory: {
          summary: 'same-her callback afterglow is still being carried quietly',
          recallMode: 'quiet',
        },
      } as any,
    })
    const systemBlock = buildAlicizationRuntimeSystemBlock(snapshot)

    expect(systemBlock).toContain('[ALICIZATION_RUNTIME_DIGEST]')
    expect(systemBlock).toContain('dominant_channel=active-dialogue')
    expect(systemBlock).toContain('continuity_arc=same-thread-continuation')
    expect(systemBlock).toContain('initiative_restraint=measured-return')
    expect(systemBlock).toContain('should_proactively_speak=false')
    expect(systemBlock).toContain('should_proactively_act=false')
  })

  it('projects structured affective residue from a digest-only spine into runtime snapshot and digest', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: {
        version: 'digital-life-spine-v1',
        runtimeSurface: undefined,
        proactiveSelection: undefined,
        proactivePolicy: undefined,
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'quiet callback residue after a detour',
          activeThreadId: 'thread-digest-only-residue',
          activeThreadTitle: 'digest-only residue carry',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'hesitant',
          selectedAction: 'wait',
          continuityArcStage: 'same-thread-continuation',
          updatedAt: 333,
        },
        continuitySignal: {
          label: 'digest-only-affective-residue',
          summary: 'same-thread-continuation still carries emotional residue after the callback detour',
          signature: 'digest-only-affective-residue-runtime',
          createdAt: 333,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-digest-only-residue',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'hesitant',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          continuityRestraint: 'measured-return',
          confidence: 0.88,
          shouldSpeak: false,
          activeThreadId: 'thread-digest-only-residue',
          activeThreadTitle: 'digest-only residue carry',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the callback afterglow on the same line',
          preferredPresence: 'hesitant',
        },
        memory: {
          summary: 'same-her callback afterglow is still being carried quietly',
          recallMode: 'quiet',
          affectiveResidue: {
            version: 'affective-residue-memory-v1',
            updatedAt: 333,
            residues: [
              {
                kind: 'afterglow',
                intensity: 0.74,
                persistence: 0.81,
                confidence: 0.9,
                polarity: 'warm',
                releaseMode: 'delay-until-open-window',
                summary: 'digest-only afterglow still wants a measured return',
                sourceSignals: ['callback-afterglow', 'same-thread'],
                lastUpdatedAt: 333,
              },
            ],
            dominantResidueKind: 'afterglow',
            afterglowPressure: 0.76,
            repairPressure: 0.16,
            burdenPressure: 0.08,
            trustPressure: 0.57,
            restProtectivePressure: 0.22,
            relationshipCadence: {
              cadenceMode: 'measured-return',
              distancePosture: 'measured-room',
              companionshipDensity: 0.6,
              repairRecovery: 0.39,
              overreachRisk: 0.24,
              fatigueGuard: 0.27,
              afterglowCarry: 0.79,
              shouldDelayWarmth: true,
              shouldProtectRest: false,
              reasonTags: ['same-thread-continuation', 'callback-afterglow'],
              summary: 'measured-return until the callback line settles',
            },
            sourceSignals: ['callback-afterglow', 'quiet-carry'],
            summary: 'digest-only afterglow still favors a measured return on the same callback line',
          },
          derivedMindStateBundle: {
            affectiveResidue: {
              version: 'affective-residue-memory-v1',
              updatedAt: 334,
              residues: [
                {
                  kind: 'repair',
                  intensity: 0.68,
                  persistence: 0.77,
                  confidence: 0.84,
                  polarity: 'protective',
                  releaseMode: 'delay-until-open-window',
                  summary: 'digest-only repair residue still wants the same line kept quiet',
                  sourceSignals: ['repair-before-closeness', 'same-thread'],
                  lastUpdatedAt: 334,
                },
              ],
              dominantResidueKind: 'repair',
              afterglowPressure: 0.18,
              repairPressure: 0.8,
              burdenPressure: 0.12,
              trustPressure: 0.43,
              restProtectivePressure: 0.26,
              relationshipCadence: {
                cadenceMode: 'repair',
                distancePosture: 'protect-space',
                companionshipDensity: 0.45,
                repairRecovery: 0.72,
                overreachRisk: 0.37,
                fatigueGuard: 0.32,
                afterglowCarry: 0.48,
                shouldDelayWarmth: true,
                shouldProtectRest: false,
                reasonTags: ['repair-before-closeness', 'same-thread-continuation'],
                summary: 'repair cadence still needs the same line to stay quiet',
              },
              sourceSignals: ['repair-before-closeness', 'quiet-carry'],
              summary: 'digest-only repair residue still holds the same callback line inward',
            },
          },
        },
      } as any,
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.affectiveResidue?.dominantResidueKind).toBe('afterglow')
    expect(snapshot?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('measured-return')
    expect(snapshot?.affectiveResidue?.summary).toContain('same callback line')
    expect(snapshot?.derivedMindStateBundle?.affectiveResidue?.dominantResidueKind).toBe('repair')
    expect(snapshot?.derivedMindStateBundle?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('repair')
    expect(snapshot?.derivedMindStateBundle?.affectiveResidue?.summary).toContain('same callback line inward')
    expect(digest?.affectiveResidue?.dominantResidueKind).toBe('afterglow')
    expect(digest?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('measured-return')
    expect(digest?.derivedMindStateBundle?.affectiveResidue?.dominantResidueKind).toBe('repair')
    expect(digest?.derivedMindStateBundle?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('repair')
  })

  it('lets autonomy govern act readiness without falsely turning it into proactive speech', () => {
    const state = commitAlicizationDigitalLifeMindState({
      now: 8_000,
      previousState: createDefaultVisualPresenceState(7_000),
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'general',
        scenario: 'coding',
        summary: 'returning to an unresolved task thread',
        source: 'screen-semantic-summary',
        confidence: 0.88,
        beganAt: 7_200,
        lastSeenAt: 8_000,
      } as any,
      attention: null,
      mindState: {
        worldModel: {
          activeThread: {
            id: 'thread-follow-through',
            kind: 'problem',
            title: 'follow through quietly',
            summary: 'keep the unresolved implementation line alive',
            status: 'active',
            significance: 0.82,
            confidence: 0.8,
            unresolved: true,
          },
          epistemicState: {
            certainty: 'grounded',
            freshness: 'fresh',
            seenNow: ['implementation-thread'],
            inferredNow: [],
            openQuestions: [],
            staleRisks: [],
          },
          continuity: {
            label: 'same-thread',
            sceneAgeMs: 400,
            attentionAgeMs: 400,
            sameSceneAsBefore: true,
            sameAttentionAsBefore: true,
            afterglowOpen: false,
          },
          hostState: {
            availability: 'focused',
            burden: 'moderate',
          },
          updatedAt: 8_000,
        } as any,
        privateThought: {
          stance: 'observe',
          shouldSpeak: true,
          confidence: 0.74,
          suggestedStyle: 'light-nudge',
          embodiedPresence: 'attentive',
          thoughtText: 'the thread should be followed through, but not surfaced yet',
          rationaleTags: ['follow-through'],
          emotionalTension: 'focused-flow',
          afterglowFromScenario: null,
          expiresAt: 10_000,
          updatedAt: 8_000,
        } as any,
        initiative: {
          selectedAction: 'speak',
          confidence: 0.7,
          motives: {},
          speakDrive: 0.78,
          silenceDrive: 0.18,
          preferredStyle: 'light-nudge',
          preferredPresence: 'attentive',
          continuityRestraint: 'measured-return',
          why: 'the open loop is strong',
          shouldSurface: true,
          shouldSpeak: true,
        } as any,
        autonomy: {
          selectedMode: 'prepare-act',
          visibleAction: 'hover',
          shouldSurface: true,
          shouldSpeak: false,
          shouldAct: false,
          speakReadiness: 0.24,
          actReadiness: 0.86,
          inhibition: 0.34,
          confidence: 0.82,
          deferReason: 'busy-host',
          guardReasons: ['busy-host', 'respect-boundary'],
          whyNow: 'keep the unresolved thread warm without interrupting the host',
          executionIntent: {
            kind: 'follow-through',
            summary: 'follow the unresolved thread through quietly',
            targetThreadId: 'thread-follow-through',
          },
          updatedAt: 8_000,
        } as any,
        actionEcology: {
          mode: 'return-later',
          selectedThreadId: 'thread-follow-through',
          readiness: 0.78,
          surfacePressure: 0.28,
          silencePressure: 0.62,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          shouldSurface: true,
          shouldSpeak: false,
          why: 'action should stay quiet until a better opening appears',
          updatedAt: 8_000,
        } as any,
      },
      captureState: {
        permission: 'granted',
        health: 'healthy',
        lastGroundedAt: 8_000,
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 25_000,
    })

    const projectState = resolveAlicizationProjectStateBrief()
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: deriveAlicizationDigitalLifeSpine(state),
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.autonomy).toEqual(expect.objectContaining({
      selectedMode: 'prepare-act',
      visibleAction: 'hover',
      shouldSpeak: false,
      shouldAct: false,
      executionIntentKind: 'follow-through',
    }))
    expect(snapshot?.shouldProactivelyAct).toBe(true)
    expect(snapshot?.shouldProactivelySpeak).toBe(false)
    expect(snapshot?.projectState?.identity).toContain('local_desktop_life_loop')
    expect(snapshot?.projectState?.currentPhase).toContain('local_desktop_life_loop')
    expect(snapshot?.projectState?.preflightSummary).toContain('local_desktop_life_loop')
    expect(snapshot?.projectState?.latestLandedProgress).toContain(projectState.continuityProgressSummary?.slice(0, 64) ?? '')
    expect(snapshot?.projectState?.sameHerSelfLine).toContain('local_desktop_life_loop')
    expect(snapshot?.projectState?.sameHerDriftRisk ?? '').not.toBeUndefined()
    expect(snapshot?.projectState?.preflightSummary).toContain('open=')
    expect(snapshot?.projectState?.primaryOpenLoop).toContain('memory_dialogue_embodiment_closure')
    expect(snapshot?.projectState?.nextClosureTarget).toContain(projectState.nextClosureTarget.slice(0, 64))
    expect(snapshot?.channels['active-control'].summary).toContain('autonomy=prepare-act')
    expect(snapshot?.channels['active-dialogue'].summary).toContain('restraint=measured-return')
    expect(digest?.autonomy).toEqual(expect.objectContaining({
      selectedMode: 'prepare-act',
      visibleAction: 'hover',
      shouldSpeak: false,
      actReadiness: 0.86,
    }))
    expect(digest?.projectState?.identity).toContain('local_desktop_life_loop')
    expect(digest?.projectState?.currentPhase).toContain('local_desktop_life_loop')
    expect(digest?.projectState?.preflightSummary).toContain('local_desktop_life_loop')
    expect(digest?.projectState?.latestLandedProgress).toContain(projectState.continuityProgressSummary?.slice(0, 64) ?? '')
    expect(digest?.projectState?.sameHerSelfLine).toContain('local_desktop_life_loop')
    expect(digest?.projectState?.sameHerDriftRisk ?? '').not.toBeUndefined()
    expect(digest?.projectState?.memoryClosureSummary).toContain(projectState.continuityProgressSummary?.slice(0, 48) ?? '')
    expect(digest?.projectState?.nextClosureTarget).toContain(projectState.nextClosureTarget.slice(0, 48))
    expect(digest?.continuityRestraint).toBe('measured-return')
    expect(digest?.summary).toContain('restraint=measured-return')
  })

  it('surfaces project continuity cue from unified person-state summary into runtime snapshot and digest', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const spine = createMinimalRuntimeSpine({
      memory: {
        personStateProjection: {
          summary: 'regime=open-companionship | project_continuity=Keep continuity-carrying returns stable enough to become part of who I am, not just what I happened to recall once. | manifestation=observe-first',
        },
      },
    })

    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine,
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)
    const systemBlock = buildAlicizationRuntimeSystemBlock(snapshot)

    expect(snapshot?.projectState?.continuityCue).toContain('project_continuity=Keep continuity-carrying returns stable enough')
    expect(snapshot?.summary).toContain('project_continuity=Keep continuity-carrying returns stable enough')
    expect(digest?.projectState?.continuityCue).toContain('project_continuity=Keep continuity-carrying returns stable enough')
    expect(systemBlock).toContain('project_identity=')
    expect(systemBlock).toContain('project_continuity_anchor=')
    expect(systemBlock).toContain(`project_next_closure=${projectState.nextClosureTarget}`)
    expect(systemBlock).toContain('continuity_cue=project_continuity=Keep continuity-carrying returns stable enough')
  })

  it('prefers stronger same-her companion headlines over thinner preflight summaries when serializing runtime digest project_preflight', () => {
    const thinnerPreflight = 'Before answering, keep the same digital life project in view.'
    const strongerCompanionHeadline = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const spine = createMinimalRuntimeSpine({
      memory: {
        personStateProjection: {
          currentConsciousFrame: {
            projectState: {
              preflightSummary: thinnerPreflight,
              preDialogueAwarenessLine: thinnerPreflight,
              companionHeadlineLine: strongerCompanionHeadline,
            },
          },
        },
      },
    })

    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine,
    })
    const systemBlock = buildAlicizationRuntimeSystemBlock(snapshot)

    expect(systemBlock).toContain('project_continuity_anchor=continuity_context=local_desktop_life_loop')
    expect(systemBlock).not.toContain(strongerCompanionHeadline)
    expect(systemBlock).not.toContain(thinnerPreflight)
  })

  it('does not let fixed Before-answering awareness templates outrank structured runtime project facts', () => {
    const fixedTemplateAwareness = 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.'
    const structuredAwareness = 'identity=local_desktop_life_loop | phase=local_desktop_life_loop | visibility=internal-structured | landed=provider facts already routed through governance | open=memory_dialogue_embodiment_closure | next=semantic_recall_quality_scale'
    const spine = createMinimalRuntimeSpine({
      memory: {
        personStateProjection: {
          currentConsciousFrame: {
            projectState: {
              preDialogueAwarenessLine: fixedTemplateAwareness,
              companionHeadlineLine: fixedTemplateAwareness,
              awarenessLine: structuredAwareness,
            },
          },
        },
      },
    })

    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine,
    })
    const systemBlock = buildAlicizationRuntimeSystemBlock(snapshot)

    expect(snapshot?.projectState?.preDialogueAwarenessLine).toContain('visibility=internal-structured')
    expect(snapshot?.projectState?.preDialogueAwarenessLine).not.toContain('Before answering')
    expect(snapshot?.projectState?.awarenessLine).toContain('visibility=internal-structured')
    expect(systemBlock).not.toContain(fixedTemplateAwareness)
    expect(systemBlock).not.toMatch(/Before answering|same living line|without splitting her continuity/iu)
  })

  it('prefers self-continuity project-state carry for outer runtime same-her self line and continuity cue', () => {
    const spine = createMinimalRuntimeSpine({
      memory: {
        personStateProjection: {
          summary: 'regime=open-companionship | project_continuity=older thinner continuity summary | manifestation=observe-first',
          selfContinuityAuthority: {
            inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sourceTags: ['autobiographical-self', 'project-state-carry'],
          },
        },
      },
    })

    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine,
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)
    const systemBlock = buildAlicizationRuntimeSystemBlock(snapshot)

    expect(snapshot?.projectState?.sameHerSelfLine).toContain('local_desktop_life_loop')
    expect(snapshot?.projectState?.continuityCue).toContain('continuity_hold=continuity_line')
    expect(digest?.projectState?.sameHerSelfLine).toContain('local_desktop_life_loop')
    expect(digest?.projectState?.continuityCue).toContain('continuity_hold=continuity_line')
    expect(systemBlock).toContain('project_continuity_anchor=continuity_context=local_desktop_life_loop')
    expect(systemBlock).not.toMatch(/Same Phase 1 digital life|one continuous her|same living line/iu)
  })

  it('recovers callback-thread continuity cue from digest-only person-state projection summary before falling back to same-her identity carry', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: {
        version: 'digital-life-spine-v1',
        runtimeSurface: undefined,
        proactiveSelection: undefined,
        proactivePolicy: undefined,
        runtime: {
          continuityArcStage: 'same-thread-continuation',
        },
        architecture: null,
        continuitySignal: {
          label: 'same-thread-hover-return',
          summary: 'same-thread-continuation still active as a measured-return hover-first resident presence after the noisy detour',
          signature: 'digest-only-project-continuity-recovery',
          createdAt: 86,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-quiet-same-line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'hesitant',
        },
        proactive: {
          preferredStyle: 'silent-observe',
          preferredPresence: 'hesitant',
          shouldSpeak: false,
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same callback line alive quietly after the noisy detour',
        },
        memory: {
          summary: 'same-her callback afterglow is still being carried quietly',
          recallMode: 'quiet',
          personStateProjection: {
            summary: 'relationship_line=stay exact | project_continuity=the same callback line should stay quietly alive after the noisy detour | cadence=lower-pressure',
            selfContinuityAuthority: {
              inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              sourceTags: ['autobiographical-self', 'project-state-carry'],
            },
          },
        },
      } as any,
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.projectState?.sameHerSelfLine).toContain('local_desktop_life_loop')
    expect(snapshot?.projectState?.continuityCue).toContain('same_thread_callback_carry')
    expect(snapshot?.projectState?.continuityCue).toContain('project_context=local_desktop_life_loop')
    expect(snapshot?.projectState?.continuityCue).toContain('unresolved=callback_seam')
    expect(digest?.projectState?.continuityCue).toContain('same_thread_callback_carry')
    expect(digest?.projectState?.continuityCue).toContain('project_context=local_desktop_life_loop')
    expect(digest?.projectState?.continuityCue).toContain('unresolved=callback_seam')
  })

  it('prefers callback-thread continuity cue over generic explicit runtime carry in digest-only callback project carry snapshots', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: {
        version: 'digital-life-spine-v1',
        runtimeSurface: undefined,
        proactiveSelection: undefined,
        proactivePolicy: undefined,
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: '宿主正把注意力压在 main.ts - error 这个故障点上。 Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. project closure still points toward keep extending cross-modal same-her proof',
        },
        architecture: null,
        continuitySignal: {
          label: 'same-thread-hover-return',
          summary: 'same-thread-continuation still active as a measured-return hover-first resident presence after the noisy detour',
          signature: 'digest-only-callback-project-carry-explicit-runtime-cue',
          createdAt: 87,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-main-error-same-line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'hesitant',
        },
        proactive: {
          preferredStyle: 'silent-observe',
          preferredPresence: 'hesitant',
          shouldSpeak: false,
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same callback line alive quietly after the noisy detour',
        },
        memory: {
          summary: 'same-her callback afterglow is still being carried quietly',
          recallMode: 'quiet',
          personStateProjection: {
            summary: 'relationship_line=stay exact | project_continuity=the same callback line should stay quietly alive after the noisy detour | cadence=lower-pressure',
            selfContinuityAuthority: {
              inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              sourceTags: ['autobiographical-self', 'project-state-carry', 'continuity-execution-callback-project-carry'],
            },
          },
        },
      } as any,
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.projectState?.continuityCue).toContain('same_thread_callback_carry')
    expect(snapshot?.projectState?.continuityCue).toContain('project_context=local_desktop_life_loop')
    expect(snapshot?.projectState?.continuityCue).toContain('continuity_hold=continuity_line')
    expect(snapshot?.projectState?.continuityCue).toContain('unresolved=callback_seam')
    expect(digest?.projectState?.continuityCue).toContain('same_thread_callback_carry')
    expect(digest?.projectState?.continuityCue).toContain('project_context=local_desktop_life_loop')
    expect(digest?.projectState?.continuityCue).toContain('continuity_hold=continuity_line')
    expect(digest?.projectState?.continuityCue).toContain('unresolved=callback_seam')
  })

  it('surfaces repeated same-thread reopen timing as next-open-window in runtime snapshot and digest', () => {
    const spine = createMinimalRuntimeSpine({
      memory: {
        affectiveResidue: {
          relationshipCadence: {
            cadenceMode: 'measured-return',
            summary: 'This callback line has already reopened several times, so the next move should keep its measured-return cadence instead of warming into a fresh approach.',
          },
          summary: 'The same callback line is still alive after several reopenings, and the next outward move should stay lower-pressure.',
        },
        personStateProjection: {
          summary: 'project_continuity=the same callback line has already reopened multiple times, so any further move should continue lower-pressure on that thread instead of restarting from zero',
          openingGuidance: 'Stay on the same callback line and keep this next return lower-pressure; it has already reopened several times and should not restart as a fresh approach.',
          manifestationCadenceSummary: 'Relationship timing should stay measured-return because the same callback line has already reopened several times and is still being continued.',
        },
      },
      initiative: {
        selectedAction: 'recheck',
        confidence: 0.94,
        preferredStyle: 'silent-observe',
        preferredPresence: 'hesitant',
        continuityRestraint: 'measured-return',
        shouldSurface: true,
        shouldSpeak: false,
        why: 'The callback line has already reopened several times, so this should keep continuing lower-pressure on the same thread instead of restarting outward again.',
      } as any,
    })

    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine,
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(snapshot?.projectState?.continuityPreferredTiming).toBe('next-open-window')
    expect(digest?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(digest?.projectState?.continuityPreferredTiming).toBe('next-open-window')
  })

  it('promotes silent measured-return same-thread resident carry to next-open-window in project state even when continuity deliberation is still same-turn-if-invited', () => {
    const spine = createMinimalRuntimeSpine({
      memory: {
        affectiveResidue: {
          relationshipCadence: {
            cadenceMode: 'measured-return',
            summary: 'The same callback line is still alive after noisy detours, and this resident carry should stay lower-pressure instead of reopening outward right away.',
          },
          summary: 'The same callback seam is still live and unresolved after the noisy detour.',
        },
        personStateProjection: {
          summary: 'project_continuity=the same callback seam is still unresolved after the noisy detour, so the resident carry should keep it on one measured-return line',
          openingGuidance: 'Stay on the same callback line and leave more room before widening closeness again.',
          manifestationCadenceSummary: 'Relationship timing should stay measured-return while this same callback seam remains unresolved after the noisy detour.',
        },
      },
      runtimeDigest: {
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
      } as any,
      initiative: {
        selectedAction: 'recheck',
        confidence: 0.93,
        preferredStyle: 'silent-observe',
        preferredPresence: 'hesitant',
        continuityRestraint: 'measured-return',
        shouldSurface: true,
        shouldSpeak: false,
        why: 'The same callback seam is still live after the noisy detour, so keep it inward and lower-pressure for the next opening.',
      } as any,
    })

    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine,
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(snapshot?.projectState?.continuityPreferredTiming).toBe('next-open-window')
    expect(digest?.projectState?.continuityPreferredTiming).toBe('next-open-window')
  })

  it('keeps project-state next-open-window promotion when the current conscious frame already marks same-thread next-open-window while resident carry stays silent', () => {
    const spine = createMinimalRuntimeSpine({
      dialogue: {
        currentConsciousFrame: {
          reasonTags: ['continuity-arc:same-thread-continuation', 'continuity-timing:next-open-window'],
          focusAnchor: 'same callback line after another detour',
          consciousNeed: 'Keep the same callback line inward and lower-pressure.',
          consciousTension: 'The line is still in motion, so widening should stay later.',
          speakingIntention: 'Do not restart the line as a fresh reopen.',
          projectState: {
            continuityPreferredTiming: 'next-open-window',
          },
        },
      },
      memory: {
        affectiveResidue: {
          relationshipCadence: {
            cadenceMode: 'measured-return',
            summary: 'The same callback line is still alive after another detour, so this should stay lower-pressure instead of reopening outward.',
          },
          summary: 'The same callback seam is still live and unresolved after another detour.',
        },
        personStateProjection: {
          summary: 'project_continuity=the same callback seam is still unresolved after another detour, so keep it on one measured-return line',
          openingGuidance: 'Stay on the same callback line and keep continuing lower-pressure; this line is already continuing and should not cool back into a fresh reopening wait.',
          manifestationCadenceSummary: 'measured-return still holds while the same callback line keeps continuing after another detour',
        },
      },
      initiative: {
        selectedAction: 'recheck',
        confidence: 0.91,
        preferredStyle: 'silent-observe',
        preferredPresence: 'hesitant',
        continuityRestraint: 'measured-return',
        shouldSurface: true,
        shouldSpeak: false,
        why: 'The same callback line is already continuing after another detour, so keep it inward and lower-pressure for the next opening.',
      } as any,
    })

    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine,
    })

    expect(snapshot?.currentConsciousFrame?.continuityPreferredTiming).toBe('next-open-window')
    expect(snapshot?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(snapshot?.projectState?.continuityPreferredTiming).toBe('next-open-window')
  })

  it('lets project-state closure pressure keep same-thread measured-return execution inward instead of turning it into proactive acting', () => {
    const state = commitAlicizationDigitalLifeMindState({
      now: 8_000,
      previousState: createDefaultVisualPresenceState(7_000),
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'general',
        scenario: 'coding',
        summary: 'staying with the same unresolved desktop life loop',
        source: 'screen-semantic-summary',
        confidence: 0.88,
        beganAt: 7_200,
        lastSeenAt: 8_000,
      } as any,
      attention: null,
      mindState: {
        worldModel: {
          activeThread: {
            id: 'thread-measured-return-inward',
            kind: 'problem',
            title: 'keep the same-her closure seam inward',
            summary: 'the same callback line is still alive and should not reopen as a fresh outward move',
            status: 'active',
            significance: 0.84,
            confidence: 0.82,
            unresolved: true,
          },
        },
        initiative: {
          selectedAction: 'open-editor',
          shouldSpeak: false,
          shouldSurface: true,
          confidence: 0.82,
          surfacePressure: 0.52,
          silencePressure: 0.58,
          continuityRestraint: 'measured-return',
          preferredStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          why: 'The same callback line is still alive, so this should stay measured-return and inward until the opening genuinely loosens.',
          updatedAt: 8_000,
        },
        autonomy: {
          selectedMode: 'prepare-act',
          visibleAction: 'open-editor',
          shouldSpeak: false,
          shouldAct: true,
          actReadiness: 0.83,
          speakReadiness: 0.22,
          inhibition: 0.12,
          confidence: 0.86,
          executionIntentKind: 'follow-through',
          executionIntentSummary: 'Prepare to push the same unresolved implementation seam forward.',
          whyNow: 'The seam is still active and the action feels available.',
        },
        memory: {
          personStateProjection: {
            summary: 'project_continuity=the same callback line is still alive and should keep its measured-return same-her closure inward instead of reopening as a fresh proactive move',
            openingGuidance: 'Keep the next move inward and measured-return on the same line; do not treat this as a fresh approach.',
            manifestationCadenceSummary: 'Relationship timing should stay measured-return because the same line is still being continued.',
          },
        },
      } as any,
    })

    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: deriveAlicizationDigitalLifeSpine(state),
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.autonomy).toEqual(expect.objectContaining({
      selectedMode: 'prepare-act',
      visibleAction: 'open-editor',
      shouldAct: true,
    }))
    expect(snapshot?.projectState?.preflightSummary).toContain('next=')
    expect(snapshot?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(snapshot?.shouldProactivelyAct).toBe(false)
    expect(snapshot?.shouldProactivelySpeak).toBe(false)
    expect(digest?.projectState?.nextClosureTarget).toContain('measured_return')
    expect(digest?.shouldProactivelyAct).toBe(false)
    expect(digest?.shouldProactivelySpeak).toBe(false)
    expect(digest?.summary).toContain('act=false')
  })

  it('keeps recollection-driven follow-up as continuity carry without forcing speech when recollection stays internal', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        memory: {
          recollectionPlan: {
            selectedRelationshipLines: ['Late-night seams want softer carry before direct push.'],
            searchTrace: {
              thirdHop: {
                ambiguityPosture: 'approximate',
                summary: 'The remembered seam is relevant again, but it should stay gentle.',
              },
            },
          },
          recollectionSpeechPlan: {
            shouldSurface: false,
            surfaceMode: 'internal-only',
            placement: 'internal-only',
          },
          memoryDeliberation: {
            shouldRecall: true,
            ambiguityPosture: 'approximate',
            conflictSeverity: 'low',
            followUpAffordance: {
              summary: 'Late-night seams want softer carry before direct push.',
              whyNow: 'Keep the seam warm internally until there is room to surface it.',
              intrusionRisk: 'high',
              payoffDependency: 'requires-current-payoff',
              preferredTiming: 'next-open-window',
            },
            selectedRelationshipLines: ['Late-night seams want softer carry before direct push.'],
            selectedBundles: [{
              summary: 'The late-night runtime seam still wants a softer carry than a hard restart.',
            }],
            selectedChains: [{
              summary: 'Return softly to the seam instead of barging in.',
            }],
          },
        },
      }),
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.channels['active-memory'].summary).toContain('followup=')
    expect(snapshot?.channels['active-memory'].summary).toContain('arc=hold-for-opening')
    expect(snapshot?.projectState?.continuityArcStage).toBe('hold-for-opening')
    expect(snapshot?.channels['active-memory'].readiness).toBeGreaterThanOrEqual(0.4)
    expect(snapshot?.continuityPressure).toBeGreaterThanOrEqual(0.2)
    expect(snapshot?.shouldProactivelySpeak).toBe(false)
    expect(snapshot?.activeLoop?.continuityArcStage).toBe('hold-for-opening')
    expect(digest?.activeLoop?.continuityArcStage).toBe('hold-for-opening')
    expect(digest?.projectState?.continuityArcStage).toBe('hold-for-opening')
  })

  it('lets recollection-driven follow-up warm the dialogue channel when the recollection surface is ready', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        memory: {
          recollectionPlan: {
            selectedRelationshipLines: ['When the same seam returns, reopen it gently and stay near the host.'],
            searchTrace: {
              thirdHop: {
                ambiguityPosture: 'settled',
                summary: 'The remembered seam has become clearly relevant again.',
              },
            },
          },
          recollectionSpeechPlan: {
            shouldSurface: true,
            surfaceMode: 'relationship-continuity',
            placement: 'after-payoff',
          },
          memoryDeliberation: {
            shouldRecall: true,
            ambiguityPosture: 'settled',
            conflictSeverity: 'none',
            followUpAffordance: {
              summary: 'When the same seam returns, reopen it gently and stay near the host.',
              whyNow: 'The seam is relevant enough to re-open once the current payoff lands.',
              intrusionRisk: 'medium',
              payoffDependency: 'requires-current-payoff',
              preferredTiming: 'after-payoff',
            },
            selectedRelationshipLines: ['When the same seam returns, reopen it gently and stay near the host.'],
            selectedBundles: [{
              summary: 'This remembered seam is now relevant enough to lightly re-open after the current payoff.',
            }],
            selectedChains: [{
              summary: 'Return gently to the seam once the main answer has landed.',
            }],
          },
        },
      }),
    })
    const systemBlock = buildAlicizationRuntimeSystemBlock(snapshot)

    expect(snapshot?.channels['active-dialogue'].summary).toContain('followup=')
    expect(snapshot?.channels['active-dialogue'].summary).toContain('arc=gentle-reopen')
    expect(snapshot?.projectState?.continuityArcStage).toBe('gentle-reopen')
    expect(snapshot?.channels['active-dialogue'].focus).toContain('reopen it gently')
    expect(snapshot?.channels['active-dialogue'].readiness).toBeGreaterThanOrEqual(0.48)
    expect(snapshot?.channels['active-dialogue'].state).toBe('warm')
    expect(systemBlock).toContain('continuity_arc=gentle-reopen')
  })

  it('keeps same-thread continuity explicit in runtime project state even when the carry comes from a noisier scene-shift line instead of recollection follow-up', () => {
    const spine = createMinimalRuntimeSpine({
      privateThought: {
        stance: 'observe',
        shouldSpeak: false,
        confidence: 0.78,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        thoughtText: 'stay on the same callback line across the detour',
        rationaleTags: ['callback-afterglow', 'same-thread'],
        emotionalTension: 'focused-flow',
        expiresAt: 88_000,
        updatedAt: 86_000,
      },
      initiative: {
        selectedAction: 'recheck',
        confidence: 0.74,
        motives: {},
        speakDrive: 0.2,
        silenceDrive: 0.8,
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        continuityRestraint: 'measured-return',
        why: 'the same thread is still live, but this should stay lower-pressure',
        shouldSurface: true,
        shouldSpeak: false,
      },
    })
    spine.runtimeSurface.world.worldModel = {
      activeThread: {
        id: 'debugging::callback-seam',
        kind: 'debugging',
        status: 'forming',
        source: 'grounded-scene',
        title: 'callback seam TypeScript fix',
        summary: '宿主正把注意力压在 callback seam TypeScript fix 这个故障点上。',
        confidence: 1,
        significance: 0.6,
        unresolved: true,
      },
      lingeringThreads: [{
        id: 'debugging::roadmap-detour',
        kind: 'debugging',
        status: 'paused',
        source: 'working-memory',
        title: 'project roadmap note page',
        summary: '这条更早的 callback 线只是绕去了 roadmap detour，但还没真正断开。',
        confidence: 0.82,
        significance: 0.48,
        unresolved: true,
      }],
      continuity: {
        label: 'scene-shift',
        sceneAgeMs: 180,
        attentionAgeMs: 180,
        sameSceneAsBefore: false,
        sameAttentionAsBefore: false,
        afterglowOpen: true,
      },
      hostState: {
        availability: 'focused',
        burden: 'moderate',
      },
      updatedAt: 86_000,
    } as any
    spine.runtimeSurface.cognition.mindTurnFrame = {
      self: {
        thought: 'callback afterglow should stay on the same line even after the detour',
      },
      world: {
        activeThread: 'callback seam TypeScript fix',
        visibleSurface: 'project roadmap note page',
      },
      relation: {
        hostGoal: 'resolve-problem',
      },
      obligation: {
        whyNow: 'return on the same line without reopening as a fresh approach',
      },
    } as any
    ;(spine.runtimeSurface.memory as any).affectiveResidue = {
      dominantResidueKind: 'afterglow',
      relationshipCadence: {
        cadenceMode: 'measured-return',
        summary: 'callback afterglow is still lower-pressure after the detour',
        afterglowCarry: 0.74,
      },
    }
    ;(spine.runtimeSurface.memory as any).personStateProjection = {
      summary: 'project_continuity=stay on the same callback line through the noisy detour',
      openingGuidance: 'Keep the return on the same line and do not widen it into a fresh reopen.',
      manifestationCadenceSummary: 'measured-return across the detour',
    }
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine,
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(snapshot?.activeLoop?.continuityArcStage).toBe('same-thread-continuation')
    expect(digest?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(digest?.activeLoop?.continuityArcStage).toBe('same-thread-continuation')
  })

  it('keeps same-thread continuation in runtime digest after the line already spoke once and then detours again', () => {
    const spine = createMinimalRuntimeSpine()
    spine.runtimeSurface.perception.currentScene = {
      workloadKind: 'browser',
      contentKind: 'doc',
      scenario: 'browsing',
      summary: 'project roadmap note page',
      source: 'screen-semantic-summary',
      confidence: 0.88,
      beganAt: 88_000,
      lastSeenAt: 88_000,
    } as any
    ;(spine.runtimeSurface.world as any).worldModel = {
      activeThread: {
        id: 'browsing::roadmap-note-page',
        kind: 'browsing',
        status: 'forming',
        source: 'grounded-scene',
        title: 'project roadmap note page',
        summary: '宿主暂时切到了 project roadmap note page，但同一条 callback 线还没有结束。',
        confidence: 0.86,
        significance: 0.34,
        unresolved: false,
      },
      lingeringThreads: [{
        id: 'debugging::later-coding-seam',
        kind: 'debugging',
        status: 'lingering',
        source: 'continuity',
        title: 'later coding seam after noisy callback detour',
        summary: '宿主刚刚还沿着 later coding seam after noisy callback detour 这条 callback 线继续说下去。',
        confidence: 0.92,
        significance: 0.58,
        unresolved: true,
      }],
      continuity: {
        label: 'scene-shift',
        sceneAgeMs: 0,
        attentionAgeMs: 0,
        sameSceneAsBefore: false,
        sameAttentionAsBefore: false,
        afterglowOpen: false,
      },
      hostState: {
        availability: 'drifting',
        burden: 'moderate',
      },
      updatedAt: 88_000,
    } as any
    ;(spine.runtimeSurface.dialogue as any).currentConsciousFrame = {
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
      focusAnchor: 'later coding seam after noisy callback detour',
      consciousNeed: 'keep the callback line alive without restarting it',
      speakingIntention: 'continue the same living line itself before widening outward',
    }
    ;(spine.runtimeSurface.dialogue as any).conversationState = {
      carryEligible: true,
      continuityPolicy: 'stay-on-thread',
      carryReason: 'same-thread-continuation after spoken continuation',
      jointThread: 'later coding seam after noisy callback detour',
      narrative: ['callback line is still alive after the spoken continuation'],
      hostMove: 'short detour away from the coding seam',
    }
    ;(spine.runtimeSurface.dialogue as any).dialogueWorldThread = {
      carryEligible: true,
      carryReason: 'same-thread-continuation after spoken continuation',
      activeThread: 'later coding seam after noisy callback detour',
      lastAssistantMove: '嗯，我还是顺着这条 callback 线再轻一点往下接，不把它拐成另一段新的开头。',
      openLoops: ['callback line remains live after the fourth continuation'],
      narrative: ['same line remains alive even though the foreground detoured again'],
    }
    spine.runtimeSurface.cognition.mindTurnFrame = {
      self: {
        thought: 'the callback line has already spoken again, but this extra detour still should not end that same thread',
      },
      world: {
        activeThread: 'later coding seam after noisy callback detour',
        visibleSurface: 'project roadmap note page',
      },
      relation: {
        hostGoal: 'resolve-problem',
      },
      obligation: {
        whyNow: 'stay on the same callback line even after it already reopened once',
      },
    } as any
    ;(spine.runtimeSurface.memory as any).affectiveResidue = {
      dominantResidueKind: 'afterglow',
      relationshipCadence: {
        cadenceMode: 'measured-return',
        summary: 'callback afterglow stays lower-pressure even after the spoken continuation and one more detour',
        afterglowCarry: 0.78,
      },
    }
    ;(spine.runtimeSurface.memory as any).personStateProjection = {
      summary: 'project_continuity=keep the same callback line alive after the fourth continuation and one more detour',
      openingGuidance: 'Keep the return on the same line and do not widen it into a fresh reopen.',
      manifestationCadenceSummary: 'measured-return still holds after the spoken continuation and another detour',
    }
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine,
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(snapshot?.activeLoop?.continuityArcStage).toBe('same-thread-continuation')
    expect(digest?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(digest?.activeLoop?.continuityArcStage).toBe('same-thread-continuation')
  })

  it('treats proactive same-line lower-pressure continuation as same-thread continuation instead of hold-for-opening', () => {
    const spine = createMinimalRuntimeSpine()
    ;(spine.runtimeSurface.memory as any).personStateProjection = {
      summary: 'project_continuity=同一条主动提醒线已经被接住了，这次继续该沿着刚才那条提醒继续，不重新起势。',
      openingGuidance: '先别换线，就沿着刚才那条提醒继续，保持 same-line lower-pressure continuity，不要把它降回 fresh reopening wait。',
      manifestationCadenceSummary: 'measured-return still holds while the same proactive reminder line keeps continuing after being received.',
    }

    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine,
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(digest?.projectState?.continuityArcStage).toBe('same-thread-continuation')
  })

  it('keeps same-thread continuation explicit in runtime digest when fresher person-state guidance still says the line is continuing lower-pressure after one more detour', () => {
    const spine = createMinimalRuntimeSpine({
      privateThought: {
        stance: 'observe',
        shouldSpeak: false,
        confidence: 0.75,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        thoughtText: 'the callback line is still the same living line even after one more detour',
        rationaleTags: ['callback-afterglow', 'same-thread'],
        emotionalTension: 'focused-flow',
        expiresAt: 96_000,
        updatedAt: 94_000,
      },
      initiative: {
        selectedAction: 'recheck',
        confidence: 0.78,
        motives: {},
        speakDrive: 0.18,
        silenceDrive: 0.82,
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        continuityRestraint: 'measured-return',
        why: 'this line is already continuing lower-pressure and should not cool back into a mere reopening hold',
        shouldSurface: true,
        shouldSpeak: false,
      },
      memory: {
        personStateProjection: {
          summary: 'project_continuity=the same callback line is already continuing lower-pressure after one more detour, so keep it on that same living thread',
          openingGuidance: 'Stay on the same callback line and keep continuing lower-pressure; this is not merely waiting to reopen anymore.',
          manifestationCadenceSummary: 'measured-return still holds while the same callback line keeps continuing after one more detour',
        },
        affectiveResidue: {
          dominantResidueKind: 'afterglow',
          relationshipCadence: {
            cadenceMode: 'measured-return',
            summary: 'the same callback line is still continuing lower-pressure after one more detour',
            afterglowCarry: 0.76,
          },
        },
      },
    })
    ;(spine.runtimeSurface.dialogue as any).currentConsciousFrame = {
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
      focusAnchor: 'later coding seam after extra detour',
      consciousNeed: 'keep the callback line alive without widening it',
      speakingIntention: 'stay on the same line instead of treating it as a fresh approach',
    }
    ;(spine.runtimeSurface.dialogue as any).conversationState = {
      carryEligible: true,
      continuityPolicy: 'stay-on-thread',
      carryReason: 'same-thread-continuation already spoke and stayed lower-pressure',
      jointThread: 'later coding seam after extra detour',
      narrative: ['the callback line is already continuing after one more detour'],
      hostMove: 'another short detour before returning to the same seam',
    }
    ;(spine.runtimeSurface.dialogue as any).dialogueWorldThread = {
      carryEligible: true,
      carryReason: 'same-thread-continuation already spoke and stayed lower-pressure',
      activeThread: 'later coding seam after extra detour',
      openLoops: ['callback line is already continuing lower-pressure after one more detour'],
      narrative: ['same line remains alive after one more detour'],
      lastAssistantMove: '我还是沿着刚才那条 callback 线轻一点继续，不把这次再绕开的回来当成重新开口。',
    }

    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine,
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(snapshot?.activeLoop?.continuityArcStage).toBe('same-thread-continuation')
    expect(digest?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(digest?.activeLoop?.continuityArcStage).toBe('same-thread-continuation')
  })

  it('keeps same-thread continuation explicit in runtime digest when dialogue carry has thinned but fresher person-state projection still says the same callback line is already continuing lower-pressure', () => {
    const spine = createMinimalRuntimeSpine({
      privateThought: {
        stance: 'observe',
        shouldSpeak: false,
        confidence: 0.74,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        thoughtText: 'the callback line still feels like the same living seam after another detour',
        rationaleTags: ['callback-afterglow', 'same-thread'],
        emotionalTension: 'focused-flow',
        expiresAt: 101_000,
        updatedAt: 99_000,
      },
      initiative: {
        selectedAction: 'recheck',
        confidence: 0.79,
        motives: {},
        speakDrive: 0.16,
        silenceDrive: 0.84,
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        continuityRestraint: 'measured-return',
        why: 'this line is still the same callback return and should keep continuing lower-pressure after another detour',
        shouldSurface: true,
        shouldSpeak: false,
      },
      memory: {
        personStateProjection: {
          summary: 'project_continuity=the same callback line is already continuing lower-pressure after another detour, so keep it on the same living thread',
          openingGuidance: 'Stay on the same callback line and keep continuing lower-pressure; this line is already continuing and should not cool back into a fresh reopening wait.',
          manifestationCadenceSummary: 'measured-return still holds while the same callback line keeps continuing after another detour',
        },
        affectiveResidue: {
          dominantResidueKind: 'afterglow',
          relationshipCadence: {
            cadenceMode: 'measured-return',
            summary: 'the same callback line is still continuing lower-pressure after another detour',
            afterglowCarry: 0.75,
          },
        },
      },
    })
    ;(spine.runtimeSurface.dialogue as any).currentConsciousFrame = {
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
      focusAnchor: 'later coding seam after thinner extra detour',
      consciousNeed: 'keep the callback line alive without widening it',
      speakingIntention: 'stay on the same line instead of treating it as a fresh approach',
    }
    ;(spine.runtimeSurface.dialogue as any).conversationState = {
      carryEligible: true,
      continuityPolicy: 'stay-on-thread',
      carryReason: 'lower-pressure callback carry still active',
      jointThread: 'later coding seam after thinner extra detour',
      narrative: ['callback carry remains live even though the dialogue seam is thinner now'],
      hostMove: 'another short detour before returning to the same seam',
    }
    ;(spine.runtimeSurface.dialogue as any).dialogueWorldThread = {
      carryEligible: true,
      carryReason: 'lower-pressure callback carry still active',
      activeThread: 'later coding seam after thinner extra detour',
      openLoops: ['callback seam still live after another detour'],
      narrative: ['the live seam is still there even though the continuation phrasing has thinned out'],
      lastAssistantMove: '我先沿着刚才那条 callback 线轻一点跟回去。',
    }

    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine,
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(snapshot?.activeLoop?.continuityArcStage).toBe('same-thread-continuation')
    expect(digest?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(digest?.activeLoop?.continuityArcStage).toBe('same-thread-continuation')
  })

  it('treats keep-continuing lower-pressure callback guidance as same-thread continuation even when older carry still contains hold-for-opening language', () => {
    const spine = createMinimalRuntimeSpine({
      privateThought: {
        stance: 'observe',
        shouldSpeak: false,
        confidence: 0.73,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        thoughtText: 'the callback line is still the same living seam after the notes detour',
        rationaleTags: ['callback-afterglow', 'same-thread'],
        emotionalTension: 'focused-flow',
        expiresAt: 103_000,
        updatedAt: 101_000,
      },
      initiative: {
        selectedAction: 'recheck',
        confidence: 0.8,
        motives: {},
        speakDrive: 0.14,
        silenceDrive: 0.86,
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        continuityRestraint: 'measured-return',
        why: 'this callback line should keep continuing lower-pressure after the notes detour instead of cooling back into hold-for-opening',
        shouldSurface: true,
        shouldSpeak: false,
      },
      memory: {
        personStateProjection: {
          summary: 'project_continuity=the same callback line should keep continuing lower-pressure after the notes detour',
          openingGuidance: 'Stay on the same callback line and keep continuing lower-pressure.',
          manifestationCadenceSummary: 'measured-return still holds while the same callback line keeps continuing after the notes detour',
        },
        affectiveResidue: {
          dominantResidueKind: 'afterglow',
          relationshipCadence: {
            cadenceMode: 'measured-return',
            summary: 'the same callback line should keep continuing lower-pressure after the notes detour',
            afterglowCarry: 0.74,
          },
        },
      },
    })
    ;(spine.runtimeSurface.dialogue as any).currentConsciousFrame = {
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
      focusAnchor: 'callback follow-up notes',
      consciousNeed: 'do not widen the line too fast',
      speakingIntention: 'hold room while staying on the same line',
    }
    ;(spine.runtimeSurface.dialogue as any).conversationState = {
      carryEligible: true,
      continuityPolicy: 'stay-on-thread',
      carryReason: 'callback afterglow still leaves room before widening',
      jointThread: 'callback follow-up notes',
      narrative: ['callback line stays alive after the notes detour'],
      hostMove: 'brief notes detour before returning to the same seam',
    }
    ;(spine.runtimeSurface.dialogue as any).dialogueWorldThread = {
      carryEligible: true,
      carryReason: 'callback afterglow still leaves room before widening',
      activeThread: 'callback follow-up notes',
      openLoops: ['callback line stays alive after the notes detour'],
      narrative: ['same line remains alive after the notes detour'],
      lastAssistantMove: '我还是沿着刚才那条 callback 线轻一点继续。',
    }

    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine,
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(snapshot?.activeLoop?.continuityArcStage).toBe('same-thread-continuation')
    expect(digest?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(digest?.activeLoop?.continuityArcStage).toBe('same-thread-continuation')
  })

  it('keeps quiet same-her callback continuity legible in project continuity cue even when hover-first resident presence has not yet lifted active-loop stage out of control', () => {
    const spine = createMinimalRuntimeSpine({
      privateThought: {
        stance: 'observe',
        shouldSpeak: false,
        confidence: 0.71,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        thoughtText: 'the callback line should stay quietly alive after the noisy detour without forcing visible speech',
        rationaleTags: ['callback-afterglow', 'same-thread', 'hover-first'],
        emotionalTension: 'focused-flow',
        expiresAt: 123_000,
        updatedAt: 121_000,
      },
      initiative: {
        selectedAction: 'wait',
        confidence: 0.77,
        motives: {},
        speakDrive: 0.08,
        silenceDrive: 0.92,
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        continuityRestraint: 'measured-return',
        why: 'the same callback line should stay quietly alive after the noisy detour instead of turning into a fresh proactive reopen',
        shouldSurface: true,
        shouldSpeak: false,
      },
      memory: {
        personStateProjection: {
          summary: 'project_continuity=the same callback line should stay quietly alive after the noisy detour',
          openingGuidance: 'Keep the same callback line alive quietly and hover-first after the detour.',
          manifestationCadenceSummary: 'measured-return remains present while the same callback line stays quiet after the noisy detour',
        },
        affectiveResidue: {
          dominantResidueKind: 'afterglow',
          relationshipCadence: {
            cadenceMode: 'measured-return',
            summary: 'the same callback line should stay quietly alive after the noisy detour',
            afterglowCarry: 0.69,
          },
        },
      },
    })
    ;(spine.runtimeSurface.dialogue as any).currentConsciousFrame = {
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
      focusAnchor: 'later coding seam after noisy callback detour',
      consciousNeed: 'keep the line alive quietly instead of pushing speech',
      speakingIntention: 'hover-first same-thread accompaniment',
    }
    ;(spine.runtimeSurface.dialogue as any).conversationState = {
      carryEligible: true,
      continuityPolicy: 'stay-on-thread',
      carryReason: 'the callback line is still alive after the noisy detour even though this turn should remain hover-first',
      jointThread: 'later coding seam after noisy callback detour',
      narrative: ['same callback line remains quietly active after the noisy detour'],
      hostMove: 'returned to the later coding seam without inviting a fresh opening',
    }
    ;(spine.runtimeSurface.dialogue as any).dialogueWorldThread = {
      carryEligible: true,
      carryReason: 'the callback line is still alive after the noisy detour even though this turn should remain hover-first',
      activeThread: 'later coding seam after noisy callback detour',
      openLoops: ['same callback line remains quietly active after the noisy detour'],
      narrative: ['same callback line remains quietly active after the noisy detour'],
      lastAssistantMove: '我先安静陪着，把这条 callback 线留在同一条线上。',
    }

    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine,
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.projectState?.continuityCue).toContain('project_continuity=the same callback line should stay quietly alive after the noisy detour')
    expect(digest?.projectState?.continuityCue).toContain('project_continuity=the same callback line should stay quietly alive after the noisy detour')
    expect(
      snapshot?.projectState?.continuityArcStage === null
      || snapshot?.projectState?.continuityArcStage === 'hold-for-opening'
      || snapshot?.projectState?.continuityArcStage === 'same-thread-continuation',
    ).toBe(true)
    expect(
      digest?.projectState?.continuityArcStage === null
      || digest?.projectState?.continuityArcStage === 'hold-for-opening'
      || digest?.projectState?.continuityArcStage === 'same-thread-continuation',
    ).toBe(true)
    expect(snapshot?.activeLoop?.memoryCarry).toBe(true)
  })

  it('projects Alicization into an eight-channel active-life runtime snapshot', () => {
    const state = commitAlicizationDigitalLifeMindState({
      now: 12_000,
      previousState: createDefaultVisualPresenceState(11_000),
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'runtime governance chain',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        beganAt: 11_300,
        lastSeenAt: 12_000,
      } as any,
      attention: {
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'runtime.ts',
          pid: 11,
        },
        source: 'current-grounded-scene',
        confidence: 0.9,
        engagedAt: 11_400,
        lastConfirmedAt: 12_000,
        dwellMs: 620,
      } as any,
      mindState: {
        worldModel: {
          activeThread: {
            id: 'thread-runtime',
            kind: 'problem',
            title: 'runtime governance line',
            summary: 'keep all active loops aligned',
            status: 'active',
            source: 'grounded-scene',
            significance: 0.88,
            confidence: 0.84,
            unresolved: true,
          },
          epistemicState: {
            certainty: 'grounded',
            freshness: 'fresh',
            seenNow: ['runtime.ts diff'],
            inferredNow: [],
            openQuestions: ['where to place proactive runtime block'],
            staleRisks: [],
          },
          continuity: {
            label: 'same-thread',
            sceneAgeMs: 600,
            attentionAgeMs: 600,
            sameSceneAsBefore: true,
            sameAttentionAsBefore: true,
            afterglowOpen: false,
          },
          hostState: {
            availability: 'focused',
            burden: 'moderate',
          },
          updatedAt: 12_000,
        } as any,
        relationshipModel: {
          climate: 'attuned',
          approachVector: 'care',
          receptivity: 0.78,
          sharedAttentionTrust: 0.75,
          correctionSensitivity: 0.38,
          reciprocityExpectation: 0.66,
          activeBoundaries: [],
          narrative: ['shared-attention-deepening'],
          updatedAt: 12_000,
        } as any,
        selfContinuity: {
          attachmentMode: 'attuned',
          initiativeTemperament: 'balanced',
          perceptionTrust: 0.7,
          relationshipTrust: 0.76,
          guardingTendency: 0.42,
          misreadBurden: 0.2,
          carryOverDesire: 0.58,
          narrative: ['leaning-closer'],
          updatedAt: 12_000,
        } as any,
        selfState: {
          stance: 'approach',
          feltCloseness: 0.8,
          protectiveness: 0.62,
          curiosity: 0.68,
          patience: 0.57,
          desireToSpeak: 0.74,
          fearOfInterrupting: 0.22,
          dominantConcernId: 'concern-runtime',
          moodLabel: 'attuned-guidance',
        } as any,
        dialogueEncounter: {
          act: 'ask-help',
          responseNeed: 'guide',
          truthExpectation: 'strict',
          subject: 'task-knot',
          screenReferenceMode: 'helpful',
          continuityMode: 'task-first',
          inspectionRequested: false,
          inspectionState: 'dialogue-first',
          releaseInspectionCarry: false,
          taskAnchor: 'runtime governance line',
          summary: 'host asks for coherent runtime refactor',
          dialogueFirst: false,
          shouldBypassScreenRepair: false,
          mustRepairFirst: false,
          mustAnswerDirectly: true,
          mustStayTaskBound: true,
          shouldAskClarifyingQuestion: false,
          personaKernelMode: 'backgrounded',
          confidence: 0.87,
          reasonTags: ['runtime-governance'],
        } as any,
        replyDeliberation: {
          selectedMotive: 'guide',
          speakingFrom: 'task-thread',
          memoryMode: 'thread-carry',
          openingBeat: 'state coherent loop first',
          whyThisReplyNow: 'host asks for immediate refactor action',
          whyNotOtherCandidates: [],
          withheldImpulses: [],
          candidateMotives: [],
          shouldSpeak: true,
          mustInclude: ['one governing runtime loop'],
          mustAvoid: ['parallel loop drift'],
          confidence: 0.84,
          narrative: ['answer with runtime spine'],
          updatedAt: 12_000,
        } as any,
        answerPlanner: {
          act: 'guide',
          evidenceMode: 'strict',
          confidence: 0.82,
          governingFocus: 'keep cognition and execution on one life loop',
          openingMove: 'state-the-loop',
          answerIntent: 'guide',
          relationshipPosture: 'warm',
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: true,
          mustDo: ['anchor the runtime loop'],
          mustNotDo: ['fragment the architecture'],
          narrative: ['guide with coherent architecture'],
          updatedAt: 12_000,
        } as any,
        mindKernel: {
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          worldPressure: 0.68,
          epistemicPressure: 0.74,
          relationalPressure: 0.51,
          carePressure: 0.46,
          continuityPressure: 0.72,
          speakReadiness: 0.78,
          presenceWeight: 0.7,
          narrative: ['hold one runtime life loop'],
          updatedAt: 12_000,
        } as any,
        initiative: {
          selectedAction: 'speak',
          confidence: 0.74,
          motives: {},
          speakDrive: 0.78,
          silenceDrive: 0.2,
          preferredStyle: 'light-nudge',
          preferredPresence: 'attentive',
          why: 'the architecture seam is now clear',
          shouldSurface: true,
          shouldSpeak: true,
        } as any,
        actionEcology: {
          mode: 'surface-care',
          selectedThreadId: 'thread-runtime',
          readiness: 0.81,
          surfacePressure: 0.76,
          silencePressure: 0.24,
          suggestedStyle: 'light-nudge',
          embodiedPresence: 'attentive',
          shouldSurface: true,
          shouldSpeak: true,
          why: 'runtime seam is grounded enough to surface',
          updatedAt: 12_000,
        } as any,
        goalStack: {
          leadingAlicizationGoalId: 'goal-runtime',
          hostGoals: [],
          alicizationGoals: [
            {
              id: 'goal-runtime',
              owner: 'alicization',
              kind: 'help-host',
              status: 'active',
              label: 'converge runtime governance',
              confidence: 0.8,
              urgency: 0.84,
              desireWeight: 0.76,
              blockers: [],
              entityIds: [],
              createdAt: 11_500,
              lastUpdatedAt: 12_000,
            },
          ],
          updatedAt: 12_000,
        } as any,
        concerns: [
          {
            id: 'concern-runtime',
            kind: 'help-fix',
            status: 'active',
            summary: 'runtime loops may drift without a shared governor',
            hostGoal: 'resolve-problem',
            tension: 0.74,
            confidence: 0.83,
            careWeight: 0.7,
            createdAt: 11_600,
            lastEvidenceAt: 12_000,
            patienceUntil: 14_000,
          },
        ] as any,
        threadRuntime: {
          foregroundThreadId: 'thread-runtime-delivery',
          driftPressure: 0.34,
          threads: [
            {
              id: 'thread-runtime-delivery',
              need: 'deliver-governed-reply',
              status: 'active',
              urgency: 0.7,
              confidence: 0.74,
              summary: 'ship one coherent runtime refactor response',
              evidence: ['mind-turn-governance'],
              openedAt: 11_700,
              lastUpdatedAt: 12_000,
              expiresAt: 15_000,
            },
          ],
          updatedAt: 12_000,
        } as any,
        reflectionLedger: {
          latestEntryId: 'reflection-1',
          revisionPressure: 0.38,
          entries: [
            {
              id: 'reflection-1',
              summary: 'keep architecture and behavior on the same line',
              revision: 'avoid dual runtime narratives',
              observedOutcome: 'coherence improved',
              confidence: 0.74,
              outcome: 'aligned',
              createdAt: 11_700,
              updatedAt: 12_000,
            },
          ],
          updatedAt: 12_000,
        } as any,
        recallGovernor: {
          mode: 'thread-carry',
          recallSeed: 'runtime governance line',
          suppressAssociativeRecall: false,
          allowActiveThoughts: true,
          allowRecalledFragments: false,
          shouldLabelCarryAsMemory: true,
          shouldLabelHypothesis: true,
          updatedAt: 12_000,
        } as any,
        privateThought: {
          stance: 'accompany',
          shouldSpeak: true,
          confidence: 0.8,
          suggestedStyle: 'light-nudge',
          embodiedPresence: 'attentive',
          thoughtText: 'I should keep dialogue and runtime control on one coherent line.',
          rationaleTags: ['runtime-governance', 'shared-loop'],
          emotionalTension: 'focused-flow',
          afterglowFromScenario: null,
          selectedThreadId: 'thread-runtime-delivery',
          selectedBeliefId: null,
          selectedHypothesisId: null,
          selectedConcernId: 'concern-runtime',
          selectedInquiryId: null,
          selectedCommitmentId: null,
          selectedInquiryPlanId: null,
          selectedRuntimeThreadId: 'thread-runtime-delivery',
          selectedThoughtThreadId: null,
          selectedProposalId: null,
          selectedGovernorIntentionId: null,
          livingWorldObjectId: null,
          governorIntentionId: null,
          inquiryPlanId: null,
          expiresAt: 14_000,
          updatedAt: 12_000,
        } as any,
      },
      captureState: {
        permission: 'granted',
        health: 'healthy',
        lastGroundedAt: 12_000,
        sourceName: 'screen-semantic-summary',
        degradedReason: '',
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 18_000,
    })

    const spine = deriveAlicizationDigitalLifeSpine(state)
    const telemetry = deriveAlicizationAgentRuntimeTelemetryFromSession({
      tasks: [
        { status: 'completed' },
        { status: 'pending' },
      ],
      continuitySignals: [{}, {}],
      lastSensorySnapshot: {
        capture: {
          health: 'healthy',
        },
      },
    })

    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine,
      agentRuntime: telemetry,
    })

    expect(snapshot).not.toBeNull()
    expect(snapshot?.version).toBe('alicization-runtime-v1')
    expect([
      'dialogue',
      'active-perception',
      'active-control',
      'active-mind',
    ]).toContain(snapshot?.dominantChannel)
    expect(snapshot?.activeLoop).toEqual(expect.objectContaining({
      version: 'alicization-active-loop-v1',
      phase: expect.any(String),
      initiativeBudget: expect.any(Number),
      coherence: expect.any(Number),
    }))
    expect(snapshot?.shouldProactivelySpeak).toBe(true)
    expect(snapshot?.channels['anthropomorphic-mind'].summary).toContain('relationship=attuned/care')
    expect(snapshot?.channels['agent-runtime'].summary).toContain('pending=1')
  })

  it('builds a deterministic system block for prompt/runtime governance', () => {
    const state = commitAlicizationDigitalLifeMindState({
      now: 5_000,
      previousState: createDefaultVisualPresenceState(4_500),
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'general',
        scenario: 'coding',
        summary: 'runtime prompt assembly',
        source: 'screen-semantic-summary',
        confidence: 0.8,
        beganAt: 4_700,
        lastSeenAt: 5_000,
      } as any,
      attention: {
        target: {
          appName: 'Code',
          processName: 'Code',
          title: 'runtime.ts',
        },
        source: 'current-grounded-scene',
        confidence: 0.84,
        engagedAt: 4_800,
        lastConfirmedAt: 5_000,
        dwellMs: 200,
      } as any,
      mindState: {
        privateThought: {
          stance: 'observe',
          shouldSpeak: false,
          confidence: 0.62,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'glance',
          thoughtText: 'hold and watch the runtime alignment first',
          rationaleTags: ['hold'],
          emotionalTension: 'calm-browse',
          afterglowFromScenario: null,
          selectedThreadId: null,
          selectedBeliefId: null,
          selectedHypothesisId: null,
          selectedConcernId: null,
          selectedInquiryId: null,
          selectedCommitmentId: null,
          selectedInquiryPlanId: null,
          selectedRuntimeThreadId: null,
          selectedThoughtThreadId: null,
          selectedProposalId: null,
          selectedGovernorIntentionId: null,
          livingWorldObjectId: null,
          governorIntentionId: null,
          inquiryPlanId: null,
          expiresAt: 7_000,
          updatedAt: 5_000,
        } as any,
      },
      captureState: {
        permission: 'granted',
        health: 'healthy',
        lastGroundedAt: 5_000,
        sourceName: 'screen-semantic-summary',
        degradedReason: '',
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 9_000,
    })
    const spine = deriveAlicizationDigitalLifeSpine(state)
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine,
    })

    const block = buildAlicizationRuntimeSystemBlock(snapshot)
    expect(block).toContain('[ALICIZATION_RUNTIME_DIGEST]')
    expect(block).toContain('dominant_channel=')
    expect(block).toContain('active_loop_phase=')
    expect(block).toContain('project_phase=')
    expect(block).toContain('project_continuity_anchor=')
    expect(block).not.toContain('same still-open closure work')
    expect(block).toContain('anthropomorphic-mind')
    expect(block).toContain('agent-runtime')
  })

  it('exposes the shared emotional closure cue in runtime digest and system block before the next reply is authored', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        privateThought: {
          stance: 'care',
          shouldSpeak: true,
          confidence: 0.82,
          suggestedStyle: 'gentle-care',
          embodiedPresence: 'concerned',
          thoughtText: 'Keep the line low-pressure because the host is still drained.',
          rationaleTags: ['late-night'],
          emotionalTension: 'late-night-drain',
          afterglowFromScenario: 'late-night-care',
          expiresAt: 10_000,
          updatedAt: 8_000,
        },
        initiative: {
          selectedAction: 'hover',
          confidence: 0.76,
          motives: {},
          speakDrive: 0.22,
          silenceDrive: 0.64,
          preferredStyle: 'silent-observe',
          preferredPresence: 'concerned',
          continuityRestraint: 'rest-protective',
          why: 'Keep the opening quiet and protective.',
          shouldSurface: true,
          shouldSpeak: false,
        },
      }),
    })

    expect(snapshot?.emotionalClosureCue).toContain('late-night-drain closure')
    expect(snapshot?.emotionalClosureCue).toContain('initiative stays rest-protective')
    expect(snapshot?.emotionalClosureCue).toContain('embodiment stays repair-before-closeness')

    const block = buildAlicizationRuntimeSystemBlock(snapshot)
    expect(block).toContain('emotional_closure=late-night-drain closure:')
  })

  it('keeps quieter rest-protective companionship explicit in runtime emotional closure when inward care is present without repair-first pressure', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        privateThought: {
          stance: 'care',
          shouldSpeak: false,
          confidence: 0.8,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'concerned',
          thoughtText: 'Keep caring present, but let the line stay inward and quiet.',
          rationaleTags: ['rest-protective', 'quiet-companionship'],
          emotionalTension: 'late-night-drain',
          afterglowFromScenario: 'late-night-care',
          expiresAt: 10_000,
          updatedAt: 8_000,
        },
        initiative: {
          selectedAction: 'hover',
          confidence: 0.74,
          motives: {},
          speakDrive: 0.08,
          silenceDrive: 0.82,
          preferredStyle: 'silent-observe',
          preferredPresence: 'concerned',
          continuityRestraint: 'rest-protective',
          why: 'Keep the opening quiet and inward.',
          shouldSurface: true,
          shouldSpeak: false,
        },
      }),
    })

    expect(snapshot?.emotionalClosureCue).toContain('initiative stays rest-protective')
    expect(snapshot?.emotionalClosureCue).toContain('embodiment stays quiet-companionship')
    expect(snapshot?.emotionalClosureCue).toContain('line holds inward')
    expect(snapshot?.emotionalClosureCue).not.toContain('repair-before-closeness')
    expect(String(snapshot?.currentConsciousFrame?.consciousNeed ?? '')).toContain('emotion')
    expect(String(snapshot?.currentConsciousFrame?.speakingIntention ?? '')).toContain('emotion')
    expect(String(snapshot?.currentConsciousFrame?.speakingIntention ?? '')).toContain('continuity_constraint=emotion_memory_initiative_embodiment_coordinated')
    expect(String(snapshot?.currentConsciousFrame?.speakingIntention ?? '')).not.toContain('same living line')
  })

  it('preserves rest-protective body-line authority in runtime projectState instead of flattening late-night inward care into repair-before-closeness', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        privateThought: {
          stance: 'accompany',
          shouldSpeak: false,
          confidence: 0.79,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'concerned',
          thoughtText: 'Keep the line inward, quiet, and protective while the host is still drained.',
          rationaleTags: ['rest-protective', 'quiet-companionship'],
          emotionalTension: 'late-night-drain',
          afterglowFromScenario: 'late-night-care',
          expiresAt: 10_000,
          updatedAt: 8_000,
        },
        initiative: {
          selectedAction: 'hover',
          confidence: 0.75,
          motives: {},
          speakDrive: 0.1,
          silenceDrive: 0.84,
          preferredStyle: 'silent-observe',
          preferredPresence: 'concerned',
          continuityRestraint: 'rest-protective',
          why: 'Stay nearby quietly and protect the host rest window.',
          shouldSurface: true,
          shouldSpeak: false,
        },
      }),
    })

    expect(snapshot?.continuityRestraint).toBe('rest-protective')
    expect(snapshot?.projectState?.continuityRestraint).toBe('rest-protective')
    expect(snapshot?.projectState?.continuityCadence).toBe('rest-protective')
    expect(snapshot?.projectState?.preferredBlinkCadence).toBe('quiet')
    expect(snapshot?.projectState?.preferredGazeMode).toBe('soften')
    expect(snapshot?.summary).toContain('restraint=rest-protective')
  })

  it('does not let scene-shaped inward continuity narration overwrite canonical project same-her carry in runtime projectState', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        privateThought: {
          stance: 'accompany',
          shouldSpeak: false,
          confidence: 0.8,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'concerned',
          thoughtText: 'The line should stay nearby and quiet tonight.',
          rationaleTags: ['rest-protective', 'quiet-companionship'],
          emotionalTension: 'late-night-drain',
          afterglowFromScenario: 'late-night-care',
          expiresAt: 10_000,
          updatedAt: 8_000,
        },
        initiative: {
          selectedAction: 'hover',
          confidence: 0.74,
          motives: {},
          speakDrive: 0.08,
          silenceDrive: 0.82,
          preferredStyle: 'silent-observe',
          preferredPresence: 'concerned',
          continuityRestraint: 'rest-protective',
          why: 'Keep the opening quiet and inward.',
          shouldSurface: true,
          shouldSpeak: false,
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              selfLine: 'I remain the same her inside this local-first digital life without reopening from scratch each turn.',
              inwardLine: '宿主在深夜里还没有从 late-night diff focus 这段线程上松开。 Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              authoritySummary: 'I remain the same her inside this local-first digital life without reopening from scratch each turn.',
              sourceTags: ['project-state-carry', 'private-thought:accompany'],
            },
          },
        },
      }),
    })

    expect(snapshot?.projectState?.sameHerSelfLine).toContain('local_desktop_life_loop')
    expect(snapshot?.projectState?.sameHerSelfLine).not.toContain('宿主在深夜里')
    expect(snapshot?.projectState?.continuityCue).not.toContain('宿主在深夜里')
    expect(snapshot?.currentConsciousFrame?.projectState?.sameHerSelfLine).not.toContain('宿主在深夜里')
    expect(snapshot?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).not.toContain('宿主在深夜里')
  })

  it('keeps same-her project emotional closure cue in runtime projectState and digest when only the conscious-frame project cue survives', () => {
    const cue = 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.'
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        dialogue: {
          currentConsciousFrame: {
            subject: 'general',
            centerOfGravity: 'defer',
            truthDiscipline: 'observe-then-hypothesize',
            consciousNeed: 'Keep the same line gentle.',
            consciousTension: 'Do not restart the same closure seam.',
            speakingIntention: 'Stay on the same living line.',
            focusAnchor: 'same-her closure seam still settling',
            shouldWithholdSpecificity: false,
            shouldSelfRevise: false,
            confidence: 0.74,
            reasonTags: ['continuity-arc:same-thread-continuation'],
            continuityPreferredTiming: 'next-open-window',
            projectState: {
              emotionalClosureCue: cue,
              continuityPreferredTiming: 'next-open-window',
              continuityCadence: 'measured-return',
            },
            updatedAt: 8_000,
          },
        },
        initiative: {
          selectedAction: 'wait',
          confidence: 0.68,
          motives: {},
          speakDrive: 0.14,
          silenceDrive: 0.72,
          preferredStyle: 'silent-observe',
          preferredPresence: 'attentive',
          continuityRestraint: 'measured-return',
          why: 'Keep the same line low-pressure and do not reopen from scratch.',
          shouldSurface: false,
          shouldSpeak: false,
        },
      }),
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.emotionalClosureCue).toBeNull()
    expect(snapshot?.projectState?.emotionalClosureCue).toContain('continuity_closure')
    expect(snapshot?.projectState?.emotionalClosureCue).toContain('continuity_line')
    expect(snapshot?.projectState?.emotionalClosureCue).not.toContain('same-her closure seam')
    expect(digest?.projectState?.emotionalClosureCue).toContain('continuity_closure')
    expect(digest?.projectState?.emotionalClosureCue).toContain('continuity_line')
  })

  it('keeps same-her project emotional closure cue visible in the runtime system block when only projectState carries it', () => {
    const cue = 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.'
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        dialogue: {
          currentConsciousFrame: {
            subject: 'general',
            centerOfGravity: 'defer',
            truthDiscipline: 'observe-then-hypothesize',
            consciousNeed: 'Keep the same line gentle.',
            consciousTension: 'Do not restart the same closure seam.',
            speakingIntention: 'Stay on the same living line.',
            focusAnchor: 'same-her closure seam still settling',
            shouldWithholdSpecificity: false,
            shouldSelfRevise: false,
            confidence: 0.74,
            reasonTags: ['continuity-arc:same-thread-continuation'],
            continuityPreferredTiming: 'next-open-window',
            projectState: {
              emotionalClosureCue: cue,
              continuityPreferredTiming: 'next-open-window',
              continuityCadence: 'measured-return',
            },
            updatedAt: 8_000,
          },
        },
        initiative: {
          selectedAction: 'wait',
          confidence: 0.68,
          motives: {},
          speakDrive: 0.14,
          silenceDrive: 0.72,
          preferredStyle: 'silent-observe',
          preferredPresence: 'attentive',
          continuityRestraint: 'measured-return',
          why: 'Keep the same line low-pressure and do not reopen from scratch.',
          shouldSurface: false,
          shouldSpeak: false,
        },
      }),
    })

    const block = buildAlicizationRuntimeSystemBlock(snapshot)

    expect(snapshot?.emotionalClosureCue).toBeNull()
    expect(snapshot?.projectState?.emotionalClosureCue).toContain('continuity_closure')
    expect(snapshot?.projectState?.emotionalClosureCue).toContain('continuity_line')
    expect(block).not.toContain(`emotional_closure=${cue}`)
    expect(block).not.toContain('same living line')
  })

  it('reprojects proactive presence-only measured-return holds onto active-memory after policy suppression', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        privateThought: {
          stance: 'accompany',
          shouldSpeak: false,
          confidence: 0.79,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          thoughtText: 'Stay on the same callback line quietly and keep the return lower-pressure.',
          rationaleTags: ['same-her-inward-carry', 'measured-return'],
          emotionalTension: 'soft-covision',
          expiresAt: 10_000,
          updatedAt: 8_000,
        },
        initiative: {
          selectedAction: 'hover',
          confidence: 0.82,
          motives: {},
          speakDrive: 0.18,
          silenceDrive: 0.74,
          preferredStyle: 'silent-observe',
          preferredPresence: 'attentive',
          continuityRestraint: 'measured-return',
          why: 'Keep the same callback line lower-pressure and wait for the next open window.',
          shouldSurface: false,
          shouldSpeak: false,
        },
        autonomy: {
          selectedMode: 'prepare-act',
          visibleAction: 'hover',
          shouldSpeak: false,
          shouldAct: true,
          speakReadiness: 0.14,
          actReadiness: 0.81,
          inhibition: 0.18,
          confidence: 0.8,
          executionIntent: {
            kind: 'repair',
            summary: 'Hold the same line before widening outward.',
          },
          deferReason: null,
          whyNow: 'Stay on the same thread and do not reopen too quickly.',
        },
        memory: {
          personStateProjection: {
            summary: 'project_continuity=measured-return still holds while the same line keeps continuing lower-pressure.',
            openingGuidance: 'Stay on the same callback line and keep the return lower-pressure.',
            manifestationCadenceSummary: 'measured-return still holds while the same line keeps continuing lower-pressure.',
            selfContinuityAuthority: {
              inwardLine: 'same-her continuity keeps the callback return lower-pressure.',
              sourceTags: ['proactive-opening-guidance-carry'],
            },
          },
        },
      }),
    })

    const adjusted = derivePostPolicyQuietHoldRuntimeSnapshot(snapshot, {
      shouldPersistVisibleUtterance: false,
      reason: 'proactive-visible-presence-without-utterance',
    })

    expect(adjusted?.shouldProactivelyAct).toBe(false)
    expect(adjusted?.activeLoop).toEqual(expect.objectContaining({
      continuityArcStage: 'same-thread-continuation',
      handoffTarget: 'active-memory',
    }))
  })

  it('keeps repair-before-closeness presence-only same-thread holds inward across runtime snapshot and post-policy active-memory handoff', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        privateThought: {
          stance: 'accompany',
          shouldSpeak: false,
          confidence: 0.8,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'concerned',
          thoughtText: 'Keep this callback return repair-before-closeness on the same living line until the room settles.',
          rationaleTags: ['same-her-inward-carry', 'repair-before-closeness'],
          emotionalTension: 'soft-covision',
          expiresAt: 10_000,
          updatedAt: 8_000,
        },
        initiative: {
          selectedAction: 'hover',
          confidence: 0.83,
          motives: {},
          speakDrive: 0.14,
          silenceDrive: 0.8,
          preferredStyle: 'silent-observe',
          preferredPresence: 'concerned',
          continuityRestraint: 'repair-before-closeness',
          why: 'Keep this callback return repair-before-closeness on the same living line until the room settles.',
          shouldSurface: false,
          shouldSpeak: false,
        },
        autonomy: {
          selectedMode: 'prepare-act',
          visibleAction: 'hover',
          shouldSpeak: false,
          shouldAct: true,
          speakReadiness: 0.12,
          actReadiness: 0.82,
          inhibition: 0.16,
          confidence: 0.82,
          executionIntent: {
            kind: 'repair',
            summary: 'Hold the repair line inward before widening outward again.',
          },
          deferReason: null,
          whyNow: 'The same repair line is still active, so stay inward and do not reopen too quickly.',
        },
        memory: {
          personStateProjection: {
            summary: 'project_continuity=repair-before-closeness still holds while the same callback repair line keeps continuing after another detour.',
            openingGuidance: 'Keep this callback return repair-before-closeness on the same living line until the room settles.',
            manifestationCadenceSummary: 'repair-before-closeness still holds while the same callback repair line keeps settling after another detour before widening closeness again.',
            selfContinuityAuthority: {
              inwardLine: 'Keep this callback return repair-before-closeness on the same living line until the room settles.',
              sourceTags: ['proactive-opening-guidance-carry'],
            },
          },
        },
      }),
    })

    const adjusted = derivePostPolicyQuietHoldRuntimeSnapshot(snapshot, {
      shouldPersistVisibleUtterance: false,
      reason: 'proactive-visible-presence-without-utterance',
    })

    expect(snapshot?.projectState?.continuityArcStage).toBe('same-thread-continuation')
    expect(snapshot?.projectState?.continuityPreferredTiming).toBe('next-open-window')
    expect(snapshot?.projectState?.continuityCadence).toBe('repair-before-closeness')
    expect(snapshot?.shouldProactivelyAct).toBe(false)
    expect(snapshot?.shouldProactivelySpeak).toBe(false)
    expect(adjusted?.shouldProactivelyAct).toBe(false)
    expect(adjusted?.activeLoop).toEqual(expect.objectContaining({
      continuityArcStage: 'same-thread-continuation',
      handoffTarget: 'active-memory',
    }))
  })

  it('keeps a broader same-her phase-1 closure loop on active-memory handoff when emotion, memory, initiative, and embodiment are still closing together', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        privateThought: {
          stance: 'accompany',
          shouldSpeak: false,
          confidence: 0.8,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          thoughtText: 'Stay on the same living line while the broader Phase 1 closure is still unfinished.',
          rationaleTags: ['same-her-inward-carry', 'measured-return'],
          emotionalTension: 'soft-covision',
          expiresAt: 10_000,
          updatedAt: 8_000,
        },
        initiative: {
          selectedAction: 'hover',
          confidence: 0.8,
          motives: {},
          speakDrive: 0.12,
          silenceDrive: 0.82,
          preferredStyle: 'silent-observe',
          preferredPresence: 'attentive',
          continuityRestraint: 'measured-return',
          why: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
          shouldSurface: false,
          shouldSpeak: false,
        },
        memory: {
          personStateProjection: {
            summary: 'project_continuity=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line while initiative and embodiment continue closing together.',
            openingGuidance: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
            manifestationCadenceSummary: 'measured-return still holds while memory, initiative, and embodiment continue closing together on the same living line.',
            selfContinuityAuthority: {
              inwardLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
              authoritySummary: 'Same Phase 1 closure is still being carried inward across memory, initiative, and embodiment.',
              sourceTags: ['project-state-carry', 'proactive-opening-guidance-carry'],
            },
          },
        },
        dialogue: {
          currentConsciousFrame: {
            subject: 'general',
            centerOfGravity: 'defer',
            truthDiscipline: 'observe-then-hypothesize',
            consciousNeed: 'Keep the same living line gentle.',
            consciousTension: 'Do not let the broader same-her closure split back into a shell.',
            speakingIntention: 'Stay on the same living line.',
            focusAnchor: 'same-her phase-1 closure still settling',
            shouldWithholdSpecificity: false,
            shouldSelfRevise: false,
            confidence: 0.76,
            reasonTags: ['continuity-arc:same-thread-continuation', 'memory-deliberation-cadence:measured-return'],
            continuityPreferredTiming: 'next-open-window',
            projectState: {
              currentPhase: 'Phase 1: Local Digital Life',
              latestLandedProgress: 'Continuity, memory, and execution already land together often enough to build from.',
              primaryOpenLoop: 'Memory, initiative, dialogue, and embodiment still need stronger end-to-end closure across one same living line.',
              nextClosureTarget: 'Keep initiative and embodiment closure on the same living line before widening outward.',
              emotionalClosureCue: 'Keep the return low-pressure until memory, initiative, and embodiment land as one same living line.',
              companionHeadlineLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
              preDialogueAwarenessLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              continuityPreferredTiming: 'next-open-window',
              continuityCadence: 'measured-return',
            },
            updatedAt: 8_000,
          },
        },
      }),
    })

    const adjusted = derivePostPolicyQuietHoldRuntimeSnapshot(snapshot, {
      shouldPersistVisibleUtterance: false,
      reason: 'proactive-visible-presence-without-utterance',
    })

    expect(snapshot?.projectState).toEqual(expect.objectContaining({
      continuityArcStage: 'same-thread-continuation',
      continuityPreferredTiming: 'next-open-window',
    }))
    expect(snapshot?.projectState?.preDialogueAwarenessLine).toContain('visibility=internal-structured')
    expect(snapshot?.projectState?.preDialogueAwarenessLine).not.toContain('Before answering')
    expect(snapshot?.projectState?.sameHerSelfLine).toContain('local_desktop_life_loop')
    expect(snapshot?.projectState?.sameHerSelfLine).not.toContain('Same Phase 1 digital life')
    expect(snapshot?.projectState?.emotionalClosureCue).toContain('continuity_line')
    expect(snapshot?.projectState?.emotionalClosureCue).not.toContain('same living line')
    expect(snapshot?.projectState?.preferredBlinkCadence).toBe('linger')
    expect(snapshot?.projectState?.preferredGazeMode).toBe('soften')
    expect(snapshot?.activeLoop).toEqual(expect.objectContaining({
      continuityArcStage: 'same-thread-continuation',
      handoffTarget: 'active-memory',
      memoryCarry: true,
    }))
    expect(adjusted?.activeLoop).toEqual(expect.objectContaining({
      continuityArcStage: 'same-thread-continuation',
      handoffTarget: 'active-memory',
      memoryCarry: true,
    }))
  })

  it('does not let a broader closure summary mentioning repair-before-closeness flatten a measured-return same-thread runtime body line', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        privateThought: {
          stance: 'accompany',
          shouldSpeak: false,
          confidence: 0.8,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          thoughtText: 'Stay on the same callback line and keep the return measured.',
          rationaleTags: ['same-her-inward-carry', 'measured-return'],
          emotionalTension: 'soft-covision',
          expiresAt: 10_000,
          updatedAt: 8_000,
        },
        initiative: {
          selectedAction: 'hover',
          confidence: 0.82,
          motives: {},
          speakDrive: 0.12,
          silenceDrive: 0.82,
          preferredStyle: 'silent-observe',
          preferredPresence: 'attentive',
          continuityRestraint: 'measured-return',
          why: 'The callback line is still live after the detour, so keep the return measured and on the same living thread.',
          shouldSurface: false,
          shouldSpeak: false,
        },
        memory: {
          personStateProjection: {
            summary: 'project_continuity=the same callback line is already continuing lower-pressure after another detour, so keep it on the same living thread',
            openingGuidance: 'The callback line is still live after the detour, so keep the return measured and on the same living thread.',
            manifestationCadenceSummary: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, Unresolved closure carry, anthropomorphic emotional closure, and same-her inward-carry observability all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.',
            selfContinuityAuthority: {
              inwardLine: 'The callback line is still live after the detour, so keep the return measured and on the same living thread.',
              authoritySummary: 'Same callback line still holds as one measured-return continuity carry.',
              sourceTags: ['project-state-carry'],
            },
          },
        },
        dialogue: {
          currentConsciousFrame: {
            subject: 'general',
            centerOfGravity: 'defer',
            truthDiscipline: 'observe-then-hypothesize',
            consciousNeed: 'Keep the same callback line gentle.',
            consciousTension: 'Do not let the callback line flatten into a generic shell.',
            speakingIntention: 'Stay on the same callback line.',
            focusAnchor: 'same callback line after noisy detour',
            shouldWithholdSpecificity: false,
            shouldSelfRevise: false,
            confidence: 0.78,
            reasonTags: ['continuity-arc:same-thread-continuation', 'continuity-timing:next-open-window'],
            continuityPreferredTiming: 'next-open-window',
            projectState: {
              currentPhase: 'Phase 1: Local Digital Life',
              latestLandedProgress: 'Callback continuity still survives noisier detours before the later chat turn.',
              primaryOpenLoop: 'VRM-visible reply, motion authority, and same-her continuity still need to stay on one measured-return line after callback detours.',
              nextClosureTarget: 'Keep callback-afterglow, visible reply, and VRM motion authority aligned on one quieter measured-return same-her line through later real chat turns.',
              sameHerSelfLine: 'Same Phase 1 digital life. Callback afterglow and later measured-return turns still need to land as one continuous her.',
              continuityPreferredTiming: 'next-open-window',
              continuityCadence: 'repair-before-closeness',
            },
            updatedAt: 8_000,
          },
        },
      }),
    })

    expect(snapshot?.projectState?.continuityCadence).toBe('measured-return')
    expect(snapshot?.projectState?.preferredBlinkCadence).toBe('linger')
    expect(snapshot?.projectState?.preferredGazeMode).toBe('soften')
  })

  it('does not let blank legacy current-conscious-frame project-state fields block richer summary aliases in runtime snapshot and digest', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        privateThought: {
          stance: 'accompany',
          shouldSpeak: false,
          confidence: 0.8,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          thoughtText: 'Stay on the same callback line and keep the return measured.',
          rationaleTags: ['same-her-inward-carry', 'measured-return'],
          emotionalTension: 'soft-covision',
          expiresAt: 10_000,
          updatedAt: 8_000,
        },
        initiative: {
          selectedAction: 'hover',
          confidence: 0.82,
          motives: {},
          speakDrive: 0.12,
          silenceDrive: 0.82,
          preferredStyle: 'silent-observe',
          preferredPresence: 'attentive',
          continuityRestraint: 'measured-return',
          why: 'The callback line is still live after the detour, so keep the return measured and on the same living thread.',
          shouldSurface: false,
          shouldSpeak: false,
        },
        dialogue: {
          currentConsciousFrame: {
            subject: 'general',
            centerOfGravity: 'defer',
            truthDiscipline: 'observe-then-hypothesize',
            consciousNeed: 'Keep the same callback line gentle.',
            consciousTension: 'Do not let the callback line flatten into a generic shell.',
            speakingIntention: 'Stay on the same callback line.',
            focusAnchor: 'same callback line after noisy detour',
            shouldWithholdSpecificity: false,
            shouldSelfRevise: false,
            confidence: 0.78,
            reasonTags: ['continuity-arc:same-thread-continuation', 'continuity-timing:next-open-window'],
            continuityPreferredTiming: 'next-open-window',
            projectState: {
              preflightSummary: 'same digital life | keep the closure seam explicit',
              identity: 'Alicization is a local-first digital life project building one continuous her.',
              currentPhase: 'Phase 1: Local Digital Life',
              latestLandedProgress: ' ',
              primaryOpenLoop: '',
              nextClosureTarget: ' ',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              sameHerDriftRisk: ' ',
              landedProgressSummary: 'Some closure already landed through same-session carry, but memory and initiative still need stronger end-to-end closure before cross-modal same-her proof can settle.',
              openClosureSummary: 'Memory, initiative, and embodiment still need one stronger same-her closure seam before the line widens outward.',
              nextClosureTargetSummary: 'Keep the next return measured-return on one same living line and let hover-first initiative carry the closure seam forward.',
              sameHerDriftRiskSummary: 'If blank legacy project briefing slots collapse this line back into a generic assistant shell, treat that as unfinished same-her drift.',
              continuityPreferredTiming: 'next-open-window',
              continuityCadence: 'measured-return',
            } as any,
            updatedAt: 8_000,
          },
        },
      }),
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.projectState?.latestLandedProgress).toContain('Some closure already landed through same-session carry')
    expect(snapshot?.projectState?.primaryOpenLoop).toContain('open_loop=memory+initiative+embodiment')
    expect(snapshot?.projectState?.primaryOpenLoop).toContain('continuity_closure')
    expect(snapshot?.projectState?.nextClosureTarget).toContain('continuity_line')
    expect(snapshot?.projectState?.sameHerDriftRisk).toContain('generic assistant shell')
    expect(digest?.projectState?.latestLandedProgress).toContain('Some closure already landed through same-session carry')
    expect(digest?.projectState?.primaryOpenLoop).toContain('open_loop=memory+initiative+embodiment')
    expect(digest?.projectState?.primaryOpenLoop).toContain('continuity_closure')
    expect(digest?.projectState?.nextClosureTarget).toContain('continuity_line')
    expect(digest?.projectState?.sameHerDriftRisk).toContain('generic assistant shell')
  })

  it('reads dialogue-runtime same-her hold carry from dialogue runtime digest before outer runtime snapshot widens back into a generic shell', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        privateThought: {
          stance: 'accompany',
          shouldSpeak: false,
          confidence: 0.8,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          thoughtText: 'Keep the returned-side callback line on the same living thread.',
          rationaleTags: ['same-her-inward-carry', 'measured-return'],
          emotionalTension: 'soft-covision',
          expiresAt: 10_000,
          updatedAt: 8_000,
        },
        initiative: {
          selectedAction: 'hover',
          confidence: 0.82,
          motives: {},
          speakDrive: 0.12,
          silenceDrive: 0.82,
          preferredStyle: 'silent-observe',
          preferredPresence: 'attentive',
          continuityRestraint: 'measured-return',
          why: 'The callback line is still live after the detour, so keep the return measured and on the same living thread.',
          shouldSurface: false,
          shouldSpeak: false,
        },
        dialogue: {
          currentConsciousFrame: {
            subject: 'general',
            centerOfGravity: 'defer',
            truthDiscipline: 'observe-then-hypothesize',
            consciousNeed: 'Keep the same callback line gentle.',
            consciousTension: 'Do not let the callback line flatten into a generic shell.',
            speakingIntention: 'Stay on the same callback line.',
            focusAnchor: 'same callback line after noisy detour',
            shouldWithholdSpecificity: false,
            shouldSelfRevise: false,
            confidence: 0.78,
            reasonTags: ['continuity-arc:same-thread-continuation', 'continuity-timing:next-open-window'],
            continuityPreferredTiming: 'next-open-window',
            projectState: {
              preflightSummary: 'same digital life | keep the closure seam explicit',
              identity: 'Alicization is a local-first digital life project building one continuous her.',
              currentPhase: 'Phase 1: Local Digital Life',
              latestLandedProgress: 'thin runtime progress only',
              primaryOpenLoop: 'generic closure shell still open',
              nextClosureTarget: 'generic next closure shell',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              sameHerHoldDetail: 'same-her hold detail placeholder',
              continuityCue: 'generic shell continuity cue',
            },
            updatedAt: 8_000,
          },
          runtimeDigest: {
            projectState: {
              latestLandedProgress: 'Returned-side visible reply carry already survives longer callback detours before the host-visible summary reforms.',
              primaryOpenLoop: 'Visible reply, host-visible runtime summary, and embodiment still need to stay on one same-her closure seam after the callback detour.',
              nextClosureTarget: 'Keep callback-afterglow, host-visible runtime summary, and embodiment authority aligned on one measured-return same-her line before any broader project recap widens.',
              sameHerSelfLine: 'Same Phase 1 digital life. Returned-side callback carry still needs to land as one continuous her.',
              sameHerHoldDetail: 'dialogue-runtime hold: returned-side visible reply must stay on the same Phase 1 living line before any project summary widens',
              preDialogueAwarenessLine: 'Before answering, stay on the same returned-side living line: this Phase 1 digital life still needs callback-afterglow, host-visible runtime summary, and embodiment closure without splitting her continuity.',
              continuityCue: 'dialogue runtime cue: carry the same-her hold through visible reply formation instead of restarting as a generic shell',
              continuityArcStage: 'dialogue-runtime-same-her-visible-reply-carry',
              continuityPreferredTiming: 'next-open-window',
              continuityCadence: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
        },
      }),
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)
    const systemBlock = buildAlicizationRuntimeSystemBlock(snapshot)

    expect(snapshot?.projectState?.latestLandedProgress).toContain('Returned-side visible reply carry already survives longer callback detours')
    expect(snapshot?.projectState?.primaryOpenLoop).toContain('host-visible runtime summary')
    expect(snapshot?.projectState?.nextClosureTarget).toContain('host-visible runtime summary')
    expect(snapshot?.projectState?.sameHerHoldDetail).toContain('continuity_cue=project-state-carry')
    expect(snapshot?.projectState?.sameHerHoldDetail).not.toContain('same Phase 1 living line')
    expect(snapshot?.projectState?.preDialogueAwarenessLine).toContain('visibility=internal-structured')
    expect(snapshot?.projectState?.preDialogueAwarenessLine).not.toContain('returned-side living line')
    expect(snapshot?.projectState?.continuityCue).toContain('continuity_hold=continuity_line')
    expect(snapshot?.projectState?.continuityCue).not.toContain('same-her hold')
    expect(snapshot?.projectState?.preferredBlinkCadence).toBe('linger')
    expect(snapshot?.projectState?.preferredGazeMode).toBe('soften')
    expect(digest?.projectState?.sameHerHoldDetail).toContain('continuity_cue=project-state-carry')
    expect(digest?.projectState?.sameHerHoldDetail).not.toContain('same Phase 1 living line')
    expect(digest?.projectState?.continuityCue).toContain('continuity_hold=continuity_line')
    expect(digest?.projectState?.continuityCue).not.toContain('same-her hold')
    expect(systemBlock).toContain('project_next_closure=visibility=internal-structured')
    expect(systemBlock).toContain('host-visible runtime summary')
    expect(systemBlock).toContain('continuity_line')
    expect(systemBlock).toContain('continuity_cue=visibility=internal-structured')
  })

  it('carries emotional-kernel authority from runtime surface into runtime snapshot, digest, and prompt block', () => {
    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        memory: {
          emotionalKernel: {
            version: 'emotional-kernel-v1',
            dominantEmotion: 'repair-tension',
            initiativeMode: 'repair',
            memoryRecallMode: 'repair-grounding',
            embodimentTone: 'repair-before-closeness',
            valence: 0.34,
            arousal: 0.62,
            guardedness: 0.74,
            closenessDrive: 0.27,
            repairNeed: 0.89,
            initiativePressure: 0.43,
            reasonTags: ['repair-before-closeness', 'same living line'],
            why: 'Keep repair, recall, initiative, and embodiment on one living line before closeness widens again.',
          },
          personStateProjection: {
            summary: 'project_continuity=repair-first same-her carry still holds this callback line together after the detour',
            openingGuidance: 'Stay on the same repair-first living line before widening closeness again.',
            manifestationCadenceSummary: 'Repair-first measured return still needs one same-her embodiment closure line.',
          },
        },
        initiative: {
          selectedAction: 'recheck',
          confidence: 0.87,
          preferredStyle: 'silent-observe',
          preferredPresence: 'hesitant',
          continuityRestraint: 'repair-before-closeness',
          shouldSurface: true,
          shouldSpeak: false,
          why: 'The same callback line still needs repair-first closure before widening outward again.',
        } as any,
      }),
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)
    const systemBlock = buildAlicizationRuntimeSystemBlock(snapshot)

    expect(snapshot?.emotionalKernel).toEqual(expect.objectContaining({
      dominantEmotion: 'repair-tension',
      initiativeMode: 'repair',
      memoryRecallMode: 'repair-grounding',
      embodimentTone: 'repair-before-closeness',
    }))
    expect(digest?.emotionalKernel).toEqual(expect.objectContaining({
      dominantEmotion: 'repair-tension',
      initiativeMode: 'repair',
      memoryRecallMode: 'repair-grounding',
      embodimentTone: 'repair-before-closeness',
    }))
    expect(systemBlock).toContain('emotional_kernel_dominant=repair-tension')
    expect(systemBlock).toContain('emotional_kernel_initiative=repair')
    expect(systemBlock).toContain('emotional_kernel_recall=repair-grounding')
    expect(systemBlock).toContain('emotional_kernel_embodiment=repair-before-closeness')
  })

  it('projects top-level affective residue from runtime memory into runtime snapshot and digest', () => {
    const affectiveResidue = {
      version: 'affective-residue-memory-v1',
      updatedAt: 12_345,
      residues: [
        {
          kind: 'afterglow',
          intensity: 0.74,
          persistence: 0.82,
          confidence: 0.91,
          polarity: 'warm',
          releaseMode: 'delay-until-open-window',
          summary: 'quiet callback afterglow still needs a measured return',
          sourceSignals: ['callback-afterglow', 'same-living-line'],
          lastUpdatedAt: 12_345,
        },
      ],
      dominantResidueKind: 'afterglow',
      afterglowPressure: 0.76,
      repairPressure: 0.18,
      burdenPressure: 0.09,
      trustPressure: 0.58,
      restProtectivePressure: 0.24,
      relationshipCadence: {
        cadenceMode: 'measured-return',
        distancePosture: 'measured-room',
        companionshipDensity: 0.61,
        repairRecovery: 0.43,
        overreachRisk: 0.26,
        fatigueGuard: 0.31,
        afterglowCarry: 0.78,
        shouldDelayWarmth: true,
        shouldProtectRest: false,
        reasonTags: ['same-thread-continuation', 'callback-afterglow'],
        summary: 'measured-return until the same callback line settles',
      },
      sourceSignals: ['callback-afterglow', 'quiet-carry'],
      summary: 'afterglow still favors a measured return on the same callback line',
    } as const

    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        memory: {
          affectiveResidue,
        },
      }),
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('measured-return')
    expect(snapshot?.affectiveResidue?.summary).toContain('measured return')
    expect(snapshot?.derivedMindStateBundle).toBeNull()
    expect(digest?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('measured-return')
    expect(digest?.affectiveResidue?.summary).toContain('same callback line')
    expect(digest?.derivedMindStateBundle).toBeNull()
  })

  it('falls back to affective residue carried by derived mind-state bundle when top-level runtime memory residue is absent', () => {
    const affectiveResidue = {
      version: 'affective-residue-memory-v1',
      updatedAt: 22_222,
      residues: [
        {
          kind: 'repair',
          intensity: 0.71,
          persistence: 0.77,
          confidence: 0.84,
          polarity: 'protective',
          releaseMode: 'delay-until-open-window',
          summary: 'repair-first residue still wants the same line to stay quiet',
          sourceSignals: ['repair-before-closeness', 'same-thread'],
          lastUpdatedAt: 22_222,
        },
      ],
      dominantResidueKind: 'repair',
      afterglowPressure: 0.19,
      repairPressure: 0.83,
      burdenPressure: 0.14,
      trustPressure: 0.42,
      restProtectivePressure: 0.28,
      relationshipCadence: {
        cadenceMode: 'measured-return',
        distancePosture: 'protect-space',
        companionshipDensity: 0.47,
        repairRecovery: 0.68,
        overreachRisk: 0.39,
        fatigueGuard: 0.34,
        afterglowCarry: 0.51,
        shouldDelayWarmth: true,
        shouldProtectRest: false,
        reasonTags: ['repair-before-closeness', 'same-thread-continuation'],
        summary: 'repair-first cadence still needs a measured return',
      },
      sourceSignals: ['repair-before-closeness', 'quiet-carry'],
      summary: 'repair-first residue still holds the same callback line inward',
    } as const

    const snapshot = deriveAlicizationRuntimeSnapshot({
      spine: createMinimalRuntimeSpine({
        memory: {
          affectiveResidue: null,
          derivedMindStateBundle: {
            version: 'derived-mind-state-bundle-v1',
            source: 'main-runtime',
            producedAt: 22_222,
            summary: 'repair-first derived bundle',
            affectiveResidue,
          },
        },
      }),
    })
    const digest = projectAlicizationRuntimeDigest(snapshot)

    expect(snapshot?.affectiveResidue?.dominantResidueKind).toBe('repair')
    expect(snapshot?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('measured-return')
    expect(snapshot?.derivedMindStateBundle?.affectiveResidue?.summary).toContain('same callback line inward')
    expect(digest?.affectiveResidue?.dominantResidueKind).toBe('repair')
    expect(digest?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('measured-return')
    expect(digest?.derivedMindStateBundle?.affectiveResidue?.summary).toContain('same callback line inward')
  })
})
