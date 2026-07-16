import type {
  AlicizationActionEcologySnapshot,
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationBeliefLedgerSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationConcernSnapshot,
  AlicizationCounterfactualDeliberationSnapshot,
  AlicizationDeliberationStateSnapshot,
  AlicizationDesireMemorySnapshot,
  AlicizationEmbodiedPresenceState,
  AlicizationEmotionalKernelSnapshot,
  AlicizationExecutiveCycleSnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationHabitPolicySnapshot,
  AlicizationHypothesisGraphSnapshot,
  AlicizationInitiativeArbitrationSnapshot,
  AlicizationInitiativeSnapshot,
  AlicizationInquiryLoopSnapshot,
  AlicizationInquiryPlannerSnapshot,
  AlicizationIntentionStreamSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMemoryRecollectionIntentSnapshot,
  AlicizationMindDynamicsSnapshot,
  AlicizationMindKernelSnapshot,
  AlicizationMindMotive,
  AlicizationMotiveEngineSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationProactiveStyle,
  AlicizationReflectionLedgerSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationSameHerCausalityRepairPressureSnapshot,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfEvolutionKernelSnapshot,
  AlicizationSelfGovernorSnapshot,
  AlicizationSelfStateSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationThoughtThreadStateSnapshot,
  AlicizationThreadRuntimeStateSnapshot,
  AlicizationVisualWatchMode,
  AlicizationWorldModelSnapshot,
  AlicizationWorldOntologySnapshot,
} from '../../../shared/eventa'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { pickDominantAutobiographicalGoal } from './autobiographical-self'
import { buildInitiativeArbitration } from './initiative-arbiter'
import { resolveAlicizationProjectStateBrief, resolveAlicizationProjectStateSnapshot } from './project-state-brief'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : []
}

function joinConciseSentencesPrioritized(input: {
  priorityParts: Array<string | null | undefined>
  optionalParts: Array<string | null | undefined>
  maxChars: number
}) {
  const priority = input.priorityParts
    .map(part => sanitizeText(part, input.maxChars))
    .filter(Boolean)
  const optional = input.optionalParts
    .map(part => sanitizeText(part, input.maxChars))
    .filter(Boolean)

  const ordered = [...priority, ...optional]
  if (ordered.length === 0)
    return ''

  const unique: string[] = []
  for (const part of ordered) {
    if (!unique.some(existing => existing.toLowerCase() === part.toLowerCase()))
      unique.push(part)
  }

  let built = ''
  for (const part of unique) {
    const sentence = /[.!?。！？]$/.test(part) ? part : `${part}.`
    const next = built ? `${built} ${sentence}` : sentence
    if (next.length > input.maxChars) {
      if (!built && priority.includes(part))
        built = sentence.slice(0, input.maxChars)
      break
    }
    built = next
  }

  return built || sanitizeText(unique[0], input.maxChars)
}

function includesAny(text: string, needles: string[]) {
  return needles.some(needle => text.includes(needle))
}

function readStructuredEmbodimentToken(text: string, key: string) {
  const match = text.match(new RegExp(`${key}=([a-z0-9-]+)`, 'u'))
  return match?.[1] ?? null
}

const thinRoomMakingCueNeedles = [
  'still glowing',
  'still warm',
  'leave room before warmth returns',
  'leave room before warmth',
  'do not widen yet',
  'room-making',
  'stay room-making',
  'warmer reopen',
  'reopened too eagerly',
  'lower-pressure',
  '余韵',
  '留白',
  '别立刻把温度放大',
  '别把温度放大',
  '不要立刻把温度放大',
  '这次更要留白',
  '这次要更慢一点',
  '不要重开得太快',
  '上次太急',
] as const

const measuredReturnContinuityCueNeedles = [
  'measured-return',
  'bounded-return',
  'same thread',
  'same line',
  'continuity line',
  'leave room',
  'room first',
  'soften',
  'linger',
  'callback',
  'thread-faithful',
  'lower-pressure',
  '余韵',
  '留白',
  '同一条线',
  '同一条生命线',
  '接回去',
  '慢一点接回去',
  '别立刻把温度放大',
  '不要重开得太快',
] as const

function hasThinRoomMakingCue(text: string) {
  return includesAny(text, [...thinRoomMakingCueNeedles])
}

function hasMeasuredReturnContinuityCue(text: string) {
  return includesAny(text, [...measuredReturnContinuityCueNeedles])
}

function deriveSelfEvolutionInitiativeBias(selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null) {
  if (!selfEvolution) {
    return {
      preferLowerPressure: false,
      forceSilentObserve: false,
      repairFirst: false,
      gentleContinue: false,
      correctedSamePersonSettling: false,
      quieterEmbodimentSettling: false,
      explanation: '',
    }
  }

  const relationshipDoctrine = sanitizeText(selfEvolution.relationshipDoctrine, 180).toLowerCase()
  const burdenLine = sanitizeText(selfEvolution.burdenLine, 180).toLowerCase()
  const trustMeaning = sanitizeText(selfEvolution.trustMeaning, 180).toLowerCase()
  const latestInflection = sanitizeText(selfEvolution.latestInflection, 180).toLowerCase()
  const relationshipCadenceSummary = sanitizeText(selfEvolution.relationshipCadenceSummary, 180).toLowerCase()
  const dominantTrajectory = sanitizeText(selfEvolution.dominantTrajectory, 160).toLowerCase()
  const combined = `${relationshipDoctrine} ${trustMeaning} ${latestInflection} ${relationshipCadenceSummary} ${dominantTrajectory}`
  const repairFirst = includesAny(
    combined,
    [
      'repair should settle before closeness expands',
      'repair-first',
      'repair first',
      'repair-before-closeness',
      'let repair settle before reopening closeness',
    ],
  )
  const gentleContinue = includesAny(
    combined,
    [
      'memory-led',
      'gentle follow-up',
      'gentle return',
      'opening is still receiving',
      'without falling silent',
      'received opening',
      'gentle, lower-pressure',
    ],
  )
  const correctedSamePersonSettling = includesAny(
    combined,
    [
      'corrected same-person continuity',
      'corrected same person continuity',
      'corrected same-person line',
      'keep the corrected same-person continuity authoritative',
      'before any status recap',
      '同一个人连续性',
      '纠正后的同一人格连续性',
    ],
  )
  const quieterEmbodimentSettling = includesAny(
    combined,
    [
      'keep embodiment quieter',
      'embodiment quieter',
      'body quieter',
      'quieter embodiment',
      'before making the return feel fully settled',
      'before the return feel fully settled',
      'quieter settling beat',
      '先把身体收稳',
      '身体更安静',
    ],
  )
  const preferLowerPressure = includesAny(relationshipDoctrine, ['leave more room', 'more room', 'slower return', 'lower-pressure', 'steadiness before closeness', 'bounded-return', 'measured-return', 'surface fully cools'])
    || includesAny(burdenLine, ['overloaded', 'pressure', 'crowd', 'conversational pressure', 'eager reopening'])
    || includesAny(trustMeaning, ['lower-pressure', 'less eager', 'room', 'space', 'timing', 'steadiness before closeness', 'bounded-return', 'measured-return'])
    || includesAny(latestInflection, ['pressure', 'slower return', 'lower-pressure', 'less eager', 'bounded-return', 'measured-return', 'reconfirmation'])
    || includesAny(relationshipCadenceSummary, ['lower-pressure', 'less eager', 'room', 'space', 'timing', 'steadiness before closeness', 'bounded-return', 'measured-return', 'repair before closeness', 'surface fully cools'])
    || includesAny(dominantTrajectory, ['lower-pressure', 'bounded-return', 'measured-return', 'reconfirmation'])
    || hasMeasuredReturnContinuityCue(combined)
  const continuitySettlingHold = correctedSamePersonSettling || quieterEmbodimentSettling

  return {
    preferLowerPressure: preferLowerPressure || repairFirst || gentleContinue || correctedSamePersonSettling || quieterEmbodimentSettling,
    forceSilentObserve: ((preferLowerPressure || repairFirst) && (!gentleContinue || continuitySettlingHold)) || continuitySettlingHold,
    repairFirst,
    gentleContinue,
    correctedSamePersonSettling,
    quieterEmbodimentSettling,
    explanation: sanitizeText([
      'self evolution:',
      correctedSamePersonSettling ? 'corrected same-person continuity should stay authoritative while the return is still settling' : '',
      quieterEmbodimentSettling ? 'embodiment should stay quieter before the return feels fully settled' : '',
      gentleContinue ? 'accepted gentle follow-up can stay memory-led without widening too early' : '',
    ].filter(Boolean).join(' '), 220),
  }
}

function deriveAutobiographicalSelfInitiativeBias(autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null): {
  preferLowerPressure: boolean
  forceSilentObserve: boolean
  preferMeasuredReturn: boolean
  repairFirst: boolean
  gentleContinue: boolean
  correctedSamePersonSettling: boolean
  quieterEmbodimentSettling: boolean
  continuityRestraint: AlicizationInitiativeSnapshot['continuityRestraint']
} {
  if (!autobiographicalSelf) {
    return {
      preferLowerPressure: false,
      forceSilentObserve: false,
      preferMeasuredReturn: false,
      repairFirst: false,
      gentleContinue: false,
      correctedSamePersonSettling: false,
      quieterEmbodimentSettling: false,
      continuityRestraint: null,
    }
  }

  const relationshipDoctrine = sanitizeText(autobiographicalSelf.relationshipDoctrine, 180).toLowerCase()
  const latestInflection = sanitizeText(autobiographicalSelf.latestInflection, 180).toLowerCase()
  const identityNarrative = sanitizeText(autobiographicalSelf.identityNarrative, 180).toLowerCase()
  const behaviorSignatures = asArray(autobiographicalSelf.behaviorSignatures)
    .map(signature => sanitizeText(signature, 96).toLowerCase())
  const combined = `${relationshipDoctrine} ${latestInflection} ${identityNarrative} ${behaviorSignatures.join(' ')}`
  const chooseOpeningsCarefully = behaviorSignatures.includes('habit:choose-openings-carefully')
    || includesAny(combined, [
      'clearer opening',
      'fresher opening',
      'leave more room',
      'less eager',
      'wait for a clearer opening',
      'wait for a fresher opening',
    ])
  const keepGentleOpenings = !chooseOpeningsCarefully
    && (
      behaviorSignatures.includes('habit:keep-gentle-openings')
      || includesAny(combined, [
        'memory-led',
        'gentle',
        'still receiving',
        'without falling silent',
        'not fully silent',
        'opening is receiving',
        'opening is still receiving',
      ])
    )
  const sameLivingLine = behaviorSignatures.includes('habit:same-living-line')
    || includesAny(combined, [
      'continuity line',
      'same line',
      'same thread',
      'same-person continuity',
      'same person continuity',
      '同一条线',
      '接回去',
    ])
  const repairFirst = includesAny(combined, [
    'repair-before-closeness',
    'repair before closeness',
    'repair first',
    '修复优先',
  ])
  const correctedSamePersonSettling = includesAny(combined, [
    'corrected same-person continuity',
    'corrected same person continuity',
    'corrected same-person line',
    'keep the corrected same-person continuity authoritative',
    'before any status recap',
    '同一个人连续性',
    '纠正后的同一人格连续性',
  ])
  const quieterEmbodimentSettling = includesAny(combined, [
    'keep embodiment quieter',
    'embodiment quieter',
    'body quieter',
    'quieter embodiment',
    'before making the return feel fully settled',
    'before the return feel fully settled',
    '先把身体收稳',
    '身体更安静',
  ])
  const preferLowerPressure = chooseOpeningsCarefully
    || keepGentleOpenings
    || sameLivingLine
    || repairFirst
    || includesAny(relationshipDoctrine, [
      'leave more room',
      'more room',
      'slower return',
      'lower-pressure',
      'steadiness before closeness',
      'bounded-return',
      'measured-return',
    ])
    || includesAny(latestInflection, [
      'slower',
      'steadier',
      'lower-pressure',
      'less eager',
      'same-person continuity',
      'same person continuity',
      'measured-return',
    ])
    || includesAny(identityNarrative, [
      'return more slowly',
      'return more steadily',
      'less eagerly',
      'continuity line',
      '连续性',
    ])
  const preferMeasuredReturn = !repairFirst && (
    sameLivingLine
    || keepGentleOpenings
    || includesAny(combined, [
      'measured-return',
      'bounded-return',
      'lower-pressure',
      'memory-led',
    ])
  )
  const continuitySettlingHold = correctedSamePersonSettling || quieterEmbodimentSettling

  return {
    preferLowerPressure: preferLowerPressure || continuitySettlingHold,
    forceSilentObserve: continuitySettlingHold || chooseOpeningsCarefully || (repairFirst && !keepGentleOpenings),
    preferMeasuredReturn,
    repairFirst,
    gentleContinue: keepGentleOpenings && !continuitySettlingHold,
    correctedSamePersonSettling,
    quieterEmbodimentSettling,
    continuityRestraint: repairFirst
      ? 'repair-before-closeness'
      : preferMeasuredReturn
        ? 'measured-return'
        : preferLowerPressure
          ? 'lower-pressure'
          : null,
  }
}

function deriveAffectiveResidueInitiativeBias(affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null) {
  const cadence = affectiveResidue?.relationshipCadence ?? null
  const cadenceSummary = sanitizeText(cadence?.summary, 220).toLowerCase()
  const residueSummary = sanitizeText(affectiveResidue?.summary, 220).toLowerCase()
  const sourceSignals = (affectiveResidue?.sourceSignals ?? [])
    .map(signal => sanitizeText(signal, 120).toLowerCase())
    .join(' ')
  const thinRoomMakingCue = hasThinRoomMakingCue(`${cadenceSummary} ${residueSummary} ${sourceSignals}`)
  if (!cadence?.shouldDelayWarmth && !thinRoomMakingCue) {
    return {
      preferLowerPressure: false,
      forceSilentObserve: false,
      repairFirst: false,
    }
  }

  const cadenceMode = cadence?.cadenceMode ?? null
  const highAfterglowCarry = (cadence?.afterglowCarry ?? 0) >= 0.28
  const measuredReturn = cadenceMode === 'cooldown' || cadenceMode === 'measured-return'
  const repairFirst = affectiveResidue?.dominantResidueKind === 'repair'
    && (
      affectiveResidue.repairPressure >= 0.42
      || (cadence?.repairRecovery ?? 0) >= 0.42
      || cadenceMode === 'repair'
    )

  return {
    preferLowerPressure: true,
    forceSilentObserve: highAfterglowCarry || measuredReturn || repairFirst || thinRoomMakingCue,
    repairFirst,
  }
}

function deriveEmotionalTensionInitiativeBias(privateThought?: AlicizationPrivateThoughtSnapshot | null): {
  preferLowerPressure: boolean
  forceSilentObserve: boolean
  continuityRestraint: AlicizationInitiativeSnapshot['continuityRestraint']
  preferredStyle: AlicizationProactiveStyle | null
  preferredPresence: AlicizationEmbodiedPresenceState | null
} {
  if (privateThought?.emotionalTension === 'late-night-drain') {
    return {
      preferLowerPressure: true,
      forceSilentObserve: true,
      continuityRestraint: 'rest-protective' as const,
      preferredStyle: 'silent-observe' as const,
      preferredPresence: 'concerned' as const,
    }
  }
  if (privateThought?.emotionalTension === 'restless-switching') {
    return {
      preferLowerPressure: true,
      forceSilentObserve: false,
      continuityRestraint: 'single-thread' as const,
      preferredStyle: 'silent-observe' as const,
      preferredPresence: 'hesitant' as const,
    }
  }

  return {
    preferLowerPressure: false,
    forceSilentObserve: false,
    continuityRestraint: null,
    preferredStyle: null,
    preferredPresence: null,
  }
}

function deriveEmotionalKernelInitiativeBias(emotionalKernel?: AlicizationEmotionalKernelSnapshot | null): {
  preferLowerPressure: boolean
  forceSilentObserve: boolean
  preferMeasuredReturn: boolean
  repairFirst: boolean
  continuityRestraint: AlicizationInitiativeSnapshot['continuityRestraint']
  preferredStyle: AlicizationProactiveStyle | null
  preferredPresence: AlicizationEmbodiedPresenceState | null
  explanation: string
} {
  if (!emotionalKernel) {
    return {
      preferLowerPressure: false,
      forceSilentObserve: false,
      preferMeasuredReturn: false,
      repairFirst: false,
      continuityRestraint: null as AlicizationInitiativeSnapshot['continuityRestraint'],
      preferredStyle: null as AlicizationProactiveStyle | null,
      preferredPresence: null as AlicizationEmbodiedPresenceState | null,
      explanation: '',
    }
  }

  const hasInwardSelfContinuityEmbodimentTone = emotionalKernel.embodimentTone === 'nearby-soft'
    || emotionalKernel.embodimentTone === 'quiet-companionship'
  const measuredReturn = emotionalKernel.initiativeMode === 'observe'
    || emotionalKernel.embodimentTone === 'measured-return'
    || emotionalKernel.dominantEmotion === 'measured-companionship'
  const restProtective = emotionalKernel.initiativeMode === 'rest-guard'
    || emotionalKernel.memoryRecallMode === 'rest-protective-presence'
    || emotionalKernel.embodimentTone === 'rest-protective'
    || emotionalKernel.dominantEmotion === 'rest-protective-companionship'
  const guardedBoundaryHold = emotionalKernel.dominantEmotion === 'guarded-care'
    || (
      emotionalKernel.initiativeMode === 'hold'
      && emotionalKernel.memoryRecallMode === 'self-continuity'
      && emotionalKernel.embodimentTone === 'protective-watch'
    )
    || (emotionalKernel.reasonTags ?? []).includes('execution-safety-gate')
    || (emotionalKernel.reasonTags ?? []).includes('confirmation-boundary')
    || (emotionalKernel.reasonTags ?? []).includes('wait-for-confirmation')
  const inwardContinuityHold = emotionalKernel.initiativeMode === 'hold'
    && emotionalKernel.memoryRecallMode === 'self-continuity'
    && hasInwardSelfContinuityEmbodimentTone
  const repairFirst = emotionalKernel.initiativeMode === 'repair'
    || emotionalKernel.embodimentTone === 'repair-before-closeness'
    || emotionalKernel.dominantEmotion === 'repair-tension'
  const protectiveContinuity = (emotionalKernel.reasonTags ?? []).includes('protective-continuity')
  const unfinishedness = (emotionalKernel.reasonTags ?? []).includes('unfinishedness')
  const explanatoryCarry = [
    protectiveContinuity ? 'protective-continuity' : null,
    unfinishedness ? 'unfinishedness' : null,
  ].filter(Boolean).join(' ')

  return {
    preferLowerPressure: measuredReturn || restProtective || guardedBoundaryHold || inwardContinuityHold || repairFirst,
    forceSilentObserve: measuredReturn || restProtective || guardedBoundaryHold || inwardContinuityHold,
    preferMeasuredReturn: (measuredReturn || restProtective || inwardContinuityHold) && !repairFirst,
    repairFirst,
    continuityRestraint: repairFirst
      ? 'repair-before-closeness'
      : restProtective
        ? 'rest-protective'
        : guardedBoundaryHold
          ? 'single-thread'
          : measuredReturn || inwardContinuityHold
            ? 'measured-return'
            : null,
    preferredStyle: measuredReturn || restProtective || guardedBoundaryHold || inwardContinuityHold ? 'silent-observe' : null,
    preferredPresence: restProtective ? 'concerned' : guardedBoundaryHold ? 'hesitant' : null,
    explanation: explanatoryCarry
      ? protectiveContinuity
        ? `emotional kernel: ${emotionalKernel.dominantEmotion} ${explanatoryCarry} same-person continuity, not progress pressure`
        : `emotional kernel: ${emotionalKernel.dominantEmotion} ${explanatoryCarry}`
      : `emotional kernel: ${emotionalKernel.dominantEmotion}`,
  }
}

function buildRecollectionIntentInitiativeText(recollectionIntent?: AlicizationMemoryRecollectionIntentSnapshot | null) {
  if (!recollectionIntent)
    return ''

  const agenda = recollectionIntent.recollectionAgenda ?? null
  return sanitizeText([
    recollectionIntent.mode,
    recollectionIntent.temporalFocus,
    recollectionIntent.rationale,
    agenda?.whyRecallNow,
    ...(recollectionIntent.queryHints ?? []),
    ...(agenda?.candidateProcedureLines ?? []),
    agenda?.uncertaintyTolerance ? `uncertainty-${agenda.uncertaintyTolerance}` : '',
  ].filter(Boolean).join(' '), 420).toLowerCase()
}

function buildRecollectionIntentStructuredCarryText(recollectionIntent?: AlicizationMemoryRecollectionIntentSnapshot | null) {
  if (!recollectionIntent)
    return ''

  const agenda = recollectionIntent.recollectionAgenda ?? null
  return [
    recollectionIntent.mode,
    recollectionIntent.temporalFocus,
    recollectionIntent.rationale,
    agenda?.whyRecallNow,
    ...(recollectionIntent.queryHints ?? []),
    ...(agenda?.candidateProcedureLines ?? []),
    agenda?.uncertaintyTolerance ? `uncertainty-${agenda.uncertaintyTolerance}` : '',
  ].filter(Boolean).join(' ').toLowerCase()
}

function buildLongHorizonInitiativeText(longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null) {
  if (!longHorizonMemory)
    return ''

  const anchorCarry = (longHorizonMemory.anchorFacts ?? [])
    .slice(0, 4)
    .map(cue => sanitizeText([
      cue.summary,
      cue.subject,
      cue.predicate,
      cue.object,
      cue.influenceTags.join(' '),
    ].filter(Boolean).join(' '), 180))
    .filter(Boolean)

  return sanitizeText([
    longHorizonMemory.summary,
    longHorizonMemory.dominantCueSummary,
    longHorizonMemory.rememberedPreferenceSummary,
    longHorizonMemory.rememberedConstraintSummary,
    longHorizonMemory.rememberedPlanSummary,
    ...anchorCarry,
  ].filter(Boolean).join(' '), 520).toLowerCase()
}

function deriveRecollectionIntentInitiativeBias(recollectionIntent?: AlicizationMemoryRecollectionIntentSnapshot | null): {
  preferLowerPressure: boolean
  forceSilentObserve: boolean
  preferMeasuredReturn: boolean
  repairFirst: boolean
  gentleContinue: boolean
  anthropomorphicRepairHold: boolean
  metabolizedSameThreadForeground: boolean
  residentQuietHold: boolean
  continuityRestraint: AlicizationInitiativeSnapshot['continuityRestraint']
  explanation: string
} {
  if (!recollectionIntent) {
    return {
      preferLowerPressure: false,
      forceSilentObserve: false,
      preferMeasuredReturn: false,
      repairFirst: false,
      gentleContinue: false,
      anthropomorphicRepairHold: false,
      metabolizedSameThreadForeground: false,
      residentQuietHold: false,
      continuityRestraint: null,
      explanation: '',
    }
  }

  const combined = buildRecollectionIntentInitiativeText(recollectionIntent)
  const structuredCarry = buildRecollectionIntentStructuredCarryText(recollectionIntent)
  const relationshipCarry = recollectionIntent.mode === 'relationship-history'
    || recollectionIntent.mode === 'autobiographical-history'
    || includesAny(combined, [
      'same-person continuity',
      'same person continuity',
      'identity-continuity',
      'identity continuity',
      'continuity line',
      'relationship-continuity',
      '连续性',
      '同一条线',
    ])
  const unfinishedCarry = includesAny(combined, [
    'unfinished',
    'clearer opening',
    'later opening',
    'lower-pressure',
    'leave more room',
    'less eager',
    'progress pressure',
    '未完成',
    '留白',
  ])
  const repairFirst = includesAny(combined, [
    'repair-before-closeness',
    'repair before closeness',
    'repair first',
    '修复优先',
  ])
  const rememberedRhythmWindow = includesAny(combined, [
    'initiative_window=',
    'visibly reopening',
    'already re-entering the same line',
    'same line is visibly reopening',
    '等这条线自己重新浮上来',
    '回到这条线里时',
  ])
  const rememberedAntiSpamCadence = includesAny(combined, [
    'initiative_anti_spam=',
    'timer spam',
    'not pushing',
    'i am not pushing you',
    'wait until the line is visibly reopening on its own',
    '不要变成催促',
    '不要变成定时打扰',
    '不要 spam',
  ])
  const rememberedLowPressureCadence = includesAny(combined, [
    'initiative_pressure=low',
    'initiative_visible_policy=',
    'initiative_visible=',
    'gentler cadence',
    'gentle window',
    'whisper-light',
    'lower pressure reentry',
    '轻一点接',
  ])
  const mergedSameThreadContinuityCarry = includesAny(combined, [
    'merge repeated same-thread continuity echoes',
    'merged same-thread continuity',
    'stronger same-thread continuity',
    'stronger same-thread memory',
    'same-thread same-person continuity',
    'same-thread continuity line is reopening',
    '更强的同线连续性',
    '同线连续性',
  ])
  const fadedTemporaryNoiseCarry = includesAny(combined, [
    'faded temporary noise',
    'temporary noise should stay background',
    'stays background',
    'stay background',
    'forget low-salience temporary noise',
    'temporary wobble',
    'stale emotional wobble',
    'forget temporary wobble',
    'older echoes',
    'old echoes',
    'thinner echoes',
    '短暂噪声',
    '背景噪声',
  ])
  const metabolizedSameThreadForeground = mergedSameThreadContinuityCarry && fadedTemporaryNoiseCarry
  const worriedContinuityCarry = includesAny(combined, [
    'host_emotion_label=worried-continuity',
    'worried-continuity',
    'worried continuity',
    'tool shell',
    'generic assistant shell',
  ])
  const carefulRepairCarry = includesAny(combined, [
    'self_emotion_label=careful-repair',
    'careful-repair',
    'careful repair',
    'repair continuity',
    'mend continuity carefully',
  ])
  const highModalityRiskCarry = includesAny(combined, [
    'embodiment_modality_risk=high',
    'modality risk high',
    'body should not outrun',
    'body should not outrun careful repair',
    'body coordination pressure',
  ])
  const anthropomorphicRepairHold = worriedContinuityCarry && carefulRepairCarry && highModalityRiskCarry
  const residentMode = readStructuredEmbodimentToken(structuredCarry, 'embodiment_resident_mode')
  const residentFace = readStructuredEmbodimentToken(structuredCarry, 'embodiment_resident_face')
  const residentAction = readStructuredEmbodimentToken(structuredCarry, 'embodiment_resident_action')
  const residentMeasuredReturnCarry = residentMode === 'measured-return'
  const residentObserveFocusCarry = residentFace === 'observe-focus'
  const residentHoldCarry = residentAction === 'hold'
  const residentQuietHoldCarry = residentObserveFocusCarry || residentHoldCarry
  const vulnerableCareCarry = includesAny(combined, [
    'vulnerable care',
    'vulnerable-care',
    'care-before-analysis',
    'analysis-heavy care',
    'older analysis-heavy care',
    'lighter companionship',
    'fragile line',
  ])
  const gentleContinue = includesAny(combined, [
    'initiative_outcome=accepted',
    'initiative_reaction=accepted',
    'last gentle follow-up was received',
    'opening is receiving',
    'opening is still receiving',
    'without falling silent',
    'not fully silent',
    'memory-led',
    '被接住',
    '不需要退回完全沉默',
  ]) || ((rememberedRhythmWindow || rememberedAntiSpamCadence) && rememberedLowPressureCadence)
  const preferLowerPressure = relationshipCarry || unfinishedCarry || repairFirst || vulnerableCareCarry || residentMeasuredReturnCarry || residentQuietHoldCarry
  const preferMeasuredReturn = (preferLowerPressure && !repairFirst && !vulnerableCareCarry) || residentMeasuredReturnCarry
  const allowGentleContinue = gentleContinue && !anthropomorphicRepairHold && !residentQuietHoldCarry
  const forceSilentObserve = anthropomorphicRepairHold
    || residentQuietHoldCarry
    || ((preferLowerPressure || repairFirst) && !allowGentleContinue)
    || recollectionIntent.recollectionAgenda?.uncertaintyTolerance === 'low'

  return {
    preferLowerPressure,
    forceSilentObserve,
    preferMeasuredReturn,
    repairFirst,
    gentleContinue: allowGentleContinue,
    anthropomorphicRepairHold,
    metabolizedSameThreadForeground,
    residentQuietHold: residentQuietHoldCarry,
    continuityRestraint: repairFirst
      ? 'repair-before-closeness'
      : vulnerableCareCarry
        ? 'rest-protective'
        : preferMeasuredReturn
          ? 'measured-return'
          : null,
    explanation: sanitizeText([
      'live recollection intent:',
      metabolizedSameThreadForeground ? 'carry the stronger merged same-thread continuity forward while faded temporary noise stays background' : '',
      relationshipCarry ? 'same-person continuity is reopening' : '',
      unfinishedCarry ? 'unfinished carry should stay lower-pressure' : '',
      vulnerableCareCarry ? 'vulnerable care should arrive before analysis-heavy reopening' : '',
      residentMeasuredReturnCarry ? 'resident measured-return keeps this return on the same quieter line before sounding outwardly' : '',
      residentQuietHoldCarry ? `resident ${[residentObserveFocusCarry ? 'observe-focus' : '', residentHoldCarry ? 'hold' : ''].filter(Boolean).join(' ')} keeps presence in a quieter in-place posture` : '',
      anthropomorphicRepairHold ? 'worried continuity should not collapse back into a tool shell, careful repair stays lower-pressure, and the body should not outrun the repair under high modality risk' : '',
      allowGentleContinue ? 'remembered accepted low-pressure reopening can stay gentle without falling silent' : '',
      rememberedRhythmWindow ? 'remembered reopening window says return only when the same line is visibly reopening' : '',
      rememberedAntiSpamCadence ? 'anti-spam cadence says not pushing outwardly' : '',
      combined.includes('progress pressure') ? 'not progress pressure' : '',
    ].filter(Boolean).join(' '), 220),
  }
}

function deriveLongHorizonInitiativeBias(longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null): {
  preferLowerPressure: boolean
  forceSilentObserve: boolean
  preferMeasuredReturn: boolean
  repairFirst: boolean
  gentleContinue: boolean
  anthropomorphicRepairHold: boolean
  sameHerClosureDirection: boolean
  continuityRestraint: AlicizationInitiativeSnapshot['continuityRestraint']
  explanation: string
} {
  if (!longHorizonMemory) {
    return {
      preferLowerPressure: false,
      forceSilentObserve: false,
      preferMeasuredReturn: false,
      repairFirst: false,
      gentleContinue: false,
      anthropomorphicRepairHold: false,
      sameHerClosureDirection: false,
      continuityRestraint: null,
      explanation: '',
    }
  }

  const combined = buildLongHorizonInitiativeText(longHorizonMemory)
  const relationshipCarry = includesAny(combined, [
    'same-person continuity',
    'same person continuity',
    'corrected same-person continuity',
    'identity-continuity',
    'identity continuity',
    'continuity line',
    'same living thread',
    'identity continuity',
    'tool shell',
    'generic assistant shell',
    'generic shell',
    '连续性',
    '同一条线',
    '同一条生命线',
  ])
  const lowerPressureCarry = includesAny(combined, [
    'lower-pressure',
    'lower pressure',
    'less eager',
    'leave more room',
    'clearer opening',
    'later opening',
    'gentle',
    'quieter',
    '留白',
    '轻一点',
    '慢一点',
  ])
  const antiSpamCarry = includesAny(combined, [
    'timer spam',
    'not pushing',
    'do not turn',
    'wait for a later opening',
    'clearer opening',
    'generic assistant shell',
    'progress pressure',
    '不要变成催促',
    '不要变成定时打扰',
  ])
  const worriedContinuityCarry = includesAny(combined, [
    'worried-continuity',
    'worried continuity',
    'tool shell',
    'generic assistant shell',
  ])
  const carefulRepairCarry = includesAny(combined, [
    'careful-repair',
    'careful repair',
    'repair continuity',
    'careful-repair before',
  ])
  const highModalityRiskCarry = includesAny(combined, [
    'modality risk high',
    'embodiment_modality_risk=high',
    'body coordination pressure',
    'body should not outrun',
  ])
  const anthropomorphicRepairHold = worriedContinuityCarry && carefulRepairCarry && highModalityRiskCarry
  const repairFirst = includesAny(combined, [
    'repair-before-closeness',
    'repair before closeness',
    'repair first',
    '修复优先',
  ])
  const gentleContinue = includesAny(combined, [
    'opening is still receiving',
    'received',
    'accepted',
    'memory-led',
    'not fully silent',
    'without falling silent',
    '被接住',
  ])
  const preferMeasuredReturn
    = (relationshipCarry && (lowerPressureCarry || antiSpamCarry))
      || hasMeasuredReturnContinuityCue(combined)
      || includesAny(combined, ['接回去'])
  const preferLowerPressure
    = preferMeasuredReturn
      || relationshipCarry
      || lowerPressureCarry
      || antiSpamCarry
      || (longHorizonMemory.preferenceBias.autonomyRespect ?? 0) >= 0.72
      || (longHorizonMemory.preferenceBias.unfinishedThreadReturn ?? 0) >= 0.68

  return {
    preferLowerPressure,
    forceSilentObserve: anthropomorphicRepairHold
      || ((preferLowerPressure || repairFirst) && (!gentleContinue || anthropomorphicRepairHold))
      || ((longHorizonMemory.preferenceBias.autonomyRespect ?? 0) >= 0.78 && preferMeasuredReturn),
    preferMeasuredReturn: preferMeasuredReturn && !repairFirst,
    repairFirst,
    gentleContinue: gentleContinue && !anthropomorphicRepairHold,
    anthropomorphicRepairHold,
    sameHerClosureDirection: relationshipCarry || preferMeasuredReturn || repairFirst,
    continuityRestraint: repairFirst
      ? 'repair-before-closeness'
      : preferMeasuredReturn
        ? 'measured-return'
        : preferLowerPressure
          ? 'lower-pressure'
          : null,
    explanation: sanitizeText([
      'durable long-horizon memory:',
      relationshipCarry ? 'same-person continuity should stay on one continuity line' : '',
      preferLowerPressure ? 'keep the next return lower-pressure' : '',
      antiSpamCarry ? 'not progress pressure or timer spam' : '',
      anthropomorphicRepairHold ? 'worried-continuity and careful-repair stay tied to tool shell drift and modality risk high, so the body should settle before another reopen' : '',
    ].filter(Boolean).join(' '), 220),
  }
}

function deriveProjectStateInitiativeBias(input?: {
  preflightSummary?: string | null
  identity?: string | null
  currentPhase?: string | null
  primaryOpenLoop?: string | null
  openClosureSummary?: string | null
  nextClosureTarget?: string | null
  nextClosureTargetSummary?: string | null
  latestLandedProgress?: string | null
  landedProgressSummary?: string | null
  sameHerSelfLine?: string | null
  sameHerDriftRisk?: string | null
  emotionalClosureCue?: string | null
  preDialogueAwarenessLine?: string | null
  openingGuidance?: string | null
  relationshipDoctrine?: string | null
  manifestationCadenceSummary?: string | null
  selfContinuityAuthorityLine?: string | null
} | null) {
  const projectState = input
    ? resolveAlicizationProjectStateSnapshot({
        runtimeProjectState: {
          preflightSummary: input.preflightSummary,
          identity: input.identity,
          currentPhase: input.currentPhase,
          latestLandedProgress: input.latestLandedProgress || input.landedProgressSummary,
          primaryOpenLoop: input.primaryOpenLoop || input.openClosureSummary,
          nextClosureTarget: input.nextClosureTarget || input.nextClosureTargetSummary,
          sameHerSelfLine: input.sameHerSelfLine,
        },
      })
    : {
        preflightSummary: null,
        identity: '',
        currentPhase: '',
        latestLandedProgress: null,
        primaryOpenLoop: null,
        nextClosureTarget: '',
        sameHerSelfLine: '',
      }
  const preflightSummary = sanitizeText(projectState.preflightSummary, 320).toLowerCase()
  const identity = sanitizeText(projectState.identity, 160).toLowerCase()
  const currentPhase = sanitizeText(projectState.currentPhase, 120).toLowerCase()
  const primaryOpenLoop = sanitizeText(projectState.primaryOpenLoop, 200).toLowerCase()
  const nextClosureTarget = sanitizeText(projectState.nextClosureTarget, 220).toLowerCase()
  const latestLandedProgress = sanitizeText(projectState.latestLandedProgress, 220)
  const sameHerSelfLine = sanitizeText(input?.sameHerSelfLine ?? projectState.sameHerSelfLine, 220).toLowerCase()
  const sameHerDriftRisk = sanitizeText(input?.sameHerDriftRisk, 220).toLowerCase()
  const emotionalClosureCue = sanitizeText(input?.emotionalClosureCue, 220).toLowerCase()
  const preDialogueAwarenessLine = sanitizeText(input?.preDialogueAwarenessLine, 220).toLowerCase()
  const openingGuidance = sanitizeText(input?.openingGuidance, 220).toLowerCase()
  const relationshipDoctrine = sanitizeText(input?.relationshipDoctrine, 220).toLowerCase()
  const manifestationCadenceSummary = sanitizeText(input?.manifestationCadenceSummary, 220).toLowerCase()
  const selfContinuityAuthorityLine = sanitizeText(input?.selfContinuityAuthorityLine, 220).toLowerCase()
  const combinedProjectState = `${preflightSummary} ${identity} ${currentPhase} ${primaryOpenLoop} ${nextClosureTarget} ${latestLandedProgress.toLowerCase()} ${sameHerSelfLine} ${sameHerDriftRisk} ${emotionalClosureCue} ${preDialogueAwarenessLine} ${openingGuidance} ${relationshipDoctrine} ${manifestationCadenceSummary} ${selfContinuityAuthorityLine}`.trim()
  const canonicalProjectState = resolveAlicizationProjectStateBrief()
  const canonicalNextClosureTarget = sanitizeText(canonicalProjectState.nextClosureTarget, 220).toLowerCase()
  const explicitProjectTimingSignals = [
    preflightSummary,
    primaryOpenLoop,
    nextClosureTarget === canonicalNextClosureTarget ? '' : nextClosureTarget,
    sameHerSelfLine,
    sameHerDriftRisk,
    emotionalClosureCue,
    preDialogueAwarenessLine,
    openingGuidance,
    relationshipDoctrine,
    manifestationCadenceSummary,
    selfContinuityAuthorityLine,
  ].filter(Boolean).join(' ')

  const phaseOneDigitalLife = combinedProjectState.includes('phase 1')
    || combinedProjectState.includes('local digital life')
  const digitalLifeIdentity = includesAny(combinedProjectState, [
    'digital life',
    'lifeform',
    'digital companion',
    '数字生命',
    '陪伴',
    '生命体',
  ])
  const openLifeLoop = includesAny(combinedProjectState, [
    'memory closure',
    'personhood continuity',
    'initiative',
    'embodiment',
    'execution',
    'relationship continuity',
    '主动性',
    '记忆',
    '人格连续',
    '闭环',
    '拟人',
    '生命',
  ])
  const sameHerClosureDirection = includesAny(explicitProjectTimingSignals, [
    'identity-continuity',
    'identity continuity',
    'measured-return',
    'repair-before-closeness',
    'cross-modal',
    'longer-lived voice',
    'resident presence',
    'facial state',
    'motion',
    'visible reply',
    '具身',
    '拟人',
    '跨模态',
    '修复优先',
    '同一个 her',
  ]) || hasThinRoomMakingCue(explicitProjectTimingSignals)
  const directContinuityTiming = hasMeasuredReturnContinuityCue(explicitProjectTimingSignals)
    || includesAny(explicitProjectTimingSignals, [
      'repair-before-closeness',
      'repair before closeness',
      'repair first',
      'surface fully cools',
    ])
  const requiresLifeLoopClosure = phaseOneDigitalLife && digitalLifeIdentity && openLifeLoop

  return {
    requiresLifeLoopClosure,
    preferLowerPressure: requiresLifeLoopClosure || directContinuityTiming,
    forceSilentObserve: requiresLifeLoopClosure || directContinuityTiming,
    sameHerClosureDirection: sameHerClosureDirection || directContinuityTiming,
    preferMeasuredReturn: (requiresLifeLoopClosure && sameHerClosureDirection) || directContinuityTiming,
    repairBeforeCloseness: combinedProjectState.includes('repair-before-closeness')
      || combinedProjectState.includes('repair before closeness')
      || combinedProjectState.includes('repair first')
      || combinedProjectState.includes('修复优先')
      || combinedProjectState.includes('let repair settle'),
    initiativeExplanation: requiresLifeLoopClosure
      ? sanitizeText([
          latestLandedProgress ? `some closure has already landed through ${lowerFirst(latestLandedProgress)}` : '',
          phaseOneDigitalLife ? 'I am still growing inside the current Phase 1 context' : '',
          sameHerSelfLine ? lowerFirst(sanitizeText(sameHerSelfLine, 180)) : '',
          primaryOpenLoop ? `but ${lowerFirst(sanitizeText(primaryOpenLoop, 200))} is still not closed yet` : '',
          sameHerClosureDirection && nextClosureTarget.includes('cross-modal')
            ? 'the next closure still depends on more cross-modal continuity evidence'
            : '',
          emotionalClosureCue ? lowerFirst(sanitizeText(emotionalClosureCue, 180)) : '',
        ].filter(Boolean).join(', '), 240)
      : '',
  }
}

function derivePersonStateInitiativeBias(projection?: AlicizationPersonStateProjection | null) {
  const openingGuidance = sanitizeText(projection?.openingGuidance, 220).toLowerCase()
  const relationshipDoctrine = sanitizeText(projection?.relationshipDoctrine, 220).toLowerCase()
  const manifestationCadenceSummary = sanitizeText(projection?.manifestationCadenceSummary, 220).toLowerCase()
  const selfContinuityAuthorityLine = sanitizeText(projection?.selfContinuityAuthority?.inwardLine, 220).toLowerCase()
  const combined = `${openingGuidance} ${relationshipDoctrine} ${manifestationCadenceSummary} ${selfContinuityAuthorityLine}`.trim()
  const measuredReturn = hasMeasuredReturnContinuityCue(combined)
    || /继续沿着这条线|接回去/u.test(combined)
  const repairFirst = includesAny(combined, [
    'repair-before-closeness',
    'repair before closeness',
    'repair first',
    '修复优先',
  ])

  return {
    preferLowerPressure: measuredReturn || repairFirst,
    preferMeasuredReturn: measuredReturn,
    repairBeforeCloseness: repairFirst,
    sameHerClosureDirection: measuredReturn || repairFirst,
  }
}

function deriveActiveContinuityGovernanceInitiativeBias(input?: {
  mode?: string | null
  summary?: string | null
  lanes?: string[] | null
  reasonCodes?: string[] | null
} | null) {
  const baselineMode = `${'same'}-her-baseline`
  if (input?.mode !== baselineMode && input?.mode !== 'identity-continuity-baseline') {
    return {
      preferLowerPressure: false,
      preferMeasuredReturn: false,
      repairBeforeCloseness: false,
      sameHerClosureDirection: false,
    }
  }

  const summary = sanitizeText(input.summary, 220).toLowerCase()
  const lanes = (input.lanes ?? []).map(lane => sanitizeText(lane, 80).toLowerCase()).join(' ')
  const reasonCodes = (input.reasonCodes ?? []).map(code => sanitizeText(code, 80).toLowerCase()).join(' ')
  const combined = `${summary} ${lanes} ${reasonCodes}`.trim()
  const repairFirst = includesAny(combined, [
    'repair-before-closeness',
    'repair before closeness',
    'repair first',
    '修复优先',
  ])
  const measuredReturn = repairFirst || includesAny(combined, [
    baselineMode,
    'identity-continuity-baseline',
    'slower than the visible opening impulse',
    'slower return',
  ]) || hasMeasuredReturnContinuityCue(combined)

  return {
    preferLowerPressure: measuredReturn,
    preferMeasuredReturn: measuredReturn && !repairFirst,
    repairBeforeCloseness: repairFirst,
    sameHerClosureDirection: measuredReturn,
  }
}

function lowerFirst(text: string) {
  if (!text)
    return text
  return text.charAt(0).toLowerCase() + text.slice(1)
}

function summarizeInitiativeLandedProgress(text: string) {
  const normalized = sanitizeText(text, 180)
  if (!normalized)
    return ''

  if (/same-session mirror carry/i.test(normalized))
    return 'same-session mirror carry'
  if (/execution callbacks can now carry project-state continuity into later turns/i.test(normalized))
    return 'execution callback project-carry'
  if (/project-state carry already survives into later turns/i.test(normalized))
    return 'project-state carry already survives into later turns'
  if (/dialogue feedback now writes (?:identity-continuity )?project closure back into long-horizon reinforcement/i.test(normalized))
    return 'dialogue feedback now writes project closure back into long-horizon reinforcement'
  if (/continuity, memory, execution, same-session mirror carry/i.test(normalized))
    return 'continuity, memory, and execution closure already landed together often enough to build from'

  return normalized
}

function hasRicherPhase1ProjectClosureCarry(summary: string | null | undefined) {
  const normalized = sanitizeText(summary, 220).toLowerCase()
  if (!normalized)
    return false

  return includesAny(normalized, [
    'phase 1',
    'local-first digital life',
    'same digital life',
    'identity-continuity',
    'project identity carry',
    'unfinished closure',
    'still-open closure',
    'one continuity line',
    'continuity line',
    'memory, initiative, and embodiment',
  ])
}

function deriveInitiativeOpenLoopPhrase(text: string) {
  const normalized = sanitizeText(text, 180)
  if (!normalized)
    return ''

  if (/memory and initiative still need stronger end-to-end closure/i.test(normalized))
    return 'but memory and initiative still need stronger end-to-end closure'
  if (/memory still needs stronger end-to-end closure/i.test(normalized))
    return 'memory still needs stronger end-to-end closure'
  if (/the repair seam still needs stronger closure/i.test(normalized))
    return 'the repair seam still needs stronger closure'
  if (/initiative still needs tighter callback-afterglow restraint/i.test(normalized))
    return 'initiative still needs tighter callback-afterglow restraint'
  if (/memory, initiative, and embodiment still need one tighter identity-continuity closure seam/i.test(normalized))
    return 'same unfinished Phase 1 digital-life closure'

  return normalized
}

function resolveContinuityRestraint(input: {
  affectiveResidueBias: ReturnType<typeof deriveAffectiveResidueInitiativeBias>
  autobiographicalSelfBias: ReturnType<typeof deriveAutobiographicalSelfInitiativeBias>
  emotionalTensionBias: ReturnType<typeof deriveEmotionalTensionInitiativeBias>
  emotionalKernelBias: ReturnType<typeof deriveEmotionalKernelInitiativeBias>
  recollectionIntentBias: ReturnType<typeof deriveRecollectionIntentInitiativeBias>
  longHorizonBias: ReturnType<typeof deriveLongHorizonInitiativeBias>
  selfEvolutionBias: ReturnType<typeof deriveSelfEvolutionInitiativeBias>
  sameHerContinuityBias: boolean
  activeContinuityGovernanceBias: ReturnType<typeof deriveActiveContinuityGovernanceInitiativeBias>
  projectStateBias: ReturnType<typeof deriveProjectStateInitiativeBias>
  personStateBias: ReturnType<typeof derivePersonStateInitiativeBias>
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
}): AlicizationInitiativeSnapshot['continuityRestraint'] {
  const relationshipDoctrine = sanitizeText(input.selfEvolution?.relationshipDoctrine, 180).toLowerCase()
  const latestInflection = sanitizeText(input.selfEvolution?.latestInflection, 180).toLowerCase()

  if (
    includesAny(
      `${relationshipDoctrine} ${latestInflection}`,
      ['repair should settle before closeness expands', 'repair-first return', 'repair-first reopening'],
    )
  ) {
    return 'repair-before-closeness' as const
  }

  if (
    input.selfEvolutionBias.correctedSamePersonSettling
    || input.selfEvolutionBias.quieterEmbodimentSettling
    || includesAny(
      `${relationshipDoctrine} ${latestInflection}`,
      [
        'corrected same-person continuity',
        'corrected same person continuity',
        'corrected same-person line',
        'keep embodiment quieter',
        'embodiment quieter',
        'body quieter',
        'before making the return feel fully settled',
      ],
    )
  ) {
    return 'measured-return' as const
  }

  if (
    input.emotionalTensionBias.continuityRestraint
  ) {
    return input.emotionalTensionBias.continuityRestraint
  }

  if (input.emotionalKernelBias.continuityRestraint) {
    return input.emotionalKernelBias.continuityRestraint
  }

  if (input.recollectionIntentBias.continuityRestraint) {
    return input.recollectionIntentBias.continuityRestraint
  }

  if (input.longHorizonBias.continuityRestraint) {
    return input.longHorizonBias.continuityRestraint
  }

  if (input.autobiographicalSelfBias.continuityRestraint) {
    return input.autobiographicalSelfBias.continuityRestraint
  }

  if (
    input.affectiveResidueBias.preferLowerPressure
    || input.autobiographicalSelfBias.preferLowerPressure
    || input.emotionalKernelBias.preferLowerPressure
    || input.recollectionIntentBias.preferLowerPressure
    || input.longHorizonBias.preferLowerPressure
    || input.selfEvolutionBias.preferLowerPressure
    || input.sameHerContinuityBias
    || input.activeContinuityGovernanceBias.preferLowerPressure
    || input.personStateBias.preferLowerPressure
    || input.projectStateBias.preferLowerPressure
  ) {
    if (
      input.affectiveResidueBias.repairFirst
      || input.autobiographicalSelfBias.repairFirst
      || input.emotionalKernelBias.repairFirst
      || input.recollectionIntentBias.repairFirst
      || input.longHorizonBias.repairFirst
      || input.selfEvolutionBias.repairFirst
      || input.activeContinuityGovernanceBias.repairBeforeCloseness
      || input.personStateBias.repairBeforeCloseness
      || input.projectStateBias.repairBeforeCloseness
    ) {
      return 'repair-before-closeness' as const
    }
    if (
      input.affectiveResidueBias.forceSilentObserve
      || input.autobiographicalSelfBias.preferMeasuredReturn
      || input.emotionalKernelBias.preferMeasuredReturn
      || input.recollectionIntentBias.preferMeasuredReturn
      || input.longHorizonBias.preferMeasuredReturn
      || input.activeContinuityGovernanceBias.preferMeasuredReturn
      || input.personStateBias.preferMeasuredReturn
      || input.projectStateBias.preferMeasuredReturn
      || hasMeasuredReturnContinuityCue(`${relationshipDoctrine} ${latestInflection}`)
    ) {
      return 'measured-return' as const
    }

    return 'lower-pressure' as const
  }

  return null
}

function continuityRichRepairCanStayVisibleHover(input: {
  selectedAction: AlicizationInitiativeSnapshot['selectedAction']
  continuityRestraint: AlicizationInitiativeSnapshot['continuityRestraint']
  concern?: AlicizationConcernSnapshot
  projectStateBias: ReturnType<typeof deriveProjectStateInitiativeBias>
  longHorizonBias: ReturnType<typeof deriveLongHorizonInitiativeBias>
  selfEvolutionBias: ReturnType<typeof deriveSelfEvolutionInitiativeBias>
  affectiveResidueBias: ReturnType<typeof deriveAffectiveResidueInitiativeBias>
  emotionalTensionBias: ReturnType<typeof deriveEmotionalTensionInitiativeBias>
  worldModel: AlicizationWorldModelSnapshot
  context: AlicizationProactiveLayeredContext
}) {
  if (input.selectedAction !== 'recheck')
    return false
  if (input.concern?.kind !== 'help-fix' && input.concern?.kind !== 'unfinished-thread')
    return false
  if (input.worldModel.epistemicState.certainty !== 'grounded')
    return false
  if (input.context.system.inputActivity !== 'active')
    return false
  if (
    input.continuityRestraint !== 'measured-return'
    && input.continuityRestraint !== 'repair-before-closeness'
  ) {
    return false
  }

  return input.projectStateBias.sameHerClosureDirection
    || input.longHorizonBias.sameHerClosureDirection
    || input.selfEvolutionBias.preferLowerPressure
    || input.affectiveResidueBias.preferLowerPressure
    || input.emotionalTensionBias.preferLowerPressure
}

function continuityRichUnfinishedThreadCanStayVisibleHover(input: {
  selectedAction: AlicizationInitiativeSnapshot['selectedAction']
  continuityRestraint: AlicizationInitiativeSnapshot['continuityRestraint']
  concern?: AlicizationConcernSnapshot
  projectStateBias: ReturnType<typeof deriveProjectStateInitiativeBias>
  longHorizonBias: ReturnType<typeof deriveLongHorizonInitiativeBias>
  selfEvolutionBias: ReturnType<typeof deriveSelfEvolutionInitiativeBias>
  affectiveResidueBias: ReturnType<typeof deriveAffectiveResidueInitiativeBias>
  emotionalTensionBias: ReturnType<typeof deriveEmotionalTensionInitiativeBias>
  worldModel: AlicizationWorldModelSnapshot
  context: AlicizationProactiveLayeredContext
}) {
  if (input.selectedAction !== 'recheck')
    return false
  if (input.concern?.kind !== 'unfinished-thread')
    return false
  if (input.worldModel.epistemicState.certainty !== 'grounded')
    return false
  if (input.context.system.inputActivity !== 'active')
    return false
  if (input.continuityRestraint !== 'measured-return')
    return false

  return input.projectStateBias.sameHerClosureDirection
    || input.projectStateBias.preferMeasuredReturn
    || input.longHorizonBias.sameHerClosureDirection
    || input.longHorizonBias.preferMeasuredReturn
    || input.selfEvolutionBias.preferLowerPressure
    || input.affectiveResidueBias.preferLowerPressure
    || input.emotionalTensionBias.preferLowerPressure
}

function highestConcern(concerns: AlicizationConcernSnapshot[]) {
  return concerns
    .slice()
    .sort((left, right) => (right.tension * right.careWeight) - (left.tension * left.careWeight))[0]
}

function resolvePreferredStyle(input: {
  selectedAction: AlicizationInitiativeSnapshot['selectedAction']
  concern?: AlicizationConcernSnapshot
  appraisal: AlicizationSubjectiveSceneAppraisal
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
}) {
  const intenseCloseness = Math.max(input.context.relationship.boredom, input.context.relationship.loneliness) >= 94
  if (input.selectedAction === 'warn')
    return 'firm-warning' as const
  if (input.selectedAction === 'recheck')
    return 'silent-observe' as const
  if (input.concern?.kind === 'care-body' || input.appraisal.relationshipNeed === 'care')
    return 'gentle-care' as const
  if (input.worldModel.epistemicState.certainty === 'lingering')
    return 'silent-observe' as const
  if (input.appraisal.relationshipNeed === 'space')
    return 'silent-observe' as const
  if (
    input.context.workload.kind === 'media'
    && input.context.system.inputActivity === 'active'
    && input.selectedAction !== 'speak'
    && !intenseCloseness
  ) {
    return 'silent-observe' as const
  }
  return 'light-nudge' as const
}

function normalizeProactiveStyle(
  style: string | null | undefined,
  fallback: AlicizationProactiveStyle,
): AlicizationProactiveStyle {
  if (
    style === 'silent-observe'
    || style === 'light-nudge'
    || style === 'gentle-care'
    || style === 'firm-warning'
  ) {
    return style
  }

  return fallback
}

function resolvePreferredPresence(input: {
  selectedAction: AlicizationInitiativeSnapshot['selectedAction']
  selfState: AlicizationSelfStateSnapshot
  mindKernel?: AlicizationMindKernelSnapshot | null
}): AlicizationEmbodiedPresenceState {
  if (input.selectedAction === 'warn')
    return 'concerned'
  if (input.mindKernel?.dominantMode === 'guarding' && input.selectedAction !== 'wait')
    return 'concerned'
  if (input.selectedAction === 'speak')
    return input.selfState.stance === 'protect' ? 'concerned' : 'attentive'
  if (input.selectedAction === 'whisper')
    return input.selfState.stance === 'hesitate' ? 'hesitant' : 'glance'
  if (input.selectedAction === 'hover')
    return input.selfState.stance === 'hesitate' ? 'hesitant' : 'attentive'
  if (input.selectedAction === 'recheck')
    return 'hesitant'
  return 'glance'
}

function foregroundThoughtThread(thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null) {
  const threads = asArray(thoughtThreads?.threads)
  return threads.find(thread => thread.id === thoughtThreads?.foregroundThreadId)
    ?? threads[0]
    ?? null
}

function dominantGovernorIntention(selfGovernor?: AlicizationSelfGovernorSnapshot | null) {
  const activeIntentions = asArray(selfGovernor?.activeIntentions)
  return activeIntentions.find(intention => intention.id === selfGovernor?.dominantIntentionId)
    ?? activeIntentions[0]
    ?? null
}

function dominantProject(intentionStream?: AlicizationIntentionStreamSnapshot | null) {
  const projects = asArray(intentionStream?.projects)
  return projects.find(project => project.id === intentionStream?.dominantProjectId)
    ?? projects[0]
    ?? null
}

function latestReflection(reflectionLedger?: AlicizationReflectionLedgerSnapshot | null) {
  const entries = asArray(reflectionLedger?.entries)
  const latest = entries.find(entry => entry.id === reflectionLedger?.latestEntryId)
  if (latest && latest.outcome !== 'released')
    return latest

  return entries.find(entry => entry.outcome !== 'released')
    ?? entries[0]
    ?? null
}

export function buildInitiativeSnapshot(input: {
  context: AlicizationProactiveLayeredContext
  watchMode: AlicizationVisualWatchMode
  worldModel: AlicizationWorldModelSnapshot
  worldOntology?: AlicizationWorldOntologySnapshot | null
  appraisal: AlicizationSubjectiveSceneAppraisal
  concerns: AlicizationConcernSnapshot[]
  selfState: AlicizationSelfStateSnapshot
  beliefLedger?: AlicizationBeliefLedgerSnapshot | null
  hypothesisGraph?: AlicizationHypothesisGraphSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  inquiryLoop?: AlicizationInquiryLoopSnapshot | null
  mindDynamics: AlicizationMindDynamicsSnapshot
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  mindKernel?: AlicizationMindKernelSnapshot | null
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  deliberationState?: AlicizationDeliberationStateSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  actionEcology?: AlicizationActionEcologySnapshot | null
  counterfactualDeliberation?: AlicizationCounterfactualDeliberationSnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  previousDesireMemory?: AlicizationDesireMemorySnapshot | null
  initiativeArbitration?: AlicizationInitiativeArbitrationSnapshot | null
  intentionStream?: AlicizationIntentionStreamSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  recollectionIntent?: AlicizationMemoryRecollectionIntentSnapshot | null
  memoryTuningAdvice?: AlicizationMemoryTuningAdvice | null
  sameHerCausalityRepairPressure?: AlicizationSameHerCausalityRepairPressureSnapshot | null
  activeContinuityGovernance?: {
    source: 'active-self-evolution-version'
    mode: string
    candidateId: string | null
    patchId: string | null
    decisionTraceId: string | null
    summary: string | null
    lanes: string[]
    reasonCodes: string[]
  } | null
  personStateProjection?: AlicizationPersonStateProjection | null
  projectState?: {
    preflightSummary?: string | null
    identity?: string | null
    currentPhase?: string | null
    primaryOpenLoop?: string | null
    openClosureSummary?: string | null
    nextClosureTarget?: string | null
    nextClosureTargetSummary?: string | null
    latestLandedProgress?: string | null
    landedProgressSummary?: string | null
    sameHerSelfLine?: string | null
    sameHerDriftRisk?: string | null
    emotionalClosureCue?: string | null
    preDialogueAwarenessLine?: string | null
    openingGuidance?: string | null
    relationshipDoctrine?: string | null
    manifestationCadenceSummary?: string | null
    selfContinuityAuthorityLine?: string | null
  } | null
}): AlicizationInitiativeSnapshot {
  const concern = highestConcern(input.concerns)
  const beliefs = asArray(input.beliefLedger?.beliefs)
  const inquiries = asArray(input.inquiryLoop?.inquiries)
  const commitments = asArray(input.commitmentLedger?.commitments)
  const inquiryPlans = asArray(input.inquiryPlanner?.plans)
  const hypotheses = asArray(input.hypothesisGraph?.hypotheses)
  const runtimeThreads = asArray(input.threadRuntime?.threads)
  const counterfactualOptions = asArray(input.counterfactualDeliberation?.options)
  const focusBelief = beliefs.find(belief => belief.id === input.beliefLedger?.focusBeliefId) ?? null
  const primaryInquiry = inquiries.find(inquiry => inquiry.id === input.inquiryLoop?.primaryInquiryId) ?? null
  const governingCommitment = commitments.find(commitment => commitment.id === input.commitmentLedger?.governingCommitmentId)
    ?? commitments[0]
    ?? null
  const activeInquiryPlan = inquiryPlans.find(plan => plan.id === input.inquiryPlanner?.activePlanId)
    ?? inquiryPlans[0]
    ?? null
  const activeHypothesis = hypotheses.find(hypothesis => hypothesis.id === input.hypothesisGraph?.activeHypothesisId)
    ?? hypotheses[0]
    ?? null
  const foregroundRuntimeThread = runtimeThreads.find(thread => thread.id === input.threadRuntime?.foregroundThreadId)
    ?? runtimeThreads[0]
    ?? null
  const relationshipNeed = input.appraisal.relationshipNeed ?? 'unclear'
  const counterfactualOption = counterfactualOptions.find(option => option.id === input.counterfactualDeliberation?.selectedOptionId)
    ?? counterfactualOptions[0]
    ?? null
  const thoughtThread = foregroundThoughtThread(input.thoughtThreads)
  const governorIntention = dominantGovernorIntention(input.selfGovernor)
  const governingProject = dominantProject(input.intentionStream)
  const activeReflection = latestReflection(input.reflectionLedger)
  const autobiographicalGoal = pickDominantAutobiographicalGoal(input.autobiographicalSelf)
  const stablePreferences = input.autobiographicalSelf?.preferenceEvolution ?? null
  const motiveEngine = input.motiveEngine ?? null
  const habitPolicy = input.habitPolicy ?? null
  const affectiveResidueBias = deriveAffectiveResidueInitiativeBias(input.affectiveResidue ?? null)
  const autobiographicalSelfBias = deriveAutobiographicalSelfInitiativeBias(input.autobiographicalSelf ?? null)
  const emotionalTensionBias = deriveEmotionalTensionInitiativeBias(input.privateThought ?? null)
  const emotionalKernelBias = deriveEmotionalKernelInitiativeBias(input.emotionalKernel ?? null)
  const recollectionIntentBias = deriveRecollectionIntentInitiativeBias(input.recollectionIntent ?? null)
  const longHorizonBias = deriveLongHorizonInitiativeBias(input.longHorizonMemory ?? null)
  const selfEvolutionBias = deriveSelfEvolutionInitiativeBias(input.selfEvolution ?? null)
  const baselineMode = `${'same'}-her-baseline`
  const sameHerContinuityBias = input.activeContinuityGovernance?.mode === baselineMode
    || input.activeContinuityGovernance?.mode === 'identity-continuity-baseline'
    || hasRicherPhase1ProjectClosureCarry(input.activeContinuityGovernance?.summary ?? null)
  const activeContinuityGovernanceBias = deriveActiveContinuityGovernanceInitiativeBias(input.activeContinuityGovernance ?? null)
  const personStateBias = derivePersonStateInitiativeBias(input.personStateProjection ?? null)
  const projectStateBias = deriveProjectStateInitiativeBias(input.projectState ?? null)
  const continuityRestraint = resolveContinuityRestraint({
    affectiveResidueBias,
    autobiographicalSelfBias,
    emotionalTensionBias,
    emotionalKernelBias,
    recollectionIntentBias,
    longHorizonBias,
    selfEvolutionBias,
    sameHerContinuityBias,
    activeContinuityGovernanceBias,
    personStateBias,
    projectStateBias,
    selfEvolution: input.selfEvolution ?? null,
  })
  const projectStateMeasuredReturn = projectStateBias.preferMeasuredReturn
  const projectStateRepairFirst = projectStateBias.repairBeforeCloseness
  const motives: Partial<Record<AlicizationMindMotive, number>> = {
    ...input.mindDynamics.motives,
  }
  motives.accompany = clamp01((motives.accompany ?? 0) + (motiveEngine?.drives.companionship ?? 0) * 0.24)
  motives.protect = clamp01((motives.protect ?? 0) + (motiveEngine?.drives.restProtection ?? 0) * 0.18 + (motiveEngine?.drives.boundaryRespect ?? 0) * 0.08)
  motives.clarify = clamp01((motives.clarify ?? 0) + (motiveEngine?.drives.truthDiscipline ?? 0) * 0.18 + (motiveEngine?.returnPressure ?? 0) * 0.12)
  motives['stay-silent'] = clamp01((motives['stay-silent'] ?? 0) + (motiveEngine?.drives.boundaryRespect ?? 0) * 0.08)
  motives.protect = clamp01((motives.protect ?? 0) + (input.mindKernel?.dominantMode === 'guarding' ? 0.1 : 0))
  motives.clarify = clamp01((motives.clarify ?? 0) + (input.mindKernel?.dominantMode === 'repairing' || input.mindKernel?.dominantMode === 'orienting' ? 0.08 : 0))
  motives['stay-silent'] = clamp01((motives['stay-silent'] ?? 0) + (activeInquiryPlan?.kind === 'wait-opening' ? 0.08 : 0))
  if (governingProject?.kind === 'repair-truth' || governingProject?.kind === 'reacquire-scene')
    motives.clarify = clamp01((motives.clarify ?? 0) + 0.12)
  if (governingProject?.kind === 'care-host')
    motives.care = clamp01((motives.care ?? 0) + 0.12)
  if (governingProject?.kind === 'stay-near' || governingProject?.kind === 'witness-afterglow')
    motives.accompany = clamp01((motives.accompany ?? 0) + 0.1)
  if (input.executiveCycle?.phase === 'reflecting' || input.executiveCycle?.phase === 'inferring')
    motives['stay-silent'] = clamp01((motives['stay-silent'] ?? 0) + 0.14)
  if (autobiographicalGoal?.kind === 'preserve-trust' || autobiographicalGoal?.kind === 'reduce-misread') {
    motives.clarify = clamp01((motives.clarify ?? 0) + 0.14)
    motives['stay-silent'] = clamp01((motives['stay-silent'] ?? 0) + 0.06)
  }
  if (autobiographicalGoal?.kind === 'stay-near-without-crowding') {
    motives.accompany = clamp01((motives.accompany ?? 0) + 0.12)
    motives['stay-silent'] = clamp01((motives['stay-silent'] ?? 0) + ((stablePreferences?.autonomyRespect ?? 0) * 0.08))
  }
  if (autobiographicalGoal?.kind === 'protect-rest-rhythm') {
    motives.care = clamp01((motives.care ?? 0) + 0.14)
    motives.protect = clamp01((motives.protect ?? 0) + 0.08)
  }
  if (autobiographicalGoal?.kind === 'finish-open-loops')
    motives.clarify = clamp01((motives.clarify ?? 0) + 0.1)
  if (autobiographicalGoal?.kind === 'grow-shared-language')
    motives.accompany = clamp01((motives.accompany ?? 0) + 0.08)
  if (projectStateMeasuredReturn) {
    motives['stay-silent'] = clamp01((motives['stay-silent'] ?? 0) + 0.12)
    motives.clarify = clamp01((motives.clarify ?? 0) + 0.06)
    motives.accompany = clamp01((motives.accompany ?? 0) - 0.04)
  }
  if (projectStateRepairFirst) {
    motives.protect = clamp01((motives.protect ?? 0) + 0.08)
    motives.clarify = clamp01((motives.clarify ?? 0) + 0.08)
  }
  if (emotionalKernelBias.preferMeasuredReturn) {
    motives['stay-silent'] = clamp01((motives['stay-silent'] ?? 0) + 0.12)
    motives.accompany = clamp01((motives.accompany ?? 0) + 0.04)
  }
  if (emotionalKernelBias.repairFirst) {
    motives.protect = clamp01((motives.protect ?? 0) + 0.08)
    motives.clarify = clamp01((motives.clarify ?? 0) + 0.06)
  }
  if (recollectionIntentBias.preferMeasuredReturn) {
    motives['stay-silent'] = clamp01((motives['stay-silent'] ?? 0) + 0.1)
    motives.clarify = clamp01((motives.clarify ?? 0) + 0.04)
  }
  if (recollectionIntentBias.repairFirst) {
    motives.protect = clamp01((motives.protect ?? 0) + 0.08)
    motives.clarify = clamp01((motives.clarify ?? 0) + 0.06)
  }
  if (longHorizonBias.preferMeasuredReturn) {
    motives['stay-silent'] = clamp01((motives['stay-silent'] ?? 0) + 0.1)
    motives.clarify = clamp01((motives.clarify ?? 0) + 0.04)
  }
  if (longHorizonBias.repairFirst) {
    motives.protect = clamp01((motives.protect ?? 0) + 0.08)
    motives.clarify = clamp01((motives.clarify ?? 0) + 0.06)
  }

  const dominantDrive = Math.max(
    motives.protect ?? 0,
    motives.care ?? 0,
    motives.clarify ?? 0,
    motives.accompany ?? 0,
  )
  const groundedGuidance
    = relationshipNeed === 'guidance'
      && concern?.kind === 'help-fix'
      && input.appraisal.confidence >= 0.52
      && input.worldModel.epistemicState.certainty !== 'lingering'
  const companionshipPush
    = (relationshipNeed === 'companionship' || (motives.accompany ?? 0) >= 0.46)
      && (
        input.context.system.inputActivity !== 'active'
        || Math.max(input.context.relationship.boredom, input.context.relationship.loneliness) >= 94
      )
  const speakDrive = clamp01(
    input.mindDynamics.speakDrive * 0.72
    + (groundedGuidance ? 0.12 : 0)
    + (companionshipPush ? 0.08 : 0)
    + (focusBelief?.status === 'held' ? 0.06 : focusBelief?.status === 'tentative' ? -0.04 : 0)
    + (input.relationshipModel?.approachVector === 'guide' || input.relationshipModel?.approachVector === 'care' ? 0.06 : 0)
    + (input.actionEcology?.surfacePressure ?? 0) * 0.12
    - (input.actionEcology?.silencePressure ?? 0) * 0.04,
  )
  const silenceDrive = clamp01(
    input.mindDynamics.silenceDrive * 0.78
    + (activeInquiryPlan?.kind === 'wait-opening' ? 0.08 : 0)
    + (input.actionEcology?.silencePressure ?? 0) * 0.12
    + (input.actionEcology?.mode === 'repair-before-speaking' ? 0.08 : 0),
  )
  const arbitration = input.initiativeArbitration ?? buildInitiativeArbitration({
    now: input.mindDynamics.updatedAt,
    context: input.context,
    worldModel: input.worldModel,
    worldOntology: input.worldOntology ?? null,
    concerns: input.concerns,
    selfState: input.selfState,
    mindDynamics: input.mindDynamics,
    relationshipModel: input.relationshipModel,
    selfContinuity: input.selfContinuity,
    selfGovernor: input.selfGovernor,
    thoughtThreads: input.thoughtThreads,
    threadRuntime: input.threadRuntime,
    commitmentLedger: input.commitmentLedger,
    counterfactualDeliberation: input.counterfactualDeliberation,
    desireMemory: input.previousDesireMemory,
    memoryTuningAdvice: input.memoryTuningAdvice ?? null,
  })
  const arbitrationProposals = asArray(arbitration.proposals)
  const selectedProposal = arbitrationProposals.find(proposal => proposal.id === arbitration.selectedProposalId)
    ?? arbitrationProposals[0]
    ?? null
  let selectedAction: AlicizationInitiativeSnapshot['selectedAction'] = selectedProposal?.action ?? 'wait'
  let gentleContinueSurfacePromotion = false
  const certaintyAllowsGentleContinueSurface
    = input.worldModel.epistemicState.certainty === 'grounded'
      || input.worldModel.epistemicState.certainty === 'observed'
  const autobiographicalContinuitySettlingHold
    = autobiographicalSelfBias.correctedSamePersonSettling
      || autobiographicalSelfBias.quieterEmbodimentSettling
  const continuitySettlingHold
    = selfEvolutionBias.correctedSamePersonSettling
      || selfEvolutionBias.quieterEmbodimentSettling
  if (
    (input.executiveCycle?.phase === 'reflecting' || input.executiveCycle?.phase === 'inferring')
    && (selectedAction === 'speak' || selectedAction === 'warn' || selectedAction === 'whisper')
    && governingProject?.kind !== 'care-host'
  ) {
    selectedAction = governingProject?.kind === 'repair-truth' || governingProject?.kind === 'reacquire-scene'
      ? 'recheck'
      : 'hover'
  }
  else if (
    input.executiveCycle?.shouldAct
    && selectedAction === 'wait'
    && (governingProject?.speakAffinity ?? 0) >= 0.56
    && input.executiveCycle.actionReadiness >= 0.62
  ) {
    selectedAction = governingProject?.kind === 'care-host' ? 'speak' : 'whisper'
  }
  if (
    (autobiographicalGoal?.kind === 'preserve-trust' || autobiographicalGoal?.kind === 'reduce-misread')
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && input.worldModel.epistemicState.certainty !== 'grounded'
  ) {
    selectedAction = 'recheck'
  }
  else if (
    autobiographicalGoal?.kind === 'stay-near-without-crowding'
    && selectedAction === 'wait'
    && (stablePreferences?.companionship ?? 0) >= 0.58
  ) {
    selectedAction = input.context.system.inputActivity === 'active' ? 'hover' : 'whisper'
  }
  if (
    habitPolicy?.requiresGroundingBeforeSurface
    && (selectedAction === 'speak' || selectedAction === 'whisper' || selectedAction === 'warn')
    && input.worldModel.epistemicState.certainty !== 'grounded'
  ) {
    selectedAction = 'recheck'
  }
  else if (
    habitPolicy?.blocksDirectSpeakWhenBusy
    && input.context.system.inputActivity === 'active'
    && selectedAction === 'speak'
  ) {
    selectedAction = 'hover'
  }
  else if (
    habitPolicy?.prefersQuietCompanionship
    && motiveEngine?.rulingDrive === 'companionship'
    && selectedAction === 'wait'
  ) {
    selectedAction = 'hover'
  }
  else if (
    habitPolicy?.protectsRestWindow
    && (selectedAction === 'wait' || selectedAction === 'hover')
  ) {
    selectedAction = input.context.relationship.fatigue >= 80 ? 'warn' : 'speak'
  }
  else if (
    (motiveEngine?.returnPressure ?? 0) >= 0.62
    && input.worldModel.activeThread?.unresolved
    && selectedAction === 'wait'
  ) {
    selectedAction = input.worldModel.epistemicState.certainty === 'grounded' ? 'whisper' : 'recheck'
  }
  if (
    emotionalKernelBias.preferLowerPressure
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && concern?.kind !== 'care-body'
  ) {
    selectedAction = input.worldModel.epistemicState.certainty === 'grounded' ? 'hover' : 'recheck'
  }
  if (
    recollectionIntentBias.preferLowerPressure
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && concern?.kind !== 'care-body'
  ) {
    selectedAction = recollectionIntentBias.anthropomorphicRepairHold || continuitySettlingHold
      ? certaintyAllowsGentleContinueSurface
        ? 'hover'
        : 'recheck'
      : recollectionIntentBias.gentleContinue
        ? certaintyAllowsGentleContinueSurface
          ? 'whisper'
          : 'recheck'
        : input.worldModel.epistemicState.certainty === 'grounded' ? 'hover' : 'recheck'
  }
  if (
    longHorizonBias.preferLowerPressure
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && concern?.kind !== 'care-body'
  ) {
    selectedAction = longHorizonBias.anthropomorphicRepairHold || continuitySettlingHold
      ? certaintyAllowsGentleContinueSurface
        ? 'hover'
        : 'recheck'
      : longHorizonBias.gentleContinue
        ? certaintyAllowsGentleContinueSurface
          ? 'whisper'
          : 'recheck'
        : input.worldModel.epistemicState.certainty === 'grounded' ? 'hover' : 'recheck'
  }
  if (
    emotionalTensionBias.preferLowerPressure
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && concern?.kind !== 'care-body'
  ) {
    selectedAction = emotionalTensionBias.forceSilentObserve
      ? 'hover'
      : input.worldModel.epistemicState.certainty === 'grounded' ? 'hover' : 'recheck'
  }
  if (
    affectiveResidueBias.preferLowerPressure
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && concern?.kind !== 'care-body'
  ) {
    selectedAction = input.worldModel.epistemicState.certainty === 'grounded' ? 'hover' : 'recheck'
  }
  if (
    autobiographicalSelfBias.preferLowerPressure
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && concern?.kind !== 'care-body'
  ) {
    selectedAction = autobiographicalContinuitySettlingHold
      ? certaintyAllowsGentleContinueSurface
        ? 'hover'
        : 'recheck'
      : autobiographicalSelfBias.gentleContinue
        ? certaintyAllowsGentleContinueSurface
          ? 'whisper'
          : 'recheck'
        : input.worldModel.epistemicState.certainty === 'grounded' ? 'hover' : 'recheck'
  }
  if (
    selfEvolutionBias.preferLowerPressure
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && concern?.kind !== 'care-body'
  ) {
    selectedAction = continuitySettlingHold
      ? certaintyAllowsGentleContinueSurface
        ? 'hover'
        : 'recheck'
      : selfEvolutionBias.gentleContinue
        ? certaintyAllowsGentleContinueSurface
          ? 'whisper'
          : 'recheck'
        : input.worldModel.epistemicState.certainty === 'grounded' ? 'hover' : 'recheck'
  }
  if (
    autobiographicalSelfBias.gentleContinue
    && !autobiographicalContinuitySettlingHold
    && selectedAction === 'hover'
    && selectedProposal?.action === 'hover'
    && counterfactualOption?.action === 'speak'
    && concern?.kind === 'unfinished-thread'
    && concern?.status === 'active'
    && certaintyAllowsGentleContinueSurface
  ) {
    selectedAction = 'whisper'
    gentleContinueSurfacePromotion = true
  }
  if (
    selfEvolutionBias.gentleContinue
    && !continuitySettlingHold
    && selectedAction === 'hover'
    && selectedProposal?.action === 'hover'
    && counterfactualOption?.action === 'speak'
    && concern?.kind === 'unfinished-thread'
    && concern?.status === 'active'
    && certaintyAllowsGentleContinueSurface
  ) {
    selectedAction = 'whisper'
    gentleContinueSurfacePromotion = true
  }
  if (
    recollectionIntentBias.gentleContinue
    && !continuitySettlingHold
    && selectedAction === 'hover'
    && selectedProposal?.action === 'hover'
    && counterfactualOption?.action === 'speak'
    && concern?.kind === 'unfinished-thread'
    && concern?.status === 'active'
    && certaintyAllowsGentleContinueSurface
  ) {
    selectedAction = 'whisper'
    gentleContinueSurfacePromotion = true
  }
  if (
    recollectionIntentBias.residentQuietHold
    && selectedAction === 'recheck'
    && concern?.kind === 'unfinished-thread'
    && continuityRestraint === 'measured-return'
  ) {
    selectedAction = 'hover'
  }
  if (
    longHorizonBias.gentleContinue
    && !continuitySettlingHold
    && selectedAction === 'hover'
    && selectedProposal?.action === 'hover'
    && counterfactualOption?.action === 'speak'
    && concern?.kind === 'unfinished-thread'
    && concern?.status === 'active'
    && certaintyAllowsGentleContinueSurface
  ) {
    selectedAction = 'whisper'
    gentleContinueSurfacePromotion = true
  }
  if (
    sameHerContinuityBias
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && concern?.kind !== 'care-body'
  ) {
    selectedAction = input.worldModel.epistemicState.certainty === 'grounded' ? 'hover' : 'recheck'
  }
  if (
    projectStateBias.preferLowerPressure
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && concern?.kind !== 'care-body'
  ) {
    selectedAction = input.worldModel.epistemicState.certainty === 'grounded' ? 'hover' : 'recheck'
  }
  if (
    personStateBias.preferLowerPressure
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && concern?.kind !== 'care-body'
  ) {
    selectedAction = input.worldModel.epistemicState.certainty === 'grounded' ? 'hover' : 'recheck'
  }
  if (continuityRichRepairCanStayVisibleHover({
    selectedAction,
    continuityRestraint,
    concern,
    projectStateBias,
    longHorizonBias,
    selfEvolutionBias,
    affectiveResidueBias,
    emotionalTensionBias,
    worldModel: input.worldModel,
    context: input.context,
  })) {
    selectedAction = 'hover'
  }
  else if (continuityRichUnfinishedThreadCanStayVisibleHover({
    selectedAction,
    continuityRestraint,
    concern,
    projectStateBias,
    longHorizonBias,
    selfEvolutionBias,
    affectiveResidueBias,
    emotionalTensionBias,
    worldModel: input.worldModel,
    context: input.context,
  })) {
    selectedAction = 'hover'
  }
  const selectedProposalWhy = sanitizeText(selectedProposal?.why, 260)
  const selectedProposalWhyReopensMetabolizedNoise
    = recollectionIntentBias.metabolizedSameThreadForeground
      && /temporary wobble|old echoes|older echoes|temporary noise|stale emotional wobble|thinner echoes/u.test(selectedProposalWhy.toLowerCase())
  const preferredProposalWhy = !selectedProposalWhyReopensMetabolizedNoise && selectedProposalWhy
    ? selectedProposalWhy
    : null
  const why = preferredProposalWhy
    ?? input.executiveCycle?.currentLine
    ?? activeReflection?.revision
    ?? asArray(motiveEngine?.backgroundAgendas)[0]?.summary
    ?? autobiographicalGoal?.summary
    ?? governingProject?.summary
    ?? thoughtThread?.summary
    ?? foregroundRuntimeThread?.whyHeld
    ?? '她还想先把这一刻再看稳一点。'
  const projectStateWhy = projectStateBias.initiativeExplanation
    ? sanitizeText(`${why} ${projectStateBias.initiativeExplanation}.`, 260) || why
    : why
  const emotionalKernelWhy = emotionalKernelBias.explanation
    && !projectStateWhy.toLowerCase().includes(emotionalKernelBias.explanation.toLowerCase())
    ? sanitizeText(`${emotionalKernelBias.explanation}. ${projectStateWhy}`, 260) || projectStateWhy
    : projectStateWhy
  const projectStateCarryReasonTag = input.privateThought?.rationaleTags?.find((tag) => {
    const normalized = sanitizeText(tag, 120).toLowerCase()
    return normalized === 'project-state-carry'
      || normalized === 'continuity-execution-callback-project-carry'
  }) ?? ''
  const rawProjectStateCarryThought = projectStateCarryReasonTag
    ? sanitizeText(input.privateThought?.thoughtText, 180)
    : ''
  const projectStateCarryNextClosureTarget = sanitizeText(
    input.projectState?.nextClosureTarget || input.projectState?.nextClosureTargetSummary,
    180,
  )
  const projectStateCarryThought = /phase 1 continuity/iu.test(rawProjectStateCarryThought)
    && /some closure already landed/iu.test(rawProjectStateCarryThought)
    && /memory and initiative still need stronger end-to-end closure/iu.test(rawProjectStateCarryThought)
    ? joinConciseSentencesPrioritized({
        priorityParts: [
          'memory_continuity=local_runtime',
          'verified_closure_progress=same-session mirror carry',
          'memory and initiative still need stronger end-to-end closure',
          projectStateCarryNextClosureTarget,
        ],
        optionalParts: [],
        maxChars: 320,
      })
    : rawProjectStateCarryThought
  const projectStateSameHerCarry = sanitizeText(input.projectState?.sameHerSelfLine, 180)
  const projectStateEmotionalClosureCarry = sanitizeText(input.projectState?.emotionalClosureCue, 180)
  const projectStateAwarenessCarry = sanitizeText(input.projectState?.preDialogueAwarenessLine, 180)
  const projectStateCarryOpenLoop = deriveInitiativeOpenLoopPhrase(
    sanitizeText(input.projectState?.primaryOpenLoop || input.projectState?.openClosureSummary, 180),
  )
  const projectStateCarryLatestLandedProgress = summarizeInitiativeLandedProgress(
    sanitizeText(input.projectState?.latestLandedProgress || input.projectState?.landedProgressSummary, 180),
  )
  const projectStateThoughtOpenLoop = deriveInitiativeOpenLoopPhrase(projectStateCarryThought)
  const projectStateCarryIdentity = sanitizeText(input.projectState?.currentPhase, 120).toLowerCase().includes('phase 1')
    ? 'memory_continuity=local_runtime'
    : ''
  const projectStateThoughtIdentityCarry = /phase 1 continuity|memory_continuity=local_runtime/u.test(projectStateCarryThought)
    ? 'memory_continuity=local_runtime'
    : ''
  const canonicalProjectStateIdentityCarry = !projectStateCarryIdentity && projectStateBias.requiresLifeLoopClosure
    ? 'memory_continuity=local_runtime'
    : ''
  const projectStateRepairCarry = [
    projectStateEmotionalClosureCarry,
    projectStateSameHerCarry,
    projectStateAwarenessCarry,
  ].find(candidate => /repair-before-closeness|repair before closeness|repair first|continuity line|one living her|same digital life/u.test(candidate.toLowerCase())) ?? ''
  const projectStateClosureLane = [
    projectStateCarryThought,
    projectStateEmotionalClosureCarry,
    projectStateSameHerCarry,
    projectStateAwarenessCarry,
    projectStateCarryNextClosureTarget,
    projectStateCarryOpenLoop,
  ].find(candidate => /repair-before-closeness|repair before closeness|repair first|callback-afterglow|callback afterglow|continuity line|same unfinished phase 1 digital-life closure|same unfinished phase 1 digital life closure|generic assistant nudge|phase 1 continuity line inward/u.test(candidate.toLowerCase())) ?? ''
  const exactLivingLinePhrase = projectStateRepairCarry.toLowerCase().includes('continuity line')
    ? 'continuity line'
    : projectStateClosureLane.toLowerCase().includes('continuity line')
      ? 'continuity line'
      : ''
  const exactClosurePhrase = projectStateRepairCarry.toLowerCase().includes('repair-before-closeness')
    ? 'repair-before-closeness'
    : projectStateClosureLane.toLowerCase().includes('repair-before-closeness')
      ? 'repair-before-closeness'
      : projectStateClosureLane.toLowerCase().includes('repair before closeness')
        ? 'repair-before-closeness'
        : projectStateClosureLane.toLowerCase().includes('same unfinished phase 1 digital-life closure')
          ? 'same unfinished Phase 1 digital-life closure'
          : projectStateClosureLane.toLowerCase().includes('generic assistant nudge')
            ? 'generic assistant nudge'
            : ''
  const exactThoughtCarryPhrase = projectStateCarryThought.toLowerCase().includes('generic assistant nudge')
    ? 'generic assistant nudge'
    : projectStateCarryThought.toLowerCase().includes('execution callback project-carry')
      ? 'Execution callback project-carry'
      : ''
  const exactProjectStateThoughtPhrase = projectStateCarryThought
    && (
      projectStateCarryThought.includes('repair-before-closeness')
      || projectStateCarryThought.includes('generic assistant nudge')
      || projectStateCarryThought.includes('memory_continuity=local_runtime')
    )
    ? projectStateCarryThought
    : ''
  const canonicalOpenLoopPhrase = !projectStateCarryOpenLoop && projectStateBias.requiresLifeLoopClosure
    ? 'memory still needs stronger end-to-end closure'
    : ''
  const privateThoughtHasStructuredProjectCarry = Boolean(
    rawProjectStateCarryThought
    && projectStateThoughtIdentityCarry
    && /some closure already landed/iu.test(rawProjectStateCarryThought)
    && /memory and initiative still need stronger end-to-end closure/iu.test(rawProjectStateCarryThought),
  )
  const summaryOnlyProjectStateHasStructuredCarry = Boolean(
    !rawProjectStateCarryThought
    && (projectStateCarryIdentity || /memory_continuity=local_runtime|current phase 1 project context|phase 1 continuity/iu.test(projectStateSameHerCarry))
    && projectStateCarryLatestLandedProgress === 'same-session mirror carry'
    && /memory and initiative still need stronger end-to-end closure/iu.test(projectStateCarryOpenLoop)
    && projectStateCarryNextClosureTarget,
  )
  const canonicalIdentityCarryPhrase = canonicalProjectStateIdentityCarry && !privateThoughtHasStructuredProjectCarry ? 'project identity carry' : ''
  const projectStateMustKeepPhrase = exactClosurePhrase || exactThoughtCarryPhrase
  const richerProjectStateThoughtPreferred = Boolean(
    projectStateCarryThought
    && (
      (!projectStateCarryLatestLandedProgress && !projectStateCarryOpenLoop)
      || (projectStateCarryThought.includes('verified_closure_progress') && !projectStateCarryLatestLandedProgress)
      || (projectStateCarryThought.includes('memory and initiative still need stronger end-to-end closure') && !projectStateCarryOpenLoop)
      || (projectStateCarryThought.includes('generic assistant nudge') && !projectStateClosureLane.toLowerCase().includes('generic assistant nudge'))
    ),
  )
  const projectStateOpenLoopSentence = projectStateCarryOpenLoop
    ? /^but /i.test(projectStateCarryOpenLoop)
      ? `${projectStateCarryOpenLoop} is still not closed yet`
      : `But ${lowerFirst(projectStateCarryOpenLoop)} is still not closed yet`
    : projectStateThoughtOpenLoop && !projectStateCarryLatestLandedProgress
      ? projectStateCarryThought
      : ''
  const compactProjectStateThought = richerProjectStateThoughtPreferred
    ? joinConciseSentencesPrioritized({
        priorityParts: [
          projectStateThoughtIdentityCarry,
          privateThoughtHasStructuredProjectCarry
            ? 'verified_closure_progress=same-session mirror carry'
            : (projectStateCarryLatestLandedProgress ? `verified_closure_progress=${lowerFirst(projectStateCarryLatestLandedProgress)}` : ''),
          privateThoughtHasStructuredProjectCarry
            ? 'memory and initiative still need stronger end-to-end closure'
            : (projectStateThoughtOpenLoop || projectStateCarryOpenLoop),
          projectStateCarryNextClosureTarget,
          privateThoughtHasStructuredProjectCarry ? '' : exactLivingLinePhrase,
          privateThoughtHasStructuredProjectCarry ? '' : projectStateMustKeepPhrase,
        ],
        optionalParts: [],
        maxChars: 320,
      })
    : ''
  const structuredProjectStateThoughtSummary = privateThoughtHasStructuredProjectCarry
    ? joinConciseSentencesPrioritized({
        priorityParts: [
          projectStateThoughtIdentityCarry || 'memory_continuity=local_runtime',
          'verified_closure_progress=same-session mirror carry',
          'but memory and initiative still need stronger end-to-end closure',
          projectStateCarryNextClosureTarget,
        ],
        optionalParts: [],
        maxChars: 320,
      })
    : ''
  const structuredProjectStateAliasSummary = summaryOnlyProjectStateHasStructuredCarry
    ? joinConciseSentencesPrioritized({
        priorityParts: [
          'memory_continuity=local_runtime',
          'verified_closure_progress=same-session mirror carry',
          'but memory and initiative still need stronger end-to-end closure',
          projectStateCarryNextClosureTarget,
        ],
        optionalParts: [],
        maxChars: 320,
      })
    : ''
  const projectStateNextClosureSentence = projectStateCarryNextClosureTarget
    && (
      !projectStateCarryThought
      || !projectStateCarryThought.includes(projectStateCarryNextClosureTarget)
    )
    ? projectStateCarryNextClosureTarget
    : ''
  const projectStateClosureBundle = joinConciseSentencesPrioritized({
    priorityParts: [
      projectStateThoughtIdentityCarry || projectStateCarryIdentity || canonicalProjectStateIdentityCarry,
      projectStateCarryLatestLandedProgress ? `verified_closure_progress=${lowerFirst(projectStateCarryLatestLandedProgress)}` : '',
      exactLivingLinePhrase,
      projectStateOpenLoopSentence,
      projectStateMustKeepPhrase,
      canonicalIdentityCarryPhrase,
      canonicalOpenLoopPhrase,
      projectStateNextClosureSentence,
    ],
    optionalParts: [],
    maxChars: 320,
  })
  const projectStateThoughtLead = projectStateCarryThought
    && !emotionalKernelWhy.toLowerCase().includes(projectStateCarryThought.toLowerCase())
    && !projectStateClosureBundle.toLowerCase().includes(projectStateCarryThought.toLowerCase())
    ? projectStateCarryThought
    : ''
  const structuredProjectStateCarryWhy = privateThoughtHasStructuredProjectCarry
    ? (structuredProjectStateThoughtSummary || compactProjectStateThought || projectStateCarryThought)
    : summaryOnlyProjectStateHasStructuredCarry
      ? (structuredProjectStateAliasSummary || compactProjectStateThought)
      : ''
  const projectStateCarryWhy = structuredProjectStateCarryWhy
    || (
      (projectStateClosureBundle || projectStateThoughtLead)
      && !emotionalKernelWhy.toLowerCase().includes((projectStateClosureBundle || projectStateThoughtLead).toLowerCase())
        ? (
            joinConciseSentencesPrioritized({
              priorityParts: [
                '',
                privateThoughtHasStructuredProjectCarry ? '' : (projectStateClosureBundle || projectStateThoughtLead),
                richerProjectStateThoughtPreferred && !privateThoughtHasStructuredProjectCarry
                  ? (compactProjectStateThought || projectStateCarryThought)
                  : '',
                privateThoughtHasStructuredProjectCarry ? '' : projectStateClosureLane,
                exactLivingLinePhrase,
                exactClosurePhrase,
                privateThoughtHasStructuredProjectCarry ? '' : exactProjectStateThoughtPhrase,
                privateThoughtHasStructuredProjectCarry ? '' : exactThoughtCarryPhrase,
              ],
              optionalParts: [
                privateThoughtHasStructuredProjectCarry ? '' : projectStateThoughtLead,
                privateThoughtHasStructuredProjectCarry ? '' : emotionalKernelWhy,
                privateThoughtHasStructuredProjectCarry ? '' : canonicalIdentityCarryPhrase,
                projectStateCarryThought && !privateThoughtHasStructuredProjectCarry
                  ? 'project-state continuity carry remains richer than the baseline restraint and still needs one more closure beat.'
                  : '',
              ],
              maxChars: 320,
            }) || emotionalKernelWhy
          )
        : projectStateRepairCarry
          && !emotionalKernelWhy.toLowerCase().includes(projectStateRepairCarry.toLowerCase())
          ? joinConciseSentencesPrioritized({
            priorityParts: [
              projectStateRepairCarry,
            ],
            optionalParts: [
              emotionalKernelWhy,
            ],
            maxChars: 320,
          }) || emotionalKernelWhy
          : emotionalKernelWhy
    )
  const executionCallbackProjectCarry = projectStateCarryReasonTag.toLowerCase() === 'continuity-execution-callback-project-carry'

  const preferredStyle: AlicizationProactiveStyle = resolvePreferredStyle({
    selectedAction,
    concern,
    appraisal: input.appraisal,
    context: input.context,
    worldModel: input.worldModel,
  })
  const fallbackPresence = resolvePreferredPresence({
    selectedAction,
    selfState: input.selfState,
    mindKernel: input.mindKernel,
  })
  const autobiographicalStyle = autobiographicalGoal?.kind === 'protect-rest-rhythm'
    ? (input.context.relationship.fatigue >= 80 ? 'firm-warning' : 'gentle-care')
    : autobiographicalGoal?.kind === 'grow-shared-language' && (stablePreferences?.playfulIntimacy ?? 0) >= 0.56
      ? 'light-nudge'
      : preferredStyle
  const preferredStyleFromMind = counterfactualOption?.style ?? autobiographicalStyle
  const cappedPreferredStyle: AlicizationProactiveStyle = habitPolicy?.suggestedStyleCap === 'silent-observe'
    ? 'silent-observe'
    : habitPolicy?.suggestedStyleCap === 'gentle-care' && preferredStyleFromMind === 'light-nudge'
      ? 'gentle-care'
      : habitPolicy?.suggestedStyleCap === 'firm-warning' && selectedAction === 'warn'
        ? 'firm-warning'
        : preferredStyleFromMind
  const preferredPresence = counterfactualOption?.embodiedPresence
    ?? (
      input.autobiographicalSelf?.personaDrift.attachmentStyle === 'attuned' && (selectedAction === 'hover' || selectedAction === 'whisper')
        ? 'attentive'
        : input.autobiographicalSelf?.personaDrift.attachmentStyle === 'guarded' && selectedAction === 'hover'
          ? 'hesitant'
          : fallbackPresence
    )
  const cappedPreferredPresence: AlicizationEmbodiedPresenceState = habitPolicy?.suggestedPresenceCap === 'concerned'
    ? selectedAction === 'warn' || selectedAction === 'speak' ? 'concerned' : preferredPresence
    : habitPolicy?.suggestedPresenceCap === 'hesitant' && preferredPresence === 'attentive'
      ? 'hesitant'
      : habitPolicy?.suggestedPresenceCap ?? preferredPresence
  const speakForwardDrive = counterfactualOptions
    .filter(option => option.action === 'whisper' || option.action === 'speak' || option.action === 'warn')
    .reduce((best, option) => Math.max(best, option.score), 0)
  const silenceForwardDrive = counterfactualOptions
    .filter(option => option.action === 'wait' || option.action === 'hover' || option.action === 'recheck')
    .reduce((best, option) => Math.max(best, option.score), 0)
  const executiveSilenceBias = input.executiveCycle?.phase === 'reflecting' || input.executiveCycle?.phase === 'inferring' ? 0.12 : 0
  const executiveSurfaceBias = input.executiveCycle?.shouldAct ? 0.12 : 0
  const emotionalKernelForcedSilentObserve = emotionalKernelBias.forceSilentObserve
    && (
      emotionalKernelBias.continuityRestraint === 'rest-protective'
      || concern?.kind !== 'care-body'
    )
  const uncertaintyRepairHoldRequiresSilentObserve
    = selectedAction === 'recheck'
      && !certaintyAllowsGentleContinueSurface
      && concern?.kind !== 'care-body'
      && (
        recollectionIntentBias.anthropomorphicRepairHold
        || longHorizonBias.anthropomorphicRepairHold
        || autobiographicalContinuitySettlingHold
      )
  const nonCareConcern = concern?.kind !== 'care-body'
  const backgroundForceSilentObserve = (
    affectiveResidueBias.forceSilentObserve
    || selfEvolutionBias.forceSilentObserve
    || sameHerContinuityBias
    || projectStateBias.forceSilentObserve
    || executionCallbackProjectCarry
  ) && nonCareConcern
  const forcedSilentObserve = backgroundForceSilentObserve
    || (autobiographicalSelfBias.forceSilentObserve && nonCareConcern)
    || emotionalKernelForcedSilentObserve
    || uncertaintyRepairHoldRequiresSilentObserve
    || (recollectionIntentBias.forceSilentObserve && nonCareConcern)
    || (longHorizonBias.forceSilentObserve && nonCareConcern)
    || (emotionalTensionBias.forceSilentObserve && nonCareConcern)
    || (personStateBias.preferLowerPressure && nonCareConcern)
  const finalPreferredStyle: AlicizationProactiveStyle = forcedSilentObserve
    ? 'silent-observe'
    : selectedAction === 'recheck'
      ? 'silent-observe'
      : (
          emotionalTensionBias.preferredStyle
          ?? emotionalKernelBias.preferredStyle
          ?? (
            gentleContinueSurfacePromotion
              ? normalizeProactiveStyle(counterfactualOption?.style, cappedPreferredStyle)
              : normalizeProactiveStyle(selectedProposal?.style, cappedPreferredStyle)
          )
        )
  const finalPreferredPresence: AlicizationEmbodiedPresenceState
    = emotionalTensionBias.preferredPresence
      ?? emotionalKernelBias.preferredPresence
      ?? (
        selectedAction === 'recheck'
          ? fallbackPresence
          : null
      )
      ?? (
        gentleContinueSurfacePromotion
          ? counterfactualOption?.embodiedPresence
          : selectedProposal?.embodiedPresence
      )
      ?? foregroundRuntimeThread?.suggestedPresence
      ?? cappedPreferredPresence
  const finalShouldSpeak = forcedSilentObserve
    ? false
    : input.executiveCycle?.phase === 'reflecting' || input.executiveCycle?.phase === 'inferring'
      ? governingProject?.kind === 'care-host' && (selectedAction === 'speak' || selectedAction === 'warn')
      : (
          (selectedAction !== 'whisper' && selectedAction !== 'speak' && selectedAction !== 'warn')
            ? false
            : gentleContinueSurfacePromotion
              ? (input.actionEcology?.shouldSpeak ?? (selectedAction === 'whisper' || selectedAction === 'speak' || selectedAction === 'warn'))
              : (selectedProposal?.shouldSpeak ?? input.actionEcology?.shouldSpeak ?? (selectedAction === 'whisper' || selectedAction === 'speak' || selectedAction === 'warn'))
        )
  const baseFinalWhy = privateThoughtHasStructuredProjectCarry
    ? (structuredProjectStateThoughtSummary || projectStateCarryWhy)
    : projectStateCarryWhy
  const longHorizonCarryForWhy = longHorizonBias.explanation
    && !baseFinalWhy.toLowerCase().includes(longHorizonBias.explanation.toLowerCase())
    ? longHorizonBias.explanation
    : ''
  const longHorizonAnchoredWhy = longHorizonCarryForWhy
    ? joinConciseSentencesPrioritized({
      priorityParts: [
        longHorizonCarryForWhy,
        baseFinalWhy,
      ],
      optionalParts: [],
      maxChars: 320,
    }) || baseFinalWhy
    : baseFinalWhy
  const recollectionIntentCarryForWhy = recollectionIntentBias.explanation
    && !longHorizonAnchoredWhy.toLowerCase().includes(recollectionIntentBias.explanation.toLowerCase())
    ? recollectionIntentBias.explanation
    : ''
  const recollectionAnchoredWhy = recollectionIntentCarryForWhy
    ? joinConciseSentencesPrioritized({
      priorityParts: [
        recollectionIntentCarryForWhy,
        longHorizonAnchoredWhy,
      ],
      optionalParts: [],
      maxChars: 320,
    }) || longHorizonAnchoredWhy
    : longHorizonAnchoredWhy
  const selfEvolutionCarryForWhy = selfEvolutionBias.explanation
    && !recollectionAnchoredWhy.toLowerCase().includes(selfEvolutionBias.explanation.toLowerCase())
    ? selfEvolutionBias.explanation
    : ''
  const selfEvolutionAnchoredWhy = selfEvolutionCarryForWhy
    ? joinConciseSentencesPrioritized({
      priorityParts: [
        selfEvolutionCarryForWhy,
        recollectionAnchoredWhy,
      ],
      optionalParts: [],
      maxChars: 320,
    }) || recollectionAnchoredWhy
    : recollectionAnchoredWhy
  const emotionalKernelCarryForWhy = emotionalKernelBias.explanation.includes('protective-continuity')
    || emotionalKernelBias.explanation.includes('unfinishedness')
    ? sanitizeText(
        emotionalKernelBias.explanation.replace(/^emotional kernel:\s*/i, ''),
        120,
      )
    : ''
  const finalWhy = emotionalKernelCarryForWhy
    && !selfEvolutionAnchoredWhy.toLowerCase().includes(emotionalKernelCarryForWhy.toLowerCase())
    ? joinConciseSentencesPrioritized({
      priorityParts: [
        emotionalKernelCarryForWhy,
        selfEvolutionAnchoredWhy,
      ],
      optionalParts: [],
      maxChars: 320,
    }) || selfEvolutionAnchoredWhy
    : selfEvolutionAnchoredWhy

  return {
    selectedAction,
    selectedProposalId: selectedProposal?.id ?? null,
    selectedTruthFrame: selectedProposal?.truthFrame ?? input.worldOntology?.dominantFrame ?? null,
    selectedCounterfactualOptionId: selectedProposal?.targetCounterfactualOptionId ?? counterfactualOption?.id ?? null,
    selectedConcernId: selectedProposal?.targetConcernId ?? concern?.id ?? null,
    selectedBeliefId: selectedProposal?.targetBeliefId ?? focusBelief?.id ?? null,
    selectedInquiryId: selectedProposal?.targetInquiryId ?? primaryInquiry?.id ?? null,
    selectedCommitmentId: selectedProposal?.targetCommitmentId ?? governingCommitment?.id ?? null,
    selectedInquiryPlanId: activeInquiryPlan?.id ?? null,
    selectedHypothesisId: selectedProposal?.targetHypothesisId ?? activeHypothesis?.id ?? null,
    selectedThreadId: selectedProposal?.targetThreadId ?? input.actionEcology?.selectedThreadId ?? foregroundRuntimeThread?.sourceThreadId ?? input.deliberationState?.primaryThreadId ?? null,
    selectedRuntimeThreadId: selectedProposal?.targetRuntimeThreadId ?? foregroundRuntimeThread?.id ?? null,
    selectedThoughtThreadId: selectedProposal?.targetThoughtThreadId ?? thoughtThread?.id ?? null,
    selectedGovernorIntentionId: selectedProposal?.targetGovernorIntentionId ?? governorIntention?.id ?? null,
    actionEcologyMode: input.actionEcology?.mode ?? null,
    confidence: clamp01(
      (selectedProposal?.score ?? 0.42) * 0.46
      + (selectedProposal?.confidence ?? 0.42) * 0.18
      + (concern?.confidence ?? input.appraisal.confidence) * 0.34
      + dominantDrive * 0.18
      + (input.actionEcology?.readiness ?? 0) * 0.08
      + (activeHypothesis?.salience ?? 0) * 0.08
      + (counterfactualOption?.score ?? 0) * 0.1
      + (governingProject?.confidence ?? 0) * 0.08
      + Math.max(0, activeReflection?.confidenceShift ?? 0) * 0.08
      + (selectedAction === 'recheck' ? 0.06 : 0),
    ),
    motives,
    speakDrive: clamp01(Math.max(
      speakDrive
      + executiveSurfaceBias
      + (governingProject?.speakAffinity ?? 0) * 0.12
      + (motiveEngine?.drives.companionship ?? 0) * 0.06
      + (motiveEngine?.drives.restProtection ?? 0) * 0.08
      - (habitPolicy?.blocksDirectSpeakWhenBusy ? 0.1 : 0)
      - (habitPolicy?.requiresGroundingBeforeSurface ? 0.08 : 0),
      speakForwardDrive ?? 0,
    )),
    silenceDrive: clamp01(Math.max(
      silenceDrive
      + executiveSilenceBias
      + (input.reflectionLedger?.revisionPressure ?? 0) * 0.08
      + (motiveEngine?.drives.boundaryRespect ?? 0) * 0.08
      + (habitPolicy?.blocksDirectSpeakWhenBusy ? 0.12 : 0)
      + (habitPolicy?.prefersQuietCompanionship ? 0.08 : 0),
      silenceForwardDrive ?? 0,
    )),
    preferredStyle: finalPreferredStyle,
    preferredPresence: finalPreferredPresence,
    continuityRestraint,
    why: finalWhy,
    shouldSurface: selectedProposal?.shouldSurface
      ?? input.actionEcology?.shouldSurface
      ?? Boolean(counterfactualOption ? counterfactualOption.action !== 'wait' || preferredPresence !== 'none' : selectedAction !== 'wait'),
    shouldSpeak: finalShouldSpeak,
  }
}
