import type {
  AlicizationAuditLogInput,
  AlicizationDreamMetabolismPayload,
  AlicizationEpisodicEventInput,
  AlicizationPersonalityState,
  AlicizationSoulFrontmatter,
  AlicizationSoulSnapshot,
} from '../../../shared/eventa'
import type { AlicizationAgentTurnRuntime } from './agent-runtime'
import type { SubconsciousCardState } from './runtime-soul'
import type { AlicizationProactiveLoopState } from './proactive-feedback'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'

import { errorMessageFrom } from '@moeru/std'

import { computeEpisodicEventSalience, sanitizeHumanlikeMemoryText } from './humanlike-memory'
import {
  clamp01,
  normalizeCoreIncarnation,
  normalizeHostAttitude,
  parseSoul,
  sanitizeText,
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
  truncateForDream: (value: string | null | undefined, maxChars: number) => string
  parseStructuredHint: (raw: string | null | undefined) => Record<string, unknown>
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
    truncateForDream,
    parseStructuredHint,
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
    dreamMaxCharsPerAssistantTurn,
    dreamMaxCharsPerUserTurn,
    dreamMaxTotalChars,
  } = options

  async function runDreamForCurrentCard(reason = 'manual'): Promise<{ processed: boolean, skippedReason?: string }> {
    const cardId = getActiveCardId()
    const state = await ensureSubconsciousState(cardId)
    const rawTurns = await getAlicizationDb().listConversationTurnsSince(state.lastDreamedAt, { limit: 2_000 })
    if (!rawTurns.length) {
      return {
        processed: false,
        skippedReason: 'no-new-turns',
      }
    }

    const sampledDescending = rawTurns.slice(0, dreamMaxTurns)
    const sampledAscending = [...sampledDescending].reverse()

    let totalChars = 0
    let sampledCount = 0
    let truncatedByChars = false
    const serializedTurns: string[] = []
    let firstSampledAt: number | null = null
    let lastSampledAt: number | null = null
    let hostDenySignals = 0
    let hostilitySignals = 0
    let warmthSignals = 0

    for (const row of sampledAscending) {
      const userText = truncateForDream(row.userText, dreamMaxCharsPerUserTurn)
      const assistantText = truncateForDream(row.assistantText, dreamMaxCharsPerAssistantTurn)
      const structuredHint = parseStructuredHint(row.structuredJson)
      const emotion = sanitizeText((structuredHint as { emotion?: unknown }).emotion)
      const rowSerialized = [
        `[${new Date(row.createdAt).toISOString()}]`,
        userText ? `U: ${userText}` : '',
        assistantText ? `A: ${assistantText}` : '',
      ].filter(Boolean).join('\n')

      if (totalChars + rowSerialized.length > dreamMaxTotalChars) {
        truncatedByChars = true
        break
      }

      totalChars += rowSerialized.length
      serializedTurns.push(rowSerialized)
      sampledCount += 1
      firstSampledAt = firstSampledAt == null ? row.createdAt : Math.min(firstSampledAt, row.createdAt)
      lastSampledAt = lastSampledAt == null ? row.createdAt : Math.max(lastSampledAt, row.createdAt)

      const combinedUser = userText.toLowerCase()
      const combinedAssistant = assistantText.toLowerCase()
      const denialMatch = /denied|拒绝|不允许|权限|intercepted/.test(combinedAssistant)
      if (denialMatch)
        hostDenySignals += 1
      if (/烦|闭嘴|滚|命令|stupid|useless|shut up|idiot/.test(combinedUser))
        hostilitySignals += 1
      if (/谢谢|辛苦|感谢|thank|appreciate|love/.test(combinedUser))
        warmthSignals += 1
      if (emotion === 'angry')
        hostilitySignals += 0.5
    }

    if (rawTurns.length > sampledCount || truncatedByChars) {
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.dream',
        action: 'alicization.dream.context.truncated',
        message: 'Dream context was truncated to hard safety caps.',
        payload: {
          reason,
          rawTurnCount: rawTurns.length,
          sampledTurnCount: sampledCount,
          discardedTurnCount: Math.max(0, rawTurns.length - sampledCount),
          maxTurns: dreamMaxTurns,
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
    const llmMetabolism = await generateDreamMetabolismWithGateway({
      serializedTurns,
      personality: dreamSoul.frontmatter.personality,
      hostAttitude: dreamSoul.frontmatter.host_attitude,
      coreIncarnation: dreamSoul.frontmatter.core_incarnation,
      activeThoughts: currentActiveThoughts,
      agentTurn: dreamAgentTurn,
      agentTurnInput: {
        turnId: dreamTurnId,
      },
    })
    const attitudeScore = hostilitySignals + hostDenySignals * 1.5 - warmthSignals
    const fallbackHostAttitude = normalizeHostAttitude(
      attitudeScore >= 3
        ? '明显戒备并带有不满，我需要谨慎收束边界'
        : attitudeScore <= -1
          ? '愿意亲近并逐渐信任我，关系正在升温'
          : dreamSoul.frontmatter.host_attitude,
    )
    const fallbackMetabolism: AlicizationDreamMetabolismPayload = {
      host_attitude: fallbackHostAttitude,
      soul_shift: {
        obedience_delta: attitudeScore >= 3 ? -0.03 : attitudeScore <= -1 ? 0.01 : 0,
        liveliness_delta: attitudeScore >= 3 ? -0.01 : 0,
        sensibility_delta: attitudeScore <= -1 ? 0.01 : 0,
      },
      next_active_thoughts: currentActiveThoughts
        .map((item: { text?: string }) => ({ text: normalizeOrganicMemoryItemText(item.text, 120) }))
        .filter((item: { text: string }) => item.text),
      explicit_demoted_thoughts: [],
      new_sediment_fragments: [],
      shattering_event: null,
    }
    const metabolism = llmMetabolism ?? fallbackMetabolism
    const hostAttitude = normalizeHostAttitude(metabolism.host_attitude || fallbackMetabolism.host_attitude)
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
    const attitudeShiftFragment = normalizedPreviousHostAttitude !== hostAttitude
      ? `[态度演变记录：从"${normalizedPreviousHostAttitude}"转变为"${hostAttitude}"]`
      : ''

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

    if (serializedTurns.length > 0) {
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.dream',
        action: 'metabolism-generated',
        message: 'Dream metabolism generated from bounded context.',
        payload: {
          reason,
          source: llmMetabolism ? 'llm' : 'heuristic',
          hostAttitude,
          obedienceDelta,
          livelinessDelta,
          sensibilityDelta,
          nextActiveThoughtCount: nextActiveThoughts.length,
          explicitDemotionCount: explicitDemotedThoughts.length,
          newSedimentCount: newSedimentFragments.length,
          shatteringEvent: shatteringEventText || null,
          sampledTurns: sampledCount,
          agentRuntime: buildAgentRuntimeAuditSnapshot(dreamAgentTurn),
        },
      })
    }

    await getAlicizationDb().appendRelationshipDynamics({
      hostAttitude,
      previousHostAttitude: normalizedPreviousHostAttitude,
      obedienceDelta,
      livelinessDelta,
      sensibilityDelta,
      source: llmMetabolism ? 'dream-llm' : 'dream-heuristic',
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
    const dreamEvents: AlicizationEpisodicEventInput[] = [{
      cardId: dreamCardId,
      turnId: dreamTurnId,
      sessionId: null,
      sourceKind: 'dream',
      provenance: 'dreamt',
      occurredAt: Date.now(),
      whereSummary: 'sleep consolidation',
      withWhom: ['host', 'self'],
      threadAnchor: sanitizeHumanlikeMemoryText(serializedTurns.at(-1) ?? '', 140) || reason,
      whatHappened: sanitizeHumanlikeMemoryText(
        [
          llmMetabolism ? 'Dream metabolism consolidated recent dialogue.' : 'Heuristic dream metabolism consolidated recent dialogue.',
          shatteringEventText ? `Shattering cue: ${shatteringEventText}` : '',
          attitudeShiftFragment || '',
        ].filter(Boolean).join(' '),
        320,
      ),
      felt: sanitizeHumanlikeMemoryText(
        shatteringEventText
          ? 'The dream pulled a high-tension memory back up and forced a deeper rewrite.'
          : 'The dream quietly settled lingering threads, fatigue, and bond pressure.',
        220,
      ),
      emotionTags: [
        shatteringEventText ? 'shattering' : 'consolidation',
        hostAttitude !== normalizedPreviousHostAttitude ? 'attitude-shift' : 'continuity',
      ],
      whatChanged: sanitizeHumanlikeMemoryText(
        [
          attitudeShiftFragment || '',
          obedienceDelta !== 0 ? `obedience ${obedienceDelta >= 0 ? '+' : ''}${obedienceDelta.toFixed(2)}` : '',
          livelinessDelta !== 0 ? `liveliness ${livelinessDelta >= 0 ? '+' : ''}${livelinessDelta.toFixed(2)}` : '',
          sensibilityDelta !== 0 ? `sensibility ${sensibilityDelta >= 0 ? '+' : ''}${sensibilityDelta.toFixed(2)}` : '',
        ].filter(Boolean).join(', '),
        220,
      ) || null,
      relationshipMeaning: sanitizeHumanlikeMemoryText(
        hostAttitude !== normalizedPreviousHostAttitude
          ? `My sense of the host shifted from "${normalizedPreviousHostAttitude}" toward "${hostAttitude}".`
          : 'The dream mainly consolidated ongoing bond pressure and unfinished feeling.',
        220,
      ),
      lesson: sanitizeHumanlikeMemoryText(
        shatteringEventText
          ? 'Strong dream tension should consolidate first because it can rewrite the bond line.'
          : 'Dream time should consolidate the unresolved line before it turns into stale residue.',
        220,
      ),
      sourceSummary: llmMetabolism ? 'dream metabolism via main gateway' : 'heuristic dream metabolism',
      confidence: llmMetabolism ? 0.72 : 0.58,
      salience: computeEpisodicEventSalience({
        confidence: llmMetabolism ? 0.72 : 0.58,
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
        llmMetabolism ? 'llm' : 'heuristic',
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
        whereSummary: 'core-incarnation reforge',
        withWhom: ['self'],
        threadAnchor: shatteringEventText || 'core incarnation reforge',
        whatHappened: 'A strong dream event forced a reforge of the core incarnation.',
        felt: 'The self-line had to be rewritten instead of merely archived.',
        emotionTags: ['dream-reforge', 'identity-rewrite'],
        whatChanged: 'Core incarnation was rewritten after a shattering dream event.',
        relationshipMeaning: 'The bond history became strong enough to alter the enduring self-line.',
        lesson: 'Severe dream pressure should be allowed to rewrite the stable self narrative.',
        sourceSummary: 'dream reforge',
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
    const latestConsolidations = await getAlicizationDb().listMemoryConsolidations?.(8).catch(() => [])
    if (Array.isArray(latestConsolidations) && latestConsolidations.length > 0) {
      const refinedConsolidations = await generateMemoryConsolidationRefinementWithGateway({
        serializedTurns,
        consolidations: latestConsolidations,
        hostAttitude,
        coreIncarnation: nextCoreIncarnation,
        agentTurn: dreamAgentTurn,
        agentTurnInput: {
          turnId: `${dreamTurnId}:consolidation`,
        },
      }).catch(() => null)
      if (refinedConsolidations && refinedConsolidations.length > 0) {
        await getAlicizationDb().upsertMemoryConsolidations?.(
          latestConsolidations.map((record: AlicizationMemoryConsolidationRecord) => {
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
          }),
        ).catch(() => {})
      }
      if (firstSampledAt != null && lastSampledAt != null) {
        const autobiographicalSummaries = await generateDreamAutobiographicalSummariesWithGateway({
          serializedTurns,
          consolidations: latestConsolidations,
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
      ...(attitudeShiftFragment
        ? [{ text: attitudeShiftFragment, sourceKind: 'attitude-shift' as const }]
        : []),
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
