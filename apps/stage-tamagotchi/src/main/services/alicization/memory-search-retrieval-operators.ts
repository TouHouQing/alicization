import type {
  AlicizationEpisodicEventRecord,
  AlicizationHostPersonModelSnapshot,
  AlicizationMemoryProvenance,
  AlicizationRecallGovernorSnapshot,
} from '../../../shared/eventa'
import type {
  AlicizationProceduralMemoryAbstraction,
} from './memory-procedural-abstraction'
import type {
  AlicizationMemoryRecollectionWindow,
} from './memory-recollection-windows'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import type { AlicizationRelationshipDynamicsState } from './relationship-dynamics-state'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import { buildProceduralMemoryAbstractions } from './memory-procedural-abstraction'
import { buildMemoryRecollectionWindows } from './memory-recollection-windows'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 6) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value)
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

const relationshipCuePattern = /relationship|bond|trust|care|boundary|space|repair|tone|distance|靠近|关系|信任|边界|空间|修复|语气|距离/u

export interface AlicizationRelationshipLineCandidate {
  id: string
  line: string
  sourceKind: 'episode' | 'consolidation' | 'conversation'
  sourceId: string
  provenance: AlicizationMemoryProvenance
  confidence: number
  cues: string[]
}

export interface AlicizationReconstructionCandidate {
  id: string
  summary: string
  provenance: AlicizationMemoryProvenance
  sourceKind: 'episode' | 'conversation' | 'cluster'
  sourceId: string
  confidence: number
  reason?: string | null
}

export interface AlicizationReconstructionAmbiguityPass {
  candidates: AlicizationReconstructionCandidate[]
  stableCore: string[]
  unsafeDetails: string[]
}

export interface AlicizationMemorySearchSnapshot {
  hostAttitude: string
  coreIncarnation: string
  activeThoughts: OrganicMemoryPromptContext['activeThoughts']
}

export interface AlicizationMemorySearchPreludeAccess {
  getOrganicMemorySnapshot: () => Promise<AlicizationMemorySearchSnapshot>
  getLatestRelationshipDynamics: () => Promise<OrganicMemoryPromptContext['relationshipDynamics']>
  retrieveMemoryFacts: (recallSeed: string, limit: number) => Promise<OrganicMemoryPromptContext['retrievedFacts']>
  recallSubconsciousFragmentsWithGovernor: (input: {
    text: string
    recalledFragmentCap?: number
    recalledFragmentSourceBudget?: AlicizationRecallGovernorSnapshot['recalledFragmentSourceBudget']
  }) => Promise<OrganicMemoryPromptContext['recalledFragments']>
  recallEpisodicEventsWithGovernor: (input: {
    recallSeed: string
    sessionId?: string | null
    turnId?: string | null
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
  }) => Promise<AlicizationEpisodicEventRecord[]>
  buildHostPersonModel: (input?: {
    now?: number
  }) => Promise<AlicizationHostPersonModelSnapshot | null>
  getMemoryTuningAdvice?: () => Promise<AlicizationMemoryTuningAdvice | null>
}

export interface AlicizationMemorySearchPolicyAccess {
  planRecollectionIntent?: (input: {
    recallSeed: string
    heuristicIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
    hostAttitude: string
    activeThoughts: OrganicMemoryPromptContext['activeThoughts']
    hostPersonModel?: OrganicMemoryPromptContext['hostPersonModel']
    relationshipDynamics?: OrganicMemoryPromptContext['relationshipDynamics']
  }) => Promise<OrganicMemoryPromptContext['recollectionIntent'] | null>
  deriveSceneTriggeredRecollectionIntent: (input: {
    recallSeed: string
    recalledEpisodes: AlicizationEpisodicEventRecord[]
  }) => OrganicMemoryPromptContext['recollectionIntent'] | null
  isPersonaResidueMemoryText: (text: string) => boolean
}

export interface AlicizationMemorySearchPreludeInput {
  access: AlicizationMemorySearchPreludeAccess
  policy: AlicizationMemorySearchPolicyAccess
  recallSeed?: string
  recallGovernor?: AlicizationRecallGovernorSnapshot | null
  sessionId?: string | null
  turnId?: string | null
}

export interface AlicizationMemorySearchPreludeResult {
  snapshot: AlicizationMemorySearchSnapshot
  relationshipDynamics: AlicizationRelationshipDynamicsState | null
  hostPersonModel: AlicizationHostPersonModelSnapshot | null
  recallSeed: string
  heuristicRecollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  retrievedFacts: OrganicMemoryPromptContext['retrievedFacts']
  recalledFragments: OrganicMemoryPromptContext['recalledFragments']
  recalledEpisodes: AlicizationEpisodicEventRecord[]
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  activeRecollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']> | null
  memoryTuningAdvice: AlicizationMemoryTuningAdvice | null
}

export async function resolveMemorySearchPrelude(
  input: AlicizationMemorySearchPreludeInput,
): Promise<AlicizationMemorySearchPreludeResult> {
  const snapshot = await input.access.getOrganicMemorySnapshot()
  const [relationshipDynamics, hostPersonModel] = await Promise.all([
    input.access.getLatestRelationshipDynamics(),
    input.access.buildHostPersonModel().catch(() => null),
  ])
  const memoryTuningAdvice = await input.access.getMemoryTuningAdvice?.().catch(() => null) ?? null
  const recallSeed = input.recallGovernor?.recallSeed || input.recallSeed || ''
  const heuristicRecollectionIntent = input.recallGovernor?.recollectionIntent ?? null
  const retrievedFacts = recallSeed
    ? await input.access.retrieveMemoryFacts(recallSeed, 4)
    : []
  const allowRecalledFragments = input.recallGovernor
    ? input.recallGovernor.allowRecalledFragments === true
    : Boolean(recallSeed)
  const recalledFragments = allowRecalledFragments && recallSeed
    ? (
        await input.access.recallSubconsciousFragmentsWithGovernor({
          text: recallSeed,
          recalledFragmentCap: input.recallGovernor?.recalledFragmentCap,
          recalledFragmentSourceBudget: input.recallGovernor?.recalledFragmentSourceBudget ?? [],
        })
      ).filter(fragment => !input.policy.isPersonaResidueMemoryText(fragment.text))
    : []
  const plannedRecollectionIntent = recallSeed && input.policy.planRecollectionIntent
    ? await input.policy.planRecollectionIntent({
        recallSeed,
        heuristicIntent: heuristicRecollectionIntent,
        recallGovernor: input.recallGovernor ?? null,
        hostAttitude: relationshipDynamics?.hostAttitude || snapshot.hostAttitude,
        activeThoughts: snapshot.activeThoughts,
        hostPersonModel,
        relationshipDynamics,
      }).catch(() => null)
    : null
  const preliminaryRecollectionIntent = plannedRecollectionIntent ?? heuristicRecollectionIntent ?? null
  const preliminaryActiveRecollectionIntent = preliminaryRecollectionIntent?.mode && preliminaryRecollectionIntent.mode !== 'none'
    ? preliminaryRecollectionIntent
    : null
  const recalledEpisodes = allowRecalledFragments && recallSeed
    ? await input.access.recallEpisodicEventsWithGovernor({
        recallSeed,
        sessionId: input.sessionId ?? null,
        turnId: input.turnId ?? null,
        recallGovernor: input.recallGovernor ?? null,
      })
    : []
  const sceneTriggeredRecollectionIntent = !preliminaryActiveRecollectionIntent && recallSeed
    ? input.policy.deriveSceneTriggeredRecollectionIntent({
        recallSeed,
        recalledEpisodes,
      })
    : null
  const recollectionIntent = (() => {
    const resolved = plannedRecollectionIntent ?? heuristicRecollectionIntent ?? sceneTriggeredRecollectionIntent ?? null
    if (!resolved)
      return null
    if (resolved.recollectionAgenda)
      return resolved
    const fallbackAgenda = heuristicRecollectionIntent?.recollectionAgenda ?? sceneTriggeredRecollectionIntent?.recollectionAgenda ?? null
    return fallbackAgenda
      ? {
          ...resolved,
          recollectionAgenda: fallbackAgenda,
        }
      : resolved
  })()
  const activeRecollectionIntent = recollectionIntent?.mode && recollectionIntent.mode !== 'none'
    ? recollectionIntent
    : null

  return {
    snapshot,
    relationshipDynamics: relationshipDynamics ?? null,
    hostPersonModel,
    recallSeed,
    heuristicRecollectionIntent,
    retrievedFacts,
    recalledFragments,
    recalledEpisodes,
    recollectionIntent,
    activeRecollectionIntent,
    memoryTuningAdvice,
  }
}

export interface AlicizationMemorySearchCandidateAccess {
  recallConversationHistory: (input: {
    query: string
    limit?: number
    recollectionIntent?: AlicizationRecallGovernorSnapshot['recollectionIntent'] | null
  }) => Promise<Array<{
    turnId: string | null
    sessionId: string
    userText: string
    assistantText: string
    createdAt: number
  }>>
  recallMemoryConsolidations: (input: {
    query: string
    limit?: number
    recollectionIntent?: AlicizationRecallGovernorSnapshot['recollectionIntent'] | null
  }) => Promise<NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>>
}

export interface AlicizationMemorySearchCandidateInput {
  access: AlicizationMemorySearchCandidateAccess
  recallSeed: string
  recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']> | null
  recalledEpisodes: AlicizationEpisodicEventRecord[]
}

export interface AlicizationMemorySearchCandidateResult {
  retrospectiveRecall: boolean
  recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
  recollectedWindows: AlicizationMemoryRecollectionWindow[]
  proceduralMemories: AlicizationProceduralMemoryAbstraction[]
  relationshipLineCandidates: AlicizationRelationshipLineCandidate[]
}

export async function retrieveMemorySearchCandidates(
  input: AlicizationMemorySearchCandidateInput,
): Promise<AlicizationMemorySearchCandidateResult> {
  const retrospectiveRecall = Boolean(input.recollectionIntent?.searchConversations === true)
  const recalledConversationHistory = retrospectiveRecall
    ? (
        await input.access.recallConversationHistory({
          query: input.recallSeed,
          limit: input.recollectionIntent?.temporalFocus === 'cross-session' ? 8 : 6,
          recollectionIntent: input.recollectionIntent,
        })
      ).map(item => ({
        ...item,
        provenance: 'reconstructed' as const,
      }))
    : []
  const consolidatedMemories = input.recollectionIntent
    ? await input.access.recallMemoryConsolidations({
        query: input.recallSeed,
        limit: input.recollectionIntent.temporalFocus === 'cross-session' ? 6 : 4,
        recollectionIntent: input.recollectionIntent,
      })
    : []
  const recollectedWindows = buildMemoryRecollectionWindows({
    intent: input.recollectionIntent,
    episodes: input.recalledEpisodes,
    conversationHistory: recalledConversationHistory,
  })
  const proceduralMemories = buildProceduralMemoryAbstractions({
    intent: input.recollectionIntent,
    episodes: input.recalledEpisodes,
  })

  return {
    retrospectiveRecall,
    recalledConversationHistory,
    consolidatedMemories,
    recollectedWindows,
    proceduralMemories,
    relationshipLineCandidates: retrieveRelationshipLineCandidates({
      recollectionIntent: input.recollectionIntent,
      recalledEpisodes: input.recalledEpisodes,
      consolidatedMemories,
      recalledConversationHistory,
    }),
  }
}

export function retrieveRelationshipLineCandidates(input: {
  recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']> | null
  recalledEpisodes: AlicizationEpisodicEventRecord[]
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
  recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
}): AlicizationRelationshipLineCandidate[] {
  const candidates: AlicizationRelationshipLineCandidate[] = []

  for (const episode of input.recalledEpisodes) {
    const provenance = episode.latestReconsolidation?.provenance ?? episode.provenance
    for (const line of uniqueList([episode.relationshipMeaning, episode.lesson], 2)) {
      candidates.push({
        id: `episode:${episode.id}:${line}`,
        line,
        sourceKind: 'episode',
        sourceId: episode.id,
        provenance,
        confidence: clamp01(episode.confidence * 0.72 + episode.salience * 0.18 + (input.recollectionIntent?.mode === 'relationship-history' ? 0.1 : 0)),
        cues: uniqueList([
          episode.threadAnchor,
          episode.whereSummary,
          ...episode.tags,
          ...episode.emotionTags,
        ], 5),
      })
    }
  }

  for (const consolidation of input.consolidatedMemories) {
    for (const line of uniqueList([consolidation.lesson], 1)) {
      candidates.push({
        id: `consolidation:${consolidation.id}:${line}`,
        line,
        sourceKind: 'consolidation',
        sourceId: consolidation.id,
        provenance: consolidation.dominantProvenance,
        confidence: clamp01(consolidation.confidence * 0.76 + (consolidation.facet === 'relationship-era' ? 0.14 : 0)),
        cues: uniqueList([
          consolidation.summary,
          ...consolidation.cues,
        ], 5),
      })
    }
  }

  if (input.recollectionIntent?.mode === 'relationship-history') {
    for (const turn of input.recalledConversationHistory.slice(0, 4)) {
      const text = [turn.userText, turn.assistantText].filter(Boolean).join(' ')
      if (!relationshipCuePattern.test(text))
        continue
      const line = sanitizeText(turn.assistantText || turn.userText, 180)
      if (!line)
        continue
      candidates.push({
        id: `conversation:${turn.turnId ?? `${turn.sessionId}:${turn.createdAt}`}`,
        line,
        sourceKind: 'conversation',
        sourceId: turn.turnId ?? `${turn.sessionId}:${turn.createdAt}`,
        provenance: turn.provenance,
        confidence: 0.52,
        cues: uniqueList([turn.userText, turn.assistantText], 3),
      })
    }
  }

  const deduped = new Map<string, AlicizationRelationshipLineCandidate>()
  for (const candidate of candidates) {
    const key = candidate.line.toLowerCase()
    const existing = deduped.get(key)
    if (!existing) {
      deduped.set(key, candidate)
      continue
    }
    deduped.set(key, {
      ...existing,
      confidence: Math.max(existing.confidence, candidate.confidence),
      cues: uniqueList([...existing.cues, ...candidate.cues], 6),
    })
  }

  return [...deduped.values()]
    .sort((left, right) => {
      if (left.confidence !== right.confidence)
        return right.confidence - left.confidence
      return right.cues.length - left.cues.length
    })
    .slice(0, 6)
}

export function runReconstructionAmbiguityRetrievalPass(input: {
  episodes: AlicizationEpisodicEventRecord[]
  recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
  competingVariants?: Array<{ id: string, summary: string, reason: string }>
}): AlicizationReconstructionAmbiguityPass {
  const candidates: AlicizationReconstructionCandidate[] = []

  for (const episode of input.episodes) {
    const provenance = episode.latestReconsolidation?.provenance ?? episode.provenance
    if (provenance !== 'reconstructed' && provenance !== 'dreamt' && provenance !== 'inferred')
      continue
    candidates.push({
      id: episode.id,
      summary: episode.whatHappened,
      provenance,
      sourceKind: 'episode',
      sourceId: episode.id,
      confidence: clamp01(episode.confidence * 0.74 + episode.salience * 0.12),
      reason: episode.latestReconsolidation?.reason ?? null,
    })
  }

  for (const turn of input.recalledConversationHistory.slice(0, 4)) {
    candidates.push({
      id: `conversation:${turn.turnId ?? `${turn.sessionId}:${turn.createdAt}`}`,
      summary: sanitizeText([turn.userText, turn.assistantText].filter(Boolean).join(' | '), 220),
      provenance: turn.provenance,
      sourceKind: 'conversation',
      sourceId: turn.turnId ?? `${turn.sessionId}:${turn.createdAt}`,
      confidence: 0.42,
      reason: 'Recalled conversation history is reconstructed from retrieved turns rather than observed live.',
    })
  }

  for (const variant of input.competingVariants ?? []) {
    candidates.push({
      id: variant.id,
      summary: variant.summary,
      provenance: 'reconstructed',
      sourceKind: 'cluster',
      sourceId: variant.id,
      confidence: 0.38,
      reason: variant.reason,
    })
  }

  const deduped = new Map<string, AlicizationReconstructionCandidate>()
  for (const candidate of candidates) {
    const key = `${candidate.sourceKind}:${candidate.sourceId}:${candidate.summary}:${candidate.provenance}`.toLowerCase()
    const existing = deduped.get(key)
    if (!existing || candidate.confidence > existing.confidence)
      deduped.set(key, candidate)
  }

  const dedupedCandidates = [...deduped.values()]

  const stableCore = uniqueList(input.episodes.flatMap(item => [item.relationshipMeaning, item.lesson, item.threadAnchor]), 6)
  const unsafeDetails = uniqueList(dedupedCandidates.flatMap(item => [item.summary, item.reason]), 6)

  return {
    candidates: dedupedCandidates.slice(0, 8),
    stableCore,
    unsafeDetails,
  }
}
