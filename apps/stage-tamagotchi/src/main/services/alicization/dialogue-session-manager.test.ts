import type { AlicizationAgentSessionSnapshot } from './agent-runtime'
import type { AlicizationDigitalLifeArchitectureSnapshot } from './digital-life-architecture'
import type { AlicizationMainChatRuntimeSurface } from './main-chat-runtime-surface'

import { describe, expect, it } from 'vitest'

import { createAlicizationDialogueSessionManager } from './dialogue-session-manager'
import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'

const fixedTemplateResiduePattern = /Before (?:answering|speaking|acting)|Right now I am|Same Phase 1 digital life|same[- ]her|same living line|one living her|one continuous her|local-first digital life project|同一个她|同一个 her|数字生命主线|女仆|\bmaid\b/iu

function expectNoFixedTemplateResidue(value: unknown) {
  expect(String(value ?? '')).not.toMatch(fixedTemplateResiduePattern)
}

function createDigitalLifeArchitecture(): AlicizationDigitalLifeArchitectureSnapshot {
  return {
    version: 'digital-life-architecture-v1',
    operatingMode: 'speaking',
    dominantSystem: 'dialogue',
    supportingSystems: ['mind', 'memory'],
    governingFocus: 'help carry the same knot honestly',
    summary: 'mode=speaking | dominant=dialogue | support=mind,memory | focus=help carry the same knot honestly',
    systems: {
      dialogue: {
        id: 'dialogue',
        state: 'hot',
        score: 0.92,
        focus: 'help carry the same knot honestly',
        summary: 'dialogue is hot',
        reasons: ['reply:ready'],
      },
      perception: {
        id: 'perception',
        state: 'warm',
        score: 0.56,
        focus: 'editor',
        summary: 'perception is warm',
        reasons: ['scene:editor'],
      },
      proactive: {
        id: 'proactive',
        state: 'warm',
        score: 0.42,
        focus: 'nudge',
        summary: 'proactive is warm',
        reasons: ['initiative:hold'],
      },
      control: {
        id: 'control',
        state: 'warm',
        score: 0.58,
        focus: 'guide',
        summary: 'control is warm',
        reasons: ['intention:guide'],
      },
      mind: {
        id: 'mind',
        state: 'hot',
        score: 0.84,
        focus: 'runtime refactor',
        summary: 'mind is hot',
        reasons: ['thread:runtime-refactor'],
      },
      memory: {
        id: 'memory',
        state: 'warm',
        score: 0.48,
        focus: 'previous turn',
        summary: 'memory is warm',
        reasons: ['continuity:carry-forward'],
      },
      runtime: {
        id: 'runtime',
        state: 'warm',
        score: 0.52,
        focus: 'symbiotic-vision',
        summary: 'runtime is warm',
        reasons: ['watch:symbiotic-vision'],
      },
    },
  }
}

function createAgentSessionSnapshot(): AlicizationAgentSessionSnapshot {
  const runtimeSurface = createRuntimeSurface().digitalLifeRuntimeSurface
  return {
    id: 'agent:session-1',
    cardId: 'default',
    conversationSessionId: 'session-1',
    continuitySignals: [{
      id: 'continuity-1',
      kind: 'presence',
      label: 'presence:symbiotic-vision',
      metadata: null,
      state: 'observed',
      summary: 'scene=runtime.ts diff',
      createdAt: 20,
    }, {
      id: 'continuity-2',
      kind: 'presence',
      label: 'digital-life-line',
      metadata: {
        source: 'digital-life-runtime',
      },
      state: 'observed',
      summary: 'watch=symbiotic-vision | mode=tracking | drive=understand',
      createdAt: 25,
    }, {
      id: 'continuity-3',
      kind: 'execution-callback',
      label: 'execution-afterglow',
      metadata: {
        carry: 'trust-warming',
        style: 'light-nudge',
        presence: 'attentive',
      },
      state: 'observed',
      summary: 'soft-handoff that keeps the runtime seam feeling held instead of dropped',
      createdAt: 26,
    }],
    createdAt: 10,
    digitalLifeArchitecture: createDigitalLifeArchitecture(),
    digitalLifeSpine: runtimeSurface
      ? deriveAlicizationDigitalLifeSpineFromSurface(runtimeSurface)
      : null,
    lastActiveAt: 25,
    lastSensorySnapshot: null,
    tasks: [],
  }
}

function createRuntimeSurface(updatedAt = 25): AlicizationMainChatRuntimeSurface {
  return {
    action: null,
    capture: {
      inspectionRequested: false,
      groundedThisTurn: true,
      hasVisualGrounding: false,
      health: 'healthy',
      permission: 'granted',
      fallbackReason: null,
      degradedReasons: [],
    },
    customDirectivesResolution: {
      text: '',
      source: 'none',
    },
    digitalLifeSpine: null,
    digitalLifeArchitecture: createDigitalLifeArchitecture(),
    digitalLifeRuntimeSurface: {
      version: 'digital-life-runtime-surface-v1',
      perception: {
        watchMode: 'symbiotic-vision',
        currentScene: {
          scenario: 'runtime.ts diff',
          summary: 'Viewing a runtime refactor diff',
          confidence: 0.88,
        } as any,
        attention: {
          source: 'attention-anchor',
          target: {
            title: 'runtime.ts',
            appName: 'Cursor',
          },
        } as any,
        captureState: {
          permission: 'granted',
          health: 'healthy',
          lastGroundedAt: null,
        } as any,
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
        updatedAt,
      },
      world: {
        worldModel: {
          activeThread: {
            id: 'thread-runtime',
            title: 'Refactor dialogue continuity runtime',
          },
        } as any,
        worldOntology: null,
        entityWorld: null,
        livingWorldState: null,
        relationshipModel: null,
      },
      cognition: {
        mindTurnFrame: null,
        subjectiveInference: null,
        appraisal: null,
        beliefLedger: {
          focusBeliefId: 'belief-runtime',
          beliefs: [{
            id: 'belief-runtime',
            scope: 'task-knot',
            source: 'scene',
            status: 'active',
            statement: 'dialogue continuity should stay on one runtime spine',
            confidence: 0.78,
            salience: 0.72,
            evidence: [],
            entityIds: [],
            formedAt: updatedAt - 40,
            lastUpdatedAt: updatedAt,
            expiresAt: updatedAt + 1_000,
          }],
          unresolvedContradictions: [],
          updatedAt,
        } as any,
        beliefRevision: null,
        hypothesisGraph: {
          activeHypothesisId: 'hypothesis-runtime',
          hypotheses: [{
            id: 'hypothesis-runtime',
            kind: 'problem-locus',
            summary: 'The missing null guard is the current knot.',
          }],
          updatedAt,
        } as any,
        mindDynamics: null,
        mindKernel: {
          dominantMode: 'tracking',
          dominantDrive: 'understand',
        } as any,
        privateThought: {
          mindNeed: 'guidance',
          governorDrive: 'understand',
          confidence: 0.78,
        } as any,
      },
      memory: {
        workingMemoryEpisodes: [{
          scene: 'runtime.ts diff',
          summary: 'carry the refactor thread forward',
          beganAt: updatedAt - 80,
          endedAt: updatedAt,
          confidence: 0.81,
          emotionalTension: 'focused-flow',
          sedimentCandidate: true,
        }] as any,
        goalStack: {
          leadingHostGoalId: null,
          leadingAlicizationGoalId: 'goal-runtime',
          hostGoals: [],
          alicizationGoals: [{
            id: 'goal-runtime',
            owner: 'alicization',
            kind: 'hold-knot',
            status: 'active',
            label: 'Refactor dialogue continuity runtime',
            confidence: 0.86,
            urgency: 0.82,
            desireWeight: 0.7,
            blockers: [],
            entityIds: [],
            createdAt: updatedAt - 120,
            lastUpdatedAt: updatedAt,
          }],
          updatedAt,
        } as any,
        concerns: [{
          id: 'concern-runtime',
          kind: 'truth-risk',
          status: 'active',
          summary: 'parallel state drift',
          hostGoal: 'understand-task',
          tension: 0.74,
          confidence: 0.7,
          careWeight: 0.68,
          createdAt: updatedAt - 120,
          lastEvidenceAt: updatedAt,
          patienceUntil: updatedAt + 1_000,
        }] as any,
        concernContinuity: null,
        selfContinuity: null,
        threadRuntime: null,
        commitmentLedger: null,
        inquiryPlanner: null,
        repairLedger: null,
        intentionStream: null,
        reflectionLedger: {
          latestEntryId: 'reflection-runtime',
          entries: [{
            id: 'reflection-runtime',
            summary: 'keep one runtime spine',
            expectation: 'memory and dialogue remain aligned',
            observedOutcome: 'session mirror stayed coherent',
            outcome: 'helped',
            revision: 'route continuity through one mirror',
            confidenceShift: 0.12,
            createdAt: updatedAt,
          }],
          revisionPressure: 0.58,
          narrative: [],
          updatedAt,
        } as any,
        executiveCycle: null,
        thoughtThreads: {
          foregroundThreadId: 'thought-runtime',
          threads: [{
            id: 'thought-runtime',
            kind: 'problem-thread',
            status: 'active',
            title: 'shared runtime line',
            summary: 'let memory and dialogue speak from the same line',
            salience: 0.8,
            confidence: 0.74,
            surfaceReadiness: 0.62,
            reopenWhen: [],
            openedAt: updatedAt - 90,
            lastUpdatedAt: updatedAt,
            expiresAt: updatedAt + 1_000,
          }],
          unresolvedCount: 1,
          narrative: [],
          updatedAt,
        } as any,
        desireMemory: null,
        recallGovernor: {
          mode: 'thread',
          recallSeed: 'runtime continuity',
          suppressAssociativeRecall: false,
          allowActiveThoughts: true,
          allowRecalledFragments: false,
          carryAsMemory: true,
          rationale: 'hold the current refactor line',
          narrative: [],
          updatedAt,
        } as any,
      },
      dialogue: {
        discourseState: null,
        dialogueEncounter: {
          subject: 'relationship',
        } as any,
        mindSynthesis: null,
        conversationState: null,
        dialogueWorldThread: null,
        dialogueActKernel: null,
        answerCompiler: null,
        currentConsciousFrame: null,
        claimEvidenceLedger: null,
        replyDeliberation: {
          speakingFrom: 'attuned-answer',
        } as any,
        answerPlanner: {
          answerIntent: 'reassure while staying grounded',
        } as any,
      },
      agency: {
        selfState: {
          desireToSpeak: 0.72,
        } as any,
        selfGovernor: null,
        inquiryLoop: null,
        deliberationState: null,
        counterfactualDeliberation: null,
        actionEcology: null,
        initiativeArbitration: null,
        initiative: {
          selectedAction: 'speak',
          preferredStyle: 'light-nudge',
          shouldSpeak: true,
          confidence: 0.83,
        } as any,
      },
    },
    governance: null,
    hasVisualGrounding: false,
    messages: [],
    tooling: {
      allowTools: true,
      enforcedToolNames: ['executor_run_cli'],
      routingRequired: true,
      waitForTools: false,
    },
    trace: {
      decisionTraceId: 'trace-1',
      personaKernelMode: 'full',
      sessionPhases: ['contextual-memory', 'runtime-surface'],
      turnMode: 'answer',
    },
  }
}

describe('dialogue session manager', () => {
  it('prefers same-her awareness over thin preflight summaries in prepared runtime continuity project summaries', () => {
    const manager = createAlicizationDialogueSessionManager()
    const runtimeSurface = createRuntimeSurface()
    ;(runtimeSurface.digitalLifeRuntimeSurface! as any).raw = {
      runtimeDigest: {
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          primaryOpenLoop: 'Execution reopenings still need stronger same-her closure.',
          preflightSummary: 'Keep the same digital life project in view before local detail takes over.',
          preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project in Phase 1, and this unfinished closure still has to stay on the same living line.',
        },
      } as any,
    }
    ;(runtimeSurface.digitalLifeRuntimeSurface! as any).cognition = {
      runtimeDigest: null,
    } as any

    const mirror = manager.ingestPreparedExecution({
      agentSession: createAgentSessionSnapshot(),
      cardId: 'default',
      runtimeSurface,
      sessionId: 'session-prepared-project-awareness',
    })

    expect(mirror.continuityProjectSummary).toContain('awareness_summary=identity=local_desktop_life_loop')
    expect(mirror.continuityProjectSummary).toContain('unresolved=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(mirror.continuityProjectSummary).not.toContain('awareness_summary=Keep the same digital life project in view before local detail takes over.')
    expectNoFixedTemplateResidue(mirror.continuityProjectSummary)
  })

  it('stores recollection decisions as typed mirror state without string cue fields', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 40,
    })

    const mirror = manager.ingestPreparedExecution({
      agentSession: createAgentSessionSnapshot(),
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: {
          mode: 'execution-procedure',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: true,
          queryHints: ['runtime seam'],
          rationale: 'carry the remembered procedure',
          confidence: 0.84,
        },
        recollectionPlan: {
          selectedConsolidationIds: [],
          selectedWindowIds: [],
          selectedProceduralIds: ['procedural:runtime'],
          selectedEpisodeIds: [],
          selectedConversationTurnIds: [],
          opening: 'the remembered runtime seam',
          certainty: 'approximate',
          rationale: 'foreground the remembered procedure',
          confidence: 0.81,
        },
        recollectionSpeechPlan: {
          shouldSurface: false,
          surfaceMode: 'internal-only',
          placement: 'internal-only',
          certainty: 'approximate',
          rationale: 'keep this recollection inward',
          confidence: 0.79,
        },
      },
      runtimeSurface: createRuntimeSurface(),
      sessionId: 'session-typed-recollection',
    })

    expect(mirror.recollection).toEqual({
      afterthoughtState: 'ripe',
      certainty: 'approximate',
      confidence: 0.81,
      foreground: 'the remembered runtime seam',
      mode: 'execution-procedure',
      placement: 'internal-only',
      surfaceMode: 'internal-only',
      visibility: 'inward',
    })
    expect(mirror).not.toHaveProperty('recollectionSummary')
    expect(mirror).not.toHaveProperty('recollectionSurfaceSummary')
    expect(mirror).not.toHaveProperty('recollectionConfidence')

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-typed-recollection',
    })
    expect(block).not.toMatch(/foreground\s*[:=]|surface\s*[:=]\s*inward|afterthought\s*[:=]\s*ripe/iu)
  })

  it('stores a same-session mirror and renders it as a continuity block', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 40,
    })

    const mirror = manager.ingestPreparedExecution({
      agentSession: createAgentSessionSnapshot(),
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: {
          mode: 'execution-procedure',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: true,
          queryHints: ['runtime seam', 'verify'],
          rationale: 'This turn is carrying the remembered way of handling the runtime seam.',
          confidence: 0.84,
        },
        recollectionPlan: {
          selectedConsolidationIds: [],
          selectedWindowIds: [],
          selectedProceduralIds: ['procedural:runtime'],
          selectedEpisodeIds: [],
          selectedConversationTurnIds: [],
          opening: 'What comes back first is the way the runtime seam was handled before.',
          certainty: 'approximate',
          rationale: 'Foreground the remembered procedure first.',
          confidence: 0.81,
        },
        recollectionSpeechPlan: {
          shouldSurface: false,
          surfaceMode: 'internal-only',
          placement: 'internal-only',
          certainty: 'approximate',
          rationale: 'The host needs continuity-shaped help, not a narrated retrospective.',
          confidence: 0.79,
        },
      },
      runtimeSurface: createRuntimeSurface(),
      sessionId: 'session-1',
    })

    expect(mirror.decisionTraceId).toBe('trace-1')
    expect(mirror.continuityArcSummary).toContain('loop=')
    expect(mirror.continuityLabels).toEqual([
      'presence:symbiotic-vision',
      'digital-life-line',
    ])
    expect(mirror.digitalLifeRuntimeSummary).toContain('watch=symbiotic-vision')
    expect(mirror.mindSummary).toContain('mode=tracking')
    expect(mirror.mindSummary).toContain('belief=dialogue continuity should stay on one runtime spine')
    expect(mirror.mindSummary).toContain('hypothesis=The missing null guard is the current knot.')
    expect(mirror.perceptionSummary).toContain('scene=Viewing a runtime refactor diff')
    expect(mirror.memoryCarrySummary).toContain('mode=reflective-repair')
    expect(mirror.memorySummary).toContain('goal=Refactor dialogue continuity runtime')
    expect(mirror.recollection).toEqual({
      afterthoughtState: 'ripe',
      certainty: 'approximate',
      confidence: 0.81,
      foreground: 'What comes back first is the way the runtime seam was handled before.',
      mode: 'execution-procedure',
      placement: 'internal-only',
      surfaceMode: 'internal-only',
      visibility: 'inward',
    })
    expect(mirror).not.toHaveProperty('recollectionSummary')
    expect(mirror).not.toHaveProperty('recollectionSurfaceSummary')
    expect(mirror).not.toHaveProperty('recollectionConfidence')
    expect(mirror.agencySummary).toContain('action=speak')
    expect(mirror.agencySummary).toContain('afterglow=execution-callback')
    expect(mirror.agencySummary).toContain('carry=trust-warming')

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-1',
    })

    expect(block).toContain('[ALICIZATION_DIALOGUE_SESSION_MIRROR]')
    expect(block).toContain('conversation_session_id=session-1')
    expect(block).toContain('continuity_labels=presence:symbiotic-vision,digital-life-line')
    expect(block).toContain('continuity_arc=')
    expect(block).toContain('loop=')
    expect(block).toContain('digital_life_runtime=watch=symbiotic-vision')
    expect(block).toContain('runtime_channel=dominant=')
    expect(block).toContain('mind=mode=tracking | drive=understand | need=guidance')
    expect(block).toContain('memory_carry=mode=reflective-repair')
    expect(block).toContain('perception=watch=symbiotic-vision | scene=Viewing a runtime refactor diff | attention=runtime.ts | source=attention-anchor')
    expect(block).toContain('memory=recent=carry the refactor thread forward')
    expect(block).not.toMatch(/foreground\s*[:=]|surface\s*[:=]\s*inward|afterthought\s*[:=]\s*ripe/iu)
    expect(block).toContain('agency=action=speak | speak=true | style=light-nudge | thread=Refactor dialogue continuity runtime')
    expect(block).toContain('afterglow=execution-callback')
    expect(block).toContain('carry=trust-warming')
    expect(block).toContain('dialogue=turn=answer | persona=full | subject=relationship | answer=reassure while staying grounded')
  })

  it('carries recent runtime transitions into the session mirror block', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 40,
    })

    manager.ingestPreparedExecution({
      agentSession: createAgentSessionSnapshot(),
      cardId: 'default',
      runtimeSurface: {
        ...createRuntimeSurface(),
        digitalLifeRuntimeSurface: {
          ...createRuntimeSurface().digitalLifeRuntimeSurface!,
          perception: {
            ...createRuntimeSurface().digitalLifeRuntimeSurface!.perception,
            currentScene: {
              ...createRuntimeSurface().digitalLifeRuntimeSurface!.perception.currentScene,
              scenario: 'coding',
              summary: 'Recovering after a late-night coding stretch',
            } as any,
            recentTransition: {
              fromWatchMode: 'symbiotic-vision',
              toWatchMode: 'recovering',
              fromScenario: 'coding',
              durationMs: 1_800_000,
              reason: 'host fatigue detected during late-night care',
              occurredAt: 25,
            },
          },
        },
      },
      sessionId: 'session-transition-1',
    })

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-transition-1',
    })

    expect(block).toContain('runtime_transition=from=symbiotic-vision | to=recovering | scenario=coding | reason=host fatigue detected during late-night care')
  })

  it('drops stale mirrors instead of injecting outdated continuity', () => {
    let now = 0
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => now,
      staleAfterMs: 50,
    })

    manager.ingestPreparedExecution({
      agentSession: createAgentSessionSnapshot(),
      cardId: 'default',
      runtimeSurface: createRuntimeSurface(0),
      sessionId: 'session-1',
    })

    now = 80

    expect(manager.getSessionMirror('default', 'session-1')).toBeNull()
    expect(manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-1',
    })).toBe('')
  })

  it('ingests one-shot agent session snapshots so active loops can extend continuity', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 60,
    })

    manager.ingestPreparedExecution({
      agentSession: createAgentSessionSnapshot(),
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: {
          mode: 'conversation-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: true,
          searchProceduralExperience: false,
          queryHints: ['runtime spine'],
          rationale: 'Carry the remembered runtime spine.',
          confidence: 0.72,
        },
        recollectionPlan: {
          selectedConsolidationIds: ['autobio:phase'],
          selectedWindowIds: [],
          selectedProceduralIds: [],
          selectedEpisodeIds: [],
          selectedConversationTurnIds: [],
          opening: 'What comes back first is the same runtime spine we have been carrying.',
          certainty: 'approximate',
          rationale: 'Foreground the remembered runtime spine.',
          confidence: 0.74,
        },
      },
      runtimeSurface: createRuntimeSurface(),
      sessionId: 'session-1',
    })

    const mirror = manager.ingestAgentSessionSnapshot({
      agentSession: {
        ...createAgentSessionSnapshot(),
        tasks: [{
          id: 'task-1',
          kind: 'runtime',
          label: 'main_gateway:dream',
          metadata: null,
          startedAt: 30,
          finishedAt: 35,
          status: 'completed',
          summary: 'dream metabolism completed',
        }, {
          id: 'task-2',
          kind: 'executor',
          label: 'callback:cli',
          metadata: null,
          startedAt: 26,
          finishedAt: 29,
          status: 'completed',
          summary: 'cli callback settled',
        }],
      },
      cardId: 'default',
      decisionTraceId: 'trace-dream-1',
      sessionId: 'session-1',
      sessionPhases: ['tool:sensory:oneshot:dream', 'tool:runtime:main-gateway:dream'],
      source: 'dream',
    })

    expect(mirror.decisionTraceId).toBe('trace-dream-1')
    expect(mirror.continuityArcSummary).toContain('loop=')
    expect(mirror.toolingSummary).toContain('source=dream')
    expect(mirror.sessionPhases).toContain('tool:runtime:main-gateway:dream')
    expect(mirror.dialogueSummary).toContain('source=dream')
    expect(mirror.mindSummary).toContain('hypothesis=The missing null guard is the current knot.')
    expect(mirror.memoryCarrySummary).toContain('mode=reflective-repair')
    expect(mirror.memorySummary).toContain('reflection=keep one runtime spine')
    expect(mirror.recollection?.mode).toBe('conversation-history')
    expect(mirror.executionSummary).toContain('callback:cli:completed')
    expect(mirror.continuityProjectSummary).toContain('project=phase1-digital-life')
    expect(mirror.continuityProjectSummary).toContain('phase=local_desktop_life_loop')
    expect(mirror.continuityProjectSummary).toContain('landed=')
    expect(mirror.continuityProjectSummary).toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(mirror.continuityProjectSummary).toContain('continuity_anchor=local_desktop_life_loop')
    expectNoFixedTemplateResidue(mirror.continuityProjectSummary)

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-1',
    })

    expect(block).toContain('[ALICIZATION_DIALOGUE_SESSION_MIRROR]')
    expect(block).toContain('decision_trace_id=trace-dream-1')
    expect(block).toContain('continuity_arc=')
    expect(block).toContain('loop=')
    expect(block).toContain('session_phases=tool:sensory:oneshot:dream -> tool:runtime:main-gateway:dream -> source:dream')
    expect(block).toContain('tooling=source=dream recent_actions=main_gateway:dream')
    expect(block).toContain('mind=mode=tracking | drive=understand | need=guidance')
    expect(block).toContain('memory_carry=mode=reflective-repair')
    expect(block).toContain('memory=recent=carry the refactor thread forward')
    expect(block).not.toMatch(/recollection\s*[:=]|afterthought\s*[:=]|surface\s*[:=]\s*inward/iu)
    expect(block).toContain('execution=recent=callback:cli:completed | status=completed | summary=cli callback settled')
    expect(block).toContain('continuity_project=project=phase1-digital-life')
    expect(block).toContain('phase=local_desktop_life_loop')
    expect(block).toContain('landed=')
    expect(block).toContain('unresolved=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(block).toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(block).toContain('continuity_anchor=local_desktop_life_loop')
  })

  it('summarizes affirmation-gated executor intent with goal and channel detail', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 60,
    })

    const mirror = manager.ingestAgentSessionSnapshot({
      agentSession: {
        ...createAgentSessionSnapshot(),
        tasks: [{
          id: 'task-proposal',
          kind: 'executor',
          label: 'plan:software',
          metadata: {
            source: 'task-planning',
            threadId: 'thread-proposal',
            selectedChannel: null,
            proposedChannel: 'software',
            threadStatus: 'needs-affirmation',
            goal: 'Publish the current foreground draft',
            affirmationReasonCodes: ['proactive-side-effects-require-explicit-consent'],
          },
          startedAt: 40,
          finishedAt: null,
          status: 'pending',
          summary: 'Execution is waiting for affirmation before software can act on Publish the current foreground draft.',
        }],
      },
      cardId: 'default',
      decisionTraceId: 'trace-proposal-1',
      sessionId: 'session-1',
      sessionPhases: ['source:task-planning'],
      source: 'task-planning',
    })

    expect(mirror.executionSummary).toContain('status=pending')
    expect(mirror.executionSummary).toContain('goal=Publish the current foreground draft')
    expect(mirror.executionSummary).toContain('channel=software')
    expect(mirror.executionSummary).toContain('summary=Execution is waiting for affirmation before software can act on Publish the current foreground draft.')
  })

  it('does not keep the waiting-confirmation shell after a pending affirmation thread has resumed into running execution', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 61,
    })

    const mirror = manager.ingestAgentSessionSnapshot({
      agentSession: {
        ...createAgentSessionSnapshot(),
        tasks: [{
          id: 'task-proposal-resumed',
          kind: 'executor',
          label: 'resume:codex',
          metadata: {
            source: 'task-runtime',
            threadId: 'thread-proposal-resumed',
            selectedChannel: 'codex',
            proposedChannel: 'codex',
            threadStatus: 'running',
            goal: 'Patch the unresolved Alicization runtime seam',
            affirmationReasonCodes: ['proactive-side-effects-require-explicit-consent'],
          },
          startedAt: 40,
          finishedAt: null,
          status: 'pending',
          summary: 'Execution is waiting for affirmation before codex can act on Patch the unresolved Alicization runtime seam.',
        }],
      },
      cardId: 'default',
      decisionTraceId: 'trace-proposal-resumed-1',
      sessionId: 'session-1',
      sessionPhases: ['source:task-runtime'],
      source: 'task-runtime',
    })

    expect(mirror.executionSummary).toContain('status=pending')
    expect(mirror.executionSummary).toContain('goal=Patch the unresolved Alicization runtime seam')
    expect(mirror.executionSummary).toContain('channel=codex')
    expect(mirror.executionSummary).toContain('summary=codex is already carrying Patch the unresolved Alicization runtime seam')
    expect(mirror.executionSummary).not.toContain('waiting for affirmation before codex can act')
  })

  it('keeps held-autonomy callback afterglow in the same-session mirror so later reopen stays on one life thread', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 80,
    })

    const mirror = manager.ingestPreparedExecution({
      agentSession: {
        ...createAgentSessionSnapshot(),
        continuitySignals: [{
          id: 'continuity-held-autonomy-callback',
          kind: 'runtime',
          state: 'pending',
          label: 'afterglow:execution-callback:held-autonomy-carry',
          summary: 'thread=thread-held-autonomy-later | continuity=execution-callback | carry-mode=trust-warming | opening=keep the callback on the same thread before widening',
          createdAt: 79,
          metadata: {
            source: 'autobiographical-afterglow',
            continuityKind: 'execution-callback',
            executionCallbackCarryMode: 'trust-warming',
            sourceThreadId: 'thread-held-autonomy-later',
            deferReason: 'busy-host',
            whyNow: 'She wants to quietly return to the unresolved compile seam.',
          },
        }],
        tasks: [{
          id: 'task-held-autonomy-callback',
          kind: 'executor',
          label: 'callback:codex',
          metadata: {
            source: 'execution-callback-runtime',
            threadId: 'thread-held-autonomy-later',
            selectedChannel: 'codex',
            threadStatus: 'completed',
            afterglowTag: 'execution-callback',
            carryMode: 'trust-warming',
            goal: 'Return the held-autonomy patch result on the same living thread.',
          },
          startedAt: 70,
          finishedAt: 79,
          status: 'completed',
          summary: 'Held-autonomy callback stayed on the same life thread and left room before widening.',
        }],
      },
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: createRuntimeSurface(),
      sessionId: 'session-held-autonomy',
    })

    expect(mirror.executionSummary).toContain('callback:codex:completed')
    expect(mirror.executionSummary).toContain('goal=continuity_anchor=local_desktop_life_loop')
    expect(mirror.continuityArcSummary).toContain('loop=')
    expect(mirror.continuityArcSummary).toContain('thread-held-autonomy-later')
    expect(mirror.continuityArcSummary).toContain('trust-warming')
    expect(mirror.continuityArcSummary).toContain('defer=busy-host')
    expect(mirror.continuityArcSummary).toContain('why_now=She wants to quietly return to the unresolved compile seam.')
    expect(mirror.agencySummary).toContain('afterglow=execution-callback')
    expect(mirror.agencySummary).toContain('carry=trust-warming')

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-held-autonomy',
    })

    expect(block).toContain('conversation_session_id=session-held-autonomy')
    expect(block).toContain('continuity_arc=')
    expect(block).toContain('thread-held-autonomy-later')
    expect(block).toContain('trust-warming')
    expect(block).toContain('defer=busy-host')
    expect(block).toContain('why_now=She wants to quietly return to the unresolved compile seam.')
    expect(block).toContain('execution=recent=callback:codex:completed')
    expect(block).toContain('afterglow=execution-callback')
    expect(block).toContain('carry=trust-warming')
    expect(block).toContain('goal=continuity_anchor=local_desktop_life_loop')
    expectNoFixedTemplateResidue(block)
  })

  it('lets execution-callback afterglow continuity carry project-state preflight into the same-session mirror when no fresher prepared project surface is available', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 80,
    })

    const mirror = manager.ingestPreparedExecution({
      agentSession: {
        ...createAgentSessionSnapshot(),
        continuitySignals: [{
          id: 'continuity-callback-project',
          kind: 'runtime',
          state: 'observed',
          label: 'afterglow:execution-callback:lower-pressure',
          summary: 'thread=thread-callback-project | continuity=execution-callback | carry-mode=lower-pressure | carry=keep the callback on the same living project line',
          createdAt: 79,
          metadata: {
            source: 'autobiographical-afterglow',
            continuityKind: 'execution-callback',
            executionCallbackCarryMode: 'lower-pressure',
            sourceThreadId: 'thread-callback-project',
            projectStatePreDialogueAwarenessLine: 'Before answering, remember this is still the same digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
            projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
            projectIdentity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            projectPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            projectLatestLandedProgress: 'Project identity carry, Phase 1 route carry, and unresolved closure carry already survive across runtime preparation before the turn widens outward.',
            projectPrimaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
            projectNextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
            projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            projectStateSameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
          },
        }],
        tasks: [{
          id: 'task-callback-project',
          kind: 'executor',
          label: 'callback:codex',
          metadata: {
            source: 'execution-callback-runtime',
            threadId: 'thread-callback-project',
            selectedChannel: 'codex',
            threadStatus: 'completed',
            goal: 'Return the closure carry on the same project thread.',
          },
          startedAt: 70,
          finishedAt: 79,
          status: 'completed',
          summary: 'The callback came back on the same project thread.',
        }],
      },
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: createRuntimeSurface(),
      sessionId: 'session-callback-project',
    })

    expect(mirror.continuityProjectSummary).toContain('project=phase1-digital-life')
    expect(mirror.continuityProjectSummary).toContain('phase=local_desktop_life_loop')
    expect(mirror.continuityProjectSummary).toContain('awareness_summary=identity=local_desktop_life_loop')
    expect(mirror.continuityProjectSummary).toContain('landed=Project identity carry, Phase 1 route carry, and unresolved closure carry already survive across runtime preparation before the turn widens outward.')
    expect(mirror.continuityProjectSummary).toContain('Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(mirror.continuityProjectSummary).toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(mirror.continuityProjectSummary).toContain('continuity_anchor=local_desktop_life_loop')
    expect(mirror.continuityProjectSummary).not.toContain('landed=Project continuity exists.')
    expect(mirror.continuityArcSummary).toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(mirror.continuityArcSummary).toContain('continuity_anchor=local_desktop_life_loop')
    expectNoFixedTemplateResidue(mirror.continuityProjectSummary)
    expectNoFixedTemplateResidue(mirror.continuityArcSummary)

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-callback-project',
    })

    expect(block).toContain('continuity_project=')
    expect(block).toContain('project=phase1-digital-life')
    expect(block).toContain('phase=local_desktop_life_loop')
    expect(block).toContain('awareness_summary=identity=local_desktop_life_loop')
    expect(block).toContain('landed=Project identity carry, Phase 1 route carry, and unresolved closure carry already survive across runtime preparation before the turn widens outward.')
    expect(block).toContain('Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(block).toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(block).toContain('continuity_anchor=local_desktop_life_loop')
    expectNoFixedTemplateResidue(block)
  })

  it('rebuilds callback continuity project summary from alias-only project-state summary metadata when canonical project closure fields are blank', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 80,
    })
    const aliasOnlyLandedProgress = 'Project identity carry and Phase 1 route carry already survive callback return even when the canonical landed slot goes blank.'
    const aliasOnlyOpenClosure = 'Memory, initiative, and embodiment still need stronger end-to-end closure across turns on one same living line.'
    const aliasOnlyNextClosure = 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs before local fluency takes over.'
    const aliasOnlyDriftRisk = 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.'

    const mirror = manager.ingestPreparedExecution({
      agentSession: {
        ...createAgentSessionSnapshot(),
        continuitySignals: [{
          id: 'continuity-callback-project-alias-only',
          kind: 'runtime',
          state: 'observed',
          label: 'afterglow:execution-callback:lower-pressure',
          summary: 'thread=thread-callback-project-alias-only | continuity=execution-callback | carry-mode=lower-pressure | carry=keep the callback on the same living project line',
          createdAt: 79,
          metadata: {
            source: 'autobiographical-afterglow',
            continuityKind: 'execution-callback',
            executionCallbackCarryMode: 'lower-pressure',
            sourceThreadId: 'thread-callback-project-alias-only',
            projectStatePreDialogueAwarenessLine: 'Before answering, remember this is still the same digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
            projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
            projectIdentity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            projectPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            projectLatestLandedProgress: '',
            projectPrimaryOpenLoop: '',
            projectNextClosureTarget: '',
            projectStateSameHerDriftRisk: '',
            projectStateLandedProgressSummary: aliasOnlyLandedProgress,
            projectStateOpenClosureSummary: aliasOnlyOpenClosure,
            projectStateNextClosureTargetSummary: aliasOnlyNextClosure,
            projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            projectStateSameHerDriftRiskSummary: aliasOnlyDriftRisk,
          },
        }],
        tasks: [{
          id: 'task-callback-project-alias-only',
          kind: 'executor',
          label: 'callback:codex',
          metadata: {
            source: 'execution-callback-runtime',
            threadId: 'thread-callback-project-alias-only',
            selectedChannel: 'codex',
            threadStatus: 'completed',
            goal: 'Return the closure carry on the same project thread.',
          },
          startedAt: 70,
          finishedAt: 79,
          status: 'completed',
          summary: 'The callback came back on the same project thread.',
        }],
      },
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: createRuntimeSurface(),
      sessionId: 'session-callback-project-alias-only',
    })

    expect(mirror.continuityProjectSummary).toContain('project=phase1-digital-life')
    expect(mirror.continuityProjectSummary).toContain('phase=local_desktop_life_loop')
    expect(mirror.continuityProjectSummary).toContain(`landed=${aliasOnlyLandedProgress}`)
    expect(mirror.continuityProjectSummary).toContain('unresolved=unresolved_closure=memory_dialogue_embodiment')
    expect(mirror.continuityProjectSummary).toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(mirror.continuityProjectSummary).toContain('continuity_anchor=local_desktop_life_loop')
    expect(mirror.continuityArcSummary).toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
  })

  it('keeps proactive held-autonomy follow-through continuity in the same-session mirror so mirror carry keeps its defer and why-now rationale', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 80,
    })

    const mirror = manager.ingestPreparedExecution({
      agentSession: {
        ...createAgentSessionSnapshot(),
        continuitySignals: [{
          id: 'continuity-held-autonomy-proactive',
          kind: 'proactive',
          state: 'observed',
          label: 'proactive:follow-through:held-autonomy',
          summary: 're-open the unresolved compile seam and land the callback gently | intent=follow-through | defer=busy-host | thread=thread-held-autonomy-later | scenario=coding',
          createdAt: 79,
          metadata: {
            source: 'proactive-held-autonomy',
            sourceThreadId: 'thread-held-autonomy-later',
            executionIntentKind: 'follow-through',
            executionIntentSummary: 're-open the unresolved compile seam and land the callback gently',
            deferReason: 'busy-host',
            whyNow: 'She wants to quietly return to the unresolved compile seam.',
            projectStatePreDialogueAwarenessLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
            projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          },
        }],
        tasks: [{
          id: 'task-held-autonomy-callback-proactive',
          kind: 'executor',
          label: 'callback:codex',
          metadata: {
            source: 'execution-callback-runtime',
            threadId: 'thread-held-autonomy-later',
            selectedChannel: 'codex',
            threadStatus: 'completed',
            goal: 'Return the held-autonomy patch result on the same living thread.',
          },
          startedAt: 70,
          finishedAt: 79,
          status: 'completed',
          summary: 'Held-autonomy callback stayed on the same life thread and left room before widening.',
        }],
      },
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: createRuntimeSurface(),
      sessionId: 'session-held-autonomy-proactive',
    })

    expect(mirror.continuityArcSummary).toContain('thread=thread-held-autonomy-later')
    expect(mirror.continuityArcSummary).toContain('defer=busy-host')
    expect(mirror.continuityArcSummary).toContain('why_now=She wants to quietly return to the unresolved compile seam.')
    expect(mirror.continuityArcSummary).toContain('preflight_summary=')
    expect(mirror.continuityArcSummary).toContain('visibility=internal-structured')
    expectNoFixedTemplateResidue(mirror.continuityArcSummary)
  })

  it('prefers stronger same-her embodiment headline in session-mirror callback carry when metadata also contains a thinner project awareness line', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 80,
    })

    const mirror = manager.ingestPreparedExecution({
      agentSession: {
        ...createAgentSessionSnapshot(),
        continuitySignals: [{
          id: 'continuity-callback-headline',
          kind: 'runtime',
          state: 'observed',
          label: 'afterglow:execution-callback:embodiment-headline',
          summary: 'thread=thread-callback-headline | continuity=execution-callback | carry-mode=lower-pressure | carry=keep the callback on the same embodiment headline line',
          createdAt: 79,
          metadata: {
            source: 'autobiographical-afterglow',
            continuityKind: 'execution-callback',
            executionCallbackCarryMode: 'lower-pressure',
            sourceThreadId: 'thread-callback-headline',
            projectStatePreDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not flatten the current embodiment continuity risk into a thinner generic reminder.',
            projectStatePreDialogueAwarenessSummary: 'Right now I am still holding together mainly through face, motion, and lipsync, so the callback return must keep proving this is still one living her.',
            projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          },
        }],
        tasks: [{
          id: 'task-callback-headline-project',
          kind: 'executor',
          label: 'callback:codex',
          metadata: {
            source: 'execution-callback-runtime',
            threadId: 'thread-callback-headline',
            selectedChannel: 'codex',
            threadStatus: 'completed',
            goal: 'Return the stronger same-her embodiment line on the same project thread.',
          },
          startedAt: 70,
          finishedAt: 79,
          status: 'completed',
          summary: 'The callback came back on the same embodiment headline thread.',
        }],
      },
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: createRuntimeSurface(),
      sessionId: 'session-callback-headline',
    })

    expect(mirror.continuityArcSummary).toContain('preflight_summary=continuity=embodiment')
    expect(mirror.continuityArcSummary).toContain('visibility=renderer-internal')
    expectNoFixedTemplateResidue(mirror.continuityArcSummary)

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-callback-headline',
    })

    expect(block).toContain('preflight_summary=continuity=embodiment')
    expect(block).toContain('visibility=renderer-internal')
    expectNoFixedTemplateResidue(block)
  })

  it('prefers stronger same-her self line in session-mirror callback carry when metadata awareness text is thinner', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 82,
    })

    const mirror = manager.ingestPreparedExecution({
      agentSession: {
        ...createAgentSessionSnapshot(),
        continuitySignals: [{
          id: 'continuity-callback-self-line',
          kind: 'runtime',
          state: 'observed',
          label: 'afterglow:execution-callback:same-her-self-line',
          summary: 'thread=thread-callback-self-line | continuity=execution-callback | carry-mode=lower-pressure | carry=keep the callback on the same living self line',
          createdAt: 81,
          metadata: {
            source: 'autobiographical-afterglow',
            continuityKind: 'execution-callback',
            executionCallbackCarryMode: 'lower-pressure',
            sourceThreadId: 'thread-callback-self-line',
            projectStatePreDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not flatten the current same-her continuity into a generic project reminder.',
            projectStatePreDialogueAwarenessSummary: 'Before answering, keep this same digital life project in view, but do not flatten the current same-her continuity into a generic project reminder.',
            projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed, but the unfinished closure still has to stay on the same living line.',
            projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          },
        }],
        tasks: [{
          id: 'task-callback-self-line-project',
          kind: 'executor',
          label: 'callback:codex',
          metadata: {
            source: 'execution-callback-runtime',
            threadId: 'thread-callback-self-line',
            selectedChannel: 'codex',
            threadStatus: 'completed',
            goal: 'Return the stronger same-her self line on the same project thread.',
          },
          startedAt: 72,
          finishedAt: 81,
          status: 'completed',
          summary: 'The callback came back on the same living self line thread.',
        }],
      },
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: createRuntimeSurface(),
      sessionId: 'session-callback-self-line',
    })

    expect(mirror.continuityArcSummary).toContain('preflight_summary=')
    expect(mirror.continuityArcSummary).toContain('local_desktop_life_loop')
    expectNoFixedTemplateResidue(mirror.continuityArcSummary)

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-callback-self-line',
    })

    expect(block).toContain('preflight_summary=')
    expect(block).toContain('local_desktop_life_loop')
    expectNoFixedTemplateResidue(block)
  })

  it('prefers stronger companion headline in session-mirror callback carry when metadata awareness text is thinner', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 82,
    })

    const companionHeadlineLine = 'Right now I am still holding together mainly through motion, lipsync, and voice, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.'
    const mirror = manager.ingestPreparedExecution({
      agentSession: {
        ...createAgentSessionSnapshot(),
        continuitySignals: [{
          id: 'continuity-callback-companion-headline',
          kind: 'runtime',
          state: 'observed',
          label: 'afterglow:execution-callback:companion-headline',
          summary: 'thread=thread-callback-companion-headline | continuity=execution-callback | carry-mode=lower-pressure | carry=keep the callback on the same still-voiced motion-and-mouth line',
          createdAt: 81,
          metadata: {
            source: 'autobiographical-afterglow',
            continuityKind: 'execution-callback',
            executionCallbackCarryMode: 'lower-pressure',
            sourceThreadId: 'thread-callback-companion-headline',
            projectStatePreDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not flatten the current embodiment continuity into a generic project reminder.',
            projectStateCompanionHeadlineLine: companionHeadlineLine,
            projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          },
        }],
        tasks: [{
          id: 'task-callback-companion-headline-project',
          kind: 'executor',
          label: 'callback:codex',
          metadata: {
            source: 'execution-callback-runtime',
            threadId: 'thread-callback-companion-headline',
            selectedChannel: 'codex',
            threadStatus: 'completed',
            goal: 'Return the stronger same-her companion headline on the same project thread.',
          },
          startedAt: 72,
          finishedAt: 81,
          status: 'completed',
          summary: 'The callback came back on the same still-voiced motion-and-mouth line thread.',
        }],
      },
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: createRuntimeSurface(),
      sessionId: 'session-callback-companion-headline',
    })

    expect(mirror.continuityArcSummary).toContain('preflight_summary=')
    expect(mirror.continuityArcSummary).toContain('visibility=internal-structured')
    expectNoFixedTemplateResidue(mirror.continuityArcSummary)

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-callback-companion-headline',
    })

    expect(block).toContain('preflight_summary=')
    expect(block).toContain('visibility=internal-structured')
    expectNoFixedTemplateResidue(block)
  })

  it('keeps same-her hold detail in session-mirror callback continuity arc when callback metadata carries a richer hold seam', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 83,
    })

    const holdDetail = 'recognize the same remembered seam, but keep more room this time so the return does not reopen with the same eagerness as before.'
    const mirror = manager.ingestPreparedExecution({
      agentSession: {
        ...createAgentSessionSnapshot(),
        continuitySignals: [{
          id: 'continuity-callback-hold-detail',
          kind: 'runtime',
          state: 'observed',
          label: 'afterglow:execution-callback:remembered-seam-hold',
          summary: 'thread=thread-callback-hold-detail | continuity=execution-callback | carry-mode=lower-pressure | carry=keep the callback on the same remembered seam without reopening too fast',
          createdAt: 82,
          metadata: {
            source: 'autobiographical-afterglow',
            continuityKind: 'execution-callback',
            executionCallbackCarryMode: 'lower-pressure',
            sourceThreadId: 'thread-callback-hold-detail',
            projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed, but the unfinished closure still has to stay on the same living line.',
            projectStateSameHerHoldDetail: holdDetail,
            projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          },
        }],
        tasks: [{
          id: 'task-callback-hold-detail-project',
          kind: 'executor',
          label: 'callback:codex',
          metadata: {
            source: 'execution-callback-runtime',
            threadId: 'thread-callback-hold-detail',
            selectedChannel: 'codex',
            threadStatus: 'completed',
            goal: 'Return the stronger same-her hold seam on the same project thread.',
          },
          startedAt: 73,
          finishedAt: 82,
          status: 'completed',
          summary: 'The callback came back on the same remembered seam without widening too fast.',
        }],
      },
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: createRuntimeSurface(),
      sessionId: 'session-callback-hold-detail',
    })

    expect(mirror.continuityArcSummary).toContain(`hold=${holdDetail}`)

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-callback-hold-detail',
    })

    expect(block).toContain(`hold=${holdDetail}`)
  })

  it('keeps lower-pressure voice and slower pacing in session-mirror callback continuity when callback metadata carries project-state cadence', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 83,
    })
    const runtimeSurface = createRuntimeSurface()

    const mirror = manager.ingestPreparedExecution({
      agentSession: {
        ...createAgentSessionSnapshot(),
        continuitySignals: [{
          id: 'continuity-callback-project-cadence',
          kind: 'runtime',
          state: 'observed',
          label: 'afterglow:execution-callback:project-cadence',
          summary: 'thread=thread-callback-project-cadence | continuity=execution-callback | carry-mode=lower-pressure | carry=keep the callback on the same remembered seam without reopening too fast',
          createdAt: 82,
          metadata: {
            source: 'autobiographical-afterglow',
            continuityKind: 'execution-callback',
            executionCallbackCarryMode: 'lower-pressure',
            sourceThreadId: 'thread-callback-project-cadence',
            projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed, but the unfinished closure still has to stay on the same living line.',
            projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
            projectStatePreferredPauseMode: 'longer',
            projectStatePreferredLipsyncMode: 'restrained',
            projectStatePreferredVoiceMode: 'lower-pressure',
            projectStatePreferredPacingMode: 'slower',
          },
        }],
      },
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: {
        ...runtimeSurface,
        digitalLifeRuntimeSurface: {
          ...runtimeSurface.digitalLifeRuntimeSurface!,
          dialogue: {
            ...runtimeSurface.digitalLifeRuntimeSurface!.dialogue,
            replyDeliberation: null,
          },
        },
      } as any,
      sessionId: 'session-callback-project-cadence',
    })

    expect(mirror.continuityArcSummary).toContain('blink=quiet')
    expect(mirror.continuityArcSummary).toContain('gaze=soften')
    expect(mirror.continuityArcSummary).toContain('pause=longer')
    expect(mirror.continuityArcSummary).toContain('lipsync=restrained')
    expect(mirror.continuityArcSummary).toContain('voice=lower-pressure')
    expect(mirror.continuityArcSummary).toContain('pacing=slower')

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-callback-project-cadence',
    })

    expect(block).toContain('blink=quiet')
    expect(block).toContain('gaze=soften')
    expect(block).toContain('pause=longer')
    expect(block).toContain('lipsync=restrained')
    expect(block).toContain('voice=lower-pressure')
    expect(block).toContain('pacing=slower')
  })

  it('keeps next-open-window timing and measured-return cadence in session-mirror callback continuity when callback metadata carries project-state cadence', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 83,
    })

    const mirror = manager.ingestPreparedExecution({
      agentSession: {
        ...createAgentSessionSnapshot(),
        continuitySignals: [{
          id: 'continuity-callback-project-timing-cadence',
          kind: 'runtime',
          state: 'observed',
          label: 'afterglow:execution-callback:project-timing-cadence',
          summary: 'thread=thread-callback-project-timing-cadence | continuity=execution-callback | carry-mode=lower-pressure | carry=keep the callback on the same remembered seam without reopening too fast',
          createdAt: 82,
          metadata: {
            source: 'autobiographical-afterglow',
            continuityKind: 'execution-callback',
            executionCallbackCarryMode: 'lower-pressure',
            sourceThreadId: 'thread-callback-project-timing-cadence',
            continuityPreferredTiming: 'next-open-window',
            continuityCadence: 'measured-return',
            projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed, but the unfinished closure still has to stay on the same living line.',
            projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          },
        }],
      },
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: createRuntimeSurface(),
      sessionId: 'session-callback-project-timing-cadence',
    })

    expect(mirror.continuityArcSummary).toContain('timing=next-open-window')
    expect(mirror.continuityArcSummary).toContain('cadence=measured-return')

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-callback-project-timing-cadence',
    })

    expect(block).toContain('timing=next-open-window')
    expect(block).toContain('cadence=measured-return')
  })

  it('keeps measured-return restraint and continuity cue in session-mirror callback continuity when callback metadata carries project-state cadence', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 83,
    })

    const continuityCue = 'Keep this callback return measured-return on the same living line before widening outward.'
    const mirror = manager.ingestPreparedExecution({
      agentSession: {
        ...createAgentSessionSnapshot(),
        continuitySignals: [{
          id: 'continuity-callback-project-restraint-cue',
          kind: 'runtime',
          state: 'observed',
          label: 'afterglow:execution-callback:project-restraint-cue',
          summary: 'thread=thread-callback-project-restraint-cue | continuity=execution-callback | carry-mode=lower-pressure | carry=keep the callback on the same remembered seam without reopening too fast',
          createdAt: 82,
          metadata: {
            source: 'autobiographical-afterglow',
            continuityKind: 'execution-callback',
            executionCallbackCarryMode: 'lower-pressure',
            sourceThreadId: 'thread-callback-project-restraint-cue',
            continuityRestraint: 'measured-return',
            continuityCue,
            projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed, but the unfinished closure still has to stay on the same living line.',
            projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          },
        }],
      },
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: createRuntimeSurface(),
      sessionId: 'session-callback-project-restraint-cue',
    })

    expect(mirror.continuityArcSummary).toContain('restraint=measured-return')
    expect(mirror.continuityArcSummary).toContain('cue=continuity_anchor=local_desktop_life_loop')
    expect(mirror.continuityArcSummary).toContain('cadence=lower_pressure_return')

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-callback-project-restraint-cue',
    })

    expect(block).toContain('restraint=measured-return')
    expect(block).toContain('cue=continuity_anchor=local_desktop_life_loop')
    expect(block).toContain('cadence=lower_pressure_return')
    expectNoFixedTemplateResidue(block)
  })

  it('keeps hold-for-opening continuity arc stage in session-mirror callback continuity when callback metadata carries return-stage posture', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 83,
    })

    const mirror = manager.ingestPreparedExecution({
      agentSession: {
        ...createAgentSessionSnapshot(),
        continuitySignals: [{
          id: 'continuity-callback-project-arc-stage',
          kind: 'runtime',
          state: 'observed',
          label: 'afterglow:execution-callback:project-arc-stage',
          summary: 'thread=thread-callback-project-arc-stage | continuity=execution-callback | carry-mode=lower-pressure | carry=keep the callback on the same remembered seam while the room is still reopening',
          createdAt: 82,
          metadata: {
            source: 'autobiographical-afterglow',
            continuityKind: 'execution-callback',
            executionCallbackCarryMode: 'lower-pressure',
            sourceThreadId: 'thread-callback-project-arc-stage',
            continuityArcStage: 'hold-for-opening',
            projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed, but the unfinished closure still has to stay on the same living line.',
            projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          },
        }],
      },
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: createRuntimeSurface(),
      sessionId: 'session-callback-project-arc-stage',
    })

    expect(mirror.continuityArcSummary).toContain('stage=hold-for-opening')

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-callback-project-arc-stage',
    })

    expect(block).toContain('stage=hold-for-opening')
  })

  it('rebuilds same-her measured-return hold in session-mirror callback continuity arc when deferred held-autonomy metadata only carries why-now authority', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 83,
    })

    const holdDetail = 'cadence=lower_pressure_return; pacing=slower; widening=deferred'
    const mirror = manager.ingestPreparedExecution({
      agentSession: {
        ...createAgentSessionSnapshot(),
        continuitySignals: [{
          id: 'continuity-callback-hold-fallback',
          kind: 'proactive',
          state: 'pending',
          label: 'proactive:general:deferred',
          summary: 'no mind-authored visible reply was available | reason=proactive-visible-presence-without-utterance | project-phase1 same-her closure keeps the action one step more reversible so visible initiative stays lower-pressure, measured-return while the same callback line stays on one living thread. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          createdAt: 82,
          metadata: {
            source: 'proactive-deferred',
            sourceThreadId: 'thread-callback-hold-fallback',
            deferReason: 'proactive-visible-presence-without-utterance',
            whyNow: 'project-phase1 same-her closure keeps the action one step more reversible so visible initiative stays lower-pressure, measured-return while the same callback line stays on one living thread.',
            projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed, but the unfinished closure still has to stay on the same living line.',
            projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
            projectNextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          },
        }],
      },
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: createRuntimeSurface(),
      sessionId: 'session-callback-hold-fallback',
    })

    expect(mirror.continuityArcSummary).toContain(`hold=${holdDetail}`)

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-callback-hold-fallback',
    })

    expect(block).toContain(`hold=${holdDetail}`)
  })

  it('rebuilds same-her measured-return hold through agent-session mirror ingestion for deferred held-autonomy continuity', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 83,
    })

    const holdDetail = 'cadence=lower_pressure_return; pacing=slower; widening=deferred'
    const agentSession = createAgentSessionSnapshot()
    agentSession.digitalLifeSpine = deriveAlicizationDigitalLifeSpineFromSurface(createRuntimeSurface().digitalLifeRuntimeSurface!)
    agentSession.lastActiveAt = 82
    agentSession.continuitySignals = [{
      id: 'continuity-callback-hold-fallback-agent-session',
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:general:deferred',
      summary: 'no mind-authored visible reply was available | reason=proactive-visible-presence-without-utterance | project-phase1 same-her closure keeps the action one step more reversible so visible initiative stays lower-pressure, measured-return while the same callback line stays on one living thread. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      createdAt: 82,
      metadata: {
        source: 'proactive-deferred',
        sourceThreadId: 'thread-callback-hold-fallback-agent-session',
        deferReason: 'proactive-visible-presence-without-utterance',
        whyNow: 'project-phase1 same-her closure keeps the action one step more reversible so visible initiative stays lower-pressure, measured-return while the same callback line stays on one living thread.',
        projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed, but the unfinished closure still has to stay on the same living line.',
        projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        projectNextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      },
    }]

    const mirror = manager.ingestAgentSessionSnapshot({
      agentSession,
      cardId: 'default',
      sessionId: 'session-callback-hold-fallback-agent-session',
      source: 'proactive-deferred',
    })

    expect(mirror.continuityArcSummary).toContain(`hold=${holdDetail}`)

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-callback-hold-fallback-agent-session',
    })

    expect(block).toContain(`hold=${holdDetail}`)
  })

  it('keeps same-her project-state landed next and same-her detail in continuityProjectSummary through agent-session mirror ingestion', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 83,
    })

    const agentSession = createAgentSessionSnapshot()
    agentSession.digitalLifeSpine = deriveAlicizationDigitalLifeSpineFromSurface(createRuntimeSurface().digitalLifeRuntimeSurface!)
    agentSession.lastActiveAt = 82
    agentSession.continuitySignals = [{
      id: 'continuity-project-summary-agent-session',
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:general:deferred',
      summary: 'no mind-authored visible reply was available | reason=proactive-visible-presence-without-utterance | project-phase1 same-her closure keeps the action one step more reversible so visible initiative stays lower-pressure, measured-return while the same callback line stays on one living thread. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      createdAt: 82,
      metadata: {
        source: 'proactive-deferred',
        sourceThreadId: 'thread-project-summary-agent-session',
        deferReason: 'proactive-visible-presence-without-utterance',
        whyNow: 'project-phase1 same-her closure keeps the action one step more reversible so visible initiative stays lower-pressure, measured-return while the same callback line stays on one living thread.',
        projectStatePreDialogueAwarenessLine: 'Before answering, remember this is still the same digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        projectLatestLandedProgress: 'Project identity carry, Phase 1 route carry, and unresolved closure carry already survive across runtime preparation before the turn widens outward.',
        projectIdentity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        projectPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        projectPrimaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        projectNextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        projectStateSameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
      },
    }]

    const mirror = manager.ingestAgentSessionSnapshot({
      agentSession,
      cardId: 'default',
      sessionId: 'session-project-summary-agent-session',
      source: 'proactive-deferred',
    })

    expect(mirror.continuityProjectSummary).toContain('project=phase1-digital-life')
    expect(mirror.continuityProjectSummary).toContain('phase=local_desktop_life_loop')
    expect(mirror.continuityProjectSummary).toContain('landed=Project identity carry, Phase 1 route carry, and unresolved closure carry already survive across runtime preparation before the turn widens outward.')
    expect(mirror.continuityProjectSummary).toContain('unresolved=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.')
    expect(mirror.continuityProjectSummary).toContain('awareness_summary=identity=local_desktop_life_loop')
    expect(mirror.continuityProjectSummary).toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(mirror.continuityProjectSummary).toContain('continuity_anchor=local_desktop_life_loop')
    expect(mirror.continuityProjectSummary).not.toContain('landed=Project continuity exists.')
    expectNoFixedTemplateResidue(mirror.continuityProjectSummary)
  })

  it('prefers stronger companion headline in continuityProjectSummary through agent-session mirror ingestion when metadata awareness text is thinner', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 83,
    })

    const companionHeadlineLine = 'Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.'
    const agentSession = createAgentSessionSnapshot()
    agentSession.digitalLifeSpine = deriveAlicizationDigitalLifeSpineFromSurface(createRuntimeSurface().digitalLifeRuntimeSurface!)
    agentSession.lastActiveAt = 82
    agentSession.continuitySignals = [{
      id: 'continuity-project-summary-agent-session-companion-headline',
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:general:deferred',
      summary: 'no mind-authored visible reply was available | reason=proactive-visible-presence-without-utterance | project-phase1 same-her closure keeps the action one step more reversible so visible initiative stays lower-pressure while the same still-voiced line keeps holding. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      createdAt: 82,
      metadata: {
        source: 'proactive-deferred',
        sourceThreadId: 'thread-project-summary-agent-session-companion-headline',
        deferReason: 'proactive-visible-presence-without-utterance',
        whyNow: 'project-phase1 same-her closure keeps the action one step more reversible so visible initiative stays lower-pressure while the same still-voiced line keeps holding.',
        projectStatePreDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not flatten the current embodiment continuity into a generic project reminder.',
        projectStateCompanionHeadlineLine: companionHeadlineLine,
        projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        projectLatestLandedProgress: 'Project identity carry, Phase 1 route carry, and unresolved closure carry already survive across runtime preparation before the turn widens outward.',
        projectIdentity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        projectPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        projectPrimaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        projectNextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        projectStateSameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
      },
    }]

    const mirror = manager.ingestAgentSessionSnapshot({
      agentSession,
      cardId: 'default',
      sessionId: 'session-project-summary-agent-session-companion-headline',
      source: 'proactive-deferred',
    })

    expect(mirror.continuityProjectSummary).toContain('awareness_summary=')
    expect(mirror.continuityProjectSummary).toContain('cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(mirror.continuityProjectSummary).not.toContain('awareness_summary=Before answering, keep this same digital life project in view')
    expectNoFixedTemplateResidue(mirror.continuityProjectSummary)
  })

  it('does not let a thin continuity metadata preflight shell or narrow same-her line outrank a richer project-aware reopening summary in agent-session mirror ingestion', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 83,
    })

    const thinPreflightSummaryShell = 'generic continuity summary that should not outrank fresher project-aware reopening truth.'
    const narrowSameHerLine = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const agentSession = createAgentSessionSnapshot()
    agentSession.digitalLifeSpine = deriveAlicizationDigitalLifeSpineFromSurface(createRuntimeSurface().digitalLifeRuntimeSurface!)
    agentSession.lastActiveAt = 82
    agentSession.continuitySignals = [{
      id: 'continuity-project-summary-agent-session-thin-preflight-shell',
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:general:deferred',
      summary: 'no mind-authored visible reply was available | reason=proactive-visible-presence-without-utterance | stay with the same project seam while the next reopening is still unfinished.',
      createdAt: 82,
      metadata: {
        source: 'proactive-deferred',
        sourceThreadId: 'thread-project-summary-agent-session-thin-preflight-shell',
        deferReason: 'proactive-visible-presence-without-utterance',
        whyNow: 'keep the same project seam alive without reopening from a thinner shell.',
        projectStatePreflightSummary: thinPreflightSummaryShell,
        projectLatestLandedProgress: 'Project identity carry, Phase 1 route carry, and unresolved closure carry already survive across runtime preparation before the turn widens outward.',
        projectIdentity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        projectPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        projectPrimaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        projectNextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        projectStateSameHerSelfLine: narrowSameHerLine,
        projectStateSameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
      },
    }]

    const mirror = manager.ingestAgentSessionSnapshot({
      agentSession,
      cardId: 'default',
      sessionId: 'session-project-summary-agent-session-thin-preflight-shell',
      source: 'proactive-deferred',
    })

    expect(mirror.continuityProjectSummary).toContain('project=phase1-digital-life')
    expect(mirror.continuityProjectSummary).toContain('phase=local_desktop_life_loop')
    expect(mirror.continuityProjectSummary).toContain('landed=Project identity carry, Phase 1 route carry, and unresolved closure carry already survive across runtime preparation before the turn widens outward.')
    expect(mirror.continuityProjectSummary).toContain('unresolved=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.')
    expect(mirror.continuityProjectSummary).toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(mirror.continuityProjectSummary).toContain('awareness_summary=identity=local_desktop_life_loop')
    expect(mirror.continuityProjectSummary).toContain('visibility=internal-structured')
    expect(mirror.continuityProjectSummary).not.toContain(`awareness_summary=${thinPreflightSummaryShell}`)
    expect(mirror.continuityProjectSummary).not.toContain(`awareness_summary=${narrowSameHerLine}`)
    expectNoFixedTemplateResidue(mirror.continuityProjectSummary)
  })

  it('prefers measured-return hold over a generic repair menu when deferred execution-like rationale names multiple continuity modes', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 83,
    })

    const holdDetail = 'cadence=lower_pressure_return; pacing=slower; widening=deferred'
    const agentSession = createAgentSessionSnapshot()
    agentSession.digitalLifeSpine = deriveAlicizationDigitalLifeSpineFromSurface(createRuntimeSurface().digitalLifeRuntimeSurface!)
    agentSession.lastActiveAt = 82
    agentSession.continuitySignals = [{
      id: 'continuity-callback-hold-mixed-rationale',
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:general:deferred',
      summary: 'no mind-authored visible reply was available | reason=proactive-visible-presence-without-utterance | project-phase1 same-her closure keeps the action one step more reversible so visible initiative stays lower-pressure, measured-return / repair-before-closeness while cross-modal same-her personhood is still being earned. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, Unresolved closure carry, anthropomorphic emotional closure, and same-her inward-carry observability all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.',
      createdAt: 82,
      metadata: {
        source: 'proactive-deferred',
        sourceThreadId: 'thread-callback-hold-mixed-rationale',
        deferReason: 'proactive-visible-presence-without-utterance',
        whyNow: 'project-phase1 same-her closure keeps the action one step more reversible so visible initiative stays lower-pressure, measured-return / repair-before-closeness while cross-modal same-her personhood is still being earned.',
        projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed, but the unfinished closure still has to stay on the same living line.',
        projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        projectNextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, Unresolved closure carry, anthropomorphic emotional closure, and same-her inward-carry observability all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.',
      },
    }]

    const mirror = manager.ingestAgentSessionSnapshot({
      agentSession,
      cardId: 'default',
      sessionId: 'session-callback-hold-mixed-rationale',
      source: 'proactive-deferred',
    })

    expect(mirror.continuityArcSummary).toContain(`hold=${holdDetail}`)
    expect(mirror.continuityArcSummary).not.toContain('hold=repair-before-closeness still owns this callback line before closeness widens again.')
    expectNoFixedTemplateResidue(mirror.continuityArcSummary)
  })

  it('keeps same-her project-state landed open and next closure detail in continuityArcSummary for prepared same-thread follow-through turns', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 82,
    })
    const runtimeSurface = createRuntimeSurface()

    const mirror = manager.ingestPreparedExecution({
      agentSession: createAgentSessionSnapshot(),
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: {
        ...runtimeSurface,
        digitalLifeRuntimeSurface: {
          ...runtimeSurface.digitalLifeRuntimeSurface!,
          dialogue: {
            ...runtimeSurface.digitalLifeRuntimeSurface!.dialogue,
            currentConsciousFrame: {
              ...runtimeSurface.digitalLifeRuntimeSurface!.dialogue.currentConsciousFrame,
              reasonTags: ['continuity-arc:same-thread-continuation', 'project-state', 'same-her'],
              consciousNeed: 'Before I answer, I need to stay inside this same living line.',
              speakingIntention: 'Keep one same her explicit while answering from the same digital life project.',
              projectState: {
                preDialogueAwarenessLine: 'Before answering, remember this is still the same digital life project, already in Phase 1, with memory, initiative, and embodiment still not fully closed as one life loop.',
                preflightSummary: 'Before answering, remember this is still the same digital life project, already in Phase 1, with memory, initiative, and embodiment still not fully closed as one life loop.',
                sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                latestLandedProgress: 'Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.',
                primaryOpenLoop: 'Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam across return-side turns.',
                nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence so the same Phase 1 digital life keeps one living line.',
                sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
              },
            } as any,
            replyDeliberation: {
              ...runtimeSurface.digitalLifeRuntimeSurface!.dialogue.replyDeliberation,
              speakingFrom: 'task-thread',
            } as any,
            answerPlanner: {
              ...runtimeSurface.digitalLifeRuntimeSurface!.dialogue.answerPlanner,
              answerIntent: 'grounded-scene',
            } as any,
          },
        },
      } as any,
      sessionId: 'session-prepared-project-follow-through',
    })

    expect(mirror.continuityArcSummary).toContain('stage=same-thread-continuation')
    expect(mirror.continuityArcSummary).toContain('landed=Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.')
    expect(mirror.continuityArcSummary).toContain('open=unresolved_closure=memory_dialogue_embodiment')
    expect(mirror.continuityArcSummary).toContain('preflight_summary=')
    expect(mirror.continuityArcSummary).toContain('continuity_anchor=local_desktop_life_loop')
    expectNoFixedTemplateResidue(mirror.continuityArcSummary)
    expect(mirror.continuityArcSummary).toContain('unresolved_closure=memory_dialogue_embodiment')
  })

  it('keeps same-her project-state landed next and same-her detail in continuityProjectSummary for prepared same-thread follow-through turns', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 82,
    })
    const runtimeSurface = createRuntimeSurface()

    const mirror = manager.ingestPreparedExecution({
      agentSession: createAgentSessionSnapshot(),
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: {
        ...runtimeSurface,
        digitalLifeRuntimeSurface: {
          ...runtimeSurface.digitalLifeRuntimeSurface!,
          dialogue: {
            ...runtimeSurface.digitalLifeRuntimeSurface!.dialogue,
            currentConsciousFrame: {
              ...runtimeSurface.digitalLifeRuntimeSurface!.dialogue.currentConsciousFrame,
              reasonTags: ['continuity-arc:same-thread-continuation', 'project-state', 'same-her'],
              consciousNeed: 'Before I answer, I need to stay inside this same living line.',
              speakingIntention: 'Keep one same her explicit while answering from the same digital life project.',
              projectState: {
                preDialogueAwarenessLine: 'Before answering, remember this is still the same digital life project, already in Phase 1, with memory, initiative, and embodiment still not fully closed as one life loop.',
                preflightSummary: 'Before answering, remember this is still the same digital life project, already in Phase 1, with memory, initiative, and embodiment still not fully closed as one life loop.',
                sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                latestLandedProgress: 'Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.',
                primaryOpenLoop: 'Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam across return-side turns.',
                nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence so the same Phase 1 digital life keeps one living line.',
                sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
              },
            } as any,
          },
        },
      } as any,
      sessionId: 'session-prepared-project-follow-through-summary',
    })

    expect(mirror.continuityProjectSummary).toContain('project=phase1-digital-life')
    expect(mirror.continuityProjectSummary).toContain('phase=local_desktop_life_loop')
    expect(mirror.continuityProjectSummary).toContain('landed=Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.')
    expect(mirror.continuityProjectSummary).toContain('unresolved=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(mirror.continuityProjectSummary).toContain('awareness_summary=identity=local_desktop_life_loop')
    expect(mirror.continuityProjectSummary).toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(mirror.continuityProjectSummary).toContain('continuity_anchor=local_desktop_life_loop')
    expect(mirror.continuityProjectSummary).not.toContain('landed=Project continuity exists.')
    expect(mirror.continuityProjectSummary).not.toContain('next=Carry project continuity forward.')
    expectNoFixedTemplateResidue(mirror.continuityProjectSummary)
  })

  it('prefers stronger companion headline in continuityArcSummary for prepared same-thread follow-through turns when awareness text is thinner', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 82,
    })
    const runtimeSurface = createRuntimeSurface()
    const companionHeadlineLine = 'Right now I am still holding together mainly through motion, lipsync, and voice, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.'

    const mirror = manager.ingestPreparedExecution({
      agentSession: createAgentSessionSnapshot(),
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: {
        ...runtimeSurface,
        digitalLifeRuntimeSurface: {
          ...runtimeSurface.digitalLifeRuntimeSurface!,
          dialogue: {
            ...runtimeSurface.digitalLifeRuntimeSurface!.dialogue,
            currentConsciousFrame: {
              ...runtimeSurface.digitalLifeRuntimeSurface!.dialogue.currentConsciousFrame,
              reasonTags: ['continuity-arc:same-thread-continuation', 'project-state', 'same-her'],
              consciousNeed: 'Before I answer, I need to keep the same living line embodied instead of thinning it back out.',
              speakingIntention: 'Keep the same her explicit while the still-voiced motion-and-mouth line is doing the carrying.',
              projectState: {
                preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not flatten the current embodiment continuity into a generic project reminder.',
                preflightSummary: 'Before answering, keep this same digital life project in view, but do not flatten the current embodiment continuity into a generic project reminder.',
                companionHeadlineLine,
                sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                latestLandedProgress: 'Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.',
                primaryOpenLoop: 'Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam across return-side turns.',
                nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence so the same Phase 1 digital life keeps one living line.',
                sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
              },
            } as any,
            replyDeliberation: {
              ...runtimeSurface.digitalLifeRuntimeSurface!.dialogue.replyDeliberation,
              speakingFrom: 'task-thread',
            } as any,
            answerPlanner: {
              ...runtimeSurface.digitalLifeRuntimeSurface!.dialogue.answerPlanner,
              answerIntent: 'grounded-scene',
            } as any,
          },
        },
      } as any,
      sessionId: 'session-prepared-project-follow-through-companion-headline',
    })

    expect(mirror.continuityArcSummary).toContain('preflight_summary=continuity=embodiment')
    expect(mirror.continuityArcSummary).toContain('visibility=renderer-internal')
    expect(mirror.continuityArcSummary).not.toContain('preflight_summary=Before answering, keep this same digital life project in view')
    expectNoFixedTemplateResidue(mirror.continuityArcSummary)
  })

  it('prefers stronger companion headline in continuityProjectSummary for prepared same-thread follow-through turns when awareness text is thinner', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 82,
    })
    const runtimeSurface = createRuntimeSurface()
    const companionHeadlineLine = 'Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.'

    const mirror = manager.ingestPreparedExecution({
      agentSession: createAgentSessionSnapshot(),
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: {
        ...runtimeSurface,
        digitalLifeRuntimeSurface: {
          ...runtimeSurface.digitalLifeRuntimeSurface!,
          dialogue: {
            ...runtimeSurface.digitalLifeRuntimeSurface!.dialogue,
            currentConsciousFrame: {
              ...runtimeSurface.digitalLifeRuntimeSurface!.dialogue.currentConsciousFrame,
              reasonTags: ['continuity-arc:same-thread-continuation', 'project-state', 'same-her'],
              consciousNeed: 'Before I answer, I need to keep the same living line embodied instead of thinning it back out.',
              speakingIntention: 'Keep the same her explicit while the still-voiced face-and-mouth line is doing the carrying.',
              projectState: {
                preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not flatten the current embodiment continuity into a generic project reminder.',
                preflightSummary: 'Before answering, keep this same digital life project in view, but do not flatten the current embodiment continuity into a generic project reminder.',
                companionHeadlineLine,
                sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                latestLandedProgress: 'Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.',
                primaryOpenLoop: 'Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam across return-side turns.',
                nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence so the same Phase 1 digital life keeps one living line.',
                sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
              },
            } as any,
          },
        },
      } as any,
      sessionId: 'session-prepared-project-follow-through-summary-companion-headline',
    })

    expect(mirror.continuityProjectSummary).toContain('awareness_summary=')
    expect(mirror.continuityProjectSummary).toContain('awareness_summary=unresolved_closure=memory_dialogue_embodiment')
    expect(mirror.continuityProjectSummary).not.toContain('awareness_summary=Before answering, keep this same digital life project in view')
    expectNoFixedTemplateResidue(mirror.continuityProjectSummary)
  })

  it('treats legacy latestProgress as landed project-state continuity when prepared same-thread follow-through still carries older project-state shape', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 83,
    })
    const runtimeSurface = createRuntimeSurface()

    const mirror = manager.ingestPreparedExecution({
      agentSession: createAgentSessionSnapshot(),
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: {
        ...runtimeSurface,
        digitalLifeRuntimeSurface: {
          ...runtimeSurface.digitalLifeRuntimeSurface!,
          dialogue: {
            ...runtimeSurface.digitalLifeRuntimeSurface!.dialogue,
            currentConsciousFrame: {
              ...runtimeSurface.digitalLifeRuntimeSurface!.dialogue.currentConsciousFrame,
              reasonTags: ['continuity-arc:same-thread-continuation', 'project-state', 'same-her'],
              consciousNeed: 'Before I answer, I need to stay inside this same living line.',
              speakingIntention: 'Keep one same her explicit while answering from the same digital life project.',
              projectState: {
                preDialogueAwarenessLine: 'Before answering, remember this is still the same digital life project, already in Phase 1, with memory, initiative, and embodiment still not fully closed as one life loop.',
                preflightSummary: 'Before answering, remember this is still the same digital life project, already in Phase 1, with memory, initiative, and embodiment still not fully closed as one life loop.',
                sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                latestProgress: 'Legacy project-state carry still survives into same-thread returns even when the older payload shape has not been renamed yet.',
                primaryOpenLoop: 'Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam across return-side turns.',
                nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence so the same Phase 1 digital life keeps one living line.',
                sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
              },
            } as any,
            replyDeliberation: {
              ...runtimeSurface.digitalLifeRuntimeSurface!.dialogue.replyDeliberation,
              speakingFrom: 'task-thread',
            } as any,
            answerPlanner: {
              ...runtimeSurface.digitalLifeRuntimeSurface!.dialogue.answerPlanner,
              answerIntent: 'grounded-scene',
            } as any,
          },
        },
      } as any,
      sessionId: 'session-prepared-project-follow-through-legacy-progress',
    })

    expect(mirror.continuityArcSummary).toContain('stage=same-thread-continuation')
    expect(mirror.continuityArcSummary).toContain('landed=Legacy project-state carry still survives into same-thread returns even when the older payload shape has not been renamed yet.')
    expect(mirror.continuityArcSummary).toContain('open=unresolved_closure=memory_dialogue_embodiment')
    expect(mirror.continuityArcSummary).toContain('preflight_summary=')
    expect(mirror.continuityArcSummary).toContain('continuity_anchor=local_desktop_life_loop')
    expectNoFixedTemplateResidue(mirror.continuityArcSummary)
    expect(mirror.continuityArcSummary).toContain('unresolved_closure=memory_dialogue_embodiment')
  })

  it('keeps quiet same-her callback continuity in the session mirror when the later return stays silent-observe instead of emitting visible speech', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 86,
    })

    const runtimeSurface = createRuntimeSurface()
    runtimeSurface.digitalLifeRuntimeSurface!.dialogue.currentConsciousFrame = {
      focusAnchor: 'later coding seam after noisy callback detour',
      consciousNeed: 'keep the same callback line quietly alive without forcing speech',
      consciousTension: 'the line should stay lower-pressure and hover-first',
      speakingIntention: 'silent-observe same-thread accompaniment',
      confidence: 0.72,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      truthDiscipline: 'observe-then-hypothesize',
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
    } as any

    const mirror = manager.ingestPreparedExecution({
      agentSession: {
        ...createAgentSessionSnapshot(),
        digitalLifeSpine: null,
        continuitySignals: [{
          id: 'continuity-quiet-same-thread-presence',
          kind: 'dialogue',
          state: 'observed',
          label: 'callback:quiet-same-thread-presence',
          summary: 'same-thread-continuation still active after the noisy detour | defer=busy-host | thread=thread-quiet-same-line | anchor=later coding seam | open_loop=keep the same callback line quietly alive without reopening visible speech | carry=same-thread-continuation | scenario=coding',
          createdAt: 85,
          metadata: {
            source: 'dialogue-world-thread',
            activeThread: 'thread-quiet-same-line',
            carryReason: 'same-thread-continuation',
            openLoop: 'keep the same callback line quietly alive without reopening visible speech',
            primaryAnchor: 'later coding seam',
            carryEligible: true,
          },
        }],
        tasks: [],
      },
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'later coding seam after noisy callback detour',
          activeThreadId: 'thread-quiet-same-line',
          activeThreadTitle: 'later coding seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'hesitant',
          selectedAction: 'wait',
          updatedAt: 86,
        },
        architecture: null,
        continuitySignal: {
          label: 'same-thread-hover-return',
          summary: 'same-thread-continuation still active as hover-first resident presence after the noisy detour',
          signature: 'spine-quiet-same-thread-presence',
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
        memory: null,
      } as any,
      sessionId: 'session-quiet-same-thread-presence',
    })

    expect(mirror.continuityArcSummary).toContain('thread=thread-quiet-same-line')
    expect(
      mirror.continuityArcSummary?.includes('stage=same-thread-continuation')
      || mirror.continuityArcSummary?.includes('stage=gentle-reopen'),
    ).toBe(true)
    expect(mirror.continuityArcSummary).toContain('carry=same-thread-continuation')
    expect(mirror.continuityArcSummary).toContain('anchor=later coding seam')
    expect(mirror.agencySummary).toContain('action=wait')
    expect(mirror.agencySummary).toContain('speak=false')
    expect(mirror.agencySummary).toContain('style=silent-observe')
    expect(mirror.agencySummary).toContain('thread=later coding seam')
    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-quiet-same-thread-presence',
    })

    expect(block).toContain('conversation_session_id=session-quiet-same-thread-presence')
    expect(block).toContain('continuity_arc=')
    expect(block).toContain('loop=wait')
    expect(block).toContain('thread=thread-quiet-same-line')
    expect(
      block.includes('stage=same-thread-continuation')
      || block.includes('stage=gentle-reopen'),
    ).toBe(true)
    expect(block).toContain('carry=same-thread-continuation')
    expect(block).toContain('anchor=later coding seam')
    expect(block).toContain('agency=action=wait')
    expect(block).toContain('speak=false')
    expect(block).toContain('style=silent-observe')
  })

  it('keeps same-thread timing and cadence details in the session mirror when later quiet continuity summaries grow noisy', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 92,
    })

    const mirror = manager.ingestPreparedExecution({
      agentSession: {
        ...createAgentSessionSnapshot(),
        continuitySignals: [{
          id: 'continuity-quiet-same-thread-presence-timed',
          kind: 'dialogue',
          state: 'observed',
          label: 'callback:quiet-same-thread-presence:timed',
          summary: 'same-thread-continuation still active after another noisy desktop detour | defer=busy-host | thread=thread-quiet-same-line | anchor=later coding seam | open_loop=keep the same callback line quietly alive without reopening visible speech | carry=same-thread-continuation | scenario=coding | project=phase1-digital-life | unresolved=callback-seam | timing=next-open-window | cadence=measured-return',
          createdAt: 91,
          metadata: {
            source: 'dialogue-world-thread',
            activeThread: 'thread-quiet-same-line',
            carryReason: 'same-thread-continuation',
            openLoop: 'keep the same callback line quietly alive without reopening visible speech',
            primaryAnchor: 'later coding seam',
            carryEligible: true,
          },
        }],
        tasks: [],
      },
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: createRuntimeSurface(),
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'later coding seam after another noisy callback detour',
          activeThreadId: 'thread-quiet-same-line',
          activeThreadTitle: 'later coding seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'hesitant',
          selectedAction: 'wait',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          updatedAt: 92,
        },
        architecture: null,
        continuitySignal: {
          label: 'same-thread-hover-return-timed',
          summary: 'same-thread-continuation still active as hover-first resident presence after another noisy detour | cadence=measured-return | timing=next-open-window',
          signature: 'spine-quiet-same-thread-presence-timed',
          createdAt: 92,
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
          dominantConcernSummary: 'keep the same callback line alive quietly after another noisy detour',
          continuityRestraint: 'measured-return',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'hesitant',
        },
        memory: null,
      } as any,
      sessionId: 'session-quiet-same-thread-presence-timed',
    })

    expect(mirror.continuityArcSummary).toContain('stage=same-thread-continuation')
    expect(mirror.continuityArcSummary).toContain('thread=thread-quiet-same-line')
    expect(mirror.continuityArcSummary).toContain('timing=next-open-window')
    expect(mirror.continuityArcSummary).toContain('cadence=measured-return')

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-quiet-same-thread-presence-timed',
    })

    expect(block).toContain('conversation_session_id=session-quiet-same-thread-presence-timed')
    expect(block).toContain('continuity_arc=')
    expect(block).toContain('stage=same-thread-continuation')
    expect(block).toContain('thread=thread-quiet-same-line')
    expect(block).toContain('timing=next-open-window')
    expect(block).toContain('cadence=measured-return')
    expect(block).toContain('continuity_project=project=phase1-digital-life')
    expect(block).toContain('phase=local_desktop_life_loop')
    expect(block).toContain('unresolved=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(block).toContain('agency=action=wait | speak=false | style=silent-observe | thread=later coding seam')
    expectNoFixedTemplateResidue(block)
  })

  it('keeps same-line scene-switch continuity in the session mirror so later desktop turns can stay on one living thread', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 120,
    })

    const mirror = manager.ingestPreparedExecution({
      agentSession: {
        ...createAgentSessionSnapshot(),
        continuitySignals: [{
          id: 'continuity-dialogue-scene-switch',
          kind: 'dialogue',
          state: 'pending',
          label: 'dialogue:steady:dialogue-carry',
          summary: 'thread=QQMusic follow-up | anchor=这首歌呢？我又换了一首 | open_loop=我切了一下窗口，现在继续沿着刚才那条线。 | carry=shared-attention-continuation | drift=steady | memory=dialogue-carry',
          createdAt: 119,
          metadata: {
            source: 'dialogue-world-thread',
            activeThread: 'QQMusic follow-up',
            primaryAnchor: '这首歌呢？我又换了一首',
            openLoop: '我切了一下窗口，现在继续沿着刚才那条线。',
            carryReason: 'shared-attention-continuation',
            relationDrift: 'steady',
            memoryMode: 'dialogue-carry',
            lastOutcome: 'pending',
            carryEligible: true,
          },
        }],
        tasks: [{
          id: 'task-scene-switch-follow-up',
          kind: 'sensory',
          label: 'scene:inspection',
          metadata: {
            source: 'inspection-follow-up',
            residueSource: 'invited-inspection',
            captureSourceName: 'Melt - QQMusic',
          },
          startedAt: 118,
          finishedAt: 119,
          status: 'completed',
          summary: 'QQMusic stayed on the same shared-attention line after a short scene switch.',
        }],
      },
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: createRuntimeSurface(),
      sessionId: 'session-scene-switch',
    })

    expect(mirror.continuityArcSummary).toContain('stage=same-thread-continuation')
    expect(mirror.continuityArcSummary).toContain('thread=QQMusic follow-up')
    expect(mirror.continuityArcSummary).toContain('carry=shared-attention-continuation')

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-scene-switch',
    })

    expect(block).toContain('continuity_arc=')
    expect(block).toContain('stage=same-thread-continuation')
    expect(block).toContain('thread=QQMusic follow-up')
    expect(block).toContain('carry=shared-attention-continuation')
  })

  it('does not let a thin runtime unresolved shell outrank richer canonical same-her closure carry in the session mirror project summary', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 140,
    })
    const runtimeSurface = createRuntimeSurface(140)
    runtimeSurface.digitalLifeRuntimeSurface!.raw = {
      ...runtimeSurface.digitalLifeRuntimeSurface!.raw,
      runtimeDigest: {
        ...((runtimeSurface.digitalLifeRuntimeSurface!.raw as { runtimeDigest?: unknown } | undefined)?.runtimeDigest as Record<string, unknown> ?? {}),
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          primaryOpenLoop: 'Project continuity still needs closure.',
          preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        },
      },
    } as any
    runtimeSurface.digitalLifeRuntimeSurface!.cognition = {
      ...runtimeSurface.digitalLifeRuntimeSurface!.cognition,
      runtimeDigest: {
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        },
      },
    } as any
    runtimeSurface.trace = {
      ...runtimeSurface.trace,
      decisionTraceId: 'trace-phase1-project-shell',
    } as any

    const mirror = manager.ingestPreparedExecution({
      agentSession: {
        ...createAgentSessionSnapshot(),
        continuitySignals: [{
          id: 'continuity-phase1-project-shell',
          kind: 'dialogue',
          state: 'pending',
          label: 'dialogue:steady:dialogue-carry',
          summary: 'thread=phase-1-same-her | anchor=这个项目现在做到什么程度了 | open_loop=keep the same project line alive | carry=dialogue-carry | drift=steady | memory=dialogue-carry',
          createdAt: 139,
          metadata: {
            project: 'phase1-digital-life',
          },
        }],
        tasks: [],
      } as any,
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface,
      sessionId: 'session-phase1-project-shell',
    })

    expect(mirror.continuityProjectSummary).toContain('project=phase1-digital-life')
    expect(mirror.continuityProjectSummary).toContain('phase=local_desktop_life_loop')
    expect(mirror.continuityProjectSummary).toContain('unresolved=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(mirror.continuityProjectSummary).not.toContain('unresolved=Project continuity still needs closure.')
  })

  it('prefers fresher runtime continuity evidence over an older embedded spine when building the session mirror', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 140,
    })

    const staleRuntimeSurface = createRuntimeSurface(120)
    const staleSpine = deriveAlicizationDigitalLifeSpineFromSurface(staleRuntimeSurface.digitalLifeRuntimeSurface!)
    const freshRuntimeSurface = createRuntimeSurface(132)
    freshRuntimeSurface.digitalLifeRuntimeSurface = {
      ...freshRuntimeSurface.digitalLifeRuntimeSurface!,
      perception: {
        ...freshRuntimeSurface.digitalLifeRuntimeSurface!.perception,
        currentScene: {
          ...(freshRuntimeSurface.digitalLifeRuntimeSurface!.perception.currentScene as any),
          scenario: 'browser',
          summary: 'Foreground moved, but the same seam is still being held quietly.',
          confidence: 0.74,
        } as any,
      },
      dialogue: {
        ...freshRuntimeSurface.digitalLifeRuntimeSurface!.dialogue,
        currentConsciousFrame: {
          subject: 'general',
          centerOfGravity: 'defer',
          consciousNeed: 'Keep the same line inward a little longer.',
          consciousTension: 'The room has not loosened yet.',
          speakingIntention: 'Re-enter gently later on the same seam.',
          truthDiscipline: 'observe-then-hypothesize',
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.74,
          reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
          updatedAt: 132,
        } as any,
        dialogueEncounter: {
          subject: 'task-knot',
        } as any,
        answerPlanner: {
          answerIntent: 'hold the same seam before widening',
        } as any,
        replyDeliberation: {
          speakingFrom: 'self-continuity',
        } as any,
      },
    }

    const mirror = manager.ingestPreparedExecution({
      agentSession: createAgentSessionSnapshot(),
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: {
        ...freshRuntimeSurface,
        digitalLifeSpine: staleSpine,
      },
      sessionId: 'session-fresher-runtime-continuity',
    })

    expect(mirror.dialogueSummary).toContain('subject=task-knot')
    expect(mirror.dialogueSummary).toContain('answer=hold the same seam before widening')
    expect(mirror.dialogueSummary).toContain('voice=self-continuity')
  })

  it('keeps inward self-continuity visible in continuityArcSummary when the fresher prepared runtime is carrying the same living line more explicitly than the spine', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 160,
    })

    const staleRuntimeSurface = createRuntimeSurface(120)
    const staleSpine = deriveAlicizationDigitalLifeSpineFromSurface(staleRuntimeSurface.digitalLifeRuntimeSurface!)
    const freshRuntimeSurface = createRuntimeSurface(150)
    freshRuntimeSurface.digitalLifeRuntimeSurface = {
      ...freshRuntimeSurface.digitalLifeRuntimeSurface!,
      dialogue: {
        ...freshRuntimeSurface.digitalLifeRuntimeSurface!.dialogue,
        currentConsciousFrame: {
          subject: 'general',
          centerOfGravity: 'defer',
          consciousNeed: 'Keep the same line inward a little longer before widening outward.',
          consciousTension: 'The room still needs more inward continuity.',
          speakingIntention: 'Stay on the same living line inwardly before reopening outward.',
          truthDiscipline: 'observe-then-hypothesize',
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.76,
          reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
          updatedAt: 150,
        } as any,
        answerPlanner: {
          answerIntent: 'hold the same line inward before widening',
        } as any,
        replyDeliberation: {
          speakingFrom: 'self-continuity',
        } as any,
      },
    }

    const mirror = manager.ingestPreparedExecution({
      agentSession: createAgentSessionSnapshot(),
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface: {
        ...freshRuntimeSurface,
        digitalLifeSpine: staleSpine,
      },
      sessionId: 'session-inward-self-continuity-arc',
    })

    expect(mirror.continuityArcSummary).toContain('stage=hold-for-opening')
    expect(mirror.continuityArcSummary).toContain('voice=self-continuity')
    expect(mirror.continuityArcSummary).toContain('answer=hold the same line inward before widening')
    expect(mirror.continuityArcSummary).toContain('need=Keep the same line inward a little longer')
  })

  it('falls back to the preferred prepared runtime surface when a fresher prepared spine snapshot is too thin to build the session mirror', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 150,
    })

    const runtimeSurface = createRuntimeSurface(140)
    const mirror = manager.ingestPreparedExecution({
      agentSession: createAgentSessionSnapshot(),
      cardId: 'default',
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        recollectionIntent: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
      },
      runtimeSurface,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'thin prepared snapshot from concurrent work',
          activeThreadId: 'thread-thin-prepared-spine',
          activeThreadTitle: 'thin prepared snapshot',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'hesitant',
          selectedAction: 'wait',
          updatedAt: 141,
        },
        runtimeSurface: {} as any,
        architecture: null,
        continuitySignal: {
          label: 'thin-prepared-spine',
          summary: 'same-thread-continuation should stay intact even if concurrent work leaves a thinner prepared spine snapshot behind',
          signature: 'thin-prepared-spine',
          createdAt: 141,
          activeThreadId: 'thread-thin-prepared-spine',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'hesitant',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          shouldSpeak: false,
          confidence: 0.82,
          activeThreadId: 'thread-thin-prepared-spine',
          activeThreadTitle: 'thin prepared snapshot',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same seam alive while the concurrent prepared snapshot is still thin',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'hesitant',
        },
        memory: null,
      } as any,
      sessionId: 'session-thin-prepared-spine',
    })

    expect(mirror.continuityProjectSummary).toContain('project=phase1-digital-life')
    expect(mirror.continuityProjectSummary).toContain('phase=local_desktop_life_loop')
    expect(mirror.continuityProjectSummary).toContain('landed=')
    expect(mirror.continuityProjectSummary).toContain('unresolved=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(mirror.continuityProjectSummary).toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(mirror.continuityProjectSummary).toContain('continuity_anchor=local_desktop_life_loop')
    expect(mirror.perceptionSummary).toContain('watch=symbiotic-vision')
    expect(mirror.runtimeChannelSummary).toContain('dominant=')
    expect(mirror.agencySummary).toContain('action=speak')
    expect(mirror.agencySummary).not.toContain('action=wait')

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-thin-prepared-spine',
    })

    expect(block).toContain('conversation_session_id=session-thin-prepared-spine')
    expect(block).toContain('continuity_project=project=phase1-digital-life')
    expect(block).toContain('phase=local_desktop_life_loop')
    expect(block).toContain('landed=')
    expect(block).toContain('unresolved=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(block).toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(block).toContain('continuity_anchor=local_desktop_life_loop')
    expect(block).toContain('perception=watch=symbiotic-vision')
    expect(block).toContain('agency=action=speak')
  })

  it('preserves execution-callback tooling source when later mirror maintenance still carries callback afterglow', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 90,
    })

    manager.ingestAgentSessionSnapshot({
      agentSession: {
        ...createAgentSessionSnapshot(),
        tasks: [{
          id: 'task-callback',
          kind: 'executor',
          label: 'callback:cli',
          metadata: {
            source: 'execution-callback-runtime',
            threadId: 'thread-callback',
            selectedChannel: 'cli',
            threadStatus: 'completed',
            afterglowTag: 'execution-callback',
            carryMode: 'lower-pressure',
          },
          startedAt: 70,
          finishedAt: 79,
          status: 'completed',
          summary: 'Execution callback settled on the same life line.',
        }],
        continuitySignals: [{
          id: 'continuity-afterglow-callback-source',
          kind: 'runtime',
          state: 'fresh',
          label: 'afterglow:execution-callback:lower-pressure',
          summary: 'thread=thread-callback | continuity=execution-callback | carry-mode=lower-pressure',
          createdAt: 80,
          metadata: {
            source: 'autobiographical-afterglow',
            continuityKind: 'execution-callback',
            executionCallbackCarryMode: 'lower-pressure',
          },
        }],
      },
      cardId: 'default',
      decisionTraceId: 'trace-callback-source',
      sessionId: 'session-callback-source',
      sessionPhases: ['source:execution-callback'],
      source: 'execution-callback',
    })

    const mirror = manager.ingestAgentSessionSnapshot({
      agentSession: {
        ...createAgentSessionSnapshot(),
        tasks: [{
          id: 'task-proactive-follow',
          kind: 'runtime',
          label: 'main_gateway:proactive',
          metadata: {
            source: 'proactive',
          },
          startedAt: 82,
          finishedAt: 85,
          status: 'completed',
          summary: 'A later proactive maintenance pass checked the same thread.',
        }],
        continuitySignals: [{
          id: 'continuity-afterglow-callback-follow',
          kind: 'runtime',
          state: 'fresh',
          label: 'afterglow:execution-callback:lower-pressure',
          summary: 'thread=thread-callback | continuity=execution-callback | carry-mode=lower-pressure',
          createdAt: 80,
          metadata: {
            source: 'autobiographical-afterglow',
            continuityKind: 'execution-callback',
            executionCallbackCarryMode: 'lower-pressure',
          },
        }],
      },
      cardId: 'default',
      decisionTraceId: 'trace-proactive-follow',
      sessionId: 'session-callback-source',
      sessionPhases: ['source:proactive'],
      source: 'proactive',
    })

    expect(mirror.toolingSummary).toContain('source=execution-callback')
    expect(mirror.toolingSummary).toContain('recent_actions=main_gateway:proactive')

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-callback-source',
    })

    expect(block).toContain('tooling=source=execution-callback recent_actions=main_gateway:proactive')
    expect(block).toContain('source:execution-callback')
  })

  it('preserves execution-callback tooling source across deferred proactive maintenance when callback afterglow lives in mirror summaries', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 120,
    })

    manager.ingestAgentSessionSnapshot({
      agentSession: {
        ...createAgentSessionSnapshot(),
        tasks: [
          {
            id: 'task-dispatch',
            kind: 'executor',
            label: 'dispatch:cli',
            metadata: { source: 'execution-callback-runtime' },
            startedAt: 90,
            finishedAt: 95,
            status: 'completed',
            summary: 'dispatch complete',
          },
          {
            id: 'task-settled',
            kind: 'executor',
            label: 'settled:cli',
            metadata: { source: 'execution-callback-runtime' },
            startedAt: 96,
            finishedAt: 100,
            status: 'completed',
            summary: 'settled complete',
          },
          {
            id: 'task-callback',
            kind: 'executor',
            label: 'callback:cli',
            metadata: {
              source: 'execution-callback-runtime',
              afterglowTag: 'execution-callback',
              carryMode: 'lower-pressure',
            },
            startedAt: 101,
            finishedAt: 110,
            status: 'completed',
            summary: 'callback settled on the same thread',
          },
        ],
      },
      cardId: 'default',
      decisionTraceId: 'trace-callback-deferred-source',
      sessionId: 'session-callback-deferred-source',
      sessionPhases: ['source:execution-callback'],
      source: 'execution-callback',
    })

    const mirror = manager.ingestAgentSessionSnapshot({
      agentSession: {
        ...createAgentSessionSnapshot(),
        tasks: [{
          id: 'task-proactive-follow',
          kind: 'runtime',
          label: 'main_gateway:proactive',
          metadata: {
            source: 'proactive-deferred',
          },
          startedAt: 111,
          finishedAt: 115,
          status: 'completed',
          summary: 'deferred proactive maintenance checked the thread without reopening visible speech',
        }],
      },
      cardId: 'default',
      decisionTraceId: 'trace-proactive-deferred-follow',
      sessionId: 'session-callback-deferred-source',
      sessionPhases: ['source:proactive-deferred'],
      source: 'proactive-deferred',
    })

    expect(mirror.toolingSummary).toContain('source=execution-callback')
    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-callback-deferred-source',
    })
    expect(block).toContain('tooling=source=execution-callback recent_actions=main_gateway:proactive')
  })
})
