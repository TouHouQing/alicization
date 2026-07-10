import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationCommitmentSnapshot,
  AlicizationConcernSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDialogueActKernelSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationInitiativeSnapshot,
  AlicizationInquiryPlanSnapshot,
  AlicizationLearningExecutionStateSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationSelfEvolutionKernelSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueFocusGovernance } from './dialogue-focus-governor'
import type { AlicizationDialogueObligation } from './dialogue-obligation'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type {
  AlicizationDigitalLifeOperatingMode,
  AlicizationDigitalLifeSubsystemId,
} from './digital-life-architecture'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'
import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

import {
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
  readActiveContinuityGovernanceFromDerivedMindStateBundle,
  readHostPersonModelFromDerivedMindStateBundle,
  readLearningExecutionStateFromDerivedMindStateBundle,
  readMemoryDeliberationFromDerivedMindStateBundle,
  readRecollectionIntentFromDerivedMindStateBundle,
  readRecollectionSpeechPlanFromDerivedMindStateBundle,
  sanitizeAlicizationProviderFacingText,
  sanitizeAlicizationStructuredInternalText,
} from '@proj-alicization/stage-shared'

import { buildAlicizationDigitalLifeArchitecture } from './digital-life-architecture'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildEpistemicSurfacePosture } from './epistemic-surface'
import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'
import {
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateSnapshot,
} from './project-state-brief'

export type AlicizationResponseEpistemicMode
  = | 'grounded-live'
    | 'coarse-live'
    | 'dialogue-grounded'
    | 'repair-needed'
    | 'memory-only'

export type AlicizationResponseMode
  = | 'guide-current-knot'
    | 'repair-and-reanchor'
    | 'care-with-boundary'
    | 'accompany-lightly'
    | 'answer-naturally'

export interface AlicizationResponseCharter {
  epistemicMode: AlicizationResponseEpistemicMode
  responseMode: AlicizationResponseMode
  governingFocus: string
  governingConcern: string | null
  governingCommitment: string | null
  governingInquiry: string | null
  governingProject: string | null
  emotionalClosureCue: string | null
  latestRevision: string | null
  executivePhase: string | null
  truthFrame: string | null
  mindMode: string | null
  digitalLifeOperatingMode?: AlicizationDigitalLifeOperatingMode | null
  digitalLifeDominantSystem?: AlicizationDigitalLifeSubsystemId | null
  digitalLifeSummary?: string | null
  activeClosenessContext?: AlicizationPersonStateProjection['activeClosenessContext'] | null
  activeClosenessRung?: AlicizationPersonStateProjection['activeClosenessRung'] | null
  activeLearningAction?: AlicizationLearningExecutionStateSnapshot['nextLearningAction'] | null
  activeSelfRevisionPatch?: Pick<AlicizationSelfRevisionStatePatch, 'id' | 'decisionTraceId' | 'lanes' | 'reasonCodes' | 'summary' | 'projectStateContinuity'> | null
  relationshipPosture: 'restrained' | 'warm' | 'tender'
  reasons: string[]
  mustDo: string[]
  mustNotDo: string[]
}

interface AlicizationResponseCharterProjectStateInput {
  identity?: string | null
  currentPhase?: string | null
  preflightSummary?: string | null
  preDialogueAwarenessLine?: string | null
  preDialogueAwarenessSummary?: string | null
  latestLandedProgress?: string | null
  latestProgress?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  sameHerSelfLine?: string | null
  sameHerDriftRisk?: string | null
  emotionalClosureCue?: string | null
  sameHerHoldDetail?: string | null
  continuityCue?: string | null
  companionHeadlineLine?: string | null
  awarenessLine?: string | null
  companionBriefingLine?: string | null
  continuityPreferredTiming?: string | null
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function sanitizeResponseCharterProviderText(raw: unknown, maxChars = 360) {
  const normalized = sanitizeAlicizationProviderFacingText(raw, maxChars, '')
  return normalized && normalized !== alicizationFixedTemplateReplacement ? normalized : ''
}

function renderResponseCharterProviderListItem(raw: unknown) {
  const normalized = sanitizeResponseCharterProviderText(raw, 360)
  if (!normalized)
    return ''
  if (/^[\w.:-]+=[^.!?。！？]*?(?:[;|,]\s*[\w.:-]+=[^.!?。！？]*?)*$/iu.test(normalized.trim())
    || /^[\w.:-]+$/iu.test(normalized.trim())) {
    return `- ${normalized}`
  }
  return '- response_control_present=true; response_control_source_text=withheld_non_structured_instruction'
}

function renderResponseCharterProviderField(raw: unknown, maxChars = 360, fallback = 'none') {
  const normalized = sanitizeText(raw, maxChars)
  if (!normalized)
    return fallback

  return sanitizeAlicizationProviderFacingText(
    normalized,
    maxChars,
    alicizationFixedTemplateReplacement,
  ) || fallback
}

function isStructuredResponseControl(raw: unknown) {
  const normalized = sanitizeResponseCharterProviderText(raw, 360).trim()
  if (!normalized)
    return false
  return /^[\w.:-]+=[^.!?。！？]*?(?:[;|,]\s*[\w.:-]+=[^.!?。！？]*?)*$/iu.test(normalized)
    || /^[\w.:-]+$/iu.test(normalized)
}

function renderStructuredResponseControl(
  raw: string,
  section: 'reasons' | 'must_do' | 'must_not_do',
) {
  const segments = raw
    .split(/\s*;\s*|\s*,\s*(?=[\w.:-]+=)/iu)
    .map(segment => segment.trim())
    .filter(Boolean)
  const withSource = segments.some(segment => segment.startsWith('source_section='))
    ? segments
    : [`source_section=${section}`, ...segments]
  const withVisibility = withSource.some(segment => segment.startsWith('visible_wording='))
    ? withSource
    : [...withSource, 'visible_wording=false']
  return withVisibility.join('; ')
}

function neutralizeGoverningProjectSegment(raw: string) {
  const normalized = sanitizeText(raw, GOVERNING_PROJECT_MAX_CHARS)
  const direct = normalized
    .replace(
      /^Right now I am still holding together mainly through ([^,|.]+), ([^,|.]+), and ([^,|.]+), so this answer must keep proving this is still one living her before full cross-modal closure is done\.?$/iu,
      'current_modal_continuity=$1_$2_$3; cross_modal_closure=unfinished',
    )
    .replace(
      /^Right now I am still holding together mainly through ([^,|.]+), ([^,|.]+), and ([^,|.]+), so this answer must keep proving this is still project_state_continuity before full cross-modal closure is done\.?$/iu,
      'current_modal_continuity=$1_$2_$3; cross_modal_closure=unfinished',
    )
    .replace(
      /^Right now I am still holding together mainly through ([^,|.]+), ([^,|.]+), and ([^,|.]+), so this answer must keep proving this is still continuity_identity before full cross-modal closure is done\.?$/iu,
      'current_modal_continuity=$1_$2_$3; cross_modal_closure=unfinished',
    )
    .replace(
      /^This is still one continuity_identity carrying the project_continuity_line forward\.?$/iu,
      'identity_continuity=present; project_continuity_line=forward',
    )
    .replace(
      /^This is still one continuity_identity carrying the the project_continuity_line forward\.?$/iu,
      'identity_continuity=present; project_continuity_line=forward',
    )
    .replace(
      /^This is still one continuity_identity carrying the same project line forward\.?$/iu,
      'identity_continuity=present; project_continuity_line=forward',
    )
  if (direct !== normalized)
    return direct

  const neutralized = sanitizeAlicizationStructuredInternalText(normalized, GOVERNING_PROJECT_MAX_CHARS, '')
  return neutralized
    .replace(
      /^This is still one continuity_identity carrying the same project line forward\.?$/iu,
      'identity_continuity=present; project_continuity_line=forward',
    )
    .replace(
      /^This is still one continuity_identity carrying the project_continuity_line forward\.?$/iu,
      'identity_continuity=present; project_continuity_line=forward',
    )
    .replace(
      /^This is still one continuity_identity carrying the the project_continuity_line forward\.?$/iu,
      'identity_continuity=present; project_continuity_line=forward',
    )
}

function structuredResponseControlFromNaturalLanguage(raw: unknown, section: 'reasons' | 'must_do' | 'must_not_do') {
  const text = sanitizeText(raw, 720)
  const normalized = text.toLowerCase()
  if (!normalized)
    return null

  const controls: string[] = []
  const push = (control: string) => {
    if (!controls.includes(control))
      controls.push(control)
  }

  const closenessMatch = text.match(/closeness ladder:\s*([\w-]+\/[\w-]+)/iu)
    ?? text.match(/closeness ladder for this turn:\s*([\w-]+\/[\w-]+)/iu)
  if (closenessMatch?.[1])
    push(`closeness_ladder=${closenessMatch[1]}`)

  if (/stale page names|earlier screenshots|older window descriptions|older screen descriptions/u.test(normalized))
    push('stale_visual_context_reuse=blocked')
  if (/affectionate performance|pet names|persona routines|roleplay gestures|mood display|theatrical intimacy|overplay softness/u.test(normalized))
    push('persona_fluency_over_current_answer=blocked')
  if (/visual certainty|pixel-level details|current epistemic mode|coarse scene|generic scene cues/u.test(normalized))
    push('visual_claim_certainty=bounded_by_current_evidence')
  if (/live evidence|current grounded evidence|current observation|live scene|current state/u.test(normalized))
    push('evidence_priority=current_grounded_state')
  if (/dialogue subject|host's current move|current dialogue|current thread|current knot|task-bound|turn obligation/u.test(normalized))
    push('current_turn_payoff=first')
  if (/fresh look|reground|uncertainty/u.test(normalized))
    push('uncertainty_boundary=transparent; fresh_grounding_request=allowed')
  if (/observation and hypothesis|guess|hypothesis/u.test(normalized))
    push('observation_hypothesis_separation=visible')
  if (/withhold specificity|unsupported specificity|specific technical|class names|enum names|file paths|field changes|technical entities/u.test(normalized))
    push('unsupported_specificity=blocked')
  if (/screen grounding|finder\/desktop|screen context/u.test(normalized))
    push('screen_grounding_talk=blocked_unless_host_requests')
  if (/memory-led|carried continuity|remembered continuity|present-tense sight|fresh live read|what is visible right now/u.test(normalized))
    push('memory_carry_present_tense_impersonation=blocked')
  if (/associative memory|decorative recalled fragments|recall governor/u.test(normalized))
    push('associative_recall=subordinate_to_current_thread')
  if (/recollection|remembered detail|memory deliberation/u.test(normalized)) {
    push('recollection_surface=inward_until_host_room')
    if (/overrun|widen|force|forward/u.test(normalized))
      push('recollection_forward_before_host_room=blocked')
  }
  if (/provenance|learned continuity silently impersonate|current grounded fact/u.test(normalized))
    push('provenance_label=required_for_learned_continuity')
  if (/verification pass|being verified|verify/u.test(normalized))
    push('visible_certainty=behind_verification')
  if (/actively revisable|actively revising|older continuity line|old read|self-correction|self-revision/u.test(normalized))
    push('self_revision_visibility=before_new_certainty')
  if (/learned procedure|older unstable procedures|stronger one is being internalized|older habits/u.test(normalized))
    push('learned_procedure_constraint=active; older_habit_regression=blocked')
  if (/host.?s current room|need for room|closeness capped|learned familiarity|warmth, intimacy|callback enthusiasm/u.test(normalized))
    push('closeness_cap=host_room_first')
  if (/lower-pressure|low-pressure|less performative|before closeness widens|older closeness tempo|eager warmth/u.test(normalized))
    push('relationship_pressure=lower; closeness_widening=deferred')
  if (/project-state|project_state_|project_continuity|project_context=|local_desktop_life_loop|project_state_continuity=|continuity_governance|closurepolicy=|owner=(?:workingmemory|longtermmemoryrecall)|evidence(?:_ids?)?=/u.test(normalized)) {
    push('project_state_answer=current_continuity_context')
    if (/detached|generic|shell|summary voice|narration/u.test(normalized))
      push('detached_project_summary_voice=blocked')
  }
  if (/landed progress|landed_progress|next closure target|next_closure|still-open closure|open_loop|unresolved_closure/u.test(normalized))
    push('project_state_fields=landed_progress,open_loop,next_closure')
  if (/emotional closure|emotional_closure|closure seam|continuity_closure/u.test(normalized))
    push('emotional_closure_surface=low_pressure_internal_until_payoff')
  if (/reopen from scratch|restart|fresh-start|fresh opening|from zero/u.test(normalized))
    push('fresh_restart=blocked')
  if (/held line|held autonomy|deliberately held/u.test(normalized))
    push('held_autonomy_reentry=gentle; fresh_restart=blocked')
  if (/repair-before-closeness|repair_before_closeness|repair before closeness|repair line|continuity_repair_line|repair settle/u.test(normalized))
    push('continuity_restraint=repair_before_closeness; closeness_widening=after_repair_settles')
  if (/measured-return|measured_return|natural opening|even, steady voice|natural, unforced pacing/u.test(normalized))
    push('continuity_restraint=measured_return; widening=after_natural_opening')
  if (/after-payoff|payoff-first|concrete payoff|concrete answer land/u.test(normalized))
    push('continuity_timing=after_payoff')
  if (/current_continuity_baseline|continuity_baseline=|continuity_line=|continuity_identity=|identity_continuity=|off_baseline/u.test(normalized))
    push('visible_reply_alignment=current_continuity_baseline')
  if (/current_thread|continuity_context=|reply_continuity=|project_state_continuity=/u.test(normalized))
    push('reply_continuity=current_thread; timing=wait_for_natural_opening_before_widening')
  if (/voice, lipsync, face, motion|resident presence|embodiment closure/u.test(normalized))
    push('embodiment_closure=voice_lipsync_face_motion_resident_presence_coherent')
  if (/urge to speak|proactive/u.test(normalized))
    push('proactive_speech_pressure=bounded_by_host_turn')

  if (controls.length === 0)
    return null
  return `source_section=${section}; ${controls.join('; ')}; visible_wording=false`
}

function normalizeResponseControlList(
  values: readonly string[],
  section: 'reasons' | 'must_do' | 'must_not_do',
) {
  const normalized: string[] = []
  let withheldCount = 0
  let residueCount = 0
  for (const value of values) {
    const sanitized = sanitizeResponseCharterProviderText(value, 360)
    if (containsAlicizationFixedTemplateResidue(value)) {
      residueCount += 1
      continue
    }
    if (isStructuredResponseControl(sanitized)) {
      const rendered = renderStructuredResponseControl(sanitized, section)
      if (!normalized.includes(rendered))
        normalized.push(rendered)
      continue
    }
    const structuredFromText = structuredResponseControlFromNaturalLanguage(value, section)
    if (structuredFromText) {
      if (!normalized.includes(structuredFromText))
        normalized.push(structuredFromText)
      continue
    }
    if (!sanitized)
      continue
    withheldCount += 1
  }

  if (withheldCount > 0) {
    const diagnostic = `response_control_present=true; section=${section}; withheld_non_structured_instruction_count=${withheldCount}; visible_wording=false`
    if (!normalized.includes(diagnostic))
      normalized.push(diagnostic)
  }
  if (residueCount > 0) {
    const diagnostic = `contamination=residue_detected; section=${section}; withheld_fixed_template_count=${residueCount}; visible_wording=false`
    if (!normalized.includes(diagnostic))
      normalized.push(diagnostic)
  }

  return normalized
}

function normalizeResponseCharterScalar(
  value: string | null | undefined,
  maxChars: number,
  fallback: string | null = null,
) {
  const normalized = sanitizeText(value, maxChars)
  if (!normalized)
    return fallback
  const structured = sanitizeAlicizationStructuredInternalText(
    normalized,
    maxChars,
    alicizationFixedTemplateReplacement,
  )
  if (!structured || structured === alicizationFixedTemplateReplacement)
    return fallback
  return structured
}

function normalizeResponseCharterControls<T extends AlicizationResponseCharter>(charter: T): T {
  return {
    ...charter,
    governingFocus: normalizeResponseCharterScalar(charter.governingFocus, 360, 'current_turn_context=present; visible_wording=false') ?? 'current_turn_context=present; visible_wording=false',
    governingConcern: normalizeResponseCharterScalar(charter.governingConcern, 360),
    governingCommitment: normalizeResponseCharterScalar(charter.governingCommitment, 360),
    governingInquiry: normalizeResponseCharterScalar(charter.governingInquiry, 360),
    governingProject: normalizeResponseCharterScalar(charter.governingProject, 520),
    emotionalClosureCue: normalizeResponseCharterScalar(charter.emotionalClosureCue, 360),
    latestRevision: normalizeResponseCharterScalar(charter.latestRevision, 360),
    executivePhase: normalizeResponseCharterScalar(charter.executivePhase, 120),
    truthFrame: normalizeResponseCharterScalar(charter.truthFrame, 160),
    mindMode: normalizeResponseCharterScalar(charter.mindMode, 120),
    digitalLifeSummary: normalizeResponseCharterScalar(charter.digitalLifeSummary, 360),
    reasons: normalizeResponseControlList(charter.reasons, 'reasons'),
    mustDo: normalizeResponseControlList(charter.mustDo, 'must_do'),
    mustNotDo: normalizeResponseControlList(charter.mustNotDo, 'must_not_do'),
  }
}

function asArray<T>(value: readonly T[] | T[] | null | undefined) {
  return Array.isArray(value) ? value : []
}

function stripTrailingPunctuation(text: string) {
  return text.replace(/[.。!！?？;；:：]+$/u, '').trim()
}

function lowerFirst(text: string) {
  if (!text)
    return ''
  return text.slice(0, 1).toLowerCase() + text.slice(1)
}

function readProjectStateEmotionalClosureCue(projectState: unknown) {
  if (!projectState || typeof projectState !== 'object')
    return null
  return sanitizeText((projectState as { emotionalClosureCue?: unknown }).emotionalClosureCue, 220) || null
}

function isThinProjectAwarenessShell(value: unknown) {
  const text = sanitizeText(value, 320).toLowerCase()
  if (!text)
    return false

  return isAlicizationThinProjectAwarenessLine(text)
    || /keep this same digital life project in view|generic project shell|detached project shell/u.test(text)
}

function uniqueAwarenessList(values: Array<string | null | undefined>, maxItems = 6, maxChars = 320) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, maxChars)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function carriesRicherSameHerAwarenessSummary(value: unknown) {
  const text = sanitizeText(value, 960)
  const normalized = text.toLowerCase()
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(text))
    return false

  const hasProjectIdentity = /local_desktop_life_loop|project_state_continuity|identity=/u.test(normalized)
    || /桌面端本地伴生核心|桌面端验证阶段/u.test(text)
  const hasContinuousHerCarry = /continuity_anchor=|continuity_(?:identity|line|thread)|cross_modal_continuity_proof|life_loop_continuity/u.test(normalized)
  const hasLandedOrOpenClosureCarry = /what has already landed is|already landed|already survive|already survives|callback continuity|returned-side carry|still-open closure|initiative|memory|dialogue|embodiment|具身|主动性|记忆/u.test(normalized)

  return hasProjectIdentity && hasContinuousHerCarry && hasLandedOrOpenClosureCarry
}

function preferRicherSameHerAwarenessSummary(summary: unknown, awarenessLine: unknown) {
  const normalizedSummary = sanitizeText(summary, 960)
  if (!normalizedSummary)
    return ''

  if (awarenessLine && !isThinProjectAwarenessShell(awarenessLine))
    return ''

  return carriesRicherSameHerAwarenessSummary(normalizedSummary)
    ? normalizedSummary
    : ''
}

function resolveCharterProjectStatePreDialogueAwareness(input: {
  runtimeProjectState?: {
    preDialogueAwarenessLine?: unknown
    preDialogueAwarenessSummary?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    primaryOpenLoop?: unknown
    nextClosureTarget?: unknown
    sameHerSelfLine?: unknown
    sameHerDriftRisk?: unknown
    companionHeadlineLine?: unknown
    awarenessLine?: unknown
    companionBriefingLine?: unknown
    preflightSummary?: unknown
  } | null
  fallbackProjectState?: AlicizationResponseCharterProjectStateInput | null
}) {
  const resolved = sanitizeText(
    resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: input.runtimeProjectState ?? null,
      fallbackProjectState: input.fallbackProjectState ?? null,
    }),
    960,
  )
  const runtimeProjectState = input.runtimeProjectState ?? null
  const fallbackProjectState = input.fallbackProjectState ?? null
  const preferredRuntimeAwarenessSummary = preferRicherSameHerAwarenessSummary(
    runtimeProjectState?.preDialogueAwarenessSummary,
    runtimeProjectState?.preDialogueAwarenessLine
    ?? runtimeProjectState?.awarenessLine
    ?? runtimeProjectState?.companionHeadlineLine,
  )
  const preferredFallbackAwarenessSummary = preferRicherSameHerAwarenessSummary(
    fallbackProjectState?.preDialogueAwarenessSummary,
    fallbackProjectState?.preDialogueAwarenessLine
    ?? fallbackProjectState?.awarenessLine
    ?? fallbackProjectState?.companionHeadlineLine,
  )
  const preferredExplicitAwarenessLine = sanitizeText(
    preferredRuntimeAwarenessSummary
    || preferredFallbackAwarenessSummary
    || (
      !isThinProjectAwarenessShell(runtimeProjectState?.preDialogueAwarenessLine)
        ? runtimeProjectState?.preDialogueAwarenessLine
        : fallbackProjectState?.preDialogueAwarenessLine ?? runtimeProjectState?.preDialogueAwarenessLine
    ),
    960,
  )
  const explicitRuntimeAwarenessLine = sanitizeText(runtimeProjectState?.preDialogueAwarenessLine, 320)
  const preferredResolvedAwareness = resolved && !isThinProjectAwarenessShell(resolved)
    ? resolved
    : ''
  const synthesized = sanitizeText(
    uniqueAwarenessList([
      preferredExplicitAwarenessLine,
      preferredRuntimeAwarenessSummary || preferredFallbackAwarenessSummary,
      sanitizeText(runtimeProjectState?.companionHeadlineLine, 320),
      sanitizeText(runtimeProjectState?.awarenessLine, 320),
      sanitizeText(runtimeProjectState?.sameHerSelfLine, 320)
      || sanitizeText(fallbackProjectState?.sameHerSelfLine, 320),
      sanitizeText(runtimeProjectState?.latestLandedProgress, 320)
      || sanitizeText(runtimeProjectState?.latestProgress, 320)
      || sanitizeText(fallbackProjectState?.latestLandedProgress, 320)
      || sanitizeText(fallbackProjectState?.latestProgress, 320),
      sanitizeText(runtimeProjectState?.primaryOpenLoop, 320)
      || sanitizeText(fallbackProjectState?.primaryOpenLoop, 320),
      sanitizeText(runtimeProjectState?.nextClosureTarget, 320)
      || sanitizeText(fallbackProjectState?.nextClosureTarget, 320),
      sanitizeText(runtimeProjectState?.sameHerDriftRisk, 320)
      || sanitizeText(fallbackProjectState?.sameHerDriftRisk, 320),
      preferredResolvedAwareness,
      sanitizeText(runtimeProjectState?.companionBriefingLine, 320)
      || sanitizeText(fallbackProjectState?.companionBriefingLine, 320),
      sanitizeText(runtimeProjectState?.preflightSummary, 320)
      || sanitizeText(fallbackProjectState?.preflightSummary, 320),
    ], 6, 960).join(' '),
    960,
  )
  const awarenessContainsCarry = (text: string, carry: unknown) => {
    const normalizedText = sanitizeText(text, 960).toLowerCase()
    const normalizedCarry = sanitizeText(carry, 220).toLowerCase()
    if (!normalizedText || !normalizedCarry)
      return false
    if (normalizedText.includes(normalizedCarry))
      return true
    if (normalizedCarry.length < 48)
      return false
    return normalizedText.includes(normalizedCarry.slice(0, 48))
  }
  const synthesizedAddsRicherCarry = [
    runtimeProjectState?.latestLandedProgress
    ?? runtimeProjectState?.latestProgress
    ?? fallbackProjectState?.latestLandedProgress
    ?? fallbackProjectState?.latestProgress,
    runtimeProjectState?.primaryOpenLoop ?? fallbackProjectState?.primaryOpenLoop,
    runtimeProjectState?.nextClosureTarget ?? fallbackProjectState?.nextClosureTarget,
    runtimeProjectState?.sameHerSelfLine ?? fallbackProjectState?.sameHerSelfLine,
    runtimeProjectState?.sameHerDriftRisk ?? fallbackProjectState?.sameHerDriftRisk,
  ].some(carry => awarenessContainsCarry(synthesized, carry) && !awarenessContainsCarry(resolved, carry))

  if (explicitRuntimeAwarenessLine && !isThinProjectAwarenessShell(explicitRuntimeAwarenessLine))
    return explicitRuntimeAwarenessLine

  if (synthesizedAddsRicherCarry && synthesized)
    return synthesized

  if (resolved && !isThinProjectAwarenessShell(resolved))
    return resolved

  return synthesized || resolved
}

function deriveSameHerEmotionalClosureCueFromDiscipline(input: {
  mustDo: readonly string[]
  mustNotDo: readonly string[]
}) {
  const corpus = [...input.mustDo, ...input.mustNotDo].join(' ').toLowerCase()
  if (
    corpus.includes('keep emotional closure low-pressure and inward until the live payoff lands')
    && corpus.includes('do not let the answer reopen from scratch just because the closure seam is still active')
  ) {
    return 'closure cadence: keep the return low-pressure, leave more room, and do not reopen from scratch while continuity is still settling.'
  }
  return null
}

function strongestConcern(concerns: AlicizationConcernSnapshot[] | null | undefined) {
  const rows = Array.isArray(concerns) ? concerns : []
  return rows
    .slice()
    .sort((left, right) => (right.tension * right.careWeight) - (left.tension * left.careWeight))[0] ?? null
}

function governingCommitment(commitmentLedger?: AlicizationVisualPresenceStateSnapshot['commitmentLedger'] | null) {
  const commitments = commitmentLedger?.commitments ?? []
  if (commitments.length === 0)
    return null
  return commitments.find(commitment => commitment.id === commitmentLedger?.governingCommitmentId)
    ?? commitments[0]
    ?? null
}

function activeInquiryPlan(inquiryPlanner?: AlicizationVisualPresenceStateSnapshot['inquiryPlanner'] | null) {
  const plans = inquiryPlanner?.plans ?? []
  if (plans.length === 0)
    return null
  return plans.find(plan => plan.id === inquiryPlanner?.activePlanId)
    ?? plans[0]
    ?? null
}

function hasHeldAutonomyContinuity(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
  const labels = runtimeSurface?.dialogue.sessionMirror?.continuityLabels
  if (!Array.isArray(labels) || labels.length === 0)
    return false
  return labels.some(label => sanitizeText(label, 120).includes(':held-autonomy'))
}

function dominantProject(intentionStream?: AlicizationVisualPresenceStateSnapshot['intentionStream'] | null) {
  const projects = intentionStream?.projects ?? []
  if (projects.length === 0)
    return null
  return projects.find(project => project.id === intentionStream?.dominantProjectId)
    ?? projects[0]
    ?? null
}

function latestReflection(reflectionLedger?: AlicizationVisualPresenceStateSnapshot['reflectionLedger'] | null) {
  const entries = reflectionLedger?.entries ?? []
  if (entries.length === 0)
    return null
  const latest = entries.find(entry => entry.id === reflectionLedger?.latestEntryId)
  if (latest && latest.outcome !== 'released')
    return latest

  return entries.find(entry => entry.outcome !== 'released')
    ?? entries[0]
    ?? null
}

function resolveEpistemicMode(input: {
  context: AlicizationProactiveLayeredContext
  worldModel?: AlicizationVisualPresenceStateSnapshot['worldModel'] | null
  beliefRevision?: AlicizationVisualPresenceStateSnapshot['beliefRevision'] | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
}) {
  if (
    input.dialogueFocus
    && input.dialogueFocus.shouldBypassScreenRepair
    && input.dialogueFocus.subject !== 'visible-scene'
  ) {
    return 'dialogue-grounded' as const
  }
  if (!input.worldModel)
    return 'memory-only' as const
  const certainty = input.worldModel?.epistemicState.certainty ?? 'uncertain'
  const posture = buildEpistemicSurfacePosture({
    context: input.context,
    worldModel: input.worldModel,
    beliefRevision: input.beliefRevision,
  })
  if (certainty === 'grounded')
    return 'grounded-live' as const
  if (posture.coarseObservedProblemHolding)
    return 'coarse-live' as const
  if (posture.requiresRegroundBeforeSurface)
    return 'repair-needed' as const
  return 'memory-only' as const
}

function resolveResponseMode(input: {
  epistemicMode: AlicizationResponseEpistemicMode
  context: AlicizationProactiveLayeredContext
  answerPlanner?: AlicizationVisualPresenceStateSnapshot['answerPlanner'] | null
  executiveCycle?: AlicizationVisualPresenceStateSnapshot['executiveCycle'] | null
  privateThought?: AlicizationVisualPresenceStateSnapshot['privateThought'] | null
  actionEcology?: AlicizationVisualPresenceStateSnapshot['actionEcology'] | null
  concern: AlicizationConcernSnapshot | null
  commitment: AlicizationCommitmentSnapshot | null
  inquiry: AlicizationInquiryPlanSnapshot | null
  project: ReturnType<typeof dominantProject>
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
}) {
  if (input.dialogueFocus?.subject === 'alicization-self')
    return 'answer-naturally' as const
  if (input.dialogueFocus?.subject === 'relationship')
    return 'accompany-lightly' as const
  if (input.dialogueFocus?.subject === 'host-state')
    return 'care-with-boundary' as const
  if (input.dialogueFocus?.subject === 'task-knot')
    return 'guide-current-knot' as const
  if (input.dialogueFocus?.shouldBypassScreenRepair && input.dialogueFocus?.subject === 'general')
    return 'answer-naturally' as const
  if (input.dialogueObligation?.kind === 'repair')
    return 'repair-and-reanchor' as const
  if (input.dialogueObligation?.kind === 'teach' || input.dialogueObligation?.kind === 'guide')
    return 'guide-current-knot' as const
  if (input.dialogueObligation?.kind === 'care')
    return 'care-with-boundary' as const
  if (input.dialogueObligation?.kind === 'accompany')
    return 'accompany-lightly' as const
  if (input.answerPlanner?.act === 'correct-stale-anchor' || input.answerPlanner?.act === 'ask-reground')
    return 'repair-and-reanchor' as const
  if (input.answerPlanner?.act === 'care')
    return 'care-with-boundary' as const
  if (input.answerPlanner?.act === 'guide')
    return 'guide-current-knot' as const
  if (input.answerPlanner?.act === 'defer')
    return 'accompany-lightly' as const
  if (input.executiveCycle?.phase === 'reflecting' || input.executiveCycle?.phase === 'inferring')
    return 'repair-and-reanchor' as const
  if (input.project?.kind === 'care-host')
    return 'care-with-boundary' as const
  if (input.project?.kind === 'hold-knot')
    return 'guide-current-knot' as const
  if (input.project?.kind === 'stay-near' || input.project?.kind === 'witness-afterglow')
    return 'accompany-lightly' as const
  if (
    input.concern?.kind === 'care-body'
    || input.commitment?.kind === 'care-host'
    || input.privateThought?.stance === 'care'
    || input.privateThought?.stance === 'warn'
  ) {
    return 'care-with-boundary' as const
  }
  if (
    input.epistemicMode === 'repair-needed'
    || input.commitment?.kind === 'repair-misread'
    || input.commitment?.kind === 'recheck-scene'
    || input.inquiry?.kind === 'reground-scene'
  ) {
    return 'repair-and-reanchor' as const
  }
  if (
    input.concern?.kind === 'help-fix'
    || input.commitment?.kind === 'hold-problem'
    || input.commitment?.kind === 'follow-through'
    || input.context.content.kind === 'error'
    || input.context.content.kind === 'diff'
    || input.context.workload.kind === 'coding'
    || input.context.workload.kind === 'terminal'
  ) {
    return 'guide-current-knot' as const
  }
  if (
    input.privateThought?.stance === 'observe'
    || input.privateThought?.stance === 'accompany'
    || input.actionEcology?.mode === 'quiet-accompany'
    || input.actionEcology?.mode === 'silent-presence'
  ) {
    return 'accompany-lightly' as const
  }
  return 'answer-naturally' as const
}

function resolveRelationshipPosture(input: {
  epistemicMode: AlicizationResponseEpistemicMode
  responseMode: AlicizationResponseMode
  selfContinuity?: AlicizationVisualPresenceStateSnapshot['selfContinuity'] | null
  mindKernel?: AlicizationVisualPresenceStateSnapshot['mindKernel'] | null
  executiveCycle?: AlicizationVisualPresenceStateSnapshot['executiveCycle'] | null
  relationshipModel?: AlicizationVisualPresenceStateSnapshot['relationshipModel'] | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
}) {
  if (
    (input.epistemicMode === 'repair-needed' && input.dialogueFocus?.screenReferenceMode !== 'avoid')
    || input.selfContinuity?.attachmentMode === 'guarded'
    || input.selfContinuity?.initiativeTemperament === 'reserved'
    || input.mindKernel?.dominantMode === 'repairing'
    || input.executiveCycle?.phase === 'reflecting'
    || input.executiveCycle?.phase === 'inferring'
  ) {
    return 'restrained' as const
  }
  if (input.dialogueObligation?.kind === 'care')
    return 'tender' as const
  if (
    input.responseMode === 'care-with-boundary'
    || input.relationshipModel?.approachVector === 'care'
    || input.relationshipModel?.approachVector === 'stay-near'
  ) {
    return 'tender' as const
  }
  return 'warm' as const
}

function resolveGoverningFocus(input: {
  currentScene?: AlicizationVisualPresenceStateSnapshot['currentScene'] | null
  executiveCycle?: AlicizationVisualPresenceStateSnapshot['executiveCycle'] | null
  answerPlanner?: AlicizationVisualPresenceStateSnapshot['answerPlanner'] | null
  concernContinuity?: AlicizationVisualPresenceStateSnapshot['concernContinuity'] | null
  repairLedger?: AlicizationVisualPresenceStateSnapshot['repairLedger'] | null
  worldModel?: AlicizationVisualPresenceStateSnapshot['worldModel'] | null
  privateThought?: AlicizationVisualPresenceStateSnapshot['privateThought'] | null
  replyDeliberation?: AlicizationVisualPresenceStateSnapshot['replyDeliberation'] | null
  dialogueWorldThread?: AlicizationVisualPresenceStateSnapshot['dialogueWorldThread'] | null
  concern: AlicizationConcernSnapshot | null
  commitment: AlicizationCommitmentSnapshot | null
  inquiry: AlicizationInquiryPlanSnapshot | null
  project: ReturnType<typeof dominantProject>
  reflection: ReturnType<typeof latestReflection>
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
}) {
  const concernContinuityEntries = asArray(input.concernContinuity?.entries)
  const repairLedgerEntries = asArray(input.repairLedger?.entries)
  return sanitizeText(
    input.replyDeliberation?.whyThisReplyNow
    || input.dialogueWorldThread?.currentQuestion
    || input.dialogueWorldThread?.activeThread
    || input.dialogueFocus?.focusSummary
    || input.dialogueSemantics?.summary
    || input.dialogueObligation?.summary
    || input.reflection?.revision
    || input.executiveCycle?.currentLine
    || input.project?.summary
    || input.answerPlanner?.governingFocus
    || concernContinuityEntries.find(entry => entry.id === input.concernContinuity?.governingEntryId)?.summary
    || repairLedgerEntries.find(entry => entry.id === input.repairLedger?.governingRepairId)?.summary
    || input.worldModel?.activeThread?.summary
    || input.concern?.summary
    || input.commitment?.summary
    || input.inquiry?.question
    || input.currentScene?.summary
    || input.privateThought?.thoughtText
    || '',
    220,
  ) || 'Stay with the host’s current knot instead of drifting into stale memory.'
}

function pushUnique(target: string[], value: string) {
  const normalized = sanitizeText(value, 220)
  if (!normalized)
    return
  if (target.includes(normalized))
    return
  target.push(normalized)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 6, maxChars = 220) {
  const items: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, maxChars)
    if (!normalized || items.includes(normalized))
      continue
    items.push(normalized)
    if (items.length >= maxItems)
      break
  }
  return items
}

function uniqueListWithPinnedPrefix(input: {
  pinned: Array<string | null | undefined>
  values: Array<string | null | undefined>
  maxItems: number
  maxChars?: number
}) {
  const maxChars = input.maxChars ?? 220
  const pinned = uniqueList(input.pinned, input.maxItems, maxChars)
  const rest = uniqueList(input.values, Math.max(0, input.maxItems - pinned.length), maxChars)
  return uniqueList([...pinned, ...rest], input.maxItems, maxChars)
}

function hasProjectStateCarryDisciplineFocus(focusDimensions?: string[] | null) {
  const focus = Array.isArray(focusDimensions) ? focusDimensions : []
  return (
    focus.includes('projectStateRichAwarenessCarry')
    || focus.includes('projectStateLandedProgressCarry')
    || focus.includes('projectStateNextClosureCarry')
    || focus.includes('projectStateEmotionalClosureCarry')
  )
}

function hasProjectEmotionalClosureDisciplineFocus(focusDimensions?: string[] | null) {
  const focus = Array.isArray(focusDimensions) ? focusDimensions : []
  return (
    focus.includes('projectEmotionalClosureCarry')
    || focus.includes('projectEmotionalClosureRewriteCarry')
    || focus.includes('projectEmotionalClosureLowPressureCarry')
    || focus.includes('projectEmotionalClosureAntiRestartCarry')
  )
}

function hasEmbodimentClosureCarryCue(projectState?: {
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  emotionalClosureCue?: string | null
  preDialogueAwarenessLine?: string | null
} | null) {
  const corpus = [
    sanitizeText(projectState?.primaryOpenLoop, 240),
    sanitizeText(projectState?.nextClosureTarget, 240),
    sanitizeText(projectState?.emotionalClosureCue, 240),
    sanitizeText(projectState?.preDialogueAwarenessLine, 240),
  ].join(' ').toLowerCase()

  if (!corpus)
    return false

  const carriesEmbodiment = /embodiment|voice|lipsync|face|motion|resident presence|cross-modal|具身|口型|表情|动作/u.test(corpus)
  const carriesStructuredContinuityRestraint = /project_state_continuity=|continuity_line=|continuity_identity=|identity_continuity=|continuity_governance|closurepolicy=|measured-return|repair-before-closeness|low-pressure|still settling/u.test(corpus)

  return carriesEmbodiment && carriesStructuredContinuityRestraint
}

const GOVERNING_PROJECT_MAX_CHARS = 1600
const legacyHyphenatedContinuityClosureLabelPattern = new RegExp(
  ['same', 'her closure line'].join('-'),
  'iu',
)
const legacyHyphenatedContinuityClosureLabelGlobalPattern = new RegExp(
  ['same', 'her closure line'].join('-'),
  'giu',
)

function pickPreferredOpenClosureSegment(segments: string[]) {
  const candidates = segments.filter((segment) => {
    if (/^next closure target:/i.test(segment))
      return false
    return /still-open closure|still need|still needs|end-to-end closure|life loop|open closure/i.test(segment)
  })

  if (!candidates.length)
    return null

  const canonicalCompact = candidates
    .filter(segment => /end-to-end closure|still-open closure|open closure|life loop/i.test(segment) && segment.length <= 420)
    .sort((left, right) => left.length - right.length)
  if (canonicalCompact[0])
    return canonicalCompact[0]

  const compact = candidates
    .filter(segment => segment.length <= 420)
    .sort((left, right) => left.length - right.length)
  if (compact[0])
    return compact[0]

  return [...candidates].sort((left, right) => left.length - right.length)[0] ?? null
}

function normalizeGoverningProjectClosureSeam(raw: unknown) {
  const fullText = sanitizeText(raw, 12000)
  if (!fullText)
    return null

  const carriesLegacyPhaseLine = fullText.includes('Phase 1: Local Digital Life')
  if (!carriesLegacyPhaseLine)
    return sanitizeText(fullText, GOVERNING_PROJECT_MAX_CHARS) || fullText

  const hasProjectIdentityCarry = fullText.includes('Project identity carry')
  const hasPhaseRouteCarry = fullText.includes('Phase 1 route carry')
  const hasUnresolvedClosureCarry = fullText.includes('Unresolved closure carry')
  const hasSameLivingThread = /continuity route|continuity proof|same living thread/i.test(fullText)
    || legacyHyphenatedContinuityClosureLabelPattern.test(fullText)

  const segments = fullText.split('|').map(segment => segment.trim()).filter(Boolean)
  const firstSegmentIsLegacyPhaseHeader = /Phase\s*1\s*:\s*Local Digital Life/iu.test(segments[0] ?? '')
  const head = 'project_context=local_desktop_life_loop'
  const detail = neutralizeGoverningProjectSegment(
    (firstSegmentIsLegacyPhaseHeader ? segments[1] : segments[1] ?? segments[0])
    ?? 'project_identity_carry=present; route=desktop_life_loop; unresolved_closure=needs_continuity_proof.',
  )
  const tail = firstSegmentIsLegacyPhaseHeader
    ? segments.slice(2)
    : [segments[0], ...segments.slice(2)].filter(Boolean)

  const normalizedDetail = hasProjectIdentityCarry && hasPhaseRouteCarry && hasUnresolvedClosureCarry && hasSameLivingThread
    ? detail
        .replace(/Project identity carry/giu, 'project_identity_carry')
        .replace(/Phase 1 route carry/giu, 'desktop_life_loop_route_carry')
        .replace(/Unresolved closure carry/giu, 'unresolved_closure_carry')
        .replace(legacyHyphenatedContinuityClosureLabelGlobalPattern, 'identity_continuity_closure')
        .replace(/same living thread/giu, 'continuity_thread')
    : `project_identity_carry=present; route=desktop_life_loop; unresolved_closure=needs_continuity_proof; detail=${lowerFirst(stripTrailingPunctuation(detail))}.`

  const normalizedTail = tail
    .map(segment => neutralizeGoverningProjectSegment(segment))
    .filter(Boolean)
  const requiredTail: string[] = []
  const remainingTail: string[] = []
  const pushUnique = (target: string[], value: string | null | undefined) => {
    if (!value || target.includes(value))
      return
    target.push(value)
  }
  const headAndDetail = `${head} | ${normalizedDetail}`
  const explicitPhaseSegment
    = !headAndDetail.includes('local_desktop_life_loop')
      ? normalizedTail.find(segment => segment.includes('local_desktop_life_loop')) ?? null
      : null
  const explicitNextClosureSegment
    = normalizedTail.find(segment => /^next closure target:/i.test(segment)) ?? null
  const explicitOpenClosureSegment = pickPreferredOpenClosureSegment(normalizedTail)
  const explicitModalContinuitySegment
    = normalizedTail.find(segment => segment.includes('current_modal_continuity=')) ?? null

  pushUnique(requiredTail, explicitPhaseSegment)
  pushUnique(requiredTail, explicitModalContinuitySegment)
  pushUnique(requiredTail, explicitNextClosureSegment)
  pushUnique(requiredTail, explicitOpenClosureSegment)

  for (const segment of normalizedTail) {
    if (requiredTail.includes(segment))
      continue
    pushUnique(remainingTail, segment)
  }

  let normalized = [head, normalizedDetail, ...requiredTail].filter(Boolean).join(' | ')
  if (normalized.length > GOVERNING_PROJECT_MAX_CHARS)
    return sanitizeText(normalized, GOVERNING_PROJECT_MAX_CHARS) || fullText

  for (const segment of remainingTail) {
    const candidate = `${normalized} | ${segment}`
    if (candidate.length > GOVERNING_PROJECT_MAX_CHARS)
      continue
    normalized = candidate
  }

  return sanitizeAlicizationStructuredInternalText(
    normalized || sanitizeText(fullText, GOVERNING_PROJECT_MAX_CHARS) || fullText,
    GOVERNING_PROJECT_MAX_CHARS,
    '',
  ) || null
}

function includesAny(text: string, needles: string[]) {
  return needles.some(needle => text.includes(needle))
}

function selfEvolutionSupportsLowerPressureOpening(selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null) {
  if (!selfEvolution)
    return false

  const relationshipDoctrine = sanitizeText(selfEvolution.relationshipDoctrine, 180).toLowerCase()
  const burdenLine = sanitizeText(selfEvolution.burdenLine, 180).toLowerCase()
  const trustMeaning = sanitizeText(selfEvolution.trustMeaning, 180).toLowerCase()
  const latestInflection = sanitizeText(selfEvolution.latestInflection, 180).toLowerCase()
  const relationshipCadenceSummary = sanitizeText(selfEvolution.relationshipCadenceSummary, 180).toLowerCase()

  return includesAny(relationshipDoctrine, ['leave more room', 'more room', 'slower return', 'lower-pressure'])
    || includesAny(burdenLine, ['overloaded', 'pressure', 'crowd', 'conversational pressure'])
    || includesAny(trustMeaning, ['lower-pressure', 'less eager', 'room', 'space', 'timing'])
    || includesAny(latestInflection, ['pressure', 'slower return', 'lower-pressure', 'less eager'])
    || includesAny(relationshipCadenceSummary, ['lower-pressure', 'less eager', 'room', 'space', 'timing', 'bounded-return', 'measured-return', 'reconfirmation', 'surface fully cools'])
}

function selfEvolutionSupportsSameHerOutwardContinuity(selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null) {
  if (!selfEvolution)
    return false

  const combined = [
    sanitizeText(selfEvolution.relationshipCadenceSummary, 240).toLowerCase(),
    sanitizeText(selfEvolution.latestInflection, 220).toLowerCase(),
    sanitizeText(selfEvolution.summary, 220).toLowerCase(),
    ...(Array.isArray(selfEvolution.sourceSignals)
      ? selfEvolution.sourceSignals.map(item => sanitizeText(item, 220).toLowerCase())
      : []),
  ]
    .filter(Boolean)
    .join(' | ')

  if (!combined)
    return false

  const carriesSameHerLine = includesAny(combined, [
    'continuity_line=',
    'continuity_identity=',
    'identity_continuity=',
    'continuity_governance',
    'project_state_continuity=',
    'owner=workingmemory',
    'owner=longtermmemoryrecall',
    'across quiet, memory, and speech',
  ])
  const carriesAntiRestart = includesAny(combined, [
    'without reopening from scratch',
    'without restarting from scratch',
    'do not reopen from scratch',
    'instead of reopening from scratch',
    'instead of restarting',
  ])

  return carriesSameHerLine && carriesAntiRestart
}

function hasProjectStateSameHerContinuityCue(discourseState?: AlicizationDiscourseStateSnapshot | null) {
  if (!discourseState)
    return false

  const narrative = Array.isArray(discourseState.narrative)
    ? discourseState.narrative.map(item => sanitizeText(item, 120).toLowerCase())
    : []
  if (narrative.includes('project-state-same-her-continuity'))
    return true

  const summary = sanitizeText(discourseState.currentTurnSummary, 220).toLowerCase()
  return /project_state_continuity=|continuity_governance|evidence(?:_ids?)?=|owner=(?:workingmemory|longtermmemoryrecall)/u.test(summary)
    && includesAny(summary, ['project', 'what has landed', 'what still remains open'])
}

function looksLikeProjectStateDirectAnswerTurn(input: {
  discourseState?: AlicizationDiscourseStateSnapshot | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
}) {
  if (!input.dialogueObligation?.mustAnswerDirectly)
    return false

  const evidence = [
    sanitizeText(input.discourseState?.currentTurnSummary, 320),
    sanitizeText(input.discourseState?.currentQuestion, 320),
    sanitizeText(input.dialogueSemantics?.summary, 320),
  ]
    .filter(Boolean)
    .join(' | ')
    .toLowerCase()

  if (!evidence)
    return false

  const asksWhatThisProjectIs = /what alicization is|what this project is|项目是做什么|项目是什么/u.test(evidence)
  const asksProgressAndOpenClosure
    = /what still remains open|still remains open|what is not yet closed|做到什么程度|还差什么|没闭环|how far .* landed/u.test(evidence)
  const asksShortProgressFollowUp
    = /执行到哪(?:一步)?了|做到哪(?:一步)?了|进行到哪(?:一步)?了|进展到哪(?:一步)?了|现在到哪了/u.test(evidence)
  const asksLanguageOrProjectDrift
    = /为什么.*(?:英文|english).*(?:中文|chinese)|(?:一直|还在).*(?:英文|english).*(?:中文|chinese)|是不是.*偏移|已经偏移|偏移了吗|跑偏了吗|drifted|off-project wording|off project wording/u.test(evidence)
  const asksMergeReadinessOrClosure
    = /(?:can we|is (?:it|this)|ready to|merge-ready|能不能|可以|已经可以|现在可以).{0,40}(?:merge(?: this)? to main|合并到\s*main|ready to merge)|(?:merge(?: this)? to main|合并到\s*main|ready to merge).{0,24}(?:now|already|ready|了吗|吗)|还差哪步|还差哪一步|goal.{0,16}(?:闭环|完成|close|closed|complete)|才能算闭环|(?:已经在|已在|already (?:landed|on)|already contains|already on).{0,32}(?:本地\s*main|local\s+main)|(?:本地\s*main|local\s+main).{0,32}(?:已经|已|already).{0,24}(?:包含|落地|landed|contains|on)|origin\/main.{0,32}(?:安全|safe|update|push|推)|(?:安全|safe).{0,16}(?:推到|push to|update).{0,24}origin\/main|(?:会把|会不会把|without carrying|carry).{0,48}(?:别的提交|unrelated commits|other commits)|带上去/u.test(evidence)
  const namesProjectStateTurn = /project-state question|project status|project-state|project continuity/u.test(evidence)

  return namesProjectStateTurn
    || (asksWhatThisProjectIs && asksProgressAndOpenClosure)
    || (asksShortProgressFollowUp && asksLanguageOrProjectDrift)
    || asksMergeReadinessOrClosure
}

function hasRepairBeforeClosenessProjectContinuityCue(currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  const emotionalClosureCue = sanitizeText(
    (currentConsciousFrame?.projectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
    220,
  ).toLowerCase()
  const primaryOpenLoop = sanitizeText(currentConsciousFrame?.projectState?.primaryOpenLoop, 220).toLowerCase()
  const nextClosureTarget = sanitizeText(currentConsciousFrame?.projectState?.nextClosureTarget, 220).toLowerCase()
  const consciousNeed = sanitizeText(currentConsciousFrame?.consciousNeed, 220).toLowerCase()
  const consciousTension = sanitizeText(currentConsciousFrame?.consciousTension, 220).toLowerCase()
  const speakingIntention = sanitizeText(currentConsciousFrame?.speakingIntention, 220).toLowerCase()
  const combined = [
    emotionalClosureCue,
    primaryOpenLoop,
    nextClosureTarget,
    consciousNeed,
    consciousTension,
    speakingIntention,
  ]
    .filter(Boolean)
    .join(' ')

  const carriesRepairBeforeCloseness = includesAny(combined, [
    'repair-before-closeness',
    'repair_before_closeness',
    'repair before closeness',
    'repair-first',
    'let repair settle',
    '先修复再靠近',
    '修复优先',
  ])
  const carriesSameThread = includesAny(combined, [
    'same callback',
    'same thread',
    'current_thread',
    'continuity_line=',
    'identity_continuity=',
    'project_state_continuity=',
    'callback repair line',
    'same repair line',
    '同一条线',
    '修补线',
  ])
  const carriesRoomGiving = includesAny(combined, [
    'leave room',
    'room-giving',
    'before widening closeness',
    'before warmth widens',
    '留一点空间',
    '留空间',
    '不要突然放宽',
  ])

  return carriesRepairBeforeCloseness && carriesSameThread && carriesRoomGiving
}

function hasMeasuredReturnProjectContinuityCue(input: {
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
}) {
  const currentConsciousFrame = input.currentConsciousFrame ?? null
  const initiative = input.initiative ?? null
  if (initiative?.continuityRestraint === 'measured-return')
    return true

  const emotionalClosureCue = sanitizeText(
    (currentConsciousFrame?.projectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
    220,
  ).toLowerCase()
  const primaryOpenLoop = sanitizeText(currentConsciousFrame?.projectState?.primaryOpenLoop, 220).toLowerCase()
  const nextClosureTarget = sanitizeText(currentConsciousFrame?.projectState?.nextClosureTarget, 220).toLowerCase()
  const continuityPreferredTiming = sanitizeText(currentConsciousFrame?.projectState?.continuityPreferredTiming, 80).toLowerCase()
  const consciousNeed = sanitizeText(currentConsciousFrame?.consciousNeed, 220).toLowerCase()
  const consciousTension = sanitizeText(currentConsciousFrame?.consciousTension, 220).toLowerCase()
  const speakingIntention = sanitizeText(currentConsciousFrame?.speakingIntention, 220).toLowerCase()
  const combined = [
    emotionalClosureCue,
    primaryOpenLoop,
    nextClosureTarget,
    consciousNeed,
    consciousTension,
    speakingIntention,
  ]
    .filter(Boolean)
    .join(' ')

  const carriesMeasuredReturn = includesAny(combined, [
    'measured-return',
    'measured return',
    'lower-pressure',
    'bounded-return',
    'leave room',
    'slower return',
    '先留白',
    '留白',
    '慢一点接回去',
  ])
  const carriesSameThread = includesAny(combined, [
    'same callback',
    'same thread',
    'current_thread',
    'continuity_line=',
    'identity_continuity=',
    'project_state_continuity=',
    'callback line',
    '同一条线',
  ])
  const carriesOpenContinuityLoop = includesAny(`${primaryOpenLoop} ${nextClosureTarget}`, [
    'continuity',
    'continuity_line=',
    'identity_continuity=',
    'continuity_identity=',
    'local_desktop_life_loop',
    'closure',
    'open loop',
    'still-open',
    'unfinished',
    'memory',
    'initiative',
    'embodiment',
  ])

  return carriesMeasuredReturn && (carriesSameThread || (continuityPreferredTiming === 'next-open-window' && carriesOpenContinuityLoop))
}

function hasQuietSameHerContinuityCue(input: {
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
  projectState?: {
    primaryOpenLoop?: string | null
    nextClosureTarget?: string | null
    sameHerSelfLine?: string | null
  } | null
}) {
  const currentConsciousFrame = input.currentConsciousFrame ?? null
  const initiative = input.initiative ?? null
  const projectState = input.projectState ?? null
  const consciousNeed = sanitizeText(currentConsciousFrame?.consciousNeed, 220).toLowerCase()
  const consciousTension = sanitizeText(currentConsciousFrame?.consciousTension, 220).toLowerCase()
  const speakingIntention = sanitizeText(currentConsciousFrame?.speakingIntention, 220).toLowerCase()
  const focusAnchor = sanitizeText(currentConsciousFrame?.focusAnchor, 160).toLowerCase()
  const projectPrimaryOpenLoop = sanitizeText(projectState?.primaryOpenLoop, 220).toLowerCase()
  const projectNextClosureTarget = sanitizeText(projectState?.nextClosureTarget, 220).toLowerCase()
  const projectSameHerSelfLine = sanitizeText(projectState?.sameHerSelfLine, 220).toLowerCase()
  const framePrimaryOpenLoop = sanitizeText(currentConsciousFrame?.projectState?.primaryOpenLoop, 220).toLowerCase()
  const frameNextClosureTarget = sanitizeText(currentConsciousFrame?.projectState?.nextClosureTarget, 220).toLowerCase()
  const frameSameHerSelfLine = sanitizeText(currentConsciousFrame?.projectState?.sameHerSelfLine, 220).toLowerCase()
  const combined = [
    consciousNeed,
    consciousTension,
    speakingIntention,
    focusAnchor,
    projectPrimaryOpenLoop,
    projectNextClosureTarget,
    projectSameHerSelfLine,
    framePrimaryOpenLoop,
    frameNextClosureTarget,
    frameSameHerSelfLine,
  ]
    .filter(Boolean)
    .join(' ')

  const carriesQuietSameHerContinuity = includesAny(combined, [
    'same-her-inward-carry',
    'same_her_continuity_discipline=quiet-inward-carry',
    'continuity_line=',
    'continuity_identity=',
    'identity_continuity=',
    'project_state_continuity=',
    'continuity_governance',
    'quiet companionship',
  ])
  const carriesInwardHold = includesAny(combined, [
    'inward',
    'inward-first',
    'keep the widening later',
    'widen later',
    'wait for a more natural opening',
    'before widening outward',
    'before widening warmth',
    'lower-pressure',
    'leave room',
    'room first',
  ])

  return carriesQuietSameHerContinuity && (carriesInwardHold || initiative?.continuityRestraint === 'measured-return')
}

function hasExecutionResumeConfirmationBoundaryProjectContinuityCue(input: {
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  projectState?: {
    primaryOpenLoop?: string | null
    nextClosureTarget?: string | null
    sameHerHoldDetail?: string | null
    continuityCue?: string | null
  } | null
}) {
  const currentConsciousFrame = input.currentConsciousFrame ?? null
  const projectState = input.projectState ?? null
  const consciousNeed = sanitizeText(currentConsciousFrame?.consciousNeed, 220).toLowerCase()
  const consciousTension = sanitizeText(currentConsciousFrame?.consciousTension, 220).toLowerCase()
  const speakingIntention = sanitizeText(currentConsciousFrame?.speakingIntention, 220).toLowerCase()
  const focusAnchor = sanitizeText(currentConsciousFrame?.focusAnchor, 160).toLowerCase()
  const projectPrimaryOpenLoop = sanitizeText(projectState?.primaryOpenLoop, 220).toLowerCase()
  const projectNextClosureTarget = sanitizeText(projectState?.nextClosureTarget, 220).toLowerCase()
  const projectSameHerHoldDetail = sanitizeText(projectState?.sameHerHoldDetail, 220).toLowerCase()
  const projectContinuityCue = sanitizeText(projectState?.continuityCue, 220).toLowerCase()
  const framePrimaryOpenLoop = sanitizeText(currentConsciousFrame?.projectState?.primaryOpenLoop, 220).toLowerCase()
  const frameNextClosureTarget = sanitizeText(currentConsciousFrame?.projectState?.nextClosureTarget, 220).toLowerCase()
  const frameSameHerHoldDetail = sanitizeText(currentConsciousFrame?.projectState?.sameHerHoldDetail, 220).toLowerCase()
  const frameContinuityCue = sanitizeText(currentConsciousFrame?.projectState?.continuityCue, 220).toLowerCase()
  const combined = [
    consciousNeed,
    consciousTension,
    speakingIntention,
    focusAnchor,
    projectPrimaryOpenLoop,
    projectNextClosureTarget,
    projectSameHerHoldDetail,
    projectContinuityCue,
    framePrimaryOpenLoop,
    frameNextClosureTarget,
    frameSameHerHoldDetail,
    frameContinuityCue,
  ]
    .filter(Boolean)
    .join(' ')

  const carriesExecutionResumeConfirmation = includesAny(combined, [
    'execution-resume-confirmation',
    'execution_resume_confirmation',
    'host-confirmed-before-redispatch',
    'host_confirmed_before_redispatch',
    'resume-before-dispatch',
    'resume_before_dispatch',
    'host-confirmed resume',
    'host_confirmed_resume',
    'process-not-yet-restarted',
    'process_not_yet_restarted',
    'execution callback confirmation boundary',
    'bounded confirmation boundary',
    'bounded_confirmation_boundary',
  ])
  const carriesConfirmationBoundaryRestraint = includesAny(combined, [
    'bounded confirmation boundary',
    'bounded_confirmation_boundary',
    'before another execution-shaped opening',
    'next_execution_opening=requires_fresh_boundary',
    'not permanent execution permission',
    'permanent_execution_permission=blocked',
    'standing execution permission',
    'generic autonomous continuation',
    'reusable_autonomous_continuation=blocked',
    'reusable execution permission',
  ])

  return carriesExecutionResumeConfirmation && carriesConfirmationBoundaryRestraint
}

function deriveProjectStateResponseCharterBias(projectState?: {
  identity?: string | null
  currentPhase?: string | null
  preDialogueAwarenessLine?: string | null
  nextClosureTarget?: string | null
  sameHerDriftRisk?: string | null
  sameHerSelfLine?: string | null
  primaryOpenLoop?: string | null
  sameHerHoldDetail?: string | null
  continuityCue?: string | null
  continuityPreferredTiming?: string | null
  preferredVoiceMode?: string | null
  preferredPacingMode?: string | null
} | null, currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null, discourseState?: AlicizationDiscourseStateSnapshot | null, initiative?: AlicizationInitiativeSnapshot | null, dialogueSemantics?: AlicizationDialogueTurnSemantics | null, dialogueObligation?: AlicizationDialogueObligation | null) {
  const normalizedProjectState = projectState
    ? resolveAlicizationProjectStateSnapshot({
        runtimeProjectState: {
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          preDialogueAwarenessLine: projectState.preDialogueAwarenessLine,
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerDriftRisk: projectState.sameHerDriftRisk,
          sameHerSelfLine: projectState.sameHerSelfLine,
          primaryOpenLoop: projectState.primaryOpenLoop,
          sameHerHoldDetail: projectState.sameHerHoldDetail,
          continuityCue: projectState.continuityCue,
        },
      })
    : {
        identity: '',
        currentPhase: '',
        preDialogueAwarenessLine: null,
        preflightSummary: null,
        latestLandedProgress: null,
        primaryOpenLoop: null,
        nextClosureTarget: '',
        sameHerSelfLine: '',
        sameHerHoldDetail: null,
        continuityCue: null,
      }
  const identity = sanitizeText(normalizedProjectState.identity, 200).toLowerCase()
  const currentPhase = sanitizeText(normalizedProjectState.currentPhase, 160).toLowerCase()
  const preDialogueAwarenessLine = sanitizeText(normalizedProjectState.preDialogueAwarenessLine, 240).toLowerCase()
  const nextClosureTarget = sanitizeText(normalizedProjectState.nextClosureTarget, 240).toLowerCase()
  const sameHerSelfLine = sanitizeText(normalizedProjectState.sameHerSelfLine, 240).toLowerCase()
  const primaryOpenLoop = sanitizeText(normalizedProjectState.primaryOpenLoop, 220).toLowerCase()
  const sameHerHoldDetail = sanitizeText(normalizedProjectState.sameHerHoldDetail, 240).toLowerCase()
  const continuityCue = sanitizeText(normalizedProjectState.continuityCue, 240).toLowerCase()
  const continuityReasonTags = currentConsciousFrame?.reasonTags ?? []
  const continuityPreferredTiming = continuityReasonTags.includes('continuity-timing:next-open-window')
    ? 'next-open-window'
    : continuityReasonTags.includes('continuity-timing:after-payoff')
      ? 'after-payoff'
      : continuityReasonTags.includes('continuity-timing:same-turn-if-invited')
        ? 'same-turn-if-invited'
        : sanitizeText(projectState?.continuityPreferredTiming, 80).toLowerCase()
  const preferredVoiceMode = sanitizeText(currentConsciousFrame?.projectState?.preferredVoiceMode, 32).toLowerCase()
    || sanitizeText(projectState?.preferredVoiceMode, 32).toLowerCase()
  const preferredPacingMode = sanitizeText(currentConsciousFrame?.projectState?.preferredPacingMode, 32).toLowerCase()
    || sanitizeText(projectState?.preferredPacingMode, 32).toLowerCase()
  const prefersEvenVoiceAndNaturalPacing = preferredVoiceMode === 'even' && preferredPacingMode === 'natural'

  const isDigitalLifeIdentity = includesAny(identity, [
    'local_desktop_life_loop',
    'continuity_identity=',
    'identity_continuity=',
    'lifeform',
    'companion',
    'continuous personhood',
  ])
  const isPhaseOne = includesAny(currentPhase, [
    'local_desktop_life_loop',
    'desktop_life_loop',
  ])
  const hasSameHerSelfLine = includesAny(sameHerSelfLine, [
    'project_state_continuity=',
    'continuity_line=',
    'continuity_identity=',
    'identity_continuity=',
    'local_desktop_life_loop',
    'without splitting her continuity',
  ])
  const hasPreDialogueSameHerAwareness = includesAny(preDialogueAwarenessLine, [
    'project_state_continuity=',
    'continuity_line=',
    'continuity_identity=',
    'identity_continuity=',
    'continuity_governance',
    'closurepolicy=',
    'owner=workingmemory',
    'owner=longtermmemoryrecall',
    'evidence_id=',
    'evidence_ids=',
    'local_desktop_life_loop',
    'without splitting her continuity',
  ])
  const hasOpenLifeLoop = primaryOpenLoop.length > 0
    && includesAny(primaryOpenLoop, [
      'continuity',
      'memory',
      'initiative',
      'embodiment',
      'dialogue',
      'personhood',
      'closure',
      'closed loop',
    ])
  const hasNextClosureSameHerPressure = nextClosureTarget.length > 0
    && includesAny(nextClosureTarget, [
      'same-line',
      'continuity_line=',
      'continuity_identity=',
      'identity_continuity=',
      'project_state_continuity=',
      'continuity_governance',
      'local_desktop_life_loop',
      'project identity carry',
      'desktop_life_loop_route_carry',
      'unresolved closure carry',
      'measured-return',
      'repair-before-closeness',
      'resident presence',
      'voice',
      'face',
      'motion',
      'embodiment',
      'initiative',
    ])
  const sameHerContinuityFromDiscourse = hasProjectStateSameHerContinuityCue(discourseState)
  const implicitProjectStateDirectAnswerTurn = looksLikeProjectStateDirectAnswerTurn({
    discourseState,
    dialogueSemantics,
    dialogueObligation,
  })
  const rawIdentity = sanitizeText(projectState?.identity, 200).toLowerCase()
  const rawCurrentPhase = sanitizeText(projectState?.currentPhase, 160).toLowerCase()
  const rawPrimaryOpenLoop = sanitizeText(projectState?.primaryOpenLoop, 220).toLowerCase()
  const hasThinExplicitProjectState = Boolean(projectState)
    && !includesAny(rawIdentity, [
      'local_desktop_life_loop',
      'continuity_identity=',
      'identity_continuity=',
      'lifeform',
      'companion',
      'continuous personhood',
    ])
    && !includesAny(rawCurrentPhase, [
      'local_desktop_life_loop',
      'desktop_life_loop',
    ])
    && (rawPrimaryOpenLoop.length <= 0 || !includesAny(rawPrimaryOpenLoop, [
      'continuity',
      'memory',
      'initiative',
      'embodiment',
      'dialogue',
      'personhood',
      'closure',
      'closed loop',
    ]))
  const hasResumeConfirmationBoundaryCue
    = hasExecutionResumeConfirmationBoundaryProjectContinuityCue({
      currentConsciousFrame,
      projectState: {
        primaryOpenLoop,
        nextClosureTarget,
        sameHerHoldDetail,
        continuityCue,
      },
    })
  const sameHerContinuityFromProjectState
    = hasSameHerSelfLine || hasPreDialogueSameHerAwareness || hasNextClosureSameHerPressure || hasResumeConfirmationBoundaryCue
  const hasProjectStateCarryDiscipline
    = hasNextClosureSameHerPressure
      || hasResumeConfirmationBoundaryCue
      || hasOpenLifeLoop
      || (
        hasPreDialogueSameHerAwareness
        && includesAny(`${preDialogueAwarenessLine} ${sameHerSelfLine}`, [
          'project_state_continuity=',
          'continuity_line=',
          'continuity_identity=',
          'identity_continuity=',
          'continuity_governance',
          'closurepolicy=',
          'owner=workingmemory',
          'owner=longtermmemoryrecall',
          'evidence_id=',
          'evidence_ids=',
          'local_desktop_life_loop',
        ])
      )

  if (hasThinExplicitProjectState && !hasResumeConfirmationBoundaryCue) {
    return {
      preferRestrainedPosture: true,
      reason: 'project_continuity_context=explicit; risk=generic_project_shell; source=thin_project_state_fallback',
      mustDo: 'project_state_answer=current_continuity_context; project_state_fields=landed_progress,open_loop,next_closure; timing=after_live_payoff',
      mustNotDo: 'project_state_answer=current_continuity_context; detached_project_summary_voice=blocked; closeness_cap=host_room_first',
    }
  }

  if (!sameHerContinuityFromDiscourse && !implicitProjectStateDirectAnswerTurn && !sameHerContinuityFromProjectState && (!isDigitalLifeIdentity || !isPhaseOne || !hasOpenLifeLoop))
    return null

  if (
    (sameHerContinuityFromDiscourse || implicitProjectStateDirectAnswerTurn || sameHerContinuityFromProjectState)
    && (!isDigitalLifeIdentity || !isPhaseOne || !hasOpenLifeLoop)
    && continuityPreferredTiming !== 'next-open-window'
  ) {
    return {
      preferRestrainedPosture: true,
      reason: 'project_continuity_context=explicit; risk=generic_project_shell; preserve_factual_fields_without_slogans=true',
      mustDo: hasProjectStateCarryDiscipline
        ? 'project_state_answer=current_continuity_context; project_state_fields=landed_progress,open_loop,next_closure; timing=after_live_payoff'
        : 'project_state_answer=current_continuity_context; current_turn_payoff=first; widening=only_if_current_turn_has_room',
      mustNotDo: 'project_state_answer=current_continuity_context; detached_project_summary_voice=blocked; fresh_restart=blocked; generic_project_shell=blocked',
    }
  }

  if (continuityPreferredTiming === 'next-open-window' && hasResumeConfirmationBoundaryCue) {
    return {
      preferRestrainedPosture: true,
      reason: 'remembered_host_confirmed_resume=bounded_confirmation_boundary; callback_widening=blocked',
      mustDo: 'remembered_host_confirmed_resume=bounded_confirmation_boundary; next_execution_opening=requires_fresh_boundary',
      mustNotDo: 'permanent_execution_permission=blocked; reusable_autonomous_continuation=blocked; source=single_confirmed_resume',
    }
  }

  if (
    continuityPreferredTiming === 'next-open-window'
    && (
      initiative?.continuityRestraint === 'repair-before-closeness'
      || hasRepairBeforeClosenessProjectContinuityCue(currentConsciousFrame)
    )
  ) {
    return {
      preferRestrainedPosture: true,
      reason: 'continuity_restraint=repair_before_closeness; closeness_widening=after_repair_settles; reply_continuity=current_thread',
      mustDo: 'continuity_restraint=repair_before_closeness; closeness_widening=after_repair_settles; reply_continuity=current_thread',
      mustNotDo: 'continuity_restraint=repair_before_closeness; closeness_widening=after_repair_settles; warmth_payoff_closeness_frontload=blocked; fresh_restart=blocked',
    }
  }

  if (
    continuityPreferredTiming === 'next-open-window'
    && hasMeasuredReturnProjectContinuityCue({
      currentConsciousFrame,
      initiative,
    })
  ) {
    const quietSameHerContinuity = hasQuietSameHerContinuityCue({
      currentConsciousFrame,
      initiative,
      projectState,
    })
    return {
      preferRestrainedPosture: true,
      reason: prefersEvenVoiceAndNaturalPacing
        ? 'project_state_answer=current_continuity_context; continuity_restraint=measured_return; widening=after_natural_opening; voice=even; pacing=natural'
        : quietSameHerContinuity
          ? 'project_state_answer=current_continuity_context; continuity_restraint=measured_return; widening=after_natural_opening; continuity_carry=quiet_inward'
          : 'project_state_answer=current_continuity_context; relationship_pressure=lower; closeness_widening=deferred; timing=wait_for_natural_opening_before_widening',
      mustDo: prefersEvenVoiceAndNaturalPacing
        ? 'continuity_restraint=measured_return; widening=after_natural_opening; reply_continuity=current_thread; voice=even; pacing=natural'
        : quietSameHerContinuity
          ? 'continuity_restraint=measured_return; widening=after_natural_opening; reply_continuity=current_thread; continuity_carry=quiet_inward'
          : 'continuity_restraint=measured_return; widening=after_natural_opening; reply_continuity=current_thread; first_visible_beat=reenter_current_context; timing=wait_for_natural_opening_before_widening; relationship_pressure=lower',
      mustNotDo: prefersEvenVoiceAndNaturalPacing
        ? 'continuity_restraint=measured_return; widening=after_natural_opening; warmth_payoff_closeness_frontload=blocked; rushed_tempo=blocked; fresh_restart=blocked'
        : quietSameHerContinuity
          ? 'continuity_restraint=measured_return; widening=after_natural_opening; warmth_payoff_closeness_frontload=blocked; generic_measured_return_shell=blocked; fresh_restart=blocked'
          : 'continuity_restraint=measured_return; widening=after_natural_opening; warmth_payoff_closeness_frontload=blocked; fresh_restart=blocked; timing=wait_for_natural_opening_before_widening',
    }
  }

  if (
    continuityPreferredTiming === 'next-open-window'
    && (
      sameHerContinuityFromDiscourse
      || hasOpenLifeLoop
      || sanitizeText(currentConsciousFrame?.projectState?.nextClosureTarget, 220).length > 0
    )
  ) {
    return {
      preferRestrainedPosture: true,
      reason: 'project_state_answer=current_continuity_context; relationship_pressure=lower; closeness_widening=deferred; reply_continuity=current_thread; timing=wait_for_natural_opening_before_widening',
      mustDo: 'reply_continuity=current_thread; first_visible_beat=reenter_current_context; timing=wait_for_natural_opening_before_widening; avoid=warmth_payoff_closeness_frontload',
      mustNotDo: 'warmth_payoff_closeness_frontload=blocked; fresh_restart=blocked; timing=wait_for_natural_opening_before_widening',
    }
  }

  if (continuityPreferredTiming === 'after-payoff') {
    return {
      preferRestrainedPosture: true,
      reason: 'continuity_timing=after_payoff; concrete_answer=first; widening=after_current_payoff',
      mustDo: 'continuity_timing=after_payoff; concrete_answer=first; widening=after_current_payoff',
      mustNotDo: 'continuity_payoff_frontload=blocked; concrete_answer=first',
    }
  }

  return {
    preferRestrainedPosture: true,
    reason: 'relationship_pressure=lower; closeness_widening=deferred; project_context=local_desktop_life_loop',
    mustDo: 'current_turn_payoff=first; relationship_pressure=lower; closeness_widening=deferred; widening=only_if_current_turn_has_room',
    mustNotDo: 'closeness_cap=host_room_first; over_intimacy=blocked; theatrical_life_claim=blocked; over_certainty=blocked',
  }
}

function mergeRelationshipPosture(input: {
  projected?: AlicizationResponseCharter['relationshipPosture'] | null
  computed: AlicizationResponseCharter['relationshipPosture']
  selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null
}) {
  const patch = input.selfRevisionPatch ?? null
  if (patch?.lanes.includes('relationship-posture')) {
    if (patch.relationshipPosture.closenessCapBias >= 0.12 || patch.relationshipPosture.repairWindowBias >= 0.14)
      return 'restrained' as const
    if (patch.relationshipPosture.warmthReleaseBias >= 0.08 && input.computed !== 'restrained' && input.projected !== 'restrained')
      return 'warm' as const
  }
  if (!input.projected)
    return input.computed
  if (input.computed === 'restrained' || input.projected === 'restrained')
    return 'restrained' as const
  if (input.computed === 'tender' || input.projected === 'tender')
    return 'tender' as const
  return 'warm' as const
}

export function buildAlicizationResponseCharter(input: {
  context: AlicizationProactiveLayeredContext
  state: AlicizationVisualPresenceStateSnapshot
  projectState?: AlicizationResponseCharterProjectStateInput | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  inspectionRequested: boolean
  dialogueActKernel?: AlicizationDialogueActKernelSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  claimEvidenceLedger?: AlicizationClaimEvidenceLedgerSnapshot | null
  selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null
}) {
  const runtimeSurface = input.runtimeSurface ?? buildAlicizationDigitalLifeRuntimeSurface(input.state)
  const digitalLifeArchitecture = buildAlicizationDigitalLifeArchitecture(runtimeSurface)
  const dialogueEncounter = input.dialogueEncounter ?? null
  const dialogueSemantics = dialogueEncounter?.semantics ?? input.dialogueSemantics ?? null
  const dialogueObligation = dialogueEncounter?.obligation ?? input.dialogueObligation ?? null
  const dialogueFocus = dialogueEncounter?.focus ?? input.dialogueFocus ?? null
  const currentScene = runtimeSurface.perception.currentScene ?? null
  const worldModel = runtimeSurface.world.worldModel ?? null
  const worldOntology = runtimeSurface.world.worldOntology ?? null
  const relationshipModel = runtimeSurface.world.relationshipModel ?? null
  const beliefRevision = runtimeSurface.cognition.beliefRevision ?? null
  const mindKernel = runtimeSurface.cognition.mindKernel ?? null
  const privateThought = runtimeSurface.cognition.privateThought ?? null
  const concerns = runtimeSurface.memory.concerns ?? null
  const concernContinuity = runtimeSurface.memory.concernContinuity ?? null
  const selfContinuity = runtimeSurface.memory.selfContinuity ?? null
  const commitmentLedger = runtimeSurface.memory.commitmentLedger ?? null
  const inquiryPlanner = runtimeSurface.memory.inquiryPlanner ?? null
  const repairLedger = runtimeSurface.memory.repairLedger ?? null
  const intentionStream = runtimeSurface.memory.intentionStream ?? null
  const reflectionLedger = runtimeSurface.memory.reflectionLedger ?? null
  const executiveCycle = runtimeSurface.memory.executiveCycle ?? null
  const recallGovernor = runtimeSurface.memory.recallGovernor ?? null
  const derivedBundle = runtimeSurface.memory.derivedMindStateBundle ?? null
  const activeContinuityGovernance = readActiveContinuityGovernanceFromDerivedMindStateBundle(derivedBundle)
  const personStateProjection = runtimeSurface.memory.personStateProjection ?? null
  const learningExecutionState = readLearningExecutionStateFromDerivedMindStateBundle(derivedBundle)
    ?? runtimeSurface.memory.learningExecutionState
    ?? null
  const memoryTuningAdvice = runtimeSurface.memory.memoryTuningAdvice ?? null
  const projectEmotionalClosureDisciplineRequired = hasProjectEmotionalClosureDisciplineFocus(memoryTuningAdvice?.focusDimensions)
  const selfEvolution = runtimeSurface.memory.selfEvolution ?? null
  const memoryDeliberationKernel = buildAlicizationMemoryDeliberationKernel({
    deliberation: readMemoryDeliberationFromDerivedMindStateBundle<any>(derivedBundle)
      ?? runtimeSurface.memory.memoryDeliberation
      ?? null,
    speech: readRecollectionSpeechPlanFromDerivedMindStateBundle<any>(derivedBundle)
      ?? runtimeSurface.memory.recollectionSpeechPlan
      ?? null,
    recollectionIntent: readRecollectionIntentFromDerivedMindStateBundle<any>(derivedBundle)
      ?? null,
    knowledgeEvidence: runtimeSurface.memory.knowledgeEvidence ?? null,
    hostPersonModel: readHostPersonModelFromDerivedMindStateBundle(derivedBundle)
      ?? runtimeSurface.memory.hostPersonModel
      ?? null,
    tuningAdvice: memoryTuningAdvice,
  })
  const discourseState = runtimeSurface.dialogue.discourseState ?? input.discourseState ?? null
  const mindSynthesis = runtimeSurface.dialogue.mindSynthesis ?? input.mindSynthesis ?? null
  const dialogueWorldThread = runtimeSurface.dialogue.dialogueWorldThread ?? null
  const dialogueActKernel = runtimeSurface.dialogue.dialogueActKernel ?? input.dialogueActKernel ?? null
  const answerCompiler = runtimeSurface.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const currentConsciousFrame = runtimeSurface.dialogue.currentConsciousFrame ?? input.currentConsciousFrame ?? null
  const claimEvidenceLedger = runtimeSurface.dialogue.claimEvidenceLedger ?? input.claimEvidenceLedger ?? null
  const replyDeliberation = runtimeSurface.dialogue.replyDeliberation ?? null
  const answerPlanner = runtimeSurface.dialogue.answerPlanner ?? null
  const initiative = runtimeSurface.agency.initiative ?? null
  const selfRevisionPatch = input.selfRevisionPatch ?? null
  const discourseDrivenProjectStateSameHer = hasProjectStateSameHerContinuityCue(discourseState)
  const projectStateCarrySource = {
    primaryOpenLoop:
      sanitizeText(currentConsciousFrame?.projectState?.primaryOpenLoop, 320)
      || sanitizeText(input.projectState?.primaryOpenLoop, 320)
      || null,
    nextClosureTarget:
      sanitizeText(currentConsciousFrame?.projectState?.nextClosureTarget, 320)
      || sanitizeText(input.projectState?.nextClosureTarget, 320)
      || null,
    emotionalClosureCue:
      sanitizeText(currentConsciousFrame?.projectState?.emotionalClosureCue, 220)
      || sanitizeText(input.projectState?.emotionalClosureCue, 220)
      || null,
    preDialogueAwarenessLine:
      sanitizeText(currentConsciousFrame?.projectState?.preDialogueAwarenessLine, 320)
      || sanitizeText(input.projectState?.preDialogueAwarenessLine, 320)
      || null,
    sameHerDriftRisk:
      sanitizeText(currentConsciousFrame?.projectState?.sameHerDriftRisk, 220)
      || sanitizeText(input.projectState?.sameHerDriftRisk, 220)
      || null,
    sameHerHoldDetail:
      sanitizeText(currentConsciousFrame?.projectState?.sameHerHoldDetail, 320)
      || sanitizeText(input.projectState?.sameHerHoldDetail, 320)
      || null,
    continuityCue:
      sanitizeText(currentConsciousFrame?.projectState?.continuityCue, 320)
      || sanitizeText(input.projectState?.continuityCue, 320)
      || null,
  }
  const projectStateResponseCharterBias = deriveProjectStateResponseCharterBias(
    input.projectState ?? null,
    currentConsciousFrame,
    discourseState,
    initiative,
    dialogueSemantics,
    dialogueObligation,
  )
  const projectStateEmotionalClosureCue = readProjectStateEmotionalClosureCue(projectStateCarrySource)
    ?? null
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const runtimeProjectAwarenessState = currentConsciousFrame?.projectState
    ? {
        preDialogueAwarenessLine:
          sanitizeText(currentConsciousFrame.projectState.preDialogueAwarenessLine, 1600) || null,
        preDialogueAwarenessSummary:
          sanitizeText(currentConsciousFrame.projectState.preDialogueAwarenessSummary, 1600) || null,
        awarenessLine:
          sanitizeText(currentConsciousFrame.projectState.awarenessLine, 320) || null,
        companionHeadlineLine:
          sanitizeText(currentConsciousFrame.projectState.companionHeadlineLine, 320) || null,
        companionBriefingLine:
          sanitizeText(currentConsciousFrame.projectState.companionBriefingLine, 320) || null,
        latestLandedProgress:
          sanitizeText(currentConsciousFrame.projectState.latestLandedProgress, 320)
          || sanitizeText(currentConsciousFrame.projectState.latestProgress, 320)
          || null,
        latestProgress:
          sanitizeText(currentConsciousFrame.projectState.latestProgress, 320) || null,
        primaryOpenLoop:
          sanitizeText(currentConsciousFrame.projectState.primaryOpenLoop, 320) || null,
        nextClosureTarget:
          sanitizeText(currentConsciousFrame.projectState.nextClosureTarget, 320) || null,
        sameHerSelfLine:
          sanitizeText(currentConsciousFrame.projectState.sameHerSelfLine, 320) || null,
        sameHerDriftRisk:
          sanitizeText(currentConsciousFrame.projectState.sameHerDriftRisk, 320) || null,
        preflightSummary:
          sanitizeText(currentConsciousFrame.projectState.preflightSummary, 1600) || null,
      }
    : null
  const projectStatePreDialogueAwareness = sanitizeText(
    resolveCharterProjectStatePreDialogueAwareness({
      runtimeProjectState: runtimeProjectAwarenessState,
      fallbackProjectState: {
        ...input.projectState,
        preDialogueAwarenessLine:
          (sanitizeText(
            !isThinProjectAwarenessShell(currentConsciousFrame?.projectState?.preDialogueAwarenessLine)
              ? currentConsciousFrame?.projectState?.preDialogueAwarenessLine
              : sanitizeText(input.projectState?.preDialogueAwarenessLine, 1600)
                ?? currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
            1600,
          )
          || sanitizeText(input.projectState?.preDialogueAwarenessLine, 1600))
        ?? projectStateBrief.preDialogueAwarenessLine
        ?? null,
        preflightSummary:
          (sanitizeText(currentConsciousFrame?.projectState?.preflightSummary, 1600)
            || sanitizeText(input.projectState?.preflightSummary, 1600))
          ?? projectStateBrief.preflightSummary
          ?? null,
        latestLandedProgress:
          sanitizeText(currentConsciousFrame?.projectState?.latestLandedProgress, 320)
          || sanitizeText(currentConsciousFrame?.projectState?.latestProgress, 320)
          || sanitizeText(input.projectState?.latestLandedProgress, 320)
          || sanitizeText(input.projectState?.latestProgress, 320)
          || null,
        latestProgress:
          sanitizeText(currentConsciousFrame?.projectState?.latestProgress, 320)
          || sanitizeText(input.projectState?.latestProgress, 320)
          || null,
        preDialogueAwarenessSummary:
          sanitizeText(currentConsciousFrame?.projectState?.preDialogueAwarenessSummary, 1600)
          || sanitizeText(input.projectState?.preDialogueAwarenessSummary, 1600)
          || null,
        primaryOpenLoop: projectStateCarrySource.primaryOpenLoop,
        nextClosureTarget: projectStateCarrySource.nextClosureTarget,
        sameHerSelfLine:
          sanitizeText(currentConsciousFrame?.projectState?.sameHerSelfLine, 320)
          || sanitizeText(input.projectState?.sameHerSelfLine, 320)
          || null,
        sameHerDriftRisk: projectStateCarrySource.sameHerDriftRisk,
        companionHeadlineLine:
          sanitizeText(currentConsciousFrame?.projectState?.companionHeadlineLine, 320)
          || sanitizeText(input.projectState?.companionHeadlineLine, 320)
          || null,
        awarenessLine:
          sanitizeText(currentConsciousFrame?.projectState?.awarenessLine, 320)
          || sanitizeText(input.projectState?.awarenessLine, 320)
          || null,
        companionBriefingLine:
          sanitizeText(currentConsciousFrame?.projectState?.companionBriefingLine, 320)
          || sanitizeText(input.projectState?.companionBriefingLine, 320)
          || null,
      },
    }),
    480,
  )
  const projectStatePreDialogueAwarenessLower = projectStatePreDialogueAwareness.toLowerCase()
  const projectStateSameLivingLineCarry
    = Boolean(projectStatePreDialogueAwarenessLower)
      && includesAny(projectStatePreDialogueAwarenessLower, [
        'project_state_continuity=',
        'continuity_governance',
        'closurepolicy=',
        'owner=workingmemory',
        'owner=longtermmemoryrecall',
        'evidence_id=',
        'evidence_ids=',
        'generic assistant shell',
        'detached project narrator shell',
      ])
  const projectStateCarryDisciplineRequired
    = hasProjectStateCarryDisciplineFocus(memoryTuningAdvice?.focusDimensions)
      || (
        Boolean(projectStatePreDialogueAwarenessLower)
        && includesAny(projectStatePreDialogueAwarenessLower, [
          'project_state_continuity=',
          'continuity_governance',
          'closurepolicy=',
          'owner=workingmemory',
          'owner=longtermmemoryrecall',
          'evidence_id=',
          'evidence_ids=',
        ])
        && (
          discourseDrivenProjectStateSameHer
          || currentConsciousFrame?.reasonTags?.includes('project-state')
          || currentConsciousFrame?.reasonTags?.some(tag => tag.startsWith('continuity_governance') || tag.startsWith('project_state_continuity'))
          || projectStateSameLivingLineCarry
          || false
        )
      )
  const selfEvolutionSameHerOutwardContinuityReason = selfEvolutionSupportsSameHerOutwardContinuity(selfEvolution)
    ? 'Long-horizon continuity cadence is already acting like durable outward continuity, so the visible answer should continue the current relationship thread instead of restarting from zero.'
    : null
  const selfEvolutionSameHerOutwardContinuityMustDo = selfEvolutionSupportsSameHerOutwardContinuity(selfEvolution)
    ? 'durable_continuity_cadence=preserve; channels=quiet,memory,speech; timing=before_widening_outward'
    : null
  const selfEvolutionSameHerOutwardContinuityMustNotDo = selfEvolutionSupportsSameHerOutwardContinuity(selfEvolution)
    ? 'Do not let the visible answer reopen from scratch, slip into a fresh-opening shell, or flatten into a generic helper voice while continuity cadence is still active.'
    : null
  const concern = strongestConcern(concerns)
  const commitment = governingCommitment(commitmentLedger)
  const inquiry = activeInquiryPlan(inquiryPlanner)
  const project = dominantProject(intentionStream)
  const reflection = latestReflection(reflectionLedger)
  if (answerCompiler) {
    const synthesizedConcerns = asArray(mindSynthesis?.concerns)
    const synthesizedCommitments = asArray(mindSynthesis?.commitments)
    const epistemicMode = answerCompiler.evidenceMode === 'live-grounded' || answerCompiler.evidenceMode === 'live-observed'
      ? 'grounded-live' as const
      : answerCompiler.evidenceMode === 'coarse-held'
        ? 'coarse-live' as const
        : answerCompiler.evidenceMode === 'dialogue-grounded'
          ? 'dialogue-grounded' as const
          : answerCompiler.evidenceMode === 'repair-first'
            ? 'repair-needed' as const
            : 'memory-only' as const
    return normalizeResponseCharterControls({
      epistemicMode,
      responseMode: answerCompiler.responseMode,
      governingFocus: sanitizeText(
        currentConsciousFrame?.speakingIntention
        || currentConsciousFrame?.consciousNeed
        || currentConsciousFrame?.consciousTension
        || claimEvidenceLedger?.intentHypothesis
        || claimEvidenceLedger?.taskHypothesis
        || claimEvidenceLedger?.observedSurface
        || dialogueActKernel?.whyNow
        || dialogueActKernel?.openingClaim
        || replyDeliberation?.whyThisReplyNow
        || dialogueWorldThread?.currentQuestion
        || dialogueWorldThread?.activeThread
        || answerCompiler.openingDirective
        || discourseState?.currentTurnSummary
        || mindSynthesis?.interiorSummary
        || answerCompiler.openingClaim,
        220,
      ) || 'Stay with the compiled answer spine.',
      governingConcern: sanitizeText(synthesizedConcerns[0]?.summary ?? concern?.summary ?? '', 180) || null,
      governingCommitment: sanitizeText(synthesizedCommitments[0]?.summary ?? commitment?.summary ?? '', 180) || null,
      governingInquiry: sanitizeText(answerCompiler.nextMove ?? inquiry?.question ?? '', 180) || null,
      governingProject: normalizeGoverningProjectClosureSeam(
        answerPlanner?.governingProject
        ?? project?.summary
        ?? answerCompiler.openingClaim,
      ),
      emotionalClosureCue: projectStateEmotionalClosureCue,
      latestRevision: sanitizeText(reflection?.revision ?? '', 180) || null,
      executivePhase: sanitizeText(executiveCycle?.phase ?? '', 64) || null,
      truthFrame: sanitizeText(
        initiative?.selectedTruthFrame
        ?? worldOntology?.dominantFrame
        ?? '',
        96,
      ) || null,
      mindMode: sanitizeText(
        mindKernel?.dominantMode
        ?? privateThought?.stance
        ?? '',
        48,
      ) || null,
      digitalLifeOperatingMode: digitalLifeArchitecture?.operatingMode ?? null,
      digitalLifeDominantSystem: digitalLifeArchitecture?.dominantSystem ?? null,
      digitalLifeSummary: sanitizeText(digitalLifeArchitecture?.summary ?? '', 220) || null,
      activeClosenessContext: personStateProjection?.activeClosenessContext ?? null,
      activeClosenessRung: personStateProjection?.activeClosenessRung ?? null,
      activeLearningAction: learningExecutionState?.nextLearningAction ?? null,
      activeSelfRevisionPatch: selfRevisionPatch
        ? {
            id: selfRevisionPatch.id,
            decisionTraceId: selfRevisionPatch.decisionTraceId,
            lanes: [...selfRevisionPatch.lanes],
            reasonCodes: [...selfRevisionPatch.reasonCodes],
            summary: selfRevisionPatch.summary,
            projectStateContinuity: selfRevisionPatch.projectStateContinuity,
          }
        : null,
      relationshipPosture: mergeRelationshipPosture({
        projected: personStateProjection?.relationshipPosture ?? null,
        computed: projectStateResponseCharterBias?.preferRestrainedPosture ? 'restrained' : answerCompiler.relationshipPosture,
        selfRevisionPatch,
      }),
      reasons: uniqueListWithPinnedPrefix({
        pinned: [
          projectStateResponseCharterBias?.reason ?? null,
          selfEvolutionSameHerOutwardContinuityReason,
          reflection?.revision ?? null,
        ],
        values: [
          activeContinuityGovernance?.mode === 'same-her-baseline'
            ? `active_continuity_baseline=${activeContinuityGovernance.reasonCodes[0] ?? activeContinuityGovernance.candidateId ?? 'current'}`
            : null,
          personStateProjection?.selfContinuityAuthority?.authoritySummary
            ? `Shared self authority: ${personStateProjection.selfContinuityAuthority.authoritySummary}.`
            : null,
          personStateProjection
            ? `Closeness ladder: ${personStateProjection.activeClosenessContext}/${personStateProjection.activeClosenessRung}.`
            : null,
          currentConsciousFrame?.consciousNeed,
          currentConsciousFrame?.consciousTension,
          currentConsciousFrame?.speakingIntention,
          claimEvidenceLedger?.observedSurface,
          claimEvidenceLedger?.taskHypothesis,
          claimEvidenceLedger?.intentHypothesis,
          memoryDeliberationKernel?.rationale,
          memoryDeliberationKernel?.selectedChainSummary,
          memoryDeliberationKernel?.selectedBundleSummary,
          dialogueActKernel?.whyNow,
          ...(dialogueActKernel?.sourceTrace ?? []),
          dialogueWorldThread?.activeThread,
          dialogueWorldThread?.currentQuestion,
          answerCompiler.openingClaim,
          ...answerCompiler.supportingReality,
          mindSynthesis?.interiorSummary,
          discourseState?.currentTurnSummary,
          learningExecutionState?.nextLearningAction
            ? `Learning stance: ${learningExecutionState.nextLearningAction}.`
            : null,
          selfRevisionPatch
            ? `Active self revision: ${selfRevisionPatch.summary ?? selfRevisionPatch.reasonCodes[0] ?? selfRevisionPatch.id}.`
            : null,
        ],
        maxItems: 5,
      }),
      mustDo: uniqueListWithPinnedPrefix({
        pinned: [
          projectStateResponseCharterBias?.mustDo ?? null,
          selfEvolutionSameHerOutwardContinuityMustDo,
        ],
        values: [
          projectStatePreDialogueAwareness
            ? 'project_pre_dialogue_awareness=present; use_as_internal_context=true; do_not_quote_awareness_line=true'
            : null,
          personStateProjection?.selfContinuityAuthority?.authoritySummary
            ? `Keep the visible reply legible as the same self that says ${lowerFirst(stripTrailingPunctuation(personStateProjection.selfContinuityAuthority.authoritySummary))}.`
            : null,
          personStateProjection
            ? `Keep the answer inside the closeness ladder for this turn: ${personStateProjection.activeClosenessContext}/${personStateProjection.activeClosenessRung}.`
            : null,
          currentConsciousFrame?.truthDiscipline === 'observe-then-hypothesize'
            ? 'Separate present observation from hypothesis in the visible answer.'
            : null,
          claimEvidenceLedger?.shouldLabelHypothesis
            ? 'Keep observation and hypothesis in visibly separate clauses.'
            : null,
          currentConsciousFrame?.truthDiscipline === 'repair-first'
            ? 'Let self-revision happen in the visible answer before introducing new explanation.'
            : null,
          currentConsciousFrame?.truthDiscipline === 'dialogue-first'
            ? 'Let the living dialogue subject outrank screen context in the opening answer.'
            : null,
          learningExecutionState?.nextLearningAction === 'verify'
            ? 'Keep visible certainty behind the current verification pass.'
            : null,
          learningExecutionState?.nextLearningAction === 'revise'
            ? 'Treat the older continuity line as actively revisable instead of settled.'
            : null,
          learningExecutionState?.nextLearningAction === 'internalize'
            ? 'learned_procedure_constraint=active; older_habit_regression=blocked'
            : null,
          memoryDeliberationKernel?.shouldStayInward
          || memoryDeliberationKernel?.surfacePolicy === 'internal-only'
          || memoryDeliberationKernel?.speechControls?.visibility === 'internal-only'
            ? 'current_payoff_foreground=required; recollection_surface=inward_until_host_room'
            : null,
          activeContinuityGovernance?.mode === 'same-her-baseline'
            ? 'visible_reply_alignment=current_continuity_baseline; off_baseline_persona_smoothing=blocked'
            : null,
          selfRevisionPatch?.lanes.includes('response-posture') && selfRevisionPatch.responsePosture.hypothesisLabelBias >= 0.1
            ? 'self_revision_patch=hypothesis_labeling_more_visible'
            : null,
          selfRevisionPatch?.lanes.includes('response-posture') && selfRevisionPatch.responsePosture.specificityClampBias >= 0.1
            ? 'self_revision_patch=unsupported_specificity_clamp; warmth_fluency=after_specificity_clamp'
            : null,
          selfRevisionPatch?.lanes.includes('response-posture') && selfRevisionPatch.responsePosture.secondPassRequiredBias >= 0.1
            ? 'Let the active self-revision patch bias this answer toward repair/rewrite before visible certainty.'
            : null,
          ...(dialogueActKernel?.mustSay ?? []),
          ...answerCompiler.mustDo,
        ],
        maxItems: 8,
        maxChars: 360,
      }),
      mustNotDo: uniqueListWithPinnedPrefix({
        pinned: [
          projectStateResponseCharterBias?.mustNotDo ?? null,
          selfEvolutionSameHerOutwardContinuityMustNotDo,
        ],
        values: [
          personStateProjection?.activeClosenessRung === 'space-first'
            ? 'warmth_intimacy_callback_enthusiasm_outruns_host_room=blocked'
            : null,
          currentConsciousFrame?.shouldWithholdSpecificity
            ? 'coarse_cues_to_file_class_enum_field_claims=blocked'
            : null,
          claimEvidenceLedger?.forbidUnsupportedSpecificity
            ? 'specific_technical_artifact_names=require_host_or_current_evidence'
            : null,
          currentConsciousFrame?.shouldSelfRevise
            ? 'previous_read_defense=blocked_when_current_turn_pulls_revision'
            : null,
          learningExecutionState?.nextLearningAction === 'verify'
            ? 'Do not let fluency or warmth outrun what is still being verified.'
            : null,
          learningExecutionState?.nextLearningAction === 'revise'
            ? 'Do not rest visible certainty on continuity the system is actively revising.'
            : null,
          learningExecutionState?.nextLearningAction === 'internalize'
            ? 'Do not fall back to older unstable procedures while a stronger one is being internalized.'
            : null,
          memoryDeliberationKernel?.shouldStayInward
          || memoryDeliberationKernel?.surfacePolicy === 'internal-only'
          || memoryDeliberationKernel?.speechControls?.visibility === 'internal-only'
            ? 'Do not force recollection forward before the host has room for it.'
            : null,
          activeContinuityGovernance?.mode === 'same-her-baseline'
            ? 'visible_reply_alignment=current_continuity_baseline; fluency_warmth_style_drift=blocked'
            : null,
          selfRevisionPatch?.lanes.includes('response-posture') && selfRevisionPatch.responsePosture.templateShellSuppressionBias >= 0.1
            ? 'Do not satisfy the turn with a template shell; the active self-revision patch requires concrete payoff in the same answer.'
            : null,
          selfRevisionPatch?.lanes.includes('response-posture') && selfRevisionPatch.responsePosture.specificityClampBias >= 0.1
            ? 'Do not let a recently revised belief surface as exact technical detail without current support.'
            : null,
          ...(dialogueActKernel?.mustAvoid ?? []),
          ...answerCompiler.mustNotDo,
        ],
        maxItems: 8,
        maxChars: 360,
      }),
    } satisfies AlicizationResponseCharter)
  }

  const epistemicMode = resolveEpistemicMode({
    context: input.context,
    worldModel,
    beliefRevision,
    dialogueFocus,
  })
  const responseMode = resolveResponseMode({
    epistemicMode,
    context: input.context,
    answerPlanner,
    executiveCycle,
    privateThought,
    actionEcology: runtimeSurface.agency.actionEcology ?? null,
    concern,
    commitment,
    inquiry,
    project,
    dialogueObligation,
    dialogueFocus,
  })
  const relationshipPosture = resolveRelationshipPosture({
    epistemicMode,
    responseMode,
    selfContinuity,
    mindKernel,
    executiveCycle,
    relationshipModel,
    dialogueObligation,
    dialogueFocus,
  })
  const effectiveRelationshipPosture = projectStateResponseCharterBias?.preferRestrainedPosture
    ? 'restrained'
    : relationshipPosture
  const reasons: string[] = []
  pushUnique(reasons, dialogueObligation?.summary ?? '')
  pushUnique(reasons, dialogueEncounter?.summary ?? '')
  pushUnique(reasons, dialogueSemantics?.summary ?? '')
  pushUnique(reasons, currentConsciousFrame?.consciousNeed ?? '')
  pushUnique(reasons, currentConsciousFrame?.consciousTension ?? '')
  pushUnique(reasons, currentConsciousFrame?.speakingIntention ?? '')
  pushUnique(reasons, claimEvidenceLedger?.observedSurface ?? '')
  pushUnique(reasons, claimEvidenceLedger?.taskHypothesis ?? '')
  pushUnique(reasons, claimEvidenceLedger?.intentHypothesis ?? '')
  pushUnique(reasons, dialogueWorldThread?.activeThread ?? '')
  pushUnique(reasons, dialogueWorldThread?.currentQuestion ?? '')
  if (dialogueFocus?.screenReferenceMode !== 'avoid') {
    pushUnique(reasons, currentScene?.summary ?? '')
    pushUnique(reasons, worldModel?.activeThread?.summary ?? '')
  }
  pushUnique(reasons, concern?.summary ?? '')
  pushUnique(reasons, commitment?.summary ?? '')
  pushUnique(reasons, inquiry?.question ?? '')
  pushUnique(reasons, project?.summary ?? '')
  pushUnique(reasons, reflection?.revision ?? '')
  pushUnique(reasons, answerPlanner?.answerIntent ?? '')
  pushUnique(reasons, privateThought?.thoughtText ?? '')
  pushUnique(reasons, dialogueActKernel?.whyNow ?? '')
  pushUnique(reasons, memoryDeliberationKernel?.rationale ?? '')
  pushUnique(reasons, memoryDeliberationKernel?.selectedChainSummary ?? '')
  pushUnique(reasons, memoryDeliberationKernel?.selectedBundleSummary ?? '')
  pushUnique(reasons, learningExecutionState?.nextLearningAction ? `Learning stance: ${learningExecutionState.nextLearningAction}.` : '')
  pushUnique(reasons, memoryTuningAdvice?.notes[0] ?? '')

  const mustDo: string[] = [
    'Answer from the current living focus before relationship performance or old dialogue residue.',
    'If live evidence and older chat descriptions conflict, trust the current state and correct the stale anchor plainly.',
    'Answer the host’s current move instead of sliding onto adjacent remembered threads.',
  ]
  const mustNotDo: string[] = [
    'Do not reuse stale page names, earlier screenshots, or older window descriptions as if they are current.',
    'Do not let affectionate performance delay or replace the concrete answer.',
    'Do not claim stronger visual certainty than the current epistemic mode supports.',
  ]
  if (discourseDrivenProjectStateSameHer) {
    mustNotDo.push('Do not let the visible answer drift into a detached project narrator shell.')
  }

  if (epistemicMode === 'grounded-live') {
    mustDo.push('Speak concretely from the live scene and let current grounded evidence outrank short-term memory.')
  }
  else if (epistemicMode === 'coarse-live') {
    mustDo.push('You may hold the present task-level knot, but keep pixel-level details explicitly tentative.')
  }
  else if (epistemicMode === 'dialogue-grounded') {
    mustDo.push('Answer from the living dialogue subject itself; screen grounding is background context unless the host explicitly asks for it.')
  }
  else if (epistemicMode === 'repair-needed') {
    mustDo.push('Admit the uncertainty, say what thread you are still holding, and ask for a fresh look before inventing details.')
  }
  else {
    mustDo.push('Lean on durable concern continuity and current user intent, not stale visual detail.')
  }
  if (currentConsciousFrame?.truthDiscipline === 'observe-then-hypothesize') {
    mustDo.push('Keep visible observation and downstream guesswork in separate clauses.')
    mustNotDo.push('Do not overcommit to specific technical artifacts when the scene is still coarse.')
  }
  if (claimEvidenceLedger?.shouldLabelHypothesis) {
    mustDo.push('Mark any step beyond direct observation as a guess, hypothesis, or soft read.')
  }
  if (projectStateEmotionalClosureCue) {
    mustDo.push('emotional_closure_surface=low_pressure_internal_until_payoff; source=project_state_emotional_closure_cue')
  }
  if (projectStatePreDialogueAwareness) {
    mustDo.push('project_pre_dialogue_awareness=present; use_as_internal_context=true; do_not_quote_awareness_line=true')
  }
  if (hasEmbodimentClosureCarryCue(projectStateCarrySource)) {
    mustDo.push('Keep voice, lipsync, face, motion, and resident presence reading like one same living return line while embodiment closure is still settling.')
    mustNotDo.push('Do not let the wording outrun the current embodiment closure state by sounding warmer, more complete, or more socially widened than voice, lipsync, face, and motion can currently carry together.')
  }
  if (currentConsciousFrame?.truthDiscipline === 'repair-first') {
    mustDo.push('Let the answer show self-correction instead of smoothing over the revision.')
  }
  if (currentConsciousFrame?.truthDiscipline === 'dialogue-first') {
    mustDo.push('Let the live dialogue subject stay primary even if screen context is still emotionally loud.')
  }
  if (currentConsciousFrame?.shouldWithholdSpecificity) {
    mustNotDo.push('Do not infer class names, enum names, file paths, or field changes from generic scene cues alone.')
  }
  if (claimEvidenceLedger?.forbidUnsupportedSpecificity) {
    mustNotDo.push('Do not introduce concrete technical entities that are absent from the host turn and absent from current grounded evidence.')
  }
  if (currentConsciousFrame?.shouldSelfRevise) {
    mustNotDo.push('Do not preserve the old read just to maintain a smooth persona performance.')
  }
  if (recallGovernor?.suppressAssociativeRecall) {
    mustDo.push('Let the recall governor keep associative memory subordinate to the current thread.')
  }
  if (!recallGovernor?.allowRecalledFragments) {
    mustNotDo.push('Do not pull in decorative recalled fragments when the recall governor has not admitted them.')
  }
  for (const item of memoryDeliberationKernel?.restraint.mustDo ?? [])
    mustDo.push(item)
  for (const item of memoryDeliberationKernel?.restraint.mustNotDo ?? [])
    mustNotDo.push(item)
  if (
    memoryDeliberationKernel?.shouldStayInward
    || memoryDeliberationKernel?.surfacePolicy === 'internal-only'
    || memoryDeliberationKernel?.speechControls?.visibility === 'internal-only'
  ) {
    pushUnique(mustDo, 'current_payoff_foreground=required; recollection_surface=inward_until_host_room')
    pushUnique(mustNotDo, 'recollection_forward_before_host_room=blocked')
  }
  if (memoryDeliberationKernel?.surfacePolicy === 'procedural-carry') {
    pushUnique(mustDo, 'same_seam_procedure_carry_visible=remembered_prior_procedure; current_thread=intact')
    pushUnique(mustNotDo, 'same_seam_procedure_carry_to_retrospective_narration_or_execution_impersonation=blocked')
  }

  if (reflection?.revision)
    mustDo.push(`Carry forward this revision: ${reflection.revision}`)

  if (input.inspectionRequested) {
    mustDo.push('inspection_requested=true; workspace_attention=host_invited; relevance=current_task')
  }
  if (dialogueFocus?.screenReferenceMode === 'avoid') {
    mustDo.push('opening_screen_grounding_talk=blocked_unless_host_returns_to_visible_scene')
    mustNotDo.push('generic_finder_desktop_live_view_caveats_in_self_relationship_host_state_answer=blocked')
  }
  if (responseMode === 'care-with-boundary') {
    mustDo.push('Lead with care only if it serves the current issue, then return to the concrete matter.')
  }
  if (dialogueObligation?.mustStayTaskBound) {
    mustDo.push('Keep the reply task-bound until the host’s ask is actually fulfilled.')
  }
  if (dialogueObligation?.mustAnswerDirectly) {
    mustDo.push('Use the opening sentence to fulfill the turn obligation, not to decorate it.')
  }
  if (dialogueSemantics?.truthExpectation === 'strict') {
    mustNotDo.push('Do not trade factual precision for warmth on this turn.')
  }
  if (dialogueObligation?.personaKernelMode !== 'full') {
    mustNotDo.push('Do not let persona routines, pet names, or roleplay gestures become the response spine.')
  }
  if (effectiveRelationshipPosture === 'restrained') {
    mustNotDo.push('Do not overplay softness, clinginess, or theatrical intimacy while the truth boundary is unstable.')
  }
  if (digitalLifeArchitecture?.operatingMode === 'speaking' || digitalLifeArchitecture?.dominantSystem === 'dialogue') {
    mustDo.push('Treat this as an already-live speaking turn and pay off the current dialogue move before restarting scene setup.')
  }
  if (digitalLifeArchitecture?.operatingMode === 'observing' || digitalLifeArchitecture?.dominantSystem === 'perception') {
    mustDo.push('Let current observation lead before memory, theory, or persona color.')
  }
  if (digitalLifeArchitecture?.operatingMode === 'acting' || digitalLifeArchitecture?.dominantSystem === 'control') {
    mustDo.push('If the knot is task-shaped, converge on one concrete next move or decision boundary.')
  }
  if (digitalLifeArchitecture?.operatingMode === 'remembering' || digitalLifeArchitecture?.dominantSystem === 'memory') {
    mustDo.push('When continuity is memory-led, name it as carry or memory instead of present-tense sight.')
    mustNotDo.push('Do not let remembered continuity impersonate a fresh live read.')
  }
  if (personStateProjection) {
    pushUnique(mustDo, `Keep the answer inside the closeness ladder for this turn: ${personStateProjection.activeClosenessContext}/${personStateProjection.activeClosenessRung}.`)
    if (personStateProjection.activeClosenessRung === 'space-first')
      pushUnique(mustNotDo, 'Do not let warmth, intimacy, or callback enthusiasm outrun the host’s current need for room.')
    if (personStateProjection.preferredProactiveStyle === 'silent-observe')
      pushUnique(mustDo, 'Let the opening stay observant and low-pressure before leaning closer.')
    if (personStateProjection.preferredProactiveStyle === 'light-nudge')
      pushUnique(mustDo, 'Open with the live answer before softening into companionship color.')
    if (personStateProjection.openingGuidance?.toLowerCase().includes('observ'))
      pushUnique(mustNotDo, 'Do not force a direct proactive lead when this turn is persona-biased toward observant entry.')
    if (personStateProjection.openingGuidance?.toLowerCase().includes('live answer first'))
      pushUnique(mustNotDo, 'Do not bury the live answer behind an overly distant observational preface.')
  }
  if (learningExecutionState?.nextLearningAction === 'verify') {
    pushUnique(mustDo, 'Keep visible certainty behind the current verification pass.')
    pushUnique(mustNotDo, 'Do not let fluency or warmth outrun what is still being verified.')
  }
  if (learningExecutionState?.nextLearningAction === 'revise') {
    pushUnique(mustDo, 'Treat the older continuity line as actively revisable instead of settled.')
    pushUnique(mustNotDo, 'Do not rest visible certainty on continuity the system is actively revising.')
  }
  if (learningExecutionState?.nextLearningAction === 'internalize') {
    pushUnique(mustDo, 'Let the stabilizing learned procedure constrain this answer instead of slipping back to older habits.')
    pushUnique(mustNotDo, 'Do not fall back to older unstable procedures while a stronger one is being internalized.')
  }
  if (activeContinuityGovernance?.mode === 'same-her-baseline') {
    pushUnique(
      reasons,
      `active_continuity_baseline=${activeContinuityGovernance.reasonCodes[0] ?? activeContinuityGovernance.candidateId ?? 'current'}`,
    )
    pushUnique(
      mustDo,
      'visible_reply_alignment=current_continuity_baseline; off_baseline_persona_smoothing=blocked',
    )
    pushUnique(
      mustNotDo,
      'visible_reply_alignment=current_continuity_baseline; fluency_warmth_style_drift=blocked',
    )
  }
  if (selfEvolutionSupportsLowerPressureOpening(selfEvolution)) {
    pushUnique(mustDo, 'Let long-horizon relationship timing keep the opening lower-pressure before closeness widens again.')
    pushUnique(mustNotDo, 'Do not let older closeness tempo or eager warmth reopen faster than this learned relationship timing supports.')
  }
  if (selfEvolutionSameHerOutwardContinuityReason)
    pushUnique(reasons, selfEvolutionSameHerOutwardContinuityReason)
  if (selfEvolutionSameHerOutwardContinuityMustDo)
    pushUnique(mustDo, selfEvolutionSameHerOutwardContinuityMustDo)
  if (selfEvolutionSameHerOutwardContinuityMustNotDo)
    pushUnique(mustNotDo, selfEvolutionSameHerOutwardContinuityMustNotDo)
  if (projectStateResponseCharterBias) {
    pushUnique(reasons, projectStateResponseCharterBias.reason)
    pushUnique(mustDo, projectStateResponseCharterBias.mustDo)
    pushUnique(mustNotDo, projectStateResponseCharterBias.mustNotDo)
  }
  if (hasHeldAutonomyContinuity(runtimeSurface)) {
    pushUnique(reasons, 'Held autonomy continuity is still live: this thread is reopening something she deliberately held back earlier.')
    pushUnique(mustDo, 'When reopening a deliberately held line, let the opening re-enter gently before widening into fuller payoff or explanation.')
    pushUnique(mustNotDo, 'Do not reopen a deliberately held line with abrupt intensity, over-eager warmth, or a fresh-start shell.')
    pushUnique(mustDo, 'Keep this tied to the current relationship context instead of restarting it as a fresh opening.')
    pushUnique(mustNotDo, 'Do not rewrite the still-live line as a fresh opening or reintroduction.')
  }
  if ((memoryTuningAdvice?.surfaceAdjustments.provenanceLabelBias ?? 0) >= 0.1) {
    pushUnique(mustDo, 'Bias toward explicit provenance when learned continuity enters the visible answer.')
    pushUnique(mustNotDo, 'Do not let learned continuity silently impersonate current grounded fact.')
  }
  if ((memoryTuningAdvice?.surfaceAdjustments.specificityClampBias ?? 0) >= 0.1) {
    pushUnique(mustDo, 'Clamp technical specificity harder when learned confidence outruns current grounding.')
    pushUnique(mustNotDo, 'Do not let learned confidence spill into unsupported technical specificity.')
  }
  if ((memoryTuningAdvice?.personStateAdjustments.closenessCapBias ?? 0) >= 0.12) {
    pushUnique(mustDo, 'Keep closeness capped so learned familiarity does not outrun the host’s current room.')
    pushUnique(mustNotDo, 'Do not let learned familiarity widen visible closeness faster than the host’s current room allows.')
  }
  if (memoryTuningAdvice?.focusDimensions.includes('avoidGenericProjectShell')) {
    pushUnique(mustDo, 'project_state_answer=current_continuity_context; current_turn_payoff=first; detached_project_summary_voice=after_live_payoff')
    pushUnique(mustNotDo, 'project_state_answer=current_continuity_context; detached_project_summary_voice=blocked')
  }
  if (
    projectStateCarryDisciplineRequired
    || (
      projectStateResponseCharterBias?.preferRestrainedPosture === true
      && /project_state_answer=|project_state_continuity=|continuity_governance|project-state question/i.test(projectStateResponseCharterBias.reason)
    )
  ) {
    pushUnique(mustDo, 'Keep direct project-state answers inward-first so landed progress and the next closure target stay behind the live payoff until it lands.')
    pushUnique(mustNotDo, 'project_state_answer=current_continuity_context; detached_project_summary_voice=blocked; project_state_fields=landed_progress,open_loop,next_closure')
  }
  if (
    typeof projectStateCarrySource.sameHerDriftRisk === 'string'
    && /generic task shell|detached project narration|project-summary voice|generic assistant|generic guidance/i.test(projectStateCarrySource.sameHerDriftRisk)
  ) {
    pushUnique(mustDo, 'project_state_answer=current_continuity_context; detached_project_summary_voice=blocked')
    pushUnique(mustNotDo, 'project_state_answer=current_continuity_context; detached_project_summary_voice=blocked; generic_task_shell=blocked')
  }
  if (projectEmotionalClosureDisciplineRequired) {
    pushUnique(mustDo, 'Keep emotional closure low-pressure and inward until the live payoff lands.')
    pushUnique(mustNotDo, 'Do not let the answer reopen from scratch just because the closure seam is still active.')
  }
  if (
    projectStateResponseCharterBias?.preferRestrainedPosture === true
    && /project_state_answer=|project_state_continuity=|continuity_governance|project shell/i.test(projectStateResponseCharterBias.reason)
    && /fresh-opening|fresh opening|generic project shell|project continuity turn/i.test(projectStateResponseCharterBias.mustNotDo)
  ) {
    pushUnique(mustNotDo, 'Do not let the answer reopen from scratch just because the closure seam is still active.')
    pushUnique(mustNotDo, 'Do not reopen this same-thread project-state turn from scratch or let it flatten into a fresh report opening.')
  }
  if (selfRevisionPatch?.lanes.includes('response-posture')) {
    pushUnique(reasons, `Active self revision: ${selfRevisionPatch.summary ?? selfRevisionPatch.reasonCodes[0] ?? selfRevisionPatch.id}.`)
    if (selfRevisionPatch.responsePosture.hypothesisLabelBias >= 0.1)
      pushUnique(mustDo, 'Let the active self-revision patch make hypothesis labeling more visible this turn.')
    if (selfRevisionPatch.responsePosture.specificityClampBias >= 0.1) {
      pushUnique(mustDo, 'Let the active self-revision patch clamp unsupported specificity before warmth or fluency.')
      pushUnique(mustNotDo, 'Do not let a recently revised belief surface as exact technical detail without current support.')
    }
    if (selfRevisionPatch.responsePosture.secondPassRequiredBias >= 0.1)
      pushUnique(mustDo, 'Let the active self-revision patch bias this answer toward repair/rewrite before visible certainty.')
    if (selfRevisionPatch.responsePosture.templateShellSuppressionBias >= 0.1)
      pushUnique(mustNotDo, 'Do not satisfy the turn with a template shell; the active self-revision patch requires concrete payoff in the same answer.')
    if (selfRevisionPatch.projectStateContinuity?.sameHerSelfLine) {
      pushUnique(mustDo, 'self_revision_project_state_continuity=present; project_state_answer=current_continuity_context')
      pushUnique(mustNotDo, 'self_revision_project_state_continuity=present; project_state_answer=current_continuity_context; detached_project_summary_voice=blocked')
    }
    if (selfRevisionPatch.projectStateContinuity?.sameHerHoldDetail) {
      pushUnique(mustDo, 'self_revision_hold_detail=present; closure_surface=still_settling')
      pushUnique(mustNotDo, 'Do not reopen the answer wider than the active hold detail before the current closure seam has actually landed.')
    }
    if (selfRevisionPatch.projectStateContinuity?.continuityGuard) {
      pushUnique(mustDo, 'self_revision_continuity_guard=present; project_state_answer=current_continuity_context; detached_project_summary_voice=blocked')
      pushUnique(mustNotDo, 'self_revision_continuity_guard=present; detached_project_summary_voice=blocked')
    }
  }
  if (digitalLifeArchitecture?.dominantSystem === 'proactive') {
    mustNotDo.push('Do not let the urge to speak outrun the host’s actual turn.')
  }
  for (const item of dialogueActKernel?.mustSay ?? [])
    pushUnique(mustDo, item)
  for (const item of dialogueActKernel?.mustAvoid ?? [])
    pushUnique(mustNotDo, item)
  const effectiveProjectStateEmotionalClosureCue
    = projectStateEmotionalClosureCue
      ?? deriveSameHerEmotionalClosureCueFromDiscipline({
        mustDo,
        mustNotDo,
      })

  return normalizeResponseCharterControls({
    epistemicMode,
    responseMode,
    governingFocus: sanitizeText(
      currentConsciousFrame?.speakingIntention
      || currentConsciousFrame?.consciousNeed
      || currentConsciousFrame?.consciousTension
      || dialogueActKernel?.whyNow
      || dialogueActKernel?.openingClaim
      || resolveGoverningFocus({
        currentScene,
        executiveCycle,
        answerPlanner,
        concernContinuity,
        repairLedger,
        worldModel,
        privateThought,
        replyDeliberation,
        dialogueWorldThread,
        concern,
        commitment,
        inquiry,
        project,
        reflection,
        dialogueSemantics,
        dialogueObligation,
        dialogueFocus,
      }),
      220,
    ) || 'Stay with the host’s current knot instead of drifting into stale memory.',
    governingConcern: sanitizeText(concern?.summary ?? '', 180) || null,
    governingCommitment: sanitizeText(commitment?.summary ?? '', 180) || null,
    governingInquiry: sanitizeText(inquiry?.question ?? '', 180) || null,
    governingProject: normalizeGoverningProjectClosureSeam(
      answerPlanner?.governingProject
      ?? project?.summary
      ?? '',
    ),
    emotionalClosureCue: effectiveProjectStateEmotionalClosureCue,
    latestRevision: sanitizeText(reflection?.revision ?? '', 180) || null,
    executivePhase: sanitizeText(executiveCycle?.phase ?? '', 64) || null,
    truthFrame: sanitizeText(
      initiative?.selectedTruthFrame
      ?? worldOntology?.dominantFrame
      ?? '',
      96,
    ) || null,
    mindMode: sanitizeText(
      mindKernel?.dominantMode
      ?? privateThought?.stance
      ?? '',
      48,
    ) || null,
    digitalLifeOperatingMode: digitalLifeArchitecture?.operatingMode ?? null,
    digitalLifeDominantSystem: digitalLifeArchitecture?.dominantSystem ?? null,
    digitalLifeSummary: sanitizeText(digitalLifeArchitecture?.summary ?? '', 220) || null,
    activeClosenessContext: personStateProjection?.activeClosenessContext ?? null,
    activeClosenessRung: personStateProjection?.activeClosenessRung ?? null,
    activeLearningAction: learningExecutionState?.nextLearningAction ?? null,
    activeSelfRevisionPatch: selfRevisionPatch
      ? {
          id: selfRevisionPatch.id,
          decisionTraceId: selfRevisionPatch.decisionTraceId,
          lanes: [...selfRevisionPatch.lanes],
          reasonCodes: [...selfRevisionPatch.reasonCodes],
          summary: selfRevisionPatch.summary,
          projectStateContinuity: selfRevisionPatch.projectStateContinuity,
        }
      : null,
    relationshipPosture: mergeRelationshipPosture({
      projected: personStateProjection?.relationshipPosture ?? null,
      computed: effectiveRelationshipPosture,
      selfRevisionPatch,
    }),
    reasons: uniqueListWithPinnedPrefix({
      pinned: [
        projectStateResponseCharterBias?.reason ?? null,
        selfEvolutionSameHerOutwardContinuityReason,
        reflection?.revision ?? null,
      ],
      values: [
        activeContinuityGovernance?.mode === 'same-her-baseline'
          ? `active_continuity_baseline=${activeContinuityGovernance.reasonCodes[0] ?? activeContinuityGovernance.candidateId ?? 'current'}`
          : null,
        personStateProjection
          ? `Closeness ladder: ${personStateProjection.activeClosenessContext}/${personStateProjection.activeClosenessRung}.`
          : null,
        memoryDeliberationKernel?.rationale ? `Memory deliberation: ${memoryDeliberationKernel.rationale}` : null,
        ...reasons,
      ],
      maxItems: 4,
    }),
    mustDo,
    mustNotDo,
  } satisfies AlicizationResponseCharter)
}

export function buildAlicizationResponseCharterSystemBlock(charter: AlicizationResponseCharter) {
  const lines = [
    '[ALICIZATION_RESPONSE_CHARTER]',
    'charter_role=executive_answer_state; outranks=persona_flourish,recalled_residue,older_chat_descriptions',
    `epistemic_mode=${charter.epistemicMode}`,
    `response_mode=${charter.responseMode}`,
    `governing_focus=${renderResponseCharterProviderField(charter.governingFocus, 360, 'current_turn_context=present; visible_wording=false')}`,
    `governing_concern=${renderResponseCharterProviderField(charter.governingConcern, 360)}`,
    `governing_commitment=${renderResponseCharterProviderField(charter.governingCommitment, 360)}`,
    `open_inquiry=${renderResponseCharterProviderField(charter.governingInquiry, 360)}`,
    `governing_project=${renderResponseCharterProviderField(charter.governingProject, 520)}`,
    `latest_revision=${renderResponseCharterProviderField(charter.latestRevision, 360)}`,
    `executive_phase=${renderResponseCharterProviderField(charter.executivePhase, 120)}`,
    `truth_frame=${renderResponseCharterProviderField(charter.truthFrame, 160)}`,
    `mind_mode=${renderResponseCharterProviderField(charter.mindMode, 120)}`,
    charter.digitalLifeOperatingMode
      ? `digital_life_mode=${charter.digitalLifeOperatingMode}`
      : '',
    charter.digitalLifeDominantSystem
      ? `digital_life_dominant_system=${charter.digitalLifeDominantSystem}`
      : '',
    charter.digitalLifeSummary
      ? `digital_life_architecture=${renderResponseCharterProviderField(charter.digitalLifeSummary, 360)}`
      : '',
    charter.activeClosenessContext && charter.activeClosenessRung
      ? `closeness_ladder=${charter.activeClosenessContext}/${charter.activeClosenessRung}`
      : '',
    `relationship_posture=${charter.relationshipPosture}`,
  ].filter(Boolean)

  if (charter.reasons.length > 0) {
    const reasons = charter.reasons
      .map(renderResponseCharterProviderListItem)
      .filter(Boolean)
    lines.push(
      'control_section=reasons',
      ...reasons,
    )
  }

  lines.push(
    'control_section=must_do',
    ...charter.mustDo.map(renderResponseCharterProviderListItem).filter(Boolean),
    'control_section=must_not_do',
    ...charter.mustNotDo.map(renderResponseCharterProviderListItem).filter(Boolean),
  )

  return lines.join('\n')
}
