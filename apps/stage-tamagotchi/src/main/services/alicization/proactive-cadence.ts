import type {
  AlicizationActionEcologySnapshot,
  AlicizationAutonomySnapshot,
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationInitiativeSnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationThoughtThreadStateSnapshot,
  AlicizationThreadRuntimeStateSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLoopState } from './proactive-feedback'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'
import type { AlicizationPersonalityContinuityStateSnapshot } from './personality-continuity-state'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 120) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function foregroundThoughtThread(thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null) {
  return thoughtThreads?.threads.find(thread => thread.id === thoughtThreads.foregroundThreadId)
    ?? thoughtThreads?.threads[0]
    ?? null
}

function foregroundRuntimeThread(threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null) {
  return threadRuntime?.threads.find(thread => thread.id === threadRuntime.foregroundThreadId)
    ?? threadRuntime?.threads[0]
    ?? null
}

function hostBusy(context: AlicizationProactiveLayeredContext, worldModel?: AlicizationWorldModelSnapshot | null) {
  return context.system.inputActivity === 'active'
    || context.system.fullscreenLikely
    || context.system.cpuUsage >= 70
    || worldModel?.hostState.availability === 'focused'
    || worldModel?.hostState.availability === 'immersed'
}

export interface AlicizationProactiveCadenceSignal {
  cadencePressure: number
  openingMomentum: number
  initiativeTrust: number
  residueDominance: string | null
  reasonTags: string[]
}

export function progressProactiveCadenceState(input: {
  state: AlicizationProactiveLoopState
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel?: AlicizationWorldModelSnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
  autonomy?: AlicizationAutonomySnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  actionEcology?: AlicizationActionEcologySnapshot | null
  personalityContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
}) {
  const busy = hostBusy(input.context, input.worldModel ?? null)
  const runtimeThread = foregroundRuntimeThread(input.threadRuntime ?? null)
  const thoughtThread = foregroundThoughtThread(input.thoughtThreads ?? null)
  const minutesSinceLastUserTurn = input.context.relationship.minutesSinceLastUserTurn
  const recentProactiveGapMinutes = typeof input.state.lastProactiveTurnAt === 'number'
    ? Math.max(0, (input.now - input.state.lastProactiveTurnAt) / 60_000)
    : Number.POSITIVE_INFINITY
  const rhythmState = input.personalityContinuityState?.rhythmState ?? null
  const affectiveResidue = input.affectiveResidue ?? null
  const cadenceMemory = affectiveResidue?.relationshipCadence ?? null
  const targetMomentum = clamp01(
    (busy ? 0 : 0.18)
    + (minutesSinceLastUserTurn >= 4 && minutesSinceLastUserTurn <= 45 ? 0.16 : minutesSinceLastUserTurn > 45 ? 0.08 : 0)
    + (input.privateThought?.shouldSpeak ? 0.08 : 0)
    + (input.initiative?.shouldSpeak ? 0.08 : 0)
    + (input.autonomy?.shouldSpeak ? 0.1 : 0)
    + ((input.motiveEngine?.drives.companionship ?? 0) * 0.18)
    + ((input.motiveEngine?.drives.selfDirection ?? 0) * 0.16)
    + ((input.motiveEngine?.returnPressure ?? 0) * 0.12)
    + ((input.actionEcology?.surfacePressure ?? 0) * 0.14)
    + (runtimeThread ? Math.max(runtimeThread.salience, runtimeThread.continuity) * 0.12 : 0)
    + (thoughtThread?.status === 'ripe' ? 0.12 : thoughtThread?.status === 'waiting' ? 0.04 : 0)
    + (sanitizeText(input.privateThought?.thoughtText) ? 0.06 : 0)
    + (input.worldModel?.continuity.afterglowOpen ? 0.08 : 0)
    + (input.context.relationship.loneliness >= 72 ? 0.08 : 0)
    + (input.context.relationship.boredom >= 72 ? 0.08 : 0)
    + (rhythmState?.cadenceMode === 'ready-return' ? 0.08 : rhythmState?.cadenceMode === 'warm-hold' ? 0.04 : 0)
    + (rhythmState?.memoryResonance ?? 0) * 0.08
    + (cadenceMemory?.afterglowCarry ?? 0) * 0.06
    - (input.state.globalCooldownUntil > input.now ? 0.18 : 0)
    - (busy ? 0.34 : 0)
    - (rhythmState?.restMode === 'rest-protective' ? 0.16 : rhythmState?.restMode === 'low-pressure' ? 0.06 : 0)
    - (cadenceMemory?.fatigueGuard ?? 0) * 0.12
    - (cadenceMemory?.overreachRisk ?? 0) * 0.12
    - (input.actionEcology?.mode === 'repair-before-speaking' ? 0.16 : 0)
    - (input.actionEcology?.mode === 'return-later' ? 0.12 : 0)
    - (recentProactiveGapMinutes < 6 ? 0.18 : recentProactiveGapMinutes < 12 ? 0.08 : 0),
  )
  const initiativeTrust = clamp01(
    input.state.initiativeTrust * 0.98
    + 0.01
    + (rhythmState?.cadenceMode === 'ready-return' ? 0.02 : 0)
    + (rhythmState?.memoryResonance ?? 0) * 0.02
    + ((affectiveResidue?.trustPressure ?? 0) * 0.03)
    - (rhythmState?.restMode === 'rest-protective' ? 0.03 : 0),
  )
  const openingMomentum = clamp01(
    input.state.openingMomentum * (busy ? 0.52 : 0.74)
    + targetMomentum * (busy ? 0.18 : 0.26),
  )

  return {
    ...input.state,
    initiativeTrust,
    openingMomentum,
    updatedAt: input.now,
  } satisfies AlicizationProactiveLoopState
}

export function deriveProactiveCadenceSignal(input: {
  state: AlicizationProactiveLoopState
  context: AlicizationProactiveLayeredContext
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
  autonomy?: AlicizationAutonomySnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  actionEcology?: AlicizationActionEcologySnapshot | null
  personalityContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
}) {
  const runtimeThread = foregroundRuntimeThread(input.threadRuntime ?? null)
  const thoughtThread = foregroundThoughtThread(input.thoughtThreads ?? null)
  const rhythmState = input.personalityContinuityState?.rhythmState ?? null
  const affectiveResidue = input.affectiveResidue ?? null
  const cadenceMemory = affectiveResidue?.relationshipCadence ?? null
  const cadencePressure = clamp01(
    input.state.openingMomentum * 0.58
    + input.state.initiativeTrust * 0.18
    + ((input.motiveEngine?.drives.companionship ?? 0) * 0.08)
    + ((input.motiveEngine?.drives.selfDirection ?? 0) * 0.08)
    + (input.privateThought?.shouldSpeak ? 0.04 : 0)
    + (input.initiative?.shouldSpeak ? 0.04 : 0)
    + (input.autonomy?.shouldSpeak ? 0.06 : 0)
    + (input.actionEcology?.mode === 'quiet-accompany' ? 0.05 : 0)
    + (runtimeThread ? Math.max(runtimeThread.salience, runtimeThread.continuity) * 0.08 : 0)
    + (thoughtThread?.status === 'ripe' ? 0.08 : 0)
    + (rhythmState?.cadenceMode === 'ready-return' ? 0.06 : rhythmState?.cadenceMode === 'warm-hold' ? 0.03 : 0)
    + (rhythmState?.memoryResonance ?? 0) * 0.08
    + ((affectiveResidue?.trustPressure ?? 0) * 0.08)
    + ((cadenceMemory?.companionshipDensity ?? 0) * 0.06)
    - (input.context.system.inputActivity === 'active' ? 0.16 : 0)
    - (input.context.system.fullscreenLikely ? 0.14 : 0),
  ) - (rhythmState?.restMode === 'rest-protective' ? 0.12 : rhythmState?.restMode === 'low-pressure' ? 0.04 : 0)
    - ((cadenceMemory?.fatigueGuard ?? 0) * 0.12)
    - ((cadenceMemory?.overreachRisk ?? 0) * 0.1)

  const normalizedCadencePressure = clamp01(
    cadencePressure,
  )

  return {
    cadencePressure: normalizedCadencePressure,
    openingMomentum: input.state.openingMomentum,
    initiativeTrust: input.state.initiativeTrust,
    residueDominance: affectiveResidue?.dominantResidueKind ?? null,
    reasonTags: [
      `cadence-pressure:${normalizedCadencePressure.toFixed(2)}`,
      `opening-momentum:${input.state.openingMomentum.toFixed(2)}`,
      `initiative-trust:${input.state.initiativeTrust.toFixed(2)}`,
      ...(affectiveResidue?.dominantResidueKind
        ? [`residue:${affectiveResidue.dominantResidueKind}`]
        : []),
      ...(cadenceMemory?.shouldDelayWarmth ? ['residue-delay-warmth'] : []),
      ...(cadenceMemory?.shouldProtectRest ? ['residue-protect-rest'] : []),
      ...(rhythmState
        ? [
            `rhythm-cadence:${rhythmState.cadenceMode}`,
            `rhythm-rest:${rhythmState.restMode}`,
            `rhythm-presence:${rhythmState.embodiedPresence ?? 'none'}`,
          ]
        : []),
    ],
  } satisfies AlicizationProactiveCadenceSignal
}
