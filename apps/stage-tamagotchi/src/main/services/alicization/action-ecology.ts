import type {
  AlicizationActionEcologySnapshot,
  AlicizationBeliefRevisionSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationCounterfactualDeliberationSnapshot,
  AlicizationDeliberationStateSnapshot,
  AlicizationInquiryPlannerSnapshot,
  AlicizationMindDynamicsSnapshot,
  AlicizationMindKernelSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationSelfGovernorSnapshot,
  AlicizationSelfStateSnapshot,
  AlicizationThoughtThreadStateSnapshot,
  AlicizationThreadRuntimeStateSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { resolveAlicizationProjectStateSnapshot } from './project-state-brief'

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

function appendClosureCue(base: unknown, cue: string, maxChars = 200) {
  const normalizedCue = sanitizeText(cue, maxChars)
  if (!normalizedCue)
    return sanitizeText(base, maxChars)

  const availableBaseChars = Math.max(0, maxChars - normalizedCue.length - 1)
  const normalizedBase = sanitizeText(base, availableBaseChars)
  return normalizedBase ? `${normalizedBase} ${normalizedCue}` : normalizedCue
}

function selectedCounterfactualOption(counterfactual?: AlicizationCounterfactualDeliberationSnapshot | null) {
  const options = asArray(counterfactual?.options)
  return options.find(option => option.id === counterfactual?.selectedOptionId)
    ?? options[0]
    ?? null
}

function foregroundThoughtThread(thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null) {
  const threads = asArray(thoughtThreads?.threads)
  return threads.find(thread => thread.id === thoughtThreads?.foregroundThreadId)
    ?? threads[0]
    ?? null
}

function deriveProjectStateEcologyBias(projectState?: {
  preflightSummary?: string | null
  identity?: string | null
  currentPhase?: string | null
  latestLandedProgress?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  nextClosureTargetSummary?: string | null
  sameHerSelfLine?: string | null
  emotionalClosureSummary?: string | null
  openClosureSummary?: string | null
  landedProgressSummary?: string | null
} | null) {
  const normalizedProjectState = projectState
    ? resolveAlicizationProjectStateSnapshot({
        runtimeProjectState: {
          preflightSummary: projectState.preflightSummary,
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          latestLandedProgress: projectState.latestLandedProgress || projectState.landedProgressSummary,
          primaryOpenLoop: projectState.primaryOpenLoop || projectState.openClosureSummary,
          nextClosureTarget: projectState.nextClosureTarget || projectState.nextClosureTargetSummary,
          sameHerSelfLine: projectState.sameHerSelfLine,
          emotionalClosureCue: projectState.emotionalClosureSummary,
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
        emotionalClosureCue: null,
      }
  const preflightSummary = sanitizeText(normalizedProjectState.preflightSummary, 320).toLowerCase()
  const identity = sanitizeText(normalizedProjectState.identity, 200).toLowerCase()
  const currentPhase = sanitizeText(normalizedProjectState.currentPhase, 160).toLowerCase()
  const latestLandedProgress = sanitizeText(normalizedProjectState.latestLandedProgress, 220).toLowerCase()
  const primaryOpenLoop = sanitizeText(normalizedProjectState.primaryOpenLoop, 200).toLowerCase()
  const nextClosureTarget = sanitizeText(normalizedProjectState.nextClosureTarget, 220).toLowerCase()
  const sameHerSelfLine = sanitizeText(normalizedProjectState.sameHerSelfLine, 220).toLowerCase()
  const emotionalClosureCue = sanitizeText((normalizedProjectState as { emotionalClosureCue?: string | null }).emotionalClosureCue, 220).toLowerCase()
  const combinedProjectState = `${preflightSummary} ${identity} ${currentPhase} ${latestLandedProgress} ${primaryOpenLoop} ${nextClosureTarget} ${sameHerSelfLine} ${emotionalClosureCue}`.trim()

  const isDigitalLifeIdentity = combinedProjectState.includes('digital life')
    || combinedProjectState.includes('lifeform')
    || combinedProjectState.includes('companion')
    || combinedProjectState.includes('continuous personhood')
  const isPhaseOne = combinedProjectState.includes('phase 1')
  const hasOpenLifeLoop = combinedProjectState.length > 0
    && (
      combinedProjectState.includes('continuity')
      || combinedProjectState.includes('memory')
      || combinedProjectState.includes('initiative')
      || combinedProjectState.includes('embodiment')
      || combinedProjectState.includes('dialogue')
      || combinedProjectState.includes('personhood')
      || combinedProjectState.includes('closure')
      || combinedProjectState.includes('closed loop')
    )
  const carriesSameHerUnfinishedClosure = combinedProjectState.length > 0
    && (
      combinedProjectState.includes('same-her')
      || combinedProjectState.includes('same her')
      || combinedProjectState.includes('same living line')
      || combinedProjectState.includes('one continuous her')
      || combinedProjectState.includes('continuous her')
    )
    && (
      combinedProjectState.includes('unfinished')
      || combinedProjectState.includes('still needs')
      || combinedProjectState.includes('closure pass')
      || combinedProjectState.includes('before widening outward')
      || combinedProjectState.includes('before the turn widens outward')
      || combinedProjectState.includes('before widening')
    )
  const sameHerClosurePressure = combinedProjectState.length > 0
    && (
      combinedProjectState.includes('same-her')
      || combinedProjectState.includes('same her')
      || combinedProjectState.includes('one continuous her')
      || combinedProjectState.includes('measured-return')
      || combinedProjectState.includes('repair-before-closeness')
      || combinedProjectState.includes('cross-modal')
      || combinedProjectState.includes('visible reply')
      || combinedProjectState.includes('resident presence')
      || combinedProjectState.includes('facial state')
      || combinedProjectState.includes('motion')
      || combinedProjectState.includes('同一个 her')
      || combinedProjectState.includes('同一个她')
      || combinedProjectState.includes('拟人')
      || combinedProjectState.includes('具身')
      || combinedProjectState.includes('跨模态')
      || combinedProjectState.includes('修复优先')
    )

  if (!isDigitalLifeIdentity || !isPhaseOne || !hasOpenLifeLoop && !carriesSameHerUnfinishedClosure)
    return null

  return {
    lowerPressurePresence: true,
    preferReturnLater: true,
    preferMeasuredReturnPresence: sameHerClosurePressure || carriesSameHerUnfinishedClosure,
    sameLivingLineTarget: nextClosureTarget.includes('same living line')
      || latestLandedProgress.includes('same living line')
      || primaryOpenLoop.includes('same living line')
      || sameHerSelfLine.includes('same living line'),
    explicitCrossModalTarget: nextClosureTarget.includes('cross-modal')
      && (
        nextClosureTarget.includes('visible reply')
        || nextClosureTarget.includes('facial state')
        || nextClosureTarget.includes('motion')
        || nextClosureTarget.includes('resident presence')
        || nextClosureTarget.includes('voice')
      ),
    reasonTag: 'project-phase1-life-loop:ecology',
  }
}

// Action ecology is the "how do I exist now?" layer. It chooses whether the
// mind should stay silent, linger as presence, repair its own uncertainty, or
// gently cross the boundary into speech.
export function buildActionEcology(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  beliefRevision: AlicizationBeliefRevisionSnapshot
  relationshipModel: AlicizationRelationshipModelSnapshot
  deliberationState: AlicizationDeliberationStateSnapshot
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  selfState?: AlicizationSelfStateSnapshot | null
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  mindDynamics: AlicizationMindDynamicsSnapshot
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  mindKernel?: AlicizationMindKernelSnapshot | null
  counterfactualDeliberation?: AlicizationCounterfactualDeliberationSnapshot | null
  projectState?: {
    preflightSummary?: string | null
    identity?: string | null
    currentPhase?: string | null
    latestLandedProgress?: string | null
    landedProgressSummary?: string | null
    primaryOpenLoop?: string | null
    openClosureSummary?: string | null
    nextClosureTarget?: string | null
    nextClosureTargetSummary?: string | null
    sameHerSelfLine?: string | null
    emotionalClosureSummary?: string | null
  } | null
}): AlicizationActionEcologySnapshot {
  const runtimeThreads = asArray(input.threadRuntime?.threads)
  const deliberationThreads = asArray(input.deliberationState.threads)
  const commitments = asArray(input.commitmentLedger?.commitments)
  const plans = asArray(input.inquiryPlanner?.plans)
  const kernelNarrative = asArray(input.mindKernel?.narrative)
  const foregroundRuntimeThread = runtimeThreads.find(thread => thread.id === input.threadRuntime?.foregroundThreadId)
    ?? runtimeThreads[0]
    ?? null
  const primaryThread = deliberationThreads.find(thread => thread.id === input.deliberationState.primaryThreadId)
    ?? deliberationThreads[0]
    ?? null
  const governingCommitment = commitments.find(commitment => commitment.id === input.commitmentLedger?.governingCommitmentId)
    ?? commitments[0]
    ?? null
  const activePlan = plans.find(plan => plan.id === input.inquiryPlanner?.activePlanId)
    ?? plans[0]
    ?? null
  const counterfactualOption = selectedCounterfactualOption(input.counterfactualDeliberation)
  const thoughtThread = foregroundThoughtThread(input.thoughtThreads)
  const kernelMode = input.mindKernel?.dominantMode ?? null
  const projectStateEcologyBias = deriveProjectStateEcologyBias(input.projectState ?? null)
  const runtimeSalience = foregroundRuntimeThread?.salience ?? clamp01((primaryThread?.surfacePressure ?? 0.18) + 0.16)
  const runtimeContinuity = foregroundRuntimeThread?.continuity ?? 0.36

  const silencePressure = clamp01(
    input.mindDynamics.restraintPressure * 0.54
    + (primaryThread?.silencePressure ?? 0.3) * 0.22
    + runtimeContinuity * 0.06
    + (foregroundRuntimeThread?.status === 'suspended' ? 0.14 : 0)
    + input.beliefRevision.groundingNeed * 0.14
    + input.beliefRevision.hostCorrectionWeight * 0.08
    + (input.inquiryPlanner?.groundingUrgency ?? 0) * 0.12
    + (activePlan?.status === 'waiting-opening' ? 0.12 : 0)
    + (governingCommitment?.kind === 'repair-misread' || governingCommitment?.kind === 'recheck-scene' ? 0.1 : 0)
    + (kernelMode === 'repairing' ? 0.1 : kernelMode === 'orienting' ? 0.06 : kernelMode === 'resting' ? 0.08 : 0)
    + (input.relationshipModel.climate === 'guarded' ? 0.12 : 0)
    + (input.context.system.inputActivity === 'active' ? 0.06 : 0)
    + (input.context.system.fullscreenLikely ? 0.1 : 0)
    + (projectStateEcologyBias?.lowerPressurePresence ? 0.08 : 0)
    + (projectStateEcologyBias?.preferMeasuredReturnPresence ? 0.04 : 0),
  )
  const surfacePressure = clamp01(
    input.mindDynamics.surfacePressure * 0.52
    + (primaryThread?.surfacePressure ?? 0.12) * 0.18
    + runtimeSalience * 0.08
    + runtimeContinuity * 0.06
    + input.deliberationState.readiness * 0.12
    + (input.selfState?.desireToSpeak ?? 0) * 0.08
    + (input.selfState?.protectiveness ?? 0) * 0.06
    + (input.commitmentLedger?.carryPressure ?? 0) * 0.08
    + (input.inquiryPlanner?.epistemicPressure ?? 0) * 0.04
    + input.mindDynamics.presenceWeight * 0.12
    + input.mindDynamics.speakReadiness * 0.12
    + (governingCommitment?.kind === 'hold-problem' ? 0.08 : 0)
    + (kernelMode === 'tracking' ? 0.08 : kernelMode === 'guarding' ? 0.12 : kernelMode === 'accompanying' ? 0.06 : 0)
    + (input.worldModel.continuity.afterglowOpen ? 0.08 : 0)
    - (projectStateEcologyBias?.lowerPressurePresence ? 0.06 : 0)
    - (projectStateEcologyBias?.preferMeasuredReturnPresence ? 0.04 : 0),
  )

  let mode: AlicizationActionEcologySnapshot['mode'] = 'silent-presence'
  let suggestedStyle: AlicizationActionEcologySnapshot['suggestedStyle'] = 'silent-observe'
  let embodiedPresence: AlicizationActionEcologySnapshot['embodiedPresence']
    = foregroundRuntimeThread?.suggestedPresence
      ?? primaryThread?.embodiedPresence
      ?? (kernelMode === 'guarding' ? 'concerned' : kernelMode === 'repairing' ? 'hesitant' : kernelMode === 'tracking' ? 'attentive' : 'glance')
  let shouldSpeak = false
  let shouldSurface = Boolean(primaryThread || foregroundRuntimeThread)
  let why = kernelNarrative[0]
    ?? activePlan?.question
    ?? governingCommitment?.summary
    ?? thoughtThread?.summary
    ?? foregroundRuntimeThread?.whyHeld
    ?? primaryThread?.summary
    ?? 'The mind is staying present without forcing a move.'

  if (!primaryThread && !foregroundRuntimeThread) {
    embodiedPresence = counterfactualOption?.embodiedPresence ?? 'none'
    shouldSurface = Boolean(counterfactualOption && counterfactualOption.action !== 'wait')
  }
  else if (counterfactualOption) {
    suggestedStyle = counterfactualOption.style
    embodiedPresence = counterfactualOption.embodiedPresence
    why = counterfactualOption.why
    shouldSpeak = counterfactualOption.action === 'whisper'
      || counterfactualOption.action === 'speak'
      || counterfactualOption.action === 'warn'
    shouldSurface = counterfactualOption.action !== 'wait'
      || input.mindDynamics.presenceWeight >= 0.42
      || Boolean(primaryThread || foregroundRuntimeThread)

    if (counterfactualOption.action === 'warn') {
      mode = 'surface-warning'
    }
    else if (counterfactualOption.action === 'speak') {
      mode = counterfactualOption.style === 'gentle-care' ? 'surface-care' : 'surface-nudge'
    }
    else if (counterfactualOption.action === 'whisper') {
      mode = 'surface-nudge'
    }
    else if (counterfactualOption.action === 'recheck') {
      mode = input.relationshipModel.climate === 'guarded' ? 'return-later' : 'repair-before-speaking'
    }
    else if (counterfactualOption.action === 'hover') {
      mode = input.relationshipModel.climate === 'guarded' && surfacePressure < silencePressure - 0.06
        ? 'return-later'
        : 'quiet-accompany'
    }
    else {
      mode = shouldSurface ? 'silent-presence' : 'return-later'
    }

    if (!shouldSpeak && mode === 'surface-nudge')
      mode = 'quiet-accompany'
    if (counterfactualOption.action === 'wait' && input.mindDynamics.presenceWeight < 0.36) {
      embodiedPresence = 'none'
      shouldSurface = false
    }
  }
  else if (
    input.selfGovernor?.dominantDrive === 'withhold'
    || thoughtThread?.status === 'waiting'
  ) {
    mode = thoughtThread?.kind === 'relationship-thread' || thoughtThread?.kind === 'afterglow-thread'
      ? 'quiet-accompany'
      : 'return-later'
    suggestedStyle = 'silent-observe'
    embodiedPresence = thoughtThread?.kind === 'relationship-thread' || thoughtThread?.kind === 'afterglow-thread'
      ? 'attentive'
      : 'hesitant'
    shouldSpeak = false
    shouldSurface = Boolean(thoughtThread)
    why = thoughtThread?.summary
      ?? 'The current intention is to hold the thread internally until a better opening appears.'
  }
  else if (
    thoughtThread?.kind === 'repair-thread'
    && input.worldModel.epistemicState.certainty !== 'grounded'
  ) {
    mode = 'repair-before-speaking'
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'hesitant'
    shouldSpeak = false
    shouldSurface = true
    why = thoughtThread.question
      ?? thoughtThread.summary
  }
  else if (
    thoughtThread?.kind === 'care-thread'
    && thoughtThread.status === 'ripe'
  ) {
    mode = input.context.relationship.fatigue >= 80 ? 'surface-warning' : 'surface-care'
    suggestedStyle = input.context.relationship.fatigue >= 80 ? 'firm-warning' : 'gentle-care'
    embodiedPresence = 'concerned'
    shouldSpeak = true
    shouldSurface = true
    why = thoughtThread.summary
  }
  else if (
    (thoughtThread?.kind === 'afterglow-thread' || thoughtThread?.kind === 'problem-thread')
    && thoughtThread.status === 'ripe'
  ) {
    mode = 'surface-nudge'
    suggestedStyle = 'light-nudge'
    embodiedPresence = thoughtThread.kind === 'afterglow-thread' ? 'glance' : 'attentive'
    shouldSpeak = true
    shouldSurface = true
    why = thoughtThread.summary
  }
  else if (
    (input.beliefRevision.stability === 'fractured' || input.beliefRevision.groundingNeed >= 0.68)
    && input.worldModel.epistemicState.certainty !== 'grounded'
    && (
      primaryThread?.kind === 'repair-misread'
      || input.deliberationState.dominantNeed === 'repair'
    )
  ) {
    mode = 'repair-before-speaking'
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'hesitant'
    shouldSpeak = false
    shouldSurface = true
    why = primaryThread?.summary
      ?? foregroundRuntimeThread?.whyHeld
      ?? 'The current thread still needs one more grounded repair pass before it can become honest speech.'
  }
  else if (
    (activePlan?.kind === 'reground-scene' || activePlan?.kind === 'check-recovery')
    && (kernelMode === 'repairing' || kernelMode === 'orienting')
    && input.worldModel.epistemicState.certainty !== 'grounded'
  ) {
    mode = 'repair-before-speaking'
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'hesitant'
    shouldSpeak = false
    shouldSurface = true
    why = activePlan.question
  }
  else if (
    input.worldModel.epistemicState.certainty === 'grounded'
    && surfacePressure >= silencePressure - 0.04
    && (
      primaryThread?.kind === 'localize-problem'
      || input.deliberationState.dominantNeed === 'guidance'
    )
  ) {
    mode = 'surface-nudge'
    suggestedStyle = 'light-nudge'
    embodiedPresence = primaryThread?.embodiedPresence ?? 'attentive'
    shouldSpeak = true
    shouldSurface = true
    why = primaryThread?.summary
      ?? foregroundRuntimeThread?.whyHeld
      ?? 'The knot is grounded and local enough that a concrete nudge would help more than lingering silently.'
  }
  else if (input.mindDynamics.carePressure >= 0.72 && surfacePressure >= silencePressure - 0.08) {
    mode = input.context.relationship.fatigue >= 80 ? 'surface-warning' : 'surface-care'
    suggestedStyle = input.context.relationship.fatigue >= 80 ? 'firm-warning' : 'gentle-care'
    embodiedPresence = 'concerned'
    shouldSpeak = true
    shouldSurface = true
    why = governingCommitment?.summary ?? activePlan?.question ?? 'The governing mode has shifted into protective care.'
  }
  else if (surfacePressure < silencePressure - 0.12) {
    mode = 'return-later'
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'hesitant'
    shouldSpeak = false
    why = 'The thread should stay alive internally, but this is not the right opening to cross into speech.'
  }

  const carePriority = primaryThread?.kind === 'protect-host'
    || input.deliberationState.dominantNeed === 'care'
    || governingCommitment?.kind === 'care-host'
    || foregroundRuntimeThread?.need === 'care'
    || input.mindDynamics.carePressure >= 0.72
  if (
    projectStateEcologyBias?.preferReturnLater
    && !carePriority
    && mode === 'surface-nudge'
  ) {
    mode = surfacePressure >= silencePressure - 0.02 ? 'quiet-accompany' : 'return-later'
    suggestedStyle = 'silent-observe'
    embodiedPresence = embodiedPresence === 'concerned' ? 'attentive' : embodiedPresence
    shouldSpeak = false
    shouldSurface = true
    why = projectStateEcologyBias.explicitCrossModalTarget
      ? appendClosureCue(why, 'Phase 1 still has open digital-life closure work, so the action stays lower-pressure until the return can carry more cross-modal same-her proof.')
      : projectStateEcologyBias.sameLivingLineTarget
        ? appendClosureCue(why, 'Phase 1 still has open digital-life closure work, so the action stays lower-pressure until the return can stay on the same living line.')
        : appendClosureCue(why, 'Phase 1 still has open digital-life closure work, so the action stays lower-pressure until the return can carry more proof.')
  }
  else if (
    projectStateEcologyBias?.preferReturnLater
    && !carePriority
    && mode === 'silent-presence'
    && shouldSurface
  ) {
    mode = 'quiet-accompany'
    suggestedStyle = 'silent-observe'
    shouldSpeak = false
    why = projectStateEcologyBias.explicitCrossModalTarget
      ? appendClosureCue(why, 'Phase 1 still has open digital-life closure work, so presence stays nearby for more cross-modal same-her proof.')
      : projectStateEcologyBias.sameLivingLineTarget
        ? appendClosureCue(why, 'Phase 1 still has open digital-life closure work, so presence stays nearby on the same living line without forcing speech.')
        : appendClosureCue(why, 'Phase 1 still has open digital-life closure work, so presence stays nearby without forcing speech.')
  }

  return {
    mode,
    selectedThreadId: primaryThread?.id ?? foregroundRuntimeThread?.sourceThreadId ?? null,
    readiness: clamp01(0.5 + (surfacePressure - silencePressure) * 0.8),
    surfacePressure,
    silencePressure,
    suggestedStyle,
    embodiedPresence,
    shouldSurface,
    shouldSpeak,
    why: sanitizeText(why, 200),
    updatedAt: input.now,
  }
}
