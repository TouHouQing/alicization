import type {
  AlicizationRuntimeChannelId,
  AlicizationRuntimeSnapshot,
} from './alicization-runtime-architecture'
import type {
  AlicizationDigitalLifeArchitectureSnapshot,
  AlicizationDigitalLifeSubsystemId,
} from './digital-life-architecture'

export type AlicizationActiveLoopPhase = 'observe' | 'dialogue' | 'control' | 'integrate'

export interface AlicizationActiveLoopSnapshot {
  version: 'alicization-active-loop-v1'
  phase: AlicizationActiveLoopPhase
  dominantChannel: AlicizationRuntimeChannelId | null
  handoffTarget: AlicizationRuntimeChannelId | null
  continuityArcStage?: string | null
  continuityPreferredTiming?: string | null
  dialogueReady: boolean
  controlReady: boolean
  memoryCarry: boolean
  companionshipReady: boolean
  observationHeavy: boolean
  continuityPressure: number
  companionshipPressure: number
  initiativeBudget: number
  coherence: number
  summary: string
}

export interface AlicizationRuntimeProactiveSignals {
  activeLoop: AlicizationActiveLoopSnapshot | null
  architectureDialogueHeat: number
  architecturePerceptionHeat: number
  architectureProactiveHeat: number
  architectureControlHeat: number
  architectureMemoryHeat: number
  runtimeDominantChannel: AlicizationRuntimeChannelId | null
  runtimeDialogueHeat: number
  runtimePerceptionHeat: number
  runtimeActiveDialogueHeat: number
  runtimeControlHeat: number
  continuityPressure: number
  companionshipPressure: number
  architectureDialogueReady: boolean
  architectureObservationHeavy: boolean
  architectureControlReady: boolean
  architectureMemoryCarry: boolean
  runtimeDialogueReady: boolean
  runtimeObservationHeavy: boolean
  runtimeControlReady: boolean
  runtimeMemoryCarry: boolean
}

function clamp01(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value)))
}

function architectureSystemScore(
  architecture: AlicizationDigitalLifeArchitectureSnapshot | null | undefined,
  systemId: AlicizationDigitalLifeSubsystemId,
) {
  return clamp01(architecture?.systems[systemId]?.score ?? 0)
}

function architectureSupports(
  architecture: AlicizationDigitalLifeArchitectureSnapshot | null | undefined,
  systemId: AlicizationDigitalLifeSubsystemId,
) {
  return architecture?.supportingSystems.includes(systemId) ?? false
}

function readRuntimeChannelReadiness(
  runtime: AlicizationRuntimeSnapshot | null | undefined,
  channel: AlicizationRuntimeChannelId,
) {
  return clamp01(runtime?.channels[channel]?.readiness ?? 0)
}

function isRuntimeCompanionshipDominantChannel(channel: AlicizationRuntimeChannelId | null) {
  return channel === 'dialogue'
    || channel === 'active-dialogue'
    || channel === 'anthropomorphic-mind'
}

function isRuntimeMemoryDominantChannel(channel: AlicizationRuntimeChannelId | null) {
  return channel === 'active-memory'
}

function mapArchitectureDominantSystemToRuntimeChannel(
  system: AlicizationDigitalLifeArchitectureSnapshot['dominantSystem'] | null | undefined,
): AlicizationRuntimeChannelId | null {
  if (system === 'dialogue')
    return 'dialogue'
  if (system === 'perception')
    return 'active-perception'
  if (system === 'proactive')
    return 'active-dialogue'
  if (system === 'control')
    return 'active-control'
  if (system === 'mind')
    return 'active-mind'
  if (system === 'memory')
    return 'active-memory'
  if (system === 'runtime')
    return 'agent-runtime'
  return null
}

function rankRuntimeChannelsByReadiness(readiness: Record<AlicizationRuntimeChannelId, number>) {
  const tieBreaker: Record<AlicizationRuntimeChannelId, number> = {
    'dialogue': 0,
    'active-dialogue': 1,
    'active-control': 2,
    'active-mind': 3,
    'active-memory': 4,
    'anthropomorphic-mind': 5,
    'active-perception': 6,
    'agent-runtime': 7,
  }

  return (Object.keys(readiness) as AlicizationRuntimeChannelId[])
    .slice()
    .sort((left, right) => {
      if (readiness[right] !== readiness[left])
        return readiness[right] - readiness[left]
      return tieBreaker[left] - tieBreaker[right]
    })
}

function isInwardContinuityArcStage(stage: string | null | undefined) {
  return stage === 'hold-for-opening'
}

function isMeasuredReturnSameThreadInwardCarry(input: {
  continuityArcStage: string | null
  continuityPreferredTiming?: string | null
  continuityRestraint: string | null
  memoryCarry: boolean
  continuityPressure: number
}) {
  return input.continuityArcStage === 'same-thread-continuation'
    && (
      input.continuityRestraint === 'measured-return'
      || input.continuityRestraint === 'repair-before-closeness'
    )
    && input.memoryCarry
    && (
      input.continuityPreferredTiming == null
      || input.continuityPreferredTiming === 'next-open-window'
    )
    && input.continuityPressure >= 0.64
}

function hasSameHerProjectClosureCue(text: string) {
  return (
    text.includes('same-her')
    || text.includes('same her')
    || text.includes('same digital life')
    || text.includes('same living line')
    || text.includes('same living bond line')
    || text.includes('unfinished closure')
    || text.includes('measured-return')
    || text.includes('digital life')
    || text.includes('execution-callback project-carry')
    || text.includes('callback project-carry')
    || text.includes('continuity-execution-callback-project-carry')
    || text.includes('拟人')
    || text.includes('具身')
  )
}

function hasDurableSelfCoreInitiativeRestraint(runtime?: AlicizationRuntimeSnapshot | null) {
  const authority = runtime?.personStateProjection?.selfContinuityAuthority ?? null
  const sourceTags = Array.isArray(authority?.sourceTags)
    ? authority.sourceTags.map(tag => String(tag).trim().toLowerCase()).filter(Boolean)
    : []
  const continuityText = [
    authority?.selfLine,
    authority?.authoritySummary,
    authority?.inwardLine,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()

  return sourceTags.includes('durable-self-core')
    && /same her|same self|one living self|across quiet, memory, and speech|without reopening from scratch/u.test(continuityText)
}

function deriveProjectStateRhythmBias(projectState?: {
  currentPhase?: string | null
  memoryClosureSummary?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  continuityCue?: string | null
} | null) {
  const currentPhase = typeof projectState?.currentPhase === 'string'
    ? projectState.currentPhase.toLowerCase()
    : ''
  const memoryClosureSummary = typeof projectState?.memoryClosureSummary === 'string'
    ? projectState.memoryClosureSummary.toLowerCase()
    : ''
  const primaryOpenLoop = typeof projectState?.primaryOpenLoop === 'string'
    ? projectState.primaryOpenLoop.toLowerCase()
    : ''
  const nextClosureTarget = typeof projectState?.nextClosureTarget === 'string'
    ? projectState.nextClosureTarget.toLowerCase()
    : ''
  const continuityCue = typeof projectState?.continuityCue === 'string'
    ? projectState.continuityCue.toLowerCase()
    : ''
  const executionCallbackProjectCarry = [
    memoryClosureSummary,
    primaryOpenLoop,
    nextClosureTarget,
    continuityCue,
  ].some(text => text.includes('continuity-execution-callback-project-carry')
    || text.includes('execution-callback project-carry')
    || text.includes('callback project-carry'))

  const phaseOne = currentPhase.includes('phase 1')
  const openLifeLoop = primaryOpenLoop.length > 0
    && (
      hasSameHerProjectClosureCue(primaryOpenLoop)
      || primaryOpenLoop.includes('initiative')
      || primaryOpenLoop.includes('embodiment')
      || primaryOpenLoop.includes('personhood')
      || primaryOpenLoop.includes('closure')
    )
  const sameHerClosureTarget = (
    nextClosureTarget.length > 0
    && (
      hasSameHerProjectClosureCue(nextClosureTarget)
      || nextClosureTarget.includes('repair-before-closeness')
      || nextClosureTarget.includes('cross-modal')
      || nextClosureTarget.includes('resident presence')
      || nextClosureTarget.includes('voice')
      || nextClosureTarget.includes('motion')
      || nextClosureTarget.includes('facial')
      || nextClosureTarget.includes('跨模态')
    )
  ) || (
    hasSameHerProjectClosureCue(memoryClosureSummary)
    && hasSameHerProjectClosureCue(continuityCue)
  )

  if (!phaseOne || !openLifeLoop || !sameHerClosureTarget)
    return null

  return {
    initiativeBudgetPenalty: executionCallbackProjectCarry ? 0.08 : 0.05,
    continuityRestraint:
      continuityCue.includes('repair-before-closeness')
      || nextClosureTarget.includes('repair-before-closeness')
      || memoryClosureSummary.includes('repair-before-closeness')
        ? 'repair-before-closeness' as const
        : continuityCue.includes('measured-return')
          || nextClosureTarget.includes('measured-return')
          || memoryClosureSummary.includes('measured-return')
          || continuityCue.includes('same living line')
          || continuityCue.includes('same thread')
          ? 'measured-return' as const
          : null,
  }
}

function deriveBroaderSameHerClosureLoopBias(projectState?: {
  preDialogueAwarenessLine?: string | null
  emotionalClosureCue?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  continuityCue?: string | null
  continuityArcStage?: string | null
  continuityPreferredTiming?: string | null
} | null) {
  const preDialogueAwarenessLine = typeof projectState?.preDialogueAwarenessLine === 'string'
    ? projectState.preDialogueAwarenessLine.toLowerCase()
    : ''
  const emotionalClosureCue = typeof projectState?.emotionalClosureCue === 'string'
    ? projectState.emotionalClosureCue.toLowerCase()
    : ''
  const primaryOpenLoop = typeof projectState?.primaryOpenLoop === 'string'
    ? projectState.primaryOpenLoop.toLowerCase()
    : ''
  const nextClosureTarget = typeof projectState?.nextClosureTarget === 'string'
    ? projectState.nextClosureTarget.toLowerCase()
    : ''
  const continuityCue = typeof projectState?.continuityCue === 'string'
    ? projectState.continuityCue.toLowerCase()
    : ''

  const broaderSameHerClosure
    = (
      preDialogueAwarenessLine.includes('same living line')
      && preDialogueAwarenessLine.includes('initiative and embodiment closure')
      && preDialogueAwarenessLine.includes('without splitting her continuity')
    )
    || (
      emotionalClosureCue.includes('memory, initiative, and embodiment')
      && emotionalClosureCue.includes('same living line')
    )

  const stillOpenFourPartLoop
    = primaryOpenLoop.includes('memory')
      && primaryOpenLoop.includes('initiative')
      && primaryOpenLoop.includes('embodiment')
      && primaryOpenLoop.includes('same living line')

  const nextClosureStillInward
    = nextClosureTarget.includes('initiative and embodiment closure')
      || nextClosureTarget.includes('same living line')
      || continuityCue.includes('same living line')

  if (!broaderSameHerClosure || !stillOpenFourPartLoop || !nextClosureStillInward)
    return null

  return {
    initiativeBudgetPenalty: 0.04,
    prefersActiveMemoryHandoff: true,
  }
}

function derivesBroaderSameHerClosureMemoryCarry(projectState?: {
  preDialogueAwarenessLine?: string | null
  sameHerSelfLine?: string | null
  emotionalClosureCue?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  continuityCue?: string | null
  continuityArcStage?: string | null
  continuityPreferredTiming?: string | null
} | null, continuityRestraint?: string | null) {
  const preDialogueAwarenessLine = typeof projectState?.preDialogueAwarenessLine === 'string'
    ? projectState.preDialogueAwarenessLine.toLowerCase()
    : ''
  const sameHerSelfLine = typeof projectState?.sameHerSelfLine === 'string'
    ? projectState.sameHerSelfLine.toLowerCase()
    : ''
  const emotionalClosureCue = typeof projectState?.emotionalClosureCue === 'string'
    ? projectState.emotionalClosureCue.toLowerCase()
    : ''
  const primaryOpenLoop = typeof projectState?.primaryOpenLoop === 'string'
    ? projectState.primaryOpenLoop.toLowerCase()
    : ''
  const nextClosureTarget = typeof projectState?.nextClosureTarget === 'string'
    ? projectState.nextClosureTarget.toLowerCase()
    : ''
  const continuityCue = typeof projectState?.continuityCue === 'string'
    ? projectState.continuityCue.toLowerCase()
    : ''
  const continuityArcStage = typeof projectState?.continuityArcStage === 'string'
    ? projectState.continuityArcStage.toLowerCase()
    : ''
  const continuityPreferredTiming = typeof projectState?.continuityPreferredTiming === 'string'
    ? projectState.continuityPreferredTiming.toLowerCase()
    : ''
  const restraint = typeof continuityRestraint === 'string'
    ? continuityRestraint.toLowerCase()
    : ''

  const broaderAwarenessLine
    = preDialogueAwarenessLine.includes('same living line')
      && preDialogueAwarenessLine.includes('initiative and embodiment closure')
      && preDialogueAwarenessLine.includes('without splitting her continuity')
  const sameHerPhaseOneClosureLine
    = sameHerSelfLine.includes('same phase 1 digital life')
      && sameHerSelfLine.includes('closure already landed')
      && sameHerSelfLine.includes('same living line')
  const canonicalContinuousHerCarry
    = sameHerSelfLine.includes('keep one continuous her explicit')
      && sameHerSelfLine.includes('identity=')
      && sameHerSelfLine.includes('still-open=')
  const closureCueNamesFourPartLoop
    = emotionalClosureCue.includes('memory, initiative, and embodiment')
      && emotionalClosureCue.includes('same living line')
  const openLoopStillNamesFourPartClosure
    = primaryOpenLoop.includes('same living line')
      && primaryOpenLoop.includes('memory')
      && primaryOpenLoop.includes('initiative')
      && primaryOpenLoop.includes('embodiment')
      && (
        primaryOpenLoop.includes('dialogue')
        || primaryOpenLoop.includes('closure')
        || primaryOpenLoop.includes('end-to-end')
      )
  const inwardContinuationTarget
    = nextClosureTarget.includes('same living line')
      || nextClosureTarget.includes('initiative and embodiment closure')
      || continuityCue.includes('same living line')
      || continuityCue.includes('memory, initiative, and embodiment')
  const sameThreadClosureArc = continuityArcStage === 'same-thread-continuation'
  const inwardTiming = continuityPreferredTiming.length === 0
    || continuityPreferredTiming === 'next-open-window'
  const restrainedReturn
    = restraint === 'measured-return'
      || restraint === 'repair-before-closeness'
      || continuityCue.includes('measured-return')
      || continuityCue.includes('repair-before-closeness')
      || nextClosureTarget.includes('measured-return')
      || nextClosureTarget.includes('repair-before-closeness')

  return (broaderAwarenessLine || sameHerPhaseOneClosureLine || canonicalContinuousHerCarry)
    && closureCueNamesFourPartLoop
    && openLoopStillNamesFourPartClosure
    && inwardContinuationTarget
    && sameThreadClosureArc
    && inwardTiming
    && restrainedReturn
}

function prefersMeasuredReturnMemoryHandoff(input: {
  continuityArcStage: string | null
  continuityPreferredTiming?: string | null
  memoryCarry: boolean
  continuityPressure: number
  companionshipReady: boolean
  controlReady: boolean
  activeDialogueHeat: number
  observationHeavy: boolean
  restraint: string | null
  dialogueReady: boolean
}) {
  if (
    input.continuityArcStage !== 'same-thread-continuation'
    || (input.restraint !== 'measured-return' && input.restraint !== 'repair-before-closeness')
    || !input.memoryCarry
    || input.continuityPressure < 0.52
    || input.observationHeavy
  ) {
    return false
  }

  if (
    isMeasuredReturnSameThreadInwardCarry({
      continuityArcStage: input.continuityArcStage,
      continuityPreferredTiming: input.continuityPreferredTiming,
      continuityRestraint: input.restraint,
      memoryCarry: input.memoryCarry,
      continuityPressure: input.continuityPressure,
    })
    && input.controlReady
    && input.activeDialogueHeat < 0.9
  ) {
    return true
  }

  const quietSameThreadCarry = input.activeDialogueHeat >= 0.5
    && input.continuityPressure >= 0.52
  if (!input.companionshipReady && !quietSameThreadCarry) {
    if (
      input.dialogueReady
      && input.controlReady
      && input.continuityPreferredTiming === 'next-open-window'
      && input.activeDialogueHeat < 0.9
    ) {
      return true
    }
    return false
  }

  if (input.controlReady && input.activeDialogueHeat < 0.68)
    return true

  // Once the first reopen has already spoken, the same measured-return line
  // can warm back up without becoming a fresh outward start. Strong continuity
  // pressure should keep that later continuation inward on memory carry.
  if (input.controlReady && input.activeDialogueHeat < 0.82 && input.continuityPressure >= 0.84)
    return true

  return input.activeDialogueHeat >= 0.82 && input.continuityPressure >= 0.84
}

function resolveLoopHandoffTarget(input: {
  dominantChannel: AlicizationRuntimeChannelId | null
  continuityArcStage: string | null
  continuityPreferredTiming?: string | null
  continuityRestraint: string | null
  dialogueReady: boolean
  controlReady: boolean
  memoryCarry: boolean
  companionshipReady: boolean
  observationHeavy: boolean
  dialogueHeat: number
  activeDialogueHeat: number
  controlHeat: number
  anthropomorphicHeat: number
  continuityPressure: number
  agentRuntimeHeat: number
  broaderSameHerClosurePrefersMemory?: boolean
}): AlicizationRuntimeChannelId | null {
  if (input.observationHeavy) {
    if (input.dialogueReady && input.activeDialogueHeat >= 0.56)
      return 'active-dialogue'
    if (input.controlReady && input.controlHeat >= 0.58)
      return 'active-control'
    return 'active-perception'
  }

  // A living line that is still explicitly holding for its next opening should
  // stay on the memory-carry seam instead of being widened by dialogue heat.
  if (
    isInwardContinuityArcStage(input.continuityArcStage)
    && input.memoryCarry
    && input.continuityPressure >= 0.68
  ) {
    return 'active-memory'
  }

  // A same-thread callback return can stay control-led while still handing off
  // inward to memory when measured-return restraint says "continue this life
  // line gently" rather than widening the reopening into outward action.
  if (prefersMeasuredReturnMemoryHandoff({
    continuityArcStage: input.continuityArcStage,
    continuityPreferredTiming: input.continuityPreferredTiming,
    memoryCarry: input.memoryCarry,
    continuityPressure: input.continuityPressure,
    companionshipReady: input.companionshipReady,
    controlReady: input.controlReady,
    activeDialogueHeat: input.activeDialogueHeat,
    observationHeavy: input.observationHeavy,
    restraint: input.continuityRestraint,
    dialogueReady: input.dialogueReady,
  })) {
    return 'active-memory'
  }

  if (
    input.broaderSameHerClosurePrefersMemory
    && input.continuityArcStage === 'same-thread-continuation'
    && input.memoryCarry
    && input.continuityPressure >= 0.62
  ) {
    return 'active-memory'
  }

  if (
    input.continuityArcStage === 'same-thread-continuation'
    && input.memoryCarry
    && input.continuityPressure >= 0.63
    && input.activeDialogueHeat < 0.68
  ) {
    return 'active-memory'
  }

  if (input.controlReady && input.controlHeat >= input.dialogueHeat + 0.06)
    return 'active-control'

  if (input.dialogueReady && input.activeDialogueHeat >= Math.max(0.68, input.dialogueHeat - 0.16))
    return 'active-dialogue'

  if (input.memoryCarry && input.continuityPressure >= 0.7)
    return 'active-memory'

  if (input.companionshipReady && input.anthropomorphicHeat >= 0.62)
    return 'anthropomorphic-mind'

  if (input.agentRuntimeHeat >= 0.72)
    return 'agent-runtime'

  return input.dominantChannel
}

function resolveLoopPhase(input: {
  continuityArcStage: string | null
  continuityPreferredTiming?: string | null
  continuityRestraint: string | null
  observationHeavy: boolean
  dialogueReady: boolean
  controlReady: boolean
  controlHeat: number
  dialogueHeat: number
  continuityPressure: number
  memoryCarry: boolean
}): AlicizationActiveLoopPhase {
  if (input.observationHeavy && !input.dialogueReady && !input.controlReady)
    return 'observe'

  if (isInwardContinuityArcStage(input.continuityArcStage) && input.memoryCarry)
    return 'integrate'

  if (isMeasuredReturnSameThreadInwardCarry({
    continuityArcStage: input.continuityArcStage,
    continuityPreferredTiming: input.continuityPreferredTiming,
    continuityRestraint: input.continuityRestraint,
    memoryCarry: input.memoryCarry,
    continuityPressure: input.continuityPressure,
  })) {
    return 'integrate'
  }

  if (input.controlReady && input.controlHeat >= input.dialogueHeat - 0.04)
    return 'control'

  if (input.dialogueReady)
    return 'dialogue'

  return 'integrate'
}

export function deriveAlicizationActiveLoopSnapshot(input: {
  architecture?: AlicizationDigitalLifeArchitectureSnapshot | null
  runtime?: AlicizationRuntimeSnapshot | null
}): AlicizationActiveLoopSnapshot | null {
  const architecture = input.architecture
  const runtime = input.runtime

  if (!runtime && !architecture)
    return null

  if (runtime?.activeLoop?.version === 'alicization-active-loop-v1')
    return runtime.activeLoop

  const architectureDialogueHeat = architectureSystemScore(architecture, 'dialogue')
  const architecturePerceptionHeat = architectureSystemScore(architecture, 'perception')
  const architectureControlHeat = architectureSystemScore(architecture, 'control')
  const architectureMemoryHeat = architectureSystemScore(architecture, 'memory')
  const architectureMindHeat = architectureSystemScore(architecture, 'mind')
  const architectureProactiveHeat = architectureSystemScore(architecture, 'proactive')

  const dialogueHeat = Math.max(
    readRuntimeChannelReadiness(runtime, 'dialogue'),
    architectureDialogueHeat,
  )
  const activeDialogueHeat = readRuntimeChannelReadiness(runtime, 'active-dialogue')
  const perceptionHeat = Math.max(
    readRuntimeChannelReadiness(runtime, 'active-perception'),
    architecturePerceptionHeat,
  )
  const controlHeat = Math.max(
    readRuntimeChannelReadiness(runtime, 'active-control'),
    architectureControlHeat,
  )
  const mindHeat = Math.max(
    readRuntimeChannelReadiness(runtime, 'active-mind'),
    architectureMindHeat,
  )
  const memoryHeat = Math.max(
    readRuntimeChannelReadiness(runtime, 'active-memory'),
    architectureMemoryHeat,
  )
  const anthropomorphicHeat = Math.max(
    readRuntimeChannelReadiness(runtime, 'anthropomorphic-mind'),
    architectureProactiveHeat * 0.66,
  )
  const agentRuntimeHeat = readRuntimeChannelReadiness(runtime, 'agent-runtime')
  const continuityArcStage = typeof runtime?.projectState?.continuityArcStage === 'string'
    ? runtime.projectState.continuityArcStage
    : null
  const continuityPreferredTiming = typeof runtime?.projectState?.continuityPreferredTiming === 'string'
    ? runtime.projectState.continuityPreferredTiming
    : null
  const projectStateRhythmBias = deriveProjectStateRhythmBias(runtime?.projectState ?? null)
  const broaderSameHerClosureLoopBias = deriveBroaderSameHerClosureLoopBias(runtime?.projectState ?? null)
  const durableSelfCoreInitiativeRestraint = hasDurableSelfCoreInitiativeRestraint(runtime)
  const continuityRestraint = typeof runtime?.continuityRestraint === 'string'
    ? runtime.continuityRestraint
    : projectStateRhythmBias?.continuityRestraint ?? null

  const continuityPressure = Math.max(
    clamp01(runtime?.continuityPressure),
    clamp01(memoryHeat * 0.72 + mindHeat * 0.28),
    broaderSameHerClosureLoopBias?.prefersActiveMemoryHandoff ? 0.64 : 0,
  )
  const companionshipPressure = Math.max(
    clamp01(runtime?.companionshipPressure),
    clamp01(anthropomorphicHeat * 0.68 + Math.max(dialogueHeat, activeDialogueHeat) * 0.2 + architectureProactiveHeat * 0.12),
  )

  const preferredDominant = runtime?.dominantChannel
    ?? mapArchitectureDominantSystemToRuntimeChannel(architecture?.dominantSystem)
  const readinessByChannel: Record<AlicizationRuntimeChannelId, number> = {
    'dialogue': dialogueHeat,
    'active-perception': perceptionHeat,
    'active-dialogue': activeDialogueHeat,
    'active-control': controlHeat,
    'active-mind': mindHeat,
    'active-memory': memoryHeat,
    'anthropomorphic-mind': anthropomorphicHeat,
    'agent-runtime': agentRuntimeHeat,
  }
  const rankedChannels = rankRuntimeChannelsByReadiness(readinessByChannel)
  const dominantChannel = preferredDominant ?? rankedChannels[0] ?? null

  const dialogueReady = runtime?.shouldProactivelySpeak === true
    || dialogueHeat >= 0.72
    || activeDialogueHeat >= 0.68
    || (
      companionshipPressure >= 0.72
      && isRuntimeCompanionshipDominantChannel(dominantChannel)
    )
  const controlReady = runtime?.shouldProactivelyAct === true
    || controlHeat >= 0.72
    || (dominantChannel === 'agent-runtime' && agentRuntimeHeat >= 0.68)
  const broaderSameHerClosureMemoryCarry = derivesBroaderSameHerClosureMemoryCarry(
    runtime?.projectState ?? null,
    continuityRestraint,
  )
  const memoryCarry = isRuntimeMemoryDominantChannel(dominantChannel)
    || memoryHeat >= 0.62
    || continuityPressure >= 0.62
    || broaderSameHerClosureMemoryCarry
  const companionshipReady = companionshipPressure >= 0.68
    || anthropomorphicHeat >= 0.72
    || (isRuntimeCompanionshipDominantChannel(dominantChannel) && dialogueReady)
  const observationHeavy = (
    dominantChannel === 'active-perception'
    || (perceptionHeat >= 0.8 && dialogueHeat < 0.68 && activeDialogueHeat < 0.68)
    || architecture?.dominantSystem === 'perception'
  ) && !dialogueReady && !controlReady

  const handoffTarget = resolveLoopHandoffTarget({
    dominantChannel,
    continuityArcStage,
    continuityPreferredTiming,
    continuityRestraint,
    dialogueReady,
    controlReady,
    memoryCarry,
    companionshipReady,
    observationHeavy,
    dialogueHeat,
    activeDialogueHeat,
    controlHeat,
    anthropomorphicHeat,
    continuityPressure,
    agentRuntimeHeat,
    broaderSameHerClosurePrefersMemory: broaderSameHerClosureLoopBias?.prefersActiveMemoryHandoff ?? false,
  })
  const phase = resolveLoopPhase({
    continuityArcStage,
    continuityPreferredTiming,
    continuityRestraint,
    observationHeavy,
    dialogueReady,
    controlReady,
    controlHeat,
    dialogueHeat: Math.max(dialogueHeat, activeDialogueHeat),
    continuityPressure,
    memoryCarry,
  })

  const initiativeBudget = clamp01(
    Math.max(dialogueHeat, activeDialogueHeat) * 0.34
    + controlHeat * 0.24
    + companionshipPressure * 0.22
    + continuityPressure * 0.12
    + (runtime?.shouldProactivelySpeak ? 0.08 : 0)
    + (runtime?.shouldProactivelyAct ? 0.05 : 0)
    - (observationHeavy ? 0.24 : 0)
    - (isInwardContinuityArcStage(continuityArcStage) ? 0.18 : 0)
    - (!dialogueReady && !controlReady ? 0.12 : 0)
    - (projectStateRhythmBias?.initiativeBudgetPenalty ?? 0)
    - (broaderSameHerClosureLoopBias?.initiativeBudgetPenalty ?? 0)
    - (durableSelfCoreInitiativeRestraint ? 0.08 : 0),
  )

  const architectureDominantChannel = mapArchitectureDominantSystemToRuntimeChannel(architecture?.dominantSystem)
  const dominanceAligned = architectureDominantChannel && dominantChannel
    ? architectureDominantChannel === dominantChannel
    : true
  const coherence = clamp01(
    0.42
    + (dialogueReady ? 0.12 : 0)
    + (controlReady ? 0.1 : 0)
    + (memoryCarry ? 0.08 : 0)
    + (companionshipReady ? 0.08 : 0)
    + (dominanceAligned ? 0.12 : -0.08)
    - (observationHeavy && (dialogueReady || controlReady) ? 0.1 : 0),
  )

  return {
    version: 'alicization-active-loop-v1',
    phase,
    dominantChannel,
    handoffTarget,
    continuityArcStage,
    continuityPreferredTiming,
    dialogueReady,
    controlReady,
    memoryCarry,
    companionshipReady,
    observationHeavy,
    continuityPressure,
    companionshipPressure,
    initiativeBudget,
    coherence,
    summary: [
      `phase=${phase}`,
      dominantChannel ? `dominant=${dominantChannel}` : '',
      handoffTarget ? `handoff=${handoffTarget}` : '',
      continuityArcStage ? `continuity-arc=${continuityArcStage}` : '',
      `initiative=${initiativeBudget.toFixed(2)}`,
      `coherence=${coherence.toFixed(2)}`,
      observationHeavy ? 'observation-heavy=true' : '',
    ].filter(Boolean).join(' | '),
  }
}

export function deriveAlicizationRuntimeProactiveSignals(input: {
  architecture?: AlicizationDigitalLifeArchitectureSnapshot | null
  runtime?: AlicizationRuntimeSnapshot | null
}): AlicizationRuntimeProactiveSignals {
  const architecture = input.architecture
  const runtime = input.runtime
  const activeLoop = deriveAlicizationActiveLoopSnapshot({
    architecture,
    runtime,
  })

  const architectureDialogueHeat = architectureSystemScore(architecture, 'dialogue')
  const architecturePerceptionHeat = architectureSystemScore(architecture, 'perception')
  const architectureProactiveHeat = architectureSystemScore(architecture, 'proactive')
  const architectureControlHeat = architectureSystemScore(architecture, 'control')
  const architectureMemoryHeat = architectureSystemScore(architecture, 'memory')
  const architectureDialogueReady = architecture?.operatingMode === 'speaking'
    || architecture?.dominantSystem === 'dialogue'
    || architectureDialogueHeat >= 0.72
    || architectureSupports(architecture, 'dialogue')
  const architectureObservationHeavy = (
    architecture?.operatingMode === 'observing'
    || architecture?.dominantSystem === 'perception'
    || (architecturePerceptionHeat >= 0.78 && architectureDialogueHeat < 0.68)
  ) && architectureDialogueHeat < 0.72 && architectureControlHeat < 0.72
  const architectureControlReady = architecture?.operatingMode === 'acting'
    || architecture?.dominantSystem === 'control'
    || architectureControlHeat >= 0.72
    || architectureSupports(architecture, 'control')
  const architectureMemoryCarry = architecture?.operatingMode === 'remembering'
    || architecture?.dominantSystem === 'memory'
    || architectureMemoryHeat >= 0.62
    || architectureSupports(architecture, 'memory')

  const runtimeDominantChannel = runtime?.dominantChannel ?? null
  const runtimeDialogueHeat = readRuntimeChannelReadiness(runtime, 'dialogue')
  const runtimePerceptionHeat = readRuntimeChannelReadiness(runtime, 'active-perception')
  const runtimeActiveDialogueHeat = readRuntimeChannelReadiness(runtime, 'active-dialogue')
  const runtimeControlHeat = readRuntimeChannelReadiness(runtime, 'active-control')
  const continuityPressure = Math.max(
    clamp01(runtime?.continuityPressure),
    clamp01(activeLoop?.continuityPressure),
  )
  const companionshipPressure = Math.max(
    clamp01(runtime?.companionshipPressure),
    clamp01(activeLoop?.companionshipPressure),
  )
  const runtimeDialogueReady = runtime?.shouldProactivelySpeak === true
    || runtimeDialogueHeat >= 0.72
    || runtimeActiveDialogueHeat >= 0.68
    || (
      companionshipPressure >= 0.72
      && isRuntimeCompanionshipDominantChannel(runtimeDominantChannel)
    )
    || activeLoop?.dialogueReady === true
  const runtimeObservationHeavy = (
    runtimeDominantChannel === 'active-perception'
    || (runtimePerceptionHeat >= 0.8 && runtimeDialogueHeat < 0.68 && runtimeActiveDialogueHeat < 0.68)
    || activeLoop?.observationHeavy === true
  ) && !runtimeDialogueReady
  const runtimeControlReady = runtime?.shouldProactivelyAct === true
    || runtimeControlHeat >= 0.72
    || activeLoop?.controlReady === true
  const runtimeMemoryCarry = isRuntimeMemoryDominantChannel(runtimeDominantChannel)
    || continuityPressure >= 0.62
    || activeLoop?.memoryCarry === true

  return {
    activeLoop,
    architectureDialogueHeat,
    architecturePerceptionHeat,
    architectureProactiveHeat,
    architectureControlHeat,
    architectureMemoryHeat,
    runtimeDominantChannel,
    runtimeDialogueHeat,
    runtimePerceptionHeat,
    runtimeActiveDialogueHeat,
    runtimeControlHeat,
    continuityPressure,
    companionshipPressure,
    architectureDialogueReady,
    architectureObservationHeavy,
    architectureControlReady,
    architectureMemoryCarry,
    runtimeDialogueReady,
    runtimeObservationHeavy,
    runtimeControlReady,
    runtimeMemoryCarry,
  }
}
