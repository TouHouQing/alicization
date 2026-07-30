import type {
  AlicizationActiveThought,
  AlicizationEpisodicEventRecord,
  AlicizationHostPersonModelSnapshot,
  AlicizationLearningExecutionStateSnapshot,
  AlicizationMemoryProvenance,
  AlicizationMemoryReflectionRecord,
  AlicizationOrganicMemorySnapshot,
  AlicizationPersonaReinforcementEventRecord,
  AlicizationPersonStateEvolutionSummary,
  AlicizationRecallGovernorSnapshot,
  AlicizationRelationshipOutcomeRecord,
  AlicizationSoulSnapshot,
  AlicizationSubconsciousFragment,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type { AlicizationTurnRetrievalPolicySnapshot } from './memory-accessibility-runtime'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'
import type { AlicizationMemoryRetrievalBudgetClass, AlicizationMemoryRetrievalTelemetrySnapshot } from './memory-retrieval-telemetry'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import type { AlicizationPersonStateUpdateSurface } from './person-state-update-surface'
import type { AlicizationRelationshipDynamicsState } from './relationship-dynamics-state'
import type { ContextualConversationTurn } from './runtime-soul'
import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

import { deriveAlicizationLearningExecutionProjection, deriveAlicizationRecallLatencyPolicy } from '@proj-alicization/stage-shared'

import { buildAlicizationAffectiveResidueMemory } from './affective-residue-memory'
import { buildHostPersonModelSnapshot } from './humanlike-memory'
import {

  buildAlicizationMemoryAccessCacheKey,
  buildAlicizationMemoryAccessibilityPlan,
  buildAlicizationTurnRetrievalPolicySnapshot,
  tuneMemoryConsolidationSearchInput,
} from './memory-accessibility-runtime'
import {
  parseMemoryTuningAdvice,
  replayBenchmarkTuningAdviceMetaKey,
} from './memory-tuning-advice'
import { filterOrganicMemoryEntries, isPersonaResidueMemoryText } from './organic-memory-hygiene'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import {
  parsePerformanceManifestFromMeta,
  sanitizePerformanceManifest,
} from './runtime-governance'
import { buildOrganicMemoryEvolutionState } from './runtime-organic-memory-self-evolution-integration'
import {
  buildDirectFts5Query,
  buildFts5QueryFromTerms,
  extractOrganicRecallTerms,
  normalizeOrganicRecallText,
} from './runtime-organic-recall'
import {
  alicizationDreamLastRunMetaKey,
  alicizationPerformanceManifestMetaKey,
} from './runtime-soul'
import { rankSubconsciousRecallFragments } from './subconscious-recall-ranking'

export interface CreateAlicizationOrganicMemoryAccessRuntimeOptions {
  getActiveCardId: () => string
  getSoulSnapshot: () => AlicizationSoulSnapshot | null
  bootstrap: () => Promise<AlicizationSoulSnapshot>
  listActiveThoughts: () => Promise<AlicizationActiveThought[]>
  countSubconsciousFragments: () => Promise<number>
  listRecentSubconsciousFragments: (limit: number) => Promise<AlicizationSubconsciousFragment[]>
  getMetaValue: (key: string) => Promise<string | undefined>
  replaceActiveThoughts: (items: Array<{ text: string }>) => Promise<void>
  setMetaValue: (key: string, value: string) => Promise<void>
  searchSubconsciousFragments: (query: string, limit: number) => Promise<AlicizationSubconsciousFragment[]>
  listRecentEpisodicEvents: (limit: number) => Promise<AlicizationEpisodicEventRecord[]>
  listMemoryConsolidations: (limit?: number) => Promise<AlicizationMemoryConsolidationRecord[]>
  getLatestRelationshipDynamics: () => Promise<AlicizationRelationshipDynamicsState | null>
  listRelationshipOutcomes: (input: {
    cardId: string
    limit?: number
    turnId?: string
  }) => Promise<AlicizationRelationshipOutcomeRecord[]>
  listMemoryReflections: (input: {
    cardId: string
    limit?: number
    turnId?: string
    status?: 'pending' | 'confirmed' | 'denied' | 'superseded'
  }) => Promise<AlicizationMemoryReflectionRecord[]>
  listPersonaReinforcementEvents: (input: {
    cardId: string
    limit?: number
    turnId?: string
  }) => Promise<AlicizationPersonaReinforcementEventRecord[]>
  summarizePersonStateEvolution: (input?: {
    cardId?: string
    limit?: number
  }) => Promise<AlicizationPersonStateEvolutionSummary>
  readMindHead: <T>(cardId: string, key: 'person-state-update-surface') => Promise<T | null>
  searchEpisodicEvents: (input: {
    recallSeed: string
    limit?: number
    sessionId?: string | null
    turnId?: string | null
    threadAnchors?: string[]
    affectAnchors?: string[]
    relationshipAnchors?: string[]
    sceneAnchor?: string | null
    salienceBias?: number | null
    carryAsMemory?: boolean
    allowDream?: boolean
    recollectionIntent?: AlicizationRecallGovernorSnapshot['recollectionIntent'] | null
    reconsolidationDecisionTraceId?: string | null
  }) => Promise<AlicizationEpisodicEventRecord[]>
  searchConversationTurnsForRecall: (input: {
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
  searchMemoryConsolidations: (input: {
    query: string
    limit?: number
    recollectionIntent?: AlicizationRecallGovernorSnapshot['recollectionIntent'] | null
  }) => Promise<Array<{
    id: string
    kind: 'daily' | 'weekly' | 'procedural' | 'autobiographical'
    facet?: 'phase' | 'relationship-era' | 'task-era' | 'self-era' | null
    periodKey: string
    periodStartedAt: number
    periodEndedAt: number
    summary: string
    lesson: string | null
    cues: string[]
    confidence: number
    dominantProvenance: AlicizationMemoryProvenance
    derivedEventIds: string[]
    updatedAt: number
  }>>
  listConversationTurnsBySession: (sessionId: string, options: { limit: number }) => Promise<Array<{
    userText?: string | null
    assistantText?: string | null
  }>>
  getLatestLearningExecutionState?: (cardId: string) => Promise<AlicizationLearningExecutionStateSnapshot | null>
  recordMemoryCacheAccess?: (hit: boolean) => Promise<void>
  recordMemoryPrewarmAccess?: (hit: boolean) => Promise<void>
  recordMemoryBudgetClass?: (budgetClass: AlicizationMemoryRetrievalBudgetClass) => Promise<void>
  recordMemoryHotKeyOutcome?: (input: {
    key: string
    hit: boolean
    won?: boolean
  }) => Promise<void>
  getMemoryRetrievalTelemetry?: () => Promise<AlicizationMemoryRetrievalTelemetrySnapshot | null>
  getActiveSelfRevisionStatePatch?: () => Promise<AlicizationSelfRevisionStatePatch | null>
  getActiveSelfEvolutionCandidateId?: () => Promise<string | null>
}

export function createAlicizationOrganicMemoryAccessRuntime(options: CreateAlicizationOrganicMemoryAccessRuntimeOptions) {
  const transientRecallCache = new Map<string, {
    value: unknown
    expiresAt: number
  }>()

  function isHostFacingMemoryConsolidation(
    item: AlicizationMemoryConsolidationRecord,
  ): item is AlicizationMemoryConsolidationRecord & { kind: 'procedural' | 'autobiographical' } {
    return item.kind === 'procedural' || item.kind === 'autobiographical'
  }

  function readTransientRecallCache<T>(key: string, now = Date.now()) {
    const cached = transientRecallCache.get(key)
    if (!cached)
      return null
    if (cached.expiresAt <= now) {
      transientRecallCache.delete(key)
      return null
    }
    return cached.value as T
  }

  function writeTransientRecallCache(key: string, value: unknown, ttlMs: number, now = Date.now()) {
    transientRecallCache.set(key, {
      value,
      expiresAt: now + Math.max(250, ttlMs),
    })
  }

  function invalidateTransientRecallCacheNamespace(namespace: 'episodic' | 'consolidation' | 'conversation' | 'benchmark') {
    const prefix = `${namespace}::`
    for (const key of transientRecallCache.keys()) {
      if (key.startsWith(prefix))
        transientRecallCache.delete(key)
    }
  }

  async function resolveTurnRetrievalPolicySnapshot(input: {
    recallSeed: string
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
  }): Promise<AlicizationTurnRetrievalPolicySnapshot> {
    const [telemetry, tuningAdvice] = await Promise.all([
      options.getMemoryRetrievalTelemetry?.().catch(() => null) ?? Promise.resolve(null),
      getMemoryTuningAdvice().catch(() => null),
    ])
    const selfRevisionPatch = await options.getActiveSelfRevisionStatePatch?.().catch(() => null) ?? null
    const activeSelfEvolutionCandidateId = await options.getActiveSelfEvolutionCandidateId?.().catch(() => null) ?? null
    return buildAlicizationTurnRetrievalPolicySnapshot({
      recallSeed: input.recallSeed,
      recallGovernor: input.recallGovernor ?? null,
      budgetClass: input.budgetClass,
      telemetry,
      tuningAdvice,
      activeSelfEvolutionCandidateId,
      selfRevisionPatch,
    })
  }

  async function prewarmAccessibilityLine(input: {
    recallSeed: string
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
    sessionId?: string | null
    turnId?: string | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
    retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
  }) {
    const recallSeed = normalizeOrganicRecallText(input.recallSeed)
    if (!recallSeed)
      return null
    const snapshot = input.retrievalPolicySnapshot ?? await resolveTurnRetrievalPolicySnapshot({
      recallSeed,
      recallGovernor: input.recallGovernor ?? null,
      budgetClass: input.budgetClass,
    })
    const plan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed,
      recallGovernor: input.recallGovernor ?? null,
      budgetClass: input.budgetClass,
      policy: snapshot.policy,
    })
    void options.recordMemoryBudgetClass?.(plan.budgetClass).catch(() => {})
    if (!plan.prewarmKey) {
      void options.recordMemoryPrewarmAccess?.(false).catch(() => {})
      return plan
    }
    void options.recordMemoryPrewarmAccess?.(false).catch(() => {})

    void recallEpisodicEventsWithGovernor({
      recallSeed,
      sessionId: input.sessionId ?? null,
      turnId: input.turnId ?? null,
      recallGovernor: input.recallGovernor ?? null,
      budgetClass: snapshot.plan.budgetClass,
      retrievalPolicySnapshot: snapshot,
    }).catch(() => [])
    void recallConversationHistory({
      query: recallSeed,
      limit: plan.conversationLimit,
      recollectionIntent: input.recallGovernor?.recollectionIntent ?? null,
      budgetClass: snapshot.plan.budgetClass,
      retrievalPolicySnapshot: snapshot,
    }).catch(() => [])
    void recallMemoryConsolidations({
      query: recallSeed,
      limit: plan.consolidationLimit,
      recollectionIntent: input.recallGovernor?.recollectionIntent ?? null,
      budgetClass: snapshot.plan.budgetClass,
      retrievalPolicySnapshot: snapshot,
    }).catch(() => [])
    return plan
  }

  async function getOrganicMemorySnapshot() {
    const currentSoul = options.getSoulSnapshot() ?? await options.bootstrap()
    const activeCardId = options.getActiveCardId()
    const [
      rawActiveThoughts,
      subconsciousCount,
      rawRecentSubconsciousFragments,
      rawLastDreamedAt,
      persistedLearningExecutionState,
      recentEpisodicEvents,
      rawMemoryConsolidations,
      relationshipDynamics,
      relationshipOutcomes,
      memoryReflections,
      personStateEvolutionSummary,
      memoryRetrievalTelemetry,
      activeSelfRevisionPatch,
      activeSelfEvolutionCandidateId,
    ] = await Promise.all([
      options.listActiveThoughts().catch(() => []),
      options.countSubconsciousFragments().catch(() => 0),
      options.listRecentSubconsciousFragments(8).catch(() => []),
      options.getMetaValue(alicizationDreamLastRunMetaKey).catch(() => undefined),
      options.getLatestLearningExecutionState?.(activeCardId).catch(() => null) ?? Promise.resolve(null),
      options.listRecentEpisodicEvents(8).catch(() => []),
      options.listMemoryConsolidations(16).catch(() => []),
      options.getLatestRelationshipDynamics().catch(() => null),
      options.listRelationshipOutcomes({
        cardId: activeCardId,
        limit: 8,
      }).catch(() => []),
      options.listMemoryReflections({
        cardId: activeCardId,
        limit: 8,
      }).catch(() => []),
      options.summarizePersonStateEvolution({
        cardId: activeCardId,
        limit: 16,
      }).catch(() => ({
        trustShift: 0,
        closenessShift: 0,
        repairShift: 0,
        autonomyShift: 0,
        burdenShift: 0,
        executionTrustShift: 0,
        relationshipDoctrineShift: 0,
        latestDoctrine: null,
        latestBurdenLine: null,
        latestTrustMeaning: null,
        latestDominantRung: null,
        recentSummaries: [],
        explanation: [],
        updatedAt: null,
      })),
      options.getMemoryRetrievalTelemetry?.().catch(() => null) ?? Promise.resolve(null),
      options.getActiveSelfRevisionStatePatch?.().catch(() => null) ?? Promise.resolve(null),
      options.getActiveSelfEvolutionCandidateId?.().catch(() => null) ?? Promise.resolve(null),
    ])
    const parsedLastDreamedAt = Number.parseInt(String(rawLastDreamedAt ?? ''), 10)
    const activeThoughts = filterOrganicMemoryEntries(rawActiveThoughts)
    const recentSubconsciousFragments = rawRecentSubconsciousFragments.filter(fragment => !isPersonaResidueMemoryText(fragment.text))
    const hostPersonModel = await buildHostPersonModel().catch(() => null)
    const hostFacingMemoryConsolidations = rawMemoryConsolidations
      .filter(isHostFacingMemoryConsolidation)
    const memoryConsolidations: NonNullable<AlicizationOrganicMemorySnapshot['memoryConsolidations']> = hostFacingMemoryConsolidations
      .map(item => ({
        id: item.id,
        kind: item.kind as 'procedural' | 'autobiographical',
        facet: item.facet ?? null,
        periodKey: item.periodKey,
        periodStartedAt: item.periodStartedAt,
        periodEndedAt: item.periodEndedAt,
        summary: item.summary,
        lesson: item.lesson,
        cues: item.cues,
        confidence: item.confidence,
        dominantProvenance: item.dominantProvenance,
      }))
    const personStateProjection = buildAlicizationPersonStateProjection({
      now: Date.now(),
      personaAuthority: currentSoul.frontmatter.personality,
      hostPersonModel,
      personStateEvolutionSummary,
      recentEpisodicEvents,
      recentMemoryConsolidations: hostFacingMemoryConsolidations,
      previousContinuityState: null,
    })
    const affectiveResidue = buildAlicizationAffectiveResidueMemory({
      now: Date.now(),
      recentRelationshipOutcomes: relationshipOutcomes,
      recentMemoryReflections: memoryReflections,
      personStateEvolutionSummary,
      personalityContinuityState: personStateProjection.personalityContinuityState,
      hostPersonModel,
      relationshipDynamics,
    })
    const recallLatencyPolicy = deriveAlicizationRecallLatencyPolicy({
      budgetClass: memoryRetrievalTelemetry?.budgetClassCounts?.['realtime-reply']
        || memoryRetrievalTelemetry?.budgetClassCounts?.['deep-recall-reply']
        ? 'realtime-reply'
        : 'realtime-reply',
      shouldRecall: false,
      stableCoreCount: 0,
      unsafeDetailCount: 0,
      wrongThreadRate: memoryRetrievalTelemetry?.wrongThreadRate ?? null,
      recallMissRate: memoryRetrievalTelemetry?.recallMissRate ?? null,
      reconstructionErrorRate: memoryRetrievalTelemetry?.reconstructionErrorRate ?? null,
      memorySurfaceViolationRate: memoryRetrievalTelemetry?.memorySurfaceViolationRate ?? null,
    })
    const {
      selfEvolution,
      derivedMindStateBundle,
    } = buildOrganicMemoryEvolutionState({
      producedAt: Date.now(),
      retrievedFacts: [],
      proceduralMemories: [],
      personStateEvolutionSummary,
      hostPersonModel,
      memoryStats: memoryRetrievalTelemetry
        ? {
            version: 'memory-stats-v1',
            total: 0,
            active: 0,
            archived: 0,
            lastPrunedAt: null,
            retrievalHealth: {
              semanticLatencyMs: null,
              graphLatencyMs: null,
              templateLeakageFailCount: 0,
              reconstructionFrequency: 0,
              reconstructedCount: 0,
              wrongThreadRate: memoryRetrievalTelemetry.wrongThreadRate ?? 0,
              recallMissRate: memoryRetrievalTelemetry.recallMissRate ?? 0,
              reconstructionErrorRate: memoryRetrievalTelemetry.reconstructionErrorRate ?? 0,
              memorySurfaceViolationRate: memoryRetrievalTelemetry.memorySurfaceViolationRate ?? 0,
            },
          } as any
        : null,
      recollectionIntent: null,
      recollectionPlan: null,
      recollectionSpeechPlan: null,
      memoryDeliberation: null,
      personStateProjection,
      learningExecutionState: persistedLearningExecutionState,
      recallLatencyPolicy,
      affectiveResidue,
      affectiveResidueAuthority: 'relationship-owner',
      recentRelationshipOutcomes: relationshipOutcomes,
      recentMemoryReflections: memoryReflections,
      relationshipDynamics,
      activeSelfEvolutionCandidateId,
      activeSelfRevisionPatch,
    })
    const learningExecutionState = deriveAlicizationLearningExecutionProjection({
      persistedState: persistedLearningExecutionState,
      selfEvolution,
      projectionMode: 'advisory-only',
    })

    if (activeThoughts.length !== rawActiveThoughts.length) {
      void options.replaceActiveThoughts(activeThoughts.map(item => ({ text: item.text }))).catch(() => {})
    }

    return {
      hostAttitude: currentSoul.frontmatter.host_attitude,
      coreIncarnation: currentSoul.frontmatter.core_incarnation,
      activeThoughts,
      subconsciousCount,
      recentSubconsciousFragments,
      recentEpisodicEvents,
      hostPersonModel,
      memoryConsolidations,
      knowledgeEvidence: derivedMindStateBundle?.knowledgeEvidence ?? null,
      selfEvolution,
      affectiveResidue,
      recallLatencyPolicy,
      derivedMindStateBundle,
      learningExecutionState,
      recollectionIntent: null,
      recollectionPlan: null,
      recollectionSpeechPlan: null,
      recollectionForeground: null,
      memoryStageReplay: null,
      memoryResolutionLedger: null,
      lastDreamedAt: Number.isFinite(parsedLastDreamedAt) ? Math.max(0, parsedLastDreamedAt) : null,
    } satisfies AlicizationOrganicMemorySnapshot
  }

  async function getPerformanceManifest() {
    const raw = await options.getMetaValue(alicizationPerformanceManifestMetaKey).catch(() => undefined)
    return parsePerformanceManifestFromMeta(raw)
  }

  async function setPerformanceManifest(manifest: CharacterPerformanceCapabilitiesManifest | null) {
    if (!manifest) {
      await options.setMetaValue(alicizationPerformanceManifestMetaKey, '').catch(() => {})
      return
    }

    const sanitized = sanitizePerformanceManifest(manifest)
    await options.setMetaValue(
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
    return await options.searchSubconsciousFragments(ftsQuery, Math.max(1, Math.min(20, limit))).catch(() => [])
  }

  async function recallSubconsciousFragmentsWithGovernor(input: {
    text: string
    recalledFragmentCap?: number
    recalledFragmentSourceBudget?: AlicizationRecallGovernorSnapshot['recalledFragmentSourceBudget']
  }) {
    const terms = extractOrganicRecallTerms(input.text)
    if (terms.length === 0)
      return []

    const ftsQuery = buildFts5QueryFromTerms(terms)
    if (!ftsQuery)
      return []

    const rows = await options.searchSubconsciousFragments(ftsQuery, 6).catch(() => [])
    return rankSubconsciousRecallFragments({
      rows,
      terms,
      limit: Number.isFinite(input.recalledFragmentCap)
        ? Math.max(1, Math.floor(Number(input.recalledFragmentCap)))
        : 2,
      sourceBudget: input.recalledFragmentSourceBudget ?? [],
    })
  }

  async function recallEpisodicEventsWithGovernor(input: {
    recallSeed: string
    sessionId?: string | null
    turnId?: string | null
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
    retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
  }) {
    const recallSeed = normalizeOrganicRecallText(input.recallSeed)
    if (!recallSeed)
      return []
    const snapshot = input.retrievalPolicySnapshot ?? await resolveTurnRetrievalPolicySnapshot({
      recallSeed,
      recallGovernor: input.recallGovernor ?? null,
      budgetClass: input.budgetClass,
    })
    const plan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed,
      recallGovernor: input.recallGovernor ?? null,
      budgetClass: input.budgetClass,
      policy: snapshot.policy,
    })
    const allowDream = input.recallGovernor?.mode === 'self-continuity'
      || input.recallGovernor?.mode === 'emotional-resonance'
    const effectiveEpisodicLimit = Math.max(
      input.recallGovernor?.mode === 'emotional-resonance' ? 4 : 3,
      plan.episodicLimit,
    )
    const episodicSearchParameters = {
      threadAnchors: input.recallGovernor?.threadAnchors ?? [],
      affectAnchors: input.recallGovernor?.affectAnchors ?? [],
      relationshipAnchors: input.recallGovernor?.relationshipAnchors ?? [],
      sceneAnchor: input.recallGovernor?.sceneAnchor ?? null,
      salienceBias: input.recallGovernor?.salienceBias ?? 0.5,
      carryAsMemory: input.recallGovernor?.carryAsMemory ?? false,
      allowDream,
      recollectionIntent: input.recallGovernor?.recollectionIntent ?? null,
    }
    const queryScope = {
      mode: input.recallGovernor?.mode ?? null,
      limit: effectiveEpisodicLimit,
      ...episodicSearchParameters,
    }
    void options.recordMemoryBudgetClass?.(plan.budgetClass).catch(() => {})
    const cacheKey = buildAlicizationMemoryAccessCacheKey({
      namespace: 'episodic',
      recallSeed,
      plan,
      sessionId: input.sessionId ?? null,
      turnId: input.turnId ?? null,
      queryScope,
    })
    const cached = readTransientRecallCache<AlicizationEpisodicEventRecord[]>(cacheKey)
    if (cached) {
      void options.recordMemoryCacheAccess?.(true).catch(() => {})
      if (plan.prewarmKey)
        void options.recordMemoryPrewarmAccess?.(true).catch(() => {})
      void options.recordMemoryHotKeyOutcome?.({
        key: plan.prewarmKey ?? cacheKey,
        hit: true,
        won: true,
      }).catch(() => {})
      return cached
    }
    void options.recordMemoryCacheAccess?.(false).catch(() => {})
    if (plan.prewarmKey)
      void options.recordMemoryPrewarmAccess?.(false).catch(() => {})
    void options.recordMemoryHotKeyOutcome?.({
      key: plan.prewarmKey ?? cacheKey,
      hit: false,
      won: false,
    }).catch(() => {})

    const rows = await options.searchEpisodicEvents({
      recallSeed,
      limit: effectiveEpisodicLimit,
      sessionId: input.sessionId ?? null,
      turnId: input.turnId ?? null,
      ...episodicSearchParameters,
    }).catch(() => [])
    if ((input.recallGovernor?.carryAsMemory ?? false) && rows.length > 0)
      invalidateTransientRecallCacheNamespace('consolidation')
    writeTransientRecallCache(cacheKey, rows, plan.cacheTtlMs)
    return rows
  }

  async function buildHostPersonModel(input?: {
    now?: number
  }): Promise<AlicizationHostPersonModelSnapshot | null> {
    const now = Number.isFinite(input?.now) ? Number(input?.now) : Date.now()
    const cardId = options.getActiveCardId()
    const [events, consolidations, relationshipDynamics, relationshipOutcomes, reinforcementEvents, personStateUpdateSurface] = await Promise.all([
      options.listRecentEpisodicEvents(18).catch(() => []),
      options.listMemoryConsolidations(16).catch(() => []),
      options.getLatestRelationshipDynamics().catch(() => null),
      options.listRelationshipOutcomes({ cardId, limit: 16 }).catch(() => []),
      options.listPersonaReinforcementEvents({ cardId, limit: 24 }).catch(() => []),
      options.readMindHead<AlicizationPersonStateUpdateSurface>(cardId, 'person-state-update-surface').catch(() => null),
    ])
    if (
      events.length === 0
      && consolidations.length === 0
      && relationshipOutcomes.length === 0
      && reinforcementEvents.length === 0
      && !relationshipDynamics
    ) {
      return null
    }
    const baseModel = buildHostPersonModelSnapshot({
      events,
      facts: [],
      consolidations,
      relationshipOutcomes,
      reinforcementEvents,
      personStateUpdateSurface,
      relationshipDynamics,
      now,
    })
    return baseModel
  }

  async function listRecentMemoryReflections(cardId: string, limit = 8) {
    return await options.listMemoryReflections({
      cardId,
      limit,
    }).catch(() => [])
  }

  async function getMemoryTuningAdvice(): Promise<AlicizationMemoryTuningAdvice | null> {
    const raw = await options.getMetaValue(replayBenchmarkTuningAdviceMetaKey).catch(() => undefined)
    return parseMemoryTuningAdvice(raw)
  }

  async function recallConversationHistory(input: {
    query: string
    limit?: number
    recollectionIntent?: AlicizationRecallGovernorSnapshot['recollectionIntent'] | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
    retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
  }) {
    const snapshot = input.retrievalPolicySnapshot ?? await resolveTurnRetrievalPolicySnapshot({
      recallSeed: input.query,
      recallGovernor: input.recollectionIntent ? { recollectionIntent: input.recollectionIntent } as AlicizationRecallGovernorSnapshot : null,
      budgetClass: input.budgetClass,
    })
    const plan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed: input.query,
      recallGovernor: input.recollectionIntent ? { recollectionIntent: input.recollectionIntent } as AlicizationRecallGovernorSnapshot : null,
      budgetClass: input.budgetClass,
      policy: snapshot.policy,
    })
    void options.recordMemoryBudgetClass?.(plan.budgetClass).catch(() => {})
    const cacheKey = buildAlicizationMemoryAccessCacheKey({
      namespace: 'conversation',
      recallSeed: input.query,
      plan,
    })
    const cached = readTransientRecallCache<Array<{
      turnId: string | null
      sessionId: string
      userText: string
      assistantText: string
      createdAt: number
    }>>(cacheKey)
    if (cached) {
      void options.recordMemoryCacheAccess?.(true).catch(() => {})
      if (plan.prewarmKey)
        void options.recordMemoryPrewarmAccess?.(true).catch(() => {})
      void options.recordMemoryHotKeyOutcome?.({
        key: plan.prewarmKey ?? cacheKey,
        hit: true,
        won: true,
      }).catch(() => {})
      return cached
    }
    void options.recordMemoryCacheAccess?.(false).catch(() => {})
    if (plan.prewarmKey)
      void options.recordMemoryPrewarmAccess?.(false).catch(() => {})
    void options.recordMemoryHotKeyOutcome?.({
      key: plan.prewarmKey ?? cacheKey,
      hit: false,
      won: false,
    }).catch(() => {})

    const rows = await options.searchConversationTurnsForRecall({
      query: input.query,
      limit: Math.max(input.limit ?? 0, plan.conversationLimit),
      recollectionIntent: input.recollectionIntent ?? null,
    }).catch(() => [])
    writeTransientRecallCache(cacheKey, rows, plan.cacheTtlMs)
    return rows
  }

  async function recallMemoryConsolidations(input: {
    query: string
    limit?: number
    recollectionIntent?: AlicizationRecallGovernorSnapshot['recollectionIntent'] | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
    retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
  }) {
    const snapshot = input.retrievalPolicySnapshot ?? await resolveTurnRetrievalPolicySnapshot({
      recallSeed: input.query,
      recallGovernor: input.recollectionIntent ? { recollectionIntent: input.recollectionIntent } as AlicizationRecallGovernorSnapshot : null,
      budgetClass: input.budgetClass,
    })
    const plan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed: input.query,
      recallGovernor: input.recollectionIntent ? { recollectionIntent: input.recollectionIntent } as AlicizationRecallGovernorSnapshot : null,
      budgetClass: input.budgetClass,
      policy: snapshot.policy,
    })
    void options.recordMemoryBudgetClass?.(plan.budgetClass).catch(() => {})
    const cacheKey = buildAlicizationMemoryAccessCacheKey({
      namespace: 'consolidation',
      recallSeed: input.query,
      plan,
    })
    const cached = readTransientRecallCache<AlicizationMemoryConsolidationRecord[]>(cacheKey)
    if (cached) {
      void options.recordMemoryCacheAccess?.(true).catch(() => {})
      if (plan.prewarmKey)
        void options.recordMemoryPrewarmAccess?.(true).catch(() => {})
      void options.recordMemoryHotKeyOutcome?.({
        key: plan.prewarmKey ?? cacheKey,
        hit: true,
        won: true,
      }).catch(() => {})
      return cached
    }
    void options.recordMemoryCacheAccess?.(false).catch(() => {})
    if (plan.prewarmKey)
      void options.recordMemoryPrewarmAccess?.(false).catch(() => {})
    void options.recordMemoryHotKeyOutcome?.({
      key: plan.prewarmKey ?? cacheKey,
      hit: false,
      won: false,
    }).catch(() => {})

    const rows = await options.searchMemoryConsolidations({
      ...tuneMemoryConsolidationSearchInput({
        query: input.query,
        plan,
        recollectionIntent: input.recollectionIntent ?? null,
      }),
      limit: Math.max(input.limit ?? 0, plan.consolidationLimit),
    }).catch(() => [])
    writeTransientRecallCache(cacheKey, rows, plan.cacheTtlMs)
    return rows
  }

  async function resolveRecentContextualTurns(sessionId: string, turnCount: number) {
    if (!sessionId)
      return []

    const rows = await options.listConversationTurnsBySession(sessionId, { limit: 12 }).catch(() => [])
    return rows
      .filter(row => normalizeOrganicRecallText(row.userText ?? '') || normalizeOrganicRecallText(row.assistantText ?? ''))
      .slice(-turnCount)
      .map((row): ContextualConversationTurn => ({
        userText: normalizeOrganicRecallText(row.userText ?? ''),
        assistantText: normalizeOrganicRecallText(row.assistantText ?? ''),
      }))
  }

  return {
    getOrganicMemorySnapshot,
    getPerformanceManifest,
    setPerformanceManifest,
    searchOrganicSubconsciousFragments,
    recallSubconsciousFragmentsWithGovernor,
    recallEpisodicEventsWithGovernor,
    buildHostPersonModel,
    listRecentMemoryReflections,
    getMemoryTuningAdvice,
    recallConversationHistory,
    recallMemoryConsolidations,
    prewarmAccessibilityLine,
    resolveTurnRetrievalPolicySnapshot,
    resolveRecentContextualTurns,
  }
}
