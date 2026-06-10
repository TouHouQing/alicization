function normalizeContinuityClosureText(text: string | null | undefined) {
  return typeof text === 'string'
    ? text.trim().toLowerCase()
    : ''
}

export function hasGenericContinuityModeMenu(text: string | null | undefined) {
  const normalized = normalizeContinuityClosureText(text)
  if (!normalized)
    return false

  return /measured-return\s*\/\s*repair-before-closeness|measured-return,\s*repair-before-closeness,\s*or\b/u.test(normalized)
}

function hasExplicitMeasuredReturnAuthority(text: string | null | undefined) {
  const normalized = normalizeContinuityClosureText(text)
  if (!normalized)
    return false

  const mentionsMeasuredReturn
    = /measured-return|lower-pressure|low-pressure|leave more room|leave room before widening|same living line is still settling|without reopening from scratch|do not reopen from scratch|next-open-window|next open window|same lower-pressure callback seam|same lower pressure callback seam|same thread measured-return|same-thread measured-return|轻一点|放轻|留白|慢一点/u.test(normalized)
  if (!mentionsMeasuredReturn)
    return false

  if (!hasGenericContinuityModeMenu(normalized))
    return true

  return /keep the callback on the same living line|keep the return low-pressure|let the return stay lower-pressure|leave more room|leave room before widening|same living line is still settling|without reopening from scratch|do not reopen from scratch|next-open-window|next open window|same lower-pressure callback seam|same lower pressure callback seam|same thread measured-return|same-thread measured-return|measured-return body line|same living audio thread|quieter living line|轻一点|放轻|留白|慢一点/u.test(normalized)
}

function hasExplicitMeasuredReturnHoldAuthority(text: string | null | undefined) {
  const normalized = normalizeContinuityClosureText(text)
  if (!normalized)
    return false

  const mentionsMeasuredReturnHold
    = /same-her hold|same her hold/u.test(normalized)
      && /measured-return|lower-pressure|leave more room|callback line|before it widens again|before it widens/u.test(normalized)
  if (!mentionsMeasuredReturnHold)
    return false

  if (!hasGenericContinuityModeMenu(normalized))
    return true

  return /callback line|lower-pressure|leave more room|before it widens again|before it widens/u.test(normalized)
}

function hasExplicitRememberedSeamMoreRoomAuthority(text: string | null | undefined) {
  const normalized = normalizeContinuityClosureText(text)
  if (!normalized)
    return false

  const mentionsRememberedSeam
    = /remembered seam|same remembered relationship seam|same remembered seam|relationship seam|记住的关系缝|关系线/u.test(normalized)
  if (!mentionsRememberedSeam)
    return false

  return /reopened too eagerly|too eagerly before|more room this time|this time keep more room|keep more room this time|leave more room|do not reopen it with the same eagerness|before leaning in again|这次更要留白|这次要更慢一点|不要重开得太快|上次太急/u.test(normalized)
}

function hasExplicitExecutionResumeConfirmationBoundaryAuthority(text: string | null | undefined) {
  const normalized = normalizeContinuityClosureText(text)
  if (!normalized)
    return false

  const mentionsExecutionResumeConfirmation
    = /execution-resume-confirmation|host-confirmed-before-redispatch|resume-before-dispatch|process-not-yet-restarted|bounded confirmation boundary|bounded redispatch|host-confirmed/u.test(normalized)
  if (!mentionsExecutionResumeConfirmation)
    return false

  if (/before another execution-shaped opening|not permanent execution permission|not generic autonomous continuation|confirmation boundary before redispatch|bounded confirmation boundary|bounded redispatch/u.test(normalized))
    return true

  const compactBoundaryMarkerCount = [
    /host-confirmed-before-redispatch/u.test(normalized),
    /resume-before-dispatch/u.test(normalized),
    /process-not-yet-restarted/u.test(normalized),
    /approval=host-confirmed/u.test(normalized),
  ].filter(Boolean).length

  return compactBoundaryMarkerCount >= 2
}

function hasExplicitBlockedDispatchSafetyBoundaryAuthority(text: string | null | undefined) {
  const normalized = normalizeContinuityClosureText(text)
  if (!normalized)
    return false

  const mentionsBlockedDispatch
    = /blocked-dispatch|blocked before dispatch|blocked-before-dispatch|confirmation=required|no-process-started|permission=none|implicit-or-explicit-confirmation-required/u.test(normalized)
  if (!mentionsBlockedDispatch)
    return false

  if (/before another execution-shaped opening|not ordinary proactive closeness|confirmation boundary|safety gate/u.test(normalized))
    return true

  const compactBoundaryMarkerCount = [
    /blocked-before-dispatch/u.test(normalized),
    /confirmation=required/u.test(normalized),
    /no-process-started/u.test(normalized),
    /permission=none/u.test(normalized),
  ].filter(Boolean).length

  return compactBoundaryMarkerCount >= 2
}

export function hasExplicitRepairBeforeClosenessAuthority(text: string | null | undefined) {
  const normalized = normalizeContinuityClosureText(text)
  if (!normalized)
    return false

  const mentionsRepair
    = /repair-before-closeness|repair before closeness|repair-first|repair first|先修复|修复优先|先把身体收稳|先让修复落稳|let repair settle|repair settle first|repair settles first/u.test(normalized)
  if (!mentionsRepair)
    return false

  if (!hasGenericContinuityModeMenu(normalized))
    return true

  return /same-her callback repair seam|callback repair|repair seam|repair line|repair-before-closeness still holds|repair-before-closeness still owns|keep this (?:callback )?return repair-before-closeness|keep repair-before-closeness on the same living line|embodiment repair-before-closeness on the same living line|repair still needs to land|before any warmer reopening|until repair settles|until the room settles|先修复再靠近|修复线|修补线/u.test(normalized)
}

function hasExplicitRestProtectiveAuthority(text: string | null | undefined) {
  const normalized = normalizeContinuityClosureText(text)
  if (!normalized)
    return false

  const mentionsRestProtective
    = /rest-protective|rest protection|fatigue-aware|let rest protection hold|before warmth widens|先让休息保护|疲惫感先缓住/u.test(normalized)
  if (!mentionsRestProtective)
    return false

  if (!hasGenericContinuityModeMenu(normalized))
    return true

  return /fatigue-aware|let rest protection hold|before warmth widens|先让休息保护|疲惫感先缓住/u.test(normalized)
}

function hasExplicitReturnedSideVisibleReplyAuthority(text: string | null | undefined) {
  const normalized = normalizeContinuityClosureText(text)
  if (!normalized)
    return false

  const mentionsReturnedSideVisibleReply
    = /returned-side|returned side|visible reply|reply formation|provider-facing|project summary|background side-channel|background side channel|provider-stream reply|provider stream reply|host-visible rebuild|host visible rebuild/u.test(normalized)
  if (!mentionsReturnedSideVisibleReply)
    return false

  const mentionsSameHerContinuity
    = /same phase 1 digital life|phase 1 living line|same living line|same her|same-her|one continuous her|one same her|same digital life/u.test(normalized)
  if (!mentionsSameHerContinuity)
    return false

  return /before any project summary widens|before the wider project summary restarts|before visible reply formation|before the next visible reply|carry the same-her hold through visible reply formation|returned-side visible reply must stay|instead of restarting as a generic shell|keep the already-settled provider-stream reply|already-settled provider-stream reply|already settled provider-stream reply|preserve the same-her hold after host-visible rebuild|preserve the same-her hold after host visible rebuild/u.test(normalized)
}

function hasExplicitQuietCompanionshipAuthority(text: string | null | undefined) {
  const normalized = normalizeContinuityClosureText(text)
  if (!normalized)
    return false

  const mentionsQuietCompanionship
    = /quiet-companionship|quiet companionship|quiet line|stay inward|line holds inward|before widening outward|先别外扩/u.test(normalized)
  if (!mentionsQuietCompanionship)
    return false

  if (!hasGenericContinuityModeMenu(normalized))
    return true

  return /quiet line|stay inward|line holds inward|before widening outward|先别外扩/u.test(normalized)
}

function hasExplicitCorrectedSamePersonAuthority(text: string | null | undefined) {
  const normalized = normalizeContinuityClosureText(text)
  if (!normalized)
    return false

  const mentionsCorrectedSamePerson
    = /host-corrected same-person continuity|corrected same-person continuity|same-person continuity|same person continuity|同一个她|持续的人/u.test(normalized)
  if (!mentionsCorrectedSamePerson)
    return false

  return /authoritative before any progress-style continuation|before any progress-style continuation|before any status recap|status recap|progress pressure|progress recap|task-shell continuity|anti-progress-pressure/u.test(normalized)
}

function scoreExplicitContinuityClosureAuthority(text: string | null | undefined) {
  if (hasExplicitCorrectedSamePersonAuthority(text))
    return 10
  if (hasExplicitBlockedDispatchSafetyBoundaryAuthority(text))
    return 9
  if (hasExplicitExecutionResumeConfirmationBoundaryAuthority(text))
    return 9
  if (hasExplicitMeasuredReturnHoldAuthority(text))
    return 7
  if (hasExplicitRememberedSeamMoreRoomAuthority(text))
    return 7
  if (hasExplicitReturnedSideVisibleReplyAuthority(text))
    return 7
  if (hasExplicitRepairBeforeClosenessAuthority(text))
    return 8
  if (hasExplicitRestProtectiveAuthority(text))
    return 8
  if (hasExplicitQuietCompanionshipAuthority(text))
    return 6
  if (hasExplicitMeasuredReturnAuthority(text))
    return 2
  return 0
}

export function preferStrongerContinuityClosureAuthority(
  current: string | null | undefined,
  candidate: string | null | undefined,
) {
  if (!current || !candidate || current === candidate)
    return null

  const currentScore = scoreExplicitContinuityClosureAuthority(current)
  const candidateScore = scoreExplicitContinuityClosureAuthority(candidate)
  if (currentScore === candidateScore)
    return null

  return candidateScore > currentScore ? candidate : current
}
