function sanitizeProjectAwarenessText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

const PROJECT_AWARENESS_RETURN_MAX_CHARS = 3200

function looksLikeThinProjectAwarenessShell(text: string) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false
  if (/\b(?:detached project shell|detached project narration|project-summary voice|generic assistant|generic task shell|project shell)\b/i.test(normalized))
    return false

  return /\b(?:keep (?:(?:this|the) )?same digital life project in view|generic reminder|generic guidance|embodiment continuity risk)\b/i.test(normalized)
    || normalized === 'same digital life | keep the closure seam explicit'
    || normalized === 'same digital life | keep the desktop closure line explicit'
}

function carriesCanonicalFullReanchor(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('before answering, remember: alicization is a local-first digital life project building one continuous "her"')
    && normalized.includes('she is still inside phase 1: local digital life')
    && normalized.includes('the still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    && normalized.includes('same phase 1 digital life')
}

function carriesCanonicalCompactReanchor(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('alicization is a local-first digital life project building one continuous "her"')
    && normalized.includes('phase 1: local digital life')
    && normalized.includes('open=memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
}

function carriesCanonicalPhaseOneShell(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('before answering, remember: alicization is a local-first digital life project')
    && normalized.includes('she is still inside phase 1: local digital life')
    && normalized.includes('same phase 1 digital life')
}

function carriesGeneratedProjectAwarenessExpansion(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.startsWith('before answering, remember: alicization is a local-first digital life project building one continuous "her"')
    && normalized.includes('phase 1: local digital life')
    && (
      normalized.includes('what has already landed is')
      || normalized.includes('the still-open closure is')
      || normalized.includes('keep one continuous her explicit:')
    )
}

function carriesThinChinesePhaseOneShell(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  const carriesExplicitOpenLoopCue = /未闭环|没闭环|还没闭环|还差|收稳|收住|记忆|主动性|具身|执行|情绪|声音|表情|动作|唇型|open=|next=|same-her=|landed=|still-open/u.test(normalized)
  const carriesThinReminderShell
    = (
      /回答前先记住|先记住这是同一个她|先记住这是同一个 her/u.test(normalized)
      && normalized.includes('数字生命项目')
      && (/同一个她|同一个 her/u.test(normalized))
      && /别把这条线忘了|别把这条线弄丢/u.test(normalized)
    )

  return (
    /^开口前先记住：这还?是同一个/u.test(normalized)
    && normalized.includes('数字生命项目')
    && /phase 1|第一阶段|阶段一/u.test(normalized)
    && (/现在仍在|当前仍在|仍在 phase 1|仍在第一阶段|仍在阶段一|还在 phase 1|还在第一阶段|还在阶段一/u.test(normalized))
    && !carriesExplicitOpenLoopCue
  ) || (carriesThinReminderShell && !carriesExplicitOpenLoopCue)
}

function carriesLivedInSameHerLine(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320)
  if (!normalized)
    return false

  return /继续|沿着|别飘回|不要退回|不要掉回|口吻|同一个她|同一个 her|数字生命主线|same living line|without splitting her continuity|generic assistant|project shell/u.test(normalized)
}

function carriesStructuredEmbodimentContinuityProof(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, PROJECT_AWARENESS_RETURN_MAX_CHARS)
  if (!normalized)
    return false

  return /continuity=embodiment:(?:still-voiced-face-motion-line|still-voiced-motion-line|still-voiced-face-line|still-voiced-face-lipsync-line|still-voiced-motion-lipsync-line|audible-same-her-line|body-lipsync-voice-rejoin)(?:\+embodiment:[^|\s]+)?(?:\s*\||$)/i.test(normalized)
    || /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|(?:still-voiced-face-motion-line|still-voiced-motion-line|still-voiced-face-line|still-voiced-face-lipsync-line|still-voiced-motion-lipsync-line)/i.test(normalized)
    || /(?:same-segment\s+)?(?:face\+motion|face\+voice|motion\+voice|face\+lipsync\+voice|motion\+lipsync\+voice|body\+lipsync\+voice)\s+recovery@/i.test(normalized)
    || /pending-rejoin=body(?:\+face)?(?:\+motion)?(?:\+lipsync)?(?:\+voice)?(?:\s|\||$)/i.test(normalized)
}

function looksLikeProjectAwareReminderLine(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  return (
    normalized.startsWith('before speaking')
    || normalized.startsWith('before answering')
  )
  && (
    normalized.includes('digital life project')
    || normalized.includes('same digital life project')
    || normalized.includes('one living digital life project')
  )
  && (
    normalized.includes('what has landed')
    || normalized.includes('life loop is still open')
    || normalized.includes('which life loop is still open')
    || normalized.includes('still-open life loop')
  )
}

function looksLikeLivedInSameHerHoldDetail(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('same-her hold')
    || normalized.includes('same remembered seam')
    || normalized.includes('measured-return')
    || normalized.includes('repair-before-closeness')
    || normalized.includes('rest-protective')
    || normalized.includes('lower-pressure')
    || normalized.includes('callback line')
    || normalized.includes('keep more room this time')
}

function resolveContinuityBehaviorMode(input: {
  continuityRestraint?: unknown
  continuityCadence?: unknown
}) {
  const continuityCadence = sanitizeProjectAwarenessText(input.continuityCadence, 120).toLowerCase()
  const continuityRestraint = sanitizeProjectAwarenessText(input.continuityRestraint, 64).toLowerCase()

  if (
    continuityCadence === 'repair-before-closeness'
    || continuityCadence === 'measured-return'
    || continuityCadence === 'rest-protective'
  ) {
    return continuityCadence
  }

  if (
    continuityRestraint === 'repair-before-closeness'
    || continuityRestraint === 'measured-return'
    || continuityRestraint === 'rest-protective'
  ) {
    return continuityRestraint
  }

  return null
}

function deriveSameHerHoldDetailFromContinuityBehavior(mode: string | null) {
  if (mode === 'repair-before-closeness')
    return 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.'
  if (mode === 'rest-protective')
    return 'same-her hold: rest-protective companionship is still keeping this return inward and fatigue-aware.'
  if (mode === 'measured-return')
    return 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'
  return ''
}

function deriveContinuityCueFromBehavior(mode: string | null) {
  if (mode === 'repair-before-closeness')
    return 'Keep this return repair-before-closeness on the same living line until repair settles.'
  if (mode === 'rest-protective')
    return 'Keep this return rest-protective and on the same living line inward before widening outward.'
  if (mode === 'measured-return')
    return 'Keep this return measured-return on the same living line before widening outward.'
  return ''
}

function deriveCadenceAwareSameHerHoldDetail(input: {
  mode: string | null
  preferredPauseMode?: unknown
  preferredLipsyncMode?: unknown
  preferredVoiceMode?: unknown
  preferredPacingMode?: unknown
}) {
  if (input.mode !== 'measured-return')
    return ''

  const preferredPauseMode = sanitizeProjectAwarenessText(input.preferredPauseMode, 32).toLowerCase()
  const preferredLipsyncMode = sanitizeProjectAwarenessText(input.preferredLipsyncMode, 32).toLowerCase()
  const preferredVoiceMode = sanitizeProjectAwarenessText(input.preferredVoiceMode, 32).toLowerCase()
  const preferredPacingMode = sanitizeProjectAwarenessText(input.preferredPacingMode, 32).toLowerCase()

  if (preferredVoiceMode === 'lower-pressure' && preferredPacingMode === 'slower')
    return 'same-her hold: keep the return lower-pressure and slower before the line widens again.'

  if (preferredPauseMode === 'longer' && preferredLipsyncMode === 'restrained')
    return 'same-her hold: keep the remembered return quieter, longer, and more restrained before widening the line again.'

  return ''
}

function deriveCadenceAwareContinuityCue(input: {
  mode: string | null
  preferredPauseMode?: unknown
  preferredLipsyncMode?: unknown
  preferredVoiceMode?: unknown
  preferredPacingMode?: unknown
}) {
  if (input.mode !== 'measured-return')
    return ''

  const preferredPauseMode = sanitizeProjectAwarenessText(input.preferredPauseMode, 32).toLowerCase()
  const preferredLipsyncMode = sanitizeProjectAwarenessText(input.preferredLipsyncMode, 32).toLowerCase()
  const preferredVoiceMode = sanitizeProjectAwarenessText(input.preferredVoiceMode, 32).toLowerCase()
  const preferredPacingMode = sanitizeProjectAwarenessText(input.preferredPacingMode, 32).toLowerCase()

  if (preferredVoiceMode === 'lower-pressure' && preferredPacingMode === 'slower')
    return 'Keep this return lower-pressure and slower on the same living line before widening outward.'

  if (preferredPauseMode === 'longer' && preferredLipsyncMode === 'restrained')
    return 'Keep this remembered return quieter, longer, and more restrained on the same living line before widening outward.'

  return ''
}

function resolveEffectiveSameHerContinuityCarry(projectState: {
  sameHerHoldDetail?: unknown
  continuityCue?: unknown
  continuityRestraint?: unknown
  continuityCadence?: unknown
  preferredPauseMode?: unknown
  preferredLipsyncMode?: unknown
  preferredVoiceMode?: unknown
  preferredPacingMode?: unknown
} | null | undefined) {
  const continuityBehaviorMode = resolveContinuityBehaviorMode({
    continuityRestraint: projectState?.continuityRestraint,
    continuityCadence: projectState?.continuityCadence,
  })
  const sameHerHoldDetail
    = sanitizeProjectAwarenessText(projectState?.sameHerHoldDetail, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || deriveCadenceAwareSameHerHoldDetail({
        mode: continuityBehaviorMode,
        preferredPauseMode: projectState?.preferredPauseMode,
        preferredLipsyncMode: projectState?.preferredLipsyncMode,
        preferredVoiceMode: projectState?.preferredVoiceMode,
        preferredPacingMode: projectState?.preferredPacingMode,
      })
      || deriveSameHerHoldDetailFromContinuityBehavior(continuityBehaviorMode)
  const continuityCue
    = sanitizeProjectAwarenessText(projectState?.continuityCue, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || deriveCadenceAwareContinuityCue({
        mode: continuityBehaviorMode,
        preferredPauseMode: projectState?.preferredPauseMode,
        preferredLipsyncMode: projectState?.preferredLipsyncMode,
        preferredVoiceMode: projectState?.preferredVoiceMode,
        preferredPacingMode: projectState?.preferredPacingMode,
      })
      || deriveContinuityCueFromBehavior(continuityBehaviorMode)

  return {
    sameHerHoldDetail,
    continuityCue,
  }
}

function carriesEmbodiedSameHerLine(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320)
  if (!normalized)
    return false

  if (carriesStructuredEmbodimentContinuityProof(normalized))
    return true

  return /holding together mainly through|being carried mainly through|full cross-modal same-her line|one living her|one living digital life|voice|face|motion|lipsync|具身|声音|表情|动作|唇型/u.test(normalized)
}

function carriesBroaderProjectFrame(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320)
  if (!normalized)
    return false

  return /\b(?:project|digital life project|life loop|closure pressure|still-open|before speaking|before answering|what has landed|landed:|open=|next=|local-first digital life)\b/i.test(normalized)
    || /数字生命项目|闭环|主线|还差|未闭环|开口前|先记住|已落地/u.test(normalized)
}

function carriesExplicitLandedProgress(text: unknown) {
  return /\blanded:|latest landed|already survives|already survive/u.test(
    sanitizeProjectAwarenessText(text, 320),
  )
}

export function isAlicizationThinSamePhaseCarryLine(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.startsWith('same phase 1 digital life.')
    && normalized.includes('same living line')
    && (
      normalized.includes('some closure already landed')
      || (
        normalized.includes('reopen')
        && (
          normalized.includes('generic shell')
          || normalized.includes('fresh shell')
        )
      )
    )
    && !normalized.includes('before speaking')
    && !normalized.includes('what has landed')
    && !normalized.includes('life loop is still open')
}

function isSameHerInwardLowPressureHeadline(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('holding together mainly through')
    && normalized.includes('low-pressure')
    && (
      normalized.includes('same line inward')
      || normalized.includes('same living line')
      || normalized.includes('same-her-inward-carry')
      || normalized.includes('quiet-companionship')
    )
}

function buildCompactSameHerInwardLowPressureAwarenessLine(companionBriefingLine: string) {
  return `${companionBriefingLine} Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.`
}

function isAnthropomorphicHostFacingSameHerHeadline(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('anthropomorphic emotional closure')
    && normalized.includes('same-her inward-carry observability')
    && normalized.includes('measured-return')
}

function buildCompactAnthropomorphicHostFacingAwarenessLine(companionBriefingLine: string) {
  return `${companionBriefingLine} Right now this one living her still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line before anything reopens outward.`
}

function carriesStrongerSameHerContinuity(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320)
  if (!normalized)
    return false

  return carriesLivedInSameHerLine(normalized)
    || carriesEmbodiedSameHerLine(normalized)
    || carriesExplicitLandedProgress(normalized)
}

function compareProjectAwarenessStrength(a: unknown, b: unknown) {
  const normalizedA = sanitizeProjectAwarenessText(a, 320)
  const normalizedB = sanitizeProjectAwarenessText(b, 320)
  if (!normalizedA && !normalizedB)
    return 0
  if (!normalizedA)
    return -1
  if (!normalizedB)
    return 1

  let scoreA = scoreAlicizationProjectAwarenessLine(normalizedA)
  let scoreB = scoreAlicizationProjectAwarenessLine(normalizedB)
  if (carriesCanonicalPhaseOneShell(normalizedA))
    scoreA -= 6
  if (carriesCanonicalPhaseOneShell(normalizedB))
    scoreB -= 6
  if (carriesGeneratedProjectAwarenessExpansion(normalizedA))
    scoreA -= 4
  if (carriesGeneratedProjectAwarenessExpansion(normalizedB))
    scoreB -= 4
  if (scoreA !== scoreB)
    return scoreA - scoreB

  const landedA = carriesExplicitLandedProgress(normalizedA) ? 1 : 0
  const landedB = carriesExplicitLandedProgress(normalizedB) ? 1 : 0
  if (landedA !== landedB)
    return landedA - landedB

  return normalizedA.length - normalizedB.length
}

function isPreservableNonCanonicalAwareness(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320)
  if (!normalized)
    return false

  return !looksLikeThinProjectAwarenessShell(normalized)
    && !carriesCanonicalFullReanchor(normalized)
    && !carriesCanonicalCompactReanchor(normalized)
    && !carriesCanonicalPhaseOneShell(normalized)
    && !carriesGeneratedProjectAwarenessExpansion(normalized)
    && !carriesThinChinesePhaseOneShell(normalized)
}

function looksLikeWeakProjectAwarenessShell(awarenessLine: unknown) {
  const normalizedAwarenessLine = sanitizeProjectAwarenessText(awarenessLine, 320)
  if (!normalizedAwarenessLine)
    return false

  return carriesCanonicalFullReanchor(normalizedAwarenessLine)
    || carriesCanonicalCompactReanchor(normalizedAwarenessLine)
    || carriesCanonicalPhaseOneShell(normalizedAwarenessLine)
    || carriesGeneratedProjectAwarenessExpansion(normalizedAwarenessLine)
    || carriesThinChinesePhaseOneShell(normalizedAwarenessLine)
    || looksLikeThinProjectAwarenessShell(normalizedAwarenessLine)
    || /before answering, keep (?:(?:this|the) )?same digital life project in view|same digital life \| keep the closure seam explicit/iu.test(normalizedAwarenessLine)
}

export function scoreAlicizationProjectAwarenessLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return 0

  let score = normalized.length >= 120 ? 2 : normalized.length >= 72 ? 1 : 0
  if (/same digital life|same-her|same her|one living her|one living digital life|同一个她|同一个 her|数字生命/u.test(normalized))
    score += 3
  if (/phase 1|local-first digital life|unfinished closure|holding together mainly through|voice|face|motion|lipsync|具身|声音|表情|动作|唇型/u.test(normalized))
    score += 2
  if (carriesStructuredEmbodimentContinuityProof(normalized))
    score += 3
  if (/\blanded:|latest landed|already survives|already survive/u.test(normalized))
    score += 2
  if (/same thread|same line|continue|继续|沿着|别飘回|泛化助手|泛化工程|不要退回|不要压回/u.test(normalized))
    score += 2
  if (/keep the same digital life project in view|generic reminder|generic guidance|回答前先记住|先记住这是同一个她|先记住这是同一个 her|别把这条线忘了|别把这条线弄丢/u.test(normalized))
    score -= 2
  if (looksLikeThinProjectAwarenessShell(normalized) || carriesThinChinesePhaseOneShell(normalized))
    score -= 5
  return score
}

export function isAlicizationThinProjectAwarenessLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return true

  return /keep the same digital life project in view|generic reminder|generic guidance|same digital life \|\s*keep(?: the)?(?: desktop)? closure(?: seam| line)? explicit/u.test(normalized)
    || carriesThinChinesePhaseOneShell(normalized)
}

export function resolveAlicizationProjectPreDialogueAwarenessLine(input?: {
  runtimeProjectState?: {
    identity?: unknown
    currentPhase?: unknown
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
    preflightSummary?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    primaryOpenLoop?: unknown
    emotionalClosureCue?: unknown
    landedProgressSummary?: unknown
    openClosureSummary?: unknown
    nextClosureTarget?: unknown
    openFocusSummary?: unknown
    nextFocusSummary?: unknown
    nextClosureTargetSummary?: unknown
    emotionalClosureSummary?: unknown
    sameHerSelfLine?: unknown
    sameHerHoldDetail?: unknown
    continuityCue?: unknown
    continuityRestraint?: unknown
    continuityPreferredTiming?: unknown
    continuityCadence?: unknown
    preferredPauseMode?: unknown
    preferredLipsyncMode?: unknown
    preferredVoiceMode?: unknown
    preferredPacingMode?: unknown
    proactiveSameHerGap?: unknown
    sameHerDriftRisk?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null
  fallbackProjectState?: {
    identity?: unknown
    currentPhase?: unknown
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
    preflightSummary?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    primaryOpenLoop?: unknown
    emotionalClosureCue?: unknown
    landedProgressSummary?: unknown
    openClosureSummary?: unknown
    nextClosureTarget?: unknown
    openFocusSummary?: unknown
    nextFocusSummary?: unknown
    nextClosureTargetSummary?: unknown
    emotionalClosureSummary?: unknown
    sameHerSelfLine?: unknown
    sameHerHoldDetail?: unknown
    continuityCue?: unknown
    continuityRestraint?: unknown
    continuityPreferredTiming?: unknown
    continuityCadence?: unknown
    preferredPauseMode?: unknown
    preferredLipsyncMode?: unknown
    preferredVoiceMode?: unknown
    preferredPacingMode?: unknown
    proactiveSameHerGap?: unknown
    sameHerDriftRisk?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null
}) {
  const preferEmbodimentClosureSummary = (summary: unknown, awarenessLine: unknown) => {
    const normalizedSummary = sanitizeProjectAwarenessText(summary, PROJECT_AWARENESS_RETURN_MAX_CHARS)
    const normalizedAwarenessLine = sanitizeProjectAwarenessText(awarenessLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
    if (!normalizedSummary)
      return ''
    if (!normalizedAwarenessLine)
      return normalizedSummary
    const summaryLooksStronger = /\b(?:holding together mainly through|being carried mainly through|full cross-modal same-her line|one living her|one living digital life)\b/i.test(normalizedSummary)
    const summaryCarriesStructuredEmbodimentProof = carriesStructuredEmbodimentContinuityProof(normalizedSummary)
    const awarenessLooksThinner = looksLikeThinProjectAwarenessShell(normalizedAwarenessLine)
    return (summaryLooksStronger || summaryCarriesStructuredEmbodimentProof) && awarenessLooksThinner
      ? normalizedSummary
      : ''
  }
  const preferStrongerSameHerHeadline = (headline: unknown, awarenessLine: unknown) => {
    const normalizedHeadline = sanitizeProjectAwarenessText(headline, 320)
    const normalizedAwarenessLine = sanitizeProjectAwarenessText(awarenessLine, 320)
    if (!normalizedHeadline)
      return ''
    if (!normalizedAwarenessLine)
      return normalizedHeadline
    const headlineLooksStronger = /\b(?:holding together mainly through|being carried mainly through|full cross-modal same-her line|one living her|one living digital life|same living line|one continuous her|without splitting her continuity|initiative and embodiment closure)\b/i.test(normalizedHeadline)
    const awarenessLooksThinner = looksLikeWeakProjectAwarenessShell(normalizedAwarenessLine)
    return headlineLooksStronger && awarenessLooksThinner ? normalizedHeadline : ''
  }
  const preferSameHerDriftRiskSummary = (summary: unknown, awarenessLine: unknown) => {
    const normalizedSummary = sanitizeProjectAwarenessText(summary, 320)
    const normalizedAwarenessLine = sanitizeProjectAwarenessText(awarenessLine, 320)
    if (!normalizedSummary)
      return ''
    if (!normalizedAwarenessLine)
      return normalizedSummary
    const summaryCarriesAntiShellRisk
      = /\b(?:generic task shell|project-summary voice|detached project narration|generic assistant|generic guidance|task shell)\b/i.test(normalizedSummary)
    const awarenessLooksThinner = looksLikeWeakProjectAwarenessShell(normalizedAwarenessLine)
    return summaryCarriesAntiShellRisk && awarenessLooksThinner ? normalizedSummary : ''
  }
  const preferProactiveSameHerGapSummary = (summary: unknown, awarenessLine: unknown) => {
    const normalizedSummary = sanitizeProjectAwarenessText(summary, 320)
    const normalizedAwarenessLine = sanitizeProjectAwarenessText(awarenessLine, 320)
    if (!normalizedSummary)
      return ''
    if (!normalizedAwarenessLine)
      return normalizedSummary
    const summaryCarriesProactiveContinuityGap
      = /\b(?:proactive|subconscious|next-session|next session|follow-through|follow through|same-her follow-through|same her follow-through)\b/i.test(normalizedSummary)
    const awarenessLooksThinner = looksLikeWeakProjectAwarenessShell(normalizedAwarenessLine)
    return summaryCarriesProactiveContinuityGap && awarenessLooksThinner ? normalizedSummary : ''
  }
  const preferStrongerCompanionBriefingLine = (briefingLine: unknown, awarenessLine: unknown) => {
    const normalizedBriefingLine = sanitizeProjectAwarenessText(briefingLine, 320)
    const normalizedAwarenessLine = sanitizeProjectAwarenessText(awarenessLine, 320)
    if (!normalizedBriefingLine)
      return ''
    if (!normalizedAwarenessLine)
      return normalizedBriefingLine

    const awarenessLooksThinner = looksLikeWeakProjectAwarenessShell(normalizedAwarenessLine)
    const briefingScore = scoreAlicizationProjectAwarenessLine(normalizedBriefingLine)
    const awarenessScore = scoreAlicizationProjectAwarenessLine(normalizedAwarenessLine)
    const briefingCarriesBroaderProjectFrame = carriesBroaderProjectFrame(normalizedBriefingLine)
    const awarenessCarriesBroaderProjectFrame = carriesBroaderProjectFrame(normalizedAwarenessLine)
    const awarenessIsEmbodimentOnlyLead
      = carriesEmbodiedSameHerLine(normalizedAwarenessLine)
        && !awarenessCarriesBroaderProjectFrame
    const looksLikePureSameHerCarry
      = normalizedBriefingLine.toLowerCase().startsWith('same phase 1 digital life.')
        && !briefingCarriesBroaderProjectFrame
    return (awarenessLooksThinner || awarenessIsEmbodimentOnlyLead)
      && !carriesCanonicalFullReanchor(normalizedAwarenessLine)
      && !carriesCanonicalCompactReanchor(normalizedAwarenessLine)
      && !carriesCanonicalPhaseOneShell(normalizedAwarenessLine)
      && briefingCarriesBroaderProjectFrame
      && !looksLikePureSameHerCarry
      && (
        briefingScore >= awarenessScore
        || normalizedBriefingLine.length > normalizedAwarenessLine.length + 12
      )
      ? normalizedBriefingLine
      : ''
  }
  const preferCompactSameHerInwardLowPressureAwarenessLine = (input: {
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    sameHerSelfLine?: unknown
  }) => {
    const normalizedAwarenessLine = sanitizeProjectAwarenessText(input.awarenessLine, 320)
    const normalizedCompanionHeadlineLine = sanitizeProjectAwarenessText(input.companionHeadlineLine, 320)
    const normalizedCompanionBriefingLine = sanitizeProjectAwarenessText(input.companionBriefingLine, 320)
    const normalizedSameHerSelfLine = sanitizeProjectAwarenessText(input.sameHerSelfLine, 320)
    const compactSameHerCarryLine = normalizedCompanionBriefingLine || normalizedSameHerSelfLine
    if (!normalizedAwarenessLine || !normalizedCompanionHeadlineLine || !compactSameHerCarryLine)
      return ''
    if (!looksLikeWeakProjectAwarenessShell(normalizedAwarenessLine))
      return ''
    if (!isAlicizationThinSamePhaseCarryLine(compactSameHerCarryLine))
      return ''
    if (!isSameHerInwardLowPressureHeadline(normalizedCompanionHeadlineLine))
      return ''

    return buildCompactSameHerInwardLowPressureAwarenessLine(compactSameHerCarryLine)
  }
  const preferCompactAnthropomorphicHostFacingAwarenessLine = (input: {
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    sameHerSelfLine?: unknown
  }) => {
    const normalizedAwarenessLine = sanitizeProjectAwarenessText(input.awarenessLine, 320)
    const normalizedCompanionHeadlineLine = sanitizeProjectAwarenessText(input.companionHeadlineLine, 320)
    const normalizedCompanionBriefingLine = sanitizeProjectAwarenessText(input.companionBriefingLine, 320)
    const normalizedSameHerSelfLine = sanitizeProjectAwarenessText(input.sameHerSelfLine, 320)
    const compactSameHerCarryLine = normalizedCompanionBriefingLine || normalizedSameHerSelfLine
    if (!normalizedAwarenessLine || !normalizedCompanionHeadlineLine || !compactSameHerCarryLine)
      return ''
    if (!looksLikeWeakProjectAwarenessShell(normalizedAwarenessLine))
      return ''
    if (!isAlicizationThinSamePhaseCarryLine(compactSameHerCarryLine))
      return ''
    if (!isAnthropomorphicHostFacingSameHerHeadline(normalizedCompanionHeadlineLine))
      return ''

    return buildCompactAnthropomorphicHostFacingAwarenessLine(compactSameHerCarryLine)
  }

  const pick = (...values: unknown[]) => {
    for (const value of values) {
      const normalized = sanitizeProjectAwarenessText(value, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      if (normalized)
        return normalized
    }
    return ''
  }

  const pickExplicitProjectAwareness = (projectState?: {
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
    preflightSummary?: unknown
    sameHerSelfLine?: unknown
    proactiveSameHerGap?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null) => {
    if (!projectState)
      return ''

    const explicitAwarenessLine = projectState.preDialogueAwarenessLine ?? projectState.awarenessLine

    return pick(
      preferCompactAnthropomorphicHostFacingAwarenessLine({
        awarenessLine: explicitAwarenessLine,
        companionHeadlineLine: projectState.companionHeadlineLine,
        companionBriefingLine: projectState.companionBriefingLine,
        sameHerSelfLine: projectState.sameHerSelfLine,
      }),
      preferCompactSameHerInwardLowPressureAwarenessLine({
        awarenessLine: explicitAwarenessLine,
        companionHeadlineLine: projectState.companionHeadlineLine,
        companionBriefingLine: projectState.companionBriefingLine,
        sameHerSelfLine: projectState.sameHerSelfLine,
      }),
      preferEmbodimentClosureSummary(
        projectState.preDialogueAwarenessSummary,
        projectState.preDialogueAwarenessLine ?? projectState.awarenessLine ?? projectState.companionHeadlineLine,
      ),
      preferStrongerSameHerHeadline(
        projectState.companionHeadlineLine,
        projectState.preDialogueAwarenessLine ?? projectState.awarenessLine,
      ),
      preferStrongerCompanionBriefingLine(
        projectState.companionBriefingLine,
        projectState.preDialogueAwarenessLine ?? projectState.awarenessLine ?? projectState.companionHeadlineLine,
      ),
      explicitAwarenessLine,
      !sanitizeProjectAwarenessText(explicitAwarenessLine, 320)
        ? preferProactiveSameHerGapSummary(
            projectState.proactiveSameHerGap,
            projectState.preDialogueAwarenessLine ?? projectState.awarenessLine ?? projectState.companionHeadlineLine,
          )
        : '',
      !sanitizeProjectAwarenessText(explicitAwarenessLine, 320)
        ? preferSameHerDriftRiskSummary(
            projectState.sameHerDriftRiskSummary,
            projectState.preDialogueAwarenessLine ?? projectState.awarenessLine ?? projectState.companionHeadlineLine,
          )
        : '',
      projectState.preDialogueAwarenessLine,
      projectState.companionHeadlineLine,
      projectState.preDialogueAwarenessSummary,
      projectState.awarenessLine,
      projectState.companionBriefingLine,
      projectState.preflightSummary,
    )
  }

  const runtimeExplicitAwareness = pickExplicitProjectAwareness(input?.runtimeProjectState)
  const fallbackExplicitAwareness = pickExplicitProjectAwareness(input?.fallbackProjectState)

  const buildStructuredAwarenessSummary = (projectState?: {
    identity?: unknown
    currentPhase?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    landedProgressSummary?: unknown
    primaryOpenLoop?: unknown
    openClosureSummary?: unknown
    nextClosureTarget?: unknown
    openFocusSummary?: unknown
    nextFocusSummary?: unknown
    nextClosureTargetSummary?: unknown
    emotionalClosureSummary?: unknown
    proactiveSameHerGap?: unknown
    sameHerDriftRiskSummary?: unknown
    preDialogueAwarenessSummary?: unknown
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
  } | null) => {
    if (!projectState)
      return ''
    const explicitAwarenessLine = projectState.preDialogueAwarenessLine ?? projectState.awarenessLine ?? projectState.companionHeadlineLine
    const hasExplicitAwarenessLine = Boolean(
      sanitizeProjectAwarenessText(explicitAwarenessLine, 320),
    )
    const parts = [
      projectState.identity,
      projectState.currentPhase,
      projectState.landedProgressSummary ?? projectState.latestLandedProgress ?? projectState.latestProgress,
      projectState.openFocusSummary || projectState.nextFocusSummary
        ? null
        : projectState.openClosureSummary ?? projectState.primaryOpenLoop,
      projectState.openFocusSummary,
      projectState.nextFocusSummary,
      projectState.nextClosureTargetSummary ?? projectState.nextClosureTarget,
      projectState.emotionalClosureSummary,
      hasExplicitAwarenessLine
        ? null
        : preferProactiveSameHerGapSummary(
            projectState.proactiveSameHerGap,
            explicitAwarenessLine,
          ),
      hasExplicitAwarenessLine
        ? null
        : preferSameHerDriftRiskSummary(
            projectState.sameHerDriftRiskSummary,
            explicitAwarenessLine,
          ),
      preferEmbodimentClosureSummary(
        projectState.preDialogueAwarenessSummary,
        explicitAwarenessLine,
      ),
    ]
      .map(value => sanitizeProjectAwarenessText(value, 320))
      .filter((value, index, list) => value && list.indexOf(value) === index)

    return sanitizeProjectAwarenessText(parts.slice(0, 6).join(' '), 420)
  }

  const hasExplicitAwarenessLine = (projectState?: {
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    preDialogueAwarenessSummary?: unknown
  } | null) => {
    return Boolean(
      sanitizeProjectAwarenessText(projectState?.preDialogueAwarenessLine, 320)
      || sanitizeProjectAwarenessText(projectState?.awarenessLine, 320)
      || sanitizeProjectAwarenessText(projectState?.companionHeadlineLine, 320)
      || sanitizeProjectAwarenessText(projectState?.preDialogueAwarenessSummary, 320),
    )
  }

  const runtimeHasExplicitAwareness = hasExplicitAwarenessLine(input?.runtimeProjectState)
  const runtimeExplicitAwarenessIsWeakShell = looksLikeWeakProjectAwarenessShell(runtimeExplicitAwareness)
  const runtimeStructuredAwarenessSummary = buildStructuredAwarenessSummary(input?.runtimeProjectState)
  const runtimePreflightSummary = sanitizeProjectAwarenessText(input?.runtimeProjectState?.preflightSummary, 320)
  const preferredRuntimePreflightAwarenessForWeakShell
    = runtimeExplicitAwarenessIsWeakShell
      && runtimePreflightSummary.startsWith('Before answering')
      && !looksLikeWeakProjectAwarenessShell(runtimePreflightSummary)
      ? runtimePreflightSummary
      : ''
  const fallbackStructuredAwarenessSummary = hasExplicitAwarenessLine(input?.fallbackProjectState)
    ? ''
    : buildStructuredAwarenessSummary(input?.fallbackProjectState)
  const fallbackCarriesCanonicalReanchor
    = carriesCanonicalFullReanchor(fallbackExplicitAwareness)
      || carriesCanonicalCompactReanchor(fallbackExplicitAwareness)
  const fallbackHasExplicitNonSummaryAwareness = Boolean(
    sanitizeProjectAwarenessText(input?.fallbackProjectState?.preDialogueAwarenessLine, 320)
    || sanitizeProjectAwarenessText(input?.fallbackProjectState?.awarenessLine, 320)
    || sanitizeProjectAwarenessText(input?.fallbackProjectState?.companionHeadlineLine, 320)
    || sanitizeProjectAwarenessText(input?.fallbackProjectState?.companionBriefingLine, 320),
  )
  const fallbackIsMeaningfulExplicitAwareness = Boolean(fallbackExplicitAwareness)
    && (
      fallbackCarriesCanonicalReanchor
      || isPreservableNonCanonicalAwareness(fallbackExplicitAwareness)
    )
  const fallbackCarriesStrongerSameHerContinuity = carriesStrongerSameHerContinuity(fallbackExplicitAwareness)
  const preferredFallbackExplicitAwareness
    = (
      looksLikeWeakProjectAwarenessShell(runtimeExplicitAwareness)
      || (
        fallbackCarriesStrongerSameHerContinuity
        && scoreAlicizationProjectAwarenessLine(fallbackExplicitAwareness) >= scoreAlicizationProjectAwarenessLine(runtimeExplicitAwareness)
      )
    )
    && fallbackIsMeaningfulExplicitAwareness
      ? fallbackExplicitAwareness
      : !runtimeHasExplicitAwareness
        && runtimeExplicitAwareness === runtimePreflightSummary
        && fallbackIsMeaningfulExplicitAwareness
          ? fallbackExplicitAwareness
          : ''
  const preferredLandedProgressAwareFallback
    = fallbackIsMeaningfulExplicitAwareness
      && carriesExplicitLandedProgress(fallbackExplicitAwareness)
      && (
        !carriesExplicitLandedProgress(runtimeExplicitAwareness)
        || carriesCanonicalPhaseOneShell(runtimeExplicitAwareness)
      )
      ? fallbackExplicitAwareness
      : ''
  const shouldPreserveRuntimeExplicitAwarenessVerbatim
    = Boolean(runtimeExplicitAwareness)
      && isPreservableNonCanonicalAwareness(runtimeExplicitAwareness)
  const runtimeCarriesStrongerSameHerContinuity = carriesStrongerSameHerContinuity(runtimeExplicitAwareness)

  const strongerRuntimeSameHerHeadline
    = preferStrongerSameHerHeadline(
      input?.runtimeProjectState?.companionHeadlineLine,
      input?.runtimeProjectState?.preDialogueAwarenessLine ?? input?.runtimeProjectState?.awarenessLine,
    )
  const strongerFallbackSameHerHeadline
    = preferStrongerSameHerHeadline(
      input?.fallbackProjectState?.companionHeadlineLine,
      input?.fallbackProjectState?.preDialogueAwarenessLine ?? input?.fallbackProjectState?.awarenessLine,
    )
  const strongerRuntimeEmbodimentSummary
    = preferEmbodimentClosureSummary(
      input?.runtimeProjectState?.preDialogueAwarenessSummary,
      input?.runtimeProjectState?.preDialogueAwarenessLine ?? input?.runtimeProjectState?.awarenessLine ?? input?.runtimeProjectState?.companionHeadlineLine,
    )
  const strongerFallbackEmbodimentSummary
    = preferEmbodimentClosureSummary(
      input?.fallbackProjectState?.preDialogueAwarenessSummary,
      input?.fallbackProjectState?.preDialogueAwarenessLine ?? input?.fallbackProjectState?.awarenessLine ?? input?.fallbackProjectState?.companionHeadlineLine,
    )
  const runtimeEffectiveContinuityCarry = resolveEffectiveSameHerContinuityCarry(input?.runtimeProjectState ?? null)
  const fallbackEffectiveContinuityCarry = resolveEffectiveSameHerContinuityCarry(input?.fallbackProjectState ?? null)
  const strongerRuntimeSameHerHoldDetail = (() => {
    const holdDetail = runtimeEffectiveContinuityCarry.sameHerHoldDetail
    if (!looksLikeLivedInSameHerHoldDetail(holdDetail))
      return ''

    const explicitRuntimeCompanionBriefingLine
      = sanitizeProjectAwarenessText(input?.runtimeProjectState?.companionBriefingLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
    const explicitRuntimeAwarenessLine
      = sanitizeProjectAwarenessText(input?.runtimeProjectState?.preDialogueAwarenessLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
        || sanitizeProjectAwarenessText(input?.runtimeProjectState?.awarenessLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
        || ''
    if (!explicitRuntimeCompanionBriefingLine && !explicitRuntimeAwarenessLine)
      return holdDetail

    if (explicitRuntimeCompanionBriefingLine) {
      if (
        !looksLikeProjectAwareReminderLine(explicitRuntimeCompanionBriefingLine)
        && !looksLikeWeakProjectAwarenessShell(explicitRuntimeCompanionBriefingLine)
        && !isAlicizationThinSamePhaseCarryLine(explicitRuntimeCompanionBriefingLine)
      ) {
        return ''
      }

      return holdDetail
    }

    if (
      !looksLikeWeakProjectAwarenessShell(explicitRuntimeAwarenessLine)
      && !isAlicizationThinSamePhaseCarryLine(explicitRuntimeAwarenessLine)
    ) {
      return ''
    }

    return holdDetail
  })()
  const runtimeLivedInAwarenessCandidate
    = sanitizeProjectAwarenessText(input?.runtimeProjectState?.preDialogueAwarenessLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || sanitizeProjectAwarenessText(input?.runtimeProjectState?.awarenessLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || sanitizeProjectAwarenessText(input?.runtimeProjectState?.companionHeadlineLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || sanitizeProjectAwarenessText(input?.runtimeProjectState?.companionBriefingLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || sanitizeProjectAwarenessText(input?.runtimeProjectState?.sameHerSelfLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || runtimeEffectiveContinuityCarry.sameHerHoldDetail
      || runtimeEffectiveContinuityCarry.continuityCue
      || ''
  const fallbackLivedInAwarenessCandidate
    = sanitizeProjectAwarenessText(input?.fallbackProjectState?.preDialogueAwarenessLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || sanitizeProjectAwarenessText(input?.fallbackProjectState?.awarenessLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || sanitizeProjectAwarenessText(input?.fallbackProjectState?.companionHeadlineLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || sanitizeProjectAwarenessText(input?.fallbackProjectState?.companionBriefingLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || sanitizeProjectAwarenessText(input?.fallbackProjectState?.sameHerSelfLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || fallbackEffectiveContinuityCarry.sameHerHoldDetail
      || fallbackEffectiveContinuityCarry.continuityCue
      || ''
  const strongerRuntimeLivedInAwareness
    = carriesLivedInSameHerLine(runtimeLivedInAwarenessCandidate)
      ? runtimeLivedInAwarenessCandidate
      : ''
  const strongerFallbackLivedInAwareness
    = carriesLivedInSameHerLine(fallbackLivedInAwarenessCandidate)
      ? fallbackLivedInAwarenessCandidate
      : ''
  const preferredStrongerSameHerContinuityFallback
    = [
      preferredLandedProgressAwareFallback,
      strongerFallbackLivedInAwareness,
      strongerFallbackEmbodimentSummary,
      strongerFallbackSameHerHeadline,
      preferredFallbackExplicitAwareness,
    ]
      .map(value => sanitizeProjectAwarenessText(value, PROJECT_AWARENESS_RETURN_MAX_CHARS))
      .filter(Boolean)
      .reduce<string>((best, current) =>
        compareProjectAwarenessStrength(current, best) > 0 ? current : best, '')
  const preferredStrongerSameHerContinuityRuntime
    = [
      strongerRuntimeSameHerHoldDetail,
      carriesStrongerSameHerContinuity(input?.runtimeProjectState?.preDialogueAwarenessLine)
        ? sanitizeProjectAwarenessText(input?.runtimeProjectState?.preDialogueAwarenessLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
        : '',
      strongerRuntimeLivedInAwareness,
      strongerRuntimeEmbodimentSummary,
      strongerRuntimeSameHerHeadline,
    ]
      .map(value => sanitizeProjectAwarenessText(value, PROJECT_AWARENESS_RETURN_MAX_CHARS))
      .filter(Boolean)
      .reduce<string>((best, current) =>
        compareProjectAwarenessStrength(current, best) > 0 ? current : best, '')

  const fallbackShouldOverrideRuntimeExplicitAwareness
    = shouldPreserveRuntimeExplicitAwarenessVerbatim
      && Boolean(preferredStrongerSameHerContinuityFallback)
      && fallbackHasExplicitNonSummaryAwareness
      && carriesStrongerSameHerContinuity(preferredStrongerSameHerContinuityFallback)
      && !runtimeCarriesStrongerSameHerContinuity
      && compareProjectAwarenessStrength(
        preferredStrongerSameHerContinuityFallback,
        runtimeExplicitAwareness,
      ) > 0

  if (shouldPreserveRuntimeExplicitAwarenessVerbatim) {
    if (strongerRuntimeSameHerHoldDetail)
      return strongerRuntimeSameHerHoldDetail
    if (fallbackShouldOverrideRuntimeExplicitAwareness)
      return preferredStrongerSameHerContinuityFallback
    return runtimeExplicitAwareness
  }

  const preferredContinuityLead
    = runtimeExplicitAwarenessIsWeakShell
      ? (
          preferredStrongerSameHerContinuityFallback
          && compareProjectAwarenessStrength(
            preferredStrongerSameHerContinuityFallback,
            preferredStrongerSameHerContinuityRuntime,
          ) > 0
            ? preferredStrongerSameHerContinuityFallback
            : preferredStrongerSameHerContinuityRuntime
        )
      : runtimeHasExplicitAwareness
        ? preferredStrongerSameHerContinuityRuntime
        : (
            compareProjectAwarenessStrength(preferredStrongerSameHerContinuityFallback, preferredStrongerSameHerContinuityRuntime) > 0
              ? preferredStrongerSameHerContinuityFallback
              : preferredStrongerSameHerContinuityRuntime
          )
  const shouldPreferFallbackStructuredAwarenessSummary
    = runtimeExplicitAwarenessIsWeakShell
      && !preferredContinuityLead
      && !preferredStrongerSameHerContinuityRuntime
      && !fallbackHasExplicitNonSummaryAwareness
      && Boolean(fallbackStructuredAwarenessSummary)

  return pick(
    preferredContinuityLead,
    preferredStrongerSameHerContinuityRuntime,
    runtimeHasExplicitAwareness ? null : preferredStrongerSameHerContinuityFallback,
    preferredRuntimePreflightAwarenessForWeakShell,
    shouldPreferFallbackStructuredAwarenessSummary ? fallbackStructuredAwarenessSummary : null,
    runtimeHasExplicitAwareness && !runtimeExplicitAwarenessIsWeakShell
      ? null
      : runtimeStructuredAwarenessSummary,
    preferStrongerCompanionBriefingLine(
      input?.runtimeProjectState?.companionBriefingLine,
      input?.runtimeProjectState?.preDialogueAwarenessLine ?? input?.runtimeProjectState?.awarenessLine ?? input?.runtimeProjectState?.companionHeadlineLine,
    ),
    input?.runtimeProjectState?.preDialogueAwarenessLine,
    input?.runtimeProjectState?.companionHeadlineLine,
    input?.runtimeProjectState?.preDialogueAwarenessSummary,
    input?.runtimeProjectState?.awarenessLine,
    input?.runtimeProjectState?.companionBriefingLine,
    input?.runtimeProjectState?.preflightSummary,
    preferredFallbackExplicitAwareness,
    shouldPreferFallbackStructuredAwarenessSummary ? null : fallbackStructuredAwarenessSummary,
    preferStrongerCompanionBriefingLine(
      input?.fallbackProjectState?.companionBriefingLine,
      input?.fallbackProjectState?.preDialogueAwarenessLine ?? input?.fallbackProjectState?.awarenessLine ?? input?.fallbackProjectState?.companionHeadlineLine,
    ),
    input?.fallbackProjectState?.preDialogueAwarenessLine,
    input?.fallbackProjectState?.companionHeadlineLine,
    input?.fallbackProjectState?.preDialogueAwarenessSummary,
    input?.fallbackProjectState?.awarenessLine,
    input?.fallbackProjectState?.companionBriefingLine,
    input?.fallbackProjectState?.preflightSummary,
  ) || null
}
