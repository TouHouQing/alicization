import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationRelationshipLineCandidate } from './memory-search-retrieval-operators'
import type { MemoryClusterState, RecollectionPlanSnapshot } from './runtime-organic-memory-prompt-types'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import { normalizeMemoryPlanningId } from './memory-os/planning-identifiers'
import { buildMemoryRecollectionNarratives } from './memory-recollection-narratives'

const DEFAULT_REALTIME_RECOLLECTION_PLANNING_BUDGET_MS = 900

export interface OrganicMemoryRecollectionPlanningStageInput {
  recallSeed: string
  activeRecollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']> | null
  relationshipLineCandidates: AlicizationRelationshipLineCandidate[]
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
  recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
  proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
  recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
  recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
  clusterState?: MemoryClusterState | null
  digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  planMemoryRecollection?: ((input: {
    recallSeed: string
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
    proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  }) => Promise<NonNullable<OrganicMemoryPromptContext['recollectionPlan']> | null>) | undefined
  planRecollectionSpeech?: ((input: {
    recallSeed: string
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
    recollectionPlan: NonNullable<OrganicMemoryPromptContext['recollectionPlan']> | null
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
    proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  }) => Promise<NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']> | null>) | undefined
  planMemoryDeliberation?: ((input: {
    recallSeed: string
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
    recollectionPlan: NonNullable<OrganicMemoryPromptContext['recollectionPlan']> | null
    recollectionSpeechPlan: NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']> | null
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
    proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
    digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  }) => Promise<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']> | null>) | undefined
  resolveRecollectionPlanSearch: (input: {
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']> | null
    recollectionPlan: RecollectionPlanSnapshot | null
    relationshipLineCandidates: AlicizationRelationshipLineCandidate[]
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
    proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
    clusterState?: MemoryClusterState | null
  }) => RecollectionPlanSnapshot | null
  recordMemoryPlannerLatency?: ((latencyMs: number) => Promise<void>) | undefined
  recordMemorySpeechPlanLatency?: ((latencyMs: number) => Promise<void>) | undefined
  plannerBudgetMs?: number
}

function resolvePlanningDeadline(input: OrganicMemoryRecollectionPlanningStageInput) {
  const budgetMs = Number.isFinite(input.plannerBudgetMs)
    ? Math.max(0, input.plannerBudgetMs ?? 0)
    : DEFAULT_REALTIME_RECOLLECTION_PLANNING_BUDGET_MS
  return Date.now() + budgetMs
}

function remainingPlanningBudgetMs(deadlineMs: number) {
  return Math.max(0, deadlineMs - Date.now())
}

async function runWithinPlanningBudget<T>(input: {
  deadlineMs: number
  run: () => Promise<T | null>
}): Promise<T | null> {
  const remainingMs = remainingPlanningBudgetMs(input.deadlineMs)
  if (remainingMs <= 0)
    return null

  let timeout: ReturnType<typeof setTimeout> | null = null
  try {
    return await Promise.race([
      input.run().catch(() => null),
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), remainingMs)
      }),
    ])
  }
  finally {
    if (timeout)
      clearTimeout(timeout)
  }
}

export async function resolveOrganicMemoryRecollectionPlanningStage(input: OrganicMemoryRecollectionPlanningStageInput) {
  const planningDeadlineMs = resolvePlanningDeadline(input)
  const plannerStartedAt = Date.now()
  const rawRecollectionPlan = input.activeRecollectionIntent && input.planMemoryRecollection && (
    input.consolidatedMemories.length > 0
    || input.recollectedWindows.length > 0
    || input.proceduralMemories.length > 0
    || input.recalledEpisodes.length > 0
    || input.recalledConversationHistory.length > 0
  )
    ? await runWithinPlanningBudget({
        deadlineMs: planningDeadlineMs,
        run: async () => await input.planMemoryRecollection!({
          recallSeed: input.recallSeed,
          recollectionIntent: input.activeRecollectionIntent!,
          consolidatedMemories: input.consolidatedMemories,
          recollectedWindows: input.recollectedWindows,
          proceduralMemories: input.proceduralMemories,
          recalledEpisodes: input.recalledEpisodes,
          recalledConversationHistory: input.recalledConversationHistory,
          digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface ?? null,
        }),
      })
    : null
  const recollectionPlan = input.resolveRecollectionPlanSearch({
    recollectionIntent: input.activeRecollectionIntent,
    recollectionPlan: rawRecollectionPlan,
    relationshipLineCandidates: input.relationshipLineCandidates,
    consolidatedMemories: input.consolidatedMemories,
    recollectedWindows: input.recollectedWindows,
    proceduralMemories: input.proceduralMemories,
    recalledEpisodes: input.recalledEpisodes,
    recalledConversationHistory: input.recalledConversationHistory,
    clusterState: input.clusterState,
  })

  const selectedConsolidationIds = new Set(recollectionPlan?.selectedConsolidationIds ?? [])
  const selectedWindowIds = new Set(recollectionPlan?.selectedWindowIds ?? [])
  const selectedProceduralIds = new Set(recollectionPlan?.selectedProceduralIds ?? [])
  const selectedEpisodeIds = new Set(recollectionPlan?.selectedEpisodeIds ?? [])
  const selectedConversationTurnIds = new Set(recollectionPlan?.selectedConversationTurnIds ?? [])
  const hasRecollectionPlan = recollectionPlan !== null

  const plannedConsolidatedMemories = hasRecollectionPlan
    ? input.consolidatedMemories.filter(item => selectedConsolidationIds.has(item.id))
    : input.consolidatedMemories
  const plannedWindows = hasRecollectionPlan
    ? input.recollectedWindows.filter(item => selectedWindowIds.has(item.id))
    : input.recollectedWindows
  const plannedProceduralMemories = hasRecollectionPlan
    ? input.proceduralMemories.filter(item => selectedProceduralIds.has(item.id))
    : input.proceduralMemories
  const plannedEpisodes = hasRecollectionPlan
    ? input.recalledEpisodes.filter(item => selectedEpisodeIds.has(item.id))
    : input.recalledEpisodes
  const plannedConversationHistory = hasRecollectionPlan
    ? input.recalledConversationHistory.filter(item => item.turnId && selectedConversationTurnIds.has(item.turnId))
    : input.recalledConversationHistory

  void input.recordMemoryPlannerLatency?.(Date.now() - plannerStartedAt).catch(() => {})

  const speechPlanStartedAt = Date.now()
  const recollectionSpeechPlan = input.activeRecollectionIntent && input.planRecollectionSpeech && (
    plannedConsolidatedMemories.length > 0
    || plannedWindows.length > 0
    || plannedProceduralMemories.length > 0
    || plannedEpisodes.length > 0
    || plannedConversationHistory.length > 0
    || Boolean(recollectionPlan)
  )
    ? await runWithinPlanningBudget({
        deadlineMs: planningDeadlineMs,
        run: async () => await input.planRecollectionSpeech!({
          recallSeed: input.recallSeed,
          recollectionIntent: input.activeRecollectionIntent!,
          recollectionPlan,
          consolidatedMemories: plannedConsolidatedMemories,
          recollectedWindows: plannedWindows,
          proceduralMemories: plannedProceduralMemories,
          recalledEpisodes: plannedEpisodes,
          recalledConversationHistory: plannedConversationHistory,
          digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface ?? null,
        }),
      })
    : null
  void input.recordMemorySpeechPlanLatency?.(Date.now() - speechPlanStartedAt).catch(() => {})

  const rawMemoryDeliberation = input.activeRecollectionIntent && input.planMemoryDeliberation && (
    plannedConsolidatedMemories.length > 0
    || plannedWindows.length > 0
    || plannedProceduralMemories.length > 0
    || plannedEpisodes.length > 0
    || plannedConversationHistory.length > 0
    || Boolean(recollectionPlan)
  )
    ? await runWithinPlanningBudget({
        deadlineMs: planningDeadlineMs,
        run: async () => await input.planMemoryDeliberation!({
          recallSeed: input.recallSeed,
          recollectionIntent: input.activeRecollectionIntent!,
          recollectionPlan,
          recollectionSpeechPlan,
          consolidatedMemories: plannedConsolidatedMemories,
          recollectedWindows: plannedWindows,
          proceduralMemories: plannedProceduralMemories,
          recalledEpisodes: plannedEpisodes,
          recalledConversationHistory: plannedConversationHistory,
          digitalLifeRuntimeSurface: input.digitalLifeRuntimeSurface ?? null,
        }),
      })
    : null

  const finalEraIds = new Set(
    (rawMemoryDeliberation?.selectedEraIds ?? []).map(normalizeMemoryPlanningId),
  )
  const finalConsolidationIds = new Set(
    (rawMemoryDeliberation?.selectedConsolidationIds ?? []).map(normalizeMemoryPlanningId),
  )
  const finalWindowIds = new Set(
    (rawMemoryDeliberation?.selectedWindowIds ?? []).map(normalizeMemoryPlanningId),
  )
  const finalProcedureIds = new Set(
    (rawMemoryDeliberation?.selectedProcedureIds ?? []).map(normalizeMemoryPlanningId),
  )
  const finalEpisodeIds = new Set(
    (rawMemoryDeliberation?.selectedEpisodeIds ?? []).map(normalizeMemoryPlanningId),
  )
  const finalConversationTurnIds = new Set(
    (rawMemoryDeliberation?.selectedConversationTurnIds ?? []).map(normalizeMemoryPlanningId),
  )
  const hasFinalDeliberation = rawMemoryDeliberation !== null
  const finalDeliberationAllowsRecall = rawMemoryDeliberation?.shouldRecall !== false
  const finalPlannedConsolidatedMemories = hasFinalDeliberation
    ? finalDeliberationAllowsRecall
      ? plannedConsolidatedMemories.filter((item) => {
          const id = normalizeMemoryPlanningId(item.id)
          return finalConsolidationIds.has(id) || finalEraIds.has(id)
        })
      : []
    : plannedConsolidatedMemories
  const finalPlannedWindows = hasFinalDeliberation
    ? finalDeliberationAllowsRecall
      ? plannedWindows.filter((item) => {
          const id = normalizeMemoryPlanningId(item.id)
          return finalWindowIds.has(id) || finalEraIds.has(id)
        })
      : []
    : plannedWindows
  const finalPlannedProceduralMemories = hasFinalDeliberation
    ? finalDeliberationAllowsRecall
      ? plannedProceduralMemories.filter(item => finalProcedureIds.has(normalizeMemoryPlanningId(item.id)))
      : []
    : plannedProceduralMemories
  const finalPlannedEpisodes = hasFinalDeliberation
    ? finalDeliberationAllowsRecall
      ? plannedEpisodes.filter(item => finalEpisodeIds.has(normalizeMemoryPlanningId(item.id)))
      : []
    : plannedEpisodes
  const finalPlannedConversationHistory = hasFinalDeliberation
    ? finalDeliberationAllowsRecall
      ? plannedConversationHistory.filter(item =>
          finalConversationTurnIds.has(normalizeMemoryPlanningId(item.turnId)),
        )
      : []
    : plannedConversationHistory
  const shouldBuildRecollectionNarratives = rawMemoryDeliberation
    ? rawMemoryDeliberation.shouldRecall
    : recollectionPlan !== null
  const recollectionNarratives = shouldBuildRecollectionNarratives
    ? buildMemoryRecollectionNarratives({
        intent: input.activeRecollectionIntent,
        recollectedWindows: finalPlannedWindows,
      })
    : []

  return {
    recollectionPlan,
    plannedConsolidatedMemories: finalPlannedConsolidatedMemories,
    plannedWindows: finalPlannedWindows,
    plannedProceduralMemories: finalPlannedProceduralMemories,
    plannedEpisodes: finalPlannedEpisodes,
    plannedConversationHistory: finalPlannedConversationHistory,
    recollectionNarratives,
    recollectionSpeechPlan,
    rawMemoryDeliberation,
  }
}
