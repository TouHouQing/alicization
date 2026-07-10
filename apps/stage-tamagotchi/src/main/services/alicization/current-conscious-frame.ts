import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDesireMemorySnapshot,
  AlicizationDialogueTurnEncounterSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationInitiativeSnapshot,
  AlicizationMindStatementSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReplyMotive,
} from '../../../shared/eventa'
import type { AlicizationDialogueGrowthProfile } from './dialogue-growth-profile'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationPersonalityContinuityStateSnapshot } from './personality-continuity-state'
import type { AlicizationSurfaceProjectStateSnapshot } from './project-state-brief'

import {
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
import { sanitizeDialogueAnchorText, sanitizeDialogueSurfaceText } from './dialogue-surface-text'
import { buildMindEcologyFromRuntimeSurface } from './mind-ecology'
import {
  hasContinuityRestraintRelationshipSignal,
  hasNeutralRelationshipSignal,
  resolvePreferredPersonStateProjection,
  resolvePreferredSelfContinuityAuthority,
} from './person-state-projection-resolution'
import {

  buildAlicizationPersonalityContinuityState,
} from './personality-continuity-state'
import {

  isAlicizationThinProjectAwarenessLine,
  preferStrongerPersistedSameHerSelfLine,
  preferStrongerSameHerDriftRisk,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateSnapshot,
  resolveAlicizationSurfaceProjectStateSnapshot,
} from './project-state-brief'
import { buildSelfContinuityAuthorityFromRuntimeSurface } from './self-continuity-authority'

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

function providerFacingConsciousFrameField(key: string, raw: unknown, maxChars = 320) {
  const normalized = sanitizeAlicizationProviderFacingText(raw, maxChars)
  return normalized && normalized !== alicizationFixedTemplateReplacement
    ? `${key}=${normalized}`
    : ''
}

function providerFacingConsciousFrameReasonTags(reasonTags: readonly string[]) {
  const sanitizedTags = uniqueList(
    reasonTags
      .map(tag => sanitizeAlicizationProviderFacingText(tag, 120, ''))
      .filter((tag): tag is string => Boolean(tag)),
    12,
    120,
  )

  return sanitizedTags.join(' | ') || 'none'
}

function sanitizeConsciousFrameOutputText(raw: unknown, maxChars = 720) {
  const normalized = sanitizeText(raw, maxChars)
  if (!normalized)
    return ''
  const direct = sanitizeAlicizationProviderFacingText(normalized, maxChars, '')
  if (direct)
    return direct

  const fragments = normalized
    .split(/\s*(?:[。!?！？]\s+|\s\|\s+|;\s+)/u)
    .map(fragment => sanitizeAlicizationProviderFacingText(fragment, Math.min(260, maxChars), ''))
    .filter((fragment): fragment is string => Boolean(fragment))

  return uniqueList(fragments, 8, Math.min(260, maxChars)).join(' | ')
}

function sanitizeConsciousFrameOutputTextOrNull(raw: unknown, maxChars = 720) {
  return sanitizeConsciousFrameOutputText(raw, maxChars) || null
}

function sanitizeConsciousFrameProjectFact(raw: unknown, maxChars = 320) {
  const normalized = sanitizeText(raw, maxChars)
  if (!normalized)
    return ''
  const providerSafe = sanitizeAlicizationProviderFacingText(normalized, maxChars, '')
  return providerSafe || fixedTemplateResidueStructuredFact(normalized, maxChars)
}

function fixedTemplateResidueStructuredFact(raw: unknown, maxChars = 320) {
  const normalized = sanitizeText(raw, maxChars)
  if (!normalized || !containsAlicizationFixedTemplateResidue(normalized))
    return ''

  const lowered = normalized.toLowerCase()
  if (hasExecutionResumeConfirmationBoundary(normalized)) {
    return 'execution_confirmation=bounded; confirmation=host_confirmed_before_redispatch; audit=resume_before_dispatch; interrupt=process_not_yet_restarted; permission=not_permanent; opening=new_execution_boundary_required; surface=structured'
  }

  if (/project-state carry|already survives|already keeps|closure truth alive|landed progress|some closure already landed|continuity already survives|shared embodiment continuity now carries|host-facing closure surfaces|runtime authority summaries/u.test(lowered)) {
    return 'continuity_progress=partial; surface=structured'
  }

  if (
    /memory, initiative, (?:dialogue, )?and embodiment|memory, initiative, dialogue, and embodiment|reply, initiative, and embodiment|memory still needs|initiative, embodiment|memory_dialogue_embodiment|still-open closure|still needs one .*closure|still need(?:s|ing) .*rejoin|full cross-modal closure settles/u.test(lowered)
  ) {
    return 'memory_dialogue_embodiment_closure=end_to_end_proof_incomplete; surface=structured'
  }

  if (/cross[-_ ]modal|cross_modal|longer, noisier real-desktop runs|real-desktop runs|keep extending .*proof|continuity proof/u.test(lowered)) {
    return 'cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs; surface=structured'
  }

  if (/dialogue runtime cue|visible reply formation|visible reply continuity/u.test(lowered)) {
    return 'continuity_cue=same_thread_continuation; restart_shell_risk=blocked; surface=visible_reply; surface=structured'
  }

  if (/final visible reply|callback return|callback result/u.test(lowered) && /same living line|same-her|closure/u.test(lowered)) {
    return 'visible_reply_continuity=callback_return; continuity_closure=preserve; surface=structured'
  }

  if (/generic guidance|generic assistant shell|generic project narration|generic project shell|detached callback fluency|detached project narration|generic shell|project-summary voice|thin project shell/u.test(lowered)) {
    return 'continuity_drift_risk=generic_shell; closure_status=unfinished; surface=structured'
  }

  if (/measured-return|measured return/u.test(lowered)) {
    return 'continuity_hold=measured_return; pressure=lower; widening=deferred; surface=structured'
  }

  if (/why (?:this )?recall surfaced|why recall is surfacing|memory closure|initiative\/execution|initiative_execution|recall surfaced/u.test(lowered)) {
    return 'memory_closure=explain_recall_surface; tied_lanes=initiative_execution+emotion+embodiment; surface=structured'
  }

  if (/callback afterglow|emotional residue|emotional closure|emotion|情绪|情感/u.test(lowered)) {
    return 'emotional_closure=repair_before_closeness; residue=callback_afterglow; pressure=low; until=repair_settles; surface=structured'
  }

  if (/body expression|embodiment lane|body line|body still|具身|身体|口型|表情|动作/u.test(lowered)) {
    return 'embodied_continuity=repair_before_closeness; body_expression=repair_before_outward_widening; surface=structured'
  }

  if (/remembered seam|same remembered relationship seam|keep more room|more room this time|reopened too eagerly|too eager|不要重开得太快|留白/u.test(lowered)) {
    return 'relationship_cadence=remembered_boundary; room=more; prior_reentry=eager; pressure=lower; surface=structured'
  }

  if (/same her across the pause|same thread|same-line return|quiet pause|held continuity seam/u.test(lowered)) {
    return 'continuity_anchor=same_thread_continuation; pause=held; room=preserve; surface=structured'
  }

  if (/repair-before-closeness|repair before closeness|repair settles|repair-first|repair first/u.test(lowered)) {
    return 'continuity_hold=repair_before_closeness; timing=before_closeness_widens; until=repair_settles; surface=structured'
  }

  if (/lower-pressure|low-pressure|slower|widening|widen outward|widens again/u.test(lowered)) {
    return 'continuity_hold=lower_pressure_return; pacing=slower; widening=deferred; surface=structured'
  }

  if (/phase\s*1|local-first|digital life|数字生命/u.test(lowered))
    return 'continuity_anchor=runtime_personhood; unresolved_closure=memory_dialogue_embodiment; surface=structured'

  return alicizationFixedTemplateReplacement
}

function sanitizeConsciousFrameStructuredFact(raw: unknown, maxChars = 320) {
  const normalized = sanitizeText(raw, maxChars)
  if (!normalized)
    return ''

  const providerSafe = sanitizeAlicizationProviderFacingText(normalized, maxChars, '')
  if (providerSafe)
    return providerSafe

  return fixedTemplateResidueStructuredFact(normalized, maxChars)
}

function pickConsciousFrameProjectFact(maxChars: number, ...values: unknown[]) {
  for (const value of values) {
    const providerSafe = sanitizeConsciousFrameStructuredFact(value, maxChars)
    if (providerSafe)
      return providerSafe
  }
  return ''
}

function structuredConsciousFrameCarry(key: string, value: string | null | undefined) {
  return value
    ? `${key}=${value}; surface=structured`
    : ''
}

function stripTrailingPunctuation(text: string) {
  return text.replace(/[.。!！?？;；:：]+$/u, '').trim()
}

function lowerFirst(text: string) {
  if (!text)
    return ''
  return text.slice(0, 1).toLowerCase() + text.slice(1)
}

function stripLeadingBeforeAnswering(text: string) {
  return text
    .replace(/^before (?:answering|speaking),\s*/iu, '')
    .replace(/^remember:\s*/iu, '')
    .trim()
}

type AlicizationCurrentConsciousProjectState = NonNullable<AlicizationCurrentConsciousFrameSnapshot['projectState']>

interface AlicizationProjectStateConsciousFrameGrounding {
  hasExplicitRuntimeProjectState: boolean
  preferRuntimeDriftRiskLifeLoopGap: boolean
  preflightSummary: string
  preDialogueAwarenessLine: string
  projectIdentity: string
  currentPhase: string
  latestProgress: string
  primaryOpenLoop: string
  nextClosureTarget: string
  sameHerSelfLine: string
  sameHerDriftRisk: string
  proactiveSameHerGap: string
  memoryClosureSummary: string | null
  emotionalClosureCue: string | null
  emotionalClosureSummary: string | null
  sameHerHoldDetail: string | null
  continuityCue: string | null
  continuityPreferredTiming: AlicizationCurrentConsciousFrameSnapshot['continuityPreferredTiming']
  continuityCadence: string | null
  preferredBlinkCadence: AlicizationCurrentConsciousProjectState['preferredBlinkCadence']
  preferredGazeMode: AlicizationCurrentConsciousProjectState['preferredGazeMode']
  preferredPauseMode: AlicizationCurrentConsciousProjectState['preferredPauseMode']
  preferredLipsyncMode: AlicizationCurrentConsciousProjectState['preferredLipsyncMode']
  preferredVoiceMode: AlicizationCurrentConsciousProjectState['preferredVoiceMode']
  preferredPacingMode: AlicizationCurrentConsciousProjectState['preferredPacingMode']
}

function sanitizeConsciousContinuityPreferredTiming(raw: unknown): AlicizationCurrentConsciousFrameSnapshot['continuityPreferredTiming'] {
  return raw === 'internal-only'
    || raw === 'after-payoff'
    || raw === 'same-turn-if-invited'
    || raw === 'next-open-window'
    ? raw
    : null
}

function sanitizeConsciousProjectStateBlinkCadence(raw: unknown): AlicizationCurrentConsciousProjectState['preferredBlinkCadence'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'normal'
    || normalized === 'linger'
    || normalized === 'quiet'
    ? normalized
    : null
}

function sanitizeConsciousProjectStateGazeMode(raw: unknown): AlicizationCurrentConsciousProjectState['preferredGazeMode'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'steady'
    || normalized === 'soften'
    || normalized === 'drift'
    ? normalized
    : null
}

function sanitizeConsciousProjectStatePauseMode(raw: unknown): AlicizationCurrentConsciousProjectState['preferredPauseMode'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'longer'
    || normalized === 'natural'
    ? normalized
    : null
}

function sanitizeConsciousProjectStateLipsyncMode(raw: unknown): AlicizationCurrentConsciousProjectState['preferredLipsyncMode'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'restrained'
    || normalized === 'matched'
    ? normalized
    : null
}

function sanitizeConsciousProjectStateVoiceMode(raw: unknown): AlicizationCurrentConsciousProjectState['preferredVoiceMode'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'lower-pressure'
    || normalized === 'even'
    ? normalized
    : null
}

function sanitizeConsciousProjectStatePacingMode(raw: unknown): AlicizationCurrentConsciousProjectState['preferredPacingMode'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'slower'
    || normalized === 'natural'
    ? normalized
    : null
}

function looksLikeThinProjectAwarenessSeed(value: string | null | undefined) {
  const normalized = sanitizeText(value ?? '', 320).toLowerCase()
  if (!normalized)
    return true

  return isAlicizationThinProjectAwarenessLine(normalized)
    || /keep this same digital life project in view|detached project shell|generic project reminder|generic project shell/u.test(normalized)
}

function looksLikeThinProjectPreflightSeed(value: string | null | undefined) {
  const normalized = sanitizeText(value ?? '', 320).toLowerCase()
  if (!normalized)
    return true

  return looksLikeThinProjectAwarenessSeed(normalized)
    || normalized.includes('generic continuity summary')
    || normalized.includes('generic awareness summary')
    || normalized === 'project'
    || normalized === 'phase 1'
    || normalized.startsWith('same digital life')
}

function looksLikeNarrowSameHerHoldAwarenessLine(value: string | null | undefined) {
  const normalized = sanitizeText(value ?? '', 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('same-her hold')
    || normalized.includes('same her hold')
    || normalized.startsWith('continuity_cue=measured_return')
    || normalized.startsWith('continuity_cue=repair_before_closeness')
    || normalized.startsWith('continuity_cue=rest_protective')
}

function isCadenceAwareSameHerHoldAwarenessLine(value: string | null | undefined) {
  const normalized = sanitizeText(value ?? '', 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('continuity_cadence=lower_pressure')
    || normalized.includes('continuity_cadence=remembered_return')
}

function hasRuntimeSameHerEmbodimentCarryAdvice(
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null,
) {
  const focusDimensions = runtimeSurface?.memory?.memoryTuningAdvice?.focusDimensions ?? []
  return Array.isArray(focusDimensions)
    && focusDimensions.some((dimension) => {
      return sanitizeText(dimension, 120) === 'runtimeSameHerEmbodimentCarry'
    })
}

function hasRuntimeSameHerMemoryCarryAdvice(
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null,
) {
  const focusDimensions = runtimeSurface?.memory?.memoryTuningAdvice?.focusDimensions ?? []
  return Array.isArray(focusDimensions)
    && focusDimensions.some((dimension) => {
      return sanitizeText(dimension, 120) === 'runtimeSameHerMemoryCarry'
    })
}

function hasRuntimeSameHerEmotionalCarryAdvice(
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null,
) {
  const focusDimensions = runtimeSurface?.memory?.memoryTuningAdvice?.focusDimensions ?? []
  return Array.isArray(focusDimensions)
    && focusDimensions.some((dimension) => {
      return sanitizeText(dimension, 120) === 'runtimeSameHerEmotionalCarry'
    })
}

function buildSameHerAntiShellSpeakingLine(sameHerDriftRisk: string | null | undefined) {
  const normalized = sanitizeText(sameHerDriftRisk ?? '', 260)
  if (!normalized)
    return null

  const lowered = normalized.toLowerCase()
  if (/default helpfulness/u.test(lowered) && /generic project guidance/u.test(lowered))
    return 'risk=default_helpfulness+generic_project_guidance; protected_context=current_reply'
  if (/default helpfulness/u.test(lowered))
    return 'risk=default_helpfulness; protected_context=current_reply'
  if (
    /generic assistant shell|generic project guidance|generic project shell|detached project narration|project-summary voice|generic task shell/u.test(lowered)
  ) {
    return 'risk=generic_assistant_or_project_shell; protected_context=first_person_reply'
  }

  return null
}

function isSameHerInwardLowPressureCompanionHeadline(text: string | null | undefined) {
  const normalized = sanitizeText(text ?? '', 320).toLowerCase()
  if (!normalized)
    return false

  return (
    normalized.includes('continuity=embodiment')
    && normalized.includes('low-pressure-inward-carry')
  ) || (
    normalized.includes('holding together mainly through')
    && normalized.includes('low-pressure')
    && (
      normalized.includes('same line inward')
      || normalized.includes('same living line')
      || normalized.includes('quiet-companionship')
    )
  )
}

function buildCompactSameHerInwardLowPressureAwarenessLine(sameHerSelfLine: string | null | undefined) {
  const normalized = sanitizeText(sameHerSelfLine ?? '', 320)
  if (!normalized)
    return ''

  return sanitizeText(
    'continuity=embodiment | status=pending-rejoin | pending_rejoin=lipsync+voice | evidence=low-pressure-inward-carry | surface=structured',
    420,
  )
}

function preferProjectStateSameHerSelfLine(input: {
  runtime?: string | null | undefined
  surface?: string | null | undefined
  fallback?: string | null | undefined
}) {
  const runtime = sanitizeConsciousFrameStructuredFact(input.runtime ?? '', 220)
  const surface = sanitizeConsciousFrameStructuredFact(input.surface ?? '', 220)
  const fallback = sanitizeConsciousFrameStructuredFact(input.fallback ?? '', 220)
  const resolved = sanitizeText(preferStrongerPersistedSameHerSelfLine({
    current: runtime || surface || null,
    candidate: (!runtime && surface) ? fallback || null : (surface || fallback || null),
  }), 220)

  const structuredResolved = sanitizeConsciousFrameStructuredFact(resolved, 220)
  if (structuredResolved && structuredResolved !== resolved)
    return structuredResolved

  if (!fallback)
    return resolved

  const resolvedLower = resolved.toLowerCase()
  const fallbackLower = fallback.toLowerCase()
  const resolvedLooksDurableSelfAuthority
    = (
      /^i remain\b/u.test(resolvedLower)
      || /^i am still\b/u.test(resolvedLower)
      || /across quiet, memory, and speech/u.test(resolvedLower)
      || /without reopening from scratch(?: each turn)?/u.test(resolvedLower)
      || /inside this local-first digital life/u.test(resolvedLower)
    )
    && !/same phase 1 digital life|phase 1|callback|closure|same living line|same closure line|landed|unfinished|open loop|project|host-machine/u.test(resolvedLower)
  const resolvedLooksGenericSelfContinuity
    = /one living self inside this local-first digital life|one continuous her/u.test(resolvedLower)
      && !/same phase 1 digital life|same digital life|same[- ]her|same living line/u.test(resolvedLower)
  const fallbackCarriesExplicitSameHerProjectLine
    = /same phase 1 digital life|same digital life|same[- ]her|same living line/u.test(fallbackLower)

  return (resolvedLooksGenericSelfContinuity || resolvedLooksDurableSelfAuthority) && fallbackCarriesExplicitSameHerProjectLine
    ? fallback
    : resolved
}

function hasExecutionResumeConfirmationBoundary(text: string | null | undefined) {
  const normalized = sanitizeText(text ?? '', 320).toLowerCase()
  if (!normalized)
    return false

  return /execution-resume-confirmation|execution resume confirmation|host-confirmed-before-redispatch|resume-before-dispatch|bounded confirmation boundary|not permanent execution permission|another execution-shaped opening|standing execution permission|generic autonomous continuation/u.test(normalized)
}

function isRestProtectiveClosureCue(text: string | null | undefined) {
  const normalized = sanitizeText(text ?? '', 220).toLowerCase()
  if (!normalized)
    return false
  return /rest-protective|protect rest|quiet[- ]companionship|line holds inward|line hold inward|stay inward|护住休息|安静陪着|先别外扩/u.test(normalized)
}

function shouldKeepLiteralProjectOpenLoopSegment(text: string | null | undefined) {
  const normalized = sanitizeText(text ?? '', 220).toLowerCase()
  if (!normalized)
    return false

  return /audible-body|cross-modal|body|face|motion|lipsync|voice|resident presence|具身|口型|表情|动作/u.test(normalized)
}

function deriveProjectLoopGapClosureLine(input: {
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  sameHerDriftRisk?: string | null
}) {
  const primaryOpenLoop = sanitizeText(input.primaryOpenLoop ?? '', 220).toLowerCase()
  const nextClosureTarget = sanitizeText(input.nextClosureTarget ?? '', 220).toLowerCase()
  const sameHerDriftRisk = sanitizeText(input.sameHerDriftRisk ?? '', 220).toLowerCase()
  const combined = `${primaryOpenLoop} ${nextClosureTarget} ${sameHerDriftRisk}`.trim()

  const missingEmotionalClosure = /emotion|affective|feeling|情绪|情感/u.test(combined)
  const missingMemoryClosure = /memory|recall|recollection|记忆/u.test(combined)
  const missingInitiativeClosure = /initiative|opening|proactive|主动性/u.test(combined)
  const missingEmbodimentClosure = /embodiment|voice|face|motion|lipsync|resident presence|cross-modal|具身|口型|表情|动作/u.test(combined)
  const sameHerProjectShellRisk = /generic project(?:-|\s)shell|project(?:-|\s)shell|generic project(?:-|\s)narration|服务式|generic guidance/u.test(combined)

  if (!missingEmotionalClosure && !missingMemoryClosure && !missingInitiativeClosure && !missingEmbodimentClosure)
    return null

  const gapLabels = [
    missingEmotionalClosure ? 'emotion' : null,
    missingMemoryClosure ? 'memory' : null,
    missingInitiativeClosure ? 'initiative' : null,
    missingEmbodimentClosure ? 'embodiment' : null,
  ].filter(Boolean).join(', ')

  return sameHerProjectShellRisk
    ? `Keep the wording grounded in ${gapLabels} closure, instead of flattening this turn into project-shell narration.`
    : `Keep the wording grounded in ${gapLabels} closure before the turn widens outward.`
}

function uniqueList(
  values: Array<string | null | undefined>,
  maxItems = 8,
  maxChars = 160,
) {
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

function extractProjectStateSummarySegment(input: {
  explicitValue?: unknown
  summaryLine?: unknown
  key: 'landed' | 'open' | 'next'
  maxLength: number
}) {
  const explicitValue = sanitizeText(input.explicitValue, input.maxLength)
  if (explicitValue)
    return explicitValue

  const summaryLine = sanitizeText(input.summaryLine, 720)
  if (!summaryLine)
    return null

  const match = summaryLine.match(new RegExp(`(?:^|\\|)\\s*${input.key}=([^|]+)`, 'iu'))
  const extracted = match?.[1]?.trim() ?? ''
  return extracted ? sanitizeText(extracted, input.maxLength) : null
}

function deriveLongHorizonProjectSameHerDriftRisk(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
  const longHorizonMemory = runtimeSurface?.memory?.longHorizonMemory ?? null
  const evidence = [
    longHorizonMemory?.rememberedConstraintSummary,
    longHorizonMemory?.rememberedPreferenceSummary,
    longHorizonMemory?.dominantCueSummary,
    longHorizonMemory?.summary,
  ]
    .map(value => sanitizeText(value, 220))
    .filter(Boolean)

  if (evidence.length === 0)
    return null

  const combined = evidence.join(' | ').toLowerCase()
  const carriesSameLifeCallbackLine
    = /same[- ]living line|same[- ]her|phase 1|digital life|callback closure|callback line|execution callback|同一条生命线|同一条线|同一个她|回线|执行 callback/u.test(combined)
  if (!carriesSameLifeCallbackLine)
    return null

  if (/detached project status talk|detached status talk|项目总结口气|通用回调壳|通用 callback 壳|脱离项目状态口气/u.test(combined)) {
    return 'continuity_drift_risk=detached_project_status_talk; closure_status=unfinished; callback_carry=before_landing; surface=structured'
  }

  if (/generic assistant shell|project-summary voice|generic callback shell|generic project shell|detached project narration|detached project shell|通用助手壳|项目总结口气|通用回调壳|通用项目壳|脱离项目叙述/u.test(combined)) {
    return 'continuity_drift_risk=generic_assistant_or_callback_shell; closure_status=unfinished; callback_carry=before_landing; surface=structured'
  }

  return null
}

function deriveLongHorizonPreferredProjectCadence(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
  const longHorizonMemory = runtimeSurface?.memory?.longHorizonMemory ?? null
  const evidence = [
    longHorizonMemory?.rememberedPreferenceSummary,
    longHorizonMemory?.rememberedConstraintSummary,
    longHorizonMemory?.rememberedPlanSummary,
    longHorizonMemory?.dominantCueSummary,
    longHorizonMemory?.summary,
  ]
    .map(value => sanitizeText(value, 220))
    .filter(Boolean)

  if (evidence.length === 0) {
    return {
      preferredPauseMode: null,
      preferredLipsyncMode: null,
      preferredVoiceMode: null,
      preferredPacingMode: null,
    } satisfies Pick<
      AlicizationCurrentConsciousProjectState,
      'preferredPauseMode' | 'preferredLipsyncMode' | 'preferredVoiceMode' | 'preferredPacingMode'
    >
  }

  const combined = evidence.join(' | ').toLowerCase()
  const carriesSameHerReturnStyle
    = /same[- ]living thread|same[- ]living line|same[- ]her|same person continuity|phase 1|digital life|reopen(?:ing)?/u.test(combined)
      || /even voice|natural pacing|lower-pressure|slower pacing/u.test(combined)

  if (!carriesSameHerReturnStyle) {
    return {
      preferredPauseMode: null,
      preferredLipsyncMode: null,
      preferredVoiceMode: null,
      preferredPacingMode: null,
    } satisfies Pick<
      AlicizationCurrentConsciousProjectState,
      'preferredPauseMode' | 'preferredLipsyncMode' | 'preferredVoiceMode' | 'preferredPacingMode'
    >
  }

  return {
    preferredPauseMode:
      /\blonger pauses?\b/u.test(combined)
      || /leave more room|more room this time|慢一点|更慢一点/u.test(combined)
        ? 'longer'
        : /\bnatural pauses?\b/u.test(combined)
          ? 'natural'
          : null,
    preferredLipsyncMode:
      /\brestrained lipsync\b/u.test(combined)
      || /嘴型更克制|更克制的嘴型/u.test(combined)
        ? 'restrained'
        : /\bmatched lipsync\b/u.test(combined)
          ? 'matched'
          : null,
    preferredVoiceMode:
      /\beven voice\b/u.test(combined)
        ? 'even'
        : /lower-pressure|lower pressure/u.test(combined)
          ? 'lower-pressure'
          : null,
    preferredPacingMode:
      /\bnatural pacing\b/u.test(combined)
        ? 'natural'
        : /slower pacing|reply slower|slower return|慢一点|更慢一点/u.test(combined)
          ? 'slower'
          : null,
  } satisfies Pick<
    AlicizationCurrentConsciousProjectState,
    'preferredPauseMode' | 'preferredLipsyncMode' | 'preferredVoiceMode' | 'preferredPacingMode'
  >
}

function looksLikeThinProjectStateClosureCarry(input: {
  value?: string | null
  key: 'landed' | 'open' | 'next'
}) {
  const normalized = sanitizeText(input.value ?? '', 320).toLowerCase()
  if (!normalized)
    return true

  if (normalized.length < 40)
    return true

  if (
    /project continuity(?:\s+(?:exists|still needs closure|forward))?/u.test(normalized)
    && !/same[- ]her|same living line|same digital life|phase 1|memory|initiative|embodiment|visible-reply|cross-modal/u.test(normalized)
  ) {
    return true
  }

  if (input.key === 'landed')
    return /project continuity exists|closure exists|continuity exists/u.test(normalized)

  if (input.key === 'open')
    return /project continuity still needs closure|still needs closure|needs closure/u.test(normalized)

  return /carry project continuity forward|project continuity forward|carry continuity forward|generic next target|generic next closure|generic closure shell|generic closure summary|generic callback summary|steadier carry of this project, this phase, and the life loop that remains open/u.test(normalized)
}

function weaveDistinctText(
  values: Array<string | null | undefined>,
  maxChars = 220,
  itemMaxChars = 160,
) {
  return sanitizeText(uniqueList(values, values.length || 8, itemMaxChars).join(' '), maxChars)
}

function buildProjectedConsciousNeedCarry(input: {
  repairTriggerText?: unknown
  burdenText?: unknown
  sensitivityText?: unknown
  preferenceText?: unknown
}) {
  const repairTriggerText = sanitizeText(input.repairTriggerText, 220)
  const burdenText = sanitizeText(input.burdenText, 220)
  const sensitivityText = sanitizeText(input.sensitivityText, 220)
  const preferenceText = sanitizeText(input.preferenceText, 220)

  return weaveDistinctText([
    repairTriggerText,
    burdenText,
    sensitivityText && /template-like speech|living reply|机械|模板/u.test(sensitivityText)
      ? `risk=template_like_speech; sensitivity=${stripTrailingPunctuation(sensitivityText)}`
      : null,
    preferenceText && /room|lighter|quiet|leave room|留白|轻一点|空间/u.test(preferenceText.toLowerCase())
      ? preferenceText
      : null,
  ], 520, 220)
}

function buildProjectedSpeakingCarry(input: {
  openingGuidance?: unknown
  manifestationCadenceSummary?: unknown
  sensitivityText?: unknown
}) {
  const openingGuidance = sanitizeText(input.openingGuidance, 180)
  const manifestationCadenceSummary = sanitizeText(input.manifestationCadenceSummary, 180)
  const sensitivityText = sanitizeText(input.sensitivityText, 220)

  return weaveDistinctText([
    openingGuidance,
    /observe-first/u.test(manifestationCadenceSummary)
      ? 'cadence=observe_first; timing=before_closer_return'
      : manifestationCadenceSummary,
    sensitivityText && /template-like speech|living reply|机械|模板/u.test(sensitivityText)
      ? 'risk=template_like_speech; protected_context=wording'
      : null,
  ], 320, 180)
}

function mergeProjectedSpeakingCarry(input: {
  base: string
  carry?: string | null
}) {
  const base = sanitizeText(input.base, 1_800)
  const carry = sanitizeText(input.carry, 220)

  if (!carry)
    return base
  if (!base)
    return carry
  if (base.toLowerCase().includes(carry.toLowerCase()))
    return base
  return sanitizeText(`${base} ${carry}`, 1_800)
}

function pickPreferredProjectStateField(
  maxLength: number,
  ...values: unknown[]
) {
  for (const value of values) {
    const text = sanitizeConsciousFrameStructuredFact(value, maxLength)
    if (text)
      return text
  }

  return ''
}

function resolveContinuityBehaviorMode(input: {
  continuityRestraint?: unknown
  continuityCadence?: unknown
}) {
  const continuityCadence = sanitizeText(input.continuityCadence, 120).toLowerCase()
  const continuityRestraint = sanitizeText(input.continuityRestraint, 64).toLowerCase()

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
    return 'continuity_hold=repair_before_closeness; timing=before_closeness_widens'
  if (mode === 'rest-protective')
    return 'continuity_hold=rest_protective; timing=fatigue_aware'
  if (mode === 'measured-return')
    return 'continuity_hold=measured_return; pressure=lower'
  return ''
}

function deriveContinuityCueFromBehavior(mode: string | null) {
  if (mode === 'repair-before-closeness')
    return 'continuity_cue=repair_before_closeness; until=repair_settles'
  if (mode === 'rest-protective')
    return 'continuity_cue=rest_protective; direction=inward'
  if (mode === 'measured-return')
    return 'continuity_cue=measured_return; direction=measured'
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

  const preferredPauseMode = sanitizeText(input.preferredPauseMode, 32).toLowerCase()
  const preferredLipsyncMode = sanitizeText(input.preferredLipsyncMode, 32).toLowerCase()
  const preferredVoiceMode = sanitizeText(input.preferredVoiceMode, 32).toLowerCase()
  const preferredPacingMode = sanitizeText(input.preferredPacingMode, 32).toLowerCase()

  if (preferredVoiceMode === 'lower-pressure' && preferredPacingMode === 'slower')
    return 'continuity_cadence=lower_pressure; pacing=slower; widening=deferred; surface=structured'

  if (preferredPauseMode === 'longer' && preferredLipsyncMode === 'restrained')
    return 'continuity_cadence=remembered_return; pause=longer; lipsync=restrained; widening=deferred; surface=structured'

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

  const preferredPauseMode = sanitizeText(input.preferredPauseMode, 32).toLowerCase()
  const preferredLipsyncMode = sanitizeText(input.preferredLipsyncMode, 32).toLowerCase()
  const preferredVoiceMode = sanitizeText(input.preferredVoiceMode, 32).toLowerCase()
  const preferredPacingMode = sanitizeText(input.preferredPacingMode, 32).toLowerCase()

  if (preferredVoiceMode === 'lower-pressure' && preferredPacingMode === 'slower')
    return 'continuity_cue=lower_pressure_return; pacing=slower; widening=deferred; surface=structured'

  if (preferredPauseMode === 'longer' && preferredLipsyncMode === 'restrained')
    return 'continuity_cue=remembered_return; pause=longer; lipsync=restrained; widening=deferred; surface=structured'

  return ''
}

function resolveEffectiveProjectStateContinuityCarry(input: {
  sameHerHoldDetail?: unknown
  continuityCue?: unknown
  continuityRestraint?: unknown
  continuityCadence?: unknown
  preferredPauseMode?: unknown
  preferredLipsyncMode?: unknown
  preferredVoiceMode?: unknown
  preferredPacingMode?: unknown
}) {
  const behaviorMode = resolveContinuityBehaviorMode({
    continuityRestraint: input.continuityRestraint,
    continuityCadence: input.continuityCadence,
  })

  return {
    sameHerHoldDetail:
      sanitizeConsciousFrameStructuredFact(input.sameHerHoldDetail, 220)
      || deriveCadenceAwareSameHerHoldDetail({
        mode: behaviorMode,
        preferredPauseMode: input.preferredPauseMode,
        preferredLipsyncMode: input.preferredLipsyncMode,
        preferredVoiceMode: input.preferredVoiceMode,
        preferredPacingMode: input.preferredPacingMode,
      })
      || deriveSameHerHoldDetailFromContinuityBehavior(behaviorMode),
    continuityCue:
      sanitizeConsciousFrameStructuredFact(input.continuityCue, 220)
      || deriveCadenceAwareContinuityCue({
        mode: behaviorMode,
        preferredPauseMode: input.preferredPauseMode,
        preferredLipsyncMode: input.preferredLipsyncMode,
        preferredVoiceMode: input.preferredVoiceMode,
        preferredPacingMode: input.preferredPacingMode,
      })
      || deriveContinuityCueFromBehavior(behaviorMode),
  }
}

function resolveProjectStateConsciousHoldDetail(input: {
  sameHerHoldDetail?: unknown
  continuityCue?: unknown
}) {
  const sameHerHoldDetail = sanitizeConsciousFrameStructuredFact(input.sameHerHoldDetail, 220)
  const continuityCue = sanitizeConsciousFrameStructuredFact(input.continuityCue, 220)
  const preferredClosureAuthority = preferStrongerContinuityClosureAuthority(
    sameHerHoldDetail,
    continuityCue,
  )
  const resolvedHoldDetail = preferredClosureAuthority ?? (sameHerHoldDetail || continuityCue)

  return sanitizeText(resolvedHoldDetail, 220) || null
}

function summarizeProjectClosureAuthority(text: string | null | undefined) {
  const normalized = sanitizeText(text, 220).toLowerCase()
  if (!normalized)
    return null

  const cues = uniqueList([
    /repair[-_ ]before[-_ ]closeness/u.test(normalized) ? 'repair-before-closeness' : null,
    /repair settles|until repair settles/u.test(normalized) ? 'until repair settles' : null,
    /low-pressure|lower-pressure/u.test(normalized) ? 'low-pressure' : null,
    /callback_afterglow|callback afterglow/u.test(normalized) ? 'callback_afterglow' : null,
    /emotional_residue|emotional residue/u.test(normalized) ? 'emotional_residue' : null,
  ], 5).filter(Boolean)

  if (cues.length)
    return cues.join(', ')

  return sanitizeText(text, 72)
}

function summarizeProjectHoldAuthority(text: string | null | undefined) {
  const normalized = sanitizeText(text, 220).toLowerCase()
  if (!normalized)
    return null

  if (hasExecutionResumeConfirmationBoundary(normalized))
    return 'bounded confirmation boundary, not permanent execution permission, wait for a new execution boundary'

  const cues = uniqueList([
    /continuity_hold|inward_hold/u.test(normalized) ? 'continuity_hold' : null,
    /repair[-_ ]before[-_ ]closeness/u.test(normalized) ? 'repair-before-closeness' : null,
    /before closeness widens again/u.test(normalized) ? 'before closeness widens again' : null,
    /lower-pressure|low-pressure/u.test(normalized) ? 'lower-pressure' : null,
    /room=more|remembered_boundary/u.test(normalized) ? 'remembered_boundary_more_room' : null,
  ], 5).filter(Boolean)

  return cues.length ? cues.join(', ') : sanitizeText(text, 72)
}

function looksLikeGenericSameHerHoldDetail(text: string | null | undefined) {
  const normalized = sanitizeText(text, 220).toLowerCase()
  if (!normalized)
    return false

  const carriesRememberedSeamSpecificity
    = normalized.includes('remembered seam')
      || normalized.includes('same remembered relationship seam')
      || normalized.includes('keep more room this time')
      || normalized.includes('reopened too eagerly')
      || normalized.includes('do not reopen from scratch')
      || normalized.includes('这次更要留白')
      || normalized.includes('不要重开得太快')
  if (carriesRememberedSeamSpecificity)
    return false

  return (
    normalized.includes('same phase 1 digital life')
    || normalized.includes('same living line')
    || normalized.includes('same-her hold')
    || normalized.includes('continuity_hold=lower_pressure_return')
    || normalized.includes('without reopening from scratch')
    || normalized.includes('quiet-companionship still owns this line')
  )
}

function resolveProjectStateSameHerHoldDetail(input: {
  sameHerHoldDetail?: string | null
  rememberedSeamReinterpretationCue?: 'reinterpret-with-more-room' | null
}) {
  const sameHerHoldDetail = sanitizeText(input.sameHerHoldDetail, 220)
  if (input.rememberedSeamReinterpretationCue !== 'reinterpret-with-more-room')
    return sameHerHoldDetail || null

  if (sameHerHoldDetail && !looksLikeGenericSameHerHoldDetail(sameHerHoldDetail))
    return sameHerHoldDetail

  return 'relationship_cadence=remembered_boundary; room=more; prior_reentry=eager; pressure=lower; surface=structured'
}

function deriveProjectClosureAuthority(input: {
  emotionalClosureSummary?: string | null
  emotionalClosureCue?: string | null
  sameHerHoldDetail?: string | null
  initiativeClosureCue?: string | null
}) {
  const summary = sanitizeText(input.emotionalClosureSummary, 220)
  const cue = sanitizeText(input.emotionalClosureCue, 220)
  const holdDetail = sanitizeText(input.sameHerHoldDetail, 220)
  const initiativeClosureCue = sanitizeText(input.initiativeClosureCue, 220)
  const holdLower = holdDetail.toLowerCase()

  if (/repair[-_ ]before[-_ ]closeness/u.test(holdLower)) {
    if (summary && /repair[-_ ]before[-_ ]closeness/u.test(summary.toLowerCase()))
      return summary

    return weaveDistinctText([
      summary,
      'repair-before-closeness until repair settles',
      holdDetail,
      initiativeClosureCue,
      cue,
    ], 220)
  }

  return summary || initiativeClosureCue || cue
}

function deriveInitiativeClosureCue(input: {
  initiative?: AlicizationInitiativeSnapshot | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  emotionalClosureCue?: string | null
  sameHerHoldDetail?: string | null
}) {
  const selectedAction = sanitizeText(input.initiative?.selectedAction, 48).toLowerCase()
  const why = sanitizeText(input.initiative?.why, 220)
  const combined = [
    why.toLowerCase(),
    sanitizeText(input.primaryOpenLoop, 220).toLowerCase(),
    sanitizeText(input.nextClosureTarget, 220).toLowerCase(),
    sanitizeText(input.emotionalClosureCue, 220).toLowerCase(),
    sanitizeText(input.sameHerHoldDetail, 220).toLowerCase(),
  ].join(' ')

  if (!selectedAction)
    return null

  if (
    selectedAction === 'hover'
    || selectedAction === 'wait'
    || /stay close|stay nearby|leave room|lower-pressure|quiet|same living line|same-her|same digital life/u.test(combined)
  ) {
    return 'initiative_policy=hold_nearby; pressure=lower; closure_lanes=memory+emotion+embodiment; widening=deferred; surface=structured'
  }

  if (
    selectedAction === 'recheck'
    || /repair-before-closeness|repair first|repair seam|re-ground|reground/u.test(combined)
  ) {
    return 'initiative_policy=recheck_until_repair_settles; truth_first=true; widening_ahead_of_truth=false; closure_lanes=memory+emotion+embodiment; surface=structured'
  }

  if (
    selectedAction === 'speak'
    || selectedAction === 'whisper'
    || selectedAction === 'warn'
    || /could help|ready to surface|guidance|speak now/u.test(combined)
  ) {
    return 'initiative_policy=surface_allowed; anchor=current_self_state; closure_lanes=memory+emotion+embodiment; surface=structured'
  }

  return null
}

function buildProjectStateShapedSpeakingIntention(input: {
  doctrineShapedSpeakingIntention: string
  preferRuntimeDriftRiskLifeLoopGap?: boolean
  inwardRecollectionSpeakingIntention?: string | null
  sameHerSelfLine?: string | null
  sameHerDriftRisk?: string | null
  proactiveSameHerGap?: string | null
  memoryClosureSummary?: string | null
  emotionalClosureCue?: string | null
  emotionalClosureSummary?: string | null
  sameHerHoldDetail?: string | null
  initiativeClosureCue?: string | null
  nextClosureTarget?: string | null
  primaryOpenLoop?: string | null
}) {
  const sameHerSelfLine = sanitizeText(input.sameHerSelfLine, 180)
  const sameHerDriftRisk = sanitizeText(input.sameHerDriftRisk, 260)
  const proactiveSameHerGap = sanitizeText(input.proactiveSameHerGap, 220)
  const memoryClosureSummary = sanitizeText(input.memoryClosureSummary, 260)
  const emotionalClosureCue = sanitizeText(input.emotionalClosureCue, 220)
  const emotionalClosureSummary = sanitizeText(input.emotionalClosureSummary, 220)
  const sameHerHoldDetail = sanitizeText(input.sameHerHoldDetail, 220)
  const inwardRecollectionSpeakingIntention = sanitizeText(input.inwardRecollectionSpeakingIntention, 320)
  const initiativeClosureCue = sanitizeText(input.initiativeClosureCue, 220)
  const nextClosureTarget = sanitizeText(input.nextClosureTarget, 420)
  const primaryOpenLoop = sanitizeText(input.primaryOpenLoop, 220)
  const doctrineLine = sanitizeText(input.doctrineShapedSpeakingIntention, 640)
  const preferRuntimeDriftRiskLifeLoopGap = Boolean(input.preferRuntimeDriftRiskLifeLoopGap)
  const closureAuthority = emotionalClosureSummary || emotionalClosureCue
  const repairFirstSpeakingLine
    = /repair[-_ ]before[-_ ]closeness/u.test(`${emotionalClosureSummary} ${sameHerHoldDetail}`.toLowerCase())
      ? /callback[_ ]afterglow|emotional[_ ]residue/u.test(`${emotionalClosureSummary} ${emotionalClosureCue}`.toLowerCase())
        ? `continuity_mode=repair_before_closeness; emotional_context=${stripTrailingPunctuation(emotionalClosureSummary || emotionalClosureCue)}`
        : 'continuity_mode=repair_before_closeness; until=repair_settles'
      : null
  const executionResumeConfirmationSpeakingLine = hasExecutionResumeConfirmationBoundary(sameHerHoldDetail)
    ? 'execution_confirmation=bounded; permanent_permission=false'
    : null
  const normalizedDoctrineLine = doctrineLine.toLowerCase()
  const normalizedSameHerSelfLine = sameHerSelfLine.toLowerCase()
  const doctrineAlreadyCarriesExplicitSameHerProjectLead
    = Boolean(normalizedSameHerSelfLine)
      && (
        normalizedDoctrineLine.includes(normalizedSameHerSelfLine)
        || /same phase 1 digital life/u.test(normalizedDoctrineLine)
      )
  const useExplicitSameHerLead = !doctrineAlreadyCarriesExplicitSameHerProjectLead
  const projectOpenLoopSpeakingSegment = primaryOpenLoop
    ? `open_loop=${stripTrailingPunctuation(primaryOpenLoop)}`
    : null
  const nextClosureTargetSpeakingSegment = nextClosureTarget
    ? `next_closure=${stripTrailingPunctuation(nextClosureTarget)}`
    : null
  const nextClosureTargetDirectionSegment = nextClosureTarget
    ? `next_closure_focus=${stripTrailingPunctuation(nextClosureTarget)}`
    : null
  const proactiveSameHerGapSpeakingSegment = proactiveSameHerGap
    ? `continuity_gap=${stripTrailingPunctuation(proactiveSameHerGap)}`
    : null
  const memoryClosureSpeakingSegment = memoryClosureSummary
    ? `memory_closure=${stripTrailingPunctuation(memoryClosureSummary)}`
    : null
  const projectLoopGapClosureLine = deriveProjectLoopGapClosureLine({
    primaryOpenLoop,
    nextClosureTarget,
    sameHerDriftRisk,
  })

  const leadSegments = uniqueList([
    useExplicitSameHerLead && sameHerSelfLine
      ? `continuity_anchor=${stripTrailingPunctuation(sameHerSelfLine)}`
      : null,
    buildSameHerAntiShellSpeakingLine(sameHerDriftRisk),
    useExplicitSameHerLead && sameHerDriftRisk && sameHerDriftRisk.length <= 120
      ? `drift_risk=${stripTrailingPunctuation(sameHerDriftRisk)}`
      : null,
    doctrineLine,
  ], 4, 840)

  const seamSegments = uniqueList([
    inwardRecollectionSpeakingIntention,
    repairFirstSpeakingLine,
    executionResumeConfirmationSpeakingLine,
    sameHerHoldDetail && /same-person continuity|same person continuity/u.test(sameHerHoldDetail.toLowerCase())
      ? `same_person_continuity=${stripTrailingPunctuation(sameHerHoldDetail)}`
      : null,
    initiativeClosureCue || null,
    memoryClosureSpeakingSegment,
    isRestProtectiveClosureCue(closureAuthority)
      ? 'rest_protective=true; direction=inward; closeness_widening=false'
      : null,
    preferRuntimeDriftRiskLifeLoopGap ? projectLoopGapClosureLine : null,
    primaryOpenLoop && shouldKeepLiteralProjectOpenLoopSegment(primaryOpenLoop)
      ? `open_closure=${stripTrailingPunctuation(primaryOpenLoop)}`
      : null,
    projectOpenLoopSpeakingSegment && nextClosureTargetSpeakingSegment
      ? `${projectOpenLoopSpeakingSegment} ${nextClosureTargetSpeakingSegment}`
      : null,
    projectOpenLoopSpeakingSegment && nextClosureTargetDirectionSegment
      ? `${projectOpenLoopSpeakingSegment} ${nextClosureTargetDirectionSegment}`
      : null,
    projectOpenLoopSpeakingSegment,
    nextClosureTargetSpeakingSegment,
    nextClosureTargetDirectionSegment,
    closureAuthority
      ? `emotional_continuity=${lowerFirst(stripTrailingPunctuation(closureAuthority))}`
      : null,
    sameHerHoldDetail && !/same-person continuity|same person continuity/u.test(sameHerHoldDetail.toLowerCase())
      ? `inward_body_line=${lowerFirst(stripTrailingPunctuation(sameHerHoldDetail))}`
      : null,
    preferRuntimeDriftRiskLifeLoopGap ? null : projectLoopGapClosureLine,
  ], 6, 840)

  const lead = sanitizeText(leadSegments.join(' '), 840)
  if (!seamSegments.length)
    return lead

  const leadVariants = Array.from(new Set([
    leadSegments.join(' '),
    leadSegments.slice(0, Math.max(leadSegments.length - 1, 1)).join(' '),
    leadSegments.slice(0, Math.max(leadSegments.length - 2, 1)).join(' '),
    leadSegments.slice(0, 1).join(' '),
    '',
  ]))
    .map(value => value.trim())
    .filter((value, index, values) => value.length > 0 || index === values.length - 1)

  for (const seamSegment of seamSegments) {
    for (const leadVariant of leadVariants) {
      const candidate = sanitizeText([leadVariant, seamSegment].filter(Boolean).join(' '), 1_320)
      if (candidate.includes(seamSegment))
        return sanitizeText([candidate, proactiveSameHerGapSpeakingSegment].filter(Boolean).join(' '), 1_320)
    }
  }

  return sanitizeText([leadSegments[0], seamSegments[0], proactiveSameHerGapSpeakingSegment].filter(Boolean).join(' '), 1_320)
}

function strongestMindStatement(
  rows: AlicizationMindStatementSnapshot[] | null | undefined,
) {
  return (rows ?? [])
    .slice()
    .sort((left, right) => right.confidence - left.confidence)[0] ?? null
}

function pickSurfaceText(...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeDialogueSurfaceText(value, 180)
    if (normalized)
      return normalized
  }
  return ''
}

function pickAnchorText(...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeDialogueAnchorText(value, 180)
    if (normalized)
      return normalized
  }
  return ''
}

function deriveExecutionCallbackDoctrineCue(input: {
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  currentRegime?: string | null
}) {
  const runtimeSurface = input.runtimeSurface
  const doctrine = sanitizeText(runtimeSurface?.memory?.autobiographicalSelf?.relationshipDoctrine, 220).toLowerCase()
  const longHorizonCue = sanitizeText(
    runtimeSurface?.memory?.longHorizonMemory?.rememberedConstraintSummary
    || runtimeSurface?.memory?.longHorizonMemory?.rememberedPreferenceSummary
    || runtimeSurface?.memory?.longHorizonMemory?.dominantCueSummary,
    220,
  ).toLowerCase()
  const combined = `${doctrine} ${longHorizonCue}`
  const executionCallbackRegime = input.currentRegime === 'execution-callback'
  const callbackTagged = /execution-callback|execution[^.]{0,48}callback|after execution lands|returned result/u.test(combined)
  if (!callbackTagged && !executionCallbackRegime)
    return null
  if (/leave room|lower-pressure|before closeness widens|boundary|room\b|protect-space|bounded-return|measured-return|reconfirmation|surface fully cools|余韵还在|先留白|别立刻把温度放大|别把温度放大|不要立刻把温度放大/u.test(combined))
    return 'lower-pressure' as const
  if (/trust-warming|trust warmed|soft-handoff|warm trust|bond line/u.test(combined))
    return 'trust-warming' as const
  if (/softly|gentl/u.test(combined))
    return 'lower-pressure' as const
  return 'execution-callback' as const
}

function deriveRememberedSeamReinterpretationCue(input: {
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
}) {
  const runtimeSurface = input.runtimeSurface
  const relationshipDoctrine = sanitizeText(runtimeSurface?.memory?.autobiographicalSelf?.relationshipDoctrine, 220).toLowerCase()
  const latestInflection = sanitizeText(runtimeSurface?.memory?.autobiographicalSelf?.latestInflection, 220).toLowerCase()
  const rememberedConstraint = sanitizeText(runtimeSurface?.memory?.longHorizonMemory?.rememberedConstraintSummary, 220).toLowerCase()
  const rememberedPreference = sanitizeText(runtimeSurface?.memory?.longHorizonMemory?.rememberedPreferenceSummary, 220).toLowerCase()
  const openingDirective = sanitizeText(input.answerCompiler?.openingDirective, 220).toLowerCase()
  const conversationHints = [
    input.conversationState?.jointThread,
    input.conversationState?.relationFrame,
    ...(input.conversationState?.memoryQueryHints ?? []),
    ...(input.conversationState?.narrative ?? []),
  ]
    .map(item => sanitizeText(item, 180).toLowerCase())
    .filter(Boolean)
    .join(' ')

  const continuityText = [
    relationshipDoctrine,
    latestInflection,
    rememberedConstraint,
    rememberedPreference,
    openingDirective,
    conversationHints,
  ].join(' ')

  const rememberedSeamPresent = /remembered seam|same remembered relationship seam|same line|same thread|relationship seam|同一条线|关系线|记住的关系缝|留白/u.test(continuityText)
  if (!rememberedSeamPresent)
    return null

  if (/reopened too eagerly|too eagerly before|more room this time|this time keep more room|这次更要留白|这次要更慢一点|不要重开得太快|上次太急/u.test(continuityText))
    return 'reinterpret-with-more-room' as const

  return null
}

interface AlicizationDialogueEncounterSurface extends Pick<
  AlicizationDialogueTurnEncounterSnapshot,
  'subject' | 'screenReferenceMode' | 'dialogueFirst' | 'summary' | 'taskAnchor' | 'mustRepairFirst' | 'confidence'
> {}

function looksSpecificArtifact(text: string) {
  return /(?:[/\\][\w.-]+)+|[A-Z][A-Za-z0-9]+(?:Controller|Service|Enum|Component|ViewModel|Manager|RespVO|Request|DTO)\b|\b[\w.-]+\.(?:ts|tsx|js|jsx|java|kt|swift|go|rs|py|vue)\b/u.test(text)
}

function looksGenericTechnicalSurface(text: string) {
  return /code|diff|editor|workspace|window|screen|desktop|java code|git commit|intellij|cursor|vscode|ide|代码|编辑器|工作区|窗口|屏幕|桌面|提交差异/iu.test(text)
}

function resolveCenterOfGravity(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  answerCompiler: AlicizationAnswerCompilerSnapshot
  dialogueEncounter?: AlicizationDialogueEncounterSurface | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
}) {
  if (
    input.dialogueEncounter?.mustRepairFirst
    || input.answerCompiler.recommendedAct === 'ask-reground'
    || input.answerCompiler.recommendedAct === 'correct-stale-anchor'
    || input.discourseState.owedAction === 'repair-truth'
  ) {
    return 'repair' as const
  }
  if (input.privateThought?.shouldSpeak === false || input.initiative?.selectedAction === 'wait')
    return 'defer' as const
  if (
    input.answerCompiler.recommendedAct === 'care'
    || input.discourseState.currentTurnSubject === 'host-state'
    || input.privateThought?.stance === 'care'
    || input.privateThought?.stance === 'warn'
  ) {
    return 'care' as const
  }
  if (input.discourseState.currentTurnSubject === 'relationship')
    return 'attune' as const
  if (input.answerCompiler.recommendedAct === 'guide' || input.discourseState.currentTurnSubject === 'task-knot')
    return 'guide' as const
  if (input.discourseState.currentTurnSubject === 'visible-scene')
    return 'witness' as const
  if (input.discourseState.currentTurnSubject === 'alicization-self')
    return 'answer' as const
  return input.answerCompiler.recommendedAct === 'defer' ? 'defer' : 'answer'
}

function resolveTruthDiscipline(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  answerCompiler: AlicizationAnswerCompilerSnapshot
  dialogueEncounter?: AlicizationDialogueEncounterSurface | null
  evidencePhrases: string[]
}) {
  const subject = input.dialogueEncounter?.subject ?? input.discourseState.currentTurnSubject
  const screenTurn = subject === 'task-knot' || subject === 'visible-scene'
  const genericEvidence = input.evidencePhrases.some(text => looksGenericTechnicalSurface(text))
  const specificEvidence = input.evidencePhrases.some(text => looksSpecificArtifact(text))

  if (
    input.dialogueEncounter?.mustRepairFirst
    || input.answerCompiler.recommendedAct === 'ask-reground'
    || input.answerCompiler.recommendedAct === 'correct-stale-anchor'
    || input.discourseState.owedAction === 'repair-truth'
  ) {
    return 'repair-first' as const
  }
  if (
    input.dialogueEncounter?.screenReferenceMode === 'avoid'
    || input.answerCompiler.screenReferenceMode === 'avoid'
    || subject === 'alicization-self'
    || subject === 'relationship'
    || subject === 'host-state'
  ) {
    return 'dialogue-first' as const
  }
  if (input.answerCompiler.evidenceMode === 'continuity-carry' || input.answerCompiler.labelCarryAsMemory) {
    return 'memory-labeled' as const
  }
  if (screenTurn && (input.answerCompiler.evidenceMode === 'coarse-held' || (genericEvidence && !specificEvidence))) {
    return 'observe-then-hypothesize' as const
  }
  if (input.answerCompiler.evidenceMode === 'live-grounded' || input.answerCompiler.evidenceMode === 'live-observed')
    return 'observe-first' as const
  return screenTurn ? 'observe-then-hypothesize' : 'dialogue-first'
}

function resolveConsciousNeed(input: {
  centerOfGravity: AlicizationReplyMotive
  conversationState?: AlicizationConversationStateSnapshot | null
  answerCompiler: AlicizationAnswerCompilerSnapshot
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  dialogueEncounter?: AlicizationDialogueEncounterSurface | null
  primaryAnchor: string | null
  growthProfile: AlicizationDialogueGrowthProfile
  personalityContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
  executionCallbackDoctrineCue?: 'lower-pressure' | 'trust-warming' | 'execution-callback' | null
  rememberedSeamReinterpretationCue?: 'reinterpret-with-more-room' | null
}) {
  if (input.executionCallbackDoctrineCue === 'lower-pressure') {
    return 'conscious_need=execution_callback_return; pressure=lower; host_room=preserve; closeness_widening=false'
  }
  if (input.executionCallbackDoctrineCue === 'trust-warming') {
    return 'conscious_need=execution_callback_return; trust_warming=settle; closeness_widening=rush_blocked'
  }
  if (input.rememberedSeamReinterpretationCue === 'reinterpret-with-more-room') {
    return 'conscious_need=remembered_seam_reinterpretation; room=more; prior_reentry=eager; reopen_same_eagerness=false'
  }
  const surfaceNeed = pickSurfaceText(
    input.conversationState?.owedRepair,
    input.answerCompiler.uncertaintyBoundary,
    input.mindSynthesis?.uncertainties?.[0]?.summary,
    input.dialogueEncounter?.summary,
  )
  switch (input.centerOfGravity) {
    case 'repair':
      return surfaceNeed
        ? `repair_need=steady_seam; around=${lowerFirst(stripTrailingPunctuation(surfaceNeed))}`
        : 'repair_need=steady_seam; surface=structured'
    case 'guide':
      if (input.personalityContinuityState?.currentRegime === 'execution-callback') {
        return 'guide_need=land_execution_callback; callback_sprawl=false; second_reality=false'
      }
      return pickSurfaceText(
        input.primaryAnchor,
        input.conversationState?.unansweredQuestion,
        input.conversationState?.activeCommitments?.[0],
        input.answerCompiler.nextMove,
        input.mindSynthesis?.commitments?.[0]?.summary,
      )
        ? `guide_need=active_knot; anchor=${lowerFirst(stripTrailingPunctuation(pickSurfaceText(
          input.primaryAnchor,
          input.conversationState?.unansweredQuestion,
          input.conversationState?.activeCommitments?.[0],
          input.answerCompiler.nextMove,
          input.mindSynthesis?.commitments?.[0]?.summary,
        )))}.`
        : 'guide_need=active_knot; speech_around_it=false; surface=structured'
    case 'care':
      if (
        input.personalityContinuityState?.currentRegime === 'focused-work'
        && input.personalityContinuityState.autonomyPosture === 'protect-space'
      ) {
        return 'care_need=host_present_state; working_space=crowd_blocked; posture=protect_space'
      }
      return pickSurfaceText(
        input.primaryAnchor,
        input.answerCompiler.careVector,
        input.conversationState?.hostMove,
        input.mindSynthesis?.concerns?.[0]?.summary,
      )
        ? `care_need=stay_close_to; anchor=${lowerFirst(stripTrailingPunctuation(pickSurfaceText(
          input.primaryAnchor,
          input.answerCompiler.careVector,
          input.conversationState?.hostMove,
          input.mindSynthesis?.concerns?.[0]?.summary,
        )))}.`
        : input.growthProfile.companionshipStyle === 'close-hold'
          ? 'care_need=present_but_room_giving; room=breathe; surface=structured'
          : input.growthProfile.autonomyRespect >= 0.58
            ? 'care_need=host_present_state; pressure=not_too_hard; surface=structured'
            : 'care_need=host_present_state; drift=blocked; surface=structured'
    case 'attune':
    case 'answer':
      return pickSurfaceText(
        input.primaryAnchor,
        input.conversationState?.hostMove,
        input.dialogueEncounter?.summary,
        input.answerCompiler.openingClaim,
      )
        ? `answer_need=live_dialogue_center; anchor=${lowerFirst(stripTrailingPunctuation(pickSurfaceText(
          input.primaryAnchor,
          input.conversationState?.hostMove,
          input.dialogueEncounter?.summary,
          input.answerCompiler.openingClaim,
        )))}.`
        : 'answer_need=live_dialogue_subject; surface=structured'
    case 'witness':
      return pickSurfaceText(
        input.answerCompiler.supportingReality?.[0],
        input.answerCompiler.openingClaim,
        input.dialogueEncounter?.summary,
      )
        ? `witness_need=visible_first; anchor=${lowerFirst(stripTrailingPunctuation(pickSurfaceText(
          input.answerCompiler.supportingReality?.[0],
          input.answerCompiler.openingClaim,
          input.dialogueEncounter?.summary,
        )))}.`
        : 'witness_need=visible_first; wider_story=deferred; surface=structured'
    default:
      return 'conscious_need=small_true_turn; flooding=false; surface=structured'
  }
}

function resolveSpeakingIntention(input: {
  truthDiscipline: AlicizationCurrentConsciousFrameSnapshot['truthDiscipline']
  centerOfGravity: AlicizationReplyMotive
  answerCompiler: AlicizationAnswerCompilerSnapshot
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
  growthProfile: AlicizationDialogueGrowthProfile
}) {
  if (input.truthDiscipline === 'repair-first') {
    return input.growthProfile.repairGentleness >= 0.58
      ? 'speaking_intention=revision; style=clean_gentle; correctness_only=false'
      : input.growthProfile.irritability >= 0.58
        ? 'speaking_intention=revision_first; tension_sharpening=blocked'
        : 'speaking_intention=revision_first; cleverness_after_truth=true'
  }
  if (input.truthDiscipline === 'observe-then-hypothesize')
    return 'speaking_intention=observe_then_hypothesize; beyond_visible=guess_labeled'
  if (input.truthDiscipline === 'memory-labeled')
    return 'speaking_intention=memory_labeled; continuity_as=current_perception:false'
  if (input.truthDiscipline === 'dialogue-first') {
    return input.growthProfile.companionshipStyle === 'close-hold'
      ? 'speaking_intention=dialogue_first; presence=close_hold; crowd_host=false'
      : input.growthProfile.autonomyRespect >= 0.58
        ? 'speaking_intention=dialogue_first; closeness=crowd_blocked'
        : 'speaking_intention=dialogue_first; screen_context=secondary; old_carry=secondary'
  }
  if (input.centerOfGravity === 'guide') {
    return input.growthProfile.unfinishedThreadReturn >= 0.58
      ? 'speaking_intention=active_knot; thread_slack=false; payoff=before_widening'
      : 'speaking_intention=active_knot; next_step=honest_resolution'
  }

  return pickSurfaceText(
    input.mindSynthesis?.openingIntent,
    input.answerCompiler.openingDirective,
    input.privateThought?.thoughtText,
    input.initiative?.why,
  ) || 'I want the reply to come from the present center of gravity instead of default helpfulness.'
}

function buildProjectStateConsciousFrameGrounding(input?: {
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}): AlicizationProjectStateConsciousFrameGrounding {
  const rawConsciousFrameProjectState = input?.runtimeSurface?.dialogue?.currentConsciousFrame?.projectState ?? null
  const rawDialogueRuntimeDigestProjectState = input?.runtimeSurface?.dialogue?.runtimeDigest?.projectState ?? null
  const rawRuntimeDigestProjectState = input?.runtimeSurface?.raw?.runtimeDigest?.projectState ?? null
  const rawCognitionRuntimeDigestProjectState = input?.runtimeSurface?.cognition?.runtimeDigest?.projectState ?? null
  const rawRuntimeStateProjectState = (input?.runtimeSurface as { runtimeState?: { projectState?: unknown } | null } | null | undefined)?.runtimeState?.projectState ?? null
  const runtimeSameHerEmbodimentCarryAdvice = hasRuntimeSameHerEmbodimentCarryAdvice(input?.runtimeSurface ?? null)
  const runtimeSameHerMemoryCarryAdvice = hasRuntimeSameHerMemoryCarryAdvice(input?.runtimeSurface ?? null)
  const runtimeSameHerEmotionalCarryAdvice = hasRuntimeSameHerEmotionalCarryAdvice(input?.runtimeSurface ?? null)
  const preferredRuntimeProjectState: Partial<AlicizationCurrentConsciousProjectState & AlicizationSurfaceProjectStateSnapshot> | null = (
    rawConsciousFrameProjectState
    ?? rawDialogueRuntimeDigestProjectState
    ?? rawRuntimeDigestProjectState
    ?? rawCognitionRuntimeDigestProjectState
    ?? rawRuntimeStateProjectState
    ?? null
  ) as Partial<AlicizationCurrentConsciousProjectState & AlicizationSurfaceProjectStateSnapshot> | null
  const summaryAliasRuntimeProjectState = preferredRuntimeProjectState as {
    landedProgressSummary?: unknown
    openClosureSummary?: unknown
    nextClosureTargetSummary?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null
  const callbackFollowUpAffordance = input?.runtimeSurface?.memory?.memoryDeliberation?.followUpAffordance ?? null
  const projectStateSnapshot = resolveAlicizationProjectStateSnapshot()
  const projectState: AlicizationSurfaceProjectStateSnapshot = input?.runtimeSurface
    ? resolveAlicizationSurfaceProjectStateSnapshot({
        runtimeSurface: input.runtimeSurface,
      })
    : {
        ...projectStateSnapshot,
        continuityRestraint: projectStateSnapshot.continuityRestraint ?? null,
        continuityPreferredTiming: null,
        continuityCadence: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
      }
  const explicitLatestProgressInput = pickConsciousFrameProjectFact(
    220,
    (typeof preferredRuntimeProjectState?.latestLandedProgress === 'string' ? preferredRuntimeProjectState.latestLandedProgress : null)
    ?? null,
    (typeof preferredRuntimeProjectState?.latestProgress === 'string' ? preferredRuntimeProjectState.latestProgress : null)
    ?? null,
  )
  const summaryLatestProgressInput = sanitizeConsciousFrameProjectFact(summaryAliasRuntimeProjectState?.landedProgressSummary, 220)
  const explicitPrimaryOpenLoopInput = pickConsciousFrameProjectFact(
    160,
    (typeof preferredRuntimeProjectState?.primaryOpenLoop === 'string' ? preferredRuntimeProjectState.primaryOpenLoop : null)
    ?? null,
  )
  const summaryPrimaryOpenLoopInput = sanitizeConsciousFrameProjectFact(summaryAliasRuntimeProjectState?.openClosureSummary, 160)
  const explicitNextClosureTargetInput = pickConsciousFrameProjectFact(
    420,
    (typeof preferredRuntimeProjectState?.nextClosureTarget === 'string' ? preferredRuntimeProjectState.nextClosureTarget : null)
    ?? null,
  )
  const summaryNextClosureTargetInput = sanitizeConsciousFrameProjectFact(summaryAliasRuntimeProjectState?.nextClosureTargetSummary, 420)
  const explicitSameHerDriftRiskInput = pickConsciousFrameProjectFact(
    220,
    (typeof preferredRuntimeProjectState?.sameHerDriftRisk === 'string' ? preferredRuntimeProjectState.sameHerDriftRisk : null)
    ?? null,
  )
  const summarySameHerDriftRiskInput = sanitizeConsciousFrameProjectFact(summaryAliasRuntimeProjectState?.sameHerDriftRiskSummary, 220)
  const explicitProactiveSameHerGapInput = pickConsciousFrameProjectFact(
    220,
    (typeof preferredRuntimeProjectState?.proactiveSameHerGap === 'string' ? preferredRuntimeProjectState.proactiveSameHerGap : null)
    ?? null,
  )
  const summaryProactiveSameHerGapInput = sanitizeConsciousFrameProjectFact(
    (summaryAliasRuntimeProjectState as { proactiveSameHerGapSummary?: unknown } | null)?.proactiveSameHerGapSummary,
    220,
  )
  const liveLatestProgressInput = sanitizeText(
    explicitLatestProgressInput || summaryLatestProgressInput,
    220,
  )
  const livePrimaryOpenLoopInput = sanitizeText(
    explicitPrimaryOpenLoopInput || summaryPrimaryOpenLoopInput,
    160,
  )
  const liveNextClosureTargetInput = sanitizeText(
    explicitNextClosureTargetInput || summaryNextClosureTargetInput,
    420,
  )
  const liveSameHerDriftRiskInput = sanitizeText(
    explicitSameHerDriftRiskInput || summarySameHerDriftRiskInput,
    220,
  )
  const liveProactiveSameHerGapInput = sanitizeText(
    explicitProactiveSameHerGapInput || summaryProactiveSameHerGapInput,
    220,
  )
  const normalizedProjectState = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: preferredRuntimeProjectState
      ? {
          ...preferredRuntimeProjectState,
          latestLandedProgress: liveLatestProgressInput || null,
          primaryOpenLoop: livePrimaryOpenLoopInput || null,
          nextClosureTarget: liveNextClosureTargetInput || null,
          sameHerDriftRisk: liveSameHerDriftRiskInput || null,
          proactiveSameHerGap: liveProactiveSameHerGapInput || null,
        }
      : null,
  })
  const surfaceProjectState = projectState
  const preferredRuntimeAwarenessSeed
    = (typeof preferredRuntimeProjectState?.preDialogueAwarenessLine === 'string' ? preferredRuntimeProjectState.preDialogueAwarenessLine : null)
      ?? (typeof preferredRuntimeProjectState?.awarenessLine === 'string' ? preferredRuntimeProjectState.awarenessLine : null)
      ?? surfaceProjectState.preDialogueAwarenessLine
      ?? surfaceProjectState.awarenessLine
      ?? null
  const preferredRuntimeSameHerHeadlineFallback = looksLikeThinProjectAwarenessSeed(preferredRuntimeAwarenessSeed)
    ? (
        (typeof preferredRuntimeProjectState?.sameHerSelfLine === 'string' ? preferredRuntimeProjectState.sameHerSelfLine : null)
        ?? projectState.sameHerSelfLine
        ?? null
      )
    : null
  const preferredRuntimeCompanionHeadline
    = (typeof preferredRuntimeProjectState?.companionHeadlineLine === 'string' ? preferredRuntimeProjectState.companionHeadlineLine : null)
      ?? surfaceProjectState.companionHeadlineLine
      ?? preferredRuntimeSameHerHeadlineFallback
      ?? null
  const fallbackLatestProgress = sanitizeText(
    normalizedProjectState.latestLandedProgress
    ?? normalizedProjectState.latestProgress
    ?? '',
    220,
  )
  const fallbackPrimaryOpenLoop = sanitizeText(normalizedProjectState.primaryOpenLoop ?? '', 160)
  const fallbackNextClosureTarget = sanitizeText(normalizedProjectState.nextClosureTarget ?? '', 420)
  const canonicalBriefNextClosureTarget = sanitizeText(projectStateSnapshot.nextClosureTarget ?? '', 420)
  const preferredSurfaceNextClosureTarget = sanitizeText(
    extractProjectStateSummarySegment({
      explicitValue: surfaceProjectState.nextClosureTarget ?? null,
      summaryLine:
        surfaceProjectState.preDialogueAwarenessSummary
        ?? surfaceProjectState.preflightSummary
        ?? projectState.preDialogueAwarenessLine
        ?? projectState.preflightSummary
        ?? null,
      key: 'next',
      maxLength: 420,
    }) ?? '',
    420,
  )
  const preferredRuntimeLatestProgress = liveLatestProgressInput
  const preferredRuntimePrimaryOpenLoop = livePrimaryOpenLoopInput
  const preferredRuntimeNextClosureTarget = liveNextClosureTargetInput
  const preferredRuntimeNextClosureTargetLooksThin
    = Boolean(preferredRuntimeNextClosureTarget)
      && looksLikeThinProjectStateClosureCarry({
        value: preferredRuntimeNextClosureTarget,
        key: 'next',
      })
  const fallbackNextClosureTargetLooksThin
    = Boolean(fallbackNextClosureTarget)
      && looksLikeThinProjectStateClosureCarry({
        value: fallbackNextClosureTarget,
        key: 'next',
      })
  const preferredSurfaceNextClosureTargetLooksThin
    = Boolean(preferredSurfaceNextClosureTarget)
      && looksLikeThinProjectStateClosureCarry({
        value: preferredSurfaceNextClosureTarget,
        key: 'next',
      })
  const canonicalBriefNextClosureTargetLooksThin
    = Boolean(canonicalBriefNextClosureTarget)
      && looksLikeThinProjectStateClosureCarry({
        value: canonicalBriefNextClosureTarget,
        key: 'next',
      })
  const resolvedLatestProgressExplicitValue
    = preferredRuntimeLatestProgress
      && fallbackLatestProgress
      && looksLikeThinProjectStateClosureCarry({
        value: preferredRuntimeLatestProgress,
        key: 'landed',
      })
      ? fallbackLatestProgress
      : preferredRuntimeLatestProgress
  const resolvedPrimaryOpenLoopExplicitValue
    = preferredRuntimePrimaryOpenLoop
      && fallbackPrimaryOpenLoop
      && looksLikeThinProjectStateClosureCarry({
        value: preferredRuntimePrimaryOpenLoop,
        key: 'open',
      })
      ? fallbackPrimaryOpenLoop
      : preferredRuntimePrimaryOpenLoop
  const resolvedNextClosureTargetExplicitValue
    = preferredRuntimeNextClosureTargetLooksThin
      ? (
          fallbackNextClosureTarget && !fallbackNextClosureTargetLooksThin
            ? fallbackNextClosureTarget
            : preferredSurfaceNextClosureTarget && !preferredSurfaceNextClosureTargetLooksThin
              ? preferredSurfaceNextClosureTarget
              : canonicalBriefNextClosureTarget && !canonicalBriefNextClosureTargetLooksThin
                ? canonicalBriefNextClosureTarget
                : preferredRuntimeNextClosureTarget
        )
      : preferredRuntimeNextClosureTarget
  const resolvedSameHerSelfLine = preferProjectStateSameHerSelfLine({
    runtime: typeof preferredRuntimeProjectState?.sameHerSelfLine === 'string' ? preferredRuntimeProjectState.sameHerSelfLine : null,
    surface: surfaceProjectState.sameHerSelfLine ?? null,
    fallback: projectStateSnapshot.sameHerSelfLine ?? null,
  })
  const resolvedSameHerDriftRisk = sanitizeText(preferStrongerSameHerDriftRisk({
    current: liveSameHerDriftRiskInput || null,
    candidate:
      deriveLongHorizonProjectSameHerDriftRisk(input?.runtimeSurface)
      ?? surfaceProjectState.sameHerDriftRisk
      ?? projectState.sameHerDriftRisk
      ?? null,
    fallback: projectState.sameHerDriftRisk,
  }), 220)
  const explicitAwarenessContinuityCue = pickPreferredProjectStateField(
    220,
    (rawConsciousFrameProjectState as { continuityCue?: unknown } | null)?.continuityCue,
    (rawDialogueRuntimeDigestProjectState as { continuityCue?: unknown } | null)?.continuityCue,
    (rawRuntimeDigestProjectState as { continuityCue?: unknown } | null)?.continuityCue,
    (rawCognitionRuntimeDigestProjectState as { continuityCue?: unknown } | null)?.continuityCue,
    (rawRuntimeStateProjectState as { continuityCue?: unknown } | null)?.continuityCue,
  )
  const explicitAwarenessContinuityRestraint = pickPreferredProjectStateField(
    64,
    (rawConsciousFrameProjectState as { continuityRestraint?: unknown } | null)?.continuityRestraint,
    (rawDialogueRuntimeDigestProjectState as { continuityRestraint?: unknown } | null)?.continuityRestraint,
    (rawRuntimeDigestProjectState as { continuityRestraint?: unknown } | null)?.continuityRestraint,
    (rawCognitionRuntimeDigestProjectState as { continuityRestraint?: unknown } | null)?.continuityRestraint,
    (rawRuntimeStateProjectState as { continuityRestraint?: unknown } | null)?.continuityRestraint,
  )
  const explicitAwarenessContinuityCadence = pickPreferredProjectStateField(
    120,
    (rawConsciousFrameProjectState as { continuityCadence?: unknown } | null)?.continuityCadence,
    (rawDialogueRuntimeDigestProjectState as { continuityCadence?: unknown } | null)?.continuityCadence,
    (rawRuntimeDigestProjectState as { continuityCadence?: unknown } | null)?.continuityCadence,
    (rawCognitionRuntimeDigestProjectState as { continuityCadence?: unknown } | null)?.continuityCadence,
    (rawRuntimeStateProjectState as { continuityCadence?: unknown } | null)?.continuityCadence,
  )
  const explicitAwarenessSameHerHoldDetail = pickPreferredProjectStateField(
    220,
    (rawConsciousFrameProjectState as { sameHerHoldDetail?: unknown } | null)?.sameHerHoldDetail,
    (rawDialogueRuntimeDigestProjectState as { sameHerHoldDetail?: unknown } | null)?.sameHerHoldDetail,
    (rawRuntimeDigestProjectState as { sameHerHoldDetail?: unknown } | null)?.sameHerHoldDetail,
    (rawCognitionRuntimeDigestProjectState as { sameHerHoldDetail?: unknown } | null)?.sameHerHoldDetail,
    (rawRuntimeStateProjectState as { sameHerHoldDetail?: unknown } | null)?.sameHerHoldDetail,
  )
  const continuityCue = pickPreferredProjectStateField(
    220,
    (rawConsciousFrameProjectState as { continuityCue?: unknown } | null)?.continuityCue,
    (rawDialogueRuntimeDigestProjectState as { continuityCue?: unknown } | null)?.continuityCue,
    (rawRuntimeDigestProjectState as { continuityCue?: unknown } | null)?.continuityCue,
    (rawCognitionRuntimeDigestProjectState as { continuityCue?: unknown } | null)?.continuityCue,
    (rawRuntimeStateProjectState as { continuityCue?: unknown } | null)?.continuityCue,
    (projectState as { continuityCue?: unknown }).continuityCue,
  )
  const runtimeSameHerEmbodimentHoldDetail = runtimeSameHerEmbodimentCarryAdvice
    ? 'runtime embodiment repair keeps body expression repair-before-closeness before the memory line widens again.'
    : ''
  const runtimeSameHerEmbodimentContinuityCue = runtimeSameHerEmbodimentCarryAdvice
    ? 'embodied_continuity=repair_before_closeness; memory_embodiment_rejoin=before_outward_widening; surface=structured'
    : ''
  const runtimeSameHerEmotionalClosureCue = runtimeSameHerEmotionalCarryAdvice
    ? 'emotional closure: keep callback afterglow and emotional residue low-pressure until repair settles.'
    : ''
  const runtimeSameHerEmotionalClosureSummary = runtimeSameHerEmotionalCarryAdvice
    ? 'emotional closure keeps callback afterglow, emotional residue, and repair-before-closeness until repair settles.'
    : ''
  const runtimeSameHerMemoryClosureSummary = runtimeSameHerMemoryCarryAdvice
    ? 'memory closure: explain why recall surfaced now and keep memory tied to initiative/execution, emotion, and embodiment.'
    : ''
  const shouldDeriveContinuityCarryFromBehavior
    = !explicitAwarenessSameHerHoldDetail
      && !explicitAwarenessContinuityCue
  const behaviorDerivedContinuityCarry = shouldDeriveContinuityCarryFromBehavior
    ? resolveEffectiveProjectStateContinuityCarry({
        continuityRestraint:
          explicitAwarenessContinuityRestraint
          || (runtimeSameHerEmotionalCarryAdvice ? 'repair-before-closeness' : null)
          || (runtimeSameHerEmbodimentCarryAdvice ? 'repair-before-closeness' : null)
          || preferredRuntimeProjectState?.continuityRestraint
          || surfaceProjectState.continuityRestraint
          || normalizedProjectState.continuityRestraint
          || projectState.continuityRestraint,
        continuityCadence:
          explicitAwarenessContinuityCadence
          || (runtimeSameHerMemoryCarryAdvice ? 'measured-return' : null)
          || (runtimeSameHerEmotionalCarryAdvice ? 'repair-before-closeness' : null)
          || (runtimeSameHerEmbodimentCarryAdvice ? 'repair-before-closeness' : null)
          || preferredRuntimeProjectState?.continuityCadence
          || surfaceProjectState.continuityCadence
          || normalizedProjectState.continuityCadence
          || projectState.continuityCadence,
        preferredPauseMode:
          (typeof preferredRuntimeProjectState?.preferredPauseMode === 'string' ? preferredRuntimeProjectState.preferredPauseMode : null)
          || surfaceProjectState.preferredPauseMode
          || normalizedProjectState.preferredPauseMode
          || projectState.preferredPauseMode,
        preferredLipsyncMode:
          (typeof preferredRuntimeProjectState?.preferredLipsyncMode === 'string' ? preferredRuntimeProjectState.preferredLipsyncMode : null)
          || surfaceProjectState.preferredLipsyncMode
          || normalizedProjectState.preferredLipsyncMode
          || projectState.preferredLipsyncMode,
        preferredVoiceMode:
          (typeof preferredRuntimeProjectState?.preferredVoiceMode === 'string' ? preferredRuntimeProjectState.preferredVoiceMode : null)
          || surfaceProjectState.preferredVoiceMode
          || normalizedProjectState.preferredVoiceMode
          || projectState.preferredVoiceMode,
        preferredPacingMode:
          (typeof preferredRuntimeProjectState?.preferredPacingMode === 'string' ? preferredRuntimeProjectState.preferredPacingMode : null)
          || surfaceProjectState.preferredPacingMode
          || normalizedProjectState.preferredPacingMode
          || projectState.preferredPacingMode,
      })
    : {
        sameHerHoldDetail: '',
        continuityCue: '',
      }
  const sameHerHoldDetailForAwareness = sanitizeText(
    explicitAwarenessSameHerHoldDetail
    || runtimeSameHerEmbodimentHoldDetail
    || behaviorDerivedContinuityCarry.sameHerHoldDetail
    || projectState.sameHerHoldDetail
    || '',
    220,
  )
  const continuityCueForAwareness = sanitizeText(
    explicitAwarenessContinuityCue
    || (!sameHerHoldDetailForAwareness
      ? runtimeSameHerEmbodimentContinuityCue
      : '')
    || (!sameHerHoldDetailForAwareness
      ? behaviorDerivedContinuityCarry.continuityCue || continuityCue
      : '')
    || '',
    220,
  )
  const resolvedContinuityCue = sanitizeText(
    explicitAwarenessContinuityCue
    || runtimeSameHerEmbodimentContinuityCue
    || behaviorDerivedContinuityCarry.continuityCue
    || continuityCue
    || '',
    220,
  )
  const resolvedSameHerHoldDetailForAwareness = resolveProjectStateConsciousHoldDetail({
    sameHerHoldDetail: sameHerHoldDetailForAwareness,
    continuityCue: continuityCueForAwareness,
  })
  const resolvedPreDialogueAwarenessLine = sanitizeText(resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      identity:
        (typeof preferredRuntimeProjectState?.identity === 'string' ? preferredRuntimeProjectState.identity : null)
        ?? surfaceProjectState.identity
        ?? null,
      currentPhase:
        (typeof preferredRuntimeProjectState?.currentPhase === 'string' ? preferredRuntimeProjectState.currentPhase : null)
        ?? surfaceProjectState.currentPhase
        ?? null,
      latestLandedProgress: resolvedLatestProgressExplicitValue || null,
      latestProgress: resolvedLatestProgressExplicitValue || null,
      primaryOpenLoop: resolvedPrimaryOpenLoopExplicitValue || null,
      nextClosureTarget: resolvedNextClosureTargetExplicitValue || null,
      preDialogueAwarenessSummary:
        (typeof preferredRuntimeProjectState?.preDialogueAwarenessSummary === 'string' ? preferredRuntimeProjectState.preDialogueAwarenessSummary : null)
        ?? surfaceProjectState.preDialogueAwarenessSummary
        ?? null,
      sameHerSelfLine: resolvedSameHerSelfLine || null,
      sameHerHoldDetail: resolvedSameHerHoldDetailForAwareness || null,
      continuityCue: continuityCueForAwareness || null,
      continuityRestraint:
        (typeof preferredRuntimeProjectState?.continuityRestraint === 'string' ? preferredRuntimeProjectState.continuityRestraint : null)
        ?? surfaceProjectState.continuityRestraint
        ?? null,
      continuityCadence:
        (typeof preferredRuntimeProjectState?.continuityCadence === 'string' ? preferredRuntimeProjectState.continuityCadence : null)
        ?? surfaceProjectState.continuityCadence
        ?? null,
      preferredPauseMode:
        (typeof preferredRuntimeProjectState?.preferredPauseMode === 'string' ? preferredRuntimeProjectState.preferredPauseMode : null)
        ?? surfaceProjectState.preferredPauseMode
        ?? null,
      preferredLipsyncMode:
        (typeof preferredRuntimeProjectState?.preferredLipsyncMode === 'string' ? preferredRuntimeProjectState.preferredLipsyncMode : null)
        ?? surfaceProjectState.preferredLipsyncMode
        ?? null,
      preferredVoiceMode:
        (typeof preferredRuntimeProjectState?.preferredVoiceMode === 'string' ? preferredRuntimeProjectState.preferredVoiceMode : null)
        ?? surfaceProjectState.preferredVoiceMode
        ?? null,
      preferredPacingMode:
        (typeof preferredRuntimeProjectState?.preferredPacingMode === 'string' ? preferredRuntimeProjectState.preferredPacingMode : null)
        ?? surfaceProjectState.preferredPacingMode
        ?? null,
      sameHerDriftRiskSummary: resolvedSameHerDriftRisk || null,
      companionHeadlineLine: preferredRuntimeCompanionHeadline,
      preDialogueAwarenessLine:
        (typeof preferredRuntimeProjectState?.preDialogueAwarenessLine === 'string' ? preferredRuntimeProjectState.preDialogueAwarenessLine : null)
        ?? surfaceProjectState.preDialogueAwarenessLine
        ?? null,
      awarenessLine:
        (typeof preferredRuntimeProjectState?.awarenessLine === 'string' ? preferredRuntimeProjectState.awarenessLine : null)
        ?? surfaceProjectState.awarenessLine
        ?? null,
      companionBriefingLine:
        (typeof preferredRuntimeProjectState?.companionBriefingLine === 'string' ? preferredRuntimeProjectState.companionBriefingLine : null)
        ?? surfaceProjectState.companionBriefingLine
        ?? null,
      preflightSummary:
        (typeof preferredRuntimeProjectState?.preflightSummary === 'string' ? preferredRuntimeProjectState.preflightSummary : null)
        ?? surfaceProjectState.preflightSummary
        ?? null,
    },
    fallbackProjectState: {
      preDialogueAwarenessSummary:
        (typeof preferredRuntimeProjectState?.preDialogueAwarenessSummary === 'string' ? preferredRuntimeProjectState.preDialogueAwarenessSummary : null)
        ?? projectState.preflightSummary
        ?? null,
      sameHerSelfLine: resolvedSameHerSelfLine || null,
      sameHerHoldDetail: resolvedSameHerHoldDetailForAwareness || null,
      continuityCue: continuityCueForAwareness || null,
      continuityRestraint:
        (typeof preferredRuntimeProjectState?.continuityRestraint === 'string' ? preferredRuntimeProjectState.continuityRestraint : null)
        ?? projectState.continuityRestraint
        ?? null,
      continuityCadence:
        (typeof preferredRuntimeProjectState?.continuityCadence === 'string' ? preferredRuntimeProjectState.continuityCadence : null)
        ?? projectState.continuityCadence
        ?? null,
      preferredPauseMode:
        (typeof preferredRuntimeProjectState?.preferredPauseMode === 'string' ? preferredRuntimeProjectState.preferredPauseMode : null)
        ?? surfaceProjectState.preferredPauseMode
        ?? projectState.preferredPauseMode
        ?? null,
      preferredLipsyncMode:
        (typeof preferredRuntimeProjectState?.preferredLipsyncMode === 'string' ? preferredRuntimeProjectState.preferredLipsyncMode : null)
        ?? surfaceProjectState.preferredLipsyncMode
        ?? projectState.preferredLipsyncMode
        ?? null,
      preferredVoiceMode:
        (typeof preferredRuntimeProjectState?.preferredVoiceMode === 'string' ? preferredRuntimeProjectState.preferredVoiceMode : null)
        ?? surfaceProjectState.preferredVoiceMode
        ?? projectState.preferredVoiceMode
        ?? null,
      preferredPacingMode:
        (typeof preferredRuntimeProjectState?.preferredPacingMode === 'string' ? preferredRuntimeProjectState.preferredPacingMode : null)
        ?? surfaceProjectState.preferredPacingMode
        ?? projectState.preferredPacingMode
        ?? null,
      sameHerDriftRiskSummary: resolvedSameHerDriftRisk || null,
      companionHeadlineLine: preferredRuntimeCompanionHeadline,
      preDialogueAwarenessLine:
        (typeof preferredRuntimeProjectState?.preDialogueAwarenessLine === 'string' ? preferredRuntimeProjectState.preDialogueAwarenessLine : null)
        ?? projectState.preDialogueAwarenessLine
        ?? null,
      awarenessLine:
        (typeof preferredRuntimeProjectState?.awarenessLine === 'string' ? preferredRuntimeProjectState.awarenessLine : null)
        ?? projectState.preDialogueAwarenessLine
        ?? null,
      companionBriefingLine:
        (typeof preferredRuntimeProjectState?.companionBriefingLine === 'string' ? preferredRuntimeProjectState.companionBriefingLine : null)
        ?? surfaceProjectState.companionBriefingLine
        ?? null,
      preflightSummary:
        (typeof preferredRuntimeProjectState?.preflightSummary === 'string' ? preferredRuntimeProjectState.preflightSummary : null)
        ?? projectState.preflightSummary
        ?? null,
    },
  }) ?? '', 1600)
  const compactSameHerInwardLowPressureAwarenessLine = (
    looksLikeThinProjectAwarenessSeed(preferredRuntimeAwarenessSeed)
    && resolvedSameHerSelfLine
    && isSameHerInwardLowPressureCompanionHeadline(preferredRuntimeCompanionHeadline)
  )
    ? buildCompactSameHerInwardLowPressureAwarenessLine(resolvedSameHerSelfLine)
    : ''
  const richerStructuredProjectAwareOpening = ''
  const resolvedPreDialogueAwarenessLineCarriesProjectFacts
    = /(?:^|\|\s*)(?:identity|phase|landed|open|next)=/iu.test(resolvedPreDialogueAwarenessLine)
  const preferredCadenceAwareHoldAwarenessLine = (
    looksLikeThinProjectAwarenessSeed(preferredRuntimeAwarenessSeed)
    && isCadenceAwareSameHerHoldAwarenessLine(resolvedSameHerHoldDetailForAwareness)
  )
    ? resolvedSameHerHoldDetailForAwareness
    : ''
  const preDialogueAwarenessLine = (
    richerStructuredProjectAwareOpening
    && (
      !resolvedPreDialogueAwarenessLine
      || looksLikeThinProjectAwarenessSeed(resolvedPreDialogueAwarenessLine)
      || looksLikeNarrowSameHerHoldAwarenessLine(resolvedPreDialogueAwarenessLine)
    )
  )
    ? richerStructuredProjectAwareOpening
    : resolvedPreDialogueAwarenessLineCarriesProjectFacts
      ? resolvedPreDialogueAwarenessLine
      : preferredCadenceAwareHoldAwarenessLine || ((
        looksLikeThinProjectAwarenessSeed(resolvedPreDialogueAwarenessLine)
        && resolvedSameHerSelfLine
      )
        ? resolvedSameHerSelfLine
        : compactSameHerInwardLowPressureAwarenessLine || ((
          richerStructuredProjectAwareOpening
          && preferredRuntimeCompanionHeadline
          && /holding together mainly through|voice|face|motion|cross-modal|one living her/iu.test(preferredRuntimeCompanionHeadline)
        )
          ? richerStructuredProjectAwareOpening
          : resolvedPreDialogueAwarenessLine))
  const preferredRuntimePreflightSummary = sanitizeText(
    typeof preferredRuntimeProjectState?.preflightSummary === 'string'
      ? preferredRuntimeProjectState.preflightSummary
      : '',
    320,
  )
  const resolvedPreflightSummaryCandidate = (
    preferredRuntimePreflightSummary
    && !looksLikeThinProjectPreflightSeed(preferredRuntimePreflightSummary)
  )
    ? preferredRuntimePreflightSummary
    : sanitizeText(projectState.preflightSummary ?? '', 320)
      || preferredRuntimePreflightSummary
      || ''
  const sanitizedPreflightSummary = sanitizeAlicizationProviderFacingText(resolvedPreflightSummaryCandidate, 320)
  const resolvedPreflightSummary = sanitizedPreflightSummary === alicizationFixedTemplateReplacement
    ? alicizationFixedTemplateReplacement
    : sanitizedPreflightSummary
  const longHorizonProjectCadence = deriveLongHorizonPreferredProjectCadence(input?.runtimeSurface ?? null)
  const preferRuntimeDriftRiskLifeLoopGap
    = Boolean(preferredRuntimeProjectState)
      && !livePrimaryOpenLoopInput
      && !liveNextClosureTargetInput
      && Boolean(liveSameHerDriftRiskInput)

  return {
    hasExplicitRuntimeProjectState: Boolean(preferredRuntimeProjectState),
    preferRuntimeDriftRiskLifeLoopGap,
    preflightSummary: resolvedPreflightSummary,
    preDialogueAwarenessLine,
    projectIdentity: pickConsciousFrameProjectFact(
      220,
      (typeof preferredRuntimeProjectState?.identity === 'string' ? preferredRuntimeProjectState.identity : null)
      ?? null,
      projectState.identity,
    ),
    currentPhase: pickConsciousFrameProjectFact(
      120,
      (typeof preferredRuntimeProjectState?.currentPhase === 'string' ? preferredRuntimeProjectState.currentPhase : null)
      ?? null,
      projectState.currentPhase,
    ),
    latestProgress: sanitizeText(
      (!explicitLatestProgressInput && summaryLatestProgressInput)
        ? summaryLatestProgressInput
        : (
            extractProjectStateSummarySegment({
              explicitValue:
                resolvedLatestProgressExplicitValue
                || fallbackLatestProgress
                || null,
              summaryLine:
                (typeof preferredRuntimeProjectState?.preDialogueAwarenessSummary === 'string' ? preferredRuntimeProjectState.preDialogueAwarenessSummary : null)
                ?? (typeof preferredRuntimeProjectState?.preflightSummary === 'string' ? preferredRuntimeProjectState.preflightSummary : null)
                ?? surfaceProjectState.preDialogueAwarenessSummary
                ?? surfaceProjectState.preflightSummary
                ?? projectState.preDialogueAwarenessLine
                ?? projectState.preflightSummary
                ?? null,
              key: 'landed',
              maxLength: 220,
            }) ?? ''
          ),
      220,
    ),
    primaryOpenLoop: sanitizeText(
      (!explicitPrimaryOpenLoopInput && summaryPrimaryOpenLoopInput)
        ? summaryPrimaryOpenLoopInput
        : (
            extractProjectStateSummarySegment({
              explicitValue: resolvedPrimaryOpenLoopExplicitValue || fallbackPrimaryOpenLoop || null,
              summaryLine:
                (typeof preferredRuntimeProjectState?.preDialogueAwarenessSummary === 'string' ? preferredRuntimeProjectState.preDialogueAwarenessSummary : null)
                ?? (typeof preferredRuntimeProjectState?.preflightSummary === 'string' ? preferredRuntimeProjectState.preflightSummary : null)
                ?? surfaceProjectState.preDialogueAwarenessSummary
                ?? surfaceProjectState.preflightSummary
                ?? projectState.preDialogueAwarenessLine
                ?? projectState.preflightSummary
                ?? null,
              key: 'open',
              maxLength: 160,
            }) ?? ''
          ),
      160,
    ),
    nextClosureTarget: sanitizeText(
      (!explicitNextClosureTargetInput && summaryNextClosureTargetInput)
        ? summaryNextClosureTargetInput
        : (
            extractProjectStateSummarySegment({
              explicitValue:
                resolvedNextClosureTargetExplicitValue
                || preferredSurfaceNextClosureTarget
                || canonicalBriefNextClosureTarget
                || fallbackNextClosureTarget
                || null,
              summaryLine:
                (typeof preferredRuntimeProjectState?.preDialogueAwarenessSummary === 'string' ? preferredRuntimeProjectState.preDialogueAwarenessSummary : null)
                ?? (typeof preferredRuntimeProjectState?.preflightSummary === 'string' ? preferredRuntimeProjectState.preflightSummary : null)
                ?? surfaceProjectState.preDialogueAwarenessSummary
                ?? surfaceProjectState.preflightSummary
                ?? projectState.preDialogueAwarenessLine
                ?? projectState.preflightSummary
                ?? null,
              key: 'next',
              maxLength: 420,
            }) ?? ''
          ),
      420,
    ),
    sameHerSelfLine: resolvedSameHerSelfLine,
    sameHerDriftRisk:
      (!explicitSameHerDriftRiskInput && summarySameHerDriftRiskInput)
        ? summarySameHerDriftRiskInput
        : resolvedSameHerDriftRisk,
    proactiveSameHerGap:
      sanitizeText(
        (!explicitProactiveSameHerGapInput && summaryProactiveSameHerGapInput)
          ? summaryProactiveSameHerGapInput
          : (
              liveProactiveSameHerGapInput
              || surfaceProjectState.proactiveSameHerGap
              || projectState.proactiveSameHerGap
              || ''
            ),
        220,
      ),
    memoryClosureSummary: pickPreferredProjectStateField(
      260,
      (rawConsciousFrameProjectState as { memoryClosureSummary?: unknown } | null)?.memoryClosureSummary,
      (rawDialogueRuntimeDigestProjectState as { memoryClosureSummary?: unknown } | null)?.memoryClosureSummary,
      (rawRuntimeDigestProjectState as { memoryClosureSummary?: unknown } | null)?.memoryClosureSummary,
      (rawCognitionRuntimeDigestProjectState as { memoryClosureSummary?: unknown } | null)?.memoryClosureSummary,
      (rawRuntimeStateProjectState as { memoryClosureSummary?: unknown } | null)?.memoryClosureSummary,
      runtimeSameHerMemoryClosureSummary,
      (projectState as { memoryClosureSummary?: unknown }).memoryClosureSummary,
    ) || null,
    emotionalClosureCue: pickPreferredProjectStateField(
      220,
      (rawConsciousFrameProjectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
      (rawDialogueRuntimeDigestProjectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
      (rawRuntimeDigestProjectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
      (rawCognitionRuntimeDigestProjectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
      (rawRuntimeStateProjectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
      runtimeSameHerEmotionalClosureCue,
      (projectState as { emotionalClosureCue?: unknown }).emotionalClosureCue,
    ),
    emotionalClosureSummary: pickPreferredProjectStateField(
      220,
      (rawConsciousFrameProjectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
      (rawDialogueRuntimeDigestProjectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
      (rawRuntimeDigestProjectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
      (rawCognitionRuntimeDigestProjectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
      (rawRuntimeStateProjectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
      runtimeSameHerEmotionalClosureSummary,
      (projectState as { emotionalClosureSummary?: unknown }).emotionalClosureSummary,
    ),
    sameHerHoldDetail: resolvedSameHerHoldDetailForAwareness,
    continuityCue: resolvedContinuityCue || null,
    continuityPreferredTiming: sanitizeConsciousContinuityPreferredTiming(
      sanitizeText(
        (typeof preferredRuntimeProjectState?.continuityPreferredTiming === 'string' ? preferredRuntimeProjectState.continuityPreferredTiming : null)
        ?? surfaceProjectState.continuityPreferredTiming
        ?? callbackFollowUpAffordance?.preferredTiming
        ?? '',
        120,
      )
      || sanitizeText(projectState.continuityPreferredTiming ?? '', 120)
      || null,
    ),
    continuityCadence:
      sanitizeText(
        (typeof preferredRuntimeProjectState?.continuityCadence === 'string' ? preferredRuntimeProjectState.continuityCadence : null)
        ?? surfaceProjectState.continuityCadence
        ?? (runtimeSameHerMemoryCarryAdvice ? 'measured-return' : null)
        ?? (runtimeSameHerEmotionalCarryAdvice ? 'repair-before-closeness' : null)
        ?? (runtimeSameHerEmbodimentCarryAdvice ? 'repair-before-closeness' : null)
        ?? '',
        120,
      )
      || sanitizeText(projectState.continuityCadence ?? '', 120)
      || null,
    preferredBlinkCadence: sanitizeConsciousProjectStateBlinkCadence(
      sanitizeText(
        (typeof preferredRuntimeProjectState?.preferredBlinkCadence === 'string' ? preferredRuntimeProjectState.preferredBlinkCadence : null)
        ?? surfaceProjectState.preferredBlinkCadence
        ?? (runtimeSameHerEmbodimentCarryAdvice ? 'quiet' : null)
        ?? '',
        32,
      )
      || sanitizeText(projectState.preferredBlinkCadence ?? '', 32)
      || null,
    ),
    preferredGazeMode: sanitizeConsciousProjectStateGazeMode(
      sanitizeText(
        (typeof preferredRuntimeProjectState?.preferredGazeMode === 'string' ? preferredRuntimeProjectState.preferredGazeMode : null)
        ?? surfaceProjectState.preferredGazeMode
        ?? (runtimeSameHerEmbodimentCarryAdvice ? 'soften' : null)
        ?? '',
        32,
      )
      || sanitizeText(projectState.preferredGazeMode ?? '', 32)
      || null,
    ),
    preferredPauseMode: sanitizeConsciousProjectStatePauseMode(
      sanitizeText(
        (typeof preferredRuntimeProjectState?.preferredPauseMode === 'string' ? preferredRuntimeProjectState.preferredPauseMode : null)
        ?? surfaceProjectState.preferredPauseMode
        ?? (runtimeSameHerEmbodimentCarryAdvice ? 'longer' : null)
        ?? longHorizonProjectCadence.preferredPauseMode
        ?? '',
        32,
      )
      || sanitizeText(projectState.preferredPauseMode ?? '', 32)
      || null,
    ),
    preferredLipsyncMode: sanitizeConsciousProjectStateLipsyncMode(
      sanitizeText(
        (typeof preferredRuntimeProjectState?.preferredLipsyncMode === 'string' ? preferredRuntimeProjectState.preferredLipsyncMode : null)
        ?? surfaceProjectState.preferredLipsyncMode
        ?? (runtimeSameHerEmbodimentCarryAdvice ? 'restrained' : null)
        ?? longHorizonProjectCadence.preferredLipsyncMode
        ?? '',
        32,
      )
      || sanitizeText(projectState.preferredLipsyncMode ?? '', 32)
      || null,
    ),
    preferredVoiceMode: sanitizeConsciousProjectStateVoiceMode(
      sanitizeText(
        (typeof preferredRuntimeProjectState?.preferredVoiceMode === 'string' ? preferredRuntimeProjectState.preferredVoiceMode : null)
        ?? surfaceProjectState.preferredVoiceMode
        ?? (runtimeSameHerEmbodimentCarryAdvice ? 'lower-pressure' : null)
        ?? longHorizonProjectCadence.preferredVoiceMode
        ?? '',
        32,
      )
      || sanitizeText(projectState.preferredVoiceMode ?? '', 32)
      || null,
    ),
    preferredPacingMode: sanitizeConsciousProjectStatePacingMode(
      sanitizeText(
        (typeof preferredRuntimeProjectState?.preferredPacingMode === 'string' ? preferredRuntimeProjectState.preferredPacingMode : null)
        ?? surfaceProjectState.preferredPacingMode
        ?? (runtimeSameHerEmbodimentCarryAdvice ? 'slower' : null)
        ?? longHorizonProjectCadence.preferredPacingMode
        ?? '',
        32,
      )
      || sanitizeText(projectState.preferredPacingMode ?? '', 32)
      || null,
    ),
  }
}

function deriveContinuityArcReasonTagFromContinuityEvidence(input: {
  memoryQueryHints?: string[] | null
  conversationNarrative?: string[] | null
}) {
  const evidence = [
    ...(input.memoryQueryHints ?? []),
    ...(input.conversationNarrative ?? []),
  ]
    .map(item => sanitizeText(item, 120).toLowerCase())
    .filter(Boolean)

  if (evidence.length === 0)
    return null
  if (evidence.some(item => item.includes('continuity_held_autonomy') || item.includes('held-autonomy-carry')))
    return 'continuity-arc:hold-for-opening'
  return null
}

function deriveContinuityArcReasonTag(input: {
  currentRegime: string
  openingDirective: string
  openingMove: string
  cadenceMode: string
  runtimeContinuityArcStage?: string | null
  runtimeContinuityPreferredTiming?: string | null
  memoryQueryHints?: string[] | null
  conversationNarrative?: string[] | null
}) {
  const runtimeContinuityArcStage = sanitizeText(input.runtimeContinuityArcStage, 64).toLowerCase()
  if (runtimeContinuityArcStage === 'same-thread-continuation')
    return 'continuity-arc:same-thread-continuation'
  if (runtimeContinuityArcStage === 'hold-for-opening')
    return 'continuity-arc:hold-for-opening'
  const continuityEvidenceReasonTag = deriveContinuityArcReasonTagFromContinuityEvidence({
    memoryQueryHints: input.memoryQueryHints,
    conversationNarrative: input.conversationNarrative,
  })
  if (continuityEvidenceReasonTag)
    return continuityEvidenceReasonTag
  if (input.currentRegime !== 'execution-callback')
    return null
  const directive = input.openingDirective.toLowerCase()
  const openingMove = input.openingMove.toLowerCase()
  const combined = `${directive} ${openingMove}`.trim()
  if (
    combined.includes('leave room')
    || combined.includes('held back')
    || /先留白|留白|别立刻把温度放大|别把温度放大|不要立刻把温度放大|这次更要留白|这次要更慢一点|不要重开得太快|上次太急|等 opening 松一点|等opening松一点/u.test(combined)
    || input.cadenceMode === 'cooldown'
  ) {
    return 'continuity-arc:hold-for-opening'
  }
  if (combined.includes('continue') || combined.includes('same line') || /同一条线|同一条生命线|继续沿着这条线|接回去/u.test(combined))
    return 'continuity-arc:same-thread-continuation'
  if (combined.includes('same thread') || combined.includes('gently before widening') || input.cadenceMode === 'measured-return')
    return 'continuity-arc:gentle-reopen'
  return null
}

function deriveContinuityTimingReasonTag(runtimeContinuityPreferredTiming?: string | null) {
  const preferredTiming = sanitizeText(runtimeContinuityPreferredTiming, 64).toLowerCase()
  if (preferredTiming === 'next-open-window')
    return 'continuity-timing:next-open-window'
  if (preferredTiming === 'same-turn-if-invited')
    return 'continuity-timing:same-turn-if-invited'
  return null
}

function buildSelfAuthoritySpeakingCue(selfContinuityAuthority?: {
  authoritySummary?: string | null
  closenessPosture?: string | null
} | null) {
  const authoritySummary = sanitizeConsciousFrameStructuredFact(selfContinuityAuthority?.authoritySummary, 420)
  const closenessPosture = sanitizeText(selfContinuityAuthority?.closenessPosture, 80).toLowerCase()
  if (!authoritySummary)
    return ''

  if (/space|measured|restrain|repair|room|lower-pressure|bounded/u.test(closenessPosture))
    return `self_authority=room_giving; ${lowerFirst(stripTrailingPunctuation(authoritySummary))}`
  if (/close|warm/u.test(closenessPosture))
    return `self_authority=bond_preserving; ${lowerFirst(stripTrailingPunctuation(authoritySummary))}`
  return `self_authority=continuous; ${lowerFirst(stripTrailingPunctuation(authoritySummary))}`
}

function deriveInwardRecollectionConsciousCue(input: {
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
}) {
  const runtimeSurface = input.runtimeSurface ?? null
  const memoryDeliberation = (
    runtimeSurface?.memory?.memoryDeliberation ?? null
  ) as (NonNullable<AlicizationDigitalLifeRuntimeSurface['memory']>['memoryDeliberation'] & {
    shouldStayInward?: boolean | null
    whyWithheld?: string | null
    inwardLine?: string | null
  }) | null
  const recollectionSpeechPlan = runtimeSurface?.memory?.recollectionSpeechPlan ?? null
  const compilerMemory = (input.answerCompiler ?? null) as AlicizationAnswerCompilerSnapshot & {
    memoryShouldStayInward?: boolean | null
    memoryWhyWithheld?: string | null
    memoryFollowUpAffordanceSummary?: string | null
  }
  const resolvedSurfacePolicy = sanitizeText(
    memoryDeliberation?.surfacePolicy
    ?? recollectionSpeechPlan?.surfaceMode
    ?? recollectionSpeechPlan?.placement
    ?? '',
    64,
  ).toLowerCase()
  const recollectionPlacement = sanitizeText(recollectionSpeechPlan?.placement ?? '', 64).toLowerCase()
  const shouldStayInward = compilerMemory.memoryShouldStayInward === true
    || memoryDeliberation?.shouldStayInward === true
    || resolvedSurfacePolicy === 'internal-only'
    || recollectionPlacement === 'internal-only'
  if (!shouldStayInward) {
    return {
      consciousNeed: null,
      speakingIntention: null,
    }
  }

  const whyWithheld = sanitizeText(
    compilerMemory.memoryWhyWithheld
    ?? memoryDeliberation?.whyWithheld
    ?? memoryDeliberation?.inwardLine
    ?? recollectionSpeechPlan?.rationale
    ?? '',
    220,
  )
  const canonicalInwardLine = sanitizeText(memoryDeliberation?.inwardLine ?? '', 220)
  const followUpSummary = sanitizeText(
    compilerMemory.memoryFollowUpAffordanceSummary
    ?? memoryDeliberation?.followUpAffordance?.summary
    ?? '',
    220,
  )
  const preferredTiming = sanitizeText(memoryDeliberation?.followUpAffordance?.preferredTiming ?? '', 64).toLowerCase()
  const inwardNeed = whyWithheld
    && (
      (canonicalInwardLine && whyWithheld === canonicalInwardLine)
      || /current payoff still needs the foreground|keep recollection inward|host has (?:more )?room|live payoff|remembered seam inward|live reunion/u.test(whyWithheld.toLowerCase())
    )
    ? whyWithheld
    : 'inward_recollection=withhold_until_payoff_lands; host_room=required; surface=structured'
  const followUpNeed = followUpSummary
    ? `follow_up_need=payoff_first; summary=${lowerFirst(stripTrailingPunctuation(followUpSummary))}`
    : 'follow_up_need=payoff_first; remembered_continuity_widening=deferred; surface=structured'
  const followUpTimingCue = preferredTiming === 'next-open-window'
    ? 'follow_up_timing=next_open_window; recollection_wait=true'
    : preferredTiming === 'after-payoff'
      ? 'follow_up_timing=after_payoff; recollection_wait=true'
      : null

  return {
    consciousNeed: weaveDistinctText([
      inwardNeed,
      followUpNeed,
      followUpTimingCue,
    ], 320),
    speakingIntention: weaveDistinctText([
      'recollection_surface=inward_until_live_payoff; remembered_continuity_surface=deferred; surface=structured',
      followUpTimingCue,
    ], 220),
  }
}

export function buildCurrentConsciousFrame(input: {
  now: number
  discourseState?: AlicizationDiscourseStateSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | AlicizationDialogueEncounterSurface | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}): AlicizationCurrentConsciousFrameSnapshot | null {
  const runtimeSurface = input.runtimeSurface ?? null
  const discourseState = runtimeSurface?.dialogue?.discourseState ?? input.discourseState ?? null
  const conversationState = runtimeSurface?.dialogue?.conversationState ?? input.conversationState ?? null
  const dialogueEncounter = runtimeSurface?.dialogue?.dialogueEncounter ?? input.dialogueEncounter ?? null
  const mindSynthesis = runtimeSurface?.dialogue?.mindSynthesis ?? input.mindSynthesis ?? null
  const answerCompiler = runtimeSurface?.dialogue?.answerCompiler ?? input.answerCompiler ?? null
  const rawPrivateThought = runtimeSurface?.cognition?.privateThought ?? input.privateThought ?? null
  const initiative = runtimeSurface?.agency?.initiative ?? input.initiative ?? null
  const desireMemory = runtimeSurface?.memory?.desireMemory ?? input.desireMemory ?? null
  const runtimeMemory = runtimeSurface?.memory ?? null
  const runtimeAgency = runtimeSurface?.agency ?? null
  const privateThought = rawPrivateThought
  const preferredPersonStateProjection = resolvePreferredPersonStateProjection({
    bundleProjection: runtimeSurface?.raw?.personStateProjection ?? null,
    runtimeProjection: runtimeSurface?.memory?.personStateProjection ?? null,
  })
  const projectedSelfContinuityAuthority = resolvePreferredSelfContinuityAuthority({
    bundleAuthority: runtimeSurface?.raw?.personStateProjection?.selfContinuityAuthority ?? null,
    runtimeAuthority: preferredPersonStateProjection?.selfContinuityAuthority ?? null,
  })
  const runtimeRelationshipCarry = preferredPersonStateProjection?.selfContinuityAuthority?.relationshipLine ?? null
  const selfContinuityAuthority = (
    projectedSelfContinuityAuthority
    && runtimeRelationshipCarry
    && hasContinuityRestraintRelationshipSignal(runtimeRelationshipCarry)
    && (
      !projectedSelfContinuityAuthority.relationshipLine
      || hasNeutralRelationshipSignal(projectedSelfContinuityAuthority.relationshipLine)
    )
  )
    ? {
        ...projectedSelfContinuityAuthority,
        relationshipLine: runtimeRelationshipCarry,
      }
    : projectedSelfContinuityAuthority
      ?? (runtimeSurface
        ? buildSelfContinuityAuthorityFromRuntimeSurface(runtimeSurface)
        : null)
  const personalityContinuityState = runtimeMemory?.personalityContinuityState
    ?? preferredPersonStateProjection?.personalityContinuityState
    ?? buildAlicizationPersonalityContinuityState({
      now: input.now,
      autobiographicalSelf: runtimeMemory?.autobiographicalSelf ?? null,
      hostPersonModel: runtimeMemory?.hostPersonModel ?? null,
      longHorizonMemory: runtimeMemory?.longHorizonMemory ?? null,
      motiveEngine: runtimeMemory?.motiveEngine ?? null,
      habitPolicy: runtimeAgency?.habitPolicy ?? null,
      selfContinuity: runtimeMemory?.selfContinuity ?? null,
      selfState: runtimeAgency?.selfState ?? null,
      privateThought,
      mindEcology: runtimeSurface ? buildMindEcologyFromRuntimeSurface(runtimeSurface) : null,
    })
  const growthProfile = personalityContinuityState.growthProfile
  const executionCallbackDoctrineCue = deriveExecutionCallbackDoctrineCue({
    runtimeSurface,
    currentRegime: personalityContinuityState.currentRegime,
  })

  if (!discourseState || !answerCompiler)
    return null

  const primaryAnchor = pickAnchorText(
    conversationState?.primaryTurnAnchor,
    discourseState.primaryTurnAnchor,
    dialogueEncounter?.taskAnchor,
    answerCompiler.openingClaim,
    conversationState?.hostMove,
  ) || null
  const evidencePhrases = uniqueList([
    answerCompiler.supportingReality?.[0],
    answerCompiler.supportingReality?.[1],
    dialogueEncounter?.summary,
    conversationState?.jointThread,
    answerCompiler.openingClaim,
    primaryAnchor,
  ], 6)
  const subject = dialogueEncounter?.subject ?? discourseState.currentTurnSubject
  const centerOfGravity = resolveCenterOfGravity({
    discourseState,
    answerCompiler,
    dialogueEncounter,
    privateThought,
    initiative,
  })
  const truthDiscipline = resolveTruthDiscipline({
    discourseState,
    answerCompiler,
    dialogueEncounter,
    evidencePhrases,
  })
  const screenTurn = discourseState.currentTurnSubject === 'task-knot'
    || discourseState.currentTurnSubject === 'visible-scene'
  const shouldWithholdSpecificity = truthDiscipline === 'observe-then-hypothesize'
    || truthDiscipline === 'memory-labeled'
    || (truthDiscipline === 'repair-first' && screenTurn)
  const shouldSelfRevise = truthDiscipline === 'repair-first'
    || answerCompiler.turnMode === 'screen-repair'
    || dialogueEncounter?.mustRepairFirst === true
  const shouldThreadSelfContinuity
    = subject === 'relationship'
      || subject === 'alicization-self'
      || (
        subject === 'task-knot'
        && answerCompiler.evidenceMode === 'continuity-carry'
        && personalityContinuityState.currentRegime === 'execution-callback'
      )
  const rememberedSeamReinterpretationCue = deriveRememberedSeamReinterpretationCue({
    runtimeSurface,
    answerCompiler,
    conversationState,
  })
  const baseProjectStateGrounding = buildProjectStateConsciousFrameGrounding({
    runtimeSurface,
  })
  const projectStateGrounding = {
    ...baseProjectStateGrounding,
    sameHerHoldDetail: resolveProjectStateSameHerHoldDetail({
      sameHerHoldDetail: baseProjectStateGrounding.sameHerHoldDetail,
      rememberedSeamReinterpretationCue,
    }),
    preferredBlinkCadence:
      rememberedSeamReinterpretationCue === 'reinterpret-with-more-room'
        ? 'quiet'
        : baseProjectStateGrounding.preferredBlinkCadence,
    preferredGazeMode:
      rememberedSeamReinterpretationCue === 'reinterpret-with-more-room'
        ? 'soften'
        : baseProjectStateGrounding.preferredGazeMode,
    preferredPauseMode:
      rememberedSeamReinterpretationCue === 'reinterpret-with-more-room'
        ? 'longer'
        : baseProjectStateGrounding.preferredPauseMode,
    preferredLipsyncMode:
      rememberedSeamReinterpretationCue === 'reinterpret-with-more-room'
        ? 'restrained'
        : baseProjectStateGrounding.preferredLipsyncMode,
    preferredVoiceMode:
      rememberedSeamReinterpretationCue === 'reinterpret-with-more-room'
        ? 'lower-pressure'
        : baseProjectStateGrounding.preferredVoiceMode,
    preferredPacingMode:
      rememberedSeamReinterpretationCue === 'reinterpret-with-more-room'
        ? 'slower'
        : baseProjectStateGrounding.preferredPacingMode,
  }
  const projectedConsciousNeedCarry = buildProjectedConsciousNeedCarry({
    repairTriggerText: preferredPersonStateProjection?.repairTriggerText,
    burdenText: preferredPersonStateProjection?.burdenText,
    sensitivityText: preferredPersonStateProjection?.sensitivityText,
    preferenceText: preferredPersonStateProjection?.preferenceText,
  })
  const projectedSpeakingCarry = buildProjectedSpeakingCarry({
    openingGuidance: preferredPersonStateProjection?.openingGuidance,
    manifestationCadenceSummary: preferredPersonStateProjection?.manifestationCadenceSummary,
    sensitivityText: preferredPersonStateProjection?.sensitivityText,
  })

  const consciousNeed = resolveConsciousNeed({
    centerOfGravity,
    conversationState,
    answerCompiler,
    mindSynthesis,
    dialogueEncounter,
    primaryAnchor,
    growthProfile,
    personalityContinuityState,
    executionCallbackDoctrineCue,
    rememberedSeamReinterpretationCue,
  })
  const normalizedConsciousNeed = shouldThreadSelfContinuity
    ? weaveDistinctText([
        consciousNeed,
        subject === 'relationship'
          ? selfContinuityAuthority?.relationshipLine
          : selfContinuityAuthority?.selfLine,
        selfContinuityAuthority?.habitLine,
      ], 420, 220)
    : consciousNeed
  const inwardRecollectionConsciousCue = deriveInwardRecollectionConsciousCue({
    runtimeSurface,
    answerCompiler,
  })
  const doctrineShapedConsciousNeed = executionCallbackDoctrineCue
    ? executionCallbackDoctrineCue === 'lower-pressure'
      ? 'conscious_need=execution_callback_return; pressure=lower; host_room=preserve; closeness_widening=false'
      : executionCallbackDoctrineCue === 'trust-warming'
        ? 'conscious_need=execution_callback_return; trust_warming=settle; closeness_widening=rush_blocked'
        : weaveDistinctText([
            normalizedConsciousNeed,
            'conscious_need=callback_as_lived_continuity; detached_result_line=false',
          ])
    : rememberedSeamReinterpretationCue === 'reinterpret-with-more-room'
      ? weaveDistinctText([
          normalizedConsciousNeed,
          'conscious_need=remembered_relationship_line; room=more; prior_reentry=eager',
        ])
      : normalizedConsciousNeed
  const surfaceTension = pickSurfaceText(
    strongestMindStatement(mindSynthesis?.concerns)?.summary,
    strongestMindStatement(mindSynthesis?.uncertainties)?.summary,
    privateThought?.thoughtText,
    initiative?.why,
    desireMemory?.activeDesires?.[0]?.reason,
  )
  const consciousTension = surfaceTension
    ? `conscious_tension=${lowerFirst(stripTrailingPunctuation(surfaceTension))}`
    : growthProfile.unfinishedThreadReturn >= 0.58
      ? 'conscious_tension=thread_slack_between_turns; action=hold'
      : 'conscious_tension=visible_answer_alignment; pressure=real_turn'
  const normalizedConsciousTension = shouldThreadSelfContinuity
    ? weaveDistinctText([
        consciousTension,
        selfContinuityAuthority?.inwardLine,
      ])
    : consciousTension
  const speakingIntention = resolveSpeakingIntention({
    truthDiscipline,
    centerOfGravity,
    answerCompiler,
    mindSynthesis,
    privateThought,
    initiative,
    growthProfile,
  })
  const normalizedSpeakingIntention = shouldThreadSelfContinuity
    ? weaveDistinctText([
        speakingIntention,
        selfContinuityAuthority?.selfLine,
        buildSelfAuthoritySpeakingCue(selfContinuityAuthority),
      ], 640, 420)
    : speakingIntention
  const doctrineShapedSpeakingIntention = executionCallbackDoctrineCue
    ? weaveDistinctText([
        normalizedSpeakingIntention,
        executionCallbackDoctrineCue === 'lower-pressure'
          ? 'wording_policy=thread_faithful; pressure=softer; room_giving=true'
          : executionCallbackDoctrineCue === 'trust-warming'
            ? 'wording_policy=trust_warming_quiet; bond_widening=moment_bounded'
            : 'wording_policy=callback_inside_lived_continuity',
      ], 640, 840)
    : weaveDistinctText([
        normalizedSpeakingIntention,
        inwardRecollectionConsciousCue.speakingIntention,
      ], 640, 840)
  const projectStateAwarenessLead = projectStateGrounding.preDialogueAwarenessLine
    ? sanitizeText(stripLeadingBeforeAnswering(projectStateGrounding.preDialogueAwarenessLine), 160)
    : ''
  const projectStatePreflightLead = projectStateGrounding.preflightSummary
    ? sanitizeText(stripLeadingBeforeAnswering(projectStateGrounding.preflightSummary), 160)
    : ''
  const projectStateLatestProgressLead = projectStateGrounding.latestProgress
    ? sanitizeText(projectStateGrounding.latestProgress, 160)
    : ''
  const projectStateAwarenessNeed = projectStateGrounding.preDialogueAwarenessLine
    ? providerFacingConsciousFrameField('project_context', stripTrailingPunctuation(projectStateAwarenessLead), 220)
    : projectStateGrounding.preflightSummary
      ? providerFacingConsciousFrameField('project_context', stripTrailingPunctuation(projectStatePreflightLead), 220)
      : null
  const projectStatePreflightNeed
    = projectStatePreflightLead
      && projectStatePreflightLead !== projectStateAwarenessLead
      && !projectStateAwarenessLead.includes(projectStatePreflightLead)
      ? providerFacingConsciousFrameField('project_preflight', stripTrailingPunctuation(projectStatePreflightLead), 220)
      : null
  const projectStateLatestProgressNeed = projectStateLatestProgressLead
    ? providerFacingConsciousFrameField('landed_progress', stripTrailingPunctuation(projectStateLatestProgressLead), 220)
    : null
  const projectStateOpenLoopNeed = projectStateGrounding.primaryOpenLoop
    ? providerFacingConsciousFrameField('open_loop', stripTrailingPunctuation(projectStateGrounding.primaryOpenLoop), 220)
    : null
  const projectStateSameHerSelfNeed = projectStateGrounding.sameHerSelfLine
    ? /phase 1/u.test(projectStateGrounding.sameHerSelfLine)
      ? 'project_context=phase1_current'
      : 'project_context=digital_life_current'
    : null
  const projectStateProactiveSameHerGapNeed = projectStateGrounding.proactiveSameHerGap
    ? providerFacingConsciousFrameField('proactive_gap', stripTrailingPunctuation(projectStateGrounding.proactiveSameHerGap), 220)
    : null
  const projectStateMemoryClosureNeed = projectStateGrounding.memoryClosureSummary
    ? providerFacingConsciousFrameField('memory_closure', stripTrailingPunctuation(projectStateGrounding.memoryClosureSummary), 220)
    : null
  const projectStateNextClosureLead = projectStateGrounding.nextClosureTarget
    ? sanitizeAlicizationProviderFacingText(stripTrailingPunctuation(projectStateGrounding.nextClosureTarget), 180)
    : ''
  const projectStateNextClosureNeed = projectStateNextClosureLead
    ? providerFacingConsciousFrameField('next_closure', projectStateNextClosureLead, 220)
    : null
  const initiativeClosureCue = deriveInitiativeClosureCue({
    initiative,
    primaryOpenLoop: projectStateGrounding.primaryOpenLoop,
    nextClosureTarget: projectStateGrounding.nextClosureTarget,
    emotionalClosureCue: projectStateGrounding.emotionalClosureCue,
    sameHerHoldDetail: projectStateGrounding.sameHerHoldDetail,
  })
  const projectStateClosureAuthority = deriveProjectClosureAuthority({
    emotionalClosureSummary: projectStateGrounding.emotionalClosureSummary,
    emotionalClosureCue: projectStateGrounding.emotionalClosureCue,
    sameHerHoldDetail: projectStateGrounding.sameHerHoldDetail,
    initiativeClosureCue,
  })
  const projectStateClosureAuthoritySummary = summarizeProjectClosureAuthority(projectStateClosureAuthority)
  const projectStateHoldAuthoritySummary = summarizeProjectHoldAuthority(projectStateGrounding.sameHerHoldDetail)
  const projectStateRepairFirstNeed
    = projectStateClosureAuthoritySummary?.includes('repair-before-closeness')
      ? 'emotional_closure=repair_before_closeness; until=repair_settles'
      : null
  const projectStateRestProtectiveNeed = isRestProtectiveClosureCue(projectStateClosureAuthority)
    ? 'rest_protection=first; emotional_closure=low_pressure; direction=inward; closeness_widening=false'
    : null
  const projectStateClosureNeed = projectStateRepairFirstNeed
    ?? (projectStateClosureAuthoritySummary
      ? `emotional_closure=low_pressure; summary=${stripTrailingPunctuation(projectStateClosureAuthoritySummary)}`
      : null)
  const projectStateHoldNeed = projectStateHoldAuthoritySummary
    ? `inward_hold=active; summary=${stripTrailingPunctuation(projectStateHoldAuthoritySummary)}`
    : null
  const projectStateShapedConsciousNeed = weaveDistinctText(
    projectStateGrounding.hasExplicitRuntimeProjectState
      ? [
          doctrineShapedConsciousNeed,
          inwardRecollectionConsciousCue.consciousNeed,
          projectedConsciousNeedCarry,
          projectStateAwarenessNeed,
          projectStatePreflightNeed,
          projectStateSameHerSelfNeed,
          projectStateProactiveSameHerGapNeed,
          projectStateMemoryClosureNeed,
          projectStateLatestProgressNeed,
          projectStateRestProtectiveNeed,
          projectStateClosureNeed,
          projectStateHoldNeed,
          projectStateOpenLoopNeed,
          projectStateNextClosureNeed,
          initiativeClosureCue,
        ]
      : [
          doctrineShapedConsciousNeed,
          inwardRecollectionConsciousCue.consciousNeed,
          projectedConsciousNeedCarry,
          projectStateRestProtectiveNeed,
          projectStateClosureNeed,
          projectStateHoldNeed,
          projectStateAwarenessNeed,
          projectStateSameHerSelfNeed,
          projectStateProactiveSameHerGapNeed,
          projectStateMemoryClosureNeed,
          projectStateOpenLoopNeed,
          projectStateNextClosureNeed,
          projectStateLatestProgressNeed,
          initiativeClosureCue,
        ],
    1600,
    220,
  )
  const withheldImpulse = shouldWithholdSpecificity
    ? 'withheld_impulse=coarse_visual_to_specific_artifact_certainty'
    : shouldSelfRevise
      ? 'withheld_impulse=defend_older_interpretation_for_continuity'
      : null
  const projectStateShapedSpeakingIntention = buildProjectStateShapedSpeakingIntention({
    doctrineShapedSpeakingIntention,
    preferRuntimeDriftRiskLifeLoopGap: projectStateGrounding.preferRuntimeDriftRiskLifeLoopGap,
    inwardRecollectionSpeakingIntention: inwardRecollectionConsciousCue.speakingIntention,
    sameHerSelfLine: projectStateGrounding.sameHerSelfLine,
    sameHerDriftRisk: projectStateGrounding.sameHerDriftRisk,
    proactiveSameHerGap: projectStateGrounding.proactiveSameHerGap,
    memoryClosureSummary: projectStateGrounding.memoryClosureSummary,
    emotionalClosureCue: projectStateGrounding.emotionalClosureCue,
    emotionalClosureSummary: projectStateGrounding.emotionalClosureSummary,
    sameHerHoldDetail: projectStateGrounding.sameHerHoldDetail,
    initiativeClosureCue,
    nextClosureTarget: projectStateGrounding.nextClosureTarget,
    primaryOpenLoop: projectStateGrounding.primaryOpenLoop,
  })
  const projectionShapedSpeakingIntention = mergeProjectedSpeakingCarry({
    base: projectStateShapedSpeakingIntention,
    carry: projectedSpeakingCarry,
  })
  const runtimeContinuityPreferredTiming = projectStateGrounding.continuityPreferredTiming
  const runtimeContinuityCadence = projectStateGrounding.continuityCadence
  const runtimePreferredBlinkCadence = projectStateGrounding.preferredBlinkCadence
  const runtimePreferredGazeMode = projectStateGrounding.preferredGazeMode
  const runtimePreferredPauseMode = projectStateGrounding.preferredPauseMode
  const runtimePreferredLipsyncMode = projectStateGrounding.preferredLipsyncMode
  const runtimePreferredVoiceMode = projectStateGrounding.preferredVoiceMode
  const runtimePreferredPacingMode = projectStateGrounding.preferredPacingMode
  const selfEvolutionDurableSameHerCadenceReasonTag
    = selfContinuityAuthority?.sourceTags.includes('self-evolution-relationship-cadence')
      ? 'self-evolution:durable-same-her-cadence'
      : null
  const sanitizedConsciousNeed = sanitizeConsciousFrameOutputText(projectStateShapedConsciousNeed, 1600)
    || 'context=available; owner=CurrentConsciousFrame'
  const sanitizedSpeakingIntention = sanitizeConsciousFrameOutputText(projectionShapedSpeakingIntention, 1800)
    || 'reply_context=current_turn; owner=CurrentConsciousFrame'
  const sanitizedProjectState = runtimeContinuityPreferredTiming
    || runtimeContinuityCadence
    || projectStateGrounding.preDialogueAwarenessLine
    || projectStateGrounding.preflightSummary
    || projectStateGrounding.projectIdentity
    || projectStateGrounding.currentPhase
    || projectStateGrounding.latestProgress
    || projectStateGrounding.primaryOpenLoop
    || projectStateGrounding.nextClosureTarget
    || projectStateGrounding.sameHerSelfLine
    || projectStateGrounding.sameHerDriftRisk
    || projectStateGrounding.proactiveSameHerGap
    || projectStateGrounding.memoryClosureSummary
    || projectStateGrounding.emotionalClosureCue
    || projectStateGrounding.emotionalClosureSummary
    || projectStateGrounding.sameHerHoldDetail
    || runtimePreferredPauseMode
    || runtimePreferredLipsyncMode
    || runtimePreferredVoiceMode
    || runtimePreferredPacingMode
    ? {
        preDialogueAwarenessLine: sanitizeConsciousFrameOutputTextOrNull(projectStateGrounding.preDialogueAwarenessLine, 720),
        preflightSummary: sanitizeConsciousFrameOutputTextOrNull(projectStateGrounding.preflightSummary, 520),
        identity: sanitizeConsciousFrameOutputTextOrNull(projectStateGrounding.projectIdentity, 260),
        currentPhase: sanitizeConsciousFrameOutputTextOrNull(projectStateGrounding.currentPhase, 180),
        latestLandedProgress: sanitizeConsciousFrameOutputTextOrNull(projectStateGrounding.latestProgress, 420),
        latestProgress: sanitizeConsciousFrameOutputTextOrNull(projectStateGrounding.latestProgress, 420),
        primaryOpenLoop: sanitizeConsciousFrameOutputTextOrNull(projectStateGrounding.primaryOpenLoop, 420),
        nextClosureTarget: sanitizeConsciousFrameOutputTextOrNull(projectStateGrounding.nextClosureTarget, 420),
        sameHerSelfLine: sanitizeConsciousFrameOutputTextOrNull(projectStateGrounding.sameHerSelfLine, 260),
        sameHerDriftRisk: sanitizeConsciousFrameOutputTextOrNull(projectStateGrounding.sameHerDriftRisk, 420),
        proactiveSameHerGap: sanitizeConsciousFrameOutputTextOrNull(projectStateGrounding.proactiveSameHerGap, 420),
        memoryClosureSummary: sanitizeConsciousFrameOutputTextOrNull(projectStateGrounding.memoryClosureSummary, 420),
        emotionalClosureCue: sanitizeConsciousFrameOutputTextOrNull(projectStateGrounding.emotionalClosureCue, 420),
        emotionalClosureSummary: sanitizeConsciousFrameOutputTextOrNull(projectStateGrounding.emotionalClosureSummary, 420),
        sameHerHoldDetail: sanitizeConsciousFrameOutputTextOrNull(projectStateGrounding.sameHerHoldDetail, 420),
        continuityCue: sanitizeConsciousFrameOutputTextOrNull(projectStateGrounding.continuityCue, 420),
        preferredBlinkCadence: runtimePreferredBlinkCadence,
        preferredGazeMode: runtimePreferredGazeMode,
        preferredPauseMode: runtimePreferredPauseMode,
        preferredLipsyncMode: runtimePreferredLipsyncMode,
        preferredVoiceMode: runtimePreferredVoiceMode,
        preferredPacingMode: runtimePreferredPacingMode,
        continuityPreferredTiming: runtimeContinuityPreferredTiming,
        continuityCadence: runtimeContinuityCadence,
      }
    : null

  return {
    subject,
    centerOfGravity,
    truthDiscipline,
    consciousNeed: sanitizedConsciousNeed,
    consciousTension: normalizedConsciousTension,
    speakingIntention: sanitizedSpeakingIntention,
    focusAnchor: primaryAnchor,
    withheldImpulse,
    shouldWithholdSpecificity,
    shouldSelfRevise,
    confidence: clamp01(
      answerCompiler.confidence * 0.38
      + (mindSynthesis?.confidence ?? 0.42) * 0.24
      + (dialogueEncounter?.confidence ?? discourseState.confidence) * 0.22
      + (privateThought?.confidence ?? 0.34) * 0.16,
    ),
    reasonTags: uniqueList([
      deriveContinuityArcReasonTag({
        currentRegime: personalityContinuityState.currentRegime,
        openingDirective: sanitizeText(answerCompiler?.openingDirective, 220).toLowerCase(),
        openingMove: sanitizeText(
          runtimeSurface?.cognition?.mindTurnFrame?.obligation.openingMove
          ?? runtimeSurface?.dialogue?.dialogueActKernel?.openingMove
          ?? runtimeSurface?.dialogue?.answerPlanner?.openingMove
          ?? '',
          220,
        ).toLowerCase(),
        cadenceMode: personalityContinuityState.rhythmState.cadenceMode,
        runtimeContinuityArcStage: runtimeSurface?.dialogue?.currentConsciousFrame?.projectState?.continuityArcStage
          ?? runtimeSurface?.dialogue?.runtimeDigest?.projectState?.continuityArcStage
          ?? runtimeSurface?.raw?.runtimeDigest?.projectState?.continuityArcStage
          ?? runtimeSurface?.cognition?.runtimeDigest?.projectState?.continuityArcStage
          ?? null,
        runtimeContinuityPreferredTiming,
        memoryQueryHints: conversationState?.memoryQueryHints ?? null,
        conversationNarrative: conversationState?.narrative ?? null,
      }),
      deriveContinuityTimingReasonTag(runtimeContinuityPreferredTiming),
      `subject:${dialogueEncounter?.subject ?? discourseState.currentTurnSubject}`,
      `center:${centerOfGravity}`,
      `discipline:${truthDiscipline}`,
      executionCallbackDoctrineCue ? `execution-callback-doctrine:${executionCallbackDoctrineCue}` : null,
      selfEvolutionDurableSameHerCadenceReasonTag,
      rememberedSeamReinterpretationCue ? `remembered-seam:${rememberedSeamReinterpretationCue}` : null,
      `continuity-regime:${personalityContinuityState.currentRegime}`,
      `continuity-repair:${personalityContinuityState.repairPosture}`,
      `continuity-rhythm:${personalityContinuityState.rhythmState.cadenceMode}:${personalityContinuityState.rhythmState.restMode}`,
      selfContinuityAuthority?.closenessPosture
        ? `self-authority-closeness:${sanitizeText(selfContinuityAuthority.closenessPosture, 64).toLowerCase()}`
        : null,
      projectStateGrounding.currentPhase ? `project-phase:${projectStateGrounding.currentPhase}` : null,
      projectStateGrounding.primaryOpenLoop ? `project-open-loop:${projectStateGrounding.primaryOpenLoop}` : null,
      projectStateGrounding.nextClosureTarget ? `project-next-closure:${projectStateGrounding.nextClosureTarget}` : null,
      privateThought?.stance ? `stance:${privateThought.stance}` : null,
      initiative?.selectedAction ? `initiative:${initiative.selectedAction}` : null,
      answerCompiler.recommendedAct ? `act:${answerCompiler.recommendedAct}` : null,
      shouldWithholdSpecificity ? 'withhold-specificity' : null,
      shouldSelfRevise ? 'self-revise' : null,
    ], 14),
    continuityPreferredTiming: runtimeContinuityPreferredTiming,
    continuityCadence: runtimeContinuityCadence,
    projectState: sanitizedProjectState,
    updatedAt: input.now,
  }
}

export function buildCurrentConsciousFrameSystemBlock(
  frame: AlicizationCurrentConsciousFrameSnapshot | null | undefined,
  options?: {
    includeProjectStateFacts?: boolean
  },
) {
  if (!frame)
    return ''
  const includeProjectStateFacts = options?.includeProjectStateFacts !== false

  return [
    '[ALICIZATION_CURRENT_CONSCIOUS_FRAME]',
    'owner=CurrentConsciousFrame',
    'short_term_owner=WorkingMemory',
    'long_term_recall_owner=LongTermMemoryRecall',
    'policy=express_current_frame_without_generic_assistant_shell',
    `subject=${frame.subject}`,
    `center_of_gravity=${frame.centerOfGravity}`,
    `truth_discipline=${frame.truthDiscipline}`,
    providerFacingConsciousFrameField('conscious_need', frame.consciousNeed),
    providerFacingConsciousFrameField('conscious_tension', frame.consciousTension),
    providerFacingConsciousFrameField('speaking_intention', frame.speakingIntention),
    providerFacingConsciousFrameField('focus_anchor', frame.focusAnchor),
    `Withhold specificity: ${frame.shouldWithholdSpecificity ? 'yes' : 'no'}.`,
    `Self revision required: ${frame.shouldSelfRevise ? 'yes' : 'no'}.`,
    providerFacingConsciousFrameField('withheld_impulse', frame.withheldImpulse),
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_preflight', frame.projectState?.preflightSummary) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_pre_dialogue_awareness', frame.projectState?.preDialogueAwarenessLine) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_identity', frame.projectState?.identity) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_phase', frame.projectState?.currentPhase) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_landed_progress', frame.projectState?.latestProgress) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_open_closure', frame.projectState?.primaryOpenLoop) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_next_closure_target', frame.projectState?.nextClosureTarget) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_continuity_anchor', frame.projectState?.sameHerSelfLine) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_continuity_drift_risk', frame.projectState?.sameHerDriftRisk) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_continuity_gap', (frame.projectState as { proactiveSameHerGap?: string | null } | null)?.proactiveSameHerGap) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_memory_closure', frame.projectState?.memoryClosureSummary) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_emotional_closure_cue', (frame.projectState as { emotionalClosureCue?: string | null } | null)?.emotionalClosureCue) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_emotional_closure_summary', (frame.projectState as { emotionalClosureSummary?: string | null } | null)?.emotionalClosureSummary) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_continuity_hold', (frame.projectState as { sameHerHoldDetail?: string | null } | null)?.sameHerHoldDetail) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_continuity_cue', (frame.projectState as { continuityCue?: string | null } | null)?.continuityCue) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_continuity_timing', frame.projectState?.continuityPreferredTiming, 80) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_continuity_cadence', frame.projectState?.continuityCadence, 80) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_preferred_pause_mode', (frame.projectState as { preferredPauseMode?: string | null } | null)?.preferredPauseMode, 80) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_preferred_lipsync_mode', (frame.projectState as { preferredLipsyncMode?: string | null } | null)?.preferredLipsyncMode, 80) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_preferred_voice_mode', frame.projectState?.preferredVoiceMode, 80) : '',
    includeProjectStateFacts ? providerFacingConsciousFrameField('project_preferred_pacing_mode', frame.projectState?.preferredPacingMode, 80) : '',
    `Reason tags: ${providerFacingConsciousFrameReasonTags(frame.reasonTags)}.`,
  ].filter(Boolean).join('\n')
}
