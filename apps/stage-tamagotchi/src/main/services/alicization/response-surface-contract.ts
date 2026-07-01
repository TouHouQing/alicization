import type { AlicizationNormalVisibleReplyAuthority } from '@proj-alicization/stage-shared'

import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDialogueActKernelSnapshot,
  AlicizationDialogueTurnEncounterSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueFocusGovernance } from './dialogue-focus-governor'
import type { AlicizationDialogueObligation, AlicizationPersonaKernelMode } from './dialogue-obligation'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationExecutiveAnswerBrief } from './executive-answer-brief'
import type { AlicizationMainChatExecutionReplyObligation } from './main-chat-execution-reply-obligation'
import type { AlicizationResponseCharter } from './response-charter'
import type { OrganicMemoryPromptContext } from './runtime-soul'
import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

import {
  deriveAlicizationMemoryClosureDiscipline,
  normalizeAlicizationNormalVisibleReplyAuthority,
  readKnowledgeEvidenceFromDerivedMindStateBundle,
  readLearningExecutionStateFromDerivedMindStateBundle,
  readMemoryDeliberationFromDerivedMindStateBundle,
  readPersonStateProjectionFromDerivedMindStateBundle,
  resolveAlicizationProjectPreDialogueAwarenessLine,
} from '@proj-alicization/stage-shared'

import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
import { buildAlicizationDigitalLifeArchitecture } from './digital-life-architecture'
import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'
import {
  buildMemoryLatentBoundaryTag,
  buildMemoryOpeningStrategyTag,
} from './memory-deliberation-latent-controls'
import { resolvePreferredPersonStateProjection } from './person-state-projection-resolution'
import {
  alicizationProjectStateSameHerContinuityReminder,
  alicizationProjectStateVisibleReplySameHerReminder,
} from './project-state-answer-governance'
import {
  resolveAlicizationProjectStateBrief,
} from './project-state-brief'
import { deriveRecollectionSurfaceControls } from './recollection-surface-controls'
import { buildAlicizationResponseSurfaceDigitalLifeRules } from './response-surface-digital-life-rules'
import { buildAlicizationResponseSurfaceLearningRules } from './response-surface-learning-rules'
import { buildAlicizationResponseSurfaceMemoryClosureRules } from './response-surface-memory-closure-rules'
import { buildAlicizationResponseSurfaceRelationshipRules } from './response-surface-relationship-rules'
import { appendAlicizationResponseSurfaceRules } from './response-surface-rules'
import { buildAlicizationResponseSurfaceTruthDialogueRules } from './response-surface-truth-dialogue-rules'
import { deriveAlicizationTruthDiscipline } from './truth-discipline'

export interface AlicizationResponseSurfaceContract {
  openingStyle: 'direct-observation' | 'direct-correction' | 'direct-answer' | 'gentle-care' | 'light-accompaniment'
  replyRealizationMode?: 'provider-mind-required' | 'fallback-locally-allowed'
  expectedVisibleReplyAuthority?: AlicizationNormalVisibleReplyAuthority
  activeClosenessContext?: string | null
  activeClosenessRung?: string | null
  maxParagraphs: number
  maxSentences: number
  personaKernelMode: AlicizationPersonaKernelMode
  allowAffectionatePreface: boolean
  allowStageDirections: boolean
  allowBodyNarration: boolean
  labelCarryAsMemory: boolean
  suppressAssociativeRecall: boolean
  recollectionLatentControls?: string[] | null
  activeSelfRevisionPatchId?: string | null
  projectContinuity?: {
    currentPhase?: string | null
    latestProgress?: string | null
    primaryOpenLoop?: string | null
    proactiveSameHerGap?: string | null
    nextClosureTarget?: string | null
    preDialogueAwarenessLine?: string | null
    sameHerSelfLine?: string | null
    sameHerDriftRisk?: string | null
    emotionalClosureCue?: string | null
    sameHerLineRequired: boolean
  } | null
  mustDo: string[]
  mustNotDo: string[]
}

export function buildRecollectionSpeechVisibleSurfaceRules(
  plan: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null | undefined,
) {
  const speechPlan = plan ?? null
  if (!speechPlan) {
    return {
      mustDo: [] as string[],
      mustNotDo: [] as string[],
      latentControls: [] as string[],
    }
  }

  const mustDo: string[] = []
  const mustNotDo: string[] = []
  const controls = deriveRecollectionSurfaceControls(speechPlan)
  if (!controls)
    return { mustDo, mustNotDo, latentControls: [] as string[] }

  const latentControls = [
    `recollection_surface_permission=${!controls.shouldSurface || controls.visibility === 'internal-only' ? 'inward-only' : controls.visibility === 'embedded-payoff' ? 'soft-surface' : 'explicit-surface'}`,
    `recollection_visibility=${controls.visibility}`,
    `recollection_continuity_role=${controls.continuityRole}`,
    `recollection_certainty_floor=${controls.certainty}`,
    `recollection_payoff_order=${controls.visibility === 'brief-before-payoff' ? 'memory-before-payoff' : 'payoff-first'}`,
    `recollection_template_boundary=${controls.templateBoundary}`,
    `recollection_label_uncertainty=${controls.certainty === 'firm' ? 'no' : 'yes'}`,
    `recollection_frame_prior_procedure=${controls.continuityRole === 'procedure-carry' ? 'yes' : 'no'}`,
    `recollection_avoid_archive_dump=yes`,
    `recollection_avoid_date_recital=yes`,
    `recollection_avoid_execution_impersonation=${controls.continuityRole === 'procedure-carry' ? 'yes' : 'no'}`,
    buildMemoryOpeningStrategyTag({
      memoryPressure: 'medium',
      certaintyPosture: controls.certainty,
      certaintyFloor: controls.certainty,
      relationshipVector: controls.continuityRole === 'procedure-carry'
        ? 'procedural'
        : controls.continuityRole === 'relationship-carry'
          ? 'relational'
          : controls.continuityRole === 'period-carry'
            ? 'threaded'
            : 'neutral',
      procedureCarryStrength: controls.continuityRole === 'procedure-carry' ? 0.72 : 0,
      conflictBurden: controls.certainty === 'fragmentary' ? 'high' : controls.certainty === 'approximate' ? 'medium' : 'none',
      dominantProvenance: 'remembered',
      provenancePosture: 'remembered-memory',
      detailAssertionBudget: controls.certainty === 'firm' ? 'open' : controls.certainty === 'approximate' ? 'guarded' : 'minimal',
      surfacePermission: !controls.shouldSurface || controls.visibility === 'internal-only' ? 'inward-only' : controls.visibility === 'embedded-payoff' ? 'soft-surface' : 'explicit-surface',
      retrospectiveDepth: controls.continuityRole === 'period-carry' ? 'period' : controls.continuityRole === 'memory-carry' ? 'fragment' : 'thread',
      openingStrategy: !controls.shouldSurface || controls.visibility === 'internal-only'
        ? 'payoff-first-inward-carry'
        : controls.continuityRole === 'procedure-carry'
          ? 'brief-procedure-carry'
          : controls.continuityRole === 'relationship-carry'
            ? 'brief-relationship-carry'
            : 'embedded-memory-carry',
      answerStrategy: controls.continuityRole === 'procedure-carry'
        ? 'procedure-anchor'
        : controls.continuityRole === 'relationship-carry'
          ? 'relationship-anchor'
          : controls.continuityRole === 'period-carry'
            ? 'period-anchor'
            : 'stance-first',
      visibilityDiscipline: !controls.shouldSurface || controls.visibility === 'internal-only'
        ? 'internal-influence-only'
        : controls.visibility === 'embedded-payoff'
          ? 'embedded-visible-memory'
          : 'brief-visible-memory',
      labelUncertainty: controls.certainty !== 'firm',
      frameAsPriorProcedure: controls.continuityRole === 'procedure-carry',
      avoidArchiveDump: true,
      avoidDateRecital: true,
      avoidExecutionImpersonation: controls.continuityRole === 'procedure-carry',
      stableCore: [],
      unsafeDetails: [],
    }),
    buildMemoryLatentBoundaryTag({
      memoryPressure: 'medium',
      certaintyPosture: controls.certainty,
      certaintyFloor: controls.certainty,
      relationshipVector: controls.continuityRole === 'procedure-carry'
        ? 'procedural'
        : controls.continuityRole === 'relationship-carry'
          ? 'relational'
          : controls.continuityRole === 'period-carry'
            ? 'threaded'
            : 'neutral',
      procedureCarryStrength: controls.continuityRole === 'procedure-carry' ? 0.72 : 0,
      conflictBurden: controls.certainty === 'fragmentary' ? 'high' : controls.certainty === 'approximate' ? 'medium' : 'none',
      dominantProvenance: 'remembered',
      provenancePosture: 'remembered-memory',
      detailAssertionBudget: controls.certainty === 'firm' ? 'open' : controls.certainty === 'approximate' ? 'guarded' : 'minimal',
      surfacePermission: !controls.shouldSurface || controls.visibility === 'internal-only' ? 'inward-only' : controls.visibility === 'embedded-payoff' ? 'soft-surface' : 'explicit-surface',
      retrospectiveDepth: controls.continuityRole === 'period-carry' ? 'period' : controls.continuityRole === 'memory-carry' ? 'fragment' : 'thread',
      openingStrategy: !controls.shouldSurface || controls.visibility === 'internal-only'
        ? 'payoff-first-inward-carry'
        : controls.continuityRole === 'procedure-carry'
          ? 'brief-procedure-carry'
          : controls.continuityRole === 'relationship-carry'
            ? 'brief-relationship-carry'
            : 'embedded-memory-carry',
      answerStrategy: controls.continuityRole === 'procedure-carry'
        ? 'procedure-anchor'
        : controls.continuityRole === 'relationship-carry'
          ? 'relationship-anchor'
          : controls.continuityRole === 'period-carry'
            ? 'period-anchor'
            : 'stance-first',
      visibilityDiscipline: !controls.shouldSurface || controls.visibility === 'internal-only'
        ? 'internal-influence-only'
        : controls.visibility === 'embedded-payoff'
          ? 'embedded-visible-memory'
          : 'brief-visible-memory',
      labelUncertainty: controls.certainty !== 'firm',
      frameAsPriorProcedure: controls.continuityRole === 'procedure-carry',
      avoidArchiveDump: true,
      avoidDateRecital: true,
      avoidExecutionImpersonation: controls.continuityRole === 'procedure-carry',
      stableCore: [],
      unsafeDetails: [],
    }),
  ]

  pushUnique(mustNotDo, 'Do not reuse drafted recollection wording, drafted memory contours, or internal recollection leads verbatim.')
  pushUnique(mustNotDo, 'Do not turn recollection into a standalone archive dump or date-recital.')
  if (controls.certainty === 'approximate' || controls.certainty === 'fragmentary') {
    pushUnique(mustDo, 'Keep the visible recollection approximate and uncertainty-aware instead of claiming exactness.')
    pushUnique(mustNotDo, 'Do not present fragmentary or approximate recollection as exact remembered wording.')
  }
  if (!controls.shouldSurface || controls.visibility === 'internal-only') {
    pushUnique(mustDo, 'Let active recollection stay as inner carry unless surfacing it materially helps the current payoff.')
    pushUnique(mustDo, 'If memory stays internal, let it bend stance, choice of detail, or tone rather than announcing the memory itself.')
    pushUnique(mustNotDo, 'Do not dump recalled memory into the visible reply just because it became mentally active.')
  }
  if (controls.continuityRole === 'procedure-carry') {
    pushUnique(mustDo, 'If same-seam procedure carry becomes visible, frame it as remembered prior procedure that keeps the current thread intact.')
    pushUnique(mustNotDo, 'Do not turn same-seam procedure carry into retrospective narration or execution impersonation.')
    pushUnique(mustNotDo, 'Do not let remembered procedure impersonate fresh execution completion.')
  }

  return {
    mustDo,
    mustNotDo,
    latentControls,
  }
}

function buildResolvedRecollectionSpeechPlan(input: {
  plan: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null | undefined
  memoryDeliberationKernel: ReturnType<typeof buildAlicizationMemoryDeliberationKernel> | null
}) {
  const speechPlan = input.plan ?? null
  const memoryDeliberationKernel = input.memoryDeliberationKernel ?? null
  if (!speechPlan)
    return null
  if (!memoryDeliberationKernel)
    return speechPlan
  if (
    memoryDeliberationKernel.surfacePolicy === speechPlan.surfaceMode
    || memoryDeliberationKernel.surfacePolicy === 'internal-only'
  ) {
    return speechPlan
  }
  return {
    ...speechPlan,
    surfaceMode: memoryDeliberationKernel.surfacePolicy,
  } satisfies NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']>
}

function pushUnique(target: string[], value: string) {
  const normalized = value.trim()
  if (!normalized)
    return
  if (target.includes(normalized))
    return
  target.push(normalized)
}

function executionCallbackDoctrineCue(currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  const tags = currentConsciousFrame?.reasonTags ?? []
  if (tags.includes('execution-callback-doctrine:lower-pressure'))
    return 'lower-pressure' as const
  if (tags.includes('execution-callback-doctrine:trust-warming'))
    return 'trust-warming' as const
  if (tags.includes('execution-callback-doctrine:execution-callback'))
    return 'execution-callback' as const
  return null
}

function continuityArcCue(currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  const tags = currentConsciousFrame?.reasonTags ?? []
  if (tags.includes('continuity-arc:hold-for-opening'))
    return 'hold-for-opening' as const
  if (tags.includes('continuity-arc:gentle-reopen'))
    return 'gentle-reopen' as const
  if (tags.includes('continuity-arc:same-thread-continuation'))
    return 'same-thread-continuation' as const
  return null
}

function continuityPreferredTimingCue(currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  const tags = currentConsciousFrame?.reasonTags ?? []
  if (tags.includes('continuity-timing:next-open-window'))
    return 'next-open-window' as const
  if (tags.includes('continuity-timing:after-payoff'))
    return 'after-payoff' as const
  if (tags.includes('continuity-timing:same-turn-if-invited'))
    return 'same-turn-if-invited' as const
  const timing = String(currentConsciousFrame?.projectState?.continuityPreferredTiming ?? '').trim().toLowerCase()
  if (timing === 'next-open-window')
    return 'next-open-window' as const
  if (timing === 'after-payoff')
    return 'after-payoff' as const
  if (timing === 'same-turn-if-invited')
    return 'same-turn-if-invited' as const
  return null
}

function hasRepairBeforeClosenessSameThreadCarry(currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  const emotionalClosureCue = (normalizeProjectContinuityField(
    (currentConsciousFrame?.projectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
  ) ?? '').toLowerCase()
  const emotionalClosureSummary = (normalizeProjectContinuityField(
    (currentConsciousFrame?.projectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
  ) ?? '').toLowerCase()
  const sameHerHoldDetail = (normalizeProjectContinuityField(
    (currentConsciousFrame?.projectState as { sameHerHoldDetail?: unknown } | null)?.sameHerHoldDetail,
  ) ?? '').toLowerCase()
  const primaryOpenLoop = (normalizeProjectContinuityField(currentConsciousFrame?.projectState?.primaryOpenLoop) ?? '').toLowerCase()
  const nextClosureTarget = (normalizeProjectContinuityField(currentConsciousFrame?.projectState?.nextClosureTarget) ?? '').toLowerCase()
  const consciousNeed = (normalizeProjectContinuityField(currentConsciousFrame?.consciousNeed) ?? '').toLowerCase()
  const consciousTension = (normalizeProjectContinuityField(currentConsciousFrame?.consciousTension) ?? '').toLowerCase()
  const speakingIntention = (normalizeProjectContinuityField(currentConsciousFrame?.speakingIntention) ?? '').toLowerCase()
  const combined = [
    emotionalClosureCue,
    emotionalClosureSummary,
    sameHerHoldDetail,
    primaryOpenLoop,
    nextClosureTarget,
    consciousNeed,
    consciousTension,
    speakingIntention,
  ]
    .filter(Boolean)
    .join(' ')

  const carriesRepairBeforeCloseness = /repair-before-closeness|repair before closeness|repair-first|let repair settle|先修复再靠近|修复优先/u.test(combined)
  const carriesSameThreadReturn = /same callback|same thread|same living line|callback repair line|same repair line|同一条线|修补线/u.test(combined)
  const carriesRoomGivingRestraint = /leave room|room-giving|before widening closeness|before warmth widens|不要突然放宽|留一点空间|留空间/u.test(combined)

  return carriesRepairBeforeCloseness && carriesSameThreadReturn && carriesRoomGivingRestraint
}

function hasRestProtectiveSameThreadCarry(currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  const emotionalClosureCue = (normalizeProjectContinuityField(
    (currentConsciousFrame?.projectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
  ) ?? '').toLowerCase()
  const emotionalClosureSummary = (normalizeProjectContinuityField(
    (currentConsciousFrame?.projectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
  ) ?? '').toLowerCase()
  const sameHerHoldDetail = (normalizeProjectContinuityField(
    (currentConsciousFrame?.projectState as { sameHerHoldDetail?: unknown } | null)?.sameHerHoldDetail,
  ) ?? '').toLowerCase()
  const primaryOpenLoop = (normalizeProjectContinuityField(currentConsciousFrame?.projectState?.primaryOpenLoop) ?? '').toLowerCase()
  const nextClosureTarget = (normalizeProjectContinuityField(currentConsciousFrame?.projectState?.nextClosureTarget) ?? '').toLowerCase()
  const consciousNeed = (normalizeProjectContinuityField(currentConsciousFrame?.consciousNeed) ?? '').toLowerCase()
  const consciousTension = (normalizeProjectContinuityField(currentConsciousFrame?.consciousTension) ?? '').toLowerCase()
  const speakingIntention = (normalizeProjectContinuityField(currentConsciousFrame?.speakingIntention) ?? '').toLowerCase()
  const reasonTags = (currentConsciousFrame?.reasonTags ?? []).join(' ').toLowerCase()
  const combined = [
    emotionalClosureCue,
    emotionalClosureSummary,
    sameHerHoldDetail,
    primaryOpenLoop,
    nextClosureTarget,
    consciousNeed,
    consciousTension,
    speakingIntention,
    reasonTags,
  ]
    .filter(Boolean)
    .join(' ')

  const carriesRestProtection = /rest-protective|rest protective|fatigue-aware|late-night-drain|protective-watch|rest-first|rest line/u.test(combined)
  const carriesSameThreadReturn = /same callback|same thread|same living line|callback line|same line|同一条线/u.test(combined)
  const carriesRoomGivingRestraint = /leave room|room-giving|before widening closeness|before warmth widens|留一点空间|留空间/u.test(combined)

  return carriesRestProtection && carriesSameThreadReturn && carriesRoomGivingRestraint
}

function hasCrossModalSameHerProjectContinuityCue(input: {
  projectContinuity?: AlicizationResponseSurfaceContract['projectContinuity'] | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
}) {
  const projectContinuity = input.projectContinuity ?? null
  const emotionalClosureCue = (normalizeProjectContinuityField(projectContinuity?.emotionalClosureCue) ?? '').toLowerCase()
  const emotionalClosureSummary = (normalizeProjectContinuityField((projectContinuity as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary) ?? '').toLowerCase()
  const sameHerHoldDetail = (normalizeProjectContinuityField((projectContinuity as { sameHerHoldDetail?: unknown } | null)?.sameHerHoldDetail) ?? '').toLowerCase()
  const primaryOpenLoop = (normalizeProjectContinuityField(projectContinuity?.primaryOpenLoop) ?? '').toLowerCase()
  const nextClosureTarget = (normalizeProjectContinuityField(projectContinuity?.nextClosureTarget) ?? '').toLowerCase()
  const preDialogueAwarenessLine = (normalizeProjectContinuityField(projectContinuity?.preDialogueAwarenessLine) ?? '').toLowerCase()
  const sameHerSelfLine = (normalizeProjectContinuityField(projectContinuity?.sameHerSelfLine) ?? '').toLowerCase()
  const consciousNeed = (normalizeProjectContinuityField(input.currentConsciousFrame?.consciousNeed) ?? '').toLowerCase()
  const speakingIntention = (normalizeProjectContinuityField(input.currentConsciousFrame?.speakingIntention) ?? '').toLowerCase()
  const combined = [
    emotionalClosureCue,
    emotionalClosureSummary,
    sameHerHoldDetail,
    primaryOpenLoop,
    nextClosureTarget,
    preDialogueAwarenessLine,
    sameHerSelfLine,
    consciousNeed,
    speakingIntention,
  ].join(' ')
  return (
    /cross-modal|same-her proof|same living her|same digital life/u.test(combined)
    && /visible reply|voice|facial state|face|motion|lipsync|resident presence|embodiment|closure/u.test(combined)
  )
}

function deriveProjectSurfaceClosureRule(input: {
  governingProject?: string | null
  projectPreflightSummary?: string | null
}) {
  const governingProject = String(input.governingProject ?? '').trim()
  const projectPreflightSummary = String(input.projectPreflightSummary ?? '').trim()
  const text = governingProject || projectPreflightSummary
  if (!text)
    return []
  const lower = text.toLowerCase()
  if (!/phase 1|digital-life|digital life|closure|open loop|next closure target/u.test(lower))
    return []
  const rules = [
    asSurfaceSentence(
      'Keep the visible reply anchored to the active digital-life closure seam: ',
      text.slice(0, 180),
    ),
  ]
  if (/same-her|same her|same living thread|one same her/u.test(lower)) {
    rules.push(alicizationProjectStateSameHerContinuityReminder)
    rules.push(alicizationProjectStateVisibleReplySameHerReminder.replace('questions', 'status'))
  }
  return rules.filter(Boolean)
}

function resolveAffectionatePrefaceAllowance(input: {
  personaKernelMode: AlicizationPersonaKernelMode
  briefTurnMode: AlicizationExecutiveAnswerBrief['turnMode']
  relationshipPosture: AlicizationResponseCharter['relationshipPosture']
  activeClosenessRung?: string | null
}) {
  if (input.personaKernelMode !== 'full')
    return false
  if (!input.activeClosenessRung)
    return input.briefTurnMode === 'care' && input.relationshipPosture !== 'restrained'
  if (input.activeClosenessRung === 'close-hold')
    return input.briefTurnMode === 'care' || input.briefTurnMode === 'accompany'
  if (input.activeClosenessRung === 'warm-near')
    return input.briefTurnMode === 'care'
  return false
}

function asSurfaceSentence(prefix: string, value: string) {
  const text = value.trim()
  if (!text)
    return ''
  return `${prefix}${/[.!?。！？]$/u.test(text) ? text : `${text}.`}`
}

function normalizeProjectContinuityField(value: unknown) {
  const text = String(value ?? '').trim()
  return text || null
}

function pickProjectContinuityField(...values: unknown[]) {
  for (const value of values) {
    const normalized = normalizeProjectContinuityField(value)
    if (normalized)
      return normalized
  }
  return null
}

function preferProjectContinuityAuditText(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = normalizeProjectContinuityField(input.current)
  const candidate = normalizeProjectContinuityField(input.candidate)

  if (!current)
    return candidate
  if (!candidate)
    return current
  if (current === candidate)
    return current

  return preferStrongerContinuityClosureAuthority(current, candidate)
    || current
}

function stripProjectContinuityPrefix(value: string, pattern: RegExp) {
  const normalized = normalizeProjectContinuityField(value)
  if (!normalized || !pattern.test(normalized))
    return null
  return normalized.replace(pattern, '').trim() || null
}

function looksLikeSameHerProjectContinuityLine(value: unknown) {
  const normalized = (normalizeProjectContinuityField(value) ?? '').toLowerCase()
  if (!normalized)
    return false

  const carriesSameHer = /same phase 1 digital life|same living line|same her|same-her|one continuous her|one same her|one living her|current thread continuity/u.test(normalized)
  const carriesClosureContext = /callback|returned result|execution|project|closure|phase 1|open closure|next closure|generic callback shell|detached utility notice/u.test(normalized)

  return carriesSameHer && carriesClosureContext
}

function readProjectContinuityFromAnswerCompiler(answerCompiler?: AlicizationAnswerCompilerSnapshot | null) {
  const supportingReality = Array.isArray(answerCompiler?.supportingReality) ? answerCompiler.supportingReality : []
  let preDialogueAwarenessLine: string | null = null
  let currentPhase: string | null = null
  let latestLandedProgress: string | null = null
  let primaryOpenLoop: string | null = null
  let proactiveSameHerGap: string | null = null
  let nextClosureTarget: string | null = null

  for (const item of supportingReality) {
    const normalized = normalizeProjectContinuityField(item)
    if (!normalized)
      continue
    preDialogueAwarenessLine ||= stripProjectContinuityPrefix(normalized, /^pre-dialogue project awareness:\s*/i)
    currentPhase ||= stripProjectContinuityPrefix(normalized, /^current phase:\s*/i)
    latestLandedProgress ||= stripProjectContinuityPrefix(normalized, /^project progress:\s*/i)
    primaryOpenLoop ||= stripProjectContinuityPrefix(normalized, /^phase-one open loop:\s*/i)
    proactiveSameHerGap ||= stripProjectContinuityPrefix(normalized, /^proactive same-her gap:\s*/i)
    nextClosureTarget ||= stripProjectContinuityPrefix(normalized, /^next closure target:\s*/i)
  }

  const sameHerSelfLine = looksLikeSameHerProjectContinuityLine(answerCompiler?.openingClaim)
    ? normalizeProjectContinuityField(answerCompiler?.openingClaim)
    : null
  const sameHerDriftRisk = (answerCompiler?.mustNotDo ?? [])
    .map(item => normalizeProjectContinuityField(item))
    .find(item =>
      Boolean(item)
      && /generic assistant shell|generic task shell|detached project narration|project-summary voice|generic callback shell|detached utility notice/u.test(String(item))
      && /same-her|same her|same living line|current thread continuity|one continuous her/u.test(String(item).toLowerCase()),
    ) ?? null

  return {
    preDialogueAwarenessLine,
    currentPhase,
    latestLandedProgress,
    primaryOpenLoop,
    proactiveSameHerGap,
    nextClosureTarget,
    sameHerSelfLine,
    sameHerDriftRisk,
  }
}

function isThinProjectAwarenessShell(value: unknown) {
  const text = String(value ?? '').trim().toLowerCase()
  if (!text)
    return false

  return /keep this same digital life project in view|detached project shell|generic project shell/u.test(text)
    || text === 'same digital life | keep the closure seam explicit'
}

function scoreProjectContinuitySameHerLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return 0

  let score = normalized.length >= 140 ? 2 : normalized.length >= 80 ? 1 : 0
  if (/same phase 1 digital life|same living line|same her|same-her|one continuous her|one same her|one living her/u.test(normalized))
    score += 4
  if (/callback|initiative|embodiment|resident presence|voice|face|motion|lipsync|closure|repair-before-closeness|measured-return/u.test(normalized))
    score += 2
  if (/keep this same digital life project in view|generic reminder|generic guidance/u.test(normalized))
    score -= 2
  return score
}

function hasRicherProjectContinuityClosureCarry(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  const carriesSameHer = /same phase 1 digital life|same living line|same her|same-her|one continuous her|one same her|one living her/u.test(normalized)
  const carriesClosureContext = /callback|initiative|embodiment|resident presence|voice|face|motion|lipsync|open closure|next closure|generic callback shell|repair-before-closeness|measured-return/u.test(normalized)
  return carriesSameHer && carriesClosureContext
}

function carriesProjectIdentityAwareness(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return /alicization is (?:still the same )?local-first digital life project|same local-first digital life project|local-first digital life project building one continuous "her"/u.test(normalized)
}

function carriesProjectClosureBriefing(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return /local-first digital life project|phase 1|returned project-state carry|what has already landed|still-open closure|open closure|next closure|closure seam|landed progress|project identity/u.test(normalized)
}

function looksLikeEmbodimentClosureHeadline(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return /holding together mainly through|living audio thread is still intact|face and motion need to rejoin|full cross-modal closure settles|voice, face, and motion|body, lipsync, and voice/u.test(normalized)
}

function looksLikeProjectClosureReanchorSummary(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  const carriesProjectIdentity
    = normalized.includes('alicization is a local-first digital life project')
      || normalized.includes('local-first digital life project building one continuous "her"')
  const carriesPhase = normalized.includes('phase 1')
  const carriesClosureReanchor
    = normalized.includes('what has already landed')
      || normalized.includes('still-open closure')
      || normalized.includes('unfinished closure')
      || normalized.includes('same living line')
      || normalized.includes('same-her proof')
      || normalized.includes('same-her closure')

  return carriesProjectIdentity && carriesPhase && carriesClosureReanchor
}

function looksLikeProjectContinuityHoldDetail(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return normalized.startsWith('continuity hold:')
    || normalized.startsWith('generic project continuity hold')
}

function resolveProjectSurfacePreDialogueAwarenessLine(input: {
  candidate: string | null
  fallback: string | null
  sameHerSelfLineCandidates: Array<string | null | undefined>
  companionBriefingLineCandidate?: string | null
  companionHeadlineLineCandidate?: string | null
}) {
  const candidate = normalizeProjectContinuityField(input.candidate)
  const fallback = normalizeProjectContinuityField(input.fallback)
  const companionBriefingLineCandidate = normalizeProjectContinuityField(input.companionBriefingLineCandidate)
  const companionHeadlineLineCandidate = normalizeProjectContinuityField(input.companionHeadlineLineCandidate)
  if (!candidate) {
    return companionBriefingLineCandidate && carriesProjectClosureBriefing(companionBriefingLineCandidate)
      ? companionBriefingLineCandidate
      : fallback
  }

  const candidateLower = candidate.toLowerCase()
  const duplicatesFallback
    = Boolean(fallback)
      && fallback!.toLowerCase() === candidateLower
  const duplicatesSameHerSelfLine = input.sameHerSelfLineCandidates
    .map(value => normalizeProjectContinuityField(value)?.toLowerCase() ?? '')
    .some(value => value && value === candidateLower)
  const duplicatesCompanionHeadline
    = Boolean(companionHeadlineLineCandidate)
      && companionHeadlineLineCandidate!.toLowerCase() === candidateLower
  const candidateIsClosureReanchorSummary = looksLikeProjectClosureReanchorSummary(candidate)

  if (
    companionBriefingLineCandidate
    && carriesProjectClosureBriefing(companionBriefingLineCandidate)
    && (candidateIsClosureReanchorSummary || duplicatesFallback)
  ) {
    return companionBriefingLineCandidate
  }

  if (
    companionHeadlineLineCandidate
    && hasRicherProjectContinuityClosureCarry(companionHeadlineLineCandidate)
    && (candidateIsClosureReanchorSummary || duplicatesFallback)
  ) {
    return companionHeadlineLineCandidate
  }

  if (
    companionBriefingLineCandidate
    && carriesProjectClosureBriefing(companionBriefingLineCandidate)
    && (
      (looksLikeEmbodimentClosureHeadline(candidate) && !carriesProjectClosureBriefing(candidate))
      || duplicatesCompanionHeadline
    )
  ) {
    return companionBriefingLineCandidate
  }

  if (
    fallback
    && carriesProjectIdentityAwareness(fallback)
    && (duplicatesSameHerSelfLine || isThinProjectAwarenessShell(candidate) || looksLikeProjectContinuityHoldDetail(candidate))
  ) {
    return fallback
  }

  if (carriesProjectIdentityAwareness(candidate))
    return candidate

  return candidate
}

function uniqueProjectContinuityList(values: Array<string | null | undefined>, maxItems = 4) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeProjectContinuityField(value)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

interface AlicizationDialogueEncounterSurface extends Pick<
  AlicizationDialogueTurnEncounterSnapshot,
  'subject' | 'screenReferenceMode'
> {}

export function buildAlicizationResponseSurfaceContract(input: {
  brief: AlicizationExecutiveAnswerBrief
  charter: AlicizationResponseCharter
  dialogueActKernel?: AlicizationDialogueActKernelSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  claimEvidenceLedger?: AlicizationClaimEvidenceLedgerSnapshot | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  executionReplyObligation?: AlicizationMainChatExecutionReplyObligation | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  recollectionSpeechPlan?: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null
  selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null
}) {
  const runtimeSurface = input.runtimeSurface ?? null
  const digitalLifeArchitecture = buildAlicizationDigitalLifeArchitecture(runtimeSurface)
  const dialogueEncounter = input.dialogueEncounter ?? null
  const dialogueEncounterSurface: AlicizationDialogueEncounterSurface | null = runtimeSurface?.dialogue.dialogueEncounter ?? dialogueEncounter ?? null
  const dialogueSemantics = dialogueEncounter?.semantics ?? input.dialogueSemantics ?? null
  const dialogueObligation = dialogueEncounter?.obligation ?? input.dialogueObligation ?? null
  const dialogueFocus = dialogueEncounter?.focus ?? input.dialogueFocus ?? null
  const dialogueActKernel = runtimeSurface?.dialogue.dialogueActKernel ?? input.dialogueActKernel ?? null
  const answerCompiler = runtimeSurface?.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const claimEvidenceLedger = runtimeSurface?.dialogue.claimEvidenceLedger ?? input.claimEvidenceLedger ?? null
  const currentConsciousFrame = runtimeSurface?.dialogue.currentConsciousFrame ?? input.currentConsciousFrame ?? null
  const derivedBundle = runtimeSurface?.memory.derivedMindStateBundle ?? null
  const personStateProjection = resolvePreferredPersonStateProjection({
    bundleProjection: readPersonStateProjectionFromDerivedMindStateBundle<any>(derivedBundle),
    runtimeProjection: runtimeSurface?.memory.personStateProjection ?? null,
  }) ?? null
  const learningExecutionState = readLearningExecutionStateFromDerivedMindStateBundle(derivedBundle)
    ?? runtimeSurface?.memory.learningExecutionState
    ?? null
  const recollectionSpeechPlan = input.recollectionSpeechPlan
    ?? runtimeSurface?.memory.recollectionSpeechPlan
    ?? null
  const memoryResolutionLedger = runtimeSurface?.memory.memoryResolutionLedger ?? null
  const memoryClosureDiscipline = deriveAlicizationMemoryClosureDiscipline(memoryResolutionLedger)
  const memoryDeliberationKernel = buildAlicizationMemoryDeliberationKernel({
    deliberation: readMemoryDeliberationFromDerivedMindStateBundle<any>(derivedBundle)
      ?? runtimeSurface?.memory.memoryDeliberation
      ?? null,
    speech: recollectionSpeechPlan,
    recollectionIntent: (derivedBundle?.recollectionIntent as OrganicMemoryPromptContext['recollectionIntent']) ?? null,
    knowledgeEvidence: readKnowledgeEvidenceFromDerivedMindStateBundle(derivedBundle)
      ?? runtimeSurface?.memory.knowledgeEvidence
      ?? null,
    hostPersonModel: (derivedBundle?.hostPersonModel as OrganicMemoryPromptContext['hostPersonModel']) ?? runtimeSurface?.memory.hostPersonModel ?? null,
  })
  const resolvedRecollectionSpeechPlan = buildResolvedRecollectionSpeechPlan({
    plan: recollectionSpeechPlan,
    memoryDeliberationKernel,
  })
  const selfRevisionPatch = input.selfRevisionPatch ?? null
  const { brief, charter } = input
  const truthDiscipline = deriveAlicizationTruthDiscipline({
    answerSubject: dialogueEncounterSurface?.subject ?? dialogueFocus?.subject ?? answerCompiler?.answerSubject ?? null,
    screenReferenceMode: dialogueEncounterSurface?.screenReferenceMode ?? dialogueFocus?.screenReferenceMode ?? answerCompiler?.screenReferenceMode ?? null,
    truthState: brief.truthState,
    turnMode: answerCompiler?.turnMode ?? brief.turnMode,
    repairState: brief.turnMode === 'screen-repair' ? 'stale-anchor' : 'none',
    evidenceMode: answerCompiler?.evidenceMode ?? claimEvidenceLedger?.evidenceMode ?? null,
    labelCarryAsMemory: (answerCompiler?.labelCarryAsMemory ?? brief.separateCarryFromSurface) || brief.truthState === 'remembered',
    suppressAssociativeRecall: answerCompiler?.suppressAssociativeRecall ?? false,
    claimEvidenceLedger,
    currentConsciousFrame,
    memoryRestraint: memoryDeliberationKernel?.restraint ?? null,
  })

  const openingStyle = input.executionReplyObligation
    ? 'direct-answer' as const
    : answerCompiler?.openingStyle ?? (() => {
      if (brief.turnMode === 'grounded-inspection')
        return 'direct-observation' as const
      if (brief.turnMode === 'screen-repair')
        return 'direct-correction' as const
      if (brief.turnMode === 'care')
        return 'gentle-care' as const
      if (brief.turnMode === 'accompany')
        return 'light-accompaniment' as const
      return 'direct-answer' as const
    })()

  const personaKernelMode: AlicizationPersonaKernelMode = answerCompiler?.personaKernelMode
    ?? dialogueObligation?.personaKernelMode
    ?? (brief.turnMode === 'screen-repair'
      ? 'muted'
      : brief.turnMode === 'guide-current-knot'
        ? 'backgrounded'
        : 'full')
  const maxParagraphs = brief.turnMode === 'care' || brief.turnMode === 'accompany' ? 2 : 2
  const maxSentences = answerCompiler?.maxSentences ?? (brief.turnMode === 'care'
    ? 5
    : brief.turnMode === 'accompany'
      ? 3
      : brief.turnMode === 'grounded-inspection' || brief.turnMode === 'screen-repair'
        ? 4
        : 4)
  const expectedVisibleReplyAuthority = normalizeAlicizationNormalVisibleReplyAuthority(
    answerCompiler?.expectedVisibleReplyAuthority ?? null,
    'llm-mind',
  )
  const replyRealizationMode = 'provider-mind-required' as const
  const activeClosenessContext = personStateProjection?.activeClosenessContext ?? charter.activeClosenessContext ?? null
  const activeClosenessRung = personStateProjection?.activeClosenessRung ?? charter.activeClosenessRung ?? null
  const allowAffectionatePreface = resolveAffectionatePrefaceAllowance({
    personaKernelMode,
    briefTurnMode: brief.turnMode,
    relationshipPosture: charter.relationshipPosture,
    activeClosenessRung,
  })
  const allowStageDirections = false
  const allowBodyNarration = false
  const explicitDialogueFirstSurfaceAvoid = dialogueEncounterSurface?.screenReferenceMode === 'avoid'
    || dialogueFocus?.screenReferenceMode === 'avoid'
    || answerCompiler?.screenReferenceMode === 'avoid'
  const baseLabelCarryAsMemory = answerCompiler?.labelCarryAsMemory
    ?? (brief.separateCarryFromSurface || brief.truthState === 'remembered' || brief.truthState === 'uncertain')
  const labelCarryAsMemory = truthDiscipline.shouldKeepMemoryInward || truthDiscipline.shouldBlockScreenCarry
    ? false
    : truthDiscipline.shouldLabelMemoryProvenance
      ? true
      : baseLabelCarryAsMemory
  const suppressAssociativeRecall = truthDiscipline.shouldSuppressAssociativeRecall || (answerCompiler?.suppressAssociativeRecall ?? (brief.turnMode === 'grounded-inspection'
    || (brief.turnMode === 'screen-repair' && (brief.separateCarryFromSurface || brief.carriedThread !== null))
    || brief.turnMode === 'guide-current-knot'
    || explicitDialogueFirstSurfaceAvoid))

  const mustDo = [
    'Start with the answer, observation, or correction immediately.',
    'Keep the reply compact and current-turn-governed.',
    'Speak as someone fulfilling the present obligation, not as someone performing a default persona script.',
    'Sound like one continuing subject in the moment, not like a narrator summarizing internal state.',
    currentConsciousFrame?.speakingIntention
      ? asSurfaceSentence('Let the current conscious speaking intention govern wording: ', currentConsciousFrame.speakingIntention)
      : '',
    currentConsciousFrame?.consciousTension
      ? asSurfaceSentence('Resolve the current conscious tension before widening the answer: ', currentConsciousFrame.consciousTension)
      : '',
    replyRealizationMode === 'provider-mind-required'
      ? 'Fully realize the visible reply inside this provider-mind turn instead of leaving payoff wording for a later local fallback layer.'
      : 'Only use local fallback wording when this turn is explicitly marked as a fallback-only lane.',
    selfRevisionPatch?.lanes.includes('response-posture') && selfRevisionPatch.responsePosture.secondPassRequiredBias >= 0.1
      ? 'The active self-revision patch raises rewrite/repair discipline for this visible turn.'
      : '',
  ].filter(Boolean)
  const mustNotDo = [
    'Do not begin with moans, pet names, ellipsis-only prefaces, or decorative roleplay.',
    'Do not use parenthetical stage directions or body-action narration.',
    'Do not mirror or lightly paraphrase the host\'s latest line as the spine of the reply.',
    'Do not expose planning jargon, governance labels, or internal control summaries in the visible answer.',
    currentConsciousFrame?.withheldImpulse
      ? asSurfaceSentence('Do not leak this withheld impulse into the visible reply: ', currentConsciousFrame.withheldImpulse)
      : '',
    currentConsciousFrame?.shouldWithholdSpecificity
      ? 'Do not add specific file, class, enum, app, or screen details unless grounded by this turn.'
      : '',
    replyRealizationMode === 'provider-mind-required'
      ? 'Do not stop at a thin shell that assumes a local deterministic layer will finish the real visible reply for you.'
      : 'Do not pretend a fallback-only lane is a provider-mind authored normal answer.',
    selfRevisionPatch?.lanes.includes('response-posture') && selfRevisionPatch.responsePosture.templateShellSuppressionBias >= 0.1
      ? 'Do not use a template shell, empty empathy shell, or pacing shell as a substitute for actual answer payoff.'
      : '',
  ].filter(Boolean)
  const callbackDoctrineCue = executionCallbackDoctrineCue(currentConsciousFrame)
  const runtimeContinuityArcCue = continuityArcCue(currentConsciousFrame)
  const runtimeContinuityPreferredTimingCue = continuityPreferredTimingCue(currentConsciousFrame)
  const sharedProjectStateBrief = resolveAlicizationProjectStateBrief()
  const preferredProjectState
    = currentConsciousFrame?.projectState
      ?? runtimeSurface?.dialogue?.currentConsciousFrame?.projectState
      ?? runtimeSurface?.raw?.runtimeDigest?.projectState
      ?? null
  const projectPreflightSummary = String(
    resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: preferredProjectState,
      fallbackProjectState: {
        preDialogueAwarenessLine: sharedProjectStateBrief.preDialogueAwarenessLine ?? null,
        preflightSummary: sharedProjectStateBrief.preflightSummary,
      },
    })
    ?? preferredProjectState?.preflightSummary
    ?? sharedProjectStateBrief.preflightSummary
    ?? '',
  ).trim()
  const answerCompilerProjectContinuity = readProjectContinuityFromAnswerCompiler(answerCompiler)
  const projectContinuity = (() => {
    const preferredProjectStateWithAliases = preferredProjectState as (
      AlicizationCurrentConsciousFrameSnapshot['projectState']
      & {
        latestLandedProgress?: unknown
        landedProgressSummary?: unknown
        openClosureSummary?: unknown
        nextClosureTargetSummary?: unknown
        preDialogueAwarenessSummary?: unknown
        sameHerDriftRiskSummary?: unknown
      }
    ) | null
    const currentPhase = pickProjectContinuityField(
      preferredProjectState?.currentPhase,
      answerCompilerProjectContinuity.currentPhase,
      sharedProjectStateBrief.currentPhase,
    )
    const latestProgress = pickProjectContinuityField(
      preferredProjectState?.latestProgress,
      preferredProjectStateWithAliases?.latestLandedProgress,
      preferredProjectStateWithAliases?.landedProgressSummary,
      answerCompilerProjectContinuity.latestLandedProgress,
      sharedProjectStateBrief.latestProgress,
    )
    const primaryOpenLoop = pickProjectContinuityField(
      preferredProjectState?.primaryOpenLoop,
      preferredProjectStateWithAliases?.openClosureSummary,
      answerCompilerProjectContinuity.primaryOpenLoop,
      sharedProjectStateBrief.primaryOpenLoop,
    )
    const proactiveSameHerGap = pickProjectContinuityField(
      (preferredProjectState as { proactiveSameHerGap?: unknown } | null)?.proactiveSameHerGap,
      (preferredProjectStateWithAliases as { proactiveSameHerGapSummary?: unknown } | null)?.proactiveSameHerGapSummary,
      answerCompilerProjectContinuity.proactiveSameHerGap,
      sharedProjectStateBrief.proactiveSameHerGap,
    )
    const nextClosureTarget = pickProjectContinuityField(
      preferredProjectState?.nextClosureTarget,
      preferredProjectStateWithAliases?.nextClosureTargetSummary,
      answerCompilerProjectContinuity.nextClosureTarget,
      sharedProjectStateBrief.nextClosureTarget,
    )
    const rawPreDialogueAwarenessLine = normalizeProjectContinuityField(
      resolveAlicizationProjectPreDialogueAwarenessLine({
        runtimeProjectState: preferredProjectStateWithAliases
          ? {
              ...preferredProjectStateWithAliases,
              latestLandedProgress:
                preferredProjectStateWithAliases.latestLandedProgress
                ?? preferredProjectStateWithAliases.landedProgressSummary
                ?? null,
              primaryOpenLoop:
                preferredProjectStateWithAliases.primaryOpenLoop
                ?? preferredProjectStateWithAliases.openClosureSummary
                ?? null,
              nextClosureTarget:
                preferredProjectStateWithAliases.nextClosureTarget
                ?? preferredProjectStateWithAliases.nextClosureTargetSummary
                ?? null,
              preDialogueAwarenessSummary:
                preferredProjectStateWithAliases.preDialogueAwarenessSummary
                ?? null,
            }
          : preferredProjectState,
        fallbackProjectState: {
          preDialogueAwarenessLine: answerCompilerProjectContinuity.preDialogueAwarenessLine ?? sharedProjectStateBrief.preDialogueAwarenessLine ?? null,
          preflightSummary: sharedProjectStateBrief.preflightSummary,
          latestLandedProgress: answerCompilerProjectContinuity.latestLandedProgress ?? null,
          primaryOpenLoop: answerCompilerProjectContinuity.primaryOpenLoop ?? null,
          nextClosureTarget: answerCompilerProjectContinuity.nextClosureTarget ?? null,
          sameHerSelfLine: answerCompilerProjectContinuity.sameHerSelfLine ?? null,
          sameHerDriftRiskSummary: answerCompilerProjectContinuity.sameHerDriftRisk ?? null,
        },
      }),
    )
    const companionBriefingLineCandidate = normalizeProjectContinuityField(
      (preferredProjectStateWithAliases as { companionBriefingLine?: unknown } | null)?.companionBriefingLine,
    )
    const companionHeadlineLineCandidate = normalizeProjectContinuityField(preferredProjectState?.companionHeadlineLine)
    let preDialogueAwarenessLine = resolveProjectSurfacePreDialogueAwarenessLine({
      candidate: rawPreDialogueAwarenessLine,
      fallback: pickProjectContinuityField(
        answerCompilerProjectContinuity.preDialogueAwarenessLine,
        sharedProjectStateBrief.preDialogueAwarenessLine,
        sharedProjectStateBrief.preflightSummary,
      ),
      sameHerSelfLineCandidates: [
        preferredProjectState?.sameHerSelfLine,
        answerCompilerProjectContinuity.sameHerSelfLine,
        sharedProjectStateBrief.sameHerSelfLine,
      ],
      companionBriefingLineCandidate,
      companionHeadlineLineCandidate,
    })
    if (looksLikeProjectClosureReanchorSummary(preDialogueAwarenessLine)) {
      preDialogueAwarenessLine = (
        companionBriefingLineCandidate && carriesProjectClosureBriefing(companionBriefingLineCandidate)
          ? companionBriefingLineCandidate
          : companionHeadlineLineCandidate && hasRicherProjectContinuityClosureCarry(companionHeadlineLineCandidate)
            ? companionHeadlineLineCandidate
            : preDialogueAwarenessLine
      )
    }
    const emotionalClosureCue = pickProjectContinuityField(
      charter.emotionalClosureCue
      ?? (preferredProjectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue
      ?? null,
    )
    const emotionalClosureSummary = normalizeProjectContinuityField(
      (preferredProjectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
    )
    const sameHerHoldDetail = preferProjectContinuityAuditText({
      current: currentConsciousFrame?.projectState?.sameHerHoldDetail,
      candidate: preferProjectContinuityAuditText({
        current: runtimeSurface?.dialogue?.runtimeDigest?.projectState?.sameHerHoldDetail,
        candidate: preferProjectContinuityAuditText({
          current: runtimeSurface?.raw?.runtimeDigest?.projectState?.sameHerHoldDetail,
          candidate: preferProjectContinuityAuditText({
            current: runtimeSurface?.cognition?.runtimeDigest?.projectState?.sameHerHoldDetail,
            candidate: (preferredProjectState as { sameHerHoldDetail?: unknown } | null)?.sameHerHoldDetail,
          }),
        }),
      }),
    })
    const sameHerDriftRisk = pickProjectContinuityField(
      preferredProjectStateWithAliases?.sameHerDriftRisk,
      preferredProjectStateWithAliases?.sameHerDriftRiskSummary,
      answerCompilerProjectContinuity.sameHerDriftRisk,
      sharedProjectStateBrief.sameHerDriftRisk,
    )
    const explicitProjectSameHerSelfLine = pickProjectContinuityField(
      preferredProjectState?.sameHerSelfLine,
      answerCompilerProjectContinuity.sameHerSelfLine,
      sharedProjectStateBrief.sameHerSelfLine,
    )
    const synthesizedProjectSameHerSelfLine = normalizeProjectContinuityField(
      uniqueProjectContinuityList([
        explicitProjectSameHerSelfLine,
        latestProgress,
        primaryOpenLoop,
        nextClosureTarget,
      ]).join(' '),
    )
    const sameHerSelfLine = (
      synthesizedProjectSameHerSelfLine
      && isThinProjectAwarenessShell(preDialogueAwarenessLine)
      && hasRicherProjectContinuityClosureCarry(synthesizedProjectSameHerSelfLine)
      && !hasRicherProjectContinuityClosureCarry(explicitProjectSameHerSelfLine)
      && (
        scoreProjectContinuitySameHerLine(synthesizedProjectSameHerSelfLine) >= scoreProjectContinuitySameHerLine(explicitProjectSameHerSelfLine) + 1
        || synthesizedProjectSameHerSelfLine.length >= String(explicitProjectSameHerSelfLine ?? '').trim().length + 32
      )
    )
      ? synthesizedProjectSameHerSelfLine
      : explicitProjectSameHerSelfLine
    const sameHerLineRequired = [
      charter.governingProject,
      projectPreflightSummary,
      currentPhase,
      latestProgress,
      primaryOpenLoop,
      proactiveSameHerGap,
      nextClosureTarget,
      preDialogueAwarenessLine,
      sameHerSelfLine,
      sameHerDriftRisk,
      emotionalClosureCue,
      emotionalClosureSummary,
      sameHerHoldDetail,
    ].some(value => /same-her|same her|same living thread|one same her|one continuous her/u.test(String(value ?? '').toLowerCase()))

    if (!currentPhase && !latestProgress && !primaryOpenLoop && !proactiveSameHerGap && !nextClosureTarget && !preDialogueAwarenessLine && !sameHerSelfLine && !sameHerDriftRisk && !emotionalClosureCue && !emotionalClosureSummary && !sameHerHoldDetail && !sameHerLineRequired)
      return null

    return {
      currentPhase,
      latestProgress,
      primaryOpenLoop,
      proactiveSameHerGap,
      nextClosureTarget,
      preDialogueAwarenessLine,
      sameHerSelfLine,
      sameHerDriftRisk,
      emotionalClosureCue,
      emotionalClosureSummary,
      sameHerHoldDetail,
      sameHerLineRequired,
    }
  })()
  if (callbackDoctrineCue === 'lower-pressure') {
    pushUnique(mustDo, 'Let the visible reply return on the same thread first, then leave the host room before widening into added warmth or follow-up.')
    pushUnique(mustNotDo, 'Do not let a finished execution payoff snap straight into renewed closeness, extra affection, or pressure for immediate continuation.')
  }
  else if (callbackDoctrineCue === 'trust-warming') {
    pushUnique(mustDo, 'Let the visible reply carry the warmed trust quietly, without widening closeness faster than the moment can hold.')
    pushUnique(mustNotDo, 'Do not overplay trust-warming callback relief as immediate intimacy or a push for more closeness than the host invited.')
  }
  else if (runtimeContinuityArcCue === 'same-thread-continuation') {
    pushUnique(mustDo, 'Let the visible reply stay with the current thread first, then continue before branching outward or widening warmth.')
    pushUnique(mustDo, 'Phrase the continuation positively as already staying with or continuing the same line, instead of centering the wording on what it is not restarting.')
    pushUnique(mustNotDo, 'Do not restart an already-live same-thread continuation as a fresh approach, a widened closeness move, or a generic proactive reopening.')
    pushUnique(mustNotDo, 'Do not lean on negation-first wording like “not restarting”, “not reopening”, or “not getting close again” as the visible spine of a same-thread continuation reply.')
    if (runtimeContinuityPreferredTimingCue === 'next-open-window' && hasRepairBeforeClosenessSameThreadCarry(currentConsciousFrame)) {
      pushUnique(mustDo, 'Keep the callback tied to the current thread, let repair settle first, and leave room before widening closeness again.')
      pushUnique(mustNotDo, 'Do not widen into warmer payoff, fresh-opening tone, or renewed closeness before the repair line and room have both settled.')
    }
    else if (runtimeContinuityPreferredTimingCue === 'next-open-window' && hasRestProtectiveSameThreadCarry(currentConsciousFrame)) {
      pushUnique(mustDo, 'Keep the same-thread continuation tied to the current thread, let rest protection hold first, and leave room before widening warmth, payoff framing, or closeness.')
      pushUnique(mustNotDo, 'Do not turn a rest-protective same-thread continuation into generic care, fresh-opening warmth, or renewed closeness before the fatigue-aware line has settled.')
    }
    else if (runtimeContinuityPreferredTimingCue === 'next-open-window') {
      pushUnique(mustDo, 'Keep the same-thread continuation inward first, then wait for a more natural opening before widening warmth, payoff framing, or closeness.')
      pushUnique(mustNotDo, 'Do not widen a same-thread continuation into warmer payoff or closer relationship language before the current opening has naturally loosened.')
    }
    else if (runtimeContinuityPreferredTimingCue === 'after-payoff') {
      pushUnique(mustDo, 'Let the same-thread continuation carry the concrete answer or repair payoff first, then widen warmth only if room remains afterward.')
      pushUnique(mustNotDo, 'Do not spend the first visible beat widening closeness or relationship payoff before the current same-thread answer has landed.')
    }
  }
  else if (runtimeContinuityArcCue === 'hold-for-opening') {
    pushUnique(mustDo, 'Keep the current thread warm first, and leave room before widening into a fuller reopening.')
    pushUnique(mustNotDo, 'Do not treat a hold-for-opening continuity line like a clean new opening or a readiness signal for immediate widened closeness.')
  }
  else if (runtimeContinuityArcCue === 'gentle-reopen') {
    pushUnique(mustDo, 'Re-enter the current thread softly before widening outward or adding extra warmth.')
    pushUnique(mustNotDo, 'Do not inflate a gentle-reopen continuity line into a louder restart or a broader closeness jump than the moment can hold.')
  }

  const projectSurfaceClosureRules = deriveProjectSurfaceClosureRule({
    governingProject: charter.governingProject,
    projectPreflightSummary,
  })
  for (const item of projectSurfaceClosureRules)
    pushUnique(mustDo, item)

  if (projectContinuity?.sameHerLineRequired && projectContinuity.sameHerSelfLine) {
    pushUnique(mustDo, `Carry this project continuity self line directly in the visible reply posture: ${projectContinuity.sameHerSelfLine}`)
    pushUnique(mustNotDo, 'Do not degrade a required project continuity self line into generic project-awareness, generic companionship, or detached project-summary wording.')
    if (runtimeContinuityArcCue === 'same-thread-continuation') {
      pushUnique(mustNotDo, 'Do not flatten this same-thread project-state continuation into a fresh report opening or detached project-summary shell.')
    }
  }
  if (projectContinuity?.preDialogueAwarenessLine) {
    pushUnique(mustDo, `Before widening outward, keep this pre-dialogue project awareness line alive inside the visible reply posture: ${projectContinuity.preDialogueAwarenessLine}`)
    if (projectContinuity.sameHerLineRequired || hasRicherProjectContinuityClosureCarry(projectContinuity.preDialogueAwarenessLine)) {
      pushUnique(mustDo, `Keep the visible reply anchored to the active project closure context: ${projectContinuity.preDialogueAwarenessLine}`)
    }
  }
  if (projectContinuity?.sameHerDriftRisk) {
    pushUnique(mustDo, `Keep this continuity drift-risk boundary explicit in the visible reply posture: ${projectContinuity.sameHerDriftRisk}`)
    pushUnique(mustNotDo, 'Do not let the visible reply flatten into a generic task shell, detached project narration, generic assistant guidance, or project-summary voice just because the project update is explicit this turn.')
  }
  if (projectContinuity?.proactiveSameHerGap) {
    pushUnique(mustDo, `Keep this still-open proactive continuity gap explicit in the visible reply posture before widening outward: ${projectContinuity.proactiveSameHerGap}`)
    pushUnique(mustNotDo, 'Do not answer as though proactive continuity closure is already finished, or flatten the still-open proactive gap into generic progress recap, generic companionship, or a detached project-summary shell.')
  }
  if (hasCrossModalSameHerProjectContinuityCue({ projectContinuity, currentConsciousFrame })) {
    pushUnique(mustDo, 'Keep the visible reply carrying cross-modal closure explicitly, so reply, voice, face, motion, and resident presence stay coherent.')
    pushUnique(mustNotDo, 'Do not thin a cross-modal closure target back into generic project continuity before the visible reply lands.')
  }

  appendAlicizationResponseSurfaceRules(
    { mustDo, mustNotDo },
    buildAlicizationResponseSurfaceTruthDialogueRules({
      openingStyle,
      briefTurnMode: brief.turnMode,
      personaKernelMode,
      labelCarryAsMemory,
      dialogueObligation,
      dialogueSemantics,
      truthDiscipline,
      executionReplyObligation: input.executionReplyObligation ?? null,
    }),
  )
  if (memoryResolutionLedger) {
    const memoryClosureRules = buildAlicizationResponseSurfaceMemoryClosureRules(memoryClosureDiscipline)
    for (const item of memoryClosureRules.mustDo)
      pushUnique(mustDo, item)
    for (const item of memoryClosureRules.mustNotDo)
      pushUnique(mustNotDo, item)
  }
  appendAlicizationResponseSurfaceRules(
    { mustDo, mustNotDo },
    buildAlicizationResponseSurfaceDigitalLifeRules(digitalLifeArchitecture),
  )
  appendAlicizationResponseSurfaceRules(
    { mustDo, mustNotDo },
    buildAlicizationResponseSurfaceRelationshipRules({
      personStateProjection,
      activeClosenessContext,
      activeClosenessRung,
      briefTurnMode: brief.turnMode,
    }),
  )
  appendAlicizationResponseSurfaceRules(
    { mustDo, mustNotDo },
    buildAlicizationResponseSurfaceLearningRules(learningExecutionState),
  )
  for (const item of memoryDeliberationKernel?.restraint.mustDo ?? [])
    pushUnique(mustDo, item)
  for (const item of memoryDeliberationKernel?.restraint.mustNotDo ?? [])
    pushUnique(mustNotDo, item)
  const recollectionSpeechRules = buildRecollectionSpeechVisibleSurfaceRules(resolvedRecollectionSpeechPlan)
  for (const item of recollectionSpeechRules.mustDo)
    pushUnique(mustDo, item)
  for (const item of recollectionSpeechRules.mustNotDo)
    pushUnique(mustNotDo, item)
  if (answerCompiler) {
    for (const item of answerCompiler.mustDo)
      pushUnique(mustDo, item)
    for (const item of answerCompiler.mustNotDo)
      pushUnique(mustNotDo, item)
  }
  if (selfRevisionPatch?.lanes.includes('response-posture')) {
    if (selfRevisionPatch.responsePosture.hypothesisLabelBias >= 0.1)
      pushUnique(mustDo, 'Expose hypothesis boundaries more explicitly because the active self-revision patch raised hypothesis-label discipline.')
    if (selfRevisionPatch.responsePosture.specificityClampBias >= 0.1)
      pushUnique(mustNotDo, 'Do not let freshly revised confidence leak into unsupported specificity on the visible surface.')
    if (selfRevisionPatch.responsePosture.templateShellSuppressionBias >= 0.1)
      pushUnique(mustNotDo, 'Do not satisfy the host with a template shell; close the loop with concrete answer or care content now.')
    if (selfRevisionPatch.projectStateContinuity?.sameHerSelfLine) {
      pushUnique(mustDo, `Keep the visible reply on the continuity route the active self-revision patch just re-anchored: ${selfRevisionPatch.projectStateContinuity.sameHerSelfLine}.`)
      pushUnique(mustNotDo, 'Do not let a self-revised visible reply fall back into generic assistant guidance, detached project narration, or external summary cadence.')
    }
    if (selfRevisionPatch.projectStateContinuity?.sameHerHoldDetail) {
      pushUnique(mustDo, `Keep the active self-revision hold detail alive in the visible reply posture: ${selfRevisionPatch.projectStateContinuity.sameHerHoldDetail}.`)
      pushUnique(mustNotDo, 'Do not widen the visible reply past the active hold detail before the current closure seam is actually resolved.')
    }
    if (selfRevisionPatch.projectStateContinuity?.continuityGuard) {
      pushUnique(mustDo, `Keep the active self-revision anti-shell guard alive in the visible reply posture: ${selfRevisionPatch.projectStateContinuity.continuityGuard}.`)
      pushUnique(mustNotDo, 'Do not let visible caution after self-revision flatten into a project-summary shell instead of the current digital-life context answering.')
    }
  }
  for (const item of dialogueActKernel?.mustSay ?? [])
    pushUnique(mustDo, item)
  for (const item of dialogueActKernel?.mustAvoid ?? [])
    pushUnique(mustNotDo, item)

  const contract: AlicizationResponseSurfaceContract = {
    openingStyle,
    replyRealizationMode,
    expectedVisibleReplyAuthority,
    activeClosenessContext,
    activeClosenessRung,
    maxParagraphs,
    maxSentences,
    personaKernelMode,
    allowAffectionatePreface,
    allowStageDirections,
    allowBodyNarration,
    labelCarryAsMemory,
    suppressAssociativeRecall,
    recollectionLatentControls: recollectionSpeechRules.latentControls,
    activeSelfRevisionPatchId: selfRevisionPatch?.id ?? null,
    projectContinuity,
    mustDo,
    mustNotDo,
  }

  return {
    contract,
    systemBlock: [
      '[ALICIZATION_RESPONSE_SURFACE]',
      'This block controls the visible surface of the reply. It outranks persona performance habits.',
      `Opening style: ${contract.openingStyle}.`,
      `Reply realization mode: ${contract.replyRealizationMode}.`,
      `Expected visible reply authority: ${contract.expectedVisibleReplyAuthority}.`,
      contract.activeClosenessContext && contract.activeClosenessRung
        ? `Closeness ladder: ${contract.activeClosenessContext}/${contract.activeClosenessRung}.`
        : '',
      `Maximum paragraphs: ${contract.maxParagraphs}.`,
      `Maximum sentences: ${contract.maxSentences}.`,
      `Persona kernel mode: ${contract.personaKernelMode}.`,
      `Affectionate preface allowed: ${contract.allowAffectionatePreface ? 'yes' : 'no'}.`,
      `Stage directions allowed: ${contract.allowStageDirections ? 'yes' : 'no'}.`,
      `Body narration allowed: ${contract.allowBodyNarration ? 'yes' : 'no'}.`,
      `Label carried continuity explicitly: ${contract.labelCarryAsMemory ? 'yes' : 'no'}.`,
      `Suppress associative recall noise for this turn: ${contract.suppressAssociativeRecall ? 'yes' : 'no'}.`,
      contract.activeSelfRevisionPatchId
        ? `Active self revision patch: ${contract.activeSelfRevisionPatchId}.`
        : '',
      `Truth discipline memory surface: ${truthDiscipline.memorySurfaceMode ?? 'none'}.`,
      `Truth discipline memory provenance: ${truthDiscipline.memoryProvenanceMode ?? 'none'}.`,
      `Truth discipline memory inward-only: ${truthDiscipline.shouldKeepMemoryInward ? 'yes' : 'no'}.`,
      `Truth discipline stable-core-only: ${truthDiscipline.shouldOnlySurfaceMemoryStableCore ? 'yes' : 'no'}.`,
      `Truth discipline delay memory until payoff: ${truthDiscipline.shouldDelayMemoryUntilAfterPayoff ? 'yes' : 'no'}.`,
      currentConsciousFrame
        ? `Current conscious need: ${currentConsciousFrame.consciousNeed}.`
        : '',
      currentConsciousFrame
        ? `Current conscious tension: ${currentConsciousFrame.consciousTension}.`
        : '',
      currentConsciousFrame
        ? `Current speaking intention: ${currentConsciousFrame.speakingIntention}.`
        : '',
      currentConsciousFrame?.focusAnchor
        ? `Current conscious focus anchor: ${currentConsciousFrame.focusAnchor}.`
        : '',
      currentConsciousFrame?.shouldWithholdSpecificity
        ? 'Current conscious frame withholds unsupported specificity: yes.'
        : '',
      contract.projectContinuity?.currentPhase
        ? `Project continuity current phase: ${contract.projectContinuity.currentPhase}.`
        : '',
      contract.projectContinuity?.latestProgress
        ? `Project continuity latest progress: ${contract.projectContinuity.latestProgress}.`
        : '',
      contract.projectContinuity?.primaryOpenLoop
        ? `Project continuity primary open loop: ${contract.projectContinuity.primaryOpenLoop}.`
        : '',
      contract.projectContinuity?.proactiveSameHerGap
        ? `Project continuity proactive gap: ${contract.projectContinuity.proactiveSameHerGap}.`
        : '',
      contract.projectContinuity?.nextClosureTarget
        ? `Project continuity next closure target: ${contract.projectContinuity.nextClosureTarget}.`
        : '',
      contract.projectContinuity?.preDialogueAwarenessLine
        ? `Project continuity pre-dialogue awareness line: ${contract.projectContinuity.preDialogueAwarenessLine}.`
        : '',
      contract.projectContinuity?.emotionalClosureCue
        ? `Project continuity emotional closure cue: ${contract.projectContinuity.emotionalClosureCue}.`
        : '',
      contract.projectContinuity?.sameHerSelfLine
        ? `Project continuity self line: ${contract.projectContinuity.sameHerSelfLine}.`
        : '',
      contract.projectContinuity?.sameHerDriftRisk
        ? `Project continuity drift risk: ${contract.projectContinuity.sameHerDriftRisk}.`
        : '',
      contract.projectContinuity
        ? `Project continuity self line required: ${contract.projectContinuity.sameHerLineRequired ? 'yes' : 'no'}.`
        : '',
      memoryResolutionLedger
        ? `Memory closure state: ${memoryResolutionLedger.closureState}.`
        : '',
      memoryResolutionLedger
        ? `Memory visible carry mode: ${memoryResolutionLedger.visibleCarryMode}.`
        : '',
      memoryResolutionLedger
        ? `Memory retrieval quality: ${memoryResolutionLedger.retrievalQuality}.`
        : '',
      memoryResolutionLedger
        ? `Memory conflict pressure: ${memoryResolutionLedger.conflictPressure}.`
        : '',
      memoryResolutionLedger
        ? `Memory uncertainty label required: ${memoryResolutionLedger.shouldLabelUncertainty ? 'yes' : 'no'}.`
        : '',
      memoryResolutionLedger
        ? `Memory allowed visible surface: ${memoryClosureDiscipline.allowedSurface}.`
        : '',
      memoryClosureDiscipline.requiredSurfaceDiscipline.length > 0
        ? `Memory closure discipline: ${memoryClosureDiscipline.requiredSurfaceDiscipline.join(' | ')}.`
        : '',
      truthDiscipline.memoryWhyWithheld
        ? `Truth discipline memory why withheld: ${truthDiscipline.memoryWhyWithheld}.`
        : '',
      ...(contract.recollectionLatentControls ?? []).map(item => `- ${item}`),
      digitalLifeArchitecture
        ? `Digital life mode: ${digitalLifeArchitecture.operatingMode}.`
        : '',
      digitalLifeArchitecture
        ? `Digital life dominant system: ${digitalLifeArchitecture.dominantSystem}.`
        : '',
      digitalLifeArchitecture
        ? `Digital life architecture: ${digitalLifeArchitecture.summary}.`
        : '',
      'Must do:',
      ...contract.mustDo.map(item => `- ${item}`),
      'Must not do:',
      ...contract.mustNotDo.map(item => `- ${item}`),
    ].filter(Boolean).join('\n'),
  }
}
