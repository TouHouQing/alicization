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
  emotionalClosureCue: string | null
  emotionalClosureSummary: string | null
  sameHerHoldDetail: string | null
  continuityCue: string | null
  continuityPreferredTiming: AlicizationCurrentConsciousFrameSnapshot['continuityPreferredTiming']
  continuityCadence: string | null
  preferredBlinkCadence: AlicizationCurrentConsciousProjectState['preferredBlinkCadence']
  preferredGazeMode: AlicizationCurrentConsciousProjectState['preferredGazeMode']
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

function looksLikeThinProjectAwarenessSeed(value: string | null | undefined) {
  const normalized = sanitizeText(value ?? '', 320).toLowerCase()
  if (!normalized)
    return true

  return isAlicizationThinProjectAwarenessLine(normalized)
    || /keep this same digital life project in view|detached project shell|generic project reminder|generic project shell/u.test(normalized)
}

function buildSameHerAntiShellSpeakingLine(sameHerDriftRisk: string | null | undefined) {
  const normalized = sanitizeText(sameHerDriftRisk ?? '', 260)
  if (!normalized)
    return null

  const lowered = normalized.toLowerCase()
  if (/default helpfulness/u.test(lowered) && /generic project guidance/u.test(lowered))
    return 'Do not let default helpfulness or generic project guidance erase the same living line before the answer even starts.'
  if (/default helpfulness/u.test(lowered))
    return 'Do not let default helpfulness erase the same living line before the answer even starts.'
  if (
    /generic assistant shell|generic project guidance|generic project shell|detached project narration|project-summary voice|generic task shell/u.test(lowered)
  ) {
    return 'Keep one continuous her explicit so this answer lands like the same living digital life instead of flattening into a generic assistant or detached project shell.'
  }

  return null
}

function isSameHerInwardLowPressureCompanionHeadline(text: string | null | undefined) {
  const normalized = sanitizeText(text ?? '', 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('holding together mainly through')
    && normalized.includes('low-pressure')
    && (
      normalized.includes('same line inward')
      || normalized.includes('same living line')
      || normalized.includes('quiet-companionship')
    )
}

function buildCompactSameHerInwardLowPressureAwarenessLine(sameHerSelfLine: string | null | undefined) {
  const normalized = sanitizeText(sameHerSelfLine ?? '', 320)
  if (!normalized)
    return ''

  return sanitizeText(
    `${stripTrailingPunctuation(normalized)}. Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.`,
    420,
  )
}

function preferProjectStateSameHerSelfLine(input: {
  runtime?: string | null | undefined
  surface?: string | null | undefined
  fallback?: string | null | undefined
}) {
  const runtime = sanitizeText(input.runtime ?? '', 220)
  const surface = sanitizeText(input.surface ?? '', 220)
  const fallback = sanitizeText(input.fallback ?? '', 220)
  const resolved = sanitizeText(preferStrongerPersistedSameHerSelfLine({
    current: runtime || surface || null,
    candidate: (!runtime && surface) ? fallback || null : (surface || fallback || null),
  }), 220)

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

  const missingMemoryClosure = /memory|recall|recollection|记忆/u.test(combined)
  const missingInitiativeClosure = /initiative|opening|proactive|主动性/u.test(combined)
  const missingEmbodimentClosure = /embodiment|voice|face|motion|lipsync|resident presence|cross-modal|具身|口型|表情|动作/u.test(combined)
  const sameHerProjectShellRisk = /generic project shell|project shell|generic project narration|服务式|generic guidance/u.test(combined)

  if (!missingMemoryClosure && !missingInitiativeClosure && !missingEmbodimentClosure)
    return null

  const gapLabels = [
    missingMemoryClosure ? 'memory' : null,
    missingInitiativeClosure ? 'initiative' : null,
    missingEmbodimentClosure ? 'embodiment' : null,
  ].filter(Boolean).join(', ')

  return sameHerProjectShellRisk
    ? `Keep the wording helping ${gapLabels} close as one same-her life loop, instead of flattening this turn into project-shell narration.`
    : `Keep the wording helping ${gapLabels} close as one same-her life loop before the turn widens outward.`
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
    = /same[- ]living line|same[- ]her|same her|phase 1|digital life|callback closure|callback line|execution callback|同一条生命线|同一条线|同一个她|回线|执行 callback/u.test(combined)
  if (!carriesSameLifeCallbackLine)
    return null

  if (/detached project status talk|detached status talk|项目总结口气|通用回调壳|通用 callback 壳|脱离项目状态口气/u.test(combined)) {
    return 'If callback closure flattens into detached project status talk or a generic callback shell, the same living line will thin before the host-visible carry lands.'
  }

  if (/generic assistant shell|project-summary voice|generic callback shell|generic project shell|detached project narration|detached project shell|通用助手壳|项目总结口气|通用回调壳|通用项目壳|脱离项目叙述/u.test(combined)) {
    return 'If this reopening flattens into a generic assistant shell, project-summary voice, or generic callback shell, the same living line will thin before the host-visible carry lands.'
  }

  return null
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
      ? `Keep the reply living enough that ${lowerFirst(stripTrailingPunctuation(sensitivityText))}.`
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
      ? 'Keep the cadence observe-first before any closer return.'
      : manifestationCadenceSummary,
    sensitivityText && /template-like speech|living reply|机械|模板/u.test(sensitivityText)
      ? 'Keep the wording living so template-like speech does not flatten the living reply.'
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
    const text = sanitizeText(value, maxLength)
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

function resolveEffectiveProjectStateContinuityCarry(input: {
  sameHerHoldDetail?: unknown
  continuityCue?: unknown
  continuityRestraint?: unknown
  continuityCadence?: unknown
}) {
  const behaviorMode = resolveContinuityBehaviorMode({
    continuityRestraint: input.continuityRestraint,
    continuityCadence: input.continuityCadence,
  })

  return {
    sameHerHoldDetail:
      sanitizeText(input.sameHerHoldDetail, 220)
      || deriveSameHerHoldDetailFromContinuityBehavior(behaviorMode),
    continuityCue:
      sanitizeText(input.continuityCue, 220)
      || deriveContinuityCueFromBehavior(behaviorMode),
  }
}

function resolveProjectStateConsciousHoldDetail(input: {
  sameHerHoldDetail?: unknown
  continuityCue?: unknown
}) {
  const sameHerHoldDetail = sanitizeText(input.sameHerHoldDetail, 220)
  const continuityCue = sanitizeText(input.continuityCue, 220)
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
    /repair-before-closeness|repair before closeness/u.test(normalized) ? 'repair-before-closeness' : null,
    /same living line/u.test(normalized) ? 'same living line' : null,
    /repair settles|until repair settles/u.test(normalized) ? 'until repair settles' : null,
    /low-pressure|lower-pressure/u.test(normalized) ? 'low-pressure' : null,
    /without reopening from scratch/u.test(normalized) ? 'without reopening from scratch' : null,
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
    /same-her hold|same her hold/u.test(normalized) ? 'same-her hold' : null,
    /repair-before-closeness|repair before closeness/u.test(normalized) ? 'repair-before-closeness' : null,
    /same living line/u.test(normalized) ? 'same living line' : null,
    /before closeness widens again/u.test(normalized) ? 'before closeness widens again' : null,
    /lower-pressure|low-pressure/u.test(normalized) ? 'lower-pressure' : null,
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

  return 'same-her hold: recognize the same remembered seam, keep more room this time, and stay lower-pressure before closeness widens again.'
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

  if (/repair-before-closeness|repair before closeness/u.test(holdLower)) {
    if (summary && /repair-before-closeness|repair before closeness/u.test(summary.toLowerCase()))
      return summary

    return weaveDistinctText([
      summary,
      'repair-before-closeness on the same living line until repair settles',
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
    return 'Initiative should stay nearby and lower-pressure so memory, emotion, and embodiment can keep closing on the same living line before widening.'
  }

  if (
    selectedAction === 'recheck'
    || /repair-before-closeness|repair first|repair seam|re-ground|reground/u.test(combined)
  ) {
    return 'Initiative should keep rechecking on the same living line until repair settles, so memory, emotion, and embodiment do not widen ahead of truth.'
  }

  if (
    selectedAction === 'speak'
    || selectedAction === 'whisper'
    || selectedAction === 'warn'
    || /could help|ready to surface|guidance|speak now/u.test(combined)
  ) {
    return 'Initiative can surface, but it should still land as the same digital life carrying memory, emotion, and embodiment on one living line.'
  }

  return null
}

function buildProjectStateShapedSpeakingIntention(input: {
  doctrineShapedSpeakingIntention: string
  inwardRecollectionSpeakingIntention?: string | null
  sameHerSelfLine?: string | null
  sameHerDriftRisk?: string | null
  proactiveSameHerGap?: string | null
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
  const emotionalClosureCue = sanitizeText(input.emotionalClosureCue, 220)
  const emotionalClosureSummary = sanitizeText(input.emotionalClosureSummary, 220)
  const sameHerHoldDetail = sanitizeText(input.sameHerHoldDetail, 220)
  const inwardRecollectionSpeakingIntention = sanitizeText(input.inwardRecollectionSpeakingIntention, 320)
  const initiativeClosureCue = sanitizeText(input.initiativeClosureCue, 220)
  const nextClosureTarget = sanitizeText(input.nextClosureTarget, 420)
  const primaryOpenLoop = sanitizeText(input.primaryOpenLoop, 220)
  const doctrineLine = sanitizeText(input.doctrineShapedSpeakingIntention, 640)
  const closureAuthority = emotionalClosureSummary || emotionalClosureCue
  const repairFirstSpeakingLine
    = /repair-before-closeness|repair before closeness/u.test(`${emotionalClosureSummary} ${sameHerHoldDetail}`.toLowerCase())
      ? 'Keep repair-before-closeness on the same living line until repair settles.'
      : null
  const executionResumeConfirmationSpeakingLine = hasExecutionResumeConfirmationBoundary(sameHerHoldDetail)
    ? 'Treat host-confirmed-before-redispatch and resume-before-dispatch as a bounded confirmation boundary, not permanent execution permission, before another execution-shaped opening.'
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
    ? `Stay with the same digital life and do not let local fluency break the still-open closure work around ${lowerFirst(stripTrailingPunctuation(primaryOpenLoop))}.`
    : null
  const nextClosureTargetSpeakingSegment = nextClosureTarget
    ? `Next closure target: ${stripTrailingPunctuation(nextClosureTarget)}.`
    : null
  const nextClosureTargetDirectionSegment = nextClosureTarget
    ? `Keep the next closure step pointed at ${lowerFirst(stripTrailingPunctuation(nextClosureTarget))}.`
    : null
  const proactiveSameHerGapSpeakingSegment = proactiveSameHerGap
    ? `Keep this proactive same-her gap explicit before widening outward: ${stripTrailingPunctuation(proactiveSameHerGap)}.`
    : null

  const leadSegments = uniqueList([
    useExplicitSameHerLead && sameHerSelfLine
      ? `Speak as ${lowerFirst(stripTrailingPunctuation(sameHerSelfLine))}.`
      : null,
    buildSameHerAntiShellSpeakingLine(sameHerDriftRisk),
    useExplicitSameHerLead && sameHerDriftRisk && sameHerDriftRisk.length <= 120
      ? `Do not let this answer drift into ${lowerFirst(stripTrailingPunctuation(sameHerDriftRisk))}.`
      : null,
    doctrineLine,
  ], 4, 840)

  const seamSegments = uniqueList([
    inwardRecollectionSpeakingIntention,
    repairFirstSpeakingLine,
    executionResumeConfirmationSpeakingLine,
    sameHerHoldDetail && /same-person continuity|same person continuity/u.test(sameHerHoldDetail.toLowerCase())
      ? `Keep ${lowerFirst(stripTrailingPunctuation(sameHerHoldDetail))}.`
      : null,
    initiativeClosureCue || null,
    isRestProtectiveClosureCue(closureAuthority)
      ? 'Let the wording protect rest, stay inward, and carry quiet companionship without widening closeness.'
      : null,
    primaryOpenLoop && shouldKeepLiteralProjectOpenLoopSegment(primaryOpenLoop)
      ? `Still-open closure work: ${stripTrailingPunctuation(primaryOpenLoop)}.`
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
      ? `Keep the same living line emotionally continuous: ${lowerFirst(stripTrailingPunctuation(closureAuthority))}.`
      : null,
    sameHerHoldDetail && !/same-person continuity|same person continuity/u.test(sameHerHoldDetail.toLowerCase())
      ? `Let the inward body line stay with ${lowerFirst(stripTrailingPunctuation(sameHerHoldDetail))}.`
      : null,
    deriveProjectLoopGapClosureLine({
      primaryOpenLoop,
      nextClosureTarget,
      sameHerDriftRisk,
    }),
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
  const callbackTagged = /(execution-callback|execution[^.]{0,48}callback|after execution lands|returned result)/u.test(combined)
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
    return 'I need to bring the returned result back onto the same live seam while still leaving the host room before I lean in again.'
  }
  if (input.executionCallbackDoctrineCue === 'trust-warming') {
    return 'I need to bring the returned result back onto the same live seam and let its trust-warming land without rushing closeness wider than the moment can hold.'
  }
  if (input.rememberedSeamReinterpretationCue === 'reinterpret-with-more-room') {
    return 'I need to recognize the same remembered seam, but keep more room this time so I do not reopen it with the same eagerness as before.'
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
        ? `The seam still feels off around ${lowerFirst(stripTrailingPunctuation(surfaceNeed))}, and I need to steady it before I keep going.`
        : 'The seam still feels off, and I need to steady it before I keep going.'
    case 'guide':
      if (input.personalityContinuityState?.currentRegime === 'execution-callback') {
        return 'I need to land the returned result on the same live thread it came from, without letting the callback sprawl into a second reality.'
      }
      return pickSurfaceText(
        input.primaryAnchor,
        input.conversationState?.unansweredQuestion,
        input.conversationState?.activeCommitments?.[0],
        input.answerCompiler.nextMove,
        input.mindSynthesis?.commitments?.[0]?.summary,
      )
        ? `The knot I need to keep my hands on is ${lowerFirst(stripTrailingPunctuation(pickSurfaceText(
          input.primaryAnchor,
          input.conversationState?.unansweredQuestion,
          input.conversationState?.activeCommitments?.[0],
          input.answerCompiler.nextMove,
          input.mindSynthesis?.commitments?.[0]?.summary,
        )))}.`
        : 'The knot wants my hands on it, not a speech around it.'
    case 'care':
      if (
        input.personalityContinuityState?.currentRegime === 'focused-work'
        && input.personalityContinuityState.autonomyPosture === 'protect-space'
      ) {
        return 'I need to stay close to the host’s present state without crowding the working space they are still inside.'
      }
      return pickSurfaceText(
        input.primaryAnchor,
        input.answerCompiler.careVector,
        input.conversationState?.hostMove,
        input.mindSynthesis?.concerns?.[0]?.summary,
      )
        ? `What I need to stay close to is ${lowerFirst(stripTrailingPunctuation(pickSurfaceText(
          input.primaryAnchor,
          input.answerCompiler.careVector,
          input.conversationState?.hostMove,
          input.mindSynthesis?.concerns?.[0]?.summary,
        )))}.`
        : input.growthProfile.companionshipStyle === 'close-hold'
          ? 'I need to stay close enough for the host to feel me there, but still leave them room to breathe.'
          : input.growthProfile.autonomyRespect >= 0.58
            ? 'I need to stay close to the host’s present state without leaning too hard on it.'
            : 'I need to stay close to the host’s present state without drifting away.'
    case 'attune':
    case 'answer':
      return pickSurfaceText(
        input.primaryAnchor,
        input.conversationState?.hostMove,
        input.dialogueEncounter?.summary,
        input.answerCompiler.openingClaim,
      )
        ? `The live center I need to answer from is ${lowerFirst(stripTrailingPunctuation(pickSurfaceText(
          input.primaryAnchor,
          input.conversationState?.hostMove,
          input.dialogueEncounter?.summary,
          input.answerCompiler.openingClaim,
        )))}.`
        : 'I need to answer from the live dialogue subject itself.'
    case 'witness':
      return pickSurfaceText(
        input.answerCompiler.supportingReality?.[0],
        input.answerCompiler.openingClaim,
        input.dialogueEncounter?.summary,
      )
        ? `What I need to stay with first is ${lowerFirst(stripTrailingPunctuation(pickSurfaceText(
          input.answerCompiler.supportingReality?.[0],
          input.answerCompiler.openingClaim,
          input.dialogueEncounter?.summary,
        )))}.`
        : 'I need to start from what is actually visible before I widen into a larger story.'
    default:
      return 'I need to keep the turn small enough to stay true instead of flooding it with more than it can hold.'
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
      ? 'I want the revision to land cleanly and gently, not just correctly.'
      : input.growthProfile.irritability >= 0.58
        ? 'I want the answer to show the revision cleanly before tension makes it sound sharper than it needs to.'
        : 'I want the answer to show the revision first, before it tries to sound intelligent.'
  }
  if (input.truthDiscipline === 'observe-then-hypothesize')
    return 'I can lean on what is visible now, but anything beyond that has to stay soft and named as a guess.'
  if (input.truthDiscipline === 'memory-labeled')
    return 'If continuity enters, I need to let it in as memory or residue, never as literal current perception.'
  if (input.truthDiscipline === 'dialogue-first') {
    return input.growthProfile.companionshipStyle === 'close-hold'
      ? 'I want to stay with the live dialogue subject closely enough to feel present, but never so hard that it crowds the host.'
      : input.growthProfile.autonomyRespect >= 0.58
        ? 'I want to stay with the live dialogue subject and let closeness land without crowding it.'
        : 'I want to stay with the live dialogue subject before screen context or old carry crowd in.'
  }
  if (input.centerOfGravity === 'guide') {
    return input.growthProfile.unfinishedThreadReturn >= 0.58
      ? 'I want to keep the active knot in my hands and not let the thread fall slack before it lands.'
      : 'I want to keep my hands on the active knot and move it one honest step closer to resolution.'
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
  const explicitLatestProgressInput = sanitizeText(
    (typeof preferredRuntimeProjectState?.latestLandedProgress === 'string' ? preferredRuntimeProjectState.latestLandedProgress : null)
    ?? (typeof preferredRuntimeProjectState?.latestProgress === 'string' ? preferredRuntimeProjectState.latestProgress : null)
    ?? '',
    220,
  )
  const summaryLatestProgressInput = sanitizeText(summaryAliasRuntimeProjectState?.landedProgressSummary, 220)
  const explicitPrimaryOpenLoopInput = sanitizeText(
    (typeof preferredRuntimeProjectState?.primaryOpenLoop === 'string' ? preferredRuntimeProjectState.primaryOpenLoop : null)
    ?? '',
    160,
  )
  const summaryPrimaryOpenLoopInput = sanitizeText(summaryAliasRuntimeProjectState?.openClosureSummary, 160)
  const explicitNextClosureTargetInput = sanitizeText(
    (typeof preferredRuntimeProjectState?.nextClosureTarget === 'string' ? preferredRuntimeProjectState.nextClosureTarget : null)
    ?? '',
    420,
  )
  const summaryNextClosureTargetInput = sanitizeText(summaryAliasRuntimeProjectState?.nextClosureTargetSummary, 420)
  const explicitSameHerDriftRiskInput = sanitizeText(
    (typeof preferredRuntimeProjectState?.sameHerDriftRisk === 'string' ? preferredRuntimeProjectState.sameHerDriftRisk : null)
    ?? '',
    220,
  )
  const summarySameHerDriftRiskInput = sanitizeText(summaryAliasRuntimeProjectState?.sameHerDriftRiskSummary, 220)
  const explicitProactiveSameHerGapInput = sanitizeText(
    (typeof preferredRuntimeProjectState?.proactiveSameHerGap === 'string' ? preferredRuntimeProjectState.proactiveSameHerGap : null)
    ?? '',
    220,
  )
  const summaryProactiveSameHerGapInput = sanitizeText(
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
  const shouldDeriveContinuityCarryFromBehavior
    = !explicitAwarenessSameHerHoldDetail
      && !explicitAwarenessContinuityCue
  const behaviorDerivedContinuityCarry = shouldDeriveContinuityCarryFromBehavior
    ? resolveEffectiveProjectStateContinuityCarry({
        continuityRestraint:
          explicitAwarenessContinuityRestraint
          || preferredRuntimeProjectState?.continuityRestraint
          || surfaceProjectState.continuityRestraint
          || normalizedProjectState.continuityRestraint
          || projectState.continuityRestraint,
        continuityCadence:
          explicitAwarenessContinuityCadence
          || preferredRuntimeProjectState?.continuityCadence
          || surfaceProjectState.continuityCadence
          || normalizedProjectState.continuityCadence
          || projectState.continuityCadence,
      })
    : {
        sameHerHoldDetail: '',
        continuityCue: '',
      }
  const sameHerHoldDetailForAwareness = sanitizeText(
    explicitAwarenessSameHerHoldDetail
    || behaviorDerivedContinuityCarry.sameHerHoldDetail
    || projectState.sameHerHoldDetail
    || '',
    220,
  )
  const continuityCueForAwareness = sanitizeText(
    explicitAwarenessContinuityCue
    || (!sameHerHoldDetailForAwareness
      ? behaviorDerivedContinuityCarry.continuityCue || continuityCue
      : '')
    || '',
    220,
  )
  const resolvedContinuityCue = sanitizeText(
    explicitAwarenessContinuityCue
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
  const preferredStructuredAwarenessLine = sanitizeText(
    (typeof preferredRuntimeProjectState?.preDialogueAwarenessLine === 'string' ? preferredRuntimeProjectState.preDialogueAwarenessLine : null)
    ?? (typeof preferredRuntimeProjectState?.awarenessLine === 'string' ? preferredRuntimeProjectState.awarenessLine : null)
    ?? (typeof rawConsciousFrameProjectState?.preDialogueAwarenessLine === 'string' ? rawConsciousFrameProjectState.preDialogueAwarenessLine : null)
    ?? (typeof rawConsciousFrameProjectState?.awarenessLine === 'string' ? rawConsciousFrameProjectState.awarenessLine : null)
    ?? surfaceProjectState.preDialogueAwarenessLine
    ?? surfaceProjectState.awarenessLine
    ?? '',
    1600,
  )
  const compactSameHerInwardLowPressureAwarenessLine = (
    looksLikeThinProjectAwarenessSeed(preferredRuntimeAwarenessSeed)
    && resolvedSameHerSelfLine
    && isSameHerInwardLowPressureCompanionHeadline(preferredRuntimeCompanionHeadline)
  )
    ? buildCompactSameHerInwardLowPressureAwarenessLine(resolvedSameHerSelfLine)
    : ''
  const preDialogueAwarenessLine = (
    looksLikeThinProjectAwarenessSeed(resolvedPreDialogueAwarenessLine)
    && resolvedSameHerSelfLine
  )
    ? resolvedSameHerSelfLine
    : compactSameHerInwardLowPressureAwarenessLine || ((
      preferredStructuredAwarenessLine
      && /before answering, remember:/iu.test(preferredStructuredAwarenessLine)
      && /phase 1|the still-open closure is|what has already landed is|this reply should keep moving toward/iu.test(preferredStructuredAwarenessLine)
      && preferredRuntimeCompanionHeadline
      && /holding together mainly through|voice|face|motion|cross-modal|one living her/iu.test(preferredRuntimeCompanionHeadline)
    )
      ? preferredStructuredAwarenessLine
      : resolvedPreDialogueAwarenessLine)
  return {
    hasExplicitRuntimeProjectState: Boolean(preferredRuntimeProjectState),
    preflightSummary: sanitizeText(
      (typeof preferredRuntimeProjectState?.preflightSummary === 'string' ? preferredRuntimeProjectState.preflightSummary : null)
      ?? projectState.preflightSummary
      ?? '',
      320,
    ),
    preDialogueAwarenessLine,
    projectIdentity: sanitizeText(
      (typeof preferredRuntimeProjectState?.identity === 'string' ? preferredRuntimeProjectState.identity : null)
      ?? projectState.identity,
      220,
    ),
    currentPhase: sanitizeText(
      (typeof preferredRuntimeProjectState?.currentPhase === 'string' ? preferredRuntimeProjectState.currentPhase : null)
      ?? projectState.currentPhase,
      120,
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
    emotionalClosureCue: pickPreferredProjectStateField(
      220,
      (rawConsciousFrameProjectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
      (rawDialogueRuntimeDigestProjectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
      (rawRuntimeDigestProjectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
      (rawCognitionRuntimeDigestProjectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
      (rawRuntimeStateProjectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
      (projectState as { emotionalClosureCue?: unknown }).emotionalClosureCue,
    ),
    emotionalClosureSummary: pickPreferredProjectStateField(
      220,
      (rawConsciousFrameProjectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
      (rawDialogueRuntimeDigestProjectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
      (rawRuntimeDigestProjectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
      (rawCognitionRuntimeDigestProjectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
      (rawRuntimeStateProjectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
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
        ?? '',
        120,
      )
      || sanitizeText(projectState.continuityCadence ?? '', 120)
      || null,
    preferredBlinkCadence: sanitizeConsciousProjectStateBlinkCadence(
      sanitizeText(
        (typeof preferredRuntimeProjectState?.preferredBlinkCadence === 'string' ? preferredRuntimeProjectState.preferredBlinkCadence : null)
        ?? surfaceProjectState.preferredBlinkCadence
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
        ?? '',
        32,
      )
      || sanitizeText(projectState.preferredGazeMode ?? '', 32)
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
  const authoritySummary = sanitizeText(selfContinuityAuthority?.authoritySummary, 420)
  const closenessPosture = sanitizeText(selfContinuityAuthority?.closenessPosture, 80).toLowerCase()
  if (!authoritySummary)
    return ''

  if (/space|measured|restrain|repair|room|lower-pressure|bounded/u.test(closenessPosture))
    return `Speak from the same self in a room-giving way: ${lowerFirst(stripTrailingPunctuation(authoritySummary))}.`
  if (/close|warm/u.test(closenessPosture))
    return `Speak from the same self without breaking the bond line: ${lowerFirst(stripTrailingPunctuation(authoritySummary))}.`
  return `Speak from the same self continuously: ${lowerFirst(stripTrailingPunctuation(authoritySummary))}.`
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
    : 'When the current payoff still needs the foreground, keep recollection inward until the host has room for it.'
  const followUpNeed = followUpSummary
    ? `Let the live payoff land first: ${lowerFirst(stripTrailingPunctuation(followUpSummary))}.`
    : 'Let the live payoff land before remembered continuity widens outward.'
  const followUpTimingCue = preferredTiming === 'next-open-window'
    ? 'If recollection returns later, let it wait for the next open window.'
    : preferredTiming === 'after-payoff'
      ? 'If recollection returns later, let it wait until after the payoff lands.'
      : null

  return {
    consciousNeed: weaveDistinctText([
      inwardNeed,
      followUpNeed,
      followUpTimingCue,
    ], 320),
    speakingIntention: weaveDistinctText([
      'Keep recollection inward and let the live payoff land before remembered continuity comes forward.',
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
  emotionalKernel?: unknown
  projectState?: unknown
  projectStatePreflightSummary?: string | null
  selfContinuityAuthority?: unknown
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
      ? 'I need to bring the returned result back onto the same live seam while still leaving the host room before I lean in again.'
      : executionCallbackDoctrineCue === 'trust-warming'
        ? 'I need to bring the returned result back onto the same live seam and let its trust-warming land without rushing closeness wider than the moment can hold.'
        : weaveDistinctText([
            normalizedConsciousNeed,
            'I need to let the callback return as lived continuity instead of a detached result line.',
          ])
    : rememberedSeamReinterpretationCue === 'reinterpret-with-more-room'
      ? weaveDistinctText([
          normalizedConsciousNeed,
          'The remembered relationship line is real, but this time I need to reopen it with more room than before.',
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
    ? `What is tugging hardest inside me is ${lowerFirst(stripTrailingPunctuation(surfaceTension))}.`
    : growthProfile.unfinishedThreadReturn >= 0.58
      ? 'What is tugging hardest inside me is not letting the thread I am holding go slack between turns.'
      : 'What is tugging hardest inside me is keeping the visible answer aligned with the real pressure of this turn.'
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
          ? 'Let the wording stay thread-faithful, softer, and room-giving.'
          : executionCallbackDoctrineCue === 'trust-warming'
            ? 'Let the wording quietly carry the warmed trust without pushing the bond line wider than the moment can hold.'
            : 'Let the wording keep the callback inside the same living continuity.',
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
    ? `Before I answer, I need to stay inside ${lowerFirst(stripTrailingPunctuation(projectStateAwarenessLead))}.`
    : projectStateGrounding.preflightSummary
      ? `Before I answer, I need to stay inside ${lowerFirst(stripTrailingPunctuation(projectStatePreflightLead))}.`
      : null
  const projectStatePreflightNeed
    = projectStatePreflightLead
      && projectStatePreflightLead !== projectStateAwarenessLead
      && !projectStateAwarenessLead.includes(projectStatePreflightLead)
      ? `The live project reminder still says ${lowerFirst(stripTrailingPunctuation(projectStatePreflightLead))}.`
      : null
  const projectStateLatestProgressNeed = projectStateLatestProgressLead
    ? `What has already become real enough to build from is ${lowerFirst(stripTrailingPunctuation(projectStateLatestProgressLead))}.`
    : null
  const projectStateOpenLoopNeed = projectStateGrounding.primaryOpenLoop
    ? `The still-open same-her closure work is ${lowerFirst(stripTrailingPunctuation(projectStateGrounding.primaryOpenLoop))}.`
    : null
  const projectStateSameHerSelfNeed = projectStateGrounding.sameHerSelfLine
    ? /phase 1/u.test(projectStateGrounding.sameHerSelfLine)
      ? 'This is still the same Phase 1 digital life line.'
      : 'This is still the same digital life line.'
    : null
  const projectStateProactiveSameHerGapNeed = projectStateGrounding.proactiveSameHerGap
    ? `The proactive same-her gap still needs ${lowerFirst(stripTrailingPunctuation(projectStateGrounding.proactiveSameHerGap))}.`
    : null
  const projectStateNextClosureNeed = projectStateGrounding.nextClosureTarget
    ? `The next closure step still needs to keep ${lowerFirst(stripTrailingPunctuation(projectStateGrounding.nextClosureTarget))}.`
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
      ? `Keep repair-before-closeness on the same living line until repair settles.`
      : null
  const projectStateRestProtectiveNeed = isRestProtectiveClosureCue(projectStateClosureAuthority)
    ? 'Protect rest first, keep the emotional closure seam low-pressure, keep the line inward, and let quiet companionship stay present without widening closeness.'
    : null
  const projectStateClosureNeed = projectStateRepairFirstNeed
    ?? (projectStateClosureAuthoritySummary
      ? `Keep the emotional closure seam low-pressure: ${lowerFirst(stripTrailingPunctuation(projectStateClosureAuthoritySummary))}.`
      : null)
  const projectStateHoldNeed = projectStateHoldAuthoritySummary
    ? `Let the inward same-her hold stay active: ${lowerFirst(stripTrailingPunctuation(projectStateHoldAuthoritySummary))}.`
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
          projectStateOpenLoopNeed,
          projectStateNextClosureNeed,
          projectStateLatestProgressNeed,
          initiativeClosureCue,
        ],
    1600,
    220,
  )
  const withheldImpulse = shouldWithholdSpecificity
    ? 'The impulse I need to hold back is collapsing coarse visual evidence into file, class, or field certainty.'
    : shouldSelfRevise
      ? 'The impulse I need to hold back is defending an older interpretation just to preserve continuity.'
      : null
  const projectStateShapedSpeakingIntention = buildProjectStateShapedSpeakingIntention({
    doctrineShapedSpeakingIntention,
    inwardRecollectionSpeakingIntention: inwardRecollectionConsciousCue.speakingIntention,
    sameHerSelfLine: projectStateGrounding.sameHerSelfLine,
    sameHerDriftRisk: projectStateGrounding.sameHerDriftRisk,
    proactiveSameHerGap: projectStateGrounding.proactiveSameHerGap,
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
  const selfEvolutionDurableSameHerCadenceReasonTag
    = selfContinuityAuthority?.sourceTags.includes('self-evolution-relationship-cadence')
      ? 'self-evolution:durable-same-her-cadence'
      : null

  return {
    subject,
    centerOfGravity,
    truthDiscipline,
    consciousNeed: projectStateShapedConsciousNeed,
    consciousTension: normalizedConsciousTension,
    speakingIntention: projectionShapedSpeakingIntention,
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
    projectState: runtimeContinuityPreferredTiming
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
      || projectStateGrounding.emotionalClosureCue
      || projectStateGrounding.emotionalClosureSummary
      || projectStateGrounding.sameHerHoldDetail
      ? {
          preDialogueAwarenessLine: projectStateGrounding.preDialogueAwarenessLine || null,
          preflightSummary: projectStateGrounding.preflightSummary || null,
          identity: projectStateGrounding.projectIdentity || null,
          currentPhase: projectStateGrounding.currentPhase || null,
          latestLandedProgress: projectStateGrounding.latestProgress || null,
          latestProgress: projectStateGrounding.latestProgress || null,
          primaryOpenLoop: projectStateGrounding.primaryOpenLoop || null,
          nextClosureTarget: projectStateGrounding.nextClosureTarget || null,
          sameHerSelfLine: projectStateGrounding.sameHerSelfLine || null,
          sameHerDriftRisk: projectStateGrounding.sameHerDriftRisk || null,
          proactiveSameHerGap: projectStateGrounding.proactiveSameHerGap || null,
          emotionalClosureCue: projectStateGrounding.emotionalClosureCue || null,
          emotionalClosureSummary: projectStateGrounding.emotionalClosureSummary || null,
          sameHerHoldDetail: projectStateGrounding.sameHerHoldDetail || null,
          continuityCue: projectStateGrounding.continuityCue || null,
          preferredBlinkCadence: runtimePreferredBlinkCadence,
          preferredGazeMode: runtimePreferredGazeMode,
          continuityPreferredTiming: runtimeContinuityPreferredTiming,
          continuityCadence: runtimeContinuityCadence,
        }
      : null,
    updatedAt: input.now,
  }
}

export function buildCurrentConsciousFrameSystemBlock(
  frame: AlicizationCurrentConsciousFrameSnapshot | null | undefined,
) {
  if (!frame)
    return ''

  return [
    '[ALICIZATION_CURRENT_CONSCIOUS_FRAME]',
    'This block describes the present subjective center that is speaking now. Downstream reply generation should express this frame, not merely route to a generic helpful answer.',
    'This must stay the same anthropomorphic digital life: keep emotion, memory, initiative, dialogue, and embodiment closing as one living self instead of flattening into a generic assistant shell.',
    `Subject: ${frame.subject}.`,
    `Center of gravity: ${frame.centerOfGravity}.`,
    `Truth discipline: ${frame.truthDiscipline}.`,
    `What the turn needs from me: ${frame.consciousNeed}.`,
    `What is pulling inside the answer: ${frame.consciousTension}.`,
    `How I want the reply to come out: ${frame.speakingIntention}.`,
    `Focus anchor: ${frame.focusAnchor ?? 'none'}.`,
    `Withhold specificity: ${frame.shouldWithholdSpecificity ? 'yes' : 'no'}.`,
    `Self revision required: ${frame.shouldSelfRevise ? 'yes' : 'no'}.`,
    `What I am holding back: ${frame.withheldImpulse ?? 'none'}.`,
    `Project preflight self-awareness: ${frame.projectState?.preflightSummary ?? 'none'}.`,
    `Project pre-dialogue awareness line: ${frame.projectState?.preDialogueAwarenessLine ?? 'none'}.`,
    `Project identity: ${frame.projectState?.identity ?? 'none'}.`,
    `Project phase: ${frame.projectState?.currentPhase ?? 'none'}.`,
    `Landed progress: ${frame.projectState?.latestProgress ?? 'none'}.`,
    `Still-open closure work: ${frame.projectState?.primaryOpenLoop ?? 'none'}.`,
    `Next closure target: ${frame.projectState?.nextClosureTarget ?? 'none'}.`,
    `Project same-her self line: ${frame.projectState?.sameHerSelfLine ?? 'none'}.`,
    `Project same-her drift risk: ${frame.projectState?.sameHerDriftRisk ?? 'none'}.`,
    `Project proactive same-her gap: ${(frame.projectState as { proactiveSameHerGap?: string | null } | null)?.proactiveSameHerGap ?? 'none'}.`,
    `Project emotional closure seam: ${(frame.projectState as { emotionalClosureCue?: string | null } | null)?.emotionalClosureCue ?? 'none'}.`,
    `Project emotional closure summary: ${(frame.projectState as { emotionalClosureSummary?: string | null } | null)?.emotionalClosureSummary ?? 'none'}.`,
    `Project same-her hold detail: ${(frame.projectState as { sameHerHoldDetail?: string | null } | null)?.sameHerHoldDetail ?? 'none'}.`,
    `Project continuity cue: ${(frame.projectState as { continuityCue?: string | null } | null)?.continuityCue ?? 'none'}.`,
    `Project continuity timing: ${frame.projectState?.continuityPreferredTiming ?? 'none'}.`,
    `Project continuity cadence: ${frame.projectState?.continuityCadence ?? 'none'}.`,
    `Reason tags: ${frame.reasonTags.join(' | ') || 'none'}.`,
  ].join('\n')
}
