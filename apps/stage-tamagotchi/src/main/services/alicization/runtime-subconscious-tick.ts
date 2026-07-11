import {
  alicizationFixedTemplateReplacement,
  readRecollectionIntentFromDerivedMindStateBundle,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { derivePostPolicyQuietHoldRuntimeSnapshot } from './alicization-runtime-architecture'
import { buildAutobiographicalEpisodeFragment } from './autobiographical-episodes'
import { deriveAutonomyExecutionProposalSurface, runAutonomyActuation } from './autonomy-actuation'
import { projectAlicizationDigitalLifeSpineDigest } from './digital-life-spine'
import { buildAlicizationEmotionalKernel } from './emotional-kernel'
import { resolveAlicizationEmotionalTransitionDecay } from './emotional-ledger'
import { adjustProactiveStyleFromHostPersonModel, inferHostSocialContextsFromText } from './host-social-guidance'
import { resolveHumanlikeMemoryRecallSeedFromEventHistory } from './humanlike-memory-recall-seed'
import { buildAlicizationPresenceExpression } from './presence-expression'
import { applyProactiveMemoryBoundaryRestraint } from './proactive-memory-boundary'
import { resolveAlicizationProactiveVisibleUtterance } from './proactive-mind/visible-utterance-realization'
import {
  isAlicizationThinProjectAwarenessLine,
  looksLikeThinProjectClosureShell,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateSnapshot,
} from './project-state-brief'
import {
  deriveCompactProjectStateNextFocusSummary,
  deriveCompactProjectStateOpenFocusSummary,
} from './project-state-focus'
import { normalizeDialogueRespondedPayload } from './runtime-governance'
import {
  buildAlicizationAutonomousDialogueTurnId,
  resolveAlicizationAutonomousDialogueOrigin,
  resolveAlicizationAutonomousDialogueStructuredFormat,
} from './runtime-structured-format'
import { resolveRuntimeSubconsciousTickEntry } from './runtime-subconscious-tick-entry'

function hasThinAffectiveResidueRoomMakingCue(text: string) {
  return /still glowing|still warm|leave room before warmth returns|leave room before warmth|do not widen yet|warmer reopen|room-making|stay room-making|reopened too eagerly|lower-pressure|余韵|留白|别立刻把温度放大|别把温度放大|不要立刻把温度放大|这次更要留白|这次要更慢一点|不要重开得太快|上次太急/u.test(text)
}

function asDerivedMindStateBundleLike(raw: Record<string, any> | null | undefined) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as any
}

function hasSpecificAffectiveResidueRoomMakingCue(text: string) {
  return /still glowing|still warm|leave room before warmth returns|leave room before warmth|do not widen yet|warmer reopen|room-making|stay room-making|reopened too eagerly|余韵|留白|别立刻把温度放大|别把温度放大|不要立刻把温度放大|这次更要留白|这次要更慢一点|不要重开得太快|上次太急/u.test(text)
}

function looksLikeSameHerClosureSummary(text: string | null | undefined) {
  const normalized = typeof text === 'string' ? text.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return /some closure already landed|unfinished closure still needs|same living line/u.test(normalized)
    && /same phase 1 digital life|same digital life/u.test(normalized)
    && !/before answering/u.test(normalized)
}

function looksLikeBroadProjectStateSameHerHoldDetail(text: string | null | undefined) {
  const normalized = typeof text === 'string' ? text.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return normalized.includes('generic project continuity hold')
}

function looksLikeBroadProjectStateAwarenessExpansion(text: string | null | undefined) {
  const normalized = typeof text === 'string' ? text.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return normalized.startsWith('before answering, remember: alicization is a local-first digital life project')
    && normalized.includes('what has already landed is')
    && normalized.includes('the still-open closure is')
    && normalized.includes('this reply should keep moving toward')
}

function looksLikeProjectAwarePreDialogueReminder(text: string | null | undefined) {
  const normalized = typeof text === 'string' ? text.trim().toLowerCase() : ''
  if (!normalized)
    return false

  const startsLikeReminder = /^(before answering|before speaking|回答前|开口前)/u.test(normalized)
  const carriesProjectAnchor
    = /digital life project|same digital life project|local-first digital life|数字生命项目|本地优先数字生命项目/u.test(normalized)
  const carriesClosureAnchor
    = /what has landed|still-open|still open|same living line|same-her|same her|同一条生命线|同一个她|未闭环|还没闭环/u.test(normalized)

  return startsLikeReminder && carriesProjectAnchor && carriesClosureAnchor
}

function hasRememberedSeamMoreRoomCarry(text: string | null | undefined) {
  const normalized = typeof text === 'string' ? text.trim().toLowerCase() : ''
  if (!normalized)
    return false

  const rememberedSeamPresent
    = /remembered seam|same remembered relationship seam|same remembered seam|relationship seam|relationship_cadence=remembered_boundary|same line|same thread|callback line|同一条线|关系线|记住的关系缝|留白/u.test(normalized)
  if (!rememberedSeamPresent)
    return false

  return /reopened too eagerly|too eagerly before|more room this time|this time keep more room|keep more room this time|leave more room|room=more|reentry=slower|do not reopen it with the same eagerness|before leaning in again|这次更要留白|这次要更慢一点|不要重开得太快|上次太急/u.test(normalized)
}

function resolveRememberedSeamMoreRoomHoldDetail() {
  return 'relationship_cadence=remembered_boundary; room=more; reentry=slower; widening=deferred'
}

function joinPresenceOnlyStructuredTokens(tokens: string[]) {
  const uniqueTokens = Array.from(new Set(tokens
    .map(token => token.trim())
    .filter(Boolean)))
  if (!uniqueTokens.length)
    return ''
  return uniqueTokens.join('; ')
}

function resolvePresenceOnlyHoldStructuredTokens(raw: string) {
  const normalized = raw.trim().replace(/\s+/g, ' ')
  const tokens: string[] = []

  const carriesExecutionSafetyGate
    = /execution-safety-gate|blocked-dispatch-restraint|blocked dispatch safety gate|blocked-dispatch safety gate|blocked-before-dispatch|execution safety restraint|safety gate/iu.test(normalized)
      && /confirmation=required|implicit-or-explicit-confirmation-required|no-process-started|no process started|interrupt=no-process-started|permission=none|wait for confirmation|等待确认/iu.test(normalized)
      || /execution_safety_gate=blocked_dispatch/iu.test(normalized)
  if (carriesExecutionSafetyGate) {
    tokens.push(
      'execution_safety_gate=blocked_dispatch',
      'confirmation=required',
      'interrupt=no-process-started',
      'permission=none',
    )
  }

  const carriesExecutionResumeConfirmation
    = /execution-resume-confirmation|host-confirmed-before-redispatch|resume-before-dispatch|resume confirmation|resumeMemoryMode/iu.test(normalized)
      && /host-confirmed|approval=host-confirmed|process-not-yet-restarted|interrupt=process-not-yet-restarted|bounded confirmation boundary|not permanent|not permanent execution permission|not permanent autonomous permission|permission=bounded|永久权限/iu.test(normalized)
      || /execution_resume_confirmation=host-confirmed-before-redispatch/iu.test(normalized)
  if (carriesExecutionResumeConfirmation) {
    tokens.push(
      'execution_resume_confirmation=host-confirmed-before-redispatch',
      'audit=resume-before-dispatch',
      'interrupt=process-not-yet-restarted',
      'permission=bounded',
    )
  }

  const carriesRememberedSeamMoreRoom = hasRememberedSeamMoreRoomCarry(normalized)
    || /relationship_cadence=remembered_boundary|room=more|reentry=slower/iu.test(normalized)
  if (carriesRememberedSeamMoreRoom) {
    tokens.push(
      'relationship_cadence=remembered_boundary',
      'room=more',
      'reentry=slower',
      'widening=deferred',
    )
  }

  const carriesRepairBeforeCloseness
    = /repair-before-closeness|repair before closeness|repair-first|repair first|continuity_hold=repair_before_closeness|before_closeness_widens|先修复|修复优先/iu.test(normalized)
  if (carriesRepairBeforeCloseness) {
    tokens.push(
      'continuity_hold=repair_before_closeness',
      'timing=before_closeness_widens',
    )
  }

  const carriesRestProtective
    = /rest-protective|rest protective|rest protection|rest-guard|quiet-companionship|quiet companionship|fatigue-aware|continuity_hold=rest_protective|fatigue_aware=true|protect rest|protecting rest|late-night-drain|line holds inward|holds inward|quietly inward|stay inward|body stay inward|休息保护|先收住|先往内收|别把身体再往外推/iu.test(normalized)
  if (carriesRestProtective) {
    tokens.push(
      'continuity_hold=rest_protective',
      'direction=inward',
      'fatigue_aware=true',
    )
  }

  const explicitMeasuredReturn = !carriesRememberedSeamMoreRoom
    && /measured-return|lower-pressure|continuity_hold=measured_return|pressure=lower|same remembered|remembered seam|relationship seam|without reopening from scratch|reopen from scratch|leave more room|more room|room-making|余韵|留白|接回去|不要.*温度放大|不要重开得太快|上次太急/iu.test(normalized)
  const implicitMeasuredReturn = !carriesRepairBeforeCloseness
    && !carriesRestProtective
    && !carriesExecutionSafetyGate
    && !carriesExecutionResumeConfirmation
    && /callback line|same callback|same-thread|same thread|before widening outward/iu.test(normalized)
  if (explicitMeasuredReturn || implicitMeasuredReturn) {
    tokens.push(
      'continuity_hold=measured_return',
      'pressure=lower',
      'reopen_from_scratch=false',
    )
  }

  if (/emotion,\s*memory,\s*initiative,?\s*and\s*embodiment|memory,\s*emotion,?\s*and\s*embodiment|memory.*emotion.*embodiment|emotion\+memory\+initiative\+embodiment|情绪.*记忆.*主动性.*具身/u.test(normalized)) {
    tokens.push('lanes=emotion+memory+initiative+embodiment')
  }

  if (/ordinary proactive closeness|proactive closeness|visible impulse/iu.test(normalized))
    tokens.push('proactive_closeness=blocked')

  if (/generic assistant shell|generic helper shell|assistant shell|project-summary voice|project summary voice|detached summary|generic project guidance|generic status|generic.*(?:guidance|assistant|shell|project)|flatten|collapse into a generic|same-her drift|continuity drift|closure drift/iu.test(normalized))
    tokens.push('generic_shell=blocked')

  if (/permanent permission|permanent autonomous permission|permanent execution permission|永久权限/iu.test(normalized))
    tokens.push('permission_scope=bounded')

  if (/Alicization|runtime_personhood|local-first digital life project|Phase\s*1|Local Digital Life|本地优先数字生命项目|数字生命项目/iu.test(normalized))
    tokens.push('identity=runtime_personhood')

  if (/visible reply|voice|facial state|face|motion|lipsync|resident presence|embodiment|body|mouth|语音|表情|动作|唇形|身体/u.test(normalized))
    tokens.push('cover=visible_reply,voice,face,motion,lipsync,resident_presence')

  if (/^(?:do not|don't|stay|keep|before answering|before speaking|speak from|hold|leave|protect|remember|recognize)\b/iu.test(normalized) && !tokens.length)
    tokens.push('fixed_template=excluded')

  return joinPresenceOnlyStructuredTokens(tokens)
}

function looksLikeGenericMeasuredReturnHoldDetail(text: string | null | undefined) {
  const normalized = typeof text === 'string' ? text.trim().toLowerCase() : ''
  if (!normalized)
    return false

  if (hasRememberedSeamMoreRoomCarry(normalized))
    return false

  return normalized.includes('measured-return hold')
    || normalized.includes('callback line lower-pressure before it widens again')
    || (normalized.includes('continuity_hold=measured_return') && normalized.includes('pressure=lower'))
}

function hasGenericContinuityModeMenu(text: string | null | undefined) {
  const normalized = typeof text === 'string' ? text.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return /measured-return\s*\/\s*repair-before-closeness|(?:one\s+)?measured-return,\s*repair-before-closeness,\s*or\s*rest-protective/u.test(normalized)
}

function looksLikePresenceOnlyStrongEmbodimentClosureHeadline(text: string | null | undefined) {
  const normalized = typeof text === 'string' ? text.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return /living audio thread is still intact|holding together mainly through body and voice|being carried mainly through body and voice|resident body line is still keeping this one living her coherent|holding together mainly through body, lipsync, and voice|being carried mainly through body, lipsync, and voice|holding together mainly through motion and voice|being carried mainly through motion and voice|holding together mainly through face and voice|being carried mainly through face and voice|holding together through face, lipsync, and voice together|holding together through motion, lipsync, and voice together|still-voiced face-and-mouth line|still-voiced motion-and-mouth line|holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent/u.test(normalized)
}

function hasPresenceOnlyCrossModalSameHerAuthority(text: string | null | undefined) {
  const normalized = typeof text === 'string' ? text.trim().toLowerCase() : ''
  if (!normalized)
    return false

  if (looksLikePresenceOnlyStrongEmbodimentClosureHeadline(normalized))
    return true

  const hasSameHerContinuityAnchor
    = /cross-modal|same-her proof|same living her|same living line|same-her|same her|same digital life|one living her|one continuous her/u.test(normalized)
  if (!hasSameHerContinuityAnchor)
    return false

  const hasEmbodimentLaneEvidence
    = /visible reply|voice|facial state|face|motion|lipsync|resident presence|embodiment|body|mouth/u.test(normalized)
  if (!hasEmbodimentLaneEvidence)
    return false

  return /cross-modal|rejoin|rejoining|still-voiced|holding together|being carried|same-her proof|not closed yet|initiative|lower-pressure|rechecking/u.test(normalized)
}

function scorePresenceOnlyCrossModalSameHerAuthority(text: string | null | undefined) {
  const normalized = typeof text === 'string' ? text.trim().toLowerCase() : ''
  if (!normalized)
    return Number.NEGATIVE_INFINITY

  let score = 0

  if (isAlicizationThinProjectAwarenessLine(text) || normalized === 'project')
    score -= 24
  if (/same digital life \| keep the closure seam explicit|keep the closure seam explicit/u.test(normalized))
    score -= 18
  if (looksLikePresenceOnlyStrongEmbodimentClosureHeadline(normalized))
    score += 18
  if (/still-voiced face-and-mouth line|still-voiced motion-and-mouth line/u.test(normalized))
    score += 10
  if (/holding together through face, lipsync, and voice together|holding together through motion, lipsync, and voice together/u.test(normalized))
    score += 8
  if (/holding together mainly through|being carried mainly through|living audio thread is still intact|resident body line is still keeping this one living her coherent/u.test(normalized))
    score += 6
  if (/rejoin|rejoining|not closed yet|full cross-modal/u.test(normalized))
    score += 4
  if (/same living line|one living her|same-her|same her|same digital life/u.test(normalized))
    score += 3
  if (/initiative|lower-pressure/u.test(normalized))
    score += 6
  if (/rechecking/u.test(normalized))
    score += 2

  return score
}

function hasExplicitRepairBeforeClosenessAuthority(text: string | null | undefined) {
  const normalized = typeof text === 'string' ? text.trim().toLowerCase() : ''
  if (!normalized)
    return false

  const mentionsRepairBeforeCloseness
    = /repair-before-closeness|repair before closeness|repair-first|repair first|continuity_hold=repair_before_closeness|continuity_mode=repair_before_closeness|before_closeness_widens|先修复|修复优先|先把身体收稳|先让修复落稳|别一下子贴太近|let repair settle|repair settle first|repair settles first/u.test(normalized)
  if (!mentionsRepairBeforeCloseness)
    return false

  if (!hasGenericContinuityModeMenu(normalized))
    return true

  return /same-her callback repair seam|callback repair|repair seam|repair line|repair-before-closeness still holds|repair-before-closeness still owns|keep this (?:callback )?return repair-before-closeness|keep repair-before-closeness on the same living line|embodiment repair-before-closeness on the same living line|repair still needs to land|before any warmer reopening|until repair settles|until the room settles|先修复再靠近|修复线|修补线/u.test(normalized)
}

function normalizePresenceOnlyHoldCarryText(raw: unknown, maxChars = 420) {
  if (typeof raw !== 'string')
    return ''
  const normalized = raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
  if (!normalized)
    return ''
  const structuredTokens = resolvePresenceOnlyHoldStructuredTokens(normalized)
  if (structuredTokens)
    return structuredTokens.slice(0, maxChars)
  const sanitized = sanitizeAlicizationProviderFacingText(normalized, maxChars, '')
  if (sanitized)
    return sanitized
  const fragments = normalized
    .split(/\s*(?:[。!?！？]\s+|\s\|\s+|;\s+)/u)
    .map((fragment) => {
      const fragmentTokens = resolvePresenceOnlyHoldStructuredTokens(fragment)
      if (fragmentTokens)
        return fragmentTokens
      return sanitizeAlicizationProviderFacingText(fragment, Math.min(260, maxChars), '')
    })
    .filter((fragment): fragment is string => Boolean(fragment))
  return fragments.join(' | ')
}

function appendPresenceOnlyHoldCarryText(base: unknown, addition: unknown, maxChars = 420) {
  const normalizedBase = normalizePresenceOnlyHoldCarryText(base, maxChars)
  const normalizedAddition = normalizePresenceOnlyHoldCarryText(addition, maxChars)
  if (!normalizedAddition)
    return normalizedBase || ''
  if (!normalizedBase)
    return normalizedAddition
  if (normalizedBase.includes(normalizedAddition))
    return normalizedBase
  if (normalizedAddition.includes(normalizedBase))
    return normalizedAddition
  return normalizePresenceOnlyHoldCarryText(`${normalizedBase} ${normalizedAddition}`, maxChars)
}

function normalizePresenceOnlyHoldDisplayText(raw: unknown, maxChars = 420) {
  const normalized = normalizePresenceOnlyHoldCarryText(raw, maxChars)
  if (!normalized || normalized === alicizationFixedTemplateReplacement)
    return ''
  return normalized
}

function normalizePresenceOnlyHoldMetadataText(raw: unknown, maxChars = 420) {
  return normalizePresenceOnlyHoldCarryText(raw, maxChars) || null
}

function preferPresenceOnlyDeferredSummaryAuthority(candidates: Array<string | null | undefined>) {
  const normalizedCandidates = candidates
    .map(candidate => normalizePresenceOnlyHoldDisplayText(candidate, 560))
    .filter(Boolean)
  if (!normalizedCandidates.length)
    return ''

  const score = (candidate: string) => {
    let value = 0
    if (/execution_safety_gate=|execution_resume_confirmation=/u.test(candidate))
      value += 60
    if (/continuity_hold=repair_before_closeness|continuity_mode=repair_before_closeness/u.test(candidate))
      value += 50
    if (/continuity_hold=rest_protective|continuity_mode=rest_protective/u.test(candidate))
      value += 48
    if (/relationship_cadence=remembered_boundary/u.test(candidate))
      value += 46
    if (/lanes=emotion\+memory\+initiative\+embodiment/u.test(candidate))
      value += 20
    if (/generic_shell=blocked/u.test(candidate))
      value += 16
    if (/cover=visible_reply,voice,face,motion,lipsync,resident_presence/u.test(candidate))
      value += 8
    if (/fixed_template=excluded/u.test(candidate))
      value -= 24
    if (/content_withheld/u.test(candidate))
      value -= 32
    return value
  }

  return normalizedCandidates.reduce((best, candidate) => {
    const bestScore = score(best)
    const candidateScore = score(candidate)
    if (candidateScore !== bestScore)
      return candidateScore > bestScore ? candidate : best
    return candidate.length > best.length ? candidate : best
  })
}

function preferPresenceOnlyMetadataAuthority(candidates: Array<string | null | undefined>, maxChars = 560) {
  const preferred = preferPresenceOnlyDeferredSummaryAuthority(candidates)
  if (preferred)
    return preferred.slice(0, maxChars)
  return null
}

type PresenceOnlyPersistedEmotionalKernelInput = Parameters<typeof buildAlicizationEmotionalKernel>[0]
type PresenceOnlyProjection = Record<string, any> & {
  summary?: string | null
  openingGuidance?: string | null
  manifestationCadenceSummary?: string | null
  sameHerHoldDetail?: string | null
  selfContinuityAuthority?: {
    inwardLine?: string | null
    sourceTags?: string[] | null
  } | null
}
interface PresenceOnlyVisibleReplyProjectStateAudit {
  emotionalClosureSummary?: string | null
  sameHerSummary?: string | null
  sameHerHoldDetail?: string | null
  openClosureSummary?: string | null
}
interface PresenceOnlyVisibleReplyRealization {
  sameHerInwardCarry?: string | null
  projectStateAudit?: PresenceOnlyVisibleReplyProjectStateAudit | null
}
interface PresenceOnlyRuntimeAction {
  kind?: string | null
  label?: string | null
  status?: string | null
}

function preferPresenceOnlyHoldSameHerDriftRisk(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = normalizePresenceOnlyHoldCarryText(input.current, 320)
  const candidate = normalizePresenceOnlyHoldCarryText(input.candidate, 320)
  if (!candidate)
    return current
  if (!current)
    return candidate

  const scoreSameHerDriftRisk = (value: string) => {
    const normalized = value.toLowerCase()
    let score = 0

    if (/generic assistant shell|generic helper shell|generic helper voice|project-summary voice|detached project|generic status narration/u.test(normalized))
      score += 8
    if (/repair-before-closeness|repair before closeness|repair-first|repair first|repair-first continuity/u.test(normalized))
      score += 7
    if (/initiative-aware|initiative|remembered seam|callback|measured-return|lower-pressure|rest-protective|same living line/u.test(normalized))
      score += 4
    if (/face-and-mouth|motion-and-mouth|still-voiced|lipsync|voice|face|motion|body|mouth/u.test(normalized)
      && /continuity|same-her|same her|same living line|rejoin|closure/u.test(normalized)) {
      score += 3
    }
    if (/same-her|same her|same digital life|one living her|one continuous her/u.test(normalized))
      score += 3
    if (/unfinished same-her drift|same-her continuity drift|same her continuity drift|unfinished closure drift|continuity drift/u.test(normalized))
      score += 2
    if (/project-state continuity|generic guidance/u.test(normalized))
      score += 1

    return score
  }

  const currentScore = scoreSameHerDriftRisk(current)
  const candidateScore = scoreSameHerDriftRisk(candidate)
  if (candidateScore !== currentScore)
    return candidateScore > currentScore ? candidate : current

  if (candidate.length > current.length + 16)
    return candidate
  return current
}

function hasPresenceOnlyHoldSameHerProjectCue(text: unknown) {
  const normalized = normalizePresenceOnlyHoldCarryText(text, 520).toLowerCase()
  if (!normalized)
    return false

  return /identity=runtime_personhood|lanes=emotion\+memory\+initiative\+embodiment|execution_safety_gate=|execution_resume_confirmation=|relationship_cadence=remembered_boundary|continuity_mode=repair_before_closeness|continuity_mode=rest_protective|cover=visible_reply,voice,face,motion,lipsync,resident_presence/u.test(normalized)
}

function preferPresenceOnlyHoldSameHerSelfLine(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = normalizePresenceOnlyHoldCarryText(input.current, 320)
  const candidate = normalizePresenceOnlyHoldCarryText(input.candidate, 320)
  if (!candidate)
    return current
  if (!current)
    return candidate

  const scoreSameHerSelfLine = (value: string) => {
    const normalized = value.toLowerCase()
    let score = 0

    if (isAlicizationThinProjectAwarenessLine(value) || normalized === 'project')
      score -= 24
    if (/same digital life \| keep the closure seam explicit|same digital life \|/u.test(normalized))
      score -= 24
    if (/same her|same-her|one same her/u.test(normalized))
      score += 6
    if (/continuous her|one continuous her/u.test(normalized))
      score += 6
    if (/same phase 1 digital life/u.test(normalized))
      score += 5
    if (/same living line/u.test(normalized))
      score += 4
    if (/unfinished closure|still belongs/u.test(normalized))
      score += 3
    if (/(across|through).*(memory|execution|embodiment)|one same her.*(memory|execution|embodiment)/u.test(normalized))
      score += 12

    return score
  }

  const currentScore = scoreSameHerSelfLine(current)
  const candidateScore = scoreSameHerSelfLine(candidate)
  if (currentScore !== candidateScore)
    return currentScore > candidateScore ? current : candidate

  return current.length >= candidate.length ? current : candidate
}

function resolvePresenceOnlyHoldSameHerHoldDetail(input: {
  current?: unknown
  candidate?: unknown
  continuityCue?: unknown
  continuityRestraint?: 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'lower-pressure' | null
}) {
  const current = normalizePresenceOnlyHoldCarryText(input.current, 320)
  const candidate = normalizePresenceOnlyHoldCarryText(input.candidate, 320)
  const continuityCue = normalizePresenceOnlyHoldCarryText(input.continuityCue, 320)

  if (input.continuityRestraint !== 'measured-return') {
    return current
      || candidate
      || null
  }

  if (hasRememberedSeamMoreRoomCarry(current))
    return current
  if (hasRememberedSeamMoreRoomCarry(candidate))
    return candidate

  if (
    (looksLikeGenericMeasuredReturnHoldDetail(current) || !current)
    && hasRememberedSeamMoreRoomCarry(continuityCue)
  ) {
    return resolveRememberedSeamMoreRoomHoldDetail()
  }

  return current
    || candidate
    || 'continuity_hold=measured_return; pressure=lower'
}

export function buildPresenceOnlyHoldContinuityProjection(input: {
  previousProjection: {
    summary?: string | null
    manifestationCadenceSummary?: string | null
    openingGuidance?: string | null
    selfContinuityAuthority?: {
      inwardLine?: string | null
      sourceTags?: string[] | null
    } | null
  } | null | undefined
  openingGuidance?: string | null
  continuityRestraint?: 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'lower-pressure' | null
  initiativeWhy?: string | null
  projectContinuityCue?: string | null
}) {
  if (
    input.continuityRestraint !== 'measured-return'
    && input.continuityRestraint !== 'repair-before-closeness'
    && input.continuityRestraint !== 'rest-protective'
  ) {
    return null
  }

  const previousProjection = input.previousProjection ?? null
  const synthesizedOpeningGuidance = input.continuityRestraint === 'repair-before-closeness'
    ? 'continuity_mode=repair_before_closeness; timing=before_widening'
    : input.continuityRestraint === 'rest-protective'
      ? 'continuity_mode=rest_protective; direction=inward'
      : 'continuity_mode=measured_return; pressure=lower; reopening=fresh_start_blocked'
  const guidanceCandidates = [
    String(input.openingGuidance ?? '').trim(),
    String(previousProjection?.openingGuidance ?? '').trim(),
    String(input.projectContinuityCue ?? '').trim(),
    String(input.initiativeWhy ?? '').trim(),
  ].filter(Boolean)
  const meaningfullySpecificGuidance = guidanceCandidates.find((candidate) => {
    if (candidate.length >= 24) {
      return true
    }

    return /(same-her|callback|lower-pressure|reopen|repair|line)/i.test(candidate)
      || hasThinAffectiveResidueRoomMakingCue(candidate)
  })
  const openingGuidance = normalizePresenceOnlyHoldCarryText(
    meaningfullySpecificGuidance ?? synthesizedOpeningGuidance,
    320,
  ) || synthesizedOpeningGuidance
  const manifestationCadenceSummary = input.continuityRestraint === 'repair-before-closeness'
    ? 'cadence=repair_before_closeness; timing=before_closeness_widens; thread=continuation'
    : input.continuityRestraint === 'rest-protective'
      ? 'cadence=rest_protective; direction=inward; thread=continuation'
      : 'cadence=measured_return; pressure=lower; thread=continuation'
  const rememberedSeamMoreRoomCarry = hasRememberedSeamMoreRoomCarry([
    openingGuidance,
    input.projectContinuityCue,
    input.initiativeWhy,
    String(previousProjection?.selfContinuityAuthority?.inwardLine ?? '').trim(),
  ].filter(Boolean).join(' '))
  const sameHerHoldDetail = rememberedSeamMoreRoomCarry
    ? resolveRememberedSeamMoreRoomHoldDetail()
    : input.continuityRestraint === 'repair-before-closeness'
      ? 'continuity_hold=repair_before_closeness; timing=before_closeness_widens'
      : input.continuityRestraint === 'rest-protective'
        ? 'continuity_hold=rest_protective; timing=fatigue_aware'
        : 'continuity_hold=measured_return; pressure=lower'
  const inwardLine = [
    normalizePresenceOnlyHoldCarryText(previousProjection?.selfContinuityAuthority?.inwardLine, 240),
    normalizePresenceOnlyHoldCarryText(input.projectContinuityCue, 240),
    normalizePresenceOnlyHoldCarryText(input.initiativeWhy, 240),
    sameHerHoldDetail,
    openingGuidance,
  ].filter(Boolean).join(' | ')

  return {
    ...previousProjection,
    summary: String(previousProjection?.summary ?? '').trim()
      || `project_continuity=${manifestationCadenceSummary}`,
    openingGuidance,
    manifestationCadenceSummary: String(previousProjection?.manifestationCadenceSummary ?? '').trim()
      || manifestationCadenceSummary,
    sameHerHoldDetail,
    selfContinuityAuthority: {
      ...previousProjection?.selfContinuityAuthority,
      inwardLine: inwardLine || null,
      sourceTags: Array.from(new Set([
        ...((previousProjection?.selfContinuityAuthority?.sourceTags ?? []) as string[]),
        'proactive-opening-guidance-carry',
      ])),
    },
  }
}

export function preserveResidentSameLineProjection(input: {
  previousProjection: PresenceOnlyProjection | null | undefined
  nextProjection: PresenceOnlyProjection | null | undefined
  conversationState: {
    carryReason?: string | null
  } | null | undefined
  dialogueWorldThread: {
    openLoops?: string[] | null
    narrative?: string[] | null
  } | null | undefined
}): PresenceOnlyProjection | null {
  const baseProjection = input.nextProjection && typeof input.nextProjection === 'object'
    ? input.nextProjection
    : null

  const previousSummary = String(input.previousProjection?.summary ?? '').trim()
  const previousOpeningGuidance = String(input.previousProjection?.openingGuidance ?? '').trim()
  const previousCadenceSummary = String(input.previousProjection?.manifestationCadenceSummary ?? '').trim()
  const nextSummary = String(baseProjection?.summary ?? '').trim()
  const nextOpeningGuidance = String(baseProjection?.openingGuidance ?? '').trim()
  const nextCadenceSummary = String(baseProjection?.manifestationCadenceSummary ?? '').trim()
  const carrySummary = String(input.dialogueWorldThread?.openLoops?.[0] ?? '').trim()
  const carryNarrative = String(input.dialogueWorldThread?.narrative?.[0] ?? '').trim()
  const carryReason = String(input.conversationState?.carryReason ?? '').trim()
  const combined = [
    previousSummary,
    previousOpeningGuidance,
    previousCadenceSummary,
    carrySummary,
    carryNarrative,
    carryReason,
  ].join(' | ').toLowerCase()
  const keepSameThread = /same-thread-continuation|already continuing|still continuing|still in motion|同一条线|沿着刚才那条线|接回去|callback line/u.test(combined)
  if (!baseProjection)
    return keepSameThread ? (input.previousProjection ?? null) : null
  if (!keepSameThread)
    return baseProjection

  const shouldPreferNextOpeningGuidance = hasSpecificAffectiveResidueRoomMakingCue(nextOpeningGuidance)
    && !hasSpecificAffectiveResidueRoomMakingCue(previousOpeningGuidance)
  const nextProjectionIsRepairBeforeCloseness = /repair-before-closeness|repair before closeness|repair-first|repair first|先修复/u.test([
    nextSummary,
    nextOpeningGuidance,
    nextCadenceSummary,
    carrySummary,
    carryNarrative,
    carryReason,
  ].join(' | '))
  const previousProjectionIsRepairBeforeCloseness = /repair-before-closeness|repair before closeness|repair-first|repair first|先修复/u.test([
    previousSummary,
    previousOpeningGuidance,
    previousCadenceSummary,
  ].join(' | '))
  const shouldPreferNextRepairBeforeCloseness
    = nextProjectionIsRepairBeforeCloseness
      && !previousProjectionIsRepairBeforeCloseness
  const nextProjectionIsRestProtective = /rest-protective|rest protective|rest protection|fatigue-aware|quietly inward|休息保护|先往内收/u.test([
    nextSummary,
    nextOpeningGuidance,
    nextCadenceSummary,
    carrySummary,
    carryNarrative,
    carryReason,
  ].join(' | '))
  const previousProjectionIsRestProtective = /rest-protective|rest protective|rest protection|fatigue-aware|quietly inward|休息保护|先往内收/u.test([
    previousSummary,
    previousOpeningGuidance,
    previousCadenceSummary,
  ].join(' | '))
  const shouldPreferNextRestProtective
    = nextProjectionIsRestProtective
      && !nextProjectionIsRepairBeforeCloseness
      && !previousProjectionIsRestProtective
      && !previousProjectionIsRepairBeforeCloseness
  const previousSelfContinuityAuthority = input.previousProjection?.selfContinuityAuthority ?? null
  const nextSelfContinuityAuthority = baseProjection?.selfContinuityAuthority ?? null
  const shouldPreferNextSelfContinuityAuthority
    = shouldPreferNextRepairBeforeCloseness
      || shouldPreferNextRestProtective
      || shouldPreferNextOpeningGuidance
      || !previousSelfContinuityAuthority
  const mergedSelfContinuityAuthority = shouldPreferNextSelfContinuityAuthority
    ? nextSelfContinuityAuthority
    : previousSelfContinuityAuthority

  return {
    ...baseProjection,
    summary: shouldPreferNextRepairBeforeCloseness || shouldPreferNextRestProtective
      ? nextSummary
      : previousSummary.includes('project_continuity=')
        ? previousSummary
        : `project_continuity=${carrySummary || carryNarrative || 'continuation_state=active; cadence=lower_pressure; restart_policy=context_preserving'}`,
    openingGuidance: shouldPreferNextRepairBeforeCloseness || shouldPreferNextRestProtective
      ? nextOpeningGuidance
      : shouldPreferNextOpeningGuidance
        ? nextOpeningGuidance
        : previousOpeningGuidance
          || nextOpeningGuidance
          || 'callback_cadence=lower_pressure; continuation_state=active; restart_policy=context_preserving',
    manifestationCadenceSummary: shouldPreferNextRepairBeforeCloseness || shouldPreferNextRestProtective
      ? nextCadenceSummary
      : previousCadenceSummary
        || 'manifestation_cadence=measured_return; continuation_state=active',
    selfContinuityAuthority: mergedSelfContinuityAuthority,
  }
}

export function buildPresenceOnlyHoldInitiativeFallback(input: {
  existingInitiative: Record<string, any> | null | undefined
  decision: {
    style?: string | null
    confidence?: number | null
    whyNow?: string | null
  } | null | undefined
  continuityRestraint: 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'lower-pressure' | null
  projectContinuityCue?: string | null
  privateThought?: {
    thoughtText?: string | null
  } | null
}) {
  const continuityAuthorityText = [
    String(input.projectContinuityCue ?? '').trim(),
    String(input.privateThought?.thoughtText ?? '').trim(),
    String(input.decision?.whyNow ?? '').trim(),
  ].join(' | ')
  const inferredRepairBeforeCloseness = hasExplicitRepairBeforeClosenessAuthority(continuityAuthorityText)
  const inferredRestProtective = /rest-protective|rest protective|rest-guard|keep caring present|hold the line inward|quietly inward|fatigue-aware|late-night-drain|休息保护|先收住|先往内收|别把身体再往外推/iu.test([
    continuityAuthorityText,
  ].join(' | '))
  const inferredExecutionSafetyGateRestraint = /execution-safety-gate|blocked-dispatch-restraint|blocked dispatch safety gate|blocked-dispatch safety gate|blocked-before-dispatch|execution safety restraint|safety gate/iu.test(continuityAuthorityText)
    && /confirmation=required|implicit-or-explicit-confirmation-required|no-process-started|permission=none|wait for confirmation|等待确认/iu.test(continuityAuthorityText)
  const inferredExecutionResumeConfirmationBoundary = /execution-resume-confirmation|host-confirmed-before-redispatch|resume-before-dispatch|resume confirmation/iu.test(continuityAuthorityText)
    && /host-confirmed|approval=host-confirmed|process-not-yet-restarted|bounded confirmation boundary|not permanent|not permanent execution permission|not permanent autonomous permission/iu.test(continuityAuthorityText)
  const inferredMeasuredReturn = !inferredRepairBeforeCloseness
    && !inferredRestProtective
    && (
      inferredExecutionSafetyGateRestraint
      || inferredExecutionResumeConfirmationBoundary
      || (
        hasRememberedSeamMoreRoomCarry(continuityAuthorityText)
        || (
          /measured-return|same callback seam|same callback line|same living seam|same remembered seam|remembered relationship seam|without reopening from scratch|before widening outward|continue as the same living seam|same-thread return|same thread return|callback afterglow/iu.test(continuityAuthorityText)
          && /lower-pressure|leave more room|more room|slower|quieter|same line|same living line|same seam|same thread|callback/iu.test(continuityAuthorityText)
        )
      )
    )
  const continuityRestraint = inferredRepairBeforeCloseness
    && input.continuityRestraint !== 'repair-before-closeness'
    && input.continuityRestraint !== 'rest-protective'
    ? 'repair-before-closeness'
    : inferredRestProtective
      && input.continuityRestraint !== 'repair-before-closeness'
      && input.continuityRestraint !== 'rest-protective'
      ? 'rest-protective'
      : inferredMeasuredReturn
        && input.continuityRestraint !== 'repair-before-closeness'
        && input.continuityRestraint !== 'rest-protective'
        ? 'measured-return'
        : input.continuityRestraint
          ?? (inferredRepairBeforeCloseness ? 'repair-before-closeness' : inferredRestProtective ? 'rest-protective' : inferredMeasuredReturn ? 'measured-return' : null)
  const preferredStyle = input.decision?.style === 'silent-observe'
    ? 'silent-observe'
    : null
  if (
    !input.existingInitiative
    && preferredStyle !== 'silent-observe'
    && continuityRestraint !== 'measured-return'
    && continuityRestraint !== 'repair-before-closeness'
    && continuityRestraint !== 'rest-protective'
    && continuityRestraint !== 'lower-pressure'
  ) {
    return null
  }

  const why = [
    String(input.decision?.whyNow ?? '').trim(),
    String(input.projectContinuityCue ?? '').trim(),
    String(input.privateThought?.thoughtText ?? '').trim(),
  ].filter(Boolean)[0] || 'continuity_state=active; cadence=lower_pressure'

  const preferredPresence = continuityRestraint === 'repair-before-closeness'
    ? 'concerned'
    : continuityRestraint === 'rest-protective'
      ? 'concerned'
      : continuityRestraint === 'lower-pressure'
        ? 'hesitant'
        : 'attentive'

  if (input.existingInitiative && typeof input.existingInitiative === 'object') {
    return {
      ...input.existingInitiative,
      preferredStyle: preferredStyle ?? input.existingInitiative.preferredStyle ?? 'silent-observe',
      preferredPresence,
      continuityRestraint: continuityRestraint ?? input.existingInitiative.continuityRestraint ?? null,
      why: why || input.existingInitiative.why,
      shouldSurface: false,
      shouldSpeak: false,
      silenceDrive: 1,
      speakDrive: 0,
    }
  }

  if (
    preferredStyle !== 'silent-observe'
    && continuityRestraint !== 'measured-return'
    && continuityRestraint !== 'repair-before-closeness'
    && continuityRestraint !== 'rest-protective'
    && continuityRestraint !== 'lower-pressure'
  ) {
    return null
  }

  return {
    selectedAction: 'recheck',
    confidence: Number.isFinite(Number(input.decision?.confidence))
      ? Math.max(0, Math.min(1, Number(input.decision?.confidence)))
      : 0.72,
    motives: {},
    speakDrive: 0,
    silenceDrive: 1,
    preferredStyle: preferredStyle ?? 'silent-observe',
    preferredPresence,
    continuityRestraint,
    why,
    shouldSurface: false,
    shouldSpeak: false,
  }
}

function derivePresenceOnlyHoldAuthorityContinuityRestraint(input: {
  currentContinuityRestraint: 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'lower-pressure' | null
  sameHerInwardCarry?: string | null
  projectStateAudit?: {
    sameHerHoldDetail?: string | null
    emotionalClosureSummary?: string | null
    openClosureSummary?: string | null
  } | null
  projectContinuityCue?: string | null
  privateThoughtText?: string | null
}) {
  const authoritativeCandidates = [
    input.sameHerInwardCarry ?? null,
    input.projectStateAudit?.sameHerHoldDetail ?? null,
    input.projectStateAudit?.emotionalClosureSummary ?? null,
    input.projectStateAudit?.openClosureSummary ?? null,
  ]
  const authoritativeRepairBeforeCloseness = authoritativeCandidates.find(candidate =>
    hasExplicitRepairBeforeClosenessAuthority(candidate),
  )
  const authoritativeRestProtective = authoritativeCandidates.find(candidate =>
    /rest-protective|rest protective|rest protection|rest-guard|quiet-companionship|quiet companionship|fatigue-aware|protect rest|protecting rest|late-night-drain|line holds inward|holds inward|quietly inward|休息保护|先收住|先往内收|别把身体再往外推/iu.test(candidate ?? ''),
  )

  if (authoritativeRestProtective && !authoritativeRepairBeforeCloseness)
    return 'rest-protective' as const
  if (authoritativeRepairBeforeCloseness && !authoritativeRestProtective)
    return 'repair-before-closeness' as const

  const ambientAuthority = [
    input.projectContinuityCue ?? null,
    input.privateThoughtText ?? null,
  ].filter(Boolean).join(' | ')
  const ambientRepairBeforeCloseness = hasExplicitRepairBeforeClosenessAuthority(ambientAuthority)
  const ambientRestProtective = /rest-protective|rest protective|rest protection|rest-guard|quiet-companionship|quiet companionship|fatigue-aware|protect rest|protecting rest|late-night-drain|line holds inward|holds inward|quietly inward|休息保护|先收住|先往内收|别把身体再往外推/iu.test(ambientAuthority)
  if (input.currentContinuityRestraint === 'repair-before-closeness' && ambientRestProtective && !ambientRepairBeforeCloseness)
    return 'rest-protective'
  if (!input.currentContinuityRestraint) {
    if (ambientRepairBeforeCloseness && !ambientRestProtective)
      return 'repair-before-closeness'
    if (ambientRestProtective && !ambientRepairBeforeCloseness)
      return 'rest-protective'
  }

  return input.currentContinuityRestraint
}

export function buildPresenceOnlyHoldProjectStateSameHerCarryTag(input: {
  visibleReplySameHerInwardCarry?: string | null
  projectState?: {
    sameHerSelfLine?: string | null
    nextClosureTarget?: string | null
    emotionalClosureCue?: string | null
    emotionalClosureSummary?: string | null
    sameHerHoldDetail?: string | null
    preDialogueAwarenessLine?: string | null
  } | null
  persistedInitiative?: {
    continuityRestraint?: 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'lower-pressure' | null
    preferredStyle?: string | null
  } | null
}) {
  if (typeof input.visibleReplySameHerInwardCarry === 'string' && input.visibleReplySameHerInwardCarry.trim())
    return 'same-her-inward-carry'

  const continuityRestraint = input.persistedInitiative?.continuityRestraint ?? null
  const preferredStyle = String(input.persistedInitiative?.preferredStyle ?? '').trim().toLowerCase()
  if (
    continuityRestraint !== 'measured-return'
    && continuityRestraint !== 'repair-before-closeness'
    && continuityRestraint !== 'rest-protective'
    && preferredStyle !== 'silent-observe'
  ) {
    return ''
  }

  const merged = [
    String(input.projectState?.sameHerSelfLine ?? '').trim(),
    String(input.projectState?.nextClosureTarget ?? '').trim(),
    String(input.projectState?.emotionalClosureCue ?? '').trim(),
    String(input.projectState?.emotionalClosureSummary ?? '').trim(),
    String(input.projectState?.sameHerHoldDetail ?? '').trim(),
    String(input.projectState?.preDialogueAwarenessLine ?? '').trim(),
  ].filter(Boolean).join(' ').toLowerCase()
  if (!merged)
    return ''

  const hasSameHerIdentity = /same phase 1 digital life|same digital life|same-her|same her|one living her|continuous her|one continuous her|continuity_identity|identity=runtime_personhood|同一个她|同一个 her/u.test(merged)
  const hasLivingLineClosure = /same living line|without reopening from scratch|reopen_from_scratch=false|continuity_hold=|repair-before-closeness|repair before closeness|repair first|callback repair seam|rest_protective|measured_return|relationship_cadence=remembered_boundary|同一条线|同一生命线|接回去|继续沿着这条线|回线/u.test(merged)

  const hasStructuredContinuityRestraint
    = continuityRestraint === 'measured-return'
      || continuityRestraint === 'repair-before-closeness'
      || continuityRestraint === 'rest-protective'

  return (hasSameHerIdentity || hasStructuredContinuityRestraint) && hasLivingLineClosure ? 'same-her-inward-carry' : ''
}

export function buildDeferredAutonomyContinuitySignalFallback(input: {
  now: number
  turnId: string
  scenario: string
  reason: string
  projectState?: {
    preflightSummary?: string | null
    preDialogueAwarenessLine?: string | null
    companionHeadlineLine?: string | null
    emotionalClosureCue?: string | null
    emotionalClosureSummary?: string | null
    identity?: string | null
    currentPhase?: string | null
    primaryOpenLoop?: string | null
    nextClosureTarget?: string | null
    sameHerSelfLine?: string | null
    sameHerDriftRisk?: string | null
    sameHerHoldDetail?: string | null
  } | null
  autonomy?: {
    deferReason?: string | null
    whyNow?: string | null
    sourceThreadId?: string | null
    sourceThoughtThreadId?: string | null
    sourceConcernId?: string | null
    executionIntent?: {
      kind?: string | null
      summary?: string | null
      targetThreadId?: string | null
    } | null
  } | null
}) {
  const projectState = input.projectState ?? null
  const scenario = String(input.scenario ?? '').trim() || 'general'
  const turnId = String(input.turnId ?? '').trim()
  const reason = String(input.reason ?? '').trim()
  const executionIntentKind = String(input.autonomy?.executionIntent?.kind ?? '').trim()
  const executionIntentSummary = String(input.autonomy?.executionIntent?.summary ?? '').trim()
  const deferReason = String(input.autonomy?.deferReason ?? '').trim()
  const whyNow = String(input.autonomy?.whyNow ?? '').trim()
  const sourceThreadId = String(input.autonomy?.sourceThreadId ?? '').trim()
  const sourceThoughtThreadId = String(input.autonomy?.sourceThoughtThreadId ?? '').trim()
  const sourceConcernId = String(input.autonomy?.sourceConcernId ?? '').trim()
  const targetThreadId = String(input.autonomy?.executionIntent?.targetThreadId ?? '').trim()
  const hasHeldAutonomyThreadAnchor = Boolean(sourceThoughtThreadId)
    || Boolean(sourceConcernId)
  const explicitHeldAutonomyIntent = Boolean(executionIntentKind)
    || Boolean(executionIntentSummary)
    || hasHeldAutonomyThreadAnchor
  const visibleUtteranceWasDeferred
    = reason === 'proactive-visible-presence-without-utterance'
      || reason === 'provider-mind-unavailable-for-proactive-visible-utterance'
  const shouldUseDeferredProactiveLine
    = visibleUtteranceWasDeferred
      && (
        !explicitHeldAutonomyIntent
        || executionIntentKind === 'repair'
      )
  const canonicalProjectState = resolveAlicizationProjectStateBrief()
  const normalizedProjectState = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: projectState as Record<string, unknown>,
    fallbackProjectState: {
      identity: canonicalProjectState.identity,
      currentPhase: canonicalProjectState.currentPhase,
      preflightSummary: canonicalProjectState.preflightSummary ?? null,
      preDialogueAwarenessLine: canonicalProjectState.preDialogueAwarenessLine ?? null,
      latestLandedProgress:
        canonicalProjectState.continuityProgressSummary
        ?? canonicalProjectState.memoryAnthropomorphismProgress.at(-1)
        ?? null,
      primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
      nextClosureTarget: canonicalProjectState.nextClosureTarget,
      sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
      sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
      emotionalClosureCue: canonicalProjectState.emotionalClosureCue ?? null,
      emotionalClosureSummary: canonicalProjectState.emotionalClosureSummary ?? null,
      sameHerHoldDetail: canonicalProjectState.sameHerHoldDetail ?? null,
    },
  })
  const projectStatePreflightSummary = String(normalizedProjectState.preflightSummary ?? projectState?.preflightSummary ?? '').trim() || null
  const preferredProjectStatePreDialogueAwarenessLine = String(normalizedProjectState.preDialogueAwarenessLine ?? projectState?.preDialogueAwarenessLine ?? '').trim() || null
  const projectStatePreDialogueAwarenessLine = (
    isAlicizationThinProjectAwarenessLine(preferredProjectStatePreDialogueAwarenessLine)
    || looksLikeBroadProjectStateSameHerHoldDetail(preferredProjectStatePreDialogueAwarenessLine)
      ? null
      : preferredProjectStatePreDialogueAwarenessLine
  ) ?? canonicalProjectState.preDialogueAwarenessLine ?? null
  const preferredProjectStateCompanionHeadlineLine = String(normalizedProjectState.companionHeadlineLine ?? projectState?.companionHeadlineLine ?? '').trim() || null
  const projectStateCompanionHeadlineLine = (
    isAlicizationThinProjectAwarenessLine(preferredProjectStateCompanionHeadlineLine)
      ? null
      : preferredProjectStateCompanionHeadlineLine
  ) ?? null
  const projectStateEmotionalClosureCue = preferPresenceOnlyMetadataAuthority([
    projectState?.emotionalClosureCue ?? null,
    normalizedProjectState.emotionalClosureCue ?? null,
  ])
  const projectStateEmotionalClosureSummary = preferPresenceOnlyMetadataAuthority([
    projectState?.emotionalClosureSummary ?? null,
    projectState?.emotionalClosureCue ?? null,
    normalizedProjectState.emotionalClosureSummary ?? null,
    normalizedProjectState.emotionalClosureCue ?? null,
  ])
  const rawProjectIdentity = String(projectState?.identity ?? normalizedProjectState.identity ?? '').trim() || null
  const rawProjectPhase = String(projectState?.currentPhase ?? normalizedProjectState.currentPhase ?? '').trim() || null
  const rawProjectPrimaryOpenLoop = String(projectState?.primaryOpenLoop ?? normalizedProjectState.primaryOpenLoop ?? '').trim() || null
  const rawProjectNextClosureTarget = String(projectState?.nextClosureTarget ?? normalizedProjectState.nextClosureTarget ?? '').trim() || null
  const projectIdentity = (() => {
    const normalized = rawProjectIdentity?.toLowerCase() ?? ''
    if (!normalized || normalized === 'project' || normalized === 'digital life' || normalized === 'same digital life')
      return canonicalProjectState.identity
    return rawProjectIdentity
  })()
  const projectPhase = (() => {
    const normalized = rawProjectPhase?.toLowerCase() ?? ''
    if (!normalized || normalized === 'phase 1' || normalized === 'phase 1: local digital life')
      return canonicalProjectState.currentPhase
    return rawProjectPhase
  })()
  const projectPrimaryOpenLoop = (() => {
    const normalized = rawProjectPrimaryOpenLoop?.toLowerCase() ?? ''
    if (!normalized || normalized === 'open closure' || normalized === 'open loop' || normalized === 'closure')
      return canonicalProjectState.openLoops[0] ?? null
    return preferPresenceOnlyMetadataAuthority([
      rawProjectPrimaryOpenLoop,
      canonicalProjectState.openLoops[0] ?? null,
    ])
  })()
  const projectNextClosureTarget = (() => {
    if (looksLikeThinProjectClosureShell(rawProjectNextClosureTarget, 'next'))
      return canonicalProjectState.nextClosureTarget
    return preferPresenceOnlyMetadataAuthority([
      rawProjectNextClosureTarget,
      canonicalProjectState.nextClosureTarget,
    ])
  })()
  const preferredProjectStateSameHerAuthorityLine = String(normalizedProjectState.sameHerSelfLine ?? projectState?.sameHerSelfLine ?? '').trim() || null
  const projectStateSameHerAuthorityLine = (
    isAlicizationThinProjectAwarenessLine(preferredProjectStateSameHerAuthorityLine)
      ? null
      : preferredProjectStateSameHerAuthorityLine
  ) ?? canonicalProjectState.sameHerSelfLine ?? null
  // Deferred fallback metadata keeps the stable Phase 1 same-her baseline,
  // while richer initiative-specific closure detail stays in cue/summary slots.
  const projectStateSameHerSelfLine = canonicalProjectState.sameHerSelfLine ?? null
  const projectStateSameHerDriftRisk = preferPresenceOnlyMetadataAuthority([
    projectState?.sameHerDriftRisk ?? null,
    normalizedProjectState.sameHerDriftRisk ?? null,
    canonicalProjectState.sameHerDriftRisk,
  ])
  const projectStateSameHerHoldDetail = preferPresenceOnlyMetadataAuthority([
    projectState?.sameHerHoldDetail ?? null,
    normalizedProjectState.sameHerHoldDetail ?? null,
  ])
  const crossModalSameHerProjectAuthorityCandidates = [
    projectStateCompanionHeadlineLine,
    projectStatePreDialogueAwarenessLine,
    projectStateEmotionalClosureSummary,
    projectStateEmotionalClosureCue,
    projectStateSameHerHoldDetail,
    projectNextClosureTarget,
    projectPrimaryOpenLoop,
    projectStateSameHerAuthorityLine,
  ].filter(candidate => hasPresenceOnlyCrossModalSameHerAuthority(candidate))
  const crossModalSameHerProjectAuthority = crossModalSameHerProjectAuthorityCandidates.reduce<string | null>((best, candidate) => {
    if (!candidate)
      return best
    if (!best)
      return candidate

    const bestScore = scorePresenceOnlyCrossModalSameHerAuthority(best)
    const candidateScore = scorePresenceOnlyCrossModalSameHerAuthority(candidate)
    if (candidateScore !== bestScore)
      return candidateScore > bestScore ? candidate : best

    if (candidate.length > best.length + 16)
      return candidate

    return best
  }, null)
  const repairBeforeClosenessProjectAuthority = [
    projectStateEmotionalClosureSummary,
    projectStateSameHerHoldDetail,
    projectStateEmotionalClosureCue,
    projectNextClosureTarget,
    projectStateSameHerDriftRisk,
    projectStateSameHerAuthorityLine,
    looksLikeBroadProjectStateAwarenessExpansion(projectStatePreDialogueAwarenessLine)
      ? null
      : projectStatePreDialogueAwarenessLine,
  ].find(candidate => hasExplicitRepairBeforeClosenessAuthority(candidate))
  ?? null
  const repairBeforeClosenessSummaryLead = repairBeforeClosenessProjectAuthority
    ? /same living line|one living her|same line|same-her|同一条线|同一生命线/u.test(repairBeforeClosenessProjectAuthority)
      ? repairBeforeClosenessProjectAuthority
      : `${repairBeforeClosenessProjectAuthority}; continuity_mode=repair_before_closeness; widening=deferred`
    : null
  const restProtectiveProjectAuthority = [
    projectStateSameHerHoldDetail,
    projectStateEmotionalClosureSummary,
    projectStateEmotionalClosureCue,
    projectNextClosureTarget,
    projectStateSameHerDriftRisk,
    projectStateSameHerAuthorityLine,
    looksLikeBroadProjectStateAwarenessExpansion(projectStatePreDialogueAwarenessLine)
      ? null
      : projectStatePreDialogueAwarenessLine,
  ].find(candidate => /rest-protective|rest protective|rest protection|quiet-companionship|quiet companionship|fatigue-aware|continuity_hold=rest_protective|continuity_mode=rest_protective|fatigue_aware=true|protect rest|protecting rest|late-night-drain|line holds inward|holds inward|quietly inward|休息保护|先往内收/u.test(candidate ?? ''))
  ?? null
  const restProtectiveLineAuthority = [
    projectNextClosureTarget,
    projectStateSameHerAuthorityLine,
    projectStatePreDialogueAwarenessLine,
    projectStateEmotionalClosureSummary,
    projectStateEmotionalClosureCue,
  ].find(candidate => /same living line|one living her|same line|same-her|同一条线|同一生命线/u.test(candidate ?? ''))
  ?? null
  const restProtectiveSummaryLead = restProtectiveProjectAuthority
    ? (() => {
        const base = /rest-protective|rest protective|rest protection|quiet-companionship|quiet companionship|fatigue-aware|continuity_hold=rest_protective|continuity_mode=rest_protective|fatigue_aware=true/u.test(restProtectiveProjectAuthority)
          ? restProtectiveProjectAuthority
          : `${restProtectiveProjectAuthority}; continuity_mode=rest_protective; fatigue_aware=true`

        if (/same living line|same line|同一条线|同一生命线/u.test(base))
          return base

        return appendPresenceOnlyHoldCarryText(
          base,
          restProtectiveLineAuthority ?? 'continuity_mode=rest_protective; until=rest_protection_settles',
          420,
        )
      })()
    : null
  const rememberedSeamMoreRoomProjectAuthority = [
    projectStateSameHerHoldDetail,
    projectStateEmotionalClosureSummary,
    projectStateEmotionalClosureCue,
    projectNextClosureTarget,
    projectStateSameHerDriftRisk,
    looksLikeBroadProjectStateAwarenessExpansion(projectStatePreDialogueAwarenessLine)
      ? null
      : projectStatePreDialogueAwarenessLine,
    projectStateSameHerAuthorityLine,
  ].find(candidate => hasRememberedSeamMoreRoomCarry(candidate))
  ?? null
  const rememberedSeamMoreRoomSummaryLead = rememberedSeamMoreRoomProjectAuthority
    ? hasRememberedSeamMoreRoomCarry(projectStateSameHerHoldDetail)
      ? projectStateSameHerHoldDetail
      : rememberedSeamMoreRoomProjectAuthority
    : null
  const crossModalSameHerSummaryLead = crossModalSameHerProjectAuthority
    ? /cross-modal same-her proof|cross-modal same-her closure|visible reply|voice|face|motion|lipsync|resident presence/u.test(crossModalSameHerProjectAuthority)
      ? crossModalSameHerProjectAuthority
      : `${crossModalSameHerProjectAuthority} continuity_context=deferred-return; closure=cross-modal; cover=visible_reply,voice,face,motion,lipsync,resident_presence.`
    : null
  const sameHerDriftRiskSummaryLead = projectStateSameHerDriftRisk
    && /same-her|same her|generic assistant shell|project-summary voice|generic project guidance|detached project|continuity drift|closure drift/u.test(projectStateSameHerDriftRisk)
    ? projectStateSameHerDriftRisk
    : null
  const deferredSummaryAuthority = preferPresenceOnlyDeferredSummaryAuthority([
    repairBeforeClosenessSummaryLead,
    restProtectiveSummaryLead,
    rememberedSeamMoreRoomSummaryLead,
    sameHerDriftRiskSummaryLead,
    crossModalSameHerSummaryLead,
    whyNow,
    executionIntentSummary,
  ])
  const deferredWhyNow = normalizePresenceOnlyHoldMetadataText(whyNow, 560)
  const deferredExecutionIntentSummary = normalizePresenceOnlyHoldMetadataText(executionIntentSummary, 560)
  const deferredProjectStatePreflightSummary = normalizePresenceOnlyHoldMetadataText(projectStatePreflightSummary, 560)
  const deferredProjectStatePreDialogueAwarenessLine = normalizePresenceOnlyHoldMetadataText(projectStatePreDialogueAwarenessLine, 560)
  const deferredProjectStateCompanionHeadlineLine = normalizePresenceOnlyHoldMetadataText(projectStateCompanionHeadlineLine, 560)
  const deferredProjectStateEmotionalClosureCue = normalizePresenceOnlyHoldMetadataText(projectStateEmotionalClosureCue, 560)
  const deferredProjectStateEmotionalClosureSummary = normalizePresenceOnlyHoldMetadataText(projectStateEmotionalClosureSummary, 560)
  const deferredProjectIdentity = normalizePresenceOnlyHoldMetadataText(projectIdentity, 360)
  const deferredProjectPhase = normalizePresenceOnlyHoldMetadataText(projectPhase, 360)
  const deferredProjectPrimaryOpenLoop = normalizePresenceOnlyHoldMetadataText(projectPrimaryOpenLoop, 560)
  const deferredProjectNextClosureTarget = normalizePresenceOnlyHoldMetadataText(projectNextClosureTarget, 560)
  const deferredProjectStateSameHerSelfLine = normalizePresenceOnlyHoldMetadataText(projectStateSameHerSelfLine, 560)
  const deferredProjectStateSameHerDriftRisk = normalizePresenceOnlyHoldMetadataText(projectStateSameHerDriftRisk, 560)
  const deferredProjectStateSameHerHoldDetail = normalizePresenceOnlyHoldMetadataText(projectStateSameHerHoldDetail, 560)

  if (shouldUseDeferredProactiveLine) {
    return {
      kind: 'proactive',
      state: 'pending',
      label: `proactive:${scenario}:deferred`,
      summary: [
        'no mind-authored visible reply was available',
        reason ? `reason=${reason}` : '',
        deferredSummaryAuthority,
        deferredProjectNextClosureTarget ? `next=${deferredProjectNextClosureTarget}` : '',
        deferredProjectPhase ? `phase=${deferredProjectPhase}` : '',
        deferredProjectPrimaryOpenLoop ? `unresolved=${deferredProjectPrimaryOpenLoop}` : '',
        sourceThreadId ? `thread=${sourceThreadId}` : '',
        `scenario=${scenario}`,
      ].filter(Boolean).join(' | '),
      signature: [
        'proactive-deferred',
        turnId || 'turn',
        sourceThreadId || targetThreadId || 'global',
        scenario,
      ].join(':'),
      createdAt: input.now,
      metadata: {
        source: 'proactive-deferred',
        turnId: turnId || null,
        scenario,
        reason: reason || null,
        deferReason: deferReason || null,
        whyNow: deferredWhyNow,
        sourceThreadId: sourceThreadId || null,
        sourceThoughtThreadId: sourceThoughtThreadId || null,
        sourceConcernId: sourceConcernId || null,
        executionIntentKind: null,
        executionIntentSummary: deferredExecutionIntentSummary,
        targetThreadId: targetThreadId || null,
        projectStatePreflightSummary: deferredProjectStatePreflightSummary,
        projectStatePreDialogueAwarenessLine: deferredProjectStatePreDialogueAwarenessLine,
        projectStateCompanionHeadlineLine: deferredProjectStateCompanionHeadlineLine,
        projectStateEmotionalClosureCue: deferredProjectStateEmotionalClosureCue,
        projectStateEmotionalClosureSummary: deferredProjectStateEmotionalClosureSummary,
        projectIdentity: deferredProjectIdentity,
        projectPhase: deferredProjectPhase,
        projectPrimaryOpenLoop: deferredProjectPrimaryOpenLoop,
        projectNextClosureTarget: deferredProjectNextClosureTarget,
        projectStateSameHerSelfLine: deferredProjectStateSameHerSelfLine,
        projectStateSameHerDriftRisk: deferredProjectStateSameHerDriftRisk,
        projectStateSameHerHoldDetail: deferredProjectStateSameHerHoldDetail,
      },
    }
  }

  return {
    kind: 'proactive',
    state: 'observed',
    label: `proactive:${executionIntentKind || scenario}:held-autonomy`,
    summary: [
      deferredSummaryAuthority || deferredExecutionIntentSummary || deferredWhyNow || 'proactive_state=held_for_opening',
      executionIntentKind ? `intent=${executionIntentKind}` : '',
      deferReason ? `defer=${deferReason}` : '',
      reason ? `reason=${reason}` : '',
      sourceThreadId ? `thread=${sourceThreadId}` : '',
      `scenario=${scenario}`,
    ].filter(Boolean).join(' | '),
    signature: [
      'proactive-held-autonomy',
      turnId || 'turn',
      sourceThreadId || targetThreadId || 'global',
      executionIntentKind || scenario,
    ].join(':'),
    createdAt: input.now,
    metadata: {
      source: 'proactive-held-autonomy',
      turnId: turnId || null,
      scenario,
      reason: reason || null,
      deferReason: deferReason || null,
      whyNow: deferredWhyNow,
      sourceThreadId: sourceThreadId || null,
      sourceThoughtThreadId: sourceThoughtThreadId || null,
      sourceConcernId: sourceConcernId || null,
      executionIntentKind: executionIntentKind || null,
      executionIntentSummary: deferredExecutionIntentSummary,
      targetThreadId: targetThreadId || null,
      projectStatePreflightSummary: deferredProjectStatePreflightSummary,
      projectStatePreDialogueAwarenessLine: deferredProjectStatePreDialogueAwarenessLine,
      projectStateCompanionHeadlineLine: deferredProjectStateCompanionHeadlineLine,
      projectStateEmotionalClosureCue: deferredProjectStateEmotionalClosureCue,
      projectStateEmotionalClosureSummary: deferredProjectStateEmotionalClosureSummary,
      projectIdentity: deferredProjectIdentity,
      projectPhase: deferredProjectPhase,
      projectPrimaryOpenLoop: deferredProjectPrimaryOpenLoop,
      projectNextClosureTarget: deferredProjectNextClosureTarget,
      projectStateSameHerSelfLine: deferredProjectStateSameHerSelfLine,
      projectStateSameHerDriftRisk: deferredProjectStateSameHerDriftRisk,
      projectStateSameHerHoldDetail: deferredProjectStateSameHerHoldDetail,
    },
  }
}

export function buildPresenceOnlyHoldCurrentConsciousFrame(input: {
  currentConsciousFrame: Record<string, any> | null | undefined
  continuityRestraint: 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'lower-pressure' | null
  holdDetail?: string | null
  projectStateCarry?: {
    sameHerSummary?: string | null
    sameHerDriftRisk?: string | null
    emotionalClosureSummary?: string | null
    continuityCue?: string | null
  } | null
}) {
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const frame = input.currentConsciousFrame && typeof input.currentConsciousFrame === 'object'
    ? input.currentConsciousFrame
    : null
  if (!frame)
    return frame

  if (
    input.continuityRestraint !== 'measured-return'
    && input.continuityRestraint !== 'repair-before-closeness'
    && input.continuityRestraint !== 'rest-protective'
    && input.continuityRestraint !== 'lower-pressure'
  ) {
    return frame
  }

  const reasonTags = Array.isArray(frame.reasonTags) ? frame.reasonTags.filter(tag => typeof tag === 'string') : []
  const safetyGateCarryText = [
    input.holdDetail,
    input.projectStateCarry?.continuityCue,
    input.projectStateCarry?.emotionalClosureSummary,
    frame.projectState?.sameHerHoldDetail,
    frame.projectState?.continuityCue,
  ]
    .map(item => String(item ?? '').trim())
    .filter(Boolean)
    .join(' | ')
  const carriesExecutionSafetyGateRestraint = /execution-safety-gate|blocked-dispatch-restraint|blocked dispatch safety gate|blocked-dispatch safety gate|blocked-before-dispatch|execution safety restraint|safety gate/iu.test(safetyGateCarryText)
    && /confirmation=required|implicit-or-explicit-confirmation-required|no-process-started|no process started|permission=none|wait for confirmation|等待确认/iu.test(safetyGateCarryText)
  const carriesExecutionResumeConfirmationBoundary = /execution-resume-confirmation|host-confirmed-before-redispatch|resume-before-dispatch|resume confirmation/iu.test(safetyGateCarryText)
    && /host-confirmed|approval=host-confirmed|process-not-yet-restarted|bounded confirmation boundary|not permanent|not permanent execution permission|not permanent autonomous permission/iu.test(safetyGateCarryText)
  const executionSafetyGateReasonTags = carriesExecutionSafetyGateRestraint
    ? [
        'execution-safety-gate:blocked-dispatch-restraint',
        'execution-safety-gate:confirmation-required',
        'execution-safety-gate:no-process-started',
      ]
    : []
  const executionResumeConfirmationReasonTags = carriesExecutionResumeConfirmationBoundary
    ? [
        'execution-resume-confirmation:host-confirmed',
        'execution-resume-confirmation:resume-before-dispatch',
        'execution-resume-confirmation:process-not-yet-restarted',
      ]
    : []
  const nextReasonTags = Array.from(new Set([
    ...reasonTags,
    ...executionSafetyGateReasonTags,
    ...executionResumeConfirmationReasonTags,
    'continuity-arc:same-thread-continuation',
    'continuity-timing:next-open-window',
    'embodiment-carry:silent-continuity',
    input.continuityRestraint === 'repair-before-closeness'
      ? 'embodiment-carry:repair-before-closeness'
      : input.continuityRestraint === 'rest-protective'
        ? 'embodiment-carry:rest-protective'
        : input.continuityRestraint === 'measured-return'
          ? 'embodiment-carry:measured-return'
          : '',
  ])).slice(0, 12)
  const projectState = frame.projectState && typeof frame.projectState === 'object'
    ? frame.projectState
    : {}
  const preferredProjectState = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: projectState as Record<string, unknown>,
    fallbackProjectState: projectStateBrief,
  })
  const rawCurrentPreDialogueAwarenessLine = String(projectState.preDialogueAwarenessLine ?? '').trim() || null
  const preferredPreDialogueAwarenessLine
    = (looksLikeSameHerClosureSummary(rawCurrentPreDialogueAwarenessLine)
      || looksLikeProjectAwarePreDialogueReminder(rawCurrentPreDialogueAwarenessLine))
      ? rawCurrentPreDialogueAwarenessLine
      : preferredProjectState.preDialogueAwarenessLine ?? projectStateBrief.preDialogueAwarenessLine ?? null
  const shouldBackfillCanonicalPreDialogueAwareness
    = !looksLikeProjectAwarePreDialogueReminder(preferredPreDialogueAwarenessLine)
      && (
        looksLikeSameHerClosureSummary(preferredPreDialogueAwarenessLine)
        || /^generic project continuity hold/iu.test(String(preferredPreDialogueAwarenessLine ?? '').trim())
      )
  const mergedPreDialogueAwarenessLine
    = shouldBackfillCanonicalPreDialogueAwareness
      && projectStateBrief.preDialogueAwarenessLine
      ? projectStateBrief.preDialogueAwarenessLine.includes(preferredPreDialogueAwarenessLine ?? '')
        ? projectStateBrief.preDialogueAwarenessLine
        : `${projectStateBrief.preDialogueAwarenessLine} ${preferredPreDialogueAwarenessLine}`.trim()
      : preferredPreDialogueAwarenessLine
  const resolvedPreDialogueAwarenessLine = normalizePresenceOnlyHoldCarryText(
    mergedPreDialogueAwarenessLine,
    900,
  ) || null
  const resolvedSameHerSelfLine = normalizePresenceOnlyHoldCarryText(
    input.projectStateCarry?.sameHerSummary
    ?? preferPresenceOnlyHoldSameHerSelfLine({
      current: projectState.sameHerSelfLine,
      candidate: preferredProjectState.sameHerSelfLine ?? projectStateBrief.sameHerSelfLine,
    })
    ?? projectStateBrief.sameHerSelfLine,
    320,
  )
  const resolvedSameHerDriftRisk = preferPresenceOnlyHoldSameHerDriftRisk({
    current:
      projectState.sameHerDriftRisk
      ?? preferredProjectState.sameHerDriftRisk
      ?? projectStateBrief.sameHerDriftRisk,
    candidate:
      input.projectStateCarry?.sameHerDriftRisk
      ?? (
        /generic assistant shell|generic helper shell|generic helper voice|project-summary voice|same-her drift/u.test(
          normalizePresenceOnlyHoldCarryText(input.projectStateCarry?.continuityCue, 320).toLowerCase(),
        )
          ? input.projectStateCarry?.continuityCue
          : null
      ),
  })
  const resolvedPrimaryOpenLoop = normalizePresenceOnlyHoldCarryText(
    preferredProjectState.primaryOpenLoop
    ?? projectStateBrief.openLoops[0]
    ?? null,
    420,
  )
  const resolvedNextClosureTarget = normalizePresenceOnlyHoldCarryText(
    preferredProjectState.nextClosureTarget
    ?? projectStateBrief.nextClosureTarget
    ?? null,
    420,
  )
  const resolvedEmotionalClosureSummary = normalizePresenceOnlyHoldCarryText(
    input.projectStateCarry?.emotionalClosureSummary
    ?? projectState.emotionalClosureCue
    ?? projectState.emotionalClosureSummary
    ?? preferredProjectState.emotionalClosureSummary
    ?? preferredProjectState.emotionalClosureCue
    ?? projectStateBrief.emotionalClosureCue
    ?? null,
    320,
  )
  const resolvedSameHerHoldDetail = normalizePresenceOnlyHoldCarryText(
    resolvePresenceOnlyHoldSameHerHoldDetail({
      current:
        carriesExecutionSafetyGateRestraint || carriesExecutionResumeConfirmationBoundary
          ? null
          : projectState.sameHerHoldDetail,
      candidate:
        input.holdDetail
        ?? (input.continuityRestraint === 'repair-before-closeness'
          ? 'continuity_hold=repair_before_closeness; timing=before_closeness_widens'
          : input.continuityRestraint === 'rest-protective'
            ? 'continuity_hold=rest_protective; timing=fatigue_aware'
            : 'continuity_hold=measured_return; pressure=lower'),
      continuityCue: input.projectStateCarry?.continuityCue,
      continuityRestraint: input.continuityRestraint,
    }),
    320,
  )
  const synthesizedConsciousNeed
    = input.continuityRestraint === 'repair-before-closeness'
      ? 'continuity_mode=repair_before_closeness; until=repair_settles; lanes=emotion+memory+initiative+embodiment'
      : input.continuityRestraint === 'rest-protective'
        ? 'continuity_mode=rest_protective; direction=inward; lanes=emotion+memory+initiative+embodiment'
        : 'continuity_mode=measured_return; pressure=lower; lanes=emotion+memory+initiative+embodiment'
  const synthesizedSpeakingIntention
    = input.continuityRestraint === 'repair-before-closeness'
      ? 'reply_context=current; continuity_mode=repair_before_closeness; reopen_from_scratch=false; lanes=emotion+memory+initiative+embodiment'
      : input.continuityRestraint === 'rest-protective'
        ? 'reply_context=current; continuity_mode=rest_protective; direction=inward; lanes=emotion+memory+initiative+embodiment'
        : 'reply_context=current; continuity_mode=measured_return; pressure=lower; lanes=emotion+memory+initiative+embodiment'
  const normalizedFrameConsciousNeed = normalizePresenceOnlyHoldCarryText(frame.consciousNeed, 520)
  const nextConsciousNeed = hasPresenceOnlyHoldSameHerProjectCue(normalizedFrameConsciousNeed)
    ? normalizedFrameConsciousNeed
    : appendPresenceOnlyHoldCarryText(
        appendPresenceOnlyHoldCarryText(normalizedFrameConsciousNeed, synthesizedConsciousNeed, 520),
        resolvedPrimaryOpenLoop || resolvedNextClosureTarget || resolvedEmotionalClosureSummary,
        520,
      )
  const normalizedFrameSpeakingIntention = normalizePresenceOnlyHoldCarryText(frame.speakingIntention, 520)
  const nextSpeakingIntention = hasPresenceOnlyHoldSameHerProjectCue(normalizedFrameSpeakingIntention)
    ? normalizedFrameSpeakingIntention
    : appendPresenceOnlyHoldCarryText(
        appendPresenceOnlyHoldCarryText(
          appendPresenceOnlyHoldCarryText(normalizedFrameSpeakingIntention, synthesizedSpeakingIntention, 520),
          resolvedSameHerHoldDetail || resolvedSameHerSelfLine,
          520,
        ),
        carriesExecutionSafetyGateRestraint || carriesExecutionResumeConfirmationBoundary ? resolvedSameHerHoldDetail : null,
        520,
      )

  return {
    ...frame,
    consciousNeed: nextConsciousNeed || normalizedFrameConsciousNeed || frame.consciousNeed,
    speakingIntention: nextSpeakingIntention || normalizedFrameSpeakingIntention || frame.speakingIntention,
    reasonTags: nextReasonTags,
    projectState: {
      ...projectState,
      preflightSummary: preferredProjectState.preflightSummary ?? projectStateBrief.preflightSummary ?? null,
      preDialogueAwarenessLine: resolvedPreDialogueAwarenessLine,
      identity: preferredProjectState.identity ?? projectStateBrief.identity,
      currentPhase: preferredProjectState.currentPhase ?? projectStateBrief.currentPhase,
      latestLandedProgress: preferredProjectState.latestLandedProgress ?? projectStateBrief.continuityProgressSummary ?? projectStateBrief.memoryAnthropomorphismProgress.at(-1) ?? null,
      primaryOpenLoop: preferredProjectState.primaryOpenLoop ?? projectStateBrief.openLoops[0] ?? null,
      nextClosureTarget: preferredProjectState.nextClosureTarget ?? projectStateBrief.nextClosureTarget,
      sameHerSelfLine: resolvedSameHerSelfLine || null,
      sameHerDriftRisk: resolvedSameHerDriftRisk || projectStateBrief.sameHerDriftRisk,
      emotionalClosureCue:
        resolvedEmotionalClosureSummary
        || input.projectStateCarry?.emotionalClosureSummary
        || projectState.emotionalClosureCue
        || preferredProjectState.emotionalClosureCue
        || projectStateBrief.emotionalClosureCue
        || null,
      emotionalClosureSummary:
        resolvedEmotionalClosureSummary
        || input.projectStateCarry?.emotionalClosureSummary
        || projectState.emotionalClosureSummary
        || preferredProjectState.emotionalClosureSummary
        || null,
      continuityCue:
        normalizePresenceOnlyHoldCarryText(
          input.projectStateCarry?.continuityCue
          ?? projectState.continuityCue
          ?? preferredProjectState.continuityCue
          ?? null,
          320,
        ) || null,
      continuityArcStage: 'same-thread-continuation',
      continuityPreferredTiming: 'next-open-window',
      sameHerHoldDetail: resolvedSameHerHoldDetail || null,
      continuityCadence:
        projectState.continuityCadence
        ?? (input.continuityRestraint === 'repair-before-closeness'
          ? 'repair-before-closeness'
          : input.continuityRestraint === 'rest-protective'
            ? 'rest-protective'
            : 'measured-return'),
    },
  }
}

export function rebuildPresenceOnlyPersistedEmotionalKernel(input: {
  initiative?: Record<string, any> | null
  privateThought?: PresenceOnlyPersistedEmotionalKernelInput['privateThought']
  selfState?: PresenceOnlyPersistedEmotionalKernelInput['selfState']
  affectiveResidue?: PresenceOnlyPersistedEmotionalKernelInput['affectiveResidue']
  personStateProjection?: PresenceOnlyPersistedEmotionalKernelInput['personStateProjection'] | PresenceOnlyProjection | null
  selfEvolution?: PresenceOnlyPersistedEmotionalKernelInput['selfEvolution']
  projectState?: PresenceOnlyPersistedEmotionalKernelInput['projectState']
  derivedMindStateBundle?: Record<string, any> | null
  fallbackEmotionalKernel?: Record<string, any> | null
}) {
  const continuityRestraint = input.initiative?.continuityRestraint as 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'lower-pressure' | null | undefined
  if (
    !input.initiative
    || input.initiative.shouldSpeak !== false
    || input.initiative.preferredStyle !== 'silent-observe'
    || (
      continuityRestraint !== 'measured-return'
      && continuityRestraint !== 'repair-before-closeness'
      && continuityRestraint !== 'rest-protective'
    )
  ) {
    return input.fallbackEmotionalKernel ?? null
  }

  const rebuiltKernel = buildAlicizationEmotionalKernel({
    selfState: input.selfState ?? null,
    privateThought: input.privateThought ?? null,
    affectiveResidue: input.affectiveResidue ?? input.derivedMindStateBundle?.affectiveResidue ?? null,
    personStateProjection: (input.personStateProjection ?? null) as PresenceOnlyPersistedEmotionalKernelInput['personStateProjection'],
    recollectionIntent: readRecollectionIntentFromDerivedMindStateBundle(
      asDerivedMindStateBundleLike(input.derivedMindStateBundle ?? null),
    ),
    selfEvolution: input.selfEvolution ?? null,
    projectState: input.projectState ?? null,
  })

  if (continuityRestraint !== 'rest-protective')
    return rebuiltKernel

  return {
    ...rebuiltKernel,
    dominantEmotion: 'rest-protective-companionship',
    initiativeMode: 'observe',
    memoryRecallMode: 'rest-protective-presence',
    embodimentTone: 'rest-protective',
    reasonTags: Array.from(new Set([
      ...(Array.isArray(rebuiltKernel.reasonTags) ? rebuiltKernel.reasonTags : []),
      'rest-protective',
      'quiet-companionship',
    ])),
    why: 'Care is still present, but this presence-only hold is protecting rest first, so memory, initiative, and embodiment should stay quietly nearby on the same inward line.',
  }
}

export function createAlicizationSubconsciousTickRuntime(options: any) {
  const {
    getActiveCardId,
    getSoulSnapshot,
    getAlicizationDb,
    setProactiveLoopStateCache,
    setSubconsciousStateCache,
    clearForegroundProbeTimeoutStreakForPid,
    ensureSubconsciousState,
    ensureProactiveLoopState,
    openAgentTurn,
    buildMainGatewayAgentTurnId,
    processDueRemindersForCurrentCard,
    processDueLearningActionsForCurrentCard,
    settleExpiredPendingProactiveOutcomes,
    getSensorySnapshot,
    ensurePerceptionState,
    sampleSubconsciousInterruptionContext,
    resolveForegroundDecisionTarget,
    getActiveAttentionAnchor,
    rememberPerceptionObservation,
    ensureVisualPresenceState,
    clampNeed,
    bootstrap,
    isAlicizationKillSwitchSuspended,
    getAlicizationCardKillSwitchState,
    updateLateNightActivityState,
    isLateNightWindow,
    resolveProactiveScreenSemanticSummary,
    isResidueBackedScreenSemanticSummary,
    buildProactiveLayeredContext,
    buildProactivePerceptionSignals,
    progressProactiveCadenceState,
    inferScenarioFromContext,
    consumeDurabilityPulse,
    probeForegroundPidLiveness,
    updateForegroundProbeTimeoutStreak,
    getActivePerceptionSceneResidue,
    shouldUsePerceptionResidueAsLiveSceneSummary,
    deriveRuntimeCaptureGovernance,
    buildVisualHeartbeat,
    updateVisualAttentionModel,
    buildDigitalLifeMindState,
    commitAlicizationDigitalLifeSpine,
    updateVisualPresenceState,
    bodyKernel,
    persistVisualPresenceState,
    visualPresenceCapturePersistDebounceWindowMs,
    buildVisualPresenceCapturePersistFingerprint,
    buildMindContinuityFragment,
    appendAuditLog,
    errorMessageFrom,
    buildReflectionLedgerFragment,
    buildVisualSedimentFragment,
    processPendingExecutionDeliveriesForCurrentCard,
    deriveAlicizationRuntimeSnapshot,
    deriveAlicizationAgentRuntimeTelemetryFromSession,
    evaluateProactivePolicy,
    emitVisualPresencePulse,
    buildPresencePulsePayload,
    buildAgentRuntimeAuditSnapshot,
    queueSoulMutation,
    parseSoul,
    clamp01,
    syncPersonalityBaselineInBody,
    snapshotFromContent,
    toSoulContent,
    normalizeCustomDirectives,
    buildProactiveRecallSeed,
    buildVisualRecallSeed,
    buildMindContinuityRecallSeed,
    listHumanlikeMemoryRecallEvents,
    getOrganicMemorySnapshot,
    resolveOrganicMemoryPromptContext,
    generateProactiveStructuredWithGateway,
    buildProactiveStructured,
    getPerformanceManifest,
    clampAlicizationPerformancePayloadToManifest,
    appendConversationTurnWithGuards,
    syncAgentTurnSessionMirror,
    buildDeferredAutonomyContinuitySignal,
    buildPendingProactiveContinuitySignal,
    ensureActiveOrLatestSessionId,
    resolveTaskPlanningCapabilities,
    scheduleAutonomyReminder,
    planAutonomyTaskThread,
    dispatchAutonomyTaskThread,
    workspaceRoot,
    buildDefaultDialoguePerformancePayload,
    buildProactiveMetadataFromDecision,
    alicizationSubconsciousPersistMs,
    persistProactiveLoopState,
    persistSubconsciousState,
    getActiveSelfRevisionStatePatch,
    generatePresenceExpression,
  } = options as any
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const projectStateSnapshot = resolveAlicizationProjectStateSnapshot({
    fallbackProjectState: projectStateBrief,
  })
  const projectStatePersistence = {
    preflightSummary: projectStateBrief.preflightSummary ?? null,
    preDialogueAwarenessLine: projectStateBrief.preDialogueAwarenessLine ?? null,
    awarenessLine: projectStateSnapshot.awarenessLine ?? projectStateBrief.preDialogueAwarenessLine ?? null,
    companionHeadlineLine: projectStateSnapshot.companionHeadlineLine ?? projectStateBrief.preDialogueAwarenessLine ?? null,
    emotionalClosureCue: projectStateBrief.emotionalClosureCue ?? null,
    identity: projectStateBrief.identity,
    currentPhase: projectStateBrief.currentPhase,
    latestLandedProgress: projectStateBrief.continuityProgressSummary ?? projectStateBrief.memoryAnthropomorphismProgress.at(-1) ?? null,
    primaryOpenLoop: projectStateBrief.openLoops[0] ?? null,
    openFocusSummary: deriveCompactProjectStateOpenFocusSummary(projectStateBrief.openLoops[0] ?? null),
    nextClosureTarget: projectStateBrief.nextClosureTarget,
    nextFocusSummary: deriveCompactProjectStateNextFocusSummary(projectStateBrief.nextClosureTarget),
    sameHerSelfLine: projectStateBrief.sameHerSelfLine,
    sameHerHoldDetail: projectStateBrief.sameHerHoldDetail ?? null,
    sameHerDriftRisk: projectStateBrief.sameHerDriftRisk,
  }

  function resolveDeferredAutonomyContinuitySignal(input: {
    now: number
    turnId: string
    scenario: string
    reason: string
    projectState?: Partial<typeof projectStatePersistence> | null
    autonomy?: {
      deferReason?: string | null
      whyNow?: string | null
      sourceThreadId?: string | null
      sourceThoughtThreadId?: string | null
      sourceConcernId?: string | null
      executionIntent?: {
        kind?: string | null
        summary?: string | null
        targetThreadId?: string | null
      } | null
    } | null
  }) {
    if (typeof buildDeferredAutonomyContinuitySignal === 'function') {
      return buildDeferredAutonomyContinuitySignal({
        ...input,
        projectState: {
          ...projectStatePersistence,
          ...input.projectState,
        },
      })
    }
    return buildDeferredAutonomyContinuitySignalFallback({
      ...input,
      projectState: {
        ...projectStatePersistence,
        ...input.projectState,
      },
    })
  }

  async function runSubconsciousTickForCurrentCard(trigger: 'timer' | 'force') {
    const activeCardId = getActiveCardId()
    const alicizationDb = getAlicizationDb()
    const state = await ensureSubconsciousState(activeCardId)
    let proactiveLoopState = await ensureProactiveLoopState(activeCardId)
    const now = Date.now()
    const backgroundAgentTurn = await openAgentTurn({
      cardId: activeCardId,
      turnId: buildMainGatewayAgentTurnId('subconscious-tick', trigger, activeCardId, now),
    })
    const reminderResult = await processDueRemindersForCurrentCard(trigger, backgroundAgentTurn)
    const learningResult = await processDueLearningActionsForCurrentCard(trigger)
    proactiveLoopState = await settleExpiredPendingProactiveOutcomes(activeCardId, now, `subconscious-tick:${trigger}`)
    const elapsedMinutes = Math.max(1 / 6, (now - state.lastTickAt) / 60_000)
    const sensorySnapshot = getSensorySnapshot()
    const cpuUsage = Number(sensorySnapshot?.sample?.cpu?.usagePercent ?? 0)
    let perceptionState = await ensurePerceptionState(activeCardId)
    const rawInterruptionContext = await sampleSubconsciousInterruptionContext()
    const resolvedForegroundWindow = resolveForegroundDecisionTarget({
      snapshotForeground: sensorySnapshot?.sample?.foregroundWindow,
      probedForeground: rawInterruptionContext.foregroundWindow,
      attentionAnchor: getActiveAttentionAnchor(perceptionState, now),
    })
    const interruptionContext = {
      ...rawInterruptionContext,
      foregroundWindow: resolvedForegroundWindow,
    }
    await rememberPerceptionObservation({
      cardId: activeCardId,
      now,
      target: resolvedForegroundWindow,
      source: 'subconscious-tick',
    })
    perceptionState = await ensurePerceptionState(activeCardId)
    let visualPresenceState = await ensureVisualPresenceState(activeCardId)
    const idleLikely = interruptionContext.inputActivity === 'idle'
      || (interruptionContext.inputActivity !== 'active' && cpuUsage <= 10)

    const nextState = {
      ...state,
      boredom: clampNeed(state.boredom + elapsedMinutes * ((cpuUsage >= 70 || interruptionContext.fullscreenLikely) ? 2.2 : 1.2)),
      loneliness: clampNeed(state.loneliness + elapsedMinutes * (idleLikely ? 2.4 : 0.8)),
      fatigue: clampNeed(state.fatigue + elapsedMinutes * 0.6 + reminderResult.completed * 1.2 + learningResult.completed * 0.4),
      lastTickAt: now,
      lastInteractionAt: state.lastInteractionAt,
      updatedAt: now,
    }
    const soulForSubconscious = getSoulSnapshot() ?? await bootstrap()
    const killSwitchSuspended
      = isAlicizationKillSwitchSuspended()
        || getAlicizationCardKillSwitchState(activeCardId) === 'SUSPENDED'
    const hostActive = interruptionContext.inputActivity === 'active'
      || (typeof interruptionContext.idleSeconds === 'number' && interruptionContext.idleSeconds < 5 * 60)
    const lateNightState = updateLateNightActivityState(proactiveLoopState, {
      now,
      hostActive,
      isLateNight: isLateNightWindow(new Date(now)),
    })
    proactiveLoopState = lateNightState.state
    setProactiveLoopStateCache(activeCardId, proactiveLoopState)
    const reminderBacklog = (await alicizationDb.listPendingScheduledTasks(32).catch(() => [])).length
    const canAttemptScreenSemanticSummary
      = !killSwitchSuspended
        && !interruptionContext.fullscreenLikely
        && cpuUsage < 70
        && (interruptionContext.inputActivity !== 'active' || cpuUsage < 45)
    const proactiveGrounding = canAttemptScreenSemanticSummary
      ? await resolveProactiveScreenSemanticSummary({
          cardId: activeCardId,
          now,
          foregroundWindow: interruptionContext.foregroundWindow,
          perceptionState,
          agentTurn: backgroundAgentTurn,
        })
      : {
          summary: null,
          capture: null,
        }
    const screenSemanticSummary = proactiveGrounding.summary
    const proactiveCaptureSnapshot = proactiveGrounding.capture
    const screenSemanticSummaryGroundedThisTurn = Boolean(
      screenSemanticSummary
      && !isResidueBackedScreenSemanticSummary(screenSemanticSummary),
    )
    const layeredContext = buildProactiveLayeredContext({
      now,
      probeSample: sensorySnapshot?.sample,
      interruptionContext,
      subconsciousState: nextState,
      hostAttitude: soulForSubconscious.frontmatter.host_attitude,
      reminderBacklog,
      lateNightActiveMinutes: lateNightState.lateNightActiveMinutes,
      recentProactiveOutcomes: proactiveLoopState.recentOutcomes,
      screenSemanticSummary,
    })
    const perceptionSignals = buildProactivePerceptionSignals({
      now,
      state: perceptionState,
      currentForeground: interruptionContext.foregroundWindow ?? sensorySnapshot?.sample?.foregroundWindow,
    })
    const previousWorkingMemoryCount = visualPresenceState.workingMemoryEpisodes.length
    const inferredScenario = inferScenarioFromContext({
      workload: layeredContext.workload.kind,
      content: layeredContext.content.kind,
      lateNight: layeredContext.localTime.isLateNight,
      lateNightActiveMinutes: layeredContext.relationship.lateNightActiveMinutes,
      fatigue: layeredContext.relationship.fatigue,
    })
    let durabilityPulse = consumeDurabilityPulse(activeCardId)
    const currentForegroundPid = Number(
      interruptionContext.foregroundWindow?.pid
      ?? sensorySnapshot?.sample?.foregroundWindow?.pid
      ?? visualPresenceState.currentScene?.target?.pid
      ?? 0,
    )
    const shouldProbeForegroundDurability
      = Number.isFinite(currentForegroundPid)
        && currentForegroundPid > 0
        && (
          visualPresenceState.watchMode === 'symbiotic-vision'
          || visualPresenceState.watchMode === 'recovering'
          || inferredScenario === 'coding'
          || inferredScenario === 'media'
        )
    if (!durabilityPulse && shouldProbeForegroundDurability) {
      const pidAlive = await probeForegroundPidLiveness(currentForegroundPid)
      if (!pidAlive) {
        durabilityPulse = {
          kind: 'process-gone',
          source: 'foreground-app',
          detectedAt: now,
          pid: Math.floor(currentForegroundPid),
          appName: interruptionContext.foregroundWindow?.appName,
          processName: interruptionContext.foregroundWindow?.processName,
          title: interruptionContext.foregroundWindow?.title,
        }
      }
      else {
        const timeoutStreak = updateForegroundProbeTimeoutStreak(currentForegroundPid, interruptionContext.foregroundProbeTimedOut === true)
        if (timeoutStreak >= 2) {
          durabilityPulse = {
            kind: 'anr-likely',
            source: 'foreground-app',
            detectedAt: now,
            pid: Math.floor(currentForegroundPid),
            appName: interruptionContext.foregroundWindow?.appName,
            processName: interruptionContext.foregroundWindow?.processName,
            title: interruptionContext.foregroundWindow?.title,
          }
          clearForegroundProbeTimeoutStreakForPid(Math.floor(currentForegroundPid))
        }
      }
    }
    else if (Number.isFinite(currentForegroundPid) && currentForegroundPid > 0) {
      updateForegroundProbeTimeoutStreak(currentForegroundPid, false)
    }

    const backgroundSceneResidue = getActivePerceptionSceneResidue(perceptionState, now)
    const canUseBackgroundResidueAsLiveSceneSummary = (
      proactiveCaptureSnapshot === null
      || proactiveCaptureSnapshot.health === 'healthy'
    ) && shouldUsePerceptionResidueAsLiveSceneSummary({
      residue: backgroundSceneResidue,
      currentForeground: interruptionContext.foregroundWindow ?? sensorySnapshot?.sample?.foregroundWindow,
      inspectionRequested: false,
      groundedThisTurn: screenSemanticSummaryGroundedThisTurn,
    })
    const groundedSummary = screenSemanticSummary?.content.summary
      ?? (
        canUseBackgroundResidueAsLiveSceneSummary
          ? backgroundSceneResidue?.summary ?? null
          : null
      )
    const backgroundCaptureGovernance = deriveRuntimeCaptureGovernance({
      capture: proactiveCaptureSnapshot,
      inspectionRequested: false,
      groundedThisTurn: screenSemanticSummaryGroundedThisTurn,
      previousCaptureState: visualPresenceState.captureState,
      captureSourceName: screenSemanticSummaryGroundedThisTurn
        ? screenSemanticSummary?.source.name ?? null
        : null,
      now,
    })
    const organicMemorySnapshot = await getOrganicMemorySnapshot().catch(() => null)
    const visualHeartbeat = buildVisualHeartbeat({
      now,
      scenario: inferredScenario,
      previousState: visualPresenceState,
      context: layeredContext,
      invitedInspectionActive: perceptionSignals.invitedInspectionActive,
      groundedSummary,
      screenSemanticSummaryActive: Boolean(screenSemanticSummary),
      durabilityPulse,
    })
    const attention = updateVisualAttentionModel({
      now,
      scenario: inferredScenario,
      previousAttention: visualPresenceState.attention,
      currentForeground: interruptionContext.foregroundWindow ?? sensorySnapshot?.sample?.foregroundWindow,
      currentScene: visualHeartbeat.scene,
      invitedInspectionActive: perceptionSignals.invitedInspectionActive,
      perceptionAnchor: getActiveAttentionAnchor(perceptionState, now)
        ?? perceptionState.lastNonSelfForegroundTarget
        ?? null,
      durabilityPulse,
    })
    const digitalLifeMindState = await buildDigitalLifeMindState({
      cardId: activeCardId,
      now,
      context: layeredContext,
      recentMessages: [],
      previousVisualPresenceState: visualPresenceState,
      visualHeartbeat,
      attention,
      durabilityPulse,
      personalityAuthority: soulForSubconscious.frontmatter.personality,
      inspectionRequested: false,
      groundedThisTurn: screenSemanticSummaryGroundedThisTurn,
      cognitionMode: 'background',
      agentTurn: backgroundAgentTurn,
      selfEvolution: visualPresenceState.selfEvolution ?? null,
      organicMemoryContext: organicMemorySnapshot,
    })
    const previousMindPresenceState = visualPresenceState
    const committedDigitalLifeSpine = commitAlicizationDigitalLifeSpine({
      now,
      previousState: previousMindPresenceState,
      watchMode: visualHeartbeat.watchMode,
      scene: visualHeartbeat.scene,
      attention,
      mindState: digitalLifeMindState,
      captureState: backgroundCaptureGovernance.nextCaptureState,
      durabilityPulse,
      recentTransition: visualHeartbeat.recentTransition,
      nextSuggestedProbeMs: visualHeartbeat.nextSuggestedProbeMs,
    })
    visualPresenceState = committedDigitalLifeSpine.nextState
    const previousDigitalLifeRuntimeSurface = committedDigitalLifeSpine.previous.runtimeSurface
    const digitalLifeRuntimeSurface = committedDigitalLifeSpine.current.runtimeSurface
    const emotionalTransitionLedger = digitalLifeRuntimeSurface.memory?.derivedMindStateBundle?.emotionalTransitionLedger ?? null
    const emotionalKernelForDecay = digitalLifeRuntimeSurface.memory?.emotionalKernel
      ?? digitalLifeRuntimeSurface.memory?.derivedMindStateBundle?.emotionalKernel
      ?? visualPresenceState.emotionalKernel
      ?? null
    const emotionalTransitionDecay = emotionalTransitionLedger
      ? resolveAlicizationEmotionalTransitionDecay({
          ledger: emotionalTransitionLedger,
          now,
          current: emotionalKernelForDecay,
        })
      : null
    await persistVisualPresenceState(activeCardId, visualPresenceState, {
      debounceWindowMs: visualPresenceCapturePersistDebounceWindowMs,
      fingerprint: buildVisualPresenceCapturePersistFingerprint(visualPresenceState),
    })

    const mindContinuityText = buildMindContinuityFragment({
      previousRuntimeSurface: previousDigitalLifeRuntimeSurface,
      nextRuntimeSurface: digitalLifeRuntimeSurface,
    })
    if (mindContinuityText) {
      await alicizationDb.appendSubconsciousFragments([{
        text: mindContinuityText,
        sourceKind: 'mind-continuity',
      }]).catch(async (error: unknown) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.mind',
          action: 'mind-continuity-write-failed',
          message: 'Failed to append mind continuity fragment after subconscious mind-state update.',
          payload: {
            reason: errorMessageFrom(error) ?? 'unknown error',
            fragment: mindContinuityText,
          },
        })
      })
    }

    const reflectionLedgerText = buildReflectionLedgerFragment({
      previousRuntimeSurface: previousDigitalLifeRuntimeSurface,
      nextRuntimeSurface: digitalLifeRuntimeSurface,
    })
    if (reflectionLedgerText) {
      await alicizationDb.appendSubconsciousFragments([{
        text: reflectionLedgerText,
        sourceKind: 'reflection-ledger',
      }]).catch(async (error: unknown) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.mind',
          action: 'reflection-ledger-write-failed',
          message: 'Failed to append reflection-ledger fragment after subconscious mind-state update.',
          payload: {
            reason: errorMessageFrom(error) ?? 'unknown error',
            fragment: reflectionLedgerText,
          },
        })
      })
    }

    const autobiographicalEpisodeText = buildAutobiographicalEpisodeFragment({
      previousRuntimeSurface: previousDigitalLifeRuntimeSurface,
      nextRuntimeSurface: digitalLifeRuntimeSurface,
    })
    if (autobiographicalEpisodeText) {
      await alicizationDb.appendSubconsciousFragments([{
        text: autobiographicalEpisodeText,
        sourceKind: 'autobiographical-episode',
      }]).catch(async (error: unknown) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.mind',
          action: 'autobiographical-episode-write-failed',
          message: 'Failed to append autobiographical episode fragment after subconscious mind-state update.',
          payload: {
            reason: errorMessageFrom(error) ?? 'unknown error',
            fragment: autobiographicalEpisodeText,
          },
        })
      })
    }

    if (visualPresenceState.workingMemoryEpisodes.length > previousWorkingMemoryCount) {
      const latestEpisode = visualPresenceState.workingMemoryEpisodes.at(-1)
      const visualSedimentText = latestEpisode
        ? buildVisualSedimentFragment(latestEpisode)
        : ''
      if (visualSedimentText) {
        await alicizationDb.appendSubconsciousFragments([{
          text: visualSedimentText,
          sourceKind: 'visual-sediment',
        }]).catch(async (error: unknown) => {
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.visual-memory',
            action: 'visual-sediment-write-failed',
            message: 'Failed to append visual sediment fragment after visual episode closure.',
            payload: {
              reason: errorMessageFrom(error) ?? 'unknown error',
              fragment: visualSedimentText,
            },
          })
        })
      }
    }

    proactiveLoopState = progressProactiveCadenceState({
      state: proactiveLoopState,
      now,
      context: layeredContext,
      ...committedDigitalLifeSpine.current.proactivePolicy,
      emotionalTransitionDecay,
    })
    setProactiveLoopStateCache(activeCardId, proactiveLoopState)
    const activeSelfRevisionPatch = await getActiveSelfRevisionStatePatch?.().catch(() => null) ?? null

    let proactive = false
    let outwardProactiveTriggered = false
    let suppressed = false
    const executionDelivered = await processPendingExecutionDeliveriesForCurrentCard(trigger, backgroundAgentTurn)
    if (executionDelivered) {
      proactive = true
      outwardProactiveTriggered = true
    }
    else {
      const recentRuntimeActions = backgroundAgentTurn?.getSessionSnapshot().tasks ?? []
      if (recentRuntimeActions.some((action: PresenceOnlyRuntimeAction) =>
        action.kind === 'executor'
        && String(action.label).startsWith('callback:')
        && (action.status === 'completed' || action.status === 'pending'),
      )) {
        proactive = true
      }
      const proactiveRuntimeSnapshot = deriveAlicizationRuntimeSnapshot({
        spine: committedDigitalLifeSpine.current,
        agentRuntime: deriveAlicizationAgentRuntimeTelemetryFromSession(
          backgroundAgentTurn?.getSessionSnapshot(),
        ),
      })
      const decision = evaluateProactivePolicy({
        now,
        context: layeredContext,
        proactiveState: proactiveLoopState,
        killSwitchSuspended,
        personalityAuthority: soulForSubconscious.frontmatter.personality,
        knowledgeEvidence: committedDigitalLifeSpine.current.runtimeSurface.memory.knowledgeEvidence ?? null,
        perception: perceptionSignals,
        runtimeDigest: proactiveRuntimeSnapshot,
        projectState: proactiveRuntimeSnapshot?.projectState ?? null,
        selfRevisionPatch: activeSelfRevisionPatch,
        ...committedDigitalLifeSpine.current.proactivePolicy,
      })
      const preActuationEntrySurface = resolveRuntimeSubconsciousTickEntry({
        decision: {
          shouldInterrupt: decision.shouldInterrupt,
          style: decision.style,
          reasonCodes: decision.reasonCodes,
          presenceOnlyHold: decision.presenceOnlyHold,
        },
        autonomyExecutionProposalSurface: null,
      })
      const policyEvaluatedRuntimeSnapshot = derivePostPolicyQuietHoldRuntimeSnapshot(
        proactiveRuntimeSnapshot,
        {
          shouldPersistVisibleUtterance: preActuationEntrySurface.shouldEnterProactiveFlow,
          reason: preActuationEntrySurface.shouldEnterProactiveFlow
            ? null
            : preActuationEntrySurface.hardSuppressed
              ? null
              : 'proactive-visible-presence-without-utterance',
        },
      )
      if (!decision.shouldInterrupt)
        emitVisualPresencePulse(buildPresencePulsePayload(activeCardId, visualPresenceState))

      await appendAuditLog({
        level: interruptionContext.degraded.length > 0 ? 'warning' : 'notice',
        category: 'alicization.subconscious',
        action: 'proactive-policy-evaluated',
        message: 'Evaluated proactive interruption policy from layered sensory context.',
        payload: {
          trigger,
          consideredSignals: decision.consideredSignals,
          ignoredSignals: decision.ignoredSignals,
          decision: {
            shouldInterrupt: decision.shouldInterrupt,
            confidence: decision.confidence,
            urgency: decision.urgency,
            style: decision.style,
            cooldownMs: decision.cooldownMs,
            scenario: decision.scenario,
            policyVersion: decision.policyVersion,
            reasonCodes: decision.reasonCodes,
            presenceOnlyHold: decision.presenceOnlyHold,
            whyNow: decision.whyNow,
            whyNotLater: decision.whyNotLater,
            feedbackBias: decision.feedbackBias,
            consideredSignals: decision.consideredSignals,
            ignoredSignals: decision.ignoredSignals,
          },
          reasonCodes: decision.reasonCodes,
          style: decision.style,
          whyNow: decision.whyNow,
          whyNotLater: decision.whyNotLater,
          cooldownMs: decision.cooldownMs,
          feedbackBias: decision.feedbackBias,
          perception: perceptionSignals,
          runtimeDigest: policyEvaluatedRuntimeSnapshot ?? proactiveRuntimeSnapshot,
          visualPresence: digitalLifeRuntimeSurface,
          privateThought: digitalLifeRuntimeSurface.cognition.privateThought,
          entrySurface: {
            shouldEnterProactiveFlow: preActuationEntrySurface.shouldEnterProactiveFlow,
            shouldHoldVisibleUtterance: preActuationEntrySurface.shouldHoldVisibleUtterance,
            hardSuppressed: preActuationEntrySurface.hardSuppressed,
          },
          layeredContext,
          agentRuntime: buildAgentRuntimeAuditSnapshot(backgroundAgentTurn),
        },
      })

      let autonomyActuation: any = null
      let autonomyExecutionProposalSurface: any = null
      try {
        const autonomy = committedDigitalLifeSpine.current.runtimeSurface.agency.autonomy ?? null
        if (autonomy?.selectedMode === 'prepare-act' || autonomy?.selectedMode === 'act') {
          const planningCapabilities = await resolveTaskPlanningCapabilities()
          autonomyActuation = await runAutonomyActuation({
            now,
            cardId: activeCardId,
            sessionId: await ensureActiveOrLatestSessionId(activeCardId),
            digitalLifeSpine: committedDigitalLifeSpine.current,
            runtimeDigest: proactiveRuntimeSnapshot,
            capabilities: planningCapabilities,
            workspaceRoot,
            listPendingReminders: async (limit?: number) =>
              (await alicizationDb.listPendingScheduledTasks(limit ?? 128).catch(() => []))
                .filter((task: any) => String(task?.taskId ?? '').startsWith(`reminder:${activeCardId}:`)),
            scheduleReminder: async (payload: {
              minutes: number
              message: string
              sourceTurnId?: string
            }) => await scheduleAutonomyReminder(activeCardId, payload),
            buildExecutionRuntimeContext: async ({
              cardId,
              decisionTraceId,
              sessionId,
              turnId,
            }) => await backgroundAgentTurn.buildExecutionRuntimeContext({
              cardId,
              decisionTraceId,
              sessionId,
              turnId,
              sensorySnapshot,
            }),
            planTaskThread: async (payload: any) => await planAutonomyTaskThread(activeCardId, payload),
            dispatchTaskThread: async (payload: any) => await dispatchAutonomyTaskThread(payload),
          })
          autonomyExecutionProposalSurface = deriveAutonomyExecutionProposalSurface({
            actuationResult: autonomyActuation,
            digitalLifeSpine: committedDigitalLifeSpine.current,
          })

          if (
            autonomyActuation.reminderScheduled
            || autonomyActuation.taskPlanned
            || autonomyActuation.taskDispatched
          ) {
            proactive = true
            await appendAuditLog({
              level: 'notice',
              category: 'alicization.subconscious',
              action: 'autonomy-actuation-applied',
              message: 'Applied an autonomous actuation follow-through from the subconscious runtime.',
              payload: {
                trigger,
                autonomy: {
                  selectedMode: autonomy.selectedMode,
                  visibleAction: autonomy.visibleAction,
                  shouldSpeak: autonomy.shouldSpeak,
                  shouldAct: autonomy.shouldAct,
                  actReadiness: autonomy.actReadiness,
                  deferReason: autonomy.deferReason ?? null,
                  executionIntent: autonomy.executionIntent ?? null,
                },
                actuation: autonomyActuation,
                runtimeDigest: proactiveRuntimeSnapshot,
              },
            })
          }
        }
      }
      catch (error) {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.subconscious',
          action: 'autonomy-actuation-failed',
          message: 'Autonomous actuation follow-through failed after policy evaluation.',
          payload: {
            trigger,
            reason: errorMessageFrom(error) ?? 'unknown-error',
            runtimeDigest: proactiveRuntimeSnapshot,
          },
        })
      }

      const entrySurface = resolveRuntimeSubconsciousTickEntry({
        decision,
        autonomyExecutionProposalSurface,
      })
      const policyAdjustedRuntimeSnapshot = derivePostPolicyQuietHoldRuntimeSnapshot(
        proactiveRuntimeSnapshot,
        {
          shouldPersistVisibleUtterance: entrySurface.shouldEnterProactiveFlow,
          reason: entrySurface.shouldEnterProactiveFlow
            ? null
            : entrySurface.hardSuppressed
              ? null
              : 'proactive-visible-presence-without-utterance',
        },
      )
      const { hardSuppressed } = entrySurface
      if (hardSuppressed) {
        suppressed = true
        const obediencePenalty = decision.reasonCodes.includes('busy-host') || decision.reasonCodes.includes('fullscreen-host')
          ? -0.01
          : 0
        if (obediencePenalty !== 0) {
          await queueSoulMutation(async (current: any) => {
            const parsed = parseSoul(current.content)
            const nextPersonality = {
              ...parsed.frontmatter.personality,
              obedience: clamp01(parsed.frontmatter.personality.obedience + obediencePenalty),
            }
            const nextFrontmatter = {
              ...parsed.frontmatter,
              personality: nextPersonality,
            }
            const syncedBody = syncPersonalityBaselineInBody(parsed.body, nextPersonality)
            return snapshotFromContent(toSoulContent(nextFrontmatter, syncedBody))
          })
        }
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.subconscious',
          action: 'alicization.subconscious.suppressed',
          message: 'Suppressed proactive interruption after policy evaluation.',
          payload: {
            trigger,
            decision: {
              shouldInterrupt: decision.shouldInterrupt,
              confidence: decision.confidence,
              urgency: decision.urgency,
              style: decision.style,
              cooldownMs: decision.cooldownMs,
              scenario: decision.scenario,
              policyVersion: decision.policyVersion,
            },
            reasonCodes: decision.reasonCodes,
            style: decision.style,
            whyNow: decision.whyNow,
            whyNotLater: decision.whyNotLater,
            cooldownMs: decision.cooldownMs,
            feedbackBias: decision.feedbackBias,
            perception: perceptionSignals,
            runtimeDigest: proactiveRuntimeSnapshot,
            obediencePenalty,
          },
        })
      }
      else if (entrySurface.shouldEnterProactiveFlow) {
        const personality = soulForSubconscious.frontmatter.personality
        const personaContext = {
          customDirectives: normalizeCustomDirectives(soulForSubconscious.frontmatter.custom_directives),
          coreIncarnation: soulForSubconscious.frontmatter.core_incarnation,
          hostAttitude: soulForSubconscious.frontmatter.host_attitude,
        }
        const turnId = buildAlicizationAutonomousDialogueTurnId({
          kind: 'subconscious',
          segments: [activeCardId, now],
        })
        const proactiveOrigin = resolveAlicizationAutonomousDialogueOrigin('proactive')
        let structured: any = null
        let deliveryDecision = decision
        let llmStructured: any = null
        let organicPromptContext: Awaited<ReturnType<typeof resolveOrganicMemoryPromptContext>> | null = null
        if (autonomyExecutionProposalSurface) {
          const performanceManifest = await getPerformanceManifest()
          const structuredPerformance = clampAlicizationPerformancePayloadToManifest(
            buildDefaultDialoguePerformancePayload(autonomyExecutionProposalSurface.emotion),
            performanceManifest,
            autonomyExecutionProposalSurface.emotion,
          ).performance
          structured = {
            thought: autonomyExecutionProposalSurface.thought,
            emotion: structuredPerformance.baseEmotion,
            reply: autonomyExecutionProposalSurface.reply,
            performance: structuredPerformance,
            parsePath: 'deterministic',
            format: resolveAlicizationAutonomousDialogueStructuredFormat('subconscious-proactive'),
            proactive: buildProactiveMetadataFromDecision({
              decision,
              selfEvolution: committedDigitalLifeSpine.current.runtimeSurface.memory.selfEvolution ?? null,
              learningExecutionState: committedDigitalLifeSpine.current.runtimeSurface.memory.learningExecutionState ?? null,
            }),
          }
          await appendAuditLog({
            level: 'notice',
            category: 'alicization.subconscious',
            action: 'autonomy-execution-proposal-generated',
            message: 'Generated a proactive execution proposal from an affirmation-gated autonomy task thread.',
            payload: {
              turnId,
              proposal: autonomyExecutionProposalSurface,
              actuation: autonomyActuation,
              decision: {
                scenario: decision.scenario,
                style: decision.style,
                urgency: decision.urgency,
                confidence: decision.confidence,
              },
              agentRuntime: buildAgentRuntimeAuditSnapshot(backgroundAgentTurn),
            },
          })
        }
        else {
          const humanlikeMemoryRecallSeed = await resolveHumanlikeMemoryRecallSeedFromEventHistory({
            listHumanlikeMemoryRecallEvents,
            limit: 24,
          })
          const proactiveRecallSeed = buildProactiveRecallSeed({
            foregroundWindow: interruptionContext.foregroundWindow,
            phantomSeed: [
              buildVisualRecallSeed({
                scene: visualPresenceState.currentScene,
                emotionalTension: visualPresenceState.privateThought?.emotionalTension,
              }),
              humanlikeMemoryRecallSeed,
              buildMindContinuityRecallSeed(digitalLifeRuntimeSurface),
            ].filter(Boolean).join(' | '),
          })
          organicPromptContext = await resolveOrganicMemoryPromptContext({
            recallSeed: proactiveRecallSeed,
            budgetClass: 'proactive-generation',
          })
          const sociallyAdjustedDecision = {
            ...decision,
            style: adjustProactiveStyleFromHostPersonModel({
              currentStyle: decision.style,
              hostPersonModel: organicPromptContext.hostPersonModel ?? null,
              contexts: inferHostSocialContextsFromText([
                decision.scenario,
                layeredContext.workload.kind,
                layeredContext.content.kind,
                proactiveRecallSeed,
              ].filter(Boolean).join(' ')),
              selfEvolution: organicPromptContext.selfEvolution ?? null,
              learningExecutionState: organicPromptContext.learningExecutionState ?? null,
            }),
            presenceOnlyHold: decision.presenceOnlyHold,
          }
          const memoryBoundaryAdjustedDecision = applyProactiveMemoryBoundaryRestraint({
            decision: sociallyAdjustedDecision,
            memorySurfaceRestraint: organicPromptContext.memoryResolutionLedger
              ? {
                  shouldStayInward: organicPromptContext.memoryResolutionLedger.shouldStayInward,
                  shouldDelayUntilAfterPayoff: organicPromptContext.memoryResolutionLedger.shouldDelayUntilAfterPayoff,
                  stableCoreOnly: organicPromptContext.memoryResolutionLedger.stableCoreOnly,
                  visibleCarryMode: organicPromptContext.memoryResolutionLedger.visibleCarryMode,
                }
              : null,
            projectStatePreflightSummary: proactiveRuntimeSnapshot?.projectState?.preflightSummary ?? null,
            projectStateEmotionalClosureCue: proactiveRuntimeSnapshot?.projectState?.emotionalClosureCue ?? null,
            projectStatePrimaryOpenLoop: proactiveRuntimeSnapshot?.projectState?.primaryOpenLoop ?? null,
          })
          deliveryDecision = memoryBoundaryAdjustedDecision
          llmStructured = await generateProactiveStructuredWithGateway(
            personality,
            nextState,
            layeredContext,
            memoryBoundaryAdjustedDecision,
            organicPromptContext,
            perceptionState,
            visualPresenceState,
            {
              turnId,
            },
            backgroundAgentTurn,
          )
          const rawStructured = llmStructured ?? buildProactiveStructured(
            personality,
            nextState,
            layeredContext,
            memoryBoundaryAdjustedDecision,
            perceptionState,
            visualPresenceState,
            {
              customDirectives: personaContext.customDirectives,
              coreIncarnation: organicPromptContext.coreIncarnation,
              hostAttitude: organicPromptContext.hostAttitude,
              hostPersonModel: organicPromptContext.hostPersonModel ?? null,
            },
          )
          const performanceManifest = await getPerformanceManifest()
          const structuredPerformance = clampAlicizationPerformancePayloadToManifest(
            rawStructured.performance,
            performanceManifest,
            rawStructured.emotion,
          ).performance
          structured = {
            ...rawStructured,
            emotion: structuredPerformance.baseEmotion,
            performance: structuredPerformance,
          }
          if (llmStructured) {
            await appendAuditLog({
              level: 'notice',
              category: 'alicization.subconscious',
              action: 'proactive-llm-generated',
              message: 'Generated proactive utterance with policy-locked prompt constraints.',
              payload: {
                decision: {
                  scenario: decision.scenario,
                  style: deliveryDecision.style,
                  urgency: decision.urgency,
                  confidence: decision.confidence,
                },
                format: llmStructured.format,
                recallSeed: proactiveRecallSeed || null,
                recalledFragments: organicPromptContext.recalledFragments.length,
                agentRuntime: buildAgentRuntimeAuditSnapshot(backgroundAgentTurn),
                selfRevisionPatch: activeSelfRevisionPatch
                  ? {
                      id: activeSelfRevisionPatch.id,
                      lanes: activeSelfRevisionPatch.lanes,
                      reasonCodes: activeSelfRevisionPatch.reasonCodes,
                    }
                  : null,
              },
            })
          }
          else {
            await appendAuditLog({
              level: 'warning',
              category: 'alicization.subconscious',
              action: 'proactive-llm-fallback',
              message: 'Main gateway proactive generation unavailable; deterministic visible proactive text was deferred.',
              payload: {
                decision: {
                  scenario: decision.scenario,
                  style: deliveryDecision.style,
                  urgency: decision.urgency,
                  confidence: decision.confidence,
                },
                customDirectivesChars: personaContext.customDirectives.length,
                recallSeed: proactiveRecallSeed || null,
                recalledFragments: organicPromptContext.recalledFragments.length,
                agentRuntime: buildAgentRuntimeAuditSnapshot(backgroundAgentTurn),
                selfRevisionPatch: activeSelfRevisionPatch
                  ? {
                      id: activeSelfRevisionPatch.id,
                      lanes: activeSelfRevisionPatch.lanes,
                      reasonCodes: activeSelfRevisionPatch.reasonCodes,
                    }
                  : null,
              },
            })
          }
        }
        const memorySurfaceRestraint = organicPromptContext?.memoryResolutionLedger
          ? {
              shouldStayInward: organicPromptContext.memoryResolutionLedger.shouldStayInward,
              shouldDelayUntilAfterPayoff: organicPromptContext.memoryResolutionLedger.shouldDelayUntilAfterPayoff,
              stableCoreOnly: organicPromptContext.memoryResolutionLedger.stableCoreOnly,
              visibleCarryMode: organicPromptContext.memoryResolutionLedger.visibleCarryMode,
              rationale: organicPromptContext.memoryResolutionLedger.finalRationale,
            }
          : null
        const explicitRelationshipContinuityHold = Boolean(
          activeSelfRevisionPatch
          && (
            activeSelfRevisionPatch.domain === 'relationship'
            || activeSelfRevisionPatch.lanes.includes('relationship-posture')
            || activeSelfRevisionPatch.lanes.includes('relationship-policy')
            || activeSelfRevisionPatch.reasonCodes.includes('domain:relationship')
            || activeSelfRevisionPatch.reasonCodes.includes('same-her-baseline')
          ),
        )
        const worldModelVerifyFirstVisibleNudge = (
          activeSelfRevisionPatch?.domain === 'world-model'
          && activeSelfRevisionPatch?.action === 'verify'
          && deliveryDecision.reasonCodes.includes('coding-focus')
          && deliveryDecision.reasonCodes.includes('foreground-error')
          && deliveryDecision.reasonCodes.includes('belief-contradicted')
        )
        const explicitContinuityAfterglowHold = deliveryDecision.reasonCodes.includes('relationship-residue-delay-warmth')
          || deliveryDecision.reasonCodes.includes('continuity-execution-callback-afterglow-hold')
          || (
            deliveryDecision.reasonCodes.includes('continuity-execution-callback-project-carry')
            && !worldModelVerifyFirstVisibleNudge
          )
        const explicitNextOpenWindowHold = deliveryDecision.reasonCodes.includes('continuity-next-open-window')
          && deliveryDecision.style === 'silent-observe'
        const codingFeedbackWindowVisibleNudge = (
          deliveryDecision.style === 'silent-observe'
          && deliveryDecision.scenario === 'coding'
          && typeof structured?.reply === 'string'
          && structured.reply.trim().length > 0
          && typeof structured?.proactive?.feedbackWindowMs === 'number'
          && (
            deliveryDecision.reasonCodes.includes('foreground-error')
            || deliveryDecision.reasonCodes.includes('foreground-diff')
          )
        )
        const verifyFirstCodingVisibleNudge = (
          activeSelfRevisionPatch?.domain === 'world-model'
          && activeSelfRevisionPatch?.action === 'verify'
          && deliveryDecision.reasonCodes.includes('coding-focus')
          && deliveryDecision.reasonCodes.includes('foreground-error')
          && (
            deliveryDecision.reasonCodes.includes('belief-contradicted')
            || deliveryDecision.reasonCodes.includes('world-model-revalidation-required')
          )
        )
        const shouldResolveAsPresenceOnlyHold = (
          !verifyFirstCodingVisibleNudge
          && !codingFeedbackWindowVisibleNudge
          && (
            deliveryDecision.presenceOnlyHold === true
            || (
              entrySurface.shouldHoldVisibleUtterance
              && (
                explicitRelationshipContinuityHold
                || explicitContinuityAfterglowHold
                || explicitNextOpenWindowHold
              )
            )
          )
        )
        const proactiveVisibleUtterance = resolveAlicizationProactiveVisibleUtterance({
          kind: autonomyExecutionProposalSurface ? 'autonomy-proposal' : 'subconscious-proactive',
          structured,
          hasMindAuthoredStructured: Boolean(llmStructured),
          reason: shouldResolveAsPresenceOnlyHold
            ? 'proactive-visible-presence-without-utterance'
            : llmStructured
              ? 'mind-authored-proactive-utterance'
              : 'provider-mind-unavailable-for-proactive-visible-utterance',
          allowDeterministicVisibleFallback: shouldResolveAsPresenceOnlyHold,
          preferPresenceOnlyHold: shouldResolveAsPresenceOnlyHold,
          selfRevisionPatch: activeSelfRevisionPatch,
          memorySurfaceRestraint,
        })
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.subconscious',
          action: 'proactive-visible-utterance-resolved',
          message: 'Resolved whether a proactive turn should persist a visible utterance or stay as inward presence.',
          payload: {
            turnId,
            trigger,
            hasLlmStructured: Boolean(llmStructured),
            structuredReply: typeof structured?.reply === 'string' ? structured.reply : null,
            deliveryStyle: deliveryDecision.style,
            presenceOnlyHoldRequested: shouldResolveAsPresenceOnlyHold,
            worldModelVerifyFirstVisibleNudge,
            verifyFirstCodingVisibleNudge,
            codingFeedbackWindowVisibleNudge,
            decision: proactiveVisibleUtterance.decision,
            realization: proactiveVisibleUtterance.visibleReplyRealization,
          },
        })
        if (!proactiveVisibleUtterance.shouldPersistVisibleUtterance) {
          proactive = false
          let deferredAutonomyProjectState: Partial<typeof projectStatePersistence> | null = null
          try {
            const persistedPresenceState = await ensureVisualPresenceState(activeCardId)
            const latestRuntimeSurface = committedDigitalLifeSpine.current.runtimeSurface
            const persistedPresenceRuntimeSnapshot = derivePostPolicyQuietHoldRuntimeSnapshot(
              policyAdjustedRuntimeSnapshot ?? proactiveRuntimeSnapshot,
              {
                shouldPersistVisibleUtterance: proactiveVisibleUtterance.shouldPersistVisibleUtterance,
                reason: proactiveVisibleUtterance.decision.reason,
              },
            ) ?? policyAdjustedRuntimeSnapshot ?? proactiveRuntimeSnapshot
            const projectContinuityCue
              = persistedPresenceRuntimeSnapshot?.projectState?.continuityCue
                ?? proactiveRuntimeSnapshot?.projectState?.continuityCue
                ?? latestRuntimeSurface.dialogue?.currentConsciousFrame?.projectState?.continuityCue
                ?? latestRuntimeSurface.dialogue?.currentConsciousFrame?.continuityCue
                ?? persistedPresenceState.privateThought?.thoughtText
                ?? null
            const proactiveVisibleReplyRealization
              = proactiveVisibleUtterance.visibleReplyRealization
                && typeof proactiveVisibleUtterance.visibleReplyRealization === 'object'
                ? proactiveVisibleUtterance.visibleReplyRealization as PresenceOnlyVisibleReplyRealization
                : null
            const proactiveVisibleProjectStateAudit = proactiveVisibleReplyRealization?.projectStateAudit ?? null
            const proactiveVisibleSameHerInwardCarry
              = typeof proactiveVisibleReplyRealization?.sameHerInwardCarry === 'string'
                ? proactiveVisibleReplyRealization.sameHerInwardCarry
                : null
            const authoritativePresenceOnlyContinuityRestraint = derivePresenceOnlyHoldAuthorityContinuityRestraint({
              currentContinuityRestraint:
                (policyAdjustedRuntimeSnapshot?.continuityRestraint as 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'lower-pressure' | null | undefined)
                ?? (proactiveRuntimeSnapshot?.continuityRestraint as 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'lower-pressure' | null | undefined)
                ?? digitalLifeRuntimeSurface.mind?.initiative?.continuityRestraint
                ?? (deliveryDecision.style === 'silent-observe' ? 'lower-pressure' : null),
              sameHerInwardCarry: proactiveVisibleSameHerInwardCarry,
              projectStateAudit: proactiveVisibleProjectStateAudit,
              projectContinuityCue,
              privateThoughtText: persistedPresenceState.privateThought?.thoughtText ?? null,
            })
            const persistedInitiative = buildPresenceOnlyHoldInitiativeFallback({
              existingInitiative: digitalLifeRuntimeSurface.mind?.initiative ?? null,
              decision: deliveryDecision,
              continuityRestraint: authoritativePresenceOnlyContinuityRestraint,
              projectContinuityCue,
              privateThought: persistedPresenceState.privateThought ?? null,
            })
            const persistedPrivateThought = persistedPresenceState.privateThought
              ? {
                  ...persistedPresenceState.privateThought,
                  shouldSpeak: persistedInitiative?.shouldSpeak ?? persistedPresenceState.privateThought.shouldSpeak,
                  suggestedStyle: persistedInitiative?.preferredStyle ?? persistedPresenceState.privateThought.suggestedStyle,
                  embodiedPresence: persistedInitiative?.preferredPresence === 'concerned'
                    ? 'concerned'
                    : persistedInitiative?.preferredPresence === 'hesitant'
                      ? 'hesitant'
                      : persistedInitiative?.preferredPresence === 'attentive'
                        ? 'attentive'
                        : persistedPresenceState.privateThought.embodiedPresence,
                  emotionalTension: persistedInitiative?.continuityRestraint === 'repair-before-closeness'
                    ? 'soft-covision'
                    : persistedInitiative?.continuityRestraint === 'rest-protective'
                      ? 'late-night-drain'
                      : persistedInitiative?.continuityRestraint === 'measured-return' || persistedInitiative?.continuityRestraint === 'lower-pressure'
                        ? 'soft-covision'
                        : persistedPresenceState.privateThought.emotionalTension,
                  thoughtText: persistedInitiative?.why
                    || persistedPresenceState.privateThought.thoughtText,
                  rationaleTags: Array.from(new Set([
                    ...(persistedPresenceState.privateThought.rationaleTags ?? []),
                    buildPresenceOnlyHoldProjectStateSameHerCarryTag({
                      visibleReplySameHerInwardCarry: proactiveVisibleSameHerInwardCarry,
                      projectState: projectStatePersistence,
                      persistedInitiative,
                    }),
                    persistedInitiative?.continuityRestraint === 'repair-before-closeness'
                      ? 'repair-before-closeness'
                      : persistedInitiative?.continuityRestraint === 'rest-protective'
                        ? 'rest-protective'
                        : persistedInitiative?.continuityRestraint === 'measured-return' || persistedInitiative?.continuityRestraint === 'lower-pressure'
                          ? 'measured-return'
                          : '',
                    persistedInitiative?.preferredStyle === 'silent-observe'
                      ? 'quiet-companionship'
                      : '',
                  ].filter(Boolean))),
                }
              : persistedPresenceState.privateThought
            const continuityProjectionFallback = buildPresenceOnlyHoldContinuityProjection({
              previousProjection: persistedPresenceState.personStateProjection ?? null,
              openingGuidance: structured?.proactive?.openingGuidance ?? null,
              continuityRestraint: persistedInitiative?.continuityRestraint ?? null,
              initiativeWhy: persistedInitiative?.why ?? null,
              projectContinuityCue: projectContinuityCue ?? persistedPrivateThought?.thoughtText ?? null,
            })
            const proactiveVisibleSameHerContinuityCue = [
              proactiveVisibleSameHerInwardCarry,
              proactiveVisibleProjectStateAudit?.emotionalClosureSummary ?? null,
              proactiveVisibleProjectStateAudit?.sameHerSummary ?? null,
            ]
              .filter((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0)
              .filter((candidate, index, array) => array.findIndex(item => item.toLowerCase() === candidate.toLowerCase()) === index)
              .join(' | ') || null
            const resolvedProjectContinuityCueCandidates = [
              proactiveVisibleSameHerContinuityCue,
              typeof continuityProjectionFallback?.openingGuidance === 'string'
                ? continuityProjectionFallback.openingGuidance
                : null,
              proactiveVisibleProjectStateAudit?.openClosureSummary ?? null,
              projectContinuityCue,
              persistedPrivateThought?.thoughtText ?? null,
              typeof continuityProjectionFallback?.sameHerHoldDetail === 'string'
                ? continuityProjectionFallback.sameHerHoldDetail
                : null,
            ].filter((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0)
            const resolvedProjectContinuityCue = resolvedProjectContinuityCueCandidates.find(candidate =>
              /repair-before-closeness|repair before closeness|rest-protective|rest protective|same living line|same line|same-thread|same thread|same-her|same her|callback|measured-return|lower-pressure/i.test(candidate),
            ) ?? resolvedProjectContinuityCueCandidates[0] ?? null
            const persistedPresenceRuntimeProjectState
              = persistedPresenceRuntimeSnapshot?.projectState && typeof persistedPresenceRuntimeSnapshot.projectState === 'object'
                ? persistedPresenceRuntimeSnapshot.projectState as Record<string, unknown>
                : null
            const explicitResidentLatestLandedProgressInput
              = typeof persistedPresenceRuntimeProjectState?.latestLandedProgress === 'string'
                ? persistedPresenceRuntimeProjectState.latestLandedProgress.trim()
                : typeof persistedPresenceRuntimeProjectState?.latestProgress === 'string'
                  ? persistedPresenceRuntimeProjectState.latestProgress.trim()
                  : ''
            const summaryResidentLatestLandedProgressInput
              = typeof persistedPresenceRuntimeProjectState?.landedProgressSummary === 'string'
                ? persistedPresenceRuntimeProjectState.landedProgressSummary.trim()
                : ''
            const liveResidentLatestLandedProgressInput
              = explicitResidentLatestLandedProgressInput || summaryResidentLatestLandedProgressInput || null
            const explicitResidentPrimaryOpenLoopInput
              = typeof persistedPresenceRuntimeProjectState?.primaryOpenLoop === 'string'
                ? persistedPresenceRuntimeProjectState.primaryOpenLoop.trim()
                : ''
            const summaryResidentPrimaryOpenLoopInput
              = typeof persistedPresenceRuntimeProjectState?.openClosureSummary === 'string'
                ? persistedPresenceRuntimeProjectState.openClosureSummary.trim()
                : ''
            const liveResidentPrimaryOpenLoopInput
              = explicitResidentPrimaryOpenLoopInput || summaryResidentPrimaryOpenLoopInput || null
            const explicitResidentNextClosureTargetInput
              = typeof persistedPresenceRuntimeProjectState?.nextClosureTarget === 'string'
                ? persistedPresenceRuntimeProjectState.nextClosureTarget.trim()
                : ''
            const summaryResidentNextClosureTargetInput
              = typeof persistedPresenceRuntimeProjectState?.nextClosureTargetSummary === 'string'
                ? persistedPresenceRuntimeProjectState.nextClosureTargetSummary.trim()
                : ''
            const liveResidentNextClosureTargetInput
              = explicitResidentNextClosureTargetInput || summaryResidentNextClosureTargetInput || null
            const explicitResidentSameHerDriftRiskInput
              = typeof persistedPresenceRuntimeProjectState?.sameHerDriftRisk === 'string'
                ? persistedPresenceRuntimeProjectState.sameHerDriftRisk.trim()
                : ''
            const summaryResidentSameHerDriftRiskInput
              = typeof persistedPresenceRuntimeProjectState?.sameHerDriftRiskSummary === 'string'
                ? persistedPresenceRuntimeProjectState.sameHerDriftRiskSummary.trim()
                : ''
            const liveResidentSameHerDriftRiskInput
              = explicitResidentSameHerDriftRiskInput || summaryResidentSameHerDriftRiskInput || null
            const canonicalResidentProjectState = resolveAlicizationProjectStateSnapshot({
              runtimeProjectState: {
                identity: persistedPresenceRuntimeProjectState?.identity,
                currentPhase: persistedPresenceRuntimeProjectState?.currentPhase,
                latestLandedProgress: liveResidentLatestLandedProgressInput,
                landedProgressSummary: summaryResidentLatestLandedProgressInput || null,
                primaryOpenLoop: liveResidentPrimaryOpenLoopInput,
                openClosureSummary: summaryResidentPrimaryOpenLoopInput || null,
                nextClosureTarget: liveResidentNextClosureTargetInput,
                nextClosureTargetSummary: summaryResidentNextClosureTargetInput || null,
                sameHerSelfLine: persistedPresenceRuntimeProjectState?.sameHerSelfLine,
                sameHerDriftRisk: liveResidentSameHerDriftRiskInput,
                sameHerDriftRiskSummary: summaryResidentSameHerDriftRiskInput || null,
                preflightSummary: persistedPresenceRuntimeProjectState?.preflightSummary,
                preDialogueAwarenessLine: persistedPresenceRuntimeProjectState?.preDialogueAwarenessLine,
                awarenessLine: persistedPresenceRuntimeProjectState?.awarenessLine,
                companionHeadlineLine: persistedPresenceRuntimeProjectState?.companionHeadlineLine,
                companionBriefingLine: persistedPresenceRuntimeProjectState?.companionBriefingLine,
                emotionalClosureCue: persistedPresenceRuntimeProjectState?.emotionalClosureCue,
                emotionalClosureSummary:
                  typeof persistedPresenceRuntimeProjectState?.emotionalClosureSummary === 'string'
                    ? persistedPresenceRuntimeProjectState.emotionalClosureSummary
                    : null,
                sameHerHoldDetail:
                  typeof persistedPresenceRuntimeProjectState?.sameHerHoldDetail === 'string'
                    ? persistedPresenceRuntimeProjectState.sameHerHoldDetail
                    : null,
              },
              fallbackProjectState: {
                identity: projectStatePersistence.identity,
                currentPhase: projectStatePersistence.currentPhase,
                latestLandedProgress: projectStatePersistence.latestLandedProgress,
                primaryOpenLoop: projectStatePersistence.primaryOpenLoop,
                nextClosureTarget: projectStatePersistence.nextClosureTarget,
                preDialogueAwarenessLine: projectStatePersistence.preDialogueAwarenessLine,
                awarenessLine: projectStatePersistence.awarenessLine,
                companionHeadlineLine: projectStatePersistence.companionHeadlineLine,
                emotionalClosureCue: projectStatePersistence.emotionalClosureCue,
              },
            })
            const persistedPersonStateProjection = preserveResidentSameLineProjection({
              previousProjection: persistedPresenceState.personStateProjection ?? null,
              nextProjection: latestRuntimeSurface.dialogue?.personStateProjection ?? continuityProjectionFallback,
              conversationState: latestRuntimeSurface.dialogue?.conversationState ?? null,
              dialogueWorldThread: latestRuntimeSurface.dialogue?.dialogueWorldThread ?? null,
            })
            const resolvedPersonStateProjection = persistedPersonStateProjection ?? continuityProjectionFallback
            const resolvedCurrentConsciousFrame = buildPresenceOnlyHoldCurrentConsciousFrame({
              currentConsciousFrame: proactiveRuntimeSnapshot?.currentConsciousFrame ?? latestRuntimeSurface.dialogue?.currentConsciousFrame ?? null,
              continuityRestraint: persistedInitiative?.continuityRestraint ?? null,
              holdDetail:
                typeof continuityProjectionFallback?.sameHerHoldDetail === 'string'
                  ? continuityProjectionFallback.sameHerHoldDetail
                  : null,
              projectStateCarry: {
                sameHerSummary: proactiveVisibleProjectStateAudit?.sameHerSummary ?? null,
                sameHerDriftRisk: activeSelfRevisionPatch?.projectStateContinuity?.sameHerDriftRisk ?? null,
                emotionalClosureSummary: proactiveVisibleProjectStateAudit?.emotionalClosureSummary ?? null,
                continuityCue: resolvedProjectContinuityCue,
              },
            })
            deferredAutonomyProjectState = {
              sameHerSelfLine:
                canonicalResidentProjectState.sameHerSelfLine
                ?? proactiveVisibleProjectStateAudit?.sameHerSummary
                ?? projectStatePersistence.sameHerSelfLine,
              sameHerHoldDetail:
                proactiveVisibleProjectStateAudit?.sameHerHoldDetail
                ?? continuityProjectionFallback?.sameHerHoldDetail
                ?? (
                  resolvedCurrentConsciousFrame?.projectState
                  && typeof resolvedCurrentConsciousFrame.projectState === 'object'
                  && typeof (resolvedCurrentConsciousFrame.projectState as { sameHerHoldDetail?: unknown }).sameHerHoldDetail === 'string'
                    ? (resolvedCurrentConsciousFrame.projectState as { sameHerHoldDetail?: string | null }).sameHerHoldDetail ?? null
                    : null
                )
                ?? canonicalResidentProjectState.sameHerHoldDetail
                ?? projectStatePersistence.sameHerHoldDetail,
              sameHerDriftRisk:
                canonicalResidentProjectState.sameHerDriftRisk
                ?? projectStatePersistence.sameHerDriftRisk,
              preDialogueAwarenessLine:
                canonicalResidentProjectState.preDialogueAwarenessLine
                ?? projectStatePersistence.preDialogueAwarenessLine,
              primaryOpenLoop:
                canonicalResidentProjectState.primaryOpenLoop
                ?? projectStatePersistence.primaryOpenLoop,
              openFocusSummary:
                deriveCompactProjectStateOpenFocusSummary(
                  canonicalResidentProjectState.primaryOpenLoop
                  ?? projectStatePersistence.primaryOpenLoop,
                  {
                    emotionalClosureCue:
                      canonicalResidentProjectState.emotionalClosureCue
                      ?? projectStatePersistence.emotionalClosureCue,
                  },
                )
                ?? projectStatePersistence.openFocusSummary,
              nextClosureTarget:
                canonicalResidentProjectState.nextClosureTarget
                ?? projectStatePersistence.nextClosureTarget,
              nextFocusSummary:
                deriveCompactProjectStateNextFocusSummary(
                  canonicalResidentProjectState.nextClosureTarget
                  ?? projectStatePersistence.nextClosureTarget,
                  {
                    emotionalClosureCue:
                      canonicalResidentProjectState.emotionalClosureCue
                      ?? projectStatePersistence.emotionalClosureCue,
                  },
                )
                ?? projectStatePersistence.nextFocusSummary,
              emotionalClosureCue:
                canonicalResidentProjectState.emotionalClosureCue
                ?? projectStatePersistence.emotionalClosureCue,
            }
            const persistedDerivedMindStateBundle
              = latestRuntimeSurface.memory?.derivedMindStateBundle
                ?? persistedPresenceState.derivedMindStateBundle
                ?? null
            const persistedAffectiveResidue
              = latestRuntimeSurface.memory?.affectiveResidue
                ?? persistedDerivedMindStateBundle?.affectiveResidue
                ?? persistedPresenceState.affectiveResidue
                ?? persistedPresenceState.derivedMindStateBundle?.affectiveResidue
                ?? null
            const persistedSelfEvolution
              = latestRuntimeSurface.memory?.selfEvolution
                ?? persistedDerivedMindStateBundle?.selfEvolution
                ?? persistedPresenceState.selfEvolution
                ?? persistedPresenceState.derivedMindStateBundle?.selfEvolution
                ?? null
            const persistedSelfState
              = latestRuntimeSurface.agency?.selfState
                ?? persistedPresenceState.selfState
                ?? null
            const persistedEmotionalKernel = rebuildPresenceOnlyPersistedEmotionalKernel({
              initiative: persistedInitiative,
              privateThought: persistedPrivateThought,
              selfState: persistedSelfState,
              affectiveResidue: persistedAffectiveResidue,
              personStateProjection: resolvedPersonStateProjection,
              selfEvolution: persistedSelfEvolution,
              projectState:
                resolvedCurrentConsciousFrame?.projectState
                ?? canonicalResidentProjectState
                ?? null,
              derivedMindStateBundle: persistedDerivedMindStateBundle,
              fallbackEmotionalKernel:
                latestRuntimeSurface.memory?.emotionalKernel
                ?? persistedPresenceState.emotionalKernel
                ?? null,
            })
            const nextPresenceState = updateVisualPresenceState({
              now,
              previousState: persistedPresenceState,
              watchMode: persistedPresenceState.watchMode,
              scene: persistedPresenceState.currentScene,
              attention: persistedPresenceState.attention,
              mindTurnFrame: latestRuntimeSurface.memory?.mindTurnFrame ?? null,
              worldModel: latestRuntimeSurface.world.worldModel ?? null,
              motiveEngine: latestRuntimeSurface.mind?.motiveEngine ?? null,
              habitPolicy: latestRuntimeSurface.mind?.habitPolicy ?? null,
              threadRuntime: latestRuntimeSurface.dialogue?.threadRuntime ?? null,
              conversationState: latestRuntimeSurface.dialogue?.conversationState ?? null,
              dialogueWorldThread: latestRuntimeSurface.dialogue?.dialogueWorldThread ?? null,
              answerCompiler: latestRuntimeSurface.dialogue?.answerCompiler ?? null,
              personStateProjection: resolvedPersonStateProjection,
              currentConsciousFrame: resolvedCurrentConsciousFrame,
              replyDeliberation: latestRuntimeSurface.dialogue?.replyDeliberation ?? null,
              selfState: persistedSelfState,
              selfEvolution: persistedSelfEvolution,
              affectiveResidue: persistedAffectiveResidue,
              autonomy: latestRuntimeSurface.agency?.autonomy ?? null,
              derivedMindStateBundle: persistedDerivedMindStateBundle,
              privateThought: persistedPrivateThought,
              emotionalKernel: persistedEmotionalKernel,
              captureState: persistedPresenceState.captureState,
              durabilityPulse: persistedPresenceState.durabilityPulse,
              recentTransition: persistedPresenceState.recentTransition,
              nextSuggestedProbeMs: persistedPresenceState.nextSuggestedProbeMs,
              initiative: persistedInitiative,
            })
            if (persistedPresenceRuntimeSnapshot) {
              nextPresenceState.runtimeDigest = persistedPresenceRuntimeSnapshot as typeof nextPresenceState.runtimeDigest
              if (nextPresenceState.runtimeDigest.projectState) {
                const continuityArcStage
                  = typeof nextPresenceState.runtimeDigest.projectState.continuityArcStage === 'string'
                    ? nextPresenceState.runtimeDigest.projectState.continuityArcStage
                    : 'same-thread-continuation'
                const continuityPreferredTiming
                  = typeof nextPresenceState.runtimeDigest.projectState.continuityPreferredTiming === 'string'
                    ? nextPresenceState.runtimeDigest.projectState.continuityPreferredTiming
                    : 'next-open-window'
                nextPresenceState.runtimeDigest.projectState = {
                  ...nextPresenceState.runtimeDigest.projectState,
                  identity: canonicalResidentProjectState.identity,
                  currentPhase: canonicalResidentProjectState.currentPhase,
                  latestLandedProgress: canonicalResidentProjectState.latestLandedProgress,
                  latestProgress:
                    typeof persistedPresenceRuntimeProjectState?.latestProgress === 'string'
                    && persistedPresenceRuntimeProjectState.latestProgress.trim().length > 0
                      ? persistedPresenceRuntimeProjectState.latestProgress
                      : canonicalResidentProjectState.latestLandedProgress,
                  primaryOpenLoop: canonicalResidentProjectState.primaryOpenLoop,
                  nextClosureTarget: canonicalResidentProjectState.nextClosureTarget,
                  sameHerSelfLine: canonicalResidentProjectState.sameHerSelfLine,
                  sameHerDriftRisk:
                    preferPresenceOnlyHoldSameHerDriftRisk({
                      current: canonicalResidentProjectState.sameHerDriftRisk,
                      candidate:
                        activeSelfRevisionPatch?.projectStateContinuity?.sameHerDriftRisk
                        ?? (
                          /generic assistant shell|generic helper shell|generic helper voice|project-summary voice|same-her drift|same her drift|continuity drift|closure drift|generic guidance/i.test(
                            normalizePresenceOnlyHoldCarryText(resolvedProjectContinuityCue, 320).toLowerCase(),
                          )
                            ? resolvedProjectContinuityCue
                            : null
                        ),
                    }) || canonicalResidentProjectState.sameHerDriftRisk,
                  preflightSummary: canonicalResidentProjectState.preflightSummary,
                  preDialogueAwarenessLine:
                    looksLikeSameHerClosureSummary(canonicalResidentProjectState.preDialogueAwarenessLine)
                    && projectStatePersistence.preDialogueAwarenessLine
                      ? projectStatePersistence.preDialogueAwarenessLine
                      : canonicalResidentProjectState.preDialogueAwarenessLine,
                  awarenessLine:
                    canonicalResidentProjectState.awarenessLine
                    ?? canonicalResidentProjectState.preDialogueAwarenessLine
                    ?? nextPresenceState.runtimeDigest.projectState.awarenessLine
                    ?? null,
                  companionHeadlineLine:
                    canonicalResidentProjectState.companionHeadlineLine
                    ?? canonicalResidentProjectState.preDialogueAwarenessLine
                    ?? nextPresenceState.runtimeDigest.projectState.companionHeadlineLine
                    ?? null,
                  emotionalClosureCue:
                    canonicalResidentProjectState.emotionalClosureCue
                    ?? projectStatePersistence.emotionalClosureCue
                    ?? null,
                  continuityRestraint: persistedInitiative?.continuityRestraint ?? nextPresenceState.runtimeDigest.projectState.continuityRestraint ?? null,
                  continuityArcStage,
                  continuityPreferredTiming,
                  continuityCadence: persistedInitiative?.continuityRestraint ?? nextPresenceState.runtimeDigest.projectState.continuityCadence ?? null,
                  continuityCue: resolvedProjectContinuityCue,
                }
                nextPresenceState.runtimeDigest.continuityRestraint
                  = persistedInitiative?.continuityRestraint
                    ?? nextPresenceState.runtimeDigest.continuityRestraint
                    ?? null
                nextPresenceState.runtimeDigest.activeLoop = nextPresenceState.runtimeDigest.activeLoop ?? {
                  version: 'alicization-active-loop-v1',
                  phase: 'continuity-hold',
                  dominantChannel: 'active-memory',
                  handoffTarget: 'active-memory',
                  continuityArcStage,
                  continuityPreferredTiming,
                  dialogueReady: false,
                  controlReady: false,
                  memoryCarry: true,
                  companionshipReady: true,
                  observationHeavy: false,
                  initiativeBudget: 0.24,
                  coherence: 0.74,
                  summary: 'presence-only same-thread continuity hold stays on active-memory before reopening',
                }
              }
            }
            if (!nextPresenceState.currentConsciousFrame && persistedPresenceRuntimeSnapshot?.currentConsciousFrame) {
              nextPresenceState.currentConsciousFrame = persistedPresenceRuntimeSnapshot.currentConsciousFrame as typeof nextPresenceState.currentConsciousFrame
            }
            if (!nextPresenceState.initiative && persistedInitiative) {
              nextPresenceState.initiative = persistedInitiative as typeof nextPresenceState.initiative
            }
            if (!nextPresenceState.personStateProjection && continuityProjectionFallback) {
              nextPresenceState.personStateProjection = continuityProjectionFallback as typeof nextPresenceState.personStateProjection
            }
            const nextPresenceStateWithBodyAuthority = bodyKernel.applyToVisualPresenceState({
              now,
              previousState: persistedPresenceState,
              candidateState: {
                ...nextPresenceState,
                emotionalTransitionDecay,
              },
              activeConversation: false,
            })
            let nextPresenceStateToPersist = nextPresenceStateWithBodyAuthority
            try {
              const presenceExpression = await buildAlicizationPresenceExpression({
                trigger: 'presence-only-hold',
                previousState: persistedPresenceState,
                state: nextPresenceStateWithBodyAuthority,
                now,
                generate: generatePresenceExpression,
              })
              if (presenceExpression) {
                nextPresenceStateToPersist = {
                  ...nextPresenceStateWithBodyAuthority,
                  presenceExpression,
                }
              }
            }
            catch {
              nextPresenceStateToPersist = nextPresenceStateWithBodyAuthority
            }
            await persistVisualPresenceState(activeCardId, nextPresenceStateToPersist)
            visualPresenceState = nextPresenceStateToPersist
          }
          catch (error) {
            await appendAuditLog({
              level: 'warning',
              category: 'alicization.subconscious',
              action: 'proactive-presence-only-persist-failed',
              message: 'Failed to persist presence-only proactive continuity into visual presence state.',
              payload: {
                turnId,
                reason: errorMessageFrom(error) ?? 'unknown-error',
              },
            })
          }
          syncAgentTurnSessionMirror({
            agentTurn: backgroundAgentTurn,
            cardId: activeCardId,
            continuitySignals: [
              resolveDeferredAutonomyContinuitySignal({
                now,
                turnId,
                scenario: structured?.proactive?.scenario ?? decision.scenario,
                reason: proactiveVisibleUtterance.decision.reason,
                projectState: deferredAutonomyProjectState,
                autonomy: committedDigitalLifeSpine.current.runtimeSurface.agency.autonomy ?? null,
              }),
            ],
            sessionId: await ensureActiveOrLatestSessionId(activeCardId),
            source: 'proactive-deferred',
          })
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.subconscious',
            action: 'proactive-visible-utterance-deferred',
            message: 'Deferred proactive visible utterance because normal visible proactive text must be mind-authored.',
            payload: {
              turnId,
              decision: {
                action: proactiveVisibleUtterance.decision.action,
                reason: proactiveVisibleUtterance.decision.reason,
              },
              decisionDetails: proactiveVisibleUtterance.decision,
              projectStatePreflightSummary: projectStatePersistence.preflightSummary,
              projectStateEmotionalClosureCue: projectStatePersistence.emotionalClosureCue,
              projectStatePrimaryOpenLoop: projectStatePersistence.primaryOpenLoop,
              realization: proactiveVisibleUtterance.visibleReplyRealization,
              visibleReplyRealization: proactiveVisibleUtterance.visibleReplyRealization,
            },
          })
        }
        else {
          proactive = true
          const deliveredSessionId = await ensureActiveOrLatestSessionId(activeCardId)
          const proactiveStructuredForPersistence = proactiveVisibleUtterance.structuredForPersistence
            ? {
                ...proactiveVisibleUtterance.structuredForPersistence,
                digitalLifeSpine: proactiveVisibleUtterance.structuredForPersistence.digitalLifeSpine
                  ?? projectAlicizationDigitalLifeSpineDigest(committedDigitalLifeSpine.current),
                projectState: projectStatePersistence,
              }
            : proactiveVisibleUtterance.structuredForPersistence
          const performanceManifest = await getPerformanceManifest()
          const normalizedProactiveDialoguePayload = proactiveStructuredForPersistence
            ? normalizeDialogueRespondedPayload({
                turnId,
                sessionId: deliveredSessionId,
                assistantText: proactiveVisibleUtterance.assistantText,
                structured: proactiveStructuredForPersistence,
                origin: proactiveOrigin,
                createdAt: now,
              }, performanceManifest, {
                residentPerformance: visualPresenceState?.residentPerformance ?? null,
              })
            : null
          const persistedStructured = normalizedProactiveDialoguePayload?.structured
            ? {
                ...proactiveStructuredForPersistence,
                ...normalizedProactiveDialoguePayload.structured,
                projectState: projectStatePersistence,
                digitalLifeSpine: normalizedProactiveDialoguePayload.structured.digitalLifeSpine
                  ?? proactiveStructuredForPersistence?.digitalLifeSpine
                  ?? projectAlicizationDigitalLifeSpineDigest(committedDigitalLifeSpine.current),
              }
            : proactiveStructuredForPersistence
          const persisted = await appendConversationTurnWithGuards({
            turnId,
            sessionId: deliveredSessionId,
            assistantText: proactiveVisibleUtterance.assistantText,
            structured: persistedStructured,
            origin: proactiveOrigin,
            createdAt: now,
          })
          if (!persisted) {
            proactive = false
          }
          else {
            nextState.boredom = clampNeed(nextState.boredom * 0.35)
            nextState.loneliness = clampNeed(nextState.loneliness * 0.4)
            nextState.fatigue = clampNeed(nextState.fatigue + 5)
            outwardProactiveTriggered = true
            syncAgentTurnSessionMirror({
              agentTurn: backgroundAgentTurn,
              cardId: activeCardId,
              continuitySignals: structured.proactive
                ? [buildPendingProactiveContinuitySignal({
                    now,
                    pending: {
                      turnId,
                      scenario: structured.proactive.scenario,
                      deliveredAt: now,
                      feedbackWindowMs: structured.proactive.feedbackWindowMs,
                    },
                  })]
                : undefined,
              sessionId: deliveredSessionId,
              source: 'proactive',
            })
            await appendAuditLog({
              level: 'notice',
              category: 'alicization.subconscious',
              action: 'proactive-triggered',
              message: 'Generated proactive dialogue from the Epoch 3 policy loop.',
              payload: {
                turnId,
                decision: {
                  shouldInterrupt: decision.shouldInterrupt,
                  confidence: decision.confidence,
                  urgency: decision.urgency,
                  style: deliveryDecision.style,
                  cooldownMs: decision.cooldownMs,
                  scenario: decision.scenario,
                  policyVersion: decision.policyVersion,
                },
                reasonCodes: decision.reasonCodes,
                style: deliveryDecision.style,
                format: structured.format,
                proactive: structured.proactive ?? null,
                emotion: structured.emotion,
                trigger,
                agentRuntime: buildAgentRuntimeAuditSnapshot(backgroundAgentTurn),
              },
            })
          }
        }
      }
    }

    const shouldPersist = trigger === 'force'
      || proactive
      || suppressed
      || now - nextState.lastSavedAt >= alicizationSubconsciousPersistMs
    const latestProactiveLoopState = await ensureProactiveLoopState(activeCardId)
    await persistProactiveLoopState(activeCardId, latestProactiveLoopState)
    if (shouldPersist) {
      nextState.lastSavedAt = now
      await persistSubconsciousState(activeCardId, nextState)
    }
    else {
      setSubconsciousStateCache(activeCardId, nextState)
    }
    return { proactive, outwardProactiveTriggered, suppressed }
  }

  return {
    runSubconsciousTickForCurrentCard,
  }
}
