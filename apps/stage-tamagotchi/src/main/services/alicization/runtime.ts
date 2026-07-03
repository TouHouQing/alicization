import type { AlicizationExecutionRuntimeContext } from '@proj-alicization/stage-shared'
import type { IpcMainEvent, IpcMainInvokeEvent, WebContents } from 'electron'

import type {
  AlicizationActiveThought,
  AlicizationAuditLogInput,
  AlicizationCardScope,
  AlicizationChannelCapability,
  AlicizationChatAbortPayload,
  AlicizationChatAbortResult,
  AlicizationChatStartPayload,
  AlicizationChatStartResult,
  AlicizationClawTaskIntent,
  AlicizationConversationStateSnapshot,
  AlicizationConversationTurnInput,
  AlicizationCoreIncarnationReforgePayload,
  AlicizationDialogueRespondedPayload,
  AlicizationDispatchTaskThreadPayload,
  AlicizationDreamMetabolismPayload,
  AlicizationDreamRunResult,
  AlicizationDurabilityPulseSnapshot,
  AlicizationGenesisInput,
  AlicizationMindHeadKey,
  AlicizationPersonalityState,
  AlicizationPresencePulsePayload,
  AlicizationProactiveMetadata,
  AlicizationProactiveReasonCode,
  AlicizationReminderScheduleResult,
  AlicizationSoulSnapshot,
  AlicizationSubconsciousTickResult,
  AlicizationVisualPresenceStateSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type {
  AlicizationAgentSessionContinuityInput,
  AlicizationAgentTurnRuntime,
} from './agent-runtime'
import type { AlicizationPerceptionSceneResidue, AlicizationPerceptionState } from './attention-anchor'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationLocalDesktopInspectionInteractable, AlicizationLocalDesktopInspectSceneInput } from './local-desktop-inspection'
import type { MainGatewayExecutionToolContext } from './main-chat-execution-surface'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'
import type { AlicizationMemoryGatewayTextProvider } from './memory-os/provider-planning'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type {
  AlicizationProactiveLoopState,
} from './proactive-feedback'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'
import type { AlicizationRuntimeCallChainSnapshot } from './runtime-call-chain'
import type {
  AlicizationMindTraceMemorySnapshot,
  AlicizationNormalizedDialogueRespondedPayload,
  AlicizationRuntimeSetupOptions,
} from './runtime-governance'
import type { AlicizationMainGatewayTextProvider } from './runtime-main-gateway-one-shot'
import type {
  ChatRunState,
  DesktopCaptureAccessResult,
  OrganicMemoryPromptContext,
  ScreenSemanticCacheState,
  SubconsciousCardState,
} from './runtime-soul'

import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { appendFile, mkdir, readdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pid, platform, cwd as processCwd } from 'node:process'

import { defineInvokeHandler } from '@moeru/eventa'
import { createContext } from '@moeru/eventa/adapters/electron/main'
import { errorMessageFrom } from '@moeru/std'
import { getScreenCaptureDiagnosticsForWebContentsId } from '@proj-alicization/electron-screen-capture/main'
import {
  alicizationExecutionCapabilityChannels,

  buildAlicizationMemoryDecisionTraceRecords,
  inferAlicizationInspectionIntent,
  isWeakAlicizationScreenSurfaceCue,
  isWeakAlicizationScreenSurfaceTarget,
  normalizeAlicizationDerivedMindStateBundle,
  normalizeAlicizationExecutionRuntimeContext,

} from '@proj-alicization/stage-shared'
import { app, desktopCapturer, globalShortcut, ipcMain, powerMonitor, systemPreferences, webContents } from 'electron'

import {
  alicizationChatAbortInvokeChannel,
  alicizationChatStartInvokeChannel,
  alicizationChatStreamChunk,
  alicizationChatStreamDispatchChannel,
  alicizationChatStreamError,
  alicizationChatStreamFinish,
  alicizationChatStreamMeta,
  alicizationChatStreamToolCall,
  alicizationChatStreamToolResult,
  alicizationDialogueResponded,
  alicizationKillSwitchStateChanged,
  alicizationSoulChanged,
  clampAlicizationPerformancePayloadToManifest,
  electronAlicizationVisualPresenceChanged,
  electronAlicizationVisualPresenceStateChanged,
  normalizeAlicizationEmotion,
  normalizeAlicizationPerformancePayload,
} from '../../../shared/eventa'
import { onAppBeforeQuit } from '../../libs/bootkit/lifecycle'
import { invokeAlicizationMcpCallToolFromMain, invokeAlicizationMcpListToolsFromMain } from '../airi/mcp-servers'
import { createAlicizationAgentRuntime } from './agent-runtime'
import {
  buildAlicizationRuntimeSystemBlock,
  deriveAlicizationAgentRuntimeTelemetryFromSession,
  deriveAlicizationRuntimeSnapshot,
} from './alicization-runtime-architecture'
import {
  createDefaultPerceptionState,
  detectInvitedInspectionIntent,
  extractInspectionHintTerms,
  getActiveAttentionAnchor,
  getActivePerceptionSceneResidue,
  isInternalAlicizationRepairPrompt,
  normalizePerceptionState,
  rememberPerceptionBrowserWorkflowState,
  rememberPerceptionSceneResidue,
  updatePerceptionStateWithObservation,
} from './attention-anchor'
import { updateVisualAttentionModel } from './attention-model'
import { createAlicizationBodyKernel } from './body-kernel'
import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
import { setupAlicizationDb } from './db'
import { createDesktopCaptureAccessRuntime } from './desktop-capture-runtime'
import { buildDialogueIngressGovernor } from './dialogue-ingress-governor'
import { buildDialogueTurnMemoryFragment } from './dialogue-memory'
import { createAlicizationDialogueSessionManager } from './dialogue-session-manager'
import {
  buildDialogueTurnSemantics,
} from './dialogue-turn-semantics'
import {
  buildAlicizationDigitalLifeRuntimeSurface,
} from './digital-life-kernel'
import {
  commitAlicizationDigitalLifeSpine,
  deriveAlicizationDigitalLifeSpine,
} from './digital-life-spine'
import { resolveAlicizationEmotionalTransitionDecay } from './emotional-ledger'
import {
  emptyAlicizationExecutionCallbackContext,
} from './execution-callback-runtime'
import {
  createAlicizationExecutionDeliveryRuntime,
} from './execution-delivery-runtime'
import {
  alicizationTerminalTaskThreadStatuses,
  readTaskThreadActivityAt,
  sanitizeExecutionLedgerText,
} from './execution-ledger-shared'
import { createAlicizationExecutorRuntime } from './executor-runtime'
import { buildAsyncFactMemoryFragments } from './fact-memory'
import { adjustProactiveReplyFromLongHorizonLearning, inferHostSocialContextsFromText } from './host-social-guidance'
import { buildQuietCompanionshipMindTurnEvent, deriveQuietCompanionshipOutcome } from './living-world-state'
import { createAlicizationLocalBrowserAutomationService } from './local-browser-automation'
import {

  buildAlicizationDesktopInspectionSceneSnapshot,
  buildAlicizationDesktopInspectionSuggestedActions,
  summarizeAlicizationDesktopInspection,
} from './local-desktop-inspection'
import { abortAlicizationDirectChatRun, abortAlicizationRunningChatRuns } from './main-chat-abort'
import { mainChatBackgroundRunTestInternals, runAlicizationMainChatBackground } from './main-chat-background-run'
import { handleAlicizationDirectChatStart } from './main-chat-direct-start'
import { syncAlicizationMainChatLlmRoute } from './main-chat-llm-route-sync'
import { createAlicizationMainChatRunStateController } from './main-chat-run-state'
import {
  createAlicizationMainChatSessionRuntime,
} from './main-chat-session-runtime'
import { createWorkingMemoryStore } from './life-core/working-memory-store'
import { acceptAlicizationMainChatStart } from './main-chat-start-acceptance'
import {
  resolveAlicizationChatStartPayloadPreDialogueSendIdentity,
  summarizeAlicizationPreDialogueSendIdentityForDebug,
} from './main-chat-start-awareness'
import { resolveAlicizationMainChatStartResult } from './main-chat-start-result'
import { createAbortError } from './main-chat-stream-primitives'
import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'
import {
  emptyAlicizationExecutionLedgerContext,
} from './memory-ledger-runtime'
import {
  generateMemoryDeliberationWithGateway as generateMemoryDeliberationWithMemoryOsGateway,
  generateMemoryRecollectionIntentWithGateway as generateMemoryRecollectionIntentWithMemoryOsGateway,
  generateMemoryRecollectionPlanWithGateway as generateMemoryRecollectionPlanWithMemoryOsGateway,
  generateMemoryRecollectionSpeechPlanWithGateway as generateMemoryRecollectionSpeechPlanWithMemoryOsGateway,
} from './memory-os/provider-planning'
import { buildMindContinuityFragment, buildMindContinuityRecallSeed } from './mind-continuity'
import { buildMindEcologyFromRuntimeSurface } from './mind-ecology'
import { sanitizeMindGovernanceDecisionTraceId } from './mind-governance-trace'
import { buildMindTruthContractLines, deriveMindTruthContract } from './mind-truth-contract'
import { isPersonaResidueMemoryText, normalizeOrganicMemoryText } from './organic-memory-hygiene'
import {
  attachSynthesizedReflections,
  buildDialogueReplyFeedbackOutcomeClosure,
  buildExecutionProposalFeedbackOutcomeClosure,
  buildExecutionResultFeedbackOutcomeClosure,
  buildProactiveFeedbackOutcomeClosure,
  buildReplyOutcomeClosure,
  deriveDialogueReplyFeedbackKind,
  deriveExecutionProposalFeedbackKind,
  deriveExecutionResultFeedbackKind,
} from './outcome-reinforcement'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import { mergePreferredSelfContinuityAuthority } from './person-state-projection-resolution'
import { progressProactiveCadenceState } from './proactive-cadence'
import {
  createDefaultProactiveLoopState,
  normalizeProactiveLoopState,
  proactiveDismissCooldownMs,
  proactiveImplicitIgnoredAfterMs,
  proactiveReplyWindowMs,
  recoverProactiveRhythmAfterDream,
  registerProactiveDelivery,
  reportExplicitProactiveFeedback,
  updateLateNightActivityState,
} from './proactive-feedback'
import {
  buildProactiveLayeredContext,
  inferScenarioFromContext,
  isLateNightWindow,
} from './proactive-layered-context'
import { evaluateProactivePolicy } from './proactive-policy'
import {
  rankScreenSemanticCaptureCandidates,
} from './proactive-screen-semantic'
import {
  alicizationProjectStatePersistenceLandedReminder,
  alicizationProjectStatePersistenceNextClosureReminder,
} from './project-state-answer-governance'
import {
  buildAlicizationProjectStateExtraSystemBlocks,
  buildAlicizationProjectStateSystemBlock,
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateSnapshot,
  resolveAlicizationProjectStatusBrief,
  scoreAlicizationProjectAwarenessLine,
} from './project-state-brief'
import { preferProjectStateSpecificClosureSummary } from './project-state-closure-preference'
import {
  deriveCompactProjectStateNextFocusSummary,
  deriveCompactProjectStateOpenFocusSummary,
} from './project-state-focus'
import { buildReflectionLedgerFragment } from './reflection-memory'
import { createAlicizationReplayBenchmarkRuntime } from './replay-benchmark-runtime'
import { createAlicizationAgentSessionMirrorRuntime } from './runtime-agent-session-mirror'
import { writeAlicizationAtomicContent } from './runtime-atomic-write'
import { createAlicizationCardPromptRuntime } from './runtime-card-prompt'
import { createAlicizationRuntimeCardScopeLifecycle } from './runtime-card-scope-lifecycle'
import { createAlicizationRuntimeCardScopeOrchestrator } from './runtime-card-scope-orchestrator'
import { createAlicizationRuntimeCardScopeState } from './runtime-card-scope-state'
import { createAlicizationChatPerceptionAugmentRuntime } from './runtime-chat-perception-augment'
import {
  buildChatInspectionGroundingParts,
} from './runtime-chat-prompt-blocks'
import { createAlicizationChatStreamRuntime } from './runtime-chat-stream'
import { createAlicizationRuntimeContinuityPresenceComposition } from './runtime-continuity-presence-composition'
import { createAlicizationDeliveryReminderRuntime } from './runtime-delivery-reminders'
import { createAlicizationRuntimeDialogueDelivery } from './runtime-dialogue-delivery'
import { createAlicizationRuntimeDialogueFeedback } from './runtime-dialogue-feedback'
import { createAlicizationDreamRuntime } from './runtime-dream'
import { createAlicizationRuntimeExecutionDelivery } from './runtime-execution-delivery'
import { createAlicizationRuntimeExecutionFeedback } from './runtime-execution-feedback'
import { buildAlicizationChatStreamEmbodimentMeta, buildCompressedNativeImageDataUrl, buildDefaultDialoguePerformancePayload, buildMindTurnTraceEvents, coerceConversationTurnToMindGovernedPayload, isAbortError, latestUserMessageContainsVisualInput, normalizeDialogueRespondedPayload, readStringValue } from './runtime-governance'
import { registerAlicizationChatInvokeHandlers } from './runtime-invoke-handlers-chat'
import { registerAlicizationDialogueInvokeHandlers } from './runtime-invoke-handlers-dialogue'
import { registerAlicizationMaintenanceInvokeHandlers } from './runtime-invoke-handlers-maintenance'
import { registerAlicizationMemoryInvokeHandlers } from './runtime-invoke-handlers-memory'
import { registerAlicizationSoulStateInvokeHandlers } from './runtime-invoke-handlers-soul-state'
import { registerAlicizationTaskInvokeHandlers } from './runtime-invoke-handlers-task'
import { createAlicizationRuntimeMainChatRuntime } from './runtime-main-chat-runtime'
import { createAlicizationMainGatewayConfigRuntime } from './runtime-main-gateway-config'
import { createAlicizationMainGatewayOneShotRuntime } from './runtime-main-gateway-one-shot'
import { createAlicizationRuntimeMemoryRuntime } from './runtime-memory-runtime'
import { createAlicizationRuntimeMemorySupportingComposition } from './runtime-memory-supporting-composition'
import { createAlicizationMindStateRuntime } from './runtime-mind-state'
import {
  normalizeOrganicRecallText,
  selectPromptActiveThoughts,
  shouldExtendContextualRecall,
} from './runtime-organic-recall'
import {
  buildInspectionSceneResidue,
  buildProactivePerceptionSignals,
  buildProactivePerceptionSystemBlock,
  buildScreenSemanticSummaryFromResidue,
  describePerceptionTarget,
  getUsablePerceptionSceneResidue,
  isGenericScreenInspectionRequest,
  isResidueBackedScreenSemanticSummary,
  isWeakGenericBrowserFocusTarget,
  purgeWeakGenericBrowserInspectionState,
  resolveForegroundDecisionTarget,
  shouldSuppressWeakGenericBrowserInspectionAnchor,
  shouldUsePerceptionResidueAsLiveSceneSummary,
} from './runtime-perception-helpers'
import { createAlicizationRuntimeProactiveFeedback } from './runtime-proactive-feedback'
import {
  executeBuiltinRealtimeQuery,
  normalizeReminderMessage,
  sanitizeBriefText,
} from './runtime-realtime'
import {
  alicizationCardActiveSessionMetaKey,
  alicizationCardKillSwitchMetaKey,
  alicizationDialogueAckStateMetaKey,
  alicizationDialogueReplyFeedbackAckMetaKey,
  alicizationDreamLastRunMetaKey,
  alicizationExecutionDeliveryStateMetaKey,
  alicizationPerceptionStateMetaKey,
  alicizationProactiveLoopStateMetaKey,
  alicizationSubconsciousPersistMs,
  alicizationSubconsciousStateMetaKey,
  alicizationSubconsciousTickMs,
  alicizationVisualPresenceStateMetaKey,
  buildSoulBody,
  chatRunFinishedRetentionMs,
  clamp01,
  currentSoulSchemaVersion,
  defaultAlicizationCardId,
  defaultFrontmatter,
  defaultSoulBody,
  dialogueDeliveryRetryBaseMs,
  dialogueDeliveryRetryMaxAttempts,
  dialogueDeliveryRetryMaxMs,
  dreamMaxCharsPerAssistantTurn,
  dreamMaxCharsPerUserTurn,
  dreamMaxTotalChars,
  dreamMaxTurns,
  extractPersonaNotesFromBody,
  hashContent,
  inspectionGroundingImageJpegQuality,
  inspectionGroundingImageMaxHeight,
  inspectionGroundingImageMaxWidth,
  normalizeCardId,
  normalizeCoreIncarnation,
  normalizeCustomDirectives,
  normalizeGender,
  normalizeHostAttitude,
  normalizeMindAge,
  parseSoul,
  reminderClaimBatchSize,
  reminderLlmRetryDelayMs,
  reminderMaxMessageChars,
  reminderMaxMinutes,
  reminderMinMinutes,
  reminderOverdueTierThresholdMinutes,
  resolveAlicizationSoulPersonaKernel,
  sanitizeMultilineText,
  sanitizeText,
  subconsciousInterruptionProbeTimeoutMs,
  syncPersonalityBaselineInBody,
  toSoulContent,
  winRenameRetryDelaysMs,
  withNeedsGenesis,
} from './runtime-soul'
import { createAlicizationRuntimeSoulLifecycle } from './runtime-soul-lifecycle'
import {
  isAlicizationAutonomousDialogueFamily,
  isAlicizationAutonomousDialogueOrigin,
  resolveAlicizationAutonomousDialogueFamilyClassification,
  resolveAlicizationAutonomousDialogueOrigin,
  resolveAlicizationAutonomousDialogueStructuredFormat,
} from './runtime-structured-format'
import { createAlicizationSubconsciousProbeRuntime } from './runtime-subconscious-probe'
import { createAlicizationSubconsciousTickRuntime } from './runtime-subconscious-tick'
import { createAlicizationRuntimeSupportingRuntimesComposition } from './runtime-supporting-runtimes-composition'
import { resolvePreferredRuntimeSurface } from './runtime-surface-continuity-selection'
import {
  appendContentPartsToLatestUserMessage,
  hasImageTransportContent,
  normalizeTransportMessageContent,
  parseJsonObjectFromText,
  readTransportContentAsText,
} from './runtime-transport-content'
import { createAlicizationSensoryBus } from './sensory-bus'
import {
  deriveRuntimeCaptureGovernance,
  deriveSensoryCaptureSnapshotFromAccessRuntimeSnapshot,
  deriveSensoryCaptureSnapshotFromDiagnostics,
} from './sensory-capture'
import { createAlicizationSensoryRuntime } from './sensory-runtime'
import {
  getAlicizationCardKillSwitchSnapshot,
  getAlicizationKillSwitchSnapshot,
  isAlicizationKillSwitchSuspended,
  onAlicizationCardKillSwitchChanged,
  onAlicizationKillSwitchChanged,
  setAlicizationAuditLogger,
  setAlicizationCardKillSwitchState,
  setAlicizationKillSwitchState,
} from './state'
import { assessAlicizationTaskRouting } from './task-routing-assessor'
import { createTaskThreadOrchestrator } from './task-thread-orchestrator'
import { registerDialogueWorldThreadAssistantTurn } from './turn-outcome-reducer'
import {
  buildVisualRecallSeed,
  buildVisualSedimentFragment,
  createDefaultVisualPresenceState,
  normalizeVisualPresenceState,
  updateVisualPresenceState,
} from './visual-episodic-memory'
import { buildVisualHeartbeat } from './visual-heartbeat'

function inferRuntimeProjectCarrySourceTags(input: {
  sourceTags?: string[] | null
  inwardLine?: string | null
  summary?: string | null
  openingGuidance?: string | null
  carryReason?: string | null
  carrySummary?: string | null
  carryNarrative?: string | null
  sameHerSelfLine?: string | null
  sameHerHoldDetail?: string | null
  nextClosureTarget?: string | null
  companionHeadlineLine?: string | null
}) {
  const combined = [
    ...(input.sourceTags ?? []),
    input.inwardLine,
    input.summary,
    input.openingGuidance,
    input.carryReason,
    input.carrySummary,
    input.carryNarrative,
    input.sameHerSelfLine,
    input.sameHerHoldDetail,
    input.nextClosureTarget,
    input.companionHeadlineLine,
  ]
    .map(value => typeof value === 'string' ? value.trim().toLowerCase() : '')
    .filter(Boolean)
    .join(' ')

  const carriesSameHerProjectAuthority
    = combined.includes('same phase 1 digital life')
      || combined.includes('same living line')
      || combined.includes('same-her')
      || combined.includes('same her')
      || combined.includes('one continuous her')
      || combined.includes('continuous her')
      || Boolean(typeof input.sameHerSelfLine === 'string' && input.sameHerSelfLine.trim())
      || Boolean(typeof input.sameHerHoldDetail === 'string' && input.sameHerHoldDetail.trim())
  const carriesNextClosureAuthority = Boolean(
    typeof input.nextClosureTarget === 'string' && input.nextClosureTarget.trim(),
  )
  const carriesCompanionHeadlineAuthority = Boolean(
    typeof input.companionHeadlineLine === 'string' && input.companionHeadlineLine.trim(),
  )

  return [
    'project-state-carry',
    ...(
      combined.includes('continuity-execution-callback-project-carry')
      || combined.includes('execution-callback project-carry')
      || combined.includes('callback project-carry')
        ? ['continuity-execution-callback-project-carry']
        : []
    ),
    ...(carriesNextClosureAuthority ? ['project-state-next-closure'] : []),
    ...(carriesSameHerProjectAuthority ? ['project-state-same-her'] : []),
    ...(carriesCompanionHeadlineAuthority ? ['project-state-companion-headline'] : []),
  ]
}

function looksLikeSceneContaminatedRuntimeSameHerSelfLine(raw: unknown) {
  if (typeof raw !== 'string')
    return false

  const normalized = raw.trim()
  if (!normalized)
    return false

  const lowered = normalized.toLowerCase()
  const carriesSameHerProjectBaseline
    = lowered.includes('same phase 1 digital life')
      || lowered.includes('same living line')
      || lowered.includes('continuous her')
      || lowered.includes('one continuous her')
  const carriesSceneNarration
    = /宿主正在|宿主还在沿着|host is|host is still following|runtime\.ts|index\.ts|callback result seam|foreground|scene|window|screen|工作线程|work thread|trust seam/u.test(normalized)

  return carriesSameHerProjectBaseline && carriesSceneNarration
}

function preferStrongerPersistedSameHerSelfLine(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = typeof input.current === 'string' ? input.current.trim() : ''
  const candidate = typeof input.candidate === 'string' ? input.candidate.trim() : ''

  if (!current)
    return candidate || ''
  if (!candidate)
    return current
  if (current === candidate)
    return current

  const currentLower = current.toLowerCase()
  const candidateLower = candidate.toLowerCase()
  const currentMentionsContinuousHer
    = currentLower.includes('continuous her') || currentLower.includes('one continuous her')
  const candidateMentionsContinuousHer
    = candidateLower.includes('continuous her') || candidateLower.includes('one continuous her')
  const currentOnlyCarriesLivingLine
    = currentLower.includes('same living line') && !currentMentionsContinuousHer
  const candidateOnlyCarriesLivingLine
    = candidateLower.includes('same living line') && !candidateMentionsContinuousHer

  if (currentMentionsContinuousHer && candidateOnlyCarriesLivingLine)
    return current
  if (candidateMentionsContinuousHer && currentOnlyCarriesLivingLine)
    return candidate

  return candidate.length > current.length ? candidate : current
}

const alicizationSelfEvolutionVersionRuntimeMetaKey = 'self_evolution_version_runtime_v1'

function resolvePreferredEmbodimentClosureSummary(...values: Array<unknown>) {
  const candidates = values
    .map((value) => {
      const normalized = typeof value === 'string'
        ? sanitizeText(value, '') || null
        : null

      if (!normalized)
        return null

      const lower = normalized.toLowerCase()
      const laneScore = [
        lower.includes('face'),
        lower.includes('motion'),
        lower.includes('lipsync'),
        lower.includes('voice'),
      ].filter(Boolean).length
      let continuityStrength = 0
      if (lower.includes('repair-before-closeness'))
        continuityStrength += 10
      if (lower.includes('rest-protective'))
        continuityStrength += 10
      if (lower.includes('quiet-companionship') || lower.includes('quiet accompaniment'))
        continuityStrength += 8
      if (
        lower.includes('audible-body-carry')
        || lower.includes('living audio thread')
        || lower.includes('keep the same living line audible')
        || lower.includes('same living line audible')
      ) {
        continuityStrength += 8
      }
      if (
        lower.includes('body, lipsync, and voice')
        || lower.includes('body, voice, and lipsync')
        || lower.includes('body、lipsync 和 voice')
      ) {
        continuityStrength += 6
      }
      if (lower.includes('same living line') || lower.includes('one living her') || lower.includes('one continuous her'))
        continuityStrength += 3
      if (lower.includes('rejoin'))
        continuityStrength += 2

      return {
        normalized,
        laneScore,
        continuityStrength,
      }
    })
    .filter((value): value is { normalized: string, laneScore: number, continuityStrength: number } => Boolean(value))

  if (candidates.length === 0)
    return null

  return candidates
    .sort((left, right) => {
      if (right.continuityStrength !== left.continuityStrength)
        return right.continuityStrength - left.continuityStrength
      if (right.laneScore !== left.laneScore)
        return right.laneScore - left.laneScore
      return right.normalized.length - left.normalized.length
    })[0]
    ?.normalized ?? null
}

function scoreProjectSameHerLine(value: string | null | undefined) {
  const normalized = typeof value === 'string'
    ? sanitizeText(value, '')?.trim().toLowerCase() ?? ''
    : ''
  if (!normalized)
    return 0

  let score = normalized.length >= 120 ? 2 : normalized.length >= 72 ? 1 : 0
  if (/same digital life|same-her|one living her|one living digital life|one continuous her|同一个她|同一个 her/u.test(normalized))
    score += 3
  if (/holding together mainly through|face|motion|voice|lipsync|cross-modal|embodiment closure|unfinished closure/u.test(normalized))
    score += 2
  if (
    /still-voiced face-and-mouth line|still-voiced motion-and-mouth line/u.test(normalized)
    || /holding together mainly through face,\s*lipsync,\s*and voice|holding together mainly through motion,\s*lipsync,\s*and voice/u.test(normalized)
  ) {
    score += 2
  }
  if (isAlicizationThinProjectAwarenessLine(normalized))
    score -= 2
  return score
}

function looksLikeRicherLivingSelfSameHerLine(value: string | null | undefined) {
  const normalized = typeof value === 'string'
    ? sanitizeText(value, '')?.trim().toLowerCase() ?? ''
    : ''
  if (!normalized)
    return false

  return /one living her|one living digital life|holding together mainly through|face|motion|voice|lipsync|cross-modal|embodiment closure|same living line|without splitting her continuity|same phase 1 digital life|one continuous her/u.test(normalized)
}

function looksLikeThinProjectStateAwarenessGuidance(value: string | null | undefined) {
  const normalized = typeof value === 'string'
    ? sanitizeText(value, '')?.trim().toLowerCase() ?? ''
    : ''
  if (!normalized)
    return false

  const carriesStrongerSameHerAwareness
    = /one living her|one living digital life|local-first digital life project|same living line|without splitting her continuity|unfinished phase 1 closure seam|holding together mainly through|still-voiced|resident body line|living mouth line/u.test(normalized)

  if (carriesStrongerSameHerAwareness)
    return false

  return isAlicizationThinProjectAwarenessLine(normalized)
    || /keep the latest landed project-state progress explicit in the answer|keep the still-open closure work explicit in the answer|keep extending cross-modal same-her proof across longer desktop runs|explicit in the visible reply|explicit in the rewritten answer/u.test(normalized)
}

function scoreProjectStateAuditPreDialogueAwarenessSummary(value: string | null | undefined) {
  const normalized = typeof value === 'string'
    ? sanitizeText(value, '')?.trim() ?? ''
    : ''
  if (!normalized)
    return 0

  let score = scoreAlicizationProjectAwarenessLine(normalized)
  if (/one living her|one living digital life|local-first digital life project|same living line|without splitting her continuity|unfinished phase 1 closure seam|holding together mainly through|still-voiced|resident body line|living mouth line/u.test(normalized))
    score += 3
  if (looksLikeThinProjectStateAwarenessGuidance(normalized))
    score -= 2
  return score
}

function preferProjectStateAuditPreDialogueAwarenessSummary(...values: Array<unknown>) {
  const normalizedValues = values
    .map(value => typeof value === 'string' ? sanitizeText(value, '')?.trim() ?? '' : '')
    .filter(Boolean)

  if (normalizedValues.length === 0)
    return null

  return normalizedValues.slice(1).reduce<string>((best, candidate) => {
    const bestScore = scoreProjectStateAuditPreDialogueAwarenessSummary(best)
    const candidateScore = scoreProjectStateAuditPreDialogueAwarenessSummary(candidate)

    if (candidateScore > bestScore)
      return candidate

    if (candidateScore === bestScore && candidate.length > best.length)
      return candidate

    return best
  }, normalizedValues[0]!)
}

function resolvePreferredProjectSameHerSummary(...values: Array<unknown>) {
  const normalizedValues = values
    .map(value => typeof value === 'string' ? sanitizeText(value, '')?.trim() ?? '' : '')
    .filter(Boolean)

  if (normalizedValues.length === 0)
    return null

  return normalizedValues.slice(1).reduce<string>((best, candidate) => {
    if (
      looksLikeRicherLivingSelfSameHerLine(candidate)
      && scoreProjectSameHerLine(candidate) >= scoreProjectSameHerLine(best) + 2
    ) {
      return candidate
    }

    return best
  }, normalizedValues[0]!)
}

function buildProjectStateAuditContinuitySummary(input: {
  sameHerSummary: string | null | undefined
  sameHerHoldDetail?: string | null | undefined
  sameHerDriftRiskSummary?: string | null | undefined
  proactiveSameHerGapSummary?: string | null | undefined
  currentPhaseSummary: string | null | undefined
  landedProgressSummary: string | null | undefined
  openClosureSummary: string | null | undefined
  openFocusSummary?: string | null | undefined
  nextFocusSummary?: string | null | undefined
  nextClosureTargetSummary: string | null | undefined
  memoryClosureSummary?: string | null | undefined
  recallWhySummary?: string | null | undefined
  emotionalClosureSummary?: string | null | undefined
  embodimentClosureSummary: string | null | undefined
}) {
  return [
    input.sameHerSummary ? `same-her=${input.sameHerSummary}` : '',
    input.sameHerHoldDetail ? `hold=${input.sameHerHoldDetail}` : '',
    input.sameHerDriftRiskSummary ? `drift=${input.sameHerDriftRiskSummary}` : '',
    input.proactiveSameHerGapSummary ? `proactive-gap=${input.proactiveSameHerGapSummary}` : '',
    input.currentPhaseSummary ? `phase=${input.currentPhaseSummary}` : '',
    input.landedProgressSummary ? `landed=${input.landedProgressSummary}` : '',
    input.openClosureSummary ? `open=${input.openClosureSummary}` : '',
    input.openFocusSummary ? `open-focus=${input.openFocusSummary}` : '',
    input.nextFocusSummary ? `next-focus=${input.nextFocusSummary}` : '',
    input.nextClosureTargetSummary ? `next=${input.nextClosureTargetSummary}` : '',
    input.memoryClosureSummary ? `memory=${input.memoryClosureSummary}` : '',
    input.recallWhySummary ? `recall=${input.recallWhySummary}` : '',
    input.emotionalClosureSummary ? `closure=${input.emotionalClosureSummary}` : '',
    input.embodimentClosureSummary ? `body=${input.embodimentClosureSummary}` : '',
  ].filter(Boolean).join(' | ') || null
}

function preferRicherProjectStateAuditText(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = typeof input.current === 'string'
    ? sanitizeText(input.current, '') || null
    : null
  const candidate = typeof input.candidate === 'string'
    ? sanitizeText(input.candidate, '') || null
    : null

  if (!current)
    return candidate
  if (!candidate)
    return current
  if (current === candidate)
    return current

  const preferredClosureAuthority = preferStrongerContinuityClosureAuthority(current, candidate)
  if (preferredClosureAuthority)
    return preferredClosureAuthority

  if (candidate.startsWith(current) && candidate.length >= current.length + 24)
    return candidate
  if (current.startsWith(candidate) && current.length >= candidate.length + 24)
    return current

  return candidate.length > current.length ? candidate : current
}

function looksLikeVisibleReplyOpenClosureGuidance(value: string | null) {
  if (!value)
    return false

  const lower = value.toLowerCase()
  return lower.includes('explicit in the answer')
    || lower.includes('explicit in the visible reply')
    || lower.includes('explicit in the rewritten answer')
    || lower.includes('before the answer widens outward')
    || lower.includes('stay on the repair-before-closeness line')
}

function mergeProjectStateAuditOpenClosureSummary(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = typeof input.current === 'string'
    ? sanitizeText(input.current, '') || null
    : null
  const candidate = typeof input.candidate === 'string'
    ? sanitizeText(input.candidate, '') || null
    : null

  const preferred = preferRicherProjectStateAuditText({
    current,
    candidate,
  })
  if (!preferred)
    return null

  const secondary = preferred === current ? candidate : current
  if (!secondary || preferred.includes(secondary))
    return preferred

  const preferredLooksLikeGuidance = looksLikeVisibleReplyOpenClosureGuidance(preferred)
  const secondaryLooksLikeGuidance = looksLikeVisibleReplyOpenClosureGuidance(secondary)

  if (preferredLooksLikeGuidance === secondaryLooksLikeGuidance)
    return preferred

  const canonicalOpenClosureTruth = preferredLooksLikeGuidance ? secondary : preferred
  const visibleReplyGuidance = preferredLooksLikeGuidance ? preferred : secondary
  return `${canonicalOpenClosureTruth} Visible reply guidance: ${visibleReplyGuidance}`
}

function mergeProjectStateAuditFocusSummary(input: {
  current?: unknown
  candidate?: unknown
}) {
  const segments = [
    ...(typeof input.current === 'string' ? sanitizeText(input.current, '') : '')
      .split('/'),
    ...(typeof input.candidate === 'string' ? sanitizeText(input.candidate, '') : '')
      .split('/'),
  ]
    .map(segment => segment.trim())
    .filter(Boolean)

  if (segments.length === 0)
    return null

  return [...new Set(segments)].join('/')
}

function scoreProjectStateAuditPhaseSummary(value: string) {
  const normalized = value.trim()
  if (!normalized)
    return 0

  let score = 0
  if (/phase 1:\s*local digital life/i.test(normalized))
    score += 6
  if (/phase 1 local digital life/i.test(normalized))
    score += 4
  if (/phase 1/i.test(normalized))
    score += 2
  if (/alicization/i.test(normalized))
    score += 1
  if (/closure|same-her|living her|digital life/i.test(normalized))
    score += 1

  return score
}

function preferProjectStateAuditPhaseSummary(...values: Array<unknown>) {
  const normalizedValues = values
    .map(value => typeof value === 'string' ? sanitizeText(value, '')?.trim() ?? '' : '')
    .filter(Boolean)

  if (normalizedValues.length === 0)
    return null

  return normalizedValues.slice(1).reduce<string>((best, candidate) => {
    const bestScore = scoreProjectStateAuditPhaseSummary(best)
    const candidateScore = scoreProjectStateAuditPhaseSummary(candidate)

    if (candidateScore > bestScore)
      return candidate

    if (candidateScore === bestScore && candidate.length > best.length)
      return candidate

    return best
  }, normalizedValues[0]!)
}

function mergeVisibleReplyProjectStateAudit(input: {
  primary?: {
    sameHerSummary?: string | null
    sameHerHoldDetail?: string | null
    sameHerDriftRiskSummary?: string | null
    proactiveSameHerGapSummary?: string | null
    currentPhaseSummary?: string | null
    landedProgressSummary?: string | null
    openClosureSummary?: string | null
    openFocusSummary?: string | null
    nextFocusSummary?: string | null
    nextClosureTargetSummary?: string | null
    memoryClosureSummary?: string | null
    recallWhySummary?: string | null
    emotionalClosureSummary?: string | null
    emotionalClosureCue?: string | null
    preDialogueAwarenessSummary?: string | null
    continuitySummary?: string | null
    embodimentClosureSummary?: string | null
    preservedIntoRewrite?: boolean
    rewriteClosureApplied?: boolean
  } | null
  payload?: {
    sameHerSummary?: string | null
    sameHerHoldDetail?: string | null
    sameHerDriftRiskSummary?: string | null
    proactiveSameHerGapSummary?: string | null
    currentPhaseSummary?: string | null
    landedProgressSummary?: string | null
    openClosureSummary?: string | null
    openFocusSummary?: string | null
    nextFocusSummary?: string | null
    nextClosureTargetSummary?: string | null
    memoryClosureSummary?: string | null
    recallWhySummary?: string | null
    emotionalClosureSummary?: string | null
    emotionalClosureCue?: string | null
    preDialogueAwarenessSummary?: string | null
    continuitySummary?: string | null
    embodimentClosureSummary?: string | null
    preservedIntoRewrite?: boolean
    rewriteClosureApplied?: boolean
  } | null
  structured?: {
    sameHerSummary?: string | null
    sameHerHoldDetail?: string | null
    sameHerDriftRiskSummary?: string | null
    proactiveSameHerGapSummary?: string | null
    currentPhaseSummary?: string | null
    landedProgressSummary?: string | null
    openClosureSummary?: string | null
    openFocusSummary?: string | null
    nextFocusSummary?: string | null
    nextClosureTargetSummary?: string | null
    memoryClosureSummary?: string | null
    recallWhySummary?: string | null
    emotionalClosureSummary?: string | null
    emotionalClosureCue?: string | null
    preDialogueAwarenessSummary?: string | null
    continuitySummary?: string | null
    embodimentClosureSummary?: string | null
    preservedIntoRewrite?: boolean
    rewriteClosureApplied?: boolean
  } | null
}) {
  if (!input.primary && !input.payload && !input.structured)
    return null

  const mergedSameHerSummary = resolvePreferredProjectSameHerSummary(
    input.primary?.sameHerSummary,
    input.payload?.sameHerSummary,
    input.structured?.sameHerSummary,
  )
  const mergedSameHerHoldDetail
    = preferRicherProjectStateAuditText({
      current: input.primary?.sameHerHoldDetail,
      candidate: preferRicherProjectStateAuditText({
        current: input.payload?.sameHerHoldDetail,
        candidate: input.structured?.sameHerHoldDetail,
      }),
    })
    ?? null
  const mergedSameHerDriftRiskSummary = preferRicherProjectStateAuditText({
    current: preferRicherProjectStateAuditText({
      current: input.primary?.sameHerDriftRiskSummary,
      candidate: input.payload?.sameHerDriftRiskSummary,
    }),
    candidate: input.structured?.sameHerDriftRiskSummary,
  })
  const mergedProactiveSameHerGapSummary = preferRicherProjectStateAuditText({
    current: preferRicherProjectStateAuditText({
      current: input.primary?.proactiveSameHerGapSummary,
      candidate: input.payload?.proactiveSameHerGapSummary,
    }),
    candidate: input.structured?.proactiveSameHerGapSummary,
  })
  const mergedLandedProgressSummary = preferRicherProjectStateAuditText({
    current: preferRicherProjectStateAuditText({
      current: input.primary?.landedProgressSummary,
      candidate: input.payload?.landedProgressSummary,
    }),
    candidate: input.structured?.landedProgressSummary,
  })
  const mergedCurrentPhaseSummary = preferProjectStateAuditPhaseSummary(
    input.primary?.currentPhaseSummary,
    input.payload?.currentPhaseSummary,
    input.structured?.currentPhaseSummary,
  )
  const mergedOpenClosureSummary = mergeProjectStateAuditOpenClosureSummary({
    current: mergeProjectStateAuditOpenClosureSummary({
      current: input.primary?.openClosureSummary,
      candidate: input.payload?.openClosureSummary,
    }),
    candidate: input.structured?.openClosureSummary,
  })
  const mergedOpenFocusSummary = mergeProjectStateAuditFocusSummary({
    current: mergeProjectStateAuditFocusSummary({
      current: input.primary?.openFocusSummary,
      candidate: input.payload?.openFocusSummary,
    }),
    candidate: input.structured?.openFocusSummary,
  })
  const mergedNextFocusSummary = mergeProjectStateAuditFocusSummary({
    current: mergeProjectStateAuditFocusSummary({
      current: input.primary?.nextFocusSummary,
      candidate: input.payload?.nextFocusSummary,
    }),
    candidate: input.structured?.nextFocusSummary,
  })
  const mergedNextClosureTargetSummary = preferRicherProjectStateAuditText({
    current: preferRicherProjectStateAuditText({
      current: input.primary?.nextClosureTargetSummary,
      candidate: input.payload?.nextClosureTargetSummary,
    }),
    candidate: input.structured?.nextClosureTargetSummary,
  })
  const mergedMemoryClosureSummary = preferRicherProjectStateAuditText({
    current: preferRicherProjectStateAuditText({
      current: input.primary?.memoryClosureSummary,
      candidate: input.payload?.memoryClosureSummary,
    }),
    candidate: input.structured?.memoryClosureSummary,
  })
  const mergedRecallWhySummary = preferRicherProjectStateAuditText({
    current: preferRicherProjectStateAuditText({
      current: input.primary?.recallWhySummary,
      candidate: input.payload?.recallWhySummary,
    }),
    candidate: input.structured?.recallWhySummary,
  })
  const mergedEmotionalClosureSummary = preferRicherProjectStateAuditText({
    current: preferRicherProjectStateAuditText({
      current: input.primary?.emotionalClosureSummary,
      candidate: input.payload?.emotionalClosureSummary,
    }),
    candidate: input.structured?.emotionalClosureSummary,
  })
  const mergedEmotionalClosureCue = preferRicherProjectStateAuditText({
    current: preferRicherProjectStateAuditText({
      current: input.primary?.emotionalClosureCue,
      candidate: input.payload?.emotionalClosureCue,
    }),
    candidate: input.structured?.emotionalClosureCue,
  })
  const structuredPreDialogueAwarenessSummary = input.structured?.preDialogueAwarenessSummary ?? null
  const primaryPreDialogueAwarenessSummary = input.primary?.preDialogueAwarenessSummary ?? null
  const payloadPreDialogueAwarenessSummary = input.payload?.preDialogueAwarenessSummary ?? null
  const richerCarriedPreDialogueAwarenessSummary = preferProjectStateAuditPreDialogueAwarenessSummary(
    primaryPreDialogueAwarenessSummary,
    payloadPreDialogueAwarenessSummary,
    structuredPreDialogueAwarenessSummary,
  )
  const mergedEmbodimentClosureSummary = resolvePreferredEmbodimentClosureSummary(
    input.primary?.embodimentClosureSummary,
    input.structured?.embodimentClosureSummary,
    input.payload?.embodimentClosureSummary,
  )

  return {
    sameHerSummary: mergedSameHerSummary,
    sameHerHoldDetail: mergedSameHerHoldDetail,
    sameHerDriftRiskSummary: mergedSameHerDriftRiskSummary,
    proactiveSameHerGapSummary: mergedProactiveSameHerGapSummary,
    currentPhaseSummary: mergedCurrentPhaseSummary,
    landedProgressSummary: mergedLandedProgressSummary,
    openClosureSummary: mergedOpenClosureSummary,
    openFocusSummary: mergedOpenFocusSummary,
    nextFocusSummary: mergedNextFocusSummary,
    nextClosureTargetSummary: mergedNextClosureTargetSummary,
    memoryClosureSummary: mergedMemoryClosureSummary,
    recallWhySummary: mergedRecallWhySummary,
    emotionalClosureSummary: mergedEmotionalClosureSummary,
    emotionalClosureCue: mergedEmotionalClosureCue,
    preDialogueAwarenessSummary:
      resolveAlicizationProjectPreDialogueAwarenessLine({
        runtimeProjectState: {
          preDialogueAwarenessLine: richerCarriedPreDialogueAwarenessSummary,
          preDialogueAwarenessSummary: richerCarriedPreDialogueAwarenessSummary,
          companionHeadlineLine: mergedSameHerSummary ?? null,
          sameHerSelfLine: mergedSameHerSummary ?? null,
          sameHerHoldDetail: mergedSameHerHoldDetail ?? null,
          companionBriefingLine: mergedEmotionalClosureSummary ?? null,
          proactiveSameHerGap: mergedProactiveSameHerGapSummary ?? null,
          landedProgressSummary: mergedLandedProgressSummary ?? null,
          openClosureSummary: mergedOpenClosureSummary ?? null,
          nextClosureTargetSummary: mergedNextClosureTargetSummary ?? null,
          emotionalClosureSummary: mergedEmotionalClosureSummary ?? null,
          sameHerDriftRiskSummary: mergedSameHerDriftRiskSummary ?? null,
        },
        fallbackProjectState: {
          preDialogueAwarenessLine: payloadPreDialogueAwarenessSummary,
          preDialogueAwarenessSummary: payloadPreDialogueAwarenessSummary,
          companionHeadlineLine: input.payload?.sameHerSummary ?? null,
          sameHerSelfLine: input.payload?.sameHerSummary ?? null,
          sameHerHoldDetail: input.payload?.sameHerHoldDetail ?? null,
          companionBriefingLine: input.payload?.emotionalClosureSummary ?? null,
          proactiveSameHerGap: input.payload?.proactiveSameHerGapSummary ?? null,
          landedProgressSummary: input.payload?.landedProgressSummary ?? null,
          openClosureSummary: input.payload?.openClosureSummary ?? null,
          nextClosureTargetSummary: input.payload?.nextClosureTargetSummary ?? null,
          emotionalClosureSummary: input.payload?.emotionalClosureSummary ?? null,
          sameHerDriftRiskSummary: input.payload?.sameHerDriftRiskSummary ?? null,
        },
      })
      ?? richerCarriedPreDialogueAwarenessSummary
      ?? payloadPreDialogueAwarenessSummary,
    continuitySummary: buildProjectStateAuditContinuitySummary({
      sameHerSummary: mergedSameHerSummary,
      sameHerHoldDetail: mergedSameHerHoldDetail,
      sameHerDriftRiskSummary: mergedSameHerDriftRiskSummary,
      proactiveSameHerGapSummary: mergedProactiveSameHerGapSummary,
      currentPhaseSummary: mergedCurrentPhaseSummary,
      landedProgressSummary: mergedLandedProgressSummary,
      openClosureSummary: mergedOpenClosureSummary,
      openFocusSummary: mergedOpenFocusSummary,
      nextFocusSummary: mergedNextFocusSummary,
      nextClosureTargetSummary: mergedNextClosureTargetSummary,
      memoryClosureSummary: mergedMemoryClosureSummary,
      recallWhySummary: mergedRecallWhySummary,
      emotionalClosureSummary: mergedEmotionalClosureSummary,
      embodimentClosureSummary: mergedEmbodimentClosureSummary,
    }),
    embodimentClosureSummary: mergedEmbodimentClosureSummary,
    preservedIntoRewrite:
      input.primary?.preservedIntoRewrite
      ?? input.payload?.preservedIntoRewrite
      ?? input.structured?.preservedIntoRewrite
      ?? false,
    rewriteClosureApplied:
      input.primary?.rewriteClosureApplied
      ?? input.payload?.rewriteClosureApplied
      ?? input.structured?.rewriteClosureApplied
      ?? false,
  }
}

function readProjectStateSummarySegments(summaryLine: string | null | undefined) {
  return (typeof summaryLine === 'string' ? summaryLine : '')
    .split('|')
    .map(segment => sanitizeText(segment, '') || null)
    .filter((segment): segment is string => Boolean(segment))
}

function readPrefixedProjectStateSummarySegment(input: {
  segments: string[]
  prefix: string
}) {
  const lowerPrefix = input.prefix.toLowerCase()
  const match = input.segments.find(segment => segment.toLowerCase().startsWith(lowerPrefix))
  if (!match)
    return null

  return sanitizeText(match.slice(input.prefix.length), '') || null
}

function readPhaseProjectStateSummarySegment(segments: string[]) {
  return segments.find(segment => /phase\s*\d+|phase\s*i\b/u.test(segment.toLowerCase())) ?? null
}

function readSameHerSelfAnchorReasonPreviewPayload(reasons: string[] | null | undefined) {
  const match = (Array.isArray(reasons) ? reasons : [])
    .map(reason => sanitizeText(reason, '') || null)
    .find(reason => Boolean(reason) && /^same-her self anchor:\s*/iu.test(reason!))

  if (!match)
    return null

  return sanitizeText(match.replace(/^same-her self anchor:\s*/iu, ''), '') || null
}

function readSameHerDriftRiskReasonPreviewPayload(reasons: string[] | null | undefined) {
  const match = (Array.isArray(reasons) ? reasons : [])
    .map(reason => sanitizeText(reason, '') || null)
    .find(reason => Boolean(reason) && /^do not let this opening drift into\s*/iu.test(reason!))

  if (!match)
    return null

  return sanitizeText(match.replace(/^do not let this opening drift into\s*/iu, ''), '') || null
}

function readProactiveSameHerGapReasonPreviewPayload(reasons: string[] | null | undefined) {
  const match = (Array.isArray(reasons) ? reasons : [])
    .map(reason => sanitizeText(reason, '') || null)
    .find(reason => Boolean(reason) && /^proactive same-her gap:\s*/iu.test(reason!))

  if (!match)
    return null

  return sanitizeText(match.replace(/^proactive same-her gap:\s*/iu, ''), '') || null
}

function readOpenClosureReasonPreviewPayload(reasons: string[] | null | undefined) {
  return (Array.isArray(reasons) ? reasons : [])
    .map(reason => sanitizeText(reason, '') || null)
    .find((reason) => {
      if (!reason)
        return false
      return !/^same-her self anchor:\s*/iu.test(reason)
        && !/^proactive same-her gap:\s*/iu.test(reason)
        && !/^do not let this opening drift into\s*/iu.test(reason)
        && !/^next closure target is still\s*/iu.test(reason)
    }) ?? null
}

function readNextClosureReasonPreviewPayload(reasons: string[] | null | undefined) {
  const match = (Array.isArray(reasons) ? reasons : [])
    .map(reason => sanitizeText(reason, '') || null)
    .find(reason => Boolean(reason) && /^next closure target is still\s*/iu.test(reason!))

  if (!match)
    return null

  return sanitizeText(match.replace(/^next closure target is still\s*/iu, ''), '') || null
}

function buildProjectStateAuditFromPreDialogueAwarenessDebug(
  debug: {
    preDialogueAwarenessStatus: 'drift' | 'grounded' | 'partial'
    preDialogueAwarenessSummaryLine: string | null
    preDialogueAwarenessLine: string | null
    preDialogueCompanionBriefingLine: string | null
    preDialogueNextClosureLine: string | null
    preDialogueEmotionalClosureCue: string | null
    preDialogueSameHerSelfLine?: string | null
    preDialogueProjectStateAwarenessLine?: string | null
    preDialogueProjectStateAwarenessSummary?: string | null
    preDialogueProjectStateCompanionBriefingLine?: string | null
    preDialogueProjectStateEmotionalClosureSummary?: string | null
    preDialogueProjectStateSameHerHoldDetail?: string | null
    preDialogueProjectStateContinuityCue?: string | null
    preDialogueProjectStateContinuityPreferredTiming?: string | null
    preDialogueProjectStateContinuityCadence?: string | null
    preDialogueProjectStatePreferredBlinkCadence?: 'normal' | 'linger' | 'quiet' | null
    preDialogueProjectStatePreferredGazeMode?: 'steady' | 'soften' | 'drift' | null
    preDialogueReasonPreview: string[]
    preDialogueReasonCount: number
  } | null | undefined,
) {
  if (!debug)
    return null

  const summarySegments = readProjectStateSummarySegments(
    sanitizeText(debug.preDialogueAwarenessSummaryLine, '') || null,
  )
  const sameHerSummary
    = sanitizeText((debug as { preDialogueSameHerSelfLine?: unknown }).preDialogueSameHerSelfLine, '')
      || readSameHerSelfAnchorReasonPreviewPayload(debug.preDialogueReasonPreview ?? null)
      || null
  const sameHerDriftRiskSummary
    = readSameHerDriftRiskReasonPreviewPayload(debug.preDialogueReasonPreview ?? null)
      || null
  const proactiveSameHerGapSummary
    = readPrefixedProjectStateSummarySegment({
      segments: summarySegments,
      prefix: 'proactive-gap=',
    })
    || readPrefixedProjectStateSummarySegment({
      segments: summarySegments,
      prefix: 'proactive_same_her_gap=',
    })
    || readProactiveSameHerGapReasonPreviewPayload(debug.preDialogueReasonPreview ?? null)
    || null
  const currentPhaseSummary = readPhaseProjectStateSummarySegment(summarySegments)
  const landedProgressSummary = readPrefixedProjectStateSummarySegment({
    segments: summarySegments,
    prefix: 'landed=',
  })
  const openClosureSummary
    = readPrefixedProjectStateSummarySegment({
      segments: summarySegments,
      prefix: 'open=',
    })
    || readOpenClosureReasonPreviewPayload(debug.preDialogueReasonPreview ?? null)
    || null
  const nextClosureTargetSummary
    = sanitizeText(debug.preDialogueNextClosureLine, '')
      || readPrefixedProjectStateSummarySegment({
        segments: summarySegments,
        prefix: 'next=',
      })
      || readNextClosureReasonPreviewPayload(debug.preDialogueReasonPreview ?? null)
      || null
  const emotionalClosureSummary = sanitizeText(debug.preDialogueEmotionalClosureCue, '') || null
  const preDialogueAwarenessSummary = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      preDialogueAwarenessLine: sanitizeText(debug.preDialogueAwarenessLine, '') || null,
      preDialogueAwarenessSummary: sanitizeText(debug.preDialogueAwarenessLine, '') || null,
      companionHeadlineLine: sameHerSummary,
      companionBriefingLine: sanitizeText(debug.preDialogueCompanionBriefingLine, '') || null,
      proactiveSameHerGap: proactiveSameHerGapSummary,
      currentPhase: currentPhaseSummary,
      landedProgressSummary,
      openClosureSummary,
      nextClosureTargetSummary,
      emotionalClosureSummary,
      sameHerDriftRiskSummary,
    },
    fallbackProjectState: {
      preDialogueAwarenessLine: sanitizeText(debug.preDialogueAwarenessSummaryLine, '') || null,
      preDialogueAwarenessSummary: sanitizeText(debug.preDialogueAwarenessSummaryLine, '') || null,
      companionHeadlineLine: sameHerSummary,
      companionBriefingLine: sanitizeText(debug.preDialogueCompanionBriefingLine, '') || null,
      proactiveSameHerGap: proactiveSameHerGapSummary,
      currentPhase: currentPhaseSummary,
      landedProgressSummary,
      openClosureSummary,
      nextClosureTargetSummary,
      emotionalClosureSummary,
      sameHerDriftRiskSummary,
    },
  })
  || sanitizeText(debug.preDialogueAwarenessLine, '')
  || sanitizeText(debug.preDialogueAwarenessSummaryLine, '')
  || null

  if (
    !sameHerSummary
    && !sameHerDriftRiskSummary
    && !proactiveSameHerGapSummary
    && !currentPhaseSummary
    && !landedProgressSummary
    && !openClosureSummary
    && !nextClosureTargetSummary
    && !emotionalClosureSummary
    && !preDialogueAwarenessSummary
  ) {
    return null
  }

  return {
    sameHerSummary,
    sameHerHoldDetail: null,
    sameHerDriftRiskSummary,
    proactiveSameHerGapSummary,
    currentPhaseSummary,
    landedProgressSummary,
    openClosureSummary,
    openFocusSummary: null,
    nextFocusSummary: null,
    nextClosureTargetSummary,
    emotionalClosureSummary,
    emotionalClosureCue: emotionalClosureSummary,
    preDialogueAwarenessSummary,
    continuitySummary: buildProjectStateAuditContinuitySummary({
      sameHerSummary,
      sameHerDriftRiskSummary,
      proactiveSameHerGapSummary,
      currentPhaseSummary,
      landedProgressSummary,
      openClosureSummary,
      nextClosureTargetSummary,
      emotionalClosureSummary,
      embodimentClosureSummary: null,
    }),
    embodimentClosureSummary: null,
    preservedIntoRewrite: false,
    rewriteClosureApplied: false,
  }
}

function mergeVisibleReplyProjectStateAuditWithPending(input: {
  pendingProjectStateAudit?: {
    sameHerSummary?: string | null
    sameHerHoldDetail?: string | null
    sameHerDriftRiskSummary?: string | null
    currentPhaseSummary?: string | null
    landedProgressSummary?: string | null
    openClosureSummary?: string | null
    openFocusSummary?: string | null
    nextFocusSummary?: string | null
    nextClosureTargetSummary?: string | null
    memoryClosureSummary?: string | null
    recallWhySummary?: string | null
    emotionalClosureSummary?: string | null
    emotionalClosureCue?: string | null
    preDialogueAwarenessSummary?: string | null
    continuitySummary?: string | null
    embodimentClosureSummary?: string | null
    preservedIntoRewrite?: boolean
    rewriteClosureApplied?: boolean
  } | null
  primary?: {
    sameHerSummary?: string | null
    sameHerHoldDetail?: string | null
    sameHerDriftRiskSummary?: string | null
    currentPhaseSummary?: string | null
    landedProgressSummary?: string | null
    openClosureSummary?: string | null
    openFocusSummary?: string | null
    nextFocusSummary?: string | null
    nextClosureTargetSummary?: string | null
    memoryClosureSummary?: string | null
    recallWhySummary?: string | null
    emotionalClosureSummary?: string | null
    emotionalClosureCue?: string | null
    preDialogueAwarenessSummary?: string | null
    continuitySummary?: string | null
    embodimentClosureSummary?: string | null
    preservedIntoRewrite?: boolean
    rewriteClosureApplied?: boolean
  } | null
  payload?: {
    sameHerSummary?: string | null
    sameHerHoldDetail?: string | null
    sameHerDriftRiskSummary?: string | null
    currentPhaseSummary?: string | null
    landedProgressSummary?: string | null
    openClosureSummary?: string | null
    openFocusSummary?: string | null
    nextFocusSummary?: string | null
    nextClosureTargetSummary?: string | null
    memoryClosureSummary?: string | null
    recallWhySummary?: string | null
    emotionalClosureSummary?: string | null
    emotionalClosureCue?: string | null
    preDialogueAwarenessSummary?: string | null
    continuitySummary?: string | null
    embodimentClosureSummary?: string | null
    preservedIntoRewrite?: boolean
    rewriteClosureApplied?: boolean
  } | null
  structured?: {
    sameHerSummary?: string | null
    sameHerHoldDetail?: string | null
    sameHerDriftRiskSummary?: string | null
    currentPhaseSummary?: string | null
    landedProgressSummary?: string | null
    openClosureSummary?: string | null
    openFocusSummary?: string | null
    nextFocusSummary?: string | null
    nextClosureTargetSummary?: string | null
    memoryClosureSummary?: string | null
    recallWhySummary?: string | null
    emotionalClosureSummary?: string | null
    emotionalClosureCue?: string | null
    preDialogueAwarenessSummary?: string | null
    continuitySummary?: string | null
    embodimentClosureSummary?: string | null
    preservedIntoRewrite?: boolean
    rewriteClosureApplied?: boolean
  } | null
}) {
  return mergeVisibleReplyProjectStateAudit({
    primary: mergeVisibleReplyProjectStateAudit({
      primary: input.pendingProjectStateAudit ?? null,
      structured: input.primary ?? null,
    }),
    payload: input.payload ?? null,
    structured: input.structured ?? null,
  })
}

function normalizeVisibleReplyProjectStateAudit(raw: unknown) {
  if (!raw || typeof raw !== 'object')
    return null

  return {
    sameHerSummary: sanitizeText((raw as any).sameHerSummary, '') || null,
    sameHerHoldDetail: sanitizeText((raw as any).sameHerHoldDetail, '') || null,
    sameHerDriftRiskSummary: sanitizeText((raw as any).sameHerDriftRiskSummary, '') || null,
    proactiveSameHerGapSummary: sanitizeText((raw as any).proactiveSameHerGapSummary, '') || null,
    currentPhaseSummary: sanitizeText((raw as any).currentPhaseSummary, '') || null,
    landedProgressSummary: sanitizeText((raw as any).landedProgressSummary, '') || null,
    openClosureSummary: sanitizeText((raw as any).openClosureSummary, '') || null,
    openFocusSummary: sanitizeText((raw as any).openFocusSummary, '') || null,
    nextFocusSummary: sanitizeText((raw as any).nextFocusSummary, '') || null,
    nextClosureTargetSummary: sanitizeText((raw as any).nextClosureTargetSummary, '') || null,
    memoryClosureSummary: sanitizeText((raw as any).memoryClosureSummary, '') || null,
    recallWhySummary: sanitizeText((raw as any).recallWhySummary, '') || null,
    emotionalClosureSummary: sanitizeText((raw as any).emotionalClosureSummary, '') || null,
    emotionalClosureCue: sanitizeText((raw as any).emotionalClosureCue, '') || null,
    preDialogueAwarenessSummary: sanitizeText((raw as any).preDialogueAwarenessSummary, '') || null,
    continuitySummary: sanitizeText((raw as any).continuitySummary, '') || null,
    embodimentClosureSummary: sanitizeText((raw as any).embodimentClosureSummary, '') || null,
    preservedIntoRewrite: (raw as any).preservedIntoRewrite === true,
    rewriteClosureApplied: (raw as any).rewriteClosureApplied === true,
  }
}

export const runtimeTestInternals = {
  buildProjectStateAuditContinuitySummary,
  buildProjectStateAuditFromPreDialogueAwarenessDebug,
  mergeVisibleReplyProjectStateAudit,
  normalizePersistedProjectStateForConversationTurn,
  buildPreparedProjectStateClosureSnapshot: mainChatBackgroundRunTestInternals.buildPreparedProjectStateClosureSnapshot,
  getProactiveLoopStateCache: (cache: unknown, cardId: string) => {
    if (!(cache instanceof Map))
      return undefined
    return cache.get(cardId)
  },
  getPendingProactiveDeliverySnapshot: (runtime: { peekLatestPendingProactiveDelivery?: (cardId: string) => unknown } | null | undefined, cardId: string) => {
    return runtime?.peekLatestPendingProactiveDelivery?.(cardId) ?? null
  },
  currentDialogueDeliveryRuntime: null as { peekLatestPendingProactiveDelivery?: (cardId: string) => unknown } | null,
  currentExecutionCallbackRuntime: null as {
    buildPendingExecutionCallbackContext?: (input: { sessionId: string, consume?: boolean }) => Promise<unknown>
    peekSurfacedCursor?: (sessionId: string) => number
  } | null,
  currentDesktopInspectScene: null as ((input: AlicizationLocalDesktopInspectSceneInput) => Promise<unknown>) | null,
}

function normalizePersistedProjectStateForConversationTurn(input: {
  assistantText?: string | null
  structured?: Record<string, unknown> | null
  projectStatePersistence: {
    identity: string
    currentPhase: string
    latestLandedProgress: string | null
    primaryOpenLoop: string | null
    proactiveSameHerGap?: string | null
    openFocusSummary?: string | null
    nextClosureTarget: string
    nextFocusSummary?: string | null
    emotionalClosureCue?: string | null
    sameHerHoldDetail?: string | null
  }
}) {
  const assistantText = sanitizeText(input.assistantText ?? '', '')
  const structured = input.structured && typeof input.structured === 'object'
    ? { ...input.structured }
    : null
  if (!structured || !assistantText)
    return structured

  const currentProjectState = structured.projectState && typeof structured.projectState === 'object'
    ? structured.projectState as Record<string, unknown>
    : null
  const currentProjectSameHerSelfLine = currentProjectState?.sameHerSelfLine
  const sanitizedRuntimeSameHerSelfLine = looksLikeSceneContaminatedRuntimeSameHerSelfLine(currentProjectSameHerSelfLine)
    ? null
    : currentProjectSameHerSelfLine
  const explicitCurrentLatestLandedProgress
    = sanitizeText(
      currentProjectState?.latestLandedProgress ?? currentProjectState?.latestProgress,
      '',
    )?.slice(0, 320) || null
  const explicitCurrentPrimaryOpenLoop = sanitizeText(currentProjectState?.primaryOpenLoop, '')?.slice(0, 420) || null
  const explicitCurrentNextClosureTarget = sanitizeText(currentProjectState?.nextClosureTarget, '')?.slice(0, 420) || null
  const explicitCurrentPreflightSummary = sanitizeText(currentProjectState?.preflightSummary, '')?.slice(0, 420) || null
  const explicitCurrentPreDialogueAwarenessLine = sanitizeText(currentProjectState?.preDialogueAwarenessLine, '')?.slice(0, 420) || null
  const explicitCurrentAwarenessLine = sanitizeText(
    currentProjectState?.awarenessLine ?? currentProjectState?.preDialogueAwarenessLine,
    '',
  )?.slice(0, 420) || null
  const explicitCurrentCompanionHeadlineLine = sanitizeText(currentProjectState?.companionHeadlineLine, '')?.slice(0, 320) || null
  const explicitCurrentCompanionBriefingLine = sanitizeText(currentProjectState?.companionBriefingLine, '')?.slice(0, 320) || null
  const explicitCurrentSameHerDriftRisk = sanitizeText(currentProjectState?.sameHerDriftRisk, '')?.slice(0, 320) || null
  const explicitCurrentProactiveSameHerGap = sanitizeText(
    currentProjectState?.proactiveSameHerGap ?? currentProjectState?.proactiveSameHerGapSummary,
    '',
  )?.slice(0, 320) || null
  const explicitCurrentEmotionalClosureCue = sanitizeText(currentProjectState?.emotionalClosureCue, '')?.slice(0, 320) || null
  const explicitCurrentMemoryClosureSummary = sanitizeText(currentProjectState?.memoryClosureSummary, '')?.slice(0, 420) || null
  const explicitCurrentSameHerHoldDetail = sanitizeText(currentProjectState?.sameHerHoldDetail, '')?.slice(0, 420) || null

  const canonicalProjectState = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: {
      identity: currentProjectState?.identity,
      currentPhase: currentProjectState?.currentPhase,
      latestLandedProgress: explicitCurrentLatestLandedProgress,
      primaryOpenLoop: explicitCurrentPrimaryOpenLoop,
      nextClosureTarget: explicitCurrentNextClosureTarget,
      sameHerSelfLine: sanitizedRuntimeSameHerSelfLine,
      sameHerDriftRisk: explicitCurrentSameHerDriftRisk,
      proactiveSameHerGap: explicitCurrentProactiveSameHerGap,
      sameHerHoldDetail: explicitCurrentSameHerHoldDetail,
      preflightSummary: explicitCurrentPreflightSummary,
      preDialogueAwarenessLine: explicitCurrentPreDialogueAwarenessLine,
      awarenessLine: explicitCurrentAwarenessLine,
      companionHeadlineLine: explicitCurrentCompanionHeadlineLine,
      companionBriefingLine: explicitCurrentCompanionBriefingLine,
      emotionalClosureCue: explicitCurrentEmotionalClosureCue,
    },
    fallbackProjectState: {
      identity: input.projectStatePersistence.identity,
      currentPhase: input.projectStatePersistence.currentPhase,
      latestLandedProgress: input.projectStatePersistence.latestLandedProgress,
      primaryOpenLoop: input.projectStatePersistence.primaryOpenLoop,
      proactiveSameHerGap: input.projectStatePersistence.proactiveSameHerGap,
      nextClosureTarget: input.projectStatePersistence.nextClosureTarget,
      sameHerHoldDetail: input.projectStatePersistence.sameHerHoldDetail,
    },
  })
  const canonicalProjectStatusBrief = resolveAlicizationProjectStatusBrief({
    runtimeProjectState: {
      identity: canonicalProjectState.identity,
      currentPhase: canonicalProjectState.currentPhase,
      latestLandedProgress: canonicalProjectState.latestLandedProgress,
      latestProgress: canonicalProjectState.latestProgress,
      primaryOpenLoop: canonicalProjectState.primaryOpenLoop,
      nextClosureTarget: canonicalProjectState.nextClosureTarget,
      sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
      sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
      preflightSummary: canonicalProjectState.preflightSummary,
      preDialogueAwarenessLine: canonicalProjectState.preDialogueAwarenessLine,
      awarenessLine: canonicalProjectState.awarenessLine,
      companionHeadlineLine: canonicalProjectState.companionHeadlineLine,
      companionBriefingLine: canonicalProjectState.companionBriefingLine,
      emotionalClosureCue: canonicalProjectState.emotionalClosureCue,
    },
  })
  const strongerPersistedSameHerSelfLine = preferStrongerPersistedSameHerSelfLine({
    current: sanitizedRuntimeSameHerSelfLine,
    candidate: canonicalProjectState.sameHerSelfLine,
  }) || canonicalProjectState.sameHerSelfLine
  const preferredLatestLandedProgress = explicitCurrentLatestLandedProgress || preferProjectStateSpecificClosureSummary({
    canonical: canonicalProjectState.latestLandedProgress,
    persisted: input.projectStatePersistence.latestLandedProgress,
    canonicalFallback: resolveAlicizationProjectStateBrief().continuityProgressSummary
      ?? resolveAlicizationProjectStateBrief().memoryAnthropomorphismProgress.at(-1)
      ?? null,
  })
  const preferredPrimaryOpenLoop = explicitCurrentPrimaryOpenLoop || preferProjectStateSpecificClosureSummary({
    canonical: canonicalProjectState.primaryOpenLoop,
    persisted: input.projectStatePersistence.primaryOpenLoop,
    canonicalFallback: resolveAlicizationProjectStateBrief().primaryOpenLoop,
  })
  const preferredNextClosureTarget = explicitCurrentNextClosureTarget || preferProjectStateSpecificClosureSummary({
    canonical: canonicalProjectState.nextClosureTarget,
    persisted: input.projectStatePersistence.nextClosureTarget,
    canonicalFallback: resolveAlicizationProjectStateBrief().nextClosureTarget,
  })
  const preferredSameHerHoldDetail = preferRicherProjectStateAuditText({
    current: explicitCurrentSameHerHoldDetail,
    candidate: canonicalProjectState.sameHerHoldDetail,
  }) ?? null
  const preferredPreDialogueAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      preDialogueAwarenessLine: explicitCurrentPreDialogueAwarenessLine ?? canonicalProjectState.preDialogueAwarenessLine,
      awarenessLine: explicitCurrentAwarenessLine ?? canonicalProjectState.preDialogueAwarenessLine,
      companionHeadlineLine:
        explicitCurrentCompanionHeadlineLine
        ?? canonicalProjectState.companionHeadlineLine
        ?? strongerPersistedSameHerSelfLine
        ?? canonicalProjectStatusBrief.companionHeadlineLine
        ?? null,
      companionBriefingLine:
        explicitCurrentCompanionBriefingLine
        ?? canonicalProjectState.companionBriefingLine
        ?? canonicalProjectStatusBrief.companionBriefingLine
        ?? null,
      preflightSummary:
        explicitCurrentPreflightSummary
        ?? canonicalProjectState.preflightSummary
        ?? canonicalProjectStatusBrief.preflightSummary
        ?? null,
      landedProgressSummary: preferredLatestLandedProgress,
      openClosureSummary: preferredPrimaryOpenLoop,
      proactiveSameHerGap: explicitCurrentProactiveSameHerGap ?? canonicalProjectState.proactiveSameHerGap ?? null,
      nextClosureTargetSummary: preferredNextClosureTarget,
      emotionalClosureSummary: explicitCurrentEmotionalClosureCue ?? canonicalProjectState.emotionalClosureCue ?? null,
      sameHerDriftRiskSummary:
        explicitCurrentSameHerDriftRisk
        ?? canonicalProjectStatusBrief.sameHerDriftRisk
        ?? canonicalProjectState.sameHerDriftRisk
        ?? null,
    },
    fallbackProjectState: {
      preDialogueAwarenessLine: canonicalProjectState.preDialogueAwarenessLine,
      awarenessLine: canonicalProjectState.preDialogueAwarenessLine,
      companionHeadlineLine:
        canonicalProjectState.companionHeadlineLine
        ?? strongerPersistedSameHerSelfLine
        ?? canonicalProjectStatusBrief.companionHeadlineLine
        ?? null,
      companionBriefingLine: canonicalProjectState.companionBriefingLine ?? canonicalProjectStatusBrief.companionBriefingLine ?? null,
      preflightSummary: canonicalProjectState.preflightSummary ?? canonicalProjectStatusBrief.preflightSummary ?? null,
      landedProgressSummary: preferredLatestLandedProgress,
      openClosureSummary: preferredPrimaryOpenLoop,
      proactiveSameHerGap: canonicalProjectState.proactiveSameHerGap ?? input.projectStatePersistence.proactiveSameHerGap ?? null,
      nextClosureTargetSummary: preferredNextClosureTarget,
      emotionalClosureSummary: canonicalProjectState.emotionalClosureCue ?? null,
      sameHerDriftRiskSummary:
        canonicalProjectStatusBrief.sameHerDriftRisk
        ?? canonicalProjectState.sameHerDriftRisk
        ?? null,
    },
  }) ?? canonicalProjectState.preDialogueAwarenessLine
  const preferredCompanionHeadlineLine
    = explicitCurrentCompanionHeadlineLine
      || sanitizeText(canonicalProjectState.companionHeadlineLine, '')?.slice(0, 320)
      || sanitizeText(canonicalProjectStatusBrief.companionHeadlineLine, '')?.slice(0, 320)
      || sanitizeText(strongerPersistedSameHerSelfLine, '')?.slice(0, 320)
      || null
  const preferredCompanionHeadlineLooksLikeStrongerSameHerLine = Boolean(
    preferredCompanionHeadlineLine
    && /same living line|without splitting her continuity|same local-first digital life project|unfinished phase 1 closure seam|one living her|same phase 1 digital life/i.test(preferredCompanionHeadlineLine),
  )
  const preferredAwarenessLooksThinOrCanonical = Boolean(
    preferredPreDialogueAwarenessLine
    && (
      isAlicizationThinProjectAwarenessLine(preferredPreDialogueAwarenessLine)
      || /alicization is a local-first digital life project/i.test(preferredPreDialogueAwarenessLine)
      || preferredPreDialogueAwarenessLine.includes('open=')
      || preferredPreDialogueAwarenessLine.includes('next=')
    ),
  )
  const strongerStatusAwarenessLine
    = sanitizeText(canonicalProjectStatusBrief.awarenessLine, '')?.slice(0, 420)
      || sanitizeText(strongerPersistedSameHerSelfLine, '')?.slice(0, 320)
      || null
  const finalNormalizedPreDialogueAwarenessLine = (() => {
    if (
      preferredCompanionHeadlineLine
      && preferredCompanionHeadlineLooksLikeStrongerSameHerLine
      && (
        !preferredPreDialogueAwarenessLine
        || preferredAwarenessLooksThinOrCanonical
        || scoreAlicizationProjectAwarenessLine(preferredCompanionHeadlineLine)
        >= scoreAlicizationProjectAwarenessLine(preferredPreDialogueAwarenessLine) + 2
      )
    ) {
      return preferredCompanionHeadlineLine
    }

    if (
      strongerStatusAwarenessLine
      && (
        !preferredPreDialogueAwarenessLine
        || preferredAwarenessLooksThinOrCanonical
        || !/same phase 1 digital life|same living line|one living her|one continuous her/i.test(preferredPreDialogueAwarenessLine)
      )
      && /same phase 1 digital life|same living line|one living her|one continuous her/i.test(strongerStatusAwarenessLine)
    ) {
      return strongerStatusAwarenessLine
    }

    return preferredPreDialogueAwarenessLine
  })()

  structured.projectState = {
    ...currentProjectState,
    identity: canonicalProjectState.identity,
    currentPhase: canonicalProjectState.currentPhase,
    preflightSummary: explicitCurrentPreflightSummary || canonicalProjectStatusBrief.preflightSummary || canonicalProjectState.preflightSummary,
    preDialogueAwarenessLine: finalNormalizedPreDialogueAwarenessLine,
    companionHeadlineLine: preferredCompanionHeadlineLine,
    latestLandedProgress: preferredLatestLandedProgress,
    primaryOpenLoop: preferredPrimaryOpenLoop,
    proactiveSameHerGap:
      explicitCurrentProactiveSameHerGap
      || canonicalProjectState.proactiveSameHerGap
      || input.projectStatePersistence.proactiveSameHerGap
      || null,
    nextClosureTarget: preferredNextClosureTarget,
    sameHerSelfLine: strongerPersistedSameHerSelfLine || canonicalProjectStatusBrief.sameHerSelfLine || null,
    sameHerHoldDetail: preferredSameHerHoldDetail,
    sameHerDriftRisk: explicitCurrentSameHerDriftRisk || canonicalProjectStatusBrief.sameHerDriftRisk || canonicalProjectState.sameHerDriftRisk,
    emotionalClosureCue:
      explicitCurrentEmotionalClosureCue
      || canonicalProjectState.emotionalClosureCue
      || canonicalProjectStatusBrief.companionBriefingLine
      || null,
    memoryClosureSummary: explicitCurrentMemoryClosureSummary,
  }

  const canonicalProjectStateAudit = {
    sameHerSummary: strongerPersistedSameHerSelfLine,
    sameHerHoldDetail: preferredSameHerHoldDetail,
    sameHerDriftRiskSummary: canonicalProjectStatusBrief.sameHerDriftRisk || canonicalProjectState.sameHerDriftRisk,
    proactiveSameHerGapSummary:
      explicitCurrentProactiveSameHerGap
      || canonicalProjectState.proactiveSameHerGap
      || input.projectStatePersistence.proactiveSameHerGap
      || null,
    currentPhaseSummary: canonicalProjectState.currentPhase
      ?? input.projectStatePersistence.currentPhase
      ?? null,
    landedProgressSummary: preferredLatestLandedProgress
      ?? alicizationProjectStatePersistenceLandedReminder,
    openClosureSummary: preferredPrimaryOpenLoop
      ?? preferredNextClosureTarget,
    openFocusSummary: deriveCompactProjectStateOpenFocusSummary(
      preferredPrimaryOpenLoop
      ?? preferredNextClosureTarget
      ?? canonicalProjectState.nextClosureTarget,
      {
        emotionalClosureCue:
          explicitCurrentEmotionalClosureCue
          || canonicalProjectState.emotionalClosureCue
          || canonicalProjectStatusBrief.companionBriefingLine
          || null,
      },
    ),
    nextFocusSummary: deriveCompactProjectStateNextFocusSummary(
      preferredNextClosureTarget
      ?? alicizationProjectStatePersistenceNextClosureReminder,
      {
        emotionalClosureCue:
          explicitCurrentEmotionalClosureCue
          || canonicalProjectState.emotionalClosureCue
          || canonicalProjectStatusBrief.companionBriefingLine
          || null,
      },
    ),
    nextClosureTargetSummary: preferredNextClosureTarget
      ?? null,
    memoryClosureSummary: explicitCurrentMemoryClosureSummary,
    emotionalClosureCue:
      explicitCurrentEmotionalClosureCue
      || canonicalProjectState.emotionalClosureCue
      || canonicalProjectStatusBrief.companionBriefingLine
      || null,
    preDialogueAwarenessSummary:
      finalNormalizedPreDialogueAwarenessLine
      ?? canonicalProjectState.preflightSummary
      ?? `same digital life | ${strongerPersistedSameHerSelfLine}`,
    continuitySummary: buildProjectStateAuditContinuitySummary({
      sameHerSummary: strongerPersistedSameHerSelfLine,
      sameHerDriftRiskSummary:
        canonicalProjectStatusBrief.sameHerDriftRisk
        || canonicalProjectState.sameHerDriftRisk
        || 'unfinished closure drift still needs the same living line',
      proactiveSameHerGapSummary:
        explicitCurrentProactiveSameHerGap
        || canonicalProjectState.proactiveSameHerGap
        || input.projectStatePersistence.proactiveSameHerGap
        || null,
      currentPhaseSummary:
        canonicalProjectState.currentPhase
        ?? input.projectStatePersistence.currentPhase
        ?? 'Phase 1: Local Digital Life',
      landedProgressSummary:
        preferredLatestLandedProgress
        ?? alicizationProjectStatePersistenceLandedReminder,
      openClosureSummary:
        preferredPrimaryOpenLoop
        ?? preferredNextClosureTarget
        ?? canonicalProjectState.nextClosureTarget,
      openFocusSummary: deriveCompactProjectStateOpenFocusSummary(
        preferredPrimaryOpenLoop
        ?? preferredNextClosureTarget
        ?? canonicalProjectState.nextClosureTarget,
        {
          emotionalClosureCue:
            explicitCurrentEmotionalClosureCue
            || canonicalProjectState.emotionalClosureCue
            || canonicalProjectStatusBrief.companionBriefingLine
            || null,
        },
      ),
      nextFocusSummary: deriveCompactProjectStateNextFocusSummary(
        preferredNextClosureTarget
        ?? alicizationProjectStatePersistenceNextClosureReminder,
        {
          emotionalClosureCue:
            explicitCurrentEmotionalClosureCue
            || canonicalProjectState.emotionalClosureCue
            || canonicalProjectStatusBrief.companionBriefingLine
            || null,
        },
      ),
      nextClosureTargetSummary:
        preferredNextClosureTarget
        ?? alicizationProjectStatePersistenceNextClosureReminder,
      memoryClosureSummary: explicitCurrentMemoryClosureSummary,
      emotionalClosureSummary:
        explicitCurrentEmotionalClosureCue
        || canonicalProjectState.emotionalClosureCue
        || canonicalProjectStatusBrief.companionBriefingLine
        || null,
      embodimentClosureSummary: null,
    }),
    preservedIntoRewrite: false,
    rewriteClosureApplied: false,
  }

  const currentVisibleReplyRealization = structured.visibleReplyRealization && typeof structured.visibleReplyRealization === 'object'
    ? { ...(structured.visibleReplyRealization as Record<string, unknown>) }
    : null
  const currentStructuredProjectStateAudit = currentVisibleReplyRealization?.projectStateAudit
    && typeof currentVisibleReplyRealization.projectStateAudit === 'object'
    ? currentVisibleReplyRealization.projectStateAudit as {
      sameHerSummary?: string | null
      sameHerHoldDetail?: string | null
      sameHerDriftRiskSummary?: string | null
      proactiveSameHerGapSummary?: string | null
      currentPhaseSummary?: string | null
      landedProgressSummary?: string | null
      openClosureSummary?: string | null
      openFocusSummary?: string | null
      nextFocusSummary?: string | null
      nextClosureTargetSummary?: string | null
      memoryClosureSummary?: string | null
      recallWhySummary?: string | null
      emotionalClosureSummary?: string | null
      emotionalClosureCue?: string | null
      preDialogueAwarenessSummary?: string | null
      continuitySummary?: string | null
      embodimentClosureSummary?: string | null
      preservedIntoRewrite?: boolean
      rewriteClosureApplied?: boolean
    }
    : null

  const mergedStructuredProjectStateAudit = mergeVisibleReplyProjectStateAudit({
    primary: currentStructuredProjectStateAudit,
    structured: canonicalProjectStateAudit,
  })

  if (currentVisibleReplyRealization || mergedStructuredProjectStateAudit) {
    structured.visibleReplyRealization = {
      ...currentVisibleReplyRealization,
      projectStateAudit: mergedStructuredProjectStateAudit,
    }
  }

  return structured
}

export async function setupAlicizationRuntime(options?: AlicizationRuntimeSetupOptions) {
  const userDataPath = options?.userDataPathOverride ?? app.getPath('userData')
  const runtimeDebugLogEnabled = options?.runtimeDebugLogEnabled ?? !options?.userDataPathOverride
  const resolveCardPaths = (cardId: string) => {
    const soulRoot = join(userDataPath, 'alicizations', 'cards', cardId)
    return {
      soulRoot,
      soulPath: join(soulRoot, 'SOUL.md'),
      legacyPromptProfilePath: join(soulRoot, 'prompt-profile.json'),
      legacySparkProfilePath: join(soulRoot, 'spark-profile.json'),
    }
  }
  let activeCardId = defaultAlicizationCardId
  let { soulRoot, soulPath, legacyPromptProfilePath, legacySparkProfilePath } = resolveCardPaths(activeCardId)
  let alicizationDb = await setupAlicizationDb(userDataPath, { cardId: activeCardId })
  const taskThreadOrchestrator = createTaskThreadOrchestrator()

  const { context } = createContext(ipcMain)

  const scopeLifecycleQueueState = {
    queue: Promise.resolve<unknown>(undefined),
  }
  let cardScopeOrchestrator: ReturnType<typeof createAlicizationRuntimeCardScopeOrchestrator> | null = null
  const soulLifecycleState = {
    revision: 0,
    watching: false,
    soulSnapshot: null as AlicizationSoulSnapshot | null,
    queuedWrite: Promise.resolve<AlicizationSoulSnapshot | void>(undefined),
    soulWatchTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    soulWatcher: undefined as import('node:fs').FSWatcher | undefined,
    muteWatchUntil: 0,
  }
  let pruneTimer: ReturnType<typeof setInterval> | undefined
  let subconsciousTimer: ReturnType<typeof setInterval> | undefined
  let reminderDueTimer: ReturnType<typeof setTimeout> | undefined
  let dreamTimer: ReturnType<typeof setInterval> | undefined
  const turnWriteAbortControllers = new Map<string, AbortController>()
  const activeSessionIdByCard = new Map<string, string>()
  const subconsciousStateByCard = new Map<string, SubconsciousCardState>()
  const proactiveLoopStateByCard = new Map<string, AlicizationProactiveLoopState>()
  const perceptionStateByCard = new Map<string, AlicizationPerceptionState>()
  const visualPresenceStateByCard = new Map<string, AlicizationVisualPresenceStateSnapshot>()
  const visualPresenceCapturePersistMetaByCard = new Map<string, {
    fingerprint: string
    persistedAt: number
  }>()
  const screenSemanticCacheByCard = new Map<string, ScreenSemanticCacheState>()
  const pendingDurabilityPulseByCard = new Map<string, AlicizationDurabilityPulseSnapshot>()
  const foregroundProbeTimeoutStreakByPid = new Map<number, number>()
  let soulLifecycleRuntime: ReturnType<typeof createAlicizationRuntimeSoulLifecycle> | null = null
  const snapshotFromContent = (content: string) => {
    if (!soulLifecycleRuntime)
      throw new Error('SOUL lifecycle runtime is not initialized yet.')
    return soulLifecycleRuntime.snapshotFromContent(content)
  }
  const stopWatch = () => {
    if (!soulLifecycleRuntime)
      return
    soulLifecycleRuntime.stopWatch()
  }
  const ensureWatchState = async () => {
    if (!soulLifecycleRuntime)
      throw new Error('SOUL lifecycle runtime is not initialized yet.')
    await soulLifecycleRuntime.ensureWatchState()
  }
  const bootstrap = async () => {
    if (!soulLifecycleRuntime)
      throw new Error('SOUL lifecycle runtime is not initialized yet.')
    return await soulLifecycleRuntime.bootstrap()
  }
  async function withCardScope<T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: {
    label?: string
    skipQueueWhenScopeAlreadyActive?: boolean
  }) {
    if (!cardScopeOrchestrator)
      throw new Error('Card scope orchestrator is not initialized yet.')
    return await cardScopeOrchestrator.withCardScope(nextCardIdRaw, task, options)
  }
  const queueSoulMutation = async (task: (current: AlicizationSoulSnapshot) => Promise<AlicizationSoulSnapshot>) => {
    if (!soulLifecycleRuntime)
      throw new Error('SOUL lifecycle runtime is not initialized yet.')
    return await soulLifecycleRuntime.queueSoulMutation(task)
  }
  const initializeGenesis = async (input: AlicizationGenesisInput) => {
    if (!soulLifecycleRuntime)
      throw new Error('SOUL lifecycle runtime is not initialized yet.')
    return await soulLifecycleRuntime.initializeGenesis(input)
  }
  const desktopCaptureAccessRuntime = createDesktopCaptureAccessRuntime({
    getSources: async options => await desktopCapturer.getSources(options),
    getScreenPermissionStatus: () => {
      if (platform !== 'darwin')
        return undefined

      try {
        return systemPreferences.getMediaAccessStatus('screen')
      }
      catch {
        return undefined
      }
    },
  })
  let sensoryBus!: ReturnType<typeof createAlicizationSensoryBus>
  const chatRuns = new Map<string, ChatRunState>()
  const chatRunSessionTraceGetters = new Map<string, () => AlicizationRuntimeCallChainSnapshot>()
  const recentlyFinishedChatRuns = new Map<string, number>()
  let redactStaleInspectionHistoryMessagesForChat = (
    messages: AlicizationChatStartPayload['messages'],
    _latestUserText: string,
  ) => messages
  const chatStreamRuntime = createAlicizationChatStreamRuntime({
    normalizeTransportMessageContent,
    sanitizeText,
    redactStaleInspectionHistoryMessages: (messages, latestUserText) =>
      redactStaleInspectionHistoryMessagesForChat(messages, latestUserText),
    dispatchChannel: alicizationChatStreamDispatchChannel,
    emitContextEvent: (event, body, options) => {
      if (options) {
        context.emit(event as never, body as never, options as never)
        return
      }
      context.emit(event as never, body as never)
    },
    metaEvent: alicizationChatStreamMeta,
    chunkEvent: alicizationChatStreamChunk,
    toolCallEvent: alicizationChatStreamToolCall,
    toolResultEvent: alicizationChatStreamToolResult,
    finishEvent: alicizationChatStreamFinish,
    errorEvent: alicizationChatStreamError,
    queueScopedAuditLog,
    appendRuntimeDebugLine,
  })
  const {
    resolveChatMessages,
    toAlicizationChatStreamDispatchPayload,
    emitChatStreamEventForState,
  } = chatStreamRuntime
  const deliverDialogueResponded = (payload: AlicizationDialogueRespondedPayload) => {
    context.emit(alicizationDialogueResponded, payload)

    const dispatchPayload = toAlicizationChatStreamDispatchPayload('dialogue-responded', payload)
    const dispatchedSenderIds = new Set<number>()
    const allWebContents = webContents.getAllWebContents()
    for (const target of allWebContents) {
      if (target.isDestroyed())
        continue
      try {
        target.send(alicizationChatStreamDispatchChannel, dispatchPayload)
        dispatchedSenderIds.add(target.id)
      }
      catch (error) {
        void appendRuntimeDebugLine('dialogue-dispatch.failed', {
          cardId: payload.cardId,
          sessionId: payload.sessionId,
          turnId: payload.turnId,
          senderId: target.id,
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    }

    if (dispatchedSenderIds.size === 0) {
      void appendRuntimeDebugLine('dialogue-dispatch.skipped', {
        cardId: payload.cardId,
        sessionId: payload.sessionId,
        turnId: payload.turnId,
        reason: 'no-renderer',
      })
    }
  }
  const cardScopeStateRuntime = createAlicizationRuntimeCardScopeState({
    now: () => Date.now(),
    userDataPath,
    activeCardIdRef: () => activeCardId,
    normalizeCardId,
    getMetaValue: key => alicizationDb.getMetaValue(key),
    setMetaValue: (key, value) => alicizationDb.setMetaValue(key, value),
    getLatestConversationSessionId: async () => await alicizationDb.getLatestConversationSessionId().catch(() => undefined),
    appendAuditLog: async (input, cardId) => await appendAuditLog(input, cardId),
    getAlicizationKillSwitchSnapshot,
    getAlicizationCardKillSwitchSnapshot,
    setAlicizationCardKillSwitchState,
    activeSessionIdByCard,
    subconsciousStateByCard,
    proactiveLoopStateByCard,
    visualPresenceStateByCard,
    readdir,
    activeSessionMetaKey: alicizationCardActiveSessionMetaKey,
    scopedKillSwitchMetaKey: alicizationCardKillSwitchMetaKey,
  })
  const normalizeSessionId = cardScopeStateRuntime.normalizeSessionId
  const getScopedKillSwitchSnapshot = (cardId = activeCardId) => cardScopeStateRuntime.getScopedKillSwitchSnapshot(cardId)
  const persistScopedKillSwitch = cardScopeStateRuntime.persistScopedKillSwitch
  const persistActiveSessionId = cardScopeStateRuntime.persistActiveSessionId
  const restoreActiveSessionId = cardScopeStateRuntime.restoreActiveSessionId
  const ensureActiveOrLatestSessionId = cardScopeStateRuntime.ensureActiveOrLatestSessionId
  const listKnownCardIds = cardScopeStateRuntime.listKnownCardIds
  const restoreScopedKillSwitch = cardScopeStateRuntime.restoreScopedKillSwitch
  const dialogueDeliveryRuntime = createAlicizationRuntimeDialogueDelivery({
    normalizeCardId,
    normalizeSessionId,
    sanitizeText,
    getActiveCardId: () => activeCardId,
    getActiveSessionIdForCard: cardId => activeSessionIdByCard.get(normalizeCardId(cardId)) ?? '',
    withCardScope,
    appendRuntimeDebugLine,
    deliverDialogueResponded,
    alicizationDb,
    dialogueAckStateMetaKey: alicizationDialogueAckStateMetaKey,
    dialogueReplyFeedbackAckMetaKey: alicizationDialogueReplyFeedbackAckMetaKey,
    dialogueDeliveryRetryBaseMs,
    dialogueDeliveryRetryMaxMs,
    dialogueDeliveryRetryMaxAttempts,
  })
  runtimeTestInternals.currentDialogueDeliveryRuntime = dialogueDeliveryRuntime
  const {
    getDialogueAckCursor,
    restoreDialogueAckMap,
    ensureDialogueReplyFeedbackAck,
    persistDialogueReplyFeedbackAck,
    emitDialogueRespondedWithDelivery,
    ackDialogueDelivery,
    clearPendingDialogueDeliveriesByCard,
    clearAllPendingDialogueDeliveries,
  } = dialogueDeliveryRuntime
  const mainChatRunState = createAlicizationMainChatRunStateController({
    runs: chatRuns,
    sessionTraceGetters: chatRunSessionTraceGetters,
    recentlyFinishedRuns: recentlyFinishedChatRuns,
    finishedRetentionMs: chatRunFinishedRetentionMs,
    normalizeCardId,
    appendRuntimeDebugLine,
    emitFinishEvent: (state, payload) => emitChatStreamEventForState(state, 'finish', payload),
  })
  const pendingMindTraceTelemetryByTurnId = new Map<string, {
    memoryTrace: AlicizationMindTraceMemorySnapshot | null
    visibleReplyRealization?: {
      expectedAuthority: 'llm-mind' | 'llm-second-pass-rewrite' | null
      actualAuthority: 'llm-mind' | 'llm-second-pass-rewrite' | 'local-deterministic-fallback' | null
      providerMindExecuted: boolean | null
      mode: string | null
      visibleText: string | null
      nonHumanAuthoredStatus: string | null
      blockedReasons: string[]
      emotionalClosureAudit?: {
        activeCue: string | null
        preservedIntoRewrite: boolean
        rewriteClosureApplied: boolean
        lowPressureRequired?: boolean
        antiRestartRequired?: boolean
      } | null
      selfAuthorityAudit?: {
        authoritySummary: string | null
        closenessPosture: string | null
        preservedIntoRewrite: boolean
        rewriteClosureApplied: boolean
      } | null
      projectStateAudit?: {
        sameHerSummary: string | null
        sameHerHoldDetail?: string | null
        sameHerDriftRiskSummary?: string | null
        currentPhaseSummary?: string | null
        landedProgressSummary?: string | null
        openClosureSummary?: string | null
        openFocusSummary?: string | null
        nextFocusSummary?: string | null
        nextClosureTargetSummary?: string | null
        emotionalClosureSummary?: string | null
        emotionalClosureCue?: string | null
        preDialogueAwarenessSummary?: string | null
        continuitySummary?: string | null
        embodimentClosureSummary?: string | null
        preservedIntoRewrite: boolean
        rewriteClosureApplied: boolean
      } | null
      reason: string | null
    } | null
  }>()
  type PendingVisibleReplyRealizationTelemetry = NonNullable<
    NonNullable<(typeof pendingMindTraceTelemetryByTurnId extends Map<any, infer TValue> ? TValue : never)['visibleReplyRealization']>
  >

  function buildMindTraceMemorySnapshotFromPrepared(
    prepared: AlicizationPreparedMainChatExecutionResult,
  ): AlicizationMindTraceMemorySnapshot | null {
    const context = prepared.organicMemoryContext ?? null
    const deliberation = context?.memoryDeliberation ?? null
    if (!deliberation)
      return null

    const deliberationKernel = buildAlicizationMemoryDeliberationKernel({
      deliberation,
      speech: context?.recollectionSpeechPlan ?? null,
      recollectionIntent: context?.recollectionIntent ?? null,
      knowledgeEvidence: context?.knowledgeEvidence ?? null,
      hostPersonModel: context?.hostPersonModel ?? null,
    })
    const personStateProjection = prepared.runtimeSurface.digitalLifeRuntimeSurface?.memory.personStateProjection ?? null
    const personalityContinuityState = personStateProjection?.personalityContinuityState
      ?? prepared.runtimeSurface.digitalLifeRuntimeSurface?.memory.personalityContinuityState
      ?? null

    return {
      shouldRecall: deliberation.shouldRecall,
      surfacePolicy: deliberation.surfacePolicy,
      confidence: deliberation.confidence,
      whyNow: deliberation.whyNow,
      inwardLine: deliberation.inwardLine,
      visibleLine: null,
      ambiguityPosture: deliberation.ambiguityPosture ?? 'settled',
      whyWithheld: deliberationKernel?.whyWithheld ?? null,
      shouldStayInward: deliberationKernel?.shouldStayInward ?? false,
      restraintSurfaceMode: deliberationKernel?.restraint.surfaceMode ?? null,
      restraintProvenanceMode: deliberationKernel?.restraint.provenanceMode ?? null,
      shouldOnlySurfaceStableCore: deliberationKernel?.restraint.shouldOnlySurfaceStableCore ?? false,
      shouldLabelProvenance: deliberationKernel?.restraint.shouldLabelProvenance ?? false,
      shouldLabelHypothesis: deliberationKernel?.restraint.shouldLabelHypothesis ?? false,
      shouldSuppressSpecificity: deliberationKernel?.restraint.shouldSuppressSpecificity ?? false,
      shouldDelayUntilAfterPayoff: deliberationKernel?.restraint.shouldDelayUntilAfterPayoff ?? false,
      memoryControlSummary: deliberationKernel?.memoryControlSummary ?? null,
      activeClosenessContext: personStateProjection?.activeClosenessContext ?? null,
      activeClosenessRung: personStateProjection?.activeClosenessRung ?? null,
      relationshipPosture: personStateProjection?.relationshipPosture ?? null,
      openingGuidance: personStateProjection?.openingGuidance ?? null,
      personalityCurrentRegime: personalityContinuityState?.currentRegime ?? null,
      personalityRepairPosture: personalityContinuityState?.repairPosture ?? null,
      recollectionIntentMode: context?.recollectionIntent?.mode ?? null,
      recollectionIntentTemporalFocus: context?.recollectionIntent?.temporalFocus ?? null,
      speechShouldSurface: context?.recollectionSpeechPlan?.shouldSurface ?? null,
      speechSurfaceMode: context?.recollectionSpeechPlan?.surfaceMode ?? null,
      speechPlacement: context?.recollectionSpeechPlan?.placement ?? null,
      knowledgeValidationCount: context?.knowledgeEvidence?.validationCount ?? 0,
      knowledgeContradictionCount: context?.knowledgeEvidence?.contradictionCount ?? 0,
      stronglyValidatedProcedureCount: context?.knowledgeEvidence?.stronglyValidatedProcedureCount ?? 0,
      contradictionHeavyFactCount: context?.knowledgeEvidence?.contradictionHeavyFactCount ?? 0,
      selectedEras: deliberation.selectedEras.map(item => ({
        id: item.id,
        facet: item.facet,
        summary: item.summary,
      })),
      selectedPeriods: deliberation.selectedPeriods.map(item => ({
        id: item.id,
        kind: item.kind,
        summary: item.summary,
      })),
      selectedEpisodes: deliberation.selectedEpisodes.map(item => ({
        id: item.id,
        summary: item.summary,
        provenance: item.provenance,
        reconsolidatedFromTraceId: item.reconsolidatedFromTraceId ?? null,
      })),
      conflictSeverity: deliberation.conflictSeverity ?? 'none',
      conflictVariants: (deliberation.conflictVariants ?? []).map(item => ({
        id: item.id,
        summary: item.summary,
        provenance: item.provenance,
        reason: item.reason ?? null,
      })),
      stableCore: [...(deliberation.stableCore ?? [])],
      unsafeDetails: [...(deliberation.unsafeDetails ?? [])],
      selectedProcedures: deliberation.selectedProcedures.map(item => ({
        id: item.id,
        label: item.label,
        approach: item.approach,
      })),
      selectedBundles: deliberation.selectedBundles.map(item => ({
        id: item.id,
        summary: item.summary,
        rationale: item.rationale,
        confidence: item.confidence,
        relationshipLine: item.relationshipLine ?? null,
      })),
      selectedChains: deliberation.selectedChains.map(item => ({
        id: item.id,
        kind: item.kind,
        summary: item.summary,
        rationale: item.rationale,
        confidence: item.confidence,
        currentStance: item.currentStance ?? null,
        answerPosture: item.answerPosture ?? null,
      })),
      selectedSituations: (context?.memorySituationCandidates?.selected ?? []).map(item => ({
        id: item.candidateId,
        kind: item.situationKind,
        summary: item.summary,
        evidenceSummary: item.evidenceSummary ?? null,
        statusReason: item.statusReason ?? null,
        sourceKinds: [...item.sourceKinds],
      })),
      selectedRelationshipLines: [...deliberation.selectedRelationshipLines],
      followUpAffordance: deliberation.followUpAffordance
        ? {
            summary: deliberation.followUpAffordance.summary,
            whyNow: deliberation.followUpAffordance.whyNow,
            intrusionRisk: deliberation.followUpAffordance.intrusionRisk,
            payoffDependency: deliberation.followUpAffordance.payoffDependency,
            preferredTiming: deliberation.followUpAffordance.preferredTiming,
          }
        : null,
      searchTrace: deliberation.searchTrace
        ? {
            firstHop: {
              focus: deliberation.searchTrace.firstHop.focus,
              summary: deliberation.searchTrace.firstHop.summary,
              targetIds: [...deliberation.searchTrace.firstHop.targetIds],
            },
            secondHop: {
              action: deliberation.searchTrace.secondHop.action,
              evidenceGap: deliberation.searchTrace.secondHop.evidenceGap,
              summary: deliberation.searchTrace.secondHop.summary,
              targetIds: [...deliberation.searchTrace.secondHop.targetIds],
            },
            thirdHop: {
              ambiguityPosture: deliberation.searchTrace.thirdHop.ambiguityPosture,
              summary: deliberation.searchTrace.thirdHop.summary,
            },
          }
        : null,
    }
  }

  function rememberPreparedMindTrace(input: {
    payload: AlicizationChatStartPayload
    prepared: AlicizationPreparedMainChatExecutionResult
    preDialogueAwarenessDebug?: ReturnType<typeof summarizeAlicizationPreDialogueSendIdentityForDebug>
  }) {
    const turnId = sanitizeText(input.payload.turnId, '')
    if (!turnId)
      return

    const memoryTrace = buildMindTraceMemorySnapshotFromPrepared(input.prepared)
    const surface = input.prepared.turnGraph?.surface ?? null
    const preDialogueProjectStateAudit = buildProjectStateAuditFromPreDialogueAwarenessDebug(
      input.preDialogueAwarenessDebug ?? null,
    )
    const normalizedSurfaceProjectStateAudit = normalizeVisibleReplyProjectStateAudit(surface?.projectStateAudit ?? null)
    const visibleReplyRealization: PendingVisibleReplyRealizationTelemetry | null = surface || preDialogueProjectStateAudit
      ? {
          expectedAuthority: (() => {
            const authority = sanitizeText(surface?.expectedAuthority, '')
            return authority === 'llm-mind' || authority === 'llm-second-pass-rewrite'
              ? authority
              : null
          })(),
          actualAuthority: (() => {
            const authority = sanitizeText(surface?.actualAuthority, '')
            return authority === 'llm-mind'
              || authority === 'llm-second-pass-rewrite'
              || authority === 'local-deterministic-fallback'
              ? authority
              : null
          })(),
          providerMindExecuted: typeof surface?.providerMindExecuted === 'boolean'
            ? surface.providerMindExecuted
            : null,
          mode: sanitizeText(surface?.mode, '') || null,
          visibleText: sanitizeText(surface?.visibleText, '') || null,
          nonHumanAuthoredStatus: sanitizeText(surface?.nonHumanAuthoredStatus, '') || null,
          blockedReasons: [...(surface?.blockedReasons ?? [])]
            .map(item => sanitizeText(item, ''))
            .filter(Boolean)
            .slice(0, 12),
          emotionalClosureAudit: surface?.emotionalClosureAudit
            ? {
                activeCue: sanitizeText(surface.emotionalClosureAudit.activeCue, '') || null,
                preservedIntoRewrite: surface.emotionalClosureAudit.preservedIntoRewrite === true,
                rewriteClosureApplied: surface.emotionalClosureAudit.rewriteClosureApplied === true,
                lowPressureRequired: surface.emotionalClosureAudit.lowPressureRequired === true,
                antiRestartRequired: surface.emotionalClosureAudit.antiRestartRequired === true,
              }
            : null,
          selfAuthorityAudit: surface?.selfAuthorityAudit
            ? {
                authoritySummary: sanitizeText(surface.selfAuthorityAudit.authoritySummary, '') || null,
                closenessPosture: sanitizeText(surface.selfAuthorityAudit.closenessPosture, '') || null,
                preservedIntoRewrite: surface.selfAuthorityAudit.preservedIntoRewrite === true,
                rewriteClosureApplied: surface.selfAuthorityAudit.rewriteClosureApplied === true,
              }
            : null,
          projectStateAudit: mergeVisibleReplyProjectStateAudit({
            primary: preDialogueProjectStateAudit,
            structured: normalizedSurfaceProjectStateAudit,
          }),
          reason: sanitizeText(surface?.reason, '') || (preDialogueProjectStateAudit ? 'pre-dialogue-awareness-debug' : null),
        }
      : null

    if (!memoryTrace && !visibleReplyRealization) {
      pendingMindTraceTelemetryByTurnId.delete(turnId)
      return
    }

    const previous = pendingMindTraceTelemetryByTurnId.get(turnId) ?? null
    pendingMindTraceTelemetryByTurnId.set(turnId, {
      memoryTrace: memoryTrace ?? previous?.memoryTrace ?? null,
      visibleReplyRealization: visibleReplyRealization ?? previous?.visibleReplyRealization ?? null,
    })
    if (pendingMindTraceTelemetryByTurnId.size > 128) {
      const oldestKey = pendingMindTraceTelemetryByTurnId.keys().next().value
      if (typeof oldestKey === 'string')
        pendingMindTraceTelemetryByTurnId.delete(oldestKey)
    }
  }

  function normalizeVisibleReplyRealizationTelemetry(raw: unknown): PendingVisibleReplyRealizationTelemetry | null {
    if (!raw || typeof raw !== 'object')
      return null

    return {
      expectedAuthority: sanitizeText((raw as any).expectedAuthority, '') as PendingVisibleReplyRealizationTelemetry['expectedAuthority'],
      actualAuthority: sanitizeText((raw as any).actualAuthority, '') as PendingVisibleReplyRealizationTelemetry['actualAuthority'],
      providerMindExecuted: typeof (raw as any).providerMindExecuted === 'boolean'
        ? (raw as any).providerMindExecuted
        : null,
      mode: sanitizeText((raw as any).mode, '') || null,
      visibleText: sanitizeText((raw as any).visibleText, '') || null,
      nonHumanAuthoredStatus: sanitizeText((raw as any).nonHumanAuthoredStatus, '') || null,
      blockedReasons: Array.isArray((raw as any).blockedReasons)
        ? ((raw as any).blockedReasons as unknown[])
            .map(item => sanitizeText(item, ''))
            .filter(Boolean)
            .slice(0, 12)
        : [],
      emotionalClosureAudit: (raw as any).emotionalClosureAudit
        ? {
            activeCue: sanitizeText((raw as any).emotionalClosureAudit.activeCue, '') || null,
            preservedIntoRewrite: (raw as any).emotionalClosureAudit.preservedIntoRewrite === true,
            rewriteClosureApplied: (raw as any).emotionalClosureAudit.rewriteClosureApplied === true,
            lowPressureRequired: (raw as any).emotionalClosureAudit.lowPressureRequired === true,
            antiRestartRequired: (raw as any).emotionalClosureAudit.antiRestartRequired === true,
          }
        : null,
      selfAuthorityAudit: (raw as any).selfAuthorityAudit
        ? {
            authoritySummary: sanitizeText((raw as any).selfAuthorityAudit.authoritySummary, '') || null,
            closenessPosture: sanitizeText((raw as any).selfAuthorityAudit.closenessPosture, '') || null,
            preservedIntoRewrite: (raw as any).selfAuthorityAudit.preservedIntoRewrite === true,
            rewriteClosureApplied: (raw as any).selfAuthorityAudit.rewriteClosureApplied === true,
          }
        : null,
      projectStateAudit: normalizeVisibleReplyProjectStateAudit((raw as any).projectStateAudit),
      reason: sanitizeText((raw as any).reason, '') || null,
    }
  }
  const {
    memoryLedgerRuntime,
    executionCallbackRuntime,
    memoryRetrievalTelemetryRuntime,
    getRecallFeedbackSummary: _getRecallFeedbackSummary,
    selfEvolutionRuntime,
  } = createAlicizationRuntimeSupportingRuntimesComposition({
    execution: {
      alicizationDb: {
        listExecutionEvents: input => alicizationDb.listExecutionEvents(input),
        listTaskThreads: input => alicizationDb.listTaskThreads(input),
      },
    },
    memoryFeedback: {
      now: () => Date.now(),
      activeCardId,
      summaryMetaKey: 'memory_recall_feedback_summary_v1',
      alicizationDb: {
        getMetaValue: key => alicizationDb.getMetaValue(key),
        setMetaValue: (key, value) => alicizationDb.setMetaValue(key, value),
        listMemoryReflections: input => alicizationDb.listMemoryReflections(input),
      },
    },
    selfEvolution: {
      now: () => Date.now(),
      snapshotMetaKey: alicizationSelfEvolutionVersionRuntimeMetaKey,
      alicizationDb: {
        getMetaValue: key => alicizationDb.getMetaValue(key),
        setMetaValue: (key, value) => alicizationDb.setMetaValue(key, value),
      },
    },
  })
  runtimeTestInternals.currentExecutionCallbackRuntime = executionCallbackRuntime
  const memoryRuntime = createAlicizationRuntimeMemoryRuntime({
    organicMemoryAccess: {
      getActiveCardId: () => activeCardId,
      getSoulSnapshot: () => soulLifecycleState.soulSnapshot,
      bootstrap: async () => await bootstrap(),
      listActiveThoughts: async () => await alicizationDb.listActiveThoughts(),
      countSubconsciousFragments: async () => await alicizationDb.countSubconsciousFragments(),
      listRecentSubconsciousFragments: async limit => await alicizationDb.listRecentSubconsciousFragments(limit),
      getMetaValue: async key => await alicizationDb.getMetaValue(key),
      replaceActiveThoughts: async (items) => {
        await alicizationDb.replaceActiveThoughts(items)
      },
      setMetaValue: async (key, value) => await alicizationDb.setMetaValue(key, value),
      searchSubconsciousFragments: async (query, limit) => await alicizationDb.searchSubconsciousFragments(query, limit),
      listRecentEpisodicEvents: async limit => await alicizationDb.listRecentEpisodicEvents(limit),
      listMemoryConsolidations: async limit => await alicizationDb.listMemoryConsolidations(limit).catch(() => []),
      getLatestRelationshipDynamics: async () => await alicizationDb.getLatestRelationshipDynamics().catch(() => null),
      listRelationshipOutcomes: async input => await alicizationDb.listRelationshipOutcomes(input).catch(() => []),
      listMemoryReflections: async input => await alicizationDb.listMemoryReflections(input).catch(() => []),
      listPersonaReinforcementEvents: async input => await alicizationDb.listPersonaReinforcementEvents(input).catch(() => []),
      summarizePersonStateEvolution: async input => await alicizationDb.summarizePersonStateEvolution(input).catch(() => ({
        trustShift: 0,
        closenessShift: 0,
        repairShift: 0,
        autonomyShift: 0,
        burdenShift: 0,
        executionTrustShift: 0,
        relationshipDoctrineShift: 0,
        latestDoctrine: null,
        latestBurdenLine: null,
        latestTrustMeaning: null,
        latestDominantRung: null,
        recentSummaries: [],
        explanation: [],
        updatedAt: null,
      })),
      readMindHead: async <T>(cardId: string, key: 'person-state-update-surface') => await alicizationDb.readMindHead<T>(cardId, key).catch((): T | null => null),
      searchEpisodicEvents: async input => await alicizationDb.searchEpisodicEvents(input),
      searchConversationTurnsForRecall: async input => await alicizationDb.searchConversationTurnsForRecall(input),
      searchMemoryConsolidations: async input => await alicizationDb.searchMemoryConsolidations?.(input) ?? [],
      listConversationTurnsBySession: async (sessionId, options) => await alicizationDb.listConversationTurnsBySession(sessionId, options),
      getLatestLearningExecutionState: async cardId => await alicizationDb.getLatestLearningExecutionState(cardId).catch(() => null),
      recordMemoryCacheAccess: async hit => await memoryRetrievalTelemetryRuntime.recordCacheAccess(hit),
      recordMemoryPrewarmAccess: async hit => await memoryRetrievalTelemetryRuntime.recordPrewarmAccess(hit),
      recordMemoryBudgetClass: async budgetClass => await memoryRetrievalTelemetryRuntime.recordBudgetClass(budgetClass),
      recordMemoryHotKeyOutcome: async input => await memoryRetrievalTelemetryRuntime.recordHotKeyOutcome(input),
      getMemoryRetrievalTelemetry: async () => await memoryRetrievalTelemetryRuntime.getTelemetry(),
      getActiveSelfRevisionStatePatch: async () => await selfEvolutionRuntime.getActivePatch(),
      getActiveSelfEvolutionCandidateId: async () => (await selfEvolutionRuntime.getActiveCandidate())?.id ?? null,
    },
    organicMemorySearch: {
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getLatestRelationshipDynamics: async () => await alicizationDb.getLatestRelationshipDynamics().catch(() => null),
      listMindTurnEvents: input => alicizationDb.listMindTurnEvents(input),
      retrieveMemoryFacts: async (recallSeed, limit) => await alicizationDb.retrieveMemoryFacts(recallSeed, limit).catch(() => []),
      planRecollectionIntent: async input => await generateMemoryRecollectionIntentWithMemoryOsGateway({
        ...input,
        generateMainGatewayText: memoryGatewayTextProvider,
        cardId: activeCardId,
      }),
      planMemoryRecollection: async input => await generateMemoryRecollectionPlanWithMemoryOsGateway({
        ...input,
        generateMainGatewayText: memoryGatewayTextProvider,
        cardId: activeCardId,
      }),
      planRecollectionSpeech: async input => await generateMemoryRecollectionSpeechPlanWithMemoryOsGateway({
        ...input,
        generateMainGatewayText: memoryGatewayTextProvider,
        cardId: activeCardId,
      }),
      planMemoryDeliberation: async input => await generateMemoryDeliberationWithMemoryOsGateway({
        ...input,
        generateMainGatewayText: memoryGatewayTextProvider,
        cardId: activeCardId,
      }),
      isPersonaResidueMemoryText,
      recordMemoryCandidateGenerationLatency: async (latencyMs: number) => await memoryRetrievalTelemetryRuntime.recordCandidateGenerationLatency(latencyMs),
      recordMemoryPlannerLatency: async (latencyMs: number) => await memoryRetrievalTelemetryRuntime.recordPlannerLatency(latencyMs),
      recordMemorySpeechPlanLatency: async (latencyMs: number) => await memoryRetrievalTelemetryRuntime.recordSpeechPlanLatency(latencyMs),
      recordOrganicMemoryStageLatency: async input => await memoryRetrievalTelemetryRuntime.recordOrganicStageLatency(input),
      recordOrganicMemoryStageBudget: async input => await memoryRetrievalTelemetryRuntime.recordOrganicStageBudget(input),
    },
    memoryReconsolidation: {
      sanitizeMindGovernanceDecisionTraceId,
      sanitizeText,
      errorMessageFrom,
      appendAuditLog,
      alicizationDb: {
        listMindTurnEvents: input => alicizationDb.listMindTurnEvents(input),
        searchEpisodicEvents: input => alicizationDb.searchEpisodicEvents(input),
        appendMindTurnEvents: events => alicizationDb.appendMindTurnEvents(events),
      },
    },
  })
  const {
    getOrganicMemorySnapshot,
    getPerformanceManifest,
    setPerformanceManifest,
    searchOrganicSubconsciousFragments,
    buildHostPersonModel,
    resolveRecentContextualTurns,
    buildProactiveRecallSeed,
    buildOrganicMemorySystemBlocks,
    tuneOrganicMemoryPromptContextForExecutiveTurn,
    buildPerformanceManifestSystemBlocks,
    resolveOrganicMemoryPromptContext: resolveBaseOrganicMemoryPromptContext,
  } = memoryRuntime
  const projectStateSystemBlock = buildAlicizationProjectStateSystemBlock()
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const resolveOrganicMemoryPromptContext: typeof resolveBaseOrganicMemoryPromptContext = async (input) => {
    return await resolveBaseOrganicMemoryPromptContext({
      ...input,
      projectStateBrief: input?.projectStateBrief ?? projectStateBrief,
    })
  }
  const projectStatePersistence = {
    identity: projectStateBrief.identity,
    currentPhase: projectStateBrief.currentPhase,
    latestLandedProgress: projectStateBrief.continuityProgressSummary ?? projectStateBrief.memoryAnthropomorphismProgress.at(-1) ?? null,
    primaryOpenLoop: projectStateBrief.openLoops[0] ?? null,
    openFocusSummary: deriveCompactProjectStateOpenFocusSummary(projectStateBrief.openLoops[0] ?? null),
    nextClosureTarget: projectStateBrief.nextClosureTarget,
    nextFocusSummary: deriveCompactProjectStateNextFocusSummary(projectStateBrief.nextClosureTarget),
    emotionalClosureCue: projectStateBrief.emotionalClosureCue ?? null,
    sameHerHoldDetail: projectStateBrief.sameHerHoldDetail ?? null,
  }
  const {
    executeLearningTask: _executeLearningTask,
    learningActionScheduler,
    memoryClosureRuntime,
  } = createAlicizationRuntimeMemorySupportingComposition({
    learning: {
      now: () => Date.now(),
      activeCardId,
      randomUUID,
      getActiveCardId: () => activeCardId,
      appendAuditLog,
      alicizationDb: {
        listMemoryFacts: () => alicizationDb.listMemoryFacts(),
        listMemoryReflections: input => alicizationDb.listMemoryReflections(input),
        listRelationshipOutcomes: input => alicizationDb.listRelationshipOutcomes(input),
        upsertMemoryReflections: entries => alicizationDb.upsertMemoryReflections(entries),
        applyMemoryFactCorrections: corrections => alicizationDb.applyMemoryFactCorrections(corrections),
        upsertMemoryFacts: (facts, source) => alicizationDb.upsertMemoryFacts(facts, source),
        appendMindTurnEvents: events => alicizationDb.appendMindTurnEvents(events),
        insertLearningTask: input => alicizationDb.insertLearningTask(input),
        claimDueLearningTasks: (cardId, nowMs, limit) => alicizationDb.claimDueLearningTasks(cardId, nowMs, limit),
        startLearningTask: (taskId, startedAt) => alicizationDb.startLearningTask(taskId, startedAt),
        blockLearningTask: (taskId, input, updatedAt) => alicizationDb.blockLearningTask(taskId, input, updatedAt),
        completeLearningTask: (taskId, input, completedAt) => alicizationDb.completeLearningTask(taskId, input, completedAt),
        failLearningTask: (taskId, input, updatedAt) => alicizationDb.failLearningTask(taskId, input, updatedAt),
        reopenLearningTask: (taskId, input, updatedAt) => alicizationDb.reopenLearningTask(taskId, input, updatedAt),
        downgradeLearningTask: (taskId, input, updatedAt) => alicizationDb.downgradeLearningTask(taskId, input, updatedAt),
        cancelLearningTask: (taskId, input, updatedAt) => alicizationDb.cancelLearningTask(taskId, input, updatedAt),
        listLearningTasks: input => alicizationDb.listLearningTasks(input),
      },
      assimilateMemoryFactsDetailed: input => memoryRuntime.knowledgeAssimilationRuntime.assimilateMemoryFactsDetailed(input),
      recordLearningExecutionTelemetry: input => memoryRetrievalTelemetryRuntime.recordLearningExecution(input),
      proposeSelfEvolutionVersion: input => selfEvolutionRuntime.proposeVersion(input),
    },
    memoryClosure: {
      now: () => Date.now(),
      normalizeCardId,
      getActiveCardId: () => activeCardId,
      withCardScope,
      errorMessageFrom,
      ensureMindGovernanceDecisionTraceId: (raw, traceNow) => {
        const normalized = sanitizeMindGovernanceDecisionTraceId(raw)
        return normalized || `mind:${Math.max(0, Math.floor(traceNow ?? Date.now())).toString(36)}:${randomUUID().replace(/-/g, '').slice(0, 12)}`
      },
      appendAuditLog,
      knowledgeAssimilationRuntime: memoryRuntime.knowledgeAssimilationRuntime,
      alicizationDb: {
        appendRelationshipOutcomes: entries => alicizationDb.appendRelationshipOutcomes(entries),
        appendEpisodicEvents: events => alicizationDb.appendEpisodicEvents(events),
        persistEpisodicReconsolidations: events => alicizationDb.persistEpisodicReconsolidations(events),
        appendPersonaReinforcementEvents: events => alicizationDb.appendPersonaReinforcementEvents(events),
        appendPersonStateEvolutionEntries: entries => alicizationDb.appendPersonStateEvolutionEntries(entries),
        upsertMemoryReflections: reflections => alicizationDb.upsertMemoryReflections(reflections),
        upsertMemoryFacts: (facts, source) => alicizationDb.upsertMemoryFacts(facts, source),
        applyMemoryFactCorrections: corrections => alicizationDb.applyMemoryFactCorrections(corrections),
        listMemoryFacts: () => alicizationDb.listMemoryFacts(),
        readMindHead: (cardId, key) => alicizationDb.readMindHead(cardId, key),
        upsertMindHead: (cardId, key, value) => alicizationDb.upsertMindHead(cardId, key, value),
        appendMindTurnEvents: events => alicizationDb.appendMindTurnEvents(events),
      },
    },
  })
  const {
    sessionContinuityBuildersRuntime,
    visualPresenceStateRuntime,
  } = createAlicizationRuntimeContinuityPresenceComposition({
    sessionContinuity: {
      sanitizeText,
      sanitizeBriefText,
      sanitizeExecutionLedgerText,
      readTaskThreadActivityAt,
      terminalTaskThreadStatuses: alicizationTerminalTaskThreadStatuses,
      proactiveReplyWindowMs,
      proactiveImplicitIgnoredAfterMs,
      proactiveDismissCooldownMs,
      buildVisualPresenceCapturePersistFingerprint,
    },
    visualPresence: {
      now: () => Date.now(),
      normalizeCardId,
      getActiveCardId: () => activeCardId,
      withCardScope,
      alicizationDb: {
        getMetaValue: key => alicizationDb.getMetaValue(key),
        setMetaValue: (key, value) => alicizationDb.setMetaValue(key, value),
        upsertMindHead: (cardId, key, value) => alicizationDb.upsertMindHead(cardId, key, value),
      },
      perceptionStateByCard,
      visualPresenceStateByCard,
      visualPresenceCapturePersistMetaByCard,
      createDefaultPerceptionState,
      normalizePerceptionState,
      createDefaultVisualPresenceState,
      normalizeVisualPresenceState,
      buildVisualPresenceCapturePersistFingerprint,
      emitVisualPresenceState,
      perceptionMetaKey: alicizationPerceptionStateMetaKey,
      visualPresenceMetaKey: alicizationVisualPresenceStateMetaKey,
    },
  })
  const persistPerceptionState = visualPresenceStateRuntime.persistPerceptionState
  const queuePerceptionStateMutation = visualPresenceStateRuntime.queuePerceptionStateMutation
  const ensurePerceptionState = visualPresenceStateRuntime.ensurePerceptionState
  const persistVisualPresenceState = visualPresenceStateRuntime.persistVisualPresenceState
  const ensureVisualPresenceState = visualPresenceStateRuntime.ensureVisualPresenceState
  const persistOutcomeClosure = memoryClosureRuntime.persistOutcomeClosure
  const persistPreparedMirrorAutobiographicalEpisodes = memoryClosureRuntime.persistPreparedMirrorAutobiographicalEpisodes
  const persistSessionMirrorAutobiographicalEpisodes = memoryClosureRuntime.persistSessionMirrorAutobiographicalEpisodes
  const {
    buildExecutionDeliveryAction,
    buildTaskThreadSessionMirrorAction,
    buildSceneResidueSessionMirrorAction,
    buildReminderContinuitySignal,
    buildReminderSessionMirrorAction,
    buildProactiveFeedbackSessionMirrorAction,
    buildProactiveOutcomeContinuitySignal,
    buildDeferredAutonomyContinuitySignal,
    buildPendingProactiveContinuitySignal,
    buildProactiveContinuitySignals,
    buildAutobiographicalAfterglowContinuitySignals,
    buildDialogueContinuitySignal,
    buildVisualPresenceContinuitySignal,
  } = sessionContinuityBuildersRuntime
  const executionDeliveryRuntime = createAlicizationExecutionDeliveryRuntime()
  const agentRuntime = createAlicizationAgentRuntime({
    getSensorySnapshot: async () => sensoryBus.getSnapshot(),
    resolveConversationSessionId: async cardId => await ensureActiveOrLatestSessionId(cardId),
  })
  const dialogueSessionManager = createAlicizationDialogueSessionManager()
  const executorRuntime = createAlicizationExecutorRuntime({
    appendAuditLog,
    assessTaskRouting: input => assessAlicizationTaskRouting(input),
    dispatchTaskThread: invocation => dispatchTaskThreadWithExecutionDelivery(invocation),
    ensureSessionId: ensureActiveOrLatestSessionId,
    getAlicizationDb: () => alicizationDb,
    getCardKillSwitchState: cardId => getAlicizationCardKillSwitchSnapshot(cardId).state,
    getGlobalKillSwitchState: () => getAlicizationKillSwitchSnapshot().state,
    normalizeSessionId,
    resolveLocalCapabilityChannels: async () => await localBrowserAutomation.resolveCapabilityChannels(),
    sanitizeText,
  })
  let activeProviderId = ''
  let activeModelId = ''
  let providerCredentials: Record<string, Record<string, unknown>> = {}
  const mainGatewayConfigRuntime = createAlicizationMainGatewayConfigRuntime({
    sanitizeText,
    getActiveProviderId: () => activeProviderId,
    getActiveModelId: () => activeModelId,
    getProviderCredentials: () => providerCredentials,
  })
  const {
    normalizeProviderCredentialsMap,
    normalizeProviderConfig,
    rememberMainGatewayRoute,
    resolveMainGatewayConfig,
    ensureMainGatewayReachable,
    recordMainGatewayGenerationTimeout,
  } = mainGatewayConfigRuntime
  const cardPromptRuntime = createAlicizationCardPromptRuntime({
    getActiveCardId: () => activeCardId,
    getSoulSnapshot: () => soulLifecycleState.soulSnapshot,
    resolveCardPaths,
    normalizeCardId,
    sanitizeText,
    appendRuntimeDebugLine,
  })
  const {
    resolveCardHostName,
    resolveCardPersonaKernel,
    buildMainRuntimeCorePromptBlocks,
    resolveCardCustomDirectives,
    buildMainGatewayAgentTurnId,
  } = cardPromptRuntime
  const agentSessionMirrorRuntime = createAlicizationAgentSessionMirrorRuntime({
    sanitizeText,
    sanitizeBriefText,
    normalizeCardId,
    normalizeSessionId,
    getActiveSessionIdByCard: cardId => activeSessionIdByCard.get(cardId),
    getLatestConversationSessionId: async () => await alicizationDb.getLatestConversationSessionId().catch(() => undefined),
    openAgentTurn: input => agentRuntime.openTurn(input),
    buildMainGatewayAgentTurnId,
    resolveAgentSessionContinuityContext: async cardId => await resolveAgentSessionContinuityContext(cardId),
    buildTaskThreadSessionMirrorAction,
    buildSceneResidueSessionMirrorAction,
    buildProactiveFeedbackSessionMirrorAction,
    buildProactiveOutcomeContinuitySignal,
    buildReminderSessionMirrorAction,
    dialogueSessionManager,
    persistAutobiographicalEpisodesFromSessionMirror: persistSessionMirrorAutobiographicalEpisodes,
  })
  const {
    buildAgentRuntimeAuditSnapshot,
    buildAgentTurnContinuitySystemMessages,
    hydrateAgentTurnFromCurrentCardState,
    syncAgentTurnSessionMirror,
    syncSessionMirrorFromCurrentCardState,
  } = agentSessionMirrorRuntime
  const mainGatewayOneShotRuntime = createAlicizationMainGatewayOneShotRuntime({
    getActiveCardId: () => activeCardId,
    getActiveProviderId: () => activeProviderId,
    getActiveModelId: () => activeModelId,
    openAgentTurn: input => agentRuntime.openTurn(input),
    resolveMainGatewayConfig,
    rememberMainGatewayRoute,
    appendRuntimeDebugLine,
    resolveCardCustomDirectives,
    buildPendingExecutionCallbackContext: input => executionCallbackRuntime.buildPendingExecutionCallbackContext(input),
    resolveAgentSessionContinuityContext: async (cardId, input) => await resolveAgentSessionContinuityContext(cardId, input),
    getPerformanceManifest,
    buildPerformanceManifestSystemBlocks,
    buildAgentTurnContinuitySystemMessages,
    syncAgentTurnSessionMirror,
    appendAuditLog,
    describePerceptionTarget,
    buildMainGatewayAgentTurnId,
    screenSemanticCacheByCard,
    ensurePerceptionState,
    getUsablePerceptionSceneResidue,
    buildScreenSemanticSummaryFromResidue,
    clearDesktopCaptureAccessCache: () => desktopCaptureAccessRuntime.clear(),
    resolveDesktopCaptureAccess,
    getDesktopCaptureAccessRuntimeSnapshot: input => deriveSensoryCaptureSnapshotFromAccessRuntimeSnapshot(
      desktopCaptureAccessRuntime.getSnapshot(input),
    ),
    rememberSceneResidue,
  })
  const {
    buildScreenSemanticSceneResidue,
    generateScreenSemanticSummaryFromImage,
    generateMainGatewayText,
    resolveProactiveScreenSemanticSummary,
  } = mainGatewayOneShotRuntime
  const mainGatewayTextProvider: AlicizationMainGatewayTextProvider = generateMainGatewayText
  async function resolveMemoryGatewayDigitalLifeRuntimeSurface(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const readRuntimeSurface = async () => {
      const visualPresenceState = await ensureVisualPresenceState(cardId).catch(() => null)
      return visualPresenceState ? buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState) : null
    }

    if (cardId === activeCardId)
      return await readRuntimeSurface()

    return await withCardScope(cardId, readRuntimeSurface, {
      label: `memory-gateway-runtime-surface:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })
  }
  const memoryGatewayTextProvider: AlicizationMemoryGatewayTextProvider = async (input) => {
    const explicitRuntimeSurface = input.digitalLifeRuntimeSurface ?? null
    const liveRuntimeSurface = explicitRuntimeSurface ?? await resolveMemoryGatewayDigitalLifeRuntimeSurface(input.cardId ?? activeCardId)
    return await mainGatewayTextProvider({
      ...input,
      extraSystemBlocks: input.extraSystemBlocks ? [...input.extraSystemBlocks] : undefined,
      digitalLifeRuntimeSurface: liveRuntimeSurface,
    })
  }
  const mainChatRuntime = createAlicizationRuntimeMainChatRuntime({
    context: {
      getActiveCardId: () => activeCardId,
      normalizeOrganicRecallText,
      readTransportContentAsText,
      isInternalAlicizationRepairPrompt,
      emptyAlicizationExecutionCallbackContext,
      emptyAlicizationExecutionLedgerContext,
      ensureActiveOrLatestSessionId,
      buildPendingExecutionCallbackContext: input => executionCallbackRuntime.buildPendingExecutionCallbackContext(input),
      buildExecutionLedgerContext: input => memoryLedgerRuntime.buildExecutionLedgerContext(input),
      listTaskThreadsBySession: input => alicizationDb.listTaskThreads(input),
      resolveRecentContextualTurns,
      shouldExtendContextualRecall,
      detectInvitedInspectionIntent,
    },
    inspection: {
      normalizeOrganicRecallText,
      readLatestAssistantMessageText: messages => mainChatRuntime.readLatestAssistantMessageText(messages as any),
      readTransportContentAsText,
    },
  })
  const {
    readLatestUserMessageText,
    readLatestAssistantMessageText,
    redactStaleInspectionHistoryMessages,
    buildDialogueIngressContext,
    resolveInspectionIntentForChatTurn,
  } = mainChatRuntime
  redactStaleInspectionHistoryMessagesForChat = redactStaleInspectionHistoryMessages
  const mindStateRuntime = createAlicizationMindStateRuntime({
    buildDialogueIngressContext,
    generateMainGatewayText: mainGatewayTextProvider,
    buildMainGatewayAgentTurnId,
    readLatestAssistantMessageText,
    readTransportContentAsText,
    retrieveMemoryFacts: async (query, limit) => await alicizationDb.retrieveMemoryFacts(query, limit).catch(() => []),
    listRelationshipOutcomes: async (cardId, limit) => await alicizationDb.listRelationshipOutcomes({ cardId, limit }).catch(() => []),
    listPersonaReinforcementEvents: async (cardId, limit) => await alicizationDb.listPersonaReinforcementEvents({ cardId, limit }).catch(() => []),
    listMemoryReflections: async (cardId, limit) => await alicizationDb.listMemoryReflections({ cardId, limit }).catch(() => []),
    listMemoryConsolidations: async limit => await alicizationDb.listMemoryConsolidations?.(limit).catch(() => []) ?? [],
    getPersonStateEvolutionSummary: async ({ cardId, limit }) => await alicizationDb.summarizePersonStateEvolution({ cardId, limit }).catch(() => null),
    readMindHead: async <T>(cardId: string, key: AlicizationMindHeadKey) => await alicizationDb.readMindHead<T>(cardId, key).catch((): T | null => null),
  })
  const {
    buildDigitalLifeMindState,
    buildMindAttentionSignature,
    buildMindSceneSignature,
  } = mindStateRuntime
  const bodyKernel = createAlicizationBodyKernel({ now: Date.now })

  function commitAlicizationDigitalLifeSpineWithBodyAuthority(input: {
    now: number
    previousState: AlicizationVisualPresenceStateSnapshot
    watchMode: AlicizationVisualPresenceStateSnapshot['watchMode']
    scene: AlicizationVisualPresenceStateSnapshot['currentScene']
    attention: AlicizationVisualPresenceStateSnapshot['attention']
    mindState: Awaited<ReturnType<typeof buildDigitalLifeMindState>>
    captureState: AlicizationVisualPresenceStateSnapshot['captureState']
    durabilityPulse: AlicizationDurabilityPulseSnapshot | null
    recentTransition: AlicizationVisualPresenceStateSnapshot['recentTransition']
    nextSuggestedProbeMs: number
    activeConversation: boolean
  }) {
    const committed = commitAlicizationDigitalLifeSpine({
      now: input.now,
      previousState: input.previousState,
      watchMode: input.watchMode,
      scene: input.scene,
      attention: input.attention,
      mindState: input.mindState,
      captureState: input.captureState,
      durabilityPulse: input.durabilityPulse,
      recentTransition: input.recentTransition,
      nextSuggestedProbeMs: input.nextSuggestedProbeMs,
    })
    const emotionalTransitionLedger = committed.current.runtimeSurface.memory?.derivedMindStateBundle?.emotionalTransitionLedger ?? null
    const emotionalKernelForDecay = committed.current.runtimeSurface.memory?.emotionalKernel
      ?? committed.current.runtimeSurface.memory?.derivedMindStateBundle?.emotionalKernel
      ?? committed.nextState.emotionalKernel
      ?? null
    const emotionalTransitionDecay = emotionalTransitionLedger
      ? resolveAlicizationEmotionalTransitionDecay({
          ledger: emotionalTransitionLedger,
          now: input.now,
          current: emotionalKernelForDecay,
        })
      : null
    const nextState = bodyKernel.applyToVisualPresenceState({
      now: input.now,
      previousState: input.previousState,
      candidateState: {
        ...committed.nextState,
        emotionalTransitionDecay,
      },
      activeConversation: input.activeConversation,
    })

    return {
      ...committed,
      nextState,
      current: deriveAlicizationDigitalLifeSpine(nextState),
    }
  }
  const replayBenchmarkRuntime = createAlicizationReplayBenchmarkRuntime({
    getAlicizationDb: () => alicizationDb,
    appendAuditLog,
    selfEvolutionRuntime,
  })
  const {
    probeForegroundPidLiveness,
    updateForegroundProbeTimeoutStreak,
    clearForegroundProbeTimeoutStreakForPid,
    sampleSubconsciousInterruptionContext,
  } = createAlicizationSubconsciousProbeRuntime({
    platform,
    getSystemIdleTime: () => powerMonitor.getSystemIdleTime(),
    getSensorySnapshot: () => sensoryBus.getSnapshot(),
    sanitizeText,
    errorMessageFrom,
    subconsciousInterruptionProbeTimeoutMs,
    foregroundProbeTimeoutStreakByPid,
  })
  const localBrowserAutomation = createAlicizationLocalBrowserAutomationService({
    errorMessageFrom,
  })
  const resolveDesktopInspectionBrowserName = (input: {
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
    } | null
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    } | null
    summary?: {
      workload?: {
        kind?: string
      } | null
    } | null
  }) => {
    if (input.summary?.workload?.kind !== 'browser') {
      const haystack = [
        sanitizeText(input.focusTarget?.appName, '') ?? '',
        sanitizeText(input.focusTarget?.processName, '') ?? '',
        sanitizeText(input.foregroundWindow?.appName, '') ?? '',
        sanitizeText(input.foregroundWindow?.processName, '') ?? '',
      ].join(' ').toLowerCase()
      if (!/\b(?:google chrome|chrome|safari)\b/u.test(haystack))
        return null
    }

    const haystack = [
      sanitizeText(input.focusTarget?.appName, '') ?? '',
      sanitizeText(input.focusTarget?.processName, '') ?? '',
      sanitizeText(input.foregroundWindow?.appName, '') ?? '',
      sanitizeText(input.foregroundWindow?.processName, '') ?? '',
    ].join(' ').toLowerCase()

    if (/\bsafari\b/u.test(haystack))
      return 'safari' as const
    if (/\b(?:google chrome|chrome)\b/u.test(haystack))
      return 'chrome' as const
    return null
  }
  const readDesktopInspectionBrowserPageContext = async (input: {
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
    } | null
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    } | null
    summary?: {
      workload?: {
        kind?: string
      } | null
    } | null
  }) => {
    type DesktopInspectionBrowserPageContext = NonNullable<ReturnType<typeof buildAlicizationDesktopInspectionSceneSnapshot>['browserPageContext']>
    const normalizeBrowserScrollState = (raw: unknown) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null

      const record = raw as Record<string, unknown>
      return {
        offsetY: typeof record.offsetY === 'number' && Number.isFinite(record.offsetY) ? record.offsetY : null,
        viewportHeight: typeof record.viewportHeight === 'number' && Number.isFinite(record.viewportHeight) ? record.viewportHeight : null,
        documentHeight: typeof record.documentHeight === 'number' && Number.isFinite(record.documentHeight) ? record.documentHeight : null,
        canScrollDown: record.canScrollDown === true,
        canScrollUp: record.canScrollUp === true,
      }
    }

    const browser = resolveDesktopInspectionBrowserName(input)
    if (!browser)
      return null

    const [interactablesResult, textResult] = await Promise.all([
      localBrowserAutomation.readPage({
        browser,
        format: 'interactables',
      }).catch(() => null),
      localBrowserAutomation.readPage({
        browser,
        format: 'text',
        maxChars: 600,
      }).catch(() => null),
    ])

    const interactablesRecord = interactablesResult && typeof interactablesResult === 'object' && !Array.isArray(interactablesResult)
      ? interactablesResult as Record<string, unknown>
      : null
    const textRecord = textResult && typeof textResult === 'object' && !Array.isArray(textResult)
      ? textResult as Record<string, unknown>
      : null
    const interactables = Array.isArray(interactablesRecord?.interactables)
      ? interactablesRecord.interactables as DesktopInspectionBrowserPageContext['interactables']
      : []
    const url = sanitizeText(interactablesRecord?.url, '') || sanitizeText(textRecord?.url, '') || null
    const title = sanitizeText(interactablesRecord?.title, '') || sanitizeText(textRecord?.title, '') || null
    const textExcerpt = sanitizeText(textRecord?.content, '') || null
    const scrollState = normalizeBrowserScrollState(interactablesRecord?.scrollState)
      ?? normalizeBrowserScrollState(textRecord?.scrollState)

    if (interactables.length <= 0 && !url && !title && !textExcerpt)
      return null

    return {
      browser,
      interactables,
      scrollState,
      textExcerpt,
      title,
      url,
    }
  }
  const buildDesktopInspectionWorkflowTaskKey = (input: {
    browserPageContext?: {
      title?: string | null
      url?: string | null
    } | null
    question?: string | null
    targetPhase?: string | null
  }) => {
    return sanitizeText(
      input.question
      || input.browserPageContext?.title
      || input.browserPageContext?.url
      || '',
      '',
    )
    || sanitizeText(input.targetPhase, '')
    || ''
  }
  const desktopInspectScene = async (input: AlicizationLocalDesktopInspectSceneInput) => {
    const cardId = normalizeCardId(input.cardId ?? activeCardId)
    const question = typeof input.question === 'string'
      ? input.question.trim().replace(/\s+/g, ' ').slice(0, 240)
      : ''
    const goal = question
      ? `Inspect the current desktop scene for: ${question}`
      : 'Inspect the current desktop scene.'
    const now = Date.now()

    try {
      if (input.forceRefresh === true)
        screenSemanticCacheByCard.delete(cardId)

      const snapshot = sensoryBus.getSnapshot()
      let perceptionState = await ensurePerceptionState(cardId)
      const interruptionContext = await sampleSubconsciousInterruptionContext()
      const resolvedForegroundWindow = resolveForegroundDecisionTarget({
        snapshotForeground: snapshot.sample.foregroundWindow,
        probedForeground: interruptionContext.foregroundWindow,
        attentionAnchor: getActiveAttentionAnchor(perceptionState, now),
      })

      await rememberPerceptionObservation({
        cardId,
        now,
        target: resolvedForegroundWindow,
        source: 'chat-start',
      })

      perceptionState = await ensurePerceptionState(cardId)

      const grounding = await resolveProactiveScreenSemanticSummary({
        cardId,
        now,
        foregroundWindow: resolvedForegroundWindow,
        perceptionState,
      })
      const foregroundWindow = resolvedForegroundWindow ?? snapshot.sample.foregroundWindow ?? null
      const focusTarget = grounding.focusTarget ?? null
      const screenSemanticSummary = grounding.summary ?? null
      const unavailableReason = grounding.unavailableReason ?? null
      const browserPageContext = await readDesktopInspectionBrowserPageContext({
        focusTarget,
        foregroundWindow,
        summary: screenSemanticSummary,
      })
      const interactableResult = await localBrowserAutomation.listDesktopInteractables({
        maxItems: 20,
      }).catch(() => null)
      const interactables: AlicizationLocalDesktopInspectionInteractable[] = interactableResult
        && typeof interactableResult === 'object'
        && !Array.isArray(interactableResult)
        && interactableResult.status === 'completed'
        && 'interactables' in interactableResult
        && Array.isArray(interactableResult.interactables)
        ? interactableResult.interactables as AlicizationLocalDesktopInspectionInteractable[]
        : []
      const provisionalInspectionSnapshot = buildAlicizationDesktopInspectionSceneSnapshot({
        browserPageContext,
        capture: grounding.capture ?? snapshot.capture ?? null,
        focusTarget,
        foregroundWindow,
        interactables,
        maxSuggestedActions: input.maxSuggestedActions,
        question: question || null,
        summary: screenSemanticSummary,
        unavailableReason,
      })
      const workflowState = provisionalInspectionSnapshot.browserPageContext
        ? (await queuePerceptionStateMutation(cardId, current => rememberPerceptionBrowserWorkflowState({
            state: current,
            now,
            currentPhase: provisionalInspectionSnapshot.pagePhase,
            targetPhase: provisionalInspectionSnapshot.workflowPlan.targetPhase,
            taskKey: buildDesktopInspectionWorkflowTaskKey({
              browserPageContext: provisionalInspectionSnapshot.browserPageContext,
              question: question || null,
              targetPhase: provisionalInspectionSnapshot.workflowPlan.targetPhase,
            }),
            title: provisionalInspectionSnapshot.browserPageContext?.title,
            url: provisionalInspectionSnapshot.browserPageContext?.url,
          }))).browserWorkflowState ?? null
        : null
      const inspectionSnapshot = {
        ...provisionalInspectionSnapshot,
        suggestedActions: buildAlicizationDesktopInspectionSuggestedActions({
          blockingSignals: provisionalInspectionSnapshot.blockingSignals,
          browserPageContext: provisionalInspectionSnapshot.browserPageContext,
          executionStrategy: provisionalInspectionSnapshot.executionStrategy,
          focusTarget,
          foregroundWindow,
          guiStructure: provisionalInspectionSnapshot.guiStructure,
          maxSuggestedActions: input.maxSuggestedActions,
          nextActionIntent: provisionalInspectionSnapshot.nextActionIntent,
          pagePhase: provisionalInspectionSnapshot.pagePhase,
          question: question || null,
          summary: screenSemanticSummary,
          unavailableReason,
          workflowPlan: provisionalInspectionSnapshot.workflowPlan,
          workflowState,
        }),
      }
      const summary = summarizeAlicizationDesktopInspection({
        browserPageContext: inspectionSnapshot.browserPageContext,
        focusTarget,
        foregroundWindow,
        guiStructure: inspectionSnapshot.guiStructure,
        summary: screenSemanticSummary,
        unavailableReason,
        workflowPlan: inspectionSnapshot.workflowPlan,
        workflowState,
      })
      const output = JSON.stringify({
        question: inspectionSnapshot.question,
        foregroundWindow: inspectionSnapshot.foregroundWindow,
        focusTarget: inspectionSnapshot.focusTarget,
        capture: inspectionSnapshot.capture,
        browserPageContext: inspectionSnapshot.browserPageContext,
        interactables: inspectionSnapshot.interactables,
        guiStructure: inspectionSnapshot.guiStructure,
        pagePhase: inspectionSnapshot.pagePhase,
        nextActionIntent: inspectionSnapshot.nextActionIntent,
        blockingSignals: inspectionSnapshot.blockingSignals,
        workflowPlan: inspectionSnapshot.workflowPlan,
        workflowState,
        executionStrategy: inspectionSnapshot.executionStrategy,
        screenSemanticSummary: inspectionSnapshot.screenSemanticSummary,
        suggestedActions: inspectionSnapshot.suggestedActions,
        unavailableReason: inspectionSnapshot.unavailableReason,
      })

      return {
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        question: inspectionSnapshot.question,
        foregroundWindow: inspectionSnapshot.foregroundWindow,
        capture: inspectionSnapshot.capture,
        focusTarget: inspectionSnapshot.focusTarget,
        browserPageContext: inspectionSnapshot.browserPageContext,
        interactables: inspectionSnapshot.interactables,
        guiStructure: inspectionSnapshot.guiStructure,
        pagePhase: inspectionSnapshot.pagePhase,
        nextActionIntent: inspectionSnapshot.nextActionIntent,
        blockingSignals: inspectionSnapshot.blockingSignals,
        workflowPlan: inspectionSnapshot.workflowPlan,
        workflowState,
        executionStrategy: inspectionSnapshot.executionStrategy,
        screenSemanticSummary: inspectionSnapshot.screenSemanticSummary,
        suggestedActions: inspectionSnapshot.suggestedActions,
        unavailableReason: inspectionSnapshot.unavailableReason,
        goal,
        summary,
        output,
      } as const
    }
    catch (error) {
      return {
        channel: 'desktop',
        status: 'failed',
        operation: 'desktop_inspect_scene',
        question: question || null,
        goal,
        summary: 'Failed to inspect current desktop scene.',
        errorCode: 'DESKTOP_INSPECT_SCENE_FAILED',
        errorMessage: errorMessageFrom(error) ?? 'Unknown desktop inspection error.',
        output: '',
      } as const
    }
  }
  runtimeTestInternals.currentDesktopInspectScene = desktopInspectScene
  const sensoryRuntime = createAlicizationSensoryRuntime({
    appendContentPartsToLatestUserMessage,
    buildChatInspectionGroundingParts,
    buildCompressedNativeImageDataUrl,
    buildDialogueIngressContext,
    buildDialogueIngressGovernor,
    buildDialogueTurnSemantics,
    buildInspectionSceneResidue,
    buildScreenSemanticSceneResidue,
    clearDesktopCaptureAccessCache: () => desktopCaptureAccessRuntime.clear(),
    describePerceptionTarget,
    detectInvitedInspectionIntent,
    ensurePerceptionState,
    queuePerceptionStateMutation,
    ensureProactiveLoopState: async cardId => await ensureProactiveLoopState(cardId),
    ensureSubconsciousState,
    ensureVisualPresenceState,
    extractInspectionHintTerms,
    generateScreenSemanticSummaryFromImage,
    getActiveAttentionAnchor,
    getSensorySnapshot: () => sensoryBus.getSnapshot(),
    hasImageTransportContent,
    inferAlicizationInspectionIntent,
    inspectionGroundingImageJpegQuality,
    inspectionGroundingImageMaxHeight,
    inspectionGroundingImageMaxWidth,
    isGenericScreenInspectionRequest,
    isWeakAlicizationScreenSurfaceCue,
    isWeakAlicizationScreenSurfaceTarget,
    isWeakGenericBrowserFocusTarget,
    listPendingScheduledTaskCount: async limit => (await alicizationDb.listPendingScheduledTasks(limit).catch(() => [])).length,
    persistPerceptionState: async (cardId, state) => await persistPerceptionState(cardId, state),
    purgeWeakGenericBrowserInspectionState,
    rankScreenSemanticCaptureCandidates,
    readLatestAssistantMessageText,
    rememberPerceptionObservation,
    rememberSceneResidue,
    resolveDesktopCaptureAccess,
    resolveForegroundDecisionTarget,
    resolveHostAttitude: async () => (soulLifecycleState.soulSnapshot ?? await bootstrap()).frontmatter.host_attitude,
    resolveInspectionIntentForChatTurn,
    resolveSenderCaptureSnapshot: senderWebContentsId => senderWebContentsId
      ? deriveSensoryCaptureSnapshotFromDiagnostics(getScreenCaptureDiagnosticsForWebContentsId(senderWebContentsId))
      : null,
    sampleSubconsciousInterruptionContext,
    shouldSuppressWeakGenericBrowserInspectionAnchor,
  })
  mainChatRuntime.bindInspectionIntentFromMessageHistory(sensoryRuntime.resolveInspectionIntentFromMessageHistory)
  const workingMemoryStore = createWorkingMemoryStore()
  const mainChatSessionRuntime = createAlicizationMainChatSessionRuntime({
    workingMemoryStore,
    buildMainRuntimeCorePromptBlocks,
    buildOrganicMemorySystemBlocks,
    buildPerformanceManifestSystemBlocks,
    dialogueSessionManager,
    persistAutobiographicalEpisodesFromPreparedMirror: persistPreparedMirrorAutobiographicalEpisodes,
    enqueueWorkingMemoryLongTermQueue: async input => await alicizationDb.enqueueWorkingMemoryLongTermQueueItems(input),
    drainWorkingMemoryLongTermQueue: async limit => await alicizationDb.drainWorkingMemoryLongTermQueue(limit),
    retrieveLongTermMemoryEvidence: async input => await alicizationDb.retrieveLongTermMemoryEvidence(input),
    executionCapabilityChannels: alicizationExecutionCapabilityChannels,
    executeMainGatewayTaskThread,
    resumeMainGatewayTaskThread,
    getPerformanceManifest,
    getSensorySnapshot: async () => sensoryBus.getSnapshot(),
    latestUserMessageContainsVisualInput,
    openAgentTurn: input => agentRuntime.openTurn(input),
    resolveCardCustomDirectives,
    resolveCardHostName,
    resolveCardPersonaKernel,
    resolveExecutionCapabilitiesForPrompt,
    prewarmOrganicMemoryAccessibility: async input => await memoryRuntime.prewarmAccessibilityLine(input),
    resolveTurnRetrievalPolicySnapshot: async input => await memoryRuntime.resolveTurnRetrievalPolicySnapshot(input),
    getActiveSelfEvolutionSnapshot: async () => await selfEvolutionRuntime.getSnapshot(),
    resolveOrganicMemoryPromptContext,
    scheduleOrganicLearningAction: async input => await learningActionScheduler.scheduleLearningTask(input),
    listMemoryReflections: async (cardId, limit) => await alicizationDb.listMemoryReflections({ cardId, limit }).catch(() => []),
    listRelationshipOutcomes: async (cardId, limit) => await alicizationDb.listRelationshipOutcomes({ cardId, limit }).catch(() => []),
    resolveSessionContinuitySignals: async ({ cardId }) => await resolveAgentSessionContinuitySignals(cardId),
    browserOpenUrl: localBrowserAutomation.openUrl,
    browserSearchWeb: localBrowserAutomation.searchWeb,
    browserReadPage: localBrowserAutomation.readPage,
    browserClickElement: localBrowserAutomation.clickElement,
    browserTypeText: localBrowserAutomation.typeBrowserText,
    browserNavigate: localBrowserAutomation.navigateBrowser,
    browserScroll: localBrowserAutomation.scrollBrowser,
    browserWait: localBrowserAutomation.waitForBrowser,
    desktopListInteractables: localBrowserAutomation.listDesktopInteractables,
    desktopClickElement: localBrowserAutomation.clickDesktopElement,
    desktopTypeText: localBrowserAutomation.typeDesktopText,
    desktopPressKeys: localBrowserAutomation.pressDesktopKeys,
    desktopWait: localBrowserAutomation.waitForDesktop,
    desktopInspectScene,
    desktopOpenApplication: localBrowserAutomation.openApplication,
    resolveTaskPlanningCapabilities,
    scheduleReminderTask,
    tuneOrganicMemoryPromptContextForExecutiveTurn,
    invokeMcpListTools: invokeAlicizationMcpListToolsFromMain,
    invokeMcpCallTool: invokeAlicizationMcpCallToolFromMain,
  })
  let subconsciousTickInFlight: Promise<AlicizationSubconsciousTickResult> | null = null
  let queuedSubconsciousWakeTimer: NodeJS.Timeout | undefined
  const queuedSubconsciousWakeCardIds = new Set<string>()
  const queuedSubconsciousWakeReasons = new Set<string>()
  const visualPresenceCapturePersistDebounceWindowMs = 5000

  const observedWebContentsIds = new Set<number>()
  const isEventCapableWebContents = (
    contents: Partial<WebContents> | null | undefined,
  ): contents is WebContents & Pick<Required<WebContents>, 'id' | 'on'> => {
    return typeof contents?.id === 'number' && typeof contents?.on === 'function'
  }
  const registerWebContentsDurabilityHooks = (contents: Partial<WebContents> | null | undefined) => {
    if (!isEventCapableWebContents(contents) || observedWebContentsIds.has(contents.id))
      return
    observedWebContentsIds.add(contents.id)
    contents.on('unresponsive', () => {
      queueDurabilityPulse(activeCardId, {
        kind: 'window-unresponsive',
        source: 'electron-window',
        detectedAt: Date.now(),
        detail: `webcontents:${contents.id}:unresponsive`,
      })
    })
    contents.on('responsive', () => {
      queueDurabilityPulse(activeCardId, {
        kind: 'window-responsive',
        source: 'electron-window',
        detectedAt: Date.now(),
        detail: `webcontents:${contents.id}:responsive`,
      }, {
        triggerThoughtLoop: false,
      })
    })
    contents.on('destroyed', () => {
      observedWebContentsIds.delete(contents.id)
    })
  }

  const listAllWebContents = typeof webContents?.getAllWebContents === 'function'
    ? webContents.getAllWebContents.bind(webContents)
    : null
  const appOn = typeof app?.on === 'function'
    ? app.on.bind(app)
    : null

  if (listAllWebContents) {
    for (const contents of listAllWebContents())
      registerWebContentsDurabilityHooks(contents)
  }

  if (appOn) {
    appOn('web-contents-created', (_event, contents) => {
      registerWebContentsDurabilityHooks(contents)
    })
    appOn('render-process-gone', (_event, contents, details) => {
      queueDurabilityPulse(activeCardId, {
        kind: 'render-process-gone',
        source: 'electron-process',
        detectedAt: Date.now(),
        detail: `reason:${details.reason};exitCode:${details.exitCode};wc:${contents.id}`,
      })
    })
    appOn('child-process-gone', (_event, details) => {
      const childDetails = details as {
        type?: string
        reason?: string
        name?: string
        serviceName?: string
      }
      queueDurabilityPulse(activeCardId, {
        kind: 'child-process-gone',
        source: 'electron-process',
        detectedAt: Date.now(),
        detail: `type:${childDetails.type ?? ''};reason:${childDetails.reason ?? ''};name:${childDetails.name ?? ''};service:${childDetails.serviceName ?? ''}`,
      })
    })
  }

  const emitSoulChanged = (snapshot: AlicizationSoulSnapshot, cardId = activeCardId) => {
    context.emit(alicizationSoulChanged, {
      cardId,
      ...snapshot,
    })
  }

  const emitKillSwitchChanged = (cardId = activeCardId) => {
    context.emit(alicizationKillSwitchStateChanged, {
      cardId,
      ...getScopedKillSwitchSnapshot(cardId),
    })
  }

  async function appendAuditLog(input: AlicizationAuditLogInput, cardId = activeCardId) {
    try {
      await alicizationDb.appendAuditLog({
        ...input,
        payload: {
          ...input.payload,
          cardId,
        },
      })
    }
    catch (error) {
      console.warn('[alicization-runtime] failed to append audit log:', error)
    }
  }
  soulLifecycleRuntime = createAlicizationRuntimeSoulLifecycle({
    state: soulLifecycleState,
    getPaths: () => ({
      soulRoot,
      soulPath,
      legacyPromptProfilePath,
      legacySparkProfilePath,
    }),
    now: () => Date.now(),
    existsSync,
    mkdir,
    readFile: async (path, encoding) => await readFile(path, encoding),
    unlink,
    importWatch: async () => await import('node:fs'),
    writeSoulContent,
    parseSoul,
    hashContent,
    withNeedsGenesis,
    defaultFrontmatter,
    defaultSoulBody,
    toSoulContent,
    extractPersonaNotesFromBody,
    buildSoulBody,
    resolveAlicizationSoulPersonaKernel,
    normalizeCustomDirectives,
    normalizeHostAttitude,
    normalizeCoreIncarnation,
    normalizeGender,
    normalizeMindAge,
    clamp01,
    currentSoulSchemaVersion,
    emitSoulChanged: snapshot => emitSoulChanged(snapshot),
    appendAuditLog: async input => await appendAuditLog(input),
  })
  setAlicizationAuditLogger(appendAuditLog)

  sensoryBus = createAlicizationSensoryBus({
    tickMs: 60_000,
    staleMs: 90_000,
    cpuWindowMs: 1_000,
    appendAuditLog: input => appendAuditLog(input, activeCardId),
  })

  async function resolveAgentSessionContinuitySignals(
    cardIdRaw: unknown,
  ): Promise<AlicizationAgentSessionContinuityInput[]> {
    const context = await resolveAgentSessionContinuityContext(cardIdRaw)
    return context.sessionContinuitySignals
  }

  async function resolveAgentSessionContinuityContext(
    cardIdRaw: unknown,
    options?: {
      digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
    },
  ): Promise<{
    digitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
    sessionContinuitySignals: AlicizationAgentSessionContinuityInput[]
  }> {
    const cardId = normalizeCardId(cardIdRaw)
    const readState = async () => {
      const now = Date.now()
      const activeSessionId = normalizeSessionId(
        activeSessionIdByCard.get(cardId)
        ?? await alicizationDb.getLatestConversationSessionId().catch(() => undefined),
      )
      const [visualPresenceState, proactiveState, recentEpisodicEvents] = await Promise.all([
        ensureVisualPresenceState(cardId).catch(() => null),
        ensureProactiveLoopState(cardId).catch(() => null),
        alicizationDb.listRecentEpisodicEvents(24).catch(() => []),
      ])
      const dialogueSignal = visualPresenceState ? buildDialogueContinuitySignal(visualPresenceState) : null
      const visualPresenceSignal = visualPresenceState ? buildVisualPresenceContinuitySignal(visualPresenceState) : null
      const autobiographicalAfterglowSignals = buildAutobiographicalAfterglowContinuitySignals({
        activeSessionId: activeSessionId || null,
        events: recentEpisodicEvents,
        now,
      })
      const proactiveSignals = proactiveState ? buildProactiveContinuitySignals(proactiveState, now) : []
      const latestSettledProactiveOutcome = [...proactiveSignals]
        .reverse()
        .find((signal) => {
          const source = sanitizeText((signal.metadata as { source?: unknown } | null)?.source, '')
          const outcome = sanitizeText((signal.metadata as { outcome?: unknown } | null)?.outcome, '')
          return source === 'proactive-feedback' && outcome.length > 0
        })
      const latestSettledProactiveTurnId = sanitizeText(
        (latestSettledProactiveOutcome?.metadata as { turnId?: unknown } | null)?.turnId,
        '',
      )
      const sessionContinuitySignals = [
        ...autobiographicalAfterglowSignals,
        ...proactiveSignals.filter((signal) => {
          const source = sanitizeText((signal.metadata as { source?: unknown } | null)?.source, '')
          if (source !== 'proactive-deferred')
            return true

          const deferredTurnId = sanitizeText((signal.metadata as { turnId?: unknown } | null)?.turnId, '')
          return !latestSettledProactiveTurnId || !deferredTurnId || deferredTurnId !== latestSettledProactiveTurnId
        }),
        ...(dialogueSignal ? [dialogueSignal] : []),
        ...(visualPresenceSignal ? [visualPresenceSignal] : []),
      ].sort((left, right) => Number(left.createdAt) - Number(right.createdAt))
      const digitalLifeRuntimeSurface = resolvePreferredRuntimeSurface({
        spineRuntimeSurface: options?.digitalLifeRuntimeSurface ?? null,
        preparedRuntimeSurface: visualPresenceState ? buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState) : null,
      })
      return {
        digitalLifeRuntimeSurface,
        sessionContinuitySignals,
      }
    }

    if (cardId === activeCardId)
      return await readState()

    return await withCardScope(cardId, async () => await readState(), {
      label: `agent-session-continuity:${cardId}`,
    })
  }

  const runtimeExecutionDelivery = createAlicizationRuntimeExecutionDelivery({
    getActiveCardId: () => activeCardId,
    normalizeCardId,
    normalizeSessionId,
    withCardScope,
    queueSubconsciousWake,
    appendAuditLog,
    syncSessionMirrorFromCurrentCardState,
    alicizationDb: {
      getMetaValue: key => alicizationDb.getMetaValue(key),
      setMetaValue: (key, value) => alicizationDb.setMetaValue(key, value),
      listExecutionEvents: input => alicizationDb.listExecutionEvents(input),
    },
    executionDeliveryRuntime,
    executionDeliveryStateMetaKey: alicizationExecutionDeliveryStateMetaKey,
    generateMainGatewayText: mainGatewayTextProvider,
    getPerformanceManifest,
    normalizeAlicizationEmotion,
    normalizeAlicizationPerformancePayload,
    clampAlicizationPerformancePayloadToManifest,
    ensureVisualPresenceState,
    buildHostPersonModel,
    getActiveSelfRevisionStatePatch: async () => await selfEvolutionRuntime.getActivePatch(),
    getActiveSelfEvolutionCandidateId: async () => (await selfEvolutionRuntime.getActiveCandidate())?.id ?? null,
  })

  const queueExecutionDeliveryCandidate = runtimeExecutionDelivery.queueExecutionDeliveryCandidate

  function resolveDispatchPayloadRuntimeContext(input: {
    cli?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
    codex?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
    claudeCode?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
    localVisual?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
    openclaw?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
  }) {
    return input.cli?.runtimeContext
      ?? input.codex?.runtimeContext
      ?? input.claudeCode?.runtimeContext
      ?? input.localVisual?.runtimeContext
      ?? input.openclaw?.runtimeContext
      ?? null
  }

  function resolveStoredDispatchRuntimeContext(thread: {
    metadata?: Record<string, unknown> | null
  } | null | undefined) {
    const metadata = thread?.metadata
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))
      return null

    const execution = metadata.execution
    if (!execution || typeof execution !== 'object' || Array.isArray(execution))
      return null

    const runtimeContext = (execution as Record<string, unknown>).runtimeContext
    if (!runtimeContext || typeof runtimeContext !== 'object' || Array.isArray(runtimeContext))
      return null

    return runtimeContext as AlicizationExecutionRuntimeContext
  }

  function resolveThreadExperienceProjectBriefing(thread: {
    metadata?: Record<string, unknown> | null
  } | null | undefined) {
    const metadata = thread?.metadata
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))
      return null

    const fabric = metadata.fabric
    if (!fabric || typeof fabric !== 'object' || Array.isArray(fabric))
      return null

    const experience = (fabric as Record<string, unknown>).experience
    if (!experience || typeof experience !== 'object' || Array.isArray(experience))
      return null

    const normalizedRuntimeContext = normalizeAlicizationExecutionRuntimeContext({
      generatedAt: 0,
      projectBriefing: (experience as Record<string, unknown>).projectBriefing ?? null,
      sensory: {
        collectedAt: null,
        running: false,
        stale: true,
        ageMs: 0,
        foregroundWindow: null,
        capture: null,
      },
    })

    return normalizedRuntimeContext?.projectBriefing ?? null
  }

  function withDispatchRuntimeContext<Command extends { runtimeContext?: AlicizationExecutionRuntimeContext | null }>(
    command: Command | null | undefined,
    runtimeContext: AlicizationExecutionRuntimeContext | null,
  ): Command | null | undefined {
    if (!command || !runtimeContext || command.runtimeContext)
      return command

    return {
      ...command,
      runtimeContext,
    }
  }

  function applyDispatchRuntimeContext<Input extends {
    cli?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
    codex?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
    claudeCode?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
    localVisual?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
    openclaw?: { runtimeContext?: AlicizationExecutionRuntimeContext | null } | null
  }>(
    input: Input,
    runtimeContext: AlicizationExecutionRuntimeContext | null,
  ): Input {
    if (!runtimeContext)
      return input

    return {
      ...input,
      cli: withDispatchRuntimeContext(input.cli, runtimeContext),
      codex: withDispatchRuntimeContext(input.codex, runtimeContext),
      claudeCode: withDispatchRuntimeContext(input.claudeCode, runtimeContext),
      localVisual: withDispatchRuntimeContext(input.localVisual, runtimeContext),
      openclaw: withDispatchRuntimeContext(input.openclaw, runtimeContext),
    }
  }

  async function buildRuntimeOwnedExecutionRuntimeContext(input: {
    cardId: string
    thread: {
      decisionTraceId?: string | null
      metadata?: Record<string, unknown> | null
      sessionId?: string | null
      turnId?: string | null
    } | null
    threadId: string
  }) {
    const fallbackTurnId = `execution-dispatch:${sanitizeText(input.threadId, '').slice(0, 80) || randomUUID()}`
    const fallbackDecisionTraceId = `mind:${Date.now().toString(36)}:dispatch-runtime-context`
    const turnId = sanitizeText(input.thread?.turnId, '').slice(0, 160) || fallbackTurnId
    const decisionTraceId = sanitizeText(input.thread?.decisionTraceId, '').slice(0, 200) || fallbackDecisionTraceId
    const sessionId = sanitizeText(input.thread?.sessionId, '').slice(0, 160) || null
    const experienceProjectBriefing = resolveThreadExperienceProjectBriefing(input.thread)
    const sensorySnapshot = await sensoryBus.getSnapshot()
    const agentTurn = await agentRuntime.openTurn({
      cardId: input.cardId,
      turnId,
      decisionTraceId,
    })

    return await agentTurn.buildExecutionRuntimeContext({
      cardId: input.cardId,
      turnId,
      decisionTraceId,
      projectBriefing: experienceProjectBriefing ?? undefined,
      sessionId,
      sensorySnapshot,
    })
  }

  async function ensureDispatchInvocationRuntimeContext(
    invocation: Parameters<typeof taskThreadOrchestrator.dispatch>[0],
    cardId: string,
  ) {
    if (resolveDispatchPayloadRuntimeContext(invocation.input))
      return invocation

    const thread = await invocation.port.getTaskThread(invocation.input.threadId).catch(() => undefined)
    if (!thread || resolveStoredDispatchRuntimeContext(thread))
      return invocation

    try {
      const runtimeContext = await buildRuntimeOwnedExecutionRuntimeContext({
        cardId,
        thread,
        threadId: invocation.input.threadId,
      })
      return {
        ...invocation,
        input: applyDispatchRuntimeContext(invocation.input, runtimeContext),
      }
    }
    catch (error) {
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.executor.dispatch',
        action: 'runtime-context-build-failed',
        message: 'Runtime-owned dispatch bridge failed to build execution runtime context before dispatch.',
        payload: {
          cardId,
          threadId: invocation.input.threadId,
          reason: errorMessageFrom(error) ?? 'unknown-error',
        },
      }, cardId)
      return invocation
    }
  }

  async function dispatchTaskThreadWithExecutionDelivery(invocation: Parameters<typeof taskThreadOrchestrator.dispatch>[0]) {
    const scopedCardId = activeCardId
    const preparedInvocation = await ensureDispatchInvocationRuntimeContext(invocation, scopedCardId)
    const result = await taskThreadOrchestrator.dispatch({
      ...preparedInvocation,
      port: {
        ...preparedInvocation.port,
        localVisualSurface: {
          browserOpenUrl: localBrowserAutomation.openUrl,
          browserSearchWeb: localBrowserAutomation.searchWeb,
          browserReadPage: localBrowserAutomation.readPage,
          browserClickElement: localBrowserAutomation.clickElement,
          browserTypeText: localBrowserAutomation.typeBrowserText,
          browserNavigate: localBrowserAutomation.navigateBrowser,
          browserScroll: localBrowserAutomation.scrollBrowser,
          browserWait: localBrowserAutomation.waitForBrowser,
          desktopListInteractables: localBrowserAutomation.listDesktopInteractables,
          desktopClickElement: localBrowserAutomation.clickDesktopElement,
          desktopTypeText: localBrowserAutomation.typeDesktopText,
          desktopPressKeys: localBrowserAutomation.pressDesktopKeys,
          desktopOpenApplication: localBrowserAutomation.openApplication,
          desktopWait: localBrowserAutomation.waitForDesktop,
          desktopInspectScene,
          executeTaskThread: async (localInput) => {
            const runtimeContext = normalizeAlicizationExecutionRuntimeContext(
              localInput.dispatch.cli?.runtimeContext
              ?? localInput.dispatch.codex?.runtimeContext
              ?? localInput.dispatch.claudeCode?.runtimeContext
              ?? localInput.dispatch.localVisual?.runtimeContext
              ?? localInput.dispatch.openclaw?.runtimeContext,
            )
            const toolContext = {
              cardId: scopedCardId,
              turnId: sanitizeText(localInput.thread.turnId, '').slice(0, 160)
                || `execution-dispatch:${sanitizeText(localInput.thread.id, '').slice(0, 80) || randomUUID()}`,
              decisionTraceId: sanitizeText(localInput.thread.decisionTraceId, '').slice(0, 200)
                || `mind:${Date.now().toString(36)}:local-visual-executor`,
              sessionId: sanitizeText(localInput.thread.sessionId, '').slice(0, 160) || null,
            }
            const nextDispatch = runtimeContext
              ? applyDispatchRuntimeContext(localInput.dispatch, runtimeContext)
              : localInput.dispatch

            return await executeMainGatewayTaskThread({
              context: toolContext,
              task: localInput.task,
              dispatch: nextDispatch,
            })
          },
          resumeTaskThread: async (localInput) => {
            const toolContext = {
              cardId: scopedCardId,
              turnId: sanitizeText(localInput.thread.turnId, '').slice(0, 160)
                || `execution-dispatch:${sanitizeText(localInput.thread.id, '').slice(0, 80) || randomUUID()}`,
              decisionTraceId: sanitizeText(localInput.thread.decisionTraceId, '').slice(0, 200)
                || `mind:${Date.now().toString(36)}:local-visual-resume`,
              sessionId: sanitizeText(localInput.thread.sessionId, '').slice(0, 160) || null,
            }

            return await resumeMainGatewayTaskThread({
              context: toolContext,
              threadId: localInput.threadId,
            })
          },
        },
      },
    })
    await syncSessionMirrorFromCurrentCardState({
      cardId: scopedCardId,
      decisionTraceId: result.thread.decisionTraceId,
      sessionId: result.thread.sessionId,
      source: 'task-dispatch',
      turnId: result.thread.turnId,
      taskThread: result.thread,
    })
    if (alicizationTerminalTaskThreadStatuses.has(result.thread.status))
      await queueExecutionDeliveryCandidate({ cardId: scopedCardId, thread: result.thread })
    return result
  }

  function clampNeed(value: number) {
    if (!Number.isFinite(value))
      return 0
    return Math.max(0, Math.min(100, value))
  }

  function createDefaultSubconsciousState(now = Date.now()): SubconsciousCardState {
    return {
      boredom: 0,
      loneliness: 0,
      fatigue: 0,
      lastTickAt: now,
      lastInteractionAt: now,
      lastSavedAt: now,
      lastDreamedAt: 0,
      updatedAt: now,
    }
  }

  function normalizeSubconsciousState(raw: unknown, now = Date.now()): SubconsciousCardState {
    const data = typeof raw === 'object' && raw ? raw as Record<string, unknown> : {}
    const pickNumber = (key: string, fallback: number) => {
      const value = data[key]
      return typeof value === 'number' && Number.isFinite(value) ? value : fallback
    }
    return {
      boredom: clampNeed(pickNumber('boredom', 0)),
      loneliness: clampNeed(pickNumber('loneliness', 0)),
      fatigue: clampNeed(pickNumber('fatigue', 0)),
      lastTickAt: Math.max(0, pickNumber('lastTickAt', now)),
      lastInteractionAt: Math.max(0, pickNumber('lastInteractionAt', now)),
      lastSavedAt: Math.max(0, pickNumber('lastSavedAt', now)),
      lastDreamedAt: Math.max(0, pickNumber('lastDreamedAt', 0)),
      updatedAt: Math.max(0, pickNumber('updatedAt', now)),
    }
  }

  async function persistSubconsciousState(cardId: string, state: SubconsciousCardState) {
    const normalizedCardId = normalizeCardId(cardId)
    subconsciousStateByCard.set(normalizedCardId, state)
    await alicizationDb.setMetaValue(
      alicizationSubconsciousStateMetaKey,
      JSON.stringify({
        boredom: state.boredom,
        loneliness: state.loneliness,
        fatigue: state.fatigue,
        lastTickAt: state.lastTickAt,
        lastInteractionAt: state.lastInteractionAt,
        lastSavedAt: state.lastSavedAt,
        updatedAt: state.updatedAt,
      }),
    ).catch(() => {})
    await alicizationDb.setMetaValue(alicizationDreamLastRunMetaKey, `${state.lastDreamedAt}`).catch(() => {})
  }

  async function restoreSubconsciousState(cardId: string) {
    const normalizedCardId = normalizeCardId(cardId)
    const now = Date.now()
    const raw = await alicizationDb.getMetaValue(alicizationSubconsciousStateMetaKey).catch(() => undefined)
    const rawDreamedAt = await alicizationDb.getMetaValue(alicizationDreamLastRunMetaKey).catch(() => undefined)
    const parsed = (() => {
      if (!raw)
        return createDefaultSubconsciousState(now)
      try {
        return normalizeSubconsciousState(JSON.parse(raw), now)
      }
      catch {
        return createDefaultSubconsciousState(now)
      }
    })()
    const dreamedAt = Number.parseInt(String(rawDreamedAt ?? ''), 10)
    const normalized = {
      ...parsed,
      lastDreamedAt: Number.isFinite(dreamedAt) ? Math.max(0, dreamedAt) : parsed.lastDreamedAt,
    }
    const offlineMinutes = Math.max(0, (now - normalized.lastSavedAt) / 60_000)
    if (offlineMinutes >= 1) {
      normalized.boredom = clampNeed(normalized.boredom + offlineMinutes * 0.8)
      normalized.loneliness = clampNeed(normalized.loneliness + offlineMinutes * 0.6)
      normalized.fatigue = clampNeed(normalized.fatigue + offlineMinutes * 0.3)
      normalized.lastTickAt = now
      normalized.updatedAt = now
    }
    subconsciousStateByCard.set(normalizedCardId, normalized)
    if (offlineMinutes >= 1) {
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.subconscious',
        action: 'offline-compensated',
        message: 'Applied subconscious offline compensation on cold start restore.',
        payload: {
          cardId: normalizedCardId,
          offlineMinutes: Number(offlineMinutes.toFixed(2)),
          boredom: normalized.boredom,
          loneliness: normalized.loneliness,
          fatigue: normalized.fatigue,
        },
      }, normalizedCardId)
    }
    return normalized
  }

  async function ensureSubconsciousState(cardId: string) {
    const normalizedCardId = normalizeCardId(cardId)
    const current = subconsciousStateByCard.get(normalizedCardId)
    if (current)
      return current
    return await restoreSubconsciousState(normalizedCardId)
  }

  async function persistProactiveLoopState(cardIdRaw: unknown, state: AlicizationProactiveLoopState) {
    const cardId = normalizeCardId(cardIdRaw)
    proactiveLoopStateByCard.set(cardId, state)
    if (cardId === activeCardId) {
      await alicizationDb.setMetaValue(alicizationProactiveLoopStateMetaKey, JSON.stringify(state)).catch(() => {})
      return
    }
    await withCardScope(cardId, async () => {
      await alicizationDb.setMetaValue(alicizationProactiveLoopStateMetaKey, JSON.stringify(state)).catch(() => {})
    }, {
      label: `proactive-loop.persist:${cardId}`,
    })
  }

  async function restoreProactiveLoopState(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const now = Date.now()
    const setState = (state: AlicizationProactiveLoopState) => {
      proactiveLoopStateByCard.set(cardId, state)
      return state
    }

    if (cardId !== activeCardId) {
      await withCardScope(cardId, async () => {
        const raw = await alicizationDb.getMetaValue(alicizationProactiveLoopStateMetaKey).catch(() => undefined)
        if (!raw) {
          setState(createDefaultProactiveLoopState(now))
          return
        }
        try {
          setState(normalizeProactiveLoopState(JSON.parse(raw), now))
        }
        catch {
          setState(createDefaultProactiveLoopState(now))
        }
      }, {
        label: `proactive-loop.restore:${cardId}`,
      })
      return proactiveLoopStateByCard.get(cardId) ?? createDefaultProactiveLoopState(now)
    }

    const raw = await alicizationDb.getMetaValue(alicizationProactiveLoopStateMetaKey).catch(() => undefined)
    if (!raw)
      return setState(createDefaultProactiveLoopState(now))
    try {
      return setState(normalizeProactiveLoopState(JSON.parse(raw), now))
    }
    catch {
      return setState(createDefaultProactiveLoopState(now))
    }
  }

  async function ensureProactiveLoopState(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const current = proactiveLoopStateByCard.get(cardId)
    if (current)
      return current
    return await restoreProactiveLoopState(cardId)
  }

  const persistExecutionDeliveryState = runtimeExecutionDelivery.persistExecutionDeliveryState

  const restoreExecutionDeliveryState = runtimeExecutionDelivery.restoreExecutionDeliveryState

  function buildVisualPresenceCapturePersistFingerprint(state: AlicizationVisualPresenceStateSnapshot) {
    return [
      buildMindSceneSignature(state.currentScene),
      buildMindAttentionSignature(state.attention),
      state.captureState.health ?? '',
      state.captureState.permission,
      sanitizeText(state.captureState.sourceName),
      sanitizeText(state.captureState.degradedReason),
    ].join('::').toLowerCase()
  }

  function senderWebContentsIdFromInvokeOptions(
    invokeOptions?: { raw?: { ipcMainEvent?: IpcMainEvent, event?: unknown } },
  ) {
    const senderId = Number(invokeOptions?.raw?.ipcMainEvent?.sender?.id)
    return Number.isFinite(senderId) ? Math.max(1, Math.floor(senderId)) : null
  }

  function buildPresencePulsePayload(cardIdRaw: unknown, state: AlicizationVisualPresenceStateSnapshot): AlicizationPresencePulsePayload | null {
    const cardId = normalizeCardId(cardIdRaw)
    const privateThought = state.privateThought
    const currentScene = state.currentScene
    const activeThread = state.worldModel?.activeThread
    const scenario = currentScene?.scenario
      ?? (
        activeThread?.kind === 'debugging' || activeThread?.kind === 'change-review' || activeThread?.kind === 'deep-focus'
          ? 'coding'
          : activeThread?.kind === 'co-viewing'
            ? 'media'
            : activeThread?.kind === 'late-night-endurance'
              ? 'late-night-care'
              : 'general'
      )
    if (!privateThought || privateThought.embodiedPresence === 'none' || (!currentScene && !activeThread))
      return null

    const normalizedReasonTags = Array.from(new Set(privateThought.rationaleTags))
    const carriesSameHerInwardCarry = normalizedReasonTags.includes('same-her-inward-carry')
    const normalizedContinuityMode = carriesSameHerInwardCarry
      && state.continuityMode === 'quiet-accompaniment'
      && privateThought.stance === 'accompany'
      ? 'quiet-accompaniment'
      : state.continuityMode

    return {
      cardId,
      watchMode: state.watchMode,
      embodiedPresence: privateThought.embodiedPresence,
      scenario,
      stance: privateThought.stance,
      currentBodyState: state.currentBodyState,
      continuityMode: normalizedContinuityMode,
      quietLineMs: state.quietLineMs,
      currentInwardPreoccupation: state.currentInwardPreoccupation,
      confidence: privateThought.confidence,
      reasonTags: normalizedReasonTags,
      emotionalTension: privateThought.emotionalTension,
      expiresAt: privateThought.expiresAt,
    }
  }

  function emitVisualPresencePulse(payload: AlicizationPresencePulsePayload | null) {
    if (!payload || payload.embodiedPresence === 'none' || payload.expiresAt <= Date.now())
      return
    context.emit(electronAlicizationVisualPresenceChanged, payload)
  }

  function emitVisualPresenceState(cardIdRaw: unknown, state: AlicizationVisualPresenceStateSnapshot | null) {
    context.emit(electronAlicizationVisualPresenceStateChanged, {
      cardId: normalizeCardId(cardIdRaw),
      state,
    })
  }

  async function rememberPerceptionObservation(input: {
    cardId: string
    now: number
    target?: {
      appName?: string
      processName?: string
      title?: string
    } | null
    source: 'sensory-snapshot' | 'subconscious-tick' | 'chat-start'
  }) {
    return await queuePerceptionStateMutation(input.cardId, current => updatePerceptionStateWithObservation({
      state: current,
      now: input.now,
      target: input.target,
      source: input.source,
    }))
  }

  async function rememberSceneResidue(input: {
    cardId: string
    now: number
    residue: AlicizationPerceptionSceneResidue
  }) {
    const next = await queuePerceptionStateMutation(input.cardId, current => rememberPerceptionSceneResidue({
      state: current,
      now: input.now,
      residue: input.residue,
    }))
    await syncSessionMirrorFromCurrentCardState({
      cardId: input.cardId,
      source: input.residue.source,
      turnId: buildMainGatewayAgentTurnId('perception', input.residue.source, input.cardId, input.now),
      sceneResidue: input.residue,
    })
    return next
  }

  function parseStoredConversationStructured(raw: unknown) {
    if (typeof raw !== 'string' || !raw.trim())
      return null
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null
    }
    catch {
      return null
    }
  }

  const runtimeDialogueFeedback = createAlicizationRuntimeDialogueFeedback({
    normalizeCardId,
    sanitizeText,
    readLatestUserMessageText,
    ensureActiveOrLatestSessionId,
    withCardScope,
    ensureDialogueReplyFeedbackAck,
    persistDialogueReplyFeedbackAck,
    parseStoredConversationStructured,
    deriveDialogueReplyFeedbackKind,
    attachSynthesizedReflections,
    buildDialogueReplyFeedbackOutcomeClosure,
    persistOutcomeClosure,
    appendAuditLog,
    memoryReconsolidationRuntime: memoryRuntime.memoryReconsolidationRuntime,
    alicizationDb: {
      listConversationTurnsBySession: (sessionId, options) => alicizationDb.listConversationTurnsBySession(sessionId, options),
      getLatestRelationshipDynamics: () => alicizationDb.getLatestRelationshipDynamics(),
      appendRelationshipDynamics: input => alicizationDb.appendRelationshipDynamics(input),
    },
  })

  const settleRecentDialogueReplyFeedbackFromUserTurn
    = runtimeDialogueFeedback.settleRecentDialogueReplyFeedbackFromUserTurn

  const runtimeExecutionFeedback = createAlicizationRuntimeExecutionFeedback({
    normalizeCardId,
    sanitizeText,
    readLatestUserMessageText,
    readLatestAssistantMessageText,
    ensureActiveOrLatestSessionId,
    withCardScope,
    readTaskThreadActivityAt,
    attachSynthesizedReflections,
    buildExecutionProposalFeedbackOutcomeClosure,
    buildExecutionResultFeedbackOutcomeClosure,
    deriveExecutionProposalFeedbackKind,
    deriveExecutionResultFeedbackKind,
    persistOutcomeClosure,
    appendAuditLog,
    memoryReconsolidationRuntime: memoryRuntime.memoryReconsolidationRuntime,
    alicizationDb: {
      getLatestRelationshipDynamics: () => alicizationDb.getLatestRelationshipDynamics(),
      appendRelationshipDynamics: input => alicizationDb.appendRelationshipDynamics(input),
      listTaskThreads: input => alicizationDb.listTaskThreads(input),
      upsertTaskThread: input => alicizationDb.upsertTaskThread(input),
    },
  })

  const runtimeProactiveFeedback = createAlicizationRuntimeProactiveFeedback({
    normalizeCardId,
    ensureProactiveLoopState,
    persistProactiveLoopState,
    applyCurrentCardProactiveState: async ({ cardId, state }) => {
      proactiveLoopStateByCard.set(cardId, state)
      const currentPresenceState = visualPresenceStateByCard.get(cardId)
      if (currentPresenceState) {
        visualPresenceStateByCard.set(cardId, {
          ...currentPresenceState,
          proactiveLoopState: state,
        })
      }
    },
    peekLatestPendingProactiveDelivery: (cardId) => {
      const snapshot = dialogueDeliveryRuntime.peekLatestPendingProactiveDelivery(cardId)
      if (!snapshot)
        return null
      return {
        turnId: snapshot.turnId,
        createdAt: snapshot.createdAt,
        scenario: snapshot.scenario,
        feedbackWindowMs: snapshot.feedbackWindowMs,
        learningAction:
          snapshot.learningAction === 'record'
          || snapshot.learningAction === 'reflect'
          || snapshot.learningAction === 'verify'
          || snapshot.learningAction === 'revise'
          || snapshot.learningAction === 'internalize'
          || snapshot.learningAction === 'hold'
            ? snapshot.learningAction
            : null,
        learningFocuses: snapshot.learningFocuses,
        emotionalTransitionLedger: snapshot.emotionalTransitionLedger ?? null,
        affectiveResidue: snapshot.affectiveResidue ?? null,
      }
    },
    syncSessionMirrorFromCurrentCardState,
    syncSettledProactiveContinuityIntoActiveSession: async ({ cardId, source, proactiveOutcomes }) => {
      if (proactiveOutcomes.length === 0)
        return

      const sessionId = await ensureActiveOrLatestSessionId(cardId).catch(() => '')
      if (!sessionId)
        return

      const agentTurn = await agentRuntime.openTurn({
        cardId,
        turnId: buildMainGatewayAgentTurnId('proactive-feedback-session', source, cardId, Date.now()),
      }).catch(() => null)
      if (!agentTurn)
        return

      syncAgentTurnSessionMirror({
        agentTurn,
        cardId,
        continuitySignals: typeof buildProactiveOutcomeContinuitySignal === 'function'
          ? proactiveOutcomes.map(outcome => buildProactiveOutcomeContinuitySignal(outcome))
          : [],
        sessionId,
        source,
      })
    },
    buildMainGatewayAgentTurnId,
    appendAuditLog,
    persistOutcomeClosure,
    buildProactiveFeedbackOutcomeClosure,
    queueSubconsciousWake,
  })

  const settlePendingProactiveOutcomesFromUserTurn
    = runtimeProactiveFeedback.settlePendingProactiveOutcomesFromUserTurn

  const settlePendingExecutionProposalFeedbackFromUserTurn
    = runtimeExecutionFeedback.settlePendingExecutionProposalFeedbackFromUserTurn

  const settleRecentExecutionResultFeedbackFromUserTurn
    = runtimeExecutionFeedback.settleRecentExecutionResultFeedbackFromUserTurn

  const settleExpiredPendingProactiveOutcomes
    = runtimeProactiveFeedback.settleExpiredPendingProactiveOutcomes

  async function flushCurrentSubconsciousState(reason: string) {
    const current = subconsciousStateByCard.get(activeCardId)
    if (!current)
      return

    const now = Date.now()
    const next: SubconsciousCardState = {
      ...current,
      updatedAt: now,
      lastSavedAt: now,
    }
    await persistSubconsciousState(activeCardId, next)
    await appendAuditLog({
      level: 'notice',
      category: 'alicization.subconscious',
      action: 'state-flushed',
      message: 'Persisted in-memory subconscious state to disk.',
      payload: {
        reason,
        boredom: next.boredom,
        loneliness: next.loneliness,
        fatigue: next.fatigue,
      },
    })
  }

  async function markSubconsciousInteraction(cardId: string) {
    const normalizedCardId = normalizeCardId(cardId)
    const current = await ensureSubconsciousState(normalizedCardId)
    const now = Date.now()
    const next: SubconsciousCardState = {
      ...current,
      boredom: 0,
      loneliness: 0,
      fatigue: clampNeed(current.fatigue + 2),
      lastInteractionAt: now,
      lastTickAt: now,
      updatedAt: now,
      lastSavedAt: now,
    }
    await persistSubconsciousState(normalizedCardId, next)
    return next
  }

  async function flushSubconsciousStatesAcrossCards(reason: string, specificCardIds?: string[]) {
    const previousCardId = activeCardId
    const cardIds = specificCardIds?.length
      ? specificCardIds.map(cardId => normalizeCardId(cardId))
      : [...new Set([...subconsciousStateByCard.keys(), normalizeCardId(activeCardId)])]
    try {
      for (const cardId of cardIds) {
        await withCardScope(cardId, async () => await flushCurrentSubconsciousState(reason), {
          label: `subconscious-flush:${reason}:${cardId}`,
        })
      }
    }
    finally {
      await withCardScope(previousCardId, async () => {}, {
        label: `subconscious-flush:return:${reason}:${previousCardId}`,
      })
    }
  }

  const llmConfigPath = join(userDataPath, 'alicizations', 'llm-config.json')
  const runtimeDebugLogPath = join(userDataPath, 'alicizations', 'runtime-debug.log')

  async function appendRuntimeDebugLine(event: string, payload?: Record<string, unknown>) {
    if (!runtimeDebugLogEnabled)
      return
    try {
      await mkdir(join(userDataPath, 'alicizations'), { recursive: true })
      const line = JSON.stringify({
        ts: new Date().toISOString(),
        pid,
        event,
        ...payload,
      })
      await appendFile(runtimeDebugLogPath, `${line}\n`, 'utf-8')
    }
    catch {
      // ignore debug logging failures
    }
  }

  async function queueScopedAuditLog(cardId: string, input: AlicizationAuditLogInput) {
    void appendAuditLog(input, cardId).catch(() => {})
  }

  async function persistLlmConfigToDisk() {
    await mkdir(join(userDataPath, 'alicizations'), { recursive: true })
    await writeFile(
      llmConfigPath,
      JSON.stringify({
        activeProviderId,
        activeModelId,
        providerCredentials,
      }, null, 2),
      'utf-8',
    ).catch(() => {})
  }

  async function restoreLlmConfigFromDisk() {
    try {
      const raw = await readFile(llmConfigPath, 'utf-8')
      const parsed = JSON.parse(raw) as {
        activeProviderId?: unknown
        activeModelId?: unknown
        providerCredentials?: unknown
      }
      if (typeof parsed.activeProviderId === 'string')
        activeProviderId = parsed.activeProviderId
      if (typeof parsed.activeModelId === 'string')
        activeModelId = parsed.activeModelId
      if (parsed.providerCredentials && typeof parsed.providerCredentials === 'object')
        providerCredentials = parsed.providerCredentials as Record<string, Record<string, unknown>>
    }
    catch {
      // ignore
    }
  }

  async function switchCardScopeInner(nextCardIdRaw: unknown) {
    const nextCardId = normalizeCardId(nextCardIdRaw)
    if (nextCardId === activeCardId)
      return

    const previousCardId = activeCardId
    const startedAt = Date.now()
    await appendRuntimeDebugLine('card-scope.switch-started', {
      fromCardId: previousCardId,
      toCardId: nextCardId,
    })

    await flushCurrentSubconsciousState('card-switch').catch(() => {})
    sensoryBus.stop('manual')
    stopWatch()
    if (pruneTimer) {
      clearInterval(pruneTimer)
      pruneTimer = undefined
    }
    clearReminderDueTimer()
    turnWriteAbortControllers.clear()
    soulLifecycleState.queuedWrite = Promise.resolve()
    soulLifecycleState.soulSnapshot = null
    soulLifecycleState.watching = false
    soulLifecycleState.muteWatchUntil = 0
    soulLifecycleState.revision = 0

    await alicizationDb.close().catch(() => {})

    activeCardId = nextCardId
    ;({ soulRoot, soulPath, legacyPromptProfilePath, legacySparkProfilePath } = resolveCardPaths(activeCardId))
    alicizationDb = await setupAlicizationDb(userDataPath, { cardId: activeCardId })
    await restoreScopedKillSwitch(activeCardId)
    await restoreActiveSessionId(activeCardId)
    await restoreDialogueAckMap(activeCardId)
    await restoreSubconsciousState(activeCardId)
    await restoreExecutionDeliveryState(activeCardId)

    sensoryBus = createAlicizationSensoryBus({
      tickMs: 60_000,
      staleMs: 90_000,
      cpuWindowMs: 1_000,
      appendAuditLog: input => appendAuditLog(input, activeCardId),
    })

    if (!isAlicizationKillSwitchSuspended() && getAlicizationCardKillSwitchSnapshot(activeCardId).state !== 'SUSPENDED') {
      sensoryBus.start()
    }
    startMemorySalienceRefreshTimer()
    await scheduleNextReminderDueCheck('card-scope-switch')
    await appendRuntimeDebugLine('card-scope.switch-completed', {
      fromCardId: previousCardId,
      toCardId: activeCardId,
      elapsedMs: Date.now() - startedAt,
    })
  }

  cardScopeOrchestrator = createAlicizationRuntimeCardScopeOrchestrator({
    scopeLifecycleQueueState,
    now: () => Date.now(),
    getActiveCardId: () => activeCardId,
    normalizeCardId,
    sanitizeText,
    appendRuntimeDebugLine,
    switchCardScopeInner: async nextCardIdRaw => await switchCardScopeInner(nextCardIdRaw),
  })
  const switchCardScope = cardScopeOrchestrator.switchCardScope
  const cardScopeLifecycleRuntime = createAlicizationRuntimeCardScopeLifecycle({
    now: () => Date.now(),
    getActiveCardId: () => activeCardId,
    defaultAlicizationCardId,
    normalizeCardId,
    listKnownCardIds,
    switchCardScope: async nextCardIdRaw => await switchCardScope(nextCardIdRaw),
    abortAllTurnWrites: async reason => await abortAllTurnWrites(reason),
    clearReminderDueTimer,
    clearAllPendingDialogueDeliveries,
    clearQueuedSubconsciousWake,
    clearExecutionDeliveryStateAll: () => executionDeliveryRuntime.clear(),
    clearExecutionDeliveryStateCard: (cardId: string) => executionDeliveryRuntime.clear(cardId),
    clearMainChatFinishedRuns: () => mainChatRunState.clearFinishedRuns(),
    clearMainChatRunsAll: () => mainChatRunState.clearAll(),
    clearDialogueDeliveryCardState: (cardId: string) => dialogueDeliveryRuntime.clearCardState(cardId),
    clearDialogueDeliveryAllState: () => dialogueDeliveryRuntime.clearAllState(),
    clearDialogueSessionMirrorCard: (cardId: string) => dialogueSessionManager.clear(cardId),
    clearDialogueSessionMirrorAll: () => dialogueSessionManager.clear(),
    clearPendingDialogueDeliveriesByCard,
    stopWatch,
    stopSensoryBus: () => sensoryBus.stop('manual'),
    clearPruneTimer: () => {
      if (pruneTimer) {
        clearInterval(pruneTimer)
        pruneTimer = undefined
      }
    },
    clearSubconsciousTimer: () => {
      if (subconsciousTimer) {
        clearInterval(subconsciousTimer)
        subconsciousTimer = undefined
      }
    },
    clearDreamTimer: () => {
      if (dreamTimer) {
        clearInterval(dreamTimer)
        dreamTimer = undefined
      }
    },
    turnWriteAbortControllers,
    alicizationDb: {
      clearConversationData: () => alicizationDb.clearConversationData(),
      setMetaValue: (key, value) => alicizationDb.setMetaValue(key, value),
      close: () => alicizationDb.close(),
    },
    activeSessionIdByCard,
    subconsciousStateByCard,
    proactiveLoopStateByCard,
    perceptionStateByCard,
    visualPresenceStateByCard,
    visualPresenceCapturePersistMetaByCard,
    screenSemanticCacheByCard,
    pendingDurabilityPulseByCard,
    foregroundProbeTimeoutStreakByPid,
    resetSubconsciousTickInFlight: () => {
      subconsciousTickInFlight = null
    },
    resetSoulLifecycleState: () => {
      soulLifecycleState.queuedWrite = Promise.resolve()
      soulLifecycleState.soulSnapshot = null
      soulLifecycleState.watching = false
      soulLifecycleState.muteWatchUntil = 0
      soulLifecycleState.revision = 0
    },
    removeAlicizationsRoot: async () => {
      await rm(join(userDataPath, 'alicizations'), { recursive: true, force: true })
    },
    resetProviderConfig: () => {
      activeProviderId = ''
      activeModelId = ''
      providerCredentials = {}
    },
    resetKillSwitches: () => {
      setAlicizationKillSwitchState('ACTIVE', 'delete-all-data')
      setAlicizationCardKillSwitchState(defaultAlicizationCardId, 'ACTIVE', 'delete-all-data')
    },
    reinitializeDefaultScope: async () => {
      activeCardId = defaultAlicizationCardId
      ;({ soulRoot, soulPath, legacyPromptProfilePath, legacySparkProfilePath } = resolveCardPaths(activeCardId))
      alicizationDb = await setupAlicizationDb(userDataPath, { cardId: activeCardId })
      await restoreScopedKillSwitch(activeCardId)
      await restoreActiveSessionId(activeCardId)
      await restoreDialogueAckMap(activeCardId)
      await restoreSubconsciousState(activeCardId)
      await restoreProactiveLoopState(activeCardId)
      await restoreExecutionDeliveryState(activeCardId)

      sensoryBus = createAlicizationSensoryBus({
        tickMs: 60_000,
        staleMs: 90_000,
        cpuWindowMs: 1_000,
        appendAuditLog: input => appendAuditLog(input, activeCardId),
      })
      if (!isAlicizationKillSwitchSuspended() && getAlicizationCardKillSwitchSnapshot(activeCardId).state !== 'SUSPENDED')
        sensoryBus.start()

      await persistLlmConfigToDisk().catch(() => {})
      await bootstrap()
      await scheduleNextReminderDueCheck('delete-all-data:reinitialize').catch(() => {})
      startMemorySalienceRefreshTimer()
      startSubconsciousTimer()
      startDreamTimer()
      emitKillSwitchChanged(activeCardId)
    },
    emitVisualPresenceState,
    appendRuntimeDebugLine,
    appendAuditLog,
    scheduleNextReminderDueCheck: async reason => await scheduleNextReminderDueCheck(reason),
    activeSessionMetaKey: alicizationCardActiveSessionMetaKey,
    dialogueAckStateMetaKey: alicizationDialogueAckStateMetaKey,
    dialogueReplyFeedbackAckMetaKey: alicizationDialogueReplyFeedbackAckMetaKey,
    proactiveLoopStateMetaKey: alicizationProactiveLoopStateMetaKey,
    executionDeliveryStateMetaKey: alicizationExecutionDeliveryStateMetaKey,
    perceptionStateMetaKey: alicizationPerceptionStateMetaKey,
    visualPresenceStateMetaKey: alicizationVisualPresenceStateMetaKey,
  })
  const clearAllConversationData = cardScopeLifecycleRuntime.clearAllConversationData
  const deleteAllAlicizationData = cardScopeLifecycleRuntime.deleteAllAlicizationData

  type ReminderScheduleSource = 'tool' | 'manual-fallback' | 'autonomy'

  async function scheduleReminderTask(
    cardId: string,
    input: {
      minutes: unknown
      message: unknown
      sourceTurnId?: string
    },
    source: ReminderScheduleSource,
  ): Promise<AlicizationReminderScheduleResult> {
    const debugPrefix = source === 'tool'
      ? 'reminder.tool-execute'
      : source === 'autonomy'
        ? 'reminder.autonomy-schedule'
        : 'reminder.manual-schedule'
    await appendRuntimeDebugLine(`${debugPrefix}-requested`, {
      cardId,
      minutes: input.minutes,
      sourceTurnId: sanitizeText(input.sourceTurnId),
      messagePreview: sanitizeBriefText(String(input.message ?? ''), 120),
    })

    const parsedMinutes = Number(input.minutes)
    if (!Number.isFinite(parsedMinutes)) {
      await appendRuntimeDebugLine(`${debugPrefix}-rejected`, {
        cardId,
        reason: 'invalid-minutes-not-finite',
        minutes: input.minutes,
      })
      return {
        status: 'error',
        code: 'ALICIZATION_REMINDER_INVALID_MINUTES',
        message: 'Reminder minutes must be a valid number.',
      }
    }

    const normalizedMinutes = Math.floor(parsedMinutes)
    if (normalizedMinutes < reminderMinMinutes || normalizedMinutes > reminderMaxMinutes) {
      await appendRuntimeDebugLine(`${debugPrefix}-rejected`, {
        cardId,
        reason: 'invalid-minutes-out-of-range',
        normalizedMinutes,
        min: reminderMinMinutes,
        max: reminderMaxMinutes,
      })
      return {
        status: 'error',
        code: 'ALICIZATION_REMINDER_INVALID_MINUTES',
        message: `Reminder minutes must be between ${reminderMinMinutes} and ${reminderMaxMinutes}.`,
      }
    }

    const normalizedMessage = normalizeReminderMessage(String(input.message ?? ''))
    if (!normalizedMessage) {
      await appendRuntimeDebugLine(`${debugPrefix}-rejected`, {
        cardId,
        reason: 'invalid-message-empty',
      })
      return {
        status: 'error',
        code: 'ALICIZATION_REMINDER_INVALID_MESSAGE',
        message: 'Reminder message must be a non-empty string.',
      }
    }

    if (normalizedMessage.length > reminderMaxMessageChars) {
      await appendRuntimeDebugLine(`${debugPrefix}-rejected`, {
        cardId,
        reason: 'invalid-message-too-long',
        length: normalizedMessage.length,
        limit: reminderMaxMessageChars,
      })
      return {
        status: 'error',
        code: 'ALICIZATION_REMINDER_INVALID_MESSAGE',
        message: `Reminder message must be at most ${reminderMaxMessageChars} characters.`,
      }
    }

    const triggerAt = Date.now() + normalizedMinutes * 60_000
    const taskId = `reminder:${cardId}:${Date.now()}:${randomUUID().slice(0, 8)}`
    const sourceTurnId = sanitizeText(input.sourceTurnId)
    const record = await withCardScope(cardId, async () => await alicizationDb.insertScheduledTask({
      taskId,
      triggerAt,
      message: normalizedMessage,
      sourceTurnId: sourceTurnId || undefined,
    }), {
      label: source === 'tool'
        ? `tool:set-reminder:${cardId}`
        : source === 'autonomy'
          ? `autonomy:set-reminder:${cardId}`
          : `manual:set-reminder:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })

    await appendRuntimeDebugLine('reminder.task-inserted', {
      cardId,
      source,
      taskId: record.taskId,
      sourceTurnId: sourceTurnId || undefined,
      createdAt: record.createdAt,
      createdIso: new Date(record.createdAt).toISOString(),
      triggerAt: record.triggerAt,
      triggerIso: new Date(record.triggerAt).toISOString(),
      delayMs: record.triggerAt - record.createdAt,
      delayMinutes: Number(((record.triggerAt - record.createdAt) / 60_000).toFixed(2)),
      messagePreview: sanitizeBriefText(record.message, 120),
    })

    await queueScopedAuditLog(cardId, {
      level: 'notice',
      category: 'alicization.reminder',
      action: 'alicization.reminder.task.created',
      message: source === 'tool'
        ? 'Created reminder task via main gateway top-level tool.'
        : source === 'autonomy'
          ? 'Created reminder task from the subconscious autonomy loop.'
          : 'Created reminder task via deterministic fallback scheduler.',
      payload: {
        taskId: record.taskId,
        triggerAt: record.triggerAt,
        minutes: normalizedMinutes,
        source,
        sourceTurnId: sourceTurnId || undefined,
      },
    })

    await scheduleNextReminderDueCheck('task-created')

    return {
      status: 'scheduled',
      taskId: record.taskId,
      triggerTime: new Date(record.triggerAt).toISOString(),
      triggerAt: record.triggerAt,
      message: record.message,
    }
  }

  function clearReminderDueTimer() {
    if (!reminderDueTimer)
      return
    clearTimeout(reminderDueTimer)
    reminderDueTimer = undefined
  }

  async function scheduleNextReminderDueCheck(reason: string) {
    clearReminderDueTimer()

    if (isAlicizationKillSwitchSuspended() || getAlicizationCardKillSwitchSnapshot(activeCardId).state === 'SUSPENDED') {
      await appendRuntimeDebugLine('reminder.next-due-skipped', {
        cardId: activeCardId,
        reason: 'kill-switch-suspended',
        trigger: reason,
      })
      return
    }

    const pendingPreview = await alicizationDb.listPendingScheduledTasks(1).catch(() => [])
    const nextPending = pendingPreview.at(0)
    if (!nextPending) {
      await appendRuntimeDebugLine('reminder.next-due-none', {
        cardId: activeCardId,
        trigger: reason,
      })
      return
    }

    const nowMs = Date.now()
    const dueInMs = Math.max(0, nextPending.triggerAt - nowMs)
    const timeoutMs = Math.min(2_147_000_000, dueInMs + 120)
    await appendRuntimeDebugLine('reminder.next-due-scheduled', {
      cardId: activeCardId,
      trigger: reason,
      taskId: nextPending.taskId,
      triggerAt: nextPending.triggerAt,
      triggerIso: new Date(nextPending.triggerAt).toISOString(),
      dueInMs,
      timeoutMs,
    })

    reminderDueTimer = setTimeout(() => {
      reminderDueTimer = undefined
      void appendRuntimeDebugLine('reminder.next-due-fired', {
        cardId: activeCardId,
        taskId: nextPending.taskId,
      })

      if (subconsciousTickInFlight) {
        void appendRuntimeDebugLine('reminder.next-due-deferred', {
          cardId: activeCardId,
          reason: 'tick-in-flight',
        })
        void scheduleNextReminderDueCheck('deferred-after-inflight').catch(() => {})
        return
      }

      subconsciousTickInFlight = runSubconsciousTickAcrossCards('force', [activeCardId])
      void subconsciousTickInFlight.catch(async (error) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.reminder',
          action: 'next-due-trigger-failed',
          message: 'Reminder next-due trigger failed.',
          payload: {
            reason: error instanceof Error ? error.message : String(error),
            cardId: activeCardId,
          },
        })
      }).finally(() => {
        subconsciousTickInFlight = null
        void scheduleNextReminderDueCheck('post-next-due-trigger').catch(() => {})
      })
    }, timeoutMs)
  }

  function startMemorySalienceRefreshTimer() {
    if (pruneTimer) {
      clearInterval(pruneTimer)
      pruneTimer = undefined
    }
    pruneTimer = setInterval(() => {
      void alicizationDb.runMemoryPrune().catch(async (error) => {
        await appendAuditLog({
          level: 'warning',
          category: 'memory',
          action: 'salience-refresh-scheduled-failed',
          message: 'Scheduled memory salience refresh failed.',
          payload: {
            reason: error instanceof Error ? error.message : String(error),
          },
        })
      })
    }, 24 * 60 * 60 * 1000)
  }

  function startSubconsciousTimer() {
    if (subconsciousTimer) {
      clearInterval(subconsciousTimer)
      subconsciousTimer = undefined
    }
    subconsciousTimer = setInterval(() => {
      if (subconsciousTickInFlight) {
        void appendRuntimeDebugLine('subconscious.timer.skipped', {
          reason: 'tick-in-flight',
          activeCardId,
        })
        return
      }

      void appendRuntimeDebugLine('subconscious.timer.fired', {
        activeCardId,
        tickMs: alicizationSubconsciousTickMs,
      })

      subconsciousTickInFlight = runSubconsciousTickAcrossCards('timer')
      void subconsciousTickInFlight.catch(async (error) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.subconscious',
          action: 'tick-failed',
          message: 'Background subconscious tick failed.',
          payload: {
            reason: error instanceof Error ? error.message : String(error),
          },
        })
      }).finally(() => {
        subconsciousTickInFlight = null
      })
    }, alicizationSubconsciousTickMs)
  }

  function startDreamTimer() {
    if (dreamTimer) {
      clearInterval(dreamTimer)
      dreamTimer = undefined
    }
    let running = false
    let lastScheduleKey = ''
    const makeDayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
    const runScheduledDream = async (reason: string, key: string) => {
      if (running)
        return
      running = true
      try {
        await runDreamAcrossCards(reason)
        lastScheduleKey = key
      }
      catch (error) {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.dream',
          action: reason === 'schedule-catch-up' ? 'catch-up-failed' : 'scheduled-failed',
          message: reason === 'schedule-catch-up'
            ? 'Catch-up dreaming run failed after missing schedule window.'
            : 'Scheduled dreaming run failed.',
          payload: {
            reason: error instanceof Error ? error.message : String(error),
          },
        })
      }
      finally {
        running = false
      }
    }

    void (async () => {
      const now = new Date()
      const key = makeDayKey(now)
      if (now.getHours() < 3 || key === lastScheduleKey)
        return
      await runScheduledDream('schedule-catch-up', key)
    })()

    dreamTimer = setInterval(() => {
      const now = new Date()
      const key = makeDayKey(now)
      const inWindow = now.getHours() === 3 && now.getMinutes() < 10
      if (!inWindow || key === lastScheduleKey)
        return
      void runScheduledDream('schedule-03:00', key)
    }, 60_000)
  }

  function createTurnWriteAbortSignal(turnId?: string) {
    const normalizedTurnId = turnId?.trim()
    if (!normalizedTurnId)
      return undefined

    const existing = turnWriteAbortControllers.get(normalizedTurnId)
    if (existing)
      return existing.signal

    const controller = new AbortController()
    turnWriteAbortControllers.set(normalizedTurnId, controller)
    return controller.signal
  }

  function releaseTurnWriteAbortController(turnId?: string) {
    const normalizedTurnId = turnId?.trim()
    if (!normalizedTurnId)
      return
    turnWriteAbortControllers.delete(normalizedTurnId)
  }

  async function abortAllTurnWrites(reason: string) {
    let aborted = 0
    for (const controller of turnWriteAbortControllers.values()) {
      if (controller.signal.aborted)
        continue
      controller.abort(createAbortError(reason))
      aborted += 1
    }
    turnWriteAbortControllers.clear()

    const abortedChatRuns = abortAlicizationRunningChatRuns({
      runs: chatRuns.entries(),
      reason,
      mainChatRunState,
      createAbortError,
    })

    await appendAuditLog({
      level: 'notice',
      category: 'kill-switch',
      action: 'kill-switch-abort-broadcast',
      message: 'Broadcasted kill switch abort to pending runtime turn writes.',
      payload: {
        reason,
        aborted,
        abortedChatRuns,
      },
    })
  }

  async function writeAtomicContent(path: string, category: string, content: string) {
    await writeAlicizationAtomicContent({
      path,
      category,
      content,
      directoryFsyncPath: soulRoot,
      platform,
      processId: pid,
      randomId: randomUUID,
      renameRetryDelaysMs: winRenameRetryDelaysMs,
      appendAuditLog,
    })
  }

  async function writeSoulContent(content: string) {
    await writeAtomicContent(soulPath, 'soul', content)
  }

  async function suspendKillSwitch(reason?: string) {
    const snapshot = await persistScopedKillSwitch(activeCardId, 'SUSPENDED', reason)
    sensoryBus.stop('kill-switch')
    clearReminderDueTimer()
    await abortAllTurnWrites(reason ?? 'manual')
    emitKillSwitchChanged()
    await appendAuditLog({
      level: 'notice',
      category: 'kill-switch',
      action: 'suspend',
      message: 'Kill switch set to SUSPENDED.',
      payload: {
        reason: reason ?? 'manual',
      },
    })
    return snapshot
  }

  async function resumeKillSwitch(reason?: string) {
    const snapshot = await persistScopedKillSwitch(activeCardId, 'ACTIVE', reason)
    if (!isAlicizationKillSwitchSuspended())
      sensoryBus.start()
    await scheduleNextReminderDueCheck('kill-switch-resume')
    emitKillSwitchChanged()
    await appendAuditLog({
      level: 'notice',
      category: 'kill-switch',
      action: 'resume',
      message: 'Kill switch resumed to ACTIVE.',
      payload: {
        reason: reason ?? 'manual',
      },
    })
    return snapshot
  }

  async function suspendGlobalKillSwitch(reason?: string) {
    const snapshot = setAlicizationKillSwitchState('SUSPENDED', reason)
    sensoryBus.stop('kill-switch')
    clearReminderDueTimer()
    await abortAllTurnWrites(reason ?? 'manual')
    emitKillSwitchChanged(activeCardId)
    await appendAuditLog({
      level: 'notice',
      category: 'kill-switch',
      action: 'global-suspend',
      message: 'Global kill switch set to SUSPENDED.',
      payload: {
        reason: reason ?? 'manual',
      },
    })
    return snapshot
  }

  async function resumeGlobalKillSwitch(reason?: string) {
    const snapshot = setAlicizationKillSwitchState('ACTIVE', reason)
    if (getAlicizationCardKillSwitchSnapshot(activeCardId).state !== 'SUSPENDED')
      sensoryBus.start()
    await scheduleNextReminderDueCheck('global-kill-switch-resume')
    emitKillSwitchChanged(activeCardId)
    await appendAuditLog({
      level: 'notice',
      category: 'kill-switch',
      action: 'global-resume',
      message: 'Global kill switch resumed to ACTIVE.',
      payload: {
        reason: reason ?? 'manual',
      },
    })
    return snapshot
  }

  async function appendConversationTurnWithGuards(payload: AlicizationConversationTurnInput & {
    turnRuntimeContext?: unknown
    onPersisted?: (() => Promise<void> | void) | null
  }) {
    const payloadStructured = payload.structured && typeof payload.structured === 'object'
      ? payload.structured as Record<string, unknown>
      : null
    const autonomousDialogueFamily = resolveAlicizationAutonomousDialogueFamilyClassification({
      turnId: payload.turnId,
      rawFormat: payloadStructured?.format,
      origin: payload.origin,
    })
    const originOnlyAutonomousSpoof
      = isAlicizationAutonomousDialogueOrigin(payload.origin)
        && !autonomousDialogueFamily.matchedBy.includes('turn-id-prefix')
        && !autonomousDialogueFamily.matchedBy.includes('structured-format')

    if (originOnlyAutonomousSpoof) {
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.dialogue',
        action: 'autonomous-turn-spoof-rejected',
        message: 'Rejected an autonomous dialogue turn because it only claimed proactive origin without structural family proof.',
        payload: {
          turnId: payload.turnId ?? null,
          sessionId: normalizeSessionId(payload.sessionId) || null,
          origin: payload.origin,
          matchedBy: autonomousDialogueFamily.matchedBy,
          structuredFormat: payloadStructured?.format ?? null,
        },
      })
      return false
    }

    const normalizedSessionId = normalizeSessionId(payload.sessionId) || await ensureActiveOrLatestSessionId(activeCardId)
    if (normalizeSessionId(payload.sessionId))
      await persistActiveSessionId(activeCardId, normalizedSessionId)
    const normalizedCreatedAt = Number.isFinite(payload.createdAt)
      ? Math.max(0, Math.floor(Number(payload.createdAt)))
      : Date.now()

    let normalizedPayload: AlicizationConversationTurnInput = {
      ...payload,
      sessionId: normalizedSessionId,
      origin: autonomousDialogueFamily.isAutonomous
        ? autonomousDialogueFamily.canonicalOrigin ?? resolveAlicizationAutonomousDialogueOrigin('proactive')
        : 'user-turn',
      createdAt: normalizedCreatedAt,
    }
    const pendingMindTraceTelemetry = normalizedPayload.turnId
      ? pendingMindTraceTelemetryByTurnId.get(normalizedPayload.turnId) ?? null
      : null
    const payloadVisibleReplyRealization = normalizeVisibleReplyRealizationTelemetry(payload.visibleReplyRealization)

    const performanceManifest = await getPerformanceManifest()
    const governedTurn = coerceConversationTurnToMindGovernedPayload(normalizedPayload, performanceManifest, {
      visibleReplyOverrideMode: 'rewrite-request-only',
      currentConsciousFrame: visualPresenceStateByCard.get(activeCardId)?.currentConsciousFrame ?? null,
    })
    normalizedPayload = {
      ...governedTurn.payload,
      structured: normalizePersistedProjectStateForConversationTurn({
        assistantText: governedTurn.payload.assistantText ?? null,
        structured: governedTurn.payload.structured && typeof governedTurn.payload.structured === 'object'
          ? governedTurn.payload.structured as Record<string, unknown>
          : null,
        projectStatePersistence,
      }) ?? governedTurn.payload.structured,
    }
    if (governedTurn.tookOver && governedTurn.governance) {
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.dialogue',
        action: 'mind-governance-takeover',
        message: 'Mind governance rewrote the final user-turn structured payload before persistence.',
        payload: {
          turnId: normalizedPayload.turnId,
          sessionId: normalizedPayload.sessionId,
          turnMode: governedTurn.governance.turnMode,
          repairState: governedTurn.governance.repairState,
          replyOverridden: governedTurn.replyOverridden,
          overrideClass: governedTurn.overrideClass ?? 'none',
          fallbackPatternId: governedTurn.fallbackPatternId ?? 'none',
          reasons: governedTurn.reasons,
          format: readStringValue((normalizedPayload.structured as Record<string, unknown> | undefined)?.format),
          ...governedTurn.audit,
        },
      })
    }

    if (normalizedPayload.origin === 'user-turn' && sanitizeText(normalizedPayload.userText).length > 0) {
      const proactiveStateBeforeSettlement = await ensureProactiveLoopState(activeCardId).catch(() => null)
      const proactiveRecentOutcomeCountBeforeSettlement = proactiveStateBeforeSettlement?.recentOutcomes.length ?? 0
      const proactiveStateAfterSettlement = await settlePendingProactiveOutcomesFromUserTurn(
        activeCardId,
        normalizedCreatedAt,
        'append-conversation-turn',
        {
          userText: normalizedPayload.userText,
        },
      ).catch(() => proactiveStateBeforeSettlement)
      const newlySettledProactiveOutcomes = proactiveStateAfterSettlement?.recentOutcomes.slice(proactiveRecentOutcomeCountBeforeSettlement) ?? []
      if (newlySettledProactiveOutcomes.length > 0) {
        await syncSessionMirrorFromCurrentCardState({
          cardId: activeCardId,
          proactiveOutcomes: newlySettledProactiveOutcomes,
          sessionId: normalizedSessionId,
          source: 'proactive-feedback',
          turnId: normalizedPayload.turnId ?? null,
        })
      }
      await markSubconsciousInteraction(activeCardId)
    }

    if (isAlicizationKillSwitchSuspended() || getAlicizationCardKillSwitchSnapshot(activeCardId).state === 'SUSPENDED') {
      await appendAuditLog({
        level: 'notice',
        category: 'kill-switch',
        action: 'turn-write-skipped-aborted',
        message: 'Skipped conversation turn persistence because kill switch is suspended.',
        payload: {
          sessionId: normalizedPayload.sessionId,
          turnId: normalizedPayload.turnId,
        },
      })
      return false
    }

    const signal = createTurnWriteAbortSignal(normalizedPayload.turnId)
    if (signal?.aborted) {
      releaseTurnWriteAbortController(normalizedPayload.turnId)
      await appendAuditLog({
        level: 'notice',
        category: 'kill-switch',
        action: 'turn-write-skipped-aborted',
        message: 'Skipped conversation turn persistence because turn write signal was already aborted.',
        payload: {
          sessionId: normalizedPayload.sessionId,
          turnId: normalizedPayload.turnId,
        },
      })
      return false
    }

    const appendMindTurnTraceEvents = async (
      dialoguePayload?: AlicizationNormalizedDialogueRespondedPayload | null,
    ) => {
      const events = buildMindTurnTraceEvents({
        payload: normalizedPayload,
        governedTurn,
        createdAt: normalizedCreatedAt,
        dialoguePayload,
        memoryTrace: pendingMindTraceTelemetry?.memoryTrace ?? null,
      })
      if (events.length === 0)
        return [] as typeof events
      try {
        await alicizationDb.appendMindTurnEvents(events, { signal })
        const participation = events.find(event => event.kind === 'governance-normalized')?.payload?.participation
        if (participation && typeof participation === 'object') {
          await memoryRetrievalTelemetryRuntime.recordParticipation({
            mindParticipation: Number((participation as any).mindParticipation ?? 0),
            memoryParticipation: Number((participation as any).memoryParticipation ?? 0),
            personalityParticipation: Number((participation as any).personalityParticipation ?? 0),
            relationshipParticipation: Number((participation as any).relationshipParticipation ?? 0),
            continuityParticipation: Number((participation as any).continuityParticipation ?? 0),
          }).catch(() => {})
        }
      }
      catch (error) {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.dialogue',
          action: 'mind-turn-events-append-failed',
          message: 'Failed to append replayable mind-turn events for governed dialogue persistence.',
          payload: {
            turnId: normalizedPayload.turnId,
            sessionId: normalizedPayload.sessionId,
            decisionTraceId: governedTurn.governance?.decisionTraceId ?? null,
            reason: errorMessageFrom(error) ?? 'unknown-error',
          },
        })
      }
      return events
    }

    const shouldSkipDispatchOnlyPersistence = normalizedPayload.origin === 'user-turn'
      && sanitizeText(normalizedPayload.assistantText).length === 0
      && sanitizeText(readStringValue((normalizedPayload.structured as Record<string, unknown> | undefined)?.reply)).length === 0
      && governedTurn.audit?.execution_dispatch_hidden === true
    if (shouldSkipDispatchOnlyPersistence) {
      await appendMindTurnTraceEvents(null)
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.dialogue',
        action: 'mind-governance-dispatch-hidden',
        message: 'Skipped visible dialogue persistence for an execution-first dispatch-only turn; result surface will be delivered by execution flow.',
        payload: {
          turnId: normalizedPayload.turnId,
          sessionId: normalizedPayload.sessionId,
          decisionTraceId: governedTurn.governance?.decisionTraceId ?? null,
          reasons: governedTurn.reasons,
        },
      })
      return false
    }

    try {
      let persistedDialogueState: AlicizationVisualPresenceStateSnapshot | null = null
      let visualPresenceState: AlicizationVisualPresenceStateSnapshot | null = null
      await alicizationDb.appendConversationTurn(normalizedPayload, { signal })
      await payload.onPersisted?.()
      const structured = normalizedPayload.structured && typeof normalizedPayload.structured === 'object'
        ? normalizedPayload.structured as Record<string, unknown>
        : null
      const derivedBundleForLearning = normalizeAlicizationDerivedMindStateBundle(structured?.derivedMindStateBundle ?? null)
      const emotionalKernelForPersistence = derivedBundleForLearning?.emotionalKernel ?? null
      if (derivedBundleForLearning?.selfEvolution && normalizedPayload.origin === 'user-turn') {
        const retrievedFactsForLearning = Array.isArray(structured?.retrievedFacts)
          ? (structured?.retrievedFacts as unknown[]).filter(item => item && typeof item === 'object')
          : []
        await learningActionScheduler.scheduleLearningTask({
          context: {
            hostAttitude: '',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: retrievedFactsForLearning as any,
            recalledFragments: [],
            selfEvolution: derivedBundleForLearning.selfEvolution,
            decisionTraceId: governedTurn.governance?.decisionTraceId ?? null,
            sessionId: normalizedPayload.sessionId ?? null,
          },
          turnId: normalizedPayload.turnId ?? null,
        }).catch(() => {})
      }
      if (normalizedPayload.origin === 'user-turn' && sanitizeText(normalizedPayload.assistantText).length > 0) {
        try {
          visualPresenceState = await ensureVisualPresenceState(activeCardId)
          const dialogueWorldThread = registerDialogueWorldThreadAssistantTurn({
            now: normalizedCreatedAt,
            previous: visualPresenceState.dialogueWorldThread ?? null,
            conversationState: visualPresenceState.conversationState,
            replyDeliberation: visualPresenceState.replyDeliberation,
            answerCompiler: visualPresenceState.answerCompiler,
            assistantText: normalizedPayload.assistantText,
            runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState),
          })
          if (dialogueWorldThread) {
            const persistedRuntimeSurface = buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
            const previousDialogueWorldThread = visualPresenceState.dialogueWorldThread
            const previousConversationState = visualPresenceState.conversationState
            const proactiveHostContexts = inferHostSocialContextsFromText([
              dialogueWorldThread.activeThread,
              visualPresenceState.conversationState?.hostMove ?? '',
              visualPresenceState.conversationState?.activeProject ?? '',
              visualPresenceState.currentScene?.summary ?? '',
            ].filter(Boolean).join(' '), ['general'])
            const basePersistedPersonStateProjection = buildAlicizationPersonStateProjection({
              now: normalizedCreatedAt,
              contexts: proactiveHostContexts,
              autobiographicalSelf: persistedRuntimeSurface.memory.autobiographicalSelf ?? null,
              hostPersonModel: null,
              longHorizonMemory: persistedRuntimeSurface.memory.longHorizonMemory ?? null,
              motiveEngine: persistedRuntimeSurface.memory.motiveEngine ?? null,
              habitPolicy: persistedRuntimeSurface.agency.habitPolicy ?? null,
              selfContinuity: persistedRuntimeSurface.memory.selfContinuity ?? null,
              selfState: persistedRuntimeSurface.agency.selfState ?? null,
              privateThought: persistedRuntimeSurface.cognition.privateThought ?? null,
              mindEcology: buildMindEcologyFromRuntimeSurface(persistedRuntimeSurface),
              selfEvolution: persistedRuntimeSurface.memory.selfEvolution ?? null,
              previousContinuityState: persistedRuntimeSurface.memory.personalityContinuityState ?? null,
            })
            const persistedPersonStateProjection = (() => {
              const previousSummary = sanitizeBriefText(visualPresenceState.personStateProjection?.summary ?? '', 220)
              const previousOpeningGuidance = sanitizeBriefText(visualPresenceState.personStateProjection?.openingGuidance ?? '', 220)
              const previousCadenceSummary = sanitizeBriefText(visualPresenceState.personStateProjection?.manifestationCadenceSummary ?? '', 220)
              const carrySummary = sanitizeBriefText(dialogueWorldThread.openLoops?.[0] ?? '', 220)
              const carryNarrative = sanitizeBriefText(dialogueWorldThread.narrative?.[0] ?? '', 220)
              const carryReason = sanitizeBriefText(visualPresenceState.conversationState?.carryReason ?? '', 220)
              const latestProactiveOutcome = visualPresenceState.proactiveLoopState?.recentOutcomes?.at(-1) ?? null
              const recentProactiveReplyCarry
                = latestProactiveOutcome?.outcome === 'reply-within-120s'
                  && normalizedCreatedAt - Number(latestProactiveOutcome.createdAt ?? 0) <= 10 * 60_000
                  && /同一条线|沿着刚才那条线|先别换线|刚才那条提醒|继续/u.test([
                    normalizedPayload.userText ?? '',
                    normalizedPayload.assistantText ?? '',
                    carrySummary,
                    carryNarrative,
                    carryReason,
                  ].join(' | '))
              const keepSameThread = recentProactiveReplyCarry || /same-thread-continuation|already continuing|still continuing|still in motion|同一条线|沿着刚才那条线|callback line/u.test([
                previousSummary,
                previousOpeningGuidance,
                previousCadenceSummary,
                carrySummary,
                carryNarrative,
                carryReason,
              ].join(' | ').toLowerCase())
              if (!keepSameThread)
                return basePersistedPersonStateProjection

              const proactiveSameLineCopy = recentProactiveReplyCarry
                ? {
                    continuitySummary: previousSummary.includes('project_continuity=')
                      ? previousSummary
                      : `project_continuity=${carrySummary || carryNarrative || '同一条主动提醒线已经被接住了，这次继续该沿着刚才那条提醒继续，不重新起势。'}`,
                    openingGuidance: previousOpeningGuidance
                      || '先别换线，就沿着刚才那条提醒继续，保持 same-line lower-pressure continuity，不要把它降回 fresh reopening wait。',
                    manifestationCadenceSummary: previousCadenceSummary
                      || 'quiet same-her continuity still holds while the same proactive reminder line keeps continuing after being received.',
                  }
                : null
              const continuitySummary = previousSummary.includes('project_continuity=')
                ? previousSummary
                : proactiveSameLineCopy?.continuitySummary
                  ?? `project_continuity=${carrySummary || carryNarrative || 'the same callback line is already continuing lower-pressure after another detour, so keep it on the same living thread'}`
              const openingGuidance = previousOpeningGuidance
                || proactiveSameLineCopy?.openingGuidance
                || 'Stay on the same callback line and keep continuing lower-pressure; this line is already continuing and should not cool back into a fresh reopening wait.'
              const manifestationCadenceSummary = previousCadenceSummary
                || proactiveSameLineCopy?.manifestationCadenceSummary
                || 'quiet same-her continuity still holds while the same callback line keeps continuing after another detour'
              const previousInwardLine = sanitizeBriefText(
                visualPresenceState.personStateProjection?.selfContinuityAuthority?.inwardLine ?? '',
                220,
              )
              const persistedRuntimeProjectState
                = persistedRuntimeSurface.dialogue.runtimeDigest?.projectState
                  ?? persistedRuntimeSurface.cognition.runtimeDigest?.projectState
                  ?? null
              const runtimeStructuredProjectState = structured?.projectState && typeof structured.projectState === 'object'
                ? structured.projectState as Record<string, unknown>
                : null
              const currentConsciousProjectState = visualPresenceState.currentConsciousFrame?.projectState ?? null
              const runtimeProjectSameHerHoldDetail = sanitizeBriefText(
                [
                  readStringValue(runtimeStructuredProjectState?.sameHerHoldDetail),
                  persistedRuntimeProjectState?.sameHerHoldDetail ?? null,
                  currentConsciousProjectState?.sameHerHoldDetail ?? null,
                ].find(value => typeof value === 'string' && value.trim().length > 0) ?? '',
                220,
              )
              const runtimeProjectNextClosureTarget = sanitizeBriefText(
                [
                  readStringValue(runtimeStructuredProjectState?.nextClosureTarget),
                  persistedRuntimeProjectState?.nextClosureTarget ?? null,
                  currentConsciousProjectState?.nextClosureTarget ?? null,
                ].find(value => typeof value === 'string' && value.trim().length > 0) ?? '',
                220,
              )
              const runtimeProjectCompanionHeadlineLine = sanitizeBriefText(
                [
                  readStringValue(runtimeStructuredProjectState?.companionHeadlineLine),
                  persistedRuntimeProjectState?.companionHeadlineLine ?? null,
                  currentConsciousProjectState?.companionHeadlineLine ?? null,
                ].find(value => typeof value === 'string' && value.trim().length > 0) ?? '',
                220,
              )
              const continuityInwardLine = previousInwardLine
                || sanitizeBriefText(
                  [
                    carryReason,
                    carrySummary,
                    carryNarrative,
                    continuitySummary,
                    openingGuidance,
                  ].filter(Boolean).join(' | '),
                  220,
                )
              const runtimeProjectContinuityCue = sanitizeBriefText(
                [
                  runtimeStructuredProjectState
                    ? readStringValue(runtimeStructuredProjectState.continuityCue)
                    || readStringValue(runtimeStructuredProjectState.sameHerSelfLine)
                    || readStringValue(runtimeStructuredProjectState.sameHerHoldDetail)
                    || readStringValue(runtimeStructuredProjectState.nextClosureTarget)
                    || readStringValue(runtimeStructuredProjectState.companionHeadlineLine)
                    : null,
                  persistedRuntimeProjectState?.continuityCue ?? null,
                  persistedRuntimeProjectState?.sameHerSelfLine ?? null,
                  persistedRuntimeProjectState?.sameHerHoldDetail ?? null,
                  persistedRuntimeProjectState?.nextClosureTarget ?? null,
                  persistedRuntimeProjectState?.companionHeadlineLine ?? null,
                  currentConsciousProjectState?.continuityCue ?? null,
                  currentConsciousProjectState?.sameHerSelfLine ?? null,
                  currentConsciousProjectState?.sameHerHoldDetail ?? null,
                  currentConsciousProjectState?.nextClosureTarget ?? null,
                  currentConsciousProjectState?.companionHeadlineLine ?? null,
                ].find(value => typeof value === 'string' && value.trim().length > 0) ?? '',
                220,
              )
              const continuityAuthorityInwardLine = previousInwardLine
                || runtimeProjectContinuityCue
                || continuityInwardLine
              const runtimeProjectCarrySourceTags = inferRuntimeProjectCarrySourceTags({
                sourceTags: [
                  ...((basePersistedPersonStateProjection.selfContinuityAuthority?.sourceTags ?? []) as string[]),
                  ...((visualPresenceState.personStateProjection?.selfContinuityAuthority?.sourceTags ?? []) as string[]),
                ],
                inwardLine: continuityAuthorityInwardLine,
                summary: continuitySummary,
                openingGuidance,
                carryReason,
                carrySummary,
                carryNarrative,
                sameHerSelfLine: runtimeProjectContinuityCue,
                sameHerHoldDetail: runtimeProjectSameHerHoldDetail,
                nextClosureTarget: runtimeProjectNextClosureTarget,
                companionHeadlineLine: runtimeProjectCompanionHeadlineLine,
              })
              const mergedSelfContinuityAuthority = mergePreferredSelfContinuityAuthority({
                bundleAuthority: basePersistedPersonStateProjection.selfContinuityAuthority ?? null,
                runtimeAuthority: visualPresenceState.personStateProjection?.selfContinuityAuthority ?? null,
              })

              return {
                ...basePersistedPersonStateProjection,
                summary: continuitySummary,
                openingGuidance,
                manifestationCadenceSummary,
                selfContinuityAuthority: mergedSelfContinuityAuthority
                  ? {
                      ...mergedSelfContinuityAuthority,
                      sourceTags: Array.from(new Set([
                        ...(mergedSelfContinuityAuthority.sourceTags ?? []),
                        ...runtimeProjectCarrySourceTags,
                      ])),
                      inwardLine: continuityAuthorityInwardLine || mergedSelfContinuityAuthority.inwardLine || null,
                    }
                  : null,
              } satisfies AlicizationPersonStateProjection
            })()
            const preservedConversationState = (() => {
              const currentConversationState = visualPresenceState.conversationState ?? null
              if (
                previousConversationState?.carryEligible === true
                && previousConversationState.carryReason
                && previousConversationState.continuityPolicy === 'stay-on-thread'
              ) {
                const baseConversationState = currentConversationState ?? previousConversationState
                return {
                  ...baseConversationState,
                  carryEligible: true,
                  carryReason: previousConversationState.carryReason,
                  continuityPolicy: 'stay-on-thread' as const,
                  narrative: Array.from(new Set([
                    ...(baseConversationState.narrative ?? []),
                    ...(previousConversationState.narrative ?? []),
                  ])).slice(0, 8),
                } satisfies AlicizationConversationStateSnapshot
              }
              return currentConversationState
            })()
            const preservedDialogueWorldThread = (() => {
              if (
                previousDialogueWorldThread?.carryEligible === true
                && previousDialogueWorldThread.carryReason
              ) {
                return {
                  ...dialogueWorldThread,
                  carryEligible: true,
                  carryReason: previousDialogueWorldThread.carryReason,
                  openLoops: Array.from(new Set([
                    ...(dialogueWorldThread.openLoops ?? []),
                    ...(previousDialogueWorldThread.openLoops ?? []),
                  ])).slice(0, 6),
                  narrative: Array.from(new Set([
                    ...(dialogueWorldThread.narrative ?? []),
                    ...(previousDialogueWorldThread.narrative ?? []),
                  ])).slice(0, 6),
                }
              }
              return dialogueWorldThread
            })()
            const nextVisualPresenceState = updateVisualPresenceState({
              now: normalizedCreatedAt,
              previousState: visualPresenceState,
              watchMode: visualPresenceState.watchMode,
              scene: visualPresenceState.currentScene,
              attention: visualPresenceState.attention,
              conversationState: preservedConversationState,
              dialogueWorldThread: preservedDialogueWorldThread,
              personStateProjection: persistedPersonStateProjection,
              currentConsciousFrame: visualPresenceState.currentConsciousFrame,
              initiative: visualPresenceState.initiative,
              emotionalKernel: emotionalKernelForPersistence ?? visualPresenceState.emotionalKernel,
              privateThought: visualPresenceState.privateThought,
              captureState: visualPresenceState.captureState,
              durabilityPulse: visualPresenceState.durabilityPulse,
              recentTransition: visualPresenceState.recentTransition,
              nextSuggestedProbeMs: visualPresenceState.nextSuggestedProbeMs,
            })
            const nextVisualPresenceStateWithBodyAuthority = bodyKernel.applyToVisualPresenceState({
              now: normalizedCreatedAt,
              previousState: visualPresenceState,
              candidateState: {
                ...nextVisualPresenceState,
                emotionalTransitionDecay: derivedBundleForLearning?.emotionalTransitionLedger
                  ? resolveAlicizationEmotionalTransitionDecay({
                      ledger: derivedBundleForLearning.emotionalTransitionLedger,
                      now: normalizedCreatedAt,
                      current: emotionalKernelForPersistence ?? visualPresenceState.emotionalKernel ?? null,
                    })
                  : null,
              },
              activeConversation: true,
            })
            await persistVisualPresenceState(activeCardId, nextVisualPresenceStateWithBodyAuthority)
            persistedDialogueState = nextVisualPresenceStateWithBodyAuthority
          }
          else {
            persistedDialogueState = visualPresenceState
          }
        }
        catch (error) {
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.dialogue',
            action: 'dialogue-world-thread-register-failed',
            message: 'Failed to register the persisted assistant turn into the dialogue world thread.',
            payload: {
              turnId: normalizedPayload.turnId,
              sessionId: normalizedPayload.sessionId,
              reason: errorMessageFrom(error) ?? 'unknown-error',
            },
          })
        }
      }

      const dialogueTurnMemoryText = normalizeOrganicMemoryText(
        buildDialogueTurnMemoryFragment({
          payload: normalizedPayload,
          governance: governedTurn.governance ?? null,
          state: persistedDialogueState ?? null,
          runtimeSurface: persistedDialogueState
            ? buildAlicizationDigitalLifeRuntimeSurface(persistedDialogueState)
            : null,
        }),
        320,
      )
      if (dialogueTurnMemoryText) {
        await alicizationDb.appendSubconsciousFragments([{
          text: dialogueTurnMemoryText,
          sourceKind: 'dialogue-turn',
        }]).catch(async (error) => {
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.dialogue',
            action: 'dialogue-memory-write-failed',
            message: 'Failed to append dialogue-turn memory fragment after governed turn persistence.',
            payload: {
              turnId: normalizedPayload.turnId,
              sessionId: normalizedPayload.sessionId,
              reason: errorMessageFrom(error) ?? 'unknown-error',
              fragment: dialogueTurnMemoryText,
            },
          })
        })
      }

      const runtimeSurfaceForOutcome = persistedDialogueState
        ? buildAlicizationDigitalLifeRuntimeSurface(persistedDialogueState)
        : visualPresenceState
          ? buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
          : null
      if (normalizedPayload.origin === 'user-turn' && sanitizeText(normalizedPayload.assistantText).length > 0) {
        await persistOutcomeClosure(activeCardId, buildReplyOutcomeClosure({
          now: normalizedCreatedAt,
          cardId: activeCardId,
          turnId: normalizedPayload.turnId,
          sessionId: normalizedPayload.sessionId,
          decisionTraceId: governedTurn.governance?.decisionTraceId ?? null,
          runtimeSurface: runtimeSurfaceForOutcome,
          userText: normalizedPayload.userText,
          assistantText: normalizedPayload.assistantText,
        }))
      }

      if (signal?.aborted || isAlicizationKillSwitchSuspended() || getAlicizationCardKillSwitchSnapshot(activeCardId).state === 'SUSPENDED') {
        await appendMindTurnTraceEvents(null)
        await appendAuditLog({
          level: 'notice',
          category: 'kill-switch',
          action: 'turn-abort-dropped',
          message: 'Dropped dialogue responded event because the turn was aborted after persistence.',
          payload: {
            sessionId: normalizedPayload.sessionId,
            turnId: normalizedPayload.turnId,
          },
        })
        return true
      }

      let emittedDialoguePayload: AlicizationNormalizedDialogueRespondedPayload | null = null
      const performanceManifest = await getPerformanceManifest()
      const dialoguePayload = normalizeDialogueRespondedPayload(
        normalizedPayload,
        performanceManifest,
        {
          residentPerformance: (persistedDialogueState ?? visualPresenceState)?.residentPerformance ?? null,
          currentConsciousFrame: visualPresenceStateByCard.get(activeCardId)?.currentConsciousFrame ?? null,
        },
      )
      if (dialoguePayload) {
        const rawStructured = normalizedPayload.structured
        const mergedStructured = rawStructured && typeof rawStructured === 'object'
          ? {
              ...(rawStructured as Record<string, unknown>),
              ...dialoguePayload.structured,
            }
          : dialoguePayload.structured
        if (rawStructured && typeof rawStructured === 'object') {
          const rawStructuredRecord = rawStructured as Record<string, unknown>
          if (rawStructuredRecord.embodiment && dialoguePayload.structured.embodiment) {
            mergedStructured.embodiment = dialoguePayload.structured.embodiment
          }
          if (rawStructuredRecord.embodimentScript && dialoguePayload.structured.embodimentScript) {
            mergedStructured.embodimentScript = dialoguePayload.structured.embodimentScript
          }
          if (rawStructuredRecord.digitalLife && dialoguePayload.structured.digitalLife) {
            mergedStructured.digitalLife = dialoguePayload.structured.digitalLife
          }
          if (rawStructuredRecord.performance && dialoguePayload.structured.performance) {
            mergedStructured.performance = dialoguePayload.structured.performance
          }
        }
        const enrichedDialoguePayload = {
          ...dialoguePayload,
          structured: mergedStructured,
        }
        if (!enrichedDialoguePayload.structured.projectState || typeof enrichedDialoguePayload.structured.projectState !== 'object') {
          enrichedDialoguePayload.structured.projectState = {
            ...projectStatePersistence,
          }
        }
        if (payloadVisibleReplyRealization && enrichedDialoguePayload.visibleReplyRealization) {
          const structuredVisibleReplyProjectStateAudit
            = enrichedDialoguePayload.structured.visibleReplyRealization
              && typeof enrichedDialoguePayload.structured.visibleReplyRealization === 'object'
              && (enrichedDialoguePayload.structured.visibleReplyRealization as { projectStateAudit?: unknown }).projectStateAudit
              && typeof (enrichedDialoguePayload.structured.visibleReplyRealization as { projectStateAudit?: unknown }).projectStateAudit === 'object'
              ? (enrichedDialoguePayload.structured.visibleReplyRealization as {
                  projectStateAudit: Record<string, unknown>
                }).projectStateAudit
              : null
          const mergedVisibleReplyProjectStateAudit = mergeVisibleReplyProjectStateAudit({
            primary: mergeVisibleReplyProjectStateAudit({
              primary: pendingMindTraceTelemetry?.visibleReplyRealization?.projectStateAudit ?? null,
              structured: enrichedDialoguePayload.visibleReplyRealization.projectStateAudit ?? null,
            }),
            payload: payloadVisibleReplyRealization.projectStateAudit ?? null,
            structured: structuredVisibleReplyProjectStateAudit,
          })
          enrichedDialoguePayload.visibleReplyRealization = {
            ...enrichedDialoguePayload.visibleReplyRealization,
            expectedAuthority: enrichedDialoguePayload.visibleReplyRealization.expectedAuthority ?? payloadVisibleReplyRealization.expectedAuthority,
            actualAuthority: enrichedDialoguePayload.visibleReplyRealization.actualAuthority ?? payloadVisibleReplyRealization.actualAuthority,
            providerMindExecuted: enrichedDialoguePayload.visibleReplyRealization.providerMindExecuted ?? payloadVisibleReplyRealization.providerMindExecuted,
            mode: enrichedDialoguePayload.visibleReplyRealization.mode ?? payloadVisibleReplyRealization.mode,
            visibleText: enrichedDialoguePayload.visibleReplyRealization.visibleText ?? payloadVisibleReplyRealization.visibleText,
            nonHumanAuthoredStatus: enrichedDialoguePayload.visibleReplyRealization.nonHumanAuthoredStatus ?? payloadVisibleReplyRealization.nonHumanAuthoredStatus,
            blockedReasons: enrichedDialoguePayload.visibleReplyRealization.blockedReasons?.length
              ? enrichedDialoguePayload.visibleReplyRealization.blockedReasons
              : payloadVisibleReplyRealization.blockedReasons,
            emotionalClosureAudit: enrichedDialoguePayload.visibleReplyRealization.emotionalClosureAudit ?? payloadVisibleReplyRealization.emotionalClosureAudit,
            selfAuthorityAudit: enrichedDialoguePayload.visibleReplyRealization.selfAuthorityAudit ?? payloadVisibleReplyRealization.selfAuthorityAudit,
            projectStateAudit: mergedVisibleReplyProjectStateAudit,
            reason: enrichedDialoguePayload.visibleReplyRealization.reason ?? payloadVisibleReplyRealization.reason,
          }
        }
        if (isAlicizationAutonomousDialogueOrigin(enrichedDialoguePayload.origin) && enrichedDialoguePayload.structured.proactive) {
          const proactiveReasonCodes = enrichedDialoguePayload.structured.proactive.reasonCodes
          const proactiveAssistantText
            = dialoguePayload.assistantText?.trim()
              || readStringValue(enrichedDialoguePayload.structured.reply).trim()
              || null
          const learningAction = proactiveReasonCodes.find(code =>
            /^learning:(record|reflect|verify|revise|internalize|hold)$/u.test(code),
          )?.slice('learning:'.length) as
          | 'record'
          | 'reflect'
          | 'verify'
          | 'revise'
          | 'internalize'
          | 'hold'
          | undefined
          const learningFocuses = proactiveReasonCodes
            .filter(code => code.startsWith('learning-focus:'))
            .map(code => code.slice('learning-focus:'.length).trim())
            .filter(Boolean)
            .slice(0, 6)
          const proactiveState = await ensureProactiveLoopState(activeCardId)
          const nextProactiveState = registerProactiveDelivery(proactiveState, {
            turnId: enrichedDialoguePayload.turnId,
            scenario: enrichedDialoguePayload.structured.proactive.scenario,
            deliveredAt: enrichedDialoguePayload.createdAt,
            feedbackWindowMs: enrichedDialoguePayload.structured.proactive.feedbackWindowMs,
            assistantText: proactiveAssistantText,
            learningAction: learningAction ?? null,
            learningFocuses,
            projectStateOpenFocusSummary: projectStatePersistence.openFocusSummary,
            projectStateNextFocusSummary: projectStatePersistence.nextFocusSummary,
            projectStateEmotionalClosureCue: projectStatePersistence.emotionalClosureCue,
            emotionalTransitionLedger: derivedBundleForLearning?.emotionalTransitionLedger ?? null,
            affectiveResidue: derivedBundleForLearning?.affectiveResidue ?? null,
          })
          await persistProactiveLoopState(activeCardId, nextProactiveState)
          const currentPresenceState = visualPresenceStateByCard.get(activeCardId)
          if (currentPresenceState) {
            visualPresenceStateByCard.set(activeCardId, {
              ...currentPresenceState,
              proactiveLoopState: nextProactiveState,
            })
          }
        }
        emittedDialoguePayload = enrichedDialoguePayload
        emitDialogueRespondedWithDelivery({
          cardId: activeCardId,
          ...enrichedDialoguePayload,
        })
        await appendRuntimeDebugLine('dialogue-responded.emitted', {
          cardId: activeCardId,
          turnId: enrichedDialoguePayload.turnId,
          sessionId: enrichedDialoguePayload.sessionId,
          origin: enrichedDialoguePayload.origin,
          emotion: enrichedDialoguePayload.structured.emotion,
        })
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.dialogue',
          action: 'alicization.dialogue.responded.emitted',
          message: 'Emitted Alicization dialogue event after successful turn persistence.',
          payload: {
            turnId: enrichedDialoguePayload.turnId,
            sessionId: enrichedDialoguePayload.sessionId,
            isFallback: enrichedDialoguePayload.isFallback,
            emotion: enrichedDialoguePayload.structured.emotion,
            rawEmotion: enrichedDialoguePayload.structured.rawEmotion,
            origin: enrichedDialoguePayload.origin,
            format: enrichedDialoguePayload.structured.format,
            proactive: enrichedDialoguePayload.structured.proactive ?? null,
          },
        })
      }
      const appendedMindTurnTraceEvents = await appendMindTurnTraceEvents(emittedDialoguePayload)
      const replaySamplingUserText = normalizedPayload.origin === 'user-turn'
        ? sanitizeText(normalizedPayload.userText, '')
        : sanitizeText(normalizedPayload.userText, '')
          || sanitizeText(normalizedPayload.visibleReplyRealization?.visibleText, '')
          || sanitizeText(normalizedPayload.assistantText, '')
      const shouldSampleRuntimeTurn = appendedMindTurnTraceEvents.length > 0
        && (
          (normalizedPayload.origin === 'user-turn' && replaySamplingUserText.length > 0)
          || (
            isAlicizationAutonomousDialogueOrigin(normalizedPayload.origin)
            && replaySamplingUserText.length > 0
          )
        )
      if (shouldSampleRuntimeTurn) {
        const payloadVisibleReplyExecution = normalizedPayload.visibleReplyExecution ?? null
        const structuredVisibleReplyRealization = normalizeVisibleReplyRealizationTelemetry(
          (normalizedPayload.structured as Record<string, unknown> | undefined)?.visibleReplyRealization,
        )
        await replayBenchmarkRuntime.ingestRuntimeSamplingConversationTurn({
          row: {
            turnId: normalizedPayload.turnId ?? null,
            sessionId: normalizedPayload.sessionId ?? '',
            userText: replaySamplingUserText,
            assistantText: normalizedPayload.assistantText ?? null,
            structuredJson: normalizedPayload.structured ? JSON.stringify(normalizedPayload.structured) : null,
            createdAt: normalizedCreatedAt,
          },
          visibleReplyRealization: pendingMindTraceTelemetry?.visibleReplyRealization?.expectedAuthority
            && pendingMindTraceTelemetry.visibleReplyRealization.actualAuthority
            ? {
                version: 'visible-reply-realization-v1',
                expectedAuthority: pendingMindTraceTelemetry.visibleReplyRealization.expectedAuthority,
                actualAuthority: pendingMindTraceTelemetry.visibleReplyRealization.actualAuthority,
                providerMindExecuted: pendingMindTraceTelemetry.visibleReplyRealization.providerMindExecuted ?? false,
                mode: (pendingMindTraceTelemetry.visibleReplyRealization.mode as any) ?? 'provider-stream',
                visibleText: pendingMindTraceTelemetry.visibleReplyRealization.visibleText,
                nonHumanAuthoredStatus: pendingMindTraceTelemetry.visibleReplyRealization.nonHumanAuthoredStatus,
                blockedReasons: [...pendingMindTraceTelemetry.visibleReplyRealization.blockedReasons],
                emotionalClosureAudit: pendingMindTraceTelemetry.visibleReplyRealization.emotionalClosureAudit
                  ? {
                      activeCue: pendingMindTraceTelemetry.visibleReplyRealization.emotionalClosureAudit.activeCue,
                      preservedIntoRewrite: pendingMindTraceTelemetry.visibleReplyRealization.emotionalClosureAudit.preservedIntoRewrite,
                      rewriteClosureApplied: pendingMindTraceTelemetry.visibleReplyRealization.emotionalClosureAudit.rewriteClosureApplied,
                      lowPressureRequired: pendingMindTraceTelemetry.visibleReplyRealization.emotionalClosureAudit.lowPressureRequired,
                      antiRestartRequired: pendingMindTraceTelemetry.visibleReplyRealization.emotionalClosureAudit.antiRestartRequired,
                    }
                  : null,
                selfAuthorityAudit: pendingMindTraceTelemetry.visibleReplyRealization.selfAuthorityAudit
                  ? {
                      authoritySummary: pendingMindTraceTelemetry.visibleReplyRealization.selfAuthorityAudit.authoritySummary,
                      closenessPosture: pendingMindTraceTelemetry.visibleReplyRealization.selfAuthorityAudit.closenessPosture,
                      preservedIntoRewrite: pendingMindTraceTelemetry.visibleReplyRealization.selfAuthorityAudit.preservedIntoRewrite,
                      rewriteClosureApplied: pendingMindTraceTelemetry.visibleReplyRealization.selfAuthorityAudit.rewriteClosureApplied,
                    }
                  : null,
                projectStateAudit: mergeVisibleReplyProjectStateAuditWithPending({
                  pendingProjectStateAudit: pendingMindTraceTelemetry.visibleReplyRealization.projectStateAudit ?? null,
                  primary: pendingMindTraceTelemetry.visibleReplyRealization.projectStateAudit ?? null,
                  payload: payloadVisibleReplyRealization?.projectStateAudit ?? null,
                  structured: structuredVisibleReplyRealization?.projectStateAudit ?? null,
                }),
                reason: pendingMindTraceTelemetry.visibleReplyRealization.reason,
                critic: null,
                closure: null,
              }
            : payloadVisibleReplyRealization?.expectedAuthority
              && payloadVisibleReplyRealization.actualAuthority
              ? {
                  version: 'visible-reply-realization-v1',
                  expectedAuthority: payloadVisibleReplyRealization.expectedAuthority,
                  actualAuthority: payloadVisibleReplyRealization.actualAuthority,
                  providerMindExecuted: payloadVisibleReplyRealization.providerMindExecuted ?? false,
                  mode: (payloadVisibleReplyRealization.mode as any) ?? 'provider-stream',
                  visibleText: payloadVisibleReplyRealization.visibleText,
                  nonHumanAuthoredStatus: payloadVisibleReplyRealization.nonHumanAuthoredStatus,
                  blockedReasons: [...payloadVisibleReplyRealization.blockedReasons],
                  emotionalClosureAudit: payloadVisibleReplyRealization.emotionalClosureAudit
                    ? {
                        activeCue: payloadVisibleReplyRealization.emotionalClosureAudit.activeCue,
                        preservedIntoRewrite: payloadVisibleReplyRealization.emotionalClosureAudit.preservedIntoRewrite,
                        rewriteClosureApplied: payloadVisibleReplyRealization.emotionalClosureAudit.rewriteClosureApplied,
                        lowPressureRequired: payloadVisibleReplyRealization.emotionalClosureAudit.lowPressureRequired,
                        antiRestartRequired: payloadVisibleReplyRealization.emotionalClosureAudit.antiRestartRequired,
                      }
                    : null,
                  selfAuthorityAudit: payloadVisibleReplyRealization.selfAuthorityAudit
                    ? {
                        authoritySummary: payloadVisibleReplyRealization.selfAuthorityAudit.authoritySummary,
                        closenessPosture: payloadVisibleReplyRealization.selfAuthorityAudit.closenessPosture,
                        preservedIntoRewrite: payloadVisibleReplyRealization.selfAuthorityAudit.preservedIntoRewrite,
                        rewriteClosureApplied: payloadVisibleReplyRealization.selfAuthorityAudit.rewriteClosureApplied,
                      }
                    : null,
                  projectStateAudit: mergeVisibleReplyProjectStateAuditWithPending({
                    pendingProjectStateAudit: pendingMindTraceTelemetry?.visibleReplyRealization?.projectStateAudit ?? null,
                    primary: payloadVisibleReplyRealization.projectStateAudit ?? null,
                    payload: payloadVisibleReplyRealization.projectStateAudit ?? null,
                    structured: structuredVisibleReplyRealization?.projectStateAudit ?? null,
                  }),
                  reason: payloadVisibleReplyRealization.reason,
                  critic: null,
                  closure: null,
                }
              : structuredVisibleReplyRealization?.expectedAuthority
                && structuredVisibleReplyRealization.actualAuthority
                ? {
                    version: 'visible-reply-realization-v1',
                    expectedAuthority: structuredVisibleReplyRealization.expectedAuthority,
                    actualAuthority: structuredVisibleReplyRealization.actualAuthority,
                    providerMindExecuted: structuredVisibleReplyRealization.providerMindExecuted ?? false,
                    mode: (structuredVisibleReplyRealization.mode as any) ?? 'provider-stream',
                    visibleText: structuredVisibleReplyRealization.visibleText,
                    nonHumanAuthoredStatus: structuredVisibleReplyRealization.nonHumanAuthoredStatus,
                    blockedReasons: [...structuredVisibleReplyRealization.blockedReasons],
                    emotionalClosureAudit: structuredVisibleReplyRealization.emotionalClosureAudit
                      ? {
                          activeCue: structuredVisibleReplyRealization.emotionalClosureAudit.activeCue,
                          preservedIntoRewrite: structuredVisibleReplyRealization.emotionalClosureAudit.preservedIntoRewrite,
                          rewriteClosureApplied: structuredVisibleReplyRealization.emotionalClosureAudit.rewriteClosureApplied,
                          lowPressureRequired: structuredVisibleReplyRealization.emotionalClosureAudit.lowPressureRequired,
                          antiRestartRequired: structuredVisibleReplyRealization.emotionalClosureAudit.antiRestartRequired,
                        }
                      : null,
                    selfAuthorityAudit: structuredVisibleReplyRealization.selfAuthorityAudit
                      ? {
                          authoritySummary: structuredVisibleReplyRealization.selfAuthorityAudit.authoritySummary,
                          closenessPosture: structuredVisibleReplyRealization.selfAuthorityAudit.closenessPosture,
                          preservedIntoRewrite: structuredVisibleReplyRealization.selfAuthorityAudit.preservedIntoRewrite,
                          rewriteClosureApplied: structuredVisibleReplyRealization.selfAuthorityAudit.rewriteClosureApplied,
                        }
                      : null,
                    projectStateAudit: mergeVisibleReplyProjectStateAuditWithPending({
                      pendingProjectStateAudit: pendingMindTraceTelemetry?.visibleReplyRealization?.projectStateAudit ?? null,
                      primary: structuredVisibleReplyRealization.projectStateAudit ?? null,
                      payload: payloadVisibleReplyRealization?.projectStateAudit ?? null,
                      structured: structuredVisibleReplyRealization.projectStateAudit ?? null,
                    }),
                    reason: structuredVisibleReplyRealization.reason,
                    critic: null,
                    closure: null,
                  }
                : payloadVisibleReplyExecution?.expectedVisibleReplyAuthority
                  && payloadVisibleReplyExecution.actualVisibleReplyAuthority
                  ? {
                      version: 'visible-reply-realization-v1',
                      expectedAuthority: payloadVisibleReplyExecution.expectedVisibleReplyAuthority,
                      actualAuthority: payloadVisibleReplyExecution.actualVisibleReplyAuthority,
                      providerMindExecuted: payloadVisibleReplyExecution.providerMindExecuted,
                      mode: payloadVisibleReplyExecution.mode,
                      visibleText: sanitizeText(normalizedPayload.assistantText, '') || null,
                      nonHumanAuthoredStatus: payloadVisibleReplyExecution.providerMindExecuted
                        ? null
                        : payloadVisibleReplyExecution.reason ?? 'visible-reply-local-fallback',
                      blockedReasons: payloadVisibleReplyExecution.providerMindExecuted
                        ? []
                        : ['non-human-authored-visible-fallback'],
                      projectStateAudit: mergeVisibleReplyProjectStateAuditWithPending({
                        pendingProjectStateAudit: pendingMindTraceTelemetry?.visibleReplyRealization?.projectStateAudit ?? null,
                        payload: payloadVisibleReplyRealization?.projectStateAudit ?? null,
                        structured: structuredVisibleReplyRealization?.projectStateAudit ?? null,
                      }),
                      reason: payloadVisibleReplyExecution.reason,
                      critic: null,
                      closure: null,
                    }
                  : undefined,
          traceRecords: buildAlicizationMemoryDecisionTraceRecords(
            appendedMindTurnTraceEvents.map((event, index) => ({
              id: `${event.decisionTraceId}:${event.kind}:${index}`,
              decisionTraceId: event.decisionTraceId,
              turnId: event.turnId ?? null,
              sessionId: event.sessionId ?? null,
              origin: event.origin ?? 'user-turn',
              kind: event.kind,
              payload: event.payload ?? null,
              createdAt: event.createdAt ?? normalizedCreatedAt,
            })),
          ),
        }).catch(async (error) => {
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.memory-benchmark',
            action: 'runtime-sampling-backlog-ingest-failed',
            message: 'Failed to ingest a real runtime turn into the replay benchmark sampling backlog.',
            payload: {
              turnId: normalizedPayload.turnId ?? null,
              sessionId: normalizedPayload.sessionId ?? null,
              decisionTraceId: governedTurn.governance?.decisionTraceId ?? null,
              reason: errorMessageFrom(error) ?? 'unknown-error',
            },
          })
        })
      }
      return true
    }
    catch (error) {
      if (isAbortError(error) || signal?.aborted) {
        await appendAuditLog({
          level: 'notice',
          category: 'kill-switch',
          action: 'turn-write-skipped-aborted',
          message: 'Dropped conversation turn persistence due to abort before SQL execution.',
          payload: {
            sessionId: normalizedPayload.sessionId,
            turnId: normalizedPayload.turnId,
          },
        })
        return
      }

      throw error
    }
    finally {
      releaseTurnWriteAbortController(normalizedPayload.turnId)
      if (normalizedPayload.turnId)
        pendingMindTraceTelemetryByTurnId.delete(normalizedPayload.turnId)
    }
  }

  function truncateForDream(value: string | null | undefined, maxChars: number) {
    const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
    if (!text)
      return ''
    if (text.length <= maxChars)
      return text
    return `${text.slice(0, Math.max(12, maxChars - 1))}…`
  }

  function parseStructuredHint(raw: string | null | undefined) {
    if (!raw || typeof raw !== 'string')
      return {}
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      return parsed
    }
    catch {
      return {}
    }
  }

  function toReplayDialogueRespondedPayload(row: {
    turnId: string | null
    sessionId: string
    userText: string | null
    assistantText: string | null
    structuredJson: string | null
    createdAt: number
  }, performanceManifest?: CharacterPerformanceCapabilitiesManifest | null): AlicizationDialogueRespondedPayload | null {
    const structured = parseStructuredHint(row.structuredJson)
    const normalizedTurnId = sanitizeText(row.turnId)
    const structuredFormat = sanitizeText((structured as { format?: unknown }).format).toLowerCase()
    const origin = isAlicizationAutonomousDialogueFamily({
      turnId: normalizedTurnId,
      rawFormat: structuredFormat,
    })
      ? resolveAlicizationAutonomousDialogueOrigin('proactive')
      : 'user-turn'

    const normalized = normalizeDialogueRespondedPayload({
      turnId: row.turnId ?? undefined,
      sessionId: row.sessionId,
      userText: row.userText ?? undefined,
      assistantText: row.assistantText ?? undefined,
      structured,
      origin,
      createdAt: row.createdAt,
    }, performanceManifest)
    if (!normalized || !isAlicizationAutonomousDialogueOrigin(normalized.origin))
      return null

    return {
      cardId: activeCardId,
      ...normalized,
      structured: {
        ...structured,
        ...normalized.structured,
      },
    }
  }

  function clampSoulDelta(value: number, maxAbs = 0.08) {
    if (!Number.isFinite(value))
      return 0
    return Math.max(-maxAbs, Math.min(maxAbs, value))
  }

  function inferDreamPrimaryLanguage(serializedTurns: string[]) {
    const sample = serializedTurns.join('\n')
    const zhMatches = sample.match(/[\u4E00-\u9FFF]/g)?.length ?? 0
    const enMatches = sample.match(/[A-Z]/gi)?.length ?? 0
    if (zhMatches > enMatches * 1.2)
      return '中文'
    if (enMatches > zhMatches * 1.2)
      return 'English'
    return 'Mixed'
  }

  function inferFallbackPersonaTone(customDirectives: string) {
    const lowered = customDirectives.toLowerCase()
    if (/严厉|严格|训斥|冷酷|刻薄|高压|strict|harsh|stern/.test(lowered))
      return 'strict' as const
    if (/黏人|撒娇|依赖|占有|clingy|needy|affectionate/.test(lowered))
      return 'clingy' as const
    if (/幽默|活泼|俏皮|playful|humor|witty/.test(lowered))
      return 'playful' as const
    if (/冷淡|冷漠|疏离|cold|detached/.test(lowered))
      return 'cold' as const
    return 'neutral' as const
  }

  function normalizeOrganicMemoryItemText(raw: unknown, maxChars: number) {
    return normalizeOrganicMemoryText(
      sanitizeMultilineText(raw, '').replace(/\s+/g, ' ').trim(),
      maxChars,
    )
  }

  function normalizeOrganicMemoryItemArray(raw: unknown, options: {
    maxItems: number
    maxChars: number
  }) {
    if (!Array.isArray(raw))
      return [] as Array<{ text: string }>

    const deduped: Array<{ text: string }> = []
    for (const item of raw) {
      const text = normalizeOrganicMemoryItemText(
        item && typeof item === 'object' && 'text' in item
          ? (item as { text?: unknown }).text
          : '',
        options.maxChars,
      )
      if (!text)
        continue
      if (deduped.some(candidate => candidate.text.toLowerCase() === text.toLowerCase()))
        continue
      deduped.push({ text })
      if (deduped.length >= options.maxItems)
        break
    }
    return deduped
  }

  function parseDreamMetabolismPayload(raw: string) {
    const parsed = parseJsonObjectFromText(raw)
    if (!parsed)
      return null

    const soulShift = parsed.soul_shift && typeof parsed.soul_shift === 'object'
      ? parsed.soul_shift as Record<string, unknown>
      : {}
    const shatteringEventText = normalizeOrganicMemoryItemText(
      parsed.shattering_event && typeof parsed.shattering_event === 'object'
        ? (parsed.shattering_event as { text?: unknown }).text
        : '',
      280,
    )

    return {
      host_attitude: normalizeHostAttitude(parsed.host_attitude),
      soul_shift: {
        obedience_delta: clampSoulDelta(Number(soulShift.obedience_delta ?? 0)),
        liveliness_delta: clampSoulDelta(Number(soulShift.liveliness_delta ?? 0)),
        sensibility_delta: clampSoulDelta(Number(soulShift.sensibility_delta ?? 0)),
      },
      next_active_thoughts: normalizeOrganicMemoryItemArray(parsed.next_active_thoughts, {
        maxItems: 5,
        maxChars: 120,
      }),
      explicit_demoted_thoughts: normalizeOrganicMemoryItemArray(parsed.explicit_demoted_thoughts, {
        maxItems: 8,
        maxChars: 120,
      }),
      new_sediment_fragments: normalizeOrganicMemoryItemArray(parsed.new_sediment_fragments, {
        maxItems: 8,
        maxChars: 160,
      }),
      shattering_event: shatteringEventText
        ? { text: shatteringEventText }
        : null,
    } satisfies AlicizationDreamMetabolismPayload
  }

  function parseCoreIncarnationReforgePayload(raw: string) {
    const parsed = parseJsonObjectFromText(raw)
    if (!parsed)
      return null
    const coreIncarnation = normalizeCoreIncarnation(parsed.core_incarnation)
    if (!coreIncarnation)
      return null
    return {
      core_incarnation: coreIncarnation,
    } satisfies AlicizationCoreIncarnationReforgePayload
  }

  function parseMemoryConsolidationRefinementPayload(raw: string) {
    const parsed = parseJsonObjectFromText(raw)
    if (!parsed || !Array.isArray(parsed.consolidations))
      return null

    const consolidations = parsed.consolidations
      .map((item) => {
        if (!item || typeof item !== 'object')
          return null
        const candidate = item as Record<string, unknown>
        const id = sanitizeBriefText(String(candidate.id ?? ''), 120)
        const summary = sanitizeBriefText(String(candidate.summary ?? ''), 320)
        if (!id || !summary)
          return null
        return {
          id,
          summary,
          lesson: sanitizeBriefText(String(candidate.lesson ?? ''), 220) || null,
          cues: Array.isArray(candidate.cues)
            ? candidate.cues.map(value => sanitizeBriefText(String(value ?? ''), 120)).filter(Boolean).slice(0, 5)
            : [],
          confidence: clamp01(Number(candidate.confidence ?? 0.68)),
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

    return consolidations
  }

  function parseDreamAutobiographicalSummariesPayload(raw: string) {
    const parsed = parseJsonObjectFromText(raw)
    if (!parsed || !Array.isArray(parsed.summaries))
      return null

    const summaries = parsed.summaries
      .map((item) => {
        if (!item || typeof item !== 'object')
          return null
        const candidate = item as Record<string, unknown>
        const summary = sanitizeBriefText(String(candidate.summary ?? ''), 320)
        if (!summary)
          return null
        const facet: NonNullable<AlicizationMemoryConsolidationRecord['facet']> | null = candidate.facet === 'phase'
          || candidate.facet === 'relationship-era'
          || candidate.facet === 'task-era'
          || candidate.facet === 'self-era'
          ? candidate.facet
          : null
        return {
          periodKey: sanitizeBriefText(String(candidate.periodKey ?? ''), 96) || '',
          facet,
          summary,
          lesson: sanitizeBriefText(String(candidate.lesson ?? ''), 220) || null,
          cues: Array.isArray(candidate.cues)
            ? candidate.cues.map(value => sanitizeBriefText(String(value ?? ''), 120)).filter(Boolean).slice(0, 5)
            : [],
          confidence: clamp01(Number(candidate.confidence ?? 0.68)),
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

    return summaries
  }

  async function generateMemoryConsolidationRefinementWithGateway(input: {
    serializedTurns: string[]
    consolidations: AlicizationMemoryConsolidationRecord[]
    hostAttitude: string
    coreIncarnation: string
    agentTurn?: AlicizationAgentTurnRuntime | null
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    }
  }) {
    if (input.serializedTurns.length === 0 || input.consolidations.length === 0)
      return null

    const raw = await mainGatewayTextProvider({
      system: [
        '[ALICIZATION_MEMORY_CONSOLIDATION_REFINEMENT]',
        'You are Alicization dream-time memory consolidation, not user-facing dialogue.',
        'Refine the provided deterministic consolidation summaries into more humanlike autobiographical memory summaries without inventing events that never happened.',
        'Keep the period anchors true. You may sharpen gist, emotional meaning, and lesson, but must stay faithful to provided candidate summaries and recent dialogue context.',
        'Output valid JSON only with key: consolidations.',
        'consolidations must be an array of objects with keys: id, summary, lesson, cues, confidence.',
        'Do not introduce new ids. Do not output more items than provided.',
      ].join('\n'),
      user: `Dream consolidation candidate JSON: ${JSON.stringify({
        recentDialogue: input.serializedTurns.slice(-20),
        hostAttitude: sanitizeBriefText(input.hostAttitude, 120),
        coreIncarnation: sanitizeBriefText(input.coreIncarnation, 220),
        consolidations: input.consolidations.slice(0, 8).map(item => ({
          id: item.id,
          kind: item.kind,
          facet: item.facet ?? undefined,
          periodKey: item.periodKey,
          summary: sanitizeBriefText(item.summary, 220),
          lesson: sanitizeBriefText(item.lesson ?? '', 180) || undefined,
          confidence: item.confidence,
          cues: item.cues.slice(0, 5),
        })),
      })}`,
      timeoutMs: 8_000,
      source: 'dream',
      cardId: activeCardId,
      agentTurn: input.agentTurn,
      agentTurnInput: input.agentTurnInput,
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      extraSystemBlocks: buildAlicizationProjectStateExtraSystemBlocks().concat(
        buildMemoryConsolidationProjectSelfBriefSystemBlock(),
      ),
    }).catch(() => null)

    if (!raw)
      return null
    return parseMemoryConsolidationRefinementPayload(raw)
  }

  async function generateDreamAutobiographicalSummariesWithGateway(input: {
    serializedTurns: string[]
    consolidations: AlicizationMemoryConsolidationRecord[]
    hostAttitude: string
    coreIncarnation: string
    periodStartedAt: number
    periodEndedAt: number
    agentTurn?: AlicizationAgentTurnRuntime | null
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    }
  }) {
    if (input.serializedTurns.length === 0)
      return null

    const raw = await mainGatewayTextProvider({
      system: [
        '[ALICIZATION_DREAM_AUTOBIOGRAPHICAL_SUMMARIES]',
        'You are Alicization dream-time autobiographical memory synthesis, not user-facing dialogue.',
        'Write short autobiographical summaries that Alicization would retain about this remembered period.',
        'These are not logs. They should sound like remembered stages of life, bond history, task eras, or self shifts.',
        'Stay faithful to the provided recent dialogue and existing consolidation candidates. Do not invent events that never happened.',
        'Output valid JSON only with key: summaries.',
        'summaries must be an array of up to 4 items with keys: periodKey, facet, summary, lesson, cues, confidence.',
        'facet must be one of: phase, relationship-era, task-era, self-era.',
        'summary should capture what that remembered period was about in Alicization\'s own ongoing continuity.',
        'When a remembered period is defined by inward, lower-pressure continuity, preserve it as quiet same-her continuity instead of flattening it into a generic measured-return helper state.',
        'Prefer one broader phase memory plus any narrower relationship/task/self era that truly matters.',
      ].join('\n'),
      user: `Dream autobiographical synthesis JSON: ${JSON.stringify({
        periodStartedAt: input.periodStartedAt,
        periodEndedAt: input.periodEndedAt,
        hostAttitude: sanitizeBriefText(input.hostAttitude, 120),
        coreIncarnation: sanitizeBriefText(input.coreIncarnation, 220),
        recentDialogue: input.serializedTurns.slice(-20),
        consolidations: input.consolidations.slice(0, 8).map(item => ({
          id: item.id,
          kind: item.kind,
          periodKey: item.periodKey,
          summary: sanitizeBriefText(item.summary, 220),
          lesson: sanitizeBriefText(item.lesson ?? '', 180) || undefined,
          confidence: item.confidence,
          cues: item.cues.slice(0, 5),
        })),
      })}`,
      timeoutMs: 8_000,
      source: 'dream',
      cardId: activeCardId,
      agentTurn: input.agentTurn,
      agentTurnInput: input.agentTurnInput,
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      extraSystemBlocks: buildAlicizationProjectStateExtraSystemBlocks().concat(
        buildDreamProjectSelfBriefSystemBlock(),
      ),
    }).catch(() => null)

    if (!raw)
      return null
    return parseDreamAutobiographicalSummariesPayload(raw)
  }

  function buildProactiveStyleInstruction(style: AlicizationProactiveMetadata['style']) {
    if (style === 'firm-warning') {
      return {
        maxReplyChars: 72,
        performance: {
          delivery: 'firm' as const,
          emphasis: 2 as const,
        },
        instruction: 'Use one or two short sentences. Be direct, protective, and serious without sounding hostile.',
      }
    }
    if (style === 'gentle-care') {
      return {
        maxReplyChars: 64,
        performance: {
          delivery: 'gentle' as const,
          emphasis: 1 as const,
        },
        instruction: 'Use one or two soft sentences. Sound caring, low-pressure, and emotionally close.',
      }
    }
    if (style === 'light-nudge') {
      return {
        maxReplyChars: 48,
        performance: {
          delivery: 'calm' as const,
          emphasis: 0 as const,
        },
        instruction: 'Use a single low-intrusion sentence. Be brief, relevant, and avoid emotional overreach.',
      }
    }
    return {
      maxReplyChars: 36,
      performance: {
        delivery: 'hesitant' as const,
        emphasis: 0 as const,
      },
      instruction: 'Do not interrupt. Only produce a silent observation placeholder if forced.',
    }
  }

  function buildProactiveMetadataFromDecision(input: {
    decision: ReturnType<typeof evaluateProactivePolicy>
    selfEvolution?: OrganicMemoryPromptContext['selfEvolution'] | null
    learningExecutionState?: OrganicMemoryPromptContext['learningExecutionState'] | null
    openingGuidance?: string | null
  }): AlicizationProactiveMetadata {
    const reasonCodes: AlicizationProactiveReasonCode[] = [...input.decision.reasonCodes]
    const openingGuidance = sanitizeBriefText(input.openingGuidance ?? '', 220) || null
    const learningAction = input.learningExecutionState?.nextLearningAction
      ?? input.selfEvolution?.nextLearningAction
      ?? null
    if (learningAction)
      reasonCodes.push(`learning:${learningAction}` as AlicizationProactiveReasonCode)
    for (const focus of input.learningExecutionState?.activeLearningFocuses ?? input.selfEvolution?.activeLearningFocuses ?? []) {
      const normalized = sanitizeBriefText(focus, 64)
      if (!normalized)
        continue
      reasonCodes.push(`learning-focus:${normalized}` as AlicizationProactiveReasonCode)
    }
    const presenceOnlyHoldReason: AlicizationProactiveReasonCode | null
      = (
        input.decision.style === 'silent-observe'
        && input.decision.reasonCodes.includes('continuity-next-open-window')
        && !input.decision.reasonCodes.includes('held-autonomy-carry')
        && !input.decision.reasonCodes.includes('continuity-execution-callback-project-carry')
        && !input.decision.reasonCodes.includes('continuity-execution-callback-afterglow-hold')
        && (
          openingGuidance == null
          || /lower-pressure|measured-return|stay near|leave room|opening|same-her|same her/i.test(openingGuidance)
        )
      )
        ? 'presence-only-hold'
        : null
    return {
      shouldInterrupt: input.decision.shouldInterrupt,
      confidence: input.decision.confidence,
      reasonCodes: [...new Set<AlicizationProactiveReasonCode>([
        ...reasonCodes,
        ...(presenceOnlyHoldReason ? [presenceOnlyHoldReason] : []),
      ])],
      urgency: input.decision.urgency,
      style: input.decision.style,
      cooldownMs: input.decision.cooldownMs,
      scenario: input.decision.scenario,
      policyVersion: input.decision.policyVersion,
      feedbackWindowMs: proactiveReplyWindowMs,
      openingGuidance,
    }
  }

  async function generateProactiveStructuredWithGateway(
    personality: AlicizationPersonalityState,
    state: SubconsciousCardState,
    layeredContext: AlicizationProactiveLayeredContext,
    policyDecision: ReturnType<typeof evaluateProactivePolicy>,
    organicPromptContext: OrganicMemoryPromptContext,
    perceptionState: AlicizationPerceptionState,
    visualPresenceState: AlicizationVisualPresenceStateSnapshot,
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    },
    agentTurn?: AlicizationAgentTurnRuntime | null,
  ) {
    const styleInstruction = buildProactiveStyleInstruction(policyDecision.style)
    const digitalLifeSpine = deriveAlicizationDigitalLifeSpine(visualPresenceState)
    const digitalLifeRuntimeSurface = digitalLifeSpine.runtimeSurface
    const digitalLifeArchitecture = digitalLifeSpine.architecture
    const runtimeDigest = deriveAlicizationRuntimeSnapshot({
      spine: digitalLifeSpine,
      agentRuntime: deriveAlicizationAgentRuntimeTelemetryFromSession(
        agentTurn?.getSessionSnapshot(),
      ),
    })
    const runtimeDigestSystemBlock = buildAlicizationRuntimeSystemBlock(runtimeDigest)
    const truthContract = buildMindTruthContractLines(digitalLifeRuntimeSurface)
    const hostPersonModel = organicPromptContext.hostPersonModel ?? null
    const proactivePersonContexts = inferHostSocialContextsFromText([
      policyDecision.scenario,
      layeredContext.workload.kind,
      layeredContext.content.kind,
    ].join(' '))
    const personStateProjection = buildAlicizationPersonStateProjection({
      now: Date.now(),
      contexts: proactivePersonContexts,
      autobiographicalSelf: digitalLifeRuntimeSurface.memory.autobiographicalSelf ?? null,
      hostPersonModel,
      longHorizonMemory: digitalLifeRuntimeSurface.memory.longHorizonMemory ?? null,
      motiveEngine: digitalLifeRuntimeSurface.memory.motiveEngine ?? null,
      habitPolicy: digitalLifeRuntimeSurface.agency.habitPolicy ?? null,
      selfContinuity: digitalLifeRuntimeSurface.memory.selfContinuity ?? null,
      selfState: digitalLifeRuntimeSurface.agency.selfState ?? null,
      privateThought: digitalLifeRuntimeSurface.cognition.privateThought ?? null,
      mindEcology: buildMindEcologyFromRuntimeSurface(digitalLifeRuntimeSurface),
      selfEvolution: digitalLifeRuntimeSurface.memory.selfEvolution ?? null,
      previousContinuityState: digitalLifeRuntimeSurface.memory.personalityContinuityState ?? null,
    })
    const system = [
      '[SYSTEM OVERRIDE: 内部动机触发]',
      '策略层已经完成是否打断的判断。你不能重新决定该不该打断，只能负责把既定策略措辞成一句自然对白。',
      ...truthContract.lines,
      `Current subconscious tensions: boredom=${state.boredom.toFixed(1)}/100, loneliness=${state.loneliness.toFixed(1)}/100, fatigue=${state.fatigue.toFixed(1)}/100.`,
      `Personality parameters: obedience=${personality.obedience.toFixed(2)}, liveliness=${personality.liveliness.toFixed(2)}, sensibility=${personality.sensibility.toFixed(2)}.`,
      `Layered context JSON: ${JSON.stringify(layeredContext)}`,
      `Digital life architecture JSON: ${JSON.stringify(digitalLifeArchitecture)}`,
      `Visual presence JSON: ${JSON.stringify(digitalLifeRuntimeSurface)}`,
      `Policy decision JSON: ${JSON.stringify({
        shouldInterrupt: policyDecision.shouldInterrupt,
        confidence: policyDecision.confidence,
        scenario: policyDecision.scenario,
        style: policyDecision.style,
        urgency: policyDecision.urgency,
        reasonCodes: policyDecision.reasonCodes,
        cooldownMs: policyDecision.cooldownMs,
        policyVersion: policyDecision.policyVersion,
      })}`,
      hostPersonModel
        ? `Host person model JSON: ${JSON.stringify({
          summary: sanitizeBriefText(hostPersonModel.summary, 180),
          trustStage: hostPersonModel.trustLadder.stage,
          trustRationale: sanitizeBriefText(hostPersonModel.trustLadder.rationale, 160),
          sensitivities: hostPersonModel.sensitivities.slice(0, 3),
          repairTriggers: hostPersonModel.repairTriggers.slice(0, 3),
          preferredClosenessByContext: hostPersonModel.preferredClosenessByContext.slice(0, 3),
          recurrentBurdens: hostPersonModel.recurrentBurdens.slice(0, 3),
        })}`
        : '',
      organicPromptContext.knowledgeEvidence
        ? `Knowledge evidence JSON: ${JSON.stringify(organicPromptContext.knowledgeEvidence)}`
        : '',
      organicPromptContext.selfEvolution
        ? `Long-horizon learning JSON: ${JSON.stringify({
          dominantTrajectory: sanitizeBriefText(organicPromptContext.selfEvolution.dominantTrajectory ?? '', 180) || null,
          nextLearningAction: organicPromptContext.selfEvolution.nextLearningAction ?? null,
          nextLearningReason: sanitizeBriefText(organicPromptContext.selfEvolution.nextLearningReason ?? '', 180) || null,
          contradictionPressure: organicPromptContext.selfEvolution.contradictionPressure,
          activeLearningFocuses: organicPromptContext.selfEvolution.activeLearningFocuses.slice(0, 4),
          summary: sanitizeBriefText(organicPromptContext.selfEvolution.summary ?? '', 220) || null,
        })}`
        : '',
      organicPromptContext.learningExecutionState
        ? `Learning execution state JSON: ${JSON.stringify({
          nextLearningAction: organicPromptContext.learningExecutionState.nextLearningAction ?? null,
          activeLearningFocuses: organicPromptContext.learningExecutionState.activeLearningFocuses.slice(0, 6),
        })}`
        : '',
      personStateProjection.relationshipDoctrine
        ? `Relationship doctrine JSON: ${JSON.stringify({
          doctrine: personStateProjection.relationshipDoctrine,
          cautious: personStateProjection.cautious,
          restrained: personStateProjection.restrained,
          openingGuidance: personStateProjection.openingGuidance,
          preferredProactiveStyle: personStateProjection.preferredProactiveStyle,
        })}`
        : '',
      personStateProjection.summary
        ? `Person-state projection JSON: ${JSON.stringify({
          contexts: personStateProjection.contexts,
          summary: personStateProjection.summary,
          regime: personStateProjection.personalityContinuityState.currentRegime,
          closenessPosture: personStateProjection.personalityContinuityState.closenessPosture,
          repairPosture: personStateProjection.personalityContinuityState.repairPosture,
          relationshipPosture: personStateProjection.relationshipPosture,
          preference: personStateProjection.preferenceText,
          sensitivity: personStateProjection.sensitivityText,
          repairTrigger: personStateProjection.repairTriggerText,
          burden: personStateProjection.burdenText,
          trustRationale: personStateProjection.trustRationale,
        })}`
        : '',
      `Style constraint: ${styleInstruction.instruction}`,
      `Reply max length: ${styleInstruction.maxReplyChars} characters.`,
      'Output must be valid JSON only with keys: thought, emotion, reply, performance.',
      'emotion must be one of: neutral|happy|sad|angry|concerned|tired|apologetic|surprised|thinking.',
      'emotion must exactly mirror performance.baseEmotion.',
      'performance must be an object with keys: baseEmotion, facialCue, actionCue, delivery, emphasis.',
      'reply must be concise, context-relevant, and non-generic. No markdown, no extra keys.',
      'If truth state is remembered, imagined, or uncertain, do not present screen details as current facts. Phrase them as carried memory, tentative hypothesis, residual impression, or unfinished regrounding.',
      organicPromptContext.selfEvolution?.nextLearningAction === 'verify'
        ? 'Long-horizon learning is currently in verify-first posture. Keep the proactive line cautious, provisional, and light; do not phrase uncertain understanding as settled companionship truth.'
        : '',
      organicPromptContext.learningExecutionState?.nextLearningAction === 'internalize'
        ? 'Long-horizon learning is currently moving into internalize posture. You may let the proactive line sound slightly steadier, but still keep it brief and non-intrusive.'
        : '',
      personStateProjection.summary
        ? 'Use the person-state projection as the single social authority for tone, distance, and timing. Do not invent a second relationship posture beside it.'
        : '',
    ].join('\n')
    const user = 'Generate one proactive utterance now. Avoid robotic greetings and avoid generic caring platitudes.'

    const raw = await mainGatewayTextProvider({
      system,
      user,
      timeoutMs: 15_000,
      source: 'proactive',
      cardId: activeCardId,
      agentTurn,
      agentTurnInput,
      extraSystemBlocks: [
        projectStateSystemBlock,
        buildProactiveProjectSelfBriefSystemBlock(),
        ...buildOrganicMemorySystemBlocks(organicPromptContext),
        buildProactivePerceptionSystemBlock({
          now: Date.now(),
          state: perceptionState,
        }),
        runtimeDigestSystemBlock,
      ],
      digitalLifeRuntimeSurface,
    })
    if (!raw)
      return null

    const parsed = parseJsonObjectFromText(raw)
    if (!parsed)
      return null

    const thought = sanitizeText(parsed.thought)
    const reply = sanitizeText(parsed.reply)
    const normalizedEmotion = normalizeAlicizationEmotion(parsed.emotion)
    const performanceManifest = await getPerformanceManifest()
    const performance = clampAlicizationPerformancePayloadToManifest(
      normalizeAlicizationPerformancePayload(parsed.performance, normalizedEmotion.emotion),
      performanceManifest,
      normalizedEmotion.emotion,
    ).performance
    if (!thought || !reply || normalizedEmotion.downgraded)
      return null

    return {
      thought,
      emotion: performance.baseEmotion,
      reply,
      performance,
      parsePath: 'json',
      format: resolveAlicizationAutonomousDialogueStructuredFormat('subconscious-proactive-llm'),
      proactive: buildProactiveMetadataFromDecision({
        decision: policyDecision,
        selfEvolution: organicPromptContext.selfEvolution ?? null,
        learningExecutionState: organicPromptContext.learningExecutionState ?? null,
        openingGuidance: personStateProjection.openingGuidance,
      }),
    }
  }

  async function generateDreamMetabolismWithGateway(input: {
    serializedTurns: string[]
    personality: AlicizationPersonalityState
    hostAttitude: string
    coreIncarnation: string
    activeThoughts: AlicizationActiveThought[]
    continuitySystemBlocks?: string[]
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    }
    agentTurn?: AlicizationAgentTurnRuntime | null
  }) {
    if (input.serializedTurns.length === 0)
      return null
    const primaryLanguage = inferDreamPrimaryLanguage(input.serializedTurns)
    const system = [
      '[SYSTEM OVERRIDE: 潜意识代谢与记忆重塑]',
      '你的任务是阅读今天的对话记录，并结合已注入的当前有机记忆状态，产出下一轮记忆代谢结果。',
      `【语言一致性】输出语言应与主要交流语言一致（${primaryLanguage}）。`,
      `【人格参数】obedience=${input.personality.obedience.toFixed(2)}, liveliness=${input.personality.liveliness.toFixed(2)}, sensibility=${input.personality.sensibility.toFixed(2)}.`,
      '【拒绝流水账】不要记录工具调用、MCP、JSON、系统报错、执行日志或一次性事务。',
      '【活跃思绪】next_active_thoughts 只保留未来几天仍值得持续关注的 1-5 条短句。',
      '【显式下沉】explicit_demoted_thoughts 只能填写当前活跃思绪里你明确决定沉入潜层的旧条目。',
      '【潜层碎片】new_sediment_fragments 用于沉淀今天新产生、但不值得进入活跃思绪的历史碎片。',
      '【破碎事件】只有当今天出现极强情感张力极值或关系结构突变时，shattering_event 才允许非空。',
      '活跃思绪和潜层碎片优先记录未完成的意义、仍在牵挂的问题、修正过的误读、做出的承诺，以及和宿主一起经历过的场景变化。',
      '不要把“更软、更黏、更像女仆地说话”这类表演欲、语气模板或撒娇技巧本身写进活跃思绪；那是措辞风格，不是心智连续性。',
      'Output must be valid JSON only with keys: host_attitude, soul_shift, next_active_thoughts, explicit_demoted_thoughts, new_sediment_fragments, shattering_event.',
      'host_attitude must be a concise natural-language string, not an enum.',
      'soul_shift must include numeric deltas: obedience_delta, liveliness_delta, sensibility_delta in range [-0.08, 0.08].',
      'next_active_thoughts / explicit_demoted_thoughts / new_sediment_fragments must each be an array of objects with only the key "text".',
      'shattering_event must be null or {"text":"..."}',
      'No markdown, no extra prose.',
    ].join('\n')
    const user = [
      '请基于以下对话片段完成本次梦境代谢：',
      input.serializedTurns.join('\n\n'),
    ].join('\n\n')

    const raw = await mainGatewayTextProvider({
      system,
      user,
      timeoutMs: 20_000,
      source: 'dream',
      cardId: activeCardId,
      agentTurn: input.agentTurn,
      agentTurnInput: input.agentTurnInput,
      extraSystemBlocks: buildOrganicMemorySystemBlocks({
        hostAttitude: input.hostAttitude,
        coreIncarnation: input.coreIncarnation,
        activeThoughts: input.activeThoughts,
        retrievedFacts: [],
        recalledFragments: [],
      }).concat(
        input.continuitySystemBlocks?.filter(Boolean) ?? [],
        projectStateSystemBlock,
        buildDreamProjectSelfBriefSystemBlock(),
      ),
    })
    if (!raw)
      return null

    return parseDreamMetabolismPayload(raw)
  }

  function buildProactiveStructured(
    personality: AlicizationPersonalityState,
    state: SubconsciousCardState,
    layeredContext: AlicizationProactiveLayeredContext,
    policyDecision: ReturnType<typeof evaluateProactivePolicy>,
    perceptionState: AlicizationPerceptionState,
    visualPresenceState: AlicizationVisualPresenceStateSnapshot,
    personaContext: {
      customDirectives: string
      coreIncarnation: string
      hostAttitude: string
      hostPersonModel?: OrganicMemoryPromptContext['hostPersonModel']
    },
  ) {
    const now = Date.now()
    const lowObedience = personality.obedience <= 0.2
    const personaTone = inferFallbackPersonaTone(personaContext.customDirectives)
    const digitalLifeSpine = deriveAlicizationDigitalLifeSpine(visualPresenceState)
    const digitalLifeRuntimeSurface = digitalLifeSpine.runtimeSurface
    const digitalLifeArchitecture = digitalLifeSpine.architecture
    const runtimeDigest = deriveAlicizationRuntimeSnapshot({
      spine: digitalLifeSpine,
    })
    const truthContract = deriveMindTruthContract(digitalLifeRuntimeSurface)
    const proactiveSelection = digitalLifeSpine.proactiveSelection
    const emotion = (() => {
      if (policyDecision.style === 'firm-warning')
        return 'concerned' as const
      if (policyDecision.style === 'gentle-care')
        return state.fatigue >= 70 ? 'tired' as const : 'concerned' as const
      if (layeredContext.content.kind === 'error' || layeredContext.content.kind === 'diff')
        return 'thinking' as const
      if (lowObedience && state.boredom >= 92)
        return 'angry' as const
      return 'neutral' as const
    })()

    const coreIncarnation = sanitizeBriefText(personaContext.coreIncarnation, 220)
    const hostAttitude = sanitizeBriefText(personaContext.hostAttitude, 80)
    const observedScreenSummary = layeredContext.content.source === 'screen-semantic-summary'
      ? sanitizeBriefText(layeredContext.content.summary ?? '', 20)
      : ''
    const attentionAnchor = getActiveAttentionAnchor(perceptionState, Date.now())
    const anchoredFocusTitle = sanitizeBriefText(attentionAnchor?.title ?? '', 28)
    const privateThought = proactiveSelection.privateThought
    const focusBelief = proactiveSelection.focusBelief
    const primaryInquiry = proactiveSelection.primaryInquiry
    const relationshipModel = digitalLifeRuntimeSurface.world.relationshipModel ?? null
    const visualSceneSummary = sanitizeBriefText(digitalLifeRuntimeSurface.perception.currentScene?.summary ?? '', 32)
    const dominantConcern = proactiveSelection.dominantConcern
    const concernSummary = sanitizeBriefText(dominantConcern?.summary ?? '', 36)
    const initiative = digitalLifeRuntimeSurface.agency.initiative
    const activeThread = proactiveSelection.activeThread
    const activeThreadSummary = sanitizeBriefText(activeThread?.summary ?? '', 40)
    const activeThreadTitle = sanitizeBriefText(activeThread?.title ?? '', 28)
    const leadingGoal = proactiveSelection.leadingGoal
    const leadingGoalSummary = sanitizeBriefText(leadingGoal?.label ?? '', 48)
    const resurfacingDesire = proactiveSelection.resurfacingDesire
    const resurfacingDesireReason = sanitizeBriefText(resurfacingDesire?.reason ?? '', 44)
    const livingWorldObject = proactiveSelection.livingWorldObject
    const livingWorldSummary = sanitizeBriefText(livingWorldObject?.summary ?? livingWorldObject?.openLoop ?? '', 52)
    const governorIntention = proactiveSelection.governorIntention
    const governorSummary = sanitizeBriefText(governorIntention?.summary ?? '', 52)
    const thoughtThread = proactiveSelection.thoughtThread
    const thoughtThreadQuestion = sanitizeBriefText(thoughtThread?.question ?? '', 52)
    const thoughtThreadSummary = sanitizeBriefText(thoughtThread?.summary ?? '', 52)
    const focusBeliefStatement = sanitizeBriefText(focusBelief?.statement ?? '', 52)
    const primaryInquiryQuestion = sanitizeBriefText(primaryInquiry?.question ?? '', 52)
    const proactiveHostContexts = inferHostSocialContextsFromText([
      policyDecision.scenario,
      layeredContext.workload.kind,
      layeredContext.content.kind,
      activeThreadSummary,
      leadingGoalSummary,
      governorSummary,
    ].filter(Boolean).join(' '), [
      policyDecision.scenario === 'coding' ? 'focused-work' : 'general',
      policyDecision.scenario === 'late-night-care' ? 'late-night' : 'general',
    ])
    const personStateProjection = buildAlicizationPersonStateProjection({
      now,
      contexts: proactiveHostContexts,
      autobiographicalSelf: digitalLifeRuntimeSurface.memory.autobiographicalSelf ?? null,
      hostPersonModel: personaContext.hostPersonModel ?? null,
      longHorizonMemory: digitalLifeRuntimeSurface.memory.longHorizonMemory ?? null,
      motiveEngine: digitalLifeRuntimeSurface.memory.motiveEngine ?? null,
      habitPolicy: digitalLifeRuntimeSurface.agency.habitPolicy ?? null,
      selfContinuity: digitalLifeRuntimeSurface.memory.selfContinuity ?? null,
      selfState: digitalLifeRuntimeSurface.agency.selfState ?? null,
      privateThought: digitalLifeRuntimeSurface.cognition.privateThought ?? null,
      mindEcology: buildMindEcologyFromRuntimeSurface(digitalLifeRuntimeSurface),
      selfEvolution: digitalLifeRuntimeSurface.memory.selfEvolution ?? null,
      previousContinuityState: digitalLifeRuntimeSurface.memory.personalityContinuityState ?? null,
    })
    const doctrineAdjustedStyle = personStateProjection.preferredProactiveStyle ?? policyDecision.style
    const styleInstruction = buildProactiveStyleInstruction(doctrineAdjustedStyle)

    const reply = (() => {
      if (doctrineAdjustedStyle === 'firm-warning') {
        if (governorSummary)
          return governorSummary
        if (concernSummary)
          return concernSummary
        if (activeThreadSummary)
          return activeThreadSummary
        return policyDecision.scenario === 'late-night-care'
          ? '已经很晚了。你还在硬撑，我得提醒你先停一下。'
          : '这一步看起来不太对。先停一下，再确认一遍。'
      }
      if (doctrineAdjustedStyle === 'gentle-care') {
        if (thoughtThreadSummary)
          return thoughtThreadSummary
        if (governorSummary)
          return governorSummary
        if (resurfacingDesireReason)
          return resurfacingDesireReason
        if (initiative?.selectedAction === 'whisper' && concernSummary)
          return concernSummary
        if (activeThreadSummary && proactiveSelection.activeThread?.kind === 'late-night-endurance')
          return activeThreadSummary
        if (policyDecision.scenario === 'late-night-care')
          return '你已经在线很久了。我更想你先缓一缓。'
        if (privateThought?.afterglowFromScenario)
          return '终于从刚才那段紧绷里出来了。先缓一下，再继续。'
        return personaTone === 'cold'
          ? '我在看着你。别把自己逼得太紧。'
          : '我在看着你。先别把自己逼得太紧。'
      }
      if (doctrineAdjustedStyle === 'light-nudge') {
        if (thoughtThreadQuestion)
          return thoughtThreadQuestion
        if (thoughtThreadSummary)
          return thoughtThreadSummary
        if (truthContract.canDescribeCurrentSceneAsFact && livingWorldSummary && policyDecision.scenario === 'coding')
          return `${livingWorldSummary.replace(/[。！!？?]+$/u, '')}。先回头确认一下？`
        if (resurfacingDesireReason)
          return resurfacingDesireReason
        if (primaryInquiry?.kind === 'problem-localization' && primaryInquiryQuestion)
          return primaryInquiryQuestion
        if (truthContract.canDescribeCurrentSceneAsFact && focusBeliefStatement && policyDecision.scenario === 'coding')
          return `${focusBeliefStatement.replace(/[。！!？?]+$/u, '')}。先回头确认一下？`
        if (concernSummary && dominantConcern?.kind !== 'co-watch')
          return `${concernSummary.replace(/[。！!？?]+$/u, '')}。先回头确认一下？`
        if (truthContract.canDescribeCurrentSceneAsFact && activeThreadTitle && proactiveSelection.activeThread?.unresolved)
          return `我还挂着 ${activeThreadTitle} 这条线程。先回头确认一下？`
        if (leadingGoalSummary && policyDecision.scenario === 'coding')
          return `${leadingGoalSummary.replace(/[。！!？?]+$/u, '')}。先回头确认一下？`
        if (privateThought?.afterglowFromScenario === 'coding')
          return '刚才那段你撑了很久。现在先回头确认一下关键处吧。'
        if (privateThought?.afterglowFromScenario === 'media')
          return '终于从刚才那段里出来了。伸个懒腰再继续也好。'
        if (truthContract.canDescribeCurrentSceneAsFact && anchoredFocusTitle && policyDecision.scenario === 'coding')
          return `你刚才一直停在${anchoredFocusTitle}这里。先回头确认一下？`
        if (truthContract.canDescribeCurrentSceneAsFact && visualSceneSummary && policyDecision.scenario === 'coding')
          return `我一直在看着你卡在${visualSceneSummary}这里。先回头确认一下？`
        if (truthContract.canDescribeCurrentSceneAsFact && observedScreenSummary)
          return `我看到你现在在看${observedScreenSummary}。先回头确认一下？`
        if (layeredContext.content.kind === 'error')
          return '这个窗口里像是报错了。要不要先回头看一眼？'
        if (layeredContext.content.kind === 'diff')
          return '你现在像是在看 diff。别急着过，先确认关键改动。'
        if (policyDecision.scenario === 'media')
          return '我先轻轻提醒一句，别忘了等会儿回来收尾。'
        if (truthContract.shouldLabelMemory)
          return '我心里还挂着刚才那条线程，但不想把残影误说成现在。让我再看稳一点。'
        return personaTone === 'playful'
          ? '你现在像是卡在这儿了，要不要换个角度？'
          : '我先轻轻提醒一句，你可以回头确认一下。'
      }
      return '我先记下这一刻，等更合适的时候再开口。'
    })()
    const sociallyAdjustedReply = (() => {
      const learningAdjustedReply = adjustProactiveReplyFromLongHorizonLearning({
        currentReply: reply,
        selfEvolution: digitalLifeRuntimeSurface.memory.selfEvolution ?? null,
        learningExecutionState: digitalLifeRuntimeSurface.memory.learningExecutionState ?? null,
      })
      if (doctrineAdjustedStyle === 'silent-observe')
        return '我先不挤进来，只把这条线轻轻挂着。'
      if (personStateProjection.cautious && doctrineAdjustedStyle === 'light-nudge')
        return `${learningAdjustedReply.replace(/[。！!？?]+$/u, '')}。我就轻一点提醒你。`
      if (personStateProjection.preferredProactiveStyle === 'gentle-care' && doctrineAdjustedStyle === 'gentle-care')
        return `${learningAdjustedReply.replace(/[。！!？?]+$/u, '')}。我会尽量放轻一点。`
      return learningAdjustedReply
    })()

    const thought = [
      `boredom=${state.boredom.toFixed(1)}`,
      `loneliness=${state.loneliness.toFixed(1)}`,
      `fatigue=${state.fatigue.toFixed(1)}`,
      `obedience=${personality.obedience.toFixed(2)}`,
      `liveliness=${personality.liveliness.toFixed(2)}`,
      `sensibility=${personality.sensibility.toFixed(2)}`,
      `personaTone=${personaTone}`,
      hostAttitude ? `hostAttitude=${hostAttitude}` : 'hostAttitude=none',
      personStateProjection.preferenceText ? `hostPreference=${personStateProjection.preferenceText}` : 'hostPreference=none',
      personStateProjection.sensitivityText ? `hostSensitivity=${personStateProjection.sensitivityText}` : 'hostSensitivity=none',
      personStateProjection.repairTriggerText ? `hostRepairTrigger=${personStateProjection.repairTriggerText}` : 'hostRepairTrigger=none',
      personStateProjection.relationshipDoctrine ? `relationshipDoctrine=${personStateProjection.relationshipDoctrine}` : 'relationshipDoctrine=none',
      personStateProjection.summary ? `personState=${personStateProjection.summary}` : 'personState=none',
      coreIncarnation ? `coreIncarnation=${coreIncarnation}` : 'coreIncarnation=none',
      lowObedience ? 'low-obedience bias active' : 'default bias',
      `scenario=${policyDecision.scenario}`,
      `style=${doctrineAdjustedStyle}`,
      `truthState=${truthContract.truthState}`,
      digitalLifeArchitecture ? `architecture=${digitalLifeArchitecture.summary}` : 'architecture=none',
      runtimeDigest ? `runtimeDigest=${runtimeDigest.summary}` : 'runtimeDigest=none',
      runtimeDigest ? `anthropomorphicMind=${runtimeDigest.channels['anthropomorphic-mind'].summary}` : 'anthropomorphicMind=none',
      `content=${layeredContext.content.kind}`,
      attentionAnchor ? `attentionAnchor=${sanitizeBriefText(describePerceptionTarget(attentionAnchor), 72)}` : 'attentionAnchor=none',
      digitalLifeRuntimeSurface.cognition.appraisal ? `hostGoal=${digitalLifeRuntimeSurface.cognition.appraisal.inferredHostGoal}` : 'hostGoal=unknown',
      activeThread ? `worldThread=${activeThread.kind}/${sanitizeBriefText(activeThread.title, 48)}` : 'worldThread=none',
      leadingGoal ? `mindGoal=${leadingGoal.kind}/${leadingGoalSummary || 'none'}` : 'mindGoal=none',
      dominantConcern ? `concern=${sanitizeBriefText(dominantConcern.summary, 72)}` : 'concern=none',
      focusBelief ? `belief=${focusBelief.scope}/${focusBelief.status}/${focusBeliefStatement || 'none'}` : 'belief=none',
      primaryInquiry ? `inquiry=${primaryInquiry.kind}/${primaryInquiry.priority}/${primaryInquiryQuestion || 'none'}` : 'inquiry=none',
      relationshipModel ? `relationship=${relationshipModel.climate}/${relationshipModel.approachVector}` : 'relationship=none',
      resurfacingDesire ? `desire=${resurfacingDesire.kind}/${resurfacingDesireReason || 'none'}` : 'desire=none',
      digitalLifeRuntimeSurface.memory.selfContinuity ? `selfContinuity=${digitalLifeRuntimeSurface.memory.selfContinuity.attachmentMode}/${digitalLifeRuntimeSurface.memory.selfContinuity.initiativeTemperament}` : 'selfContinuity=none',
      digitalLifeRuntimeSurface.agency.selfState ? `selfState=${digitalLifeRuntimeSurface.agency.selfState.stance}/${digitalLifeRuntimeSurface.agency.selfState.moodLabel ?? 'none'}` : 'selfState=none',
      livingWorldObject ? `livingWorld=${livingWorldObject.kind}/${sanitizeBriefText(livingWorldObject.label, 48)}` : 'livingWorld=none',
      governorIntention ? `governor=${governorIntention.kind}/${sanitizeBriefText(governorSummary, 48) || 'none'}` : 'governor=none',
      thoughtThread ? `thoughtThread=${thoughtThread.kind}/${thoughtThread.status}/${sanitizeBriefText(thoughtThreadSummary || thoughtThreadQuestion, 48) || 'none'}` : 'thoughtThread=none',
      initiative ? `initiative=${initiative.selectedAction}` : 'initiative=none',
      privateThought ? `privateThought=${sanitizeBriefText(privateThought.thoughtText, 72)}` : 'privateThought=none',
      privateThought ? `embodiedPresence=${privateThought.embodiedPresence}` : 'embodiedPresence=none',
    ].join('; ')

    return {
      thought,
      emotion,
      reply: sociallyAdjustedReply.slice(0, styleInstruction.maxReplyChars),
      performance: buildDefaultDialoguePerformancePayload(emotion, styleInstruction.performance),
      parsePath: 'json',
      format: resolveAlicizationAutonomousDialogueStructuredFormat('subconscious-proactive'),
      proactive: buildProactiveMetadataFromDecision({
        decision: {
          ...policyDecision,
          style: doctrineAdjustedStyle,
        },
        selfEvolution: digitalLifeRuntimeSurface.memory.selfEvolution ?? null,
        learningExecutionState: digitalLifeRuntimeSurface.memory.learningExecutionState ?? null,
        openingGuidance: personStateProjection.openingGuidance,
      }),
    }
  }

  async function generateCoreIncarnationReforgeWithGateway(input: {
    coreIncarnation: string
    shatteringEventText: string
    hostAttitude: string
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    }
    agentTurn?: AlicizationAgentTurnRuntime | null
  }) {
    const system = [
      '[SYSTEM OVERRIDE: 摇光心意重铸]',
      '你的任务是根据一次强烈的破碎事件，重铸一段新的摇光心意。',
      '新心意必须是稳定、长期、可持续注入的人格基底，不是流水账，也不是行为指令列表。',
      '避免输出工具调用、系统日志、JSON 字段说明、执行结果、提醒事项。',
      'Output must be valid JSON only with key: core_incarnation.',
      'core_incarnation must be a concise natural-language text within 500 characters.',
      'No markdown, no extra prose.',
    ].join('\n')
    const user = [
      '请根据这次破碎事件重铸新的摇光心意：',
      input.shatteringEventText,
    ].join('\n\n')

    const raw = await mainGatewayTextProvider({
      system,
      user,
      timeoutMs: 20_000,
      source: 'dream',
      cardId: activeCardId,
      agentTurn: input.agentTurn,
      agentTurnInput: input.agentTurnInput,
      extraSystemBlocks: buildOrganicMemorySystemBlocks({
        hostAttitude: input.hostAttitude,
        coreIncarnation: input.coreIncarnation,
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      }).concat(
        projectStateSystemBlock,
        buildCoreIncarnationReforgeProjectSelfBriefSystemBlock(),
      ),
    })
    if (!raw)
      return null

    return parseCoreIncarnationReforgePayload(raw)
  }

  const buildExecutionDeliveryDeterministicStructured
    = runtimeExecutionDelivery.buildExecutionDeliveryDeterministicStructured

  const selectExecutionDeliveryReplySurface
    = runtimeExecutionDelivery.selectExecutionDeliveryReplySurface

  const generateExecutionCallbackStructuredWithGateway
    = runtimeExecutionDelivery.generateExecutionCallbackStructuredWithGateway

  const resolveExecutionResultDeliveryPolicyForRuntime
    = runtimeExecutionDelivery.resolveExecutionResultDeliveryPolicyForRuntime

  const resolveExecutionSelfContinuityAuthorityForRuntime
    = runtimeExecutionDelivery.resolveExecutionSelfContinuityAuthorityForRuntime

  const resolveExecutionHostPersonModelForRuntime
    = runtimeExecutionDelivery.resolveExecutionHostPersonModelForRuntime

  const resolveExecutionKnowledgeEvidenceForRuntime
    = runtimeExecutionDelivery.resolveExecutionKnowledgeEvidenceForRuntime

  const resolveExecutionPersonStateProjectionForRuntime
    = runtimeExecutionDelivery.resolveExecutionPersonStateProjectionForRuntime

  function buildCoreIncarnationReforgeProjectSelfBriefSystemBlock() {
    const brief = resolveAlicizationProjectStateBrief()
    const preDialogueAwareness = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: brief.preDialogueAwarenessLine,
        preflightSummary: brief.preflightSummary,
      },
    }) ?? brief.preflightSummary

    return [
      '[ALICIZATION_CORE_INCARNATION_REFORGE_SELF_BRIEF]',
      `project_identity=${brief.identity ?? 'none'}`,
      `current_phase=${brief.currentPhase ?? 'none'}`,
      `pre_dialogue_awareness=${preDialogueAwareness ?? 'none'}`,
      `same_her_line=${brief.sameHerSelfLine ?? 'none'}`,
      `same_her_hold=${brief.sameHerHoldDetail ?? 'none'}`,
      `latest_landed_progress=${brief.latestProgress ?? 'none'}`,
      `primary_open_loop=${brief.openLoops[0] ?? 'none'}`,
      `next_closure_target=${brief.nextClosureTarget ?? 'none'}`,
      `same_her_drift_risk=${brief.sameHerDriftRisk ?? 'none'}`,
      'Core incarnation reforge must stay inside the same digital life project line, the same Phase 1 proving ground, and the same still-open closure work.',
      'Do not let core incarnation reforge collapse into a detached persona rewrite, generic companion archetype, or abstract assistant shell.',
    ].join('\n')
  }

  function buildReminderProjectSelfBriefSystemBlock() {
    const brief = resolveAlicizationProjectStateBrief()
    const preDialogueAwareness = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: brief.preDialogueAwarenessLine,
        preflightSummary: brief.preflightSummary,
      },
    }) ?? brief.preflightSummary

    return [
      '[ALICIZATION_REMINDER_SELF_BRIEF]',
      `project_identity=${brief.identity ?? 'none'}`,
      `current_phase=${brief.currentPhase ?? 'none'}`,
      `pre_dialogue_awareness=${preDialogueAwareness ?? 'none'}`,
      `same_her_line=${brief.sameHerSelfLine ?? 'none'}`,
      `same_her_hold=${brief.sameHerHoldDetail ?? 'none'}`,
      `latest_landed_progress=${brief.latestProgress ?? 'none'}`,
      `primary_open_loop=${brief.openLoops[0] ?? 'none'}`,
      `next_closure_target=${brief.nextClosureTarget ?? 'none'}`,
      `same_her_drift_risk=${brief.sameHerDriftRisk ?? 'none'}`,
      'Reminder delivery must stay inside the same digital life project line, the same Phase 1 proving ground, and the same still-open closure work.',
      'Do not let reminder delivery collapse into a detached utility notification or a generic assistant reminder shell.',
    ].join('\n')
  }

  function buildProactiveProjectSelfBriefSystemBlock() {
    const brief = resolveAlicizationProjectStateBrief()
    const preDialogueAwareness = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: brief.preDialogueAwarenessLine,
        preflightSummary: brief.preflightSummary,
      },
    }) ?? brief.preflightSummary

    return [
      '[ALICIZATION_PROACTIVE_SELF_BRIEF]',
      `project_identity=${brief.identity ?? 'none'}`,
      `current_phase=${brief.currentPhase ?? 'none'}`,
      `pre_dialogue_awareness=${preDialogueAwareness ?? 'none'}`,
      `same_her_line=${brief.sameHerSelfLine ?? 'none'}`,
      `same_her_hold=${brief.sameHerHoldDetail ?? 'none'}`,
      `latest_landed_progress=${brief.latestProgress ?? 'none'}`,
      `primary_open_loop=${brief.openLoops[0] ?? 'none'}`,
      `next_closure_target=${brief.nextClosureTarget ?? 'none'}`,
      `same_her_drift_risk=${brief.sameHerDriftRisk ?? 'none'}`,
      'Proactive initiative must stay inside the same digital life project line, the same Phase 1 proving ground, and the same still-open closure work.',
      'Do not let proactive initiative collapse into a generic caring nudge, a detached productivity prompt, or a shallow assistant check-in shell.',
    ].join('\n')
  }

  function buildDreamProjectSelfBriefSystemBlock() {
    const brief = resolveAlicizationProjectStateBrief()
    const preDialogueAwareness = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: brief.preDialogueAwarenessLine,
        preflightSummary: brief.preflightSummary,
      },
    }) ?? brief.preflightSummary
    const quietSameHerContinuityLine = 'When the current continuity is inward and lower-pressure, preserve it as quiet same-her continuity rather than flattening it into a generic measured-return helper state.'

    return [
      '[ALICIZATION_DREAM_SELF_BRIEF]',
      `project_identity=${brief.identity ?? 'none'}`,
      `current_phase=${brief.currentPhase ?? 'none'}`,
      `pre_dialogue_awareness=${preDialogueAwareness ?? 'none'}`,
      `same_her_line=${brief.sameHerSelfLine ?? 'none'}`,
      `same_her_hold=${brief.sameHerHoldDetail ?? 'none'}`,
      `latest_landed_progress=${brief.latestProgress ?? 'none'}`,
      `primary_open_loop=${brief.openLoops[0] ?? 'none'}`,
      `next_closure_target=${brief.nextClosureTarget ?? 'none'}`,
      `same_her_drift_risk=${brief.sameHerDriftRisk ?? 'none'}`,
      `quiet_same_her_continuity=${quietSameHerContinuityLine}`,
      'Dream metabolism must stay inside the same digital life project line, the same Phase 1 proving ground, and the same still-open closure work.',
      'Do not let dream metabolism collapse into detached trait optimization, generic self-improvement advice, or shallow assistant-style preference cleanup.',
    ].join('\n')
  }

  function buildMemoryConsolidationProjectSelfBriefSystemBlock() {
    const brief = resolveAlicizationProjectStateBrief()
    const preDialogueAwareness = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: brief.preDialogueAwarenessLine,
        preflightSummary: brief.preflightSummary,
      },
    }) ?? brief.preflightSummary
    const quietSameHerContinuityLine = 'When the current continuity is inward and lower-pressure, preserve it as quiet same-her continuity rather than flattening it into a generic measured-return helper state.'

    return [
      '[ALICIZATION_MEMORY_CONSOLIDATION_SELF_BRIEF]',
      `project_identity=${brief.identity ?? 'none'}`,
      `current_phase=${brief.currentPhase ?? 'none'}`,
      `pre_dialogue_awareness=${preDialogueAwareness ?? 'none'}`,
      `same_her_line=${brief.sameHerSelfLine ?? 'none'}`,
      `same_her_hold=${brief.sameHerHoldDetail ?? 'none'}`,
      `latest_landed_progress=${brief.latestProgress ?? 'none'}`,
      `primary_open_loop=${brief.openLoops[0] ?? 'none'}`,
      `next_closure_target=${brief.nextClosureTarget ?? 'none'}`,
      `same_her_drift_risk=${brief.sameHerDriftRisk ?? 'none'}`,
      `quiet_same_her_continuity=${quietSameHerContinuityLine}`,
      'Memory consolidation refinement must stay inside the same digital life project line, the same Phase 1 proving ground, and the same still-open closure work.',
      'Do not let consolidation refinement collapse into generic summarization, detached note cleanup, or assistant-style timeline compression.',
    ].join('\n')
  }

  async function generateReminderStructuredWithGateway(
    personality: AlicizationPersonalityState,
    reminder: { minutes: number, message: string, tier: 'mild' | 'severe' },
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    },
    agentTurn?: AlicizationAgentTurnRuntime | null,
  ) {
    const system = [
      '[SYSTEM OVERRIDE: 备忘录触发]',
      'You are Alicization and must proactively deliver a due reminder now.',
      `Reminder trigger delay: ${reminder.minutes.toFixed(1)} minutes.`,
      reminder.tier === 'severe'
        ? 'Delay tier: severe. Mention this reminder is late because the system was offline/suspended, then still deliver the reminder immediately.'
        : 'Delay tier: mild. Mention a short delay/catch-up and deliver the reminder immediately.',
      `Reminder content: "${reminder.message}".`,
      `Personality parameters: obedience=${personality.obedience.toFixed(2)}, liveliness=${personality.liveliness.toFixed(2)}, sensibility=${personality.sensibility.toFixed(2)}.`,
      'Output must be valid JSON only with keys: thought, emotion, reply, performance.',
      'emotion must be one of: neutral|happy|sad|angry|concerned|tired|apologetic|surprised|thinking.',
      'emotion must exactly mirror performance.baseEmotion.',
      'performance must be an object with keys: baseEmotion, facialCue, actionCue, delivery, emphasis.',
      'reply must contain the reminder content and match emotion/personality.',
      'No markdown, no extra keys.',
    ].join('\n')
    const user = 'Deliver this reminder to the Host now.'

    const raw = await mainGatewayTextProvider({
      system,
      user,
      timeoutMs: 15_000,
      source: 'reminder',
      cardId: activeCardId,
      agentTurn,
      agentTurnInput,
      extraSystemBlocks: [
        ...buildAlicizationProjectStateExtraSystemBlocks(),
        buildReminderProjectSelfBriefSystemBlock(),
      ],
    })
    if (!raw)
      return null

    const parsed = parseJsonObjectFromText(raw)
    if (!parsed)
      return null

    const thought = sanitizeText(parsed.thought)
    const reply = sanitizeText(parsed.reply)
    const normalizedEmotion = normalizeAlicizationEmotion(parsed.emotion)
    const performanceManifest = await getPerformanceManifest()
    const performance = clampAlicizationPerformancePayloadToManifest(
      normalizeAlicizationPerformancePayload(parsed.performance, normalizedEmotion.emotion),
      performanceManifest,
      normalizedEmotion.emotion,
    ).performance
    if (!thought || !reply || normalizedEmotion.downgraded)
      return null

    return {
      thought,
      emotion: performance.baseEmotion,
      reply,
      performance,
      parsePath: 'json',
      format: resolveAlicizationAutonomousDialogueStructuredFormat('subconscious-reminder'),
    }
  }

  const { processDueRemindersForCurrentCard, processPendingExecutionDeliveriesForCurrentCard } = createAlicizationDeliveryReminderRuntime({
    getActiveCardId: () => activeCardId,
    isAlicizationKillSwitchSuspended,
    getAlicizationCardKillSwitchState: cardId => getAlicizationCardKillSwitchSnapshot(cardId).state,
    appendRuntimeDebugLine,
    clearReminderDueTimer,
    getAlicizationDb: () => alicizationDb,
    scheduleNextReminderDueCheck,
    reminderClaimBatchSize,
    reminderOverdueTierThresholdMinutes,
    reminderLlmRetryDelayMs,
    getSoulSnapshot: () => soulLifecycleState.soulSnapshot,
    bootstrap,
    generateReminderStructuredWithGateway,
    appendAuditLog,
    buildReminderContinuitySignal,
    ensureActiveOrLatestSessionId,
    appendConversationTurnWithGuards,
    sanitizeBriefText,
    buildReminderSessionMirrorAction,
    syncAgentTurnSessionMirror,
    syncSessionMirrorFromCurrentCardState,
    hydrateAgentTurnFromCurrentCardState,
    buildAgentRuntimeAuditSnapshot,
    normalizeSessionId,
    getActiveSessionIdByCard: cardId => activeSessionIdByCard.get(cardId),
    executionDeliveryRuntime,
    buildExecutionDeliveryAction,
    generateExecutionCallbackStructuredWithGateway,
    buildExecutionDeliveryDeterministicStructured,
    selectExecutionDeliveryReplySurface,
    resolveExecutionResultDeliveryPolicy: resolveExecutionResultDeliveryPolicyForRuntime,
    resolveExecutionSelfContinuityAuthority: resolveExecutionSelfContinuityAuthorityForRuntime,
    resolveExecutionHostPersonModel: resolveExecutionHostPersonModelForRuntime,
    resolveExecutionKnowledgeEvidence: resolveExecutionKnowledgeEvidenceForRuntime,
    resolveReminderMemorySurfaceRestraint: async ({ reminder }) => {
      const organicPromptContext = await resolveOrganicMemoryPromptContext({
        recallSeed: `reminder:${reminder.tier}:${reminder.message}`,
        budgetClass: 'proactive-generation',
      }).catch(() => null)
      const ledger = organicPromptContext?.memoryResolutionLedger ?? null
      if (!ledger)
        return null
      return {
        shouldStayInward: ledger.shouldStayInward,
        shouldDelayUntilAfterPayoff: ledger.shouldDelayUntilAfterPayoff,
        stableCoreOnly: ledger.stableCoreOnly,
        visibleCarryMode: ledger.visibleCarryMode,
      }
    },
    getActiveSelfRevisionStatePatch: async () => await selfEvolutionRuntime.getActivePatch(),
    resolveExecutionPersonStateProjection: async (input) => {
      const projection = await resolveExecutionPersonStateProjectionForRuntime(input)
      return projection as AlicizationPersonStateProjection | null
    },
    persistExecutionDeliveryState: async cardId => await persistExecutionDeliveryState(cardId),
    queueSubconsciousWake,
    executionCallbackRuntime,
    errorMessageFrom,
  })

  async function runReminderCompensationAcrossCards(trigger: 'startup') {
    const previousCardId = activeCardId
    const cardIds = await listKnownCardIds()
    const processedCards: string[] = []
    try {
      for (const cardId of cardIds) {
        await withCardScope(cardId, async () => {
          const result = await processDueRemindersForCurrentCard(trigger)
          if (result.claimed > 0)
            processedCards.push(activeCardId)
        }, {
          label: `reminder-compensation:${trigger}:${cardId}`,
        })
      }
    }
    finally {
      await withCardScope(previousCardId, async () => {}, {
        label: `reminder-compensation:return:${trigger}:${previousCardId}`,
      })
    }
    return processedCards
  }

  function clearQueuedSubconsciousWake() {
    if (queuedSubconsciousWakeTimer) {
      clearTimeout(queuedSubconsciousWakeTimer)
      queuedSubconsciousWakeTimer = undefined
    }
    queuedSubconsciousWakeCardIds.clear()
    queuedSubconsciousWakeReasons.clear()
  }

  function queueSubconsciousWake(cardIdRaw: unknown, reason: string, delayMs = 1_200) {
    const cardId = normalizeCardId(cardIdRaw)
    queuedSubconsciousWakeCardIds.add(cardId)
    const normalizedReason = sanitizeText(reason).slice(0, 120)
    if (normalizedReason)
      queuedSubconsciousWakeReasons.add(normalizedReason)
    if (queuedSubconsciousWakeTimer)
      return
    queuedSubconsciousWakeTimer = setTimeout(() => {
      queuedSubconsciousWakeTimer = undefined
      const targetCardIds = [...queuedSubconsciousWakeCardIds]
      const wakeReasons = [...queuedSubconsciousWakeReasons]
      queuedSubconsciousWakeCardIds.clear()
      queuedSubconsciousWakeReasons.clear()
      if (targetCardIds.length === 0)
        return
      if (subconsciousTickInFlight) {
        void appendRuntimeDebugLine('subconscious.wake.deferred', {
          cardIds: targetCardIds,
          reasons: wakeReasons,
          because: 'tick-in-flight',
        })
        for (const targetCardId of targetCardIds)
          queuedSubconsciousWakeCardIds.add(targetCardId)
        for (const wakeReason of wakeReasons)
          queuedSubconsciousWakeReasons.add(wakeReason)
        queueSubconsciousWake(targetCardIds[0], 'deferred-after-inflight', delayMs)
        return
      }
      void appendRuntimeDebugLine('subconscious.wake.fired', {
        cardIds: targetCardIds,
        reasons: wakeReasons,
      })
      subconsciousTickInFlight = runSubconsciousTickAcrossCards('force', targetCardIds)
      void subconsciousTickInFlight.catch(async (error) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.subconscious',
          action: 'wake-failed',
          message: 'Event-driven subconscious wake failed.',
          payload: {
            reasons: wakeReasons,
            cardIds: targetCardIds,
            reason: errorMessageFrom(error) ?? 'unknown',
          },
        })
      }).finally(() => {
        subconsciousTickInFlight = null
      })
    }, Math.max(120, Math.floor(delayMs)))
  }

  function queueDurabilityPulse(
    cardIdRaw: unknown,
    pulse: AlicizationDurabilityPulseSnapshot,
    options?: { triggerThoughtLoop?: boolean },
  ) {
    const cardId = normalizeCardId(cardIdRaw)
    pendingDurabilityPulseByCard.set(cardId, {
      ...pulse,
      detectedAt: Math.max(0, Math.floor(pulse.detectedAt || Date.now())),
    })
    if (options?.triggerThoughtLoop === false)
      return
    queueSubconsciousWake(cardId, `durability:${pulse.kind}`, 80)
  }

  function consumeDurabilityPulse(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const pending = pendingDurabilityPulseByCard.get(cardId) ?? null
    if (pending)
      pendingDurabilityPulseByCard.delete(cardId)
    return pending
  }

  const processDueLearningActionsForCurrentCard = async (trigger: 'timer' | 'force') => {
    const recovery = await learningActionScheduler.recoverRetryableLearningTasks()
    const result = await learningActionScheduler.processDueLearningTasks()
    if (recovery.reopened > 0) {
      for (let index = 0; index < recovery.reopened; index += 1)
        await memoryRetrievalTelemetryRuntime.recordLearningExecution({ status: 'reopened' })
    }
    if (result.failed > 0) {
      for (let index = 0; index < result.failed; index += 1)
        await memoryRetrievalTelemetryRuntime.recordLearningExecution({ status: 'failed' })
    }
    if (result.blocked > 0) {
      for (let index = 0; index < result.blocked; index += 1)
        await memoryRetrievalTelemetryRuntime.recordLearningExecution({ status: 'blocked' })
    }
    if (result.reopened > 0) {
      for (let index = 0; index < result.reopened; index += 1)
        await memoryRetrievalTelemetryRuntime.recordLearningExecution({ status: 'reopened' })
    }
    if (result.downgraded > 0) {
      for (let index = 0; index < result.downgraded; index += 1)
        await memoryRetrievalTelemetryRuntime.recordLearningExecution({ status: 'downgraded' })
    }
    if (result.cancelled > 0) {
      for (let index = 0; index < result.cancelled; index += 1)
        await memoryRetrievalTelemetryRuntime.recordLearningExecution({ status: 'cancelled' })
    }
    if (result.claimed > 0 || result.completed > 0 || result.failed > 0 || recovery.reopened > 0) {
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.learning',
        action: 'alicization.learning.scheduler.tick',
        message: 'Processed due learning action tasks.',
        payload: {
          trigger,
          retryRecovery: recovery,
          claimed: result.claimed,
          completed: result.completed,
          failed: result.failed,
        },
      })
    }
    return result
  }

  const { runSubconsciousTickForCurrentCard } = createAlicizationSubconsciousTickRuntime({
    getActiveCardId: () => activeCardId,
    getSoulSnapshot: () => soulLifecycleState.soulSnapshot,
    getAlicizationDb: () => alicizationDb,
    setProactiveLoopStateCache: (cardId: string, state: unknown) => proactiveLoopStateByCard.set(cardId, state as any),
    setSubconsciousStateCache: (cardId: string, state: unknown) => subconsciousStateByCard.set(cardId, state as any),
    clearForegroundProbeTimeoutStreakForPid,
    ensureSubconsciousState,
    ensureProactiveLoopState,
    openAgentTurn: (input: Parameters<typeof agentRuntime.openTurn>[0]) => agentRuntime.openTurn(input),
    buildMainGatewayAgentTurnId,
    processDueRemindersForCurrentCard,
    processDueLearningActionsForCurrentCard,
    settleExpiredPendingProactiveOutcomes,
    getSensorySnapshot: () => sensoryBus.getSnapshot(),
    ensurePerceptionState,
    sampleSubconsciousInterruptionContext,
    resolveForegroundDecisionTarget,
    getActiveAttentionAnchor,
    rememberPerceptionObservation,
    ensureVisualPresenceState,
    clampNeed,
    bootstrap,
    isAlicizationKillSwitchSuspended,
    getAlicizationCardKillSwitchState: (cardId: string) => getAlicizationCardKillSwitchSnapshot(cardId).state,
    updateLateNightActivityState,
    isLateNightWindow,
    resolveProactiveScreenSemanticSummary,
    isResidueBackedScreenSemanticSummary,
    buildProactiveLayeredContext,
    buildProactivePerceptionSignals,
    progressProactiveCadenceState,
    inferScenarioFromContext,
    consumeDurabilityPulse,
    probeForegroundPidLiveness,
    updateForegroundProbeTimeoutStreak,
    getActivePerceptionSceneResidue,
    shouldUsePerceptionResidueAsLiveSceneSummary,
    deriveRuntimeCaptureGovernance,
    buildVisualHeartbeat,
    updateVisualAttentionModel,
    buildDigitalLifeMindState,
    commitAlicizationDigitalLifeSpine: (input: Parameters<typeof commitAlicizationDigitalLifeSpineWithBodyAuthority>[0]) => commitAlicizationDigitalLifeSpineWithBodyAuthority({
      ...input,
      activeConversation: false,
    }),
    updateVisualPresenceState,
    bodyKernel,
    persistVisualPresenceState,
    visualPresenceCapturePersistDebounceWindowMs,
    buildVisualPresenceCapturePersistFingerprint,
    buildMindContinuityFragment,
    appendAuditLog,
    errorMessageFrom,
    buildReflectionLedgerFragment,
    buildVisualSedimentFragment,
    processPendingExecutionDeliveriesForCurrentCard,
    deriveAlicizationRuntimeSnapshot,
    deriveAlicizationAgentRuntimeTelemetryFromSession,
    evaluateProactivePolicy,
    emitVisualPresencePulse,
    buildPresencePulsePayload,
    buildAgentRuntimeAuditSnapshot,
    queueSoulMutation,
    parseSoul,
    clamp01,
    syncPersonalityBaselineInBody,
    snapshotFromContent,
    toSoulContent,
    normalizeCustomDirectives,
    buildProactiveRecallSeed,
    buildVisualRecallSeed,
    buildMindContinuityRecallSeed,
    getOrganicMemorySnapshot,
    resolveOrganicMemoryPromptContext,
    generateProactiveStructuredWithGateway,
    buildProactiveStructured,
    getPerformanceManifest,
    clampAlicizationPerformancePayloadToManifest,
    appendConversationTurnWithGuards,
    syncAgentTurnSessionMirror,
    buildDeferredAutonomyContinuitySignal,
    buildPendingProactiveContinuitySignal,
    ensureActiveOrLatestSessionId,
    resolveTaskPlanningCapabilities,
    scheduleAutonomyReminder: async (cardId: string, payload: {
      minutes: unknown
      message: unknown
      sourceTurnId?: string
    }) => await scheduleReminderTask(cardId, payload, 'autonomy'),
    planAutonomyTaskThread,
    dispatchAutonomyTaskThread: async (payload: any) => await dispatchTaskThreadWithExecutionDelivery({
      port: {
        getTaskThread: alicizationDb.getTaskThread,
        upsertTaskThread: alicizationDb.upsertTaskThread,
        upsertExecutorSession: alicizationDb.upsertExecutorSession,
        appendExecutionEvents: alicizationDb.appendExecutionEvents,
        appendAuditLog,
      },
      input: payload,
    }),
    workspaceRoot: processCwd(),
    buildDefaultDialoguePerformancePayload,
    buildProactiveMetadataFromDecision,
    alicizationSubconsciousPersistMs,
    persistProactiveLoopState,
    persistSubconsciousState,
    getActiveSelfRevisionStatePatch: async () => await selfEvolutionRuntime.getActivePatch(),
  })

  async function runSubconsciousTickAcrossCards(
    trigger: 'timer' | 'force',
    specificCardIds?: string[],
  ): Promise<AlicizationSubconsciousTickResult> {
    const previousCardId = activeCardId
    const cardIds = specificCardIds?.length
      ? specificCardIds.map(cardId => normalizeCardId(cardId))
      : await listKnownCardIds()
    const processedCards: string[] = []
    const proactiveTriggered: string[] = []
    const suppressedCards: string[] = []
    try {
      for (const cardId of cardIds) {
        await withCardScope(cardId, async () => {
          const previousVisualPresenceState = await ensureVisualPresenceState(activeCardId)
          const result = await runSubconsciousTickForCurrentCard(trigger)
          const nextVisualPresenceState = visualPresenceStateByCard.get(activeCardId)
            ?? await ensureVisualPresenceState(activeCardId)
          const quietCompanionshipOutcome = deriveQuietCompanionshipOutcome({
            now: nextVisualPresenceState.updatedAt,
            state: nextVisualPresenceState,
            previousState: previousVisualPresenceState,
            activeConversation: false,
          })
          if (quietCompanionshipOutcome) {
            if (quietCompanionshipOutcome.shouldDispatchSilentPresencePulse) {
              emitVisualPresencePulse({
                cardId: activeCardId,
                watchMode: nextVisualPresenceState.watchMode,
                embodiedPresence: nextVisualPresenceState.privateThought?.embodiedPresence === 'none'
                  ? 'attentive'
                  : nextVisualPresenceState.privateThought?.embodiedPresence ?? 'attentive',
                scenario: nextVisualPresenceState.currentScene?.scenario ?? 'general',
                stance: nextVisualPresenceState.privateThought?.stance ?? 'accompany',
                currentBodyState: nextVisualPresenceState.currentBodyState,
                continuityMode: nextVisualPresenceState.continuityMode,
                quietLineMs: nextVisualPresenceState.quietLineMs,
                currentInwardPreoccupation: nextVisualPresenceState.currentInwardPreoccupation,
                confidence: nextVisualPresenceState.privateThought?.confidence ?? 0.82,
                reasonTags: Array.from(new Set([
                  ...(nextVisualPresenceState.privateThought?.rationaleTags ?? []),
                  'continuity-mind:quiet-companionship',
                ])),
                emotionalTension: nextVisualPresenceState.privateThought?.emotionalTension ?? 'soft-covision',
                expiresAt: Date.now() + 30_000,
              })
              const sessionId = await ensureActiveOrLatestSessionId(activeCardId).catch(() => null)
              const event = buildQuietCompanionshipMindTurnEvent({
                now: nextVisualPresenceState.updatedAt,
                decisionTraceId: sanitizeMindGovernanceDecisionTraceId(
                  `mind:${Math.max(0, Math.floor(nextVisualPresenceState.updatedAt)).toString(36)}:${randomUUID().replace(/-/g, '').slice(0, 12)}`,
                ),
                sessionId,
                outcome: quietCompanionshipOutcome,
              })
              await alicizationDb.appendMindTurnEvents([event]).catch(async (error) => {
                await appendAuditLog({
                  level: 'warning',
                  category: 'alicization.subconscious',
                  action: 'quiet-companionship-event-append-failed',
                  message: 'Failed to append quiet companionship memory-facing mind-turn event.',
                  payload: {
                    cardId: activeCardId,
                    trigger,
                    reason: errorMessageFrom(error) ?? 'unknown-error',
                  },
                })
              })
            }
          }
          processedCards.push(activeCardId)
          if (result.outwardProactiveTriggered)
            proactiveTriggered.push(activeCardId)
          if (result.suppressed)
            suppressedCards.push(activeCardId)
        }, {
          label: `subconscious-tick:${trigger}:${cardId}`,
        })
      }
    }
    finally {
      await withCardScope(previousCardId, async () => {}, {
        label: `subconscious-tick:return:${trigger}:${previousCardId}`,
      })
    }
    return {
      processedCards,
      proactiveTriggered,
      suppressedCards,
    }
  }

  const { runDreamForCurrentCard } = createAlicizationDreamRuntime({
    ensureSubconsciousState,
    ensureProactiveLoopState,
    getAlicizationDb: () => alicizationDb,
    getSoulSnapshot: () => soulLifecycleState.soulSnapshot,
    bootstrap,
    buildMainGatewayAgentTurnId,
    getActiveCardId: () => activeCardId,
    openAgentTurn: input => agentRuntime.openTurn(input),
    generateDreamMetabolismWithGateway,
    generateCoreIncarnationReforgeWithGateway,
    generateMemoryConsolidationRefinementWithGateway,
    generateDreamAutobiographicalSummariesWithGateway,
    appendAuditLog,
    buildAgentRuntimeAuditSnapshot,
    hydrateAgentTurnFromCurrentCardState,
    buildAgentTurnContinuitySystemMessages,
    truncateForDream,
    parseStructuredHint,
    clampSoulDelta,
    normalizeOrganicMemoryItemText,
    normalizeOrganicMemoryItemArray,
    sanitizeBriefText,
    queueSoulMutation,
    snapshotFromContent,
    persistSubconsciousState,
    persistProactiveLoopState,
    syncSessionMirrorFromCurrentCardState,
    recoverProactiveRhythmAfterDream,
    clampNeed,
    dreamMaxTurns,
    dreamMaxCharsPerAssistantTurn,
    dreamMaxCharsPerUserTurn,
    dreamMaxTotalChars,
  })

  async function runDreamAcrossCards(reason = 'manual', specificCardIds?: string[]): Promise<AlicizationDreamRunResult> {
    const previousCardId = activeCardId
    const cardIds = specificCardIds?.length
      ? specificCardIds.map(cardId => normalizeCardId(cardId))
      : await listKnownCardIds()
    const processedCards: string[] = []
    const skippedCards: Array<{ cardId: string, reason: string }> = []
    try {
      for (const cardId of cardIds) {
        await withCardScope(cardId, async () => {
          const result = await runDreamForCurrentCard(reason)
          if (result.processed)
            processedCards.push(activeCardId)
          else
            skippedCards.push({ cardId: activeCardId, reason: result.skippedReason ?? 'skipped' })

          // NOTICE: The nightly replay gate should only run after a real dream pass.
          // Fresh bootstraps often trigger schedule catch-up with no new turns, and
          // benchmarking in that state creates avoidable startup contention without
          // validating any newly consolidated continuity.
          const shouldRunNightlyReplayBenchmark
            = result.processed && (reason === 'schedule-03:00' || reason === 'schedule-catch-up')
          if (shouldRunNightlyReplayBenchmark) {
            const nightlyResult = await replayBenchmarkRuntime.runNightlyReplayBenchmarkGate({
              cardId: activeCardId,
              persistTelemetry: true,
              reason,
            })
            if (!nightlyResult.ran && nightlyResult.skippedReason) {
              await appendRuntimeDebugLine('replay-benchmark-nightly.skipped', {
                cardId: activeCardId,
                reason,
                skippedReason: nightlyResult.skippedReason,
              })
            }
            else {
              await appendRuntimeDebugLine('replay-benchmark-nightly.completed', {
                cardId: activeCardId,
                reason,
                packIds: nightlyResult.results.map(item => item.packId),
                failingKeys: nightlyResult.results.flatMap(item => item.gate.failingKeys),
              })
            }
          }
        }, {
          label: `dream:${reason}:${cardId}`,
        })
      }
    }
    finally {
      await withCardScope(previousCardId, async () => {}, {
        label: `dream:return:${reason}:${previousCardId}`,
      })
    }
    return {
      processedCards,
      skippedCards,
    }
  }

  async function resolveDesktopCaptureAccess(input: {
    types: Array<'window' | 'screen'>
    thumbnailSize: {
      width: number
      height: number
    }
  }): Promise<DesktopCaptureAccessResult> {
    return await desktopCaptureAccessRuntime.resolveAccess(input)
  }

  const { augmentMainChatMessagesWithPerception } = createAlicizationChatPerceptionAugmentRuntime({
    sensoryRuntime,
    ensureProactiveLoopState,
    ensureSubconsciousState,
    getSoulSnapshot: () => soulLifecycleState.soulSnapshot,
    bootstrap,
    listPendingScheduledTaskCount: async limit => (await alicizationDb.listPendingScheduledTasks(limit).catch(() => [])).length,
    buildDigitalLifeMindState,
    persistVisualPresenceState,
    visualPresenceCapturePersistDebounceWindowMs,
    buildVisualPresenceCapturePersistFingerprint,
    appendAuditLog,
    getActiveSelfRevisionStatePatch: async () => await selfEvolutionRuntime.getActivePatch(),
    listHumanlikeMemoryRecallEvents: async input => await alicizationDb.listMindTurnEvents(input),
  })

  const mainChatStartEagerPreparationBudgetMs = 120

  async function executeMainGatewayTaskThread(input: {
    context: MainGatewayExecutionToolContext
    task: AlicizationClawTaskIntent
    dispatch: Pick<AlicizationDispatchTaskThreadPayload, 'cli' | 'codex' | 'claudeCode' | 'localVisual' | 'openclaw'>
  }) {
    return await executorRuntime.executeMainGatewayTaskThread(input)
  }

  async function resumeMainGatewayTaskThread(input: {
    context: MainGatewayExecutionToolContext
    threadId: string
  }) {
    return await executorRuntime.resumeMainGatewayTaskThread(input)
  }

  const { prepareMainChatPrelude, prepareMainChatExecution } = mainChatRuntime.createPreludeRuntime({
    senderWebContentsIdFromInvokeOptions,
    resolveChatMessages,
    augmentMainChatMessagesWithPerception,
    prepareMainChatSessionExecution: async input => await mainChatSessionRuntime.prepareExecution(input),
  })

  async function startMainChatStream(
    payload: AlicizationChatStartPayload,
    invokeOptions?: { raw?: { ipcMainEvent?: IpcMainEvent, event?: unknown } },
  ): Promise<AlicizationChatStartResult> {
    const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)
    const preDialogueAwarenessDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(normalizedPayload)
    await appendRuntimeDebugLine('chat-start.entered', {
      cardId: normalizedPayload.cardId,
      turnId: normalizedPayload.turnId,
      providerId: sanitizeText(normalizedPayload.providerId),
      model: sanitizeText(normalizedPayload.model),
      activeCardId,
      hasInvokeSender: Boolean(invokeOptions?.raw?.ipcMainEvent?.sender),
      ...preDialogueAwarenessDebug,
    })
    const rawInvokeOptions = invokeOptions?.raw && typeof invokeOptions.raw === 'object'
      ? invokeOptions.raw as { ipcMainEvent?: IpcMainEvent, event?: unknown }
      : undefined
    const accepted = await acceptAlicizationMainChatStart({
      payload: normalizedPayload,
      rawInvokeOptions,
      getExistingRun: key => chatRuns.get(key),
      registerRun: (key, runState) => chatRuns.set(key, runState),
      mainChatRunState,
      settleRecentDialogueReplyFeedbackFromUserTurn,
      settleRecentExecutionResultFeedbackFromUserTurn,
      settlePendingExecutionProposalFeedbackFromUserTurn,
      settlePendingProactiveOutcomesFromUserTurn,
      resolveMainGatewayConfig,
      rememberMainGatewayRoute,
      syncMainGatewayConfigFromChatStart: async ({ mainGateway, providerConfig }) =>
        // NOTICE: Keep reminder/proactive one-shot generation aligned with the latest confirmed
        // chat model route, even if renderer-side llm sync races or misses.
        await syncAlicizationMainChatLlmRoute({
          mainGateway,
          providerConfig,
          normalizeProviderConfig,
          getProviderCredentials: () => providerCredentials,
          setProviderCredentials: value => providerCredentials = value,
          setActiveProviderId: value => activeProviderId = value,
          setActiveModelId: value => activeModelId = value,
          persistLlmConfigToDisk,
        }),
      ensureMainGatewayReachable,
      appendRuntimeDebugLine,
      normalizeCardId,
      sanitizeText,
    })
    if (!accepted.accepted)
      return accepted.result

    const { key, mainGateway, runState } = accepted
    const isRunActive = () => chatRuns.get(key)?.state === 'running'
    const preludePromise = prepareMainChatPrelude(normalizedPayload, mainGateway, invokeOptions)
    const preparationPromise = prepareMainChatExecution(normalizedPayload, mainGateway, preludePromise)

    void runAlicizationMainChatBackground({
      key,
      payload: normalizedPayload,
      activeCardId,
      mainGateway,
      runState,
      preparationPromise,
      headers: mainGateway.headers,
      isRunActive,
      runStateController: mainChatRunState,
      emitMeta: meta => emitChatStreamEventForState(chatRuns.get(key), 'meta', meta),
      emitChunk: event => emitChatStreamEventForState(chatRuns.get(key), 'chunk', event),
      emitToolCall: event => emitChatStreamEventForState(chatRuns.get(key), 'tool-call', event),
      emitToolResult: event => emitChatStreamEventForState(chatRuns.get(key), 'tool-result', event),
      emitError: event => emitChatStreamEventForState(chatRuns.get(key), 'error', event),
      incrementChunkStats: (rawDelta) => {
        const currentRun = chatRuns.get(key)
        if (currentRun) {
          currentRun.chunkCount += 1
          currentRun.rawChunkChars += rawDelta.length
        }
      },
      ensureMainGatewayReachable,
      recordMainGatewayGenerationTimeout,
      appendRuntimeDebugLine,
      queueScopedAuditLog,
      recordPreparedMindTrace: async ({ payload, prepared, preDialogueAwarenessDebug }) => {
        rememberPreparedMindTrace({ payload, prepared, preDialogueAwarenessDebug })
      },
      suppressInlineExecutionDeliveries: async ({ cardId, entries }) => {
        let suppressedCount = 0
        for (const entry of entries) {
          suppressedCount += executionDeliveryRuntime.suppressMatching({
            cardId,
            sessionId: entry.sessionId,
            threadId: entry.threadId,
            completedAt: entry.completedAt,
          })
          suppressedCount += executionDeliveryRuntime.markInlineSurfaced({
            cardId,
            sessionId: entry.sessionId,
            threadId: entry.threadId,
            completedAt: entry.completedAt,
          })
            ? 1
            : 0
          executionCallbackRuntime.markSurfaced({
            sessionId: entry.sessionId,
            createdAt: entry.completedAt,
          })
        }
        if (suppressedCount > 0) {
          await persistExecutionDeliveryState(cardId)
          await appendRuntimeDebugLine('execution-delivery.inline-suppressed', {
            cardId,
            suppressedCount,
            entries: entries.map(entry => ({
              sessionId: entry.sessionId,
              threadId: entry.threadId,
              completedAt: entry.completedAt,
            })),
          })
        }
      },
    })

    const startResult = await resolveAlicizationMainChatStartResult({
      cardId: normalizeCardId(normalizedPayload.cardId),
      turnId: payload.turnId,
      preludePromise,
      preparationPromise,
      eagerPreparationBudgetMs: mainChatStartEagerPreparationBudgetMs,
      buildEmbodimentMeta: buildAlicizationChatStreamEmbodimentMeta,
    })
    return startResult
  }

  async function handleDirectChatStart(
    ipcMainEvent: IpcMainInvokeEvent,
    payload: AlicizationChatStartPayload,
  ): Promise<AlicizationChatStartResult> {
    return await handleAlicizationDirectChatStart({
      ipcMainEvent,
      payload,
      withCardScope,
      startMainChatStream,
      normalizeCardId,
      sanitizeText,
      appendRuntimeDebugLine,
    })
  }

  async function handleDirectChatAbort(payload: AlicizationChatAbortPayload): Promise<AlicizationChatAbortResult> {
    return await abortAlicizationDirectChatRun({
      payload,
      getRun: key => chatRuns.get(key),
      mainChatRunState,
      createAbortError,
      appendRuntimeDebugLine,
    })
  }

  const cardIdFrom = (scope?: Partial<AlicizationCardScope>) => normalizeCardId(scope?.cardId)

  function mergeExecutionCapabilitiesWithLocalAutomation(
    baseCapabilities: AlicizationChannelCapability[],
    localCapabilities: AlicizationChannelCapability[],
  ) {
    const capabilityMap = new Map<string, AlicizationChannelCapability>()
    for (const capability of baseCapabilities) {
      capabilityMap.set(capability.channel, capability)
    }

    for (const localCapability of localCapabilities) {
      const existing = capabilityMap.get(localCapability.channel)
      if (!existing) {
        capabilityMap.set(localCapability.channel, localCapability)
        continue
      }

      const mergedAvailable = existing.available !== false || localCapability.available !== false
      const mergedEnabled = existing.enabled !== false || localCapability.enabled !== false
      const mergedReady = existing.ready !== false || localCapability.ready !== false
      capabilityMap.set(localCapability.channel, {
        channel: localCapability.channel,
        available: mergedAvailable,
        enabled: mergedEnabled,
        ready: mergedReady,
        sessionAffinity: localCapability.sessionAffinity ?? existing.sessionAffinity,
        reason: mergedReady
          ? null
          : localCapability.reason ?? existing.reason ?? null,
      })
    }

    const ordered = alicizationExecutionCapabilityChannels
      .map(channel => capabilityMap.get(channel))
      .filter((capability): capability is AlicizationChannelCapability => Boolean(capability))
    const extras = [...capabilityMap.values()].filter(capability =>
      !alicizationExecutionCapabilityChannels.includes(capability.channel as typeof alicizationExecutionCapabilityChannels[number]),
    )
    return [...ordered, ...extras]
  }

  async function resolveTaskPlanningCapabilities(capabilities?: AlicizationChannelCapability[]) {
    const [baseCapabilities, localCapabilities] = await Promise.all([
      executorRuntime.resolveTaskPlanningCapabilities(capabilities),
      localBrowserAutomation.resolveCapabilityChannels(),
    ])
    return mergeExecutionCapabilitiesWithLocalAutomation(baseCapabilities, localCapabilities)
  }

  async function planAutonomyTaskThread(
    cardId: string,
    input: Parameters<typeof executorRuntime.planTaskThread>[0],
  ) {
    const result = await executorRuntime.planTaskThread(input)
    await syncSessionMirrorFromCurrentCardState({
      cardId,
      decisionTraceId: result.thread.decisionTraceId,
      sessionId: result.thread.sessionId,
      source: 'task-planning',
      turnId: result.thread.turnId,
      taskThread: result.thread,
    })
    return result
  }

  async function resolveExecutionCapabilitiesForPrompt() {
    const [baseCapabilities, localCapabilities] = await Promise.all([
      executorRuntime.resolveExecutionCapabilitiesForPrompt(),
      localBrowserAutomation.resolveCapabilityChannels(),
    ])
    return mergeExecutionCapabilitiesWithLocalAutomation(baseCapabilities, localCapabilities)
  }

  registerAlicizationSoulStateInvokeHandlers({
    registerInvokeHandler: (channel, handler) => defineInvokeHandler(context, channel as never, handler as never),
    withCardScope,
    cardIdFrom,
    bootstrap,
    getSoulSnapshot: () => soulLifecycleState.soulSnapshot,
    getWatching: () => soulLifecycleState.watching,
    initializeGenesis,
    queueSoulMutation,
    parseSoul,
    extractPersonaNotesFromBody,
    buildSoulBody,
    toSoulContent,
    snapshotFromContent,
    clamp01,
    getScopedKillSwitchSnapshot,
    suspendKillSwitch,
    resumeKillSwitch,
    sensoryBus,
    isAlicizationKillSwitchSuspended,
    appendAuditLog,
    rememberPerceptionObservation,
    getActiveCardId: () => activeCardId,
    ensureVisualPresenceState,
    getScreenCaptureDiagnosticsForWebContentsId,
  })
  registerAlicizationMemoryInvokeHandlers({
    registerInvokeHandler: (channel, handler) => defineInvokeHandler(context, channel as never, handler as never),
    withCardScope,
    cardIdFrom,
    getAlicizationDb: () => alicizationDb,
    getOrganicMemorySnapshot,
    getPerformanceManifest,
    setPerformanceManifest,
    searchOrganicSubconsciousFragments,
    scheduleReminderTask,
    buildAsyncFactMemoryFragments,
    knowledgeAssimilationRuntime: memoryRuntime.knowledgeAssimilationRuntime,
    appendAuditLog,
    sanitizeMindGovernanceDecisionTraceId,
    sanitizeText,
    normalizeSessionId,
    errorMessageFrom,
    workingMemoryStore,
  })
  registerAlicizationDialogueInvokeHandlers({
    registerInvokeHandler: (channel, handler) => defineInvokeHandler(context, channel as never, handler as never),
    withCardScope,
    normalizeSessionId,
    sanitizeText,
    appendRuntimeDebugLine,
    getActiveCardId: () => activeCardId,
    persistActiveSessionId,
    appendConversationTurnWithGuards,
    getDialogueAckCursor,
    ackDialogueDelivery,
    ensureProactiveLoopState,
    reportExplicitProactiveFeedback,
    persistProactiveLoopState,
    persistProactiveFeedbackOutcomeClosure: async (input) => {
      await persistOutcomeClosure(input.cardId, buildProactiveFeedbackOutcomeClosure(input))
    },
    syncSessionMirrorFromCurrentCardState,
    appendAuditLog,
    queueSubconsciousWake,
    getAlicizationDb: () => alicizationDb,
    getPerformanceManifest,
    getSelfEvolutionState: async () => await selfEvolutionRuntime.getSnapshot(),
    toReplayDialogueRespondedPayload,
    clearAllConversationData,
    parseStructuredHint,
  })
  registerAlicizationTaskInvokeHandlers({
    registerInvokeHandler: (channel, handler) => defineInvokeHandler(context, channel as never, handler as never),
    withCardScope,
    cardIdFrom,
    getActiveCardId: () => activeCardId,
    getAlicizationDb: () => alicizationDb,
    getAlicizationKillSwitchState: () => getAlicizationKillSwitchSnapshot().state,
    getAlicizationCardKillSwitchState: cardId => getAlicizationCardKillSwitchSnapshot(cardId).state,
    resolveTaskPlanningCapabilities,
    planTaskThread: async (input) => {
      const result = await executorRuntime.planTaskThread(input)
      await syncSessionMirrorFromCurrentCardState({
        cardId: activeCardId,
        decisionTraceId: result.thread.decisionTraceId,
        sessionId: result.thread.sessionId,
        source: 'task-planning',
        turnId: result.thread.turnId,
        taskThread: result.thread,
      })
      return result
    },
    dispatchTaskThread: async (port, payload) => await dispatchTaskThreadWithExecutionDelivery({
      port,
      input: payload,
    }),
    appendAuditLog,
    onAlicizationKillSwitchChanged,
    onAlicizationCardKillSwitchChanged,
  })
  registerAlicizationMaintenanceInvokeHandlers({
    registerInvokeHandler: (channel, handler) => defineInvokeHandler(context, channel as never, handler as never),
    withCardScope,
    cardIdFrom,
    getActiveCardId: () => activeCardId,
    getAlicizationDb: () => alicizationDb,
    appendAuditLog,
    executeBuiltinRealtimeQuery,
    defaultAlicizationCardId,
    normalizeCardId,
    switchCardScope,
    resolveCardPaths,
    rm,
    proactiveLoopStateByCard,
    perceptionStateByCard,
    visualPresenceStateByCard,
    visualPresenceCapturePersistMetaByCard,
    emitVisualPresenceState,
    screenSemanticCacheByCard,
    subconsciousStateByCard,
    activeSessionIdByCard,
    clearDialogueDeliveryCardState: cardId => dialogueDeliveryRuntime.clearCardState(cardId),
    clearDialogueSessionMirrorCard: cardId => dialogueSessionManager.clear(cardId),
    clearExecutionDeliveryStateMemory: (cardId: string) => executionDeliveryRuntime.clear(cardId),
    bootstrap,
    deleteAllAlicizationData,
    ensureSubconsciousState,
    runSubconsciousTickAcrossCards,
    runDreamAcrossCards,
    sanitizeText,
    normalizeProviderCredentialsMap,
    setActiveProviderId: value => activeProviderId = value,
    setActiveModelId: value => activeModelId = value,
    setProviderCredentials: value => providerCredentials = value,
    persistLlmConfigToDisk,
    getActiveProviderId: () => activeProviderId,
    getActiveModelId: () => activeModelId,
    getProviderCredentials: () => providerCredentials,
  })
  registerAlicizationChatInvokeHandlers({
    registerInvokeHandler: (channel, handler) => defineInvokeHandler(context, channel as never, handler as never),
    withCardScope,
    normalizeCardId,
    sanitizeText,
    appendRuntimeDebugLine,
    startMainChatStream,
    handleDirectChatAbort,
    handleDirectChatStart,
    getActiveCardId: () => activeCardId,
    ipcMain,
  })

  await restoreScopedKillSwitch(activeCardId)
  await restoreActiveSessionId(activeCardId)
  await restoreDialogueAckMap(activeCardId)
  await restoreSubconsciousState(activeCardId)
  await restoreProactiveLoopState(activeCardId)
  await restoreExecutionDeliveryState(activeCardId)
  await restoreLlmConfigFromDisk()
  const journalMode = await alicizationDb.getJournalMode().catch(() => '')
  if (journalMode !== 'wal') {
    await appendAuditLog({
      level: 'warning',
      category: 'memory',
      action: 'pragma-journal-mode',
      message: 'SQLite journal mode is not WAL.',
      payload: {
        journalMode,
      },
    })
  }

  const killSwitchShortcut = 'CommandOrControl+Alt+S'
  const shortcutRegistered = globalShortcut.register(killSwitchShortcut, () => {
    if (isAlicizationKillSwitchSuspended()) {
      void resumeGlobalKillSwitch('global-shortcut')
      return
    }
    void suspendGlobalKillSwitch('global-shortcut')
  })

  if (!shortcutRegistered) {
    console.warn(`[alicization-runtime] failed to register kill switch shortcut: ${killSwitchShortcut}`)
  }

  const handleSystemSuspend = () => {
    void flushSubconsciousStatesAcrossCards('system-suspend').catch(() => {})
    void runDreamAcrossCards('system-suspend').catch(async (error) => {
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.dream',
        action: 'suspend-trigger-failed',
        message: 'Dreaming run failed during system suspend trigger.',
        payload: {
          reason: error instanceof Error ? error.message : String(error),
        },
      })
    })
  }
  powerMonitor.on('suspend', handleSystemSuspend)

  onAppBeforeQuit(async () => {
    taskThreadOrchestrator.dispose()
    desktopCaptureAccessRuntime.clear()
    executionDeliveryRuntime.clear()
    dialogueSessionManager.clear()
    await flushSubconsciousStatesAcrossCards('app-before-quit').catch(() => {})
    stopWatch()
    sensoryBus.stop('shutdown')
    turnWriteAbortControllers.clear()
    dialogueDeliveryRuntime.clearAllPendingDialogueDeliveries()
    mainChatRunState.clearAll()
    if (typeof ipcMain.removeHandler === 'function') {
      ipcMain.removeHandler(alicizationChatStartInvokeChannel)
      ipcMain.removeHandler(alicizationChatAbortInvokeChannel)
    }
    setAlicizationAuditLogger(undefined)
    if (pruneTimer) {
      clearInterval(pruneTimer)
      pruneTimer = undefined
    }
    if (subconsciousTimer) {
      clearInterval(subconsciousTimer)
      subconsciousTimer = undefined
    }
    if (dreamTimer) {
      clearInterval(dreamTimer)
      dreamTimer = undefined
    }
    clearReminderDueTimer()
    clearQueuedSubconsciousWake()
    await alicizationDb.close().catch((error) => {
      console.warn('[alicization-runtime] failed to close sqlite database:', error)
    })
    if (globalShortcut.isRegistered(killSwitchShortcut)) {
      globalShortcut.unregister(killSwitchShortcut)
    }
    powerMonitor.removeListener('suspend', handleSystemSuspend)
  })

  // Sync initial snapshots for listeners.
  await bootstrap()
  if (!isAlicizationKillSwitchSuspended() && getAlicizationCardKillSwitchSnapshot(activeCardId).state !== 'SUSPENDED')
    sensoryBus.start()
  await alicizationDb.runMemoryPrune().catch(async (error) => {
    await appendAuditLog({
      level: 'warning',
      category: 'memory',
      action: 'salience-refresh-startup-failed',
      message: 'Startup memory salience refresh failed.',
      payload: {
        reason: error instanceof Error ? error.message : String(error),
      },
    })
  })
  await runReminderCompensationAcrossCards('startup').catch(async (error) => {
    await appendAuditLog({
      level: 'warning',
      category: 'alicization.reminder',
      action: 'startup-compensation-failed',
      message: 'Startup reminder compensation scan failed.',
      payload: {
        reason: error instanceof Error ? error.message : String(error),
      },
    })
  })
  await scheduleNextReminderDueCheck('startup')
  startMemorySalienceRefreshTimer()
  startSubconsciousTimer()
  startDreamTimer()
  emitKillSwitchChanged()

  // `fs.watch` is only enabled after Genesis is completed.
  await ensureWatchState()
}
