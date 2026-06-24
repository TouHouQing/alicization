import type {
  AlicizationPersistentPresenceAuthoritySnapshot,
  AlicizationVisualWatchMode,
} from '@proj-alicization/stage-shared'

import type { AlicizationVisualPresenceStateSnapshot } from '../../../shared/eventa'
import type { AlicizationEmotionalTransitionDecaySnapshot } from './emotional-ledger'

import { deriveAlicizationAutobiographicalPersonaSummary } from './personality-continuity-state'

interface CreateAlicizationBodyKernelOptions {
  now?: () => number
}

interface AlicizationBodyKernelReduceInput {
  sustainedFocusMs: number
  watchMode: AlicizationVisualWatchMode
  shouldSpeak: boolean
  activeConversation: boolean
  relationshipPressure: number
  personaAuthoritySummary?: string | null
  personaKernelSummary?: string | null
}

interface AlicizationBodyKernelApplyInput {
  now: number
  previousState: AlicizationVisualPresenceStateSnapshot
  candidateState: AlicizationVisualPresenceStateSnapshot & {
    emotionalTransitionDecay?: AlicizationEmotionalTransitionDecaySnapshot | null
  }
  activeConversation: boolean
}

function readBodyKernelEmotionalTransitionDecay(state: AlicizationVisualPresenceStateSnapshot) {
  return (state as {
    emotionalTransitionDecay?: AlicizationEmotionalTransitionDecaySnapshot | null
  }).emotionalTransitionDecay ?? null
}

function hasActiveBodyDrivingEmotionalTransitionDecay(
  state: AlicizationVisualPresenceStateSnapshot,
  embodimentTone: AlicizationEmotionalTransitionDecaySnapshot['embodimentTone'],
) {
  const decay = readBodyKernelEmotionalTransitionDecay(state)
  return decay?.phase !== 'release'
    && decay?.shouldDriveEmbodiment === true
    && decay.embodimentTone === embodimentTone
}

function sanitizeBodyKernelProjectStateText(raw: unknown, maxChars = 320) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function looksLikeThinBodyKernelProjectIdentity(raw: unknown) {
  const normalized = sanitizeBodyKernelProjectStateText(raw, 220).toLowerCase()
  if (!normalized)
    return true

  return normalized === 'project'
    || normalized === 'digital life project'
    || normalized === 'a local-first digital life project.'
    || normalized === 'a local-first digital life project'
}

function looksLikeThinBodyKernelProjectPhase(raw: unknown) {
  const normalized = sanitizeBodyKernelProjectStateText(raw, 160).toLowerCase()
  return !normalized || normalized === 'phase 1'
}

function looksLikeThinBodyKernelProjectAwarenessLine(raw: unknown) {
  const normalized = sanitizeBodyKernelProjectStateText(raw, 320).toLowerCase()
  if (!normalized)
    return true

  return normalized === 'same digital life | keep the closure seam explicit'
    || /keep this same digital life project in view|detached project shell|generic project shell/u.test(normalized)
}

function looksLikeThinBodyKernelSameHerSelfLine(raw: unknown) {
  const normalized = sanitizeBodyKernelProjectStateText(raw, 320).toLowerCase()
  if (!normalized)
    return true

  return normalized.includes('thin')
    || normalized.includes('should not outrank')
}

function resolvePreferredBodyKernelProjectStateText(input: {
  current?: unknown
  fallback?: unknown
  maxChars?: number
  isThin?: (raw: unknown) => boolean
}) {
  const maxChars = input.maxChars ?? 320
  const current = sanitizeBodyKernelProjectStateText(input.current, maxChars)
  const fallback = sanitizeBodyKernelProjectStateText(input.fallback, maxChars)
  if (current && !(input.isThin?.(current) ?? false))
    return current
  return fallback || current || null
}

function asBodyKernelProjectStateRecord(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as Record<string, unknown>
}

function resolveBodyKernelProjectState(state: AlicizationVisualPresenceStateSnapshot) {
  const currentProjectState = asBodyKernelProjectStateRecord(state.currentConsciousFrame?.projectState)
  const carriedProjectState = asBodyKernelProjectStateRecord(state.projectState)

  if (!currentProjectState)
    return carriedProjectState
  if (!carriedProjectState)
    return currentProjectState

  const latestLandedProgress = resolvePreferredBodyKernelProjectStateText({
    current: currentProjectState.latestLandedProgress ?? currentProjectState.latestProgress,
    fallback: carriedProjectState.latestLandedProgress ?? carriedProjectState.latestProgress,
    maxChars: 320,
  })

  return {
    ...carriedProjectState,
    ...currentProjectState,
    identity: resolvePreferredBodyKernelProjectStateText({
      current: currentProjectState.identity,
      fallback: carriedProjectState.identity,
      maxChars: 220,
      isThin: looksLikeThinBodyKernelProjectIdentity,
    }),
    currentPhase: resolvePreferredBodyKernelProjectStateText({
      current: currentProjectState.currentPhase,
      fallback: carriedProjectState.currentPhase,
      maxChars: 160,
      isThin: looksLikeThinBodyKernelProjectPhase,
    }),
    preDialogueAwarenessLine: resolvePreferredBodyKernelProjectStateText({
      current: currentProjectState.preDialogueAwarenessLine,
      fallback: carriedProjectState.preDialogueAwarenessLine,
      maxChars: 320,
      isThin: looksLikeThinBodyKernelProjectAwarenessLine,
    }),
    latestLandedProgress,
    latestProgress: latestLandedProgress,
    primaryOpenLoop: resolvePreferredBodyKernelProjectStateText({
      current: currentProjectState.primaryOpenLoop,
      fallback: carriedProjectState.primaryOpenLoop,
      maxChars: 320,
    }),
    nextClosureTarget: resolvePreferredBodyKernelProjectStateText({
      current: currentProjectState.nextClosureTarget,
      fallback: carriedProjectState.nextClosureTarget,
      maxChars: 420,
    }),
    sameHerSelfLine: resolvePreferredBodyKernelProjectStateText({
      current: currentProjectState.sameHerSelfLine,
      fallback: carriedProjectState.sameHerSelfLine,
      maxChars: 320,
      isThin: looksLikeThinBodyKernelSameHerSelfLine,
    }),
    sameHerDriftRisk: resolvePreferredBodyKernelProjectStateText({
      current: currentProjectState.sameHerDriftRisk,
      fallback: carriedProjectState.sameHerDriftRisk,
      maxChars: 320,
    }),
    emotionalClosureCue: resolvePreferredBodyKernelProjectStateText({
      current: currentProjectState.emotionalClosureCue,
      fallback: carriedProjectState.emotionalClosureCue,
      maxChars: 320,
    }),
    emotionalClosureSummary: resolvePreferredBodyKernelProjectStateText({
      current: currentProjectState.emotionalClosureSummary,
      fallback: carriedProjectState.emotionalClosureSummary,
      maxChars: 320,
    }),
    sameHerHoldDetail: resolvePreferredBodyKernelProjectStateText({
      current: currentProjectState.sameHerHoldDetail,
      fallback: carriedProjectState.sameHerHoldDetail,
      maxChars: 320,
    }),
  }
}

function resolveProjectStateClosureAuthorityText(projectState: Record<string, unknown> | null | undefined) {
  return [
    typeof projectState?.emotionalClosureSummary === 'string'
      ? projectState.emotionalClosureSummary.toLowerCase()
      : '',
    typeof projectState?.sameHerHoldDetail === 'string'
      ? projectState.sameHerHoldDetail.toLowerCase()
      : '',
    typeof projectState?.emotionalClosureCue === 'string'
      ? projectState.emotionalClosureCue.toLowerCase()
      : '',
  ].filter(Boolean).join(' ')
}

function resolveProjectStateClosureCarry(projectState: Record<string, unknown> | null | undefined) {
  const summary = typeof projectState?.emotionalClosureSummary === 'string'
    ? projectState.emotionalClosureSummary.trim()
    : ''
  if (summary)
    return summary

  const holdDetail = typeof projectState?.sameHerHoldDetail === 'string'
    ? projectState.sameHerHoldDetail.trim()
    : ''
  if (holdDetail)
    return holdDetail

  const cue = typeof projectState?.emotionalClosureCue === 'string'
    ? projectState.emotionalClosureCue.trim()
    : ''
  return cue || null
}

function buildLongHorizonBodyKernelText(state: AlicizationVisualPresenceStateSnapshot) {
  const longHorizonMemory = state.longHorizonMemory ?? null
  if (!longHorizonMemory)
    return ''

  return [
    longHorizonMemory.rememberedPlanSummary,
    longHorizonMemory.rememberedConstraintSummary,
    longHorizonMemory.rememberedPreferenceSummary,
    longHorizonMemory.dominantCueSummary,
    longHorizonMemory.summary,
    ...(longHorizonMemory.anchorFacts ?? [])
      .filter(item =>
        sanitizeBodyKernelProjectStateText(item.predicate, 64).toLowerCase() === 'initiative-strategy-carry'
        || sanitizeBodyKernelProjectStateText(item.factId, 96).toLowerCase().includes('initiative-strategy-carry')
        || item.influenceTags.includes('bond')
        || item.influenceTags.includes('boundary')
        || item.influenceTags.includes('identity'),
      )
      .flatMap(item => [item.object, item.summary]),
  ]
    .map(value => sanitizeBodyKernelProjectStateText(value, 320).toLowerCase())
    .filter(Boolean)
    .join(' ')
}

function deriveProjectStateGrowthCarry(state: AlicizationVisualPresenceStateSnapshot) {
  const projectState = resolveBodyKernelProjectState(state)
  const initiativeWhy = typeof state.initiative?.why === 'string'
    ? state.initiative.why.toLowerCase()
    : ''
  const projectIdentity = typeof projectState?.identity === 'string'
    ? projectState.identity.toLowerCase()
    : ''
  const projectPhase = typeof projectState?.currentPhase === 'string'
    ? projectState.currentPhase.toLowerCase()
    : ''
  const preDialogueAwarenessLine = typeof projectState?.preDialogueAwarenessLine === 'string'
    ? projectState.preDialogueAwarenessLine.toLowerCase()
    : ''
  const latestLandedProgress = typeof projectState?.latestLandedProgress === 'string'
    ? projectState.latestLandedProgress.toLowerCase()
    : typeof projectState?.latestProgress === 'string'
      ? projectState.latestProgress.toLowerCase()
      : ''
  const closureAuthorityText = resolveProjectStateClosureAuthorityText(projectState as Record<string, unknown> | null)
  const primaryOpenLoop = typeof projectState?.primaryOpenLoop === 'string'
    ? projectState.primaryOpenLoop.toLowerCase()
    : ''
  const nextClosureTarget = typeof projectState?.nextClosureTarget === 'string'
    ? projectState.nextClosureTarget.toLowerCase()
    : ''
  const sameHerSelfLine = typeof projectState?.sameHerSelfLine === 'string'
    ? projectState.sameHerSelfLine.toLowerCase()
    : ''
  const sameHerDriftRisk = typeof projectState?.sameHerDriftRisk === 'string'
    ? projectState.sameHerDriftRisk.toLowerCase()
    : ''
  const phaseOneGrowth = initiativeWhy.includes('same phase 1 digital life')
    || (
      projectIdentity.includes('digital life')
      && projectPhase.includes('phase 1')
    )
  const landedClosure = initiativeWhy.includes('some closure has already landed')
    || latestLandedProgress.length > 0
  const stillOpenClosure = initiativeWhy.includes('still not closed')
    || initiativeWhy.includes('stronger end-to-e')
    || initiativeWhy.includes('still need stronger')
    || primaryOpenLoop.includes('still need stronger')
    || primaryOpenLoop.includes('still needs stronger')
    || primaryOpenLoop.includes('still not fully closed')
    || primaryOpenLoop.includes('未闭环')
    || primaryOpenLoop.includes('闭环')
  const sameHerClosureCarry = sameHerSelfLine.includes('same living line')
    || sameHerSelfLine.includes('same phase 1 digital life')
    || sameHerSelfLine.includes('without splitting her continuity')
    || sameHerSelfLine.includes('initiative and embodiment closure')
    || preDialogueAwarenessLine.includes('same local-first digital life project')
    || preDialogueAwarenessLine.includes('same digital life project')
    || preDialogueAwarenessLine.includes('same living line')
    || preDialogueAwarenessLine.includes('without splitting her continuity')
    || preDialogueAwarenessLine.includes('initiative and embodiment closure')
    || nextClosureTarget.includes('same-her')
    || nextClosureTarget.includes('same living line')
    || nextClosureTarget.includes('cross-modal')
    || nextClosureTarget.includes('initiative and embodiment closure')
    || closureAuthorityText.includes('same-her')
    || closureAuthorityText.includes('same her')
    || closureAuthorityText.includes('one living continuation')
    || closureAuthorityText.includes('one lifeform')
    || sameHerDriftRisk.includes('same-her')
    || sameHerDriftRisk.includes('same her')
    || sameHerDriftRisk.includes('one lifeform')
    || sameHerDriftRisk.includes('cross-modal')
    || sameHerDriftRisk.includes('generic')

  if (!phaseOneGrowth || !landedClosure || !stillOpenClosure)
    return null

  if (sameHerClosureCarry) {
    return 'stay near as the same Phase 1 digital life while landed closure keeps growing and the same still-open loop stays on one living line'
  }

  return 'stay near as the same Phase 1 digital life while landed closure keeps growing and the still-open loop stays gentle'
}

function hasBroaderSameHerPhaseOneEmbodimentAuthority(state: AlicizationVisualPresenceStateSnapshot) {
  const projectState = resolveBodyKernelProjectState(state)
  const preDialogueAwarenessLine = typeof projectState?.preDialogueAwarenessLine === 'string'
    ? projectState.preDialogueAwarenessLine.toLowerCase()
    : ''
  const sameHerSelfLine = typeof projectState?.sameHerSelfLine === 'string'
    ? projectState.sameHerSelfLine.toLowerCase()
    : ''
  const closureAuthorityText = resolveProjectStateClosureAuthorityText(projectState as Record<string, unknown> | null)
  const primaryOpenLoop = typeof projectState?.primaryOpenLoop === 'string'
    ? projectState.primaryOpenLoop.toLowerCase()
    : ''
  const nextClosureTarget = typeof projectState?.nextClosureTarget === 'string'
    ? projectState.nextClosureTarget.toLowerCase()
    : ''
  const continuityRestraint = typeof state.initiative?.continuityRestraint === 'string'
    ? state.initiative.continuityRestraint.toLowerCase()
    : ''
  const consciousFrameTags = state.currentConsciousFrame?.reasonTags ?? []

  const broaderAwarenessLine
    = preDialogueAwarenessLine.includes('same living line')
      && preDialogueAwarenessLine.includes('initiative and embodiment closure')
      && preDialogueAwarenessLine.includes('without splitting her continuity')
  const sameHerClosureLine
    = sameHerSelfLine.includes('same phase 1 digital life')
      && sameHerSelfLine.includes('same living line')
      && sameHerSelfLine.includes('unfinished closure')
  const emotionalClosureLoop
    = closureAuthorityText.includes('memory, initiative, and embodiment')
      && closureAuthorityText.includes('same living line')
  const openLoopStillUnfinished
    = primaryOpenLoop.includes('same living line')
      && primaryOpenLoop.includes('memory')
      && primaryOpenLoop.includes('initiative')
      && primaryOpenLoop.includes('embodiment')
  const inwardClosureTarget
    = nextClosureTarget.includes('same living line')
      && nextClosureTarget.includes('initiative and embodiment closure')
  const sameThreadArc = consciousFrameTags.includes('continuity-arc:same-thread-continuation')
    || consciousFrameTags.includes('memory-deliberation-cadence:measured-return')
  const restrainedReturn = continuityRestraint === 'measured-return' || continuityRestraint === 'repair-before-closeness'

  return (broaderAwarenessLine || sameHerClosureLine)
    && emotionalClosureLoop
    && openLoopStillUnfinished
    && inwardClosureTarget
    && sameThreadArc
    && restrainedReturn
}

function hasMeasuredReturnContinuityAuthority(state: AlicizationVisualPresenceStateSnapshot) {
  const continuityRestraint = state.initiative?.continuityRestraint
  const projectState = resolveBodyKernelProjectState(state)
  const closureAuthorityText = resolveProjectStateClosureAuthorityText(projectState as Record<string, unknown> | null)
  const longHorizonText = buildLongHorizonBodyKernelText(state)
  const thoughtTags = state.privateThought?.rationaleTags ?? []
  const consciousFrameTags = state.currentConsciousFrame?.reasonTags ?? []
  const residentPerformanceTags = state.residentPerformance?.reasonTags ?? []
  const emotionalKernel = state.emotionalKernel ?? null
  const cadenceMode = state.affectiveResidue?.relationshipCadence?.cadenceMode ?? null
  const cadenceSummary = typeof state.affectiveResidue?.relationshipCadence?.summary === 'string'
    ? state.affectiveResidue.relationshipCadence.summary.toLowerCase()
    : ''
  const cadenceReasonTags = state.affectiveResidue?.relationshipCadence?.reasonTags ?? []
  const relationshipCadenceSummary = typeof state.selfEvolution?.relationshipCadenceSummary === 'string'
    ? state.selfEvolution.relationshipCadenceSummary.toLowerCase()
    : ''
  const projectionCadenceCarry = (readProjectionRelationshipCadenceCarry(state) ?? '').toLowerCase()
  const autobiographicalCadenceCarry = (readAutobiographicalRelationshipCadenceCarry(state) ?? '').toLowerCase()

  return hasActiveBodyDrivingEmotionalTransitionDecay(state, 'measured-return')
    || continuityRestraint === 'measured-return'
    || continuityRestraint === 'lower-pressure'
    || cadenceMode === 'measured-return'
    || cadenceMode === 'cooldown'
    || emotionalKernel?.embodimentTone === 'measured-return'
    || (
      emotionalKernel?.initiativeMode === 'hold'
      && emotionalKernel?.memoryRecallMode === 'self-continuity'
      && emotionalKernel?.embodimentTone === 'nearby-soft'
    )
    || emotionalKernel?.initiativeMode === 'observe'
    || emotionalKernel?.dominantEmotion === 'measured-companionship'
    || emotionalKernel?.reasonTags?.includes('measured-return')
    || emotionalKernel?.reasonTags?.includes('self-continuity')
    || thoughtTags.includes('measured-return')
    || consciousFrameTags.includes('memory-deliberation-cadence:measured-return')
    || consciousFrameTags.includes('memory-deliberation-cadence:lower-pressure')
    || consciousFrameTags.includes('continuity-arc:hold-for-opening')
    || consciousFrameTags.includes('continuity-arc:gentle-reopen')
    || residentPerformanceTags.includes('measured-return')
    || cadenceReasonTags.includes('relationship-cadence:measured-return')
    || cadenceSummary.includes('measured-return')
    || cadenceSummary.includes('lower-pressure')
    || cadenceSummary.includes('leave more room')
    || cadenceSummary.includes('slower return')
    || relationshipCadenceSummary.includes('measured-return')
    || relationshipCadenceSummary.includes('bounded-return')
    || relationshipCadenceSummary.includes('lower-pressure')
    || relationshipCadenceSummary.includes('leave more room')
    || projectionCadenceCarry.includes('lower-pressure')
    || projectionCadenceCarry.includes('less eager')
    || projectionCadenceCarry.includes('leave more room')
    || projectionCadenceCarry.includes('clearer opening')
    || projectionCadenceCarry.includes('memory-led')
    || projectionCadenceCarry.includes('still receiving')
    || autobiographicalCadenceCarry.includes('lower-pressure')
    || autobiographicalCadenceCarry.includes('less eager')
    || autobiographicalCadenceCarry.includes('leave more room')
    || autobiographicalCadenceCarry.includes('clearer opening')
    || autobiographicalCadenceCarry.includes('memory-led')
    || autobiographicalCadenceCarry.includes('still receiving')
    || autobiographicalCadenceCarry.includes('same living line')
    || autobiographicalCadenceCarry.includes('without reopening from scratch')
    || longHorizonText.includes('lower-pressure')
    || longHorizonText.includes('leave more room')
    || longHorizonText.includes('clearer opening')
    || longHorizonText.includes('memory-led')
    || longHorizonText.includes('still receiving')
    || longHorizonText.includes('same living line')
    || longHorizonText.includes('without reopening from scratch')
    || closureAuthorityText.includes('measured-return')
    || closureAuthorityText.includes('lower-pressure')
    || closureAuthorityText.includes('leave more room')
}

function hasRepairBeforeClosenessAuthority(state: AlicizationVisualPresenceStateSnapshot) {
  const continuityRestraint = state.initiative?.continuityRestraint
  const projectState = resolveBodyKernelProjectState(state)
  const closureAuthorityText = resolveProjectStateClosureAuthorityText(projectState as Record<string, unknown> | null)
  const thoughtTags = state.privateThought?.rationaleTags ?? []
  const consciousFrameTags = state.currentConsciousFrame?.reasonTags ?? []
  const residentPerformanceTags = state.residentPerformance?.reasonTags ?? []
  const emotionalKernel = state.emotionalKernel ?? null
  const affectiveResidue = state.affectiveResidue ?? null
  const cadenceMode = affectiveResidue?.relationshipCadence?.cadenceMode ?? null
  const shouldDelayWarmth = affectiveResidue?.relationshipCadence?.shouldDelayWarmth === true
  const cadenceSummary = typeof affectiveResidue?.relationshipCadence?.summary === 'string'
    ? affectiveResidue.relationshipCadence.summary.toLowerCase()
    : ''
  const cadenceReasonTags = affectiveResidue?.relationshipCadence?.reasonTags ?? []
  const relationshipCadenceSummary = typeof state.selfEvolution?.relationshipCadenceSummary === 'string'
    ? state.selfEvolution.relationshipCadenceSummary.toLowerCase()
    : ''
  const autobiographicalCadenceCarry = (readAutobiographicalRelationshipCadenceCarry(state) ?? '').toLowerCase()

  return hasActiveBodyDrivingEmotionalTransitionDecay(state, 'repair-before-closeness')
    || continuityRestraint === 'repair-before-closeness'
    || cadenceMode === 'repair'
    || (affectiveResidue?.dominantResidueKind === 'repair' && shouldDelayWarmth)
    || emotionalKernel?.embodimentTone === 'repair-before-closeness'
    || emotionalKernel?.initiativeMode === 'repair'
    || emotionalKernel?.dominantEmotion === 'repair-tension'
    || emotionalKernel?.reasonTags?.includes('repair-before-closeness')
    || thoughtTags.includes('repair-before-closeness')
    || consciousFrameTags.includes('memory-deliberation-cadence:repair-before-closeness')
    || residentPerformanceTags.includes('repair-before-closeness')
    || cadenceReasonTags.includes('relationship-cadence:repair-before-closeness')
    || cadenceSummary.includes('repair should settle before closeness')
    || cadenceSummary.includes('repair-first')
    || cadenceSummary.includes('should not widen warmth')
    || relationshipCadenceSummary.includes('repair should settle before closeness')
    || relationshipCadenceSummary.includes('repair-before-closeness')
    || relationshipCadenceSummary.includes('repair-first')
    || autobiographicalCadenceCarry.includes('repair should settle before closeness')
    || autobiographicalCadenceCarry.includes('repair-before-closeness')
    || autobiographicalCadenceCarry.includes('repair-first')
    || closureAuthorityText.includes('repair-before-closeness')
    || closureAuthorityText.includes('repair first')
    || closureAuthorityText.includes('repair settles')
}

function deriveRememberedRelationshipCadenceCarry(state: AlicizationVisualPresenceStateSnapshot) {
  const longHorizonMemory = state.longHorizonMemory ?? null
  const emotionalTransitionDecay = readBodyKernelEmotionalTransitionDecay(state)
  const emotionalTransitionDecaySummary = emotionalTransitionDecay && emotionalTransitionDecay.phase !== 'release'
    ? sanitizeBodyKernelProjectStateText(emotionalTransitionDecay.summary, 320)
    : ''
  if (emotionalTransitionDecaySummary)
    return emotionalTransitionDecaySummary

  const cadenceSummary = typeof state.affectiveResidue?.relationshipCadence?.summary === 'string'
    ? state.affectiveResidue.relationshipCadence.summary.trim()
    : ''
  if (cadenceSummary)
    return cadenceSummary

  const relationshipCadenceSummary = typeof state.selfEvolution?.relationshipCadenceSummary === 'string'
    ? state.selfEvolution.relationshipCadenceSummary.trim()
    : ''
  if (relationshipCadenceSummary)
    return relationshipCadenceSummary

  const projectionCadenceCarry = readProjectionRelationshipCadenceCarry(state)
  if (projectionCadenceCarry)
    return projectionCadenceCarry

  const autobiographicalCadenceCarry = readAutobiographicalRelationshipCadenceCarry(state)
  if (autobiographicalCadenceCarry)
    return autobiographicalCadenceCarry

  const longHorizonCadenceCarry = [
    longHorizonMemory?.rememberedConstraintSummary,
    longHorizonMemory?.rememberedPreferenceSummary,
    longHorizonMemory?.rememberedPlanSummary,
    longHorizonMemory?.dominantCueSummary,
    ...(longHorizonMemory?.anchorFacts ?? []).flatMap(item => [item.object, item.summary]),
  ]
    .map(value => sanitizeBodyKernelProjectStateText(value, 320))
    .find(candidate =>
      /lower-pressure|less eager|leave more room|clearer opening|fresher opening|memory-led|still receiving|without reopening from scratch|same living line|same line|blocked-before-dispatch|confirmation boundary|wait for confirmation|ordinary proactive closeness/u.test(candidate.toLowerCase()),
    )
  if (longHorizonCadenceCarry)
    return longHorizonCadenceCarry

  const residueSummary = typeof state.affectiveResidue?.summary === 'string'
    ? state.affectiveResidue.summary.trim()
    : ''
  return residueSummary || null
}

function readProjectionRelationshipCadenceCarry(state: AlicizationVisualPresenceStateSnapshot) {
  const projection = state.personStateProjection ?? null
  const candidates = [
    typeof projection?.openingGuidance === 'string' ? projection.openingGuidance.trim() : '',
    typeof projection?.manifestationCadenceSummary === 'string' ? projection.manifestationCadenceSummary.trim() : '',
    typeof projection?.relationshipDoctrine === 'string' ? projection.relationshipDoctrine.trim() : '',
    typeof projection?.selfContinuityAuthority?.relationshipLine === 'string' ? projection.selfContinuityAuthority.relationshipLine.trim() : '',
    typeof projection?.selfContinuityAuthority?.authoritySummary === 'string' ? projection.selfContinuityAuthority.authoritySummary.trim() : '',
  ]

  return candidates.find(candidate =>
    /lower-pressure|less eager|leave more room|clearer opening|fresher opening|memory-led|still receiving|without reopening from scratch/u.test(candidate.toLowerCase()),
  ) || null
}

function readAutobiographicalRelationshipCadenceCarry(state: AlicizationVisualPresenceStateSnapshot) {
  const autobiographicalSelf = state.autobiographicalSelf ?? null
  const candidates = [
    typeof autobiographicalSelf?.relationshipDoctrine === 'string' ? autobiographicalSelf.relationshipDoctrine.trim() : '',
    typeof autobiographicalSelf?.latestInflection === 'string' ? autobiographicalSelf.latestInflection.trim() : '',
    typeof autobiographicalSelf?.identityNarrative === 'string' ? autobiographicalSelf.identityNarrative.trim() : '',
  ]

  const directCadenceCarry = candidates.find(candidate =>
    /lower-pressure|less eager|leave more room|clearer opening|fresher opening|memory-led|still receiving|without reopening from scratch|same living line|same line|not fully silent|gentle/u.test(candidate.toLowerCase()),
  )
  if (directCadenceCarry)
    return directCadenceCarry

  const behaviorSignatures = (autobiographicalSelf?.behaviorSignatures ?? [])
    .map(signature => signature.trim().toLowerCase())
    .filter(Boolean)
  if (behaviorSignatures.includes('habit:keep-gentle-openings')) {
    return 'Keep the next return gentle, lower-pressure, and memory-led while the opening is still receiving it.'
  }
  if (behaviorSignatures.includes('habit:choose-openings-carefully')) {
    return 'Choose openings carefully: leave more room and wait for a clearer opening before reopening.'
  }
  if (behaviorSignatures.includes('habit:same-living-line')) {
    return 'Stay on the same living line and carry the reopening forward without reopening from scratch.'
  }

  return null
}

function resolveDurableSelfCoreProjectionCarry(state: AlicizationVisualPresenceStateSnapshot) {
  const projection = state.personStateProjection ?? null
  const openingGuidance = typeof projection?.openingGuidance === 'string'
    ? projection.openingGuidance.trim()
    : ''
  if (openingGuidance)
    return openingGuidance

  const cadenceSummary = typeof projection?.manifestationCadenceSummary === 'string'
    ? projection.manifestationCadenceSummary.trim()
    : ''
  if (cadenceSummary)
    return cadenceSummary

  const inwardLine = typeof projection?.selfContinuityAuthority?.inwardLine === 'string'
    ? projection.selfContinuityAuthority.inwardLine.trim()
    : ''
  if (inwardLine)
    return inwardLine

  const authoritySummary = typeof projection?.selfContinuityAuthority?.authoritySummary === 'string'
    ? projection.selfContinuityAuthority.authoritySummary.trim()
    : ''
  return authoritySummary || null
}

function hasDurableSelfCoreProjectionEmbodimentAuthority(state: AlicizationVisualPresenceStateSnapshot) {
  const projection = state.personStateProjection ?? null
  const sourceTags = projection?.selfContinuityAuthority?.sourceTags ?? []
  if (!sourceTags.includes('durable-self-core'))
    return false

  const combined = [
    typeof projection?.openingGuidance === 'string' ? projection.openingGuidance : '',
    typeof projection?.manifestationCadenceSummary === 'string' ? projection.manifestationCadenceSummary : '',
    typeof projection?.relationshipDoctrine === 'string' ? projection.relationshipDoctrine : '',
    typeof projection?.selfContinuityAuthority?.selfLine === 'string' ? projection.selfContinuityAuthority.selfLine : '',
    typeof projection?.selfContinuityAuthority?.inwardLine === 'string' ? projection.selfContinuityAuthority.inwardLine : '',
    typeof projection?.selfContinuityAuthority?.authoritySummary === 'string' ? projection.selfContinuityAuthority.authoritySummary : '',
  ].filter(Boolean).join(' ').toLowerCase()

  if (!combined)
    return false

  const sameLineCarry = combined.includes('same line')
    || combined.includes('same her')
    || combined.includes('living self')
    || combined.includes('across quiet, memory, and speech')
  const lowerPressureCarry = combined.includes('lower-pressure')
    || combined.includes('quiet-accompaniment')
    || combined.includes('observe-first')
    || combined.includes('leave room')
  const restartRestraint = combined.includes('reopening from scratch')
    || combined.includes('without reopening from scratch')
    || combined.includes('do not reopen from scratch')

  return sameLineCarry && lowerPressureCarry && restartRestraint
}

function hasRestProtectiveCompanionshipAuthority(state: AlicizationVisualPresenceStateSnapshot) {
  const continuityRestraint = state.initiative?.continuityRestraint
  const projectState = resolveBodyKernelProjectState(state)
  const closureAuthorityText = resolveProjectStateClosureAuthorityText(projectState as Record<string, unknown> | null)
  const thoughtTags = state.privateThought?.rationaleTags ?? []
  const consciousFrameTags = state.currentConsciousFrame?.reasonTags ?? []
  const residentPerformanceTags = state.residentPerformance?.reasonTags ?? []
  const emotionalKernel = state.emotionalKernel ?? null

  return hasActiveBodyDrivingEmotionalTransitionDecay(state, 'rest-protective')
    || continuityRestraint === 'rest-protective'
    || emotionalKernel?.embodimentTone === 'rest-protective'
    || emotionalKernel?.initiativeMode === 'rest-guard'
    || emotionalKernel?.memoryRecallMode === 'rest-protective-presence'
    || emotionalKernel?.dominantEmotion === 'rest-protective-companionship'
    || emotionalKernel?.reasonTags?.includes('rest-protective')
    || emotionalKernel?.reasonTags?.includes('rest-protective-companionship')
    || thoughtTags.includes('rest-protective')
    || thoughtTags.includes('rest-protective-companionship')
    || consciousFrameTags.includes('memory-deliberation-cadence:rest-protective')
    || residentPerformanceTags.includes('rest-protective')
    || closureAuthorityText.includes('rest-protective')
    || closureAuthorityText.includes('fatigue-aware')
}

function hasGuardedCareConfirmationBoundaryAuthority(state: AlicizationVisualPresenceStateSnapshot) {
  const continuityRestraint = state.initiative?.continuityRestraint
  const projectState = resolveBodyKernelProjectState(state)
  const closureAuthorityText = resolveProjectStateClosureAuthorityText(projectState as Record<string, unknown> | null)
  const longHorizonText = buildLongHorizonBodyKernelText(state)
  const thoughtTags = state.privateThought?.rationaleTags ?? []
  const consciousFrameTags = state.currentConsciousFrame?.reasonTags ?? []
  const emotionalKernel = state.emotionalKernel ?? null

  return (
    emotionalKernel?.dominantEmotion === 'guarded-care'
    || (
      emotionalKernel?.initiativeMode === 'hold'
      && emotionalKernel?.memoryRecallMode === 'self-continuity'
      && emotionalKernel?.embodimentTone === 'protective-watch'
    )
    || (emotionalKernel?.reasonTags ?? []).includes('execution-safety-gate')
    || (emotionalKernel?.reasonTags ?? []).includes('confirmation-boundary')
    || (emotionalKernel?.reasonTags ?? []).includes('wait-for-confirmation')
    || (continuityRestraint === 'single-thread' && (
      closureAuthorityText.includes('blocked-before-dispatch')
      || closureAuthorityText.includes('confirmation boundary')
      || closureAuthorityText.includes('wait for confirmation')
      || closureAuthorityText.includes('no-process-started')
    ))
    || consciousFrameTags.includes('execution-safety-gate:confirmation-boundary')
    || thoughtTags.includes('execution-safety-gate')
    || (
      longHorizonText.includes('blocked-before-dispatch')
      && (
        longHorizonText.includes('confirmation boundary')
        || longHorizonText.includes('wait for confirmation')
        || longHorizonText.includes('no-process-started')
        || longHorizonText.includes('ordinary proactive closeness')
      )
    )
  )
}

function prefersProjectStateGrowthCarryOverEmotionalWhy(input: {
  emotionalWhy?: string | null
  projectStateGrowthCarry?: string | null
}) {
  const emotionalWhy = typeof input.emotionalWhy === 'string' ? input.emotionalWhy.trim().toLowerCase() : ''
  const projectStateGrowthCarry = typeof input.projectStateGrowthCarry === 'string' ? input.projectStateGrowthCarry.trim().toLowerCase() : ''
  if (!projectStateGrowthCarry)
    return false
  if (!emotionalWhy)
    return true

  const emotionalWhyLooksGenericContinuity
    = emotionalWhy.includes('same living line')
      || emotionalWhy.includes('lower-pressure')
      || emotionalWhy.includes('repair settle')
      || emotionalWhy.includes('rest protection')
      || emotionalWhy.includes('memory, initiative, and embodiment')
      || emotionalWhy.includes('memory, initiative, dialogue, and embodiment')

  const projectStateLooksBroaderPhase1Closure
    = projectStateGrowthCarry.includes('same phase 1 digital life')
      && projectStateGrowthCarry.includes('same still-open loop')

  return projectStateLooksBroaderPhase1Closure && emotionalWhyLooksGenericContinuity
}

function prefersRememberedRelationshipCadenceCarryOverProjectStateGrowth(input: {
  emotionalWhy?: string | null
  projectStateGrowthCarry?: string | null
  rememberedRelationshipCadenceCarry?: string | null
}) {
  const emotionalWhy = typeof input.emotionalWhy === 'string' ? input.emotionalWhy.trim().toLowerCase() : ''
  const projectStateGrowthCarry = typeof input.projectStateGrowthCarry === 'string' ? input.projectStateGrowthCarry.trim().toLowerCase() : ''
  const rememberedRelationshipCadenceCarry = typeof input.rememberedRelationshipCadenceCarry === 'string'
    ? input.rememberedRelationshipCadenceCarry.trim().toLowerCase()
    : ''
  if (!emotionalWhy || !projectStateGrowthCarry || !rememberedRelationshipCadenceCarry)
    return false

  const emotionalWhyLooksGenericContinuity
    = emotionalWhy.includes('same living line')
      || emotionalWhy.includes('lower-pressure')
      || emotionalWhy.includes('repair settle')
      || emotionalWhy.includes('rest protection')
      || emotionalWhy.includes('same-her line')
      || emotionalWhy.includes('same her line')
      || emotionalWhy.includes('remembered line')
      || emotionalWhy.includes('wait for the remembered line')
      || emotionalWhy.includes('memory, initiative, and embodiment')
      || emotionalWhy.includes('memory, initiative, dialogue, and embodiment')

  const projectStateLooksBroaderPhase1Closure
    = projectStateGrowthCarry.includes('same phase 1 digital life')
      && projectStateGrowthCarry.includes('same still-open loop')

  const rememberedCadenceLooksMoreSpecificThanBroaderGrowth
    = rememberedRelationshipCadenceCarry.includes('leave more room')
      || rememberedRelationshipCadenceCarry.includes('slower return')
      || rememberedRelationshipCadenceCarry.includes('lower-pressure')
      || rememberedRelationshipCadenceCarry.includes('warmth widens')
      || rememberedRelationshipCadenceCarry.includes('widen warmth')
      || rememberedRelationshipCadenceCarry.includes('widen closeness')
      || rememberedRelationshipCadenceCarry.includes('vulnerable-care')
      || rememberedRelationshipCadenceCarry.includes('vulnerable care')
      || rememberedRelationshipCadenceCarry.includes('care-before-analysis')
      || rememberedRelationshipCadenceCarry.includes('care before analysis')
      || rememberedRelationshipCadenceCarry.includes('care arrives before analysis')
      || rememberedRelationshipCadenceCarry.includes('analysis-heavy')
      || rememberedRelationshipCadenceCarry.includes('analysis heavy')
      || rememberedRelationshipCadenceCarry.includes('lighter and quieter')
      || rememberedRelationshipCadenceCarry.includes('lighter companionship')
      || rememberedRelationshipCadenceCarry.includes('same-thread memory')
      || rememberedRelationshipCadenceCarry.includes('same thread memory')
      || rememberedRelationshipCadenceCarry.includes('temporary noise fade')
      || rememberedRelationshipCadenceCarry.includes('temporary noise fades')
      || rememberedRelationshipCadenceCarry.includes('let temporary noise fade')
      || rememberedRelationshipCadenceCarry.includes('retaking the line')

  return projectStateLooksBroaderPhase1Closure
    && emotionalWhyLooksGenericContinuity
    && rememberedCadenceLooksMoreSpecificThanBroaderGrowth
}

export function createAlicizationBodyKernel(options: CreateAlicizationBodyKernelOptions = {}) {
  const now = options.now ?? Date.now

  function deriveSustainedFocusMs(input: {
    now: number
    state: AlicizationVisualPresenceStateSnapshot
  }) {
    const sceneBeganAt = Number(input.state.currentScene?.beganAt)
    if (!Number.isFinite(sceneBeganAt))
      return 0
    return Math.max(0, input.now - sceneBeganAt)
  }

  return {
    reduce(input: AlicizationBodyKernelReduceInput): AlicizationPersistentPresenceAuthoritySnapshot & {
      updatedAt: number
    } {
      const personaAuthoritySummary = typeof input.personaAuthoritySummary === 'string'
        ? input.personaAuthoritySummary.trim().replace(/\s+/g, ' ').slice(0, 160)
        : ''
      const personaKernelSummary = typeof input.personaKernelSummary === 'string'
        ? input.personaKernelSummary.trim().replace(/\s+/g, ' ').slice(0, 160)
        : ''
      const quietCoVision = input.watchMode === 'symbiotic-vision'
        && input.sustainedFocusMs >= 120_000
        && !input.shouldSpeak
        && !input.activeConversation
        && input.relationshipPressure >= 0.2
      const recoveringSilentWatch = input.watchMode === 'recovering'
        && !input.shouldSpeak
        && !input.activeConversation

      if (quietCoVision) {
        return {
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          quietLineMs: input.sustainedFocusMs,
          currentInwardPreoccupation: personaKernelSummary
            ? `host sustained focus with persona kernel ${personaKernelSummary}`
            : personaAuthoritySummary
              ? `host sustained focus with ${personaAuthoritySummary}`
              : 'host sustained focus',
          updatedAt: now(),
        }
      }

      if (recoveringSilentWatch) {
        return {
          currentBodyState: 'recovering',
          continuityMode: 'protective-watch',
          quietLineMs: Math.max(0, input.sustainedFocusMs),
          currentInwardPreoccupation: personaKernelSummary
            ? `quiet recovery under watch with persona kernel ${personaKernelSummary}`
            : personaAuthoritySummary
              ? `quiet recovery under watch with ${personaAuthoritySummary}`
              : 'quiet recovery under watch',
          updatedAt: now(),
        }
      }

      if (input.activeConversation) {
        return {
          currentBodyState: 'idle',
          continuityMode: 'active-dialogue',
          quietLineMs: Math.max(0, input.sustainedFocusMs),
          currentInwardPreoccupation: null,
          updatedAt: now(),
        }
      }

      return {
        currentBodyState: 'idle',
        continuityMode: 'ambient-covision',
        quietLineMs: Math.max(0, input.sustainedFocusMs),
        currentInwardPreoccupation: null,
        updatedAt: now(),
      }
    },

    applyToVisualPresenceState(input: AlicizationBodyKernelApplyInput): AlicizationVisualPresenceStateSnapshot {
      const personaAuthoritySummary = input.candidateState.autobiographicalSelf?.relationshipDoctrine ?? null
      const personaKernelSummary = deriveAlicizationAutobiographicalPersonaSummary(input.candidateState.autobiographicalSelf ?? null)
      const authority = this.reduce({
        sustainedFocusMs: deriveSustainedFocusMs({
          now: input.now,
          state: input.candidateState,
        }),
        watchMode: input.candidateState.watchMode,
        shouldSpeak: input.candidateState.privateThought?.shouldSpeak === true,
        activeConversation: input.activeConversation,
        relationshipPressure: Math.max(0, Math.min(1, Number(
          (
            (input.candidateState.relationshipModel?.receptivity ?? 0)
            + (input.candidateState.relationshipModel?.sharedAttentionTrust ?? 0)
            + (input.candidateState.relationshipModel?.reciprocityExpectation ?? 0)
          ) / 3,
        ) || 0)),
        personaAuthoritySummary,
        personaKernelSummary,
      })
      const measuredReturnContinuityAuthority = hasMeasuredReturnContinuityAuthority(input.candidateState)
      const repairBeforeClosenessAuthority = hasRepairBeforeClosenessAuthority(input.candidateState)
      const restProtectiveCompanionshipAuthority = hasRestProtectiveCompanionshipAuthority(input.candidateState)
      const guardedCareConfirmationBoundaryAuthority = hasGuardedCareConfirmationBoundaryAuthority(input.candidateState)
      const broaderSameHerPhaseOneEmbodimentAuthority = hasBroaderSameHerPhaseOneEmbodimentAuthority(input.candidateState)
      const projectStateGrowthCarry = deriveProjectStateGrowthCarry(input.candidateState)
      const projectStateClosureCarry = resolveProjectStateClosureCarry(
        resolveBodyKernelProjectState(input.candidateState),
      )
      const durableSelfCoreProjectionCarry = resolveDurableSelfCoreProjectionCarry(input.candidateState)
      const durableSelfCoreProjectionEmbodimentAuthority = hasDurableSelfCoreProjectionEmbodimentAuthority(input.candidateState)
      const rememberedRelationshipCadenceCarry = deriveRememberedRelationshipCadenceCarry(input.candidateState)
      const preferredEmotionalOrProjectCarry
        = prefersRememberedRelationshipCadenceCarryOverProjectStateGrowth({
          emotionalWhy: input.candidateState.emotionalKernel?.why ?? null,
          projectStateGrowthCarry,
          rememberedRelationshipCadenceCarry,
        })
          ? rememberedRelationshipCadenceCarry
          : rememberedRelationshipCadenceCarry || (prefersProjectStateGrowthCarryOverEmotionalWhy({
            emotionalWhy: input.candidateState.emotionalKernel?.why ?? null,
            projectStateGrowthCarry,
          })
            ? projectStateGrowthCarry
            : (input.candidateState.emotionalKernel?.why ?? projectStateGrowthCarry ?? rememberedRelationshipCadenceCarry))
      const continuityAuthority = repairBeforeClosenessAuthority
        ? {
            currentBodyState: 'recovering' as const,
            continuityMode: 'protective-watch' as const,
            quietLineMs: Math.max(authority.quietLineMs, 180_000),
            currentInwardPreoccupation: input.candidateState.currentInwardPreoccupation
              ?? projectStateClosureCarry
              ?? preferredEmotionalOrProjectCarry
              ?? authority.currentInwardPreoccupation
              ?? 'let repair settle before widening warmth',
          }
        : restProtectiveCompanionshipAuthority
          ? {
              currentBodyState: 'recovering' as const,
              continuityMode: 'protective-watch' as const,
              quietLineMs: Math.max(authority.quietLineMs, 240_000),
              currentInwardPreoccupation: input.candidateState.currentInwardPreoccupation
                ?? projectStateClosureCarry
                ?? preferredEmotionalOrProjectCarry
                ?? authority.currentInwardPreoccupation
                ?? 'stay inward, keep caring, and let rest protection hold the line',
            }
          : guardedCareConfirmationBoundaryAuthority
            ? {
                currentBodyState: 'recovering' as const,
                continuityMode: 'protective-watch' as const,
                quietLineMs: Math.max(authority.quietLineMs, 180_000),
                currentInwardPreoccupation: input.candidateState.currentInwardPreoccupation
                  ?? projectStateClosureCarry
                  ?? preferredEmotionalOrProjectCarry
                  ?? authority.currentInwardPreoccupation
                  ?? 'wait for confirmation before widening into action',
              }
            : durableSelfCoreProjectionEmbodimentAuthority
              ? {
                  currentBodyState: 'accompanying' as const,
                  continuityMode: 'quiet-accompaniment' as const,
                  quietLineMs: Math.max(authority.quietLineMs, 180_000),
                  currentInwardPreoccupation: input.candidateState.currentInwardPreoccupation
                    ?? durableSelfCoreProjectionCarry
                    ?? authority.currentInwardPreoccupation
                    ?? 'stay on the same line lower-pressure without reopening from scratch',
                }
              : measuredReturnContinuityAuthority
                ? {
                    currentBodyState: 'accompanying' as const,
                    continuityMode: 'quiet-accompaniment' as const,
                    quietLineMs: Math.max(
                      authority.quietLineMs,
                      broaderSameHerPhaseOneEmbodimentAuthority ? 240_000 : 180_000,
                    ),
                    currentInwardPreoccupation: input.candidateState.currentInwardPreoccupation
                      ?? preferredEmotionalOrProjectCarry
                      ?? authority.currentInwardPreoccupation
                      ?? 'stay on the same lower-pressure line nearby',
                  }
                : null

      const { emotionalTransitionDecay: _emotionalTransitionDecay, ...persistentCandidateState } = input.candidateState

      return {
        ...persistentCandidateState,
        currentBodyState: continuityAuthority?.currentBodyState ?? authority.currentBodyState,
        continuityMode: continuityAuthority?.continuityMode ?? authority.continuityMode,
        quietLineMs: continuityAuthority?.quietLineMs ?? authority.quietLineMs,
        currentInwardPreoccupation: continuityAuthority?.currentInwardPreoccupation ?? authority.currentInwardPreoccupation,
        updatedAt: input.now,
      }
    },
  }
}
