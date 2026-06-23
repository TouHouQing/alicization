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

function selectedCounterfactualOption(counterfactual?: AlicizationCounterfactualDeliberationSnapshot | null) {
  return counterfactual?.options.find(option => option.id === counterfactual.selectedOptionId)
    ?? counterfactual?.options[0]
    ?? null
}

function foregroundThoughtThread(thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null) {
  return thoughtThreads?.threads.find(thread => thread.id === thoughtThreads.foregroundThreadId)
    ?? thoughtThreads?.threads[0]
    ?? null
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
  projectState?: unknown
}): AlicizationActionEcologySnapshot {
  const foregroundRuntimeThread = input.threadRuntime?.threads.find(thread => thread.id === input.threadRuntime?.foregroundThreadId)
    ?? input.threadRuntime?.threads[0]
    ?? null
  const primaryThread = input.deliberationState.threads.find(thread => thread.id === input.deliberationState.primaryThreadId)
    ?? input.deliberationState.threads[0]
    ?? null
  const governingCommitment = input.commitmentLedger?.commitments.find(commitment => commitment.id === input.commitmentLedger?.governingCommitmentId)
    ?? input.commitmentLedger?.commitments[0]
    ?? null
  const activePlan = input.inquiryPlanner?.plans.find(plan => plan.id === input.inquiryPlanner?.activePlanId)
    ?? input.inquiryPlanner?.plans[0]
    ?? null
  const counterfactualOption = selectedCounterfactualOption(input.counterfactualDeliberation)
  const thoughtThread = foregroundThoughtThread(input.thoughtThreads)
  const kernelMode = input.mindKernel?.dominantMode ?? null
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
    + (input.context.system.fullscreenLikely ? 0.1 : 0),
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
    + (input.worldModel.continuity.afterglowOpen ? 0.08 : 0),
  )

  let mode: AlicizationActionEcologySnapshot['mode'] = 'silent-presence'
  let suggestedStyle: AlicizationActionEcologySnapshot['suggestedStyle'] = 'silent-observe'
  let embodiedPresence: AlicizationActionEcologySnapshot['embodiedPresence']
    = foregroundRuntimeThread?.suggestedPresence
      ?? primaryThread?.embodiedPresence
      ?? (kernelMode === 'guarding' ? 'concerned' : kernelMode === 'repairing' ? 'hesitant' : kernelMode === 'tracking' ? 'attentive' : 'glance')
  let shouldSpeak = false
  let shouldSurface = Boolean(primaryThread || foregroundRuntimeThread)
  let why = input.mindKernel?.narrative[0]
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
