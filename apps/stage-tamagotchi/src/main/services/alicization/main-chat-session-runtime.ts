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
import type { AlicizationRuntimeCallChainSnapshot } from './runtime-call-chain'
import type {
  MainGatewayResolvedConfig,
  OrganicMemoryPromptContext,
  PreparedMainChatExecution,
  ResolvedCardCustomDirectives,
} from './runtime-soul'
import { clamp01 } from './runtime-soul'

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
  shouldUseDialogueFirstLivingPromptMode,
} from './main-chat-runtime-surface'
import { buildRecollectionSpeechVisibleSurfaceRules } from './response-surface-contract'
import { deriveRecollectionSurfaceControls } from './recollection-surface-controls'
import { buildRelationshipDoctrineGuidance } from './relationship-doctrine-guidance'

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
  organicMemoryContext?: OrganicMemoryPromptContext
  personaKernel: AlicizationPersonaKernelSnapshot | null
  performanceManifest: CharacterPerformanceCapabilitiesManifest | null
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
  }) => Promise<OrganicMemoryPromptContext>
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

  const shouldRecall = deliberation?.shouldRecall ?? Boolean(speech)
  if (!shouldRecall)
    return governance

  const surfacePolicy = deliberation?.surfacePolicy ?? speech?.surfaceMode ?? 'internal-only'
  const shouldStayInward = surfacePolicy === 'internal-only'
    || !speech?.shouldSurface
    || speech?.placement === 'internal-only'
  const selectedChainSummary = (deliberation?.selectedChains ?? []).map(item => item.summary).slice(0, 2).join(' | ') || null
  const selectedChainStance = (deliberation?.selectedChains ?? []).map(item => item.currentStance).filter(Boolean).slice(0, 2).join(' | ') || null
  const selectedChainPosture = (deliberation?.selectedChains ?? []).map(item => item.answerPosture).filter(Boolean).slice(0, 2).join(' | ') || null
  const selectedBundleSummary = (deliberation?.selectedBundles ?? []).map(item => item.summary).slice(0, 2).join(' | ') || null
  const selectedEraSummary = deliberation?.selectedEras.map(item => item.summary).slice(0, 2).join(' | ') || null
  const speechControls = deriveRecollectionSurfaceControls(speech)
  const rationale = sanitizeGuidanceText(
    deliberation?.whyNow
      || speech?.rationale
      || '',
    220,
  )
  const selectedPeriodSummary = deliberation?.selectedPeriods.map(item => item.summary).slice(0, 2).join(' | ') || null
  const selectedProcedureSummary = deliberation?.selectedProcedures.map(item => item.label).slice(0, 2).join(' | ') || null
  const selectedRelationshipSummary = deliberation?.selectedRelationshipLines.slice(0, 2).join(' | ') || null
  const memoryControl = deliberation
    ? deriveMemoryDeliberationControlState({
        deliberation,
        speech,
        recollectionIntent: input.context.recollectionIntent ?? null,
        shouldStayInward,
      })
    : null
  const memoryControlSummary = memoryControl
    ? [
        `memory pressure=${memoryControl.memoryPressure}`,
        `certainty=${memoryControl.certaintyPosture}`,
        `relation=${memoryControl.relationshipVector}`,
        `surface=${memoryControl.surfacePermission}`,
        `depth=${memoryControl.retrospectiveDepth}`,
        memoryControl.conflictBurden !== 'none' ? `conflict=${memoryControl.conflictBurden}` : '',
      ].filter(Boolean).join(' | ')
    : null
  const inwardCarryRule = shouldStayInward
    ? 'Before wording the visible reply, let the active recollection settle stance, pacing, and detail choice from the inside.'
    : 'Let the active recollection guide the answer before speaking, but keep any visible memory gesture brief and subordinate to the live payoff.'
  const inwardCarryBoundary = shouldStayInward
    ? 'Do not narrate the active recollection unless the live payoff truly needs it.'
    : 'Do not let recollection replace the live answer or expand into a retrospective dump.'
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
    memoryControlSummary ? `Memory control state: ${memoryControlSummary}.` : null,
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
    speechControls
      ? `Let recollection stay ${speechControls.visibility} with ${speechControls.continuityRole} discipline and ${speechControls.certainty} certainty.`
      : null,
  ])
  const inwardWhyNow = mergeGuidanceLine([
    baseMindTurnFrame.obligation.whyNow ?? null,
    rationale
      ? `An active recollection is shaping the answer from the inside because ${rationale.charAt(0).toLowerCase()}${rationale.slice(1)}`
      : null,
    memoryControl?.answerDiscipline,
    selectedChainStance
      ? `Current stance carried from remembered experience: ${selectedChainStance}.`
      : null,
  ])
  const inwardAnswerIntent = mergeGuidanceLine([
    baseMindTurnFrame.obligation.answerIntent ?? governance.answerIntent ?? null,
    shouldStayInward
      ? 'Let remembered continuity shape stance and chosen detail before any explicit memory mention.'
      : `Let remembered continuity guide the answer through ${surfacePolicy} rather than through a fixed memory template.`,
    memoryControl?.answerDiscipline,
    selectedChainPosture,
  ])
  const inwardOpeningMove = baseMindTurnFrame.obligation.openingMove
    ?? governance.openingMove
    ?? (shouldStayInward
      ? memoryControl?.openingDiscipline ?? 'Pay off the live ask first while keeping the remembered line inward.'
      : memoryControl?.openingDiscipline ?? 'Let the remembered bundle open the reasoning, then pay off the live ask in the same reply.')

  return {
    ...governance,
    answerIntent: inwardAnswerIntent ?? governance.answerIntent ?? null,
    openingMove: governance.openingMove ?? inwardOpeningMove,
    mustDo: mergeUniqueRules([
      inwardCarryRule,
      memoryControl?.answerDiscipline,
      memoryControl?.visibleDiscipline,
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

function deriveMemoryDeliberationControlState(input: {
  deliberation: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>
  speech: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  shouldStayInward: boolean
}) {
  const agenda = input.recollectionIntent?.recollectionAgenda ?? null
  const selectedCount
    = input.deliberation.selectedPeriods.length
      + input.deliberation.selectedEpisodes.length
      + input.deliberation.selectedProcedures.length
      + input.deliberation.selectedBundles.length
      + input.deliberation.selectedChains.length
      + input.deliberation.selectedRelationshipLines.length
  const memoryPressure = selectedCount >= 6 || input.deliberation.confidence >= 0.84
    ? 'high'
    : selectedCount >= 3 || input.deliberation.confidence >= 0.68
      ? 'medium'
      : 'low'
  const certaintyPosture = input.speech?.certainty ?? (
    input.deliberation.confidence >= 0.82
      ? 'firm'
      : input.deliberation.confidence >= 0.6
        ? 'approximate'
        : 'fragmentary'
  )
  const explicitConflictSeverity = input.deliberation.conflictSeverity ?? 'none'
  const relationshipVector = input.deliberation.surfacePolicy === 'relationship-continuity'
    || input.deliberation.selectedRelationshipLines.length > 0
    || (agenda?.relationshipNeed ?? 0) >= 0.56
    ? 'relational'
    : input.deliberation.surfacePolicy === 'procedural-carry'
      || input.deliberation.selectedProcedures.length > 0
      || (agenda?.goalSimilarity ?? 0) >= 0.56
      ? 'procedural'
      : input.deliberation.selectedChains.length > 0 || input.deliberation.selectedBundles.length > 0
        ? 'threaded'
        : 'neutral'
  const procedureCarryStrength = Number(clamp01(
    (input.deliberation.selectedProcedures.length > 0 ? 0.42 : 0)
    + (input.deliberation.surfacePolicy === 'procedural-carry' ? 0.38 : 0)
    + ((agenda?.goalSimilarity ?? 0) * 0.18)
    + input.deliberation.confidence * 0.2,
  ).toFixed(2))
  const conflictBurden = explicitConflictSeverity !== 'none'
    ? explicitConflictSeverity
    : input.deliberation.selectedEpisodes.some(item => item.provenance === 'reconstructed')
      ? 'medium'
      : input.deliberation.selectedEpisodes.some(item => item.provenance === 'dreamt' || item.provenance === 'inferred')
        ? 'low'
        : 'none'
  const surfacePermission = input.shouldStayInward
    ? 'inward-only'
    : input.speech?.placement === 'before-payoff' || input.deliberation.surfacePolicy === 'answer-anchoring'
      ? 'explicit-surface'
      : 'soft-surface'
  const retrospectiveDepth = input.deliberation.selectedPeriods.length > 0
    || ((agenda?.candidateEraFacets ?? []).some(item => item.facet !== 'window' && item.weight >= 0.34))
    ? 'period'
    : input.deliberation.selectedChains.length > 0 || input.deliberation.selectedBundles.length > 0
      ? 'thread'
      : 'fragment'
  const stableCore = input.deliberation.stableCore ?? []
  const unsafeDetails = input.deliberation.unsafeDetails ?? []
  const ambiguityPosture = input.deliberation.ambiguityPosture ?? 'settled'
  const episodeProvenances = [...new Set(input.deliberation.selectedEpisodes.map(item => item.provenance))]
  const dominantProvenance = episodeProvenances.includes('reconstructed')
    ? 'reconstructed'
    : episodeProvenances.includes('dreamt')
      ? 'dreamt'
      : episodeProvenances.includes('inferred')
        ? 'inferred'
        : episodeProvenances.includes('observed')
          ? 'observed'
          : episodeProvenances.includes('remembered')
            ? 'remembered'
            : 'remembered'
  const provenancePosture = episodeProvenances.length > 1
    ? 'mixed-memory'
    : dominantProvenance === 'observed'
      ? 'observed-memory'
      : dominantProvenance === 'remembered'
        ? 'remembered-memory'
        : dominantProvenance === 'dreamt'
          ? 'dream-residue'
          : dominantProvenance === 'inferred'
            ? 'inferred-pattern'
            : 'reconstructed-memory'
  const detailAssertionBudget = conflictBurden === 'high' || dominantProvenance === 'dreamt' || dominantProvenance === 'inferred'
    ? 'minimal'
    : conflictBurden === 'medium' || dominantProvenance === 'reconstructed' || episodeProvenances.length > 1
      ? 'guarded'
      : ambiguityPosture === 'ambiguous'
        ? 'minimal'
      : ambiguityPosture === 'approximate'
        ? 'guarded'
      : agenda?.uncertaintyTolerance === 'low'
        ? 'guarded'
      : 'open'
  const certaintyFloor = conflictBurden === 'high'
    ? 'fragmentary'
    : ambiguityPosture === 'ambiguous'
      ? 'fragmentary'
    : ambiguityPosture === 'approximate' && certaintyPosture === 'firm'
      ? 'approximate'
    : conflictBurden === 'medium' && certaintyPosture === 'firm'
      ? 'approximate'
      : agenda?.uncertaintyTolerance === 'low' && certaintyPosture === 'firm'
        ? 'approximate'
      : (dominantProvenance === 'dreamt' || dominantProvenance === 'inferred') && certaintyPosture !== 'fragmentary'
          ? 'fragmentary'
          : dominantProvenance === 'reconstructed' && certaintyPosture === 'firm'
            ? 'approximate'
      : certaintyPosture

  const openingDiscipline = input.shouldStayInward
    ? 'Pay off the live ask first while keeping remembered continuity entirely as inner pressure.'
    : relationshipVector === 'procedural'
      ? 'Let the remembered way of handling this shape the opening without reciting a remembered line.'
      : relationshipVector === 'relational'
        ? 'Let remembered bond meaning soften the opening without narrating the bond history outright.'
        : 'Let remembered continuity influence the opening as stance rather than as a quoted recollection.'
  const answerDiscipline = [
    `Memory pressure is ${memoryPressure}.`,
    `Certainty posture is ${certaintyFloor}.`,
    `Relationship vector is ${relationshipVector}.`,
    `Retrospective depth is ${retrospectiveDepth}.`,
    `Provenance posture is ${provenancePosture}.`,
    `Detail assertion budget is ${detailAssertionBudget}.`,
    ambiguityPosture !== 'settled' ? `Ambiguity posture is ${ambiguityPosture}.` : '',
    agenda?.whyRecallNow ? `Recall agenda: ${agenda.whyRecallNow}` : '',
    (agenda?.candidateTimeScopes?.length ?? 0) > 0
      ? `Candidate time scopes: ${agenda?.candidateTimeScopes.slice(0, 2).map(item => `${item.scope}:${item.weight.toFixed(2)}`).join(' | ')}.`
      : '',
    (agenda?.candidateProcedureLines?.length ?? 0) > 0
      ? `Candidate procedure lines: ${agenda?.candidateProcedureLines.slice(0, 2).join(' | ')}.`
      : '',
    conflictBurden !== 'none' ? `Conflict burden is ${conflictBurden}, so do not over-assert detail.` : '',
    dominantProvenance === 'dreamt'
      ? 'If this memory surfaces, treat it as dream residue or symbolic carry rather than lived fact.'
      : dominantProvenance === 'inferred'
        ? 'If this memory surfaces, treat it as inferred pattern or likely continuity rather than settled memory.'
        : dominantProvenance === 'reconstructed'
          ? 'If this memory surfaces, keep it approximate and center the stable core instead of exact remembered detail.'
          : episodeProvenances.length > 1
            ? 'If this memory surfaces, keep it blended and uncertainty-aware rather than pretending the variants fully agree.'
            : '',
    stableCore.length > 0 ? `Stable core: ${stableCore.slice(0, 2).join(' | ')}.` : '',
    unsafeDetails.length > 0 ? `Unsafe detail boundary: ${unsafeDetails.slice(0, 2).join(' | ')}.` : '',
  ].filter(Boolean).join(' ')
  const visibleDiscipline = input.shouldStayInward
    ? 'If memory stays active, let it bend stance, tone, and chosen detail from the inside rather than surfacing it explicitly.'
    : surfacePermission === 'explicit-surface'
      ? 'If memory becomes visible, surface at most one brief remembered contour and let the live payoff stay dominant.'
      : 'If memory becomes visible, keep it soft and embedded inside the payoff rather than turning it into a recollection line.'

  return {
    memoryPressure,
    certaintyPosture,
    certaintyFloor,
    relationshipVector,
    procedureCarryStrength,
    conflictBurden,
    dominantProvenance,
    provenancePosture,
    detailAssertionBudget,
    surfacePermission,
    retrospectiveDepth,
    stableCore,
    unsafeDetails,
    openingDiscipline,
    answerDiscipline,
    visibleDiscipline,
  }
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

function pickHostSocialPreference(input: {
  contexts: string[]
  hostPersonModel: NonNullable<OrganicMemoryPromptContext['hostPersonModel']>
}) {
  return input.hostPersonModel.preferredClosenessByContext
    .filter(item => input.contexts.includes(item.context))
    .sort((left, right) => right.confidence - left.confidence)[0] ?? null
}

function inferSocialPosture(input: {
  preferenceText: string
  trustStage: string
}) {
  const text = input.preferenceText.toLowerCase()
  if (/(space|lighter|room|quiet|bounded|leave room|留白|空间|轻|安静|back off)/iu.test(text) || input.trustStage === 'guarded' || input.trustStage === 'cautious-open')
    return 'restrained' as const
  if (/(warm|closer|gentle|care|companionship|陪|温和|靠近|柔和)/iu.test(text))
    return input.trustStage === 'trusted' ? 'tender' as const : 'warm' as const
  return null
}

function applyHostPersonModelToGovernance(input: {
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

  const preference = pickHostSocialPreference({
    contexts: [...new Set(contexts)],
    hostPersonModel,
  })
  const preferenceText = sanitizeGuidanceText(preference?.preference ?? '', 180)
  const sensitivity = sanitizeGuidanceText(hostPersonModel.sensitivities[0] ?? '', 180)
  const repairTrigger = sanitizeGuidanceText(hostPersonModel.repairTriggers[0] ?? '', 180)
  const burden = sanitizeGuidanceText(hostPersonModel.recurrentBurdens[0] ?? '', 180)
  const trustRationale = sanitizeGuidanceText(hostPersonModel.trustLadder.rationale, 180)
  const relationshipPosture = inferSocialPosture({
    preferenceText,
    trustStage: hostPersonModel.trustLadder.stage,
  }) ?? governance.relationshipPosture

  return {
    ...governance,
    relationshipPosture,
    mustDo: mergeUniqueRules([
      preferenceText ? `Host preference for this context: ${preferenceText}` : null,
      repairTrigger ? `Repair trigger to respect: ${repairTrigger}` : null,
      burden ? `Burden cue to respect: ${burden}` : null,
      ...(governance.mustDo ?? []),
    ]),
    mustNotDo: mergeUniqueRules([
      sensitivity ? `Do not trigger host sensitivity: ${sensitivity}` : null,
      ...(governance.mustNotDo ?? []),
    ]),
    answerIntent: mergeGuidanceLine([
      governance.answerIntent ?? null,
      trustRationale ? `Trust context: ${trustRationale}` : null,
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

  const contexts = inferHostSocialContexts({
    surface,
    governance,
  })
  const preference = hostPersonModel
    ? pickHostSocialPreference({ contexts, hostPersonModel })
    : null
  const preferenceText = sanitizeGuidanceText(preference?.preference ?? '', 180)
  const sensitivity = sanitizeGuidanceText(hostPersonModel?.sensitivities[0] ?? '', 180)
  const repairTrigger = sanitizeGuidanceText(hostPersonModel?.repairTriggers[0] ?? '', 180)
  const burden = sanitizeGuidanceText(hostPersonModel?.recurrentBurdens[0] ?? '', 180)
  const routine = sanitizeGuidanceText(hostPersonModel?.routines[0] ?? '', 180)
  const trustRationale = sanitizeGuidanceText(hostPersonModel?.trustLadder.rationale ?? '', 180)
  const doctrineGuidance = buildRelationshipDoctrineGuidance({
    authority: null,
    doctrineText: relationshipDoctrine,
    contexts,
  })
  const inferredPosture = inferSocialPosture({
    preferenceText,
    trustStage: hostPersonModel?.trustLadder.stage ?? 'cautious-open',
  }) ?? (doctrineGuidance.restrained ? 'restrained' as const : null)
  const selectedMotive = (() => {
    if (doctrineGuidance.repairBeforeCloseness && (repairTrigger || sensitivity))
      return 'attune' as const
    if (governance.answerSubject === 'relationship' && (repairTrigger || sensitivity))
      return 'attune' as const
    if (doctrineGuidance.restIntervention && contexts.includes('late-night'))
      return 'care' as const
    if (contexts.includes('late-night') && burden)
      return 'care' as const
    return surface.dialogue.replyDeliberation?.selectedMotive ?? mapAnswerActToReplyMotive(governance.answerAct)
  })()
  const openingGuidance = preferenceText && inferredPosture === 'restrained'
    ? 'Open with the live answer first and keep the approach lighter.'
    : doctrineGuidance.repairBeforeCloseness
      ? 'Repair the seam before leaning closer.'
      : doctrineGuidance.truthBeforeWarmth
        ? 'Keep truth in front of warmth while you answer.'
      : repairTrigger
        ? 'Repair the seam before leaning closer.'
        : burden && contexts.includes('late-night')
        ? 'Keep the answer gentle and low-pressure.'
        : null
  const socialWhyNow = mergeGuidanceLine([
    surface.dialogue.replyDeliberation?.whyThisReplyNow ?? null,
    preferenceText ? `Host preference in this context: ${preferenceText}` : null,
    sensitivity ? `Host sensitivity in play: ${sensitivity}` : null,
    repairTrigger ? `Repair trigger in play: ${repairTrigger}` : null,
    doctrineGuidance.doctrineSummary ? `Relationship doctrine in play: ${doctrineGuidance.doctrineSummary}` : null,
    trustRationale ? `Trust line: ${trustRationale}` : null,
  ], 240)
  const socialAnswerIntent = mergeGuidanceLine([
    surface.dialogue.answerPlanner?.answerIntent ?? governance.answerIntent ?? null,
    relationshipDoctrine ? `Relationship doctrine: ${relationshipDoctrine}` : null,
    routine ? `Routine cue: ${routine}` : null,
    preferenceText ? `Preferred closeness here: ${preferenceText}` : null,
  ], 220)

  return {
    ...surface,
    memory: {
      ...surface.memory,
      hostPersonModel: hostPersonModel ?? surface.memory.hostPersonModel ?? null,
    },
    dialogue: {
      ...surface.dialogue,
      replyDeliberation: {
        selectedMotive,
        speakingFrom: surface.dialogue.replyDeliberation?.speakingFrom ?? (governance.answerSubject === 'relationship' ? 'dialogue-bond' : 'task-thread'),
        memoryMode: surface.dialogue.replyDeliberation?.memoryMode ?? (governance.answerSubject === 'relationship' ? 'dialogue-carry' : 'task-thread'),
        openingBeat: mergeGuidanceLine([
          surface.dialogue.replyDeliberation?.openingBeat ?? null,
          openingGuidance,
        ], 220) || surface.dialogue.replyDeliberation?.openingBeat || governance.openingMove || socialWhyNow || '',
        whyThisReplyNow: socialWhyNow || surface.dialogue.replyDeliberation?.whyThisReplyNow || '',
        whyNotOtherCandidates: surface.dialogue.replyDeliberation?.whyNotOtherCandidates ?? [],
        withheldImpulses: mergeUniqueRules([
          ...(surface.dialogue.replyDeliberation?.withheldImpulses ?? []),
          sensitivity ? `Do not trigger host sensitivity: ${sensitivity}` : null,
        ], 8),
        candidateMotives: surface.dialogue.replyDeliberation?.candidateMotives ?? [],
        shouldSpeak: surface.dialogue.replyDeliberation?.shouldSpeak ?? true,
        mustInclude: mergeUniqueRules([
          ...(surface.dialogue.replyDeliberation?.mustInclude ?? []),
          preferenceText ? `Respect host closeness preference: ${preferenceText}` : null,
          repairTrigger ? `Respect repair trigger: ${repairTrigger}` : null,
          doctrineGuidance.repairBeforeCloseness ? 'Let repair land before closeness.' : null,
          doctrineGuidance.truthBeforeWarmth ? 'Let warmth answer to truth rather than outrunning it.' : null,
        ], 10),
        mustAvoid: mergeUniqueRules([
          ...(surface.dialogue.replyDeliberation?.mustAvoid ?? []),
          sensitivity ? `Avoid this sensitivity: ${sensitivity}` : null,
          burden ? `Avoid adding burden here: ${burden}` : null,
          doctrineGuidance.leaveRoom ? 'Do not let presence become pressure.' : null,
        ], 10),
        confidence: surface.dialogue.replyDeliberation?.confidence ?? 0.72,
        narrative: mergeUniqueRules([
          ...(surface.dialogue.replyDeliberation?.narrative ?? []),
          'host-person-model',
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
          preferenceText ? `Host preference: ${preferenceText}` : null,
          relationshipDoctrine ? `Doctrine: ${relationshipDoctrine}` : null,
        ], 220) || surface.dialogue.answerPlanner?.governingFocus || socialWhyNow || '',
        openingMove: mergeGuidanceLine([
          surface.dialogue.answerPlanner?.openingMove ?? null,
          openingGuidance,
        ], 220) || surface.dialogue.answerPlanner?.openingMove || governance.openingMove || '',
        answerIntent: socialAnswerIntent || surface.dialogue.answerPlanner?.answerIntent || governance.answerIntent || '',
        relationshipPosture: inferredPosture ?? surface.dialogue.answerPlanner?.relationshipPosture ?? governance.relationshipPosture ?? 'warm',
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
          preferenceText ? `Respect host preference here: ${preferenceText}` : null,
          routine ? `Remember host routine: ${routine}` : null,
          doctrineGuidance.repairBeforeCloseness ? 'Plan the answer so repair lands before closeness.' : null,
          doctrineGuidance.truthBeforeWarmth ? 'Keep truth visibly ahead of warmth in the answer plan.' : null,
        ], 10),
        mustNotDo: mergeUniqueRules([
          ...(surface.dialogue.answerPlanner?.mustNotDo ?? []),
          sensitivity ? `Do not ignore host sensitivity: ${sensitivity}` : null,
          doctrineGuidance.leaveRoom ? 'Do not let closeness outrun room or turn into pressure.' : null,
        ], 10),
        narrative: mergeUniqueRules([
          ...(surface.dialogue.answerPlanner?.narrative ?? []),
          'host-person-model',
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
  if (!surface || !governance || !deliberation || !deliberation.shouldRecall)
    return surface

  const speech = input.context.recollectionSpeechPlan ?? null
  const shouldStayInward = deliberation.surfacePolicy === 'internal-only'
    || !speech?.shouldSurface
    || speech?.placement === 'internal-only'
  const selectedChainSummary = (deliberation.selectedChains ?? []).map(item => item.summary).slice(0, 2).join(' | ') || null
  const selectedChainStance = (deliberation.selectedChains ?? []).map(item => item.currentStance).filter(Boolean).slice(0, 2).join(' | ') || null
  const selectedChainPosture = (deliberation.selectedChains ?? []).map(item => item.answerPosture).filter(Boolean).slice(0, 2).join(' | ') || null
  const selectedPeriodSummary = deliberation.selectedPeriods.map(item => item.summary).slice(0, 2).join(' | ') || null
  const selectedEraSummary = deliberation.selectedEras.map(item => item.summary).slice(0, 2).join(' | ') || null
  const selectedProcedureSummary = deliberation.selectedProcedures.map(item => item.label).slice(0, 2).join(' | ') || null
  const selectedRelationshipSummary = deliberation.selectedRelationshipLines.slice(0, 2).join(' | ') || null
  const selectedBundleSummary = (deliberation.selectedBundles ?? []).map(item => item.summary).slice(0, 2).join(' | ') || null
  const whyNow = sanitizeGuidanceText(deliberation.whyNow, 220)
  const memoryControl = deriveMemoryDeliberationControlState({
    deliberation,
    speech,
    recollectionIntent: input.context.recollectionIntent ?? null,
    shouldStayInward,
  })
  const memoryControlSummary = [
    `memory pressure=${memoryControl.memoryPressure}`,
    `certainty=${memoryControl.certaintyFloor}`,
    `relation=${memoryControl.relationshipVector}`,
    `surface=${memoryControl.surfacePermission}`,
    `depth=${memoryControl.retrospectiveDepth}`,
    memoryControl.conflictBurden !== 'none' ? `conflict=${memoryControl.conflictBurden}` : '',
  ].filter(Boolean).join(' | ')
  const speakingIntention = mergeGuidanceLine([
    surface.dialogue.currentConsciousFrame?.speakingIntention ?? null,
    shouldStayInward
      ? 'Let remembered continuity shape the answer before any explicit memory mention.'
      : `Let remembered continuity guide the answer through ${deliberation.surfacePolicy}.`,
    memoryControl.visibleDiscipline,
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
    whyNow,
  ])
  const answerIntent = mergeGuidanceLine([
    surface.dialogue.answerPlanner?.answerIntent ?? governance.answerIntent ?? null,
    shouldStayInward
      ? 'Let remembered continuity shape stance and detail choice before any explicit memory mention.'
      : `Let remembered continuity guide the answer through ${deliberation.surfacePolicy} rather than a rigid memory template.`,
    memoryControl.answerDiscipline,
    selectedChainPosture,
  ])
  const openingMove = mergeGuidanceLine([
    surface.dialogue.answerPlanner?.openingMove ?? governance.openingMove ?? null,
    memoryControl.openingDiscipline,
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
    consciousNeed: consciousNeed || surface.dialogue.currentConsciousFrame?.consciousNeed || memoryControlSummary || whyNow,
    consciousTension: consciousTension || surface.dialogue.currentConsciousFrame?.consciousTension || whyNow,
    speakingIntention: speakingIntention || surface.dialogue.currentConsciousFrame?.speakingIntention || memoryControl.visibleDiscipline || whyNow,
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
    openingBeat: openingMove || surface.dialogue.replyDeliberation?.openingBeat || memoryControl.openingDiscipline || whyNow,
    whyThisReplyNow: replyWhyNow || surface.dialogue.replyDeliberation?.whyThisReplyNow || whyNow,
    whyNotOtherCandidates: surface.dialogue.replyDeliberation?.whyNotOtherCandidates ?? [],
    withheldImpulses: mergeUniqueRules([
      ...(surface.dialogue.replyDeliberation?.withheldImpulses ?? []),
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
      shouldStayInward
        ? 'Let memory shape tone inwardly before wording the visible reply.'
        : 'If recollection surfaces, keep it brief and subordinate to the live payoff.',
      memoryControl.visibleDiscipline,
    ], 8),
    mustAvoid: mergeUniqueRules([
      ...(surface.dialogue.replyDeliberation?.mustAvoid ?? []),
      shouldStayInward
        ? 'Do not expose the recollection as a standalone retrospective.'
        : 'Do not turn recollection into a retrospective monologue.',
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
    ], 220) || memoryControlSummary || whyNow,
    openingMove: openingMove || surface.dialogue.answerPlanner?.openingMove || memoryControl.openingDiscipline || whyNow,
    answerIntent: answerIntent || surface.dialogue.answerPlanner?.answerIntent || memoryControl.answerDiscipline || whyNow,
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
      shouldStayInward
        ? 'Let the remembered bundle guide answer posture from the inside.'
        : 'Use the remembered bundle to anchor the answer before branching.',
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
      shouldStayInward
        ? 'Do not force overt recollection when the memory should stay inward.'
        : 'Do not let remembered continuity outrun the current payoff.',
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
          || whyNow,
        confidence: deliberation.confidence,
      },
    ],
    openingClaim: surface.dialogue.dialogueActKernel?.openingClaim ?? selectedEraSummary ?? selectedPeriodSummary ?? selectedChainSummary ?? selectedBundleSummary ?? selectedProcedureSummary ?? selectedRelationshipSummary ?? whyNow,
    openingMove: openingMove || surface.dialogue.dialogueActKernel?.openingMove || memoryControl.openingDiscipline || whyNow,
    whyNow: replyWhyNow || surface.dialogue.dialogueActKernel?.whyNow || whyNow,
    mustSay: mergeUniqueRules([
      ...(surface.dialogue.dialogueActKernel?.mustSay ?? []),
      answerIntent,
      memoryControl.visibleDiscipline,
    ], 8),
    mustAvoid: mergeUniqueRules([
      ...(surface.dialogue.dialogueActKernel?.mustAvoid ?? []),
      shouldStayInward
        ? 'Do not surface recollection as a standalone retrospective.'
        : 'Do not let recollection outrun the current payoff.',
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

    const organicPromptContext = await agentTurn.trackPhase('organic-memory-context', async () => {
      return options.tuneOrganicMemoryPromptContextForExecutiveTurn({
        context: await options.resolveOrganicMemoryPromptContext({
          recallSeed: [
            contextualString,
            executionCallbackContext.recallText,
            executionLedgerContext.recallText,
            prelude.perceptionAugmentation.memoryRecallSeed,
            memoryCarryPolicy.recallSeed,
            buildSessionContinuityRecallSeed(sessionContinuitySignals ?? []),
            buildSessionMirrorRecollectionAfterthoughtSeed(previousSessionMirror),
          ].filter(Boolean).join('\n'),
          recallGovernor: prelude.perceptionAugmentation.recallGovernor,
          turnId: payload.turnId,
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
      governance: effectiveMindTurnGovernanceWithRecollection,
      context: organicPromptContext,
    })
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
        executionLedgerSystemBlocks: (!dialogueFirstLeanRuntime || Boolean(executionReplyObligation)) && executionLedgerContext.systemBlock
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
        governance: sociallyShapedGovernance,
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
      organicMemoryContext: organicPromptContext,
      personaKernel,
      performanceManifest,
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
