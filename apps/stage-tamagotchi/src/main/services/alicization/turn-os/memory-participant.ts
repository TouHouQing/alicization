import type {
  AlicizationRuntimeEventSource,
  AlicizationRuntimeEventType,
} from '@proj-alicization/stage-shared'

import type { WorkingMemoryLongTermQueueItem } from '../life-core/working-memory-long-term-queue'
import type { AlicizationLongTermMemoryRecallProviderEvidence } from '../main-chat-memory-context'
import type { AlicizationRuntimeEventScope } from './event-store'

import { isDeepStrictEqual } from 'node:util'

import { sanitizeAlicizationMemoryEvidenceText } from '@proj-alicization/stage-shared'

import { longTermMemoryEvidenceVersion } from '../long-term-memory-recall'

export interface AlicizationMemoryRuntimeEventInput {
  eventType: AlicizationRuntimeEventType
  payload: unknown
  source: AlicizationRuntimeEventSource
  idempotencyKey: string
}

export interface AlicizationMemoryEventPersistenceFailure {
  eventType: AlicizationRuntimeEventType
  idempotencyKey: string
  error: string
}

export interface AlicizationMemoryWriteProposal {
  version: 'memory-write-proposal-v1'
  status: 'pending'
  scope: AlicizationRuntimeEventScope
  sessionId: string
  items: WorkingMemoryLongTermQueueItem[]
}

export type AlicizationMemoryOwnerSettlementStatus
  = | 'succeeded'
    | 'failed'
    | 'skipped'

export interface AlicizationMemoryOwnerSettlement {
  owner: string
  status: AlicizationMemoryOwnerSettlementStatus
  errorSummary?: string
  reason?: string
}

type MemorySettlementStatus
  = | 'completed'
    | 'provider-failed'
    | 'tool-failed'
    | 'failed'
    | 'cancelled'
    | 'timed-out'

const longTermRecallEvidenceFields = new Set([
  'id',
  'kind',
  'summary',
  'source',
  'scope',
  'provenance',
  'confidence',
  'salience',
  'updatedAt',
  'occurredAt',
  'threadId',
  'threadAnchor',
  'cues',
  'entities',
  'sensitivity',
  'retrievalScore',
  'queryMatches',
  'rankReasons',
  'evidenceVersion',
  'version',
])

const longTermRecallEvidenceKinds = new Set([
  'fact',
  'reflection',
  'episode',
  'consolidation',
])

const longTermRecallEvidenceProvenance = new Set([
  'observed',
  'remembered',
  'dreamt',
  'inferred',
  'reconstructed',
  'shadow',
])

const longTermRecallEvidenceSensitivity = new Set([
  'public',
  'personal',
  'private',
  'secret',
])

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? 'unknown error')
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError(`${label} must be an object`)
  return value as Record<string, unknown>
}

function requiredText(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim())
    throw new TypeError(`${label} must not be empty`)
  return value.trim()
}

function requiredFiniteNumber(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new TypeError(`${label} must be a finite number`)
  return value
}

function requiredProbability(value: unknown, label: string) {
  const probability = requiredFiniteNumber(value, label)
  if (probability < 0 || probability > 1)
    throw new TypeError(`${label} must be between 0 and 1`)
  return probability
}

function requiredBoundedText(
  value: unknown,
  label: string,
  maxChars: number,
) {
  const text = requiredText(value, label)
  if (text.length > maxChars)
    throw new TypeError(`${label} exceeds ${maxChars} characters`)
  return text
}

function requiredCleanMemoryText(
  value: unknown,
  label: string,
  maxChars: number,
) {
  const text = requiredText(value, label)
  const normalized = text.replace(/\s+/gu, ' ').trim()
  const cleaned = sanitizeAlicizationMemoryEvidenceText(
    text,
    maxChars,
    { provenance: 'internal-structured-fact' },
  )
  if (!cleaned || cleaned !== normalized)
    throw new TypeError(`${label} must be cleaned memory evidence text`)
  return cleaned
}

function nullableBoundedText(
  value: unknown,
  label: string,
  maxChars: number,
) {
  if (value === null)
    return null
  return requiredBoundedText(value, label, maxChars)
}

function nullableFiniteNumber(value: unknown, label: string) {
  if (value === null)
    return null
  return requiredFiniteNumber(value, label)
}

function requiredTextArray(value: unknown, label: string) {
  if (!Array.isArray(value))
    throw new TypeError(`${label} must be an array`)
  return value.map((item, index) => requiredText(item, `${label}[${index}]`))
}

function requiredBoundedTextArray(
  value: unknown,
  label: string,
  maxItems: number,
  maxChars: number,
) {
  const items = requiredTextArray(value, label)
  if (items.length > maxItems)
    throw new TypeError(`${label} exceeds ${maxItems} items`)
  return items.map((item, index) =>
    requiredBoundedText(item, `${label}[${index}]`, maxChars))
}

function cloneItems(items: WorkingMemoryLongTermQueueItem[]) {
  return structuredClone(items)
}

function parseLongTermRecallEvidence(
  value: AlicizationLongTermMemoryRecallProviderEvidence,
  index: number,
  participantScope: AlicizationRuntimeEventScope,
) {
  const label = `memory recall evidence[${index}]`
  const record = asRecord(value, label)
  const forbiddenField = Object.keys(record)
    .find(field => !longTermRecallEvidenceFields.has(field))
  if (forbiddenField)
    throw new TypeError(`${label} contains forbidden field ${forbiddenField}`)

  const evidenceScope = asRecord(record.scope, `${label} scope`)
  const forbiddenScopeField = Object.keys(evidenceScope)
    .find(field => field !== 'userId' && field !== 'cardId')
  if (forbiddenScopeField) {
    throw new TypeError(
      `${label} scope contains forbidden field ${forbiddenScopeField}`,
    )
  }
  const userId = requiredText(evidenceScope.userId, `${label} scope.userId`)
  const cardId = requiredText(evidenceScope.cardId, `${label} scope.cardId`)
  if (userId !== participantScope.userId)
    throw new TypeError(`${label} scope.userId must match participant scope`)
  if (cardId !== participantScope.cardId)
    throw new TypeError(`${label} scope.cardId must match participant scope`)

  const kind = requiredText(record.kind, `${label} kind`)
  if (!longTermRecallEvidenceKinds.has(kind))
    throw new TypeError(`${label} kind is unsupported`)
  const provenance = requiredText(record.provenance, `${label} provenance`)
  if (!longTermRecallEvidenceProvenance.has(provenance))
    throw new TypeError(`${label} provenance is unsupported`)
  const sensitivity = record.sensitivity === null
    ? null
    : requiredText(record.sensitivity, `${label} sensitivity`)
  if (
    sensitivity !== null
    && !longTermRecallEvidenceSensitivity.has(sensitivity)
  ) {
    throw new TypeError(`${label} sensitivity is unsupported`)
  }
  const rankReasons = requiredBoundedTextArray(
    record.rankReasons,
    `${label} rankReasons`,
    16,
    160,
  )
  if (rankReasons.length === 0)
    throw new TypeError(`${label} rankReasons must not be empty`)
  const evidenceVersion = requiredText(
    record.evidenceVersion,
    `${label} evidenceVersion`,
  )
  if (evidenceVersion !== longTermMemoryEvidenceVersion)
    throw new TypeError(`${label} evidenceVersion is unsupported`)
  const version = requiredText(record.version, `${label} version`)
  if (version !== longTermMemoryEvidenceVersion)
    throw new TypeError(`${label} version is unsupported`)

  return {
    id: requiredBoundedText(record.id, `${label} id`, 240),
    kind: kind as AlicizationLongTermMemoryRecallProviderEvidence['kind'],
    summary: requiredCleanMemoryText(record.summary, `${label} summary`, 720),
    source: requiredBoundedText(record.source, `${label} source`, 160),
    scope: {
      userId,
      cardId,
    },
    provenance:
      provenance as AlicizationLongTermMemoryRecallProviderEvidence['provenance'],
    confidence: requiredProbability(record.confidence, `${label} confidence`),
    salience: record.salience === null
      ? null
      : requiredProbability(record.salience, `${label} salience`),
    updatedAt: nullableFiniteNumber(record.updatedAt, `${label} updatedAt`),
    occurredAt: nullableFiniteNumber(record.occurredAt, `${label} occurredAt`),
    threadId: nullableBoundedText(record.threadId, `${label} threadId`, 240),
    threadAnchor: nullableBoundedText(
      record.threadAnchor,
      `${label} threadAnchor`,
      360,
    ),
    cues: requiredBoundedTextArray(record.cues, `${label} cues`, 16, 160),
    entities: requiredBoundedTextArray(
      record.entities,
      `${label} entities`,
      16,
      160,
    ),
    sensitivity:
      sensitivity as AlicizationLongTermMemoryRecallProviderEvidence['sensitivity'],
    retrievalScore: requiredFiniteNumber(
      record.retrievalScore,
      `${label} retrievalScore`,
    ),
    queryMatches: requiredBoundedTextArray(
      record.queryMatches,
      `${label} queryMatches`,
      16,
      160,
    ),
    rankReasons,
    evidenceVersion,
    version,
  } satisfies AlicizationLongTermMemoryRecallProviderEvidence
}

function parseMemoryWriteProposal(
  value: AlicizationMemoryWriteProposal,
  participantScope: AlicizationRuntimeEventScope,
) {
  const proposal = asRecord(value, 'memory proposal')
  if (proposal.version !== 'memory-write-proposal-v1')
    throw new TypeError('memory proposal version is unsupported')
  if (proposal.status !== 'pending')
    throw new TypeError('memory proposal status is unsupported')

  const proposalScope = asRecord(proposal.scope, 'memory proposal scope')
  if (
    proposalScope.turnId !== participantScope.turnId
    || proposalScope.cardId !== participantScope.cardId
    || proposalScope.userId !== participantScope.userId
    || proposalScope.conversationId !== participantScope.conversationId
  ) {
    throw new TypeError('memory proposal scope must match participant scope')
  }
  if (!Array.isArray(proposal.items))
    throw new TypeError('memory proposal items must be an array')

  return structuredClone(value)
}

export function createAlicizationMemoryParticipant(options: {
  scope: AlicizationRuntimeEventScope
  appendEvent: (event: AlicizationMemoryRuntimeEventInput) => Promise<void>
  onPersistenceFailure?: (
    failure: AlicizationMemoryEventPersistenceFailure,
  ) => void | Promise<void>
  enqueue?: (input: {
    proposal: AlicizationMemoryWriteProposal
    userId: string
    assistantText: string
  }) => Promise<{
    ownerSettlements: AlicizationMemoryOwnerSettlement[]
  }>
}) {
  const scope = {
    turnId: requiredText(options.scope.turnId, 'memory scope turnId'),
    cardId: requiredText(options.scope.cardId, 'memory scope cardId'),
    userId: requiredText(options.scope.userId, 'memory scope userId'),
    conversationId: requiredText(options.scope.conversationId, 'memory scope conversationId'),
  }

  const appendSafely = async (
    eventType: AlicizationRuntimeEventType,
    payload: unknown,
    idempotencyKey: string,
  ) => {
    try {
      await options.appendEvent({
        eventType,
        payload,
        source: 'memory',
        idempotencyKey,
      })
      return {
        persisted: true as const,
        error: null,
      }
    }
    catch (error) {
      const message = errorMessage(error)
      try {
        await options.onPersistenceFailure?.({
          eventType,
          idempotencyKey,
          error: message,
        })
      }
      catch {
        // Failure reporting must remain secondary to the dialogue owner.
      }
      return {
        persisted: false as const,
        error: message,
      }
    }
  }

  return {
    async recordWorkingMemory(input: {
      sessionId: string
      snapshot: {
        version: string
        updatedAt: number
        compressedTimeline: Array<{
          id: string
          sourceTurnIds: string[]
          summary: string
        }>
        compression: {
          level: string
          sourceTurnIds: string[]
          lastCompressedAt: number | null
        }
      }
    }) {
      const sessionId = requiredText(input.sessionId, 'memory sessionId')
      const compression = structuredClone(input.snapshot.compression)
      const compressedThisTurn = compression.level !== 'none'
        && compression.sourceTurnIds.length > 0
        && compression.lastCompressedAt === input.snapshot.updatedAt
      if (compressedThisTurn) {
        await appendSafely(
          'working_memory.compression.started',
          {
            version: input.snapshot.version,
            sessionId,
            compression,
          },
          `${scope.turnId}:working-memory:compression:started`,
        )
        await appendSafely(
          'working_memory.compression.completed',
          {
            version: input.snapshot.version,
            sessionId,
            compression,
            episodeletCount: input.snapshot.compressedTimeline.length,
          },
          `${scope.turnId}:working-memory:compression:completed`,
        )
      }
      return await appendSafely(
        'working_memory.snapshot.created',
        {
          version: input.snapshot.version,
          sessionId,
          scope,
          compression,
          compressedTimeline: structuredClone(input.snapshot.compressedTimeline),
        },
        `${scope.turnId}:working-memory:snapshot`,
      )
    },

    async recordLongTermRecall(input: {
      sessionId: string
      status: 'recalled' | 'empty' | 'failed'
      evidence: AlicizationLongTermMemoryRecallProviderEvidence[]
      confidence: number
    }) {
      const sessionId = requiredText(input.sessionId, 'memory sessionId')
      const evidence = input.evidence.map((item, index) =>
        parseLongTermRecallEvidence(item, index, scope))
      await appendSafely(
        'long_term_memory.recall.started',
        {
          sessionId,
          scope,
        },
        `${scope.turnId}:long-term-recall:started`,
      )
      if (evidence.length > 0) {
        for (const [index, item] of evidence.entries()) {
          await appendSafely(
            'long_term_memory.recall.evidence',
            item,
            `${scope.turnId}:long-term-recall:evidence:${index}`,
          )
        }
      }
      else {
        await appendSafely(
          'long_term_memory.recall.abstained',
          {
            sessionId,
            scope,
            status: input.status,
          },
          `${scope.turnId}:long-term-recall:abstained`,
        )
      }
      return await appendSafely(
        'long_term_memory.recall.completed',
        {
          sessionId,
          scope,
          status: input.status,
          evidenceCount: evidence.length,
          confidence: input.confidence,
        },
        `${scope.turnId}:long-term-recall:completed`,
      )
    },

    prepareWrite(input: {
      sessionId: string
      items: WorkingMemoryLongTermQueueItem[]
    }): AlicizationMemoryWriteProposal {
      return {
        version: 'memory-write-proposal-v1',
        status: 'pending',
        scope: { ...scope },
        sessionId: requiredText(input.sessionId, 'memory proposal sessionId'),
        items: cloneItems(input.items),
      }
    },

    async settleWrite(input: {
      proposal: AlicizationMemoryWriteProposal
      status: MemorySettlementStatus
      visibleReplyCommitted: boolean
      enqueueItems: WorkingMemoryLongTermQueueItem[]
      assistantText: string
    }) {
      const proposal = parseMemoryWriteProposal(input.proposal, scope)
      const accepted = input.status === 'completed'
        && input.visibleReplyCommitted
      const enqueueItems = cloneItems(input.enqueueItems)
      if (accepted && !isDeepStrictEqual(enqueueItems, proposal.items)) {
        throw new TypeError(
          'memory settlement enqueueItems must match proposal items',
        )
      }
      if (!accepted) {
        return await appendSafely(
          'memory.write.rejected',
          {
            version: proposal.version,
            scope,
            sessionId: proposal.sessionId,
            status: input.status,
            visibleReplyCommitted: input.visibleReplyCommitted,
            itemCount: proposal.items.length,
          },
          `${scope.turnId}:memory-write:rejected`,
        )
      }

      const proposed = await appendSafely(
        'memory.write.proposed',
        {
          version: proposal.version,
          scope,
          sessionId: proposal.sessionId,
          itemCount: proposal.items.length,
          sourceTurnIds: [
            ...new Set(proposal.items.flatMap(item => item.sourceTurnIds)),
          ],
        },
        `${scope.turnId}:memory-write:proposed`,
      )
      if (!proposed.persisted)
        return proposed

      let ownerSettlements: AlicizationMemoryOwnerSettlement[] = []
      if (options.enqueue) {
        try {
          const result = await options.enqueue({
            proposal: {
              ...proposal,
              items: cloneItems(enqueueItems),
            },
            userId: scope.userId,
            assistantText: requiredText(
              input.assistantText,
              'memory settlement assistantText',
            ),
          })
          ownerSettlements = structuredClone(result.ownerSettlements)
        }
        catch (error) {
          return await appendSafely(
            'memory.write.rejected',
            {
              version: proposal.version,
              scope,
              sessionId: proposal.sessionId,
              status: 'memory-write-persistence-failed',
              visibleReplyCommitted: true,
              itemCount: enqueueItems.length,
              sourceTurnIds: [
                ...new Set(enqueueItems.flatMap(item => item.sourceTurnIds)),
              ],
              error: errorMessage(error),
            },
            `${scope.turnId}:memory-write:rejected-after-accept`,
          )
        }
      }
      const unpersistedOwnerSettlements: Array<
        AlicizationMemoryOwnerSettlement & {
          persistenceError: string
        }
      > = []
      for (const [index, settlement] of ownerSettlements.entries()) {
        const persistedSettlement = await appendSafely(
          'memory.owner.settled',
          {
            version: proposal.version,
            scope,
            sessionId: proposal.sessionId,
            ...settlement,
          },
          `${scope.turnId}:memory-owner:${settlement.owner}:${index}`,
        )
        if (!persistedSettlement.persisted) {
          unpersistedOwnerSettlements.push({
            ...settlement,
            persistenceError: persistedSettlement.error,
          })
        }
      }
      const failedOwnerCount = ownerSettlements.filter(
        settlement => settlement.status === 'failed',
      ).length
      const settlementEventFailureCount = unpersistedOwnerSettlements.length
      return await appendSafely(
        'memory.write.accepted',
        {
          version: proposal.version,
          scope,
          sessionId: proposal.sessionId,
          visibleReplyCommitted: true,
          outcome: failedOwnerCount === 0 && settlementEventFailureCount === 0
            ? 'completed'
            : failedOwnerCount === ownerSettlements.length
              && settlementEventFailureCount === 0
              ? 'failed'
              : 'partial',
          itemCount: enqueueItems.length,
          sourceTurnIds: [
            ...new Set(enqueueItems.flatMap(item => item.sourceTurnIds)),
          ],
          ownerCount: ownerSettlements.length,
          failedOwnerCount,
          settlementEventFailureCount,
          unpersistedOwnerSettlements,
        },
        `${scope.turnId}:memory-write:accepted`,
      )
    },
  }
}
