import type { WorkingMemoryOwnerContext } from './life-core/working-memory-owner-context'
import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'

import { sanitizeAlicizationMemoryEvidenceText } from '@proj-alicization/stage-shared'

export interface AlicizationWorkingMemoryProviderContext {
  version: 'working-memory-owner-context-v1'
  owner: 'working-memory'
  scope: WorkingMemoryOwnerContext['scope']
  current: Pick<
    WorkingMemoryOwnerContext['current'],
    'threadTitle' | 'currentUserMove' | 'activeTask' | 'taskStatus'
  >
  rememberedItems: string[]
}

export interface AlicizationLongTermMemoryRecallProviderEvidence {
  id: string
  kind: LongTermMemoryEvidenceBundle['evidence'][number]['candidate']['kind']
  summary: string
  source: string
  confidence: number
  salience: number | null
  updatedAt: number | null
  occurredAt: number | null
  threadId: string | null
  threadAnchor: string | null
  cues: string[]
  entities: string[]
  sensitivity: LongTermMemoryEvidenceBundle['evidence'][number]['candidate']['sensitivity']
  retrievalScore: number
}

export interface AlicizationLongTermMemoryRecallProviderContext {
  owner: 'long-term-memory-recall'
  status: 'recalled' | 'empty'
  confidence: number
  evidence: AlicizationLongTermMemoryRecallProviderEvidence[]
}

export interface AlicizationMainChatMemoryContext {
  version: 'alicization-main-chat-memory-context-v1'
  workingMemory: AlicizationWorkingMemoryProviderContext
  longTermRecall: AlicizationLongTermMemoryRecallProviderContext | null
  availableLongTermEvidenceIds: string[]
  providerSystemBlock: string
}

function projectProviderWorkingMemory(
  context: WorkingMemoryOwnerContext,
): AlicizationWorkingMemoryProviderContext {
  return {
    version: context.version,
    owner: context.owner,
    scope: context.scope,
    current: {
      threadTitle: sanitizeProviderMemoryFactText(context.current.threadTitle, 220) || null,
      currentUserMove: normalizeProviderCurrentUserMove(context.current.currentUserMove),
      activeTask: sanitizeProviderMemoryFactText(context.current.activeTask, 220) || null,
      taskStatus: context.current.taskStatus,
    },
    rememberedItems: context.obligations
      .map(normalizeProviderWorkingMemoryLine)
      .map(value => sanitizeProviderMemoryFactText(value, 260))
      .filter(Boolean),
  }
}

function normalizeProviderCurrentUserMove(raw: unknown) {
  if (typeof raw !== 'string')
    return null
  return raw.trim().replace(/\s+/gu, ' ').slice(0, 360).trim() || null
}

function normalizeProviderWorkingMemoryLine(raw: string) {
  return raw
    .trim()
    .replace(/^(?:respect_correction\([^)]*\):|answer_unresolved_question:|honor_commitment:|carry_task\([^)]*\):|hold_thread:|carry_execution:|failure_audit_only:)\s*/u, '')
    .trim()
}

function normalizeAvailableLongTermEvidenceId(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim()
}

function isProviderEligibleReviewStatus(reviewStatus: unknown) {
  // Durable fact/episode/consolidation sources predate reviewStatus; review queues always set it explicitly.
  return reviewStatus == null || reviewStatus === 'confirmed'
}

function containsRetiredMemoryGovernanceResidue(raw: string) {
  return /(?:^|[\s|;])(?:opening_policy|relationship_cadence|project_state|projectstate|continuity_hold|continuity_drift_risk|emotional_closure)\s*=/iu.test(raw)
    || /visibility\s*=\s*redacted_internal/iu.test(raw)
}

function sanitizeProviderMemoryFactText(raw: unknown, maxChars: number) {
  const sanitized = sanitizeAlicizationMemoryEvidenceText(raw, maxChars)
  return sanitized && !containsRetiredMemoryGovernanceResidue(sanitized)
    ? sanitized
    : ''
}

function finiteNumberOrNull(raw: unknown) {
  return Number.isFinite(raw) ? Number(raw) : null
}

function clamp01(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, value))
}

function sanitizeLongTermRecallEvidence(
  item: LongTermMemoryEvidenceBundle['evidence'][number],
) {
  const summary = sanitizeAlicizationMemoryEvidenceText(item.candidate.summary, 360)
  if (!summary || containsRetiredMemoryGovernanceResidue(summary))
    return null

  const sanitizeList = (values: string[] | null | undefined, maxItems: number, maxChars: number) =>
    (values ?? [])
      .map(value => sanitizeAlicizationMemoryEvidenceText(value, maxChars))
      .filter(Boolean)
      .slice(0, maxItems)

  return {
    id: normalizeAvailableLongTermEvidenceId(item.candidate.id),
    kind: item.candidate.kind,
    summary,
    source: sanitizeAlicizationMemoryEvidenceText(item.candidate.source, 120) || 'memory',
    confidence: clamp01(item.candidate.confidence),
    salience: finiteNumberOrNull(item.candidate.salience),
    updatedAt: finiteNumberOrNull(item.candidate.updatedAt),
    occurredAt: finiteNumberOrNull(item.candidate.occurredAt),
    threadId: sanitizeAlicizationMemoryEvidenceText(item.candidate.threadId, 160) || null,
    threadAnchor: sanitizeAlicizationMemoryEvidenceText(item.candidate.threadAnchor, 180) || null,
    cues: sanitizeList(item.candidate.cues, 12, 120),
    entities: sanitizeList(item.candidate.entities, 12, 120),
    sensitivity: item.candidate.sensitivity ?? null,
    retrievalScore: clamp01(item.score),
  } satisfies AlicizationLongTermMemoryRecallProviderEvidence
}

function normalizeWorkingMemoryProviderContext(
  context: WorkingMemoryOwnerContext,
): AlicizationWorkingMemoryProviderContext {
  const cloned = structuredClone(context)

  return projectProviderWorkingMemory(cloned)
}

function normalizeLongTermRecallProviderContext(
  context: LongTermMemoryEvidenceBundle,
): AlicizationLongTermMemoryRecallProviderContext {
  const cloned = structuredClone(context)
  const evidence: AlicizationLongTermMemoryRecallProviderContext['evidence'] = []
  const seen = new Set<string>()

  for (const item of cloned.evidence) {
    if (!isProviderEligibleReviewStatus(item.candidate.reviewStatus))
      continue

    const id = normalizeAvailableLongTermEvidenceId(item.candidate.id)
    if (!id || seen.has(id))
      continue
    const normalizedItem = sanitizeLongTermRecallEvidence(item)
    if (!normalizedItem)
      continue

    seen.add(id)
    normalizedItem.id = id
    evidence.push(normalizedItem)
    if (evidence.length >= 16)
      break
  }

  return {
    owner: 'long-term-memory-recall',
    status: evidence.length > 0 ? 'recalled' : 'empty',
    confidence: clamp01(cloned.confidence),
    evidence,
  }
}

export function buildAlicizationMainChatMemoryContext(input: {
  workingMemory: WorkingMemoryOwnerContext
  longTermRecall: LongTermMemoryEvidenceBundle | null
}): AlicizationMainChatMemoryContext {
  const version = 'alicization-main-chat-memory-context-v1'
  const workingMemory = normalizeWorkingMemoryProviderContext(input.workingMemory)
  const longTermRecall = input.longTermRecall
    ? normalizeLongTermRecallProviderContext(input.longTermRecall)
    : null
  const availableLongTermEvidenceIds = longTermRecall
    ? longTermRecall.evidence.map(item => item.id)
    : []
  const providerSystemBlock = JSON.stringify({
    type: 'alicization-turn-memory-context',
    data: {
      version,
      workingMemory,
      longTermRecall,
    },
  })

  return {
    version,
    workingMemory,
    longTermRecall,
    availableLongTermEvidenceIds,
    providerSystemBlock,
  }
}
