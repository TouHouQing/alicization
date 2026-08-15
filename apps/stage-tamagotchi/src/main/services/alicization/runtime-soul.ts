import type { AlicizationClaimEvidenceGraph, AlicizationMemoryResolutionLedger, AlicizationMemorySituationCandidateSet, AlicizationOrganicMemoryStageReplay, AlicizationRecallLatencyPolicySnapshot } from '@proj-alicization/stage-shared'
import type { createOpenAI } from '@xsai-ext/providers/create'
import type { Message, ToolChoice } from '@xsai/shared-chat'
import type { tool } from '@xsai/tool'
import type { DesktopCapturerSource, IpcMainEvent, WebContents } from 'electron'

import type {
  AlicizationActiveThought,
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationChatStartResult,
  AlicizationChatStreamDispatchPayload,
  AlicizationChatToolProgressInput,
  AlicizationDerivedMindStateBundle,
  AlicizationDialogueRespondedPayload,
  AlicizationEpisodicEventRecord,
  AlicizationGender,
  AlicizationHostPersonModelSnapshot,
  AlicizationLearningExecutionStateSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMemoryDeliberation,
  AlicizationMemoryFact,
  AlicizationMemoryRecollectionIntentSnapshot,
  AlicizationMemoryReflectionRecord,
  AlicizationPersonalityState,
  AlicizationRecollectionNarrativeSnapshot,
  AlicizationRecollectionPlan,
  AlicizationRecollectionSpeechPlan,
  AlicizationRelationshipOutcomeRecord,
  AlicizationRuntimeDigest,
  AlicizationSelfEvolutionKernelSnapshot,
  AlicizationSoulFrontmatter,
  AlicizationSoulSnapshot,
  AlicizationSubconsciousFragment,
  AlicizationSubconsciousNeedsState,
} from '../../../shared/eventa'
import type { AlicizationExecutionPayoffStructured } from './execution-delivery-surface'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type {
  AlicizationScreenSemanticFocusTarget,
  AlicizationScreenSemanticSummary,
} from './proactive-screen-semantic'
import type { AlicizationRelationshipDynamicsState } from './relationship-dynamics-state'

import { createHash } from 'node:crypto'

import {
  defaultAlicizationCustomDirectives,
  defaultAlicizationPersonality,
  defaultAlicizationProfile,
  hasAlicizationPersonaIdentity,
  resolveAlicizationPersonaKernel,
} from '@proj-alicization/stage-shared'

import { compilePersonaWorkshopAuthority } from './persona-workshop-compiler'

export {
  legacyDialogueStructuredFormats,
  normalDialogueStructuredFormats,
  supportedDialogueStructuredFormats,
} from './runtime-structured-format'

export const currentSoulSchemaVersion = 2
export const soulPersonaNotesStart = '<!-- ALICIZATION_PERSONA_NOTES_START -->'
export const soulPersonaNotesEnd = '<!-- ALICIZATION_PERSONA_NOTES_END -->'
// NOTICE: Keep reading the old persona markers so existing SOUL.md files are upgraded
// in-place the next time Alicization rewrites persona notes.
export const legacySoulPersonaNotesStart = `<!-- ${['AL', 'ICE'].join('')}_PERSONA_NOTES_START -->`
export const legacySoulPersonaNotesEnd = `<!-- ${['AL', 'ICE'].join('')}_PERSONA_NOTES_END -->`

export const defaultFrontmatter: AlicizationSoulFrontmatter = {
  schemaVersion: currentSoulSchemaVersion,
  initialized: false,
  custom_directives: defaultAlicizationCustomDirectives,
  host_attitude: '',
  core_incarnation: '',
  profile: { ...defaultAlicizationProfile },
  personality: {
    ...defaultAlicizationPersonality,
    identityKernel: {
      ...defaultAlicizationPersonality.identityKernel,
      temperament: { ...defaultAlicizationPersonality.identityKernel.temperament },
      valueBias: [...defaultAlicizationPersonality.identityKernel.valueBias],
    },
    expressionProfile: { ...defaultAlicizationPersonality.expressionProfile },
    initiativeBaseline: { ...defaultAlicizationPersonality.initiativeBaseline },
    evolutionSeed: {
      ...defaultAlicizationPersonality.evolutionSeed,
      fastLayers: [...defaultAlicizationPersonality.evolutionSeed.fastLayers],
      slowLayers: [...defaultAlicizationPersonality.evolutionSeed.slowLayers],
      unlockTracks: [...defaultAlicizationPersonality.evolutionSeed.unlockTracks],
    },
    identityAnchors: [...defaultAlicizationPersonality.identityAnchors],
    antiPersonaConstraints: [...defaultAlicizationPersonality.antiPersonaConstraints],
  },
  boundaries: {
    killSwitch: true,
    mcpGuard: true,
  },
}

export const winRenameRetryDelaysMs = [5, 10, 20, 40, 80]
export const alicizationCardKillSwitchMetaKey = 'kill_switch_state_v1'
export const alicizationCardActiveSessionMetaKey = 'active_session_id_v1'
export const alicizationSubconsciousStateMetaKey = 'subconscious_state_v1'
export const alicizationDreamLastRunMetaKey = 'subconscious_last_dreamed_at_v1'
export const alicizationDialogueAckStateMetaKey = 'dialogue_ack_state_v1'
export const alicizationDialogueReplyFeedbackAckMetaKey = 'dialogue_reply_feedback_ack_v1'
export const alicizationProactiveLoopStateMetaKey = 'proactive_loop_state_v1'
export const alicizationExecutionDeliveryStateMetaKey = 'execution_delivery_state_v1'
export const alicizationPerceptionStateMetaKey = 'perception_state_v1'
export const alicizationVisualPresenceStateMetaKey = 'visual_presence_state_v1'
export const alicizationPerformanceManifestMetaKey = 'performance_manifest_v1'
export const defaultAlicizationCardId = 'default'
export const alicizationSubconsciousTickMs = 60_000
export const alicizationSubconsciousPersistMs = 30 * 60_000
export const dreamMaxTurns = 100
export const dreamMaxCharsPerUserTurn = 320
export const dreamMaxCharsPerAssistantTurn = 360
export const dreamMaxTotalChars = 16_000
export const reminderMinMinutes = 1
export const reminderMaxMinutes = 10_080
export const reminderMaxMessageChars = 500
export const reminderClaimBatchSize = 12
export const reminderOverdueTierThresholdMinutes = 5
export const reminderLlmRetryDelayMs = 60_000
export const subconsciousInterruptionProbeTimeoutMs = 1_200
export const proactiveScreenSemanticCacheTtlMs = 45_000
export const proactiveScreenSemanticFailureTtlMs = 15_000
export const proactiveScreenSemanticTimeoutMs = 8_000
export const subjectiveInferenceTimeoutMs = 7_000
export const dialogueTurnSemanticsTimeoutMs = 7_000
export const interactiveSubjectiveInferenceTimeoutMs = 1_800
export const interactiveDialogueTurnSemanticsTimeoutMs = 1_800
export const chatRunFinishedRetentionMs = 2 * 60_000
export const mainChatPreparationTimeoutMs = 45_000
export const mainChatFirstEventTimeoutMs = 65_000
export const mainChatFirstEventTimeoutWithVisualGroundingMs = 90_000
export const mainChatProviderContinuationTimeoutMs = 180_000
export const mainChatTimeoutRecoveryMs = 12_000
export const mainChatTimeoutRecoveryWithVisualGroundingMs = 30_000
export const inspectionGroundingImageMaxWidth = 960
export const inspectionGroundingImageMaxHeight = 540
export const inspectionGroundingImageJpegQuality = 76
export const proactiveScreenSemanticImageMaxWidth = 640
export const proactiveScreenSemanticImageMaxHeight = 360
export const proactiveScreenSemanticImageJpegQuality = 68
export const dialogueDeliveryRetryBaseMs = 2_000
export const dialogueDeliveryRetryMaxMs = 60_000
export const dialogueDeliveryRetryMaxAttempts = 8

export interface SubconsciousCardState extends AlicizationSubconsciousNeedsState {
  updatedAt: number
  lastDreamedAt: number
}

export interface ChatRunState {
  cardId: string
  turnId: string
  controller: AbortController
  cancelTurn?: (reason: unknown) => Promise<boolean>
  sender?: WebContents
  rawInvokeOptions?: { ipcMainEvent?: IpcMainEvent, event?: unknown }
  hasLoggedDispatchBinding?: boolean
  errorEmitted?: boolean
  emittedToolCallIds?: Set<string>
  emittedToolResultIds?: Set<string>
  emittedToolProgressKeys?: Set<string>
  toolProjection?: import('@proj-alicization/stage-shared').AlicizationRuntimeToolProjectionReducer
  chunkCount: number
  rawChunkChars: number
  state: 'running' | 'aborted' | 'finished'
  toolProgressListeners?: Set<
    (event: Omit<AlicizationChatToolProgressInput, 'cardId' | 'turnId'>) => void
  >
}

export type StreamDispatchEventType = Exclude<AlicizationChatStreamDispatchPayload['eventType'], 'dialogue-responded'>

export interface MainGatewayResolvedConfig {
  providerId: string
  model: string
  baseUrl: string
  headers?: Record<string, string>
  probeHeaders?: Record<string, string>
  provider: ReturnType<typeof createOpenAI>
}

export interface ResolvedCardCustomDirectives {
  text: string
  source: 'card-soul' | 'payload-soul' | 'none' | 'error'
}

export interface PreparedMainChatExecution {
  chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']>
  messages: Message[]
  waitForTools: boolean
  tools: Array<Awaited<ReturnType<typeof tool>>> | undefined
  toolChoice?: ToolChoice
  customDirectivesResolution: ResolvedCardCustomDirectives
  hasVisualGrounding: boolean
  governance: AlicizationChatStartResult['governance']
  runtimeDigest?: AlicizationRuntimeDigest | null
  executionPayoffStructuredReply?: AlicizationExecutionPayoffStructured | null
}

export interface OrganicMemoryRecollectionCarry {
  afterthoughtState: 'resting' | 'ripe'
  certainty: AlicizationRecollectionPlan['certainty'] | null
  confidence: number | null
  foreground: string | null
  mode: Exclude<AlicizationMemoryRecollectionIntentSnapshot['mode'], 'none'> | null
  placement: AlicizationRecollectionSpeechPlan['placement'] | null
  surfaceMode: AlicizationRecollectionSpeechPlan['surfaceMode'] | null
  visibility: 'inward' | 'visible' | null
}

export interface OrganicMemoryPromptContext {
  decisionTraceId?: string | null
  sessionId?: string | null
  hostAttitude: string
  coreIncarnation: string
  activeThoughts: AlicizationActiveThought[]
  retrievedFacts: AlicizationMemoryFact[]
  recentMemoryReflections?: AlicizationMemoryReflectionRecord[]
  recentRelationshipOutcomes?: AlicizationRelationshipOutcomeRecord[]
  recalledFragments: AlicizationSubconsciousFragment[]
  recalledEpisodes?: AlicizationEpisodicEventRecord[]
  recollectedWindows?: Array<{
    id: string
    label: string
    summary: string
    startedAt: number
    endedAt: number
    confidence: number
    dominantProvenance: AlicizationEpisodicEventRecord['provenance']
    cues: string[]
  }>
  consolidatedMemories?: Array<{
    id: string
    kind: 'daily' | 'weekly' | 'procedural' | 'autobiographical'
    facet?: 'phase' | 'relationship-era' | 'task-era' | 'self-era' | null
    periodKey: string
    periodStartedAt: number
    periodEndedAt: number
    summary: string
    lesson: string | null
    cues: string[]
    confidence: number
    dominantProvenance: AlicizationEpisodicEventRecord['provenance']
    derivedEventIds: string[]
    updatedAt: number
    memoryTier?: 'hot' | 'warm' | 'cold' | null
  }>
  recollectionNarratives?: AlicizationRecollectionNarrativeSnapshot[]
  recollectionPlan?: AlicizationRecollectionPlan | null
  recollectionSpeechPlan?: AlicizationRecollectionSpeechPlan | null
  memoryDeliberation?: AlicizationMemoryDeliberation | null
  proceduralMemories?: Array<{
    id: string
    label: string
    approach: string
    pitfalls: string[]
    confidence: number
    cues: string[]
  }>
  knowledgeEvidence?: {
    validationCount: number
    contradictionCount: number
    stronglyValidatedProcedureCount: number
    contradictionHeavyFactCount: number
  } | null
  claimEvidenceGraphs?: AlicizationClaimEvidenceGraph[] | null
  recollectionIntent?: AlicizationMemoryRecollectionIntentSnapshot | null
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  personStateProjection?: AlicizationPersonStateProjection | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  relationshipDynamics?: AlicizationRelationshipDynamicsState | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  recallLatencyPolicy?: AlicizationRecallLatencyPolicySnapshot | null
  memoryTuningAdvice?: AlicizationMemoryTuningAdvice | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  learningExecutionState?: AlicizationLearningExecutionStateSnapshot | null
  derivedMindStateBundle?: AlicizationDerivedMindStateBundle | null
  memoryStageReplay?: AlicizationOrganicMemoryStageReplay | null
  memoryResolutionLedger?: AlicizationMemoryResolutionLedger | null
  memorySituationCandidates?: AlicizationMemorySituationCandidateSet | null
  executionCallbackCarry?: {
    carryMode: 'lower-pressure' | 'trust-warming' | 'execution-callback' | 'repair-before-closeness'
    confidence: number
    source: 'session-continuity'
    summary: string
    threadAnchor?: string | null
    episodeId?: string | null
  } | null
}

export interface ContextualConversationTurn {
  userText: string
  assistantText: string
}

export interface PendingDialogueDeliveryState {
  key: string
  payload: AlicizationDialogueRespondedPayload
  attempts: number
  timer?: ReturnType<typeof setTimeout>
}

export interface ScreenSemanticCacheState {
  focusTarget?: AlicizationScreenSemanticFocusTarget | null
  key: string
  summary: AlicizationScreenSemanticSummary | null
  updatedAt: number
  unavailableReason?: string
}

export interface DesktopCaptureAccessResult {
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

export type CardScopeLane = 'foreground' | 'background'

export interface CardScopeOptions {
  label?: string
  lane?: CardScopeLane
  skipQueueWhenScopeAlreadyActive?: boolean
}

export function normalizeCardId(raw: unknown) {
  if (typeof raw !== 'string')
    return defaultAlicizationCardId
  const trimmed = raw.trim()
  return trimmed || defaultAlicizationCardId
}

export function clamp01(value: number) {
  if (Number.isNaN(value))
    return 0
  return Math.min(1, Math.max(0, value))
}

export function sanitizeText(raw: unknown, fallback = '') {
  if (typeof raw !== 'string')
    return fallback
  return raw.trim()
}

export function sanitizeMultilineText(raw: unknown, fallback = '') {
  if (typeof raw !== 'string')
    return fallback
  return raw.replace(/\r\n/g, '\n').trim()
}

export function readRawTextDelta(raw: unknown) {
  return typeof raw === 'string' ? raw : ''
}

export function normalizeCustomDirectives(raw: unknown) {
  return sanitizeMultilineText(raw, '')
}

export function normalizeHostAttitude(raw: unknown) {
  return sanitizeText(raw, defaultFrontmatter.host_attitude)
}

export function normalizeCoreIncarnation(raw: unknown) {
  return sanitizeMultilineText(raw, defaultFrontmatter.core_incarnation)
}

export function normalizeGender(raw: unknown): AlicizationGender {
  if (raw === 'female' || raw === 'male' || raw === 'non-binary' || raw === 'neutral' || raw === 'custom')
    return raw
  return 'neutral'
}

export function normalizeMindAge(value: unknown) {
  if (!Number.isFinite(value))
    return defaultFrontmatter.profile.mindAge
  return Math.min(120, Math.max(1, Math.floor(Number(value))))
}

export function formatGender(profile: AlicizationSoulFrontmatter['profile']) {
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

export function findPersonaNotesAnchors(body: string) {
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

export function extractPersonaNotesFromBody(body: string) {
  const anchors = findPersonaNotesAnchors(body)
  if (!anchors)
    return ''
  return body
    .slice(anchors.startIndex + anchors.start.length, anchors.endIndex)
    .trim()
}

function renderTextList(values?: string[] | null) {
  const items = (values ?? []).map(item => item.trim()).filter(Boolean)
  if (items.length === 0)
    return ['- 无']
  return items.map(item => `- ${item}`)
}

function renderInlineTextList(values?: string[] | null) {
  const items = (values ?? []).map(item => item.trim()).filter(Boolean)
  return items.length === 0 ? '未定义' : items.join('、')
}

function renderInlineScalar(value: unknown, fallback: string) {
  if (typeof value === 'number')
    return Number.isFinite(value) ? value.toFixed(2) : fallback
  if (typeof value === 'string')
    return value.trim() || fallback
  return fallback
}

export function buildSoulBody(frontmatter: AlicizationSoulFrontmatter, _personaNotes: string) {
  const personality = frontmatter.personality
  const identityKernel = personality.identityKernel ?? null
  const expressionProfile = personality.expressionProfile ?? null
  const initiativeBaseline = personality.initiativeBaseline ?? null
  const evolutionSeed = personality.evolutionSeed ?? null
  return [
    '# Alicization SOUL',
    '',
    '## Persona Kernel',
    '',
    `- 关系姿态：${identityKernel?.relationshipPosture?.trim() || '未定义'}`,
    `- 主动风格：${identityKernel?.initiativeStyle?.trim() || '未定义'}`,
    `- 价值偏置：${renderInlineTextList(identityKernel?.valueBias)}`,
    `- 服从温度：${renderInlineScalar(identityKernel?.temperament?.obedience, personality.obedience.toFixed(2))}`,
    `- 活泼温度：${renderInlineScalar(identityKernel?.temperament?.liveliness, personality.liveliness.toFixed(2))}`,
    `- 感性温度：${renderInlineScalar(identityKernel?.temperament?.sensibility, personality.sensibility.toFixed(2))}`,
    '',
    '## Expression Profile',
    '',
    `- 温暖度：${renderInlineScalar(expressionProfile?.warmth, personality.sensibility.toFixed(2))}`,
    `- 直接度：${renderInlineScalar(expressionProfile?.directness, personality.obedience.toFixed(2))}`,
    `- 玩心度：${renderInlineScalar(expressionProfile?.playfulness, personality.liveliness.toFixed(2))}`,
    `- 情绪可见度：${renderInlineScalar(expressionProfile?.emotionalVisibility, personality.sensibility.toFixed(2))}`,
    '',
    '## Anti-Persona Constraints',
    '',
    ...renderTextList(personality.antiPersonaConstraints),
    '',
    '## Identity Anchors',
    '',
    ...renderTextList(personality.identityAnchors),
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
    `- 基础沉默重连：${initiativeBaseline?.silenceReconnect?.trim() || '未定义'}`,
    `- 基础安抚方式：${initiativeBaseline?.comfortStyle?.trim() || '未定义'}`,
    `- 基础嫉妒处理：${initiativeBaseline?.jealousyStyle?.trim() || '未定义'}`,
    '',
    '## Persona Evolution Seed',
    '',
    '- Fast Layers',
    ...renderTextList(evolutionSeed?.fastLayers),
    '',
    '- Slow Layers',
    ...renderTextList(evolutionSeed?.slowLayers),
    '',
    '- Unlock Tracks',
    ...renderTextList(evolutionSeed?.unlockTracks),
  ].join('\n')
}

export function resolveAlicizationSoulPersonaKernel(
  frontmatter: AlicizationSoulFrontmatter,
  options?: {
    placeholderHostAttitudes?: string[]
  },
) {
  return resolveAlicizationPersonaKernel({
    profile: frontmatter.profile,
    personality: frontmatter.personality,
    customDirectives: frontmatter.custom_directives,
    hostAttitude: frontmatter.host_attitude,
    coreIncarnation: frontmatter.core_incarnation,
  }, options)
}

export function syncPersonalityBaselineInBody(body: string, personality: AlicizationPersonalityState) {
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

export const defaultSoulBody = buildSoulBody(defaultFrontmatter, '')

export function hashContent(content: string) {
  return createHash('sha256').update(content).digest('hex')
}

export function toSoulContent(frontmatter: AlicizationSoulFrontmatter, body: string) {
  return `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n${body.trim()}\n`
}

export function parseSimpleFrontmatter(raw: string): Partial<AlicizationSoulFrontmatter> | null {
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

export function normalizeFrontmatter(raw: Partial<AlicizationSoulFrontmatter> | null | undefined): AlicizationSoulFrontmatter {
  const frontmatter = raw ?? {}
  const normalizedPersonaKernel = resolveAlicizationPersonaKernel({
    personality: frontmatter.personality,
  })
  const normalizedFrontmatter: AlicizationSoulFrontmatter = {
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
      ...normalizedPersonaKernel.personality,
    },
    boundaries: {
      killSwitch: typeof frontmatter.boundaries?.killSwitch === 'boolean' ? frontmatter.boundaries.killSwitch : defaultFrontmatter.boundaries.killSwitch,
      mcpGuard: typeof frontmatter.boundaries?.mcpGuard === 'boolean' ? frontmatter.boundaries.mcpGuard : defaultFrontmatter.boundaries.mcpGuard,
    },
  }

  if (!normalizedFrontmatter.initialized || !hasAlicizationPersonaIdentity(normalizedFrontmatter.profile))
    return normalizedFrontmatter

  const personaKernel = resolveAlicizationSoulPersonaKernel(normalizedFrontmatter, {
    placeholderHostAttitudes: [defaultFrontmatter.host_attitude],
  })
  const compiledPersonality = compilePersonaWorkshopAuthority({
    personality: normalizedFrontmatter.personality,
    personaWorkshop: null,
  })
  return {
    ...normalizedFrontmatter,
    personality: {
      ...normalizedFrontmatter.personality,
      ...compiledPersonality,
      identityKernel: {
        ...normalizedFrontmatter.personality.identityKernel,
        ...compiledPersonality.identityKernel,
        temperament: {
          ...normalizedFrontmatter.personality.identityKernel?.temperament,
          ...compiledPersonality.identityKernel?.temperament,
        },
      },
      expressionProfile: {
        ...normalizedFrontmatter.personality.expressionProfile,
        ...compiledPersonality.expressionProfile,
      },
      initiativeBaseline: {
        ...normalizedFrontmatter.personality.initiativeBaseline,
        ...compiledPersonality.initiativeBaseline,
      },
      evolutionSeed: {
        ...normalizedFrontmatter.personality.evolutionSeed,
        ...compiledPersonality.evolutionSeed,
      },
    },
    host_attitude: normalizeHostAttitude(personaKernel.hostAttitude),
    core_incarnation: normalizeCoreIncarnation(personaKernel.coreIncarnation),
  }
}

export function parseSoul(raw: string): { frontmatter: AlicizationSoulFrontmatter, body: string } {
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

export function withNeedsGenesis(snapshot: Omit<AlicizationSoulSnapshot, 'needsGenesis'>): AlicizationSoulSnapshot {
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
