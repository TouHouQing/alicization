import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationAnswerPlannerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationDialogueActKernelSnapshot,
  AlicizationDialogueWorldThreadSnapshot,
  AlicizationMindKernelMode,
  AlicizationMindSynthesisSnapshot,
  AlicizationMindTurnFrameSnapshot,
  AlicizationMindTurnGovernance,
  AlicizationPrivateThoughtSnapshot,
  AlicizationRecallGovernorSnapshot,
  AlicizationReplyDeliberationSnapshot,
  AlicizationSelfGovernorDrive,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationVisualSceneSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import {
  buildAlicizationScreenSurfaceCue,
  isWeakAlicizationScreenSurfaceCue,
} from '@proj-alicization/stage-shared'

import { anchorsMateriallyAlign, anchorsMateriallyConflict, resolveDialogueAnchorCoherence } from './dialogue-anchor-coherence'
import { sanitizeDialogueAnchorText, sanitizeDialogueSurfaceText } from './dialogue-surface-text'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList(values: Array<unknown>, maxItems = 8) {
  const items: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 220)
    if (!normalized || items.includes(normalized))
      continue
    items.push(normalized)
    if (items.length >= maxItems)
      break
  }
  return items
}

function pickText(...values: Array<unknown>) {
  for (const value of values) {
    const normalized = sanitizeText(value, 220)
    if (normalized)
      return normalized
  }
  return null
}

function pickSurfaceText(...values: Array<unknown>) {
  for (const value of values) {
    const normalized = sanitizeDialogueSurfaceText(value, 220)
    if (normalized)
      return normalized
  }
  return null
}

function pickAnchorText(...values: Array<unknown>) {
  for (const value of values) {
    const normalized = sanitizeDialogueAnchorText(value, 220)
    if (normalized)
      return normalized
  }
  return null
}

function resolveTruthState(input: {
  dialogueActKernel?: AlicizationDialogueActKernelSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
}): AlicizationMindTurnFrameSnapshot['world']['truthState'] {
  const kernelTruth = input.dialogueActKernel?.truthMode
  if (kernelTruth === 'live-grounded')
    return 'live-grounded'
  if (kernelTruth === 'live-observed' || kernelTruth === 'coarse-held')
    return 'live-observed'
  if (kernelTruth === 'dialogue-grounded' || kernelTruth === 'continuity-carry' || kernelTruth === 'memory-only')
    return 'remembered'
  if (kernelTruth === 'repair-first')
    return 'uncertain'

  const compilerEvidence = input.answerCompiler?.evidenceMode
  if (compilerEvidence === 'live-grounded')
    return 'live-grounded'
  if (compilerEvidence === 'live-observed' || compilerEvidence === 'coarse-held')
    return 'live-observed'
  if (compilerEvidence === 'dialogue-grounded' || compilerEvidence === 'continuity-carry')
    return 'remembered'
  if (compilerEvidence === 'repair-first')
    return 'uncertain'

  switch (input.worldModel?.epistemicState.certainty) {
    case 'grounded':
      return 'live-grounded'
    case 'observed':
      return 'live-observed'
    case 'lingering':
      return 'remembered'
    default:
      return 'uncertain'
  }
}

function resolveRepairState(input: {
  dialogueActKernel?: AlicizationDialogueActKernelSnapshot | null
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  truthState: AlicizationMindTurnFrameSnapshot['world']['truthState']
}): AlicizationMindTurnFrameSnapshot['obligation']['repairState'] {
  if (input.truthState === 'live-grounded')
    return 'none'
  if (input.answerPlanner?.act === 'correct-stale-anchor' || input.dialogueActKernel?.speechAct === 'correct-stale-anchor')
    return 'stale-anchor'
  if (input.answerPlanner?.act === 'ask-reground' || input.dialogueActKernel?.speechAct === 'ask-reground')
    return 'need-reground'
  if (input.dialogueActKernel?.turnMode === 'screen-repair')
    return input.truthState === 'remembered' ? 'stale-anchor' : 'need-reground'
  return 'none'
}

function resolveTurnMode(input: {
  dialogueActKernel?: AlicizationDialogueActKernelSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
}): AlicizationMindTurnFrameSnapshot['obligation']['turnMode'] {
  if (input.dialogueActKernel?.turnMode)
    return input.dialogueActKernel.turnMode
  if (input.answerCompiler?.turnMode)
    return input.answerCompiler.turnMode
  switch (input.answerPlanner?.act) {
    case 'guide':
      return 'guide-current-knot'
    case 'care':
      return 'care'
    case 'defer':
      return 'accompany'
    case 'ask-reground':
    case 'correct-stale-anchor':
      return 'screen-repair'
    default:
      break
  }
  if (input.privateThought?.stance === 'care' || input.privateThought?.stance === 'warn')
    return 'care'
  if (input.privateThought?.stance === 'accompany' || input.privateThought?.stance === 'observe')
    return 'accompany'
  return 'answer'
}

function resolveStaleRisk(input: {
  truthState: AlicizationMindTurnFrameSnapshot['world']['truthState']
  worldModel?: AlicizationWorldModelSnapshot | null
}) {
  let risk = 0
  if (input.truthState === 'remembered')
    risk += 0.5
  else if (input.truthState === 'uncertain')
    risk += 0.7
  else if (input.truthState === 'live-observed')
    risk += 0.2

  if (input.worldModel?.epistemicState.freshness === 'stale')
    risk += 0.25
  else if (input.worldModel?.epistemicState.freshness === 'recent')
    risk += 0.12

  risk += Math.min(0.2, (input.worldModel?.epistemicState.staleRisks.length ?? 0) * 0.05)
  return clamp01(risk)
}

function buildContinuitySummary(input: {
  worldModel?: AlicizationWorldModelSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
}) {
  return pickText(
    [
      input.worldModel?.continuity.label,
      input.conversationState?.continuityPolicy,
      input.worldModel?.continuity.afterglowOpen ? 'afterglow-open' : '',
    ].filter(Boolean).join(' | '),
  )
}

function describeVisibleSurface(input: {
  currentScene?: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
}) {
  const currentSceneCue = input.currentScene
    ? buildAlicizationScreenSurfaceCue({
        rawCues: [input.currentScene.summary],
        target: input.currentScene.target ?? input.worldModel?.focusTarget ?? null,
        scenario: input.currentScene.scenario ?? null,
        workloadKind: input.currentScene.workloadKind ?? null,
        contentKind: input.currentScene.contentKind ?? null,
      })
    : ''
  const threadSurfaceCue = pickSurfaceText(
    input.worldModel?.activeThread?.title,
    input.worldModel?.activeThread?.summary,
  )
  const allowThreadSurfaceCarry = !currentSceneCue
    || isWeakAlicizationScreenSurfaceCue(currentSceneCue)
    || !threadSurfaceCue
    || anchorsMateriallyAlign(currentSceneCue, threadSurfaceCue)
    || anchorsMateriallyAlign(threadSurfaceCue, currentSceneCue)

  return buildAlicizationScreenSurfaceCue({
    rawCues: [
      input.currentScene?.summary,
      allowThreadSurfaceCarry ? input.worldModel?.activeThread?.title : null,
      allowThreadSurfaceCarry ? input.worldModel?.activeThread?.summary : null,
    ],
    target: input.currentScene?.target ?? input.worldModel?.focusTarget ?? null,
    scenario: input.currentScene?.scenario ?? null,
    workloadKind: input.currentScene?.workloadKind ?? null,
    contentKind: input.currentScene?.contentKind ?? null,
  })
}

// NOTICE: This is the authoritative convergence layer for speech. It collects
// world, relation, memory, self, and obligation into one turn-local frame so
// downstream reply logic stops re-deriving intent from fragmented slices.
export function buildMindTurnFrame(input: {
  now: number
  currentScene?: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  appraisal?: AlicizationSubjectiveSceneAppraisal | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  dialogueActKernel?: AlicizationDialogueActKernelSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  recallGovernor?: AlicizationRecallGovernorSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  mindMode?: AlicizationMindKernelMode | null
  dominantDrive?: AlicizationSelfGovernorDrive | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}): AlicizationMindTurnFrameSnapshot {
  const runtimeSurface = input.runtimeSurface ?? null
  const currentScene = runtimeSurface?.perception.currentScene ?? input.currentScene ?? null
  const worldModel = runtimeSurface?.world.worldModel ?? input.worldModel ?? null
  const appraisal = runtimeSurface?.cognition.appraisal ?? input.appraisal ?? null
  const mindSynthesis = runtimeSurface?.dialogue.mindSynthesis ?? input.mindSynthesis ?? null
  const conversationState = runtimeSurface?.dialogue.conversationState ?? input.conversationState ?? null
  const dialogueWorldThread = runtimeSurface?.dialogue.dialogueWorldThread ?? input.dialogueWorldThread ?? null
  const dialogueActKernel = runtimeSurface?.dialogue.dialogueActKernel ?? input.dialogueActKernel ?? null
  const answerCompiler = runtimeSurface?.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const answerPlanner = runtimeSurface?.dialogue.answerPlanner ?? input.answerPlanner ?? null
  const replyDeliberation = runtimeSurface?.dialogue.replyDeliberation ?? input.replyDeliberation ?? null
  const recallGovernor = runtimeSurface?.memory.recallGovernor ?? input.recallGovernor ?? null
  const privateThought = runtimeSurface?.cognition.privateThought ?? input.privateThought ?? null
  const mindMode = runtimeSurface?.cognition.mindKernel?.dominantMode ?? input.mindMode ?? null
  const dominantDrive = runtimeSurface?.agency.selfGovernor?.dominantDrive ?? input.dominantDrive ?? null

  const truthState = resolveTruthState({
    dialogueActKernel,
    answerCompiler,
    worldModel,
  })
  const turnMode = resolveTurnMode({
    dialogueActKernel,
    answerCompiler,
    answerPlanner,
    privateThought,
  })
  const repairState = resolveRepairState({
    dialogueActKernel,
    answerPlanner,
    truthState,
  })
  const subject = dialogueActKernel?.subject
    ?? answerCompiler?.answerSubject
    ?? mindSynthesis?.answerSubject
    ?? 'general'
  const screenReferenceMode = dialogueActKernel?.screenReferenceMode
    ?? answerCompiler?.screenReferenceMode
    ?? null
  const dialogueFirstTurn = subject === 'alicization-self'
    || subject === 'relationship'
    || subject === 'host-state'
    || subject === 'general'
    || screenReferenceMode === 'avoid'
  const fallbackFocusAnchor = pickText(
    dialogueFirstTurn ? conversationState?.primaryTurnAnchor : null,
    dialogueFirstTurn ? dialogueWorldThread?.primaryTurnAnchor : null,
    dialogueFirstTurn ? dialogueWorldThread?.currentQuestion : null,
    dialogueFirstTurn ? conversationState?.jointThread : null,
    dialogueFirstTurn ? answerPlanner?.answerIntent : null,
    dialogueFirstTurn ? answerCompiler?.openingClaim : null,
    dialogueFirstTurn ? answerPlanner?.governingFocus : null,
    dialogueFirstTurn ? null : dialogueActKernel?.selectedEvidence[0]?.summary,
    dialogueFirstTurn ? null : answerPlanner?.governingFocus,
    dialogueFirstTurn ? null : conversationState?.activeProject,
    dialogueFirstTurn ? null : currentScene?.summary,
    dialogueFirstTurn ? null : worldModel?.activeThread?.summary,
    dialogueFirstTurn ? null : answerCompiler?.openingClaim,
    dialogueWorldThread?.currentQuestion,
  )
  const focusCoherence = resolveDialogueAnchorCoherence({
    subject,
    screenReferenceMode,
    truthState,
    hostMove: conversationState?.hostMove ?? dialogueWorldThread?.lastUserMove ?? null,
    candidates: [
      { role: 'focus', text: dialogueFirstTurn ? conversationState?.primaryTurnAnchor : null },
      { role: 'focus', text: dialogueFirstTurn ? dialogueWorldThread?.primaryTurnAnchor : null },
      { role: 'question', text: dialogueFirstTurn ? dialogueWorldThread?.currentQuestion : null },
      { role: 'thread', text: dialogueFirstTurn ? conversationState?.jointThread : null },
      { role: 'answer-intent', text: dialogueFirstTurn ? answerPlanner?.answerIntent : null },
      { role: 'opening-claim', text: dialogueFirstTurn ? answerCompiler?.openingClaim : null },
      { role: 'answer-intent', text: dialogueFirstTurn ? answerPlanner?.governingFocus : null },
      { role: 'scene', text: dialogueFirstTurn ? null : dialogueActKernel?.selectedEvidence[0]?.summary },
      { role: 'answer-intent', text: dialogueFirstTurn ? null : answerPlanner?.governingFocus },
      { role: 'project', text: dialogueFirstTurn ? null : conversationState?.activeProject },
      { role: 'scene', text: dialogueFirstTurn ? null : currentScene?.summary },
      { role: 'focus', text: dialogueFirstTurn ? null : worldModel?.activeThread?.summary },
      { role: 'opening-claim', text: dialogueFirstTurn ? null : answerCompiler?.openingClaim },
      { role: 'question', text: dialogueWorldThread?.currentQuestion },
      { role: 'visible-surface', text: dialogueFirstTurn
        ? null
        : describeVisibleSurface({
            currentScene,
            worldModel,
          }) },
    ],
  })
  const focusAnchor = dialogueFirstTurn
    ? pickAnchorText(fallbackFocusAnchor)
    : pickAnchorText(focusCoherence.dominant, fallbackFocusAnchor)
  const keepCoherent = (value: unknown) => {
    const normalized = pickText(value)
    if (!normalized)
      return null
    if (!focusCoherence.sceneAuthority || !focusAnchor)
      return normalized
    return anchorsMateriallyConflict(normalized, focusAnchor) ? null : normalized
  }
  const confidence = clamp01(
    (
      (dialogueActKernel?.confidence ?? 0)
      + (answerPlanner?.confidence ?? 0)
      + (replyDeliberation?.confidence ?? 0)
      + (privateThought?.confidence ?? 0)
    ) / 4,
  )

  return {
    world: {
      activeThread: pickText(
        dialogueWorldThread?.activeThread,
        worldModel?.activeThread?.summary,
        conversationState?.jointThread,
      ),
      visibleSurface: describeVisibleSurface({
        currentScene,
        worldModel,
      }),
      truthState,
      truthBoundary: pickText(
        mindSynthesis?.truthBoundary,
        answerCompiler?.uncertaintyBoundary,
      ),
      continuityPolicy: conversationState?.continuityPolicy ?? null,
      continuitySummary: buildContinuitySummary({
        worldModel,
        conversationState,
      }),
      staleRisk: resolveStaleRisk({
        truthState,
        worldModel,
      }),
    },
    relation: {
      subject,
      hostMove: pickText(
        conversationState?.hostMove,
        dialogueWorldThread?.lastUserMove,
      ),
      hostGoal: dialogueActKernel?.hostGoal
        ?? appraisal?.inferredHostGoal
        ?? null,
      relationNeed: dialogueActKernel?.relationNeed
        ?? appraisal?.relationshipNeed
        ?? null,
      relationMove: answerCompiler?.relationMove
        ?? mindSynthesis?.relationMove
        ?? conversationState?.relationFrame
        ?? null,
      relationshipPosture: answerCompiler?.relationshipPosture
        ?? answerPlanner?.relationshipPosture
        ?? (privateThought?.stance === 'care' || privateThought?.stance === 'warn'
          ? 'tender'
          : null),
    },
    memory: {
      memoryMode: dialogueWorldThread?.memoryMode
        ?? conversationState?.memoryMode
        ?? null,
      carriedThread: pickText(
        keepCoherent(dialogueWorldThread?.activeThread),
        keepCoherent(conversationState?.jointThread),
      ),
      carriedFacts: uniqueList([
        ...(dialogueWorldThread?.carriedFacts ?? []),
        ...(answerCompiler?.supportingReality ?? []),
      ], 4),
      recallKeys: uniqueList([
        ...(dialogueWorldThread?.recallKeys ?? []),
        ...(conversationState?.memoryQueryHints ?? []),
      ], 6),
      recallSeed: pickText(
        recallGovernor?.recallSeed,
        dialogueWorldThread?.activeThread,
        conversationState?.activeProject,
      ),
      lastOutcome: dialogueWorldThread?.lastOutcome ?? null,
      suppressAssociativeRecall: recallGovernor?.suppressAssociativeRecall
        ?? answerCompiler?.suppressAssociativeRecall
        ?? false,
      labelCarryAsMemory: recallGovernor?.carryAsMemory
        ?? answerCompiler?.labelCarryAsMemory
        ?? false,
    },
    self: {
      stance: privateThought?.stance ?? null,
      mindMode,
      dominantDrive: dominantDrive ?? privateThought?.governorDrive ?? null,
      embodiedPresence: privateThought?.embodiedPresence ?? 'none',
      emotionalTension: privateThought?.emotionalTension,
      initiativeAction: privateThought?.initiativeAction ?? null,
      thought: pickText(privateThought?.thoughtText),
    },
    obligation: {
      shouldSpeak: replyDeliberation?.shouldSpeak ?? privateThought?.shouldSpeak ?? true,
      speechObligation: answerCompiler?.speechObligation
        ?? mindSynthesis?.speechObligation
        ?? null,
      answerAct: dialogueActKernel?.speechAct
        ?? answerCompiler?.recommendedAct
        ?? answerPlanner?.act
        ?? null,
      responseMode: answerCompiler?.responseMode ?? null,
      turnMode,
      openingClaim: pickAnchorText(
        dialogueActKernel?.openingClaim,
        answerCompiler?.openingClaim,
        currentScene?.summary,
        conversationState?.activeProject,
      ),
      openingMove: pickText(
        dialogueActKernel?.openingMove,
        answerPlanner?.openingMove,
        answerCompiler?.openingDirective,
      ),
      answerIntent: pickSurfaceText(
        keepCoherent(answerPlanner?.answerIntent),
        dialogueFirstTurn ? focusAnchor : null,
        keepCoherent(answerCompiler?.openingClaim),
        dialogueFirstTurn ? keepCoherent(conversationState?.primaryTurnAnchor) : null,
        dialogueFirstTurn ? keepCoherent(dialogueWorldThread?.primaryTurnAnchor) : null,
        keepCoherent(dialogueWorldThread?.currentQuestion),
        keepCoherent(conversationState?.jointThread),
        keepCoherent(answerCompiler?.nextMove),
        anchorsMateriallyAlign(answerPlanner?.governingFocus, focusAnchor) ? answerPlanner?.governingFocus : null,
      ),
      whyNow: pickSurfaceText(
        dialogueActKernel?.whyNow,
        replyDeliberation?.whyThisReplyNow,
        currentScene?.summary,
      ),
      repairState,
      shouldAskForGrounding: answerPlanner?.shouldAskForGrounding
        ?? (dialogueActKernel?.speechAct === 'ask-reground'),
      shouldAcknowledgeRepair: answerPlanner?.shouldAcknowledgeRepair
        ?? (repairState === 'stale-anchor'),
    },
    focusAnchor,
    confidence,
    mustDo: uniqueList([
      ...(dialogueActKernel?.mustSay ?? []),
      ...(answerCompiler?.mustDo ?? []),
      ...(answerPlanner?.mustDo ?? []),
    ]),
    mustNotDo: uniqueList([
      ...(dialogueActKernel?.mustAvoid ?? []),
      ...(answerCompiler?.mustNotDo ?? []),
      ...(answerPlanner?.mustNotDo ?? []),
    ]),
    narrative: uniqueList([
      ...focusCoherence.reasonTags,
      ...(mindSynthesis?.narrative ?? []),
      ...(replyDeliberation?.narrative ?? []),
      ...(dialogueWorldThread?.narrative ?? []),
      ...(answerCompiler?.narrative ?? []),
      ...(answerPlanner?.narrative ?? []),
    ], 10),
    updatedAt: input.now,
  }
}

export function normalizeMindTurnFrame(raw: unknown): AlicizationMindTurnFrameSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const world = candidate.world && typeof candidate.world === 'object' && !Array.isArray(candidate.world)
    ? candidate.world as Record<string, unknown>
    : null
  const relation = candidate.relation && typeof candidate.relation === 'object' && !Array.isArray(candidate.relation)
    ? candidate.relation as Record<string, unknown>
    : null
  const memory = candidate.memory && typeof candidate.memory === 'object' && !Array.isArray(candidate.memory)
    ? candidate.memory as Record<string, unknown>
    : null
  const self = candidate.self && typeof candidate.self === 'object' && !Array.isArray(candidate.self)
    ? candidate.self as Record<string, unknown>
    : null
  const obligation = candidate.obligation && typeof candidate.obligation === 'object' && !Array.isArray(candidate.obligation)
    ? candidate.obligation as Record<string, unknown>
    : null
  if (!world || !relation || !memory || !self || !obligation)
    return null

  const truthState = sanitizeText(world.truthState, 32)
  const turnMode = sanitizeText(obligation.turnMode, 32)
  const repairState = sanitizeText(obligation.repairState, 32)
  if (
    !['live-grounded', 'live-observed', 'remembered', 'imagined', 'uncertain'].includes(truthState)
    || !['grounded-inspection', 'screen-repair', 'guide-current-knot', 'care', 'accompany', 'answer'].includes(turnMode)
    || !['none', 'stale-anchor', 'need-reground'].includes(repairState)
  ) {
    return null
  }

  const confidence = Number(candidate.confidence)
  const staleRisk = Number(world.staleRisk)
  const updatedAt = Number(candidate.updatedAt)

  return {
    world: {
      activeThread: pickText(world.activeThread),
      visibleSurface: pickText(world.visibleSurface),
      truthState: truthState as AlicizationMindTurnFrameSnapshot['world']['truthState'],
      truthBoundary: pickText(world.truthBoundary),
      continuityPolicy: sanitizeText(world.continuityPolicy, 40) as AlicizationConversationStateSnapshot['continuityPolicy'] | null,
      continuitySummary: pickText(world.continuitySummary),
      staleRisk: clamp01(staleRisk),
    },
    relation: {
      subject: sanitizeText(relation.subject, 40) as AlicizationMindTurnFrameSnapshot['relation']['subject'],
      hostMove: pickText(relation.hostMove),
      hostGoal: pickText(relation.hostGoal) as AlicizationMindTurnFrameSnapshot['relation']['hostGoal'],
      relationNeed: pickText(relation.relationNeed) as AlicizationMindTurnFrameSnapshot['relation']['relationNeed'],
      relationMove: pickText(relation.relationMove) as AlicizationMindTurnFrameSnapshot['relation']['relationMove'],
      relationshipPosture: pickText(relation.relationshipPosture) as AlicizationMindTurnFrameSnapshot['relation']['relationshipPosture'],
    },
    memory: {
      memoryMode: pickText(memory.memoryMode) as AlicizationMindTurnFrameSnapshot['memory']['memoryMode'],
      carriedThread: pickText(memory.carriedThread),
      carriedFacts: uniqueList(Array.isArray(memory.carriedFacts) ? memory.carriedFacts : [], 4),
      recallKeys: uniqueList(Array.isArray(memory.recallKeys) ? memory.recallKeys : [], 6),
      recallSeed: pickText(memory.recallSeed),
      lastOutcome: pickText(memory.lastOutcome) as AlicizationMindTurnFrameSnapshot['memory']['lastOutcome'],
      suppressAssociativeRecall: memory.suppressAssociativeRecall === true,
      labelCarryAsMemory: memory.labelCarryAsMemory === true,
    },
    self: {
      stance: pickText(self.stance) as AlicizationMindTurnFrameSnapshot['self']['stance'],
      mindMode: pickText(self.mindMode) as AlicizationMindTurnFrameSnapshot['self']['mindMode'],
      dominantDrive: pickText(self.dominantDrive) as AlicizationMindTurnFrameSnapshot['self']['dominantDrive'],
      embodiedPresence: pickText(self.embodiedPresence) as AlicizationMindTurnFrameSnapshot['self']['embodiedPresence'],
      emotionalTension: pickText(self.emotionalTension) as AlicizationMindTurnFrameSnapshot['self']['emotionalTension'],
      initiativeAction: pickText(self.initiativeAction) as AlicizationMindTurnFrameSnapshot['self']['initiativeAction'],
      thought: pickText(self.thought),
    },
    obligation: {
      shouldSpeak: obligation.shouldSpeak === true,
      speechObligation: pickText(obligation.speechObligation) as AlicizationMindTurnFrameSnapshot['obligation']['speechObligation'],
      answerAct: pickText(obligation.answerAct) as AlicizationMindTurnFrameSnapshot['obligation']['answerAct'],
      responseMode: pickText(obligation.responseMode) as AlicizationMindTurnFrameSnapshot['obligation']['responseMode'],
      turnMode: turnMode as AlicizationMindTurnFrameSnapshot['obligation']['turnMode'],
      openingClaim: null,
      openingMove: null,
      answerIntent: null,
      whyNow: null,
      repairState: repairState as AlicizationMindTurnFrameSnapshot['obligation']['repairState'],
      shouldAskForGrounding: obligation.shouldAskForGrounding === true,
      shouldAcknowledgeRepair: obligation.shouldAcknowledgeRepair === true,
    },
    focusAnchor: pickText(candidate.focusAnchor),
    confidence: clamp01(confidence),
    mustDo: [],
    mustNotDo: [],
    narrative: [],
    updatedAt: Number.isFinite(updatedAt) ? Math.max(0, Math.floor(updatedAt)) : Date.now(),
  }
}

export function resolveMindTurnFrameAnchor(governance?: AlicizationMindTurnGovernance | null) {
  if (!governance?.mindTurnFrame)
    return ''
  return pickText(
    governance.mindTurnFrame.focusAnchor,
    governance.mindTurnFrame.world.visibleSurface,
    governance.mindTurnFrame.memory.carriedThread,
    governance.mindTurnFrame.obligation.answerIntent,
  ) ?? ''
}
