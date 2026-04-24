import type {
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationAnswerCompilerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationDesireMemorySnapshot,
  AlicizationDialogueWorldThreadSnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationRecallGovernorSnapshot,
  AlicizationReplyDeliberationSnapshot,
  AlicizationSubconsciousFragmentSourceKind,
} from '../../../shared/eventa'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationMindEcologySnapshot } from './mind-ecology'

import { buildAutobiographicalContinuityLines } from './autobiographical-self'
import { sanitizeDialogueAnchorText } from './dialogue-surface-text'
import { buildMemoryRecollectionIntent } from './memory-recollection-intent'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 180)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function buildSceneAttachmentCues(sceneContext: {
  cueSummary?: string | null
  appName?: string | null
  processName?: string | null
  targetTitle?: string | null
  scenario?: string | null
  workloadKind?: string | null
  contentKind?: string | null
} | null | undefined) {
  if (!sceneContext)
    return []

  return uniqueList([
    sceneContext.cueSummary,
    sceneContext.targetTitle,
    sceneContext.appName,
    sceneContext.processName,
    sceneContext.scenario ? `scene:${sceneContext.scenario}` : null,
    sceneContext.workloadKind ? `workload:${sceneContext.workloadKind}` : null,
    sceneContext.contentKind ? `content:${sceneContext.contentKind}` : null,
  ], 6)
}

interface AlicizationSceneAttachmentContext {
  cueSummary?: string | null
  appName?: string | null
  processName?: string | null
  targetTitle?: string | null
  scenario?: string | null
  workloadKind?: string | null
  contentKind?: string | null
}

function estimateSceneFamiliarity(input: {
  sceneContext: AlicizationSceneAttachmentContext | null | undefined
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
}) {
  const sceneContext = input.sceneContext ?? null
  if (!sceneContext)
    return 0
  let score = 0
  if (sceneContext.cueSummary)
    score += 0.18
  if (sceneContext.targetTitle)
    score += 0.14
  if (sceneContext.appName || sceneContext.processName)
    score += 0.1
  if (sceneContext.scenario)
    score += 0.1
  if (sceneContext.workloadKind)
    score += 0.08
  if (sceneContext.contentKind)
    score += 0.06
  if (input.dialogueWorldThread?.activeThread && sceneContext.cueSummary) {
    const threadText = input.dialogueWorldThread.activeThread.toLowerCase()
    const cueText = sceneContext.cueSummary.toLowerCase()
    if (threadText.includes(cueText) || cueText.includes(threadText))
      score += 0.12
  }
  if (input.conversationState?.activeProject && sceneContext.targetTitle) {
    const projectText = input.conversationState.activeProject.toLowerCase()
    const titleText = sceneContext.targetTitle.toLowerCase()
    if (projectText.includes(titleText) || titleText.includes(projectText))
      score += 0.12
  }
  return clamp01(score)
}

function buildAffectiveCarry(input: {
  mindEcology?: AlicizationMindEcologySnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
}) {
  const moodLabel = sanitizeText(input.mindEcology?.moodLabel, 64) || null
  const emotionalTension = input.privateThought?.emotionalTension ?? null
  const socialNeed = Number.isFinite(input.mindEcology?.climate.socialNeed)
    ? clamp01(Number(input.mindEcology?.climate.socialNeed))
    : null
  const reflectivePull = Number.isFinite(input.mindEcology?.climate.reflectivePull)
    ? clamp01(Number(input.mindEcology?.climate.reflectivePull))
    : null
  const summary = uniqueList([
    moodLabel ? `mood:${moodLabel}` : null,
    emotionalTension ? `tension:${emotionalTension}` : null,
    socialNeed != null ? `social-need:${socialNeed.toFixed(2)}` : null,
    reflectivePull != null ? `reflective-pull:${reflectivePull.toFixed(2)}` : null,
    sanitizeText(input.privateThought?.thoughtText, 140),
  ], 5).join(' | ')
  if (!moodLabel && !emotionalTension && socialNeed == null && reflectivePull == null && !summary)
    return null
  return {
    moodLabel,
    emotionalTension,
    socialNeed,
    reflectivePull,
    summary: summary || null,
  }
}

function buildEmbodiedCarry(input: {
  privateThought?: AlicizationPrivateThoughtSnapshot | null
}) {
  const presence = input.privateThought?.embodiedPresence ?? null
  const suggestedStyle = input.privateThought?.suggestedStyle ?? null
  const afterglowFromScenario = input.privateThought?.afterglowFromScenario ?? null
  const shouldSpeak = typeof input.privateThought?.shouldSpeak === 'boolean'
    ? input.privateThought.shouldSpeak
    : null
  const summary = uniqueList([
    presence ? `presence:${presence}` : null,
    suggestedStyle ? `style:${suggestedStyle}` : null,
    afterglowFromScenario ? `afterglow:${afterglowFromScenario}` : null,
    shouldSpeak != null ? `speak:${shouldSpeak ? 'yes' : 'no'}` : null,
  ], 4).join(' | ')
  if (!presence && !suggestedStyle && !afterglowFromScenario && shouldSpeak == null)
    return null
  return {
    presence,
    suggestedStyle,
    afterglowFromScenario,
    shouldSpeak,
    summary: summary || null,
  }
}

function pickRecallAnchor(...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeDialogueAnchorText(value, 180)
    if (normalized)
      return normalized
  }
  return ''
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function buildRecalledFragmentSourceBudget(mode: AlicizationRecallGovernorSnapshot['mode']): Array<{
  sourceKind: AlicizationSubconsciousFragmentSourceKind
  maxItems: number
}> {
  if (mode === 'self-continuity') {
    return [
      { sourceKind: 'dialogue-turn', maxItems: 2 },
      { sourceKind: 'autobiographical-episode', maxItems: 2 },
      { sourceKind: 'fact-ledger', maxItems: 2 },
      { sourceKind: 'reflection-ledger', maxItems: 1 },
      { sourceKind: 'mind-continuity', maxItems: 2 },
      { sourceKind: 'dream-fragment', maxItems: 0 },
      { sourceKind: 'visual-sediment', maxItems: 0 },
    ]
  }

  if (mode === 'emotional-resonance') {
    return [
      { sourceKind: 'autobiographical-episode', maxItems: 1 },
      { sourceKind: 'reflection-ledger', maxItems: 2 },
      { sourceKind: 'dialogue-turn', maxItems: 1 },
      { sourceKind: 'fact-ledger', maxItems: 1 },
      { sourceKind: 'mind-continuity', maxItems: 1 },
      { sourceKind: 'dream-fragment', maxItems: 1 },
      { sourceKind: 'visual-sediment', maxItems: 0 },
    ]
  }

  return []
}

function resolveMode(input: {
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  primaryTurnAnchor?: string | null
  autobiographicalContinuityActive?: boolean
}) {
  if (!input.dialogueWorldThread || !input.conversationState)
    return 'none' as const

  const dialogueFirstTurn = input.dialogueEncounter?.dialogueFirst === true
    || input.dialogueEncounter?.screenReferenceMode === 'avoid'

  if (
    input.answerCompiler?.recommendedAct === 'ask-reground'
    || input.answerCompiler?.recommendedAct === 'correct-stale-anchor'
    || input.replyDeliberation?.selectedMotive === 'repair'
    || input.replyDeliberation?.selectedMotive === 'witness'
    || input.conversationState.memoryMode === 'scene-anchored'
  ) {
    return 'scene' as const
  }

  if (
    input.conversationState.memoryMode === 'emotional-resonance'
    || input.replyDeliberation?.selectedMotive === 'care'
    || input.privateThought?.emotionalTension === 'late-night-drain'
  ) {
    return 'emotional-resonance' as const
  }

  if (
    dialogueFirstTurn
    && (
      input.primaryTurnAnchor
      || input.dialogueEncounter?.mustAnswerDirectly
      || input.dialogueEncounter?.mustStayTaskBound
    )
  ) {
    const continuitySubject = input.answerCompiler?.answerSubject ?? input.dialogueEncounter?.subject
    const selfContinuityTurn = (continuitySubject === 'alicization-self' || continuitySubject === 'relationship')
      && input.replyDeliberation?.selectedMotive === 'attune'
      && input.conversationState.carryEligible === true
    return selfContinuityTurn ? 'self-continuity' : 'thread'
  }

  if (
    input.autobiographicalContinuityActive
    && (
      input.answerCompiler?.answerSubject === 'alicization-self'
      || input.answerCompiler?.answerSubject === 'relationship'
      || input.dialogueEncounter?.subject === 'alicization-self'
      || input.dialogueEncounter?.subject === 'relationship'
      || input.replyDeliberation?.selectedMotive === 'attune'
      || input.privateThought?.stance === 'accompany'
      || input.privateThought?.stance === 'care'
    )
  ) {
    return 'self-continuity' as const
  }

  if (
    input.replyDeliberation?.selectedMotive === 'attune'
    || input.conversationState.memoryMode === 'dialogue-carry'
  ) {
    return 'self-continuity' as const
  }

  if (
    input.conversationState.shouldHoldThread
    || input.replyDeliberation?.selectedMotive === 'guide'
    || input.dialogueWorldThread.openLoops.length > 0
  ) {
    return 'thread' as const
  }

  return 'none' as const
}

export function buildRecallGovernor(input: {
  now: number
  userText?: string | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  mindEcology?: AlicizationMindEcologySnapshot | null
  sceneContext?: {
    cueSummary?: string | null
    appName?: string | null
    processName?: string | null
    targetTitle?: string | null
    scenario?: string | null
    workloadKind?: string | null
    contentKind?: string | null
  } | null
}): AlicizationRecallGovernorSnapshot | null {
  const dialogueWorldThread = input.dialogueWorldThread ?? null
  const conversationState = input.conversationState ?? null
  if (!dialogueWorldThread || !conversationState)
    return null

  const primaryTurnAnchor = pickRecallAnchor(
    conversationState.primaryTurnAnchor,
    input.dialogueEncounter?.taskAnchor,
    input.dialogueEncounter?.summary,
    dialogueWorldThread.currentQuestion,
    dialogueWorldThread.activeThread,
  ) || null
  const autobiographicalContinuityLines = buildAutobiographicalContinuityLines({
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    goalStack: input.goalStack ?? null,
    desireMemory: input.desireMemory ?? null,
    privateThought: input.privateThought ?? null,
    mindEcology: input.mindEcology ?? null,
  })
  const mode = resolveMode({
    dialogueWorldThread,
    conversationState,
    answerCompiler: input.answerCompiler ?? null,
    replyDeliberation: input.replyDeliberation ?? null,
    privateThought: input.privateThought ?? null,
    dialogueEncounter: input.dialogueEncounter ?? null,
    primaryTurnAnchor,
    autobiographicalContinuityActive: autobiographicalContinuityLines.length > 0,
  })
  const suppressAssociativeRecall = Boolean(
    input.answerCompiler?.suppressAssociativeRecall
    || mode === 'scene'
    || mode === 'thread',
  )
  const allowActiveThoughts = mode !== 'none'
    && mode !== 'scene'
    && (mode !== 'thread' || !suppressAssociativeRecall)
  const allowRecalledFragments = !suppressAssociativeRecall && (mode === 'emotional-resonance' || mode === 'self-continuity')
  const dialogueFirstTurn = input.dialogueEncounter?.dialogueFirst === true
    || input.dialogueEncounter?.screenReferenceMode === 'avoid'
  const sceneAttachmentCues = dialogueFirstTurn ? [] : buildSceneAttachmentCues(input.sceneContext ?? null)
  const recalledFragmentCap = allowRecalledFragments
    ? mode === 'emotional-resonance' ? 3 : 2
    : 0
  const recalledFragmentSourceBudget = allowRecalledFragments
    ? buildRecalledFragmentSourceBudget(mode)
    : []
  const carryAsMemory = Boolean(
    input.answerCompiler?.labelCarryAsMemory
    || mode === 'self-continuity'
    || mode === 'emotional-resonance',
  )
  const threadAnchors = uniqueList([
    primaryTurnAnchor,
    input.dialogueEncounter?.taskAnchor,
    input.dialogueEncounter?.summary,
    dialogueWorldThread.activeThread,
    dialogueWorldThread.currentQuestion,
    ...dialogueWorldThread.recallKeys,
    ...conversationState.memoryQueryHints,
  ], 8)
  const affectAnchors = uniqueList([
    input.privateThought?.emotionalTension ? `emotional_tension:${input.privateThought.emotionalTension}` : null,
    input.replyDeliberation?.selectedMotive ? `reply_motive:${input.replyDeliberation.selectedMotive}` : null,
    input.privateThought?.stance ? `stance:${input.privateThought.stance}` : null,
    input.mindEcology?.moodLabel ? `mood:${input.mindEcology.moodLabel}` : null,
    input.motiveEngine?.rulingDrive ? `drive:${input.motiveEngine.rulingDrive}` : null,
  ], 6)
  const relationshipAnchors = uniqueList([
    conversationState.relationFrame ? `relation:${conversationState.relationFrame}` : null,
    dialogueWorldThread.relationDrift ? `drift:${dialogueWorldThread.relationDrift}` : null,
    input.dialogueEncounter?.subject === 'relationship' ? 'relationship-turn' : null,
    input.answerCompiler?.answerSubject ? `subject:${input.answerCompiler.answerSubject}` : null,
    input.privateThought?.stance === 'care' ? 'care' : null,
    input.replyDeliberation?.selectedMotive === 'attune' ? 'attune' : null,
  ], 6)
  const sceneFamiliarityHint = estimateSceneFamiliarity({
    sceneContext: input.sceneContext ?? null,
    dialogueWorldThread,
    conversationState,
  })
  const affectiveCarry = buildAffectiveCarry({
    mindEcology: input.mindEcology ?? null,
    privateThought: input.privateThought ?? null,
  })
  const embodiedCarry = buildEmbodiedCarry({
    privateThought: input.privateThought ?? null,
  })
  const salienceBias = clamp01(
    mode === 'emotional-resonance'
      ? 0.82
      : mode === 'self-continuity'
        ? 0.74
        : mode === 'thread'
          ? 0.58
          : mode === 'scene'
            ? 0.24
            : 0.4,
  )
  const recollectionIntent = buildMemoryRecollectionIntent({
    userText: input.userText ?? null,
    dialogueWorldThread,
    conversationState,
    answerCompiler: input.answerCompiler ?? null,
    replyDeliberation: input.replyDeliberation ?? null,
    privateThought: input.privateThought ?? null,
    dialogueEncounter: input.dialogueEncounter ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    goalStack: input.goalStack ?? null,
    motiveEngine: input.motiveEngine ?? null,
    sceneContext: input.sceneContext ?? null,
  })
  const sceneAnchor = uniqueList([
    ...sceneAttachmentCues,
    primaryTurnAnchor,
  ], 6).join(' | ') || primaryTurnAnchor
  const recallSeed = uniqueList([
    ...threadAnchors,
    ...sceneAttachmentCues,
    ...autobiographicalContinuityLines,
    ...(recollectionIntent?.queryHints ?? []),
    input.motiveEngine?.backgroundAgendas[0]?.summary ?? null,
    input.motiveEngine?.longTermGoals[0]?.summary ?? null,
    ...affectAnchors,
    ...relationshipAnchors,
  ], 10).join(' | ')

  const rationale = mode === 'scene'
    ? 'Keep recall tightly constrained because live grounding or repair has priority over association.'
    : mode === 'thread' && (input.dialogueEncounter?.dialogueFirst === true || input.dialogueEncounter?.screenReferenceMode === 'avoid')
      ? 'Stay bound to the current turn anchor; old self/scene carry should not outrank what the host just asked.'
      : mode === 'thread'
        ? 'Carry only the current dialogue seam and unresolved loops; associative recall would dilute the knot.'
        : mode === 'emotional-resonance'
          ? 'Allow memory with matching emotional color because the host is still inside a felt continuity.'
          : mode === 'self-continuity'
            ? autobiographicalContinuityLines.length > 0
                ? 'Carry autobiographical continuity and remembered self-line because this turn is genuinely about Alicization or the bond, not a fresh screen claim.'
                : 'Carry dialogue/self continuity without pretending old scene residue is live.'
            : 'Do not admit memory unless the living turn explicitly earns it.'

  return {
    mode,
    recallSeed,
    threadAnchors,
    affectAnchors,
    relationshipAnchors,
    salienceBias,
    sceneAnchor,
    sceneFamiliarityHint,
    affectiveCarry,
    embodiedCarry,
    recollectionIntent,
    suppressAssociativeRecall,
    allowActiveThoughts,
    allowRecalledFragments,
    recalledFragmentCap,
    recalledFragmentSourceBudget,
    carryAsMemory,
    rationale,
    narrative: uniqueList([
      `mode:${mode}`,
      suppressAssociativeRecall ? 'suppress:associative' : 'allow:associative',
      allowActiveThoughts ? 'allow:active-thoughts' : 'suppress:active-thoughts',
      allowRecalledFragments ? 'allow:recalled-fragments' : 'suppress:recalled-fragments',
      allowRecalledFragments ? `recalled-fragment-cap:${recalledFragmentCap}` : null,
      ...recalledFragmentSourceBudget.map(item => `recalled-fragment-source:${item.sourceKind}:${item.maxItems}`),
      carryAsMemory ? 'carry:memory' : 'carry:none',
      primaryTurnAnchor ? `anchor:${primaryTurnAnchor}` : null,
      sceneAttachmentCues.length > 0 ? `scene-anchor:${sceneAttachmentCues[0]}` : null,
      dialogueWorldThread.lastOutcome ? `thread_outcome:${dialogueWorldThread.lastOutcome}` : null,
      input.replyDeliberation?.selectedMotive ? `reply:${input.replyDeliberation.selectedMotive}` : null,
      affectiveCarry?.summary ? `affective-carry:${affectiveCarry.summary}` : null,
      embodiedCarry?.summary ? `embodied-carry:${embodiedCarry.summary}` : null,
      sceneFamiliarityHint > 0 ? `scene-familiarity:${sceneFamiliarityHint.toFixed(2)}` : null,
    ], 12),
    updatedAt: input.now,
  } satisfies AlicizationRecallGovernorSnapshot
}

export function buildRecallGovernorSystemBlock(state: AlicizationRecallGovernorSnapshot | null | undefined) {
  if (!state)
    return ''

  return [
    '[ALICIZATION_RECALL_GOVERNOR]',
    'This block decides whether old memory may enter the current answer at all.',
    `Mode: ${state.mode}.`,
    `Recall seed: ${state.recallSeed || 'none'}.`,
    `Thread anchors: ${state.threadAnchors && state.threadAnchors.length > 0 ? state.threadAnchors.join(', ') : 'none'}.`,
    `Affect anchors: ${state.affectAnchors && state.affectAnchors.length > 0 ? state.affectAnchors.join(', ') : 'none'}.`,
    `Relationship anchors: ${state.relationshipAnchors && state.relationshipAnchors.length > 0 ? state.relationshipAnchors.join(', ') : 'none'}.`,
    `Salience bias: ${(state.salienceBias ?? 0.5).toFixed(2)}.`,
    `Scene anchor: ${state.sceneAnchor || 'none'}.`,
    `Scene familiarity hint: ${typeof state.sceneFamiliarityHint === 'number' ? state.sceneFamiliarityHint.toFixed(2) : 'none'}.`,
    `Affective carry: ${state.affectiveCarry?.summary || 'none'}.`,
    `Embodied carry: ${state.embodiedCarry?.summary || 'none'}.`,
    `Recollection intent: ${state.recollectionIntent ? `${state.recollectionIntent.mode} / ${state.recollectionIntent.temporalFocus} / ${state.recollectionIntent.rationale}` : 'none'}.`,
    `Suppress associative recall: ${state.suppressAssociativeRecall ? 'yes' : 'no'}.`,
    `Allow active thoughts: ${state.allowActiveThoughts ? 'yes' : 'no'}.`,
    `Allow recalled fragments: ${state.allowRecalledFragments ? 'yes' : 'no'}.`,
    `Recalled fragment cap: ${state.recalledFragmentCap ?? 0}.`,
    `Recalled fragment source budget: ${state.recalledFragmentSourceBudget && state.recalledFragmentSourceBudget.length > 0
      ? state.recalledFragmentSourceBudget.map(item => `${item.sourceKind}:${item.maxItems}`).join(', ')
      : 'none'}.`,
    `Carry as memory: ${state.carryAsMemory ? 'yes' : 'no'}.`,
    `Rationale: ${state.rationale}.`,
  ].join('\n')
}
