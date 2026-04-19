import type { AlicizationRuntimeDigest } from '../../../shared/eventa'
import type { AlicizationActiveLoopSnapshot } from './alicization-active-loop'
import type { AlicizationDigitalLifeSpineSnapshot } from './digital-life-spine'

import { deriveAlicizationActiveLoopSnapshot } from './alicization-active-loop'

export type AlicizationRuntimeChannelId
  = | 'dialogue'
    | 'active-perception'
    | 'active-dialogue'
    | 'active-control'
    | 'active-mind'
    | 'active-memory'
    | 'anthropomorphic-mind'
    | 'agent-runtime'

export type AlicizationRuntimeChannelState = 'hot' | 'warm' | 'idle'

export interface AlicizationRuntimeChannelSnapshot {
  id: AlicizationRuntimeChannelId
  state: AlicizationRuntimeChannelState
  readiness: number
  focus: string | null
  summary: string
}

export interface AlicizationAgentRuntimeTelemetry {
  pendingTasks: number
  completedTasks: number
  failedTasks: number
  continuitySignals: number
  sensoryCaptureHealthy: boolean | null
}

export interface AlicizationRuntimeAutonomySnapshot {
  selectedMode: string | null
  visibleAction: string | null
  shouldSpeak: boolean
  shouldAct: boolean
  speakReadiness: number
  actReadiness: number
  inhibition: number
  confidence: number
  executionIntentKind: string | null
  executionIntentSummary: string | null
  deferReason: string | null
  whyNow: string | null
}

export interface AlicizationRuntimeSnapshot {
  version: 'alicization-runtime-v1'
  dominantChannel: AlicizationRuntimeChannelId
  channels: Record<AlicizationRuntimeChannelId, AlicizationRuntimeChannelSnapshot>
  activeLoop?: AlicizationActiveLoopSnapshot | null
  autonomy?: AlicizationRuntimeAutonomySnapshot | null
  shouldProactivelySpeak: boolean
  shouldProactivelyAct: boolean
  continuityPressure: number
  companionshipPressure: number
  rulingMotive?: string | null
  habitMode?: string | null
  truthDisciplinePressure?: number | null
  boundaryPressure?: number | null
  restProtectionPressure?: number | null
  returnPressure?: number | null
  summary: string
}

export interface AlicizationRuntimeSessionSnapshot {
  tasks?: Array<{
    status?: unknown
  }>
  continuitySignals?: unknown[]
  lastSensorySnapshot?: {
    capture?: {
      health?: unknown
    } | null
  } | null
}

function clamp01(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value)))
}

function sanitizeText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function firstNonEmptyText(...values: unknown[]) {
  for (const value of values) {
    const text = sanitizeText(value)
    if (text)
      return text
  }
  return ''
}

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : []
}

function toChannelState(readiness: number): AlicizationRuntimeChannelState {
  if (readiness >= 0.72)
    return 'hot'
  if (readiness >= 0.38)
    return 'warm'
  return 'idle'
}

function formatChannelState(state: AlicizationRuntimeChannelState) {
  if (state === 'hot')
    return 'HOT'
  if (state === 'warm')
    return 'WARM'
  return 'IDLE'
}

function pickFocusBelief(spine: AlicizationDigitalLifeSpineSnapshot) {
  const surface = spine.runtimeSurface
  const beliefs = asArray(surface.cognition.beliefLedger?.beliefs)
  return beliefs.find(
    belief => belief.id === surface.cognition.beliefLedger?.focusBeliefId,
  ) ?? beliefs[0] ?? null
}

function pickLeadingGoal(spine: AlicizationDigitalLifeSpineSnapshot) {
  const surface = spine.runtimeSurface
  const goals = asArray(surface.memory.goalStack?.alicizationGoals)
  return goals.find(
    goal => goal.id === surface.memory.goalStack?.leadingAlicizationGoalId,
  ) ?? goals[0] ?? null
}

function pickDominantConcern(spine: AlicizationDigitalLifeSpineSnapshot) {
  const concerns = asArray(spine.runtimeSurface.memory.concerns)
  return concerns[0] ?? null
}

function pickForegroundRuntimeThread(spine: AlicizationDigitalLifeSpineSnapshot) {
  const runtime = spine.runtimeSurface.memory.threadRuntime
  const threads = asArray(runtime?.threads)
  return threads.find(thread => thread.id === runtime?.foregroundThreadId)
    ?? threads[0]
    ?? null
}

function buildDialogueChannel(spine: AlicizationDigitalLifeSpineSnapshot): AlicizationRuntimeChannelSnapshot {
  const surface = spine.runtimeSurface
  const encounter = surface.dialogue.dialogueEncounter
  const answerPlanner = surface.dialogue.answerPlanner
  const replyDeliberation = surface.dialogue.replyDeliberation
  const readiness = clamp01(Math.max(
    encounter?.confidence ?? 0,
    answerPlanner?.confidence ?? 0,
    replyDeliberation?.confidence ?? 0,
    replyDeliberation?.shouldSpeak ? 0.84 : 0,
  ))
  const focus = firstNonEmptyText(
    answerPlanner?.governingFocus,
    answerPlanner?.answerIntent,
    encounter?.summary,
  ) || null

  return {
    id: 'dialogue',
    state: toChannelState(readiness),
    readiness,
    focus,
    summary: [
      answerPlanner?.answerIntent ? `intent=${sanitizeText(answerPlanner.answerIntent, 48)}` : '',
      replyDeliberation ? `speak=${replyDeliberation.shouldSpeak ? 'true' : 'false'}` : '',
      encounter?.subject ? `subject=${encounter.subject}` : '',
      focus ? `focus=${sanitizeText(focus, 72)}` : '',
    ].filter(Boolean).join(' | '),
  }
}

function buildActivePerceptionChannel(spine: AlicizationDigitalLifeSpineSnapshot): AlicizationRuntimeChannelSnapshot {
  const surface = spine.runtimeSurface
  const scene = surface.perception.currentScene
  const attention = surface.perception.attention
  const capture = surface.perception.captureState
  const captureSignal = capture?.permission === 'granted' && capture.health === 'healthy'
    ? 0.82
    : capture?.permission === 'granted'
      ? 0.62
      : capture?.permission === 'prompt'
        ? 0.44
        : capture?.health === 'degraded'
          ? 0.3
          : 0.16
  const readiness = clamp01(Math.max(
    scene?.confidence ?? 0,
    attention?.confidence ?? 0,
    captureSignal,
    surface.perception.watchMode === 'symbiotic-vision'
      ? 0.66
      : surface.perception.watchMode === 'invited-inspection'
        ? 0.7
        : 0.3,
  ))
  const focus = firstNonEmptyText(
    scene?.summary,
    attention?.target?.title,
    attention?.target?.appName,
    scene?.scenario,
  ) || null

  return {
    id: 'active-perception',
    state: toChannelState(readiness),
    readiness,
    focus,
    summary: [
      `watch=${surface.perception.watchMode}`,
      scene?.scenario ? `scene=${sanitizeText(scene.scenario, 48)}` : '',
      capture ? `capture=${capture.permission}/${capture.health}` : 'capture=unknown',
      focus ? `focus=${sanitizeText(focus, 72)}` : '',
    ].filter(Boolean).join(' | '),
  }
}

function buildActiveDialogueChannel(spine: AlicizationDigitalLifeSpineSnapshot): AlicizationRuntimeChannelSnapshot {
  const surface = spine.runtimeSurface
  const initiative = surface.agency.initiative
  const privateThought = surface.cognition.privateThought
  const concern = pickDominantConcern(spine)
  const relationshipModel = surface.world.relationshipModel
  const readiness = clamp01(Math.max(
    privateThought?.shouldSpeak ? privateThought.confidence : 0,
    initiative?.shouldSpeak ? Math.max(initiative.confidence, initiative.speakDrive ?? 0) : 0,
    concern ? Math.max(concern.tension, concern.careWeight) * 0.86 : 0,
    relationshipModel?.climate === 'attuned' ? 0.62 : relationshipModel?.climate === 'guarded' ? 0.28 : 0.42,
  ))
  const focus = firstNonEmptyText(
    privateThought?.thoughtText,
    initiative?.why,
    concern?.summary,
  ) || null

  return {
    id: 'active-dialogue',
    state: toChannelState(readiness),
    readiness,
    focus,
    summary: [
      initiative?.selectedAction ? `action=${initiative.selectedAction}` : '',
      initiative?.preferredStyle ? `style=${initiative.preferredStyle}` : '',
      privateThought?.stance ? `stance=${privateThought.stance}` : '',
      concern?.summary ? `concern=${sanitizeText(concern.summary, 72)}` : '',
      focus ? `focus=${sanitizeText(focus, 72)}` : '',
    ].filter(Boolean).join(' | '),
  }
}

function buildActiveControlChannel(spine: AlicizationDigitalLifeSpineSnapshot): AlicizationRuntimeChannelSnapshot {
  const surface = spine.runtimeSurface
  const initiative = surface.agency.initiative
  const autonomy = surface.agency.autonomy
  const actionEcology = surface.agency.actionEcology
  const deliberationState = surface.agency.deliberationState
  const runtimeThread = pickForegroundRuntimeThread(spine)
  const selectedAction = sanitizeText(initiative?.selectedAction, 32)
  const autonomyMode = sanitizeText(autonomy?.selectedMode, 32)
  const autonomyActioning = autonomyMode === 'prepare-act' || autonomyMode === 'act'
  const readiness = clamp01(Math.max(
    actionEcology?.readiness ?? 0,
    deliberationState?.readiness ?? 0,
    autonomyActioning
      ? Math.max(
          autonomy?.actReadiness ?? 0,
          autonomy?.confidence ?? 0,
          autonomy?.shouldAct ? 0.92 : 0.74,
        )
      : 0,
    selectedAction && selectedAction !== 'wait' && selectedAction !== 'hover'
      ? initiative?.confidence ?? 0
      : 0,
    runtimeThread ? 0.56 : 0,
  ))
  const focus = firstNonEmptyText(
    autonomy?.executionIntent?.summary,
    autonomy?.whyNow,
    actionEcology?.why,
    runtimeThread?.summary,
    initiative?.why,
  ) || null

  return {
    id: 'active-control',
    state: toChannelState(readiness),
    readiness,
    focus,
    summary: [
      autonomyMode ? `autonomy=${autonomyMode}` : '',
      selectedAction ? `action=${selectedAction}` : '',
      autonomy?.executionIntent?.kind ? `intent=${sanitizeText(autonomy.executionIntent.kind, 48)}` : '',
      actionEcology?.mode ? `ecology=${actionEcology.mode}` : '',
      runtimeThread ? `thread=${sanitizeText(runtimeThread.need, 56)}` : '',
      actionEcology ? `surface=${actionEcology.shouldSurface ? 'true' : 'false'}` : '',
      focus ? `focus=${sanitizeText(focus, 72)}` : '',
    ].filter(Boolean).join(' | '),
  }
}

function buildRuntimeAutonomySnapshot(
  spine: AlicizationDigitalLifeSpineSnapshot,
): AlicizationRuntimeAutonomySnapshot | null {
  const autonomy = spine.runtimeSurface.agency.autonomy ?? null
  if (!autonomy)
    return null

  return {
    selectedMode: sanitizeText(autonomy.selectedMode, 48) || null,
    visibleAction: sanitizeText(autonomy.visibleAction, 48) || null,
    shouldSpeak: autonomy.shouldSpeak === true,
    shouldAct: autonomy.shouldAct === true,
    speakReadiness: clamp01(autonomy.speakReadiness),
    actReadiness: clamp01(autonomy.actReadiness),
    inhibition: clamp01(autonomy.inhibition),
    confidence: clamp01(autonomy.confidence),
    executionIntentKind: sanitizeText(autonomy.executionIntent?.kind, 48) || null,
    executionIntentSummary: sanitizeText(autonomy.executionIntent?.summary, 220) || null,
    deferReason: sanitizeText(autonomy.deferReason, 160) || null,
    whyNow: sanitizeText(autonomy.whyNow, 220) || null,
  }
}

function buildActiveMindChannel(spine: AlicizationDigitalLifeSpineSnapshot): AlicizationRuntimeChannelSnapshot {
  const surface = spine.runtimeSurface
  const activeThread = surface.world.worldModel?.activeThread
  const subjectiveInference = surface.cognition.subjectiveInference
  const mindKernel = surface.cognition.mindKernel
  const focusBelief = pickFocusBelief(spine)
  const readiness = clamp01(Math.max(
    activeThread ? Math.max(activeThread.significance, activeThread.confidence) : 0,
    subjectiveInference?.confidence ?? 0,
    focusBelief ? Math.max(focusBelief.confidence, focusBelief.salience) : 0,
    mindKernel
      ? Math.max(
          mindKernel.worldPressure,
          mindKernel.epistemicPressure,
          mindKernel.relationalPressure,
          mindKernel.speakReadiness,
        )
      : 0,
  ))
  const focus = firstNonEmptyText(
    activeThread?.summary,
    subjectiveInference?.dominantInterpretation,
    focusBelief?.statement,
    mindKernel?.narrative?.[0],
  ) || null

  return {
    id: 'active-mind',
    state: toChannelState(readiness),
    readiness,
    focus,
    summary: [
      mindKernel?.dominantMode ? `mode=${mindKernel.dominantMode}` : '',
      mindKernel?.dominantDrive ? `drive=${mindKernel.dominantDrive}` : '',
      activeThread ? `thread=${sanitizeText(activeThread.title, 64)}` : '',
      focus ? `focus=${sanitizeText(focus, 72)}` : '',
    ].filter(Boolean).join(' | '),
  }
}

function buildActiveMemoryChannel(spine: AlicizationDigitalLifeSpineSnapshot): AlicizationRuntimeChannelSnapshot {
  const surface = spine.runtimeSurface
  const leadingGoal = pickLeadingGoal(spine)
  const concern = pickDominantConcern(spine)
  const reflectionCount = surface.memory.reflectionLedger?.entries.length ?? 0
  const recallGovernor = surface.memory.recallGovernor
  const workingMemoryEpisodes = asArray(surface.memory.workingMemoryEpisodes)
  const readiness = clamp01(Math.max(
    leadingGoal ? Math.max(leadingGoal.urgency, leadingGoal.confidence) * 0.88 : 0,
    concern ? Math.max(concern.tension, concern.confidence) * 0.8 : 0,
    reflectionCount > 0 ? Math.min(0.74, 0.38 + reflectionCount * 0.06) : 0,
    workingMemoryEpisodes.length > 0 ? Math.min(0.68, 0.34 + workingMemoryEpisodes.length * 0.07) : 0,
    recallGovernor && recallGovernor.mode !== 'none' ? 0.64 : 0.2,
  ))
  const focus = firstNonEmptyText(
    leadingGoal?.label,
    concern?.summary,
    recallGovernor?.recallSeed,
    workingMemoryEpisodes[0]?.summary,
  ) || null

  return {
    id: 'active-memory',
    state: toChannelState(readiness),
    readiness,
    focus,
    summary: [
      leadingGoal ? `goal=${sanitizeText(leadingGoal.label, 72)}` : '',
      concern ? `concern=${sanitizeText(concern.summary, 72)}` : '',
      recallGovernor ? `recall=${recallGovernor.mode}` : '',
      reflectionCount > 0 ? `reflections=${reflectionCount}` : '',
      workingMemoryEpisodes.length > 0 ? `episodes=${workingMemoryEpisodes.length}` : '',
    ].filter(Boolean).join(' | '),
  }
}

function buildAnthropomorphicMindChannel(spine: AlicizationDigitalLifeSpineSnapshot): AlicizationRuntimeChannelSnapshot {
  const surface = spine.runtimeSurface
  const relationshipModel = surface.world.relationshipModel
  const selfState = surface.agency.selfState
  const selfContinuity = surface.memory.selfContinuity
  const privateThought = surface.cognition.privateThought
  const readiness = clamp01(Math.max(
    relationshipModel
      ? (
          relationshipModel.receptivity * 0.42
          + relationshipModel.sharedAttentionTrust * 0.36
          + relationshipModel.reciprocityExpectation * 0.22
        )
      : 0,
    selfState
      ? (
          selfState.feltCloseness * 0.48
          + selfState.protectiveness * 0.28
          + selfState.desireToSpeak * 0.24
        )
      : 0,
    selfContinuity
      ? (
          selfContinuity.relationshipTrust * 0.36
          + selfContinuity.carryOverDesire * 0.36
          + (1 - selfContinuity.misreadBurden) * 0.28
        )
      : 0,
    privateThought?.shouldSpeak ? privateThought.confidence * 0.72 : 0,
  ))
  const focus = firstNonEmptyText(
    privateThought?.thoughtText,
    selfState?.moodLabel,
    relationshipModel?.climate,
    selfContinuity?.attachmentMode,
  ) || null

  return {
    id: 'anthropomorphic-mind',
    state: toChannelState(readiness),
    readiness,
    focus,
    summary: [
      relationshipModel ? `relationship=${relationshipModel.climate}/${relationshipModel.approachVector}` : '',
      selfState ? `self=${selfState.stance}/${selfState.moodLabel}` : '',
      selfContinuity ? `attachment=${selfContinuity.attachmentMode}/${selfContinuity.initiativeTemperament}` : '',
      privateThought?.embodiedPresence ? `presence=${privateThought.embodiedPresence}` : '',
      focus ? `focus=${sanitizeText(focus, 72)}` : '',
    ].filter(Boolean).join(' | '),
  }
}

function buildAgentRuntimeChannel(input: {
  telemetry?: AlicizationAgentRuntimeTelemetry | null
}): AlicizationRuntimeChannelSnapshot {
  const telemetry = input.telemetry
  const pendingTasks = Math.max(0, Math.floor(telemetry?.pendingTasks ?? 0))
  const completedTasks = Math.max(0, Math.floor(telemetry?.completedTasks ?? 0))
  const failedTasks = Math.max(0, Math.floor(telemetry?.failedTasks ?? 0))
  const continuitySignals = Math.max(0, Math.floor(telemetry?.continuitySignals ?? 0))
  const totalTasks = pendingTasks + completedTasks + failedTasks
  const activityScore = totalTasks > 0
    ? Math.min(1, 0.3 + totalTasks * 0.08)
    : 0.14
  const continuityScore = continuitySignals > 0
    ? Math.min(1, 0.22 + continuitySignals * 0.08)
    : 0.16
  const completionScore = clamp01(
    completedTasks * 0.08
    + pendingTasks * 0.04
    - failedTasks * 0.03,
  )
  const sensoryScore = telemetry?.sensoryCaptureHealthy === true
    ? 0.74
    : telemetry?.sensoryCaptureHealthy === false
      ? 0.36
      : 0.22
  const readiness = clamp01(Math.max(
    activityScore,
    continuityScore,
    completionScore,
    sensoryScore,
  ))
  const focus = pendingTasks > 0
    ? `pending:${pendingTasks}`
    : failedTasks > 0
      ? `failed:${failedTasks}`
      : completedTasks > 0
        ? `completed:${completedTasks}`
        : continuitySignals > 0
          ? `continuity:${continuitySignals}`
          : null

  return {
    id: 'agent-runtime',
    state: toChannelState(readiness),
    readiness,
    focus,
    summary: [
      `pending=${pendingTasks}`,
      `completed=${completedTasks}`,
      `failed=${failedTasks}`,
      `continuity=${continuitySignals}`,
      telemetry?.sensoryCaptureHealthy === null || telemetry?.sensoryCaptureHealthy === undefined
        ? 'capture=unknown'
        : `capture=${telemetry.sensoryCaptureHealthy ? 'healthy' : 'degraded'}`,
    ].join(' | '),
  }
}

function rankChannels(channels: Record<AlicizationRuntimeChannelId, AlicizationRuntimeChannelSnapshot>) {
  const tieBreaker: Record<AlicizationRuntimeChannelId, number> = {
    'dialogue': 0,
    'active-control': 1,
    'active-mind': 2,
    'active-dialogue': 3,
    'anthropomorphic-mind': 4,
    'active-memory': 5,
    'active-perception': 6,
    'agent-runtime': 7,
  }

  return Object.values(channels)
    .slice()
    .sort((left, right) => {
      if (right.readiness !== left.readiness)
        return right.readiness - left.readiness
      return tieBreaker[left.id] - tieBreaker[right.id]
    })
}

export function deriveAlicizationAgentRuntimeTelemetryFromSession(
  session: AlicizationRuntimeSessionSnapshot | null | undefined,
): AlicizationAgentRuntimeTelemetry | null {
  if (!session)
    return null

  let pendingTasks = 0
  let completedTasks = 0
  let failedTasks = 0
  for (const task of session.tasks ?? []) {
    const status = sanitizeText(task?.status, 24)
    if (status === 'pending') {
      pendingTasks += 1
      continue
    }
    if (status === 'completed') {
      completedTasks += 1
      continue
    }
    if (status === 'failed')
      failedTasks += 1
  }

  const captureHealth = sanitizeText(session.lastSensorySnapshot?.capture?.health, 24)
  const sensoryCaptureHealthy = captureHealth
    ? captureHealth === 'healthy'
    : null

  return {
    pendingTasks,
    completedTasks,
    failedTasks,
    continuitySignals: Math.max(0, (session.continuitySignals ?? []).length),
    sensoryCaptureHealthy,
  }
}

export function deriveAlicizationRuntimeSnapshot(input: {
  spine: AlicizationDigitalLifeSpineSnapshot | null | undefined
  agentRuntime?: AlicizationAgentRuntimeTelemetry | null
}): AlicizationRuntimeSnapshot | null {
  const spine = input.spine
  if (!spine)
    return null

  const channels: Record<AlicizationRuntimeChannelId, AlicizationRuntimeChannelSnapshot> = {
    'dialogue': buildDialogueChannel(spine),
    'active-perception': buildActivePerceptionChannel(spine),
    'active-dialogue': buildActiveDialogueChannel(spine),
    'active-control': buildActiveControlChannel(spine),
    'active-mind': buildActiveMindChannel(spine),
    'active-memory': buildActiveMemoryChannel(spine),
    'anthropomorphic-mind': buildAnthropomorphicMindChannel(spine),
    'agent-runtime': buildAgentRuntimeChannel({
      telemetry: input.agentRuntime,
    }),
  }

  const ranked = rankChannels(channels)
  const dominant = ranked[0]?.id ?? 'active-mind'

  const initiative = spine.runtimeSurface.agency.initiative ?? null
  const privateThought = spine.runtimeSurface.cognition.privateThought ?? null
  const autonomyState = spine.runtimeSurface.agency.autonomy ?? null
  const autonomy = buildRuntimeAutonomySnapshot(spine)
  const selectedAction = sanitizeText(autonomyState?.visibleAction ?? initiative?.selectedAction, 32)
  const motiveEngine = spine.runtimeSurface.memory.motiveEngine ?? null
  const habitPolicy = spine.runtimeSurface.agency.habitPolicy ?? null
  const autonomyActioning = autonomyState?.selectedMode === 'prepare-act'
    || autonomyState?.selectedMode === 'act'
  const shouldProactivelyAct = autonomyState
    ? autonomyActioning || autonomyState.shouldAct === true
    : (
        channels['active-control'].readiness >= 0.64
        && selectedAction !== ''
        && selectedAction !== 'wait'
        && selectedAction !== 'hover'
      )
  const autonomySpeechLocked = Boolean(autonomyActioning && autonomyState?.shouldSpeak !== true)
  const shouldProactivelySpeak = autonomySpeechLocked
    ? false
    : Boolean(
        autonomyState?.shouldSpeak
        || privateThought?.shouldSpeak
        || initiative?.shouldSpeak
        || channels['active-dialogue'].readiness >= 0.58,
      )

  const continuityPressure = clamp01(
    channels['active-memory'].readiness * 0.42
    + channels['active-mind'].readiness * 0.34
    + channels['anthropomorphic-mind'].readiness * 0.24,
  )
  const companionshipPressure = clamp01(
    channels['anthropomorphic-mind'].readiness * 0.68
    + channels['active-dialogue'].readiness * 0.2
    + (spine.runtimeSurface.agency.selfState?.feltCloseness ?? 0) * 0.12,
  )
  const rulingMotive = sanitizeText(motiveEngine?.rulingDrive, 48) || null
  const habitMode = sanitizeText(habitPolicy?.dominantMode, 64) || null
  const truthDisciplinePressure = clamp01(motiveEngine?.drives.truthDiscipline ?? 0)
  const boundaryPressure = clamp01(
    (motiveEngine?.drives.boundaryRespect ?? 0) * 0.82
    + (habitPolicy?.blocksDirectSpeakWhenBusy ? 0.12 : 0)
    + (habitPolicy?.prefersQuietCompanionship ? 0.06 : 0),
  )
  const restProtectionPressure = clamp01(
    (motiveEngine?.drives.restProtection ?? 0) * 0.84
    + (habitPolicy?.protectsRestWindow ? 0.14 : 0),
  )
  const returnPressure = clamp01(
    motiveEngine?.returnPressure
      ?? motiveEngine?.drives.unfinishedThreadReturn
      ?? 0,
  )
  const baseSnapshot = {
    version: 'alicization-runtime-v1' as const,
    dominantChannel: dominant,
    channels,
    activeLoop: null,
    autonomy,
    shouldProactivelySpeak,
    shouldProactivelyAct,
    continuityPressure,
    companionshipPressure,
    rulingMotive,
    habitMode,
    truthDisciplinePressure,
    boundaryPressure,
    restProtectionPressure,
    returnPressure,
    summary: '',
  }
  const activeLoop = deriveAlicizationActiveLoopSnapshot({
    architecture: spine.architecture,
    runtime: baseSnapshot,
  })
  const summary = [
    `dominant=${dominant}`,
    activeLoop ? `phase=${activeLoop.phase}` : '',
    activeLoop?.handoffTarget ? `handoff=${activeLoop.handoffTarget}` : '',
    activeLoop ? `initiative=${activeLoop.initiativeBudget.toFixed(2)}` : '',
    activeLoop ? `coherence=${activeLoop.coherence.toFixed(2)}` : '',
    autonomy?.selectedMode ? `autonomy=${autonomy.selectedMode}` : '',
    autonomy?.visibleAction ? `visible=${autonomy.visibleAction}` : '',
    autonomy?.executionIntentKind ? `intent=${autonomy.executionIntentKind}` : '',
    `speak=${shouldProactivelySpeak ? 'true' : 'false'}`,
    `act=${shouldProactivelyAct ? 'true' : 'false'}`,
    `continuity=${continuityPressure.toFixed(2)}`,
    `companionship=${companionshipPressure.toFixed(2)}`,
    rulingMotive ? `motive=${rulingMotive}` : '',
    habitMode ? `habit=${habitMode}` : '',
    truthDisciplinePressure > 0 ? `truth=${truthDisciplinePressure.toFixed(2)}` : '',
    boundaryPressure > 0 ? `boundary=${boundaryPressure.toFixed(2)}` : '',
    returnPressure > 0 ? `return=${returnPressure.toFixed(2)}` : '',
  ].filter(Boolean).join(' | ')

  return {
    ...baseSnapshot,
    activeLoop,
    shouldProactivelySpeak,
    shouldProactivelyAct,
    continuityPressure,
    companionshipPressure,
    summary,
  }
}

export function projectAlicizationRuntimeDigest(
  snapshot: AlicizationRuntimeSnapshot | null | undefined,
): AlicizationRuntimeDigest | null {
  if (!snapshot)
    return null

  const channels = rankChannels(snapshot.channels).map(channel => ({
    id: channel.id,
    state: channel.state,
    readiness: clamp01(channel.readiness),
    focus: sanitizeText(channel.focus, 120) || null,
    summary: sanitizeText(channel.summary, 220),
  }))

  return {
    version: 'alicization-runtime-digest-v1',
    dominantChannel: snapshot.dominantChannel,
    activeLoop: snapshot.activeLoop
      ? {
          version: 'alicization-active-loop-v1',
          phase: snapshot.activeLoop.phase,
          dominantChannel: snapshot.activeLoop.dominantChannel,
          handoffTarget: snapshot.activeLoop.handoffTarget,
          dialogueReady: snapshot.activeLoop.dialogueReady,
          controlReady: snapshot.activeLoop.controlReady,
          memoryCarry: snapshot.activeLoop.memoryCarry,
          companionshipReady: snapshot.activeLoop.companionshipReady,
          observationHeavy: snapshot.activeLoop.observationHeavy,
          initiativeBudget: clamp01(snapshot.activeLoop.initiativeBudget),
          coherence: clamp01(snapshot.activeLoop.coherence),
          summary: sanitizeText(snapshot.activeLoop.summary, 240),
        }
      : null,
    autonomy: snapshot.autonomy
      ? {
          selectedMode: sanitizeText(snapshot.autonomy.selectedMode, 48) || null,
          visibleAction: sanitizeText(snapshot.autonomy.visibleAction, 48) || null,
          shouldSpeak: snapshot.autonomy.shouldSpeak === true,
          shouldAct: snapshot.autonomy.shouldAct === true,
          speakReadiness: clamp01(snapshot.autonomy.speakReadiness),
          actReadiness: clamp01(snapshot.autonomy.actReadiness),
          inhibition: clamp01(snapshot.autonomy.inhibition),
          confidence: clamp01(snapshot.autonomy.confidence),
          executionIntentKind: sanitizeText(snapshot.autonomy.executionIntentKind, 48) || null,
          executionIntentSummary: sanitizeText(snapshot.autonomy.executionIntentSummary, 220) || null,
          deferReason: sanitizeText(snapshot.autonomy.deferReason, 160) || null,
          whyNow: sanitizeText(snapshot.autonomy.whyNow, 220) || null,
        }
      : null,
    shouldProactivelySpeak: snapshot.shouldProactivelySpeak,
    shouldProactivelyAct: snapshot.shouldProactivelyAct,
    continuityPressure: clamp01(snapshot.continuityPressure),
    companionshipPressure: clamp01(snapshot.companionshipPressure),
    rulingMotive: sanitizeText(snapshot.rulingMotive, 48) || null,
    habitMode: sanitizeText(snapshot.habitMode, 64) || null,
    truthDisciplinePressure: clamp01(snapshot.truthDisciplinePressure),
    boundaryPressure: clamp01(snapshot.boundaryPressure),
    restProtectionPressure: clamp01(snapshot.restProtectionPressure),
    returnPressure: clamp01(snapshot.returnPressure),
    channels,
    summary: sanitizeText(snapshot.summary, 240),
  }
}

export function buildAlicizationRuntimeSystemBlock(
  snapshot: AlicizationRuntimeSnapshot | null | undefined,
) {
  if (!snapshot)
    return ''

  const ranked = rankChannels(snapshot.channels)

  return [
    '[ALICIZATION_RUNTIME_DIGEST]',
    'Alicization-inspired active life runtime projection for dialogue/perception/proactive/control/mind/memory/anthropomorphic cognition/agent execution.',
    `dominant_channel=${snapshot.dominantChannel}`,
    snapshot.activeLoop ? `active_loop_phase=${snapshot.activeLoop.phase}` : '',
    snapshot.activeLoop?.handoffTarget ? `active_loop_handoff=${snapshot.activeLoop.handoffTarget}` : '',
    snapshot.activeLoop ? `active_loop_initiative_budget=${snapshot.activeLoop.initiativeBudget.toFixed(2)}` : '',
    snapshot.activeLoop ? `active_loop_coherence=${snapshot.activeLoop.coherence.toFixed(2)}` : '',
    snapshot.activeLoop ? `active_loop_observation_heavy=${snapshot.activeLoop.observationHeavy ? 'true' : 'false'}` : '',
    snapshot.autonomy?.selectedMode ? `autonomy_mode=${snapshot.autonomy.selectedMode}` : '',
    snapshot.autonomy?.visibleAction ? `autonomy_visible_action=${snapshot.autonomy.visibleAction}` : '',
    snapshot.autonomy ? `autonomy_should_speak=${snapshot.autonomy.shouldSpeak ? 'true' : 'false'}` : '',
    snapshot.autonomy ? `autonomy_should_act=${snapshot.autonomy.shouldAct ? 'true' : 'false'}` : '',
    snapshot.autonomy ? `autonomy_speak_readiness=${clamp01(snapshot.autonomy.speakReadiness).toFixed(2)}` : '',
    snapshot.autonomy ? `autonomy_act_readiness=${clamp01(snapshot.autonomy.actReadiness).toFixed(2)}` : '',
    snapshot.autonomy?.executionIntentKind ? `autonomy_intent=${snapshot.autonomy.executionIntentKind}` : '',
    snapshot.autonomy?.deferReason ? `autonomy_defer=${snapshot.autonomy.deferReason}` : '',
    `should_proactively_speak=${snapshot.shouldProactivelySpeak ? 'true' : 'false'}`,
    `should_proactively_act=${snapshot.shouldProactivelyAct ? 'true' : 'false'}`,
    `continuity_pressure=${snapshot.continuityPressure.toFixed(2)}`,
    `companionship_pressure=${snapshot.companionshipPressure.toFixed(2)}`,
    snapshot.rulingMotive ? `ruling_motive=${snapshot.rulingMotive}` : '',
    snapshot.habitMode ? `habit_mode=${snapshot.habitMode}` : '',
    `truth_discipline_pressure=${clamp01(snapshot.truthDisciplinePressure).toFixed(2)}`,
    `boundary_pressure=${clamp01(snapshot.boundaryPressure).toFixed(2)}`,
    `rest_protection_pressure=${clamp01(snapshot.restProtectionPressure).toFixed(2)}`,
    `return_pressure=${clamp01(snapshot.returnPressure).toFixed(2)}`,
    'channels:',
    ...ranked.map(channel => [
      `- [${formatChannelState(channel.state)} ${channel.readiness.toFixed(2)}] ${channel.id}`,
      channel.summary ? ` :: ${sanitizeText(channel.summary, 220)}` : '',
      channel.focus ? ` :: focus=${sanitizeText(channel.focus, 120)}` : '',
    ].join('')),
    'Keep all channels on one coherent living loop. Do not split dialogue, mind, memory, and action into contradictory narratives in the same turn.',
  ].join('\n')
}
