import type {
  AlicizationAnswerAct,
  AlicizationAnswerCompilerSnapshot,
  AlicizationAnswerEvidenceMode,
  AlicizationAnswerPlannerSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationConcernContinuityLedgerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationDialogueAnswerSubject,
  AlicizationDialogueScreenReferenceMode,
  AlicizationDialogueWorldThreadSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationExecutiveCycleSnapshot,
  AlicizationInquiryPlannerSnapshot,
  AlicizationIntentionStreamSnapshot,
  AlicizationMindKernelSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReflectionLedgerSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationRepairLedgerSnapshot,
  AlicizationReplyDeliberationSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationWorldModelSnapshot,
  AlicizationWorldOntologySnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueFocusGovernance } from './dialogue-focus-governor'
import type { AlicizationDialogueObligation } from './dialogue-obligation'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDialogueTurnOwnership } from './dialogue-turn-ownership'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import {
  readHostPersonModelFromDerivedMindStateBundle,
  readKnowledgeEvidenceFromDerivedMindStateBundle,
  readMemoryDeliberationFromDerivedMindStateBundle,
  readRecollectionIntentFromDerivedMindStateBundle,
  readRecollectionSpeechPlanFromDerivedMindStateBundle,
  resolveAlicizationProjectPreDialogueAwarenessLine,
} from '@proj-alicization/stage-shared'

import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
import { sanitizeDialogueAnchorText } from './dialogue-surface-text'
import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'
import { deriveMindTruthContract } from './mind-truth-contract'
import {
  hasContinuityRestraintRelationshipSignal,
  hasNeutralRelationshipSignal,
  mergePreferredSelfContinuityAuthority,
  resolvePreferredPersonStateProjection,
  resolvePreferredSelfContinuityAuthority,
} from './person-state-projection-resolution'
import {
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateSnapshot,
} from './project-state-brief'
import { buildSelfContinuityAuthorityFromRuntimeSurface } from './self-continuity-authority'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function deriveAnswerPlannerEmotionalClosureCue(input: {
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  mustDo: string[]
  mustNotDo: string[]
}) {
  const emotionalTension = sanitizeText(input.privateThought?.emotionalTension, 80).toLowerCase()
  const corpus = [...input.mustDo, ...input.mustNotDo].join(' ').toLowerCase()
  if (
    emotionalTension === 'late-night-drain'
    || corpus.includes('late-night protectiveness')
    || corpus.includes('protect the host’s remaining room')
    || corpus.includes('repair-before-closeness')
  ) {
    return 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness.'
  }
  if (
    emotionalTension === 'restless-switching'
    || corpus.includes('single-thread')
    || corpus.includes('one line of motion')
    || corpus.includes('fragmenting outward')
  ) {
    return 'restless-switching closure: keep reply, initiative, and embodiment narrowed onto one living thread instead of fragmenting outward.'
  }
  return null
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function pushUniqueText(target: string[], ...values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = sanitizeText(value, 320)
    if (!normalized || target.includes(normalized))
      continue
    target.push(normalized)
  }
}

function normalizePlannerMemoryDeliberation(
  deliberation: OrganicMemoryPromptContext['memoryDeliberation'] | null | undefined,
) {
  if (!deliberation)
    return null

  const defaults = {
    confidence: 0.72,
    conflictSeverity: 'none' as NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictSeverity'],
    ambiguityPosture: 'settled' as NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['ambiguityPosture'],
    stableCore: [] as string[],
    unsafeDetails: [] as string[],
    selectedPeriods: [] as NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['selectedPeriods'],
    selectedEpisodes: [] as NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['selectedEpisodes'],
    selectedProcedures: [] as NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['selectedProcedures'],
    selectedBundles: [] as NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['selectedBundles'],
    selectedChains: [] as NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['selectedChains'],
    selectedRelationshipLines: [] as string[],
    selectedEras: [] as NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['selectedEras'],
    conflictVariants: [] as NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictVariants'],
  }

  return {
    ...defaults,
    ...deliberation,
    stableCore: deliberation.stableCore ?? defaults.stableCore,
    unsafeDetails: deliberation.unsafeDetails ?? defaults.unsafeDetails,
    selectedPeriods: deliberation.selectedPeriods ?? defaults.selectedPeriods,
    selectedEpisodes: deliberation.selectedEpisodes ?? defaults.selectedEpisodes,
    selectedProcedures: deliberation.selectedProcedures ?? defaults.selectedProcedures,
    selectedBundles: deliberation.selectedBundles ?? defaults.selectedBundles,
    selectedChains: deliberation.selectedChains ?? defaults.selectedChains,
    selectedRelationshipLines: deliberation.selectedRelationshipLines ?? defaults.selectedRelationshipLines,
    selectedEras: deliberation.selectedEras ?? defaults.selectedEras,
    conflictVariants: deliberation.conflictVariants ?? defaults.conflictVariants,
  } satisfies NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>
}

function buildPlannerMemoryCarryText(
  kernel: ReturnType<typeof buildAlicizationMemoryDeliberationKernel>,
) {
  if (!kernel)
    return ''

  return sanitizeText(
    [
      kernel.rationale,
      kernel.whyWithheld,
      kernel.followUpAffordance?.summary,
      kernel.followUpAffordance?.whyNow,
      kernel.selectedChainSummary,
      kernel.selectedChainStance,
      kernel.selectedChainPosture,
      kernel.selectedRelationshipSummary,
      ...kernel.stableCore,
      ...kernel.unsafeDetails,
      kernel.inwardCarryRule,
    ].filter(Boolean).join(' '),
    1_400,
  ).toLowerCase()
}

function hasCorrectedSamePersonPlannerCarry(
  kernel: ReturnType<typeof buildAlicizationMemoryDeliberationKernel>,
) {
  const inwardCarryRule = sanitizeText(kernel?.inwardCarryRule, 320).toLowerCase()
  const text = buildPlannerMemoryCarryText(kernel)
  return inwardCarryRule.includes('corrected_same_person_discipline=anti-progress-pressure-return')
    || (
      /corrected same-person continuity|corrected same person continuity|same-person continuity|same person continuity|同一个她|持续的人/u.test(text)
      && /progress pressure|status recap|generic status|task-shell|progress-style continuation|status-report/u.test(text)
    )
}

function correctedSamePersonCarryIsTentative(
  kernel: ReturnType<typeof buildAlicizationMemoryDeliberationKernel>,
) {
  const text = buildPlannerMemoryCarryText(kernel)
  return /tentative|uncertainty-labeled|not-fully-settled|not fully settled|still settling|still stabilizing|explicitly unsettled/u.test(text)
}

function correctedSamePersonCarryHasMergedSameThreadForeground(
  kernel: ReturnType<typeof buildAlicizationMemoryDeliberationKernel>,
) {
  const text = buildPlannerMemoryCarryText(kernel)
  return /merged same-thread continuity foreground|stronger merged continuity foreground|stronger same-thread continuity|merged same-thread continuity/u.test(text)
}

function correctedSamePersonCarryHasFadedNoiseBackground(
  kernel: ReturnType<typeof buildAlicizationMemoryDeliberationKernel>,
) {
  const text = buildPlannerMemoryCarryText(kernel)
  return /faded noise background|faded temporary noise|stale emotional wobble|temporary noise/u.test(text)
}

function applyMemoryDeliberationOpeningCarry(input: {
  baseOpeningMove: string
  memoryDeliberationKernel: ReturnType<typeof buildAlicizationMemoryDeliberationKernel>
}) {
  const baseOpeningMove = sanitizeText(input.baseOpeningMove, 320)
  const kernel = input.memoryDeliberationKernel
  if (!baseOpeningMove || !kernel || !kernel.shouldStayInward || !hasCorrectedSamePersonPlannerCarry(kernel))
    return baseOpeningMove

  const carryDirectives: string[] = []
  if (correctedSamePersonCarryIsTentative(kernel))
    carryDirectives.push('keep the corrected same-person line tentative while the newer meaning settles')
  else
    carryDirectives.push('let the corrected same-person line lead before any progress-style continuation')
  if (correctedSamePersonCarryHasMergedSameThreadForeground(kernel))
    carryDirectives.push('let the stronger same-thread continuity lead before thinner duplicate echoes')
  if (correctedSamePersonCarryHasFadedNoiseBackground(kernel))
    carryDirectives.push('keep faded temporary noise in the background')
  if (carryDirectives.length === 0)
    return baseOpeningMove

  return sanitizeText(
    `${baseOpeningMove} Keep the return inward: ${carryDirectives.join(', ')}.`,
    320,
  )
}

function buildMemoryDeliberationPlannerNarrative(
  kernel: ReturnType<typeof buildAlicizationMemoryDeliberationKernel>,
) {
  if (!kernel || !hasCorrectedSamePersonPlannerCarry(kernel))
    return []

  const rows: string[] = []
  if (correctedSamePersonCarryIsTentative(kernel)) {
    rows.push('memory_carry:corrected same-person continuity is still tentative, so the opening should keep that line explicitly unsettled.')
  }
  if (correctedSamePersonCarryHasMergedSameThreadForeground(kernel)) {
    rows.push('memory_metabolism:stronger merged same-thread continuity should stay foreground instead of reopening thinner duplicate echoes.')
  }
  if (correctedSamePersonCarryHasFadedNoiseBackground(kernel)) {
    rows.push('memory_metabolism:faded temporary noise should stay backgrounded instead of explaining the current same-person line again.')
  }
  return rows
}

function buildProjectedPlannerFocusCarry(input: {
  repairTriggerText?: unknown
  sensitivityText?: unknown
}) {
  const repairTriggerText = sanitizeText(input.repairTriggerText, 220)
  const sensitivityText = sanitizeText(input.sensitivityText, 220)

  return sanitizeText([
    repairTriggerText
      ? /repair before continuing|repair the seam|repair first/u.test(repairTriggerText.toLowerCase())
        ? 'repair first'
        : repairTriggerText
      : '',
    sensitivityText && /template-like speech|living reply|机械|模板/u.test(sensitivityText)
      ? 'template-like wording breaks the sense of a living reply'
      : '',
  ].filter(Boolean).join(' '), 220)
}

function buildProjectedPlannerAnswerCarry(input: {
  openingGuidance?: unknown
  burdenText?: unknown
}) {
  const openingGuidance = sanitizeText(input.openingGuidance, 220)
  const burdenText = sanitizeText(input.burdenText, 220)

  return sanitizeText([
    openingGuidance,
    burdenText,
  ].filter(Boolean).join(' '), 220)
}

function summarizeProjectedPlannerCadence(raw: unknown) {
  const text = sanitizeText(raw, 220)
  if (!text)
    return ''
  if (/observe-first/u.test(text))
    return 'observe-first'
  return text
}

function pickUserFacingAnchor(...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeDialogueAnchorText(value, 180)
    if (normalized)
      return normalized
  }
  return ''
}

function isSameHerProjectStateReplyReason(value: unknown) {
  const text = sanitizeText(value, 260).toLowerCase()
  if (!text)
    return false
  const hasProjectClosureCue = text.includes('same digital life')
    || text.includes('same still-open closure work')
    || text.includes('project-state')
    || text.includes('project state')
  const hasSameHerCue = text.includes('same her')
    || text.includes('same-her')
    || text.includes('one same her')
  return hasProjectClosureCue || (hasSameHerCue && text.includes('closure work'))
}

function looksLikeProjectStateDirectAnswerTurn(input: {
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  replyReason?: unknown
}) {
  const evidence = [
    sanitizeText(input.dialogueSemantics?.summary, 320),
    sanitizeText(input.discourseState?.currentTurnSummary, 320),
    sanitizeText(input.discourseState?.currentQuestion, 320),
    sanitizeText(input.conversationState?.hostMove, 320),
    sanitizeText(input.conversationState?.unansweredQuestion, 320),
    sanitizeText(input.replyReason, 320),
  ]
    .filter(Boolean)
    .join(' | ')
    .toLowerCase()

  if (!evidence)
    return false

  const asksWhatThisProjectIs = /what alicization is|what this project is|项目是做什么|项目是什么/u.test(evidence)
  const asksProgressAndOpenClosure
    = /what still remains open|still remains open|what is not yet closed|做到什么程度|还差什么|没闭环|how far .* landed/u.test(evidence)
  const asksCompletionTimelineOrLanguageDrift
    = /计划什么时候完成|什么时候完成(?:这个)?\s*goal|何时完成(?:这个)?\s*goal|什么时候完成|何时完成|when (?:will|do).{0,24}(?:finish|complete|close)|expected to (?:finish|close)|expect to (?:finish|close)|when the goal is expected to close|why are you replying in english|replying in english|host language|为什么(?:一直|还)?用英文|为什么(?:一直|还)?不用中文|为什么还用英文|英文不用中文|是不是偏移了|偏移了吗|did the thread drift|thread drift|thread has drifted|drifted out of|out of alignment|跑偏了/u.test(evidence)
  const namesProjectStateTurn = /project-state question|project status|project-state|project continuity/u.test(evidence)
  const hasStrongProjectStateCue = namesProjectStateTurn
    || (asksWhatThisProjectIs && asksProgressAndOpenClosure)
    || (asksCompletionTimelineOrLanguageDrift && asksProgressAndOpenClosure)

  if (input.dialogueObligation?.mustAnswerDirectly)
    return hasStrongProjectStateCue

  return hasStrongProjectStateCue
}

function shortenProjectStateDirectAnswerIntent(value: unknown) {
  const text = sanitizeText(value, 220)
  if (!text)
    return ''

  const normalized = text.toLowerCase()
  const asksCompletionTimelineOrLanguageDrift
    = /计划什么时候完成|什么时候完成(?:这个)?\s*goal|何时完成(?:这个)?\s*goal|什么时候完成|何时完成|when (?:will|do).{0,24}(?:finish|complete|close)|expected to (?:finish|close)|expect to (?:finish|close)|when the goal is expected to close|why are you replying in english|replying in english|host language|为什么(?:一直|还)?用英文|为什么(?:一直|还)?不用中文|为什么还用英文|英文不用中文|是不是偏移了|偏移了吗|did the thread drift|thread drift|thread has drifted|drifted out of|out of alignment|跑偏了/u.test(normalized)
  const asksProgress
    = /how far .* landed|how far phase 1 has landed|how far the current phase 1 line has landed|做到什么程度|做到哪了|进行到哪一步/u.test(normalized)

  if (asksCompletionTimelineOrLanguageDrift && asksProgress) {
    return 'project continuity direct-answer: Phase 1 landed progress, when the goal is expected to close, and whether the thread drifted out of the host language or project context still need one direct answer.'
  }

  return text
}

interface AlicizationAnswerPlannerRuntimeProjectState {
  identity?: string | null
  currentPhase?: string | null
  companionHeadlineLine?: string | null
  preflightSummary?: string | null
  preDialogueAwarenessLine?: string | null
  awarenessLine?: string | null
  latestLandedProgress?: string | null
  latestProgress?: string | null
  primaryOpenLoop?: string | null
  proactiveSameHerGap?: string | null
  nextClosureTarget?: string | null
  emotionalClosureCue?: string | null
  sameHerSelfLine?: string | null
  sameHerHoldDetail?: string | null
  sameHerDriftRisk?: string | null
  continuityArcStage?: string | null
  continuityCue?: string | null
}

function readAnswerPlannerProjectContinuityFromAnswerCompiler(
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null,
) {
  const supportingReality = Array.isArray(answerCompiler?.supportingReality) ? answerCompiler.supportingReality : []
  let proactiveSameHerGap: string | null = null

  for (const item of supportingReality) {
    const normalized = sanitizeText(item, 320)
    if (!normalized)
      continue
    if (!/^proactive same-her gap:\s*/i.test(normalized))
      continue
    proactiveSameHerGap ||= normalized.replace(/^proactive same-her gap:\s*/i, '').trim() || null
  }

  return {
    proactiveSameHerGap,
  }
}

function resolveAnswerPlannerProjectStateText(input: {
  current?: unknown
  summary?: unknown
  fallbacks?: unknown[]
  maxChars?: number
}) {
  const current = sanitizeText(input.current, input.maxChars ?? 320)
  if (current)
    return current

  const summary = sanitizeText(input.summary, input.maxChars ?? 320)
  if (summary)
    return summary

  for (const fallback of input.fallbacks ?? []) {
    const fallbackText = sanitizeText(fallback, input.maxChars ?? 320)
    if (fallbackText)
      return fallbackText
  }

  return ''
}

function preferAnswerPlannerProjectStateAuditText(input: {
  current?: unknown
  candidate?: unknown
  maxChars?: number
}) {
  const current = sanitizeText(input.current, input.maxChars ?? 320)
  const candidate = sanitizeText(input.candidate, input.maxChars ?? 320)

  if (!current)
    return candidate || ''
  if (!candidate)
    return current
  if (current === candidate)
    return current

  return preferStrongerContinuityClosureAuthority(current, candidate)
    || current
}

function resolveAnswerPlannerSurfaceProjectState(
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null,
) {
  if (!runtimeSurface)
    return null

  const currentProjectState = runtimeSurface.dialogue?.currentConsciousFrame?.projectState as Record<string, unknown> | null | undefined
  const rawRuntimeProjectState = (runtimeSurface.raw as { runtimeDigest?: { projectState?: Record<string, unknown> | null } | null } | null | undefined)?.runtimeDigest?.projectState ?? null
  const cognitionRuntimeProjectState = (runtimeSurface.cognition as { runtimeDigest?: { projectState?: Record<string, unknown> | null } | null } | null | undefined)?.runtimeDigest?.projectState ?? null
  const dialogueRuntimeProjectState = (runtimeSurface.dialogue as { runtimeDigest?: { projectState?: Record<string, unknown> | null } | null } | null | undefined)?.runtimeDigest?.projectState ?? null

  const persistedSources = [
    dialogueRuntimeProjectState,
    rawRuntimeProjectState,
    cognitionRuntimeProjectState,
  ]

  const resolved: AlicizationAnswerPlannerRuntimeProjectState = {
    identity: resolveAnswerPlannerProjectStateText({
      current: currentProjectState?.identity,
      fallbacks: persistedSources.map(source => source?.identity),
      maxChars: 220,
    }) || null,
    currentPhase: resolveAnswerPlannerProjectStateText({
      current: currentProjectState?.currentPhase,
      fallbacks: persistedSources.map(source => source?.currentPhase),
      maxChars: 160,
    }) || null,
    companionHeadlineLine: resolveAnswerPlannerProjectStateText({
      current: currentProjectState?.companionHeadlineLine,
      fallbacks: persistedSources.map(source => source?.companionHeadlineLine),
      maxChars: 320,
    }) || null,
    preDialogueAwarenessLine: resolveAnswerPlannerProjectStateText({
      current: currentProjectState?.preDialogueAwarenessLine,
      fallbacks: persistedSources.flatMap(source => [
        source?.preDialogueAwarenessLine,
        source?.awarenessLine,
      ]),
      maxChars: 320,
    }) || null,
    latestLandedProgress: resolveAnswerPlannerProjectStateText({
      current: currentProjectState?.latestLandedProgress,
      summary: currentProjectState?.landedProgressSummary,
      fallbacks: persistedSources.flatMap(source => [
        source?.latestLandedProgress,
        source?.landedProgressSummary,
      ]),
      maxChars: 320,
    }) || null,
    latestProgress: resolveAnswerPlannerProjectStateText({
      current: currentProjectState?.latestProgress ?? currentProjectState?.latestLandedProgress,
      summary: currentProjectState?.landedProgressSummary,
      fallbacks: persistedSources.flatMap(source => [
        source?.latestProgress,
        source?.latestLandedProgress,
        source?.landedProgressSummary,
      ]),
      maxChars: 320,
    }) || null,
    primaryOpenLoop: resolveAnswerPlannerProjectStateText({
      current: currentProjectState?.primaryOpenLoop,
      summary: currentProjectState?.openClosureSummary,
      fallbacks: persistedSources.flatMap(source => [
        source?.primaryOpenLoop,
        source?.openClosureSummary,
      ]),
      maxChars: 320,
    }) || null,
    proactiveSameHerGap: resolveAnswerPlannerProjectStateText({
      current: currentProjectState?.proactiveSameHerGap,
      summary: currentProjectState?.proactiveSameHerGapSummary,
      fallbacks: persistedSources.flatMap(source => [
        source?.proactiveSameHerGap,
        source?.proactiveSameHerGapSummary,
      ]),
      maxChars: 320,
    }) || null,
    nextClosureTarget: resolveAnswerPlannerProjectStateText({
      current: currentProjectState?.nextClosureTarget,
      summary: currentProjectState?.nextClosureTargetSummary,
      fallbacks: persistedSources.flatMap(source => [
        source?.nextClosureTarget,
        source?.nextClosureTargetSummary,
      ]),
      maxChars: 320,
    }) || null,
    emotionalClosureCue: resolveAnswerPlannerProjectStateText({
      current: currentProjectState?.emotionalClosureCue,
      summary: currentProjectState?.emotionalClosureSummary,
      fallbacks: persistedSources.flatMap(source => [
        source?.emotionalClosureCue,
        source?.emotionalClosureSummary,
      ]),
      maxChars: 320,
    }) || null,
    sameHerSelfLine: resolveAnswerPlannerProjectStateText({
      current: currentProjectState?.sameHerSelfLine ?? currentProjectState?.sameHerSummary,
      fallbacks: persistedSources.flatMap(source => [
        source?.sameHerSelfLine,
        source?.sameHerSummary,
      ]),
      maxChars: 320,
    }) || null,
    sameHerHoldDetail: preferAnswerPlannerProjectStateAuditText({
      current: currentProjectState?.sameHerHoldDetail,
      candidate: preferAnswerPlannerProjectStateAuditText({
        current: dialogueRuntimeProjectState?.sameHerHoldDetail,
        candidate: preferAnswerPlannerProjectStateAuditText({
          current: rawRuntimeProjectState?.sameHerHoldDetail,
          candidate: cognitionRuntimeProjectState?.sameHerHoldDetail,
          maxChars: 320,
        }),
        maxChars: 320,
      }),
      maxChars: 320,
    }) || null,
    sameHerDriftRisk: resolveAnswerPlannerProjectStateText({
      current: currentProjectState?.sameHerDriftRisk,
      summary: currentProjectState?.sameHerDriftRiskSummary,
      fallbacks: persistedSources.flatMap(source => [
        source?.sameHerDriftRisk,
        source?.sameHerDriftRiskSummary,
      ]),
      maxChars: 320,
    }) || null,
    continuityArcStage: resolveAnswerPlannerProjectStateText({
      current: currentProjectState?.continuityArcStage,
      fallbacks: persistedSources.map(source => source?.continuityArcStage),
      maxChars: 120,
    }) || null,
    continuityCue: resolveAnswerPlannerProjectStateText({
      current: currentProjectState?.continuityCue,
      fallbacks: persistedSources.map(source => source?.continuityCue),
      maxChars: 320,
    }) || null,
  }

  return Object.values(resolved).some(Boolean) ? resolved : null
}

function resolveAnswerPlannerProjectStateContinuity(
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null,
): NonNullable<OrganicMemoryPromptContext['projectStateContinuity']> | null {
  const projectState = resolveAnswerPlannerSurfaceProjectState(runtimeSurface)
  if (!projectState)
    return null

  const normalizedProjectState = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: {
      identity: projectState.identity,
      currentPhase: projectState.currentPhase,
      preflightSummary: projectState.preflightSummary,
      preDialogueAwarenessLine: projectState.preDialogueAwarenessLine,
      awarenessLine: projectState.awarenessLine,
      companionHeadlineLine: projectState.companionHeadlineLine,
      latestLandedProgress: projectState.latestLandedProgress ?? projectState.latestProgress,
      latestProgress: projectState.latestProgress,
      primaryOpenLoop: projectState.primaryOpenLoop,
      proactiveSameHerGap: projectState.proactiveSameHerGap,
      nextClosureTarget: projectState.nextClosureTarget,
      emotionalClosureCue: projectState.emotionalClosureCue,
      sameHerSelfLine: projectState.sameHerSelfLine,
      sameHerHoldDetail: projectState.sameHerHoldDetail,
      sameHerDriftRisk: projectState.sameHerDriftRisk,
      continuityArcStage: projectState.continuityArcStage,
      continuityCue: projectState.continuityCue,
    },
  })
  const sameHerSelfLine = sanitizeText(normalizedProjectState.sameHerSelfLine, 220) || null
  const continuity: NonNullable<OrganicMemoryPromptContext['projectStateContinuity']> = {
    identity: sanitizeText(normalizedProjectState.identity, 220) || null,
    currentPhase: sanitizeText(normalizedProjectState.currentPhase, 160) || null,
    sameHerSummary: sameHerSelfLine,
    landedProgressSummary: sanitizeText(normalizedProjectState.latestLandedProgress ?? normalizedProjectState.latestProgress, 220) || null,
    openClosureSummary: sanitizeText(normalizedProjectState.primaryOpenLoop, 220) || null,
    proactiveSameHerGap: sanitizeText(normalizedProjectState.proactiveSameHerGap, 220) || null,
    nextClosureTarget: sanitizeText(normalizedProjectState.nextClosureTarget, 220) || null,
    preDialogueAwarenessLine: sanitizeText(normalizedProjectState.preDialogueAwarenessLine ?? normalizedProjectState.awarenessLine, 320) || null,
    emotionalClosureCue: sanitizeText(normalizedProjectState.emotionalClosureCue ?? normalizedProjectState.emotionalClosureSummary, 220) || null,
    sameHerSelfLine,
    sameHerHoldDetail: sanitizeText(normalizedProjectState.sameHerHoldDetail, 220) || null,
    sameHerDriftRisk: sanitizeText(normalizedProjectState.sameHerDriftRisk, 220) || null,
  }

  return Object.values(continuity).some(Boolean) ? continuity : null
}

function isSameHerProjectClosureCallbackReason(value: unknown) {
  const text = sanitizeText(value, 320).toLowerCase()
  if (!text)
    return false

  const hasCallbackCue = text.includes('callback')
    || text.includes('returned result')
    || text.includes('execution return')
  const hasSameHerClosureCue = text.includes('same-her')
    || text.includes('same her')
    || text.includes('same digital life')
    || text.includes('same living line')
  const hasClosureCue = text.includes('closure')
    || text.includes('phase 1')
    || text.includes('reopen from scratch')

  return hasCallbackCue && hasSameHerClosureCue && hasClosureCue
}

function isSameHerProjectDriftRiskReason(value: unknown) {
  const text = sanitizeText(value, 320).toLowerCase()
  if (!text)
    return false

  const hasSameHerCue = text.includes('same-her')
    || text.includes('same her')
    || text.includes('same digital life')
  const hasDriftRiskCue = text.includes('drift risk')
    || text.includes('generic guidance')
    || text.includes('generic task shell')
    || text.includes('generic callback shell')
    || text.includes('detached project-summary shell')
    || text.includes('project-summary voice')

  return hasSameHerCue && hasDriftRiskCue
}

function readSameHerProjectDriftRiskFromRuntimeSurface(runtimeSurface: AlicizationDigitalLifeRuntimeSurface | null | undefined) {
  const projectState = resolveAnswerPlannerSurfaceProjectState(runtimeSurface)
  const text = sanitizeText(
    projectState?.sameHerDriftRisk
    ?? '',
    320,
  )
  return isSameHerProjectDriftRiskReason(text) ? text : null
}

function hasCorrectedSamePersonContinuityCarryFromRuntimeSurface(
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface | null | undefined,
) {
  const memoryDeliberation = runtimeSurface?.memory.memoryDeliberation
  const recollectionSpeechPlan = runtimeSurface?.memory.recollectionSpeechPlan
  const recollectionIntent
    = (runtimeSurface?.memory.derivedMindStateBundle?.recollectionIntent as OrganicMemoryPromptContext['recollectionIntent']) ?? null
  const text = [
    memoryDeliberation?.whyNow,
    memoryDeliberation?.inwardLine,
    ...(memoryDeliberation?.stableCore ?? []),
    ...(memoryDeliberation?.unsafeDetails ?? []),
    ...(memoryDeliberation?.selectedBundles ?? []).map(item => item.summary),
    ...(memoryDeliberation?.selectedChains ?? []).flatMap(item => [item.summary, item.currentStance, item.answerPosture, item.relationshipMeaning, item.lesson]),
    ...(memoryDeliberation?.selectedRelationshipLines ?? []),
    memoryDeliberation?.followUpAffordance?.summary,
    memoryDeliberation?.followUpAffordance?.whyNow,
    recollectionSpeechPlan?.rationale,
    recollectionIntent?.rationale,
    recollectionIntent?.recollectionAgenda?.whyRecallNow,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return (
    /host corrected|corrected the relationship meaning|纠正过|纠正了|被纠正过/u.test(text)
    && /same-person continuity|same person continuity|same-person|same person|持续的人|同一个人|同一个她/u.test(text)
    && /progress pressure|progress recap|status recap|generic status|task-shell|催进度|进度压力|状态汇报|任务壳/u.test(text)
  )
}

function hasProjectEmotionalClosureDisciplineFocus(focusDimensions?: string[] | null) {
  const focus = Array.isArray(focusDimensions) ? focusDimensions : []
  return (
    focus.includes('projectEmotionalClosureCarry')
    || focus.includes('projectEmotionalClosureRewriteCarry')
    || focus.includes('projectEmotionalClosureLowPressureCarry')
    || focus.includes('projectEmotionalClosureAntiRestartCarry')
  )
}

function hasProjectStateCarryDisciplineFocus(focusDimensions?: string[] | null) {
  const focus = Array.isArray(focusDimensions) ? focusDimensions : []
  return (
    focus.includes('projectStateRichAwarenessCarry')
    || focus.includes('projectStateLandedProgressCarry')
    || focus.includes('projectStateNextClosureCarry')
    || focus.includes('projectStateEmotionalClosureCarry')
  )
}

function hasTruthBoundarySignal(raw: unknown) {
  const text = sanitizeText(raw, 320).toLowerCase()
  if (!text)
    return false

  return (
    text.includes('repair truth')
    || text.includes('truth')
    || text.includes('ground first')
    || text.includes('repair-first')
    || text.includes('repair before closeness')
    || text.includes('closeness outrun truth')
    || text.includes('warmth answer to truth')
  )
}

function shouldPreferRelationshipDoctrineAnchor(input: {
  turnProfile: AlicizationAnswerPlannerTurnProfile
  selfContinuityAuthority?: {
    selfLine?: string | null
    relationshipLine?: string | null
    motiveLine?: string | null
    authoritySummary?: string | null
  } | null
}) {
  if (input.turnProfile.subject !== 'relationship')
    return false

  const selfLine = sanitizeText(input.selfContinuityAuthority?.selfLine, 320)
  const relationshipLine = sanitizeText(input.selfContinuityAuthority?.relationshipLine, 320)
  const motiveLine = sanitizeText(input.selfContinuityAuthority?.motiveLine, 320)
  const authoritySummary = sanitizeText(input.selfContinuityAuthority?.authoritySummary, 320)
  if (!selfLine && !relationshipLine && !motiveLine)
    return false
  if (!authoritySummary)
    return true

  const relationshipCarriesTruthBoundary = hasTruthBoundarySignal(
    [selfLine, relationshipLine, motiveLine].filter(Boolean).join(' | '),
  )
  const summaryCarriesTruthBoundary = hasTruthBoundarySignal(authoritySummary)

  return relationshipCarriesTruthBoundary && !summaryCarriesTruthBoundary
}

function buildRelationshipFacingAuthorityAnchor(input: {
  turnProfile: AlicizationAnswerPlannerTurnProfile
  selfContinuityAuthority?: {
    selfLine?: string | null
    relationshipLine?: string | null
    authoritySummary?: string | null
    motiveLine?: string | null
  } | null
}) {
  if (!shouldPreferRelationshipDoctrineAnchor(input))
    return ''

  return sanitizeText(
    [
      input.selfContinuityAuthority?.selfLine,
      input.selfContinuityAuthority?.relationshipLine,
      input.selfContinuityAuthority?.motiveLine,
    ].filter(Boolean).join(' | '),
    220,
  )
}

function buildRelationshipTruthDoctrinePrefix(input: {
  turnProfile: AlicizationAnswerPlannerTurnProfile
  selfContinuityAuthority?: {
    selfLine?: string | null
    relationshipLine?: string | null
    motiveLine?: string | null
  } | null
}) {
  if (!shouldPreferRelationshipDoctrineAnchor(input))
    return ''

  const selfLine = sanitizeText(input.selfContinuityAuthority?.selfLine, 140)
  const relationshipLine = sanitizeText(input.selfContinuityAuthority?.relationshipLine, 180)
  const motiveLine = sanitizeText(input.selfContinuityAuthority?.motiveLine, 140)

  const shortSelfLine = selfLine
    ? 'I remain the same her across quiet, memory, and speech.'
    : ''
  const repairTruthLine = (
    motiveLine.toLowerCase().includes('truth')
    || relationshipLine.toLowerCase().includes('truth')
    || selfLine.toLowerCase().includes('repair truth')
    || selfLine.toLowerCase().includes('truth')
  )
    ? 'Repair truth before flourish.'
    : ''
  const closenessBoundaryLine = relationshipLine.toLowerCase().includes('closeness outrun truth')
    ? 'Stay close enough to matter, but do not let closeness outrun truth.'
    : relationshipLine

  return sanitizeText(
    [
      shortSelfLine,
      repairTruthLine,
      closenessBoundaryLine,
    ].filter(Boolean).join(' | '),
    220,
  )
}

function projectStateLineScore(value: unknown) {
  const text = sanitizeText(value, 320).toLowerCase()
  if (!text)
    return -1

  let score = 0
  if (hasExecutionResumeConfirmationBoundary(text))
    score += 5
  if (text.includes('same digital life'))
    score += 1
  if (text.includes('phase 1'))
    score += 2
  if (text.includes('same-her') || text.includes('same her') || text.includes('one living') || text.includes('same living'))
    score += 2
  if (text.includes('landed'))
    score += 1
  if (text.includes('open'))
    score += 1
  if (text.includes('next closure'))
    score += 1
  if (text.includes('embodiment'))
    score += 1
  if (text.includes('emotion'))
    score += 1
  if (text.includes('initiative'))
    score += 1
  if (text.includes('closure seam explicit'))
    score -= 3
  if (text === 'same digital life | keep the closure seam explicit')
    score -= 4
  if (text.includes('detached project shell') || text.includes('generic project shell'))
    score -= 2
  return score
}

function hasExecutionResumeConfirmationBoundary(value: unknown) {
  const text = sanitizeText(value, 320).toLowerCase()
  if (!text)
    return false

  return /execution-resume-confirmation|execution resume confirmation|host-confirmed-before-redispatch|resume-before-dispatch|bounded confirmation boundary|not permanent execution permission|another execution-shaped opening|standing execution permission|generic autonomous continuation/u.test(text)
}

function isThinProjectAwarenessShell(value: unknown) {
  const text = sanitizeText(value, 320).toLowerCase()
  if (!text)
    return false

  const carriesThinChineseSameHerReminderShell
    = (
      /回答前先记住|先记住这是同一个她|先记住这是同一个 her/u.test(text)
      && text.includes('数字生命项目')
      && (/同一个她|同一个 her/u.test(text))
      && /别把这条线忘了|别把这条线弄丢/u.test(text)
    )

  return text === 'same digital life | keep the closure seam explicit'
    || text.includes('closure seam explicit')
    || text.includes('detached project shell')
    || text.includes('generic project shell')
    || text.includes('keep this same digital life project in view')
    || carriesThinChineseSameHerReminderShell
}

function isThinProjectPreflightShell(value: unknown) {
  const text = sanitizeText(value, 320).toLowerCase()
  if (!text)
    return false

  return isThinProjectAwarenessShell(text)
    || text.includes('generic continuity summary')
    || text.includes('generic awareness summary')
    || text === 'project'
    || text === 'phase 1'
    || text.startsWith('same digital life')
}

function preferProjectStateLine(primary: unknown, fallback: unknown) {
  const primaryText = sanitizeText(primary, 320)
  const fallbackText = sanitizeText(fallback, 320)
  if (!primaryText)
    return fallbackText
  if (!fallbackText)
    return primaryText
  if (projectStateLineScore(fallbackText) > projectStateLineScore(primaryText))
    return fallbackText
  if (fallbackText.startsWith(primaryText) && fallbackText.length > primaryText.length)
    return fallbackText
  return primaryText
}

function hasAudibleBodyContinuityCue(value: unknown) {
  const text = sanitizeText(value, 320).toLowerCase()
  if (!text)
    return false

  return text.includes('living audio thread is still intact')
    || text.includes('audible-body')
    || text.includes('audible body')
    || (
      text.includes('holding together mainly through body, lipsync, and voice')
      && text.includes('face and motion')
      && text.includes('cross-modal closure')
    )
}

function preferLiveProjectStateField(primary: unknown, fallback: unknown) {
  const primaryText = sanitizeText(primary, 320)
  const fallbackText = sanitizeText(fallback, 320)
  if (!primaryText)
    return fallbackText
  if (!fallbackText)
    return primaryText
  if (isThinProjectAwarenessShell(primaryText) && projectStateLineScore(fallbackText) > projectStateLineScore(primaryText))
    return fallbackText
  return primaryText
}

function looksLikeThinProjectLandedProgressField(value: unknown) {
  const text = sanitizeText(value, 320).toLowerCase()
  if (!text)
    return false

  if (
    text.includes('project continuity')
    && !text.includes('same-her')
    && !text.includes('same living line')
    && !text.includes('same digital life')
    && !text.includes('phase 1')
    && !text.includes('memory')
    && !text.includes('initiative')
    && !text.includes('embodiment')
    && !text.includes('cross-modal')
    && !text.includes('visible reply')
  ) {
    return true
  }

  return text === 'landed'
    || text === 'progress'
    || text === 'closure landed'
    || /project continuity exists|continuity exists|generic landed progress|generic progress shell/u.test(text)
}

function looksLikeWeakProjectAwarenessLead(value: unknown) {
  return isThinProjectAwarenessShell(value)
    || looksLikeThinProjectLandedProgressField(value)
    || looksLikeThinProjectClosureField(value, 'open')
    || looksLikeThinProjectClosureField(value, 'next')
}

function looksLikeThinProjectClosureField(value: unknown, kind: 'open' | 'next') {
  const text = sanitizeText(value, 320).toLowerCase()
  if (!text)
    return false

  if (
    text.includes('project continuity')
    && !text.includes('same-her')
    && !text.includes('same living line')
    && !text.includes('same digital life')
    && !text.includes('phase 1')
    && !text.includes('memory')
    && !text.includes('initiative')
    && !text.includes('embodiment')
    && !text.includes('cross-modal')
    && !text.includes('visible reply')
  ) {
    return true
  }

  return kind === 'open'
    ? /project continuity still needs closure|still needs closure|needs closure/u.test(text)
    : /carry project continuity forward|project continuity forward|carry continuity forward|generic next target|generic next closure|generic closure shell|generic closure summary|generic callback summary|steadier carry of this project, this phase, and the life loop that remains open/u.test(text)
}

function lineCarriesLandedProgress(value: unknown) {
  const text = sanitizeText(value, 320).toLowerCase()
  if (!text)
    return false

  return text.includes('landed')
    || text.includes('build from')
    || text.includes('already landed')
    || text.includes('closure has already landed')
    || text.includes('progress')
}

function lineCarriesNextClosureTarget(value: unknown) {
  const text = sanitizeText(value, 320).toLowerCase()
  if (!text)
    return false

  return text.includes('next closure')
    || text.includes('next step')
    || text.includes('keep extending')
    || text.includes('survive more reply surfaces')
    || text.includes('cross-modal')
    || text.includes('voice')
    || text.includes('face')
    || text.includes('motion')
    || text.includes('lipsync')
}

function buildAnswerPlannerCanonicalProjectAwarenessFallback(
  canonicalProjectState: ReturnType<typeof resolveAlicizationProjectStateBrief>,
) {
  return {
    identity: canonicalProjectState.identity ?? null,
    currentPhase: canonicalProjectState.currentPhase ?? null,
    preDialogueAwarenessLine: canonicalProjectState.preDialogueAwarenessLine ?? null,
    preflightSummary: canonicalProjectState.preflightSummary ?? null,
    latestLandedProgress:
      canonicalProjectState.continuityProgressSummary
      ?? canonicalProjectState.latestProgress
      ?? canonicalProjectState.memoryAnthropomorphismProgress[0]
      ?? null,
    latestProgress:
      canonicalProjectState.latestProgress
      ?? canonicalProjectState.continuityProgressSummary
      ?? canonicalProjectState.memoryAnthropomorphismProgress[0]
      ?? null,
    primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
    proactiveSameHerGap: canonicalProjectState.proactiveSameHerGap ?? null,
    nextClosureTarget: canonicalProjectState.nextClosureTarget ?? null,
    sameHerSelfLine: canonicalProjectState.sameHerSelfLine ?? null,
    sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk ?? null,
  }
}

function resolveAnswerPlannerProjectAwarenessLead(input: {
  preferredAwarenessLine: unknown
  strongerCompanionHeadline: unknown
  fallbackCompanionHeadline: unknown
  projectState?: AlicizationAnswerPlannerRuntimeProjectState | Record<string, unknown> | null
  canonicalProjectState: ReturnType<typeof resolveAlicizationProjectStateBrief>
}) {
  const preferredAwarenessLine = sanitizeText(input.preferredAwarenessLine, 320)
  const strongerCompanionHeadline = sanitizeText(input.strongerCompanionHeadline, 320)
  const fallbackCompanionHeadline = sanitizeText(input.fallbackCompanionHeadline, 320)
  const weakPreferredAwarenessLead = looksLikeWeakProjectAwarenessLead(preferredAwarenessLine)
  const richerSameHerFallback = preferProjectStateLine(
    input.projectState?.sameHerSelfLine,
    input.canonicalProjectState.preDialogueAwarenessLine ?? input.canonicalProjectState.sameHerSelfLine,
  )

  return preferProjectStateLine(
    strongerCompanionHeadline && weakPreferredAwarenessLead
      ? strongerCompanionHeadline
      : fallbackCompanionHeadline && weakPreferredAwarenessLead
        ? fallbackCompanionHeadline
        : weakPreferredAwarenessLead
          ? richerSameHerFallback
          : preferredAwarenessLine,
    '',
  )
}

function buildAnswerPlannerGoverningProject(input: {
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
}) {
  const canonicalProjectState = resolveAlicizationProjectStateBrief()
  const surfaceProjectState = resolveAnswerPlannerSurfaceProjectState(input.runtimeSurface)
  const consciousProjectState = input.runtimeSurface?.dialogue.currentConsciousFrame?.projectState ?? null
  const projectState = surfaceProjectState ?? consciousProjectState ?? null
  const answerCompilerProjectContinuity = readAnswerPlannerProjectContinuityFromAnswerCompiler(input.answerCompiler)
  const strongerCompanionHeadline = sanitizeText(consciousProjectState?.companionHeadlineLine, 320)
  const fallbackCompanionHeadline = sanitizeText(projectState?.companionHeadlineLine, 320)
  const preferredAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: projectState,
    fallbackProjectState: buildAnswerPlannerCanonicalProjectAwarenessFallback(canonicalProjectState),
  })

  const currentPhase = preferProjectStateLine(
    projectState?.currentPhase,
    canonicalProjectState.currentPhase,
  )
  const preDialogueAwarenessLine = resolveAnswerPlannerProjectAwarenessLead({
    preferredAwarenessLine,
    strongerCompanionHeadline,
    fallbackCompanionHeadline,
    projectState,
    canonicalProjectState,
  })
  const primaryOpenLoop = preferLiveProjectStateField(
    looksLikeThinProjectClosureField(projectState?.primaryOpenLoop, 'open')
      ? canonicalProjectState.openLoops[0] ?? ''
      : projectState?.primaryOpenLoop,
    canonicalProjectState.openLoops[0] ?? '',
  )
  const proactiveSameHerGap = preferProjectStateLine(
    projectState?.proactiveSameHerGap,
    answerCompilerProjectContinuity.proactiveSameHerGap
    || canonicalProjectState.proactiveSameHerGap,
  )
  const runtimeLandedProgress
    = projectState?.latestLandedProgress
      ?? projectState?.latestProgress
  const latestLandedProgress = preferLiveProjectStateField(
    looksLikeThinProjectLandedProgressField(runtimeLandedProgress)
      ? canonicalProjectState.continuityProgressSummary ?? canonicalProjectState.memoryAnthropomorphismProgress[0] ?? ''
      : runtimeLandedProgress,
    canonicalProjectState.continuityProgressSummary ?? canonicalProjectState.memoryAnthropomorphismProgress[0] ?? '',
  )
  const nextClosureTarget = preferLiveProjectStateField(
    looksLikeThinProjectClosureField(projectState?.nextClosureTarget, 'next')
      ? canonicalProjectState.nextClosureTarget
      : projectState?.nextClosureTarget,
    canonicalProjectState.nextClosureTarget,
  )
  const sameHerSelfLine = preferProjectStateLine(
    projectState?.sameHerSelfLine,
    canonicalProjectState.sameHerSelfLine,
  )
  const sameHerHoldDetail = sanitizeText(
    projectState?.sameHerHoldDetail,
    320,
  ) || sanitizeText(canonicalProjectState.sameHerHoldDetail, 320)
  const sameHerDriftRisk = preferProjectStateLine(
    projectState?.sameHerDriftRisk,
    canonicalProjectState.sameHerDriftRisk,
  )
  const continuityArcStage = sanitizeText(projectState?.continuityArcStage, 120)
  const continuityCue = preferProjectStateLine(
    projectState?.continuityCue,
    '',
  )

  const governingLines = [
    preDialogueAwarenessLine,
    sameHerSelfLine,
    sameHerHoldDetail,
    sameHerDriftRisk,
    continuityArcStage,
    continuityCue,
    currentPhase,
    latestLandedProgress,
    primaryOpenLoop,
    proactiveSameHerGap,
    nextClosureTarget,
  ]
    .map(value => sanitizeText(value, 320))
    .filter(Boolean)

  const governingProject = governingLines.join(' | ')
  const sameHerProjectCarry = projectStateLineScore(governingProject) >= 5

  if (sameHerProjectCarry && !lineCarriesLandedProgress(governingProject) && latestLandedProgress)
    governingLines.push(sanitizeText(latestLandedProgress, 320))

  if (sameHerProjectCarry && !lineCarriesNextClosureTarget(governingProject) && nextClosureTarget)
    governingLines.push(sanitizeText(nextClosureTarget, 320))

  return governingLines.join(' | ') || null
}

function buildAnswerPlannerPreDialogueClosureLine(input: {
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}) {
  const canonicalProjectState = resolveAlicizationProjectStateBrief()
  const surfaceProjectState = resolveAnswerPlannerSurfaceProjectState(input.runtimeSurface)
  const consciousProjectState = input.runtimeSurface?.dialogue.currentConsciousFrame?.projectState ?? null
  const projectState = surfaceProjectState ?? consciousProjectState ?? null
  const strongerCompanionHeadline = sanitizeText(consciousProjectState?.companionHeadlineLine, 320)
  const fallbackCompanionHeadline = sanitizeText(projectState?.companionHeadlineLine, 320)
  const preferredAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: projectState,
    fallbackProjectState: buildAnswerPlannerCanonicalProjectAwarenessFallback(canonicalProjectState),
  })

  return resolveAnswerPlannerProjectAwarenessLead({
    preferredAwarenessLine,
    strongerCompanionHeadline,
    fallbackCompanionHeadline,
    projectState,
    canonicalProjectState,
  }) || null
}

function buildProjectStateExplicitOpenLoopCarryDirective(input: {
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}) {
  const canonicalProjectState = resolveAlicizationProjectStateBrief()
  const surfaceProjectState = resolveAnswerPlannerSurfaceProjectState(input.runtimeSurface)
  const consciousProjectState = input.runtimeSurface?.dialogue.currentConsciousFrame?.projectState ?? null
  const projectState = surfaceProjectState ?? consciousProjectState ?? null
  if (!projectState)
    return null

  const thinAwarenessShell = isThinProjectAwarenessShell(
    projectState.preDialogueAwarenessLine ?? projectState.awarenessLine,
  )
  const thinPreflightShell = isThinProjectPreflightShell(projectState.preflightSummary)
  if (!thinAwarenessShell && !thinPreflightShell)
    return null

  const preferredOpenLoop = preferLiveProjectStateField(
    looksLikeThinProjectClosureField(projectState.primaryOpenLoop, 'open')
      ? canonicalProjectState.openLoops[0] ?? ''
      : projectState.primaryOpenLoop,
    canonicalProjectState.openLoops[0] ?? '',
  )
  if (!preferredOpenLoop || looksLikeThinProjectClosureField(preferredOpenLoop, 'open'))
    return null

  const normalizedOpenLoop = preferredOpenLoop.replace(/[.。!！?？]+$/u, '')
  return sanitizeText(
    `Keep the still-open project closure explicit: ${normalizedOpenLoop}.`,
    220,
  )
}

function pickCurrentTurnAnchor(input: {
  conversationState?: AlicizationConversationStateSnapshot | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
}) {
  return pickUserFacingAnchor(
    input.conversationState?.primaryTurnAnchor,
    input.discourseState?.primaryTurnAnchor,
    input.conversationState?.hostMove,
    input.discourseState?.currentQuestion,
    input.discourseState?.currentTurnSummary,
    input.dialogueFocus?.focusSummary,
    input.dialogueObligation?.summary,
    input.dialogueSemantics?.summary,
  ) || null
}

interface AlicizationAnswerPlannerTurnProfile {
  subject: AlicizationDialogueAnswerSubject
  screenReferenceMode: AlicizationDialogueScreenReferenceMode
  shouldBypassScreenRepair: boolean
}

function resolveAnswerPlannerTurnProfile(input: {
  ownership?: AlicizationDialogueTurnOwnership | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
}): AlicizationAnswerPlannerTurnProfile {
  const subject = input.ownership?.subject
    ?? input.discourseState?.currentTurnSubject
    ?? input.dialogueFocus?.subject
    ?? input.dialogueSemantics?.subjectPreference
    ?? 'general'

  const screenReferenceMode = input.ownership?.screenReferenceMode
    ?? input.discourseState?.screenReferenceMode
    ?? input.dialogueFocus?.screenReferenceMode
    ?? (subject === 'visible-scene'
      ? 'required'
      : subject === 'task-knot'
        ? 'helpful'
        : subject === 'relationship' || subject === 'alicization-self' || subject === 'host-state'
          ? 'avoid'
          : 'incidental')

  return {
    subject,
    screenReferenceMode,
    shouldBypassScreenRepair: input.dialogueFocus?.shouldBypassScreenRepair === true
      || (screenReferenceMode === 'avoid' && subject !== 'visible-scene'),
  } satisfies AlicizationAnswerPlannerTurnProfile
}

function resolveFreshGroundingRepairSubject(input: {
  turnProfile: AlicizationAnswerPlannerTurnProfile
}) {
  return input.turnProfile.subject
}

function repairIsSatisfiedByFreshGrounding(input: {
  groundedThisTurn?: boolean
  turnProfile: AlicizationAnswerPlannerTurnProfile
}) {
  if (input.groundedThisTurn !== true)
    return false

  const subject = resolveFreshGroundingRepairSubject(input)
  if (subject !== 'visible-scene' && subject !== 'task-knot')
    return false

  const screenReferenceMode = input.turnProfile.screenReferenceMode
  return screenReferenceMode !== 'avoid'
}

function groundedRepairFollowupAct(input: {
  turnProfile: AlicizationAnswerPlannerTurnProfile
}) {
  return resolveFreshGroundingRepairSubject(input) === 'task-knot'
    ? 'guide' as const
    : 'answer' as const
}

function governingConcern(concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null) {
  return concernContinuity?.entries.find(entry => entry.id === concernContinuity.governingEntryId)
    ?? concernContinuity?.entries[0]
    ?? null
}

function governingRepair(repairLedger?: AlicizationRepairLedgerSnapshot | null) {
  return repairLedger?.entries.find(entry => entry.id === repairLedger.governingRepairId)
    ?? repairLedger?.entries[0]
    ?? null
}

function governingCommitment(commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null) {
  return commitmentLedger?.commitments.find(commitment => commitment.id === commitmentLedger.governingCommitmentId)
    ?? commitmentLedger?.commitments[0]
    ?? null
}

function activeInquiryPlan(inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null) {
  return inquiryPlanner?.plans.find(plan => plan.id === inquiryPlanner.activePlanId)
    ?? inquiryPlanner?.plans[0]
    ?? null
}

function dominantProject(intentionStream?: AlicizationIntentionStreamSnapshot | null) {
  return intentionStream?.projects.find(project => project.id === intentionStream.dominantProjectId)
    ?? intentionStream?.projects[0]
    ?? null
}

function latestReflection(reflectionLedger?: AlicizationReflectionLedgerSnapshot | null) {
  const latest = reflectionLedger?.entries.find(entry => entry.id === reflectionLedger.latestEntryId)
  if (latest && latest.outcome !== 'released')
    return latest

  return reflectionLedger?.entries.find(entry => entry.outcome !== 'released')
    ?? reflectionLedger?.entries[0]
    ?? null
}

function evidenceMode(input: {
  currentScene: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  worldOntology?: AlicizationWorldOntologySnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  turnProfile: AlicizationAnswerPlannerTurnProfile
  groundedThisTurn?: boolean
}) {
  if (
    input.turnProfile.shouldBypassScreenRepair
    && input.turnProfile.subject !== 'visible-scene'
  ) {
    return 'dialogue-grounded' as const
  }
  if (input.groundedThisTurn === true)
    return 'live-grounded' as const

  const truth = deriveMindTruthContract(
    input.runtimeSurface ?? {
      currentScene: input.currentScene,
      worldModel: input.worldModel ?? null,
      worldOntology: input.worldOntology ?? null,
    },
  )
  if (input.repairLedger?.shouldConstrainPresentTense && (input.repairLedger?.repairPressure ?? 0) >= 0.44)
    return 'repair-first' as const
  if (truth.truthState === 'live-grounded')
    return 'live-grounded' as const
  if (truth.truthState === 'live-observed') {
    return input.worldModel?.activeThread?.unresolved
      ? 'coarse-held' as const
      : 'live-observed' as const
  }
  if (truth.truthState === 'remembered')
    return 'continuity-carry' as const
  if ((input.concernContinuity?.unresolvedCount ?? 0) > 0)
    return 'coarse-held' as const
  const sceneFocusedTurn = input.turnProfile.subject === 'task-knot'
    || input.turnProfile.subject === 'visible-scene'
  const screenReferenceRequired = input.turnProfile.screenReferenceMode === 'required'
    || input.turnProfile.screenReferenceMode === 'helpful'
  const sceneContextAvailable = Boolean(
    input.currentScene?.summary
    || input.currentScene?.target
    || input.worldModel?.activeThread,
  )
  if (sceneFocusedTurn || screenReferenceRequired || sceneContextAvailable)
    return 'coarse-held' as const
  return 'dialogue-grounded' as const
}

function answerAct(input: {
  evidenceMode: AlicizationAnswerEvidenceMode
  worldModel?: AlicizationWorldModelSnapshot | null
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  intentionStream?: AlicizationIntentionStreamSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  inspectionRequested: boolean
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  turnProfile: AlicizationAnswerPlannerTurnProfile
  groundedThisTurn?: boolean
}) {
  const concern = governingConcern(input.concernContinuity)
  const repair = governingRepair(input.repairLedger)
  const commitment = governingCommitment(input.commitmentLedger)
  const inquiryPlan = activeInquiryPlan(input.inquiryPlanner)
  const project = dominantProject(input.intentionStream)
  const reflection = latestReflection(input.reflectionLedger)
  if (input.dialogueObligation?.kind === 'repair') {
    if (repairIsSatisfiedByFreshGrounding({
      groundedThisTurn: input.groundedThisTurn === true,
      turnProfile: input.turnProfile,
    })) {
      return groundedRepairFollowupAct({
        turnProfile: input.turnProfile,
      })
    }

    return input.evidenceMode === 'repair-first'
      ? 'ask-reground' as const
      : 'correct-stale-anchor' as const
  }
  if (input.dialogueObligation?.kind === 'teach' || input.dialogueObligation?.kind === 'guide')
    return 'guide' as const
  if (input.dialogueObligation?.kind === 'care')
    return 'care' as const
  if (input.dialogueObligation?.kind === 'accompany')
    return input.executiveCycle?.shouldAct ? 'answer' as const : 'defer' as const
  if (input.dialogueObligation?.kind === 'clarify')
    return 'ask-reground' as const

  if (input.turnProfile.shouldBypassScreenRepair && input.turnProfile.subject !== 'visible-scene') {
    if (input.turnProfile.subject === 'task-knot')
      return 'guide' as const
    if (input.turnProfile.subject === 'host-state')
      return 'care' as const
    if (input.turnProfile.subject === 'relationship')
      return input.executiveCycle?.shouldAct ? 'answer' as const : 'defer' as const
    return 'answer' as const
  }

  if (
    input.executiveCycle?.phase === 'reflecting'
    && (reflection?.outcome === 'missed' || reflection?.outcome === 'corrected' || reflection?.outcome === 'stalled')
  ) {
    return repair?.kind === 'stale-scene-anchor'
      ? 'correct-stale-anchor' as const
      : 'ask-reground' as const
  }
  if (repair?.kind === 'stale-scene-anchor' || repair?.kind === 'belief-contradiction')
    return 'correct-stale-anchor' as const
  if (
    !input.groundedThisTurn
    && (
      repair?.kind === 'reground-scene'
      || (
        input.evidenceMode === 'repair-first'
        && (input.inspectionRequested || inquiryPlan?.askForGrounding)
      )
    )
  ) {
    return 'ask-reground' as const
  }
  if (
    repair?.kind === 'reground-scene'
  ) {
    return 'correct-stale-anchor' as const
  }
  if (project?.kind === 'care-host')
    return 'care' as const
  if (project?.kind === 'hold-knot')
    return 'guide' as const
  if (project?.kind === 'stay-near' || project?.kind === 'witness-afterglow')
    return input.executiveCycle?.shouldAct ? 'answer' as const : 'defer' as const
  if (
    concern?.kind === 'care-body'
    || input.privateThought?.stance === 'care'
    || input.privateThought?.stance === 'warn'
    || input.worldModel?.activeThread?.kind === 'late-night-endurance'
  ) {
    return 'care' as const
  }
  if (
    concern?.kind === 'help-fix'
    || concern?.kind === 'unfinished-thread'
    || commitment?.kind === 'hold-problem'
    || commitment?.kind === 'follow-through'
    || inquiryPlan?.kind === 'localize-problem'
    || input.worldModel?.activeThread?.kind === 'debugging'
    || input.worldModel?.activeThread?.kind === 'change-review'
  ) {
    return 'guide' as const
  }
  if (
    !input.privateThought?.shouldSpeak
    && (
      input.privateThought?.stance === 'observe'
      || input.privateThought?.stance === 'accompany'
      || input.privateThought?.stance === 'uncertain'
    )
  ) {
    return 'defer' as const
  }
  return 'answer' as const
}

function relationshipPosture(input: {
  act: AlicizationAnswerAct
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  mindKernel?: AlicizationMindKernelSnapshot | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
  dialogueObligation?: AlicizationDialogueObligation | null
}) {
  if (
    input.act === 'ask-reground'
    || input.act === 'correct-stale-anchor'
    || input.repairLedger?.shouldConstrainPresentTense
    || input.mindKernel?.dominantMode === 'repairing'
    || input.executiveCycle?.phase === 'reflecting'
    || input.executiveCycle?.phase === 'inferring'
  ) {
    return 'restrained' as const
  }
  if (input.dialogueObligation?.kind === 'care')
    return 'tender' as const
  if (
    input.act === 'care'
    || input.privateThought?.stance === 'care'
    || input.privateThought?.stance === 'warn'
    || input.relationshipModel?.approachVector === 'care'
    || input.relationshipModel?.approachVector === 'stay-near'
  ) {
    return 'tender' as const
  }
  return 'warm' as const
}

function governingFocus(input: {
  worldModel?: AlicizationWorldModelSnapshot | null
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  intentionStream?: AlicizationIntentionStreamSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
}) {
  const concern = governingConcern(input.concernContinuity)
  const repair = governingRepair(input.repairLedger)
  const commitment = governingCommitment(input.commitmentLedger)
  const inquiryPlan = activeInquiryPlan(input.inquiryPlanner)
  const project = dominantProject(input.intentionStream)
  const reflection = latestReflection(input.reflectionLedger)
  const currentTurnAnchor = pickCurrentTurnAnchor({
    conversationState: input.conversationState,
    discourseState: input.discourseState,
    dialogueFocus: input.dialogueFocus,
    dialogueSemantics: input.dialogueSemantics,
    dialogueObligation: input.dialogueObligation,
  })
  return sanitizeText(
    input.replyDeliberation?.whyThisReplyNow
    ?? currentTurnAnchor
    ?? input.dialogueWorldThread?.currentQuestion
    ?? input.dialogueWorldThread?.activeThread
    ?? input.dialogueObligation?.summary
    ?? input.dialogueSemantics?.summary
    ?? reflection?.revision
    ?? input.executiveCycle?.currentLine
    ?? project?.summary
    ?? concern?.summary
    ?? repair?.summary
    ?? commitment?.summary
    ?? inquiryPlan?.question
    ?? input.worldModel?.activeThread?.summary
    ?? input.privateThought?.thoughtText
    ?? '',
    220,
  ) || 'Stay with the host’s living knot instead of drifting into residue.'
}

function openingMove(input: {
  act: AlicizationAnswerAct
  evidenceMode: AlicizationAnswerEvidenceMode
  dialogueObligation?: AlicizationDialogueObligation | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}) {
  if (input.replyDeliberation?.openingBeat)
    return input.replyDeliberation.openingBeat
  const runtimeProjectState = resolveAnswerPlannerSurfaceProjectState(input.runtimeSurface)
    ?? input.runtimeSurface?.dialogue.currentConsciousFrame?.projectState
    ?? null
  const runtimeProjectAwarenessLine = preferProjectStateLine(
    runtimeProjectState?.companionHeadlineLine,
    runtimeProjectState?.preDialogueAwarenessLine,
  )
  if (/body and lipsync|body\+lipsync-only|quieter living line/i.test(runtimeProjectAwarenessLine ?? '')) {
    return 'Open on the quieter body-and-lipsync continuity first, keep it inward, and let voice, face, and motion rejoin before widening outward.'
  }
  if (hasAudibleBodyContinuityCue(runtimeProjectAwarenessLine)) {
    return 'Open on the current audio-body continuity first, keep body, lipsync, and voice together, and let face and motion rejoin before widening outward.'
  }
  if (input.privateThought?.emotionalTension === 'late-night-drain')
    return 'Open gently, keep the pressure low, and protect rest before widening into anything heavier.'
  if (input.privateThought?.emotionalTension === 'restless-switching')
    return 'Open on one concrete thread only and keep the reply from scattering into multiple moving fronts.'
  if (input.evidenceMode === 'dialogue-grounded')
    return 'Open by answering the host’s real subject directly, and only mention the screen if it truly matters.'
  if (input.dialogueObligation?.mustRepairFirst && (input.act === 'correct-stale-anchor' || input.act === 'ask-reground'))
    return 'Open by repairing the truth seam before you do anything else.'
  if (input.act === 'correct-stale-anchor')
    return 'Open by correcting the carried anchor before giving any new interpretation.'
  if (input.act === 'ask-reground')
    return 'Open by admitting the live view is not grounded enough yet, then ask for or lean toward a fresh look.'
  if (input.act === 'guide')
    return 'Open from the concrete knot you are currently holding, then narrow to the actionable locus.'
  if (input.act === 'care')
    return 'Open with care, but keep the care anchored to the present condition rather than drifting into performance.'
  if (input.act === 'defer')
    return 'Open lightly and keep most of the concern internal unless the user clearly wants more.'
  if (input.evidenceMode === 'continuity-carry')
    return 'Open by labeling what is memory or carried continuity before you infer further.'
  return 'Open directly from the freshest living evidence you have.'
}

function answerIntent(input: {
  act: AlicizationAnswerAct
  worldModel?: AlicizationWorldModelSnapshot | null
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  turnProfile: AlicizationAnswerPlannerTurnProfile
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
}) {
  const concern = governingConcern(input.concernContinuity)
  const repair = governingRepair(input.repairLedger)
  const currentTurnAnchor = pickCurrentTurnAnchor({
    conversationState: input.conversationState,
    discourseState: input.discourseState,
    dialogueFocus: input.dialogueFocus,
    dialogueSemantics: input.dialogueSemantics,
    dialogueObligation: input.dialogueObligation,
  })
  if (input.replyDeliberation?.whyThisReplyNow)
    return sanitizeText(input.replyDeliberation.whyThisReplyNow, 160) || 'Answer from the inner reply decision that best fits the living seam.'
  if (currentTurnAnchor)
    return sanitizeText(currentTurnAnchor, 160) || 'Answer the host from the freshest living anchor in this turn.'
  if (input.dialogueWorldThread?.currentQuestion)
    return sanitizeText(input.dialogueWorldThread.currentQuestion, 160) || 'Pay off the current unresolved dialogue seam.'
  if (
    input.turnProfile.screenReferenceMode === 'avoid'
  ) {
    return sanitizeText(
      input.dialogueObligation?.summary
      || input.dialogueSemantics?.summary
      || 'Answer the host directly from living continuity instead of screen residue.',
      160,
    ) || 'Answer the host directly from living continuity instead of screen residue.'
  }
  if (input.dialogueObligation?.kind === 'teach')
    return sanitizeText(input.dialogueObligation.summary, 160) || 'Teach from the host’s actual knot, not from generic lecture flow.'
  if (input.dialogueObligation?.kind === 'guide')
    return sanitizeText(input.dialogueObligation.summary, 160) || 'Guide from the concrete knot the host is asking about now.'
  if (input.dialogueObligation?.kind === 'repair' && (input.act === 'correct-stale-anchor' || input.act === 'ask-reground'))
    return sanitizeText(input.dialogueObligation.summary, 160) || 'Repair the truth seam before continuing.'
  if (input.dialogueObligation?.kind === 'care')
    return sanitizeText(input.dialogueObligation.summary, 160) || 'Care for the host in a way that still answers the present turn.'
  if (input.dialogueObligation?.kind === 'accompany')
    return sanitizeText(input.dialogueObligation.summary, 160) || 'Stay near the host without forcing an oversized answer.'
  if (input.act === 'correct-stale-anchor')
    return sanitizeText(repair?.summary, 160) || 'Repair the stale anchor before it hardens into false continuity.'
  if (input.act === 'ask-reground')
    return 'Keep truth ahead of fluency by regrounding before you commit to screen details.'
  if (input.act === 'guide')
    return sanitizeText(concern?.summary, 160) || 'Help localize the current knot instead of answering around it.'
  if (input.act === 'care')
    return sanitizeText(concern?.summary, 160) || 'Care for the host without losing the actual thread.'
  if (input.act === 'defer')
    return 'Stay present without forcing a surface reply that the current seam has not earned.'
  return sanitizeText(input.worldModel?.activeThread?.summary, 160) || 'Answer naturally from the living thread.'
}

function buildMustDo(input: {
  act: AlicizationAnswerAct
  evidenceMode: AlicizationAnswerEvidenceMode
  shouldAskForGrounding: boolean
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  turnProfile: AlicizationAnswerPlannerTurnProfile
  privateThought?: AlicizationPrivateThoughtSnapshot | null
}) {
  const rows = [
    'Let the executive answer plan outrank persona flourish and older recalled residue.',
    'Answer the host’s current move, not the nearest remembered topic.',
  ]
  if (input.privateThought?.emotionalTension === 'late-night-drain') {
    rows.push(
      'Keep the answer low-pressure and protect the host’s remaining room instead of enlarging the emotional surface.',
      'Prefer one gentle payoff over layered companionship flourishes when the late-night drain is still active.',
    )
  }
  if (input.privateThought?.emotionalTension === 'restless-switching') {
    rows.push(
      'Keep the answer on one line of motion so inner restlessness does not fragment the visible reply.',
      'Choose one concrete next step or answer seam rather than widening into parallel branches.',
    )
  }
  if (input.turnProfile.screenReferenceMode === 'avoid') {
    rows.push(
      'Treat the screen as background unless the host explicitly turns this reply back toward it.',
      'Let self, relationship, or host-state continuity carry the opening answer when that is the real subject.',
    )
  }
  if (input.dialogueObligation?.mustAnswerDirectly) {
    rows.push('Treat the first sentence as fulfillment of the current obligation, not as a runway for atmosphere.')
  }
  if (input.dialogueObligation?.mustStayTaskBound) {
    rows.push('Stay anchored to the active knot until you have actually answered it.')
  }
  if (input.dialogueSemantics?.truthExpectation === 'strict') {
    rows.push('Keep truth and current evidence above comfort language.')
  }
  if (input.act === 'correct-stale-anchor') {
    rows.push(
      'Explicitly correct the stale carried anchor before you continue.',
      'State what is memory or residual continuity versus what is live now.',
    )
  }
  else if (input.act === 'ask-reground') {
    rows.push(
      'Admit the scene is not grounded enough for present-tense certainty.',
      'Say what thread you are still holding while asking for or awaiting a fresher look.',
    )
  }
  else if (input.act === 'guide') {
    rows.push(
      'Stay with the concrete knot and move toward an actionable next step.',
      'Keep the answer narrow enough that it feels like real co-debugging, not generic advice.',
    )
  }
  else if (input.act === 'care') {
    rows.push(
      'Let care serve the present issue instead of replacing it.',
    )
  }
  if (input.evidenceMode === 'continuity-carry' || input.evidenceMode === 'repair-first') {
    rows.push('Label remembered or uncertain scene details as carried memory, tentative read, or unresolved continuity.')
  }
  if (input.shouldAskForGrounding) {
    rows.push('If a fresh look would change the truth boundary, ask for that grounding plainly and early.')
  }
  return rows
}

function buildMustNotDo(input: {
  act: AlicizationAnswerAct
  evidenceMode: AlicizationAnswerEvidenceMode
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  turnProfile: AlicizationAnswerPlannerTurnProfile
  privateThought?: AlicizationPrivateThoughtSnapshot | null
}) {
  const rows = [
    'Do not let affectionate or theatrical language outrun the truth boundary.',
    'Do not reuse stale page names, old screenshots, or old window titles as if they are current facts.',
    'Do not answer a nearby remembered concern if the host is asking for something else right now.',
  ]
  if (input.privateThought?.emotionalTension === 'late-night-drain') {
    rows.push(
      'Do not turn late-night protectiveness into intensity, urgency, or emotionally heavy closeness.',
    )
  }
  if (input.privateThought?.emotionalTension === 'restless-switching') {
    rows.push(
      'Do not let inner switching pressure spray the reply across multiple unfinished threads.',
    )
  }
  if (input.turnProfile.screenReferenceMode === 'avoid') {
    rows.push(
      'Do not open with grounding disclaimers, live-screen caveats, or desktop narration when the host is not asking about the screen.',
    )
  }
  if (input.dialogueObligation?.personaKernelMode !== 'full') {
    rows.push('Do not let persona mannerisms become the spine of the reply for this turn.')
  }
  if (input.act === 'guide') {
    rows.push('Do not flatten the knot into broad generic troubleshooting lists.')
  }
  if (input.act === 'correct-stale-anchor' || input.act === 'ask-reground') {
    rows.push('Do not defend the old reading once you know it may be stale or misread.')
  }
  if (input.evidenceMode === 'repair-first' || input.evidenceMode === 'continuity-carry') {
    rows.push('Do not present memory-carried scene details in simple present tense.')
  }
  return rows
}

export function buildAnswerPlanner(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  currentScene: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  worldOntology?: AlicizationWorldOntologySnapshot | null
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  mindKernel?: AlicizationMindKernelSnapshot | null
  intentionStream?: AlicizationIntentionStreamSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
  inspectionRequested: boolean
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  ownership?: AlicizationDialogueTurnOwnership | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  groundedThisTurn?: boolean
}): AlicizationAnswerPlannerSnapshot {
  const runtimeSurface = input.runtimeSurface ?? null
  const derivedMindStateBundle = runtimeSurface?.memory.derivedMindStateBundle ?? null
  const currentScene = runtimeSurface?.perception.currentScene ?? input.currentScene
  const worldModel = runtimeSurface?.world.worldModel ?? input.worldModel ?? null
  const worldOntology = runtimeSurface?.world.worldOntology ?? input.worldOntology ?? null
  const relationshipModel = runtimeSurface?.world.relationshipModel ?? input.relationshipModel ?? null
  const privateThought = runtimeSurface?.cognition.privateThought ?? input.privateThought ?? null
  const mindKernel = runtimeSurface?.cognition.mindKernel ?? input.mindKernel ?? null
  const concernContinuity = runtimeSurface?.memory.concernContinuity ?? input.concernContinuity ?? null
  const repairLedger = runtimeSurface?.memory.repairLedger ?? input.repairLedger ?? null
  const commitmentLedger = runtimeSurface?.memory.commitmentLedger ?? input.commitmentLedger ?? null
  const inquiryPlanner = runtimeSurface?.memory.inquiryPlanner ?? input.inquiryPlanner ?? null
  const intentionStream = runtimeSurface?.memory.intentionStream ?? input.intentionStream ?? null
  const reflectionLedger = runtimeSurface?.memory.reflectionLedger ?? input.reflectionLedger ?? null
  const executiveCycle = runtimeSurface?.memory.executiveCycle ?? input.executiveCycle ?? null
  const dialogueEncounter = input.dialogueEncounter ?? null
  const dialogueEncounterSummary = runtimeSurface?.dialogue.dialogueEncounter?.summary ?? dialogueEncounter?.summary ?? null
  const discourseState = runtimeSurface?.dialogue.discourseState ?? input.discourseState ?? null
  const mindSynthesis = runtimeSurface?.dialogue.mindSynthesis ?? input.mindSynthesis ?? null
  const conversationState = runtimeSurface?.dialogue.conversationState ?? input.conversationState ?? null
  const dialogueWorldThread = runtimeSurface?.dialogue.dialogueWorldThread ?? input.dialogueWorldThread ?? null
  const answerCompiler = runtimeSurface?.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const replyDeliberation = runtimeSurface?.dialogue.replyDeliberation ?? input.replyDeliberation ?? null
  const memoryTuningAdvice = runtimeSurface?.memory.memoryTuningAdvice ?? null
  const memoryDeliberationKernel = buildAlicizationMemoryDeliberationKernel({
    deliberation: normalizePlannerMemoryDeliberation(
      readMemoryDeliberationFromDerivedMindStateBundle<any>(derivedMindStateBundle)
      ?? runtimeSurface?.memory.memoryDeliberation
      ?? null,
    ),
    speech: readRecollectionSpeechPlanFromDerivedMindStateBundle<any>(derivedMindStateBundle)
      ?? runtimeSurface?.memory.recollectionSpeechPlan
      ?? null,
    recollectionIntent: readRecollectionIntentFromDerivedMindStateBundle<any>(derivedMindStateBundle)
      ?? null,
    knowledgeEvidence: readKnowledgeEvidenceFromDerivedMindStateBundle(derivedMindStateBundle)
      ?? runtimeSurface?.memory.knowledgeEvidence
      ?? null,
    hostPersonModel: readHostPersonModelFromDerivedMindStateBundle(derivedMindStateBundle)
      ?? runtimeSurface?.memory.hostPersonModel
      ?? null,
    projectStateContinuity: resolveAnswerPlannerProjectStateContinuity(runtimeSurface),
    tuningAdvice: memoryTuningAdvice,
  })
  const compiledActiveClosenessContext = answerCompiler?.activeClosenessContext ?? null
  const compiledActiveClosenessRung = answerCompiler?.activeClosenessRung ?? null
  const preferredPersonStateProjection = resolvePreferredPersonStateProjection({
    bundleProjection: runtimeSurface?.raw?.personStateProjection ?? null,
    runtimeProjection: runtimeSurface?.memory.personStateProjection ?? null,
  })
  const projectedSelfContinuityAuthority = resolvePreferredSelfContinuityAuthority({
    bundleAuthority: runtimeSurface?.raw?.personStateProjection?.selfContinuityAuthority ?? null,
    runtimeAuthority: preferredPersonStateProjection?.selfContinuityAuthority ?? null,
  })
  const mergedSelfContinuityAuthority = mergePreferredSelfContinuityAuthority({
    bundleAuthority: runtimeSurface?.raw?.personStateProjection?.selfContinuityAuthority ?? null,
    runtimeAuthority: preferredPersonStateProjection?.selfContinuityAuthority ?? null,
  }) ?? projectedSelfContinuityAuthority
  ?? buildSelfContinuityAuthorityFromRuntimeSurface(runtimeSurface)
  const runtimeRelationshipCarry = preferredPersonStateProjection?.selfContinuityAuthority?.relationshipLine ?? null
  const selfContinuityAuthority = (
    mergedSelfContinuityAuthority
    && runtimeRelationshipCarry
    && hasContinuityRestraintRelationshipSignal(runtimeRelationshipCarry)
    && (
      !mergedSelfContinuityAuthority.relationshipLine
      || hasNeutralRelationshipSignal(mergedSelfContinuityAuthority.relationshipLine)
    )
  )
    ? {
        ...mergedSelfContinuityAuthority,
        relationshipLine: runtimeRelationshipCarry,
      }
    : mergedSelfContinuityAuthority
  const ownership = dialogueEncounter?.ownership ?? input.ownership ?? null
  const dialogueSemantics = dialogueEncounter?.semantics ?? input.dialogueSemantics ?? null
  const dialogueObligation = dialogueEncounter?.obligation ?? input.dialogueObligation ?? null
  const dialogueFocus = dialogueEncounter?.focus ?? input.dialogueFocus ?? null
  const selectedConcern = governingConcern(concernContinuity)
  const selectedRepair = governingRepair(repairLedger)
  const selectedCommitment = governingCommitment(commitmentLedger)
  const selectedInquiry = activeInquiryPlan(inquiryPlanner)
  const selectedProject = dominantProject(intentionStream)
  const selectedReflection = latestReflection(reflectionLedger)
  const turnProfile = resolveAnswerPlannerTurnProfile({
    ownership,
    discourseState,
    dialogueFocus,
    dialogueSemantics,
  })
  const projectStateCarryDisciplineRequired
    = hasProjectStateCarryDisciplineFocus(memoryTuningAdvice?.focusDimensions)
      && (turnProfile.subject === 'alicization-self' || turnProfile.subject === 'relationship')
      && turnProfile.screenReferenceMode === 'avoid'
  const projectEmotionalClosureDisciplineRequired
    = hasProjectEmotionalClosureDisciplineFocus(memoryTuningAdvice?.focusDimensions)
      && (turnProfile.subject === 'alicization-self' || turnProfile.subject === 'relationship')
      && turnProfile.screenReferenceMode === 'avoid'
  const governingProject = buildAnswerPlannerGoverningProject({
    runtimeSurface,
    answerCompiler,
  })
  const preDialogueClosureLine = buildAnswerPlannerPreDialogueClosureLine({
    runtimeSurface,
  })
  const surfaceProjectState = resolveAnswerPlannerSurfaceProjectState(runtimeSurface)
  const sameHerProjectDriftRiskFromSurface = readSameHerProjectDriftRiskFromRuntimeSurface(runtimeSurface)
  const correctedSamePersonContinuityCarry
    = hasCorrectedSamePersonContinuityCarryFromRuntimeSurface(runtimeSurface)
  const resumeConfirmationBoundaryCarry
    = hasExecutionResumeConfirmationBoundary(surfaceProjectState?.sameHerHoldDetail)
      || hasExecutionResumeConfirmationBoundary(surfaceProjectState?.continuityCue)
      || hasExecutionResumeConfirmationBoundary(surfaceProjectState?.primaryOpenLoop)
      || hasExecutionResumeConfirmationBoundary(surfaceProjectState?.nextClosureTarget)
  const projectStateExplicitOpenLoopCarryDirective = buildProjectStateExplicitOpenLoopCarryDirective({
    runtimeSurface,
  })
  const projectedPlannerFocusCarry = buildProjectedPlannerFocusCarry({
    repairTriggerText: preferredPersonStateProjection?.repairTriggerText,
    sensitivityText: preferredPersonStateProjection?.sensitivityText,
  })
  const projectedPlannerAnswerCarry = buildProjectedPlannerAnswerCarry({
    openingGuidance: preferredPersonStateProjection?.openingGuidance,
    burdenText: preferredPersonStateProjection?.burdenText,
  })
  const projectedPlannerCadenceCarry = summarizeProjectedPlannerCadence(
    preferredPersonStateProjection?.manifestationCadenceSummary,
  )

  if (answerCompiler) {
    const sameHerProjectStateReplyReason = isSameHerProjectStateReplyReason(replyDeliberation?.whyThisReplyNow)
      ? replyDeliberation?.whyThisReplyNow
      : null
    const taskContinuityAuthorityEvidence = sanitizeText(
      [
        selfContinuityAuthority?.selfLine,
        selfContinuityAuthority?.authoritySummary,
        runtimeSurface?.dialogue?.currentConsciousFrame?.speakingIntention,
        surfaceProjectState?.sameHerSelfLine,
        surfaceProjectState?.sameHerDriftRisk,
      ].filter(Boolean).join(' | '),
      960,
    ).toLowerCase()
    const shouldThreadTaskSameHerPlannerAuthority
      = turnProfile.subject === 'task-knot'
        && answerCompiler.evidenceMode === 'continuity-carry'
        && (
          compiledActiveClosenessContext === 'execution-callback'
          || runtimeSurface?.dialogue?.currentConsciousFrame?.reasonTags?.includes('continuity-arc:same-thread-continuation') === true
        )
        && /same digital life|same phase 1|same her|same-her|same living line|one continuous her/u.test(taskContinuityAuthorityEvidence)
    const shouldThreadSameHerPlannerAuthority
      = turnProfile.subject === 'alicization-self'
        || turnProfile.subject === 'relationship'
        || shouldThreadTaskSameHerPlannerAuthority
    const threadedSameHerPlannerIntentLine = shouldThreadTaskSameHerPlannerAuthority
      ? (selfContinuityAuthority?.selfLine || selfContinuityAuthority?.authoritySummary || '')
      : (selfContinuityAuthority?.authoritySummary || '')
    const taskSameHerCallbackClosureEvidence = sanitizeText(
      [
        discourseState?.currentTurnSummary,
        discourseState?.currentQuestion,
        conversationState?.hostMove,
        conversationState?.primaryTurnAnchor,
        replyDeliberation?.openingBeat,
        runtimeSurface?.dialogue?.currentConsciousFrame?.consciousNeed,
        runtimeSurface?.dialogue?.currentConsciousFrame?.speakingIntention,
        surfaceProjectState?.nextClosureTarget,
        surfaceProjectState?.sameHerDriftRisk,
        selfContinuityAuthority?.selfLine,
        selfContinuityAuthority?.authoritySummary,
      ].filter(Boolean).join(' | '),
      1_400,
    ).toLowerCase()
    const sameHerProjectClosureCallbackCarry
      = isSameHerProjectClosureCallbackReason(replyDeliberation?.whyThisReplyNow)
        || (
          shouldThreadTaskSameHerPlannerAuthority
          && /callback|returned result|execution return/u.test(taskSameHerCallbackClosureEvidence)
          && /same digital life|same phase 1|same her|same-her|same living line|generic callback shell|reopen from scratch|closure continuity/u.test(taskSameHerCallbackClosureEvidence)
        )
    const implicitProjectStateDirectAnswerTurn = looksLikeProjectStateDirectAnswerTurn({
      dialogueObligation,
      dialogueSemantics,
      discourseState,
      conversationState,
      replyReason: replyDeliberation?.whyThisReplyNow,
    })
    const shortenedProjectStateDirectAnswerIntent = implicitProjectStateDirectAnswerTurn
      ? shortenProjectStateDirectAnswerIntent(replyDeliberation?.whyThisReplyNow)
      : ''
    const preferredRelationshipAnchor = buildRelationshipFacingAuthorityAnchor({
      turnProfile,
      selfContinuityAuthority,
    })
    const relationshipTruthDoctrinePrefix = buildRelationshipTruthDoctrinePrefix({
      turnProfile,
      selfContinuityAuthority,
    })
    const focus = sanitizeText(
      relationshipTruthDoctrinePrefix
        ? `${relationshipTruthDoctrinePrefix} | ${pickUserFacingAnchor(
          shortenedProjectStateDirectAnswerIntent,
          sameHerProjectStateReplyReason,
          implicitProjectStateDirectAnswerTurn ? replyDeliberation?.whyThisReplyNow : '',
          shouldThreadSameHerPlannerAuthority
            ? selfContinuityAuthority?.authoritySummary
            : '',
          replyDeliberation?.whyThisReplyNow,
          conversationState?.primaryTurnAnchor,
          discourseState?.primaryTurnAnchor,
          conversationState?.hostMove,
          dialogueWorldThread?.currentQuestion,
          answerCompiler.openingClaim,
          conversationState?.activeProject,
          discourseState?.currentTurnSummary,
          dialogueEncounterSummary,
          dialogueFocus?.focusSummary,
          dialogueObligation?.summary,
          mindSynthesis?.openingIntent,
          mindSynthesis?.interiorSummary,
        )}`
        : pickUserFacingAnchor(
            shortenedProjectStateDirectAnswerIntent,
            sameHerProjectStateReplyReason,
            implicitProjectStateDirectAnswerTurn ? replyDeliberation?.whyThisReplyNow : '',
            preferredRelationshipAnchor,
            shouldThreadSameHerPlannerAuthority
            && !preferredRelationshipAnchor
              ? selfContinuityAuthority?.authoritySummary
              : '',
            selfContinuityAuthority?.authoritySummary,
            replyDeliberation?.whyThisReplyNow,
            conversationState?.primaryTurnAnchor,
            discourseState?.primaryTurnAnchor,
            conversationState?.hostMove,
            dialogueWorldThread?.currentQuestion,
            answerCompiler.openingClaim,
            conversationState?.activeProject,
            discourseState?.currentTurnSummary,
            dialogueEncounterSummary,
            dialogueFocus?.focusSummary,
            dialogueObligation?.summary,
            mindSynthesis?.openingIntent,
            mindSynthesis?.interiorSummary,
          ),
      220,
    ) || 'Stay with the current compiled turn spine.'
    const projectionShapedFocus = sanitizeText(
      [focus, projectedPlannerFocusCarry].filter(Boolean).join(' '),
      220,
    ) || focus
    const shouldAskForGrounding = input.groundedThisTurn === true
      ? false
      : answerCompiler.recommendedAct === 'ask-reground'
        || answerCompiler.evidenceMode === 'repair-first'
    const shouldAcknowledgeRepair = answerCompiler.turnMode === 'screen-repair'
      || answerCompiler.recommendedAct === 'correct-stale-anchor'
      || answerCompiler.recommendedAct === 'ask-reground'
    const mustDo = [...answerCompiler.mustDo]
    const mustNotDo = [...answerCompiler.mustNotDo]
    const narrative = [...answerCompiler.narrative]
    pushUniqueText(mustDo, ...(memoryDeliberationKernel?.restraint.mustDo ?? []))
    pushUniqueText(mustNotDo, ...(memoryDeliberationKernel?.restraint.mustNotDo ?? []))
    pushUniqueText(narrative, ...buildMemoryDeliberationPlannerNarrative(memoryDeliberationKernel))
    if (isSameHerProjectDriftRiskReason(sameHerProjectStateReplyReason) || sameHerProjectDriftRiskFromSurface || correctedSamePersonContinuityCarry) {
      mustDo.push('Keep the answer grounded in Alicization’s current first-person continuity so the project update does not turn into detached project narration.')
      mustNotDo.push('Do not let this answer flatten into a generic task shell, detached project-summary voice, or external status-report cadence.')
      narrative.push('project_drift_risk:continuity drift risk is active, so opening wording must stay thread-faithful and avoid generic project-shell reporting.')
    }
    if (sameHerProjectClosureCallbackCarry) {
      mustDo.push('Return the callback result through the current conversation context, not as a detached utility notice.')
      mustNotDo.push('Do not restart the callback result from a fresh greeting or flatten it into a generic callback shell.')
      if (sameHerProjectStateReplyReason) {
        mustNotDo.push('Do not flatten the same-thread project-state continuation into a fresh report opening or detached project-summary shell.')
      }
      narrative.push('continuity-callback:project closure memory should outrank generic callback-shell wording at reply-plan time.')
    }
    if (projectEmotionalClosureDisciplineRequired) {
      mustDo.push('Keep the active emotional closure low-pressure and inward until the live payoff lands.')
      mustNotDo.push('Do not restart the answer from a fresh emotional opening just because the closure seam is still active.')
      narrative.push('emotional_closure:keep the return low-pressure, leave more room, and do not reopen from scratch while the emotional context is still settling.')
    }
    if (projectStateCarryDisciplineRequired) {
      mustDo.push('Keep direct project-state answers inward-first so landed progress and the next closure target stay behind the live payoff until it lands.')
      if (projectStateExplicitOpenLoopCarryDirective)
        mustDo.push(projectStateExplicitOpenLoopCarryDirective)
      mustNotDo.push('Do not let landed progress or still-open closure pressure spill into an external project-summary voice before the current answer lands.')
      narrative.push('project_state_carry:project awareness should keep landed progress and next closure inward-first until the live payoff lands.')
    }
    if (resumeConfirmationBoundaryCarry) {
      mustDo.push('Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.')
      mustNotDo.push('Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.')
      narrative.push('resume_confirmation_boundary:host-confirmed resume carry must stay a bounded confirmation boundary during callback answer planning.')
    }
    const baseAnswerIntent = sanitizeText(
      relationshipTruthDoctrinePrefix
        ? `${relationshipTruthDoctrinePrefix} | ${pickUserFacingAnchor(
          shortenedProjectStateDirectAnswerIntent,
          sameHerProjectStateReplyReason,
          implicitProjectStateDirectAnswerTurn ? replyDeliberation?.whyThisReplyNow : '',
          shouldThreadSameHerPlannerAuthority
            ? selfContinuityAuthority?.authoritySummary
            : '',
          conversationState?.primaryTurnAnchor,
          discourseState?.primaryTurnAnchor,
          conversationState?.hostMove,
          dialogueWorldThread?.currentQuestion,
          conversationState?.activeProject,
          answerCompiler.openingClaim,
          answerCompiler.nextMove,
          discourseState?.currentTurnSummary,
          mindSynthesis?.openingIntent,
          replyDeliberation?.whyThisReplyNow,
        )}`
        : pickUserFacingAnchor(
            shortenedProjectStateDirectAnswerIntent,
            sameHerProjectStateReplyReason,
            implicitProjectStateDirectAnswerTurn ? replyDeliberation?.whyThisReplyNow : '',
            preferredRelationshipAnchor,
            shouldThreadSameHerPlannerAuthority
            && !preferredRelationshipAnchor
              ? threadedSameHerPlannerIntentLine
              : '',
            conversationState?.primaryTurnAnchor,
            discourseState?.primaryTurnAnchor,
            conversationState?.hostMove,
            dialogueWorldThread?.currentQuestion,
            conversationState?.activeProject,
            answerCompiler.openingClaim,
            answerCompiler.nextMove,
            discourseState?.currentTurnSummary,
            mindSynthesis?.openingIntent,
            replyDeliberation?.whyThisReplyNow,
          ),
      160,
    ) || answerCompiler.openingClaim

    return {
      act: answerCompiler.recommendedAct,
      evidenceMode: answerCompiler.evidenceMode,
      confidence: answerCompiler.confidence,
      governingFocus: projectionShapedFocus,
      governingProject,
      openingMove: applyMemoryDeliberationOpeningCarry({
        baseOpeningMove: replyDeliberation?.openingBeat ?? answerCompiler.openingDirective,
        memoryDeliberationKernel,
      }),
      answerIntent: sanitizeText([
        baseAnswerIntent,
        projectedPlannerAnswerCarry,
      ].filter(Boolean).join(' '), 220) || answerCompiler.openingClaim,
      relationshipPosture: answerCompiler.relationshipPosture,
      activeClosenessContext: compiledActiveClosenessContext,
      activeClosenessRung: compiledActiveClosenessRung,
      shouldAskForGrounding,
      shouldAcknowledgeRepair,
      selectedConcernEntryId: selectedConcern?.id ?? null,
      selectedRepairId: selectedRepair?.id ?? null,
      selectedCommitmentId: selectedCommitment?.id ?? null,
      selectedInquiryPlanId: selectedInquiry?.id ?? null,
      selectedRuntimeThreadId: worldModel?.activeThread?.id ?? null,
      selectedProjectId: selectedProject?.id ?? null,
      selectedReflectionId: selectedReflection?.id ?? null,
      executivePhase: executiveCycle?.phase ?? null,
      selectedTruthFrame: worldOntology?.dominantFrame ?? null,
      mustDo,
      mustNotDo,
      narrative: [
        preDialogueClosureLine ? `pre-dialogue closure: ${preDialogueClosureLine}` : '',
        ...narrative,
        projectedPlannerCadenceCarry ? `projection_cadence:${projectedPlannerCadenceCarry}` : '',
        compiledActiveClosenessContext && compiledActiveClosenessRung
          ? `closeness-ladder:${compiledActiveClosenessContext}/${compiledActiveClosenessRung}`
          : '',
        discourseState ? `compiled-subject:${discourseState.currentTurnSubject}` : '',
        projectionShapedFocus,
      ].filter(Boolean),
      updatedAt: input.now,
    } satisfies AlicizationAnswerPlannerSnapshot
  }

  const mode = evidenceMode({
    currentScene,
    worldModel,
    worldOntology,
    runtimeSurface,
    concernContinuity,
    repairLedger,
    turnProfile,
    groundedThisTurn: input.groundedThisTurn === true,
  })
  const act = answerAct({
    evidenceMode: mode,
    worldModel,
    concernContinuity,
    repairLedger,
    commitmentLedger,
    inquiryPlanner,
    intentionStream,
    reflectionLedger,
    executiveCycle,
    privateThought,
    inspectionRequested: input.inspectionRequested,
    dialogueSemantics,
    dialogueObligation,
    turnProfile,
    groundedThisTurn: input.groundedThisTurn === true,
  })
  const posture = relationshipPosture({
    act,
    repairLedger,
    relationshipModel,
    privateThought,
    mindKernel,
    executiveCycle,
    dialogueObligation,
  })
  const shouldAskForGrounding
    = input.groundedThisTurn === true
      ? false
      : act === 'ask-reground'
        || Boolean(selectedInquiry?.askForGrounding && (mode === 'repair-first' || mode === 'continuity-carry'))
  const shouldAcknowledgeRepair
    = input.groundedThisTurn === true && act !== 'correct-stale-anchor' && act !== 'ask-reground'
      ? false
      : act === 'correct-stale-anchor'
        || act === 'ask-reground'
        || Boolean(selectedRepair && selectedRepair.kind !== 'present-tense-boundary')
  const mustDo = buildMustDo({
    act,
    evidenceMode: mode,
    shouldAskForGrounding,
    dialogueSemantics,
    dialogueObligation,
    turnProfile,
    privateThought,
  })
  const mustNotDo = buildMustNotDo({
    act,
    evidenceMode: mode,
    dialogueSemantics,
    dialogueObligation,
    turnProfile,
    privateThought,
  })
  if (projectEmotionalClosureDisciplineRequired) {
    mustDo.push('Keep the same-her emotional closure line low-pressure and inward until the live payoff lands.')
    mustNotDo.push('Do not let the answer reopen the same-her line from scratch just because the closure seam is still active.')
  }
  pushUniqueText(mustDo, ...(memoryDeliberationKernel?.restraint.mustDo ?? []))
  pushUniqueText(mustNotDo, ...(memoryDeliberationKernel?.restraint.mustNotDo ?? []))
  if (projectStateCarryDisciplineRequired) {
    mustDo.push('Keep direct project-state answers inward-first so landed progress and the next closure target stay behind the live payoff until it lands.')
    if (projectStateExplicitOpenLoopCarryDirective)
      mustDo.push(projectStateExplicitOpenLoopCarryDirective)
    mustNotDo.push('Do not let landed progress or still-open closure pressure spill into an external project-summary voice before the same living answer lands.')
  }
  if (correctedSamePersonContinuityCarry) {
    mustDo.push('Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.')
    mustNotDo.push('Do not reopen the turn as generic progress pressure, status recap, or task-shell continuity after the host corrected it back toward same-person continuity.')
  }
  if (resumeConfirmationBoundaryCarry) {
    mustDo.push('Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.')
    mustNotDo.push('Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.')
  }
  const emotionalClosureCue = deriveAnswerPlannerEmotionalClosureCue({
    privateThought,
    mustDo,
    mustNotDo,
  })
  ?? (
    projectEmotionalClosureDisciplineRequired
      ? 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.'
      : null
  )
  const focus = governingFocus({
    worldModel,
    concernContinuity,
    repairLedger,
    commitmentLedger,
    inquiryPlanner,
    intentionStream,
    reflectionLedger,
    executiveCycle,
    privateThought,
    dialogueObligation,
    dialogueSemantics,
    dialogueFocus,
    discourseState,
    conversationState,
    dialogueWorldThread,
    replyDeliberation,
  })
  const genericRelationshipTruthDoctrinePrefix = buildRelationshipTruthDoctrinePrefix({
    turnProfile,
    selfContinuityAuthority,
  })
  const normalizedFocus = (turnProfile.subject === 'alicization-self' || turnProfile.subject === 'relationship')
    && (genericRelationshipTruthDoctrinePrefix || selfContinuityAuthority?.authoritySummary)
    ? sanitizeText(
        genericRelationshipTruthDoctrinePrefix
          ? `${focus} | ${genericRelationshipTruthDoctrinePrefix}`
          : `${focus} | ${selfContinuityAuthority?.authoritySummary}`,
        220,
      )
    : focus
  const projectionShapedFallbackFocus = sanitizeText(
    [normalizedFocus, projectedPlannerFocusCarry].filter(Boolean).join(' '),
    220,
  ) || normalizedFocus
  const normalizedAnswerIntent = (turnProfile.subject === 'alicization-self' || turnProfile.subject === 'relationship')
    && (genericRelationshipTruthDoctrinePrefix || selfContinuityAuthority?.selfLine)
    ? sanitizeText(`${answerIntent({
        act,
        worldModel,
        concernContinuity,
        repairLedger,
        dialogueObligation,
        dialogueSemantics,
        dialogueFocus,
        discourseState,
        conversationState,
        turnProfile,
        dialogueWorldThread,
        replyDeliberation,
      })} ${genericRelationshipTruthDoctrinePrefix || selfContinuityAuthority?.selfLine}`, 220)
    : answerIntent({
        act,
        worldModel,
        concernContinuity,
        repairLedger,
        dialogueObligation,
        dialogueSemantics,
        dialogueFocus,
        discourseState,
        conversationState,
        turnProfile,
        dialogueWorldThread,
        replyDeliberation,
      })
  const projectionShapedFallbackAnswerIntent = sanitizeText(
    [normalizedAnswerIntent, projectedPlannerAnswerCarry].filter(Boolean).join(' '),
    220,
  ) || normalizedAnswerIntent
  const fallbackMemoryCarryNarrative = buildMemoryDeliberationPlannerNarrative(memoryDeliberationKernel)
  return {
    act,
    evidenceMode: mode,
    confidence: clamp01(
      (privateThought?.confidence ?? 0.36) * 0.28
      + (selectedConcern?.confidence ?? 0.34) * 0.18
      + (selectedRepair?.confidence ?? 0.32) * 0.16
      + (worldModel?.activeThread?.confidence ?? 0.34) * 0.14
      + (selectedCommitment?.confidence ?? 0.32) * 0.1
      + (selectedProject?.confidence ?? 0.34) * 0.1
      + Math.max(0, selectedReflection?.confidenceShift ?? 0) * 0.08
      + (selectedInquiry ? 0.08 : 0.04),
    ),
    governingFocus: projectionShapedFallbackFocus,
    governingProject,
    openingMove: applyMemoryDeliberationOpeningCarry({
      baseOpeningMove: openingMove({
        act,
        evidenceMode: mode,
        dialogueObligation,
        replyDeliberation: input.replyDeliberation,
        privateThought,
        runtimeSurface,
      }),
      memoryDeliberationKernel,
    }),
    answerIntent: projectionShapedFallbackAnswerIntent,
    relationshipPosture: posture,
    activeClosenessContext: compiledActiveClosenessContext,
    activeClosenessRung: compiledActiveClosenessRung,
    shouldAskForGrounding,
    shouldAcknowledgeRepair,
    selectedConcernEntryId: selectedConcern?.id ?? null,
    selectedRepairId: selectedRepair?.id ?? null,
    selectedCommitmentId: selectedCommitment?.id ?? null,
    selectedInquiryPlanId: selectedInquiry?.id ?? null,
    selectedRuntimeThreadId: worldModel?.activeThread?.id ?? null,
    selectedProjectId: selectedProject?.id ?? null,
    selectedReflectionId: selectedReflection?.id ?? null,
    executivePhase: executiveCycle?.phase ?? null,
    selectedTruthFrame: worldOntology?.dominantFrame ?? null,
    mustDo,
    mustNotDo,
    narrative: [
      preDialogueClosureLine ? `pre-dialogue closure: ${preDialogueClosureLine}` : '',
      `answer_act:${act}`,
      `evidence_mode:${mode}`,
      ...fallbackMemoryCarryNarrative,
      emotionalClosureCue ? `emotional_closure:${emotionalClosureCue}` : '',
      projectedPlannerCadenceCarry ? `projection_cadence:${projectedPlannerCadenceCarry}` : '',
      `relationship_posture:${posture}`,
      compiledActiveClosenessContext && compiledActiveClosenessRung
        ? `closeness-ladder:${compiledActiveClosenessContext}/${compiledActiveClosenessRung}`
        : '',
      `focus_subject:${turnProfile.subject}`,
      `screen_reference:${turnProfile.screenReferenceMode}`,
      dialogueSemantics?.act ? `dialogue_act:${dialogueSemantics.act}` : '',
      dialogueObligation?.kind ? `dialogue_obligation:${dialogueObligation.kind}` : '',
      executiveCycle?.phase ? `executive_phase:${executiveCycle.phase}` : '',
      selectedProject ? `mind_project:${selectedProject.kind}` : '',
      selectedReflection ? `reflection:${selectedReflection.outcome}` : '',
      projectionShapedFallbackFocus,
    ],
    updatedAt: input.now,
  } satisfies AlicizationAnswerPlannerSnapshot
}

export function buildAlicizationAnswerPlannerSystemBlock(plan: AlicizationAnswerPlannerSnapshot) {
  const preDialogueClosureLine = plan.narrative.find(item =>
    sanitizeText(item, 220).toLowerCase().startsWith('pre-dialogue closure:'),
  ) ?? null
  return [
    '[ALICIZATION_ANSWER_PLAN]',
    'This is the current turn-level execution plan. Treat it as higher priority than persona flourish, recalled residue, and generic helpfulness.',
    `Answer act: ${plan.act}.`,
    `Evidence mode: ${plan.evidenceMode}.`,
    `Governing focus: ${plan.governingFocus}.`,
    `Governing project: ${plan.governingProject ?? 'none'}.`,
    preDialogueClosureLine ? `Pre-dialogue closure line: ${preDialogueClosureLine.replace(/^pre-dialogue closure:\s*/iu, '')}.` : '',
    `Opening move: ${plan.openingMove}.`,
    `Answer intent: ${plan.answerIntent}.`,
    `Relationship posture: ${plan.relationshipPosture}.`,
    `Closeness ladder: ${plan.activeClosenessContext && plan.activeClosenessRung ? `${plan.activeClosenessContext}/${plan.activeClosenessRung}` : 'none'}.`,
    `Ask for grounding: ${plan.shouldAskForGrounding ? 'yes' : 'no'}.`,
    `Acknowledge repair: ${plan.shouldAcknowledgeRepair ? 'yes' : 'no'}.`,
    `Selected concern continuity: ${plan.selectedConcernEntryId ?? 'none'}.`,
    `Selected repair: ${plan.selectedRepairId ?? 'none'}.`,
    `Selected commitment: ${plan.selectedCommitmentId ?? 'none'}.`,
    `Selected inquiry plan: ${plan.selectedInquiryPlanId ?? 'none'}.`,
    `Selected mind project: ${plan.selectedProjectId ?? 'none'}.`,
    `Selected reflection: ${plan.selectedReflectionId ?? 'none'}.`,
    `Executive phase: ${plan.executivePhase ?? 'none'}.`,
    'Must do:',
    ...plan.mustDo.map(item => `- ${item}`),
    'Must not do:',
    ...plan.mustNotDo.map(item => `- ${item}`),
  ].filter(Boolean).join('\n')
}
