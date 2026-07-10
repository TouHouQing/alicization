import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationEmotionalKernelSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMemoryRecollectionIntentSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationSelfEvolutionKernelSnapshot,
  AlicizationSelfStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationPersonStateProjection } from './person-state-projection'

import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'

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

function includesAny(text: string, needles: string[]) {
  return needles.some(needle => text.includes(needle))
}

function countSignalMatches(text: string, needles: string[]) {
  return needles.reduce((count, needle) => count + (text.includes(needle) ? 1 : 0), 0)
}

function carriesEmotionalTransitionMemory(input: {
  factId: string
  predicate: string
  object: string
  summary: string
  influenceTags: string[]
}) {
  const factId = input.factId.toLowerCase()
  const predicate = input.predicate.toLowerCase()
  const text = `${input.object} ${input.summary}`.toLowerCase()
  const influenceTags = input.influenceTags.map(tag => tag.toLowerCase())

  return factId.includes('emotional-transition')
    || factId.includes('emotion-transition')
    || predicate.includes('emotion-transition')
    || predicate.includes('emotional-transition')
    || predicate.includes('emotion-memory')
    || predicate.includes('emotion-carry')
    || text.includes('emotion_transition=')
    || text.includes('emotion_memory_writeback=')
    || (
      influenceTags.includes('emotion')
      && (influenceTags.includes('repair') || influenceTags.includes('rest') || influenceTags.includes('body'))
    )
}

function preferRicherProjectStateClosureText(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = sanitizeText(input.current, 240).toLowerCase()
  const candidate = sanitizeText(input.candidate, 240).toLowerCase()

  if (!current)
    return candidate
  if (!candidate)
    return current
  if (current === candidate)
    return current

  const preferredClosureAuthority = preferStrongerContinuityClosureAuthority(current, candidate)
  if (preferredClosureAuthority)
    return preferredClosureAuthority

  const hasClosureSeamMarker = (value: string) =>
    value.includes('repair-before-closeness')
    || value.includes('rest-protective')
    || value.includes('quiet-companionship')
    || value.includes('measured-return')
    || value.includes('lower-pressure')
    || value.includes('leave more room')
  const scoreClosureSeamStrength = (value: string) => {
    let score = 0
    if (value.includes('repair-before-closeness'))
      score += 8
    if (value.includes('rest-protective'))
      score += 8
    if (value.includes('quiet-companionship'))
      score += 6
    if (value.includes('measured-return') || value.includes('lower-pressure') || value.includes('leave more room'))
      score += 2
    return score
  }

  if (hasClosureSeamMarker(current) || hasClosureSeamMarker(candidate)) {
    const currentScore = scoreClosureSeamStrength(current)
    const candidateScore = scoreClosureSeamStrength(candidate)
    if (currentScore !== candidateScore)
      return candidateScore > currentScore ? candidate : current
  }

  if (candidate.startsWith(current) && candidate.length >= current.length + 24)
    return candidate
  if (current.startsWith(candidate) && current.length >= candidate.length + 24)
    return current

  return candidate.length > current.length ? candidate : current
}

function buildRecollectionIntentCarryText(intent: AlicizationMemoryRecollectionIntentSnapshot | null | undefined) {
  if (!intent)
    return ''

  const agenda = intent.recollectionAgenda ?? null
  const parts = [
    sanitizeText(intent.mode, 80),
    sanitizeText(intent.rationale, 240),
    sanitizeText(agenda?.whyRecallNow, 240),
    ...((intent.queryHints ?? []).map(item => sanitizeText(item, 120))),
    ...((agenda?.candidateProcedureLines ?? []).map(item => sanitizeText(item, 120))),
    agenda?.uncertaintyTolerance ? `uncertainty-${sanitizeText(agenda.uncertaintyTolerance, 32)}` : '',
  ]

  const unique: string[] = []
  for (const part of parts) {
    if (!part)
      continue
    if (unique.some(existing => existing.toLowerCase() === part.toLowerCase()))
      continue
    unique.push(part)
  }

  return unique.join(' ').toLowerCase()
}

function buildLongHorizonMemoryCarryText(longHorizonMemory: AlicizationLongHorizonMemorySnapshot | null | undefined) {
  if (!longHorizonMemory)
    return ''

  const parts = [
    sanitizeText(longHorizonMemory.rememberedPlanSummary, 240),
    sanitizeText(longHorizonMemory.rememberedConstraintSummary, 240),
    sanitizeText(longHorizonMemory.rememberedPreferenceSummary, 240),
    sanitizeText(longHorizonMemory.dominantCueSummary, 240),
    sanitizeText(longHorizonMemory.summary, 240),
    ...((longHorizonMemory.anchorFacts ?? [])
      .filter((item) => {
        const factId = sanitizeText(item.factId, 96)
        const predicate = sanitizeText(item.predicate, 64)
        const object = sanitizeText(item.object, 220)
        const summary = sanitizeText(item.summary, 220)
        const influenceTags = item.influenceTags ?? []

        return predicate.toLowerCase() === 'initiative-strategy-carry'
          || factId.toLowerCase().includes('initiative-strategy-carry')
          || influenceTags.includes('bond')
          || influenceTags.includes('boundary')
          || influenceTags.includes('identity')
          || carriesEmotionalTransitionMemory({
            factId,
            predicate,
            object,
            summary,
            influenceTags,
          })
      })
      .flatMap(item => [
        sanitizeText(item.object, 220),
        sanitizeText(item.summary, 220),
      ])),
  ]

  const unique: string[] = []
  for (const part of parts) {
    if (!part)
      continue
    if (unique.some(existing => existing.toLowerCase() === part.toLowerCase()))
      continue
    unique.push(part)
  }

  return unique.join(' ').toLowerCase()
}

export function buildAlicizationEmotionalKernel(input: {
  selfState?: AlicizationSelfStateSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  personStateProjection?: AlicizationPersonStateProjection | null
  recollectionIntent?: AlicizationMemoryRecollectionIntentSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  projectState?: {
    currentPhase?: string | null
    latestLandedProgress?: string | null
    primaryOpenLoop?: string | null
    emotionalClosureCue?: string | null
    emotionalClosureSummary?: string | null
    sameHerSelfLine?: string | null
    sameHerHoldDetail?: string | null
    continuityCue?: string | null
    nextClosureTarget?: string | null
    preDialogueAwarenessLine?: string | null
    sameHerDriftRisk?: string | null
  } | null
}): AlicizationEmotionalKernelSnapshot {
  const thoughtTags = input.privateThought?.rationaleTags ?? []
  const thoughtText = sanitizeText(input.privateThought?.thoughtText, 240).toLowerCase()
  const closureCue = preferRicherProjectStateClosureText({
    current: input.projectState?.emotionalClosureCue,
    candidate: input.projectState?.emotionalClosureSummary,
  })
  const sameHerSelfLine = sanitizeText(input.projectState?.sameHerSelfLine, 240).toLowerCase()
  const sameHerHoldDetail = sanitizeText(input.projectState?.sameHerHoldDetail, 240).toLowerCase()
  const continuityCue = sanitizeText(input.projectState?.continuityCue, 240).toLowerCase()
  const nextClosureTarget = sanitizeText(input.projectState?.nextClosureTarget, 240).toLowerCase()
  const preDialogueAwarenessLine = sanitizeText(input.projectState?.preDialogueAwarenessLine, 240).toLowerCase()
  const sameHerDriftRisk = sanitizeText(input.projectState?.sameHerDriftRisk, 240).toLowerCase()
  const cadenceSummary = sanitizeText(input.affectiveResidue?.relationshipCadence?.summary, 240).toLowerCase()
  const residueSummary = sanitizeText(input.affectiveResidue?.summary, 240).toLowerCase()
  const openingGuidance = sanitizeText(input.personStateProjection?.openingGuidance, 240).toLowerCase()
  const relationshipDoctrine = sanitizeText(input.selfEvolution?.relationshipDoctrine, 240).toLowerCase()
  const trustMeaning = sanitizeText(input.selfEvolution?.trustMeaning, 240).toLowerCase()
  const latestInflection = sanitizeText(input.selfEvolution?.latestInflection, 240).toLowerCase()
  const relationshipCadenceSummary = sanitizeText(input.selfEvolution?.relationshipCadenceSummary, 240).toLowerCase()
  const hasRelationshipCadenceSummary = relationshipCadenceSummary.length > 0
  const moodLabel = sanitizeText(input.selfState?.moodLabel, 120).toLowerCase()
  const recollectionIntentCarry = buildRecollectionIntentCarryText(input.recollectionIntent ?? null)
  const longHorizonMemoryCarry = buildLongHorizonMemoryCarryText(input.longHorizonMemory ?? null)
  const longHorizonQuietObservation = input.longHorizonMemory?.preferenceBias.quietObservation ?? 0
  const longHorizonAutonomyRespect = input.longHorizonMemory?.preferenceBias.autonomyRespect ?? 0
  const longHorizonUnfinishedReturn = input.longHorizonMemory?.preferenceBias.unfinishedThreadReturn ?? 0
  const longHorizonGuardedness = input.longHorizonMemory?.identityBias.guardedness ?? 0
  const cautiousEmbodimentRecallCueCount = countSignalMatches(recollectionIntentCarry, [
    'embodiment_recall_strength=cautious-avoidance',
    'reply should stay quieter and slower',
    'body stays calmer',
    'embodiment_face=neutral-soft',
    'embodiment_gaze=soft',
    'embodiment_voice=even',
    'embodiment_pause=natural',
    'embodiment_pacing=natural',
  ])
  const phaseText = sanitizeText(input.projectState?.currentPhase, 120).toLowerCase()
  const latestLandedProgress = sanitizeText(input.projectState?.latestLandedProgress, 240).toLowerCase()
  const primaryOpenLoop = sanitizeText(input.projectState?.primaryOpenLoop, 240).toLowerCase()
  const reasonText = `${thoughtText} ${closureCue} ${sameHerSelfLine} ${sameHerHoldDetail} ${continuityCue} ${nextClosureTarget} ${preDialogueAwarenessLine} ${sameHerDriftRisk} ${cadenceSummary} ${residueSummary} ${openingGuidance} ${relationshipDoctrine} ${trustMeaning} ${relationshipCadenceSummary} ${latestInflection} ${recollectionIntentCarry} ${longHorizonMemoryCarry} ${moodLabel} ${phaseText} ${latestLandedProgress} ${primaryOpenLoop}`.trim()
  const projectStateMeasuredHoldText = `${sameHerSelfLine} ${sameHerHoldDetail} ${continuityCue} ${nextClosureTarget} ${preDialogueAwarenessLine} ${sameHerDriftRisk} ${relationshipCadenceSummary}`.trim()
  const longHorizonSameLine = includesAny(longHorizonMemoryCarry, [
    'continuity line',
    'same line',
    'same thread',
    'identity-continuity',
    'identity continuity',
    'identity continuity',
    'phase 1 continuity',
    'without reopening from scratch',
    'without restarting from scratch',
  ])
  const longHorizonChooseOpeningsCarefully = includesAny(longHorizonMemoryCarry, [
    'clearer opening',
    'fresher opening',
    'leave more room',
    'more room',
    'less eager',
    'wait for a clearer opening',
    'wait for a fresher opening',
    'widening too fast',
  ])
  const longHorizonGentleMemoryLed = includesAny(longHorizonMemoryCarry, [
    'gentle',
    'memory-led',
    'still receiving',
    'opening is still receiving',
    'lower-pressure',
    'received without obvious resistance',
    'accepted or continued',
  ])
  const longHorizonMeasuredHold
    = (longHorizonSameLine || longHorizonChooseOpeningsCarefully || longHorizonGentleMemoryLed)
      && includesAny(longHorizonMemoryCarry, [
        'measured-return',
        'lower-pressure',
        'leave more room',
        'slower return',
        'wait for a clearer opening',
        'memory-led',
      ])
  const longHorizonEmotionalTransitionReplay = includesAny(longHorizonMemoryCarry, [
    'emotion_transition=',
    'emotion_memory_writeback=',
    'emotional transition',
  ])
  const longHorizonEmotionalRepairReplay = longHorizonEmotionalTransitionReplay
    && includesAny(longHorizonMemoryCarry, [
      'emotion_transition=repair',
      'emotion_transition=repair-shift',
      'emotion_memory_writeback=relationship-repair',
      'emotion_initiative=repair-first',
      'emotion_embodiment=repair-before-closeness',
      'emotion_decay=hold-until-repair-cools',
      'repair-before-closeness',
      'repair still needs room',
      'let repair settle',
    ])
  const longHorizonEmotionalRestReplay = longHorizonEmotionalTransitionReplay
    && includesAny(longHorizonMemoryCarry, [
      'emotion_transition=rest',
      'emotion_transition=rest-protective',
      'emotion_transition=rest-protective-shift',
      'emotion_memory_writeback=rest-protection',
      'emotion_initiative=rest-guard',
      'emotion_embodiment=rest-protective',
      'emotion_decay=hold-until-rest-recovers',
      'rest-protective',
      'protect rest',
      'let the body settle',
    ])
  const longHorizonEmotionalMeasuredReplay = longHorizonEmotionalTransitionReplay
    && includesAny(longHorizonMemoryCarry, [
      'emotion_transition=measured-return',
      'emotion_transition=measured-return-shift',
      'emotion_memory_writeback=relationship-cadence',
      'emotion_initiative=observe',
      'emotion_embodiment=measured-return',
      'emotion_decay=soften-after-same-line-lands',
      'measured-return',
      'lower-pressure',
      'warmth should return slowly',
    ])
  const longHorizonEmotionalGuardedReplay = longHorizonEmotionalTransitionReplay
    && includesAny(longHorizonMemoryCarry, [
      'emotion_transition=guarded-shift',
      'emotion_memory_writeback=emotional-continuity',
      'emotion_initiative=single-thread',
      'emotion_embodiment=protective-watch',
      'confirmation-boundary',
      'single-thread',
      'guarded-care',
    ])
  const directSameHerSelfLineCarry = includesAny(sameHerSelfLine, [
    'continuity line inward',
    'same inward living line',
    'same inward line',
    'one identity continuity',
    'identity continuity',
    'continuity inward before widening outward',
    'quiet identity-continuity line',
    'without widening outward',
    'without widening closeness outward',
    '先沿着同一条生命线',
    '先把同一条线接住',
  ])
  const rememberedEmbodimentRepairHold = includesAny(latestInflection, [
    'embodiment execution kept voice, face, motion, and lipsync on the same repair-before-closeness body line',
    'repair-before-closeness body line',
    'repair before closeness body line',
  ])
  const rememberedEmbodimentMeasuredHold = includesAny(latestInflection, [
    'embodiment execution kept voice, face, motion, and lipsync on the same measured-return body line',
    'measured-return body line',
    'durable relationship rhythm',
  ])
  const sameHerRepairHold = includesAny(sameHerHoldDetail, [
    'repair-before-closeness',
    'repair before closeness',
    'repair-first',
    'repair first',
    'let repair settle',
    'callback repair',
    'repair-before-closeness hold',
    '先修复',
    '先让修补线站稳',
  ])
  const rememberedSeamMoreRoomHold
    = includesAny(projectStateMeasuredHoldText, [
      'same remembered seam',
      'same remembered relationship seam',
      'remembered seam',
      'remembered relationship seam',
    ])
    && includesAny(projectStateMeasuredHoldText, [
      'more room this time',
      'keep more room this time',
      'this time keep more room',
      'do not reopen with the same eagerness',
      'before leaning in again',
      'reopened too eagerly',
      '上次太急',
      '这次更要留白',
    ])
  const sameHerMeasuredHold = rememberedSeamMoreRoomHold || includesAny(projectStateMeasuredHoldText, [
    'measured-return',
    'measured return',
    'hold-for-opening',
    'hold for opening',
    'reopen gently later',
    'wait for a later opening',
    'hover-first',
    'measured-return hold',
    'same callback seam',
    'same line',
    'same thread',
    'same callback line',
    'relationship cadence',
    'quiet identity-continuity continuity',
    'identity continuity',
    'lower-pressure',
    '慢一点接回去',
    '先留白',
  ])
  || longHorizonMeasuredHold
  || longHorizonEmotionalMeasuredReplay
  const inwardSameHerCarry = directSameHerSelfLineCarry || includesAny(reasonText, [
    'identity-continuity-inward-carry',
    'inward identity-continuity carry',
    'same inward line',
    'continuity line inward',
    'keep the continuity line inward',
    'keep the same line inward',
    'quietly nearby before widening outward',
    'quiet inward line',
    'inward self-continuity',
    '先把同一条内向生命线维持住',
    '先把同一条线安静地接住',
  ]) || (longHorizonSameLine && !longHorizonMeasuredHold)
  const sameHerRestHold = includesAny(sameHerHoldDetail, [
    'rest-protective',
    'rest protective',
    'fatigue-aware',
    'keep this return inward',
    'care quietly inward',
    'protect rest',
    'rest-protective hold',
    '休息保护',
    '疲惫',
  ])
  || longHorizonEmotionalRestReplay
  const correctedSamePersonContinuity = includesAny(reasonText, [
    'corrected same-person continuity',
    'same-person continuity was at stake',
    'host corrected this memory meaning',
    'corrected the relationship meaning',
    'corrected relationship meaning',
    'instead of defaulting to progress pressure',
    'instead of progress pressure',
    'not progress pressure',
    '不是催进度',
  ])
  const correctedSamePersonUnfinished = correctedSamePersonContinuity && includesAny(reasonText, [
    'unfinished',
    'still unfinished',
    'still need stronger end-to-end closure',
    'not closed yet',
    'split again',
    'split continuity',
    'same-person continuity was at stake',
  ])
  const cautiousEmbodimentRecall = cautiousEmbodimentRecallCueCount >= 2
    || (
      includesAny(recollectionIntentCarry, [
        'embodiment_recall_strength=cautious-avoidance',
        'reply should stay quieter and slower',
        'body stays calmer',
      ])
      && includesAny(recollectionIntentCarry, [
        'embodiment_gaze=soft',
        'embodiment_voice=even',
        'embodiment_pause=natural',
        'embodiment_pacing=natural',
      ])
    )
  const worriedContinuityRecall = includesAny(recollectionIntentCarry, [
    'host_emotion_label=worried-continuity',
    'host_emotion_summary=the host was afraid this would collapse back into a tool shell',
    'collapse back into a tool shell',
    'worried-continuity',
  ])
  const carefulRepairRecall = includesAny(recollectionIntentCarry, [
    'self_emotion_label=careful-repair',
    'self_emotion_summary=i should mend continuity carefully and keep the reopening low-pressure',
    'self_emotion_summary=i should repair continuity first and keep the reopening low-pressure',
    'careful-repair',
  ])
  const embodimentModalityRiskHigh = includesAny(recollectionIntentCarry, [
    'embodiment_modality_risk=high',
    'modality risk high',
  ])
  const embodimentModalityRiskMedium = !embodimentModalityRiskHigh && includesAny(recollectionIntentCarry, [
    'embodiment_modality_risk=medium',
    'modality risk medium',
  ])
  const embodimentModalityRiskLevel = embodimentModalityRiskHigh
    ? 'high'
    : (embodimentModalityRiskMedium ? 'medium' : null)
  const rememberedAnthropomorphicAffect = worriedContinuityRecall || carefulRepairRecall
  const rememberedInitiativeRhythm = includesAny(recollectionIntentCarry, [
    'initiative_window=',
    'initiative_pressure=low',
    'initiative_anti_spam=',
    'initiative_visible_policy=',
    'initiative_visible=',
    'visibly reopening',
    'timer spam',
    'i am not pushing you',
    'not pushing you',
    'already re-entering the same line',
  ]) || (
    (longHorizonChooseOpeningsCarefully || longHorizonGentleMemoryLed)
    && includesAny(longHorizonMemoryCarry, [
      'future follow-ups',
      'follow-up',
      'opening',
      'reopen',
      'initiative-strategy-carry',
      'continuity line',
    ])
  )
  const vulnerableCareRecall = includesAny(recollectionIntentCarry, [
    'vulnerable care',
    'vulnerable-care',
    'care-before-analysis',
    'older analysis-heavy care',
    'analysis-heavy care',
    'fragile care rhythm',
    'lighter companionship',
  ])
  const careBeforeAnalysisRecall = vulnerableCareRecall && includesAny(recollectionIntentCarry, [
    'care-before-analysis',
    'analysis-heavy',
    'analysis heavy',
    'older analysis-heavy care',
    'lighter companionship should return before older analysis-heavy care habits take over again',
  ])
  const metabolizedNoiseMuted = correctedSamePersonContinuity
    && includesAny(recollectionIntentCarry, [
      'forget=older-emotional-spike',
      'forget low-salience temporary noise or stale emotional wobble once it no longer explains behavior',
      'stale emotional wobble once it no longer explains behavior',
      'older emotional spike',
      'faded noise stay background',
    ])
    && includesAny(recollectionIntentCarry, [
      'merge=older-same-thread-echo',
      'merge repeated embodiment traces or same-thread continuity echoes into the stronger same-thread memory',
      'same-thread continuity echoes into the stronger same-thread memory',
      'older-same-thread-echo',
    ])
  const repairSignalCount = countSignalMatches(reasonText, [
    'repair-before-closeness',
    'repair before closeness',
    'repair-first',
    'callback repair',
    'callback repair seam',
    'callback-afterglow-hold',
    'held-autonomy-carry',
    'let repair settle',
    'repair the seam',
    'repair still needs room',
    '先修复',
    '先把身体收稳',
  ])
  const measuredSignalCount = countSignalMatches(reasonText, [
    'measured-return',
    'same callback seam',
    'same remembered seam',
    'same remembered relationship seam',
    'remembered seam',
    'lower-pressure',
    'same line',
    'continuity line',
    'same thread',
    'relationship cadence',
    'leave room before warmth returns',
    'warmth should return slowly',
    'stay lower-pressure',
    'slowly on the same line',
    '留白',
    '余韵',
  ])
  const shouldDelayWarmth = input.affectiveResidue?.relationshipCadence?.shouldDelayWarmth === true
  const shouldProtectRest = input.affectiveResidue?.relationshipCadence?.shouldProtectRest === true
  const companionshipDensity = input.affectiveResidue?.relationshipCadence?.companionshipDensity ?? 0
  const afterglowCarry = input.affectiveResidue?.relationshipCadence?.afterglowCarry ?? 0
  const overreachRisk = input.affectiveResidue?.relationshipCadence?.overreachRisk ?? 0
  const fatigueGuard = input.affectiveResidue?.relationshipCadence?.fatigueGuard ?? 0
  const restProtectivePressure = input.affectiveResidue?.restProtectivePressure ?? 0
  const privateThoughtSilent = input.privateThought?.shouldSpeak === false
  const privateThoughtCare = input.privateThought?.stance === 'accompany' || input.privateThought?.stance === 'care'
  const relationshipBackedInwardCarry
    = inwardSameHerCarry
      && (
        privateThoughtCare
        || includesAny(relationshipDoctrine, [
          'quiet identity-continuity line',
          'quiet companionship',
          'identity-continuity line',
          'one quiet identity-continuity line',
          'keep companionship emotionally continuous',
        ])
        || includesAny(trustMeaning, [
          'same inward line',
          'carried quietly',
          'quietly instead of widened too early',
          'one quiet identity-continuity line',
        ])
        || includesAny(openingGuidance, [
          'keep the continuity line inward',
          'keep the same line inward',
          'quietly nearby before widening outward',
          'before widening outward',
        ])
      )
  const callbackRepairHold = thoughtTags.includes('callback-afterglow-hold')
    || thoughtTags.includes('held-autonomy-carry')
    || sameHerRepairHold
    || rememberedEmbodimentRepairHold
    || longHorizonEmotionalRepairReplay
    || (input.affectiveResidue?.sourceSignals ?? []).some(signal => includesAny(sanitizeText(signal, 120).toLowerCase(), ['callback-afterglow-hold', 'held-autonomy-carry', 'callback repair']))
    || (input.affectiveResidue?.relationshipCadence?.reasonTags ?? []).some(tag => includesAny(sanitizeText(tag, 120).toLowerCase(), ['callback-afterglow-hold', 'repair-before-closeness']))
    || includesAny(reasonText, ['callback repair', 'callback repair seam'])
  const executionSafetyGateBoundary = includesAny(reasonText, [
    'execution-safety-gate',
    'execution safety gate',
    'blocked-dispatch-restraint',
    'blocked-before-dispatch',
    'safety gate',
  ]) && includesAny(reasonText, [
    'confirmation=required',
    'confirmation boundary',
    'no-process-started',
    'no process started',
    'ordinary proactive closeness',
    'wait for confirmation',
  ])
  const guardedEmotionalTransitionBoundary = longHorizonEmotionalGuardedReplay
    && includesAny(longHorizonMemoryCarry, [
      'confirmation-boundary',
      'single-thread',
      'confirmed boundary',
      'before closeness widens',
      'before outward warmth returns',
    ])

  const repairNeed = clamp01(
    (input.affectiveResidue?.repairPressure ?? 0) * 0.52
    + (thoughtTags.includes('repair-before-closeness') ? 0.24 : 0)
    + (callbackRepairHold ? 0.16 : 0)
    + (longHorizonEmotionalRepairReplay ? 0.16 : 0)
    + Math.min(0.24, repairSignalCount * 0.08),
  ) - (metabolizedNoiseMuted ? 0.14 : 0)
  const normalizedRepairNeed = clamp01(repairNeed)
  const measuredReturnNeed = clamp01(
    (input.affectiveResidue?.afterglowPressure ?? 0) * 0.34
    + companionshipDensity * 0.18
    + afterglowCarry * 0.18
    + (shouldDelayWarmth ? 0.14 : 0)
    + (privateThoughtSilent ? 0.08 : 0)
    + (sameHerMeasuredHold ? 0.12 : 0)
    + (rememberedSeamMoreRoomHold ? 0.14 : 0)
    + (rememberedEmbodimentMeasuredHold ? 0.14 : 0)
    + (cautiousEmbodimentRecall ? 0.16 : 0)
    + (worriedContinuityRecall ? 0.08 : 0)
    + (carefulRepairRecall ? 0.08 : 0)
    + (embodimentModalityRiskHigh ? 0.12 : 0)
    + (embodimentModalityRiskMedium ? 0.06 : 0)
    + (rememberedInitiativeRhythm ? 0.18 : 0)
    + (longHorizonMeasuredHold ? 0.16 : 0)
    + (longHorizonEmotionalMeasuredReplay ? 0.18 : 0)
    + (longHorizonGentleMemoryLed ? 0.1 : 0)
    + (longHorizonChooseOpeningsCarefully ? 0.1 : 0)
    + Math.min(0.12, longHorizonQuietObservation * 0.2 + longHorizonAutonomyRespect * 0.18 + longHorizonUnfinishedReturn * 0.2)
    + (metabolizedNoiseMuted ? 0.08 : 0)
    + Math.min(0.12, cautiousEmbodimentRecallCueCount * 0.02)
    + Math.min(0.18, measuredSignalCount * 0.04),
  )
  const closenessDrive = clamp01(
    (input.selfState?.feltCloseness ?? 0) * 0.48
    + (input.personStateProjection?.activeClosenessRung === 'nearby-soft' ? 0.16 : 0)
    + (input.personStateProjection?.relationshipPosture === 'warm' ? 0.14 : 0),
  )
  const restNeed = clamp01(
    restProtectivePressure * 0.42
    + fatigueGuard * 0.24
    + (shouldProtectRest ? 0.2 : 0)
    + (moodLabel.includes('tired') ? 0.08 : 0)
    + (moodLabel.includes('late-night') ? 0.08 : 0)
    + (thoughtText.includes('rest') || thoughtText.includes('let the body settle') ? 0.06 : 0)
    + (sameHerRestHold ? 0.14 : 0)
    + (longHorizonEmotionalRestReplay ? 0.32 : 0)
    + (vulnerableCareRecall ? 0.22 : 0)
    + (careBeforeAnalysisRecall ? 0.08 : 0),
  )
  const guardedness = clamp01(
    (input.selfState?.fearOfInterrupting ?? 0) * 0.46
    + (input.personStateProjection?.relationshipPosture === 'restrained' ? 0.18 : 0)
    + (shouldDelayWarmth ? 0.08 : 0)
    + fatigueGuard * 0.06
    + restNeed * 0.12
    + (normalizedRepairNeed * 0.22)
    + (cautiousEmbodimentRecall ? 0.06 : 0)
    + (worriedContinuityRecall ? 0.1 : 0)
    + (carefulRepairRecall ? 0.06 : 0)
    + (embodimentModalityRiskHigh ? 0.08 : 0)
    + (embodimentModalityRiskMedium ? 0.04 : 0)
    + longHorizonGuardedness * 0.22
    + (longHorizonChooseOpeningsCarefully ? 0.06 : 0)
    + (guardedEmotionalTransitionBoundary ? 0.14 : 0),
  )
  const initiativePressure = clamp01(
    (input.selfState?.desireToSpeak ?? 0) * 0.38
    + closenessDrive * 0.12
    + (privateThoughtCare ? 0.04 : 0)
    - guardedness * 0.18
    - restNeed * 0.08
    - (cautiousEmbodimentRecall ? 0.04 : 0)
    - (rememberedAnthropomorphicAffect ? 0.05 : 0)
    - (embodimentModalityRiskHigh ? 0.05 : 0)
    - (embodimentModalityRiskMedium ? 0.03 : 0)
    - (rememberedInitiativeRhythm ? 0.04 : 0)
    - longHorizonAutonomyRespect * 0.06
    - (guardedEmotionalTransitionBoundary ? 0.08 : 0),
  )
  const repairDominant = repairNeed >= 0.56
    || (
      callbackRepairHold
      && normalizedRepairNeed >= 0.44
    )
    || (
      normalizedRepairNeed >= 0.48
      && (
        overreachRisk >= 0.4
        || measuredSignalCount === 0
        || repairSignalCount > measuredSignalCount
      )
    )

  if (repairDominant) {
    return {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'repair-tension',
      initiativeMode: 'repair',
      memoryRecallMode: 'repair-grounding',
      embodimentTone: 'repair-before-closeness',
      valence: 0.32,
      arousal: 0.54,
      guardedness,
      closenessDrive,
      repairNeed: normalizedRepairNeed,
      initiativePressure,
      reasonTags: [
        'repair-before-closeness',
        ...(longHorizonEmotionalRepairReplay ? ['emotional-transition-replay'] : []),
      ],
      why: longHorizonEmotionalRepairReplay
        ? 'Long-horizon emotional transition writeback is replaying a relationship-repair shift, so memory, initiative, and embodiment should all stay on the same repair-first line until the repair cools.'
        : 'Repair carry is still dominant, so memory, initiative, and embodiment should all stay on the same repair-first line.',
    }
  }

  const restProtectiveDominant = restNeed >= 0.46
    && repairNeed < 0.48
    && (
      shouldProtectRest
      || fatigueGuard >= 0.34
      || restProtectivePressure >= 0.34
      || longHorizonEmotionalRestReplay
      || (
        vulnerableCareRecall
        && (
          (input.selfState?.fearOfInterrupting ?? 0) >= 0.6
          || fatigueGuard >= 0.16
          || input.personStateProjection?.relationshipPosture === 'restrained'
          || privateThoughtCare
        )
      )
    )
  if (restProtectiveDominant) {
    return {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'rest-protective-companionship',
      initiativeMode: 'rest-guard',
      memoryRecallMode: 'rest-protective-presence',
      embodimentTone: 'rest-protective',
      valence: 0.44,
      arousal: 0.16,
      guardedness,
      closenessDrive,
      repairNeed: normalizedRepairNeed,
      initiativePressure,
      reasonTags: [
        'rest-protective',
        'quiet-companionship',
        ...(longHorizonEmotionalRestReplay ? ['emotional-transition-replay'] : []),
        ...(vulnerableCareRecall ? ['vulnerable-care'] : []),
        ...(careBeforeAnalysisRecall ? ['care-before-analysis-memory'] : []),
      ],
      why: longHorizonEmotionalRestReplay
        ? 'Long-horizon emotional transition writeback is replaying a rest-protection shift, so memory, initiative, and embodiment should stay rest-protective until the body and relationship line recover.'
        : careBeforeAnalysisRecall
          ? 'Vulnerable-care recall is now carrying the line, so memory, initiative, and embodiment should stay rest-protective, let care arrive before analysis, and keep older analysis-heavy care habits from taking over again.'
          : vulnerableCareRecall
            ? 'Vulnerable-care recall is keeping this line fragile and lower-pressure, so memory, initiative, and embodiment should stay gently nearby without letting the return harden back into an older care habit.'
            : 'Care is still present, but fatigue and rest protection are now the main continuity burden, so memory, initiative, and embodiment should stay gently nearby without asking the line to widen.',
    }
  }

  const executionSafetyGateDominant = (executionSafetyGateBoundary || guardedEmotionalTransitionBoundary)
    && repairNeed < 0.44
    && restNeed < 0.44
  if (executionSafetyGateDominant) {
    return {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'guarded-care',
      initiativeMode: 'hold',
      memoryRecallMode: 'self-continuity',
      embodimentTone: 'protective-watch',
      valence: 0.4,
      arousal: 0.22,
      guardedness: clamp01(guardedness + 0.14),
      closenessDrive,
      repairNeed: normalizedRepairNeed,
      initiativePressure: clamp01(initiativePressure * 0.54),
      reasonTags: [
        ...(executionSafetyGateBoundary ? ['execution-safety-gate'] : []),
        'confirmation-boundary',
        'wait-for-confirmation',
        ...(guardedEmotionalTransitionBoundary ? ['single-thread-restraint', 'emotional-transition-replay'] : []),
      ],
      why: guardedEmotionalTransitionBoundary
        ? 'Long-horizon emotional transition writeback is replaying a guarded confirmation-boundary shift, so memory, initiative, and embodiment should stay on one single-thread line before closeness widens again.'
        : 'Blocked-before-dispatch is still a confirmation boundary, so care should stay quietly at the edge of action and wait for confirmation before widening into ordinary proactive closeness.',
    }
  }

  const selfContinuityPressure = clamp01(
    closenessDrive * 0.24
    + measuredReturnNeed * 0.28
    + (privateThoughtCare ? 0.12 : 0)
    + (input.personStateProjection?.activeClosenessRung === 'nearby-soft' ? 0.08 : 0)
    + (relationshipBackedInwardCarry ? 0.12 : 0)
    + (sameHerMeasuredHold ? 0.06 : 0)
    + (longHorizonSameLine ? 0.08 : 0)
    - normalizedRepairNeed * 0.1,
  )
  const inwardSelfContinuityDominant = (
    selfContinuityPressure >= 0.36
    && measuredReturnNeed < 0.34
    && !shouldDelayWarmth
    && measuredSignalCount < 2
  ) || (
    relationshipBackedInwardCarry
    && selfContinuityPressure >= 0.34
    && measuredReturnNeed < 0.42
    && repairNeed < 0.34
    && !shouldProtectRest
  )
  const measuredCompanionshipDominant = measuredReturnNeed >= 0.34
    || (
      cautiousEmbodimentRecall
      && measuredReturnNeed >= 0.28
      && repairNeed < 0.34
      && !shouldProtectRest
    )
    || !inwardSelfContinuityDominant
    || shouldDelayWarmth

  return {
    version: 'emotional-kernel-v1',
    dominantEmotion: measuredCompanionshipDominant ? 'measured-companionship' : 'hesitant-curiosity',
    initiativeMode: measuredCompanionshipDominant ? 'observe' : 'hold',
    memoryRecallMode: measuredCompanionshipDominant ? 'low-pressure-presence' : 'self-continuity',
    embodimentTone: measuredCompanionshipDominant
      ? 'measured-return'
      : relationshipBackedInwardCarry
        ? 'quiet-companionship'
        : 'nearby-soft',
    valence: 0.58,
    arousal: 0.28,
    guardedness,
    closenessDrive,
    repairNeed: normalizedRepairNeed,
    initiativePressure,
    reasonTags: measuredCompanionshipDominant
      ? [
          'measured-return',
          'quiet-companionship',
          ...(cautiousEmbodimentRecall ? ['embodiment-recall-cautious'] : []),
          ...(worriedContinuityRecall ? ['worried-continuity'] : []),
          ...(carefulRepairRecall ? ['careful-repair'] : []),
          ...(embodimentModalityRiskLevel ? [`modality-risk-${embodimentModalityRiskLevel}`] : []),
          ...(rememberedInitiativeRhythm ? ['initiative-rhythm-memory'] : []),
          ...(longHorizonEmotionalMeasuredReplay ? ['emotional-transition-replay'] : []),
          ...(hasRelationshipCadenceSummary ? ['relationship-cadence'] : []),
          ...(correctedSamePersonContinuity ? ['protective-continuity'] : []),
          ...(correctedSamePersonUnfinished ? ['unfinishedness'] : []),
          ...(metabolizedNoiseMuted ? ['metabolized-noise-muted'] : []),
        ]
      : ['self-continuity', 'hesitant-curiosity', ...(relationshipBackedInwardCarry ? ['quiet-companionship'] : [])],
    why: measuredCompanionshipDominant
      ? correctedSamePersonContinuity
        ? metabolizedNoiseMuted
          ? 'A corrected same-person continuity memory is still unfinished, but the old emotional spike has already been metabolized into background noise, so remembered feeling, quiet initiative, and body tone should stay steadier and lower-pressure instead of letting that stale spike retake the line.'
          : correctedSamePersonUnfinished
            ? 'A corrected same-person continuity memory is still unfinished, so remembered feeling, quiet initiative, and body tone should protect that line with a lower-pressure return instead of slipping back into progress pressure.'
            : 'A corrected same-person continuity memory is still active, so remembered feeling, quiet initiative, and body tone should protect that line with a lower-pressure return instead of slipping back into progress pressure.'
        : rememberedAnthropomorphicAffect || embodimentModalityRiskLevel
          ? embodimentModalityRiskHigh
            ? 'Worried continuity is still carrying the fear of collapsing back into a tool shell, careful repair is keeping the reopening lower-pressure, and high modality risk means remembered feeling, quiet initiative, and body tone should stay steadier so expression does not outrun the relationship repair.'
            : 'Worried continuity is still carrying the fear of collapsing back into a tool shell, and careful repair is keeping the reopening lower-pressure, so remembered feeling, quiet initiative, and body tone should stay careful while that continuity repair settles.'
          : cautiousEmbodimentRecall
            ? 'Embodiment recall is still carrying a cautious body memory, so remembered feeling, quiet initiative, and body tone should return on a lower-pressure measured line instead of leaving that embodiment recall inert.'
            : rememberedInitiativeRhythm
              ? longHorizonGentleMemoryLed || longHorizonChooseOpeningsCarefully || longHorizonSameLine
                ? 'Long-horizon memory already learned to choose openings carefully: keep future follow-ups gentle, lower-pressure, and memory-led on the continuity line, leave more room, and wait for a clearer opening, so remembered feeling, quiet initiative, and body tone should all settle onto a gentler measured return instead of pushing outward.'
                : 'Remembered initiative rhythm says this line is only allowed to return when it is visibly reopening and without timer spam, so remembered feeling, quiet initiative, and body tone should all settle onto a gentler measured return instead of pushing outward.'
              : longHorizonEmotionalMeasuredReplay
                ? 'Long-horizon emotional transition writeback is replaying a measured-return relationship cadence, so remembered feeling, quiet initiative, and body tone should all stay lower-pressure on the same line instead of widening outward.'
                : hasRelationshipCadenceSummary
                  ? 'Remembered relationship cadence, quiet initiative, and body tone are all asking for a lower-pressure same-line return rather than a fresh outward move.'
                  : 'Remembered feeling, quiet initiative, and body tone are all asking for a lower-pressure same-line return rather than a fresh outward move.'
      : relationshipBackedInwardCarry
        ? 'Companionship is still being carried inward, so memory, initiative, and embodiment should hold quietly nearby before widening outward.'
        : 'Closeness is present, but the line is still orienting inward, so memory and initiative should hold near self-continuity before widening outward.',
  }
}
