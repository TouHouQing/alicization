import type { WorkingMemoryOwnerContext } from './life-core/working-memory-owner-context'
import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'

import { sanitizeAlicizationMemoryEvidenceText } from '@proj-alicization/stage-shared'

export interface AlicizationWorkingMemoryProviderContext {
  version: 'working-memory-owner-context-v1'
  owner: 'working-memory'
  scope: WorkingMemoryOwnerContext['scope']
  current: WorkingMemoryOwnerContext['current']
  obligations: string[]
  queryHints: string[]
  audit: WorkingMemoryOwnerContext['audit']
}

export interface AlicizationLongTermMemoryRecallProviderContext
  extends LongTermMemoryEvidenceBundle {
  owner: 'long-term-memory-recall'
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
    current: context.current,
    obligations: context.obligations,
    queryHints: context.queryHints,
    audit: context.audit,
  }
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

function sanitizeLongTermRecallEvidence(
  item: LongTermMemoryEvidenceBundle['evidence'][number],
) {
  const summary = sanitizeAlicizationMemoryEvidenceText(item.candidate.summary, 360)
  if (!summary)
    return null

  const sanitizeList = (values: string[] | null | undefined, maxItems: number, maxChars: number) =>
    (values ?? [])
      .map(value => sanitizeAlicizationMemoryEvidenceText(value, maxChars))
      .filter(Boolean)
      .slice(0, maxItems)

  return {
    ...item,
    candidate: {
      ...item.candidate,
      summary,
      source: sanitizeAlicizationMemoryEvidenceText(item.candidate.source, 120) || 'memory',
      threadAnchor: sanitizeAlicizationMemoryEvidenceText(item.candidate.threadAnchor, 180) || null,
      cues: sanitizeList(item.candidate.cues, 12, 120),
      entities: sanitizeList(item.candidate.entities, 12, 120),
    },
    queryMatches: sanitizeList(item.queryMatches, 12, 140),
    rankReasons: sanitizeList(item.rankReasons, 12, 180),
  } satisfies LongTermMemoryEvidenceBundle['evidence'][number]
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
  const cloned = structuredClone(context) as AlicizationLongTermMemoryRecallProviderContext
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
    normalizedItem.candidate.id = id
    evidence.push(normalizedItem)
    if (evidence.length >= 16)
      break
  }

  cloned.owner = 'long-term-memory-recall'
  cloned.evidence = evidence
  return cloned
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
    ? longTermRecall.evidence.map(item => item.candidate.id)
    : []
  const providerSystemBlock = JSON.stringify({
    type: 'alicization-turn-memory-context',
    version,
    workingMemory,
    longTermRecall,
  })

  return {
    version,
    workingMemory,
    longTermRecall,
    availableLongTermEvidenceIds,
    providerSystemBlock,
  }
}
