import type {
  AlicizationAuditLogInput,
  AlicizationDreamMetabolismPayload,
  AlicizationEpisodicEventInput,
  AlicizationPersonalityState,
  AlicizationSoulFrontmatter,
  AlicizationSoulSnapshot,
} from '../../../shared/eventa'
import type { AlicizationAgentTurnRuntime } from './agent-runtime'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'
import type { AlicizationProactiveLoopState } from './proactive-feedback'
import type { SubconsciousCardState } from './runtime-soul'

import { errorMessageFrom } from '@moeru/std'

import { computeEpisodicEventSalience, sanitizeHumanlikeMemoryText } from './humanlike-memory'
import {
  clamp01,
  normalizeCoreIncarnation,
  normalizeHostAttitude,
  parseSoul,
  syncPersonalityBaselineInBody,
  toSoulContent,
} from './runtime-soul'

interface CreateAlicizationDreamRuntimeOptions {
  ensureSubconsciousState: (cardId: string) => Promise<SubconsciousCardState>
  ensureProactiveLoopState: (cardId: string) => Promise<AlicizationProactiveLoopState>
  getAlicizationDb: () => any
  getSoulSnapshot: () => AlicizationSoulSnapshot | null
  bootstrap: () => Promise<AlicizationSoulSnapshot>
  buildMainGatewayAgentTurnId: (...segments: Array<unknown>) => string
  getActiveCardId: () => string
  openAgentTurn: (input: {
    cardId: string
    turnId: string
  }) => Promise<AlicizationAgentTurnRuntime>
  generateDreamMetabolismWithGateway: (input: any) => Promise<AlicizationDreamMetabolismPayload | null>
  generateCoreIncarnationReforgeWithGateway: (input: any) => Promise<{ core_incarnation?: string } | null>
  generateMemoryConsolidationRefinementWithGateway: (input: {
    serializedTurns: string[]
    consolidations: AlicizationMemoryConsolidationRecord[]
    hostAttitude: string
    coreIncarnation: string
    agentTurn?: AlicizationAgentTurnRuntime | null
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    }
  }) => Promise<Array<Pick<AlicizationMemoryConsolidationRecord, 'id' | 'summary' | 'lesson' | 'cues' | 'confidence'>> | null>
  generateDreamAutobiographicalSummariesWithGateway: (input: {
    serializedTurns: string[]
    consolidations: AlicizationMemoryConsolidationRecord[]
    hostAttitude: string
    coreIncarnation: string
    periodStartedAt: number
    periodEndedAt: number
    agentTurn?: AlicizationAgentTurnRuntime | null
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    }
  }) => Promise<Array<Pick<AlicizationMemoryConsolidationRecord, 'periodKey' | 'facet' | 'summary' | 'lesson' | 'cues' | 'confidence'>> | null>
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  buildAgentRuntimeAuditSnapshot: (agentTurn?: AlicizationAgentTurnRuntime | null) => unknown
  hydrateAgentTurnFromCurrentCardState: (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
  }) => Promise<void>
  truncateForDream: (value: string | null | undefined, maxChars: number) => string
  clampSoulDelta: (value: number, maxAbs?: number) => number
  normalizeOrganicMemoryItemText: (raw: unknown, maxChars: number) => string
  normalizeOrganicMemoryItemArray: (
    raw: unknown,
    options: {
      maxItems: number
      maxChars: number
    },
  ) => Array<{ text: string }>
  sanitizeBriefText: (raw: string, maxChars?: number) => string
  queueSoulMutation: (
    task: (current: AlicizationSoulSnapshot) => Promise<AlicizationSoulSnapshot>,
  ) => Promise<AlicizationSoulSnapshot | void>
  snapshotFromContent: (content: string) => AlicizationSoulSnapshot
  persistSubconsciousState: (cardId: string, state: SubconsciousCardState) => Promise<void>
  persistProactiveLoopState: (cardIdRaw: unknown, state: AlicizationProactiveLoopState) => Promise<void>
  syncSessionMirrorFromCurrentCardState?: (input: {
    cardId: string
    decisionTraceId?: string | null
    source: string
    turnId?: string | null
    sessionId?: string | null
  }) => Promise<void>
  recoverProactiveRhythmAfterDream: (state: AlicizationProactiveLoopState, at?: number) => AlicizationProactiveLoopState
  clampNeed: (value: number) => number
  dreamMaxTurns: number
  dreamMaxCharsPerAssistantTurn: number
  dreamMaxCharsPerUserTurn: number
  dreamMaxTotalChars: number
}

export function createAlicizationDreamRuntime(options: CreateAlicizationDreamRuntimeOptions) {
  const {
    ensureSubconsciousState,
    ensureProactiveLoopState,
    getAlicizationDb,
    getSoulSnapshot,
    bootstrap,
    buildMainGatewayAgentTurnId,
    getActiveCardId,
    openAgentTurn,
    generateDreamMetabolismWithGateway,
    generateCoreIncarnationReforgeWithGateway,
    generateMemoryConsolidationRefinementWithGateway,
    generateDreamAutobiographicalSummariesWithGateway,
    appendAuditLog,
    buildAgentRuntimeAuditSnapshot,
    hydrateAgentTurnFromCurrentCardState,
    clampSoulDelta,
    normalizeOrganicMemoryItemText,
    normalizeOrganicMemoryItemArray,
    sanitizeBriefText,
    queueSoulMutation,
    snapshotFromContent,
    persistSubconsciousState,
    persistProactiveLoopState,
    syncSessionMirrorFromCurrentCardState,
    recoverProactiveRhythmAfterDream,
    clampNeed,
    dreamMaxTurns,
    dreamMaxTotalChars,
  } = options

  async function runDreamForCurrentCard(reason = 'manual'): Promise<{ processed: boolean, skippedReason?: string }> {
    const cardId = getActiveCardId()
    const state = await ensureSubconsciousState(cardId)
    const listedConsolidations = await getAlicizationDb().listMemoryConsolidations?.(100).catch(() => [])
    const newConsolidations = (Array.isArray(listedConsolidations) ? listedConsolidations : [])
      .filter((record: AlicizationMemoryConsolidationRecord) => (
        Number.isFinite(record.updatedAt)
        && record.updatedAt > state.lastDreamedAt
        && Boolean(sanitizeHumanlikeMemoryText(record.summary, 320))
      ))
    if (newConsolidations.length === 0) {
      return {
        processed: false,
        skippedReason: 'no-new-consolidations',
      }
    }

    const sampledAscending = [...newConsolidations]
      .slice(0, Math.max(1, dreamMaxTurns))
      .sort((left, right) => (
        left.periodEndedAt - right.periodEndedAt
        || left.updatedAt - right.updatedAt
        || left.id.localeCompare(right.id)
      ))

    let totalChars = 0
    let sampledCount = 0
    let truncatedByChars = false
    const serializedConsolidationEvidence: string[] = []
    let firstSampledAt: number | null = null
    let lastSampledAt: number | null = null
    const sourceConsolidations: AlicizationMemoryConsolidationRecord[] = []

    for (const record of sampledAscending) {
      const recordSerialized = JSON.stringify({
        version: 'alicization-dream-consolidation-evidence-v1',
        id: sanitizeHumanlikeMemoryText(record.id, 160),
        kind: record.kind,
        facet: record.facet ?? null,
        periodKey: sanitizeHumanlikeMemoryText(record.periodKey, 96),
        periodStartedAt: record.periodStartedAt,
        periodEndedAt: record.periodEndedAt,
        summary: sanitizeHumanlikeMemoryText(record.summary, 320),
        lesson: sanitizeHumanlikeMemoryText(record.lesson, 220) || null,
        cues: record.cues
          .slice(0, 8)
          .map((cue: string) => sanitizeHumanlikeMemoryText(cue, 120))
          .filter(Boolean),
        confidence: record.confidence,
        dominantProvenance: record.dominantProvenance,
        derivedEventIds: record.derivedEventIds
          .slice(0, 16)
          .map((eventId: string) => sanitizeHumanlikeMemoryText(eventId, 160))
          .filter(Boolean),
        updatedAt: record.updatedAt,
      })

      if (totalChars + recordSerialized.length > dreamMaxTotalChars) {
        truncatedByChars = true
        break
      }

      totalChars += recordSerialized.length
      serializedConsolidationEvidence.push(recordSerialized)
      sourceConsolidations.push(record)
      sampledCount += 1
      firstSampledAt = firstSampledAt == null
        ? record.periodStartedAt
        : Math.min(firstSampledAt, record.periodStartedAt)
      lastSampledAt = lastSampledAt == null
        ? record.periodEndedAt
        : Math.max(lastSampledAt, record.periodEndedAt)
    }

    if (sourceConsolidations.length === 0) {
      return {
        processed: false,
        skippedReason: 'no-usable-consolidations',
      }
    }

    if (newConsolidations.length > sampledCount || truncatedByChars) {
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.dream',
        action: 'alicization.dream.context.truncated',
        message: 'Dream context was truncated to hard safety caps.',
        payload: {
          reason,
          sourceConsolidationCount: newConsolidations.length,
          sampledConsolidationCount: sampledCount,
          discardedConsolidationCount: Math.max(0, newConsolidations.length - sampledCount),
          maxConsolidations: dreamMaxTurns,
          maxTotalChars: dreamMaxTotalChars,
          totalChars,
          truncatedByChars,
        },
      })
    }

    const dreamSoul = getSoulSnapshot() ?? await bootstrap()
    const currentActiveThoughts = await getAlicizationDb().listActiveThoughts().catch(() => [])
    const dreamCardId = getActiveCardId()
    const dreamTurnId = buildMainGatewayAgentTurnId('dream', dreamCardId, Date.now())
    const dreamAgentTurn = await openAgentTurn({
      cardId: dreamCardId,
      turnId: dreamTurnId,
    })
    await hydrateAgentTurnFromCurrentCardState({
      agentTurn: dreamAgentTurn,
      cardId: dreamCardId,
    })
    const llmMetabolism = await generateDreamMetabolismWithGateway({
      serializedTurns: serializedConsolidationEvidence,
      personality: dreamSoul.frontmatter.personality,
      hostAttitude: dreamSoul.frontmatter.host_attitude,
      coreIncarnation: dreamSoul.frontmatter.core_incarnation,
      activeThoughts: currentActiveThoughts,
      agentTurn: dreamAgentTurn,
      agentTurnInput: {
        turnId: dreamTurnId,
      },
    })
    if (!llmMetabolism) {
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.dream',
        action: 'metabolism-provider-unavailable',
        message: 'Dream metabolism was skipped because the Provider returned no valid structured result.',
        payload: {
          reason,
          sampledConsolidations: sampledCount,
          agentRuntime: buildAgentRuntimeAuditSnapshot(dreamAgentTurn),
        },
      })
      return {
        processed: false,
        skippedReason: 'provider-unavailable',
      }
    }
    const metabolism = llmMetabolism
    const hostAttitude = normalizeHostAttitude(metabolism.host_attitude)
    const obedienceDelta = clampSoulDelta(metabolism.soul_shift.obedience_delta)
    const livelinessDelta = clampSoulDelta(metabolism.soul_shift.liveliness_delta)
    const sensibilityDelta = clampSoulDelta(metabolism.soul_shift.sensibility_delta)
    const explicitDemotedThoughts = normalizeOrganicMemoryItemArray(metabolism.explicit_demoted_thoughts, {
      maxItems: 8,
      maxChars: 120,
    })
    const nextActiveThoughts = normalizeOrganicMemoryItemArray(metabolism.next_active_thoughts, {
      maxItems: 5,
      maxChars: 120,
    })
    const newSedimentFragments = normalizeOrganicMemoryItemArray(metabolism.new_sediment_fragments, {
      maxItems: 8,
      maxChars: 160,
    })
    const shatteringEventText = normalizeOrganicMemoryItemText(metabolism.shattering_event?.text, 280)
    const normalizedPreviousHostAttitude = normalizeHostAttitude(dreamSoul.frontmatter.host_attitude)

    let reforgedCoreIncarnation = ''
    let reforgeFailureReason = ''
    if (shatteringEventText) {
      try {
        const reforgeResult = await generateCoreIncarnationReforgeWithGateway({
          coreIncarnation: dreamSoul.frontmatter.core_incarnation,
          shatteringEventText,
          hostAttitude,
          agentTurn: dreamAgentTurn,
          agentTurnInput: {
            turnId: `${dreamTurnId}:reforge`,
          },
        })
        reforgedCoreIncarnation = normalizeCoreIncarnation(reforgeResult?.core_incarnation ?? '')
      }
      catch (error) {
        reforgeFailureReason = sanitizeBriefText(error instanceof Error ? error.message : String(error), 240)
      }
    }

    if (serializedConsolidationEvidence.length > 0) {
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.dream',
        action: 'metabolism-generated',
        message: 'Dream metabolism generated from bounded long-term consolidation context.',
        payload: {
          reason,
          source: 'llm',
          hostAttitude,
          obedienceDelta,
          livelinessDelta,
          sensibilityDelta,
          nextActiveThoughtCount: nextActiveThoughts.length,
          explicitDemotionCount: explicitDemotedThoughts.length,
          newSedimentCount: newSedimentFragments.length,
          shatteringEvent: shatteringEventText || null,
          sampledConsolidations: sampledCount,
          agentRuntime: buildAgentRuntimeAuditSnapshot(dreamAgentTurn),
          dreamHydrationSnapshot: (() => {
            const snapshot = dreamAgentTurn.getSessionSnapshot()
            return {
              agentSessionId: snapshot.id,
              conversationSessionId: snapshot.conversationSessionId,
              continuityLabels: snapshot.continuitySignals.map(signal => signal.label),
              continuitySources: snapshot.continuitySignals.map(signal => ({
                label: signal.label,
                source: typeof signal.metadata?.source === 'string' ? signal.metadata.source : null,
                turnId: typeof signal.metadata?.turnId === 'string' ? signal.metadata.turnId : null,
                outcome: typeof signal.metadata?.outcome === 'string' ? signal.metadata.outcome : null,
                state: signal.state,
              })),
            }
          })(),
        },
      })
    }

    await getAlicizationDb().appendRelationshipDynamics({
      hostAttitude,
      previousHostAttitude: normalizedPreviousHostAttitude,
      obedienceDelta,
      livelinessDelta,
      sensibilityDelta,
      source: 'dream-llm',
      createdAt: Date.now(),
    }).catch(async (error: unknown) => {
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.dream',
        action: 'relationship-dynamics-write-failed',
        message: 'Failed to persist relationship dynamics after dream metabolism.',
        payload: {
          reason: errorMessageFrom(error) ?? 'unknown-error',
        },
      })
    })

    const previousCoreIncarnation = normalizeCoreIncarnation(dreamSoul.frontmatter.core_incarnation)
    const nextCoreIncarnation = reforgedCoreIncarnation || previousCoreIncarnation
    const dreamEventText = shatteringEventText
      || newSedimentFragments[0]?.text
      || nextActiveThoughts[0]?.text
      || hostAttitude
    const dreamEvents: AlicizationEpisodicEventInput[] = [{
      cardId: dreamCardId,
      turnId: dreamTurnId,
      sessionId: null,
      sourceKind: 'dream',
      provenance: 'dreamt',
      occurredAt: Date.now(),
      whereSummary: null,
      withWhom: ['host', 'self'],
      threadAnchor: sanitizeHumanlikeMemoryText(dreamEventText, 140),
      whatHappened: sanitizeHumanlikeMemoryText(dreamEventText, 320),
      felt: null,
      emotionTags: [
        shatteringEventText ? 'shattering' : 'consolidation',
        hostAttitude !== normalizedPreviousHostAttitude ? 'attitude-shift' : 'continuity',
      ],
      whatChanged: hostAttitude !== normalizedPreviousHostAttitude
        ? sanitizeHumanlikeMemoryText(hostAttitude, 220)
        : null,
      relationshipMeaning: sanitizeHumanlikeMemoryText(hostAttitude, 220),
      lesson: null,
      sourceSummary: null,
      confidence: 0.72,
      salience: computeEpisodicEventSalience({
        confidence: 0.72,
        sourceKind: 'dream',
        emotionalWeight: shatteringEventText ? 1 : 0.4,
        existing: shatteringEventText ? 0.86 : 0.62,
      }),
      sceneAttachment: 0.16,
      consolidationPriority: shatteringEventText ? 0.94 : 0.76,
      derivedFrom: [
        { kind: 'dream', id: dreamTurnId, label: reason },
      ],
      tags: [
        'dream',
        'llm',
        shatteringEventText ? 'shattering' : 'quiet-consolidation',
      ],
    }]
    if (reforgedCoreIncarnation && reforgedCoreIncarnation !== previousCoreIncarnation) {
      dreamEvents.push({
        cardId: dreamCardId,
        turnId: `${dreamTurnId}:reforge`,
        sessionId: null,
        sourceKind: 'dream-reforge',
        provenance: 'reconstructed',
        occurredAt: Date.now(),
        whereSummary: null,
        withWhom: ['self'],
        threadAnchor: shatteringEventText,
        whatHappened: shatteringEventText,
        felt: null,
        emotionTags: ['dream-reforge', 'identity-rewrite'],
        whatChanged: reforgedCoreIncarnation,
        relationshipMeaning: hostAttitude,
        lesson: null,
        sourceSummary: null,
        confidence: 0.64,
        salience: 0.92,
        sceneAttachment: 0.08,
        consolidationPriority: 1,
        derivedFrom: [
          { kind: 'dream', id: dreamTurnId, label: 'dream metabolism' },
        ],
        tags: ['dream', 'identity', 'reforge'],
      })
    }
    await getAlicizationDb().appendEpisodicEvents(dreamEvents).catch(async (error: unknown) => {
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.dream',
        action: 'episodic-event-write-failed',
        message: 'Failed to persist dream episodic events.',
        payload: {
          reason: errorMessageFrom(error) ?? 'unknown-error',
          count: dreamEvents.length,
        },
      })
    })
    if (sourceConsolidations.length > 0) {
      let autobiographicalSourceConsolidations = sourceConsolidations
      const refinedConsolidations = await generateMemoryConsolidationRefinementWithGateway({
        serializedTurns: serializedConsolidationEvidence,
        consolidations: sourceConsolidations,
        hostAttitude,
        coreIncarnation: nextCoreIncarnation,
        agentTurn: dreamAgentTurn,
        agentTurnInput: {
          turnId: `${dreamTurnId}:consolidation`,
        },
      }).catch(() => null)
      if (refinedConsolidations && refinedConsolidations.length > 0) {
        autobiographicalSourceConsolidations = sourceConsolidations.map((record: AlicizationMemoryConsolidationRecord) => {
          const refined = refinedConsolidations.find(item => item.id === record.id)
          if (!refined)
            return record
          return {
            ...record,
            summary: sanitizeHumanlikeMemoryText(refined.summary, 320) || record.summary,
            lesson: sanitizeHumanlikeMemoryText(refined.lesson, 220) || record.lesson,
            cues: Array.isArray(refined.cues) && refined.cues.length > 0
              ? refined.cues.map(item => sanitizeHumanlikeMemoryText(item, 120)).filter(Boolean)
              : record.cues,
            confidence: Number.isFinite(refined.confidence) ? Math.max(record.confidence, Math.min(1, refined.confidence)) : record.confidence,
            updatedAt: Date.now(),
          } satisfies AlicizationMemoryConsolidationRecord
        })
        await getAlicizationDb().upsertMemoryConsolidations?.(
          autobiographicalSourceConsolidations,
        ).catch(() => {})
      }
      if (firstSampledAt != null && lastSampledAt != null) {
        const autobiographicalSummaries = await generateDreamAutobiographicalSummariesWithGateway({
          serializedTurns: serializedConsolidationEvidence,
          consolidations: autobiographicalSourceConsolidations,
          hostAttitude,
          coreIncarnation: nextCoreIncarnation,
          periodStartedAt: firstSampledAt,
          periodEndedAt: lastSampledAt,
          agentTurn: dreamAgentTurn,
          agentTurnInput: {
            turnId: `${dreamTurnId}:autobiographical`,
          },
        }).catch(() => null)
        if (autobiographicalSummaries && autobiographicalSummaries.length > 0) {
          const periodDateKey = new Date(lastSampledAt).toISOString().slice(0, 10)
          await getAlicizationDb().upsertMemoryConsolidations?.(
            autobiographicalSummaries.map((item, index) => ({
              id: `autobiographical:${item.facet ?? 'phase'}:${item.periodKey || periodDateKey}:${index}`,
              kind: 'autobiographical' as const,
              facet: item.facet ?? 'phase',
              periodKey: sanitizeHumanlikeMemoryText(item.periodKey || periodDateKey, 96) || periodDateKey,
              periodStartedAt: firstSampledAt,
              periodEndedAt: lastSampledAt,
              summary: sanitizeHumanlikeMemoryText(item.summary, 320),
              lesson: sanitizeHumanlikeMemoryText(item.lesson, 220) || null,
              cues: Array.isArray(item.cues) ? item.cues.map(value => sanitizeHumanlikeMemoryText(value, 120)).filter(Boolean) : [],
              confidence: Number.isFinite(item.confidence) ? Math.max(0.4, Math.min(1, item.confidence)) : 0.68,
              dominantProvenance: 'dreamt',
              derivedEventIds: dreamEvents.map(event => event.turnId || event.id || '').filter(Boolean),
              updatedAt: Date.now(),
            })),
          ).catch(() => {})
        }
      }
    }

    if (
      obedienceDelta !== 0
      || livelinessDelta !== 0
      || sensibilityDelta !== 0
      || hostAttitude !== normalizedPreviousHostAttitude
      || nextCoreIncarnation !== previousCoreIncarnation
    ) {
      await queueSoulMutation(async (current) => {
        const parsed = parseSoul(current.content)
        const nextPersonality: AlicizationPersonalityState = {
          obedience: clamp01(parsed.frontmatter.personality.obedience + obedienceDelta),
          liveliness: clamp01(parsed.frontmatter.personality.liveliness + livelinessDelta),
          sensibility: clamp01(parsed.frontmatter.personality.sensibility + sensibilityDelta),
        }
        const nextFrontmatter: AlicizationSoulFrontmatter = {
          ...parsed.frontmatter,
          host_attitude: hostAttitude,
          core_incarnation: nextCoreIncarnation,
          personality: nextPersonality,
        }
        const syncedBody = syncPersonalityBaselineInBody(parsed.body, nextPersonality)
        return snapshotFromContent(toSoulContent(nextFrontmatter, syncedBody))
      })
    }

    await getAlicizationDb().replaceActiveThoughts(nextActiveThoughts).catch(async (error: unknown) => {
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.dream',
        action: 'active-thoughts-write-failed',
        message: 'Failed to replace active thoughts after dream metabolism.',
        payload: {
          reason: error instanceof Error ? error.message : String(error),
        },
      })
    })

    const subconsciousFragments = [
      ...explicitDemotedThoughts.map(item => ({ text: item.text, sourceKind: 'active-demotion' as const })),
      ...newSedimentFragments.map(item => ({ text: item.text, sourceKind: 'dream-fragment' as const })),
      ...(
        reforgedCoreIncarnation && previousCoreIncarnation && previousCoreIncarnation !== reforgedCoreIncarnation
          ? [{ text: previousCoreIncarnation, sourceKind: 'former-core-incarnation' as const }]
          : []
      ),
      ...(
        shatteringEventText && !reforgedCoreIncarnation
          ? [{ text: shatteringEventText, sourceKind: 'unforged-shattering-event' as const }]
          : []
      ),
    ]
    if (subconsciousFragments.length > 0) {
      await getAlicizationDb().appendSubconsciousFragments(subconsciousFragments).catch(async (error: unknown) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.dream',
          action: 'subconscious-fragments-write-failed',
          message: 'Failed to append subconscious fragments after dream metabolism.',
          payload: {
            reason: error instanceof Error ? error.message : String(error),
            count: subconsciousFragments.length,
          },
        })
      })
    }

    if (shatteringEventText) {
      if (reforgedCoreIncarnation) {
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.dream',
          action: 'core-incarnation-reforged',
          message: 'Successfully reforged core incarnation after shattering event.',
          payload: {
            hadPreviousCoreIncarnation: Boolean(previousCoreIncarnation),
            shatteringEventText,
          },
        })
      }
      else {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.dream',
          action: 'core-incarnation-reforge-failed',
          message: 'Failed to reforge core incarnation; shattering event was archived instead.',
          payload: {
            shatteringEventText,
            reason: reforgeFailureReason || 'empty-reforge-result',
          },
        })
      }
    }

    const now = Date.now()
    const nextState: SubconsciousCardState = {
      ...state,
      lastDreamedAt: now,
      fatigue: clampNeed(Math.max(0, state.fatigue - 20)),
      updatedAt: now,
      lastSavedAt: now,
    }
    await persistSubconsciousState(getActiveCardId(), nextState)
    const proactiveLoopState = await ensureProactiveLoopState(cardId)
    await persistProactiveLoopState(cardId, recoverProactiveRhythmAfterDream(proactiveLoopState, now))
    await syncSessionMirrorFromCurrentCardState?.({
      cardId,
      decisionTraceId: null,
      source: 'dream',
      turnId: dreamTurnId,
    }).catch(() => {})
    return {
      processed: true,
    }
  }

  return {
    runDreamForCurrentCard,
  }
}
