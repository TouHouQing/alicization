import type {
  AlicizationChannelCapability,
  AlicizationExecutionCapabilityChannel,
  AlicizationExecutionCapabilityInquiry,
  AlicizationExecutionRoutingIntent,
  AlicizationPersonaKernelSnapshot,
} from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationChatStartPayload,
  AlicizationMindTurnContractSnapshot,
  AlicizationMindTurnGovernance,
  AlicizationRecallGovernorSnapshot,
  AlicizationSensoryCacheSnapshot,
  AlicizationSensoryCaptureHealth,
  AlicizationSensoryCapturePermission,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type {
  AlicizationAgentSessionContinuityInput,
  AlicizationAgentTurnRuntime,
} from './agent-runtime'
import type {
  AlicizationDialogueSessionManager,
  AlicizationDialogueSessionMirror,
} from './dialogue-session-manager'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type {
  AlicizationExecutionCallbackContext,
} from './execution-callback-runtime'
import type { AlicizationMainChatActionObligation } from './main-chat-action-obligation'
import type { AlicizationMainChatExecutionReplyObligation } from './main-chat-execution-reply-obligation'
import type {
  BuildMainGatewayToolsOptions,
  MainGatewayExecutionToolContext,
} from './main-chat-execution-surface'
import type { AlicizationMainChatRuntimeSurface } from './main-chat-runtime-surface'
import type { AlicizationExecutionLedgerContext } from './memory-ledger-runtime'
import type { AlicizationMemoryRetrievalBudgetClass } from './memory-retrieval-telemetry'
import type { AlicizationRuntimeCallChainSnapshot } from './runtime-call-chain'
import type {
  MainGatewayResolvedConfig,
  OrganicMemoryPromptContext,
  PreparedMainChatExecution,
  ResolvedCardCustomDirectives,
} from './runtime-soul'
import {
  emptyAlicizationExecutionCallbackContext,
} from './execution-callback-runtime'
import {
  emptyAlicizationExecutionLedgerContext,
} from './memory-ledger-runtime'
import {
  buildAlicizationDialogueMemoryCarrySystemBlock,
  deriveAlicizationDialogueMemoryCarryPolicy,
} from './dialogue-memory-governor'
import { createAlicizationDialogueSessionManager } from './dialogue-session-manager'
import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'
import { buildMainChatActionObligationSystemBlock } from './main-chat-action-obligation'
import {
  applyMainChatExecutionReplyObligationToGovernance,
  buildMainChatExecutionReplyObligationSystemBlock,
  deriveMainChatExecutionReplyObligation,
} from './main-chat-execution-reply-obligation'
import {
  buildExecutionCapabilitySystemBlocks,
  buildExecutionRoutingEnforcementSystemBlock,
  buildMainGatewayExecutionRoutingToolChoice,
  buildMainGatewayTools,
} from './main-chat-execution-surface'
import {
  buildAlicizationMainChatRuntimeSurface,
  type AlicizationMainChatReplyAuthoritySurface,
  type AlicizationMainChatReplyExecutionPlanSurface,
  shouldUseDialogueFirstLivingPromptMode,
} from './main-chat-runtime-surface'
import {
  buildMemoryAnswerAnchorTag,
  buildMemoryLatentBoundaryTag,
  buildMemoryOpeningStrategyTag,
} from './memory-deliberation-latent-controls'
import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'
import { buildMindEcologyFromRuntimeSurface } from './mind-ecology'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import { buildRecollectionSpeechVisibleSurfaceRules } from './response-surface-contract'

export interface AlicizationMainChatPerceptionAugmentation {
  messages: Message[]
  systemBlocks: string[]
  promptSystemBlocks: string[]
  digitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  memoryRecallSeed: string
  recallGovernor: AlicizationRecallGovernorSnapshot | null | undefined
  capture: {
    inspectionRequested: boolean
    groundedThisTurn: boolean
    snapshot: {
      degradedReasons: string[]
      health: AlicizationSensoryCaptureHealth
      permission: AlicizationSensoryCapturePermission
    } | null
    fallbackReason: string | null
  }
  chatGovernance: {
    suppressAssociativeRecall: boolean
    turnMode: AlicizationMindTurnGovernance['turnMode']
    personaKernelMode: AlicizationMindTurnGovernance['personaKernelMode']
    mindTurnContract: AlicizationMindTurnContractSnapshot | null
    mindTurnGovernance: AlicizationMindTurnGovernance | null
  }
}

export interface AlicizationPreparedMainChatPrelude {
  actionObligation: AlicizationMainChatActionObligation
  chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']>
  messages: Message[]
  contextualStringPromise: Promise<string>
  executionCallbackContextPromise: Promise<AlicizationExecutionCallbackContext>
  executionLedgerContextPromise: Promise<AlicizationExecutionLedgerContext>
  executionCapabilityInquiry: AlicizationExecutionCapabilityInquiry
  executionRoutingIntent: AlicizationExecutionRoutingIntent | null
  perceptionAugmentation: AlicizationMainChatPerceptionAugmentation
}

export interface AlicizationPreparedMainChatExecutionResult extends PreparedMainChatExecution {
  conversationSessionId: string | null
  getSessionTrace: () => AlicizationRuntimeCallChainSnapshot
  mindTurnContract: AlicizationMindTurnContractSnapshot | null
  organicMemoryContext?: OrganicMemoryPromptContext
  personaKernel: AlicizationPersonaKernelSnapshot | null
  performanceManifest: CharacterPerformanceCapabilitiesManifest | null
  replyRealization: AlicizationMainChatReplyAuthoritySurface | null
  replyExecutionPlan: AlicizationMainChatReplyExecutionPlanSurface | null
  runtimeSurface: AlicizationMainChatRuntimeSurface
  sessionMirror: AlicizationDialogueSessionMirror | null
  sessionTrace: AlicizationRuntimeCallChainSnapshot
}

interface CreateAlicizationMainChatSessionRuntimeOptions {
  buildMainRuntimeCorePromptBlocks: (input: {
    hostName: string
    personaKernel?: AlicizationPersonaKernelSnapshot | null
  }) => string[]
  buildOrganicMemorySystemBlocks: (context: OrganicMemoryPromptContext) => string[]
  buildPerformanceManifestSystemBlocks: (manifest: CharacterPerformanceCapabilitiesManifest | null) => string[]
  dialogueSessionManager?: AlicizationDialogueSessionManager
  dialogueSessionMirrorTtlMs?: number
  persistAutobiographicalEpisodesFromPreparedMirror?: (input: {
    cardId: string
    decisionTraceId?: string | null
    turnId?: string | null
    sessionId: string
    previousMirror?: AlicizationDialogueSessionMirror | null
    mirror: AlicizationDialogueSessionMirror
  }) => Promise<void> | void
  executionCapabilityChannels: readonly AlicizationExecutionCapabilityChannel[]
  executeMainGatewayTaskThread: BuildMainGatewayToolsOptions['executeTaskThread']
  resumeMainGatewayTaskThread?: BuildMainGatewayToolsOptions['resumeTaskThread']
  getNow?: () => number
  getPerformanceManifest: () => Promise<CharacterPerformanceCapabilitiesManifest | null>
  getSensorySnapshot: () => Promise<AlicizationSensoryCacheSnapshot> | AlicizationSensoryCacheSnapshot
  latestUserMessageContainsVisualInput: (messages: Message[]) => boolean
  openAgentTurn: (input: {
    cardId: string
    decisionTraceId?: string | null
    turnId: string
  }) => Promise<AlicizationAgentTurnRuntime> | AlicizationAgentTurnRuntime
  resolveCardCustomDirectives: (cardId: string, input: { messages: Message[] }) => Promise<ResolvedCardCustomDirectives>
  resolveCardPersonaKernel: (cardId: string, input: { messages: Message[] }) => Promise<AlicizationPersonaKernelSnapshot | null>
  resolveCardHostName: (cardId: string, input: { messages: Message[] }) => Promise<string>
  resolveExecutionCapabilitiesForPrompt: () => Promise<AlicizationChannelCapability[]>
  resolveOrganicMemoryPromptContext: (input: {
    recallSeed: string
    recallGovernor: AlicizationRecallGovernorSnapshot | null | undefined
    sessionId?: string | null
    turnId?: string | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
  }) => Promise<OrganicMemoryPromptContext>
  prewarmOrganicMemoryAccessibility?: (input: {
    recallSeed: string
    recallGovernor: AlicizationRecallGovernorSnapshot | null | undefined
    sessionId?: string | null
    turnId?: string | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
  }) => Promise<unknown>
  resolveSessionContinuitySignals?: (input: {
    cardId: string
    turnId: string
  }) => Promise<AlicizationAgentSessionContinuityInput[]>
  resolveTaskPlanningCapabilities: BuildMainGatewayToolsOptions['resolveTaskPlanningCapabilities']
  scheduleReminderTask: BuildMainGatewayToolsOptions['scheduleReminderTask']
  tuneOrganicMemoryPromptContextForExecutiveTurn: (input: {
    context: OrganicMemoryPromptContext
    suppressAssociativeRecall: boolean
    personaKernelMode: AlicizationMindTurnGovernance['personaKernelMode']
    recallGovernor: AlicizationRecallGovernorSnapshot | null | undefined
  }) => OrganicMemoryPromptContext
  invokeMcpCallTool: BuildMainGatewayToolsOptions['invokeMcpCallTool']
  invokeMcpListTools: BuildMainGatewayToolsOptions['invokeMcpListTools']
}

function normalizeSessionPhases(phases: string[]) {
  return [...new Set(phases.map(phase => phase.trim()).filter(Boolean))]
}

function pushUniqueRule(target: string[], value: string) {
  const normalized = value.trim()
  if (!normalized || target.includes(normalized))
    return
  target.push(normalized)
}

function mergeUniqueRules(values: Array<string | null | undefined>, maxItems = 16) {
  const merged: string[] = []
  for (const value of values) {
    if (typeof value !== 'string')
      continue
    pushUniqueRule(merged, value)
    if (merged.length >= maxItems)
      break
  }
  return merged
}

function sanitizeGuidanceText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function mergeGuidanceLine(values: Array<string | null | undefined>, maxChars = 320) {
  const merged = mergeUniqueRules(values, values.length)
  return sanitizeGuidanceText(merged.join(' '), maxChars) || null
}

function applyMemoryDeliberationToGovernance(input: {
  governance: AlicizationMindTurnGovernance | null
  context: OrganicMemoryPromptContext
}) {
  const governance = input.governance
  const deliberation = input.context.memoryDeliberation ?? null
  const speech = input.context.recollectionSpeechPlan ?? null
  if (!governance || (!speech && !deliberation))
    return governance

  const deliberationKernel = buildAlicizationMemoryDeliberationKernel({
    deliberation,
    speech,
    recollectionIntent: input.context.recollectionIntent ?? null,
    knowledgeEvidence: input.context.knowledgeEvidence ?? null,
  })
  if (!deliberationKernel?.shouldRecall)
    return governance

  const surfacePolicy = deliberationKernel.surfacePolicy
  const shouldStayInward = deliberationKernel.shouldStayInward
  const selectedChainSummary = deliberationKernel.selectedChainSummary
  const selectedChainStance = deliberationKernel.selectedChainStance
  const selectedChainPosture = deliberationKernel.selectedChainPosture
  const selectedBundleSummary = deliberationKernel.selectedBundleSummary
  const selectedEraSummary = deliberationKernel.selectedEraSummary
  const speechControls = deliberationKernel.speechControls
  const speechLatentSummary = deliberationKernel.speechLatentSummary
  const rationale = deliberationKernel.rationale
  const selectedPeriodSummary = deliberationKernel.selectedPeriodSummary
  const selectedProcedureSummary = deliberationKernel.selectedProcedureSummary
  const selectedRelationshipSummary = deliberationKernel.selectedRelationshipSummary
  const memoryControl = deliberationKernel.memoryControl
  const memoryControlSummary = deliberationKernel.memoryControlSummary
  const inwardCarryRule = deliberationKernel.inwardCarryRule
  const inwardCarryBoundary = deliberationKernel.inwardCarryBoundary
  const baseMindTurnFrame = governance.mindTurnFrame ?? {
    world: {
      activeThread: governance.carriedThread ?? null,
      visibleSurface: governance.liveSurface ?? null,
      truthState: governance.truthState,
      truthBoundary: null,
      continuityPolicy: null,
      continuitySummary: governance.carriedThread ?? null,
      staleRisk: governance.repairState === 'none' ? 0 : 0.72,
    },
    relation: {
      subject: governance.answerSubject ?? 'general',
      hostMove: null,
      hostGoal: null,
      relationNeed: null,
      relationMove: null,
      relationshipPosture: governance.relationshipPosture ?? null,
    },
    memory: {
      memoryMode: null,
      carriedThread: governance.carriedThread ?? null,
      carriedFacts: [],
      recallKeys: [],
      recallSeed: null,
      lastOutcome: null,
      suppressAssociativeRecall: governance.suppressAssociativeRecall,
      labelCarryAsMemory: governance.labelCarryAsMemory,
    },
    self: {
      stance: null,
      mindMode: governance.mindMode ?? null,
      dominantDrive: null,
      embodiedPresence: governance.embodiedPresence ?? 'none',
      emotionalTension: governance.emotionalTension,
      initiativeAction: null,
      thought: null,
    },
    obligation: {
      shouldSpeak: true,
      speechObligation: null,
      answerAct: governance.answerAct ?? null,
      responseMode: null,
      turnMode: governance.turnMode,
      openingClaim: governance.liveSurface ?? null,
      openingMove: governance.openingMove ?? null,
      answerIntent: governance.answerIntent ?? null,
      whyNow: null,
      repairState: governance.repairState,
      shouldAskForGrounding: governance.shouldAskForGrounding,
      shouldAcknowledgeRepair: governance.shouldAcknowledgeRepair,
    },
    focusAnchor: governance.focusAnchor ?? null,
    confidence: 0.72,
    mustDo: [...(governance.mustDo ?? [])],
    mustNotDo: [...(governance.mustNotDo ?? [])],
    narrative: [],
    updatedAt: Date.now(),
  }
  const inwardThought = mergeGuidanceLine([
    baseMindTurnFrame.self.thought ?? null,
    selectedChainSummary
      ? `The experience chain shaping the answer is ${selectedChainSummary}.`
      : null,
    selectedBundleSummary
      ? `The linked recollection bundle shaping the answer is ${selectedBundleSummary}.`
      : null,
    selectedPeriodSummary
      ? `The period currently shaping the answer is ${selectedPeriodSummary}.`
      : null,
    selectedEraSummary
      ? `The remembered era currently shaping the answer is ${selectedEraSummary}.`
      : null,
    selectedProcedureSummary
      ? `The remembered way of doing this is ${selectedProcedureSummary}.`
      : null,
    selectedRelationshipSummary
      ? `The remembered relationship line is ${selectedRelationshipSummary}.`
      : null,
    memoryControlSummary ? `Memory latent controls: ${memoryControlSummary}.` : null,
    !memoryControlSummary && speechLatentSummary ? `Recollection latent controls: ${speechLatentSummary}.` : null,
    speechControls
      ? `Let recollection stay ${speechControls.visibility} with ${speechControls.continuityRole} discipline and ${speechControls.certainty} certainty.`
      : null,
  ])
  const inwardWhyNow = mergeGuidanceLine([
    baseMindTurnFrame.obligation.whyNow ?? null,
    rationale
      ? `An active recollection is shaping the answer from the inside because ${rationale.charAt(0).toLowerCase()}${rationale.slice(1)}`
      : null,
    memoryControl ? `Memory latent controls: ${memoryControlSummary}.` : null,
    selectedChainStance
      ? `Current stance carried from remembered experience: ${selectedChainStance}.`
      : null,
  ])
  const inwardAnswerIntent = mergeGuidanceLine([
    baseMindTurnFrame.obligation.answerIntent ?? governance.answerIntent ?? null,
    memoryControl ? buildMemoryAnswerAnchorTag(memoryControl) : null,
    !memoryControl && speechLatentSummary ? `recollection_answer_anchor{${speechLatentSummary}}` : null,
    selectedChainPosture,
  ])
  const inwardOpeningMove = baseMindTurnFrame.obligation.openingMove
    ?? governance.openingMove
    ?? (shouldStayInward
      ? memoryControl ? buildMemoryOpeningStrategyTag(memoryControl) : 'memory_opening_strategy{mode=payoff-first-inward-carry}'
      : memoryControl ? buildMemoryOpeningStrategyTag(memoryControl) : 'memory_opening_strategy{mode=embedded-memory-carry}')

  return {
    ...governance,
    answerIntent: inwardAnswerIntent ?? governance.answerIntent ?? null,
    openingMove: governance.openingMove ?? inwardOpeningMove,
    mustDo: mergeUniqueRules([
      inwardCarryRule,
      ...(governance.mustDo ?? []),
    ]),
    mustNotDo: mergeUniqueRules([
      inwardCarryBoundary,
      ...(memoryControl?.unsafeDetails ?? []).map(item => `Do not overstate this remembered detail: ${item}`),
      ...(governance.mustNotDo ?? []),
    ]),
    mindTurnFrame: {
          ...baseMindTurnFrame,
          self: {
            ...baseMindTurnFrame.self,
            thought: inwardThought ?? baseMindTurnFrame.self.thought ?? null,
          },
          obligation: {
            ...baseMindTurnFrame.obligation,
            openingMove: sanitizeGuidanceText(inwardOpeningMove, 220) || baseMindTurnFrame.obligation.openingMove || null,
            answerIntent: inwardAnswerIntent ?? baseMindTurnFrame.obligation.answerIntent ?? null,
            whyNow: inwardWhyNow ?? baseMindTurnFrame.obligation.whyNow ?? null,
          },
          narrative: mergeUniqueRules([
            ...(baseMindTurnFrame.narrative ?? []),
            'memory:inward-recollection',
            `memory-deliberation:surface:${surfacePolicy}`,
            speech?.certainty ? `recollection:certainty:${speech.certainty}` : null,
            speech?.surfaceMode ? `recollection:surface:${speech.surfaceMode}` : null,
          ], 12),
        },
  }
}

function deriveMemoryDeliberationSurfaceMode(input: {
  shouldStayInward: boolean
  surfacePolicy: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['surfacePolicy']
  answerSubject: AlicizationMindTurnGovernance['answerSubject']
}) {
  if (input.shouldStayInward)
    return 'held-memory' as const
  if (input.surfacePolicy === 'procedural-carry')
    return 'task-thread' as const
  if (input.surfacePolicy === 'relationship-continuity')
    return input.answerSubject === 'relationship'
      ? 'dialogue-bond' as const
      : 'self-continuity' as const
  return 'held-memory' as const
}

function deriveMemoryDeliberationMemoryMode(input: {
  existingMode: 'suppress-associative' | 'task-thread' | 'scene-anchored' | 'dialogue-carry' | 'emotional-resonance' | null
  shouldStayInward: boolean
  surfacePolicy: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['surfacePolicy']
}) {
  if (input.existingMode)
    return input.existingMode
  if (input.surfacePolicy === 'procedural-carry')
    return 'task-thread' as const
  if (input.surfacePolicy === 'relationship-continuity')
    return 'dialogue-carry' as const
  return input.shouldStayInward
    ? 'emotional-resonance' as const
    : 'dialogue-carry' as const
}

function mapAnswerActToReplyMotive(answerAct: AlicizationMindTurnGovernance['answerAct']) {
  switch (answerAct) {
    case 'guide':
      return 'guide' as const
    case 'care':
      return 'care' as const
    case 'defer':
      return 'defer' as const
    case 'correct-stale-anchor':
    case 'ask-reground':
      return 'repair' as const
    default:
      return 'answer' as const
  }
}

function inferHostSocialContexts(input: {
  surface: AlicizationDigitalLifeRuntimeSurface
  governance: AlicizationMindTurnGovernance
}) {
  const contexts = ['general']
  const scene = input.surface.perception.currentScene
  const tension = input.surface.cognition.privateThought?.emotionalTension ?? null
  if (
    scene?.workloadKind === 'coding'
    || scene?.contentKind === 'diff'
    || input.governance.answerSubject === 'task-knot'
    || input.governance.answerAct === 'guide'
  ) {
    contexts.push('focused-work', 'execution')
  }
  if (tension === 'late-night-drain')
    contexts.push('late-night')
  if (
    input.governance.answerSubject === 'relationship'
    || input.governance.answerSubject === 'alicization-self'
    || input.governance.answerAct === 'care'
  ) {
    contexts.push('open-window')
  }
  return [...new Set(contexts)]
}

function applyHostPersonModelToGovernance(input: {
  now: number
  governance: AlicizationMindTurnGovernance | null
  context: OrganicMemoryPromptContext
}) {
  const governance = input.governance
  const hostPersonModel = input.context.hostPersonModel ?? null
  if (!governance || !hostPersonModel)
    return governance

  const contexts = ['general']
  const anchorText = `${governance.liveSurface ?? ''} ${governance.focusAnchor ?? ''} ${governance.answerIntent ?? ''}`
  if (governance.answerSubject === 'task-knot' || governance.answerAct === 'guide')
    contexts.push('focused-work', 'execution')
  if (/runtime|diff|code|patch|cursor|terminal|cli|debug|fix|verify|test/iu.test(anchorText))
    contexts.push('focused-work', 'execution')
  if (governance.emotionalTension === 'late-night-drain' || governance.answerAct === 'care')
    contexts.push('late-night')
  if (governance.answerSubject === 'relationship' || governance.answerSubject === 'alicization-self')
    contexts.push('open-window')

  const projection = buildAlicizationPersonStateProjection({
    now: input.now,
    contexts: [...new Set(contexts)],
    hostPersonModel,
    habitPolicy: null,
    selfContinuity: null,
    selfState: null,
    privateThought: null,
    mindEcology: null,
  })

  return {
    ...governance,
    relationshipPosture: projection.relationshipPosture ?? governance.relationshipPosture,
    mustDo: mergeUniqueRules([
      projection.preferenceText ? `Host preference for this context: ${projection.preferenceText}` : null,
      projection.repairTriggerText ? `Repair trigger to respect: ${projection.repairTriggerText}` : null,
      projection.burdenText ? `Burden cue to respect: ${projection.burdenText}` : null,
      ...(governance.mustDo ?? []),
    ]),
    mustNotDo: mergeUniqueRules([
      projection.sensitivityText ? `Do not trigger host sensitivity: ${projection.sensitivityText}` : null,
      ...(governance.mustNotDo ?? []),
    ]),
    answerIntent: mergeGuidanceLine([
      governance.answerIntent ?? null,
      projection.trustRationale ? `Trust context: ${projection.trustRationale}` : null,
    ], 220) ?? governance.answerIntent ?? null,
  }
}

function applyHostPersonModelToDigitalLifeRuntimeSurface(input: {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  governance: AlicizationMindTurnGovernance | null
  context: OrganicMemoryPromptContext
  now: number
}): AlicizationDigitalLifeRuntimeSurface | null {
  const surface = input.surface ?? null
  const governance = input.governance ?? null
  const hostPersonModel = input.context.hostPersonModel ?? null
  const relationshipDoctrine = sanitizeGuidanceText(surface?.memory.autobiographicalSelf?.relationshipDoctrine ?? '', 180)
  if (!surface || !governance || (!hostPersonModel && !relationshipDoctrine))
    return surface

  const projection = buildAlicizationPersonStateProjection({
    now: input.now,
    contexts: inferHostSocialContexts({
      surface,
      governance,
    }),
    autobiographicalSelf: surface.memory.autobiographicalSelf ?? null,
    hostPersonModel: hostPersonModel ?? surface.memory.hostPersonModel ?? null,
    longHorizonMemory: surface.memory.longHorizonMemory ?? null,
    motiveEngine: surface.memory.motiveEngine ?? null,
    habitPolicy: surface.agency.habitPolicy ?? null,
    selfContinuity: surface.memory.selfContinuity ?? null,
    selfState: surface.agency.selfState ?? null,
    privateThought: surface.cognition.privateThought ?? null,
    mindEcology: buildMindEcologyFromRuntimeSurface(surface),
    previousContinuityState: surface.memory.personalityContinuityState ?? null,
  })
  const contexts = projection.contexts
  const selectedMotive = (() => {
    if (projection.repairTriggerText && projection.relationshipPosture === 'restrained')
      return 'attune' as const
    if (governance.answerSubject === 'relationship' && (projection.repairTriggerText || projection.sensitivityText))
      return 'attune' as const
    if (contexts.includes('late-night') && (projection.burdenText || projection.personalityContinuityState.currentRegime === 'late-night-care'))
      return 'care' as const
    return surface.dialogue.replyDeliberation?.selectedMotive ?? mapAnswerActToReplyMotive(governance.answerAct)
  })()
  const socialWhyNow = mergeGuidanceLine([
    surface.dialogue.replyDeliberation?.whyThisReplyNow ?? null,
    projection.preferenceText ? `Host preference in this context: ${projection.preferenceText}` : null,
    `Closeness ladder in play: ${projection.activeClosenessContext}/${projection.activeClosenessRung}.`,
    projection.sensitivityText ? `Host sensitivity in play: ${projection.sensitivityText}` : null,
    projection.repairTriggerText ? `Repair trigger in play: ${projection.repairTriggerText}` : null,
    projection.relationshipDoctrine ? `Relationship doctrine in play: ${projection.relationshipDoctrine}` : null,
    projection.trustRationale ? `Trust line: ${projection.trustRationale}` : null,
    projection.summary ? `Person-state: ${projection.summary}` : null,
  ], 240)
  const socialAnswerIntent = mergeGuidanceLine([
    surface.dialogue.answerPlanner?.answerIntent ?? governance.answerIntent ?? null,
    projection.relationshipDoctrine ? `Relationship doctrine: ${projection.relationshipDoctrine}` : null,
    projection.routineText ? `Routine cue: ${projection.routineText}` : null,
    projection.preferenceText ? `Preferred closeness here: ${projection.preferenceText}` : null,
  ], 220)

  return {
    ...surface,
    memory: {
      ...surface.memory,
      hostPersonModel: hostPersonModel ?? surface.memory.hostPersonModel ?? null,
      personalityContinuityState: projection.personalityContinuityState,
      personStateProjection: projection,
    },
    dialogue: {
      ...surface.dialogue,
      replyDeliberation: {
        selectedMotive,
        speakingFrom: surface.dialogue.replyDeliberation?.speakingFrom ?? (governance.answerSubject === 'relationship' ? 'dialogue-bond' : 'task-thread'),
        memoryMode: surface.dialogue.replyDeliberation?.memoryMode ?? (governance.answerSubject === 'relationship' ? 'dialogue-carry' : 'task-thread'),
        openingBeat: mergeGuidanceLine([
          surface.dialogue.replyDeliberation?.openingBeat ?? null,
          projection.openingGuidance,
        ], 220) || surface.dialogue.replyDeliberation?.openingBeat || governance.openingMove || socialWhyNow || '',
        whyThisReplyNow: socialWhyNow || surface.dialogue.replyDeliberation?.whyThisReplyNow || '',
        whyNotOtherCandidates: surface.dialogue.replyDeliberation?.whyNotOtherCandidates ?? [],
        withheldImpulses: mergeUniqueRules([
          ...(surface.dialogue.replyDeliberation?.withheldImpulses ?? []),
          projection.sensitivityText ? `Do not trigger host sensitivity: ${projection.sensitivityText}` : null,
        ], 8),
        candidateMotives: surface.dialogue.replyDeliberation?.candidateMotives ?? [],
        shouldSpeak: surface.dialogue.replyDeliberation?.shouldSpeak ?? true,
        mustInclude: mergeUniqueRules([
          ...(surface.dialogue.replyDeliberation?.mustInclude ?? []),
          `Respect closeness ladder: ${projection.activeClosenessContext}/${projection.activeClosenessRung}.`,
          projection.preferenceText ? `Respect host closeness preference: ${projection.preferenceText}` : null,
          projection.repairTriggerText ? `Respect repair trigger: ${projection.repairTriggerText}` : null,
          projection.relationshipPosture === 'restrained' ? 'Let repair land before closeness.' : null,
          projection.relationshipDoctrine ? `Keep this doctrine alive: ${projection.relationshipDoctrine}` : null,
        ], 10),
        mustAvoid: mergeUniqueRules([
          ...(surface.dialogue.replyDeliberation?.mustAvoid ?? []),
          projection.sensitivityText ? `Avoid this sensitivity: ${projection.sensitivityText}` : null,
          projection.burdenText ? `Avoid adding burden here: ${projection.burdenText}` : null,
          projection.restrained ? 'Do not let presence become pressure.' : null,
        ], 10),
        confidence: surface.dialogue.replyDeliberation?.confidence ?? 0.72,
        narrative: mergeUniqueRules([
          ...(surface.dialogue.replyDeliberation?.narrative ?? []),
          'person-state-projection',
          ...contexts.map(context => `host-context:${context}`),
        ], 12),
        updatedAt: input.now,
      },
      answerPlanner: {
        act: surface.dialogue.answerPlanner?.act ?? governance.answerAct ?? 'answer',
        evidenceMode: surface.dialogue.answerPlanner?.evidenceMode ?? governance.evidenceMode ?? 'dialogue-grounded',
        confidence: surface.dialogue.answerPlanner?.confidence ?? 0.72,
        governingFocus: mergeGuidanceLine([
          surface.dialogue.answerPlanner?.governingFocus ?? null,
          projection.preferenceText ? `Host preference: ${projection.preferenceText}` : null,
          projection.relationshipDoctrine ? `Doctrine: ${projection.relationshipDoctrine}` : null,
        ], 220) || surface.dialogue.answerPlanner?.governingFocus || socialWhyNow || '',
        openingMove: mergeGuidanceLine([
          surface.dialogue.answerPlanner?.openingMove ?? null,
          projection.openingGuidance,
        ], 220) || surface.dialogue.answerPlanner?.openingMove || governance.openingMove || '',
        answerIntent: socialAnswerIntent || surface.dialogue.answerPlanner?.answerIntent || governance.answerIntent || '',
        relationshipPosture: projection.relationshipPosture ?? surface.dialogue.answerPlanner?.relationshipPosture ?? governance.relationshipPosture ?? 'warm',
        shouldAskForGrounding: surface.dialogue.answerPlanner?.shouldAskForGrounding ?? governance.shouldAskForGrounding,
        shouldAcknowledgeRepair: surface.dialogue.answerPlanner?.shouldAcknowledgeRepair ?? governance.shouldAcknowledgeRepair,
        selectedConcernEntryId: surface.dialogue.answerPlanner?.selectedConcernEntryId ?? null,
        selectedRepairId: surface.dialogue.answerPlanner?.selectedRepairId ?? null,
        selectedCommitmentId: surface.dialogue.answerPlanner?.selectedCommitmentId ?? null,
        selectedInquiryPlanId: surface.dialogue.answerPlanner?.selectedInquiryPlanId ?? null,
        selectedRuntimeThreadId: surface.dialogue.answerPlanner?.selectedRuntimeThreadId ?? null,
        selectedProjectId: surface.dialogue.answerPlanner?.selectedProjectId ?? null,
        selectedReflectionId: surface.dialogue.answerPlanner?.selectedReflectionId ?? null,
        executivePhase: surface.dialogue.answerPlanner?.executivePhase ?? null,
        selectedTruthFrame: surface.dialogue.answerPlanner?.selectedTruthFrame ?? null,
        mustDo: mergeUniqueRules([
          ...(surface.dialogue.answerPlanner?.mustDo ?? []),
          `Plan to the closeness ladder: ${projection.activeClosenessContext}/${projection.activeClosenessRung}.`,
          projection.preferenceText ? `Respect host preference here: ${projection.preferenceText}` : null,
          projection.routineText ? `Remember host routine: ${projection.routineText}` : null,
          projection.relationshipPosture === 'restrained' ? 'Plan the answer so repair lands before closeness.' : null,
          projection.relationshipDoctrine ? `Keep doctrine visible in the answer plan: ${projection.relationshipDoctrine}` : null,
        ], 10),
        mustNotDo: mergeUniqueRules([
          ...(surface.dialogue.answerPlanner?.mustNotDo ?? []),
          projection.sensitivityText ? `Do not ignore host sensitivity: ${projection.sensitivityText}` : null,
          projection.restrained ? 'Do not let closeness outrun room or turn into pressure.' : null,
        ], 10),
        narrative: mergeUniqueRules([
          ...(surface.dialogue.answerPlanner?.narrative ?? []),
          'person-state-projection',
          ...contexts.map(context => `host-context:${context}`),
        ], 12),
        updatedAt: input.now,
      },
    },
  }
}

function applyMemoryDeliberationToDigitalLifeRuntimeSurface(input: {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  governance: AlicizationMindTurnGovernance | null
  context: OrganicMemoryPromptContext
  now: number
}): AlicizationDigitalLifeRuntimeSurface | null {
  const surface = input.surface ?? null
  const governance = input.governance ?? null
  const deliberation = input.context.memoryDeliberation ?? null
  const speech = input.context.recollectionSpeechPlan ?? null
  const deliberationKernel = buildAlicizationMemoryDeliberationKernel({
    deliberation,
    speech,
    recollectionIntent: input.context.recollectionIntent ?? null,
    knowledgeEvidence: input.context.knowledgeEvidence ?? null,
  })
  if (!surface || !governance || !deliberationKernel?.shouldRecall || !deliberation)
    return surface

  const shouldStayInward = deliberationKernel.shouldStayInward
  const selectedChainSummary = deliberationKernel.selectedChainSummary
  const selectedChainStance = deliberationKernel.selectedChainStance
  const selectedChainPosture = deliberationKernel.selectedChainPosture
  const selectedPeriodSummary = deliberationKernel.selectedPeriodSummary
  const selectedEraSummary = deliberationKernel.selectedEraSummary
  const selectedProcedureSummary = deliberationKernel.selectedProcedureSummary
  const selectedRelationshipSummary = deliberationKernel.selectedRelationshipSummary
  const selectedBundleSummary = deliberationKernel.selectedBundleSummary
  const whyNow = deliberationKernel.rationale
  const followUpAffordance = deliberationKernel.followUpAffordance
  const memoryControl = deliberationKernel.memoryControl!
  const memoryControlSummary = deliberationKernel.memoryControlSummary
  const speakingIntention = mergeGuidanceLine([
    surface.dialogue.currentConsciousFrame?.speakingIntention ?? null,
    shouldStayInward
      ? 'Let remembered continuity shape the answer before any explicit memory mention.'
      : `Let remembered continuity guide the answer through ${deliberation.surfacePolicy}.`,
    `Memory latent controls: ${memoryControlSummary}.`,
  ])
  const consciousNeed = mergeGuidanceLine([
    surface.dialogue.currentConsciousFrame?.consciousNeed ?? null,
    selectedChainSummary
      ? `The recollection chain now shaping the answer is ${selectedChainSummary}.`
      : null,
    selectedBundleSummary
      ? `The recollection bundle now shaping the answer is ${selectedBundleSummary}.`
      : null,
    selectedPeriodSummary
      ? `The remembered period now shaping the answer is ${selectedPeriodSummary}.`
      : null,
    selectedEraSummary
      ? `The remembered era now shaping the answer is ${selectedEraSummary}.`
      : null,
    selectedProcedureSummary
      ? `The remembered procedure pressing forward is ${selectedProcedureSummary}.`
      : null,
    memoryControlSummary,
  ])
  const consciousTension = mergeGuidanceLine([
    surface.dialogue.currentConsciousFrame?.consciousTension ?? null,
    selectedRelationshipSummary
      ? `What is relationally live inside the recollection is ${selectedRelationshipSummary}.`
      : null,
    selectedChainStance
      ? `The remembered stance pulling on this answer is ${selectedChainStance}.`
      : null,
  ])
  const replyWhyNow = mergeGuidanceLine([
    surface.dialogue.replyDeliberation?.whyThisReplyNow ?? null,
    followUpAffordance?.whyNow ?? null,
    whyNow,
  ])
  const answerIntent = mergeGuidanceLine([
    surface.dialogue.answerPlanner?.answerIntent ?? governance.answerIntent ?? null,
    buildMemoryAnswerAnchorTag(memoryControl),
    selectedChainPosture,
  ])
  const openingMove = mergeGuidanceLine([
    surface.dialogue.answerPlanner?.openingMove ?? governance.openingMove ?? null,
    buildMemoryOpeningStrategyTag(memoryControl),
  ], 220)
  const mindTurnFrame = (governance.mindTurnFrame ?? surface.cognition.mindTurnFrame ?? null) as AlicizationDigitalLifeRuntimeSurface['cognition']['mindTurnFrame']
  const nextMindTurnFrame: AlicizationDigitalLifeRuntimeSurface['cognition']['mindTurnFrame'] = mindTurnFrame
    ? ({
        ...mindTurnFrame,
        narrative: mergeUniqueRules([
          ...(mindTurnFrame.narrative ?? []),
          'memory-deliberation',
          `memory-deliberation:surface:${deliberation.surfacePolicy}`,
        ], 12),
      } satisfies NonNullable<AlicizationDigitalLifeRuntimeSurface['cognition']['mindTurnFrame']>)
    : mindTurnFrame
  const nextCurrentConsciousFrame: NonNullable<AlicizationDigitalLifeRuntimeSurface['dialogue']['currentConsciousFrame']> = {
    subject: surface.dialogue.currentConsciousFrame?.subject ?? governance.answerSubject ?? 'general',
    centerOfGravity: surface.dialogue.currentConsciousFrame?.centerOfGravity ?? mapAnswerActToReplyMotive(governance.answerAct),
    truthDiscipline: surface.dialogue.currentConsciousFrame?.truthDiscipline === 'dialogue-first'
      ? 'dialogue-first'
      : 'memory-labeled',
    consciousNeed: consciousNeed || surface.dialogue.currentConsciousFrame?.consciousNeed || memoryControlSummary || whyNow || '',
    consciousTension: consciousTension || surface.dialogue.currentConsciousFrame?.consciousTension || whyNow || '',
    speakingIntention: speakingIntention || surface.dialogue.currentConsciousFrame?.speakingIntention || `Memory latent controls: ${memoryControlSummary}.` || whyNow || '',
    focusAnchor: surface.dialogue.currentConsciousFrame?.focusAnchor ?? governance.focusAnchor ?? null,
    withheldImpulse: surface.dialogue.currentConsciousFrame?.withheldImpulse ?? (shouldStayInward
      ? 'Do not flatten remembered continuity into a narrated memory dump.'
      : 'Do not let recollection outrun the live payoff.'),
    shouldWithholdSpecificity: surface.dialogue.currentConsciousFrame?.shouldWithholdSpecificity ?? (memoryControl.unsafeDetails.length > 0 || memoryControl.conflictBurden !== 'none'),
    shouldSelfRevise: surface.dialogue.currentConsciousFrame?.shouldSelfRevise ?? shouldStayInward,
    confidence: Math.max(surface.dialogue.currentConsciousFrame?.confidence ?? 0, deliberation.confidence),
    reasonTags: mergeUniqueRules([
      ...(surface.dialogue.currentConsciousFrame?.reasonTags ?? []),
      'memory-deliberation',
    ], 10),
    updatedAt: input.now,
  }
  const nextReplyDeliberation: NonNullable<AlicizationDigitalLifeRuntimeSurface['dialogue']['replyDeliberation']> = {
    selectedMotive: surface.dialogue.replyDeliberation?.selectedMotive ?? mapAnswerActToReplyMotive(governance.answerAct),
    speakingFrom: deriveMemoryDeliberationSurfaceMode({
      shouldStayInward,
      surfacePolicy: deliberation.surfacePolicy,
      answerSubject: governance.answerSubject,
    }),
    memoryMode: deriveMemoryDeliberationMemoryMode({
      existingMode: surface.dialogue.replyDeliberation?.memoryMode ?? null,
      shouldStayInward,
      surfacePolicy: deliberation.surfacePolicy,
    }),
    openingBeat: openingMove || surface.dialogue.replyDeliberation?.openingBeat || whyNow || '',
    whyThisReplyNow: replyWhyNow || surface.dialogue.replyDeliberation?.whyThisReplyNow || whyNow || '',
    whyNotOtherCandidates: surface.dialogue.replyDeliberation?.whyNotOtherCandidates ?? [],
    withheldImpulses: mergeUniqueRules([
      ...(surface.dialogue.replyDeliberation?.withheldImpulses ?? []),
      followUpAffordance?.intrusionRisk === 'high'
        ? 'Do not force the remembered follow-up forward before the host has room for it.'
        : null,
      shouldStayInward
        ? 'Do not narrate the active recollection unless the live payoff truly needs it.'
        : 'Do not let recollection replace the live answer.',
      memoryControl.conflictBurden !== 'none'
        ? 'Do not overstate remembered detail while this recollection still carries conflict pressure.'
        : null,
      memoryControl.dominantProvenance === 'dreamt'
        ? 'Do not present dream residue as lived remembered fact.'
        : null,
      memoryControl.dominantProvenance === 'inferred'
        ? 'Do not present inferred continuity as settled remembered fact.'
        : null,
    ], 8),
    candidateMotives: surface.dialogue.replyDeliberation?.candidateMotives ?? [],
    shouldSpeak: surface.dialogue.replyDeliberation?.shouldSpeak ?? true,
    mustInclude: mergeUniqueRules([
      ...(surface.dialogue.replyDeliberation?.mustInclude ?? []),
      `memory_latent_controls=${memoryControlSummary}`,
      followUpAffordance?.summary ? `memory_follow_up_affordance=${followUpAffordance.summary}` : null,
    ], 8),
    mustAvoid: mergeUniqueRules([
      ...(surface.dialogue.replyDeliberation?.mustAvoid ?? []),
      buildMemoryLatentBoundaryTag(memoryControl),
      memoryControl.dominantProvenance === 'dreamt'
        ? 'Do not present dream residue as lived remembered fact.'
        : null,
      memoryControl.dominantProvenance === 'inferred'
        ? 'Do not present inferred continuity as settled remembered fact.'
        : null,
      ...memoryControl.unsafeDetails.map(item => `Do not state this remembered detail as settled fact: ${item}`),
    ], 8),
    confidence: Math.max(surface.dialogue.replyDeliberation?.confidence ?? 0, deliberation.confidence),
    narrative: mergeUniqueRules([
      ...(surface.dialogue.replyDeliberation?.narrative ?? []),
      'memory-deliberation',
      `memory-deliberation:surface:${deliberation.surfacePolicy}`,
      followUpAffordance?.preferredTiming ? `memory-deliberation:followup:${followUpAffordance.preferredTiming}` : null,
    ], 10),
    updatedAt: input.now,
  }
  const nextAnswerPlanner: NonNullable<AlicizationDigitalLifeRuntimeSurface['dialogue']['answerPlanner']> = {
    act: surface.dialogue.answerPlanner?.act ?? governance.answerAct ?? 'answer',
    evidenceMode: surface.dialogue.answerPlanner?.evidenceMode ?? governance.evidenceMode ?? 'continuity-carry',
    confidence: Math.max(surface.dialogue.answerPlanner?.confidence ?? 0, deliberation.confidence),
    governingFocus: mergeGuidanceLine([
      surface.dialogue.answerPlanner?.governingFocus ?? null,
      selectedChainSummary,
      selectedBundleSummary,
      selectedEraSummary,
      selectedPeriodSummary,
      selectedProcedureSummary,
      selectedRelationshipSummary,
      memoryControlSummary,
    ], 220) || memoryControlSummary || whyNow || '',
    openingMove: openingMove || surface.dialogue.answerPlanner?.openingMove || whyNow || '',
    answerIntent: answerIntent || surface.dialogue.answerPlanner?.answerIntent || whyNow || '',
    relationshipPosture: surface.dialogue.answerPlanner?.relationshipPosture ?? governance.relationshipPosture ?? 'warm',
    shouldAskForGrounding: surface.dialogue.answerPlanner?.shouldAskForGrounding ?? governance.shouldAskForGrounding,
    shouldAcknowledgeRepair: surface.dialogue.answerPlanner?.shouldAcknowledgeRepair ?? governance.shouldAcknowledgeRepair,
    selectedConcernEntryId: surface.dialogue.answerPlanner?.selectedConcernEntryId ?? null,
    selectedRepairId: surface.dialogue.answerPlanner?.selectedRepairId ?? null,
    selectedCommitmentId: surface.dialogue.answerPlanner?.selectedCommitmentId ?? null,
    selectedInquiryPlanId: surface.dialogue.answerPlanner?.selectedInquiryPlanId ?? null,
    selectedRuntimeThreadId: surface.dialogue.answerPlanner?.selectedRuntimeThreadId ?? null,
    selectedProjectId: surface.dialogue.answerPlanner?.selectedProjectId ?? null,
    selectedReflectionId: surface.dialogue.answerPlanner?.selectedReflectionId ?? null,
    executivePhase: surface.dialogue.answerPlanner?.executivePhase ?? null,
    selectedTruthFrame: surface.dialogue.answerPlanner?.selectedTruthFrame ?? null,
    mustDo: mergeUniqueRules([
      ...(surface.dialogue.answerPlanner?.mustDo ?? []),
      `memory_latent_controls=${memoryControlSummary}`,
      memoryControl.dominantProvenance === 'dreamt'
        ? 'If the recollection becomes explicit, frame it as dream residue rather than lived fact.'
        : null,
      memoryControl.dominantProvenance === 'inferred'
        ? 'If the recollection becomes explicit, frame it as inference or likely continuity rather than settled memory.'
        : null,
      memoryControl.dominantProvenance === 'reconstructed'
        ? 'If the recollection becomes explicit, keep it approximate and centered on the stable core.'
        : null,
    ], 10),
    mustNotDo: mergeUniqueRules([
      ...(surface.dialogue.answerPlanner?.mustNotDo ?? []),
      buildMemoryLatentBoundaryTag(memoryControl),
      ...memoryControl.unsafeDetails.map(item => `Do not over-assert this remembered detail: ${item}`),
    ], 10),
    narrative: mergeUniqueRules([
      ...(surface.dialogue.answerPlanner?.narrative ?? []),
      'memory-deliberation',
      `memory-deliberation:surface:${deliberation.surfacePolicy}`,
    ], 10),
    updatedAt: input.now,
  }
  const nextDialogueActKernel: NonNullable<AlicizationDigitalLifeRuntimeSurface['dialogue']['dialogueActKernel']> = {
    subject: surface.dialogue.dialogueActKernel?.subject ?? governance.answerSubject ?? 'general',
    hostGoal: surface.dialogue.dialogueActKernel?.hostGoal ?? (
      governance.answerAct === 'care'
        ? 'rest'
        : governance.answerSubject === 'relationship' || governance.answerSubject === 'alicization-self'
          ? 'chat'
          : 'resolve-problem'
    ),
    relationNeed: surface.dialogue.dialogueActKernel?.relationNeed ?? (
      deliberation.surfacePolicy === 'relationship-continuity'
        ? 'companionship'
        : governance.answerAct === 'care'
          ? 'care'
          : governance.answerAct === 'guide'
            ? 'guidance'
            : 'unclear'
    ),
    activeProject: surface.dialogue.dialogueActKernel?.activeProject ?? selectedProcedureSummary ?? selectedPeriodSummary ?? null,
    truthMode: surface.dialogue.dialogueActKernel?.truthMode ?? (
      shouldStayInward || deliberation.surfacePolicy === 'relationship-continuity'
        ? 'memory-only'
        : governance.evidenceMode ?? 'continuity-carry'
    ),
    speechAct: surface.dialogue.dialogueActKernel?.speechAct ?? governance.answerAct ?? nextAnswerPlanner.act,
    turnMode: surface.dialogue.dialogueActKernel?.turnMode ?? governance.turnMode,
    screenReferenceMode: surface.dialogue.dialogueActKernel?.screenReferenceMode ?? governance.screenReferenceMode ?? 'avoid',
    speakingFrom: nextReplyDeliberation.speakingFrom,
    selectedEvidence: surface.dialogue.dialogueActKernel?.selectedEvidence ?? [
      {
        kind: 'memory',
        source: 'reply-deliberation',
        summary: memoryControl.stableCore[0]
          || selectedEraSummary
          || selectedPeriodSummary
          || selectedChainSummary
          || selectedBundleSummary
          || selectedProcedureSummary
          || selectedRelationshipSummary
          || memoryControlSummary
          || whyNow
          || '',
        confidence: deliberation.confidence,
      },
    ],
    openingClaim: surface.dialogue.dialogueActKernel?.openingClaim ?? selectedEraSummary ?? selectedPeriodSummary ?? selectedChainSummary ?? selectedBundleSummary ?? selectedProcedureSummary ?? selectedRelationshipSummary ?? whyNow ?? '',
    openingMove: openingMove || surface.dialogue.dialogueActKernel?.openingMove || whyNow || '',
    whyNow: replyWhyNow || surface.dialogue.dialogueActKernel?.whyNow || whyNow || '',
    mustSay: mergeUniqueRules([
      ...(surface.dialogue.dialogueActKernel?.mustSay ?? []),
      answerIntent,
      `memory_latent_controls=${memoryControlSummary}`,
    ], 8),
    mustAvoid: mergeUniqueRules([
      ...(surface.dialogue.dialogueActKernel?.mustAvoid ?? []),
      buildMemoryLatentBoundaryTag(memoryControl),
    ], 8),
    sourceTrace: mergeUniqueRules([
      ...(surface.dialogue.dialogueActKernel?.sourceTrace ?? []),
      'memory-deliberation',
      `memory-deliberation:surface:${deliberation.surfacePolicy}`,
    ], 10),
    confidence: Math.max(surface.dialogue.dialogueActKernel?.confidence ?? 0, deliberation.confidence),
    updatedAt: input.now,
  }

  return {
    ...surface,
    memory: {
      ...surface.memory,
      recollectionPlan: input.context.recollectionPlan ?? surface.memory.recollectionPlan ?? null,
      recollectionSpeechPlan: input.context.recollectionSpeechPlan ?? surface.memory.recollectionSpeechPlan ?? null,
      memoryDeliberation: deliberation,
      knowledgeEvidence: input.context.knowledgeEvidence ?? surface.memory.knowledgeEvidence ?? null,
      selfEvolution: input.context.selfEvolution ?? surface.memory.selfEvolution ?? null,
    },
    cognition: {
      ...surface.cognition,
      mindTurnFrame: nextMindTurnFrame,
    },
    dialogue: {
      ...surface.dialogue,
      currentConsciousFrame: nextCurrentConsciousFrame,
      dialogueActKernel: nextDialogueActKernel,
      replyDeliberation: nextReplyDeliberation,
      answerPlanner: nextAnswerPlanner,
    },
  }
}

function sanitizeToolPhaseSegment(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, '-').slice(0, 80)
}

function normalizeToolName(raw: unknown) {
  return typeof raw === 'string'
    ? raw.trim()
    : ''
}

function filterMainGatewayToolsForRoutingIntent<T extends { function?: { name?: unknown } }>(
  tools: T[] | undefined,
  intent: AlicizationExecutionRoutingIntent | null,
) {
  if (!Array.isArray(tools) || tools.length === 0 || !intent)
    return tools

  const requiredToolNames = new Set(intent.requiredToolNames
    .map(name => normalizeToolName(name))
    .filter(Boolean))
  if (requiredToolNames.size === 0)
    return tools

  const filtered = tools.filter(entry => requiredToolNames.has(normalizeToolName(entry?.function?.name)))
  return filtered.length > 0
    ? filtered
    : tools
}

function buildSessionMirrorRecollectionAfterthoughtSeed(mirror: AlicizationDialogueSessionMirror | null) {
  if (!mirror)
    return ''
  if (!mirror.recollectionSummary || !mirror.recollectionSurfaceSummary)
    return ''
  if (!mirror.recollectionSurfaceSummary.includes('afterthought=ripe'))
    return ''
  return [
    'mirror_recollection_afterthought:',
    mirror.recollectionSummary,
    mirror.recollectionSurfaceSummary,
  ].filter(Boolean).join(' ')
}

function buildSessionContinuityRecallSeed(signals: AlicizationAgentSessionContinuityInput[]) {
  const afterglowSignals = signals
    .filter((signal) => {
      const source = typeof signal.metadata?.source === 'string' ? signal.metadata.source : ''
      return signal.label.startsWith('afterglow:')
        || source === 'autobiographical-afterglow'
    })
    .slice(-2)

  if (afterglowSignals.length === 0)
    return ''

  return afterglowSignals.map((signal) => {
    const metadata = signal.metadata ?? {}
    const threadAnchor = sanitizeGuidanceText(
      typeof metadata.threadAnchor === 'string' ? metadata.threadAnchor : '',
      120,
    )
    const afterglowTag = sanitizeGuidanceText(
      typeof metadata.afterglowTag === 'string' ? metadata.afterglowTag : '',
      64,
    )
    return [
      'continuity_afterglow:',
      `label=${sanitizeGuidanceText(signal.label, 120)}`,
      `summary=${sanitizeGuidanceText(signal.summary ?? '', 180)}`,
      threadAnchor ? `thread=${threadAnchor}` : '',
      afterglowTag ? `kind=${afterglowTag}` : '',
    ].filter(Boolean).join(' ')
  }).join('\n')
}

export function createAlicizationMainChatSessionRuntime(options: CreateAlicizationMainChatSessionRuntimeOptions) {
  const getNow = options.getNow ?? Date.now
  const dialogueSessionManager = options.dialogueSessionManager
    ?? createAlicizationDialogueSessionManager({
      getNow: options.getNow,
      staleAfterMs: options.dialogueSessionMirrorTtlMs,
    })

  async function prepareExecution(input: {
    payload: AlicizationChatStartPayload
    prelude: AlicizationPreparedMainChatPrelude
  }): Promise<AlicizationPreparedMainChatExecutionResult> {
    const { payload, prelude } = input
    const now = getNow()
    const effectiveExecutionRoutingIntent = prelude.actionObligation.routingIntent ?? prelude.executionRoutingIntent
    const routingRequired = Boolean(effectiveExecutionRoutingIntent)
    const digitalLifeSpine = prelude.perceptionAugmentation.digitalLifeRuntimeSurface
      ? deriveAlicizationDigitalLifeSpineFromSurface(prelude.perceptionAugmentation.digitalLifeRuntimeSurface)
      : null
    const digitalLifeArchitecture = digitalLifeSpine?.architecture ?? null
    const agentTurn = await options.openAgentTurn({
      cardId: payload.cardId,
      turnId: payload.turnId,
      decisionTraceId: prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance?.decisionTraceId ?? null,
    })
    let messages = prelude.messages

    agentTurn.ingestDigitalLifeSpine(digitalLifeSpine)
    agentTurn.ingestDigitalLifeArchitecture(digitalLifeArchitecture)
    const previousSessionMirror = agentTurn.conversationSessionId
      ? dialogueSessionManager.getSessionMirror(payload.cardId, agentTurn.conversationSessionId)
      : null
    const memoryCarryPolicy = deriveAlicizationDialogueMemoryCarryPolicy({
      now,
      mirror: previousSessionMirror
        ? {
            memorySummary: previousSessionMirror.memorySummary,
            updatedAt: previousSessionMirror.updatedAt,
          }
        : null,
      mirrorStaleAfterMs: options.dialogueSessionMirrorTtlMs,
      spine: digitalLifeSpine,
    })
    const memoryCarrySystemBlock = buildAlicizationDialogueMemoryCarrySystemBlock(memoryCarryPolicy)

    const provisionalHasVisualGrounding = !effectiveExecutionRoutingIntent && options.latestUserMessageContainsVisualInput(messages)
    const dialogueFirstLeanRuntimeBase = shouldUseDialogueFirstLivingPromptMode({
      actionObligation: prelude.actionObligation ?? null,
      capture: {
        inspectionRequested: prelude.perceptionAugmentation.capture.inspectionRequested,
        groundedThisTurn: prelude.perceptionAugmentation.capture.groundedThisTurn,
        health: prelude.perceptionAugmentation.capture.snapshot?.health ?? null,
        permission: prelude.perceptionAugmentation.capture.snapshot?.permission ?? null,
        fallbackReason: prelude.perceptionAugmentation.capture.fallbackReason,
        degradedReasons: prelude.perceptionAugmentation.capture.snapshot?.degradedReasons ?? [],
      },
      governance: prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance ?? null,
      hasVisualGrounding: provisionalHasVisualGrounding,
    })
    const dialogueFirstLeanRuntime = dialogueFirstLeanRuntimeBase
      && payload.waitForTools !== true
      && !routingRequired
    const skipExecutionPhaseTracking = dialogueFirstLeanRuntime && !routingRequired
    const [contextualString, executionCallbackContext, executionLedgerContext, sessionContinuitySignals] = await Promise.all([
      agentTurn.trackPhase('contextual-memory', async () => await prelude.contextualStringPromise, {
        turnId: payload.turnId,
      }),
      skipExecutionPhaseTracking
        ? prelude.executionCallbackContextPromise.then((context) => {
            agentTurn.ingestContinuitySignals(context.continuitySignals)
            agentTurn.ingestRuntimeActions(context.actions)
            return context
          }).catch(() => emptyAlicizationExecutionCallbackContext)
        : agentTurn.trackPhase('execution-callbacks', async () => {
            const context = await prelude.executionCallbackContextPromise
            agentTurn.ingestContinuitySignals(context.continuitySignals)
            agentTurn.ingestRuntimeActions(context.actions)
            return context
          }, {
            sessionId: agentTurn.conversationSessionId,
          }),
      skipExecutionPhaseTracking
        ? prelude.executionLedgerContextPromise.catch(() => emptyAlicizationExecutionLedgerContext)
        : agentTurn.trackPhase('execution-ledger', async () => await prelude.executionLedgerContextPromise, {
            routingRequired,
          }),
      agentTurn.trackPhase('session-continuity', async () => {
        const signals = await options.resolveSessionContinuitySignals?.({
          cardId: payload.cardId,
          turnId: payload.turnId,
        }) ?? []
        const digitalLifeSignal = digitalLifeSpine?.continuitySignal ?? null
        const mergedSignals = digitalLifeSignal
          ? [...signals, digitalLifeSignal]
          : signals
        agentTurn.ingestContinuitySignals(mergedSignals)
        return mergedSignals
      }, {
        cardId: payload.cardId,
      }),
      agentTurn.trackPhase('agent-session-context', async () => await agentTurn.getSensorySnapshot(), {
        cardId: payload.cardId,
      }),
    ])

    const organicRecallSeed = [
      contextualString,
      executionCallbackContext.recallText,
      executionLedgerContext.recallText,
      prelude.perceptionAugmentation.memoryRecallSeed,
      memoryCarryPolicy.recallSeed,
      buildSessionContinuityRecallSeed(sessionContinuitySignals ?? []),
      buildSessionMirrorRecollectionAfterthoughtSeed(previousSessionMirror),
    ].filter(Boolean).join('\n')
    if (options.prewarmOrganicMemoryAccessibility) {
      await agentTurn.trackPhase('organic-memory-prewarm', async () => {
        await options.prewarmOrganicMemoryAccessibility?.({
          recallSeed: organicRecallSeed,
          recallGovernor: prelude.perceptionAugmentation.recallGovernor,
          turnId: payload.turnId,
          budgetClass: prelude.perceptionAugmentation.recallGovernor?.recollectionIntent?.temporalFocus === 'cross-session'
            || prelude.perceptionAugmentation.recallGovernor?.recollectionIntent?.temporalFocus === 'distant'
            || prelude.perceptionAugmentation.recallGovernor?.recollectionIntent?.temporalFocus === 'experience-matched'
            ? 'deep-recall-reply'
            : 'realtime-reply',
        })
      }, {
        personaKernelMode: prelude.perceptionAugmentation.chatGovernance.personaKernelMode,
      })
    }

    const organicPromptContext = await agentTurn.trackPhase('organic-memory-context', async () => {
      return options.tuneOrganicMemoryPromptContextForExecutiveTurn({
        context: await options.resolveOrganicMemoryPromptContext({
          recallSeed: organicRecallSeed,
          recallGovernor: prelude.perceptionAugmentation.recallGovernor,
          turnId: payload.turnId,
          budgetClass: prelude.perceptionAugmentation.recallGovernor?.recollectionIntent?.temporalFocus === 'cross-session'
            || prelude.perceptionAugmentation.recallGovernor?.recollectionIntent?.temporalFocus === 'distant'
            || prelude.perceptionAugmentation.recallGovernor?.recollectionIntent?.temporalFocus === 'experience-matched'
            ? 'deep-recall-reply'
            : 'realtime-reply',
        }),
        suppressAssociativeRecall: prelude.perceptionAugmentation.chatGovernance.suppressAssociativeRecall,
        personaKernelMode: prelude.perceptionAugmentation.chatGovernance.personaKernelMode,
        recallGovernor: prelude.perceptionAugmentation.recallGovernor,
      })
    }, {
      personaKernelMode: prelude.perceptionAugmentation.chatGovernance.personaKernelMode,
      suppressAssociativeRecall: prelude.perceptionAugmentation.chatGovernance.suppressAssociativeRecall,
    })
    const executionReplyObligation: AlicizationMainChatExecutionReplyObligation | null = deriveMainChatExecutionReplyObligation({
      messages: payload.messages as Message[],
      callbackContext: executionCallbackContext,
      ledgerContext: executionLedgerContext,
    })
    const executionAdjustedMindTurnGovernance = applyMainChatExecutionReplyObligationToGovernance(
      prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance,
      executionReplyObligation,
    )
    const effectiveMindTurnGovernance = applyMemoryDeliberationToGovernance({
      governance: executionAdjustedMindTurnGovernance,
      context: organicPromptContext,
    })
    const recollectionSpeechVisibleSurfaceRules = buildRecollectionSpeechVisibleSurfaceRules(
      organicPromptContext.recollectionSpeechPlan ?? null,
    )
    const effectiveMindTurnGovernanceWithRecollection = effectiveMindTurnGovernance
      ? {
          ...effectiveMindTurnGovernance,
          mustDo: mergeUniqueRules([
            ...recollectionSpeechVisibleSurfaceRules.mustDo,
            ...(effectiveMindTurnGovernance.mustDo ?? []),
          ]),
          mustNotDo: mergeUniqueRules([
            ...recollectionSpeechVisibleSurfaceRules.mustNotDo,
            ...(effectiveMindTurnGovernance.mustNotDo ?? []),
          ]),
        }
      : effectiveMindTurnGovernance

    // NOTICE: Execution-routing intents are execution-governed turns. Do not allow
    // renderer payload flags to silently downgrade them into tool-disabled responses.
    const allowTools = dialogueFirstLeanRuntime
      ? false
      : (payload.supportsTools !== false || routingRequired)
    const waitForTools = dialogueFirstLeanRuntime
      ? false
      : (payload.waitForTools === true || routingRequired)
    const toolChoice = !dialogueFirstLeanRuntime && allowTools && effectiveExecutionRoutingIntent
      ? buildMainGatewayExecutionRoutingToolChoice(effectiveExecutionRoutingIntent)
      : undefined

    const sessionBoundToolOptions: Pick<BuildMainGatewayToolsOptions, 'executeTaskThread'
      | 'resumeTaskThread'
      | 'buildExecutionRuntimeContext'
      | 'getSensorySnapshot'
      | 'invokeMcpCallTool'
      | 'invokeMcpListTools'
      | 'resolveTaskPlanningCapabilities'
      | 'scheduleReminderTask'> = {
      buildExecutionRuntimeContext: async (toolContext) => {
        return await agentTurn.buildExecutionRuntimeContext({
          cardId: toolContext.cardId,
          turnId: toolContext.turnId,
          decisionTraceId: toolContext.decisionTraceId ?? null,
          sessionId: toolContext.sessionId ?? agentTurn.conversationSessionId,
        })
      },
      executeTaskThread: async (nextInput) => {
        const phaseSuffix = sanitizeToolPhaseSegment(nextInput.task.requestedChannel ?? nextInput.task.kind)
        return await agentTurn.trackTool({
          phaseId: `tool:executor:${phaseSuffix || 'dispatch'}`,
          kind: 'executor',
          label: `executor:${nextInput.task.requestedChannel ?? nextInput.task.kind}`,
          metadata: {
            requestedChannel: nextInput.task.requestedChannel,
            kind: nextInput.task.kind,
          },
          traceMetadata: {
            turnId: nextInput.context.turnId,
            requestedChannel: nextInput.task.requestedChannel,
            kind: nextInput.task.kind,
          },
          run: async () => await options.executeMainGatewayTaskThread(nextInput),
          summarizeSuccess: result => result.summary,
        })
      },
      resumeTaskThread: async (nextInput: { context: MainGatewayExecutionToolContext, threadId: string }) => {
        const phaseSuffix = sanitizeToolPhaseSegment(nextInput.threadId)
        if (!options.resumeMainGatewayTaskThread)
          throw new Error('resumeMainGatewayTaskThread is not configured.')
        return await agentTurn.trackTool({
          phaseId: `tool:executor-resume:${phaseSuffix || 'thread'}`,
          kind: 'executor',
          label: 'executor:resume-thread',
          metadata: {
            threadId: nextInput.threadId,
          },
          traceMetadata: {
            turnId: nextInput.context.turnId,
            threadId: nextInput.threadId,
          },
          run: async () => await options.resumeMainGatewayTaskThread!(nextInput),
          summarizeSuccess: result => result.summary,
        })
      },
      getSensorySnapshot: async () => {
        return await agentTurn.trackTool({
          phaseId: 'tool:sensory-capture-state',
          kind: 'sensory',
          label: 'sensory_capture_state',
          traceMetadata: {
            cardId: payload.cardId,
          },
          run: async () => await agentTurn.getSensorySnapshot({
            forceRefresh: true,
          }),
          summarizeSuccess: snapshot => [
            `foreground=${snapshot.sample.foregroundWindow?.appName ?? snapshot.sample.foregroundWindow?.processName ?? 'unknown'}`,
            `capture=${snapshot.capture?.health ?? 'unknown'}/${snapshot.capture?.permission ?? 'unknown'}`,
            `stale=${snapshot.stale === true ? 'true' : 'false'}`,
          ].join(' '),
        })
      },
      invokeMcpCallTool: async (nextPayload) => {
        const phaseSuffix = sanitizeToolPhaseSegment(nextPayload.name)
        return await agentTurn.trackTool({
          phaseId: `tool:mcp-call:${phaseSuffix || 'unknown'}`,
          kind: 'mcp',
          label: `mcp:${nextPayload.name}`,
          metadata: {
            cardId: nextPayload.cardId ?? payload.cardId,
            toolName: nextPayload.name,
          },
          traceMetadata: {
            cardId: nextPayload.cardId ?? payload.cardId,
            toolName: nextPayload.name,
          },
          run: async () => await options.invokeMcpCallTool(nextPayload),
          summarizeSuccess: () => `mcp tool ${nextPayload.name} completed`,
        })
      },
      invokeMcpListTools: async () => {
        return await agentTurn.trackTool({
          phaseId: 'tool:mcp-list-tools',
          kind: 'mcp',
          label: 'mcp_list_tools',
          traceMetadata: {
            cardId: payload.cardId,
          },
          run: async () => await options.invokeMcpListTools(),
          summarizeSuccess: () => 'listed available MCP tools',
        })
      },
      resolveTaskPlanningCapabilities: async () => {
        return await agentTurn.trackPhase('tool:executor-capability-snapshot', async () => await options.resolveTaskPlanningCapabilities(), {
          cardId: payload.cardId,
        })
      },
      scheduleReminderTask: async (cardId, nextPayload, source) => {
        return await agentTurn.trackTool({
          phaseId: 'tool:set-reminder',
          kind: 'runtime',
          label: 'set_reminder',
          metadata: {
            cardId,
            minutes: nextPayload.minutes,
          },
          traceMetadata: {
            cardId,
            minutes: nextPayload.minutes,
          },
          run: async () => await options.scheduleReminderTask(cardId, nextPayload, source),
          summarizeSuccess: () => `scheduled reminder in ${nextPayload.minutes} minutes`,
        })
      },
    }

    const [performanceManifest, customDirectivesResolution, hostName, personaKernel, builtTools, executionCapabilities] = await Promise.all([
      dialogueFirstLeanRuntime
        ? Promise.resolve(null)
        : agentTurn.trackPhase('performance-manifest', async () => await options.getPerformanceManifest(), {
            cardId: payload.cardId,
          }),
      agentTurn.trackPhase('card-directives', async () => await options.resolveCardCustomDirectives(payload.cardId, { messages }), {
        cardId: payload.cardId,
      }),
      agentTurn.trackPhase('host-name', async () => await options.resolveCardHostName(payload.cardId, { messages }), {
        cardId: payload.cardId,
      }),
      agentTurn.trackPhase('persona-kernel', async () => await options.resolveCardPersonaKernel(payload.cardId, { messages }), {
        cardId: payload.cardId,
      }),
      allowTools
        ? agentTurn.trackPhase('tool-registry', async () => await buildMainGatewayTools({
            context: {
              cardId: payload.cardId,
              turnId: payload.turnId,
              decisionTraceId: prelude.perceptionAugmentation.chatGovernance.mindTurnGovernance?.decisionTraceId ?? null,
              sessionId: agentTurn.conversationSessionId,
            },
            buildExecutionRuntimeContext: sessionBoundToolOptions.buildExecutionRuntimeContext,
            executeTaskThread: sessionBoundToolOptions.executeTaskThread,
            resumeTaskThread: sessionBoundToolOptions.resumeTaskThread,
            executionCapabilityChannels: options.executionCapabilityChannels,
            getSensorySnapshot: sessionBoundToolOptions.getSensorySnapshot,
            resolveTaskPlanningCapabilities: sessionBoundToolOptions.resolveTaskPlanningCapabilities,
            scheduleReminderTask: sessionBoundToolOptions.scheduleReminderTask,
            invokeMcpListTools: sessionBoundToolOptions.invokeMcpListTools,
            invokeMcpCallTool: sessionBoundToolOptions.invokeMcpCallTool,
          }), {
            routingRequired,
          })
        : Promise.resolve(undefined),
      dialogueFirstLeanRuntime
        ? Promise.resolve([])
        : agentTurn.trackPhase('execution-capabilities', async () => await options.resolveExecutionCapabilitiesForPrompt(), {
            inquiryActive: prelude.executionCapabilityInquiry.active,
          }),
    ])
    const tools = filterMainGatewayToolsForRoutingIntent(builtTools, effectiveExecutionRoutingIntent)

    const runtimeCorePromptBlocks = options.buildMainRuntimeCorePromptBlocks({
      hostName,
      personaKernel,
    })
    const hasVisualGrounding = provisionalHasVisualGrounding
    const sessionPhases = normalizeSessionPhases([
      ...agentTurn.snapshot().phaseOrder,
      'runtime-surface',
    ])
    const sessionMirrorSystemBlock = agentTurn.conversationSessionId
      ? dialogueSessionManager.buildSessionMirrorSystemBlock({
          cardId: payload.cardId,
          sessionId: agentTurn.conversationSessionId,
        })
      : ''
    const effectiveDigitalLifeRuntimeSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: digitalLifeSpine?.runtimeSurface ?? prelude.perceptionAugmentation.digitalLifeRuntimeSurface,
      governance: effectiveMindTurnGovernanceWithRecollection,
      context: organicPromptContext,
      now,
    })
    const sociallyShapedDigitalLifeRuntimeSurface = applyHostPersonModelToDigitalLifeRuntimeSurface({
      surface: effectiveDigitalLifeRuntimeSurface,
      governance: effectiveMindTurnGovernanceWithRecollection,
      context: organicPromptContext,
      now,
    })
    const sociallyShapedGovernance = applyHostPersonModelToGovernance({
      now,
      governance: effectiveMindTurnGovernanceWithRecollection,
      context: organicPromptContext,
    })
    const llmMindAuthorityGovernance = sociallyShapedGovernance
      ? {
          ...sociallyShapedGovernance,
          visibleReplyAuthority: 'llm-mind' as const,
        }
      : null
    const effectiveDigitalLifeSpine = digitalLifeSpine
      ? {
          ...digitalLifeSpine,
          runtimeSurface: sociallyShapedDigitalLifeRuntimeSurface ?? digitalLifeSpine.runtimeSurface,
        }
      : digitalLifeSpine

    const runtimeSurface = await agentTurn.trackPhase('runtime-surface', async () => {
      return buildAlicizationMainChatRuntimeSurface({
        actionObligation: prelude.actionObligation,
        actionObligationSystemBlock: buildMainChatActionObligationSystemBlock(prelude.actionObligation),
        allowTools,
        waitForTools,
        baseMessages: messages,
        hasVisualGrounding,
        runtimeCorePromptBlocks,
        digitalLifeSpine: effectiveDigitalLifeSpine,
        digitalLifeArchitecture,
        perceptionPromptSystemBlocks: prelude.perceptionAugmentation.promptSystemBlocks,
        perceptionSystemBlocks: prelude.perceptionAugmentation.systemBlocks,
        digitalLifeRuntimeSurface: sociallyShapedDigitalLifeRuntimeSurface,
        executionCapabilitySystemBlocks: buildExecutionCapabilitySystemBlocks(
          executionCapabilities,
          options.executionCapabilityChannels,
          {
            allowTools,
            inquiry: prelude.executionCapabilityInquiry,
          },
        ),
        executionRoutingEnforcementSystemBlock: effectiveExecutionRoutingIntent
          ? buildExecutionRoutingEnforcementSystemBlock(effectiveExecutionRoutingIntent)
          : undefined,
        executionCallbackSystemBlocks: (!dialogueFirstLeanRuntime || Boolean(executionReplyObligation)) && executionCallbackContext.systemBlock
          ? [executionCallbackContext.systemBlock]
          : [],
        executionLedgerSystemBlocks: executionLedgerContext.systemBlock
          ? [executionLedgerContext.systemBlock]
          : [],
        executionReplyObligationSystemBlock: executionReplyObligation
          ? buildMainChatExecutionReplyObligationSystemBlock(executionReplyObligation)
          : undefined,
        agentRuntimeSystemBlocks: [
          memoryCarrySystemBlock,
          sessionMirrorSystemBlock,
          agentTurn.buildSessionSystemBlock(),
        ],
        organicMemorySystemBlocks: options.buildOrganicMemorySystemBlocks(organicPromptContext),
        performanceManifestSystemBlocks: options.buildPerformanceManifestSystemBlocks(performanceManifest),
        customDirectivesResolution,
        personaKernelMode: prelude.perceptionAugmentation.chatGovernance.personaKernelMode,
        personaKernelReason: prelude.perceptionAugmentation.chatGovernance.personaKernelMode === 'muted'
          ? 'truth-or-repair-obligation'
          : prelude.perceptionAugmentation.chatGovernance.personaKernelMode === 'backgrounded'
            ? 'task-or-direct-answer-obligation'
            : undefined,
        turnMode: prelude.perceptionAugmentation.chatGovernance.turnMode,
        governance: llmMindAuthorityGovernance,
        tools,
        toolChoice,
        sessionPhases,
        capture: {
          inspectionRequested: prelude.perceptionAugmentation.capture.inspectionRequested,
          groundedThisTurn: prelude.perceptionAugmentation.capture.groundedThisTurn,
          health: prelude.perceptionAugmentation.capture.snapshot?.health ?? null,
          permission: prelude.perceptionAugmentation.capture.snapshot?.permission ?? null,
          fallbackReason: prelude.perceptionAugmentation.capture.fallbackReason,
          degradedReasons: prelude.perceptionAugmentation.capture.snapshot?.degradedReasons ?? [],
        },
      })
    }, {
      hasVisualGrounding,
      routingRequired,
      sessionPhases: sessionPhases.join(' -> '),
    })
    messages = runtimeSurface.messages

    const sessionMirror = agentTurn.conversationSessionId
      ? dialogueSessionManager.ingestPreparedExecution({
        agentSession: agentTurn.getSessionSnapshot(),
        cardId: payload.cardId,
        organicMemoryContext: organicPromptContext,
        runtimeSurface,
        sessionId: agentTurn.conversationSessionId,
      })
      : previousSessionMirror
    if (agentTurn.conversationSessionId && sessionMirror) {
      await options.persistAutobiographicalEpisodesFromPreparedMirror?.({
        cardId: payload.cardId,
        decisionTraceId: runtimeSurface.trace.decisionTraceId ?? null,
        turnId: payload.turnId,
        sessionId: agentTurn.conversationSessionId,
        previousMirror: previousSessionMirror,
        mirror: sessionMirror,
      })
    }

    return {
      chatConfig: prelude.chatConfig,
      conversationSessionId: agentTurn.conversationSessionId,
      getSessionTrace: () => agentTurn.snapshot(),
      messages,
      waitForTools,
      tools,
      toolChoice,
      customDirectivesResolution,
      hasVisualGrounding: runtimeSurface.hasVisualGrounding,
      governance: runtimeSurface.governance,
      mindTurnContract: prelude.perceptionAugmentation.chatGovernance.mindTurnContract,
      organicMemoryContext: organicPromptContext,
      personaKernel,
      performanceManifest,
      replyRealization: runtimeSurface.replyAuthority ?? null,
      replyExecutionPlan: runtimeSurface.replyExecutionPlan ?? null,
      runtimeSurface,
      sessionMirror,
      sessionTrace: agentTurn.snapshot(),
    }
  }

  return {
    clear: () => dialogueSessionManager.clear(),
    prepareExecution,
  }
}
