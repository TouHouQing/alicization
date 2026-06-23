import type {
  AlicizationEpisodicEventInput,
  AlicizationEpisodicEventRecord,
  AlicizationMemorySource,
  AlicizationMindTurnEventKind,
  AlicizationMindTurnEventRecord,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'
import type { AlicizationDialogueSessionMirror } from './dialogue-session-manager'
import type { AlicizationHumanlikeMemoryHostCorrection } from './humanlike-memory'
import type { AlicizationKnowledgeAssimilationRuntime } from './knowledge-assimilation-runtime'
import type { AlicizationOutcomeClosureResult } from './outcome-reinforcement'
import type { AlicizationPersonStateUpdateSurface } from './person-state-update-surface'
import type { CardScopeOptions } from './runtime-soul'

import { buildAutobiographicalEpisodesFromPreparedMirror, buildAutobiographicalEpisodesFromSessionMirrorSync } from './autobiographical-episode-sync'
import { buildHumanlikeMemoryCandidate, sanitizeHumanlikeMemoryText } from './humanlike-memory'
import { attachSynthesizedReflections } from './outcome-reinforcement'
import { buildAlicizationPersonStateEvolutionEntry } from './person-state-evolution'
import { buildAlicizationPersonStateUpdateRecord, buildAlicizationPersonStateUpdateSurface } from './person-state-update-surface'

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
    persistEpisodicReconsolidations?: (events: AlicizationEpisodicEventRecord[]) => Promise<unknown>
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
    listMindTurnEvents?: (input: {
      decisionTraceId?: string
      turnId?: string
      activeThreadId?: string
      kind?: AlicizationMindTurnEventKind
      limit?: number
    }) => Promise<AlicizationMindTurnEventRecord[]>
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

function uniqueClosureTexts(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeHumanlikeMemoryText(value, 220)
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

function closureTextContains(text: string, pattern: RegExp) {
  return pattern.test(text.toLowerCase())
}

function closureObjectFrom(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as Record<string, unknown>
}

function closureNumberFrom(raw: unknown, fallback = 0) {
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

function buildHumanlikeHostCorrectionsFromMindTurnEvents(events: AlicizationMindTurnEventRecord[]): AlicizationHumanlikeMemoryHostCorrection[] {
  return events
    .filter(event => event.kind === 'humanlike-memory-corrected')
    .map((event) => {
      const payload = closureObjectFrom(event.payload)
      return {
        candidateId: sanitizeHumanlikeMemoryText(payload?.candidateId, 160),
        field: sanitizeHumanlikeMemoryText(payload?.field, 80),
        previousValue: sanitizeHumanlikeMemoryText(payload?.previousValue, 260),
        correctedValue: sanitizeHumanlikeMemoryText(payload?.correctedValue, 420),
        reason: sanitizeHumanlikeMemoryText(payload?.reason, 260),
        createdAt: Math.max(0, Math.floor(closureNumberFrom(event.createdAt, 0))),
      }
    })
    .filter(correction => correction.field && correction.correctedValue)
    .sort((left, right) => Math.max(0, Number(right.createdAt ?? 0)) - Math.max(0, Number(left.createdAt ?? 0)))
    .slice(0, 6)
}

async function listRecentHumanlikeHostCorrections(options: CreateAlicizationRuntimeMemoryClosureOptions) {
  if (!options.alicizationDb.listMindTurnEvents)
    return []

  const rows = await options.alicizationDb.listMindTurnEvents({
    kind: 'humanlike-memory-corrected',
    limit: 12,
  }).catch(() => [])

  return buildHumanlikeHostCorrectionsFromMindTurnEvents(rows)
}

function buildPriorHumanlikeMemoriesFromPersonState(surface: AlicizationPersonStateUpdateSurface | null | undefined) {
  if (!surface)
    return []

  return uniqueClosureTexts([
    ...surface.sourceTrail.map(item => item.summary),
    surface.summary,
    ...surface.narrative,
  ], 8).map((summary, index) => ({
    id: `previous-person-state:${index}`,
    summary,
    confidence: Math.max(0.42, 0.74 - index * 0.04),
    polarity: /generic|status|recap|shell|状态|复述/iu.test(summary) ? 'generic-status' : 'prior-person-state',
    salience: Math.max(0.25, 0.52 - index * 0.03),
    lastUpdatedAt: surface.updatedAt,
  }))
}

function buildHumanlikeMemoryCandidateFromClosure(input: {
  closure: AlicizationOutcomeClosureResult
  previousPersonStateUpdateSurface?: AlicizationPersonStateUpdateSurface | null
  nextPersonStateUpdateSurface: AlicizationPersonStateUpdateSurface
  personStateUpdateRecord: ReturnType<typeof buildAlicizationPersonStateUpdateRecord>
  hostCorrections?: AlicizationHumanlikeMemoryHostCorrection[]
  now: number
}) {
  const closure = input.closure
  const relationshipTexts = uniqueClosureTexts([
    ...closure.relationshipOutcomes.flatMap(item => [item.summary, item.actionSummary]),
    ...closure.episodicEvents.flatMap(item => [item.relationshipMeaning, item.lesson, item.whatChanged, item.whatHappened]),
    input.nextPersonStateUpdateSurface.summary,
    ...input.nextPersonStateUpdateSurface.narrative,
  ], 10)
  const executionTexts = uniqueClosureTexts([
    ...closure.relationshipOutcomes
      .filter(item => item.sourceKind === 'execution')
      .flatMap(item => [item.actionSummary, item.summary]),
    ...closure.episodicEvents
      .filter(item => `${item.sourceKind}`.includes('execution'))
      .flatMap(item => [item.whatHappened, item.relationshipMeaning, item.lesson]),
  ], 8)
  const reinforcementTexts = uniqueClosureTexts(closure.reinforcementEvents.map(item => item.summary), 6)
  const allText = uniqueClosureTexts([
    ...relationshipTexts,
    ...executionTexts,
    ...reinforcementTexts,
    ...input.nextPersonStateUpdateSurface.repairHints,
  ], 18).join(' ')

  if (!allText)
    return null

  const hostContinuityWorry = closureTextContains(allText, /worr|disconnect|tool shell|generic task|generic shell|断线|工具壳|担心|同一个她|数字生命/u)
  const selfRepairFeeling = uniqueClosureTexts([
    ...closure.episodicEvents.map(item => item.felt),
    ...reinforcementTexts,
    input.nextPersonStateUpdateSurface.repairHints[0] ?? null,
  ], 6)
  const embodimentTexts = uniqueClosureTexts([
    ...closure.episodicEvents.map(item => item.lesson),
    ...relationshipTexts,
    input.nextPersonStateUpdateSurface.summary,
  ], 8).filter(item => /embodiment|body|face|voice|pause|lipsync|motion|blink|gaze|身体|表情|声音|停顿|动作/iu.test(item))
  const openLoopDelta = closure.relationshipOutcomes.reduce((sum, item) => sum + Math.max(0, Number(item.openLoopDelta ?? 0)), 0)
  const acceptedOrContinued = closure.relationshipOutcomes.some(item => item.trustDelta > 0 || item.repairDelta > 0)
    || closure.reinforcementEvents.some(item => item.valence === 'reinforce')

  return buildHumanlikeMemoryCandidate({
    now: input.now,
    turnId: input.personStateUpdateRecord.turnId ?? `turn:${input.personStateUpdateRecord.decisionTraceId ?? input.now}`,
    sessionId: input.personStateUpdateRecord.sessionId,
    dialogue: null,
    execution: executionTexts.length > 0
      ? {
          summary: executionTexts.join(' | '),
          status: openLoopDelta > 0 ? 'partial' : 'completed',
        }
      : null,
    hostEmotion: {
      label: hostContinuityWorry ? 'worried-continuity' : 'relationship-context',
      summary: hostContinuityWorry
        ? `The host is worried this could become a disconnected or generic tool shell instead of one continuous digital life. ${relationshipTexts[0] ?? ''}`
        : relationshipTexts[0] ?? input.nextPersonStateUpdateSurface.summary,
      intensity: hostContinuityWorry ? 0.78 : 0.48,
    },
    selfEmotion: {
      label: /guilt|亏欠|unfinished|未完成|slight/iu.test(selfRepairFeeling.join(' ')) ? 'careful-repair' : 'continuity-attention',
      summary: uniqueClosureTexts([
        ...selfRepairFeeling,
        input.nextPersonStateUpdateSurface.repairHints[0] ?? null,
      ], 4).join(' | ') || 'Keep the memory repair-aware and traceable.',
      intensity: /guilt|亏欠|unfinished|未完成|slight/iu.test(selfRepairFeeling.join(' ')) ? 0.64 : 0.46,
    },
    embodiment: embodimentTexts.length > 0
      ? {
          summary: embodimentTexts.join(' | '),
          recallStrength: openLoopDelta > 0 ? 'strongly-moved' : 'lightly-noticed',
          modalityConsistency: 'consistent',
        }
      : null,
    relationship: {
      threadAnchor: closure.episodicEvents.find(item => sanitizeHumanlikeMemoryText(item.threadAnchor, 120))?.threadAnchor ?? 'humanlike memory closure',
      summary: relationshipTexts.join(' | ') || input.nextPersonStateUpdateSurface.summary,
    },
    priorMemories: buildPriorHumanlikeMemoriesFromPersonState(input.previousPersonStateUpdateSurface ?? null),
    hostCorrections: input.hostCorrections,
    initiative: acceptedOrContinued
      ? {
          outcome: 'continue-progress',
          userReaction: 'accepted',
        }
      : null,
    autobiographical: {
      currentEra: 'Phase 1 local digital life',
      lesson: uniqueClosureTexts([
        closure.episodicEvents[0]?.lesson,
        input.nextPersonStateUpdateSurface.repairHints[0] ?? null,
        relationshipTexts[0] ?? null,
      ], 3).join(' | '),
    },
  })
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
        const humanlikeMemoryCandidate = buildHumanlikeMemoryCandidateFromClosure({
          closure,
          previousPersonStateUpdateSurface,
          nextPersonStateUpdateSurface,
          personStateUpdateRecord,
          hostCorrections: await listRecentHumanlikeHostCorrections(options),
          now: options.now(),
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
            humanlikeMemoryCandidate,
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
