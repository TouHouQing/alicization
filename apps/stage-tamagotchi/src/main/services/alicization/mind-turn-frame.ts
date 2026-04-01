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

import { buildAlicizationScreenSurfaceCue, isWeakAlicizationScreenSurfaceCue } from '@proj-alicization/stage-shared'

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
}): AlicizationMindTurnFrameSnapshot {
  const truthState = resolveTruthState({
    dialogueActKernel: input.dialogueActKernel,
    answerCompiler: input.answerCompiler,
    worldModel: input.worldModel,
  })
  const turnMode = resolveTurnMode({
    dialogueActKernel: input.dialogueActKernel,
    answerCompiler: input.answerCompiler,
    answerPlanner: input.answerPlanner,
    privateThought: input.privateThought,
  })
  const repairState = resolveRepairState({
    dialogueActKernel: input.dialogueActKernel,
    answerPlanner: input.answerPlanner,
    truthState,
  })
  const subject = input.dialogueActKernel?.subject
    ?? input.answerCompiler?.answerSubject
    ?? input.mindSynthesis?.answerSubject
    ?? 'general'
  const screenReferenceMode = input.dialogueActKernel?.screenReferenceMode
    ?? input.answerCompiler?.screenReferenceMode
    ?? null
  const dialogueFirstTurn = subject === 'alicization-self'
    || subject === 'relationship'
    || subject === 'host-state'
    || subject === 'general'
    || screenReferenceMode === 'avoid'
  const fallbackFocusAnchor = pickText(
    dialogueFirstTurn ? input.conversationState?.primaryTurnAnchor : null,
    dialogueFirstTurn ? input.dialogueWorldThread?.primaryTurnAnchor : null,
    dialogueFirstTurn ? input.dialogueWorldThread?.currentQuestion : null,
    dialogueFirstTurn ? input.conversationState?.jointThread : null,
    dialogueFirstTurn ? input.answerPlanner?.answerIntent : null,
    dialogueFirstTurn ? input.answerCompiler?.openingClaim : null,
    dialogueFirstTurn ? input.answerPlanner?.governingFocus : null,
    dialogueFirstTurn ? null : input.dialogueActKernel?.selectedEvidence[0]?.summary,
    dialogueFirstTurn ? null : input.answerPlanner?.governingFocus,
    dialogueFirstTurn ? null : input.conversationState?.activeProject,
    dialogueFirstTurn ? null : input.currentScene?.summary,
    dialogueFirstTurn ? null : input.worldModel?.activeThread?.summary,
    dialogueFirstTurn ? null : input.answerCompiler?.openingClaim,
    input.dialogueWorldThread?.currentQuestion,
  )
  const focusCoherence = resolveDialogueAnchorCoherence({
    subject,
    screenReferenceMode,
    truthState,
    hostMove: input.conversationState?.hostMove ?? input.dialogueWorldThread?.lastUserMove ?? null,
    candidates: [
      { role: 'focus', text: dialogueFirstTurn ? input.conversationState?.primaryTurnAnchor : null },
      { role: 'focus', text: dialogueFirstTurn ? input.dialogueWorldThread?.primaryTurnAnchor : null },
      { role: 'question', text: dialogueFirstTurn ? input.dialogueWorldThread?.currentQuestion : null },
      { role: 'thread', text: dialogueFirstTurn ? input.conversationState?.jointThread : null },
      { role: 'answer-intent', text: dialogueFirstTurn ? input.answerPlanner?.answerIntent : null },
      { role: 'opening-claim', text: dialogueFirstTurn ? input.answerCompiler?.openingClaim : null },
      { role: 'answer-intent', text: dialogueFirstTurn ? input.answerPlanner?.governingFocus : null },
      { role: 'scene', text: dialogueFirstTurn ? null : input.dialogueActKernel?.selectedEvidence[0]?.summary },
      { role: 'answer-intent', text: dialogueFirstTurn ? null : input.answerPlanner?.governingFocus },
      { role: 'project', text: dialogueFirstTurn ? null : input.conversationState?.activeProject },
      { role: 'scene', text: dialogueFirstTurn ? null : input.currentScene?.summary },
      { role: 'focus', text: dialogueFirstTurn ? null : input.worldModel?.activeThread?.summary },
      { role: 'opening-claim', text: dialogueFirstTurn ? null : input.answerCompiler?.openingClaim },
      { role: 'question', text: input.dialogueWorldThread?.currentQuestion },
      { role: 'visible-surface', text: dialogueFirstTurn
        ? null
        : describeVisibleSurface({
            currentScene: input.currentScene,
            worldModel: input.worldModel,
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
      (input.dialogueActKernel?.confidence ?? 0)
      + (input.answerPlanner?.confidence ?? 0)
      + (input.replyDeliberation?.confidence ?? 0)
      + (input.privateThought?.confidence ?? 0)
    ) / 4,
  )

  return {
    world: {
      activeThread: pickText(
        input.dialogueWorldThread?.activeThread,
        input.worldModel?.activeThread?.summary,
        input.conversationState?.jointThread,
      ),
      visibleSurface: describeVisibleSurface({
        currentScene: input.currentScene,
        worldModel: input.worldModel,
      }),
      truthState,
      truthBoundary: pickText(
        input.mindSynthesis?.truthBoundary,
        input.answerCompiler?.uncertaintyBoundary,
      ),
      continuityPolicy: input.conversationState?.continuityPolicy ?? null,
      continuitySummary: buildContinuitySummary({
        worldModel: input.worldModel,
        conversationState: input.conversationState,
      }),
      staleRisk: resolveStaleRisk({
        truthState,
        worldModel: input.worldModel,
      }),
    },
    relation: {
      subject,
      hostMove: pickText(
        input.conversationState?.hostMove,
        input.dialogueWorldThread?.lastUserMove,
      ),
      hostGoal: input.dialogueActKernel?.hostGoal
        ?? input.appraisal?.inferredHostGoal
        ?? null,
      relationNeed: input.dialogueActKernel?.relationNeed
        ?? input.appraisal?.relationshipNeed
        ?? null,
      relationMove: input.answerCompiler?.relationMove
        ?? input.mindSynthesis?.relationMove
        ?? input.conversationState?.relationFrame
        ?? null,
      relationshipPosture: input.answerCompiler?.relationshipPosture
        ?? input.answerPlanner?.relationshipPosture
        ?? (input.privateThought?.stance === 'care' || input.privateThought?.stance === 'warn'
          ? 'tender'
          : null),
    },
    memory: {
      memoryMode: input.dialogueWorldThread?.memoryMode
        ?? input.conversationState?.memoryMode
        ?? null,
      carriedThread: pickText(
        keepCoherent(input.dialogueWorldThread?.activeThread),
        keepCoherent(input.conversationState?.jointThread),
      ),
      carriedFacts: uniqueList([
        ...(input.dialogueWorldThread?.carriedFacts ?? []),
        ...(input.answerCompiler?.supportingReality ?? []),
      ], 4),
      recallKeys: uniqueList([
        ...(input.dialogueWorldThread?.recallKeys ?? []),
        ...(input.conversationState?.memoryQueryHints ?? []),
      ], 6),
      recallSeed: pickText(
        input.recallGovernor?.recallSeed,
        input.dialogueWorldThread?.activeThread,
        input.conversationState?.activeProject,
      ),
      lastOutcome: input.dialogueWorldThread?.lastOutcome ?? null,
      suppressAssociativeRecall: input.recallGovernor?.suppressAssociativeRecall
        ?? input.answerCompiler?.suppressAssociativeRecall
        ?? false,
      labelCarryAsMemory: input.recallGovernor?.carryAsMemory
        ?? input.answerCompiler?.labelCarryAsMemory
        ?? false,
    },
    self: {
      stance: input.privateThought?.stance ?? null,
      mindMode: input.mindMode ?? null,
      dominantDrive: input.dominantDrive ?? input.privateThought?.governorDrive ?? null,
      embodiedPresence: input.privateThought?.embodiedPresence ?? 'none',
      emotionalTension: input.privateThought?.emotionalTension,
      initiativeAction: input.privateThought?.initiativeAction ?? null,
      thought: pickText(input.privateThought?.thoughtText),
    },
    obligation: {
      shouldSpeak: input.replyDeliberation?.shouldSpeak ?? input.privateThought?.shouldSpeak ?? true,
      speechObligation: input.answerCompiler?.speechObligation
        ?? input.mindSynthesis?.speechObligation
        ?? null,
      answerAct: input.dialogueActKernel?.speechAct
        ?? input.answerCompiler?.recommendedAct
        ?? input.answerPlanner?.act
        ?? null,
      responseMode: input.answerCompiler?.responseMode ?? null,
      turnMode,
      openingClaim: pickAnchorText(
        input.dialogueActKernel?.openingClaim,
        input.answerCompiler?.openingClaim,
        input.currentScene?.summary,
        input.conversationState?.activeProject,
      ),
      openingMove: pickText(
        input.dialogueActKernel?.openingMove,
        input.answerPlanner?.openingMove,
        input.answerCompiler?.openingDirective,
      ),
      answerIntent: pickSurfaceText(
        keepCoherent(input.answerPlanner?.answerIntent),
        dialogueFirstTurn ? focusAnchor : null,
        keepCoherent(input.answerCompiler?.openingClaim),
        dialogueFirstTurn ? keepCoherent(input.conversationState?.primaryTurnAnchor) : null,
        dialogueFirstTurn ? keepCoherent(input.dialogueWorldThread?.primaryTurnAnchor) : null,
        keepCoherent(input.dialogueWorldThread?.currentQuestion),
        keepCoherent(input.conversationState?.jointThread),
        keepCoherent(input.answerCompiler?.nextMove),
        anchorsMateriallyAlign(input.answerPlanner?.governingFocus, focusAnchor) ? input.answerPlanner?.governingFocus : null,
      ),
      whyNow: pickSurfaceText(
        input.dialogueActKernel?.whyNow,
        input.replyDeliberation?.whyThisReplyNow,
        input.currentScene?.summary,
      ),
      repairState,
      shouldAskForGrounding: input.answerPlanner?.shouldAskForGrounding
        ?? (input.dialogueActKernel?.speechAct === 'ask-reground'),
      shouldAcknowledgeRepair: input.answerPlanner?.shouldAcknowledgeRepair
        ?? (repairState === 'stale-anchor'),
    },
    focusAnchor,
    confidence,
    mustDo: uniqueList([
      ...(input.dialogueActKernel?.mustSay ?? []),
      ...(input.answerCompiler?.mustDo ?? []),
      ...(input.answerPlanner?.mustDo ?? []),
    ]),
    mustNotDo: uniqueList([
      ...(input.dialogueActKernel?.mustAvoid ?? []),
      ...(input.answerCompiler?.mustNotDo ?? []),
      ...(input.answerPlanner?.mustNotDo ?? []),
    ]),
    narrative: uniqueList([
      ...focusCoherence.reasonTags,
      ...(input.mindSynthesis?.narrative ?? []),
      ...(input.replyDeliberation?.narrative ?? []),
      ...(input.dialogueWorldThread?.narrative ?? []),
      ...(input.answerCompiler?.narrative ?? []),
      ...(input.answerPlanner?.narrative ?? []),
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
      openingClaim: pickText(obligation.openingClaim),
      openingMove: pickText(obligation.openingMove),
      answerIntent: pickText(obligation.answerIntent),
      whyNow: pickText(obligation.whyNow),
      repairState: repairState as AlicizationMindTurnFrameSnapshot['obligation']['repairState'],
      shouldAskForGrounding: obligation.shouldAskForGrounding === true,
      shouldAcknowledgeRepair: obligation.shouldAcknowledgeRepair === true,
    },
    focusAnchor: pickText(candidate.focusAnchor),
    confidence: clamp01(confidence),
    mustDo: uniqueList(Array.isArray(candidate.mustDo) ? candidate.mustDo : [], 8),
    mustNotDo: uniqueList(Array.isArray(candidate.mustNotDo) ? candidate.mustNotDo : [], 8),
    narrative: uniqueList(Array.isArray(candidate.narrative) ? candidate.narrative : [], 10),
    updatedAt: Number.isFinite(updatedAt) ? Math.max(0, Math.floor(updatedAt)) : Date.now(),
  }
}

export function buildMindTurnFrameSystemBlock(frame: AlicizationMindTurnFrameSnapshot | null | undefined) {
  if (!frame)
    return ''

  const worldTruthLine = (() => {
    switch (frame.world.truthState) {
      case 'live-grounded':
        return 'Reality status: live grounded evidence.'
      case 'live-observed':
        return 'Reality status: live but coarse observation.'
      case 'remembered':
        return 'Reality status: remembered continuity that must be treated as memory.'
      case 'imagined':
        return 'Reality status: extrapolated rather than directly observed.'
      default:
        return 'Reality status: uncertain and needs a tight truth boundary.'
    }
  })()

  return [
    '[ALICIZATION_MIND_TURN_FRAME]',
    'This frame is the turn-local convergence of world, relation, memory, self, and obligation. Treat it as primary and use supporting blocks only to verify or sharpen it.',
    worldTruthLine,
    frame.world.visibleSurface ? `Visible surface now: ${frame.world.visibleSurface}.` : '',
    frame.world.activeThread ? `Active living thread: ${frame.world.activeThread}.` : '',
    frame.world.truthBoundary ? `Truth boundary: ${frame.world.truthBoundary}.` : '',
    frame.relation.subject ? `Answer subject: ${frame.relation.subject}.` : '',
    frame.relation.hostMove ? `Host move being answered: ${frame.relation.hostMove}.` : '',
    frame.relation.hostGoal ? `Host goal: ${frame.relation.hostGoal}.` : '',
    frame.relation.relationNeed ? `Relationship need: ${frame.relation.relationNeed}.` : '',
    frame.memory.carriedThread ? `Carried thread: ${frame.memory.carriedThread}.` : '',
    frame.memory.carriedFacts.length > 0 ? `Carried facts: ${frame.memory.carriedFacts.join(' | ')}.` : '',
    frame.memory.labelCarryAsMemory ? 'If carry appears in the answer, mark it as memory rather than literal present fact.' : '',
    frame.self.stance ? `Inner stance: ${frame.self.stance}.` : '',
    frame.self.embodiedPresence && frame.self.embodiedPresence !== 'none' ? `Embodied presence: ${frame.self.embodiedPresence}.` : '',
    frame.self.emotionalTension ? `Emotional tension: ${frame.self.emotionalTension}.` : '',
    frame.self.thought ? `Inner line: ${frame.self.thought}. Keep it internal and let it shape the reply.` : '',
    frame.obligation.turnMode ? `Turn mode: ${frame.obligation.turnMode}.` : '',
    frame.obligation.answerAct ? `Answer act: ${frame.obligation.answerAct}.` : '',
    frame.obligation.answerIntent ? `Immediate answer intent: ${frame.obligation.answerIntent}.` : '',
    frame.obligation.openingMove ? `Opening move: ${frame.obligation.openingMove}.` : '',
    frame.obligation.whyNow ? `Why now: ${frame.obligation.whyNow}.` : '',
    frame.focusAnchor ? `Focus anchor: ${frame.focusAnchor}.` : '',
    frame.mustDo.length > 0 ? `Must do: ${frame.mustDo.join(' | ')}.` : '',
    frame.mustNotDo.length > 0 ? `Must not do: ${frame.mustNotDo.join(' | ')}.` : '',
  ].filter(Boolean).join('\n')
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
