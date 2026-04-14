import type {
  AlicizationAuditLogInput,
  AlicizationDreamMetabolismPayload,
  AlicizationPersonalityState,
  AlicizationSoulFrontmatter,
  AlicizationSoulSnapshot,
} from '../../../shared/eventa'
import type { AlicizationAgentTurnRuntime } from './agent-runtime'
import type { SubconsciousCardState } from './runtime-soul'

import { errorMessageFrom } from '@moeru/std'

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
  clampNeed: (value: number) => number
  dreamMaxTurns: number
  dreamMaxCharsPerAssistantTurn: number
  dreamMaxCharsPerUserTurn: number
  dreamMaxTotalChars: number
}

export function createAlicizationDreamRuntime(options: CreateAlicizationDreamRuntimeOptions) {
  const {
    ensureSubconsciousState,
    getAlicizationDb,
    getSoulSnapshot,
    bootstrap,
    buildMainGatewayAgentTurnId,
    getActiveCardId,
    openAgentTurn,
    generateDreamMetabolismWithGateway,
    generateCoreIncarnationReforgeWithGateway,
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
    return {
      processed: true,
    }
  }

  return {
    runDreamForCurrentCard,
  }
}
