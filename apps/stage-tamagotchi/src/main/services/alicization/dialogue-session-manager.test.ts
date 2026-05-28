import type { AlicizationAgentSessionSnapshot } from './agent-runtime'
import type { AlicizationDigitalLifeArchitectureSnapshot } from './digital-life-architecture'
import type { AlicizationMainChatRuntimeSurface } from './main-chat-runtime-surface'

import { describe, expect, it } from 'vitest'

import { createAlicizationDialogueSessionManager } from './dialogue-session-manager'
import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'

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
          internalLead: 'The remembered route is to verify the seam before branching.',
          visibleLead: null,
          styleNote: 'Let the remembered procedure quietly bend the answer.',
          rationale: 'The host needs continuity-shaped help, not a narrated retrospective.',
          confidence: 0.79,
        },
      },
      runtimeSurface: createRuntimeSurface(),
      sessionId: 'session-1',
    })

    expect(mirror.decisionTraceId).toBe('trace-1')
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
    expect(mirror.recollectionSummary).toContain('mode=execution-procedure')
    expect(mirror.recollectionSummary).toContain('foreground=What comes back first is the way the runtime seam was handled before.')
    expect(mirror.recollectionSurfaceSummary).toContain('surface=inward')
    expect(mirror.recollectionSurfaceSummary).toContain('afterthought=ripe')
    expect(mirror.recollectionConfidence).toBe(0.81)
    expect(mirror.agencySummary).toContain('action=speak')

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-1',
    })

    expect(block).toContain('[ALICIZATION_DIALOGUE_SESSION_MIRROR]')
    expect(block).toContain('conversation_session_id=session-1')
    expect(block).toContain('continuity_labels=presence:symbiotic-vision,digital-life-line')
    expect(block).toContain('digital_life_runtime=watch=symbiotic-vision')
    expect(block).toContain('runtime_channel=dominant=')
    expect(block).toContain('mind=mode=tracking | drive=understand | need=guidance')
    expect(block).toContain('memory_carry=mode=reflective-repair')
    expect(block).toContain('perception=watch=symbiotic-vision | scene=Viewing a runtime refactor diff | attention=runtime.ts | source=attention-anchor')
    expect(block).toContain('memory=recent=carry the refactor thread forward')
    expect(block).toContain('recollection=mode=execution-procedure | certainty=approximate')
    expect(block).toContain('recollection_surface=surface=inward | afterthought=ripe | surface_mode=internal-only')
    expect(block).toContain('recollection_confidence=0.81')
    expect(block).toContain('agency=action=speak | speak=true | style=light-nudge | thread=Refactor dialogue continuity runtime')
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
    expect(mirror.toolingSummary).toContain('source=dream')
    expect(mirror.sessionPhases).toContain('tool:runtime:main-gateway:dream')
    expect(mirror.dialogueSummary).toContain('source=dream')
    expect(mirror.mindSummary).toContain('hypothesis=The missing null guard is the current knot.')
    expect(mirror.memoryCarrySummary).toContain('mode=reflective-repair')
    expect(mirror.memorySummary).toContain('reflection=keep one runtime spine')
    expect(mirror.recollectionSummary).toContain('mode=conversation-history')
    expect(mirror.executionSummary).toContain('callback:cli:completed')

    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-1',
    })

    expect(block).toContain('[ALICIZATION_DIALOGUE_SESSION_MIRROR]')
    expect(block).toContain('decision_trace_id=trace-dream-1')
    expect(block).toContain('session_phases=tool:sensory:oneshot:dream -> tool:runtime:main-gateway:dream -> source:dream')
    expect(block).toContain('tooling=source=dream recent_actions=main_gateway:dream')
    expect(block).toContain('mind=mode=tracking | drive=understand | need=guidance')
    expect(block).toContain('memory_carry=mode=reflective-repair')
    expect(block).toContain('memory=recent=carry the refactor thread forward')
    expect(block).toContain('recollection=mode=conversation-history | certainty=approximate')
    expect(block).toContain('execution=recent=callback:cli:completed status=completed summary=cli callback settled')
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
})
