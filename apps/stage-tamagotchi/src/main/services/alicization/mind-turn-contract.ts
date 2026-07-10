import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationAnswerPlannerSnapshot,
  AlicizationMindTurnContractSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationResponseCharter } from './response-charter'
import type { AlicizationResponseSurfaceContract } from './response-surface-contract'

import {
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
  formatAlicizationProjectStateAwarenessFields,
  isAlicizationThinProjectAwarenessLine,
  normalizeAlicizationNormalVisibleReplyAuthority,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
import {
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
} from './project-state-brief'
import { preferProjectStateSpecificClosureSummary } from './project-state-closure-preference'
import { resolveCanonicalStructuredProjectState } from './structured-project-state'

function uniqueList(values: Array<string | null | undefined>, maxItems = 12) {
  const result: string[] = []
  for (const value of values) {
    const normalized = typeof value === 'string'
      ? value.trim().replace(/\s+/g, ' ')
      : ''
    if (!normalized)
      continue
    if (result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function normalizeMindTurnContractText(raw: unknown, maxChars = 320) {
  let normalized = typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
    : ''
  if (!normalized)
    return ''

  normalized = normalized
    .replace(/\s*(?:[|;,]\s*)?visibility=internal(?:[-_][a-z0-9]+)?\.?/giu, '')
    .replace(/\s{2,}/gu, ' ')
    .replace(/\s+\|/gu, ' |')
    .replace(/\|\s*$/u, '')
    .trim()
  if (!normalized)
    return ''

  if (/\blocal_desktop_life_loop\b|phase1_local_digital_life|content=excluded/iu.test(normalized))
    return ''

  if (containsAlicizationFixedTemplateResidue(normalized))
    return ''

  if (/^thin runtime (?:progress|open|next) only$/iu.test(normalized))
    return ''

  return normalized
}

function normalizeProviderFacingMindTurnText(raw: unknown, maxChars = 320) {
  return sanitizeAlicizationProviderFacingText(raw, maxChars)
}

function normalizeProviderFacingProjectAwarenessText(raw: unknown, maxChars = 320) {
  return normalizeMindTurnContractText(
    sanitizeAlicizationProviderFacingText(raw, maxChars, ''),
    maxChars,
  )
}

function providerFacingMindTurnField(key: string, raw: unknown, maxChars = 320) {
  const normalized = normalizeProviderFacingMindTurnText(raw, maxChars)
  return normalized && normalized !== alicizationFixedTemplateReplacement
    ? `${key}=${normalized}`
    : ''
}

function looksProviderFacingStructuredControl(value: string) {
  const normalized = value.trim().replace(/[.。]+$/u, '')
  return /^[\w.:-]+=[^!?。！？]*?(?:[;|,]\s*[\w.:-]+=[^!?。！？]*?)*$/iu.test(normalized)
    || /^[\w.:-]+$/iu.test(normalized)
}

function providerFacingStructuredMindTurnField(key: string, raw: unknown, maxChars = 320) {
  const normalized = normalizeProviderFacingMindTurnText(raw, maxChars)
  if (!normalized || normalized === alicizationFixedTemplateReplacement)
    return ''
  if (looksProviderFacingStructuredControl(normalized))
    return `${key}=${normalized}`
  return ''
}

function renderProviderFacingMindTurnListItem(raw: unknown) {
  const normalized = normalizeProviderFacingMindTurnText(raw, 360)
  if (!normalized || normalized === alicizationFixedTemplateReplacement)
    return ''
  if (looksProviderFacingStructuredControl(normalized))
    return `- ${normalized}`
  return ''
}

function normalizeContractControlItem(raw: unknown) {
  const normalized = normalizeMindTurnContractText(raw, 360)
  if (!normalized)
    return ''

  const providerSafe = normalizeProviderFacingMindTurnText(normalized, 360)
  if (!providerSafe || providerSafe === alicizationFixedTemplateReplacement)
    return ''

  return normalized
}

function uniqueContractControlItems(values: Array<unknown>, maxItems = 24) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeContractControlItem(value)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function normalizeMindTurnContractVoiceMode(
  raw: unknown,
): NonNullable<AlicizationMindTurnContractSnapshot['projectState']>['preferredVoiceMode'] {
  const normalized = normalizeMindTurnContractText(raw, 32)
  return normalized === 'lower-pressure' || normalized === 'even'
    ? normalized
    : null
}

function normalizeMindTurnContractPacingMode(
  raw: unknown,
): NonNullable<AlicizationMindTurnContractSnapshot['projectState']>['preferredPacingMode'] {
  const normalized = normalizeMindTurnContractText(raw, 32)
  return normalized === 'slower' || normalized === 'natural'
    ? normalized
    : null
}

function isCompactClosureOnlyPreflight(value: string | null | undefined) {
  const normalized = normalizeMindTurnContractText(value, 320)
  if (!normalized)
    return false

  return /^open=.*\|\s*next=/u.test(normalized)
}

function looksLikeThinProjectIdentityShell(value: unknown) {
  const normalized = normalizeMindTurnContractText(value, 320).toLowerCase()
  if (!normalized)
    return true

  if (normalized === 'runtime_personhood')
    return false

  return normalized === 'project'
    || normalized === 'digital life project'
    || normalized === 'this local-first digital life project'
    || !normalized.includes('alicization is a local-first digital life project')
}

function looksLikeThinProviderFacingProjectAwarenessShell(value: unknown) {
  const normalized = normalizeMindTurnContractText(value, 1600)
  if (!normalized)
    return true

  const lowered = normalized.toLowerCase()
  return isAlicizationThinProjectAwarenessLine(lowered)
    || /^before answering, remember:\s*alicization is a local-first digital life project building one continuous "her"\.?$/u.test(normalized)
    || /keep this same digital life project in view/u.test(lowered)
    || /same digital life \| keep the closure seam explicit/u.test(lowered)
    || /detached project shell/u.test(lowered)
}

function buildProviderFacingProjectPreflightLine(input: {
  identity?: string | null
  preflightSummary?: string | null
}) {
  const identity = normalizeMindTurnContractText(input.identity, 320)
  const preflightSummary = typeof input.preflightSummary === 'string'
    ? input.preflightSummary.trim().slice(0, 1600)
    : ''
  if (!identity && !preflightSummary)
    return ''
  if (!preflightSummary)
    return identity
  if (isCompactClosureOnlyPreflight(preflightSummary))
    return [identity, preflightSummary].filter(Boolean).join(' | ')
  return preflightSummary
}

function pickProjectStateField(primary: unknown, fallback: unknown, maxChars = 1600) {
  const primaryText = normalizeMindTurnContractText(primary, maxChars)
  if (primaryText)
    return primaryText
  return normalizeMindTurnContractText(fallback, maxChars)
}

function preferProjectStateHoldDetail(primary: unknown, fallback: unknown, maxChars = 320) {
  const primaryText = normalizeMindTurnContractText(primary, maxChars)
  const fallbackText = normalizeMindTurnContractText(fallback, maxChars)
  if (!primaryText)
    return fallbackText
  if (!fallbackText)
    return primaryText
  if (primaryText === fallbackText)
    return primaryText

  return preferStrongerContinuityClosureAuthority(primaryText, fallbackText)
    || primaryText
}

function pickLiveProjectStateField(primary: unknown, persisted: unknown, fallback: unknown, maxChars = 1600) {
  const primaryText = normalizeMindTurnContractText(primary, maxChars)
  if (primaryText)
    return primaryText

  const persistedText = normalizeMindTurnContractText(persisted, maxChars)
  if (persistedText)
    return persistedText

  return normalizeMindTurnContractText(fallback, maxChars)
}

function preferSpecificLatestLandedProgress(primary: unknown, fallback: unknown, canonicalFallback: unknown) {
  const primaryText = normalizeMindTurnContractText(primary, 12000)
  const fallbackText = normalizeMindTurnContractText(fallback, 12000)
  const canonicalFallbackText = normalizeMindTurnContractText(canonicalFallback, 12000)
  const primaryCarriesSameSessionMirror = /same-session mirror carry/iu.test(primaryText)
  const fallbackCarriesSameSessionMirror = /same-session mirror carry/iu.test(fallbackText)
  const primaryLooksBroadCanonical = /^continuity, memory, execution,/iu.test(primaryText)
  const fallbackLooksBroadCanonical = /^continuity, memory, execution,/iu.test(fallbackText)
  const fallbackLooksMoreSpecific = Boolean(
    fallbackCarriesSameSessionMirror
    && (!primaryCarriesSameSessionMirror || primaryLooksBroadCanonical),
  )
  const primaryLooksMoreSpecificThanFallback = Boolean(
    primaryCarriesSameSessionMirror
    && !primaryLooksBroadCanonical
    && (
      !fallbackCarriesSameSessionMirror
      || fallbackLooksBroadCanonical
    ),
  )

  if (fallbackLooksMoreSpecific)
    return fallbackText
  if (primaryLooksMoreSpecificThanFallback)
    return primaryText

  return preferProjectStateSpecificClosureSummary({
    canonical: primaryText,
    persisted: fallbackText,
    canonicalFallback: canonicalFallbackText,
  })
}

function preferStrongerProjectStateLine(primary: unknown, fallback: unknown, maxChars = 320) {
  const primaryText = normalizeMindTurnContractText(primary, maxChars)
  const fallbackText = normalizeMindTurnContractText(fallback, maxChars)
  if (!primaryText)
    return fallbackText
  if (!fallbackText)
    return primaryText

  const strength = (value: string) => {
    let score = value.length >= 120 ? 2 : value.length >= 72 ? 1 : 0
    if (/local_desktop_life_loop|identity_continuity|continuity_(?:anchor|line|hold|drift_risk)|project_state_continuity|cross_modal_continuity_proof|memory_dialogue_embodiment_closure|callback_continuity/u.test(value))
      score += 3
    if (/voice|face|motion|lipsync|cross-modal|embodiment closure|unfinished closure|still-open|initiative and embodiment closure/u.test(value))
      score += 2
    if (/generic reminder|generic guidance|keep the same digital life project in view|same digital life \| keep the closure seam explicit/u.test(value))
      score -= 2
    if (containsAlicizationFixedTemplateResidue(value))
      score -= 5
    if (/\bthin\b|should not outrank|generic project shell|generic project summary/u.test(value))
      score -= 3
    return score
  }

  const primaryScore = strength(primaryText.toLowerCase())
  const fallbackScore = strength(fallbackText.toLowerCase())
  if (primaryScore === fallbackScore)
    return primaryText.length >= fallbackText.length ? primaryText : fallbackText
  return primaryScore > fallbackScore ? primaryText : fallbackText
}

function isExactProjectAwareContinuityLine(value: unknown) {
  const normalized = normalizeMindTurnContractText(value, 320)
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(normalized))
    return false
  return /local_desktop_life_loop|identity_continuity|continuity_(?:anchor|line|hold)|project_state_continuity|cross_modal_continuity_proof|memory_dialogue_embodiment_closure|callback_continuity/iu.test(normalized)
    && /initiative|embodiment|execution continuity|still-open closure|closure_status=unfinished|open_loop|unresolved_closure/iu.test(normalized)
}

function preferProviderFacingAwarenessField(input: {
  conscious?: unknown
  spine?: unknown
  runtimeDigest?: unknown
  fallback?: unknown
  companionHeadline?: unknown
  maxChars?: number
}) {
  const maxChars = input.maxChars ?? 320
  const candidates = [
    normalizeProviderFacingProjectAwarenessText(input.conscious, maxChars),
    normalizeProviderFacingProjectAwarenessText(input.spine, maxChars),
    normalizeProviderFacingProjectAwarenessText(input.runtimeDigest, maxChars),
    normalizeProviderFacingProjectAwarenessText(input.fallback, maxChars),
    normalizeProviderFacingProjectAwarenessText(input.companionHeadline, maxChars),
  ].filter(Boolean)

  if (candidates.length === 0)
    return null

  let best = candidates[0]!
  for (const candidate of candidates.slice(1)) {
    const candidateScore = preferStrongerProjectStateLine(candidate, best, maxChars)
    if (candidateScore === candidate)
      best = candidate
  }

  return best
}

function preferLiveProjectStateTarget(primary: unknown, fallback: unknown, canonicalFallback: unknown, maxChars = 1600) {
  const primaryText = normalizeMindTurnContractText(primary, maxChars)
  if (primaryText)
    return primaryText

  const fallbackText = normalizeMindTurnContractText(fallback, maxChars)
  if (fallbackText)
    return fallbackText

  return normalizeMindTurnContractText(canonicalFallback, maxChars)
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

const projectStateEvidenceKeys = [
  'identity',
  'currentPhase',
  'preflightSummary',
  'preDialogueAwarenessLine',
  'awarenessLine',
  'preDialogueAwarenessSummary',
  'companionHeadlineLine',
  'companionBriefingLine',
  'latestLandedProgress',
  'latestProgress',
  'landedProgressSummary',
  'primaryOpenLoop',
  'openClosureSummary',
  'nextClosureTarget',
  'nextClosureTargetSummary',
  'sameHerSelfLine',
  'sameHerHoldDetail',
  'continuityArcStage',
  'continuityCue',
  'sameHerDriftRisk',
  'sameHerDriftRiskSummary',
  'emotionalClosureCue',
  'emotionalClosureSummary',
  'continuityRestraint',
  'continuityPreferredTiming',
  'continuityCadence',
  'preferredBlinkCadence',
  'preferredGazeMode',
  'preferredVoiceMode',
  'preferredPacingMode',
] as const

function canonicalProjectStateBriefValues(projectStateBrief: ReturnType<typeof resolveAlicizationProjectStateBrief>) {
  return new Set(
    [
      projectStateBrief.identity,
      projectStateBrief.currentPhase,
      projectStateBrief.preflightSummary,
      projectStateBrief.preDialogueAwarenessLine,
      projectStateBrief.latestProgress,
      projectStateBrief.continuityProgressSummary,
      ...(projectStateBrief.memoryAnthropomorphismProgress ?? []),
      ...(projectStateBrief.openLoops ?? []),
      projectStateBrief.nextClosureTarget,
      projectStateBrief.sameHerSelfLine,
      projectStateBrief.sameHerDriftRisk,
      projectStateBrief.emotionalClosureCue,
      projectStateBrief.preferredVoiceMode,
      projectStateBrief.preferredPacingMode,
    ]
      .map(value => normalizeMindTurnContractText(value, 12000))
      .filter(Boolean),
  )
}

function hasLiveProjectStateEvidence(
  projectStateBrief: ReturnType<typeof resolveAlicizationProjectStateBrief>,
  candidates: unknown[],
) {
  const canonicalValues = canonicalProjectStateBriefValues(projectStateBrief)

  for (const candidate of candidates) {
    if (!isRecordLike(candidate))
      continue

    for (const key of projectStateEvidenceKeys) {
      const raw = candidate[key]
      if (typeof raw !== 'string')
        continue
      if (containsAlicizationFixedTemplateResidue(raw))
        continue

      const normalized = normalizeMindTurnContractText(raw, 12000)
      if (!normalized)
        continue

      const providerSafe = sanitizeAlicizationProviderFacingText(raw, 12000, '')
      if (!providerSafe || providerSafe === alicizationFixedTemplateReplacement)
        continue
      if (containsAlicizationFixedTemplateResidue(providerSafe))
        continue
      if (/\blocal_desktop_life_loop\b|phase1_local_digital_life|content=excluded|visibility=internal[-_][a-z0-9]+/iu.test(providerSafe))
        continue

      if (canonicalValues.has(normalized))
        continue
      if (canonicalValues.has(normalizeMindTurnContractText(providerSafe, 12000)))
        continue
      if (/^(?:lower-pressure|slower|natural|even)$/iu.test(normalized))
        continue

      return true
    }
  }

  return false
}

function normalizeProviderFacingProjectStateFactValue(key: string, raw: unknown, maxChars = 1600) {
  const normalized = normalizeMindTurnContractText(raw, maxChars)
  if (!normalized)
    return ''

  const lower = normalized.toLowerCase()
  const normalizedKey = key.toLowerCase()

  if (
    normalizedKey === 'identity'
    && (
      /\bphase1_local_digital_life\b/iu.test(normalized)
      || /local-first digital life|local first digital life|host-resident identity|not_chat_wrapper/iu.test(normalized)
    )
  ) {
    return ''
  }

  if (
    normalizedKey === 'phase'
    && (
      /\bphase1_local_digital_life\b/iu.test(normalized)
      || /phase\s*1\s*:\s*local digital life|proving_ground=apps\/stage-tamagotchi|local digital life/iu.test(normalized)
    )
  ) {
    return ''
  }

  if (normalizedKey === 'continuity_anchor') {
    if (
      /\bphase1_local_digital_life\b/iu.test(normalized)
      || /same phase 1 digital life|one same her|same her|same project line|local-first digital life/iu.test(normalized)
    ) {
      return ''
    }
  }

  if (normalizedKey === 'open') {
    if (/repair-first callback continuity|repair_first_callback/iu.test(normalized))
      return 'repair_first_callback_continuity_closure'
    if (/voice.*face.*motion|face.*motion.*lipsync|audible and visible body cues/iu.test(normalized))
      return 'embodiment_continuity_closure'
    if (
      /memory_dialogue_embodiment_closure|unresolved_closure=memory_dialogue_embodiment/iu.test(normalized)
      || (
        lower.includes('memory')
        && lower.includes('embodiment')
        && (
          lower.includes('initiative')
          || lower.includes('dialogue')
          || lower.includes('across turns')
          || lower.includes('end-to-end closure')
        )
      )
    ) {
      return 'memory_dialogue_embodiment_closure'
    }
    if (/returned visible reply.*preserve.*hold|returned visible reply.*continuity/iu.test(normalized))
      return 'visible_reply_continuity_hold_closure'
  }

  if (normalizedKey === 'landed') {
    if (/same-session mirror carry|callback continuity/iu.test(normalized))
      return 'same_session_mirror_carry'
    if (/project awareness already survives|project-state continuity already survives|project-state carry|provider-facing project-state|current conscious frame/iu.test(normalized))
      return 'project_state_awareness_carry'
  }

  if (normalizedKey === 'next') {
    if (/^cross_modal_continuity_proof\s*=/iu.test(normalized))
      return normalized
    if (
      /cross[-_ ]modal|visible reply|voice|face|motion|resident presence|cross_modal_continuity_proof/iu.test(normalized)
      && /proof|continuity|line|same[- ]her|identity|visible reply|resident presence/iu.test(normalized)
    ) {
      return 'cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs'
    }
    if (/callback repair seam|execution re-entry/iu.test(normalized))
      return 'execution_reentry_repair_seam_carry'
    if (/pre-dialogue awareness line explicit|first host-visible answer beat/iu.test(normalized))
      return 'pre_dialogue_awareness_visible_reply_carry'
    if (/live project awareness line.*current turn|current turn.*project awareness/iu.test(normalized))
      return 'current_turn_project_awareness_carry'
    if (/returned-side.*continuity_proof|returned-side.*proof/iu.test(normalized))
      return 'returned_side_continuity_proof'
  }

  if (normalizedKey === 'continuity_hold')
    return normalized.replace(/\bone-continuous-her\b/giu, 'project_state_continuity')

  if (normalizedKey === 'continuity_drift_risk') {
    if (/generic guidance|detached project|project-summary voice|same-her drift|generic shell/iu.test(normalized))
      return 'continuity_drift_risk=generic_shell'
  }

  return normalized
}

function formatProviderFacingProjectStateAwarenessFields(input: {
  identity?: unknown
  currentPhase?: unknown
  latestLandedProgress?: unknown
  primaryOpenLoop?: unknown
  nextClosureTarget?: unknown
  continuityAnchor?: unknown
  sameHerHoldDetail?: unknown
  sameHerDriftRisk?: unknown
  proactiveSameHerGap?: unknown
  emotionalClosureCue?: unknown
  status?: unknown
  summary?: unknown
  visibility?: string
  maxChars?: number
}) {
  const maxChars = Number.isFinite(input.maxChars)
    ? Math.max(80, Math.min(2400, Number(input.maxChars)))
    : 800

  return formatAlicizationProjectStateAwarenessFields({
    identity: normalizeProviderFacingProjectStateFactValue('identity', input.identity, maxChars),
    currentPhase: normalizeProviderFacingProjectStateFactValue('phase', input.currentPhase, maxChars),
    latestLandedProgress: normalizeProviderFacingProjectStateFactValue('landed', input.latestLandedProgress, maxChars),
    primaryOpenLoop: normalizeProviderFacingProjectStateFactValue('open', input.primaryOpenLoop, maxChars),
    nextClosureTarget: normalizeProviderFacingProjectStateFactValue('next', input.nextClosureTarget, maxChars),
    continuityAnchor: normalizeProviderFacingProjectStateFactValue('continuity_anchor', input.continuityAnchor, maxChars),
    sameHerHoldDetail: normalizeProviderFacingProjectStateFactValue('continuity_hold', input.sameHerHoldDetail, maxChars),
    sameHerDriftRisk: normalizeProviderFacingProjectStateFactValue('continuity_drift_risk', input.sameHerDriftRisk, maxChars),
    proactiveSameHerGap: normalizeProviderFacingProjectStateFactValue('proactive_gap', input.proactiveSameHerGap, maxChars),
    emotionalClosureCue: normalizeProviderFacingProjectStateFactValue('emotional_closure', input.emotionalClosureCue, maxChars),
    status: normalizeProviderFacingProjectStateAwarenessLine(input.status, maxChars),
    summary: normalizeProviderFacingProjectStateAwarenessLine(input.summary, maxChars),
    visibility: input.visibility,
    maxChars,
  })
}

function normalizeProviderFacingProjectStateAwarenessLine(raw: unknown, maxChars = 1600) {
  const normalized = normalizeProviderFacingProjectAwarenessText(raw, maxChars)
  if (!normalized)
    return ''

  const fields: Record<string, string> = {}
  for (const part of normalized.split(/\s*\|\s*/u)) {
    const match = part.match(/^(\w+)\s*=\s*(.+)$/iu)
    if (!match)
      continue
    fields[match[1]!.toLowerCase()] = match[2]!.trim()
  }

  if (Object.keys(fields).length === 0)
    return normalized

  return normalizeMindTurnContractText(formatProviderFacingProjectStateAwarenessFields({
    identity: fields.identity,
    currentPhase: fields.phase,
    latestLandedProgress: fields.landed,
    primaryOpenLoop: fields.open,
    nextClosureTarget: fields.next ?? fields.next_closure,
    continuityAnchor: fields.continuity_anchor,
    sameHerHoldDetail: fields.continuity_hold,
    sameHerDriftRisk: fields.continuity_drift_risk,
    proactiveSameHerGap: fields.proactive_gap,
    emotionalClosureCue: fields.emotional_closure,
    status: fields.status,
    summary: fields.summary,
    maxChars,
  }), maxChars)
}

function sanitizeProviderFacingProjectFactsBlock(raw: string) {
  const normalized = normalizeProviderFacingProjectAwarenessText(raw, 2400)
  if (!normalized)
    return ''

  const parts = normalized
    .split(/\s*\|\s*/u)
    .map(part => part.trim())
    .filter((part) => {
      if (!part)
        return false
      if (/^(?:identity|phase|continuity_anchor|continuity_hold|continuity_drift_risk|emotional_closure|status|summary)=?$/iu.test(part))
        return false
      if (/\blocal_desktop_life_loop\b|phase1_local_digital_life|content=excluded|visibility=internal[-_]structured/iu.test(part))
        return false
      if (containsAlicizationFixedTemplateResidue(part))
        return false
      return true
    })

  return uniqueList(parts, 12).join(' | ')
}

function buildStructuredPreDialogueClosureBriefingLine(input: {
  identity?: unknown
  currentPhase?: unknown
  latestLandedProgress?: unknown
  primaryOpenLoop?: unknown
  nextClosureTarget?: unknown
  emotionalClosureCue?: unknown
  sameHerSelfLine?: unknown
}) {
  return normalizeMindTurnContractText(formatProviderFacingProjectStateAwarenessFields({
    identity: input.identity,
    currentPhase: input.currentPhase,
    latestLandedProgress: input.latestLandedProgress,
    primaryOpenLoop: input.primaryOpenLoop,
    nextClosureTarget: input.nextClosureTarget,
    continuityAnchor: input.sameHerSelfLine,
    emotionalClosureCue: input.emotionalClosureCue,
    maxChars: 1600,
  }), 1600)
}

function replacePreDialogueClosureNextTarget(input: {
  preDialogueClosure: AlicizationMindTurnContractSnapshot['preDialogueClosure'] | null | undefined
  nextClosureTarget: string | null
  projectState?: AlicizationMindTurnContractSnapshot['projectState'] | null
}) {
  const preDialogueClosure = input.preDialogueClosure ?? null
  if (!preDialogueClosure)
    return null

  const projectStateNextClosureTarget = normalizeProviderFacingProjectStateFactValue(
    'next',
    input.projectState?.nextClosureTarget,
    1600,
  )
  const explicitNextClosureTarget = normalizeProviderFacingProjectStateFactValue('next', input.nextClosureTarget, 1600)
  const nextClosureTarget = normalizeMindTurnContractText(
    projectStateNextClosureTarget
    || explicitNextClosureTarget
    || input.projectState?.nextClosureTarget
    || input.nextClosureTarget,
    1600,
  ) || null
  if (!nextClosureTarget)
    return preDialogueClosure

  return {
    ...preDialogueClosure,
    companionNextClosureLine: nextClosureTarget,
    briefingLines: uniqueList([
      ...(preDialogueClosure.briefingLines ?? []).filter((line) => {
        const normalized = normalizeMindTurnContractText(line, 1600)
        if (containsAlicizationFixedTemplateResidue(normalized))
          return false
        return normalized
          ? !/^(?:Project identity|Current phase|Landed continuity progress|Still-open closure gap|Next closure target):/u.test(normalized)
          : false
      }),
      buildStructuredPreDialogueClosureBriefingLine({
        identity: input.projectState?.identity,
        currentPhase: input.projectState?.currentPhase,
        latestLandedProgress: input.projectState?.latestLandedProgress ?? input.projectState?.latestProgress,
        primaryOpenLoop: input.projectState?.primaryOpenLoop,
        nextClosureTarget,
        emotionalClosureCue: input.projectState?.emotionalClosureCue ?? input.projectState?.emotionalClosureSummary,
        sameHerSelfLine: input.projectState?.sameHerSelfLine,
      }),
    ], 8),
    reasons: uniqueList([
      ...(preDialogueClosure.reasons ?? []).filter((reason) => {
        const normalized = normalizeMindTurnContractText(reason, 1600)
        if (containsAlicizationFixedTemplateResidue(normalized))
          return false
        return normalized ? normalized !== nextClosureTarget : false
      }),
      nextClosureTarget,
    ], 8),
  } satisfies NonNullable<AlicizationMindTurnContractSnapshot['preDialogueClosure']>
}

function deriveEmotionalClosureCue(input: {
  planner?: AlicizationAnswerPlannerSnapshot | null
  charter: AlicizationResponseCharter
  surface: AlicizationResponseSurfaceContract
}) {
  const plannerNarrative = input.planner?.narrative ?? []
  const structuredCue = plannerNarrative
    .find(item => typeof item === 'string' && item.startsWith('emotional_closure:'))
    ?.slice('emotional_closure:'.length)
    .trim()
  if (structuredCue)
    return normalizeEmotionalClosurePolicyCue(structuredCue)

  const plannerMustDo = [...(input.planner?.mustDo ?? []), ...(input.planner?.mustNotDo ?? [])].join(' ').toLowerCase()
  const charterMustDo = [...input.charter.mustDo, ...input.charter.mustNotDo].join(' ').toLowerCase()
  const surfaceMustDo = [...input.surface.mustDo, ...input.surface.mustNotDo].join(' ').toLowerCase()
  const corpus = `${plannerMustDo} ${charterMustDo} ${surfaceMustDo}`

  if (
    corpus.includes('late-night drain')
    || corpus.includes('protect rest')
    || corpus.includes('rest-protective')
    || corpus.includes('late-night protectiveness')
    || corpus.includes('emotionally heavy closeness')
  ) {
    return 'closure_policy=late_night_drain | reply_pressure=low | initiative=rest_protective | embodiment=quiet_companionship'
  }

  if (
    corpus.includes('restless')
    || corpus.includes('single-thread')
    || corpus.includes('parallel branches')
    || corpus.includes('multiple unfinished threads')
    || corpus.includes('one line of motion')
  ) {
    return 'closure_policy=restless_switching | scope=single_thread | initiative=narrowed | embodiment=aligned'
  }

  if (
    corpus.includes('keep emotional closure low-pressure and inward until the live payoff lands')
    && corpus.includes('do not let the answer reopen from scratch just because the closure seam is still active')
  ) {
    return 'closure_policy=settling_cadence | reply_pressure=low | room=preserve | restart=avoid'
  }

  return null
}

function normalizeEmotionalClosurePolicyCue(raw: string) {
  const trimmed = raw.trim().replace(/\s+/g, ' ')
  if (!trimmed)
    return ''
  if (/^late-night-drain closure:/iu.test(trimmed)) {
    return 'closure_policy=late_night_drain | reply_pressure=low | initiative=rest_protective | embodiment=quiet_companionship'
  }
  if (/^restless-switching closure:/iu.test(trimmed)) {
    return 'closure_policy=restless_switching | scope=single_thread | initiative=narrowed | embodiment=aligned'
  }
  if (/^closure cadence:/iu.test(trimmed)) {
    return 'closure_policy=settling_cadence | reply_pressure=low | room=preserve | restart=avoid'
  }
  return normalizeMindTurnContractText(trimmed, 320)
}

function deriveRelationshipTruthDoctrine(input: {
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  planner?: AlicizationAnswerPlannerSnapshot | null
}) {
  const authority = input.runtimeSurface?.memory?.personStateProjection?.selfContinuityAuthority ?? null
  const selfLine = normalizeMindTurnContractText(authority?.selfLine, 220).toLowerCase()
  const relationshipLine = normalizeMindTurnContractText(authority?.relationshipLine, 220).toLowerCase()
  const motiveLine = normalizeMindTurnContractText(authority?.motiveLine, 220).toLowerCase()
  const governingFocus = normalizeMindTurnContractText(input.planner?.governingFocus, 220).toLowerCase()
  const answerIntent = normalizeMindTurnContractText(input.planner?.answerIntent, 220).toLowerCase()
  const corpus = [selfLine, relationshipLine, motiveLine, governingFocus, answerIntent].join(' ')

  if (!/repair truth|truth|closeness outrun truth|warmth answer to truth/u.test(corpus))
    return null

  return uniqueList([
    selfLine.includes('repair truth') || motiveLine.includes('truth') || relationshipLine.includes('truth')
      ? 'truth_priority=repair_before_fluency'
      : null,
    relationshipLine.includes('closeness outrun truth')
      ? 'relationship_boundary=closeness_must_not_outrun_truth'
      : null,
  ], 3).join(' | ') || null
}

function buildMindTurnContractPreDialogueClosure(input: {
  projectStateBrief: ReturnType<typeof resolveAlicizationProjectStateBrief>
  freshestProjectState?: {
    nextClosureTarget?: unknown
  } | null
  liveProjectState?: {
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
    preflightSummary?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    identity?: unknown
    currentPhase?: unknown
    primaryOpenLoop?: unknown
    nextClosureTarget?: unknown
    sameHerDriftRisk?: unknown
    emotionalClosureCue?: unknown
  } | null
}) {
  const rawExplicitPreDialogueAwarenessLine = normalizeMindTurnContractText(
    input.liveProjectState?.preDialogueAwarenessLine
    ?? input.liveProjectState?.awarenessLine
    ?? input.liveProjectState?.preDialogueAwarenessSummary,
    1600,
  )
  const resolvedPreDialogueAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: input.liveProjectState ?? null,
    fallbackProjectState: {
      preDialogueAwarenessLine: input.projectStateBrief.preDialogueAwarenessLine ?? null,
      preflightSummary: input.projectStateBrief.preflightSummary ?? null,
    },
  })
  const explicitPreDialogueAwarenessLine
    = sanitizeAlicizationProviderFacingText(rawExplicitPreDialogueAwarenessLine, 1600, '')
      || (rawExplicitPreDialogueAwarenessLine ? resolvedPreDialogueAwarenessLine ?? '' : '')
  const summaryLine = normalizeProviderFacingProjectStateAwarenessLine(explicitPreDialogueAwarenessLine
    || resolvedPreDialogueAwarenessLine
    || resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: input.liveProjectState ?? null,
      fallbackProjectState: {
        preDialogueAwarenessLine: input.projectStateBrief.preDialogueAwarenessLine ?? null,
        preflightSummary: input.projectStateBrief.preflightSummary ?? null,
      },
    }), 1600)
  const companionBriefingLine = normalizeMindTurnContractText(
    sanitizeAlicizationProviderFacingText(input.liveProjectState?.companionBriefingLine, 320, ''),
    320,
  ) || null
  const landedProgressLine = (
    typeof input.liveProjectState?.latestLandedProgress === 'string'
      ? input.liveProjectState.latestLandedProgress.trim().replace(/\s+/g, ' ')
      : typeof input.liveProjectState?.latestProgress === 'string'
        ? input.liveProjectState.latestProgress.trim().replace(/\s+/g, ' ')
        : ''
  ) || ((
    input.projectStateBrief.continuityProgressSummary
    ?? input.projectStateBrief.memoryAnthropomorphismProgress.at(-1)
    ?? null
  ))
  const identityLine = (
    typeof input.liveProjectState?.identity === 'string'
      ? input.liveProjectState.identity.trim().replace(/\s+/g, ' ')
      : ''
  ) || input.projectStateBrief.identity
  const currentPhaseLine = (
    typeof input.liveProjectState?.currentPhase === 'string'
      ? input.liveProjectState.currentPhase.trim().replace(/\s+/g, ' ')
      : ''
  ) || input.projectStateBrief.currentPhase
  const companionNextClosureLine = (
    typeof input.freshestProjectState?.nextClosureTarget === 'string'
      ? input.freshestProjectState.nextClosureTarget.trim().replace(/\s+/g, ' ')
      : typeof input.liveProjectState?.nextClosureTarget === 'string'
        ? input.liveProjectState.nextClosureTarget.trim().replace(/\s+/g, ' ')
        : ''
  ) || (
    typeof input.liveProjectState?.nextClosureTarget === 'string'
      ? input.liveProjectState.nextClosureTarget.trim().replace(/\s+/g, ' ')
      : ''
  ) || input.projectStateBrief.nextClosureTarget
  const openClosureReason = (
    typeof input.liveProjectState?.primaryOpenLoop === 'string'
      ? input.liveProjectState.primaryOpenLoop.trim().replace(/\s+/g, ' ')
      : ''
  ) || input.projectStateBrief.openLoops[0] || null
  const emotionalClosureCue = (
    typeof input.liveProjectState?.emotionalClosureCue === 'string'
      ? normalizeMindTurnContractText(input.liveProjectState.emotionalClosureCue, 320)
      : ''
  ) || normalizeMindTurnContractText(input.projectStateBrief.emotionalClosureCue, 320) || null
  const structuredSummaryLine = buildStructuredPreDialogueClosureBriefingLine({
    identity: identityLine,
    currentPhase: currentPhaseLine,
    latestLandedProgress: landedProgressLine,
    primaryOpenLoop: openClosureReason,
    nextClosureTarget: companionNextClosureLine,
    emotionalClosureCue,
  })
  const providerFacingSummaryLine = summaryLine && /\bidentity=/iu.test(summaryLine)
    ? summaryLine
    : structuredSummaryLine || summaryLine
  const briefingLines = uniqueList([
    providerFacingSummaryLine,
    structuredSummaryLine,
  ], 8)
  const reasons = uniqueList([
    normalizeProviderFacingProjectStateFactValue('open', openClosureReason, 1600),
    normalizeProviderFacingProjectStateFactValue('landed', landedProgressLine, 1600),
    normalizeProviderFacingProjectStateFactValue('next', companionNextClosureLine, 1600),
  ], 8)
  if (briefingLines.length === 0 && reasons.length === 0)
    return null

  return {
    status: 'partial',
    summaryLine: providerFacingSummaryLine,
    companionBriefingLine,
    companionNextClosureLine: normalizeMindTurnContractText(companionNextClosureLine, 1600) || null,
    emotionalClosureCue,
    briefingLines,
    reasons,
  } satisfies NonNullable<AlicizationMindTurnContractSnapshot['preDialogueClosure']>
}

function compactMindTurnProjectState(projectState: Record<string, unknown>) {
  const next = Object.fromEntries(
    Object.entries(projectState).map(([key, value]) => [key, sanitizeMindTurnProjectStateField(key, value)]),
  )

  if (next.awarenessLine === next.preDialogueAwarenessLine)
    delete next.awarenessLine
  if (next.preDialogueAwarenessSummary === next.preDialogueAwarenessLine)
    delete next.preDialogueAwarenessSummary
  if (next.companionHeadlineLine === next.preDialogueAwarenessLine)
    delete next.companionHeadlineLine
  if (next.companionBriefingLine == null)
    delete next.companionBriefingLine
  if (next.sameHerHoldDetail == null)
    delete next.sameHerHoldDetail
  if (next.emotionalClosureSummary == null)
    delete next.emotionalClosureSummary
  if (next.continuityRestraint == null)
    delete next.continuityRestraint
  if (next.continuityArcStage == null)
    delete next.continuityArcStage
  if (next.continuityCue == null)
    delete next.continuityCue
  if (next.preferredVoiceMode == null)
    delete next.preferredVoiceMode
  if (next.preferredPacingMode == null)
    delete next.preferredPacingMode

  return redactMindTurnProjectStateTemplateResidue(next)
}

function redactMindTurnProjectStateTemplateResidue(projectState: Record<string, unknown>) {
  const next = { ...projectState }
  for (const [key, value] of Object.entries(next)) {
    if (typeof value !== 'string')
      continue
    const normalized = normalizeMindTurnContractText(value, 12000)
    if (!normalized)
      next[key] = null
    else
      next[key] = normalized
  }
  return next
}

function sanitizeMindTurnProjectStateField(key: string, value: unknown) {
  if (typeof value !== 'string')
    return value

  const factKey = ({
    identity: 'identity',
    currentPhase: 'phase',
    latestLandedProgress: 'landed',
    latestProgress: 'landed',
    primaryOpenLoop: 'open',
    nextClosureTarget: 'next',
    sameHerSelfLine: 'continuity_anchor',
    sameHerHoldDetail: 'continuity_hold',
    sameHerDriftRisk: 'continuity_drift_risk',
    emotionalClosureCue: 'emotional_closure',
    emotionalClosureSummary: 'emotional_closure',
  } as Record<string, string | undefined>)[key]
  if (factKey === 'next') {
    const structuredFact = normalizeProviderFacingProjectStateFactValue(factKey, value, 1600)
    if (structuredFact && !containsAlicizationFixedTemplateResidue(structuredFact))
      return structuredFact
  }

  const sanitized = sanitizeAlicizationProviderFacingText(value, 1600, '')
  if (!sanitized)
    return null
  return sanitized
}

export function buildAlicizationMindTurnContract(input: {
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  responseCharter: AlicizationResponseCharter
  responseSurfaceContract: AlicizationResponseSurfaceContract
  projectState?: {
    identity?: string | null
    currentPhase?: string | null
    preflightSummary?: string | null
    preDialogueAwarenessLine?: string | null
    awarenessLine?: string | null
    preDialogueAwarenessSummary?: string | null
    companionHeadlineLine?: string | null
    companionBriefingLine?: string | null
    latestLandedProgress?: string | null
    latestProgress?: string | null
    landedProgressSummary?: string | null
    primaryOpenLoop?: string | null
    openClosureSummary?: string | null
    nextClosureTarget?: string | null
    nextClosureTargetSummary?: string | null
    sameHerSelfLine?: string | null
    sameHerHoldDetail?: string | null
    continuityArcStage?: string | null
    continuityCue?: string | null
    sameHerDriftRisk?: string | null
    sameHerDriftRiskSummary?: string | null
    emotionalClosureCue?: string | null
    emotionalClosureSummary?: string | null
    continuityRestraint?: string | null
    continuityPreferredTiming?: string | null
    continuityCadence?: string | null
    preferredBlinkCadence?: string | null
    preferredGazeMode?: string | null
    preferredVoiceMode?: string | null
    preferredPacingMode?: string | null
  } | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  now?: number
}): AlicizationMindTurnContractSnapshot {
  const planner = input.answerPlanner ?? null
  const compiler = input.answerCompiler ?? null
  const charter = input.responseCharter
  const surface = input.responseSurfaceContract
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const consciousFrameProjectState = input.runtimeSurface?.dialogue?.currentConsciousFrame?.projectState ?? null
  const rawRuntimeDigestProjectState = input.runtimeSurface?.raw?.runtimeDigest?.projectState ?? null
  const cognitionRuntimeDigestProjectState = input.runtimeSurface?.cognition?.runtimeDigest?.projectState ?? null
  const dialogueRuntimeDigestProjectState = input.runtimeSurface?.dialogue?.runtimeDigest?.projectState ?? null
  const runtimeDigestProjectState = {
    ...rawRuntimeDigestProjectState,
    ...cognitionRuntimeDigestProjectState,
    ...dialogueRuntimeDigestProjectState,
  }
  const callbackFollowUpAffordance = input.runtimeSurface?.memory?.memoryDeliberation?.followUpAffordance ?? null
  const spineRuntimeProjectState
    = input.runtimeSurface?.raw?.runtime?.projectState
      ?? input.runtimeSurface?.raw?.projectState
      ?? null
  const runtimeProjectState = {
    ...runtimeDigestProjectState,
    ...spineRuntimeProjectState,
    ...consciousFrameProjectState,
    identity:
      looksLikeThinProjectIdentityShell((consciousFrameProjectState as { identity?: unknown } | null)?.identity)
        ? (normalizeMindTurnContractText((spineRuntimeProjectState as { identity?: unknown } | null)?.identity, 320)
          || normalizeMindTurnContractText((runtimeDigestProjectState as { identity?: unknown } | null)?.identity, 320)
          || null)
        : (normalizeMindTurnContractText((consciousFrameProjectState as { identity?: unknown } | null)?.identity, 320)
          || normalizeMindTurnContractText((spineRuntimeProjectState as { identity?: unknown } | null)?.identity, 320)
          || normalizeMindTurnContractText((runtimeDigestProjectState as { identity?: unknown } | null)?.identity, 320)
          || null),
    latestLandedProgress: preferSpecificLatestLandedProgress(
      normalizeMindTurnContractText((consciousFrameProjectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress, 12000),
      normalizeMindTurnContractText((spineRuntimeProjectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress, 12000)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress, 12000)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { latestProgress?: unknown } | null)?.latestProgress, 12000)
      || null,
      null,
    ),
    primaryOpenLoop: preferProjectStateSpecificClosureSummary({
      canonical: normalizeMindTurnContractText((consciousFrameProjectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop, 1600),
      persisted:
        normalizeMindTurnContractText((spineRuntimeProjectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop, 1600)
        || normalizeMindTurnContractText((runtimeDigestProjectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop, 1600)
        || null,
      canonicalFallback: null,
    }),
    nextClosureTarget: preferLiveProjectStateTarget(
      normalizeMindTurnContractText((consciousFrameProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget, 1600),
      normalizeMindTurnContractText((spineRuntimeProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget, 1600)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget, 1600)
      || null,
      null,
      1600,
    ),
    sameHerSelfLine: preferStrongerProjectStateLine(
      (consciousFrameProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine,
      normalizeMindTurnContractText((spineRuntimeProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine, 320)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine, 320),
      320,
    ) || pickProjectStateField(
      (consciousFrameProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine,
      normalizeMindTurnContractText((spineRuntimeProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine, 320)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine, 320),
      320,
    ),
    sameHerDriftRisk: preferStrongerProjectStateLine(
      (consciousFrameProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk,
      normalizeMindTurnContractText((spineRuntimeProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk, 320)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk, 320),
      320,
    ) || pickProjectStateField(
      (consciousFrameProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk,
      normalizeMindTurnContractText((spineRuntimeProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk, 320)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk, 320),
      320,
    ),
    preDialogueAwarenessLine: preferProviderFacingAwarenessField({
      conscious:
        (consciousFrameProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine
        ?? (consciousFrameProjectState as { awarenessLine?: unknown } | null)?.awarenessLine
        ?? (consciousFrameProjectState as { companionHeadlineLine?: unknown, preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.companionHeadlineLine,
      spine:
        (spineRuntimeProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine
        ?? (spineRuntimeProjectState as { awarenessLine?: unknown } | null)?.awarenessLine
        ?? (spineRuntimeProjectState as { companionHeadlineLine?: unknown, preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.companionHeadlineLine,
      runtimeDigest:
        (runtimeDigestProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine
        ?? (runtimeDigestProjectState as { awarenessLine?: unknown } | null)?.awarenessLine
        ?? (runtimeDigestProjectState as { companionHeadlineLine?: unknown, preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.companionHeadlineLine,
      fallback: null,
      companionHeadline:
        (consciousFrameProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine
        ?? (spineRuntimeProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine
        ?? (runtimeDigestProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
      maxChars: 320,
    }),
    continuityPreferredTiming:
      normalizeMindTurnContractText((consciousFrameProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming, 120)
      || normalizeMindTurnContractText((spineRuntimeProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming, 120)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming, 120)
      || normalizeMindTurnContractText(callbackFollowUpAffordance?.preferredTiming, 120)
      || null,
    continuityCadence:
      normalizeMindTurnContractText((consciousFrameProjectState as { continuityCadence?: unknown } | null)?.continuityCadence, 120)
      || normalizeMindTurnContractText((spineRuntimeProjectState as { continuityCadence?: unknown } | null)?.continuityCadence, 120)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { continuityCadence?: unknown } | null)?.continuityCadence, 120)
      || null,
    preferredBlinkCadence:
      normalizeMindTurnContractText((consciousFrameProjectState as { preferredBlinkCadence?: unknown } | null)?.preferredBlinkCadence, 64)
      || normalizeMindTurnContractText((spineRuntimeProjectState as { preferredBlinkCadence?: unknown } | null)?.preferredBlinkCadence, 64)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { preferredBlinkCadence?: unknown } | null)?.preferredBlinkCadence, 64)
      || null,
    preferredGazeMode:
      normalizeMindTurnContractText((consciousFrameProjectState as { preferredGazeMode?: unknown } | null)?.preferredGazeMode, 64)
      || normalizeMindTurnContractText((spineRuntimeProjectState as { preferredGazeMode?: unknown } | null)?.preferredGazeMode, 64)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { preferredGazeMode?: unknown } | null)?.preferredGazeMode, 64)
      || null,
    preferredVoiceMode:
      normalizeMindTurnContractVoiceMode((consciousFrameProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode)
      || normalizeMindTurnContractVoiceMode((spineRuntimeProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode)
      || normalizeMindTurnContractVoiceMode((runtimeDigestProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode)
      || null,
    preferredPacingMode:
      normalizeMindTurnContractPacingMode((consciousFrameProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode)
      || normalizeMindTurnContractPacingMode((spineRuntimeProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode)
      || normalizeMindTurnContractPacingMode((runtimeDigestProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode)
      || null,
  }
  const fallbackProjectState = input.projectState ?? null
  const hasLiveProjectState = hasLiveProjectStateEvidence(projectStateBrief, [
    consciousFrameProjectState,
    spineRuntimeProjectState,
    runtimeDigestProjectState,
    fallbackProjectState,
  ])
  const canonicalLatestProgressFallback = hasLiveProjectState
    ? (
        projectStateBrief.continuityProgressSummary
        ?? projectStateBrief.memoryAnthropomorphismProgress.at(-1)
        ?? null
      )
    : null
  const canonicalOpenLoopFallback = hasLiveProjectState
    ? projectStateBrief.openLoops[0] ?? null
    : null
  const canonicalNextClosureFallback = hasLiveProjectState
    ? projectStateBrief.nextClosureTarget
    : null
  const canonicalPreDialogueFallback = hasLiveProjectState
    ? projectStateBrief.preDialogueAwarenessLine
    : null
  const chosenIdentity
    = (
      (() => {
        const runtimeIdentity = normalizeMindTurnContractText(runtimeProjectState?.identity, 320)
        if (runtimeIdentity && !looksLikeThinProjectIdentityShell(runtimeIdentity))
          return runtimeIdentity

        const fallbackIdentity = normalizeMindTurnContractText(fallbackProjectState?.identity, 320)
        if (fallbackIdentity && !looksLikeThinProjectIdentityShell(fallbackIdentity))
          return fallbackIdentity

        return ''
      })()
    )
    || ''
  const chosenCurrentPhase = pickProjectStateField(
    runtimeProjectState?.currentPhase,
    fallbackProjectState?.currentPhase ?? null,
    220,
  ) || null
  const chosenPreflightSummary
    = (
      (() => {
        const runtimeOrFallback = pickProjectStateField(
          runtimeProjectState?.preflightSummary,
          fallbackProjectState?.preflightSummary,
          1600,
        )
        return runtimeOrFallback && !isCompactClosureOnlyPreflight(runtimeOrFallback)
          ? runtimeOrFallback
          : null
      })()
    )
    || (hasLiveProjectState
      ? (
          (() => {
            const canonicalPreflight = typeof projectStateBrief.preflightSummary === 'string'
              ? projectStateBrief.preflightSummary.trim()
              : ''
            return canonicalPreflight && !isCompactClosureOnlyPreflight(canonicalPreflight)
              ? canonicalPreflight
              : null
          })()
        )
      : null)
    || ''
  const chosenLatestLandedProgress = preferSpecificLatestLandedProgress(
    normalizeMindTurnContractText((consciousFrameProjectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress, 12000)
    || normalizeMindTurnContractText((consciousFrameProjectState as { latestProgress?: unknown } | null)?.latestProgress, 12000),
    normalizeMindTurnContractText((spineRuntimeProjectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress, 12000)
    || normalizeMindTurnContractText((runtimeDigestProjectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress, 12000)
    || normalizeMindTurnContractText((runtimeDigestProjectState as { latestProgress?: unknown } | null)?.latestProgress, 12000)
    || normalizeMindTurnContractText(fallbackProjectState?.latestLandedProgress, 12000)
    || normalizeMindTurnContractText(fallbackProjectState?.latestProgress, 12000),
    canonicalLatestProgressFallback,
  )
  const chosenPrimaryOpenLoop = preferProjectStateSpecificClosureSummary({
    canonical: normalizeMindTurnContractText((consciousFrameProjectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop, 1600),
    persisted:
      normalizeMindTurnContractText((spineRuntimeProjectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop, 1600)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop, 1600)
      || normalizeMindTurnContractText(fallbackProjectState?.primaryOpenLoop, 1600),
    canonicalFallback: canonicalOpenLoopFallback,
  })
  const chosenNextClosureTarget = preferLiveProjectStateTarget(
    (consciousFrameProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget,
    normalizeMindTurnContractText((spineRuntimeProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget, 1600)
    || normalizeMindTurnContractText((runtimeDigestProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget, 1600)
    || normalizeMindTurnContractText(fallbackProjectState?.nextClosureTarget, 1600),
    canonicalNextClosureFallback,
    1600,
  ) || canonicalNextClosureFallback
  const chosenSameHerSelfLine = preferStrongerProjectStateLine(
    fallbackProjectState?.sameHerSelfLine,
    runtimeProjectState?.sameHerSelfLine,
    320,
  ) || pickProjectStateField(
    runtimeProjectState?.sameHerSelfLine,
    fallbackProjectState?.sameHerSelfLine,
    320,
  ) || (hasLiveProjectState ? projectStateBrief.sameHerSelfLine : null)
  const chosenSameHerHoldDetail = preferProjectStateHoldDetail(
    runtimeProjectState?.sameHerHoldDetail,
    fallbackProjectState?.sameHerHoldDetail,
    320,
  )
  const chosenSameHerDriftRisk = preferStrongerProjectStateLine(
    runtimeProjectState?.sameHerDriftRisk,
    fallbackProjectState?.sameHerDriftRisk,
    320,
  ) || pickProjectStateField(
    runtimeProjectState?.sameHerDriftRisk,
    fallbackProjectState?.sameHerDriftRisk,
    320,
  ) || (hasLiveProjectState ? projectStateBrief.sameHerDriftRisk : null)
  const preferredProviderFacingAwarenessSeed = preferProviderFacingAwarenessField({
    conscious:
      (consciousFrameProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine
      ?? (consciousFrameProjectState as { awarenessLine?: unknown } | null)?.awarenessLine
      ?? (consciousFrameProjectState as { companionHeadlineLine?: unknown, preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.companionHeadlineLine,
    spine:
      (spineRuntimeProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine
      ?? (spineRuntimeProjectState as { awarenessLine?: unknown } | null)?.awarenessLine
      ?? (spineRuntimeProjectState as { companionHeadlineLine?: unknown, preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.companionHeadlineLine,
    runtimeDigest:
      (runtimeDigestProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine
      ?? (runtimeDigestProjectState as { awarenessLine?: unknown } | null)?.awarenessLine
      ?? (runtimeDigestProjectState as { companionHeadlineLine?: unknown, preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.companionHeadlineLine,
    fallback:
      fallbackProjectState?.companionHeadlineLine
      ?? fallbackProjectState?.preDialogueAwarenessLine
      ?? fallbackProjectState?.awarenessLine
      ?? canonicalPreDialogueFallback,
    companionHeadline:
      fallbackProjectState?.companionHeadlineLine
      ?? (runtimeProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
    maxChars: 1600,
  })
  const chosenPreDialogueAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: runtimeProjectState as {
      preDialogueAwarenessLine?: unknown
      awarenessLine?: unknown
      companionHeadlineLine?: unknown
      companionBriefingLine?: unknown
      preDialogueAwarenessSummary?: unknown
      preflightSummary?: unknown
      landedProgressSummary?: unknown
      openClosureSummary?: unknown
      emotionalClosureSummary?: unknown
    } | null,
    fallbackProjectState: {
      preDialogueAwarenessLine:
        preferredProviderFacingAwarenessSeed
        || canonicalPreDialogueFallback,
      preflightSummary: chosenPreflightSummary ?? (hasLiveProjectState ? projectStateBrief.preflightSummary : null),
      landedProgressSummary: fallbackProjectState?.landedProgressSummary ?? null,
      openClosureSummary: fallbackProjectState?.openClosureSummary ?? null,
      emotionalClosureSummary: fallbackProjectState?.emotionalClosureSummary ?? null,
    },
  })
  const explicitProviderFacingPreDialogueAwarenessLine = preferProviderFacingAwarenessField({
    conscious:
      (consciousFrameProjectState as { preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.preDialogueAwarenessLine
      ?? (consciousFrameProjectState as { awarenessLine?: unknown } | null)?.awarenessLine,
    spine:
      (spineRuntimeProjectState as { preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.preDialogueAwarenessLine
      ?? (spineRuntimeProjectState as { awarenessLine?: unknown } | null)?.awarenessLine,
    runtimeDigest:
      (runtimeDigestProjectState as { preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.preDialogueAwarenessLine
      ?? (runtimeDigestProjectState as { awarenessLine?: unknown } | null)?.awarenessLine,
    fallback: null,
    companionHeadline:
      (consciousFrameProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine
      ?? (spineRuntimeProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine
      ?? (runtimeDigestProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
    maxChars: 1600,
  })
  const fallbackProviderFacingPreDialogueAwarenessLine
    = normalizeProviderFacingProjectAwarenessText(fallbackProjectState?.preDialogueAwarenessLine, 1600)
      || normalizeProviderFacingProjectAwarenessText(chosenPreDialogueAwarenessLine, 1600)
      || ''
  const explicitProviderFacingPreDialogueAwarenessLooksThin
    = looksLikeThinProviderFacingProjectAwarenessShell(explicitProviderFacingPreDialogueAwarenessLine)
  const resolvedChosenPreDialogueAwarenessLine = normalizeMindTurnContractText(chosenPreDialogueAwarenessLine, 1600)
  const chosenPreDialogueAwarenessCarriesStrongerContinuityAuthority
    = Boolean(
      explicitProviderFacingPreDialogueAwarenessLine
      && resolvedChosenPreDialogueAwarenessLine
      && explicitProviderFacingPreDialogueAwarenessLine !== resolvedChosenPreDialogueAwarenessLine
      && preferStrongerContinuityClosureAuthority(
        explicitProviderFacingPreDialogueAwarenessLine,
        resolvedChosenPreDialogueAwarenessLine,
      ) === resolvedChosenPreDialogueAwarenessLine,
    )
  const shouldPreferCanonicalFallbackPreDialogueAwarenessLine
    = (!explicitProviderFacingPreDialogueAwarenessLine || explicitProviderFacingPreDialogueAwarenessLooksThin)
      && hasLiveProjectState
      && /She is still inside|The still-open closure is|Next closure target:/u.test(fallbackProviderFacingPreDialogueAwarenessLine)
  const thinShellProviderFacingAwarenessReplacement
    = explicitProviderFacingPreDialogueAwarenessLooksThin
      ? (
          normalizeMindTurnContractText(
            (consciousFrameProjectState as { landedProgressSummary?: unknown } | null)?.landedProgressSummary,
            1600,
          )
          || normalizeMindTurnContractText(
            (spineRuntimeProjectState as { landedProgressSummary?: unknown } | null)?.landedProgressSummary,
            1600,
          )
          || normalizeMindTurnContractText(
            (runtimeDigestProjectState as { landedProgressSummary?: unknown } | null)?.landedProgressSummary,
            1600,
          )
          || normalizeMindTurnContractText(
            (consciousFrameProjectState as { preDialogueAwarenessSummary?: unknown } | null)?.preDialogueAwarenessSummary,
            1600,
          )
          || normalizeMindTurnContractText(
            (spineRuntimeProjectState as { preDialogueAwarenessSummary?: unknown } | null)?.preDialogueAwarenessSummary,
            1600,
          )
          || normalizeMindTurnContractText(
            (runtimeDigestProjectState as { preDialogueAwarenessSummary?: unknown } | null)?.preDialogueAwarenessSummary,
            1600,
          )
          || ''
        )
      : ''
  const hasLiveExplicitProjectAwarenessLine = Boolean(
    normalizeProviderFacingProjectAwarenessText((consciousFrameProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine, 1600)
    || normalizeProviderFacingProjectAwarenessText((consciousFrameProjectState as { awarenessLine?: unknown } | null)?.awarenessLine, 1600)
    || normalizeProviderFacingProjectAwarenessText((spineRuntimeProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine, 1600)
    || normalizeProviderFacingProjectAwarenessText((spineRuntimeProjectState as { awarenessLine?: unknown } | null)?.awarenessLine, 1600)
    || normalizeProviderFacingProjectAwarenessText((runtimeDigestProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine, 1600)
    || normalizeProviderFacingProjectAwarenessText((runtimeDigestProjectState as { awarenessLine?: unknown } | null)?.awarenessLine, 1600),
  )
  const currentConsciousCarriesProjectStateWithoutExplicitAwareness = Boolean(
    consciousFrameProjectState
    && !normalizeProviderFacingProjectAwarenessText((consciousFrameProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine, 1600)
    && !normalizeProviderFacingProjectAwarenessText((consciousFrameProjectState as { awarenessLine?: unknown } | null)?.awarenessLine, 1600)
    && (
      normalizeMindTurnContractText((consciousFrameProjectState as { identity?: unknown } | null)?.identity, 320)
      || normalizeMindTurnContractText((consciousFrameProjectState as { currentPhase?: unknown } | null)?.currentPhase, 220)
      || normalizeMindTurnContractText((consciousFrameProjectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress, 320)
      || normalizeMindTurnContractText((consciousFrameProjectState as { latestProgress?: unknown } | null)?.latestProgress, 320)
      || normalizeMindTurnContractText((consciousFrameProjectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop, 320)
      || normalizeMindTurnContractText((consciousFrameProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget, 320)
      || normalizeMindTurnContractText((consciousFrameProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine, 320)
    ),
  )
  const liveProjectStateWithoutExplicitAwarenessPreflight
    = currentConsciousCarriesProjectStateWithoutExplicitAwareness
      ? (
          (() => {
            const consciousPreflight = normalizeMindTurnContractText(
              (consciousFrameProjectState as { preflightSummary?: unknown } | null)?.preflightSummary,
              1600,
            )
            if (consciousPreflight && !isCompactClosureOnlyPreflight(consciousPreflight))
              return consciousPreflight

            const runtimePreflight = normalizeMindTurnContractText(runtimeProjectState?.preflightSummary, 1600)
            return runtimePreflight && !isCompactClosureOnlyPreflight(runtimePreflight)
              ? runtimePreflight
              : ''
          })()
        )
      : ''
  const defaultProviderFacingProjectAwarenessLine
    = hasLiveProjectState
      ? normalizeMindTurnContractText(projectStateBrief.preDialogueAwarenessLine, 1600)
      : ''
  const chosenProviderFacingPreDialogueAwarenessLine = explicitProviderFacingPreDialogueAwarenessLine
    && !explicitProviderFacingPreDialogueAwarenessLooksThin
    && !chosenPreDialogueAwarenessCarriesStrongerContinuityAuthority
    ? explicitProviderFacingPreDialogueAwarenessLine
    : thinShellProviderFacingAwarenessReplacement
      || resolvedChosenPreDialogueAwarenessLine
      || (shouldPreferCanonicalFallbackPreDialogueAwarenessLine
        ? normalizeMindTurnContractText(projectStateBrief.preDialogueAwarenessLine, 1600)
        : '')
      || (
        isExactProjectAwareContinuityLine(fallbackProjectState?.companionHeadlineLine)
          ? normalizeMindTurnContractText(fallbackProjectState?.companionHeadlineLine, 1600)
          : null
      )
      || (
        isExactProjectAwareContinuityLine((runtimeProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine)
          ? normalizeMindTurnContractText((runtimeProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine, 1600)
          : null
      )
      || fallbackProviderFacingPreDialogueAwarenessLine
  const normalizedCanonicalShortProjectAwarenessLine = normalizeMindTurnContractText(formatProviderFacingProjectStateAwarenessFields({
    identity: hasLiveProjectState
      ? normalizeMindTurnContractText(projectStateBrief.identity, 320).replace(
          /\s+on the host computer rather than a better chat wrapper\.?$/u,
          '.',
        )
      : null,
    currentPhase: hasLiveProjectState ? projectStateBrief.currentPhase : null,
    maxChars: 1600,
  }), 1600)
  const rawProviderFacingPreDialogueAwarenessLine
    = currentConsciousCarriesProjectStateWithoutExplicitAwareness
      ? (
          chosenProviderFacingPreDialogueAwarenessLine
          || liveProjectStateWithoutExplicitAwarenessPreflight
          || normalizedCanonicalShortProjectAwarenessLine
        )
      : hasLiveExplicitProjectAwarenessLine
        ? chosenProviderFacingPreDialogueAwarenessLine
        : hasLiveProjectState
          ? (defaultProviderFacingProjectAwarenessLine || normalizedCanonicalShortProjectAwarenessLine)
          : ''
  const providerFacingPreDialogueAwarenessLine
    = normalizeProviderFacingProjectAwarenessText(rawProviderFacingPreDialogueAwarenessLine, 1600)
      || resolvedChosenPreDialogueAwarenessLine
      || (hasLiveProjectState ? normalizedCanonicalShortProjectAwarenessLine : '')
  const liveProjectState = {
    ...fallbackProjectState,
    ...runtimeProjectState,
    identity: chosenIdentity,
    currentPhase: chosenCurrentPhase,
    preflightSummary: chosenPreflightSummary,
    preDialogueAwarenessLine: providerFacingPreDialogueAwarenessLine,
    latestLandedProgress: chosenLatestLandedProgress,
    latestProgress: chosenLatestLandedProgress,
    primaryOpenLoop: chosenPrimaryOpenLoop,
    nextClosureTarget: chosenNextClosureTarget,
    sameHerSelfLine: chosenSameHerSelfLine,
    sameHerHoldDetail: chosenSameHerHoldDetail || null,
    sameHerDriftRisk: chosenSameHerDriftRisk,
    companionBriefingLine: pickProjectStateField(
      fallbackProjectState?.companionBriefingLine,
      (runtimeProjectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine,
      1600,
    ) || pickProjectStateField(
      (consciousFrameProjectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine,
      (spineRuntimeProjectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine,
      1600,
    ) || null,
    companionHeadlineLine: preferProviderFacingAwarenessField({
      conscious: (consciousFrameProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
      spine: (spineRuntimeProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
      runtimeDigest: (runtimeDigestProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
      fallback: fallbackProjectState?.companionHeadlineLine,
      companionHeadline: (runtimeProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
      maxChars: 320,
    }) || null,
    continuityPreferredTiming: pickLiveProjectStateField(
      (consciousFrameProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming,
      normalizeMindTurnContractText((spineRuntimeProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming, 120)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming, 120),
      fallbackProjectState?.continuityPreferredTiming,
      120,
    ) || null,
    continuityCadence: pickLiveProjectStateField(
      (consciousFrameProjectState as { continuityCadence?: unknown } | null)?.continuityCadence,
      normalizeMindTurnContractText((spineRuntimeProjectState as { continuityCadence?: unknown } | null)?.continuityCadence, 120)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { continuityCadence?: unknown } | null)?.continuityCadence, 120),
      fallbackProjectState?.continuityCadence,
      120,
    ) || null,
    preferredBlinkCadence: pickLiveProjectStateField(
      (consciousFrameProjectState as { preferredBlinkCadence?: unknown } | null)?.preferredBlinkCadence,
      normalizeMindTurnContractText((spineRuntimeProjectState as { preferredBlinkCadence?: unknown } | null)?.preferredBlinkCadence, 64)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { preferredBlinkCadence?: unknown } | null)?.preferredBlinkCadence, 64),
      fallbackProjectState?.preferredBlinkCadence,
      64,
    ) || null,
    preferredGazeMode: pickLiveProjectStateField(
      (consciousFrameProjectState as { preferredGazeMode?: unknown } | null)?.preferredGazeMode,
      normalizeMindTurnContractText((spineRuntimeProjectState as { preferredGazeMode?: unknown } | null)?.preferredGazeMode, 64)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { preferredGazeMode?: unknown } | null)?.preferredGazeMode, 64),
      fallbackProjectState?.preferredGazeMode,
      64,
    ) || null,
    preferredVoiceMode: pickLiveProjectStateField(
      (consciousFrameProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode,
      normalizeMindTurnContractVoiceMode((spineRuntimeProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode)
      || normalizeMindTurnContractVoiceMode((runtimeDigestProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode),
      (fallbackProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode,
      32,
    ) || null,
    preferredPacingMode: pickLiveProjectStateField(
      (consciousFrameProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode,
      normalizeMindTurnContractPacingMode((spineRuntimeProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode)
      || normalizeMindTurnContractPacingMode((runtimeDigestProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode),
      (fallbackProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode,
      32,
    ) || null,
  }
  const activeClosenessContext: AlicizationAnswerCompilerSnapshot['activeClosenessContext']
    = (surface.activeClosenessContext ?? planner?.activeClosenessContext ?? compiler?.activeClosenessContext ?? null) as AlicizationAnswerCompilerSnapshot['activeClosenessContext']
  const activeClosenessRung: AlicizationAnswerCompilerSnapshot['activeClosenessRung']
    = (surface.activeClosenessRung ?? planner?.activeClosenessRung ?? compiler?.activeClosenessRung ?? null) as AlicizationAnswerCompilerSnapshot['activeClosenessRung']
  const emotionalClosureCue = deriveEmotionalClosureCue({
    planner,
    charter,
    surface,
  })
  const relationshipTruthDoctrine = deriveRelationshipTruthDoctrine({
    runtimeSurface: input.runtimeSurface ?? null,
    planner,
  })
  liveProjectState.emotionalClosureCue = emotionalClosureCue
  const canonicalStructuredProjectState = resolveCanonicalStructuredProjectState({
    normalizedProjectState: {
      identity: chosenIdentity,
      currentPhase: chosenCurrentPhase,
      latestLandedProgress:
        chosenLatestLandedProgress
        || projectStateBrief.continuityProgressSummary
        || projectStateBrief.memoryAnthropomorphismProgress.at(-1)
        || null,
      primaryOpenLoop: chosenPrimaryOpenLoop || projectStateBrief.openLoops[0] || null,
      nextClosureTarget: chosenNextClosureTarget,
      sameHerSelfLine: chosenSameHerSelfLine,
      sameHerHoldDetail: chosenSameHerHoldDetail,
      sameHerDriftRisk: chosenSameHerDriftRisk,
      emotionalClosureSummary:
        pickProjectStateField(
          (runtimeProjectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
          fallbackProjectState?.emotionalClosureSummary,
          320,
        ) || null,
      continuityRestraint: pickProjectStateField(
        (runtimeProjectState as { continuityRestraint?: unknown } | null)?.continuityRestraint,
        fallbackProjectState?.continuityRestraint,
        64,
      ) || null,
      continuityArcStage: pickProjectStateField(
        (runtimeProjectState as { continuityArcStage?: unknown } | null)?.continuityArcStage,
        fallbackProjectState?.continuityArcStage,
        120,
      ) || null,
      continuityCue: pickProjectStateField(
        (runtimeProjectState as { continuityCue?: unknown } | null)?.continuityCue,
        fallbackProjectState?.continuityCue,
        220,
      ) || null,
      continuityPreferredTiming: pickProjectStateField(
        (runtimeProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming,
        fallbackProjectState?.continuityPreferredTiming,
        120,
      ) || null,
      continuityCadence: pickProjectStateField(
        (runtimeProjectState as { continuityCadence?: unknown } | null)?.continuityCadence,
        fallbackProjectState?.continuityCadence,
        120,
      ) || null,
      preferredBlinkCadence: pickProjectStateField(
        (runtimeProjectState as { preferredBlinkCadence?: unknown } | null)?.preferredBlinkCadence,
        fallbackProjectState?.preferredBlinkCadence,
        64,
      ) || null,
      preferredGazeMode: pickProjectStateField(
        (runtimeProjectState as { preferredGazeMode?: unknown } | null)?.preferredGazeMode,
        fallbackProjectState?.preferredGazeMode,
        64,
      ) || null,
      preferredVoiceMode: pickProjectStateField(
        normalizeMindTurnContractVoiceMode((runtimeProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode),
        normalizeMindTurnContractVoiceMode((fallbackProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode)
        || projectStateBrief.preferredVoiceMode,
        32,
      ) || null,
      preferredPacingMode: pickProjectStateField(
        normalizeMindTurnContractPacingMode((runtimeProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode),
        normalizeMindTurnContractPacingMode((fallbackProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode)
        || projectStateBrief.preferredPacingMode,
        32,
      ) || null,
    },
    runtimePreflightSummary: chosenPreflightSummary ?? null,
    runtimePreDialogueAwarenessLine: providerFacingPreDialogueAwarenessLine,
  })
  if (
    liveProjectState.preDialogueAwarenessSummary
    && liveProjectState.preDialogueAwarenessLine
    && liveProjectState.preDialogueAwarenessSummary === liveProjectState.preDialogueAwarenessLine
  ) {
    delete (liveProjectState as Record<string, unknown>).preDialogueAwarenessSummary
  }
  if (
    liveProjectState.awarenessLine
    && liveProjectState.preDialogueAwarenessLine
    && liveProjectState.awarenessLine === liveProjectState.preDialogueAwarenessLine
  ) {
    delete (liveProjectState as Record<string, unknown>).awarenessLine
  }
  if (
    liveProjectState.companionHeadlineLine
    && liveProjectState.preDialogueAwarenessLine
    && liveProjectState.companionHeadlineLine === liveProjectState.preDialogueAwarenessLine
  ) {
    delete (liveProjectState as Record<string, unknown>).companionHeadlineLine
  }
  if (!liveProjectState.companionBriefingLine)
    delete (liveProjectState as Record<string, unknown>).companionBriefingLine
  if (!liveProjectState.sameHerHoldDetail)
    delete (liveProjectState as Record<string, unknown>).sameHerHoldDetail
  if (!liveProjectState.sameHerDriftRisk && fallbackProjectState?.sameHerDriftRisk == null)
    delete (liveProjectState as Record<string, unknown>).sameHerDriftRisk
  const preDialogueClosure = hasLiveProjectState
    ? replacePreDialogueClosureNextTarget({
        preDialogueClosure: buildMindTurnContractPreDialogueClosure({
          projectStateBrief,
          freshestProjectState: {
            ...consciousFrameProjectState,
            nextClosureTarget: chosenNextClosureTarget,
          },
          liveProjectState: {
            ...liveProjectState,
            nextClosureTarget: chosenNextClosureTarget,
          },
        }),
        nextClosureTarget: chosenNextClosureTarget,
        projectState: liveProjectState as AlicizationMindTurnContractSnapshot['projectState'],
      })
    : null
  const sameHerProjectAwareEvidence = [
    chosenSameHerSelfLine,
    chosenSameHerDriftRisk,
    chosenPreDialogueAwarenessLine,
    liveProjectState.companionHeadlineLine,
    liveProjectState.companionBriefingLine,
    chosenPrimaryOpenLoop,
    chosenNextClosureTarget,
    planner?.governingProject,
    preDialogueClosure?.summaryLine,
    preDialogueClosure?.companionBriefingLine,
    preDialogueClosure?.companionNextClosureLine,
    ...(preDialogueClosure?.briefingLines ?? []),
    ...(preDialogueClosure?.reasons ?? []),
  ].filter(Boolean).join(' | ')
  const inheritedSameHerProjectDiscipline = [
    ...(planner?.mustDo ?? []),
    ...(planner?.mustNotDo ?? []),
    ...(compiler?.mustDo ?? []),
    ...(compiler?.mustNotDo ?? []),
    ...charter.mustDo,
    ...charter.mustNotDo,
    ...surface.mustDo,
    ...surface.mustNotDo,
  ].join(' | ')
  const memoryGateOnlyMustDo = uniqueList([
    ...(planner?.mustDo ?? []),
    ...(compiler?.mustDo ?? []),
    ...charter.mustDo,
    ...surface.mustDo,
  ], 24)
  const memoryGateDominantButProjectStatePresent
    = hasLiveProjectState
      && memoryGateOnlyMustDo.length > 0
      && memoryGateOnlyMustDo.every(item => /memory gate|without narrating recall|memory shape caution|uncertainty inwardly/iu.test(item))
      && /local_desktop_life_loop|identity_continuity|continuity_(?:line|anchor|hold|drift_risk)|project_state_continuity|cross_modal_continuity_proof|memory_dialogue_embodiment_closure|callback_continuity|closure_status=unfinished|open_loop=|unresolved_closure/iu.test(sameHerProjectAwareEvidence)
  const sameHerProjectAwareMustDo = (
    (
      hasLiveProjectState
      && /local_desktop_life_loop/iu.test(chosenCurrentPhase)
      && /local_desktop_life_loop|identity_continuity|continuity_(?:line|anchor|hold|drift_risk)|project_state_continuity|cross_modal_continuity_proof|memory_dialogue_embodiment_closure|callback_continuity|repair_first_callback_continuity_closure|execution_reentry_repair_seam_carry/iu.test(sameHerProjectAwareEvidence)
      && /closure_status=unfinished|memory_dialogue_embodiment_closure|end_to_end_proof_incomplete|cross_modal_continuity_proof|continuity_pending|callback_continuity|repair_first_callback_continuity_closure|execution_reentry_repair_seam_carry|unresolved_closure|open_loop=|initiative|embodiment|memory|dialogue|未闭环|没闭环|还差|still needs|still remains/iu.test(sameHerProjectAwareEvidence)
    )
    || memoryGateDominantButProjectStatePresent
  )
    ? 'continuity_requirement=preserve_project_evidence_context_without_project_narrator_shell'
    : null
  const detachedProjectNarratorShellMustNotDo = sameHerProjectAwareMustDo
    ? 'avoid=detached_project_narrator_shell'
    : null
  const finalProjectState = hasLiveProjectState
    ? compactMindTurnProjectState({
      ...canonicalStructuredProjectState,
      identity: pickProjectStateField(
        (liveProjectState as { identity?: unknown } | null)?.identity,
        (canonicalStructuredProjectState as { identity?: unknown } | null)?.identity,
        320,
      ) || null,
      currentPhase: pickProjectStateField(
        (liveProjectState as { currentPhase?: unknown } | null)?.currentPhase,
        (canonicalStructuredProjectState as { currentPhase?: unknown } | null)?.currentPhase,
        220,
      ) || null,
      preflightSummary:
          chosenPreflightSummary
          || pickProjectStateField(
            (liveProjectState as { preflightSummary?: unknown } | null)?.preflightSummary,
            (canonicalStructuredProjectState as { preflightSummary?: unknown } | null)?.preflightSummary,
            1600,
          )
          || null,
      preDialogueAwarenessLine:
          normalizeProviderFacingProjectStateAwarenessLine(providerFacingPreDialogueAwarenessLine, 1600)
          || normalizeProviderFacingProjectAwarenessText(
            currentConsciousCarriesProjectStateWithoutExplicitAwareness
              ? (liveProjectStateWithoutExplicitAwarenessPreflight || normalizedCanonicalShortProjectAwarenessLine)
              : (liveProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine,
            1600,
          )
          || normalizeProviderFacingProjectAwarenessText(
            (canonicalStructuredProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine,
            1600,
          )
          || null,
      companionHeadlineLine: pickProjectStateField(
        (liveProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
        (canonicalStructuredProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
        1600,
      ) || null,
      companionBriefingLine: pickProjectStateField(
        (liveProjectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine,
        (canonicalStructuredProjectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine,
        1600,
      ) || null,
      latestLandedProgress: pickProjectStateField(
        (liveProjectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress,
        (canonicalStructuredProjectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress,
        12000,
      ) || null,
      primaryOpenLoop: pickProjectStateField(
        (liveProjectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop,
        (canonicalStructuredProjectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop,
        1600,
      ) || null,
      nextClosureTarget: pickProjectStateField(
        (liveProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget,
        (canonicalStructuredProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget,
        1600,
      ) || null,
      sameHerSelfLine: pickProjectStateField(
        (liveProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine,
        (canonicalStructuredProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine,
        320,
      ) || null,
      sameHerHoldDetail: preferProjectStateHoldDetail(
        (liveProjectState as { sameHerHoldDetail?: unknown } | null)?.sameHerHoldDetail,
        (canonicalStructuredProjectState as { sameHerHoldDetail?: unknown } | null)?.sameHerHoldDetail,
        320,
      ) || null,
      continuityArcStage: pickProjectStateField(
        (liveProjectState as { continuityArcStage?: unknown } | null)?.continuityArcStage,
        (canonicalStructuredProjectState as { continuityArcStage?: unknown } | null)?.continuityArcStage,
        120,
      ) || null,
      continuityCue: pickProjectStateField(
        (liveProjectState as { continuityCue?: unknown } | null)?.continuityCue,
        (canonicalStructuredProjectState as { continuityCue?: unknown } | null)?.continuityCue,
        220,
      ) || null,
      sameHerDriftRisk: pickProjectStateField(
        (liveProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk,
        (canonicalStructuredProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk,
        320,
      ) || null,
      emotionalClosureCue: pickProjectStateField(
        (liveProjectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
        (canonicalStructuredProjectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
        1600,
      ) || null,
      emotionalClosureSummary: pickProjectStateField(
        (liveProjectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
        (canonicalStructuredProjectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
        320,
      ) || null,
      continuityRestraint: pickProjectStateField(
        (liveProjectState as { continuityRestraint?: unknown } | null)?.continuityRestraint,
        (canonicalStructuredProjectState as { continuityRestraint?: unknown } | null)?.continuityRestraint,
        64,
      ) || null,
      continuityPreferredTiming: pickProjectStateField(
        (liveProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming,
        (canonicalStructuredProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming,
        120,
      ) || null,
      continuityCadence: pickProjectStateField(
        (liveProjectState as { continuityCadence?: unknown } | null)?.continuityCadence,
        (canonicalStructuredProjectState as { continuityCadence?: unknown } | null)?.continuityCadence,
        120,
      ) || null,
      preferredBlinkCadence: pickProjectStateField(
        (liveProjectState as { preferredBlinkCadence?: unknown } | null)?.preferredBlinkCadence,
        (canonicalStructuredProjectState as { preferredBlinkCadence?: unknown } | null)?.preferredBlinkCadence,
        64,
      ) || null,
      preferredGazeMode: pickProjectStateField(
        (liveProjectState as { preferredGazeMode?: unknown } | null)?.preferredGazeMode,
        (canonicalStructuredProjectState as { preferredGazeMode?: unknown } | null)?.preferredGazeMode,
        64,
      ) || null,
      preferredVoiceMode: pickProjectStateField(
        normalizeMindTurnContractVoiceMode((liveProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode),
        normalizeMindTurnContractVoiceMode((canonicalStructuredProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode)
        || projectStateBrief.preferredVoiceMode,
        32,
      ) || projectStateBrief.preferredVoiceMode || null,
      preferredPacingMode: pickProjectStateField(
        normalizeMindTurnContractPacingMode((liveProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode),
        normalizeMindTurnContractPacingMode((canonicalStructuredProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode)
        || projectStateBrief.preferredPacingMode,
        32,
      ) || projectStateBrief.preferredPacingMode || null,
    }) as AlicizationMindTurnContractSnapshot['projectState']
    : null

  return {
    version: 'mind-turn-contract-v1',
    answerIntent: planner?.answerIntent ?? compiler?.openingDirective ?? null,
    answerAct: planner?.act ?? compiler?.recommendedAct ?? null,
    turnMode: compiler?.turnMode ?? 'answer',
    responseMode: compiler?.responseMode ?? 'answer-naturally',
    evidenceMode: planner?.evidenceMode ?? compiler?.evidenceMode ?? null,
    openingStyle: surface.openingStyle,
    expectedVisibleReplyAuthority: normalizeAlicizationNormalVisibleReplyAuthority(
      surface.expectedVisibleReplyAuthority ?? null,
      'llm-mind',
    ),
    replyRealizationMode: 'provider-mind-required',
    personaKernelMode: surface.personaKernelMode,
    activeClosenessContext,
    activeClosenessRung,
    relationshipPosture: charter.relationshipPosture,
    labelCarryAsMemory: surface.labelCarryAsMemory,
    suppressAssociativeRecall: surface.suppressAssociativeRecall,
    allowAffectionatePreface: surface.allowAffectionatePreface,
    allowStageDirections: surface.allowStageDirections,
    allowBodyNarration: surface.allowBodyNarration,
    maxParagraphs: surface.maxParagraphs,
    maxSentences: surface.maxSentences,
    mustDo: uniqueContractControlItems([
      sameHerProjectAwareMustDo,
      ...(planner?.mustDo ?? []),
      ...(compiler?.mustDo ?? []),
      ...charter.mustDo,
      ...surface.mustDo,
    ], 24),
    mustNotDo: uniqueContractControlItems([
      detachedProjectNarratorShellMustNotDo,
      ...(planner?.mustNotDo ?? []),
      ...(compiler?.mustNotDo ?? []),
      ...charter.mustNotDo,
      ...surface.mustNotDo,
    ], 24),
    governingFocus: planner?.governingFocus ?? charter.governingFocus,
    governingConcern: charter.governingConcern,
    governingCommitment: charter.governingCommitment,
    governingInquiry: charter.governingInquiry,
    governingProject: charter.governingProject,
    emotionalClosureCue,
    relationshipTruthDoctrine,
    projectState: finalProjectState,
    preDialogueClosure,
    reasons: uniqueList([
      ...(planner?.narrative ?? []),
      ...(compiler?.narrative ?? []),
      ...charter.reasons,
    ], 16),
    updatedAt: Math.max(
      planner?.updatedAt ?? 0,
      compiler?.updatedAt ?? 0,
      Number.isFinite(input.now) ? Math.floor(Number(input.now)) : Date.now(),
    ),
  }
}

export function buildAlicizationMindTurnContractSystemBlock(
  contract: AlicizationMindTurnContractSnapshot,
  options?: {
    includeProjectStateFacts?: boolean
  },
) {
  const includeProjectStateFacts = options?.includeProjectStateFacts !== false
  const canonicalProjectStateBrief = resolveAlicizationProjectStateBrief()
  const canonicalLatestLandedProgress = normalizeMindTurnContractText(
    canonicalProjectStateBrief.latestProgress ?? canonicalProjectStateBrief.continuityProgressSummary,
    1200,
  )
  const canonicalContinuityProgressSummary = normalizeMindTurnContractText(
    canonicalProjectStateBrief.continuityProgressSummary,
    1200,
  )
  const liveLatestLandedProgress = normalizeMindTurnContractText(
    contract.projectState?.latestLandedProgress ?? contract.projectState?.latestProgress,
    1200,
  )
  const preferredSameSessionMirrorCarrySummary = normalizeMindTurnContractText(
    canonicalProjectStateBrief.continuityProgressSummary?.match(/Same-session mirror carry[^.]*\./u)?.[0]
    ?? canonicalProjectStateBrief.continuityProgressSummary,
    1200,
  )
  const extractedSameSessionMirrorCarrySummary = normalizeMindTurnContractText(
    liveLatestLandedProgress.match(/Same-session mirror carry[^.]*\./u)?.[0],
    1200,
  )
  const preferredSystemLatestLandedProgress = (
    liveLatestLandedProgress
    && canonicalLatestLandedProgress
    && canonicalContinuityProgressSummary
    && (
      liveLatestLandedProgress === canonicalLatestLandedProgress
      || (
        (
          canonicalLatestLandedProgress.startsWith(liveLatestLandedProgress)
          || liveLatestLandedProgress.startsWith(canonicalLatestLandedProgress)
        )
        && !/same-session mirror carry/iu.test(liveLatestLandedProgress)
      )
    )
  )
    ? (
        /same-session mirror carry/iu.test(liveLatestLandedProgress)
          ? (extractedSameSessionMirrorCarrySummary || preferredSameSessionMirrorCarrySummary || canonicalContinuityProgressSummary)
          : canonicalContinuityProgressSummary
      )
    : (
        /^continuity,\s*memory,\s*execution,/iu.test(liveLatestLandedProgress)
        && /same-session mirror carry/iu.test(liveLatestLandedProgress)
      )
        ? (extractedSameSessionMirrorCarrySummary || preferredSameSessionMirrorCarrySummary || liveLatestLandedProgress)
        : liveLatestLandedProgress
  const providerFacingNextClosureOrientation = normalizeMindTurnContractText(
    contract.preDialogueClosure?.companionNextClosureLine,
    320,
  ) || contract.projectState?.nextClosureTarget || ''
  const providerFacingProjectPreflight = normalizeProviderFacingProjectStateAwarenessLine(buildProviderFacingProjectPreflightLine({
    identity: contract.projectState?.identity ?? null,
    preflightSummary: contract.projectState?.preflightSummary ?? null,
  }), 1600)
  const rawProviderFacingProjectFacts = includeProjectStateFacts && contract.projectState
    ? formatProviderFacingProjectStateAwarenessFields({
        identity: contract.projectState.identity,
        currentPhase: contract.projectState.currentPhase,
        latestLandedProgress: preferredSystemLatestLandedProgress,
        primaryOpenLoop: contract.projectState.primaryOpenLoop,
        nextClosureTarget: providerFacingNextClosureOrientation || contract.projectState.nextClosureTarget,
        continuityAnchor: contract.projectState.sameHerSelfLine,
        sameHerHoldDetail: contract.projectState.sameHerHoldDetail,
        sameHerDriftRisk: contract.projectState.sameHerDriftRisk,
        proactiveSameHerGap: contract.projectState.proactiveSameHerGap,
        emotionalClosureCue: contract.projectState.emotionalClosureSummary ?? contract.projectState.emotionalClosureCue,
        status: providerFacingProjectPreflight,
        maxChars: 1600,
      })
    : ''
  const providerFacingProjectFacts = sanitizeProviderFacingProjectFactsBlock(rawProviderFacingProjectFacts)

  return [
    '[ALICIZATION_MIND_TURN_CONTRACT]',
    'contract_role=single_latent_reply_contract; downstream_rederive_reply_authority=false',
    `version=${contract.version}`,
    `turn_mode=${contract.turnMode}`,
    `response_mode=${contract.responseMode}`,
    `answer_act=${contract.answerAct ?? 'unknown'}`,
    `evidence_mode=${contract.evidenceMode ?? 'unknown'}`,
    `opening_style=${contract.openingStyle}`,
    `expected_visible_reply_authority=${contract.expectedVisibleReplyAuthority}`,
    `reply_realization_mode=${contract.replyRealizationMode}`,
    `persona_kernel_mode=${contract.personaKernelMode}`,
    contract.activeClosenessContext && contract.activeClosenessRung
      ? `closeness_ladder=${contract.activeClosenessContext}/${contract.activeClosenessRung}`
      : '',
    `label_carried_continuity=${contract.labelCarryAsMemory ? 'yes' : 'no'}`,
    `suppress_associative_recall_noise=${contract.suppressAssociativeRecall ? 'yes' : 'no'}`,
    `allow_affectionate_preface=${contract.allowAffectionatePreface ? 'yes' : 'no'}`,
    `allow_stage_directions=${contract.allowStageDirections ? 'yes' : 'no'}`,
    `allow_body_narration=${contract.allowBodyNarration ? 'yes' : 'no'}`,
    `max_paragraphs=${contract.maxParagraphs}`,
    `max_sentences=${contract.maxSentences}`,
    providerFacingMindTurnField('governing_focus', contract.governingFocus),
    providerFacingMindTurnField('governing_concern', contract.governingConcern),
    providerFacingMindTurnField('governing_commitment', contract.governingCommitment),
    providerFacingMindTurnField('governing_inquiry', contract.governingInquiry),
    providerFacingStructuredMindTurnField('governing_project', contract.governingProject, 1200),
    providerFacingStructuredMindTurnField('emotional_closure_cue', contract.emotionalClosureCue),
    providerFacingMindTurnField('relationship_truth_doctrine', contract.relationshipTruthDoctrine),
    providerFacingProjectFacts ? '[ALICIZATION_MIND_TURN_PROJECT_STATE_FACTS]' : '',
    providerFacingProjectFacts ? 'owner=ProjectStateGovernance' : '',
    providerFacingProjectFacts,
    includeProjectStateFacts ? providerFacingStructuredMindTurnField('project_companion_headline', contract.projectState?.companionHeadlineLine) : '',
    includeProjectStateFacts ? providerFacingMindTurnField('project_continuity_restraint', contract.projectState?.continuityRestraint) : '',
    includeProjectStateFacts ? providerFacingMindTurnField('project_continuity_arc_stage', contract.projectState?.continuityArcStage) : '',
    includeProjectStateFacts ? providerFacingMindTurnField('project_continuity_cue', contract.projectState?.continuityCue) : '',
    includeProjectStateFacts ? providerFacingMindTurnField('project_continuity_preferred_timing', contract.projectState?.continuityPreferredTiming) : '',
    includeProjectStateFacts ? providerFacingMindTurnField('project_continuity_cadence', contract.projectState?.continuityCadence) : '',
    includeProjectStateFacts ? providerFacingMindTurnField('project_preferred_blink_cadence', contract.projectState?.preferredBlinkCadence, 80) : '',
    includeProjectStateFacts ? providerFacingMindTurnField('project_preferred_gaze_mode', contract.projectState?.preferredGazeMode, 80) : '',
    includeProjectStateFacts ? providerFacingMindTurnField('project_preferred_voice_mode', contract.projectState?.preferredVoiceMode, 80) : '',
    includeProjectStateFacts ? providerFacingMindTurnField('project_preferred_pacing_mode', contract.projectState?.preferredPacingMode, 80) : '',
    includeProjectStateFacts ? providerFacingMindTurnField('pre_dialogue_closure_summary', sanitizeProviderFacingProjectFactsBlock(normalizeProviderFacingProjectStateAwarenessLine(contract.preDialogueClosure?.summaryLine, 1600))) : '',
    includeProjectStateFacts ? providerFacingMindTurnField('pre_dialogue_next_closure_line', normalizeProviderFacingProjectStateFactValue('next', contract.preDialogueClosure?.companionNextClosureLine, 320)) : '',
    includeProjectStateFacts ? providerFacingStructuredMindTurnField('pre_dialogue_closure_cue', contract.preDialogueClosure?.emotionalClosureCue) : '',
    providerFacingMindTurnField('answer_intent', contract.answerIntent),
    'control_section=must_do',
    ...contract.mustDo.map(renderProviderFacingMindTurnListItem).filter(Boolean),
    'control_section=must_not_do',
    ...contract.mustNotDo.map(renderProviderFacingMindTurnListItem).filter(Boolean),
  ].filter(Boolean).join('\n')
}
