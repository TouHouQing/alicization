import type {
  AlicizationAuditLogInput,
  AlicizationBridgeChatStreamEvent,
  AlicizationCardScope,
  AlicizationChatAbortResult,
  AlicizationConversationTurnInput,
  AlicizationEpisodicEventRecord,
  AlicizationGenesisInput,
  AlicizationInitializeGenesisResult,
  AlicizationKillSwitchSnapshot,
  AlicizationKillSwitchState,
  AlicizationListMemoryDecisionTracesPayload,
  AlicizationListMindTurnEventsPayload,
  AlicizationLlmConfigPayload,
  AlicizationMemoryArchiveRecord,
  AlicizationMemoryDecisionTraceRecord,
  AlicizationMemoryFact,
  AlicizationMemoryLegacySnapshot,
  AlicizationMemoryMigrationResult,
  AlicizationMindTurnEventRecord,
  AlicizationOrganicMemorySnapshot,
  AlicizationPersonalityState,
  AlicizationPersonalityUpdatePayload,
  AlicizationPresencePulsePayload,
  AlicizationRealtimeExecutePayload,
  AlicizationRealtimeExecuteResult,
  AlicizationReminderScheduleResult,
  AlicizationSensoryCacheSnapshot,
  AlicizationSoulFrontmatter,
  AlicizationSoulSnapshot,
  AlicizationSoulUpdatePayload,
  AlicizationSubconsciousFragment,
  AlicizationSubconsciousFragmentSourceKind,
  AlicizationVisualPresenceStateSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from './alicization-bridge'

import { errorMessageFrom } from '@moeru/std'
import {
  buildAlicizationFinanceSurface,
  buildAlicizationMemoryDecisionTraceRecords,
  buildAlicizationNewsSurface,
  buildAlicizationSportsSurface,
  buildAlicizationWeatherSurface,
  defaultAlicizationCustomDirectives,
  defaultAlicizationPersonality,
  defaultAlicizationProfile,
  deriveAlicizationMindParticipationFromSpine,
  extractAlicizationLocationFromQuery,
  formatAlicizationRealtimeSurfaceSummary,
  hasAlicizationPersonaIdentity,
  mapAlicizationFragmentSourceKindToProvenance,
  mapAlicizationMemorySourceToProvenance,
  resolveAlicizationPersonaKernel,
  sanitizeCharacterPerformanceManifest,
} from '@proj-alicization/stage-shared'
import { nanoid } from 'nanoid'

import {
  normalizeStructuredPreDialogueAwarenessPayload,
  normalizeStructuredPreDialogueClosurePayload,
  normalizeStructuredProjectStatePayload,
} from '../composables/alicization-structured-output'
import { storage } from '../database/storage'
import { SERVER_URL } from '../libs/auth'
import { getStageUiMessageVariants, translateStageUi } from '../utils/i18n'
import {
  clearAlicizationBridge,
  normalizeAlicizationDigitalLifeEnvelope,
  normalizeAlicizationDigitalLifeSpineDigest,
  normalizeAlicizationEmbodimentScript,
  normalizeAlicizationRuntimeDigest,
  setAlicizationBridge,
} from './alicization-bridge'
import { createAlicizationBrowserBridgePresenceComposition } from './alicization-browser-bridge-presence-composition'
import { createAlicizationBrowserBridgeStorageComposition } from './alicization-browser-bridge-storage-composition'
import {
  buildBrowserOrganicMemorySnapshot as buildBrowserOrganicMemorySnapshotProjection,
} from './alicization-browser-organic-memory'
import {
  buildBrowserFallbackDigitalLifeSpineDigest,
  buildBrowserFallbackRuntimeDigest,
} from './alicization-browser-runtime-digest'
import {
  readActiveSessionId as readActiveSessionIdFromStorage,
  readAuditLog,
  readMemoryArchive as readMemoryArchiveFromStorage,
  readMemoryFacts as readMemoryFactsFromStorage,
  readMemoryMeta as readMemoryMetaFromStorage,
  readPerformanceManifest as readPerformanceManifestFromStorage,
  writeMemoryArchive as writeMemoryArchiveToStorage,
  writeMemoryFacts as writeMemoryFactsToStorage,
  writeMemoryMeta as writeMemoryMetaToStorage,
  writePerformanceManifest as writePerformanceManifestToStorage,
} from './alicization-browser-storage'
import {
  buildAlicizationVisualPresenceStateFromSpineDigest,
  ensureAlicizationVisualPresenceResidentPerformance,
} from './alicization-visual-presence-spine'
import { useCharacterNotebookStore } from './character'
import { useAiriCardStore } from './modules/airi-card'
import {
  projectStateObservationToContinuitySnapshot,
  readConversationTurnProjectStateObservation,
} from './project-state-observation'

const currentSoulSchemaVersion = 2
const defaultAlicizationCardId = 'default'
const bridgeStorageVersion = 1
const reminderMinMinutes = 1
const reminderMaxMinutes = 10_080
const reminderMaxMessageChars = 500
const maxConversationTurns = 240
const maxAuditLogEntries = 320
const maxActiveThoughts = 8
const maxSubconsciousFragments = 180
const dayMs = 24 * 60 * 60 * 1000
const memoryColdTierThreshold = 0.72
const memoryColdTierAccessWindowDays = 14
const memoryHotTierFreshDays = 2
const browserCardsIndexKey = 'local:alicization/browser/card-ids:v1'
const browserLlmConfigKey = 'local:alicization/browser/llm-config:v1'
const realtimeRequestTimeoutMsec = 8000
const visualPresencePulseListeners = new Set<(payload: AlicizationPresencePulsePayload) => void>()
const visualPresenceStateListeners = new Set<(state: AlicizationVisualPresenceStateSnapshot | null) => void>()

type BrowserRuntimeKind = 'web' | 'mobile'

interface BrowserStreamServerErrorPayload {
  message?: string
}

type BrowserStreamServerEvent
  = AlicizationBridgeChatStreamEvent
    | { type: 'error', error?: BrowserStreamServerErrorPayload | string | null }

interface BrowserSoulRecord {
  revision: number
  content: string
}

interface BrowserEpisodicMemoryRecord {
  events: AlicizationEpisodicEventRecord[]
}

interface BrowserConversationTurnRecord extends Required<Pick<AlicizationConversationTurnInput, 'turnId' | 'sessionId' | 'createdAt'>> {
  origin: NonNullable<AlicizationConversationTurnInput['origin']>
  userText: string
  assistantText: string
  structured?: Record<string, unknown>
  visibleReplyCritic?: Record<string, unknown> | null
  visibleReplyClosure?: Record<string, unknown> | null
}

interface BrowserSessionContinuitySummary {
  sessionId: string | null
  latestOrigin: BrowserConversationTurnRecord['origin'] | null
  continuityAnchor: string | null
  threadSummary: string | null
  recollectionSummary: string | null
  proactiveSummary: string | null
  executionSummary: string | null
}

interface BrowserMindTurnEventRecord extends AlicizationMindTurnEventRecord {}

type BrowserProactiveScenario = 'coding' | 'media' | 'late-night-care' | 'general'
type BrowserProactiveOutcome = 'positive' | 'dismiss' | 'ignored' | 'reply-within-120s'

interface BrowserPendingProactiveOutcome {
  turnId: string
  scenario: BrowserProactiveScenario
  deliveredAt: number
  feedbackWindowMs: number
}

interface BrowserRecentProactiveOutcome {
  turnId: string
  scenario: BrowserProactiveScenario
  outcome: BrowserProactiveOutcome
  createdAt: number
}

interface BrowserProactiveLoopState {
  globalCooldownUntil: number
  scenarioBias: Record<BrowserProactiveScenario, number>
  consecutiveIgnored: Record<BrowserProactiveScenario, number>
  initiativeTrust: number
  openingMomentum: number
  lastProactiveTurnAt: number | null
  pendingOutcomes: BrowserPendingProactiveOutcome[]
  recentOutcomes: BrowserRecentProactiveOutcome[]
  updatedAt: number
}

interface BrowserProactiveFeedbackSummary {
  latestOutcome: BrowserRecentProactiveOutcome | null
  pendingCount: number
  shouldSuppressSpeak: boolean
  confidenceBias: number
  summary: string | null
}

const defaultFrontmatter: AlicizationSoulFrontmatter = {
  schemaVersion: currentSoulSchemaVersion,
  initialized: false,
  custom_directives: defaultAlicizationCustomDirectives,
  host_attitude: translateStageUi('stage.alicization.soul.default-host-attitude'),
  core_incarnation: '',
  profile: { ...defaultAlicizationProfile },
  personality: {
    ...defaultAlicizationPersonality,
    identityKernel: {
      ...defaultAlicizationPersonality.identityKernel,
      valueBias: [...defaultAlicizationPersonality.identityKernel.valueBias],
    },
    expressionProfile: {
      ...defaultAlicizationPersonality.expressionProfile,
    },
    initiativeBaseline: {
      ...defaultAlicizationPersonality.initiativeBaseline,
    },
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

function normalizeCardId(raw?: unknown) {
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

function stageChatText(path: string, params?: Record<string, unknown>) {
  return translateStageUi(`stage.chat.${path}`, params)
}

function stageSoulText(path: string, params?: Record<string, unknown>) {
  return translateStageUi(`stage.alicization.soul.${path}`, params)
}

function createAbortError(reason = '') {
  const resolvedReason = reason.trim() || stageChatText('stream.reason-aborted')
  return new DOMException(stageChatText('stream.turn-aborted', { reason: resolvedReason }), 'AbortError')
}

function normalizeServerStreamError(error: unknown) {
  if (typeof error === 'string')
    return new Error(error)

  const message = typeof error === 'object' && error && 'message' in error
    ? errorMessageFrom((error as { message?: unknown }).message)
    : errorMessageFrom(error)

  return new Error(message ?? stageChatText('stream.server-failed'))
}

function resolveNormalizedBridgeDigitalLife(input: {
  digitalLife: unknown
  embodimentScript: unknown
}) {
  const normalizedDigitalLife = normalizeAlicizationDigitalLifeEnvelope(
    input.digitalLife && typeof input.digitalLife === 'object'
      ? input.digitalLife as Record<string, unknown>
      : null,
  )
  if (normalizedDigitalLife)
    return normalizedDigitalLife

  const normalizedEmbodimentScript = normalizeAlicizationEmbodimentScript(input.embodimentScript)
  return normalizeAlicizationDigitalLifeEnvelope(
    (normalizedEmbodimentScript?.digitalLife ?? null) as Record<string, unknown> | null,
  )
}

function normalizeServerStreamEvent(raw: unknown): AlicizationBridgeChatStreamEvent {
  if (!raw || typeof raw !== 'object')
    throw new Error(stageChatText('stream.invalid-event'))

  const event = raw as BrowserStreamServerEvent
  switch (event.type) {
    case 'text-delta':
      return {
        type: 'text-delta',
        text: typeof event.text === 'string' ? event.text : '',
      }
    case 'meta': {
      const normalizedEmbodimentScript = normalizeAlicizationEmbodimentScript(event.embodimentScript)
      return {
        type: 'meta',
        governance: event.governance && typeof event.governance === 'object'
          ? event.governance
          : null,
        embodiment: event.embodiment && typeof event.embodiment === 'object'
          ? event.embodiment
          : null,
        embodimentScript: normalizedEmbodimentScript,
        speechTimeline: event.speechTimeline && typeof event.speechTimeline === 'object'
          ? event.speechTimeline
          : null,
        digitalLife: resolveNormalizedBridgeDigitalLife({
          digitalLife: event.digitalLife,
          embodimentScript: normalizedEmbodimentScript,
        }),
        digitalLifeSpine: normalizeAlicizationDigitalLifeSpineDigest(event.digitalLifeSpine),
        runtimeDigest: normalizeAlicizationRuntimeDigest(event.runtimeDigest),
      }
    }
    case 'tool-call':
      return {
        type: 'tool-call',
        toolCallId: typeof event.toolCallId === 'string' ? event.toolCallId : '',
        toolName: typeof event.toolName === 'string' ? event.toolName : '',
        args: typeof event.args === 'string' ? event.args : '',
        toolCallType: 'function',
      }
    case 'tool-result':
      return {
        type: 'tool-result',
        toolCallId: typeof event.toolCallId === 'string' ? event.toolCallId : '',
        result: event.result,
      }
    case 'finish':
      return {
        type: 'finish',
      }
    case 'error':
      throw normalizeServerStreamError(event.error)
    default:
      throw new Error(stageChatText('stream.unsupported-event'))
  }
}

function normalizeCustomDirectives(raw: unknown) {
  return sanitizeMultilineText(raw, '')
}

function normalizeHostAttitude(raw: unknown) {
  return sanitizeText(raw, stageSoulText('default-host-attitude')).slice(0, 50)
}

function normalizeCoreIncarnation(raw: unknown) {
  return sanitizeMultilineText(raw, defaultFrontmatter.core_incarnation).slice(0, 500)
}

function normalizeMindAge(value: unknown) {
  if (!Number.isFinite(value))
    return defaultFrontmatter.profile.mindAge
  return Math.min(120, Math.max(1, Math.floor(Number(value))))
}

function normalizeGender(raw: unknown): AlicizationSoulFrontmatter['profile']['gender'] {
  if (raw === 'female' || raw === 'male' || raw === 'non-binary' || raw === 'neutral' || raw === 'custom')
    return raw
  return 'neutral'
}

function formatGender(profile: AlicizationSoulFrontmatter['profile']) {
  if (profile.gender === 'female')
    return stageSoulText('gender.female')
  if (profile.gender === 'male')
    return stageSoulText('gender.male')
  if (profile.gender === 'non-binary')
    return stageSoulText('gender.non-binary')
  if (profile.gender === 'custom')
    return profile.genderCustom.trim() || stageSoulText('gender.custom')
  return stageSoulText('gender.neutral')
}

function buildSoulBody(frontmatter: AlicizationSoulFrontmatter) {
  return [
    stageSoulText('title'),
    '',
    stageSoulText('description'),
    '',
    `## ${stageSoulText('sections.identity')}`,
    '',
    `- ${stageSoulText('labels.name')}: ${frontmatter.profile.alicizationName}`,
    `- ${stageSoulText('labels.gender')}: ${formatGender(frontmatter.profile)}`,
    `- ${stageSoulText('labels.mind-age')}: ${frontmatter.profile.mindAge}`,
    `- ${stageSoulText('labels.relationship')}: ${frontmatter.profile.relationship}`,
    '',
    `## ${stageSoulText('sections.host-bond')}`,
    '',
    `- ${stageSoulText('labels.owner-name')}: ${frontmatter.profile.ownerName}`,
    `- ${stageSoulText('labels.host-name')}: ${frontmatter.profile.hostName}`,
    `- ${stageSoulText('labels.alicization-name')}: ${frontmatter.profile.alicizationName}`,
    '',
    `## ${stageSoulText('sections.personality-baseline')}`,
    '',
    `- ${stageSoulText('labels.obedience')}: ${frontmatter.personality.obedience.toFixed(2)}`,
    `- ${stageSoulText('labels.liveliness')}: ${frontmatter.personality.liveliness.toFixed(2)}`,
    `- ${stageSoulText('labels.sensibility')}: ${frontmatter.personality.sensibility.toFixed(2)}`,
    '',
    `## ${stageSoulText('sections.boundary')}`,
    '',
    `- ${stageSoulText('bullets.boundary-privacy')}`,
    `- ${stageSoulText('bullets.boundary-confirm')}`,
    `- ${stageSoulText('bullets.boundary-kill-switch')}`,
    '',
    `## ${stageSoulText('sections.output-contract')}`,
    '',
    `- ${stageSoulText('bullets.output-contract-structured')}`,
    `- ${stageSoulText('bullets.output-contract-persona')}`,
  ].join('\n')
}

function resolveBrowserPersonaKernel(frontmatter: AlicizationSoulFrontmatter) {
  return resolveAlicizationPersonaKernel({
    profile: frontmatter.profile,
    personality: frontmatter.personality,
    customDirectives: frontmatter.custom_directives,
    hostAttitude: frontmatter.host_attitude,
    coreIncarnation: frontmatter.core_incarnation,
  }, {
    placeholderHostAttitudes: [stageSoulText('default-host-attitude')],
  })
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function syncPersonalityBaselineInBody(body: string, personality: AlicizationPersonalityState) {
  const lines = body.split('\n')
  const sectionTitles = new Set(getStageUiMessageVariants('stage.alicization.soul.sections.personality-baseline').map(title => `## ${title}`))
  const sectionIndex = lines.findIndex(line => sectionTitles.has(line.trim()))
  if (sectionIndex < 0)
    return body

  const nextSectionIndex = lines.findIndex((line, index) => index > sectionIndex && line.trim().startsWith('## '))
  const sectionEnd = nextSectionIndex >= 0 ? nextSectionIndex : lines.length
  const sectionLines = lines.slice(sectionIndex, sectionEnd)

  const upsertMetric = (labelPath: string, value: number) => {
    const preferredLabel = stageSoulText(labelPath)
    const candidateLabels = getStageUiMessageVariants(`stage.alicization.soul.${labelPath}`)
    const metricPattern = new RegExp(`^-\\s*(?:${candidateLabels.map(escapeRegExp).join('|')})\\s*[:：]`)
    const line = `- ${preferredLabel}: ${value.toFixed(2)}`
    const metricIndex = sectionLines.findIndex(current => metricPattern.test(current.trimStart()))
    if (metricIndex >= 0) {
      sectionLines[metricIndex] = line
      return
    }

    sectionLines.push(line)
  }

  upsertMetric('labels.obedience', personality.obedience)
  upsertMetric('labels.liveliness', personality.liveliness)
  upsertMetric('labels.sensibility', personality.sensibility)

  return [
    ...lines.slice(0, sectionIndex),
    ...sectionLines,
    ...lines.slice(sectionEnd),
  ].join('\n')
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
    host_attitude: hostAttitude ?? stageSoulText('default-host-attitude'),
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
  }
}

function normalizeFrontmatter(raw: Partial<AlicizationSoulFrontmatter> | null | undefined): AlicizationSoulFrontmatter {
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

  const personaKernel = resolveBrowserPersonaKernel(normalizedFrontmatter)
  return {
    ...normalizedFrontmatter,
    host_attitude: normalizeHostAttitude(personaKernel.hostAttitude),
    core_incarnation: normalizeCoreIncarnation(personaKernel.coreIncarnation),
  }
}

function parseSoul(raw: string) {
  if (!raw.startsWith('---\n')) {
    return {
      frontmatter: normalizeFrontmatter(defaultFrontmatter),
      body: raw.trim() || buildSoulBody(defaultFrontmatter),
    }
  }

  const secondMarkerIndex = raw.indexOf('\n---\n', 4)
  if (secondMarkerIndex < 0) {
    return {
      frontmatter: normalizeFrontmatter(defaultFrontmatter),
      body: raw.trim() || buildSoulBody(defaultFrontmatter),
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
    body: bodyRaw || buildSoulBody(defaultFrontmatter),
  }
}

function needsGenesis(frontmatter: AlicizationSoulFrontmatter) {
  const hasRequiredProfile = Boolean(
    frontmatter.profile.ownerName.trim()
    && frontmatter.profile.hostName.trim()
    && frontmatter.profile.alicizationName.trim()
    && frontmatter.profile.relationship.trim(),
  )
  const hasGender = frontmatter.profile.gender !== 'custom' || Boolean(frontmatter.profile.genderCustom.trim())
  const schemaValid = frontmatter.schemaVersion === currentSoulSchemaVersion
  return !frontmatter.initialized || !schemaValid || !hasRequiredProfile || !hasGender
}

function hashContent(content: string) {
  let hash = 2166136261
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function tokenize(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .map(token => token.trim())
      .filter(token => token.length >= 2),
  )
}

function scoreMemoryFact(queryTokens: Set<string>, fact: AlicizationMemoryFact, currentTs: number) {
  const factTokens = tokenize(`${fact.subject} ${fact.predicate} ${fact.object}`)
  if (factTokens.size === 0)
    return 0

  let overlap = 0
  for (const token of factTokens) {
    if (queryTokens.has(token))
      overlap += 1
  }

  const lexicalScore = overlap / factTokens.size
  const ageDays = Math.max(0, (currentTs - fact.updatedAt) / dayMs)
  const vagueQuery = queryTokens.size <= 3
  const coldTier = isMemoryColdTierFact(fact, currentTs)
  const longTailEligible = coldTier || (ageDays >= 45 && fact.confidence >= 0.72)
  const longTailFloor = longTailEligible && (lexicalScore >= 0.22 || vagueQuery) ? 0.35 : 0
  const decay = Math.max(Math.exp(-ageDays / 14), longTailFloor)
  const accessBoost = Math.min(0.2, fact.accessCount / 50)
  const coldReachabilityBoost = longTailEligible && vagueQuery
    ? Math.min(0.08, fact.confidence * 0.08)
    : 0

  return (lexicalScore * 0.5 + fact.confidence * 0.4 + accessBoost * 0.1) * decay + coldReachabilityBoost
}

function buildFactDedupeKey(subject: string, predicate: string, object: string) {
  return `${subject.trim().toLowerCase()}|${predicate.trim().toLowerCase()}|${object.trim().toLowerCase()}`
}

function computePruneScore(fact: AlicizationMemoryFact, currentTs: number) {
  const ageDays = Math.max(0, (currentTs - fact.updatedAt) / dayMs)
  const timeDecay = Math.min(1, ageDays / 30)
  const accessFrequencyNorm = Math.min(1, fact.accessCount / 12)
  const confidenceNorm = clamp01(fact.confidence)
  return timeDecay * (1 - accessFrequencyNorm) * (1 - confidenceNorm)
}

function isMemoryColdTierFact(fact: AlicizationMemoryFact, currentTs: number) {
  const daysSinceAccess = fact.lastAccessAt == null
    ? Number.POSITIVE_INFINITY
    : (currentTs - fact.lastAccessAt) / dayMs
  return computePruneScore(fact, currentTs) >= memoryColdTierThreshold
    && daysSinceAccess >= memoryColdTierAccessWindowDays
}

function isMemoryHotTierFact(fact: AlicizationMemoryFact, currentTs: number) {
  const daysSinceUpdate = Math.max(0, (currentTs - fact.updatedAt) / dayMs)
  const daysSinceAccess = fact.lastAccessAt == null
    ? Number.POSITIVE_INFINITY
    : Math.max(0, (currentTs - fact.lastAccessAt) / dayMs)
  return daysSinceUpdate <= memoryHotTierFreshDays
    || daysSinceAccess <= memoryHotTierFreshDays
    || fact.accessCount >= 4
}

function deriveMemoryTierCounts(facts: AlicizationMemoryFact[], currentTs: number) {
  let hot = 0
  let warm = 0
  let cold = 0
  for (const fact of facts) {
    if (isMemoryColdTierFact(fact, currentTs)) {
      cold += 1
      continue
    }
    if (isMemoryHotTierFact(fact, currentTs)) {
      hot += 1
      continue
    }
    warm += 1
  }
  return { hot, warm, cold }
}

function deriveMemoryIntegrity(facts: AlicizationMemoryFact[]) {
  const issues: string[] = []
  const dedupeKeys = new Set<string>()
  const currentTs = now()
  for (const fact of facts) {
    if (!fact.subject.trim() || !fact.predicate.trim() || !fact.object.trim())
      issues.push(`malformed-fact:${fact.id}`)
    if (fact.dedupeKey) {
      if (dedupeKeys.has(fact.dedupeKey))
        issues.push(`duplicate-dedupe:${fact.dedupeKey}`)
      dedupeKeys.add(fact.dedupeKey)
    }
    if (isMemoryColdTierFact(fact, currentTs) && tokenize(`${fact.subject} ${fact.predicate} ${fact.object}`).size === 0)
      issues.push(`cold-unsearchable:${fact.id}`)
  }
  return {
    status: issues.length > 0 ? 'degraded' as const : 'ok' as const,
    issues,
  }
}

function scoreFragment(queryTokens: Set<string>, fragment: AlicizationSubconsciousFragment, currentTs: number) {
  const fragmentTokens = tokenize(fragment.text)
  if (fragmentTokens.size === 0)
    return 0

  let overlap = 0
  for (const token of fragmentTokens) {
    if (queryTokens.has(token))
      overlap += 1
  }

  const lexicalScore = overlap / fragmentTokens.size
  const ageDays = Math.max(0, (currentTs - fragment.createdAt) / dayMs)
  const freshness = Math.exp(-ageDays / 21)
  const recallBoost = Math.min(0.2, fragment.recallCount / 30)
  return lexicalScore * freshness + recallBoost
}

function now() {
  return Date.now()
}

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
    if (error?.name === 'AbortError')
      throw createRealtimeError('TIMEOUT', `request timeout after ${timeoutMs}ms`)
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

const extractLocationFromQuery = extractAlicizationLocationFromQuery

interface OpenMeteoGeocodeResult {
  name?: unknown
  admin1?: unknown
  country?: unknown
  country_code?: unknown
  latitude?: unknown
  longitude?: unknown
  population?: unknown
}

const cjkLocationPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
const weatherLocationSuffixPattern = /(特别行政区|自治区|自治州|自治县|[市州盟县区旗])$/u
const weatherLocationAliasMap: Record<string, string> = {
  纽约: 'New York',
  洛杉矶: 'Los Angeles',
  旧金山: 'San Francisco',
  天津: 'Tianjin',
}

function hasCjkCharacters(text: string) {
  return cjkLocationPattern.test(text)
}

function normalizeGeocodeToken(value: unknown) {
  if (typeof value !== 'string')
    return ''
  return value
    .toLowerCase()
    .replace(/[，,\s·.'’"“”\-_/\\()（）[\]【】]/g, '')
    .replace(weatherLocationSuffixPattern, '')
}

function buildWeatherGeocodeQueryCandidates(location: string) {
  const normalizedLocation = sanitizeText(location, '')
  if (!normalizedLocation)
    return []

  const candidates: string[] = []
  const pushCandidate = (candidate: string) => {
    const normalizedCandidate = sanitizeText(candidate, '')
    if (!normalizedCandidate || candidates.includes(normalizedCandidate))
      return
    candidates.push(normalizedCandidate)
  }

  pushCandidate(normalizedLocation)

  if (hasCjkCharacters(normalizedLocation)) {
    const withoutSuffix = normalizedLocation.replace(weatherLocationSuffixPattern, '')
    if (withoutSuffix && withoutSuffix !== normalizedLocation) {
      pushCandidate(withoutSuffix)
    }
    else if (!normalizedLocation.endsWith('市')) {
      pushCandidate(`${normalizedLocation}市`)
    }
  }

  const alias = weatherLocationAliasMap[normalizedLocation]
  if (alias)
    pushCandidate(alias)

  return candidates
}

function scoreWeatherGeocodeResult(input: {
  result: OpenMeteoGeocodeResult
  queryName: string
  originalLocation: string
}) {
  const queryToken = normalizeGeocodeToken(input.queryName)
  const originalToken = normalizeGeocodeToken(input.originalLocation)
  const nameToken = normalizeGeocodeToken(input.result.name)
  const adminToken = normalizeGeocodeToken(input.result.admin1)
  const countryToken = normalizeGeocodeToken(input.result.country)
  const combinedToken = normalizeGeocodeToken([
    sanitizeText(input.result.name, ''),
    sanitizeText(input.result.admin1, ''),
    sanitizeText(input.result.country, ''),
  ].join(' '))
  const countryCode = sanitizeText(input.result.country_code, '').toUpperCase()
  const population = Number(input.result.population)

  let score = 0
  if (nameToken && nameToken === queryToken)
    score += 8
  if (nameToken && nameToken === originalToken)
    score += 7
  if (adminToken && (adminToken === queryToken || adminToken === originalToken))
    score += 4
  if (countryToken && (countryToken === queryToken || countryToken === originalToken))
    score += 5
  if (combinedToken && queryToken && combinedToken.includes(queryToken))
    score += 2
  if (combinedToken && originalToken && combinedToken.includes(originalToken))
    score += 2
  if (hasCjkCharacters(input.originalLocation) && countryCode === 'CN')
    score += 3
  if (Number.isFinite(population) && population > 0)
    score += Math.min(2, Math.log10(population + 1) / 3)

  return score
}

async function resolveBestWeatherGeocode(location: string): Promise<OpenMeteoGeocodeResult | null> {
  const candidates = buildWeatherGeocodeQueryCandidates(location)
  if (candidates.length === 0)
    return null

  const perRequestTimeoutMs = Math.max(
    1_800,
    Math.min(4_500, Math.floor(realtimeRequestTimeoutMsec / candidates.length) + 1_200),
  )
  let bestCandidate: {
    result: OpenMeteoGeocodeResult
    score: number
    population: number
  } | null = null

  for (const candidate of candidates) {
    const geocode = await fetchJsonWithTimeout(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(candidate)}&count=8&language=zh&format=json`,
      perRequestTimeoutMs,
    )
    const results = Array.isArray(geocode.results)
      ? geocode.results as OpenMeteoGeocodeResult[]
      : []
    for (const result of results) {
      const latitude = Number(result.latitude)
      const longitude = Number(result.longitude)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
        continue

      const score = scoreWeatherGeocodeResult({
        result,
        queryName: candidate,
        originalLocation: location,
      })
      const population = Number(result.population)
      const safePopulation = Number.isFinite(population) ? population : 0

      if (!bestCandidate || score > bestCandidate.score || (score === bestCandidate.score && safePopulation > bestCandidate.population)) {
        bestCandidate = {
          result,
          score,
          population: safePopulation,
        }
      }
    }

    if (bestCandidate && bestCandidate.score >= 12)
      break
  }

  if (!bestCandidate)
    return null
  return bestCandidate.result
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

async function executeBuiltinWeather(query: string): Promise<AlicizationRealtimeExecuteResult> {
  const startedAt = Date.now()
  try {
    const location = extractLocationFromQuery(query)
    if (!location) {
      throw createRealtimeError('MISSING_LOCATION', '未识别到地点，请补充城市或国家后重试。')
    }

    const resolvedGeocode = await resolveBestWeatherGeocode(location)
    if (!resolvedGeocode) {
      throw createRealtimeError('LOCATION_NOT_FOUND', `未找到地点：${location}`)
    }

    const latitude = Number(resolvedGeocode.latitude)
    const longitude = Number(resolvedGeocode.longitude)
    const weather = await fetchJsonWithTimeout(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`,
    )
    const current = weather.current ?? {}
    if (!Number.isFinite(Number(current.temperature_2m))) {
      throw createRealtimeError('NO_DATA', '天气源未返回有效的实时温度。')
    }

    const resolvedLocation = [resolvedGeocode.name, resolvedGeocode.admin1, resolvedGeocode.country]
      .filter((item: unknown) => typeof item === 'string' && item.trim().length > 0)
      .join(', ')
    const surface = buildAlicizationWeatherSurface({
      location: resolvedLocation || location,
      condition: describeWeatherCode(Number(current.weather_code)),
      temperatureC: Number(current.temperature_2m),
      apparentTemperatureC: Number(current.apparent_temperature),
      humidity: Number(current.relative_humidity_2m),
      windSpeedKmH: Number(current.wind_speed_10m),
    })

    return {
      category: 'weather',
      source: 'builtin',
      ok: true,
      summary: formatAlicizationRealtimeSurfaceSummary(surface),
      surface,
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
      category: 'weather',
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
  return extractLocationFromQuery(normalized) || normalized
}

async function executeBuiltinNews(query: string): Promise<AlicizationRealtimeExecuteResult> {
  const startedAt = Date.now()
  try {
    const term = extractNewsQueryTerm(query)
    const data = await fetchJsonWithTimeout(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(term)}&mode=ArtList&maxrecords=5&format=json&sort=DateDesc`,
    )
    const articles = Array.isArray(data.articles) ? data.articles : []
    if (articles.length === 0)
      throw createRealtimeError('NO_DATA', '新闻源当前没有返回可用结果。')

    const items = articles.slice(0, 3).map((article: any) => ({
      title: sanitizeBriefText(String(article.title ?? ''), 120),
      source: sanitizeBriefText(String(article.sourcecountry ?? article.domain ?? ''), 40),
      url: String(article.url ?? ''),
      publishedAt: String(article.seendate ?? ''),
    }))
    const surface = buildAlicizationNewsSurface({
      query: term,
      items,
    })

    return {
      category: 'news',
      source: 'builtin',
      ok: true,
      summary: formatAlicizationRealtimeSurfaceSummary(surface),
      surface,
      durationMs: Date.now() - startedAt,
      data: {
        query: term,
        items,
      },
    }
  }
  catch (error: any) {
    return {
      category: 'news',
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
  return rawMatches.find(item => !stopwords.has(item)) ?? ''
}

async function executeBuiltinFinance(query: string): Promise<AlicizationRealtimeExecuteResult> {
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
      if (!node || !Number.isFinite(Number(node.usd)))
        throw createRealtimeError('NO_DATA', `未获取到 ${upperTicker} 的价格。`)

      const price = Number(node.usd)
      const change = Number(node.usd_24h_change ?? 0)
      const surface = buildAlicizationFinanceSurface({
        ticker: upperTicker,
        market: 'crypto',
        priceUsd: price,
        change24h: change,
      })

      return {
        category: 'finance',
        source: 'builtin',
        ok: true,
        summary: formatAlicizationRealtimeSurfaceSummary(surface),
        surface,
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
    if (lines.length < 2)
      throw createRealtimeError('NO_DATA', `未获取到 ${upperTicker} 的行情。`)

    const header = lines[0]!.split(',')
    const row = lines[1]!.split(',')
    const record = Object.fromEntries(header.map((key, index) => [key, row[index]]))
    const closePrice = Number(record.Close)
    if (!Number.isFinite(closePrice))
      throw createRealtimeError('NO_DATA', `行情源返回了无效价格（${upperTicker}）。`)

    const surface = buildAlicizationFinanceSurface({
      ticker: upperTicker,
      market: 'equity',
      closePriceUsd: closePrice,
      date: String(record.Date ?? ''),
    })

    return {
      category: 'finance',
      source: 'builtin',
      ok: true,
      summary: formatAlicizationRealtimeSurfaceSummary(surface),
      surface,
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
      category: 'finance',
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
  if (match?.[1] && !/今天|今日|实时|最新/.test(match[1]))
    return match[1]
  return ''
}

async function executeBuiltinSports(query: string): Promise<AlicizationRealtimeExecuteResult> {
  const startedAt = Date.now()
  try {
    const league = extractSportsLeague(query)
    if (!league)
      throw createRealtimeError('MISSING_LEAGUE', '未识别到联赛，请补充例如 NBA/NFL/MLB/NHL/EPL。')

    const leagueInfo = sportsLeagueCatalog[league]
    const data = await fetchJsonWithTimeout(
      `https://site.api.espn.com/apis/site/v2/sports/${leagueInfo.path}/scoreboard`,
    )
    const events = Array.isArray(data.events) ? data.events : []
    if (events.length === 0)
      throw createRealtimeError('NO_DATA', `${leagueInfo.label} 当前没有可用比赛数据。`)

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

    const surface = buildAlicizationSportsSurface({
      leagueLabel: leagueInfo.label,
      items: selected,
    })

    return {
      category: 'sports',
      source: 'builtin',
      ok: true,
      summary: formatAlicizationRealtimeSurfaceSummary(surface),
      surface,
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
      category: 'sports',
      source: 'builtin',
      ok: false,
      errorCode: error?.code ?? 'SPORTS_FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    }
  }
}

async function executeBuiltinRealtimeQuery(payload: AlicizationRealtimeExecutePayload): Promise<AlicizationRealtimeExecuteResult> {
  const normalizedQuery = normalizeQueryText(payload.query)
  if (!normalizedQuery) {
    return {
      category: payload.category,
      source: 'builtin',
      ok: false,
      errorCode: 'EMPTY_QUERY',
      errorMessage: 'query is empty',
      durationMs: 0,
    }
  }

  switch (payload.category) {
    case 'weather':
      return await executeBuiltinWeather(normalizedQuery)
    case 'news':
      return await executeBuiltinNews(normalizedQuery)
    case 'finance':
      return await executeBuiltinFinance(normalizedQuery)
    case 'sports':
      return await executeBuiltinSports(normalizedQuery)
    default:
      return {
        category: payload.category,
        source: 'builtin',
        ok: false,
        errorCode: 'UNSUPPORTED_CATEGORY',
        errorMessage: `unsupported realtime category: ${payload.category}`,
        durationMs: 0,
      }
  }
}

function buildCardBaseKey(cardId: string) {
  return `local:alicization/browser/v${bridgeStorageVersion}/cards/${cardId}`
}

function buildSoulKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/soul`
}

function buildKillSwitchKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/kill-switch`
}

function buildOrganicMemoryKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/organic-memory`
}

function buildMemoryFactsKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/memory-facts`
}

function buildMemoryArchiveKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/memory-archive`
}

function buildMemoryMetaKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/memory-meta`
}

function buildConversationTurnsKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/conversation-turns`
}

function buildEpisodicEventsKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/episodic-events`
}

function buildMindTurnEventsKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/mind-turn-events`
}

function buildProactiveLoopStateKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/proactive-loop-state`
}

function buildAuditLogKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/audit-log`
}

function buildPerformanceManifestKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/performance-manifest`
}

function buildActiveSessionKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/active-session-id`
}

function buildVisualPresenceKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/visual-presence`
}

function createDefaultSoulRecord() {
  return {
    revision: 0,
    content: toSoulContent(defaultFrontmatter, buildSoulBody(defaultFrontmatter)),
  } satisfies BrowserSoulRecord
}

async function getCardIds() {
  return await storage.getItemRaw<string[]>(browserCardsIndexKey) ?? [defaultAlicizationCardId]
}

async function saveCardIds(cardIds: string[]) {
  const normalized = [...new Set(cardIds.map(normalizeCardId))].sort()
  await storage.setItemRaw(browserCardsIndexKey, normalized)
}

async function ensureCardRegistered(cardId: string) {
  const known = await getCardIds()
  if (known.includes(cardId))
    return
  await saveCardIds([...known, cardId])
}

async function readSoulRecord(cardId: string) {
  await ensureCardRegistered(cardId)
  return await storage.getItemRaw<BrowserSoulRecord>(buildSoulKey(cardId)) ?? createDefaultSoulRecord()
}

async function writeSoulRecord(cardId: string, record: BrowserSoulRecord) {
  await ensureCardRegistered(cardId)
  await storage.setItemRaw(buildSoulKey(cardId), record)
}

async function readKillSwitch(cardId: string): Promise<AlicizationKillSwitchSnapshot> {
  await ensureCardRegistered(cardId)
  return await storage.getItemRaw<AlicizationKillSwitchSnapshot>(buildKillSwitchKey(cardId)) ?? {
    state: 'ACTIVE',
    reason: 'bootstrap',
    updatedAt: now(),
  }
}

async function writeKillSwitch(cardId: string, state: AlicizationKillSwitchState, reason?: string) {
  const snapshot: AlicizationKillSwitchSnapshot = {
    state,
    reason,
    updatedAt: now(),
  }
  await ensureCardRegistered(cardId)
  await storage.setItemRaw(buildKillSwitchKey(cardId), snapshot)
  return snapshot
}

const readActiveSessionId = async (cardId: string) => await readActiveSessionIdFromStorage(cardId)

const browserBridgeStorage = createAlicizationBrowserBridgeStorageComposition({
  maxConversationTurns,
  now,
})
const readOrganicMemory = browserBridgeStorage.readOrganicMemory
const writeOrganicMemory = browserBridgeStorage.writeOrganicMemory
const readEpisodicMemory = browserBridgeStorage.readEpisodicMemory
const writeEpisodicMemory = browserBridgeStorage.writeEpisodicMemory
const readConversationTurns = browserBridgeStorage.readConversationTurns
const writeConversationTurns = browserBridgeStorage.writeConversationTurns
const readMindTurnEvents = browserBridgeStorage.readMindTurnEvents
const writeMindTurnEvents = browserBridgeStorage.writeMindTurnEvents
const readProactiveLoopState = browserBridgeStorage.readProactiveLoopState
const writeProactiveLoopState = browserBridgeStorage.writeProactiveLoopState

function normalizeBrowserProactiveScenario(raw: unknown): BrowserProactiveScenario {
  return raw === 'coding' || raw === 'media' || raw === 'late-night-care' ? raw : 'general'
}

function trimBrowserRecentProactiveOutcomes(outcomes: BrowserRecentProactiveOutcome[]) {
  return outcomes
    .slice(-16)
    .sort((left, right) => left.createdAt - right.createdAt)
}

function looksExecutionContinuityText(raw: unknown) {
  return /execution|callback|result|listing|remaining|cli|task|thread|执行|回调|结果|清单|剩下|任务/iu.test(String(raw ?? ''))
}

function buildBrowserSessionContinuitySummary(input: {
  turns: BrowserConversationTurnRecord[]
  activeSessionId: string
  recollectionForeground: AlicizationOrganicMemorySnapshot['recollectionForeground']
}) {
  const scopedTurns = input.activeSessionId
    ? input.turns.filter(turn => turn.sessionId === input.activeSessionId)
    : input.turns
  const recent = scopedTurns.slice(-6)
  const latest = recent.at(-1) ?? null
  const latestProactive = [...recent].reverse().find(turn => turn.origin === 'subconscious-proactive') ?? null
  const latestExecution = [...recent].reverse().find(turn =>
    looksExecutionContinuityText(`${turn.userText} ${turn.assistantText}`),
  ) ?? null
  const continuityAnchor = sanitizeBriefText(
    latest?.userText
    || latest?.assistantText
    || input.recollectionForeground?.summary
    || '',
    180,
  ) || null
  const threadSummary = sanitizeBriefText([
    latest?.userText,
    latest?.assistantText,
    input.recollectionForeground?.summary,
  ].filter(Boolean).join(' | '), 220) || null
  const proactiveSummary = latestProactive
    ? sanitizeBriefText([
      latestProactive.userText,
      latestProactive.assistantText,
    ].filter(Boolean).join(' | '), 180) || null
    : null
  const executionSummary = latestExecution
    ? sanitizeBriefText([
      latestExecution.userText,
      latestExecution.assistantText,
    ].filter(Boolean).join(' | '), 180) || null
    : null

  return {
    sessionId: input.activeSessionId || null,
    latestOrigin: latest?.origin ?? null,
    continuityAnchor,
    threadSummary,
    recollectionSummary: sanitizeBriefText(input.recollectionForeground?.summary ?? '', 180) || null,
    proactiveSummary,
    executionSummary,
  } satisfies BrowserSessionContinuitySummary
}

function deriveBrowserProactiveFeedbackSummary(state: BrowserProactiveLoopState) {
  const latestOutcome = state.recentOutcomes.at(-1) ?? null
  const pendingCount = state.pendingOutcomes.length
  const shouldSuppressSpeak = pendingCount > 0
    || latestOutcome?.outcome === 'dismiss'
    || latestOutcome?.outcome === 'ignored'
  const confidenceBias = latestOutcome?.outcome === 'positive' || latestOutcome?.outcome === 'reply-within-120s'
    ? 0.1
    : latestOutcome?.outcome === 'dismiss'
      ? -0.16
      : latestOutcome?.outcome === 'ignored'
        ? -0.08
        : 0
  const summary = latestOutcome
    ? sanitizeBriefText(`feedback=${latestOutcome.outcome} | scenario=${latestOutcome.scenario}`, 120) || null
    : pendingCount > 0
      ? sanitizeBriefText(`pending-feedback=${pendingCount}`, 120) || null
      : null

  return {
    latestOutcome,
    pendingCount,
    shouldSuppressSpeak,
    confidenceBias,
    summary,
  } satisfies BrowserProactiveFeedbackSummary
}

const mapBrowserMemorySourceToProvenance = mapAlicizationMemorySourceToProvenance

const mapBrowserFragmentSourceToProvenance = mapAlicizationFragmentSourceKindToProvenance

function appendBrowserEpisodicEvent(record: BrowserEpisodicMemoryRecord, event: AlicizationEpisodicEventRecord) {
  const existingIndex = record.events.findIndex(item => item.id === event.id)
  if (existingIndex >= 0) {
    record.events[existingIndex] = event
    return
  }
  record.events.push(event)
}

function applyBrowserProactiveOutcome(
  state: BrowserProactiveLoopState,
  entry: BrowserPendingProactiveOutcome,
  outcome: BrowserProactiveOutcome,
  at: number,
) {
  const nextScenarioBias = { ...state.scenarioBias }
  const nextConsecutiveIgnored = { ...state.consecutiveIgnored }

  if (outcome === 'positive' || outcome === 'reply-within-120s') {
    nextScenarioBias[entry.scenario] = Math.max(-0.15, Number((nextScenarioBias[entry.scenario] - 0.05).toFixed(2)))
    nextConsecutiveIgnored[entry.scenario] = 0
  }

  if (outcome === 'dismiss') {
    nextScenarioBias[entry.scenario] = Math.min(0.75, Number((nextScenarioBias[entry.scenario] + 0.15).toFixed(2)))
    nextConsecutiveIgnored[entry.scenario] = 0
  }

  if (outcome === 'ignored') {
    const nextIgnoredCount = nextConsecutiveIgnored[entry.scenario] + 1
    nextConsecutiveIgnored[entry.scenario] = nextIgnoredCount
    if (nextIgnoredCount >= 3)
      nextScenarioBias[entry.scenario] = Math.min(0.75, Number((nextScenarioBias[entry.scenario] + 0.10).toFixed(2)))
  }

  const nextOutcome: BrowserRecentProactiveOutcome = {
    turnId: entry.turnId,
    scenario: entry.scenario,
    outcome,
    createdAt: at,
  }

  return {
    ...state,
    globalCooldownUntil: outcome === 'dismiss'
      ? Math.max(state.globalCooldownUntil, at + 30 * 60_000)
      : state.globalCooldownUntil,
    scenarioBias: nextScenarioBias,
    consecutiveIgnored: nextConsecutiveIgnored,
    initiativeTrust: clamp01(
      state.initiativeTrust
      + (outcome === 'positive' ? 0.08 : 0)
      + (outcome === 'reply-within-120s' ? 0.04 : 0)
      - (outcome === 'dismiss' ? 0.12 : 0)
      - (outcome === 'ignored' ? 0.06 : 0),
    ),
    openingMomentum: clamp01(
      state.openingMomentum
      * (outcome === 'dismiss' ? 0.42 : outcome === 'ignored' ? 0.68 : 0.74),
    ),
    recentOutcomes: trimBrowserRecentProactiveOutcomes([...state.recentOutcomes, nextOutcome]),
    updatedAt: at,
  } satisfies BrowserProactiveLoopState
}

async function settleBrowserPendingProactiveOutcomesFromUserTurn(cardId: string, at: number) {
  const state = await readProactiveLoopState(cardId)
  const episodicMemory = await readEpisodicMemory(cardId)
  let nextState = {
    ...state,
    pendingOutcomes: [...state.pendingOutcomes],
  }
  let changed = false

  for (const entry of state.pendingOutcomes) {
    if (at - entry.deliveredAt > 120_000)
      continue
    nextState.pendingOutcomes = nextState.pendingOutcomes.filter(candidate => candidate.turnId !== entry.turnId)
    nextState = applyBrowserProactiveOutcome(nextState, entry, 'reply-within-120s', at)
    appendBrowserEpisodicEvent(episodicMemory, buildProactiveOutcomeEpisodicEvent({
      cardId,
      entry,
      outcome: 'reply-within-120s',
      at,
    }))
    changed = true
  }

  if (changed) {
    await writeProactiveLoopState(cardId, nextState)
    await writeEpisodicMemory(cardId, episodicMemory)
  }
}

async function buildBrowserOrganicMemorySnapshot(cardId: string): Promise<AlicizationOrganicMemorySnapshot> {
  const [soul, organicMemory, episodicMemory] = await Promise.all([
    readSoulRecord(cardId).then(record => toSoulSnapshot(cardId, record)),
    readOrganicMemory(cardId),
    readEpisodicMemory(cardId),
  ])
  const recentEpisodicEvents = [...episodicMemory.events]
    .sort((left, right) => right.occurredAt - left.occurredAt || right.updatedAt - left.updatedAt)
    .slice(0, 8)
  return buildBrowserOrganicMemorySnapshotProjection({
    now,
    soul,
    organicMemory,
    recentEpisodicEvents,
    mapFragmentSourceToProvenance: mapBrowserFragmentSourceToProvenance,
  })
}

async function enrichBrowserMetaEventWithLocalMemory(input: {
  cardId: string
  event: Extract<AlicizationBridgeChatStreamEvent, { type: 'meta' }>
  runtime: BrowserRuntimeKind
}) {
  if (input.event.digitalLifeSpine && input.event.runtimeDigest)
    return input.event

  if (input.event.digitalLifeSpine) {
    return {
      ...input.event,
      digitalLifeSpine: input.event.digitalLifeSpine,
      runtimeDigest: input.event.runtimeDigest ?? null,
    } satisfies Extract<AlicizationBridgeChatStreamEvent, { type: 'meta' }>
  }

  const [organicMemorySnapshot, snapshot, proactiveLoopState, turns, activeSessionId] = await Promise.all([
    buildBrowserOrganicMemorySnapshot(input.cardId),
    buildSensorySnapshot(input.runtime),
    readProactiveLoopState(input.cardId),
    readConversationTurns(input.cardId),
    readActiveSessionId(input.cardId),
  ])
  const sessionContinuity = buildBrowserSessionContinuitySummary({
    turns,
    activeSessionId,
    recollectionForeground: organicMemorySnapshot.recollectionForeground ?? null,
  })
  const proactiveFeedback = deriveBrowserProactiveFeedbackSummary(proactiveLoopState)
  const localDigest = buildBrowserFallbackDigitalLifeSpineDigest({
    now,
    organicMemorySnapshot,
    snapshot,
    sessionContinuity,
    proactiveFeedback,
  })
  const localRuntimeDigest = buildBrowserFallbackRuntimeDigest({
    organicMemorySnapshot,
    snapshot,
    sessionContinuity,
    proactiveFeedback,
  })

  return {
    ...input.event,
    digitalLifeSpine: input.event.digitalLifeSpine ?? localDigest,
    runtimeDigest: input.event.runtimeDigest ?? localRuntimeDigest,
  } satisfies Extract<AlicizationBridgeChatStreamEvent, { type: 'meta' }>
}

async function readMemoryFacts(cardId: string) {
  return await readMemoryFactsFromStorage(cardId)
}

async function writeMemoryFacts(cardId: string, facts: AlicizationMemoryFact[]) {
  await writeMemoryFactsToStorage(cardId, facts)
}

async function readMemoryArchive(cardId: string) {
  return await readMemoryArchiveFromStorage(cardId)
}

async function writeMemoryArchive(cardId: string, archive: AlicizationMemoryArchiveRecord[]) {
  await writeMemoryArchiveToStorage(cardId, archive)
}

async function readMemoryMeta(cardId: string) {
  return await readMemoryMetaFromStorage(cardId)
}

async function writeMemoryMeta(cardId: string, meta: { lastPrunedAt: number | null }) {
  await writeMemoryMetaToStorage(cardId, meta)
}

function mergeArchivedFactsIntoFacts(
  facts: AlicizationMemoryFact[],
  archive: AlicizationMemoryArchiveRecord[],
) {
  if (archive.length === 0)
    return { facts, mergedArchiveCount: 0 }

  const next = [...facts]
  let mergedArchiveCount = 0

  for (const item of archive) {
    const subject = sanitizeText(item.subject)
    const predicate = sanitizeText(item.predicate)
    const object = sanitizeText(item.object)
    if (!subject || !predicate || !object)
      continue

    const dedupeKey = item.dedupeKey?.trim() || buildFactDedupeKey(subject, predicate, object)
    const existingIndex = next.findIndex(fact => fact.dedupeKey === dedupeKey)
    const existing = existingIndex >= 0 ? next[existingIndex] : null
    const nextLastAccessAt = [item.lastAccessAt, existing?.lastAccessAt ?? null]
      .filter(value => typeof value === 'number')
      .sort((left, right) => Number(right) - Number(left))[0] ?? null

    if (existingIndex >= 0 && existing) {
      next[existingIndex] = {
        ...existing,
        confidence: clamp01(Math.max(existing.confidence, item.confidence)),
        source: item.source,
        createdAt: Math.min(existing.createdAt, item.createdAt),
        updatedAt: Math.max(existing.updatedAt, item.updatedAt),
        lastAccessAt: nextLastAccessAt,
        accessCount: Math.max(existing.accessCount, item.accessCount),
        provenance: existing.provenance ?? item.provenance ?? mapBrowserMemorySourceToProvenance(item.source),
      }
    }
    else {
      next.push({
        id: item.id,
        subject,
        predicate,
        object,
        confidence: clamp01(item.confidence),
        source: item.source,
        dedupeKey,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        lastAccessAt: nextLastAccessAt,
        accessCount: Math.max(0, item.accessCount),
        provenance: item.provenance ?? mapBrowserMemorySourceToProvenance(item.source),
      })
    }

    mergedArchiveCount += 1
  }

  return {
    facts: next,
    mergedArchiveCount,
  }
}

async function normalizeBrowserMemoryArchiveIntoFacts(cardId: string) {
  const [facts, archive] = await Promise.all([
    readMemoryFacts(cardId),
    readMemoryArchive(cardId),
  ])
  const merged = mergeArchivedFactsIntoFacts(facts, archive)
  if (merged.mergedArchiveCount > 0) {
    await Promise.all([
      writeMemoryFacts(cardId, merged.facts),
      writeMemoryArchive(cardId, []),
    ])
  }
  return merged.facts
}

async function readPerformanceManifest(cardId: string) {
  return await readPerformanceManifestFromStorage(cardId)
}

async function writePerformanceManifest(cardId: string, manifest: CharacterPerformanceCapabilitiesManifest | null) {
  await writePerformanceManifestToStorage(cardId, manifest)
}

const readVisualPresenceState = browserBridgeStorage.readVisualPresenceState

async function writeVisualPresenceState(cardId: string, state: AlicizationVisualPresenceStateSnapshot) {
  await ensureCardRegistered(cardId)
  await storage.setItemRaw(
    buildVisualPresenceKey(cardId),
    ensureAlicizationVisualPresenceResidentPerformance(state),
  )
}

const browserBridgePresence = createAlicizationBrowserBridgePresenceComposition({
  now,
  normalizeCardId,
  resolveActiveCardId,
  visualPresencePulseListeners,
  visualPresenceStateListeners,
  ensureAlicizationVisualPresenceResidentPerformance,
  writeVisualPresenceState,
  readVisualPresenceState,
  buildBrowserOrganicMemorySnapshot,
  readProactiveLoopState,
  readConversationTurns,
  readActiveSessionId,
  buildBrowserSessionContinuitySummary,
  deriveBrowserProactiveFeedbackSummary,
  buildBrowserFallbackDigitalLifeSpineDigest,
  buildAlicizationVisualPresenceStateFromSpineDigest,
  buildSensorySnapshot,
})
const emitVisualPresenceState = browserBridgePresence.emitVisualPresenceState
const persistVisualPresencePulseFromStreamMeta = browserBridgePresence.persistVisualPresencePulseFromStreamMeta
const syncBrowserFallbackVisualPresenceFromLocalMemory = browserBridgePresence.syncBrowserFallbackVisualPresenceFromLocalMemory

async function appendAuditLog(cardId: string, payload: AlicizationAuditLogInput) {
  const current = await readAuditLog<AlicizationAuditLogInput>(cardId)
  current.push({
    ...payload,
    createdAt: payload.createdAt ?? now(),
  })
  await storage.setItemRaw(buildAuditLogKey(cardId), current.slice(-maxAuditLogEntries))
}

function toSoulSnapshot(cardId: string, record: BrowserSoulRecord): AlicizationSoulSnapshot {
  const parsed = parseSoul(record.content)
  return {
    soulPath: `indexeddb://alicization/cards/${cardId}/SOUL.md`,
    content: toSoulContent(parsed.frontmatter, syncPersonalityBaselineInBody(parsed.body, parsed.frontmatter.personality)),
    frontmatter: parsed.frontmatter,
    revision: record.revision,
    hash: hashContent(record.content),
    needsGenesis: needsGenesis(parsed.frontmatter),
    watching: false,
  }
}

function resolveActiveCardId() {
  const { activeCardId } = useAiriCardStore()
  return normalizeCardId(activeCardId)
}

async function removeCardStorage(cardId: string) {
  await Promise.all([
    storage.removeItem(buildSoulKey(cardId)),
    storage.removeItem(buildKillSwitchKey(cardId)),
    storage.removeItem(buildOrganicMemoryKey(cardId)),
    storage.removeItem(buildMemoryFactsKey(cardId)),
    storage.removeItem(buildMemoryArchiveKey(cardId)),
    storage.removeItem(buildMemoryMetaKey(cardId)),
    storage.removeItem(buildEpisodicEventsKey(cardId)),
    storage.removeItem(buildConversationTurnsKey(cardId)),
    storage.removeItem(buildMindTurnEventsKey(cardId)),
    storage.removeItem(buildAuditLogKey(cardId)),
    storage.removeItem(buildPerformanceManifestKey(cardId)),
    storage.removeItem(buildActiveSessionKey(cardId)),
    storage.removeItem(buildVisualPresenceKey(cardId)),
    storage.removeItem(buildProactiveLoopStateKey(cardId)),
  ])
}

function buildBrowserMindTurnTraceEvents(input: {
  record: BrowserConversationTurnRecord
}) {
  const structured = input.record.structured ?? {}
  const governance = structured.governance && typeof structured.governance === 'object'
    ? structured.governance as Record<string, unknown>
    : null
  const decisionTraceId = typeof governance?.decisionTraceId === 'string' && governance.decisionTraceId.trim()
    ? governance.decisionTraceId.trim()
    : typeof structured.decisionTraceId === 'string' && structured.decisionTraceId.trim()
      ? structured.decisionTraceId.trim()
      : ''
  if (!decisionTraceId)
    return [] as BrowserMindTurnEventRecord[]
  const digitalLifeSpine = normalizeAlicizationDigitalLifeSpineDigest(structured.digitalLifeSpine)
  const participation = deriveAlicizationMindParticipationFromSpine(digitalLifeSpine)

  const origin = input.record.origin === 'subconscious-proactive' ? 'subconscious-proactive' : 'user-turn'
  const events: BrowserMindTurnEventRecord[] = [{
    id: nanoid(),
    decisionTraceId,
    turnId: input.record.turnId,
    sessionId: input.record.sessionId,
    origin,
    kind: 'governance-normalized',
    payload: {
      turnMode: typeof governance?.turnMode === 'string' ? governance.turnMode : null,
      truthState: typeof governance?.truthState === 'string' ? governance.truthState : null,
      repairState: typeof governance?.repairState === 'string' ? governance.repairState : null,
      answerSubject: typeof governance?.answerSubject === 'string' ? governance.answerSubject : null,
      screenReferenceMode: typeof governance?.screenReferenceMode === 'string' ? governance.screenReferenceMode : null,
      format: typeof structured.format === 'string' ? structured.format : null,
      digitalLifeSpine,
      derivedMindStateBundle: structured.derivedMindStateBundle && typeof structured.derivedMindStateBundle === 'object'
        ? structured.derivedMindStateBundle
        : null,
      memoryStageReplay: structured.memoryStageReplay && typeof structured.memoryStageReplay === 'object'
        ? structured.memoryStageReplay
        : null,
      memoryResolutionLedger: structured.memoryResolutionLedger && typeof structured.memoryResolutionLedger === 'object'
        ? structured.memoryResolutionLedger
        : null,
      participation,
    },
    createdAt: input.record.createdAt,
  }, {
    id: nanoid(),
    decisionTraceId,
    turnId: input.record.turnId,
    sessionId: input.record.sessionId,
    origin,
    kind: 'persistence-written',
    payload: {
      format: typeof structured.format === 'string' ? structured.format : null,
      parsePath: typeof structured.parsePath === 'string' ? structured.parsePath : null,
      emotion: typeof structured.emotion === 'string' ? structured.emotion : null,
      replyExcerpt: sanitizeBriefText(String(structured.reply ?? input.record.assistantText ?? ''), 240) || null,
      assistantExcerpt: sanitizeBriefText(input.record.assistantText, 240) || null,
      digitalLifeSpine,
      derivedMindStateBundle: structured.derivedMindStateBundle && typeof structured.derivedMindStateBundle === 'object'
        ? structured.derivedMindStateBundle
        : null,
      memoryStageReplay: structured.memoryStageReplay && typeof structured.memoryStageReplay === 'object'
        ? structured.memoryStageReplay
        : null,
      memoryResolutionLedger: structured.memoryResolutionLedger && typeof structured.memoryResolutionLedger === 'object'
        ? structured.memoryResolutionLedger
        : null,
    },
    createdAt: input.record.createdAt,
  }]

  if (origin === 'subconscious-proactive') {
    events.push({
      id: nanoid(),
      decisionTraceId,
      turnId: input.record.turnId,
      sessionId: input.record.sessionId,
      origin,
      kind: 'dialogue-emitted',
      payload: {
        format: typeof structured.format === 'string' ? structured.format : null,
        emotion: typeof structured.emotion === 'string' ? structured.emotion : null,
        proactive: structured.proactive && typeof structured.proactive === 'object'
          ? structured.proactive
          : null,
        digitalLifeSpine,
        derivedMindStateBundle: structured.derivedMindStateBundle && typeof structured.derivedMindStateBundle === 'object'
          ? structured.derivedMindStateBundle
          : null,
        memoryStageReplay: structured.memoryStageReplay && typeof structured.memoryStageReplay === 'object'
          ? structured.memoryStageReplay
          : null,
        memoryResolutionLedger: structured.memoryResolutionLedger && typeof structured.memoryResolutionLedger === 'object'
          ? structured.memoryResolutionLedger
          : null,
      },
      createdAt: input.record.createdAt,
    })
  }

  return events
}

async function setActiveThoughtFromUserTurn(cardId: string, userText: string) {
  const normalized = sanitizeMultilineText(userText, '').slice(0, 180)
  if (!normalized)
    return

  const organicMemory = await readOrganicMemory(cardId)
  const duplicate = organicMemory.activeThoughts.find(thought => thought.text === normalized)
  const currentTs = now()

  organicMemory.activeThoughts = duplicate
    ? organicMemory.activeThoughts.map(thought => thought.id === duplicate.id
        ? {
            ...thought,
            updatedAt: currentTs,
          }
        : thought)
    : [
        {
          id: nanoid(),
          text: normalized,
          createdAt: currentTs,
          updatedAt: currentTs,
        },
        ...organicMemory.activeThoughts,
      ].slice(0, maxActiveThoughts)

  await writeOrganicMemory(cardId, organicMemory)
}

function buildSubconsciousFragmentText(payload: BrowserConversationTurnRecord) {
  const userText = sanitizeMultilineText(payload.userText, '')
  if (!userText)
    return ''
  return userText.slice(0, 220)
}

async function appendSubconsciousFragment(cardId: string, text: string, sourceKind: AlicizationSubconsciousFragmentSourceKind) {
  const normalized = sanitizeMultilineText(text, '').slice(0, 240)
  if (!normalized)
    return

  const organicMemory = await readOrganicMemory(cardId)
  const duplicate = organicMemory.subconsciousFragments.find(fragment => fragment.text === normalized)
  if (duplicate) {
    duplicate.lastRecalledAt = duplicate.lastRecalledAt ?? now()
    duplicate.provenance = duplicate.provenance ?? mapBrowserFragmentSourceToProvenance(duplicate.sourceKind)
    await writeOrganicMemory(cardId, organicMemory)
    return
  }

  organicMemory.subconsciousFragments = [
    {
      id: nanoid(),
      text: normalized,
      sourceKind,
      createdAt: now(),
      lastRecalledAt: null,
      recallCount: 0,
      provenance: mapBrowserFragmentSourceToProvenance(sourceKind),
    },
    ...organicMemory.subconsciousFragments,
  ].slice(0, maxSubconsciousFragments)

  await writeOrganicMemory(cardId, organicMemory)
}

function buildConversationEpisodicEvent(input: {
  cardId: string
  record: BrowserConversationTurnRecord
}) {
  const reply = sanitizeMultilineText(input.record.assistantText, '')
  const user = sanitizeMultilineText(input.record.userText, '')
  const governance = input.record.structured?.governance && typeof input.record.structured.governance === 'object'
    ? input.record.structured.governance as Record<string, unknown>
    : null
  const proactive = input.record.structured?.proactive && typeof input.record.structured.proactive === 'object'
    ? input.record.structured.proactive as Record<string, unknown>
    : null
  const emotion = typeof input.record.structured?.emotion === 'string'
    ? sanitizeText(input.record.structured.emotion)
    : ''
  const origin = input.record.origin === 'subconscious-proactive' ? 'proactive' : 'reply'
  const relationshipShift = input.record.origin === 'subconscious-proactive'
    ? {
        closenessDelta: 0.02,
        trustDelta: 0.01,
        burdenDelta: 0,
        boundaryDelta: 0,
        misreadDelta: 0,
        repairDelta: 0,
        openLoopDelta: 0.03,
      }
    : {
        closenessDelta: 0.01,
        trustDelta: 0.01,
        burdenDelta: 0,
        boundaryDelta: 0,
        misreadDelta: 0,
        repairDelta: 0,
        openLoopDelta: 0.01,
      }
  return {
    id: nanoid(),
    cardId: input.cardId,
    decisionTraceId: typeof governance?.decisionTraceId === 'string' ? governance.decisionTraceId.trim() || null : null,
    turnId: input.record.turnId,
    sessionId: input.record.sessionId,
    sourceKind: origin,
    provenance: 'observed',
    occurredAt: input.record.createdAt,
    whereSummary: input.record.origin === 'subconscious-proactive'
      ? `${sanitizeText(proactive?.scenario) || 'general'} proactive window`
      : 'browser fallback conversation turn',
    withWhom: ['host'],
    threadAnchor: sanitizeBriefText(
      typeof governance?.focusAnchor === 'string'
        ? governance.focusAnchor
        : user || reply,
      160,
    ) || null,
    whatHappened: sanitizeBriefText(
      input.record.origin === 'subconscious-proactive'
        ? `A proactive browser fallback turn was delivered. ${[reply, user].filter(Boolean).join(' ')}`
        : `A browser fallback dialogue turn happened. ${[user, reply].filter(Boolean).join(' ')}`,
      280,
    ),
    felt: emotion || null,
    emotionTags: [emotion || '', input.record.origin === 'subconscious-proactive' ? 'proactive' : 'dialogue'].filter(Boolean),
    whatChanged: input.record.origin === 'subconscious-proactive'
      ? 'A proactive opening entered the shared history.'
      : 'A dialogue turn became part of the living continuity.',
    relationshipMeaning: input.record.origin === 'subconscious-proactive'
      ? 'Proactive presence became part of the bond history.'
      : 'The conversation itself became autobiographical memory.',
    lesson: input.record.origin === 'subconscious-proactive'
      ? 'Browser fallback should preserve proactive turns as real continuity, not transient UI events.'
      : 'Fallback dialogue should still leave autobiographical residue.',
    sourceSummary: 'browser fallback conversation record',
    confidence: input.record.origin === 'subconscious-proactive' ? 0.7 : 0.62,
    salience: input.record.origin === 'subconscious-proactive' ? 0.58 : 0.44,
    sceneAttachment: input.record.origin === 'subconscious-proactive' ? 0.34 : 0.22,
    consolidationPriority: input.record.origin === 'subconscious-proactive' ? 0.52 : 0.34,
    relationshipShift,
    derivedFrom: [{
      kind: 'turn',
      id: input.record.turnId,
      label: input.record.origin,
    }],
    tags: [input.record.origin, sanitizeText(proactive?.scenario) || 'general'].filter(Boolean),
    createdAt: input.record.createdAt,
    updatedAt: input.record.createdAt,
    lastRecalledAt: null,
    recallCount: 0,
    reconsolidationCount: 0,
    latestReconsolidation: null,
  } satisfies AlicizationEpisodicEventRecord
}

function buildProactiveOutcomeEpisodicEvent(input: {
  cardId: string
  entry: BrowserPendingProactiveOutcome
  outcome: BrowserProactiveOutcome
  at: number
}) {
  return {
    id: nanoid(),
    cardId: input.cardId,
    decisionTraceId: null,
    turnId: input.entry.turnId,
    sessionId: null,
    sourceKind: 'proactive',
    provenance: 'observed',
    occurredAt: input.at,
    whereSummary: `${input.entry.scenario} proactive settlement`,
    withWhom: ['host'],
    threadAnchor: input.entry.scenario,
    whatHappened: `A browser fallback proactive turn was settled as ${input.outcome}.`,
    felt: input.outcome === 'reply-within-120s' || input.outcome === 'positive'
      ? 'The host left the opening alive enough for proactive continuity.'
      : input.outcome === 'dismiss'
        ? 'The host closed the opening and boundary pressure rose.'
        : 'The opening faded without a reply.',
    emotionTags: ['proactive', input.outcome],
    whatChanged: input.outcome === 'dismiss'
      ? 'Boundary pressure increased and initiative should get lighter.'
      : input.outcome === 'ignored'
        ? 'The opening did not hold; initiative should soften.'
        : 'Proactive presence was received as part of the shared line.',
    relationshipMeaning: input.outcome === 'dismiss'
      ? 'Dismissed proactive turns should not be forgotten in fallback mode.'
      : 'Proactive settlement should shape the same bond line as main runtime.',
    lesson: input.outcome === 'reply-within-120s' || input.outcome === 'positive'
      ? 'Positive proactive reception should reinforce continuity.'
      : 'Negative proactive reception should reduce pressure next time.',
    sourceSummary: 'browser proactive outcome',
    confidence: input.outcome === 'dismiss' ? 0.82 : 0.74,
    salience: input.outcome === 'dismiss' ? 0.78 : input.outcome === 'ignored' ? 0.62 : 0.56,
    sceneAttachment: input.entry.scenario === 'late-night-care' ? 0.44 : 0.3,
    consolidationPriority: input.outcome === 'dismiss' ? 0.8 : 0.58,
    relationshipShift: {
      closenessDelta: input.outcome === 'dismiss' ? -0.04 : 0.03,
      trustDelta: input.outcome === 'dismiss' ? -0.05 : 0.03,
      burdenDelta: input.outcome === 'dismiss' ? 0.08 : input.outcome === 'ignored' ? 0.03 : -0.01,
      boundaryDelta: input.outcome === 'dismiss' ? -0.08 : input.outcome === 'ignored' ? -0.03 : 0.01,
      misreadDelta: input.outcome === 'dismiss' ? 0.05 : input.outcome === 'ignored' ? 0.02 : -0.01,
      repairDelta: 0,
      openLoopDelta: input.outcome === 'reply-within-120s' ? 0.03 : 0,
    },
    derivedFrom: [{
      kind: 'turn',
      id: input.entry.turnId,
      label: input.entry.scenario,
    }],
    tags: ['proactive', input.entry.scenario, input.outcome],
    createdAt: input.at,
    updatedAt: input.at,
    lastRecalledAt: null,
    recallCount: 0,
    reconsolidationCount: 0,
    latestReconsolidation: null,
  } satisfies AlicizationEpisodicEventRecord
}

async function buildSensorySnapshot(runtime: BrowserRuntimeKind): Promise<AlicizationSensoryCacheSnapshot> {
  const currentTs = now()
  const date = new Date(currentTs)
  const title = typeof document !== 'undefined' ? document.title : ''
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const degraded: AlicizationSensoryCacheSnapshot['sample']['degraded'] = ['cpu-unavailable']

  let battery: AlicizationSensoryCacheSnapshot['sample']['battery'] | undefined
  const navigatorWithBattery = (typeof globalThis.navigator === 'object' && globalThis.navigator
    ? globalThis.navigator
    : {}) as Navigator & {
      getBattery?: () => Promise<{ level: number, charging: boolean }>
      deviceMemory?: number
    }

  if (typeof navigatorWithBattery.getBattery === 'function') {
    try {
      const batteryManager = await navigatorWithBattery.getBattery()
      battery = {
        percent: Math.round(batteryManager.level * 100),
        charging: batteryManager.charging,
        source: 'fallback',
      }
    }
    catch {
      degraded.push('battery-unavailable')
    }
  }
  else {
    degraded.push('battery-unavailable')
  }

  const performanceWithMemory = (typeof globalThis.performance === 'object' && globalThis.performance
    ? globalThis.performance
    : {}) as Performance & {
      memory?: {
        jsHeapSizeLimit?: number
        usedJSHeapSize?: number
      }
    }
  const memoryInfo = performanceWithMemory.memory
  const memoryLimit = memoryInfo?.jsHeapSizeLimit
  const memoryUsed = memoryInfo?.usedJSHeapSize
  const navigatorMemory = navigatorWithBattery.deviceMemory

  const totalMB = memoryLimit
    ? Math.max(1, Math.round(memoryLimit / 1024 / 1024))
    : (navigatorMemory ? Math.max(1, Math.round(navigatorMemory * 1024)) : 0)
  const usedMB = memoryUsed
    ? Math.max(0, Math.round(memoryUsed / 1024 / 1024))
    : 0

  if (!totalMB)
    degraded.push('memory-unavailable')

  return {
    sample: {
      collectedAt: currentTs,
      time: {
        iso: date.toISOString(),
        local: date.toLocaleString(),
        timezone,
      },
      foregroundWindow: title
        ? {
            appName: runtime === 'mobile' ? 'Alicization Mobile' : 'Alicization Web',
            processName: runtime === 'mobile' ? 'capacitor-webview' : 'browser',
            title,
          }
        : undefined,
      battery,
      cpu: {
        usagePercent: 0,
        windowMs: 0,
      },
      memory: {
        freeMB: totalMB ? Math.max(0, totalMB - usedMB) : 0,
        totalMB,
        usagePercent: totalMB ? Math.round((usedMB / totalMB) * 100) : 0,
      },
      degraded,
    },
    stale: false,
    ageMs: 0,
    nextTickAt: null,
    running: true,
  }
}

export function installBrowserAlicizationBridge(options?: { runtime?: BrowserRuntimeKind }) {
  const runtime = options?.runtime ?? 'web'
  const pendingChatStreams = new Map<string, AbortController>()

  setAlicizationBridge({
    bootstrap: async () => {
      const cardId = resolveActiveCardId()
      const record = await readSoulRecord(cardId)
      await ensureCardRegistered(cardId)
      return toSoulSnapshot(cardId, record)
    },
    getSoul: async () => {
      const cardId = resolveActiveCardId()
      return toSoulSnapshot(cardId, await readSoulRecord(cardId))
    },
    initializeGenesis: async (payload: AlicizationGenesisInput): Promise<AlicizationInitializeGenesisResult> => {
      const cardId = resolveActiveCardId()
      const current = await readSoulRecord(cardId)
      const parsed = parseSoul(current.content)
      const nextFrontmatterBase = normalizeFrontmatter({
        ...parsed.frontmatter,
        initialized: true,
        custom_directives: payload.customDirectives ?? '',
        profile: {
          ownerName: payload.ownerName,
          hostName: payload.hostName,
          alicizationName: payload.alicizationName,
          gender: payload.gender,
          genderCustom: payload.genderCustom ?? '',
          relationship: payload.relationship,
          mindAge: payload.mindAge,
        },
        personality: payload.personality,
        host_attitude: '',
        core_incarnation: '',
      })
      const personaKernel = resolveBrowserPersonaKernel(nextFrontmatterBase)
      const nextFrontmatter = normalizeFrontmatter({
        ...nextFrontmatterBase,
        host_attitude: personaKernel.hostAttitude,
        core_incarnation: personaKernel.coreIncarnation,
      })
      const nextBody = syncPersonalityBaselineInBody(buildSoulBody(nextFrontmatter), nextFrontmatter.personality)
      const nextRecord: BrowserSoulRecord = {
        revision: current.revision + 1,
        content: toSoulContent(nextFrontmatter, nextBody),
      }

      await writeSoulRecord(cardId, nextRecord)
      return {
        soul: toSoulSnapshot(cardId, nextRecord),
        conflict: false,
      }
    },
    updateSoul: async (payload: AlicizationSoulUpdatePayload) => {
      const cardId = resolveActiveCardId()
      const current = await readSoulRecord(cardId)
      if (typeof payload.expectedRevision === 'number' && payload.expectedRevision !== current.revision) {
        throw new Error(stageSoulText('errors.revision-mismatch', {
          expectedRevision: payload.expectedRevision,
          actualRevision: current.revision,
        }))
      }

      const parsed = parseSoul(payload.content)
      const syncedBody = syncPersonalityBaselineInBody(parsed.body, parsed.frontmatter.personality)
      const nextRecord: BrowserSoulRecord = {
        revision: current.revision + 1,
        content: toSoulContent(parsed.frontmatter, syncedBody),
      }
      await writeSoulRecord(cardId, nextRecord)
      return toSoulSnapshot(cardId, nextRecord)
    },
    updatePersonality: async (payload: AlicizationPersonalityUpdatePayload) => {
      const cardId = resolveActiveCardId()
      const current = await readSoulRecord(cardId)
      if (typeof payload.expectedRevision === 'number' && payload.expectedRevision !== current.revision) {
        throw new Error(stageSoulText('errors.revision-mismatch', {
          expectedRevision: payload.expectedRevision,
          actualRevision: current.revision,
        }))
      }

      const parsed = parseSoul(current.content)
      const nextPersonality = normalizeFrontmatter({
        ...parsed.frontmatter,
        personality: {
          ...parsed.frontmatter.personality,
          obedience: clamp01(parsed.frontmatter.personality.obedience + (payload.deltas.obedience ?? 0)),
          liveliness: clamp01(parsed.frontmatter.personality.liveliness + (payload.deltas.liveliness ?? 0)),
          sensibility: clamp01(parsed.frontmatter.personality.sensibility + (payload.deltas.sensibility ?? 0)),
          identityKernel: {
            ...parsed.frontmatter.personality.identityKernel,
            temperament: {
              obedience: clamp01(
                (parsed.frontmatter.personality.identityKernel?.temperament?.obedience ?? parsed.frontmatter.personality.obedience)
                + (payload.deltas.obedience ?? 0),
              ),
              liveliness: clamp01(
                (parsed.frontmatter.personality.identityKernel?.temperament?.liveliness ?? parsed.frontmatter.personality.liveliness)
                + (payload.deltas.liveliness ?? 0),
              ),
              sensibility: clamp01(
                (parsed.frontmatter.personality.identityKernel?.temperament?.sensibility ?? parsed.frontmatter.personality.sensibility)
                + (payload.deltas.sensibility ?? 0),
              ),
            },
          },
          expressionProfile: {
            ...parsed.frontmatter.personality.expressionProfile,
          },
          initiativeBaseline: {
            ...parsed.frontmatter.personality.initiativeBaseline,
          },
          evolutionSeed: {
            ...parsed.frontmatter.personality.evolutionSeed,
          },
          identityAnchors: [...(parsed.frontmatter.personality.identityAnchors ?? [])],
          antiPersonaConstraints: [...(parsed.frontmatter.personality.antiPersonaConstraints ?? [])],
        },
      }).personality
      const nextFrontmatter = normalizeFrontmatter({
        ...parsed.frontmatter,
        personality: nextPersonality,
      })
      const nextRecord: BrowserSoulRecord = {
        revision: current.revision + 1,
        content: toSoulContent(nextFrontmatter, syncPersonalityBaselineInBody(parsed.body, nextPersonality)),
      }

      await writeSoulRecord(cardId, nextRecord)
      return toSoulSnapshot(cardId, nextRecord)
    },
    getKillSwitchState: async () => {
      const cardId = resolveActiveCardId()
      return await readKillSwitch(cardId)
    },
    suspendKillSwitch: async (payload) => {
      const cardId = resolveActiveCardId()
      return await writeKillSwitch(cardId, 'SUSPENDED', payload?.reason ?? 'manual')
    },
    resumeKillSwitch: async (payload) => {
      const cardId = resolveActiveCardId()
      return await writeKillSwitch(cardId, 'ACTIVE', payload?.reason ?? 'manual')
    },
    getMemoryStats: async () => {
      const cardId = resolveActiveCardId()
      const [facts, meta] = await Promise.all([
        normalizeBrowserMemoryArchiveIntoFacts(cardId),
        readMemoryMeta(cardId),
      ])
      const tierCounts = deriveMemoryTierCounts(facts, now())
      return {
        total: facts.length,
        active: facts.length,
        archived: tierCounts.cold,
        tierCounts,
        pendingSyncCount: 0,
        ingestHealth: {
          status: 'healthy',
          pendingCount: 0,
          failedCount: 0,
          oldestPendingAgeMs: null,
          nextRetryAt: null,
          lastError: null,
        },
        writeHealth: {
          backlogCount: 0,
          retryOldestAgeMs: null,
          nextRetryAt: null,
          blocked: false,
          lastError: null,
        },
        retrievalHealth: {
          semanticLatencyMs: null,
          graphLatencyMs: null,
          reconstructionFrequency: 0,
          reconstructedCount: 0,
          templateLeakageFailCount: 0,
        },
        integrity: deriveMemoryIntegrity(facts),
        lastPrunedAt: meta.lastPrunedAt ?? null,
      }
    },
    runMemoryPrune: async () => {
      const cardId = resolveActiveCardId()
      const currentTs = now()
      // NOTICE: API name retained for transport compatibility. Browser fallback now uses
      // non-destructive salience refresh so local recall never loses prior facts.
      const facts = await normalizeBrowserMemoryArchiveIntoFacts(cardId)
      const tierCounts = deriveMemoryTierCounts(facts, currentTs)
      await writeMemoryMeta(cardId, { lastPrunedAt: currentTs })

      return {
        total: facts.length,
        active: facts.length,
        archived: tierCounts.cold,
        tierCounts,
        pendingSyncCount: 0,
        ingestHealth: {
          status: 'healthy',
          pendingCount: 0,
          failedCount: 0,
          oldestPendingAgeMs: null,
          nextRetryAt: null,
          lastError: null,
        },
        writeHealth: {
          backlogCount: 0,
          retryOldestAgeMs: null,
          nextRetryAt: null,
          blocked: false,
          lastError: null,
        },
        retrievalHealth: {
          semanticLatencyMs: null,
          graphLatencyMs: null,
          reconstructionFrequency: 0,
          reconstructedCount: 0,
          templateLeakageFailCount: 0,
        },
        integrity: deriveMemoryIntegrity(facts),
        lastPrunedAt: currentTs,
      }
    },
    updateMemoryStats: async (payload) => {
      const cardId = resolveActiveCardId()
      await writeMemoryMeta(cardId, { lastPrunedAt: payload.lastPrunedAt ?? null })
      return await Promise.resolve(payload)
    },
    retrieveMemoryFacts: async (payload) => {
      const cardId = resolveActiveCardId()
      const facts = await normalizeBrowserMemoryArchiveIntoFacts(cardId)
      const query = payload.query.trim()
      if (!query || facts.length === 0)
        return []

      const queryTokens = tokenize(query)
      const currentTs = now()
      const ranked = facts
        .map(fact => ({ fact, score: scoreMemoryFact(queryTokens, fact, currentTs) }))
        .filter(item => item.score > 0.01)
        .sort((left, right) => right.score - left.score)
        .slice(0, Math.max(0, payload.limit ?? 6))

      if (ranked.length === 0)
        return []

      const touchedFacts = facts.map((fact) => {
        if (!ranked.some(item => item.fact.id === fact.id))
          return fact
        return {
          ...fact,
          accessCount: fact.accessCount + 1,
          lastAccessAt: currentTs,
        }
      })
      await writeMemoryFacts(cardId, touchedFacts)
      return ranked.map(item => ({
        ...item.fact,
        provenance: item.fact.provenance ?? mapBrowserMemorySourceToProvenance(item.fact.source),
      }))
    },
    upsertMemoryFacts: async (payload) => {
      const cardId = resolveActiveCardId()
      const current = await readMemoryFacts(cardId)
      const next = [...current]
      const currentTs = now()

      for (const fact of payload.facts) {
        const subject = sanitizeText(fact.subject)
        const predicate = sanitizeText(fact.predicate)
        const object = sanitizeText(fact.object)
        if (!subject || !predicate || !object)
          continue

        const dedupeKey = buildFactDedupeKey(subject, predicate, object)
        const existingIndex = next.findIndex(item => item.dedupeKey === dedupeKey)
        if (existingIndex >= 0) {
          const existing = next[existingIndex]
          next[existingIndex] = {
            ...existing,
            confidence: clamp01(Math.max(existing.confidence, fact.confidence)),
            source: payload.source,
            updatedAt: currentTs,
            provenance: existing.provenance ?? mapBrowserMemorySourceToProvenance(payload.source),
          }
          continue
        }

        next.push({
          id: nanoid(),
          subject,
          predicate,
          object,
          confidence: clamp01(fact.confidence),
          source: payload.source,
          dedupeKey,
          createdAt: currentTs,
          updatedAt: currentTs,
          lastAccessAt: null,
          accessCount: 0,
          provenance: mapBrowserMemorySourceToProvenance(payload.source),
        })
      }

      await writeMemoryFacts(cardId, next)
      const decisionTraceId = typeof payload.trace?.decisionTraceId === 'string' ? payload.trace.decisionTraceId.trim() : ''
      if (decisionTraceId) {
        const events = await readMindTurnEvents(cardId)
        events.push({
          id: nanoid(),
          decisionTraceId,
          turnId: typeof payload.trace?.turnId === 'string' && payload.trace.turnId.trim()
            ? payload.trace.turnId.trim()
            : null,
          sessionId: typeof payload.trace?.sessionId === 'string' && payload.trace.sessionId.trim()
            ? payload.trace.sessionId.trim()
            : null,
          origin: payload.trace?.origin === 'subconscious-proactive'
            ? 'subconscious-proactive'
            : payload.trace?.origin === 'system'
              ? 'system'
              : 'user-turn',
          kind: 'memory-facts-upserted',
          payload: {
            factInputCount: payload.facts.length,
            source: payload.source,
            trigger: payload.trace?.trigger ?? null,
            batchSize: payload.trace?.batchSize ?? null,
            extractedCount: payload.trace?.extractedCount ?? null,
          },
          createdAt: currentTs,
        })
        await writeMindTurnEvents(cardId, events)
      }
    },
    importLegacyMemory: async (payload: AlicizationMemoryLegacySnapshot): Promise<AlicizationMemoryMigrationResult> => {
      const cardId = resolveActiveCardId()
      const merged = mergeArchivedFactsIntoFacts(payload.facts, payload.archive)
      await Promise.all([
        writeMemoryFacts(cardId, merged.facts),
        writeMemoryArchive(cardId, []),
        writeMemoryMeta(cardId, { lastPrunedAt: payload.lastPrunedAt ?? null }),
      ])
      return {
        migrated: true,
        importedFacts: merged.facts.length,
        importedArchive: payload.archive.length,
        marker: `browser-import:${cardId}`,
      }
    },
    getOrganicMemorySnapshot: async () => {
      const cardId = resolveActiveCardId()
      return await buildBrowserOrganicMemorySnapshot(cardId)
    },
    getLatestProjectStateObservation: async () => {
      const cardId = resolveActiveCardId()
      const turns = await readConversationTurns(cardId)
      for (let index = turns.length - 1; index >= 0; index -= 1) {
        const observation = readConversationTurnProjectStateObservation(turns[index])
        if (observation)
          return observation
      }
      return null
    },
    getProjectStateContinuitySnapshot: async () => {
      const cardId = resolveActiveCardId()
      const turns = await readConversationTurns(cardId)
      for (let index = turns.length - 1; index >= 0; index -= 1) {
        const observation = readConversationTurnProjectStateObservation(turns[index])
        if (observation)
          return projectStateObservationToContinuitySnapshot(observation)
      }
      return null
    },
    searchOrganicSubconsciousFragments: async (payload) => {
      const cardId = resolveActiveCardId()
      const organicMemory = await readOrganicMemory(cardId)
      const query = payload.query.trim()
      if (!query)
        return []

      const queryTokens = tokenize(query)
      const currentTs = now()
      const ranked = [...organicMemory.subconsciousFragments]
        .map(fragment => ({ fragment, score: scoreFragment(queryTokens, fragment, currentTs) }))
        .filter(item => item.score > 0.01)
        .sort((left, right) => right.score - left.score || right.fragment.createdAt - left.fragment.createdAt)
        .slice(0, Math.max(1, payload.limit ?? 12))

      if (ranked.length === 0)
        return []

      const touchedIds = new Set(ranked.map(item => item.fragment.id))
      organicMemory.subconsciousFragments = organicMemory.subconsciousFragments.map((fragment) => {
        if (!touchedIds.has(fragment.id))
          return fragment
        return {
          ...fragment,
          recallCount: fragment.recallCount + 1,
          lastRecalledAt: currentTs,
          provenance: fragment.provenance ?? mapBrowserFragmentSourceToProvenance(fragment.sourceKind),
        }
      })
      await writeOrganicMemory(cardId, organicMemory)
      return organicMemory.subconsciousFragments
        .filter(fragment => touchedIds.has(fragment.id))
        .map(fragment => ({
          ...fragment,
          provenance: fragment.provenance ?? mapBrowserFragmentSourceToProvenance(fragment.sourceKind),
        }))
    },
    getPerformanceManifest: async () => {
      const cardId = resolveActiveCardId()
      return sanitizeCharacterPerformanceManifest(
        await readPerformanceManifest(cardId),
      )
    },
    setPerformanceManifest: async (payload) => {
      const cardId = resolveActiveCardId()
      await writePerformanceManifest(
        cardId,
        sanitizeCharacterPerformanceManifest(payload),
      )
    },
    appendConversationTurn: async (payload) => {
      const cardId = resolveActiveCardId()
      const currentTs = payload.createdAt ?? now()
      const turns = await readConversationTurns(cardId)
      const normalizedEmbodimentScript = normalizeAlicizationEmbodimentScript(payload.structured?.embodimentScript ?? null)
      const normalizedStructured = payload.structured
        ? {
            ...payload.structured,
            digitalLife: resolveNormalizedBridgeDigitalLife({
              digitalLife: payload.structured.digitalLife ?? null,
              embodimentScript: normalizedEmbodimentScript,
            }) ?? null,
            digitalLifeSpine: normalizeAlicizationDigitalLifeSpineDigest(
              (payload.structured.digitalLifeSpine ?? null) as Record<string, unknown> | null,
            ) ?? null,
            projectState: normalizeStructuredProjectStatePayload(
              (payload.structured.projectState ?? null) as Record<string, unknown> | null,
            ) ?? null,
            preDialogueAwareness: normalizeStructuredPreDialogueAwarenessPayload(
              (payload.structured.preDialogueAwareness ?? null) as Record<string, unknown> | null,
            ) ?? null,
            preDialogueClosure: normalizeStructuredPreDialogueClosurePayload(
              (payload.structured.preDialogueClosure ?? null) as Record<string, unknown> | null,
            ) ?? null,
          }
        : undefined
      const record: BrowserConversationTurnRecord = {
        turnId: payload.turnId?.trim() || nanoid(),
        sessionId: payload.sessionId?.trim() || 'default',
        origin: payload.origin === 'subconscious-proactive' ? 'subconscious-proactive' : 'user-turn',
        userText: sanitizeMultilineText(payload.userText, ''),
        assistantText: sanitizeMultilineText(payload.assistantText, ''),
        structured: normalizedStructured,
        visibleReplyCritic: payload.visibleReplyCritic ? { ...payload.visibleReplyCritic } : null,
        visibleReplyClosure: payload.visibleReplyClosure ? { ...payload.visibleReplyClosure } : null,
        createdAt: currentTs,
      }
      turns.push(record)
      await writeConversationTurns(cardId, turns)
      const localOrganicMemorySnapshot = await buildBrowserOrganicMemorySnapshot(cardId)
      record.structured = record.structured
        ? {
            ...record.structured,
            derivedMindStateBundle: (record.structured as Record<string, unknown>).derivedMindStateBundle ?? localOrganicMemorySnapshot.derivedMindStateBundle ?? null,
            memoryStageReplay: (record.structured as Record<string, unknown>).memoryStageReplay ?? localOrganicMemorySnapshot.memoryStageReplay ?? null,
            memoryResolutionLedger: (record.structured as Record<string, unknown>).memoryResolutionLedger ?? localOrganicMemorySnapshot.memoryResolutionLedger ?? null,
            learningExecutionState: (record.structured as Record<string, unknown>).learningExecutionState ?? localOrganicMemorySnapshot.learningExecutionState ?? null,
          }
        : {
            derivedMindStateBundle: localOrganicMemorySnapshot.derivedMindStateBundle ?? null,
            memoryStageReplay: localOrganicMemorySnapshot.memoryStageReplay ?? null,
            memoryResolutionLedger: localOrganicMemorySnapshot.memoryResolutionLedger ?? null,
            learningExecutionState: localOrganicMemorySnapshot.learningExecutionState ?? null,
          }
      await writeConversationTurns(cardId, turns)

      if (record.origin === 'user-turn' && record.userText)
        await settleBrowserPendingProactiveOutcomesFromUserTurn(cardId, currentTs)

      if (record.origin === 'subconscious-proactive') {
        const proactive = record.structured?.proactive
        if (proactive && typeof proactive === 'object') {
          const nextState = await readProactiveLoopState(cardId)
          const feedbackWindowMs = Number((proactive as Record<string, unknown>).feedbackWindowMs)
          nextState.pendingOutcomes = [
            ...nextState.pendingOutcomes.filter(entry => entry.turnId !== record.turnId),
            {
              turnId: record.turnId,
              scenario: normalizeBrowserProactiveScenario((proactive as Record<string, unknown>).scenario),
              deliveredAt: currentTs,
              feedbackWindowMs: Number.isFinite(feedbackWindowMs) ? Math.max(1_000, Math.floor(feedbackWindowMs)) : 120_000,
            },
          ].slice(-12)
          nextState.lastProactiveTurnAt = currentTs
          nextState.updatedAt = currentTs
          await writeProactiveLoopState(cardId, nextState)
        }
      }

      const traceEvents = buildBrowserMindTurnTraceEvents({ record })
      if (traceEvents.length > 0) {
        const events = await readMindTurnEvents(cardId)
        events.push(...traceEvents)
        await writeMindTurnEvents(cardId, events)
      }

      const episodicMemory = await readEpisodicMemory(cardId)
      appendBrowserEpisodicEvent(episodicMemory, buildConversationEpisodicEvent({
        cardId,
        record,
      }))
      await writeEpisodicMemory(cardId, episodicMemory)
      await syncBrowserFallbackVisualPresenceFromLocalMemory(cardId, runtime)

      if (record.userText)
        await setActiveThoughtFromUserTurn(cardId, record.userText)

      const fragmentText = buildSubconsciousFragmentText(record)
      if (fragmentText)
        await appendSubconsciousFragment(cardId, fragmentText, 'dream-fragment')
    },
    listMindTurnEvents: async (_payload: AlicizationListMindTurnEventsPayload): Promise<AlicizationMindTurnEventRecord[]> => {
      const cardId = resolveActiveCardId()
      const decisionTraceId = _payload.decisionTraceId?.trim() || ''
      const turnId = _payload.turnId?.trim() || ''
      if (!decisionTraceId && !turnId)
        return []
      const limit = Number.isFinite(Number(_payload.limit))
        ? Math.max(1, Math.min(5_000, Math.floor(Number(_payload.limit))))
        : 300
      const events = await readMindTurnEvents(cardId)
      return events
        .filter((event) => {
          if (decisionTraceId && turnId)
            return event.decisionTraceId === decisionTraceId && event.turnId === turnId
          if (decisionTraceId)
            return event.decisionTraceId === decisionTraceId
          return event.turnId === turnId
        })
        .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id))
        .slice(-limit)
    },
    listMemoryDecisionTraces: async (_payload: AlicizationListMemoryDecisionTracesPayload): Promise<AlicizationMemoryDecisionTraceRecord[]> => {
      const cardId = resolveActiveCardId()
      const decisionTraceId = _payload.decisionTraceId?.trim() || ''
      const turnId = _payload.turnId?.trim() || ''
      const activeThreadId = _payload.activeThreadId?.trim() || ''
      const limit = Number.isFinite(Number(_payload.limit))
        ? Math.max(1, Math.min(200, Math.floor(Number(_payload.limit))))
        : 20
      const events = await readMindTurnEvents(cardId)
      const filtered = events.filter((event) => {
        if (decisionTraceId && event.decisionTraceId !== decisionTraceId)
          return false
        if (turnId && event.turnId !== turnId)
          return false
        if (!activeThreadId)
          return true
        const payload = event.payload && typeof event.payload === 'object'
          ? event.payload as Record<string, unknown>
          : null
        const digitalLifeSpine = payload?.digitalLifeSpine && typeof payload.digitalLifeSpine === 'object'
          ? payload.digitalLifeSpine as Record<string, unknown>
          : null
        const runtime = digitalLifeSpine?.runtime && typeof digitalLifeSpine.runtime === 'object'
          ? digitalLifeSpine.runtime as Record<string, unknown>
          : null
        return sanitizeText(runtime?.activeThreadId) === activeThreadId
      })
      return buildAlicizationMemoryDecisionTraceRecords(filtered).slice(0, limit)
    },
    reportProactiveFeedback: async (payload) => {
      const cardId = resolveActiveCardId()
      const turnId = payload.turnId.trim()
      if (!turnId)
        return
      const state = await readProactiveLoopState(cardId)
      const entry = state.pendingOutcomes.find(candidate => candidate.turnId === turnId)
      if (!entry)
        return
      const episodicMemory = await readEpisodicMemory(cardId)
      const nextState = applyBrowserProactiveOutcome({
        ...state,
        pendingOutcomes: state.pendingOutcomes.filter(candidate => candidate.turnId !== turnId),
      }, entry, payload.feedback === 'dismiss' ? 'dismiss' : 'positive', now())
      await writeProactiveLoopState(cardId, nextState)
      appendBrowserEpisodicEvent(episodicMemory, buildProactiveOutcomeEpisodicEvent({
        cardId,
        entry,
        outcome: payload.feedback === 'dismiss' ? 'dismiss' : 'positive',
        at: now(),
      }))
      await writeEpisodicMemory(cardId, episodicMemory)
      await syncBrowserFallbackVisualPresenceFromLocalMemory(cardId, runtime)
    },
    setActiveSession: async (payload) => {
      const cardId = resolveActiveCardId()
      await ensureCardRegistered(cardId)
      await storage.setItemRaw(buildActiveSessionKey(cardId), payload.sessionId.trim())
    },
    appendAuditLog: async (payload) => {
      const cardId = resolveActiveCardId()
      await appendAuditLog(cardId, payload)
    },
    realtimeExecute: async (payload: AlicizationRealtimeExecutePayload): Promise<AlicizationRealtimeExecuteResult> => {
      return await executeBuiltinRealtimeQuery(payload)
    },
    getSensorySnapshot: async () => {
      return await buildSensorySnapshot(runtime)
    },
    getVisualPresenceState: async (): Promise<AlicizationVisualPresenceStateSnapshot | null> => {
      const cardId = resolveActiveCardId()
      const existing = await readVisualPresenceState(cardId)
      if (existing)
        return existing

      await syncBrowserFallbackVisualPresenceFromLocalMemory(cardId, runtime, null)
      return await readVisualPresenceState(cardId)
    },
    onVisualPresencePulse: (listener) => {
      visualPresencePulseListeners.add(listener)
      return () => {
        visualPresencePulseListeners.delete(listener)
      }
    },
    onVisualPresenceState: (listener) => {
      visualPresenceStateListeners.add(listener)
      return () => {
        visualPresenceStateListeners.delete(listener)
      }
    },
    syncLlmConfig: async (payload) => {
      await storage.setItemRaw(browserLlmConfigKey, payload)
    },
    getLlmConfig: async () => {
      return await storage.getItemRaw<AlicizationLlmConfigPayload>(browserLlmConfigKey) ?? {
        activeProviderId: '',
        activeModelId: '',
        providerCredentials: {},
      }
    },
    reminderSchedule: async (payload): Promise<AlicizationReminderScheduleResult> => {
      const minutes = Math.max(reminderMinMinutes, Math.min(reminderMaxMinutes, Math.floor(payload.minutes)))
      const message = sanitizeMultilineText(payload.message, '').slice(0, reminderMaxMessageChars)
      if (!message) {
        return {
          status: 'error',
          code: 'empty-message',
          message: 'Reminder message is empty.',
        }
      }

      const task = useCharacterNotebookStore().scheduleTask({
        title: message,
        details: payload.sourceTurnId ? `source:${payload.sourceTurnId}` : undefined,
        priority: 'normal',
        dueAt: now() + minutes * 60_000,
        metadata: {
          sourceTurnId: payload.sourceTurnId,
          runtime,
        },
      })

      return {
        status: 'scheduled',
        taskId: task.id,
        triggerAt: task.dueAt,
        triggerTime: task.dueAt ? new Date(task.dueAt).toISOString() : undefined,
        message,
      }
    },
    clearAllConversations: async () => {
      const cardId = resolveActiveCardId()
      await storage.removeItem(buildConversationTurnsKey(cardId))
    },
    chatAbort: async (payload): Promise<AlicizationChatAbortResult> => {
      if (runtime !== 'web') {
        return {
          accepted: false,
          state: 'not-found',
        }
      }

      const controller = pendingChatStreams.get(payload.turnId)
      if (!controller) {
        return {
          accepted: false,
          state: 'not-found',
        }
      }

      controller.abort(createAbortError(payload.reason ?? 'renderer-abort'))
      pendingChatStreams.delete(payload.turnId)
      return {
        accepted: true,
        state: 'aborted',
      }
    },
    streamChat: runtime === 'web'
      ? async (payload, options) => {
        const controller = new AbortController()
        const outerAbortHandler = () => {
          controller.abort(options.abortSignal?.reason ?? createAbortError('renderer-abort'))
        }

        if (options.abortSignal?.aborted) {
          throw options.abortSignal.reason ?? createAbortError('renderer-abort')
        }

        pendingChatStreams.set(payload.turnId, controller)
        options.abortSignal?.addEventListener('abort', outerAbortHandler, { once: true })

        try {
          const response = await fetch(`${SERVER_URL}/api/chats/stream`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              cardId: resolveActiveCardId(),
              ...payload,
            }),
            signal: controller.signal,
          })

          if (!response.ok) {
            let reason = `HTTP ${response.status}`
            try {
              const data = await response.json() as { message?: string }
              if (typeof data?.message === 'string' && data.message.trim())
                reason = data.message.trim()
            }
            catch {}
            throw new Error(stageChatText('stream.proxy-failed', { reason }))
          }

          if (!response.body) {
            throw new Error(stageChatText('stream.proxy-no-body'))
          }

          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done)
              break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const rawLine of lines) {
              const line = rawLine.trim()
              if (!line)
                continue
              let event = normalizeServerStreamEvent(JSON.parse(line))
              if (event.type === 'meta') {
                event = await enrichBrowserMetaEventWithLocalMemory({
                  cardId: resolveActiveCardId(),
                  event,
                  runtime,
                })
                await persistVisualPresencePulseFromStreamMeta({
                  cardId: resolveActiveCardId(),
                  runtime,
                  event,
                })
              }
              await options.onStreamEvent?.(event)
            }
          }

          const tail = buffer.trim()
          if (tail) {
            let event = normalizeServerStreamEvent(JSON.parse(tail))
            if (event.type === 'meta') {
              event = await enrichBrowserMetaEventWithLocalMemory({
                cardId: resolveActiveCardId(),
                event,
                runtime,
              })
              await persistVisualPresencePulseFromStreamMeta({
                cardId: resolveActiveCardId(),
                runtime,
                event,
              })
            }
            await options.onStreamEvent?.(event)
          }
        }
        catch (error) {
          if (controller.signal.aborted) {
            throw controller.signal.reason ?? createAbortError('renderer-abort')
          }
          throw error
        }
        finally {
          pendingChatStreams.delete(payload.turnId)
          options.abortSignal?.removeEventListener('abort', outerAbortHandler)
        }
      }
      : undefined,
    deleteCardScope: async (scope: AlicizationCardScope) => {
      const normalizedCardId = normalizeCardId(scope.cardId)
      await removeCardStorage(normalizedCardId)
      emitVisualPresenceState(normalizedCardId, null)
      const remaining = (await getCardIds()).filter(cardId => cardId !== normalizedCardId)
      await saveCardIds(remaining.length > 0 ? remaining : [defaultAlicizationCardId])
    },
    deleteAllData: async () => {
      const knownCardIds = await getCardIds()
      await Promise.all(knownCardIds.map(cardId => removeCardStorage(cardId)))
      emitVisualPresenceState(resolveActiveCardId(), null)
      await Promise.all([
        storage.removeItem(browserCardsIndexKey),
        storage.removeItem(browserLlmConfigKey),
      ])
    },
  })

  return () => {
    pendingChatStreams.forEach(controller => controller.abort(createAbortError('bridge-dispose')))
    pendingChatStreams.clear()
    visualPresencePulseListeners.clear()
    visualPresenceStateListeners.clear()
    clearAlicizationBridge()
  }
}

export function reportBrowserAlicizationBridgeError(error: unknown) {
  return errorMessageFrom(error) ?? String(error)
}
