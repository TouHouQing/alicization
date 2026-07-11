import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import {
  alicizationFixedTemplateReplacement,
  sanitizeAlicizationStructuredInternalText,
} from '@proj-alicization/stage-shared'

import { resolveAlicizationProjectStateBrief } from './project-state-brief'

export type AlicizationDigitalLifeSubsystemId
  = | 'dialogue'
    | 'perception'
    | 'proactive'
    | 'control'
    | 'mind'
    | 'memory'
    | 'runtime'

export type AlicizationDigitalLifeSubsystemState = 'hot' | 'warm' | 'idle'
export type AlicizationDigitalLifeOperatingMode = 'observing' | 'thinking' | 'speaking' | 'acting' | 'remembering'

export interface AlicizationDigitalLifeSubsystemSnapshot {
  id: AlicizationDigitalLifeSubsystemId
  state: AlicizationDigitalLifeSubsystemState
  score: number
  focus: string | null
  summary: string
  reasons: string[]
}

export interface AlicizationDigitalLifeArchitectureSnapshot {
  version: 'digital-life-architecture-v1'
  operatingMode: AlicizationDigitalLifeOperatingMode
  dominantSystem: AlicizationDigitalLifeSubsystemId
  supportingSystems: AlicizationDigitalLifeSubsystemId[]
  governingFocus: string | null
  summary: string
  closureAudit?: {
    currentPhase: string | null
    primaryOpenLoop: string | null
    activeClosurePressures: string[]
    selfAuthoritySummary?: string | null
    summary: string
  } | null
  systems: Record<AlicizationDigitalLifeSubsystemId, AlicizationDigitalLifeSubsystemSnapshot>
}

function clamp01(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value)))
}

function sanitizeText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  const normalized = raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
  const sanitized = sanitizeAlicizationStructuredInternalText(
    normalized,
    maxChars,
    alicizationFixedTemplateReplacement,
  )
  if (!sanitized)
    return ''
  return sanitized === alicizationFixedTemplateReplacement
    ? 'relationship_continuity=present; source_template=excluded'
    : sanitized
}

function summarizeMs(raw: number | null | undefined) {
  if (!Number.isFinite(raw))
    return 'unknown'
  return `${Math.max(0, Math.floor(Number(raw)))}ms`
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

function normalizeSparseDigitalLifeRuntimeSurface(
  surface: AlicizationDigitalLifeRuntimeSurface,
): AlicizationDigitalLifeRuntimeSurface {
  return {
    ...surface,
    perception: (surface.perception ?? {}) as AlicizationDigitalLifeRuntimeSurface['perception'],
    world: (surface.world ?? {}) as AlicizationDigitalLifeRuntimeSurface['world'],
    cognition: (surface.cognition ?? {}) as AlicizationDigitalLifeRuntimeSurface['cognition'],
    memory: (surface.memory ?? {}) as AlicizationDigitalLifeRuntimeSurface['memory'],
    dialogue: (surface.dialogue ?? {}) as AlicizationDigitalLifeRuntimeSurface['dialogue'],
    agency: (surface.agency ?? {}) as AlicizationDigitalLifeRuntimeSurface['agency'],
  }
}

function pickFocusBelief(surface: AlicizationDigitalLifeRuntimeSurface) {
  const beliefs = asArray(surface.cognition.beliefLedger?.beliefs)
  return beliefs.find(
    belief => belief.id === surface.cognition.beliefLedger?.focusBeliefId,
  ) ?? beliefs[0] ?? null
}

function pickLeadingGoal(surface: AlicizationDigitalLifeRuntimeSurface) {
  const goals = asArray(surface.memory.goalStack?.alicizationGoals)
  return goals.find(
    goal => goal.id === surface.memory.goalStack?.leadingAlicizationGoalId,
  ) ?? goals[0] ?? null
}

function pickResurfacingDesire(surface: AlicizationDigitalLifeRuntimeSurface) {
  const desires = asArray(surface.memory.desireMemory?.activeDesires)
  return desires.find(
    desire => desire.id === surface.memory.desireMemory?.resurfacingDesireId,
  ) ?? desires[0] ?? null
}

function pickDominantConcern(surface: AlicizationDigitalLifeRuntimeSurface) {
  return surface.memory.concerns?.[0] ?? null
}

function pickPrimaryInquiry(surface: AlicizationDigitalLifeRuntimeSurface) {
  const inquiries = asArray(surface.agency.inquiryLoop?.inquiries)
  return inquiries.find(
    inquiry => inquiry.id === surface.agency.inquiryLoop?.primaryInquiryId,
  ) ?? inquiries[0] ?? null
}

function pickDominantIntention(surface: AlicizationDigitalLifeRuntimeSurface) {
  const intentions = asArray(surface.agency.selfGovernor?.activeIntentions)
  return intentions.find(
    intention => intention.id === surface.agency.selfGovernor?.dominantIntentionId,
  ) ?? intentions[0] ?? null
}

function toSubsystemState(score: number): AlicizationDigitalLifeSubsystemState {
  if (score >= 0.72)
    return 'hot'
  if (score >= 0.38)
    return 'warm'
  return 'idle'
}

function formatSubsystemState(state: AlicizationDigitalLifeSubsystemState) {
  if (state === 'hot')
    return 'HOT'
  if (state === 'warm')
    return 'WARM'
  return 'IDLE'
}

function isAutonomyActionMode(mode: string | null | undefined) {
  return mode === 'prepare-act' || mode === 'act'
}

function isAutonomySpeechMode(mode: string | null | undefined) {
  return mode === 'whisper' || mode === 'speak' || mode === 'warn'
}

function buildPerceptionSubsystem(surface: AlicizationDigitalLifeRuntimeSurface): AlicizationDigitalLifeSubsystemSnapshot {
  const scene = surface.perception.currentScene
  const attention = surface.perception.attention
  const capture = surface.perception.captureState
  const captureScore = capture?.permission === 'granted' && capture.health === 'healthy'
    ? 0.72
    : capture?.permission === 'granted'
      ? 0.55
      : capture?.permission === 'prompt'
        ? 0.4
        : capture?.health === 'degraded'
          ? 0.28
          : 0.12
  const score = clamp01(Math.max(
    scene?.confidence ?? 0,
    attention?.confidence ?? 0,
    captureScore,
  ))
  const focus = firstNonEmptyText(
    scene?.summary,
    attention?.target?.title,
    attention?.target?.appName,
    scene?.scenario,
  ) || null

  return {
    id: 'perception',
    state: toSubsystemState(score),
    score,
    focus,
    summary: [
      `watch=${surface.perception.watchMode}`,
      scene?.scenario ? `scene=${sanitizeText(scene.scenario, 48)}` : '',
      focus ? `focus=${sanitizeText(focus, 72)}` : '',
      capture ? `capture=${capture.permission}/${capture.health}` : 'capture=unknown',
    ].filter(Boolean).join(' | '),
    reasons: [
      scene?.scenario ? `scene:${sanitizeText(scene.scenario, 48)}` : 'scene:none',
      attention?.source ? `attention:${sanitizeText(attention.source, 48)}` : 'attention:none',
      capture ? `capture:${capture.permission}/${capture.health}` : 'capture:unknown',
    ],
  }
}

function buildDialogueSubsystem(surface: AlicizationDigitalLifeRuntimeSurface): AlicizationDigitalLifeSubsystemSnapshot {
  const encounter = surface.dialogue.dialogueEncounter
  const replyDeliberation = surface.dialogue.replyDeliberation
  const answerPlanner = surface.dialogue.answerPlanner
  const score = clamp01(Math.max(
    encounter?.confidence ?? 0,
    replyDeliberation?.confidence ?? 0,
    answerPlanner?.confidence ?? 0,
    replyDeliberation?.shouldSpeak ? 0.9 : 0,
    answerPlanner?.shouldAskForGrounding ? 0.74 : 0,
  ))
  const focus = firstNonEmptyText(
    answerPlanner?.governingFocus,
    encounter?.summary,
    surface.dialogue.discourseState?.primaryTurnAnchor,
    answerPlanner?.answerIntent,
  ) || null

  return {
    id: 'dialogue',
    state: toSubsystemState(score),
    score,
    focus,
    summary: [
      encounter?.subject ? `subject=${encounter.subject}` : '',
      encounter?.act ? `act=${encounter.act}` : '',
      answerPlanner?.answerIntent ? `intent=${sanitizeText(answerPlanner.answerIntent, 48)}` : '',
      replyDeliberation ? `speak=${replyDeliberation.shouldSpeak ? 'true' : 'false'}` : '',
      focus ? `focus=${sanitizeText(focus, 72)}` : '',
    ].filter(Boolean).join(' | '),
    reasons: [
      encounter?.responseNeed ? `need:${encounter.responseNeed}` : 'need:none',
      answerPlanner?.act ? `answer:${answerPlanner.act}` : 'answer:none',
      replyDeliberation?.speakingFrom ? `from:${replyDeliberation.speakingFrom}` : 'from:none',
    ],
  }
}

function buildProactiveSubsystem(surface: AlicizationDigitalLifeRuntimeSurface): AlicizationDigitalLifeSubsystemSnapshot {
  const privateThought = surface.cognition.privateThought
  const initiative = surface.agency.initiative
  const autonomy = surface.agency.autonomy
  const concern = pickDominantConcern(surface)
  const desire = pickResurfacingDesire(surface)
  const score = clamp01(Math.max(
    privateThought?.shouldSpeak ? privateThought.confidence : 0,
    initiative?.shouldSpeak ? Math.max(initiative.confidence, initiative.speakDrive ?? 0) : 0,
    autonomy?.shouldSpeak
      ? Math.max(autonomy.speakReadiness, autonomy.confidence)
      : isAutonomySpeechMode(autonomy?.selectedMode)
        ? Math.max(autonomy?.speakReadiness ?? 0, 0.66)
        : 0,
    concern ? Math.max(concern.tension, concern.careWeight) * 0.88 : 0,
    desire ? desire.strength * 0.82 : 0,
    surface.agency.selfState?.desireToSpeak ?? 0,
  ))
  const focus = firstNonEmptyText(
    autonomy?.whyNow,
    autonomy?.executionIntent?.summary,
    privateThought?.thoughtText,
    concern?.summary,
    desire?.reason,
    initiative?.why,
  ) || null

  return {
    id: 'proactive',
    state: toSubsystemState(score),
    score,
    focus,
    summary: [
      autonomy?.selectedMode ? `autonomy=${autonomy.selectedMode}` : '',
      initiative?.selectedAction ? `action=${initiative.selectedAction}` : '',
      initiative?.preferredStyle ? `style=${initiative.preferredStyle}` : '',
      concern ? `concern=${sanitizeText(concern.summary, 64)}` : '',
      desire ? `desire=${sanitizeText(desire.reason, 64)}` : '',
      privateThought?.shouldSpeak ? 'private-thought=surface' : '',
    ].filter(Boolean).join(' | '),
    reasons: [
      autonomy?.selectedMode ? `autonomy:${autonomy.selectedMode}` : 'autonomy:none',
      initiative?.shouldSpeak ? 'initiative:speak' : 'initiative:hold',
      concern ? `concern:${concern.kind}` : 'concern:none',
      desire ? `desire:${desire.kind}` : 'desire:none',
    ],
  }
}

function buildControlSubsystem(surface: AlicizationDigitalLifeRuntimeSurface): AlicizationDigitalLifeSubsystemSnapshot {
  const initiative = surface.agency.initiative
  const autonomy = surface.agency.autonomy
  const actionEcology = surface.agency.actionEcology
  const primaryInquiry = pickPrimaryInquiry(surface)
  const intention = pickDominantIntention(surface)
  const score = clamp01(Math.max(
    actionEcology?.readiness ?? 0,
    surface.agency.deliberationState?.readiness ?? 0,
    isAutonomyActionMode(autonomy?.selectedMode)
      ? Math.max(
          autonomy?.actReadiness ?? 0,
          autonomy?.confidence ?? 0,
          autonomy?.shouldAct ? 0.92 : 0.74,
        )
      : 0,
    initiative?.selectedAction && initiative.selectedAction !== 'wait' ? initiative.confidence : 0,
    intention ? Math.max(intention.urgency, intention.confidence) * 0.9 : 0,
    primaryInquiry ? primaryInquiry.confidence * 0.78 : 0,
  ))
  const focus = firstNonEmptyText(
    autonomy?.executionIntent?.summary,
    autonomy?.whyNow,
    intention?.summary,
    actionEcology?.why,
    primaryInquiry?.question,
    initiative?.why,
  ) || null

  return {
    id: 'control',
    state: toSubsystemState(score),
    score,
    focus,
    summary: [
      autonomy?.selectedMode ? `autonomy=${autonomy.selectedMode}` : '',
      initiative?.selectedAction ? `action=${initiative.selectedAction}` : '',
      autonomy?.executionIntent?.kind ? `intent=${sanitizeText(autonomy.executionIntent.kind, 56)}` : '',
      actionEcology?.mode ? `ecology=${actionEcology.mode}` : '',
      intention ? `intention=${sanitizeText(intention.title, 56)}` : '',
      primaryInquiry ? `inquiry=${sanitizeText(primaryInquiry.question, 56)}` : '',
      actionEcology ? `surface=${actionEcology.shouldSurface ? 'true' : 'false'}` : '',
    ].filter(Boolean).join(' | '),
    reasons: [
      autonomy?.selectedMode ? `autonomy:${autonomy.selectedMode}` : 'autonomy:none',
      actionEcology ? `ecology:${actionEcology.mode}` : 'ecology:none',
      intention ? `drive:${intention.drive}` : 'drive:none',
      primaryInquiry ? `inquiry:${primaryInquiry.kind}` : 'inquiry:none',
    ],
  }
}

function buildMindSubsystem(surface: AlicizationDigitalLifeRuntimeSurface): AlicizationDigitalLifeSubsystemSnapshot {
  const worldModel = surface.world.worldModel
  const mindKernel = surface.cognition.mindKernel
  const focusBelief = pickFocusBelief(surface)
  const score = clamp01(Math.max(
    worldModel?.activeThread ? Math.max(worldModel.activeThread.significance, worldModel.activeThread.confidence) : 0,
    surface.cognition.subjectiveInference?.confidence ?? 0,
    focusBelief ? Math.max(focusBelief.confidence, focusBelief.salience) : 0,
    mindKernel
      ? Math.max(
          mindKernel.worldPressure,
          mindKernel.epistemicPressure,
          mindKernel.relationalPressure,
          mindKernel.speakReadiness,
        )
      : 0,
    surface.dialogue.currentConsciousFrame?.confidence ?? 0,
  ))
  const focus = firstNonEmptyText(
    worldModel?.activeThread?.summary,
    surface.cognition.subjectiveInference?.dominantInterpretation,
    focusBelief?.statement,
    mindKernel?.narrative?.[0],
  ) || null

  return {
    id: 'mind',
    state: toSubsystemState(score),
    score,
    focus,
    summary: [
      mindKernel?.dominantMode ? `mode=${mindKernel.dominantMode}` : '',
      mindKernel?.dominantDrive ? `drive=${mindKernel.dominantDrive}` : '',
      worldModel?.epistemicState?.certainty ? `certainty=${worldModel.epistemicState.certainty}` : '',
      worldModel?.activeThread ? `thread=${sanitizeText(worldModel.activeThread.title, 64)}` : '',
      focus ? `focus=${sanitizeText(focus, 72)}` : '',
    ].filter(Boolean).join(' | '),
    reasons: [
      worldModel?.activeThread?.kind ? `thread:${worldModel.activeThread.kind}` : 'thread:none',
      focusBelief?.scope ? `belief:${focusBelief.scope}` : 'belief:none',
      surface.cognition.subjectiveInference?.source ? `inference:${surface.cognition.subjectiveInference.source}` : 'inference:none',
    ],
  }
}

function buildMemorySubsystem(surface: AlicizationDigitalLifeRuntimeSurface): AlicizationDigitalLifeSubsystemSnapshot {
  const leadingGoal = pickLeadingGoal(surface)
  const concern = pickDominantConcern(surface)
  const recallGovernor = surface.memory.recallGovernor
  const reflectionCount = surface.memory.reflectionLedger?.entries.length ?? 0
  const workingMemoryEpisodes = asArray(surface.memory.workingMemoryEpisodes)
  const score = clamp01(Math.max(
    workingMemoryEpisodes.length > 0
      ? Math.min(0.72, 0.34 + workingMemoryEpisodes.length * 0.08)
      : 0,
    leadingGoal ? Math.max(leadingGoal.urgency, leadingGoal.confidence) * 0.84 : 0,
    concern ? Math.max(concern.tension, concern.confidence) * 0.76 : 0,
    reflectionCount > 0 ? Math.min(0.7, 0.36 + reflectionCount * 0.07) : 0,
    recallGovernor
      ? (recallGovernor.mode === 'none' ? 0.22 : recallGovernor.suppressAssociativeRecall ? 0.58 : 0.68)
      : 0,
    surface.memory.thoughtThreads?.foregroundThreadId ? 0.62 : 0,
  ))
  const focus = firstNonEmptyText(
    leadingGoal?.label,
    concern?.summary,
    recallGovernor?.recallSeed,
    workingMemoryEpisodes[0]?.summary,
  ) || null

  return {
    id: 'memory',
    state: toSubsystemState(score),
    score,
    focus,
    summary: [
      leadingGoal ? `goal=${sanitizeText(leadingGoal.label, 64)}` : '',
      concern ? `concern=${sanitizeText(concern.summary, 64)}` : '',
      recallGovernor ? `recall=${recallGovernor.mode}` : '',
      workingMemoryEpisodes.length > 0 ? `episodes=${workingMemoryEpisodes.length}` : '',
      reflectionCount > 0 ? `reflections=${reflectionCount}` : '',
    ].filter(Boolean).join(' | '),
    reasons: [
      leadingGoal ? `goal:${leadingGoal.kind}` : 'goal:none',
      recallGovernor ? `recall:${recallGovernor.mode}` : 'recall:none',
      reflectionCount > 0 ? 'reflection:active' : 'reflection:none',
    ],
  }
}

function buildRuntimeSubsystem(surface: AlicizationDigitalLifeRuntimeSurface): AlicizationDigitalLifeSubsystemSnapshot {
  const score = clamp01(Math.max(
    surface.perception.updatedAt > 0 ? 0.56 : 0,
    surface.perception.recentTransition ? 0.82 : 0,
    surface.perception.durabilityPulse ? 0.72 : 0,
    surface.perception.nextSuggestedProbeMs > 0 ? 0.48 : 0,
  ))
  const focus = firstNonEmptyText(
    surface.perception.recentTransition?.reason,
    surface.perception.currentScene?.summary,
    surface.perception.watchMode,
  ) || null

  return {
    id: 'runtime',
    state: toSubsystemState(score),
    score,
    focus,
    summary: [
      `watch=${surface.perception.watchMode}`,
      `next-probe=${summarizeMs(surface.perception.nextSuggestedProbeMs)}`,
      surface.perception.recentTransition ? `transition=${sanitizeText(surface.perception.recentTransition.reason, 64)}` : '',
      surface.perception.durabilityPulse ? `durability=${surface.perception.durabilityPulse.kind}` : '',
    ].filter(Boolean).join(' | '),
    reasons: [
      surface.perception.recentTransition ? 'transition:active' : 'transition:none',
      surface.perception.durabilityPulse ? `durability:${surface.perception.durabilityPulse.kind}` : 'durability:none',
      `watch:${surface.perception.watchMode}`,
    ],
  }
}

function deriveOperatingMode(input: {
  dominantSystem: AlicizationDigitalLifeSubsystemId
  systems: Record<AlicizationDigitalLifeSubsystemId, AlicizationDigitalLifeSubsystemSnapshot>
  surface: AlicizationDigitalLifeRuntimeSurface
}) {
  const { dominantSystem, systems } = input
  const dialogue = systems.dialogue
  const control = systems.control
  const memory = systems.memory
  const perception = systems.perception
  const autonomy = input.surface.agency.autonomy

  if (isAutonomyActionMode(autonomy?.selectedMode))
    return 'acting' as const
  if (autonomy?.shouldSpeak || isAutonomySpeechMode(autonomy?.selectedMode))
    return 'speaking' as const
  if (dialogue.score >= 0.72)
    return 'speaking' as const
  if (control.score >= 0.72)
    return 'acting' as const
  if (memory.score >= 0.72 && memory.score >= perception.score)
    return 'remembering' as const
  if (dominantSystem === 'perception')
    return 'observing' as const
  return 'thinking' as const
}

function rankSubsystems(systems: Record<AlicizationDigitalLifeSubsystemId, AlicizationDigitalLifeSubsystemSnapshot>) {
  return Object.values(systems)
    .slice()
    .sort((left, right) => right.score - left.score)
}

function resolveDominantSubsystem(
  systems: Record<AlicizationDigitalLifeSubsystemId, AlicizationDigitalLifeSubsystemSnapshot>,
  autonomy: AlicizationDigitalLifeRuntimeSurface['agency']['autonomy'],
) {
  const ranked = rankSubsystems(systems)
  const top = ranked[0]
  if (!top)
    return null

  // When Alicization is actively speaking, dialogue should outrank passive
  // sensing if the two are close enough, otherwise the "alive" line drifts
  // back to a mere screenshot classifier.
  if (systems.dialogue.score >= 0.72 && systems.dialogue.score >= systems.perception.score - 0.08)
    return systems.dialogue

  // Likewise, once an action/control loop is materially live, it should be
  // allowed to dominate over adjacent cognitive systems instead of being
  // flattened into generic "mind" activity.
  if (
    isAutonomyActionMode(autonomy?.selectedMode)
    && systems.control.score >= top.score - 0.08
  ) {
    return systems.control
  }
  if (systems.control.score >= 0.72 && systems.control.score >= top.score - 0.05)
    return systems.control

  return top
}

function supportPreferenceBoost(
  dominantSystem: AlicizationDigitalLifeSubsystemId,
  candidateSystem: AlicizationDigitalLifeSubsystemId,
) {
  if (dominantSystem === 'dialogue') {
    if (candidateSystem === 'mind')
      return 0.12
    if (candidateSystem === 'control')
      return 0.1
    if (candidateSystem === 'proactive')
      return 0.08
    if (candidateSystem === 'memory')
      return 0.04
    if (candidateSystem === 'perception')
      return -0.02
    if (candidateSystem === 'runtime')
      return -0.04
  }

  if (dominantSystem === 'control') {
    if (candidateSystem === 'mind')
      return 0.1
    if (candidateSystem === 'dialogue')
      return 0.08
    if (candidateSystem === 'proactive')
      return 0.06
  }

  if (dominantSystem === 'memory') {
    if (candidateSystem === 'mind')
      return 0.08
    if (candidateSystem === 'dialogue')
      return 0.06
  }

  return 0
}

function deriveClosureAudit(surface: AlicizationDigitalLifeRuntimeSurface) {
  const projectState = resolveAlicizationProjectStateBrief()
  const currentPhase = sanitizeText(projectState.currentPhase, 120) || null
  const primaryOpenLoop = sanitizeText(projectState.openLoops[0] ?? '', 180) || null
  const selfAuthoritySummary = sanitizeText(
    surface.memory.personStateProjection?.selfContinuityAuthority?.authoritySummary ?? '',
    180,
  ) || null
  const activeClosurePressures = [
    surface.agency.habitPolicy?.returnViaRecheck ? 'habit:return-via-recheck' : '',
    surface.agency.actionEcology?.mode ? `ecology:${surface.agency.actionEcology.mode}` : '',
    surface.cognition.privateThought?.stance ? `private-thought:${surface.cognition.privateThought.stance}` : '',
    surface.agency.autonomy?.selectedMode ? `autonomy:${surface.agency.autonomy.selectedMode}` : '',
    surface.dialogue.responseCharter?.relationshipPosture ? `charter:${surface.dialogue.responseCharter.relationshipPosture}` : '',
  ].filter(Boolean)

  return {
    currentPhase,
    primaryOpenLoop,
    activeClosurePressures,
    selfAuthoritySummary,
    summary: [
      currentPhase ? `phase=${currentPhase}` : '',
      primaryOpenLoop ? `open-loop=${sanitizeText(primaryOpenLoop, 96)}` : '',
      selfAuthoritySummary ? `project_anchor=${sanitizeText(selfAuthoritySummary, 96)}` : '',
      activeClosurePressures.length > 0 ? `shaping=${activeClosurePressures.join(',')}` : '',
    ].filter(Boolean).join(' | '),
  }
}

export function buildAlicizationDigitalLifeArchitecture(
  surface: AlicizationDigitalLifeRuntimeSurface | null | undefined,
): AlicizationDigitalLifeArchitectureSnapshot | null {
  if (!surface)
    return null

  const normalizedSurface = normalizeSparseDigitalLifeRuntimeSurface(surface)

  const systems: Record<AlicizationDigitalLifeSubsystemId, AlicizationDigitalLifeSubsystemSnapshot> = {
    dialogue: buildDialogueSubsystem(normalizedSurface),
    perception: buildPerceptionSubsystem(normalizedSurface),
    proactive: buildProactiveSubsystem(normalizedSurface),
    control: buildControlSubsystem(normalizedSurface),
    mind: buildMindSubsystem(normalizedSurface),
    memory: buildMemorySubsystem(normalizedSurface),
    runtime: buildRuntimeSubsystem(normalizedSurface),
  }
  const ranked = rankSubsystems(systems)
  const dominant = resolveDominantSubsystem(systems, normalizedSurface.agency.autonomy)
  if (!dominant)
    return null

  const supportingSystems = ranked
    .filter(system => system.id !== dominant.id)
    .sort((left, right) => {
      const leftScore = left.score + supportPreferenceBoost(dominant.id, left.id)
      const rightScore = right.score + supportPreferenceBoost(dominant.id, right.id)
      return rightScore - leftScore
    })
    .slice(0, 2)
    .filter(system => system.score >= 0.38)
    .map(system => system.id)
  const operatingMode = deriveOperatingMode({
    dominantSystem: dominant.id,
    systems,
    surface: normalizedSurface,
  })
  const governingFocus = dominant.focus
    ?? ranked.find(system => system.focus)?.focus
    ?? null
  const closureAudit = deriveClosureAudit(normalizedSurface)

  return {
    version: 'digital-life-architecture-v1',
    operatingMode,
    dominantSystem: dominant.id,
    supportingSystems,
    governingFocus,
    summary: [
      `mode=${operatingMode}`,
      `dominant=${dominant.id}`,
      supportingSystems.length > 0 ? `support=${supportingSystems.join(',')}` : '',
      closureAudit.summary ? `closure=${sanitizeText(closureAudit.summary, 120)}` : '',
      governingFocus ? `focus=${sanitizeText(governingFocus, 96)}` : '',
    ].filter(Boolean).join(' | '),
    closureAudit,
    systems,
  }
}

export function buildAlicizationDigitalLifeArchitectureSystemBlock(
  architecture: AlicizationDigitalLifeArchitectureSnapshot | null | undefined,
) {
  if (!architecture)
    return ''

  const ranked = rankSubsystems(architecture.systems)
  return [
    '[ALICIZATION_DIGITAL_LIFE_ARCHITECTURE]',
    `operating_mode=${architecture.operatingMode}`,
    `dominant_system=${architecture.dominantSystem}`,
    `supporting_systems=${architecture.supportingSystems.join(',') || 'none'}`,
    `governing_focus=${sanitizeText(architecture.governingFocus ?? '', 180) || 'none'}`,
    architecture.closureAudit?.summary
      ? `project_state_closure=${sanitizeText(architecture.closureAudit.summary, 220)}`
      : '',
    architecture.closureAudit?.selfAuthoritySummary
      ? `same_her_self_authority=${sanitizeText(architecture.closureAudit.selfAuthoritySummary, 220)}`
      : '',
    'subsystems:',
    ...ranked.map(system => [
      `- [${formatSubsystemState(system.state)} ${system.score.toFixed(2)}] ${system.id}`,
      system.summary ? ` :: ${sanitizeText(system.summary, 220)}` : '',
      system.reasons.length > 0 ? ` :: ${system.reasons.join(', ')}` : '',
    ].join('')),
    'architecture_spine.role=live_session',
    'architecture_spine.identity_scope=single_runtime',
    'architecture_spine.parallel_story_drift=blocked',
  ].join('\n')
}
