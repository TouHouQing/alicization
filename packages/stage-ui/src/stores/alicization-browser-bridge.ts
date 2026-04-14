import type {
  AlicizationAuditLogInput,
  AlicizationBridgeChatStreamEvent,
  AlicizationCardScope,
  AlicizationChatAbortResult,
  AlicizationConversationTurnInput,
  AlicizationGenesisInput,
  AlicizationInitializeGenesisResult,
  AlicizationKillSwitchSnapshot,
  AlicizationKillSwitchState,
  AlicizationListMindTurnEventsPayload,
  AlicizationLlmConfigPayload,
  AlicizationMemoryArchiveRecord,
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
  defaultAlicizationCustomDirectives,
  defaultAlicizationPersonality,
  defaultAlicizationProfile,
  hasAlicizationPersonaIdentity,
  resolveAlicizationPersonaKernel,
} from '@proj-alicization/stage-shared'
import { nanoid } from 'nanoid'

import { storage } from '../database/storage'
import { SERVER_URL } from '../libs/auth'
import { getStageUiMessageVariants, translateStageUi } from '../utils/i18n'
import {
  clearAlicizationBridge,
  normalizeAlicizationDigitalLifeSpineDigest,
  normalizeAlicizationRuntimeDigest,
  setAlicizationBridge,
} from './alicization-bridge'
import {
  buildAlicizationVisualPresenceStateFromSpineDigest,
  buildFallbackAlicizationVisualPresenceState,
  ensureAlicizationVisualPresenceResidentPerformance,
} from './alicization-visual-presence-spine'
import { useCharacterNotebookStore } from './character'
import { useAiriCardStore } from './modules/airi-card'

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

interface BrowserOrganicMemoryRecord {
  activeThoughts: AlicizationOrganicMemorySnapshot['activeThoughts']
  subconsciousFragments: AlicizationSubconsciousFragment[]
  lastDreamedAt: number | null
}

interface BrowserConversationTurnRecord extends Required<Pick<AlicizationConversationTurnInput, 'turnId' | 'sessionId' | 'createdAt'>> {
  origin: NonNullable<AlicizationConversationTurnInput['origin']>
  userText: string
  assistantText: string
  structured?: Record<string, unknown>
}

const defaultFrontmatter: AlicizationSoulFrontmatter = {
  schemaVersion: currentSoulSchemaVersion,
  initialized: false,
  custom_directives: defaultAlicizationCustomDirectives,
  host_attitude: translateStageUi('stage.alicization.soul.default-host-attitude'),
  core_incarnation: '',
  profile: { ...defaultAlicizationProfile },
  personality: { ...defaultAlicizationPersonality },
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
    case 'meta':
      return {
        type: 'meta',
        governance: event.governance && typeof event.governance === 'object'
          ? event.governance
          : null,
        embodiment: event.embodiment && typeof event.embodiment === 'object'
          ? event.embodiment
          : null,
        speechTimeline: event.speechTimeline && typeof event.speechTimeline === 'object'
          ? event.speechTimeline
          : null,
        digitalLife: event.digitalLife && typeof event.digitalLife === 'object'
          ? event.digitalLife
          : null,
        digitalLifeSpine: normalizeAlicizationDigitalLifeSpineDigest(event.digitalLifeSpine),
        runtimeDigest: normalizeAlicizationRuntimeDigest(event.runtimeDigest),
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
  const normalizedFrontmatter = {
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
  const decay = Math.exp(-ageDays / 14)
  const accessBoost = Math.min(0.2, fact.accessCount / 50)

  return (lexicalScore * 0.5 + fact.confidence * 0.4 + accessBoost * 0.1) * decay
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

async function executeBuiltinWeather(query: string): Promise<AlicizationRealtimeExecuteResult> {
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
    return {
      category: 'weather',
      source: 'builtin',
      ok: true,
      summary: [
        `${resolvedLocation || location} 当前天气：${describeWeatherCode(Number(current.weather_code))}`,
        `温度 ${Number(current.temperature_2m).toFixed(1)}°C，体感 ${Number(current.apparent_temperature).toFixed(1)}°C`,
        `湿度 ${Number(current.relative_humidity_2m).toFixed(0)}%，风速 ${Number(current.wind_speed_10m).toFixed(1)} km/h`,
      ].join('；'),
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
    return {
      category: 'news',
      source: 'builtin',
      ok: true,
      summary: [
        `${term} 的最新事件（按时间倒序）：`,
        ...items.map((item, index) => `${index + 1}. ${item.title}${item.source ? `（${item.source}）` : ''}`),
      ].join('\n'),
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
      return {
        category: 'finance',
        source: 'builtin',
        ok: true,
        summary: `${upperTicker} 当前价格约为 $${price.toFixed(2)}，24h 变动 ${change.toFixed(2)}%。`,
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

    return {
      category: 'finance',
      source: 'builtin',
      ok: true,
      summary: `${upperTicker} 最近收盘价约为 $${closePrice.toFixed(2)}（日期 ${record.Date || '未知'}）。`,
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

    return {
      category: 'sports',
      source: 'builtin',
      ok: true,
      summary: [
        `${leagueInfo.label} 最近比赛：`,
        ...selected.map((item, index) => `${index + 1}. ${item.name} ${item.score}（${item.status}）`),
      ].join('\n'),
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

function createDefaultOrganicMemoryRecord(): BrowserOrganicMemoryRecord {
  return {
    activeThoughts: [],
    subconsciousFragments: [],
    lastDreamedAt: null,
  }
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

async function readOrganicMemory(cardId: string) {
  await ensureCardRegistered(cardId)
  return await storage.getItemRaw<BrowserOrganicMemoryRecord>(buildOrganicMemoryKey(cardId)) ?? createDefaultOrganicMemoryRecord()
}

async function writeOrganicMemory(cardId: string, record: BrowserOrganicMemoryRecord) {
  await ensureCardRegistered(cardId)
  await storage.setItemRaw(buildOrganicMemoryKey(cardId), record)
}

async function readConversationTurns(cardId: string) {
  await ensureCardRegistered(cardId)
  return await storage.getItemRaw<BrowserConversationTurnRecord[]>(buildConversationTurnsKey(cardId)) ?? []
}

async function writeConversationTurns(cardId: string, turns: BrowserConversationTurnRecord[]) {
  await ensureCardRegistered(cardId)
  await storage.setItemRaw(buildConversationTurnsKey(cardId), turns.slice(-maxConversationTurns))
}

async function readMemoryFacts(cardId: string) {
  await ensureCardRegistered(cardId)
  return await storage.getItemRaw<AlicizationMemoryFact[]>(buildMemoryFactsKey(cardId)) ?? []
}

async function writeMemoryFacts(cardId: string, facts: AlicizationMemoryFact[]) {
  await ensureCardRegistered(cardId)
  await storage.setItemRaw(buildMemoryFactsKey(cardId), facts)
}

async function readMemoryArchive(cardId: string) {
  await ensureCardRegistered(cardId)
  return await storage.getItemRaw<AlicizationMemoryArchiveRecord[]>(buildMemoryArchiveKey(cardId)) ?? []
}

async function writeMemoryArchive(cardId: string, archive: AlicizationMemoryArchiveRecord[]) {
  await ensureCardRegistered(cardId)
  await storage.setItemRaw(buildMemoryArchiveKey(cardId), archive)
}

async function readMemoryMeta(cardId: string) {
  await ensureCardRegistered(cardId)
  return await storage.getItemRaw<{ lastPrunedAt: number | null }>(buildMemoryMetaKey(cardId)) ?? { lastPrunedAt: null }
}

async function writeMemoryMeta(cardId: string, meta: { lastPrunedAt: number | null }) {
  await ensureCardRegistered(cardId)
  await storage.setItemRaw(buildMemoryMetaKey(cardId), meta)
}

async function readPerformanceManifest(cardId: string) {
  await ensureCardRegistered(cardId)
  return await storage.getItemRaw<CharacterPerformanceCapabilitiesManifest | null>(buildPerformanceManifestKey(cardId)) ?? null
}

async function writePerformanceManifest(cardId: string, manifest: CharacterPerformanceCapabilitiesManifest | null) {
  await ensureCardRegistered(cardId)
  await storage.setItemRaw(buildPerformanceManifestKey(cardId), manifest)
}

async function readVisualPresenceState(cardId: string) {
  await ensureCardRegistered(cardId)
  const state = await storage.getItemRaw<AlicizationVisualPresenceStateSnapshot>(buildVisualPresenceKey(cardId)) ?? null
  return state
    ? ensureAlicizationVisualPresenceResidentPerformance(state)
    : null
}

async function writeVisualPresenceState(cardId: string, state: AlicizationVisualPresenceStateSnapshot) {
  await ensureCardRegistered(cardId)
  await storage.setItemRaw(
    buildVisualPresenceKey(cardId),
    ensureAlicizationVisualPresenceResidentPerformance(state),
  )
}

function buildVisualPresencePulsePayload(state: AlicizationVisualPresenceStateSnapshot): AlicizationPresencePulsePayload | null {
  const privateThought = state.privateThought
  const currentScene = state.currentScene
  if (!privateThought || privateThought.embodiedPresence === 'none' || !currentScene)
    return null

  return {
    watchMode: state.watchMode,
    embodiedPresence: privateThought.embodiedPresence,
    scenario: currentScene.scenario,
    stance: privateThought.stance,
    confidence: privateThought.confidence,
    reasonTags: [...privateThought.rationaleTags],
    emotionalTension: privateThought.emotionalTension,
    expiresAt: privateThought.expiresAt,
  }
}

function emitVisualPresenceState(cardIdRaw: unknown, state: AlicizationVisualPresenceStateSnapshot | null) {
  const cardId = normalizeCardId(cardIdRaw)
  if (cardId !== resolveActiveCardId())
    return

  for (const listener of visualPresenceStateListeners)
    listener(state)
}

function emitVisualPresencePulse(cardIdRaw: unknown, state: AlicizationVisualPresenceStateSnapshot | null) {
  const cardId = normalizeCardId(cardIdRaw)
  if (cardId !== resolveActiveCardId() || !state)
    return

  const payload = buildVisualPresencePulsePayload(state)
  if (!payload || payload.expiresAt <= now())
    return

  for (const listener of visualPresencePulseListeners)
    listener(payload)
}

async function persistVisualPresenceState(cardId: string, state: AlicizationVisualPresenceStateSnapshot) {
  const normalizedState = ensureAlicizationVisualPresenceResidentPerformance(state)
  await writeVisualPresenceState(cardId, normalizedState)
  emitVisualPresenceState(cardId, normalizedState)
  emitVisualPresencePulse(cardId, normalizedState)
}

async function persistVisualPresencePulseFromStreamMeta(input: {
  cardId: string
  runtime: BrowserRuntimeKind
  event: Extract<AlicizationBridgeChatStreamEvent, { type: 'meta' }>
}) {
  const existing = await readVisualPresenceState(input.cardId)
  const digest = input.event.digitalLifeSpine ?? null
  if (digest) {
    const sensory = await buildSensorySnapshot(input.runtime)
    await persistVisualPresenceState(input.cardId, buildAlicizationVisualPresenceStateFromSpineDigest({
      digest,
      snapshot: sensory,
      previous: existing,
    }))
    return
  }

  if (existing) {
    await persistVisualPresenceState(input.cardId, {
      ...existing,
      updatedAt: now(),
    })
    return
  }

  const sensory = await buildSensorySnapshot(input.runtime)
  await persistVisualPresenceState(input.cardId, buildFallbackAlicizationVisualPresenceState({
    snapshot: sensory,
  }))
}

async function appendAuditLog(cardId: string, payload: AlicizationAuditLogInput) {
  const current = await storage.getItemRaw<AlicizationAuditLogInput[]>(buildAuditLogKey(cardId)) ?? []
  current.push({
    ...payload,
    createdAt: payload.createdAt ?? now(),
  })
  await ensureCardRegistered(cardId)
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
    storage.removeItem(buildConversationTurnsKey(cardId)),
    storage.removeItem(buildAuditLogKey(cardId)),
    storage.removeItem(buildPerformanceManifestKey(cardId)),
    storage.removeItem(buildActiveSessionKey(cardId)),
    storage.removeItem(buildVisualPresenceKey(cardId)),
  ])
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
    },
    ...organicMemory.subconsciousFragments,
  ].slice(0, maxSubconsciousFragments)

  await writeOrganicMemory(cardId, organicMemory)
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
      const nextPersonality = {
        obedience: clamp01(parsed.frontmatter.personality.obedience + (payload.deltas.obedience ?? 0)),
        liveliness: clamp01(parsed.frontmatter.personality.liveliness + (payload.deltas.liveliness ?? 0)),
        sensibility: clamp01(parsed.frontmatter.personality.sensibility + (payload.deltas.sensibility ?? 0)),
      }
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
      const [facts, archive, meta] = await Promise.all([
        readMemoryFacts(cardId),
        readMemoryArchive(cardId),
        readMemoryMeta(cardId),
      ])
      return {
        total: facts.length + archive.length,
        active: facts.length,
        archived: archive.length,
        lastPrunedAt: meta.lastPrunedAt ?? null,
      }
    },
    runMemoryPrune: async () => {
      const cardId = resolveActiveCardId()
      const currentTs = now()
      const [facts, archive] = await Promise.all([
        readMemoryFacts(cardId),
        readMemoryArchive(cardId),
      ])
      const keepFacts: AlicizationMemoryFact[] = []
      const archivedFacts: AlicizationMemoryArchiveRecord[] = [...archive]

      for (const fact of facts) {
        const score = computePruneScore(fact, currentTs)
        const daysSinceAccess = fact.lastAccessAt == null ? Number.POSITIVE_INFINITY : (currentTs - fact.lastAccessAt) / dayMs

        if (score >= 0.92 && daysSinceAccess >= 30)
          continue

        if (score >= 0.72 && daysSinceAccess >= 14) {
          archivedFacts.push({
            ...fact,
            archivedAt: currentTs,
          })
          continue
        }

        keepFacts.push(fact)
      }

      await writeMemoryFacts(cardId, keepFacts)
      const retainedArchive = archivedFacts.filter(record => ((currentTs - record.archivedAt) / dayMs) <= 30)
      await writeMemoryArchive(cardId, retainedArchive)
      await writeMemoryMeta(cardId, { lastPrunedAt: currentTs })

      return {
        total: keepFacts.length + archivedFacts.length,
        active: keepFacts.length,
        archived: retainedArchive.length,
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
      const facts = await readMemoryFacts(cardId)
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
      return ranked.map(item => item.fact)
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
        })
      }

      await writeMemoryFacts(cardId, next)
    },
    importLegacyMemory: async (payload: AlicizationMemoryLegacySnapshot): Promise<AlicizationMemoryMigrationResult> => {
      const cardId = resolveActiveCardId()
      await Promise.all([
        writeMemoryFacts(cardId, payload.facts),
        writeMemoryArchive(cardId, payload.archive),
        writeMemoryMeta(cardId, { lastPrunedAt: payload.lastPrunedAt ?? null }),
      ])
      return {
        migrated: true,
        importedFacts: payload.facts.length,
        importedArchive: payload.archive.length,
        marker: `browser-import:${cardId}`,
      }
    },
    getOrganicMemorySnapshot: async () => {
      const cardId = resolveActiveCardId()
      const [soul, organicMemory] = await Promise.all([
        readSoulRecord(cardId).then(record => toSoulSnapshot(cardId, record)),
        readOrganicMemory(cardId),
      ])
      return {
        hostAttitude: soul.frontmatter.host_attitude,
        coreIncarnation: soul.frontmatter.core_incarnation,
        activeThoughts: [...organicMemory.activeThoughts].sort((left, right) => right.updatedAt - left.updatedAt),
        subconsciousCount: organicMemory.subconsciousFragments.length,
        recentSubconsciousFragments: [...organicMemory.subconsciousFragments]
          .sort((left, right) => right.createdAt - left.createdAt)
          .slice(0, 12),
        lastDreamedAt: organicMemory.lastDreamedAt,
      }
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
        }
      })
      await writeOrganicMemory(cardId, organicMemory)
      return organicMemory.subconsciousFragments.filter(fragment => touchedIds.has(fragment.id))
    },
    getPerformanceManifest: async () => {
      const cardId = resolveActiveCardId()
      return await readPerformanceManifest(cardId)
    },
    setPerformanceManifest: async (payload) => {
      const cardId = resolveActiveCardId()
      await writePerformanceManifest(cardId, payload)
    },
    appendConversationTurn: async (payload) => {
      const cardId = resolveActiveCardId()
      const currentTs = payload.createdAt ?? now()
      const turns = await readConversationTurns(cardId)
      const record: BrowserConversationTurnRecord = {
        turnId: payload.turnId?.trim() || nanoid(),
        sessionId: payload.sessionId?.trim() || 'default',
        origin: payload.origin === 'subconscious-proactive' ? 'subconscious-proactive' : 'user-turn',
        userText: sanitizeMultilineText(payload.userText, ''),
        assistantText: sanitizeMultilineText(payload.assistantText, ''),
        structured: payload.structured ? { ...payload.structured } : undefined,
        createdAt: currentTs,
      }
      turns.push(record)
      await writeConversationTurns(cardId, turns)

      if (record.userText)
        await setActiveThoughtFromUserTurn(cardId, record.userText)

      const fragmentText = buildSubconsciousFragmentText(record)
      if (fragmentText)
        await appendSubconsciousFragment(cardId, fragmentText, 'dream-fragment')
    },
    listMindTurnEvents: async (_payload: AlicizationListMindTurnEventsPayload): Promise<AlicizationMindTurnEventRecord[]> => {
      // NOTICE: Browser fallback runtime has no persistent mind_turn_events ledger.
      // Keep interface parity with Electron runtime and return an empty replay chain.
      return []
    },
    reportProactiveFeedback: async () => {},
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

      const snapshot = await buildSensorySnapshot(runtime)
      const fallback = buildFallbackAlicizationVisualPresenceState({
        snapshot,
      })
      await persistVisualPresenceState(cardId, fallback)
      return fallback
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
              const event = normalizeServerStreamEvent(JSON.parse(line))
              if (event.type === 'meta') {
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
            const event = normalizeServerStreamEvent(JSON.parse(tail))
            if (event.type === 'meta') {
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
