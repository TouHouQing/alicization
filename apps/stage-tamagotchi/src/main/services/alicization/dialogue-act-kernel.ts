import type {
  AlicizationAnswerAct,
  AlicizationAnswerCompilerSnapshot,
  AlicizationAnswerPlannerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationDialogueActKernelEvidence,
  AlicizationDialogueActKernelEvidenceKind,
  AlicizationDialogueActKernelEvidenceSource,
  AlicizationDialogueActKernelSnapshot,
  AlicizationDialogueAnswerSubject,
  AlicizationDialogueScreenReferenceMode,
  AlicizationDialogueWorldThreadSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationHostGoalHypothesis,
  AlicizationPrivateThoughtSnapshot,
  AlicizationRelationshipNeed,
  AlicizationReplyDeliberationSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationVisualSceneSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import {
  alicizationFixedTemplateReplacement,
  buildAlicizationScreenSurfaceCue,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { anchorsMateriallyAlign, anchorsMateriallyConflict, resolveDialogueAnchorCoherence } from './dialogue-anchor-coherence'
import { isDialogueFirstSubject, sanitizeDialogueAnchorText, sanitizeDialogueSurfaceText } from './dialogue-surface-text'

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

function looksProviderFacingStructuredControl(value: string) {
  const normalized = value.trim().replace(/[.。]+$/u, '')
  return /^[\w.:-]+=[^!?。！？]*?(?:[;|,]\s*[\w.:-]+=[^!?。！？]*?)*$/iu.test(normalized)
    || /^[\w.:-]+$/iu.test(normalized)
}

function formatProviderFacingControl(value: unknown) {
  const normalized = sanitizeAlicizationProviderFacingText(value, 360, '')
  if (!normalized || normalized === alicizationFixedTemplateReplacement)
    return 'provider_instruction_status=withheld; reason=non_structured_source_text'
  if (looksProviderFacingStructuredControl(normalized))
    return normalized
  return 'provider_instruction_status=withheld; reason=non_structured_source_text'
}

function sanitizeKernelAnchor(raw: unknown, maxChars = 220) {
  return sanitizeDialogueAnchorText(raw, maxChars)
}

function sanitizeKernelSurface(raw: unknown, maxChars = 220) {
  return sanitizeDialogueSurfaceText(raw, maxChars)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
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

function uniqueSurfaceList(values: Array<unknown>, maxItems = 8) {
  const items: string[] = []
  for (const value of values) {
    const normalized = sanitizeKernelSurface(value, 220)
    if (!normalized || items.includes(normalized))
      continue
    items.push(normalized)
    if (items.length >= maxItems)
      break
  }
  return items
}

function resolveHostGoal(input: {
  appraisal?: AlicizationSubjectiveSceneAppraisal | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  currentScene?: AlicizationVisualSceneSnapshot | null
}): AlicizationHostGoalHypothesis {
  if (input.appraisal?.inferredHostGoal)
    return input.appraisal.inferredHostGoal
  if (input.answerCompiler?.recommendedAct === 'guide')
    return 'resolve-problem'
  if (input.answerCompiler?.turnMode === 'grounded-inspection')
    return 'inspect-change'
  if (input.currentScene?.scenario === 'media')
    return 'consume-media'
  if (input.currentScene?.scenario === 'coding' || input.currentScene?.contentKind === 'error' || input.currentScene?.contentKind === 'diff')
    return 'resolve-problem'
  switch (input.worldModel?.activeThread?.kind) {
    case 'change-review':
      return 'inspect-change'
    case 'debugging':
      return 'resolve-problem'
    case 'co-viewing':
      return 'consume-media'
    case 'late-night-endurance':
      return 'rest'
    case 'chatting':
      return 'chat'
    case 'browsing':
      return 'browse'
    default:
      return 'unknown'
  }
}

function resolveRelationNeed(input: {
  appraisal?: AlicizationSubjectiveSceneAppraisal | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  subject: AlicizationDialogueAnswerSubject
}): AlicizationRelationshipNeed {
  if (input.appraisal?.relationshipNeed)
    return input.appraisal.relationshipNeed
  if (input.privateThought?.stance === 'care' || input.privateThought?.stance === 'warn')
    return 'care'
  if (input.answerCompiler?.recommendedAct === 'guide' || input.subject === 'task-knot')
    return 'guidance'
  if (input.subject === 'relationship')
    return 'companionship'
  if (input.answerCompiler?.screenReferenceMode === 'avoid')
    return 'space'
  return 'unclear'
}

function resolveTruthMode(input: {
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
}) {
  return input.answerPlanner?.evidenceMode
    ?? input.answerCompiler?.evidenceMode
    ?? (input.worldModel?.epistemicState.certainty === 'grounded'
      ? 'live-grounded'
      : input.worldModel?.epistemicState.certainty === 'observed'
        ? 'live-observed'
        : input.worldModel?.epistemicState.certainty === 'lingering'
          ? 'continuity-carry'
          : 'memory-only')
}

function resolveSpeechAct(input: {
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
}): AlicizationAnswerAct {
  if (input.answerPlanner?.act)
    return input.answerPlanner.act
  if (input.answerCompiler?.recommendedAct)
    return input.answerCompiler.recommendedAct
  switch (input.replyDeliberation?.selectedMotive) {
    case 'repair':
      return 'ask-reground'
    case 'guide':
      return 'guide'
    case 'care':
      return 'care'
    case 'defer':
      return 'defer'
    default:
      break
  }
  if (input.discourseState?.owedAction === 'repair-truth')
    return 'ask-reground'
  if (input.discourseState?.owedAction === 'guide-task')
    return 'guide'
  if (input.discourseState?.owedAction === 'care-host')
    return 'care'
  if (!input.privateThought?.shouldSpeak && input.privateThought)
    return 'defer'
  return 'answer'
}

function resolveTurnMode(input: {
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  speechAct: AlicizationAnswerAct
  subject: AlicizationDialogueAnswerSubject
  truthMode: AlicizationDialogueActKernelSnapshot['truthMode']
  enforceDialogueFirstBoundary?: boolean
}): AlicizationDialogueActKernelSnapshot['turnMode'] {
  if (input.answerCompiler?.turnMode) {
    if (!input.enforceDialogueFirstBoundary)
      return input.answerCompiler.turnMode

    if (
      input.answerCompiler.turnMode === 'screen-repair'
      || input.answerCompiler.turnMode === 'grounded-inspection'
      || input.answerCompiler.turnMode === 'guide-current-knot'
    ) {
      if (input.speechAct === 'care')
        return 'care'
      if (input.speechAct === 'defer' || input.subject === 'relationship')
        return 'accompany'
      return 'answer'
    }
    return input.answerCompiler.turnMode
  }
  if (input.speechAct === 'ask-reground' || input.speechAct === 'correct-stale-anchor')
    return 'screen-repair'
  if (input.speechAct === 'guide')
    return 'guide-current-knot'
  if (input.speechAct === 'care')
    return 'care'
  if (input.speechAct === 'defer' || input.subject === 'relationship')
    return 'accompany'
  if (
    input.subject === 'visible-scene'
    && (input.truthMode === 'live-grounded' || input.truthMode === 'live-observed')
  ) {
    return 'grounded-inspection'
  }
  return 'answer'
}

function createEvidence(input: {
  kind: AlicizationDialogueActKernelEvidenceKind
  source: AlicizationDialogueActKernelEvidenceSource
  summary?: string | null
  confidence: number
}) {
  const summary = sanitizeKernelSurface(input.summary, 220)
  if (!summary)
    return null
  return {
    kind: input.kind,
    source: input.source,
    summary,
    confidence: clamp01(input.confidence),
  } satisfies AlicizationDialogueActKernelEvidence
}

export function normalizeDialogueActKernel(raw: unknown): AlicizationDialogueActKernelSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const subject = candidate.subject
  const hostGoal = candidate.hostGoal
  const relationNeed = candidate.relationNeed
  const truthMode = candidate.truthMode
  const speechAct = candidate.speechAct
  const turnMode = candidate.turnMode
  const screenReferenceMode = candidate.screenReferenceMode
  const speakingFrom = candidate.speakingFrom

  if (
    (subject !== 'alicization-self'
      && subject !== 'relationship'
      && subject !== 'host-state'
      && subject !== 'task-knot'
      && subject !== 'visible-scene'
      && subject !== 'general')
    || (hostGoal !== 'resolve-problem'
      && hostGoal !== 'inspect-change'
      && hostGoal !== 'consume-media'
      && hostGoal !== 'rest'
      && hostGoal !== 'chat'
      && hostGoal !== 'browse'
      && hostGoal !== 'unknown')
    || (relationNeed !== 'space'
      && relationNeed !== 'companionship'
      && relationNeed !== 'guidance'
      && relationNeed !== 'care'
      && relationNeed !== 'unclear')
    || (truthMode !== 'live-grounded'
      && truthMode !== 'live-observed'
      && truthMode !== 'coarse-held'
      && truthMode !== 'dialogue-grounded'
      && truthMode !== 'continuity-carry'
      && truthMode !== 'repair-first'
      && truthMode !== 'memory-only')
    || (speechAct !== 'answer'
      && speechAct !== 'guide'
      && speechAct !== 'ask-reground'
      && speechAct !== 'correct-stale-anchor'
      && speechAct !== 'care'
      && speechAct !== 'defer')
    || (turnMode !== 'grounded-inspection'
      && turnMode !== 'screen-repair'
      && turnMode !== 'guide-current-knot'
      && turnMode !== 'care'
      && turnMode !== 'accompany'
      && turnMode !== 'answer')
    || (screenReferenceMode !== 'required'
      && screenReferenceMode !== 'helpful'
      && screenReferenceMode !== 'incidental'
      && screenReferenceMode !== 'avoid')
    || (speakingFrom !== 'live-scene'
      && speakingFrom !== 'task-thread'
      && speakingFrom !== 'dialogue-bond'
      && speakingFrom !== 'self-continuity'
      && speakingFrom !== 'held-memory')
  ) {
    return null
  }

  const normalizedOpeningClaim = sanitizeKernelAnchor(candidate.openingClaim, 220)
  const openingMove = sanitizeText(candidate.openingMove, 220)
  const whyNow = sanitizeKernelSurface(candidate.whyNow, 220)
  if (!normalizedOpeningClaim || !openingMove || !whyNow)
    return null

  const selectedEvidence = Array.isArray(candidate.selectedEvidence)
    ? candidate.selectedEvidence
        .filter(item => item && typeof item === 'object')
        .map((item) => {
          const evidence = item as Record<string, unknown>
          const kind = evidence.kind
          const source = evidence.source
          if (
            (kind !== 'scene'
              && kind !== 'thread'
              && kind !== 'project'
              && kind !== 'host-goal'
              && kind !== 'reply-motive'
              && kind !== 'private-thought'
              && kind !== 'repair'
              && kind !== 'memory')
            || (source !== 'current-scene'
              && source !== 'dialogue-world-thread'
              && source !== 'conversation-state'
              && source !== 'answer-compiler'
              && source !== 'answer-planner'
              && source !== 'reply-deliberation'
              && source !== 'private-thought'
              && source !== 'appraisal'
              && source !== 'world-model')
          ) {
            return null
          }
          const summary = sanitizeKernelSurface(evidence.summary, 220)
          if (!summary)
            return null
          return {
            kind,
            source,
            summary,
            confidence: clamp01(Number(evidence.confidence)),
          } satisfies AlicizationDialogueActKernelEvidence
        })
        .filter((item): item is AlicizationDialogueActKernelEvidence => Boolean(item))
        .slice(0, 6)
    : []

  return {
    subject,
    hostGoal,
    relationNeed,
    activeProject: sanitizeKernelSurface(candidate.activeProject, 180) || null,
    truthMode,
    speechAct,
    turnMode,
    screenReferenceMode,
    speakingFrom,
    selectedEvidence,
    openingClaim: normalizedOpeningClaim,
    openingMove,
    whyNow,
    mustSay: Array.isArray(candidate.mustSay)
      ? candidate.mustSay.filter((item): item is string => typeof item === 'string').map(item => sanitizeKernelSurface(item, 220)).filter(Boolean).slice(0, 10)
      : [],
    mustAvoid: Array.isArray(candidate.mustAvoid)
      ? candidate.mustAvoid.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 220)).filter(Boolean).slice(0, 10)
      : [],
    sourceTrace: Array.isArray(candidate.sourceTrace)
      ? candidate.sourceTrace.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 160)).filter(Boolean).slice(0, 10)
      : [],
    confidence: clamp01(Number(candidate.confidence)),
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

export function buildDialogueActKernel(input: {
  now: number
  currentScene?: AlicizationVisualSceneSnapshot | null
  appraisal?: AlicizationSubjectiveSceneAppraisal | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}): AlicizationDialogueActKernelSnapshot | null {
  const runtimeSurface = input.runtimeSurface ?? null
  const currentScene = runtimeSurface?.perception.currentScene ?? input.currentScene ?? null
  const appraisal = runtimeSurface?.cognition.appraisal ?? input.appraisal ?? null
  const discourseState = runtimeSurface?.dialogue.discourseState ?? input.discourseState ?? null
  const conversationState = runtimeSurface?.dialogue.conversationState ?? input.conversationState ?? null
  const dialogueWorldThread = runtimeSurface?.dialogue.dialogueWorldThread ?? input.dialogueWorldThread ?? null
  const answerCompiler = runtimeSurface?.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const replyDeliberation = runtimeSurface?.dialogue.replyDeliberation ?? input.replyDeliberation ?? null
  const answerPlanner = runtimeSurface?.dialogue.answerPlanner ?? input.answerPlanner ?? null
  const privateThought = runtimeSurface?.cognition.privateThought ?? input.privateThought ?? null
  const worldModel = runtimeSurface?.world.worldModel ?? input.worldModel ?? null

  const subject = answerCompiler?.answerSubject
    ?? discourseState?.currentTurnSubject
    ?? (currentScene ? 'visible-scene' : 'general')
  const screenReferenceMode: AlicizationDialogueScreenReferenceMode = answerCompiler?.screenReferenceMode
    ?? discourseState?.screenReferenceMode
    ?? (subject === 'visible-scene' ? 'required' : 'avoid')
  const truthMode = resolveTruthMode({
    answerPlanner,
    answerCompiler,
    worldModel,
  })
  let speechAct = resolveSpeechAct({
    answerPlanner,
    answerCompiler,
    replyDeliberation,
    discourseState,
    privateThought,
  })
  const dialogueFirstBoundary = isDialogueFirstSubject(subject) || screenReferenceMode === 'avoid'
  const dialogueFirstRepairClamp = dialogueFirstBoundary
    && (speechAct === 'ask-reground' || speechAct === 'correct-stale-anchor')
  if (dialogueFirstRepairClamp) {
    speechAct = discourseState?.owedAction === 'care-host'
      ? 'care'
      : 'answer'
  }
  if (
    truthMode === 'live-grounded'
    && screenReferenceMode !== 'avoid'
    && (subject === 'visible-scene' || subject === 'task-knot')
    && (speechAct === 'correct-stale-anchor' || speechAct === 'ask-reground')
  ) {
    speechAct = subject === 'task-knot' ? 'guide' : 'answer'
  }
  const turnMode = resolveTurnMode({
    answerCompiler,
    speechAct,
    subject,
    truthMode,
    enforceDialogueFirstBoundary: dialogueFirstBoundary,
  })
  const hostGoal = resolveHostGoal({
    appraisal,
    answerCompiler,
    worldModel,
    currentScene,
  })
  const relationNeed = resolveRelationNeed({
    appraisal,
    answerCompiler,
    privateThought,
    subject,
  })
  const dialogueFirstTurn = isDialogueFirstSubject(subject) || screenReferenceMode === 'avoid'
  const sceneCue = buildAlicizationScreenSurfaceCue({
    rawCues: [
      currentScene?.summary,
      answerCompiler?.openingClaim,
      answerPlanner?.answerIntent,
      conversationState?.activeProject,
      dialogueWorldThread?.activeThread,
      dialogueWorldThread?.currentQuestion,
    ],
    target: currentScene?.target ?? worldModel?.focusTarget ?? null,
    scenario: currentScene?.scenario ?? null,
    workloadKind: currentScene?.workloadKind ?? null,
    contentKind: currentScene?.contentKind ?? null,
  })
  const anchorCoherence = resolveDialogueAnchorCoherence({
    subject,
    screenReferenceMode,
    truthState: truthMode === 'live-grounded' || truthMode === 'live-observed'
      ? truthMode
      : truthMode === 'coarse-held'
        ? 'live-observed'
        : truthMode === 'dialogue-grounded' || truthMode === 'continuity-carry' || truthMode === 'memory-only'
          ? 'remembered'
          : 'uncertain',
    hostMove: conversationState?.hostMove ?? dialogueWorldThread?.lastUserMove ?? null,
    candidates: [
      { role: 'focus', text: dialogueFirstTurn ? conversationState?.primaryTurnAnchor ?? discourseState?.primaryTurnAnchor : null },
      { role: 'scene', text: dialogueFirstTurn ? null : sceneCue || null },
      { role: 'opening-claim', text: dialogueFirstTurn ? null : answerCompiler?.openingClaim ?? null },
      { role: 'answer-intent', text: dialogueFirstTurn ? null : answerPlanner?.answerIntent ?? null },
      { role: 'project', text: dialogueFirstTurn ? null : conversationState?.activeProject ?? null },
      { role: 'thread', text: dialogueFirstTurn ? null : dialogueWorldThread?.activeThread ?? null },
      { role: 'question', text: dialogueFirstTurn ? null : dialogueWorldThread?.currentQuestion ?? null },
      { role: 'focus', text: dialogueFirstTurn ? null : worldModel?.activeThread?.summary ?? null },
      { role: 'visible-surface', text: dialogueFirstTurn ? null : currentScene?.target?.title ?? null },
    ],
  })
  const dominantAnchor = anchorCoherence.dominant
  const keepCoherent = (value: unknown) => {
    const normalized = sanitizeKernelAnchor(value, 220)
    if (!normalized)
      return null
    if (!anchorCoherence.sceneAuthority || !dominantAnchor)
      return normalized
    return anchorsMateriallyConflict(normalized, dominantAnchor) ? null : normalized
  }
  const activeProject = sanitizeKernelAnchor(
    keepCoherent(dialogueFirstTurn ? '' : conversationState?.activeProject)
    ?? keepCoherent(dialogueFirstTurn ? '' : worldModel?.activeThread?.title)
    ?? keepCoherent(dialogueFirstTurn ? '' : worldModel?.activeThread?.summary)
    ?? keepCoherent(dialogueFirstTurn ? '' : sceneCue)
    ?? dominantAnchor
    ?? '',
    180,
  ) || null
  const openingClaim = sanitizeKernelAnchor(
    (anchorCoherence.sceneAuthority ? dominantAnchor : null)
    ?? keepCoherent(answerCompiler?.openingClaim)
    ?? keepCoherent(sceneCue)
    ?? keepCoherent(dialogueWorldThread?.currentQuestion)
    ?? keepCoherent(conversationState?.unansweredQuestion)
    ?? keepCoherent(discourseState?.currentTurnSummary)
    ?? dominantAnchor
    ?? '',
    220,
  )
  const openingMove = sanitizeText(
    answerPlanner?.openingMove
    ?? replyDeliberation?.openingBeat
    ?? answerCompiler?.openingDirective
    ?? answerCompiler?.nextMove
    ?? '',
    220,
  )
  const whyNow = sanitizeText(
    keepCoherent(sceneCue)
    ?? keepCoherent(answerCompiler?.openingClaim)
    ?? keepCoherent(replyDeliberation?.whyThisReplyNow)
    ?? keepCoherent(answerPlanner?.answerIntent)
    ?? dominantAnchor
    ?? keepCoherent(dialogueWorldThread?.currentQuestion)
    ?? keepCoherent(conversationState?.jointThread)
    ?? keepCoherent(privateThought?.thoughtText)
    ?? sceneCue
    ?? '',
    220,
  )
  if (!openingClaim || !openingMove || !whyNow)
    return null

  const selectedEvidence = [
    createEvidence({
      kind: currentScene ? 'scene' : 'memory',
      source: 'current-scene',
      summary: dialogueFirstTurn
        ? null
        : sceneCue || null,
      confidence: dialogueFirstTurn ? 0 : currentScene?.confidence ?? 0.5,
    }),
    createEvidence({
      kind: 'thread',
      source: 'dialogue-world-thread',
      summary: dialogueWorldThread?.currentQuestion
        ?? dialogueWorldThread?.activeThread
        ?? conversationState?.jointThread
        ?? null,
      confidence: dialogueWorldThread?.confidence ?? 0.5,
    }),
    createEvidence({
      kind: 'project',
      source: 'conversation-state',
      summary: dialogueFirstTurn ? null : conversationState?.activeProject ?? null,
      confidence: conversationState?.confidence ?? 0.5,
    }),
    createEvidence({
      kind: speechAct === 'ask-reground' || speechAct === 'correct-stale-anchor' ? 'repair' : 'reply-motive',
      source: 'reply-deliberation',
      summary: replyDeliberation?.whyThisReplyNow ?? replyDeliberation?.openingBeat ?? null,
      confidence: replyDeliberation?.confidence ?? 0.5,
    }),
    createEvidence({
      kind: 'private-thought',
      source: 'private-thought',
      summary: privateThought?.thoughtText ?? null,
      confidence: privateThought?.confidence ?? 0.5,
    }),
    createEvidence({
      kind: 'host-goal',
      source: 'appraisal',
      summary: dialogueFirstTurn
        ? null
        : appraisal?.currentKnot
          ?? appraisal?.situatedMeaning
          ?? appraisal?.whatChanged
          ?? null,
      confidence: dialogueFirstTurn ? 0 : appraisal?.confidence ?? 0.5,
    }),
    createEvidence({
      kind: speechAct === 'ask-reground' || speechAct === 'correct-stale-anchor' ? 'repair' : 'thread',
      source: 'answer-compiler',
      summary: answerCompiler?.openingClaim ?? answerCompiler?.uncertaintyBoundary ?? null,
      confidence: answerCompiler?.confidence ?? 0.5,
    }),
  ]
    .filter((item): item is AlicizationDialogueActKernelEvidence => Boolean(item))
    .sort((left, right) => {
      const scoreEvidence = (item: AlicizationDialogueActKernelEvidence) => {
        let score = 0
        if (dominantAnchor && anchorsMateriallyAlign(item.summary, dominantAnchor))
          score += 4
        else if (anchorCoherence.sceneAuthority && dominantAnchor && anchorsMateriallyConflict(item.summary, dominantAnchor))
          score -= 3
        if (item.source === 'current-scene')
          score += 3
        if (item.kind === 'scene')
          score += 2
        if (item.kind === 'repair' || item.kind === 'reply-motive')
          score += 1
        if (anchorCoherence.sceneAuthority && (item.source === 'dialogue-world-thread' || item.source === 'conversation-state'))
          score -= 1
        return score
      }
      return scoreEvidence(right) - scoreEvidence(left)
    })
    .slice(0, 6)

  return {
    subject,
    hostGoal,
    relationNeed,
    activeProject,
    truthMode,
    speechAct,
    turnMode,
    screenReferenceMode,
    speakingFrom: replyDeliberation?.speakingFrom ?? 'task-thread',
    selectedEvidence,
    openingClaim,
    openingMove,
    whyNow,
    mustSay: uniqueSurfaceList([
      openingClaim,
      answerPlanner?.answerIntent,
      replyDeliberation?.whyThisReplyNow,
      selectedEvidence[0]?.summary,
      conversationState?.activeProject,
    ], 6),
    mustAvoid: uniqueList([
      ...(answerCompiler?.mustNotDo ?? []),
      ...(replyDeliberation?.mustAvoid ?? []),
      ...(answerPlanner?.mustNotDo ?? []),
    ], 10),
    sourceTrace: uniqueList([
      `subject:${subject}`,
      `host-goal:${hostGoal}`,
      `relation-need:${relationNeed}`,
      `speech-act:${speechAct}`,
      `turn-mode:${turnMode}`,
      `truth-mode:${truthMode}`,
      `screen-reference:${screenReferenceMode}`,
      dialogueFirstRepairClamp ? 'kernel-invariant:dialogue-first-repair-clamped' : null,
      ...anchorCoherence.reasonTags,
      privateThought ? `presence:${privateThought.embodiedPresence}` : null,
      activeProject ? `project:${activeProject}` : null,
    ], 10),
    confidence: clamp01(
      (answerPlanner?.confidence ?? 0.35) * 0.3
      + (replyDeliberation?.confidence ?? 0.35) * 0.28
      + (answerCompiler?.confidence ?? 0.35) * 0.22
      + (privateThought?.confidence ?? 0.35) * 0.12
      + (selectedEvidence.length > 0 ? 0.08 : 0.02),
    ),
    updatedAt: input.now,
  } satisfies AlicizationDialogueActKernelSnapshot
}

export function buildDialogueActKernelSystemBlock(kernel: AlicizationDialogueActKernelSnapshot | null | undefined) {
  if (!kernel)
    return ''

  return [
    'Alicization dialogue act kernel.',
    'This is dialogue-owned context; it does not author visible wording.',
    'Subject, truth posture, and motive are governed upstream.',
    `Subject: ${kernel.subject}.`,
    `Host goal: ${kernel.hostGoal}.`,
    `Relationship need: ${kernel.relationNeed}.`,
    `Active project: ${kernel.activeProject ?? 'none'}.`,
    `Truth mode: ${kernel.truthMode}.`,
    `Speech act: ${kernel.speechAct}.`,
    `Turn mode: ${kernel.turnMode}.`,
    `Screen reference mode: ${kernel.screenReferenceMode}.`,
    `Speaking from: ${kernel.speakingFrom}.`,
    `Opening claim: ${formatProviderFacingControl(kernel.openingClaim)}.`,
    `Opening move: ${formatProviderFacingControl(kernel.openingMove)}.`,
    `Why now: ${formatProviderFacingControl(kernel.whyNow)}.`,
    'Evidence selected by dialogue governance:',
    ...(kernel.selectedEvidence.length > 0
      ? kernel.selectedEvidence.map(item => `- [${item.source}/${item.kind}] ${formatProviderFacingControl(item.summary)}`)
      : ['- none']),
    'Required signals from governance:',
    ...(kernel.mustSay.length > 0 ? kernel.mustSay.map(item => `- ${formatProviderFacingControl(item)}`) : ['- none']),
    'Signals excluded by governance:',
    ...(kernel.mustAvoid.length > 0 ? kernel.mustAvoid.map(item => `- ${formatProviderFacingControl(item)}`) : ['- none']),
  ].join('\n')
}
