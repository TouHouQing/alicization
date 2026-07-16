import type { AlicizationVisibleReplyExecution } from '../../../../shared/eventa'
import type { AlicizationSelfRevisionStatePatch } from '../self-evolution/state-revision-bus'

import {
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationStructuredInternalText,
} from '@proj-alicization/stage-shared'

import { preferStrongerContinuityClosureAuthority } from '../continuity-closure-authority'
import {
  buildAlicizationOpeningGuidanceBlockedReason,
  replyUsesGenericAvailabilityShell,
  replyUsesMemoryLedFamiliarityToReopenCloseness,
  resolveAlicizationOpeningGuidanceHoldDetail,
  resolveAlicizationOpeningGuidanceViolationReason,
} from '../proactive-opening-guidance'
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
    return JSON.stringify(sanitizeStructuredForRealization(structured ?? {}))
  }
  catch {
    return ''
  }
}

function sanitizeStructuredForRealization(value: unknown): unknown {
  if (typeof value === 'string') {
    if (!value.trim())
      return value
    return containsAlicizationFixedTemplateResidue(value)
      ? sanitizeAlicizationStructuredInternalText(value, 520)
      : value
  }

  if (Array.isArray(value))
    return value.map(item => sanitizeStructuredForRealization(item))

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        sanitizeStructuredForRealization(item),
      ]),
    )
  }

  return value
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

  return sanitizeProjectStateAuditRecord({
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
  })
}

function sanitizeProjectStateAuditRecord(record: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => {
      if (typeof value === 'string')
        return [key, sanitizeProjectStateAuditText(value, 640) || null]
      if (Array.isArray(value))
        return [key, value.map(item => typeof item === 'string' ? sanitizeProjectStateAuditText(item, 320) || null : item)]
      return [key, value]
    }),
  )
}

function sanitizeProjectStateAuditText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  const normalized = raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
  if (!normalized)
    return ''
  if (containsAlicizationFixedTemplateResidue(normalized) || containsGeneratedContinuityCue(normalized))
    return ''

  const sanitized = sanitizeAlicizationStructuredInternalText(normalized, maxChars)
  if (!sanitized || containsAlicizationFixedTemplateResidue(sanitized) || containsGeneratedContinuityCue(sanitized))
    return ''

  return sanitized
}

function containsGeneratedContinuityCue(raw: string) {
  return /^(?:identity-continuity|same-her|same her|continuity state)\.?$/iu.test(raw.trim())
    || /\b[a-z][\w-]{2,}\s*=/iu.test(raw)
    || /\b(?:local_desktop_life_loop|runtime_personhood|life_core|continuity_identity|continuity_line)\b/iu.test(raw)
}

function shouldCarryOpeningGuidanceIntoSameHerInwardCarry(openingGuidance: string) {
  const normalized = sanitizeSameHerCarry(openingGuidance)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return carriesStructuredContinuityHold(normalized) || (
    normalized.includes('later opening')
    || normalized.includes('measured-return')
    || normalized.includes('measured_return')
    || normalized.includes('lower-pressure')
    || normalized.includes('lower_pressure')
    || normalized.includes('before widening outward')
    || normalized.includes('leave room')
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
    input.sameHerSummary ?? '',
    input.landedProgressSummary ?? '',
    input.openClosureSummary ?? '',
    input.nextClosureTargetSummary ?? '',
    input.emotionalClosureSummary ?? '',
    input.sameHerHoldDetail ?? '',
    input.embodimentClosureSummary ?? '',
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

  const sameHerSummary = sanitizeProjectStateAuditText(projectState.sameHerSelfLine, 220) || null
  const landedProgressSummary = sanitizeProjectStateAuditText(
    projectState.latestLandedProgress
    ?? projectState.latestProgress
    ?? projectState.landedProgressSummary,
    220,
  ) || null
  const openClosureSummary = sanitizeProjectStateAuditText(
    projectState.primaryOpenLoop
    ?? projectState.openClosureSummary,
    220,
  ) || null
  const nextClosureTargetSummary = sanitizeProjectStateAuditText(
    projectState.nextClosureTarget
    ?? projectState.nextClosureTargetSummary,
    220,
  ) || null
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
  const preDialogueAwarenessSummary = sanitizeProjectStateAuditText(
    projectState.preDialogueAwarenessLine
    ?? projectState.preDialogueAwarenessSummary
    ?? projectState.awarenessLine
    ?? projectState.preflightSummary,
    360,
  ) || null
  const embodimentClosureSummary = sanitizeProjectStateAuditText(
    projectState.embodimentClosureSummary
    ?? projectState.selfAuthoritySummary
    ?? projectState.currentBodyState,
    220,
  ) || null

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

  const sanitized = sanitizeSameHerCarry(combined)
  if (sanitized && carriesStructuredContinuityHold(sanitized))
    return sanitized

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
  } satisfies Record<string, unknown>
}

function deriveSelfRevisionPatchSameHerHoldDetail(selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null) {
  const projectStateContinuity = selfRevisionPatch?.projectStateContinuity ?? null
  if (!projectStateContinuity)
    return null

  const rawExplicitSameHerHoldDetail = typeof projectStateContinuity.sameHerHoldDetail === 'string'
    ? projectStateContinuity.sameHerHoldDetail.trim()
    : ''
  if (rawExplicitSameHerHoldDetail) {
    const loweredExplicitHold = rawExplicitSameHerHoldDetail.toLowerCase()
    if (/vulnerable-care|vulnerable care|care-before-analysis|care before analysis/u.test(loweredExplicitHold))
      return sanitizeProjectStateAuditText(rawExplicitSameHerHoldDetail, 220) || null
    if (/repair-before-closeness|repair before closeness|repair-first|repair first|rest-protective|rest protective|fatigue-aware|fatigue aware|quiet-companionship|quiet companionship|measured-return|measured return|lower-pressure|lower pressure|leave more room|more room/u.test(loweredExplicitHold))
      return null
  }

  const explicitSameHerHoldDetail = sanitizeProjectStateAuditText(rawExplicitSameHerHoldDetail, 220) || null
  if (explicitSameHerHoldDetail)
    return explicitSameHerHoldDetail

  const merged = [
    sanitizeProjectStateAuditText(projectStateContinuity.sameHerSelfLine, 220),
    sanitizeProjectStateAuditText(projectStateContinuity.emotionalClosureCue, 220),
    sanitizeProjectStateAuditText(projectStateContinuity.continuityGuard, 220),
  ].filter(Boolean).join(' ').toLowerCase()
  if (!merged)
    return null

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
    .map(text => sanitizeSameHerCarry(text))
    .filter((text): text is string => Boolean(text))
    .filter(text => carriesStructuredContinuityHold(text))
    .filter((text, index, array) => array.findIndex(candidate => candidate.toLowerCase() === text.toLowerCase()) === index)
    .join(' | ')

  return carry ? sanitizeSameHerCarry(carry) : null
}

function sanitizeSameHerCarry(text: string) {
  const normalized = text.trim().replace(/\s+/g, ' ').slice(0, 220)
  if (!normalized)
    return null
  if (containsAlicizationFixedTemplateResidue(normalized) || containsGeneratedContinuityCue(normalized))
    return null

  const sanitized = containsAlicizationFixedTemplateResidue(normalized)
    ? sanitizeAlicizationStructuredInternalText(normalized, 220, '')
    : normalized
  if (!sanitized || containsAlicizationFixedTemplateResidue(sanitized) || containsGeneratedContinuityCue(sanitized))
    return null
  return sanitized
}

function carriesStructuredContinuityHold(text: string | null | undefined) {
  if (!text)
    return false

  const normalized = text.toLowerCase()
  const hasStructuredKey
    = /(?:^|[;|\s])(?:continuity_hold|relationship_cadence|reentry_cadence|care_timing|embodiment_closure|embodiment_status|direction=inward|widening=deferred|warmth_widening=deferred|pressure=lower|room=more|fatigue_aware=true|visibility=renderer-internal|surface=structured)\b/u.test(normalized)
  if (!hasStructuredKey)
    return false

  return /repair_before_closeness|rest_protective|rest_protective_vulnerable_care|measured_return|quiet_companionship|vulnerable-care|care-before-analysis|repair-before-closeness|rest-protective|measured-return|quiet-companionship|lower-pressure|lower_pressure|fatigue-aware|fatigue_aware|widening=deferred|direction=inward|room=more|pressure=lower/u.test(normalized)
}

function isQuietSameHerContinuityCarry(text: string | null | undefined) {
  if (!text)
    return false

  const normalized = text.toLowerCase()
  const carriesQuietInwardHold
    = normalized.includes('quiet_companionship')
      || normalized.includes('quiet-companionship')
      || normalized.includes('rest_protective')
      || normalized.includes('rest-protective')
      || normalized.includes('direction=inward')
      || normalized.includes('widening=deferred')
      || normalized.includes('before widening outward')
      || normalized.includes('before widening warmth')
      || normalized.includes('lower-pressure')
      || normalized.includes('lower_pressure')
      || normalized.includes('measured-return')
      || normalized.includes('measured_return')

  return carriesStructuredContinuityHold(normalized) && carriesQuietInwardHold
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
  return null
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
      || input.openingGuidanceHoldDetail === 'continuity-lower-pressure-hold'
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
    return 'continuity-lower-pressure-hold'
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
  const openingGuidanceInwardCarry = sanitizeSameHerCarry(openingGuidance)
  const structuredSameHerInwardCarry
    = sameHerInwardCarry && openingGuidanceInwardCarry && shouldCarryOpeningGuidanceIntoSameHerInwardCarry(openingGuidance)
      ? `${sameHerInwardCarry} | ${openingGuidanceInwardCarry}`.trim()
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
  const visibleReplyFixedTemplateViolationReason = reply && containsAlicizationFixedTemplateResidue(reply)
    ? 'proactive-visible-reply-fixed-template-contamination'
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
    : openingGuidanceViolationReason ?? projectStateAuditViolationReason ?? visibleReplyFixedTemplateViolationReason
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
  const persistedVisibleReplyAuthority = actualVisibleReplyAuthority
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
          ? sanitizeSameHerCarry(inheritedVisibleReplyRealization.sameHerInwardCarry) ?? carriedSameHerInwardCarry
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
