import type { AlicizationVisibleReplyExecution } from '../../../../shared/eventa'
import type { AlicizationSelfRevisionStatePatch } from '../self-evolution/state-revision-bus'

import { buildAlicizationEmbodimentLoopSummary } from '@proj-alicization/stage-shared'

import { preferStrongerContinuityClosureAuthority } from '../continuity-closure-authority'
import {
  buildAlicizationOpeningGuidanceBlockedReason,
  replyUsesGenericAvailabilityShell,
  replyUsesMemoryLedFamiliarityToReopenCloseness,
  resolveAlicizationOpeningGuidanceHoldDetail,
  resolveAlicizationOpeningGuidanceViolationReason,
} from '../proactive-opening-guidance'
import {
  describeAlicizationEmbodimentClosureReminder,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateSnapshot,
} from '../project-state-brief'
import {
  buildAlicizationVisibleReplyRealizationArtifact,
  createAlicizationVisibleReplyExecution,
} from '../visible-reply/facade'
import { decideAlicizationProactiveVisibleUtterance } from './visible-utterance-policy'

export type AlicizationProactiveVisibleUtteranceKind
  = 'reminder'
    | 'execution-callback'
    | 'subconscious-proactive'
    | 'autonomy-proposal'

interface AlicizationProactiveMemorySurfaceRestraint {
  shouldStayInward?: boolean | null
  shouldDelayUntilAfterPayoff?: boolean | null
  stableCoreOnly?: boolean | null
  visibleCarryMode?: string | null
  rationale?: string | null
}

function stringifyStructuredForRealization(structured: unknown) {
  try {
    return JSON.stringify(structured ?? {})
  }
  catch {
    return ''
  }
}

function readVisibleReply(structured: unknown) {
  return structured && typeof structured === 'object' && typeof (structured as { reply?: unknown }).reply === 'string'
    ? (structured as { reply: string }).reply.trim()
    : ''
}

function readProactiveOpeningGuidance(structured: unknown) {
  if (!structured || typeof structured !== 'object')
    return ''
  const proactive = (structured as { proactive?: unknown }).proactive
  if (!proactive || typeof proactive !== 'object')
    return ''
  const openingGuidance = (proactive as { openingGuidance?: unknown }).openingGuidance
  return typeof openingGuidance === 'string'
    ? openingGuidance.trim()
    : ''
}

function readInputVisibleReplyRealization(structured: unknown) {
  if (!structured || typeof structured !== 'object')
    return null

  const topLevelProjectStateAudit = (structured as { projectStateAudit?: unknown }).projectStateAudit
  const normalizedTopLevelProjectStateAudit = topLevelProjectStateAudit && typeof topLevelProjectStateAudit === 'object'
    ? topLevelProjectStateAudit as Record<string, unknown>
    : null
  const realization = (structured as { visibleReplyRealization?: unknown }).visibleReplyRealization
  if (realization && typeof realization === 'object') {
    const normalizedRealization = realization as Record<string, unknown>
    const existingProjectStateAudit = normalizedRealization.projectStateAudit
    if (
      (!existingProjectStateAudit
        || typeof existingProjectStateAudit !== 'object')
      && normalizedTopLevelProjectStateAudit
    ) {
      return {
        ...normalizedRealization,
        projectStateAudit: normalizedTopLevelProjectStateAudit,
      }
    }

    return normalizedRealization
  }

  return normalizedTopLevelProjectStateAudit
    ? { projectStateAudit: normalizedTopLevelProjectStateAudit }
    : null
}

function looksSameThreadExecutionCallbackReopen(input: {
  kind: AlicizationProactiveVisibleUtteranceKind
  reply: string
  openingGuidance: string
}) {
  if (input.kind !== 'execution-callback')
    return false

  const combined = `${input.reply} ${input.openingGuidance}`.toLowerCase()
  return (
    /(same thread|same living thread|life thread|keep the callback on the same thread|held back|re-enter)/u.test(combined)
    && /接回来|same thread|life thread|re-enter/u.test(combined)
  )
}

function proactiveReplyWidensClosenessTooEarly(reply: string) {
  return /^(先抱抱你|我想抱抱你|先贴过来|我贴过来陪你|让我先靠近一点|我先靠近你一点|我先贴近一点)/u.test(reply)
    || /(像以前那样靠近|把熟悉直接接回来|顺着熟悉.*靠近|先陪在你身侧|贴过来陪你)/u.test(reply)
}

function proactiveReplyWidensSurfaceTooEarly(reply: string) {
  return /^(我现在就直接说出来|我现在就说出来|我直接说出来|现在就聊开|立刻聊开|马上聊开)/u.test(reply)
    || /(现在就|立刻|马上).*(直接说出来|聊开|摊开来说|说开)/u.test(reply)
}

function hasSameHerRelationshipRestraint(selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null) {
  if (!selfRevisionPatch)
    return false

  return selfRevisionPatch.domain === 'relationship'
    || selfRevisionPatch.lanes.includes('relationship-posture')
    || selfRevisionPatch.reasonCodes.includes('domain:relationship')
    || selfRevisionPatch.reasonCodes.includes('same-her-baseline')
}

function sameThreadExecutionCallbackReplyRestartsFresh(reply: string) {
  return /(重新开始|新的开头|fresh (?:start|opening|reopen)|another (?:new )?opening|另一段新的开头|再开一次)/iu.test(reply)
}

function readInheritedProjectStateAudit(structured: unknown) {
  const realization = readInputVisibleReplyRealization(structured)
  const projectStateAudit = realization?.projectStateAudit
  return projectStateAudit && typeof projectStateAudit === 'object'
    ? projectStateAudit as Record<string, unknown>
    : null
}

function preferRicherProjectStateAuditText(input: {
  current?: unknown
  candidate?: unknown
  maxChars?: number
}) {
  const maxChars = typeof input.maxChars === 'number' && input.maxChars > 0
    ? input.maxChars
    : 320
  const current = sanitizeProjectStateAuditText(input.current, maxChars) || null
  const candidate = sanitizeProjectStateAuditText(input.candidate, maxChars) || null

  if (!current)
    return candidate
  if (!candidate)
    return current
  if (current === candidate)
    return current

  const preferredClosureAuthority = preferStrongerContinuityClosureAuthority(current, candidate)
  if (preferredClosureAuthority)
    return preferredClosureAuthority

  const hasClosureSeamMarker = (value: string | null) => {
    if (!value)
      return false
    const lower = value.toLowerCase()
    return lower.includes('repair-before-closeness')
      || lower.includes('rest-protective')
      || lower.includes('quiet-companionship')
      || lower.includes('same-her hold')
      || lower.includes('fatigue-aware')
      || lower.includes('line holds inward')
      || lower.includes('measured-return')
      || lower.includes('lower-pressure')
      || lower.includes('leave more room')
  }
  const scoreClosureSeamStrength = (value: string | null) => {
    if (!value)
      return 0

    const lower = value.toLowerCase()
    let score = 0
    if (lower.includes('repair-before-closeness'))
      score += 8
    if (lower.includes('rest-protective'))
      score += 8
    if (lower.includes('quiet-companionship'))
      score += 6
    if (lower.includes('same-her hold'))
      score += 5
    if (lower.includes('fatigue-aware'))
      score += 5
    if (lower.includes('line holds inward'))
      score += 3
    if (lower.includes('measured-return') || lower.includes('lower-pressure') || lower.includes('leave more room'))
      score += 2
    return score
  }
  if (hasClosureSeamMarker(current) || hasClosureSeamMarker(candidate)) {
    const candidateClosureScore = scoreClosureSeamStrength(candidate)
    const currentClosureScore = scoreClosureSeamStrength(current)
    if (candidateClosureScore !== currentClosureScore)
      return candidateClosureScore > currentClosureScore ? candidate : current
  }

  if (candidate.startsWith(current) && candidate.length >= current.length + 24)
    return candidate
  if (current.startsWith(candidate) && current.length >= candidate.length + 24)
    return current

  return candidate.length > current.length ? candidate : current
}

function mergeProjectStateAudit(
  currentAudit: Record<string, unknown> | null | undefined,
  inheritedAudit: Record<string, unknown> | null | undefined,
) {
  if (!currentAudit)
    return inheritedAudit ?? undefined
  if (!inheritedAudit)
    return currentAudit

  const summarizeProjectAwarenessCarryStrength = (value: unknown) => {
    const normalized = sanitizeProjectStateAuditText(value, 420).toLowerCase()
    if (!normalized)
      return 0

    let score = 0
    if (normalized.includes('local-first digital life') || normalized.includes('same digital life') || normalized.includes('same local-first digital life project'))
      score += 2
    if (normalized.includes('landed') || normalized.includes('already survives') || normalized.includes('already survive'))
      score += 3
    if (normalized.includes('open') || normalized.includes('still-open') || normalized.includes('unfinished closure'))
      score += 3
    if (normalized.includes('next') || normalized.includes('next closure') || normalized.includes('later return'))
      score += 3
    return score
  }
  const preferRicherPreDialogueAwarenessSummary = (current: unknown, candidate: unknown) => {
    const normalizedCurrent = sanitizeProjectStateAuditText(current, 420) || null
    const normalizedCandidate = sanitizeProjectStateAuditText(candidate, 420) || null
    if (!normalizedCurrent)
      return normalizedCandidate
    if (!normalizedCandidate)
      return normalizedCurrent

    const currentScore = summarizeProjectAwarenessCarryStrength(normalizedCurrent)
    const candidateScore = summarizeProjectAwarenessCarryStrength(normalizedCandidate)
    if (currentScore !== candidateScore)
      return candidateScore > currentScore ? normalizedCandidate : normalizedCurrent

    return preferRicherProjectStateAuditText({
      current: normalizedCurrent,
      candidate: normalizedCandidate,
    })
  }
  const sameHerSummary = preferRicherProjectStateAuditText({
    current: currentAudit.sameHerSummary,
    candidate: inheritedAudit.sameHerSummary,
  })
  const landedProgressSummary = preferRicherProjectStateAuditText({
    current: currentAudit.landedProgressSummary,
    candidate: inheritedAudit.landedProgressSummary,
  })
  const openClosureSummary = preferRicherProjectStateAuditText({
    current: currentAudit.openClosureSummary,
    candidate: inheritedAudit.openClosureSummary,
  })
  const nextClosureTargetSummary = preferRicherProjectStateAuditText({
    current: currentAudit.nextClosureTargetSummary,
    candidate: inheritedAudit.nextClosureTargetSummary,
  })
  const emotionalClosureSummary = preferRicherProjectStateAuditText({
    current: currentAudit.emotionalClosureSummary,
    candidate: inheritedAudit.emotionalClosureSummary,
  })
  const preDialogueAwarenessSummary = preferRicherPreDialogueAwarenessSummary(
    currentAudit.preDialogueAwarenessSummary,
    inheritedAudit.preDialogueAwarenessSummary,
  )
  const embodimentClosureSummary = preferRicherProjectStateAuditText({
    current: currentAudit.embodimentClosureSummary,
    candidate: inheritedAudit.embodimentClosureSummary,
    maxChars: 640,
  })
  const openFocusSummary = preferRicherProjectStateAuditText({
    current: currentAudit.openFocusSummary,
    candidate: inheritedAudit.openFocusSummary,
  })
  const nextFocusSummary = preferRicherProjectStateAuditText({
    current: currentAudit.nextFocusSummary,
    candidate: inheritedAudit.nextFocusSummary,
  })

  return {
    ...inheritedAudit,
    ...currentAudit,
    ...(sameHerSummary ? { sameHerSummary } : {}),
    ...(landedProgressSummary ? { landedProgressSummary } : {}),
    ...(openClosureSummary ? { openClosureSummary } : {}),
    ...(nextClosureTargetSummary ? { nextClosureTargetSummary } : {}),
    ...(emotionalClosureSummary ? { emotionalClosureSummary } : {}),
    ...(preDialogueAwarenessSummary ? { preDialogueAwarenessSummary } : {}),
    ...(embodimentClosureSummary ? { embodimentClosureSummary } : {}),
    ...(openFocusSummary ? { openFocusSummary } : {}),
    ...(nextFocusSummary ? { nextFocusSummary } : {}),
    continuitySummary: buildProjectStateAuditContinuitySummary({
      sameHerSummary,
      landedProgressSummary,
      openClosureSummary,
      nextClosureTargetSummary,
      emotionalClosureSummary,
      embodimentClosureSummary,
    }),
  }
}

function sanitizeProjectStateAuditText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function shouldCarryOpeningGuidanceIntoSameHerInwardCarry(openingGuidance: string) {
  const normalized = openingGuidance.trim().toLowerCase()
  if (!normalized)
    return false

  return (
    normalized.includes('later opening')
    || normalized.includes('same living line')
    || normalized.includes('same line')
    || normalized.includes('measured-return')
    || normalized.includes('lower-pressure')
    || normalized.includes('before widening outward')
    || normalized.includes('leave room')
    || normalized.includes('同一条生命线')
    || normalized.includes('先留白')
    || normalized.includes('别立刻')
  )
}

function buildProjectStateAuditContinuitySummary(input: {
  sameHerSummary?: string | null
  landedProgressSummary?: string | null
  openClosureSummary?: string | null
  nextClosureTargetSummary?: string | null
  emotionalClosureSummary?: string | null
  sameHerHoldDetail?: string | null
  embodimentClosureSummary?: string | null
}) {
  return [
    input.sameHerSummary ? `same-her=${input.sameHerSummary}` : '',
    input.landedProgressSummary ? `landed=${input.landedProgressSummary}` : '',
    input.openClosureSummary ? `open=${input.openClosureSummary}` : '',
    input.nextClosureTargetSummary ? `next=${input.nextClosureTargetSummary}` : '',
    input.emotionalClosureSummary ? `closure=${input.emotionalClosureSummary}` : '',
    input.sameHerHoldDetail ? `hold=${input.sameHerHoldDetail}` : '',
    input.embodimentClosureSummary ? `body=${input.embodimentClosureSummary}` : '',
  ].filter(Boolean).join(' | ') || null
}

function readStructuredProjectState(structured: unknown) {
  if (!structured || typeof structured !== 'object')
    return null
  const projectState = (structured as { projectState?: unknown }).projectState
  return projectState && typeof projectState === 'object'
    ? projectState as Record<string, unknown>
    : null
}

function deriveStructuredProjectStateAudit(structured: unknown) {
  const projectState = readStructuredProjectState(structured)
  if (!projectState)
    return null

  const canonicalProjectState = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: {
      identity: projectState.identity,
      currentPhase: projectState.currentPhase,
      preDialogueAwarenessLine: projectState.preDialogueAwarenessLine,
      awarenessLine: projectState.awarenessLine,
      companionHeadlineLine: projectState.companionHeadlineLine,
      companionBriefingLine: projectState.companionBriefingLine,
      preDialogueAwarenessSummary: projectState.preDialogueAwarenessSummary,
      preflightSummary: projectState.preflightSummary,
      latestLandedProgress: projectState.latestLandedProgress,
      latestProgress: projectState.latestProgress,
      landedProgressSummary: projectState.landedProgressSummary,
      primaryOpenLoop: projectState.primaryOpenLoop,
      nextClosureTarget: projectState.nextClosureTarget,
      sameHerSelfLine: projectState.sameHerSelfLine,
      sameHerDriftRisk: projectState.sameHerDriftRisk,
    },
  })

  const sameHerSummary = sanitizeProjectStateAuditText(canonicalProjectState.sameHerSelfLine, 220) || null
  const landedProgressSummary = sanitizeProjectStateAuditText(canonicalProjectState.latestLandedProgress, 220) || null
  const openClosureSummary = sanitizeProjectStateAuditText(canonicalProjectState.primaryOpenLoop, 220) || null
  const nextClosureTargetSummary = sanitizeProjectStateAuditText(canonicalProjectState.nextClosureTarget, 220) || null
  const openFocusSummary = (() => {
    const normalized = (openClosureSummary ?? '').toLowerCase()
    if (!normalized)
      return null

    const focus: string[] = []
    if (normalized.includes('memory'))
      focus.push('memory')
    if (normalized.includes('initiative'))
      focus.push('initiative')
    if (normalized.includes('embodiment'))
      focus.push('embodiment')
    if (normalized.includes('same-her') || normalized.includes('same living line'))
      focus.push('same-line')
    if (normalized.includes('closure seam'))
      focus.push('closure-seam')

    return focus.length > 0 ? focus.join('/') : null
  })()
  const nextFocusSummary = (() => {
    const normalized = (nextClosureTargetSummary ?? '').toLowerCase()
    if (!normalized)
      return null

    const focus: string[] = []
    if (normalized.includes('project identity carry'))
      focus.push('project-carry')
    if (normalized.includes('phase 1'))
      focus.push('phase-1')
    if (normalized.includes('measured-return'))
      focus.push('measured-return')
    if (normalized.includes('same living line') || normalized.includes('same-her'))
      focus.push('same-line')
    if (normalized.includes('initiative'))
      focus.push('initiative')
    if (normalized.includes('embodiment'))
      focus.push('embodiment')

    return focus.length > 0 ? focus.join('/') : null
  })()
  const emotionalClosureSummary = sanitizeProjectStateAuditText(projectState.emotionalClosureCue, 220) || null
  const preDialogueAwarenessSummary = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      preDialogueAwarenessLine: canonicalProjectState.preDialogueAwarenessLine,
      preDialogueAwarenessSummary: canonicalProjectState.preDialogueAwarenessLine,
      awarenessLine: (projectState.awarenessLine as string | undefined) ?? null,
      companionHeadlineLine: (projectState.companionHeadlineLine as string | undefined) ?? null,
      companionBriefingLine: (projectState.companionBriefingLine as string | undefined) ?? null,
      preflightSummary: canonicalProjectState.preflightSummary,
    },
  }) ?? null
  const embodimentAuthoritySummary = sanitizeProjectStateAuditText(projectState.selfAuthoritySummary, 220) || null
  const embodimentCurrentBodyState = sanitizeProjectStateAuditText(projectState.currentBodyState, 160) || null
  const embodimentClosureSummary = buildAlicizationEmbodimentLoopSummary({
    authoritySummary: embodimentAuthoritySummary,
    currentBodyState: embodimentCurrentBodyState,
  })
  || describeAlicizationEmbodimentClosureReminder({
    authoritySummary: embodimentAuthoritySummary,
    currentBodyState: embodimentCurrentBodyState,
  })
  || null

  if (!sameHerSummary && !landedProgressSummary && !openClosureSummary && !nextClosureTargetSummary && !openFocusSummary && !nextFocusSummary && !emotionalClosureSummary && !preDialogueAwarenessSummary && !embodimentClosureSummary)
    return null

  return {
    sameHerSummary,
    landedProgressSummary,
    openClosureSummary,
    ...(openFocusSummary ? { openFocusSummary } : {}),
    ...(nextClosureTargetSummary ? { nextClosureTargetSummary } : {}),
    ...(nextFocusSummary ? { nextFocusSummary } : {}),
    ...(emotionalClosureSummary ? { emotionalClosureSummary } : {}),
    preDialogueAwarenessSummary,
    continuitySummary: buildProjectStateAuditContinuitySummary({
      sameHerSummary,
      landedProgressSummary,
      openClosureSummary,
      nextClosureTargetSummary,
      emotionalClosureSummary,
      embodimentClosureSummary,
    }),
    ...(embodimentClosureSummary ? { embodimentClosureSummary } : {}),
    preservedIntoRewrite: false,
    rewriteClosureApplied: false,
  } satisfies Record<string, unknown>
}

function readSameHerInwardCarry(structured: unknown) {
  if (!structured || typeof structured !== 'object')
    return null

  const thought = typeof (structured as { thought?: unknown }).thought === 'string'
    ? (structured as { thought: string }).thought.trim()
    : ''
  const proactive = (structured as { proactive?: unknown }).proactive
  const openingGuidance = proactive && typeof proactive === 'object' && typeof (proactive as { openingGuidance?: unknown }).openingGuidance === 'string'
    ? (proactive as { openingGuidance: string }).openingGuidance.trim()
    : ''
  const combined = `${thought} ${openingGuidance}`.trim()
  if (!combined)
    return null

  const normalized = combined.toLowerCase()
  if (
    normalized.includes('same phase 1 digital life')
    || normalized.includes('same living line')
    || normalized.includes('same digital life')
    || normalized.includes('same-her')
    || normalized.includes('同一个她')
  ) {
    return sanitizeSameHerCarry(combined)
  }

  return null
}

function deriveSelfRevisionPatchProjectStateAudit(selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null) {
  const projectStateContinuity = selfRevisionPatch?.projectStateContinuity ?? null
  if (!projectStateContinuity)
    return null

  const sameHerSummary = sanitizeProjectStateAuditText(projectStateContinuity.sameHerSelfLine, 220) || null
  const emotionalClosureSummary = sanitizeProjectStateAuditText(projectStateContinuity.emotionalClosureCue, 220) || null
  const sameHerHoldDetail = sanitizeProjectStateAuditText(projectStateContinuity.sameHerHoldDetail, 220) || null
  const openClosureSummary = sanitizeProjectStateAuditText(projectStateContinuity.continuityGuard, 320) || null

  if (!sameHerSummary && !emotionalClosureSummary && !openClosureSummary && !sameHerHoldDetail)
    return null

  return {
    ...(sameHerSummary ? { sameHerSummary } : {}),
    ...(openClosureSummary ? { openClosureSummary } : {}),
    ...(emotionalClosureSummary ? { emotionalClosureSummary } : {}),
    ...(sameHerHoldDetail ? { sameHerHoldDetail } : {}),
    continuitySummary: buildProjectStateAuditContinuitySummary({
      sameHerSummary,
      openClosureSummary,
      emotionalClosureSummary,
      sameHerHoldDetail,
    }),
    preservedIntoRewrite: false,
    rewriteClosureApplied: false,
  } satisfies Record<string, unknown>
}

function deriveSelfRevisionPatchSameHerHoldDetail(selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null) {
  const projectStateContinuity = selfRevisionPatch?.projectStateContinuity ?? null
  if (!projectStateContinuity)
    return null

  const explicitSameHerHoldDetail = sanitizeProjectStateAuditText(projectStateContinuity.sameHerHoldDetail, 220) || null
  if (explicitSameHerHoldDetail)
    return explicitSameHerHoldDetail

  const merged = [
    sanitizeProjectStateAuditText(projectStateContinuity.sameHerSelfLine, 220),
    sanitizeProjectStateAuditText(projectStateContinuity.emotionalClosureCue, 220),
    sanitizeProjectStateAuditText(projectStateContinuity.continuityGuard, 220),
  ].filter(Boolean).join(' ').toLowerCase()
  if (!merged)
    return null

  if (/repair-before-closeness|repair before closeness|repair-first|repair first/u.test(merged))
    return 'repair-before-closeness is still owning this callback line before closeness widens again.'

  if (
    /vulnerable-care|vulnerable care|fragile care|care-before-analysis|care before analysis|care arrive before analysis|care arrives before analysis|analysis-heavy|analysis heavy/u.test(merged)
    && /same living line|same line|same-her|same her|line stays inward|holds inward/u.test(merged)
  ) {
    return 'rest-protective vulnerable-care keeps this return care-before-analysis, lighter, and inward.'
  }

  if (/rest-protective|rest protective|rest protection|quiet-companionship|quiet companionship|fatigue-aware|late-night-drain|line holds inward|holds inward|quietly inward/u.test(merged)) {
    return 'rest-protective companionship is still keeping this return inward and fatigue-aware.'
  }

  return null
}

function deriveSelfRevisionPatchSameHerInwardCarry(selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null) {
  const projectStateContinuity = selfRevisionPatch?.projectStateContinuity ?? null
  if (!projectStateContinuity)
    return null

  const sameHerHoldDetail = deriveSelfRevisionPatchSameHerHoldDetail(selfRevisionPatch)
  const carry = [
    sameHerHoldDetail,
    sanitizeProjectStateAuditText(projectStateContinuity.sameHerSelfLine, 220),
    sanitizeProjectStateAuditText(projectStateContinuity.emotionalClosureCue, 220),
    sanitizeProjectStateAuditText(projectStateContinuity.continuityGuard, 220),
  ]
    .filter((text): text is string => Boolean(text))
    .filter(text => /same living line|same line|same-her|same her|one living line|one continuous her|repair-before-closeness|repair before closeness|rest-protective|rest protective|measured-return|lower-pressure|fatigue-aware|quiet-companionship|quiet companionship/u.test(text))
    .filter((text, index, array) => array.findIndex(candidate => candidate.toLowerCase() === text.toLowerCase()) === index)
    .join(' | ')

  return carry ? sanitizeSameHerCarry(carry) : null
}

function sanitizeSameHerCarry(text: string) {
  return text.trim().replace(/\s+/g, ' ').slice(0, 220)
}

function isQuietSameHerContinuityCarry(text: string | null | undefined) {
  if (!text)
    return false

  const normalized = text.toLowerCase()
  const carriesSameHerLine
    = normalized.includes('same phase 1 digital life')
      || normalized.includes('same living line')
      || normalized.includes('same digital life')
      || normalized.includes('same-her')
      || normalized.includes('one continuous her')
      || normalized.includes('同一个她')
  const carriesQuietInwardHold
    = normalized.includes('quiet same-her continuity')
      || normalized.includes('quiet same her continuity')
      || normalized.includes('same-her-inward-carry')
      || normalized.includes('quiet companionship')
      || normalized.includes('quiet-companionship')
      || normalized.includes('line holds inward')
      || normalized.includes('stay inward')
      || normalized.includes('before widening outward')
      || normalized.includes('before widening warmth')
      || normalized.includes('lower-pressure')
      || normalized.includes('measured-return')

  return carriesSameHerLine && carriesQuietInwardHold
}

function hasRememberedSeamMoreRoomCarry(text: string | null | undefined) {
  if (!text)
    return false

  const normalized = text.toLowerCase()
  const rememberedSeamPresent
    = /remembered seam|same remembered relationship seam|same remembered seam|relationship seam|same line|same thread|callback line|同一条线|关系线|记住的关系缝|留白/u.test(normalized)
  if (!rememberedSeamPresent)
    return false

  return /reopened too eagerly|too eagerly before|more room this time|this time keep more room|keep more room this time|leave more room|do not reopen it with the same eagerness|before leaning in again|这次更要留白|这次要更慢一点|不要重开得太快|上次太急/u.test(normalized)
}

function resolveRememberedSeamMoreRoomHoldDetail() {
  return 'Recognize the remembered seam, but keep more room this time so the return does not reopen with the same eagerness as before.'
}

function guidanceIndicatesEvenNaturalReentry(guidance: string) {
  return /even,\s*steady voice|even and steady voice|natural,\s*unforced pacing|natural and unforced pacing|reopen even and natural|stay unforced|performative swing|rushed tempo|performative|太快/u.test(guidance)
}

function deriveCompanionshipHoldMode(input: {
  decisionAction: 'persist' | 'hold' | 'requeue'
  decisionReason: string
  openingGuidanceHoldDetail?: string | null
  sameHerInwardCarry?: string | null
  structured: Record<string, unknown> | null | undefined
}) {
  if (input.decisionAction !== 'hold')
    return null

  if (input.decisionReason === 'proactive-visible-presence-without-utterance')
    return 'quiet-companionship' as const

  if (
    input.decisionReason === 'proactive-opening-guidance-violation:repair-first'
    || input.openingGuidanceHoldDetail === 'memory-familiarity-closeness-cap'
  ) {
    return 'repair-before-closeness' as const
  }

  if (
    input.decisionReason === 'proactive-visible-presence-without-utterance'
    && input.openingGuidanceHoldDetail === 'even-natural-cadence'
  ) {
    return 'quiet-companionship' as const
  }

  if (
    isQuietSameHerContinuityCarry(input.sameHerInwardCarry)
    && (
      input.decisionReason === 'proactive-visible-presence-without-utterance'
      || input.decisionReason === 'proactive-opening-guidance-violation:lower-pressure'
      || input.decisionReason === 'proactive-project-state-audit-violation:lower-pressure'
      || input.openingGuidanceHoldDetail === 'same-her-lower-pressure-hold'
    )
  ) {
    return 'quiet-companionship' as const
  }

  const proactive = input.structured && typeof input.structured === 'object'
    ? (input.structured as { proactive?: unknown }).proactive
    : null
  const style = proactive && typeof proactive === 'object' && typeof (proactive as { style?: unknown }).style === 'string'
    ? (proactive as { style: string }).style
    : ''

  if (
    input.decisionReason === 'proactive-opening-guidance-violation:lower-pressure'
    || input.decisionReason === 'proactive-project-state-audit-violation:lower-pressure'
    || style === 'silent-observe'
  ) {
    return 'measured-return' as const
  }

  return 'quiet-companionship' as const
}

function derivePresenceOnlyOpeningGuidanceHoldDetail(input: {
  decisionAction: 'persist' | 'hold' | 'requeue'
  decisionReason: string
  structured: Record<string, unknown> | null | undefined
  openingGuidance: string
  sameHerInwardCarry?: string | null
}) {
  if (input.decisionAction !== 'hold')
    return null

  if (input.decisionReason !== 'proactive-visible-presence-without-utterance')
    return null

  const proactive = input.structured && typeof input.structured === 'object'
    ? (input.structured as { proactive?: unknown }).proactive
    : null
  const style = proactive && typeof proactive === 'object' && typeof (proactive as { style?: unknown }).style === 'string'
    ? (proactive as { style: string }).style
    : ''
  const restraint = proactive && typeof proactive === 'object' && typeof (proactive as { continuityRestraint?: unknown }).continuityRestraint === 'string'
    ? (proactive as { continuityRestraint: string }).continuityRestraint
    : ''
  const normalizedGuidance = input.openingGuidance.toLowerCase()
  const evenNaturalGuidance = guidanceIndicatesEvenNaturalReentry(normalizedGuidance)
  const rememberedSeamMoreRoomCarry = hasRememberedSeamMoreRoomCarry(`${input.sameHerInwardCarry ?? ''} ${input.openingGuidance}`.trim())

  if (
    restraint === 'repair-before-closeness'
    || normalizedGuidance.includes('repair')
    || normalizedGuidance.includes('修')
  ) {
    return 'repair-before-closeness'
  }

  if (rememberedSeamMoreRoomCarry)
    return resolveRememberedSeamMoreRoomHoldDetail()

  if (evenNaturalGuidance)
    return 'even-natural-cadence'

  if (
    style === 'silent-observe'
    || restraint === 'measured-return'
    || restraint === 'lower-pressure'
    || isQuietSameHerContinuityCarry(input.sameHerInwardCarry)
    || normalizedGuidance.includes('same')
    || normalizedGuidance.includes('callback')
    || normalizedGuidance.includes('opening')
    || normalizedGuidance.includes('line')
    || normalizedGuidance.includes('lower-pressure')
    || normalizedGuidance.includes('measured-return')
  ) {
    return 'same-her-lower-pressure-hold'
  }

  return 'quiet-companionship'
}

export function resolveAlicizationProactiveVisibleUtterance(input: {
  kind: AlicizationProactiveVisibleUtteranceKind
  structured: Record<string, unknown> | null | undefined
  hasMindAuthoredStructured: boolean
  actualVisibleReplyAuthority?: AlicizationVisibleReplyExecution['actualVisibleReplyAuthority']
  reason?: string | null
  allowDeterministicVisibleFallback?: boolean
  preferPresenceOnlyHold?: boolean
  expectedVisibleReplyAuthority?: AlicizationVisibleReplyExecution['expectedVisibleReplyAuthority']
  selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null
  memorySurfaceRestraint?: AlicizationProactiveMemorySurfaceRestraint | null
}) {
  const reply = readVisibleReply(input.structured)
  const openingGuidance = readProactiveOpeningGuidance(input.structured)
  const sameThreadExecutionCallbackReopen = looksSameThreadExecutionCallbackReopen({
    kind: input.kind,
    reply,
    openingGuidance,
  })
  const sameThreadExecutionCallbackFreshRestart = sameThreadExecutionCallbackReopen
    && sameThreadExecutionCallbackReplyRestartsFresh(reply)
  const proactivePolicyPresenceHold = sameThreadExecutionCallbackReopen
    ? false
    : input.preferPresenceOnlyHold === true
  const hasMindAuthoredVisibleText = input.hasMindAuthoredStructured && Boolean(reply)
  const shouldCheckOpeningGuidance = Boolean(reply)
  const openingGuidanceViolationReason = shouldCheckOpeningGuidance
    ? resolveAlicizationOpeningGuidanceViolationReason({
        reply,
        openingGuidance,
      })
    : null
  const inheritedProjectStateAudit = readInheritedProjectStateAudit(input.structured)
  const derivedProjectStateAudit = deriveStructuredProjectStateAudit(input.structured)
  const selfRevisionPatchProjectStateAudit = deriveSelfRevisionPatchProjectStateAudit(input.selfRevisionPatch ?? null)
  const effectiveProjectStateAudit = mergeProjectStateAudit(
    inheritedProjectStateAudit,
    mergeProjectStateAudit(
      derivedProjectStateAudit,
      selfRevisionPatchProjectStateAudit,
    ),
  )
  const sameHerInwardCarry = readSameHerInwardCarry(input.structured)
  const structuredSameHerInwardCarry
    = sameHerInwardCarry && openingGuidance && shouldCarryOpeningGuidanceIntoSameHerInwardCarry(openingGuidance)
      ? `${sameHerInwardCarry} | ${openingGuidance}`.trim()
      : sameHerInwardCarry
  const carriedSameHerInwardCarry = preferRicherProjectStateAuditText({
    current: structuredSameHerInwardCarry,
    candidate: deriveSelfRevisionPatchSameHerInwardCarry(input.selfRevisionPatch ?? null),
  })
  const projectStateContinuitySummary = typeof effectiveProjectStateAudit?.continuitySummary === 'string'
    ? effectiveProjectStateAudit.continuitySummary.toLowerCase()
    : ''
  const projectStateOpenClosureSummary = typeof effectiveProjectStateAudit?.openClosureSummary === 'string'
    ? effectiveProjectStateAudit.openClosureSummary.toLowerCase()
    : ''
  const projectStateAuditViolationReason = reply
    && (
      projectStateContinuitySummary.includes('same-her=')
      || projectStateContinuitySummary.includes('same her')
      || projectStateOpenClosureSummary.includes('same-her')
      || projectStateOpenClosureSummary.includes('same her')
    )
    && (
      projectStateContinuitySummary.includes('open=')
      || projectStateContinuitySummary.includes('landed=')
      || projectStateOpenClosureSummary.includes('quieter')
      || projectStateOpenClosureSummary.includes('measured-return')
      || projectStateOpenClosureSummary.includes('lower-pressure')
      || projectStateOpenClosureSummary.includes('hover')
      || projectStateOpenClosureSummary.includes('before widening outward')
    )
    && proactiveReplyWidensSurfaceTooEarly(reply)
    ? 'proactive-project-state-audit-violation:lower-pressure'
    : null
  const memorySurfaceRestraint = input.memorySurfaceRestraint ?? null
  const memoryBoundaryViolationReason = reply
    && memorySurfaceRestraint
    && (
      memorySurfaceRestraint.shouldStayInward
      || memorySurfaceRestraint.shouldDelayUntilAfterPayoff
      || memorySurfaceRestraint.stableCoreOnly
      || memorySurfaceRestraint.visibleCarryMode === 'withhold'
    )
    && proactiveReplyWidensClosenessTooEarly(reply)
    ? (
        memorySurfaceRestraint.shouldDelayUntilAfterPayoff
          ? 'proactive-opening-guidance-violation:repair-first'
          : 'proactive-opening-guidance-violation:lower-pressure'
      )
    : null
  const effectiveOpeningGuidanceViolationReason = sameThreadExecutionCallbackFreshRestart
    ? 'proactive-opening-guidance-violation:lower-pressure'
    : openingGuidanceViolationReason ?? projectStateAuditViolationReason
  const callbackSpecificLowerPressureViolationReason = input.kind === 'execution-callback'
    && !effectiveOpeningGuidanceViolationReason
    && hasSameHerRelationshipRestraint(input.selfRevisionPatch ?? null)
    && (
      replyUsesMemoryLedFamiliarityToReopenCloseness(reply)
      || proactiveReplyWidensClosenessTooEarly(reply)
      || replyUsesGenericAvailabilityShell(reply)
      || sameThreadExecutionCallbackFreshRestart
    )
    ? 'proactive-opening-guidance-violation:lower-pressure'
    : null
  const resolvedOpeningGuidanceViolationReason = effectiveOpeningGuidanceViolationReason ?? callbackSpecificLowerPressureViolationReason
  const openingGuidanceViolated = Boolean(resolvedOpeningGuidanceViolationReason)
  const memoryBoundaryViolated = Boolean(memoryBoundaryViolationReason)
  const actualVisibleReplyAuthority = hasMindAuthoredVisibleText
    ? input.actualVisibleReplyAuthority ?? 'llm-mind'
    : 'local-deterministic-fallback'
  const decision = decideAlicizationProactiveVisibleUtterance({
    hasMindAuthoredStructured: hasMindAuthoredVisibleText && !openingGuidanceViolated && !memoryBoundaryViolated && !proactivePolicyPresenceHold,
    allowDeterministicVisibleFallback: openingGuidanceViolated || memoryBoundaryViolated || proactivePolicyPresenceHold
      ? true
      : input.allowDeterministicVisibleFallback,
    preferPresenceOnlyHold: proactivePolicyPresenceHold,
    reason: openingGuidanceViolated
      ? resolvedOpeningGuidanceViolationReason
      : memoryBoundaryViolated
        ? memoryBoundaryViolationReason
        : proactivePolicyPresenceHold
          ? 'proactive-visible-presence-without-utterance'
          : input.reason ?? null,
    selfRevisionPatch: input.selfRevisionPatch ?? null,
  })
  const persistedVisibleReplyAuthority = actualVisibleReplyAuthority === 'llm-second-pass-rewrite'
    ? 'llm-second-pass-rewrite'
    : actualVisibleReplyAuthority === 'local-deterministic-fallback'
      ? 'local-deterministic-fallback'
      : 'llm-mind'
  const visibleReplyExecution = createAlicizationVisibleReplyExecution({
    mode: hasMindAuthoredVisibleText && !openingGuidanceViolated && !memoryBoundaryViolated && !proactivePolicyPresenceHold ? 'provider-one-shot' : 'local-fallback',
    expectedVisibleReplyAuthority: input.expectedVisibleReplyAuthority ?? 'llm-mind',
    actualVisibleReplyAuthority: hasMindAuthoredVisibleText && !openingGuidanceViolated && !memoryBoundaryViolated && !proactivePolicyPresenceHold
      ? actualVisibleReplyAuthority
      : 'local-deterministic-fallback',
    providerMindExecuted: hasMindAuthoredVisibleText && !openingGuidanceViolated && !memoryBoundaryViolated && !proactivePolicyPresenceHold,
    reason: decision.reason,
  })
  const visibleReplyRealization = buildAlicizationVisibleReplyRealizationArtifact({
    fullText: stringifyStructuredForRealization(input.structured),
    visibleReplyExecution,
  })
  const inheritedVisibleReplyRealization = readInputVisibleReplyRealization(input.structured)
  const visibleReplyRealizationWithInheritedAudit = inheritedVisibleReplyRealization
    ? {
        ...visibleReplyRealization,
        emotionalClosureAudit: visibleReplyRealization.emotionalClosureAudit ?? inheritedVisibleReplyRealization.emotionalClosureAudit,
        selfAuthorityAudit: visibleReplyRealization.selfAuthorityAudit ?? inheritedVisibleReplyRealization.selfAuthorityAudit,
        projectStateAudit: mergeProjectStateAudit(
          inheritedVisibleReplyRealization.projectStateAudit as Record<string, unknown> | null | undefined,
          mergeProjectStateAudit(
            visibleReplyRealization.projectStateAudit as Record<string, unknown> | null | undefined,
            mergeProjectStateAudit(
              derivedProjectStateAudit,
              selfRevisionPatchProjectStateAudit,
            ),
          ),
        ),
        sameHerInwardCarry: typeof inheritedVisibleReplyRealization.sameHerInwardCarry === 'string'
          ? inheritedVisibleReplyRealization.sameHerInwardCarry
          : carriedSameHerInwardCarry,
      }
    : derivedProjectStateAudit || selfRevisionPatchProjectStateAudit || carriedSameHerInwardCarry
      ? {
          ...visibleReplyRealization,
          ...(derivedProjectStateAudit || selfRevisionPatchProjectStateAudit
            ? {
                projectStateAudit: mergeProjectStateAudit(
                  visibleReplyRealization.projectStateAudit as Record<string, unknown> | null | undefined,
                  mergeProjectStateAudit(
                    derivedProjectStateAudit,
                    selfRevisionPatchProjectStateAudit,
                  ),
                ),
              }
            : {}),
          sameHerInwardCarry: carriedSameHerInwardCarry,
        }
      : visibleReplyRealization
  const finalBlockedReason = resolvedOpeningGuidanceViolationReason ?? memoryBoundaryViolationReason
  const openingGuidanceBlockedReason = buildAlicizationOpeningGuidanceBlockedReason(finalBlockedReason)
  const openingGuidanceHoldDetail = finalBlockedReason
    ? resolveAlicizationOpeningGuidanceHoldDetail({
        reply,
        openingGuidance: openingGuidance || memorySurfaceRestraint?.rationale || '',
        openingGuidanceViolationReason: finalBlockedReason,
      })
    : null
  const deferredPresenceOnlyHoldDetail = openingGuidanceHoldDetail ?? derivePresenceOnlyOpeningGuidanceHoldDetail({
    decisionAction: decision.action,
    decisionReason: decision.reason,
    structured: input.structured,
    openingGuidance: openingGuidance || memorySurfaceRestraint?.rationale || '',
    sameHerInwardCarry: carriedSameHerInwardCarry,
  })
  const companionshipHoldMode = deriveCompanionshipHoldMode({
    decisionAction: decision.action,
    decisionReason: decision.reason,
    openingGuidanceHoldDetail: deferredPresenceOnlyHoldDetail,
    sameHerInwardCarry: carriedSameHerInwardCarry,
    structured: input.structured,
  })
  const visibleReplyRealizationWithGuidance = openingGuidanceBlockedReason
    ? {
        ...visibleReplyRealizationWithInheritedAudit,
        blockedReasons: visibleReplyRealizationWithInheritedAudit.blockedReasons.includes(openingGuidanceBlockedReason)
          ? visibleReplyRealizationWithInheritedAudit.blockedReasons
          : [...visibleReplyRealizationWithInheritedAudit.blockedReasons, openingGuidanceBlockedReason],
        openingGuidanceHoldDetail: deferredPresenceOnlyHoldDetail,
        companionshipHoldMode,
      }
    : deferredPresenceOnlyHoldDetail || companionshipHoldMode
      ? {
          ...visibleReplyRealizationWithInheritedAudit,
          ...(deferredPresenceOnlyHoldDetail
            ? { openingGuidanceHoldDetail: deferredPresenceOnlyHoldDetail }
            : {}),
          companionshipHoldMode,
        }
      : visibleReplyRealizationWithInheritedAudit
  const structuredForPersistence: (Record<string, unknown> & { reply?: unknown }) | null = decision.shouldPersistVisibleUtterance && input.structured
    ? {
        ...input.structured,
        visibleReplyAuthority: persistedVisibleReplyAuthority,
        replyRealizationMode: 'provider-mind-required',
        visibleReplyExecution,
        visibleReplyRealization: visibleReplyRealizationWithGuidance,
      }
    : null

  return {
    version: 'proactive-visible-utterance-realization-v1' as const,
    kind: input.kind,
    decision,
    shouldPersistVisibleUtterance: decision.shouldPersistVisibleUtterance,
    assistantText: decision.shouldPersistVisibleUtterance ? reply : '',
    structuredForPersistence,
    visibleReplyExecution,
    visibleReplyRealization: visibleReplyRealizationWithGuidance,
  }
}
