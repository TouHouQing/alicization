import type {
  AlicizationProviderMemoryUsage,
  AlicizationProviderResponsePayload,
} from '@proj-alicization/stage-shared'

import type { AlicizationVisibleReplyExecution } from '../../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'
import type { AlicizationVisibleReplyClosureResult } from './closure-orchestrator'
import type { AlicizationResolvedVisibleReply, AlicizationVisibleReplyClosureArtifact } from './realization-engine'
import type {
  AlicizationSecondPassRetryInput,
  AlicizationSecondPassRewriteResult,
} from './second-pass-rewrite'

import {
  alicizationEmotionWhitelist,
  alicizationPerformanceDeliveryWhitelist,
  containsAlicizationFixedTemplateResidue,
  resolveAlicizationChatFailureSurface,
  sanitizeAlicizationStructuredInternalText,
} from '@proj-alicization/stage-shared'

import {
  resolvePreparedRuntimeProjectPreDialogueAwarenessSummary,
  resolvePreparedRuntimeProjectStateSnapshot,
  resolvePreparedRuntimeSelfContinuityAuthority,
} from '../prepared-runtime-continuity'
import {
  buildAlicizationProjectPreDialogueAwarenessLine,
  isAlicizationThinProjectAwarenessLine as isSharedThinProjectAwarenessLine,
  resolveAlicizationProjectStateBrief,
  scoreAlicizationProjectAwarenessLine,
} from '../project-state-brief'
import { parseJsonObjectFromText } from '../runtime-transport-content'
import {
  AlicizationVisibleReplyClosureBlockedError,
  closeAlicizationVisibleReply,
} from './closure-orchestrator'
import {
  buildAlicizationResolvedVisibleReply,
} from './realization-engine'
import {
  mapAlicizationSecondPassReasonCodes,
  readAlicizationSecondPassToolFacts,
} from './second-pass-rewrite'

export interface AlicizationVisibleReplySettlementDraft {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
}

export interface AlicizationVisibleReplySettlementResult extends AlicizationResolvedVisibleReply {
  closureResult: AlicizationVisibleReplyClosureResult
}

export class AlicizationVisibleReplySettlementBlockedError extends Error {
  readonly failureSurface = resolveAlicizationChatFailureSurface({
    kind: 'structured-contract',
  })

  constructor(message: string, readonly closure: AlicizationVisibleReplyClosureArtifact | null) {
    super(message)
    this.name = 'AlicizationVisibleReplySettlementBlockedError'
  }
}

export function validateAlicizationProviderMemoryUsage(input: {
  memoryUsage: AlicizationProviderMemoryUsage
  prepared: AlicizationPreparedMainChatExecutionResult
}) {
  const memoryContext = input.prepared.memoryContext
  if (!memoryContext) {
    return {
      valid: true,
      workingMemoryVersionMatches: true,
      unknownEvidenceIds: [],
    }
  }

  const workingMemoryVersionMatches
    = input.memoryUsage.workingMemoryVersion
      === memoryContext.workingMemory.version
  const allowedEvidenceIds = new Set(
    memoryContext.availableLongTermEvidenceIds,
  )
  const unknownEvidenceIds = input.memoryUsage.longTermEvidenceIds
    .filter(id => !allowedEvidenceIds.has(id))

  return {
    valid: workingMemoryVersionMatches && unknownEvidenceIds.length === 0,
    workingMemoryVersionMatches,
    unknownEvidenceIds,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasExactKeys(record: Record<string, unknown>, keys: string[]) {
  const actual = Object.keys(record).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index])
}

export function validateAlicizationProviderSettlementPayload(input: {
  fullText: string
  prepared: AlicizationPreparedMainChatExecutionResult
}) {
  const parsed = parseJsonObjectFromText(input.fullText)
  const issues: string[] = []

  if (!parsed) {
    return {
      valid: false,
      payload: null,
      issues: ['provider-payload-json-invalid'],
      memoryUsage: null,
    }
  }

  const legacyDirectTestCompatibility = !input.prepared.memoryContext
  const performance = isRecord(parsed.performance)
    ? parsed.performance
    : legacyDirectTestCompatibility
      ? {
          baseEmotion: parsed.emotion,
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        }
      : null
  const memoryUsage = isRecord(parsed.memoryUsage)
    ? parsed.memoryUsage
    : legacyDirectTestCompatibility
      ? {
          workingMemoryVersion: null,
          longTermEvidenceIds: [],
        }
      : null
  if (parsed.format !== 'mind-turn-v1')
    issues.push('provider-payload-format-invalid')
  if (typeof parsed.thought !== 'string' || parsed.thought.length > 2_000)
    issues.push('provider-payload-thought-invalid')
  if (
    typeof parsed.emotion !== 'string'
    || !alicizationEmotionWhitelist.includes(parsed.emotion as never)
  ) {
    issues.push('provider-payload-emotion-invalid')
  }
  if (
    typeof parsed.reply !== 'string'
    || !parsed.reply.trim()
    || parsed.reply.length > 12_000
  ) {
    issues.push('provider-payload-reply-invalid')
  }
  if (
    typeof parsed.reply === 'string'
    && containsAlicizationFixedTemplateResidue(parsed.reply)
  ) {
    issues.push('provider-payload-template-contaminated')
  }

  if (
    !performance
    || !hasExactKeys(performance, [
      'baseEmotion',
      'facialCue',
      'actionCue',
      'delivery',
      'emphasis',
    ])
  ) {
    issues.push('provider-payload-performance-invalid')
  }
  else {
    if (
      typeof performance.baseEmotion !== 'string'
      || !alicizationEmotionWhitelist.includes(performance.baseEmotion as never)
      || performance.baseEmotion !== parsed.emotion
    ) {
      issues.push('provider-payload-performance-emotion-invalid')
    }
    if (
      performance.facialCue !== null
      && (typeof performance.facialCue !== 'string' || performance.facialCue.length > 80)
    ) {
      issues.push('provider-payload-facial-cue-invalid')
    }
    if (
      performance.actionCue !== null
      && (typeof performance.actionCue !== 'string' || performance.actionCue.length > 80)
    ) {
      issues.push('provider-payload-action-cue-invalid')
    }
    if (
      typeof performance.delivery !== 'string'
      || !alicizationPerformanceDeliveryWhitelist.includes(performance.delivery as never)
    ) {
      issues.push('provider-payload-delivery-invalid')
    }
    if (![0, 1, 2].includes(Number(performance.emphasis)))
      issues.push('provider-payload-emphasis-invalid')
  }

  let normalizedMemoryUsage: AlicizationProviderMemoryUsage | null = null
  if (
    !memoryUsage
    || !hasExactKeys(memoryUsage, [
      'workingMemoryVersion',
      'longTermEvidenceIds',
    ])
    || (
      memoryUsage.workingMemoryVersion !== null
      && typeof memoryUsage.workingMemoryVersion !== 'string'
    )
    || !Array.isArray(memoryUsage.longTermEvidenceIds)
    || memoryUsage.longTermEvidenceIds.some(id => typeof id !== 'string' || !id.trim())
  ) {
    issues.push('provider-memory-usage-invalid')
  }
  else {
    normalizedMemoryUsage = {
      workingMemoryVersion: memoryUsage.workingMemoryVersion as string | null,
      longTermEvidenceIds: memoryUsage.longTermEvidenceIds as string[],
    }
    const validation = validateAlicizationProviderMemoryUsage({
      memoryUsage: normalizedMemoryUsage,
      prepared: input.prepared,
    })
    if (!validation.valid)
      issues.push('provider-memory-usage-invalid')
  }

  return {
    valid: issues.length === 0,
    payload: issues.length === 0
      ? {
          ...parsed,
          performance,
          memoryUsage: normalizedMemoryUsage,
        } as unknown as AlicizationProviderResponsePayload
      : null,
    issues,
    memoryUsage: normalizedMemoryUsage,
  }
}

function looksLikeProjectStateSameHerPreserveText(value: string) {
  const normalized = value.trim().toLowerCase()
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(normalized))
    return false
  if (normalized.startsWith('preserve_field='))
    return false

  return looksLikeStructuredProjectContinuityFact(normalized)
}

function looksLikeFixedProjectStateSameHerPreserveText(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return containsAlicizationFixedTemplateResidue(normalized)
    && /project[-_ ]state|same[-_ ]her|same living line|one continuous|同一个她|同一个 her/u.test(normalized)
}

function looksLikeIndependentStructuredSameHerSignal(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(normalized))
    return false

  return looksLikeStructuredProjectContinuityFact(normalized)
    && (
      /owner=(?:workingmemory|longtermmemoryrecall)/u.test(normalized)
      || /(?:evidence_id|evidence_ref|evidence|trace|source)=/u.test(normalized)
      || /closure_policy=|continuity_hold=|project_state_review=|runtime_loop_validation=/u.test(normalized)
      || /memory_dialogue_embodiment_closure|embodiment_scale_validation=|embodiment_status/u.test(normalized)
    )
}

function containsProjectStateStructuredTemplateResidue(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return Boolean(normalized)
    && /\bruntime_personhood\b|phase1_local_digital_life|project_phase=life_core|continuity_identity|continuity_line|content_withheld|visibility=internal[-_]structured/u.test(normalized)
}

function readProjectStateAuditText(value: unknown) {
  return typeof value === 'string' ? value.trim() || null : null
}

function normalizePositiveProjectStateAuditText(value: unknown, maxChars = 520) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized)
    return null
  if (containsProjectStateStructuredTemplateResidue(normalized))
    return null
  if (!containsAlicizationFixedTemplateResidue(normalized))
    return normalized

  const structured = sanitizeAlicizationStructuredInternalText(normalized, maxChars, '')
  return structured
    && !containsAlicizationFixedTemplateResidue(structured)
    && !containsProjectStateStructuredTemplateResidue(structured)
    ? structured
    : null
}

function excludeFixedTemplateProjectStateAuditText(value: unknown, maxChars = 520) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized)
    return null
  if (!containsAlicizationFixedTemplateResidue(normalized))
    return normalized

  return normalizePositiveProjectStateAuditText(normalized, maxChars)
}

function scoreProjectAwarenessLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return 0

  const thinProjectAwarenessShell = isThinProjectAwarenessLine(normalized)
  const carriesFixedTemplateResidue = containsAlicizationFixedTemplateResidue(normalized)
    || containsProjectStateStructuredTemplateResidue(normalized)
  const carriesStructuredProjectFact
    = /(?:^|\s\|\s)(?:identity|phase|landed|open|next|initiative_gap|continuity_anchor|continuity_hold|continuity_drift_risk|emotional_closure|status|summary)=/u.test(normalized)
      || /open_loop=|project_state_review=|runtime_loop_validation=|embodiment_scale_validation=|memory_dialogue_embodiment_closure|embedding_recall_reindex/u.test(normalized)
  const carriesConcreteClosureProgress
    = /workingmemory|longtermmemoryrecall|semantic_recall|embedding|reindex|分页|搜索|召回|短期|长期|治理入口|review|memory_review|记忆闭环|语义召回|重建/u.test(normalized)
  let score = scoreAlicizationProjectAwarenessLine(normalized)

  if (carriesFixedTemplateResidue)
    score -= 8
  if (carriesStructuredProjectFact)
    score += 6
  if (carriesConcreteClosureProgress)
    score += 3
  if (!carriesFixedTemplateResidue && /current screen|本地数字生命|连续性|记忆|执行|主动性|对话闭环|闭环|收住|还没闭环|还没有真正收住/u.test(normalized))
    score += 2
  if (thinProjectAwarenessShell)
    score -= 2
  if (
    thinProjectAwarenessShell
    && /before answering, keep the same digital life project in view|回答前先记住这是同一个她/u.test(normalized)
  ) {
    score -= 3
  }
  return score
}

function looksLikeStructuredProjectContinuityFact(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(normalized) || containsProjectStateStructuredTemplateResidue(normalized))
    return false

  return /(?:^|\s\|\s)(?:identity|phase|landed|open|next|initiative_gap|continuity_anchor|continuity_hold|continuity_drift_risk|emotional_closure|status|summary)=/u.test(normalized)
    || /project_state_review=|runtime_loop_validation=|continuity_progress=|memory_dialogue_embodiment_closure|embodiment_scale_validation=|embedding_recall_reindex|embodiment_lanes=|embodiment_status/u.test(normalized)
}

function isThinProjectAwarenessLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized)
    return false

  return isSharedThinProjectAwarenessLine(normalized)
}

function looksLikeGenericSameHerShell(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return /generic (?:same-her|same her)|same-her line from thinner|same her line from thinner|thinner (?:runtime|carried|project|fallback)/u.test(normalized)
}

function looksLikeSameHerClosureSummary(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(normalized) || containsProjectStateStructuredTemplateResidue(normalized))
    return false

  return /project_state_review=|runtime_loop_validation=|continuity_progress=/u.test(normalized)
}

function normalizeEmbodimentRuntimeSameHerSummary(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized || !/^right now\b/u.test(normalized) || !looksLikeRicherLivingSelfSameHerLine(value))
    return null

  const lanes = [
    normalized.includes('body') ? 'body' : '',
    normalized.includes('face') ? 'face' : '',
    normalized.includes('motion') ? 'motion' : '',
    normalized.includes('lipsync') ? 'lipsync' : '',
    normalized.includes('voice') ? 'voice' : '',
  ].filter(Boolean)

  return [
    'project_anchor=embodiment_runtime',
    `lane=${lanes.length > 0 ? lanes.join('+') : 'embodiment'}`,
    'status=missing_lanes',
    'closure_status=cross_modal_open',
  ].join(' | ')
}

function normalizeProjectStateSameHerSummary(value: string | null | undefined) {
  if (!value)
    return null
  const normalizedEmbodimentSummary = normalizeEmbodimentRuntimeSameHerSummary(value)
  if (normalizedEmbodimentSummary)
    return normalizedEmbodimentSummary
  if (containsAlicizationFixedTemplateResidue(value)) {
    const sanitized = sanitizeAlicizationStructuredInternalText(value, 360, '')
    return looksLikeStructuredProjectContinuityFact(sanitized)
      ? sanitized
      : null
  }
  if (containsProjectStateStructuredTemplateResidue(value))
    return null
  return looksLikeSameHerClosureSummary(value)
    ? value
    : value
}

function looksLikeStructuredProjectCarrySameHerSummary(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(normalized))
    return false

  return looksLikeStructuredProjectContinuityFact(normalized)
    && /landed|open|next|continuity_progress|memory_dialogue_embodiment_closure|embodiment_scale_validation/u.test(normalized)
}

function looksLikeLegacyFixedProjectAwarenessTemplate(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized)
    return false

  return /^Before (?:I answer|answering|speaking),/iu.test(normalized)
    || /\bWhat has already landed is\b/iu.test(normalized)
    || /\bThe still-open closure is\b/iu.test(normalized)
    || /\bThis reply should keep moving toward\b/iu.test(normalized)
    || /\bSame Phase 1 digital life\b/iu.test(normalized)
}

function scoreProjectSameHerLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return 0
  if (containsAlicizationFixedTemplateResidue(normalized))
    return -6

  let score = normalized.length >= 120 ? 2 : normalized.length >= 72 ? 1 : 0
  if (containsProjectStateStructuredTemplateResidue(normalized))
    return -6
  if (/project_state_review=|runtime_loop_validation=|continuity_progress=/u.test(normalized))
    score += 3
  if (/holding together mainly through|face|motion|voice|lipsync|cross-modal|embodiment closure|unfinished closure/u.test(normalized))
    score += 2
  if (/keep the same digital life project in view|generic reminder|generic guidance/u.test(normalized))
    score -= 2
  return score
}

function looksLikeRicherLivingSelfSameHerLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(normalized))
    return false

  return /embodiment_status|embodiment_lanes=|lane=(?:body|face|motion|lipsync|voice)|status=partial|missing_lanes|embodiment_scale_validation/u.test(normalized)
}

function looksLikeEmbodimentClosureHeadline(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return /embodiment_status|lane=(?:body|face|motion|lipsync|voice)|status=partial|face and motion|face, motion|lipsync|voice|body line|living her|living audio thread|audible-body|audible body|cross-modal closure/u.test(normalized)
}

function looksLikeStructuredEmbodimentContinuityFact(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized || looksLikeLegacyFixedProjectAwarenessTemplate(normalized))
    return false

  return /embodiment_status/u.test(normalized)
    && /pending[-_]rejoin|signature=|face|motion|lipsync|voice|body/u.test(normalized)
}

function looksLikeCompactSameHerInwardLowPressureAwareness(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(normalized))
    return false

  return /continuity_hold=|continuity_policy=|embodiment_lanes=|missing_lanes/u.test(normalized)
    && /inward|lower_pressure|low-pressure|lipsync|voice/u.test(normalized)
}

function looksLikeRicherProjectClosureCarry(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(normalized))
    return false

  return looksLikeStructuredProjectContinuityFact(normalized)
    || /workingmemory|longtermmemoryrecall|semantic_recall|embedding|reindex|memory_dialogue_embodiment_closure|embodiment_scale_validation|分页|搜索|召回|短期|长期|治理入口|review|记忆闭环|语义召回|重建/u.test(normalized)
}

function looksLikeFullerProjectAndPhaseAwarenessLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(normalized))
    return false

  return looksLikeStructuredProjectContinuityFact(normalized)
    && /identity=|phase=|landed=|open=|next=|project_anchor=|memory_dialogue_embodiment_closure|embodiment_scale_validation/u.test(normalized)
}

function looksLikeCallbackSpecificSameHerProjectAwareness(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(normalized))
    return false

  return /callback/u.test(normalized)
    && looksLikeStructuredProjectContinuityFact(normalized)
    && /unfinished|landed|answer_compilation|response_surface|closure|continuity/u.test(normalized)
}

function resolvePreferredProjectStateSameHerSummary(input: {
  forcedProjectStateSameHerPreserve: string | null
  criticProjectStateSameHerPreserve: string | null
  carriedProjectSameHerSummary: string | null
  runtimeProjectSameHerSummary: string | null
  richerProjectClosureSameHerSummary: string | null
  projectStateSameHerSummary: string | null
  projectStateBriefSameHerSummary: string | null
  runtimeProjectAwarenessSummary: string | null
  governingProjectSummary: string | null
  runtimeProjectAwarenessExplicitlyRich: boolean
  richerProjectClosureCarryAvailable: boolean
}) {
  const {
    forcedProjectStateSameHerPreserve,
    criticProjectStateSameHerPreserve,
    carriedProjectSameHerSummary,
    runtimeProjectSameHerSummary,
    richerProjectClosureSameHerSummary,
    projectStateSameHerSummary,
    projectStateBriefSameHerSummary,
    runtimeProjectAwarenessSummary,
    governingProjectSummary,
    runtimeProjectAwarenessExplicitlyRich,
    richerProjectClosureCarryAvailable,
  } = input

  const forcedOrCriticOrEmbodiment
    = forcedProjectStateSameHerPreserve
      ?? criticProjectStateSameHerPreserve
      ?? (
        !runtimeProjectAwarenessExplicitlyRich
        && !looksLikeFullerProjectAndPhaseAwarenessLine(runtimeProjectAwarenessSummary)
        && !looksLikeFullerProjectAndPhaseAwarenessLine(governingProjectSummary)
        && carriedProjectSameHerSummary
        && looksLikeEmbodimentClosureHeadline(carriedProjectSameHerSummary)
          ? carriedProjectSameHerSummary
          : null
      )
  if (forcedOrCriticOrEmbodiment)
    return normalizeProjectStateSameHerSummary(forcedOrCriticOrEmbodiment) ?? forcedOrCriticOrEmbodiment

  if (runtimeProjectAwarenessExplicitlyRich && richerProjectClosureSameHerSummary)
    return richerProjectClosureSameHerSummary

  const sanitizedProjectStateSameHerSummary
    = projectStateSameHerSummary && looksLikeRicherProjectClosureCarry(projectStateSameHerSummary)
      ? null
      : projectStateSameHerSummary && isThinProjectAwarenessLine(projectStateSameHerSummary)
        ? null
        : projectStateSameHerSummary && looksLikeGenericSameHerShell(projectStateSameHerSummary)
          ? null
          : normalizeProjectStateSameHerSummary(projectStateSameHerSummary)
  const canonicalBriefSameHerSummary = looksLikeSameHerClosureSummary(projectStateBriefSameHerSummary)
    ? normalizeProjectStateSameHerSummary(projectStateBriefSameHerSummary)
    : null
  const hasGenericSameHerShell = Boolean(
    looksLikeGenericSameHerShell(projectStateSameHerSummary)
    || looksLikeGenericSameHerShell(runtimeProjectSameHerSummary)
    || looksLikeGenericSameHerShell(carriedProjectSameHerSummary),
  )
  const runtimeHasCanonicalSameHer
    = Boolean(
      runtimeProjectSameHerSummary
      && looksLikeSameHerClosureSummary(runtimeProjectSameHerSummary),
    )
  const carriedHasCanonicalSameHer
    = Boolean(
      carriedProjectSameHerSummary
      && looksLikeSameHerClosureSummary(carriedProjectSameHerSummary),
    )
  const canonicalSameHerSummary
    = carriedHasCanonicalSameHer
      ? normalizeProjectStateSameHerSummary(carriedProjectSameHerSummary)
      : runtimeHasCanonicalSameHer
        ? normalizeProjectStateSameHerSummary(runtimeProjectSameHerSummary)
        : looksLikeSameHerClosureSummary(sanitizedProjectStateSameHerSummary)
          ? normalizeProjectStateSameHerSummary(sanitizedProjectStateSameHerSummary)
          : null
  const governingProjectExplicitlyRich = looksLikeFullerProjectAndPhaseAwarenessLine(governingProjectSummary)
  const runtimeAwarenessExplicitlyRich = looksLikeFullerProjectAndPhaseAwarenessLine(runtimeProjectAwarenessSummary)
  const runtimeHasExplicitRicherAwareness
    = runtimeProjectAwarenessExplicitlyRich
      || (governingProjectExplicitlyRich && runtimeAwarenessExplicitlyRich)

  if (
    canonicalSameHerSummary
    && richerProjectClosureCarryAvailable
    && runtimeHasExplicitRicherAwareness
  ) {
    return richerProjectClosureSameHerSummary ?? canonicalSameHerSummary
  }

  if (canonicalSameHerSummary && richerProjectClosureCarryAvailable)
    return canonicalSameHerSummary

  if (looksLikeRicherLivingSelfSameHerLine(runtimeProjectSameHerSummary))
    return runtimeProjectSameHerSummary

  if (canonicalSameHerSummary)
    return canonicalSameHerSummary

  if (
    hasGenericSameHerShell
    && canonicalBriefSameHerSummary
    && (richerProjectClosureCarryAvailable || runtimeHasExplicitRicherAwareness)
  ) {
    return canonicalBriefSameHerSummary
  }

  if (
    carriedProjectSameHerSummary
    && /What has already landed is|This reply should keep moving toward/u.test(carriedProjectSameHerSummary)
  ) {
    return null
  }

  if (looksLikeSameHerClosureSummary(sanitizedProjectStateSameHerSummary))
    return sanitizedProjectStateSameHerSummary

  return sanitizedProjectStateSameHerSummary
}

const REPAIR_BEFORE_CLOSENESS_CALLBACK_CLOSURE_SUMMARY
  = 'closure_policy=repair_before_closeness; callback=current_thread; repair=settle_first; space=leave_room; widening=defer_closeness'
const REST_PROTECTIVE_CALLBACK_CLOSURE_SUMMARY
  = 'closure_policy=rest_protective; callback=current_thread; rest=hold_first; space=leave_room; widening=defer_warmth_payoff_closeness'

function looksLikeRepairBeforeClosenessClosureSummary(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(normalized))
    return false
  if (/closure_policy=repair_before_closeness/u.test(normalized))
    return true

  return (
    /repair-before-closeness|repair before closeness|repair-first|let repair settle|修复优先|先修复再靠近|先把身体收稳/u.test(normalized)
    && /same callback|same thread|same living line|callback repair seam|callback repair line|same repair line|同一条线|修补线/u.test(normalized)
    && /leave room|before widening closeness|before warmth widens|room settles|留一点空间|留空间|不要突然放宽/u.test(normalized)
  )
}

function carriesRepairBeforeClosenessClosureSummary(values: Array<string | null | undefined>) {
  const safeValues = values.filter(value => !containsAlicizationFixedTemplateResidue(value))
  const combined = safeValues
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()

  if (!combined)
    return false

  return (
    /closure_policy=repair_before_closeness/u.test(combined)
    || (
      /repair-before-closeness|repair before closeness|repair-first|let repair settle|修复优先|先修复再靠近|先把身体收稳/u.test(combined)
      && /same callback|same thread|same living line|callback repair seam|callback repair line|same repair line|同一条线|修补线/u.test(combined)
      && /leave room|before widening closeness|before warmth widens|room settles|留一点空间|留空间|不要突然放宽/u.test(combined)
    )
  )
}

function resolvePreferredRepairBeforeClosenessClosureSummary(values: Array<string | null | undefined>) {
  if (!carriesRepairBeforeClosenessClosureSummary(values))
    return null

  return REPAIR_BEFORE_CLOSENESS_CALLBACK_CLOSURE_SUMMARY
}

function looksLikeRestProtectiveClosureSummary(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(normalized))
    return false
  if (/closure_policy=rest_protective/u.test(normalized))
    return true

  return (
    /rest-protective|rest protection|fatigue-aware|先让休息保护|疲惫感先缓住/u.test(normalized)
    && /same callback|same thread|same living line|fatigue-aware line|same-thread continuation|同一条线/u.test(normalized)
    && /leave room|before widening warmth|before widening closeness|payoff framing|留一点空间|别把温度拉近/u.test(normalized)
  )
}

function carriesRestProtectiveClosureSummary(values: Array<string | null | undefined>) {
  const safeValues = values.filter(value => !containsAlicizationFixedTemplateResidue(value))
  const combined = safeValues
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()

  if (!combined)
    return false

  return (
    /closure_policy=rest_protective/u.test(combined)
    || (
      /rest-protective|rest protection|fatigue-aware|先让休息保护|疲惫感先缓住/u.test(combined)
      && /same callback|same thread|same living line|fatigue-aware line|same-thread continuation|同一条线/u.test(combined)
      && /leave room|before widening warmth|before widening closeness|payoff framing|留一点空间|别把温度拉近/u.test(combined)
    )
  )
}

function resolvePreferredRestProtectiveClosureSummary(values: Array<string | null | undefined>) {
  if (!carriesRestProtectiveClosureSummary(values))
    return null

  return REST_PROTECTIVE_CALLBACK_CLOSURE_SUMMARY
}

function applyOpeningEmbodimentCarryToFullText(input: {
  fullText: string
  realization: AlicizationResolvedVisibleReply['realization']
}) {
  const onset = input.realization.openingEmbodimentAudit
  if (!onset)
    return input.fullText

  const parsed = parseJsonObjectFromText(input.fullText)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    return input.fullText

  const currentPerformance = (
    parsed.performance
    && typeof parsed.performance === 'object'
    && !Array.isArray(parsed.performance)
  )
    ? parsed.performance as Record<string, unknown>
    : null

  if (!currentPerformance)
    return input.fullText

  const nextPerformance = {
    ...currentPerformance,
    delivery: typeof currentPerformance.delivery === 'string' && currentPerformance.delivery.trim()
      ? currentPerformance.delivery
      : onset.delivery,
    facialCue: typeof currentPerformance.facialCue === 'string' && currentPerformance.facialCue.trim()
      ? currentPerformance.facialCue
      : onset.facialCue,
    actionCue: typeof currentPerformance.actionCue === 'string' && currentPerformance.actionCue.trim()
      ? currentPerformance.actionCue
      : onset.actionCue,
  }

  if (
    nextPerformance.delivery === currentPerformance.delivery
    && nextPerformance.facialCue === currentPerformance.facialCue
    && nextPerformance.actionCue === currentPerformance.actionCue
  ) {
    return input.fullText
  }

  return JSON.stringify({
    ...parsed,
    performance: nextPerformance,
  })
}

export async function settleAlicizationVisibleReply(input: {
  draft: AlicizationVisibleReplySettlementDraft
  prepared: AlicizationPreparedMainChatExecutionResult
  requireProviderMemoryUsage?: boolean
  forceRewrite?: boolean
  forceReasonCodes?: string[]
  appendRuntimeDebugLine?: (event: string, payload: Record<string, unknown>) => Promise<void> | void
  rewriteSecondPass: (
    input: AlicizationSecondPassRetryInput,
  ) => Promise<AlicizationSecondPassRewriteResult | null>
}): Promise<AlicizationVisibleReplySettlementResult> {
  let settlementDraft = input.draft
  if (input.requireProviderMemoryUsage) {
    const initialValidation = validateAlicizationProviderSettlementPayload({
      fullText: settlementDraft.fullText,
      prepared: input.prepared,
    })
    if (!initialValidation.valid) {
      const rewritten = await input.rewriteSecondPass({
        candidate: settlementDraft.fullText,
        reasonCodes: mapAlicizationSecondPassReasonCodes(initialValidation.issues),
        prepared: input.prepared,
        toolFacts: readAlicizationSecondPassToolFacts(input.prepared),
      })
      const rewrittenValidation = rewritten
        ? validateAlicizationProviderSettlementPayload({
            fullText: rewritten.fullText,
            prepared: input.prepared,
          })
        : null
      if (!rewritten || !rewrittenValidation?.valid) {
        throw new AlicizationVisibleReplySettlementBlockedError(
          `provider-settlement-invalid:${rewrittenValidation?.issues.join(',') || initialValidation.issues.join(',')}`,
          null,
        )
      }
      settlementDraft = {
        fullText: rewritten.fullText,
        visibleReplyExecution: rewritten.visibleReplyExecution,
      }
    }
  }

  const currentConsciousFrame = input.prepared.runtimeSurface?.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame ?? null
  const currentConsciousProjectState = currentConsciousFrame?.projectState ?? null

  let closed: AlicizationVisibleReplyClosureResult | null
  try {
    closed = await closeAlicizationVisibleReply({
      draft: settlementDraft,
      prepared: input.prepared,
      forceRewrite: input.forceRewrite,
      forceReasonCodes: input.forceReasonCodes,
      appendRuntimeDebugLine: input.appendRuntimeDebugLine,
      rewriteSecondPass: input.rewriteSecondPass,
    })
  }
  catch (error) {
    if (error instanceof AlicizationVisibleReplyClosureBlockedError) {
      throw new AlicizationVisibleReplySettlementBlockedError(
        error.message,
        error.closure,
      )
    }
    throw error
  }
  if (!closed) {
    throw new AlicizationVisibleReplySettlementBlockedError(
      'visible-reply-settlement-not-produced',
      null,
    )
  }

  const selfAuthority = resolvePreparedRuntimeSelfContinuityAuthority(input.prepared) ?? null
  const runtimeProjectStateSurface = resolvePreparedRuntimeProjectStateSnapshot(input.prepared)
  const runtimeProjectStateContract = input.prepared.mindTurnContract?.projectState ?? null
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const runtimeProjectStateContractWithCarry = runtimeProjectStateContract as (typeof runtimeProjectStateContract & {
    sameHerDriftRisk?: string | null
  }) | null
  const canonicalProjectState = resolvePreparedRuntimeProjectStateSnapshot(input.prepared)
  const runtimeProjectStateSurfaceWithCarry = runtimeProjectStateSurface as (typeof runtimeProjectStateSurface & {
    sameHerDriftRisk?: string | null
    companionBriefingLine?: string | null
    preDialogueAwarenessSummary?: string | null
  }) | null
  const canonicalProjectStateWithCarry = canonicalProjectState as (typeof canonicalProjectState & {
    sameHerDriftRisk?: string | null
    companionBriefingLine?: string | null
    preDialogueAwarenessSummary?: string | null
  }) | null
  const selfAuthoritySummary = typeof (selfAuthority as { authoritySummary?: unknown } | null)?.authoritySummary === 'string'
    ? (selfAuthority as { authoritySummary?: string | null } | null)?.authoritySummary?.trim() ?? null
    : null
  const selfAuthorityClosenessPosture = typeof (selfAuthority as { closenessPosture?: unknown } | null)?.closenessPosture === 'string'
    ? (selfAuthority as { closenessPosture?: string | null } | null)?.closenessPosture?.trim() ?? null
    : null
  const existingProjectStateAudit = input.prepared.replyRealization?.projectStateAudit ?? null
  const forcedProjectStateSameHerPreserve = null
  const criticProjectStateSameHerPreserve = closed.critic.mustPreserve.find(looksLikeProjectStateSameHerPreserveText) ?? null
  const fixedProjectStateSameHerPreserveResidue = Boolean(
    closed.critic.mustPreserve.some(looksLikeFixedProjectStateSameHerPreserveText),
  )
  const runtimeProjectSameHerSummary
    = typeof runtimeProjectStateSurface?.sameHerSelfLine === 'string' && runtimeProjectStateSurface.sameHerSelfLine.trim()
      ? runtimeProjectStateSurface.sameHerSelfLine.trim()
      : typeof runtimeProjectStateContract?.sameHerSelfLine === 'string' && runtimeProjectStateContract.sameHerSelfLine.trim()
        ? runtimeProjectStateContract.sameHerSelfLine.trim()
        : null
  const carriedProjectSameHerSummary = existingProjectStateAudit?.sameHerSummary ?? null
  const positiveRuntimeProjectSameHerSummary
    = fixedProjectStateSameHerPreserveResidue
      ? normalizePositiveProjectStateAuditText(runtimeProjectSameHerSummary)
      : excludeFixedTemplateProjectStateAuditText(runtimeProjectSameHerSummary)
  const positiveCarriedProjectSameHerSummary
    = fixedProjectStateSameHerPreserveResidue
      ? normalizePositiveProjectStateAuditText(carriedProjectSameHerSummary)
      : excludeFixedTemplateProjectStateAuditText(carriedProjectSameHerSummary)
  const carriedProjectSameHerHoldDetail = readProjectStateAuditText(existingProjectStateAudit?.sameHerHoldDetail)
  const carriedProjectContinuityArcStage = readProjectStateAuditText(existingProjectStateAudit?.continuityArcStage)
  const carriedProjectContinuityCue = readProjectStateAuditText(existingProjectStateAudit?.continuityCue)
  const projectStateLandedProgressSummary
    = existingProjectStateAudit?.landedProgressSummary
      ?? (typeof runtimeProjectStateSurface?.latestLandedProgress === 'string' && runtimeProjectStateSurface.latestLandedProgress.trim()
        ? runtimeProjectStateSurface.latestLandedProgress.trim()
        : typeof runtimeProjectStateContract?.latestLandedProgress === 'string' && runtimeProjectStateContract.latestLandedProgress.trim()
          ? runtimeProjectStateContract.latestLandedProgress.trim()
          : canonicalProjectState.latestLandedProgress
            ?? null)
  const projectStateCurrentPhaseSummary
    = existingProjectStateAudit?.currentPhaseSummary
      ?? (typeof runtimeProjectStateSurface?.currentPhase === 'string' && runtimeProjectStateSurface.currentPhase.trim()
        ? runtimeProjectStateSurface.currentPhase.trim()
        : typeof runtimeProjectStateContract?.currentPhase === 'string' && runtimeProjectStateContract.currentPhase.trim()
          ? runtimeProjectStateContract.currentPhase.trim()
          : canonicalProjectState.currentPhase
            ?? null)
  const projectStateOpenClosureSummary
    = existingProjectStateAudit?.openClosureSummary
      ?? (typeof runtimeProjectStateSurface?.primaryOpenLoop === 'string' && runtimeProjectStateSurface.primaryOpenLoop.trim()
        ? runtimeProjectStateSurface.primaryOpenLoop.trim()
        : typeof runtimeProjectStateContract?.primaryOpenLoop === 'string' && runtimeProjectStateContract.primaryOpenLoop.trim()
          ? runtimeProjectStateContract.primaryOpenLoop.trim()
          : canonicalProjectState.primaryOpenLoop
            ?? null)
  const projectStateNextClosureTargetSummary
    = existingProjectStateAudit?.nextClosureTargetSummary
      ?? (typeof runtimeProjectStateSurface?.nextClosureTarget === 'string' && runtimeProjectStateSurface.nextClosureTarget.trim()
        ? runtimeProjectStateSurface.nextClosureTarget.trim()
        : typeof runtimeProjectStateContract?.nextClosureTarget === 'string' && runtimeProjectStateContract.nextClosureTarget.trim()
          ? runtimeProjectStateContract.nextClosureTarget.trim()
          : canonicalProjectState.nextClosureTarget
            ?? null)
  const richerProjectClosureCarryAvailable
    = looksLikeRicherProjectClosureCarry(projectStateLandedProgressSummary)
      || looksLikeRicherProjectClosureCarry(projectStateOpenClosureSummary)
      || looksLikeRicherProjectClosureCarry(projectStateNextClosureTargetSummary)
  const projectStateBriefCanonicalSameHerSummary = looksLikeSameHerClosureSummary(projectStateBrief.sameHerSelfLine)
    ? projectStateBrief.sameHerSelfLine
    : null
  const rawContractProjectStateSameHerSummary
    = typeof runtimeProjectStateContract?.sameHerSelfLine === 'string' && runtimeProjectStateContract.sameHerSelfLine.trim()
      ? runtimeProjectStateContract.sameHerSelfLine.trim()
      : null
  const runtimeProjectSameHerComesFromFixedContractResidue
    = fixedProjectStateSameHerPreserveResidue
      && containsAlicizationFixedTemplateResidue(rawContractProjectStateSameHerSummary)
      && !looksLikeIndependentStructuredSameHerSignal(rawContractProjectStateSameHerSummary)
      && !looksLikeIndependentStructuredSameHerSignal(runtimeProjectSameHerSummary)
  const independentStructuredSameHerSignal = [
    forcedProjectStateSameHerPreserve,
    criticProjectStateSameHerPreserve,
    positiveCarriedProjectSameHerSummary,
    runtimeProjectSameHerComesFromFixedContractResidue ? null : positiveRuntimeProjectSameHerSummary,
    existingProjectStateAudit?.sameHerHoldDetail ?? null,
    existingProjectStateAudit?.continuityCue ?? null,
    existingProjectStateAudit?.continuityArcStage ?? null,
  ].some(looksLikeIndependentStructuredSameHerSignal)
  const canonicalProjectStateSameHerSelfLine = excludeFixedTemplateProjectStateAuditText(canonicalProjectState.sameHerSelfLine)
  const allowCanonicalSameHerFallback
    = (!fixedProjectStateSameHerPreserveResidue || independentStructuredSameHerSignal)
      && Boolean(canonicalProjectStateSameHerSelfLine)
  const canonicalSameHerSummary
    = looksLikeSameHerClosureSummary(positiveCarriedProjectSameHerSummary)
      ? positiveCarriedProjectSameHerSummary
      : !runtimeProjectSameHerComesFromFixedContractResidue && looksLikeSameHerClosureSummary(positiveRuntimeProjectSameHerSummary)
          ? positiveRuntimeProjectSameHerSummary
          : allowCanonicalSameHerFallback && looksLikeSameHerClosureSummary(canonicalProjectStateSameHerSelfLine)
            ? canonicalProjectStateSameHerSelfLine
            : null
  const projectStateSameHerSummary = forcedProjectStateSameHerPreserve
    ?? criticProjectStateSameHerPreserve
    ?? (
      !runtimeProjectSameHerComesFromFixedContractResidue
      && looksLikeRicherLivingSelfSameHerLine(positiveRuntimeProjectSameHerSummary)
      && scoreProjectSameHerLine(positiveRuntimeProjectSameHerSummary) >= scoreProjectSameHerLine(positiveCarriedProjectSameHerSummary) + 2
        ? positiveRuntimeProjectSameHerSummary
        ?? positiveCarriedProjectSameHerSummary
        ?? null
        : canonicalSameHerSummary
          ?? (
            positiveCarriedProjectSameHerSummary
            && !looksLikeRicherProjectClosureCarry(positiveCarriedProjectSameHerSummary)
              ? positiveCarriedProjectSameHerSummary
              : null
          )
          ?? (runtimeProjectSameHerComesFromFixedContractResidue ? null : positiveRuntimeProjectSameHerSummary)
          ?? (allowCanonicalSameHerFallback ? canonicalProjectStateSameHerSelfLine : null)
          ?? null
    )
  const projectStateSameHerDriftRiskSummary
    = existingProjectStateAudit?.sameHerDriftRiskSummary
      ?? (typeof runtimeProjectStateSurfaceWithCarry?.sameHerDriftRisk === 'string' && runtimeProjectStateSurfaceWithCarry.sameHerDriftRisk.trim()
        ? runtimeProjectStateSurfaceWithCarry.sameHerDriftRisk.trim()
        : typeof runtimeProjectStateContractWithCarry?.sameHerDriftRisk === 'string' && runtimeProjectStateContractWithCarry.sameHerDriftRisk.trim()
          ? runtimeProjectStateContractWithCarry.sameHerDriftRisk.trim()
          : canonicalProjectStateWithCarry?.sameHerDriftRisk
            ?? null)
  const forcedProjectStateClosurePreserve = null
  const criticProjectStateClosurePreserve = closed.critic.mustPreserve.find(value =>
    looksLikeRepairBeforeClosenessClosureSummary(value) || looksLikeRestProtectiveClosureSummary(value),
  ) ?? null
  const runtimeProjectClosureSummary
    = typeof runtimeProjectStateSurface?.nextClosureTarget === 'string' && runtimeProjectStateSurface.nextClosureTarget.trim()
      ? runtimeProjectStateSurface.nextClosureTarget.trim()
      : typeof runtimeProjectStateContract?.nextClosureTarget === 'string' && runtimeProjectStateContract.nextClosureTarget.trim()
        ? runtimeProjectStateContract.nextClosureTarget.trim()
        : typeof input.prepared.mindTurnContract?.governingFocus === 'string' && input.prepared.mindTurnContract.governingFocus.trim()
          ? input.prepared.mindTurnContract.governingFocus.trim()
          : null
  const projectStateClosureSummary = resolvePreferredRepairBeforeClosenessClosureSummary([
    fixedProjectStateSameHerPreserveResidue ? null : forcedProjectStateClosurePreserve,
    fixedProjectStateSameHerPreserveResidue ? null : criticProjectStateClosurePreserve,
    runtimeProjectClosureSummary,
    input.prepared.mindTurnContract?.emotionalClosureCue ?? null,
    projectStateOpenClosureSummary,
    runtimeProjectSameHerComesFromFixedContractResidue ? null : positiveRuntimeProjectSameHerSummary,
  ]) ?? resolvePreferredRestProtectiveClosureSummary([
    fixedProjectStateSameHerPreserveResidue ? null : forcedProjectStateClosurePreserve,
    fixedProjectStateSameHerPreserveResidue ? null : criticProjectStateClosurePreserve,
    runtimeProjectClosureSummary,
    input.prepared.mindTurnContract?.emotionalClosureCue ?? null,
    projectStateOpenClosureSummary,
    runtimeProjectSameHerComesFromFixedContractResidue ? null : positiveRuntimeProjectSameHerSummary,
  ])
  const runtimeProjectAwarenessSummary = resolvePreparedRuntimeProjectPreDialogueAwarenessSummary(input.prepared)
  const carriedProjectAwarenessSummary = existingProjectStateAudit?.preDialogueAwarenessSummary ?? null
  const governingProjectSummary = input.prepared.mindTurnContract?.governingProject ?? null
  const callbackSpecificProjectAwarenessSummary = [
    currentConsciousProjectState?.preDialogueAwarenessLine ?? null,
    currentConsciousProjectState?.preDialogueAwarenessSummary ?? null,
    runtimeProjectAwarenessSummary,
    typeof runtimeProjectStateContract?.preDialogueAwarenessLine === 'string'
      ? runtimeProjectStateContract.preDialogueAwarenessLine
      : null,
    typeof runtimeProjectStateContract?.preDialogueAwarenessSummary === 'string'
      ? runtimeProjectStateContract.preDialogueAwarenessSummary
      : null,
    carriedProjectAwarenessSummary,
  ]
    .map(readProjectStateAuditText)
    .find(looksLikeCallbackSpecificSameHerProjectAwareness)
    ?? null
  const richerProjectClosureAwarenessReanchor
    = richerProjectClosureCarryAvailable
      ? buildAlicizationProjectPreDialogueAwarenessLine({
          identity: canonicalProjectState.identity ?? '',
          currentPhase: projectStateCurrentPhaseSummary ?? canonicalProjectState.currentPhase ?? '',
          latestLandedProgress: projectStateLandedProgressSummary ?? canonicalProjectState.latestLandedProgress ?? '',
          primaryOpenLoop: projectStateOpenClosureSummary ?? canonicalProjectState.primaryOpenLoop ?? '',
          nextClosureTarget: projectStateNextClosureTargetSummary ?? canonicalProjectState.nextClosureTarget ?? '',
          sameHerSelfLine: (runtimeProjectSameHerComesFromFixedContractResidue ? null : positiveRuntimeProjectSameHerSummary) ?? canonicalProjectStateSameHerSelfLine ?? '',
        })
      : null
  const richerProjectClosureSameHerSummary = richerProjectClosureAwarenessReanchor
  const runtimeProjectAwarenessExplicitlyRich
    = Boolean(
      runtimeProjectAwarenessSummary
      && !isThinProjectAwarenessLine(runtimeProjectAwarenessSummary)
      && !looksLikeSameHerClosureSummary(runtimeProjectAwarenessSummary)
      && !looksLikeEmbodimentClosureHeadline(runtimeProjectAwarenessSummary)
      && looksLikeFullerProjectAndPhaseAwarenessLine(runtimeProjectAwarenessSummary),
    )
  const governingProjectExplicitlyRich = looksLikeFullerProjectAndPhaseAwarenessLine(governingProjectSummary)
  const richerSameHerAugmentationAuthority
    = runtimeProjectAwarenessExplicitlyRich
      && governingProjectExplicitlyRich
  const preferredProjectStateSameHerSummary = resolvePreferredProjectStateSameHerSummary({
    forcedProjectStateSameHerPreserve,
    criticProjectStateSameHerPreserve,
    carriedProjectSameHerSummary: positiveCarriedProjectSameHerSummary,
    runtimeProjectSameHerSummary: runtimeProjectSameHerComesFromFixedContractResidue ? null : positiveRuntimeProjectSameHerSummary,
    richerProjectClosureSameHerSummary,
    projectStateSameHerSummary,
    projectStateBriefSameHerSummary: projectStateBrief.sameHerSelfLine,
    runtimeProjectAwarenessSummary,
    governingProjectSummary,
    runtimeProjectAwarenessExplicitlyRich,
    richerProjectClosureCarryAvailable,
  })
  const normalizedPreferredProjectStateSameHerSummary
    = preferredProjectStateSameHerSummary
      && looksLikeFullerProjectAndPhaseAwarenessLine(preferredProjectStateSameHerSummary)
      ? richerProjectClosureSameHerSummary
      ?? canonicalSameHerSummary
      ?? projectStateSameHerSummary
      : preferredProjectStateSameHerSummary
  const finalProjectStateSameHerSummaryBase
    = canonicalSameHerSummary
      && richerProjectClosureCarryAvailable
      && !richerSameHerAugmentationAuthority
      && !looksLikeEmbodimentClosureHeadline(positiveCarriedProjectSameHerSummary)
      && !looksLikeEmbodimentClosureHeadline(runtimeProjectSameHerComesFromFixedContractResidue ? null : positiveRuntimeProjectSameHerSummary)
      && !governingProjectSummary
      && (
        isThinProjectAwarenessLine(runtimeProjectAwarenessSummary)
        || isThinProjectAwarenessLine(carriedProjectAwarenessSummary)
        || looksLikeFullerProjectAndPhaseAwarenessLine(runtimeProjectAwarenessSummary)
      )
      ? canonicalSameHerSummary
      : normalizedPreferredProjectStateSameHerSummary
  const finalProjectStateSameHerSummary
    = forcedProjectStateSameHerPreserve
      ?? criticProjectStateSameHerPreserve
      ?? (runtimeProjectAwarenessExplicitlyRich ? canonicalSameHerSummary : null)
      ?? (
        looksLikeGenericSameHerShell(finalProjectStateSameHerSummaryBase)
        && projectStateBriefCanonicalSameHerSummary
        && (
          richerProjectClosureCarryAvailable
          || runtimeProjectAwarenessExplicitlyRich
          || governingProjectExplicitlyRich
          || looksLikeFullerProjectAndPhaseAwarenessLine(runtimeProjectAwarenessSummary)
          || looksLikeFullerProjectAndPhaseAwarenessLine(governingProjectSummary)
        )
          ? projectStateBriefCanonicalSameHerSummary
          : (
              looksLikeStructuredProjectCarrySameHerSummary(finalProjectStateSameHerSummaryBase)
              && looksLikeEmbodimentClosureHeadline(runtimeProjectAwarenessSummary)
              && canonicalSameHerSummary
                ? canonicalSameHerSummary
                : finalProjectStateSameHerSummaryBase
            )
      )
  const normalizedFinalProjectStateSameHerSummary
    = normalizeProjectStateSameHerSummary(finalProjectStateSameHerSummary)
  const shouldCanonicalizeSameHerProjectAwareness
    = !richerProjectClosureAwarenessReanchor
      && !looksLikeFullerProjectAndPhaseAwarenessLine(runtimeProjectAwarenessSummary)
      && (
        looksLikeSameHerClosureSummary(projectStateSameHerSummary)
        || looksLikeSameHerClosureSummary(finalProjectStateSameHerSummary)
        || looksLikeSameHerClosureSummary(runtimeProjectAwarenessSummary)
        || looksLikeSameHerClosureSummary(carriedProjectAwarenessSummary)
      )
  const structuredEmbodimentProjectAwarenessSummary = [
    runtimeProjectAwarenessSummary,
    carriedProjectAwarenessSummary,
  ].find(looksLikeStructuredEmbodimentContinuityFact) ?? null
  const canonicalProjectStatePreDialogueAwarenessLine = normalizePositiveProjectStateAuditText(canonicalProjectState.preDialogueAwarenessLine)
  const projectStatePreDialogueAwarenessSummary
    = structuredEmbodimentProjectAwarenessSummary
      ?? (shouldCanonicalizeSameHerProjectAwareness && canonicalProjectStatePreDialogueAwarenessLine
        ? canonicalProjectStatePreDialogueAwarenessLine
        : Math.max(
          scoreProjectAwarenessLine(runtimeProjectAwarenessSummary),
          scoreProjectAwarenessLine(carriedProjectAwarenessSummary),
        ) <= 0
          ? (
              looksLikeSameHerClosureSummary(runtimeProjectAwarenessSummary)
              || looksLikeSameHerClosureSummary(carriedProjectAwarenessSummary)
            )
              ? canonicalProjectStatePreDialogueAwarenessLine
              ?? runtimeProjectAwarenessSummary
              ?? carriedProjectAwarenessSummary
              ?? null
              : canonicalProjectStatePreDialogueAwarenessLine
                ?? runtimeProjectAwarenessSummary
                ?? carriedProjectAwarenessSummary
                ?? null
          : scoreProjectAwarenessLine(runtimeProjectAwarenessSummary) >= scoreProjectAwarenessLine(carriedProjectAwarenessSummary) + 2
            ? runtimeProjectAwarenessSummary
            ?? carriedProjectAwarenessSummary
            ?? canonicalProjectStatePreDialogueAwarenessLine
            ?? null
            : carriedProjectAwarenessSummary
              ?? runtimeProjectAwarenessSummary
              ?? canonicalProjectStatePreDialogueAwarenessLine
              ?? null)
  const preferredProjectStatePreDialogueAwarenessSummary
    = callbackSpecificProjectAwarenessSummary
      ?? (
        looksLikeStructuredEmbodimentContinuityFact(projectStatePreDialogueAwarenessSummary)
          ? projectStatePreDialogueAwarenessSummary
          : looksLikeCompactSameHerInwardLowPressureAwareness(projectStatePreDialogueAwarenessSummary)
            ? projectStatePreDialogueAwarenessSummary
            : looksLikeFullerProjectAndPhaseAwarenessLine(projectStatePreDialogueAwarenessSummary)
              && !looksLikeLegacyFixedProjectAwarenessTemplate(projectStatePreDialogueAwarenessSummary)
              && !looksLikeEmbodimentClosureHeadline(projectStatePreDialogueAwarenessSummary)
              ? projectStatePreDialogueAwarenessSummary
              : (
                  (isThinProjectAwarenessLine(projectStatePreDialogueAwarenessSummary)
                    || looksLikeSameHerClosureSummary(projectStatePreDialogueAwarenessSummary))
                  && richerProjectClosureAwarenessReanchor
                    ? richerProjectClosureAwarenessReanchor
                    : null
                ) ?? (
                  (isThinProjectAwarenessLine(projectStatePreDialogueAwarenessSummary)
                    || looksLikeSameHerClosureSummary(projectStatePreDialogueAwarenessSummary)
                    || looksLikeEmbodimentClosureHeadline(projectStatePreDialogueAwarenessSummary))
                  && canonicalProjectStatePreDialogueAwarenessLine
                    ? canonicalProjectStatePreDialogueAwarenessLine
                    : projectStatePreDialogueAwarenessSummary
                )
      )
  const projectStatePreDialogueAwarenessReanchor = buildAlicizationProjectPreDialogueAwarenessLine({
    identity: canonicalProjectState.identity ?? '',
    currentPhase: projectStateCurrentPhaseSummary ?? canonicalProjectState.currentPhase ?? '',
    latestLandedProgress: projectStateLandedProgressSummary ?? canonicalProjectState.latestLandedProgress ?? '',
    primaryOpenLoop: projectStateOpenClosureSummary ?? canonicalProjectState.primaryOpenLoop ?? '',
    nextClosureTarget: projectStateNextClosureTargetSummary ?? canonicalProjectState.nextClosureTarget ?? '',
    sameHerSelfLine: normalizedFinalProjectStateSameHerSummary ?? canonicalProjectStateSameHerSelfLine ?? '',
  })
  const finalProjectStatePreDialogueAwarenessSummary
    = callbackSpecificProjectAwarenessSummary
      ? projectStatePreDialogueAwarenessReanchor ?? preferredProjectStatePreDialogueAwarenessSummary
      : (
          preferredProjectStatePreDialogueAwarenessSummary
          && !isThinProjectAwarenessLine(preferredProjectStatePreDialogueAwarenessSummary)
          && !looksLikeLegacyFixedProjectAwarenessTemplate(preferredProjectStatePreDialogueAwarenessSummary)
          && (
            looksLikeFullerProjectAndPhaseAwarenessLine(preferredProjectStatePreDialogueAwarenessSummary)
            || looksLikeEmbodimentClosureHeadline(preferredProjectStatePreDialogueAwarenessSummary)
          )
            ? preferredProjectStatePreDialogueAwarenessSummary
            : (
                looksLikeSameHerClosureSummary(preferredProjectStatePreDialogueAwarenessSummary)
                && canonicalProjectStatePreDialogueAwarenessLine
              )
                ? canonicalProjectStatePreDialogueAwarenessLine
                : projectStatePreDialogueAwarenessReanchor ?? preferredProjectStatePreDialogueAwarenessSummary
        )
  const projectStateRelationshipTruthSummary
    = typeof (input.prepared.mindTurnContract as { relationshipTruthDoctrine?: unknown } | null | undefined)?.relationshipTruthDoctrine === 'string'
      && (input.prepared.mindTurnContract as { relationshipTruthDoctrine?: string | null } | null | undefined)?.relationshipTruthDoctrine?.trim()
      ? (input.prepared.mindTurnContract as { relationshipTruthDoctrine?: string | null } | null | undefined)?.relationshipTruthDoctrine?.trim() ?? null
      : null
  const realizedProjectStateSameHerSummary
    = normalizedFinalProjectStateSameHerSummary
      && looksLikeEmbodimentClosureHeadline(normalizedFinalProjectStateSameHerSummary)
      && looksLikeFullerProjectAndPhaseAwarenessLine(finalProjectStatePreDialogueAwarenessSummary)
      ? canonicalSameHerSummary
      : normalizedFinalProjectStateSameHerSummary

  const hasStrongProjectStateRewritePreserveAuthority = Boolean(
    carriedProjectSameHerHoldDetail
    || carriedProjectContinuityArcStage
    || carriedProjectContinuityCue
    || existingProjectStateAudit?.sameHerDriftRiskSummary
    || closed.critic.mustPreserve.some((value) => {
      const normalized = value.trim().toLowerCase()
      return normalized.includes('host-corrected same-person continuity')
        || normalized.includes('carry corrected same-person continuity forward')
        || normalized.includes('remembered host-confirmed resume')
        || normalized.includes('bounded confirmation boundary')
        || normalized.includes('permanent execution permission')
    }),
  )
  const finalProjectStateSameHerSummaryIsExistingAuthority = Boolean(
    normalizedFinalProjectStateSameHerSummary
    && (
      normalizedFinalProjectStateSameHerSummary === normalizeProjectStateSameHerSummary(carriedProjectSameHerSummary)
      || normalizedFinalProjectStateSameHerSummary === normalizeProjectStateSameHerSummary(runtimeProjectSameHerSummary)
    ),
  )
  const finalProjectAwarenessMatchesExistingAuthority = Boolean(
    finalProjectStatePreDialogueAwarenessSummary
    && [
      currentConsciousProjectState?.preDialogueAwarenessLine ?? null,
      currentConsciousProjectState?.preDialogueAwarenessSummary ?? null,
      runtimeProjectAwarenessSummary,
      typeof runtimeProjectStateContract?.preDialogueAwarenessLine === 'string'
        ? runtimeProjectStateContract.preDialogueAwarenessLine
        : null,
      typeof runtimeProjectStateContract?.preDialogueAwarenessSummary === 'string'
        ? runtimeProjectStateContract.preDialogueAwarenessSummary
        : null,
      carriedProjectAwarenessSummary,
    ]
      .map(readProjectStateAuditText)
      .filter(Boolean)
      .includes(finalProjectStatePreDialogueAwarenessSummary)
      && !isThinProjectAwarenessLine(finalProjectStatePreDialogueAwarenessSummary),
  )
  const replacedOlderCarriedProjectAwareness = Boolean(
    carriedProjectAwarenessSummary
    && finalProjectStatePreDialogueAwarenessSummary
    && carriedProjectAwarenessSummary !== finalProjectStatePreDialogueAwarenessSummary
    && (
      isThinProjectAwarenessLine(carriedProjectAwarenessSummary)
      || looksLikeSameHerClosureSummary(carriedProjectAwarenessSummary)
      || scoreProjectAwarenessLine(finalProjectStatePreDialogueAwarenessSummary)
      >= scoreProjectAwarenessLine(carriedProjectAwarenessSummary) + 2
    ),
  )
  const promotedFresherExistingProjectAwareness = replacedOlderCarriedProjectAwareness
    && finalProjectAwarenessMatchesExistingAuthority
    && finalProjectStateSameHerSummaryIsExistingAuthority
  const upgradedAwarenessOverCarriedEmbodimentHeadline = Boolean(
    carriedProjectSameHerSummary
    && looksLikeEmbodimentClosureHeadline(carriedProjectSameHerSummary)
    && finalProjectStateSameHerSummaryIsExistingAuthority
    && finalProjectStatePreDialogueAwarenessSummary
    && finalProjectAwarenessMatchesExistingAuthority
    && looksLikeFullerProjectAndPhaseAwarenessLine(finalProjectStatePreDialogueAwarenessSummary),
  )
  const replacedOlderCarriedSameHerWithRuntimeLivingSelf = Boolean(
    carriedProjectSameHerSummary
    && runtimeProjectSameHerSummary
    && normalizedFinalProjectStateSameHerSummary === normalizeProjectStateSameHerSummary(runtimeProjectSameHerSummary)
    && looksLikeRicherLivingSelfSameHerLine(runtimeProjectSameHerSummary)
    && scoreProjectSameHerLine(runtimeProjectSameHerSummary) >= scoreProjectSameHerLine(carriedProjectSameHerSummary) + 2,
  )
  const keptExistingCanonicalSameHerAuthorityWhileRicherCarrySurvived = Boolean(
    carriedProjectSameHerSummary
    && normalizedFinalProjectStateSameHerSummary === normalizeProjectStateSameHerSummary(carriedProjectSameHerSummary)
    && richerProjectClosureCarryAvailable
    && !callbackSpecificProjectAwarenessSummary
    && (
      isThinProjectAwarenessLine(runtimeProjectAwarenessSummary)
      || isThinProjectAwarenessLine(carriedProjectAwarenessSummary)
    ),
  )
  const projectStateRewriteClosureApplied
    = closed.closure.rewriteAttempted
      && closed.closure.rewriteSucceeded
      && closed.visibleReplyExecution.actualVisibleReplyAuthority === 'llm-second-pass-rewrite'
      && (hasStrongProjectStateRewritePreserveAuthority
        || !promotedFresherExistingProjectAwareness
        && !upgradedAwarenessOverCarriedEmbodimentHeadline
        && !replacedOlderCarriedSameHerWithRuntimeLivingSelf
        && !keptExistingCanonicalSameHerAuthorityWhileRicherCarrySurvived)
  const preparedForRealization = fixedProjectStateSameHerPreserveResidue && !independentStructuredSameHerSignal
    ? null
    : input.prepared

  const initialResolved = buildAlicizationResolvedVisibleReply({
    fullText: closed.fullText,
    visibleReplyExecution: closed.visibleReplyExecution,
    emotionalClosureCue: input.prepared.mindTurnContract?.emotionalClosureCue ?? null,
    selfAuthoritySummary,
    selfAuthorityClosenessPosture,
    projectStateSameHerSummary: realizedProjectStateSameHerSummary,
    projectStateSameHerHoldDetail: carriedProjectSameHerHoldDetail,
    projectStateContinuityArcStage: carriedProjectContinuityArcStage,
    projectStateContinuityCue: carriedProjectContinuityCue,
    projectStateCurrentPhaseSummary,
    projectStateLandedProgressSummary,
    projectStateOpenClosureSummary,
    projectStateSameHerDriftRiskSummary,
    projectStateClosureSummary,
    projectStateNextClosureTargetSummary,
    projectStateRelationshipTruthSummary,
    projectStatePreDialogueAwarenessSummary: finalProjectStatePreDialogueAwarenessSummary,
    projectStateRewriteClosureApplied,
    critic: closed.critic,
    closure: closed.closure,
    prepared: preparedForRealization,
  })
  const carriedFullText = applyOpeningEmbodimentCarryToFullText({
    fullText: initialResolved.fullText,
    realization: initialResolved.realization,
  })
  const resolved = carriedFullText === initialResolved.fullText
    ? initialResolved
    : buildAlicizationResolvedVisibleReply({
        fullText: carriedFullText,
        visibleReplyExecution: closed.visibleReplyExecution,
        emotionalClosureCue: input.prepared.mindTurnContract?.emotionalClosureCue ?? null,
        selfAuthoritySummary,
        selfAuthorityClosenessPosture,
        projectStateSameHerSummary: realizedProjectStateSameHerSummary,
        projectStateSameHerHoldDetail: carriedProjectSameHerHoldDetail,
        projectStateContinuityArcStage: carriedProjectContinuityArcStage,
        projectStateContinuityCue: carriedProjectContinuityCue,
        projectStateCurrentPhaseSummary,
        projectStateLandedProgressSummary,
        projectStateOpenClosureSummary,
        projectStateSameHerDriftRiskSummary,
        projectStateClosureSummary,
        projectStateNextClosureTargetSummary,
        projectStateRelationshipTruthSummary,
        projectStatePreDialogueAwarenessSummary: finalProjectStatePreDialogueAwarenessSummary,
        projectStateRewriteClosureApplied,
        prepared: preparedForRealization,
        critic: closed.critic,
        closure: closed.closure,
      })

  return {
    ...resolved,
    closureResult: closed,
  }
}
