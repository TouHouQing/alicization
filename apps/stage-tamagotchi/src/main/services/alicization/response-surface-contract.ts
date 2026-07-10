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
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
  deriveAlicizationMemoryClosureDiscipline,
  formatAlicizationProjectStateAwarenessFields,
  normalizeAlicizationNormalVisibleReplyAuthority,
  readKnowledgeEvidenceFromDerivedMindStateBundle,
  readLearningExecutionStateFromDerivedMindStateBundle,
  readMemoryDeliberationFromDerivedMindStateBundle,
  readPersonStateProjectionFromDerivedMindStateBundle,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  sanitizeAlicizationProviderFacingText,
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
    pushUnique(mustNotDo, 'remembered_procedure_as_fresh_execution_completion=blocked')
  }

  return {
    mustDo: normalizeResponseSurfaceRuleList(mustDo, 'mustDo'),
    mustNotDo: normalizeResponseSurfaceRuleList(mustNotDo, 'mustNotDo'),
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
  const carriesSameThreadReturn = /same callback|same thread|continuity line|callback repair line|same repair line|同一条线|修补线/u.test(combined)
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
  const carriesSameThreadReturn = /same callback|same thread|continuity line|callback line|same line|同一条线/u.test(combined)
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
    /cross-modal|continuity proof|continuous identity|current continuity/u.test(combined)
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
      'visible_reply_anchor=active_digital_life_closure_seam; detail=',
      text.slice(0, 180),
    ),
  ]
  if (/continuity|continuity identity|continuity thread|continuous identity/u.test(lower)) {
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

function normalizeProjectContinuityProviderFacingField(value: unknown, maxChars = 1600) {
  const sanitized = sanitizeAlicizationProviderFacingText(value, maxChars)
  return sanitized && sanitized !== alicizationFixedTemplateReplacement
    ? sanitized
    : null
}

function containsResponseSurfaceNaturalInstruction(value: string) {
  return /\b(?:Do not|Open with|Let the first|Let active recollection|Let the visible reply|Start with|Use the first sentence|Complete the actual|State plainly|Before widening|Before answering|Keep this|Keep the visible|Keep the active|If warmth|If memory|When surfacing|Land the live payoff)\b/iu.test(value)
}

function normalizeResponseSurfaceProviderValue(value: string) {
  return value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w=;|:./,-]+/giu, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function responseSurfaceProviderField(key: string, value: unknown, maxChars = 320) {
  const normalized = normalizeProjectContinuityProviderFacingField(value, maxChars)
  if (!normalized)
    return ''

  const controlKey = normalizeResponseSurfaceControlCode(key)
  if (containsResponseSurfaceNaturalInstruction(normalized))
    return `${controlKey}=present; visible_wording=false; source=structured_signal.`

  return `${controlKey}=${normalizeResponseSurfaceProviderValue(normalized)}.`
}

function responseSurfaceContractEvidenceField(key: string, value: unknown, maxChars = 1600) {
  const controlKey = normalizeResponseSurfaceControlCode(key)
  const raw = normalizeProjectContinuityField(value)
  if (!raw)
    return null

  const normalized = normalizeProjectContinuityProviderFacingField(raw, maxChars)
  if (!normalized)
    return `${controlKey}=present; content=excluded; visibility=internal_structured`
  if (containsResponseSurfaceNaturalInstruction(normalized))
    return `${controlKey}=present; visible_wording=false; source=structured_signal`

  return normalizeResponseSurfaceProviderValue(normalized)
}

function responseSurfaceProviderListItem(value: unknown) {
  const normalized = normalizeProjectContinuityProviderFacingField(value, 360)
  return normalized ? `- ${normalized}` : ''
}

type AlicizationResponseSurfaceRuleLane = 'mustDo' | 'mustNotDo'

function normalizeResponseSurfaceControlCode(value: string) {
  return value
    .trim()
    .replace(/;\s*/g, ';')
    .replace(/\|\s*/g, '|')
    .replace(/\s+/g, '_')
    .replace(/[^\w=;|:./-]+/giu, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
}

function pushUniqueSurfaceControl(target: string[], value: string) {
  const normalized = normalizeResponseSurfaceControlCode(value)
  if (!normalized || target.includes(normalized))
    return
  target.push(normalized)
}

function classifyResponseSurfaceNaturalLanguageRule(value: string, lane: AlicizationResponseSurfaceRuleLane) {
  const normalized = value.trim()
  const lower = normalized.toLowerCase()
  const controls: string[] = []

  if (!normalized)
    return controls
  if (/^[a-z][a-z0-9_]*=[a-z0-9_.:/-]+(?:;\s*[a-z][a-z0-9_]*=[a-z0-9_.:/-]+)*$/u.test(normalized)) {
    pushUniqueSurfaceControl(controls, normalized)
    return controls
  }
  if (/^[-a-z0-9_]+\{[^{}\n]+\}$/u.test(normalized)) {
    pushUniqueSurfaceControl(controls, normalized)
    return controls
  }

  if (lower.includes('visible reply') || lower.includes('visible answer') || lower.includes('visible surface'))
    pushUniqueSurfaceControl(controls, 'visible_wording=false')
  if (
    lower.includes('fully realize the visible reply')
    || lower.includes('actual answer payoff')
    || lower.includes('actual answer')
    || lower.includes('care move')
    || lower.includes('companionship move')
    || lower.includes('payoff')
    || lower.includes('first sentence')
    || lower.includes('start with the answer')
    || lower.includes('lead with what is visible')
    || lower.includes('begin with payoff')
    || lower.includes('current-turn')
    || lower.includes('current ask')
    || lower.includes('current follow-up')
    || lower.includes('concrete answer')
  ) {
    pushUniqueSurfaceControl(controls, 'surface.start=answer_immediate')
    pushUniqueSurfaceControl(controls, 'visible_reply_payoff=concrete_current_turn')
  }
  if (lower.includes('provider-mind') || lower.includes('local deterministic layer') || lower.includes('fallback'))
    pushUniqueSurfaceControl(controls, 'provider_visible_reply_authority=mind_required')
  if (
    lower.includes('transparent')
    || lower.includes('state plainly')
    || lower.includes('failed')
    || lower.includes('blocked')
    || lower.includes('cancelled')
    || lower.includes('waiting')
    || lower.includes('confirmation')
  ) {
    pushUniqueSurfaceControl(controls, 'failure_transparency=required')
  }
  if (
    lower.includes('moans')
    || lower.includes('pet names')
    || lower.includes('ellipsis')
    || lower.includes('roleplay')
    || lower.includes('stage directions')
    || lower.includes('body-action')
    || lower.includes('body narration')
    || lower.includes('persona flourishes')
    || lower.includes('persona script')
    || lower.includes('persona-preface')
    || lower.includes('theatrical')
    || lower.includes('scene narration')
    || lower.includes('decorative')
  ) {
    if (lane === 'mustNotDo')
      pushUniqueSurfaceControl(controls, 'persona_shell=blocked')
    pushUniqueSurfaceControl(controls, 'stage_direction_persona_padding=blocked')
  }
  if (
    lower.includes('planning jargon')
    || lower.includes('governance labels')
    || lower.includes('internal control summaries')
    || lower.includes('internal control summary')
  ) {
    pushUniqueSurfaceControl(controls, 'internal_control_summary=blocked')
  }
  if (
    lower.includes('reuse drafted recollection')
    || lower.includes('verbatim')
    || lower.includes('exact remembered wording')
    || lower.includes('quote')
    || lower.includes('reconstruct exact')
    || lower.includes('exact details')
    || lower.includes('date-recital')
    || lower.includes('archive dump')
  ) {
    pushUniqueSurfaceControl(controls, 'memory_recollection_verbatim_copy=blocked')
  }
  if (
    lower.includes('recollection')
    || lower.includes('remembered continuity')
    || lower.includes('memory')
    || lower.includes('recall')
    || lower.includes('remembered')
    || lower.includes('carried continuity')
    || lower.includes('residue')
    || lower.includes('stable core')
  ) {
    if (lane === 'mustDo') {
      const carriesInwardMemory = lower.includes('inward')
        || lower.includes('inside')
        || lower.includes('without announcing')
        || lower.includes('behind the live answer')
      if (carriesInwardMemory) {
        pushUniqueSurfaceControl(controls, 'memory.visibility=inward_only')
        pushUniqueSurfaceControl(controls, 'memory_recollection_inner_carry=required')
      }
      if (lower.includes('approximate') || lower.includes('uncertainty') || lower.includes('hypothesis') || lower.includes('reconstruction'))
        pushUniqueSurfaceControl(controls, 'memory_uncertainty_label=required')
      if (lower.includes('stable core') || lower.includes('gist'))
        pushUniqueSurfaceControl(controls, 'memory_visible_surface=stable_core_or_gist')
    }
    else {
      if (lower.includes('surface recollection') || lower.includes('visible') || lower.includes('visibly cite') || lower.includes('narrate this memory'))
        pushUniqueSurfaceControl(controls, 'memory_recollection_visible_dump=blocked')
      if (lower.includes('fresh execution') || lower.includes('execution impersonation'))
        pushUniqueSurfaceControl(controls, 'memory_execution_impersonation=blocked')
      if (lower.includes('current screen') || lower.includes('fresh live read'))
        pushUniqueSurfaceControl(controls, 'memory_as_live_screen=blocked')
    }
  }
  if (
    lower.includes('unsupported specificity')
    || lower.includes('specific file')
    || lower.includes('file names')
    || lower.includes('class names')
    || lower.includes('enum names')
    || lower.includes('field changes')
    || lower.includes('not grounded')
  ) {
    pushUniqueSurfaceControl(controls, 'unsupported_specificity=blocked')
  }
  if (lower.includes('hypothesis') || lower.includes('guess') || lower.includes('uncertainty'))
    pushUniqueSurfaceControl(controls, lane === 'mustDo' ? 'hypothesis_label=required' : 'unsupported_certainty=blocked')
  if (
    lower.includes('fresh approach')
    || lower.includes('fresh report opening')
    || lower.includes('fresh-opening')
    || lower.includes('restart')
    || lower.includes('reopening')
    || lower.includes('new opening')
    || lower.includes('generic proactive reopening')
    || lower.includes('fresh live read')
  ) {
    pushUniqueSurfaceControl(controls, 'fresh_restart=blocked')
  }
  if (
    lower.includes('detached project-summary')
    || lower.includes('project-summary voice')
    || lower.includes('detached project narration')
    || lower.includes('generic project-awareness')
    || lower.includes('generic task shell')
    || lower.includes('generic assistant')
    || lower.includes('generic guidance')
    || lower.includes('detached utility notice')
    || lower.includes('external summary cadence')
  ) {
    pushUniqueSurfaceControl(controls, 'detached_project_summary_voice=blocked')
  }
  if (
    lower.includes('template shell')
    || lower.includes('thin shell')
    || lower.includes('shell opener')
    || lower.includes('empty empathy shell')
    || lower.includes('pacing shell')
    || lower.includes('default persona script')
  ) {
    pushUniqueSurfaceControl(controls, 'template_shell=blocked')
  }
  if (
    lower.includes('same thread')
    || lower.includes('same-thread')
    || lower.includes('same callback')
    || lower.includes('current thread')
    || lower.includes('current opening')
    || lower.includes('callback line')
    || lower.includes('same result line')
  ) {
    if (lane === 'mustDo')
      pushUniqueSurfaceControl(controls, 'continuity_arc=same_thread')
    pushUniqueSurfaceControl(controls, lane === 'mustDo' ? 'continuity_thread=current_turn' : 'continuity_thread_break=blocked')
  }
  if (lower.includes('widen') || lower.includes('warmth') || lower.includes('closeness') || lower.includes('intimacy')) {
    if (lane === 'mustDo') {
      pushUniqueSurfaceControl(controls, 'closeness_widening=defer_until_payoff')
      pushUniqueSurfaceControl(controls, 'relationship_widening=after_payoff_if_room')
    }
    else {
      pushUniqueSurfaceControl(controls, 'premature_closeness_widening=blocked')
    }
  }
  if (lower.includes('room') || lower.includes('low-pressure') || lower.includes('bounded') || lower.includes('space-first'))
    pushUniqueSurfaceControl(controls, 'relationship_pressure=bounded')
  if (lower.includes('project continuity') || lower.includes('continuity drift-risk') || lower.includes('continuity route') || lower.includes('continuity guard'))
    pushUniqueSurfaceControl(controls, lane === 'mustDo' ? 'project_continuity=structured_context' : 'project_continuity_flattening=blocked')
  if (lower.includes('cross-modal') || lower.includes('voice') || lower.includes('face') || lower.includes('motion') || lower.includes('resident presence') || lower.includes('embodiment'))
    pushUniqueSurfaceControl(controls, lane === 'mustDo' ? 'embodiment_continuity=preserve' : 'embodiment_continuity_flattening=blocked')
  if (lower.includes('learning') || lower.includes('verification') || lower.includes('verified') || lower.includes('revising') || lower.includes('internalized'))
    pushUniqueSurfaceControl(controls, lane === 'mustDo' ? 'learning_state=structured_evidence' : 'learning_overclaim=blocked')
  if (lower.includes('screen-status caveats') || lower.includes('grounding requests') || lower.includes('screen grounding'))
    pushUniqueSurfaceControl(controls, lane === 'mustDo' ? 'screen_grounding=background' : 'screen_status_caveat=blocked')
  if (lower.includes('mirror') || lower.includes('paraphrase the host'))
    pushUniqueSurfaceControl(controls, 'host_line_mirroring=blocked')
  if (lower.includes('urge-to-speak') || lower.includes('unsolicited initiative'))
    pushUniqueSurfaceControl(controls, 'unsolicited_initiative=blocked')

  if (controls.length > 0)
    return controls

  const sanitized = sanitizeAlicizationProviderFacingText(normalized, 180, '')
  if (!sanitized)
    return []

  pushUniqueSurfaceControl(controls, `${lane === 'mustDo' ? 'structured_obligation' : 'structured_boundary'}=${sanitized}`)
  return controls
}

function normalizeResponseSurfaceRuleList(values: string[], lane: AlicizationResponseSurfaceRuleLane) {
  const normalized: string[] = []
  for (const value of values) {
    for (const control of classifyResponseSurfaceNaturalLanguageRule(value, lane))
      pushUniqueSurfaceControl(normalized, control)
  }
  return normalized
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

  const carriesSameHer = /phase1 continuity|continuity line|continuity identity|continuity|continuous identity|continuous identity|continuous identity|current thread continuity/u.test(normalized)
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
    proactiveSameHerGap ||= stripProjectContinuityPrefix(normalized, /^proactive continuity gap:\s*/i)
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
      && /continuity|continuity identity|continuity line|current thread continuity|continuous identity/u.test(String(item).toLowerCase()),
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

  return /keep current continuity in view|detached project shell|generic project shell/u.test(text)
    || text === 'current_continuity | closure_seam=explicit'
}

function scoreProjectContinuitySameHerLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return 0
  if (containsAlicizationFixedTemplateResidue(value))
    return 0

  let score = normalized.length >= 140 ? 2 : normalized.length >= 80 ? 1 : 0
  if (/local_desktop_life_loop|project_state_continuity|continuity_anchor=|continuity_(?:line|identity|thread)|cross_modal_continuity_proof/u.test(normalized))
    score += 4
  if (/callback|initiative|embodiment|resident presence|voice|face|motion|lipsync|closure|repair-before-closeness|measured-return/u.test(normalized))
    score += 2
  if (/keep current continuity in view|generic reminder|generic guidance/u.test(normalized))
    score -= 2
  return score
}

function hasRicherProjectContinuityClosureCarry(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(value))
    return false

  const carriesSameHer = /local_desktop_life_loop|project_state_continuity|continuity_anchor=|continuity_(?:line|identity|thread)|cross_modal_continuity_proof/u.test(normalized)
  const carriesClosureContext = /callback|initiative|embodiment|resident presence|voice|face|motion|lipsync|open closure|next closure|generic callback shell|repair-before-closeness|measured-return/u.test(normalized)
  return carriesSameHer && carriesClosureContext
}

function carriesProjectIdentityAwareness(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(value))
    return false

  return /alicization is (?:still the same )?local-first digital life project|same local-first digital life project|local-first digital life project building one continuous "her"/u.test(normalized)
}

function carriesProjectClosureBriefing(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(value))
    return false

  return /local_desktop_life_loop|project_state_continuity|returned project-state carry|landed=|open=|next=|still-open closure|open closure|next closure|closure seam|landed progress|project identity/u.test(normalized)
}

function looksLikeEmbodimentClosureHeadline(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return /continuity=embodiment|lane=(?:body|face|motion|lipsync|voice)|status=pending-rejoin|holding together mainly through|living audio thread is still intact|face and motion need to rejoin|full cross-modal closure settles|voice, face, and motion|body, lipsync, and voice/u.test(normalized)
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
      || normalized.includes('continuity line')
      || normalized.includes('continuity proof')
      || normalized.includes('continuity closure')

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
    ].some(value => /continuity|continuity identity|continuity thread|continuous identity|continuous identity/u.test(String(value ?? '').toLowerCase()))

    if (!currentPhase && !latestProgress && !primaryOpenLoop && !proactiveSameHerGap && !nextClosureTarget && !preDialogueAwarenessLine && !sameHerSelfLine && !sameHerDriftRisk && !emotionalClosureCue && !emotionalClosureSummary && !sameHerHoldDetail && !sameHerLineRequired)
      return null

    const structuredPreDialogueAwarenessLine = normalizeProjectContinuityField(formatAlicizationProjectStateAwarenessFields({
      currentPhase,
      latestLandedProgress: latestProgress,
      primaryOpenLoop,
      nextClosureTarget,
      continuityAnchor: sameHerSelfLine,
      continuityDriftRisk: sameHerDriftRisk,
      proactiveSameHerGap,
      emotionalClosureCue,
      status: normalizeProjectContinuityProviderFacingField(preDialogueAwarenessLine, 1600),
      visibility: 'response-surface-structured',
      maxChars: 1600,
    }))
    const safeSameHerDriftRisk = responseSurfaceContractEvidenceField('continuity_drift_risk', sameHerDriftRisk)
    const safeProactiveSameHerGap = responseSurfaceContractEvidenceField('proactive_continuity_gap', proactiveSameHerGap)
    const safeEmotionalClosureCue = responseSurfaceContractEvidenceField('emotional_closure_cue', emotionalClosureCue)
    const safeEmotionalClosureSummary = responseSurfaceContractEvidenceField('emotional_closure_summary', emotionalClosureSummary)
    const safeSameHerHoldDetail = responseSurfaceContractEvidenceField('continuity_hold_detail', sameHerHoldDetail)
    const safePreDialogueAwarenessLine = normalizeProjectContinuityField(formatAlicizationProjectStateAwarenessFields({
      currentPhase,
      latestLandedProgress: latestProgress,
      primaryOpenLoop,
      nextClosureTarget,
      continuityAnchor: sameHerSelfLine,
      continuityDriftRisk: safeSameHerDriftRisk,
      proactiveSameHerGap: safeProactiveSameHerGap,
      emotionalClosureCue: safeEmotionalClosureCue,
      sameHerHoldDetail: safeSameHerHoldDetail,
      status: structuredPreDialogueAwarenessLine,
      visibility: 'response-surface-structured',
      maxChars: 1600,
    }))

    return {
      currentPhase: responseSurfaceContractEvidenceField('current_phase', currentPhase),
      latestProgress: responseSurfaceContractEvidenceField('latest_progress', latestProgress),
      primaryOpenLoop: responseSurfaceContractEvidenceField('primary_open_loop', primaryOpenLoop),
      proactiveSameHerGap: safeProactiveSameHerGap,
      nextClosureTarget: responseSurfaceContractEvidenceField('next_closure_target', nextClosureTarget),
      preDialogueAwarenessLine: safePreDialogueAwarenessLine,
      sameHerSelfLine: responseSurfaceContractEvidenceField('continuity_anchor', sameHerSelfLine),
      sameHerDriftRisk: safeSameHerDriftRisk,
      emotionalClosureCue: safeEmotionalClosureCue,
      emotionalClosureSummary: safeEmotionalClosureSummary,
      sameHerHoldDetail: safeSameHerHoldDetail,
      sameHerLineRequired,
    }
  })()
  if (callbackDoctrineCue === 'lower-pressure') {
    pushUnique(mustDo, 'Let the visible reply return on the same thread first, then leave the host room before widening into added warmth or follow-up.')
    pushUnique(mustNotDo, 'finished_execution_payoff_to_renewed_closeness_or_continuation_pressure=blocked')
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
    pushUnique(mustDo, 'continuity_arc=gentle-reopen; surface_timing=soft_reentry_before_extra_warmth')
    pushUnique(mustNotDo, 'Do not inflate a gentle-reopen continuity line into a louder restart or a broader closeness jump than the moment can hold.')
  }

  const projectSurfaceClosureRules = deriveProjectSurfaceClosureRule({
    governingProject: charter.governingProject,
    projectPreflightSummary,
  })
  for (const item of projectSurfaceClosureRules)
    pushUnique(mustDo, item)

  if (projectContinuity?.sameHerLineRequired && projectContinuity.sameHerSelfLine) {
    pushUnique(mustDo, 'project_continuity_anchor=required; preserve_as_structured_context=true; do_not_quote_anchor=true')
    pushUnique(mustNotDo, 'Do not degrade a required project continuity self line into generic project-awareness, generic companionship, or detached project-summary wording.')
    if (runtimeContinuityArcCue === 'same-thread-continuation') {
      pushUnique(mustNotDo, 'Do not flatten this same-thread project-state continuation into a fresh report opening or detached project-summary shell.')
    }
  }
  if (projectContinuity?.preDialogueAwarenessLine) {
    pushUnique(mustDo, 'project_pre_dialogue_awareness=present; use_as_internal_context=true; do_not_quote_awareness_line=true')
    if (projectContinuity.sameHerLineRequired || hasRicherProjectContinuityClosureCarry(projectContinuity.preDialogueAwarenessLine)) {
      pushUnique(mustDo, 'active_project_closure_context=present; preserve_factual_fields_without_slogans=true')
    }
  }
  if (projectContinuity?.sameHerDriftRisk) {
    pushUnique(mustDo, `Keep this continuity drift-risk boundary explicit in the visible reply posture: ${projectContinuity.sameHerDriftRisk}`)
    pushUnique(mustNotDo, 'visible_reply_flattening=blocked; generic_task_shell=blocked; detached_project_narration=blocked; generic_assistant_guidance=blocked; project_summary_voice=blocked')
  }
  if (projectContinuity?.proactiveSameHerGap) {
    pushUnique(mustDo, 'proactive_continuity_gap=open; preserve_as_status_field=true; do_not_quote_gap_text=true')
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
      pushUnique(mustNotDo, 'freshly_revised_confidence_unsupported_specificity=blocked')
    if (selfRevisionPatch.responsePosture.templateShellSuppressionBias >= 0.1)
      pushUnique(mustNotDo, 'Do not satisfy the host with a template shell; close the loop with concrete answer or care content now.')
    if (selfRevisionPatch.projectStateContinuity?.sameHerSelfLine) {
      pushUnique(mustDo, `Keep the visible reply on the continuity route the active self-revision patch just re-anchored: ${selfRevisionPatch.projectStateContinuity.sameHerSelfLine}.`)
      pushUnique(mustNotDo, 'self_revised_visible_reply_generic_assistant_guidance=blocked; detached_project_narration=blocked; external_summary_cadence=blocked')
    }
    if (selfRevisionPatch.projectStateContinuity?.sameHerHoldDetail) {
      pushUnique(mustDo, `Keep the active self-revision hold detail alive in the visible reply posture: ${selfRevisionPatch.projectStateContinuity.sameHerHoldDetail}.`)
      pushUnique(mustNotDo, 'Do not widen the visible reply past the active hold detail before the current closure seam is actually resolved.')
    }
    if (selfRevisionPatch.projectStateContinuity?.continuityGuard) {
      pushUnique(mustDo, `Keep the active self-revision anti-shell guard alive in the visible reply posture: ${selfRevisionPatch.projectStateContinuity.continuityGuard}.`)
      pushUnique(mustNotDo, 'self_revision_caution_project_summary_shell=blocked; current_context_answering=required')
    }
  }
  for (const item of dialogueActKernel?.mustSay ?? [])
    pushUnique(mustDo, item)
  for (const item of dialogueActKernel?.mustAvoid ?? [])
    pushUnique(mustNotDo, item)

  const normalizedMustDo = normalizeResponseSurfaceRuleList(mustDo, 'mustDo')
  const normalizedMustNotDo = normalizeResponseSurfaceRuleList(mustNotDo, 'mustNotDo')
  pushUniqueSurfaceControl(normalizedMustDo, 'visible_wording=false')
  pushUniqueSurfaceControl(normalizedMustDo, 'visible_reply_payoff=concrete_current_turn')
  pushUniqueSurfaceControl(normalizedMustDo, 'provider_visible_reply_authority=mind_required')
  pushUniqueSurfaceControl(normalizedMustDo, 'failure_transparency=required')
  pushUniqueSurfaceControl(normalizedMustNotDo, 'stage_direction_persona_padding=blocked')
  pushUniqueSurfaceControl(normalizedMustNotDo, 'internal_control_summary=blocked')
  pushUniqueSurfaceControl(normalizedMustNotDo, 'fresh_restart=blocked')

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
    mustDo: normalizedMustDo,
    mustNotDo: normalizedMustNotDo,
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
        ? responseSurfaceProviderField('Current conscious need', currentConsciousFrame.consciousNeed)
        : '',
      currentConsciousFrame
        ? responseSurfaceProviderField('Current conscious tension', currentConsciousFrame.consciousTension)
        : '',
      currentConsciousFrame
        ? responseSurfaceProviderField('Current speaking intention', currentConsciousFrame.speakingIntention)
        : '',
      currentConsciousFrame?.focusAnchor
        ? responseSurfaceProviderField('Current conscious focus anchor', currentConsciousFrame.focusAnchor)
        : '',
      currentConsciousFrame?.shouldWithholdSpecificity
        ? 'Current conscious frame withholds unsupported specificity: yes.'
        : '',
      contract.projectContinuity?.currentPhase
        ? responseSurfaceProviderField('Project continuity current phase', contract.projectContinuity.currentPhase)
        : '',
      responseSurfaceProviderField('Project continuity latest progress', contract.projectContinuity?.latestProgress),
      responseSurfaceProviderField('Project continuity primary open loop', contract.projectContinuity?.primaryOpenLoop),
      responseSurfaceProviderField('Project continuity proactive gap', contract.projectContinuity?.proactiveSameHerGap),
      responseSurfaceProviderField('Project continuity next closure target', contract.projectContinuity?.nextClosureTarget),
      responseSurfaceProviderField('Project continuity pre-dialogue awareness line', contract.projectContinuity?.preDialogueAwarenessLine),
      responseSurfaceProviderField('Project continuity emotional closure cue', contract.projectContinuity?.emotionalClosureCue),
      responseSurfaceProviderField('Project continuity self line', contract.projectContinuity?.sameHerSelfLine),
      responseSurfaceProviderField('Project continuity drift risk', contract.projectContinuity?.sameHerDriftRisk),
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
      'surface_must_do_controls:',
      ...contract.mustDo.map(responseSurfaceProviderListItem).filter(Boolean),
      'surface_must_not_do_controls:',
      ...contract.mustNotDo.map(responseSurfaceProviderListItem).filter(Boolean),
    ].filter(Boolean).join('\n'),
  }
}
