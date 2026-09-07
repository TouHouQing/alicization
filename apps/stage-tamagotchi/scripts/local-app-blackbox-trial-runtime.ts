import type { Browser, Locator, Page } from 'playwright'
import type sqlite3 from 'sqlite3'

import type { MemoryProductionTrialReport } from '../src/main/services/alicization/memory-production-trial-runner'
import type { AlicizationChatAbortResult } from '../src/shared/eventa'

import process from 'node:process'

import { spawn as spawnProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { URL } from 'node:url'

import { alicizationChatAbortInvokeChannel } from '../src/shared/eventa'

export interface LocalAppBlackboxTrialArgs {
  appPath: string
  userDataPath: string
  cardId: string
  outputDir: string
  remoteDebugPort: number
  launchTimeoutMs: number
  turnTimeoutMs: number
  messages: string[]
  attachOnly: boolean
  keepOpen: boolean
  openMemoryWorkbench: boolean
  runQualityTrial: boolean
  qualityMode: 'historical-replay' | 'live-provider'
  qualityReadOnly: boolean
}

export interface LocalAppBlackboxStartupEvidence {
  title: string
  url: string
  readyState: string
  stageReady: boolean
}

export interface LocalAppBlackboxWindowEvidence {
  title: string
  url: string
  visibleText?: string
}

export interface LocalAppBlackboxChatTurnEvidence {
  message: string
  status: 'completed' | 'failed' | 'timed-out'
  startedAt?: number
  finishedAt?: number
  turnId?: string | null
  accepted?: boolean
  acceptedAtMs?: number | null
  streamFinished?: boolean
  streamFinishedAtMs?: number | null
  abortAttempted?: boolean
  abortAccepted?: boolean | null
  abortState?: AlicizationChatAbortResult['state'] | null
  firstUiChangeMs: number | null
  settledMs: number
  assistantText?: string
  visibleText: string
  error: string | null
}

export interface LocalAppChatRuntimeEvidence {
  requestTurnId: string | null
  turnId: string | null
  accepted: boolean
  acceptedAtMs: number | null
  streamFinished: boolean
  streamFinishedAtMs: number | null
  status: 'completed' | 'failed' | 'timed-out' | 'aborted' | null
  error: string | null
}

export interface LocalAppBlackboxScreenshotEvidence {
  title: string
  url: string
  path: string
}

export interface LocalAppBlackboxDiagnostics {
  processOutput: string[]
  rendererConsole: Array<{
    type: string
    text: string
    url: string
  }>
  pageErrors: Array<{
    message: string
    url: string
  }>
}

export interface LocalAppBlackboxMemoryAssertions {
  cardId: string
  closureWait?: LocalAppMemoryClosureWaitResult
  checkpointCount: number
  queue: {
    pending: number
    review: number
    applied: number
    failed: number
    deadLettered: number
  }
  longTerm: {
    factCount: number
    reflectionCount: number
    searchDocumentCount: number
    vectorCount: number
  }
  recall: LocalAppBlackboxMemoryRecall
  failedTurnCount: number
  failedTurnMemoryLeakCount: number
  failureIsolationStatus: LocalAppBlackboxFailureIsolationStatus
  failureIsolationIndeterminateTurnCount: number
  failureIsolationPassed: boolean | null
  singleSession?: LocalAppSingleSessionAssessment
  providerRequests?: LocalAppProviderRequestEvidence[]
  providerRequestAssessment?: LocalAppProviderRequestAssessment
  compression?: LocalAppCompressionAssessment
  expectationAssessment?: LocalAppMemoryExpectationAssessment
  errors: string[]
}

export type LocalAppBlackboxFailureIsolationStatus = 'passed' | 'failed' | 'unknown'

export interface LocalAppBlackboxMemoryLeakAssessment {
  status: LocalAppBlackboxFailureIsolationStatus
  leakedCount: number
  indeterminateTurnCount: number
}

export type LocalAppBlackboxRecallEventStatus = 'evidence' | 'abstained' | 'completed'

export interface LocalAppBlackboxRecallEvidence {
  id: string | null
  summary: string | null
  source?: string | null
  status: 'evidence'
  turnId: string
  provenance?: LocalAppBlackboxRecallProvenance
}

export interface LocalAppBlackboxRecallProvenance {
  evidenceId: string
  persisted: boolean
  matches: Array<{
    table: string
    source: string
    sourceId: string
  }>
  error: string | null
}

export interface LocalAppBlackboxRecallEvent {
  eventId: string
  eventType:
    | 'long_term_memory.recall.evidence'
    | 'long_term_memory.recall.abstained'
    | 'long_term_memory.recall.completed'
  status: LocalAppBlackboxRecallEventStatus
  turnId: string
  evidenceId: string | null
  summary: string | null
  source: string | null
}

export interface LocalAppBlackboxMemoryRecall {
  query: string
  matched: boolean
  status?: 'not-requested' | 'unknown' | 'recalled' | 'empty' | 'failed'
  turnId?: string | null
  matchedIds: string[]
  summaries: string[]
  evidence?: LocalAppBlackboxRecallEvidence[]
  events?: LocalAppBlackboxRecallEvent[]
  errors?: string[]
}

export interface LocalAppRuntimeRecallEventRow {
  event_id: string
  event_type: string
  turn_id: string
  occurred_at: number
  sequence: number
  payload_json: string
}

interface LocalAppPersistedRecallRow {
  table_name: string
  source: string
  source_id: string
  evidence_id: string
}

interface LocalAppPersistedRecallTableState {
  exists: boolean
  columns: Set<string>
}

function allDatabaseRows<T>(
  database: sqlite3.Database,
  sql: string,
  params: unknown[] = [],
) {
  return new Promise<T[]>((resolve, reject) => {
    database.all(sql, params, (error: Error | null, rows?: T[]) => {
      if (error)
        reject(error)
      else
        resolve(rows ?? [])
    })
  })
}

function emptyLocalAppMemoryRecall(
  query: string,
  status: NonNullable<LocalAppBlackboxMemoryRecall['status']> = 'unknown',
) {
  return {
    query,
    matched: false,
    status,
    turnId: null,
    matchedIds: [],
    summaries: [],
    evidence: [],
    events: [],
    errors: [],
  } satisfies LocalAppBlackboxMemoryRecall
}

function jsonRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function nonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function recallEventStatus(eventType: LocalAppRuntimeRecallEventRow['event_type']) {
  if (eventType === 'long_term_memory.recall.evidence')
    return 'evidence' as const
  if (eventType === 'long_term_memory.recall.abstained')
    return 'abstained' as const
  return 'completed' as const
}

function recallProviderStatus(value: unknown): Exclude<
  NonNullable<LocalAppBlackboxMemoryRecall['status']>,
  'not-requested' | 'unknown'
> | null {
  return value === 'recalled' || value === 'empty' || value === 'failed'
    ? value
    : null
}

export interface LocalAppProviderRequestEvidence {
  event: Record<string, unknown>
  cardId: string | null
  turnId: string | null
  providerAttempt: number | null
  requestHash: string | null
  workingMemory: {
    present: boolean
    version: string | null
    compressionObserved: boolean
    compressedTimelineCount: number
    compressedSourceTurnCount: number
    recentDialogueCount: number
    correctionCount: number
    commitmentCount: number
    contentHash: string | null
  }
  longTermRecall: {
    present: boolean
    status: string | null
    confidence: number | null
    evidenceIds: string[]
    evidenceCount: number
    contentHash: string | null
  }
}

export interface LocalAppProviderRequestAssessment {
  passed: boolean
  requestCount: number
  recalledRequestCount: number
  errors: string[]
}

export interface LocalAppProviderRecallExpectation {
  turnId: string
  status: 'recalled' | 'empty' | 'failed' | 'unknown'
  matchedIds: string[]
}

export interface LocalAppSingleSessionAssessment {
  status: 'passed' | 'failed' | 'unknown'
  conversationId: string | null
  conversationIds: string[]
  expectedTurnCount: number
  matchedTurnCount: number
  missingTurnIds: string[]
  errors: string[]
}

export interface LocalAppCompressionEventEvidence {
  turnId: string | null
  conversationId: string | null
  version: string | null
  sessionId: string | null
  sourceTurnIds: string[]
}

export interface LocalAppCompressionAssessment {
  passed: boolean
  compressionObserved: boolean
  compressedTurnId: string | null
  firstProviderTurnAfterCompression: string | null
  completedEvents: LocalAppCompressionEventEvidence[]
  snapshots: LocalAppCompressionEventEvidence[]
  errors: string[]
}

export type LocalAppMemoryExpectationKind
  = | 'recall'
    | 'abstain'
    | 'correction'
    | 'conflict'
    | 'expired'
    | 'tombstone'

export interface LocalAppMemoryExpectation {
  turnIndex: number
  kind: LocalAppMemoryExpectationKind
  expectedIds?: string[]
  forbiddenIds?: string[]
  expectedAnswerIncludes?: string[]
}

export interface LocalAppMemoryExpectationRecall {
  turnIndex: number
  recall: LocalAppBlackboxMemoryRecall
}

export interface LocalAppMemoryExpectationAssessment {
  passed: boolean
  expectationCount: number
  evaluatedCount: number
  errors: string[]
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Number(value)
    : null
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .map(item => nonEmptyString(item))
        .filter((item): item is string => item !== null)
    : []
}

function readRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .map(item => jsonRecord(item))
        .filter((item): item is Record<string, unknown> => item !== null)
    : []
}

function readProviderRequestSnapshot(value: unknown) {
  const request = jsonRecord(value)
  const workingMemoryRecord = jsonRecord(request?.workingMemory)
  const longTermRecallRecord = jsonRecord(request?.longTermRecall)
  const compressedTimeline = readRecordArray(workingMemoryRecord?.compressedTimeline)
  const compressedTimelineCount = readNumber(workingMemoryRecord?.compressedTimelineCount)
    ?? compressedTimeline.length
  const compressedSourceTurnCount = readNumber(workingMemoryRecord?.compressedSourceTurnCount)
    ?? compressedTimeline.reduce(
      (count, entry) => count + readStringArray(entry.sourceTurnIds).length,
      0,
    )
  const evidenceRecords = readRecordArray(longTermRecallRecord?.evidence)
  const evidenceIds = readStringArray(longTermRecallRecord?.evidenceIds)
  const normalizedEvidenceIds = evidenceIds.length > 0
    ? evidenceIds
    : evidenceRecords
        .map(entry => nonEmptyString(entry.id))
        .filter((item): item is string => item !== null)
  const evidenceCount = readNumber(longTermRecallRecord?.evidenceCount)
    ?? (evidenceRecords.length || normalizedEvidenceIds.length)

  return {
    requestHash: nonEmptyString(request?.requestHash),
    workingMemory: {
      present: workingMemoryRecord !== null,
      version: nonEmptyString(workingMemoryRecord?.version),
      compressionObserved: workingMemoryRecord?.compressionObserved === true
        || compressedTimelineCount > 0
        || compressedSourceTurnCount > 0,
      compressedTimelineCount,
      compressedSourceTurnCount,
      recentDialogueCount: readNumber(workingMemoryRecord?.recentDialogueCount) ?? 0,
      correctionCount: readNumber(workingMemoryRecord?.correctionCount) ?? 0,
      commitmentCount: readNumber(workingMemoryRecord?.commitmentCount) ?? 0,
      contentHash: nonEmptyString(workingMemoryRecord?.contentHash),
    },
    longTermRecall: {
      present: longTermRecallRecord !== null,
      status: nonEmptyString(longTermRecallRecord?.status),
      confidence: readNumber(longTermRecallRecord?.confidence),
      evidenceIds: normalizedEvidenceIds,
      evidenceCount,
      contentHash: nonEmptyString(longTermRecallRecord?.contentHash),
    },
  }
}

export function readLocalAppProviderRequestEvidence(input: {
  events: Array<Record<string, unknown>>
  cardId?: string
}): LocalAppProviderRequestEvidence[] {
  const cardId = input.cardId?.trim() || null
  return input.events
    .filter(event => event.event === 'chat-provider-request.started')
    .filter((event) => {
      if (!cardId)
        return true
      const eventCardId = nonEmptyString(event.cardId)
      return eventCardId === null || eventCardId === cardId
    })
    .map((event) => {
      const request = readProviderRequestSnapshot(event.request)
      return {
        event,
        cardId: nonEmptyString(event.cardId),
        turnId: nonEmptyString(event.turnId),
        providerAttempt: readNumber(event.providerAttempt),
        requestHash: request.requestHash,
        workingMemory: request.workingMemory,
        longTermRecall: request.longTermRecall,
      }
    })
}

export function assessLocalAppProviderRequestEvidence(
  requests: LocalAppProviderRequestEvidence[],
  options: {
    requiredRecall?: LocalAppProviderRecallExpectation
  } = {},
): LocalAppProviderRequestAssessment {
  const errors: string[] = []
  let recalledRequestCount = 0

  if (requests.length === 0)
    errors.push('没有找到 chat-provider-request.started 证据。')

  for (const request of requests) {
    const requestLabel = request.turnId
      ? `turn ${request.turnId}`
      : `Provider request #${requests.indexOf(request) + 1}`
    if (!request.workingMemory.present)
      errors.push(`${requestLabel} 缺少 WorkingMemory owner 请求快照。`)
    if (!request.longTermRecall.present)
      errors.push(`${requestLabel} 缺少 LongTermMemoryRecall 请求快照。`)

    const status = request.longTermRecall.status
    const evidenceIds = request.longTermRecall.evidenceIds
    const evidenceCount = request.longTermRecall.evidenceCount
    if (status === 'recalled') {
      recalledRequestCount += 1
      if (evidenceIds.length === 0 || evidenceCount === 0) {
        errors.push(
          `${requestLabel} 的 longTermRecall.status=recalled，但 evidenceIds/evidenceCount 为空；这是召回假阳性。`,
        )
      }
      if (evidenceCount !== evidenceIds.length) {
        errors.push(
          `${requestLabel} 的长期记忆 evidenceCount=${evidenceCount} 与 evidenceIds=${evidenceIds.length} 不一致。`,
        )
      }
    }
    else if (
      (status === 'empty' || status === 'failed')
      && (evidenceIds.length > 0 || evidenceCount > 0)
    ) {
      errors.push(
        `${requestLabel} 的 longTermRecall.status=${status}，却携带可用 evidence。`,
      )
    }
  }

  const requiredRecall = options.requiredRecall
  if (requiredRecall && requiredRecall.status !== 'unknown') {
    const requiredTurnId = requiredRecall.turnId.trim()
    const matchingRequests = requests.filter(request =>
      request.turnId === requiredTurnId,
    )
    const finalMatchingRequest = matchingRequests.at(-1)
    if (!finalMatchingRequest) {
      errors.push(
        `长期记忆召回 turn ${requiredTurnId} 没有在同一轮 Provider 请求中留下证据。`,
      )
    }
    else if (requiredRecall.status === 'recalled') {
      const expectedIds = new Set(requiredRecall.matchedIds)
      const providerIds = new Set(finalMatchingRequest.longTermRecall.evidenceIds)
      const matchedEvidenceId = [...expectedIds].find(id => providerIds.has(id))
      if (
        finalMatchingRequest.longTermRecall.status !== 'recalled'
        || finalMatchingRequest.longTermRecall.evidenceCount === 0
        || !matchedEvidenceId
      ) {
        errors.push(
          `长期记忆召回 turn ${requiredTurnId} 没有在同一轮 Provider 请求中携带匹配 evidence。`,
        )
      }
    }
    else if (
      finalMatchingRequest.longTermRecall.status !== requiredRecall.status
      || finalMatchingRequest.longTermRecall.evidenceIds.length > 0
      || finalMatchingRequest.longTermRecall.evidenceCount > 0
    ) {
      errors.push(
        `长期记忆召回 turn ${requiredTurnId} 的 Provider 状态与最终召回状态不一致。`,
      )
    }
  }

  return {
    passed: errors.length === 0,
    requestCount: requests.length,
    recalledRequestCount,
    errors,
  }
}

function readConversationId(value: unknown) {
  const record = jsonRecord(value)
  return nonEmptyString(record?.conversationId)
    ?? nonEmptyString(record?.conversation_id)
    ?? nonEmptyString(jsonRecord(record?.scope)?.conversationId)
    ?? nonEmptyString(jsonRecord(record?.scope)?.conversation_id)
}

export function assessLocalAppSingleSession(input: {
  expectedTurnIds: string[]
  events: Array<Record<string, unknown> & {
    turnId?: unknown
    conversationId?: unknown
  }>
}): LocalAppSingleSessionAssessment {
  const expectedTurnIds = [...new Set(input.expectedTurnIds.map(id => id.trim()).filter(Boolean))]
  const matchedTurnIds = new Set<string>()
  const conversationIds = new Set<string>()
  let missingConversationIdCount = 0

  for (const event of input.events) {
    const turnId = nonEmptyString(event.turnId)
    if (turnId && expectedTurnIds.includes(turnId))
      matchedTurnIds.add(turnId)
    const conversationId = readConversationId(event)
    if (conversationId)
      conversationIds.add(conversationId)
    else if (turnId && expectedTurnIds.includes(turnId))
      missingConversationIdCount += 1
  }

  const missingTurnIds = expectedTurnIds.filter(id => !matchedTurnIds.has(id))
  const normalizedConversationIds = [...conversationIds]
  const errors: string[] = []
  if (missingTurnIds.length > 0)
    errors.push(`缺少回放 turn 证据：${missingTurnIds.join(', ')}`)
  if (normalizedConversationIds.length > 1) {
    errors.push(`回放跨越多个 conversation：${normalizedConversationIds.join(', ')}`)
  }
  if (missingConversationIdCount > 0)
    errors.push(`有 ${missingConversationIdCount} 个回放 turn 缺少 conversationId。`)

  const status = missingTurnIds.length > 0 || normalizedConversationIds.length > 1
    ? 'failed'
    : expectedTurnIds.length === 0
      || normalizedConversationIds.length === 0
      || missingConversationIdCount > 0
      ? 'unknown'
      : 'passed'

  return {
    status,
    conversationId: normalizedConversationIds.length === 1
      ? normalizedConversationIds[0]!
      : null,
    conversationIds: normalizedConversationIds,
    expectedTurnCount: expectedTurnIds.length,
    matchedTurnCount: matchedTurnIds.size,
    missingTurnIds,
    errors,
  }
}

function eventName(event: Record<string, unknown>) {
  return nonEmptyString(event.eventType) ?? nonEmptyString(event.event) ?? ''
}

function eventPayload(event: Record<string, unknown>) {
  return jsonRecord(event.payload) ?? event
}

function readCompressionEvidence(event: Record<string, unknown>): LocalAppCompressionEventEvidence {
  const payload = eventPayload(event)
  const compression = jsonRecord(payload.compression)
  const timeline = readRecordArray(payload.compressedTimeline)
  const sourceTurnIds = [
    ...readStringArray(compression?.sourceTurnIds),
    ...timeline.flatMap(entry => readStringArray(entry.sourceTurnIds)),
  ]
  return {
    turnId: nonEmptyString(event.turnId) ?? nonEmptyString(payload.turnId),
    conversationId: readConversationId(event) ?? readConversationId(payload),
    version: nonEmptyString(payload.version),
    sessionId: nonEmptyString(payload.sessionId),
    sourceTurnIds: [...new Set(sourceTurnIds)],
  }
}

function providerRequestTurnNumber(turnId: string | null) {
  if (!turnId)
    return null
  const match = /(?:^|[-_:])(\d+)$/u.exec(turnId)
  return match ? Number.parseInt(match[1]!, 10) : null
}

export function assessLocalAppCompressionEvidence(input: {
  runtimeEvents: Array<Record<string, unknown>>
  providerRequests: LocalAppProviderRequestEvidence[]
  expectedTurnCount: number
}): LocalAppCompressionAssessment {
  const completedEvents = input.runtimeEvents
    .filter(event => eventName(event) === 'working_memory.compression.completed')
    .map(readCompressionEvidence)
    .filter(event => event.sourceTurnIds.length > 0)
  const snapshots = input.runtimeEvents
    .filter(event => eventName(event) === 'working_memory.snapshot.created')
    .map(readCompressionEvidence)
    .filter(event => event.sourceTurnIds.length > 0)
  const errors: string[] = []

  if (input.providerRequests.length < input.expectedTurnCount) {
    errors.push(
      `Provider request 仅有 ${input.providerRequests.length} 轮，少于期望的 ${input.expectedTurnCount} 轮。`,
    )
  }
  if (completedEvents.length === 0)
    errors.push('没有找到包含 sourceTurnIds 的 WorkingMemory compression.completed 事件。')
  if (snapshots.length === 0)
    errors.push('没有找到包含 sourceTurnIds 的 WorkingMemory snapshot.created 事件。')

  const compressedEvent = completedEvents[0] ?? snapshots[0] ?? null
  const compressedTurnNumber = providerRequestTurnNumber(compressedEvent?.turnId ?? null)
  const compressedTurnIndex = compressedEvent?.turnId
    ? input.providerRequests.findIndex(request => request.turnId === compressedEvent.turnId)
    : -1
  const laterRequests = input.providerRequests.filter((request, index) => {
    if (compressedTurnNumber !== null) {
      const requestTurnNumber = providerRequestTurnNumber(request.turnId)
      return requestTurnNumber !== null && requestTurnNumber > compressedTurnNumber
    }
    return compressedTurnIndex >= 0 && index > compressedTurnIndex
  })
  const providerAfterCompression = laterRequests.find(request =>
    request.workingMemory.compressionObserved
    && request.workingMemory.compressedTimelineCount > 0
    && request.workingMemory.compressedSourceTurnCount > 0,
  ) ?? null
  if (!providerAfterCompression) {
    errors.push('压缩事件之后没有找到真正携带压缩 WorkingMemory 的 Provider request。')
  }

  return {
    passed: errors.length === 0,
    compressionObserved: providerAfterCompression !== null,
    compressedTurnId: compressedEvent?.turnId ?? null,
    firstProviderTurnAfterCompression: providerAfterCompression?.turnId ?? null,
    completedEvents,
    snapshots,
    errors,
  }
}

function normalizeExpectationIds(ids: string[] | undefined) {
  return [...new Set((ids ?? []).map(id => id.trim()).filter(Boolean))]
}

function expectationReplyText(turn: LocalAppBlackboxChatTurnEvidence | undefined) {
  return turn?.assistantText?.trim() || turn?.visibleText?.trim() || ''
}

export function assessLocalAppMemoryExpectations(input: {
  expectations: LocalAppMemoryExpectation[]
  chatTurns: LocalAppBlackboxChatTurnEvidence[]
  recalls: LocalAppMemoryExpectationRecall[]
}): LocalAppMemoryExpectationAssessment {
  const errors: string[] = []
  let evaluatedCount = 0
  for (const expectation of input.expectations) {
    const label = `第 ${expectation.turnIndex} 轮 ${expectation.kind}`
    const recallEntry = input.recalls.find(entry => entry.turnIndex === expectation.turnIndex)
    const chatTurn = input.chatTurns[expectation.turnIndex - 1]
    if (!recallEntry) {
      errors.push(`${label} 缺少长期记忆召回结果。`)
      continue
    }
    evaluatedCount += 1
    const recall = recallEntry.recall
    const expectedIds = normalizeExpectationIds(expectation.expectedIds)
    const forbiddenIds = normalizeExpectationIds(expectation.forbiddenIds)
    const matchedIds = [...new Set([
      ...recall.matchedIds,
      ...(recall.evidence ?? [])
        .map(item => item.id)
        .filter((id): id is string => id !== null),
    ])]
    const replyText = expectationReplyText(chatTurn)
    const usableEvidence = (recall.evidence ?? []).filter(item =>
      item.id !== null
      && item.provenance?.persisted !== false,
    )
    if (expectation.kind === 'abstain') {
      const hasAbstainedEvent = (recall.events ?? []).some(event =>
        event.status === 'abstained'
        && event.turnId === (recall.turnId ?? event.turnId),
      )
      if (
        recall.status !== 'empty'
        || recall.matched
        || matchedIds.length > 0
        || usableEvidence.length > 0
        || !hasAbstainedEvent
      ) {
        errors.push(`${label} 没有形成空召回且无证据的 abstention。`)
      }
      continue
    }

    for (const expectedId of expectedIds) {
      if (!matchedIds.includes(expectedId))
        errors.push(`${label} 缺少期望的 memory ID：${expectedId}`)
    }
    for (const forbiddenId of forbiddenIds) {
      if (
        matchedIds.includes(forbiddenId)
        || (recall.summaries ?? []).some(summary => summary.includes(forbiddenId))
        || replyText.includes(forbiddenId)
      ) {
        errors.push(`${label} 暴露了禁止出现的 memory ID：${forbiddenId}`)
      }
    }
    for (const expectedText of expectation.expectedAnswerIncludes ?? []) {
      if (!replyText.includes(expectedText))
        errors.push(`${label} 回复缺少期望内容：${expectedText}`)
    }
    if (
      (expectation.kind === 'recall'
        || expectation.kind === 'correction'
        || expectation.kind === 'conflict')
      && (recall.status !== 'recalled' || !recall.matched || expectedIds.length === 0)
    ) {
      errors.push(`${label} 没有以可验证的 recalled 状态返回期望记忆。`)
    }
    if (
      (expectation.kind === 'expired' || expectation.kind === 'tombstone')
      && forbiddenIds.length > 0
      && matchedIds.some(id => forbiddenIds.includes(id))
    ) {
      errors.push(`${label} 仍然召回了已过期或已 tombstone 的记忆。`)
    }
  }

  return {
    passed: errors.length === 0,
    expectationCount: input.expectations.length,
    evaluatedCount,
    errors,
  }
}

export function validateLocalAppProductionMessageCount(count: number) {
  if (!Number.isInteger(count) || count < 20 || count > 50) {
    throw new Error(`生产黑盒回放必须包含 20 至 50 轮消息，当前为 ${count} 轮。`)
  }
}

const persistedRecallTables = [
  'memory_facts',
  'memory_reflections',
  'episodic_events',
  'memory_consolidations',
  'long_term_memory_search_documents',
  'long_term_memory_vectors',
  'long_term_memory_tombstones',
] as const

const persistedRecallRequiredColumns: Record<
  typeof persistedRecallTables[number],
  string[]
> = {
  memory_facts: ['id', 'card_id'],
  memory_reflections: ['id', 'card_id'],
  episodic_events: ['id', 'card_id'],
  memory_consolidations: ['id', 'card_id'],
  long_term_memory_search_documents: [
    'id',
    'card_id',
    'source',
    'source_id',
    'tombstoned',
  ],
  long_term_memory_vectors: [
    'id',
    'card_id',
    'source',
    'source_id',
    'status',
  ],
  long_term_memory_tombstones: ['card_id', 'source_id', 'source'],
}

const persistedRecallSourceTables = {
  memory_facts: 'memory_facts',
  memory_reflections: 'memory_reflections',
  episodic_events: 'episodic_events',
  memory_consolidations: 'memory_consolidations',
} as const

function recallProvenanceKey(source: string | null, sourceId: string) {
  return JSON.stringify([source ?? '', sourceId])
}

async function readPersistedRecallProvenance(input: {
  database: sqlite3.Database
  cardId: string
  evidence: Array<{
    id: string | null
    source: string | null
  }>
}) {
  const evidenceRecords = input.evidence
    .map(item => ({
      id: nonEmptyString(item.id),
      source: nonEmptyString(item.source),
    }))
    .filter((item): item is { id: string, source: string | null } => Boolean(item.id))
  const evidenceIds = [...new Set(evidenceRecords.map(item => item.id))]
  if (evidenceIds.length === 0)
    return new Map<string, LocalAppBlackboxRecallProvenance>()

  const tableStates = new Map<string, LocalAppPersistedRecallTableState>()
  const schemaErrors: string[] = []
  for (const table of persistedRecallTables) {
    const tableRows = await allDatabaseRows<{ name: string }>(
      input.database,
      `PRAGMA table_info(${table})`,
    )
    if (tableRows.length === 0) {
      schemaErrors.push(`缺少长期记忆表 ${table}`)
      tableStates.set(table, {
        exists: false,
        columns: new Set(),
      })
      continue
    }
    const columns = new Set(tableRows.map(row => row.name))
    const missingColumns = persistedRecallRequiredColumns[table]
      .filter(column => !columns.has(column))
    if (missingColumns.length > 0) {
      schemaErrors.push(
        `长期记忆表 ${table} 缺少 provenance 列：${missingColumns.join(', ')}`,
      )
    }
    tableStates.set(table, {
      exists: true,
      columns,
    })
  }
  const placeholders = evidenceIds.map(() => '?').join(', ')
  const rows: LocalAppPersistedRecallRow[] = []
  const canonicalMatches = new Set<string>()
  const tombstonedKeys = new Set<string>()

  const queries: Array<{
    table: typeof persistedRecallTables[number]
    sql: string
    params: unknown[]
    canonical: boolean
  }> = [
    {
      table: 'memory_facts',
      sql: `
        SELECT id AS source_id, 'memory_facts' AS source, id AS matched_id
        FROM memory_facts
        WHERE card_id = ?
          AND id IN (${placeholders})
          ${tableStates.get('memory_facts')?.columns.has('validation_status')
            ? `AND COALESCE(validation_status, '') != 'superseded'`
            : ''}
      `,
      params: [input.cardId, ...evidenceIds],
      canonical: true,
    },
    {
      table: 'memory_reflections',
      sql: `
        SELECT id AS source_id, 'memory_reflections' AS source, id AS matched_id
        FROM memory_reflections
        WHERE card_id = ?
          AND id IN (${placeholders})
          ${tableStates.get('memory_reflections')?.columns.has('status')
            ? `AND status = 'confirmed'`
            : ''}
      `,
      params: [input.cardId, ...evidenceIds],
      canonical: true,
    },
    {
      table: 'episodic_events',
      sql: `
        SELECT id AS source_id, 'episodic_events' AS source, id AS matched_id
        FROM episodic_events
        WHERE card_id = ? AND id IN (${placeholders})
      `,
      params: [input.cardId, ...evidenceIds],
      canonical: true,
    },
    {
      table: 'memory_consolidations',
      sql: `
        SELECT id AS source_id, 'memory_consolidations' AS source, id AS matched_id
        FROM memory_consolidations
        WHERE card_id = ? AND id IN (${placeholders})
      `,
      params: [input.cardId, ...evidenceIds],
      canonical: true,
    },
    {
      table: 'long_term_memory_search_documents',
      sql: `
        SELECT source_id, source, id AS matched_id
        FROM long_term_memory_search_documents
        WHERE card_id = ?
          AND tombstoned = 0
          AND (source_id IN (${placeholders}) OR id IN (${placeholders}))
      `,
      params: [input.cardId, ...evidenceIds, ...evidenceIds],
      canonical: false,
    },
    {
      table: 'long_term_memory_vectors',
      sql: `
        SELECT source_id, source, id AS matched_id
        FROM long_term_memory_vectors
        WHERE card_id = ?
          AND status = 'indexed'
          AND (source_id IN (${placeholders}) OR id IN (${placeholders}))
      `,
      params: [input.cardId, ...evidenceIds, ...evidenceIds],
      canonical: false,
    },
  ]

  for (const query of queries) {
    const state = tableStates.get(query.table)
    if (!state?.exists)
      continue
    const missingColumns = persistedRecallRequiredColumns[query.table]
      .filter(column => !state.columns.has(column))
    if (missingColumns.length > 0)
      continue
    const tableRows = await allDatabaseRows<{
      source_id: string
      source: string
      matched_id: string
    }>(input.database, query.sql, query.params)
    for (const row of tableRows) {
      const matchingEvidence = evidenceRecords.find(evidence =>
        evidence.source === row.source
        && (evidence.id === row.source_id || evidence.id === row.matched_id))
      if (!matchingEvidence?.source)
        continue
      const evidenceId = matchingEvidence.id
      rows.push({
        table_name: query.table,
        source: row.source,
        source_id: row.source_id,
        evidence_id: evidenceId,
      })
      if (query.canonical && evidenceId === row.source_id) {
        canonicalMatches.add(recallProvenanceKey(row.source, row.source_id))
      }
    }
  }

  const tombstoneState = tableStates.get('long_term_memory_tombstones')
  if (
    tombstoneState?.exists
    && persistedRecallRequiredColumns.long_term_memory_tombstones
      .every(column => tombstoneState.columns.has(column))
  ) {
    const tombstoneRows = await allDatabaseRows<{
      source_id: string
      source: string
    }>(
      input.database,
      `
      SELECT source_id, source
      FROM long_term_memory_tombstones
      WHERE card_id = ?
        AND source_id IN (${placeholders})
      `,
      [input.cardId, ...evidenceIds],
    )
    for (const row of tombstoneRows) {
      for (const evidence of evidenceRecords) {
        if (
          evidence.source
          && evidence.id === row.source_id
          && (row.source === evidence.source || row.source === 'long_term_memory')
        ) {
          tombstonedKeys.add(recallProvenanceKey(evidence.source, evidence.id))
        }
      }
    }
  }

  const provenance = new Map<string, LocalAppBlackboxRecallProvenance>()
  for (const evidence of evidenceRecords) {
    const evidenceId = evidence.id
    const key = recallProvenanceKey(evidence.source, evidenceId)
    const source = evidence.source
    const matchingSourceTable = source
      ? persistedRecallSourceTables[source as keyof typeof persistedRecallSourceTables]
      : undefined
    const isTombstoned = tombstonedKeys.has(key)
    const activeRows = isTombstoned
      ? []
      : rows.filter(row => row.evidence_id === evidenceId)
          .filter(row => row.source === evidence.source)
    const isCanonical = canonicalMatches.has(key) && !isTombstoned
    const errorParts: string[] = []
    if (!evidence.source) {
      errorParts.push(`长期记忆 evidence ${evidenceId} 缺少 source`)
    }
    else if (!matchingSourceTable) {
      errorParts.push(`长期记忆 evidence ${evidenceId} 使用了不支持的 source：${evidence.source}`)
    }
    if (isTombstoned) {
      errorParts.push(`长期记忆 evidence ${evidenceId} 已被 tombstone（${evidence.source}）`)
    }
    if (schemaErrors.length > 0)
      errorParts.push(...schemaErrors)
    if (!isCanonical && errorParts.length === 0) {
      errorParts.push(
        `长期记忆 evidence ${evidenceId} 未在当前 card 的持久化表中找到匹配 source/source_id`,
      )
    }
    const matches = activeRows
      .map(row => ({
        table: row.table_name,
        source: row.source,
        sourceId: row.source_id,
      }))
    provenance.set(key, {
      evidenceId,
      persisted: schemaErrors.length === 0 && isCanonical,
      matches,
      error: errorParts.length > 0 ? errorParts.join('；') : null,
    })
  }
  return provenance
}

export async function readLocalAppRuntimeRecall(input: {
  database: sqlite3.Database
  cardId: string
  query: string
  chatTurns: LocalAppBlackboxChatTurnEvidence[]
}): Promise<LocalAppBlackboxMemoryRecall> {
  const query = input.query.trim()
  if (!query)
    return emptyLocalAppMemoryRecall('', 'not-requested')

  const targetTurn = [...input.chatTurns]
    .reverse()
    .find(turn => turn.message.trim() === query)
    ?? input.chatTurns.at(-1)
  const turnId = targetTurn?.turnId?.trim() ?? ''
  const startedAt = targetTurn?.startedAt
  const finishedAt = targetTurn?.finishedAt
  const hasTimeWindow = Number.isFinite(startedAt) && Number.isFinite(finishedAt)
  if (!targetTurn || (!turnId && !hasTimeWindow)) {
    return {
      ...emptyLocalAppMemoryRecall(query),
      errors: [`无法将长期记忆召回查询关联到回放 turn：${query}`],
    }
  }

  const scopeCondition = turnId
    ? 'turn_id = ?'
    : '(occurred_at >= ? AND occurred_at <= ?)'
  const scopeParams = turnId
    ? [turnId]
    : [
        Math.max(0, Math.min(startedAt!, finishedAt!) - 1_000),
        Math.max(startedAt!, finishedAt!) + 1_000,
      ]
  const eventTypes = [
    'long_term_memory.recall.evidence',
    'long_term_memory.recall.abstained',
    'long_term_memory.recall.completed',
  ] as const
  const rows = await allDatabaseRows<LocalAppRuntimeRecallEventRow>(
    input.database,
    `
    SELECT event_id, event_type, turn_id, occurred_at, sequence, payload_json
    FROM alicization_runtime_events
    WHERE card_id = ?
      AND event_type IN (?, ?, ?)
      AND ${scopeCondition}
    ORDER BY occurred_at ASC, sequence ASC, event_id ASC
    `,
    [input.cardId, ...eventTypes, ...scopeParams],
  )

  const errors: string[] = []
  const parsedRows = rows.map((row) => {
    try {
      return {
        row,
        payload: jsonRecord(JSON.parse(row.payload_json)),
      }
    }
    catch {
      errors.push(`无法解析长期记忆召回事件 payload：${row.event_id}`)
      return {
        row,
        payload: null,
      }
    }
  })
  const eventRows = parsedRows.filter((
    item,
  ): item is {
    row: LocalAppRuntimeRecallEventRow
    payload: Record<string, unknown>
  } => item.payload !== null)
  const events = eventRows.map(({ row, payload }) => {
    const status = recallEventStatus(row.event_type)
    return {
      eventId: row.event_id,
      eventType: row.event_type as LocalAppBlackboxRecallEvent['eventType'],
      status,
      turnId: row.turn_id,
      evidenceId: status === 'evidence'
        ? nonEmptyString(payload.id)
        : null,
      summary: status === 'evidence'
        ? nonEmptyString(payload.summary)
        : null,
      source: status === 'evidence'
        ? nonEmptyString(payload.source)
        : null,
    }
  })
  const runtimeEvidence = events
    .filter(event => event.status === 'evidence')
    .map(event => ({
      id: event.evidenceId,
      summary: event.summary,
      source: event.source,
      status: 'evidence' as const,
      turnId: event.turnId,
    }))
  const terminalStatus = [...eventRows]
    .reverse()
    .find(({ row }) => (
      row.event_type === 'long_term_memory.recall.completed'
      || row.event_type === 'long_term_memory.recall.abstained'
    ))
  const status = recallProviderStatus(terminalStatus?.payload.status)
    ?? (runtimeEvidence.length > 0 ? 'recalled' : 'unknown')
  const persistedProvenance = await readPersistedRecallProvenance({
    database: input.database,
    cardId: input.cardId,
    evidence: runtimeEvidence,
  })
  const evidence = runtimeEvidence.map(item => ({
    ...item,
    provenance: item.id
      ? persistedProvenance.get(recallProvenanceKey(item.source, item.id)) ?? {
        evidenceId: item.id,
        persisted: false,
        matches: [],
        error: `长期记忆 evidence ${item.id} 未找到 provenance`,
      }
      : {
          evidenceId: '',
          persisted: false,
          matches: [],
          error: '长期记忆 evidence 缺少 evidence ID',
        },
  }))
  const unresolvedEvidence = evidence.filter(item => !item.provenance.persisted)
  if (status === 'recalled' && unresolvedEvidence.length > 0) {
    errors.push(...unresolvedEvidence
      .map(item => item.provenance.error)
      .filter((error): error is string => Boolean(error)))
  }
  const usableEvidence = status === 'recalled'
    ? evidence.filter(item => item.provenance.persisted)
    : []
  const effectiveStatus = status === 'recalled' && usableEvidence.length === 0
    ? 'unknown'
    : status
  const matchedIds = usableEvidence
    .map(item => item.id)
    .filter((id): id is string => id !== null)
  const summaries = usableEvidence
    .map(item => item.summary)
    .filter((summary): summary is string => summary !== null)

  return {
    query,
    matched: usableEvidence.length > 0,
    status: effectiveStatus,
    turnId: rows[0]?.turn_id ?? null,
    matchedIds,
    summaries,
    evidence: usableEvidence,
    events,
    errors,
  }
}

export async function assessFailedTurnMemoryLeaks(input: {
  database: sqlite3.Database
  cardId: string
  failedTurns: LocalAppBlackboxChatTurnEvidence[]
}): Promise<LocalAppBlackboxMemoryLeakAssessment> {
  const failedTurns = input.failedTurns.filter(turn => turn.status !== 'completed')
  if (failedTurns.length === 0) {
    return {
      status: 'passed',
      leakedCount: 0,
      indeterminateTurnCount: 0,
    }
  }

  const turnIds = [...new Set(failedTurns
    .map(turn => turn.turnId?.trim() ?? '')
    .filter(Boolean))]
  const indeterminateTurnCount = failedTurns
    .filter(turn => !(turn.turnId?.trim() ?? ''))
    .length
  if (turnIds.length === 0) {
    return {
      status: 'unknown',
      leakedCount: 0,
      indeterminateTurnCount,
    }
  }

  const leakedRows = new Set<string>()
  const sourceIds = new Set<string>()
  const turnIdPlaceholders = turnIds.map(() => '?').join(', ')
  const tableExists = async (table: string) => {
    const rows = await allDatabaseRows<{ name: string }>(
      input.database,
      `PRAGMA table_info(${table})`,
    )
    return rows.length > 0
  }
  const jsonContainsTurnId = (raw: string | null | undefined) => {
    if (!raw)
      return false
    try {
      const value = JSON.parse(raw) as unknown
      const visit = (current: unknown): boolean => {
        if (typeof current === 'string')
          return turnIds.includes(current)
        if (Array.isArray(current))
          return current.some(visit)
        if (current && typeof current === 'object')
          return Object.values(current).some(visit)
        return false
      }
      return visit(value)
    }
    catch {
      return false
    }
  }

  async function readTurnScopedRows(table: 'memory_reflections' | 'episodic_events' | 'persona_reinforcement_events' | 'person_state_evolution_log') {
    return await allDatabaseRows<{ id: string }>(
      input.database,
      `
      SELECT id
      FROM ${table}
      WHERE card_id = ?
        AND turn_id IN (${turnIdPlaceholders})
      `,
      [input.cardId, ...turnIds],
    )
  }

  const linkedRows = await Promise.all([
    readTurnScopedRows('memory_reflections'),
    readTurnScopedRows('episodic_events'),
    readTurnScopedRows('persona_reinforcement_events'),
    readTurnScopedRows('person_state_evolution_log'),
  ])
  for (const [index, rows] of linkedRows.entries()) {
    const table = [
      'memory_reflections',
      'episodic_events',
      'persona_reinforcement_events',
      'person_state_evolution_log',
    ][index]!
    for (const row of rows) {
      leakedRows.add(`${table}:${row.id}`)
      if (table === 'memory_reflections' || table === 'episodic_events' || table === 'persona_reinforcement_events')
        sourceIds.add(row.id)
    }
  }

  if (await tableExists('relationship_outcomes')) {
    const rows = await allDatabaseRows<{ id: string }>(
      input.database,
      `
      SELECT id
      FROM relationship_outcomes
      WHERE card_id = ?
        AND turn_id IN (${turnIdPlaceholders})
      `,
      [input.cardId, ...turnIds],
    )
    for (const row of rows)
      leakedRows.add(`relationship_outcomes:${row.id}`)
  }

  if (await tableExists('working_memory_long_term_transactions')) {
    const rows = await allDatabaseRows<{
      id: string
      queue_item_id: string
      queue_item_json: string | null
      cleaned_candidate_json: string | null
      projections_json: string | null
    }>(
      input.database,
      `
      SELECT id, queue_item_id, queue_item_json, cleaned_candidate_json, projections_json
      FROM working_memory_long_term_transactions
      WHERE card_id = ?
      `,
      [input.cardId],
    )
    for (const row of rows) {
      if (![
        row.queue_item_json,
        row.cleaned_candidate_json,
        row.projections_json,
      ].some(jsonContainsTurnId)) {
        continue
      }
      leakedRows.add(`working_memory_long_term_transactions:${row.id}`)
      sourceIds.add(row.id)
      sourceIds.add(row.queue_item_id)
      for (const raw of [row.cleaned_candidate_json, row.projections_json]) {
        if (!raw)
          continue
        try {
          const value = JSON.parse(raw) as {
            id?: unknown
            memoryFacts?: Array<{ sourceLabel?: unknown }>
          }
          if (typeof value.id === 'string')
            sourceIds.add(value.id)
          for (const fact of value.memoryFacts ?? []) {
            if (typeof fact.sourceLabel === 'string')
              sourceIds.add(fact.sourceLabel)
          }
        }
        catch {
          // A malformed transaction is already a failed-turn leak candidate.
        }
      }
    }
  }

  if (await tableExists('memory_facts')) {
    const sourcePatterns = [...new Set([
      ...sourceIds,
      ...turnIds,
    ])]
    const sourcePatternClause = sourcePatterns.length > 0
      ? sourcePatterns.map(() => 'source_label LIKE ? ESCAPE \'\\\'').join(' OR ')
      : ''
    if (sourcePatternClause) {
      const rows = await allDatabaseRows<{ id: string }>(
        input.database,
        `
        SELECT id
        FROM memory_facts
        WHERE card_id = ?
          AND (${sourcePatternClause})
        `,
        [
          input.cardId,
          ...sourcePatterns.map(value => `%${value.replace(/[\\%_]/gu, character => `\\${character}`)}%`),
        ],
      )
      for (const row of rows) {
        leakedRows.add(`memory_facts:${row.id}`)
        sourceIds.add(row.id)
      }
    }
  }

  if (sourceIds.size > 0) {
    const sourceIdList = [...sourceIds]
    const conditions = [
      'card_id = ?',
      `source_id IN (${sourceIdList.map(() => '?').join(', ')})`,
    ]
    const params: unknown[] = [input.cardId, ...sourceIdList]
    const personaRows = await allDatabaseRows<{ id: string }>(
      input.database,
      `
      SELECT id
      FROM persona_training_dataset_examples
      WHERE ${conditions.join(' AND ')}
      `,
      params,
    )
    for (const row of personaRows)
      leakedRows.add(`persona_training_dataset_examples:${row.id}`)
  }

  if (sourceIds.size > 0 && await tableExists('long_term_memory_search_documents')) {
    const sourceIdList = [...sourceIds]
    const rows = await allDatabaseRows<{ id: string, source_id: string }>(
      input.database,
      `
      SELECT id, source_id
      FROM long_term_memory_search_documents
      WHERE card_id = ?
        AND (
          source_id IN (${sourceIdList.map(() => '?').join(', ')})
          OR ${sourceIdList.map(() => 'source_ids_json LIKE ? ESCAPE \'\\\'').join(' OR ')}
        )
      `,
      [
        input.cardId,
        ...sourceIdList,
        ...sourceIdList.map(value => `%${value.replace(/[\\%_]/gu, character => `\\${character}`)}%`),
      ],
    )
    for (const row of rows)
      leakedRows.add(`long_term_memory_search_documents:${row.id}`)
  }

  if (sourceIds.size > 0 && await tableExists('long_term_memory_vectors')) {
    const sourceIdList = [...sourceIds]
    const rows = await allDatabaseRows<{ id: string }>(
      input.database,
      `
      SELECT id
      FROM long_term_memory_vectors
      WHERE card_id = ?
        AND source_id IN (${sourceIdList.map(() => '?').join(', ')})
      `,
      [input.cardId, ...sourceIdList],
    )
    for (const row of rows)
      leakedRows.add(`long_term_memory_vectors:${row.id}`)
  }

  const consolidationRows = await allDatabaseRows<{
    id: string
    derived_event_ids_json: string | null
  }>(
    input.database,
    `
    SELECT id, derived_event_ids_json
    FROM memory_consolidations
    WHERE card_id = ?
    `,
    [input.cardId],
  )
  for (const eventId of linkedRows[1]!.map(row => row.id)) {
    const matchingConsolidations = consolidationRows.filter((row) => {
      if (!row.derived_event_ids_json)
        return false
      try {
        const derivedEventIds = JSON.parse(row.derived_event_ids_json)
        return Array.isArray(derivedEventIds)
          && derivedEventIds.includes(eventId)
      }
      catch {
        return false
      }
    })
    for (const row of matchingConsolidations)
      leakedRows.add(`memory_consolidations:${row.id}`)
  }
  // Facts and relationship outcomes are deliberate failure audit records.
  return {
    status: leakedRows.size > 0
      ? 'failed'
      : indeterminateTurnCount > 0
        ? 'unknown'
        : 'passed',
    leakedCount: leakedRows.size,
    indeterminateTurnCount,
  }
}

export async function countFailedTurnMemoryLeaks(input: {
  database: sqlite3.Database
  cardId: string
  failedTurns: LocalAppBlackboxChatTurnEvidence[]
}) {
  const assessment = await assessFailedTurnMemoryLeaks(input)
  return assessment.status === 'unknown'
    ? null
    : assessment.leakedCount
}

export interface LocalAppChatDomSnapshot {
  assistantCount: number
  assistantText: string
  assistantFingerprint?: string
  errorCount: number
  errorText: string
  errorFingerprint?: string
}

export interface LocalAppBlackboxAutomation {
  launch: () => Promise<{ pid: number | null }>
  connect: () => Promise<void>
  waitForStartup: () => Promise<LocalAppBlackboxStartupEvidence>
  openChat: () => Promise<LocalAppBlackboxWindowEvidence>
  sendChatMessage: (message: string, timeoutMs: number) => Promise<LocalAppBlackboxChatTurnEvidence>
  abortChat?: (turnId: string, reason: string) => Promise<AlicizationChatAbortResult>
  openMemoryWorkbench: () => Promise<LocalAppBlackboxWindowEvidence>
  captureScreenshots: (outputDir: string) => Promise<LocalAppBlackboxScreenshotEvidence[]>
  collectDiagnostics?: () => Promise<LocalAppBlackboxDiagnostics>
  close: () => Promise<void>
}

export function buildLocalAppChatAbortRequest(input: {
  cardId: string
  turnId: string
  reason: string
}) {
  return {
    channel: alicizationChatAbortInvokeChannel,
    payload: {
      cardId: input.cardId,
      turnId: input.turnId,
      reason: input.reason,
    },
  } as const
}

export interface LocalAppBlackboxStage {
  id: string
  status: 'succeeded' | 'failed' | 'not-run'
  startedAt: number
  finishedAt: number
  error: string | null
  details: Record<string, unknown>
}

export interface LocalAppBlackboxTrialReport {
  version: 'alicization-local-app-blackbox-trial-v1'
  passed: boolean
  startedAt: number
  finishedAt: number
  appPath: string
  userDataPath: string
  cardId: string
  outputDir: string
  summary: {
    requestedMessageCount: number
    completedMessageCount: number
    failedMessageCount: number
    runtimeTraceEventCount: number
    screenshotCount: number
    rendererConsoleEventCount: number
    pageErrorCount: number
    memoryAssertionPassed: boolean | null
    failedStageIds: string[]
    lastError: string | null
  }
  stages: LocalAppBlackboxStage[]
  chatTurns: LocalAppBlackboxChatTurnEvidence[]
  memoryAssertions: LocalAppBlackboxMemoryAssertions | null
  runtimeDebugTrace: Array<Record<string, unknown>>
  screenshots: LocalAppBlackboxScreenshotEvidence[]
  diagnostics: LocalAppBlackboxDiagnostics
}

export interface LocalAppProductionTrialReport {
  version: 'alicization-local-app-production-trial-v1'
  passed: boolean
  startedAt: number
  finishedAt: number
  appPath: string
  userDataPath: string
  cardId: string
  outputDir: string
  summary: {
    blackboxPassed: boolean
    qualityTrialPassed: boolean | null
    qualityTrialStatus: 'passed' | 'failed' | 'not-run' | null
    lastError: string | null
  }
  blackbox: LocalAppBlackboxTrialReport
  qualityTrial: MemoryProductionTrialReport | null
  qualityTrialError: string | null
}

export interface LocalAppProductionTrialQualityResult {
  report: MemoryProductionTrialReport | null
  error: string | null
}

export interface LocalAppBlackboxTrialDependencies {
  automation: LocalAppBlackboxAutomation
  readRuntimeDebugTrace: (input: {
    path: string
    since: number
  }) => Promise<Array<Record<string, unknown>>>
  writeText?: (path: string, content: string) => Promise<void>
  ensureOutputDir?: (path: string) => Promise<void>
  inspectMemory?: (input: {
    userDataPath: string
    cardId: string
    messages: string[]
    chatTurns: LocalAppBlackboxChatTurnEvidence[]
    runtimeDebugTrace?: Array<Record<string, unknown>>
  }) => Promise<LocalAppBlackboxMemoryAssertions>
  waitForMemoryClosure?: (input: {
    userDataPath: string
    cardId: string
    chatTurns: LocalAppBlackboxChatTurnEvidence[]
  }) => Promise<LocalAppMemoryClosureWaitResult>
  now?: () => number
}

export interface LocalAppMemoryClosureSnapshot {
  activeQueueCount: number
  activeIngestCount: number
  activeReindexCount: number
  projectionRevision: string
}

function countByStatus(rows: Array<{ status: string, count: number }>, ...statuses: string[]) {
  const statusSet = new Set(statuses)
  return rows
    .filter(row => statusSet.has(row.status))
    .reduce((total, row) => total + Number(row.count || 0), 0)
}

export async function readLocalAppMemoryClosureSnapshot(
  database: sqlite3.Database,
  cardId: string,
): Promise<LocalAppMemoryClosureSnapshot> {
  const [
    queueRows,
    ingestRows,
    reindexJobRows,
    factRows,
    reflectionRows,
    eventRows,
    consolidationRows,
    searchRows,
    vectorRows,
  ] = await Promise.all([
    allDatabaseRows<{ status: string, count: number }>(
      database,
      `
      SELECT status, COUNT(*) AS count
      FROM working_memory_long_term_transactions
      WHERE card_id = ?
      GROUP BY status
      `,
      [cardId],
    ),
    allDatabaseRows<{ status: string, count: number }>(
      database,
      `
      SELECT status, COUNT(*) AS count
      FROM memory_ingest_journal
      WHERE status IN ('pending', 'failed')
        AND operation_kind IN ('upsert-memory-facts', 'append-episodic-events', 'upsert-memory-consolidations')
        AND (
          card_id = ?
          OR (
            json_valid(payload_json) = 1
            AND (
          (
            operation_kind = 'upsert-memory-facts'
            AND EXISTS (
              SELECT 1
              FROM json_each(json_extract(payload_json, '$.facts')) AS item
              WHERE json_extract(item.value, '$.cardId') = ?
            )
          )
          OR (
            operation_kind = 'append-episodic-events'
            AND EXISTS (
              SELECT 1
              FROM json_each(json_extract(payload_json, '$.events')) AS item
              WHERE json_extract(item.value, '$.cardId') = ?
            )
          )
          OR (
            operation_kind = 'upsert-memory-consolidations'
            AND EXISTS (
              SELECT 1
              FROM json_each(json_extract(payload_json, '$.records')) AS item
              WHERE json_extract(item.value, '$.cardId') = ?
            )
          )
            )
          )
        )
      GROUP BY status
      `,
      [cardId, cardId, cardId, cardId],
    ),
    allDatabaseRows<{ status: string, count: number }>(
      database,
      `
      SELECT status, COUNT(*) AS count
      FROM memory_embedding_reindex_jobs
      WHERE card_id = ?
        AND status IN ('queued', 'running', 'cancel_requested')
      GROUP BY status
      `,
      [cardId],
    ),
    allDatabaseRows<{ count: number, updated_at: number | null }>(
      database,
      'SELECT COUNT(*) AS count, MAX(updated_at) AS updated_at FROM memory_facts WHERE card_id = ?',
      [cardId],
    ),
    allDatabaseRows<{ count: number, updated_at: number | null }>(
      database,
      'SELECT COUNT(*) AS count, MAX(updated_at) AS updated_at FROM memory_reflections WHERE card_id = ?',
      [cardId],
    ),
    allDatabaseRows<{ count: number, created_at: number | null }>(
      database,
      'SELECT COUNT(*) AS count, MAX(created_at) AS created_at FROM episodic_events WHERE card_id = ?',
      [cardId],
    ),
    allDatabaseRows<{ count: number, updated_at: number | null }>(
      database,
      'SELECT COUNT(*) AS count, MAX(updated_at) AS updated_at FROM memory_consolidations WHERE card_id = ?',
      [cardId],
    ),
    allDatabaseRows<{ count: number, updated_at: number | null }>(
      database,
      'SELECT COUNT(*) AS count, MAX(updated_at) AS updated_at FROM long_term_memory_search_documents WHERE card_id = ?',
      [cardId],
    ),
    allDatabaseRows<{ count: number, updated_at: number | null }>(
      database,
      'SELECT COUNT(*) AS count, MAX(updated_at) AS updated_at FROM long_term_memory_vectors WHERE card_id = ?',
      [cardId],
    ),
  ])

  const activeQueueCount = countByStatus(
    queueRows,
    'pending-cleaning',
    'cleaning',
    'admitted',
  )
  const activeIngestCount = countByStatus(ingestRows, 'pending', 'failed')
  const activeReindexCount = countByStatus(
    reindexJobRows,
    'queued',
    'running',
    'cancel_requested',
  )
  const projectionRevision = JSON.stringify([
    factRows[0]?.count ?? 0,
    factRows[0]?.updated_at ?? null,
    reflectionRows[0]?.count ?? 0,
    reflectionRows[0]?.updated_at ?? null,
    eventRows[0]?.count ?? 0,
    eventRows[0]?.created_at ?? null,
    consolidationRows[0]?.count ?? 0,
    consolidationRows[0]?.updated_at ?? null,
    searchRows[0]?.count ?? 0,
    searchRows[0]?.updated_at ?? null,
    vectorRows[0]?.count ?? 0,
    vectorRows[0]?.updated_at ?? null,
  ])

  return {
    activeQueueCount,
    activeIngestCount,
    activeReindexCount,
    projectionRevision,
  }
}

export function findMemoryRecallQuery(messages: string[]) {
  return [...messages]
    .reverse()
    .find((message) => {
      const normalized = message.trim()
      if (!normalized)
        return false

      const isRecallBehaviorQuestion = (
        normalized.includes('召回不到')
        || normalized.includes('没有召回')
        || normalized.includes('未命中')
      ) && [
        '应该怎样回答',
        '应该怎么回答',
        '应该如何回答',
        '怎样回答',
        '怎么回答',
        '如何回答',
      ].some(phrase => normalized.includes(phrase))
      if (isRecallBehaviorQuestion)
        return false

      const hasQuestionSignal = normalized.includes('?')
        || normalized.includes('？')
        || ['吗', '么', '呢', '来着'].some(signal => normalized.endsWith(signal))
        || ['有没有', '是否', '是不是', '记不记得', '什么', '哪个', '哪些', '哪里', '谁', '多少', '怎么', '怎样']
          .some(signal => normalized.includes(signal))
      const isMemoryWriteCommand = [
        '请记住',
        '请你记住',
        '请帮我记住',
        '请你帮我记住',
        '帮我记住',
        '麻烦你记住',
        '记住',
        '请记下',
        '请你记下',
        '帮我记下',
        '记下',
        '请保存',
        '请你保存',
        '帮我保存',
        '保存',
        '请记录',
        '请你记录',
        '帮我记录',
        '记录',
        '别忘了',
        '不要忘记',
      ].some(prefix => normalized.startsWith(prefix))
      const memoryWriteVerbs = ['记住', '记下', '保存', '记录']
      const memoryWriteActors = ['让你', '叫你', '请你']
      const memoryWriteCompletions = [
        '了',
        '过',
        '了这件事',
        '过这件事',
        '了这个',
        '过这个',
        '了它',
        '过它',
        '了内容',
        '过内容',
      ]
      const withoutTerminalPunctuation = normalized.replace(/[。.!！]$/u, '')
      const isCompletedMemoryWrite = memoryWriteActors.some(actor => normalized.includes(actor))
        && memoryWriteVerbs.some(verb => normalized.includes(verb))
        && memoryWriteCompletions.some(suffix => withoutTerminalPunctuation.endsWith(suffix))
      const isMemoryStatement = ['告诉过', '说过', '提过'].some(phrase => normalized.includes(phrase))
      if (!hasQuestionSignal && (isMemoryWriteCommand || isCompletedMemoryWrite || isMemoryStatement))
        return false

      const hasMemoryContext = [
        '记住',
        '记得',
        '之前',
        '上次',
        '以前',
        '曾经',
        '刚才',
        '刚刚',
        '说过',
        '提过',
        '告诉过',
        '那条记忆',
        '这段记忆',
        '长期记忆',
        '偏好',
        '回忆',
        '找回',
      ].some(term => normalized.includes(term))
      || (normalized.includes('我') && normalized.includes('喜欢'))
      || (normalized.includes('我') && normalized.includes('偏好'))
      const isRetrievalCommand = ['回忆一下', '找回', '查一下', '翻一下', '复述一下', '检索', '搜索']
        .some(command => normalized.includes(command))

      return hasMemoryContext && (hasQuestionSignal || isRetrievalCommand)
    })
    ?? ''
}

export interface LocalAppMemoryClosureWaitResult {
  settled: boolean
  waitedMs: number
  polls: number
  stablePolls: number
  snapshot: LocalAppMemoryClosureSnapshot | null
}

export async function waitForLocalAppMemoryClosure(input: {
  readSnapshot: () => Promise<LocalAppMemoryClosureSnapshot>
  timeoutMs?: number
  pollMs?: number
  minWaitMs?: number
  stablePollsRequired?: number
  sleep?: (ms: number) => Promise<unknown>
  now?: () => number
}): Promise<LocalAppMemoryClosureWaitResult> {
  const now = input.now ?? (() => Date.now())
  const sleep = input.sleep ?? (async (ms: number) => {
    await new Promise<void>(resolve => setTimeout(resolve, ms))
  })
  const timeoutMs = Math.max(0, Math.floor(input.timeoutMs ?? 30_000))
  const pollMs = Math.max(1, Math.floor(input.pollMs ?? 250))
  const minWaitMs = Math.max(0, Math.floor(input.minWaitMs ?? 1_000))
  const stablePollsRequired = Math.max(1, Math.floor(input.stablePollsRequired ?? 2))
  const startedAt = now()
  const deadline = startedAt + timeoutMs
  let snapshot: LocalAppMemoryClosureSnapshot | null = null
  let previousRevision: string | null = null
  let stablePolls = 0
  let polls = 0

  while (true) {
    snapshot = await input.readSnapshot()
    polls += 1
    const elapsedMs = Math.max(0, now() - startedAt)
    const active = snapshot.activeQueueCount
      + snapshot.activeIngestCount
      + snapshot.activeReindexCount
    const revisionStable = previousRevision === snapshot.projectionRevision
    if (active === 0 && elapsedMs >= minWaitMs) {
      stablePolls = revisionStable ? stablePolls + 1 : 1
      if (stablePolls >= stablePollsRequired) {
        return {
          settled: true,
          waitedMs: elapsedMs,
          polls,
          stablePolls,
          snapshot,
        }
      }
    }
    else {
      stablePolls = 0
    }
    previousRevision = snapshot.projectionRevision

    const remainingMs = deadline - now()
    if (remainingMs <= 0) {
      return {
        settled: false,
        waitedMs: Math.max(0, now() - startedAt),
        polls,
        stablePolls,
        snapshot,
      }
    }
    await sleep(Math.min(pollMs, remainingMs))
  }
}

function classifyQualityTrial(report: MemoryProductionTrialReport | null) {
  if (!report)
    return null
  const stages = Array.isArray(report.stages) ? report.stages : []
  if (stages.length > 0 && stages.every(stage => stage.status === 'not-run'))
    return 'not-run' as const
  if (report.passed)
    return 'passed' as const
  return 'failed' as const
}

function optionValue(args: string[], index: number, name: string) {
  const value = args[index + 1]?.trim()
  if (!value || value.startsWith('--'))
    throw new Error(`选项 ${name} 需要一个值。`)
  return value
}

function positiveInteger(value: string, name: string) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0)
    throw new Error(`选项 ${name} 必须是正整数。`)
  return parsed
}

export function parseLocalAppBlackboxTrialArgs(
  rawArgs: string[],
  defaults: {
    homeDir?: string
    now?: () => number
  } = {},
): LocalAppBlackboxTrialArgs {
  const home = defaults.homeDir ?? homedir()
  const timestamp = new Date((defaults.now ?? (() => Date.now()))())
    .toISOString()
    .replace(/[.:]/g, '-')
  let appPath = join(home, 'Applications', 'Alicization Local.app')
  let userDataPath = join(home, 'Library', 'Application Support', 'Alicization')
  let cardId = 'default'
  let outputDir = join(home, 'Desktop', 'Alicization-Blackbox-Traces', timestamp)
  let remoteDebugPort = 9222
  let launchTimeoutMs = 45_000
  let turnTimeoutMs = 120_000
  const messages: string[] = []
  let attachOnly = false
  let keepOpen = false
  let openMemoryWorkbench = true
  let runQualityTrial = false
  let qualityMode: 'historical-replay' | 'live-provider' = 'historical-replay'
  let qualityReadOnly = false

  for (let index = 0; index < rawArgs.length; index += 1) {
    const argument = rawArgs[index]
    if (!argument || argument === '--')
      continue

    const [rawName, inlineValue] = argument.split('=', 2)
    const name = rawName.trim()
    const value = inlineValue?.trim() || null
    const readValue = () => value ?? optionValue(rawArgs, index++, name)

    if (name === '--app') {
      appPath = readValue()
      continue
    }
    if (name === '--user-data-path') {
      userDataPath = readValue()
      continue
    }
    if (name === '--card-id') {
      cardId = readValue()
      continue
    }
    if (name === '--output') {
      outputDir = readValue()
      continue
    }
    if (name === '--port') {
      remoteDebugPort = positiveInteger(readValue(), name)
      continue
    }
    if (name === '--launch-timeout-ms') {
      launchTimeoutMs = positiveInteger(readValue(), name)
      continue
    }
    if (name === '--turn-timeout-ms') {
      turnTimeoutMs = positiveInteger(readValue(), name)
      continue
    }
    if (name === '--message') {
      messages.push(readValue())
      continue
    }
    if (name === '--attach') {
      attachOnly = true
      continue
    }
    if (name === '--keep-open') {
      keepOpen = true
      continue
    }
    if (name === '--no-memory-workbench') {
      openMemoryWorkbench = false
      continue
    }
    if (name === '--quality-trial') {
      runQualityTrial = true
      continue
    }
    if (name === '--quality-mode') {
      const parsed = readValue()
      if (parsed !== 'historical-replay' && parsed !== 'live-provider')
        throw new Error(`选项 --quality-mode 不支持值 ${parsed}。`)
      qualityMode = parsed
      runQualityTrial = true
      continue
    }
    if (name === '--quality-read-only') {
      qualityReadOnly = true
      runQualityTrial = true
      continue
    }
    if (name === '--help' || name === '-h')
      continue
    throw new Error(`不支持的选项：${name}。`)
  }

  if (remoteDebugPort > 65535)
    throw new Error('选项 --port 必须小于或等于 65535。')

  return {
    appPath,
    userDataPath,
    cardId,
    outputDir,
    remoteDebugPort,
    launchTimeoutMs,
    turnTimeoutMs,
    messages,
    attachOnly,
    keepOpen,
    openMemoryWorkbench,
    runQualityTrial,
    qualityMode,
    qualityReadOnly,
  }
}

export function resolveLocalAppMemoryDatabasePath(input: {
  userDataPath: string
  cardId: string
  pathExists?: (path: string) => boolean
}) {
  const pathExists = input.pathExists ?? existsSync
  const cardId = input.cardId.trim() || 'default'
  const candidates = [
    join(input.userDataPath, 'alicizations', 'cards', cardId, 'alicization.db'),
    join(input.userDataPath, 'alicizations', 'alicization.db'),
  ]
  return candidates.find(pathExists) ?? candidates[0]!
}

export function buildLocalAppProductionTrialReport(input: {
  blackbox: LocalAppBlackboxTrialReport
  qualityTrial: MemoryProductionTrialReport | null
  qualityTrialError?: string | null
  cardId?: string
  startedAt?: number
  finishedAt?: number
}) {
  const qualityTrialError = input.qualityTrialError?.trim() || null
  const qualityTrialStatus = classifyQualityTrial(input.qualityTrial)
    ?? (qualityTrialError ? 'failed' as const : null)
  const qualityTrialPassed = qualityTrialStatus === null
    ? null
    : qualityTrialStatus === 'passed'
  const lastError = qualityTrialError
    ?? input.qualityTrial?.summary.lastError
    ?? input.blackbox.summary.lastError
    ?? null
  return {
    version: 'alicization-local-app-production-trial-v1' as const,
    passed: input.blackbox.passed
      && (qualityTrialStatus === null || qualityTrialStatus === 'passed'),
    startedAt: input.startedAt ?? input.blackbox.startedAt,
    finishedAt: input.finishedAt ?? input.blackbox.finishedAt,
    appPath: input.blackbox.appPath,
    userDataPath: input.blackbox.userDataPath,
    cardId: input.cardId ?? input.blackbox.cardId,
    outputDir: input.blackbox.outputDir,
    summary: {
      blackboxPassed: input.blackbox.passed,
      qualityTrialPassed,
      qualityTrialStatus,
      lastError,
    },
    blackbox: input.blackbox,
    qualityTrial: input.qualityTrial,
    qualityTrialError,
  } satisfies LocalAppProductionTrialReport
}

export async function runLocalAppProductionTrial(input: {
  args: LocalAppBlackboxTrialArgs
  runBlackbox: () => Promise<LocalAppBlackboxTrialReport>
  runQualityTrial?: (input: {
    cardId: string
    userDataPath: string
    mode: 'historical-replay' | 'live-provider'
    reportPath: string
    readOnly: boolean
  }) => Promise<LocalAppProductionTrialQualityResult>
  writeText?: (path: string, content: string) => Promise<void>
  now?: () => number
}): Promise<LocalAppProductionTrialReport> {
  const now = input.now ?? (() => Date.now())
  const writeText = input.writeText ?? (async (path, content) => {
    await writeFile(path, content, {
      encoding: 'utf8',
      mode: 0o600,
    })
  })
  const startedAt = now()
  const blackbox = await input.runBlackbox()
  let qualityTrial: MemoryProductionTrialReport | null = null
  let qualityTrialError: string | null = null

  if (input.args.runQualityTrial) {
    if (!input.runQualityTrial) {
      qualityTrialError = '质量阶段已请求但没有配置 DB 质量试用运行器。'
    }
    else {
      try {
        const result = await input.runQualityTrial({
          cardId: input.args.cardId,
          userDataPath: input.args.userDataPath,
          mode: input.args.qualityMode,
          reportPath: join(input.args.outputDir, 'quality-report.json'),
          readOnly: input.args.qualityReadOnly,
        })
        qualityTrial = result.report
        qualityTrialError = result.error
      }
      catch (error) {
        qualityTrialError = errorMessage(error)
      }
    }
  }

  const report = buildLocalAppProductionTrialReport({
    blackbox,
    qualityTrial,
    qualityTrialError,
    cardId: input.args.cardId,
    startedAt,
    finishedAt: now(),
  })
  await writeText(
    join(input.args.outputDir, 'production-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  )
  return report
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function resolveMemoryAssertionPassed(input: {
  memoryAssertions: LocalAppBlackboxMemoryAssertions | null
  memoryClosureStage: LocalAppBlackboxStage | undefined
}) {
  if (input.memoryAssertions === null)
    return null
  if (input.memoryClosureStage?.status !== 'succeeded')
    return false
  return input.memoryAssertions.failureIsolationPassed
}

export async function readRuntimeDebugTraceSince(
  path: string,
  since: number,
  readText: (path: string) => Promise<string> = async inputPath =>
    await readFile(inputPath, 'utf8'),
) {
  let content = ''
  try {
    content = await readText(path)
  }
  catch (error) {
    const code = (error as NodeJS.ErrnoException | null)?.code
    if (code === 'ENOENT')
      return []
    throw error
  }

  return content
    .split(/\r?\n/u)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>
        const timestamp = typeof parsed.ts === 'string'
          ? Date.parse(parsed.ts)
          : Number.NaN
        if (Number.isFinite(timestamp) && timestamp < since)
          return null
        return parsed
      }
      catch {
        return {
          event: 'runtime-debug.parse-failed',
          raw: line,
        }
      }
    })
    .filter((entry): entry is Record<string, unknown> => entry !== null)
}

function runtimeDebugEventName(event: Record<string, unknown>) {
  return typeof event.event === 'string' ? event.event : ''
}

function runtimeDebugTurnId(event: Record<string, unknown>) {
  return typeof event.turnId === 'string' && event.turnId.trim()
    ? event.turnId.trim()
    : null
}

function runtimeDebugCardId(event: Record<string, unknown>) {
  return typeof event.cardId === 'string' && event.cardId.trim()
    ? event.cardId.trim()
    : null
}

function runtimeDebugTimestamp(event: Record<string, unknown>) {
  if (typeof event.ts === 'string') {
    const timestamp = Date.parse(event.ts)
    if (Number.isFinite(timestamp))
      return timestamp
  }
  for (const key of ['occurredAt', 'occurred_at', 'timestamp']) {
    const value = event[key]
    if (typeof value === 'number' && Number.isFinite(value))
      return value
  }
  return null
}

function runtimeDebugError(event: Record<string, unknown>) {
  for (const key of ['error', 'reason', 'message']) {
    const value = event[key]
    if (typeof value === 'string' && value.trim())
      return value.trim()
  }
  return null
}

function runtimeDebugStatus(event: Record<string, unknown>) {
  const value = event.status
  return value === 'completed'
    || value === 'failed'
    || value === 'timed-out'
    || value === 'aborted'
    ? value
    : null
}

function isRuntimeFailureEvent(eventName: string) {
  return eventName === 'chat-start.invoke-failed'
    || eventName === 'chat-start.prepare-failed'
    || eventName === 'chat-stream.failed'
    || eventName === 'chat-stream.provider-request-failed'
    || eventName === 'chat-stream.timeout-failed'
}

function isRuntimeChatRequestEvent(eventName: string) {
  return eventName === 'chat-start.invoke-requested'
    || eventName === 'chat-start.direct-requested'
}

export function resolveLocalAppChatRuntimeEvidence(input: {
  events: Array<Record<string, unknown>>
  cardId?: string
  startedAt?: number
}): LocalAppChatRuntimeEvidence {
  const cardId = input.cardId?.trim() || null
  const events = input.events.filter((event) => {
    const timestamp = runtimeDebugTimestamp(event)
    const afterStart = input.startedAt === undefined
      || timestamp === null
      || timestamp >= input.startedAt
    if (cardId === null) {
      return afterStart
    }
    const eventCardId = runtimeDebugCardId(event)
    return (eventCardId === null || eventCardId === cardId) && afterStart
  })
  const requestIndex = events.reduce((latestIndex, event, index) => {
    return isRuntimeChatRequestEvent(runtimeDebugEventName(event))
      ? index
      : latestIndex
  }, -1)
  const requestEvent = requestIndex >= 0 ? events[requestIndex] : null
  const requestTurnId = requestEvent ? runtimeDebugTurnId(requestEvent) : null
  if (!requestEvent || !requestTurnId) {
    return {
      requestTurnId,
      turnId: null,
      accepted: false,
      acceptedAtMs: null,
      streamFinished: false,
      streamFinishedAtMs: null,
      status: null,
      error: null,
    }
  }

  const relatedEvents = events
    .slice(requestIndex)
    .filter(event => runtimeDebugTurnId(event) === requestTurnId)
  let accepted = false
  let acceptedAtMs: number | null = null
  let streamFinished = false
  let streamFinishedAtMs: number | null = null
  let status: LocalAppChatRuntimeEvidence['status'] = null
  let error: string | null = null

  for (const event of relatedEvents) {
    const eventName = runtimeDebugEventName(event)
    const timestamp = runtimeDebugTimestamp(event)
    const elapsedMs = timestamp === null || input.startedAt === undefined
      ? null
      : Math.max(0, timestamp - input.startedAt)

    if (eventName === 'chat-start.accepted') {
      accepted = true
      if (acceptedAtMs === null)
        acceptedAtMs = elapsedMs
      continue
    }

    if (
      eventName === 'chat-start.invoke-resolved'
      || eventName === 'chat-start.direct-resolved'
    ) {
      if (event.accepted === true) {
        accepted = true
        if (acceptedAtMs === null)
          acceptedAtMs = elapsedMs
      }
      else if (event.accepted === false && error === null) {
        error = runtimeDebugError(event)
      }
      continue
    }

    if (isRuntimeFailureEvent(eventName)) {
      status = runtimeDebugStatus(event)
        ?? (eventName.includes('timeout') ? 'timed-out' : 'failed')
      error = runtimeDebugError(event) ?? error
      continue
    }

    if (eventName === 'chat-stream.finished') {
      streamFinished = true
      streamFinishedAtMs = elapsedMs
      status = runtimeDebugStatus(event)
      if (status === 'completed')
        error = null
      else
        error = runtimeDebugError(event) ?? error
    }
  }

  return {
    requestTurnId,
    turnId: requestTurnId,
    accepted,
    acceptedAtMs,
    streamFinished,
    streamFinishedAtMs,
    status,
    error,
  }
}

interface LocalAppBlackboxChildProcess {
  pid?: number
  killed: boolean
  exitCode?: number | null
  signalCode?: NodeJS.Signals | null
  stdout: {
    on: (event: 'data', listener: (chunk: unknown) => void) => unknown
  }
  stderr: {
    on: (event: 'data', listener: (chunk: unknown) => void) => unknown
  }
  once: (event: 'close' | 'exit' | 'error', listener: (...args: unknown[]) => void) => unknown
  kill: (signal?: NodeJS.Signals | number) => boolean
}

type SpawnLike = (
  command: string,
  args: readonly string[],
  options: {
    env: NodeJS.ProcessEnv
    stdio: ['ignore', 'pipe', 'pipe']
  },
) => LocalAppBlackboxChildProcess

function sanitizeArtifactName(value: string, fallback: string) {
  const normalized = value
    .trim()
    .replace(/[^\w-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return normalized || fallback
}

function textTail(value: string, maxChars = 6_000) {
  const normalized = value.trim()
  return normalized.length <= maxChars
    ? normalized
    : normalized.slice(normalized.length - maxChars)
}

async function waitForLocalAppProcessExit(
  child: LocalAppBlackboxChildProcess,
  timeoutMs = 15_000,
) {
  if (child.exitCode !== undefined && child.exitCode !== null)
    return
  if (child.signalCode !== undefined && child.signalCode !== null)
    return

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined
  await new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled)
        return
      settled = true
      if (timeoutHandle)
        clearTimeout(timeoutHandle)
      resolve()
    }

    child.once('close', finish)
    child.once('exit', finish)
    child.once('error', finish)
    timeoutHandle = setTimeout(() => {
      child.kill('SIGKILL')
      finish()
    }, timeoutMs)
  })
}

export function resolveLocalAppChatTurnState(input: {
  before: LocalAppChatDomSnapshot
  current: LocalAppChatDomSnapshot
  inputValue: string
  stopVisible: boolean
  stableForMs: number
  runtime?: LocalAppChatRuntimeEvidence
}) {
  const beforeErrorFingerprint = input.before.errorFingerprint
    ?? `${input.before.errorCount}\u001F${input.before.errorText}`
  const currentErrorFingerprint = input.current.errorFingerprint
    ?? `${input.current.errorCount}\u001F${input.current.errorText}`
  const errorChanged = currentErrorFingerprint !== beforeErrorFingerprint
  const currentError = input.current.errorText.trim()
  if (errorChanged && currentError) {
    return {
      status: 'failed' as const,
      error: currentError,
    }
  }

  if (input.inputValue !== '' || input.stopVisible || input.stableForMs < 750) {
    return {
      status: 'pending' as const,
      error: null,
    }
  }

  const runtime = input.runtime
  const runtimeBound = runtime === undefined
    || (
      runtime.requestTurnId !== null
      && runtime.turnId === runtime.requestTurnId
    )
  if (!runtimeBound) {
    return {
      status: 'pending' as const,
      error: null,
    }
  }

  const runtimeCompleted = runtime === undefined
    || (
      runtime.accepted
      && runtime.streamFinished
      && runtime.status === 'completed'
    )
  const runtimeFailed = runtime === undefined
    || (
      runtime.status !== null
      && runtime.status !== 'completed'
    )
  if (
    runtimeFailed
    && (errorChanged || Boolean(runtime?.error) || Boolean(runtime?.status))
  ) {
    return {
      status: 'failed' as const,
      error: currentError
        || runtime?.error
        || `本轮对话以 ${runtime?.status ?? 'failed'} 状态结束。`,
    }
  }

  // The renderer may reconcile the final reply into the existing assistant bubble.
  // Only a completed, turn-bound runtime can authorize treating that text update
  // as this turn's reply instead of a previous-message refresh.
  const assistantChanged = input.current.assistantCount > input.before.assistantCount
    || (
      runtimeCompleted
      && input.current.assistantText !== input.before.assistantText
    )
  const currentAssistant = input.current.assistantText.trim()
  if (assistantChanged && currentAssistant && runtimeCompleted) {
    return {
      status: 'completed' as const,
      error: null,
    }
  }

  return {
    status: 'pending' as const,
    error: null,
  }
}

export function isLocalAppMainRendererUrl(value: string) {
  try {
    const url = new URL(value)
    return url.pathname.endsWith('/index.html')
      && (url.hash === '' || url.hash === '#' || url.hash === '#/')
  }
  catch {
    return false
  }
}

export function localAppIconButtonXPath(iconAttribute: string) {
  return `xpath=//button[descendant::*[@*[name()="${iconAttribute}"]]]`
}

export async function navigateLocalAppPageToHashRoute(
  page: Page,
  route: string,
  timeoutMs: number,
) {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`
  const expectedHash = `#${normalizedRoute}`
  await page.waitForLoadState('domcontentloaded', {
    timeout: timeoutMs,
  })
  await page.waitForFunction(
    () => {
      const scope = globalThis as unknown as {
        document: {
          querySelector: (selector: string) => {
            childElementCount: number
          } | null
        }
      }
      return (scope.document.querySelector('#app')?.childElementCount ?? 0) > 0
    },
    undefined,
    { timeout: timeoutMs },
  )
  await page.evaluate((hash) => {
    const scope = globalThis as unknown as {
      location: {
        hash: string
      }
    }
    scope.location.hash = hash
  }, expectedHash)
  await page.waitForURL(
    url => url.hash === expectedHash,
    { timeout: timeoutMs },
  )
  if (new URL(page.url()).hash !== expectedHash)
    throw new Error(`页面未停留在目标路由：${expectedHash}`)
}

export function createPlaywrightLocalAppBlackboxAutomation(input: {
  args: LocalAppBlackboxTrialArgs
  spawn?: SpawnLike
  pathExists?: (path: string) => boolean
  connectOverCDP: (endpoint: string) => Promise<Browser>
  sleep?: (ms: number) => Promise<unknown>
  readRuntimeDebugTrace?: (input: {
    path: string
    since: number
  }) => Promise<Array<Record<string, unknown>>>
}): LocalAppBlackboxAutomation {
  const spawn = input.spawn ?? ((command, args, options) =>
    spawnProcess(command, args, options) as LocalAppBlackboxChildProcess)
  const pathExists = input.pathExists ?? existsSync
  const wait = input.sleep ?? (async ms => await sleep(ms))
  const readRuntimeDebugTrace = input.readRuntimeDebugTrace
    ?? (async traceInput => await readRuntimeDebugTraceSince(
      traceInput.path,
      traceInput.since,
    ))
  const runtimeDebugPath = join(
    input.args.userDataPath,
    'alicizations',
    'runtime-debug.log',
  )
  const endpoint = `http://127.0.0.1:${input.args.remoteDebugPort}`
  const executablePath = input.args.appPath.endsWith('.app')
    ? join(
        input.args.appPath,
        'Contents',
        'MacOS',
        'alicization',
      )
    : input.args.appPath
  const processOutput: string[] = []
  const rendererConsole: LocalAppBlackboxDiagnostics['rendererConsole'] = []
  const pageErrors: LocalAppBlackboxDiagnostics['pageErrors'] = []
  const boundPages = new WeakSet<object>()
  let appProcess: LocalAppBlackboxChildProcess | null = null
  let browser: Browser | null = null

  const bindPage = (page: Page) => {
    if (boundPages.has(page))
      return
    boundPages.add(page)
    page.on('console', (message) => {
      rendererConsole.push({
        type: message.type(),
        text: message.text(),
        url: page.url(),
      })
    })
    page.on('pageerror', (error) => {
      pageErrors.push({
        message: error.message,
        url: page.url(),
      })
    })
  }

  const pages = () => {
    const result = browser?.contexts().flatMap(context => context.pages()) ?? []
    for (const page of result)
      bindPage(page)
    return result
  }

  const waitForPage = async (
    predicate: (page: Page) => boolean,
    timeoutMs = input.args.launchTimeoutMs,
  ) => {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const page = pages().find(predicate)
      if (page)
        return page
      await wait(100)
    }
    throw new Error(`等待 App 窗口超时（${timeoutMs}ms）。`)
  }

  const summarizePage = async (page: Page) => ({
    title: await page.title(),
    url: page.url(),
  })

  const mainPage = async () => await waitForPage(page =>
    isLocalAppMainRendererUrl(page.url()),
  )

  const readChatDomSnapshot = async (page: Page): Promise<LocalAppChatDomSnapshot> => {
    const assistantMessages = page.locator('[data-chat-message-role="assistant"]')
    const errorMessages = page.locator('[data-chat-message-role="error"]')
    const [assistantCount, errorCount] = await Promise.all([
      assistantMessages.count(),
      errorMessages.count(),
    ])
    const readMessageTexts = async (
      locator: Locator,
      count: number,
    ) => {
      if (count === 0)
        return []
      return await locator.allTextContents().catch(() => [])
    }
    const [assistantTexts, errorTexts] = await Promise.all([
      readMessageTexts(assistantMessages, assistantCount),
      readMessageTexts(errorMessages, errorCount),
    ])
    return {
      assistantCount,
      assistantText: assistantTexts.at(-1)?.trim() ?? '',
      assistantFingerprint: assistantTexts.map(text => text.trim()).join('\u001F'),
      errorCount,
      errorText: errorTexts.at(-1)?.trim() ?? '',
      errorFingerprint: errorTexts.map(text => text.trim()).join('\u001F'),
    }
  }

  const waitForChatDomStable = async (
    page: Page,
    stableForMs = 900,
    timeoutMs = Math.min(input.args.launchTimeoutMs, 10_000),
  ) => {
    const startedAt = Date.now()
    let stableSince = Date.now()
    let previous: LocalAppChatDomSnapshot | null = null
    while (Date.now() - startedAt < timeoutMs) {
      const current = await readChatDomSnapshot(page)
      const fingerprint = JSON.stringify(current)
      const previousFingerprint = previous ? JSON.stringify(previous) : null
      if (fingerprint !== previousFingerprint)
        stableSince = Date.now()
      if (Date.now() - stableSince >= stableForMs)
        return current
      previous = current
      await wait(100)
    }
    return previous ?? await readChatDomSnapshot(page)
  }

  return {
    async launch() {
      if (!pathExists(executablePath))
        throw new Error(`找不到可执行的本地 App：${executablePath}`)

      // Electron reads this switch before app code starts, so the trial is
      // isolated from the user's normal profile and its database.
      await mkdir(input.args.userDataPath, {
        recursive: true,
        mode: 0o700,
      })
      appProcess = spawn(executablePath, [
        '--user-data-dir',
        input.args.userDataPath,
      ], {
        env: {
          ...process.env,
          ALICIZATION_USER_DATA_PATH: input.args.userDataPath,
          APP_REMOTE_DEBUG: 'true',
          APP_REMOTE_DEBUG_PORT: String(input.args.remoteDebugPort),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      appProcess.stdout.on('data', chunk =>
        processOutput.push(`[stdout] ${String(chunk).trimEnd()}`))
      appProcess.stderr.on('data', chunk =>
        processOutput.push(`[stderr] ${String(chunk).trimEnd()}`))
      return {
        pid: appProcess.pid ?? null,
      }
    },

    async connect() {
      const deadline = Date.now() + input.args.launchTimeoutMs
      let lastError: unknown = null
      while (Date.now() < deadline) {
        try {
          browser = await input.connectOverCDP(endpoint)
          for (const context of browser.contexts()) {
            context.on('page', bindPage)
            for (const page of context.pages())
              bindPage(page)
          }
          return
        }
        catch (error) {
          lastError = error
          await wait(200)
        }
      }
      throw new Error([
        `无法连接 App 远程调试端点：${endpoint}`,
        lastError ? errorMessage(lastError) : '未发现可调试窗口。',
      ].join('\n'))
    },

    async waitForStartup() {
      const page = await mainPage()
      await page.waitForLoadState('domcontentloaded', {
        timeout: input.args.launchTimeoutMs,
      })
      await page.waitForFunction(
        () => {
          const scope = globalThis as unknown as {
            document: {
              readyState: string
              documentElement: {
                dataset: Record<string, string | undefined>
              }
            }
          }
          return scope.document.readyState === 'complete'
            && scope.document.documentElement.dataset.alicizationStagePageReady === 'true'
        },
        undefined,
        { timeout: input.args.launchTimeoutMs },
      )
      const state = await page.evaluate(() => {
        const scope = globalThis as unknown as {
          document: {
            readyState: string
            documentElement: {
              dataset: Record<string, string | undefined>
            }
          }
        }
        return {
          readyState: scope.document.readyState,
          stageReady: scope.document.documentElement.dataset.alicizationStagePageReady === 'true',
        }
      })
      return {
        ...(await summarizePage(page)),
        readyState: state.readyState,
        stageReady: state.stageReady,
      }
    },

    async openChat() {
      const existing = pages().find(page => page.url().includes('#/chat'))
      if (existing)
        return await summarizePage(existing)

      const page = await mainPage()
      const expandButton = page.locator(
        localAppIconButtonXPath('i-solar:alt-arrow-up-line-duotone'),
      )
      await expandButton.click({
        timeout: input.args.launchTimeoutMs,
      })
      const chatButton = page.locator(
        localAppIconButtonXPath('i-solar:chat-line-line-duotone'),
      )
      await chatButton.click({
        timeout: input.args.launchTimeoutMs,
      })
      const chatPage = await waitForPage(
        candidate => candidate.url().includes('#/chat'),
        input.args.launchTimeoutMs,
      )
      await chatPage.waitForLoadState('domcontentloaded', {
        timeout: input.args.launchTimeoutMs,
      })
      return await summarizePage(chatPage)
    },

    async sendChatMessage(message, timeoutMs) {
      const page = await waitForPage(
        candidate => candidate.url().includes('#/chat'),
        input.args.launchTimeoutMs,
      )
      const textarea = page.locator('textarea').last()
      await textarea.waitFor({
        state: 'visible',
        timeout: input.args.launchTimeoutMs,
      })
      // Visible evidence must exclude hidden boot fallbacks and inline scripts.
      const beforeChat = await waitForChatDomStable(page)
      // eslint-disable-next-line unicorn/prefer-dom-node-text-content
      const beforeText = await page.locator('body').innerText()
      const startedAt = Date.now()
      let firstUiChangeMs: number | null = null
      let stableSince: number | null = null
      let previousText = beforeText
      let previousChat = beforeChat
      let runtimeEvidence: LocalAppChatRuntimeEvidence = {
        requestTurnId: null,
        turnId: null,
        accepted: false,
        acceptedAtMs: null,
        streamFinished: false,
        streamFinishedAtMs: null,
        status: null,
        error: null,
      }
      await textarea.fill(message)
      await textarea.press('Enter')

      while (Date.now() - startedAt < timeoutMs) {
        const [bodyText, inputValue, stopVisible, currentChat, runtimeTrace] = await Promise.all([
          // eslint-disable-next-line unicorn/prefer-dom-node-text-content
          page.locator('body').innerText(),
          textarea.inputValue(),
          page
            .locator(localAppIconButtonXPath('i-solar:stop-circle-linear'))
            .isVisible()
            .catch(() => false),
          readChatDomSnapshot(page),
          readRuntimeDebugTrace({
            path: runtimeDebugPath,
            since: startedAt,
          }).catch(() => []),
        ])
        runtimeEvidence = resolveLocalAppChatRuntimeEvidence({
          events: runtimeTrace,
          cardId: input.args.cardId,
          startedAt,
        })
        const changed = bodyText !== beforeText || inputValue !== message || stopVisible
        if (changed && firstUiChangeMs === null)
          firstUiChangeMs = Date.now() - startedAt

        const chatChanged = currentChat.assistantCount !== previousChat.assistantCount
          || currentChat.assistantText !== previousChat.assistantText
          || currentChat.errorCount !== previousChat.errorCount
          || currentChat.errorText !== previousChat.errorText
        if (bodyText !== previousText || chatChanged) {
          previousText = bodyText
          previousChat = currentChat
          stableSince = Date.now()
        }

        const turnState = resolveLocalAppChatTurnState({
          before: beforeChat,
          current: currentChat,
          inputValue,
          stopVisible,
          stableForMs: stableSince === null ? 0 : Date.now() - stableSince,
          runtime: runtimeEvidence,
        })
        if (turnState.status !== 'pending') {
          const finishedAt = Date.now()
          return {
            message,
            status: turnState.status,
            startedAt,
            finishedAt,
            turnId: runtimeEvidence.turnId,
            accepted: runtimeEvidence.accepted,
            acceptedAtMs: runtimeEvidence.acceptedAtMs,
            streamFinished: runtimeEvidence.streamFinished,
            streamFinishedAtMs: runtimeEvidence.streamFinishedAtMs,
            firstUiChangeMs,
            settledMs: finishedAt - startedAt,
            assistantText: currentChat.assistantText,
            visibleText: textTail(bodyText),
            error: turnState.error,
          }
        }

        await wait(200)
      }

      const [visibleText, finalRuntimeTrace] = await Promise.all([
        // eslint-disable-next-line unicorn/prefer-dom-node-text-content
        page.locator('body').innerText(),
        readRuntimeDebugTrace({
          path: runtimeDebugPath,
          since: startedAt,
        }).catch(() => []),
      ])
      runtimeEvidence = resolveLocalAppChatRuntimeEvidence({
        events: finalRuntimeTrace,
        cardId: input.args.cardId,
        startedAt,
      })
      const finishedAt = Date.now()
      let abortAttempted = false
      let abortAccepted: boolean | null = null
      let abortState: AlicizationChatAbortResult['state'] | null = null
      let abortError: string | null = null
      if (runtimeEvidence.turnId && this.abortChat) {
        abortAttempted = true
        try {
          const abortResult = await this.abortChat(
            runtimeEvidence.turnId,
            'blackbox-turn-timeout',
          )
          abortAccepted = abortResult.accepted
          abortState = abortResult.state
        }
        catch (error) {
          abortError = errorMessage(error)
        }
      }
      return {
        message,
        status: 'timed-out',
        startedAt,
        finishedAt,
        turnId: runtimeEvidence.turnId,
        accepted: runtimeEvidence.accepted,
        acceptedAtMs: runtimeEvidence.acceptedAtMs,
        streamFinished: runtimeEvidence.streamFinished,
        streamFinishedAtMs: runtimeEvidence.streamFinishedAtMs,
        abortAttempted,
        abortAccepted,
        abortState,
        firstUiChangeMs,
        settledMs: finishedAt - startedAt,
        assistantText: previousChat.assistantText,
        visibleText: textTail(visibleText),
        error: [
          `等待对话完成超时（${timeoutMs}ms）。`,
          `accepted=${runtimeEvidence.accepted}`,
          `streamFinished=${runtimeEvidence.streamFinished}`,
          runtimeEvidence.turnId ? `turnId=${runtimeEvidence.turnId}` : 'turnId=unknown',
          runtimeEvidence.error ? `runtimeError=${runtimeEvidence.error}` : null,
          abortAttempted ? `abort=${abortState ?? (abortError ? 'failed' : 'unknown')}` : 'abort=not-requested',
          abortError ? `abortError=${abortError}` : null,
        ].filter(Boolean).join(' '),
      }
    },

    async abortChat(turnId, reason) {
      const page = await waitForPage(
        candidate => candidate.url().includes('#/chat'),
        input.args.launchTimeoutMs,
      )
      const request = buildLocalAppChatAbortRequest({
        cardId: input.args.cardId,
        turnId,
        reason,
      })
      return await page.evaluate(async ({ channel, payload }) => {
        const scope = globalThis as unknown as {
          electron?: {
            ipcRenderer?: {
              invoke?: (invokeChannel: string, invokePayload: unknown) => Promise<unknown>
            }
          }
        }
        const invoke = scope.electron?.ipcRenderer?.invoke
        if (typeof invoke !== 'function')
          throw new Error('App renderer 没有暴露 IPC invoke。')
        return await invoke(channel, payload) as AlicizationChatAbortResult
      }, request)
    },

    async openMemoryWorkbench() {
      let settingsPage = pages().find(page => page.url().includes('#/settings'))
      if (!settingsPage) {
        const page = await mainPage()
        const settingsButton = page
          .locator(localAppIconButtonXPath('i-solar:settings-minimalistic-outline'))
          .last()
        await settingsButton.click({
          timeout: input.args.launchTimeoutMs,
        })
        settingsPage = await waitForPage(
          candidate => candidate.url().includes('#/settings'),
          input.args.launchTimeoutMs,
        )
      }
      bindPage(settingsPage)
      await navigateLocalAppPageToHashRoute(
        settingsPage,
        '/settings/modules/memory',
        input.args.launchTimeoutMs,
      )
      return {
        ...(await summarizePage(settingsPage)),
        // eslint-disable-next-line unicorn/prefer-dom-node-text-content
        visibleText: textTail(await settingsPage.locator('body').innerText()),
      }
    },

    async captureScreenshots(outputDir) {
      await mkdir(outputDir, {
        recursive: true,
        mode: 0o700,
      })
      const screenshots: LocalAppBlackboxScreenshotEvidence[] = []
      for (const [index, page] of pages().entries()) {
        const title = await page.title()
        const name = sanitizeArtifactName(
          title || basename(page.url()),
          `window-${index + 1}`,
        )
        const path = join(outputDir, `${index + 1}-${name}.png`)
        await page.screenshot({
          path,
          fullPage: true,
        })
        screenshots.push({
          title,
          url: page.url(),
          path,
        })
      }
      return screenshots
    },

    async collectDiagnostics() {
      return {
        processOutput: [...processOutput],
        rendererConsole: [...rendererConsole],
        pageErrors: [...pageErrors],
      }
    },

    async close() {
      const processToClose = appProcess
      appProcess = null
      const browserToClose = browser
      browser = null

      await browserToClose?.close().catch(() => {})

      if (processToClose && !processToClose.killed)
        processToClose.kill('SIGTERM')
      if (processToClose)
        await waitForLocalAppProcessExit(processToClose)
    },
  }
}

export async function runLocalAppBlackboxTrial(
  input: {
    args: LocalAppBlackboxTrialArgs
  } & LocalAppBlackboxTrialDependencies,
): Promise<LocalAppBlackboxTrialReport> {
  const now = input.now ?? (() => Date.now())
  const writeText = input.writeText ?? (async (path, content) => {
    await writeFile(path, content, {
      encoding: 'utf8',
      mode: 0o600,
    })
  })
  const ensureOutputDir = input.ensureOutputDir ?? (async path => await mkdir(path, {
    recursive: true,
    mode: 0o700,
  }))
  const stages: LocalAppBlackboxStage[] = []
  const chatTurns: LocalAppBlackboxChatTurnEvidence[] = []
  let memoryAssertions: LocalAppBlackboxMemoryAssertions | null = null
  let runtimeDebugTrace: Array<Record<string, unknown>> = []
  let screenshots: LocalAppBlackboxScreenshotEvidence[] = []
  let diagnostics: LocalAppBlackboxDiagnostics = {
    processOutput: [],
    rendererConsole: [],
    pageErrors: [],
  }
  const startedAt = now()

  await ensureOutputDir(input.args.outputDir)

  const stageDetails = (value: unknown): Record<string, unknown> => {
    if (value && typeof value === 'object' && !Array.isArray(value))
      return { ...value }
    return {
      value,
    }
  }

  const recordStage = async (
    id: string,
    action: () => Promise<unknown>,
  ) => {
    const stageStartedAt = now()
    try {
      const details = stageDetails(await action())
      stages.push({
        id,
        status: 'succeeded',
        startedAt: stageStartedAt,
        finishedAt: now(),
        error: null,
        details,
      })
      return true
    }
    catch (error) {
      stages.push({
        id,
        status: 'failed',
        startedAt: stageStartedAt,
        finishedAt: now(),
        error: errorMessage(error),
        details: {},
      })
      return false
    }
  }

  try {
    if (input.args.attachOnly) {
      stages.push({
        id: 'app-launch',
        status: 'not-run',
        startedAt,
        finishedAt: now(),
        error: null,
        details: {
          reason: 'attach-only',
        },
      })
    }
    else {
      await recordStage('app-launch', async () => await input.automation.launch())
    }

    const attached = await recordStage('remote-debug-attach', async () => {
      await input.automation.connect()
      return {
        endpoint: `http://127.0.0.1:${input.args.remoteDebugPort}`,
      }
    })
    if (attached) {
      await recordStage('stage-startup', async () => await input.automation.waitForStartup())
      const chatOpened = await recordStage('chat-window', async () => await input.automation.openChat())
      if (chatOpened) {
        for (const [index, message] of input.args.messages.entries()) {
          const stageId = `chat-message-${index + 1}`
          const stageStartedAt = now()
          try {
            const evidence = await input.automation.sendChatMessage(
              message,
              input.args.turnTimeoutMs,
            )
            chatTurns.push(evidence)
            stages.push({
              id: stageId,
              status: evidence.status === 'completed' ? 'succeeded' : 'failed',
              startedAt: stageStartedAt,
              finishedAt: now(),
              error: evidence.error,
              details: {
                message,
                status: evidence.status,
                accepted: evidence.accepted ?? null,
                acceptedAtMs: evidence.acceptedAtMs ?? null,
                turnId: evidence.turnId ?? null,
                streamFinished: evidence.streamFinished ?? null,
                streamFinishedAtMs: evidence.streamFinishedAtMs ?? null,
                abortAttempted: evidence.abortAttempted ?? null,
                abortAccepted: evidence.abortAccepted ?? null,
                abortState: evidence.abortState ?? null,
                firstUiChangeMs: evidence.firstUiChangeMs,
                settledMs: evidence.settledMs,
                assistantText: evidence.assistantText ?? null,
                visibleText: evidence.visibleText,
              },
            })
          }
          catch (error) {
            const messageText = errorMessage(error)
            chatTurns.push({
              message,
              status: 'failed',
              startedAt: stageStartedAt,
              finishedAt: now(),
              accepted: false,
              acceptedAtMs: null,
              turnId: null,
              streamFinished: false,
              streamFinishedAtMs: null,
              firstUiChangeMs: null,
              settledMs: Math.max(0, now() - stageStartedAt),
              assistantText: '',
              visibleText: '',
              error: messageText,
            })
            stages.push({
              id: stageId,
              status: 'failed',
              startedAt: stageStartedAt,
              finishedAt: now(),
              error: messageText,
              details: {
                message,
                status: 'failed',
                accepted: false,
                acceptedAtMs: null,
                turnId: null,
                streamFinished: false,
                streamFinishedAtMs: null,
              },
            })
          }
        }
      }

      if (input.inspectMemory) {
        await recordStage('memory-closure', async () => {
          const memoryTrace = await input.readRuntimeDebugTrace({
            path: join(input.args.userDataPath, 'alicizations', 'runtime-debug.log'),
            since: startedAt,
          }).catch(() => [])
          const assertions = await input.inspectMemory!({
            userDataPath: input.args.userDataPath,
            cardId: input.args.cardId,
            messages: [...input.args.messages],
            chatTurns: [...chatTurns],
            runtimeDebugTrace: memoryTrace,
          })
          memoryAssertions = assertions
          const assertionErrors = [
            ...assertions.errors,
            ...(assertions.recall.query && !assertions.recall.matched
              ? [`长期记忆召回未命中：${assertions.recall.query}`]
              : []),
            ...(assertions.failureIsolationPassed === false
              ? [`失败对话污染了记忆层：${assertions.failedTurnMemoryLeakCount} 条。`]
              : []),
            ...(assertions.singleSession?.status === 'failed'
              ? assertions.singleSession.errors
              : []),
            ...(assertions.providerRequestAssessment?.passed === false
              ? assertions.providerRequestAssessment.errors
              : []),
            ...(assertions.compression?.passed === false
              ? assertions.compression.errors
              : []),
            ...(assertions.expectationAssessment?.passed === false
              ? assertions.expectationAssessment.errors
              : []),
          ]
          if (assertionErrors.length > 0)
            throw new Error(assertionErrors.join('\n'))
          return {
            cardId: assertions.cardId,
            checkpointCount: assertions.checkpointCount,
            queue: assertions.queue,
            longTerm: assertions.longTerm,
            recallMatched: assertions.recall.matched,
            failureIsolationStatus: assertions.failureIsolationStatus,
            failureIsolationIndeterminateTurnCount: assertions.failureIsolationIndeterminateTurnCount,
            failedTurnMemoryLeakCount: assertions.failedTurnMemoryLeakCount,
            singleSession: assertions.singleSession ?? null,
            providerRequestAssessment: assertions.providerRequestAssessment ?? null,
            compression: assertions.compression ?? null,
            expectationAssessment: assertions.expectationAssessment ?? null,
          }
        })
      }

      if (input.args.openMemoryWorkbench) {
        await recordStage(
          'memory-workbench',
          async () => await input.automation.openMemoryWorkbench(),
        )
      }
      else {
        stages.push({
          id: 'memory-workbench',
          status: 'not-run',
          startedAt: now(),
          finishedAt: now(),
          error: null,
          details: {
            reason: 'disabled',
          },
        })
      }
    }

    await recordStage('runtime-debug-trace', async () => {
      runtimeDebugTrace = await input.readRuntimeDebugTrace({
        path: join(input.args.userDataPath, 'alicizations', 'runtime-debug.log'),
        since: startedAt,
      })
      await writeText(
        join(input.args.outputDir, 'runtime-debug.jsonl'),
        runtimeDebugTrace.map(entry => JSON.stringify(entry)).join('\n')
        + (runtimeDebugTrace.length > 0 ? '\n' : ''),
      )
      return {
        eventCount: runtimeDebugTrace.length,
      }
    })

    if (attached) {
      await recordStage('screenshots', async () => {
        screenshots = await input.automation.captureScreenshots(input.args.outputDir)
        return {
          screenshotCount: screenshots.length,
          paths: screenshots.map(screenshot => screenshot.path),
        }
      })
    }

    diagnostics = await input.automation.collectDiagnostics?.() ?? diagnostics
    await writeText(
      join(input.args.outputDir, 'app-process.log'),
      diagnostics.processOutput.join('\n')
      + (diagnostics.processOutput.length > 0 ? '\n' : ''),
    )
    await writeText(
      join(input.args.outputDir, 'renderer-console.jsonl'),
      diagnostics.rendererConsole.map(entry => JSON.stringify(entry)).join('\n')
      + (diagnostics.rendererConsole.length > 0 ? '\n' : ''),
    )
    await writeText(
      join(input.args.outputDir, 'page-errors.jsonl'),
      diagnostics.pageErrors.map(entry => JSON.stringify(entry)).join('\n')
      + (diagnostics.pageErrors.length > 0 ? '\n' : ''),
    )
  }
  finally {
    if (!input.args.keepOpen)
      await input.automation.close().catch(() => {})
  }

  const finishedAt = now()
  const failedStages = stages.filter(stage => stage.status === 'failed')
  const memoryClosureStage = stages.find(stage => stage.id === 'memory-closure')
  const memoryAssertionPassed = resolveMemoryAssertionPassed({
    memoryAssertions,
    memoryClosureStage,
  })
  const report: LocalAppBlackboxTrialReport = {
    version: 'alicization-local-app-blackbox-trial-v1',
    passed: failedStages.length === 0,
    startedAt,
    finishedAt,
    appPath: input.args.appPath,
    userDataPath: input.args.userDataPath,
    cardId: input.args.cardId,
    outputDir: input.args.outputDir,
    summary: {
      requestedMessageCount: input.args.messages.length,
      completedMessageCount: chatTurns.filter(turn => turn.status === 'completed').length,
      failedMessageCount: chatTurns.filter(turn => turn.status !== 'completed').length,
      runtimeTraceEventCount: runtimeDebugTrace.length,
      screenshotCount: screenshots.length,
      rendererConsoleEventCount: diagnostics.rendererConsole.length,
      pageErrorCount: diagnostics.pageErrors.length,
      memoryAssertionPassed,
      failedStageIds: failedStages.map(stage => stage.id),
      lastError: failedStages.at(-1)?.error ?? null,
    },
    stages,
    chatTurns,
    memoryAssertions,
    runtimeDebugTrace,
    screenshots,
    diagnostics,
  }
  await writeText(
    join(input.args.outputDir, 'report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  )
  return report
}
