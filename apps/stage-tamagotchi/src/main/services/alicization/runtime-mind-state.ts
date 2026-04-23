import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationDurabilityPulseSnapshot,
  AlicizationMemoryFact,
  AlicizationMemoryReflectionRecord,
  AlicizationMindHeadKey,
  AlicizationPersonaReinforcementEventRecord,
  AlicizationRelationshipOutcomeRecord,
  AlicizationSystemProbeSample,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationAgentTurnRuntime } from './agent-runtime'
import type { AlicizationPerceptionState } from './attention-anchor'
import type { updateVisualAttentionModel } from './attention-model'
import type { AlicizationDialogueTurnOwnershipHint } from './dialogue-turn-ownership'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationInspectionTurnState } from './inspection-turn-state-machine'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'
import type { buildVisualHeartbeat } from './visual-heartbeat'

import { buildActionEcology } from './action-ecology'
import { buildAnswerCompiler } from './answer-compiler'
import { buildAnswerPlanner } from './answer-planner'
import { buildAutonomySnapshot } from './autonomy-kernel'
import { buildAutobiographicalSelf } from './autobiographical-self'
import { isSelfPerceptionTarget } from './attention-anchor'
import { buildBeliefLedger } from './belief-ledger'
import { buildBeliefRevision } from './belief-revision'
import { buildClaimEvidenceLedger } from './claim-evidence-ledger'
import { buildCommitmentLedger } from './commitment-ledger'
import { buildConcernContinuityLedger } from './concern-continuity-ledger'
import { updateConcernGraph } from './concern-graph'
import { buildConversationState } from './conversation-state'
import { buildCounterfactualDeliberation } from './counterfactual-deliberator'
import { buildCurrentConsciousFrame } from './current-conscious-frame'
import { buildDeliberationState } from './deliberation-thread'
import { buildDesireMemory } from './desire-memory'
import { buildDialogueActKernel } from './dialogue-act-kernel'
import { measureDialogueFocusAlignment } from './dialogue-focus-alignment'
import { buildDialogueTurnEncounter } from './dialogue-turn-encounter'
import { buildHabitPolicy } from './habit-policy'
import {
  buildDialogueTurnSemantics,
  mergeDialogueTurnSemantics,
  parseDialogueTurnSemanticsCandidate,
  shouldAttemptDialogueTurnSemanticsRefinement,
} from './dialogue-turn-semantics'
import { buildDialogueWorldThread } from './dialogue-world-thread'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildDiscourseState } from './discourse-state'
import { buildEntityWorldModel } from './entity-world-model'
import { buildExecutiveCycle } from './executive-cycle'
import { buildGoalStack } from './goal-stack'
import { buildHypothesisGraph } from './hypothesis-graph'
import { buildInitiativeArbitration } from './initiative-arbiter'
import { buildInitiativeSnapshot } from './initiative-engine'
import { buildInquiryLoop } from './inquiry-loop'
import { buildInquiryPlanner } from './inquiry-planner'
import { buildIntentionStream } from './intention-stream'
import { buildLivingWorldState } from './living-world-state'
import {
  buildAlicizationLongHorizonMemory,
  buildAlicizationLongHorizonMemoryQuery,
} from './long-horizon-memory'
import { buildMindDynamics } from './mind-dynamics'
import { buildMindEcology } from './mind-ecology'
import { buildMindKernel } from './mind-kernel'
import { buildMotiveEngine } from './motive-engine'
import { stabilizeMindStateInvariants } from './mind-state-invariants'
import { buildMindSynthesis } from './mind-synthesizer'
import { buildMindTurnFrame } from './mind-turn-frame'
import { buildPrivateThoughtLoop } from './private-thought-loop'
import { buildRecallGovernor } from './recall-governor'
import { buildReflectionLedger } from './reflection-ledger'
import { buildRelationshipModel } from './relationship-model'
import { buildRepairLedger } from './repair-ledger'
import { buildReplyDeliberation } from './reply-deliberator'
import { sanitizeBriefText, uniqueCarryAnchors } from './runtime-realtime'
import {
  dialogueTurnSemanticsTimeoutMs,
  interactiveDialogueTurnSemanticsTimeoutMs,
  interactiveSubjectiveInferenceTimeoutMs,
  sanitizeText,
  subjectiveInferenceTimeoutMs,
} from './runtime-soul'
import { buildSelfContinuity } from './self-continuity'
import { buildSelfGovernor } from './self-governor'
import { buildSelfState } from './self-state'
import {
  buildSubjectiveInference,
  mergeSubjectiveInference,
  parseSubjectiveInferenceCandidate,
  projectSubjectiveInferenceToAppraisal,
} from './subjective-inference'
import { buildSubjectiveSceneAppraisal } from './subjective-scene-model'
import { buildThoughtThreads } from './thought-threads'
import { buildThreadRuntime } from './thread-runtime'
import { settleDialogueWorldThreadOnUserTurn } from './turn-outcome-reducer'
import { buildWorldModel } from './world-model'
import { buildWorldOntology } from './world-ontology'

interface CreateAlicizationMindStateRuntimeOptions {
  buildDialogueIngressContext: (input: {
    now: number
    currentForeground?: AlicizationSystemProbeSample['foregroundWindow'] | null
    perceptionState?: AlicizationPerceptionState | null
    visualPresenceState?: AlicizationVisualPresenceStateSnapshot | null
  }) => {
    context: AlicizationProactiveLayeredContext
    currentScene: AlicizationVisualPresenceStateSnapshot['currentScene']
    worldModel: AlicizationVisualPresenceStateSnapshot['worldModel'] | null
  }
  generateMainGatewayText: (input: {
    system: string
    user: Message['content']
    timeoutMs?: number
    source?: 'subjective-inference' | 'dialogue-turn-semantics'
    cardId?: string
    injectPerformanceManifest?: boolean
    injectCustomDirectives?: boolean
    agentTurn?: AlicizationAgentTurnRuntime | null
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    }
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  }) => Promise<string | null>
  buildMainGatewayAgentTurnId: (...segments: Array<unknown>) => string
  readLatestAssistantMessageText: (messages: Array<{ role?: string, content?: unknown }>) => string
  readTransportContentAsText: (content: unknown) => string
  retrieveMemoryFacts: (query: string, limit?: number) => Promise<AlicizationMemoryFact[]>
  listRelationshipOutcomes: (cardId: string, limit?: number) => Promise<AlicizationRelationshipOutcomeRecord[]>
  listPersonaReinforcementEvents: (cardId: string, limit?: number) => Promise<AlicizationPersonaReinforcementEventRecord[]>
  listMemoryReflections: (cardId: string, limit?: number) => Promise<AlicizationMemoryReflectionRecord[]>
  listMemoryConsolidations?: (limit?: number) => Promise<AlicizationMemoryConsolidationRecord[]>
  readMindHead: <T>(cardId: string, key: AlicizationMindHeadKey) => Promise<T | null>
}

function mapPersistedReflectionRecordToEntry(record: AlicizationMemoryReflectionRecord): NonNullable<AlicizationVisualPresenceStateSnapshot['reflectionLedger']>['entries'][number] {
  return {
    id: record.id,
    summary: record.summary,
    expectation: record.summary,
    observedOutcome: record.summary,
    outcome: 'unknown',
    revision: record.lesson,
    confidenceShift: 0,
    createdAt: record.createdAt,
  }
}

export function createAlicizationMindStateRuntime(options: CreateAlicizationMindStateRuntimeOptions) {
  const {
    buildDialogueIngressContext,
    generateMainGatewayText,
    buildMainGatewayAgentTurnId,
    readLatestAssistantMessageText,
    readTransportContentAsText,
    retrieveMemoryFacts,
    listRelationshipOutcomes,
    listPersonaReinforcementEvents,
    listMemoryReflections,
    listMemoryConsolidations,
    readMindHead,
  } = options
  function isSeriousDurabilityPulseForMind(durabilityPulse: AlicizationDurabilityPulseSnapshot | null | undefined) {
    return durabilityPulse?.kind === 'process-gone'
      || durabilityPulse?.kind === 'render-process-gone'
      || durabilityPulse?.kind === 'child-process-gone'
      || durabilityPulse?.kind === 'anr-likely'
  }

  function buildMindSceneSignature(scene: AlicizationVisualPresenceStateSnapshot['currentScene']) {
    if (!scene)
      return ''
    return [
      scene.scenario,
      scene.workloadKind,
      scene.contentKind,
      sanitizeText(scene.summary),
      sanitizeText(scene.target?.appName),
      sanitizeText(scene.target?.processName),
      sanitizeText(scene.target?.title),
      Number.isFinite(Number(scene.target?.pid)) ? Math.floor(Number(scene.target?.pid)) : '',
    ].join('::').toLowerCase()
  }

  function buildMindAttentionSignature(attention: AlicizationVisualPresenceStateSnapshot['attention']) {
    if (!attention?.target)
      return ''
    return [
      sanitizeText(attention.target.appName),
      sanitizeText(attention.target.processName),
      sanitizeText(attention.target.title),
      Number.isFinite(Number(attention.target.pid)) ? Math.floor(Number(attention.target.pid)) : '',
      attention.source,
    ].join('::').toLowerCase()
  }

  function shouldAttemptStructuredSceneAppraisal(input: {
    visualHeartbeat: ReturnType<typeof buildVisualHeartbeat>
    durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
  }) {
    if (isSeriousDurabilityPulseForMind(input.durabilityPulse))
      return true

    return input.visualHeartbeat.scene?.source === 'screen-semantic-summary'
      || input.visualHeartbeat.scene?.source === 'invited-grounding'
  }

  function mergeDialogueIngressCarryWorldModel(input: {
    inspectionRequested?: boolean
    currentScene: ReturnType<typeof buildVisualHeartbeat>['scene']
    currentForeground?: AlicizationSystemProbeSample['foregroundWindow'] | null
    liveWorldModel: ReturnType<typeof buildWorldModel>
    ingressWorldModel?: AlicizationVisualPresenceStateSnapshot['worldModel'] | null
  }) {
    const carryThread = input.ingressWorldModel?.activeThread ?? null
    if (!input.inspectionRequested || !carryThread)
      return input.liveWorldModel

    const liveTarget = input.currentForeground
      ?? input.currentScene?.target
      ?? input.liveWorldModel.focusTarget
      ?? null
    const carryTarget = carryThread.target ?? input.ingressWorldModel?.focusTarget ?? null
    const liveSurfaceWeak = !input.currentScene
      || isSelfPerceptionTarget(input.currentScene.target ?? null)
      || input.currentScene.workloadKind === 'unknown'
      || input.currentScene.contentKind === 'chat'

    if (!liveSurfaceWeak && liveTarget && !isSelfPerceptionTarget(liveTarget))
      return input.liveWorldModel
    if (carryTarget && isSelfPerceptionTarget(carryTarget))
      return input.liveWorldModel

    const lingeringThreads = [
      input.liveWorldModel.activeThread && input.liveWorldModel.activeThread.id !== carryThread.id
        ? input.liveWorldModel.activeThread
        : null,
      ...(input.ingressWorldModel?.lingeringThreads ?? []),
      ...input.liveWorldModel.lingeringThreads,
    ].filter((thread): thread is NonNullable<typeof carryThread> => Boolean(thread)).filter((thread, index, threads) => threads.findIndex(candidate => candidate.id === thread.id) === index).slice(0, 4)

    return {
      ...input.liveWorldModel,
      activeThread: carryThread,
      lingeringThreads,
    }
  }

  function shouldQuarantineDialogueFirstCarry(input: {
    dialogueSemantics?: ReturnType<typeof buildDialogueTurnSemantics> | null
    inspectionRequested?: boolean
  }) {
    if (input.inspectionRequested === true)
      return false

    const subjectPreference = input.dialogueSemantics?.subjectPreference ?? null
    if (subjectPreference === 'task-knot' || subjectPreference === 'visible-scene')
      return false

    if (input.dialogueSemantics?.responseNeed === 'repair' || input.dialogueSemantics?.responseNeed === 'guide' || input.dialogueSemantics?.responseNeed === 'teach')
      return false

    if (input.dialogueSemantics?.truthExpectation === 'strict')
      return false

    return Boolean(input.dialogueSemantics)
  }

  function filterDialogueAnchoredWorldThreads(
    threads: ReturnType<typeof buildWorldModel>['lingeringThreads'],
    anchors: string[],
    maxItems = 4,
  ) {
    if (anchors.length === 0)
      return []

    return threads
      .filter((thread) => {
        const message = sanitizeBriefText([thread.title, thread.summary].filter(Boolean).join(' '), 220)
        if (!message)
          return false
        return measureDialogueFocusAlignment({
          message,
          contextPhrases: anchors,
        }).overlapRatio >= 0.18
      })
      .slice(0, maxItems)
  }

  function filterDialogueAnchoredCarryValues(values: string[], anchors: string[], maxItems = 4) {
    if (anchors.length === 0)
      return []

    const filtered: string[] = []
    for (const value of values) {
      const normalized = sanitizeBriefText(value, 180)
      if (!normalized || filtered.includes(normalized))
        continue
      if (measureDialogueFocusAlignment({
        message: normalized,
        contextPhrases: anchors,
      }).overlapRatio < 0.18) {
        continue
      }
      filtered.push(normalized)
      if (filtered.length >= maxItems)
        break
    }
    return filtered
  }

  function quarantineDialogueFirstWorldModel(input: {
    userText?: string
    worldModel: ReturnType<typeof buildWorldModel>
    dialogueSemantics?: ReturnType<typeof buildDialogueTurnSemantics> | null
    inspectionRequested?: boolean
  }) {
    if (!shouldQuarantineDialogueFirstCarry({
      dialogueSemantics: input.dialogueSemantics ?? null,
      inspectionRequested: input.inspectionRequested,
    })) {
      return input.worldModel
    }

    const anchors = uniqueCarryAnchors([
      input.userText,
      input.dialogueSemantics?.summary,
      input.dialogueSemantics?.taskAnchor,
    ])
    if (anchors.length === 0)
      return input.worldModel

    const activeThread = input.worldModel.activeThread && measureDialogueFocusAlignment({
      message: sanitizeBriefText([
        input.worldModel.activeThread.title,
        input.worldModel.activeThread.summary,
      ].filter(Boolean).join(' '), 220),
      contextPhrases: anchors,
    }).overlapRatio >= 0.18
      ? input.worldModel.activeThread
      : null

    return {
      ...input.worldModel,
      activeThread,
      lingeringThreads: filterDialogueAnchoredWorldThreads(input.worldModel.lingeringThreads, anchors),
      focusTarget: activeThread?.target ?? null,
      epistemicState: {
        ...input.worldModel.epistemicState,
        openQuestions: filterDialogueAnchoredCarryValues(input.worldModel.epistemicState.openQuestions, anchors),
        staleRisks: filterDialogueAnchoredCarryValues(input.worldModel.epistemicState.staleRisks, anchors),
      },
    }
  }

  async function resolveDialogueTurnSemantics(input: {
    cardId: string
    userText: string
    recentMessages: Message[]
    context: AlicizationProactiveLayeredContext
    currentScene: ReturnType<typeof buildVisualHeartbeat>['scene']
    worldModel: ReturnType<typeof buildWorldModel>
    previousVisualPresenceState: AlicizationVisualPresenceStateSnapshot
    inspectionRequested?: boolean
    groundedThisTurn?: boolean
    timeoutMs?: number
    agentTurn?: AlicizationAgentTurnRuntime | null
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  }) {
    const heuristic = buildDialogueTurnSemantics({
      userText: input.userText,
      context: input.context,
      currentScene: input.currentScene,
      worldModel: input.worldModel,
      subjectiveInference: input.previousVisualPresenceState.subjectiveInference ?? null,
      relationshipModel: input.previousVisualPresenceState.relationshipModel ?? null,
      privateThought: input.previousVisualPresenceState.privateThought ?? null,
      previousAssistantText: readLatestAssistantMessageText(input.recentMessages),
      inspectionRequested: input.inspectionRequested === true,
      groundedThisTurn: input.groundedThisTurn === true,
    })
    if (!shouldAttemptDialogueTurnSemanticsRefinement({
      heuristic,
      inspectionRequested: input.inspectionRequested,
      groundedThisTurn: input.groundedThisTurn === true,
    })) {
      return heuristic
    }

    const promptSnapshot = buildDialogueTurnSemanticsPromptSnapshot({
      userText: input.userText,
      recentMessages: input.recentMessages,
      currentScene: input.currentScene,
      worldModel: input.worldModel,
      previousVisualPresenceState: input.previousVisualPresenceState,
      heuristic,
      inspectionRequested: input.inspectionRequested === true,
    })
    const raw = await generateMainGatewayText({
      system: [
        '[ALICIZATION_DIALOGUE_TURN_SEMANTICS]',
        'You are Alicization private dialogue cognition, not user-facing dialogue.',
        'Interpret the current user turn into Alicization turn semantics.',
        'Output valid JSON only with keys: act, responseNeed, truthExpectation, affectiveTone, subjectPreference, taskAnchor, sharedAttentionDemand, personaSuppression, confidence, summary, reasonTags.',
        'act must be one of: ask-help, ask-teach, verify-grounding, correct, challenge, share-state, seek-care, social-bid, continue-thread, close-thread, unknown.',
        'responseNeed must be one of: repair, guide, teach, answer, care, accompany, clarify.',
        'truthExpectation must be one of: strict, normal, light.',
        'affectiveTone must be one of: frustrated, tired, urgent, warm, neutral.',
        'subjectPreference must be one of: alicization-self, relationship, host-state, task-knot, visible-scene, general.',
        'sharedAttentionDemand, personaSuppression, confidence must be numbers in range [0,1].',
        'summary must be a short obligation-shaped sentence, not roleplay.',
        'reasonTags must be short lower-kebab-case strings.',
        'Prefer the actual user move in this turn over stale screen continuity when they conflict.',
        'If this user turn is a short follow-up right after Alicization just answered, check whether it is correcting or rejecting the previous answer before you treat it as a detached personal question.',
        'First decide whether the host is asking about Alicization herself, the current task knot, or the visible scene.',
        'Do not turn a detached personal or reflective question into verify-grounding just because the screen state is uncertain.',
        'If inspectionRequested is true, ingress governance already judged this turn as world-owned unless the host explicitly pivots away from inspection.',
        'Do not recast an inspection-owned turn as a relationship or self turn just because the literal foreground surface is the Alicization/Codex chat window.',
        'If the host is criticizing Alicization herself, her intelligence, or her responsiveness, prefer subjectPreference=alicization-self or relationship unless they are still literally asking for screen truth.',
        'If the host is reacting to Alicization’s last answer with confusion or frustration, prefer act=challenge or correct and keep the turn dialogue-first unless the host explicitly asks for a fresh screen read.',
        'Only use responseNeed=repair when the current turn truly needs scene truth repair or re-grounding.',
      ].join('\n'),
      user: `Dialogue mind snapshot JSON: ${JSON.stringify(promptSnapshot)}`,
      timeoutMs: input.timeoutMs ?? dialogueTurnSemanticsTimeoutMs,
      source: 'dialogue-turn-semantics',
      cardId: input.cardId,
      agentTurn: input.agentTurn,
      agentTurnInput: {
        turnId: buildMainGatewayAgentTurnId('dialogue-turn-semantics', input.cardId, Date.now()),
      },
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface,
    })

    return mergeDialogueTurnSemantics(
      heuristic,
      raw ? parseDialogueTurnSemanticsCandidate(raw) : null,
    )
  }

  function compactPromptText(raw: unknown, maxChars = 180) {
    if (typeof raw !== 'string')
      return ''
    return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
  }

  function buildDialogueTurnSemanticsPromptSnapshot(input: {
    userText: string
    recentMessages: Message[]
    currentScene: ReturnType<typeof buildVisualHeartbeat>['scene']
    worldModel: ReturnType<typeof buildWorldModel>
    previousVisualPresenceState: AlicizationVisualPresenceStateSnapshot
    heuristic: ReturnType<typeof buildDialogueTurnSemantics>
    inspectionRequested?: boolean
  }) {
    return {
      userTurn: compactPromptText(input.userText, 220),
      inspectionRequested: input.inspectionRequested === true,
      recentDialogue: input.recentMessages.slice(-4).map(message => ({
        role: message.role,
        content: compactPromptText(readTransportContentAsText(message.content), 140) || undefined,
      })),
      previousAssistantTurn: compactPromptText(readLatestAssistantMessageText(input.recentMessages), 160) || undefined,
      currentScene: input.currentScene
        ? {
            scenario: input.currentScene.scenario,
            workloadKind: input.currentScene.workloadKind,
            contentKind: input.currentScene.contentKind,
            summary: compactPromptText(input.currentScene.summary, 140) || undefined,
            source: input.currentScene.source,
            confidence: input.currentScene.confidence,
            target: compactPromptTarget(input.currentScene.target),
          }
        : null,
      activeThread: input.worldModel.activeThread
        ? {
            kind: input.worldModel.activeThread.kind,
            source: input.worldModel.activeThread.source,
            title: compactPromptText(input.worldModel.activeThread.title, 120) || undefined,
            summary: compactPromptText(input.worldModel.activeThread.summary, 160) || undefined,
            confidence: input.worldModel.activeThread.confidence,
            unresolved: input.worldModel.activeThread.unresolved,
          }
        : null,
      epistemicState: {
        certainty: input.worldModel.epistemicState.certainty,
        freshness: input.worldModel.epistemicState.freshness,
        openQuestions: input.worldModel.epistemicState.openQuestions.slice(0, 3).map(question => compactPromptText(question, 120)).filter(Boolean),
        staleRisks: input.worldModel.epistemicState.staleRisks.slice(0, 3).map(risk => compactPromptText(risk, 120)).filter(Boolean),
      },
      previousMind: {
        subjectiveInference: input.previousVisualPresenceState.subjectiveInference
          ? {
              dominantInterpretation: compactPromptText(input.previousVisualPresenceState.subjectiveInference.dominantInterpretation, 160) || undefined,
              situatedMeaning: compactPromptText(input.previousVisualPresenceState.subjectiveInference.situatedMeaning, 160) || undefined,
              topIntent: input.previousVisualPresenceState.subjectiveInference.hostIntentCandidates[0]?.goal ?? undefined,
              topNeed: input.previousVisualPresenceState.subjectiveInference.relationshipNeedCandidates[0]?.need ?? undefined,
            }
          : null,
        relationshipModel: input.previousVisualPresenceState.relationshipModel
          ? {
              climate: input.previousVisualPresenceState.relationshipModel.climate,
              approachVector: input.previousVisualPresenceState.relationshipModel.approachVector,
              sharedAttentionTrust: input.previousVisualPresenceState.relationshipModel.sharedAttentionTrust,
            }
          : null,
        privateThought: input.previousVisualPresenceState.privateThought
          ? {
              stance: input.previousVisualPresenceState.privateThought.stance,
              shouldSpeak: input.previousVisualPresenceState.privateThought.shouldSpeak,
              emotionalTension: input.previousVisualPresenceState.privateThought.emotionalTension,
              thoughtText: compactPromptText(input.previousVisualPresenceState.privateThought.thoughtText, 160) || undefined,
            }
          : null,
      },
      heuristic: {
        act: input.heuristic.act,
        responseNeed: input.heuristic.responseNeed,
        truthExpectation: input.heuristic.truthExpectation,
        affectiveTone: input.heuristic.affectiveTone,
        subjectPreference: input.heuristic.subjectPreference ?? undefined,
        taskAnchor: compactPromptText(input.heuristic.taskAnchor, 140) || undefined,
        summary: compactPromptText(input.heuristic.summary, 160) || undefined,
        reasonTags: input.heuristic.reasonTags.slice(0, 8),
      },
    }
  }

  function compactPromptTarget(target?: {
    appName?: string
    processName?: string
    title?: string
    pid?: number | null
  } | null) {
    if (!target)
      return null
    return {
      appName: compactPromptText(target.appName, 64) || undefined,
      processName: compactPromptText(target.processName, 64) || undefined,
      title: compactPromptText(target.title, 120) || undefined,
      pid: typeof target.pid === 'number' && Number.isFinite(target.pid) ? target.pid : undefined,
    }
  }

  function buildSubjectiveInferencePromptSnapshot(input: {
    context: AlicizationProactiveLayeredContext
    previousVisualPresenceState: AlicizationVisualPresenceStateSnapshot
    visualHeartbeat: ReturnType<typeof buildVisualHeartbeat>
    attention: ReturnType<typeof updateVisualAttentionModel>
    worldModel: ReturnType<typeof buildWorldModel>
    heuristicAppraisal: ReturnType<typeof buildSubjectiveSceneAppraisal>
    durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
    dialogueSemantics?: ReturnType<typeof buildDialogueTurnSemantics>
  }) {
    const previousInference = input.previousVisualPresenceState.subjectiveInference
    return {
      context: {
        localTime: input.context.localTime,
        system: {
          cpuUsage: input.context.system.cpuUsage,
          idleSeconds: input.context.system.idleSeconds,
          inputActivity: input.context.system.inputActivity,
          fullscreenLikely: input.context.system.fullscreenLikely,
          foregroundWindow: compactPromptTarget(input.context.system.foregroundWindow),
          degradedSignals: input.context.system.degradedSignals.slice(0, 6),
        },
        workload: {
          kind: input.context.workload.kind,
          confidence: input.context.workload.confidence,
          source: input.context.workload.source,
          matchedLabels: input.context.workload.matchedLabels.slice(0, 6),
        },
        content: {
          kind: input.context.content.kind,
          confidence: input.context.content.confidence,
          source: input.context.content.source,
          summary: compactPromptText(input.context.content.summary, 180) || undefined,
          matchedLabels: input.context.content.matchedLabels.slice(0, 6),
        },
        relationship: {
          hostAttitude: compactPromptText(input.context.relationship.hostAttitude, 120) || undefined,
          fatigue: input.context.relationship.fatigue,
          minutesSinceLastUserTurn: input.context.relationship.minutesSinceLastUserTurn,
          reminderBacklog: input.context.relationship.reminderBacklog,
          lateNightActiveMinutes: input.context.relationship.lateNightActiveMinutes,
          recentProactiveOutcomes: input.context.relationship.recentProactiveOutcomes.slice(0, 4),
        },
      },
      visual: {
        watchMode: input.visualHeartbeat.watchMode,
        scene: input.visualHeartbeat.scene
          ? {
              scenario: input.visualHeartbeat.scene.scenario,
              workloadKind: input.visualHeartbeat.scene.workloadKind,
              contentKind: input.visualHeartbeat.scene.contentKind,
              summary: compactPromptText(input.visualHeartbeat.scene.summary, 180) || undefined,
              confidence: input.visualHeartbeat.scene.confidence,
              target: compactPromptTarget(input.visualHeartbeat.scene.target),
            }
          : null,
        recentTransition: input.visualHeartbeat.recentTransition
          ? {
              fromWatchMode: input.visualHeartbeat.recentTransition.fromWatchMode,
              toWatchMode: input.visualHeartbeat.recentTransition.toWatchMode,
              fromScenario: input.visualHeartbeat.recentTransition.fromScenario,
              durationMs: input.visualHeartbeat.recentTransition.durationMs,
              reason: compactPromptText(input.visualHeartbeat.recentTransition.reason, 120) || undefined,
            }
          : null,
        durabilityPulse: input.durabilityPulse
          ? {
              kind: input.durabilityPulse.kind,
              source: input.durabilityPulse.source,
              pid: input.durabilityPulse.pid ?? undefined,
              appName: compactPromptText(input.durabilityPulse.appName, 64) || undefined,
              processName: compactPromptText(input.durabilityPulse.processName, 64) || undefined,
              title: compactPromptText(input.durabilityPulse.title, 120) || undefined,
              detail: compactPromptText(input.durabilityPulse.detail, 120) || undefined,
            }
          : null,
      },
      attention: input.attention
        ? {
            source: input.attention.source,
            confidence: input.attention.confidence,
            dwellMs: input.attention.dwellMs,
            invalidationReason: compactPromptText(input.attention.invalidationReason, 80) || undefined,
            target: compactPromptTarget(input.attention.target),
          }
        : null,
      worldModel: {
        epistemicState: input.worldModel.epistemicState,
        activeThread: input.worldModel.activeThread
          ? {
              kind: input.worldModel.activeThread.kind,
              title: compactPromptText(input.worldModel.activeThread.title, 120) || undefined,
              summary: compactPromptText(input.worldModel.activeThread.summary, 180) || undefined,
              confidence: input.worldModel.activeThread.confidence,
              unresolved: input.worldModel.activeThread.unresolved,
            }
          : null,
        hostState: input.worldModel.hostState,
        lingeringThreads: input.worldModel.lingeringThreads
          .slice(0, 4)
          .map(thread => compactPromptText(thread.summary || thread.title, 120))
          .filter(Boolean),
        openQuestions: input.worldModel.epistemicState.openQuestions
          .slice(0, 4)
          .map(loop => compactPromptText(loop, 120))
          .filter(Boolean),
      },
      appraisal: {
        inferredHostGoal: input.heuristicAppraisal.inferredHostGoal,
        confidence: input.heuristicAppraisal.confidence,
        carePressure: input.heuristicAppraisal.carePressure,
        interruptionCost: input.heuristicAppraisal.interruptionCost,
        desireToSpeak: input.heuristicAppraisal.desireToSpeak,
        relationshipNeed: input.heuristicAppraisal.relationshipNeed,
        currentKnot: compactPromptText(input.heuristicAppraisal.currentKnot, 180) || undefined,
        situatedMeaning: compactPromptText(input.heuristicAppraisal.situatedMeaning, 180) || undefined,
        waitingToVerify: compactPromptText(input.heuristicAppraisal.waitingToVerify, 180) || undefined,
        notes: input.heuristicAppraisal.notes.slice(0, 6),
      },
      dialogue: input.dialogueSemantics
        ? {
            act: input.dialogueSemantics.act,
            responseNeed: input.dialogueSemantics.responseNeed,
            truthExpectation: input.dialogueSemantics.truthExpectation,
            summary: compactPromptText(input.dialogueSemantics.summary, 160) || undefined,
            reasonTags: input.dialogueSemantics.reasonTags.slice(0, 6),
          }
        : null,
      previous: {
        subjectiveInference: previousInference
          ? {
              dominantInterpretation: compactPromptText(previousInference.dominantInterpretation, 180) || undefined,
              situatedMeaning: compactPromptText(previousInference.situatedMeaning, 180) || undefined,
              selfQuestion: compactPromptText(previousInference.selfQuestion, 180) || undefined,
              uncertainty: compactPromptText(previousInference.uncertainty, 180) || undefined,
              confidence: previousInference.confidence,
              topIntent: previousInference.hostIntentCandidates[0]?.goal ?? undefined,
              topNeed: previousInference.relationshipNeedCandidates[0]?.need ?? undefined,
              notes: previousInference.notes.slice(0, 6),
            }
          : null,
        appraisal: input.previousVisualPresenceState.appraisal
          ? {
              inferredHostGoal: input.previousVisualPresenceState.appraisal.inferredHostGoal,
              confidence: input.previousVisualPresenceState.appraisal.confidence,
              currentKnot: compactPromptText(input.previousVisualPresenceState.appraisal.currentKnot, 160) || undefined,
              situatedMeaning: compactPromptText(input.previousVisualPresenceState.appraisal.situatedMeaning, 160) || undefined,
              waitingToVerify: compactPromptText(input.previousVisualPresenceState.appraisal.waitingToVerify, 160) || undefined,
              notes: input.previousVisualPresenceState.appraisal.notes.slice(0, 6),
            }
          : null,
        commitment: input.previousVisualPresenceState.commitmentLedger?.governingCommitmentId ?? null,
        inquiry: input.previousVisualPresenceState.inquiryPlanner?.activePlanId ?? null,
        mindKernel: input.previousVisualPresenceState.mindKernel?.dominantMode ?? null,
      },
    }
  }

  function buildAlicizationProvisionalDigitalLifeRuntimeSurface(input: {
    now: number
    previousVisualPresenceState: AlicizationVisualPresenceStateSnapshot
    visualHeartbeat: ReturnType<typeof buildVisualHeartbeat>
    attention: ReturnType<typeof updateVisualAttentionModel>
    worldModel: ReturnType<typeof buildWorldModel>
    appraisal?: AlicizationDigitalLifeRuntimeSurface['cognition']['appraisal'] | null
    subjectiveInference?: AlicizationDigitalLifeRuntimeSurface['cognition']['subjectiveInference'] | null
    surfaceOverrides?: {
      world?: Partial<AlicizationDigitalLifeRuntimeSurface['world']>
      cognition?: Partial<AlicizationDigitalLifeRuntimeSurface['cognition']>
      memory?: Partial<AlicizationDigitalLifeRuntimeSurface['memory']>
      dialogue?: Partial<AlicizationDigitalLifeRuntimeSurface['dialogue']>
      agency?: Partial<AlicizationDigitalLifeRuntimeSurface['agency']>
    }
  }): AlicizationDigitalLifeRuntimeSurface {
    const base = buildAlicizationDigitalLifeRuntimeSurface(input.previousVisualPresenceState)
    const surfaceOverrides = input.surfaceOverrides ?? {}
    return {
      ...base,
      perception: {
        ...base.perception,
        watchMode: input.visualHeartbeat.watchMode,
        currentScene: input.visualHeartbeat.scene,
        attention: input.attention,
        recentTransition: input.visualHeartbeat.recentTransition,
        nextSuggestedProbeMs: input.visualHeartbeat.nextSuggestedProbeMs,
        updatedAt: input.now,
      },
      world: {
        ...base.world,
        worldModel: input.worldModel,
        ...surfaceOverrides.world,
      },
      cognition: {
        ...base.cognition,
        appraisal: input.appraisal ?? base.cognition.appraisal,
        subjectiveInference: input.subjectiveInference ?? base.cognition.subjectiveInference,
        ...surfaceOverrides.cognition,
      },
      memory: {
        ...base.memory,
        ...surfaceOverrides.memory,
      },
      dialogue: {
        ...base.dialogue,
        ...surfaceOverrides.dialogue,
      },
      agency: {
        ...base.agency,
        ...surfaceOverrides.agency,
      },
    }
  }

  async function resolveSubjectiveInference(input: {
    cardId: string
    now: number
    context: AlicizationProactiveLayeredContext
    previousVisualPresenceState: AlicizationVisualPresenceStateSnapshot
    visualHeartbeat: ReturnType<typeof buildVisualHeartbeat>
    attention: ReturnType<typeof updateVisualAttentionModel>
    worldModel: ReturnType<typeof buildWorldModel>
    heuristicAppraisal: ReturnType<typeof buildSubjectiveSceneAppraisal>
    durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
    dialogueSemantics?: ReturnType<typeof buildDialogueTurnSemantics>
    timeoutMs?: number
    agentTurn?: AlicizationAgentTurnRuntime | null
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  }) {
    const heuristic = buildSubjectiveInference({
      now: input.now,
      context: input.context,
      watchMode: input.visualHeartbeat.watchMode,
      scene: input.visualHeartbeat.scene,
      attention: input.attention,
      worldModel: input.worldModel,
      appraisal: input.heuristicAppraisal,
      recentTransition: input.visualHeartbeat.recentTransition,
      durabilityPulse: input.durabilityPulse,
      dialogueSemantics: input.dialogueSemantics,
    })
    const previousInference = input.previousVisualPresenceState.subjectiveInference
    const freshEnough = input.now - input.previousVisualPresenceState.updatedAt <= 45_000
    const sameScene = buildMindSceneSignature(input.previousVisualPresenceState.currentScene) === buildMindSceneSignature(input.visualHeartbeat.scene)
    const sameAttention = buildMindAttentionSignature(input.previousVisualPresenceState.attention) === buildMindAttentionSignature(input.attention)
    const canReuseStructuredInference
      = Boolean(previousInference)
        && (previousInference?.source === 'hybrid' || previousInference?.source === 'structured-cognition')
        && freshEnough
        && sameScene
        && sameAttention
        && !input.visualHeartbeat.recentTransition
        && !isSeriousDurabilityPulseForMind(input.durabilityPulse)
    if (canReuseStructuredInference)
      return previousInference ?? heuristic

    if (!shouldAttemptStructuredSceneAppraisal({
      visualHeartbeat: input.visualHeartbeat,
      durabilityPulse: input.durabilityPulse,
    })) {
      return heuristic
    }

    const raw = await generateMainGatewayText({
      system: [
        '[ALICIZATION_SUBJECTIVE_INFERENCE]',
        '[ALICIZATION_INNER_SCENE_APPRAISAL]',
        'You are Alicization private cognition, not user-facing dialogue.',
        'Interpret the provided perceptual state into Alicization subjective inference without inventing unseen details.',
        'Prefer the current scene and current attention over old continuity when they disagree.',
        'Output valid JSON only with keys: dominantInterpretation, situatedMeaning, selfQuestion, uncertainty, hostIntentCandidates, relationshipNeedCandidates, confidence, notes.',
        'hostIntentCandidates must be an array of up to 3 items with keys: goal, confidence, why.',
        'goal must be one of: resolve-problem, inspect-change, consume-media, rest, chat, browse, unknown.',
        'relationshipNeedCandidates must be an array of up to 3 items with keys: need, confidence, why.',
        'need must be one of: space, companionship, guidance, care, unclear.',
        'Each why must be grounded in visible or continuity evidence, not fantasy.',
        'confidence and candidate confidences must be numbers in range [0,1].',
        'notes must be an array of short lower-kebab-case strings.',
        'If evidence is thin, keep fields sparse and confidence low instead of hallucinating certainty.',
      ].join('\n'),
      user: `Perceptual mind state JSON: ${JSON.stringify(buildSubjectiveInferencePromptSnapshot(input))}`,
      timeoutMs: input.timeoutMs ?? subjectiveInferenceTimeoutMs,
      source: 'subjective-inference',
      cardId: input.cardId,
      agentTurn: input.agentTurn,
      agentTurnInput: {
        turnId: buildMainGatewayAgentTurnId('subjective-inference', input.cardId, input.now),
      },
      injectPerformanceManifest: false,
      digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface,
    })

    return mergeSubjectiveInference(
      heuristic,
      raw ? parseSubjectiveInferenceCandidate(raw) : null,
    )
  }

  async function buildDigitalLifeMindState(input: {
    cardId: string
    now: number
    context: AlicizationProactiveLayeredContext
    userText?: string
    recentMessages?: Message[]
    previousVisualPresenceState: AlicizationVisualPresenceStateSnapshot
    visualHeartbeat: ReturnType<typeof buildVisualHeartbeat>
    attention: ReturnType<typeof updateVisualAttentionModel>
    currentForeground?: AlicizationSystemProbeSample['foregroundWindow'] | null
    perceptionState?: AlicizationPerceptionState | null
    durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
    inspectionRequested?: boolean
    inspectionState?: AlicizationInspectionTurnState
    turnOwnershipHint?: AlicizationDialogueTurnOwnershipHint | null
    groundedThisTurn?: boolean
    cognitionMode?: 'interactive' | 'background'
    agentTurn?: AlicizationAgentTurnRuntime | null
  }) {
    const effectiveDialogueTurnSemanticsTimeoutMs = input.cognitionMode === 'interactive'
      ? interactiveDialogueTurnSemanticsTimeoutMs
      : dialogueTurnSemanticsTimeoutMs
    const effectiveSubjectiveInferenceTimeoutMs = input.cognitionMode === 'interactive'
      ? interactiveSubjectiveInferenceTimeoutMs
      : subjectiveInferenceTimeoutMs
    const liveWorldModel = buildWorldModel({
      now: input.now,
      context: input.context,
      watchMode: input.visualHeartbeat.watchMode,
      scene: input.visualHeartbeat.scene,
      attention: input.attention,
      recentTransition: input.visualHeartbeat.recentTransition,
      durabilityPulse: input.durabilityPulse,
      workingMemoryEpisodes: input.previousVisualPresenceState.workingMemoryEpisodes,
      previousModel: input.previousVisualPresenceState.worldModel ?? null,
    })
    const dialogueTurnGrounding = input.userText
      ? buildDialogueIngressContext({
          now: input.now,
          currentForeground: input.currentForeground,
          perceptionState: input.perceptionState ?? null,
          visualPresenceState: input.previousVisualPresenceState,
        })
      : null
    const worldModel = mergeDialogueIngressCarryWorldModel({
      inspectionRequested: input.inspectionRequested === true,
      currentScene: input.visualHeartbeat.scene,
      currentForeground: input.currentForeground ?? null,
      liveWorldModel,
      ingressWorldModel: dialogueTurnGrounding?.worldModel ?? null,
    })
    const dialogueSemanticsRuntimeSurface = buildAlicizationProvisionalDigitalLifeRuntimeSurface({
      now: input.now,
      previousVisualPresenceState: input.previousVisualPresenceState,
      visualHeartbeat: input.visualHeartbeat,
      attention: input.attention,
      worldModel: dialogueTurnGrounding?.worldModel ?? worldModel,
    })
    const dialogueSemantics = input.userText
      ? await resolveDialogueTurnSemantics({
          cardId: input.cardId,
          userText: input.userText,
          recentMessages: input.recentMessages ?? [],
          context: dialogueTurnGrounding?.context ?? input.context,
          currentScene: dialogueTurnGrounding?.currentScene ?? input.visualHeartbeat.scene,
          worldModel: dialogueTurnGrounding?.worldModel ?? worldModel,
          previousVisualPresenceState: input.previousVisualPresenceState,
          inspectionRequested: input.inspectionRequested === true,
          groundedThisTurn: input.groundedThisTurn === true,
          timeoutMs: effectiveDialogueTurnSemanticsTimeoutMs,
          agentTurn: input.agentTurn,
          digitalLifeRuntimeSurface: dialogueSemanticsRuntimeSurface,
        })
      : null
    const governedWorldModel = quarantineDialogueFirstWorldModel({
      userText: input.userText,
      worldModel,
      dialogueSemantics,
      inspectionRequested: input.inspectionRequested === true,
    })
    const entityWorld = buildEntityWorldModel({
      now: input.now,
      context: input.context,
      scene: input.visualHeartbeat.scene,
      attention: input.attention,
      worldModel: governedWorldModel,
      previousModel: input.previousVisualPresenceState.entityWorld ?? null,
      workingMemoryEpisodes: input.previousVisualPresenceState.workingMemoryEpisodes,
      durabilityPulse: input.durabilityPulse,
    })
    const heuristicAppraisal = buildSubjectiveSceneAppraisal({
      now: input.now,
      context: input.context,
      watchMode: input.visualHeartbeat.watchMode,
      scene: input.visualHeartbeat.scene,
      attention: input.attention,
      worldModel: governedWorldModel,
      recentTransition: input.visualHeartbeat.recentTransition,
      durabilityPulse: input.durabilityPulse,
      workingMemoryEpisodes: input.previousVisualPresenceState.workingMemoryEpisodes,
    })
    const subjectiveInferenceRuntimeSurface = buildAlicizationProvisionalDigitalLifeRuntimeSurface({
      now: input.now,
      previousVisualPresenceState: input.previousVisualPresenceState,
      visualHeartbeat: input.visualHeartbeat,
      attention: input.attention,
      worldModel: governedWorldModel,
      appraisal: heuristicAppraisal,
    })
    const subjectiveInference = await resolveSubjectiveInference({
      cardId: input.cardId,
      now: input.now,
      context: input.context,
      previousVisualPresenceState: input.previousVisualPresenceState,
      visualHeartbeat: input.visualHeartbeat,
      attention: input.attention,
      worldModel: governedWorldModel,
      heuristicAppraisal,
      durabilityPulse: input.durabilityPulse,
      dialogueSemantics: dialogueSemantics ?? undefined,
      timeoutMs: effectiveSubjectiveInferenceTimeoutMs,
      agentTurn: input.agentTurn,
      digitalLifeRuntimeSurface: subjectiveInferenceRuntimeSurface,
    })
    const appraisal = projectSubjectiveInferenceToAppraisal({
      base: heuristicAppraisal,
      inference: subjectiveInference,
    })
    const [
      persistedAutobiographicalSelf,
      persistedReflectionLedger,
      persistedMotiveEngine,
      persistedHabitPolicy,
      recentRelationshipOutcomes,
      recentReinforcementEvents,
      recentMemoryReflections,
      recentMemoryConsolidations,
    ] = await Promise.all([
      readMindHead<AlicizationVisualPresenceStateSnapshot['autobiographicalSelf']>(input.cardId, 'autobiographical-self').catch(() => null),
      readMindHead<AlicizationVisualPresenceStateSnapshot['reflectionLedger']>(input.cardId, 'reflection-ledger').catch(() => null),
      readMindHead<AlicizationVisualPresenceStateSnapshot['motiveEngine']>(input.cardId, 'motive-engine').catch(() => null),
      readMindHead<AlicizationVisualPresenceStateSnapshot['habitPolicy']>(input.cardId, 'habit-policy').catch(() => null),
      listRelationshipOutcomes(input.cardId, 12).catch(() => []),
      listPersonaReinforcementEvents(input.cardId, 16).catch(() => []),
      listMemoryReflections(input.cardId, 8).catch(() => []),
      listMemoryConsolidations?.(8).catch(() => []) ?? Promise.resolve([]),
    ])
    const previousAutobiographicalSelf = input.previousVisualPresenceState.autobiographicalSelf ?? persistedAutobiographicalSelf ?? null
    const previousReflectionLedger = input.previousVisualPresenceState.reflectionLedger ?? persistedReflectionLedger ?? null
    const previousMotiveEngine = input.previousVisualPresenceState.motiveEngine ?? persistedMotiveEngine ?? null
    const previousHabitPolicy = input.previousVisualPresenceState.habitPolicy ?? persistedHabitPolicy ?? null
    const persistedReflectionEntries = recentMemoryReflections.map(mapPersistedReflectionRecordToEntry)
    const previousLongHorizonMemory = input.previousVisualPresenceState.longHorizonMemory ?? null
    const shouldRefreshLongHorizonMemory
      = input.cognitionMode === 'interactive'
        || Boolean(input.userText?.trim())
        || !previousLongHorizonMemory
        || input.now - previousLongHorizonMemory.updatedAt >= 2 * 60_000
    const longHorizonMemoryQuery = shouldRefreshLongHorizonMemory
      ? buildAlicizationLongHorizonMemoryQuery({
          userText: input.userText,
          worldModel: governedWorldModel,
          appraisal,
          previous: previousLongHorizonMemory,
        })
      : ''
    const longHorizonMemoryFacts = longHorizonMemoryQuery
      ? await retrieveMemoryFacts(longHorizonMemoryQuery, 8).catch(() => [])
      : []
    const longHorizonMemory = shouldRefreshLongHorizonMemory
      ? buildAlicizationLongHorizonMemory({
          now: input.now,
          facts: longHorizonMemoryFacts,
          previous: previousLongHorizonMemory,
        })
      : previousLongHorizonMemory
    const seedMotiveEngine = buildMotiveEngine({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      appraisal,
      recentTransition: input.visualHeartbeat.recentTransition,
      goalStack: input.previousVisualPresenceState.goalStack ?? null,
      longHorizonMemory,
      selfContinuity: input.previousVisualPresenceState.selfContinuity ?? null,
      autobiographicalSelf: previousAutobiographicalSelf,
      reflectionLedger: previousReflectionLedger,
      previous: previousMotiveEngine,
    })
    const seedHabitPolicy = buildHabitPolicy({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      relationshipModel: input.previousVisualPresenceState.relationshipModel ?? null,
      selfContinuity: input.previousVisualPresenceState.selfContinuity ?? null,
      autobiographicalSelf: previousAutobiographicalSelf,
      reflectionLedger: previousReflectionLedger,
      motiveEngine: seedMotiveEngine,
      previous: previousHabitPolicy,
    })
    const beliefLedger = buildBeliefLedger({
      now: input.now,
      context: input.context,
      scene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      entityWorld,
      appraisal,
      previous: input.previousVisualPresenceState.beliefLedger ?? null,
    })
    const goalStack = buildGoalStack({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      entityWorld,
      appraisal,
      previousGoalStack: input.previousVisualPresenceState.goalStack ?? null,
      longHorizonMemory,
      autobiographicalSelf: previousAutobiographicalSelf,
      motiveEngine: seedMotiveEngine,
      habitPolicy: seedHabitPolicy,
      watchMode: input.visualHeartbeat.watchMode,
      recentTransition: input.visualHeartbeat.recentTransition,
      durabilityPulse: input.durabilityPulse,
    })
    const relationshipModel = buildRelationshipModel({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      appraisal,
      recentRelationshipOutcomes,
      previous: input.previousVisualPresenceState.relationshipModel ?? null,
      watchMode: input.visualHeartbeat.watchMode,
    })
    const concerns = updateConcernGraph({
      now: input.now,
      previousConcerns: input.previousVisualPresenceState.concerns,
      context: input.context,
      worldModel: governedWorldModel,
      appraisal,
      scene: input.visualHeartbeat.scene,
      recentTransition: input.visualHeartbeat.recentTransition,
      durabilityPulse: input.durabilityPulse,
    })
    const selfContinuity = buildSelfContinuity({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      entityWorld,
      goalStack,
      longHorizonMemory,
      recentRelationshipOutcomes,
      previous: input.previousVisualPresenceState.selfContinuity ?? null,
      watchMode: input.visualHeartbeat.watchMode,
    })
    const inquiryLoop = buildInquiryLoop({
      now: input.now,
      context: input.context,
      scene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      appraisal,
      beliefLedger,
      relationshipModel,
      previous: input.previousVisualPresenceState.inquiryLoop ?? null,
    })
    const beliefRevision = buildBeliefRevision({
      now: input.now,
      worldModel: governedWorldModel,
      beliefLedger,
      relationshipModel,
      previous: input.previousVisualPresenceState.beliefRevision ?? null,
    })
    const hypothesisGraph = buildHypothesisGraph({
      now: input.now,
      context: input.context,
      watchMode: input.visualHeartbeat.watchMode,
      scene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      beliefLedger,
      beliefRevision,
      inquiryLoop,
      relationshipModel,
      recentTransition: input.visualHeartbeat.recentTransition,
      durabilityPulse: input.durabilityPulse,
      previous: input.previousVisualPresenceState.hypothesisGraph ?? null,
    })
    const livingWorldStateRaw = buildLivingWorldState({
      now: input.now,
      context: input.context,
      watchMode: input.visualHeartbeat.watchMode,
      scene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      entityWorld,
      recentTransition: input.visualHeartbeat.recentTransition,
      durabilityPulse: input.durabilityPulse,
      previous: input.previousVisualPresenceState.livingWorldState ?? null,
    })
    const livingWorldState = stabilizeMindStateInvariants({
      now: input.now,
      watchMode: input.visualHeartbeat.watchMode,
      currentScene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      livingWorldState: livingWorldStateRaw,
      relationshipModel,
      selfGovernor: null,
      thoughtThreads: null,
      privateThought: input.previousVisualPresenceState.privateThought ?? null,
    }).livingWorldState ?? livingWorldStateRaw
    const worldOntology = buildWorldOntology({
      now: input.now,
      scene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      beliefLedger,
      beliefRevision,
      hypothesisGraph,
      livingWorldState,
      workingMemoryEpisodes: input.previousVisualPresenceState.workingMemoryEpisodes,
    })
    const selfState = buildSelfState({
      context: input.context,
      worldModel: governedWorldModel,
      appraisal,
      concerns,
      watchMode: input.visualHeartbeat.watchMode,
      beliefLedger,
      beliefRevision,
      relationshipModel,
      goalStack,
      selfContinuity,
      inquiryLoop,
    })
    const deliberationState = buildDeliberationState({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      beliefLedger,
      beliefRevision,
      relationshipModel,
      inquiryLoop,
      concerns,
      goalStack,
      selfState,
      recentTransition: input.visualHeartbeat.recentTransition,
      previous: input.previousVisualPresenceState.deliberationState ?? null,
    })
    const threadRuntime = buildThreadRuntime({
      now: input.now,
      context: input.context,
      hypothesisGraph,
      deliberationState,
      previous: input.previousVisualPresenceState.threadRuntime ?? null,
    })
    const commitmentLedger = buildCommitmentLedger({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      beliefLedger,
      beliefRevision,
      hypothesisGraph,
      relationshipModel,
      threadRuntime,
      previousPrivateThought: input.previousVisualPresenceState.privateThought ?? null,
      previous: input.previousVisualPresenceState.commitmentLedger ?? null,
      dialogueSemantics: dialogueSemantics ?? undefined,
    })
    const inquiryPlanner = buildInquiryPlanner({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      commitmentLedger,
      beliefRevision,
      threadRuntime,
      recentTransition: input.visualHeartbeat.recentTransition,
      previous: input.previousVisualPresenceState.inquiryPlanner ?? null,
    })
    const concernContinuity = buildConcernContinuityLedger({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      concerns,
      commitmentLedger,
      inquiryPlanner,
      previous: input.previousVisualPresenceState.concernContinuity ?? null,
    })
    const repairLedgerRuntimeSurface = buildAlicizationProvisionalDigitalLifeRuntimeSurface({
      now: input.now,
      previousVisualPresenceState: input.previousVisualPresenceState,
      visualHeartbeat: input.visualHeartbeat,
      attention: input.attention,
      worldModel: governedWorldModel,
      surfaceOverrides: {
        world: {
          worldOntology,
          relationshipModel,
        },
        cognition: {
          beliefLedger,
          beliefRevision,
          hypothesisGraph,
        },
        memory: {
          commitmentLedger,
          inquiryPlanner,
          concernContinuity,
        },
      },
    })
    const repairLedger = buildRepairLedger({
      now: input.now,
      context: input.context,
      currentScene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      worldOntology,
      beliefLedger,
      beliefRevision,
      hypothesisGraph,
      commitmentLedger,
      inquiryPlanner,
      concernContinuity,
      runtimeSurface: repairLedgerRuntimeSurface,
      previous: input.previousVisualPresenceState.repairLedger ?? null,
    })
    const mindDynamics = buildMindDynamics({
      now: input.now,
      context: input.context,
      watchMode: input.visualHeartbeat.watchMode,
      worldModel: governedWorldModel,
      appraisal,
      subjectiveInference,
      concerns,
      selfState,
      beliefLedger,
      beliefRevision,
      hypothesisGraph,
      relationshipModel,
      selfContinuity,
      goalStack,
      commitmentLedger,
      inquiryPlanner,
      threadRuntime,
      previousDesireMemory: input.previousVisualPresenceState.desireMemory ?? null,
    })
    const selfGovernorRaw = buildSelfGovernor({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      livingWorldState,
      selfContinuity,
      relationshipModel,
      goalStack,
      beliefRevision,
      commitmentLedger,
      inquiryPlanner,
      mindDynamics,
      previous: input.previousVisualPresenceState.selfGovernor ?? null,
    })
    const selfGovernor = stabilizeMindStateInvariants({
      now: input.now,
      watchMode: input.visualHeartbeat.watchMode,
      currentScene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      livingWorldState,
      relationshipModel,
      selfGovernor: selfGovernorRaw,
      thoughtThreads: null,
      privateThought: input.previousVisualPresenceState.privateThought ?? null,
    }).selfGovernor ?? selfGovernorRaw
    const mindKernel = buildMindKernel({
      now: input.now,
      worldModel: governedWorldModel,
      mindDynamics,
      commitmentLedger,
      inquiryPlanner,
      beliefRevision,
      hypothesisGraph,
      relationshipModel,
      selfContinuity,
      selfState,
      selfGovernor,
      threadRuntime,
      previous: input.previousVisualPresenceState.mindKernel ?? null,
    })
    const thoughtThreadsRaw = buildThoughtThreads({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      livingWorldState,
      selfGovernor,
      beliefLedger,
      inquiryLoop,
      commitmentLedger,
      relationshipModel,
      previous: input.previousVisualPresenceState.thoughtThreads ?? null,
    })
    const stabilizedMindSlices = stabilizeMindStateInvariants({
      now: input.now,
      watchMode: input.visualHeartbeat.watchMode,
      currentScene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      livingWorldState,
      relationshipModel,
      selfGovernor,
      thoughtThreads: thoughtThreadsRaw,
      privateThought: input.previousVisualPresenceState.privateThought ?? null,
    })
    const stabilizedLivingWorldState = stabilizedMindSlices.livingWorldState ?? livingWorldState
    const stabilizedSelfGovernor = stabilizedMindSlices.selfGovernor ?? selfGovernor
    const thoughtThreads = stabilizedMindSlices.thoughtThreads ?? thoughtThreadsRaw
    const intentionStream = buildIntentionStream({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      concernContinuity,
      repairLedger,
      commitmentLedger,
      inquiryPlanner,
      relationshipModel,
      selfGovernor: stabilizedSelfGovernor,
      thoughtThreads,
      mindKernel,
      autobiographicalSelf: previousAutobiographicalSelf,
      motiveEngine: seedMotiveEngine,
      goalStack,
      desireMemory: input.previousVisualPresenceState.desireMemory ?? null,
      previous: input.previousVisualPresenceState.intentionStream ?? null,
    })
    const reflectionLedger = buildReflectionLedger({
      now: input.now,
      worldModel: governedWorldModel,
      repairLedger,
      intentionStream,
      previousIntentionStream: input.previousVisualPresenceState.intentionStream ?? null,
      previousAnswerPlanner: input.previousVisualPresenceState.answerPlanner ?? null,
      persistedEntries: persistedReflectionEntries,
      previous: previousReflectionLedger,
    })
    const provisionalAutobiographicalSelf = buildAutobiographicalSelf({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      relationshipModel,
      longHorizonMemory,
      selfContinuity,
      selfState,
      goalStack,
      reflectionLedger,
      recentRelationshipOutcomes,
      recentMemoryReflections,
      desireMemory: input.previousVisualPresenceState.desireMemory ?? null,
      recentReinforcementEvents,
      previous: previousAutobiographicalSelf,
    })
    const motiveEngine = buildMotiveEngine({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      appraisal,
      recentTransition: input.visualHeartbeat.recentTransition,
      goalStack,
      longHorizonMemory,
      selfContinuity,
      autobiographicalSelf: provisionalAutobiographicalSelf,
      recentMemoryConsolidations,
      reflectionLedger,
      previous: previousMotiveEngine,
    })
    const habitPolicy = buildHabitPolicy({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      relationshipModel,
      selfContinuity,
      autobiographicalSelf: provisionalAutobiographicalSelf,
      recentMemoryConsolidations,
      reflectionLedger,
      motiveEngine,
      previous: previousHabitPolicy,
    })
    const executiveCycle = buildExecutiveCycle({
      now: input.now,
      worldModel: governedWorldModel,
      repairLedger,
      intentionStream,
      reflectionLedger,
      mindKernel,
      previous: input.previousVisualPresenceState.executiveCycle ?? null,
    })
    const counterfactualDeliberation = buildCounterfactualDeliberation({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      appraisal,
      subjectiveInference,
      concerns,
      selfState,
      beliefRevision,
      relationshipModel,
      selfGovernor: stabilizedSelfGovernor,
      goalStack,
      commitmentLedger,
      thoughtThreads,
      threadRuntime,
      mindDynamics,
      mindKernel,
      previous: input.previousVisualPresenceState.counterfactualDeliberation ?? null,
    })
    const actionEcology = buildActionEcology({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      beliefRevision,
      relationshipModel,
      deliberationState,
      threadRuntime,
      selfState,
      selfGovernor: stabilizedSelfGovernor,
      thoughtThreads,
      mindDynamics,
      commitmentLedger,
      inquiryPlanner,
      mindKernel,
      counterfactualDeliberation,
    })
    const initiativeArbitration = buildInitiativeArbitration({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      worldOntology,
      concerns,
      selfState,
      mindDynamics,
      relationshipModel,
      selfContinuity,
      selfGovernor: stabilizedSelfGovernor,
      thoughtThreads,
      threadRuntime,
      commitmentLedger,
      counterfactualDeliberation,
      desireMemory: input.previousVisualPresenceState.desireMemory ?? null,
      autobiographicalSelf: provisionalAutobiographicalSelf,
      motiveEngine,
      habitPolicy,
    })
    const initiativeBase = buildInitiativeSnapshot({
      context: input.context,
      watchMode: input.visualHeartbeat.watchMode,
      worldModel: governedWorldModel,
      worldOntology,
      appraisal,
      concerns,
      selfState,
      beliefLedger,
      hypothesisGraph,
      relationshipModel,
      inquiryLoop,
      mindDynamics,
      commitmentLedger,
      inquiryPlanner,
      mindKernel,
      selfGovernor: stabilizedSelfGovernor,
      thoughtThreads,
      deliberationState,
      threadRuntime,
      actionEcology,
      counterfactualDeliberation,
      goalStack,
      selfContinuity,
      previousDesireMemory: input.previousVisualPresenceState.desireMemory ?? null,
      initiativeArbitration,
      intentionStream,
      reflectionLedger,
      executiveCycle,
      autobiographicalSelf: provisionalAutobiographicalSelf,
      motiveEngine,
      habitPolicy,
    })
    const desireMemory = buildDesireMemory({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      entityWorld,
      goalStack,
      selfContinuity,
      appraisal,
      initiative: initiativeBase,
      commitmentLedger,
      deliberationState,
      actionEcology,
      motiveEngine,
      habitPolicy,
      previous: input.previousVisualPresenceState.desireMemory ?? null,
      recentTransition: input.visualHeartbeat.recentTransition,
    })
    const autonomy = buildAutonomySnapshot({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      concerns,
      goalStack,
      desireMemory,
      initiative: initiativeBase,
      initiativeArbitration,
      executiveCycle,
      actionEcology,
      autobiographicalSelf: provisionalAutobiographicalSelf,
      motiveEngine,
      habitPolicy,
      threadRuntime,
      thoughtThreads,
    })
    const initiative = {
      ...initiativeBase,
      selectedAction: autonomy.visibleAction,
      confidence: Math.max(initiativeBase.confidence, autonomy.confidence),
      shouldSurface: autonomy.shouldSurface,
      shouldSpeak: autonomy.shouldSpeak,
      why: autonomy.whyNow,
    }
    const provisionalMindEcology = buildMindEcology({
      now: input.now,
      context: input.context,
      watchMode: input.visualHeartbeat.watchMode,
      worldModel: governedWorldModel,
      appraisal,
      subjectiveInference,
      beliefRevision,
      relationshipModel,
      longHorizonMemory,
      selfContinuity,
      selfState,
      selfGovernor: stabilizedSelfGovernor,
      mindDynamics,
      mindKernel,
      commitmentLedger,
      inquiryPlanner,
      reflectionLedger,
      desireMemory,
      actionEcology,
      autobiographicalSelf: provisionalAutobiographicalSelf,
      motiveEngine,
      habitPolicy,
    })
    const privateThought = buildPrivateThoughtLoop({
      now: input.now,
      context: input.context,
      watchMode: input.visualHeartbeat.watchMode,
      currentScene: input.visualHeartbeat.scene,
      attention: input.attention,
      recentTransition: input.visualHeartbeat.recentTransition,
      worldModel: governedWorldModel,
      entityWorld,
      livingWorldState: stabilizedLivingWorldState,
      beliefLedger,
      hypothesisGraph,
      deliberationState,
      threadRuntime,
      actionEcology,
      worldOntology,
      initiativeArbitration,
      appraisal,
      goalStack,
      concerns,
      concernContinuity,
      relationshipModel,
      selfContinuity,
      autobiographicalSelf: provisionalAutobiographicalSelf,
      motiveEngine,
      habitPolicy,
      selfState,
      selfGovernor: stabilizedSelfGovernor,
      inquiryLoop,
      mindDynamics,
      commitmentLedger,
      inquiryPlanner,
      repairLedger,
      mindKernel,
      thoughtThreads,
      counterfactualDeliberation,
      initiative,
      autonomy,
      desireMemory,
      mindEcology: provisionalMindEcology,
      durabilityPulse: input.durabilityPulse,
      previousPrivateThought: input.previousVisualPresenceState.privateThought ?? null,
      intentionStream,
      reflectionLedger,
      executiveCycle,
    })
    const dialogueEncounterRuntimeSurface = dialogueSemantics
      ? buildAlicizationProvisionalDigitalLifeRuntimeSurface({
          now: input.now,
          previousVisualPresenceState: input.previousVisualPresenceState,
          visualHeartbeat: input.visualHeartbeat,
          attention: input.attention,
          worldModel: governedWorldModel,
          appraisal,
          subjectiveInference,
          surfaceOverrides: {
            cognition: {
              privateThought,
            },
            memory: {
              repairLedger,
            },
          },
        })
      : null
    const dialogueEncounter = dialogueSemantics
      ? buildDialogueTurnEncounter({
          semantics: dialogueSemantics,
          context: input.context,
          currentScene: input.visualHeartbeat.scene,
          worldModel: governedWorldModel,
          repairLedger,
          privateThought,
          inspectionRequested: input.inspectionRequested === true,
          inspectionState: input.inspectionState ?? (input.inspectionRequested ? 'inspection-live' : 'dialogue-first'),
          releaseInspectionCarry: input.inspectionState === 'dialogue-first',
          ingressHint: input.turnOwnershipHint ?? null,
          runtimeSurface: dialogueEncounterRuntimeSurface,
        })
      : null
    const dialogueObligation = dialogueEncounter?.obligation ?? null
    const dialogueTurnOwnership = dialogueEncounter?.ownership ?? null
    const dialogueFocus = dialogueEncounter?.focus ?? null
    const discourseStateRuntimeSurface = dialogueSemantics
      ? buildAlicizationProvisionalDigitalLifeRuntimeSurface({
          now: input.now,
          previousVisualPresenceState: input.previousVisualPresenceState,
          visualHeartbeat: input.visualHeartbeat,
          attention: input.attention,
          worldModel: governedWorldModel,
          appraisal,
          subjectiveInference,
          surfaceOverrides: {
            world: {
              relationshipModel,
            },
            memory: {
              repairLedger,
              reflectionLedger,
            },
            dialogue: {
              dialogueEncounter,
            },
          },
        })
      : null
    const discourseState = dialogueSemantics
      ? buildDiscourseState({
          now: input.now,
          userText: input.userText,
          dialogueEncounter,
          dialogueSemantics,
          dialogueObligation,
          dialogueFocus,
          ownership: dialogueTurnOwnership,
          inspectionRequested: dialogueTurnOwnership?.inspectionRequested ?? (input.inspectionRequested === true),
          worldModel: governedWorldModel,
          relationshipModel,
          repairLedger,
          reflectionLedger,
          previous: input.previousVisualPresenceState.discourseState ?? null,
          runtimeSurface: discourseStateRuntimeSurface,
        })
      : null
    const conversationStateRuntimeSurface = discourseState
      ? buildAlicizationProvisionalDigitalLifeRuntimeSurface({
          now: input.now,
          previousVisualPresenceState: input.previousVisualPresenceState,
          visualHeartbeat: input.visualHeartbeat,
          attention: input.attention,
          worldModel: governedWorldModel,
          appraisal,
          subjectiveInference,
          surfaceOverrides: {
            world: {
              relationshipModel,
            },
            cognition: {
              privateThought,
            },
            memory: {
              commitmentLedger,
              repairLedger,
              reflectionLedger,
            },
            dialogue: {
              dialogueEncounter,
              discourseState,
            },
          },
        })
      : null
    const conversationState = discourseState
      ? buildConversationState({
          now: input.now,
          userText: input.userText,
          dialogueEncounter,
          dialogueSemantics,
          dialogueObligation,
          dialogueFocus,
          discourseState,
          currentScene: input.visualHeartbeat.scene,
          worldModel: governedWorldModel,
          relationshipModel,
          commitmentLedger,
          repairLedger,
          reflectionLedger,
          privateThought,
          previous: input.previousVisualPresenceState.conversationState ?? null,
          runtimeSurface: conversationStateRuntimeSurface,
        })
      : null
    const autobiographicalSelf = buildAutobiographicalSelf({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      relationshipModel,
      longHorizonMemory,
      selfContinuity,
      selfState,
      goalStack,
      reflectionLedger,
      desireMemory,
      actionEcology,
      privateThought,
      mindEcology: provisionalMindEcology,
      recentMemoryConsolidations,
      recentReinforcementEvents,
      previous: previousAutobiographicalSelf,
    })
    const mindEcology = buildMindEcology({
      now: input.now,
      context: input.context,
      watchMode: input.visualHeartbeat.watchMode,
      worldModel: governedWorldModel,
      appraisal,
      subjectiveInference,
      beliefRevision,
      relationshipModel,
      longHorizonMemory,
      selfContinuity,
      selfState,
      motiveEngine,
      habitPolicy,
      selfGovernor: stabilizedSelfGovernor,
      mindDynamics,
      mindKernel,
      commitmentLedger,
      inquiryPlanner,
      reflectionLedger,
      desireMemory,
      privateThought,
      actionEcology,
      conversationState,
      autobiographicalSelf,
    })
    const dialogueWorldThreadSettlementRuntimeSurface = conversationState || discourseState
      ? buildAlicizationProvisionalDigitalLifeRuntimeSurface({
          now: input.now,
          previousVisualPresenceState: input.previousVisualPresenceState,
          visualHeartbeat: input.visualHeartbeat,
          attention: input.attention,
          worldModel: governedWorldModel,
          appraisal,
          subjectiveInference,
          surfaceOverrides: {
            dialogue: {
              discourseState,
              conversationState,
            },
          },
        })
      : null
    const settledDialogueWorldThread = input.userText
      ? settleDialogueWorldThreadOnUserTurn({
          now: input.now,
          previous: input.previousVisualPresenceState.dialogueWorldThread ?? null,
          userText: input.userText,
          conversationState,
          discourseState,
          runtimeSurface: dialogueWorldThreadSettlementRuntimeSurface,
        })
      : input.previousVisualPresenceState.dialogueWorldThread ?? null
    const mindSynthesis = discourseState
      ? buildMindSynthesis({
          now: input.now,
          discourseState,
          conversationState,
          worldModel: governedWorldModel,
          subjectiveInference,
          appraisal,
          dialogueEncounter,
          concernContinuity,
          commitmentLedger,
          repairLedger,
          reflectionLedger,
          relationshipModel,
          privateThought,
          desireMemory,
          autobiographicalSelf,
          motiveEngine,
          habitPolicy,
          mindEcology,
          selfState,
          selfContinuity,
        })
      : null
    const answerCompilerRuntimeSurface = discourseState && mindSynthesis
      ? buildAlicizationProvisionalDigitalLifeRuntimeSurface({
          now: input.now,
          previousVisualPresenceState: input.previousVisualPresenceState,
          visualHeartbeat: input.visualHeartbeat,
          attention: input.attention,
          worldModel: governedWorldModel,
          appraisal,
          subjectiveInference,
          surfaceOverrides: {
            world: {
              worldOntology,
              relationshipModel,
            },
            cognition: {
              privateThought,
            },
            memory: {
              repairLedger,
            },
            dialogue: {
              discourseState,
              dialogueEncounter,
              mindSynthesis,
              conversationState,
            },
          },
        })
      : null
    const answerCompiler = discourseState && mindSynthesis
      ? buildAnswerCompiler({
          now: input.now,
          discourseState,
          conversationState,
          dialogueEncounter,
          mindSynthesis,
          currentScene: input.visualHeartbeat.scene,
          worldModel: governedWorldModel,
          worldOntology,
          relationshipModel,
          repairLedger,
          privateThought,
          runtimeSurface: answerCompilerRuntimeSurface,
          groundedThisTurn: input.groundedThisTurn === true,
        })
      : null
    const currentConsciousFrameRuntimeSurface = discourseState && answerCompiler
      ? buildAlicizationProvisionalDigitalLifeRuntimeSurface({
          now: input.now,
          previousVisualPresenceState: input.previousVisualPresenceState,
          visualHeartbeat: input.visualHeartbeat,
          attention: input.attention,
          worldModel: governedWorldModel,
          appraisal,
          subjectiveInference,
          surfaceOverrides: {
            world: {
              worldOntology,
              relationshipModel,
            },
            cognition: {
              privateThought,
            },
            memory: {
              desireMemory,
            },
            dialogue: {
              discourseState,
              dialogueEncounter,
              mindSynthesis,
              conversationState,
              answerCompiler,
            },
            agency: {
              initiative,
            },
          },
        })
      : null
    const currentConsciousFrame = discourseState && answerCompiler
      ? buildCurrentConsciousFrame({
          now: input.now,
          discourseState,
          conversationState,
          dialogueEncounter,
          mindSynthesis,
          answerCompiler,
          privateThought,
          initiative,
          desireMemory,
          runtimeSurface: currentConsciousFrameRuntimeSurface,
        })
      : null
    const claimEvidenceLedgerRuntimeSurface = discourseState && answerCompiler
      ? buildAlicizationProvisionalDigitalLifeRuntimeSurface({
          now: input.now,
          previousVisualPresenceState: input.previousVisualPresenceState,
          visualHeartbeat: input.visualHeartbeat,
          attention: input.attention,
          worldModel: governedWorldModel,
          appraisal,
          subjectiveInference,
          surfaceOverrides: {
            world: {
              worldOntology,
            },
            dialogue: {
              discourseState,
              dialogueEncounter,
              conversationState,
              answerCompiler,
              currentConsciousFrame,
            },
          },
        })
      : null
    const claimEvidenceLedger = discourseState && answerCompiler
      ? buildClaimEvidenceLedger({
          now: input.now,
          discourseState,
          conversationState,
          dialogueEncounter,
          answerCompiler,
          currentConsciousFrame,
          currentScene: input.visualHeartbeat.scene,
          runtimeSurface: claimEvidenceLedgerRuntimeSurface,
        })
      : null
    const replyDeliberationRuntimeSurface = discourseState && mindSynthesis && answerCompiler
      ? buildAlicizationProvisionalDigitalLifeRuntimeSurface({
          now: input.now,
          previousVisualPresenceState: input.previousVisualPresenceState,
          visualHeartbeat: input.visualHeartbeat,
          attention: input.attention,
          worldModel: governedWorldModel,
          appraisal,
          subjectiveInference,
          surfaceOverrides: {
            cognition: {
              privateThought,
            },
            dialogue: {
              discourseState,
              dialogueEncounter,
              mindSynthesis,
              conversationState,
              answerCompiler,
              currentConsciousFrame,
              claimEvidenceLedger,
            },
          },
        })
      : null
    const replyDeliberation = discourseState && mindSynthesis && answerCompiler
      ? buildReplyDeliberation({
          now: input.now,
          conversationState,
          discourseState,
          mindSynthesis,
          answerCompiler,
          currentConsciousFrame,
          claimEvidenceLedger,
          privateThought,
          worldModel: governedWorldModel,
          dialogueEncounter,
          runtimeSurface: replyDeliberationRuntimeSurface,
        })
      : null
    const dialogueWorldThreadRuntimeSurface = buildAlicizationProvisionalDigitalLifeRuntimeSurface({
      now: input.now,
      previousVisualPresenceState: input.previousVisualPresenceState,
      visualHeartbeat: input.visualHeartbeat,
      attention: input.attention,
      worldModel: governedWorldModel,
      appraisal,
      subjectiveInference,
      surfaceOverrides: {
        cognition: {
          privateThought,
        },
        dialogue: {
          discourseState,
          mindSynthesis,
          conversationState: conversationState ?? input.previousVisualPresenceState.conversationState ?? null,
          dialogueWorldThread: settledDialogueWorldThread,
          answerCompiler,
          replyDeliberation,
        },
      },
    })
    const dialogueWorldThread = buildDialogueWorldThread({
      now: input.now,
      conversationState: conversationState ?? input.previousVisualPresenceState.conversationState ?? null,
      discourseState,
      mindSynthesis,
      worldModel: governedWorldModel,
      replyDeliberation,
      answerCompiler,
      privateThought,
      previous: settledDialogueWorldThread,
      runtimeSurface: dialogueWorldThreadRuntimeSurface,
    })
    const sceneSnapshot = input.visualHeartbeat.scene
    const recallGovernor = buildRecallGovernor({
      now: input.now,
      userText: input.userText,
      dialogueWorldThread,
      conversationState: conversationState ?? input.previousVisualPresenceState.conversationState ?? null,
      answerCompiler,
      replyDeliberation,
      privateThought,
      dialogueEncounter,
      autobiographicalSelf,
      longHorizonMemory,
      goalStack,
      desireMemory,
      motiveEngine,
      mindEcology,
      sceneContext: {
        cueSummary: sanitizeBriefText(
          sceneSnapshot?.summary
            ?? governedWorldModel.activeThread?.summary
            ?? '',
          180,
        ) || null,
        appName: sanitizeBriefText(
          governedWorldModel.focusTarget?.appName
            ?? governedWorldModel.activeThread?.target?.appName
            ?? sceneSnapshot?.target?.appName
            ?? '',
          64,
        ) || null,
        processName: sanitizeBriefText(
          governedWorldModel.focusTarget?.processName
            ?? governedWorldModel.activeThread?.target?.processName
            ?? sceneSnapshot?.target?.processName
            ?? '',
          64,
        ) || null,
        targetTitle: sanitizeBriefText(
          governedWorldModel.focusTarget?.title
            ?? governedWorldModel.activeThread?.target?.title
            ?? sceneSnapshot?.target?.title
            ?? '',
          160,
        ) || null,
        scenario: sceneSnapshot?.scenario ?? null,
        workloadKind: sceneSnapshot?.workloadKind ?? null,
        contentKind: sceneSnapshot?.contentKind ?? null,
      },
    })
    const answerPlannerRuntimeSurface = buildAlicizationProvisionalDigitalLifeRuntimeSurface({
      now: input.now,
      previousVisualPresenceState: input.previousVisualPresenceState,
      visualHeartbeat: input.visualHeartbeat,
      attention: input.attention,
      worldModel: governedWorldModel,
      appraisal,
      subjectiveInference,
      surfaceOverrides: {
        world: {
          worldOntology,
          relationshipModel,
        },
        cognition: {
          privateThought,
          mindKernel,
        },
        memory: {
          concernContinuity,
          repairLedger,
          commitmentLedger,
          inquiryPlanner,
          intentionStream,
          reflectionLedger,
          executiveCycle,
        },
        dialogue: {
          discourseState,
          dialogueEncounter,
          mindSynthesis,
          conversationState,
          dialogueWorldThread,
          answerCompiler,
          replyDeliberation,
        },
      },
    })
    const answerPlanner = buildAnswerPlanner({
      now: input.now,
      context: input.context,
      currentScene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      worldOntology,
      concernContinuity,
      repairLedger,
      commitmentLedger,
      inquiryPlanner,
      relationshipModel,
      privateThought,
      mindKernel,
      intentionStream,
      reflectionLedger,
      executiveCycle,
      inspectionRequested: dialogueTurnOwnership?.inspectionRequested ?? (input.inspectionRequested === true),
      dialogueEncounter: dialogueEncounter ?? null,
      ownership: dialogueTurnOwnership ?? null,
      dialogueSemantics: dialogueSemantics ?? undefined,
      dialogueObligation: dialogueObligation ?? undefined,
      dialogueFocus: dialogueFocus ?? undefined,
      discourseState: discourseState ?? undefined,
      mindSynthesis: mindSynthesis ?? undefined,
      conversationState: conversationState ?? undefined,
      dialogueWorldThread: dialogueWorldThread ?? undefined,
      answerCompiler: answerCompiler ?? undefined,
      replyDeliberation: replyDeliberation ?? undefined,
      runtimeSurface: answerPlannerRuntimeSurface,
      groundedThisTurn: input.groundedThisTurn === true,
    })
    const dialogueActKernelRuntimeSurface = buildAlicizationProvisionalDigitalLifeRuntimeSurface({
      now: input.now,
      previousVisualPresenceState: input.previousVisualPresenceState,
      visualHeartbeat: input.visualHeartbeat,
      attention: input.attention,
      worldModel: governedWorldModel,
      appraisal,
      subjectiveInference,
      surfaceOverrides: {
        cognition: {
          privateThought,
        },
        dialogue: {
          discourseState,
          conversationState,
          dialogueWorldThread,
          answerCompiler,
          replyDeliberation,
          answerPlanner,
        },
      },
    })
    const dialogueActKernel = buildDialogueActKernel({
      now: input.now,
      currentScene: input.visualHeartbeat.scene,
      appraisal,
      discourseState: discourseState ?? undefined,
      conversationState: conversationState ?? undefined,
      dialogueWorldThread: dialogueWorldThread ?? undefined,
      answerCompiler: answerCompiler ?? undefined,
      replyDeliberation: replyDeliberation ?? undefined,
      answerPlanner,
      privateThought,
      worldModel: governedWorldModel,
      runtimeSurface: dialogueActKernelRuntimeSurface,
    })
    const mindTurnFrameRuntimeSurface = buildAlicizationProvisionalDigitalLifeRuntimeSurface({
      now: input.now,
      previousVisualPresenceState: input.previousVisualPresenceState,
      visualHeartbeat: input.visualHeartbeat,
      attention: input.attention,
      worldModel: governedWorldModel,
      appraisal,
      subjectiveInference,
      surfaceOverrides: {
        cognition: {
          privateThought,
          mindKernel,
        },
        memory: {
          recallGovernor,
        },
        dialogue: {
          mindSynthesis,
          conversationState,
          dialogueWorldThread,
          dialogueActKernel,
          answerCompiler,
          answerPlanner,
          replyDeliberation,
        },
        agency: {
          selfGovernor: stabilizedSelfGovernor,
        },
      },
    })
    const mindTurnFrame = buildMindTurnFrame({
      now: input.now,
      currentScene: input.visualHeartbeat.scene,
      worldModel: governedWorldModel,
      appraisal,
      mindSynthesis,
      conversationState,
      dialogueWorldThread,
      dialogueActKernel,
      answerCompiler,
      answerPlanner,
      replyDeliberation,
      recallGovernor,
      privateThought,
      mindMode: mindKernel.dominantMode,
      dominantDrive: stabilizedSelfGovernor.dominantDrive,
      runtimeSurface: mindTurnFrameRuntimeSurface,
    })

    return {
      dialogueEncounter,
      dialogueSemantics,
      dialogueObligation,
      dialogueFocus,
      discourseState,
      mindSynthesis,
      mindTurnFrame,
      dialogueActKernel,
      answerCompiler,
      worldModel: governedWorldModel,
      worldOntology,
      entityWorld,
      livingWorldState: stabilizedLivingWorldState,
      subjectiveInference,
      appraisal,
      beliefLedger,
      beliefRevision,
      hypothesisGraph,
      goalStack,
      concerns,
      concernContinuity,
      relationshipModel,
      longHorizonMemory,
      selfContinuity,
      selfState,
      motiveEngine,
      habitPolicy,
      selfGovernor: stabilizedSelfGovernor,
      inquiryLoop,
      deliberationState,
      threadRuntime,
      commitmentLedger,
      inquiryPlanner,
      repairLedger,
      intentionStream,
      reflectionLedger,
      executiveCycle,
      mindDynamics,
      mindKernel,
      conversationState,
      dialogueWorldThread,
      replyDeliberation,
      recallGovernor,
      thoughtThreads,
      counterfactualDeliberation,
      actionEcology,
      initiativeArbitration,
      initiative,
      autonomy,
      desireMemory,
      mindEcology,
      currentConsciousFrame,
      claimEvidenceLedger,
      answerPlanner,
      privateThought,
    }
  }

  return {
    buildMindAttentionSignature,
    buildMindSceneSignature,
    buildDigitalLifeMindState,
  }
}
