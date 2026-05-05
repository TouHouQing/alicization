import type {
  AlicizationActiveThought,
  AlicizationEpisodicEventRecord,
  AlicizationHostPersonModelSnapshot,
  AlicizationLearningExecutionStateSnapshot,
  AlicizationOrganicMemorySnapshot,
  AlicizationPersonaReinforcementEventRecord,
  AlicizationPersonStateEvolutionSummary,
  AlicizationRecallGovernorSnapshot,
  AlicizationMemoryReflectionRecord,
  AlicizationRelationshipOutcomeRecord,
  AlicizationSoulSnapshot,
  AlicizationSubconsciousFragment,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import type { AlicizationPersonStateUpdateSurface } from './person-state-update-surface'
import type { AlicizationRelationshipDynamicsState } from './relationship-dynamics-state'
import type { ContextualConversationTurn } from './runtime-soul'

import { filterOrganicMemoryEntries, isPersonaResidueMemoryText } from './organic-memory-hygiene'
import {
  parsePerformanceManifestFromMeta,
  sanitizePerformanceManifest,
} from './runtime-governance'
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
import { buildHostPersonModelSnapshot } from './humanlike-memory'
import {
  buildAlicizationMemoryAccessCacheKey,
  buildAlicizationMemoryAccessibilityPlan,
  tuneMemoryConsolidationSearchInput,
} from './memory-accessibility-runtime'
import type { AlicizationMemoryRetrievalBudgetClass } from './memory-retrieval-telemetry'
import {
  applyMemoryTuningAdviceToHostPersonModel,
  parseMemoryTuningAdvice,
  replayBenchmarkTuningAdviceMetaKey,
} from './memory-tuning-advice'
import { rankSubconsciousRecallFragments } from './subconscious-recall-ranking'
import { deriveAlicizationOnlineMemoryPolicy } from './memory-policy-governor'
import type { AlicizationMemoryRetrievalTelemetrySnapshot } from './memory-retrieval-telemetry'

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
    dominantProvenance: 'observed' | 'remembered' | 'dreamt' | 'inferred' | 'reconstructed'
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
}

export function createAlicizationOrganicMemoryAccessRuntime(options: CreateAlicizationOrganicMemoryAccessRuntimeOptions) {
  const transientRecallCache = new Map<string, {
    value: unknown
    expiresAt: number
  }>()

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

  async function prewarmAccessibilityLine(input: {
    recallSeed: string
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
    sessionId?: string | null
    turnId?: string | null
    budgetClass?: AlicizationMemoryRetrievalBudgetClass
  }) {
    const recallSeed = normalizeOrganicRecallText(input.recallSeed)
    if (!recallSeed)
      return null
    const [telemetry, tuningAdvice] = await Promise.all([
      options.getMemoryRetrievalTelemetry?.().catch(() => null) ?? Promise.resolve(null),
      getMemoryTuningAdvice().catch(() => null),
    ])
    const policy = deriveAlicizationOnlineMemoryPolicy({
      budgetClass: input.budgetClass,
      telemetry,
      tuningAdvice,
    })
    const plan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed,
      recallGovernor: input.recallGovernor ?? null,
      budgetClass: input.budgetClass,
      policy,
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
    }).catch(() => [])
    void recallConversationHistory({
      query: recallSeed,
      limit: plan.conversationLimit,
      recollectionIntent: input.recallGovernor?.recollectionIntent ?? null,
    }).catch(() => [])
    void recallMemoryConsolidations({
      query: recallSeed,
      limit: plan.consolidationLimit,
      recollectionIntent: input.recallGovernor?.recollectionIntent ?? null,
    }).catch(() => [])
    return plan
  }

  async function getOrganicMemorySnapshot() {
    const currentSoul = options.getSoulSnapshot() ?? await options.bootstrap()
    const activeCardId = options.getActiveCardId()
    const [rawActiveThoughts, subconsciousCount, rawRecentSubconsciousFragments, rawLastDreamedAt, learningExecutionState] = await Promise.all([
      options.listActiveThoughts().catch(() => []),
      options.countSubconsciousFragments().catch(() => 0),
      options.listRecentSubconsciousFragments(8).catch(() => []),
      options.getMetaValue(alicizationDreamLastRunMetaKey).catch(() => undefined),
      options.getLatestLearningExecutionState?.(activeCardId).catch(() => null) ?? Promise.resolve(null),
    ])
    const parsedLastDreamedAt = Number.parseInt(String(rawLastDreamedAt ?? ''), 10)
    const activeThoughts = filterOrganicMemoryEntries(rawActiveThoughts)
    const recentSubconsciousFragments = rawRecentSubconsciousFragments.filter(fragment => !isPersonaResidueMemoryText(fragment.text))

    if (activeThoughts.length !== rawActiveThoughts.length) {
      void options.replaceActiveThoughts(activeThoughts.map(item => ({ text: item.text }))).catch(() => {})
    }

    return {
      hostAttitude: currentSoul.frontmatter.host_attitude,
      coreIncarnation: currentSoul.frontmatter.core_incarnation,
      activeThoughts,
      subconsciousCount,
      recentSubconsciousFragments,
      learningExecutionState,
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
  }) {
    const recallSeed = normalizeOrganicRecallText(input.recallSeed)
    if (!recallSeed || input.recallGovernor?.mode === 'scene')
      return []
    const [telemetry, tuningAdvice] = await Promise.all([
      options.getMemoryRetrievalTelemetry?.().catch(() => null) ?? Promise.resolve(null),
      getMemoryTuningAdvice().catch(() => null),
    ])
    const policy = deriveAlicizationOnlineMemoryPolicy({
      budgetClass: input.budgetClass,
      telemetry,
      tuningAdvice,
    })
    const plan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed,
      recallGovernor: input.recallGovernor ?? null,
      budgetClass: input.budgetClass,
      policy,
    })
    void options.recordMemoryBudgetClass?.(plan.budgetClass).catch(() => {})
    const cacheKey = buildAlicizationMemoryAccessCacheKey({
      namespace: 'episodic',
      recallSeed,
      plan,
      sessionId: input.sessionId ?? null,
      turnId: input.turnId ?? null,
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
      limit: Math.max(
        input.recallGovernor?.mode === 'emotional-resonance' ? 4 : 3,
        plan.episodicLimit,
      ),
      sessionId: input.sessionId ?? null,
      turnId: input.turnId ?? null,
      threadAnchors: input.recallGovernor?.threadAnchors ?? [],
      affectAnchors: input.recallGovernor?.affectAnchors ?? [],
      relationshipAnchors: input.recallGovernor?.relationshipAnchors ?? [],
      sceneAnchor: input.recallGovernor?.sceneAnchor ?? null,
      salienceBias: input.recallGovernor?.salienceBias ?? 0.5,
      carryAsMemory: input.recallGovernor?.carryAsMemory ?? false,
      allowDream: input.recallGovernor?.mode === 'self-continuity' || input.recallGovernor?.mode === 'emotional-resonance',
      recollectionIntent: input.recallGovernor?.recollectionIntent ?? null,
    }).catch(() => [])
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
    const tuningAdvice = await getMemoryTuningAdvice().catch(() => null)
    return applyMemoryTuningAdviceToHostPersonModel({
      hostPersonModel: baseModel,
      tuningAdvice,
    })
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
  }) {
    const [telemetry, tuningAdvice] = await Promise.all([
      options.getMemoryRetrievalTelemetry?.().catch(() => null) ?? Promise.resolve(null),
      getMemoryTuningAdvice().catch(() => null),
    ])
    const policy = deriveAlicizationOnlineMemoryPolicy({
      budgetClass: input.budgetClass,
      telemetry,
      tuningAdvice,
    })
    const plan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed: input.query,
      recallGovernor: input.recollectionIntent ? { recollectionIntent: input.recollectionIntent } as AlicizationRecallGovernorSnapshot : null,
      budgetClass: input.budgetClass,
      policy,
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
  }) {
    const [telemetry, tuningAdvice] = await Promise.all([
      options.getMemoryRetrievalTelemetry?.().catch(() => null) ?? Promise.resolve(null),
      getMemoryTuningAdvice().catch(() => null),
    ])
    const policy = deriveAlicizationOnlineMemoryPolicy({
      budgetClass: input.budgetClass,
      telemetry,
      tuningAdvice,
    })
    const plan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed: input.query,
      recallGovernor: input.recollectionIntent ? { recollectionIntent: input.recollectionIntent } as AlicizationRecallGovernorSnapshot : null,
      budgetClass: input.budgetClass,
      policy,
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
    resolveRecentContextualTurns,
  }
}
