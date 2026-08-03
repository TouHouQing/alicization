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
  compressedTimeline: Array<{
    summary: string
    thread: string | null
    sourceTurnIds: string[]
    commitments: string[]
    corrections: string[]
  }>
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
    compressedTimeline: projectProviderCompressedTimeline(context),
    rememberedItems: context.obligations
      .map(normalizeProviderWorkingMemoryLine)
      .map(value => sanitizeProviderMemoryFactText(value, 260))
      .filter(Boolean),
  }
}

function projectProviderCompressedTimeline(context: WorkingMemoryOwnerContext): AlicizationWorkingMemoryProviderContext['compressedTimeline'] {
  return context.compressedTimeline
    .slice(-6)
    .map((episodelet) => {
      const summary = sanitizeProviderMemoryFactText(episodelet.summary, 520)
      const sanitizeList = (values: string[], maxItems: number, maxChars: number) =>
        values
          .map(value => sanitizeProviderMemoryFactText(value, maxChars))
          .filter(Boolean)
          .slice(0, maxItems)

      return {
        summary,
        thread: sanitizeProviderMemoryFactText(episodelet.thread, 220) || null,
        sourceTurnIds: episodelet.sourceTurnIds
          .map(value => sanitizeProviderMemoryFactText(value, 120))
          .filter(Boolean)
          .slice(0, 24),
        commitments: sanitizeList(episodelet.commitments, 4, 220),
        corrections: sanitizeList(episodelet.corrections, 4, 220),
      }
    })
    .filter(episodelet => episodelet.summary || episodelet.commitments.length > 0 || episodelet.corrections.length > 0)
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

function sanitizeProviderMemoryFactText(raw: unknown, maxChars: number) {
  return sanitizeAlicizationMemoryEvidenceText(raw, maxChars, {
    provenance: 'internal-structured-fact',
  })
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
  const userAuthoredEvidence = item.candidate.origin === 'user-turn'
    || item.candidate.source === 'user-turn'
  const sanitizerContext = userAuthoredEvidence
    ? {
        origin: item.candidate.origin,
        source: item.candidate.source,
      }
    : {
        provenance: 'internal-structured-fact',
      }
  const summary = sanitizeAlicizationMemoryEvidenceText(
    item.candidate.summary,
    360,
    sanitizerContext,
  )
  if (!summary)
    return null

  const sanitizeList = (values: string[] | null | undefined, maxItems: number, maxChars: number) =>
    (values ?? [])
      .map(value => sanitizeAlicizationMemoryEvidenceText(value, maxChars, sanitizerContext))
      .filter(Boolean)
      .slice(0, maxItems)

  return {
    id: normalizeAvailableLongTermEvidenceId(item.candidate.id),
    kind: item.candidate.kind,
    summary,
    source: sanitizeAlicizationMemoryEvidenceText(item.candidate.source, 120, sanitizerContext) || 'memory',
    confidence: clamp01(item.candidate.confidence),
    salience: finiteNumberOrNull(item.candidate.salience),
    updatedAt: finiteNumberOrNull(item.candidate.updatedAt),
    occurredAt: finiteNumberOrNull(item.candidate.occurredAt),
    threadId: sanitizeAlicizationMemoryEvidenceText(item.candidate.threadId, 160, sanitizerContext) || null,
    threadAnchor: sanitizeAlicizationMemoryEvidenceText(item.candidate.threadAnchor, 180, sanitizerContext) || null,
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
