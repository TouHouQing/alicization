import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDialogueTurnEncounterSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReplyDeliberationSnapshot,
  AlicizationReplyMotive,
  AlicizationReplyMotiveSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
import { pickDialogueSurfaceText, sanitizeDialogueAnchorText, sanitizeDialogueSurfaceText } from './dialogue-surface-text'
import {
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateSnapshot,
} from './project-state-brief'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 180)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function preferReplyDeliberatorProjectContinuityText(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = sanitizeDialogueSurfaceText(input.current, 320) || null
  const candidate = sanitizeDialogueSurfaceText(input.candidate, 320) || null

  if (!current)
    return candidate
  if (!candidate)
    return current
  if (current === candidate)
    return current

  const preferredClosureAuthority = preferStrongerContinuityClosureAuthority(current, candidate)
  if (preferredClosureAuthority)
    return preferredClosureAuthority

  if (candidate.startsWith(current) && candidate.length >= current.length + 24)
    return candidate
  if (current.startsWith(candidate) && current.length >= candidate.length + 24)
    return current

  return candidate.length > current.length ? candidate : current
}

function readReplyDeliberatorProjectContinuityAuthority(frame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  const projectState = frame?.projectState as {
    sameHerHoldDetail?: unknown
    emotionalClosureSummary?: unknown
    emotionalClosureCue?: unknown
  } | null

  let preferred = sanitizeDialogueSurfaceText(projectState?.sameHerHoldDetail, 320) || null
  preferred = preferReplyDeliberatorProjectContinuityText({
    current: preferred,
    candidate: projectState?.emotionalClosureSummary,
  })
  preferred = preferReplyDeliberatorProjectContinuityText({
    current: preferred,
    candidate: projectState?.emotionalClosureCue,
  })
  return preferred
}

function readReplyDeliberatorProjectContinuityCue(frame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  const projectState = frame?.projectState as {
    continuityCue?: unknown
    sameHerHoldDetail?: unknown
  } | null

  let preferred = sanitizeDialogueSurfaceText(projectState?.continuityCue, 320) || null
  preferred = preferReplyDeliberatorProjectContinuityText({
    current: preferred,
    candidate: projectState?.sameHerHoldDetail,
  })
  return preferred
}

function isExplicitCorrectedSamePersonContinuityText(text: string | null | undefined) {
  return typeof text === 'string'
    && /host-corrected same-person continuity|corrected same-person continuity|same-person continuity|same person continuity|同一个她|持续的人/u.test(text)
}

function pickDialogueAnchorText(...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeDialogueAnchorText(value, 180)
    if (normalized)
      return normalized
  }
  return ''
}

interface AlicizationDialogueEncounterSurface extends Pick<
  AlicizationDialogueTurnEncounterSnapshot,
  'subject' | 'screenReferenceMode' | 'dialogueFirst' | 'summary' | 'taskAnchor'
> {}

function resolvePrimaryReplyAnchor(input: {
  conversationState: AlicizationConversationStateSnapshot
  discourseState: AlicizationDiscourseStateSnapshot
  answerCompiler: AlicizationAnswerCompilerSnapshot
  dialogueEncounter?: AlicizationDialogueEncounterSurface | null
}) {
  return pickDialogueAnchorText(
    input.conversationState.primaryTurnAnchor,
    input.discourseState.primaryTurnAnchor,
    input.dialogueEncounter?.taskAnchor,
    input.dialogueEncounter?.summary,
    input.conversationState.hostMove,
    input.answerCompiler.openingClaim,
  )
}

function isDialogueFirstReplyTurn(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  answerCompiler: AlicizationAnswerCompilerSnapshot
  dialogueEncounter?: AlicizationDialogueEncounterSurface | null
}) {
  const subject = input.dialogueEncounter?.subject
    ?? input.answerCompiler.answerSubject
    ?? input.discourseState.currentTurnSubject
  return input.dialogueEncounter?.screenReferenceMode === 'avoid'
    || subject === 'relationship'
    || subject === 'alicization-self'
    || subject === 'host-state'
    || subject === 'general'
}

function makeMotive(input: {
  kind: AlicizationReplyMotive
  summary?: string | null
  weight: number
  sourceTags?: string[]
}) {
  const summary = sanitizeDialogueSurfaceText(input.summary, 180)
  if (!summary)
    return null
  return {
    kind: input.kind,
    summary,
    weight: clamp01(input.weight),
    sourceTags: (input.sourceTags ?? []).map(tag => sanitizeText(tag, 48)).filter(Boolean).slice(0, 6),
  } satisfies AlicizationReplyMotiveSnapshot
}

function speakingFrom(input: {
  answerCompiler: AlicizationAnswerCompilerSnapshot
  discourseState: AlicizationDiscourseStateSnapshot
}) {
  if (input.answerCompiler.evidenceMode === 'live-grounded' || input.answerCompiler.evidenceMode === 'live-observed')
    return 'live-scene' as const
  if (input.answerCompiler.evidenceMode === 'continuity-carry' || input.answerCompiler.evidenceMode === 'repair-first')
    return 'held-memory' as const
  if (input.discourseState.currentTurnSubject === 'task-knot')
    return 'task-thread' as const
  if (input.discourseState.currentTurnSubject === 'relationship' || input.discourseState.currentTurnSubject === 'host-state')
    return 'dialogue-bond' as const
  if (input.discourseState.currentTurnSubject === 'alicization-self')
    return 'self-continuity' as const
  return 'task-thread' as const
}

function repairIsAlreadySettledByFreshGrounding(input: {
  answerCompiler: AlicizationAnswerCompilerSnapshot
  discourseState: AlicizationDiscourseStateSnapshot
}) {
  return input.answerCompiler.evidenceMode === 'live-grounded'
    && input.answerCompiler.turnMode !== 'screen-repair'
    && input.answerCompiler.screenReferenceMode !== 'avoid'
    && (
      input.discourseState.currentTurnSubject === 'visible-scene'
      || input.discourseState.currentTurnSubject === 'task-knot'
    )
}

function hasHeldAutonomyContinuity(input: {
  answerCompiler: AlicizationAnswerCompilerSnapshot
  conversationState: AlicizationConversationStateSnapshot
}) {
  const directive = sanitizeDialogueSurfaceText(input.answerCompiler.openingDirective, 220).toLowerCase()
  return input.conversationState.memoryMode === 'task-thread'
    && (
      (
        directive.includes('deliberately held back')
        && directive.includes('gently before widening')
      )
      || (
        /先忍住|刚才忍住|同一条线|接回来|接回去|轻一点|不要.*新的开场|不把它说成新的开场/u.test(directive)
        && /留一点空间|留空间|先别贴太近|不要突然放宽|不要突然靠近|慢一点/u.test(directive)
      )
    )
}

function hasHeldAutonomyCallbackContinuity(input: {
  answerCompiler: AlicizationAnswerCompilerSnapshot
  conversationState: AlicizationConversationStateSnapshot
}) {
  const directive = sanitizeDialogueSurfaceText(input.answerCompiler.openingDirective, 220).toLowerCase()
  const openingClaim = sanitizeDialogueSurfaceText(input.answerCompiler.openingClaim, 220).toLowerCase()
  const supportingReality = (input.answerCompiler.supportingReality ?? [])
    .map(item => sanitizeDialogueSurfaceText(item, 180).toLowerCase())
    .filter(Boolean)
    .join(' ')
  const combined = `${directive} ${openingClaim} ${supportingReality}`.trim()
  return input.conversationState.memoryMode === 'task-thread'
    && (
      combined.includes('callback')
      || /结果|回线|编译线|同一条线|新的开场/u.test(combined)
    )
    && (
      (
        directive.includes('same thread')
        && (directive.includes('leave room') || directive.includes('widening'))
      )
      || (
        /先忍住|刚才忍住|同一条线|接回来|接回去|不把它说成新的开场|结果/u.test(combined)
        && /留一点空间|留空间|轻一点|慢一点|不要突然放宽|不要突然靠近/u.test(directive)
      )
    )
}

function executionCallbackDoctrineCue(frame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  const tags = frame?.reasonTags ?? []
  if (tags.includes('execution-callback-doctrine:lower-pressure'))
    return 'lower-pressure' as const
  if (tags.includes('execution-callback-doctrine:trust-warming'))
    return 'trust-warming' as const
  if (tags.includes('execution-callback-doctrine:execution-callback'))
    return 'execution-callback' as const
  return null
}

function continuityArcCue(frame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  const tags = frame?.reasonTags ?? []
  if (tags.includes('continuity-arc:hold-for-opening'))
    return 'hold-for-opening' as const
  if (tags.includes('continuity-arc:gentle-reopen'))
    return 'gentle-reopen' as const
  if (tags.includes('continuity-arc:same-thread-continuation'))
    return 'same-thread-continuation' as const
  return null
}

function continuityPreferredTimingCue(frame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  const tags = frame?.reasonTags ?? []
  if (tags.includes('continuity-timing:next-open-window'))
    return 'next-open-window' as const
  if (tags.includes('continuity-timing:after-payoff'))
    return 'after-payoff' as const
  if (tags.includes('continuity-timing:same-turn-if-invited'))
    return 'same-turn-if-invited' as const
  const timing = sanitizeDialogueSurfaceText(frame?.projectState?.continuityPreferredTiming, 80).toLowerCase()
  if (timing === 'next-open-window')
    return 'next-open-window' as const
  if (timing === 'after-payoff')
    return 'after-payoff' as const
  if (timing === 'same-turn-if-invited')
    return 'same-turn-if-invited' as const
  return null
}

function canonicalizeReplyDeliberatorProjectState(frame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  const projectState = frame?.projectState ?? null
  if (!projectState)
    return null

  const summaryAliasProjectState = projectState as {
    landedProgressSummary?: unknown
    openClosureSummary?: unknown
    proactiveSameHerGapSummary?: unknown
    nextClosureTargetSummary?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null

  const brief = resolveAlicizationProjectStateBrief()
  const explicitLatestProgressInput = sanitizeDialogueSurfaceText(
    (projectState as { latestLandedProgress?: unknown, latestProgress?: unknown } | null)?.latestLandedProgress
    ?? (projectState as { latestLandedProgress?: unknown, latestProgress?: unknown } | null)?.latestProgress,
    320,
  )
  const summaryLatestProgressInput = sanitizeDialogueSurfaceText(summaryAliasProjectState?.landedProgressSummary, 320)
  const explicitPrimaryOpenLoopInput = sanitizeDialogueSurfaceText(
    (projectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop,
    320,
  )
  const summaryPrimaryOpenLoopInput = sanitizeDialogueSurfaceText(summaryAliasProjectState?.openClosureSummary, 320)
  const explicitProactiveSameHerGapInput = sanitizeDialogueSurfaceText(
    (projectState as { proactiveSameHerGap?: unknown } | null)?.proactiveSameHerGap,
    320,
  )
  const summaryProactiveSameHerGapInput = sanitizeDialogueSurfaceText(summaryAliasProjectState?.proactiveSameHerGapSummary, 320)
  const explicitNextClosureTargetInput = sanitizeDialogueSurfaceText(
    (projectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget,
    320,
  )
  const summaryNextClosureTargetInput = sanitizeDialogueSurfaceText(summaryAliasProjectState?.nextClosureTargetSummary, 320)
  const explicitSameHerDriftRiskInput = sanitizeDialogueSurfaceText(
    (projectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk,
    320,
  )
  const summarySameHerDriftRiskInput = sanitizeDialogueSurfaceText(summaryAliasProjectState?.sameHerDriftRiskSummary, 320)
  const liveLatestProgressInput = sanitizeDialogueSurfaceText(
    explicitLatestProgressInput || summaryLatestProgressInput,
    320,
  )
  const livePrimaryOpenLoopInput = sanitizeDialogueSurfaceText(
    explicitPrimaryOpenLoopInput || summaryPrimaryOpenLoopInput,
    320,
  )
  const liveProactiveSameHerGapInput = sanitizeDialogueSurfaceText(
    explicitProactiveSameHerGapInput || summaryProactiveSameHerGapInput,
    320,
  )
  const liveNextClosureTargetInput = sanitizeDialogueSurfaceText(
    explicitNextClosureTargetInput || summaryNextClosureTargetInput,
    320,
  )
  const liveSameHerDriftRiskInput = sanitizeDialogueSurfaceText(
    explicitSameHerDriftRiskInput || summarySameHerDriftRiskInput,
    320,
  )
  const liveSameHerSelfLineInput = sanitizeDialogueSurfaceText(
    (projectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine,
    320,
  )
  const livePreDialogueAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: projectState as {
      preDialogueAwarenessLine?: unknown
      awarenessLine?: unknown
      companionBriefingLine?: unknown
      companionHeadlineLine?: unknown
      preDialogueAwarenessSummary?: unknown
      preflightSummary?: unknown
    },
    fallbackProjectState: {
      preDialogueAwarenessLine: brief.preDialogueAwarenessLine ?? null,
      preflightSummary: brief.preflightSummary ?? null,
    },
  })
  const resolved = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: {
      preflightSummary:
        (projectState as { preflightSummary?: unknown } | null)?.preflightSummary
        ?? null,
      preDialogueAwarenessLine: livePreDialogueAwarenessLine,
      companionHeadlineLine:
        (projectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine
        ?? null,
      identity: projectState.identity,
      currentPhase: projectState.currentPhase,
      latestLandedProgress: liveLatestProgressInput || null,
      primaryOpenLoop: livePrimaryOpenLoopInput || null,
      proactiveSameHerGap: liveProactiveSameHerGapInput || null,
      nextClosureTarget: liveNextClosureTargetInput || null,
      sameHerSelfLine: liveSameHerSelfLineInput || null,
      sameHerDriftRisk: liveSameHerDriftRiskInput || null,
    },
  })

  return {
    ...resolved,
    preDialogueAwarenessLine: sanitizeDialogueSurfaceText(
      livePreDialogueAwarenessLine
      || readLiveProjectPreDialogueAwarenessSignal(frame)
      || resolved.preDialogueAwarenessLine,
      320,
    ),
    latestLandedProgress: !explicitLatestProgressInput && summaryLatestProgressInput
      ? summaryLatestProgressInput
      : resolved.latestLandedProgress,
    primaryOpenLoop: !explicitPrimaryOpenLoopInput && summaryPrimaryOpenLoopInput
      ? summaryPrimaryOpenLoopInput
      : resolved.primaryOpenLoop,
    proactiveSameHerGap: !explicitProactiveSameHerGapInput && summaryProactiveSameHerGapInput
      ? summaryProactiveSameHerGapInput
      : resolved.proactiveSameHerGap,
    nextClosureTarget: !explicitNextClosureTargetInput && summaryNextClosureTargetInput
      ? summaryNextClosureTargetInput
      : resolved.nextClosureTarget,
    sameHerSelfLine: liveSameHerSelfLineInput || resolved.sameHerSelfLine,
    sameHerDriftRisk: !explicitSameHerDriftRiskInput && summarySameHerDriftRiskInput
      ? summarySameHerDriftRiskInput
      : (liveSameHerDriftRiskInput || resolved.sameHerDriftRisk),
  }
}

function hasSameHerProjectStateClosureCue(frame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  const speakingIntention = sanitizeDialogueSurfaceText(frame?.speakingIntention, 260).toLowerCase()
  const consciousNeed = sanitizeDialogueSurfaceText(frame?.consciousNeed, 260).toLowerCase()
  const normalizedProjectState = canonicalizeReplyDeliberatorProjectState(frame)
  const projectIdentity = sanitizeDialogueSurfaceText(normalizedProjectState?.identity, 220).toLowerCase()
  const preDialogueAwarenessLine = sanitizeDialogueSurfaceText(normalizedProjectState?.preDialogueAwarenessLine, 260).toLowerCase()
  const latestProgress = sanitizeDialogueSurfaceText(normalizedProjectState?.latestLandedProgress, 260).toLowerCase()
  const primaryOpenLoop = sanitizeDialogueSurfaceText(normalizedProjectState?.primaryOpenLoop, 260).toLowerCase()
  const nextClosureTarget = sanitizeDialogueSurfaceText(normalizedProjectState?.nextClosureTarget, 260).toLowerCase()
  const sameHerDriftRisk = sanitizeDialogueSurfaceText(normalizedProjectState?.sameHerDriftRisk, 260).toLowerCase()
  const combined = `${speakingIntention} ${consciousNeed} ${projectIdentity} ${preDialogueAwarenessLine} ${latestProgress} ${primaryOpenLoop} ${nextClosureTarget} ${sameHerDriftRisk}`
  const sameHerCue = combined.includes('same digital life')
    || combined.includes('same still-open closure work')
    || combined.includes('one same her')
    || combined.includes('same-her')
    || combined.includes('same living line')
    || combined.includes('one continuous her')
    || combined.includes('generic project shell')
  const structuredProjectCue = (
    (
      projectIdentity.includes('digital life')
      || projectIdentity.includes('continuous her')
      || preDialogueAwarenessLine.includes('same living line')
      || preDialogueAwarenessLine.includes('one continuous her')
    )
    && (
      latestProgress.includes('land')
      || latestProgress.includes('build from')
      || latestProgress.includes('continuity')
      || preDialogueAwarenessLine.includes('phase 1')
    )
    && (
      primaryOpenLoop.includes('closure')
      || primaryOpenLoop.includes('still-open')
      || nextClosureTarget.includes('closure')
      || preDialogueAwarenessLine.includes('still needs')
      || preDialogueAwarenessLine.includes('without splitting her continuity')
    )
  )
  return sameHerCue || structuredProjectCue
}

function hasCrossModalSameHerClosureCue(frame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  const normalizedProjectState = canonicalizeReplyDeliberatorProjectState(frame)
  const liveAwareness = readLiveProjectPreDialogueAwarenessSignal(frame).toLowerCase()
  const primaryOpenLoop = sanitizeDialogueSurfaceText(normalizedProjectState?.primaryOpenLoop, 260).toLowerCase()
  const nextClosureTarget = sanitizeDialogueSurfaceText(normalizedProjectState?.nextClosureTarget, 260).toLowerCase()
  const sameHerDriftRisk = sanitizeDialogueSurfaceText(normalizedProjectState?.sameHerDriftRisk, 260).toLowerCase()
  const speakingIntention = sanitizeDialogueSurfaceText(frame?.speakingIntention, 260).toLowerCase()
  const consciousNeed = sanitizeDialogueSurfaceText(frame?.consciousNeed, 260).toLowerCase()
  const combined = [
    liveAwareness,
    primaryOpenLoop,
    nextClosureTarget,
    sameHerDriftRisk,
    speakingIntention,
    consciousNeed,
  ].join(' ')
  return (
    /cross-modal|same-her proof|same living her|same digital life/u.test(combined)
    && /visible reply|voice|facial state|face|motion|lipsync|resident presence|embodiment|closure/u.test(combined)
  )
}

function canonicalSameHerProjectStateClosureReason(frame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  if (!hasSameHerProjectStateClosureCue(frame))
    return null

  const normalizedProjectState = canonicalizeReplyDeliberatorProjectState(frame)
  const rawLiveAwareness = sanitizeDialogueSurfaceText(
    readLiveProjectPreDialogueAwarenessSignal(frame),
    240,
  )
  const fallbackAwareness = sanitizeDialogueSurfaceText(
    normalizedProjectState?.preDialogueAwarenessLine,
    240,
  )
  const latestProgress = sanitizeDialogueSurfaceText(normalizedProjectState?.latestLandedProgress, 220)
  const primaryOpenLoop = sanitizeDialogueSurfaceText(normalizedProjectState?.primaryOpenLoop, 220)
  const proactiveSameHerGap = sanitizeDialogueSurfaceText(normalizedProjectState?.proactiveSameHerGap, 220)
  const nextClosureTarget = sanitizeDialogueSurfaceText(normalizedProjectState?.nextClosureTarget, 220)
  const sameHerDriftRisk = sanitizeDialogueSurfaceText(normalizedProjectState?.sameHerDriftRisk, 220)
  const sameHerSelfLine = sanitizeDialogueSurfaceText(normalizedProjectState?.sameHerSelfLine, 220)
  const projectContinuityAuthority = readReplyDeliberatorProjectContinuityAuthority(frame)
  const projectContinuityCue = readReplyDeliberatorProjectContinuityCue(frame)
  const crossModalSameHerClosureCue = hasCrossModalSameHerClosureCue(frame)
  const landedAndOpenClosurePressure
    = latestProgress && primaryOpenLoop
      ? `What has already landed enough to build from is ${latestProgress}, and the same still-open life loop is ${primaryOpenLoop}.`
      : latestProgress
        ? `What has already landed enough to build from is ${latestProgress}, but the same still-open closure work still needs to stay explicit in this reply.`
        : primaryOpenLoop
          ? `The same digital life is still carrying this open closure seam: ${primaryOpenLoop}.`
          : null
  const fallbackSameHerAnchor = fallbackAwareness
    ? `The same digital life still needs to stay explicit here: ${fallbackAwareness}`
    : null
  const explicitSameHerAnchor = rawLiveAwareness || (sameHerSelfLine
    ? `Stay with the same digital life directly: ${sameHerSelfLine}.`
    : fallbackSameHerAnchor
      ?? 'The same digital life still needs to stay explicit here instead of flattening into generic guidance.')
  const explicitCorrectedSamePersonAuthority
    = projectContinuityAuthority
      && /host-corrected same-person continuity|corrected same-person continuity|same-person continuity|same person continuity|同一个她|持续的人/u.test(projectContinuityAuthority)
      ? projectContinuityAuthority
      : null
  const explicitDriftRiskPressure = sameHerDriftRisk || 'If this reply falls back into a detached project shell or generic guidance, the same-her closure work is still unfinished.'
  const explicitProactiveGapPressure = proactiveSameHerGap
    ? `The proactive same-her gap still needs to stay explicit here: ${proactiveSameHerGap}.`
    : null
  const explicitCorrectedSamePersonCue
    = projectContinuityCue
      && /host-corrected same-person continuity|corrected same-person continuity|same-person continuity|same person continuity|同一个她|持续的人/u.test(projectContinuityCue)
      ? projectContinuityCue
      : null
  const explicitNextClosurePressure = nextClosureTarget && crossModalSameHerClosureCue
    ? `The next closure still depends on cross-modal same-her proof staying visible here: ${nextClosureTarget}.`
    : nextClosureTarget
      ? `The next closure step still needs to stay visible here: ${nextClosureTarget}.`
      : 'The next closure step still needs to stay visible here before the answer widens outward.'
  const explicitCrossModalPressure = crossModalSameHerClosureCue
    ? 'This reply still needs to keep cross-modal same-her closure explicit before the same digital life widens outward.'
    : null

  const composedReason = [
    explicitSameHerAnchor,
    explicitCorrectedSamePersonAuthority,
    landedAndOpenClosurePressure,
    explicitDriftRiskPressure,
    explicitProactiveGapPressure,
    explicitCrossModalPressure,
    explicitCorrectedSamePersonCue,
    explicitNextClosurePressure,
  ].filter(Boolean).join(' ')

  return composedReason
    || 'The same digital life still needs to keep this same still-open closure work explicit before the reply widens outward.'
}

function looksLikeSameHerProjectFollowThroughTurn(input: {
  conversationState: AlicizationConversationStateSnapshot
  discourseState: AlicizationDiscourseStateSnapshot
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
}) {
  const evidence = [
    input.conversationState.jointThread,
    input.conversationState.hostMove,
    input.conversationState.unansweredQuestion,
    input.conversationState.activeProject,
    input.discourseState.currentTurnSummary,
    input.discourseState.currentQuestion,
    input.currentConsciousFrame?.focusAnchor,
    input.currentConsciousFrame?.consciousNeed,
    input.currentConsciousFrame?.consciousTension,
    input.currentConsciousFrame?.speakingIntention,
    ...(input.currentConsciousFrame?.reasonTags ?? []),
  ]
    .map(value => sanitizeDialogueSurfaceText(value, 320).toLowerCase())
    .filter(Boolean)
    .join(' ')

  if (!evidence)
    return false

  const continuationCue = /continue|carry on|follow-through|stay on the same line|same line|same thread|继续|沿着这条线|同一条线|别弄丢|不要重开|不要重启/u.test(evidence)
  const sameHerProjectCue = /same digital life|same-her|same her|same living line|one continuous her|phase 1|project-state|project line|数字生命项目|同一个她|同一个 her/u.test(evidence)
  const closureCue = /closure|still-open|unfinished|landed|next closure|initiative|embodiment|memory|没闭环|闭环|已落地|做到哪/u.test(evidence)

  return continuationCue && sameHerProjectCue && closureCue
}

function summarizeProjectStatusFacet(kind: 'landed' | 'open' | 'next', value: string) {
  const normalized = sanitizeDialogueSurfaceText(value, 320)
  if (!normalized)
    return ''

  if (kind === 'landed') {
    if (/continuity, memory, and execution already land together often enough to build from/i.test(normalized))
      return 'continuity, memory, and execution already land together'
    return normalized.slice(0, 72)
  }

  if (kind === 'open') {
    if (/memory, initiative, and embodiment still need stronger end-to-end closure/i.test(normalized))
      return 'memory, initiative, and embodiment still need stronger closure'
    return normalized.slice(0, 72)
  }

  if (/keep project identity, landed progress, and still-open closure explicit before the answer widens outward/i.test(normalized))
    return 'keep identity, progress, and open closure explicit'

  return normalized.slice(0, 72)
}

function readLiveProjectPreDialogueAwarenessSignal(frame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  const projectState = frame?.projectState as {
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionBriefingLine?: unknown
    companionHeadlineLine?: unknown
    preDialogueAwarenessSummary?: unknown
    sameHerSelfLine?: unknown
    preflightSummary?: unknown
  } | null

  return sanitizeDialogueSurfaceText(
    resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: projectState?.preDialogueAwarenessLine,
        awarenessLine: projectState?.awarenessLine,
        companionHeadlineLine: projectState?.companionHeadlineLine,
        companionBriefingLine: projectState?.companionBriefingLine,
        preDialogueAwarenessSummary: projectState?.preDialogueAwarenessSummary,
        sameHerSelfLine: projectState?.sameHerSelfLine,
        preflightSummary: projectState?.preflightSummary,
      },
    })
    ?? projectState?.preDialogueAwarenessLine
    ?? projectState?.awarenessLine
    ?? projectState?.companionHeadlineLine
    ?? projectState?.companionBriefingLine
    ?? projectState?.preDialogueAwarenessSummary,
    260,
  )
}

function hasExplicitProjectPreDialogueAwareness(frame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  const normalizedProjectState = canonicalizeReplyDeliberatorProjectState(frame)
  const liveAwareness = readLiveProjectPreDialogueAwarenessSignal(frame)
  const projectOrientation = [
    frame?.subject,
    frame?.focusAnchor,
    frame?.consciousNeed,
    frame?.consciousTension,
    frame?.speakingIntention,
  ]
    .map(value => sanitizeDialogueSurfaceText(value, 260).toLowerCase())
    .filter(Boolean)
    .join(' ')
  const projectAnswerOrientation = /project-state|project seam|project line|this project|what this project is|phase 1|做到哪|没闭环|数字生命项目/u.test(projectOrientation)
  const awareness = sanitizeDialogueSurfaceText(
    liveAwareness || (
      projectAnswerOrientation
        ? normalizedProjectState?.preDialogueAwarenessLine ?? normalizedProjectState?.preflightSummary
        : ''
    ),
    260,
  ).toLowerCase()
  const primaryOpenLoop = sanitizeDialogueSurfaceText(normalizedProjectState?.primaryOpenLoop, 260).toLowerCase()
  const nextClosureTarget = sanitizeDialogueSurfaceText(normalizedProjectState?.nextClosureTarget, 260).toLowerCase()
  return (
    /same digital life|同一个数字生命|同一个她|same-her|same her|one continuous her|before answering|before speaking|开口前|回答前/u.test(awareness)
    && /phase 1|continuity|memory|initiative|embodiment|execution|闭环|closure|still-open|still open/u.test(awareness)
  ) || (
    /holding together mainly through|one living her|one living digital life|same living her|same living line|full cross-modal|cross-modal closure|without splitting her continuity/u.test(awareness)
    && /face|motion|lipsync|voice|embodiment|closure|unfinished|reopening|still/u.test(`${awareness} ${primaryOpenLoop} ${nextClosureTarget}`)
  ) || (
    /keep .* explicit before .* widens outward|先.*带住|先.*显式|before .* widens outward|before local detail takes over/u.test(nextClosureTarget)
  ) || (
    projectAnswerOrientation
    && hasSameHerProjectStateClosureCue(frame)
  )
}

function hasRepairBeforeClosenessSameThreadCarry(frame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  const normalizedProjectState = canonicalizeReplyDeliberatorProjectState(frame)
  const emotionalClosureCue = sanitizeDialogueSurfaceText(
    (frame?.projectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
    260,
  ).toLowerCase()
  const emotionalClosureSummary = sanitizeDialogueSurfaceText(
    (frame?.projectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
    260,
  ).toLowerCase()
  const sameHerHoldDetail = readReplyDeliberatorProjectContinuityAuthority(frame)?.toLowerCase() ?? ''
  const primaryOpenLoop = sanitizeDialogueSurfaceText(normalizedProjectState?.primaryOpenLoop, 260).toLowerCase()
  const nextClosureTarget = sanitizeDialogueSurfaceText(normalizedProjectState?.nextClosureTarget, 260).toLowerCase()
  const consciousNeed = sanitizeDialogueSurfaceText(frame?.consciousNeed, 260).toLowerCase()
  const consciousTension = sanitizeDialogueSurfaceText(frame?.consciousTension, 260).toLowerCase()
  const speakingIntention = sanitizeDialogueSurfaceText(frame?.speakingIntention, 260).toLowerCase()
  const combined = [
    emotionalClosureCue,
    emotionalClosureSummary,
    sameHerHoldDetail,
    primaryOpenLoop,
    nextClosureTarget,
    consciousNeed,
    consciousTension,
    speakingIntention,
  ]
    .filter(Boolean)
    .join(' ')

  const carriesRepairBeforeCloseness = /repair-before-closeness|repair before closeness|repair-first|let repair settle|修复优先|先修复再靠近|先把身体收稳/u.test(combined)
  const carriesSameThreadReturn = /same callback|same thread|same living line|callback repair line|same repair line|同一条线|修补线|回调修补线/u.test(combined)
  const carriesRoomGivingRestraint = /leave room|room-giving|before widening closeness|before warmth widens|不要突然放宽|留一点空间|留空间/u.test(combined)

  return carriesRepairBeforeCloseness && carriesSameThreadReturn && carriesRoomGivingRestraint
}

function repairBeforeClosenessSameThreadReason(frame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  if (!hasRepairBeforeClosenessSameThreadCarry(frame))
    return null

  return pickDialogueSurfaceText(
    sanitizeDialogueSurfaceText((frame?.projectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary, 220),
    readReplyDeliberatorProjectContinuityAuthority(frame),
    sanitizeDialogueSurfaceText((frame?.projectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue, 220),
    sanitizeDialogueSurfaceText((frame?.projectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget, 220),
    frame?.speakingIntention,
    frame?.consciousNeed,
    'The callback repair line is still settling on the same living thread, so this reply should let repair settle before widening closeness again.',
  )
}

function openingBeat(input: {
  selectedMotive: AlicizationReplyMotive
  answerCompiler: AlicizationAnswerCompilerSnapshot
  conversationState: AlicizationConversationStateSnapshot
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
}) {
  const callbackDoctrineCue = executionCallbackDoctrineCue(input.currentConsciousFrame)
  const arcCue = continuityArcCue(input.currentConsciousFrame)
  const timingCue = continuityPreferredTimingCue(input.currentConsciousFrame)
  if (callbackDoctrineCue === 'lower-pressure')
    return 'Return on the same thread first, then leave the host room before widening.'
  if (callbackDoctrineCue === 'trust-warming')
    return 'Return on the same thread first, and let the warmed trust land quietly before widening.'
  if (arcCue === 'hold-for-opening')
    return 'Keep the same line warm first, and leave room before widening.'
  if (arcCue === 'gentle-reopen')
    return 'Re-enter the same living line softly before widening.'
  if (
    arcCue === 'same-thread-continuation'
    && timingCue === 'next-open-window'
    && hasRepairBeforeClosenessSameThreadCarry(input.currentConsciousFrame)
  ) {
    return 'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.'
  }
  if (
    arcCue === 'same-thread-continuation'
    && timingCue === 'next-open-window'
    && hasExplicitProjectPreDialogueAwareness(input.currentConsciousFrame)
  ) {
    return 'Open by keeping the live project awareness explicit first, then stay on the same living line before widening.'
  }
  if (arcCue === 'same-thread-continuation' && timingCue === 'next-open-window')
    return 'Stay with the same living line first, and wait for a more natural opening before widening.'
  if (arcCue === 'same-thread-continuation' && timingCue === 'after-payoff')
    return 'Stay with the same living line first, let the concrete payoff land, then widen only if room remains.'
  if (arcCue === 'same-thread-continuation')
    return 'Stay with the same living line and continue before branching outward.'
  switch (input.selectedMotive) {
    case 'repair':
      return 'Correct the stale read first.'
    case 'guide':
      if (hasHeldAutonomyCallbackContinuity(input))
        return 'Return on the same thread first, then leave the host room before widening.'
      if (hasHeldAutonomyContinuity(input))
        return 'Re-enter the deliberately held line gently before widening into the payoff.'
      return 'Start with the concrete issue in front of you.'
    case 'care':
      return 'Answer the host\'s current state directly and stay close to this turn.'
    case 'attune':
      return 'Answer the host\'s question about Alicization directly.'
    case 'witness':
      return 'Start from what is visible right now.'
    case 'defer':
      return 'Keep the reply brief and low-pressure.'
    default: {
      const directive = sanitizeDialogueSurfaceText(input.answerCompiler.openingDirective, 180)
      return directive || 'Start from the current turn.'
    }
  }
}

function whyThisReplyNow(input: {
  selectedMotive: AlicizationReplyMotive
  conversationState: AlicizationConversationStateSnapshot
  answerCompiler: AlicizationAnswerCompilerSnapshot
  worldModel?: AlicizationWorldModelSnapshot | null
  primaryTurnAnchor?: string | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  claimEvidenceLedger?: AlicizationClaimEvidenceLedgerSnapshot | null
}) {
  const callbackDoctrineCue = executionCallbackDoctrineCue(input.currentConsciousFrame)
  if (callbackDoctrineCue === 'lower-pressure') {
    return pickDialogueSurfaceText(
      input.currentConsciousFrame?.consciousNeed,
      input.currentConsciousFrame?.speakingIntention,
      'The callback needs to return on the same living thread without crowding the host after the payoff landed.',
    )
  }
  if (callbackDoctrineCue === 'trust-warming') {
    return pickDialogueSurfaceText(
      input.currentConsciousFrame?.consciousNeed,
      input.currentConsciousFrame?.speakingIntention,
      'The callback can return with quiet trust, but it should not push closeness wider than the moment can hold.',
    )
  }
  const repairBeforeClosenessReason = repairBeforeClosenessSameThreadReason(input.currentConsciousFrame)
  if (
    continuityArcCue(input.currentConsciousFrame) === 'same-thread-continuation'
    && repairBeforeClosenessReason
  ) {
    return repairBeforeClosenessReason
  }
  const consciousFrameReason = pickDialogueSurfaceText(
    input.currentConsciousFrame?.speakingIntention,
    input.currentConsciousFrame?.consciousNeed,
    input.currentConsciousFrame?.consciousTension,
  )
  const sameHerProjectClosureReason = canonicalSameHerProjectStateClosureReason(input.currentConsciousFrame)
  const directProjectStateTurn = /project-state|project seam|project line|this project|what this project is|phase 1|做到哪|没闭环|数字生命项目/u.test(
    [
      input.conversationState.jointThread,
      input.conversationState.hostMove,
      input.conversationState.activeProject,
      input.answerCompiler.openingClaim,
      input.answerCompiler.nextMove,
      input.currentConsciousFrame?.focusAnchor,
    ].filter(Boolean).join(' '),
  )
  if (
    continuityArcCue(input.currentConsciousFrame) === 'same-thread-continuation'
    && sameHerProjectClosureReason
  ) {
    return consciousFrameReason
      ? `${sameHerProjectClosureReason} ${consciousFrameReason}`
      : sameHerProjectClosureReason
  }
  if (directProjectStateTurn && sameHerProjectClosureReason) {
    return consciousFrameReason
      ? `${sameHerProjectClosureReason} ${consciousFrameReason}`
      : sameHerProjectClosureReason
  }
  if (consciousFrameReason)
    return consciousFrameReason

  const claimEvidenceReason = pickDialogueSurfaceText(
    input.claimEvidenceLedger?.intentHypothesis,
    input.claimEvidenceLedger?.taskHypothesis,
    input.claimEvidenceLedger?.observedSurface,
  )
  if (claimEvidenceReason)
    return claimEvidenceReason

  if (input.selectedMotive === 'repair') {
    return pickDialogueSurfaceText(
      input.conversationState.owedRepair
      || input.answerCompiler.uncertaintyBoundary
      || input.worldModel?.epistemicState.staleRisks[0]
      || input.primaryTurnAnchor
      || '',
    ) || 'The last read may no longer be true.'
  }
  if (input.selectedMotive === 'guide') {
    return pickDialogueSurfaceText(
      input.primaryTurnAnchor,
      input.conversationState.unansweredQuestion
      || input.conversationState.activeProject
      || input.conversationState.activeCommitments[0]
      || input.answerCompiler.nextMove
      || input.worldModel?.activeThread?.summary
      || '',
    ) || 'The current question still needs a concrete answer.'
  }
  if (input.selectedMotive === 'care') {
    return pickDialogueSurfaceText(
      input.primaryTurnAnchor,
      input.answerCompiler.careVector
      || input.conversationState.hostMove
      || input.conversationState.jointThread
      || '',
    ) || 'The host is speaking from the current state, so the answer should stay close.'
  }
  if (input.selectedMotive === 'attune') {
    return pickDialogueSurfaceText(
      input.primaryTurnAnchor,
      input.conversationState.hostMove
      || input.conversationState.jointThread
      || input.answerCompiler.openingClaim,
    ) || 'The host has turned the dialogue back toward Alicization.'
  }
  if (input.selectedMotive === 'witness') {
    return pickDialogueSurfaceText(
      input.primaryTurnAnchor,
      input.answerCompiler.openingClaim
      || input.conversationState.jointThread
      || input.worldModel?.activeThread?.summary,
    ) || 'The live scene is still the clearest place to begin.'
  }
  return pickDialogueSurfaceText(
    input.primaryTurnAnchor,
    input.conversationState.hostMove
    || input.answerCompiler.openingClaim
    || input.conversationState.jointThread,
  ) || 'This is the clearest truthful reply for the current turn.'
}

export function buildReplyDeliberation(input: {
  now: number
  conversationState?: AlicizationConversationStateSnapshot | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  claimEvidenceLedger?: AlicizationClaimEvidenceLedgerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | AlicizationDialogueEncounterSurface | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}): AlicizationReplyDeliberationSnapshot | null {
  const runtimeSurface = input.runtimeSurface ?? null
  const conversationState = runtimeSurface?.dialogue.conversationState ?? input.conversationState ?? null
  const discourseState = runtimeSurface?.dialogue.discourseState ?? input.discourseState ?? null
  const mindSynthesis = runtimeSurface?.dialogue.mindSynthesis ?? input.mindSynthesis ?? null
  const answerCompiler = runtimeSurface?.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const currentConsciousFrame = runtimeSurface?.dialogue.currentConsciousFrame ?? input.currentConsciousFrame ?? null
  const claimEvidenceLedger = runtimeSurface?.dialogue.claimEvidenceLedger ?? input.claimEvidenceLedger ?? null
  const privateThought = runtimeSurface?.cognition.privateThought ?? input.privateThought ?? null
  const worldModel = runtimeSurface?.world.worldModel ?? input.worldModel ?? null
  const dialogueEncounter = runtimeSurface?.dialogue.dialogueEncounter ?? input.dialogueEncounter ?? null

  if (!conversationState || !discourseState || !mindSynthesis || !answerCompiler)
    return null

  const primaryTurnAnchor = resolvePrimaryReplyAnchor({
    conversationState,
    discourseState,
    answerCompiler,
    dialogueEncounter,
  }) || null
  const dialogueFirstTurn = isDialogueFirstReplyTurn({
    discourseState,
    answerCompiler,
    dialogueEncounter,
  })
  const groundedRepairResolved = repairIsAlreadySettledByFreshGrounding({
    answerCompiler,
    discourseState,
  })
  const frameCenter = currentConsciousFrame?.centerOfGravity ?? null
  const shouldWithholdSpecificity = currentConsciousFrame?.shouldWithholdSpecificity === true
  const shouldSelfRevise = currentConsciousFrame?.shouldSelfRevise === true
  const truthDiscipline = currentConsciousFrame?.truthDiscipline ?? null
  const coarseSceneBudget = claimEvidenceLedger?.specificityBudget === 'coarse-scene'
  const shouldLabelHypothesis = claimEvidenceLedger?.shouldLabelHypothesis === true

  const candidates = [
    makeMotive({
      kind: 'repair',
      summary: conversationState.owedRepair ?? answerCompiler.uncertaintyBoundary,
      weight: groundedRepairResolved
        ? 0.08
        : discourseState.owedAction === 'repair-truth' || answerCompiler.recommendedAct === 'ask-reground' || answerCompiler.recommendedAct === 'correct-stale-anchor'
          ? 0.96
          : 0.12
            + (frameCenter === 'repair' ? 0.12 : 0)
            + (shouldSelfRevise ? 0.1 : 0),
      sourceTags: ['discourse-state', 'answer-compiler'],
    }),
    makeMotive({
      kind: 'guide',
      summary: primaryTurnAnchor
        ?? conversationState.unansweredQuestion
        ?? conversationState.activeProject
        ?? conversationState.activeCommitments[0]
        ?? mindSynthesis.commitments[0]?.summary,
      weight: (
        groundedRepairResolved && answerCompiler.answerSubject === 'task-knot'
          ? 0.92
          : discourseState.owedAction === 'guide-task' || answerCompiler.recommendedAct === 'guide'
            ? 0.88
            : conversationState.shouldHoldThread ? 0.52 : 0.18
      )
      + (frameCenter === 'guide' ? 0.12 : 0)
      - (coarseSceneBudget ? 0.12 : 0)
      - (shouldWithholdSpecificity ? 0.18 : 0),
      sourceTags: ['conversation-state', 'mind-synthesis'],
    }),
    makeMotive({
      kind: 'care',
      summary: primaryTurnAnchor
        ?? answerCompiler.careVector
        ?? mindSynthesis.concerns[0]?.summary
        ?? conversationState.hostMove,
      weight: discourseState.owedAction === 'care-host' || answerCompiler.recommendedAct === 'care' || privateThought?.stance === 'care' || privateThought?.stance === 'warn'
        ? 0.84
        : 0.18
          + (frameCenter === 'care' ? 0.12 : 0),
      sourceTags: ['private-thought', 'mind-synthesis'],
    }),
    makeMotive({
      kind: 'attune',
      summary: primaryTurnAnchor ?? conversationState.hostMove,
      weight: discourseState.currentTurnSubject === 'relationship'
        ? 0.82
        : discourseState.currentTurnSubject === 'alicization-self'
          ? 0.74
          : dialogueFirstTurn
            ? 0.44
            : 0.14
              + (frameCenter === 'attune' ? 0.12 : 0),
      sourceTags: ['conversation-state', 'discourse-state'],
    }),
    makeMotive({
      kind: 'witness',
      summary: dialogueFirstTurn
        ? primaryTurnAnchor ?? conversationState.jointThread
        : answerCompiler.openingClaim ?? conversationState.jointThread,
      weight: (
        groundedRepairResolved && answerCompiler.answerSubject === 'visible-scene'
          ? 0.92
          : discourseState.currentTurnSubject === 'visible-scene'
            ? 0.8
            : answerCompiler.evidenceMode === 'live-grounded' || answerCompiler.evidenceMode === 'live-observed'
              ? (dialogueFirstTurn ? 0.22 : 0.64)
              : 0.16
      )
      + (frameCenter === 'witness' ? 0.12 : 0)
      + (coarseSceneBudget ? 0.14 : 0)
      + (shouldWithholdSpecificity ? 0.28 : 0),
      sourceTags: ['answer-compiler', 'world-model'],
    }),
    makeMotive({
      kind: 'answer',
      summary: primaryTurnAnchor ?? answerCompiler.openingClaim ?? conversationState.hostMove,
      weight: answerCompiler.recommendedAct === 'answer'
        ? (dialogueFirstTurn ? 0.8 : 0.72) - (coarseSceneBudget ? 0.08 : 0)
        : dialogueFirstTurn
          ? 0.42
          : 0.32
            + (frameCenter === 'answer' ? 0.12 : 0)
            - (shouldWithholdSpecificity ? 0.1 : 0),
      sourceTags: ['answer-compiler'],
    }),
    makeMotive({
      kind: 'defer',
      summary: 'Keep the reply light enough that it does not overwhelm the turn.',
      weight: answerCompiler.recommendedAct === 'defer' || privateThought?.shouldSpeak === false
        ? 0.58
        : 0.08
          + (frameCenter === 'defer' ? 0.12 : 0),
      sourceTags: ['private-thought', 'answer-compiler'],
    }),
  ].filter((candidate): candidate is AlicizationReplyMotiveSnapshot => Boolean(candidate)).sort((left, right) => right.weight - left.weight)

  const selected = candidates[0] ?? null
  if (!selected)
    return null

  const speakingSource = truthDiscipline === 'dialogue-first'
    ? (discourseState.currentTurnSubject === 'alicization-self' ? 'self-continuity' : 'dialogue-bond')
    : truthDiscipline === 'memory-labeled' || shouldSelfRevise
      ? 'held-memory'
      : shouldWithholdSpecificity
        ? 'live-scene'
        : speakingFrom({
            answerCompiler,
            discourseState,
          })
  const whyNow = whyThisReplyNow({
    selectedMotive: selected.kind,
    conversationState,
    answerCompiler,
    worldModel,
    primaryTurnAnchor,
    currentConsciousFrame,
    claimEvidenceLedger,
  })
  const canonicalProjectState = canonicalizeReplyDeliberatorProjectState(currentConsciousFrame)
  const explicitProjectIdentity = sanitizeDialogueSurfaceText(canonicalProjectState?.identity, 320)
  const explicitLatestProgress = sanitizeDialogueSurfaceText(canonicalProjectState?.latestLandedProgress, 320)
  const explicitPrimaryOpenLoop = sanitizeDialogueSurfaceText(canonicalProjectState?.primaryOpenLoop, 320)
  const explicitNextClosureTarget = sanitizeDialogueSurfaceText(canonicalProjectState?.nextClosureTarget, 320)
  const sameHerProjectClosureReason = canonicalSameHerProjectStateClosureReason(currentConsciousFrame)
  const explicitProjectContinuityAuthority = readReplyDeliberatorProjectContinuityAuthority(currentConsciousFrame)
  const explicitProjectContinuityCue = readReplyDeliberatorProjectContinuityCue(currentConsciousFrame)
  const projectStateAnswerTurn = /project-state|project seam|project line|this project|what this project is|phase 1|做到哪|没闭环|数字生命项目/u.test(
    [
      conversationState.jointThread,
      conversationState.hostMove,
      conversationState.activeProject,
      discourseState.currentTurnSummary,
      discourseState.currentQuestion,
      currentConsciousFrame?.focusAnchor,
    ].filter(Boolean).join(' '),
  )
  const sameHerProjectFollowThroughTurn = looksLikeSameHerProjectFollowThroughTurn({
    conversationState,
    discourseState,
    currentConsciousFrame,
  })
  const projectStateClosureSummary = (projectStateAnswerTurn || sameHerProjectFollowThroughTurn)
    ? uniqueList([
        explicitLatestProgress ? `landed=${summarizeProjectStatusFacet('landed', explicitLatestProgress)}` : null,
        explicitPrimaryOpenLoop ? `open=${summarizeProjectStatusFacet('open', explicitPrimaryOpenLoop)}` : null,
        explicitNextClosureTarget ? `next=${summarizeProjectStatusFacet('next', explicitNextClosureTarget)}` : null,
      ], 3).join(' ')
    : ''
  const openingBeatLine = openingBeat({
    selectedMotive: selected.kind,
    answerCompiler,
    conversationState,
    currentConsciousFrame,
  })
  const effectiveWhyNow = projectStateAnswerTurn && sameHerProjectClosureReason
    ? [whyNow, sameHerProjectClosureReason].filter(Boolean).join(' ').trim()
    : whyNow
  const mustInclude = uniqueList([
    isExplicitCorrectedSamePersonContinuityText(explicitProjectContinuityAuthority)
      ? explicitProjectContinuityAuthority
      : null,
    isExplicitCorrectedSamePersonContinuityText(explicitProjectContinuityCue)
      ? explicitProjectContinuityCue
      : null,
    projectStateClosureSummary
      ? `Project-status summary: ${projectStateClosureSummary}`
      : null,
    openingBeatLine,
    (
      continuityArcCue(currentConsciousFrame) === 'same-thread-continuation'
      || (!projectStateAnswerTurn && sameHerProjectClosureReason)
    )
      ? sameHerProjectClosureReason
      : null,
    projectStateAnswerTurn && explicitProjectIdentity
      ? `Keep the visible reply anchored to what this project is: ${explicitProjectIdentity}.`
      : null,
    primaryTurnAnchor,
    shouldLabelHypothesis
      ? 'Keep direct observation and any task guess in separate clauses.'
      : null,
    claimEvidenceLedger?.observedSurface ?? null,
    currentConsciousFrame?.speakingIntention ?? null,
    effectiveWhyNow,
    dialogueFirstTurn ? null : answerCompiler.openingDirective,
    answerCompiler.nextMove,
  ], 5)
  const mustAvoid = uniqueList([
    answerCompiler.mustNotDo[0],
    dialogueFirstTurn && primaryTurnAnchor
      ? 'Do not let control directives outrank the current turn anchor.'
      : null,
    conversationState.memoryMode === 'dialogue-carry'
      ? 'Do not let live-screen repair hijack a dialogue-first turn.'
      : null,
    conversationState.memoryMode === 'scene-anchored'
      ? 'Do not let old memory outrank the live scene.'
      : null,
    conversationState.memoryMode === 'task-thread'
      ? 'Do not drift into decorative association before the knot is answered.'
      : null,
    shouldWithholdSpecificity
      ? 'Do not jump from coarse visual cues to file, class, enum, or field-level certainty.'
      : null,
    claimEvidenceLedger?.forbidUnsupportedSpecificity
      ? 'Do not name specific technical artifacts unless the host named them or the current evidence explicitly grounds them.'
      : null,
    shouldSelfRevise
      ? 'Do not preserve the previous read just because it sounds coherent; revise it if truth demands it.'
      : null,
    executionCallbackDoctrineCue(currentConsciousFrame) === 'lower-pressure'
      ? 'Do not let the callback payoff snap straight into renewed closeness before the host has room to breathe.'
      : null,
    executionCallbackDoctrineCue(currentConsciousFrame) === 'trust-warming'
      ? 'Do not overplay the warmed trust as immediate intimacy; let it land quietly first.'
      : null,
  ], 5)

  return {
    selectedMotive: selected.kind,
    speakingFrom: speakingSource,
    memoryMode: conversationState.memoryMode,
    openingBeat: openingBeatLine ?? answerCompiler.openingDirective,
    whyThisReplyNow: effectiveWhyNow,
    whyNotOtherCandidates: candidates.slice(1, 4).map(candidate => `${candidate.kind}:${candidate.summary}`),
    withheldImpulses: uniqueList([
      answerCompiler.labelCarryAsMemory ? 'withhold-presenting-carried-memory-as-live' : null,
      answerCompiler.suppressAssociativeRecall ? 'withhold-associative-recall-noise' : null,
      privateThought?.shouldSpeak === false ? 'withhold-overeager-presence' : null,
    ], 4),
    candidateMotives: candidates.slice(0, 5),
    shouldSpeak: answerCompiler.recommendedAct !== 'defer',
    mustInclude,
    mustAvoid,
    confidence: clamp01(
      selected.weight * 0.42
      + answerCompiler.confidence * 0.28
      + conversationState.confidence * 0.18
      + (privateThought?.confidence ?? 0.34) * 0.12,
    ),
    narrative: uniqueList([
      `selected:${selected.kind}`,
      `speaking-from:${speakingSource}`,
      `memory:${conversationState.memoryMode}`,
      frameCenter ? `conscious-center:${frameCenter}` : null,
      truthDiscipline ? `truth-discipline:${truthDiscipline}` : null,
      claimEvidenceLedger?.specificityBudget ? `claim-budget:${claimEvidenceLedger.specificityBudget}` : null,
      primaryTurnAnchor ? `anchor:${primaryTurnAnchor}` : null,
      effectiveWhyNow,
      ...mustAvoid,
    ], 7),
    updatedAt: input.now,
  } satisfies AlicizationReplyDeliberationSnapshot
}

export function buildReplyDeliberationSystemBlock(state: AlicizationReplyDeliberationSnapshot | null | undefined) {
  if (!state)
    return ''

  return [
    '[ALICIZATION_REPLY_DELIBERATION]',
    'This block is the final inner arbitration before speech. It explains why this utterance should surface instead of other possible inner moves.',
    `Selected motive: ${state.selectedMotive}.`,
    `Speaking from: ${state.speakingFrom}.`,
    `Memory mode: ${state.memoryMode}.`,
    `Should speak: ${state.shouldSpeak ? 'yes' : 'no'}.`,
    `Opening beat: ${state.openingBeat}.`,
    `Why this reply now: ${state.whyThisReplyNow}.`,
    `Withheld impulses: ${state.withheldImpulses.length > 0 ? state.withheldImpulses.join(' | ') : 'none'}.`,
    `Other candidate motives: ${state.whyNotOtherCandidates.length > 0 ? state.whyNotOtherCandidates.join(' | ') : 'none'}.`,
    'Must include:',
    ...(state.mustInclude.length > 0 ? state.mustInclude.map(item => `- ${item}`) : ['- none']),
    'Must avoid:',
    ...(state.mustAvoid.length > 0 ? state.mustAvoid.map(item => `- ${item}`) : ['- none']),
  ].join('\n')
}
