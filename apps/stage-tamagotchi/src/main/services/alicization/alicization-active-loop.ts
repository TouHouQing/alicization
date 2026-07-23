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

function resolveLoopPhase(input: {
  dominantChannel: AlicizationRuntimeChannelId | null
  dialogueReady: boolean
  controlReady: boolean
  memoryCarry: boolean
  observationHeavy: boolean
  dialogueHeat: number
  activeDialogueHeat: number
  controlHeat: number
}) {
  const visibleDialogueHeat = Math.max(input.dialogueHeat, input.activeDialogueHeat)
  if (
    input.controlReady
    && (
      input.dominantChannel === 'active-control'
      || input.dominantChannel === 'agent-runtime'
      || input.controlHeat >= visibleDialogueHeat - 0.02
    )
  ) {
    return 'control' as const
  }
  if (input.observationHeavy)
    return 'observe' as const
  if (input.dialogueReady)
    return 'dialogue' as const
  if (input.memoryCarry)
    return 'integrate' as const
  return 'observe' as const
}

function resolveLoopHandoffTarget(input: {
  phase: AlicizationActiveLoopPhase
  dominantChannel: AlicizationRuntimeChannelId | null
  activeDialogueHeat: number
  controlHeat: number
  agentRuntimeHeat: number
}) {
  if (input.phase === 'control') {
    return input.dominantChannel === 'agent-runtime' && input.agentRuntimeHeat >= input.controlHeat
      ? 'agent-runtime' as const
      : 'active-control' as const
  }
  if (input.phase === 'dialogue') {
    return input.activeDialogueHeat >= 0.68
      ? 'active-dialogue' as const
      : 'dialogue' as const
  }
  if (input.phase === 'integrate')
    return 'active-memory' as const
  return input.dominantChannel === 'active-perception'
    ? 'active-perception' as const
    : input.dominantChannel
}

export function deriveAlicizationActiveLoopSnapshot(input: {
  architecture?: AlicizationDigitalLifeArchitectureSnapshot | null
  runtime?: AlicizationRuntimeSnapshot | null
}): AlicizationActiveLoopSnapshot | null {
  const architecture = input.architecture ?? null
  const runtime = input.runtime ?? null
  if (!architecture && !runtime)
    return null

  const architectureDialogueHeat = architectureSystemScore(architecture, 'dialogue')
  const architecturePerceptionHeat = architectureSystemScore(architecture, 'perception')
  const architectureControlHeat = architectureSystemScore(architecture, 'control')
  const architectureMemoryHeat = architectureSystemScore(architecture, 'memory')
  const architectureMindHeat = architectureSystemScore(architecture, 'mind')
  const architectureProactiveHeat = architectureSystemScore(architecture, 'proactive')

  const runtimeDialogueHeat = readRuntimeChannelReadiness(runtime, 'dialogue')
  const runtimeActiveDialogueHeat = readRuntimeChannelReadiness(runtime, 'active-dialogue')
  const runtimePerceptionHeat = readRuntimeChannelReadiness(runtime, 'active-perception')
  const runtimeControlHeat = readRuntimeChannelReadiness(runtime, 'active-control')
  const runtimeMindHeat = readRuntimeChannelReadiness(runtime, 'active-mind')
  const runtimeMemoryHeat = readRuntimeChannelReadiness(runtime, 'active-memory')
  const runtimeAnthropomorphicHeat = readRuntimeChannelReadiness(runtime, 'anthropomorphic-mind')
  const agentRuntimeHeat = readRuntimeChannelReadiness(runtime, 'agent-runtime')

  const dialogueHeat = runtime
    ? runtimeDialogueHeat
    : architectureDialogueHeat
  const activeDialogueHeat = runtime
    ? runtimeActiveDialogueHeat
    : architectureProactiveHeat
  const perceptionHeat = runtime
    ? runtimePerceptionHeat
    : architecturePerceptionHeat
  const controlHeat = runtime
    ? runtimeControlHeat
    : architectureControlHeat
  const mindHeat = runtime
    ? runtimeMindHeat
    : architectureMindHeat
  const memoryHeat = runtime
    ? runtimeMemoryHeat
    : architectureMemoryHeat
  const anthropomorphicHeat = runtime
    ? runtimeAnthropomorphicHeat
    : architectureProactiveHeat * 0.66

  const continuityPressure = Math.max(
    clamp01(runtime?.continuityPressure),
    clamp01(memoryHeat * 0.72 + mindHeat * 0.28),
  )
  const companionshipPressure = Math.max(
    clamp01(runtime?.companionshipPressure),
    clamp01(
      anthropomorphicHeat * 0.68
      + Math.max(dialogueHeat, activeDialogueHeat) * 0.2
      + architectureProactiveHeat * 0.12,
    ),
  )

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
  const dominantChannel = runtime?.dominantChannel
    ?? mapArchitectureDominantSystemToRuntimeChannel(architecture?.dominantSystem)
    ?? rankRuntimeChannelsByReadiness(readinessByChannel)[0]
    ?? null

  const dialogueReady = runtime
    ? (
        runtime.shouldProactivelySpeak === true
        || dialogueHeat >= 0.72
        || activeDialogueHeat >= 0.68
      )
    : (
        architecture?.operatingMode === 'speaking'
        || architecture?.dominantSystem === 'dialogue'
        || architectureDialogueHeat >= 0.72
        || architectureSupports(architecture, 'dialogue')
      )
  const controlReady = runtime
    ? (
        runtime.shouldProactivelyAct === true
        || controlHeat >= 0.72
        || (dominantChannel === 'agent-runtime' && agentRuntimeHeat >= 0.68)
      )
    : (
        architecture?.operatingMode === 'acting'
        || architecture?.dominantSystem === 'control'
        || architectureControlHeat >= 0.72
        || architectureSupports(architecture, 'control')
      )
  const memoryCarry = isRuntimeMemoryDominantChannel(dominantChannel)
    || memoryHeat >= 0.62
    || continuityPressure >= 0.62
    || (!runtime && (
      architecture?.operatingMode === 'remembering'
      || architecture?.dominantSystem === 'memory'
      || architectureSupports(architecture, 'memory')
    ))
  const companionshipReady = companionshipPressure >= 0.68
    || anthropomorphicHeat >= 0.72
    || (isRuntimeCompanionshipDominantChannel(dominantChannel) && dialogueReady)
  const observationHeavy = (
    dominantChannel === 'active-perception'
    || (perceptionHeat >= 0.8 && dialogueHeat < 0.68 && activeDialogueHeat < 0.68)
    || (!runtime && architecture?.dominantSystem === 'perception')
  ) && !dialogueReady && !controlReady

  const phase = resolveLoopPhase({
    dominantChannel,
    dialogueReady,
    controlReady,
    memoryCarry,
    observationHeavy,
    dialogueHeat,
    activeDialogueHeat,
    controlHeat,
  })
  const handoffTarget = resolveLoopHandoffTarget({
    phase,
    dominantChannel,
    activeDialogueHeat,
    controlHeat,
    agentRuntimeHeat,
  })

  const initiativeBudget = clamp01(
    Math.max(dialogueHeat, activeDialogueHeat) * 0.34
    + controlHeat * 0.24
    + companionshipPressure * 0.22
    + continuityPressure * 0.12
    + (runtime?.shouldProactivelySpeak ? 0.08 : 0)
    + (runtime?.shouldProactivelyAct ? 0.05 : 0)
    - (observationHeavy ? 0.24 : 0)
    - (!dialogueReady && !controlReady ? 0.12 : 0),
  )

  const architectureDominantChannel = mapArchitectureDominantSystemToRuntimeChannel(
    architecture?.dominantSystem,
  )
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
  const architecture = input.architecture ?? null
  const runtime = input.runtime ?? null
  const activeLoop = deriveAlicizationActiveLoopSnapshot({ architecture, runtime })

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
