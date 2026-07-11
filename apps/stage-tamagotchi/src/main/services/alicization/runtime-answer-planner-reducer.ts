import type { AlicizationCurrentConsciousFrameSnapshot, AlicizationMindTurnGovernance, AlicizationRuntimeProjectStateDigest } from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import {
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
  isAlicizationThinProjectAwarenessLine,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

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
  const primaryText = sanitizeRuntimeAnswerPlannerText(primary, 12000)
  const fallbackText = sanitizeRuntimeAnswerPlannerText(fallback, 12000)
  if (!primaryText)
    return fallbackText
  if (!fallbackText)
    return primaryText
  const primaryLooksEmbodied = /holding together mainly through|voice|face|motion|lipsync|cross-modal|embodiment_continuity|cross_modal/u.test(primaryText.toLowerCase())
  const fallbackLooksCanonicalExpansion = /local-first digital life project building one continuous|still-open closure is|same phase 1 digital life\. some closure already/u.test(fallbackText.toLowerCase())
  if (primaryLooksEmbodied && fallbackLooksCanonicalExpansion)
    return primaryText
  if (fallbackText.startsWith(primaryText) && fallbackText.length > primaryText.length)
    return fallbackText
  return primaryText
}

function sanitizeRuntimeAnswerPlannerText(raw: unknown, maxChars = 360) {
  const sanitized = sanitizeAlicizationProviderFacingText(raw, maxChars, '')
  if (sanitized)
    return sanitized

  const normalized = String(raw ?? '').trim()
  if (!normalized)
    return ''

  const replacementCheck = sanitizeAlicizationProviderFacingText(normalized, maxChars, alicizationFixedTemplateReplacement)
  if (replacementCheck !== alicizationFixedTemplateReplacement)
    return ''

  return ''
}

function sanitizeRuntimeAnswerPlannerRule(raw: unknown) {
  const sanitized = sanitizeAlicizationProviderFacingText(raw, 360, '')
  if (sanitized)
    return sanitized
  const normalized = String(raw ?? '').trim()
  if (!normalized)
    return ''
  if (sanitizeAlicizationProviderFacingText(normalized, 360, alicizationFixedTemplateReplacement) === alicizationFixedTemplateReplacement)
    return ''
  return ''
}

function sanitizeRuntimeAnswerPlannerRules(values: unknown[] | null | undefined) {
  return (values ?? [])
    .map(sanitizeRuntimeAnswerPlannerRule)
    .filter(Boolean)
}

function sanitizeRuntimeAnswerPlannerMetaRules(values: unknown[] | null | undefined) {
  return mergeUniqueRules(sanitizeRuntimeAnswerPlannerRules(values), values?.length ?? 16)
}

function sanitizeRuntimeAnswerPlannerProjectState<T extends object | null | undefined>(
  projectState: T,
) {
  if (!projectState)
    return projectState
  return Object.fromEntries(
    Object.entries(projectState).map(([key, value]) => [
      key,
      typeof value === 'string' ? sanitizeRuntimeAnswerPlannerText(value, 1600) : value,
    ]),
  ) as T
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
  if (containsAlicizationFixedTemplateResidue(text))
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
  return 'closure_policy=settling_cadence; reply_pressure=low; room=preserve; restart=avoid'
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
  const answerIntent = sanitizeRuntimeAnswerPlannerText(
    governance.answerIntent ?? governance.focusAnchor ?? governance.liveSurface ?? '',
    360,
  )
  const openingMove = sanitizeRuntimeAnswerPlannerText(governance.openingMove ?? answerIntent, 360)
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
    && !/^Before answering\b/iu.test(rawPreDialogueAwarenessLine)
    && !containsAlicizationFixedTemplateResidue(rawPreDialogueAwarenessLine)
    && !isThinProjectAwarenessLine(rawPreDialogueAwarenessLine)
    && preDialogueAwarenessLine
    && !/^Before answering\b/iu.test(preDialogueAwarenessLine)
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
    .map(value => sanitizeRuntimeAnswerPlannerText(value, 12000))
    .filter(Boolean)
    .join(' | ')
  const projectConstraintLine = primaryOpenLoop
    ? `project_closure_constraint=open_loop; open=${primaryOpenLoop}`
    : null
  const emotionalClosureCue = [
    consciousProjectState?.emotionalClosureCue,
    governance.emotionalClosureCue,
    deriveSameHerEmotionalClosureCueFromGovernance(governance),
  ]
    .map(value => sanitizeRuntimeAnswerPlannerText(value, 360))
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
        'continuity_constraint=anti_restart; source=relationship_continuity; timing=before_widening',
        'continuity_constraint=same_thread; widening=defer_until_natural_opening',
      ]
    : []
  const sameThreadAntiRestartMustNotDo = sameThreadAntiRestartMustDo.length
    ? [
        'continuity_avoid=reopen_as_fresh_introduction',
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
              ...sanitizeRuntimeAnswerPlannerProjectState(surface.raw.runtimeDigest.projectState),
              preDialogueAwarenessLine: preferredPreparedAwarenessLine || sanitizeRuntimeAnswerPlannerText(((surface.raw.runtimeDigest.projectState as { preDialogueAwarenessLine?: string | null } | null)?.preDialogueAwarenessLine) ?? null, 1600) || null,
              awarenessLine: preferredPreparedAwarenessLine || sanitizeRuntimeAnswerPlannerText(((surface.raw.runtimeDigest.projectState as { awarenessLine?: string | null } | null)?.awarenessLine) ?? null, 1600) || null,
              preDialogueAwarenessSummary: preferredPreparedAwarenessLine || sanitizeRuntimeAnswerPlannerText(((surface.raw.runtimeDigest.projectState as { preDialogueAwarenessSummary?: string | null } | null)?.preDialogueAwarenessSummary) ?? null, 1600) || null,
              companionHeadlineLine: companionHeadlineLine || sanitizeRuntimeAnswerPlannerText(((surface.raw.runtimeDigest.projectState as { companionHeadlineLine?: string | null } | null)?.companionHeadlineLine) ?? null, 1600) || null,
              proactiveSameHerGap: proactiveSameHerGap || sanitizeRuntimeAnswerPlannerText(((surface.raw.runtimeDigest.projectState as { proactiveSameHerGap?: string | null } | null)?.proactiveSameHerGap) ?? null, 1600) || null,
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
              ...sanitizeRuntimeAnswerPlannerProjectState(surface.dialogue.currentConsciousFrame?.projectState),
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
            openingBeat: sanitizeRuntimeAnswerPlannerText(surface.dialogue.replyDeliberation.openingBeat, 360),
            whyThisReplyNow: sanitizeRuntimeAnswerPlannerText(surface.dialogue.replyDeliberation.whyThisReplyNow, 360),
            whyNotOtherCandidates: sanitizeRuntimeAnswerPlannerMetaRules(surface.dialogue.replyDeliberation.whyNotOtherCandidates),
            withheldImpulses: sanitizeRuntimeAnswerPlannerMetaRules(surface.dialogue.replyDeliberation.withheldImpulses),
            mustInclude: mergeUniqueRules([
              ...sanitizeRuntimeAnswerPlannerRules(surface.dialogue.replyDeliberation?.mustInclude),
              ...sameThreadAntiRestartMustDo,
              ...sanitizeRuntimeAnswerPlannerRules(governance.mustDo),
            ], 10),
            mustAvoid: mergeUniqueRules([
              ...sanitizeRuntimeAnswerPlannerRules(surface.dialogue.replyDeliberation?.mustAvoid),
              ...sameThreadAntiRestartMustNotDo,
              ...sanitizeRuntimeAnswerPlannerRules(governance.mustNotDo),
            ], 10),
            narrative: mergeUniqueRules([
              ...sanitizeRuntimeAnswerPlannerRules(surface.dialogue.replyDeliberation?.narrative),
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
              ...sanitizeRuntimeAnswerPlannerRules(governance.mustDo),
            ], 10),
            mustAvoid: mergeUniqueRules([
              ...sameThreadAntiRestartMustNotDo,
              ...sanitizeRuntimeAnswerPlannerRules(governance.mustNotDo),
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
            governingFocus: sanitizeRuntimeAnswerPlannerText(surface.dialogue.answerPlanner.governingFocus, 360),
            governingProject: sanitizeRuntimeAnswerPlannerText(surface.dialogue.answerPlanner?.governingProject, 12000) || governingProject || null,
            openingMove: sanitizeRuntimeAnswerPlannerText(surface.dialogue.answerPlanner.openingMove, 360),
            answerIntent: sanitizeRuntimeAnswerPlannerText(surface.dialogue.answerPlanner.answerIntent, 360),
            mustDo: mergeUniqueRules([
              ...sanitizeRuntimeAnswerPlannerRules(surface.dialogue.answerPlanner?.mustDo),
              projectConstraintLine,
              ...sameThreadAntiRestartMustDo,
              ...sanitizeRuntimeAnswerPlannerRules(governance.mustDo),
            ], 10),
            mustNotDo: mergeUniqueRules([
              ...sanitizeRuntimeAnswerPlannerRules(surface.dialogue.answerPlanner?.mustNotDo),
              ...sameThreadAntiRestartMustNotDo,
              ...sanitizeRuntimeAnswerPlannerRules(governance.mustNotDo),
            ], 10),
            narrative: mergeUniqueRules([
              ...sanitizeRuntimeAnswerPlannerRules(surface.dialogue.answerPlanner?.narrative),
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
              ...sanitizeRuntimeAnswerPlannerRules(governance.mustDo),
            ], 10),
            mustNotDo: mergeUniqueRules([
              ...sameThreadAntiRestartMustNotDo,
              ...sanitizeRuntimeAnswerPlannerRules(governance.mustNotDo),
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
            openingClaim: sanitizeRuntimeAnswerPlannerText(surface.dialogue.dialogueActKernel.openingClaim, 360),
            openingMove: sanitizeRuntimeAnswerPlannerText(surface.dialogue.dialogueActKernel.openingMove, 360),
            whyNow: sanitizeRuntimeAnswerPlannerText(surface.dialogue.dialogueActKernel.whyNow, 360),
            mustSay: mergeUniqueRules([
              ...sanitizeRuntimeAnswerPlannerRules(surface.dialogue.dialogueActKernel?.mustSay),
              answerIntent,
              ...sanitizeRuntimeAnswerPlannerRules(governance.mustDo),
            ], 8),
            mustAvoid: mergeUniqueRules([
              ...sanitizeRuntimeAnswerPlannerRules(surface.dialogue.dialogueActKernel?.mustAvoid),
              ...sanitizeRuntimeAnswerPlannerRules(governance.mustNotDo),
            ], 8),
            sourceTrace: mergeUniqueRules([
              ...sanitizeRuntimeAnswerPlannerRules(surface.dialogue.dialogueActKernel?.sourceTrace),
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
            mustSay: mergeUniqueRules([answerIntent, ...sanitizeRuntimeAnswerPlannerRules(governance.mustDo)], 8),
            mustAvoid: mergeUniqueRules(sanitizeRuntimeAnswerPlannerRules(governance.mustNotDo), 8),
            sourceTrace: ['runtime-answer-planner'],
            confidence: 0.72,
            updatedAt: input.now,
          },
    },
  } satisfies AlicizationDigitalLifeRuntimeSurface
}
