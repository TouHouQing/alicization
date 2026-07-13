import type { WorkingMemoryOwnerContext } from './life-core/working-memory-owner-context'
import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'

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
    const id = normalizeAvailableLongTermEvidenceId(item.candidate.id)
    if (!id || seen.has(id))
      continue

    seen.add(id)
    item.candidate.id = id
    evidence.push(item)
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
