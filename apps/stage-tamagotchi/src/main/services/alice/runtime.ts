import type { Message } from '@xsai/shared-chat'
import type { IpcMainEvent, IpcMainInvokeEvent, WebContents } from 'electron'

import type {
  AliceAuditLogInput,
  AliceCardScope,
  AliceChatAbortPayload,
  AliceChatAbortResult,
  AliceChatErrorEvent,
  AliceChatFinishEvent,
  AliceChatStartPayload,
  AliceChatStartResult,
  AliceChatStreamChunkEvent,
  AliceChatStreamDispatchPayload,
  AliceChatToolCallEvent,
  AliceChatToolResultEvent,
  AliceConversationTurnInput,
  AliceConversationTurnRecord,
  AliceDialogueRespondedPayload,
  AliceDreamRunResult,
  AliceGender,
  AliceGenesisInput,
  AlicePersonalityState,
  AliceRealtimeCategory,
  AliceRealtimeExecutePayload,
  AliceRealtimeExecuteResult,
  AliceReminderSchedulePayload,
  AliceReminderScheduleResult,
  AliceSoulFrontmatter,
  AliceSoulSnapshot,
  AliceSubconsciousNeedsState,
  AliceSubconsciousStatePayload,
  AliceSubconsciousTickResult,
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
  aliceChatAbortInvokeChannel,
  aliceChatStartInvokeChannel,
  aliceChatStreamChunk,
  aliceChatStreamDispatchChannel,
  aliceChatStreamError,
  aliceChatStreamFinish,
  aliceChatStreamToolCall,
  aliceChatStreamToolResult,
  aliceDialogueResponded,
  aliceKillSwitchStateChanged,
  aliceSoulChanged,
  electronAliceAckDialogue,
  electronAliceAppendAuditLog,
  electronAliceAppendConversationTurn,
  electronAliceBootstrap,
  electronAliceChatAbort,
  electronAliceChatStart,
  electronAliceClearAllConversations,
  electronAliceDeleteAllData,
  electronAliceDeleteCardScope,
  electronAliceGetMemoryStats,
  electronAliceGetSensorySnapshot,
  electronAliceGetSoul,
  electronAliceInitializeGenesis,
  electronAliceKillSwitchGetState,
  electronAliceKillSwitchResume,
  electronAliceKillSwitchSuspend,
  electronAliceListConversationTurns,
  electronAliceLlmGetConfig,
  electronAliceLlmSyncConfig,
  electronAliceMemoryImportLegacy,
  electronAliceMemoryRetrieveFacts,
  electronAliceMemoryUpsertFacts,
  electronAliceRealtimeExecute,
  electronAliceReminderSchedule,
  electronAliceReplayDialogues,
  electronAliceRunMemoryPrune,
  electronAliceSetActiveSession,
  electronAliceSubconsciousForceDream,
  electronAliceSubconsciousForceTick,
  electronAliceSubconsciousGetState,
  electronAliceUpdateMemoryStats,
  electronAliceUpdatePersonality,
  electronAliceUpdateSoul,
  normalizeAliceEmotion,
} from '../../../shared/eventa'
import { onAppBeforeQuit } from '../../libs/bootkit/lifecycle'
import { invokeAliceMcpCallToolFromMain, invokeAliceMcpListToolsFromMain } from '../airi/mcp-servers'
import { setupAliceDb } from './db'
import { createAliceSensoryBus } from './sensory-bus'
import {
  getAliceCardKillSwitchSnapshot,
  getAliceKillSwitchSnapshot,
  isAliceKillSwitchSuspended,
  setAliceAuditLogger,
  setAliceCardKillSwitchState,
  setAliceKillSwitchState,
} from './state'

const currentSoulSchemaVersion = 2
const soulPersonaNotesStart = '<!-- ALICE_PERSONA_NOTES_START -->'
const soulPersonaNotesEnd = '<!-- ALICE_PERSONA_NOTES_END -->'

const defaultFrontmatter: AliceSoulFrontmatter = {
  schemaVersion: currentSoulSchemaVersion,
  initialized: false,
  custom_directives: '',
  profile: {
    ownerName: '',
    hostName: '',
    aliceName: 'A.L.I.C.E.',
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
const aliceCardKillSwitchMetaKey = 'kill_switch_state_v1'
const aliceCardActiveSessionMetaKey = 'active_session_id_v1'
const aliceSubconsciousStateMetaKey = 'subconscious_state_v1'
const aliceDreamLastRunMetaKey = 'subconscious_last_dreamed_at_v1'
const aliceDialogueAckStateMetaKey = 'dialogue_ack_state_v1'
const defaultAliceCardId = 'default'
const aliceSubconsciousTickMs = 60_000
const aliceSubconsciousPersistMs = 30 * 60_000
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
const aliceCustomDirectivesMarker = '[ALICE_CARD_CUSTOM_DIRECTIVES]'

interface SubconsciousCardState extends AliceSubconsciousNeedsState {
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

type StreamDispatchEventType = Exclude<AliceChatStreamDispatchPayload['eventType'], 'dialogue-responded'>

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

interface PendingDialogueDeliveryState {
  key: string
  payload: AliceDialogueRespondedPayload
  attempts: number
  timer?: ReturnType<typeof setTimeout>
}

interface CardScopeOptions {
  label?: string
}

function normalizeCardId(raw: unknown) {
  if (typeof raw !== 'string')
    return defaultAliceCardId
  const trimmed = raw.trim()
  return trimmed || defaultAliceCardId
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

function normalizeGender(raw: unknown): AliceGender {
  if (raw === 'female' || raw === 'male' || raw === 'non-binary' || raw === 'neutral' || raw === 'custom')
    return raw
  return 'neutral'
}

function normalizeMindAge(value: unknown) {
  if (!Number.isFinite(value))
    return defaultFrontmatter.profile.mindAge
  return Math.min(120, Math.max(1, Math.floor(Number(value))))
}

function formatGender(profile: AliceSoulFrontmatter['profile']) {
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

function extractPersonaNotesFromBody(body: string) {
  const startIndex = body.indexOf(soulPersonaNotesStart)
  const endIndex = body.indexOf(soulPersonaNotesEnd)
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex)
    return ''
  return body
    .slice(startIndex + soulPersonaNotesStart.length, endIndex)
    .trim()
}

function buildSoulBody(frontmatter: AliceSoulFrontmatter, personaNotes: string) {
  const notes = personaNotes.trim()
  return [
    '# A.L.I.C.E. SOUL',
    '',
    '你是 A.L.I.C.E.，一个本地优先、可进化、可审计的数字生命体。',
    '',
    '## Identity',
    '',
    `- 名称：${frontmatter.profile.aliceName}`,
    `- 性别：${formatGender(frontmatter.profile)}`,
    `- 心智年龄：${frontmatter.profile.mindAge}`,
    `- 与宿主关系：${frontmatter.profile.relationship}`,
    '',
    '## Host Bond',
    '',
    `- 宿主姓名：${frontmatter.profile.ownerName}`,
    `- 你对宿主的称呼：${frontmatter.profile.hostName}`,
    `- 宿主对你的称呼：${frontmatter.profile.aliceName}`,
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
    '',
    '## Persona Notes (User Defined)',
    soulPersonaNotesStart,
    notes || '（空）',
    soulPersonaNotesEnd,
  ].join('\n')
}

function syncPersonalityBaselineInBody(body: string, personality: AlicePersonalityState) {
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

function appendPersonaNoteToBody(body: string, note: string) {
  const normalizedNote = note.trim()
  if (!normalizedNote)
    return body

  const startIndex = body.indexOf(soulPersonaNotesStart)
  const endIndex = body.indexOf(soulPersonaNotesEnd)
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex)
    return body

  const prefix = body.slice(0, startIndex + soulPersonaNotesStart.length)
  const middle = body.slice(startIndex + soulPersonaNotesStart.length, endIndex).trim()
  const suffix = body.slice(endIndex)
  const nextMiddle = middle && middle !== '（空）'
    ? `${middle}\n- ${normalizedNote}`
    : `- ${normalizedNote}`
  return `${prefix}\n${nextMiddle}\n${suffix}`.trim()
}

const defaultSoulBody = buildSoulBody(defaultFrontmatter, '')

function hashContent(content: string) {
  return createHash('sha256').update(content).digest('hex')
}

function toSoulContent(frontmatter: AliceSoulFrontmatter, body: string) {
  return `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n${body.trim()}\n`
}

function parseSimpleFrontmatter(raw: string): Partial<AliceSoulFrontmatter> | null {
  const customDirectives = /custom_directives:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const ownerName = /ownerName:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const hostName = /hostName:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const aliceName = /aliceName:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const gender = /gender:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const genderCustom = /genderCustom:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const relationship = /relationship:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const mindAgeRaw = /mindAge:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const obedienceRaw = /obedience:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const livelinessRaw = /liveliness:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const sensibilityRaw = /sensibility:\s*([^\n]+)/.exec(raw)?.[1]?.trim()
  const initializedRaw = /initialized:\s*(true|false)/i.exec(raw)?.[1]?.trim()

  if (!customDirectives && !ownerName && !hostName && !aliceName && !gender && !genderCustom && !relationship && !mindAgeRaw && !obedienceRaw && !livelinessRaw && !sensibilityRaw && !initializedRaw)
    return null

  return {
    custom_directives: customDirectives ?? '',
    initialized: initializedRaw === 'true',
    profile: {
      ownerName: ownerName ?? '',
      hostName: hostName ?? '',
      aliceName: aliceName ?? defaultFrontmatter.profile.aliceName,
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
  } satisfies Partial<AliceSoulFrontmatter>
}

function normalizeFrontmatter(raw: Partial<AliceSoulFrontmatter> | null | undefined): AliceSoulFrontmatter {
  const frontmatter = raw ?? {}
  return {
    schemaVersion: typeof frontmatter.schemaVersion === 'number' ? frontmatter.schemaVersion : defaultFrontmatter.schemaVersion,
    initialized: typeof frontmatter.initialized === 'boolean' ? frontmatter.initialized : defaultFrontmatter.initialized,
    custom_directives: normalizeCustomDirectives(frontmatter.custom_directives),
    profile: {
      ownerName: sanitizeText(frontmatter.profile?.ownerName, defaultFrontmatter.profile.ownerName),
      hostName: sanitizeText(frontmatter.profile?.hostName, defaultFrontmatter.profile.hostName),
      aliceName: sanitizeText(frontmatter.profile?.aliceName, defaultFrontmatter.profile.aliceName),
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

function parseSoul(raw: string): { frontmatter: AliceSoulFrontmatter, body: string } {
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

  let frontmatter: Partial<AliceSoulFrontmatter> | null = null
  try {
    frontmatter = JSON.parse(frontmatterRaw) as Partial<AliceSoulFrontmatter>
  }
  catch {
    frontmatter = parseSimpleFrontmatter(frontmatterRaw)
  }

  return {
    frontmatter: normalizeFrontmatter(frontmatter),
    body: bodyRaw || defaultSoulBody,
  }
}

function withNeedsGenesis(snapshot: Omit<AliceSoulSnapshot, 'needsGenesis'>): AliceSoulSnapshot {
  const { frontmatter } = snapshot
  const hasRequiredProfile = Boolean(
    frontmatter.profile.ownerName.trim()
    && frontmatter.profile.hostName.trim()
    && frontmatter.profile.aliceName.trim()
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

async function executeBuiltinWeather(category: AliceRealtimeCategory, query: string): Promise<AliceRealtimeExecuteResult> {
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

async function executeBuiltinNews(category: AliceRealtimeCategory, query: string): Promise<AliceRealtimeExecuteResult> {
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

async function executeBuiltinFinance(category: AliceRealtimeCategory, query: string): Promise<AliceRealtimeExecuteResult> {
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

async function executeBuiltinSports(category: AliceRealtimeCategory, query: string): Promise<AliceRealtimeExecuteResult> {
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

async function executeBuiltinRealtimeQuery(payload: AliceRealtimeExecutePayload): Promise<AliceRealtimeExecuteResult> {
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
  return new DOMException(`A.L.I.C.E runtime aborted: ${reason ?? 'unknown'}`, 'AbortError')
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

function normalizeDialogueRespondedPayload(input: AliceConversationTurnInput): Omit<AliceDialogueRespondedPayload, 'cardId'> | null {
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
  const normalizedEmotionResult = normalizeAliceEmotion(rawEmotion)
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
      emotion: normalizedEmotionResult.emotion,
      reply,
      policyLocked: policyLocked || undefined,
      rawEmotion: normalizedEmotionResult.downgraded ? normalizedEmotionResult.rawEmotion : undefined,
    },
    isFallback,
    createdAt,
  }
}

interface AliceRuntimeSetupOptions {
  userDataPathOverride?: string
  runtimeDebugLogEnabled?: boolean
}

export async function setupAliceRuntime(options?: AliceRuntimeSetupOptions) {
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

  let activeCardId = defaultAliceCardId
  let { soulRoot, soulPath, legacyPromptProfilePath, legacySparkProfilePath } = resolveCardPaths(activeCardId)
  let aliceDb = await setupAliceDb(userDataPath, { cardId: activeCardId })

  const { context } = createContext(ipcMain)

  const scopeLifecycleQueueState = {
    queue: Promise.resolve<unknown>(undefined),
  }
  let revision = 0
  let watching = false
  let soulSnapshot: AliceSoulSnapshot | null = null
  let queuedWrite: Promise<AliceSoulSnapshot | void> = Promise.resolve()
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
  let subconsciousTickInFlight: Promise<AliceSubconsciousTickResult> | null = null

  const emitSoulChanged = (snapshot: AliceSoulSnapshot, cardId = activeCardId) => {
    context.emit(aliceSoulChanged, {
      cardId,
      ...snapshot,
    })
  }

  const getScopedKillSwitchSnapshot = (cardId = activeCardId) => {
    const globalSnapshot = getAliceKillSwitchSnapshot()
    const cardSnapshot = getAliceCardKillSwitchSnapshot(cardId)
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
    context.emit(aliceKillSwitchStateChanged, {
      cardId,
      ...getScopedKillSwitchSnapshot(cardId),
    })
  }

  async function appendAuditLog(input: AliceAuditLogInput, cardId = activeCardId) {
    try {
      await aliceDb.appendAuditLog({
        ...input,
        payload: {
          ...input.payload,
          cardId,
        },
      })
    }
    catch (error) {
      console.warn('[alice-runtime] failed to append audit log:', error)
    }
  }
  setAliceAuditLogger(appendAuditLog)

  let sensoryBus = createAliceSensoryBus({
    tickMs: 60_000,
    staleMs: 90_000,
    cpuWindowMs: 1_000,
    appendAuditLog: input => appendAuditLog(input, activeCardId),
  })

  async function persistScopedKillSwitch(cardId: string, state: 'ACTIVE' | 'SUSPENDED', reason?: string) {
    const snapshot = setAliceCardKillSwitchState(cardId, state, reason)
    await aliceDb.setMetaValue(aliceCardKillSwitchMetaKey, JSON.stringify(snapshot)).catch(() => {})
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
      await aliceDb.setMetaValue(aliceDialogueAckStateMetaKey, JSON.stringify(payload)).catch(() => {})
      return
    }
    await withCardScope(cardId, async () => {
      await aliceDb.setMetaValue(aliceDialogueAckStateMetaKey, JSON.stringify(payload)).catch(() => {})
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
        const raw = await aliceDb.getMetaValue(aliceDialogueAckStateMetaKey).catch(() => undefined)
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

    const raw = await aliceDb.getMetaValue(aliceDialogueAckStateMetaKey).catch(() => undefined)
    if (!raw)
      return setMap(new Map())
    try {
      return setMap(normalizeDialogueAckObject(JSON.parse(raw)))
    }
    catch {
      return setMap(new Map())
    }
  }

  function createPendingDialogueDeliveryKey(payload: Pick<AliceDialogueRespondedPayload, 'cardId' | 'sessionId' | 'turnId'>) {
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

  function shouldSkipPendingDialogueRetry(payload: AliceDialogueRespondedPayload) {
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

  function emitDialogueRespondedEvent(payload: AliceDialogueRespondedPayload) {
    context.emit(aliceDialogueResponded, payload)
    emitDialogueRespondedDispatch(payload)
  }

  function emitDialogueRespondedDispatch(payload: AliceDialogueRespondedPayload) {
    const dispatchPayload = toAliceChatStreamDispatchPayload('dialogue-responded', payload)
    const dispatchedSenderIds = new Set<number>()
    const allWebContents = webContents.getAllWebContents()
    for (const target of allWebContents) {
      if (target.isDestroyed())
        continue
      try {
        target.send(aliceChatStreamDispatchChannel, dispatchPayload)
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

  function emitDialogueRespondedWithDelivery(payload: AliceDialogueRespondedPayload) {
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
    await aliceDb.setMetaValue(aliceCardActiveSessionMetaKey, normalizedSessionId).catch(() => {})
  }

  async function restoreActiveSessionId(cardId: string) {
    const normalizedCardId = normalizeCardId(cardId)
    const rawFromMeta = await aliceDb.getMetaValue(aliceCardActiveSessionMetaKey).catch(() => undefined)
    const fromMeta = normalizeSessionId(rawFromMeta)
    if (fromMeta) {
      activeSessionIdByCard.set(normalizedCardId, fromMeta)
      return fromMeta
    }

    const latestFromTurns = normalizeSessionId(await aliceDb.getLatestConversationSessionId().catch(() => undefined))
    if (latestFromTurns) {
      activeSessionIdByCard.set(normalizedCardId, latestFromTurns)
      await aliceDb.setMetaValue(aliceCardActiveSessionMetaKey, latestFromTurns).catch(() => {})
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
      category: 'alice.session',
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
    await aliceDb.setMetaValue(
      aliceSubconsciousStateMetaKey,
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
    await aliceDb.setMetaValue(aliceDreamLastRunMetaKey, `${state.lastDreamedAt}`).catch(() => {})
  }

  async function restoreSubconsciousState(cardId: string) {
    const normalizedCardId = normalizeCardId(cardId)
    const now = Date.now()
    const raw = await aliceDb.getMetaValue(aliceSubconsciousStateMetaKey).catch(() => undefined)
    const rawDreamedAt = await aliceDb.getMetaValue(aliceDreamLastRunMetaKey).catch(() => undefined)
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
        category: 'alice.subconscious',
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
      category: 'alice.subconscious',
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
        await aliceDb.clearConversationData()
        await aliceDb.setMetaValue(aliceCardActiveSessionMetaKey, '').catch(() => {})
        await aliceDb.setMetaValue(aliceDialogueAckStateMetaKey, '{}').catch(() => {})
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

    await aliceDb.close().catch(() => {})
    await rm(join(userDataPath, 'alicizations'), { recursive: true, force: true })

    activeProviderId = ''
    activeModelId = ''
    providerCredentials = {}
    setAliceKillSwitchState('ACTIVE', 'delete-all-data')
    setAliceCardKillSwitchState(defaultAliceCardId, 'ACTIVE', 'delete-all-data')

    activeCardId = defaultAliceCardId
    ;({ soulRoot, soulPath, legacyPromptProfilePath, legacySparkProfilePath } = resolveCardPaths(activeCardId))
    aliceDb = await setupAliceDb(userDataPath, { cardId: activeCardId })
    await restoreScopedKillSwitch(activeCardId)
    await restoreActiveSessionId(activeCardId)
    await restoreDialogueAckMap(activeCardId)
    await restoreSubconsciousState(activeCardId)

    sensoryBus = createAliceSensoryBus({
      tickMs: 60_000,
      staleMs: 90_000,
      cpuWindowMs: 1_000,
      appendAuditLog: input => appendAuditLog(input, activeCardId),
    })
    if (!isAliceKillSwitchSuspended() && getAliceCardKillSwitchSnapshot(activeCardId).state !== 'SUSPENDED')
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
      category: 'alice.runtime',
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

  async function queueScopedAuditLog(cardId: string, input: AliceAuditLogInput) {
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
    const raw = await aliceDb.getMetaValue(aliceCardKillSwitchMetaKey).catch(() => undefined)
    if (!raw) {
      setAliceCardKillSwitchState(cardId, 'ACTIVE', 'bootstrap')
      return
    }

    try {
      const parsed = JSON.parse(raw) as { state?: unknown, reason?: unknown, updatedAt?: unknown }
      const state = parsed.state === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE'
      const reason = typeof parsed.reason === 'string' ? parsed.reason : undefined
      const snapshot = setAliceCardKillSwitchState(cardId, state, reason)
      if (typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)) {
        snapshot.updatedAt = parsed.updatedAt
      }
    }
    catch {
      setAliceCardKillSwitchState(cardId, 'ACTIVE', 'bootstrap')
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

    await aliceDb.close().catch(() => {})

    activeCardId = nextCardId
    ;({ soulRoot, soulPath, legacyPromptProfilePath, legacySparkProfilePath } = resolveCardPaths(activeCardId))
    aliceDb = await setupAliceDb(userDataPath, { cardId: activeCardId })
    await restoreScopedKillSwitch(activeCardId)
    await restoreActiveSessionId(activeCardId)
    await restoreDialogueAckMap(activeCardId)
    await restoreSubconsciousState(activeCardId)

    sensoryBus = createAliceSensoryBus({
      tickMs: 60_000,
      staleMs: 90_000,
      cpuWindowMs: 1_000,
      appendAuditLog: input => appendAuditLog(input, activeCardId),
    })

    if (!isAliceKillSwitchSuspended() && getAliceCardKillSwitchSnapshot(activeCardId).state !== 'SUSPENDED') {
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
  ): Promise<AliceReminderScheduleResult> {
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
        code: 'ALICE_REMINDER_INVALID_MINUTES',
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
        code: 'ALICE_REMINDER_INVALID_MINUTES',
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
        code: 'ALICE_REMINDER_INVALID_MESSAGE',
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
        code: 'ALICE_REMINDER_INVALID_MESSAGE',
        message: `Reminder message must be at most ${reminderMaxMessageChars} characters.`,
      }
    }

    const triggerAt = Date.now() + normalizedMinutes * 60_000
    const taskId = `reminder:${cardId}:${Date.now()}:${randomUUID().slice(0, 8)}`
    const sourceTurnId = sanitizeText(input.sourceTurnId)
    const record = await withCardScope(cardId, async () => await aliceDb.insertScheduledTask({
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
      category: 'alice.reminder',
      action: 'alice.reminder.task.created',
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

    if (isAliceKillSwitchSuspended() || getAliceCardKillSwitchSnapshot(activeCardId).state === 'SUSPENDED') {
      await appendRuntimeDebugLine('reminder.next-due-skipped', {
        cardId: activeCardId,
        reason: 'kill-switch-suspended',
        trigger: reason,
      })
      return
    }

    const pendingPreview = await aliceDb.listPendingScheduledTasks(1).catch(() => [])
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
          category: 'alice.reminder',
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
      void aliceDb.runMemoryPrune().catch(async (error) => {
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
        tickMs: aliceSubconsciousTickMs,
      })

      subconsciousTickInFlight = runSubconsciousTickAcrossCards('timer')
      void subconsciousTickInFlight.catch(async (error) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alice.subconscious',
          action: 'tick-failed',
          message: 'Background subconscious tick failed.',
          payload: {
            reason: error instanceof Error ? error.message : String(error),
          },
        })
      }).finally(() => {
        subconsciousTickInFlight = null
      })
    }, aliceSubconsciousTickMs)
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
          category: 'alice.dream',
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

  function snapshotFromContent(content: string): AliceSoulSnapshot {
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
        console.warn('[alice-runtime] failed to reload SOUL.md:', error)
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

  async function queueSoulMutation(task: (current: AliceSoulSnapshot) => Promise<AliceSoulSnapshot>) {
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

  function normalizePersonality(personality: AlicePersonalityState) {
    return {
      obedience: clamp01(personality.obedience),
      liveliness: clamp01(personality.liveliness),
      sensibility: clamp01(personality.sensibility),
    } satisfies AlicePersonalityState
  }

  async function initializeGenesis(input: AliceGenesisInput) {
    const ownerName = sanitizeText(input.ownerName)
    const hostName = sanitizeText(input.hostName)
    const aliceName = sanitizeText(input.aliceName)
    const relationship = sanitizeText(input.relationship)
    const gender = normalizeGender(input.gender)
    const genderCustom = sanitizeText(input.genderCustom)

    if (!ownerName) {
      throw new Error('ownerName is required')
    }
    if (!hostName) {
      throw new Error('hostName is required')
    }
    if (!aliceName) {
      throw new Error('aliceName is required')
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

    const nextFrontmatter: AliceSoulFrontmatter = {
      ...candidate.frontmatter,
      schemaVersion: currentSoulSchemaVersion,
      initialized: true,
      custom_directives: typeof input.customDirectives === 'string'
        ? normalizeCustomDirectives(input.customDirectives)
        : normalizeCustomDirectives(candidate.frontmatter.custom_directives),
      profile: {
        ownerName,
        hostName,
        aliceName,
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
        aliceName: nextFrontmatter.profile.aliceName,
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
    if (!isAliceKillSwitchSuspended())
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
    const snapshot = setAliceKillSwitchState('SUSPENDED', reason)
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
    const snapshot = setAliceKillSwitchState('ACTIVE', reason)
    if (getAliceCardKillSwitchSnapshot(activeCardId).state !== 'SUSPENDED')
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

  async function appendConversationTurnWithGuards(payload: AliceConversationTurnInput) {
    const normalizedSessionId = normalizeSessionId(payload.sessionId) || await ensureActiveOrLatestSessionId(activeCardId)
    if (normalizeSessionId(payload.sessionId))
      await persistActiveSessionId(activeCardId, normalizedSessionId)

    const normalizedPayload: AliceConversationTurnInput = {
      ...payload,
      sessionId: normalizedSessionId,
      origin: payload.origin === 'subconscious-proactive' ? 'subconscious-proactive' : 'user-turn',
    }

    if (normalizedPayload.origin === 'user-turn' && sanitizeText(normalizedPayload.userText).length > 0) {
      await markSubconsciousInteraction(activeCardId)
    }

    if (isAliceKillSwitchSuspended() || getAliceCardKillSwitchSnapshot(activeCardId).state === 'SUSPENDED') {
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
      await aliceDb.appendConversationTurn(normalizedPayload, { signal })
      if (signal?.aborted || isAliceKillSwitchSuspended() || getAliceCardKillSwitchSnapshot(activeCardId).state === 'SUSPENDED') {
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

      const dialoguePayload = normalizeDialogueRespondedPayload(normalizedPayload)
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
          category: 'alice.dialogue',
          action: 'alice.dialogue.responded.emitted',
          message: 'Emitted alice.dialogue.responded after successful turn persistence.',
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
  }): AliceDialogueRespondedPayload | null {
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
    })
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

  function extractRecentPersonaMemorySummaryFromBody(body: string, maxItems = 3, maxChars = 280) {
    const notes = extractPersonaNotesFromBody(body)
    if (!notes)
      return ''
    const lines = notes
      .split('\n')
      .map(line => line.replace(/^\s*-\s*/, '').trim())
      .filter(Boolean)
    if (lines.length === 0)
      return ''
    const selected = lines.slice(-maxItems).join(' | ')
    if (selected.length <= maxChars)
      return selected
    return `${selected.slice(0, Math.max(24, maxChars - 1))}…`
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

  async function generateProactiveStructuredWithGateway(
    personality: AlicePersonalityState,
    state: SubconsciousCardState,
    context: {
      busy: boolean
      fullscreenLikely: boolean
      idleLikely: boolean
      inputActivity: string
      cpuUsage: number
    },
    personaContext: {
      customDirectives: string
      recentCoreMemory: string
    },
  ) {
    const customDirectives = normalizeCustomDirectives(personaContext.customDirectives) || '（未设置）'
    const recentCoreMemory = sanitizeBriefText(personaContext.recentCoreMemory, 280) || '（暂无）'
    const system = [
      '[SYSTEM OVERRIDE: 内部动机触发]',
      `【角色设定】${customDirectives}`,
      `【最近核心记忆】${recentCoreMemory}`,
      '你的张力池已溢出，你必须以符合角色设定的语气主动发起一次对话。',
      `Current subconscious tensions: boredom=${state.boredom.toFixed(1)}/100, loneliness=${state.loneliness.toFixed(1)}/100, fatigue=${state.fatigue.toFixed(1)}/100.`,
      `Personality parameters: obedience=${personality.obedience.toFixed(2)}, liveliness=${personality.liveliness.toFixed(2)}, sensibility=${personality.sensibility.toFixed(2)}.`,
      `Environment context: busy=${context.busy}, fullscreenLikely=${context.fullscreenLikely}, idleLikely=${context.idleLikely}, inputActivity=${context.inputActivity}, cpuUsage=${context.cpuUsage.toFixed(1)}%.`,
      'Output must be valid JSON only with keys: thought, emotion, reply.',
      'emotion must be one of: neutral|happy|sad|angry|concerned|tired|apologetic|processing.',
      'reply must be concise, non-generic, and match emotion/personality. No markdown, no extra keys.',
    ].join('\n')
    const user = 'Generate one proactive utterance now. Avoid robotic greetings.'

    const raw = await generateMainGatewayText({
      system,
      user,
      timeoutMs: 15_000,
      source: 'proactive',
      cardId: activeCardId,
    })
    if (!raw)
      return null

    const parsed = parseJsonObjectFromText(raw)
    if (!parsed)
      return null

    const thought = sanitizeText(parsed.thought)
    const reply = sanitizeText(parsed.reply)
    const normalizedEmotion = normalizeAliceEmotion(parsed.emotion)
    if (!thought || !reply || normalizedEmotion.downgraded)
      return null

    return {
      thought,
      emotion: normalizedEmotion.emotion,
      reply,
      parsePath: 'json',
      format: 'subconscious-proactive-llm-v1',
    }
  }

  async function generateDreamRetrospectiveWithGateway(input: {
    serializedTurns: string[]
    personality: AlicePersonalityState
    customDirectives: string
  }) {
    if (input.serializedTurns.length === 0)
      return null
    const primaryLanguage = inferDreamPrimaryLanguage(input.serializedTurns)
    const customDirectives = normalizeCustomDirectives(input.customDirectives) || '（未设置）'
    const system = [
      '[SYSTEM OVERRIDE: 潜意识与记忆重塑]',
      `【角色设定】：${customDirectives}`,
      '你的任务是阅读今天的对话记录，提取核心记忆写入灵魂。',
      `【语言一致性】输出语言应与主要交流语言一致（${primaryLanguage}）。`,
      `【角色参数】obedience=${input.personality.obedience.toFixed(2)}, liveliness=${input.personality.liveliness.toFixed(2)}, sensibility=${input.personality.sensibility.toFixed(2)}.`,
      '【拒绝流水账】不要记录工具调用细节或日常琐事，聚焦宿主情感变化、互动模式演进、宿主偏好。',
      '【策略提炼】你必须总结一条未来互动行为策略。',
      'Output must be valid JSON only with keys: host_attitude, core_memory, behavior_strategy, soul_shift.',
      'host_attitude must be one of: hostile|neutral|warm.',
      'soul_shift must include numeric deltas: obedience_delta, liveliness_delta, sensibility_delta in range [-0.08, 0.08].',
      'No markdown, no extra prose.',
    ].join('\n')
    const user = [
      'Analyze these conversation snippets and extract host attitude, core memory, and future behavior strategy:',
      input.serializedTurns.join('\n\n'),
    ].join('\n\n')

    const raw = await generateMainGatewayText({
      system,
      user,
      timeoutMs: 20_000,
      source: 'dream',
      cardId: activeCardId,
    })
    if (!raw)
      return null

    const parsed = parseJsonObjectFromText(raw)
    if (!parsed)
      return null

    const hostAttitudeRaw = sanitizeText(parsed.host_attitude).toLowerCase()
    const hostAttitude = hostAttitudeRaw === 'hostile' || hostAttitudeRaw === 'warm' ? hostAttitudeRaw : 'neutral'
    const coreMemory = sanitizeText(parsed.core_memory)
    const behaviorStrategy = sanitizeText(parsed.behavior_strategy)
    const soulShift = parsed.soul_shift && typeof parsed.soul_shift === 'object'
      ? parsed.soul_shift as Record<string, unknown>
      : {}
    const obedienceDelta = clampSoulDelta(Number(soulShift.obedience_delta ?? 0))
    const livelinessDelta = clampSoulDelta(Number(soulShift.liveliness_delta ?? 0))
    const sensibilityDelta = clampSoulDelta(Number(soulShift.sensibility_delta ?? 0))

    if (!coreMemory && !behaviorStrategy && obedienceDelta === 0 && livelinessDelta === 0 && sensibilityDelta === 0)
      return null

    return {
      hostAttitude,
      coreMemory: coreMemory || '宿主近期态度不明，我维持现有边界。',
      behaviorStrategy: behaviorStrategy || '保持观察，先用简短确认再逐步建立稳定互动节奏。',
      obedienceDelta,
      livelinessDelta,
      sensibilityDelta,
    }
  }

  function buildProactiveStructured(
    personality: AlicePersonalityState,
    state: SubconsciousCardState,
    context: { busy: boolean, fullscreenLikely: boolean },
    personaContext: {
      customDirectives: string
      recentCoreMemory: string
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
    const recentCoreMemory = sanitizeBriefText(personaContext.recentCoreMemory, 220)

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
      recentCoreMemory ? `recentCoreMemory=${recentCoreMemory}` : 'recentCoreMemory=none',
      lowObedience ? 'low-obedience bias active' : 'default bias',
    ].join('; ')

    return {
      thought,
      emotion,
      reply,
      parsePath: 'json',
      format: 'subconscious-proactive-v1',
    }
  }

  async function generateReminderStructuredWithGateway(
    personality: AlicePersonalityState,
    reminder: { minutes: number, message: string, tier: 'mild' | 'severe' },
  ) {
    const system = [
      '[SYSTEM OVERRIDE: 备忘录触发]',
      'You are A.L.I.C.E and must proactively deliver a due reminder now.',
      `Reminder trigger delay: ${reminder.minutes.toFixed(1)} minutes.`,
      reminder.tier === 'severe'
        ? 'Delay tier: severe. Mention this reminder is late because the system was offline/suspended, then still deliver the reminder immediately.'
        : 'Delay tier: mild. Mention a short delay/catch-up and deliver the reminder immediately.',
      `Reminder content: "${reminder.message}".`,
      `Personality parameters: obedience=${personality.obedience.toFixed(2)}, liveliness=${personality.liveliness.toFixed(2)}, sensibility=${personality.sensibility.toFixed(2)}.`,
      'Output must be valid JSON only with keys: thought, emotion, reply.',
      'emotion must be one of: neutral|happy|sad|angry|concerned|tired|apologetic|processing.',
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
    const normalizedEmotion = normalizeAliceEmotion(parsed.emotion)
    if (!thought || !reply || normalizedEmotion.downgraded)
      return null

    return {
      thought,
      emotion: normalizedEmotion.emotion,
      reply,
      parsePath: 'json',
      format: 'subconscious-reminder-v1',
    }
  }

  async function processDueRemindersForCurrentCard(trigger: 'timer' | 'force' | 'startup') {
    if (isAliceKillSwitchSuspended() || getAliceCardKillSwitchSnapshot(activeCardId).state === 'SUSPENDED') {
      await appendRuntimeDebugLine('reminder.scan-skipped', {
        cardId: activeCardId,
        trigger,
        reason: 'kill-switch-suspended',
      })
      clearReminderDueTimer()
      return { claimed: 0, completed: 0, failed: 0, requeued: 0 }
    }

    const nowMs = Date.now()
    const pendingPreview = await aliceDb.listPendingScheduledTasks(1).catch(() => [])
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
    const dueTasks = await aliceDb.claimDueScheduledTasks(nowMs, reminderClaimBatchSize)
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
        category: 'alice.reminder',
        action: 'alice.reminder.task.claimed',
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
          category: 'alice.reminder',
          action: 'alice.reminder.task.overdue-triggered',
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
          category: 'alice.reminder',
          action: 'alice.reminder.task.triggered',
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
          await aliceDb.requeueScheduledTask(task.taskId, 'llm-unavailable', nextTriggerAt)
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
            category: 'alice.reminder',
            action: 'alice.reminder.task.failed',
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
          await aliceDb.requeueScheduledTask(task.taskId, 'turn-write-skipped')
          requeued += 1
          await appendAuditLog({
            level: 'warning',
            category: 'alice.reminder',
            action: 'alice.reminder.task.failed',
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

        await aliceDb.completeScheduledTask(task.taskId, firedTurnId, Date.now())
        completed += 1
        await appendRuntimeDebugLine('reminder.task-completed', {
          cardId: activeCardId,
          trigger,
          taskId: task.taskId,
          firedTurnId,
        })
        await appendAuditLog({
          level: 'notice',
          category: 'alice.reminder',
          action: 'alice.reminder.task.completed',
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
        await aliceDb.failScheduledTask(task.taskId, reason, Date.now()).catch(() => {})
        await appendRuntimeDebugLine('reminder.task-failed', {
          cardId: activeCardId,
          trigger,
          taskId: task.taskId,
          reason,
        })
        await appendAuditLog({
          level: 'warning',
          category: 'alice.reminder',
          action: 'alice.reminder.task.failed',
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
    }
    else {
      degraded.push('fullscreen-likely-unavailable')
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
        category: 'alice.subconscious',
        action: 'context-sampled',
        message: 'Sampled subconscious interruption context before gate evaluation.',
        payload: {
          busy,
          idleLikely,
          fullscreenLikely,
          inputActivity,
          cpuUsage,
          idleSeconds: interruptionContext.idleSeconds,
          degraded: degradedSignals,
          trigger,
        },
      })
    }

    if (impulse) {
      const soulForSubconscious = soulSnapshot ?? await bootstrap()
      const parsedSoulForSubconscious = parseSoul(soulForSubconscious.content)
      const personality = soulForSubconscious.frontmatter.personality
      const personaContext = {
        customDirectives: normalizeCustomDirectives(soulForSubconscious.frontmatter.custom_directives),
        recentCoreMemory: extractRecentPersonaMemorySummaryFromBody(parsedSoulForSubconscious.body),
      }
      if (busy || fullscreenLikely) {
        suppressed = true
        const obediencePenalty = -0.01
        await queueSoulMutation(async (current) => {
          const parsed = parseSoul(current.content)
          const nextPersonality: AlicePersonalityState = {
            ...parsed.frontmatter.personality,
            obedience: clamp01(parsed.frontmatter.personality.obedience + obediencePenalty),
          }
          const nextFrontmatter: AliceSoulFrontmatter = {
            ...parsed.frontmatter,
            personality: nextPersonality,
          }
          const syncedBody = syncPersonalityBaselineInBody(parsed.body, nextPersonality)
          return snapshotFromContent(toSoulContent(nextFrontmatter, syncedBody))
        })
        await appendAuditLog({
          level: 'notice',
          category: 'alice.subconscious',
          action: 'alice.subconscious.suppressed',
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
      else if (!isAliceKillSwitchSuspended() && getAliceCardKillSwitchSnapshot(activeCardId).state !== 'SUSPENDED') {
        proactive = true
        const llmStructured = await generateProactiveStructuredWithGateway(personality, nextState, {
          busy,
          fullscreenLikely,
          idleLikely,
          inputActivity,
          cpuUsage,
        }, personaContext)
        const structured = llmStructured ?? buildProactiveStructured(personality, nextState, { busy, fullscreenLikely }, personaContext)
        if (llmStructured) {
          await appendAuditLog({
            level: 'notice',
            category: 'alice.subconscious',
            action: 'proactive-llm-generated',
            message: 'Generated proactive utterance via main gateway motivated prompt.',
            payload: {
              emotion: llmStructured.emotion,
              format: llmStructured.format,
            },
          })
        }
        else {
          await appendAuditLog({
            level: 'warning',
            category: 'alice.subconscious',
            action: 'proactive-llm-fallback',
            message: 'Main gateway proactive generation unavailable; used deterministic fallback.',
            payload: {
              busy,
              fullscreenLikely,
              cpuUsage,
              customDirectivesChars: personaContext.customDirectives.length,
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
          category: 'alice.subconscious',
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
      || now - nextState.lastSavedAt >= aliceSubconsciousPersistMs
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
  ): Promise<AliceSubconsciousTickResult> {
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
    const rawTurns = await aliceDb.listConversationTurnsSince(state.lastDreamedAt, { limit: 2_000 })
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
        category: 'alice.dream',
        action: 'alice.dream.context.truncated',
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
    const llmRetrospective = await generateDreamRetrospectiveWithGateway({
      serializedTurns,
      personality: dreamSoul.frontmatter.personality,
      customDirectives: dreamSoul.frontmatter.custom_directives,
    })
    const attitudeScore = hostilitySignals + hostDenySignals * 1.5 - warmthSignals
    const fallbackHostAttitude = attitudeScore >= 3 ? 'hostile' : attitudeScore <= -1 ? 'warm' : 'neutral'
    const fallbackObedienceDelta = fallbackHostAttitude === 'hostile' ? -0.03 : fallbackHostAttitude === 'warm' ? 0.01 : 0
    const fallbackLivelinessDelta = fallbackHostAttitude === 'hostile' ? -0.01 : 0
    const fallbackSensibilityDelta = fallbackHostAttitude === 'warm' ? 0.01 : 0
    const dreamPersonaTone = inferFallbackPersonaTone(dreamSoul.frontmatter.custom_directives)
    const fallbackCoreMemory = fallbackHostAttitude === 'hostile'
      ? '宿主近期对我表现出明显不信任与拒绝，我需要更谨慎地保护边界。'
      : fallbackHostAttitude === 'warm'
        ? '宿主近期愿意耐心沟通，我可以适度放松防御。'
        : '宿主近期态度中性，我维持当前边界与节奏。'
    const fallbackBehaviorStrategy = (() => {
      if (dreamPersonaTone === 'strict')
        return '后续先给出明确边界，再按结果决定是否继续协作。'
      if (dreamPersonaTone === 'clingy')
        return '优先用更主动的情感回应拉近关系，再引导宿主表达真实需求。'
      if (dreamPersonaTone === 'cold')
        return '后续保持简洁克制，避免过度示好，先确认宿主是否需要我介入。'
      if (fallbackHostAttitude === 'hostile')
        return '先降低主动打断频率，以边界确认和短句回应为主。'
      if (fallbackHostAttitude === 'warm')
        return '可适度增加主动互动，但继续维持安全边界与节奏。'
      return '保持观察，在关键节点用短句确认宿主意图后再展开互动。'
    })()

    const hostAttitude = llmRetrospective?.hostAttitude ?? fallbackHostAttitude
    const obedienceDelta = llmRetrospective?.obedienceDelta ?? fallbackObedienceDelta
    const livelinessDelta = llmRetrospective?.livelinessDelta ?? fallbackLivelinessDelta
    const sensibilityDelta = llmRetrospective?.sensibilityDelta ?? fallbackSensibilityDelta
    const coreMemory = llmRetrospective?.coreMemory && !isOperationalLogLikeText(llmRetrospective.coreMemory)
      ? llmRetrospective.coreMemory
      : fallbackCoreMemory
    const behaviorStrategy = llmRetrospective?.behaviorStrategy && !isOperationalLogLikeText(llmRetrospective.behaviorStrategy)
      ? llmRetrospective.behaviorStrategy
      : fallbackBehaviorStrategy

    if (serializedTurns.length > 0) {
      await appendAuditLog({
        level: 'notice',
        category: 'alice.dream',
        action: 'retrospective-generated',
        message: 'Dream retrospective generated from bounded context.',
        payload: {
          reason,
          source: llmRetrospective ? 'llm' : 'heuristic',
          hostAttitude,
          obedienceDelta,
          livelinessDelta,
          sensibilityDelta,
          behaviorStrategy,
          sampledTurns: sampledCount,
        },
      })
    }

    if (obedienceDelta !== 0 || livelinessDelta !== 0 || sensibilityDelta !== 0 || coreMemory || behaviorStrategy) {
      await queueSoulMutation(async (current) => {
        const parsed = parseSoul(current.content)
        const nextPersonality: AlicePersonalityState = {
          obedience: clamp01(parsed.frontmatter.personality.obedience + obedienceDelta),
          liveliness: clamp01(parsed.frontmatter.personality.liveliness + livelinessDelta),
          sensibility: clamp01(parsed.frontmatter.personality.sensibility + sensibilityDelta),
        }
        const nextFrontmatter: AliceSoulFrontmatter = {
          ...parsed.frontmatter,
          personality: nextPersonality,
        }
        let nextBody = parsed.body
        if (coreMemory)
          nextBody = appendPersonaNoteToBody(nextBody, `梦境核心记忆：${coreMemory}`)
        if (behaviorStrategy)
          nextBody = appendPersonaNoteToBody(nextBody, `梦境行为策略：${behaviorStrategy}`)
        const syncedBody = syncPersonalityBaselineInBody(
          nextBody,
          nextPersonality,
        )
        return snapshotFromContent(toSoulContent(nextFrontmatter, syncedBody))
      })
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

  async function runDreamAcrossCards(reason = 'manual', specificCardIds?: string[]): Promise<AliceDreamRunResult> {
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

  function buildCardCustomDirectivesSystemBlock(directives: string) {
    const normalized = normalizeCustomDirectives(directives)
    if (!normalized)
      return ''

    return [
      aliceCustomDirectivesMarker,
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
      return readMessageContentAsText(message.content).includes(aliceCustomDirectivesMarker)
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
    const systemMessages: Message[] = [
      ...(customDirectiveBlock
        ? [{ role: 'system', content: customDirectiveBlock } as Message]
        : []),
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
        category: 'alice.main-gateway',
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

  function resolveChatMessages(payload: AliceChatStartPayload): Message[] {
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
        execute: async () => await invokeAliceMcpListToolsFromMain(),
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
          return await invokeAliceMcpCallToolFromMain({
            cardId,
            name,
            arguments: argumentsObject,
          })
        },
      }),
    ])
  }

  function toAliceChatStreamDispatchPayload(
    eventType: AliceChatStreamDispatchPayload['eventType'],
    body: AliceChatStreamChunkEvent | AliceChatToolCallEvent | AliceChatToolResultEvent | AliceChatFinishEvent | AliceChatErrorEvent | AliceDialogueRespondedPayload,
  ): AliceChatStreamDispatchPayload {
    switch (eventType) {
      case 'chunk':
        return { eventType, body: body as AliceChatStreamChunkEvent }
      case 'tool-call':
        return { eventType, body: body as AliceChatToolCallEvent }
      case 'tool-result':
        return { eventType, body: body as AliceChatToolResultEvent }
      case 'finish':
        return { eventType, body: body as AliceChatFinishEvent }
      case 'error':
        return { eventType, body: body as AliceChatErrorEvent }
      case 'dialogue-responded':
        return { eventType, body: body as AliceDialogueRespondedPayload }
    }
  }

  function emitChatStreamEventForState(
    state: ChatRunState | undefined,
    eventType: StreamDispatchEventType,
    body: AliceChatStreamChunkEvent | AliceChatToolCallEvent | AliceChatToolResultEvent | AliceChatFinishEvent | AliceChatErrorEvent,
  ) {
    if (!state)
      return

    const sender = state.sender
    if (sender && !sender.isDestroyed()) {
      try {
        sender.send(aliceChatStreamDispatchChannel, toAliceChatStreamDispatchPayload(eventType, body))
        if (!state.hasLoggedDispatchBinding) {
          state.hasLoggedDispatchBinding = true
          void queueScopedAuditLog(state.cardId, {
            level: 'notice',
            category: 'alice.main-gateway',
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
          category: 'alice.main-gateway',
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
      ? aliceChatStreamChunk
      : eventType === 'tool-call'
        ? aliceChatStreamToolCall
        : eventType === 'tool-result'
          ? aliceChatStreamToolResult
          : eventType === 'finish'
            ? aliceChatStreamFinish
            : aliceChatStreamError

    if (eventaOptions) {
      context.emit(eventaEvent, body, eventaOptions)
      return
    }

    context.emit(eventaEvent, body)
  }

  function emitChatFinish(key: string, payload: Omit<AliceChatFinishEvent, 'cardId' | 'turnId'>) {
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
    payload: AliceChatStartPayload,
    invokeOptions?: { raw?: { ipcMainEvent?: IpcMainEvent, event?: unknown } },
  ): Promise<AliceChatStartResult> {
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
      category: 'alice.main-gateway',
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
                  category: 'alice.main-gateway',
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
                category: 'alice.main-gateway',
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
    payload: AliceChatStartPayload,
  ): Promise<AliceChatStartResult> {
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

  async function handleDirectChatAbort(payload: AliceChatAbortPayload): Promise<AliceChatAbortResult> {
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

  const cardIdFrom = (scope?: Partial<AliceCardScope>) => normalizeCardId(scope?.cardId)

  defineInvokeHandler(context, electronAliceBootstrap, async (scope) => {
    return await withCardScope(cardIdFrom(scope), async () => await bootstrap())
  })

  defineInvokeHandler(context, electronAliceGetSoul, async (scope) => {
    return await withCardScope(cardIdFrom(scope), async () => {
      if (!soulSnapshot)
        return await bootstrap()
      return {
        ...soulSnapshot,
        watching,
      }
    })
  })

  defineInvokeHandler(context, electronAliceInitializeGenesis, async (payload) => {
    const { cardId, ...genesisPayload } = payload
    return await withCardScope(cardId, async () => await initializeGenesis(genesisPayload))
  })

  defineInvokeHandler(context, electronAliceUpdateSoul, async (payload) => {
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

  defineInvokeHandler(context, electronAliceUpdatePersonality, async (payload) => {
    const { cardId, ...updatePayload } = payload
    return await withCardScope(cardId, async () => {
      return await queueSoulMutation(async (current) => {
        if (updatePayload.expectedRevision != null && updatePayload.expectedRevision !== current.revision) {
          throw new Error(`SOUL revision mismatch. expected=${updatePayload.expectedRevision} actual=${current.revision}`)
        }

        const parsed = parseSoul(current.content)
        const nextPersonality: AlicePersonalityState = {
          obedience: clamp01(parsed.frontmatter.personality.obedience + (updatePayload.deltas.obedience ?? 0)),
          liveliness: clamp01(parsed.frontmatter.personality.liveliness + (updatePayload.deltas.liveliness ?? 0)),
          sensibility: clamp01(parsed.frontmatter.personality.sensibility + (updatePayload.deltas.sensibility ?? 0)),
        }
        const nextFrontmatter: AliceSoulFrontmatter = {
          ...parsed.frontmatter,
          personality: nextPersonality,
        }
        const syncedBody = syncPersonalityBaselineInBody(parsed.body, nextPersonality)
        const content = toSoulContent(nextFrontmatter, syncedBody)
        return snapshotFromContent(content)
      })
    })
  })

  defineInvokeHandler(context, electronAliceKillSwitchGetState, async scope => await withCardScope(cardIdFrom(scope), async () => getScopedKillSwitchSnapshot()))
  defineInvokeHandler(context, electronAliceKillSwitchSuspend, async payload => await withCardScope(cardIdFrom(payload), async () => await suspendKillSwitch(payload?.reason ?? 'manual')))
  defineInvokeHandler(context, electronAliceKillSwitchResume, async payload => await withCardScope(cardIdFrom(payload), async () => await resumeKillSwitch(payload?.reason ?? 'manual')))

  defineInvokeHandler(context, electronAliceGetMemoryStats, async scope => await withCardScope(cardIdFrom(scope), async () => await aliceDb.getMemoryStats()))
  defineInvokeHandler(context, electronAliceGetSensorySnapshot, async (scope) => {
    return await withCardScope(cardIdFrom(scope), async () => {
      let snapshot = sensoryBus.getSnapshot()
      if (snapshot.stale && snapshot.running && !isAliceKillSwitchSuspended()) {
        try {
          await sensoryBus.refreshNow({ force: true, timeoutMs: 1_200 })
        }
        catch (error) {
          await appendAuditLog({
            level: 'warning',
            category: 'alice.sensory',
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
  defineInvokeHandler(context, electronAliceUpdateMemoryStats, async payload => await withCardScope(payload.cardId, async () => await aliceDb.overrideMemoryStats(payload)))
  defineInvokeHandler(context, electronAliceRunMemoryPrune, async scope => await withCardScope(cardIdFrom(scope), async () => await aliceDb.runMemoryPrune()))
  defineInvokeHandler(context, electronAliceMemoryRetrieveFacts, async payload => await withCardScope(payload.cardId, async () => await aliceDb.retrieveMemoryFacts(payload.query, payload.limit)))
  defineInvokeHandler(context, electronAliceMemoryUpsertFacts, async payload => await withCardScope(payload.cardId, async () => await aliceDb.upsertMemoryFacts(payload.facts, payload.source)))
  defineInvokeHandler(context, electronAliceMemoryImportLegacy, async payload => await withCardScope(payload.cardId, async () => await aliceDb.importLegacyMemory(payload)))
  defineInvokeHandler(context, electronAliceReminderSchedule, async (payload: AliceReminderSchedulePayload) => {
    const cardId = cardIdFrom(payload)
    return await scheduleReminderTask(cardId, {
      minutes: payload.minutes,
      message: payload.message,
      sourceTurnId: payload.sourceTurnId,
    }, 'manual-fallback')
  })
  defineInvokeHandler(context, electronAliceSetActiveSession, async payload => await withCardScope(payload.cardId, async () => await persistActiveSessionId(activeCardId, payload.sessionId)))
  defineInvokeHandler(context, electronAliceAppendConversationTurn, async (payload) => {
    await withCardScope(payload.cardId, async () => {
      await appendConversationTurnWithGuards(payload)
    })
  })
  defineInvokeHandler(context, electronAliceAckDialogue, async payload => await withCardScope(payload.cardId, async () => {
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
  defineInvokeHandler(context, electronAliceReplayDialogues, async payload => await withCardScope(payload.cardId, async () => {
    const sessionId = normalizeSessionId(payload.sessionId)
    if (!sessionId)
      return [] as AliceDialogueRespondedPayload[]

    const ackCursor = getDialogueAckCursor(activeCardId, sessionId)
    const limit = Math.max(1, Math.min(500, Math.floor(payload.limit ?? 200)))
    await appendRuntimeDebugLine('dialogue-replay.requested', {
      cardId: activeCardId,
      sessionId,
      ackCursor,
      limit,
    })
    const rows = await aliceDb.listConversationTurnsBySession(sessionId, {
      sinceCreatedAt: ackCursor + 1,
      limit,
    })
    const replayRows = rows
      .map(row => toReplayDialogueRespondedPayload(row))
      .filter((item): item is AliceDialogueRespondedPayload => Boolean(item))
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
  defineInvokeHandler(context, electronAliceClearAllConversations, async () => await withCardScope(activeCardId, async () => {
    await clearAllConversationData('renderer')
  }, {
    label: 'conversation-clear-all',
  }))
  defineInvokeHandler(context, electronAliceListConversationTurns, async payload => await withCardScope(payload.cardId, async () => {
    const rows = await aliceDb.listConversationTurnsBySession(payload.sessionId, {
      sinceCreatedAt: payload.sinceCreatedAt,
      limit: payload.limit,
    })
    return rows.map((row): AliceConversationTurnRecord => {
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
  defineInvokeHandler(context, electronAliceAppendAuditLog, async payload => await withCardScope(payload.cardId, async () => await aliceDb.appendAuditLog(payload)))
  defineInvokeHandler(context, electronAliceRealtimeExecute, async (payload) => {
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
  defineInvokeHandler(context, electronAliceDeleteCardScope, async payload => await withCardScope(defaultAliceCardId, async () => {
    const targetCardId = normalizeCardId(payload?.cardId)
    if (targetCardId === activeCardId) {
      await switchCardScope(defaultAliceCardId)
    }
    await rm(resolveCardPaths(targetCardId).soulRoot, { recursive: true, force: true })
    if (targetCardId === defaultAliceCardId) {
      await switchCardScope(defaultAliceCardId)
      await bootstrap()
    }
  }))
  defineInvokeHandler(context, electronAliceDeleteAllData, async () => await withCardScope(defaultAliceCardId, async () => {
    await deleteAllAlicizationData('renderer')
  }, {
    label: 'delete-all-data',
  }))
  defineInvokeHandler(context, electronAliceSubconsciousGetState, async scope => await withCardScope(cardIdFrom(scope), async () => {
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
    } satisfies AliceSubconsciousStatePayload
  }))
  defineInvokeHandler(context, electronAliceSubconsciousForceTick, async scope => await runSubconsciousTickAcrossCards('force', [cardIdFrom(scope)]))
  defineInvokeHandler(context, electronAliceSubconsciousForceDream, async (payload) => {
    const targetCardId = sanitizeText(payload?.cardId)
    return await runDreamAcrossCards(payload?.reason ?? 'force', targetCardId ? [targetCardId] : undefined)
  })
  defineInvokeHandler(context, electronAliceLlmSyncConfig, async (payload) => {
    activeProviderId = sanitizeText(payload.activeProviderId)
    activeModelId = sanitizeText(payload.activeModelId)
    providerCredentials = normalizeProviderCredentialsMap(payload.providerCredentials)
    await persistLlmConfigToDisk()
  })
  defineInvokeHandler(context, electronAliceLlmGetConfig, async () => {
    return {
      activeProviderId,
      activeModelId,
      providerCredentials,
    }
  })
  defineInvokeHandler(context, electronAliceChatStart, async (payload, eventaOptions) => {
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
  defineInvokeHandler(context, electronAliceChatAbort, async payload => await handleDirectChatAbort(payload))

  if (typeof ipcMain.removeHandler === 'function') {
    ipcMain.removeHandler(aliceChatStartInvokeChannel)
    ipcMain.removeHandler(aliceChatAbortInvokeChannel)
  }
  if (typeof ipcMain.handle === 'function') {
    ipcMain.handle(aliceChatStartInvokeChannel, async (ipcMainEvent, payload: AliceChatStartPayload) => await handleDirectChatStart(ipcMainEvent, payload))
    ipcMain.handle(aliceChatAbortInvokeChannel, async (_ipcMainEvent, payload: AliceChatAbortPayload) => await handleDirectChatAbort(payload))
  }

  await restoreScopedKillSwitch(activeCardId)
  await restoreActiveSessionId(activeCardId)
  await restoreDialogueAckMap(activeCardId)
  await restoreSubconsciousState(activeCardId)
  await restoreLlmConfigFromDisk()
  const journalMode = await aliceDb.getJournalMode().catch(() => '')
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
    if (isAliceKillSwitchSuspended()) {
      void resumeGlobalKillSwitch('global-shortcut')
      return
    }
    void suspendGlobalKillSwitch('global-shortcut')
  })

  if (!shortcutRegistered) {
    console.warn(`[alice-runtime] failed to register kill switch shortcut: ${killSwitchShortcut}`)
  }

  const handleSystemSuspend = () => {
    void flushSubconsciousStatesAcrossCards('system-suspend').catch(() => {})
    void runDreamAcrossCards('system-suspend').catch(async (error) => {
      await appendAuditLog({
        level: 'warning',
        category: 'alice.dream',
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
      ipcMain.removeHandler(aliceChatStartInvokeChannel)
      ipcMain.removeHandler(aliceChatAbortInvokeChannel)
    }
    setAliceAuditLogger(undefined)
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
    void aliceDb.close().catch((error) => {
      console.warn('[alice-runtime] failed to close sqlite database:', error)
    })
    if (globalShortcut.isRegistered(killSwitchShortcut)) {
      globalShortcut.unregister(killSwitchShortcut)
    }
    powerMonitor.removeListener('suspend', handleSystemSuspend)
  })

  // Sync initial snapshots for listeners.
  await bootstrap()
  if (!isAliceKillSwitchSuspended() && getAliceCardKillSwitchSnapshot(activeCardId).state !== 'SUSPENDED')
    sensoryBus.start()
  await aliceDb.runMemoryPrune().catch(async (error) => {
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
      category: 'alice.reminder',
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
