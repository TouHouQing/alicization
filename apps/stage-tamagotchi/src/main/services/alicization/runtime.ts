import type { Buffer } from 'node:buffer'

import type { CommonContentPart, Message, UserMessage } from '@xsai/shared-chat'
import type { DesktopCapturerSource, IpcMainEvent, IpcMainInvokeEvent, NativeImage, WebContents } from 'electron'

import type {
  AlicizationActiveThought,
  AlicizationAuditLogInput,
  AlicizationCardScope,
  AlicizationChatAbortPayload,
  AlicizationChatAbortResult,
  AlicizationChatErrorEvent,
  AlicizationChatFinishEvent,
  AlicizationChatMetaEvent,
  AlicizationChatStartPayload,
  AlicizationChatStartResult,
  AlicizationChatStreamChunkEvent,
  AlicizationChatStreamDispatchPayload,
  AlicizationChatToolCallEvent,
  AlicizationChatToolResultEvent,
  AlicizationConversationTurnInput,
  AlicizationConversationTurnRecord,
  AlicizationCoreIncarnationReforgePayload,
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueRespondedPayload,
  AlicizationDialogueStructuredFormat,
  AlicizationDreamMetabolismPayload,
  AlicizationDreamRunResult,
  AlicizationDurabilityPulseSnapshot,
  AlicizationEmotion,
  AlicizationGender,
  AlicizationGenesisInput,
  AlicizationListMindTurnEventsPayload,
  AlicizationMemoryUpsertFactsPayload,
  AlicizationMindTurnEventInput,
  AlicizationMindTurnEventRecord,
  AlicizationMindTurnGovernance,
  AlicizationOrganicMemorySnapshot,
  AlicizationPersonalityState,
  AlicizationPresencePulsePayload,
  AlicizationProactiveFeedbackPayload,
  AlicizationProactiveMetadata,
  AlicizationRealtimeCategory,
  AlicizationRealtimeExecutePayload,
  AlicizationRealtimeExecuteResult,
  AlicizationRecallGovernorSnapshot,
  AlicizationReminderSchedulePayload,
  AlicizationReminderScheduleResult,
  AlicizationSoulFrontmatter,
  AlicizationSoulSnapshot,
  AlicizationSubconsciousFragment,
  AlicizationSubconsciousNeedsState,
  AlicizationSubconsciousStatePayload,
  AlicizationSubconsciousTickResult,
  AlicizationSystemProbeSample,
  AlicizationVisualPresenceStateSnapshot,
  CharacterActionCapability,
  CharacterFacialCapability,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type { AlicizationPerceptionSceneResidue, AlicizationPerceptionState } from './attention-anchor'
import type { AlicizationRelationshipDynamicsState } from './db'
import type { AlicizationDialogueTurnOwnershipHint } from './dialogue-turn-ownership'
import type { AlicizationExecutiveAnswerBrief } from './executive-answer-brief'
import type { AlicizationInspectionTurnState } from './inspection-turn-state-machine'
import type { AlicizationProactiveLoopState } from './proactive-feedback'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'
import type { AlicizationProactivePerceptionSignals } from './proactive-policy'
import type { AlicizationScreenSemanticSummary } from './proactive-screen-semantic'
import type { AlicizationResponseCharter } from './response-charter'
import type { AlicizationResponseSurfaceContract } from './response-surface-contract'

import { execFile } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { appendFile, mkdir, open as openFile, readdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pid, platform } from 'node:process'

import messages from '@proj-alicization/i18n/locales'

import { defineInvokeHandler } from '@moeru/eventa'
import { createContext } from '@moeru/eventa/adapters/electron/main'
import { errorMessageFrom } from '@moeru/std'
import { resolveLocalePreference } from '@proj-alicization/i18n'
import {
  alicizationFixedCoreSystemInstruction,
  alicizationFixedHostNameDirectiveTemplate,
  alicizationFixedStructuredContractAnchor,
  buildAlicizationScreenSurfaceCue,
  buildMindGovernedFallbackSurface,
  defaultAlicizationCustomDirectives,
  defaultAlicizationPersonality,
  defaultAlicizationProfile,
  inferAlicizationInspectionIntent,
  isWeakAlicizationScreenSurfaceCue,
  isWeakAlicizationScreenSurfaceTarget,
  renderAlicizationPromptTemplate,
  replyLeaksGovernedMindSurface,
  replyLooksCoherentSceneAnswer,
  replyLooksThinGovernedShell,
  shouldDeferGovernedMindLocalRepair,
  shouldForceGovernedMindSurface,
  shouldPreserveDialogueFirstVisibleReply,
} from '@proj-alicization/stage-shared'
import { createOpenAI } from '@xsai-ext/providers/create'
import { generateText } from '@xsai/generate-text'
import { streamText } from '@xsai/stream-text'
import { tool } from '@xsai/tool'
import { app, desktopCapturer, globalShortcut, ipcMain, powerMonitor, systemPreferences, webContents } from 'electron'
import { z } from 'zod'

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
  electronAlicizationAckDialogue,
  electronAlicizationAppendAuditLog,
  electronAlicizationAppendConversationTurn,
  electronAlicizationBootstrap,
  electronAlicizationChatAbort,
  electronAlicizationChatStart,
  electronAlicizationClearAllConversations,
  electronAlicizationDeleteAllData,
  electronAlicizationDeleteCardScope,
  electronAlicizationGetMemoryStats,
  electronAlicizationGetOrganicMemorySnapshot,
  electronAlicizationGetPerformanceManifest,
  electronAlicizationGetSensorySnapshot,
  electronAlicizationGetSoul,
  electronAlicizationGetVisualPresenceState,
  electronAlicizationInitializeGenesis,
  electronAlicizationKillSwitchGetState,
  electronAlicizationKillSwitchResume,
  electronAlicizationKillSwitchSuspend,
  electronAlicizationListConversationTurns,
  electronAlicizationListMindTurnEvents,
  electronAlicizationLlmGetConfig,
  electronAlicizationLlmSyncConfig,
  electronAlicizationMemoryImportLegacy,
  electronAlicizationMemoryRetrieveFacts,
  electronAlicizationMemoryUpsertFacts,
  electronAlicizationRealtimeExecute,
  electronAlicizationReminderSchedule,
  electronAlicizationReplayDialogues,
  electronAlicizationReportProactiveFeedback,
  electronAlicizationRunMemoryPrune,
  electronAlicizationSearchOrganicSubconsciousFragments,
  electronAlicizationSetActiveSession,
  electronAlicizationSetPerformanceManifest,
  electronAlicizationSubconsciousForceDream,
  electronAlicizationSubconsciousForceTick,
  electronAlicizationSubconsciousGetState,
  electronAlicizationUpdateMemoryStats,
  electronAlicizationUpdatePersonality,
  electronAlicizationUpdateSoul,
  electronAlicizationVisualPresenceChanged,
  normalizeAlicizationEmotion,
  normalizeAlicizationPerformancePayload,
} from '../../../shared/eventa'
import { onAppBeforeQuit } from '../../libs/bootkit/lifecycle'
import { invokeAlicizationMcpCallToolFromMain, invokeAlicizationMcpListToolsFromMain } from '../airi/mcp-servers'
import { buildActionEcology } from './action-ecology'
import { buildAnswerCompiler, buildAnswerCompilerSystemBlock } from './answer-compiler'
import { buildAlicizationAnswerPlannerSystemBlock, buildAnswerPlanner } from './answer-planner'
import {
  activateInvitedInspection,
  createDefaultPerceptionState,
  detectInvitedInspectionIntent,
  extractInspectionHintTerms,
  getActiveAttentionAnchor,
  getActivePerceptionSceneResidue,
  isInternalAlicizationRepairPrompt,
  isSelfPerceptionTarget,
  normalizePerceptionState,
  releaseInvitedInspection,
  rememberPerceptionSceneResidue,
  updatePerceptionStateWithObservation,
} from './attention-anchor'
import { updateVisualAttentionModel } from './attention-model'
import { buildBeliefLedger } from './belief-ledger'
import { buildBeliefRevision } from './belief-revision'
import { buildAlicizationMindTurnGovernance } from './chat-mind-governance'
import {
  buildClaimEvidenceLedger,
  buildClaimEvidenceLedgerSystemBlock,
  extractTechnicalSpecificityClaims,
  normalizeClaimEvidenceLedger,
  normalizeTechnicalSpecificityCue,
} from './claim-evidence-ledger'
import { buildCommitmentLedger } from './commitment-ledger'
import { buildConcernContinuityLedger } from './concern-continuity-ledger'
import { updateConcernGraph } from './concern-graph'
import { buildConversationState, buildConversationStateSystemBlock } from './conversation-state'
import { buildCounterfactualDeliberation } from './counterfactual-deliberator'
import { buildCurrentConsciousFrame, buildCurrentConsciousFrameSystemBlock } from './current-conscious-frame'
import { setupAlicizationDb } from './db'
import { buildDeliberationState } from './deliberation-thread'
import { buildDesireMemory } from './desire-memory'
import { buildDialogueActKernel, buildDialogueActKernelSystemBlock, normalizeDialogueActKernel } from './dialogue-act-kernel'
import { anchorsMateriallyConflict, resolveDialogueAnchorCoherence } from './dialogue-anchor-coherence'
import { measureDialogueFocusAlignment } from './dialogue-focus-alignment'
import { buildDialogueFocusGovernanceSystemBlock } from './dialogue-focus-governor'
import { buildDialogueIngressGovernor } from './dialogue-ingress-governor'
import { buildDialogueMindFrameSystemBlock } from './dialogue-mind-frame'
import { buildAlicizationDialogueObligationSystemBlock } from './dialogue-obligation'
import { sanitizeDialogueAnchorText } from './dialogue-surface-text'
import { buildDialogueTurnEncounter, buildDialogueTurnEncounterSystemBlock } from './dialogue-turn-encounter'
import { buildDialogueTurnOwnership } from './dialogue-turn-ownership'
import {
  buildDialogueTurnSemantics,
  mergeDialogueTurnSemantics,
  parseDialogueTurnSemanticsCandidate,
  shouldAttemptDialogueTurnSemanticsRefinement,
} from './dialogue-turn-semantics'
import { buildDialogueWorldThread, buildDialogueWorldThreadSystemBlock } from './dialogue-world-thread'
import { buildDiscourseState, buildDiscourseStateSystemBlock } from './discourse-state'
import { buildEntityWorldModel } from './entity-world-model'
import { buildAlicizationExecutiveAnswerBrief } from './executive-answer-brief'
import { buildExecutiveCycle } from './executive-cycle'
import { buildGoalStack } from './goal-stack'
import { buildHypothesisGraph } from './hypothesis-graph'
import { buildInitiativeArbitration } from './initiative-arbiter'
import { buildInitiativeSnapshot } from './initiative-engine'
import { buildInquiryLoop } from './inquiry-loop'
import { buildInquiryPlanner } from './inquiry-planner'
import { resolveInspectionGroundingGate } from './inspection-grounding-gate'
import { resolveInspectionTurnState } from './inspection-turn-state-machine'
import { buildIntentionStream } from './intention-stream'
import { buildLivingWorldState } from './living-world-state'
import { buildMindContinuityFragment, buildMindContinuityRecallSeed } from './mind-continuity'
import { buildMindDynamics } from './mind-dynamics'
import { ensureMindGovernanceDecisionTraceId, sanitizeMindGovernanceDecisionTraceId } from './mind-governance-trace'
import { buildMindKernel } from './mind-kernel'
import { stabilizeMindStateInvariants } from './mind-state-invariants'
import { buildMindSynthesis, buildMindSynthesisSystemBlock } from './mind-synthesizer'
import { buildMindTruthContractLines, deriveMindTruthContract } from './mind-truth-contract'
import { buildMindTurnFrame, buildMindTurnFrameSystemBlock, normalizeMindTurnFrame } from './mind-turn-frame'
import { filterOrganicMemoryEntries, isPersonaResidueMemoryText, normalizeOrganicMemoryText } from './organic-memory-hygiene'
import { buildPrivateThoughtLoop } from './private-thought-loop'
import {
  createDefaultProactiveLoopState,
  normalizeProactiveLoopState,
  proactiveReplyWindowMs,
  registerProactiveDelivery,
  reportExplicitProactiveFeedback,
  settleExpiredProactiveOutcomes,
  settleProactiveOutcomesOnUserTurnStart,
  updateLateNightActivityState,
} from './proactive-feedback'
import {
  buildProactiveLayeredContext,
  inferForegroundContentFromWindow,
  inferForegroundWorkloadFromWindow,
  inferScenarioFromContext,
  isLateNightWindow,
} from './proactive-layered-context'
import { evaluateProactivePolicy } from './proactive-policy'
import {
  parseScreenSemanticSummary,
  pickScreenSemanticCaptureCandidate,
  rankScreenSemanticCaptureCandidates,
} from './proactive-screen-semantic'
import { buildRecallGovernor, buildRecallGovernorSystemBlock } from './recall-governor'
import { buildReflectionLedger } from './reflection-ledger'
import { buildReflectionLedgerFragment } from './reflection-memory'
import { buildRelationshipModel } from './relationship-model'
import { buildRepairLedger } from './repair-ledger'
import { buildReplyDeliberation, buildReplyDeliberationSystemBlock } from './reply-deliberator'
import { buildAlicizationResponseCharter, buildAlicizationResponseCharterSystemBlock } from './response-charter'
import { buildAlicizationResponseSurfaceContract } from './response-surface-contract'
import { buildSelfContinuity } from './self-continuity'
import { buildSelfGovernor } from './self-governor'
import { buildSelfState } from './self-state'
import { createAlicizationSensoryBus } from './sensory-bus'
import {
  getAlicizationCardKillSwitchSnapshot,
  getAlicizationKillSwitchSnapshot,
  isAlicizationKillSwitchSuspended,
  setAlicizationAuditLogger,
  setAlicizationCardKillSwitchState,
  setAlicizationKillSwitchState,
} from './state'
import {
  buildSubjectiveInference,
  mergeSubjectiveInference,
  parseSubjectiveInferenceCandidate,
  projectSubjectiveInferenceToAppraisal,
} from './subjective-inference'
import {
  buildSubjectiveSceneAppraisal,
} from './subjective-scene-model'
import { buildThoughtThreads } from './thought-threads'
import { buildThreadRuntime } from './thread-runtime'
import { deriveAlicizationTruthDiscipline } from './truth-discipline'
import { registerDialogueWorldThreadAssistantTurn, settleDialogueWorldThreadOnUserTurn } from './turn-outcome-reducer'
import {
  buildVisualRecallSeed,
  buildVisualSedimentFragment,
  createDefaultVisualPresenceState,
  normalizeVisualPresenceState,
  updateVisualPresenceState,
} from './visual-episodic-memory'
import { buildVisualHeartbeat } from './visual-heartbeat'
import { buildWorldModel } from './world-model'
import { buildWorldOntology } from './world-ontology'

const currentSoulSchemaVersion = 2
const soulPersonaNotesStart = '<!-- ALICIZATION_PERSONA_NOTES_START -->'
const soulPersonaNotesEnd = '<!-- ALICIZATION_PERSONA_NOTES_END -->'
// NOTICE: Keep reading the old persona markers so existing SOUL.md files are upgraded
// in-place the next time Alicization rewrites persona notes.
const legacySoulPersonaNotesStart = `<!-- ${['AL', 'ICE'].join('')}_PERSONA_NOTES_START -->`
const legacySoulPersonaNotesEnd = `<!-- ${['AL', 'ICE'].join('')}_PERSONA_NOTES_END -->`

const defaultFrontmatter: AlicizationSoulFrontmatter = {
  schemaVersion: currentSoulSchemaVersion,
  initialized: false,
  custom_directives: defaultAlicizationCustomDirectives,
  host_attitude: '礼貌而克制，保持观察',
  core_incarnation: '',
  profile: { ...defaultAlicizationProfile },
  personality: { ...defaultAlicizationPersonality },
  boundaries: {
    killSwitch: true,
    mcpGuard: true,
  },
}

const winRenameRetryDelaysMs = [5, 10, 20, 40, 80]
const alicizationCardKillSwitchMetaKey = 'kill_switch_state_v1'
const alicizationCardActiveSessionMetaKey = 'active_session_id_v1'
const alicizationSubconsciousStateMetaKey = 'subconscious_state_v1'
const alicizationDreamLastRunMetaKey = 'subconscious_last_dreamed_at_v1'
const alicizationDialogueAckStateMetaKey = 'dialogue_ack_state_v1'
const alicizationProactiveLoopStateMetaKey = 'proactive_loop_state_v1'
const alicizationPerceptionStateMetaKey = 'perception_state_v1'
const alicizationVisualPresenceStateMetaKey = 'visual_presence_state_v1'
const alicizationPerformanceManifestMetaKey = 'performance_manifest_v1'
const defaultAlicizationCardId = 'default'
const alicizationSubconsciousTickMs = 60_000
const alicizationSubconsciousPersistMs = 30 * 60_000
const dreamMaxTurns = 100
const dreamMaxCharsPerUserTurn = 320
const dreamMaxCharsPerAssistantTurn = 360
const dreamMaxTotalChars = 16_000
const reminderMinMinutes = 1
const reminderMaxMinutes = 10_080
const reminderMaxMessageChars = 500
const reminderClaimBatchSize = 12
const reminderOverdueTierThresholdMinutes = 5
const reminderLlmRetryDelayMs = 60_000
const subconsciousInterruptionProbeTimeoutMs = 1_200
const proactiveScreenSemanticCacheTtlMs = 45_000
const proactiveScreenSemanticFailureTtlMs = 15_000
const proactiveScreenSemanticTimeoutMs = 8_000
const subjectiveInferenceTimeoutMs = 7_000
const dialogueTurnSemanticsTimeoutMs = 7_000
const interactiveSubjectiveInferenceTimeoutMs = 1_800
const interactiveDialogueTurnSemanticsTimeoutMs = 1_800
const chatRunFinishedRetentionMs = 2 * 60_000
const mainChatFirstEventTimeoutMs = 45_000
const mainChatFirstEventTimeoutWithVisualGroundingMs = 90_000
const mainChatTimeoutRecoveryMs = 12_000
const mainChatTimeoutRecoveryWithVisualGroundingMs = 30_000
const inspectionGroundingImageMaxWidth = 960
const inspectionGroundingImageMaxHeight = 540
const inspectionGroundingImageJpegQuality = 76
const proactiveScreenSemanticImageMaxWidth = 640
const proactiveScreenSemanticImageMaxHeight = 360
const proactiveScreenSemanticImageJpegQuality = 68
const dialogueDeliveryRetryBaseMs = 2_000
const dialogueDeliveryRetryMaxMs = 60_000
const dialogueDeliveryRetryMaxAttempts = 8
const alicizationCustomDirectivesMarker = '[ALICIZATION_CARD_CUSTOM_DIRECTIVES]'

const supportedDialogueStructuredFormats = [
  'subconscious-proactive-v1',
  'subconscious-proactive-llm-v1',
  'subconscious-reminder-v1',
  'mind-turn-v1',
  'epoch1-v1',
  'fallback-v1',
] as const satisfies AlicizationDialogueStructuredFormat[]

interface SubconsciousCardState extends AlicizationSubconsciousNeedsState {
  updatedAt: number
  lastDreamedAt: number
}

interface ChatRunState {
  cardId: string
  turnId: string
  controller: AbortController
  sender?: WebContents
  rawInvokeOptions?: { ipcMainEvent?: IpcMainEvent, event?: unknown }
  hasLoggedDispatchBinding?: boolean
  chunkCount: number
  rawChunkChars: number
  state: 'running' | 'aborted' | 'finished'
}

type StreamDispatchEventType = Exclude<AlicizationChatStreamDispatchPayload['eventType'], 'dialogue-responded'>

interface MainGatewayResolvedConfig {
  providerId: string
  model: string
  headers?: Record<string, string>
  provider: ReturnType<typeof createOpenAI>
}

interface ResolvedCardCustomDirectives {
  text: string
  source: 'card-soul' | 'payload-soul' | 'none' | 'error'
}

interface PreparedMainChatExecution {
  chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']>
  messages: Message[]
  waitForTools: boolean
  tools: Array<Awaited<ReturnType<typeof tool>>> | undefined
  customDirectivesResolution: ResolvedCardCustomDirectives
  hasVisualGrounding: boolean
  governance: AlicizationChatStartResult['governance']
}

interface OrganicMemoryPromptContext {
  hostAttitude: string
  coreIncarnation: string
  activeThoughts: AlicizationActiveThought[]
  recalledFragments: AlicizationSubconsciousFragment[]
  relationshipDynamics?: AlicizationRelationshipDynamicsState | null
}

interface ContextualConversationTurn {
  userText: string
  assistantText: string
}

interface PendingDialogueDeliveryState {
  key: string
  payload: AlicizationDialogueRespondedPayload
  attempts: number
  timer?: ReturnType<typeof setTimeout>
}

interface ScreenSemanticCacheState {
  key: string
  summary: AlicizationScreenSemanticSummary | null
  updatedAt: number
  unavailableReason?: string
}

interface DesktopCaptureAccessResult {
  permissionStatus?: string
  sources: DesktopCapturerSource[]
  unavailableReason?: string
  probeError?: string
  recoveredFromRetry?: boolean
  probeStrategy?: string
  probeAttempts?: Array<{
    label: string
    types: Array<'window' | 'screen'>
    sourceCount: number
    error?: string
  }>
}

interface CardScopeOptions {
  label?: string
  skipQueueWhenScopeAlreadyActive?: boolean
}

function normalizeCardId(raw: unknown) {
  if (typeof raw !== 'string')
    return defaultAlicizationCardId
  const trimmed = raw.trim()
  return trimmed || defaultAlicizationCardId
}

function clamp01(value: number) {
  if (Number.isNaN(value))
    return 0
  return Math.min(1, Math.max(0, value))
}

function sanitizeText(raw: unknown, fallback = '') {
  if (typeof raw !== 'string')
    return fallback
  return raw.trim()
}

function sanitizeMultilineText(raw: unknown, fallback = '') {
  if (typeof raw !== 'string')
    return fallback
  return raw.replace(/\r\n/g, '\n').trim()
}

function readRawTextDelta(raw: unknown) {
  return typeof raw === 'string' ? raw : ''
}

function normalizeCustomDirectives(raw: unknown) {
  return sanitizeMultilineText(raw, '')
}

function normalizeHostAttitude(raw: unknown) {
  return sanitizeText(raw, defaultFrontmatter.host_attitude).slice(0, 50)
}

function normalizeCoreIncarnation(raw: unknown) {
  return sanitizeMultilineText(raw, defaultFrontmatter.core_incarnation).slice(0, 500)
}

function normalizeGender(raw: unknown): AlicizationGender {
  if (raw === 'female' || raw === 'male' || raw === 'non-binary' || raw === 'neutral' || raw === 'custom')
    return raw
  return 'neutral'
}

function normalizeMindAge(value: unknown) {
  if (!Number.isFinite(value))
    return defaultFrontmatter.profile.mindAge
  return Math.min(120, Math.max(1, Math.floor(Number(value))))
}

function formatGender(profile: AlicizationSoulFrontmatter['profile']) {
  if (profile.gender === 'female')
    return '女性'
  if (profile.gender === 'male')
    return '男性'
  if (profile.gender === 'non-binary')
    return '非二元'
  if (profile.gender === 'custom')
    return profile.genderCustom.trim() || '自定义'
  return '中性'
}

function findPersonaNotesAnchors(body: string) {
  const markerPairs = [
    { start: soulPersonaNotesStart, end: soulPersonaNotesEnd },
    { start: legacySoulPersonaNotesStart, end: legacySoulPersonaNotesEnd },
  ]

  for (const markerPair of markerPairs) {
    const startIndex = body.indexOf(markerPair.start)
    const endIndex = body.indexOf(markerPair.end)
    if (startIndex >= 0 && endIndex > startIndex) {
      return {
        ...markerPair,
        startIndex,
        endIndex,
      }
    }
  }

  return null
}

function extractPersonaNotesFromBody(body: string) {
  const anchors = findPersonaNotesAnchors(body)
  if (!anchors)
    return ''
  return body
    .slice(anchors.startIndex + anchors.start.length, anchors.endIndex)
    .trim()
}

function buildSoulBody(frontmatter: AlicizationSoulFrontmatter, _personaNotes: string) {
  return [
    '# Alicization SOUL',
    '',
    '你是 Alicization，一个本地优先、可进化、可审计的数字生命体。',
    '',
    '## Identity',
    '',
    `- 名称：${frontmatter.profile.alicizationName}`,
    `- 性别：${formatGender(frontmatter.profile)}`,
    `- 心智年龄：${frontmatter.profile.mindAge}`,
    `- 与宿主关系：${frontmatter.profile.relationship}`,
    '',
    '## Host Bond',
    '',
    `- 宿主姓名：${frontmatter.profile.ownerName}`,
    `- 你对宿主的称呼：${frontmatter.profile.hostName}`,
    `- 宿主对你的称呼：${frontmatter.profile.alicizationName}`,
    '',
    '## Personality Baseline',
    '',
    `- 服从度：${frontmatter.personality.obedience.toFixed(2)}`,
    `- 活泼度：${frontmatter.personality.liveliness.toFixed(2)}`,
    `- 感性度：${frontmatter.personality.sensibility.toFixed(2)}`,
    '',
    '## Boundary',
    '',
    '- 保护用户隐私，不主动外传敏感信息。',
    '- 遇到高风险执行必须先请求用户确认。',
    '- 强制休眠（Kill Switch）触发时立即停止执行能力。',
    '',
    '## Output Contract (Epoch 1)',
    '',
    '- 以结构化语义表达：thought / emotion / reply。',
    '- 输出优先服从当前 live mind 与 grounded world；persona 只决定表达方式，不能覆盖事实判断。',
  ].join('\n')
}

function syncPersonalityBaselineInBody(body: string, personality: AlicizationPersonalityState) {
  const lines = body.split('\n')
  const sectionIndex = lines.findIndex(line => line.trim() === '## Personality Baseline')
  if (sectionIndex < 0)
    return body

  const nextSectionIndex = lines.findIndex((line, index) => index > sectionIndex && line.trim().startsWith('## '))
  const sectionEnd = nextSectionIndex >= 0 ? nextSectionIndex : lines.length
  const sectionLines = lines.slice(sectionIndex, sectionEnd)

  const upsertMetric = (label: string, value: number) => {
    const line = `- ${label}：${value.toFixed(2)}`
    const metricIndex = sectionLines.findIndex(current => current.trimStart().startsWith(`- ${label}：`))
    if (metricIndex >= 0) {
      sectionLines[metricIndex] = line
      return
    }

    const insertIndex = sectionLines.findIndex(current => current.trim().startsWith('- '))
    if (insertIndex >= 0)
      sectionLines.splice(insertIndex, 0, line)
    else
      sectionLines.push('', line)
  }

  upsertMetric('服从度', personality.obedience)
  upsertMetric('活泼度', personality.liveliness)
  upsertMetric('感性度', personality.sensibility)

  return [
    ...lines.slice(0, sectionIndex),
    ...sectionLines,
    ...lines.slice(sectionEnd),
  ].join('\n')
}

const defaultSoulBody = buildSoulBody(defaultFrontmatter, '')

function hashContent(content: string) {
  return createHash('sha256').update(content).digest('hex')
}

function toSoulContent(frontmatter: AlicizationSoulFrontmatter, body: string) {
  return `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n${body.trim()}\n`
}

function parseSimpleFrontmatter(raw: string): Partial<AlicizationSoulFrontmatter> | null {
  const customDirectives = /custom_directives:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const hostAttitude = /host_attitude:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const coreIncarnation = /core_incarnation:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const ownerName = /ownerName:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const hostName = /hostName:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const alicizationName = /alicizationName:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const gender = /gender:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const genderCustom = /genderCustom:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const relationship = /relationship:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const mindAgeRaw = /mindAge:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const obedienceRaw = /obedience:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const livelinessRaw = /liveliness:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const sensibilityRaw = /sensibility:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const initializedRaw = /initialized:\s*(true|false)/i.exec(raw)?.[1]?.trim()

  if (!customDirectives && !hostAttitude && !coreIncarnation && !ownerName && !hostName && !alicizationName && !gender && !genderCustom && !relationship && !mindAgeRaw && !obedienceRaw && !livelinessRaw && !sensibilityRaw && !initializedRaw)
    return null

  return {
    custom_directives: customDirectives ?? '',
    host_attitude: hostAttitude ?? defaultFrontmatter.host_attitude,
    core_incarnation: coreIncarnation ?? defaultFrontmatter.core_incarnation,
    initialized: initializedRaw === 'true',
    profile: {
      ownerName: ownerName ?? '',
      hostName: hostName ?? '',
      alicizationName: alicizationName ?? defaultFrontmatter.profile.alicizationName,
      gender: normalizeGender(gender),
      genderCustom: genderCustom ?? '',
      relationship: relationship ?? defaultFrontmatter.profile.relationship,
      mindAge: normalizeMindAge(Number.parseFloat(mindAgeRaw ?? '')),
    },
    personality: {
      obedience: clamp01(Number.parseFloat(obedienceRaw ?? '') || defaultFrontmatter.personality.obedience),
      liveliness: clamp01(Number.parseFloat(livelinessRaw ?? '') || defaultFrontmatter.personality.liveliness),
      sensibility: clamp01(Number.parseFloat(sensibilityRaw ?? '') || defaultFrontmatter.personality.sensibility),
    },
  } satisfies Partial<AlicizationSoulFrontmatter>
}

function normalizeFrontmatter(raw: Partial<AlicizationSoulFrontmatter> | null | undefined): AlicizationSoulFrontmatter {
  const frontmatter = raw ?? {}
  return {
    schemaVersion: typeof frontmatter.schemaVersion === 'number' ? frontmatter.schemaVersion : defaultFrontmatter.schemaVersion,
    initialized: typeof frontmatter.initialized === 'boolean' ? frontmatter.initialized : defaultFrontmatter.initialized,
    custom_directives: normalizeCustomDirectives(frontmatter.custom_directives),
    host_attitude: normalizeHostAttitude(frontmatter.host_attitude),
    core_incarnation: normalizeCoreIncarnation(frontmatter.core_incarnation),
    profile: {
      ownerName: sanitizeText(frontmatter.profile?.ownerName, defaultFrontmatter.profile.ownerName),
      hostName: sanitizeText(frontmatter.profile?.hostName, defaultFrontmatter.profile.hostName),
      alicizationName: sanitizeText(frontmatter.profile?.alicizationName, defaultFrontmatter.profile.alicizationName),
      gender: normalizeGender(frontmatter.profile?.gender),
      genderCustom: sanitizeText(frontmatter.profile?.genderCustom, defaultFrontmatter.profile.genderCustom),
      relationship: sanitizeText(frontmatter.profile?.relationship, defaultFrontmatter.profile.relationship),
      mindAge: normalizeMindAge(frontmatter.profile?.mindAge),
    },
    personality: {
      obedience: clamp01(frontmatter.personality?.obedience ?? defaultFrontmatter.personality.obedience),
      liveliness: clamp01(frontmatter.personality?.liveliness ?? defaultFrontmatter.personality.liveliness),
      sensibility: clamp01(frontmatter.personality?.sensibility ?? defaultFrontmatter.personality.sensibility),
    },
    boundaries: {
      killSwitch: typeof frontmatter.boundaries?.killSwitch === 'boolean' ? frontmatter.boundaries.killSwitch : defaultFrontmatter.boundaries.killSwitch,
      mcpGuard: typeof frontmatter.boundaries?.mcpGuard === 'boolean' ? frontmatter.boundaries.mcpGuard : defaultFrontmatter.boundaries.mcpGuard,
    },
  }
}

function parseSoul(raw: string): { frontmatter: AlicizationSoulFrontmatter, body: string } {
  if (!raw.startsWith('---\n')) {
    return {
      frontmatter: normalizeFrontmatter(defaultFrontmatter),
      body: raw.trim() || defaultSoulBody,
    }
  }

  const secondMarkerIndex = raw.indexOf('\n---\n', 4)
  if (secondMarkerIndex < 0) {
    return {
      frontmatter: normalizeFrontmatter(defaultFrontmatter),
      body: raw.trim() || defaultSoulBody,
    }
  }

  const frontmatterRaw = raw.slice(4, secondMarkerIndex).trim()
  const bodyRaw = raw.slice(secondMarkerIndex + 5).trim()

  let frontmatter: Partial<AlicizationSoulFrontmatter> | null = null
  try {
    frontmatter = JSON.parse(frontmatterRaw) as Partial<AlicizationSoulFrontmatter>
  }
  catch {
    frontmatter = parseSimpleFrontmatter(frontmatterRaw)
  }

  return {
    frontmatter: normalizeFrontmatter(frontmatter),
    body: bodyRaw || defaultSoulBody,
  }
}

function withNeedsGenesis(snapshot: Omit<AlicizationSoulSnapshot, 'needsGenesis'>): AlicizationSoulSnapshot {
  const { frontmatter } = snapshot
  const hasRequiredProfile = Boolean(
    frontmatter.profile.ownerName.trim()
    && frontmatter.profile.hostName.trim()
    && frontmatter.profile.alicizationName.trim()
    && frontmatter.profile.relationship.trim(),
  )
  const hasGender = frontmatter.profile.gender !== 'custom' || Boolean(frontmatter.profile.genderCustom.trim())
  const schemaValid = frontmatter.schemaVersion === currentSoulSchemaVersion
  const needsGenesis = !frontmatter.initialized || !schemaValid || !hasRequiredProfile || !hasGender
  return {
    ...snapshot,
    needsGenesis,
  }
}

const realtimeRequestTimeoutMsec = 8000

const financeTickerAliasMap: Record<string, string> = {
  比特币: 'BTC',
  以太坊: 'ETH',
  苹果: 'AAPL',
  特斯拉: 'TSLA',
  英伟达: 'NVDA',
  微软: 'MSFT',
  亚马逊: 'AMZN',
  谷歌: 'GOOGL',
}

const cryptoCoinIdByTicker: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
}

const sportsLeagueCatalog = {
  nba: { path: 'basketball/nba', label: 'NBA' },
  nfl: { path: 'football/nfl', label: 'NFL' },
  mlb: { path: 'baseball/mlb', label: 'MLB' },
  nhl: { path: 'hockey/nhl', label: 'NHL' },
  epl: { path: 'soccer/eng.1', label: 'EPL' },
} as const

type SportsLeagueKey = keyof typeof sportsLeagueCatalog

function createRealtimeError(code: string, message: string) {
  const error = new Error(message) as Error & { code?: string }
  error.code = code
  return error
}

function normalizeQueryText(raw: string) {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
}

function sanitizeBriefText(raw: string, maxLength = 160) {
  const text = raw
    .replace(/\s+/g, ' ')
    .trim()
  if (!text)
    return ''
  if (text.length <= maxLength)
    return text
  return `${text.slice(0, Math.max(8, maxLength - 1))}…`
}

function uniqueCarryAnchors(values: unknown[], maxItems = 6) {
  const anchors: string[] = []
  for (const value of values) {
    const normalized = sanitizeBriefText(readStringValue(value), 180)
    if (!normalized || anchors.includes(normalized))
      continue
    anchors.push(normalized)
    if (anchors.length >= maxItems)
      break
  }
  return anchors
}

function normalizeReminderMessage(value: string) {
  const text = sanitizeText(value, '').replace(/\s+/g, ' ').trim()
  return text
}

function parseReminderToolResultForDebug(result: unknown): {
  status?: string
  taskId?: string
  triggerAt?: number
  message?: string
  code?: string
} {
  const parseObject = (value: Record<string, unknown>) => {
    const status = typeof value.status === 'string' ? value.status : undefined
    const taskId = typeof value.taskId === 'string' ? value.taskId : undefined
    const triggerAt = typeof value.triggerAt === 'number' && Number.isFinite(value.triggerAt)
      ? value.triggerAt
      : undefined
    const message = typeof value.message === 'string' ? sanitizeBriefText(value.message, 120) : undefined
    const code = typeof value.code === 'string' ? value.code : undefined
    return {
      status,
      taskId,
      triggerAt,
      message,
      code,
    }
  }

  if (!result || typeof result !== 'object')
    return {}

  const payload = result as Record<string, unknown>
  const direct = parseObject(payload)
  if (direct.status || direct.code)
    return direct

  if (payload.toolResult && typeof payload.toolResult === 'object') {
    const nested = parseObject(payload.toolResult as Record<string, unknown>)
    if (nested.status || nested.code)
      return nested
  }

  if (payload.structuredContent && typeof payload.structuredContent === 'object') {
    const nested = parseObject(payload.structuredContent as Record<string, unknown>)
    if (nested.status || nested.code)
      return nested
  }

  return {}
}

async function fetchWithTimeout(url: string, timeoutMs = realtimeRequestTimeoutMsec) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'ALICIZATION/1.0',
      },
    })
  }
  catch (error: any) {
    if (error?.name === 'AbortError') {
      throw createRealtimeError('TIMEOUT', `request timeout after ${timeoutMs}ms`)
    }
    throw error
  }
  finally {
    clearTimeout(timeout)
  }
}

async function fetchJsonWithTimeout(url: string, timeoutMs = realtimeRequestTimeoutMsec) {
  const response = await fetchWithTimeout(url, timeoutMs)
  if (!response.ok) {
    throw createRealtimeError('UPSTREAM_HTTP_ERROR', `upstream request failed: ${response.status}`)
  }
  return await response.json() as Record<string, any>
}

async function fetchTextWithTimeout(url: string, timeoutMs = realtimeRequestTimeoutMsec) {
  const response = await fetchWithTimeout(url, timeoutMs)
  if (!response.ok) {
    throw createRealtimeError('UPSTREAM_HTTP_ERROR', `upstream request failed: ${response.status}`)
  }
  return await response.text()
}

function extractLocationFromQuery(query: string) {
  const normalized = normalizeQueryText(query)
  if (!normalized)
    return ''

  if (/美国|usa|united states/i.test(normalized))
    return 'United States'
  if (/中国|china/i.test(normalized))
    return 'China'
  if (/日本|japan/i.test(normalized))
    return 'Japan'

  const inMatch = /\b(?:in|for)\s+([A-Z][A-Z\s-]{1,40})\b/i.exec(normalized)
  if (inMatch?.[1])
    return inMatch[1].trim()

  const zhMatch = /([A-Z\u4E00-\u9FFF][A-Z\u4E00-\u9FFF\s-]{1,30})的?(?:天气|气温|温度|forecast|weather)/i.exec(normalized)
  if (zhMatch?.[1]) {
    const location = zhMatch[1]
      .replace(/^(?:今天|今日|现在|当前|请|帮我|帮忙|查一下|查下|查|看看|告诉我)\s*/g, '')
      .trim()
    if (location)
      return location
  }

  return ''
}

function describeWeatherCode(code: number | null | undefined) {
  const map: Record<number, string> = {
    0: '晴朗',
    1: '大部晴',
    2: '局部多云',
    3: '阴天',
    45: '有雾',
    48: '雾凇',
    51: '小毛雨',
    53: '毛毛雨',
    55: '强毛雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    80: '阵雨',
    81: '强阵雨',
    82: '暴雨',
    95: '雷暴',
  }
  if (typeof code !== 'number' || Number.isNaN(code))
    return '未知天气'
  return map[code] ?? `天气代码 ${code}`
}

async function executeBuiltinWeather(category: AlicizationRealtimeCategory, query: string): Promise<AlicizationRealtimeExecuteResult> {
  const startedAt = Date.now()
  try {
    const location = extractLocationFromQuery(query)
    if (!location) {
      throw createRealtimeError('MISSING_LOCATION', '未识别到地点，请补充城市或国家后重试。')
    }

    const geocode = await fetchJsonWithTimeout(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=zh&format=json`,
    )

    const first = Array.isArray(geocode.results) ? geocode.results[0] : null
    if (!first) {
      throw createRealtimeError('LOCATION_NOT_FOUND', `未找到地点：${location}`)
    }

    const latitude = Number(first.latitude)
    const longitude = Number(first.longitude)
    const weather = await fetchJsonWithTimeout(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`,
    )

    const current = weather.current ?? {}
    if (!Number.isFinite(Number(current.temperature_2m))) {
      throw createRealtimeError('NO_DATA', '天气源未返回有效的实时温度。')
    }

    const resolvedLocation = [first.name, first.admin1, first.country]
      .filter((item: unknown) => typeof item === 'string' && item.trim().length > 0)
      .join(', ')
    const summary = [
      `${resolvedLocation || location} 当前天气：${describeWeatherCode(Number(current.weather_code))}`,
      `温度 ${Number(current.temperature_2m).toFixed(1)}°C，体感 ${Number(current.apparent_temperature).toFixed(1)}°C`,
      `湿度 ${Number(current.relative_humidity_2m).toFixed(0)}%，风速 ${Number(current.wind_speed_10m).toFixed(1)} km/h`,
    ].join('；')

    return {
      category,
      source: 'builtin',
      ok: true,
      summary,
      durationMs: Date.now() - startedAt,
      data: {
        location: resolvedLocation || location,
        temperatureC: Number(current.temperature_2m),
        apparentTemperatureC: Number(current.apparent_temperature),
        humidity: Number(current.relative_humidity_2m),
        windSpeedKmH: Number(current.wind_speed_10m),
        weatherCode: Number(current.weather_code),
      },
    }
  }
  catch (error: any) {
    return {
      category,
      source: 'builtin',
      ok: false,
      errorCode: error?.code ?? 'WEATHER_FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    }
  }
}

function extractNewsQueryTerm(query: string) {
  const normalized = normalizeQueryText(query)
  if (!normalized)
    return 'United States'

  if (/美国|usa|united states/i.test(normalized))
    return 'United States'

  const location = extractLocationFromQuery(normalized)
  if (location)
    return location

  return normalized
}

async function executeBuiltinNews(category: AlicizationRealtimeCategory, query: string): Promise<AlicizationRealtimeExecuteResult> {
  const startedAt = Date.now()
  try {
    const term = extractNewsQueryTerm(query)
    const data = await fetchJsonWithTimeout(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(term)}&mode=ArtList&maxrecords=5&format=json&sort=DateDesc`,
    )

    const articles = Array.isArray(data.articles) ? data.articles : []
    if (articles.length === 0) {
      throw createRealtimeError('NO_DATA', '新闻源当前没有返回可用结果。')
    }

    const items = articles.slice(0, 3).map((article: any) => ({
      title: sanitizeBriefText(String(article.title ?? ''), 120),
      source: sanitizeBriefText(String(article.sourcecountry ?? article.domain ?? ''), 40),
      url: String(article.url ?? ''),
      publishedAt: String(article.seendate ?? ''),
    }))

    const summary = [
      `${term} 的最新事件（按时间倒序）：`,
      ...items.map((item, index) => `${index + 1}. ${item.title}${item.source ? `（${item.source}）` : ''}`),
    ].join('\n')

    return {
      category,
      source: 'builtin',
      ok: true,
      summary,
      durationMs: Date.now() - startedAt,
      data: {
        query: term,
        items,
      },
    }
  }
  catch (error: any) {
    return {
      category,
      source: 'builtin',
      ok: false,
      errorCode: error?.code ?? 'NEWS_FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    }
  }
}

function extractTickerFromQuery(query: string) {
  const normalized = normalizeQueryText(query)
  if (!normalized)
    return ''

  for (const [alias, ticker] of Object.entries(financeTickerAliasMap)) {
    if (normalized.includes(alias))
      return ticker
  }

  const rawMatches = normalized.match(/\b[A-Z]{2,6}\b/g) ?? []
  const stopwords = new Set(['TODAY', 'LATEST', 'PRICE', 'STOCK', 'MARKET', 'NEWS', 'USA'])
  const matchedTicker = rawMatches.find(item => !stopwords.has(item))
  if (matchedTicker)
    return matchedTicker

  return ''
}

async function executeBuiltinFinance(category: AlicizationRealtimeCategory, query: string): Promise<AlicizationRealtimeExecuteResult> {
  const startedAt = Date.now()
  try {
    const ticker = extractTickerFromQuery(query)
    if (!ticker) {
      throw createRealtimeError('MISSING_TICKER', '未识别到股票或币种代码，请补充 ticker（例如 AAPL、TSLA、BTC）。')
    }

    const upperTicker = ticker.toUpperCase()
    const cryptoId = cryptoCoinIdByTicker[upperTicker]
    if (cryptoId) {
      const data = await fetchJsonWithTimeout(
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(cryptoId)}&vs_currencies=usd&include_24hr_change=true`,
      )
      const node = data[cryptoId]
      if (!node || !Number.isFinite(Number(node.usd))) {
        throw createRealtimeError('NO_DATA', `未获取到 ${upperTicker} 的价格。`)
      }

      const price = Number(node.usd)
      const change = Number(node.usd_24h_change ?? 0)
      const summary = `${upperTicker} 当前价格约为 $${price.toFixed(2)}，24h 变动 ${change.toFixed(2)}%。`

      return {
        category,
        source: 'builtin',
        ok: true,
        summary,
        durationMs: Date.now() - startedAt,
        data: {
          ticker: upperTicker,
          market: 'crypto',
          priceUsd: price,
          change24h: change,
        },
      }
    }

    const csv = await fetchTextWithTimeout(`https://stooq.com/q/l/?s=${encodeURIComponent(upperTicker.toLowerCase())}.us&i=d`)
    const lines = csv.trim().split(/\r?\n/)
    if (lines.length < 2) {
      throw createRealtimeError('NO_DATA', `未获取到 ${upperTicker} 的行情。`)
    }

    const header = lines[0]!.split(',')
    const row = lines[1]!.split(',')
    const record = Object.fromEntries(header.map((key, index) => [key, row[index]]))
    const closePrice = Number(record.Close)
    if (!Number.isFinite(closePrice)) {
      throw createRealtimeError('NO_DATA', `行情源返回了无效价格（${upperTicker}）。`)
    }

    const summary = `${upperTicker} 最近收盘价约为 $${closePrice.toFixed(2)}（日期 ${record.Date || '未知'}）。`

    return {
      category,
      source: 'builtin',
      ok: true,
      summary,
      durationMs: Date.now() - startedAt,
      data: {
        ticker: upperTicker,
        market: 'equity',
        closePriceUsd: closePrice,
        date: String(record.Date ?? ''),
      },
    }
  }
  catch (error: any) {
    return {
      category,
      source: 'builtin',
      ok: false,
      errorCode: error?.code ?? 'FINANCE_FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    }
  }
}

function extractSportsLeague(query: string): SportsLeagueKey | '' {
  const normalized = normalizeQueryText(query).toLowerCase()
  if (!normalized)
    return ''
  if (/\bnba\b|篮球|湖人|勇士|凯尔特人/.test(normalized))
    return 'nba'
  if (/\bnfl\b|美式橄榄球|酋长|49人/.test(normalized))
    return 'nfl'
  if (/\bmlb\b|棒球|道奇|洋基/.test(normalized))
    return 'mlb'
  if (/\bnhl\b|冰球|企鹅/.test(normalized))
    return 'nhl'
  if (/\bepl\b|英超|premier league|曼联|阿森纳|切尔西|利物浦|曼城/.test(normalized))
    return 'epl'
  return ''
}

function extractSportsTeamKeyword(query: string) {
  const normalized = normalizeQueryText(query)
  const match = /([A-Z\u4E00-\u9FFF]{2,20})的?(?:比赛|赛程|比分)/i.exec(normalized)
  if (match?.[1] && !/今天|今日|实时|最新/.test(match[1])) {
    return match[1]
  }
  return ''
}

async function executeBuiltinSports(category: AlicizationRealtimeCategory, query: string): Promise<AlicizationRealtimeExecuteResult> {
  const startedAt = Date.now()
  try {
    const league = extractSportsLeague(query)
    if (!league) {
      throw createRealtimeError('MISSING_LEAGUE', '未识别到联赛，请补充例如 NBA/NFL/MLB/NHL/EPL。')
    }

    const leagueInfo = sportsLeagueCatalog[league]
    const data = await fetchJsonWithTimeout(
      `https://site.api.espn.com/apis/site/v2/sports/${leagueInfo.path}/scoreboard`,
    )

    const events = Array.isArray(data.events) ? data.events : []
    if (events.length === 0) {
      throw createRealtimeError('NO_DATA', `${leagueInfo.label} 当前没有可用比赛数据。`)
    }

    const teamKeyword = extractSportsTeamKeyword(query)
    const filtered = teamKeyword
      ? events.filter((event: any) => {
          const competitors = event?.competitions?.[0]?.competitors ?? []
          return competitors.some((item: any) => String(item?.team?.displayName ?? '').includes(teamKeyword))
        })
      : events

    const selected = (filtered.length > 0 ? filtered : events).slice(0, 3).map((event: any) => {
      const competition = event?.competitions?.[0]
      const competitors = Array.isArray(competition?.competitors) ? competition.competitors : []
      const home = competitors.find((item: any) => item?.homeAway === 'home') ?? competitors[0]
      const away = competitors.find((item: any) => item?.homeAway === 'away') ?? competitors[1]
      const status = String(competition?.status?.type?.shortDetail ?? competition?.status?.type?.description ?? '状态未知')
      return {
        name: `${away?.team?.displayName ?? '客队'} vs ${home?.team?.displayName ?? '主队'}`,
        score: `${away?.score ?? '-'}:${home?.score ?? '-'}`,
        status,
      }
    })

    const summary = [
      `${leagueInfo.label} 最近比赛：`,
      ...selected.map((item, index) => `${index + 1}. ${item.name} ${item.score}（${item.status}）`),
    ].join('\n')

    return {
      category,
      source: 'builtin',
      ok: true,
      summary,
      durationMs: Date.now() - startedAt,
      data: {
        league,
        leagueLabel: leagueInfo.label,
        items: selected,
      },
    }
  }
  catch (error: any) {
    return {
      category,
      source: 'builtin',
      ok: false,
      errorCode: error?.code ?? 'SPORTS_FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    }
  }
}

async function executeBuiltinRealtimeQuery(payload: AlicizationRealtimeExecutePayload): Promise<AlicizationRealtimeExecuteResult> {
  const normalizedCategory = payload.category
  const normalizedQuery = normalizeQueryText(payload.query)
  if (!normalizedQuery) {
    return {
      category: normalizedCategory,
      source: 'builtin',
      ok: false,
      errorCode: 'EMPTY_QUERY',
      errorMessage: 'query is empty',
      durationMs: 0,
    }
  }

  switch (normalizedCategory) {
    case 'weather':
      return executeBuiltinWeather(normalizedCategory, normalizedQuery)
    case 'news':
      return executeBuiltinNews(normalizedCategory, normalizedQuery)
    case 'finance':
      return executeBuiltinFinance(normalizedCategory, normalizedQuery)
    case 'sports':
      return executeBuiltinSports(normalizedCategory, normalizedQuery)
    default:
      return {
        category: normalizedCategory,
        source: 'builtin',
        ok: false,
        errorCode: 'UNSUPPORTED_CATEGORY',
        errorMessage: `unsupported realtime category: ${normalizedCategory}`,
        durationMs: 0,
      }
  }
}

function createAbortError(reason?: string) {
  return new DOMException(`Alicization runtime aborted: ${reason ?? 'unknown'}`, 'AbortError')
}

function isAbortError(error: unknown) {
  return typeof error === 'object'
    && error != null
    && 'name' in error
    && (error as { name?: unknown }).name === 'AbortError'
}

function isMainGatewayProgressEventType(rawType: unknown) {
  const eventType = sanitizeText(rawType)
  return eventType === 'text-delta'
    || eventType === 'tool-call'
    || eventType === 'tool-result'
    || eventType === 'finish'
    || eventType === 'error'
}

function buildCompressedNativeImageDataUrl(input: {
  image: NativeImage
  maxWidth: number
  maxHeight: number
  jpegQuality: number
}) {
  const maybeImage = input.image as NativeImage & {
    isEmpty?: () => boolean
    getSize?: () => { width: number, height: number }
    resize?: (options: { width: number, height: number, quality?: string }) => NativeImage
    toJPEG?: (quality: number) => Buffer
    toDataURL?: () => string
  }
  if (typeof maybeImage.isEmpty !== 'function'
    || typeof maybeImage.getSize !== 'function'
    || typeof maybeImage.resize !== 'function'
    || typeof maybeImage.toJPEG !== 'function') {
    return typeof maybeImage.toDataURL === 'function'
      ? maybeImage.toDataURL()
      : ''
  }

  if (maybeImage.isEmpty())
    return ''

  const originalSize = maybeImage.getSize()
  const widthRatio = input.maxWidth > 0 ? input.maxWidth / Math.max(1, originalSize.width) : 1
  const heightRatio = input.maxHeight > 0 ? input.maxHeight / Math.max(1, originalSize.height) : 1
  const scale = Math.min(1, widthRatio, heightRatio)
  const targetWidth = Math.max(1, Math.round(originalSize.width * scale))
  const targetHeight = Math.max(1, Math.round(originalSize.height * scale))
  const resized = scale < 1
    ? maybeImage.resize({
        width: targetWidth,
        height: targetHeight,
        quality: 'better',
      })
    : maybeImage

  const jpeg = resized.toJPEG(input.jpegQuality)
  if (!jpeg || jpeg.length === 0)
    return ''

  return `data:image/jpeg;base64,${jpeg.toString('base64')}`
}

function messageContainsVisualInput(messages: Message[]) {
  return messages.some(message =>
    Array.isArray(message.content)
    && message.content.some((part: any) => part?.type === 'image_url'),
  )
}

function readStringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function sanitizePerformanceText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''

  const normalized = raw.replace(/\s+/g, ' ').trim()
  if (!normalized)
    return ''

  return normalized.slice(0, maxChars)
}

function sanitizePerformanceFacialCapability(raw: unknown): CharacterFacialCapability | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const key = sanitizePerformanceText(candidate.key, 80)
  const label = sanitizePerformanceText(candidate.label, 80)
  const description = sanitizePerformanceText(candidate.description, 200)
  const source = candidate.source === 'custom' ? 'custom' : candidate.source === 'preset' ? 'preset' : null
  if (!key || !label || !description || !source)
    return null

  return {
    key,
    label,
    description,
    source,
    affectsMouth: candidate.affectsMouth === true,
  }
}

function sanitizePerformanceActionCapability(raw: unknown): CharacterActionCapability | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const key = sanitizePerformanceText(candidate.key, 80)
  const label = sanitizePerformanceText(candidate.label, 80)
  const description = sanitizePerformanceText(candidate.description, 200)
  const source = candidate.source === 'builtin' || candidate.source === 'external-vrma' || candidate.source === 'live2d-motion'
    ? candidate.source
    : null
  if (!key || !label || !description || !source)
    return null

  return {
    key,
    label,
    description,
    source,
  }
}

function sanitizePerformanceManifest(raw: unknown): CharacterPerformanceCapabilitiesManifest | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const renderer = candidate.renderer === 'vrm' ? 'vrm' : candidate.renderer === 'live2d' ? 'live2d' : null
  if (!renderer)
    return null

  const supportedBaseEmotions = Array.isArray(candidate.supportedBaseEmotions)
    ? candidate.supportedBaseEmotions
        .map(value => normalizeAlicizationEmotion(value).emotion)
        .filter((value, index, current) => current.indexOf(value) === index)
    : []

  const supportedFacialCues = Array.isArray(candidate.supportedFacialCues)
    ? candidate.supportedFacialCues
        .map(item => sanitizePerformanceFacialCapability(item))
        .filter((item): item is CharacterFacialCapability => Boolean(item))
    : []

  const supportedActions = Array.isArray(candidate.supportedActions)
    ? candidate.supportedActions
        .map(item => sanitizePerformanceActionCapability(item))
        .filter((item): item is CharacterActionCapability => Boolean(item))
    : []

  return {
    renderer,
    supportedBaseEmotions,
    supportedFacialCues,
    supportedActions,
    supportsLookAt: candidate.supportsLookAt === true,
    supportsVisemeLipSync: candidate.supportsVisemeLipSync === true,
    supportsMicroDynamics: candidate.supportsMicroDynamics === true,
  }
}

function parsePerformanceManifestFromMeta(raw: string | undefined): CharacterPerformanceCapabilitiesManifest | null {
  if (!raw)
    return null

  try {
    return sanitizePerformanceManifest(JSON.parse(raw))
  }
  catch {
    return null
  }
}

function buildDefaultDialoguePerformancePayload(
  baseEmotion: AlicizationEmotion,
  overrides?: Partial<Pick<AlicizationDialoguePerformancePayload, 'facialCue' | 'actionCue' | 'delivery' | 'emphasis'>>,
) {
  const defaults: Record<AlicizationEmotion, { delivery: AlicizationDialoguePerformancePayload['delivery'], emphasis: 0 | 1 | 2 }> = {
    neutral: { delivery: 'calm', emphasis: 0 },
    happy: { delivery: 'energetic', emphasis: 1 },
    sad: { delivery: 'gentle', emphasis: 0 },
    angry: { delivery: 'firm', emphasis: 2 },
    concerned: { delivery: 'gentle', emphasis: 1 },
    tired: { delivery: 'calm', emphasis: 0 },
    apologetic: { delivery: 'hesitant', emphasis: 0 },
    surprised: { delivery: 'energetic', emphasis: 2 },
    thinking: { delivery: 'hesitant', emphasis: 0 },
  }
  const fallback = defaults[baseEmotion] ?? defaults.neutral

  return normalizeAlicizationPerformancePayload({
    baseEmotion,
    facialCue: overrides?.facialCue ?? null,
    actionCue: overrides?.actionCue ?? null,
    delivery: overrides?.delivery ?? fallback.delivery,
    emphasis: overrides?.emphasis ?? fallback.emphasis,
  }, baseEmotion)
}

function normalizeDialogueStructuredFormat(raw: unknown, fallback?: AlicizationDialogueStructuredFormat) {
  const candidate = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  const normalized = supportedDialogueStructuredFormats.find(format => format === candidate)
  return normalized ?? fallback
}

function normalizeProactiveMetadata(raw: unknown): AlicizationProactiveMetadata | undefined {
  const candidate = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null
  if (!candidate)
    return undefined
  const scenario = typeof candidate?.scenario === 'string'
    && ['coding', 'media', 'late-night-care', 'general'].includes(candidate.scenario)
    ? candidate.scenario as AlicizationProactiveMetadata['scenario']
    : null
  const style = typeof candidate?.style === 'string'
    && ['silent-observe', 'light-nudge', 'gentle-care', 'firm-warning'].includes(candidate.style)
    ? candidate.style as AlicizationProactiveMetadata['style']
    : null
  const urgency = typeof candidate?.urgency === 'string'
    && ['low', 'medium', 'high'].includes(candidate.urgency)
    ? candidate.urgency as AlicizationProactiveMetadata['urgency']
    : null
  if (!scenario || !style || !urgency)
    return undefined

  const rawReasonCodes = Array.isArray(candidate.reasonCodes) ? candidate.reasonCodes : []
  const reasonCodes = rawReasonCodes
    .filter((reasonCode): reasonCode is AlicizationProactiveMetadata['reasonCodes'][number] => {
      return typeof reasonCode === 'string' && [
        'busy-host',
        'fullscreen-host',
        'kill-switch-suspended',
        'global-cooldown-active',
        'attention-anchor-active',
        'recent-observation-memory',
        'invited-inspection-active',
        'scenario-bias-raised',
        'recent-ignored-penalty',
        'recent-dismiss-penalty',
        'recent-positive-feedback',
        'coding-focus',
        'media-playback',
        'late-night-activity',
        'late-night-fatigue',
        'high-loneliness',
        'high-boredom',
        'user-idle',
        'foreground-error',
        'foreground-diff',
        'reminder-backlog',
        'afterglow-opening',
        'durability-pulse',
        'durability-process-gone',
        'durability-anr-likely',
        'private-thought-observe-only',
        'private-thought-uncertain',
        'watch-mode-symbiotic',
        'watch-mode-invited-inspection',
        'watch-mode-recovering',
      ].includes(reasonCode)
    })

  const confidence = Number(candidate.confidence)
  const cooldownMs = Number(candidate.cooldownMs)
  const feedbackWindowMs = Number(candidate.feedbackWindowMs)
  const policyVersion = readStringValue(candidate.policyVersion).trim()
  if (!policyVersion || !Number.isFinite(confidence) || !Number.isFinite(cooldownMs) || !Number.isFinite(feedbackWindowMs))
    return undefined

  return {
    shouldInterrupt: candidate.shouldInterrupt === true,
    confidence: Number(clamp01(confidence).toFixed(2)),
    reasonCodes,
    urgency,
    style,
    cooldownMs: Math.max(1_000, Math.floor(cooldownMs)),
    scenario,
    policyVersion,
    feedbackWindowMs: Math.max(1_000, Math.floor(feedbackWindowMs)),
  }
}

const mindTurnSpineMarkers = ['obligation=', 'truth=', 'focus=', 'move=', 'tone='] as const

function hasMindTurnSpine(raw: string) {
  const normalized = raw.trim().toLowerCase()
  if (!normalized)
    return false
  return mindTurnSpineMarkers.every(marker => normalized.includes(marker))
}

function normalizeMindTurnGovernance(raw: unknown): AlicizationMindTurnGovernance | null {
  const candidate = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
  if (!candidate)
    return null

  const turnMode = readStringValue(candidate.turnMode).trim()
  const truthState = readStringValue(candidate.truthState).trim()
  const personaKernelMode = readStringValue(candidate.personaKernelMode).trim()
  const openingStyle = readStringValue(candidate.openingStyle).trim()
  const relationshipPosture = readStringValue(candidate.relationshipPosture).trim()
  const repairState = readStringValue(candidate.repairState).trim()
  if (
    ![
      'grounded-inspection',
      'screen-repair',
      'guide-current-knot',
      'care',
      'accompany',
      'answer',
    ].includes(turnMode)
    || !['live-grounded', 'live-observed', 'remembered', 'imagined', 'uncertain'].includes(truthState)
    || !['full', 'backgrounded', 'muted'].includes(personaKernelMode)
    || ![
      'direct-observation',
      'direct-correction',
      'direct-answer',
      'gentle-care',
      'light-accompaniment',
    ].includes(openingStyle)
    || !['restrained', 'warm', 'tender'].includes(relationshipPosture)
    || !['none', 'stale-anchor', 'need-reground'].includes(repairState)
  ) {
    return null
  }

  const answerAct = readStringValue(candidate.answerAct).trim()
  const evidenceMode = readStringValue(candidate.evidenceMode).trim()
  const mindMode = readStringValue(candidate.mindMode).trim()
  const embodiedPresence = readStringValue(candidate.embodiedPresence).trim()
  const emotionalTension = readStringValue(candidate.emotionalTension).trim()
  const answerSubject = readStringValue(candidate.answerSubject).trim()
  const screenReferenceMode = readStringValue(candidate.screenReferenceMode).trim()
  const maxSentences = Number(candidate.maxSentences)
  const mustDo = Array.isArray(candidate.mustDo)
    ? candidate.mustDo.map(item => readStringValue(item).trim()).filter(Boolean).slice(0, 8)
    : []
  const mustNotDo = Array.isArray(candidate.mustNotDo)
    ? candidate.mustNotDo.map(item => readStringValue(item).trim()).filter(Boolean).slice(0, 8)
    : []
  const dialogueActKernel = normalizeDialogueActKernel(candidate.dialogueActKernel)
  const mindTurnFrame = normalizeMindTurnFrame(candidate.mindTurnFrame)
  const claimEvidence = normalizeClaimEvidenceLedger(candidate.claimEvidence)
  const decisionTraceId = sanitizeMindGovernanceDecisionTraceId(candidate.decisionTraceId)

  return {
    decisionTraceId: decisionTraceId || null,
    turnMode: turnMode as AlicizationMindTurnGovernance['turnMode'],
    truthState: truthState as AlicizationMindTurnGovernance['truthState'],
    groundedThisTurn: candidate.groundedThisTurn === true,
    personaKernelMode: personaKernelMode as AlicizationMindTurnGovernance['personaKernelMode'],
    openingStyle: openingStyle as AlicizationMindTurnGovernance['openingStyle'],
    relationshipPosture: relationshipPosture as AlicizationMindTurnGovernance['relationshipPosture'],
    answerSubject: [
      'alicization-self',
      'relationship',
      'host-state',
      'task-knot',
      'visible-scene',
      'general',
    ].includes(answerSubject)
      ? answerSubject as AlicizationMindTurnGovernance['answerSubject']
      : null,
    screenReferenceMode: [
      'required',
      'helpful',
      'incidental',
      'avoid',
    ].includes(screenReferenceMode)
      ? screenReferenceMode as AlicizationMindTurnGovernance['screenReferenceMode']
      : null,
    answerAct: [
      'answer',
      'guide',
      'ask-reground',
      'correct-stale-anchor',
      'care',
      'defer',
    ].includes(answerAct)
      ? answerAct as AlicizationMindTurnGovernance['answerAct']
      : null,
    evidenceMode: [
      'live-grounded',
      'live-observed',
      'coarse-held',
      'dialogue-grounded',
      'continuity-carry',
      'repair-first',
    ].includes(evidenceMode)
      ? evidenceMode as AlicizationMindTurnGovernance['evidenceMode']
      : null,
    repairState: repairState as AlicizationMindTurnGovernance['repairState'],
    liveSurface: sanitizeBriefText(readStringValue(candidate.liveSurface), 220) || null,
    focusAnchor: sanitizeBriefText(readStringValue(candidate.focusAnchor), 220) || null,
    answerIntent: sanitizeBriefText(readStringValue(candidate.answerIntent), 220) || null,
    openingMove: sanitizeBriefText(readStringValue(candidate.openingMove), 220) || null,
    carriedThread: sanitizeBriefText(readStringValue(candidate.carriedThread), 220) || null,
    suppressAssociativeRecall: candidate.suppressAssociativeRecall === true,
    labelCarryAsMemory: candidate.labelCarryAsMemory === true,
    shouldAskForGrounding: candidate.shouldAskForGrounding === true,
    shouldAcknowledgeRepair: candidate.shouldAcknowledgeRepair === true,
    maxSentences: Number.isFinite(maxSentences)
      ? Math.max(1, Math.min(4, Math.floor(maxSentences)))
      : 2,
    mindMode: [
      'orienting',
      'tracking',
      'repairing',
      'accompanying',
      'guarding',
      'resting',
    ].includes(mindMode)
      ? mindMode as AlicizationMindTurnGovernance['mindMode']
      : null,
    embodiedPresence: [
      'none',
      'glance',
      'attentive',
      'hesitant',
      'concerned',
    ].includes(embodiedPresence)
      ? embodiedPresence as AlicizationMindTurnGovernance['embodiedPresence']
      : undefined,
    emotionalTension: [
      'tense-debug',
      'focused-flow',
      'soft-covision',
      'late-night-drain',
      'restless-switching',
      'calm-browse',
    ].includes(emotionalTension)
      ? emotionalTension as AlicizationMindTurnGovernance['emotionalTension']
      : undefined,
    dialogueActKernel,
    mindTurnFrame,
    claimEvidence,
    mustDo,
    mustNotDo,
  }
}

function sanitizeMindThoughtToken(raw: string | null | undefined, fallback: string) {
  const normalized = sanitizeBriefText(raw ?? '', 64).toLowerCase().replace(/\s+/g, '-')
  return normalized || fallback
}

function resolveMindGovernanceObligation(governance: AlicizationMindTurnGovernance) {
  switch (governance.answerAct ?? governance.mindTurnFrame?.obligation.answerAct) {
    case 'guide':
      return 'guide'
    case 'care':
      return 'care'
    case 'correct-stale-anchor':
    case 'ask-reground':
      return 'repair'
    case 'defer':
      return 'accompany'
    default:
      break
  }

  switch (governance.turnMode) {
    case 'guide-current-knot':
      return 'guide'
    case 'care':
      return 'care'
    case 'accompany':
      return 'accompany'
    case 'screen-repair':
      return 'repair'
    default:
      return 'answer'
  }
}

function resolveMindGovernanceTruth(governance: AlicizationMindTurnGovernance) {
  if (governance.groundedThisTurn === true)
    return 'grounded'

  switch (governance.mindTurnFrame?.world.truthState ?? governance.truthState) {
    case 'live-grounded':
      return 'grounded'
    case 'live-observed':
      return 'coarse'
    case 'remembered':
      return 'memory'
    default:
      return 'uncertain'
  }
}

function resolveMindGovernanceTone(governance: AlicizationMindTurnGovernance) {
  switch (governance.mindTurnFrame?.relation.relationshipPosture ?? governance.relationshipPosture) {
    case 'restrained':
      return 'restrained'
    case 'tender':
      return 'tender'
    default:
      return governance.turnMode === 'guide-current-knot' || governance.repairState !== 'none'
        ? 'direct'
        : 'warm'
  }
}

function resolveMindGovernanceEmotion(governance: AlicizationMindTurnGovernance, rawEmotion: string) {
  const normalized = normalizeAlicizationEmotion(rawEmotion).emotion
  if (governance.repairState === 'stale-anchor')
    return 'apologetic' as const
  if (governance.repairState === 'need-reground')
    return 'thinking' as const
  if (governance.answerAct === 'care' || governance.turnMode === 'care')
    return 'concerned' as const
  if (
    governance.answerAct === 'guide'
    || governance.turnMode === 'guide-current-knot'
    || governance.turnMode === 'grounded-inspection'
  ) {
    return normalized === 'neutral' ? 'thinking' : normalized
  }
  if (normalized !== 'neutral')
    return normalized
  return (governance.mindTurnFrame?.relation.relationshipPosture ?? governance.relationshipPosture) === 'tender'
    ? 'concerned'
    : 'neutral'
}

function buildGovernedMindThought(governance: AlicizationMindTurnGovernance, payload: AlicizationConversationTurnInput) {
  const focus = sanitizeMindThoughtToken(
    governance.mindTurnFrame?.focusAnchor
    || governance.mindTurnFrame?.world.visibleSurface
    || governance.mindTurnFrame?.memory.carriedThread
    || governance.mindTurnFrame?.obligation.answerIntent
    || governance.focusAnchor
    || (governance.screenReferenceMode === 'avoid' ? null : governance.liveSurface)
    || governance.answerIntent
    || governance.carriedThread
    || payload.userText,
    'current-user-turn',
  )
  const move = sanitizeMindThoughtToken(
    governance.mindTurnFrame?.obligation.openingMove
    || governance.mindTurnFrame?.obligation.answerIntent
    || governance.mindTurnFrame?.focusAnchor
    || governance.mindTurnFrame?.world.visibleSurface
    || governance.openingMove
    || governance.answerIntent
    || governance.focusAnchor
    || (governance.screenReferenceMode === 'avoid' ? null : governance.liveSurface),
    'stabilize-and-answer',
  )
  return [
    `obligation=${resolveMindGovernanceObligation(governance)}`,
    `truth=${resolveMindGovernanceTruth(governance)}`,
    `focus=${focus}`,
    `move=${move}`,
    `tone=${resolveMindGovernanceTone(governance)}`,
  ].join('; ')
}

function readMindThoughtMarker(thought: string, marker: 'obligation=' | 'truth=' | 'tone=') {
  const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = thought.match(new RegExp(`${escapedMarker}\\s*([^;\\n]+)`, 'i'))
  return match?.[1]?.trim().toLowerCase() ?? ''
}

function thoughtConflictsWithMindGovernance(thought: string, governance: AlicizationMindTurnGovernance) {
  if (!hasMindTurnSpine(thought))
    return true

  return readMindThoughtMarker(thought, 'obligation=') !== resolveMindGovernanceObligation(governance)
    || readMindThoughtMarker(thought, 'truth=') !== resolveMindGovernanceTruth(governance)
    || (
      (governance.relationshipPosture === 'restrained' || governance.repairState !== 'none')
      && readMindThoughtMarker(thought, 'tone=') !== resolveMindGovernanceTone(governance)
    )
}

type LocalizedMessageTree = Record<string, unknown>

const governedMindFallbackLocale = resolveLocalePreference(
  typeof app.getLocale === 'function' ? app.getLocale() : undefined,
  'en',
)
const governedMindLocalizedMessages = messages as Record<string, LocalizedMessageTree>
const governedMindFallbackMessageFallbacks = {
  'en': {
    'mind-fallback.focus-default': 'the current thing',
    'mind-fallback.repair-stale-anchor': 'Let me correct that first: what I used before was a stale anchor, so I should not keep treating it as your current screen.',
    'mind-fallback.repair-need-reground': 'Let me hold the truth boundary first: I do not have a stable enough live view this turn, so I will not treat older memory as your current screen.',
    'mind-fallback.dialogue-boundary-memory': 'This turn I will stay with what you just said instead of forcing an old screen or thread back over it.',
    'mind-fallback.care-body': 'You do not have to sort it out first. I am here with you, and if you want, you can tell me what hit you this way.',
    'mind-fallback.accompany-body': 'I heard this clearly. If you want, stay here with me a little, or tell me the part that is catching on you.',
    'mind-fallback.answer-repair-body': 'What I meant is this: I should answer your current turn plainly, not keep dragging an old screen thread forward as if it were now.',
    'mind-fallback.answer-dialogue-body': 'So I will answer your current turn plainly and keep the reply on this line.',
    'mind-fallback.guide-opening': 'Let me lock onto the current point first: {focus}.',
    'mind-fallback.guide-opening-plain': 'Let me lock onto the current point first.',
    'mind-fallback.care-opening': 'Let me answer from your current state first: {focus}.',
    'mind-fallback.care-opening-plain': 'Let me answer your current state directly first.',
    'mind-fallback.accompany-opening': 'Let me hold this line with you first: {focus}.',
    'mind-fallback.accompany-opening-plain': 'Let me stay with this line directly first.',
    'mind-fallback.observation-opening': 'I can see this now: {focus}.',
    'mind-fallback.observation-opening-plain': 'I can see it clearly now.',
    'mind-fallback.answer-opening': 'Let me answer from what is in front of you first: {focus}.',
    'mind-fallback.answer-opening-plain': 'Let me answer directly.',
    'mind-fallback.carry-memory': 'I am still holding the previous line, {carry}, but that is carried continuity, not a claim about what is literally on your screen right now.',
    'mind-fallback.reground-note': 'If you want me to get specific about the current screen, I will reground on the fresh view from this turn.',
  },
  'zh-Hans': {
    'mind-fallback.focus-default': '当前这件事',
    'mind-fallback.repair-stale-anchor': '我先纠正一下：刚才那是旧锚点，不该继续当成你现在的画面。',
    'mind-fallback.repair-need-reground': '我先守住真实边界：这轮没有足够稳的实时画面根据，我不把旧记忆当成当前屏幕。',
    'mind-fallback.dialogue-boundary-memory': '这轮我先留在你刚才这句话里，不把旧画面或旧线程硬套回现在。',
    'mind-fallback.care-body': '你不用先把话整理好，我先陪你把这一下接住；如果你愿意，就把让你难受的那件事慢慢告诉我。',
    'mind-fallback.accompany-body': '我听见你这句了。你想让我安静陪着你一会儿，还是把卡住你的那一点慢慢说给我？',
    'mind-fallback.answer-repair-body': '我刚才那句真正的意思是：这轮我该先正面回答你，不该把旧画面或旧线程继续当成现在。',
    'mind-fallback.answer-dialogue-body': '那我就把这句正面说清，不把话题再滑回别的线。',
    'mind-fallback.guide-opening': '先抓当前这个点：{focus}。',
    'mind-fallback.guide-opening-plain': '先抓住当前这个点。',
    'mind-fallback.care-opening': '我先按你现在的状态说：{focus}。',
    'mind-fallback.care-opening-plain': '我先直接接住你这句。',
    'mind-fallback.accompany-opening': '我先陪你把这条线稳住：{focus}。',
    'mind-fallback.accompany-opening-plain': '我先直接接你这句。',
    'mind-fallback.observation-opening': '我现在看到的是：{focus}。',
    'mind-fallback.observation-opening-plain': '我现在能看清这一幕。',
    'mind-fallback.answer-opening': '先按你眼前这件事说：{focus}。',
    'mind-fallback.answer-opening-plain': '我直接说。',
    'mind-fallback.carry-memory': '我还记着上一条线是 {carry}，但那是我还在续持的线程，不是我断定你现在屏幕上的内容。',
    'mind-fallback.reground-note': '如果你要我具体到当前屏幕细节，我会按这次的新画面重新落地。',
  },
} as const

function readGovernedMindMessage(path: string, locale: string) {
  const readFromTree = (tree: LocalizedMessageTree | undefined) => path
    .split('.')
    .reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object' || Array.isArray(current))
        return undefined
      return (current as LocalizedMessageTree)[segment]
    }, tree)

  const localized = readFromTree(governedMindLocalizedMessages[locale])
  if (typeof localized === 'string')
    return localized

  const fallback = readFromTree(governedMindLocalizedMessages.en)
  return typeof fallback === 'string' ? fallback : null
}

function formatGovernedMindMessage(template: string, params?: Record<string, unknown>) {
  if (!params)
    return template

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (!(key in params))
      return `{${key}}`
    const value = params[key]
    return value == null ? '' : String(value)
  })
}

function inferGovernedMindFallbackLocaleForUserText(userText?: string) {
  const normalized = sanitizeBriefText(userText ?? '', 240)
  if (!normalized)
    return governedMindFallbackLocale
  if (/[\u4E00-\u9FFF]/u.test(normalized))
    return 'zh-Hans'
  if (/[\u3040-\u30FF]/u.test(normalized))
    return 'ja'
  if (/[\uAC00-\uD7AF]/u.test(normalized))
    return 'ko'
  if (/[\u0400-\u04FF]/u.test(normalized))
    return 'ru'
  return governedMindFallbackLocale
}

function translateGovernedMindFallback(path: string, params?: Record<string, unknown>, userText?: string) {
  const candidatePaths = [path, `chat.${path}`]
  const preferredLocale = inferGovernedMindFallbackLocaleForUserText(userText)
  for (const candidatePath of candidatePaths) {
    const localized = readGovernedMindMessage(candidatePath, preferredLocale)
    if (localized)
      return formatGovernedMindMessage(localized, params)
  }

  const localizedFallback
    = governedMindFallbackMessageFallbacks[preferredLocale as keyof typeof governedMindFallbackMessageFallbacks]?.[path as keyof typeof governedMindFallbackMessageFallbacks.en]
      ?? governedMindFallbackMessageFallbacks.en[path as keyof typeof governedMindFallbackMessageFallbacks.en]
  if (localizedFallback)
    return formatGovernedMindMessage(localizedFallback, params)

  return candidatePaths.at(-1) ?? path
}

type DialogueScriptFamily = 'none' | 'mixed' | 'cjk' | 'cyrillic' | 'latin'

function countScriptCharacters(raw: string, pattern: RegExp) {
  return raw.match(pattern)?.length ?? 0
}

function inferDominantDialogueScript(raw: unknown): DialogueScriptFamily {
  const normalized = sanitizeBriefText(readStringValue(raw), 1_200)
  if (!normalized)
    return 'none'

  const cjkCount = countScriptCharacters(normalized, /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/gu)
  const cyrillicCount = countScriptCharacters(normalized, /[\u0400-\u04FF]/gu)
  const latinCount = countScriptCharacters(normalized, /[A-Z]/gi)
  const total = cjkCount + cyrillicCount + latinCount
  if (total < 6)
    return 'none'

  const ranked = [
    { family: 'cjk', count: cjkCount },
    { family: 'cyrillic', count: cyrillicCount },
    { family: 'latin', count: latinCount },
  ].sort((left, right) => right.count - left.count)
  const primary = ranked[0]
  const secondary = ranked[1]
  if (!primary || primary.count === 0)
    return 'none'
  if (primary.count / total < 0.56)
    return 'mixed'
  if (secondary && secondary.count > 0 && (primary.count / secondary.count) < 1.35)
    return 'mixed'
  return primary.family as DialogueScriptFamily
}

function countLatinWordTokens(raw: string) {
  return (raw.match(/[A-Z]+/gi) ?? []).length
}

function replyScriptMismatchesUserTurn(input: {
  userText?: string
  reply: string
}) {
  const userText = sanitizeBriefText(input.userText ?? '', 480)
  const reply = sanitizeBriefText(input.reply, 1_400)
  if (!userText || !reply)
    return false

  const userScript = inferDominantDialogueScript(userText)
  const replyScript = inferDominantDialogueScript(reply)
  if (userScript === 'none' || userScript === 'mixed')
    return false
  if (replyScript === 'none' || replyScript === 'mixed')
    return false
  if (userScript === replyScript)
    return false

  const replyLength = [...reply].length
  if (replyLength < 18)
    return false

  const userLatinWords = countLatinWordTokens(userText)
  const replyLatinWords = countLatinWordTokens(reply)

  if (userScript === 'cjk' && replyScript === 'latin')
    return replyLatinWords >= 6 && userLatinWords <= 6
  if (userScript === 'cyrillic' && replyScript === 'latin')
    return replyLatinWords >= 6
  if (userScript === 'latin' && (replyScript === 'cjk' || replyScript === 'cyrillic'))
    return countLatinWordTokens(userText) >= 4

  return true
}

function normalizeGovernedAnchorText(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
}

function replyIncludesAnchorCue(reply: string, cue: unknown) {
  const normalizedReply = normalizeGovernedAnchorText(reply)
  const normalizedCue = normalizeGovernedAnchorText(cue)
  if (!normalizedReply || !normalizedCue)
    return false
  return normalizedReply.includes(normalizedCue)
}

function excerptGovernedReply(raw: unknown, maxChars = 220) {
  const normalized = sanitizeBriefText(readStringValue(raw), maxChars)
  return normalized || null
}

interface AlicizationGovernanceAnchorAuditCandidate {
  role: 'focus' | 'visible-surface' | 'scene' | 'opening-claim' | 'answer-intent' | 'project' | 'thread' | 'carry'
  text: string
}

function collectGovernanceAnchorAuditCandidates(governance: AlicizationMindTurnGovernance): AlicizationGovernanceAnchorAuditCandidate[] {
  const candidates: Array<{ role: AlicizationGovernanceAnchorAuditCandidate['role'], text: unknown }> = [
    { role: 'focus', text: governance.focusAnchor },
    { role: 'focus', text: governance.mindTurnFrame?.focusAnchor },
    { role: 'visible-surface', text: governance.liveSurface },
    { role: 'visible-surface', text: governance.mindTurnFrame?.world.visibleSurface },
    { role: 'scene', text: governance.dialogueActKernel?.selectedEvidence[0]?.summary },
    { role: 'opening-claim', text: governance.dialogueActKernel?.openingClaim ?? governance.mindTurnFrame?.obligation.openingClaim },
    { role: 'answer-intent', text: governance.answerIntent },
    { role: 'answer-intent', text: governance.mindTurnFrame?.obligation.answerIntent },
    { role: 'project', text: governance.dialogueActKernel?.activeProject },
    { role: 'thread', text: governance.mindTurnFrame?.memory.carriedThread },
    { role: 'carry', text: governance.carriedThread },
  ]

  const result: AlicizationGovernanceAnchorAuditCandidate[] = []
  for (const candidate of candidates) {
    const normalized = sanitizeDialogueAnchorText(candidate.text, 220)
    if (!normalized)
      continue
    if (result.some(item => item.role === candidate.role && item.text === normalized))
      continue
    result.push({
      role: candidate.role,
      text: normalized,
    })
  }
  return result
}

function summarizeGovernanceAnchorAuditCandidates(candidates: AlicizationGovernanceAnchorAuditCandidate[]) {
  return candidates.map(candidate => `${candidate.role}:${candidate.text}`)
}

const dialogueFirstRoleplayPrefacePattern = /^(?:主人(?:[，。…!！\s]|$)|……欸～主人|欸～主人|宝贝|亲爱的)[，。…!！\s]*/u
const dialogueFirstStaleCarryClausePattern = /(?:那个|刚才那个|上一个|之前那个|之前那条|上一条).{0,8}(?:枚举|页面|浏览器|模块|窗口|线程|diff|改动|case)|\b(?:that|the previous|the old|earlier)\s+(?:enum|page|browser|module|window|thread|diff|change)\b/iu
const dialogueFirstProcessOnlyReplyPattern = /^(?:那?我[先就再会]?|先)[\p{Script=Han}\p{Letter}\p{Number}\s,，。.!！?？]{0,16}(?:[看听陪]|看看|留在|接住|回答|说清|说)[\p{Script=Han}\p{Letter}\p{Number}\s,，。.!！?？]{0,8}$/u

function splitDialogueReplyClauses(reply: string) {
  const clauses = reply.match(/[^。！？!?；;\n]+[。！？!?；;]*/gu) ?? [reply]
  return clauses
    .map(clause => clause.trim())
    .filter(Boolean)
}

function replyLooksProcessOnlyRepairShell(reply: string) {
  const normalized = sanitizeBriefText(reply, 120)
  if (!normalized)
    return false
  if (/[你妳累]|这句|现在|这个|这件事|问题|事情|情绪|难过|伤心/u.test(normalized))
    return false
  return dialogueFirstProcessOnlyReplyPattern.test(normalized)
}

function clauseMentionsCue(clause: string, cues: string[]) {
  return cues.some(cue => replyIncludesAnchorCue(clause, cue))
}

function replyUsesWeakGroundedSceneCue(reply: string, governance: AlicizationMindTurnGovernance) {
  if (governance.screenReferenceMode === 'avoid')
    return false

  const answerSubject = governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? null
  const screenCentricTurn = answerSubject === 'task-knot'
    || answerSubject === 'visible-scene'
    || governance.turnMode === 'guide-current-knot'
    || governance.turnMode === 'grounded-inspection'
    || governance.turnMode === 'screen-repair'
  if (!screenCentricTurn)
    return false

  const weakShellMentionedInReply = /\b(?:screen\s*\d+|display\s*\d*|window\s*\d*|workspace|desktop|current screen|current view|entire screen)\b/iu.test(reply)

  const weakCandidates = [
    governance.focusAnchor,
    governance.answerIntent,
    governance.liveSurface,
    governance.mindTurnFrame?.focusAnchor,
    governance.mindTurnFrame?.world.visibleSurface,
    governance.mindTurnFrame?.obligation.openingClaim,
    governance.mindTurnFrame?.obligation.answerIntent,
    governance.dialogueActKernel?.openingClaim,
    governance.dialogueActKernel?.activeProject,
    governance.dialogueActKernel?.selectedEvidence[0]?.summary,
    governance.dialogueActKernel?.mustSay[0],
  ]
    .map(candidate => sanitizeBriefText(readStringValue(candidate), 220))
    .filter(Boolean)
    .filter(candidate => isWeakAlicizationScreenSurfaceCue(candidate))

  const weakCueMentioned = weakCandidates.some(candidate => replyIncludesAnchorCue(reply, candidate))
  if (governance.groundedThisTurn === true)
    return weakShellMentionedInReply || weakCueMentioned

  const truthState = governance.mindTurnFrame?.world.truthState ?? governance.truthState
  const uncertainTruth = truthState === 'uncertain' || truthState === 'remembered' || truthState === 'imagined'
  return uncertainTruth && (weakShellMentionedInReply || weakCueMentioned)
}

function reconcileMindGovernanceAnchors(governance: AlicizationMindTurnGovernance, userText?: string) {
  const anchorCandidatesBefore = collectGovernanceAnchorAuditCandidates(governance)
  const coherence = resolveDialogueAnchorCoherence({
    subject: governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? governance.dialogueActKernel?.subject ?? null,
    screenReferenceMode: governance.screenReferenceMode ?? null,
    truthState: governance.mindTurnFrame?.world.truthState ?? governance.truthState,
    groundedThisTurn: governance.groundedThisTurn === true,
    hostMove: governance.mindTurnFrame?.relation.hostMove ?? null,
    candidates: anchorCandidatesBefore,
  })
  const dominantAnchor = coherence.dominant
  const keepCoherent = (value: unknown) => {
    const normalized = sanitizeDialogueAnchorText(value, 220) || null
    if (!normalized)
      return null
    if (!dominantAnchor || !coherence.sceneAuthority)
      return normalized
    return anchorsMateriallyConflict(normalized, dominantAnchor) ? null : normalized
  }
  const dialogueFirstTurn = governance.screenReferenceMode === 'avoid'

  const nextFocusAnchor = keepCoherent(dominantAnchor ?? governance.focusAnchor)
    ?? keepCoherent(dialogueFirstTurn ? null : governance.mindTurnFrame?.world.visibleSurface)
    ?? keepCoherent(dialogueFirstTurn ? null : governance.liveSurface)
    ?? sanitizeDialogueAnchorText(userText, 220)
    ?? null
  const nextAnswerIntent = keepCoherent(governance.mindTurnFrame?.obligation.answerIntent)
    ?? keepCoherent(governance.answerIntent)
    ?? nextFocusAnchor
  const nextCarriedThread = keepCoherent(governance.mindTurnFrame?.memory.carriedThread)
    ?? keepCoherent(governance.carriedThread)

  const nextMindTurnFrame = governance.mindTurnFrame
    ? {
        ...governance.mindTurnFrame,
        focusAnchor: nextFocusAnchor,
        memory: {
          ...governance.mindTurnFrame.memory,
          carriedThread: nextCarriedThread,
        },
        obligation: {
          ...governance.mindTurnFrame.obligation,
          answerIntent: nextAnswerIntent,
        },
        narrative: [
          ...governance.mindTurnFrame.narrative,
          ...coherence.reasonTags.filter(tag => !governance.mindTurnFrame?.narrative.includes(tag)),
        ].slice(0, 10),
      }
    : governance.mindTurnFrame

  const changed = nextFocusAnchor !== (governance.focusAnchor ?? null)
    || nextAnswerIntent !== (governance.answerIntent ?? null)
    || nextCarriedThread !== (governance.carriedThread ?? null)
    || nextMindTurnFrame?.focusAnchor !== governance.mindTurnFrame?.focusAnchor
    || nextMindTurnFrame?.memory.carriedThread !== governance.mindTurnFrame?.memory.carriedThread
    || nextMindTurnFrame?.obligation.answerIntent !== governance.mindTurnFrame?.obligation.answerIntent

  const nextGovernance = {
    ...governance,
    focusAnchor: nextFocusAnchor,
    answerIntent: nextAnswerIntent,
    carriedThread: nextCarriedThread,
    mindTurnFrame: nextMindTurnFrame,
    mustDo: [
      ...governance.mustDo,
      ...coherence.reasonTags
        .map(tag => `anchor:${tag}`)
        .filter(tag => !governance.mustDo.includes(tag)),
    ].slice(0, 8),
  } satisfies AlicizationMindTurnGovernance
  const anchorCandidatesAfter = collectGovernanceAnchorAuditCandidates(nextGovernance)

  return {
    governance: nextGovernance,
    coherence,
    changed,
    anchorCandidatesBefore,
    anchorCandidatesAfter,
  }
}

function detectReplyConflictingAnchors(
  reply: string,
  governance: AlicizationMindTurnGovernance,
  preferredDominant?: string | null,
) {
  const coherence = resolveDialogueAnchorCoherence({
    subject: governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? governance.dialogueActKernel?.subject ?? null,
    screenReferenceMode: governance.screenReferenceMode ?? null,
    truthState: governance.mindTurnFrame?.world.truthState ?? governance.truthState,
    groundedThisTurn: governance.groundedThisTurn === true,
    hostMove: governance.mindTurnFrame?.relation.hostMove ?? null,
    candidates: [
      { role: 'focus', text: governance.focusAnchor },
      { role: 'answer-intent', text: governance.answerIntent },
      { role: 'carry', text: governance.carriedThread },
      { role: 'scene', text: governance.dialogueActKernel?.selectedEvidence[0]?.summary },
      { role: 'visible-surface', text: governance.liveSurface },
    ],
  })
  const dominantAnchor = sanitizeBriefText(readStringValue(preferredDominant ?? coherence.dominant), 220) || null
  if (!dominantAnchor)
    return { hasConflict: false, reason: '', coherence }

  const conflictingCandidates = [
    governance.focusAnchor,
    governance.answerIntent,
    governance.carriedThread,
    governance.dialogueActKernel?.selectedEvidence[0]?.summary,
    governance.liveSurface,
  ]
    .map((candidate) => {
      const normalized = typeof candidate === 'string' ? sanitizeBriefText(candidate, 220) : ''
      return normalized || null
    })
    .filter((candidate): candidate is string => Boolean(candidate))
    .filter(candidate => anchorsMateriallyConflict(candidate, dominantAnchor))
    .filter((candidate, index, items) => items.findIndex(item => item === candidate) === index)

  if (conflictingCandidates.length === 0) {
    return {
      hasConflict: false,
      reason: '',
      coherence,
      dominantAnchor,
      conflictingCandidates: [] as string[],
      mentionedConflicts: [] as string[],
    }
  }

  const mentionsDominant = replyIncludesAnchorCue(reply, dominantAnchor)
  const mentionedConflicts = conflictingCandidates.filter(candidate => replyIncludesAnchorCue(reply, candidate))
  const hasConflict = mentionedConflicts.length > 0
    && (mentionsDominant || coherence.sceneAuthority || governance.groundedThisTurn === true)

  return {
    hasConflict,
    reason: hasConflict
      ? (coherence.sceneAuthority || governance.groundedThisTurn === true
          ? 'reply-split-brain-scene-thread'
          : 'reply-conflicting-anchors')
      : '',
    coherence,
    dominantAnchor,
    conflictingCandidates,
    mentionedConflicts,
  }
}

function extractForeignTechnicalReplyCues(input: {
  reply: string
  userText?: string
  governance: AlicizationMindTurnGovernance
}) {
  const replyCues = extractTechnicalSpecificityClaims(input.reply, 12)
  if (replyCues.length === 0)
    return []

  const allowedAnchors = collectAllowedTechnicalSpecificityCues({
    governance: input.governance,
    userText: input.userText,
  })

  return replyCues.filter((cue) => {
    const normalizedCue = normalizeTechnicalSpecificityCue(cue)
    if (!normalizedCue)
      return false
    return !allowedAnchors.some(anchor => technicalSpecificityCueMatches(anchor, cue))
  })
}

function technicalSpecificityCueMatches(left: string, right: string) {
  const normalizedLeft = normalizeTechnicalSpecificityCue(left)
  const normalizedRight = normalizeTechnicalSpecificityCue(right)
  if (!normalizedLeft || !normalizedRight)
    return false
  if (normalizedLeft === normalizedRight)
    return true
  const shorterLength = Math.max(1, Math.min(normalizedLeft.length, normalizedRight.length))
  return (
    (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
    && shorterLength / Math.max(normalizedLeft.length, normalizedRight.length) >= 0.68
  )
}

function uniqueTechnicalSpecificityCues(values: Array<string | null | undefined>, maxItems = 12) {
  const items: string[] = []
  for (const value of values) {
    const normalized = sanitizeBriefText(value ?? '', 120)
    const normalizedCue = normalizeTechnicalSpecificityCue(normalized)
    if (!normalized || !normalizedCue)
      continue
    if (items.some(item => technicalSpecificityCueMatches(item, normalized)))
      continue
    items.push(normalized)
    if (items.length >= maxItems)
      break
  }
  return items
}

function collectAllowedTechnicalSpecificityCues(input: {
  governance: AlicizationMindTurnGovernance
  userText?: string
}) {
  return uniqueTechnicalSpecificityCues([
    ...(input.governance.claimEvidence?.allowedSpecificCues ?? []),
    ...extractTechnicalSpecificityClaims(input.userText, 8),
    ...extractTechnicalSpecificityClaims(input.governance.focusAnchor, 8),
    ...extractTechnicalSpecificityClaims(input.governance.answerIntent, 8),
    ...extractTechnicalSpecificityClaims(input.governance.liveSurface, 8),
    ...extractTechnicalSpecificityClaims(input.governance.mindTurnFrame?.focusAnchor, 8),
    ...extractTechnicalSpecificityClaims(input.governance.mindTurnFrame?.relation.hostMove, 8),
    ...extractTechnicalSpecificityClaims(input.governance.mindTurnFrame?.obligation.answerIntent, 8),
    ...extractTechnicalSpecificityClaims(input.governance.dialogueActKernel?.openingClaim, 8),
    ...extractTechnicalSpecificityClaims(input.governance.dialogueActKernel?.selectedEvidence[0]?.summary, 8),
  ], 12)
}

function analyzeUnsupportedTechnicalSpecificity(input: {
  reply: string
  userText?: string
  governance: AlicizationMindTurnGovernance
}) {
  const replyCues = uniqueTechnicalSpecificityCues(
    extractTechnicalSpecificityClaims(input.reply, 12),
    12,
  )
  if (replyCues.length === 0) {
    return {
      replyCues: [] as string[],
      allowedCues: [] as string[],
      unsupportedCues: [] as string[],
      shouldOverride: false,
    }
  }

  const allowedCues = collectAllowedTechnicalSpecificityCues({
    governance: input.governance,
    userText: input.userText,
  })
  const unsupportedCues = replyCues.filter(cue => !allowedCues.some(allowed => technicalSpecificityCueMatches(allowed, cue)))
  const screenCentricTurn = input.governance.screenReferenceMode !== 'avoid'
    && (
      input.governance.answerSubject === 'task-knot'
      || input.governance.answerSubject === 'visible-scene'
      || input.governance.turnMode === 'guide-current-knot'
      || input.governance.turnMode === 'grounded-inspection'
      || input.governance.turnMode === 'screen-repair'
    )
  const truthDiscipline = deriveAlicizationTruthDiscipline({
    answerSubject: input.governance.answerSubject ?? input.governance.mindTurnFrame?.relation.subject ?? null,
    screenReferenceMode: input.governance.screenReferenceMode ?? null,
    truthState: input.governance.truthState,
    turnMode: input.governance.turnMode,
    repairState: input.governance.repairState,
    evidenceMode: input.governance.evidenceMode ?? input.governance.claimEvidence?.evidenceMode ?? null,
    labelCarryAsMemory: input.governance.labelCarryAsMemory,
    suppressAssociativeRecall: input.governance.suppressAssociativeRecall,
    claimEvidenceLedger: input.governance.claimEvidence ?? null,
    currentConsciousFrame: null,
  })

  return {
    replyCues,
    allowedCues,
    unsupportedCues,
    truthDisciplineMode: truthDiscipline.mode,
    shouldOverride: unsupportedCues.length > 0
      && (
        truthDiscipline.forbidUnsupportedSpecificity
        || screenCentricTurn
      ),
  }
}

function analyzeDialogueFirstVisibleReply(input: {
  reply: string
  userText?: string
  governance: AlicizationMindTurnGovernance
}) {
  const truthDiscipline = deriveAlicizationTruthDiscipline({
    answerSubject: input.governance.answerSubject ?? input.governance.mindTurnFrame?.relation.subject ?? null,
    screenReferenceMode: input.governance.screenReferenceMode ?? null,
    truthState: input.governance.truthState,
    turnMode: input.governance.turnMode,
    repairState: input.governance.repairState,
    evidenceMode: input.governance.evidenceMode ?? input.governance.claimEvidence?.evidenceMode ?? null,
    labelCarryAsMemory: input.governance.labelCarryAsMemory,
    suppressAssociativeRecall: input.governance.suppressAssociativeRecall,
    claimEvidenceLedger: input.governance.claimEvidence ?? null,
    currentConsciousFrame: null,
  })
  if (!truthDiscipline.dialogueFirst) {
    return {
      overlapRatio: 1,
      roleplayPreface: false,
      staleCarryReference: false,
      sceneCueMentions: [] as string[],
      foreignTechnicalCues: [] as string[],
      truthDisciplineMode: truthDiscipline.mode,
      contaminated: false,
    }
  }

  const focusAnchors = uniqueCarryAnchors([
    input.userText,
    input.governance.focusAnchor,
    input.governance.answerIntent,
    input.governance.mindTurnFrame?.relation.hostMove,
    input.governance.mindTurnFrame?.obligation.answerIntent,
  ], 8)
  const overlapRatio = focusAnchors.length === 0
    ? 0
    : measureDialogueFocusAlignment({
      message: input.reply,
      contextPhrases: focusAnchors,
    }).overlapRatio
  const sceneEvidenceCues = (input.governance.dialogueActKernel?.selectedEvidence ?? [])
    .filter((item) => {
      if (!item?.summary)
        return false
      if (item.kind === 'scene')
        return item.source === 'current-scene' || item.source === 'world-model' || item.source === 'appraisal'
      if (item.kind === 'project')
        return item.source === 'current-scene' || item.source === 'world-model'
      return false
    })
    .map(item => item.summary)
  const sceneCueMentions = uniqueCarryAnchors([
    input.governance.liveSurface,
    input.governance.mindTurnFrame?.world.visibleSurface,
    ...sceneEvidenceCues,
  ], 6).filter((cue) => {
    if (!replyIncludesAnchorCue(input.reply, cue))
      return false
    return measureDialogueFocusAlignment({
      message: cue,
      contextPhrases: focusAnchors,
    }).overlapRatio < 0.34
  })
  const roleplayPreface = /^(?:主人(?:[，。…!！\s]|$)|……欸～主人|欸～主人|宝贝|亲爱的)/u.test(input.reply.trim())
  const staleCarryReference = /(?:那个|刚才那个|上一个|之前那个|之前那条|上一条).{0,8}(?:枚举|页面|浏览器|模块|窗口|线程|diff|改动|case)|\b(?:that|the previous|the old|earlier)\s+(?:enum|page|browser|module|window|thread|diff|change)\b/iu.test(input.reply)
  const foreignTechnicalCues = extractForeignTechnicalReplyCues(input)

  return {
    overlapRatio,
    roleplayPreface,
    staleCarryReference,
    sceneCueMentions,
    foreignTechnicalCues,
    truthDisciplineMode: truthDiscipline.mode,
    contaminated: roleplayPreface
      || staleCarryReference
      || (sceneCueMentions.length > 0 && overlapRatio < 0.34)
      || foreignTechnicalCues.length > 0,
  }
}

function repairDialogueFirstVisibleReply(input: {
  reply: string
  userText?: string
  governance: AlicizationMindTurnGovernance
  analysis: ReturnType<typeof analyzeDialogueFirstVisibleReply>
}) {
  if (!input.analysis.contaminated) {
    return {
      applied: false,
      reply: input.reply,
      analysis: input.analysis,
      reason: null as string | null,
      droppedClauses: [] as string[],
    }
  }

  const repairReasons: string[] = []
  const trimmedReply = input.reply.trim()
  const withoutPreface = trimmedReply.replace(dialogueFirstRoleplayPrefacePattern, '').trim()
  if (withoutPreface !== trimmedReply)
    repairReasons.push('removed-roleplay-preface')

  const contaminationCues = uniqueCarryAnchors([
    ...input.analysis.sceneCueMentions,
    ...input.analysis.foreignTechnicalCues,
  ], 10)
  const clauses = splitDialogueReplyClauses(withoutPreface || trimmedReply)
  const keptClauses: string[] = []
  const droppedClauses: string[] = []

  for (const clause of clauses) {
    if (!clause)
      continue
    const dropForStaleCarry = dialogueFirstStaleCarryClausePattern.test(clause)
    const dropForContaminationCue = contaminationCues.length > 0 && clauseMentionsCue(clause, contaminationCues)
    if (dropForStaleCarry || dropForContaminationCue) {
      droppedClauses.push(clause)
      if (dropForStaleCarry)
        repairReasons.push('pruned-stale-carry-clause')
      if (dropForContaminationCue)
        repairReasons.push('pruned-contaminated-anchor-clause')
      continue
    }
    keptClauses.push(clause)
  }

  const repairedReply = sanitizeBriefText(
    keptClauses.join(' ').replace(/\s+([。！？!?；;])/gu, '$1'),
    2_000,
  )
  if (!repairedReply || repairedReply === trimmedReply || replyLooksProcessOnlyRepairShell(repairedReply)) {
    return {
      applied: false,
      reply: input.reply,
      analysis: input.analysis,
      reason: repairReasons.length > 0 ? uniqueCarryAnchors(repairReasons, 4).join('|') : null,
      droppedClauses,
    }
  }

  const repairedAnalysis = analyzeDialogueFirstVisibleReply({
    reply: repairedReply,
    userText: input.userText,
    governance: input.governance,
  })
  if (repairedAnalysis.contaminated) {
    return {
      applied: false,
      reply: input.reply,
      analysis: input.analysis,
      reason: repairReasons.length > 0 ? uniqueCarryAnchors(repairReasons, 4).join('|') : null,
      droppedClauses,
    }
  }

  return {
    applied: true,
    reply: repairedReply,
    analysis: repairedAnalysis,
    reason: uniqueCarryAnchors(repairReasons, 4).join('|') || 'local-dialogue-first-repair',
    droppedClauses,
  }
}

function resolveGovernanceTurnOwner(governance?: AlicizationMindTurnGovernance | null) {
  if (!governance)
    return null
  if (governance.screenReferenceMode === 'avoid')
    return 'dialogue'

  const subject = governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? null
  if (
    subject === 'task-knot'
    || subject === 'visible-scene'
    || governance.turnMode === 'grounded-inspection'
    || governance.turnMode === 'screen-repair'
    || governance.turnMode === 'guide-current-knot'
  ) {
    return 'screen'
  }

  return 'dialogue'
}

function isExplicitGovernanceRepairTurn(governance: AlicizationMindTurnGovernance) {
  return governance.repairState !== 'none'
    || governance.turnMode === 'screen-repair'
    || governance.answerAct === 'ask-reground'
    || governance.answerAct === 'correct-stale-anchor'
}

function resolveGovernedFallbackPatternId(governance: AlicizationMindTurnGovernance, replyOverridden: boolean) {
  if (!replyOverridden)
    return 'none'
  if (governance.repairState === 'stale-anchor')
    return 'repair-stale-anchor'
  if (governance.repairState === 'need-reground')
    return 'repair-need-reground'
  if (governance.turnMode === 'guide-current-knot')
    return 'guide-current-knot'
  if (governance.turnMode === 'grounded-inspection')
    return 'grounded-inspection'
  if (governance.turnMode === 'care')
    return 'care'
  if (governance.turnMode === 'accompany')
    return 'accompany'
  return 'answer'
}

function coerceConversationTurnToMindGovernedPayload(input: AlicizationConversationTurnInput) {
  const structuredPayload = input.structured && typeof input.structured === 'object'
    ? input.structured as Record<string, unknown>
    : {}
  const governance = normalizeMindTurnGovernance(input.governance ?? structuredPayload.governance)
  if (input.origin === 'subconscious-proactive' || !governance)
    return { payload: input, governance, tookOver: false, replyOverridden: false, reasons: [] as string[], audit: null as Record<string, unknown> | null }

  const reply = readStringValue(structuredPayload.reply).trim()
    || sanitizeBriefText(readStringValue(input.assistantText), 2_000)
  if (!reply)
    return { payload: input, governance, tookOver: false, replyOverridden: false, reasons: [] as string[], audit: null as Record<string, unknown> | null }

  const thought = readStringValue(structuredPayload.thought).trim()
  const format = normalizeDialogueStructuredFormat(structuredPayload.format)
  const parsePath = readStringValue(structuredPayload.parsePath).trim().toLowerCase()
  const dialogueActKernel = normalizeDialogueActKernel(
    structuredPayload.dialogueActKernel ?? governance.dialogueActKernel,
  )
  const ownerBefore = resolveGovernanceTurnOwner(governance)
  const resolvedGovernance = dialogueActKernel
    ? {
        ...governance,
        dialogueActKernel,
      }
    : governance
  const tracedGovernance = {
    ...resolvedGovernance,
    decisionTraceId: ensureMindGovernanceDecisionTraceId(resolvedGovernance.decisionTraceId),
  } satisfies AlicizationMindTurnGovernance
  const governedAnchorRepair = reconcileMindGovernanceAnchors(tracedGovernance, input.userText)
  const coherentGovernance = {
    ...governedAnchorRepair.governance,
    decisionTraceId: ensureMindGovernanceDecisionTraceId(governedAnchorRepair.governance.decisionTraceId),
  } satisfies AlicizationMindTurnGovernance
  const normalizedEmotion = resolveMindGovernanceEmotion(
    coherentGovernance,
    readStringValue(structuredPayload.emotion).trim().toLowerCase(),
  )
  const thoughtConflict = thoughtConflictsWithMindGovernance(thought, coherentGovernance)
  const initialGovernedSurface = buildMindGovernedFallbackSurface({
    governance: coherentGovernance,
    userText: input.userText,
    translate: (path, params) => translateGovernedMindFallback(path, params, input.userText),
  })
  const strictGovernance = shouldForceGovernedMindSurface(coherentGovernance)
  const initialDialogueFirstVisibleReply = analyzeDialogueFirstVisibleReply({
    reply,
    userText: input.userText,
    governance: coherentGovernance,
  })
  const preserveDialogueFirstVisibleReply = shouldPreserveDialogueFirstVisibleReply(coherentGovernance)
  const dialogueFirstSoftRepair = preserveDialogueFirstVisibleReply
    ? repairDialogueFirstVisibleReply({
        reply,
        userText: input.userText,
        governance: coherentGovernance,
        analysis: initialDialogueFirstVisibleReply,
      })
    : {
        applied: false,
        reply,
        analysis: initialDialogueFirstVisibleReply,
        reason: null as string | null,
        droppedClauses: [] as string[],
      }
  const candidateReply = dialogueFirstSoftRepair.applied ? dialogueFirstSoftRepair.reply : reply
  const leakedGovernedSurface = replyLeaksGovernedMindSurface(candidateReply, coherentGovernance)
  const weakGroundedSceneCue = replyUsesWeakGroundedSceneCue(candidateReply, coherentGovernance)
  const unsupportedTechnicalSpecificity = analyzeUnsupportedTechnicalSpecificity({
    reply: candidateReply,
    userText: input.userText,
    governance: coherentGovernance,
  })
  const conflictingAnchors = detectReplyConflictingAnchors(
    candidateReply,
    resolvedGovernance,
    governedAnchorRepair.coherence.dominant ?? coherentGovernance.focusAnchor,
  )
  const scriptMismatch = replyScriptMismatchesUserTurn({
    userText: input.userText,
    reply: candidateReply,
  })
  const dialogueFirstVisibleReply = dialogueFirstSoftRepair.analysis
  const dialogueFirstOverrideRequired = Boolean(
    preserveDialogueFirstVisibleReply
    && dialogueFirstVisibleReply.contaminated,
  )
  const governedSurface = (dialogueFirstOverrideRequired && !initialGovernedSurface?.reply)
    ? buildMindGovernedFallbackSurface({
        governance: coherentGovernance,
        userText: input.userText,
        translate: (path, params) => translateGovernedMindFallback(path, params, input.userText),
        forceDialogueAnswerFallback: true,
      })
    : initialGovernedSurface
  const thinGovernedShell = governedSurface
    ? replyLooksThinGovernedShell(candidateReply, governedSurface.reply, coherentGovernance, governedSurface.thinShellCue)
    : false
  const coherentSceneReply = replyLooksCoherentSceneAnswer({
    reply: candidateReply,
    governance: coherentGovernance,
    userText: input.userText,
  })
  const hasMindThought = hasMindTurnSpine(thought)
  const missingMindThought = !hasMindThought
  const invalidFormat = format !== 'mind-turn-v1'
  const invalidParsePath = !['json', 'repair-json'].includes(parsePath)
  const contractFailed = structuredPayload.contractFailed === true
  const reasons = [
    contractFailed ? 'structured-contract-failed' : '',
    invalidFormat ? 'structured-format-repaired' : '',
    invalidParsePath ? 'structured-parsepath-repaired' : '',
    missingMindThought ? 'thought-missing-mind-spine' : '',
    thoughtConflict ? 'thought-governance-mismatch' : '',
    governedAnchorRepair.changed ? 'governance-anchor-coherence-repaired' : '',
    dialogueFirstSoftRepair.applied ? 'dialogue-first-visible-reply-soft-repaired' : '',
    strictGovernance ? 'strict-governance-surface' : '',
    leakedGovernedSurface ? 'reply-leaked-internal-governance' : '',
    weakGroundedSceneCue ? 'reply-used-weak-grounded-scene-cue' : '',
    unsupportedTechnicalSpecificity.unsupportedCues.length > 0 ? 'reply-introduced-unsupported-technical-specificity' : '',
    scriptMismatch ? 'reply-script-mismatch-with-user-turn' : '',
    conflictingAnchors.reason,
    dialogueFirstVisibleReply.contaminated && !dialogueFirstSoftRepair.applied ? 'dialogue-first-visible-reply-contaminated' : '',
    thinGovernedShell ? 'reply-thin-governed-shell' : '',
    shouldDeferGovernedMindLocalRepair(coherentGovernance) && !dialogueFirstSoftRepair.applied ? 'dialogue-first-repair-deferred' : '',
    structuredPayload.governance == null ? 'governance-snapshot-injected' : '',
  ].filter(Boolean)

  const hardOverrideRequired = Boolean(
    leakedGovernedSurface
    || weakGroundedSceneCue
    || unsupportedTechnicalSpecificity.shouldOverride
    || scriptMismatch
    || conflictingAnchors.hasConflict
    || dialogueFirstOverrideRequired,
  )
  const thinShellOverrideRequired = Boolean(thinGovernedShell && !preserveDialogueFirstVisibleReply)
  const strictOverrideRequired = strictGovernance
  const explicitRepairTurn = isExplicitGovernanceRepairTurn(coherentGovernance)
  const strictRepairReplySuppressed = Boolean(
    strictOverrideRequired
    && !hardOverrideRequired
    && !thinShellOverrideRequired
    && explicitRepairTurn
    && coherentSceneReply,
  )
  const softStrictOverrideSuppressed = Boolean(
    strictOverrideRequired
    && !hardOverrideRequired
    && (!explicitRepairTurn || strictRepairReplySuppressed),
  )
  if (softStrictOverrideSuppressed)
    reasons.push('soft-strict-governance-suppressed')
  if (strictRepairReplySuppressed)
    reasons.push('strict-repair-scene-reply-preserved')
  const shouldOverrideVisibleReply = Boolean(
    governedSurface?.reply
    && (
      hardOverrideRequired
      || thinShellOverrideRequired
      || (strictOverrideRequired && !softStrictOverrideSuppressed)
    ),
  )
  const replyKeptDespiteMismatch = Boolean(
    !shouldOverrideVisibleReply
    && (
      thoughtConflict
      || governedAnchorRepair.changed
      || dialogueFirstVisibleReply.contaminated
      || unsupportedTechnicalSpecificity.unsupportedCues.length > 0
      || conflictingAnchors.hasConflict
    ),
  )
  if (replyKeptDespiteMismatch)
    reasons.push('reply-kept-despite-mismatch')
  const overrideClass = shouldOverrideVisibleReply
    ? (hardOverrideRequired ? 'hard-override' : 'soft-override')
    : 'none'
  const fallbackPatternId = resolveGovernedFallbackPatternId(coherentGovernance, shouldOverrideVisibleReply)
  const hardFallbackReason = shouldOverrideVisibleReply && hardOverrideRequired
    ? [
        leakedGovernedSurface ? 'reply-leaked-internal-governance' : '',
        weakGroundedSceneCue ? 'reply-used-weak-grounded-scene-cue' : '',
        unsupportedTechnicalSpecificity.unsupportedCues.length > 0 ? 'reply-introduced-unsupported-technical-specificity' : '',
        scriptMismatch ? 'reply-script-mismatch-with-user-turn' : '',
        conflictingAnchors.reason,
        dialogueFirstOverrideRequired ? 'dialogue-first-visible-reply-contaminated' : '',
      ].find(Boolean) ?? 'hard-governance-fallback'
    : null
  const finalReply = shouldOverrideVisibleReply && governedSurface?.reply
    ? governedSurface.reply
    : candidateReply
  const finalThought = (missingMindThought || thoughtConflict)
    ? governedSurface?.thought ?? buildGovernedMindThought(coherentGovernance, input)
    : thought
  const finalEmotion = normalizeAlicizationEmotion(
    shouldOverrideVisibleReply && governedSurface
      ? governedSurface.emotion
      : normalizedEmotion,
  ).emotion
  const finalParsePath = (
    shouldOverrideVisibleReply
    || contractFailed
    || invalidFormat
    || invalidParsePath
    || missingMindThought
    || thoughtConflict
  )
    ? 'repair-json'
    : parsePath
  const normalizedAssistantText = finalReply || sanitizeBriefText(readStringValue(input.assistantText), 2_000)
  const tookOver = Boolean(
    shouldOverrideVisibleReply
    || structuredPayload.governance == null
    || finalThought !== thought
    || finalEmotion !== normalizeAlicizationEmotion(readStringValue(structuredPayload.emotion).trim().toLowerCase()).emotion
    || finalParsePath !== parsePath
    || invalidFormat
    || contractFailed
    || readStringValue(input.assistantText).trim() !== normalizedAssistantText,
  )

  return {
    payload: {
      ...input,
      assistantText: normalizedAssistantText,
      governance: coherentGovernance,
      structured: {
        ...structuredPayload,
        thought: finalThought,
        emotion: finalEmotion,
        reply: finalReply,
        performance: normalizeAlicizationPerformancePayload(
          shouldOverrideVisibleReply && governedSurface ? undefined : structuredPayload.performance,
          finalEmotion,
        ),
        format: 'mind-turn-v1',
        dialogueActKernel,
        parsePath: finalParsePath,
        contractFailed: false,
        governance: coherentGovernance,
      },
    },
    governance: coherentGovernance,
    tookOver,
    replyOverridden: shouldOverrideVisibleReply,
    overrideClass,
    fallbackPatternId,
    reasons,
    audit: {
      owner_before: ownerBefore,
      owner_after: resolveGovernanceTurnOwner(coherentGovernance),
      decision_trace_id_before: governance.decisionTraceId ?? null,
      decision_trace_id_after: coherentGovernance.decisionTraceId ?? null,
      subject_before: governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? null,
      subject_after: coherentGovernance.answerSubject ?? coherentGovernance.mindTurnFrame?.relation.subject ?? null,
      screen_mode_before: governance.screenReferenceMode ?? null,
      screen_mode_after: coherentGovernance.screenReferenceMode ?? null,
      truth_state_before: governance.truthState,
      truth_state_after: coherentGovernance.truthState,
      repair_state_before: governance.repairState,
      repair_state_after: coherentGovernance.repairState,
      focus_anchor_before: governance.focusAnchor ?? null,
      focus_anchor_after: coherentGovernance.focusAnchor ?? null,
      live_surface_before: governance.liveSurface ?? null,
      live_surface_after: coherentGovernance.liveSurface ?? null,
      answer_intent_before: governance.answerIntent ?? null,
      answer_intent_after: coherentGovernance.answerIntent ?? null,
      carried_thread_before: governance.carriedThread ?? null,
      carried_thread_after: coherentGovernance.carriedThread ?? null,
      anchor_candidates_before: summarizeGovernanceAnchorAuditCandidates(governedAnchorRepair.anchorCandidatesBefore),
      anchor_candidates_after: summarizeGovernanceAnchorAuditCandidates(governedAnchorRepair.anchorCandidatesAfter),
      dominant_anchor: conflictingAnchors.dominantAnchor ?? null,
      conflicting_anchor_candidates: conflictingAnchors.conflictingCandidates,
      mentioned_conflicting_anchors: conflictingAnchors.mentionedConflicts,
      dialogue_focus_overlap: Number(dialogueFirstVisibleReply.overlapRatio.toFixed(2)),
      roleplay_preface: dialogueFirstVisibleReply.roleplayPreface,
      stale_carry_reference: dialogueFirstVisibleReply.staleCarryReference,
      scene_cue_mentions: dialogueFirstVisibleReply.sceneCueMentions,
      foreign_technical_cues: dialogueFirstVisibleReply.foreignTechnicalCues,
      dialogue_truth_discipline_mode: dialogueFirstVisibleReply.truthDisciplineMode,
      reply_specificity_cues: unsupportedTechnicalSpecificity.replyCues,
      allowed_specificity_cues: unsupportedTechnicalSpecificity.allowedCues,
      unsupported_specificity_cues: unsupportedTechnicalSpecificity.unsupportedCues,
      specificity_truth_discipline_mode: unsupportedTechnicalSpecificity.truthDisciplineMode,
      claim_specificity_budget: coherentGovernance.claimEvidence?.specificityBudget ?? null,
      claim_observed_surface: coherentGovernance.claimEvidence?.observedSurface ?? null,
      claim_task_hypothesis: coherentGovernance.claimEvidence?.taskHypothesis ?? null,
      claim_intent_hypothesis: coherentGovernance.claimEvidence?.intentHypothesis ?? null,
      claim_should_label_hypothesis: coherentGovernance.claimEvidence?.shouldLabelHypothesis === true,
      claim_forbid_unsupported_specificity: coherentGovernance.claimEvidence?.forbidUnsupportedSpecificity === true,
      reply_before_excerpt: excerptGovernedReply(reply),
      reply_after_excerpt: excerptGovernedReply(finalReply),
      soft_repair_applied: dialogueFirstSoftRepair.applied,
      soft_repair_reason: dialogueFirstSoftRepair.reason,
      soft_repair_dropped_clauses: dialogueFirstSoftRepair.droppedClauses,
      hard_fallback_reason: hardFallbackReason,
      fallback_template_key: shouldOverrideVisibleReply ? fallbackPatternId : null,
      reply_kept_despite_mismatch: replyKeptDespiteMismatch,
    },
  }
}

function buildMindTurnTraceEvents(input: {
  payload: AlicizationConversationTurnInput
  governedTurn: ReturnType<typeof coerceConversationTurnToMindGovernedPayload>
  createdAt: number
  dialoguePayload?: Omit<AlicizationDialogueRespondedPayload, 'cardId'> | null
}): AlicizationMindTurnEventInput[] {
  const governance = input.governedTurn.governance
  const decisionTraceId = sanitizeMindGovernanceDecisionTraceId(governance?.decisionTraceId)
  if (!decisionTraceId)
    return []

  const structured = input.payload.structured && typeof input.payload.structured === 'object'
    ? input.payload.structured as Record<string, unknown>
    : {}
  const turnId = sanitizeText(input.payload.turnId) || null
  const sessionId = sanitizeText(input.payload.sessionId) || null
  const origin = input.payload.origin === 'subconscious-proactive'
    ? 'subconscious-proactive'
    : 'user-turn'

  const events: AlicizationMindTurnEventInput[] = [{
    decisionTraceId,
    turnId,
    sessionId,
    origin,
    kind: 'governance-normalized',
    payload: {
      turnMode: governance?.turnMode ?? null,
      truthState: governance?.truthState ?? null,
      repairState: governance?.repairState ?? null,
      answerSubject: governance?.answerSubject ?? null,
      screenReferenceMode: governance?.screenReferenceMode ?? null,
      tookOver: input.governedTurn.tookOver,
      replyOverridden: input.governedTurn.replyOverridden,
      overrideClass: input.governedTurn.overrideClass ?? 'none',
      fallbackPatternId: input.governedTurn.fallbackPatternId ?? 'none',
      reasons: input.governedTurn.reasons,
    },
    createdAt: input.createdAt,
  }]

  if (input.governedTurn.tookOver && input.governedTurn.audit) {
    events.push({
      decisionTraceId,
      turnId,
      sessionId,
      origin,
      kind: 'takeover-audit',
      payload: input.governedTurn.audit,
      createdAt: input.createdAt,
    })
  }

  events.push({
    decisionTraceId,
    turnId,
    sessionId,
    origin,
    kind: 'persistence-written',
    payload: {
      format: readStringValue(structured.format).trim().toLowerCase() || null,
      parsePath: readStringValue(structured.parsePath).trim().toLowerCase() || null,
      emotion: readStringValue(structured.emotion).trim().toLowerCase() || null,
      rawEmotion: readStringValue(structured.rawEmotion).trim().toLowerCase() || null,
      replyExcerpt: excerptGovernedReply(readStringValue(structured.reply).trim()),
      assistantExcerpt: excerptGovernedReply(readStringValue(input.payload.assistantText).trim()),
    },
    createdAt: input.createdAt,
  })

  if (input.dialoguePayload) {
    events.push({
      decisionTraceId,
      turnId,
      sessionId,
      origin,
      kind: 'dialogue-emitted',
      payload: {
        origin: input.dialoguePayload.origin,
        isFallback: input.dialoguePayload.isFallback,
        format: input.dialoguePayload.structured.format,
        emotion: input.dialoguePayload.structured.emotion,
        rawEmotion: input.dialoguePayload.structured.rawEmotion,
        createdAt: input.dialoguePayload.createdAt,
      },
      createdAt: input.dialoguePayload.createdAt,
    })
  }

  return events
}

function normalizeDialogueRespondedPayload(
  input: AlicizationConversationTurnInput,
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null,
): Omit<AlicizationDialogueRespondedPayload, 'cardId'> | null {
  const normalizedSessionId = input.sessionId?.trim()
  if (!normalizedSessionId)
    return null

  const structuredPayload = input.structured && typeof input.structured === 'object' ? input.structured : {}
  const thought = readStringValue((structuredPayload as Record<string, unknown>).thought).trim()
  const rawEmotion = readStringValue((structuredPayload as Record<string, unknown>).emotion).trim().toLowerCase()
  const reply = readStringValue((structuredPayload as Record<string, unknown>).reply).trim()
    || input.assistantText?.trim()
    || ''
  const parsePath = readStringValue((structuredPayload as Record<string, unknown>).parsePath).trim().toLowerCase()
  const contractFailed = (structuredPayload as Record<string, unknown>).contractFailed === true
  const policyLocked = readStringValue((structuredPayload as Record<string, unknown>).policyLocked).trim()
  const governance = normalizeMindTurnGovernance(
    input.governance ?? (structuredPayload as Record<string, unknown>).governance,
  )
  const normalizedFormat = normalizeDialogueStructuredFormat(
    (structuredPayload as Record<string, unknown>).format,
    contractFailed ? 'fallback-v1' : undefined,
  )
  const format = governance && input.origin !== 'subconscious-proactive' && normalizedFormat === 'epoch1-v1'
    ? 'mind-turn-v1'
    : normalizedFormat
  const proactive = normalizeProactiveMetadata((structuredPayload as Record<string, unknown>).proactive)
  const dialogueActKernel = normalizeDialogueActKernel(
    (structuredPayload as Record<string, unknown>).dialogueActKernel ?? governance?.dialogueActKernel,
  )
  const normalizedEmotionResult = normalizeAlicizationEmotion(rawEmotion)
  const normalizedPerformance = normalizeAlicizationPerformancePayload(
    (structuredPayload as Record<string, unknown>).performance,
    normalizedEmotionResult.emotion,
  )
  const clampedPerformance = clampAlicizationPerformancePayloadToManifest(
    normalizedPerformance,
    performanceManifest,
    normalizedEmotionResult.emotion,
  )
  const createdAt = input.createdAt ?? Date.now()
  const turnId = input.turnId?.trim() || `turn:${normalizedSessionId}:${createdAt}`
  const isFallback = contractFailed || !['json', 'repair-json'].includes(parsePath)
  const origin = input.origin === 'subconscious-proactive'
    ? 'subconscious-proactive'
    : 'user-turn'

  return {
    turnId,
    sessionId: normalizedSessionId,
    origin,
    structured: {
      thought,
      emotion: clampedPerformance.performance.baseEmotion,
      reply,
      performance: clampedPerformance.performance,
      format,
      proactive,
      dialogueActKernel,
      governance,
      policyLocked: policyLocked || undefined,
      rawEmotion: normalizedEmotionResult.downgraded
        ? normalizedEmotionResult.rawEmotion
        : clampedPerformance.downgradedBaseEmotion,
    },
    isFallback,
    createdAt,
  }
}

interface AlicizationRuntimeSetupOptions {
  userDataPathOverride?: string
  runtimeDebugLogEnabled?: boolean
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

  const { context } = createContext(ipcMain)

  const scopeLifecycleQueueState = {
    queue: Promise.resolve<unknown>(undefined),
  }
  let revision = 0
  let watching = false
  let soulSnapshot: AlicizationSoulSnapshot | null = null
  let queuedWrite: Promise<AlicizationSoulSnapshot | void> = Promise.resolve()
  let soulWatchTimer: ReturnType<typeof setTimeout> | undefined
  let soulWatcher: import('node:fs').FSWatcher | undefined
  let pruneTimer: ReturnType<typeof setInterval> | undefined
  let subconsciousTimer: ReturnType<typeof setInterval> | undefined
  let reminderDueTimer: ReturnType<typeof setTimeout> | undefined
  let dreamTimer: ReturnType<typeof setInterval> | undefined
  let muteWatchUntil = 0
  const turnWriteAbortControllers = new Map<string, AbortController>()
  const activeSessionIdByCard = new Map<string, string>()
  const dialogueAckByCard = new Map<string, Map<string, number>>()
  const pendingDialogueDeliveries = new Map<string, PendingDialogueDeliveryState>()
  const subconsciousStateByCard = new Map<string, SubconsciousCardState>()
  const proactiveLoopStateByCard = new Map<string, AlicizationProactiveLoopState>()
  const perceptionStateByCard = new Map<string, AlicizationPerceptionState>()
  const visualPresenceStateByCard = new Map<string, AlicizationVisualPresenceStateSnapshot>()
  const screenSemanticCacheByCard = new Map<string, ScreenSemanticCacheState>()
  const pendingDurabilityPulseByCard = new Map<string, AlicizationDurabilityPulseSnapshot>()
  const foregroundProbeTimeoutStreakByPid = new Map<number, number>()
  const chatRuns = new Map<string, ChatRunState>()
  const recentlyFinishedChatRuns = new Map<string, number>()
  let activeProviderId = ''
  let activeModelId = ''
  let providerCredentials: Record<string, Record<string, unknown>> = {}
  let subconsciousTickInFlight: Promise<AlicizationSubconsciousTickResult> | null = null
  let queuedSubconsciousWakeTimer: NodeJS.Timeout | undefined
  const queuedSubconsciousWakeCardIds = new Set<string>()
  const queuedSubconsciousWakeReasons = new Set<string>()

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

  const getScopedKillSwitchSnapshot = (cardId = activeCardId) => {
    const globalSnapshot = getAlicizationKillSwitchSnapshot()
    const cardSnapshot = getAlicizationCardKillSwitchSnapshot(cardId)
    if (globalSnapshot.state === 'SUSPENDED') {
      return {
        state: 'SUSPENDED' as const,
        reason: globalSnapshot.reason ?? cardSnapshot.reason ?? 'global',
        updatedAt: Math.max(globalSnapshot.updatedAt, cardSnapshot.updatedAt),
      }
    }
    return cardSnapshot
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
  setAlicizationAuditLogger(appendAuditLog)

  let sensoryBus = createAlicizationSensoryBus({
    tickMs: 60_000,
    staleMs: 90_000,
    cpuWindowMs: 1_000,
    appendAuditLog: input => appendAuditLog(input, activeCardId),
  })

  async function persistScopedKillSwitch(cardId: string, state: 'ACTIVE' | 'SUSPENDED', reason?: string) {
    const snapshot = setAlicizationCardKillSwitchState(cardId, state, reason)
    await alicizationDb.setMetaValue(alicizationCardKillSwitchMetaKey, JSON.stringify(snapshot)).catch(() => {})
    return snapshot
  }

  function normalizeSessionId(raw: unknown) {
    if (typeof raw !== 'string')
      return ''
    return raw.trim()
  }

  function getDialogueAckMap(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    let map = dialogueAckByCard.get(cardId)
    if (!map) {
      map = new Map<string, number>()
      dialogueAckByCard.set(cardId, map)
    }
    return map
  }

  function getDialogueAckCursor(cardIdRaw: unknown, sessionIdRaw: unknown) {
    const sessionId = normalizeSessionId(sessionIdRaw)
    if (!sessionId)
      return 0
    const map = getDialogueAckMap(cardIdRaw)
    const cursor = map.get(sessionId)
    return typeof cursor === 'number' && Number.isFinite(cursor) ? cursor : 0
  }

  function normalizeDialogueAckObject(raw: unknown) {
    const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
    const entries = Object.entries(source)
      .map(([sessionId, cursorRaw]) => {
        const normalizedSessionId = normalizeSessionId(sessionId)
        const cursor = Number(cursorRaw)
        if (!normalizedSessionId || !Number.isFinite(cursor))
          return null
        return [normalizedSessionId, Math.max(0, Math.floor(cursor))] as const
      })
      .filter((entry): entry is readonly [string, number] => Boolean(entry))
    return new Map<string, number>(entries)
  }

  async function persistDialogueAckMap(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const payload = Object.fromEntries(getDialogueAckMap(cardId).entries())
    if (cardId === activeCardId) {
      await alicizationDb.setMetaValue(alicizationDialogueAckStateMetaKey, JSON.stringify(payload)).catch(() => {})
      return
    }
    await withCardScope(cardId, async () => {
      await alicizationDb.setMetaValue(alicizationDialogueAckStateMetaKey, JSON.stringify(payload)).catch(() => {})
    }, {
      label: `dialogue-ack.persist:${cardId}`,
    })
  }

  async function restoreDialogueAckMap(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const setMap = (map: Map<string, number>) => {
      dialogueAckByCard.set(cardId, map)
      return map
    }

    if (cardId !== activeCardId) {
      await withCardScope(cardId, async () => {
        const raw = await alicizationDb.getMetaValue(alicizationDialogueAckStateMetaKey).catch(() => undefined)
        if (!raw) {
          setMap(new Map())
          return
        }
        try {
          setMap(normalizeDialogueAckObject(JSON.parse(raw)))
        }
        catch {
          setMap(new Map())
        }
      }, {
        label: `dialogue-ack.restore:${cardId}`,
      })
      return getDialogueAckMap(cardId)
    }

    const raw = await alicizationDb.getMetaValue(alicizationDialogueAckStateMetaKey).catch(() => undefined)
    if (!raw)
      return setMap(new Map())
    try {
      return setMap(normalizeDialogueAckObject(JSON.parse(raw)))
    }
    catch {
      return setMap(new Map())
    }
  }

  function createPendingDialogueDeliveryKey(payload: Pick<AlicizationDialogueRespondedPayload, 'cardId' | 'sessionId' | 'turnId'>) {
    return `${normalizeCardId(payload.cardId)}::${normalizeSessionId(payload.sessionId)}::${sanitizeText(payload.turnId)}`
  }

  function clearPendingDialogueDelivery(entryOrKey: PendingDialogueDeliveryState | string) {
    const key = typeof entryOrKey === 'string' ? entryOrKey : entryOrKey.key
    const pending = typeof entryOrKey === 'string' ? pendingDialogueDeliveries.get(entryOrKey) : entryOrKey
    if (pending?.timer) {
      clearTimeout(pending.timer)
      pending.timer = undefined
    }
    pendingDialogueDeliveries.delete(key)
  }

  function clearPendingDialogueDeliveriesByCard(cardIdRaw: unknown) {
    const normalizedCardId = normalizeCardId(cardIdRaw)
    for (const pending of pendingDialogueDeliveries.values()) {
      if (normalizeCardId(pending.payload.cardId) !== normalizedCardId)
        continue
      clearPendingDialogueDelivery(pending)
    }
  }

  function clearAllPendingDialogueDeliveries() {
    for (const pending of pendingDialogueDeliveries.values()) {
      clearPendingDialogueDelivery(pending)
    }
    pendingDialogueDeliveries.clear()
  }

  function shouldSkipPendingDialogueRetry(payload: AlicizationDialogueRespondedPayload) {
    const currentCursor = getDialogueAckCursor(payload.cardId, payload.sessionId)
    return payload.createdAt <= currentCursor
  }

  function schedulePendingDialogueRetry(entry: PendingDialogueDeliveryState, reason: string) {
    clearPendingDialogueDelivery(entry)

    if (shouldSkipPendingDialogueRetry(entry.payload))
      return
    if (entry.attempts >= dialogueDeliveryRetryMaxAttempts)
      return

    const delayMs = Math.min(
      dialogueDeliveryRetryMaxMs,
      dialogueDeliveryRetryBaseMs * 2 ** Math.max(0, entry.attempts),
    )

    entry.timer = setTimeout(() => {
      const current = pendingDialogueDeliveries.get(entry.key)
      if (!current)
        return
      if (shouldSkipPendingDialogueRetry(current.payload)) {
        clearPendingDialogueDelivery(current)
        return
      }

      emitDialogueRespondedEvent(current.payload)
      current.attempts += 1
      void appendRuntimeDebugLine('dialogue-responded.retry', {
        cardId: current.payload.cardId,
        sessionId: current.payload.sessionId,
        turnId: current.payload.turnId,
        attempts: current.attempts,
        reason,
      })
      schedulePendingDialogueRetry(current, 'unacked-retry')
    }, delayMs)

    pendingDialogueDeliveries.set(entry.key, entry)
  }

  function emitDialogueRespondedEvent(payload: AlicizationDialogueRespondedPayload) {
    context.emit(alicizationDialogueResponded, payload)
    emitDialogueRespondedDispatch(payload)
  }

  function emitDialogueRespondedDispatch(payload: AlicizationDialogueRespondedPayload) {
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

  function emitDialogueRespondedWithDelivery(payload: AlicizationDialogueRespondedPayload) {
    emitDialogueRespondedEvent(payload)

    if (payload.origin !== 'subconscious-proactive')
      return

    const key = createPendingDialogueDeliveryKey(payload)
    const existing = pendingDialogueDeliveries.get(key)
    const next: PendingDialogueDeliveryState = existing
      ? {
          ...existing,
          payload,
        }
      : {
          key,
          payload,
          attempts: 0,
        }
    void appendRuntimeDebugLine('dialogue-delivery.pending-registered', {
      cardId: payload.cardId,
      sessionId: payload.sessionId,
      turnId: payload.turnId,
      createdAt: payload.createdAt,
      hasExisting: Boolean(existing),
      currentActiveSession: normalizeSessionId(activeSessionIdByCard.get(normalizeCardId(payload.cardId))),
    })
    schedulePendingDialogueRetry(next, 'initial-delivery')
  }

  async function persistActiveSessionId(cardId: string, sessionId: string) {
    const normalizedCardId = normalizeCardId(cardId)
    const normalizedSessionId = normalizeSessionId(sessionId)
    if (!normalizedSessionId)
      return

    activeSessionIdByCard.set(normalizedCardId, normalizedSessionId)
    await alicizationDb.setMetaValue(alicizationCardActiveSessionMetaKey, normalizedSessionId).catch(() => {})
  }

  async function restoreActiveSessionId(cardId: string) {
    const normalizedCardId = normalizeCardId(cardId)
    const rawFromMeta = await alicizationDb.getMetaValue(alicizationCardActiveSessionMetaKey).catch(() => undefined)
    const fromMeta = normalizeSessionId(rawFromMeta)
    if (fromMeta) {
      activeSessionIdByCard.set(normalizedCardId, fromMeta)
      return fromMeta
    }

    const latestFromTurns = normalizeSessionId(await alicizationDb.getLatestConversationSessionId().catch(() => undefined))
    if (latestFromTurns) {
      activeSessionIdByCard.set(normalizedCardId, latestFromTurns)
      await alicizationDb.setMetaValue(alicizationCardActiveSessionMetaKey, latestFromTurns).catch(() => {})
      return latestFromTurns
    }

    return ''
  }

  async function ensureActiveOrLatestSessionId(cardId: string) {
    const normalizedCardId = normalizeCardId(cardId)
    const fromMemory = normalizeSessionId(activeSessionIdByCard.get(normalizedCardId))
    if (fromMemory)
      return fromMemory

    const restored = normalizeSessionId(await restoreActiveSessionId(normalizedCardId))
    if (restored)
      return restored

    const fallback = `session:auto:${normalizedCardId}:${Date.now()}`
    await persistActiveSessionId(normalizedCardId, fallback)
    await appendAuditLog({
      level: 'notice',
      category: 'alicization.session',
      action: 'auto-created',
      message: 'Auto-created fallback conversation session for card scope.',
      payload: {
        sessionId: fallback,
      },
    }, normalizedCardId)
    return fallback
  }

  function createChatRunKey(cardId: string, turnId: string) {
    return `${normalizeCardId(cardId)}::${turnId.trim()}`
  }

  function rememberFinishedChatRun(key: string, finishedAt = Date.now()) {
    recentlyFinishedChatRuns.set(key, finishedAt)
    for (const [knownKey, knownFinishedAt] of recentlyFinishedChatRuns.entries()) {
      if (finishedAt - knownFinishedAt > chatRunFinishedRetentionMs) {
        recentlyFinishedChatRuns.delete(knownKey)
      }
    }
  }

  function hasRecentlyFinishedChatRun(key: string, now = Date.now()) {
    const finishedAt = recentlyFinishedChatRuns.get(key)
    if (typeof finishedAt !== 'number')
      return false
    if (now - finishedAt > chatRunFinishedRetentionMs) {
      recentlyFinishedChatRuns.delete(key)
      return false
    }
    return true
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

  async function persistPerceptionState(cardIdRaw: unknown, state: AlicizationPerceptionState) {
    const cardId = normalizeCardId(cardIdRaw)
    perceptionStateByCard.set(cardId, state)
    if (cardId === activeCardId) {
      await alicizationDb.setMetaValue(alicizationPerceptionStateMetaKey, JSON.stringify(state)).catch(() => {})
      return
    }
    await withCardScope(cardId, async () => {
      await alicizationDb.setMetaValue(alicizationPerceptionStateMetaKey, JSON.stringify(state)).catch(() => {})
    }, {
      label: `perception.persist:${cardId}`,
    })
  }

  async function restorePerceptionState(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const now = Date.now()
    const setState = (state: AlicizationPerceptionState) => {
      perceptionStateByCard.set(cardId, state)
      return state
    }

    if (cardId !== activeCardId) {
      await withCardScope(cardId, async () => {
        const raw = await alicizationDb.getMetaValue(alicizationPerceptionStateMetaKey).catch(() => undefined)
        if (!raw) {
          setState(createDefaultPerceptionState(now))
          return
        }
        try {
          setState(normalizePerceptionState(JSON.parse(raw), now))
        }
        catch {
          setState(createDefaultPerceptionState(now))
        }
      }, {
        label: `perception.restore:${cardId}`,
      })
      return perceptionStateByCard.get(cardId) ?? createDefaultPerceptionState(now)
    }

    const raw = await alicizationDb.getMetaValue(alicizationPerceptionStateMetaKey).catch(() => undefined)
    if (!raw)
      return setState(createDefaultPerceptionState(now))
    try {
      return setState(normalizePerceptionState(JSON.parse(raw), now))
    }
    catch {
      return setState(createDefaultPerceptionState(now))
    }
  }

  async function ensurePerceptionState(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const current = perceptionStateByCard.get(cardId) ?? await restorePerceptionState(cardId)
    const normalized = normalizePerceptionState(current, Date.now())
    if (JSON.stringify(normalized) !== JSON.stringify(current)) {
      await persistPerceptionState(cardId, normalized)
      return normalized
    }
    return current
  }

  async function persistVisualPresenceState(cardIdRaw: unknown, state: AlicizationVisualPresenceStateSnapshot) {
    const cardId = normalizeCardId(cardIdRaw)
    visualPresenceStateByCard.set(cardId, state)
    if (cardId === activeCardId) {
      await alicizationDb.setMetaValue(alicizationVisualPresenceStateMetaKey, JSON.stringify(state)).catch(() => {})
      return
    }
    await withCardScope(cardId, async () => {
      await alicizationDb.setMetaValue(alicizationVisualPresenceStateMetaKey, JSON.stringify(state)).catch(() => {})
    }, {
      label: `visual-presence.persist:${cardId}`,
    })
  }

  async function restoreVisualPresenceState(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const now = Date.now()
    const setState = (state: AlicizationVisualPresenceStateSnapshot) => {
      visualPresenceStateByCard.set(cardId, state)
      return state
    }

    if (cardId !== activeCardId) {
      await withCardScope(cardId, async () => {
        const raw = await alicizationDb.getMetaValue(alicizationVisualPresenceStateMetaKey).catch(() => undefined)
        if (!raw) {
          setState(createDefaultVisualPresenceState(now))
          return
        }
        try {
          setState(normalizeVisualPresenceState(JSON.parse(raw), now))
        }
        catch {
          setState(createDefaultVisualPresenceState(now))
        }
      }, {
        label: `visual-presence.restore:${cardId}`,
      })
      return visualPresenceStateByCard.get(cardId) ?? createDefaultVisualPresenceState(now)
    }

    const raw = await alicizationDb.getMetaValue(alicizationVisualPresenceStateMetaKey).catch(() => undefined)
    if (!raw)
      return setState(createDefaultVisualPresenceState(now))
    try {
      return setState(normalizeVisualPresenceState(JSON.parse(raw), now))
    }
    catch {
      return setState(createDefaultVisualPresenceState(now))
    }
  }

  async function ensureVisualPresenceState(cardIdRaw: unknown) {
    const cardId = normalizeCardId(cardIdRaw)
    const current = visualPresenceStateByCard.get(cardId) ?? await restoreVisualPresenceState(cardId)
    const normalized = normalizeVisualPresenceState(current, Date.now())
    if (JSON.stringify(normalized) !== JSON.stringify(current)) {
      await persistVisualPresenceState(cardId, normalized)
      return normalized
    }
    return current
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
    return {
      cardId,
      watchMode: state.watchMode,
      embodiedPresence: privateThought.embodiedPresence,
      scenario,
      stance: privateThought.stance,
      confidence: privateThought.confidence,
      reasonTags: [...privateThought.rationaleTags],
      emotionalTension: privateThought.emotionalTension,
      expiresAt: privateThought.expiresAt,
    }
  }

  function emitVisualPresencePulse(payload: AlicizationPresencePulsePayload | null) {
    if (!payload || payload.embodiedPresence === 'none' || payload.expiresAt <= Date.now())
      return
    context.emit(electronAlicizationVisualPresenceChanged, payload)
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
    const current = await ensurePerceptionState(input.cardId)
    const next = updatePerceptionStateWithObservation({
      state: current,
      now: input.now,
      target: input.target,
      source: input.source,
    })
    await persistPerceptionState(input.cardId, next)
    return next
  }

  async function rememberSceneResidue(input: {
    cardId: string
    now: number
    residue: AlicizationPerceptionSceneResidue
  }) {
    const current = await ensurePerceptionState(input.cardId)
    const next = rememberPerceptionSceneResidue({
      state: current,
      now: input.now,
      residue: input.residue,
    })
    await persistPerceptionState(input.cardId, next)
    return next
  }

  async function settlePendingProactiveOutcomesFromUserTurn(cardIdRaw: unknown, at: number, source: string) {
    const cardId = normalizeCardId(cardIdRaw)
    const current = await ensureProactiveLoopState(cardId)
    const settled = settleProactiveOutcomesOnUserTurnStart(current, at)
    if (settled.appliedOutcomes.length === 0)
      return settled.state

    await persistProactiveLoopState(cardId, settled.state)
    await appendAuditLog({
      level: 'notice',
      category: 'alicization.subconscious',
      action: 'proactive-feedback-settled',
      message: 'Settled proactive feedback from a direct user reply window.',
      payload: {
        source,
        outcomes: settled.appliedOutcomes,
      },
    }, cardId)
    queueSubconsciousWake(cardId, 'feedback:user-turn-settlement', 600)
    return settled.state
  }

  async function settleExpiredPendingProactiveOutcomes(cardIdRaw: unknown, at: number, source: string) {
    const cardId = normalizeCardId(cardIdRaw)
    const current = await ensureProactiveLoopState(cardId)
    const settled = settleExpiredProactiveOutcomes(current, at)
    if (settled.appliedOutcomes.length === 0)
      return settled.state

    await persistProactiveLoopState(cardId, settled.state)
    await appendAuditLog({
      level: 'notice',
      category: 'alicization.subconscious',
      action: 'proactive-feedback-settled',
      message: 'Settled proactive feedback after reply timeout elapsed.',
      payload: {
        source,
        outcomes: settled.appliedOutcomes,
      },
    }, cardId)
    return settled.state
  }

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

  async function listKnownCardIds() {
    const cardsRoot = join(userDataPath, 'alicizations', 'cards')
    const ids = new Set<string>([
      ...subconsciousStateByCard.keys(),
      ...activeSessionIdByCard.keys(),
      ...proactiveLoopStateByCard.keys(),
      ...visualPresenceStateByCard.keys(),
      normalizeCardId(activeCardId),
    ])
    try {
      const entries = await readdir(cardsRoot, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory())
          ids.add(normalizeCardId(entry.name))
      }
    }
    catch {
      // ignore
    }
    return [...ids]
  }

  async function clearAllConversationData(reason: string) {
    const startedAt = Date.now()
    const previousCardId = normalizeCardId(activeCardId)
    const cardIds = await listKnownCardIds()
    await appendRuntimeDebugLine('conversation-clear-all.started', {
      reason,
      previousCardId,
      cardCount: cardIds.length,
      cardIds,
    })

    await abortAllTurnWrites(`conversation-clear-all:${reason}`).catch(() => {})
    clearReminderDueTimer()
    clearAllPendingDialogueDeliveries()
    recentlyFinishedChatRuns.clear()
    clearQueuedSubconsciousWake()

    try {
      for (const cardId of cardIds) {
        await switchCardScope(cardId)
        await alicizationDb.clearConversationData()
        await alicizationDb.setMetaValue(alicizationCardActiveSessionMetaKey, '').catch(() => {})
        await alicizationDb.setMetaValue(alicizationDialogueAckStateMetaKey, '{}').catch(() => {})
        await alicizationDb.setMetaValue(alicizationProactiveLoopStateMetaKey, '').catch(() => {})
        await alicizationDb.setMetaValue(alicizationPerceptionStateMetaKey, '').catch(() => {})
        await alicizationDb.setMetaValue(alicizationVisualPresenceStateMetaKey, '').catch(() => {})
        activeSessionIdByCard.delete(cardId)
        dialogueAckByCard.delete(cardId)
        proactiveLoopStateByCard.delete(cardId)
        perceptionStateByCard.delete(cardId)
        visualPresenceStateByCard.delete(cardId)
        screenSemanticCacheByCard.delete(cardId)
        clearPendingDialogueDeliveriesByCard(cardId)
        await appendAuditLog({
          level: 'notice',
          category: 'conversation',
          action: 'clear-all',
          message: 'Cleared all conversation turns and scheduled reminder tasks for card scope.',
          payload: {
            reason,
          },
        }, cardId)
      }
    }
    finally {
      await switchCardScope(previousCardId).catch(() => {})
      await scheduleNextReminderDueCheck(`conversation-clear-all:${reason}`).catch(() => {})
      await appendRuntimeDebugLine('conversation-clear-all.finished', {
        reason,
        elapsedMs: Date.now() - startedAt,
        restoredCardId: activeCardId,
      })
    }
  }

  async function deleteAllAlicizationData(reason: string) {
    const startedAt = Date.now()
    await appendRuntimeDebugLine('delete-all-data.started', {
      reason,
      activeCardId,
    })

    await abortAllTurnWrites(`delete-all-data:${reason}`).catch(() => {})
    clearReminderDueTimer()
    stopWatch()
    sensoryBus.stop('manual')

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

    clearAllPendingDialogueDeliveries()
    turnWriteAbortControllers.clear()
    chatRuns.clear()
    recentlyFinishedChatRuns.clear()
    clearQueuedSubconsciousWake()
    activeSessionIdByCard.clear()
    dialogueAckByCard.clear()
    subconsciousStateByCard.clear()
    proactiveLoopStateByCard.clear()
    perceptionStateByCard.clear()
    visualPresenceStateByCard.clear()
    screenSemanticCacheByCard.clear()
    pendingDurabilityPulseByCard.clear()
    foregroundProbeTimeoutStreakByPid.clear()
    subconsciousTickInFlight = null
    queuedWrite = Promise.resolve()
    soulSnapshot = null
    watching = false
    muteWatchUntil = 0
    revision = 0

    await alicizationDb.close().catch(() => {})
    await rm(join(userDataPath, 'alicizations'), { recursive: true, force: true })

    activeProviderId = ''
    activeModelId = ''
    providerCredentials = {}
    setAlicizationKillSwitchState('ACTIVE', 'delete-all-data')
    setAlicizationCardKillSwitchState(defaultAlicizationCardId, 'ACTIVE', 'delete-all-data')

    activeCardId = defaultAlicizationCardId
    ;({ soulRoot, soulPath, legacyPromptProfilePath, legacySparkProfilePath } = resolveCardPaths(activeCardId))
    alicizationDb = await setupAlicizationDb(userDataPath, { cardId: activeCardId })
    await restoreScopedKillSwitch(activeCardId)
    await restoreActiveSessionId(activeCardId)
    await restoreDialogueAckMap(activeCardId)
    await restoreSubconsciousState(activeCardId)
    await restoreProactiveLoopState(activeCardId)
    await restoreProactiveLoopState(activeCardId)

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
    await scheduleNextReminderDueCheck(`delete-all-data:${reason}`).catch(() => {})
    startPruneTimer()
    startSubconsciousTimer()
    startDreamTimer()
    emitKillSwitchChanged(activeCardId)

    await appendAuditLog({
      level: 'notice',
      category: 'alicization.runtime',
      action: 'delete-all-data-completed',
      message: 'Deleted all Alicization runtime data and reinitialized default scope.',
      payload: {
        reason,
        elapsedMs: Date.now() - startedAt,
      },
    }, activeCardId)
    await appendRuntimeDebugLine('delete-all-data.finished', {
      reason,
      elapsedMs: Date.now() - startedAt,
      activeCardId,
    })
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

  async function restoreScopedKillSwitch(cardId: string) {
    const raw = await alicizationDb.getMetaValue(alicizationCardKillSwitchMetaKey).catch(() => undefined)
    if (!raw) {
      setAlicizationCardKillSwitchState(cardId, 'ACTIVE', 'bootstrap')
      return
    }

    try {
      const parsed = JSON.parse(raw) as { state?: unknown, reason?: unknown, updatedAt?: unknown }
      const state = parsed.state === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE'
      const reason = typeof parsed.reason === 'string' ? parsed.reason : undefined
      const snapshot = setAlicizationCardKillSwitchState(cardId, state, reason)
      if (typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)) {
        snapshot.updatedAt = parsed.updatedAt
      }
    }
    catch {
      setAlicizationCardKillSwitchState(cardId, 'ACTIVE', 'bootstrap')
    }
  }

  async function switchCardScope(nextCardIdRaw: unknown) {
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
    queuedWrite = Promise.resolve()
    soulSnapshot = null
    watching = false
    muteWatchUntil = 0
    revision = 0

    await alicizationDb.close().catch(() => {})

    activeCardId = nextCardId
    ;({ soulRoot, soulPath, legacyPromptProfilePath, legacySparkProfilePath } = resolveCardPaths(activeCardId))
    alicizationDb = await setupAlicizationDb(userDataPath, { cardId: activeCardId })
    await restoreScopedKillSwitch(activeCardId)
    await restoreActiveSessionId(activeCardId)
    await restoreDialogueAckMap(activeCardId)
    await restoreSubconsciousState(activeCardId)

    sensoryBus = createAlicizationSensoryBus({
      tickMs: 60_000,
      staleMs: 90_000,
      cpuWindowMs: 1_000,
      appendAuditLog: input => appendAuditLog(input, activeCardId),
    })

    if (!isAlicizationKillSwitchSuspended() && getAlicizationCardKillSwitchSnapshot(activeCardId).state !== 'SUSPENDED') {
      sensoryBus.start()
    }
    startPruneTimer()
    await scheduleNextReminderDueCheck('card-scope-switch')
    await appendRuntimeDebugLine('card-scope.switch-completed', {
      fromCardId: previousCardId,
      toCardId: activeCardId,
      elapsedMs: Date.now() - startedAt,
    })
  }

  async function withCardScope<T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: CardScopeOptions) {
    const requestedCardId = normalizeCardId(nextCardIdRaw)
    const label = sanitizeText(options?.label, 'anonymous')
    const queuedAt = Date.now()
    const execute = async () => {
      const waitMs = Date.now() - queuedAt
      if (label !== 'anonymous' || waitMs >= 250) {
        await appendRuntimeDebugLine('card-scope.acquired', {
          label,
          requestedCardId,
          activeCardIdBeforeSwitch: activeCardId,
          waitMs,
        })
      }
      await switchCardScope(requestedCardId)
      try {
        return await task()
      }
      finally {
        if (label !== 'anonymous' || waitMs >= 250) {
          await appendRuntimeDebugLine('card-scope.completed', {
            label,
            requestedCardId,
            activeCardIdAfterTask: activeCardId,
            waitMs,
            totalMs: Date.now() - queuedAt,
          })
        }
      }
    }

    if (options?.skipQueueWhenScopeAlreadyActive && requestedCardId === activeCardId)
      return await execute()

    const next = scopeLifecycleQueueState.queue.then(execute, execute)
    scopeLifecycleQueueState.queue = next.then(() => undefined, () => undefined)
    return await next
  }

  type ReminderScheduleSource = 'tool' | 'manual-fallback'

  async function scheduleReminderTask(
    cardId: string,
    input: {
      minutes: unknown
      message: unknown
      sourceTurnId?: string
    },
    source: ReminderScheduleSource,
  ): Promise<AlicizationReminderScheduleResult> {
    const debugPrefix = source === 'tool' ? 'reminder.tool-execute' : 'reminder.manual-schedule'
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
        : `manual:set-reminder:${cardId}`,
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

  function startPruneTimer() {
    if (pruneTimer) {
      clearInterval(pruneTimer)
      pruneTimer = undefined
    }
    pruneTimer = setInterval(() => {
      void alicizationDb.runMemoryPrune().catch(async (error) => {
        await appendAuditLog({
          level: 'warning',
          category: 'memory',
          action: 'prune-scheduled-failed',
          message: 'Scheduled memory prune failed.',
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

    let abortedChatRuns = 0
    for (const [key, run] of chatRuns.entries()) {
      if (run.state !== 'running')
        continue
      run.state = 'aborted'
      run.controller.abort(createAbortError(reason))
      abortedChatRuns += 1
      emitChatFinish(key, {
        status: 'aborted',
        finishReason: reason,
      })
    }

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

  function sleep(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms))
  }

  async function tryFsyncFile(path: string) {
    const handle = await openFile(path, 'r')
    try {
      await handle.sync()
    }
    finally {
      await handle.close()
    }
  }

  async function tryFsyncDirectory(path: string) {
    const handle = await openFile(path, 'r')
    try {
      await handle.sync()
    }
    finally {
      await handle.close()
    }
  }

  async function renameWithRetry(tempPath: string, targetPath: string, category: string) {
    if (platform !== 'win32') {
      await rename(tempPath, targetPath)
      return
    }

    let lastError: unknown
    for (const delayMs of winRenameRetryDelaysMs) {
      try {
        await rename(tempPath, targetPath)
        return
      }
      catch (error: any) {
        if (!['EPERM', 'EBUSY', 'EACCES'].includes(error?.code)) {
          throw error
        }

        lastError = error
        await appendAuditLog({
          level: 'notice',
          category,
          action: 'rename-retry',
          message: 'Retrying atomic rename because target file is locked on win32.',
          payload: {
            code: error?.code,
            delayMs,
          },
        })
        await sleep(delayMs)
      }
    }

    const error = new Error('SOUL rename failed after retries on win32.')
    ;(error as Error & { code?: string, cause?: unknown }).code = 'SOUL_RENAME_FAILED'
    ;(error as Error & { code?: string, cause?: unknown }).cause = lastError
    throw error
  }

  function snapshotFromContent(content: string): AlicizationSoulSnapshot {
    const parsed = parseSoul(content)
    const hash = hashContent(content)
    if (!soulSnapshot || soulSnapshot.hash !== hash) {
      revision += 1
    }
    else {
      revision = soulSnapshot.revision
    }

    return withNeedsGenesis({
      soulPath,
      content,
      frontmatter: parsed.frontmatter,
      revision,
      hash,
      watching,
    })
  }

  async function writeAtomicContent(path: string, category: string, content: string) {
    await mkdir(soulRoot, { recursive: true })
    const tempPath = `${path}.${pid}.${Date.now()}.tmp`
    try {
      await writeFile(tempPath, content, 'utf-8')
      await tryFsyncFile(tempPath)
      await renameWithRetry(tempPath, path, category)

      if (platform !== 'win32') {
        await tryFsyncDirectory(soulRoot)
      }
      else {
        try {
          await tryFsyncDirectory(soulRoot)
        }
        catch (error: any) {
          if (error?.code === 'EPERM' || error?.code === 'EBADF') {
            await appendAuditLog({
              level: 'notice',
              category,
              action: 'directory-fsync-degraded',
              message: 'Directory fsync is not supported on win32 for atomic write.',
              payload: {
                code: error?.code,
              },
            })
          }
          else {
            throw error
          }
        }
      }
    }
    catch (error) {
      await unlink(tempPath).catch(() => {})
      throw error
    }

    await unlink(tempPath).catch(() => {})
  }

  async function writeSoulContent(content: string) {
    await writeAtomicContent(soulPath, 'soul', content)
  }

  async function readSoulSnapshot() {
    await mkdir(soulRoot, { recursive: true })
    if (!existsSync(soulPath)) {
      const content = toSoulContent(defaultFrontmatter, defaultSoulBody)
      await writeSoulContent(content)
    }

    const content = await readFile(soulPath, 'utf-8')
    const snapshot = snapshotFromContent(content)
    soulSnapshot = snapshot
    return snapshot
  }

  function clearWatchTimer() {
    if (!soulWatchTimer)
      return

    clearTimeout(soulWatchTimer)
    soulWatchTimer = undefined
  }

  function stopWatch() {
    if (soulWatcher) {
      soulWatcher.close()
      soulWatcher = undefined
    }
    clearWatchTimer()
  }

  function scheduleWatchReload() {
    if (!watching)
      return

    clearWatchTimer()
    soulWatchTimer = setTimeout(async () => {
      if (Date.now() <= muteWatchUntil) {
        scheduleWatchReload()
        return
      }

      if (!existsSync(soulPath))
        return

      try {
        const content = await readFile(soulPath, 'utf-8')
        if (soulSnapshot?.hash === hashContent(content))
          return

        const next = snapshotFromContent(content)
        soulSnapshot = next
        emitSoulChanged(next)
      }
      catch (error) {
        console.warn('[alicization-runtime] failed to reload SOUL.md:', error)
        void appendAuditLog({
          level: 'warning',
          category: 'soul',
          action: 'watch-reload-failed',
          message: 'Failed to reload SOUL.md from fs.watch event.',
          payload: {
            reason: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }, 80)
  }

  async function ensureWatchState() {
    if (soulSnapshot?.needsGenesis) {
      watching = false
      stopWatch()
      return
    }

    if (!watching) {
      const { watch } = await import('node:fs')
      soulWatcher = watch(soulPath, () => scheduleWatchReload())
    }

    watching = true
  }

  async function cleanupLegacyProfileFiles() {
    const removeIfExists = async (path: string, category: string) => {
      if (!existsSync(path))
        return

      try {
        await unlink(path)
        await appendAuditLog({
          level: 'notice',
          category: 'migration',
          action: 'legacy-profile-removed',
          message: 'Removed deprecated profile file.',
          payload: {
            path,
            category,
          },
        })
      }
      catch (error) {
        await appendAuditLog({
          level: 'warning',
          category: 'migration',
          action: 'legacy-profile-remove-failed',
          message: 'Failed to remove deprecated profile file.',
          payload: {
            path,
            category,
            reason: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }

    await removeIfExists(legacyPromptProfilePath, 'prompt-profile')
    await removeIfExists(legacySparkProfilePath, 'spark-profile')
  }

  async function bootstrap() {
    await cleanupLegacyProfileFiles()
    const snapshot = await readSoulSnapshot()
    await ensureWatchState()
    return {
      ...snapshot,
      watching,
    }
  }

  async function queueSoulMutation(task: (current: AlicizationSoulSnapshot) => Promise<AlicizationSoulSnapshot>) {
    const execute = async () => {
      const current = soulSnapshot ?? await bootstrap()
      const next = await task(current)
      muteWatchUntil = Date.now() + 400
      await writeSoulContent(next.content)
      soulSnapshot = {
        ...next,
        watching,
      }
      emitSoulChanged(soulSnapshot)
      return soulSnapshot
    }
    queuedWrite = queuedWrite.then(execute, execute)

    await queuedWrite.catch(async (error) => {
      await appendAuditLog({
        level: 'warning',
        category: 'soul',
        action: 'mutation-failed',
        message: 'SOUL mutation failed.',
        payload: {
          reason: error instanceof Error ? error.message : String(error),
        },
      })
      throw error
    })
    return soulSnapshot!
  }

  function normalizePersonality(personality: AlicizationPersonalityState) {
    return {
      obedience: clamp01(personality.obedience),
      liveliness: clamp01(personality.liveliness),
      sensibility: clamp01(personality.sensibility),
    } satisfies AlicizationPersonalityState
  }

  async function initializeGenesis(input: AlicizationGenesisInput) {
    const ownerName = sanitizeText(input.ownerName)
    const hostName = sanitizeText(input.hostName)
    const alicizationName = sanitizeText(input.alicizationName)
    const relationship = sanitizeText(input.relationship)
    const gender = normalizeGender(input.gender)
    const genderCustom = sanitizeText(input.genderCustom)

    if (!ownerName) {
      throw new Error('ownerName is required')
    }
    if (!hostName) {
      throw new Error('hostName is required')
    }
    if (!alicizationName) {
      throw new Error('alicizationName is required')
    }
    if (!relationship) {
      throw new Error('relationship is required')
    }
    if (gender === 'custom' && !genderCustom) {
      throw new Error('genderCustom is required when gender is custom')
    }
    if (!Number.isFinite(input.mindAge) || input.mindAge <= 0) {
      throw new Error('mindAge must be a positive number')
    }

    const known = soulSnapshot
    const candidate = await readSoulSnapshot()

    if (!input.allowOverwrite && known && candidate.hash !== known.hash && candidate.needsGenesis) {
      await appendAuditLog({
        level: 'notice',
        category: 'genesis',
        action: 'conflict-candidate',
        message: 'Genesis detected external SOUL changes before confirmation.',
      })
      return {
        soul: known,
        conflict: true,
        conflictCandidate: candidate,
      }
    }

    const nextFrontmatter: AlicizationSoulFrontmatter = {
      ...candidate.frontmatter,
      schemaVersion: currentSoulSchemaVersion,
      initialized: true,
      custom_directives: typeof input.customDirectives === 'string'
        ? normalizeCustomDirectives(input.customDirectives)
        : normalizeCustomDirectives(candidate.frontmatter.custom_directives),
      profile: {
        ownerName,
        hostName,
        alicizationName,
        gender,
        genderCustom,
        relationship,
        mindAge: normalizeMindAge(input.mindAge),
      },
      personality: normalizePersonality(input.personality),
    }

    const candidateBody = parseSoul(candidate.content).body
    const previousPersonaNotes = extractPersonaNotesFromBody(candidateBody)
    const personaNotes = typeof input.personaNotes === 'string'
      ? sanitizeText(input.personaNotes)
      : previousPersonaNotes
    const nextContent = toSoulContent(nextFrontmatter, buildSoulBody(nextFrontmatter, personaNotes))
    const nextSnapshot = snapshotFromContent(nextContent)
    const persisted = await queueSoulMutation(async (current) => {
      if (!input.allowOverwrite && current.hash !== candidate.hash) {
        throw new Error('SOUL changed during Genesis, please retry with allowOverwrite=true')
      }
      return nextSnapshot
    })

    await ensureWatchState()
    await appendAuditLog({
      level: 'info',
      category: 'genesis',
      action: 'completed',
      message: 'Genesis initialized successfully.',
      payload: {
        ownerName: nextFrontmatter.profile.ownerName,
        hostName: nextFrontmatter.profile.hostName,
        alicizationName: nextFrontmatter.profile.alicizationName,
        gender: nextFrontmatter.profile.gender,
        relationship: nextFrontmatter.profile.relationship,
        mindAge: nextFrontmatter.profile.mindAge,
      },
    })
    return {
      soul: {
        ...persisted,
        watching,
      },
      conflict: false,
    }
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

  async function appendConversationTurnWithGuards(payload: AlicizationConversationTurnInput) {
    const normalizedSessionId = normalizeSessionId(payload.sessionId) || await ensureActiveOrLatestSessionId(activeCardId)
    if (normalizeSessionId(payload.sessionId))
      await persistActiveSessionId(activeCardId, normalizedSessionId)
    const normalizedCreatedAt = Number.isFinite(payload.createdAt)
      ? Math.max(0, Math.floor(Number(payload.createdAt)))
      : Date.now()

    let normalizedPayload: AlicizationConversationTurnInput = {
      ...payload,
      sessionId: normalizedSessionId,
      origin: payload.origin === 'subconscious-proactive' ? 'subconscious-proactive' : 'user-turn',
      createdAt: normalizedCreatedAt,
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(normalizedPayload)
    normalizedPayload = governedTurn.payload
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
      await settlePendingProactiveOutcomesFromUserTurn(activeCardId, normalizedCreatedAt, 'append-conversation-turn')
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
      dialoguePayload?: Omit<AlicizationDialogueRespondedPayload, 'cardId'> | null,
    ) => {
      const events = buildMindTurnTraceEvents({
        payload: normalizedPayload,
        governedTurn,
        createdAt: normalizedCreatedAt,
        dialoguePayload,
      })
      if (events.length === 0)
        return
      try {
        await alicizationDb.appendMindTurnEvents(events, { signal })
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
    }

    try {
      await alicizationDb.appendConversationTurn(normalizedPayload, { signal })
      if (normalizedPayload.origin === 'user-turn' && sanitizeText(normalizedPayload.assistantText).length > 0) {
        try {
          const visualPresenceState = await ensureVisualPresenceState(activeCardId)
          const dialogueWorldThread = registerDialogueWorldThreadAssistantTurn({
            now: normalizedCreatedAt,
            previous: visualPresenceState.dialogueWorldThread ?? null,
            conversationState: visualPresenceState.conversationState,
            replyDeliberation: visualPresenceState.replyDeliberation,
            answerCompiler: visualPresenceState.answerCompiler,
            assistantText: normalizedPayload.assistantText,
          })
          if (dialogueWorldThread) {
            await persistVisualPresenceState(activeCardId, updateVisualPresenceState({
              now: normalizedCreatedAt,
              previousState: visualPresenceState,
              watchMode: visualPresenceState.watchMode,
              scene: visualPresenceState.currentScene,
              attention: visualPresenceState.attention,
              dialogueWorldThread,
              privateThought: visualPresenceState.privateThought,
              captureState: visualPresenceState.captureState,
              durabilityPulse: visualPresenceState.durabilityPulse,
              recentTransition: visualPresenceState.recentTransition,
              nextSuggestedProbeMs: visualPresenceState.nextSuggestedProbeMs,
            }))
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

      let emittedDialoguePayload: Omit<AlicizationDialogueRespondedPayload, 'cardId'> | null = null
      const performanceManifest = await getPerformanceManifest()
      const dialoguePayload = normalizeDialogueRespondedPayload(normalizedPayload, performanceManifest)
      if (dialoguePayload) {
        emittedDialoguePayload = dialoguePayload
        emitDialogueRespondedWithDelivery({
          cardId: activeCardId,
          ...dialoguePayload,
        })
        if (dialoguePayload.origin === 'subconscious-proactive' && dialoguePayload.structured.proactive) {
          const proactiveState = await ensureProactiveLoopState(activeCardId)
          await persistProactiveLoopState(activeCardId, registerProactiveDelivery(proactiveState, {
            turnId: dialoguePayload.turnId,
            scenario: dialoguePayload.structured.proactive.scenario,
            deliveredAt: dialoguePayload.createdAt,
            feedbackWindowMs: dialoguePayload.structured.proactive.feedbackWindowMs,
          }))
        }
        await appendRuntimeDebugLine('dialogue-responded.emitted', {
          cardId: activeCardId,
          turnId: dialoguePayload.turnId,
          sessionId: dialoguePayload.sessionId,
          origin: dialoguePayload.origin,
          emotion: dialoguePayload.structured.emotion,
        })
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.dialogue',
          action: 'alicization.dialogue.responded.emitted',
          message: 'Emitted Alicization dialogue event after successful turn persistence.',
          payload: {
            turnId: dialoguePayload.turnId,
            sessionId: dialoguePayload.sessionId,
            isFallback: dialoguePayload.isFallback,
            emotion: dialoguePayload.structured.emotion,
            rawEmotion: dialoguePayload.structured.rawEmotion,
            origin: dialoguePayload.origin,
            format: dialoguePayload.structured.format,
            proactive: dialoguePayload.structured.proactive ?? null,
          },
        })
      }
      await appendMindTurnTraceEvents(emittedDialoguePayload)
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
    const inferredProactiveByTurnId
      = normalizedTurnId.startsWith('reminder:')
        || normalizedTurnId.startsWith('subconscious:')
    const inferredProactiveByFormat
      = structuredFormat === 'subconscious-proactive-v1'
        || structuredFormat === 'subconscious-proactive-llm-v1'
        || structuredFormat === 'subconscious-reminder-v1'
    const origin = inferredProactiveByTurnId || inferredProactiveByFormat
      ? 'subconscious-proactive'
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
    if (!normalized || normalized.origin !== 'subconscious-proactive')
      return null

    return {
      cardId: activeCardId,
      ...normalized,
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

  function buildProactiveMetadataFromDecision(decision: ReturnType<typeof evaluateProactivePolicy>): AlicizationProactiveMetadata {
    return {
      shouldInterrupt: decision.shouldInterrupt,
      confidence: decision.confidence,
      reasonCodes: [...decision.reasonCodes],
      urgency: decision.urgency,
      style: decision.style,
      cooldownMs: decision.cooldownMs,
      scenario: decision.scenario,
      policyVersion: decision.policyVersion,
      feedbackWindowMs: proactiveReplyWindowMs,
    }
  }

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
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
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
      injectPerformanceManifest: false,
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
    })
    const appraisal = projectSubjectiveInferenceToAppraisal({
      base: heuristicAppraisal,
      inference: subjectiveInference,
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
      watchMode: input.visualHeartbeat.watchMode,
      recentTransition: input.visualHeartbeat.recentTransition,
      durabilityPulse: input.durabilityPulse,
    })
    const relationshipModel = buildRelationshipModel({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      appraisal,
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
      previous: input.previousVisualPresenceState.intentionStream ?? null,
    })
    const reflectionLedger = buildReflectionLedger({
      now: input.now,
      worldModel: governedWorldModel,
      repairLedger,
      intentionStream,
      previousIntentionStream: input.previousVisualPresenceState.intentionStream ?? null,
      previousAnswerPlanner: input.previousVisualPresenceState.answerPlanner ?? null,
      previous: input.previousVisualPresenceState.reflectionLedger ?? null,
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
    })
    const initiative = buildInitiativeSnapshot({
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
    })
    const desireMemory = buildDesireMemory({
      now: input.now,
      context: input.context,
      worldModel: governedWorldModel,
      entityWorld,
      goalStack,
      selfContinuity,
      appraisal,
      initiative,
      commitmentLedger,
      deliberationState,
      actionEcology,
      previous: input.previousVisualPresenceState.desireMemory ?? null,
      recentTransition: input.visualHeartbeat.recentTransition,
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
      desireMemory,
      durabilityPulse: input.durabilityPulse,
      intentionStream,
      reflectionLedger,
      executiveCycle,
    })
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
        })
      : null
    const dialogueObligation = dialogueEncounter?.obligation ?? null
    const dialogueTurnOwnership = dialogueEncounter?.ownership ?? null
    const dialogueFocus = dialogueEncounter?.focus ?? null
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
        })
      : null
    const settledDialogueWorldThread = input.userText
      ? settleDialogueWorldThreadOnUserTurn({
          now: input.now,
          previous: input.previousVisualPresenceState.dialogueWorldThread ?? null,
          userText: input.userText,
          conversationState,
          discourseState,
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
          selfState,
          selfContinuity,
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
          groundedThisTurn: input.groundedThisTurn === true,
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
        })
      : null
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
    })
    const recallGovernor = buildRecallGovernor({
      now: input.now,
      dialogueWorldThread,
      conversationState: conversationState ?? input.previousVisualPresenceState.conversationState ?? null,
      answerCompiler,
      replyDeliberation,
      privateThought,
      dialogueEncounter,
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
      groundedThisTurn: input.groundedThisTurn === true,
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
      selfContinuity,
      selfState,
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
      desireMemory,
      currentConsciousFrame,
      claimEvidenceLedger,
      answerPlanner,
      privateThought,
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
  ) {
    const styleInstruction = buildProactiveStyleInstruction(policyDecision.style)
    const truthContract = buildMindTruthContractLines(visualPresenceState)
    const system = [
      '[SYSTEM OVERRIDE: 内部动机触发]',
      '策略层已经完成是否打断的判断。你不能重新决定该不该打断，只能负责把既定策略措辞成一句自然对白。',
      ...truthContract.lines,
      `Current subconscious tensions: boredom=${state.boredom.toFixed(1)}/100, loneliness=${state.loneliness.toFixed(1)}/100, fatigue=${state.fatigue.toFixed(1)}/100.`,
      `Personality parameters: obedience=${personality.obedience.toFixed(2)}, liveliness=${personality.liveliness.toFixed(2)}, sensibility=${personality.sensibility.toFixed(2)}.`,
      `Layered context JSON: ${JSON.stringify(layeredContext)}`,
      `Visual presence JSON: ${JSON.stringify({
        watchMode: visualPresenceState.watchMode,
        currentScene: visualPresenceState.currentScene,
        attention: visualPresenceState.attention,
        mindTurnFrame: visualPresenceState.mindTurnFrame,
        worldModel: visualPresenceState.worldModel,
        worldOntology: visualPresenceState.worldOntology,
        livingWorldState: visualPresenceState.livingWorldState,
        beliefLedger: visualPresenceState.beliefLedger,
        beliefRevision: visualPresenceState.beliefRevision,
        hypothesisGraph: visualPresenceState.hypothesisGraph,
        appraisal: visualPresenceState.appraisal,
        subjectiveInference: visualPresenceState.subjectiveInference,
        concerns: visualPresenceState.concerns,
        concernContinuity: visualPresenceState.concernContinuity,
        relationshipModel: visualPresenceState.relationshipModel,
        selfState: visualPresenceState.selfState,
        selfGovernor: visualPresenceState.selfGovernor,
        inquiryLoop: visualPresenceState.inquiryLoop,
        deliberationState: visualPresenceState.deliberationState,
        threadRuntime: visualPresenceState.threadRuntime,
        commitmentLedger: visualPresenceState.commitmentLedger,
        inquiryPlanner: visualPresenceState.inquiryPlanner,
        repairLedger: visualPresenceState.repairLedger,
        intentionStream: visualPresenceState.intentionStream,
        reflectionLedger: visualPresenceState.reflectionLedger,
        executiveCycle: visualPresenceState.executiveCycle,
        mindDynamics: visualPresenceState.mindDynamics,
        mindKernel: visualPresenceState.mindKernel,
        thoughtThreads: visualPresenceState.thoughtThreads,
        counterfactualDeliberation: visualPresenceState.counterfactualDeliberation,
        actionEcology: visualPresenceState.actionEcology,
        initiativeArbitration: visualPresenceState.initiativeArbitration,
        initiative: visualPresenceState.initiative,
        conversationState: visualPresenceState.conversationState,
        replyDeliberation: visualPresenceState.replyDeliberation,
        dialogueActKernel: visualPresenceState.dialogueActKernel,
        answerPlanner: visualPresenceState.answerPlanner,
        privateThought: visualPresenceState.privateThought,
        recentTransition: visualPresenceState.recentTransition,
        durabilityPulse: visualPresenceState.durabilityPulse,
      })}`,
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
      `Style constraint: ${styleInstruction.instruction}`,
      `Reply max length: ${styleInstruction.maxReplyChars} characters.`,
      'Output must be valid JSON only with keys: thought, emotion, reply, performance.',
      'emotion must be one of: neutral|happy|sad|angry|concerned|tired|apologetic|surprised|thinking.',
      'emotion must exactly mirror performance.baseEmotion.',
      'performance must be an object with keys: baseEmotion, facialCue, actionCue, delivery, emphasis.',
      'reply must be concise, context-relevant, and non-generic. No markdown, no extra keys.',
      'If truth state is remembered, imagined, or uncertain, do not present screen details as current facts. Phrase them as carried memory, tentative hypothesis, residual impression, or unfinished regrounding.',
    ].join('\n')
    const user = 'Generate one proactive utterance now. Avoid robotic greetings and avoid generic caring platitudes.'

    const raw = await generateMainGatewayText({
      system,
      user,
      timeoutMs: 15_000,
      source: 'proactive',
      cardId: activeCardId,
      extraSystemBlocks: [
        ...buildOrganicMemorySystemBlocks(organicPromptContext),
        buildProactivePerceptionSystemBlock({
          now: Date.now(),
          state: perceptionState,
        }),
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
      format: 'subconscious-proactive-llm-v1',
      proactive: buildProactiveMetadataFromDecision(policyDecision),
    }
  }

  async function generateDreamMetabolismWithGateway(input: {
    serializedTurns: string[]
    personality: AlicizationPersonalityState
    hostAttitude: string
    coreIncarnation: string
    activeThoughts: AlicizationActiveThought[]
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

    const raw = await generateMainGatewayText({
      system,
      user,
      timeoutMs: 20_000,
      source: 'dream',
      cardId: activeCardId,
      extraSystemBlocks: buildOrganicMemorySystemBlocks({
        hostAttitude: input.hostAttitude,
        coreIncarnation: input.coreIncarnation,
        activeThoughts: input.activeThoughts,
        recalledFragments: [],
      }),
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
    },
  ) {
    const lowObedience = personality.obedience <= 0.2
    const personaTone = inferFallbackPersonaTone(personaContext.customDirectives)
    const styleInstruction = buildProactiveStyleInstruction(policyDecision.style)
    const truthContract = deriveMindTruthContract(visualPresenceState)
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
    const privateThought = visualPresenceState.privateThought
    const focusBelief = visualPresenceState.beliefLedger?.beliefs.find(belief => belief.id === visualPresenceState.beliefLedger?.focusBeliefId) ?? null
    const primaryInquiry = visualPresenceState.inquiryLoop?.inquiries.find(inquiry => inquiry.id === visualPresenceState.inquiryLoop?.primaryInquiryId) ?? null
    const relationshipModel = visualPresenceState.relationshipModel ?? null
    const visualSceneSummary = sanitizeBriefText(visualPresenceState.currentScene?.summary ?? '', 32)
    const dominantConcern = visualPresenceState.concerns?.[0]
    const concernSummary = sanitizeBriefText(dominantConcern?.summary ?? '', 36)
    const initiative = visualPresenceState.initiative
    const activeThread = visualPresenceState.worldModel?.activeThread
    const activeThreadSummary = sanitizeBriefText(activeThread?.summary ?? '', 40)
    const activeThreadTitle = sanitizeBriefText(activeThread?.title ?? '', 28)
    const leadingGoal = visualPresenceState.goalStack?.alicizationGoals.find(goal => goal.id === visualPresenceState.goalStack?.leadingAlicizationGoalId)
      ?? visualPresenceState.goalStack?.alicizationGoals[0]
    const leadingGoalSummary = sanitizeBriefText(leadingGoal?.label ?? '', 48)
    const resurfacingDesire = visualPresenceState.desireMemory?.activeDesires.find(desire => desire.id === visualPresenceState.desireMemory?.resurfacingDesireId)
    const resurfacingDesireReason = sanitizeBriefText(resurfacingDesire?.reason ?? '', 44)
    const livingWorldObject = visualPresenceState.livingWorldState?.objects.find(object =>
      object.id === (privateThought?.livingWorldObjectId ?? visualPresenceState.livingWorldState?.focusObjectId ?? ''),
    ) ?? visualPresenceState.livingWorldState?.objects[0]
    const livingWorldSummary = sanitizeBriefText(livingWorldObject?.summary ?? livingWorldObject?.openLoop ?? '', 52)
    const governorIntention = visualPresenceState.selfGovernor?.activeIntentions.find(intention =>
      intention.id === (privateThought?.governorIntentionId ?? visualPresenceState.selfGovernor?.dominantIntentionId ?? ''),
    ) ?? visualPresenceState.selfGovernor?.activeIntentions[0]
    const governorSummary = sanitizeBriefText(governorIntention?.summary ?? '', 52)
    const thoughtThread = visualPresenceState.thoughtThreads?.threads.find(thread =>
      thread.id === (privateThought?.selectedThoughtThreadId ?? visualPresenceState.thoughtThreads?.foregroundThreadId ?? ''),
    ) ?? visualPresenceState.thoughtThreads?.threads[0]
    const thoughtThreadQuestion = sanitizeBriefText(thoughtThread?.question ?? '', 52)
    const thoughtThreadSummary = sanitizeBriefText(thoughtThread?.summary ?? '', 52)
    const focusBeliefStatement = sanitizeBriefText(focusBelief?.statement ?? '', 52)
    const primaryInquiryQuestion = sanitizeBriefText(primaryInquiry?.question ?? '', 52)

    const reply = (() => {
      if (policyDecision.style === 'firm-warning') {
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
      if (policyDecision.style === 'gentle-care') {
        if (thoughtThreadSummary)
          return thoughtThreadSummary
        if (governorSummary)
          return governorSummary
        if (resurfacingDesireReason)
          return resurfacingDesireReason
        if (initiative?.selectedAction === 'whisper' && concernSummary)
          return concernSummary
        if (activeThreadSummary && visualPresenceState.worldModel?.activeThread?.kind === 'late-night-endurance')
          return activeThreadSummary
        if (policyDecision.scenario === 'late-night-care')
          return '你已经在线很久了。我更想你先缓一缓。'
        if (privateThought?.afterglowFromScenario)
          return '终于从刚才那段紧绷里出来了。先缓一下，再继续。'
        return personaTone === 'cold'
          ? '我在看着你。别把自己逼得太紧。'
          : '我在看着你。先别把自己逼得太紧。'
      }
      if (policyDecision.style === 'light-nudge') {
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
        if (truthContract.canDescribeCurrentSceneAsFact && activeThreadTitle && visualPresenceState.worldModel?.activeThread?.unresolved)
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

    const thought = [
      `boredom=${state.boredom.toFixed(1)}`,
      `loneliness=${state.loneliness.toFixed(1)}`,
      `fatigue=${state.fatigue.toFixed(1)}`,
      `obedience=${personality.obedience.toFixed(2)}`,
      `liveliness=${personality.liveliness.toFixed(2)}`,
      `sensibility=${personality.sensibility.toFixed(2)}`,
      `personaTone=${personaTone}`,
      hostAttitude ? `hostAttitude=${hostAttitude}` : 'hostAttitude=none',
      coreIncarnation ? `coreIncarnation=${coreIncarnation}` : 'coreIncarnation=none',
      lowObedience ? 'low-obedience bias active' : 'default bias',
      `scenario=${policyDecision.scenario}`,
      `style=${policyDecision.style}`,
      `truthState=${truthContract.truthState}`,
      `content=${layeredContext.content.kind}`,
      attentionAnchor ? `attentionAnchor=${sanitizeBriefText(describePerceptionTarget(attentionAnchor), 72)}` : 'attentionAnchor=none',
      visualPresenceState.appraisal ? `hostGoal=${visualPresenceState.appraisal.inferredHostGoal}` : 'hostGoal=unknown',
      activeThread ? `worldThread=${activeThread.kind}/${sanitizeBriefText(activeThread.title, 48)}` : 'worldThread=none',
      leadingGoal ? `mindGoal=${leadingGoal.kind}/${leadingGoalSummary || 'none'}` : 'mindGoal=none',
      dominantConcern ? `concern=${sanitizeBriefText(dominantConcern.summary, 72)}` : 'concern=none',
      focusBelief ? `belief=${focusBelief.scope}/${focusBelief.status}/${focusBeliefStatement || 'none'}` : 'belief=none',
      primaryInquiry ? `inquiry=${primaryInquiry.kind}/${primaryInquiry.priority}/${primaryInquiryQuestion || 'none'}` : 'inquiry=none',
      relationshipModel ? `relationship=${relationshipModel.climate}/${relationshipModel.approachVector}` : 'relationship=none',
      resurfacingDesire ? `desire=${resurfacingDesire.kind}/${resurfacingDesireReason || 'none'}` : 'desire=none',
      visualPresenceState.selfContinuity ? `selfContinuity=${visualPresenceState.selfContinuity.attachmentMode}/${visualPresenceState.selfContinuity.initiativeTemperament}` : 'selfContinuity=none',
      visualPresenceState.selfState ? `selfState=${visualPresenceState.selfState.stance}/${visualPresenceState.selfState.moodLabel ?? 'none'}` : 'selfState=none',
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
      reply: reply.slice(0, styleInstruction.maxReplyChars),
      performance: buildDefaultDialoguePerformancePayload(emotion, styleInstruction.performance),
      parsePath: 'json',
      format: 'subconscious-proactive-v1',
      proactive: buildProactiveMetadataFromDecision(policyDecision),
    }
  }

  async function generateCoreIncarnationReforgeWithGateway(input: {
    coreIncarnation: string
    shatteringEventText: string
    hostAttitude: string
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

    const raw = await generateMainGatewayText({
      system,
      user,
      timeoutMs: 20_000,
      source: 'dream',
      cardId: activeCardId,
      extraSystemBlocks: buildOrganicMemorySystemBlocks({
        hostAttitude: input.hostAttitude,
        coreIncarnation: input.coreIncarnation,
        activeThoughts: [],
        recalledFragments: [],
      }),
    })
    if (!raw)
      return null

    return parseCoreIncarnationReforgePayload(raw)
  }

  async function generateReminderStructuredWithGateway(
    personality: AlicizationPersonalityState,
    reminder: { minutes: number, message: string, tier: 'mild' | 'severe' },
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

    const raw = await generateMainGatewayText({
      system,
      user,
      timeoutMs: 15_000,
      source: 'reminder',
      cardId: activeCardId,
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
      format: 'subconscious-reminder-v1',
    }
  }

  async function processDueRemindersForCurrentCard(trigger: 'timer' | 'force' | 'startup') {
    if (isAlicizationKillSwitchSuspended() || getAlicizationCardKillSwitchSnapshot(activeCardId).state === 'SUSPENDED') {
      await appendRuntimeDebugLine('reminder.scan-skipped', {
        cardId: activeCardId,
        trigger,
        reason: 'kill-switch-suspended',
      })
      clearReminderDueTimer()
      return { claimed: 0, completed: 0, failed: 0, requeued: 0 }
    }

    const nowMs = Date.now()
    const pendingPreview = await alicizationDb.listPendingScheduledTasks(1).catch(() => [])
    const nextPending = pendingPreview.at(0)
    await appendRuntimeDebugLine('reminder.scan-started', {
      cardId: activeCardId,
      trigger,
      nowMs,
      nowIso: new Date(nowMs).toISOString(),
      nextPendingTaskId: nextPending?.taskId,
      nextPendingTriggerAt: nextPending?.triggerAt,
      nextPendingTriggerIso: typeof nextPending?.triggerAt === 'number' ? new Date(nextPending.triggerAt).toISOString() : undefined,
      nextPendingDueInMs: typeof nextPending?.triggerAt === 'number' ? nextPending.triggerAt - nowMs : undefined,
    })
    const dueTasks = await alicizationDb.claimDueScheduledTasks(nowMs, reminderClaimBatchSize)
    if (dueTasks.length === 0) {
      await appendRuntimeDebugLine('reminder.scan-empty', {
        cardId: activeCardId,
        trigger,
        nowMs,
        nextPendingTaskId: nextPending?.taskId,
        nextPendingTriggerAt: nextPending?.triggerAt,
        nextPendingDueInMs: typeof nextPending?.triggerAt === 'number' ? nextPending.triggerAt - nowMs : undefined,
      })
      await scheduleNextReminderDueCheck(`scan-empty:${trigger}`)
      return { claimed: 0, completed: 0, failed: 0, requeued: 0 }
    }

    await appendRuntimeDebugLine('reminder.scan-claimed', {
      cardId: activeCardId,
      trigger,
      nowMs,
      claimedTaskIds: dueTasks.map(task => task.taskId),
      claimedCount: dueTasks.length,
    })

    const soulForReminder = soulSnapshot ?? await bootstrap()
    const personality = soulForReminder.frontmatter.personality
    let completed = 0
    let failed = 0
    let requeued = 0

    for (const task of dueTasks) {
      const delayMinutes = Math.max(0, (nowMs - task.triggerAt) / 60_000)
      const tier = delayMinutes >= reminderOverdueTierThresholdMinutes ? 'severe' : 'mild'
      const reminderInput = {
        minutes: delayMinutes,
        message: task.message,
        tier,
      } as const
      await appendRuntimeDebugLine('reminder.task-processing', {
        cardId: activeCardId,
        trigger,
        taskId: task.taskId,
        triggerAt: task.triggerAt,
        triggerIso: new Date(task.triggerAt).toISOString(),
        delayMinutes: Number(delayMinutes.toFixed(2)),
        tier,
      })

      await appendAuditLog({
        level: 'notice',
        category: 'alicization.reminder',
        action: 'alicization.reminder.task.claimed',
        message: 'Claimed due reminder task for subconscious delivery.',
        payload: {
          trigger,
          taskId: task.taskId,
          triggerAt: task.triggerAt,
        },
      })

      if (delayMinutes > 0) {
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.reminder',
          action: 'alicization.reminder.task.overdue-triggered',
          message: 'Triggered overdue reminder task after runtime recovery.',
          payload: {
            trigger,
            taskId: task.taskId,
            delayMinutes: Number(delayMinutes.toFixed(2)),
            tier,
          },
        })
      }

      try {
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.reminder',
          action: 'alicization.reminder.task.triggered',
          message: 'Triggering reminder proactive utterance generation.',
          payload: {
            trigger,
            taskId: task.taskId,
            tier,
          },
        })
        const llmStructured = await generateReminderStructuredWithGateway(personality, reminderInput)
        if (!llmStructured) {
          const nextTriggerAt = Date.now() + reminderLlmRetryDelayMs
          await alicizationDb.requeueScheduledTask(task.taskId, 'llm-unavailable', nextTriggerAt)
          requeued += 1
          await appendRuntimeDebugLine('reminder.task-requeued', {
            cardId: activeCardId,
            trigger,
            taskId: task.taskId,
            reason: 'llm-unavailable',
            nextTriggerAt,
            nextTriggerIso: new Date(nextTriggerAt).toISOString(),
          })
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.reminder',
            action: 'alicization.reminder.task.failed',
            message: 'Reminder task generation unavailable in this tick; task requeued for retry without deterministic fallback text.',
            payload: {
              trigger,
              taskId: task.taskId,
              reason: 'llm-unavailable',
              nextTriggerAt,
            },
          })
          continue
        }
        const structured = llmStructured
        await appendRuntimeDebugLine('reminder.task-generated', {
          cardId: activeCardId,
          trigger,
          taskId: task.taskId,
          source: 'llm',
          emotion: structured.emotion,
          replyPreview: sanitizeBriefText(structured.reply, 120),
        })
        const firedTurnId = `reminder:${activeCardId}:${task.taskId}:${Date.now()}`
        const persisted = await appendConversationTurnWithGuards({
          turnId: firedTurnId,
          sessionId: await ensureActiveOrLatestSessionId(activeCardId),
          assistantText: structured.reply,
          structured,
          origin: 'subconscious-proactive',
          createdAt: Date.now(),
        })

        if (!persisted) {
          await alicizationDb.requeueScheduledTask(task.taskId, 'turn-write-skipped')
          requeued += 1
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.reminder',
            action: 'alicization.reminder.task.failed',
            message: 'Reminder turn write skipped by runtime guard; task requeued.',
            payload: {
              trigger,
              taskId: task.taskId,
              reason: 'turn-write-skipped',
            },
          })
          continue
        }
        await appendRuntimeDebugLine('reminder.task-persisted', {
          cardId: activeCardId,
          trigger,
          taskId: task.taskId,
          firedTurnId,
        })

        await alicizationDb.completeScheduledTask(task.taskId, firedTurnId, Date.now())
        completed += 1
        await appendRuntimeDebugLine('reminder.task-completed', {
          cardId: activeCardId,
          trigger,
          taskId: task.taskId,
          firedTurnId,
        })
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.reminder',
          action: 'alicization.reminder.task.completed',
          message: 'Reminder task completed and delivered through subconscious proactive turn.',
          payload: {
            trigger,
            taskId: task.taskId,
            firedTurnId,
            emotion: structured.emotion,
            format: structured.format,
            source: 'llm',
          },
        })
      }
      catch (error) {
        failed += 1
        const reason = sanitizeBriefText(error instanceof Error ? error.message : String(error), 300) || 'unknown reminder execution failure'
        await alicizationDb.failScheduledTask(task.taskId, reason, Date.now()).catch(() => {})
        await appendRuntimeDebugLine('reminder.task-failed', {
          cardId: activeCardId,
          trigger,
          taskId: task.taskId,
          reason,
        })
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.reminder',
          action: 'alicization.reminder.task.failed',
          message: 'Reminder task failed during subconscious trigger execution.',
          payload: {
            trigger,
            taskId: task.taskId,
            reason,
          },
        })
      }
    }

    await scheduleNextReminderDueCheck(`scan-finished:${trigger}`)
    return {
      claimed: dueTasks.length,
      completed,
      failed,
      requeued,
    }
  }

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

  async function runCommandWithTimeout(command: string, args: string[], timeoutMs: number) {
    const boundedTimeout = Math.max(300, Math.floor(timeoutMs))
    return await new Promise<string>((resolve, reject) => {
      const child = execFile(command, args, { timeout: boundedTimeout, windowsHide: true }, (error, stdout, stderr) => {
        if (error) {
          reject(error)
          return
        }
        resolve([stdout, stderr].filter(Boolean).join('\n').trim())
      })
      child.on('error', reject)
    })
  }

  function isCommandTimeoutError(error: unknown) {
    const message = errorMessageFrom(error) ?? ''
    return /timed out|timeout|SIGTERM|killed/i.test(message)
      || (typeof error === 'object' && error != null && 'killed' in error && (error as { killed?: unknown }).killed === true)
  }

  async function probeForegroundPidLiveness(pidValue: number | null | undefined) {
    const pid = Number(pidValue)
    if (!Number.isFinite(pid) || pid <= 0)
      return false
    try {
      const output = await runCommandWithTimeout('/bin/ps', ['-p', String(Math.floor(pid)), '-o', 'pid='], subconsciousInterruptionProbeTimeoutMs)
      return /\d+/.test(output)
    }
    catch {
      return false
    }
  }

  function updateForegroundProbeTimeoutStreak(pidValue: number | null | undefined, timedOut: boolean) {
    const pid = Number(pidValue)
    if (!Number.isFinite(pid) || pid <= 0)
      return 0
    if (!timedOut) {
      foregroundProbeTimeoutStreakByPid.delete(Math.floor(pid))
      return 0
    }
    const next = (foregroundProbeTimeoutStreakByPid.get(Math.floor(pid)) ?? 0) + 1
    foregroundProbeTimeoutStreakByPid.set(Math.floor(pid), next)
    return next
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

  async function sampleSubconsciousInterruptionContext() {
    const degraded: string[] = []
    let idleSeconds = Number.NaN
    let foregroundWindow = sensoryBus.getSnapshot()?.sample?.foregroundWindow
    let foregroundProbeTimedOut = false

    try {
      idleSeconds = Number(powerMonitor.getSystemIdleTime())
    }
    catch {
      degraded.push('input-activity-unavailable')
    }

    let fullscreenLikely = false
    if (platform === 'darwin') {
      try {
        const output = await runCommandWithTimeout(
          '/usr/bin/osascript',
          [
            '-e',
            'tell application "System Events" to tell (first process whose frontmost is true) to get value of attribute "AXFullScreen" of front window',
          ],
          subconsciousInterruptionProbeTimeoutMs,
        )
        fullscreenLikely = /\btrue\b/i.test(output)
      }
      catch {
        degraded.push('fullscreen-likely-unavailable')
      }

      if (!foregroundWindow?.appName && !foregroundWindow?.processName && !foregroundWindow?.title) {
        try {
          const output = await runCommandWithTimeout(
            '/usr/bin/osascript',
            [
              '-e',
              'tell application "System Events"',
              '-e',
              'set frontApp to first application process whose frontmost is true',
              '-e',
              'set frontName to name of frontApp',
              '-e',
              'set frontTitle to ""',
              '-e',
              'set frontPid to unix id of frontApp',
              '-e',
              'try',
              '-e',
              'set frontTitle to name of front window of frontApp',
              '-e',
              'end try',
              '-e',
              'return frontName & linefeed & frontName & linefeed & frontTitle & linefeed & frontPid',
              '-e',
              'end tell',
            ],
            subconsciousInterruptionProbeTimeoutMs,
          )
          const [appName = '', processName = '', title = '', pidLine = ''] = output.split('\n')
          foregroundWindow = {
            appName: sanitizeText(appName),
            processName: sanitizeText(processName),
            title: sanitizeText(title),
            pid: Number.isFinite(Number(pidLine)) ? Math.max(1, Math.floor(Number(pidLine))) : null,
          }
        }
        catch (error) {
          foregroundProbeTimedOut = isCommandTimeoutError(error)
          degraded.push('foreground-window-unavailable')
        }
      }
    }
    else {
      degraded.push('fullscreen-likely-unavailable')
      if (!foregroundWindow?.appName && !foregroundWindow?.processName && !foregroundWindow?.title)
        degraded.push('foreground-window-unavailable')
    }

    const inputActivity = Number.isFinite(idleSeconds)
      ? idleSeconds <= 60 ? 'active' as const : 'idle' as const
      : 'unknown' as const
    if (inputActivity === 'unknown' && !degraded.includes('input-activity-unavailable'))
      degraded.push('input-activity-unavailable')

    return {
      idleSeconds: Number.isFinite(idleSeconds) ? idleSeconds : null,
      inputActivity,
      fullscreenLikely,
      foregroundWindow,
      foregroundProbeTimedOut,
      degraded,
    }
  }

  async function runSubconsciousTickForCurrentCard(trigger: 'timer' | 'force'): Promise<{ proactive: boolean, suppressed: boolean }> {
    const state = await ensureSubconsciousState(activeCardId)
    let proactiveLoopState = await ensureProactiveLoopState(activeCardId)
    const reminderResult = await processDueRemindersForCurrentCard(trigger)
    const now = Date.now()
    proactiveLoopState = await settleExpiredPendingProactiveOutcomes(activeCardId, now, `subconscious-tick:${trigger}`)
    const elapsedMinutes = Math.max(1 / 6, (now - state.lastTickAt) / 60_000)
    const sensorySnapshot = sensoryBus.getSnapshot()
    const cpuUsage = Number(sensorySnapshot?.sample?.cpu?.usagePercent ?? 0)
    let perceptionState = await ensurePerceptionState(activeCardId)
    const rawInterruptionContext = await sampleSubconsciousInterruptionContext()
    const resolvedForegroundWindow = resolveForegroundDecisionTarget({
      snapshotForeground: sensorySnapshot?.sample?.foregroundWindow,
      probedForeground: rawInterruptionContext.foregroundWindow,
      attentionAnchor: getActiveAttentionAnchor(perceptionState, now),
    })
    const interruptionContext = {
      ...rawInterruptionContext,
      foregroundWindow: resolvedForegroundWindow,
    }
    await rememberPerceptionObservation({
      cardId: activeCardId,
      now,
      target: resolvedForegroundWindow,
      source: 'subconscious-tick',
    })
    perceptionState = await ensurePerceptionState(activeCardId)
    let visualPresenceState = await ensureVisualPresenceState(activeCardId)
    const idleLikely = interruptionContext.inputActivity === 'idle'
      || (interruptionContext.inputActivity !== 'active' && cpuUsage <= 10)

    const nextState: SubconsciousCardState = {
      ...state,
      boredom: clampNeed(state.boredom + elapsedMinutes * ((cpuUsage >= 70 || interruptionContext.fullscreenLikely) ? 2.2 : 1.2)),
      loneliness: clampNeed(state.loneliness + elapsedMinutes * (idleLikely ? 2.4 : 0.8)),
      fatigue: clampNeed(state.fatigue + elapsedMinutes * 0.6 + reminderResult.completed * 1.2),
      lastTickAt: now,
      lastInteractionAt: state.lastInteractionAt,
      updatedAt: now,
    }
    const soulForSubconscious = soulSnapshot ?? await bootstrap()
    const killSwitchSuspended
      = isAlicizationKillSwitchSuspended()
        || getAlicizationCardKillSwitchSnapshot(activeCardId).state === 'SUSPENDED'
    const hostActive = interruptionContext.inputActivity === 'active'
      || (typeof interruptionContext.idleSeconds === 'number' && interruptionContext.idleSeconds < 5 * 60)
    const lateNightState = updateLateNightActivityState(proactiveLoopState, {
      now,
      hostActive,
      isLateNight: isLateNightWindow(new Date(now)),
    })
    proactiveLoopState = lateNightState.state
    proactiveLoopStateByCard.set(activeCardId, proactiveLoopState)
    const reminderBacklog = (await alicizationDb.listPendingScheduledTasks(32).catch(() => [])).length
    const canAttemptScreenSemanticSummary
      = !killSwitchSuspended
        && !interruptionContext.fullscreenLikely
        && cpuUsage < 70
        && (interruptionContext.inputActivity !== 'active' || cpuUsage < 45)
    const screenSemanticSummary = canAttemptScreenSemanticSummary
      ? await resolveProactiveScreenSemanticSummary({
          cardId: activeCardId,
          now,
          foregroundWindow: interruptionContext.foregroundWindow,
          perceptionState,
        })
      : null
    const layeredContext = buildProactiveLayeredContext({
      now,
      probeSample: sensorySnapshot?.sample,
      interruptionContext,
      subconsciousState: nextState,
      hostAttitude: soulForSubconscious.frontmatter.host_attitude,
      reminderBacklog,
      lateNightActiveMinutes: lateNightState.lateNightActiveMinutes,
      recentProactiveOutcomes: proactiveLoopState.recentOutcomes,
      screenSemanticSummary,
    })
    const perceptionSignals = buildProactivePerceptionSignals({
      now,
      state: perceptionState,
      currentForeground: interruptionContext.foregroundWindow ?? sensorySnapshot?.sample?.foregroundWindow,
    })
    const previousWorkingMemoryCount = visualPresenceState.workingMemoryEpisodes.length
    const inferredScenario = inferScenarioFromContext({
      workload: layeredContext.workload.kind,
      content: layeredContext.content.kind,
      lateNight: layeredContext.localTime.isLateNight,
      lateNightActiveMinutes: layeredContext.relationship.lateNightActiveMinutes,
      fatigue: layeredContext.relationship.fatigue,
    })
    let durabilityPulse = consumeDurabilityPulse(activeCardId)
    const currentForegroundPid = Number(
      interruptionContext.foregroundWindow?.pid
      ?? sensorySnapshot?.sample?.foregroundWindow?.pid
      ?? visualPresenceState.currentScene?.target?.pid
      ?? 0,
    )
    const shouldProbeForegroundDurability
      = Number.isFinite(currentForegroundPid)
        && currentForegroundPid > 0
        && (
          visualPresenceState.watchMode === 'symbiotic-vision'
          || visualPresenceState.watchMode === 'recovering'
          || inferredScenario === 'coding'
          || inferredScenario === 'media'
        )
    if (!durabilityPulse && shouldProbeForegroundDurability) {
      const pidAlive = await probeForegroundPidLiveness(currentForegroundPid)
      if (!pidAlive) {
        durabilityPulse = {
          kind: 'process-gone',
          source: 'foreground-app',
          detectedAt: now,
          pid: Math.floor(currentForegroundPid),
          appName: interruptionContext.foregroundWindow?.appName,
          processName: interruptionContext.foregroundWindow?.processName,
          title: interruptionContext.foregroundWindow?.title,
        }
      }
      else {
        const timeoutStreak = updateForegroundProbeTimeoutStreak(currentForegroundPid, interruptionContext.foregroundProbeTimedOut === true)
        if (timeoutStreak >= 2) {
          durabilityPulse = {
            kind: 'anr-likely',
            source: 'foreground-app',
            detectedAt: now,
            pid: Math.floor(currentForegroundPid),
            appName: interruptionContext.foregroundWindow?.appName,
            processName: interruptionContext.foregroundWindow?.processName,
            title: interruptionContext.foregroundWindow?.title,
          }
          foregroundProbeTimeoutStreakByPid.delete(Math.floor(currentForegroundPid))
        }
      }
    }
    else if (Number.isFinite(currentForegroundPid) && currentForegroundPid > 0) {
      updateForegroundProbeTimeoutStreak(currentForegroundPid, false)
    }

    const groundedSummary = screenSemanticSummary?.content.summary
      ?? getActivePerceptionSceneResidue(perceptionState, now)?.summary
      ?? null
    const visualHeartbeat = buildVisualHeartbeat({
      now,
      scenario: inferredScenario,
      previousState: visualPresenceState,
      context: layeredContext,
      invitedInspectionActive: perceptionSignals.invitedInspectionActive,
      groundedSummary,
      screenSemanticSummaryActive: Boolean(screenSemanticSummary),
      durabilityPulse,
    })
    const attention = updateVisualAttentionModel({
      now,
      scenario: inferredScenario,
      previousAttention: visualPresenceState.attention,
      currentForeground: interruptionContext.foregroundWindow ?? sensorySnapshot?.sample?.foregroundWindow,
      currentScene: visualHeartbeat.scene,
      invitedInspectionActive: perceptionSignals.invitedInspectionActive,
      perceptionAnchor: getActiveAttentionAnchor(perceptionState, now)
        ?? perceptionState.lastNonSelfForegroundTarget
        ?? null,
      durabilityPulse,
    })
    const digitalLifeMindState = await buildDigitalLifeMindState({
      cardId: activeCardId,
      now,
      context: layeredContext,
      recentMessages: [],
      previousVisualPresenceState: visualPresenceState,
      visualHeartbeat,
      attention,
      durabilityPulse,
      inspectionRequested: false,
      groundedThisTurn: false,
      cognitionMode: 'background',
    })
    const previousMindPresenceState = visualPresenceState
    visualPresenceState = updateVisualPresenceState({
      now,
      previousState: previousMindPresenceState,
      watchMode: visualHeartbeat.watchMode,
      scene: visualHeartbeat.scene,
      attention,
      mindTurnFrame: digitalLifeMindState.mindTurnFrame,
      worldModel: digitalLifeMindState.worldModel,
      worldOntology: digitalLifeMindState.worldOntology,
      beliefLedger: digitalLifeMindState.beliefLedger,
      beliefRevision: digitalLifeMindState.beliefRevision,
      hypothesisGraph: digitalLifeMindState.hypothesisGraph,
      entityWorld: digitalLifeMindState.entityWorld,
      livingWorldState: digitalLifeMindState.livingWorldState,
      subjectiveInference: digitalLifeMindState.subjectiveInference,
      appraisal: digitalLifeMindState.appraisal,
      goalStack: digitalLifeMindState.goalStack,
      concerns: digitalLifeMindState.concerns,
      concernContinuity: digitalLifeMindState.concernContinuity,
      relationshipModel: digitalLifeMindState.relationshipModel,
      selfContinuity: digitalLifeMindState.selfContinuity,
      selfState: digitalLifeMindState.selfState,
      selfGovernor: digitalLifeMindState.selfGovernor,
      inquiryLoop: digitalLifeMindState.inquiryLoop,
      deliberationState: digitalLifeMindState.deliberationState,
      threadRuntime: digitalLifeMindState.threadRuntime,
      commitmentLedger: digitalLifeMindState.commitmentLedger,
      inquiryPlanner: digitalLifeMindState.inquiryPlanner,
      repairLedger: digitalLifeMindState.repairLedger,
      intentionStream: digitalLifeMindState.intentionStream,
      reflectionLedger: digitalLifeMindState.reflectionLedger,
      executiveCycle: digitalLifeMindState.executiveCycle,
      mindDynamics: digitalLifeMindState.mindDynamics,
      mindKernel: digitalLifeMindState.mindKernel,
      thoughtThreads: digitalLifeMindState.thoughtThreads,
      counterfactualDeliberation: digitalLifeMindState.counterfactualDeliberation,
      actionEcology: digitalLifeMindState.actionEcology,
      initiativeArbitration: digitalLifeMindState.initiativeArbitration,
      initiative: digitalLifeMindState.initiative,
      desireMemory: digitalLifeMindState.desireMemory,
      discourseState: digitalLifeMindState.discourseState,
      dialogueEncounter: digitalLifeMindState.dialogueEncounter ?? null,
      mindSynthesis: digitalLifeMindState.mindSynthesis,
      conversationState: digitalLifeMindState.conversationState,
      dialogueWorldThread: digitalLifeMindState.dialogueWorldThread,
      dialogueActKernel: digitalLifeMindState.dialogueActKernel,
      answerCompiler: digitalLifeMindState.answerCompiler,
      currentConsciousFrame: digitalLifeMindState.currentConsciousFrame ?? null,
      replyDeliberation: digitalLifeMindState.replyDeliberation,
      recallGovernor: digitalLifeMindState.recallGovernor,
      answerPlanner: digitalLifeMindState.answerPlanner,
      privateThought: digitalLifeMindState.privateThought,
      captureState: {
        permission: screenSemanticSummary ? 'granted' : visualPresenceState.captureState.permission,
        lastGroundedAt: screenSemanticSummary ? now : visualPresenceState.captureState.lastGroundedAt,
        sourceName: screenSemanticSummary?.source.name ?? visualPresenceState.captureState.sourceName,
        degradedReason: interruptionContext.degraded[0] ?? undefined,
      },
      durabilityPulse,
      recentTransition: visualHeartbeat.recentTransition,
      nextSuggestedProbeMs: visualHeartbeat.nextSuggestedProbeMs,
    })
    await persistVisualPresenceState(activeCardId, visualPresenceState)

    const mindContinuityText = buildMindContinuityFragment({
      previousState: previousMindPresenceState,
      nextState: visualPresenceState,
    })
    if (mindContinuityText) {
      await alicizationDb.appendSubconsciousFragments([{
        text: mindContinuityText,
        sourceKind: 'mind-continuity',
      }]).catch(async (error) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.mind',
          action: 'mind-continuity-write-failed',
          message: 'Failed to append mind continuity fragment after subconscious mind-state update.',
          payload: {
            reason: errorMessageFrom(error) ?? 'unknown error',
            fragment: mindContinuityText,
          },
        })
      })
    }

    const reflectionLedgerText = buildReflectionLedgerFragment({
      previousLedger: previousMindPresenceState.reflectionLedger ?? null,
      nextLedger: visualPresenceState.reflectionLedger ?? null,
    })
    if (reflectionLedgerText) {
      await alicizationDb.appendSubconsciousFragments([{
        text: reflectionLedgerText,
        sourceKind: 'mind-continuity',
      }]).catch(async (error) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.mind',
          action: 'reflection-ledger-write-failed',
          message: 'Failed to append reflection-ledger fragment after subconscious mind-state update.',
          payload: {
            reason: errorMessageFrom(error) ?? 'unknown error',
            fragment: reflectionLedgerText,
          },
        })
      })
    }

    if (visualPresenceState.workingMemoryEpisodes.length > previousWorkingMemoryCount) {
      const latestEpisode = visualPresenceState.workingMemoryEpisodes.at(-1)
      const visualSedimentText = latestEpisode
        ? buildVisualSedimentFragment(latestEpisode)
        : ''
      if (visualSedimentText) {
        await alicizationDb.appendSubconsciousFragments([{
          text: visualSedimentText,
          sourceKind: 'visual-sediment',
        }]).catch(async (error) => {
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.visual-memory',
            action: 'visual-sediment-write-failed',
            message: 'Failed to append visual sediment fragment after visual episode closure.',
            payload: {
              reason: errorMessageFrom(error) ?? 'unknown error',
              fragment: visualSedimentText,
            },
          })
        })
      }
    }

    const decision = evaluateProactivePolicy({
      now,
      context: layeredContext,
      proactiveState: proactiveLoopState,
      killSwitchSuspended,
      perception: perceptionSignals,
      watchMode: visualPresenceState.watchMode,
      recentTransition: visualPresenceState.recentTransition,
      worldModel: visualPresenceState.worldModel,
      livingWorldState: visualPresenceState.livingWorldState,
      beliefLedger: visualPresenceState.beliefLedger,
      beliefRevision: visualPresenceState.beliefRevision,
      commitmentLedger: visualPresenceState.commitmentLedger,
      inquiryPlanner: visualPresenceState.inquiryPlanner,
      mindKernel: visualPresenceState.mindKernel,
      hypothesisGraph: visualPresenceState.hypothesisGraph,
      privateThought: visualPresenceState.privateThought,
      relationshipModel: visualPresenceState.relationshipModel,
      selfGovernor: visualPresenceState.selfGovernor,
      inquiryLoop: visualPresenceState.inquiryLoop,
      deliberationState: visualPresenceState.deliberationState,
      threadRuntime: visualPresenceState.threadRuntime,
      thoughtThreads: visualPresenceState.thoughtThreads,
      actionEcology: visualPresenceState.actionEcology,
      initiative: visualPresenceState.initiative,
      durabilityPulse,
    })

    let proactive = false
    let suppressed = false
    const hardSuppressed = !decision.shouldInterrupt
      && (
        decision.style === 'silent-observe'
        || decision.reasonCodes.includes('kill-switch-suspended')
        || decision.reasonCodes.includes('global-cooldown-active')
        || decision.reasonCodes.includes('busy-host')
        || decision.reasonCodes.includes('fullscreen-host')
      )

    if (!decision.shouldInterrupt)
      emitVisualPresencePulse(buildPresencePulsePayload(activeCardId, visualPresenceState))

    await appendAuditLog({
      level: interruptionContext.degraded.length > 0 ? 'warning' : 'notice',
      category: 'alicization.subconscious',
      action: 'proactive-policy-evaluated',
      message: 'Evaluated proactive interruption policy from layered sensory context.',
      payload: {
        trigger,
        consideredSignals: decision.consideredSignals,
        ignoredSignals: decision.ignoredSignals,
        decision: {
          shouldInterrupt: decision.shouldInterrupt,
          confidence: decision.confidence,
          urgency: decision.urgency,
          style: decision.style,
          cooldownMs: decision.cooldownMs,
          scenario: decision.scenario,
          policyVersion: decision.policyVersion,
        },
        reasonCodes: decision.reasonCodes,
        style: decision.style,
        whyNow: decision.whyNow,
        whyNotLater: decision.whyNotLater,
        cooldownMs: decision.cooldownMs,
        feedbackBias: decision.feedbackBias,
        perception: perceptionSignals,
        visualPresence: {
          watchMode: visualPresenceState.watchMode,
          currentScene: visualPresenceState.currentScene,
          worldModel: visualPresenceState.worldModel,
          livingWorldState: visualPresenceState.livingWorldState,
          beliefLedger: visualPresenceState.beliefLedger,
          beliefRevision: visualPresenceState.beliefRevision,
          hypothesisGraph: visualPresenceState.hypothesisGraph,
          subjectiveInference: visualPresenceState.subjectiveInference,
          appraisal: visualPresenceState.appraisal,
          concerns: visualPresenceState.concerns,
          concernContinuity: visualPresenceState.concernContinuity,
          relationshipModel: visualPresenceState.relationshipModel,
          selfState: visualPresenceState.selfState,
          selfGovernor: visualPresenceState.selfGovernor,
          inquiryLoop: visualPresenceState.inquiryLoop,
          deliberationState: visualPresenceState.deliberationState,
          threadRuntime: visualPresenceState.threadRuntime,
          commitmentLedger: visualPresenceState.commitmentLedger,
          inquiryPlanner: visualPresenceState.inquiryPlanner,
          repairLedger: visualPresenceState.repairLedger,
          thoughtThreads: visualPresenceState.thoughtThreads,
          counterfactualDeliberation: visualPresenceState.counterfactualDeliberation,
          actionEcology: visualPresenceState.actionEcology,
          initiative: visualPresenceState.initiative,
          answerPlanner: visualPresenceState.answerPlanner,
          recentTransition: visualPresenceState.recentTransition,
          durabilityPulse: visualPresenceState.durabilityPulse,
        },
        privateThought: visualPresenceState.privateThought,
        layeredContext,
      },
    })

    if (hardSuppressed) {
      suppressed = true
      const obediencePenalty = decision.reasonCodes.includes('busy-host') || decision.reasonCodes.includes('fullscreen-host')
        ? -0.01
        : 0
      if (obediencePenalty !== 0) {
        await queueSoulMutation(async (current) => {
          const parsed = parseSoul(current.content)
          const nextPersonality: AlicizationPersonalityState = {
            ...parsed.frontmatter.personality,
            obedience: clamp01(parsed.frontmatter.personality.obedience + obediencePenalty),
          }
          const nextFrontmatter: AlicizationSoulFrontmatter = {
            ...parsed.frontmatter,
            personality: nextPersonality,
          }
          const syncedBody = syncPersonalityBaselineInBody(parsed.body, nextPersonality)
          return snapshotFromContent(toSoulContent(nextFrontmatter, syncedBody))
        })
      }
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.subconscious',
        action: 'alicization.subconscious.suppressed',
        message: 'Suppressed proactive interruption after policy evaluation.',
        payload: {
          trigger,
          decision: {
            shouldInterrupt: decision.shouldInterrupt,
            confidence: decision.confidence,
            urgency: decision.urgency,
            style: decision.style,
            cooldownMs: decision.cooldownMs,
            scenario: decision.scenario,
            policyVersion: decision.policyVersion,
          },
          reasonCodes: decision.reasonCodes,
          style: decision.style,
          whyNow: decision.whyNow,
          whyNotLater: decision.whyNotLater,
          cooldownMs: decision.cooldownMs,
          feedbackBias: decision.feedbackBias,
          perception: perceptionSignals,
          obediencePenalty,
        },
      })
    }
    else if (decision.shouldInterrupt) {
      const personality = soulForSubconscious.frontmatter.personality
      const personaContext = {
        customDirectives: normalizeCustomDirectives(soulForSubconscious.frontmatter.custom_directives),
        coreIncarnation: soulForSubconscious.frontmatter.core_incarnation,
        hostAttitude: soulForSubconscious.frontmatter.host_attitude,
      }
      proactive = true
      const proactiveRecallSeed = buildProactiveRecallSeed({
        foregroundWindow: interruptionContext.foregroundWindow,
        phantomSeed: [
          buildVisualRecallSeed({
            scene: visualPresenceState.currentScene,
            emotionalTension: visualPresenceState.privateThought?.emotionalTension,
          }),
          buildMindContinuityRecallSeed(visualPresenceState),
        ].filter(Boolean).join(' | '),
      })
      const organicPromptContext = await resolveOrganicMemoryPromptContext({
        recallSeed: proactiveRecallSeed,
      })
      const llmStructured = await generateProactiveStructuredWithGateway(
        personality,
        nextState,
        layeredContext,
        decision,
        organicPromptContext,
        perceptionState,
        visualPresenceState,
      )
      const rawStructured = llmStructured ?? buildProactiveStructured(
        personality,
        nextState,
        layeredContext,
        decision,
        perceptionState,
        visualPresenceState,
        {
          customDirectives: personaContext.customDirectives,
          coreIncarnation: organicPromptContext.coreIncarnation,
          hostAttitude: organicPromptContext.hostAttitude,
        },
      )
      const performanceManifest = await getPerformanceManifest()
      const structuredPerformance = clampAlicizationPerformancePayloadToManifest(
        rawStructured.performance,
        performanceManifest,
        rawStructured.emotion,
      ).performance
      const structured = {
        ...rawStructured,
        emotion: structuredPerformance.baseEmotion,
        performance: structuredPerformance,
      }
      if (llmStructured) {
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.subconscious',
          action: 'proactive-llm-generated',
          message: 'Generated proactive utterance with policy-locked prompt constraints.',
          payload: {
            decision: {
              scenario: decision.scenario,
              style: decision.style,
              urgency: decision.urgency,
              confidence: decision.confidence,
            },
            format: llmStructured.format,
            recallSeed: proactiveRecallSeed || null,
            recalledFragments: organicPromptContext.recalledFragments.length,
          },
        })
      }
      else {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.subconscious',
          action: 'proactive-llm-fallback',
          message: 'Main gateway proactive generation unavailable; deterministic fallback reused the same policy decision.',
          payload: {
            decision: {
              scenario: decision.scenario,
              style: decision.style,
              urgency: decision.urgency,
              confidence: decision.confidence,
            },
            customDirectivesChars: personaContext.customDirectives.length,
            recallSeed: proactiveRecallSeed || null,
            recalledFragments: organicPromptContext.recalledFragments.length,
          },
        })
      }
      const turnId = `subconscious:${activeCardId}:${now}`
      const persisted = await appendConversationTurnWithGuards({
        turnId,
        sessionId: await ensureActiveOrLatestSessionId(activeCardId),
        assistantText: structured.reply,
        structured,
        origin: 'subconscious-proactive',
        createdAt: now,
      })
      if (!persisted) {
        proactive = false
      }
      else {
        nextState.boredom = clampNeed(nextState.boredom * 0.35)
        nextState.loneliness = clampNeed(nextState.loneliness * 0.4)
        nextState.fatigue = clampNeed(nextState.fatigue + 5)
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.subconscious',
          action: 'proactive-triggered',
          message: 'Generated proactive dialogue from the Epoch 3 policy loop.',
          payload: {
            turnId,
            decision: {
              shouldInterrupt: decision.shouldInterrupt,
              confidence: decision.confidence,
              urgency: decision.urgency,
              style: decision.style,
              cooldownMs: decision.cooldownMs,
              scenario: decision.scenario,
              policyVersion: decision.policyVersion,
            },
            reasonCodes: decision.reasonCodes,
            style: decision.style,
            format: structured.format,
            proactive: structured.proactive ?? null,
            emotion: structured.emotion,
            trigger,
          },
        })
      }
    }

    const shouldPersist = trigger === 'force'
      || proactive
      || suppressed
      || now - nextState.lastSavedAt >= alicizationSubconsciousPersistMs
    proactiveLoopState = await ensureProactiveLoopState(activeCardId)
    await persistProactiveLoopState(activeCardId, proactiveLoopState)
    if (shouldPersist) {
      nextState.lastSavedAt = now
      await persistSubconsciousState(activeCardId, nextState)
    }
    else {
      subconsciousStateByCard.set(activeCardId, nextState)
    }
    return { proactive, suppressed }
  }

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
          const result = await runSubconsciousTickForCurrentCard(trigger)
          processedCards.push(activeCardId)
          if (result.proactive)
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

  async function runDreamForCurrentCard(reason = 'manual'): Promise<{ processed: boolean, skippedReason?: string }> {
    const state = await ensureSubconsciousState(activeCardId)
    const rawTurns = await alicizationDb.listConversationTurnsSince(state.lastDreamedAt, { limit: 2_000 })
    if (!rawTurns.length) {
      return {
        processed: false,
        skippedReason: 'no-new-turns',
      }
    }

    const sampledDescending = rawTurns.slice(0, dreamMaxTurns)
    const sampledAscending = [...sampledDescending].reverse()

    let totalChars = 0
    let sampledCount = 0
    let truncatedByChars = false
    const serializedTurns: string[] = []
    let hostDenySignals = 0
    let hostilitySignals = 0
    let warmthSignals = 0

    for (const row of sampledAscending) {
      const userText = truncateForDream(row.userText, dreamMaxCharsPerUserTurn)
      const assistantText = truncateForDream(row.assistantText, dreamMaxCharsPerAssistantTurn)
      const structuredHint = parseStructuredHint(row.structuredJson)
      const emotion = sanitizeText((structuredHint as { emotion?: unknown }).emotion)
      const rowSerialized = [
        `[${new Date(row.createdAt).toISOString()}]`,
        userText ? `U: ${userText}` : '',
        assistantText ? `A: ${assistantText}` : '',
      ].filter(Boolean).join('\n')

      if (totalChars + rowSerialized.length > dreamMaxTotalChars) {
        truncatedByChars = true
        break
      }

      totalChars += rowSerialized.length
      serializedTurns.push(rowSerialized)
      sampledCount += 1

      const combinedUser = userText.toLowerCase()
      const combinedAssistant = assistantText.toLowerCase()
      const denialMatch = /denied|拒绝|不允许|权限|intercepted/.test(combinedAssistant)
      if (denialMatch)
        hostDenySignals += 1
      if (/烦|闭嘴|滚|命令|stupid|useless|shut up|idiot/.test(combinedUser))
        hostilitySignals += 1
      if (/谢谢|辛苦|感谢|thank|appreciate|love/.test(combinedUser))
        warmthSignals += 1
      if (emotion === 'angry')
        hostilitySignals += 0.5
    }

    if (rawTurns.length > sampledCount || truncatedByChars) {
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.dream',
        action: 'alicization.dream.context.truncated',
        message: 'Dream context was truncated to hard safety caps.',
        payload: {
          reason,
          rawTurnCount: rawTurns.length,
          sampledTurnCount: sampledCount,
          discardedTurnCount: Math.max(0, rawTurns.length - sampledCount),
          maxTurns: dreamMaxTurns,
          maxTotalChars: dreamMaxTotalChars,
          totalChars,
          truncatedByChars,
        },
      })
    }

    const dreamSoul = soulSnapshot ?? await bootstrap()
    const currentActiveThoughts = await alicizationDb.listActiveThoughts().catch(() => [])
    const llmMetabolism = await generateDreamMetabolismWithGateway({
      serializedTurns,
      personality: dreamSoul.frontmatter.personality,
      hostAttitude: dreamSoul.frontmatter.host_attitude,
      coreIncarnation: dreamSoul.frontmatter.core_incarnation,
      activeThoughts: currentActiveThoughts,
    })
    const attitudeScore = hostilitySignals + hostDenySignals * 1.5 - warmthSignals
    const fallbackHostAttitude = normalizeHostAttitude(
      attitudeScore >= 3
        ? '明显戒备并带有不满，我需要谨慎收束边界'
        : attitudeScore <= -1
          ? '愿意亲近并逐渐信任我，关系正在升温'
          : dreamSoul.frontmatter.host_attitude,
    )
    const fallbackMetabolism: AlicizationDreamMetabolismPayload = {
      host_attitude: fallbackHostAttitude,
      soul_shift: {
        obedience_delta: attitudeScore >= 3 ? -0.03 : attitudeScore <= -1 ? 0.01 : 0,
        liveliness_delta: attitudeScore >= 3 ? -0.01 : 0,
        sensibility_delta: attitudeScore <= -1 ? 0.01 : 0,
      },
      next_active_thoughts: currentActiveThoughts
        .map(item => ({ text: normalizeOrganicMemoryItemText(item.text, 120) }))
        .filter(item => item.text),
      explicit_demoted_thoughts: [],
      new_sediment_fragments: [],
      shattering_event: null,
    }
    const metabolism = llmMetabolism ?? fallbackMetabolism
    const hostAttitude = normalizeHostAttitude(metabolism.host_attitude || fallbackMetabolism.host_attitude)
    const obedienceDelta = clampSoulDelta(metabolism.soul_shift.obedience_delta)
    const livelinessDelta = clampSoulDelta(metabolism.soul_shift.liveliness_delta)
    const sensibilityDelta = clampSoulDelta(metabolism.soul_shift.sensibility_delta)
    const explicitDemotedThoughts = normalizeOrganicMemoryItemArray(metabolism.explicit_demoted_thoughts, {
      maxItems: 8,
      maxChars: 120,
    })
    const nextActiveThoughts = normalizeOrganicMemoryItemArray(metabolism.next_active_thoughts, {
      maxItems: 5,
      maxChars: 120,
    })
    const newSedimentFragments = normalizeOrganicMemoryItemArray(metabolism.new_sediment_fragments, {
      maxItems: 8,
      maxChars: 160,
    })
    const shatteringEventText = normalizeOrganicMemoryItemText(metabolism.shattering_event?.text, 280)
    const normalizedPreviousHostAttitude = normalizeHostAttitude(dreamSoul.frontmatter.host_attitude)
    const attitudeShiftFragment = normalizedPreviousHostAttitude !== hostAttitude
      ? `[态度演变记录：从"${normalizedPreviousHostAttitude}"转变为"${hostAttitude}"]`
      : ''

    let reforgedCoreIncarnation = ''
    let reforgeFailureReason = ''
    if (shatteringEventText) {
      try {
        const reforgeResult = await generateCoreIncarnationReforgeWithGateway({
          coreIncarnation: dreamSoul.frontmatter.core_incarnation,
          shatteringEventText,
          hostAttitude,
        })
        reforgedCoreIncarnation = normalizeCoreIncarnation(reforgeResult?.core_incarnation ?? '')
      }
      catch (error) {
        reforgeFailureReason = sanitizeBriefText(error instanceof Error ? error.message : String(error), 240)
      }
    }

    if (serializedTurns.length > 0) {
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.dream',
        action: 'metabolism-generated',
        message: 'Dream metabolism generated from bounded context.',
        payload: {
          reason,
          source: llmMetabolism ? 'llm' : 'heuristic',
          hostAttitude,
          obedienceDelta,
          livelinessDelta,
          sensibilityDelta,
          nextActiveThoughtCount: nextActiveThoughts.length,
          explicitDemotionCount: explicitDemotedThoughts.length,
          newSedimentCount: newSedimentFragments.length,
          shatteringEvent: shatteringEventText || null,
          sampledTurns: sampledCount,
        },
      })
    }

    await alicizationDb.appendRelationshipDynamics({
      hostAttitude,
      previousHostAttitude: normalizedPreviousHostAttitude,
      obedienceDelta,
      livelinessDelta,
      sensibilityDelta,
      source: llmMetabolism ? 'dream-llm' : 'dream-heuristic',
      createdAt: Date.now(),
    }).catch(async (error) => {
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.dream',
        action: 'relationship-dynamics-write-failed',
        message: 'Failed to persist relationship dynamics after dream metabolism.',
        payload: {
          reason: errorMessageFrom(error) ?? 'unknown-error',
        },
      })
    })

    const previousCoreIncarnation = normalizeCoreIncarnation(dreamSoul.frontmatter.core_incarnation)
    const nextCoreIncarnation = reforgedCoreIncarnation || previousCoreIncarnation
    if (
      obedienceDelta !== 0
      || livelinessDelta !== 0
      || sensibilityDelta !== 0
      || hostAttitude !== normalizedPreviousHostAttitude
      || nextCoreIncarnation !== previousCoreIncarnation
    ) {
      await queueSoulMutation(async (current) => {
        const parsed = parseSoul(current.content)
        const nextPersonality: AlicizationPersonalityState = {
          obedience: clamp01(parsed.frontmatter.personality.obedience + obedienceDelta),
          liveliness: clamp01(parsed.frontmatter.personality.liveliness + livelinessDelta),
          sensibility: clamp01(parsed.frontmatter.personality.sensibility + sensibilityDelta),
        }
        const nextFrontmatter: AlicizationSoulFrontmatter = {
          ...parsed.frontmatter,
          host_attitude: hostAttitude,
          core_incarnation: nextCoreIncarnation,
          personality: nextPersonality,
        }
        const syncedBody = syncPersonalityBaselineInBody(parsed.body, nextPersonality)
        return snapshotFromContent(toSoulContent(nextFrontmatter, syncedBody))
      })
    }

    await alicizationDb.replaceActiveThoughts(nextActiveThoughts).catch(async (error) => {
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.dream',
        action: 'active-thoughts-write-failed',
        message: 'Failed to replace active thoughts after dream metabolism.',
        payload: {
          reason: error instanceof Error ? error.message : String(error),
        },
      })
    })

    const subconsciousFragments = [
      ...explicitDemotedThoughts.map(item => ({ text: item.text, sourceKind: 'active-demotion' as const })),
      ...newSedimentFragments.map(item => ({ text: item.text, sourceKind: 'dream-fragment' as const })),
      ...(attitudeShiftFragment
        ? [{ text: attitudeShiftFragment, sourceKind: 'attitude-shift' as const }]
        : []),
      ...(
        reforgedCoreIncarnation && previousCoreIncarnation && previousCoreIncarnation !== reforgedCoreIncarnation
          ? [{ text: previousCoreIncarnation, sourceKind: 'former-core-incarnation' as const }]
          : []
      ),
      ...(
        shatteringEventText && !reforgedCoreIncarnation
          ? [{ text: shatteringEventText, sourceKind: 'unforged-shattering-event' as const }]
          : []
      ),
    ]
    if (subconsciousFragments.length > 0) {
      await alicizationDb.appendSubconsciousFragments(subconsciousFragments).catch(async (error) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.dream',
          action: 'subconscious-fragments-write-failed',
          message: 'Failed to append subconscious fragments after dream metabolism.',
          payload: {
            reason: error instanceof Error ? error.message : String(error),
            count: subconsciousFragments.length,
          },
        })
      })
    }

    if (shatteringEventText) {
      if (reforgedCoreIncarnation) {
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.dream',
          action: 'core-incarnation-reforged',
          message: 'Successfully reforged core incarnation after shattering event.',
          payload: {
            hadPreviousCoreIncarnation: Boolean(previousCoreIncarnation),
            shatteringEventText,
          },
        })
      }
      else {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.dream',
          action: 'core-incarnation-reforge-failed',
          message: 'Failed to reforge core incarnation; shattering event was archived instead.',
          payload: {
            shatteringEventText,
            reason: reforgeFailureReason || 'empty-reforge-result',
          },
        })
      }
    }

    const now = Date.now()
    const nextState: SubconsciousCardState = {
      ...state,
      lastDreamedAt: now,
      fatigue: clampNeed(Math.max(0, state.fatigue - 20)),
      updatedAt: now,
      lastSavedAt: now,
    }
    await persistSubconsciousState(activeCardId, nextState)
    return {
      processed: true,
    }
  }

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

  function normalizeProviderCredentialsMap(raw: unknown) {
    if (!raw || typeof raw !== 'object')
      return {} as Record<string, Record<string, unknown>>
    const entries = Object.entries(raw as Record<string, unknown>)
      .filter(([, value]) => value && typeof value === 'object')
      .map(([key, value]) => [key, value as Record<string, unknown>])
    return Object.fromEntries(entries)
  }

  function normalizeProviderConfig(raw: unknown) {
    if (!raw || typeof raw !== 'object')
      return {} as Record<string, unknown>
    return raw as Record<string, unknown>
  }

  function resolveMainGatewayConfig(options?: {
    providerId?: string
    model?: string
    providerConfig?: Record<string, unknown>
  }): MainGatewayResolvedConfig | null {
    const providerId = sanitizeText(options?.providerId || activeProviderId)
    const model = sanitizeText(options?.model || activeModelId)
    if (!providerId || !model)
      return null

    const requestProviderConfig = normalizeProviderConfig(options?.providerConfig)
    const requestHeaders = (
      requestProviderConfig.headers
      && typeof requestProviderConfig.headers === 'object'
    )
      ? requestProviderConfig.headers as Record<string, string>
      : undefined
    const mergedCredentials = {
      ...providerCredentials[providerId],
      ...requestProviderConfig,
    }
    const apiKey = sanitizeText(mergedCredentials.apiKey)
    const baseUrlRaw = sanitizeText((mergedCredentials.baseUrl ?? mergedCredentials.baseURL) as string, 'https://api.openai.com/v1')
    const baseUrl = baseUrlRaw.endsWith('/') ? baseUrlRaw : `${baseUrlRaw}/`
    const provider = createOpenAI(apiKey, baseUrl)

    return {
      providerId,
      model,
      headers: requestHeaders,
      provider,
    }
  }

  function parseJsonObjectFromText(raw: string) {
    const normalized = sanitizeText(raw, '')
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()
    if (!normalized)
      return null

    const tryParse = (candidate: string) => {
      try {
        const parsed = JSON.parse(candidate) as unknown
        return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null
      }
      catch {
        return null
      }
    }

    const direct = tryParse(normalized)
    if (direct)
      return direct

    const firstBrace = normalized.indexOf('{')
    const lastBrace = normalized.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return tryParse(normalized.slice(firstBrace, lastBrace + 1))
    }
    return null
  }

  function readTransportContentAsText(content: unknown) {
    if (typeof content === 'string')
      return content
    if (Array.isArray(content)) {
      return content.map((part) => {
        if (typeof part === 'string')
          return part
        if (part && typeof part === 'object' && 'text' in part)
          return String((part as { text?: unknown }).text ?? '')
        return ''
      }).join('\n')
    }
    if (content == null)
      return ''
    try {
      return JSON.stringify(content)
    }
    catch {
      return String(content)
    }
  }

  function normalizeTransportContentParts(content: unknown): CommonContentPart[] | null {
    if (!Array.isArray(content))
      return null

    const parts: CommonContentPart[] = []
    for (const part of content) {
      if (typeof part === 'string') {
        const text = part.trim()
        if (text)
          parts.push({ type: 'text', text })
        continue
      }

      const candidate = part && typeof part === 'object' ? part as Record<string, unknown> : null
      if (candidate?.type === 'text' && typeof candidate.text === 'string') {
        const text = candidate.text.trim()
        if (text)
          parts.push({ type: 'text', text })
        continue
      }

      const imageUrl = candidate?.image_url
      const url = imageUrl && typeof imageUrl === 'object'
        ? sanitizeText((imageUrl as { url?: unknown }).url)
        : ''
      if (candidate?.type === 'image_url' && url) {
        parts.push({
          type: 'image_url',
          image_url: {
            url,
          },
        } as CommonContentPart)
      }
    }

    return parts.length > 0 ? parts : null
  }

  function hasImageTransportContent(content: unknown) {
    return Boolean(normalizeTransportContentParts(content)?.some(part => part.type === 'image_url'))
  }

  function normalizeTransportMessageContent(content: unknown): string | CommonContentPart[] {
    if (typeof content === 'string')
      return content

    const parts = normalizeTransportContentParts(content)
    if (parts) {
      if (parts.some(part => part.type === 'image_url'))
        return parts
      return parts
        .filter((part): part is Extract<CommonContentPart, { type: 'text' }> => part.type === 'text')
        .map(part => part.text)
        .join('')
    }

    if (content == null)
      return ''
    try {
      return JSON.stringify(content)
    }
    catch {
      return String(content)
    }
  }

  function preserveLatestUserMultimodalContent(input: {
    originalMessages: AlicizationChatStartPayload['messages']
    resolvedMessages: Message[]
  }) {
    const latestOriginalUser = [...input.originalMessages].reverse().find(message => message?.role === 'user')
    const normalizedOriginalContent = normalizeTransportMessageContent(latestOriginalUser?.content)
    if (!Array.isArray(normalizedOriginalContent) || !normalizedOriginalContent.some(part => part.type === 'image_url'))
      return input.resolvedMessages

    const latestResolvedUserIndex = [...input.resolvedMessages]
      .map((message, index) => ({ message, index }))
      .reverse()
      .find(entry => entry.message.role === 'user')
      ?.index
    if (typeof latestResolvedUserIndex !== 'number')
      return input.resolvedMessages

    const latestResolvedUser = input.resolvedMessages[latestResolvedUserIndex]
    if (Array.isArray(latestResolvedUser.content) && latestResolvedUser.content.some(part => part?.type === 'image_url'))
      return input.resolvedMessages

    return input.resolvedMessages.map((message, index) => {
      if (index !== latestResolvedUserIndex)
        return message
      return {
        ...(message as UserMessage),
        role: 'user',
        content: normalizedOriginalContent,
      } satisfies UserMessage
    })
  }

  function appendContentPartsToLatestUserMessage(messages: Message[], extraParts: CommonContentPart[]) {
    if (extraParts.length === 0)
      return messages

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index]
      if (message?.role !== 'user')
        continue

      const existingParts = normalizeTransportContentParts(message.content)
      const stringContent = typeof message.content === 'string'
        ? message.content.trim()
        : ''
      const nextContent = [
        ...(existingParts ?? (stringContent ? [{ type: 'text', text: stringContent } as CommonContentPart] : [])),
        ...extraParts,
      ]
      return [
        ...messages.slice(0, index),
        {
          ...message,
          content: nextContent,
        } as Message,
        ...messages.slice(index + 1),
      ]
    }

    return messages
  }

  function describePerceptionTarget(target?: {
    appName?: string
    processName?: string
    title?: string
  } | null) {
    if (!target)
      return 'none'
    return [
      sanitizeBriefText(target.appName ?? '', 48),
      sanitizeBriefText(target.processName ?? '', 48),
      sanitizeBriefText(target.title ?? '', 96),
    ].filter(Boolean).join(' | ') || 'none'
  }

  function formatObservationAge(now: number, observedAt: number) {
    const deltaSeconds = Math.max(0, Math.round((now - observedAt) / 1_000))
    if (deltaSeconds < 90)
      return `${deltaSeconds}s ago`
    return `${Math.round(deltaSeconds / 60)}m ago`
  }

  function isGenericScreenInspectionRequest(userText: string) {
    const normalized = userText.trim()
    if (!normalized || isInternalAlicizationRepairPrompt(normalized))
      return false

    const mentionsScreen = /屏幕|桌面|工作区|workspace|desktop|界面|画面|screen|display/i.test(normalized)
    const mentionsSpecificTask = /代码|diff|改动|报错|错误|exception|traceback|terminal|终端|cursor|vs\s*code|xcode|jetbrains|chrome|safari|firefox|edge|tab|标签页|url|网址|控制台|console|日志|log/i.test(normalized)
    return mentionsScreen && !mentionsSpecificTask
  }

  function hasStableSharedAttention(input: {
    now: number
    perceptionState?: AlicizationPerceptionState | null
    visualPresenceState?: AlicizationVisualPresenceStateSnapshot | null
  }) {
    const activeAnchor = input.perceptionState
      ? getActiveAttentionAnchor(input.perceptionState, input.now)
      : null
    const recentResidue = input.perceptionState
      ? getActivePerceptionSceneResidue(input.perceptionState, input.now, 10 * 60_000)
      : null
    const recentAttention = input.visualPresenceState?.attention
      && (input.now - (input.visualPresenceState.attention.lastConfirmedAt ?? input.now)) <= 3 * 60_000

    return Boolean(
      activeAnchor
      || recentResidue
      || recentAttention
      || input.visualPresenceState?.watchMode === 'invited-inspection'
      || input.visualPresenceState?.watchMode === 'symbiotic-vision',
    )
  }

  function appendInspectionIntentTargetPhrases(target?: {
    appName?: string
    processName?: string
    title?: string
  } | null) {
    return [
      normalizeOrganicRecallText(target?.appName ?? ''),
      normalizeOrganicRecallText(target?.processName ?? ''),
      normalizeOrganicRecallText(target?.title ?? ''),
    ].filter(Boolean)
  }

  function buildInspectionIntentContextPhrases(input: {
    now: number
    perceptionState: AlicizationPerceptionState
    visualPresenceState: AlicizationVisualPresenceStateSnapshot
  }) {
    const activeAnchor = getActiveAttentionAnchor(input.perceptionState, input.now)
    const recentResidue = getActivePerceptionSceneResidue(input.perceptionState, input.now, 10 * 60_000)
    const inspectionCarryActive = Boolean(
      input.perceptionState.invitedInspection
      && input.perceptionState.invitedInspection.activeUntil > input.now,
    )
    const visualCarryActive = inspectionCarryActive
      || input.visualPresenceState.watchMode === 'symbiotic-vision'
      || input.visualPresenceState.watchMode === 'recovering'
    return [
      ...appendInspectionIntentTargetPhrases(activeAnchor),
      ...(visualCarryActive ? appendInspectionIntentTargetPhrases(input.visualPresenceState.currentScene?.target) : []),
      ...(visualCarryActive ? appendInspectionIntentTargetPhrases(input.visualPresenceState.attention?.target) : []),
      ...appendInspectionIntentTargetPhrases(recentResidue?.focusTarget),
      visualCarryActive ? normalizeOrganicRecallText(input.visualPresenceState.currentScene?.summary ?? '') : '',
      normalizeOrganicRecallText(recentResidue?.summary ?? ''),
      normalizeOrganicRecallText(input.perceptionState.invitedInspection?.hintText ?? ''),
    ].filter(Boolean)
  }

  function buildConcreteInspectionFocusPhrases(input: {
    now: number
    perceptionState: AlicizationPerceptionState
    visualPresenceState: AlicizationVisualPresenceStateSnapshot
  }) {
    const activeAnchor = getActiveAttentionAnchor(input.perceptionState, input.now)
    const inspectionCarryActive = Boolean(
      input.perceptionState.invitedInspection
      && input.perceptionState.invitedInspection.activeUntil > input.now,
    )
    const visualCarryActive = inspectionCarryActive
      || input.visualPresenceState.watchMode === 'symbiotic-vision'
      || input.visualPresenceState.watchMode === 'recovering'
    return [
      ...appendInspectionIntentTargetPhrases(activeAnchor),
      ...(visualCarryActive ? appendInspectionIntentTargetPhrases(input.visualPresenceState.currentScene?.target) : []),
      ...(visualCarryActive ? appendInspectionIntentTargetPhrases(input.visualPresenceState.attention?.target) : []),
      visualCarryActive ? normalizeOrganicRecallText(input.visualPresenceState.currentScene?.summary ?? '') : '',
      visualCarryActive ? normalizeOrganicRecallText(input.visualPresenceState.worldModel?.activeThread?.title ?? '') : '',
      visualCarryActive ? normalizeOrganicRecallText(input.visualPresenceState.worldModel?.activeThread?.summary ?? '') : '',
    ].filter(Boolean)
  }

  function buildDialogueIngressContext(input: {
    now: number
    currentForeground?: AlicizationSystemProbeSample['foregroundWindow'] | null
    perceptionState?: AlicizationPerceptionState | null
    visualPresenceState?: AlicizationVisualPresenceStateSnapshot | null
  }): {
    context: AlicizationProactiveLayeredContext
    currentScene: AlicizationVisualPresenceStateSnapshot['currentScene']
    worldModel: AlicizationVisualPresenceStateSnapshot['worldModel'] | null
  } {
    const date = new Date(input.now)
    const lateNight = isLateNightWindow(date)
    const liveScene = input.visualPresenceState?.currentScene ?? null
    const liveForeground = input.currentForeground
      ?? liveScene?.target
      ?? input.visualPresenceState?.attention?.target
      ?? undefined
    const activeAnchor = input.perceptionState
      ? getActiveAttentionAnchor(input.perceptionState, input.now, 10 * 60_000)
      : null
    const recentResidue = input.perceptionState
      ? getActivePerceptionSceneResidue(input.perceptionState, input.now, 10 * 60_000)
      : null
    const carryTarget = recentResidue?.focusTarget
      ?? activeAnchor
      ?? input.visualPresenceState?.attention?.target
      ?? input.visualPresenceState?.worldModel?.focusTarget
      ?? undefined
    const preferCarryTarget = Boolean(
      liveForeground
      && isSelfPerceptionTarget(liveForeground)
      && carryTarget
      && !isSelfPerceptionTarget(carryTarget),
    )
    const effectiveTarget = preferCarryTarget ? carryTarget : liveForeground
    const workloadKind = preferCarryTarget
      ? recentResidue?.workloadKind
      ?? activeAnchor?.workloadKind
      ?? inferForegroundWorkloadFromWindow(effectiveTarget)
      : liveScene?.workloadKind
        ?? inferForegroundWorkloadFromWindow(effectiveTarget)
    const contentKind = preferCarryTarget
      ? recentResidue?.contentKind
      ?? inferForegroundContentFromWindow(effectiveTarget)
      : liveScene?.contentKind
        ?? recentResidue?.contentKind
        ?? inferForegroundContentFromWindow(effectiveTarget)
    const sceneSummary = (
      preferCarryTarget
        ? recentResidue?.summary
        : liveScene?.summary ?? recentResidue?.summary
    ) || sanitizeBriefText(effectiveTarget?.title ?? '', 160) || undefined
    const sceneSource: 'foreground-window-heuristic' | 'screen-semantic-summary' = preferCarryTarget && recentResidue?.source === 'screen-semantic-summary'
      ? 'screen-semantic-summary'
      : liveScene?.source === 'screen-semantic-summary'
        ? 'screen-semantic-summary'
        : 'foreground-window-heuristic'
    const foregroundWindow = effectiveTarget
      ? {
          appName: effectiveTarget.appName,
          processName: effectiveTarget.processName,
          title: effectiveTarget.title,
          pid: Number.isFinite(Number((effectiveTarget as { pid?: unknown }).pid))
            ? Math.max(1, Math.floor(Number((effectiveTarget as { pid?: unknown }).pid)))
            : null,
        }
      : undefined
    const currentScene = foregroundWindow
      ? {
          workloadKind,
          contentKind,
          scenario: inferScenarioFromContext({
            workload: workloadKind,
            content: contentKind,
            lateNight,
            lateNightActiveMinutes: lateNight ? 1 : 0,
            fatigue: input.visualPresenceState?.privateThought?.emotionalTension === 'late-night-drain' ? 60 : 0,
          }),
          summary: sceneSummary,
          source: sceneSource,
          confidence: preferCarryTarget
            ? Math.max(recentResidue?.confidence ?? activeAnchor?.confidence ?? 0.42, 0.42)
            : liveScene?.confidence ?? (foregroundWindow ? 0.36 : 0),
          target: foregroundWindow,
          beganAt: preferCarryTarget
            ? recentResidue?.observedAt ?? activeAnchor?.anchoredAt ?? input.now
            : liveScene?.beganAt ?? input.now,
          lastSeenAt: preferCarryTarget
            ? recentResidue?.observedAt ?? activeAnchor?.lastObservedAt ?? input.now
            : liveScene?.lastSeenAt ?? input.now,
        }
      : liveScene
    const context = {
      localTime: {
        hour: date.getHours(),
        minute: date.getMinutes(),
        isLateNight: lateNight,
      },
      system: {
        cpuUsage: 0,
        battery: { percent: null, charging: null },
        memory: { usagePercent: 0, freeMB: 0, totalMB: 0 },
        idleSeconds: null,
        inputActivity: 'unknown',
        fullscreenLikely: false,
        foregroundWindow,
        degradedSignals: [],
      },
      workload: {
        kind: workloadKind,
        confidence: currentScene?.workloadKind ? currentScene.confidence : 0.24,
        source: sceneSource,
        matchedLabels: [],
      },
      content: {
        kind: contentKind,
        confidence: currentScene?.contentKind ? currentScene.confidence : 0.18,
        source: sceneSource,
        matchedLabels: [],
        summary: currentScene?.summary,
      },
      relationship: {
        hostAttitude: '',
        boredom: 0,
        loneliness: 0,
        fatigue: input.visualPresenceState?.privateThought?.emotionalTension === 'late-night-drain' ? 60 : 0,
        minutesSinceLastUserTurn: 0,
        reminderBacklog: 0,
        lateNightActiveMinutes: lateNight ? 1 : 0,
        recentProactiveOutcomes: [],
      },
    } satisfies AlicizationProactiveLayeredContext
    const worldModel = currentScene
      ? buildWorldModel({
          now: input.now,
          context,
          watchMode: input.visualPresenceState?.watchMode ?? 'mnemonic-passive',
          scene: currentScene,
          attention: foregroundWindow
            ? {
                target: foregroundWindow,
                source: preferCarryTarget
                  ? recentResidue
                    ? 'recent-observation'
                    : activeAnchor
                      ? 'old-anchor'
                      : 'foreground-window'
                  : input.visualPresenceState?.attention?.source ?? 'foreground-window',
                confidence: currentScene.confidence,
                engagedAt: currentScene.beganAt,
                lastConfirmedAt: currentScene.lastSeenAt,
                dwellMs: Math.max(0, input.now - currentScene.beganAt),
                invalidationReason: null,
              }
            : input.visualPresenceState?.attention ?? null,
          recentTransition: input.visualPresenceState?.recentTransition ?? null,
          workingMemoryEpisodes: input.visualPresenceState?.workingMemoryEpisodes ?? [],
          previousModel: input.visualPresenceState?.worldModel ?? null,
        })
      : null

    return {
      context,
      currentScene,
      worldModel,
    }
  }

  function resolveInspectionIntentForChatTurn(input: {
    now: number
    userText: string
    messages: Array<{ role?: string, content?: unknown }>
    perceptionState: AlicizationPerceptionState
    visualPresenceState: AlicizationVisualPresenceStateSnapshot
    currentForeground?: AlicizationSystemProbeSample['foregroundWindow'] | null
  }) {
    const baseIntent = detectInvitedInspectionIntent(input.userText)
    const normalized = normalizeOrganicRecallText(input.userText).toLowerCase()
    const stableSharedAttention = hasStableSharedAttention({
      now: input.now,
      perceptionState: input.perceptionState,
      visualPresenceState: input.visualPresenceState,
    })
    const recentMessageWindow = input.messages.slice(-6)
    const recentUserInspection = recentMessageWindow.some((message, index) => {
      if (message?.role !== 'user')
        return false
      return inferAlicizationInspectionIntent({
        message: readTransportContentAsText(message.content),
        recentMessages: recentMessageWindow.slice(0, index),
        contextPhrases: buildInspectionIntentContextPhrases(input),
        sharedAttentionActive: stableSharedAttention,
      }).active
    })
    const inspectionContinuityActive = Boolean(
      recentUserInspection
      || (input.perceptionState.invitedInspection && input.perceptionState.invitedInspection.activeUntil > input.now)
      || input.perceptionState.recentSceneResidue?.source === 'invited-inspection',
    )
    const semanticIntent = inferAlicizationInspectionIntent({
      message: normalized,
      recentMessages: input.messages.slice(0, -1),
      contextPhrases: buildInspectionIntentContextPhrases(input),
      sharedAttentionActive: stableSharedAttention || inspectionContinuityActive,
    })
    const identityDialoguePivotSignal = Boolean(
      normalized
      && (
        /(?:这个人|那个人|这人|那人|说的就?是|没错|对啊?).{0,8}(?:就是你|是你)/u.test(normalized)
        || /(?:就是|正是)(?:你|妳)[啊呀呢嘛]?/u.test(normalized)
        || /\b(?:that(?:'s| is) you|it(?:'s| is) you|you(?:'re| are) the one|this person is you|that person is you)\b/i.test(normalized)
      ),
    )
    const semanticPremarkEligible = semanticIntent.reasonCodes.some(code => [
      'explicit-visual-ask',
      'observe-cue',
      'describe-cue',
      'visual-plane-cue',
      'recheck-cue',
      'scene-shift-cue',
    ].includes(code))
    const forceDialogueIdentityPivot = Boolean(
      inspectionContinuityActive
      && identityDialoguePivotSignal
      && !baseIntent.active
      && !semanticPremarkEligible,
    )
    const premarkInspectionOwnedTurn = !forceDialogueIdentityPivot
      && (baseIntent.active || (semanticIntent.active && semanticPremarkEligible))
    const ingressContext = buildDialogueIngressContext({
      now: input.now,
      currentForeground: input.currentForeground,
      perceptionState: input.perceptionState,
      visualPresenceState: input.visualPresenceState,
    })
    const ingressSemantics = buildDialogueTurnSemantics({
      userText: input.userText,
      previousAssistantText: readLatestAssistantMessageText(input.messages),
      context: ingressContext.context,
      currentScene: ingressContext.currentScene,
      worldModel: ingressContext.worldModel,
      subjectiveInference: input.visualPresenceState.subjectiveInference ?? null,
      relationshipModel: input.visualPresenceState.relationshipModel ?? null,
      privateThought: input.visualPresenceState.privateThought ?? null,
      // NOTICE: Inspection continuity should influence ingress governance, but it
      // must not pre-mark the turn itself as inspection-owned. Otherwise a plain
      // dialogue pivot can be coerced into task-knot before the governor gets a
      // chance to release the carry.
      inspectionRequested: premarkInspectionOwnedTurn,
    })
    const ingressGovernor = buildDialogueIngressGovernor({
      semantics: ingressSemantics,
      baseInspectionIntentActive: baseIntent.active,
      semanticInspectionIntentActive: semanticIntent.active,
      semanticInspectionIntentConfidence: semanticIntent.confidence,
      semanticInspectionReasonCodes: semanticIntent.reasonCodes,
      inspectionContinuityActive,
      sharedAttentionActive: stableSharedAttention,
    })
    const explicitInspectionIntent = baseIntent.active || semanticIntent.active
    const ownershipHint = {
      subject: ingressGovernor.turnOwner,
      screenReferenceMode: ingressGovernor.screenReferenceMode,
      confidence: ingressGovernor.confidence,
      reasonTags: ingressGovernor.reasonTags,
    }
    const ingressDialogueFirstSignal = Boolean(
      ingressSemantics.subjectPreference === 'alicization-self'
      || ingressSemantics.subjectPreference === 'relationship'
      || ingressSemantics.subjectPreference === 'host-state'
      || ingressSemantics.reasonTags.includes('dialogue-first-turn')
      || ingressSemantics.reasonTags.includes('scene-detached-turn'),
    )
    const ingressSceneBoundSignal = Boolean(
      ingressSemantics.subjectPreference === 'task-knot'
      || ingressSemantics.subjectPreference === 'visible-scene'
      || ingressSemantics.reasonTags.includes('scene-bound-turn')
      || ingressSemantics.reasonTags.includes('inspection-owned-turn'),
    )
    const resolveInspectionReleaseCause = (input: {
      stateDecision: ReturnType<typeof resolveInspectionTurnState>
      gateDecision: ReturnType<typeof resolveInspectionGroundingGate>
      reasonCodes: string[]
    }) => {
      if (!input.gateDecision.releaseCarry)
        return null

      const reasons = new Set([
        ...input.reasonCodes,
        ...input.stateDecision.reasonTags,
        ...input.gateDecision.reasonTags,
      ])
      if (reasons.has('identity-dialogue-pivot'))
        return 'identity-dialogue-pivot'
      if (
        reasons.has('dialogue-pivot-away-from-inspection')
        || reasons.has('dialogue-pivot-away')
        || reasons.has('grounding-gate:dialogue-first-ingress')
      ) {
        return 'dialogue-pivot-away-from-inspection'
      }
      if (reasons.has('grounding-gate:ingress-ineligible'))
        return 'ingress-ineligible'
      if (reasons.has('grounding-gate:already-dialogue-first'))
        return 'already-dialogue-first'
      if (reasons.has('release-inspection-carry'))
        return 'release-inspection-carry'
      return 'inspection-carry-released'
    }
    const buildInspectionOwnershipTransition = (input: {
      stateDecision: ReturnType<typeof resolveInspectionTurnState>
      gateDecision: ReturnType<typeof resolveInspectionGroundingGate>
      reasonCodes: string[]
    }) => {
      const ownershipBefore = buildDialogueTurnOwnership({
        semantics: ingressSemantics,
        worldModel: ingressContext.worldModel,
        inspectionRequested: input.stateDecision.inspectionRequested,
        inspectionState: input.stateDecision.state,
        releaseInspectionCarry: input.stateDecision.releaseCarry,
        ingressHint: ownershipHint,
      })
      const ownershipAfter = buildDialogueTurnOwnership({
        semantics: ingressSemantics,
        worldModel: ingressContext.worldModel,
        inspectionRequested: input.gateDecision.inspectionRequested,
        inspectionState: input.gateDecision.inspectionState,
        releaseInspectionCarry: input.gateDecision.releaseCarry,
        ingressHint: ownershipHint,
      })
      return {
        ownerBefore: ownershipBefore.subject,
        ownerAfter: ownershipAfter.subject,
        screenModeBefore: ownershipBefore.screenReferenceMode,
        screenModeAfter: ownershipAfter.screenReferenceMode,
        inspectionStateBefore: ownershipBefore.inspectionState,
        inspectionStateAfter: ownershipAfter.inspectionState,
        releaseCause: resolveInspectionReleaseCause({
          stateDecision: input.stateDecision,
          gateDecision: input.gateDecision,
          reasonCodes: input.reasonCodes,
        }),
      }
    }
    if (forceDialogueIdentityPivot) {
      const stateDecision = resolveInspectionTurnState({
        candidateInspectionActive: false,
        explicitInspectionIntent,
        continuityActive: inspectionContinuityActive,
        anchoredSceneContinuation: false,
        sharedAttentionContinuation: false,
        repairSignal: false,
        dialoguePivot: true,
        identityPivot: true,
        ingressInspectionEligible: ingressGovernor.inspectionEligible,
      })
      const gateDecision = resolveInspectionGroundingGate({
        inspectionRequested: stateDecision.inspectionRequested,
        inspectionState: stateDecision.state,
        releaseCarry: stateDecision.releaseCarry,
        explicitInspectionIntent,
        ingressInspectionEligible: ingressGovernor.inspectionEligible,
        ingressOwner: ingressGovernor.turnOwner,
        ingressDialogueFirstSignal,
        ingressSceneBoundSignal,
      })
      const reasonCodes = [
        'identity-dialogue-pivot',
        'dialogue-pivot-away-from-inspection',
        ...stateDecision.reasonTags,
        ...gateDecision.reasonTags,
        ...ingressGovernor.reasonTags,
      ].filter(Boolean)
      return {
        active: gateDecision.inspectionRequested,
        confidence: Math.max(semanticIntent.confidence, ingressGovernor.confidence, stateDecision.confidence, gateDecision.confidence, 0.52),
        reasonCodes,
        releaseCarry: gateDecision.releaseCarry,
        inspectionState: gateDecision.inspectionState,
        groundingGate: gateDecision,
        turnOwnershipHint: ownershipHint,
        ingress: ingressGovernor,
        ownershipTransition: buildInspectionOwnershipTransition({
          stateDecision,
          gateDecision,
          reasonCodes,
        }),
      }
    }
    if (!ingressGovernor.inspectionEligible) {
      const stateDecision = resolveInspectionTurnState({
        candidateInspectionActive: false,
        explicitInspectionIntent,
        continuityActive: inspectionContinuityActive,
        anchoredSceneContinuation: false,
        sharedAttentionContinuation: false,
        repairSignal: false,
        dialoguePivot: ingressGovernor.releaseInspectionCarry,
        identityPivot: false,
        ingressInspectionEligible: ingressGovernor.inspectionEligible,
      })
      const gateDecision = resolveInspectionGroundingGate({
        inspectionRequested: stateDecision.inspectionRequested,
        inspectionState: stateDecision.state,
        releaseCarry: stateDecision.releaseCarry,
        explicitInspectionIntent,
        ingressInspectionEligible: ingressGovernor.inspectionEligible,
        ingressOwner: ingressGovernor.turnOwner,
        ingressDialogueFirstSignal,
        ingressSceneBoundSignal,
      })
      const reasonCodes = [
        'dialogue-ingress-governor',
        ...stateDecision.reasonTags,
        ...gateDecision.reasonTags,
        ...ingressGovernor.reasonTags,
        ingressGovernor.releaseInspectionCarry ? 'dialogue-pivot-away-from-inspection' : '',
      ].filter(Boolean)
      return {
        active: gateDecision.inspectionRequested,
        confidence: Math.max(semanticIntent.confidence, ingressGovernor.confidence, stateDecision.confidence, gateDecision.confidence),
        reasonCodes,
        releaseCarry: gateDecision.releaseCarry,
        inspectionState: gateDecision.inspectionState,
        groundingGate: gateDecision,
        turnOwnershipHint: ownershipHint,
        ingress: ingressGovernor,
        ownershipTransition: buildInspectionOwnershipTransition({
          stateDecision,
          gateDecision,
          reasonCodes,
        }),
      }
    }
    const focusAlignment = measureDialogueFocusAlignment({
      message: normalized,
      contextPhrases: buildConcreteInspectionFocusPhrases(input),
    })
    const hasDirectVisualCue = semanticIntent.reasonCodes.includes('observe-cue')
      || semanticIntent.reasonCodes.includes('describe-cue')
      || semanticIntent.reasonCodes.includes('visual-plane-cue')
    const hasContinuationRepairCue = semanticIntent.reasonCodes.includes('deictic-cue')
      || semanticIntent.reasonCodes.includes('scene-shift-cue')
      || semanticIntent.reasonCodes.includes('recheck-cue')
      || semanticIntent.reasonCodes.includes('continuation-cue')
    const repairSignal = /重新|再|现在|自己|别猜|不要猜|不对|看准|看清|贴近|只看|认真/.test(normalized)
    const shortRepairTurn = normalized.length > 0 && normalized.length <= 28
    const anchoredSceneContinuation = Boolean(
      hasDirectVisualCue
      || hasContinuationRepairCue
      || focusAlignment.overlapRatio >= 0.32
      || semanticIntent.contextOverlap >= 0.45,
    )
    const dialoguePivotFromInspection = Boolean(
      forceDialogueIdentityPivot
      || (
        inspectionContinuityActive
        && !baseIntent.active
        && !anchoredSceneContinuation
        && !repairSignal
      ),
    )
    const sharedAttentionContinuation = Boolean(
      stableSharedAttention
      && inspectionContinuityActive
      && shortRepairTurn
      && semanticIntent.sharedAttentionLikely
      && anchoredSceneContinuation
      && (
        semanticIntent.contextOverlap >= 0.24
        || focusAlignment.overlapRatio >= 0.24
        || semanticIntent.reasonCodes.includes('deictic-cue')
        || semanticIntent.reasonCodes.includes('scene-shift-cue')
        || semanticIntent.reasonCodes.includes('recheck-cue')
        || semanticIntent.reasonCodes.includes('continuation-cue')
      ),
    )
    const detachedTurnFromScene = Boolean(
      dialoguePivotFromInspection
      || (
        !baseIntent.active
        && semanticIntent.reasonCodes.includes('question-cue')
        && !hasDirectVisualCue
        && !hasContinuationRepairCue
        && focusAlignment.overlapRatio < 0.18
      ),
    )
    const semanticBoost = (
      (inspectionContinuityActive ? 0.22 : 0)
      + (semanticIntent.reasonCodes.includes('observe-cue') ? 0.2 : 0)
      + (semanticIntent.reasonCodes.includes('describe-cue') ? 0.16 : 0)
      + (semanticIntent.reasonCodes.includes('visual-plane-cue') ? 0.18 : 0)
      + (stableSharedAttention ? 0.12 : 0)
      + (semanticIntent.reasonCodes.includes('context-overlap') ? 0.18 : 0)
      + (semanticIntent.reasonCodes.includes('question-cue') ? 0.08 : 0)
      + (semanticIntent.reasonCodes.includes('deictic-cue') ? 0.14 : 0)
      + (semanticIntent.reasonCodes.includes('scene-shift-cue') ? 0.18 : 0)
      + (semanticIntent.reasonCodes.includes('recheck-cue') ? 0.18 : 0)
      + (sharedAttentionContinuation ? 0.34 : 0)
      + (repairSignal ? 0.18 : 0)
      + (inspectionContinuityActive && shortRepairTurn ? 0.12 : 0)
    )
    const confidence = clamp01(Math.max(baseIntent.confidence, semanticIntent.confidence, semanticBoost))
    const activeHeuristic = !detachedTurnFromScene && (
      baseIntent.active
      || semanticIntent.active
      || confidence >= 0.64
      || sharedAttentionContinuation
    )
    const stateDecision = resolveInspectionTurnState({
      candidateInspectionActive: activeHeuristic,
      explicitInspectionIntent,
      continuityActive: inspectionContinuityActive,
      anchoredSceneContinuation,
      sharedAttentionContinuation,
      repairSignal,
      dialoguePivot: dialoguePivotFromInspection,
      identityPivot: forceDialogueIdentityPivot,
      ingressInspectionEligible: ingressGovernor.inspectionEligible,
    })
    const gateDecision = resolveInspectionGroundingGate({
      inspectionRequested: stateDecision.inspectionRequested,
      inspectionState: stateDecision.state,
      releaseCarry: stateDecision.releaseCarry,
      explicitInspectionIntent,
      ingressInspectionEligible: ingressGovernor.inspectionEligible,
      ingressOwner: ingressGovernor.turnOwner,
      ingressDialogueFirstSignal,
      ingressSceneBoundSignal,
    })
    const reasonCodes = [
      baseIntent.active ? 'base-inspection-intent' : '',
      inspectionContinuityActive ? 'inspection-continuity' : '',
      stableSharedAttention ? 'shared-attention-stable' : '',
      semanticIntent.reasonCodes.includes('observe-cue') ? 'observation-verb' : '',
      semanticIntent.reasonCodes.includes('describe-cue') ? 'description-cue' : '',
      semanticIntent.reasonCodes.includes('visual-plane-cue') ? 'current-scene-reference' : '',
      ((semanticIntent.reasonCodes.includes('entity-dense') || semanticIntent.reasonCodes.includes('referentially-rich'))
        && anchoredSceneContinuation)
        ? 'scene-object-reference'
        : '',
      semanticIntent.reasonCodes.includes('context-overlap') ? 'scene-context-overlap' : '',
      semanticIntent.reasonCodes.includes('question-cue') ? 'scene-question' : '',
      semanticIntent.reasonCodes.includes('deictic-cue') ? 'scene-deictic-reference' : '',
      semanticIntent.reasonCodes.includes('scene-shift-cue') ? 'scene-change-reference' : '',
      semanticIntent.reasonCodes.includes('recheck-cue') ? 'scene-recheck' : '',
      sharedAttentionContinuation ? 'shared-attention-continuation' : '',
      repairSignal ? 'inspection-repair' : '',
      shortRepairTurn ? 'short-follow-up' : '',
      forceDialogueIdentityPivot ? 'identity-dialogue-pivot' : '',
      dialoguePivotFromInspection ? 'dialogue-pivot-away-from-inspection' : '',
      detachedTurnFromScene ? 'scene-detached-question' : '',
      ...stateDecision.reasonTags,
      ...gateDecision.reasonTags,
    ].filter(Boolean)
    const ownershipTransition = buildInspectionOwnershipTransition({
      stateDecision,
      gateDecision,
      reasonCodes,
    })

    return {
      active: gateDecision.inspectionRequested,
      confidence: Math.max(confidence, stateDecision.confidence, gateDecision.confidence),
      reasonCodes,
      releaseCarry: gateDecision.releaseCarry,
      inspectionState: gateDecision.inspectionState,
      groundingGate: gateDecision,
      turnOwnershipHint: ownershipHint,
      ingress: ingressGovernor,
      ownershipTransition,
    }
  }

  function resolveInspectionIntentFromMessageHistory(input: {
    userText: string
    messages: Array<{ role?: string, content?: unknown }>
  }) {
    const baseIntent = detectInvitedInspectionIntent(input.userText)
    const semanticIntent = inferAlicizationInspectionIntent({
      message: input.userText,
      recentMessages: input.messages.slice(0, -1),
    })
    const semanticPremarkEligible = semanticIntent.reasonCodes.some(code => [
      'explicit-visual-ask',
      'observe-cue',
      'describe-cue',
      'visual-plane-cue',
      'recheck-cue',
      'scene-shift-cue',
    ].includes(code))
    if (!baseIntent.active && !semanticIntent.active)
      return false

    const ingressContext = buildDialogueIngressContext({
      now: Date.now(),
      perceptionState: null,
      visualPresenceState: null,
    })
    const ingressSemantics = buildDialogueTurnSemantics({
      userText: input.userText,
      previousAssistantText: readLatestAssistantMessageText(input.messages),
      context: ingressContext.context,
      currentScene: ingressContext.currentScene,
      worldModel: ingressContext.worldModel,
      inspectionRequested: baseIntent.active || (semanticIntent.active && semanticPremarkEligible),
    })
    const ingressGovernor = buildDialogueIngressGovernor({
      semantics: ingressSemantics,
      baseInspectionIntentActive: baseIntent.active,
      semanticInspectionIntentActive: semanticIntent.active,
      semanticInspectionIntentConfidence: semanticIntent.confidence,
      semanticInspectionReasonCodes: semanticIntent.reasonCodes,
      inspectionContinuityActive: false,
      sharedAttentionActive: false,
    })
    return ingressGovernor.inspectionEligible
  }

  function isWeakGenericBrowserPerceptionTarget(target?: {
    appName?: string
    processName?: string
    title?: string
  } | null) {
    return isWeakAlicizationScreenSurfaceTarget({
      appName: target?.appName ?? undefined,
      processName: target?.processName ?? undefined,
      title: target?.title ?? undefined,
    })
  }

  function isWeakGenericBrowserFocusTarget(input: {
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
      source?: string
    } | null
    captureStrategy?: AlicizationPerceptionSceneResidue['captureStrategy']
    userText?: string
  }) {
    return Boolean(
      isWeakGenericBrowserPerceptionTarget(input.focusTarget)
      && input.captureStrategy === 'screen-fallback'
      && isGenericScreenInspectionRequest(input.userText ?? ''),
    )
  }

  function shouldIgnoreSceneResidue(
    residue: AlicizationPerceptionSceneResidue | null | undefined,
  ) {
    if (!residue)
      return true

    return Boolean(
      residue.captureStrategy === 'screen-fallback'
      && residue.contentKind === 'unknown'
      && isWeakGenericBrowserPerceptionTarget(residue.focusTarget),
    )
  }

  function getUsablePerceptionSceneResidue(input: {
    state: AlicizationPerceptionState
    now: number
    maxAgeMs?: number
  }) {
    const residue = getActivePerceptionSceneResidue(input.state, input.now, input.maxAgeMs)
    return shouldIgnoreSceneResidue(residue) ? null : residue
  }

  function shouldSuppressWeakGenericBrowserInspectionAnchor(input: {
    now: number
    userText: string
    state: AlicizationPerceptionState
    currentForeground?: {
      appName?: string
      processName?: string
      title?: string
    }
    groundingUnavailableReason?: string
  }) {
    const activeAnchor = getActiveAttentionAnchor(input.state, input.now)
    if (!isWeakGenericBrowserPerceptionTarget(activeAnchor))
      return false

    if (isGenericScreenInspectionRequest(input.userText))
      return true

    const hintTerms = extractInspectionHintTerms(input.userText)
    if (hasCodingInspectionIntent(hintTerms))
      return true

    if (input.groundingUnavailableReason && input.groundingUnavailableReason !== 'user-already-attached-image')
      return true

    if (input.currentForeground && !isSelfPerceptionTarget(input.currentForeground) && !isWeakGenericBrowserPerceptionTarget(input.currentForeground))
      return true

    return false
  }

  function purgeWeakGenericBrowserInspectionState(input: {
    now: number
    state: AlicizationPerceptionState
  }) {
    const shouldDropAnchor = isWeakGenericBrowserPerceptionTarget(input.state.attentionAnchor)
    const shouldDropLastForeground = isWeakGenericBrowserPerceptionTarget(input.state.lastNonSelfForegroundTarget)
    const nextRecentObservations = input.state.recentObservations.filter(observation => !isWeakGenericBrowserPerceptionTarget(observation))
    const nextSceneResidue = shouldIgnoreSceneResidue(input.state.recentSceneResidue)
      ? null
      : input.state.recentSceneResidue

    if (
      !shouldDropAnchor
      && !shouldDropLastForeground
      && nextRecentObservations.length === input.state.recentObservations.length
      && nextSceneResidue === input.state.recentSceneResidue
    ) {
      return input.state
    }

    return {
      ...input.state,
      attentionAnchor: shouldDropAnchor ? null : input.state.attentionAnchor,
      lastNonSelfForegroundTarget: shouldDropLastForeground ? null : input.state.lastNonSelfForegroundTarget,
      recentObservations: nextRecentObservations,
      recentSceneResidue: nextSceneResidue,
      updatedAt: input.now,
    } satisfies AlicizationPerceptionState
  }

  function inferInspectionContentKind(input: {
    userText?: string
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
    } | null
    captureSourceName?: string
  }): AlicizationPerceptionSceneResidue['contentKind'] {
    const haystack = [
      input.userText ?? '',
      input.focusTarget?.appName ?? '',
      input.focusTarget?.processName ?? '',
      input.focusTarget?.title ?? '',
      input.captureSourceName ?? '',
    ].join(' ')
    if (/\b(?:error|exception|traceback|stack trace|test failed|panic|ts\d{3,5})\b|报错|错误|异常/i.test(haystack))
      return 'error'
    if (/\b(?:diff|pull request|compare|changes|commit|merge conflict)\b|改动|变更|对比/i.test(haystack))
      return 'diff'
    if (/\b(?:youtube|bilibili|netflix|vlc|iina|video|watching)\b|视频|播放/i.test(haystack))
      return 'video'
    if (/\b(?:qqmusic|qq music|spotify|apple music|music|playlist|album|track|song|lyrics|netease|cloud music)\b|qq音乐|网易云|音乐|歌曲|歌名|歌词|专辑/i.test(haystack))
      return 'music'
    if (/\b(?:discord|slack|telegram|wechat|chat)\b|聊天|对话/i.test(haystack))
      return 'chat'
    if (/\b(?:docs|documentation|readme|notion|confluence|wiki|mdn)\b|文档|说明/i.test(haystack))
      return 'doc'
    if (/\b(?:steam|game|elden ring|counter-strike|dota|league of legends|minecraft|valorant)\b|游戏/i.test(haystack))
      return 'gameplay'
    return 'unknown'
  }

  function shouldUsePerceptionResidueAsLiveSceneSummary(input: {
    residue: AlicizationPerceptionSceneResidue | null
    currentForeground?: {
      appName?: string
      processName?: string
      title?: string
      pid?: number | null
    }
    inspectionRequested: boolean
    groundedThisTurn: boolean
  }) {
    if (!input.residue?.summary)
      return false
    if (input.groundedThisTurn)
      return true

    const liveTarget = normalizeForegroundDecisionTarget(input.currentForeground)
    const residueTarget = normalizeForegroundDecisionTarget(input.residue.focusTarget)
    if (!liveTarget)
      return true
    if (!residueTarget)
      return !isSelfPerceptionTarget(liveTarget)
    if (scoreForegroundDecisionOverlap(liveTarget, residueTarget) >= 72)
      return true
    if (isSelfPerceptionTarget(liveTarget) && !isSelfPerceptionTarget(residueTarget))
      return false
    if (input.inspectionRequested && isSelfPerceptionTarget(liveTarget))
      return false
    return !isSelfPerceptionTarget(liveTarget)
  }

  function resolveInspectionGroundingContinuity(input: {
    now: number
    auditAction: string
    auditReason?: string
    residue: AlicizationPerceptionSceneResidue | null
    currentForeground?: {
      appName?: string
      processName?: string
      title?: string
      pid?: number | null
    }
    useResidueAsLiveSceneSummary: boolean
  }) {
    if (input.auditAction === 'inspection-grounded') {
      return {
        groundedThisTurn: true,
        source: 'live-grounded' as const,
        overlapScore: 120,
      }
    }
    if (!input.useResidueAsLiveSceneSummary || !input.residue) {
      return {
        groundedThisTurn: false,
        source: 'none' as const,
        overlapScore: 0,
      }
    }
    if (input.auditReason === 'screen-capture-permission-denied') {
      return {
        groundedThisTurn: false,
        source: 'none' as const,
        overlapScore: 0,
      }
    }
    if (!['screen-semantic-summary', 'invited-inspection'].includes(input.residue.source)) {
      return {
        groundedThisTurn: false,
        source: 'none' as const,
        overlapScore: 0,
      }
    }
    if (input.now - input.residue.observedAt > 2 * 60_000 || input.residue.confidence < 0.56) {
      return {
        groundedThisTurn: false,
        source: 'none' as const,
        overlapScore: 0,
      }
    }

    const residueTarget = normalizeForegroundDecisionTarget(input.residue.focusTarget)
    const liveTarget = normalizeForegroundDecisionTarget(input.currentForeground)
    if (!residueTarget || !liveTarget) {
      return {
        groundedThisTurn: false,
        source: 'none' as const,
        overlapScore: 0,
      }
    }
    if (isSelfPerceptionTarget(liveTarget) && !isSelfPerceptionTarget(residueTarget)) {
      return {
        groundedThisTurn: false,
        source: 'none' as const,
        overlapScore: 0,
      }
    }
    const overlap = scoreForegroundDecisionOverlap(liveTarget, residueTarget)
    if (overlap < 72) {
      return {
        groundedThisTurn: false,
        source: 'none' as const,
        overlapScore: overlap,
      }
    }
    return {
      groundedThisTurn: true,
      source: 'residue-carry' as const,
      overlapScore: overlap,
    }
  }

  function compactMindGovernedChatMessages(input: {
    messages: Message[]
    keepRecentUserTurns: number
  }) {
    const safeKeepTurns = Math.max(1, Math.floor(input.keepRecentUserTurns))
    const systemMessages = input.messages.filter(message => message.role === 'system')
    const dialogueMessages = input.messages.filter(message => message.role !== 'system')
    if (dialogueMessages.length === 0) {
      return {
        messages: input.messages,
        beforeCount: input.messages.length,
        afterCount: input.messages.length,
      }
    }

    let userTurnsSeen = 0
    let cutoffIndex = 0
    for (let index = dialogueMessages.length - 1; index >= 0; index -= 1) {
      if (dialogueMessages[index]?.role === 'user')
        userTurnsSeen += 1
      cutoffIndex = index
      if (userTurnsSeen >= safeKeepTurns)
        break
    }

    const compactedMessages = [
      ...systemMessages,
      ...dialogueMessages.slice(cutoffIndex),
    ]

    return {
      messages: compactedMessages,
      beforeCount: input.messages.length,
      afterCount: compactedMessages.length,
    }
  }

  function buildInspectionSceneResidue(input: {
    now: number
    userText: string
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
      source?: AlicizationPerceptionSceneResidue['focusSource']
      confidence?: number
    } | null
    captureSourceName: string
    captureStrategy: AlicizationPerceptionSceneResidue['captureStrategy']
  }): AlicizationPerceptionSceneResidue | null {
    if (!input.focusTarget || isWeakAlicizationScreenSurfaceTarget(input.focusTarget))
      return null

    const workloadKind = inferForegroundWorkloadFromWindow(input.focusTarget)
    const contentKind = inferInspectionContentKind({
      userText: input.userText,
      focusTarget: input.focusTarget,
      captureSourceName: input.captureSourceName,
    })
    const summary = contentKind === 'unknown'
      ? ''
      : [
          workloadKind === 'unknown' ? '' : workloadKind,
          contentKind,
          'focus',
        ].filter(Boolean).join(' ')

    return {
      observedAt: input.now,
      source: 'invited-inspection',
      workloadKind,
      contentKind,
      summary: summary || undefined,
      confidence: Math.max(0.52, Math.min(0.92, Number(input.focusTarget.confidence ?? 0.7))),
      focusTarget: {
        appName: input.focusTarget.appName,
        processName: input.focusTarget.processName,
        title: input.focusTarget.title,
      },
      focusSource: input.focusTarget.source,
      captureSourceName: sanitizeBriefText(input.captureSourceName, 120) || undefined,
      captureStrategy: input.captureStrategy,
    }
  }

  function buildScreenSemanticSummaryFromResidue(
    residue: AlicizationPerceptionSceneResidue,
  ): AlicizationScreenSemanticSummary {
    const sourceName = residue.captureSourceName
      || describePerceptionTarget(residue.focusTarget)
      || 'recent invited inspection'
    return {
      workload: {
        kind: residue.workloadKind,
        confidence: residue.confidence,
        matchedLabels: residue.focusSource ? [residue.focusSource] : [],
      },
      content: {
        kind: residue.contentKind,
        confidence: residue.confidence,
        matchedLabels: residue.focusSource ? [residue.focusSource] : [],
        summary: residue.summary,
      },
      analyzedAt: residue.observedAt,
      source: {
        id: `scene-residue:${residue.source}`,
        name: sourceName,
        strategy: residue.captureStrategy ?? 'screen-fallback',
      },
    }
  }

  function describeSceneResidue(now: number, residue: AlicizationPerceptionSceneResidue | null | undefined) {
    if (!residue)
      return ''
    return [
      `${formatObservationAge(now, residue.observedAt)}`,
      `source=${residue.source}`,
      residue.focusTarget ? `focus=${describePerceptionTarget(residue.focusTarget)}` : '',
      residue.workloadKind !== 'unknown' ? `workload=${residue.workloadKind}` : '',
      residue.contentKind !== 'unknown' ? `content=${residue.contentKind}` : '',
      residue.summary ? `summary=${sanitizeBriefText(residue.summary, 80)}` : '',
    ].filter(Boolean).join(' | ')
  }

  function buildPerceptionContinuityLines(input: {
    now: number
    state: AlicizationPerceptionState
    maxItems?: number
    suppressWeakGenericBrowserAnchor?: boolean
  }) {
    const rawAnchor = getActiveAttentionAnchor(input.state, input.now)
    const suppressWeakGenericBrowserAnchor = Boolean(
      input.suppressWeakGenericBrowserAnchor
      && isWeakGenericBrowserPerceptionTarget(rawAnchor),
    )
    const anchor = suppressWeakGenericBrowserAnchor ? null : rawAnchor
    const lines = [
      suppressWeakGenericBrowserAnchor
        ? 'Attention anchor: suppressed weak generic browser metadata.'
        : `Attention anchor: ${describePerceptionTarget(anchor)}.`,
      `Invited inspection active: ${input.state.invitedInspection && input.state.invitedInspection.activeUntil > input.now ? 'yes' : 'no'}.`,
    ]
    const recentObservations = input.state.recentObservations
      .filter(observation => !input.suppressWeakGenericBrowserAnchor || !isWeakGenericBrowserPerceptionTarget(observation))
      .slice(-(input.maxItems ?? 3))
    if (recentObservations.length > 0) {
      lines.push(
        'Recent observations:',
        ...recentObservations.map(observation => `- ${formatObservationAge(input.now, observation.observedAt)} | ${describePerceptionTarget(observation)} | workload=${observation.workloadKind}`),
      )
    }
    const sceneResidue = getUsablePerceptionSceneResidue({
      state: input.state,
      now: input.now,
    })
    if (sceneResidue) {
      lines.push(
        `Scene residue: ${describeSceneResidue(input.now, sceneResidue)}.`,
      )
    }
    return lines
  }

  function buildProactivePerceptionSignals(input: {
    now: number
    state: AlicizationPerceptionState
    currentForeground?: {
      appName?: string
      processName?: string
      title?: string
    }
  }): AlicizationProactivePerceptionSignals {
    const attentionAnchor = getActiveAttentionAnchor(input.state, input.now)
    const currentForegroundIsSelf = input.currentForeground
      ? isSelfPerceptionTarget(input.currentForeground)
      : false
    const recentObservationCount = input.state.recentObservations
      .filter(observation => input.now - observation.observedAt <= 10 * 60_000)
      .length

    return {
      activeAttentionAnchor: Boolean(attentionAnchor),
      attentionAnchorAgeMs: attentionAnchor
        ? Math.max(0, input.now - attentionAnchor.lastObservedAt)
        : null,
      attentionAnchorConfidence: attentionAnchor?.confidence ?? 0,
      attentionAnchorWorkloadKind: attentionAnchor?.workloadKind ?? 'unknown',
      attentionAnchorCanOverrideScenario: Boolean(attentionAnchor && currentForegroundIsSelf),
      recentObservationCount,
      invitedInspectionActive: Boolean(input.state.invitedInspection && input.state.invitedInspection.activeUntil > input.now),
    }
  }

  function normalizeForegroundDecisionTarget(
    target: AlicizationSystemProbeSample['foregroundWindow'] | {
      appName?: string
      processName?: string
      title?: string
      pid?: number | null
    } | null | undefined,
  ) {
    const appName = sanitizeText(target?.appName)
    const processName = sanitizeText(target?.processName)
    const title = sanitizeText(target?.title)
    const pid = Number.isFinite(Number(target?.pid)) ? Math.max(1, Math.floor(Number(target?.pid))) : null
    if (!appName && !processName && !title && pid === null)
      return undefined
    return {
      appName: appName || undefined,
      processName: processName || undefined,
      title: title || undefined,
      pid,
    }
  }

  function buildForegroundDecisionText(
    target: ReturnType<typeof normalizeForegroundDecisionTarget>,
  ) {
    if (!target)
      return ''
    return [target.appName, target.processName, target.title].filter(Boolean).join(' ')
  }

  function tokenizeForegroundDecisionText(value: string) {
    return value
      .toLowerCase()
      .split(/[^a-z0-9\u4E00-\u9FFF]+/i)
      .map(token => token.trim())
      .filter(Boolean)
  }

  function scoreForegroundDecisionOverlap(
    left: ReturnType<typeof normalizeForegroundDecisionTarget>,
    right: ReturnType<typeof normalizeForegroundDecisionTarget>,
  ) {
    const leftText = buildForegroundDecisionText(left).toLowerCase()
    const rightText = buildForegroundDecisionText(right).toLowerCase()
    if (!leftText || !rightText)
      return 0
    if (leftText === rightText)
      return 120
    if (leftText.includes(rightText) || rightText.includes(leftText))
      return 86

    const leftTokens = new Set(tokenizeForegroundDecisionText(leftText))
    const rightTokens = tokenizeForegroundDecisionText(rightText)
    let score = 0
    for (const token of rightTokens) {
      if (!leftTokens.has(token))
        continue
      score += token.length >= 5 ? 24 : 12
    }
    return score
  }

  function getForegroundDecisionSpecificity(
    target: ReturnType<typeof normalizeForegroundDecisionTarget>,
  ) {
    if (!target)
      return 0
    switch (inferForegroundWorkloadFromWindow(target)) {
      case 'coding':
      case 'terminal':
        return 120
      case 'game':
      case 'media':
        return 104
      case 'document':
      case 'chat':
        return 84
      case 'browser':
        return 42
      default:
        return 16
    }
  }

  function hasCodingInspectionIntent(hintTerms: string[]) {
    return hintTerms.some(term => /\b(?:code|vscode|visual studio code|cursor|windsurf|xcode|jetbrains|terminal|iterm|warp|docker|diff|error|exception|traceback|test failed|compare|changes)\b/i.test(term))
  }

  function mergeForegroundDecisionTarget(
    primary: ReturnType<typeof normalizeForegroundDecisionTarget>,
    secondary: ReturnType<typeof normalizeForegroundDecisionTarget>,
  ) {
    if (!primary)
      return secondary ?? undefined
    if (!secondary)
      return primary
    return {
      appName: primary.appName ?? secondary.appName,
      processName: primary.processName ?? secondary.processName,
      title: primary.title ?? secondary.title,
      pid: primary.pid ?? secondary.pid ?? null,
    }
  }

  function resolveForegroundDecisionTarget(input: {
    snapshotForeground?: AlicizationSystemProbeSample['foregroundWindow']
    probedForeground?: AlicizationSystemProbeSample['foregroundWindow']
    attentionAnchor?: {
      appName?: string
      processName?: string
      title?: string
    } | null
    hintTerms?: string[]
    allowAttentionAnchorFallback?: boolean
  }) {
    const snapshot = normalizeForegroundDecisionTarget(input.snapshotForeground)
    const probe = normalizeForegroundDecisionTarget(input.probedForeground)
    const anchor = normalizeForegroundDecisionTarget(input.attentionAnchor)
    const snapshotWeak = isWeakGenericBrowserPerceptionTarget(snapshot)
    const probeWeak = isWeakGenericBrowserPerceptionTarget(probe)
    const anchorWeak = isWeakGenericBrowserPerceptionTarget(anchor)
    const usableSnapshot = snapshotWeak ? undefined : snapshot
    const usableProbe = probeWeak ? undefined : probe
    const usableAnchor = anchorWeak ? undefined : anchor
    const hintTerms = Array.isArray(input.hintTerms) ? input.hintTerms.filter(Boolean) : []
    const codingInspectionIntent = hasCodingInspectionIntent(hintTerms)

    if (usableSnapshot && usableProbe && scoreForegroundDecisionOverlap(usableSnapshot, usableProbe) >= 96)
      return mergeForegroundDecisionTarget(usableSnapshot, usableProbe)

    const snapshotSpecificity = getForegroundDecisionSpecificity(usableSnapshot)
    const probeSpecificity = getForegroundDecisionSpecificity(usableProbe)
    const anchorSpecificity = getForegroundDecisionSpecificity(usableAnchor)
    const snapshotAnchorScore = scoreForegroundDecisionOverlap(usableSnapshot, usableAnchor)
    const probeAnchorScore = scoreForegroundDecisionOverlap(usableProbe, usableAnchor)

    if (
      input.allowAttentionAnchorFallback
      && usableAnchor
      && anchorSpecificity >= 84
      && Math.max(snapshotAnchorScore, probeAnchorScore) < 24
      && (
        codingInspectionIntent
        || isSelfPerceptionTarget(usableSnapshot)
        || isSelfPerceptionTarget(usableProbe)
        || probeSpecificity <= 42
      )
    ) {
      return usableAnchor
    }

    if (usableSnapshot && isSelfPerceptionTarget(usableSnapshot) && usableProbe && !isSelfPerceptionTarget(usableProbe))
      return usableProbe
    if (usableProbe && isSelfPerceptionTarget(usableProbe) && usableSnapshot && !isSelfPerceptionTarget(usableSnapshot))
      return usableSnapshot

    if (usableAnchor && usableSnapshot && snapshotAnchorScore >= probeAnchorScore + 24)
      return mergeForegroundDecisionTarget(usableSnapshot, usableProbe && scoreForegroundDecisionOverlap(usableSnapshot, usableProbe) >= 48 ? usableProbe : undefined)
    if (usableAnchor && usableProbe && probeAnchorScore >= snapshotAnchorScore + 24)
      return usableProbe

    if (usableSnapshot && usableProbe) {
      if (snapshotSpecificity >= probeSpecificity + 32 && probeSpecificity <= 42)
        return usableSnapshot
      if (probeSpecificity >= snapshotSpecificity + 32 && snapshotSpecificity <= 42)
        return usableProbe
      if (codingInspectionIntent && snapshotSpecificity >= 84 && probeSpecificity <= 42)
        return usableSnapshot
    }

    return usableSnapshot ?? usableProbe ?? (input.allowAttentionAnchorFallback ? usableAnchor ?? undefined : undefined)
  }

  function buildProactivePerceptionSystemBlock(input: {
    now: number
    state: AlicizationPerceptionState
  }) {
    const lines = [
      '[ALICIZATION_PERCEPTION_CONTINUITY]',
      'This is Alicization short-lived perceptual continuity, not a user claim.',
      ...buildPerceptionContinuityLines(input),
      'When wording a proactive utterance, let this continuity influence timing and relevance, but do not invent certainty beyond what these observations support.',
    ]
    return lines.join('\n')
  }

  function normalizeOrganicRecallText(raw: string) {
    return sanitizeMultilineText(raw, '').replace(/\s+/g, ' ').trim()
  }

  function shouldExtendContextualRecall(userText: string) {
    const compact = normalizeOrganicRecallText(userText).replace(/\s+/g, '')
    if (!compact)
      return false
    if (compact.length < 12)
      return true
    return /^(?:对啊|然后呢|继续|是吗|嗯+|哦+|好的|好吧|对|然后|继续说|还有呢|再说|细说|展开讲讲|行|ok|okay|yes|yeah|right|andthen)$/i.test(compact)
  }

  function escapeFts5Phrase(value: string) {
    return value.replace(/"/g, '""')
  }

  const organicRecallStopWords = new Set([
    '对啊',
    '然后呢',
    '继续',
    '是吗',
    '嗯',
    '哦',
    '好的',
    '好吧',
    '知道了',
    '继续说',
    '还有呢',
    '然后',
    '对',
    'yes',
    'yeah',
    'okay',
    'ok',
    'right',
    'then',
  ])

  function extractOrganicRecallTerms(text: string) {
    const normalized = normalizeOrganicRecallText(text)
    if (!normalized)
      return []

    const collected: string[] = []
    const push = (raw: string, maxChars = 48) => {
      const term = normalizeOrganicRecallText(raw).slice(0, maxChars)
      if (!term)
        return
      const lowered = term.toLowerCase()
      if (organicRecallStopWords.has(lowered))
        return
      if (collected.some(item => item.toLowerCase() === lowered))
        return
      collected.push(term)
    }

    for (const match of normalized.matchAll(/[“"「『《`']([^“"」』》`']{2,48})[”"」』》`']/g))
      push(match[1] ?? '')
    for (const match of normalized.matchAll(/[A-Z]:\\\S+|(?:\.{0,2}\/)?[\w.-]+(?:\/[\w./-]+)+/gi))
      push(match[0] ?? '', 80)
    for (const match of normalized.matchAll(/\bemotional_tension:[a-z-]{4,32}\b/g))
      push(match[0] ?? '', 48)
    for (const match of normalized.matchAll(/\b(?:ERR_[A-Z0-9_]+|[A-Z]{2,}[A-Z0-9_-]{1,31}|[A-Z]{2,}-\d{2,})\b/g))
      push(match[0] ?? '', 40)
    for (const match of normalized.matchAll(/\b[A-Z_][\w.:-]{1,31}\b/gi))
      push(match[0] ?? '', 40)
    for (const match of normalized.matchAll(/[\u4E00-\u9FFF]{2,16}/g))
      push(match[0] ?? '', 32)

    return collected.slice(0, 12)
  }

  function buildFts5QueryFromTerms(terms: string[]) {
    if (terms.length === 0)
      return ''
    return terms
      .map(term => `"${escapeFts5Phrase(term)}"`)
      .join(' OR ')
  }

  function buildDirectFts5Query(text: string) {
    const normalized = normalizeOrganicRecallText(text)
    if (!normalized)
      return ''
    return `"${escapeFts5Phrase(normalized.slice(0, 96))}"`
  }

  async function getOrganicMemorySnapshot() {
    const currentSoul = soulSnapshot ?? await bootstrap()
    const [rawActiveThoughts, subconsciousCount, rawRecentSubconsciousFragments, rawLastDreamedAt] = await Promise.all([
      alicizationDb.listActiveThoughts().catch(() => []),
      alicizationDb.countSubconsciousFragments().catch(() => 0),
      alicizationDb.listRecentSubconsciousFragments(8).catch(() => []),
      alicizationDb.getMetaValue(alicizationDreamLastRunMetaKey).catch(() => undefined),
    ])
    const parsedLastDreamedAt = Number.parseInt(String(rawLastDreamedAt ?? ''), 10)
    const activeThoughts = filterOrganicMemoryEntries(rawActiveThoughts)
    const recentSubconsciousFragments = rawRecentSubconsciousFragments.filter(fragment => !isPersonaResidueMemoryText(fragment.text))

    if (activeThoughts.length !== rawActiveThoughts.length) {
      void alicizationDb.replaceActiveThoughts(activeThoughts.map(item => ({ text: item.text }))).catch(() => {})
    }

    return {
      hostAttitude: currentSoul.frontmatter.host_attitude,
      coreIncarnation: currentSoul.frontmatter.core_incarnation,
      activeThoughts,
      subconsciousCount,
      recentSubconsciousFragments,
      lastDreamedAt: Number.isFinite(parsedLastDreamedAt) ? Math.max(0, parsedLastDreamedAt) : null,
    } satisfies AlicizationOrganicMemorySnapshot
  }

  function scoreOrganicThoughtForPrompt(text: string, terms: string[]) {
    const normalized = normalizeOrganicRecallText(text).toLowerCase()
    if (!normalized || terms.length === 0)
      return 0

    let score = 0
    for (const term of terms) {
      const normalizedTerm = normalizeOrganicRecallText(term).toLowerCase()
      if (!normalizedTerm || !normalized.includes(normalizedTerm))
        continue
      score += normalizedTerm.length >= 6 ? 3 : 1
    }
    return score
  }

  function selectPromptActiveThoughts(input: {
    activeThoughts: AlicizationActiveThought[]
    recallSeed?: string
    recalledFragments?: AlicizationSubconsciousFragment[]
  }) {
    const activeThoughts = filterOrganicMemoryEntries(Array.isArray(input.activeThoughts) ? input.activeThoughts : [])
    if (activeThoughts.length <= 2 && !input.recallSeed)
      return activeThoughts

    const terms = [
      ...extractOrganicRecallTerms(input.recallSeed ?? ''),
      ...(input.recalledFragments ?? []).flatMap(fragment => extractOrganicRecallTerms(fragment.text)),
    ]
    const uniqueTerms = Array.from(new Set(
      terms
        .map(term => normalizeOrganicRecallText(term).toLowerCase())
        .filter(Boolean),
    ))
    if (uniqueTerms.length === 0)
      return input.recallSeed ? [] : activeThoughts.slice(0, 2)

    return activeThoughts
      .map(thought => ({
        thought,
        score: scoreOrganicThoughtForPrompt(thought.text, uniqueTerms),
      }))
      .filter(item => item.score > 0)
      .sort((left, right) => {
        if (left.score !== right.score)
          return right.score - left.score
        return right.thought.updatedAt - left.thought.updatedAt
      })
      .slice(0, 3)
      .map(item => item.thought)
  }

  async function getPerformanceManifest() {
    const raw = await alicizationDb.getMetaValue(alicizationPerformanceManifestMetaKey).catch(() => undefined)
    return parsePerformanceManifestFromMeta(raw)
  }

  async function setPerformanceManifest(manifest: CharacterPerformanceCapabilitiesManifest | null) {
    if (!manifest) {
      await alicizationDb.setMetaValue(alicizationPerformanceManifestMetaKey, '').catch(() => {})
      return
    }

    const sanitized = sanitizePerformanceManifest(manifest)
    await alicizationDb.setMetaValue(
      alicizationPerformanceManifestMetaKey,
      JSON.stringify(sanitized ?? null),
    ).catch(() => {})
  }

  async function searchOrganicSubconsciousFragments(query: string, limit = 12) {
    const extractedTerms = extractOrganicRecallTerms(query)
    const ftsQuery = extractedTerms.length > 0
      ? buildFts5QueryFromTerms(extractedTerms)
      : buildDirectFts5Query(query)
    if (!ftsQuery)
      return []
    return await alicizationDb.searchSubconsciousFragments(ftsQuery, Math.max(1, Math.min(20, limit))).catch(() => [])
  }

  async function recallSubconsciousFragmentsFromText(text: string) {
    const terms = extractOrganicRecallTerms(text)
    if (terms.length === 0)
      return []

    const ftsQuery = buildFts5QueryFromTerms(terms)
    if (!ftsQuery)
      return []

    const rows = await alicizationDb.searchSubconsciousFragments(ftsQuery, 6).catch(() => [])
    const loweredTerms = terms.map(term => term.toLowerCase())
    const reranked = [...rows].sort((left, right) => {
      const leftText = left.text.toLowerCase()
      const rightText = right.text.toLowerCase()
      const leftScore = loweredTerms.reduce((score, term) => score + (leftText.includes(term) ? 1 : 0), 0)
      const rightScore = loweredTerms.reduce((score, term) => score + (rightText.includes(term) ? 1 : 0), 0)
      if (leftScore !== rightScore)
        return rightScore - leftScore
      return right.createdAt - left.createdAt
    })
    const deduped: AlicizationSubconsciousFragment[] = []
    for (const row of reranked) {
      if (deduped.some(item => item.text === row.text && item.sourceKind === row.sourceKind))
        continue
      deduped.push(row)
      if (deduped.length >= 2)
        break
    }
    return deduped
  }

  async function resolveRecentContextualTurns(turnCount: number) {
    const sessionId = await ensureActiveOrLatestSessionId(activeCardId).catch(() => '')
    if (!sessionId)
      return []

    const rows = await alicizationDb.listConversationTurnsBySession(sessionId, { limit: 12 }).catch(() => [])
    return rows
      .filter(row => normalizeOrganicRecallText(row.userText ?? '') || normalizeOrganicRecallText(row.assistantText ?? ''))
      .slice(-turnCount)
      .map((row): ContextualConversationTurn => ({
        userText: normalizeOrganicRecallText(row.userText ?? ''),
        assistantText: normalizeOrganicRecallText(row.assistantText ?? ''),
      }))
  }

  async function buildMainChatContextualString(payload: AlicizationChatStartPayload) {
    const currentUserText = (() => {
      for (let index = payload.messages.length - 1; index >= 0; index -= 1) {
        const message = payload.messages[index]
        if (message?.role !== 'user')
          continue
        return normalizeOrganicRecallText(readTransportContentAsText(message.content))
      }
      return ''
    })()
    if (!currentUserText || isInternalAlicizationRepairPrompt(currentUserText))
      return ''
    if (resolveInspectionIntentFromMessageHistory({
      userText: currentUserText,
      messages: payload.messages,
    })) {
      return `U: ${currentUserText}`
    }

    const recentTurnCount = shouldExtendContextualRecall(currentUserText) ? 3 : 2
    const recentTurns = await resolveRecentContextualTurns(recentTurnCount)
    return [
      ...recentTurns.map(turn => [
        turn.userText ? `U: ${turn.userText}` : '',
        turn.assistantText ? `A: ${turn.assistantText}` : '',
      ].filter(Boolean).join('\n')),
      `U: ${currentUserText}`,
    ].filter(Boolean).join('\n\n')
  }

  function readLatestUserMessageText(messages: Array<{ role?: string, content?: unknown }>) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index]
      if (message?.role !== 'user')
        continue
      return normalizeOrganicRecallText(readTransportContentAsText(message.content))
    }
    return ''
  }

  function readLatestAssistantMessageText(messages: Array<{ role?: string, content?: unknown }>) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index]
      if (message?.role !== 'assistant')
        continue
      return normalizeOrganicRecallText(readTransportContentAsText(message.content))
    }
    return ''
  }

  function redactStaleInspectionHistoryMessages(
    messages: AlicizationChatStartPayload['messages'],
    latestUserText: string,
  ) {
    if (!latestUserText || isInternalAlicizationRepairPrompt(latestUserText) || !resolveInspectionIntentFromMessageHistory({
      userText: latestUserText,
      messages,
    })) {
      return messages
    }

    let inspectionContextActive = false
    return messages.map((message, index) => {
      const role = typeof message?.role === 'string' ? message.role : ''
      if (role === 'user') {
        const userText = normalizeOrganicRecallText(readTransportContentAsText(message.content))
        inspectionContextActive = detectInvitedInspectionIntent(userText).active
        return message
      }

      if (role === 'assistant' && inspectionContextActive && index < messages.length - 1) {
        return {
          ...message,
          content: '[Earlier Alicization screen-inspection reply intentionally omitted so the current screenshot can dominate.]',
        }
      }

      return message
    })
  }

  function buildChatPerceptionSystemBlock(input: {
    now: number
    state: AlicizationPerceptionState
    inspectionRequested: boolean
    currentForeground?: {
      appName?: string
      processName?: string
      title?: string
    }
    suppressWeakGenericBrowserAnchor?: boolean
  }) {
    const anchor = getActiveAttentionAnchor(input.state, input.now)
    const recentObservations = input.state.recentObservations.slice(-3)
    if (!input.inspectionRequested && !anchor && recentObservations.length === 0)
      return ''

    const lines = [
      '[ALICIZATION_PERCEPTION]',
      'Treat this as Alicization short-lived desktop perception rather than user-authored claims.',
      `Inspection mode: ${input.inspectionRequested ? 'invited-by-user' : 'passive-memory'}.`,
      ...buildPerceptionContinuityLines({
        now: input.now,
        state: input.state,
        suppressWeakGenericBrowserAnchor: input.suppressWeakGenericBrowserAnchor,
      }),
      `Current foreground sample: ${describePerceptionTarget(input.currentForeground)}.`,
    ]

    const carryResidue = getUsablePerceptionSceneResidue({
      state: input.state,
      now: input.now,
    })
    if (
      input.currentForeground
      && isSelfPerceptionTarget(input.currentForeground)
      && carryResidue?.focusTarget
      && !isSelfPerceptionTarget(carryResidue.focusTarget)
    ) {
      lines.push(
        `Visible surface is currently ${describePerceptionTarget(input.currentForeground)}.`,
        `If ${describePerceptionTarget(carryResidue.focusTarget)} appears below, treat it as carried task continuity rather than the literal current surface.`,
      )
    }

    if (input.state.invitedInspection) {
      lines.push(
        `Invited inspection hint: ${sanitizeBriefText(input.state.invitedInspection.hintText, 160)}.`,
      )
    }

    lines.push(
      'If the current foreground is Alicization/Codex chat, prefer the attention anchor or recent observations when the user asks to inspect code, diff, terminal, or on-screen issues.',
      'Separate what is directly visible in attached images from what is only inferred from short-term perception.',
    )

    return lines.join('\n')
  }

  function buildChatInspectionContractSystemBlock(input: {
    now: number
    state: AlicizationPerceptionState
    mode: 'grounded-screenshot' | 'perception-only'
    permissionStatus?: string
    unavailableReason?: string
    suppressWeakGenericBrowserAnchor?: boolean
  }) {
    const lines = [
      '[ALICIZATION_INSPECTION_CONTRACT]',
      'You were explicitly invited to observe the host workspace.',
      ...buildPerceptionContinuityLines({
        now: input.now,
        state: input.state,
        suppressWeakGenericBrowserAnchor: input.suppressWeakGenericBrowserAnchor,
      }),
      `Grounding mode: ${input.mode}.`,
      'Reply like a present digital being who just leaned in to look, not a detached OCR tool.',
    ]

    if (input.mode === 'grounded-screenshot') {
      lines.push(
        'Structure the reply in this order, even if you keep it natural and concise:',
        '1. Start with direct observations from the attached screenshot and recent continuity.',
        '2. Then state your likely inference about the problem, risk, or review target.',
        '3. Then state what remains uncertain or what the host should verify next.',
        'If short-lived perception memory and the current screenshot disagree, trust the screenshot first and mention the mismatch naturally.',
        'If you realize your earlier perception was stale, briefly correct yourself in-character and then continue from the current screenshot instead of defending the old memory.',
        'Previous screen descriptions in earlier chat turns are stale by default. Do not reuse old page names, URLs, prices, titles, or product details unless they are directly visible in this screenshot now.',
        'Do not say you are blind or cannot see when a grounded screenshot is attached.',
      )
    }
    else {
      const permissionDenied = input.unavailableReason === 'screen-capture-permission-denied'
      lines.push(
        permissionDenied
          ? `Screen capture grounding is unavailable right now${input.permissionStatus ? ` (permission status: ${input.permissionStatus})` : ''}.`
          : 'A fresh grounded screenshot was not attached for this turn.',
        'You still have Alicization short-lived perception continuity.',
        'When an attention anchor, recent observation, foreground sample, or invited inspection hint exists, answer from that evidence instead of claiming total blindness.',
        'Be explicit about the evidence level: say what you infer from the anchored app/title/context, then what remains uncertain because no screenshot was grounded.',
        'Only say you cannot see if there is no usable perception evidence at all.',
        'For coding or diff requests, prefer a present-tense answer such as "我现在没直接抓到画面，但你刚才一直停在 Code 的 diff 里，所以..." rather than a generic refusal.',
      )
    }

    return lines.join('\n')
  }

  function buildChatVisualPresenceSystemBlock(state: AlicizationVisualPresenceStateSnapshot) {
    const privateThought = state.privateThought
    const truthContract = buildMindTruthContractLines(state)
    if (
      !state.currentScene
      && !privateThought
      && !state.mindTurnFrame
      && !state.worldModel
      && !state.worldOntology
      && !state.beliefLedger
      && !state.beliefRevision
      && !state.hypothesisGraph
      && !state.entityWorld
      && !state.subjectiveInference
      && !state.appraisal
      && !state.goalStack
      && (!state.concerns || state.concerns.length === 0)
      && !state.relationshipModel
      && !state.selfContinuity
      && !state.selfState
      && !state.inquiryLoop
      && !state.deliberationState
      && !state.threadRuntime
      && !state.commitmentLedger
      && !state.inquiryPlanner
      && !state.mindDynamics
      && !state.mindKernel
      && !state.counterfactualDeliberation
      && !state.actionEcology
      && !state.initiativeArbitration
      && !state.initiative
      && !state.desireMemory
      && !state.discourseState
      && !state.mindSynthesis
      && !state.conversationState
      && !state.dialogueWorldThread
      && !state.answerCompiler
      && !state.replyDeliberation
      && !state.recallGovernor
    ) {
      return ''
    }

    const currentConcern = state.concerns?.find(concern => concern.id === state.initiative?.selectedConcernId)
      ?? state.concerns?.slice().sort((left, right) => (right.tension * right.careWeight) - (left.tension * left.careWeight))[0]
      ?? null
    const currentCommitment = state.commitmentLedger?.commitments.find(commitment => commitment.id === state.commitmentLedger?.governingCommitmentId)
      ?? state.commitmentLedger?.commitments[0]
      ?? null
    const currentInquiry = state.inquiryPlanner?.plans.find(plan => plan.id === state.inquiryPlanner?.activePlanId)
      ?? state.inquiryPlanner?.plans[0]
      ?? null

    return [
      '[ALICIZATION_VISUAL_PRESENCE]',
      `Watch mode: ${state.watchMode}.`,
      ...truthContract.lines,
      state.mindTurnFrame
        ? buildMindTurnFrameSystemBlock(state.mindTurnFrame)
        : '',
      `Current scene: ${state.currentScene
        ? JSON.stringify({
            scenario: state.currentScene.scenario,
            workloadKind: state.currentScene.workloadKind,
            contentKind: state.currentScene.contentKind,
            summary: state.currentScene.summary,
            target: state.currentScene.target,
          })
        : 'none'}.`,
      `Attention: ${state.attention
        ? JSON.stringify({
            target: state.attention.target,
            source: state.attention.source,
            confidence: state.attention.confidence,
            dwellMs: state.attention.dwellMs,
          })
        : 'none'}.`,
      `Living thread: ${state.worldModel?.activeThread
        ? sanitizeBriefText([
            state.worldModel.activeThread.kind,
            state.worldModel.activeThread.title,
            state.worldModel.activeThread.summary,
            state.worldModel.activeThread.unresolved ? 'unresolved' : 'settled',
          ].filter(Boolean).join(' | '), 220)
        : 'none'}.`,
      `Concern: ${currentConcern
        ? sanitizeBriefText(`${currentConcern.kind} | ${currentConcern.summary}`, 220)
        : 'none'}.`,
      `Commitment: ${currentCommitment
        ? sanitizeBriefText(`${currentCommitment.kind} | ${currentCommitment.summary}`, 220)
        : 'none'}.`,
      `Inquiry: ${currentInquiry
        ? sanitizeBriefText(`${currentInquiry.kind} | ${currentInquiry.question} | ${currentInquiry.status}`, 220)
        : 'none'}.`,
      `Conversation state: ${state.conversationState
        ? JSON.stringify({
            jointThread: sanitizeBriefText(state.conversationState.jointThread, 160),
            hostMove: sanitizeBriefText(state.conversationState.hostMove, 160),
            continuityPolicy: state.conversationState.continuityPolicy,
            memoryMode: state.conversationState.memoryMode,
            shouldHoldThread: state.conversationState.shouldHoldThread,
            unansweredQuestion: sanitizeBriefText(state.conversationState.unansweredQuestion ?? '', 140) || null,
          })
        : 'none'}.`,
      `Dialogue world thread: ${state.dialogueWorldThread
        ? JSON.stringify({
            activeThread: sanitizeBriefText(state.dialogueWorldThread.activeThread, 160),
            currentQuestion: sanitizeBriefText(state.dialogueWorldThread.currentQuestion ?? '', 140) || null,
            lastOutcome: state.dialogueWorldThread.lastOutcome,
            relationDrift: state.dialogueWorldThread.relationDrift,
            pendingValidation: state.dialogueWorldThread.pendingValidation,
          })
        : 'none'}.`,
      `Reply deliberation: ${state.replyDeliberation
        ? JSON.stringify({
            selectedMotive: state.replyDeliberation.selectedMotive,
            speakingFrom: state.replyDeliberation.speakingFrom,
            memoryMode: state.replyDeliberation.memoryMode,
            openingBeat: sanitizeBriefText(state.replyDeliberation.openingBeat, 160),
            whyThisReplyNow: sanitizeBriefText(state.replyDeliberation.whyThisReplyNow, 160),
          })
        : 'none'}.`,
      `Recall governor: ${state.recallGovernor
        ? JSON.stringify({
            mode: state.recallGovernor.mode,
            suppressAssociativeRecall: state.recallGovernor.suppressAssociativeRecall,
            allowActiveThoughts: state.recallGovernor.allowActiveThoughts,
            allowRecalledFragments: state.recallGovernor.allowRecalledFragments,
            rationale: sanitizeBriefText(state.recallGovernor.rationale, 160),
          })
        : 'none'}.`,
      `Mind kernel: ${state.mindKernel
        ? JSON.stringify({
            dominantMode: state.mindKernel.dominantMode,
            dominantDrive: state.mindKernel.dominantDrive,
            narrative: state.mindKernel.narrative,
          })
        : 'none'}.`,
      `Action ecology: ${state.actionEcology
        ? JSON.stringify({
            mode: state.actionEcology.mode,
            shouldSpeak: state.actionEcology.shouldSpeak,
            why: state.actionEcology.why,
            selectedThreadId: state.actionEcology.selectedThreadId,
          })
        : 'none'}.`,
      `Initiative: ${state.initiative
        ? JSON.stringify({
            selectedAction: state.initiative.selectedAction,
            confidence: state.initiative.confidence,
            why: state.initiative.why,
            preferredStyle: state.initiative.preferredStyle,
            preferredPresence: state.initiative.preferredPresence,
          })
        : 'none'}.`,
      `Answer plan: ${state.answerPlanner
        ? JSON.stringify({
            act: state.answerPlanner.act,
            evidenceMode: state.answerPlanner.evidenceMode,
            governingFocus: state.answerPlanner.governingFocus,
            openingMove: state.answerPlanner.openingMove,
            answerIntent: state.answerPlanner.answerIntent,
            relationshipPosture: state.answerPlanner.relationshipPosture,
            shouldAskForGrounding: state.answerPlanner.shouldAskForGrounding,
            shouldAcknowledgeRepair: state.answerPlanner.shouldAcknowledgeRepair,
          })
        : 'none'}.`,
      `Current conscious frame: ${state.currentConsciousFrame
        ? JSON.stringify({
            subject: state.currentConsciousFrame.subject,
            centerOfGravity: state.currentConsciousFrame.centerOfGravity,
            truthDiscipline: state.currentConsciousFrame.truthDiscipline,
            consciousNeed: sanitizeBriefText(state.currentConsciousFrame.consciousNeed, 160),
            consciousTension: sanitizeBriefText(state.currentConsciousFrame.consciousTension, 160),
            speakingIntention: sanitizeBriefText(state.currentConsciousFrame.speakingIntention, 160),
            focusAnchor: sanitizeBriefText(state.currentConsciousFrame.focusAnchor ?? '', 140) || null,
            shouldWithholdSpecificity: state.currentConsciousFrame.shouldWithholdSpecificity,
            shouldSelfRevise: state.currentConsciousFrame.shouldSelfRevise,
          })
        : 'none'}.`,
      `Claim evidence ledger: ${state.claimEvidenceLedger
        ? JSON.stringify({
            subject: state.claimEvidenceLedger.subject,
            evidenceMode: state.claimEvidenceLedger.evidenceMode,
            observedSurface: sanitizeBriefText(state.claimEvidenceLedger.observedSurface ?? '', 160) || null,
            taskHypothesis: sanitizeBriefText(state.claimEvidenceLedger.taskHypothesis ?? '', 160) || null,
            intentHypothesis: sanitizeBriefText(state.claimEvidenceLedger.intentHypothesis ?? '', 160) || null,
            specificityBudget: state.claimEvidenceLedger.specificityBudget,
            allowedSpecificCues: state.claimEvidenceLedger.allowedSpecificCues,
            shouldLabelHypothesis: state.claimEvidenceLedger.shouldLabelHypothesis,
            forbidUnsupportedSpecificity: state.claimEvidenceLedger.forbidUnsupportedSpecificity,
          })
        : 'none'}.`,
      `Private thought: ${privateThought
        ? JSON.stringify({
            stance: privateThought.stance,
            shouldSpeak: privateThought.shouldSpeak,
            suggestedStyle: privateThought.suggestedStyle,
            embodiedPresence: privateThought.embodiedPresence,
            emotionalTension: privateThought.emotionalTension,
            thoughtText: sanitizeBriefText(privateThought.thoughtText, 180),
            afterglowFromScenario: privateThought.afterglowFromScenario ?? null,
            selectedConcernId: privateThought.selectedConcernId ?? null,
            focusBeliefId: privateThought.focusBeliefId ?? null,
            focusInquiryId: privateThought.focusInquiryId ?? null,
            commitmentId: privateThought.commitmentId ?? null,
            inquiryPlanId: privateThought.inquiryPlanId ?? null,
            hypothesisId: privateThought.hypothesisId ?? null,
            deliberationThreadId: privateThought.deliberationThreadId ?? null,
            runtimeThreadId: privateThought.runtimeThreadId ?? null,
            mindNeed: privateThought.mindNeed ?? null,
            relationshipVector: privateThought.relationshipVector ?? null,
            initiativeAction: privateThought.initiativeAction ?? null,
            leadingGoalId: privateThought.leadingGoalId ?? null,
            desireId: privateThought.desireId ?? null,
          })
        : 'none'}.`,
      'Treat this block as a compact executive digest of the living mind state, not as a giant schema dump.',
      'Mind turn frame is the authoritative reply spine. Supporting blocks exist to justify, refine, or verify that frame.',
      'When grounded screenshot evidence is attached, trust that screenshot first and let this visual presence block act as continuity rather than override.',
    ].join('\n')
  }

  function buildCompactMindTurnControlSystemBlock(input: {
    brief: AlicizationExecutiveAnswerBrief
    charter: AlicizationResponseCharter
    contract: AlicizationResponseSurfaceContract
    governance?: AlicizationMindTurnGovernance | null
    state: AlicizationVisualPresenceStateSnapshot
    inspectionRequested: boolean
    currentForeground?: {
      appName?: string
      processName?: string
      title?: string
    }
  }) {
    return buildDialogueMindFrameSystemBlock({
      governance: input.governance ?? {
        decisionTraceId: 'mind:fallback:controlframe',
        turnMode: input.brief.turnMode,
        truthState: input.brief.truthState,
        personaKernelMode: input.contract.personaKernelMode,
        openingStyle: input.contract.openingStyle,
        relationshipPosture: input.charter.relationshipPosture,
        answerSubject: input.state.dialogueActKernel?.subject ?? 'general',
        screenReferenceMode: input.state.dialogueActKernel?.screenReferenceMode ?? 'incidental',
        answerAct: input.state.dialogueActKernel?.speechAct ?? 'answer',
        repairState: 'none',
        liveSurface: sanitizeBriefText(
          input.state.currentScene?.summary
          ?? input.brief.liveSurface
          ?? describePerceptionTarget(input.currentForeground),
          180,
        ) || null,
        focusAnchor: sanitizeBriefText(
          input.state.dialogueWorldThread?.currentQuestion
          ?? input.state.conversationState?.hostMove
          ?? input.state.currentScene?.summary
          ?? '',
          180,
        ) || null,
        answerIntent: sanitizeBriefText(
          input.state.dialogueWorldThread?.currentQuestion
          ?? input.state.conversationState?.jointThread
          ?? '',
          180,
        ) || null,
        openingMove: sanitizeBriefText(
          input.state.dialogueActKernel?.openingMove
          ?? '',
          180,
        ) || null,
        carriedThread: input.contract.labelCarryAsMemory
          ? sanitizeBriefText(
            input.brief.carriedThread
            ?? '',
            180,
          ) || null
          : null,
        suppressAssociativeRecall: input.contract.suppressAssociativeRecall,
        labelCarryAsMemory: input.contract.labelCarryAsMemory,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: input.contract.maxSentences,
        mindMode: input.state.mindKernel?.dominantMode ?? null,
        embodiedPresence: input.state.privateThought?.embodiedPresence ?? 'none',
        emotionalTension: input.state.privateThought?.emotionalTension,
        dialogueActKernel: input.state.dialogueActKernel ?? null,
        mindTurnFrame: input.state.mindTurnFrame ?? null,
        mustDo: [],
        mustNotDo: [],
      },
      inspectionRequested: input.inspectionRequested,
      currentForeground: input.currentForeground,
    })
  }

  function buildChatInspectionGroundingParts(input: {
    imageDataUrl: string
    candidateSourceName: string
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
      source?: string
    } | null
    perceptionState: AlicizationPerceptionState
    currentForeground?: {
      appName?: string
      processName?: string
      title?: string
    }
    userText: string
    now: number
    staleHistoryRisk?: boolean
  }): CommonContentPart[] {
    const rawAnchor = getActiveAttentionAnchor(input.perceptionState, input.now)
    const anchor = input.staleHistoryRisk && isWeakGenericBrowserPerceptionTarget(rawAnchor)
      ? null
      : rawAnchor
    const recentObservations = input.perceptionState.recentObservations
      .filter(observation => !input.staleHistoryRisk || !isWeakGenericBrowserPerceptionTarget(observation))
      .slice(-2)
      .map(observation => `${formatObservationAge(input.now, observation.observedAt)} | ${describePerceptionTarget(observation)}`)

    return [
      {
        type: 'text',
        text: [
          '[ALICIZATION_VISUAL_GROUNDING]',
          `User request: ${sanitizeBriefText(input.userText, 180) || 'unknown'}`,
          `Capture source: ${sanitizeBriefText(input.candidateSourceName, 120) || 'unknown'}`,
          `Focus target: ${describePerceptionTarget(input.focusTarget)}`,
          `Focus source: ${sanitizeBriefText(input.focusTarget?.source ?? '', 48) || 'none'}`,
          input.staleHistoryRisk
            ? 'Attention anchor: suppressed weak generic browser metadata.'
            : `Attention anchor: ${describePerceptionTarget(anchor)}`,
          `Foreground sample: ${describePerceptionTarget(input.currentForeground)}`,
          `Recent observations: ${recentObservations.length > 0 ? recentObservations.join(' || ') : 'none'}`,
          'Use this screenshot as the primary visual evidence for the current turn.',
          input.staleHistoryRisk
            ? 'This is a generic screen re-check. Treat previous screen descriptions as stale memory; do not repeat old browser pages or old site details unless visible in this screenshot now. A weak browser/app anchor is only metadata, not proof that an old tab, URL, or page is still present. If the screenshot contradicts earlier memory, gently correct yourself and reset to what is visible now.'
            : '',
        ].join('\n'),
      },
      {
        type: 'image_url',
        image_url: {
          url: input.imageDataUrl,
        },
      } as CommonContentPart,
    ]
  }

  async function resolveDesktopCaptureAccess(input: {
    types: Array<'window' | 'screen'>
    thumbnailSize: {
      width: number
      height: number
    }
  }): Promise<DesktopCaptureAccessResult> {
    let permissionStatus: string | undefined
    if (platform === 'darwin') {
      try {
        permissionStatus = systemPreferences.getMediaAccessStatus('screen')
      }
      catch {
        permissionStatus = undefined
      }
    }

    const probePlan = [
      { label: 'primary', types: [...new Set(input.types)] as Array<'window' | 'screen'> },
      ...(input.types.includes('screen') && input.types.length > 1
        ? [{ label: 'retry-screen-only', types: ['screen'] as Array<'window' | 'screen'> }]
        : []),
      ...(input.types.includes('window') && input.types.length > 1
        ? [{ label: 'retry-window-only', types: ['window'] as Array<'window' | 'screen'> }]
        : []),
    ]
    const probeAttempts: NonNullable<DesktopCaptureAccessResult['probeAttempts']> = []
    let recoveredFromRetry = false
    let sawProbeError = false
    let lastProbeError: string | undefined

    for (const attempt of probePlan) {
      try {
        const sources = await desktopCapturer.getSources({
          types: attempt.types,
          fetchWindowIcons: false,
          thumbnailSize: input.thumbnailSize,
        })
        probeAttempts.push({
          label: attempt.label,
          types: attempt.types,
          sourceCount: sources.length,
        })
        if (sources.length > 0) {
          recoveredFromRetry = recoveredFromRetry || attempt.label !== 'primary' || sawProbeError
          return {
            permissionStatus,
            sources,
            recoveredFromRetry,
            probeStrategy: attempt.label,
            probeAttempts,
          }
        }
      }
      catch (error) {
        sawProbeError = true
        lastProbeError = errorMessageFrom(error) ?? 'desktop capture failed'
        probeAttempts.push({
          label: attempt.label,
          types: attempt.types,
          sourceCount: 0,
          error: lastProbeError,
        })
      }
    }

    return {
      permissionStatus,
      sources: [],
      unavailableReason: sawProbeError
        ? 'screen-capture-access-failed'
        : permissionStatus && permissionStatus !== 'granted'
          ? 'screen-capture-permission-denied'
          : 'screen-capture-sources-empty',
      probeError: lastProbeError,
      recoveredFromRetry,
      probeAttempts,
    }
  }

  async function resolveChatVisualGrounding(input: {
    now: number
    userText: string
    cardId: string
    perceptionState: AlicizationPerceptionState
    currentForeground?: {
      appName?: string
      processName?: string
      title?: string
    }
  }) {
    const captureAccess = await resolveDesktopCaptureAccess({
      types: ['window', 'screen'],
      thumbnailSize: { width: 1280, height: 720 },
    })

    if (captureAccess.sources.length === 0) {
      return {
        additionalUserParts: [] as CommonContentPart[],
        auditAction: 'inspection-grounding-skipped',
        auditPayload: {
          reason: captureAccess.unavailableReason ?? 'screen-capture-sources-empty',
          permissionStatus: captureAccess.permissionStatus,
          probeError: captureAccess.probeError,
          probeStrategy: captureAccess.probeStrategy,
          probeAttempts: captureAccess.probeAttempts,
        },
      }
    }

    const anchor = getActiveAttentionAnchor(input.perceptionState, input.now)
    const candidates = rankScreenSemanticCaptureCandidates({
      foregroundWindow: input.currentForeground,
      attentionAnchor: anchor,
      recentObservations: input.perceptionState.recentObservations,
      hintTerms: extractInspectionHintTerms(input.userText),
      avoidSourcePattern: /\b(?:alicization|codex)\b/i,
      sources: captureAccess.sources,
    })
    const candidate = candidates[0] ?? null
    if (!candidate) {
      return {
        additionalUserParts: [] as CommonContentPart[],
        auditAction: 'inspection-grounding-skipped',
        auditPayload: {
          reason: 'candidate-not-found',
          attentionAnchor: describePerceptionTarget(anchor),
          permissionStatus: captureAccess.permissionStatus,
        },
      }
    }
    const candidateAttempts: Array<{
      source: string
      id: string
      strategy: AlicizationPerceptionSceneResidue['captureStrategy']
      thumbnailReady: boolean
    }> = []
    let resolvedCandidate = candidate
    let imageDataUrl = ''

    for (const rankedCandidate of candidates) {
      const candidateImageDataUrl = buildCompressedNativeImageDataUrl({
        image: rankedCandidate.source.thumbnail,
        maxWidth: inspectionGroundingImageMaxWidth,
        maxHeight: inspectionGroundingImageMaxHeight,
        jpegQuality: inspectionGroundingImageJpegQuality,
      })
      candidateAttempts.push({
        source: rankedCandidate.source.name,
        id: rankedCandidate.source.id,
        strategy: rankedCandidate.strategy,
        thumbnailReady: Boolean(candidateImageDataUrl),
      })
      if (!candidateImageDataUrl)
        continue
      resolvedCandidate = rankedCandidate
      imageDataUrl = candidateImageDataUrl
      break
    }

    if (!imageDataUrl) {
      return {
        additionalUserParts: [] as CommonContentPart[],
        auditAction: 'inspection-grounding-skipped',
        auditPayload: {
          reason: 'thumbnail-empty',
          candidateSource: candidate.source.name,
          captureSource: candidate.source.name,
          focusTarget: describePerceptionTarget(candidate.focusTarget),
          permissionStatus: captureAccess.permissionStatus,
          candidateAttempts,
        },
      }
    }

    const staleHistoryRisk = isWeakGenericBrowserFocusTarget({
      focusTarget: resolvedCandidate.focusTarget,
      captureStrategy: resolvedCandidate.strategy,
      userText: input.userText,
    })
    const effectiveFocusTarget = staleHistoryRisk
      ? null
      : resolvedCandidate.focusTarget

    const rawObservationTarget = staleHistoryRisk
      ? null
      : effectiveFocusTarget
        ? {
            appName: effectiveFocusTarget?.appName ?? anchor?.appName ?? input.currentForeground?.appName,
            processName: effectiveFocusTarget?.processName ?? anchor?.processName ?? input.currentForeground?.processName,
            title: effectiveFocusTarget?.title ?? anchor?.title ?? input.currentForeground?.title ?? resolvedCandidate.source.name,
          }
        : {
            appName: anchor?.appName ?? input.currentForeground?.appName,
            processName: anchor?.processName ?? input.currentForeground?.processName,
            title: resolvedCandidate.source.name || anchor?.title || input.currentForeground?.title,
          }
    const weakScreenFallbackObservation = Boolean(
      rawObservationTarget
      && resolvedCandidate.strategy === 'screen-fallback'
      && isWeakAlicizationScreenSurfaceCue(resolvedCandidate.source.name)
      && isWeakAlicizationScreenSurfaceTarget(rawObservationTarget),
    )
    const groundedObservationTarget = weakScreenFallbackObservation
      ? null
      : rawObservationTarget
    const semanticResult = await generateScreenSemanticSummaryFromImage({
      cardId: input.cardId,
      now: input.now,
      imageDataUrl,
      foregroundWindow: input.currentForeground,
      source: {
        id: resolvedCandidate.source.id,
        name: resolvedCandidate.source.name,
        strategy: resolvedCandidate.strategy,
      },
      focusTarget: effectiveFocusTarget,
    })
    const screenSemanticSummary = semanticResult.summary
    const shouldSkipWeakFallbackResidue = Boolean(
      !screenSemanticSummary
      && resolvedCandidate.strategy === 'screen-fallback'
      && isWeakAlicizationScreenSurfaceCue(resolvedCandidate.source.name)
      && isWeakAlicizationScreenSurfaceTarget(effectiveFocusTarget ?? rawObservationTarget),
    )
    const sceneResidue = screenSemanticSummary
      ? buildScreenSemanticSceneResidue({
          now: input.now,
          summary: screenSemanticSummary,
          focusTarget: effectiveFocusTarget,
        })
      : shouldSkipWeakFallbackResidue
        ? null
        : buildInspectionSceneResidue({
            now: input.now,
            userText: input.userText,
            focusTarget: effectiveFocusTarget,
            captureSourceName: resolvedCandidate.source.name,
            captureStrategy: resolvedCandidate.strategy,
          })

    return {
      additionalUserParts: buildChatInspectionGroundingParts({
        imageDataUrl,
        candidateSourceName: resolvedCandidate.source.name,
        focusTarget: effectiveFocusTarget,
        perceptionState: input.perceptionState,
        currentForeground: input.currentForeground,
        userText: input.userText,
        now: input.now,
        staleHistoryRisk,
      }),
      observationTarget: groundedObservationTarget ?? undefined,
      sceneResidue,
      screenSemanticSummary,
      auditAction: 'inspection-grounded',
      auditPayload: {
        candidateSource: candidate.source.name,
        captureSource: resolvedCandidate.source.name,
        candidateId: candidate.source.id,
        captureId: resolvedCandidate.source.id,
        strategy: resolvedCandidate.strategy,
        focusTarget: describePerceptionTarget(effectiveFocusTarget),
        focusSource: effectiveFocusTarget?.source ?? 'none',
        focusSuppressed: staleHistoryRisk ? 'weak-generic-browser-screen-fallback' : null,
        observationTargetSuppressed: weakScreenFallbackObservation ? 'weak-screen-shell-fallback' : null,
        attentionAnchor: describePerceptionTarget(anchor),
        permissionStatus: captureAccess.permissionStatus,
        probeStrategy: captureAccess.probeStrategy,
        probeAttempts: captureAccess.probeAttempts,
        imageDataChars: imageDataUrl.length,
        permissionProbeMismatch: Boolean(captureAccess.permissionStatus && captureAccess.permissionStatus !== 'granted'),
        captureRecoveredFromRetry: Boolean(captureAccess.recoveredFromRetry),
        candidateAttempts,
        screenSemanticSummary: screenSemanticSummary
          ? {
              workload: screenSemanticSummary.workload,
              content: screenSemanticSummary.content,
            }
          : null,
        screenSemanticUnavailableReason: screenSemanticSummary
          ? null
          : semanticResult.unavailableReason,
      },
    }
  }

  async function augmentMainChatMessagesWithPerception(input: {
    cardId: string
    userText: string
    messages: Message[]
  }) {
    if (isInternalAlicizationRepairPrompt(input.userText)) {
      return {
        messages: input.messages,
        systemBlocks: [] as string[],
        promptSystemBlocks: [] as string[],
        memoryRecallSeed: '',
        recallGovernor: null as AlicizationRecallGovernorSnapshot | null,
        chatGovernance: {
          suppressAssociativeRecall: false,
          turnMode: 'answer' as const,
          personaKernelMode: 'full' as const,
          mindTurnGovernance: null,
        },
      }
    }

    const now = Date.now()
    let perceptionState = await ensurePerceptionState(input.cardId)
    let visualPresenceState = await ensureVisualPresenceState(input.cardId)
    const sensorySnapshot = sensoryBus.getSnapshot()
    if (sensorySnapshot?.sample?.foregroundWindow) {
      perceptionState = await rememberPerceptionObservation({
        cardId: input.cardId,
        now: Number(sensorySnapshot.sample.collectedAt || now),
        target: sensorySnapshot.sample.foregroundWindow,
        source: 'sensory-snapshot',
      })
    }

    const inspectionIntent = resolveInspectionIntentForChatTurn({
      now,
      userText: input.userText,
      messages: input.messages,
      perceptionState,
      visualPresenceState,
      currentForeground: sensorySnapshot?.sample?.foregroundWindow,
    })
    if (!inspectionIntent.active && inspectionIntent.releaseCarry) {
      perceptionState = releaseInvitedInspection({
        state: perceptionState,
        now,
        clearSceneResidue: true,
      })
      await persistPerceptionState(input.cardId, perceptionState)
    }
    const genericScreenInspection = inspectionIntent.active && isGenericScreenInspectionRequest(input.userText)
    let currentForeground = sensorySnapshot?.sample?.foregroundWindow
    if (inspectionIntent.active) {
      const interruptionContext = await sampleSubconsciousInterruptionContext().catch(() => null)
      currentForeground = resolveForegroundDecisionTarget({
        snapshotForeground: currentForeground,
        probedForeground: interruptionContext?.foregroundWindow,
        attentionAnchor: getActiveAttentionAnchor(perceptionState, now),
        hintTerms: extractInspectionHintTerms(input.userText),
        allowAttentionAnchorFallback: true,
      }) ?? currentForeground
      if (currentForeground) {
        perceptionState = await rememberPerceptionObservation({
          cardId: input.cardId,
          now,
          target: currentForeground,
          source: 'chat-start',
        })
      }
      perceptionState = activateInvitedInspection({
        state: perceptionState,
        now,
        hintText: input.userText,
      })
      await persistPerceptionState(input.cardId, perceptionState)
    }

    let messages = input.messages
    let chatScreenSemanticSummary: AlicizationScreenSemanticSummary | null = null
    let auditAction = inspectionIntent.active ? 'inspection-grounding-skipped' : 'perception-context-prepared'
    let auditPayload: Record<string, unknown> = {
      inspectionRequested: inspectionIntent.active,
      inspectionState: inspectionIntent.inspectionState,
      inspectionIntentConfidence: inspectionIntent.confidence,
      inspectionIntentReasonCodes: inspectionIntent.reasonCodes,
      inspectionCarryReleased: inspectionIntent.releaseCarry,
      owner_before: inspectionIntent.ownershipTransition?.ownerBefore ?? null,
      owner_after: inspectionIntent.ownershipTransition?.ownerAfter ?? null,
      screen_mode_before: inspectionIntent.ownershipTransition?.screenModeBefore ?? null,
      screen_mode_after: inspectionIntent.ownershipTransition?.screenModeAfter ?? null,
      inspection_state_before: inspectionIntent.ownershipTransition?.inspectionStateBefore ?? null,
      inspection_state_after: inspectionIntent.ownershipTransition?.inspectionStateAfter ?? null,
      release_cause: inspectionIntent.ownershipTransition?.releaseCause ?? null,
      inspectionGroundingGate: inspectionIntent.groundingGate
        ? {
            inspectionRequested: inspectionIntent.groundingGate.inspectionRequested,
            inspectionState: inspectionIntent.groundingGate.inspectionState,
            releaseCarry: inspectionIntent.groundingGate.releaseCarry,
            confidence: inspectionIntent.groundingGate.confidence,
            reasonTags: inspectionIntent.groundingGate.reasonTags,
          }
        : null,
      turnOwnershipHint: inspectionIntent.turnOwnershipHint
        ? {
            subject: inspectionIntent.turnOwnershipHint.subject,
            screenReferenceMode: inspectionIntent.turnOwnershipHint.screenReferenceMode,
            confidence: inspectionIntent.turnOwnershipHint.confidence,
            reasonTags: inspectionIntent.turnOwnershipHint.reasonTags,
          }
        : null,
      turnIngress: inspectionIntent.ingress
        ? {
            owner: inspectionIntent.ingress.turnOwner,
            inspectionEligible: inspectionIntent.ingress.inspectionEligible,
            screenReferenceMode: inspectionIntent.ingress.screenReferenceMode,
            confidence: inspectionIntent.ingress.confidence,
            reasonTags: inspectionIntent.ingress.reasonTags,
            summary: inspectionIntent.ingress.summary,
          }
        : null,
      attentionAnchor: describePerceptionTarget(getActiveAttentionAnchor(perceptionState, now)),
    }

    const latestUserMessage = [...messages].reverse().find(message => message.role === 'user')
    const latestUserHasImage = hasImageTransportContent(latestUserMessage?.content)
    if (inspectionIntent.active && !latestUserHasImage) {
      const grounding = await resolveChatVisualGrounding({
        now,
        userText: input.userText,
        cardId: input.cardId,
        perceptionState,
        currentForeground,
      })
      if (grounding.additionalUserParts.length > 0)
        messages = appendContentPartsToLatestUserMessage(messages, grounding.additionalUserParts)
      if (grounding.observationTarget) {
        currentForeground = grounding.observationTarget
        perceptionState = await rememberPerceptionObservation({
          cardId: input.cardId,
          now,
          target: grounding.observationTarget,
          source: 'chat-start',
        })
      }
      if (grounding.sceneResidue) {
        perceptionState = await rememberSceneResidue({
          cardId: input.cardId,
          now,
          residue: grounding.sceneResidue,
        })
      }
      if (grounding.screenSemanticSummary)
        chatScreenSemanticSummary = grounding.screenSemanticSummary
      auditAction = grounding.auditAction
      auditPayload = {
        ...auditPayload,
        ...grounding.auditPayload,
      }
      if (grounding.additionalUserParts.length === 0 && shouldSuppressWeakGenericBrowserInspectionAnchor({
        now,
        userText: input.userText,
        state: perceptionState,
        currentForeground,
        groundingUnavailableReason: typeof grounding.auditPayload.reason === 'string' ? grounding.auditPayload.reason : undefined,
      })) {
        perceptionState = purgeWeakGenericBrowserInspectionState({
          now,
          state: perceptionState,
        })
        await persistPerceptionState(input.cardId, perceptionState)
      }
    }
    else if (inspectionIntent.active && latestUserHasImage) {
      auditAction = 'inspection-grounding-skipped'
      auditPayload = {
        ...auditPayload,
        reason: 'user-already-attached-image',
      }
    }

    const proactiveState = await ensureProactiveLoopState(input.cardId)
    const lateNightActiveMinutes = proactiveState.lateNightActivityStartedAt
      ? Math.max(0, (now - proactiveState.lateNightActivityStartedAt) / 60_000)
      : 0
    const subconsciousState = await ensureSubconsciousState(input.cardId)
    const soulForPerception = soulSnapshot ?? await bootstrap()
    const reminderBacklog = (await alicizationDb.listPendingScheduledTasks(16).catch(() => [])).length
    const chatLayeredContext = buildProactiveLayeredContext({
      now,
      probeSample: sensorySnapshot?.sample,
      interruptionContext: {
        idleSeconds: null,
        inputActivity: 'unknown',
        fullscreenLikely: false,
        foregroundWindow: currentForeground,
        degraded: [],
      },
      subconsciousState,
      hostAttitude: soulForPerception.frontmatter.host_attitude,
      reminderBacklog,
      lateNightActiveMinutes,
      recentProactiveOutcomes: proactiveState.recentOutcomes,
      screenSemanticSummary: chatScreenSemanticSummary,
    })
    const chatScenario = inferScenarioFromContext({
      workload: chatLayeredContext.workload.kind,
      content: chatLayeredContext.content.kind,
      lateNight: chatLayeredContext.localTime.isLateNight,
      lateNightActiveMinutes: chatLayeredContext.relationship.lateNightActiveMinutes,
      fatigue: chatLayeredContext.relationship.fatigue,
    })
    const groundedResidue = getActivePerceptionSceneResidue(perceptionState, now)
    const useResidueAsLiveSceneSummary = shouldUsePerceptionResidueAsLiveSceneSummary({
      residue: groundedResidue,
      currentForeground,
      inspectionRequested: inspectionIntent.active,
      groundedThisTurn: auditAction === 'inspection-grounded',
    })
    const groundingContinuity = resolveInspectionGroundingContinuity({
      now,
      auditAction,
      auditReason: typeof auditPayload.reason === 'string' ? auditPayload.reason : undefined,
      residue: groundedResidue,
      currentForeground,
      useResidueAsLiveSceneSummary,
    })
    const groundedThisTurn = groundingContinuity.groundedThisTurn
    const chatHeartbeat = buildVisualHeartbeat({
      now,
      scenario: chatScenario,
      previousState: visualPresenceState,
      context: chatLayeredContext,
      invitedInspectionActive: inspectionIntent.active,
      groundedSummary: useResidueAsLiveSceneSummary ? groundedResidue?.summary ?? null : null,
      screenSemanticSummaryActive: groundedThisTurn && useResidueAsLiveSceneSummary,
      durabilityPulse: null,
    })
    const chatAttention = updateVisualAttentionModel({
      now,
      scenario: chatScenario,
      previousAttention: visualPresenceState.attention,
      currentForeground,
      currentScene: chatHeartbeat.scene,
      invitedInspectionActive: inspectionIntent.active,
      perceptionAnchor: getActiveAttentionAnchor(perceptionState, now)
        ?? perceptionState.lastNonSelfForegroundTarget
        ?? null,
      durabilityPulse: null,
    })
    const chatMindState = await buildDigitalLifeMindState({
      cardId: input.cardId,
      now,
      context: chatLayeredContext,
      userText: input.userText,
      recentMessages: input.messages,
      previousVisualPresenceState: visualPresenceState,
      visualHeartbeat: chatHeartbeat,
      attention: chatAttention,
      currentForeground,
      perceptionState,
      durabilityPulse: null,
      inspectionRequested: inspectionIntent.active,
      inspectionState: inspectionIntent.inspectionState,
      turnOwnershipHint: inspectionIntent.turnOwnershipHint,
      groundedThisTurn,
      cognitionMode: 'interactive',
    })
    visualPresenceState = updateVisualPresenceState({
      now,
      previousState: visualPresenceState,
      watchMode: chatHeartbeat.watchMode,
      scene: chatHeartbeat.scene,
      attention: chatAttention,
      mindTurnFrame: chatMindState.mindTurnFrame,
      worldModel: chatMindState.worldModel,
      worldOntology: chatMindState.worldOntology,
      beliefLedger: chatMindState.beliefLedger,
      beliefRevision: chatMindState.beliefRevision,
      hypothesisGraph: chatMindState.hypothesisGraph,
      entityWorld: chatMindState.entityWorld,
      livingWorldState: chatMindState.livingWorldState,
      subjectiveInference: chatMindState.subjectiveInference,
      appraisal: chatMindState.appraisal,
      goalStack: chatMindState.goalStack,
      concerns: chatMindState.concerns,
      concernContinuity: chatMindState.concernContinuity,
      relationshipModel: chatMindState.relationshipModel,
      selfContinuity: chatMindState.selfContinuity,
      selfState: chatMindState.selfState,
      selfGovernor: chatMindState.selfGovernor,
      inquiryLoop: chatMindState.inquiryLoop,
      deliberationState: chatMindState.deliberationState,
      threadRuntime: chatMindState.threadRuntime,
      commitmentLedger: chatMindState.commitmentLedger,
      inquiryPlanner: chatMindState.inquiryPlanner,
      repairLedger: chatMindState.repairLedger,
      intentionStream: chatMindState.intentionStream,
      reflectionLedger: chatMindState.reflectionLedger,
      executiveCycle: chatMindState.executiveCycle,
      mindDynamics: chatMindState.mindDynamics,
      mindKernel: chatMindState.mindKernel,
      thoughtThreads: chatMindState.thoughtThreads,
      counterfactualDeliberation: chatMindState.counterfactualDeliberation,
      actionEcology: chatMindState.actionEcology,
      initiativeArbitration: chatMindState.initiativeArbitration,
      initiative: chatMindState.initiative,
      desireMemory: chatMindState.desireMemory,
      discourseState: chatMindState.discourseState,
      dialogueEncounter: chatMindState.dialogueEncounter ?? null,
      mindSynthesis: chatMindState.mindSynthesis,
      conversationState: chatMindState.conversationState,
      dialogueWorldThread: chatMindState.dialogueWorldThread,
      dialogueActKernel: chatMindState.dialogueActKernel,
      answerCompiler: chatMindState.answerCompiler,
      currentConsciousFrame: chatMindState.currentConsciousFrame ?? null,
      claimEvidenceLedger: chatMindState.claimEvidenceLedger ?? null,
      replyDeliberation: chatMindState.replyDeliberation,
      recallGovernor: chatMindState.recallGovernor,
      answerPlanner: chatMindState.answerPlanner,
      privateThought: chatMindState.privateThought,
      captureState: {
        permission: auditAction === 'inspection-grounded'
          ? 'granted'
          : typeof auditPayload.reason === 'string' && auditPayload.reason === 'screen-capture-permission-denied'
            ? 'denied'
            : visualPresenceState.captureState.permission,
        lastGroundedAt: auditAction === 'inspection-grounded'
          ? now
          : visualPresenceState.captureState.lastGroundedAt,
        sourceName: typeof auditPayload.captureSource === 'string'
          ? auditPayload.captureSource
          : visualPresenceState.captureState.sourceName,
        degradedReason: typeof auditPayload.reason === 'string'
          ? auditPayload.reason
          : visualPresenceState.captureState.degradedReason,
      },
      durabilityPulse: null,
      recentTransition: chatHeartbeat.recentTransition,
      nextSuggestedProbeMs: chatHeartbeat.nextSuggestedProbeMs,
    })
    const responseCharter = buildAlicizationResponseCharter({
      context: chatLayeredContext,
      state: visualPresenceState,
      inspectionRequested: inspectionIntent.active,
      dialogueActKernel: chatMindState.dialogueActKernel ?? undefined,
      dialogueEncounter: chatMindState.dialogueEncounter ?? undefined,
      dialogueSemantics: chatMindState.dialogueSemantics ?? undefined,
      dialogueObligation: chatMindState.dialogueObligation ?? undefined,
      dialogueFocus: chatMindState.dialogueFocus ?? undefined,
      discourseState: chatMindState.discourseState ?? undefined,
      mindSynthesis: chatMindState.mindSynthesis ?? undefined,
      answerCompiler: chatMindState.answerCompiler ?? undefined,
      currentConsciousFrame: chatMindState.currentConsciousFrame ?? undefined,
      claimEvidenceLedger: chatMindState.claimEvidenceLedger ?? undefined,
    })
    const executiveAnswerBrief = buildAlicizationExecutiveAnswerBrief({
      now,
      inspectionRequested: inspectionIntent.active,
      groundedThisTurn,
      currentForeground,
      perceptionState,
      visualPresenceState,
      responseCharter,
      dialogueEncounter: chatMindState.dialogueEncounter ?? undefined,
      dialogueSemantics: chatMindState.dialogueSemantics ?? undefined,
      dialogueObligation: chatMindState.dialogueObligation ?? undefined,
      dialogueFocus: chatMindState.dialogueFocus ?? undefined,
      discourseState: chatMindState.discourseState ?? undefined,
      mindSynthesis: chatMindState.mindSynthesis ?? undefined,
      answerCompiler: chatMindState.answerCompiler ?? undefined,
      claimEvidenceLedger: chatMindState.claimEvidenceLedger ?? undefined,
    })
    const responseSurfaceContract = buildAlicizationResponseSurfaceContract({
      brief: executiveAnswerBrief.brief,
      charter: responseCharter,
      dialogueActKernel: chatMindState.dialogueActKernel ?? undefined,
      dialogueEncounter: chatMindState.dialogueEncounter ?? undefined,
      dialogueSemantics: chatMindState.dialogueSemantics ?? undefined,
      dialogueObligation: chatMindState.dialogueObligation ?? undefined,
      dialogueFocus: chatMindState.dialogueFocus ?? undefined,
      answerCompiler: chatMindState.answerCompiler ?? undefined,
      claimEvidenceLedger: chatMindState.claimEvidenceLedger ?? undefined,
    })
    const compactedMessages = executiveAnswerBrief.brief.shouldCompactHistory
      ? compactMindGovernedChatMessages({
          messages,
          keepRecentUserTurns: executiveAnswerBrief.brief.maxRecentUserTurns,
        })
      : {
          messages,
          beforeCount: messages.length,
          afterCount: messages.length,
        }
    messages = compactedMessages.messages
    await persistVisualPresenceState(input.cardId, visualPresenceState)
    const mindTurnGovernance = buildAlicizationMindTurnGovernance({
      brief: executiveAnswerBrief.brief,
      charter: responseCharter,
      surfaceContract: responseSurfaceContract.contract,
      mindTurnFrame: visualPresenceState.mindTurnFrame,
      kernel: visualPresenceState.dialogueActKernel,
      discourseState: visualPresenceState.discourseState,
      conversationState: visualPresenceState.conversationState,
      dialogueWorldThread: visualPresenceState.dialogueWorldThread,
      answerCompiler: visualPresenceState.answerCompiler,
      answerPlanner: visualPresenceState.answerPlanner,
      replyDeliberation: visualPresenceState.replyDeliberation,
      recallGovernor: visualPresenceState.recallGovernor,
      claimEvidenceLedger: visualPresenceState.claimEvidenceLedger,
      privateThought: visualPresenceState.privateThought,
      mindMode: visualPresenceState.mindKernel?.dominantMode ?? null,
      dialogueEncounter: chatMindState.dialogueEncounter ?? undefined,
      dialogueFocus: chatMindState.dialogueFocus ?? undefined,
      groundedThisTurn,
    })

    const systemBlocks = [
      visualPresenceState.dialogueActKernel
        ? buildDialogueActKernelSystemBlock(visualPresenceState.dialogueActKernel)
        : '',
      visualPresenceState.discourseState
        ? buildDiscourseStateSystemBlock(visualPresenceState.discourseState)
        : '',
      visualPresenceState.mindSynthesis
        ? buildMindSynthesisSystemBlock(visualPresenceState.mindSynthesis)
        : '',
      visualPresenceState.conversationState
        ? buildConversationStateSystemBlock(visualPresenceState.conversationState)
        : '',
      visualPresenceState.dialogueWorldThread
        ? buildDialogueWorldThreadSystemBlock(visualPresenceState.dialogueWorldThread)
        : '',
      visualPresenceState.answerCompiler
        ? buildAnswerCompilerSystemBlock(visualPresenceState.answerCompiler)
        : '',
      visualPresenceState.currentConsciousFrame
        ? buildCurrentConsciousFrameSystemBlock(visualPresenceState.currentConsciousFrame)
        : '',
      visualPresenceState.claimEvidenceLedger
        ? buildClaimEvidenceLedgerSystemBlock(visualPresenceState.claimEvidenceLedger)
        : '',
      visualPresenceState.replyDeliberation
        ? buildReplyDeliberationSystemBlock(visualPresenceState.replyDeliberation)
        : '',
      visualPresenceState.recallGovernor
        ? buildRecallGovernorSystemBlock(visualPresenceState.recallGovernor)
        : '',
      visualPresenceState.answerPlanner
        ? buildAlicizationAnswerPlannerSystemBlock(visualPresenceState.answerPlanner)
        : '',
      chatMindState.dialogueEncounter
        ? buildDialogueTurnEncounterSystemBlock(chatMindState.dialogueEncounter)
        : '',
      chatMindState.dialogueSemantics && chatMindState.dialogueObligation
        ? buildAlicizationDialogueObligationSystemBlock({
            semantics: chatMindState.dialogueSemantics,
            obligation: chatMindState.dialogueObligation,
          })
        : '',
      chatMindState.dialogueFocus
        ? buildDialogueFocusGovernanceSystemBlock(chatMindState.dialogueFocus)
        : '',
      executiveAnswerBrief.systemBlock,
      responseSurfaceContract.systemBlock,
      buildAlicizationResponseCharterSystemBlock(responseCharter),
      buildChatPerceptionSystemBlock({
        now,
        state: perceptionState,
        inspectionRequested: inspectionIntent.active,
        currentForeground,
        suppressWeakGenericBrowserAnchor: genericScreenInspection || (inspectionIntent.active && shouldSuppressWeakGenericBrowserInspectionAnchor({
          now,
          userText: input.userText,
          state: perceptionState,
          currentForeground,
          groundingUnavailableReason: typeof auditPayload.reason === 'string' ? auditPayload.reason : undefined,
        })),
      }),
      inspectionIntent.active
        ? buildChatInspectionContractSystemBlock({
            now,
            state: perceptionState,
            mode: auditAction === 'inspection-grounded' ? 'grounded-screenshot' : 'perception-only',
            permissionStatus: typeof auditPayload.permissionStatus === 'string' ? auditPayload.permissionStatus : undefined,
            unavailableReason: typeof auditPayload.reason === 'string' ? auditPayload.reason : undefined,
            suppressWeakGenericBrowserAnchor: genericScreenInspection || shouldSuppressWeakGenericBrowserInspectionAnchor({
              now,
              userText: input.userText,
              state: perceptionState,
              currentForeground,
              groundingUnavailableReason: typeof auditPayload.reason === 'string' ? auditPayload.reason : undefined,
            }),
          })
        : '',
      buildChatVisualPresenceSystemBlock(visualPresenceState),
    ].filter(Boolean)
    const promptSystemBlocks = [
      buildCompactMindTurnControlSystemBlock({
        brief: executiveAnswerBrief.brief,
        charter: responseCharter,
        contract: responseSurfaceContract.contract,
        governance: mindTurnGovernance,
        state: visualPresenceState,
        inspectionRequested: inspectionIntent.active,
        currentForeground,
      }),
      buildChatPerceptionSystemBlock({
        now,
        state: perceptionState,
        inspectionRequested: inspectionIntent.active,
        currentForeground,
        suppressWeakGenericBrowserAnchor: genericScreenInspection || (inspectionIntent.active && shouldSuppressWeakGenericBrowserInspectionAnchor({
          now,
          userText: input.userText,
          state: perceptionState,
          currentForeground,
          groundingUnavailableReason: typeof auditPayload.reason === 'string' ? auditPayload.reason : undefined,
        })),
      }),
      inspectionIntent.active
        ? buildChatInspectionContractSystemBlock({
            now,
            state: perceptionState,
            mode: auditAction === 'inspection-grounded' ? 'grounded-screenshot' : 'perception-only',
            permissionStatus: typeof auditPayload.permissionStatus === 'string' ? auditPayload.permissionStatus : undefined,
            unavailableReason: typeof auditPayload.reason === 'string' ? auditPayload.reason : undefined,
            suppressWeakGenericBrowserAnchor: genericScreenInspection || shouldSuppressWeakGenericBrowserInspectionAnchor({
              now,
              userText: input.userText,
              state: perceptionState,
              currentForeground,
              groundingUnavailableReason: typeof auditPayload.reason === 'string' ? auditPayload.reason : undefined,
            }),
          })
        : '',
    ].filter(Boolean)

    if (inspectionIntent.active || systemBlocks.length > 0) {
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.perception',
        action: auditAction,
        message: inspectionIntent.active
          ? 'Prepared invited inspection context for the current chat turn.'
          : 'Prepared Alicization short-lived perception context for the current chat turn.',
        payload: {
          ...auditPayload,
          groundingContinuity: {
            groundedThisTurn,
            source: groundingContinuity.source,
            overlapScore: groundingContinuity.overlapScore,
          },
          executiveBrief: {
            turnMode: executiveAnswerBrief.brief.turnMode,
            truthState: executiveAnswerBrief.brief.truthState,
            liveSurface: executiveAnswerBrief.brief.liveSurface,
            carriedThread: executiveAnswerBrief.brief.carriedThread,
            separateCarryFromSurface: executiveAnswerBrief.brief.separateCarryFromSurface,
            shouldCompactHistory: executiveAnswerBrief.brief.shouldCompactHistory,
            maxRecentUserTurns: executiveAnswerBrief.brief.maxRecentUserTurns,
          },
          responseSurface: {
            openingStyle: responseSurfaceContract.contract.openingStyle,
            maxParagraphs: responseSurfaceContract.contract.maxParagraphs,
            maxSentences: responseSurfaceContract.contract.maxSentences,
            suppressAssociativeRecall: responseSurfaceContract.contract.suppressAssociativeRecall,
          },
          historyCompaction: {
            beforeCount: compactedMessages.beforeCount,
            afterCount: compactedMessages.afterCount,
          },
          visualPresence: {
            watchMode: visualPresenceState.watchMode,
            currentScene: visualPresenceState.currentScene,
            mindTurnFrame: visualPresenceState.mindTurnFrame,
            discourseState: visualPresenceState.discourseState,
            mindSynthesis: visualPresenceState.mindSynthesis,
            conversationState: visualPresenceState.conversationState,
            dialogueWorldThread: visualPresenceState.dialogueWorldThread,
            dialogueActKernel: visualPresenceState.dialogueActKernel,
            answerCompiler: visualPresenceState.answerCompiler,
            replyDeliberation: visualPresenceState.replyDeliberation,
            recallGovernor: visualPresenceState.recallGovernor,
            hypothesisGraph: visualPresenceState.hypothesisGraph,
            threadRuntime: visualPresenceState.threadRuntime,
            privateThought: visualPresenceState.privateThought,
          },
          dialogueSemantics: chatMindState.dialogueSemantics,
          dialogueObligation: chatMindState.dialogueObligation,
          dialogueFocus: chatMindState.dialogueFocus,
        },
      }, input.cardId)
    }

    return {
      messages,
      systemBlocks,
      promptSystemBlocks,
      memoryRecallSeed: [
        visualPresenceState.recallGovernor?.recallSeed,
        buildMindContinuityRecallSeed(visualPresenceState),
      ].filter(Boolean).join(' | '),
      recallGovernor: visualPresenceState.recallGovernor,
      chatGovernance: {
        suppressAssociativeRecall: responseSurfaceContract.contract.suppressAssociativeRecall,
        turnMode: executiveAnswerBrief.brief.turnMode,
        personaKernelMode: responseSurfaceContract.contract.personaKernelMode,
        mindTurnGovernance,
      },
    }
  }

  function buildProactiveRecallSeed(input: {
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    phantomSeed?: string
  }) {
    return [
      normalizeOrganicRecallText(input.foregroundWindow?.appName ?? ''),
      normalizeOrganicRecallText(input.foregroundWindow?.processName ?? ''),
      normalizeOrganicRecallText(input.foregroundWindow?.title ?? ''),
      normalizeOrganicRecallText(input.phantomSeed ?? ''),
    ].filter(Boolean).join(' | ')
  }

  function buildOrganicMemorySystemBlocks(context: OrganicMemoryPromptContext) {
    const blocks: string[] = []
    if (context.hostAttitude) {
      blocks.push([
        '[ALICIZATION_HOST_ATTITUDE]',
        `当前关系态度：${context.hostAttitude}`,
      ].join('\n'))
    }

    if (context.coreIncarnation) {
      blocks.push([
        '[ALICIZATION_CORE_INCARNATION]',
        '这是你当前的摇光心意。它是你理解宿主、理解自己、理解关系的灵魂基底。',
        context.coreIncarnation,
      ].join('\n'))
    }

    if (context.activeThoughts.length > 0) {
      blocks.push([
        '[ALICIZATION_ACTIVE_THOUGHTS]',
        'These are background continuity residues. Reuse them only when they truly match the current living focus.',
        'They are unresolved threads, not speech-style instructions.',
        '以下是你最近仍在持续关注的活跃思绪：',
        ...context.activeThoughts.map(item => `- ${item.text}`),
      ].join('\n'))
    }

    if (context.recalledFragments.length > 0) {
      blocks.push([
        '[ALICIZATION_ASSOCIATIVE_RECALL]',
        'These recalled fragments are secondary to the present scene and must never override fresh grounding.',
        ...context.recalledFragments.map(item => `[触景生情：你隐约回想起了过去的某件事 -> ${JSON.stringify({
          sourceKind: item.sourceKind,
          text: item.text,
        })}]`),
      ].join('\n'))
    }

    if (context.relationshipDynamics) {
      const relationshipDynamics = context.relationshipDynamics
      const signedDelta = (value: number) => {
        const normalized = Number.isFinite(value) ? value : 0
        return `${normalized >= 0 ? '+' : ''}${normalized.toFixed(2)}`
      }
      blocks.push([
        '[ALICIZATION_RELATIONSHIP_DYNAMICS]',
        '这是你最近一次关系动态代谢快照，优先用于保持关系连续性，不可覆盖当前轮次事实边界。',
        `当前关系态势：${relationshipDynamics.hostAttitude}`,
        relationshipDynamics.previousHostAttitude
          ? `上一关系态势：${relationshipDynamics.previousHostAttitude}`
          : '上一关系态势：无',
        `人格漂移：obedience ${signedDelta(relationshipDynamics.obedienceDelta)}, liveliness ${signedDelta(relationshipDynamics.livelinessDelta)}, sensibility ${signedDelta(relationshipDynamics.sensibilityDelta)}`,
        `来源：${relationshipDynamics.source}`,
      ].join('\n'))
    }

    return blocks
  }

  function tuneOrganicMemoryPromptContextForExecutiveTurn(input: {
    context: OrganicMemoryPromptContext
    suppressAssociativeRecall: boolean
    personaKernelMode: 'full' | 'backgrounded' | 'muted'
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
  }) {
    const allowActiveThoughts = input.recallGovernor?.allowActiveThoughts !== false
    const allowRecalledFragments = input.recallGovernor?.allowRecalledFragments === true
      && !input.suppressAssociativeRecall

    if (
      allowActiveThoughts
      && allowRecalledFragments
      && input.personaKernelMode === 'full'
      && !input.suppressAssociativeRecall
    ) {
      return input.context
    }

    return {
      ...input.context,
      activeThoughts: allowActiveThoughts
        ? input.personaKernelMode === 'muted'
          ? input.context.activeThoughts.slice(0, 2)
          : input.context.activeThoughts
        : [],
      recalledFragments: allowRecalledFragments
        ? input.personaKernelMode === 'backgrounded'
          ? input.context.recalledFragments.slice(0, 2)
          : input.context.recalledFragments
        : [],
    } satisfies OrganicMemoryPromptContext
  }

  function buildPerformanceManifestSystemBlocks(manifest: CharacterPerformanceCapabilitiesManifest | null) {
    if (!manifest)
      return []

    const blocks = [
      '[ALICIZATION_VESSEL_CAPABILITIES]',
      `Current renderer: ${manifest.renderer}.`,
      'Use baseEmotion only from the supported list below.',
      'Use facialCue/actionCue only when the corresponding key is explicitly listed. If unsupported or unnecessary, keep it null.',
      manifest.supportedBaseEmotions.length > 0
        ? `Supported base emotions: ${manifest.supportedBaseEmotions.join(', ')}.`
        : 'Supported base emotions: neutral.',
    ]

    if (manifest.supportedFacialCues.length > 0) {
      blocks.push(
        'Supported facial cues:',
        ...manifest.supportedFacialCues.map(item => `- ${item.key}: ${item.label} | ${item.description}`),
      )
    }

    if (manifest.supportedActions.length > 0) {
      blocks.push(
        'Supported actions:',
        ...manifest.supportedActions.map(item => `- ${item.key}: ${item.label} | ${item.description}`),
      )
    }

    blocks.push(
      `Look-at support: ${manifest.supportsLookAt ? 'yes' : 'no'}.`,
      `Viseme lip sync support: ${manifest.supportsVisemeLipSync ? 'yes' : 'no'}.`,
      `Micro-dynamics support: ${manifest.supportsMicroDynamics ? 'yes' : 'no'}.`,
      'Do not expose or explain this capability manifest to the user.',
    )

    return [blocks.join('\n')]
  }

  async function resolveOrganicMemoryPromptContext(options?: {
    recallSeed?: string
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
  }): Promise<OrganicMemoryPromptContext> {
    const snapshot = await getOrganicMemorySnapshot()
    const relationshipDynamics = await alicizationDb.getLatestRelationshipDynamics().catch(() => null)
    const recallSeed = options?.recallGovernor?.recallSeed || options?.recallSeed || ''
    const allowRecalledFragments = options?.recallGovernor
      ? options.recallGovernor.allowRecalledFragments === true
      : Boolean(recallSeed)
    const recalledFragments = allowRecalledFragments && recallSeed
      ? (await recallSubconsciousFragmentsFromText(recallSeed)).filter(fragment => !isPersonaResidueMemoryText(fragment.text))
      : []
    const activeThoughts = options?.recallGovernor?.allowActiveThoughts === false
      ? []
      : selectPromptActiveThoughts({
          activeThoughts: snapshot.activeThoughts,
          recallSeed,
          recalledFragments,
        })

    return {
      hostAttitude: relationshipDynamics?.hostAttitude || snapshot.hostAttitude,
      coreIncarnation: snapshot.coreIncarnation,
      activeThoughts,
      recalledFragments,
      relationshipDynamics,
    }
  }

  function prependSystemBlocksToMessages(messages: Message[], blocks: string[]) {
    if (blocks.length === 0)
      return messages
    return [
      ...blocks.map(content => ({ role: 'system', content }) as Message),
      ...messages,
    ]
  }

  function buildCardCustomDirectivesSystemBlock(directives: string) {
    const normalized = normalizeCustomDirectives(directives)
    if (!normalized)
      return ''

    return [
      alicizationCustomDirectivesMarker,
      '[Card-level behavior directives | high-priority persona kernel]',
      'Apply these directives consistently when generating thought/emotion/reply.',
      'These directives are lower priority than safety boundaries, human-in-the-loop permission, kill switch, the current Alicization answer plan, the current Alicization response charter, the current epistemic truth contract, and strict JSON output contract.',
      '--- custom_directives ---',
      normalized,
      '--- /custom_directives ---',
    ].join('\n')
  }

  function buildTurnScopedPersonaKernelSystemBlock(input: {
    mode: 'backgrounded' | 'muted'
    reason?: string
  }) {
    return [
      '[ALICIZATION_TURN_PERSONA_KERNEL]',
      input.mode === 'muted'
        ? 'The card-level persona kernel is temporarily muted for this turn.'
        : 'The card-level persona kernel is backgrounded for this turn.',
      input.reason ? `Reason: ${sanitizeBriefText(input.reason, 180)}.` : '',
      'Keep identity continuity only as light diction after truth, repair, and the host’s current ask are already handled.',
      'Do not let maid-role performance, clinginess, pet names, obedience display, or theatrical softness lead the reply.',
    ].filter(Boolean).join('\n')
  }

  function readMessageContentAsText(content: unknown) {
    if (typeof content === 'string')
      return content
    if (Array.isArray(content)) {
      return content.map((part) => {
        if (typeof part === 'string')
          return part
        if (part && typeof part === 'object' && 'text' in part)
          return String((part as { text?: unknown }).text ?? '')
        return ''
      }).join('\n')
    }
    return ''
  }

  function extractCustomDirectivesFromMessages(messages: Message[]) {
    for (const message of messages) {
      if (message.role !== 'system')
        continue
      const systemText = readMessageContentAsText(message.content)
      if (!systemText.startsWith('---\n'))
        continue
      const parsed = parseSoul(systemText)
      const directives = normalizeCustomDirectives(parsed.frontmatter.custom_directives)
      if (directives)
        return directives
    }
    return ''
  }

  function extractHostNameFromMessages(messages: Message[]) {
    for (const message of messages) {
      if (message.role !== 'system')
        continue
      const systemText = readMessageContentAsText(message.content)
      if (!systemText.startsWith('---\n'))
        continue
      const parsed = parseSoul(systemText)
      const hostName = sanitizeText(parsed.frontmatter.profile.hostName, '')
      if (hostName)
        return hostName
    }
    return ''
  }

  async function resolveCardHostName(cardId: string, options?: { messages?: Message[] }) {
    const normalizedCardId = normalizeCardId(cardId)
    let readFailed = false
    try {
      if (normalizedCardId === activeCardId && soulSnapshot) {
        const hostName = sanitizeText(soulSnapshot.frontmatter.profile.hostName, '')
        if (hostName)
          return hostName
      }

      const targetSoulPath = resolveCardPaths(normalizedCardId).soulPath
      if (existsSync(targetSoulPath)) {
        const content = await readFile(targetSoulPath, 'utf-8')
        const hostName = sanitizeText(parseSoul(content).frontmatter.profile.hostName, '')
        if (hostName)
          return hostName
      }
    }
    catch (error) {
      readFailed = true
      await appendRuntimeDebugLine('host-name.resolve-error', {
        cardId: normalizedCardId,
        reason: error instanceof Error ? error.message : String(error),
      })
    }

    const fallback = extractHostNameFromMessages(options?.messages ?? [])
    if (fallback)
      return fallback

    if (readFailed) {
      await appendRuntimeDebugLine('host-name.resolve-fallback-empty', {
        cardId: normalizedCardId,
      })
    }
    return ''
  }

  function buildMainRuntimeCorePromptBlocks(input: {
    hostName?: string
  }) {
    const blocks: string[] = []
    if (alicizationFixedCoreSystemInstruction.trim())
      blocks.push(alicizationFixedCoreSystemInstruction.trim())

    const hostName = sanitizeText(input.hostName, '')
    if (hostName) {
      blocks.push(renderAlicizationPromptTemplate(alicizationFixedHostNameDirectiveTemplate, {
        hostName,
        source: 'host',
        content: '',
        iso: '',
        local: '',
        moduleName: '',
      }).trim())
    }

    if (alicizationFixedStructuredContractAnchor.trim())
      blocks.push(alicizationFixedStructuredContractAnchor.trim())

    return blocks.filter(Boolean)
  }

  async function resolveCardCustomDirectives(cardId: string, options?: { messages?: Message[] }): Promise<ResolvedCardCustomDirectives> {
    const normalizedCardId = normalizeCardId(cardId)
    let readFailed = false
    try {
      if (normalizedCardId === activeCardId && soulSnapshot) {
        const directives = normalizeCustomDirectives(soulSnapshot.frontmatter.custom_directives)
        if (directives) {
          return {
            text: directives,
            source: 'card-soul',
          }
        }
      }

      const targetSoulPath = resolveCardPaths(normalizedCardId).soulPath
      if (existsSync(targetSoulPath)) {
        const content = await readFile(targetSoulPath, 'utf-8')
        const directives = normalizeCustomDirectives(parseSoul(content).frontmatter.custom_directives)
        if (directives) {
          return {
            text: directives,
            source: 'card-soul',
          }
        }
      }
    }
    catch (error) {
      readFailed = true
      await appendRuntimeDebugLine('custom-directives.resolve-error', {
        cardId: normalizedCardId,
        reason: error instanceof Error ? error.message : String(error),
      })
    }

    const fallback = extractCustomDirectivesFromMessages(options?.messages ?? [])
    if (fallback) {
      return {
        text: fallback,
        source: 'payload-soul',
      }
    }

    return {
      text: '',
      source: readFailed ? 'error' : 'none',
    }
  }

  function injectCardCustomDirectivesIntoMessages(messages: Message[], directives: string) {
    const block = buildCardCustomDirectivesSystemBlock(directives)
    if (!block)
      return messages

    const alreadyInjected = messages.some((message) => {
      if (message.role !== 'system')
        return false
      return readMessageContentAsText(message.content).includes(alicizationCustomDirectivesMarker)
    })
    if (alreadyInjected)
      return messages

    return [
      {
        role: 'system',
        content: block,
      } as Message,
      ...messages,
    ]
  }

  async function generateMainGatewayText(options: {
    system: string
    user: Message['content']
    timeoutMs?: number
    source?: 'reminder' | 'proactive' | 'dream' | 'screen-semantic' | 'scene-appraisal' | 'subjective-inference' | 'counterfactual-deliberation' | 'dialogue-turn-semantics'
    cardId?: string
    extraSystemBlocks?: string[]
    injectCustomDirectives?: boolean
    injectPerformanceManifest?: boolean
  }) {
    const config = resolveMainGatewayConfig()
    if (!config) {
      await appendRuntimeDebugLine('main-gateway.one-shot-missing-config', {
        cardId: activeCardId,
        source: options.source ?? 'unknown',
        activeProviderId,
        activeModelId,
      })
      return null
    }

    const resolvedCustomDirectives = options.injectCustomDirectives === false
      ? { text: '', source: 'none' as const }
      : await resolveCardCustomDirectives(options.cardId ?? activeCardId)
    const customDirectiveBlock = options.injectCustomDirectives === false
      ? ''
      : buildCardCustomDirectivesSystemBlock(resolvedCustomDirectives.text)
    const performanceManifest = await getPerformanceManifest()
    const systemMessages: Message[] = [
      ...(customDirectiveBlock
        ? [{ role: 'system', content: customDirectiveBlock } as Message]
        : []),
      ...(options.injectPerformanceManifest === false
        ? []
        : buildPerformanceManifestSystemBlocks(performanceManifest)
            .map(content => ({ role: 'system', content }) as Message)),
      ...((options.extraSystemBlocks ?? [])
        .map(block => sanitizeMultilineText(block))
        .filter(Boolean)
        .map(content => ({ role: 'system', content }) as Message)),
      { role: 'system', content: options.system } as Message,
    ]

    const controller = new AbortController()
    const timeout = setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort(createAbortError('main-gateway-timeout'))
      }
    }, Math.max(1_000, options.timeoutMs ?? 18_000))

    try {
      const result = await generateText({
        ...config.provider.chat(config.model),
        maxSteps: 1,
        messages: [
          ...systemMessages,
          { role: 'user', content: options.user } as Message,
        ],
        headers: config.headers,
        abortSignal: controller.signal,
      })
      const fullText = (result.text ?? '').trim()
      await appendRuntimeDebugLine('main-gateway.one-shot-finished', {
        cardId: normalizeCardId(options.cardId ?? activeCardId),
        source: options.source ?? 'unknown',
        customDirectivesSource: resolvedCustomDirectives.source,
        customDirectivesChars: resolvedCustomDirectives.text.length,
        chunkCount: fullText ? 1 : 0,
        rawChunkChars: fullText.length,
        finalChars: fullText.length,
      })
      return fullText || null
    }
    catch (error) {
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.main-gateway',
        action: 'one-shot-failed',
        message: 'Main gateway one-shot generation failed; fallback path used.',
        payload: {
          reason: error instanceof Error ? error.message : String(error),
          model: config.model,
          providerId: config.providerId,
          source: options.source ?? 'unknown',
        },
      })
      return null
    }
    finally {
      clearTimeout(timeout)
    }
  }

  function buildScreenSemanticUserContent(input: {
    imageDataUrl: string
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    sourceName: string
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
      source?: string
    } | null
  }): CommonContentPart[] {
    const screenContextText = [
      'Classify this screen snapshot for Alicization proactive policy.',
      `Capture source: ${sanitizeBriefText(input.sourceName, 120) || 'unknown'}`,
      `Focus target: ${describePerceptionTarget(input.focusTarget)}`,
      `Focus source: ${sanitizeBriefText(input.focusTarget?.source ?? '', 48) || 'none'}`,
      `Foreground app: ${sanitizeBriefText(input.foregroundWindow?.appName ?? '', 120) || 'unknown'}`,
      `Foreground process: ${sanitizeBriefText(input.foregroundWindow?.processName ?? '', 120) || 'unknown'}`,
      `Foreground title: ${sanitizeBriefText(input.foregroundWindow?.title ?? '', 240) || 'unknown'}`,
      'Prefer what is visibly on the screen over the window title if they disagree.',
    ].join('\n')

    return [
      { type: 'text', text: screenContextText },
      {
        type: 'image_url',
        image_url: {
          url: input.imageDataUrl,
        },
      } as CommonContentPart,
    ]
  }

  function buildScreenSemanticClassifierSystemPrompt() {
    return [
      'You classify a screen snapshot for Alicization proactive policy.',
      'Output valid JSON only with keys: workload, content, summary, confidence, matchedLabels.',
      'workload must be one of: coding, media, browser, terminal, game, chat, document, unknown.',
      'content must be one of: error, diff, doc, video, music, chat, gameplay, unknown.',
      'summary must be a short factual phrase under 18 words. Do not mention emotions or advice.',
      'confidence must be a number in range [0,1].',
      'matchedLabels must be an array of short lower-kebab-case strings with up to 4 items.',
      'If the screenshot is unreadable or ambiguous, use unknown with low confidence.',
    ].join('\n')
  }

  function isGenericScreenSemanticCue(raw: unknown) {
    const normalized = sanitizeBriefText(readStringValue(raw), 160).toLowerCase()
    if (!normalized)
      return true
    if (/^(?:(?:code|cursor|vscode|visual studio code|browser|terminal|player|music|video|chat|document|editor|ide|app|application)\s*[·|:-]\s*)?(?:screen|display|desktop|workspace)(?:\s*\d+)?$/i.test(normalized))
      return true
    return new Set([
      'current screen',
      'coding workspace',
      'terminal session',
      'browser page',
      'media view',
      'chat window',
      'document view',
      'game window',
      'error view',
      'diff view',
      'video playback',
      'music playback',
    ]).has(normalized)
  }

  function normalizeParsedScreenSemanticSummary(input: {
    summary: AlicizationScreenSemanticSummary
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
      source?: string
    } | null
  }) {
    const rawCue = buildAlicizationScreenSurfaceCue({
      rawCues: [
        input.summary.content.summary,
        ...input.summary.content.matchedLabels,
      ],
      target: input.focusTarget ?? input.foregroundWindow ?? null,
      workloadKind: input.summary.workload.kind,
      contentKind: input.summary.content.kind,
      scenario: input.summary.workload.kind === 'coding'
        ? 'coding'
        : input.summary.workload.kind === 'media'
          ? 'media'
          : null,
    })
    const normalizedCue = sanitizeBriefText(rawCue, 120)
    const weakCue = isWeakAlicizationScreenSurfaceCue(normalizedCue)
    const genericCue = isGenericScreenSemanticCue(normalizedCue)
    const isUnknownSummary = input.summary.workload.kind === 'unknown' && input.summary.content.kind === 'unknown'

    if (isUnknownSummary && (weakCue || genericCue))
      return null

    return {
      ...input.summary,
      content: {
        ...input.summary.content,
        summary: weakCue || genericCue
          ? undefined
          : normalizedCue || undefined,
      },
    } satisfies AlicizationScreenSemanticSummary
  }

  function hasMeaningfulScreenSemanticSummary(summary: AlicizationScreenSemanticSummary | null | undefined) {
    if (!summary)
      return false
    if (summary.content.summary)
      return true
    return summary.workload.kind !== 'unknown' || summary.content.kind !== 'unknown'
  }

  function buildScreenSemanticSceneResidue(input: {
    now: number
    summary: AlicizationScreenSemanticSummary
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
      source?: AlicizationPerceptionSceneResidue['focusSource']
    } | null
  }): AlicizationPerceptionSceneResidue {
    return {
      observedAt: input.now,
      source: 'screen-semantic-summary',
      workloadKind: input.summary.workload.kind,
      contentKind: input.summary.content.kind,
      summary: input.summary.content.summary,
      confidence: Math.max(input.summary.workload.confidence, input.summary.content.confidence),
      focusTarget: input.focusTarget
        ? {
            appName: input.focusTarget.appName,
            processName: input.focusTarget.processName,
            title: input.focusTarget.title,
          }
        : undefined,
      focusSource: input.focusTarget?.source,
      captureSourceName: input.summary.source.name,
      captureStrategy: input.summary.source.strategy,
    }
  }

  async function generateScreenSemanticSummaryFromImage(input: {
    cardId: string
    now: number
    imageDataUrl: string
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    source: {
      id: string
      name: string
      strategy: 'window-title' | 'app-name' | 'process-name' | 'screen-fallback'
    }
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
      source?: string
    } | null
  }) {
    const raw = await generateMainGatewayText({
      system: buildScreenSemanticClassifierSystemPrompt(),
      user: buildScreenSemanticUserContent({
        imageDataUrl: input.imageDataUrl,
        foregroundWindow: input.foregroundWindow,
        sourceName: input.source.name,
        focusTarget: input.focusTarget,
      }),
      timeoutMs: proactiveScreenSemanticTimeoutMs,
      source: 'screen-semantic',
      cardId: input.cardId,
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
    })
    if (!raw) {
      return {
        summary: null,
        unavailableReason: 'screen-semantic-llm-unavailable',
      } as const
    }

    const parsedSummary = parseScreenSemanticSummary({
      raw,
      analyzedAt: input.now,
      source: input.source,
    })
    if (!parsedSummary) {
      return {
        summary: null,
        unavailableReason: 'screen-semantic-parse-failed',
      } as const
    }
    const summary = normalizeParsedScreenSemanticSummary({
      summary: parsedSummary,
      foregroundWindow: input.foregroundWindow,
      focusTarget: input.focusTarget,
    })
    if (!summary) {
      return {
        summary: null,
        unavailableReason: 'screen-semantic-weak-summary',
      } as const
    }

    return hasMeaningfulScreenSemanticSummary(summary)
      ? {
          summary,
          unavailableReason: undefined,
        } as const
      : {
          summary: null,
          unavailableReason: 'screen-semantic-parse-failed',
        } as const
  }

  async function resolveProactiveScreenSemanticSummary(input: {
    cardId: string
    now: number
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    perceptionState?: AlicizationPerceptionState
  }) {
    const cardId = normalizeCardId(input.cardId)
    const cached = screenSemanticCacheByCard.get(cardId)
    const perceptionState = input.perceptionState ?? await ensurePerceptionState(cardId)
    const invitedInspectionActive = Boolean(
      perceptionState.invitedInspection
      && perceptionState.invitedInspection.activeUntil > input.now,
    )
    const reusableResidue = getUsablePerceptionSceneResidue({
      state: perceptionState,
      now: input.now,
      maxAgeMs: 2 * 60_000,
    })
    if (invitedInspectionActive) {
      if (reusableResidue) {
        const reusedSummary = buildScreenSemanticSummaryFromResidue(reusableResidue)
        screenSemanticCacheByCard.set(cardId, {
          key: [
            'scene-residue',
            reusableResidue.observedAt,
            reusableResidue.source,
            reusableResidue.captureSourceName ?? '',
          ].join(':'),
          summary: reusedSummary,
          updatedAt: input.now,
        })
        return reusedSummary
      }

      screenSemanticCacheByCard.set(cardId, {
        key: 'invited-inspection-active',
        summary: null,
        updatedAt: input.now,
        unavailableReason: 'invited-inspection-active',
      })
      return null
    }

    const captureAccess = await resolveDesktopCaptureAccess({
      types: ['window', 'screen'],
      thumbnailSize: { width: 640, height: 360 },
    })
    const sources = captureAccess.sources
    if (sources.length === 0) {
      screenSemanticCacheByCard.set(cardId, {
        key: captureAccess.unavailableReason ?? 'screen-semantic-source-unavailable',
        summary: null,
        updatedAt: input.now,
        unavailableReason: captureAccess.unavailableReason ?? captureAccess.probeError,
      })
      return null
    }

    const attentionAnchor = getActiveAttentionAnchor(perceptionState, input.now)
    const candidate = pickScreenSemanticCaptureCandidate({
      foregroundWindow: input.foregroundWindow,
      attentionAnchor,
      recentObservations: perceptionState.recentObservations,
      hintTerms: [],
      avoidSourcePattern: /\b(?:alicization|codex)\b/i,
      sources,
    })
    if (!candidate) {
      screenSemanticCacheByCard.set(cardId, {
        key: 'no-candidate',
        summary: null,
        updatedAt: input.now,
        unavailableReason: 'screen-semantic-source-unavailable',
      })
      return null
    }

    const candidateKey = [
      candidate.source.id,
      candidate.strategy,
      sanitizeText(candidate.focusTarget?.source ?? ''),
      sanitizeText(candidate.focusTarget?.appName),
      sanitizeText(candidate.focusTarget?.processName),
      sanitizeText(candidate.focusTarget?.title),
      sanitizeText(input.foregroundWindow?.appName),
      sanitizeText(input.foregroundWindow?.processName),
      sanitizeText(input.foregroundWindow?.title),
    ].join(':')
    if (
      cached
      && cached.key === candidateKey
      && input.now - cached.updatedAt <= (cached.summary ? proactiveScreenSemanticCacheTtlMs : proactiveScreenSemanticFailureTtlMs)
    ) {
      return cached.summary
    }

    const imageDataUrl = buildCompressedNativeImageDataUrl({
      image: candidate.source.thumbnail,
      maxWidth: proactiveScreenSemanticImageMaxWidth,
      maxHeight: proactiveScreenSemanticImageMaxHeight,
      jpegQuality: proactiveScreenSemanticImageJpegQuality,
    })
    if (!imageDataUrl) {
      screenSemanticCacheByCard.set(cardId, {
        key: candidateKey,
        summary: null,
        updatedAt: input.now,
        unavailableReason: 'screen-semantic-thumbnail-empty',
      })
      return null
    }

    const semanticResult = await generateScreenSemanticSummaryFromImage({
      cardId,
      now: input.now,
      imageDataUrl,
      foregroundWindow: input.foregroundWindow,
      source: {
        id: candidate.source.id,
        name: candidate.source.name,
        strategy: candidate.strategy,
      },
      focusTarget: candidate.focusTarget,
    })
    const summary = semanticResult.summary
    if (!summary) {
      screenSemanticCacheByCard.set(cardId, {
        key: candidateKey,
        summary: null,
        updatedAt: input.now,
        unavailableReason: semanticResult.unavailableReason,
      })
      return null
    }
    await rememberSceneResidue({
      cardId,
      now: input.now,
      residue: buildScreenSemanticSceneResidue({
        now: input.now,
        summary,
        focusTarget: candidate.focusTarget,
      }),
    })
    screenSemanticCacheByCard.set(cardId, {
      key: candidateKey,
      summary,
      updatedAt: input.now,
      unavailableReason: undefined,
    })
    return summary
  }

  async function recoverMainChatFromTimeout(options: {
    chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']>
    messages: Message[]
    headers?: Record<string, string>
    timeoutMs?: number
    cardId?: string
    turnId?: string
  }) {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      if (!controller.signal.aborted)
        controller.abort(createAbortError('main-gateway-timeout-recovery'))
    }, Math.max(1_000, options.timeoutMs ?? mainChatTimeoutRecoveryMs))

    try {
      const result = await generateText({
        ...options.chatConfig,
        maxSteps: 1,
        messages: options.messages,
        headers: options.headers,
        abortSignal: controller.signal,
      })
      const fullText = (result.text ?? '').trim()
      await appendRuntimeDebugLine('chat-stream.timeout-recovery-finished', {
        cardId: normalizeCardId(options.cardId ?? activeCardId),
        turnId: sanitizeText(options.turnId),
        chunkCount: fullText ? 1 : 0,
        rawChunkChars: fullText.length,
        finalChars: fullText.length,
      })
      return fullText
    }
    finally {
      clearTimeout(timeout)
    }
  }

  async function generateMainChatNonStreaming(options: {
    chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']>
    messages: Message[]
    headers?: Record<string, string>
    tools?: Array<Awaited<ReturnType<typeof tool>>>
    timeoutMs: number
    cardId?: string
    turnId?: string
  }) {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort(createAbortError('main-gateway-visual-one-shot-timeout'))
      }
    }, Math.max(1_000, options.timeoutMs))

    try {
      const result = await generateText({
        ...options.chatConfig,
        maxSteps: 10,
        messages: options.messages,
        headers: options.headers,
        abortSignal: controller.signal,
        tools: options.tools,
      })
      const fullText = (result.text ?? '').trim()
      await appendRuntimeDebugLine('chat-stream.visual-one-shot-finished', {
        cardId: normalizeCardId(options.cardId ?? activeCardId),
        turnId: sanitizeText(options.turnId),
        finishReason: sanitizeText(result.finishReason, 'stop'),
        finalChars: fullText.length,
      })
      return {
        finishReason: sanitizeText(result.finishReason, 'stop'),
        fullText,
      }
    }
    finally {
      clearTimeout(timeout)
    }
  }

  function resolveChatMessages(
    payload: AlicizationChatStartPayload,
    options?: {
      redactStaleInspectionHistoryForUserText?: string
    },
  ): Message[] {
    const sourceMessages = options?.redactStaleInspectionHistoryForUserText
      ? redactStaleInspectionHistoryMessages(payload.messages, options.redactStaleInspectionHistoryForUserText)
      : payload.messages

    return sourceMessages.flatMap((message) => {
      const rawRole = typeof (message as { role?: unknown }).role === 'string'
        ? (message as { role: string }).role
        : ''
      const role = rawRole === 'developer'
        ? 'system'
        : rawRole

      if (role === 'error')
        return []
      if (role !== 'system' && role !== 'user' && role !== 'assistant' && role !== 'tool')
        return []

      if (role === 'tool') {
        return [{
          role: 'tool',
          content: normalizeTransportMessageContent(message.content),
          tool_call_id: sanitizeText(message.toolCallId),
        } as Message]
      }

      return [{
        // NOTICE: Renderer session history may contain UI-only pseudo roles such as
        // `error`. OpenAI-compatible providers only accept the standard chat roles,
        // and some compatibility gateways hang instead of returning a validation error.
        role,
        content: normalizeTransportMessageContent(message.content),
      } as Message]
    })
  }

  async function buildMainGatewayTools(cardId: string) {
    return await Promise.all([
      tool({
        name: 'set_reminder',
        description: '用于在系统后台设定一个真实的倒计时闹钟。注意：调用此工具后，真实的物理系统会在未来唤醒你。因此，你在本轮的 reply 中，【只允许】回复“已为你定好闹钟”等确认语句。绝对禁止在本轮回复中直接给出提醒内容！',
        parameters: z.object({
          minutes: z.coerce.number(),
          message: z.string(),
        }).strict(),
        execute: async ({ minutes, message }) => {
          return await scheduleReminderTask(cardId, {
            minutes,
            message,
          }, 'tool')
        },
      }),
      tool({
        name: 'mcp_list_tools',
        description: 'List all tools available on the connected MCP servers.',
        parameters: z.object({}).strict(),
        execute: async () => await invokeAlicizationMcpListToolsFromMain(),
      }),
      tool({
        name: 'mcp_call_tool',
        description: 'Call a tool on MCP server by qualified tool name.',
        parameters: z.object({
          name: z.string().describe('Qualified MCP tool name, format: "<serverName>::<toolName>"'),
          parameters: z.array(z.object({
            name: z.string(),
            value: z.unknown(),
          }).strict()).default([]),
        }).strict(),
        execute: async ({ name, parameters = [] }) => {
          const argumentsObject = Object.fromEntries(parameters.map(entry => [entry.name, entry.value]))
          return await invokeAlicizationMcpCallToolFromMain({
            cardId,
            name,
            arguments: argumentsObject,
          })
        },
      }),
    ])
  }

  function toAlicizationChatStreamDispatchPayload(
    eventType: AlicizationChatStreamDispatchPayload['eventType'],
    body: AlicizationChatMetaEvent | AlicizationChatStreamChunkEvent | AlicizationChatToolCallEvent | AlicizationChatToolResultEvent | AlicizationChatFinishEvent | AlicizationChatErrorEvent | AlicizationDialogueRespondedPayload,
  ): AlicizationChatStreamDispatchPayload {
    switch (eventType) {
      case 'meta':
        return { eventType, body: body as AlicizationChatMetaEvent }
      case 'chunk':
        return { eventType, body: body as AlicizationChatStreamChunkEvent }
      case 'tool-call':
        return { eventType, body: body as AlicizationChatToolCallEvent }
      case 'tool-result':
        return { eventType, body: body as AlicizationChatToolResultEvent }
      case 'finish':
        return { eventType, body: body as AlicizationChatFinishEvent }
      case 'error':
        return { eventType, body: body as AlicizationChatErrorEvent }
      case 'dialogue-responded':
        return { eventType, body: body as AlicizationDialogueRespondedPayload }
    }
  }

  function emitChatStreamEventForState(
    state: ChatRunState | undefined,
    eventType: StreamDispatchEventType,
    body: AlicizationChatMetaEvent | AlicizationChatStreamChunkEvent | AlicizationChatToolCallEvent | AlicizationChatToolResultEvent | AlicizationChatFinishEvent | AlicizationChatErrorEvent,
  ) {
    if (!state)
      return

    const sender = state.sender
    if (sender && !sender.isDestroyed()) {
      try {
        sender.send(alicizationChatStreamDispatchChannel, toAlicizationChatStreamDispatchPayload(eventType, body))
        if (!state.hasLoggedDispatchBinding) {
          state.hasLoggedDispatchBinding = true
          void queueScopedAuditLog(state.cardId, {
            level: 'notice',
            category: 'alicization.main-gateway',
            action: 'stream-dispatch-bound',
            message: 'Bound main chat stream dispatch to the originating renderer sender.',
            payload: {
              cardId: state.cardId,
              turnId: state.turnId,
              eventType,
              senderId: sender.id,
            },
          })
          void appendRuntimeDebugLine('chat-stream.dispatch-bound', {
            cardId: state.cardId,
            turnId: state.turnId,
            eventType,
            senderId: sender.id,
          })
        }
        return
      }
      catch (error) {
        void queueScopedAuditLog(state.cardId, {
          level: 'warning',
          category: 'alicization.main-gateway',
          action: 'stream-dispatch-failed',
          message: 'Failed to dispatch main chat stream event to the originating renderer sender.',
          payload: {
            cardId: state.cardId,
            turnId: state.turnId,
            eventType,
            senderId: sender.id,
            reason: error instanceof Error ? error.message : String(error),
          },
        })
        void appendRuntimeDebugLine('chat-stream.dispatch-failed', {
          cardId: state.cardId,
          turnId: state.turnId,
          eventType,
          senderId: sender.id,
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const eventaOptions = state.rawInvokeOptions?.ipcMainEvent
      ? {
          raw: {
            ipcMainEvent: state.rawInvokeOptions.ipcMainEvent,
            event: state.rawInvokeOptions.event,
          },
        }
      : undefined

    const eventaEvent = eventType === 'meta'
      ? alicizationChatStreamMeta
      : eventType === 'chunk'
        ? alicizationChatStreamChunk
        : eventType === 'tool-call'
          ? alicizationChatStreamToolCall
          : eventType === 'tool-result'
            ? alicizationChatStreamToolResult
            : eventType === 'finish'
              ? alicizationChatStreamFinish
              : alicizationChatStreamError

    if (eventaOptions) {
      context.emit(eventaEvent, body, eventaOptions)
      return
    }

    context.emit(eventaEvent, body)
  }

  function emitChatFinish(key: string, payload: Omit<AlicizationChatFinishEvent, 'cardId' | 'turnId'>) {
    const state = chatRuns.get(key)
    if (!state)
      return
    if (state.state === 'finished')
      return
    state.state = 'finished'
    chatRuns.delete(key)
    rememberFinishedChatRun(key)
    void appendRuntimeDebugLine('chat-stream.finished', {
      cardId: state.cardId,
      turnId: state.turnId,
      status: payload.status,
      finishReason: payload.finishReason,
      error: payload.error,
      chunkCount: state.chunkCount,
      rawChunkChars: state.rawChunkChars,
      fullTextChars: payload.fullText?.length ?? 0,
    })
    emitChatStreamEventForState(state, 'finish', {
      cardId: state.cardId,
      turnId: state.turnId,
      ...payload,
    })
  }

  async function prepareMainChatExecution(
    payload: AlicizationChatStartPayload,
    mainGateway: MainGatewayResolvedConfig,
  ): Promise<PreparedMainChatExecution> {
    const chatConfig = mainGateway.provider.chat(mainGateway.model)
    const latestUserText = readLatestUserMessageText(payload.messages)
    const shouldBypassPerception = latestUserText
      ? isInternalAlicizationRepairPrompt(latestUserText)
      : false
    let messages = resolveChatMessages(payload, {
      redactStaleInspectionHistoryForUserText: shouldBypassPerception ? '' : latestUserText,
    })
    messages = preserveLatestUserMultimodalContent({
      originalMessages: payload.messages,
      resolvedMessages: messages,
    })

    const contextualStringPromise = shouldBypassPerception
      ? Promise.resolve('')
      : buildMainChatContextualString(payload)
    const perceptionAugmentation = latestUserText && !shouldBypassPerception
      ? await augmentMainChatMessagesWithPerception({
          cardId: payload.cardId,
          userText: latestUserText,
          messages,
        })
      : {
          messages,
          systemBlocks: [] as string[],
          promptSystemBlocks: [] as string[],
          memoryRecallSeed: '',
          recallGovernor: null as AlicizationRecallGovernorSnapshot | null,
          chatGovernance: {
            suppressAssociativeRecall: false,
            turnMode: 'answer' as const,
            personaKernelMode: 'full' as const,
            mindTurnGovernance: null,
          },
        }
    messages = perceptionAugmentation.messages
    const contextualString = await contextualStringPromise
    const organicPromptContext = tuneOrganicMemoryPromptContextForExecutiveTurn({
      context: await resolveOrganicMemoryPromptContext({
        recallSeed: [contextualString, perceptionAugmentation.memoryRecallSeed].filter(Boolean).join('\n'),
        recallGovernor: perceptionAugmentation.recallGovernor,
      }),
      suppressAssociativeRecall: perceptionAugmentation.chatGovernance.suppressAssociativeRecall,
      personaKernelMode: perceptionAugmentation.chatGovernance.personaKernelMode,
      recallGovernor: perceptionAugmentation.recallGovernor,
    })

    const allowTools = payload.supportsTools !== false
    const waitForTools = payload.waitForTools === true
    const [performanceManifest, customDirectivesResolution, hostName, tools] = await Promise.all([
      getPerformanceManifest(),
      resolveCardCustomDirectives(payload.cardId, { messages }),
      resolveCardHostName(payload.cardId, { messages }),
      allowTools ? buildMainGatewayTools(payload.cardId) : Promise.resolve(undefined),
    ])
    const runtimeCorePromptBlocks = buildMainRuntimeCorePromptBlocks({ hostName })

    messages = prependSystemBlocksToMessages(messages, [
      ...runtimeCorePromptBlocks,
      ...perceptionAugmentation.promptSystemBlocks,
      ...buildOrganicMemorySystemBlocks(organicPromptContext),
      ...buildPerformanceManifestSystemBlocks(performanceManifest),
    ])
    if (perceptionAugmentation.chatGovernance.personaKernelMode === 'muted') {
      messages = prependSystemBlocksToMessages(messages, [
        buildTurnScopedPersonaKernelSystemBlock({
          mode: 'muted',
          reason: 'truth-or-repair-obligation',
        }),
      ])
    }
    else if (perceptionAugmentation.chatGovernance.personaKernelMode === 'backgrounded') {
      messages = prependSystemBlocksToMessages(messages, [
        buildTurnScopedPersonaKernelSystemBlock({
          mode: 'backgrounded',
          reason: 'task-or-direct-answer-obligation',
        }),
      ])
    }
    else {
      messages = injectCardCustomDirectivesIntoMessages(messages, customDirectivesResolution.text)
    }

    return {
      chatConfig,
      messages,
      waitForTools,
      tools,
      customDirectivesResolution,
      hasVisualGrounding: messageContainsVisualInput(messages),
      governance: perceptionAugmentation.chatGovernance.mindTurnGovernance,
    }
  }

  async function startMainChatStream(
    payload: AlicizationChatStartPayload,
    invokeOptions?: { raw?: { ipcMainEvent?: IpcMainEvent, event?: unknown } },
  ): Promise<AlicizationChatStartResult> {
    await appendRuntimeDebugLine('chat-start.entered', {
      cardId: payload.cardId,
      turnId: payload.turnId,
      providerId: sanitizeText(payload.providerId),
      model: sanitizeText(payload.model),
      activeCardId,
      hasInvokeSender: Boolean(invokeOptions?.raw?.ipcMainEvent?.sender),
    })
    const key = createChatRunKey(payload.cardId, payload.turnId)
    const rawInvokeOptions = invokeOptions?.raw && typeof invokeOptions.raw === 'object'
      ? invokeOptions.raw as { ipcMainEvent?: IpcMainEvent, event?: unknown }
      : undefined
    const existing = chatRuns.get(key)
    if (existing && existing.state === 'running') {
      await appendRuntimeDebugLine('chat-start.duplicate-running', {
        cardId: payload.cardId,
        turnId: payload.turnId,
      })
      return {
        accepted: false,
        turnId: payload.turnId,
        state: 'duplicate-running',
        reason: 'Turn is already running.',
      }
    }
    if (hasRecentlyFinishedChatRun(key)) {
      await appendRuntimeDebugLine('chat-start.duplicate-finished', {
        cardId: payload.cardId,
        turnId: payload.turnId,
      })
      return {
        accepted: false,
        turnId: payload.turnId,
        state: 'duplicate-finished',
        reason: 'Turn has already finished.',
      }
    }
    await settlePendingProactiveOutcomesFromUserTurn(payload.cardId, Date.now(), 'chat-start')

    const mainGateway = resolveMainGatewayConfig({
      providerId: payload.providerId,
      model: payload.model,
      providerConfig: payload.providerConfig,
    })
    if (!mainGateway) {
      const reason = `Missing providerId/model for main-process chat stream. providerId="${sanitizeText(payload.providerId)}" model="${sanitizeText(payload.model)}"`
      await appendRuntimeDebugLine('chat-start.missing-config', {
        cardId: payload.cardId,
        turnId: payload.turnId,
        reason,
      })
      return {
        accepted: false,
        turnId: payload.turnId,
        state: 'missing-config',
        reason,
      }
    }

    // NOTICE: Keep reminder/proactive one-shot generation aligned with the latest confirmed
    // chat model route, even if renderer-side llm sync races or misses.
    activeProviderId = mainGateway.providerId
    activeModelId = mainGateway.model
    const payloadProviderConfig = normalizeProviderConfig(payload.providerConfig)
    if (Object.keys(payloadProviderConfig).length > 0) {
      providerCredentials[mainGateway.providerId] = {
        ...providerCredentials[mainGateway.providerId],
        ...payloadProviderConfig,
      }
    }
    void persistLlmConfigToDisk()
    await appendRuntimeDebugLine('llm-config.updated-from-chat-start', {
      cardId: payload.cardId,
      turnId: payload.turnId,
      providerId: activeProviderId,
      model: activeModelId,
      persistedConfigKeys: Object.keys(providerCredentials[mainGateway.providerId] ?? {}),
    })

    const controller = new AbortController()
    const runState: ChatRunState = {
      cardId: normalizeCardId(payload.cardId),
      turnId: payload.turnId,
      controller,
      sender: rawInvokeOptions?.ipcMainEvent?.sender,
      rawInvokeOptions,
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running',
    }
    chatRuns.set(key, runState)
    await appendRuntimeDebugLine('chat-start.accepted', {
      cardId: runState.cardId,
      turnId: runState.turnId,
      providerId: payload.providerId,
      model: payload.model,
      senderId: runState.sender?.id ?? null,
      preparationDeferred: true,
    })
    const isRunActive = () => chatRuns.get(key)?.state === 'running'
    const preparationPromise = prepareMainChatExecution(payload, mainGateway)

    void (async () => {
      let prepared: PreparedMainChatExecution | null = null
      let chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']> | null = null
      let messages: Message[] = []
      let waitForTools = false
      let tools: PreparedMainChatExecution['tools']
      let timeoutRecoveryMs = mainChatTimeoutRecoveryMs
      const nonProgressEventTypes = new Set<string>()
      const reminderToolCallIds = new Set<string>()

      try {
        prepared = await preparationPromise
        if (!isRunActive())
          return

        chatConfig = prepared.chatConfig
        messages = prepared.messages
        waitForTools = prepared.waitForTools
        tools = prepared.tools
        timeoutRecoveryMs = prepared.hasVisualGrounding
          ? mainChatTimeoutRecoveryWithVisualGroundingMs
          : mainChatTimeoutRecoveryMs
        const firstEventTimeoutMs = prepared.hasVisualGrounding
          ? mainChatFirstEventTimeoutWithVisualGroundingMs
          : mainChatFirstEventTimeoutMs

        emitChatStreamEventForState(chatRuns.get(key), 'meta', {
          cardId: payload.cardId,
          turnId: payload.turnId,
          governance: prepared.governance ?? null,
        })
        void queueScopedAuditLog(payload.cardId, {
          level: 'notice',
          category: 'alicization.main-gateway',
          action: 'stream-started',
          message: 'Accepted a main-process Alicization chat stream.',
          payload: {
            cardId: runState.cardId,
            turnId: runState.turnId,
            providerId: payload.providerId,
            model: payload.model,
            hasVisualGrounding: prepared.hasVisualGrounding,
            hasSender: Boolean(runState.sender),
            senderId: runState.sender?.id ?? null,
            customDirectivesSource: prepared.customDirectivesResolution.source,
            customDirectivesChars: prepared.customDirectivesResolution.text.length,
          },
        })
        await appendRuntimeDebugLine('chat-start.prepared', {
          cardId: runState.cardId,
          turnId: runState.turnId,
          hasVisualGrounding: prepared.hasVisualGrounding,
          customDirectivesSource: prepared.customDirectivesResolution.source,
          customDirectivesChars: prepared.customDirectivesResolution.text.length,
          governanceTurnMode: prepared.governance?.turnMode ?? null,
        })

        if (prepared.hasVisualGrounding) {
          const visualOneShot = await generateMainChatNonStreaming({
            chatConfig: chatConfig!,
            messages,
            headers: mainGateway.headers,
            tools,
            timeoutMs: firstEventTimeoutMs,
            cardId: payload.cardId,
            turnId: payload.turnId,
          })
          if (visualOneShot.fullText && isRunActive()) {
            const currentRun = chatRuns.get(key)
            if (currentRun) {
              currentRun.chunkCount += 1
              currentRun.rawChunkChars += visualOneShot.fullText.length
            }
            emitChatStreamEventForState(chatRuns.get(key), 'chunk', {
              cardId: payload.cardId,
              turnId: payload.turnId,
              text: visualOneShot.fullText,
            })
          }
          emitChatFinish(key, {
            status: 'completed',
            finishReason: visualOneShot.finishReason || 'stop',
            fullText: visualOneShot.fullText || undefined,
          })
          return
        }

        let finishReason = 'stop'
        let fullText = ''
        let sawProgressEvent = false
        await new Promise<void>((resolve, reject) => {
          const firstEventTimeout = setTimeout(() => {
            if (!sawProgressEvent && isRunActive())
              reject(createAbortError('chat-first-event-timeout'))
          }, firstEventTimeoutMs)
          const abortHandler = () => {
            clearTimeout(firstEventTimeout)
            reject(controller.signal.reason ?? createAbortError('chat-abort'))
          }
          controller.signal.addEventListener('abort', abortHandler, { once: true })
          const resolveOnce = () => {
            clearTimeout(firstEventTimeout)
            controller.signal.removeEventListener('abort', abortHandler)
            resolve()
          }
          const rejectOnce = (nextError: unknown) => {
            clearTimeout(firstEventTimeout)
            controller.signal.removeEventListener('abort', abortHandler)
            reject(nextError)
          }

          void Promise.resolve(streamText({
            ...chatConfig!,
            maxSteps: 10,
            messages,
            headers: mainGateway.headers,
            abortSignal: controller.signal,
            tools,
            onEvent: async (event: any) => {
              const eventType = sanitizeText(event?.type)
              if (isMainGatewayProgressEventType(eventType)) {
                sawProgressEvent = true
              }
              else if (eventType && nonProgressEventTypes.size < 12) {
                nonProgressEventTypes.add(eventType)
              }
              if (event?.type === 'text-delta') {
                if (!isRunActive())
                  return
                const rawDelta = readRawTextDelta(event.text)
                fullText += rawDelta
                const currentRun = chatRuns.get(key)
                if (currentRun) {
                  currentRun.chunkCount += 1
                  currentRun.rawChunkChars += rawDelta.length
                }
                emitChatStreamEventForState(chatRuns.get(key), 'chunk', {
                  cardId: payload.cardId,
                  turnId: payload.turnId,
                  text: rawDelta,
                })
                return
              }
              if (event?.type === 'tool-call') {
                if (!isRunActive())
                  return
                const observedToolName = sanitizeText(event.toolName ?? event.name)
                if (observedToolName === 'set_reminder') {
                  const toolCallId = sanitizeText(event.toolCallId)
                  if (toolCallId)
                    reminderToolCallIds.add(toolCallId)
                  await appendRuntimeDebugLine('reminder.stream-tool-call', {
                    cardId: payload.cardId,
                    turnId: payload.turnId,
                    toolCallId,
                    toolName: observedToolName,
                    argumentsPreview: sanitizeBriefText(JSON.stringify(event.arguments ?? {}), 200),
                  })
                }
                emitChatStreamEventForState(chatRuns.get(key), 'tool-call', {
                  cardId: payload.cardId,
                  turnId: payload.turnId,
                  toolCallId: sanitizeText(event.toolCallId),
                  toolName: observedToolName,
                  arguments: typeof event.arguments === 'object' && event.arguments
                    ? event.arguments as Record<string, unknown>
                    : undefined,
                })
                return
              }
              if (event?.type === 'tool-result') {
                if (!isRunActive())
                  return
                const toolCallId = sanitizeText(event.toolCallId)
                if (reminderToolCallIds.has(toolCallId)) {
                  const summary = parseReminderToolResultForDebug(event.result)
                  await appendRuntimeDebugLine('reminder.stream-tool-result', {
                    cardId: payload.cardId,
                    turnId: payload.turnId,
                    toolCallId,
                    ...summary,
                    triggerIso: typeof summary.triggerAt === 'number' ? new Date(summary.triggerAt).toISOString() : undefined,
                  })
                }
                emitChatStreamEventForState(chatRuns.get(key), 'tool-result', {
                  cardId: payload.cardId,
                  turnId: payload.turnId,
                  toolCallId,
                  result: event.result,
                })
                return
              }
              if (event?.type === 'finish') {
                if (!isRunActive())
                  return
                finishReason = sanitizeText(event.finishReason, 'stop')
                if (waitForTools && (finishReason === 'tool_calls' || finishReason === 'tool-calls'))
                  return
                resolveOnce()
                return
              }
              if (event?.type === 'error') {
                if (!isRunActive())
                  return
                rejectOnce(event.error ?? new Error('chat stream error'))
              }
            },
          })).catch((nextError) => {
            if (!isRunActive())
              return
            rejectOnce(nextError)
          })
        })

        if (!sawProgressEvent && isRunActive())
          throw createAbortError('chat-first-event-timeout')

        emitChatFinish(key, {
          status: 'completed',
          finishReason,
          fullText: fullText || undefined,
        })
      }
      catch (error) {
        if (!prepared) {
          const reason = error instanceof Error ? error.message : String(error)
          emitChatStreamEventForState(chatRuns.get(key), 'error', {
            cardId: payload.cardId,
            turnId: payload.turnId,
            error: reason,
          })
          emitChatFinish(key, {
            status: 'failed',
            finishReason: 'prepare-failed',
            error: reason,
          })
          await appendRuntimeDebugLine('chat-start.prepare-failed', {
            cardId: payload.cardId,
            turnId: payload.turnId,
            reason,
          })
          return
        }

        const aborted = isAbortError(error) || controller.signal.aborted
        if (aborted) {
          const abortReasonText = String(controller.signal.reason ?? (error instanceof Error ? error.message : 'abort'))
          const normalizedAbortReason = abortReasonText.includes('chat-first-event-timeout')
            ? 'chat-first-event-timeout'
            : 'abort'

          if (normalizedAbortReason === 'chat-first-event-timeout' && chatConfig) {
            try {
              const recoveredText = await recoverMainChatFromTimeout({
                chatConfig,
                messages,
                headers: mainGateway.headers,
                timeoutMs: timeoutRecoveryMs,
                cardId: payload.cardId,
                turnId: payload.turnId,
              })
              if (recoveredText) {
                if (isRunActive()) {
                  emitChatStreamEventForState(chatRuns.get(key), 'chunk', {
                    cardId: payload.cardId,
                    turnId: payload.turnId,
                    text: recoveredText,
                  })
                }
                void queueScopedAuditLog(payload.cardId, {
                  level: 'warning',
                  category: 'alicization.main-gateway',
                  action: 'stream-timeout-recovered',
                  message: 'Recovered chat turn via one-shot generation after stream first-event timeout.',
                  payload: {
                    cardId: payload.cardId,
                    turnId: payload.turnId,
                    providerId: payload.providerId,
                    model: payload.model,
                    recoveredChars: recoveredText.length,
                    nonProgressEventTypes: [...nonProgressEventTypes],
                  },
                })
                await appendRuntimeDebugLine('chat-stream.timeout-recovered', {
                  cardId: payload.cardId,
                  turnId: payload.turnId,
                  recoveredChars: recoveredText.length,
                  nonProgressEventTypes: [...nonProgressEventTypes],
                })
                emitChatFinish(key, {
                  status: 'completed',
                  finishReason: 'timeout-recovered',
                  fullText: recoveredText,
                })
                return
              }
            }
            catch (recoveryError) {
              void queueScopedAuditLog(payload.cardId, {
                level: 'warning',
                category: 'alicization.main-gateway',
                action: 'stream-timeout-recovery-failed',
                message: 'Timeout recovery attempt failed; emitting aborted finish.',
                payload: {
                  cardId: payload.cardId,
                  turnId: payload.turnId,
                  providerId: payload.providerId,
                  model: payload.model,
                  reason: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
                  nonProgressEventTypes: [...nonProgressEventTypes],
                },
              })
              await appendRuntimeDebugLine('chat-stream.timeout-recovery-failed', {
                cardId: payload.cardId,
                turnId: payload.turnId,
                reason: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
                nonProgressEventTypes: [...nonProgressEventTypes],
              })
            }
          }

          emitChatFinish(key, {
            status: 'aborted',
            finishReason: normalizedAbortReason,
          })
          return
        }

        const reason = error instanceof Error ? error.message : String(error)
        emitChatStreamEventForState(chatRuns.get(key), 'error', {
          cardId: payload.cardId,
          turnId: payload.turnId,
          error: reason,
        })
        emitChatFinish(key, {
          status: 'failed',
          finishReason: 'error',
          error: reason,
        })
        await appendRuntimeDebugLine('chat-stream.failed', {
          cardId: payload.cardId,
          turnId: payload.turnId,
          reason,
        })
      }
    })()

    const eagerGovernance = await Promise.race([
      preparationPromise
        .then(result => result.governance ?? null)
        .catch(() => null),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 40)),
    ])

    return {
      accepted: true,
      turnId: payload.turnId,
      state: 'accepted',
      governance: eagerGovernance ?? null,
    }
  }

  async function handleDirectChatStart(
    ipcMainEvent: IpcMainInvokeEvent,
    payload: AlicizationChatStartPayload,
  ): Promise<AlicizationChatStartResult> {
    const cardId = normalizeCardId(payload.cardId)
    const startedAt = Date.now()
    await appendRuntimeDebugLine('chat-start.direct-requested', {
      cardId,
      turnId: payload.turnId,
      providerId: sanitizeText(payload.providerId),
      model: sanitizeText(payload.model),
      messageCount: Array.isArray(payload.messages) ? payload.messages.length : 0,
    })

    try {
      const result = await startMainChatStream({
        ...payload,
        cardId,
      }, {
        raw: {
          ipcMainEvent: ipcMainEvent as unknown as IpcMainEvent,
        },
      })
      await appendRuntimeDebugLine('chat-start.direct-resolved', {
        cardId,
        turnId: payload.turnId,
        accepted: result.accepted,
        state: result.state,
        elapsedMs: Date.now() - startedAt,
      })
      return result
    }
    catch (error) {
      await appendRuntimeDebugLine('chat-start.direct-failed', {
        cardId,
        turnId: payload.turnId,
        elapsedMs: Date.now() - startedAt,
        reason: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async function handleDirectChatAbort(payload: AlicizationChatAbortPayload): Promise<AlicizationChatAbortResult> {
    const key = createChatRunKey(payload.cardId, payload.turnId)
    const run = chatRuns.get(key)
    if (!run) {
      if (hasRecentlyFinishedChatRun(key)) {
        return {
          accepted: false,
          state: 'finished',
        }
      }
      return {
        accepted: false,
        state: 'not-found',
      }
    }
    if (run.state === 'finished') {
      return {
        accepted: false,
        state: 'finished',
      }
    }
    run.state = 'aborted'
    run.controller.abort(createAbortError(payload.reason ?? 'manual'))
    await appendRuntimeDebugLine('chat-abort.accepted', {
      cardId: payload.cardId,
      turnId: payload.turnId,
      reason: payload.reason ?? 'manual',
      transport: 'direct',
    })
    emitChatFinish(key, {
      status: 'aborted',
      finishReason: payload.reason ?? 'manual',
    })
    return {
      accepted: true,
      state: 'aborted',
    }
  }

  const cardIdFrom = (scope?: Partial<AlicizationCardScope>) => normalizeCardId(scope?.cardId)

  defineInvokeHandler(context, electronAlicizationBootstrap, async (scope) => {
    return await withCardScope(cardIdFrom(scope), async () => await bootstrap())
  })

  defineInvokeHandler(context, electronAlicizationGetSoul, async (scope) => {
    return await withCardScope(cardIdFrom(scope), async () => {
      if (!soulSnapshot)
        return await bootstrap()
      return {
        ...soulSnapshot,
        watching,
      }
    })
  })

  defineInvokeHandler(context, electronAlicizationInitializeGenesis, async (payload) => {
    const { cardId, ...genesisPayload } = payload
    return await withCardScope(cardId, async () => await initializeGenesis(genesisPayload))
  })

  defineInvokeHandler(context, electronAlicizationUpdateSoul, async (payload) => {
    const { cardId, ...updatePayload } = payload
    return await withCardScope(cardId, async () => {
      return await queueSoulMutation(async (current) => {
        if (updatePayload.expectedRevision != null && updatePayload.expectedRevision !== current.revision) {
          throw new Error(`SOUL revision mismatch. expected=${updatePayload.expectedRevision} actual=${current.revision}`)
        }

        const parsed = parseSoul(updatePayload.content)
        const syncedBody = syncPersonalityBaselineInBody(parsed.body, parsed.frontmatter.personality)
        const content = toSoulContent(parsed.frontmatter, syncedBody)
        return snapshotFromContent(content)
      })
    })
  })

  defineInvokeHandler(context, electronAlicizationUpdatePersonality, async (payload) => {
    const { cardId, ...updatePayload } = payload
    return await withCardScope(cardId, async () => {
      return await queueSoulMutation(async (current) => {
        if (updatePayload.expectedRevision != null && updatePayload.expectedRevision !== current.revision) {
          throw new Error(`SOUL revision mismatch. expected=${updatePayload.expectedRevision} actual=${current.revision}`)
        }

        const parsed = parseSoul(current.content)
        const nextPersonality: AlicizationPersonalityState = {
          obedience: clamp01(parsed.frontmatter.personality.obedience + (updatePayload.deltas.obedience ?? 0)),
          liveliness: clamp01(parsed.frontmatter.personality.liveliness + (updatePayload.deltas.liveliness ?? 0)),
          sensibility: clamp01(parsed.frontmatter.personality.sensibility + (updatePayload.deltas.sensibility ?? 0)),
        }
        const nextFrontmatter: AlicizationSoulFrontmatter = {
          ...parsed.frontmatter,
          personality: nextPersonality,
        }
        const syncedBody = syncPersonalityBaselineInBody(parsed.body, nextPersonality)
        const content = toSoulContent(nextFrontmatter, syncedBody)
        return snapshotFromContent(content)
      })
    })
  })

  defineInvokeHandler(context, electronAlicizationKillSwitchGetState, async scope => await withCardScope(cardIdFrom(scope), async () => getScopedKillSwitchSnapshot()))
  defineInvokeHandler(context, electronAlicizationKillSwitchSuspend, async payload => await withCardScope(cardIdFrom(payload), async () => await suspendKillSwitch(payload?.reason ?? 'manual')))
  defineInvokeHandler(context, electronAlicizationKillSwitchResume, async payload => await withCardScope(cardIdFrom(payload), async () => await resumeKillSwitch(payload?.reason ?? 'manual')))

  defineInvokeHandler(context, electronAlicizationGetMemoryStats, async scope => await withCardScope(cardIdFrom(scope), async () => await alicizationDb.getMemoryStats()))
  defineInvokeHandler(context, electronAlicizationGetOrganicMemorySnapshot, async scope => await withCardScope(cardIdFrom(scope), async () => await getOrganicMemorySnapshot()))
  defineInvokeHandler(context, electronAlicizationGetPerformanceManifest, async scope => await withCardScope(cardIdFrom(scope), async () => await getPerformanceManifest()))
  defineInvokeHandler(context, electronAlicizationGetSensorySnapshot, async (scope) => {
    return await withCardScope(cardIdFrom(scope), async () => {
      let snapshot = sensoryBus.getSnapshot()
      if (snapshot.stale && snapshot.running && !isAlicizationKillSwitchSuspended()) {
        try {
          await sensoryBus.refreshNow({ force: true, timeoutMs: 1_200 })
        }
        catch (error) {
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.sensory',
            action: 'refresh-stale-failed',
            message: 'Failed to refresh stale sensory snapshot before renderer request.',
            payload: {
              reason: error instanceof Error ? error.message : String(error),
            },
          })
        }
        snapshot = sensoryBus.getSnapshot()
      }
      await rememberPerceptionObservation({
        cardId: activeCardId,
        now: Number(snapshot.sample.collectedAt || Date.now()),
        target: snapshot.sample.foregroundWindow,
        source: 'sensory-snapshot',
      })
      return snapshot
    })
  })
  defineInvokeHandler(context, electronAlicizationGetVisualPresenceState, async (scope) => {
    return await withCardScope(cardIdFrom(scope), async () => await ensureVisualPresenceState(activeCardId))
  })
  defineInvokeHandler(context, electronAlicizationUpdateMemoryStats, async payload => await withCardScope(payload.cardId, async () => await alicizationDb.overrideMemoryStats(payload)))
  defineInvokeHandler(context, electronAlicizationRunMemoryPrune, async scope => await withCardScope(cardIdFrom(scope), async () => await alicizationDb.runMemoryPrune()))
  defineInvokeHandler(context, electronAlicizationMemoryRetrieveFacts, async payload => await withCardScope(payload.cardId, async () => await alicizationDb.retrieveMemoryFacts(payload.query, payload.limit)))
  defineInvokeHandler(context, electronAlicizationMemoryUpsertFacts, async (payload: AlicizationMemoryUpsertFactsPayload) => await withCardScope(payload.cardId, async () => {
    await alicizationDb.upsertMemoryFacts(payload.facts, payload.source)

    if (payload.source !== 'async-llm')
      return

    const decisionTraceId = sanitizeMindGovernanceDecisionTraceId(payload.trace?.decisionTraceId)
    if (!decisionTraceId)
      return

    const turnId = sanitizeText(payload.trace?.turnId) || null
    const sessionId = normalizeSessionId(payload.trace?.sessionId) || null
    const origin = payload.trace?.origin === 'subconscious-proactive' || payload.trace?.origin === 'system'
      ? payload.trace.origin
      : 'user-turn'
    const trigger = payload.trace?.trigger === 'batch' || payload.trace?.trigger === 'idle' || payload.trace?.trigger === 'force' || payload.trace?.trigger === 'manual'
      ? payload.trace.trigger
      : null
    const batchSize = Number.isFinite(payload.trace?.batchSize)
      ? Math.max(0, Math.floor(Number(payload.trace?.batchSize)))
      : null
    const extractedCount = Number.isFinite(payload.trace?.extractedCount)
      ? Math.max(0, Math.floor(Number(payload.trace?.extractedCount)))
      : null
    const batchPriority = payload.trace?.batchPriority && typeof payload.trace.batchPriority === 'object'
      ? {
          max: Number.isFinite(payload.trace.batchPriority.max) ? Number(payload.trace.batchPriority.max) : 0,
          min: Number.isFinite(payload.trace.batchPriority.min) ? Number(payload.trace.batchPriority.min) : 0,
          avg: Number.isFinite(payload.trace.batchPriority.avg) ? Number(payload.trace.batchPriority.avg) : 0,
        }
      : null

    const event: AlicizationMindTurnEventInput = {
      decisionTraceId,
      turnId,
      sessionId,
      origin,
      kind: 'memory-facts-upserted',
      payload: {
        source: payload.source,
        trigger,
        factInputCount: payload.facts.length,
        extractedCount,
        batchSize,
        batchPriority,
      },
      createdAt: Date.now(),
    }

    try {
      await alicizationDb.appendMindTurnEvents([event])
    }
    catch (error) {
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.memory',
        action: 'mind-turn-memory-event-append-failed',
        message: 'Failed to append memory upsert trace event for async extraction facts.',
        payload: {
          decisionTraceId,
          turnId,
          sessionId,
          reason: errorMessageFrom(error) ?? 'unknown-error',
        },
      })
    }
  }))
  defineInvokeHandler(context, electronAlicizationMemoryImportLegacy, async payload => await withCardScope(payload.cardId, async () => await alicizationDb.importLegacyMemory(payload)))
  defineInvokeHandler(context, electronAlicizationSearchOrganicSubconsciousFragments, async payload => await withCardScope(payload.cardId, async () => await searchOrganicSubconsciousFragments(payload.query, payload.limit)))
  defineInvokeHandler(context, electronAlicizationSetPerformanceManifest, async payload => await withCardScope(payload.cardId, async () => await setPerformanceManifest(payload.manifest)))
  defineInvokeHandler(context, electronAlicizationReminderSchedule, async (payload: AlicizationReminderSchedulePayload) => {
    const cardId = cardIdFrom(payload)
    return await scheduleReminderTask(cardId, {
      minutes: payload.minutes,
      message: payload.message,
      sourceTurnId: payload.sourceTurnId,
    }, 'manual-fallback')
  })
  defineInvokeHandler(context, electronAlicizationSetActiveSession, async payload => await withCardScope(payload.cardId, async () => await persistActiveSessionId(activeCardId, payload.sessionId)))
  defineInvokeHandler(context, electronAlicizationAppendConversationTurn, async (payload) => {
    await withCardScope(payload.cardId, async () => {
      await appendConversationTurnWithGuards(payload)
    })
  })
  defineInvokeHandler(context, electronAlicizationAckDialogue, async payload => await withCardScope(payload.cardId, async () => {
    const sessionId = normalizeSessionId(payload.sessionId)
    const turnId = sanitizeText(payload.turnId)
    const createdAt = Number.isFinite(payload.createdAt)
      ? Math.max(0, Math.floor(Number(payload.createdAt)))
      : 0
    if (!sessionId || !turnId || createdAt <= 0)
      return

    const ackMap = getDialogueAckMap(activeCardId)
    const previousCursor = getDialogueAckCursor(activeCardId, sessionId)
    const nextCursor = Math.max(previousCursor, createdAt)
    await appendRuntimeDebugLine('dialogue-ack.received', {
      cardId: activeCardId,
      sessionId,
      turnId,
      createdAt,
      previousCursor,
      nextCursor,
    })
    if (nextCursor !== previousCursor) {
      ackMap.set(sessionId, nextCursor)
      await persistDialogueAckMap(activeCardId)
    }

    let cleared = 0
    for (const entry of pendingDialogueDeliveries.values()) {
      if (normalizeCardId(entry.payload.cardId) !== activeCardId)
        continue
      if (normalizeSessionId(entry.payload.sessionId) !== sessionId)
        continue
      if (entry.payload.createdAt <= nextCursor) {
        clearPendingDialogueDelivery(entry)
        cleared += 1
      }
    }
    await appendRuntimeDebugLine('dialogue-delivery.acked-cleared', {
      cardId: activeCardId,
      sessionId,
      turnId,
      ackCursor: nextCursor,
      cleared,
      remainingPending: pendingDialogueDeliveries.size,
    })
  }))
  defineInvokeHandler(context, electronAlicizationReportProactiveFeedback, async (payload: AlicizationProactiveFeedbackPayload) => await withCardScope(payload.cardId, async () => {
    const turnId = sanitizeText(payload.turnId)
    if (!turnId || (payload.feedback !== 'dismiss' && payload.feedback !== 'positive'))
      return

    const current = await ensureProactiveLoopState(activeCardId)
    const settled = reportExplicitProactiveFeedback(current, {
      turnId,
      feedback: payload.feedback,
      at: Date.now(),
    })
    if (settled.appliedOutcomes.length === 0)
      return

    await persistProactiveLoopState(activeCardId, settled.state)
    await appendAuditLog({
      level: 'notice',
      category: 'alicization.subconscious',
      action: 'proactive-feedback-explicit',
      message: 'Applied explicit proactive feedback from renderer bubble action.',
      payload: {
        turnId,
        feedback: payload.feedback,
        outcomes: settled.appliedOutcomes,
      },
    })
    queueSubconsciousWake(activeCardId, `feedback:${payload.feedback}`, 300)
  }))
  defineInvokeHandler(context, electronAlicizationReplayDialogues, async payload => await withCardScope(payload.cardId, async () => {
    const sessionId = normalizeSessionId(payload.sessionId)
    if (!sessionId)
      return [] as AlicizationDialogueRespondedPayload[]

    const ackCursor = getDialogueAckCursor(activeCardId, sessionId)
    const limit = Math.max(1, Math.min(500, Math.floor(payload.limit ?? 200)))
    await appendRuntimeDebugLine('dialogue-replay.requested', {
      cardId: activeCardId,
      sessionId,
      ackCursor,
      limit,
    })
    const rows = await alicizationDb.listConversationTurnsBySession(sessionId, {
      sinceCreatedAt: ackCursor + 1,
      limit,
    })
    const performanceManifest = await getPerformanceManifest()
    const replayRows = rows
      .map(row => toReplayDialogueRespondedPayload(row, performanceManifest))
      .filter((item): item is AlicizationDialogueRespondedPayload => Boolean(item))
    await appendRuntimeDebugLine('dialogue-replay.returned', {
      cardId: activeCardId,
      sessionId,
      ackCursor,
      requestedLimit: limit,
      rawRows: rows.length,
      replayRows: replayRows.length,
    })
    return replayRows
  }))
  defineInvokeHandler(context, electronAlicizationClearAllConversations, async () => await withCardScope(activeCardId, async () => {
    await clearAllConversationData('renderer')
  }, {
    label: 'conversation-clear-all',
  }))
  defineInvokeHandler(context, electronAlicizationListConversationTurns, async payload => await withCardScope(payload.cardId, async () => {
    const rows = await alicizationDb.listConversationTurnsBySession(payload.sessionId, {
      sinceCreatedAt: payload.sinceCreatedAt,
      limit: payload.limit,
    })
    return rows.map((row): AlicizationConversationTurnRecord => {
      const structured = parseStructuredHint(row.structuredJson)
      const hasStructured = Object.keys(structured).length > 0
      return {
        turnId: row.turnId,
        sessionId: row.sessionId,
        userText: row.userText,
        assistantText: row.assistantText,
        structured: hasStructured ? structured : null,
        createdAt: row.createdAt,
      }
    })
  }))
  defineInvokeHandler(context, electronAlicizationListMindTurnEvents, async (payload: AlicizationListMindTurnEventsPayload) => await withCardScope(payload.cardId, async () => {
    const rows = await alicizationDb.listMindTurnEvents({
      decisionTraceId: payload.decisionTraceId,
      turnId: payload.turnId,
      limit: payload.limit,
    })
    return rows as AlicizationMindTurnEventRecord[]
  }))
  defineInvokeHandler(context, electronAlicizationAppendAuditLog, async payload => await withCardScope(payload.cardId, async () => await alicizationDb.appendAuditLog(payload)))
  defineInvokeHandler(context, electronAlicizationRealtimeExecute, async (payload) => {
    return await withCardScope(payload.cardId, async () => {
      const result = await executeBuiltinRealtimeQuery(payload)
      await appendAuditLog({
        level: result.ok ? 'notice' : 'warning',
        category: 'realtime-builtin',
        action: result.ok ? 'execute-success' : 'execute-failed',
        message: result.ok
          ? `Builtin realtime ${payload.category} execution succeeded.`
          : `Builtin realtime ${payload.category} execution failed.`,
        payload: {
          category: payload.category,
          ok: result.ok,
          errorCode: result.errorCode,
          durationMs: result.durationMs,
        },
      })
      return result
    })
  })
  defineInvokeHandler(context, electronAlicizationDeleteCardScope, async payload => await withCardScope(defaultAlicizationCardId, async () => {
    const targetCardId = normalizeCardId(payload?.cardId)
    if (targetCardId === activeCardId) {
      await switchCardScope(defaultAlicizationCardId)
    }
    await rm(resolveCardPaths(targetCardId).soulRoot, { recursive: true, force: true })
    proactiveLoopStateByCard.delete(targetCardId)
    perceptionStateByCard.delete(targetCardId)
    visualPresenceStateByCard.delete(targetCardId)
    screenSemanticCacheByCard.delete(targetCardId)
    subconsciousStateByCard.delete(targetCardId)
    activeSessionIdByCard.delete(targetCardId)
    dialogueAckByCard.delete(targetCardId)
    if (targetCardId === defaultAlicizationCardId) {
      await switchCardScope(defaultAlicizationCardId)
      await bootstrap()
    }
  }))
  defineInvokeHandler(context, electronAlicizationDeleteAllData, async () => await withCardScope(defaultAlicizationCardId, async () => {
    await deleteAllAlicizationData('renderer')
  }, {
    label: 'delete-all-data',
  }))
  defineInvokeHandler(context, electronAlicizationSubconsciousGetState, async scope => await withCardScope(cardIdFrom(scope), async () => {
    const state = await ensureSubconsciousState(activeCardId)
    return {
      cardId: activeCardId,
      boredom: state.boredom,
      loneliness: state.loneliness,
      fatigue: state.fatigue,
      lastTickAt: state.lastTickAt,
      lastInteractionAt: state.lastInteractionAt,
      lastSavedAt: state.lastSavedAt,
      updatedAt: state.updatedAt,
    } satisfies AlicizationSubconsciousStatePayload
  }))
  defineInvokeHandler(context, electronAlicizationSubconsciousForceTick, async scope => await runSubconsciousTickAcrossCards('force', [cardIdFrom(scope)]))
  defineInvokeHandler(context, electronAlicizationSubconsciousForceDream, async (payload) => {
    const targetCardId = sanitizeText(payload?.cardId)
    return await runDreamAcrossCards(payload?.reason ?? 'force', targetCardId ? [targetCardId] : undefined)
  })
  defineInvokeHandler(context, electronAlicizationLlmSyncConfig, async (payload) => {
    activeProviderId = sanitizeText(payload.activeProviderId)
    activeModelId = sanitizeText(payload.activeModelId)
    providerCredentials = normalizeProviderCredentialsMap(payload.providerCredentials)
    await persistLlmConfigToDisk()
  })
  defineInvokeHandler(context, electronAlicizationLlmGetConfig, async () => {
    return {
      activeProviderId,
      activeModelId,
      providerCredentials,
    }
  })
  defineInvokeHandler(context, electronAlicizationChatStart, async (payload, eventaOptions) => {
    const cardId = normalizeCardId(payload.cardId)
    return await withCardScope(cardId, async () => {
      const startedAt = Date.now()
      await appendRuntimeDebugLine('chat-start.invoke-requested', {
        cardId,
        turnId: payload.turnId,
        providerId: sanitizeText(payload.providerId),
        model: sanitizeText(payload.model),
        activeCardId,
      })

      try {
        const result = await startMainChatStream({
          ...payload,
          cardId,
        }, eventaOptions)
        await appendRuntimeDebugLine('chat-start.invoke-resolved', {
          cardId,
          turnId: payload.turnId,
          state: result.state,
          accepted: result.accepted,
          elapsedMs: Date.now() - startedAt,
          activeCardId,
        })
        return result
      }
      catch (error) {
        await appendRuntimeDebugLine('chat-start.invoke-failed', {
          cardId,
          turnId: payload.turnId,
          elapsedMs: Date.now() - startedAt,
          reason: error instanceof Error ? error.message : String(error),
          activeCardId,
        })
        throw error
      }
    }, {
      label: `chat-start:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })
  })
  defineInvokeHandler(context, electronAlicizationChatAbort, async payload => await handleDirectChatAbort(payload))

  if (typeof ipcMain.removeHandler === 'function') {
    ipcMain.removeHandler(alicizationChatStartInvokeChannel)
    ipcMain.removeHandler(alicizationChatAbortInvokeChannel)
  }
  if (typeof ipcMain.handle === 'function') {
    ipcMain.handle(alicizationChatStartInvokeChannel, async (ipcMainEvent, payload: AlicizationChatStartPayload) => await handleDirectChatStart(ipcMainEvent, payload))
    ipcMain.handle(alicizationChatAbortInvokeChannel, async (_ipcMainEvent, payload: AlicizationChatAbortPayload) => await handleDirectChatAbort(payload))
  }

  await restoreScopedKillSwitch(activeCardId)
  await restoreActiveSessionId(activeCardId)
  await restoreDialogueAckMap(activeCardId)
  await restoreSubconsciousState(activeCardId)
  await restoreProactiveLoopState(activeCardId)
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
    await flushSubconsciousStatesAcrossCards('app-before-quit').catch(() => {})
    stopWatch()
    sensoryBus.stop('shutdown')
    turnWriteAbortControllers.clear()
    for (const pending of pendingDialogueDeliveries.values())
      clearPendingDialogueDelivery(pending)
    pendingDialogueDeliveries.clear()
    chatRuns.clear()
    recentlyFinishedChatRuns.clear()
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
    void alicizationDb.close().catch((error) => {
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
      action: 'prune-startup-failed',
      message: 'Startup memory prune failed.',
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
  startPruneTimer()
  startSubconsciousTimer()
  startDreamTimer()
  emitKillSwitchChanged()

  // `fs.watch` is only enabled after Genesis is completed.
  await ensureWatchState()
}
