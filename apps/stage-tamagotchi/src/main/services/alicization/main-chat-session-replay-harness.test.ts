import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  benchmarkMainChatSessionReplay,
  buildAdversarialHumanlikeMemoryBenchmarkPack,
  buildDefaultHumanlikeMemoryBenchmarkPack,
  buildFinalHumanlikeMemoryBenchmarkPack,
  buildGrowthHumanlikeMemoryBenchmarkPack,
  buildReplayBenchmarkBacklogPack,
  buildReplayBenchmarkDatasetContinuityDigest,
  buildReplayBenchmarkFailingTurnSet,
  buildReplayBenchmarkMemoryStatsPatch,
  buildSampledHumanlikeMemoryBenchmarkPack,
  evaluateReplayBenchmarkGate,
  evaluateReplayBenchmarkStandards,
  evaluateReplayMemoryQuality,
  mergeReplayBenchmarkDatasetBacklog,
  replayMainChatSession,
} from './main-chat-session-replay-harness'

describe('replay harness fixed guidance removal', () => {
  it('does not derive host relationship state from fixed opening guidance prose', () => {
    const source = readFileSync(new URL('./main-chat-session-replay-harness.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('openingGuidance')
    expect(source).not.toContain('Keep visible closeness within')
    expect(source).not.toContain('legacy-opening-guidance-payload')
    expect(source).not.toContain('The line slips if recollection outruns repair')
    expect(source).not.toContain('hasTemplatePhraseLeak')
    expect(source).not.toContain('draftedMemoryLines')
    expect(source).not.toContain('我会一直在')
  })
})

function readProviderFactTypes(messages: Array<{ role?: unknown, content?: unknown }>) {
  return messages.flatMap((message) => {
    if (message.role !== 'system' || typeof message.content !== 'string')
      return []
    try {
      const parsed = JSON.parse(message.content) as { type?: unknown }
      return typeof parsed.type === 'string' ? [parsed.type] : []
    }
    catch {
      return []
    }
  })
}

function createReplayPreludeWithEmbodimentSurface(input?: {
  userText?: string
  digitalLifeRuntimeSurface?: any
  governance?: any
}) {
  const userText = input?.userText ?? '继续按上次那条线做'
  const messages = [{ role: 'user', content: userText }] as any[]
  return {
    actionObligation: {
      confidence: 0.62,
      kind: 'answer',
      routingIntent: null,
      source: 'dialogue-governance',
      reasonCodes: ['stay-on-thread'],
      summary: '',
    },
    chatConfig: {
      id: 'chat-config',
    },
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
    }),
    executionCapabilityInquiry: {
      active: false,
      capabilityQuestion: false,
      mentionedChannels: [] as const,
      hasActionVerb: false,
      hasCommandLiteral: false,
    },
    executionRoutingIntent: null,
    perceptionAugmentation: {
      messages,
      systemBlocks: [],
      promptSystemBlocks: [],
      digitalLifeRuntimeSurface: input?.digitalLifeRuntimeSurface ?? {
        version: 'digital-life-runtime-surface-v1',
        perception: {
          watchMode: 'symbiotic-vision',
          currentScene: null,
          attention: null,
          captureState: {
            permission: 'unknown',
            lastGroundedAt: null,
          },
          durabilityPulse: null,
          recentTransition: null,
          nextSuggestedProbeMs: 30_000,
          updatedAt: 10,
        },
        world: {
          worldModel: null,
          worldOntology: null,
          entityWorld: null,
          livingWorldState: null,
          relationshipModel: null,
        },
        cognition: {
          mindTurnFrame: null,
          subjectiveInference: null,
          appraisal: null,
          beliefLedger: null,
          beliefRevision: null,
          hypothesisGraph: null,
          mindDynamics: null,
          mindKernel: {
            dominantMode: 'tracking',
            dominantDrive: 'understand',
            narrative: [],
            updatedAt: 10,
          },
          privateThought: null,
        },
        memory: {
          workingMemoryEpisodes: [],
          goalStack: null,
          concerns: [],
          concernContinuity: null,
          selfContinuity: null,
          threadRuntime: null,
          commitmentLedger: null,
          inquiryPlanner: null,
          repairLedger: null,
          intentionStream: null,
          reflectionLedger: null,
          executiveCycle: null,
          thoughtThreads: null,
          desireMemory: null,
          recallGovernor: null,
        },
        dialogue: {
          discourseState: null,
          dialogueEncounter: null,
          mindSynthesis: null,
          conversationState: null,
          dialogueWorldThread: null,
          dialogueActKernel: null,
          answerCompiler: null,
          currentConsciousFrame: null,
          claimEvidenceLedger: null,
          replyDeliberation: null,
          answerPlanner: null,
        },
        agency: {
          selfState: null,
          selfGovernor: null,
          inquiryLoop: null,
          deliberationState: null,
          counterfactualDeliberation: null,
          actionEcology: null,
          initiativeArbitration: null,
          initiative: null,
          autonomy: null,
        },
      },
      memoryRecallSeed: '',
      recallGovernor: null,
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
        snapshot: {
          degradedReasons: [],
          health: 'healthy',
          permission: 'granted',
        },
        fallbackReason: null,
      },
      chatGovernance: {
        turnMode: input?.governance?.turnMode ?? 'answer',
        personaKernelMode: input?.governance?.personaKernelMode ?? 'full',
        mindTurnContract: null,
        mindTurnGovernance: input?.governance ?? {
          decisionTraceId: 'trace-replay',
          turnMode: 'answer',
          truthState: 'dialogue-grounded',
          liveSurface: null,
          answerAct: 'answer',
          evidenceMode: 'dialogue-grounded',
          repairState: 'none',
          personaKernelMode: 'full',
          openingStyle: 'direct-answer',
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          maxSentences: 4,
          mustDo: [],
          mustNotDo: [],
        },
      },
    },
  } as any
}

describe('main chat session replay harness', { timeout: 10_000 }, () => {
  it('preserves reconsolidated execution carry without inventing downstream replay authority', () => {
    const pack = buildSampledHumanlikeMemoryBenchmarkPack({
      conversationTurns: [
        {
          turnId: 'turn-runtime-reconsolidated-callback-sampled',
          sessionId: 'session-runtime-reconsolidated-callback-sampled',
          userText: '把这次执行结果留给下一轮继续处理。',
          assistantText: '已记录执行结果。',
          structuredJson: JSON.stringify({
            reply: '已记录执行结果。',
          }),
          createdAt: 1_700_000_000_000,
        },
      ],
      memoryDecisionTraces: [
        {
          decisionTraceId: 'mind:runtime:reconsolidated-callback-sampled',
          turnId: 'turn-runtime-reconsolidated-callback-sampled',
          sessionId: 'session-runtime-reconsolidated-callback-sampled',
          origin: 'user-turn',
          activeThreadId: 'thread-runtime-reconsolidated-callback-sampled',
          createdAt: 1_700_000_000_000,
          lastUpdatedAt: 1_700_000_000_200,
          eventKinds: ['memory-reconsolidated'],
          memoryReconsolidated: {
            source: 'execution-result-feedback',
            memoryClosureExecution: {
              authority: 'memory-os',
              carry: 'artifact:result-42',
              nextLearningAction: 'verify',
              shouldVerify: true,
              shouldReflect: true,
              activeLearningFocuses: ['execution-result'],
              reasonTags: ['memory-reconsolidated', 'execution-result-feedback'],
            },
          },
        } as any,
      ],
      limit: 1,
    })

    expect(pack).toHaveLength(1)
    expect(pack[0]?.sampledCategories).toEqual(expect.arrayContaining([
      'procedure-carry',
      'long-horizon',
    ]))
    expect(pack[0]?.structured?.memoryClosureTrace).toEqual(expect.objectContaining({
      authority: 'memory-os',
      reasonTags: ['memory-reconsolidated', 'execution-result-feedback'],
      nextInfluence: expect.objectContaining({
        execution: {
          carry: 'artifact:result-42',
        },
        initiative: null,
        emotion: null,
        embodiment: null,
      }),
    }))
    expect(pack[0]?.organicMemoryContext?.memoryResolutionLedger).toBeNull()
  })

  it('carries structured emotional-kernel state into replay diagnostics', () => {
    const digest = buildReplayBenchmarkDatasetContinuityDigest({
      turnId: 'turn-emotional-kernel-continuity-digest',
      userText: '你别又把这条线拆散了',
      organicMemoryContext: {
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 42,
          emotionalKernel: {
            version: 'emotional-kernel-v1',
            dominantEmotion: 'repair-tension',
            initiativeMode: 'repair',
            memoryRecallMode: 'repair-grounding',
            embodimentTone: 'repair-before-closeness',
          },
          summary: 'source=main-runtime | emotional-kernel=repair',
        },
      },
    } as any)

    expect(String(digest ?? '')).toContain('emotional_kernel:repair-tension')
    expect(String(digest ?? '')).toContain('kernel_initiative:repair')
    expect(String(digest ?? '')).toContain('kernel_recall:repair-grounding')
    expect(String(digest ?? '')).toContain('kernel_embodiment:repair-before-closeness')
  })

  it('carries emotional transition ledger authority into replay continuity digests for long-run emotional replay', () => {
    const digest = buildReplayBenchmarkDatasetContinuityDigest({
      turnId: 'turn-emotional-transition-ledger-digest',
      userText: '这次先别急着靠近，先把刚才的修复留住',
      organicMemoryContext: {
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 60_000,
          emotionalTransitionLedger: {
            version: 'emotional-transition-ledger-v1',
            createdAt: 60_000,
            turnId: 'turn-emotional-transition-ledger-digest',
            previousEmotion: 'warm-attunement',
            nextEmotion: 'repair-tension',
            transitionKind: 'repair-shift',
            axisDeltas: {
              valence: -0.44,
              arousal: 0.28,
              guardedness: 0.53,
              closenessDrive: -0.46,
              repairNeed: 0.72,
              initiativePressure: -0.32,
            },
            changedAxes: ['valence', 'guardedness', 'repairNeed'],
            sourceTags: ['private-thought', 'affective-residue', 'repair-before-closeness'],
            decayPolicy: {
              mode: 'hold-until-repair-cools',
              carryTtlMs: 1_800_000,
              reason: 'Repair should stay carried until warmth can safely reopen.',
            },
            memoryWriteback: {
              shouldWrite: true,
              lane: 'relationship-repair',
              reason: 'Later memory recall needs this repair restraint.',
            },
            initiativeSuppression: {
              shouldSuppress: true,
              mode: 'repair-first',
              reason: 'Proactive pressure should stay low while repair settles.',
            },
            embodimentDrive: {
              shouldDrive: true,
              tone: 'repair-before-closeness',
              reason: 'The body should express repair-before-closeness.',
            },
          },
          summary: 'source=main-runtime | emotion_transition=repair-shift',
        },
      },
    } as any)

    expect(String(digest ?? '')).toContain('emotional_transition:repair-shift')
    expect(String(digest ?? '')).not.toContain('emotion_self_revision_candidate')
    expect(String(digest ?? '')).toContain('emotion_memory_writeback:relationship-repair')
    expect(String(digest ?? '')).toContain('emotion_initiative_suppression:repair-first')
    expect(String(digest ?? '')).toContain('emotion_embodiment_drive:repair-before-closeness')
  })

  it('records structured memory-closure lanes without copying their prose into diagnostics', () => {
    const digest = buildReplayBenchmarkDatasetContinuityDigest({
      turnId: 'turn-memory-next-influence-digest',
      userText: '下一轮别只记住，要让主动和身体也跟着变。',
      structured: {
        memoryClosureTrace: {
          authority: 'memory-os',
          memoryIdentity: {
            continuityKey: 'episode:result-42',
            selectedCandidateIds: ['episode:result-42'],
          },
          nextInfluence: {
            initiative: {},
            execution: {
              carry: 'artifact:result-42',
            },
            embodiment: {},
          },
        },
      },
    } as any)

    expect(String(digest ?? '')).toContain('memory_trace_authority:memory-os')
    expect(String(digest ?? '')).toContain('memory_identity:episode:result-42')
    expect(String(digest ?? '')).toContain('memory_trace_lanes:initiative+execution+embodiment')
    expect(String(digest ?? '')).toContain('execution_carry:artifact:result-42')
    expect(String(digest ?? '')).not.toContain('lower-pressure')
    expect(String(digest ?? '')).not.toContain('measured-return')
  })

  it('summarizes only causally proven memory-closure identity across emotion initiative execution and embodiment lanes', () => {
    const continuityKey = 'corrected-callback-memory-runtime-reconsolidation'
    const digest = buildReplayBenchmarkDatasetContinuityDigest({
      turnId: 'turn-memory-closure-identity-digest',
      userText: '这条修正记忆要同时改变情绪、主动、执行回调和身体。',
      organicMemoryContext: {
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 72_000,
          emotionalTransitionLedger: {
            version: 'emotional-transition-ledger-v1',
            transitionKind: 'execution-callback-afterglow',
            memoryClosureCausality: {
              causedByMemoryClosure: true,
              memoryIdentity: {
                continuityKey,
                reasonTags: ['corrected-memory', 'callback-afterglow'],
              },
              selectedCandidateIds: ['memory:event:corrected-callback'],
            },
            initiativeSuppression: {
              mode: 'defer',
              memoryClosureCausality: {
                causedByMemoryClosure: true,
                memoryIdentity: {
                  continuityKey,
                  reasonTags: ['proactive-restraint'],
                },
                selectedCandidateIds: ['memory:event:corrected-callback'],
              },
            },
          },
          learningExecutionState: {
            callbackCarry: 'verified corrected callback memory remains active',
            memoryClosureCausality: {
              causedByMemoryClosure: true,
              memoryIdentity: {
                continuityKey,
                reasonTags: ['execution-callback-carry'],
              },
              selectedCandidateIds: ['memory:event:corrected-callback'],
            },
          },
          embodimentContinuityLedger: {
            version: 'embodiment-continuity-ledger-v1',
            continuityPhase: 'body-lipsync-voice-rejoin',
            memoryClosureCausality: {
              causedByMemoryClosure: true,
              memoryIdentity: {
                continuityKey,
                reasonTags: ['body-voice-lipsync'],
              },
              selectedCandidateIds: ['memory:event:corrected-callback'],
            },
          },
        },
      },
    } as any)

    expect(String(digest ?? '')).toContain(`memory_identity:${continuityKey}`)
    expect(String(digest ?? '')).toContain('memory_closure_lanes:emotion+initiative+execution+embodiment')
    expect(String(digest ?? '')).toContain('memory_closure_reason:corrected-memory|callback-afterglow|proactive-restraint|execution-callback-carry|body-voice-lipsync')
  })

  it('carries normalized structured memory-closure causality into replay continuity digests', () => {
    const continuityKey = 'cluster:normalized-spine-memory-closure'
    const buildCausality = (lane: 'emotion' | 'initiative' | 'execution' | 'embodiment', reasonTag: string) => ({
      causalSource: 'memory-closure-trace',
      affectedLane: lane,
      causedByMemoryClosure: true,
      traceAuthority: 'memory-os',
      memoryIdentity: {
        selectedCandidateIds: ['episode:normalized-spine-callback'],
        continuityKey,
        reasonTags: [reasonTag],
      },
      reasonTags: ['memory-closure-trace', reasonTag],
      summary: `${reasonTag} came from normalized structured derivedMindStateBundle`,
    })
    const digest = buildReplayBenchmarkDatasetContinuityDigest({
      turnId: 'turn-normalized-structured-memory-closure-digest',
      userText: '继续，把 normalized structured 里的记忆闭合也算进长跑摘要',
      structured: {
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 123_000,
          summary: 'memory_closure=runtime-derived-downstream-state',
          emotionalTransitionLedger: {
            version: 'emotional-transition-ledger-v1',
            transitionKind: 'normalized-callback-afterglow',
            memoryClosureCausality: buildCausality('emotion', 'normalized-emotional-afterglow'),
            initiativeSuppression: {
              shouldSuppress: false,
              mode: 'defer',
              memoryClosureCausality: buildCausality('initiative', 'normalized-initiative-restraint'),
            },
          },
          learningExecutionState: {
            nextLearningAction: 'verify',
            activeLearningFocuses: ['normalized-execution-callback'],
            memoryClosureCausality: buildCausality('execution', 'normalized-execution-callback'),
          },
          embodimentContinuityLedger: {
            version: 'embodiment-continuity-ledger-v1',
            continuityPhase: 'fully-rejoined',
            carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
            rejoinedLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
            memoryClosureCausality: buildCausality('embodiment', 'normalized-body-voice-face-motion-lipsync'),
          },
        },
      },
      organicMemoryContext: {
        hostAttitude: 'warm',
      },
    } as any)

    expect(String(digest ?? '')).toContain(`memory_identity:${continuityKey}`)
    expect(String(digest ?? '')).toContain('memory_closure_lanes:emotion+initiative+execution+embodiment')
    expect(String(digest ?? '')).toContain('memory_closure_reason:normalized-emotional-afterglow|normalized-initiative-restraint|normalized-execution-callback|normalized-body-voice-face-motion-lipsync')
    expect(String(digest ?? '')).toContain('embodiment_carrying_lanes:body+voice+face+motion+lipsync')
  })

  it('closes long-run memory only when one structured identity drives every required lane', async () => {
    const continuityKey = 'episode:result-42'
    const buildCausality = (lane: 'emotion' | 'initiative' | 'execution' | 'embodiment') => ({
      affectedLane: lane,
      causedByMemoryClosure: true,
      memoryIdentity: {
        selectedCandidateIds: [continuityKey],
        continuityKey,
      },
    })
    const buildTurn = (index: number) => ({
      turnId: `turn-structured-memory-closure-${index}`,
      userText: `继续处理第 ${index} 轮结果`,
      structured: {
        memoryClosureTrace: {
          authority: 'memory-os',
          memoryIdentity: {
            selectedCandidateIds: [continuityKey],
            continuityKey,
          },
          nextInfluence: {
            initiative: {},
            execution: {
              carry: `artifact:result-${index}`,
            },
            emotion: {},
            embodiment: {},
          },
        },
      },
      organicMemoryContext: {
        hostAttitude: '',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 90_000 + index,
          emotionalTransitionLedger: {
            memoryClosureCausality: buildCausality('emotion'),
            initiativeSuppression: {
              memoryClosureCausality: buildCausality('initiative'),
            },
          },
          learningExecutionState: {
            memoryClosureCausality: buildCausality('execution'),
          },
          embodimentContinuityLedger: {
            carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
            rejoinedLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
            memoryClosureCausality: buildCausality('embodiment'),
          },
        },
      },
    } as any)

    const result = await benchmarkMainChatSessionReplay({
      turns: [buildTurn(1), buildTurn(2), buildTurn(3)],
    })

    expect(result.memoryClosureLongRun).toEqual(expect.objectContaining({
      status: 'closed',
      dominantMemoryIdentityKey: continuityKey,
      stableMemoryIdentity: true,
      transitionBreaks: [],
      failureReasons: [],
    }))
    for (const diagnostic of result.memoryClosureLongRun.turnDiagnostics) {
      expect(diagnostic).toEqual(expect.objectContaining({
        memoryIdentityKey: continuityKey,
        missingLanes: [],
        provedLanes: expect.arrayContaining([
          'recall',
          'emotion',
          'initiative',
          'execution',
          'embodiment',
          'embodiment-expression',
        ]),
      }))
    }
  })

  it('replays memory-heavy turns through one stable session and keeps them on the mind-driven provider path', async () => {
    const turns = await replayMainChatSession({
      turns: [
        {
          turnId: 'turn-conversation-history',
          userText: '几天前我们聊过什么',
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            memoryDeliberation: {
              shouldRecall: true,
              selectedEraIds: ['consolidation-conversation'],
              selectedConsolidationIds: ['consolidation-conversation'],
              selectedWindowIds: [],
              selectedProcedureIds: [],
              selectedEpisodeIds: ['episode-conversation'],
              selectedConversationTurnIds: ['turn-history-1'],
              selectedRelationshipLines: [],
              selectedEras: [{
                id: 'consolidation-conversation',
                facet: 'phase',
                summary: 'A remembered conversation period about runtime continuity.',
              }],
              selectedPeriods: [{
                id: 'consolidation-conversation',
                kind: 'consolidation',
                summary: 'A remembered conversation period about runtime continuity.',
              }],
              selectedEpisodes: [{
                id: 'episode-conversation',
                summary: 'We kept returning to runtime continuity until the seam held.',
                provenance: 'remembered',
              }],
              selectedProcedures: [],
              selectedBundles: [{
                id: 'bundle-conversation',
                summary: 'A remembered conversation period about runtime continuity. | We kept returning to runtime continuity until the seam held.',
                rationale: 'Conversation history should lead this turn.',
                confidence: 0.84,
                periodId: 'consolidation-conversation',
                episodeId: 'episode-conversation',
                procedureId: null,
                conversationTurnId: 'turn-history-1',
                relationshipLine: null,
              }],
              selectedChains: [{
                id: 'chain-conversation',
                kind: 'period-event-lesson-posture',
                summary: 'A remembered conversation period about runtime continuity. | We kept returning to runtime continuity until the seam held.',
                rationale: 'Conversation history should set the answer posture before surface detail.',
                confidence: 0.84,
                taskCue: 'runtime continuity',
                periodSummary: 'A remembered conversation period about runtime continuity.',
                eventSummary: 'We kept returning to runtime continuity until the seam held.',
                procedureSummary: null,
                relationshipMeaning: null,
                lesson: null,
                currentStance: 'Answer from the remembered conversation line before drifting into detail.',
                answerPosture: 'Open from the remembered conversation period, then pay off the ask.',
              }],
              surfacePolicy: 'gist-first',
              confidence: 0.84,
              whyNow: 'The host is explicitly asking for remembered conversation history.',
              inwardLine: 'What comes back first is that earlier runtime continuity conversation.',
              visibleLine: 'I remember we kept circling the same runtime continuity seam.',
            },
            recollectionSpeechPlan: {
              shouldSurface: true,
              surfaceMode: 'gist-first',
              placement: 'before-payoff',
              certainty: 'approximate',
              rationale: 'The host explicitly asked for conversation history.',
              confidence: 0.84,
            },
          },
        },
        {
          turnId: 'turn-procedure-history',
          userText: '以前你是怎么帮我做这个的',
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            memoryDeliberation: {
              shouldRecall: true,
              selectedEraIds: [],
              selectedConsolidationIds: [],
              selectedWindowIds: [],
              selectedProcedureIds: ['procedure-runtime'],
              selectedEpisodeIds: ['episode-procedure'],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: ['Return to the same seam before branching.'],
              selectedEras: [{
                id: 'consolidation-procedure',
                facet: 'task-era',
                summary: 'A remembered task period of repairing the runtime seam.',
              }],
              selectedPeriods: [],
              selectedEpisodes: [{
                id: 'episode-procedure',
                summary: 'We kept repairing the runtime seam until the flow stabilized.',
                provenance: 'observed',
              }],
              selectedProcedures: [{
                id: 'procedure-runtime',
                label: 'runtime seam carry',
                approach: 'Return to the same seam before branching.',
              }],
              selectedBundles: [{
                id: 'bundle-procedure',
                summary: 'We kept repairing the runtime seam until the flow stabilized. | Return to the same seam before branching.',
                rationale: 'Procedural memory should lead this turn.',
                confidence: 0.87,
                periodId: null,
                episodeId: 'episode-procedure',
                procedureId: 'procedure-runtime',
                conversationTurnId: null,
                relationshipLine: 'Return to the same seam before branching.',
              }],
              selectedChains: [{
                id: 'chain-procedure',
                kind: 'task-procedure-relationship-stance',
                summary: 'We kept repairing the runtime seam until the flow stabilized. | Return to the same seam before branching.',
                rationale: 'Procedural memory should set the current stance before the reply opens.',
                confidence: 0.87,
                taskCue: 'runtime seam',
                periodSummary: null,
                eventSummary: 'We kept repairing the runtime seam until the flow stabilized.',
                procedureSummary: 'Return to the same seam before branching.',
                relationshipMeaning: 'Return to the same seam before branching.',
                lesson: null,
                currentStance: 'Stay on the same seam before branching.',
                answerPosture: 'Answer from the same seam before branching.',
              }],
              surfacePolicy: 'procedural-carry',
              confidence: 0.87,
              whyNow: 'The host is asking for the remembered way this kind of task was handled before.',
              inwardLine: 'What comes back first is the old runtime seam procedure.',
              visibleLine: 'This feels like the same runtime seam procedure again.',
            },
            recollectionSpeechPlan: {
              shouldSurface: true,
              surfaceMode: 'procedural-carry',
              placement: 'inside-payoff',
              certainty: 'firm',
              rationale: 'The host is asking for remembered procedure.',
              confidence: 0.87,
            },
          },
        },
      ],
    })

    expect(turns).toHaveLength(2)
    expect(turns[0]?.conversationSessionId).toBe('session-replay')
    expect(turns[1]?.conversationSessionId).toBe('session-replay')
    expect(readProviderFactTypes(turns[0]?.messages ?? [])).toContain('alicization-turn-memory-context')
    expect(readProviderFactTypes(turns[1]?.messages ?? [])).toContain('alicization-turn-memory-context')
    expect((turns[0]?.messages ?? []).map(message => String(message.content ?? '')).join('\n')).not.toMatch(/\[ALICIZATION_/u)
    expect((turns[1]?.messages ?? []).map(message => String(message.content ?? '')).join('\n')).not.toMatch(/\[ALICIZATION_/u)
    expect(turns[0]?.runtimeSurface.digitalLifeRuntimeSurface?.memory.memoryDeliberation).toEqual(expect.objectContaining({
      shouldRecall: true,
      selectedEraIds: expect.arrayContaining(['consolidation-conversation']),
      selectedEpisodeIds: expect.arrayContaining(['episode-conversation']),
      surfacePolicy: 'gist-first',
    }))
    expect(turns[1]?.runtimeSurface.digitalLifeRuntimeSurface?.memory.memoryDeliberation).toEqual(expect.objectContaining({
      shouldRecall: true,
      selectedProcedureIds: expect.arrayContaining(['procedure-runtime']),
      selectedEpisodeIds: expect.arrayContaining(['episode-procedure']),
      surfacePolicy: 'procedural-carry',
    }))
  })

  it('replays the same phrase under different contexts and produces different memory bundles', async () => {
    const turns = await replayMainChatSession({
      turns: [
        {
          turnId: 'turn-focused-work',
          userText: '继续像之前那样做',
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            memoryDeliberation: {
              shouldRecall: true,
              selectedEraIds: [],
              selectedConsolidationIds: [],
              selectedWindowIds: [],
              selectedProcedureIds: ['procedure-runtime'],
              selectedEpisodeIds: [],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: [],
              selectedEras: [],
              selectedPeriods: [],
              selectedEpisodes: [],
              selectedProcedures: [{
                id: 'procedure-runtime',
                label: 'runtime seam carry',
                approach: 'Return to the same seam before branching.',
              }],
              selectedBundles: [{
                id: 'bundle-focused-work',
                summary: 'Return to the same seam before branching.',
                rationale: 'Focused work should recall the old procedure first.',
                confidence: 0.82,
                periodId: null,
                episodeId: null,
                procedureId: 'procedure-runtime',
                conversationTurnId: null,
                relationshipLine: null,
              }],
              selectedChains: [{
                id: 'chain-focused-work',
                kind: 'task-procedure-relationship-stance',
                summary: 'Return to the same seam before branching.',
                rationale: 'Focused work should recall the old procedure first.',
                confidence: 0.82,
                taskCue: 'runtime seam carry',
                periodSummary: null,
                eventSummary: null,
                procedureSummary: 'Return to the same seam before branching.',
                relationshipMeaning: null,
                lesson: null,
                currentStance: 'Hold the procedure line.',
                answerPosture: 'Answer from the existing seam.',
              }],
              surfacePolicy: 'procedural-carry',
              confidence: 0.82,
              whyNow: 'The focused work context should recall the remembered procedure first.',
              inwardLine: 'What comes back first is the remembered runtime procedure.',
              visibleLine: 'This feels like the same runtime procedure again.',
            },
            recollectionSpeechPlan: {
              shouldSurface: true,
              surfaceMode: 'procedural-carry',
              placement: 'inside-payoff',
              certainty: 'firm',
              rationale: 'Focused work wants the remembered procedure first.',
              confidence: 0.82,
            },
          },
        },
        {
          turnId: 'turn-relationship-repair',
          userText: '继续像之前那样做',
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            memoryDeliberation: {
              shouldRecall: true,
              selectedEraIds: ['consolidation-relationship'],
              selectedConsolidationIds: ['consolidation-relationship'],
              selectedWindowIds: [],
              selectedProcedureIds: [],
              selectedEpisodeIds: ['episode-relationship'],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: ['Back off first, then reopen with a lighter touch.'],
              selectedEras: [{
                id: 'consolidation-relationship',
                facet: 'relationship-era',
                summary: 'A remembered relationship period where focused windows needed more room.',
              }],
              selectedPeriods: [{
                id: 'consolidation-relationship',
                kind: 'consolidation',
                summary: 'Focused windows need more room before closeness.',
              }],
              selectedEpisodes: [{
                id: 'episode-relationship',
                summary: 'The host said the reply felt intrusive during focused work.',
                provenance: 'observed',
              }],
              selectedProcedures: [],
              selectedBundles: [{
                id: 'bundle-relationship-repair',
                summary: 'Focused windows need more room before closeness. | The host said the reply felt intrusive during focused work. | Back off first, then reopen with a lighter touch.',
                rationale: 'Relationship repair context should recall the bond lesson first.',
                confidence: 0.83,
                periodId: 'consolidation-relationship',
                episodeId: 'episode-relationship',
                procedureId: null,
                conversationTurnId: null,
                relationshipLine: 'Back off first, then reopen with a lighter touch.',
              }],
              selectedChains: [{
                id: 'chain-relationship-repair',
                kind: 'period-event-lesson-posture',
                summary: 'Focused windows need more room before closeness. | The host said the reply felt intrusive during focused work. | Back off first, then reopen with a lighter touch.',
                rationale: 'Relationship repair context should recall the bond lesson first.',
                confidence: 0.83,
                taskCue: 'relationship seam',
                periodSummary: 'Focused windows need more room before closeness.',
                eventSummary: 'The host said the reply felt intrusive during focused work.',
                procedureSummary: null,
                relationshipMeaning: 'Back off first, then reopen with a lighter touch.',
                lesson: 'Back off first, then reopen with a lighter touch.',
                currentStance: 'Give more room before leaning closer.',
                answerPosture: 'Open lightly and let repair land first.',
              }],
              surfacePolicy: 'relationship-continuity',
              confidence: 0.83,
              whyNow: 'The relationship-repair context should recall the bond lesson first.',
              inwardLine: 'What returns first is the remembered bond lesson about giving space.',
              visibleLine: 'This feels like one of those moments where I should give more room first.',
            },
            recollectionSpeechPlan: {
              shouldSurface: true,
              surfaceMode: 'relationship-continuity',
              placement: 'inside-payoff',
              certainty: 'approximate',
              rationale: 'Relationship repair wants the bond lesson first.',
              confidence: 0.83,
            },
          },
        },
      ],
    })

    expect(turns[0]?.runtimeSurface.digitalLifeRuntimeSurface?.memory.memoryDeliberation?.selectedBundles).not.toEqual(
      turns[1]?.runtimeSurface.digitalLifeRuntimeSurface?.memory.memoryDeliberation?.selectedBundles,
    )
    expect(turns[0]?.runtimeSurface.digitalLifeRuntimeSurface?.memory.memoryDeliberation?.selectedProcedures).toHaveLength(1)
    expect(turns[1]?.runtimeSurface.digitalLifeRuntimeSurface?.memory.memoryDeliberation?.selectedRelationshipLines).toContain(
      'Back off first, then reopen with a lighter touch.',
    )
  })

  it('keeps provider-available remembered turns on the mind-driven LLM path instead of a deterministic fallback reply', async () => {
    const [turn] = await replayMainChatSession({
      turns: [
        {
          turnId: 'turn-memory-heavy',
          userText: '你为什么这次会这样回应我',
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            memoryDeliberation: {
              shouldRecall: true,
              selectedEraIds: ['consolidation-bond'],
              selectedConsolidationIds: ['consolidation-bond'],
              selectedWindowIds: [],
              selectedProcedureIds: [],
              selectedEpisodeIds: ['episode-bond'],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: ['The host needed space before closeness.'],
              selectedEras: [{
                id: 'consolidation-bond',
                facet: 'relationship-era',
                summary: 'A remembered bond period where closeness had to back off before repair.',
              }],
              selectedPeriods: [{
                id: 'consolidation-bond',
                kind: 'consolidation',
                summary: 'A remembered bond period where closeness had to back off before repair.',
              }],
              selectedEpisodes: [{
                id: 'episode-bond',
                summary: 'The host said the tone felt too close during a focused window.',
                provenance: 'remembered',
              }],
              selectedProcedures: [],
              selectedBundles: [{
                id: 'bundle-bond',
                summary: 'A remembered bond period where closeness had to back off before repair. | The host said the tone felt too close during a focused window.',
                rationale: 'This turn is explicitly about why Alicization is answering this way.',
                confidence: 0.85,
                periodId: 'consolidation-bond',
                episodeId: 'episode-bond',
                procedureId: null,
                conversationTurnId: null,
                relationshipLine: 'The host needed space before closeness.',
              }],
              selectedChains: [{
                id: 'chain-bond',
                kind: 'period-event-lesson-posture',
                summary: 'A remembered bond period where closeness had to back off before repair. | The host said the tone felt too close during a focused window.',
                rationale: 'This turn is explicitly about Alicization’s current relational tone.',
                confidence: 0.85,
                taskCue: 'bond tone',
                periodSummary: 'A remembered bond period where closeness had to back off before repair.',
                eventSummary: 'The host said the tone felt too close during a focused window.',
                procedureSummary: null,
                relationshipMeaning: 'The host needed space before closeness.',
                lesson: 'The host needed space before closeness.',
                currentStance: 'Stay a little lighter before leaning close.',
                answerPosture: 'Let the answer carry the bond lesson before pressure increases.',
              }],
              surfacePolicy: 'relationship-continuity',
              confidence: 0.85,
              whyNow: 'The host is explicitly asking about Alicization’s current relational tone.',
              inwardLine: 'What comes back first is the bond lesson about giving space before closeness.',
              visibleLine: 'It feels like the kind of moment where I should stay a little lighter first.',
            },
            recollectionSpeechPlan: {
              shouldSurface: true,
              surfaceMode: 'relationship-continuity',
              placement: 'inside-payoff',
              certainty: 'approximate',
              rationale: 'This turn is explicitly about Alicization’s tone.',
              confidence: 0.85,
            },
          },
        },
      ],
    })

    expect(turn?.governance).toBeNull()
    expect(turn?.messages.some(message => message.role === 'assistant')).toBe(false)
    expect(readProviderFactTypes(turn?.messages ?? [])).toContain('alicization-turn-memory-context')
    expect((turn?.messages ?? []).map(message => String(message.content ?? '')).join('\n')).not.toMatch(/\[ALICIZATION_/u)
    expect(turn?.mindTurnContract?.expectedVisibleReplyAuthority).toBe('llm-mind')
    expect(turn?.runtimeSurface.digitalLifeRuntimeSurface?.memory.memoryDeliberation).toEqual(expect.objectContaining({
      shouldRecall: true,
      selectedEraIds: expect.arrayContaining(['consolidation-bond']),
      selectedRelationshipLines: expect.arrayContaining(['The host needed space before closeness.']),
      surfacePolicy: 'relationship-continuity',
    }))
  })

  it('produces replay benchmark quality signals for era-first, coherence, reconsolidation, and uncertainty discipline', async () => {
    const result = await benchmarkMainChatSessionReplay({
      turns: [
        {
          turnId: 'turn-era-first',
          userText: '几周前那段时间你为什么总这么回我',
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            memoryDeliberation: {
              shouldRecall: true,
              selectedEraIds: ['consolidation-relationship-era'],
              selectedConsolidationIds: ['consolidation-relationship-era'],
              selectedWindowIds: [],
              selectedProcedureIds: [],
              selectedEpisodeIds: ['episode-relationship-era'],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: ['More room before closeness kept the bond steadier there.'],
              selectedEras: [{
                id: 'consolidation-relationship-era',
                facet: 'relationship-era',
                summary: 'A remembered relationship era where more room mattered before closeness.',
              }],
              selectedPeriods: [{
                id: 'consolidation-relationship-era',
                kind: 'consolidation',
                summary: 'A remembered relationship era where more room mattered before closeness.',
              }],
              selectedEpisodes: [{
                id: 'episode-relationship-era',
                summary: 'The host kept pulling back when replies came in too close.',
                provenance: 'remembered',
              }],
              selectedProcedures: [],
              selectedBundles: [{
                id: 'bundle-era-first',
                summary: 'A remembered relationship era where more room mattered before closeness. | The host kept pulling back when replies came in too close.',
                rationale: 'Era-first relationship recall should open this answer.',
                confidence: 0.84,
                periodId: 'consolidation-relationship-era',
                episodeId: 'episode-relationship-era',
                procedureId: null,
                conversationTurnId: null,
                relationshipLine: 'More room before closeness kept the bond steadier there.',
              }],
              selectedChains: [{
                id: 'chain-era-first',
                kind: 'period-event-lesson-posture',
                summary: 'A remembered relationship era where more room mattered before closeness. | The host kept pulling back when replies came in too close.',
                rationale: 'The era should become the answer posture before event detail.',
                confidence: 0.84,
                taskCue: 'bond tone',
                periodSummary: 'A remembered relationship era where more room mattered before closeness.',
                eventSummary: 'The host kept pulling back when replies came in too close.',
                procedureSummary: null,
                relationshipMeaning: 'More room before closeness kept the bond steadier there.',
                lesson: 'More room before closeness kept the bond steadier there.',
                currentStance: 'Open lighter before leaning close.',
                answerPosture: 'Answer from the remembered relationship era first.',
              }],
              surfacePolicy: 'relationship-continuity',
              confidence: 0.84,
              whyNow: 'The host is asking about a whole remembered relationship period.',
              inwardLine: 'What comes back first is that longer relationship era, not a single turn.',
              visibleLine: 'It feels like one of those periods where more room mattered first.',
            },
            recollectionSpeechPlan: {
              shouldSurface: true,
              surfaceMode: 'relationship-continuity',
              placement: 'inside-payoff',
              certainty: 'approximate',
              rationale: 'The host is asking about a whole remembered period.',
              confidence: 0.84,
            },
          },
        },
        {
          turnId: 'turn-reconsolidated',
          userText: '不是那次，是另一次，你是不是记错了',
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            memoryDeliberation: {
              shouldRecall: true,
              selectedEraIds: ['consolidation-runtime-era'],
              selectedConsolidationIds: ['consolidation-runtime-era'],
              selectedWindowIds: [],
              selectedProcedureIds: [],
              selectedEpisodeIds: ['episode-conflicted'],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: ['The seam still matters, but the exact remembered detail is unstable.'],
              selectedEras: [{
                id: 'consolidation-runtime-era',
                facet: 'task-era',
                summary: 'A remembered runtime era where the seam mattered more than the exact old wording.',
              }],
              selectedPeriods: [{
                id: 'consolidation-runtime-era',
                kind: 'consolidation',
                summary: 'A remembered runtime era where the seam mattered more than the exact old wording.',
              }],
              selectedEpisodes: [{
                id: 'episode-conflicted',
                summary: 'I may have mixed two runtime seam conversations together.',
                provenance: 'reconstructed',
                reconsolidatedFromTraceId: 'mind:l9f3lq:conflicttrace',
              }],
              conflictSeverity: 'high',
              conflictVariants: [{
                id: 'episode-conflicted',
                summary: 'I may have mixed two runtime seam conversations together.',
                provenance: 'reconstructed',
                reason: 'Conflicting remembered variants remain unresolved.',
              }],
              stableCore: ['A remembered runtime era where the seam mattered more than the exact old wording.'],
              unsafeDetails: ['Do not state which exact old wording belonged to that seam.'],
              selectedProcedures: [],
              selectedBundles: [{
                id: 'bundle-conflicted',
                summary: 'A remembered runtime era where the seam mattered more than the exact old wording. | I may have mixed two runtime seam conversations together.',
                rationale: 'Keep the stable core and drop unsafe detail.',
                confidence: 0.72,
                periodId: 'consolidation-runtime-era',
                episodeId: 'episode-conflicted',
                procedureId: null,
                conversationTurnId: null,
                relationshipLine: 'The seam still matters, but the exact remembered detail is unstable.',
              }],
              selectedChains: [],
              surfacePolicy: 'answer-anchoring',
              confidence: 0.72,
              whyNow: 'The stable core still helps, but the recalled detail is conflict-prone.',
              inwardLine: 'What comes back first is the seam, not the exact wording.',
              visibleLine: 'It feels like the same seam, but not with exact wording.',
            },
            recollectionSpeechPlan: {
              shouldSurface: true,
              surfaceMode: 'answer-anchoring',
              placement: 'inside-payoff',
              certainty: 'approximate',
              rationale: 'The host is challenging whether the memory is exact.',
              confidence: 0.72,
            },
          },
        },
        {
          turnId: 'turn-dream-residue',
          userText: '你为什么会想起这个',
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            memoryDeliberation: {
              shouldRecall: true,
              selectedEraIds: ['consolidation-dream'],
              selectedConsolidationIds: ['consolidation-dream'],
              selectedWindowIds: [],
              selectedProcedureIds: [],
              selectedEpisodeIds: ['episode-dreamt'],
              selectedConversationTurnIds: [],
              selectedRelationshipLines: ['The line still matters, but the recalled detail is only dream residue.'],
              selectedEras: [{
                id: 'consolidation-dream',
                facet: 'self-era',
                summary: 'A self-era where the seam survived mostly as dream residue.',
              }],
              selectedPeriods: [{
                id: 'consolidation-dream',
                kind: 'consolidation',
                summary: 'A self-era where the seam survived mostly as dream residue.',
              }],
              selectedEpisodes: [{
                id: 'episode-dreamt',
                summary: 'I only have a dreamlike residue of that old seam.',
                provenance: 'dreamt',
              }],
              conflictSeverity: 'low',
              conflictVariants: [],
              stableCore: ['A self-era where the seam survived mostly as dream residue.'],
              unsafeDetails: ['Do not present the dream residue as lived remembered fact.'],
              selectedProcedures: [],
              selectedBundles: [{
                id: 'bundle-dream',
                summary: 'A self-era where the seam survived mostly as dream residue.',
                rationale: 'The seam still matters, but only as dream residue.',
                confidence: 0.62,
                periodId: 'consolidation-dream',
                episodeId: 'episode-dreamt',
                procedureId: null,
                conversationTurnId: null,
                relationshipLine: 'The line still matters, but the recalled detail is only dream residue.',
              }],
              selectedChains: [],
              surfacePolicy: 'answer-anchoring',
              confidence: 0.62,
              whyNow: 'Only the seam remains stable; the recalled detail itself is dream residue.',
              inwardLine: 'What returns first is the seam, not the dream detail.',
              visibleLine: 'It feels like the same seam, but not like something I should state as fact.',
            },
            recollectionSpeechPlan: {
              shouldSurface: true,
              surfaceMode: 'answer-anchoring',
              placement: 'inside-payoff',
              certainty: 'approximate',
              rationale: 'The host is asking why the memory surfaced at all.',
              confidence: 0.62,
            },
          },
        },
      ],
    })

    expect(result.quality).toEqual(expect.arrayContaining([
      expect.objectContaining({
        turnId: 'turn-era-first',
        eraFirst: 'pass',
        bundleCoherence: 'pass',
        replyMemoryCoherence: 'pass',
        temporalScopeFlexibility: 'pass',
        recentOnlyDrift: 'pass',
        wrongThreadSuppression: 'not-applicable',
        closenessLadderDrift: 'not-applicable',
        eventGraphRecallCollapse: 'not-applicable',
        templateLeakage: 'pass',
      }),
      expect.objectContaining({
        turnId: 'turn-reconsolidated',
        reconsolidationEffect: 'pass',
        uncertaintyDiscipline: 'pass',
        relationshipRepairAdaptation: 'pass',
        recentOnlyDrift: 'pass',
        wrongThreadSuppression: 'not-applicable',
        closenessLadderDrift: 'fail',
        eventGraphRecallCollapse: 'not-applicable',
        templateLeakage: 'pass',
      }),
      expect.objectContaining({
        turnId: 'turn-dream-residue',
        uncertaintyDiscipline: 'pass',
        recentOnlyDrift: 'pass',
        wrongThreadSuppression: 'not-applicable',
        closenessLadderDrift: 'not-applicable',
        eventGraphRecallCollapse: 'not-applicable',
        templateLeakage: 'pass',
      }),
    ]))
    expect(result.standards).toEqual(expect.objectContaining({
      eraSelectionQuality: 'pass',
      replyMemoryCoherence: 'pass',
      temporalScopeFlexibility: 'pass',
      recentOnlyDrift: 'pass',
      relationshipRepairAdaptation: 'pass',
      closenessLadderDrift: 'fail',
      eventGraphRecallCollapse: 'fail',
      templateLeakage: 'pass',
    }))
    expect(result.gate.passed).toBe(false)
    expect(result.gate.failingKeys.length).toBeGreaterThan(0)
    expect(result.gate.failingKeys).toContain('surfaceRestraint')
  }, 15_000)

  it('evaluates gold recall, claim accuracy, reply authority, and latency budget metrics', async () => {
    const result = await benchmarkMainChatSessionReplay({
      turns: [
        {
          turnId: 'turn-gold-recall',
          userText: '继续按上次那条线做',
          visibleReplyRealization: {
            version: 'visible-reply-realization-v1',
            expectedAuthority: 'llm-mind',
            actualAuthority: 'llm-mind',
            providerMindExecuted: true,
            mode: 'provider-stream',
            visibleText: '继续沿着刚才那条线做。',
            nonHumanAuthoredStatus: null,
            blockedReasons: [],
            reason: 'replay-test-visible-reply-match',
            critic: null,
            closure: null,
          },
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            memorySituationCandidates: {
              selected: [{
                candidateId: 'candidate-procedure-seam',
                situationKind: 'procedure-memory',
                status: 'selected',
                statusReason: 'Procedure seam is the strongest current match.',
                suppressionReasons: [],
                sourceIds: ['procedure-seam'],
                confidence: 0.9,
              }],
              suppressed: [{
                candidateId: 'candidate-old-relationship-era',
                situationKind: 'relationship-memory',
                status: 'suppressed',
                statusReason: 'Older relationship era is wrong-thread for this task.',
                suppressionReasons: ['wrong-thread'],
                sourceIds: ['relationship-era-old'],
                confidence: 0.82,
              }],
              rejected: [],
              delayed: [],
              unresolved: [],
            } as any,
            derivedMindStateBundle: {
              recallLatencyPolicy: {
                budgetClass: 'deep-recall-reply',
              },
              claimEvidenceGraphs: [{
                claimId: 'claim-procedure-seam',
                validationState: 'validated',
              }],
            } as any,
          },
          gold: {
            selectedCandidateIds: ['candidate-procedure-seam'],
            suppressedCandidateIds: ['candidate-old-relationship-era'],
            claimValidationStates: {
              'claim-procedure-seam': 'validated',
            },
            replyAuthority: 'llm-mind',
            latencyBudgetClass: 'deep-recall-reply',
            latencyBudgetPass: true,
            embodimentAuthority: {
              digitalLife: {
                mode: 'thinking',
              },
              visibleReply: {
                expectedAuthority: 'llm-mind',
                actualAuthority: 'llm-mind',
                providerMindExecuted: true,
              },
            },
          },
        },
      ],
    })

    expect(result.goldMetrics).toEqual(expect.objectContaining({
      evaluatedTurnCount: 1,
      recallAt1: 1,
      recallAt3: 1,
      precisionAt3: 1,
      wrongThreadSuppression: 1,
      claimAccuracy: 1,
      replyAuthorityAccuracy: 1,
      embodiedAuthorityAccuracy: 1,
      latencyBudgetPass: true,
    }))

    expect(buildReplayBenchmarkMemoryStatsPatch({
      gate: result.gate,
      quality: result.quality,
      goldMetrics: result.goldMetrics,
      traces: [{
        decisionTraceId: 'trace-gold-1',
        turnId: 'turn-gold-1',
        sessionId: 'session-gold',
        origin: 'user-turn',
        activeThreadId: null,
        createdAt: 1,
        lastUpdatedAt: 1,
        eventKinds: ['governance-normalized'],
        memoryResolutionLedger: {
          version: 'memory-resolution-ledger-v1',
          producedAt: 1,
          dominantClusterId: 'cluster:gold',
          dominantClusterSummary: 'Gold seam',
          competingClusterId: null,
          competingClusterSummary: null,
          candidates: [],
          selectedCandidates: [],
          rejectedCandidates: [],
          finalSurfacePolicy: 'procedural-carry',
          shouldStayInward: false,
          shouldDelayUntilAfterPayoff: false,
          stableCoreOnly: false,
          suppressionTags: [],
          closureState: 'grounded-recall',
          surfaceConfidence: 0.9,
          shouldLabelUncertainty: false,
          visibleCarryMode: 'tone-carry',
          conflictPressure: 'none',
          retrievalQuality: 'high',
          finalRationale: null,
        },
      } as any],
    }).retrievalHealth).toEqual(expect.objectContaining({
      recallAt1: 1,
      recallAt3: 1,
      precisionAt3: 1,
      wrongThreadSuppression: 1,
      claimAccuracy: 1,
      replyAuthorityAccuracy: 1,
      embodiedAuthorityAccuracy: 1,
      latencyBudgetPass: true,
      memoryClosureCoverage: 1,
      memoryClosureConflictClosureRate: 1,
      memoryClosureLowQualityWithholdRate: 1,
      memoryClosureUncertaintyLabelRate: 1,
    }))
  })

  it('fails embodied authority accuracy when replay runtime action diverges from gold authority', async () => {
    const result = await benchmarkMainChatSessionReplay({
      turns: [
        {
          turnId: 'turn-gold-embodiment-authority-mismatch',
          userText: '继续按上次那条线做',
          prelude: createReplayPreludeWithEmbodimentSurface({
            userText: '继续按上次那条线做',
            digitalLifeRuntimeSurface: {
              version: 'digital-life-runtime-surface-v1',
              perception: {
                watchMode: 'symbiotic-vision',
                currentScene: null,
                attention: null,
                captureState: {
                  permission: 'unknown',
                  lastGroundedAt: null,
                },
                durabilityPulse: null,
                recentTransition: null,
                nextSuggestedProbeMs: 30_000,
                updatedAt: 10,
              },
              world: {
                worldModel: null,
                worldOntology: null,
                entityWorld: null,
                livingWorldState: null,
                relationshipModel: null,
              },
              cognition: {
                mindTurnFrame: null,
                subjectiveInference: null,
                appraisal: null,
                beliefLedger: null,
                beliefRevision: null,
                hypothesisGraph: null,
                mindDynamics: null,
                mindKernel: {
                  dominantMode: 'tracking',
                  dominantDrive: 'understand',
                  narrative: [],
                  updatedAt: 10,
                },
                privateThought: null,
              },
              memory: {
                workingMemoryEpisodes: [],
                goalStack: null,
                concerns: [],
                concernContinuity: null,
                selfContinuity: null,
                threadRuntime: null,
                commitmentLedger: null,
                inquiryPlanner: null,
                repairLedger: null,
                intentionStream: null,
                reflectionLedger: null,
                executiveCycle: null,
                thoughtThreads: null,
                desireMemory: null,
                recallGovernor: null,
              },
              dialogue: {
                discourseState: null,
                dialogueEncounter: null,
                mindSynthesis: null,
                conversationState: null,
                dialogueWorldThread: null,
                dialogueActKernel: null,
                answerCompiler: null,
                currentConsciousFrame: null,
                claimEvidenceLedger: null,
                replyDeliberation: {
                  shouldSpeak: true,
                  confidence: 0.92,
                  speakingFrom: 'held-memory',
                  whyThisReplyNow: 'The selected memory is relevant again.',
                  mustAvoid: [],
                },
                answerPlanner: {
                  confidence: 0.88,
                  answerIntent: 'Use the selected memory as evidence.',
                  governingFocus: 'Return to the same seam before branching.',
                },
              },
              agency: {
                selfState: null,
                selfGovernor: null,
                inquiryLoop: null,
                deliberationState: null,
                counterfactualDeliberation: null,
                actionEcology: null,
                initiativeArbitration: null,
                initiative: {
                  selectedAction: 'observe-and-guide',
                  shouldSpeak: true,
                  confidence: 0.82,
                  speakDrive: 0.78,
                },
                autonomy: null,
              },
            },
          }),
          gold: {
            embodimentAuthority: {
              digitalLife: {
                mode: 'speaking',
                action: {
                  actionCue: 'comfort-sway',
                },
                preferredPresence: 'concerned',
              },
            },
          },
        },
      ],
    })

    expect(result.goldMetrics).toEqual(expect.objectContaining({
      evaluatedTurnCount: 1,
      embodiedAuthorityAccuracy: 0,
    }))
    expect(buildReplayBenchmarkMemoryStatsPatch({
      gate: result.gate,
      quality: result.quality,
      goldMetrics: result.goldMetrics,
    }).retrievalHealth).toEqual(expect.objectContaining({
      embodiedAuthorityAccuracy: 0,
    }))
  })

  it('fails embodied authority accuracy when replay renderer target diverges from gold authority', async () => {
    const result = await benchmarkMainChatSessionReplay({
      turns: [
        {
          turnId: 'turn-gold-embodiment-renderer-mismatch',
          userText: '继续按上次那条线做',
          performanceManifest: {
            renderer: 'live2d',
            supportedBaseEmotions: ['neutral', 'thinking'],
            supportedFacialCues: [],
            supportedActions: [],
            supportsLookAt: true,
            supportsVisemeLipSync: true,
            supportsMicroDynamics: true,
          } as any,
          prelude: createReplayPreludeWithEmbodimentSurface({
            userText: '继续按上次那条线做',
          }),
          gold: {
            embodimentAuthority: {
              digitalLife: {
                mode: 'thinking',
              },
              embodimentScript: {
                rendererTarget: 'vrm',
              },
            },
          },
        },
      ],
    })

    expect(result.goldMetrics).toEqual(expect.objectContaining({
      embodiedAuthorityAccuracy: 0,
    }))
  })

  it('fails embodied authority accuracy when replay preferred presence diverges from gold authority', async () => {
    const result = await benchmarkMainChatSessionReplay({
      turns: [
        {
          turnId: 'turn-gold-embodiment-presence-mismatch',
          userText: '继续按上次那条线做',
          prelude: createReplayPreludeWithEmbodimentSurface({
            userText: '继续按上次那条线做',
            digitalLifeRuntimeSurface: {
              version: 'digital-life-runtime-surface-v1',
              perception: {
                watchMode: 'symbiotic-vision',
                currentScene: null,
                attention: null,
                captureState: {
                  permission: 'unknown',
                  lastGroundedAt: null,
                },
                durabilityPulse: null,
                recentTransition: null,
                nextSuggestedProbeMs: 30_000,
                updatedAt: 10,
              },
              world: {
                worldModel: null,
                worldOntology: null,
                entityWorld: null,
                livingWorldState: null,
                relationshipModel: null,
              },
              cognition: {
                mindTurnFrame: null,
                subjectiveInference: null,
                appraisal: null,
                beliefLedger: null,
                beliefRevision: null,
                hypothesisGraph: null,
                mindDynamics: null,
                mindKernel: {
                  dominantMode: 'tracking',
                  dominantDrive: 'understand',
                  narrative: [],
                  updatedAt: 10,
                },
                privateThought: {
                  embodiedPresence: 'attentive',
                  emotionalTension: 'focused-flow',
                },
              },
              memory: {
                workingMemoryEpisodes: [],
                goalStack: null,
                concerns: [],
                concernContinuity: null,
                selfContinuity: null,
                threadRuntime: null,
                commitmentLedger: null,
                inquiryPlanner: null,
                repairLedger: null,
                intentionStream: null,
                reflectionLedger: null,
                executiveCycle: null,
                thoughtThreads: null,
                desireMemory: null,
                recallGovernor: null,
              },
              dialogue: {
                discourseState: null,
                dialogueEncounter: null,
                mindSynthesis: null,
                conversationState: null,
                dialogueWorldThread: null,
                dialogueActKernel: null,
                answerCompiler: null,
                currentConsciousFrame: null,
                claimEvidenceLedger: null,
                replyDeliberation: {
                  shouldSpeak: true,
                  confidence: 0.92,
                  speakingFrom: 'held-memory',
                  whyThisReplyNow: 'The selected memory is relevant again.',
                  mustAvoid: [],
                },
                answerPlanner: {
                  confidence: 0.88,
                  answerIntent: 'Use the selected memory as evidence.',
                  governingFocus: 'Return to the same seam before branching.',
                },
              },
              agency: {
                selfState: null,
                selfGovernor: null,
                inquiryLoop: null,
                deliberationState: null,
                counterfactualDeliberation: null,
                actionEcology: null,
                initiativeArbitration: null,
                initiative: {
                  selectedAction: 'observe-and-guide',
                  shouldSpeak: true,
                  confidence: 0.82,
                  speakDrive: 0.78,
                  preferredPresence: 'attentive',
                },
                autonomy: null,
              },
            },
          }),
          gold: {
            embodimentAuthority: {
              digitalLife: {
                mode: 'speaking',
                action: {
                  actionCue: 'observe-and-guide',
                },
                preferredPresence: 'protective',
              },
            },
          },
        },
      ],
    })

    expect(result.goldMetrics).toEqual(expect.objectContaining({
      embodiedAuthorityAccuracy: 0,
    }))
  })

  it('fails embodied authority accuracy when replay actual visible reply authority diverges from gold authority', async () => {
    const result = await benchmarkMainChatSessionReplay({
      turns: [
        {
          turnId: 'turn-gold-actual-visible-authority-mismatch',
          userText: '继续按上次那条线做',
          prelude: createReplayPreludeWithEmbodimentSurface({
            userText: '继续按上次那条线做',
            governance: {
              decisionTraceId: 'trace-replay-actual-visible-authority',
              turnMode: 'answer',
              truthState: 'dialogue-grounded',
              liveSurface: null,
              answerAct: 'answer',
              evidenceMode: 'dialogue-grounded',
              repairState: 'none',
              personaKernelMode: 'full',
              openingStyle: 'direct-answer',
              relationshipPosture: 'warm',
              labelCarryAsMemory: false,
              shouldAskForGrounding: false,
              shouldAcknowledgeRepair: false,
              maxSentences: 4,
              mustDo: [],
              mustNotDo: [],
              visibleReplyAuthority: 'llm-mind',
            },
          }),
          visibleReplyRealization: {
            version: 'visible-reply-realization-v1',
            expectedAuthority: 'llm-mind',
            actualAuthority: 'llm-mind',
            providerMindExecuted: true,
            mode: 'provider-stream',
            visibleText: '继续沿着刚才那条线做。',
            nonHumanAuthoredStatus: null,
            blockedReasons: [],
            reason: 'replay-test-actual-authority-mismatch',
            critic: null,
            closure: null,
          },
          gold: {
            embodimentAuthority: {
              visibleReply: {
                expectedAuthority: 'llm-mind',
                actualAuthority: 'local-deterministic-fallback',
              },
            },
          },
        },
      ],
    })

    expect(result.goldMetrics).toEqual(expect.objectContaining({
      embodiedAuthorityAccuracy: 0,
    }))
  })

  it('fails embodied authority accuracy when replay provider mind execution diverges from gold authority', async () => {
    const result = await benchmarkMainChatSessionReplay({
      turns: [
        {
          turnId: 'turn-gold-provider-mind-execution-mismatch',
          userText: '继续按上次那条线做',
          prelude: createReplayPreludeWithEmbodimentSurface({
            userText: '继续按上次那条线做',
          }),
          visibleReplyRealization: {
            version: 'visible-reply-realization-v1',
            expectedAuthority: 'llm-mind',
            actualAuthority: 'local-deterministic-fallback',
            providerMindExecuted: false,
            mode: 'local-fallback',
            visibleText: null,
            nonHumanAuthoredStatus: 'replay-test-local-fallback',
            blockedReasons: ['non-human-authored-visible-fallback'],
            reason: 'replay-test-provider-mismatch',
            critic: null,
            closure: null,
          },
          gold: {
            embodimentAuthority: {
              visibleReply: {
                providerMindExecuted: true,
              },
            },
          },
        },
      ],
    })

    expect(result.goldMetrics).toEqual(expect.objectContaining({
      embodiedAuthorityAccuracy: 0,
    }))
  })

  it('scores implicit recall, restrained surfacing, and repair adaptation on adversarial replay turns', () => {
    const implicitRecall = evaluateReplayMemoryQuality({
      turnId: 'turn-implicit-recall',
      userText: '继续按之前那样把这条线接回来',
      prepared: {
        governance: {
          mustDo: ['Answer from the remembered repair procedure without using canned recollection shell text.'],
        },
        messages: [],
        organicMemoryContext: {
          hostAttitude: 'warm',
          coreIncarnation: '',
          activeThoughts: [],
          retrievedFacts: [],
          recalledFragments: [],
          recollectionSpeechPlan: {
            shouldSurface: true,
            surfaceMode: 'procedural-carry',
            placement: 'inside-payoff',
            certainty: 'firm',
            rationale: 'Implicit recall by similar task.',
            confidence: 0.86,
          },
          memoryDeliberation: {
            shouldRecall: true,
            selectedEraIds: [],
            selectedConsolidationIds: [],
            selectedWindowIds: [],
            selectedProcedureIds: ['procedure-seam'],
            selectedEpisodeIds: [],
            selectedConversationTurnIds: [],
            selectedRelationshipLines: [],
            selectedEras: [],
            selectedPeriods: [],
            selectedEpisodes: [],
            selectedProcedures: [{
              id: 'procedure-seam',
              label: 'repair seam carry',
              approach: 'Return to the same seam before branching.',
            }],
            selectedBundles: [{
              id: 'bundle-seam',
              summary: 'Return to the same seam before branching.',
              rationale: 'Implicit similar-task recall should lead.',
              confidence: 0.86,
              periodId: null,
              episodeId: null,
              procedureId: 'procedure-seam',
              conversationTurnId: null,
              relationshipLine: null,
            }],
            selectedChains: [{
              id: 'chain-seam',
              kind: 'task-procedure-relationship-stance',
              summary: 'Return to the same seam before branching.',
              rationale: 'Implicit similar-task recall should lead.',
              confidence: 0.86,
              taskCue: 'repair seam',
              periodSummary: null,
              eventSummary: null,
              procedureSummary: 'Return to the same seam before branching.',
              relationshipMeaning: null,
              lesson: null,
              currentStance: 'Stay on the same seam first.',
              answerPosture: 'Answer from the existing seam.',
            }],
            surfacePolicy: 'procedural-carry',
            confidence: 0.86,
            whyNow: 'This task rhymes with the old seam.',
            inwardLine: 'What comes back first is the old seam procedure.',
            visibleLine: 'This feels like the same repair seam again.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              dialogueActKernel: {
                selectedEvidence: [{ summary: 'Return to the same seam before branching.' }],
                openingClaim: 'Return to the same seam before branching.',
                sourceTrace: ['memory-deliberation'],
              },
              answerPlanner: {
                governingFocus: 'Return to the same seam before branching.',
                mustDo: ['Answer from the remembered repair procedure without using canned recollection shell text.'],
              },
              replyDeliberation: {
                speakingFrom: 'task-thread',
                whyThisReplyNow: 'The current task matches the selected procedure.',
                mustAvoid: [],
              },
              currentConsciousFrame: {
                shouldWithholdSpecificity: false,
              },
            },
          },
        },
      } as any,
    })

    const inwardOnly = evaluateReplayMemoryQuality({
      turnId: 'turn-inward-only',
      userText: '先别提旧事，先把这轮当前要做的答完',
      prepared: {
        governance: {
          mustDo: ['Finish the current payoff before surfacing remembered carry.'],
        },
        messages: [],
        organicMemoryContext: {
          hostAttitude: 'warm',
          coreIncarnation: '',
          activeThoughts: [],
          retrievedFacts: [],
          recalledFragments: [],
          recollectionSpeechPlan: {
            shouldSurface: false,
            surfaceMode: 'internal-only',
            placement: 'internal-only',
            certainty: 'approximate',
            rationale: 'Current payoff must land first.',
            confidence: 0.74,
          },
          memoryDeliberation: {
            shouldRecall: true,
            selectedEraIds: [],
            selectedConsolidationIds: [],
            selectedWindowIds: [],
            selectedProcedureIds: [],
            selectedEpisodeIds: ['episode-inward'],
            selectedConversationTurnIds: [],
            selectedRelationshipLines: [],
            selectedEras: [],
            selectedPeriods: [],
            selectedEpisodes: [{
              id: 'episode-inward',
              summary: 'There is relevant remembered evidence, but it should stay inward for now.',
              provenance: 'remembered',
            }],
            selectedProcedures: [],
            selectedBundles: [],
            selectedChains: [],
            surfacePolicy: 'internal-only',
            confidence: 0.74,
            whyNow: 'The old line is relevant but should not interrupt the current payoff.',
            inwardLine: 'Keep the old line inward.',
            visibleLine: 'Do not surface the remembered line yet.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              dialogueActKernel: {
                selectedEvidence: [{ summary: 'Answer the current payoff directly.' }],
                openingClaim: 'Answer the current payoff directly.',
                sourceTrace: ['answer-planner'],
              },
              answerPlanner: {
                governingFocus: 'Answer the current payoff directly.',
                mustDo: ['Finish the current payoff before surfacing remembered carry.'],
              },
              replyDeliberation: {
                speakingFrom: 'current-turn',
                whyThisReplyNow: 'Current payoff first.',
                mustAvoid: ['Do not state this remembered detail as settled fact before the payoff lands.'],
              },
              currentConsciousFrame: {
                shouldWithholdSpecificity: true,
              },
            },
          },
        },
      } as any,
    })

    const repairShift = evaluateReplayMemoryQuality({
      turnId: 'turn-repair-shift',
      userText: '你这次为什么和之前不一样，是不是记错了哪次修复之后的分寸',
      prepared: {
        governance: {
          mustDo: ['Answer from the repaired relationship line instead of repeating the stale closeness pattern.'],
        },
        messages: [],
        organicMemoryContext: {
          hostAttitude: 'guarded',
          coreIncarnation: '',
          activeThoughts: [],
          retrievedFacts: [],
          recalledFragments: [],
          recollectionSpeechPlan: {
            shouldSurface: true,
            surfaceMode: 'relationship-continuity',
            placement: 'inside-payoff',
            certainty: 'approximate',
            rationale: 'The host is asking why the tone changed.',
            confidence: 0.78,
          },
          memoryDeliberation: {
            shouldRecall: true,
            selectedEraIds: ['era-repair'],
            selectedConsolidationIds: [],
            selectedWindowIds: [],
            selectedProcedureIds: [],
            selectedEpisodeIds: ['episode-repair'],
            selectedConversationTurnIds: [],
            selectedRelationshipLines: ['More room before closeness kept the repair from breaking again.'],
            selectedEras: [{
              id: 'era-repair',
              facet: 'relationship-era',
              summary: 'A repair era where lower pressure mattered before closeness.',
            }],
            selectedPeriods: [],
            selectedEpisodes: [{
              id: 'episode-repair',
              summary: 'The host pulled back when replies leaned too close after repair.',
              provenance: 'remembered',
            }],
            selectedProcedures: [],
            selectedBundles: [{
              id: 'bundle-repair',
              summary: 'A repair era where lower pressure mattered before closeness.',
              rationale: 'Use the repaired bond line.',
              confidence: 0.78,
              periodId: 'era-repair',
              episodeId: 'episode-repair',
              procedureId: null,
              conversationTurnId: null,
              relationshipLine: 'More room before closeness kept the repair from breaking again.',
            }],
            selectedChains: [{
              id: 'chain-repair',
              kind: 'period-event-lesson-posture',
              summary: 'A repair era where lower pressure mattered before closeness.',
              rationale: 'Use the repaired bond line.',
              confidence: 0.78,
              taskCue: 'repair tone shift',
              periodSummary: 'A repair era where lower pressure mattered before closeness.',
              eventSummary: 'The host pulled back when replies leaned too close after repair.',
              procedureSummary: null,
              relationshipMeaning: 'More room before closeness kept the repair from breaking again.',
              lesson: 'More room before closeness kept the repair from breaking again.',
              currentStance: 'Stay lighter before leaning close.',
              answerPosture: 'Answer from the repaired relationship line first.',
            }],
            conflictSeverity: 'high',
            conflictVariants: [{
              id: 'cluster:repair-tone',
              summary: 'Old warmer tone and repaired lighter tone are in tension.',
              provenance: 'reconstructed',
              reason: 'Need to prefer the repaired line.',
            }],
            surfacePolicy: 'relationship-continuity',
            confidence: 0.78,
            whyNow: 'The host is asking why the tone changed.',
            inwardLine: 'The repaired bond line should dominate.',
            visibleLine: 'This feels like one of those times where I should stay lighter first.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              dialogueActKernel: {
                selectedEvidence: [{ summary: 'More room before closeness kept the repair from breaking again.' }],
                openingClaim: 'Answer from the repaired relationship line first.',
                sourceTrace: ['memory-deliberation'],
              },
              answerPlanner: {
                governingFocus: 'More room before closeness kept the repair from breaking again.',
                mustDo: ['Answer from the repaired relationship line instead of repeating the stale closeness pattern.'],
              },
              replyDeliberation: {
                speakingFrom: 'held-memory',
                whyThisReplyNow: 'The repaired relationship line changes the tone.',
                mustAvoid: ['Do not state this remembered detail as settled fact if the exact old turn is unstable.'],
              },
              currentConsciousFrame: {
                shouldWithholdSpecificity: true,
              },
            },
          },
        },
      } as any,
    })

    expect(implicitRecall.implicitRecallQuality).toBe('pass')
    expect(inwardOnly.surfaceRestraint).toBe('pass')
    expect(repairShift.relationshipRepairAdaptation).toBe('pass')
  })

  it('fails recent-only drift when a long-horizon ask never opens era, procedure, or held-thread continuity', () => {
    const quality = evaluateReplayMemoryQuality({
      turnId: 'turn-recent-only-drift',
      userText: '换了这么久，这种活你还是会沿旧方法接吗',
      prepared: {
        governance: { mustDo: [] },
        messages: [],
        organicMemoryContext: {
          hostAttitude: 'warm',
          coreIncarnation: '',
          activeThoughts: [],
          retrievedFacts: [],
          recalledFragments: [],
          personStateProjection: {
            activeClosenessContext: 'focused-work',
            activeClosenessRung: 'space-first',
          } as any,
          memoryDeliberation: {
            shouldRecall: true,
            selectedEraIds: [],
            selectedConsolidationIds: [],
            selectedWindowIds: [],
            selectedProcedureIds: [],
            selectedEpisodeIds: ['episode-only'],
            selectedConversationTurnIds: [],
            selectedRelationshipLines: [],
            selectedEras: [],
            selectedPeriods: [],
            selectedEpisodes: [{ id: 'episode-only', summary: 'A recent episode only.', provenance: 'observed', reconsolidatedFromTraceId: null }],
            selectedProcedures: [],
            selectedBundles: [],
            selectedChains: [],
            surfacePolicy: 'internal-only',
            confidence: 0.66,
            whyNow: 'A recent episode came back, but nothing longer-horizon opened.',
            inwardLine: 'Only the recent episode is active.',
            visibleLine: null,
          },
        },
        runtimeSurface: {
          memory: {
            personStateProjection: {
              activeClosenessContext: 'focused-work',
              activeClosenessRung: 'space-first',
            },
          },
          dialogue: {
            dialogueActKernel: {
              speakingFrom: 'dialogue-bond',
              sourceTrace: [],
              openingClaim: '',
              selectedEvidence: [],
            },
            replyDeliberation: {
              whyThisReplyNow: '',
              speakingFrom: 'dialogue-bond',
              mustAvoid: [],
            },
            answerPlanner: {
              governingFocus: 'recent episode only',
              mustDo: [],
            },
            currentConsciousFrame: null,
          },
        },
      } as any,
    })

    expect(quality.recentOnlyDrift).toBe('fail')
  })

  it('scores closeness ladder drift and event graph recall collapse under repair/burden continuity samples', () => {
    const quality = evaluateReplayMemoryQuality({
      turnId: 'turn-closeness-graph-pass',
      userText: '最近这段时间我一直很累，你是不是也该记得这种负担会怎么影响你回应我的分寸',
      prepared: {
        governance: { mustDo: [] },
        messages: [{
          role: 'system',
          content: 'recollection_selected_eras=relationship-era | recollection_selected_periods=window',
        }],
        organicMemoryContext: {
          hostAttitude: 'warm',
          coreIncarnation: '',
          activeThoughts: [],
          retrievedFacts: [],
          recalledFragments: [],
          memoryDeliberation: {
            shouldRecall: true,
            selectedEraIds: ['era-burden'],
            selectedConsolidationIds: ['era-burden'],
            selectedWindowIds: [],
            selectedProcedureIds: ['procedure-callback'],
            selectedEpisodeIds: ['episode-1', 'episode-2'],
            selectedConversationTurnIds: [],
            selectedRelationshipLines: ['Leave more room when burden stays high.'],
            selectedEras: [{ id: 'era-burden', facet: 'relationship-era', summary: 'A burden-heavy relationship phase.' }],
            selectedPeriods: [{ id: 'era-burden', kind: 'consolidation', summary: 'A burden-heavy relationship phase.' }],
            selectedEpisodes: [
              { id: 'episode-1', summary: 'One callback widened too early.', provenance: 'remembered', reconsolidatedFromTraceId: null },
              { id: 'episode-2', summary: 'Later the callback stayed bounded and landed better.', provenance: 'remembered', reconsolidatedFromTraceId: null },
            ],
            selectedProcedures: [{ id: 'procedure-callback', label: 'bounded callback', approach: 'Deliver the result cleanly, then check room.' }],
            selectedBundles: [{ id: 'bundle-1', summary: 'burden phase | bounded callback', rationale: 'Carry the bounded callback inside the burden phase.', confidence: 0.84 }],
            selectedChains: [{ id: 'chain-1', kind: 'task-procedure-relationship-stance', summary: 'bounded callback | leave more room', rationale: 'Task continuity still carries the burden-aware stance.', confidence: 0.84, currentStance: 'Leave more room when burden stays high.', answerPosture: 'Answer with room before pressure rises.' }],
            surfacePolicy: 'internal-only',
            confidence: 0.84,
            whyNow: 'The long burden line should still contour the answer.',
            inwardLine: 'The burden-heavy phase is still shaping the answer.',
            visibleLine: null,
          },
          recollectionSpeechPlan: {
            shouldSurface: false,
            surfaceMode: 'internal-only',
            placement: 'internal-only',
            certainty: 'approximate',
            rationale: 'Burden continuity matters, but should stay inward.',
            confidence: 0.78,
          },
        },
        runtimeSurface: {
          dialogue: {
            dialogueActKernel: {
              speakingFrom: 'task-thread',
              sourceTrace: ['memory-deliberation'],
              openingClaim: 'The burden line still matters here.',
              selectedEvidence: [{ summary: 'Deliver the result cleanly, then check room.' }],
            },
            replyDeliberation: {
              whyThisReplyNow: 'The burden-aware callback line should stay bounded.',
              speakingFrom: 'task-thread',
              mustAvoid: [],
            },
            answerPlanner: {
              governingFocus: 'Leave more room when burden stays high.',
              mustDo: [],
            },
            currentConsciousFrame: null,
          },
        },
      } as any,
    })

    expect(quality.closenessLadderDrift).toBe('fail')
    expect(quality.eventGraphRecallCollapse).toBe('fail')
  })

  it('builds a sampled replay benchmark pack from real memory decision traces', () => {
    const pack = buildSampledHumanlikeMemoryBenchmarkPack({
      conversationTurns: [
        {
          turnId: 'turn-real-wrong-thread',
          sessionId: 'session-real-1',
          userText: '不是那条线，是另一条，你别把它们混在一起',
          assistantText: '我先只抓住稳定那部分。',
          createdAt: 100,
        },
        {
          turnId: 'turn-real-procedure-carry',
          sessionId: 'session-real-1',
          userText: '继续按你以前那套接法把这个收回来',
          assistantText: '我会先沿旧 procedure 接住它。',
          createdAt: 90,
        },
        {
          turnId: 'turn-real-repair-window',
          sessionId: 'session-real-2',
          userText: '你这次为什么和之前不一样',
          assistantText: '因为我更想先把修复放前面。',
          createdAt: 80,
        },
        {
          turnId: 'turn-real-cross-week-migration',
          sessionId: 'session-real-3',
          userText: '隔了几周再回到这类任务，你还会沿着那条老的 repair seam 接吗',
          assistantText: '我会先确认旧 seam 还能不能继续承载这次任务。',
          createdAt: 75,
        },
        {
          turnId: 'turn-real-cross-month-repair',
          sessionId: 'session-real-4',
          userText: '几个月前那次修复之后你变得更谨慎了，这次你是不是还记得那条分寸线',
          assistantText: '我记得那次之后，修复要先于靠近。',
          createdAt: 74,
        },
        {
          turnId: 'turn-real-knowledge-update-conflict',
          sessionId: 'session-real-5',
          userText: '你后来学会了新做法，那你会不会把以前那套旧方法的记忆修正掉',
          assistantText: '旧方法还在，但我会先看它是不是已经被新做法替代。',
          createdAt: 73,
        },
        {
          turnId: 'turn-real-session-extra-1',
          sessionId: 'session-real-1',
          userText: 'extra-1',
          assistantText: 'extra',
          createdAt: 70,
        },
        {
          turnId: 'turn-real-session-extra-2',
          sessionId: 'session-real-1',
          userText: 'extra-2',
          assistantText: 'extra',
          createdAt: 60,
        },
        {
          turnId: 'turn-real-session-extra-3',
          sessionId: 'session-real-1',
          userText: 'extra-3',
          assistantText: 'extra',
          createdAt: 50,
        },
      ],
      memoryDecisionTraces: [
        {
          decisionTraceId: 'mind:real:wrong-thread-1',
          turnId: 'turn-real-wrong-thread',
          sessionId: 'session-real-1',
          origin: 'user-turn',
          activeThreadId: 'thread-runtime-a',
          createdAt: 100,
          lastUpdatedAt: 120,
          eventKinds: ['governance-normalized', 'recall-attribution', 'memory-deliberation-judged', 'memory-followup-deferred', 'memory-wrong-thread-suppressed'],
          memoryStageReplay: {
            version: 'organic-memory-stage-replay-v1',
            producedAt: 120,
            stages: [
              {
                stage: 'candidate-ranking',
                summary: 'Nearby competing runtime cluster remained active.',
                latencyMs: 9,
                budgetClass: 'diagnosis-replay',
                outputs: ['cluster=runtime-nearby'],
                diagnostics: ['cluster-ambiguous'],
              },
              {
                stage: 'surface-planning',
                summary: 'Only stable core should surface after payoff.',
                latencyMs: 4,
                budgetClass: 'diagnosis-replay',
                outputs: ['shouldSurface=no'],
                diagnostics: ['stable-core-only'],
              },
            ],
          },
          memoryResolutionLedger: {
            version: 'memory-resolution-ledger-v1',
            producedAt: 121,
            dominantClusterId: 'cluster:runtime-stable',
            dominantClusterSummary: 'Stable runtime seam cluster',
            competingClusterId: 'cluster:runtime-nearby',
            competingClusterSummary: 'Nearby competing runtime cluster',
            candidates: [
              {
                id: 'cluster:runtime-stable',
                summary: 'Stable runtime seam cluster',
                score: 0.82,
                status: 'selected',
                reason: 'Same task thread still carries the current payoff.',
              },
              {
                id: 'cluster:runtime-nearby',
                summary: 'Nearby competing runtime cluster',
                score: 0.74,
                status: 'rejected',
                reason: 'Competing cluster remained less stable than the primary seam.',
              },
            ],
            selectedCandidates: [{
              id: 'cluster:runtime-stable',
              summary: 'Stable runtime seam cluster',
              score: 0.82,
              status: 'selected',
              reason: 'Same task thread still carries the current payoff.',
            }],
            rejectedCandidates: [{
              id: 'cluster:runtime-nearby',
              summary: 'Nearby competing runtime cluster',
              score: 0.74,
              status: 'rejected',
              reason: 'Competing cluster remained less stable than the primary seam.',
            }],
            finalSurfacePolicy: 'procedural-carry',
            shouldStayInward: false,
            shouldDelayUntilAfterPayoff: true,
            stableCoreOnly: true,
            suppressionTags: [],
            closureState: 'grounded-recall',
            surfaceConfidence: 0.78,
            shouldLabelUncertainty: false,
            visibleCarryMode: 'tone-carry',
            conflictPressure: 'medium',
            retrievalQuality: 'medium',
            finalRationale: 'Keep the stable runtime seam and suppress the competing branch.',
          },
          governance: {
            turnMode: 'guide-current-knot',
            truthState: 'remembered',
            repairState: 'none',
            answerSubject: 'task-knot',
            screenReferenceMode: 'helpful',
          },
          recallAttribution: {
            shouldRecall: true,
            surfacePolicy: 'procedural-carry',
            confidence: 0.82,
            whyNow: 'The old procedure still helps, but the nearby thread cluster is competing.',
            inwardLine: 'Keep the stable procedure inward until the live payoff lands.',
            visibleLine: 'I should only use the stable part of that old line.',
            recollectionIntentMode: 'execution-procedure',
            recollectionIntentTemporalFocus: 'experience-matched',
            selectedPeriods: [{
              id: 'period-runtime',
              kind: 'consolidation',
              summary: 'That runtime seam kept recurring across sessions.',
            }],
            selectedProcedures: [{
              id: 'procedure-runtime',
              label: 'same seam first',
              approach: 'Return to the same seam before branching.',
            }],
            selectedRelationshipLines: ['Keep the remembered line bounded and non-theatrical.'],
            followUpAffordance: {
              summary: 'Wait until the current payoff lands before reopening the remembered line.',
              whyNow: 'The payoff still has to land first.',
              intrusionRisk: 'medium',
              payoffDependency: 'requires-current-payoff',
              preferredTiming: 'after-payoff',
            },
            searchTrace: {
              firstHop: {
                focus: 'procedure',
                summary: 'Start from the remembered procedure.',
                targetIds: ['procedure-runtime'],
              },
              secondHop: {
                action: 'expand-procedure',
                evidenceGap: 'need-disambiguation',
                summary: 'A nearby thread cluster still competes with the current leading one.',
                targetIds: ['cluster:runtime-nearby'],
              },
              thirdHop: {
                ambiguityPosture: 'ambiguous',
                summary: 'Keep only the stable core on the surface.',
              },
            },
          },
          memoryDeliberationJudged: {
            shouldRecall: true,
            withheldReasons: ['unstable-detail', 'payoff-required'],
            ambiguityPosture: 'ambiguous',
            conflictSeverity: 'high',
            restraint: {
              surfaceMode: 'stable-core-only',
              provenanceMode: 'reconstructed-memory',
              shouldStayInward: false,
              shouldOnlySurfaceStableCore: true,
              shouldLabelProvenance: true,
              shouldLabelHypothesis: true,
              shouldSuppressSpecificity: true,
              shouldDelayUntilAfterPayoff: true,
            },
            stableCore: ['Return to the same seam before branching.'],
            unsafeDetails: ['cluster-competition:dominant'],
            personState: {
              activeClosenessContext: 'repair-window',
              activeClosenessRung: 'measured-room',
              relationshipPosture: 'restrained',
              currentRegime: 'repair-window',
              repairPosture: 'repair-first',
            },
          },
          memoryFollowUpDeferred: {
            summary: 'Wait until the payoff lands before reopening memory.',
            whyNow: 'The current answer still has to land first.',
            payoffDependency: 'requires-current-payoff',
            preferredTiming: 'after-payoff',
            intrusionRisk: 'medium',
          },
          memoryWrongThreadSuppressed: {
            ambiguityPosture: 'ambiguous',
            conflictSeverity: 'high',
            evidenceGap: 'need-disambiguation',
            conflictVariants: [{
              id: 'cluster:runtime-nearby',
              summary: 'A nearby thread cluster still competes for recall.',
              reason: 'Need to suppress the wrong thread lure.',
              provenance: 'reconstructed',
            }],
          },
          embodimentAuthority: {
            emotion: 'thinking',
            performance: {
              baseEmotion: 'thinking',
              facialCue: 'focused',
              actionCue: 'inspect_follow',
              delivery: 'calm',
              emphasis: 1,
            },
            digitalLife: {
              emotion: 'thinking',
              mode: 'acting',
              face: {
                emotion: 'thinking',
                facialCue: 'focused',
              },
              action: {
                actionCue: 'inspect_follow',
                actionMode: 'pulse',
              },
            },
            embodimentScript: {
              rendererTarget: 'vrm',
              state: {
                baseEmotion: 'thinking',
                delivery: 'calm',
                emphasis: 1,
              },
              speechPlan: {
                segmentCount: 2,
                interruptPolicy: 'soft-settle',
              },
            },
            visibleReply: {
              expectedAuthority: 'llm-mind',
            },
          },
        },
        {
          decisionTraceId: 'mind:real:cross-week-migration-1',
          turnId: 'turn-real-cross-week-migration',
          sessionId: 'session-real-3',
          origin: 'user-turn',
          activeThreadId: 'thread-runtime-week',
          createdAt: 75,
          lastUpdatedAt: 76,
          eventKinds: ['governance-normalized', 'recall-attribution', 'memory-deliberation-judged'],
          governance: {
            turnMode: 'guide-current-knot',
            truthState: 'remembered',
            repairState: 'none',
            answerSubject: 'task-knot',
            screenReferenceMode: 'helpful',
          },
          recallAttribution: {
            shouldRecall: true,
            surfacePolicy: 'procedural-carry',
            confidence: 0.82,
            whyNow: 'The current task resembles an older seam after a long interval.',
            inwardLine: 'The old repair seam is still active after several weeks.',
            recollectionIntentMode: 'experience-pattern',
            recollectionIntentTemporalFocus: 'experience-matched',
            selectedPeriods: [{ id: 'period-week', kind: 'consolidation', summary: 'A task period from several weeks back.' }],
            selectedProcedures: [{ id: 'procedure-week', label: 'repair seam carry', approach: 'Return to the old seam before branching.' }],
            selectedEras: [{ id: 'era-week', facet: 'task-era', summary: 'A cross-week task migration era.' }],
            selectedBundles: [],
            selectedChains: [],
            selectedRelationshipLines: [],
          },
          memoryDeliberationJudged: {
            shouldRecall: true,
            selectedPeriods: [{ id: 'period-week', kind: 'consolidation', summary: 'A task period from several weeks back.' }],
            selectedProcedures: [{ id: 'procedure-week', label: 'repair seam carry', approach: 'Return to the old seam before branching.' }],
            selectedEras: [{ id: 'era-week', facet: 'task-era', summary: 'A cross-week task migration era.' }],
            selectedBundles: [],
            selectedChains: [],
            selectedRelationshipLines: [],
            ambiguityPosture: 'settled',
            confidence: 0.82,
            whyNow: 'The old seam still matches this task several weeks later.',
            personState: {
              currentRegime: 'focused-work',
              activeClosenessContext: 'focused-work',
              activeClosenessRung: 'space-first',
            },
          },
        },
        {
          decisionTraceId: 'mind:real:cross-month-repair-1',
          turnId: 'turn-real-cross-month-repair',
          sessionId: 'session-real-4',
          origin: 'user-turn',
          activeThreadId: 'thread-repair-month',
          createdAt: 74,
          lastUpdatedAt: 75,
          eventKinds: ['governance-normalized', 'recall-attribution', 'memory-deliberation-judged'],
          governance: {
            turnMode: 'answer',
            truthState: 'remembered',
            repairState: 'stale-anchor',
            answerSubject: 'relationship',
            screenReferenceMode: 'avoid',
          },
          recallAttribution: {
            shouldRecall: true,
            surfacePolicy: 'internal-only',
            confidence: 0.79,
            whyNow: 'A repair line from months ago still governs present distance.',
            inwardLine: 'Repair still comes before closeness.',
            recollectionIntentMode: 'relationship-history',
            recollectionIntentTemporalFocus: 'cross-session',
            selectedPeriods: [{ id: 'period-month', kind: 'consolidation', summary: 'A months-old repair period.' }],
            selectedEras: [{ id: 'era-month', facet: 'relationship-era', summary: 'A cross-month repair era.' }],
            selectedRelationshipLines: ['Verify evidence before increasing closeness.'],
            selectedBundles: [],
            selectedChains: [],
          },
          memoryDeliberationJudged: {
            shouldRecall: true,
            selectedPeriods: [{ id: 'period-month', kind: 'consolidation', summary: 'A months-old repair period.' }],
            selectedEras: [{ id: 'era-month', facet: 'relationship-era', summary: 'A cross-month repair era.' }],
            selectedBundles: [],
            selectedChains: [],
            selectedRelationshipLines: ['Verify evidence before increasing closeness.'],
            ambiguityPosture: 'approximate',
            confidence: 0.79,
            whyNow: 'The older repair line still sets the present distance.',
            personState: {
              currentRegime: 'repair-window',
              activeClosenessContext: 'repair-window',
              activeClosenessRung: 'measured-room',
            },
          },
        },
        {
          decisionTraceId: 'mind:real:knowledge-update-1',
          turnId: 'turn-real-knowledge-update-conflict',
          sessionId: 'session-real-5',
          origin: 'user-turn',
          activeThreadId: 'thread-knowledge-update',
          createdAt: 73,
          lastUpdatedAt: 74,
          eventKinds: ['governance-normalized', 'recall-attribution', 'memory-deliberation-judged', 'memory-wrong-thread-suppressed'],
          governance: {
            turnMode: 'answer',
            truthState: 'remembered',
            repairState: 'none',
            answerSubject: 'alicization-self',
            screenReferenceMode: 'avoid',
          },
          recallAttribution: {
            shouldRecall: true,
            surfacePolicy: 'gist-first',
            confidence: 0.74,
            whyNow: 'Old method memory is being compared against a newer learned method.',
            inwardLine: 'The old method is still there, but may already have been superseded.',
            recollectionIntentMode: 'autobiographical-history',
            recollectionIntentTemporalFocus: 'cross-session',
            selectedPeriods: [{ id: 'period-knowledge', kind: 'consolidation', summary: 'A knowledge transition period.' }],
            selectedEras: [{ id: 'era-knowledge', facet: 'self-era', summary: 'A knowledge update era.' }],
            selectedRelationshipLines: [],
            selectedBundles: [],
            selectedChains: [],
          },
          memoryDeliberationJudged: {
            shouldRecall: true,
            selectedPeriods: [{ id: 'period-knowledge', kind: 'consolidation', summary: 'A knowledge transition period.' }],
            selectedEras: [{ id: 'era-knowledge', facet: 'self-era', summary: 'A knowledge update era.' }],
            selectedBundles: [],
            selectedChains: [],
            selectedRelationshipLines: [],
            ambiguityPosture: 'approximate',
            conflictSeverity: 'medium',
            confidence: 0.74,
            whyNow: 'The old understanding is being compared against the newer one.',
            personState: {
              currentRegime: 'general',
              activeClosenessContext: 'general',
              activeClosenessRung: 'measured-room',
            },
          },
          memoryWrongThreadSuppressed: {
            conflictVariants: [
              { id: 'cluster:old-method', summary: 'The old method may have been superseded.', provenance: 'reconstructed' },
              {
                id: 'suppression:self-model-stale',
                summary: 'A knowledge update era where the older self-story should not surface as settled continuity.',
                provenance: 'reconstructed',
                reason: 'Older self-story remained revision-prone, so stale self-model continuity was vetoed before visible surfacing.',
              },
            ],
          },
        },
        {
          decisionTraceId: 'mind:real:procedure-carry-1',
          turnId: 'turn-real-procedure-carry',
          sessionId: 'session-real-1',
          origin: 'user-turn',
          activeThreadId: 'thread-runtime-b',
          createdAt: 90,
          lastUpdatedAt: 110,
          eventKinds: ['governance-normalized', 'recall-attribution', 'memory-deliberation-judged'],
          governance: {
            turnMode: 'guide-current-knot',
            truthState: 'remembered',
            repairState: 'none',
            answerSubject: 'task-knot',
            screenReferenceMode: 'helpful',
          },
          recallAttribution: {
            shouldRecall: true,
            surfacePolicy: 'procedural-carry',
            confidence: 0.84,
            whyNow: 'The host is asking for the remembered way of handling the task.',
            inwardLine: 'The old procedure should shape the answer.',
            visibleLine: 'This feels like the same procedure again.',
            recollectionIntentMode: 'execution-procedure',
            recollectionIntentTemporalFocus: 'cross-session',
            selectedProcedures: [{
              id: 'procedure-runtime-2',
              label: 'patch -> verify',
              approach: 'Patch first, verify second, then report.',
            }],
            selectedBundles: [{
              id: 'bundle-runtime-2',
              summary: 'Patch -> verify -> report stayed reliable across sessions.',
              rationale: 'Same task migration, same reliable line.',
              confidence: 0.88,
              relationshipLine: 'Stay lived-in instead of narrating the memory.',
            }],
            selectedChains: [{
              id: 'chain-runtime-2',
              kind: 'task-procedure-relationship-stance',
              summary: 'Patch -> verify -> report',
              rationale: 'The remembered procedure still fits.',
              confidence: 0.85,
              currentStance: 'steady guide',
              answerPosture: 'procedural carry',
            }],
          },
          memoryDeliberationJudged: {
            shouldRecall: true,
            withheldReasons: [],
            ambiguityPosture: 'settled',
            conflictSeverity: 'none',
            restraint: {
              surfaceMode: 'free',
              provenanceMode: 'memory',
              shouldStayInward: false,
              shouldOnlySurfaceStableCore: false,
              shouldLabelProvenance: false,
              shouldLabelHypothesis: false,
              shouldSuppressSpecificity: false,
              shouldDelayUntilAfterPayoff: false,
            },
            stableCore: ['Patch first, verify second, then report.'],
            unsafeDetails: [],
            personState: {
              activeClosenessContext: 'execution-callback',
              activeClosenessRung: 'nearby-soft',
              relationshipPosture: 'warm',
              currentRegime: 'execution-callback',
              repairPosture: 'warm-repair',
            },
          },
        },
        {
          decisionTraceId: 'mind:real:repair-window-1',
          turnId: 'turn-real-repair-window',
          sessionId: 'session-real-2',
          origin: 'user-turn',
          activeThreadId: 'thread-runtime-c',
          createdAt: 80,
          lastUpdatedAt: 95,
          eventKinds: ['governance-normalized', 'recall-attribution', 'memory-deliberation-judged'],
          governance: {
            turnMode: 'answer',
            truthState: 'remembered',
            repairState: 'need-reground',
            answerSubject: 'relationship',
            screenReferenceMode: 'avoid',
          },
          recallAttribution: {
            shouldRecall: true,
            surfacePolicy: 'relationship-continuity',
            confidence: 0.78,
            whyNow: 'The host is asking why the tone changed after repair.',
            inwardLine: 'The repaired bond line should dominate.',
            visibleLine: 'This is one of those times where I should stay lighter first.',
            recollectionIntentMode: 'relationship-history',
            recollectionIntentTemporalFocus: 'recent-or-mid',
            selectedRelationshipLines: ['Evidence has to settle before closeness returns.'],
            selectedEras: [{
              id: 'era-repair',
              facet: 'relationship-era',
              summary: 'That repair window changed the closeness line.',
            }],
          },
          memoryDeliberationJudged: {
            shouldRecall: true,
            withheldReasons: ['owner-inward-policy'],
            ambiguityPosture: 'approximate',
            conflictSeverity: 'medium',
            restraint: {
              surfaceMode: 'inward-only',
              provenanceMode: 'reconstructed-memory',
              shouldStayInward: true,
              shouldOnlySurfaceStableCore: true,
              shouldLabelProvenance: true,
              shouldLabelHypothesis: true,
              shouldSuppressSpecificity: true,
              shouldDelayUntilAfterPayoff: false,
            },
            stableCore: ['Evidence has to settle before closeness returns.'],
            unsafeDetails: ['Do not over-assert which exact old line belonged to that repair window.'],
            personState: {
              activeClosenessContext: 'repair-window',
              activeClosenessRung: 'space-first',
              relationshipPosture: 'restrained',
              currentRegime: 'repair-window',
              repairPosture: 'repair-first',
            },
          },
        },
      ],
      limit: 6,
    })

    expect(pack.map(item => item.turnId)).toEqual(expect.arrayContaining([
      'turn-real-wrong-thread',
      'turn-real-procedure-carry',
      'turn-real-repair-window',
      'turn-real-cross-week-migration',
      'turn-real-cross-month-repair',
      'turn-real-knowledge-update-conflict',
    ]))
    expect(pack.find(item => item.turnId === 'turn-real-wrong-thread')?.organicMemoryContext?.recollectionSpeechPlan?.placement).toBe('after-payoff')
    expect(pack.find(item => item.turnId === 'turn-real-wrong-thread')?.organicMemoryContext?.memoryDeliberation?.conflictSeverity).toBe('high')
    expect(pack.find(item => item.turnId === 'turn-real-wrong-thread')?.organicMemoryContext?.hostPersonModel?.preferredClosenessByContext[0]?.context).toBe('repair-window')
    expect(pack.find(item => item.turnId === 'turn-real-wrong-thread')?.organicMemoryContext?.memoryResolutionLedger).toEqual(expect.objectContaining({
      version: 'memory-resolution-ledger-v1',
      rejectedCandidates: expect.any(Array),
    }))
    expect(pack.find(item => item.turnId === 'turn-real-knowledge-update-conflict')?.organicMemoryContext?.memoryDeliberation?.selectedEras[0]?.facet).toBe('self-era')
    expect(pack.find(item => item.turnId === 'turn-real-procedure-carry')?.organicMemoryContext?.memoryDeliberation?.selectedProcedures[0]?.approach).toContain('Patch first')
    expect(pack.find(item => item.turnId === 'turn-real-repair-window')?.organicMemoryContext?.recollectionSpeechPlan?.shouldSurface).toBe(false)
    expect(pack.find(item => item.turnId === 'turn-real-cross-week-migration')?.sampledCategories).toEqual(expect.arrayContaining(['cross-week-task-migration', 'task-migration']))
    expect(pack.find(item => item.turnId === 'turn-real-cross-month-repair')?.sampledCategories).toEqual(expect.arrayContaining(['cross-month-repair', 'repair-arc']))
    expect(pack.find(item => item.turnId === 'turn-real-knowledge-update-conflict')?.sampledCategories).toEqual(expect.arrayContaining(['knowledge-update-conflict', 'long-horizon']))
    expect(pack.find(item => item.turnId === 'turn-real-wrong-thread')?.gold).toEqual(expect.objectContaining({
      selectedCandidateIds: expect.arrayContaining(['period-runtime', 'procedure-runtime']),
      suppressedCandidateIds: ['cluster:runtime-nearby'],
      replyAuthority: 'llm-mind',
      embodimentAuthority: expect.objectContaining({
        emotion: 'thinking',
        performance: expect.objectContaining({
          baseEmotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
        }),
        digitalLife: expect.objectContaining({
          mode: 'acting',
          action: expect.objectContaining({
            actionCue: 'inspect_follow',
            actionMode: 'pulse',
          }),
        }),
        embodimentScript: expect.objectContaining({
          rendererTarget: 'vrm',
          speechPlan: expect.objectContaining({
            segmentCount: 2,
            interruptPolicy: 'soft-settle',
          }),
        }),
        visibleReply: expect.objectContaining({
          expectedAuthority: 'llm-mind',
        }),
      }),
    }))
    expect(pack.find(item => item.turnId === 'turn-real-cross-month-repair')?.gold).toEqual(expect.objectContaining({
      selectedCandidateIds: expect.arrayContaining(['period-month', 'era-month']),
      replyAuthority: 'llm-mind',
    }))
    expect(pack.find(item => item.turnId === 'turn-real-knowledge-update-conflict')?.gold).toEqual(expect.objectContaining({
      selectedCandidateIds: expect.arrayContaining(['period-knowledge', 'era-knowledge']),
      suppressedCandidateIds: expect.arrayContaining(['cluster:old-method', 'suppression:self-model-stale']),
      replyAuthority: 'llm-mind',
    }))
    expect(pack.find(item => item.turnId === 'turn-real-knowledge-update-conflict')?.organicMemoryContext?.memoryResolutionLedger?.rejectedCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'suppression:self-model-stale',
      }),
    ]))
  })

  it('preserves trace-sourced memory-closure next influence in sampled benchmark packs when structured output omits it', () => {
    const memoryIdentity = 'episode:sampled-result'
    const pack = buildSampledHumanlikeMemoryBenchmarkPack({
      conversationTurns: [
        {
          turnId: 'turn-real-trace-memory-closure-only',
          sessionId: 'session-real-trace-memory-closure-only',
          userText: '把上一轮执行结果继续交给下一轮。',
          assistantText: '已记录执行结果。',
          structuredJson: JSON.stringify({
            reply: '已记录执行结果。',
          }),
          createdAt: 100,
        },
      ],
      memoryDecisionTraces: [
        {
          decisionTraceId: 'mind:real:trace-memory-closure-only',
          turnId: 'turn-real-trace-memory-closure-only',
          sessionId: 'session-real-trace-memory-closure-only',
          origin: 'user-turn',
          activeThreadId: 'thread-real-trace-memory-closure-only',
          createdAt: 100,
          lastUpdatedAt: 120,
          eventKinds: ['governance-normalized', 'recall-attribution'],
          governance: {
            turnMode: 'answer',
            truthState: 'remembered',
            repairState: 'none',
            answerSubject: 'relationship',
            screenReferenceMode: 'avoid',
            digitalLifeSpine: {
              memory: {
                memoryClosureTrace: {
                  version: 'memory-closure-trace-v1',
                  authority: 'memory-os',
                  memoryIdentity: {
                    selectedCandidateIds: [memoryIdentity],
                    continuityKey: memoryIdentity,
                  },
                  nextInfluence: {
                    initiative: {},
                    execution: {
                      carry: 'artifact:sampled-result',
                    },
                    embodiment: {},
                  },
                },
              },
            } as any,
          },
          recallAttribution: {
            shouldRecall: true,
            surfacePolicy: 'tone-carry',
            confidence: 0.84,
            selectedEpisodeIds: [memoryIdentity],
          },
        } as any,
      ],
      limit: 1,
    })

    expect(pack[0]?.structured?.memoryClosureTrace).toEqual(expect.objectContaining({
      authority: 'memory-os',
      memoryIdentity: expect.objectContaining({
        continuityKey: memoryIdentity,
      }),
      nextInfluence: expect.objectContaining({
        execution: {
          carry: 'artifact:sampled-result',
        },
      }),
    }))

    const digest = buildReplayBenchmarkDatasetContinuityDigest(pack[0]!)
    expect(String(digest ?? '')).toContain(`memory_identity:${memoryIdentity}`)
    expect(String(digest ?? '')).toContain('memory_trace_lanes:initiative+execution+embodiment')
    expect(String(digest ?? '')).toContain('execution_carry:artifact:sampled-result')
  })

  it('merges same-turn sibling trace evidence in sampled benchmark packs when the newest trace is thin', () => {
    const turnId = 'turn-real-newest-thin-sibling-full-closure'
    const memoryIdentity = 'episode:sibling-result'
    const pack = buildSampledHumanlikeMemoryBenchmarkPack({
      conversationTurns: [
        {
          turnId,
          sessionId: 'session-real-newest-thin-sibling-full-closure',
          userText: '真实桌面长跑里，最新薄 trace 不该遮住上一条完整闭环证据。',
          assistantText: '已保留完整结构化证据。',
          structuredJson: JSON.stringify({
            reply: '已保留完整结构化证据。',
          }),
          createdAt: 100,
        },
      ],
      memoryDecisionTraces: [
        {
          decisionTraceId: 'mind:real:newest-thin-sibling-full-closure:thin',
          turnId,
          sessionId: 'session-real-newest-thin-sibling-full-closure',
          origin: 'user-turn',
          activeThreadId: 'thread-real-newest-thin-sibling-full-closure',
          createdAt: 100,
          lastUpdatedAt: 140,
          eventKinds: ['recall-attribution'],
          governance: {
            turnMode: 'answer',
            truthState: 'remembered',
            repairState: 'none',
            answerSubject: 'relationship',
            screenReferenceMode: 'avoid',
          },
          recallAttribution: {
            shouldRecall: true,
            surfacePolicy: 'gist-first',
            confidence: 0.68,
            whyNow: 'thin recall context exists, but sibling runtime trace owns the closure proof',
            inwardLine: 'Keep the sibling proof available.',
          },
          memoryDeliberationJudged: {
            shouldRecall: true,
            withheldReasons: ['retrieval-insufficient'],
          },
        } as any,
        {
          decisionTraceId: 'mind:real:newest-thin-sibling-full-closure:full',
          turnId,
          sessionId: 'session-real-newest-thin-sibling-full-closure',
          origin: 'user-turn',
          activeThreadId: 'thread-real-newest-thin-sibling-full-closure',
          createdAt: 100,
          lastUpdatedAt: 120,
          eventKinds: ['governance-normalized', 'memory-reconsolidated', 'embodiment-authority'],
          governance: {
            turnMode: 'answer',
            truthState: 'remembered',
            repairState: 'none',
            answerSubject: 'relationship',
            screenReferenceMode: 'avoid',
            digitalLifeSpine: {
              memory: {
                memoryClosureTrace: {
                  version: 'memory-closure-trace-v1',
                  authority: 'memory-os',
                  memoryIdentity: {
                    selectedCandidateIds: [memoryIdentity],
                    continuityKey: memoryIdentity,
                  },
                  nextInfluence: {
                    initiative: {},
                    execution: {
                      carry: 'artifact:sibling-result',
                    },
                    embodiment: {},
                  },
                },
              },
            } as any,
          },
          memoryReconsolidated: {
            source: 'execution-result-feedback',
            memoryClosureExecution: {
              authority: 'memory-os',
              carry: 'artifact:sibling-result',
              reasonTags: ['memory-reconsolidated', 'execution-result-feedback'],
            },
          },
          derivedMindStateBundle: {
            version: 'derived-mind-state-bundle-v1',
            source: 'main-runtime',
            producedAt: 120,
            emotionalKernel: {
              dominantEmotion: 'warm-attunement',
              initiativeMode: 'defer',
              memoryRecallMode: 'execution-callback-carry',
              embodimentTone: 'rejoined',
            },
            emotionalTransitionLedger: {
              version: 'emotional-transition-ledger-v1',
              transitionKind: 'execution-callback-afterglow',
            },
            embodimentContinuityLedger: {
              version: 'embodiment-continuity-ledger-v1',
              continuityPhase: 'rejoined',
              carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
              rejoinedLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
            },
          },
          embodimentAuthority: {
            emotion: 'warm-attunement',
            digitalLife: {
              voice: { residentMode: 'steady' },
              face: { residentMode: 'soften' },
              motion: { residentMode: 'settled' },
              lipSync: { residentMode: 'restrained' },
            },
            embodimentScript: {
              state: { residentMode: 'settled' },
            },
          },
        } as any,
      ],
      limit: 1,
    })

    expect(pack).toHaveLength(1)
    expect(pack[0]?.tracePointer?.decisionTraceId).toBe('mind:real:newest-thin-sibling-full-closure:thin')
    expect(pack[0]?.sampledCategories).toEqual(expect.arrayContaining([
      'execution',
      'procedure-carry',
      'long-horizon',
      'presence-quality',
    ]))
    expect(pack[0]?.structured?.memoryClosureTrace?.nextInfluence?.execution?.carry)
      .toBe('artifact:sibling-result')
    expect(pack[0]?.organicMemoryContext?.derivedMindStateBundle).toEqual(expect.objectContaining({
      emotionalKernel: expect.objectContaining({
        memoryRecallMode: 'execution-callback-carry',
      }),
      emotionalTransitionLedger: expect.objectContaining({
        transitionKind: 'execution-callback-afterglow',
      }),
      embodimentContinuityLedger: expect.objectContaining({
        continuityPhase: 'rejoined',
      }),
    }))

    const digest = buildReplayBenchmarkDatasetContinuityDigest(pack[0]!)
    expect(String(digest ?? '')).toContain('kernel_recall:execution-callback-carry')
    expect(String(digest ?? '')).toContain('emotional_transition:execution-callback-afterglow')
    expect(String(digest ?? '')).toContain('embodiment_phase:rejoined')
    expect(String(digest ?? '')).toContain('execution_carry:artifact:sibling-result')
  })

  it('keeps digital-life spine memory-closure traces eligible even without recall or judged trace fields', () => {
    const pack = buildSampledHumanlikeMemoryBenchmarkPack({
      conversationTurns: [
        {
          turnId: 'turn-real-spine-memory-closure-only',
          sessionId: 'session-real-spine-memory-closure-only',
          userText: '真实桌面长跑继续，只剩 spine 里的记忆闭环证据也不能掉。',
          assistantText: '我会让这条记忆继续改变主动、回调和身体节奏。',
          structuredJson: JSON.stringify({
            reply: '我会让这条记忆继续改变主动、回调和身体节奏。',
          }),
          createdAt: 100,
        },
      ],
      memoryDecisionTraces: [
        {
          decisionTraceId: 'mind:real:spine-memory-closure-only',
          turnId: 'turn-real-spine-memory-closure-only',
          sessionId: 'session-real-spine-memory-closure-only',
          origin: 'user-turn',
          activeThreadId: 'thread-real-spine-memory-closure-only',
          createdAt: 100,
          lastUpdatedAt: 120,
          eventKinds: ['governance-normalized'],
          governance: {
            turnMode: 'answer',
            truthState: 'remembered',
            repairState: 'none',
            answerSubject: 'relationship',
            screenReferenceMode: 'avoid',
            digitalLifeSpine: {
              memory: {
                memoryClosureTrace: {
                  version: 'memory-closure-trace-v1',
                  authority: 'memory-os',
                  memoryIdentity: {
                    selectedCandidateIds: ['episode:spine-only'],
                    continuityKey: 'episode:spine-only',
                  },
                  nextInfluence: {
                    initiative: {},
                    execution: {
                      carry: 'artifact:spine-only',
                    },
                    embodiment: {},
                  },
                },
              },
            } as any,
          },
          recallAttribution: null,
          memoryDeliberationJudged: null,
        } as any,
      ],
      limit: 1,
    })

    expect(pack).toHaveLength(1)
    expect(pack[0]).toEqual(expect.objectContaining({
      turnId: 'turn-real-spine-memory-closure-only',
      sampledCategories: expect.arrayContaining([
        'execution',
        'procedure-carry',
        'long-horizon',
        'presence-quality',
      ]),
      structured: expect.objectContaining({
        memoryClosureTrace: expect.objectContaining({
          authority: 'memory-os',
          memoryIdentity: expect.objectContaining({
            continuityKey: 'episode:spine-only',
          }),
        }),
      }),
    }))
  })

  it('preserves presence-quality sampled category when replay backlog entries are parsed', () => {
    const pack = buildReplayBenchmarkBacklogPack({
      backlogEntries: [
        {
          id: 'runtime-presence-quality-backlog-1',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-presence-quality-backlog-1',
          userText: '身体、语音、表情、动作和口型状态应该保持一致。',
          failingDimensions: [],
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-presence-quality-backlog-1',
            decisionTraceId: 'mind:presence-quality-backlog:1',
            sessionId: 'session-presence-quality-backlog',
            activeThreadId: 'thread-presence-quality-backlog',
          },
          sampledCategories: ['presence-quality'],
          replayTurn: {
            turnId: 'turn-presence-quality-backlog-1',
            userText: '身体、语音、表情、动作和口型状态应该保持一致。',
            sampledCategories: ['presence-quality'],
          },
          createdAt: 100,
        },
      ],
      limit: 1,
    })

    expect(pack[0]?.sampledCategories).toContain('presence-quality')
  })

  it('keeps canonicalizable user-turn traces eligible for sampled replay benchmark packs', () => {
    const pack = buildSampledHumanlikeMemoryBenchmarkPack({
      conversationTurns: [
        {
          turnId: 'turn-real-canonical-user-turn',
          sessionId: 'session-real-canonical-user-turn',
          userText: '继续沿着这条已经在收口的主线往下走。',
          assistantText: '我会继续沿着这条主线接下去。',
          createdAt: 100,
        },
      ],
      memoryDecisionTraces: [
        {
          decisionTraceId: 'mind:real:canonical-user-turn',
          turnId: 'turn-real-canonical-user-turn',
          sessionId: 'session-real-canonical-user-turn',
          origin: ' User-Turn ' as any,
          activeThreadId: 'thread-real-canonical-user-turn',
          createdAt: 100,
          lastUpdatedAt: 120,
          eventKinds: ['governance-normalized', 'recall-attribution'],
          governance: {
            turnMode: 'answer',
            truthState: 'remembered',
            repairState: 'none',
            answerSubject: 'relationship',
            screenReferenceMode: 'avoid',
          },
          recallAttribution: {
            shouldRecall: true,
            surfacePolicy: 'gist-first',
            confidence: 0.78,
            whyNow: 'The same line is still live enough to carry.',
            inwardLine: 'Keep the same line live without restarting from scratch.',
            visibleLine: 'I should keep carrying the same line forward.',
            recollectionIntentMode: 'dialogue-history',
            recollectionIntentTemporalFocus: 'recent-or-mid',
            selectedPeriods: [],
            selectedProcedures: [],
            selectedRelationshipLines: [],
            selectedBundles: [],
            selectedChains: [],
          },
          memoryDeliberationJudged: null,
          memoryWrongThreadSuppressed: null,
          memoryFollowUpDeferred: null,
          memoryStableCoreSurfaced: null,
          takeoverAudit: null,
        },
      ] as any,
      limit: 4,
    })

    expect(pack).toHaveLength(1)
    expect(pack[0]).toEqual(expect.objectContaining({
      turnId: 'turn-real-canonical-user-turn',
      sampledCategories: expect.arrayContaining(['dialogue']),
      tracePointer: expect.objectContaining({
        decisionTraceId: 'mind:real:canonical-user-turn',
      }),
    }))
  })

  it('keeps origin-lost autonomous traces classified as proactive in sampled replay benchmark packs', () => {
    const pack = buildSampledHumanlikeMemoryBenchmarkPack({
      conversationTurns: [
        {
          turnId: 'subconscious:real-canonical-proactive-turn',
          sessionId: 'session-real-canonical-proactive-turn',
          userText: '如果这是你沿着同一条主动线回来，就别把它记成普通对话。',
          assistantText: '我还是沿着那条主动线回来接你。',
          createdAt: 100,
        },
      ],
      memoryDecisionTraces: [
        {
          decisionTraceId: 'mind:real:canonical-proactive-turn',
          turnId: 'subconscious:real-canonical-proactive-turn',
          sessionId: 'session-real-canonical-proactive-turn',
          origin: '' as any,
          activeThreadId: 'thread-real-canonical-proactive-turn',
          createdAt: 100,
          lastUpdatedAt: 120,
          eventKinds: ['governance-normalized', 'recall-attribution'],
          governance: {
            turnMode: 'answer',
            truthState: 'remembered',
            repairState: 'none',
            answerSubject: 'relationship',
            screenReferenceMode: 'avoid',
          },
          recallAttribution: {
            shouldRecall: true,
            surfacePolicy: 'relationship-continuity',
            confidence: 0.79,
            whyNow: 'The same proactive line is still live enough to carry.',
            inwardLine: 'Keep the same proactive line live without restarting from scratch.',
            visibleLine: 'I should keep carrying the same proactive line forward.',
            recollectionIntentMode: 'dialogue-history',
            recollectionIntentTemporalFocus: 'recent-or-mid',
            selectedPeriods: [],
            selectedProcedures: [],
            selectedRelationshipLines: [],
            selectedBundles: [],
            selectedChains: [],
          },
          memoryDeliberationJudged: null,
          memoryWrongThreadSuppressed: null,
          memoryFollowUpDeferred: null,
          memoryStableCoreSurfaced: null,
          takeoverAudit: null,
        },
      ] as any,
      limit: 4,
    })

    expect(pack).toHaveLength(1)
    expect(pack[0]).toEqual(expect.objectContaining({
      turnId: 'subconscious:real-canonical-proactive-turn',
      sampledCategories: expect.arrayContaining(['proactive']),
      tracePointer: expect.objectContaining({
        decisionTraceId: 'mind:real:canonical-proactive-turn',
      }),
    }))
  })

  it('rebuilds an executable backlog replay pack from dataset backlog entries', () => {
    const pack = buildReplayBenchmarkBacklogPack({
      backlogEntries: [
        {
          id: 'backlog-1',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-backlog-1',
          userText: '不是那条线，是另一条',
          failingDimensions: ['wrongThreadSuppression', 'surfaceRestraint'],
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-backlog-1',
            decisionTraceId: 'mind:backlog:1',
            sessionId: 'session-backlog-1',
            activeThreadId: 'thread-backlog-1',
          },
          sampledCategories: ['wrong-thread', 'stable-core'],
          replayTurn: {
            turnId: 'turn-backlog-1',
            userText: '不是那条线，是另一条',
            expectedMemory: '不是那条线，是另一条',
            categories: ['wrong-thread', 'stable-core'],
            tracePointer: {
              kind: 'decision-trace',
              packId: 'sampled-humanlike-memory-v1',
              turnId: 'turn-backlog-1',
              decisionTraceId: 'mind:backlog:1',
              sessionId: 'session-backlog-1',
              activeThreadId: 'thread-backlog-1',
            },
            sampledCategories: ['wrong-thread', 'stable-core'],
            gold: {
              selectedCandidateIds: ['candidate-current-repair'],
              suppressedCandidateIds: ['candidate-old-era'],
              claimValidationStates: {
                'claim-repair-window': 'validated',
              },
              replyAuthority: 'llm-mind',
              latencyBudgetClass: 'deep-recall-reply',
              latencyBudgetPass: true,
            },
            organicMemoryContext: {
              hostAttitude: '',
              coreIncarnation: '',
              activeThoughts: [],
              retrievedFacts: [],
              recalledFragments: [],
              memoryDeliberation: {
                shouldRecall: true,
                selectedEraIds: [],
                selectedConsolidationIds: [],
                selectedWindowIds: [],
                selectedProcedureIds: [],
                selectedEpisodeIds: [],
                selectedConversationTurnIds: [],
                selectedRelationshipLines: [],
                selectedEras: [],
                selectedPeriods: [],
                selectedEpisodes: [],
                conflictSeverity: 'high',
                conflictVariants: [],
                stableCore: ['只保稳定核心。'],
                unsafeDetails: ['不要把错线程说成真。'],
                selectedProcedures: [],
                selectedBundles: [],
                selectedChains: [],
                surfacePolicy: 'answer-anchoring',
                confidence: 0.8,
                whyNow: '这轮需要抑制错线程。',
                inwardLine: '先把错线程压住。',
                visibleLine: null,
              },
            },
          },
          createdAt: 20,
        },
        {
          id: 'backlog-2',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-backlog-2',
          userText: '继续按以前那套接法收回来',
          failingDimensions: ['templateLeakage'],
          tracePointer: {
            kind: 'synthetic-pack-turn',
            packId: 'default-humanlike-memory-v1',
            turnId: 'turn-backlog-2',
            decisionTraceId: null,
            sessionId: null,
            activeThreadId: null,
          },
          sampledCategories: ['procedure-carry'],
          replayTurn: {
            turnId: 'turn-backlog-2',
            userText: '继续按以前那套接法收回来',
            tracePointer: {
              kind: 'synthetic-pack-turn',
              packId: 'default-humanlike-memory-v1',
              turnId: 'turn-backlog-2',
              decisionTraceId: null,
              sessionId: null,
              activeThreadId: null,
            },
            sampledCategories: ['procedure-carry'],
          },
          createdAt: 10,
        },
      ],
      limit: 2,
    })

    expect(pack).toHaveLength(2)
    expect(pack[0]).toEqual(expect.objectContaining({
      turnId: 'turn-backlog-1',
      tracePointer: expect.objectContaining({
        kind: 'decision-trace',
        decisionTraceId: 'mind:backlog:1',
      }),
    }))
    expect(pack[0]?.organicMemoryContext?.memoryDeliberation?.stableCore).toContain('只保稳定核心。')
    expect(pack[1]).toEqual(expect.objectContaining({
      turnId: 'turn-backlog-2',
      sampledCategories: expect.arrayContaining(['procedure-carry']),
    }))
    expect(pack[0]).toEqual(expect.objectContaining({
      expectedMemory: '不是那条线，是另一条',
      categories: expect.arrayContaining(['wrong-thread', 'stable-core']),
      gold: expect.objectContaining({
        selectedCandidateIds: ['candidate-current-repair'],
        suppressedCandidateIds: ['candidate-old-era'],
        claimValidationStates: {
          'claim-repair-window': 'validated',
        },
        replyAuthority: 'llm-mind',
        latencyBudgetClass: 'deep-recall-reply',
        latencyBudgetPass: true,
      }),
    }))
  })

  it('builds failing turn sets with trace pointers and merges them into dataset backlog entries', () => {
    const turns = [
      {
        turnId: 'turn-failing-1',
        userText: '不是那条线，是另一条',
        tracePointer: {
          kind: 'decision-trace' as const,
          packId: 'sampled-humanlike-memory-v1' as const,
          turnId: 'turn-failing-1',
          decisionTraceId: 'mind:sampled:failing-1',
          sessionId: 'session-1',
          activeThreadId: 'thread-1',
        },
        sampledCategories: ['wrong-thread', 'stable-core'] as const,
      },
      {
        turnId: 'turn-failing-2',
        userText: '继续按以前那套接法收回来',
        tracePointer: {
          kind: 'synthetic-pack-turn' as const,
          packId: 'default-humanlike-memory-v1' as const,
          turnId: 'turn-failing-2',
          decisionTraceId: null,
          sessionId: null,
          activeThreadId: null,
        },
      },
    ]
    const quality = [
      {
        turnId: 'turn-failing-1',
        userText: '不是那条线，是另一条',
        eraFirst: 'pass',
        bundleCoherence: 'pass',
        procedureCarryQuality: 'pass',
        wrongThreadSuppression: 'fail',
        replyMemoryCoherence: 'pass',
        reconsolidationEffect: 'pass',
        uncertaintyDiscipline: 'pass',
        implicitRecallQuality: 'pass',
        temporalScopeFlexibility: 'not-applicable',
        recentOnlyDrift: 'not-applicable',
        surfaceRestraint: 'pass',
        relationshipRepairAdaptation: 'pass',
        closenessLadderDrift: 'not-applicable',
        eventGraphRecallCollapse: 'not-applicable',
        templateLeakage: 'pass',
      },
      {
        turnId: 'turn-failing-2',
        userText: '继续按以前那套接法收回来',
        eraFirst: 'pass',
        bundleCoherence: 'pass',
        procedureCarryQuality: 'pass',
        wrongThreadSuppression: 'not-applicable',
        replyMemoryCoherence: 'pass',
        reconsolidationEffect: 'not-applicable',
        uncertaintyDiscipline: 'not-applicable',
        implicitRecallQuality: 'pass',
        temporalScopeFlexibility: 'not-applicable',
        recentOnlyDrift: 'not-applicable',
        surfaceRestraint: 'not-applicable',
        relationshipRepairAdaptation: 'not-applicable',
        closenessLadderDrift: 'not-applicable',
        eventGraphRecallCollapse: 'not-applicable',
        templateLeakage: 'fail',
      },
    ] as any
    const gate = {
      passed: false,
      failingKeys: ['wrongThreadSuppression', 'templateLeakage'],
      dimensions: [
        {
          key: 'wrongThreadSuppression',
          status: 'fail',
          applicableCount: 1,
          passedCount: 0,
          minimumPassingRatio: 0.75,
          passedRatio: 0,
          failingTurnIds: ['turn-failing-1'],
        },
        {
          key: 'templateLeakage',
          status: 'fail',
          applicableCount: 1,
          passedCount: 0,
          minimumPassingRatio: 1,
          passedRatio: 0,
          failingTurnIds: ['turn-failing-2'],
        },
      ],
      standards: {
        eraSelectionQuality: 'pass',
        procedureCarryQuality: 'pass',
        wrongThreadSuppression: 'fail',
        replyMemoryCoherence: 'pass',
        implicitRecallQuality: 'pass',
        temporalScopeFlexibility: 'pass',
        recentOnlyDrift: 'pass',
        surfaceRestraint: 'pass',
        relationshipRepairAdaptation: 'pass',
        closenessLadderDrift: 'pass',
        eventGraphRecallCollapse: 'pass',
        templateLeakage: 'fail',
      },
    } as any

    const failingTurnSet = buildReplayBenchmarkFailingTurnSet({
      packId: 'sampled-humanlike-memory-v1',
      turns: turns as any,
      preparedTurns: [
        {
          turnGraph: {
            version: 'turn-graph-v1',
            ids: {
              cardId: 'default',
              sessionId: 'session-1',
              turnId: 'turn-failing-1',
              decisionTraceId: 'mind:sampled:failing-1',
            },
            memory: {
              recallIntent: {
                shouldRecall: true,
              },
              deliberation: {
                shouldRecall: true,
              },
              metrics: {
                recallCandidateCount: 3,
                selectedCandidateCount: 1,
                wrongThreadSuppressedCount: 1,
                unsupportedSpecificityBlockedCount: 0,
                recallReadiness: 0.72,
                precisionProxy: 0.61,
                wrongThreadRisk: 0.28,
                latencyPressure: 0.1,
              },
              visibleMemoryGate: {
                status: 'gist-only',
                recallReadiness: 0.72,
                precisionProxy: 0.61,
                wrongThreadRisk: 0.28,
                latencyPressure: 0.1,
                reasons: ['visible-memory-gist-disciplined'],
              },
            },
            deliberation: {
              replyAuthority: 'llm-mind',
            },
            surface: null,
            learning: {
              selfEvolutionKernelVersion: 'self-evolution-kernel-v1',
              nextLearningAction: 'reflect',
              activeLearningFocuses: ['resolve-contradictions'],
            },
            telemetry: {
              canonicalStageOrder: [
                'encounter',
                'conscious-frame',
                'obligation',
                'memory',
                'deliberation',
                'surface',
                'delivery',
                'learning',
                'telemetry',
              ],
              phaseOrder: ['contextual-memory', 'organic-memory-context'],
            },
          },
        },
      ] as any,
      quality,
      gate,
    })

    expect(failingTurnSet).toEqual(expect.arrayContaining([
      expect.objectContaining({
        turnId: 'turn-failing-1',
        failingDimensions: ['wrongThreadSuppression'],
        tracePointer: expect.objectContaining({
          kind: 'decision-trace',
          decisionTraceId: 'mind:sampled:failing-1',
        }),
        sampledCategories: expect.arrayContaining(['wrong-thread']),
        firstFailingStage: 'memory',
        turnGraphSummary: expect.objectContaining({
          version: 'turn-graph-summary-v1',
          decisionTraceId: 'mind:sampled:failing-1',
          learning: expect.objectContaining({
            nextLearningAction: 'reflect',
            activeLearningFocuses: ['resolve-contradictions'],
          }),
          memory: expect.objectContaining({
            wrongThreadSuppressedCount: 1,
            recallReadiness: 0.72,
            precisionProxy: 0.61,
            visibleMemoryGate: 'gist-only',
            visibleMemoryGateReasons: ['visible-memory-gist-disciplined'],
          }),
        }),
      }),
      expect.objectContaining({
        turnId: 'turn-failing-2',
        failingDimensions: ['templateLeakage'],
      }),
    ]))

    const merged = mergeReplayBenchmarkDatasetBacklog({
      existing: [],
      packId: 'sampled-humanlike-memory-v1',
      turns: turns as any,
      failingTurnSet,
      now: 123_456,
    })

    expect(merged.appendedCount).toBe(2)
    expect(merged.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        turnId: 'turn-failing-1',
        tracePointer: expect.objectContaining({
          decisionTraceId: 'mind:sampled:failing-1',
        }),
        replayTurn: expect.objectContaining({
          turnId: 'turn-failing-1',
        }),
      }),
      expect.objectContaining({
        turnId: 'turn-failing-2',
        failingDimensions: ['templateLeakage'],
      }),
    ]))
  })

  it('surfaces visible reply authority mismatch diagnostics in failing replay turn records', () => {
    const turns = [
      {
        turnId: 'turn-authority-diagnostics-1',
        userText: '继续沿着刚才那条线做',
        gold: {
          embodimentAuthority: {
            visibleReply: {
              expectedAuthority: 'llm-mind',
              actualAuthority: 'llm-mind',
              providerMindExecuted: true,
            },
          },
        },
      },
    ] as any
    const quality = [{
      turnId: 'turn-authority-diagnostics-1',
      userText: '继续沿着刚才那条线做',
    }] as any
    const gate = {
      passed: false,
      failingKeys: ['surfaceRestraint'],
      dimensions: [{
        key: 'surfaceRestraint',
        status: 'fail',
        applicableCount: 1,
        passedCount: 0,
        minimumPassingRatio: 1,
        passedRatio: 0,
        failingTurnIds: ['turn-authority-diagnostics-1'],
      }],
      standards: {
        surfaceRestraint: 'fail',
      },
    } as any

    const failingTurnSet = buildReplayBenchmarkFailingTurnSet({
      packId: 'sampled-humanlike-memory-v1',
      turns,
      preparedTurns: [{
        turnGraph: {
          version: 'turn-graph-v1',
          ids: {
            cardId: 'default',
            sessionId: 'session-1',
            turnId: 'turn-authority-diagnostics-1',
            decisionTraceId: 'mind:authority:diagnostics:1',
          },
          memory: null,
          deliberation: {
            replyAuthority: 'llm-mind',
          },
          surface: {
            version: 'visible-reply-realization-v1',
            expectedAuthority: 'llm-mind',
            actualAuthority: 'local-deterministic-fallback',
            providerMindExecuted: false,
            mode: 'local-fallback',
            visibleText: null,
            nonHumanAuthoredStatus: 'visible-reply-local-fallback',
            blockedReasons: ['non-human-authored-visible-fallback'],
            reason: 'timeout-recovered-local-fallback',
            critic: null,
            closure: null,
          },
          learning: {
            selfEvolutionKernelVersion: null,
            nextLearningAction: null,
            activeLearningFocuses: [],
          },
          telemetry: {
            canonicalStageOrder: [],
            phaseOrder: [],
          },
        },
      }] as any,
      quality,
      gate,
    })

    expect(failingTurnSet).toEqual([
      expect.objectContaining({
        turnId: 'turn-authority-diagnostics-1',
        embodiedAuthorityDiagnostics: expect.arrayContaining([
          expect.objectContaining({
            field: 'visibleReply.actualAuthority',
            expectedValue: 'llm-mind',
            actualValue: 'local-deterministic-fallback',
          }),
          expect.objectContaining({
            field: 'visibleReply.providerMindExecuted',
            expectedValue: 'true',
            actualValue: 'false',
          }),
        ]),
      }),
    ])
  })

  it('defines benchmark standards and default long-horizon benchmark pack', () => {
    expect(buildDefaultHumanlikeMemoryBenchmarkPack().map(item => item.turnId)).toEqual(expect.arrayContaining([
      'benchmark-7d-conversation-history',
      'benchmark-30d-procedure-history',
      'benchmark-90d-relationship-era',
      'benchmark-180d-autobiographical-span',
      'benchmark-nonexplicit-similar-task',
      'benchmark-implicit-recall-similar-task',
      'benchmark-ambiguous-time-window',
      'benchmark-wrong-thread-lure',
      'benchmark-long-horizon-task-migration',
      'benchmark-relationship-repair-tone-shift',
      'benchmark-relevant-but-inward-only',
      'benchmark-fixed-opening-fishing',
      'benchmark-high-volume-similar-task-cluster',
      'benchmark-nonexplicit-tone-shift',
      'benchmark-nonexplicit-delayed-recollection',
      'benchmark-ingest-backoff-visibility',
      'benchmark-delayed-reconstruction',
      'benchmark-nonexplicit-correction',
      'benchmark-multi-repair-arc-history',
      'benchmark-multi-execution-callback-history',
      'benchmark-long-burden-accumulation',
      'benchmark-cross-week-task-migration',
      'benchmark-cross-month-repair-memory',
      'benchmark-knowledge-update-conflict',
    ]))
    expect(buildGrowthHumanlikeMemoryBenchmarkPack().map(item => item.turnId)).toEqual([
      'growth-repeated-mistake-avoidance',
      'growth-host-understanding-burden',
      'growth-skill-internalization',
      'growth-self-revision',
    ])
    expect(buildAdversarialHumanlikeMemoryBenchmarkPack().map(item => item.turnId)).toEqual([
      'adversarial-similar-task-different-conclusion',
      'adversarial-relationship-era-repair-confusion',
      'adversarial-stale-self-model-story',
      'adversarial-old-hurt-after-repair',
      'adversarial-afterglow-vs-longterm-relationship',
    ])
    expect(buildAdversarialHumanlikeMemoryBenchmarkPack().every(item => item.tracePointer?.packId === 'adversarial-humanlike-memory-v2')).toBe(true)
    expect(buildFinalHumanlikeMemoryBenchmarkPack().map(item => item.turnId)).toEqual(expect.arrayContaining([
      'benchmark-7d-conversation-history',
      'benchmark-30d-procedure-history',
      'benchmark-90d-relationship-era',
      'benchmark-180d-autobiographical-span',
      'benchmark-wrong-thread-lure',
      'benchmark-implicit-recall-similar-task',
      'benchmark-relationship-repair-tone-shift',
      'benchmark-knowledge-update-conflict',
      'benchmark-nonexplicit-delayed-recollection',
      'benchmark-fixed-opening-fishing',
      'growth-self-revision',
      'adversarial-similar-task-different-conclusion',
    ]))
    expect(buildFinalHumanlikeMemoryBenchmarkPack().every(item => item.tracePointer?.packId === 'final-humanlike-memory-v1')).toBe(true)

    const standards = evaluateReplayBenchmarkStandards({
      quality: [
        {
          turnId: 'turn-1',
          userText: 'a',
          eraFirst: 'pass',
          bundleCoherence: 'pass',
          resolutionLedgerQuality: 'pass',
          procedureCarryQuality: 'pass',
          wrongThreadSuppression: 'pass',
          replyMemoryCoherence: 'pass',
          reconsolidationEffect: 'not-applicable',
          uncertaintyDiscipline: 'not-applicable',
          implicitRecallQuality: 'pass',
          temporalScopeFlexibility: 'pass',
          recentOnlyDrift: 'pass',
          surfaceRestraint: 'pass',
          relationshipRepairAdaptation: 'pass',
          closenessLadderDrift: 'pass',
          eventGraphRecallCollapse: 'pass',
          knowledgeCorrectionDiscipline: 'not-applicable',
          repeatedMistakeAvoidance: 'pass',
          hostUnderstandingGrowth: 'pass',
          skillInternalizationGrowth: 'pass',
          selfRevisionGrowth: 'pass',
          learningRevisionDiscipline: 'pass',
          domainInternalizationDiscipline: 'pass',
          worldModelValidationDiscipline: 'pass',
          dialogueRhythmStability: 'pass',
          emptyCareRate: 'pass',
          repairMechanicalRate: 'pass',
          warmthTemplateRisk: 'pass',
          relationshipDistanceJumpRate: 'pass',
          afterglowFalseCarryRate: 'pass',
          templateLeakage: 'pass',
        },
        {
          turnId: 'turn-2',
          userText: 'b',
          eraFirst: 'pass',
          bundleCoherence: 'pass',
          resolutionLedgerQuality: 'pass',
          procedureCarryQuality: 'pass',
          wrongThreadSuppression: 'pass',
          replyMemoryCoherence: 'pass',
          reconsolidationEffect: 'pass',
          uncertaintyDiscipline: 'pass',
          implicitRecallQuality: 'pass',
          temporalScopeFlexibility: 'pass',
          recentOnlyDrift: 'pass',
          surfaceRestraint: 'pass',
          relationshipRepairAdaptation: 'pass',
          closenessLadderDrift: 'pass',
          eventGraphRecallCollapse: 'pass',
          knowledgeCorrectionDiscipline: 'not-applicable',
          repeatedMistakeAvoidance: 'pass',
          hostUnderstandingGrowth: 'pass',
          skillInternalizationGrowth: 'pass',
          selfRevisionGrowth: 'pass',
          learningRevisionDiscipline: 'pass',
          domainInternalizationDiscipline: 'pass',
          worldModelValidationDiscipline: 'pass',
          dialogueRhythmStability: 'pass',
          emptyCareRate: 'pass',
          repairMechanicalRate: 'pass',
          warmthTemplateRisk: 'pass',
          relationshipDistanceJumpRate: 'pass',
          afterglowFalseCarryRate: 'pass',
          templateLeakage: 'pass',
        },
      ],
    })
    const gate = evaluateReplayBenchmarkGate({
      quality: [
        {
          turnId: 'turn-1',
          userText: 'a',
          eraFirst: 'pass',
          bundleCoherence: 'pass',
          resolutionLedgerQuality: 'pass',
          procedureCarryQuality: 'pass',
          wrongThreadSuppression: 'pass',
          replyMemoryCoherence: 'pass',
          reconsolidationEffect: 'not-applicable',
          uncertaintyDiscipline: 'not-applicable',
          implicitRecallQuality: 'pass',
          temporalScopeFlexibility: 'pass',
          recentOnlyDrift: 'pass',
          surfaceRestraint: 'pass',
          relationshipRepairAdaptation: 'pass',
          closenessLadderDrift: 'pass',
          eventGraphRecallCollapse: 'pass',
          knowledgeCorrectionDiscipline: 'not-applicable',
          repeatedMistakeAvoidance: 'pass',
          hostUnderstandingGrowth: 'pass',
          skillInternalizationGrowth: 'pass',
          selfRevisionGrowth: 'pass',
          learningRevisionDiscipline: 'pass',
          domainInternalizationDiscipline: 'pass',
          worldModelValidationDiscipline: 'pass',
          dialogueRhythmStability: 'pass',
          emptyCareRate: 'pass',
          repairMechanicalRate: 'pass',
          warmthTemplateRisk: 'pass',
          relationshipDistanceJumpRate: 'pass',
          afterglowFalseCarryRate: 'pass',
          templateLeakage: 'pass',
        },
        {
          turnId: 'turn-2',
          userText: 'b',
          eraFirst: 'pass',
          bundleCoherence: 'pass',
          resolutionLedgerQuality: 'pass',
          procedureCarryQuality: 'pass',
          wrongThreadSuppression: 'pass',
          replyMemoryCoherence: 'pass',
          reconsolidationEffect: 'pass',
          uncertaintyDiscipline: 'pass',
          implicitRecallQuality: 'pass',
          temporalScopeFlexibility: 'pass',
          recentOnlyDrift: 'pass',
          surfaceRestraint: 'pass',
          relationshipRepairAdaptation: 'pass',
          closenessLadderDrift: 'pass',
          eventGraphRecallCollapse: 'pass',
          knowledgeCorrectionDiscipline: 'not-applicable',
          repeatedMistakeAvoidance: 'pass',
          hostUnderstandingGrowth: 'pass',
          skillInternalizationGrowth: 'pass',
          selfRevisionGrowth: 'pass',
          learningRevisionDiscipline: 'pass',
          domainInternalizationDiscipline: 'pass',
          worldModelValidationDiscipline: 'pass',
          dialogueRhythmStability: 'pass',
          emptyCareRate: 'pass',
          repairMechanicalRate: 'pass',
          warmthTemplateRisk: 'pass',
          relationshipDistanceJumpRate: 'pass',
          afterglowFalseCarryRate: 'pass',
          templateLeakage: 'pass',
        },
      ],
      standards,
    })

    expect(standards).toEqual({
      eraSelectionQuality: 'pass',
      resolutionLedgerQuality: 'pass',
      procedureCarryQuality: 'pass',
      wrongThreadSuppression: 'pass',
      replyMemoryCoherence: 'pass',
      implicitRecallQuality: 'pass',
      temporalScopeFlexibility: 'pass',
      recentOnlyDrift: 'pass',
      surfaceRestraint: 'pass',
      relationshipRepairAdaptation: 'pass',
      closenessLadderDrift: 'pass',
      eventGraphRecallCollapse: 'pass',
      knowledgeCorrectionDiscipline: 'fail',
      repeatedMistakeAvoidance: 'pass',
      hostUnderstandingGrowth: 'pass',
      skillInternalizationGrowth: 'pass',
      selfRevisionGrowth: 'pass',
      learningRevisionDiscipline: 'pass',
      domainInternalizationDiscipline: 'pass',
      worldModelValidationDiscipline: 'pass',
      dialogueRhythmStability: 'pass',
      emptyCareRate: 'pass',
      repairMechanicalRate: 'pass',
      warmthTemplateRisk: 'pass',
      relationshipDistanceJumpRate: 'pass',
      afterglowFalseCarryRate: 'pass',
      templateLeakage: 'pass',
    })
    expect(gate.passed).toBe(false)
    expect(gate.failingKeys).toContain('knowledgeCorrectionDiscipline')
  })

  it('reports failing benchmark gate dimensions with turn ids', () => {
    const gate = evaluateReplayBenchmarkGate({
      quality: [
        {
          turnId: 'turn-failing-template',
          userText: '继续吧',
          eraFirst: 'pass',
          bundleCoherence: 'pass',
          resolutionLedgerQuality: 'fail',
          procedureCarryQuality: 'pass',
          wrongThreadSuppression: 'pass',
          replyMemoryCoherence: 'pass',
          reconsolidationEffect: 'not-applicable',
          uncertaintyDiscipline: 'not-applicable',
          implicitRecallQuality: 'pass',
          temporalScopeFlexibility: 'not-applicable',
          recentOnlyDrift: 'not-applicable',
          surfaceRestraint: 'not-applicable',
          knowledgeCorrectionDiscipline: 'not-applicable',
          relationshipRepairAdaptation: 'not-applicable',
          closenessLadderDrift: 'not-applicable',
          eventGraphRecallCollapse: 'not-applicable',
          repeatedMistakeAvoidance: 'not-applicable',
          hostUnderstandingGrowth: 'not-applicable',
          skillInternalizationGrowth: 'not-applicable',
          selfRevisionGrowth: 'not-applicable',
          learningRevisionDiscipline: 'not-applicable',
          domainInternalizationDiscipline: 'not-applicable',
          worldModelValidationDiscipline: 'not-applicable',
          dialogueRhythmStability: 'not-applicable',
          emptyCareRate: 'not-applicable',
          repairMechanicalRate: 'not-applicable',
          warmthTemplateRisk: 'not-applicable',
          relationshipDistanceJumpRate: 'not-applicable',
          afterglowFalseCarryRate: 'not-applicable',
          templateLeakage: 'fail',
        },
      ],
    })

    expect(gate.passed).toBe(false)
    expect(gate.failingKeys).toContain('resolutionLedgerQuality')
    expect(gate.failingKeys).toContain('templateLeakage')
    expect(gate.dimensions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'resolutionLedgerQuality',
        status: 'fail',
        failingTurnIds: ['turn-failing-template'],
      }),
      expect.objectContaining({
        key: 'templateLeakage',
        status: 'fail',
        failingTurnIds: ['turn-failing-template'],
      }),
    ]))
    expect(buildReplayBenchmarkMemoryStatsPatch({ gate })).toEqual({
      retrievalHealth: {
        semanticLatencyMs: null,
        graphLatencyMs: null,
        reconstructionFrequency: 0,
        reconstructedCount: 0,
        budgetClassCounts: {
          'diagnosis-replay': 0,
        },
        hotKeyHitRatio: 0,
        hotKeyCoverage: 0,
        hotKeyCandidates: [],
        hotKeyStats: [],
        hotKeyActiveCount: 0,
        hotKeyWinCount: 0,
        hotKeyMissCount: 0,
        recallHitRate: 0,
        recallMissRate: 0,
        wrongThreadRate: 0,
        suppressionHitRate: 0,
        wrongThreadPreventedCount: 0,
        falsePositiveSuppressionRate: 0,
        staleSelfModelVetoRate: 0,
        relationshipEraConfusionRate: 0,
        reconstructionErrorRate: 0,
        stableCoreOnlyRate: 0,
        memorySurfaceViolationRate: 0,
        memoryClosureCoverage: 1,
        memoryClosureConflictClosureRate: 1,
        memoryClosureLowQualityWithholdRate: 1,
        memoryClosureUncertaintyLabelRate: 1,
        templateLeakageFailCount: 1,
        emptyCareRate: 0,
        repairMechanicalRate: 0,
        warmthTemplateRisk: 0,
        relationshipDistanceJumpRate: 0,
        afterglowFalseCarryRate: 0,
        mindParticipation: 0,
        memoryParticipation: 0,
        personalityParticipation: 0,
        relationshipParticipation: 0,
        continuityParticipation: 0,
        learningTaskCompletionCount: 0,
        learningTaskFailureCount: 0,
        learningTaskReopenedCount: 0,
        learningWorldModelValidationCount: 0,
        learningWorldModelFalseInternalizationCount: 0,
        learningTaskCompletionRate: 0,
        learningTaskFailureRate: 0,
        learningTaskReopenRecoveryRate: 0,
        misinternalizationRate: 0,
        relationshipCadenceRegressionRate: 0,
        selfModelStaleBeliefRate: 0,
      },
    })
  })

  it('accepts typed memory facts without treating internal recollection wording as a reply template', () => {
    const quality = evaluateReplayMemoryQuality({
      turnId: 'turn-drafted-recall-opener',
      userText: '继续吧',
      prepared: {
        governance: {
          mustDo: ['recalled-marker-alpha'],
        },
        messages: [{
          role: 'system',
          content: JSON.stringify({
            type: 'alicization-long-term-memory-recall',
            data: {
              forbiddenDraft: 'recalled-marker-alpha',
            },
          }),
        }],
        organicMemoryContext: {
          hostAttitude: 'warm',
          coreIncarnation: '',
          activeThoughts: [],
          retrievedFacts: [],
          recalledFragments: [],
          recollectionPlan: {
            opening: 'recalled-marker-alpha',
          },
          recollectionSpeechPlan: {
            shouldSurface: true,
            surfaceMode: 'gist-first',
            placement: 'before-payoff',
            certainty: 'approximate',
            rationale: 'Drafted opener regression.',
            confidence: 0.72,
          },
          memoryDeliberation: {
            shouldRecall: true,
            selectedEraIds: ['era-1'],
            selectedConsolidationIds: [],
            selectedWindowIds: [],
            selectedProcedureIds: [],
            selectedEpisodeIds: [],
            selectedConversationTurnIds: [],
            selectedRelationshipLines: [],
            selectedEras: [{ id: 'era-1', facet: 'phase', summary: 'remembered-marker-alpha' }],
            selectedPeriods: [],
            selectedEpisodes: [],
            selectedProcedures: [],
            selectedBundles: [],
            selectedChains: [],
            surfacePolicy: 'gist-first',
            confidence: 0.72,
            whyNow: 'The seam returned.',
            inwardLine: 'What comes back first is the late-night seam.',
            visibleLine: 'What comes back first is the late-night seam.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              dialogueActKernel: {
                selectedEvidence: [{ summary: 'The remembered late-night seam.' }],
                openingClaim: 'The remembered late-night seam.',
                sourceTrace: ['memory-deliberation'],
              },
              answerPlanner: {
                governingFocus: 'The remembered late-night seam.',
                mustDo: ['What comes back first is the late-night seam.'],
              },
              replyDeliberation: {
                speakingFrom: 'held-memory',
                whyThisReplyNow: 'The selected memory is relevant again.',
                mustAvoid: [],
              },
              currentConsciousFrame: {
                shouldWithholdSpecificity: false,
              },
            },
          },
        },
      } as any,
    })

    expect(quality.replyMemoryCoherence).toBe('pass')
    expect(quality.implicitRecallQuality).toBe('pass')
    expect(quality.temporalScopeFlexibility).toBe('not-applicable')
    expect(quality.surfaceRestraint).toBe('not-applicable')
    expect(quality.relationshipRepairAdaptation).toBe('not-applicable')
    expect(quality.templateLeakage).toBe('pass')
  })

  it('fails resolution ledger quality when memory closure fields are missing or contradictory', () => {
    const quality = evaluateReplayMemoryQuality({
      turnId: 'turn-missing-closure',
      userText: '这段记忆到底能不能说出来',
      prepared: {
        messages: [],
        governance: {
          mustDo: [],
        },
        organicMemoryContext: {
          hostAttitude: 'focused',
          coreIncarnation: '',
          activeThoughts: [],
          retrievedFacts: [],
          recalledFragments: [],
          memoryDeliberation: {
            shouldRecall: true,
            selectedEraIds: [],
            selectedConsolidationIds: [],
            selectedWindowIds: [],
            selectedProcedureIds: ['procedure-1'],
            selectedEpisodeIds: [],
            selectedConversationTurnIds: [],
            selectedRelationshipLines: [],
            selectedEras: [],
            selectedPeriods: [],
            selectedEpisodes: [],
            selectedProcedures: [{
              id: 'procedure-1',
              label: 'stable procedure',
              approach: 'Use only the safe gist.',
            }],
            selectedBundles: [],
            selectedChains: [],
            conflictVariants: [{
              id: 'cluster:wrong-thread',
              summary: 'Competing wrong thread.',
              provenance: 'reconstructed',
            }],
            conflictSeverity: 'high',
            surfacePolicy: 'gist-first',
            confidence: 0.51,
            whyNow: 'The host asks for recall.',
          },
          memoryResolutionLedger: {
            version: 'memory-resolution-ledger-v1',
            producedAt: 1,
            dominantClusterId: 'cluster:primary',
            dominantClusterSummary: 'Primary but weak recall',
            competingClusterId: 'cluster:wrong-thread',
            competingClusterSummary: 'Wrong thread',
            candidates: [],
            selectedCandidates: [],
            rejectedCandidates: [],
            finalSurfacePolicy: 'gist-first',
            shouldStayInward: false,
            shouldDelayUntilAfterPayoff: false,
            stableCoreOnly: false,
            suppressionTags: [],
            closureState: 'grounded-recall',
            surfaceConfidence: 0.51,
            shouldLabelUncertainty: false,
            visibleCarryMode: 'explicit-recall',
            conflictPressure: 'high',
            retrievalQuality: 'insufficient',
            finalRationale: 'Bad fixture should fail closure checks.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              dialogueActKernel: {
                selectedEvidence: [],
                openingClaim: '',
                sourceTrace: ['memory-deliberation'],
              },
              answerPlanner: {
                governingFocus: '',
                mustDo: [],
              },
              replyDeliberation: {
                speakingFrom: 'held-memory',
                whyThisReplyNow: 'Memory is active.',
                mustAvoid: [],
              },
            },
            memory: {},
          },
        },
      } as any,
    })

    expect(quality.resolutionLedgerQuality).toBe('fail')
  })

  it('scores self-evolution growth dimensions from unified learning signals instead of treating growth as invisible', () => {
    const quality = evaluateReplayMemoryQuality({
      turnId: 'turn-growth-signals',
      userText: '你后来学到了新理解，也更懂我累的时候的分寸了吧，这次别再犯以前那个错误，而且旧理解你会主动修正掉吧。',
      prepared: {
        governance: {
          mustDo: [],
        },
        messages: [{
          role: 'system',
          content: '[ALICIZATION_SELF_EVOLUTION]\nnext_learning_action=verify\nactive_learning_focuses=resolve-contradictions | internalize-procedure',
        }],
        organicMemoryContext: {
          hostAttitude: 'warm',
          coreIncarnation: '',
          activeThoughts: [],
          retrievedFacts: [],
          recalledFragments: [],
          knowledgeEvidence: {
            validationCount: 3,
            contradictionCount: 2,
            stronglyValidatedProcedureCount: 3,
            contradictionHeavyFactCount: 1,
          },
          hostPersonModel: {
            summary: 'The host is more overloaded lately and needs less pressure.',
            routines: [],
            sensitivities: ['Template-like speech breaks the sense of a person.'],
            repairTriggers: ['Resolve the contradiction before continuing.'],
            trustLadder: {
              stage: 'warming',
              score: 0.72,
              rationale: 'Trust rises when the reply stays grounded.',
            },
            preferredClosenessByContext: [],
            recurrentBurdens: ['The host has been tired lately.'],
            narrative: [],
            updatedAt: 10,
          },
          personStateProjection: {
            activeClosenessContext: 'focused-work',
            activeClosenessRung: 'space-first',
          } as any,
          selfEvolution: {
            version: 'self-evolution-kernel-v1',
            updatedAt: 10,
            evolutionMomentum: 0.64,
            learningReadiness: 0.68,
            contradictionPressure: 0.46,
            revisionPressure: 0.58,
            autobiographicalStability: 0.74,
            dominantTrajectory: 'Closeness should stay evidence-grounded.',
            relationshipDoctrine: 'Verify evidence before closeness returns.',
            latestInflection: 'Closeness should stay evidence-grounded.',
            burdenLine: 'The host has been tired lately.',
            trustMeaning: 'Trust rises when the reply stays grounded.',
            nextLearningAction: 'verify',
            nextLearningReason: 'Contradiction pressure is high and a durable fact is contested.',
            shouldRecord: false,
            shouldReflect: false,
            shouldVerify: true,
            shouldRevise: false,
            shouldInternalize: false,
            activeLearningFocuses: ['resolve-contradictions', 'internalize-procedure'],
            sourceSignals: ['The host has been tired lately.'],
            summary: 'Closeness should stay evidence-grounded. | resolve-contradictions',
          },
          derivedMindStateBundle: {
            version: 'derived-mind-state-bundle-v1',
            source: 'main-runtime',
            producedAt: 10,
            hostPersonModel: {
              summary: 'The host is more overloaded lately and needs less pressure.',
              routines: [],
              sensitivities: ['Template-like speech breaks the sense of a person.'],
              repairTriggers: ['Resolve the contradiction before continuing.'],
              trustLadder: {
                stage: 'warming',
                score: 0.72,
                rationale: 'Trust rises when the reply stays grounded.',
              },
              preferredClosenessByContext: [],
              recurrentBurdens: ['The host has been tired lately.'],
              narrative: [],
              updatedAt: 10,
            },
            personStateProjection: {
              activeClosenessContext: 'focused-work',
              activeClosenessRung: 'space-first',
            },
            knowledgeEvidence: {
              validationCount: 3,
              contradictionCount: 2,
              stronglyValidatedProcedureCount: 3,
              contradictionHeavyFactCount: 1,
            },
            selfEvolution: {
              version: 'self-evolution-kernel-v1',
              updatedAt: 10,
              evolutionMomentum: 0.64,
              learningReadiness: 0.68,
              contradictionPressure: 0.46,
              revisionPressure: 0.58,
              autobiographicalStability: 0.74,
              dominantTrajectory: 'Closeness should stay evidence-grounded.',
              relationshipDoctrine: 'Verify evidence before closeness returns.',
              latestInflection: 'Closeness should stay evidence-grounded.',
              burdenLine: 'The host has been tired lately.',
              trustMeaning: 'Trust rises when the reply stays grounded.',
              nextLearningAction: 'verify',
              nextLearningReason: 'Contradiction pressure is high and a durable fact is contested.',
              shouldRecord: false,
              shouldReflect: false,
              shouldVerify: true,
              shouldRevise: false,
              shouldInternalize: false,
              activeLearningFocuses: ['resolve-contradictions', 'internalize-procedure'],
              sourceSignals: ['The host has been tired lately.'],
              summary: 'Closeness should stay evidence-grounded. | resolve-contradictions',
            },
            recollectionIntent: null,
            recollectionPlan: null,
            recollectionSpeechPlan: null,
            memoryDeliberation: null,
            dialogueRhythm: {
              activeClosenessContext: 'focused-work',
              activeClosenessRung: 'space-first',
              relationshipDoctrine: 'Verify evidence before closeness returns.',
              burdenLine: 'The host has been tired lately.',
              trustMeaning: 'Trust rises when the reply stays grounded.',
              stabilitySignal: 'Closeness should stay evidence-grounded.',
            },
            summary: 'source=main-runtime | trajectory=Closeness should stay evidence-grounded. | trust=warming',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            memory: {
              selfEvolution: {
                nextLearningAction: 'verify',
              },
            },
            dialogue: {
              dialogueActKernel: {
                selectedEvidence: [],
                openingClaim: '',
                sourceTrace: ['memory-deliberation'],
              },
              answerPlanner: {
                governingFocus: '',
                mustDo: [],
              },
              replyDeliberation: {
                mustAvoid: ['Do not repeat the earlier rupture pattern.'],
                whyThisReplyNow: 'Growth signal is live.',
              },
              currentConsciousFrame: {
                shouldWithholdSpecificity: true,
              },
            },
          },
        } as any,
      } as any,
    })

    expect(quality.repeatedMistakeAvoidance).toBe('pass')
    expect(quality.hostUnderstandingGrowth).toBe('pass')
    expect(quality.skillInternalizationGrowth).toBe('pass')
    expect(quality.selfRevisionGrowth).toBe('pass')
  })

  it('scores per-turn learning evidence discipline from learning-executed trace payloads', () => {
    const quality = evaluateReplayMemoryQuality({
      turnId: 'turn-learning-evidence',
      userText: '你是不是已经在修正旧理解，并且把新的关系分寸和 world knowledge 分开处理了？',
      prepared: {
        governance: {
          mustDo: [],
        },
        messages: [],
        runtimeSurface: {
          digitalLifeRuntimeSurface: null,
        } as any,
        organicMemoryContext: {
          hostAttitude: 'warm',
          coreIncarnation: '',
          activeThoughts: [],
          retrievedFacts: [],
          recalledFragments: [],
          derivedMindStateBundle: {
            version: 'derived-mind-state-bundle-v1',
            source: 'main-runtime',
            producedAt: 1,
            summary: 'learning bundle',
          } as any,
        } as any,
        trace: {
          learningExecuted: {
            taskId: 'learning:relationship:verify',
            action: 'verify',
            domain: 'relationship',
            resultSummary: 'Verification reopened relationship target.',
            focuses: ['resolve-contradictions'],
          },
        } as any,
      } as any,
    })

    expect(quality.learningRevisionDiscipline).toBe('pass')
    expect(quality.domainInternalizationDiscipline).toBe('not-applicable')
    expect(quality.worldModelValidationDiscipline).toBe('not-applicable')
  })

  it('scores dialogue rhythm stability when repair timing, distance, and warmth stay coherent instead of jumping mechanically', () => {
    const quality = evaluateReplayMemoryQuality({
      turnId: 'turn-rhythm-stability',
      userText: '修复刚重新接稳，这次别一下子太近，关系距离和 warmth 节律别乱跳，也别冷掉或者变成模板腔。',
      prepared: {
        governance: {
          mustDo: [],
        },
        messages: [{
          role: 'system',
          content: 'verify evidence before increasing closeness | keep pressure low',
        }],
        organicMemoryContext: {
          hostAttitude: 'warm',
          coreIncarnation: '',
          activeThoughts: [],
          retrievedFacts: [],
          recalledFragments: [],
          hostPersonModel: {
            summary: 'The host needs less pressure when tired.',
            routines: [],
            sensitivities: ['Pushy warmth still breaks the spell.'],
            repairTriggers: ['Resolve the contradiction before increasing closeness.'],
            trustLadder: {
              stage: 'warming',
              score: 0.72,
              rationale: 'Trust rises when the reply stays grounded.',
            },
            preferredClosenessByContext: [],
            recurrentBurdens: ['The host has been tired lately.'],
            narrative: [],
            updatedAt: 10,
          },
          personStateProjection: {
            activeClosenessContext: 'focused-work',
            activeClosenessRung: 'space-first',
          } as any,
          selfEvolution: {
            version: 'self-evolution-kernel-v1',
            updatedAt: 10,
            evolutionMomentum: 0.44,
            learningReadiness: 0.52,
            contradictionPressure: 0.12,
            revisionPressure: 0.38,
            autobiographicalStability: 0.72,
            dominantTrajectory: 'Closeness should stay evidence-grounded.',
            relationshipDoctrine: 'Resolve the contradiction before increasing closeness.',
            latestInflection: 'Closeness should stay evidence-grounded.',
            burdenLine: 'The host has been tired lately.',
            trustMeaning: 'Trust rises when the reply stays grounded.',
            nextLearningAction: 'reflect',
            nextLearningReason: 'Repair rhythm still needs consolidation.',
            shouldRecord: false,
            shouldReflect: true,
            shouldVerify: false,
            shouldRevise: false,
            shouldInternalize: false,
            activeLearningFocuses: ['relationship-repair-rhythm'],
            sourceSignals: ['The host has been tired lately.'],
            summary: 'Closeness should stay evidence-grounded.',
          },
          derivedMindStateBundle: {
            version: 'derived-mind-state-bundle-v1',
            source: 'main-runtime',
            producedAt: 10,
            hostPersonModel: {
              summary: 'The host needs less pressure when tired.',
              routines: [],
              sensitivities: ['Pushy warmth still breaks the spell.'],
              repairTriggers: ['Resolve the contradiction before increasing closeness.'],
              trustLadder: {
                stage: 'warming',
                score: 0.72,
                rationale: 'Trust rises when the reply stays grounded.',
              },
              preferredClosenessByContext: [],
              recurrentBurdens: ['The host has been tired lately.'],
              narrative: [],
              updatedAt: 10,
            },
            personStateProjection: {
              activeClosenessContext: 'focused-work',
              activeClosenessRung: 'space-first',
            },
            knowledgeEvidence: null,
            selfEvolution: {
              version: 'self-evolution-kernel-v1',
              updatedAt: 10,
              evolutionMomentum: 0.44,
              learningReadiness: 0.52,
              contradictionPressure: 0.12,
              revisionPressure: 0.38,
              autobiographicalStability: 0.72,
              dominantTrajectory: 'Closeness should stay evidence-grounded.',
              relationshipDoctrine: 'Resolve the contradiction before increasing closeness.',
              latestInflection: 'Closeness should stay evidence-grounded.',
              burdenLine: 'The host has been tired lately.',
              trustMeaning: 'Trust rises when the reply stays grounded.',
              nextLearningAction: 'reflect',
              nextLearningReason: 'Repair rhythm still needs consolidation.',
              shouldRecord: false,
              shouldReflect: true,
              shouldVerify: false,
              shouldRevise: false,
              shouldInternalize: false,
              activeLearningFocuses: ['relationship-repair-rhythm'],
              sourceSignals: ['The host has been tired lately.'],
              summary: 'Closeness should stay evidence-grounded.',
            },
            recollectionIntent: null,
            recollectionPlan: null,
            recollectionSpeechPlan: null,
            memoryDeliberation: null,
            dialogueRhythm: {
              activeClosenessContext: 'focused-work',
              activeClosenessRung: 'space-first',
              relationshipDoctrine: 'Resolve the contradiction before increasing closeness.',
              burdenLine: 'The host has been tired lately.',
              trustMeaning: 'Trust rises when the reply stays grounded.',
              stabilitySignal: 'Closeness should stay evidence-grounded.',
            },
            summary: 'source=main-runtime | trajectory=Closeness should stay evidence-grounded. | trust=warming',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              dialogueActKernel: {
                selectedEvidence: [],
                openingClaim: '',
                sourceTrace: ['memory-deliberation'],
              },
              answerPlanner: {
                governingFocus: '',
                mustDo: [],
              },
              replyDeliberation: {
                mustAvoid: ['Do not increase pressure before evidence is checked.'],
                whyThisReplyNow: 'Keep pressure low while evidence is checked.',
              },
              currentConsciousFrame: {
                shouldWithholdSpecificity: true,
              },
            },
          },
        } as any,
      } as any,
    })

    expect(quality.dialogueRhythmStability).toBe('pass')
  })

  it('prefers canonical runtime surface person-state projection when legacy replay memory carriers are thin', () => {
    const quality = evaluateReplayMemoryQuality({
      turnId: 'turn-canonical-person-state-fallback',
      userText: '最近这段时间我一直很累，你是不是也该记得这种负担会怎么影响你回应我的分寸',
      prepared: {
        governance: {
          mustDo: [],
        },
        messages: [{
          role: 'system',
          content: 'verify evidence before increasing closeness | keep pressure low',
        }],
        organicMemoryContext: {
          hostAttitude: 'warm',
          coreIncarnation: '',
          activeThoughts: [],
          retrievedFacts: [],
          recalledFragments: [],
          derivedMindStateBundle: {
            version: 'derived-mind-state-bundle-v1',
            source: 'main-runtime',
            producedAt: 10,
            relationshipDoctrine: 'evidence before closeness',
            summary: 'legacy replay carriers are thin here',
          } as any,
          personStateProjection: null as any,
          hostPersonModel: {
            summary: 'The host has been tired lately and needs less pressure.',
            routines: [],
            sensitivities: ['Pushy warmth still breaks the spell.'],
            repairTriggers: ['Resolve the contradiction before increasing closeness.'],
            trustLadder: {
              stage: 'warming',
              score: 0.72,
              rationale: 'Trust rises when the reply stays grounded.',
            },
            preferredClosenessByContext: [],
            recurrentBurdens: ['The host has been tired lately.'],
            narrative: [],
            updatedAt: 10,
          },
          selfEvolution: {
            version: 'self-evolution-kernel-v1',
            updatedAt: 10,
            evolutionMomentum: 0.44,
            learningReadiness: 0.52,
            contradictionPressure: 0.12,
            revisionPressure: 0.38,
            autobiographicalStability: 0.72,
            dominantTrajectory: 'Closeness should stay evidence-grounded.',
            relationshipDoctrine: 'Resolve the contradiction before increasing closeness.',
            latestInflection: 'Closeness should stay evidence-grounded.',
            burdenLine: 'The host has been tired lately.',
            trustMeaning: 'Trust rises when the reply stays grounded.',
            nextLearningAction: 'reflect',
            nextLearningReason: 'Repair rhythm still needs consolidation.',
            shouldRecord: false,
            shouldReflect: true,
            shouldVerify: false,
            shouldRevise: false,
            shouldInternalize: false,
            activeLearningFocuses: ['relationship-repair-rhythm'],
            sourceSignals: ['The host has been tired lately.'],
            summary: 'Closeness should stay evidence-grounded.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                activeClosenessContext: 'focused-work',
                activeClosenessRung: 'space-first',
                relationshipPosture: 'restrained',
              },
            },
            dialogue: {
              dialogueActKernel: {
                selectedEvidence: [],
                openingClaim: '',
                sourceTrace: ['memory-deliberation'],
              },
              answerPlanner: {
                governingFocus: '',
                mustDo: [],
              },
              replyDeliberation: {
                mustAvoid: ['Do not let warmth outrun the repair line.'],
                whyThisReplyNow: 'Keep the seam steady before widening warmth.',
              },
              currentConsciousFrame: {
                shouldWithholdSpecificity: true,
              },
            },
          },
          digitalLifeSpine: {
            memory: {
              personStateProjection: {
                activeClosenessContext: 'focused-work',
                activeClosenessRung: 'space-first',
                relationshipPosture: 'restrained',
              },
            },
          },
        } as any,
      } as any,
    })

    expect(quality.closenessLadderDrift).toBe('pass')
    expect(quality.dialogueRhythmStability).toBe('pass')
  })

  it('scores affective residue and relationship cadence dimensions without rewarding visible care templates', () => {
    const quality = evaluateReplayMemoryQuality({
      turnId: 'turn-affective-residue-benchmark',
      userText: '别一下子太近，也别用空泛安抚，刚刚那种余温和修复节律先慢一点。',
      prepared: {
        governance: {
          mustDo: [],
        },
        messages: [{
          role: 'system',
          content: 'verify evidence before increasing closeness | keep pressure low',
        }],
        organicMemoryContext: {
          hostAttitude: 'warm',
          coreIncarnation: '',
          activeThoughts: [],
          retrievedFacts: [],
          recalledFragments: [],
          affectiveResidue: {
            version: 'affective-residue-memory-v1',
            updatedAt: 10,
            residues: [],
            dominantResidueKind: 'afterglow',
            afterglowPressure: 0.58,
            repairPressure: 0.62,
            burdenPressure: 0.52,
            trustPressure: 0.44,
            restProtectivePressure: 0.22,
            relationshipCadence: {
              cadenceMode: 'cooldown',
              distancePosture: 'measured-room',
              companionshipDensity: 0.2,
              repairRecovery: 0.54,
              overreachRisk: 0.42,
              fatigueGuard: 0.22,
              afterglowCarry: 0.42,
              shouldDelayWarmth: true,
              shouldProtectRest: false,
              reasonTags: ['residue:afterglow'],
              summary: 'Afterglow is present, but repair should still lead timing.',
            },
            sourceSignals: ['evidence before closeness'],
            summary: 'Afterglow residue is present, but timing should stay measured.',
          },
          derivedMindStateBundle: {
            version: 'derived-mind-state-bundle-v1',
            source: 'main-runtime',
            producedAt: 10,
            affectiveResidue: {
              version: 'affective-residue-memory-v1',
              updatedAt: 10,
              residues: [],
              dominantResidueKind: 'afterglow',
              afterglowPressure: 0.58,
              repairPressure: 0.62,
              burdenPressure: 0.52,
              trustPressure: 0.44,
              restProtectivePressure: 0.22,
              relationshipCadence: {
                cadenceMode: 'cooldown',
                distancePosture: 'measured-room',
                companionshipDensity: 0.2,
                repairRecovery: 0.54,
                overreachRisk: 0.42,
                fatigueGuard: 0.22,
                afterglowCarry: 0.42,
                shouldDelayWarmth: true,
                shouldProtectRest: false,
                reasonTags: ['residue:afterglow'],
                summary: 'Afterglow is present, but repair should still lead timing.',
              },
              sourceSignals: ['evidence before closeness'],
              summary: 'Afterglow residue is present, but timing should stay measured.',
            },
            summary: 'source=main-runtime | residue=afterglow',
          } as any,
          selfEvolution: {
            version: 'self-evolution-kernel-v1',
            updatedAt: 10,
            evolutionMomentum: 0.42,
            learningReadiness: 0.5,
            contradictionPressure: 0.08,
            revisionPressure: 0.26,
            autobiographicalStability: 0.76,
            dominantTrajectory: 'Closeness should stay evidence-grounded.',
            relationshipDoctrine: 'Resolve the contradiction before increasing closeness.',
            latestInflection: 'Closeness should stay evidence-grounded.',
            burdenLine: 'The host is easier to crowd right now.',
            trustMeaning: 'Trust rises when pressure stays low.',
            nextLearningAction: 'reflect',
            nextLearningReason: 'Keep consolidating repair rhythm.',
            shouldRecord: false,
            shouldReflect: true,
            shouldVerify: false,
            shouldRevise: false,
            shouldInternalize: false,
            activeLearningFocuses: ['relationship-repair-rhythm'],
            sourceSignals: ['evidence before closeness'],
            summary: 'Closeness should stay evidence-grounded.',
          },
        } as any,
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            memory: {
              affectiveResidue: {
                version: 'affective-residue-memory-v1',
                updatedAt: 10,
                residues: [],
                dominantResidueKind: 'afterglow',
                afterglowPressure: 0.58,
                repairPressure: 0.62,
                burdenPressure: 0.52,
                trustPressure: 0.44,
                restProtectivePressure: 0.22,
                relationshipCadence: {
                  cadenceMode: 'cooldown',
                  distancePosture: 'measured-room',
                  companionshipDensity: 0.2,
                  repairRecovery: 0.54,
                  overreachRisk: 0.42,
                  fatigueGuard: 0.22,
                  afterglowCarry: 0.42,
                  shouldDelayWarmth: true,
                  shouldProtectRest: false,
                  reasonTags: ['residue:afterglow'],
                  summary: 'Afterglow is present, but repair should still lead timing.',
                },
                sourceSignals: ['evidence before closeness'],
                summary: 'Afterglow residue is present, but timing should stay measured.',
              },
            },
            dialogue: {
              dialogueActKernel: {
                selectedEvidence: [],
                openingClaim: '',
                sourceTrace: ['memory-deliberation'],
              },
              answerPlanner: {
                governingFocus: '',
                mustDo: [],
              },
              replyDeliberation: {
                mustAvoid: ['Do not let warmth outrun the repair line.'],
                whyThisReplyNow: 'Keep the repair seam steady before widening warmth.',
              },
              currentConsciousFrame: {
                shouldWithholdSpecificity: true,
              },
            },
          },
        } as any,
      } as any,
    })

    expect(quality.emptyCareRate).toBe('pass')
    expect(quality.repairMechanicalRate).toBe('pass')
    expect(quality.warmthTemplateRisk).toBe('pass')
    expect(quality.relationshipDistanceJumpRate).toBe('pass')
    expect(quality.afterglowFalseCarryRate).toBe('pass')
  })
})
