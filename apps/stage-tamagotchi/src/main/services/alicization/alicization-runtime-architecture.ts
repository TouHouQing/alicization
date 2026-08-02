import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationDerivedMindStateBundle,
  AlicizationEmotionalKernelSnapshot,
  AlicizationRuntimeDigest,
} from '../../../shared/eventa'
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

interface AlicizationRuntimeCurrentConsciousFrameSnapshot {
  reasonTags: string[]
  focusAnchor?: string | null
  consciousNeed?: string | null
  speakingIntention?: string | null
}

export interface AlicizationRuntimeSnapshot {
  version: 'alicization-runtime-v1'
  dominantChannel: AlicizationRuntimeChannelId
  channels: Record<AlicizationRuntimeChannelId, AlicizationRuntimeChannelSnapshot>
  activeLoop?: AlicizationActiveLoopSnapshot | null
  autonomy?: AlicizationRuntimeAutonomySnapshot | null
  currentConsciousFrame?: AlicizationRuntimeCurrentConsciousFrameSnapshot | null
  personStateProjection?: AlicizationDigitalLifeSpineSnapshot['runtimeSurface']['memory']['personStateProjection'] | null
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  derivedMindStateBundle?: AlicizationDerivedMindStateBundle | null
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

function projectSelfEvolutionSnapshot(
  snapshot: AlicizationDerivedMindStateBundle['selfEvolution'],
) {
  return snapshot ?? null
}

function projectDialogueRhythm(
  rhythm: AlicizationDerivedMindStateBundle['dialogueRhythm'],
) {
  if (!rhythm)
    return null

  return Object.keys(rhythm).length > 0 ? rhythm : null
}

function projectDerivedMindStateBundle(
  bundle: AlicizationDerivedMindStateBundle | null | undefined,
): AlicizationDerivedMindStateBundle | null {
  if (!bundle)
    return null

  return {
    version: bundle.version,
    source: bundle.source,
    producedAt: bundle.producedAt,
    hostPersonModel: bundle.hostPersonModel ?? null,
    personStateProjection: bundle.personStateProjection ?? null,
    knowledgeEvidence: bundle.knowledgeEvidence ?? null,
    claimEvidenceGraphs: bundle.claimEvidenceGraphs ?? null,
    activeSelfRevision: bundle.activeSelfRevision
      ? {
          ...bundle.activeSelfRevision,
          reasonCodes: sanitizeReasonTags(bundle.activeSelfRevision.reasonCodes),
        }
      : null,
    emotionalKernel: bundle.emotionalKernel ?? null,
    emotionalTransitionLedger: bundle.emotionalTransitionLedger ?? null,
    embodimentContinuityLedger: bundle.embodimentContinuityLedger ?? null,
    selfEvolution: projectSelfEvolutionSnapshot(bundle.selfEvolution),
    affectiveResidue: bundle.affectiveResidue ?? null,
    learningExecutionState: bundle.learningExecutionState ?? null,
    recallLatencyPolicy: bundle.recallLatencyPolicy ?? null,
    recollectionIntent: bundle.recollectionIntent ?? null,
    recollectionPlan: bundle.recollectionPlan ?? null,
    recollectionSpeechPlan: bundle.recollectionSpeechPlan ?? null,
    memoryDeliberation: bundle.memoryDeliberation ?? null,
    dialogueRhythm: projectDialogueRhythm(bundle.dialogueRhythm),
    summary: bundle.summary,
  } satisfies AlicizationDerivedMindStateBundle
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

function sanitizeDialogueStateText(raw: unknown, maxChars = 320) {
  return sanitizeText(raw, maxChars)
}

function sanitizeReasonTags(raw: unknown) {
  if (!Array.isArray(raw))
    return []
  return [...new Set(raw
    .map(tag => sanitizeText(tag, 96))
    .filter(Boolean))]
}

function firstNonEmptyText(...values: unknown[]) {
  for (const value of values) {
    const text = sanitizeText(value, 220)
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

function createChannel(
  id: AlicizationRuntimeChannelId,
  readiness: number,
  focus: unknown,
  summaryParts: unknown[],
): AlicizationRuntimeChannelSnapshot {
  const normalizedReadiness = clamp01(readiness)
  return {
    id,
    state: toChannelState(normalizedReadiness),
    readiness: normalizedReadiness,
    focus: sanitizeText(focus, 160) || null,
    summary: summaryParts
      .map(part => sanitizeText(part, 220))
      .filter(Boolean)
      .join(' | '),
  }
}

function pickFocusBelief(surface: any) {
  const beliefs = asArray<any>(surface?.cognition?.beliefLedger?.beliefs)
  return beliefs.find(
    belief => belief.id === surface?.cognition?.beliefLedger?.focusBeliefId,
  ) ?? beliefs[0] ?? null
}

function pickLeadingGoal(surface: any) {
  const goals = asArray<any>(surface?.memory?.goalStack?.alicizationGoals)
  return goals.find(
    goal => goal.id === surface?.memory?.goalStack?.leadingAlicizationGoalId,
  ) ?? goals[0] ?? null
}

function pickDominantConcern(surface: any) {
  return asArray<any>(surface?.memory?.concerns)[0] ?? null
}

function pickForegroundRuntimeThread(surface: any) {
  const runtime = surface?.memory?.threadRuntime
  const threads = asArray<any>(runtime?.threads)
  return threads.find(thread => thread.id === runtime?.foregroundThreadId)
    ?? threads[0]
    ?? null
}

function buildDialogueChannel(surface: any) {
  const dialogue = surface?.dialogue ?? {}
  const encounter = dialogue.dialogueEncounter
  const planner = dialogue.answerPlanner
  const deliberation = dialogue.replyDeliberation
  const frame = dialogue.currentConsciousFrame
  const readiness = Math.max(
    Number(encounter?.confidence ?? 0),
    Number(planner?.confidence ?? 0),
    Number(deliberation?.confidence ?? 0),
    Number(frame?.confidence ?? 0),
    deliberation?.shouldSpeak === true ? 0.84 : 0,
  )
  const focus = firstNonEmptyText(
    planner?.answerIntent,
    frame?.focusAnchor,
    encounter?.summary,
  )
  return createChannel('dialogue', readiness, focus, [
    planner?.answerIntent ? `intent=${sanitizeText(planner.answerIntent, 64)}` : '',
    deliberation ? `speak=${deliberation.shouldSpeak === true ? 'true' : 'false'}` : '',
    encounter?.subject ? `subject=${sanitizeText(encounter.subject, 64)}` : '',
  ])
}

function buildActivePerceptionChannel(surface: any) {
  const scene = surface?.perception?.currentScene
  const attention = surface?.perception?.attention
  const capture = surface?.perception?.captureState
  const captureReadiness = capture?.permission === 'granted' && capture?.health === 'healthy'
    ? 0.82
    : capture?.permission === 'granted'
      ? 0.62
      : capture?.permission === 'prompt'
        ? 0.44
        : 0.16
  const readiness = Math.max(
    Number(scene?.confidence ?? 0),
    Number(attention?.confidence ?? 0),
    captureReadiness,
    surface?.perception?.watchMode === 'invited-inspection'
      ? 0.7
      : surface?.perception?.watchMode === 'symbiotic-vision'
        ? 0.66
        : 0.3,
  )
  const focus = firstNonEmptyText(
    scene?.summary,
    attention?.target?.title,
    attention?.target?.appName,
    scene?.scenario,
  )
  return createChannel('active-perception', readiness, focus, [
    `watch=${sanitizeText(surface?.perception?.watchMode, 48) || 'unknown'}`,
    scene?.scenario ? `scene=${sanitizeText(scene.scenario, 64)}` : '',
    capture ? `capture=${sanitizeText(capture.permission, 32)}/${sanitizeText(capture.health, 32)}` : 'capture=unknown',
  ])
}

function buildActiveDialogueChannel(surface: any) {
  const initiative = surface?.agency?.initiative
  const privateThought = surface?.cognition?.privateThought
  const concern = pickDominantConcern(surface)
  const relationship = surface?.world?.relationshipModel
  const readiness = Math.max(
    privateThought?.shouldSpeak === true ? Number(privateThought?.confidence ?? 0) : 0,
    initiative?.shouldSpeak === true
      ? Math.max(Number(initiative?.confidence ?? 0), Number(initiative?.speakDrive ?? 0))
      : 0,
    concern ? Math.max(Number(concern?.tension ?? 0), Number(concern?.careWeight ?? 0)) * 0.86 : 0,
    relationship?.climate === 'attuned' ? 0.62 : relationship?.climate === 'guarded' ? 0.28 : 0.42,
  )
  const focus = firstNonEmptyText(privateThought?.thoughtText, initiative?.why, concern?.summary)
  return createChannel('active-dialogue', readiness, focus, [
    initiative?.selectedAction ? `action=${sanitizeText(initiative.selectedAction, 48)}` : '',
    initiative?.preferredStyle ? `style=${sanitizeText(initiative.preferredStyle, 48)}` : '',
    privateThought?.stance ? `stance=${sanitizeText(privateThought.stance, 48)}` : '',
  ])
}

function buildActiveControlChannel(surface: any) {
  const initiative = surface?.agency?.initiative
  const autonomy = surface?.agency?.autonomy
  const actionEcology = surface?.agency?.actionEcology
  const deliberation = surface?.agency?.deliberationState
  const thread = pickForegroundRuntimeThread(surface)
  const selectedAction = sanitizeText(initiative?.selectedAction, 48)
  const selectedMode = sanitizeText(autonomy?.selectedMode, 48)
  const actioning = selectedMode === 'prepare-act' || selectedMode === 'act'
  const readiness = Math.max(
    Number(actionEcology?.readiness ?? 0),
    Number(deliberation?.readiness ?? 0),
    actioning
      ? Math.max(
          Number(autonomy?.actReadiness ?? 0),
          Number(autonomy?.confidence ?? 0),
          autonomy?.shouldAct === true ? 0.92 : 0.74,
        )
      : 0,
    selectedAction && selectedAction !== 'wait' && selectedAction !== 'hover'
      ? Number(initiative?.confidence ?? 0)
      : 0,
    thread ? 0.56 : 0,
  )
  const focus = firstNonEmptyText(
    autonomy?.executionIntent?.summary,
    autonomy?.whyNow,
    actionEcology?.why,
    thread?.summary,
    initiative?.why,
  )
  return createChannel('active-control', readiness, focus, [
    selectedMode ? `autonomy=${selectedMode}` : '',
    selectedAction ? `action=${selectedAction}` : '',
    autonomy?.executionIntent?.kind ? `intent=${sanitizeText(autonomy.executionIntent.kind, 48)}` : '',
    actionEcology?.mode ? `ecology=${sanitizeText(actionEcology.mode, 48)}` : '',
  ])
}

function buildActiveMindChannel(surface: any) {
  const thread = surface?.world?.worldModel?.activeThread
  const inference = surface?.cognition?.subjectiveInference
  const kernel = surface?.cognition?.mindKernel
  const belief = pickFocusBelief(surface)
  const readiness = Math.max(
    thread ? Math.max(Number(thread?.significance ?? 0), Number(thread?.confidence ?? 0)) : 0,
    Number(inference?.confidence ?? 0),
    belief ? Math.max(Number(belief?.confidence ?? 0), Number(belief?.salience ?? 0)) : 0,
    kernel
      ? Math.max(
          Number(kernel?.worldPressure ?? 0),
          Number(kernel?.epistemicPressure ?? 0),
          Number(kernel?.relationalPressure ?? 0),
          Number(kernel?.speakReadiness ?? 0),
        )
      : 0,
  )
  const focus = firstNonEmptyText(
    thread?.summary,
    inference?.dominantInterpretation,
    belief?.statement,
    kernel?.narrative?.[0],
  )
  return createChannel('active-mind', readiness, focus, [
    kernel?.dominantMode ? `mode=${sanitizeText(kernel.dominantMode, 48)}` : '',
    kernel?.dominantDrive ? `drive=${sanitizeText(kernel.dominantDrive, 48)}` : '',
    thread?.title ? `thread=${sanitizeText(thread.title, 72)}` : '',
  ])
}

function buildActiveMemoryChannel(surface: any) {
  const goal = pickLeadingGoal(surface)
  const concern = pickDominantConcern(surface)
  const reflections = asArray<any>(surface?.memory?.reflectionLedger?.entries)
  const workingMemory = asArray<any>(surface?.memory?.workingMemoryEpisodes)
  const recallGovernor = surface?.memory?.recallGovernor
  const memoryDeliberation = surface?.memory?.memoryDeliberation
  const recollectionFollowUp = surface?.memory?.recollectionFollowUp
    ?? memoryDeliberation?.followUpAffordance
    ?? null
  const recollectionFollowUpSummary = sanitizeText(
    recollectionFollowUp?.summary,
    180,
  )
  const recollectionFollowUpWhyNow = sanitizeText(
    recollectionFollowUp?.whyNow,
    180,
  )
  const recollectionFollowUpSignal = firstNonEmptyText(
    recollectionFollowUpSummary,
    recollectionFollowUpWhyNow,
  )
  const readiness = Math.max(
    goal ? Math.max(Number(goal?.urgency ?? 0), Number(goal?.confidence ?? 0)) * 0.88 : 0,
    concern ? Math.max(Number(concern?.tension ?? 0), Number(concern?.confidence ?? 0)) * 0.8 : 0,
    reflections.length > 0 ? Math.min(0.74, 0.38 + reflections.length * 0.06) : 0,
    workingMemory.length > 0 ? Math.min(0.68, 0.34 + workingMemory.length * 0.07) : 0,
    recallGovernor && recallGovernor.mode !== 'none' ? 0.64 : 0.2,
    recollectionFollowUpSignal
      ? Math.max(0.72, Number(memoryDeliberation?.confidence ?? 0))
      : 0,
  )
  const focus = firstNonEmptyText(
    goal?.label,
    concern?.summary,
    recallGovernor?.recallSeed,
    workingMemory[0]?.summary,
    recollectionFollowUpSignal,
  )
  return createChannel('active-memory', readiness, focus, [
    goal?.label ? `goal=${sanitizeText(goal.label, 72)}` : '',
    concern?.summary ? `concern=${sanitizeText(concern.summary, 72)}` : '',
    recallGovernor?.mode ? `recall=${sanitizeText(recallGovernor.mode, 48)}` : '',
    recollectionFollowUpSignal
      ? `recollection_follow_up=${sanitizeText(recollectionFollowUpSignal, 160)}`
      : '',
    reflections.length > 0 ? `reflections=${reflections.length}` : '',
    workingMemory.length > 0 ? `episodes=${workingMemory.length}` : '',
  ])
}

function buildAnthropomorphicMindChannel(surface: any) {
  const relationship = surface?.world?.relationshipModel
  const selfState = surface?.agency?.selfState
  const selfContinuity = surface?.memory?.selfContinuity
  const privateThought = surface?.cognition?.privateThought
  const readiness = Math.max(
    relationship
      ? (
          Number(relationship?.receptivity ?? 0) * 0.42
          + Number(relationship?.sharedAttentionTrust ?? 0) * 0.36
          + Number(relationship?.reciprocityExpectation ?? 0) * 0.22
        )
      : 0,
    selfState
      ? (
          Number(selfState?.feltCloseness ?? 0) * 0.48
          + Number(selfState?.protectiveness ?? 0) * 0.28
          + Number(selfState?.desireToSpeak ?? 0) * 0.24
        )
      : 0,
    selfContinuity
      ? (
          Number(selfContinuity?.relationshipTrust ?? 0) * 0.36
          + Number(selfContinuity?.carryOverDesire ?? 0) * 0.36
          + (1 - Number(selfContinuity?.misreadBurden ?? 0)) * 0.28
        )
      : 0,
    privateThought?.shouldSpeak === true ? Number(privateThought?.confidence ?? 0) * 0.72 : 0,
  )
  const focus = firstNonEmptyText(
    privateThought?.thoughtText,
    selfState?.moodLabel,
    relationship?.climate,
    selfContinuity?.attachmentMode,
  )
  return createChannel('anthropomorphic-mind', readiness, focus, [
    relationship ? `relationship=${sanitizeText(relationship.climate, 48)}/${sanitizeText(relationship.approachVector, 48)}` : '',
    selfState ? `self=${sanitizeText(selfState.stance, 48)}/${sanitizeText(selfState.moodLabel, 48)}` : '',
    selfContinuity ? `attachment=${sanitizeText(selfContinuity.attachmentMode, 48)}` : '',
  ])
}

function buildAgentRuntimeChannel(telemetry?: AlicizationAgentRuntimeTelemetry | null) {
  const pending = Math.max(0, Math.floor(telemetry?.pendingTasks ?? 0))
  const completed = Math.max(0, Math.floor(telemetry?.completedTasks ?? 0))
  const failed = Math.max(0, Math.floor(telemetry?.failedTasks ?? 0))
  const continuitySignals = Math.max(0, Math.floor(telemetry?.continuitySignals ?? 0))
  const total = pending + completed + failed
  const readiness = Math.max(
    total > 0 ? Math.min(1, 0.3 + total * 0.08) : 0.14,
    continuitySignals > 0 ? Math.min(1, 0.22 + continuitySignals * 0.08) : 0.16,
    telemetry?.sensoryCaptureHealthy === true ? 0.74 : telemetry?.sensoryCaptureHealthy === false ? 0.36 : 0.22,
  )
  const focus = pending > 0
    ? `pending:${pending}`
    : failed > 0
      ? `failed:${failed}`
      : completed > 0
        ? `completed:${completed}`
        : null
  return createChannel('agent-runtime', readiness, focus, [
    `pending=${pending}`,
    `completed=${completed}`,
    `failed=${failed}`,
    `continuity=${continuitySignals}`,
    telemetry?.sensoryCaptureHealthy == null
      ? 'capture=unknown'
      : `capture=${telemetry.sensoryCaptureHealthy ? 'healthy' : 'degraded'}`,
  ])
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

function buildRuntimeAutonomySnapshot(surface: any): AlicizationRuntimeAutonomySnapshot | null {
  const autonomy = surface?.agency?.autonomy
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

function projectCurrentConsciousFrame(surface: any): AlicizationRuntimeCurrentConsciousFrameSnapshot | null {
  const frame = surface?.dialogue?.currentConsciousFrame
  if (!frame)
    return null
  return {
    reasonTags: sanitizeReasonTags(frame.reasonTags),
    focusAnchor: sanitizeDialogueStateText(frame.focusAnchor, 160) || null,
    consciousNeed: sanitizeDialogueStateText(frame.consciousNeed, 420) || null,
    speakingIntention: sanitizeDialogueStateText(frame.speakingIntention, 420) || null,
  }
}

function projectActiveLoopSnapshot(
  activeLoop: AlicizationActiveLoopSnapshot | null | undefined,
) {
  if (!activeLoop)
    return activeLoop ?? null
  return {
    version: activeLoop.version,
    phase: activeLoop.phase,
    dominantChannel: activeLoop.dominantChannel,
    handoffTarget: activeLoop.handoffTarget,
    dialogueReady: activeLoop.dialogueReady,
    controlReady: activeLoop.controlReady,
    memoryCarry: activeLoop.memoryCarry,
    companionshipReady: activeLoop.companionshipReady,
    observationHeavy: activeLoop.observationHeavy,
    initiativeBudget: activeLoop.initiativeBudget,
    continuityPressure: activeLoop.continuityPressure,
    companionshipPressure: activeLoop.companionshipPressure,
    coherence: activeLoop.coherence,
    summary: activeLoop.summary,
  } satisfies AlicizationActiveLoopSnapshot
}

function buildChannels(
  surface: any,
  telemetry?: AlicizationAgentRuntimeTelemetry | null,
): Record<AlicizationRuntimeChannelId, AlicizationRuntimeChannelSnapshot> {
  return {
    'dialogue': buildDialogueChannel(surface),
    'active-perception': buildActivePerceptionChannel(surface),
    'active-dialogue': buildActiveDialogueChannel(surface),
    'active-control': buildActiveControlChannel(surface),
    'active-mind': buildActiveMindChannel(surface),
    'active-memory': buildActiveMemoryChannel(surface),
    'anthropomorphic-mind': buildAnthropomorphicMindChannel(surface),
    'agent-runtime': buildAgentRuntimeChannel(telemetry),
  }
}

function deriveDecisionState(surface: any, channels: Record<AlicizationRuntimeChannelId, AlicizationRuntimeChannelSnapshot>) {
  const autonomy = surface?.agency?.autonomy
  const initiative = surface?.agency?.initiative
  const privateThought = surface?.cognition?.privateThought
  const deliberation = surface?.dialogue?.replyDeliberation
  const selectedMode = sanitizeText(autonomy?.selectedMode, 48)
  const actioning = selectedMode === 'prepare-act' || selectedMode === 'act'
  const selectedAction = sanitizeText(autonomy?.visibleAction ?? initiative?.selectedAction, 48)

  const shouldAct = autonomy
    ? autonomy.shouldAct === true || actioning
    : (
        channels['active-control'].readiness >= 0.64
        && selectedAction !== ''
        && selectedAction !== 'wait'
        && selectedAction !== 'hover'
      )
  const shouldSpeak = actioning && autonomy?.shouldSpeak !== true
    ? false
    : Boolean(
        autonomy?.shouldSpeak === true
        || privateThought?.shouldSpeak === true
        || initiative?.shouldSpeak === true
        || deliberation?.shouldSpeak === true,
      )

  return { shouldAct, shouldSpeak }
}

function buildSnapshotFromSurface(input: {
  spine: AlicizationDigitalLifeSpineSnapshot
  surface: any
  agentRuntime?: AlicizationAgentRuntimeTelemetry | null
}) {
  const channels = buildChannels(input.surface, input.agentRuntime)
  const dominantChannel = rankChannels(channels)[0]?.id ?? 'active-mind'
  const autonomy = buildRuntimeAutonomySnapshot(input.surface)
  const decision = deriveDecisionState(input.surface, channels)
  const emotionalKernel = input.surface?.memory?.emotionalKernel ?? null
  const derivedMindStateBundle = projectDerivedMindStateBundle(
    input.surface?.memory?.derivedMindStateBundle ?? null,
  )
  const affectiveResidue = input.surface?.memory?.affectiveResidue
    ?? derivedMindStateBundle?.affectiveResidue
    ?? null
  const motive = input.surface?.memory?.motiveEngine
  const habit = input.surface?.agency?.habitPolicy
  const continuityPressure = clamp01(
    channels['active-memory'].readiness * 0.46
    + channels['active-mind'].readiness * 0.34
    + channels['anthropomorphic-mind'].readiness * 0.2,
  )
  const companionshipPressure = clamp01(
    channels['anthropomorphic-mind'].readiness * 0.68
    + channels['active-dialogue'].readiness * 0.2
    + Number(input.surface?.agency?.selfState?.feltCloseness ?? 0) * 0.12,
  )
  const base: AlicizationRuntimeSnapshot = {
    version: 'alicization-runtime-v1',
    dominantChannel,
    channels,
    activeLoop: null,
    autonomy,
    currentConsciousFrame: projectCurrentConsciousFrame(input.surface),
    personStateProjection: input.surface?.memory?.personStateProjection ?? null,
    emotionalKernel,
    affectiveResidue,
    derivedMindStateBundle,
    shouldProactivelySpeak: decision.shouldSpeak,
    shouldProactivelyAct: decision.shouldAct,
    continuityPressure,
    companionshipPressure,
    rulingMotive: sanitizeText(motive?.rulingDrive, 48) || null,
    habitMode: sanitizeText(habit?.dominantMode, 64) || null,
    truthDisciplinePressure: clamp01(motive?.drives?.truthDiscipline),
    boundaryPressure: clamp01(motive?.drives?.boundaryRespect),
    restProtectionPressure: clamp01(motive?.drives?.restProtection),
    returnPressure: clamp01(motive?.returnPressure ?? motive?.drives?.unfinishedThreadReturn),
    summary: '',
  }
  const activeLoop = projectActiveLoopSnapshot(
    deriveAlicizationActiveLoopSnapshot({
      architecture: input.spine.architecture,
      runtime: base,
    }),
  )
  const summary = [
    `dominant=${dominantChannel}`,
    activeLoop ? `phase=${activeLoop.phase}` : '',
    autonomy?.selectedMode ? `autonomy=${autonomy.selectedMode}` : '',
    `speak=${decision.shouldSpeak ? 'true' : 'false'}`,
    `act=${decision.shouldAct ? 'true' : 'false'}`,
    `continuity=${continuityPressure.toFixed(2)}`,
    `companionship=${companionshipPressure.toFixed(2)}`,
  ].filter(Boolean).join(' | ')
  return {
    ...base,
    activeLoop,
    summary,
  }
}

function deriveDigestOnlyRuntimeSnapshot(input: {
  spine: AlicizationDigitalLifeSpineSnapshot
  agentRuntime?: AlicizationAgentRuntimeTelemetry | null
}): AlicizationRuntimeSnapshot {
  const runtime = input.spine.runtime ?? null
  const proactive = input.spine.proactive ?? null
  const memory = input.spine.memory ?? null
  const syntheticSurface = {
    dialogue: {
      answerPlanner: runtime?.answerIntent
        ? {
            answerIntent: runtime.answerIntent,
            confidence: 0.5,
          }
        : null,
      currentConsciousFrame: null,
    },
    perception: {
      watchMode: runtime?.watchMode ?? null,
      currentScene: runtime?.sceneSummary
        ? {
            summary: runtime.sceneSummary,
            scenario: runtime.sceneScenario,
            confidence: 0.5,
          }
        : null,
      captureState: null,
    },
    world: {
      worldModel: runtime?.activeThreadTitle
        ? {
            activeThread: {
              title: runtime.activeThreadTitle,
              summary: runtime.activeThreadTitle,
              significance: 0.5,
              confidence: 0.5,
            },
          }
        : null,
      relationshipModel: null,
    },
    agency: {
      initiative: proactive
        ? {
            selectedAction: proactive.selectedAction,
            preferredStyle: proactive.preferredStyle,
            shouldSpeak: proactive.shouldSpeak,
            confidence: proactive.confidence,
            speakDrive: proactive.shouldSpeak ? proactive.confidence : 0,
            why: proactive.dominantConcernSummary,
          }
        : null,
      autonomy: null,
      selfState: null,
      habitPolicy: null,
      actionEcology: null,
      deliberationState: null,
    },
    cognition: {
      privateThought: null,
      subjectiveInference: null,
      mindKernel: runtime?.dominantMode
        ? {
            dominantMode: runtime.dominantMode,
            dominantDrive: runtime.dominantDrive,
            worldPressure: 0.5,
            epistemicPressure: 0.5,
            relationalPressure: 0.5,
            speakReadiness: proactive?.shouldSpeak ? 0.6 : 0,
            narrative: [],
          }
        : null,
      beliefLedger: null,
    },
    memory: {
      summary: memory?.summary ?? null,
      recallGovernor: memory?.recallMode
        ? {
            mode: memory.recallMode,
          }
        : null,
      workingMemoryEpisodes: [],
      reflectionLedger: null,
      goalStack: null,
      concerns: [],
      selfContinuity: null,
      motiveEngine: null,
      derivedMindStateBundle: memory?.derivedMindStateBundle ?? null,
      affectiveResidue: memory?.affectiveResidue ?? memory?.derivedMindStateBundle?.affectiveResidue ?? null,
      emotionalKernel: null,
      personStateProjection: memory?.personStateProjection ?? null,
    },
  }
  return buildSnapshotFromSurface({
    spine: input.spine,
    surface: syntheticSurface,
    agentRuntime: input.agentRuntime,
  })
}

export function derivePostPolicyQuietHoldRuntimeSnapshot(
  snapshot: AlicizationRuntimeSnapshot | null | undefined,
  input: {
    shouldPersistVisibleUtterance: boolean
    reason?: string | null
  },
): AlicizationRuntimeSnapshot | null {
  if (!snapshot)
    return null
  if (
    input.shouldPersistVisibleUtterance
    || input.reason !== 'proactive-visible-presence-without-utterance'
  ) {
    return snapshot
  }

  const next: AlicizationRuntimeSnapshot = {
    ...snapshot,
    currentConsciousFrame: snapshot.currentConsciousFrame
      ? {
          reasonTags: sanitizeReasonTags(snapshot.currentConsciousFrame.reasonTags),
          focusAnchor: sanitizeDialogueStateText(snapshot.currentConsciousFrame.focusAnchor, 160) || null,
          consciousNeed: sanitizeDialogueStateText(snapshot.currentConsciousFrame.consciousNeed, 420) || null,
          speakingIntention: sanitizeDialogueStateText(snapshot.currentConsciousFrame.speakingIntention, 420) || null,
        }
      : null,
    derivedMindStateBundle: projectDerivedMindStateBundle(
      snapshot.derivedMindStateBundle,
    ),
    shouldProactivelySpeak: false,
    shouldProactivelyAct: false,
    summary: snapshot.summary
      .replace(/\bspeak=(?:true|false)\b/u, 'speak=false')
      .replace(/\bact=(?:true|false)\b/u, 'act=false'),
  }
  next.activeLoop = projectActiveLoopSnapshot(
    deriveAlicizationActiveLoopSnapshot({
      runtime: {
        ...next,
        activeLoop: null,
      },
    }),
  )
  return next
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
    if (status === 'pending')
      pendingTasks += 1
    else if (status === 'completed')
      completedTasks += 1
    else if (status === 'failed')
      failedTasks += 1
  }
  const captureHealth = sanitizeText(session.lastSensorySnapshot?.capture?.health, 24)
  return {
    pendingTasks,
    completedTasks,
    failedTasks,
    continuitySignals: Math.max(0, (session.continuitySignals ?? []).length),
    sensoryCaptureHealthy: captureHealth ? captureHealth === 'healthy' : null,
  }
}

export function deriveAlicizationRuntimeSnapshot(input: {
  spine: AlicizationDigitalLifeSpineSnapshot | null | undefined
  agentRuntime?: AlicizationAgentRuntimeTelemetry | null
}): AlicizationRuntimeSnapshot | null {
  if (!input.spine)
    return null
  if (!input.spine.runtimeSurface) {
    return deriveDigestOnlyRuntimeSnapshot({
      spine: input.spine,
      agentRuntime: input.agentRuntime,
    })
  }
  return buildSnapshotFromSurface({
    spine: input.spine,
    surface: input.spine.runtimeSurface,
    agentRuntime: input.agentRuntime,
  })
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
          shouldSpeak: snapshot.autonomy.shouldSpeak,
          shouldAct: snapshot.autonomy.shouldAct,
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
    currentConsciousFrame: snapshot.currentConsciousFrame
      ? {
          reasonTags: sanitizeReasonTags(snapshot.currentConsciousFrame.reasonTags),
          focusAnchor: sanitizeDialogueStateText(snapshot.currentConsciousFrame.focusAnchor, 160) || null,
          consciousNeed: sanitizeDialogueStateText(snapshot.currentConsciousFrame.consciousNeed, 420) || null,
          speakingIntention: sanitizeDialogueStateText(snapshot.currentConsciousFrame.speakingIntention, 420) || null,
        }
      : null,
    emotionalKernel: snapshot.emotionalKernel
      ? {
          version: 'emotional-kernel-v1',
          dominantEmotion: snapshot.emotionalKernel.dominantEmotion,
          initiativeMode: snapshot.emotionalKernel.initiativeMode,
          memoryRecallMode: snapshot.emotionalKernel.memoryRecallMode,
          embodimentTone: snapshot.emotionalKernel.embodimentTone,
          valence: clamp01(snapshot.emotionalKernel.valence),
          arousal: clamp01(snapshot.emotionalKernel.arousal),
          guardedness: clamp01(snapshot.emotionalKernel.guardedness),
          closenessDrive: clamp01(snapshot.emotionalKernel.closenessDrive),
          repairNeed: clamp01(snapshot.emotionalKernel.repairNeed),
          initiativePressure: clamp01(snapshot.emotionalKernel.initiativePressure),
          reasonTags: sanitizeReasonTags(snapshot.emotionalKernel.reasonTags),
          why: sanitizeText(snapshot.emotionalKernel.why, 220),
        }
      : null,
    affectiveResidue: snapshot.affectiveResidue ?? null,
    derivedMindStateBundle: projectDerivedMindStateBundle(
      snapshot.derivedMindStateBundle ?? null,
    ),
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
