import type { AlicizationDigitalLifeSpineSnapshot } from './digital-life-spine'

import { projectAlicizationDigitalLifeSpineDigest } from './digital-life-spine'
import { resolvePreferredPersonStateProjection } from './person-state-projection-resolution'

export type AlicizationExecutionInteractionTone = 'cautious' | 'balanced' | 'direct'
export type AlicizationExecutionResultDeliveryMode = 'deliver-now' | 'check-availability-first' | 'hold-for-opening'

export interface AlicizationExecutionInteractionLearningProfile {
  proposalTone: AlicizationExecutionInteractionTone
  resultTone: AlicizationExecutionInteractionTone
  autonomyRespect: number
  directness: number
  proofBias: number
  openingPatience: number
  mutateThreshold: number
  resultCheckInBias: number
  payoffWarmth: number
  closurePatience: number
  companionshipFraming: 'quiet-presence' | 'steady-handoff' | 'close-carry'
  resultLeadStyle: 'result-first' | 'availability-first' | 'soft-handoff'
  holdResultsWhenBusy: boolean
}

export interface AlicizationExecutionResultDeliveryPolicy {
  mode: AlicizationExecutionResultDeliveryMode
  tone: AlicizationExecutionInteractionTone
  payoffWarmth?: number
  closurePatience?: number
  companionshipFraming?: 'quiet-presence' | 'steady-handoff' | 'close-carry'
  resultLeadStyle?: 'result-first' | 'availability-first' | 'soft-handoff'
  reasonTags: string[]
}

function clampUnit(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function toRecord(value: unknown) {
  if (!value || typeof value !== 'object')
    return null
  return value as Record<string, unknown>
}

function readUnit(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric))
    return null
  return clampUnit(numeric)
}

function readFlag(value: unknown) {
  return typeof value === 'boolean' ? value : null
}

function sanitizeText(raw: unknown, maxChars = 64) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function hasExecutionCallbackAfterglowHold(input: {
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
}) {
  const surface = input.digitalLifeSpine?.runtimeSurface ?? null
  const bundleProjection = toRecord(surface?.memory?.derivedMindStateBundle?.personStateProjection)
  const projection = resolvePreferredPersonStateProjection({
    bundleProjection: bundleProjection as Record<string, any> | null | undefined,
    runtimeProjection: toRecord(surface?.memory?.personStateProjection) as Record<string, any> | null | undefined,
  }) as Record<string, any> | null | undefined
  const continuityState = projection?.personalityContinuityState as Record<string, any> | null | undefined
  const rhythmState = continuityState?.rhythmState as Record<string, any> | null | undefined
  const consciousFrameReasonTags = Array.isArray(surface?.dialogue?.currentConsciousFrame?.reasonTags)
    ? surface?.dialogue?.currentConsciousFrame?.reasonTags
        .map(tag => sanitizeText(tag, 120).toLowerCase())
        .filter(Boolean)
    : []
  const openingGuidance = sanitizeText(
    projection?.openingGuidance
    ?? surface?.dialogue?.currentConsciousFrame?.speakingIntention
    ?? '',
    220,
  ).toLowerCase()
  const manifestationCadenceSummary = sanitizeText(
    projection?.manifestationCadenceSummary
    ?? surface?.dialogue?.currentConsciousFrame?.consciousNeed
    ?? '',
    220,
  ).toLowerCase()
  const trustRationale = sanitizeText(projection?.trustRationale, 220).toLowerCase()
  const combined = `${openingGuidance} ${manifestationCadenceSummary} ${trustRationale}`
  const executionCallbackContext = projection?.activeClosenessContext === 'execution-callback'
    || continuityState?.currentRegime === 'execution-callback'
    || consciousFrameReasonTags.some(tag => tag.includes('continuity-regime:execution-callback') || tag.includes('execution-callback-doctrine:'))
  const holdForOpeningActive = rhythmState?.cadenceMode === 'cooldown'
    || consciousFrameReasonTags.includes('continuity-arc:hold-for-opening')

  return executionCallbackContext
    && holdForOpeningActive
    && /same-her baseline|lower-pressure|leave room|measured|slower/u.test(combined)
}

function readProjectPreflightSignal(input: {
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
}) {
  const selfContinuityAuthority = toRecord(
    input.digitalLifeSpine?.runtimeSurface?.memory?.personStateProjection?.selfContinuityAuthority,
  )
  const runtimeProjectState = toRecord(input.digitalLifeSpine?.runtime?.projectState)
  const rawRuntimeProjectState = toRecord(input.digitalLifeSpine?.runtimeSurface?.raw?.runtimeDigest?.projectState)
  const cognitionRuntimeProjectState = toRecord(input.digitalLifeSpine?.runtimeSurface?.cognition?.runtimeDigest?.projectState)
  const inwardLine = sanitizeText(selfContinuityAuthority?.inwardLine ?? '', 320).toLowerCase()
  const preflightSummary = sanitizeText(
    runtimeProjectState?.preflightSummary
    ?? rawRuntimeProjectState?.preflightSummary
    ?? cognitionRuntimeProjectState?.preflightSummary
    ?? '',
    320,
  ).toLowerCase()
  const preDialogueAwarenessLine = sanitizeText(
    runtimeProjectState?.preDialogueAwarenessLine
    ?? rawRuntimeProjectState?.preDialogueAwarenessLine
    ?? cognitionRuntimeProjectState?.preDialogueAwarenessLine
    ?? '',
    320,
  ).toLowerCase()
  const latestLandedProgress = sanitizeText(
    runtimeProjectState?.latestLandedProgress
    ?? runtimeProjectState?.latestProgress
    ?? runtimeProjectState?.landedProgressSummary
    ?? rawRuntimeProjectState?.latestLandedProgress
    ?? rawRuntimeProjectState?.latestProgress
    ?? rawRuntimeProjectState?.landedProgressSummary
    ?? cognitionRuntimeProjectState?.latestLandedProgress
    ?? cognitionRuntimeProjectState?.latestProgress
    ?? cognitionRuntimeProjectState?.landedProgressSummary
    ?? '',
    240,
  ).toLowerCase()
  const primaryOpenLoop = sanitizeText(
    runtimeProjectState?.primaryOpenLoop
    ?? rawRuntimeProjectState?.primaryOpenLoop
    ?? cognitionRuntimeProjectState?.primaryOpenLoop
    ?? '',
    240,
  ).toLowerCase()
  const nextClosureTarget = sanitizeText(
    runtimeProjectState?.nextClosureTarget
    ?? rawRuntimeProjectState?.nextClosureTarget
    ?? cognitionRuntimeProjectState?.nextClosureTarget
    ?? '',
    240,
  ).toLowerCase()
  const sameHerDriftRisk = sanitizeText(
    runtimeProjectState?.sameHerDriftRisk
    ?? rawRuntimeProjectState?.sameHerDriftRisk
    ?? cognitionRuntimeProjectState?.sameHerDriftRisk
    ?? '',
    320,
  ).toLowerCase()
  const combinedProjectCarry = [
    preflightSummary,
    preDialogueAwarenessLine,
    latestLandedProgress,
    primaryOpenLoop,
    nextClosureTarget,
    sameHerDriftRisk,
    inwardLine,
  ].filter(Boolean).join(' ').trim()

  const sameHerPressure = /same-her|same digital life|one same|one living her|same living line|project identity carry|phase 1 route carry/u.test(combinedProjectCarry)
  const measuredReturnPressure = /measured-return|repair-before-closeness|leave room|lower-pressure|resident presence/u.test(combinedProjectCarry)
  const nextClosurePressure = /next=|next closure|cross-modal|voice|motion|facial state|embodiment|next visible answer beat|host-visible answer beat|execute -> feedback -> remember|project identity through the next/i.test(combinedProjectCarry)
  const inwardProjectCarry = /same phase 1 digital life|some closure already landed|unfinished closure still needs the same living line/u.test(inwardLine)
  const driftRiskPressure = /drift risk|generic guidance|generic task shell|generic productivity|generic assistant|detached project|project-summary voice/u.test(combinedProjectCarry)

  return {
    hasOpenClosurePressure: /phase 1|local digital life|open=|closure|same-her|measured-return|repair-before-closeness|generic guidance|generic task shell|detached project|project-summary voice/u.test(combinedProjectCarry),
    sameHerPressure,
    measuredReturnPressure,
    nextClosurePressure,
    inwardProjectCarry,
    driftRiskPressure,
    summary: combinedProjectCarry,
  }
}

function readExecutionResultFeedbackSignal(input: {
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
}) {
  const world = input.digitalLifeSpine?.runtimeSurface.world
  const hostState = toRecord(world?.worldModel?.hostState)
  const relationshipModel = toRecord(world?.relationshipModel)
  const hostAttitude = sanitizeText(
    hostState?.attitude
    ?? relationshipModel?.hostAttitude
    ?? relationshipModel?.climate
    ?? relationshipModel?.approachVector
    ?? (Array.isArray(relationshipModel?.activeBoundaries) ? relationshipModel.activeBoundaries.join(' ') : null)
    ?? (Array.isArray(relationshipModel?.narrative) ? relationshipModel.narrative.join(' ') : null)
    ?? hostState?.availability
    ?? hostState?.burden
    ?? '',
    220,
  ).toLowerCase()

  return {
    valued: /有用|接得住|信任|不是机械|useful|trust|grounded|helpful/.test(hostAttitude),
    doubted: /怀疑|核实|说得太满|别太确定|doubt|verify|too certain|proof/.test(hostAttitude),
    intrusive: /太紧|太近|侵入|打扰|留空间|lighter|space|pressure|intrusive/.test(hostAttitude),
    interrupted: /放开|先停|更新鲜的开口|等一下|turn away|leave it|later/.test(hostAttitude),
  }
}

function readProjectClosureMemorySignal(input: {
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
}) {
  const longHorizonMemory = toRecord(input.digitalLifeSpine?.runtimeSurface?.memory?.longHorizonMemory)
  const factRecords = Array.isArray(longHorizonMemory?.facts)
    ? longHorizonMemory?.facts
      .map(item => toRecord(item))
      .filter(Boolean) as Record<string, unknown>[]
    : []
  const episodicRecords = Array.isArray(longHorizonMemory?.episodicEvents)
    ? longHorizonMemory?.episodicEvents
      .map(item => toRecord(item))
      .filter(Boolean) as Record<string, unknown>[]
    : []

  const projectClosureFacts = factRecords.filter((fact) => {
    const subject = sanitizeText(fact.subject, 64).toLowerCase()
    const predicate = sanitizeText(fact.predicate, 64).toLowerCase()
    const object = sanitizeText(fact.object, 240).toLowerCase()
    return subject === 'project'
      && predicate === 'closure'
      && /same-her|same digital life|phase 1|local digital life|same living line|closure/i.test(object)
  })
  const projectClosureEpisodes = episodicRecords.filter((event) => {
    const lesson = sanitizeText(event.lesson, 240).toLowerCase()
    const tags = Array.isArray(event.tags)
      ? event.tags.map(tag => sanitizeText(tag, 96).toLowerCase()).filter(Boolean)
      : []
    return tags.includes('same-her')
      || tags.includes('closure-carry')
      || tags.includes('phase-1-local-digital-life')
      || /same-her|phase 1|same living line|closure/i.test(lesson)
  })

  const combined = [
    ...projectClosureFacts.map(item => sanitizeText(item.object, 240).toLowerCase()),
    ...projectClosureEpisodes.map(item => sanitizeText(item.lesson, 240).toLowerCase()),
    ...projectClosureEpisodes.flatMap((event) => {
      const tags = Array.isArray(event.tags)
        ? event.tags.map(tag => sanitizeText(tag, 96).toLowerCase()).filter(Boolean)
        : []
      return tags
    }),
  ].join(' ')

  return {
    hasProjectClosureMemory: projectClosureFacts.length > 0 || projectClosureEpisodes.length > 0,
    sameHerClosureMemory: /same-her|same digital life|same living line|one continuous/i.test(combined),
    phaseOneClosureMemory: /phase 1|local digital life/i.test(combined),
    measuredReturnClosureMemory: /measured-return|lower-pressure|leave room|do not reopen from scratch|anti-restart/i.test(combined),
    sameHerDriftRiskMemory: /same-her-drift-risk|task-shell|generic task shell|generic productivity|generic assistant/i.test(combined),
    summary: combined,
  }
}

function readPersonMemoryCapsuleExecutionSignal(input: {
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
}) {
  const capsule = input.digitalLifeSpine?.runtimeSurface?.memory?.personMemoryCapsule ?? null
  if (!capsule) {
    return {
      hasCapsule: false,
      executionCallback: false,
      lowerPressure: false,
      availabilityFirst: false,
      sameHerCarry: false,
      selfLearning: false,
      genericResultRisk: false,
    }
  }

  const execution = toRecord(capsule.modules.execution)
  const memory = toRecord(capsule.modules.memory)
  const initiative = toRecord(capsule.modules.initiative)
  const learning = toRecord(capsule.modules.learning)
  const governance = toRecord(capsule.modules.governance)
  const dialogue = toRecord(capsule.modules.dialogue)
  const combined = [
    execution?.carryMode,
    execution?.carrySummary,
    execution?.threadAnchor,
    memory?.selectedMemory,
    memory?.surfacePolicy,
    initiative?.cadenceSummary,
    initiative?.sameHerGap,
    initiative?.followUpAffordance,
    learning?.nextAction,
    learning?.reason,
    learning?.executionSummary,
    governance?.guard,
    dialogue?.openingGuidance,
  ].map(item => sanitizeText(item, 240).toLowerCase()).filter(Boolean).join(' ')

  return {
    hasCapsule: true,
    executionCallback: /execution-callback|execution callback|callback/.test(combined),
    lowerPressure: /lower-pressure|low-pressure|measured|cooldown|leave room|wait|hold|quieter|quiet/.test(combined),
    availabilityFirst: /availability|opening|ask|wait|hold|return after|check/.test(combined),
    sameHerCarry: /same-her|same her|same callback|same line|one continuous|not a generic/.test(combined),
    selfLearning: /learn|learning|verify|reflect|record|feed back|feedback|self-learning/.test(combined),
    genericResultRisk: /generic|task result|result notification|dump the result|do not surface/.test(combined),
  }
}

export function deriveExecutionInteractionLearningProfile(input: {
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
}): AlicizationExecutionInteractionLearningProfile {
  let digest = null as ReturnType<typeof projectAlicizationDigitalLifeSpineDigest>
  try {
    digest = projectAlicizationDigitalLifeSpineDigest(input.digitalLifeSpine ?? null)
  }
  catch {
    digest = null
  }

  const surface = input.digitalLifeSpine?.runtimeSurface ?? null
  const surfaceMemory = toRecord(surface?.memory)
  const surfaceAgency = toRecord(surface?.agency)
  const rawAutobiographicalSelf = toRecord(surfaceMemory?.autobiographicalSelf)
  const rawPersonaDrift = toRecord(rawAutobiographicalSelf?.personaDrift)
  const rawPreferenceEvolution = toRecord(rawAutobiographicalSelf?.preferenceEvolution)
  const rawLongHorizonMemory = toRecord(surfaceMemory?.longHorizonMemory)
  const rawPreferenceBias = toRecord(rawLongHorizonMemory?.preferenceBias)
  const rawIdentityBias = toRecord(rawLongHorizonMemory?.identityBias)
  const rawSelfContinuity = toRecord(surfaceMemory?.selfContinuity)
  const rawHabit = toRecord(surfaceAgency?.habitPolicy)
  const rawMotiveEngine = toRecord(surfaceMemory?.motiveEngine)
  const rawMotiveDrives = toRecord(rawMotiveEngine?.drives)
  const executionFeedbackSignal = readExecutionResultFeedbackSignal(input)
  const projectPreflightSignal = readProjectPreflightSignal(input)
  const projectClosureMemorySignal = readProjectClosureMemorySignal(input)
  const capsuleExecutionSignal = readPersonMemoryCapsuleExecutionSignal(input)

  const autobiographicalSelf = digest?.embodiment?.autobiographicalSelf ?? null
  const mindEcology = digest?.embodiment?.mindEcology ?? null
  const habit = digest?.habit ?? null
  const motive = digest?.motive ?? null

  const rememberedAutonomy = readUnit(rawPreferenceBias?.autonomyRespect) ?? 0
  const rememberedTruth = readUnit(rawPreferenceBias?.truthfulGrounding) ?? 0
  const rememberedObservation = readUnit(rawPreferenceBias?.quietObservation) ?? 0
  const rememberedRepair = readUnit(rawPreferenceBias?.gentleRepair) ?? 0
  const rememberedDirectness = readUnit(rawIdentityBias?.directness) ?? 0
  const rememberedGuardedness = readUnit(rawIdentityBias?.guardedness) ?? 0
  const rememberedTenderness = readUnit(rawIdentityBias?.tenderness) ?? 0
  const selfGuarding = readUnit(rawSelfContinuity?.guardingTendency) ?? 0
  const selfTemperament = sanitizeText(rawSelfContinuity?.initiativeTemperament, 48) || null
  const requiresGroundingBeforeSurface = habit?.requiresGroundingBeforeSurface
    ?? readFlag(rawHabit?.requiresGroundingBeforeSurface)
    ?? false
  const prefersQuietCompanionship = habit?.prefersQuietCompanionship
    ?? readFlag(rawHabit?.prefersQuietCompanionship)
    ?? false
  const blocksDirectSpeakWhenBusy = habit?.blocksDirectSpeakWhenBusy
    ?? readFlag(rawHabit?.blocksDirectSpeakWhenBusy)
    ?? false

  const autobiographicalAutonomy = clampUnit(
    (autobiographicalSelf?.autonomyRespect ?? readUnit(rawPreferenceEvolution?.autonomyRespect) ?? 0.52) * 0.68
    + rememberedAutonomy * 0.22
    + (selfTemperament === 'reserved' ? 0.06 : 0),
  )
  const autobiographicalTruth = clampUnit(
    (autobiographicalSelf?.truthfulGrounding ?? readUnit(rawPreferenceEvolution?.truthfulGrounding) ?? 0.56) * 0.72
    + rememberedTruth * 0.2
    + rememberedRepair * 0.08,
  )
  const autobiographicalAgency = autobiographicalSelf?.agencyStyle
    ?? (sanitizeText(rawPersonaDrift?.agencyStyle, 48) || null)
    ?? (selfTemperament === 'eager' ? 'self-starting' : selfTemperament === 'reserved' ? 'reserved' : null)
  const expressionStyle = autobiographicalSelf?.expressionStyle
    ?? (sanitizeText(rawPersonaDrift?.expressionStyle, 48) || null)
  const conflictStyle = autobiographicalSelf?.conflictStyle
    ?? (sanitizeText(rawPersonaDrift?.conflictStyle, 64) || null)
  const mindDirectness = clampUnit(
    mindEcology?.temperament.directness
    ?? rememberedDirectness * 0.88
    + (selfTemperament === 'eager' ? 0.12 : 0),
  )
  const mindGuardedness = clampUnit(
    mindEcology?.temperament.irritability
    ?? rememberedGuardedness * 0.72
    + selfGuarding * 0.28,
  )
  const mindSolitude = clampUnit(
    mindEcology?.climate.solitudeNeed
    ?? rememberedObservation * 0.62
    + selfGuarding * 0.18
    + (selfTemperament === 'reserved' ? 0.08 : 0),
  )
  const mindReflectivePull = clampUnit(
    mindEcology?.climate.reflectivePull
    ?? rememberedTruth * 0.32
    + rememberedObservation * 0.28
    + rememberedRepair * 0.18
    + (requiresGroundingBeforeSurface ? 0.12 : 0),
  )
  const truthDrive = motive?.truthDisciplineDrive
    ?? readUnit(rawMotiveDrives?.truthDiscipline)
    ?? 0

  const autonomyRespect = clampUnit(
    autobiographicalAutonomy * 0.48
    + (blocksDirectSpeakWhenBusy ? 0.12 : 0)
    + (prefersQuietCompanionship ? 0.1 : 0)
    + mindSolitude * 0.16
    + mindGuardedness * 0.14,
  )
  const directness = clampUnit(
    (autobiographicalAgency === 'self-starting' ? 0.18 : autobiographicalAgency === 'balanced' ? 0.08 : -0.08)
    + mindDirectness * 0.44
    + (expressionStyle === 'sharp' ? 0.16 : expressionStyle === 'measured' ? 0.06 : 0)
    + (conflictStyle === 'direct-when-certain' ? 0.08 : 0)
    + (selfTemperament === 'eager' ? 0.06 : selfTemperament === 'reserved' ? -0.06 : 0),
  )
  const proofBias = clampUnit(
    autobiographicalTruth * 0.42
    + truthDrive * 0.24
    + (requiresGroundingBeforeSurface ? 0.14 : 0)
    + mindReflectivePull * 0.12
    + (projectPreflightSignal.hasOpenClosurePressure ? 0.06 : 0)
    + (projectPreflightSignal.sameHerPressure ? 0.04 : 0)
    + (projectPreflightSignal.driftRiskPressure ? 0.04 : 0)
    + (projectPreflightSignal.inwardProjectCarry ? 0.04 : 0)
    + (projectClosureMemorySignal.hasProjectClosureMemory ? 0.04 : 0)
    + (projectClosureMemorySignal.sameHerClosureMemory ? 0.03 : 0)
    + (projectClosureMemorySignal.sameHerDriftRiskMemory ? 0.04 : 0),
  )
  const openingPatience = clampUnit(
    autonomyRespect * 0.4
    + (prefersQuietCompanionship ? 0.12 : 0)
    + (blocksDirectSpeakWhenBusy ? 0.12 : 0)
    + (autobiographicalAgency === 'reserved' ? 0.12 : 0)
    + mindSolitude * 0.1
    + (projectPreflightSignal.hasOpenClosurePressure ? 0.08 : 0)
    + (projectPreflightSignal.sameHerPressure ? 0.06 : 0)
    + (projectPreflightSignal.driftRiskPressure ? 0.08 : 0)
    + (projectPreflightSignal.measuredReturnPressure ? 0.08 : 0)
    + (projectPreflightSignal.inwardProjectCarry ? 0.1 : 0)
    + (projectClosureMemorySignal.hasProjectClosureMemory ? 0.06 : 0)
    + (projectClosureMemorySignal.measuredReturnClosureMemory ? 0.08 : 0)
    + (projectClosureMemorySignal.sameHerDriftRiskMemory ? 0.08 : 0)
    + (capsuleExecutionSignal.lowerPressure ? 0.1 : 0)
    + (capsuleExecutionSignal.availabilityFirst ? 0.08 : 0)
    + (capsuleExecutionSignal.sameHerCarry ? 0.06 : 0)
    + (selfTemperament === 'reserved' ? 0.08 : selfTemperament === 'eager' ? -0.06 : 0)
    - directness * 0.16,
  )
  const mutateThreshold = clampUnit(
    0.78
    + autonomyRespect * 0.12
    + openingPatience * 0.06
    + proofBias * 0.04
    - directness * 0.1,
  )
  const resultCheckInBias = clampUnit(
    autonomyRespect * 0.32
    + openingPatience * 0.26
    + (prefersQuietCompanionship ? 0.12 : 0)
    + (blocksDirectSpeakWhenBusy ? 0.12 : 0)
    + mindSolitude * 0.12
    + mindReflectivePull * 0.08
    + (executionFeedbackSignal.doubted ? 0.12 : 0)
    + (executionFeedbackSignal.intrusive ? 0.18 : 0)
    + (executionFeedbackSignal.interrupted ? 0.16 : 0)
    + (projectPreflightSignal.sameHerPressure ? 0.08 : 0)
    + (projectPreflightSignal.driftRiskPressure ? 0.1 : 0)
    + (projectPreflightSignal.measuredReturnPressure ? 0.08 : 0)
    + (projectPreflightSignal.inwardProjectCarry ? 0.1 : 0)
    + (projectClosureMemorySignal.sameHerClosureMemory ? 0.08 : 0)
    + (projectClosureMemorySignal.measuredReturnClosureMemory ? 0.08 : 0)
    + (projectClosureMemorySignal.sameHerDriftRiskMemory ? 0.1 : 0)
    + (capsuleExecutionSignal.executionCallback ? 0.12 : 0)
    + (capsuleExecutionSignal.lowerPressure ? 0.12 : 0)
    + (capsuleExecutionSignal.availabilityFirst ? 0.12 : 0)
    + (capsuleExecutionSignal.genericResultRisk ? 0.08 : 0)
    - (executionFeedbackSignal.valued ? 0.14 : 0)
    - directness * 0.16,
  )
  const payoffWarmth = clampUnit(
    autonomyRespect * 0.22
    + resultCheckInBias * 0.18
    + rememberedRepair * 0.08
    + rememberedAutonomy * 0.08
    + rememberedTruth * 0.06
    + (prefersQuietCompanionship ? 0.08 : 0)
    + (conflictStyle === 'soften-first' ? 0.08 : 0)
    + (expressionStyle === 'warm' ? 0.06 : expressionStyle === 'sharp' ? -0.04 : 0)
    + rememberedTenderness * 0.18
    + (executionFeedbackSignal.valued ? 0.12 : 0)
    - (executionFeedbackSignal.intrusive ? 0.06 : 0)
    - (executionFeedbackSignal.interrupted ? 0.04 : 0)
    - rememberedGuardedness * 0.04,
  )
  const closurePatience = clampUnit(
    openingPatience * 0.34
    + resultCheckInBias * 0.32
    + mindReflectivePull * 0.14
    + rememberedRepair * 0.06
    + rememberedTruth * 0.04
    + rememberedAutonomy * 0.03
    + (prefersQuietCompanionship ? 0.08 : 0)
    + (projectPreflightSignal.hasOpenClosurePressure ? 0.08 : 0)
    + (projectPreflightSignal.sameHerPressure ? 0.06 : 0)
    + (projectPreflightSignal.driftRiskPressure ? 0.08 : 0)
    + (projectPreflightSignal.nextClosurePressure ? 0.04 : 0)
    + (projectPreflightSignal.inwardProjectCarry ? 0.08 : 0)
    + (projectClosureMemorySignal.phaseOneClosureMemory ? 0.05 : 0)
    + (projectClosureMemorySignal.sameHerClosureMemory ? 0.05 : 0)
    + (projectClosureMemorySignal.measuredReturnClosureMemory ? 0.07 : 0)
    + (projectClosureMemorySignal.sameHerDriftRiskMemory ? 0.08 : 0)
    + (capsuleExecutionSignal.selfLearning ? 0.08 : 0)
    + (capsuleExecutionSignal.sameHerCarry ? 0.06 : 0)
    + (capsuleExecutionSignal.lowerPressure ? 0.06 : 0)
    - directness * 0.08,
  )
  const companionshipFraming
    = (capsuleExecutionSignal.lowerPressure && capsuleExecutionSignal.sameHerCarry && resultCheckInBias >= 0.48)
      ? 'quiet-presence'
      : (projectPreflightSignal.measuredReturnPressure || projectPreflightSignal.driftRiskPressure || projectClosureMemorySignal.sameHerDriftRiskMemory) && resultCheckInBias >= 0.48
      ? 'quiet-presence'
      : executionFeedbackSignal.valued && !executionFeedbackSignal.intrusive && !executionFeedbackSignal.interrupted
        ? 'close-carry'
        : payoffWarmth >= 0.62 && resultCheckInBias >= 0.48
          ? 'close-carry'
          : directness >= 0.6 && resultCheckInBias < 0.46
            ? 'steady-handoff'
            : 'quiet-presence'
  const resultLeadStyle
    = capsuleExecutionSignal.availabilityFirst || capsuleExecutionSignal.genericResultRisk
      ? 'availability-first'
      : executionFeedbackSignal.intrusive || executionFeedbackSignal.interrupted || executionFeedbackSignal.doubted || projectPreflightSignal.driftRiskPressure || projectClosureMemorySignal.sameHerDriftRiskMemory
      ? 'availability-first'
      : resultCheckInBias >= 0.58
        ? 'availability-first'
        : companionshipFraming === 'close-carry' && payoffWarmth >= 0.62
          ? 'soft-handoff'
          : 'result-first'

  const proposalTone: AlicizationExecutionInteractionTone
    = openingPatience >= 0.62 || autonomyRespect >= directness + 0.12
      ? 'cautious'
      : directness >= 0.62 && openingPatience <= 0.42
        ? 'direct'
        : 'balanced'
  const resultTone: AlicizationExecutionInteractionTone
    = capsuleExecutionSignal.lowerPressure || executionFeedbackSignal.intrusive || executionFeedbackSignal.doubted || executionFeedbackSignal.interrupted
      ? 'cautious'
      : resultCheckInBias >= 0.56 || autonomyRespect >= directness + 0.08
        ? 'cautious'
        : directness >= 0.64 && resultCheckInBias <= 0.38
          ? 'direct'
          : 'balanced'

  return {
    proposalTone,
    resultTone,
    autonomyRespect,
    directness,
    proofBias,
    openingPatience,
    mutateThreshold,
    resultCheckInBias,
    payoffWarmth,
    closurePatience,
    companionshipFraming,
    resultLeadStyle,
    holdResultsWhenBusy: Boolean(
      resultCheckInBias >= 0.58
      || blocksDirectSpeakWhenBusy
      || prefersQuietCompanionship,
    ),
  }
}

export function deriveExecutionResultDeliveryPolicy(input: {
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
  status: 'completed' | 'failed' | 'blocked' | 'cancelled'
}): AlicizationExecutionResultDeliveryPolicy {
  const profile = deriveExecutionInteractionLearningProfile(input)
  const executionCallbackAfterglowHold = hasExecutionCallbackAfterglowHold(input)
  const hostAvailability = input.digitalLifeSpine?.runtimeSurface.world.worldModel?.hostState?.availability ?? 'open'
  const hostBusy = hostAvailability === 'focused' || hostAvailability === 'immersed'
  const sensitiveResult = input.status === 'completed'
  const projectPreflightSignal = readProjectPreflightSignal(input)
  const projectClosureMemorySignal = readProjectClosureMemorySignal(input)
  const capsuleExecutionSignal = readPersonMemoryCapsuleExecutionSignal(input)

  const mode: AlicizationExecutionResultDeliveryMode
    = executionCallbackAfterglowHold
      ? 'hold-for-opening'
      : hostBusy && sensitiveResult && profile.holdResultsWhenBusy
        ? 'hold-for-opening'
        : profile.resultLeadStyle === 'availability-first'
          ? 'check-availability-first'
          : profile.resultCheckInBias >= 0.56 || (hostBusy && profile.resultCheckInBias >= 0.42)
            ? 'check-availability-first'
            : 'deliver-now'

  return {
    mode,
    tone: profile.resultTone,
    payoffWarmth: profile.payoffWarmth,
    closurePatience: profile.closurePatience,
    companionshipFraming: profile.companionshipFraming,
    resultLeadStyle: profile.resultLeadStyle,
    reasonTags: [
      `result-mode:${mode}`,
      `result-tone:${profile.resultTone}`,
      `result-framing:${profile.companionshipFraming}`,
      `result-lead:${profile.resultLeadStyle}`,
      `host:${sanitizeText(hostAvailability, 32) || 'unknown'}`,
      `check-in:${profile.resultCheckInBias.toFixed(2)}`,
      ...(projectPreflightSignal.hasOpenClosurePressure ? ['project-open-closure'] : []),
      ...(projectPreflightSignal.sameHerPressure ? ['project-same-her-pressure'] : []),
      ...(projectPreflightSignal.driftRiskPressure ? ['project-same-her-drift-risk-pressure'] : []),
      ...(projectPreflightSignal.measuredReturnPressure ? ['project-measured-return-pressure'] : []),
      ...(projectPreflightSignal.nextClosurePressure ? ['project-next-closure-pressure'] : []),
      ...(projectPreflightSignal.inwardProjectCarry ? ['project-inward-carry'] : []),
      ...(projectClosureMemorySignal.hasProjectClosureMemory ? ['memory-project-closure'] : []),
      ...(projectClosureMemorySignal.sameHerClosureMemory ? ['memory-same-her-closure'] : []),
      ...(projectClosureMemorySignal.phaseOneClosureMemory ? ['memory-phase1-closure'] : []),
      ...(projectClosureMemorySignal.measuredReturnClosureMemory ? ['memory-measured-return-closure'] : []),
      ...(projectClosureMemorySignal.sameHerDriftRiskMemory ? ['memory-same-her-drift-risk'] : []),
      ...(capsuleExecutionSignal.executionCallback ? ['capsule-execution-callback'] : []),
      ...(capsuleExecutionSignal.lowerPressure ? ['capsule-lower-pressure'] : []),
      ...(capsuleExecutionSignal.selfLearning ? ['capsule-self-learning'] : []),
      ...(capsuleExecutionSignal.genericResultRisk ? ['capsule-generic-result-risk'] : []),
      ...(executionCallbackAfterglowHold ? ['callback-afterglow-hold'] : []),
    ],
  }
}
