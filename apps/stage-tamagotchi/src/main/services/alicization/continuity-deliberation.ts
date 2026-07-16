import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationDigitalLifeSpineSnapshot } from './digital-life-spine'

export type AlicizationContinuityDeliberationKind
  = | 'none'
    | 'memory-follow-up'
    | 'dialogue-carry'
    | 'execution-callback'

export type AlicizationContinuityArcStage
  = | 'none'
    | 'mirror-carry'
    | 'hold-for-opening'
    | 'gentle-reopen'
    | 'same-thread-continuation'

export type AlicizationContinuityIntrusionRisk = 'low' | 'medium' | 'high'
export type AlicizationContinuityPayoffDependency = 'memory-only' | 'requires-current-payoff' | 'can-surface-softly'
export type AlicizationContinuityPreferredTiming = 'internal-only' | 'after-payoff' | 'same-turn-if-invited' | 'next-open-window'

export interface AlicizationContinuityDeliberation {
  kind: AlicizationContinuityDeliberationKind
  arcStage: AlicizationContinuityArcStage
  summary: string | null
  whyNow: string | null
  pressure: number
  intrusionRisk: AlicizationContinuityIntrusionRisk
  payoffDependency: AlicizationContinuityPayoffDependency
  preferredTiming: AlicizationContinuityPreferredTiming
  shouldStayOnThread: boolean
  shouldSpeakNow: boolean
  sourceTags: string[]
}

function clamp01(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value)))
}

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueTextList(values: Array<string | null | undefined>, maxItems = 6) {
  const result: string[] = []
  for (const value of values) {
    const text = sanitizeText(value)
    if (!text || result.some(item => item.toLowerCase() === text.toLowerCase()))
      continue
    result.push(text)
    if (result.length >= maxItems)
      break
  }
  return result
}

function isProblemThreadLike(kind: unknown) {
  const normalizedKind = sanitizeText(kind, 64).toLowerCase()
  return normalizedKind === 'debugging' || normalizedKind === 'change-review'
}

function areCompatibleContinuityThreadKinds(a: unknown, b: unknown) {
  const left = sanitizeText(a, 64).toLowerCase()
  const right = sanitizeText(b, 64).toLowerCase()
  if (!left || !right)
    return false
  if (left === right)
    return true
  return isProblemThreadLike(left) && isProblemThreadLike(right)
}

function looksExecutionAffordanceText(raw: unknown) {
  return /execution|callback|result|listing|remaining|cli|执行|回调|结果|清单|剩下/iu.test(String(raw ?? ''))
}

function looksAntiRestartContinuationText(raw: unknown) {
  return /without reopening from scratch|reopening from scratch|restart(?:ing)? from (?:zero|scratch)|not restarting from zero|do not restart(?: it)? outward again|不要重开|别重开|从头重开|另起一段|另起一条线/iu.test(String(raw ?? ''))
}

function deriveArcStage(input: {
  summary: string | null
  whyNow: string | null
  preferredTiming: AlicizationContinuityPreferredTiming
  sourceTags: string[]
}) {
  const source = `${input.summary ?? ''} ${input.whyNow ?? ''} ${input.sourceTags.join(' ')}`
  if (!source.trim())
    return 'none' as const
  if (/mirror|same-session|session mirror/iu.test(source))
    return 'mirror-carry' as const
  const continuationLanguage = /continue|continuation|same line|往下|继续|still continuing|already continuing|沿着刚才那条线|同一条线/iu.test(source)
  const antiRestartContinuationLanguage = looksAntiRestartContinuationText(source)
  const gentleReopenLanguage = /reopen|re-enter|gently|gentle|stay on the same thread|接回来/iu.test(source)
  const holdLanguage = /hold|afterglow|later opening|wait|requeue|先别|留 room/iu.test(source)
  if (continuationLanguage || antiRestartContinuationLanguage)
    return 'same-thread-continuation' as const
  if (gentleReopenLanguage)
    return 'gentle-reopen' as const
  if (holdLanguage || input.preferredTiming === 'next-open-window')
    return 'hold-for-opening' as const
  return 'none' as const
}

function deriveKindFromAffordance(input: {
  summary: string | null
  whyNow: string | null
  payoffDependency: AlicizationContinuityPayoffDependency
  speechShouldSurface: boolean
}) {
  const source = `${input.summary ?? ''} ${input.whyNow ?? ''}`
  if (looksExecutionAffordanceText(source))
    return 'execution-callback' as const
  if (looksAntiRestartContinuationText(source) && input.payoffDependency !== 'memory-only')
    return 'dialogue-carry' as const
  if (input.payoffDependency === 'memory-only' || input.speechShouldSurface === false)
    return 'memory-follow-up' as const
  return 'dialogue-carry' as const
}

function deriveProjectStateCallbackCarryTag(input: {
  summary: string | null
  whyNow: string | null
}) {
  const text = `${input.summary ?? ''} ${input.whyNow ?? ''}`.toLowerCase()
  return /phase 1|local-first digital life|same digital life|unfinished closure|project identity carry|still-open closure|same-her/u.test(text)
    ? 'project-state-callback-carry'
    : null
}

function deriveArcStageFromReasonTags(reasonTags: readonly string[] | null | undefined) {
  const tags = Array.isArray(reasonTags)
    ? reasonTags
        .map(tag => sanitizeText(tag, 120).toLowerCase())
        .filter(Boolean)
    : []
  if (tags.includes('continuity-arc:hold-for-opening'))
    return 'hold-for-opening' as const
  if (tags.includes('continuity-arc:gentle-reopen'))
    return 'gentle-reopen' as const
  if (tags.includes('continuity-arc:same-thread-continuation'))
    return 'same-thread-continuation' as const
  return 'none' as const
}

function deriveDialogueContinuityArcEvidence(input: {
  currentConsciousFrame: AlicizationDigitalLifeRuntimeSurface['dialogue']['currentConsciousFrame']
  conversationState: AlicizationDigitalLifeRuntimeSurface['dialogue']['conversationState']
  dialogueWorldThread: AlicizationDigitalLifeRuntimeSurface['dialogue']['dialogueWorldThread']
}): {
  arcStage: AlicizationContinuityArcStage
  summary: string | null
  sourceTags: string[]
  preferNextOpenWindow: boolean
} {
  const consciousFrame = input.currentConsciousFrame ?? null
  const conversationState = input.conversationState ?? null
  const dialogueWorldThread = input.dialogueWorldThread ?? null

  const explicitArcStage = deriveArcStageFromReasonTags(consciousFrame?.reasonTags ?? null)
  const carryReason = sanitizeText(
    dialogueWorldThread?.carryReason
    ?? conversationState?.carryReason
    ?? '',
    140,
  ).toLowerCase()
  const continuityPolicy = sanitizeText(conversationState?.continuityPolicy, 96).toLowerCase()
  const stageSource = uniqueTextList([
    carryReason,
    conversationState?.jointThread,
    conversationState?.hostMove,
    ...(conversationState?.narrative ?? []),
    dialogueWorldThread?.activeThread,
    ...(dialogueWorldThread?.openLoops ?? []),
    ...(dialogueWorldThread?.narrative ?? []),
    dialogueWorldThread?.lastUserMove,
    dialogueWorldThread?.lastAssistantMove,
    consciousFrame?.focusAnchor,
    consciousFrame?.consciousNeed,
    consciousFrame?.speakingIntention,
  ], 10).join(' | ').toLowerCase()
  const carryEligible = conversationState?.carryEligible === true
    || dialogueWorldThread?.carryEligible === true
  const stayOnThread = continuityPolicy === 'stay-on-thread'
    || carryReason.includes('shared-attention-continuation')
    || carryReason.includes('continuity-policy')
    || carryEligible
  const continuationLanguage = /same line|same thread|continuation|continue|继续|沿着刚才那条线|living thread|living continuity|live seam|same living bond|shared-attention-continuation/u.test(stageSource)
  const alreadyContinuingLanguage = /already continuing|still continuing|still in motion|same callback line is still live|沿着刚才那条线继续|还是同一条线|顺着这条 callback 线|callback 线继续/u.test(stageSource)
  const proactiveSameLineReplyLanguage = /先别换线|刚才那条提醒|沿着刚才那条提醒继续|就沿着刚才那条提醒继续|不重新起势/u.test(stageSource)
  const preferNextOpenWindow = /already reopened several times|already reopened multiple times|lower-pressure|measured-return|不要重开|别重开/u.test(stageSource)
  const residentOverrideSameThread = explicitArcStage === 'hold-for-opening'
    && stayOnThread
    && continuationLanguage
    && (alreadyContinuingLanguage || proactiveSameLineReplyLanguage)

  const inferredArcStage: AlicizationContinuityArcStage = residentOverrideSameThread
    ? 'same-thread-continuation'
    : explicitArcStage !== 'none'
      ? explicitArcStage
      : /continuity_held_autonomy|held-autonomy-carry|held back|wait|later opening|requeue|先别|留 room/u.test(stageSource)
        ? 'hold-for-opening'
        : /reopen|re-enter|接回来|轻轻接|gently before widening/u.test(stageSource)
          ? 'gentle-reopen'
          : stayOnThread && continuationLanguage
            ? 'same-thread-continuation'
            : 'none'

  return {
    arcStage: inferredArcStage,
    summary: sanitizeText(
      dialogueWorldThread?.openLoops?.[0]
      ?? conversationState?.jointThread
      ?? consciousFrame?.focusAnchor
      ?? dialogueWorldThread?.activeThread
      ?? '',
      180,
    ) || null,
    sourceTags: uniqueTextList([
      explicitArcStage !== 'none' ? `frame:${explicitArcStage}` : null,
      carryReason ? `carry:${carryReason}` : null,
      continuityPolicy ? `policy:${continuityPolicy}` : null,
      alreadyContinuingLanguage ? 'line:already-continuing' : null,
      proactiveSameLineReplyLanguage ? 'line:proactive-same-line-reply' : null,
      carryEligible ? 'carry:eligible' : null,
    ], 5),
    preferNextOpenWindow,
  }
}

function deriveBackgroundSceneShiftContinuityEvidence(input: {
  worldModel: AlicizationDigitalLifeRuntimeSurface['world']['worldModel']
  mindTurnFrame: AlicizationDigitalLifeRuntimeSurface['cognition']['mindTurnFrame']
  affectiveResidue: AlicizationDigitalLifeRuntimeSurface['memory']['affectiveResidue']
  personStateProjection: AlicizationDigitalLifeRuntimeSurface['memory']['personStateProjection']
}): {
  arcStage: AlicizationContinuityArcStage
  summary: string | null
  sourceTags: string[]
  preferNextOpenWindow: boolean
} {
  const worldModel = input.worldModel ?? null
  const activeThread = worldModel?.activeThread ?? null
  const continuityLabel = sanitizeText(worldModel?.continuity?.label, 64).toLowerCase()
  const lingeringThreads = Array.isArray(worldModel?.lingeringThreads) ? worldModel.lingeringThreads : []
  const unresolvedLingeringPeer = lingeringThreads.find(thread =>
    thread
    && thread.id !== activeThread?.id
    && areCompatibleContinuityThreadKinds(thread.kind, activeThread?.kind)
    && thread.unresolved === true,
  ) ?? null

  if (
    continuityLabel !== 'scene-shift'
    || !activeThread
    || activeThread.unresolved !== true
    || !unresolvedLingeringPeer
  ) {
    return {
      arcStage: 'none' as const,
      summary: null as string | null,
      sourceTags: [] as string[],
      preferNextOpenWindow: false,
    }
  }

  const cadenceMode = sanitizeText(input.affectiveResidue?.relationshipCadence?.cadenceMode, 64).toLowerCase()
  const cadenceSummary = sanitizeText(input.affectiveResidue?.relationshipCadence?.summary, 220).toLowerCase()
  const openingGuidance = sanitizeText(input.personStateProjection?.openingGuidance, 220).toLowerCase()
  const manifestationCadenceSummary = sanitizeText(input.personStateProjection?.manifestationCadenceSummary, 220).toLowerCase()
  const measuredReturn = cadenceMode === 'measured-return'
    || cadenceMode === 'cooldown'
    || /lower-pressure|measured-return|less eager|repair-before-closeness|repair-first/u.test(`${cadenceSummary} ${openingGuidance} ${manifestationCadenceSummary}`)
  const threadSource = uniqueTextList([
    input.mindTurnFrame?.self?.thought,
    input.mindTurnFrame?.world?.activeThread,
    input.mindTurnFrame?.world?.visibleSurface,
    input.mindTurnFrame?.obligation?.whyNow,
    activeThread.title,
    activeThread.summary,
    unresolvedLingeringPeer.title,
    unresolvedLingeringPeer.summary,
  ], 8).join(' | ').toLowerCase()
  const peerMarkers = uniqueTextList([
    unresolvedLingeringPeer.title,
    unresolvedLingeringPeer.summary,
  ], 2).map(item => item.toLowerCase())
  const carriesLingeringPeer = peerMarkers.some(marker => marker && threadSource.includes(marker))
  const problemFocus = sanitizeText(input.mindTurnFrame?.relation?.hostGoal, 96).toLowerCase() === 'resolve-problem'
    || isProblemThreadLike(activeThread.kind)

  if (!measuredReturn || !carriesLingeringPeer || !problemFocus) {
    return {
      arcStage: 'none' as const,
      summary: null as string | null,
      sourceTags: [] as string[],
      preferNextOpenWindow: false,
    }
  }

  const activeTitle = sanitizeText(activeThread.title ?? activeThread.summary, 120)
  const peerTitle = sanitizeText(unresolvedLingeringPeer.title ?? unresolvedLingeringPeer.summary, 120)
  return {
    arcStage: 'same-thread-continuation' as const,
    summary: sanitizeText(
      `continuation_state=active; from=${peerTitle || 'earlier_unresolved_context'}; to=${activeTitle || 'current_knot'}; restart_policy=context_preserving`,
      180,
    ) || activeTitle || peerTitle || null,
    sourceTags: uniqueTextList([
      'world:scene-shift',
      `thread-kind:${sanitizeText(activeThread.kind, 48).toLowerCase()}`,
      'lingering:unresolved-peer',
      measuredReturn ? 'cadence:measured-return' : null,
    ], 4),
    preferNextOpenWindow: false,
  }
}

function deriveStayingWithThreadContinuityEvidence(input: {
  worldModel: AlicizationDigitalLifeRuntimeSurface['world']['worldModel']
  mindTurnFrame: AlicizationDigitalLifeRuntimeSurface['cognition']['mindTurnFrame']
  affectiveResidue: AlicizationDigitalLifeRuntimeSurface['memory']['affectiveResidue']
  personStateProjection: AlicizationDigitalLifeRuntimeSurface['memory']['personStateProjection']
}): {
  arcStage: AlicizationContinuityArcStage
  summary: string | null
  sourceTags: string[]
  preferNextOpenWindow: boolean
} {
  const worldModel = input.worldModel ?? null
  const activeThread = worldModel?.activeThread ?? null
  const continuityLabel = sanitizeText(worldModel?.continuity?.label, 64).toLowerCase()
  const lingeringThreads = Array.isArray(worldModel?.lingeringThreads) ? worldModel.lingeringThreads : []
  const unresolvedLingeringPeer = lingeringThreads.find(thread =>
    thread
    && thread.unresolved === true
    && isProblemThreadLike(thread.kind),
  ) ?? null

  if (
    continuityLabel !== 'staying-with-thread'
    || !activeThread
    || activeThread.kind !== 'browsing'
    || !unresolvedLingeringPeer
  ) {
    return {
      arcStage: 'none',
      summary: null,
      sourceTags: [],
      preferNextOpenWindow: false,
    }
  }

  const cadenceMode = sanitizeText(input.affectiveResidue?.relationshipCadence?.cadenceMode, 64).toLowerCase()
  const cadenceSummary = sanitizeText(input.affectiveResidue?.relationshipCadence?.summary, 220).toLowerCase()
  const residueSummary = sanitizeText(input.affectiveResidue?.summary, 220).toLowerCase()
  const openingGuidance = sanitizeText(input.personStateProjection?.openingGuidance, 220).toLowerCase()
  const manifestationCadenceSummary = sanitizeText(input.personStateProjection?.manifestationCadenceSummary, 220).toLowerCase()
  const threadSource = uniqueTextList([
    input.mindTurnFrame?.memory?.carriedThread,
    ...(input.mindTurnFrame?.memory?.carriedFacts ?? []),
    ...(input.mindTurnFrame?.memory?.recallKeys ?? []),
    input.mindTurnFrame?.self?.thought,
    input.mindTurnFrame?.obligation?.openingMove,
    input.mindTurnFrame?.obligation?.whyNow,
    input.mindTurnFrame?.focusAnchor,
    unresolvedLingeringPeer.title,
    unresolvedLingeringPeer.summary,
  ], 12).join(' | ').toLowerCase()
  const measuredReturn = cadenceMode === 'measured-return'
    || cadenceMode === 'cooldown'
    || /measured-return|lower-pressure|less eager|repair-before-closeness|repair-first/u.test(`${cadenceSummary} ${residueSummary} ${openingGuidance} ${manifestationCadenceSummary}`)
  const carriesLingeringPeer = [
    unresolvedLingeringPeer.title,
    unresolvedLingeringPeer.summary,
  ]
    .map(item => sanitizeText(item, 160).toLowerCase())
    .filter(Boolean)
    .some(marker => threadSource.includes(marker))
  const continuationLanguage = /same line|same thread|continue-thread|continuation|continue|继续|同一条线|往下接|callback/u.test(threadSource)

  if (!measuredReturn || !carriesLingeringPeer || !continuationLanguage) {
    return {
      arcStage: 'none',
      summary: null,
      sourceTags: [],
      preferNextOpenWindow: false,
    }
  }

  const peerTitle = sanitizeText(unresolvedLingeringPeer.title ?? unresolvedLingeringPeer.summary, 120)
  return {
    arcStage: 'same-thread-continuation',
    summary: sanitizeText(
      `continuation_state=active; foreground=drifted; underlying_context=${peerTitle || 'unresolved_callback'}; restart_policy=context_preserving`,
      180,
    ) || peerTitle || null,
    sourceTags: uniqueTextList([
      'world:staying-with-thread',
      'active:browsing-foreground',
      `thread-kind:${sanitizeText(unresolvedLingeringPeer.kind, 48).toLowerCase()}`,
      'lingering:unresolved-peer',
      measuredReturn ? 'cadence:measured-return' : null,
    ], 5),
    preferNextOpenWindow: false,
  }
}

function deriveThinResidentContinuityEvidence(input: {
  initiative: AlicizationDigitalLifeRuntimeSurface['agency']['initiative']
  affectiveResidue: AlicizationDigitalLifeRuntimeSurface['memory']['affectiveResidue']
  personStateProjection: AlicizationDigitalLifeRuntimeSurface['memory']['personStateProjection']
}): {
  arcStage: AlicizationContinuityArcStage
  summary: string | null
  sourceTags: string[]
  preferNextOpenWindow: boolean
} {
  const initiative = input.initiative ?? null
  const cadenceMode = sanitizeText(input.affectiveResidue?.relationshipCadence?.cadenceMode, 64).toLowerCase()
  const cadenceSummary = sanitizeText(input.affectiveResidue?.relationshipCadence?.summary, 220).toLowerCase()
  const residueSummary = sanitizeText(input.affectiveResidue?.summary, 220).toLowerCase()
  const residueEntrySummaries = Array.isArray(input.affectiveResidue?.residues)
    ? input.affectiveResidue?.residues
        .flatMap(entry => [
          sanitizeText(entry?.summary, 220).toLowerCase(),
          ...(Array.isArray(entry?.sourceSignals)
            ? entry.sourceSignals.map(signal => sanitizeText(signal, 220).toLowerCase())
            : []),
        ])
        .filter(Boolean)
    : []
  const affectiveSourceSignals = Array.isArray(input.affectiveResidue?.sourceSignals)
    ? input.affectiveResidue.sourceSignals
        .map(signal => sanitizeText(signal, 220).toLowerCase())
        .filter(Boolean)
    : []
  const projectionSummary = sanitizeText(input.personStateProjection?.summary, 220)
  const projectionSummaryLower = projectionSummary.toLowerCase()
  const openingGuidance = sanitizeText(input.personStateProjection?.openingGuidance, 220).toLowerCase()
  const manifestationCadenceSummary = sanitizeText(input.personStateProjection?.manifestationCadenceSummary, 220).toLowerCase()
  const initiativeWhy = sanitizeText(initiative?.why, 220).toLowerCase()
  const preferredStyle = sanitizeText(initiative?.preferredStyle, 64).toLowerCase()
  const continuityRestraint = sanitizeText(initiative?.continuityRestraint, 64).toLowerCase()
  const combined = [
    cadenceSummary,
    residueSummary,
    ...residueEntrySummaries,
    ...affectiveSourceSignals,
    projectionSummaryLower,
    openingGuidance,
    manifestationCadenceSummary,
    initiativeWhy,
  ].filter(Boolean).join(' | ')

  const hasRepairBeforeCloseness = continuityRestraint === 'repair-before-closeness'
    || cadenceMode === 'cooldown'
    || /repair-before-closeness|repair-first|repair should settle before closeness expands|repair lands before closeness returns/u.test(combined)
  const hasMeasuredReturn = cadenceMode === 'measured-return'
    || continuityRestraint === 'measured-return'
    || /measured-return|lower-pressure|stay slower|less eager/u.test(combined)
  const hasSameLineContinuation = /same callback line|same line|same thread|continuation|continue|继续|沿着刚才那条线|往下接|callback line/u.test(combined)
  const hasFreshReopenGuard = /fresh reopen|reopening from zero|fresh eager approach|fresh approach|不要另起一段|不要重开/u.test(combined)
  const repeatedReopenGuard = /already reopened multiple times|already reopened several times|reopened multiple times|reopened several times|已经 reopen 多次|已经重开多次|已经接回来好几次/u.test(combined)
  const alreadyContinuingSpokenLine = /still in motion|keep continuing|keep the return lower-pressure|stay on the same callback line|same callback line is still live|already continuing|already been spoken back into view|沿着刚才那条线继续|还是同一条线|顺着这条 callback 线|callback 线继续/u.test(combined)
  const callbackAfterglowHold = /callback-afterglow-hold|callback afterglow|余韵|留 room|留白|later opening|等更自然的开口|same-her hold/u.test(combined)
  const heldAutonomyCarry = /held-autonomy-carry|held autonomy|held back|requeue|wait|先别|先留 room/u.test(combined)
  const repeatedReopenWindowGuard = repeatedReopenGuard
    && /already reopened multiple times|already reopened several times|reopened multiple times|reopened several times|已经 reopen 多次|已经重开多次|已经接回来好几次/u.test(`${projectionSummaryLower} ${openingGuidance} ${manifestationCadenceSummary}`)
  const explicitAlreadyContinuingWithoutRepeatedReopenGuard
    = alreadyContinuingSpokenLine
      && !repeatedReopenGuard
      && (
        /already continuing|already been spoken back into view|still in motion/u.test(combined)
        || /already continuing|already been spoken back into view|still in motion/u.test(`${projectionSummaryLower} ${openingGuidance}`)
      )
  const silentObserveCarry = preferredStyle === 'silent-observe'
    && initiative?.shouldSpeak === false
    && initiative?.selectedAction === 'recheck'

  if ((!hasMeasuredReturn && !hasRepairBeforeCloseness) || !hasSameLineContinuation || !silentObserveCarry) {
    return {
      arcStage: 'none',
      summary: null,
      sourceTags: [],
      preferNextOpenWindow: false,
    }
  }

  return {
    arcStage: 'same-thread-continuation',
    summary: projectionSummary || sanitizeText(input.personStateProjection?.openingGuidance, 180) || sanitizeText(initiative?.why, 180) || null,
    sourceTags: uniqueTextList([
      'resident:thin-continuity',
      alreadyContinuingSpokenLine ? 'line:already-continuing' : null,
      repeatedReopenGuard ? 'guard:repeated-reopen' : null,
      hasFreshReopenGuard ? 'guard:fresh-reopen' : null,
      callbackAfterglowHold ? 'callback-afterglow-hold' : null,
      heldAutonomyCarry ? 'held-autonomy-carry' : null,
      hasRepairBeforeCloseness ? 'cadence:repair-before-closeness' : null,
      hasMeasuredReturn ? 'cadence:measured-return' : null,
      silentObserveCarry ? 'initiative:silent-observe-recheck' : null,
    ], 8),
    preferNextOpenWindow:
      hasFreshReopenGuard
      || repeatedReopenWindowGuard
      || (!explicitAlreadyContinuingWithoutRepeatedReopenGuard && alreadyContinuingSpokenLine && hasMeasuredReturn)
      || hasRepairBeforeCloseness,
  }
}

function deriveDialogueContinuitySummaryFallback(input: {
  affectiveResidue: AlicizationDigitalLifeRuntimeSurface['memory']['affectiveResidue']
  personStateProjection: AlicizationDigitalLifeRuntimeSurface['memory']['personStateProjection']
}) {
  const candidates = uniqueTextList([
    input.personStateProjection?.summary,
    input.personStateProjection?.openingGuidance,
    input.personStateProjection?.manifestationCadenceSummary,
    input.affectiveResidue?.summary,
    input.affectiveResidue?.relationshipCadence?.summary,
  ], 5)

  return candidates.find(candidate =>
    /same callback line|same line|same thread|continuation|continue|callback|lower-pressure|measured-return|repair thread|repair-before-closeness|沿着刚才那条线|同一条线|往下接/u.test(candidate.toLowerCase()),
  ) ?? null
}

function deriveAlicizationContinuityDeliberationCore(input: {
  memoryDeliberation: AlicizationDigitalLifeRuntimeSurface['memory']['memoryDeliberation']
  recollectionSpeechPlan: AlicizationDigitalLifeRuntimeSurface['memory']['recollectionSpeechPlan']
  autonomy: AlicizationDigitalLifeRuntimeSurface['agency']['autonomy']
  initiative: AlicizationDigitalLifeRuntimeSurface['agency']['initiative']
  replyDeliberation: AlicizationDigitalLifeRuntimeSurface['dialogue']['replyDeliberation']
  currentConsciousFrame: AlicizationDigitalLifeRuntimeSurface['dialogue']['currentConsciousFrame']
  conversationState: AlicizationDigitalLifeRuntimeSurface['dialogue']['conversationState']
  dialogueWorldThread: AlicizationDigitalLifeRuntimeSurface['dialogue']['dialogueWorldThread']
  worldModel: AlicizationDigitalLifeRuntimeSurface['world']['worldModel']
  mindTurnFrame: AlicizationDigitalLifeRuntimeSurface['cognition']['mindTurnFrame']
  affectiveResidue: AlicizationDigitalLifeRuntimeSurface['memory']['affectiveResidue']
  personStateProjection: AlicizationDigitalLifeRuntimeSurface['memory']['personStateProjection']
}): AlicizationContinuityDeliberation {
  const deliberation = input.memoryDeliberation ?? null
  const speechPlan = input.recollectionSpeechPlan ?? null
  const autonomy = input.autonomy ?? null
  const replyDeliberation = input.replyDeliberation ?? null
  const projectStateExplicitPreferredTiming
    = sanitizeText(input.currentConsciousFrame?.projectState?.continuityPreferredTiming, 64).toLowerCase()
  const callbackFollowUpPreferredTiming
    = sanitizeText(deliberation?.followUpAffordance?.preferredTiming, 64).toLowerCase()
  const projectStateExplicitNextOpenWindow
    = projectStateExplicitPreferredTiming === 'next-open-window'
      || (
        !projectStateExplicitPreferredTiming
        && callbackFollowUpPreferredTiming === 'next-open-window'
      )
  const dialogueContinuityEvidence = deriveDialogueContinuityArcEvidence({
    currentConsciousFrame: input.currentConsciousFrame ?? null,
    conversationState: input.conversationState ?? null,
    dialogueWorldThread: input.dialogueWorldThread ?? null,
  })
  const backgroundContinuityEvidence = deriveBackgroundSceneShiftContinuityEvidence({
    worldModel: input.worldModel ?? null,
    mindTurnFrame: input.mindTurnFrame ?? null,
    affectiveResidue: input.affectiveResidue ?? null,
    personStateProjection: input.personStateProjection ?? null,
  })
  const stayingWithThreadContinuityEvidence = deriveStayingWithThreadContinuityEvidence({
    worldModel: input.worldModel ?? null,
    mindTurnFrame: input.mindTurnFrame ?? null,
    affectiveResidue: input.affectiveResidue ?? null,
    personStateProjection: input.personStateProjection ?? null,
  })
  const dialogueContinuitySummaryFallback = deriveDialogueContinuitySummaryFallback({
    affectiveResidue: input.affectiveResidue ?? null,
    personStateProjection: input.personStateProjection ?? null,
  })
  const thinResidentContinuityEvidence = deriveThinResidentContinuityEvidence({
    initiative: input.initiative ?? null,
    affectiveResidue: input.affectiveResidue ?? null,
    personStateProjection: input.personStateProjection ?? null,
  })

  const affordance = deliberation?.followUpAffordance ?? null
  if (affordance) {
    const kind = deriveKindFromAffordance({
      summary: affordance.summary,
      whyNow: affordance.whyNow,
      payoffDependency: affordance.payoffDependency,
      speechShouldSurface: speechPlan?.shouldSurface === true,
    })
    const affordanceProjectStateCallbackCarryTag = kind === 'execution-callback'
      ? deriveProjectStateCallbackCarryTag({
          summary: affordance.summary,
          whyNow: affordance.whyNow,
        })
      : null
    const staleHoldAffordanceWhileLineAlreadyContinues
      = kind === 'execution-callback'
        && affordance.preferredTiming === 'next-open-window'
        && thinResidentContinuityEvidence.arcStage === 'same-thread-continuation'
        && thinResidentContinuityEvidence.sourceTags.includes('line:already-continuing')
        && (!thinResidentContinuityEvidence.sourceTags.includes('callback-afterglow-hold')
          || thinResidentContinuityEvidence.sourceTags.includes('guard:repeated-reopen'))
        && (!thinResidentContinuityEvidence.sourceTags.includes('held-autonomy-carry')
          || thinResidentContinuityEvidence.sourceTags.includes('cadence:measured-return')
          || thinResidentContinuityEvidence.sourceTags.includes('cadence:repair-before-closeness'))
        && !affordanceProjectStateCallbackCarryTag
    if (staleHoldAffordanceWhileLineAlreadyContinues) {
      // A previously correct "wait for the opening" callback affordance should not outrank
      // fresher resident evidence once that same line is already back in motion.
      return {
        kind: 'dialogue-carry',
        arcStage: thinResidentContinuityEvidence.arcStage,
        summary: thinResidentContinuityEvidence.summary,
        whyNow: thinResidentContinuityEvidence.summary,
        pressure: clamp01(0.4 + (thinResidentContinuityEvidence.arcStage === 'same-thread-continuation' ? 0.12 : 0.08)),
        intrusionRisk: 'medium',
        payoffDependency: 'can-surface-softly',
        preferredTiming: thinResidentContinuityEvidence.sourceTags.includes('line:already-continuing')
          ? (
              thinResidentContinuityEvidence.sourceTags.includes('guard:repeated-reopen')
            )
              ? 'next-open-window'
              : 'same-turn-if-invited'
          : thinResidentContinuityEvidence.preferNextOpenWindow
            || projectStateExplicitNextOpenWindow
            ? 'next-open-window'
            : 'same-turn-if-invited',
        shouldStayOnThread: true,
        shouldSpeakNow: false,
        sourceTags: uniqueTextList([
          'resident-thin-continuity',
          'kind:dialogue-carry',
          'override:stale-hold-affordance',
          ...thinResidentContinuityEvidence.sourceTags,
        ], 6),
      }
    }
    else {
      const pressure = clamp01(
        0.28
        + (affordance.preferredTiming === 'after-payoff' ? 0.18 : affordance.preferredTiming === 'same-turn-if-invited' ? 0.14 : affordance.preferredTiming === 'next-open-window' ? 0.12 : 0.04)
        + (affordance.payoffDependency === 'requires-current-payoff' ? 0.18 : affordance.payoffDependency === 'can-surface-softly' ? 0.12 : 0.06)
        - (affordance.intrusionRisk === 'high' ? 0.12 : affordance.intrusionRisk === 'medium' ? 0.05 : 0),
      )
      return {
        kind,
        arcStage: deriveArcStage({
          summary: affordance.summary,
          whyNow: affordance.whyNow,
          preferredTiming: affordance.preferredTiming,
          sourceTags: [
            'memory-deliberation',
            `kind:${kind}`,
            `timing:${affordance.preferredTiming}`,
            `intrusion:${affordance.intrusionRisk}`,
          ],
        }),
        summary: affordance.summary,
        whyNow: affordance.whyNow,
        pressure,
        intrusionRisk: affordance.intrusionRisk,
        payoffDependency: affordance.payoffDependency,
        preferredTiming: affordance.preferredTiming,
        shouldStayOnThread: true,
        shouldSpeakNow: kind !== 'memory-follow-up'
          && affordance.preferredTiming !== 'next-open-window'
          && affordance.preferredTiming !== 'internal-only'
          && affordance.intrusionRisk !== 'high',
        sourceTags: uniqueTextList([
          'memory-deliberation',
          `kind:${kind}`,
          `timing:${affordance.preferredTiming}`,
          `intrusion:${affordance.intrusionRisk}`,
          affordanceProjectStateCallbackCarryTag,
        ], 5),
      }
    }
  }

  if (
    autonomy?.executionIntent?.kind === 'follow-through'
    && (autonomy.executionIntent?.summary || autonomy.whyNow)
  ) {
    return {
      kind: 'execution-callback',
      arcStage: deriveArcStage({
        summary: sanitizeText(autonomy.executionIntent?.summary, 180) || sanitizeText(autonomy.whyNow, 180) || null,
        whyNow: sanitizeText(autonomy.whyNow, 220) || null,
        preferredTiming: autonomy.shouldSpeak === false ? 'after-payoff' : 'same-turn-if-invited',
        sourceTags: ['autonomy-follow-through', 'kind:execution-callback'],
      }),
      summary: sanitizeText(autonomy.executionIntent?.summary, 180) || sanitizeText(autonomy.whyNow, 180) || null,
      whyNow: sanitizeText(autonomy.whyNow, 220) || null,
      pressure: clamp01((autonomy.actReadiness ?? 0) * 0.46 + (autonomy.confidence ?? 0) * 0.34 + 0.1),
      intrusionRisk: autonomy.shouldSpeak === false ? 'medium' : 'low',
      payoffDependency: 'requires-current-payoff',
      preferredTiming: autonomy.shouldSpeak === false ? 'after-payoff' : 'same-turn-if-invited',
      shouldStayOnThread: true,
      shouldSpeakNow: autonomy.shouldSpeak === true,
      sourceTags: uniqueTextList([
        'autonomy-follow-through',
        'kind:execution-callback',
        deriveProjectStateCallbackCarryTag({
          summary: sanitizeText(autonomy.executionIntent?.summary, 180) || sanitizeText(autonomy.whyNow, 180) || null,
          whyNow: sanitizeText(autonomy.whyNow, 220) || null,
        }),
      ], 4),
    }
  }

  if (
    replyDeliberation?.memoryMode === 'dialogue-carry'
    || replyDeliberation?.speakingFrom === 'held-memory'
  ) {
    const summary = sanitizeText(replyDeliberation.whyThisReplyNow, 180)
      || sanitizeText(replyDeliberation.openingBeat, 180)
      || dialogueContinuityEvidence.summary
      || null
    const whyNow = sanitizeText(replyDeliberation.whyThisReplyNow, 220)
      || dialogueContinuityEvidence.summary
      || null
    const sourceTags = uniqueTextList([
      'reply-deliberation',
      'kind:dialogue-carry',
      ...dialogueContinuityEvidence.sourceTags,
    ], 6)
    const preferredTiming = dialogueContinuityEvidence.preferNextOpenWindow
      || thinResidentContinuityEvidence.preferNextOpenWindow
      ? 'next-open-window'
      : 'same-turn-if-invited'
    return {
      kind: 'dialogue-carry',
      arcStage: dialogueContinuityEvidence.arcStage !== 'none'
        ? dialogueContinuityEvidence.arcStage
        : deriveArcStage({
            summary,
            whyNow,
            preferredTiming,
            sourceTags,
          }),
      summary,
      whyNow,
      pressure: clamp01((replyDeliberation.confidence ?? 0.5) * 0.58 + 0.12),
      intrusionRisk: 'medium',
      payoffDependency: 'can-surface-softly',
      preferredTiming,
      shouldStayOnThread: true,
      shouldSpeakNow: replyDeliberation.shouldSpeak === true,
      sourceTags,
    }
  }

  if (
    thinResidentContinuityEvidence.arcStage === 'same-thread-continuation'
    && thinResidentContinuityEvidence.summary
    && thinResidentContinuityEvidence.preferNextOpenWindow
    && (
      thinResidentContinuityEvidence.sourceTags.includes('cadence:measured-return')
      || thinResidentContinuityEvidence.sourceTags.includes('cadence:repair-before-closeness')
    )
  ) {
    return {
      kind: 'dialogue-carry',
      arcStage: thinResidentContinuityEvidence.arcStage,
      summary: thinResidentContinuityEvidence.summary,
      whyNow: thinResidentContinuityEvidence.summary,
      pressure: clamp01(0.4 + (thinResidentContinuityEvidence.arcStage === 'same-thread-continuation' ? 0.12 : 0.08)),
      intrusionRisk: 'medium',
      payoffDependency: 'can-surface-softly',
      preferredTiming: thinResidentContinuityEvidence.sourceTags.includes('line:already-continuing')
        && !thinResidentContinuityEvidence.sourceTags.includes('guard:repeated-reopen')
        && !thinResidentContinuityEvidence.sourceTags.includes('cadence:repair-before-closeness')
        ? 'same-turn-if-invited'
        : 'next-open-window',
      shouldStayOnThread: true,
      shouldSpeakNow: false,
      sourceTags: uniqueTextList([
        'resident-thin-continuity',
        'kind:dialogue-carry',
        'timing:lower-pressure-same-thread',
        ...thinResidentContinuityEvidence.sourceTags,
      ], 6),
    }
  }

  if (dialogueContinuityEvidence.arcStage !== 'none' && (dialogueContinuityEvidence.summary || dialogueContinuitySummaryFallback)) {
    const preferredTiming = dialogueContinuityEvidence.preferNextOpenWindow
      || projectStateExplicitNextOpenWindow
      ? 'next-open-window'
      : 'same-turn-if-invited'
    const summary = dialogueContinuityEvidence.summary ?? dialogueContinuitySummaryFallback
    return {
      kind: 'dialogue-carry',
      arcStage: dialogueContinuityEvidence.arcStage,
      summary,
      whyNow: summary,
      pressure: clamp01(0.46 + (dialogueContinuityEvidence.arcStage === 'same-thread-continuation' ? 0.12 : 0.08)),
      intrusionRisk: 'medium',
      payoffDependency: 'can-surface-softly',
      preferredTiming,
      shouldStayOnThread: true,
      shouldSpeakNow: false,
      sourceTags: uniqueTextList([
        'dialogue-continuity-evidence',
        'kind:dialogue-carry',
        dialogueContinuityEvidence.summary ? null : 'summary:fallback-thin-continuity',
        ...dialogueContinuityEvidence.sourceTags,
      ], 6),
    }
  }

  if (backgroundContinuityEvidence.arcStage !== 'none' && backgroundContinuityEvidence.summary) {
    return {
      kind: 'dialogue-carry',
      arcStage: backgroundContinuityEvidence.arcStage,
      summary: backgroundContinuityEvidence.summary,
      whyNow: backgroundContinuityEvidence.summary,
      pressure: clamp01(0.42 + (backgroundContinuityEvidence.arcStage === 'same-thread-continuation' ? 0.14 : 0.1)),
      intrusionRisk: 'medium',
      payoffDependency: 'can-surface-softly',
      preferredTiming: 'same-turn-if-invited',
      shouldStayOnThread: true,
      shouldSpeakNow: false,
      sourceTags: uniqueTextList([
        'background-scene-continuity',
        'kind:dialogue-carry',
        ...backgroundContinuityEvidence.sourceTags,
      ], 6),
    }
  }

  if (stayingWithThreadContinuityEvidence.arcStage !== 'none' && stayingWithThreadContinuityEvidence.summary) {
    return {
      kind: 'dialogue-carry',
      arcStage: stayingWithThreadContinuityEvidence.arcStage,
      summary: stayingWithThreadContinuityEvidence.summary,
      whyNow: stayingWithThreadContinuityEvidence.summary,
      pressure: clamp01(0.4 + (stayingWithThreadContinuityEvidence.arcStage === 'same-thread-continuation' ? 0.12 : 0.08)),
      intrusionRisk: 'medium',
      payoffDependency: 'can-surface-softly',
      preferredTiming: projectStateExplicitNextOpenWindow ? 'next-open-window' : 'same-turn-if-invited',
      shouldStayOnThread: true,
      shouldSpeakNow: false,
      sourceTags: uniqueTextList([
        'staying-with-thread-continuity',
        'kind:dialogue-carry',
        ...stayingWithThreadContinuityEvidence.sourceTags,
      ], 6),
    }
  }

  if (thinResidentContinuityEvidence.arcStage !== 'none' && thinResidentContinuityEvidence.summary) {
    const preferredTiming = (thinResidentContinuityEvidence.preferNextOpenWindow || projectStateExplicitNextOpenWindow)
      ? thinResidentContinuityEvidence.sourceTags.includes('line:already-continuing')
      && !thinResidentContinuityEvidence.sourceTags.includes('guard:repeated-reopen')
      && !thinResidentContinuityEvidence.sourceTags.includes('cadence:measured-return')
      && !thinResidentContinuityEvidence.sourceTags.includes('cadence:repair-before-closeness')
      && !projectStateExplicitNextOpenWindow
        ? 'same-turn-if-invited'
        : 'next-open-window'
      : 'same-turn-if-invited'
    return {
      kind: 'dialogue-carry',
      arcStage: thinResidentContinuityEvidence.arcStage,
      summary: thinResidentContinuityEvidence.summary,
      whyNow: thinResidentContinuityEvidence.summary,
      pressure: clamp01(0.4 + (thinResidentContinuityEvidence.arcStage === 'same-thread-continuation' ? 0.12 : 0.08)),
      intrusionRisk: 'medium',
      payoffDependency: 'can-surface-softly',
      preferredTiming,
      shouldStayOnThread: true,
      shouldSpeakNow: false,
      sourceTags: uniqueTextList([
        'resident-thin-continuity',
        'kind:dialogue-carry',
        ...thinResidentContinuityEvidence.sourceTags,
      ], 6),
    }
  }

  return {
    kind: 'none',
    arcStage: 'none',
    summary: null,
    whyNow: null,
    pressure: 0,
    intrusionRisk: 'high',
    payoffDependency: 'memory-only',
    preferredTiming: 'internal-only',
    shouldStayOnThread: false,
    shouldSpeakNow: false,
    sourceTags: [],
  }
}

export function deriveAlicizationContinuityDeliberationFromSurface(
  surface: AlicizationDigitalLifeRuntimeSurface,
): AlicizationContinuityDeliberation {
  return deriveAlicizationContinuityDeliberationCore({
    memoryDeliberation: surface.memory?.memoryDeliberation ?? null,
    recollectionSpeechPlan: surface.memory?.recollectionSpeechPlan ?? null,
    autonomy: surface.agency?.autonomy ?? null,
    initiative: surface.agency?.initiative ?? null,
    replyDeliberation: surface.dialogue?.replyDeliberation ?? null,
    currentConsciousFrame: surface.dialogue?.currentConsciousFrame ?? null,
    conversationState: surface.dialogue?.conversationState ?? null,
    dialogueWorldThread: surface.dialogue?.dialogueWorldThread ?? null,
    worldModel: surface.world?.worldModel ?? null,
    mindTurnFrame: surface.cognition?.mindTurnFrame ?? null,
    affectiveResidue: surface.memory?.affectiveResidue ?? null,
    personStateProjection: surface.memory?.personStateProjection ?? null,
  })
}

export function deriveAlicizationContinuityDeliberationFromSpine(
  spine: AlicizationDigitalLifeSpineSnapshot,
): AlicizationContinuityDeliberation {
  return deriveAlicizationContinuityDeliberationFromSurface(spine.runtimeSurface)
}
