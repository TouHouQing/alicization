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
  formatAlicizationProjectStateAwarenessFields,
  normalizeAlicizationNormalVisibleReplyAuthority,
  readKnowledgeEvidenceFromDerivedMindStateBundle,
  readMemoryDeliberationFromDerivedMindStateBundle,
  readPersonStateProjectionFromDerivedMindStateBundle,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'
import { resolvePreferredPersonStateProjection } from './person-state-projection-resolution'
import {
  resolveAlicizationProjectStateBrief,
} from './project-state-brief'
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

function responseSurfaceContractEvidenceField(key: string, value: unknown, maxChars = 1600) {
  const label = readableResponseSurfaceToken(key)
  const raw = normalizeProjectContinuityField(value)
  if (!raw)
    return null

  const normalized = normalizeProjectContinuityProviderFacingField(raw, maxChars)
  if (!normalized)
    return null
  if (containsResponseSurfaceNaturalInstruction(normalized))
    return `${label}: structured signal present`

  return `${label}: ${normalized}`
}

function readableResponseSurfaceToken(raw: string) {
  return raw
    .replace(/_/gu, ' ')
    .replace(/\btrue\b/giu, 'yes')
    .replace(/\bfalse\b/giu, 'no')
    .trim()
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
  if (/runtime_personhood|project_state_review|project_anchor=|continuity_(?:line|identity|thread)|embodiment_scale_validation/u.test(normalized))
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

  const carriesSameHer = /runtime_personhood|project_state_review|project_anchor=|continuity_(?:line|identity|thread)|embodiment_scale_validation/u.test(normalized)
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

  return /runtime_personhood|project_state_review|returned project-state carry|landed=|open=|next=|still-open closure|open closure|next closure|closure seam|landed progress|project identity/u.test(normalized)
}

function looksLikeEmbodimentClosureHeadline(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return /embodiment_status|lane=(?:body|face|motion|lipsync|voice)|status=partial|holding together mainly through|living audio thread is still intact|face and motion need to rejoin|full cross-modal closure settles|voice, face, and motion|body, lipsync, and voice/u.test(normalized)
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
  const dialogueEncounter = input.dialogueEncounter ?? null
  const dialogueEncounterSurface: AlicizationDialogueEncounterSurface | null = runtimeSurface?.dialogue.dialogueEncounter ?? dialogueEncounter ?? null
  const dialogueObligation = dialogueEncounter?.obligation ?? input.dialogueObligation ?? null
  const dialogueFocus = dialogueEncounter?.focus ?? input.dialogueFocus ?? null
  const answerCompiler = runtimeSurface?.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const claimEvidenceLedger = runtimeSurface?.dialogue.claimEvidenceLedger ?? input.claimEvidenceLedger ?? null
  const currentConsciousFrame = runtimeSurface?.dialogue.currentConsciousFrame ?? input.currentConsciousFrame ?? null
  const derivedBundle = runtimeSurface?.memory.derivedMindStateBundle ?? null
  const personStateProjection = resolvePreferredPersonStateProjection({
    bundleProjection: readPersonStateProjectionFromDerivedMindStateBundle<any>(derivedBundle),
    runtimeProjection: runtimeSurface?.memory.personStateProjection ?? null,
  }) ?? null
  const recollectionSpeechPlan = input.recollectionSpeechPlan
    ?? runtimeSurface?.memory.recollectionSpeechPlan
    ?? null
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
    activeSelfRevisionPatchId: selfRevisionPatch?.id ?? null,
    projectContinuity,
    mustDo: [],
    mustNotDo: [],
  }

  return {
    contract,
    systemBlock: '',
  }
}
