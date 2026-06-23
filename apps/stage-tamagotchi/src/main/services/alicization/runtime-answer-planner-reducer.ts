import type { AlicizationCurrentConsciousFrameSnapshot, AlicizationMindTurnGovernance, AlicizationRuntimeProjectStateDigest } from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import { isAlicizationThinProjectAwarenessLine } from '@proj-alicization/stage-shared'

import {
  compactProjectLatestProgressForSystemBlock,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
} from './project-state-brief'
import { mergeGuidanceLine, mergeUniqueRules } from './runtime-turn-composition'

export interface RuntimeAnswerPlannerReducerInput {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  governance: AlicizationMindTurnGovernance | null
  now: number
}

function preferProjectStateLine(primary: unknown, fallback: unknown) {
  const primaryText = String(primary ?? '').trim()
  const fallbackText = String(fallback ?? '').trim()
  if (!primaryText)
    return fallbackText
  if (!fallbackText)
    return primaryText
  const primaryLooksEmbodied = /holding together mainly through|voice|face|motion|lipsync|cross-modal|one living digital life|same living line/u.test(primaryText.toLowerCase())
  const fallbackLooksCanonicalExpansion = /local-first digital life project building one continuous|still-open closure is|same phase 1 digital life\. some closure already/u.test(fallbackText.toLowerCase())
  if (primaryLooksEmbodied && fallbackLooksCanonicalExpansion)
    return primaryText
  if (fallbackText.startsWith(primaryText) && fallbackText.length > primaryText.length)
    return fallbackText
  return primaryText
}

function isCanonicalProjectReminderLine(text: string | null | undefined) {
  const normalized = String(text ?? '').trim().toLowerCase()
  if (!normalized)
    return false
  return /before answering, remember: alicization is a local-first digital life project building one continuous "her"|she is still inside phase 1: local digital life|the still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment|same phase 1 digital life|回答前.*本地优先数字生命项目|开口前.*本地优先数字生命项目|第一阶段.*本地数字生命|还没有?完全收住|还没闭环/u.test(normalized)
}

function isStrongerSameHerHeadline(text: string | null | undefined) {
  const normalized = String(text ?? '').trim().toLowerCase()
  if (!normalized)
    return false
  const modalityCueCount = [
    'body',
    'face',
    'motion',
    'lipsync',
    'voice',
    'audible',
    'cross-modal',
    'embodiment',
    'resident presence',
  ].filter(cue => normalized.includes(cue)).length
  const carriesEmbodiedSameHerClosure = modalityCueCount >= 2
    && /one living her|same living line|same her|same-her|holding together|closure settles|closure is done|rejoin/u.test(normalized)
  return /holding together mainly through|same living line|one continuous her|one living digital life|same-her continuity|same her continuity|still needs .* closure|without splitting her continuity|generic project shell|detached project narrator/u.test(normalized)
    || carriesEmbodiedSameHerClosure
    || (
      /同一个她|同一个 her|数字生命项目|本地优先数字生命项目/u.test(normalized)
      && /第一阶段|本地数字生命|连续性|记忆|执行|主动性|具身|对话闭环|闭环|收住|还差什么|还没/u.test(normalized)
    )
}

function isThinProjectAwarenessLine(text: string | null | undefined) {
  const normalized = String(text ?? '').trim().toLowerCase()
  if (!normalized)
    return false
  return isAlicizationThinProjectAwarenessLine(normalized)
    || /same digital life|回答前先记住这是同一个她(?:的数字生命项目)?|先记住这是同一个她(?:的数字生命项目)?|别把这条线忘了|别把这条线弄丢/u.test(normalized)
}

function deriveSameHerEmotionalClosureCueFromGovernance(governance: AlicizationMindTurnGovernance | null) {
  const corpus = [
    governance?.openingMove,
    governance?.answerIntent,
    governance?.focusAnchor,
    governance?.liveSurface,
    ...(governance?.mustDo ?? []),
    ...(governance?.mustNotDo ?? []),
  ]
    .map(value => String(value ?? '').toLowerCase())
    .join(' | ')
  const hasLowPressureCarry
    = corpus.includes('same-her emotional closure line low-pressure and inward')
      || corpus.includes('same-her closure line low-pressure and inward')
      || corpus.includes('keep the same-her emotional closure line low-pressure')
  const hasAntiRestartCarry
    = corpus.includes('do not let the answer reopen the same-her line from scratch')
      || corpus.includes('do not reopen from scratch')
      || corpus.includes('reopen the same-her line from scratch')
  if (!hasLowPressureCarry || !hasAntiRestartCarry)
    return null
  return 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.'
}

function normalizePreferredBlinkCadence(raw: unknown): AlicizationRuntimeProjectStateDigest['preferredBlinkCadence'] {
  return raw === 'normal' || raw === 'linger' || raw === 'quiet'
    ? raw
    : null
}

function normalizePreferredGazeMode(raw: unknown): AlicizationRuntimeProjectStateDigest['preferredGazeMode'] {
  return raw === 'steady' || raw === 'soften' || raw === 'drift'
    ? raw
    : null
}

function normalizeContinuityPreferredTiming(raw: unknown): NonNullable<AlicizationCurrentConsciousFrameSnapshot['projectState']>['continuityPreferredTiming'] {
  return raw === 'internal-only'
    || raw === 'after-payoff'
    || raw === 'same-turn-if-invited'
    || raw === 'next-open-window'
    ? raw
    : null
}

export function reduceRuntimeAnswerPlanner(input: RuntimeAnswerPlannerReducerInput) {
  const surface = input.surface ?? null
  const governance = input.governance ?? null
  if (!surface || !governance)
    return surface
  const answerIntent = governance.answerIntent ?? governance.focusAnchor ?? governance.liveSurface ?? ''
  const openingMove = governance.openingMove ?? answerIntent
  const canonicalProjectState = resolveAlicizationProjectStateBrief()
  const consciousProjectState = surface.dialogue?.currentConsciousFrame?.projectState ?? null
  const rawProjectState = surface.raw?.runtimeDigest?.projectState ?? null
  const cognitionProjectState = surface.cognition?.runtimeDigest?.projectState ?? null
  const currentPhase = preferProjectStateLine(
    consciousProjectState?.currentPhase,
    canonicalProjectState.currentPhase,
  )
  const continuityPreferredTiming = normalizeContinuityPreferredTiming(
    consciousProjectState?.continuityPreferredTiming
    ?? rawProjectState?.continuityPreferredTiming
    ?? cognitionProjectState?.continuityPreferredTiming
    ?? surface.memory?.memoryDeliberation?.followUpAffordance?.preferredTiming
    ?? null,
  )
  const continuityCadence = String(
    consciousProjectState?.continuityCadence
    ?? rawProjectState?.continuityCadence
    ?? cognitionProjectState?.continuityCadence
    ?? '',
  ).trim()
  const preferredBlinkCadence = normalizePreferredBlinkCadence(
    consciousProjectState?.preferredBlinkCadence
    ?? rawProjectState?.preferredBlinkCadence
    ?? cognitionProjectState?.preferredBlinkCadence
    ?? null,
  )
  const preferredGazeMode = normalizePreferredGazeMode(
    consciousProjectState?.preferredGazeMode
    ?? rawProjectState?.preferredGazeMode
    ?? cognitionProjectState?.preferredGazeMode
    ?? null,
  )
  const preDialogueAwarenessLine = preferProjectStateLine(
    resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: consciousProjectState,
      fallbackProjectState: {
        preDialogueAwarenessLine: canonicalProjectState.preDialogueAwarenessLine ?? null,
        preflightSummary: canonicalProjectState.preflightSummary ?? null,
      },
    }),
    '',
  )
  const rawPreDialogueAwarenessLine = preferProjectStateLine(
    consciousProjectState?.preDialogueAwarenessLine,
    rawProjectState?.preDialogueAwarenessLine ?? cognitionProjectState?.preDialogueAwarenessLine ?? '',
  )
  const rawAwarenessLine = preferProjectStateLine(
    consciousProjectState?.awarenessLine,
    rawProjectState?.awarenessLine ?? cognitionProjectState?.awarenessLine ?? '',
  )
  const rawAwarenessSummary = preferProjectStateLine(
    consciousProjectState?.preDialogueAwarenessSummary,
    rawProjectState?.preDialogueAwarenessSummary ?? cognitionProjectState?.preDialogueAwarenessSummary ?? '',
  )
  const companionHeadlineLine = preferProjectStateLine(
    consciousProjectState?.companionHeadlineLine,
    rawProjectState?.companionHeadlineLine ?? cognitionProjectState?.companionHeadlineLine ?? '',
  )
  const shouldPreservePreparedPreDialogueAwarenessCarry = Boolean(
    rawPreDialogueAwarenessLine
    && rawPreDialogueAwarenessLine.startsWith('Before answering')
    && !isThinProjectAwarenessLine(rawPreDialogueAwarenessLine)
    && preDialogueAwarenessLine
    && !preDialogueAwarenessLine.startsWith('Before answering')
    && /local-first digital life project|phase 1|same[- ]life seam|still-open closure|same[- ]her/iu.test(
      preDialogueAwarenessLine,
    ),
  )
  const preferredPreparedAwarenessLine
    = isStrongerSameHerHeadline(companionHeadlineLine)
      && (
        isCanonicalProjectReminderLine(preDialogueAwarenessLine)
        || isCanonicalProjectReminderLine(rawPreDialogueAwarenessLine)
        || isCanonicalProjectReminderLine(rawAwarenessLine)
        || isCanonicalProjectReminderLine(rawAwarenessSummary)
        || isThinProjectAwarenessLine(rawPreDialogueAwarenessLine)
        || isThinProjectAwarenessLine(rawAwarenessLine)
        || isThinProjectAwarenessLine(rawAwarenessSummary)
        || (
          /measured-return|lower-pressure|callback line/u.test(preDialogueAwarenessLine.toLowerCase())
          && !isStrongerSameHerHeadline(preDialogueAwarenessLine)
        )
      )
      ? companionHeadlineLine
      : shouldPreservePreparedPreDialogueAwarenessCarry
        ? rawPreDialogueAwarenessLine
        : preDialogueAwarenessLine
  const primaryOpenLoop = preferProjectStateLine(
    consciousProjectState?.primaryOpenLoop,
    canonicalProjectState.openLoops[0] ?? '',
  )
  const proactiveSameHerGap = preferProjectStateLine(
    consciousProjectState?.proactiveSameHerGap,
    canonicalProjectState.proactiveSameHerGap,
  )
  const latestLandedProgressSource = preferProjectStateLine(
    consciousProjectState?.latestLandedProgress ?? consciousProjectState?.latestProgress,
    canonicalProjectState.continuityProgressSummary
    ?? canonicalProjectState.memoryAnthropomorphismProgress.at(-1)
    ?? '',
  )
  const latestLandedProgress
    = compactProjectLatestProgressForSystemBlock(latestLandedProgressSource, 360)
      || latestLandedProgressSource
  const nextClosureTarget = preferProjectStateLine(
    consciousProjectState?.nextClosureTarget,
    canonicalProjectState.nextClosureTarget,
  )
  const sameHerSelfLine = preferProjectStateLine(
    consciousProjectState?.sameHerSelfLine,
    canonicalProjectState.sameHerSelfLine,
  )
  const sameHerDriftRisk = preferProjectStateLine(
    consciousProjectState?.sameHerDriftRisk,
    canonicalProjectState.sameHerDriftRisk,
  )
  const governingProject = [
    preferredPreparedAwarenessLine,
    sameHerSelfLine,
    sameHerDriftRisk,
    currentPhase,
    latestLandedProgress,
    primaryOpenLoop,
    proactiveSameHerGap,
    nextClosureTarget,
  ]
    .map(value => String(value ?? '').trim())
    .filter(Boolean)
    .join(' | ')
  const projectConstraintLine = primaryOpenLoop
    ? `Keep the answer on the same digital-life closure seam: ${primaryOpenLoop}`
    : 'Keep the answer on the same digital-life closure seam.'
  const emotionalClosureCue = [
    consciousProjectState?.emotionalClosureCue,
    governance.emotionalClosureCue,
    deriveSameHerEmotionalClosureCueFromGovernance(governance),
  ]
    .map(value => String(value ?? '').trim())
    .find(Boolean)
    ?? ''
  const emotionalClosureNarrativeTag = emotionalClosureCue
    ? `emotional_closure:${emotionalClosureCue}`
    : null
  const continuityTexts = [
    governance.openingMove,
    governance.answerIntent,
    governance.focusAnchor,
    governance.liveSurface,
    ...(governance.mustDo ?? []),
    ...(governance.mustNotDo ?? []),
  ]
    .map(value => String(value ?? '').toLowerCase())
    .join(' | ')
  const sameThreadAntiRestartMustDo = continuityTexts.includes('same thread')
    || continuityTexts.includes('same living thread')
    || continuityTexts.includes('same-thread-continuation')
    || continuityTexts.includes('same line')
    || continuityTexts.includes('held back')
    || continuityTexts.includes('gently before widening')
    || continuityTexts.includes('continue')
    || continuityTexts.includes('one continuous her')
    ? [
        'Keep this on one continuous her line instead of restarting the relationship as a fresh opening.',
        'Stay on the same thread before widening closeness or adding a new approach.',
      ]
    : []
  const sameThreadAntiRestartMustNotDo = sameThreadAntiRestartMustDo.length
    ? [
        'Do not rewrite the still-live line as a fresh opening or reintroduction.',
      ]
    : []

  return {
    ...surface,
    raw: {
      ...surface.raw,
      runtimeDigest: surface.raw?.runtimeDigest
        ? {
            ...surface.raw.runtimeDigest,
            projectState: {
              ...surface.raw.runtimeDigest.projectState,
              preDialogueAwarenessLine: preferredPreparedAwarenessLine || (((surface.raw.runtimeDigest.projectState as { preDialogueAwarenessLine?: string | null } | null)?.preDialogueAwarenessLine) ?? null),
              awarenessLine: preferredPreparedAwarenessLine || (((surface.raw.runtimeDigest.projectState as { awarenessLine?: string | null } | null)?.awarenessLine) ?? null),
              preDialogueAwarenessSummary: preferredPreparedAwarenessLine || (((surface.raw.runtimeDigest.projectState as { preDialogueAwarenessSummary?: string | null } | null)?.preDialogueAwarenessSummary) ?? null),
              companionHeadlineLine: companionHeadlineLine || (((surface.raw.runtimeDigest.projectState as { companionHeadlineLine?: string | null } | null)?.companionHeadlineLine) ?? null),
              proactiveSameHerGap: proactiveSameHerGap || (((surface.raw.runtimeDigest.projectState as { proactiveSameHerGap?: string | null } | null)?.proactiveSameHerGap) ?? null),
              continuityPreferredTiming: continuityPreferredTiming || (((surface.raw.runtimeDigest.projectState as { continuityPreferredTiming?: string | null } | null)?.continuityPreferredTiming) ?? null),
              continuityCadence: continuityCadence || (((surface.raw.runtimeDigest.projectState as { continuityCadence?: string | null } | null)?.continuityCadence) ?? null),
              preferredBlinkCadence: preferredBlinkCadence || normalizePreferredBlinkCadence((surface.raw.runtimeDigest.projectState as AlicizationRuntimeProjectStateDigest | null)?.preferredBlinkCadence),
              preferredGazeMode: preferredGazeMode || normalizePreferredGazeMode((surface.raw.runtimeDigest.projectState as AlicizationRuntimeProjectStateDigest | null)?.preferredGazeMode),
            },
          }
        : surface.raw?.runtimeDigest,
    },
    dialogue: {
      ...surface.dialogue,
      currentConsciousFrame: surface.dialogue?.currentConsciousFrame
        ? {
            ...surface.dialogue.currentConsciousFrame,
            projectState: {
              ...surface.dialogue.currentConsciousFrame?.projectState,
              preDialogueAwarenessLine: preferredPreparedAwarenessLine || null,
              awarenessLine: preferredPreparedAwarenessLine || null,
              preDialogueAwarenessSummary: preferredPreparedAwarenessLine || null,
              companionHeadlineLine: companionHeadlineLine || null,
              proactiveSameHerGap: proactiveSameHerGap || null,
              continuityPreferredTiming: continuityPreferredTiming || null,
              continuityCadence: continuityCadence || null,
              preferredBlinkCadence: preferredBlinkCadence || null,
              preferredGazeMode: preferredGazeMode || null,
            },
          }
        : surface.dialogue?.currentConsciousFrame ?? null,
      replyDeliberation: surface.dialogue?.replyDeliberation
        ? {
            ...surface.dialogue.replyDeliberation,
            mustInclude: mergeUniqueRules([
              ...(surface.dialogue.replyDeliberation?.mustInclude ?? []),
              ...sameThreadAntiRestartMustDo,
              ...(governance.mustDo ?? []),
            ], 10),
            mustAvoid: mergeUniqueRules([
              ...(surface.dialogue.replyDeliberation?.mustAvoid ?? []),
              ...sameThreadAntiRestartMustNotDo,
              ...(governance.mustNotDo ?? []),
            ], 10),
            narrative: mergeUniqueRules([
              ...(surface.dialogue.replyDeliberation?.narrative ?? []),
              'runtime-answer-planner',
              'project-state-answer-planner',
              emotionalClosureNarrativeTag,
            ], 8),
          }
        : {
            selectedMotive: governance.answerAct === 'care' ? 'care' : governance.answerAct === 'guide' ? 'guide' : 'answer',
            speakingFrom: governance.screenReferenceMode === 'avoid' ? 'dialogue-bond' : 'task-thread',
            memoryMode: governance.suppressAssociativeRecall ? 'suppress-associative' : 'dialogue-carry',
            openingBeat: openingMove,
            whyThisReplyNow: answerIntent,
            whyNotOtherCandidates: [],
            withheldImpulses: [],
            candidateMotives: [],
            shouldSpeak: true,
            mustInclude: mergeUniqueRules([
              ...sameThreadAntiRestartMustDo,
              ...(governance.mustDo ?? []),
            ], 10),
            mustAvoid: mergeUniqueRules([
              ...sameThreadAntiRestartMustNotDo,
              ...(governance.mustNotDo ?? []),
            ], 10),
            confidence: 0.72,
            narrative: mergeUniqueRules([
              'runtime-answer-planner',
              'project-state-answer-planner',
              emotionalClosureNarrativeTag,
            ], 8),
            updatedAt: input.now,
          },
      answerPlanner: surface.dialogue?.answerPlanner
        ? {
            ...surface.dialogue.answerPlanner,
            governingProject: surface.dialogue.answerPlanner?.governingProject ?? (governingProject || null),
            mustDo: mergeUniqueRules([
              ...(surface.dialogue.answerPlanner?.mustDo ?? []),
              projectConstraintLine,
              ...sameThreadAntiRestartMustDo,
              ...(governance.mustDo ?? []),
            ], 10),
            mustNotDo: mergeUniqueRules([
              ...(surface.dialogue.answerPlanner?.mustNotDo ?? []),
              ...sameThreadAntiRestartMustNotDo,
              ...(governance.mustNotDo ?? []),
            ], 10),
            narrative: mergeUniqueRules([
              ...(surface.dialogue.answerPlanner?.narrative ?? []),
              'runtime-answer-planner',
              'project-state-answer-planner',
              emotionalClosureNarrativeTag,
            ], 8),
          }
        : {
            act: governance.answerAct ?? 'answer',
            evidenceMode: governance.evidenceMode ?? 'dialogue-grounded',
            confidence: 0.72,
            governingFocus: answerIntent,
            governingProject: governingProject || null,
            openingMove,
            answerIntent,
            relationshipPosture: governance.relationshipPosture ?? 'warm',
            shouldAskForGrounding: governance.shouldAskForGrounding,
            shouldAcknowledgeRepair: governance.shouldAcknowledgeRepair,
            selectedConcernEntryId: null,
            selectedRepairId: null,
            selectedCommitmentId: null,
            selectedInquiryPlanId: null,
            selectedRuntimeThreadId: null,
            selectedProjectId: null,
            selectedReflectionId: null,
            executivePhase: null,
            selectedTruthFrame: null,
            mustDo: mergeUniqueRules([
              projectConstraintLine,
              ...sameThreadAntiRestartMustDo,
              ...(governance.mustDo ?? []),
            ], 10),
            mustNotDo: mergeUniqueRules([
              ...sameThreadAntiRestartMustNotDo,
              ...(governance.mustNotDo ?? []),
            ], 10),
            narrative: mergeUniqueRules([
              'runtime-answer-planner',
              'project-state-answer-planner',
              emotionalClosureNarrativeTag,
            ], 8),
            updatedAt: input.now,
          },
      dialogueActKernel: surface.dialogue?.dialogueActKernel
        ? {
            ...surface.dialogue.dialogueActKernel,
            mustSay: mergeUniqueRules([
              ...(surface.dialogue.dialogueActKernel?.mustSay ?? []),
              answerIntent,
              ...(governance.mustDo ?? []),
            ], 8),
            mustAvoid: mergeUniqueRules([
              ...(surface.dialogue.dialogueActKernel?.mustAvoid ?? []),
              ...(governance.mustNotDo ?? []),
            ], 8),
            sourceTrace: mergeUniqueRules([
              ...(surface.dialogue.dialogueActKernel?.sourceTrace ?? []),
              'runtime-answer-planner',
            ], 8),
          }
        : {
            subject: governance.answerSubject ?? 'general',
            hostGoal: governance.answerAct === 'care' ? 'rest' : 'resolve-problem',
            relationNeed: governance.answerSubject === 'relationship' ? 'companionship' : governance.answerAct === 'care' ? 'care' : 'guidance',
            activeProject: null,
            truthMode: governance.screenReferenceMode === 'avoid' ? 'memory-only' : governance.evidenceMode ?? 'dialogue-grounded',
            speechAct: governance.answerAct ?? 'answer',
            turnMode: governance.turnMode,
            screenReferenceMode: governance.screenReferenceMode ?? 'avoid',
            speakingFrom: governance.screenReferenceMode === 'avoid' ? 'dialogue-bond' : 'task-thread',
            selectedEvidence: [],
            openingClaim: mergeGuidanceLine([governance.focusAnchor ?? null, governance.liveSurface ?? null], 220) || answerIntent,
            openingMove,
            whyNow: answerIntent,
            mustSay: mergeUniqueRules([answerIntent, ...(governance.mustDo ?? [])], 8),
            mustAvoid: mergeUniqueRules(governance.mustNotDo ?? [], 8),
            sourceTrace: ['runtime-answer-planner'],
            confidence: 0.72,
            updatedAt: input.now,
          },
    },
  } satisfies AlicizationDigitalLifeRuntimeSurface
}
