import type { AlicizationVisibleReplyExecution } from '../../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'
import type { AlicizationVisibleReplyClosureResult } from './closure-orchestrator'
import type { AlicizationResolvedVisibleReply, AlicizationVisibleReplyClosureArtifact } from './realization-engine'
import type { AlicizationSecondPassRewriteResult } from './second-pass-rewrite'

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

  closeAlicizationVisibleReply,
} from './closure-orchestrator'
import {

  buildAlicizationResolvedVisibleReply,
} from './realization-engine'

export interface AlicizationVisibleReplySettlementDraft {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
}

export interface AlicizationVisibleReplySettlementResult extends AlicizationResolvedVisibleReply {
  closureResult: AlicizationVisibleReplyClosureResult
}

export class AlicizationVisibleReplySettlementBlockedError extends Error {
  constructor(message: string, readonly closure: AlicizationVisibleReplyClosureArtifact | null) {
    super(message)
    this.name = 'AlicizationVisibleReplySettlementBlockedError'
  }
}

function looksLikeProjectStateSameHerPreserveText(value: string) {
  const normalized = value.trim().toLowerCase()
  if (!normalized)
    return false

  const projectStateAnswerInstruction = (
    normalized.includes('answer project-state')
    || normalized.includes('project-state answer')
    || normalized.includes('project-state questions')
    || normalized.includes('project-state question')
    || normalized.includes('project-state status')
    || normalized.includes('project status')
    || normalized.includes('回答项目状态')
    || normalized.includes('项目状态回答')
  )
  || (
    (
      normalized.includes('project-state')
      || normalized.includes('这个项目')
      || normalized.includes('项目状态')
    )
    && (
      normalized.includes('detached project narrator shell')
      || normalized.includes('project narrator shell')
      || normalized.includes('项目旁白壳')
    )
  )

  if (!projectStateAnswerInstruction)
    return false

  return (
    normalized.includes('same-her')
    || normalized.includes('same her')
    || normalized.includes('one same-her')
    || normalized.includes('one same her')
    || normalized.includes('one continuous her')
    || normalized.includes('same living line')
    || normalized.includes('同一个 her')
    || normalized.includes('同一个她')
  )
}

function looksLikeProjectStateAnswerStancePreserveText(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return (
    normalized.includes('project-state')
    || normalized.includes('project status')
    || normalized.includes('project-summary')
    || normalized.includes('这个项目')
    || normalized.includes('项目状态')
  ) && (
    normalized.includes('same-her')
    || normalized.includes('same her')
    || normalized.includes('same living line')
    || normalized.includes('same digital-life line')
    || normalized.includes('same digital life line')
    || normalized.includes('one living line')
    || normalized.includes('同一条线')
    || normalized.includes('同一个 her')
    || normalized.includes('同一个她')
  )
}

function readProjectStateAuditText(value: unknown) {
  return typeof value === 'string' ? value.trim() || null : null
}

function scoreProjectAwarenessLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return 0

  const thinProjectAwarenessShell = isThinProjectAwarenessLine(normalized)
  let score = scoreAlicizationProjectAwarenessLine(normalized)
  if (/still belongs to one living her|still belongs to one living digital life|current screen|第一阶段|本地数字生命|连续性|记忆|执行|主动性|对话闭环|闭环|收住|还没闭环|还没有真正收住/u.test(normalized))
    score += 2
  if (thinProjectAwarenessShell)
    score -= 2
  if (
    thinProjectAwarenessShell
    && /before answering, keep the same digital life project in view|回答前先记住这是同一个她/u.test(normalized)
  )
    score -= 3
  return score
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

  return /some closure already landed|unfinished closure still needs|same living line/u.test(normalized)
    && /same phase 1 digital life|same digital life/u.test(normalized)
    && !/before answering/u.test(normalized)
}

function looksLikeStructuredProjectCarrySameHerSummary(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return (
    /what has already landed is|this reply should keep moving toward/u.test(normalized)
    && /same phase 1 digital life|same digital life|same living line|one continuous her|one living her/u.test(normalized)
  )
}

function scoreProjectSameHerLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return 0

  let score = normalized.length >= 120 ? 2 : normalized.length >= 72 ? 1 : 0
  if (/same digital life|same-her|one living her|one living digital life|one continuous her|同一个她|同一个 her/u.test(normalized))
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

  return /one living her|one living digital life|holding together mainly through|face|motion|voice|lipsync|cross-modal|embodiment closure/u.test(normalized)
}

function looksLikeEmbodimentClosureHeadline(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return /face and motion|face, motion|lipsync|voice|body line|living her|living audio thread|audible-body|audible body|cross-modal closure/u.test(normalized)
}

function looksLikeCompactSameHerInwardLowPressureAwareness(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return /same phase 1 digital life|same living line|same her|same-her|one continuous her/u.test(normalized)
    && /inward and low-pressure|same line inward|lipsync and voice rejoin/u.test(normalized)
}

function looksLikeRicherProjectClosureCarry(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return (
    /ordinary continuation|runtime project-state carry|answer-planner same-her continuity|memory, initiative, and embodiment|same-her closure seam|same living line|连续性|记忆|执行|主动性|具身|对话闭环|闭环|living line|同一个她|同一条线|收住/u.test(normalized)
    && !/before answering, keep the same digital life project in view|same digital life \| keep the closure seam explicit|回答前先记住|先记住这是同一个她|别把这条线忘了|别把这条线弄丢/u.test(normalized)
  )
}

function looksLikeFullerProjectAndPhaseAwarenessLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return (
    (
      /before answering|before i answer|remember:/u.test(normalized)
      || (
        /phase 1|local-first digital life|project|open loop|still-open closure|execution, memory, initiative, and embodiment|第一阶段|本地优先数字生命项目|数字生命项目|本地数字生命|连续性|记忆|执行|主动性|具身|对话闭环|还没有真正收住|还没闭环/u.test(normalized)
        && /same her|same-her|same living line|one living her|one continuous her|同一个她|同一个 her/u.test(normalized)
      )
    )
    && !/primary proving ground is apps\/stage-ta/u.test(normalized)
  )
}

function looksLikeCallbackSpecificSameHerProjectAwareness(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return /callback/u.test(normalized)
    && /same digital life|same phase 1 digital life|same her|same-her|same living line|closure seam|same closure line forward|one same her/u.test(normalized)
    && /phase 1|unfinished|still-open closure|still needs|landed|answer compilation|response-surface carry/u.test(normalized)
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
        carriedProjectSameHerSummary
        && looksLikeEmbodimentClosureHeadline(carriedProjectSameHerSummary)
          ? carriedProjectSameHerSummary
          : null
      )
  if (forcedOrCriticOrEmbodiment)
    return forcedOrCriticOrEmbodiment

  const sanitizedProjectStateSameHerSummary
    = projectStateSameHerSummary && looksLikeRicherProjectClosureCarry(projectStateSameHerSummary)
      ? null
      : projectStateSameHerSummary && isThinProjectAwarenessLine(projectStateSameHerSummary)
        ? null
        : projectStateSameHerSummary && looksLikeGenericSameHerShell(projectStateSameHerSummary)
          ? null
          : projectStateSameHerSummary
  const canonicalBriefSameHerSummary = looksLikeSameHerClosureSummary(projectStateBriefSameHerSummary)
    ? projectStateBriefSameHerSummary
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
      ? carriedProjectSameHerSummary
      : runtimeHasCanonicalSameHer
        ? runtimeProjectSameHerSummary
        : looksLikeSameHerClosureSummary(sanitizedProjectStateSameHerSummary)
          ? sanitizedProjectStateSameHerSummary
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
    return carriedProjectSameHerSummary
  }

  if (looksLikeSameHerClosureSummary(sanitizedProjectStateSameHerSummary))
    return sanitizedProjectStateSameHerSummary

  return sanitizedProjectStateSameHerSummary
}

const REPAIR_BEFORE_CLOSENESS_CALLBACK_CLOSURE_SUMMARY
  = 'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.'
const REST_PROTECTIVE_CALLBACK_CLOSURE_SUMMARY
  = 'Keep the same-thread continuation on the same living line, let rest protection hold first, and leave room before widening warmth, payoff framing, or closeness.'

function looksLikeRepairBeforeClosenessClosureSummary(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return (
    /repair-before-closeness|repair before closeness|repair-first|let repair settle|修复优先|先修复再靠近|先把身体收稳/u.test(normalized)
    && /same callback|same thread|same living line|callback repair seam|callback repair line|same repair line|同一条线|修补线/u.test(normalized)
    && /leave room|before widening closeness|before warmth widens|room settles|留一点空间|留空间|不要突然放宽/u.test(normalized)
  )
}

function carriesRepairBeforeClosenessClosureSummary(values: Array<string | null | undefined>) {
  const combined = values
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()

  if (!combined)
    return false

  return (
    /repair-before-closeness|repair before closeness|repair-first|let repair settle|修复优先|先修复再靠近|先把身体收稳/u.test(combined)
    && /same callback|same thread|same living line|callback repair seam|callback repair line|same repair line|同一条线|修补线/u.test(combined)
    && /leave room|before widening closeness|before warmth widens|room settles|留一点空间|留空间|不要突然放宽/u.test(combined)
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

  return (
    /rest-protective|rest protection|fatigue-aware|先让休息保护|疲惫感先缓住/u.test(normalized)
    && /same callback|same thread|same living line|fatigue-aware line|same-thread continuation|同一条线/u.test(normalized)
    && /leave room|before widening warmth|before widening closeness|payoff framing|留一点空间|别把温度拉近/u.test(normalized)
  )
}

function carriesRestProtectiveClosureSummary(values: Array<string | null | undefined>) {
  const combined = values
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()

  if (!combined)
    return false

  return (
    /rest-protective|rest protection|fatigue-aware|先让休息保护|疲惫感先缓住/u.test(combined)
    && /same callback|same thread|same living line|fatigue-aware line|same-thread continuation|同一条线/u.test(combined)
    && /leave room|before widening warmth|before widening closeness|payoff framing|留一点空间|别把温度拉近/u.test(combined)
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
  forceRewrite?: boolean
  forceReasonCodes?: string[]
  forceMustPreserve?: string[]
  rewriteSecondPass: (input: {
    fullText: string
    visibleReplyExecution: AlicizationVisibleReplyExecution
    forceRewrite: boolean
    forceReasonCodes: string[]
    mustPreserve: string[]
  }) => Promise<AlicizationSecondPassRewriteResult | null>
}): Promise<AlicizationVisibleReplySettlementResult> {
  const currentConsciousFrame = input.prepared.runtimeSurface?.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame ?? null
  const currentConsciousProjectState = currentConsciousFrame?.projectState ?? null
  const projectStateAnswerStancePreserve = looksLikeProjectStateAnswerStancePreserveText(currentConsciousFrame?.speakingIntention)
    ? currentConsciousFrame?.speakingIntention?.trim() ?? null
    : null
  const settlementForceMustPreserve = projectStateAnswerStancePreserve
    ? [
        ...(input.forceMustPreserve ?? []),
        projectStateAnswerStancePreserve,
      ]
    : input.forceMustPreserve

  const closed = await closeAlicizationVisibleReply({
    draft: input.draft,
    prepared: input.prepared,
    forceRewrite: input.forceRewrite,
    forceReasonCodes: input.forceReasonCodes,
    forceMustPreserve: settlementForceMustPreserve,
    rewriteSecondPass: input.rewriteSecondPass,
  })
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
  const forcedProjectStateSameHerPreserve = (settlementForceMustPreserve ?? []).find(looksLikeProjectStateSameHerPreserveText) ?? null
  const criticProjectStateSameHerPreserve = closed.critic.mustPreserve.find(looksLikeProjectStateSameHerPreserveText) ?? null
  const runtimeProjectSameHerSummary
    = typeof runtimeProjectStateSurface?.sameHerSelfLine === 'string' && runtimeProjectStateSurface.sameHerSelfLine.trim()
      ? runtimeProjectStateSurface.sameHerSelfLine.trim()
      : typeof runtimeProjectStateContract?.sameHerSelfLine === 'string' && runtimeProjectStateContract.sameHerSelfLine.trim()
        ? runtimeProjectStateContract.sameHerSelfLine.trim()
        : null
  const carriedProjectSameHerSummary = existingProjectStateAudit?.sameHerSummary ?? null
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
  const canonicalSameHerSummary
    = looksLikeSameHerClosureSummary(carriedProjectSameHerSummary)
      ? carriedProjectSameHerSummary
      : looksLikeSameHerClosureSummary(runtimeProjectSameHerSummary)
        ? runtimeProjectSameHerSummary
        : looksLikeSameHerClosureSummary(canonicalProjectState.sameHerSelfLine)
          ? canonicalProjectState.sameHerSelfLine
          : null
  const projectStateSameHerSummary = forcedProjectStateSameHerPreserve
    ?? criticProjectStateSameHerPreserve
    ?? (
      looksLikeRicherLivingSelfSameHerLine(runtimeProjectSameHerSummary)
      && scoreProjectSameHerLine(runtimeProjectSameHerSummary) >= scoreProjectSameHerLine(carriedProjectSameHerSummary) + 2
        ? runtimeProjectSameHerSummary
        ?? carriedProjectSameHerSummary
        ?? null
        : canonicalSameHerSummary
          ?? (
            carriedProjectSameHerSummary
            && !looksLikeRicherProjectClosureCarry(carriedProjectSameHerSummary)
              ? carriedProjectSameHerSummary
              : null
          )
          ?? runtimeProjectSameHerSummary
          ?? canonicalProjectState.sameHerSelfLine
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
  const forcedProjectStateClosurePreserve = (settlementForceMustPreserve ?? []).find(value =>
    looksLikeRepairBeforeClosenessClosureSummary(value) || looksLikeRestProtectiveClosureSummary(value),
  ) ?? null
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
    forcedProjectStateClosurePreserve,
    criticProjectStateClosurePreserve,
    runtimeProjectClosureSummary,
    input.prepared.mindTurnContract?.emotionalClosureCue ?? null,
    projectStateOpenClosureSummary,
    runtimeProjectSameHerSummary,
  ]) ?? resolvePreferredRestProtectiveClosureSummary([
    forcedProjectStateClosurePreserve,
    criticProjectStateClosurePreserve,
    runtimeProjectClosureSummary,
    input.prepared.mindTurnContract?.emotionalClosureCue ?? null,
    projectStateOpenClosureSummary,
    runtimeProjectSameHerSummary,
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
          sameHerSelfLine: runtimeProjectSameHerSummary ?? canonicalProjectState.sameHerSelfLine ?? '',
        })
      : null
  const richerProjectClosureSameHerSummary
    = richerProjectClosureCarryAvailable
      ? [
          runtimeProjectSameHerSummary ?? canonicalProjectState.sameHerSelfLine ?? '',
          projectStateLandedProgressSummary
            ? `What has already landed is ${projectStateLandedProgressSummary.charAt(0).toLowerCase()}${projectStateLandedProgressSummary.slice(1)}`
            : '',
          projectStateNextClosureTargetSummary
            ? `This reply should keep moving toward ${projectStateNextClosureTargetSummary}`
            : '',
        ]
          .filter(Boolean)
          .join('. ')
          .replace(/\s+/g, ' ')
          .trim()
      : null
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
    carriedProjectSameHerSummary,
    runtimeProjectSameHerSummary,
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
      && !looksLikeEmbodimentClosureHeadline(carriedProjectSameHerSummary)
      && !looksLikeEmbodimentClosureHeadline(runtimeProjectSameHerSummary)
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
  const shouldCanonicalizeSameHerProjectAwareness
    = !richerProjectClosureAwarenessReanchor
      && !looksLikeFullerProjectAndPhaseAwarenessLine(runtimeProjectAwarenessSummary)
      && (
        looksLikeSameHerClosureSummary(projectStateSameHerSummary)
        || looksLikeSameHerClosureSummary(finalProjectStateSameHerSummary)
        || looksLikeSameHerClosureSummary(runtimeProjectAwarenessSummary)
        || looksLikeSameHerClosureSummary(carriedProjectAwarenessSummary)
      )
  const projectStatePreDialogueAwarenessSummary
    = shouldCanonicalizeSameHerProjectAwareness && canonicalProjectState.preDialogueAwarenessLine
      ? canonicalProjectState.preDialogueAwarenessLine
      : Math.max(
        scoreProjectAwarenessLine(runtimeProjectAwarenessSummary),
        scoreProjectAwarenessLine(carriedProjectAwarenessSummary),
      ) <= 0
        ? (
            looksLikeSameHerClosureSummary(runtimeProjectAwarenessSummary)
            || looksLikeSameHerClosureSummary(carriedProjectAwarenessSummary)
          )
            ? canonicalProjectState.preDialogueAwarenessLine
            ?? runtimeProjectAwarenessSummary
            ?? carriedProjectAwarenessSummary
            ?? null
            : canonicalProjectState.preDialogueAwarenessLine
              ?? runtimeProjectAwarenessSummary
              ?? carriedProjectAwarenessSummary
              ?? null
        : scoreProjectAwarenessLine(runtimeProjectAwarenessSummary) >= scoreProjectAwarenessLine(carriedProjectAwarenessSummary) + 2
          ? runtimeProjectAwarenessSummary
          ?? carriedProjectAwarenessSummary
          ?? canonicalProjectState.preDialogueAwarenessLine
          ?? null
          : carriedProjectAwarenessSummary
            ?? runtimeProjectAwarenessSummary
            ?? canonicalProjectState.preDialogueAwarenessLine
            ?? null
  const preferredProjectStatePreDialogueAwarenessSummary
    = callbackSpecificProjectAwarenessSummary
      ?? (
        looksLikeCompactSameHerInwardLowPressureAwareness(projectStatePreDialogueAwarenessSummary)
          ? projectStatePreDialogueAwarenessSummary
          : looksLikeFullerProjectAndPhaseAwarenessLine(projectStatePreDialogueAwarenessSummary)
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
                && canonicalProjectState.preDialogueAwarenessLine
                  ? canonicalProjectState.preDialogueAwarenessLine
                  : projectStatePreDialogueAwarenessSummary
              )
      )
  const projectStatePreDialogueAwarenessReanchor = buildAlicizationProjectPreDialogueAwarenessLine({
    identity: canonicalProjectState.identity ?? '',
    currentPhase: projectStateCurrentPhaseSummary ?? canonicalProjectState.currentPhase ?? '',
    latestLandedProgress: projectStateLandedProgressSummary ?? canonicalProjectState.latestLandedProgress ?? '',
    primaryOpenLoop: projectStateOpenClosureSummary ?? canonicalProjectState.primaryOpenLoop ?? '',
    nextClosureTarget: projectStateNextClosureTargetSummary ?? canonicalProjectState.nextClosureTarget ?? '',
    sameHerSelfLine: finalProjectStateSameHerSummary ?? canonicalProjectState.sameHerSelfLine ?? '',
  })
  const finalProjectStatePreDialogueAwarenessSummary
    = callbackSpecificProjectAwarenessSummary
      ?? (
        preferredProjectStatePreDialogueAwarenessSummary
        && !isThinProjectAwarenessLine(preferredProjectStatePreDialogueAwarenessSummary)
        && (
          /before (?:i answer|answering|speaking)/iu.test(preferredProjectStatePreDialogueAwarenessSummary)
          || looksLikeFullerProjectAndPhaseAwarenessLine(preferredProjectStatePreDialogueAwarenessSummary)
          || looksLikeEmbodimentClosureHeadline(preferredProjectStatePreDialogueAwarenessSummary)
        )
          ? preferredProjectStatePreDialogueAwarenessSummary
          : (
              looksLikeSameHerClosureSummary(preferredProjectStatePreDialogueAwarenessSummary)
              && canonicalProjectState.preDialogueAwarenessLine
            )
              ? canonicalProjectState.preDialogueAwarenessLine
              : projectStatePreDialogueAwarenessReanchor ?? preferredProjectStatePreDialogueAwarenessSummary
      )
  const projectStateRelationshipTruthSummary
    = typeof (input.prepared.mindTurnContract as { relationshipTruthDoctrine?: unknown } | null | undefined)?.relationshipTruthDoctrine === 'string'
      && (input.prepared.mindTurnContract as { relationshipTruthDoctrine?: string | null } | null | undefined)?.relationshipTruthDoctrine?.trim()
      ? (input.prepared.mindTurnContract as { relationshipTruthDoctrine?: string | null } | null | undefined)?.relationshipTruthDoctrine?.trim() ?? null
      : null

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
    finalProjectStateSameHerSummary
    && (
      finalProjectStateSameHerSummary === carriedProjectSameHerSummary
      || finalProjectStateSameHerSummary === runtimeProjectSameHerSummary
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
    && finalProjectStateSameHerSummary === runtimeProjectSameHerSummary
    && looksLikeRicherLivingSelfSameHerLine(runtimeProjectSameHerSummary)
    && scoreProjectSameHerLine(runtimeProjectSameHerSummary) >= scoreProjectSameHerLine(carriedProjectSameHerSummary) + 2,
  )
  const keptExistingCanonicalSameHerAuthorityWhileRicherCarrySurvived = Boolean(
    carriedProjectSameHerSummary
    && finalProjectStateSameHerSummary === carriedProjectSameHerSummary
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

  const initialResolved = buildAlicizationResolvedVisibleReply({
    fullText: closed.fullText,
    visibleReplyExecution: closed.visibleReplyExecution,
    emotionalClosureCue: input.prepared.mindTurnContract?.emotionalClosureCue ?? null,
    selfAuthoritySummary,
    selfAuthorityClosenessPosture,
    projectStateSameHerSummary: finalProjectStateSameHerSummary,
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
    prepared: input.prepared,
    critic: closed.critic,
    closure: closed.closure,
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
        projectStateSameHerSummary: finalProjectStateSameHerSummary,
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
        prepared: input.prepared,
        critic: closed.critic,
        closure: closed.closure,
      })

  return {
    ...resolved,
    closureResult: closed,
  }
}
