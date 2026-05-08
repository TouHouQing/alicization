import type {
  AlicizationEpisodicEventInput,
  AlicizationMemorySource,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'

import type { CardScopeOptions } from './runtime-soul'

import type { AlicizationPersonStateUpdateSurface } from './person-state-update-surface'
import type { AlicizationOutcomeClosureResult } from './outcome-reinforcement'
import type { AlicizationDialogueSessionMirror } from './dialogue-session-manager'
import type { AlicizationKnowledgeAssimilationRuntime } from './knowledge-assimilation-runtime'

import { buildAutobiographicalEpisodesFromPreparedMirror, buildAutobiographicalEpisodesFromSessionMirrorSync } from './autobiographical-episode-sync'
import { buildAlicizationPersonStateEvolutionEntry } from './person-state-evolution'
import { buildAlicizationPersonStateUpdateRecord, buildAlicizationPersonStateUpdateSurface } from './person-state-update-surface'
import { attachSynthesizedReflections } from './outcome-reinforcement'

interface CreateAlicizationRuntimeMemoryClosureOptions {
  now: () => number
  normalizeCardId: (raw: unknown) => string
  getActiveCardId: () => string
  withCardScope: <T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: CardScopeOptions) => Promise<T>
  errorMessageFrom: (error: unknown) => string | undefined
  ensureMindGovernanceDecisionTraceId: (raw: unknown, now?: number) => string
  knowledgeAssimilationRuntime: AlicizationKnowledgeAssimilationRuntime
  appendAuditLog: (input: {
    level: 'warning'
    category: string
    action: string
    message: string
    payload: Record<string, unknown>
  }, cardId?: string) => Promise<void>
  alicizationDb: {
    appendRelationshipOutcomes: (entries: AlicizationOutcomeClosureResult['relationshipOutcomes']) => Promise<unknown>
    appendEpisodicEvents: (events: AlicizationOutcomeClosureResult['episodicEvents'] | AlicizationEpisodicEventInput[]) => Promise<unknown>
    appendPersonaReinforcementEvents: (events: AlicizationOutcomeClosureResult['reinforcementEvents']) => Promise<unknown>
    appendPersonStateEvolutionEntries: (entries: Array<{
      cardId: string
      decisionTraceId?: string | null
      turnId?: string | null
      sessionId?: string | null
      activeThreadId?: string | null
      sourceKind: 'relationship-outcome' | 'reinforcement' | 'person-state-update' | 'episodic-memory' | 'reflection'
      summary: string
      contexts?: string[] | null
      relationshipDoctrine?: string | null
      burdenLine?: string | null
      trustMeaning?: string | null
      dominantRung?: string | null
      sourceTrail?: Array<{
        kind: 'relationship-outcome' | 'reinforcement'
        sourceKind: 'reply' | 'proactive' | 'execution'
        summary: string
        createdAt: number
      }> | null
      shifts: Array<{
        kind: 'trust-shift' | 'closeness-shift' | 'repair-posture-shift' | 'autonomy-shift' | 'burden-shift' | 'execution-trust-shift' | 'relationship-doctrine-shift'
        delta: number
        rationale: string
      }>
      createdAt?: number
    }>) => Promise<unknown>
    upsertMemoryReflections: (reflections: AlicizationOutcomeClosureResult['reflections']) => Promise<unknown>
    upsertMemoryFacts: (facts: AlicizationOutcomeClosureResult['memoryFacts'], source: 'rule') => Promise<unknown>
    readMindHead: <T>(cardId: string, key: 'person-state-update-surface') => Promise<T | null>
    upsertMindHead: (cardId: string, key: 'person-state-update-surface', value: unknown) => Promise<unknown>
    appendMindTurnEvents: (events: Array<{
      decisionTraceId: string
      turnId?: string | null
      sessionId?: string | null
      origin?: 'user-turn' | 'subconscious-proactive' | 'system'
      kind: 'person-state-updated'
      payload: Record<string, unknown>
      createdAt: number
    }>) => Promise<unknown>
    applyMemoryFactCorrections?: (corrections: Array<{
      targetFactId: string
      nextValidationStatus: 'unverified' | 'provisional' | 'validated' | 'superseded'
      nextKnowledgeStage?: 'ephemeral-observation' | 'working-understanding' | 'validated-knowledge' | 'internalized-long-horizon-knowledge' | null
      sourceLabel?: string | null
      appendConflictsWith?: string[] | null
      appendSupersedes?: string[] | null
    }>) => Promise<unknown>
    listMemoryFacts?: () => Promise<Array<{
      id: string
      subject: string
      predicate: string
      object: string
      confidence: number
      source: AlicizationMemorySource
      dedupeKey: string
      createdAt: number
      updatedAt: number
      lastAccessAt: number | null
      accessCount: number
      knowledgeStage?: 'ephemeral-observation' | 'working-understanding' | 'validated-knowledge' | 'internalized-long-horizon-knowledge' | null
      validationStatus?: 'unverified' | 'provisional' | 'validated' | 'superseded' | null
      sourceLabel?: string | null
      conflictsWith?: string[] | null
      supersedes?: string[] | null
    }>>
  }
}

export function createAlicizationRuntimeMemoryClosure(options: CreateAlicizationRuntimeMemoryClosureOptions) {
  async function persistOutcomeClosure(cardIdRaw: unknown, input: AlicizationOutcomeClosureResult) {
    const cardId = options.normalizeCardId(cardIdRaw)
    const closure = attachSynthesizedReflections(input)
    if (
      closure.relationshipOutcomes.length === 0
      && closure.reinforcementEvents.length === 0
      && closure.memoryFacts.length === 0
      && closure.reflections.length === 0
      && closure.episodicEvents.length === 0
    ) {
      return
    }

    const task = async () => {
      if (closure.relationshipOutcomes.length > 0)
        await options.alicizationDb.appendRelationshipOutcomes(closure.relationshipOutcomes)
      if (closure.episodicEvents.length > 0)
        await options.alicizationDb.appendEpisodicEvents(closure.episodicEvents)
      if (closure.reinforcementEvents.length > 0)
        await options.alicizationDb.appendPersonaReinforcementEvents(closure.reinforcementEvents)
      if (closure.reflections.length > 0)
        await options.alicizationDb.upsertMemoryReflections(closure.reflections)
      const previousPersonStateUpdateSurface = await options.alicizationDb.readMindHead<AlicizationPersonStateUpdateSurface>(cardId, 'person-state-update-surface').catch(() => null)
      const nextPersonStateUpdateSurface = buildAlicizationPersonStateUpdateSurface({
        closure,
        previous: previousPersonStateUpdateSurface,
        now: options.now(),
      })
      await options.alicizationDb.upsertMindHead(cardId, 'person-state-update-surface', nextPersonStateUpdateSurface)
      if (
        closure.relationshipOutcomes.length > 0
        || closure.reinforcementEvents.length > 0
        || closure.episodicEvents.length > 0
      ) {
        const personStateUpdateRecord = buildAlicizationPersonStateUpdateRecord({
          closure,
          surface: nextPersonStateUpdateSurface,
        })
        const evolutionEntry = buildAlicizationPersonStateEvolutionEntry({
          closure,
          previous: previousPersonStateUpdateSurface,
          next: nextPersonStateUpdateSurface,
          record: personStateUpdateRecord,
        })
        if (evolutionEntry)
          await options.alicizationDb.appendPersonStateEvolutionEntries([evolutionEntry])
        await options.alicizationDb.appendMindTurnEvents([{
          decisionTraceId: options.ensureMindGovernanceDecisionTraceId(personStateUpdateRecord.decisionTraceId, personStateUpdateRecord.createdAt),
          turnId: personStateUpdateRecord.turnId,
          sessionId: personStateUpdateRecord.sessionId,
          origin: personStateUpdateRecord.origin,
          kind: 'person-state-updated',
          payload: {
            version: personStateUpdateRecord.version,
            updatedAt: personStateUpdateRecord.updatedAt,
            summary: personStateUpdateRecord.summary,
            dominantContexts: personStateUpdateRecord.dominantContexts,
            relationshipShift: personStateUpdateRecord.relationshipShift,
            reinforcementBias: personStateUpdateRecord.reinforcementBias,
            preferenceHints: personStateUpdateRecord.preferenceHints,
            sensitivityHints: personStateUpdateRecord.sensitivityHints,
            repairHints: personStateUpdateRecord.repairHints,
            burdenHints: personStateUpdateRecord.burdenHints,
            narrative: personStateUpdateRecord.narrative,
            sourceTrail: personStateUpdateRecord.sourceTrail,
            sourceKinds: personStateUpdateRecord.sourceKinds,
            sourceCounts: personStateUpdateRecord.sourceCounts,
            activeThreadId: personStateUpdateRecord.activeThreadId,
          },
          createdAt: personStateUpdateRecord.createdAt,
        }])
      }
      if (closure.memoryFacts.length > 0) {
        const existingFacts = options.alicizationDb.listMemoryFacts
          ? await options.alicizationDb.listMemoryFacts().catch(() => [])
          : []
        const assimilation = options.knowledgeAssimilationRuntime.assimilateMemoryFactsDetailed({
          facts: closure.memoryFacts,
          source: 'rule',
          existingFacts,
        })
        if (assimilation.corrections.length > 0 && options.alicizationDb.applyMemoryFactCorrections)
          await options.alicizationDb.applyMemoryFactCorrections(assimilation.corrections)
        await options.alicizationDb.upsertMemoryFacts(assimilation.facts, 'rule')
      }
    }

    try {
      if (cardId === options.getActiveCardId()) {
        await task()
      }
      else {
        await options.withCardScope(cardId, async () => {
          await task()
        }, {
          label: `outcome-closure.persist:${cardId}`,
        })
      }
    }
    catch (error) {
      await options.appendAuditLog({
        level: 'warning',
        category: 'alicization.memory',
        action: 'outcome-closure-persist-failed',
        message: 'Failed to persist mind-memory closure records from a runtime outcome.',
        payload: {
          cardId,
          reason: options.errorMessageFrom(error) ?? 'unknown-error',
          relationshipOutcomes: closure.relationshipOutcomes.length,
          episodicEvents: closure.episodicEvents.length,
          reinforcementEvents: closure.reinforcementEvents.length,
          reflections: closure.reflections.length,
          memoryFacts: closure.memoryFacts.length,
        },
      }, cardId)
    }
  }

  async function persistAutobiographicalEpisodes(cardIdRaw: unknown, input: {
    label: string
    events: AlicizationEpisodicEventInput[]
  }) {
    const cardId = options.normalizeCardId(cardIdRaw)
    if (input.events.length === 0)
      return

    const task = async () => {
      await options.alicizationDb.appendEpisodicEvents(input.events)
    }

    try {
      if (cardId === options.getActiveCardId()) {
        await task()
      }
      else {
        await options.withCardScope(cardId, async () => {
          await task()
        }, {
          label: `${input.label}:${cardId}`,
        })
      }
    }
    catch (error) {
      await options.appendAuditLog({
        level: 'warning',
        category: 'alicization.memory',
        action: 'autobiographical-episode-sync-failed',
        message: 'Failed to backfill autobiographical episodes from continuity or execution sync.',
        payload: {
          cardId,
          label: input.label,
          count: input.events.length,
          reason: options.errorMessageFrom(error) ?? 'unknown-error',
        },
      }, cardId)
    }
  }

  async function persistPreparedMirrorAutobiographicalEpisodes(input: {
    cardId: string
    decisionTraceId?: string | null
    turnId?: string | null
    sessionId: string
    previousMirror?: AlicizationDialogueSessionMirror | null
    mirror: AlicizationDialogueSessionMirror
  }) {
    const events = buildAutobiographicalEpisodesFromPreparedMirror(input)
    await persistAutobiographicalEpisodes(input.cardId, {
      label: 'prepared-session-mirror.autobio',
      events,
    })
  }

  async function persistSessionMirrorAutobiographicalEpisodes(input: {
    cardId: string
    decisionTraceId?: string | null
    source: string
    turnId?: string | null
    sessionId: string
    previousMirror?: AlicizationDialogueSessionMirror | null
    mirror: AlicizationDialogueSessionMirror
    taskThread?: AlicizationTaskThreadRecord | null
  }) {
    const events = buildAutobiographicalEpisodesFromSessionMirrorSync(input)
    await persistAutobiographicalEpisodes(input.cardId, {
      label: 'session-mirror.autobio',
      events,
    })
  }

  return {
    persistOutcomeClosure,
    persistAutobiographicalEpisodes,
    persistPreparedMirrorAutobiographicalEpisodes,
    persistSessionMirrorAutobiographicalEpisodes,
  }
}

export type AlicizationRuntimeMemoryClosure = ReturnType<typeof createAlicizationRuntimeMemoryClosure>
