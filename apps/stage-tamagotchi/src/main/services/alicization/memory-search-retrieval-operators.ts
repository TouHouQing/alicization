import type {
  AlicizationEpisodicEventRecord,
  AlicizationHostPersonModelSnapshot,
  AlicizationMemoryProvenance,
  AlicizationRecallGovernorSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationTurnRetrievalPolicySnapshot } from './memory-accessibility-runtime'
import type {
  AlicizationProceduralMemoryAbstraction,
} from './memory-procedural-abstraction'
import type {
  AlicizationMemoryRecollectionWindow,
} from './memory-recollection-windows'
import type { AlicizationMemoryRetrievalBudgetClass } from './memory-retrieval-telemetry'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import type { AlicizationRelationshipDynamicsState } from './relationship-dynamics-state'
import type { OrganicMemoryPromptContext, OrganicMemoryRecollectionCarry } from './runtime-soul'

import {
  alicizationFixedTemplateReplacement,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { rankFactsByLearningTuning } from './learning-tuned-fact-ranking'
import { buildProceduralMemoryAbstractions } from './memory-procedural-abstraction'
import { buildMemoryRecollectionWindows } from './memory-recollection-windows'
import { deriveSessionMirrorRecollectionIntent } from './runtime-organic-memory-search-prelude'

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

function uniqueRecallSeedBlocks(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    if (typeof value !== 'string')
      continue
    const normalized = value.trim()
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

const legacyStructuredRecallSeedLinePattern = /^(?:mirror_runtime_continuity|continuity_[a-z_]+|humanlike_memory_recall):/iu

function sanitizeRecallSeedBlockForMemoryPrompt(raw: unknown) {
  const normalized = typeof raw === 'string'
    ? raw
        .trim()
        .split(/\r?\n/u)
        .map(line => line.trim().replace(/[^\S\r\n]+/gu, ' '))
        .filter(Boolean)
        .join('\n')
        .slice(0, 2400)
        .trim()
    : ''
  if (!normalized)
    return ''

  const sanitizedLines = normalized
    .split('\n')
    .filter(line => !legacyStructuredRecallSeedLinePattern.test(line))
    .map((line) => {
      return sanitizeNaturalRecallSeedLineForMemorySearch(line)
    })
    .filter(line => line && line !== alicizationFixedTemplateReplacement)

  return uniqueRecallSeedBlocks(sanitizedLines, 8).join('\n')
}

function sanitizeNaturalRecallSeedLineForMemorySearch(raw: string) {
  const sanitized = sanitizeAlicizationProviderFacingText(raw, 800)
  return sanitized && sanitized !== alicizationFixedTemplateReplacement
    ? sanitized
    : ''
}

export interface AlicizationRelationshipLineCandidate {
  id: string
  line: string
  sourceKind: 'episode' | 'consolidation'
  sourceId: string
  provenance: AlicizationMemoryProvenance
  confidence: number
  cues: string[]
}

export interface AlicizationReconstructionCandidate {
  id: string
  summary: string
  provenance: AlicizationMemoryProvenance
  sourceKind: 'episode' | 'cluster'
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
  learningExecutionState?: OrganicMemoryPromptContext['learningExecutionState']
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
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
    retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
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
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
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
  budgetClass?: AlicizationMemoryRetrievalBudgetClass
  retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
  digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  sessionMirrorRecollection?: OrganicMemoryRecollectionCarry | null
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
  const sessionMirrorRecollectionIntent = deriveSessionMirrorRecollectionIntent(
    input.sessionMirrorRecollection,
  )
  const recallSeed = uniqueRecallSeedBlocks([
    input.recallSeed,
    input.recallGovernor?.recallSeed,
    sessionMirrorRecollectionIntent ? input.sessionMirrorRecollection?.foreground : null,
  ].map(sanitizeRecallSeedBlockForMemoryPrompt), 8).join('\n')
  const seedTriggeredHeuristicIntent = recallSeed
    ? input.policy.deriveSceneTriggeredRecollectionIntent({
        recallSeed,
        recalledEpisodes: [],
      })
    : null
  const heuristicRecollectionIntent
    = input.recallGovernor?.recollectionIntent
      ?? sessionMirrorRecollectionIntent
      ?? seedTriggeredHeuristicIntent
      ?? null
  const retrievedFacts = recallSeed
    ? rankFactsByLearningTuning({
        facts: await input.access.retrieveMemoryFacts(recallSeed, 4),
        tuningAdvice: memoryTuningAdvice,
      })
    : []
  const normalizedRecalledFragmentCap = Number.isFinite(input.recallGovernor?.recalledFragmentCap)
    ? Math.floor(Number(input.recallGovernor?.recalledFragmentCap))
    : 0
  const recalledFragmentCap = normalizedRecalledFragmentCap > 0
    ? normalizedRecalledFragmentCap
    : undefined
  const recalledFragmentSourceBudget = (input.recallGovernor?.recalledFragmentSourceBudget ?? [])
    .filter(item => Number.isFinite(item.maxItems) && item.maxItems > 0)
  const recalledFragments = recallSeed
    ? (
        await input.access.recallSubconsciousFragmentsWithGovernor({
          text: recallSeed,
          recalledFragmentCap,
          recalledFragmentSourceBudget,
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
        digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface ?? null,
      }).catch(() => null)
    : null
  const preliminaryRecollectionIntent = plannedRecollectionIntent ?? heuristicRecollectionIntent ?? null
  const preliminaryActiveRecollectionIntent = preliminaryRecollectionIntent?.mode && preliminaryRecollectionIntent.mode !== 'none'
    ? preliminaryRecollectionIntent
    : null
  const episodicRecallGovernor = preliminaryActiveRecollectionIntent
    ? {
        ...input.recallGovernor,
        recollectionIntent: preliminaryActiveRecollectionIntent,
      } as AlicizationRecallGovernorSnapshot
    : input.recallGovernor ?? null
  const recalledEpisodes = recallSeed
    ? await input.access.recallEpisodicEventsWithGovernor({
        recallSeed,
        sessionId: input.sessionId ?? null,
        turnId: input.turnId ?? null,
        recallGovernor: episodicRecallGovernor,
        budgetClass: input.budgetClass,
        retrievalPolicySnapshot: input.retrievalPolicySnapshot ?? null,
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
  recallMemoryConsolidations: (input: {
    query: string
    limit?: number
    recollectionIntent?: AlicizationRecallGovernorSnapshot['recollectionIntent'] | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
    retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
  }) => Promise<NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>>
}

export interface AlicizationMemorySearchCandidateInput {
  access: AlicizationMemorySearchCandidateAccess
  recallSeed: string
  recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']> | null
  recalledEpisodes: AlicizationEpisodicEventRecord[]
  budgetClass?: AlicizationMemoryRetrievalBudgetClass
  retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
}

export interface AlicizationMemorySearchCandidateResult {
  retrospectiveRecall: boolean
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
  recollectedWindows: AlicizationMemoryRecollectionWindow[]
  proceduralMemories: AlicizationProceduralMemoryAbstraction[]
  relationshipLineCandidates: AlicizationRelationshipLineCandidate[]
}

export async function retrieveMemorySearchCandidates(
  input: AlicizationMemorySearchCandidateInput,
): Promise<AlicizationMemorySearchCandidateResult> {
  const retrospectiveRecall = input.recollectionIntent?.temporalFocus === 'cross-session'
    || input.recollectionIntent?.temporalFocus === 'distant'
  const consolidatedMemories = input.recollectionIntent
    ? await input.access.recallMemoryConsolidations({
        query: input.recallSeed,
        limit: input.recollectionIntent.temporalFocus === 'cross-session' ? 6 : 4,
        recollectionIntent: input.recollectionIntent,
        budgetClass: input.budgetClass,
        retrievalPolicySnapshot: input.retrievalPolicySnapshot ?? null,
      })
    : []
  const recollectedWindows = buildMemoryRecollectionWindows({
    intent: input.recollectionIntent,
    episodes: input.recalledEpisodes,
  })
  const proceduralMemories = buildProceduralMemoryAbstractions({
    intent: input.recollectionIntent,
    episodes: input.recalledEpisodes,
  })

  return {
    retrospectiveRecall,
    consolidatedMemories,
    recollectedWindows,
    proceduralMemories,
    relationshipLineCandidates: retrieveRelationshipLineCandidates({
      recollectionIntent: input.recollectionIntent,
      recalledEpisodes: input.recalledEpisodes,
      consolidatedMemories,
    }),
  }
}

export function retrieveRelationshipLineCandidates(input: {
  recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']> | null
  recalledEpisodes: AlicizationEpisodicEventRecord[]
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
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
