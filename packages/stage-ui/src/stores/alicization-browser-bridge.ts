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
  AlicizationLlmConfigPayload,
  AlicizationMemoryArchiveRecord,
  AlicizationMemoryFact,
  AlicizationMemoryLegacySnapshot,
  AlicizationMemoryMigrationResult,
  AlicizationOrganicMemorySnapshot,
  AlicizationPersonalityState,
  AlicizationPersonalityUpdatePayload,
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
} from '@proj-alicization/stage-shared'
import { nanoid } from 'nanoid'

import { storage } from '../database/storage'
import { SERVER_URL } from '../libs/auth'
import { clearAlicizationBridge, setAlicizationBridge } from './alicization-bridge'
import { useCharacterNotebookStore } from './character'
import { useAiriCardStore } from './modules/airi-card'

const currentSoulSchemaVersion = 2
const defaultAlicizationCardId = 'default'
const bridgeStorageVersion = 1
const defaultSoulBodyTitle = '# Alicization SOUL'
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
  host_attitude: '礼貌而克制，保持观察',
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

function createAbortError(reason = 'aborted') {
  return new DOMException(`Turn aborted: ${reason}`, 'AbortError')
}

function normalizeServerStreamError(error: unknown) {
  if (typeof error === 'string')
    return new Error(error)

  const message = typeof error === 'object' && error && 'message' in error
    ? errorMessageFrom((error as { message?: unknown }).message)
    : errorMessageFrom(error)

  return new Error(message ?? 'Server stream failed.')
}

function normalizeServerStreamEvent(raw: unknown): AlicizationBridgeChatStreamEvent {
  if (!raw || typeof raw !== 'object')
    throw new Error('Invalid server stream event payload.')

  const event = raw as BrowserStreamServerEvent
  switch (event.type) {
    case 'text-delta':
      return {
        type: 'text-delta',
        text: typeof event.text === 'string' ? event.text : '',
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
      throw new Error('Unsupported server stream event type.')
  }
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
    return '女性'
  if (profile.gender === 'male')
    return '男性'
  if (profile.gender === 'non-binary')
    return '非二元'
  if (profile.gender === 'custom')
    return profile.genderCustom.trim() || '自定义'
  return '中性'
}

function buildSoulBody(frontmatter: AlicizationSoulFrontmatter) {
  return [
    defaultSoulBodyTitle,
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
    '- 输出优先体现当前 persona，不偏离 SOUL 设定。',
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

    sectionLines.push(line)
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
  }
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
  const navigatorWithBattery = navigator as Navigator & {
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

  const performanceWithMemory = performance as Performance & {
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
      const nextFrontmatter = normalizeFrontmatter({
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
        throw new Error(`SOUL revision mismatch. expected=${payload.expectedRevision} actual=${current.revision}`)
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
        throw new Error(`SOUL revision mismatch. expected=${payload.expectedRevision} actual=${current.revision}`)
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
      return {
        category: payload.category,
        source: 'builtin',
        ok: false,
        errorCode: 'browser-runtime-unavailable',
        errorMessage: 'Realtime execution is not available in browser Alicization runtime yet.',
        durationMs: 0,
      }
    },
    getSensorySnapshot: async () => {
      return await buildSensorySnapshot(runtime)
    },
    getVisualPresenceState: async (): Promise<AlicizationVisualPresenceStateSnapshot | null> => {
      return null
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
            throw new Error(`Alicization server chat proxy failed: ${reason}`)
          }

          if (!response.body) {
            throw new Error('Alicization server chat proxy returned no response body.')
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
              await options.onStreamEvent?.(event)
            }
          }

          const tail = buffer.trim()
          if (tail) {
            const event = normalizeServerStreamEvent(JSON.parse(tail))
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
      const remaining = (await getCardIds()).filter(cardId => cardId !== normalizedCardId)
      await saveCardIds(remaining.length > 0 ? remaining : [defaultAlicizationCardId])
    },
    deleteAllData: async () => {
      const knownCardIds = await getCardIds()
      await Promise.all(knownCardIds.map(cardId => removeCardStorage(cardId)))
      await Promise.all([
        storage.removeItem(browserCardsIndexKey),
        storage.removeItem(browserLlmConfigKey),
      ])
    },
  })

  return () => {
    pendingChatStreams.forEach(controller => controller.abort(createAbortError('bridge-dispose')))
    pendingChatStreams.clear()
    clearAlicizationBridge()
  }
}

export function reportBrowserAlicizationBridgeError(error: unknown) {
  return errorMessageFrom(error) ?? String(error)
}
