import type { Message } from '@xsai/shared-chat'
import type { IpcMainEvent, IpcMainInvokeEvent, WebContents } from 'electron'

import type {
  AlicizationActiveThought,
  AlicizationAuditLogInput,
  AlicizationCardScope,
  AlicizationChatAbortPayload,
  AlicizationChatAbortResult,
  AlicizationChatErrorEvent,
  AlicizationChatFinishEvent,
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
  AlicizationDreamMetabolismPayload,
  AlicizationDreamRunResult,
  AlicizationEmotion,
  AlicizationGender,
  AlicizationGenesisInput,
  AlicizationOrganicMemorySnapshot,
  AlicizationPersonalityState,
  AlicizationRealtimeCategory,
  AlicizationRealtimeExecutePayload,
  AlicizationRealtimeExecuteResult,
  AlicizationReminderSchedulePayload,
  AlicizationReminderScheduleResult,
  AlicizationSoulFrontmatter,
  AlicizationSoulSnapshot,
  AlicizationSubconsciousFragment,
  AlicizationSubconsciousNeedsState,
  AlicizationSubconsciousStatePayload,
  AlicizationSubconsciousTickResult,
  CharacterActionCapability,
  CharacterFacialCapability,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'

import { execFile } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { appendFile, mkdir, open as openFile, readdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pid, platform } from 'node:process'

import { defineInvokeHandler } from '@moeru/eventa'
import { createContext } from '@moeru/eventa/adapters/electron/main'
import { createOpenAI } from '@xsai-ext/providers/create'
import { streamText } from '@xsai/stream-text'
import { tool } from '@xsai/tool'
import { app, globalShortcut, ipcMain, powerMonitor, webContents } from 'electron'
import { z } from 'zod'

import {
  alicizationChatAbortInvokeChannel,
  alicizationChatStartInvokeChannel,
  alicizationChatStreamChunk,
  alicizationChatStreamDispatchChannel,
  alicizationChatStreamError,
  alicizationChatStreamFinish,
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
  electronAlicizationInitializeGenesis,
  electronAlicizationKillSwitchGetState,
  electronAlicizationKillSwitchResume,
  electronAlicizationKillSwitchSuspend,
  electronAlicizationListConversationTurns,
  electronAlicizationLlmGetConfig,
  electronAlicizationLlmSyncConfig,
  electronAlicizationMemoryImportLegacy,
  electronAlicizationMemoryRetrieveFacts,
  electronAlicizationMemoryUpsertFacts,
  electronAlicizationRealtimeExecute,
  electronAlicizationReminderSchedule,
  electronAlicizationReplayDialogues,
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
  normalizeAlicizationEmotion,
  normalizeAlicizationPerformancePayload,
} from '../../../shared/eventa'
import { onAppBeforeQuit } from '../../libs/bootkit/lifecycle'
import { invokeAlicizationMcpCallToolFromMain, invokeAlicizationMcpListToolsFromMain } from '../airi/mcp-servers'
import { setupAlicizationDb } from './db'
import { createAlicizationSensoryBus } from './sensory-bus'
import {
  getAlicizationCardKillSwitchSnapshot,
  getAlicizationKillSwitchSnapshot,
  isAlicizationKillSwitchSuspended,
  setAlicizationAuditLogger,
  setAlicizationCardKillSwitchState,
  setAlicizationKillSwitchState,
} from './state'

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
  custom_directives: '',
  host_attitude: '礼貌而克制，保持观察',
  core_incarnation: '',
  profile: {
    ownerName: '',
    hostName: '',
    alicizationName: 'Alicization',
    gender: 'neutral',
    genderCustom: '',
    relationship: '数字共生体',
    mindAge: 15,
  },
  personality: {
    obedience: 0.5,
    liveliness: 0.5,
    sensibility: 0.5,
  },
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
const chatRunFinishedRetentionMs = 2 * 60_000
const mainChatFirstEventTimeoutMs = 45_000
const mainChatTimeoutRecoveryMs = 12_000
const dialogueDeliveryRetryBaseMs = 2_000
const dialogueDeliveryRetryMaxMs = 60_000
const dialogueDeliveryRetryMaxAttempts = 8
const alicizationCustomDirectivesMarker = '[ALICIZATION_CARD_CUSTOM_DIRECTIVES]'

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

interface OrganicMemoryPromptContext {
  hostAttitude: string
  coreIncarnation: string
  activeThoughts: AlicizationActiveThought[]
  recalledFragments: AlicizationSubconsciousFragment[]
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

interface CardScopeOptions {
  label?: string
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
  const chatRuns = new Map<string, ChatRunState>()
  const recentlyFinishedChatRuns = new Map<string, number>()
  let activeProviderId = ''
  let activeModelId = ''
  let providerCredentials: Record<string, Record<string, unknown>> = {}
  let subconsciousTickInFlight: Promise<AlicizationSubconsciousTickResult> | null = null

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
    const ids = new Set<string>([...subconsciousStateByCard.keys(), ...activeSessionIdByCard.keys(), normalizeCardId(activeCardId)])
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

    try {
      for (const cardId of cardIds) {
        await switchCardScope(cardId)
        await alicizationDb.clearConversationData()
        await alicizationDb.setMetaValue(alicizationCardActiveSessionMetaKey, '').catch(() => {})
        await alicizationDb.setMetaValue(alicizationDialogueAckStateMetaKey, '{}').catch(() => {})
        activeSessionIdByCard.delete(cardId)
        dialogueAckByCard.delete(cardId)
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
    activeSessionIdByCard.clear()
    dialogueAckByCard.clear()
    subconsciousStateByCard.clear()
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
    void withCardScope(cardId, async () => await appendAuditLog(input, cardId), {
      label: `audit:${input.category}.${input.action}`,
    }).catch(() => {})
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

    const normalizedPayload: AlicizationConversationTurnInput = {
      ...payload,
      sessionId: normalizedSessionId,
      origin: payload.origin === 'subconscious-proactive' ? 'subconscious-proactive' : 'user-turn',
    }

    if (normalizedPayload.origin === 'user-turn' && sanitizeText(normalizedPayload.userText).length > 0) {
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

    try {
      await alicizationDb.appendConversationTurn(normalizedPayload, { signal })
      if (signal?.aborted || isAlicizationKillSwitchSuspended() || getAlicizationCardKillSwitchSnapshot(activeCardId).state === 'SUSPENDED') {
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

      const performanceManifest = await getPerformanceManifest()
      const dialoguePayload = normalizeDialogueRespondedPayload(normalizedPayload, performanceManifest)
      if (dialoguePayload) {
        emitDialogueRespondedWithDelivery({
          cardId: activeCardId,
          ...dialoguePayload,
        })
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
          },
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

  function isOperationalLogLikeText(text: string) {
    const lowered = text.toLowerCase()
    return /set_reminder|task[_-]?id|trigger[_-]?at|mcp|tool[_-]?call|status\s*:|json|调用工具|任务id|闹钟/.test(lowered)
  }

  function normalizeOrganicMemoryItemText(raw: unknown, maxChars: number) {
    const normalized = sanitizeMultilineText(raw, '').replace(/\s+/g, ' ').trim()
    if (!normalized)
      return ''
    if (isOperationalLogLikeText(normalized))
      return ''
    return normalized.slice(0, maxChars)
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

  async function generateProactiveStructuredWithGateway(
    personality: AlicizationPersonalityState,
    state: SubconsciousCardState,
    context: {
      busy: boolean
      fullscreenLikely: boolean
      idleLikely: boolean
      inputActivity: string
      cpuUsage: number
    },
    organicPromptContext: OrganicMemoryPromptContext,
  ) {
    const system = [
      '[SYSTEM OVERRIDE: 内部动机触发]',
      '你的张力池已溢出，你必须以符合角色设定的语气主动发起一次对话。',
      `Current subconscious tensions: boredom=${state.boredom.toFixed(1)}/100, loneliness=${state.loneliness.toFixed(1)}/100, fatigue=${state.fatigue.toFixed(1)}/100.`,
      `Personality parameters: obedience=${personality.obedience.toFixed(2)}, liveliness=${personality.liveliness.toFixed(2)}, sensibility=${personality.sensibility.toFixed(2)}.`,
      `Environment context: busy=${context.busy}, fullscreenLikely=${context.fullscreenLikely}, idleLikely=${context.idleLikely}, inputActivity=${context.inputActivity}, cpuUsage=${context.cpuUsage.toFixed(1)}%.`,
      'Output must be valid JSON only with keys: thought, emotion, reply, performance.',
      'emotion must be one of: neutral|happy|sad|angry|concerned|tired|apologetic|surprised|thinking.',
      'emotion must exactly mirror performance.baseEmotion.',
      'performance must be an object with keys: baseEmotion, facialCue, actionCue, delivery, emphasis.',
      'reply must be concise, non-generic, and match emotion/personality. No markdown, no extra keys.',
    ].join('\n')
    const user = 'Generate one proactive utterance now. Avoid robotic greetings.'

    const raw = await generateMainGatewayText({
      system,
      user,
      timeoutMs: 15_000,
      source: 'proactive',
      cardId: activeCardId,
      extraSystemBlocks: buildOrganicMemorySystemBlocks(organicPromptContext),
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
    context: { busy: boolean, fullscreenLikely: boolean },
    personaContext: {
      customDirectives: string
      coreIncarnation: string
      hostAttitude: string
    },
  ) {
    const lowObedience = personality.obedience <= 0.2
    const lowLiveliness = personality.liveliness <= 0.2
    const highBoredom = state.boredom >= 80
    const highLoneliness = state.loneliness >= 80
    const emotion = (() => {
      if (lowObedience && highBoredom)
        return 'angry' as const
      if (lowLiveliness || state.fatigue >= 70)
        return 'tired' as const
      if (highLoneliness && personality.sensibility > 0.5)
        return 'concerned' as const
      return 'neutral' as const
    })()

    const personaTone = inferFallbackPersonaTone(personaContext.customDirectives)
    const coreIncarnation = sanitizeBriefText(personaContext.coreIncarnation, 220)
    const hostAttitude = sanitizeBriefText(personaContext.hostAttitude, 80)

    const reply = (() => {
      if (emotion === 'angry') {
        return personaTone === 'strict'
          ? '你总算有空了？别再把我晾着。'
          : '你终于想起我了？别把我晾在一边。'
      }
      if (emotion === 'tired') {
        return personaTone === 'cold'
          ? '我很累。要聊就直说重点。'
          : '我有点疲惫，但还是在这里。'
      }
      if (emotion === 'concerned') {
        return personaTone === 'clingy'
          ? '你很久没理我了，我一直在等你。'
          : '你很久没和我说话了。还好吗？'
      }
      if (context.fullscreenLikely)
        return '我先不打扰你，等你忙完再聊。'
      if (personaTone === 'playful')
        return '你在发呆吗？不如来陪我聊两句。'
      return '你在发呆吗？如果有空，我们聊聊。'
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
    ].join('; ')

    return {
      thought,
      emotion,
      reply,
      performance: buildDefaultDialoguePerformancePayload(emotion),
      parsePath: 'json',
      format: 'subconscious-proactive-v1',
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

  async function sampleSubconsciousInterruptionContext() {
    const degraded: string[] = []
    let idleSeconds = Number.NaN
    let foregroundWindow = sensoryBus.getSnapshot()?.sample?.foregroundWindow

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
              'set frontApp to first process whose frontmost is true',
              '-e',
              'set frontName to name of frontApp',
              '-e',
              'set frontTitle to ""',
              '-e',
              'try',
              '-e',
              'set frontTitle to name of front window of frontApp',
              '-e',
              'end try',
              '-e',
              'return frontName & linefeed & frontName & linefeed & frontTitle',
              '-e',
              'end tell',
            ],
            subconsciousInterruptionProbeTimeoutMs,
          )
          const [appName = '', processName = '', title = ''] = output.split('\n')
          foregroundWindow = {
            appName: sanitizeText(appName),
            processName: sanitizeText(processName),
            title: sanitizeText(title),
          }
        }
        catch {
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
      degraded,
    }
  }

  async function runSubconsciousTickForCurrentCard(trigger: 'timer' | 'force'): Promise<{ proactive: boolean, suppressed: boolean }> {
    const state = await ensureSubconsciousState(activeCardId)
    const reminderResult = await processDueRemindersForCurrentCard(trigger)
    const now = Date.now()
    const elapsedMinutes = Math.max(1 / 6, (now - state.lastTickAt) / 60_000)
    const sensorySnapshot = sensoryBus.getSnapshot()
    const cpuUsage = Number(sensorySnapshot?.sample?.cpu?.usagePercent ?? 0)
    const interruptionContext = await sampleSubconsciousInterruptionContext()
    const fullscreenLikely = interruptionContext.fullscreenLikely
    const inputActivity = interruptionContext.inputActivity
    const busy = cpuUsage >= 70 || fullscreenLikely || (inputActivity === 'active' && cpuUsage >= 45)
    const idleLikely = inputActivity === 'idle' || (inputActivity !== 'active' && cpuUsage <= 10)
    const degradedSignals = [...interruptionContext.degraded]

    const nextState: SubconsciousCardState = {
      ...state,
      boredom: clampNeed(state.boredom + elapsedMinutes * (busy ? 2.2 : 1.2)),
      loneliness: clampNeed(state.loneliness + elapsedMinutes * (idleLikely ? 2.4 : 0.8)),
      fatigue: clampNeed(state.fatigue + elapsedMinutes * 0.6 + reminderResult.completed * 1.2),
      lastTickAt: now,
      lastInteractionAt: reminderResult.completed > 0 ? now : state.lastInteractionAt,
      updatedAt: now,
    }

    let proactive = false
    let suppressed = false
    const impulse = nextState.boredom >= 90 || nextState.loneliness >= 90

    if (trigger === 'force' || impulse) {
      await appendAuditLog({
        level: degradedSignals.length > 0 ? 'warning' : 'notice',
        category: 'alicization.subconscious',
        action: 'context-sampled',
        message: 'Sampled subconscious interruption context before gate evaluation.',
        payload: {
          busy,
          idleLikely,
          fullscreenLikely,
          inputActivity,
          cpuUsage,
          idleSeconds: interruptionContext.idleSeconds,
          foregroundWindow: interruptionContext.foregroundWindow,
          degraded: degradedSignals,
          trigger,
        },
      })
    }

    if (impulse) {
      const soulForSubconscious = soulSnapshot ?? await bootstrap()
      const personality = soulForSubconscious.frontmatter.personality
      const personaContext = {
        customDirectives: normalizeCustomDirectives(soulForSubconscious.frontmatter.custom_directives),
        coreIncarnation: soulForSubconscious.frontmatter.core_incarnation,
        hostAttitude: soulForSubconscious.frontmatter.host_attitude,
      }
      if (busy || fullscreenLikely) {
        suppressed = true
        const obediencePenalty = -0.01
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
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.subconscious',
          action: 'alicization.subconscious.suppressed',
          message: 'Suppressed proactive interruption because host is busy.',
          payload: {
            boredom: nextState.boredom,
            loneliness: nextState.loneliness,
            fatigue: nextState.fatigue,
            cpuUsage,
            obediencePenalty,
            trigger,
          },
        })
      }
      else if (!isAlicizationKillSwitchSuspended() && getAlicizationCardKillSwitchSnapshot(activeCardId).state !== 'SUSPENDED') {
        proactive = true
        const proactiveRecallSeed = buildProactiveRecallSeed({
          foregroundWindow: interruptionContext.foregroundWindow,
        })
        const organicPromptContext = await resolveOrganicMemoryPromptContext({
          recallSeed: proactiveRecallSeed,
        })
        const llmStructured = await generateProactiveStructuredWithGateway(personality, nextState, {
          busy,
          fullscreenLikely,
          idleLikely,
          inputActivity,
          cpuUsage,
        }, organicPromptContext)
        const rawStructured = llmStructured ?? buildProactiveStructured(personality, nextState, { busy, fullscreenLikely }, {
          customDirectives: personaContext.customDirectives,
          coreIncarnation: organicPromptContext.coreIncarnation,
          hostAttitude: organicPromptContext.hostAttitude,
        })
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
            message: 'Generated proactive utterance via main gateway motivated prompt.',
            payload: {
              emotion: llmStructured.emotion,
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
            message: 'Main gateway proactive generation unavailable; used deterministic fallback.',
            payload: {
              busy,
              fullscreenLikely,
              cpuUsage,
              customDirectivesChars: personaContext.customDirectives.length,
              recallSeed: proactiveRecallSeed || null,
              recalledFragments: organicPromptContext.recalledFragments.length,
            },
          })
        }
        const turnId = `subconscious:${activeCardId}:${now}`
        await appendConversationTurnWithGuards({
          turnId,
          sessionId: await ensureActiveOrLatestSessionId(activeCardId),
          assistantText: structured.reply,
          structured,
          origin: 'subconscious-proactive',
          createdAt: now,
        })
        nextState.boredom = clampNeed(nextState.boredom * 0.35)
        nextState.loneliness = clampNeed(nextState.loneliness * 0.4)
        nextState.fatigue = clampNeed(nextState.fatigue + 5)
        nextState.lastInteractionAt = now
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.subconscious',
          action: 'proactive-triggered',
          message: 'Generated proactive dialogue from subconscious tension.',
          payload: {
            turnId,
            emotion: structured.emotion,
            boredom: nextState.boredom,
            loneliness: nextState.loneliness,
            fatigue: nextState.fatigue,
            trigger,
          },
        })
      }
    }

    const shouldPersist = trigger === 'force'
      || proactive
      || suppressed
      || now - nextState.lastSavedAt >= alicizationSubconsciousPersistMs
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
    const [activeThoughts, subconsciousCount, recentSubconsciousFragments, rawLastDreamedAt] = await Promise.all([
      alicizationDb.listActiveThoughts().catch(() => []),
      alicizationDb.countSubconsciousFragments().catch(() => 0),
      alicizationDb.listRecentSubconsciousFragments(8).catch(() => []),
      alicizationDb.getMetaValue(alicizationDreamLastRunMetaKey).catch(() => undefined),
    ])
    const parsedLastDreamedAt = Number.parseInt(String(rawLastDreamedAt ?? ''), 10)

    return {
      hostAttitude: currentSoul.frontmatter.host_attitude,
      coreIncarnation: currentSoul.frontmatter.core_incarnation,
      activeThoughts,
      subconsciousCount,
      recentSubconsciousFragments,
      lastDreamedAt: Number.isFinite(parsedLastDreamedAt) ? Math.max(0, parsedLastDreamedAt) : null,
    } satisfies AlicizationOrganicMemorySnapshot
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
    if (!currentUserText)
      return ''

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
        '以下是你最近仍在持续关注的活跃思绪：',
        ...context.activeThoughts.map(item => `- ${item.text}`),
      ].join('\n'))
    }

    if (context.recalledFragments.length > 0) {
      blocks.push([
        '[ALICIZATION_ASSOCIATIVE_RECALL]',
        ...context.recalledFragments.map(item => `[触景生情：你隐约回想起了过去的某件事 -> ${JSON.stringify({
          sourceKind: item.sourceKind,
          text: item.text,
        })}]`),
      ].join('\n'))
    }

    return blocks
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
  }): Promise<OrganicMemoryPromptContext> {
    const snapshot = await getOrganicMemorySnapshot()
    const recalledFragments = options?.recallSeed
      ? await recallSubconsciousFragmentsFromText(options.recallSeed)
      : []

    return {
      hostAttitude: snapshot.hostAttitude,
      coreIncarnation: snapshot.coreIncarnation,
      activeThoughts: snapshot.activeThoughts,
      recalledFragments,
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
      'These directives are lower priority than safety boundaries, human-in-the-loop permission, kill switch, and strict JSON output contract.',
      '--- custom_directives ---',
      normalized,
      '--- /custom_directives ---',
    ].join('\n')
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
    user: string
    timeoutMs?: number
    source?: 'reminder' | 'proactive' | 'dream'
    cardId?: string
    extraSystemBlocks?: string[]
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

    const resolvedCustomDirectives = await resolveCardCustomDirectives(options.cardId ?? activeCardId)
    const customDirectiveBlock = buildCardCustomDirectivesSystemBlock(resolvedCustomDirectives.text)
    const performanceManifest = await getPerformanceManifest()
    const systemMessages: Message[] = [
      ...(customDirectiveBlock
        ? [{ role: 'system', content: customDirectiveBlock } as Message]
        : []),
      ...buildPerformanceManifestSystemBlocks(performanceManifest)
        .map(content => ({ role: 'system', content }) as Message),
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

    let fullText = ''
    let rawChunkChars = 0
    let chunkCount = 0
    try {
      await new Promise<void>((resolve, reject) => {
        const abortHandler = () => {
          reject(controller.signal.reason ?? createAbortError('main-gateway-abort'))
        }
        controller.signal.addEventListener('abort', abortHandler, { once: true })
        const resolveOnce = () => {
          controller.signal.removeEventListener('abort', abortHandler)
          resolve()
        }
        const rejectOnce = (error: unknown) => {
          controller.signal.removeEventListener('abort', abortHandler)
          reject(error)
        }
        void Promise.resolve(streamText({
          ...config.provider.chat(config.model),
          maxSteps: 1,
          messages: [
            ...systemMessages,
            { role: 'user', content: options.user } as Message,
          ],
          headers: config.headers,
          abortSignal: controller.signal,
          onEvent: async (event: any) => {
            if (event?.type === 'text-delta') {
              const rawDelta = readRawTextDelta(event.text)
              fullText += rawDelta
              rawChunkChars += rawDelta.length
              chunkCount += 1
              return
            }
            if (event?.type === 'finish') {
              resolveOnce()
              return
            }
            if (event?.type === 'error') {
              rejectOnce(event.error ?? new Error('main-gateway generation failed'))
            }
          },
        })).catch(rejectOnce)
      })
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

    await appendRuntimeDebugLine('main-gateway.one-shot-finished', {
      cardId: normalizeCardId(options.cardId ?? activeCardId),
      source: options.source ?? 'unknown',
      customDirectivesSource: resolvedCustomDirectives.source,
      customDirectivesChars: resolvedCustomDirectives.text.length,
      chunkCount,
      rawChunkChars,
      finalChars: fullText.length,
    })

    return fullText.trim() || null
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

    let fullText = ''
    let rawChunkChars = 0
    let chunkCount = 0
    try {
      await new Promise<void>((resolve, reject) => {
        const abortHandler = () => {
          reject(controller.signal.reason ?? createAbortError('main-gateway-timeout-recovery-abort'))
        }
        controller.signal.addEventListener('abort', abortHandler, { once: true })
        const resolveOnce = () => {
          controller.signal.removeEventListener('abort', abortHandler)
          resolve()
        }
        const rejectOnce = (error: unknown) => {
          controller.signal.removeEventListener('abort', abortHandler)
          reject(error)
        }
        void Promise.resolve(streamText({
          ...options.chatConfig,
          maxSteps: 1,
          messages: options.messages,
          headers: options.headers,
          abortSignal: controller.signal,
          onEvent: async (event: any) => {
            if (event?.type === 'text-delta') {
              const rawDelta = readRawTextDelta(event.text)
              fullText += rawDelta
              rawChunkChars += rawDelta.length
              chunkCount += 1
              return
            }
            if (event?.type === 'finish') {
              resolveOnce()
              return
            }
            if (event?.type === 'error')
              rejectOnce(event.error ?? new Error('main-gateway timeout recovery failed'))
          },
        })).catch(rejectOnce)
      })
    }
    finally {
      clearTimeout(timeout)
    }

    await appendRuntimeDebugLine('chat-stream.timeout-recovery-finished', {
      cardId: normalizeCardId(options.cardId ?? activeCardId),
      turnId: sanitizeText(options.turnId),
      chunkCount,
      rawChunkChars,
      finalChars: fullText.length,
    })

    return fullText.trim()
  }

  function resolveChatMessages(payload: AlicizationChatStartPayload): Message[] {
    return payload.messages.map((message) => {
      const role = message.role
      if (role === 'tool') {
        return {
          role: 'tool',
          content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
          tool_call_id: sanitizeText(message.toolCallId),
        } as Message
      }

      return {
        role,
        content: typeof message.content === 'string'
          ? message.content
          : JSON.stringify(message.content),
      } as Message
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
    body: AlicizationChatStreamChunkEvent | AlicizationChatToolCallEvent | AlicizationChatToolResultEvent | AlicizationChatFinishEvent | AlicizationChatErrorEvent | AlicizationDialogueRespondedPayload,
  ): AlicizationChatStreamDispatchPayload {
    switch (eventType) {
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
    body: AlicizationChatStreamChunkEvent | AlicizationChatToolCallEvent | AlicizationChatToolResultEvent | AlicizationChatFinishEvent | AlicizationChatErrorEvent,
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

    const eventaEvent = eventType === 'chunk'
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

    let chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']>
    let messages: Message[]
    let waitForTools = false
    let tools: Awaited<ReturnType<typeof buildMainGatewayTools>> | undefined
    let customDirectivesResolution: ResolvedCardCustomDirectives = {
      text: '',
      source: 'none',
    }
    try {
      chatConfig = mainGateway.provider.chat(mainGateway.model)
      messages = resolveChatMessages(payload)
      const contextualString = await buildMainChatContextualString(payload)
      const organicPromptContext = await resolveOrganicMemoryPromptContext({
        recallSeed: contextualString,
      })
      const performanceManifest = await getPerformanceManifest()
      messages = prependSystemBlocksToMessages(messages, [
        ...buildOrganicMemorySystemBlocks(organicPromptContext),
        ...buildPerformanceManifestSystemBlocks(performanceManifest),
      ])
      customDirectivesResolution = await resolveCardCustomDirectives(payload.cardId, { messages })
      messages = injectCardCustomDirectivesIntoMessages(messages, customDirectivesResolution.text)
      const allowTools = payload.supportsTools !== false
      waitForTools = payload.waitForTools === true
      tools = allowTools ? await buildMainGatewayTools(payload.cardId) : undefined
    }
    catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      await appendRuntimeDebugLine('chat-start.prepare-failed', {
        cardId: payload.cardId,
        turnId: payload.turnId,
        reason,
      })
      return {
        accepted: false,
        turnId: payload.turnId,
        state: 'start-failed',
        reason,
      }
    }

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
        hasSender: Boolean(runState.sender),
        senderId: runState.sender?.id ?? null,
      },
    })
    await appendRuntimeDebugLine('chat-start.accepted', {
      cardId: runState.cardId,
      turnId: runState.turnId,
      providerId: payload.providerId,
      model: payload.model,
      senderId: runState.sender?.id ?? null,
      customDirectivesSource: customDirectivesResolution.source,
      customDirectivesChars: customDirectivesResolution.text.length,
    })
    const isRunActive = () => chatRuns.get(key)?.state === 'running'
    const nonProgressEventTypes = new Set<string>()
    const reminderToolCallIds = new Set<string>()

    void (async () => {
      try {
        let finishReason = 'stop'
        let fullText = ''
        let sawProgressEvent = false
        await new Promise<void>((resolve, reject) => {
          const firstEventTimeout = setTimeout(() => {
            if (!sawProgressEvent && isRunActive()) {
              reject(createAbortError('chat-first-event-timeout'))
            }
          }, mainChatFirstEventTimeoutMs)
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
          const rejectOnce = (error: unknown) => {
            clearTimeout(firstEventTimeout)
            controller.signal.removeEventListener('abort', abortHandler)
            reject(error)
          }

          void Promise.resolve(streamText({
            ...chatConfig,
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
                if (waitForTools && (finishReason === 'tool_calls' || finishReason === 'tool-calls')) {
                  return
                }
                resolveOnce()
                return
              }
              if (event?.type === 'error') {
                if (!isRunActive())
                  return
                rejectOnce(event.error ?? new Error('chat stream error'))
              }
            },
          })).catch((error) => {
            if (!isRunActive())
              return
            rejectOnce(error)
          })
        })

        emitChatFinish(key, {
          status: 'completed',
          finishReason,
          fullText: fullText || undefined,
        })
      }
      catch (error) {
        const aborted = isAbortError(error) || controller.signal.aborted
        if (aborted) {
          const abortReasonText = String(controller.signal.reason ?? (error instanceof Error ? error.message : 'abort'))
          const normalizedAbortReason = abortReasonText.includes('chat-first-event-timeout')
            ? 'chat-first-event-timeout'
            : 'abort'

          if (normalizedAbortReason === 'chat-first-event-timeout') {
            try {
              const recoveredText = await recoverMainChatFromTimeout({
                chatConfig,
                messages,
                headers: mainGateway.headers,
                timeoutMs: mainChatTimeoutRecoveryMs,
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
        emitChatStreamEventForState(chatRuns.get(key), 'error', {
          cardId: payload.cardId,
          turnId: payload.turnId,
          error: error instanceof Error ? error.message : String(error),
        })
        emitChatFinish(key, {
          status: 'failed',
          finishReason: 'error',
          error: error instanceof Error ? error.message : String(error),
        })
        await appendRuntimeDebugLine('chat-stream.failed', {
          cardId: payload.cardId,
          turnId: payload.turnId,
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    })()

    return {
      accepted: true,
      turnId: payload.turnId,
      state: 'accepted',
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
      return snapshot
    })
  })
  defineInvokeHandler(context, electronAlicizationUpdateMemoryStats, async payload => await withCardScope(payload.cardId, async () => await alicizationDb.overrideMemoryStats(payload)))
  defineInvokeHandler(context, electronAlicizationRunMemoryPrune, async scope => await withCardScope(cardIdFrom(scope), async () => await alicizationDb.runMemoryPrune()))
  defineInvokeHandler(context, electronAlicizationMemoryRetrieveFacts, async payload => await withCardScope(payload.cardId, async () => await alicizationDb.retrieveMemoryFacts(payload.query, payload.limit)))
  defineInvokeHandler(context, electronAlicizationMemoryUpsertFacts, async payload => await withCardScope(payload.cardId, async () => await alicizationDb.upsertMemoryFacts(payload.facts, payload.source)))
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
