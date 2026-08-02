import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationAnswerCompilerSnapshot,
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationDesireMemorySnapshot,
  AlicizationDialogueWorldThreadSnapshot,
  AlicizationEmotionalKernelSnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationRecallGovernorSnapshot,
  AlicizationReplyDeliberationSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationMindEcologySnapshot } from './mind-ecology'
import type { AlicizationPersonalityContinuityStateSnapshot } from './personality-continuity-state'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'

import { buildAutobiographicalContinuityLines } from './autobiographical-self'
import { sanitizeDialogueAnchorText } from './dialogue-surface-text'
import { buildMemoryRecollectionIntent } from './memory-recollection-intent'
import { resolveAlicizationRecallFragmentBudget } from './recall-governor-budget'

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
  personalityContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
}) {
  const rhythmState = input.personalityContinuityState?.rhythmState ?? null
  const moodLabel = sanitizeText(rhythmState?.moodLabel ?? input.mindEcology?.moodLabel, 64) || null
  const emotionalTension = rhythmState?.emotionalTension ?? input.privateThought?.emotionalTension ?? null
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
    rhythmState?.summary ? `rhythm:${rhythmState.summary}` : null,
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
  personalityContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
}) {
  const rhythmState = input.personalityContinuityState?.rhythmState ?? null
  const presence = input.privateThought?.embodiedPresence ?? rhythmState?.embodiedPresence ?? null
  const suggestedStyle = input.privateThought?.suggestedStyle ?? rhythmState?.suggestedStyle ?? null
  const afterglowFromScenario = input.privateThought?.afterglowFromScenario ?? null
  const shouldSpeak = typeof input.privateThought?.shouldSpeak === 'boolean'
    ? input.privateThought.shouldSpeak
    : null
  const summary = uniqueList([
    presence ? `presence:${presence}` : null,
    suggestedStyle ? `style:${suggestedStyle}` : null,
    afterglowFromScenario ? `afterglow:${afterglowFromScenario}` : null,
    shouldSpeak != null ? `speak:${shouldSpeak ? 'yes' : 'no'}` : null,
    rhythmState?.summary ? `rhythm:${rhythmState.summary}` : null,
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

function formatRecallGovernorRationale(input: {
  mode: AlicizationRecallGovernorSnapshot['mode']
  dialogueFirstBound: boolean
  restProtectiveEmotionalKernel: boolean
}) {
  if (input.mode === 'scene')
    return 'reason=scene_grounding_priority; recall_scope=live_grounding_or_repair'

  if (input.mode === 'thread' && input.dialogueFirstBound)
    return 'reason=current_turn_anchor_priority; recall_scope=current_turn_anchor'

  if (input.mode === 'thread')
    return 'reason=thread_knot_priority; recall_scope=current_dialogue_and_unresolved_loops'

  if (input.mode === 'emotional-resonance')
    return 'reason=emotional_resonance; recall_scope=affective_continuity'

  if (input.mode === 'self-continuity') {
    return input.restProtectiveEmotionalKernel
      ? 'reason=self_continuity_rest_protection; recall_scope=narrow'
      : 'reason=self_continuity; recall_scope=autobiographical_evidence'
  }

  return 'reason=no_specific_recall_mode; recall_scope=owner_default'
}

function isRestProtectiveEmotionalKernel(
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null,
) {
  return emotionalKernel?.memoryRecallMode === 'rest-protective-presence'
    && (
      emotionalKernel?.initiativeMode === 'rest-guard'
      || emotionalKernel?.embodimentTone === 'rest-protective'
      || emotionalKernel?.dominantEmotion === 'rest-protective-companionship'
    )
}

function isGuardedCareConfirmationBoundaryEmotionalKernel(
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null,
) {
  return emotionalKernel?.memoryRecallMode === 'self-continuity'
    && (
      emotionalKernel?.dominantEmotion === 'guarded-care'
      || emotionalKernel?.embodimentTone === 'protective-watch'
      || (emotionalKernel?.reasonTags ?? []).includes('execution-safety-gate')
      || (emotionalKernel?.reasonTags ?? []).includes('confirmation-boundary')
      || (emotionalKernel?.reasonTags ?? []).includes('wait-for-confirmation')
    )
}

function resolveMode(input: {
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  primaryTurnAnchor?: string | null
  autobiographicalContinuityActive?: boolean
}) {
  const repairFirstEmotionalKernel = input.emotionalKernel?.memoryRecallMode === 'repair-grounding'
    && (
      input.emotionalKernel?.initiativeMode === 'repair'
      || input.emotionalKernel?.embodimentTone === 'repair-before-closeness'
      || input.emotionalKernel?.dominantEmotion === 'repair-tension'
    )
  const restProtectiveEmotionalKernel = isRestProtectiveEmotionalKernel(input.emotionalKernel ?? null)

  if (repairFirstEmotionalKernel)
    return 'scene' as const
  if (restProtectiveEmotionalKernel)
    return 'self-continuity' as const
  if (input.emotionalKernel?.memoryRecallMode === 'emotional-resonance')
    return 'emotional-resonance' as const
  if (input.emotionalKernel?.memoryRecallMode === 'self-continuity')
    return 'self-continuity' as const

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
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
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
  personalityContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
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
  const affectiveResidue = input.affectiveResidue
    ?? ((input.mindEcology as { affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null } | null | undefined)?.affectiveResidue ?? null)
  const dialogueWorldThread = input.dialogueWorldThread ?? null
  const conversationState = input.conversationState ?? null
  const restProtectiveEmotionalKernel = isRestProtectiveEmotionalKernel(input.emotionalKernel ?? null)
  const guardedCareConfirmationBoundaryEmotionalKernel = isGuardedCareConfirmationBoundaryEmotionalKernel(input.emotionalKernel ?? null)
  const measuredReturnEmotionalKernel = input.emotionalKernel?.memoryRecallMode === 'low-pressure-presence'
    && (
      input.emotionalKernel?.initiativeMode === 'observe'
      || input.emotionalKernel?.embodimentTone === 'measured-return'
      || input.emotionalKernel?.dominantEmotion === 'measured-companionship'
    )
  const mode = resolveMode({
    emotionalKernel: input.emotionalKernel ?? null,
    dialogueWorldThread,
    conversationState,
    answerCompiler: input.answerCompiler ?? null,
    replyDeliberation: input.replyDeliberation ?? null,
    privateThought: input.privateThought ?? null,
    dialogueEncounter: input.dialogueEncounter ?? null,
    primaryTurnAnchor: null,
    autobiographicalContinuityActive: false,
  })
  const allowGovernorWithoutDialogueSeam = mode === 'scene'
    || restProtectiveEmotionalKernel
    || guardedCareConfirmationBoundaryEmotionalKernel
    || measuredReturnEmotionalKernel
  if ((!dialogueWorldThread || !conversationState) && !allowGovernorWithoutDialogueSeam)
    return null

  const primaryTurnAnchor = pickRecallAnchor(
    conversationState?.primaryTurnAnchor,
    input.dialogueEncounter?.taskAnchor,
    input.dialogueEncounter?.summary,
    dialogueWorldThread?.currentQuestion,
    dialogueWorldThread?.activeThread,
  ) || null
  const autobiographicalContinuityLines = buildAutobiographicalContinuityLines({
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    goalStack: input.goalStack ?? null,
    desireMemory: input.desireMemory ?? null,
    privateThought: input.privateThought ?? null,
    mindEcology: input.mindEcology ?? null,
  })
  const resolvedMode = (!dialogueWorldThread || !conversationState) && measuredReturnEmotionalKernel
    ? 'self-continuity' as const
    : resolveMode({
        emotionalKernel: input.emotionalKernel ?? null,
        dialogueWorldThread,
        conversationState,
        answerCompiler: input.answerCompiler ?? null,
        replyDeliberation: input.replyDeliberation ?? null,
        privateThought: input.privateThought ?? null,
        dialogueEncounter: input.dialogueEncounter ?? null,
        primaryTurnAnchor,
        autobiographicalContinuityActive: autobiographicalContinuityLines.length > 0 || Boolean(input.selfContinuityAuthority),
      })
  const dialogueFirstTurn = input.dialogueEncounter?.dialogueFirst === true
    || input.dialogueEncounter?.screenReferenceMode === 'avoid'
  const sceneAttachmentCues = dialogueFirstTurn ? [] : buildSceneAttachmentCues(input.sceneContext ?? null)
  const recallFragmentBudget = resolveAlicizationRecallFragmentBudget({
    mode: resolvedMode,
    restProtective: restProtectiveEmotionalKernel,
  })
  const recalledFragmentCap = recallFragmentBudget.recalledFragmentCap
  const recalledFragmentSourceBudget = recallFragmentBudget.recalledFragmentSourceBudget ?? []
  const carryAsMemory = Boolean(
    input.answerCompiler?.labelCarryAsMemory
    || resolvedMode === 'self-continuity'
    || resolvedMode === 'emotional-resonance',
  )
  const threadAnchors = uniqueList([
    primaryTurnAnchor,
    input.dialogueEncounter?.taskAnchor,
    input.dialogueEncounter?.summary,
    dialogueWorldThread?.activeThread,
    dialogueWorldThread?.currentQuestion,
    ...(dialogueWorldThread?.recallKeys ?? []),
    ...(conversationState?.memoryQueryHints ?? []),
  ], 8)
  const affectAnchors = uniqueList([
    input.emotionalKernel?.dominantEmotion ? `emotion:${input.emotionalKernel.dominantEmotion}` : null,
    input.emotionalKernel?.memoryRecallMode ? `emotion_memory_mode:${input.emotionalKernel.memoryRecallMode}` : null,
    input.emotionalKernel?.embodimentTone ? `emotion_tone:${input.emotionalKernel.embodimentTone}` : null,
    input.privateThought?.emotionalTension ? `emotional_tension:${input.privateThought.emotionalTension}` : null,
    input.replyDeliberation?.selectedMotive ? `reply_motive:${input.replyDeliberation.selectedMotive}` : null,
    input.privateThought?.stance ? `stance:${input.privateThought.stance}` : null,
    input.mindEcology?.moodLabel ? `mood:${input.mindEcology.moodLabel}` : null,
    input.motiveEngine?.rulingDrive ? `drive:${input.motiveEngine.rulingDrive}` : null,
    input.personalityContinuityState?.rhythmState.moodLabel ? `rhythm_mood:${input.personalityContinuityState.rhythmState.moodLabel}` : null,
    input.personalityContinuityState?.rhythmState.emotionalTension ? `rhythm_tension:${input.personalityContinuityState.rhythmState.emotionalTension}` : null,
    input.personalityContinuityState?.rhythmState.cadenceMode ? `rhythm_cadence:${input.personalityContinuityState.rhythmState.cadenceMode}` : null,
  ], 8)
  const relationshipAnchors = uniqueList([
    conversationState?.relationFrame ? `relation:${conversationState.relationFrame}` : null,
    dialogueWorldThread?.relationDrift ? `drift:${dialogueWorldThread.relationDrift}` : null,
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
    personalityContinuityState: input.personalityContinuityState ?? null,
  })
  const emotionalKernelSummary = input.emotionalKernel
    ? uniqueList([
        input.emotionalKernel.dominantEmotion,
        input.emotionalKernel.memoryRecallMode,
        input.emotionalKernel.embodimentTone,
      ], 3).join(' | ')
    : ''
  const mergedAffectiveCarry = affectiveCarry
    ? {
        ...affectiveCarry,
        summary: uniqueList([emotionalKernelSummary, affectiveCarry.summary], 4).join(' | ') || null,
      }
    : emotionalKernelSummary
      ? {
          moodLabel: null,
          emotionalTension: null,
          socialNeed: null,
          reflectivePull: null,
          summary: emotionalKernelSummary,
        }
      : null
  const embodiedCarry = buildEmbodiedCarry({
    privateThought: input.privateThought ?? null,
    personalityContinuityState: input.personalityContinuityState ?? null,
  })
  const salienceBias = clamp01(
    resolvedMode === 'emotional-resonance'
      ? 0.82
      : resolvedMode === 'self-continuity'
        ? 0.74
        : resolvedMode === 'thread'
          ? 0.58
          : resolvedMode === 'scene'
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
    affectiveResidue,
    emotionalKernel: input.emotionalKernel ?? null,
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

  const rationale = formatRecallGovernorRationale({
    mode: resolvedMode,
    dialogueFirstBound: input.dialogueEncounter?.dialogueFirst === true || input.dialogueEncounter?.screenReferenceMode === 'avoid',
    restProtectiveEmotionalKernel,
  })

  return {
    mode: resolvedMode,
    recallSeed,
    threadAnchors,
    affectAnchors,
    relationshipAnchors,
    salienceBias,
    sceneAnchor,
    sceneFamiliarityHint,
    affectiveCarry: mergedAffectiveCarry,
    embodiedCarry,
    recollectionIntent,
    ...recallFragmentBudget,
    carryAsMemory,
    rationale,
    narrative: uniqueList([
      `mode:${mode}`,
      recalledFragmentCap != null ? `recalled-fragment-cap:${recalledFragmentCap}` : null,
      ...recalledFragmentSourceBudget.map(item => `recalled-fragment-source:${item.sourceKind}:${item.maxItems}`),
      carryAsMemory ? 'carry:memory' : 'carry:none',
      primaryTurnAnchor ? `anchor:${primaryTurnAnchor}` : null,
      sceneAttachmentCues.length > 0 ? `scene-anchor:${sceneAttachmentCues[0]}` : null,
      dialogueWorldThread?.lastOutcome ? `thread_outcome:${dialogueWorldThread.lastOutcome}` : null,
      input.replyDeliberation?.selectedMotive ? `reply:${input.replyDeliberation.selectedMotive}` : null,
      mergedAffectiveCarry?.summary ? `affective-carry:${mergedAffectiveCarry.summary}` : null,
      embodiedCarry?.summary ? `embodied-carry:${embodiedCarry.summary}` : null,
      input.personalityContinuityState?.rhythmState.summary ? `rhythm-carry:${input.personalityContinuityState.rhythmState.summary}` : null,
      sceneFamiliarityHint > 0 ? `scene-familiarity:${sceneFamiliarityHint.toFixed(2)}` : null,
    ], 18),
    updatedAt: input.now,
  } satisfies AlicizationRecallGovernorSnapshot
}
