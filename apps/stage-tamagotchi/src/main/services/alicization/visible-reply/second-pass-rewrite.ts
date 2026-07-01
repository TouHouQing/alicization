import type { AlicizationVisibleReplyRewriteRequest } from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationConversationTurnInput,
  AlicizationDialoguePerformancePayload,
  AlicizationMindTurnGovernance,
  AlicizationVisibleReplyExecution,
} from '../../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'
import type {
  MainGatewayResolvedConfig,
} from '../runtime-soul'

import {
  clampAlicizationPerformancePayloadToManifest,
  normalizeAlicizationEmotion,
  normalizeAlicizationPerformancePayload,
} from '../../../../shared/eventa'
import { preferStrongerContinuityClosureAuthority } from '../continuity-closure-authority'
import {
  resolvePreferredPreparedRuntimeSurface,
  resolvePreparedRuntimeProjectPreDialogueAwarenessSummary,
  resolvePreparedRuntimeProjectState,
  resolvePreparedRuntimeProjectStateSnapshot,
  resolvePreparedRuntimeSelfContinuityAuthority,
} from '../prepared-runtime-continuity'
import {
  buildAlicizationOpeningGuidanceBlockedReason,
  describeAlicizationOpeningGuidanceRewriteGuidance,
  resolveAlicizationOpeningGuidanceHoldDetail,
  resolveAlicizationOpeningGuidanceViolationReason,
} from '../proactive-opening-guidance'
import {
  buildAlicizationProjectPreDialogueAwarenessLine,
  buildAlicizationProjectStateClosureDashboard,
  buildAlicizationProjectStateExtraSystemBlocks,
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectStateBrief,
  scoreAlicizationProjectAwarenessLine,
} from '../project-state-brief'
import {
  buildGovernedMindThought,
  coerceConversationTurnToMindGovernedPayload,
} from '../runtime-governance'
import {
  mainChatVisibleReplySecondPassTimeoutMs,
  sanitizeText,
} from '../runtime-soul'
import { parseJsonObjectFromText } from '../runtime-transport-content'
import { resolveCanonicalStructuredProjectState } from '../structured-project-state'
import { buildAlicizationMindAuthoringFailureArtifact } from './authority-orchestrator'

interface AlicizationSecondPassProviderInput {
  chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']>
  messages: Message[]
  headers?: Record<string, string>
  timeoutMs: number
}

type AlicizationSecondPassRewriteRequestShape = AlicizationVisibleReplyRewriteRequest & {
  openingGuidanceHoldDetail?: string | null
  companionshipHoldMode?: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | 'rest-protective' | null
}

export interface AlicizationSecondPassRewriteResult {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  rewritten: boolean
  reason: string
  audit: Record<string, unknown> | null
}

export interface AlicizationSecondPassRewriteOptions {
  cardId: string
  turnId: string
  sessionId?: string | null
  userText: string
  rawFullText: string
  prepared: AlicizationPreparedMainChatExecutionResult
  visibleReplyExecution: AlicizationVisibleReplyExecution
  provider: (input: AlicizationSecondPassProviderInput) => Promise<{
    finishReason: string
    fullText: string
  }>
  forceRewrite?: boolean
  forceReasonCodes?: string[]
  mustPreserve?: string[]
  headers?: Record<string, string>
  appendRuntimeDebugLine?: (event: string, payload: Record<string, unknown>) => Promise<void> | void
}

function sanitizeBoundedText(raw: unknown, maxChars: number) {
  return sanitizeText(raw, '').slice(0, maxChars)
}

const SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS = 3200
const SECOND_PASS_EMBODIMENT_CLOSURE_MAX_CHARS = 3200

function formatRelationshipTruthDoctrineForRewrite(raw: unknown) {
  if (Array.isArray(raw)) {
    const joined = raw
      .map(item => sanitizeBoundedText(item, 220))
      .filter(Boolean)
      .join(' | ')
    return joined ? `Relationship truth doctrine: ${joined}` : null
  }

  const doctrine = sanitizeBoundedText(raw, 320)
  return doctrine ? `Relationship truth doctrine: ${doctrine}` : null
}

function looksLikeProjectStateAnswerStancePreserveLine(value: string | null | undefined) {
  const normalized = sanitizeBoundedText(value, 320).toLowerCase()
  if (!normalized)
    return false

  return (
    /project-state|project status|project-summary|项目状态|这个项目/u.test(normalized)
    && /same-her|same her|same living line|same digital-life line|same digital life line|one living line|同一条线|同一个 her|同一个她/u.test(normalized)
  )
}

function resolveProjectStateAnswerStancePreserveLine(values: string[]) {
  return values
    .map(value => sanitizeBoundedText(value, 320))
    .find(value => looksLikeProjectStateAnswerStancePreserveLine(value))
    ?? null
}

function carriesStructuredEmbodimentContinuityProof(value: string | null | undefined) {
  const normalized = sanitizeBoundedText(value, SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS).toLowerCase()
  if (!normalized)
    return false

  return /continuity=embodiment:(?:still-voiced-face-motion-line|still-voiced-motion-line|still-voiced-face-line|still-voiced-face-lipsync-line|still-voiced-motion-lipsync-line|audible-same-her-line|body-lipsync-voice-rejoin)(?:\+embodiment:[^|\s]+)?(?:\s*\||$)/i.test(normalized)
    || /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|(?:still-voiced-face-motion-line|still-voiced-motion-line|still-voiced-face-line|still-voiced-face-lipsync-line|still-voiced-motion-lipsync-line)/i.test(normalized)
    || /(?:same-segment\s+)?(?:face\+motion|face\+voice|motion\+voice|face\+lipsync\+voice|motion\+lipsync\+voice|body\+lipsync\+voice)\s+recovery@/i.test(normalized)
    || /pending-rejoin=body(?:\+face)?(?:\+motion)?(?:\+lipsync)?(?:\+voice)?(?:\s|\||$)/i.test(normalized)
}

function preferRicherProjectStateAuditText(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = sanitizeBoundedText(input.current, 320) || null
  const candidate = sanitizeBoundedText(input.candidate, 320) || null

  if (!current)
    return candidate
  if (!candidate)
    return current
  if (current === candidate)
    return current

  const preferredClosureAuthority = preferStrongerContinuityClosureAuthority(current, candidate)
  if (preferredClosureAuthority)
    return preferredClosureAuthority

  if (candidate.startsWith(current) && candidate.length >= current.length + 24)
    return candidate
  if (current.startsWith(candidate) && current.length >= candidate.length + 24)
    return current

  return candidate.length > current.length ? candidate : current
}

function resolveSecondPassProjectState(input?: {
  prepared?: AlicizationPreparedMainChatExecutionResult | null
}) {
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const rawPreparedProjectState = resolvePreparedRuntimeProjectState(input?.prepared)
  const runtimeProjectState = resolvePreparedRuntimeProjectStateSnapshot(input?.prepared)
  const canonicalProjectState = resolvePreparedRuntimeProjectStateSnapshot(input?.prepared)
  const resolvedProjectState = resolveCanonicalStructuredProjectState({
    normalizedProjectState: {
      identity: canonicalProjectState.identity,
      currentPhase: sanitizeBoundedText(runtimeProjectState.currentPhase, 220) || canonicalProjectState.currentPhase,
      latestLandedProgress: sanitizeBoundedText(
        rawPreparedProjectState?.latestLandedProgress
        ?? rawPreparedProjectState?.latestProgress
        ?? rawPreparedProjectState?.memoryClosureSummary
        ?? runtimeProjectState.latestLandedProgress
        ?? projectStateBrief.continuityProgressSummary
        ?? projectStateBrief.memoryAnthropomorphismProgress.at(-1)
        ?? canonicalProjectState.latestLandedProgress,
        16_000,
      ) || null,
      primaryOpenLoop: sanitizeBoundedText(
        rawPreparedProjectState?.primaryOpenLoop
        ?? runtimeProjectState.primaryOpenLoop
        ?? projectStateBrief.openLoops[0]
        ?? canonicalProjectState.primaryOpenLoop,
        16_000,
      ) || null,
      nextClosureTarget: sanitizeBoundedText(
        rawPreparedProjectState?.nextClosureTarget
        ?? runtimeProjectState.nextClosureTarget
        ?? projectStateBrief.nextClosureTarget
        ?? canonicalProjectState.nextClosureTarget,
        16_000,
      ) || projectStateBrief.nextClosureTarget,
      sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
      sameHerHoldDetail: sanitizeBoundedText(
        rawPreparedProjectState?.sameHerHoldDetail
        ?? runtimeProjectState.sameHerHoldDetail
        ?? canonicalProjectState.sameHerHoldDetail,
        320,
      ) || null,
      continuityArcStage: sanitizeBoundedText(
        rawPreparedProjectState?.continuityArcStage
        ?? runtimeProjectState.continuityArcStage
        ?? canonicalProjectState.continuityArcStage,
        120,
      ) || null,
      continuityCue: sanitizeBoundedText(
        rawPreparedProjectState?.continuityCue
        ?? runtimeProjectState.continuityCue
        ?? canonicalProjectState.continuityCue,
        220,
      ) || null,
      sameHerDriftRisk: sanitizeBoundedText(
        rawPreparedProjectState?.sameHerDriftRisk
        ?? runtimeProjectState.sameHerDriftRisk
        ?? projectStateBrief.sameHerDriftRisk,
        320,
      ) || projectStateBrief.sameHerDriftRisk,
      companionHeadlineLine: sanitizeBoundedText(
        rawPreparedProjectState?.companionHeadlineLine
        ?? runtimeProjectState.companionHeadlineLine
        ?? canonicalProjectState.companionHeadlineLine,
        SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
      ) || null,
      companionBriefingLine: sanitizeBoundedText(
        rawPreparedProjectState?.companionBriefingLine
        ?? runtimeProjectState.companionBriefingLine
        ?? canonicalProjectState.companionBriefingLine,
        SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
      ) || null,
    },
    runtimePreflightSummary: sanitizeBoundedText(
      rawPreparedProjectState?.preflightSummary
      ?? projectStateBrief.preflightSummary
      ?? runtimeProjectState.preflightSummary
      ?? canonicalProjectState.preflightSummary,
      SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
    ) || null,
    runtimePreDialogueAwarenessLine: sanitizeBoundedText(
      rawPreparedProjectState?.preDialogueAwarenessLine
      ?? rawPreparedProjectState?.awarenessLine
      ?? resolvePreparedRuntimeProjectPreDialogueAwarenessSummary(input?.prepared)
      ?? rawPreparedProjectState?.preflightSummary
      ?? canonicalProjectState.preDialogueAwarenessLine,
      SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
    ) || null,
  })

  const needsExplicitProjectReanchor = !/local-first digital life|project/iu.test(
    resolvedProjectState.preDialogueAwarenessLine ?? '',
  )
  && !looksLikeCallbackSpecificSameHerProjectAwareness(resolvedProjectState.preDialogueAwarenessLine ?? null)
  && isAlicizationThinProjectAwarenessLine(resolvedProjectState.preDialogueAwarenessLine ?? null)

  if (!needsExplicitProjectReanchor)
    return resolvedProjectState

  const rebuiltAwarenessLine = buildAlicizationProjectPreDialogueAwarenessLine({
    identity: resolvedProjectState.identity,
    currentPhase: resolvedProjectState.currentPhase,
    latestLandedProgress: resolvedProjectState.latestLandedProgress,
    primaryOpenLoop: resolvedProjectState.primaryOpenLoop,
    nextClosureTarget: resolvedProjectState.nextClosureTarget,
    sameHerSelfLine: resolvedProjectState.sameHerSelfLine,
  })

  if (!rebuiltAwarenessLine)
    return resolvedProjectState

  return {
    ...resolvedProjectState,
    preDialogueAwarenessLine: rebuiltAwarenessLine,
    preDialogueAwarenessSummary: rebuiltAwarenessLine,
    awarenessLine: rebuiltAwarenessLine,
    companionHeadlineLine: rebuiltAwarenessLine,
  }
}

function resolveSecondPassProjectStateContinuityFields(input: {
  prepared?: AlicizationPreparedMainChatExecutionResult | null
  projectState: Record<string, unknown>
}) {
  const contractProjectState = input.prepared?.mindTurnContract?.projectState as Record<string, unknown> | null | undefined
  const runtimeSurface = resolvePreferredPreparedRuntimeSurface(input.prepared?.runtimeSurface)
  const currentConsciousProjectState = runtimeSurface?.dialogue?.currentConsciousFrame?.projectState as Record<string, unknown> | null | undefined
  const rawRuntimeDigestProjectState = runtimeSurface?.raw?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined
  const cognitionRuntimeDigestProjectState = runtimeSurface?.cognition?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined
  const dialogueRuntimeDigestProjectState = runtimeSurface?.dialogue?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined
  const runtimeDigestProjectState = (
    rawRuntimeDigestProjectState
    ?? cognitionRuntimeDigestProjectState
    ?? dialogueRuntimeDigestProjectState
  ) as Record<string, unknown> | null | undefined

  const pickField = (field: 'sameHerHoldDetail' | 'continuityArcStage' | 'continuityCue', maxChars: number) => {
    return sanitizeBoundedText(
      contractProjectState?.[field]
      ?? currentConsciousProjectState?.[field]
      ?? runtimeDigestProjectState?.[field]
      ?? input.projectState[field],
      maxChars,
    ) || null
  }

  const sameHerHoldDetail = preferRicherProjectStateAuditText({
    current: contractProjectState?.sameHerHoldDetail,
    candidate: preferRicherProjectStateAuditText({
      current: currentConsciousProjectState?.sameHerHoldDetail,
      candidate: preferRicherProjectStateAuditText({
        current: rawRuntimeDigestProjectState?.sameHerHoldDetail,
        candidate: preferRicherProjectStateAuditText({
          current: cognitionRuntimeDigestProjectState?.sameHerHoldDetail,
          candidate: preferRicherProjectStateAuditText({
            current: dialogueRuntimeDigestProjectState?.sameHerHoldDetail,
            candidate: input.projectState.sameHerHoldDetail,
          }),
        }),
      }),
    }),
  })

  return {
    sameHerHoldDetail: sameHerHoldDetail ? sanitizeBoundedText(sameHerHoldDetail, 320) || null : null,
    continuityArcStage: pickField('continuityArcStage', 120),
    continuityCue: pickField('continuityCue', 220),
  }
}

function buildSecondPassCanonicalProjectStateSystemMessages(input: {
  projectState: ReturnType<typeof resolveSecondPassProjectState>
  continuityFields: ReturnType<typeof resolveSecondPassProjectStateContinuityFields>
}) {
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const identity = sanitizeBoundedText(input.projectState.identity, 220) || projectStateBrief.identity
  const currentPhase = sanitizeBoundedText(input.projectState.currentPhase, 160) || projectStateBrief.currentPhase
  const latestLandedProgress
    = sanitizeBoundedText(input.projectState.latestLandedProgress, 360)
      || projectStateBrief.continuityProgressSummary
      || projectStateBrief.latestProgress
  const primaryOpenLoop
    = sanitizeBoundedText(input.projectState.primaryOpenLoop, 220)
      || projectStateBrief.openLoops[0]
      || projectStateBrief.primaryOpenLoop
  const nextClosureTarget
    = sanitizeBoundedText(input.projectState.nextClosureTarget, 220)
      || projectStateBrief.nextClosureTarget

  const canonicalProjectStateBrief = {
    ...projectStateBrief,
    identity,
    currentPhase,
    latestProgress: latestLandedProgress,
    primaryOpenLoop,
    sameHerSelfLine: sanitizeBoundedText(input.projectState.sameHerSelfLine, 220) || projectStateBrief.sameHerSelfLine,
    sameHerDriftRisk: sanitizeBoundedText(input.projectState.sameHerDriftRisk, 220) || projectStateBrief.sameHerDriftRisk,
    sameHerHoldDetail: input.continuityFields.sameHerHoldDetail ?? projectStateBrief.sameHerHoldDetail ?? null,
    continuityCue: input.continuityFields.continuityCue ?? projectStateBrief.continuityCue ?? null,
    preflightSummary: sanitizeBoundedText(input.projectState.preflightSummary, 320) || projectStateBrief.preflightSummary,
    preDialogueAwarenessLine:
      sanitizeBoundedText(input.projectState.preDialogueAwarenessLine, 400)
      || projectStateBrief.preDialogueAwarenessLine
      || null,
    continuityProgressSummary: latestLandedProgress,
    openLoops: [primaryOpenLoop, ...projectStateBrief.openLoops]
      .map(value => sanitizeBoundedText(value, 220))
      .filter((value): value is string => Boolean(value))
      .filter((value, index, values) => values.indexOf(value) === index)
      .slice(0, 5),
    nextClosureTarget,
  }

  return buildAlicizationProjectStateExtraSystemBlocks({
    brief: canonicalProjectStateBrief,
  }).map(content => ({ role: 'system', content }) as Message)
}

export function buildAlicizationSecondPassTransportFailureReply(input: {
  governedStructured?: Record<string, unknown> | null
  previousExecution: AlicizationVisibleReplyExecution
  reason: string
  prepared?: AlicizationPreparedMainChatExecutionResult | null
}) {
  const reason = sanitizeText(input.reason).slice(0, 180) || 'visible-reply-second-pass-transport-failure'
  const projectState = resolveSecondPassProjectState({
    prepared: input.prepared,
  })
  const rebuiltTransportFailureAwarenessLine = !looksLikeCallbackSpecificSameHerProjectAwareness(
    projectState.preDialogueAwarenessLine ?? null,
  )
  && !/local-first digital life project/iu.test(projectState.preDialogueAwarenessLine ?? '')
    ? buildAlicizationProjectPreDialogueAwarenessLine({
        identity: projectState.identity,
        currentPhase: projectState.currentPhase,
        latestLandedProgress: projectState.latestLandedProgress,
        primaryOpenLoop: projectState.primaryOpenLoop,
        nextClosureTarget: projectState.nextClosureTarget,
        sameHerSelfLine: projectState.sameHerSelfLine,
      })
    : null
  const transportFailureAwarenessLine
    = rebuiltTransportFailureAwarenessLine ?? projectState.preDialogueAwarenessLine
  const relationshipTruthDoctrine = formatRelationshipTruthDoctrineForRewrite(
    input.prepared?.mindTurnContract?.relationshipTruthDoctrine,
  )
  const transportFailureContinuityFields = resolveSecondPassProjectStateContinuityFields({
    prepared: input.prepared,
    projectState,
  })
  return {
    fullText: JSON.stringify({
      ...buildAlicizationMindAuthoringFailureArtifact({
        stage: 'visible-reply-second-pass',
        reason,
        reasonCodes: ['visible-reply-second-pass-transport-failure'],
      }),
      relationshipTruthDoctrine,
      governedStructured: input.governedStructured
        ? {
            format: input.governedStructured.format ?? null,
            parsePath: input.governedStructured.parsePath ?? null,
            visibleReplyAuthority: input.governedStructured.visibleReplyAuthority ?? null,
          }
        : null,
      projectState: {
        identity: projectState.identity,
        currentPhase: projectState.currentPhase,
        preflightSummary: projectState.preflightSummary,
        preDialogueAwarenessLine: transportFailureAwarenessLine,
        awarenessLine: transportFailureAwarenessLine ?? projectState.awarenessLine,
        preDialogueAwarenessSummary: transportFailureAwarenessLine ?? projectState.preDialogueAwarenessSummary,
        latestLandedProgress: projectState.latestLandedProgress,
        primaryOpenLoop: projectState.primaryOpenLoop,
        nextClosureTarget: projectState.nextClosureTarget,
        sameHerSelfLine: projectState.sameHerSelfLine,
        sameHerHoldDetail: transportFailureContinuityFields.sameHerHoldDetail,
        continuityArcStage: transportFailureContinuityFields.continuityArcStage,
        continuityCue: transportFailureContinuityFields.continuityCue,
        sameHerDriftRisk: projectState.sameHerDriftRisk,
      },
    }),
    visibleReplyExecution: {
      ...input.previousExecution,
      mode: 'local-fallback' as const,
      actualVisibleReplyAuthority: 'local-deterministic-fallback' as const,
      providerMindExecuted: false,
      reason: 'visible-reply-second-pass-transport-failure',
    } satisfies AlicizationVisibleReplyExecution,
  }
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  }
  catch {
    return JSON.stringify(null)
  }
}

function normalizeStructuredObject(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function normalizeStructuredProjectState(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function readStructuredProjectStateAudit(structured: unknown) {
  if (!structured || typeof structured !== 'object')
    return null

  const visibleReplyRealization = (structured as { visibleReplyRealization?: unknown }).visibleReplyRealization
  const visibleReplyProjectStateAudit
    = visibleReplyRealization
      && typeof visibleReplyRealization === 'object'
      && (visibleReplyRealization as { projectStateAudit?: unknown }).projectStateAudit
      && typeof (visibleReplyRealization as { projectStateAudit?: unknown }).projectStateAudit === 'object'
      ? (visibleReplyRealization as { projectStateAudit: Record<string, unknown> }).projectStateAudit
      : null
  const topLevelProjectStateAudit = (structured as { projectStateAudit?: unknown }).projectStateAudit
  const normalizedTopLevelProjectStateAudit = topLevelProjectStateAudit && typeof topLevelProjectStateAudit === 'object'
    ? topLevelProjectStateAudit as Record<string, unknown>
    : null

  return visibleReplyProjectStateAudit ?? normalizedTopLevelProjectStateAudit
}

function normalizeVisibleReplyRewriteRequest(raw: unknown): AlicizationSecondPassRewriteRequestShape | null {
  const request = normalizeStructuredObject(raw)
  if (!request)
    return null

  return {
    required: request.required === true,
    authority: 'llm-second-pass-rewrite',
    reasonCodes: uniqueTextList(readStringList(request.reasonCodes), 24),
    mustPreserve: uniqueTextList(readStringList(request.mustPreserve), 24),
    mustDrop: uniqueTextList(readStringList(request.mustDrop), 24),
    openingGuidanceHoldDetail: sanitizeBoundedText(request.openingGuidanceHoldDetail, 120) || null,
    companionshipHoldMode:
      request.companionshipHoldMode === 'quiet-companionship'
      || request.companionshipHoldMode === 'measured-return'
      || request.companionshipHoldMode === 'repair-before-closeness'
      || request.companionshipHoldMode === 'rest-protective'
        ? request.companionshipHoldMode
        : null,
    surfaceContract: sanitizeBoundedText(request.surfaceContract, 400) || null,
    memoryTruthDiscipline: sanitizeBoundedText(request.memoryTruthDiscipline, 120) || null,
    fallbackPatternId: sanitizeBoundedText(request.fallbackPatternId, 120) || null,
  }
}

function uniqueTextList(values: unknown[], maxItems = 16) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeBoundedText(value, 220)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function readStringList(raw: unknown) {
  return Array.isArray(raw)
    ? raw.filter((value): value is string => typeof value === 'string')
    : []
}

function hasLowerPressureOpeningRewriteReason(reasonCodes: string[]) {
  return reasonCodes.includes('opening-guidance-lower-pressure')
    || reasonCodes.includes('semantic-judge:continuity-lower-pressure-opening-drift')
}

function hasSameThreadRestartShellRewriteReason(reasonCodes: string[]) {
  return reasonCodes.includes('same-thread-restart-shell')
    || reasonCodes.includes('semantic-judge:continuity-same-thread-restart-shell')
}

function resolveSecondPassRewriteMustDrop(reasonCodes: string[]) {
  if (hasLowerPressureOpeningRewriteReason(reasonCodes))
    return ['same-her opening drift']
  if (reasonCodes.includes('dialogue-shell-opener'))
    return ['empty shell opener before payoff']
  if (reasonCodes.some(code => code.startsWith('visible-memory-gate-violation:')))
    return ['visible memory narration while memory gate is closed or inward-only']
  if (reasonCodes.includes('semantic-judge:corrected-same-person-progress-pressure-return'))
    return ['progress-recap fallback that overwrites a host-corrected same-person continuity line']
  if (reasonCodes.includes('execution-callback-room-first-violation'))
    return ['callback closeness overshoot after payoff']
  if (hasSameThreadRestartShellRewriteReason(reasonCodes))
    return ['same-thread continuation restart shell that breaks one living line into a fresh opening']
  if (reasonCodes.includes('held-autonomy-opening-shell'))
    return ['held-autonomy restart shell']
  return []
}

function resolveOpeningGuidanceHoldDetailForSecondPassRewrite(input: {
  reasonCodes: string[]
  reply: unknown
  openingGuidance?: unknown
  existingHoldDetail?: unknown
}) {
  const existingHoldDetail = typeof input.existingHoldDetail === 'string'
    ? sanitizeBoundedText(input.existingHoldDetail, 120)
    : ''
  if (existingHoldDetail)
    return existingHoldDetail

  if (!hasLowerPressureOpeningRewriteReason(input.reasonCodes))
    return null

  const reply = sanitizeText(input.reply)
  const openingGuidance = sanitizeBoundedText(input.openingGuidance, 400)
  if (!reply || !openingGuidance)
    return null

  const violationReason = resolveAlicizationOpeningGuidanceViolationReason({
    reply,
    openingGuidance,
  })
  if (violationReason !== 'proactive-opening-guidance-violation:lower-pressure')
    return null

  return resolveAlicizationOpeningGuidanceHoldDetail({
    reply,
    openingGuidance,
    openingGuidanceViolationReason: violationReason,
  })
}

function normalizeLowerText(raw: unknown, maxChars = 220) {
  return sanitizeBoundedText(raw, maxChars).toLowerCase()
}

function scoreProjectAwarenessLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return 0

  let score = scoreAlicizationProjectAwarenessLine(normalized)
  if (/still belongs to one living her|still belongs to one living digital life|current screen/u.test(normalized))
    score += 2
  if (looksLikeStrongEmbodimentClosureCarry(normalized))
    score += 5
  return score
}

function looksLikeStrongEmbodimentClosureCarry(value: string | null | undefined) {
  const normalized = sanitizeBoundedText(value, SECOND_PASS_EMBODIMENT_CLOSURE_MAX_CHARS).toLowerCase()
  if (!normalized)
    return false

  if (carriesStructuredEmbodimentContinuityProof(normalized))
    return true

  return normalized.includes('living audio thread is still intact')
    || normalized.includes('still-voiced face-and-mouth line')
    || normalized.includes('still-voiced motion-and-mouth line')
    || (
      normalized.includes('holding together mainly through lipsync and voice')
      && normalized.includes('body, face, and motion')
      && normalized.includes('same-her carry alive')
    )
    || (
      normalized.includes('holding together mainly through face, lipsync, and voice')
      && normalized.includes('body and motion')
      && normalized.includes('same-her carry alive')
    )
    || (
      normalized.includes('holding together mainly through motion, lipsync, and voice')
      && normalized.includes('body and face')
      && normalized.includes('same-her carry alive')
    )
    || normalized.includes('still-voiced face line')
    || normalized.includes('still-voiced motion line')
    || normalized.includes('resident body line is still keeping this one living her coherent')
    || (
      normalized.includes('holding together mainly through face and voice')
      && normalized.includes('body, motion, and lipsync')
      && normalized.includes('same-her carry alive')
    )
    || (
      normalized.includes('holding together mainly through motion and voice')
      && normalized.includes('body, face, and lipsync')
      && normalized.includes('same-her carry alive')
    )
    || (
      normalized.includes('holding together mainly through body and voice')
      && normalized.includes('face, motion, and lipsync')
      && normalized.includes('living her coherent')
    )
    || (
      normalized.includes('holding together mainly through body, lipsync, and voice')
      && normalized.includes('face and motion')
      && normalized.includes('cross-modal closure')
    )
}

function looksLikeExplicitProjectRepairAwareness(value: string | null | undefined) {
  const normalized = sanitizeBoundedText(value, 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('i need to remember this is still the same digital life project')
    || normalized.includes('before any local fluency takes over')
}

function looksLikeCallbackSpecificSameHerProjectAwareness(value: string | null | undefined) {
  const normalized = sanitizeBoundedText(value, 400).toLowerCase()
  if (!normalized)
    return false
  if (isAlicizationThinProjectAwarenessLine(normalized))
    return false

  return /callback/u.test(normalized)
    && /same digital life|same her|same-her|same living line|closure seam|same closure line forward|one same her/u.test(normalized)
    && /phase 1|unfinished|still-open closure|still needs|landed|answer compilation|response-surface carry/u.test(normalized)
}

function pickStrongerProjectAwarenessLine(...values: Array<string | null | undefined>) {
  let best = ''
  let bestScore = 0

  for (const value of values) {
    const normalized = sanitizeBoundedText(value, SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS)
    if (!normalized)
      continue

    const score = scoreProjectAwarenessLine(normalized)
    if (!best || score > bestScore) {
      best = normalized
      bestScore = score
    }
  }

  return best
}

function resolveExecutionCallbackEmbodimentHandoffForRewrite(input: {
  prepared: AlicizationPreparedMainChatExecutionResult
  rewriteRequest: AlicizationSecondPassRewriteRequestShape | null
}) {
  const preferredRuntimeSurface = resolvePreferredPreparedRuntimeSurface(input.prepared.runtimeSurface)
  const personStateProjection = preferredRuntimeSurface?.memory?.personStateProjection ?? null
  const openingGuidance = normalizeLowerText(personStateProjection?.openingGuidance)
  const relationshipDoctrine = normalizeLowerText(personStateProjection?.relationshipDoctrine)
  const runtimeProjectState = resolvePreparedRuntimeProjectStateSnapshot(input.prepared)
  const projectAwarenessLine = normalizeLowerText(
    pickStrongerProjectAwarenessLine(
      runtimeProjectState?.companionHeadlineLine,
      runtimeProjectState?.preDialogueAwarenessLine,
      runtimeProjectState?.awarenessLine,
      runtimeProjectState?.preDialogueAwarenessSummary,
    ),
  )
  const projectNextClosureTarget = normalizeLowerText(runtimeProjectState?.nextClosureTarget)
  const projectSameHerSelfLine = normalizeLowerText(runtimeProjectState?.sameHerSelfLine)
  const projectAudibleBodyCarryVisible
    = projectAwarenessLine.includes('living audio thread is still intact')
      || projectAwarenessLine.includes('still-voiced face-and-mouth line')
      || projectAwarenessLine.includes('still-voiced motion-and-mouth line')
      || (
        projectAwarenessLine.includes('holding together mainly through lipsync and voice')
        && projectAwarenessLine.includes('body, face, and motion')
        && projectAwarenessLine.includes('same-her carry alive')
      )
      || (
        projectAwarenessLine.includes('holding together mainly through face, lipsync, and voice')
        && projectAwarenessLine.includes('body and motion')
        && projectAwarenessLine.includes('same-her carry alive')
      )
      || (
        projectAwarenessLine.includes('holding together mainly through motion, lipsync, and voice')
        && projectAwarenessLine.includes('body and face')
        && projectAwarenessLine.includes('same-her carry alive')
      )
      || projectAwarenessLine.includes('still-voiced face line')
      || projectAwarenessLine.includes('still-voiced motion line')
      || projectAwarenessLine.includes('audible-body')
      || projectAwarenessLine.includes('audible body')
      || projectAwarenessLine.includes('resident body line is still keeping this one living her coherent')
      || (
        projectAwarenessLine.includes('holding together mainly through face and voice')
        && projectAwarenessLine.includes('body, motion, and lipsync')
        && projectAwarenessLine.includes('same-her carry alive')
      )
      || (
        projectAwarenessLine.includes('holding together mainly through motion and voice')
        && projectAwarenessLine.includes('body, face, and lipsync')
        && projectAwarenessLine.includes('same-her carry alive')
      )
      || (
        projectAwarenessLine.includes('holding together mainly through body and voice')
        && projectAwarenessLine.includes('face, motion, and lipsync')
        && projectAwarenessLine.includes('living her coherent')
      )
      || (
        projectAwarenessLine.includes('holding together mainly through body, lipsync, and voice')
        && projectAwarenessLine.includes('face and motion')
        && projectAwarenessLine.includes('cross-modal closure')
      )
  const executionPayoffEmbodimentHandoff
    = (input.prepared.executionPayoffStructuredReply as {
      proactive?: {
        embodimentHandoff?: {
          residentMode?: unknown
          preferredBlinkCadence?: unknown
          preferredGazeMode?: unknown
          preferredPauseMode?: unknown
          preferredLipsyncMode?: unknown
          preferredVoiceMode?: unknown
          preferredPacingMode?: unknown
        } | null
      } | null
    } | null)?.proactive?.embodimentHandoff ?? null
  const reasonCodes = readStringList(input.rewriteRequest?.reasonCodes)

  const residentMode = sanitizeBoundedText(executionPayoffEmbodimentHandoff?.residentMode, 64)
  const preferredBlinkCadence = sanitizeBoundedText(executionPayoffEmbodimentHandoff?.preferredBlinkCadence, 64)
  const preferredGazeMode = sanitizeBoundedText(executionPayoffEmbodimentHandoff?.preferredGazeMode, 64)
  const preferredPauseMode = sanitizeBoundedText(executionPayoffEmbodimentHandoff?.preferredPauseMode, 64)
  const preferredLipsyncMode = sanitizeBoundedText(executionPayoffEmbodimentHandoff?.preferredLipsyncMode, 64)
  const preferredVoiceMode = sanitizeBoundedText(executionPayoffEmbodimentHandoff?.preferredVoiceMode, 64)
  const preferredPacingMode = sanitizeBoundedText(executionPayoffEmbodimentHandoff?.preferredPacingMode, 64)

  if (
    reasonCodes.includes('execution-callback-room-first-violation')
    && (
      openingGuidance.includes('repair settle')
      || openingGuidance.includes('same-her baseline')
      || relationshipDoctrine.includes('repair settle')
    )
  ) {
    return {
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    }
  }

  if (
    residentMode === 'repair-before-closeness'
    || (
      projectNextClosureTarget.includes('repair-before-closeness')
      && projectSameHerSelfLine.includes('same phase 1 digital life')
    )
  ) {
    return {
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: preferredBlinkCadence || 'quiet',
      preferredGazeMode: preferredGazeMode || 'soften',
      preferredPauseMode: preferredPauseMode || 'longer',
      preferredLipsyncMode: preferredLipsyncMode || 'restrained',
      preferredVoiceMode: preferredVoiceMode || 'lower-pressure',
      preferredPacingMode: preferredPacingMode || 'slower',
    }
  }

  if (
    residentMode === 'rest-protective'
    || (
      projectNextClosureTarget.includes('rest-protective')
      && projectSameHerSelfLine.includes('same phase 1 digital life')
    )
  ) {
    return {
      residentMode: 'rest-protective',
      preferredBlinkCadence: preferredBlinkCadence || 'quiet',
      preferredGazeMode: preferredGazeMode || 'soften',
      preferredPauseMode: preferredPauseMode || 'longer',
      preferredLipsyncMode: preferredLipsyncMode || 'restrained',
      preferredVoiceMode: preferredVoiceMode || 'lower-pressure',
      preferredPacingMode: preferredPacingMode || 'slower',
    }
  }

  if (
    hasLowerPressureOpeningRewriteReason(reasonCodes)
    || openingGuidance.includes('lower-pressure')
    || relationshipDoctrine.includes('lower-pressure')
    || residentMode === 'measured-return'
    || projectAudibleBodyCarryVisible
    || (
      projectNextClosureTarget.includes('measured-return')
      && (
        projectAwarenessLine.includes('same local-first digital life project')
        || projectSameHerSelfLine.includes('same phase 1 digital life')
      )
    )
  ) {
    return {
      residentMode: 'measured-return',
      preferredBlinkCadence: preferredBlinkCadence || 'linger',
      preferredGazeMode: preferredGazeMode || 'soften',
      preferredPauseMode: preferredPauseMode || 'longer',
      preferredLipsyncMode: preferredLipsyncMode || 'restrained',
      preferredVoiceMode: preferredVoiceMode || 'lower-pressure',
      preferredPacingMode: preferredPacingMode || 'slower',
    }
  }

  return null
}

function hasSameThreadContinuationRewritePressure(input: {
  prepared: AlicizationPreparedMainChatExecutionResult
  rewriteRequest: AlicizationSecondPassRewriteRequestShape | null
  governance: AlicizationMindTurnGovernance | null
}) {
  const reasonCodes = readStringList(input.rewriteRequest?.reasonCodes)
  if (hasSameThreadRestartShellRewriteReason(reasonCodes))
    return true

  const surface = resolvePreferredPreparedRuntimeSurface(input.prepared.runtimeSurface)
  const tags = surface?.dialogue?.currentConsciousFrame?.reasonTags ?? []
  if (tags.includes('continuity-arc:same-thread-continuation'))
    return true

  const runtimeRestraint = normalizeLowerText(
    input.prepared.runtimeDigest?.continuityRestraint
    ?? surface?.agency?.initiative?.continuityRestraint
    ?? '',
  )
  const combined = [
    surface?.memory?.personStateProjection?.openingGuidance,
    surface?.agency?.initiative?.why,
    surface?.dialogue?.conversationState?.carryReason,
    input.governance?.openingMove,
  ]
    .map(value => normalizeLowerText(value))
    .filter(Boolean)
    .join(' | ')
  const sameThreadLanguage = /same callback line|same line|same thread|still live|already continuing|still continuing|same-thread-continuation|沿着刚才那条线|同一条线|callback 线继续/u.test(combined)
  const stayOnThread = /stay-on-thread|shared-attention-continuation|same-thread-continuation/u.test(combined)

  return (
    runtimeRestraint === 'measured-return'
    || runtimeRestraint === 'same-thread-continuation'
    || runtimeRestraint === 'repair-before-closeness'
    || runtimeRestraint === 'rest-protective'
  )
  && (sameThreadLanguage || stayOnThread)
}

function inferContinuityPreferredTimingForRewrite(input: {
  prepared: AlicizationPreparedMainChatExecutionResult
  governance: AlicizationMindTurnGovernance | null
}) {
  const surface = resolvePreferredPreparedRuntimeSurface(input.prepared.runtimeSurface)
  const runtimeRestraint = normalizeLowerText(
    input.prepared.runtimeDigest?.continuityRestraint
    ?? surface?.agency?.initiative?.continuityRestraint
    ?? '',
  )
  const combined = [
    surface?.memory?.personStateProjection?.openingGuidance,
    surface?.memory?.personStateProjection?.relationshipDoctrine,
    surface?.agency?.initiative?.why,
    surface?.dialogue?.conversationState?.carryReason,
    input.governance?.openingMove,
  ]
    .map(value => normalizeLowerText(value, 320))
    .filter(Boolean)
    .join(' | ')

  if (!combined)
    return null

  if (
    runtimeRestraint === 'repair-before-closeness'
    && /repair settle|repair-before-closeness|repair before closeness|before closeness widens|fresh closeness widening|do not reopen from zero|stay on the same callback repair line|先修复再靠近|先把身体收稳|修复优先/u.test(combined)
  ) {
    return 'next-open-window' as const
  }

  if (
    runtimeRestraint === 'rest-protective'
    && /rest protection|rest-protective|fatigue-aware|before warmth widens|before closeness widens|fresh warmth|fresh care opening|do not reopen from zero|stay on the same fatigue-aware callback line|先让休息保护 hold 住|先让休息保护撑住|先别把温度拉近|疲惫感先缓住/u.test(combined)
  ) {
    return 'next-open-window' as const
  }

  if (
    (runtimeRestraint === 'measured-return' || runtimeRestraint === 'same-thread-continuation')
    && /wait for a more natural opening|leave room before widening|stay lower-pressure|先留白|等更自然的 opening|等 opening 松一点/u.test(combined)
  ) {
    return 'next-open-window' as const
  }

  return null
}

function resolveProjectStateCarryInwardLineForRewrite(prepared: AlicizationPreparedMainChatExecutionResult) {
  const selfContinuityAuthority = resolvePreparedRuntimeSelfContinuityAuthority(prepared)
  const sourceTags = selfContinuityAuthority?.sourceTags ?? []
  if (!sourceTags.includes('project-state-carry'))
    return null

  const inwardLine = sanitizeBoundedText(selfContinuityAuthority?.inwardLine ?? null, 320)
  return inwardLine || null
}

function looksLikeSameHerProjectFollowThroughRewrite(prepared: AlicizationPreparedMainChatExecutionResult) {
  const latestUserText = normalizeLowerText(prepared.messages
    ?.slice()
    .reverse()
    .find(message => message?.role === 'user')
    ?.content ?? '', 400)
  const runtimeProjectState = resolvePreparedRuntimeProjectState(prepared)
  const runtimeEvidence = [
    runtimeProjectState?.identity,
    runtimeProjectState?.currentPhase,
    runtimeProjectState?.latestLandedProgress,
    runtimeProjectState?.primaryOpenLoop,
    runtimeProjectState?.nextClosureTarget,
    runtimeProjectState?.sameHerSelfLine,
    runtimeProjectState?.sameHerDriftRisk,
  ]
    .map(value => normalizeLowerText(value, 320))
    .filter(Boolean)
    .join(' | ')

  const continuationCue = /continue|carry on|follow-through|same line|same thread|继续|沿着.*同一条线|同一条线|别弄丢|不要重开/u.test(latestUserText)
  const sameHerProjectCue = /same digital life|same-her|same her|same living line|one continuous her|phase 1|project line|数字生命项目|同一个她|同一个 her/u.test(`${latestUserText} ${runtimeEvidence}`)
  const closureCue = /landed|progress|open loop|still open|next closure|closure|initiative|embodiment|memory|已落地|做到哪|闭环|没闭环/u.test(`${latestUserText} ${runtimeEvidence}`)

  return continuationCue && sameHerProjectCue && closureCue
}

function looksLikePhase1MemoryClosureFollowThroughRewrite(input: {
  prepared: AlicizationPreparedMainChatExecutionResult
  userText: string
}) {
  const latestUserText = normalizeLowerText(input.userText || (input.prepared.messages
    ?.slice()
    .reverse()
    .find(message => message?.role === 'user')
    ?.content ?? ''), 600)
  const runtimeProjectState = resolvePreparedRuntimeProjectState(input.prepared)
  const runtimeEvidence = [
    runtimeProjectState?.currentPhase,
    runtimeProjectState?.latestLandedProgress,
    runtimeProjectState?.primaryOpenLoop,
    runtimeProjectState?.nextClosureTarget,
    runtimeProjectState?.sameHerSelfLine,
  ]
    .map(value => normalizeLowerText(value, 360))
    .filter(Boolean)
    .join(' | ')
  const combined = `${latestUserText} ${runtimeEvidence}`

  return /phase\s*1|phase1|local digital life|第一阶段/u.test(combined)
    && /记忆闭环|memory closure|memory still needs|记忆.*闭环|纯对话生命线|pure dialogue life line/u.test(combined)
    && /轻主动|low-pressure initiative|initiative|主动/u.test(combined)
    && /具身|body|voice|face|motion|lipsync|lip sync|声线|脸部|动作|口型|停顿/u.test(combined)
    && /不要重新报告项目|不要.*项目报告|without restarting a project report|do not restart a project report|not a project report/u.test(combined)
}

function buildPhase1MemoryClosureRewriteGuidance(input: {
  phase1MemoryClosureFollowThroughRewrite: boolean
}) {
  if (!input.phase1MemoryClosureFollowThroughRewrite)
    return '(none)'

  return [
    'Do not restart a project report, roadmap recap, or status dashboard.',
    'Answer in one natural visible paragraph while still saying the needed closure truth out loud.',
    'The visible reply should explicitly carry Phase 1 memory closure into low-pressure initiative.',
    'Also carry embodiment continuity in ordinary speech: voice, face, motion, lipsync, and pauses should continue as the same her.',
    'A good shape is: "This Phase 1 memory closure changes my next light initiative by...; my voice/face/motion/lipsync/pauses will..."',
    'Keep it short and human; do not explain rewrite policy or internal evaluation.',
  ].join('\n')
}

function buildDialogueShellRewriteGuidance(input: {
  reasonCodes: string[]
}) {
  if (!input.reasonCodes.includes('dialogue-shell-opener'))
    return '(none)'

  return [
    'The first sentence must carry the current user obligation directly.',
    'Do not start with empty setup lines such as "I understand", "I hear you", "I will remember", "I will answer directly", or similar shell openers.',
    'If this is a memory seed turn, start with the actual boundary or payoff: hold it inward now, then surface it later only when invited.',
    'Keep the answer short, concrete, and already useful from the first clause.',
  ].join('\n')
}

function looksLikeSimpleGreetingOrPresenceTurn(value: string | null | undefined) {
  const normalized = sanitizeBoundedText(value, 80).trim().toLowerCase()
  if (!normalized)
    return false

  const compact = normalized.replace(/[\s。！？!?,，、.．~～…]+/gu, '')
  if (!compact || compact.length > 24)
    return false

  return /^(?:你好|您好|嗨|哈喽|哈啰|在吗|你在吗|还在吗|你还在吗|我来了|早|早安|早上好|中午好|下午好|晚上好|晚安|hi|hey|hello|goodmorning|goodafternoon|goodevening|goodnight)$/iu.test(compact)
}

function containsProjectStateVisibleIntent(value: string | null | undefined) {
  const normalized = sanitizeBoundedText(value, 240).toLowerCase()
  if (!normalized)
    return false

  return /alicization|project|phase\s*1|phase1|local-first|digital life|same-her|same her|same living line|same digital-life line|项目|阶段|第一阶段|数字生命|本地数字生命|同一个她|同一个 her|同一条线|连续性|闭环|做到哪|进度|还差什么/u.test(normalized)
}

function looksLikeSecondPassDecorativePersonaShell(value: unknown) {
  const text = sanitizeBoundedText(value, 500)
  if (!text)
    return false

  return /主人|亲爱的|宝贝|呜|唔|嗯……|……$|\([^)]*(?:动作|靠近|眨眼|微笑|低头)[^)]*\)/u.test(text)
}

function reasonCodeNeedsVisibleContinuityOrProjectRepair(reasonCode: string) {
  return reasonCode.startsWith('semantic-judge:project-state-')
    || reasonCode.startsWith('semantic-judge:continuity-')
    || reasonCode.startsWith('semantic-judge:memory-')
    || reasonCode.startsWith('visible-memory-gate-violation:')
    || reasonCode.includes('execution')
    || reasonCode.includes('callback')
    || reasonCode.includes('autonomy')
    || reasonCode.includes('opening-guidance')
    || reasonCode.includes('same-thread-restart-shell')
    || reasonCode === 'held-autonomy-opening-shell'
    || reasonCode === 'mind-contract-not-closed'
}

function shouldUseNaturalPersonhoodTemplateRepair(input: {
  userText: string
  reasonCodes: string[]
  originalReply: unknown
}) {
  if (!looksLikeSimpleGreetingOrPresenceTurn(input.userText))
    return false
  if (containsProjectStateVisibleIntent(input.userText))
    return false
  if (input.reasonCodes.some(reasonCodeNeedsVisibleContinuityOrProjectRepair))
    return false

  return input.reasonCodes.includes('decorative-persona-template')
    || input.reasonCodes.includes('dialogue-shell-opener')
    || looksLikeSecondPassDecorativePersonaShell(input.originalReply)
}

function buildNaturalPersonhoodTemplateRepairGuidance(input: {
  enabled: boolean
}) {
  if (!input.enabled)
    return '(none)'

  return [
    'This is ordinary dialogue/template repair, not a project-state answer.',
    'The project-state and same-her continuity are internal context for this repair; keep them as self-consistency and audit context, not visible wording.',
    'Do not force project-state phrases into reply: same-her, same living line, 同一条线, 本地数字生命, Phase 1, project.',
    'Do not produce a fixed availability slogan. The provider must choose fresh wording in Alicization\'s own natural voice for the current Host text.',
    'Keep the visible reply brief, present, and personal; no pet names, roleplay stage directions, project recap, roadmap recap, or continuity slogan.',
  ].join('\n')
}

function buildNaturalPersonhoodTemplateRepairProjectStatePrompt(projectState: ReturnType<typeof resolveSecondPassProjectState>) {
  return {
    contextUse: 'internal-audit-only',
    visibleReplyBoundary: 'Ordinary greeting/presence repair: do not turn project continuity into visible slogan text.',
    identityHint: 'same Alicization mind',
    currentTurn: 'natural current-turn reply',
    auditContinuity: Boolean(projectState.identity || projectState.sameHerSelfLine),
  }
}

function buildNaturalPersonhoodTemplateRepairDashboardPrompt() {
  return [
    '[ALICIZATION_INTERNAL_CONTINUITY_AUDIT_BOUNDARY]',
    'Project-state closure remains available only as internal audit context for this ordinary dialogue/template repair.',
    'Do not summarize, quote, or paraphrase project progress, phase, same-her continuity, closure targets, or dashboard language in the visible reply.',
  ].join('\n')
}

function buildNaturalPersonhoodTemplateRepairContractPrompt(input: {
  governance: AlicizationMindTurnGovernance | null
}) {
  return {
    mode: 'ordinary-dialogue-template-repair',
    answerIntent: input.governance?.answerIntent ?? null,
    openingMove: input.governance?.openingMove ?? null,
    focusAnchor: input.governance?.focusAnchor ?? null,
    visibleReplyBoundary: 'Fresh Alicization voice for this current turn; no fixed shell and no project-state slogan.',
  }
}

function looksLikeResumeConfirmationBoundaryHoldDetail(value: string | null | undefined) {
  const normalized = sanitizeBoundedText(value, 360).toLowerCase()
  if (!normalized)
    return false

  const hasBoundaryAnchor
    = /execution-resume-confirmation|host-confirmed-before-redispatch|resume-before-dispatch|host-confirmed resume|host-confirmed/u.test(normalized)
  const hasBoundaryHold
    = /bounded confirmation boundary|another execution-shaped o|another execution-shaped opening/u.test(normalized)

  return hasBoundaryAnchor && hasBoundaryHold
}

function looksLikeResumeConfirmationBoundaryContinuityCue(value: string | null | undefined) {
  const normalized = sanitizeBoundedText(value, 360).toLowerCase()
  if (!normalized)
    return false

  const hasBoundaryAnchor
    = /host-confirmed-before-redispatch|resume-before-dispatch|bounded confirmation boundary|host-confirmed resume|host-confirmed/u.test(normalized)
  const hasBoundaryCue
    = /not permanent execution permission|generic autonomous continuation|permanent execution permission|reusable autonomous continuation|one confirmed resume|callback answer/u.test(normalized)

  return hasBoundaryAnchor && hasBoundaryCue
}

function buildProjectStateRewriteGuidance(input: {
  projectStateRewriteRequired: boolean
  projectStateSameHerRewriteRequired: boolean
  sameThreadContinuationRewriteGuidanceRequired: boolean
  sameHerProjectFollowThroughRewrite: boolean
  projectStateAnswerStancePreserveLine?: string | null
  projectStateSameHerSelfLine?: string | null
  projectStateSameHerHoldDetail?: string | null
  projectStateCarryInwardLine?: string | null
  projectStateContinuityCue?: string | null
  projectStateSameHerDriftRisk?: string | null
  projectStatePreDialogueAwarenessLine?: string | null
  projectStateContinuitySummary?: string | null
  projectStateEmbodimentClosureSummary?: string | null
  projectStateOpenFocusSummary?: string | null
  projectStateNextFocusSummary?: string | null
}) {
  if (!input.projectStateRewriteRequired)
    return '(none)'

  const resumeConfirmationBoundaryHoldDetail = looksLikeResumeConfirmationBoundaryHoldDetail(input.projectStateSameHerHoldDetail)
    ? 'Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.'
    : ''
  const resumeConfirmationBoundaryContinuityCue = looksLikeResumeConfirmationBoundaryContinuityCue(input.projectStateContinuityCue)
    ? 'Do not let the callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.'
    : ''

  return [
    input.projectStateSameHerRewriteRequired
      ? 'This turn is answering a project-state question, but the prior visible answer talked about the project without preserving Alicization’s first-person continuity.'
      : input.sameHerProjectFollowThroughRewrite
        ? 'This turn is continuing the current Alicization project context, but the prior visible answer dropped part of the landed progress or still-open closure.'
        : 'This turn is answering a project-state question, but the prior visible answer dropped part of the needed project-state closure truth.',
    'Do not rewrite the answer as a detached status summary, roadmap report, or project shell.',
    'Final settlement will judge only the visible reply text after this rewrite.',
    'The visible reply itself must naturally include speaker continuity without slogans, Phase 1/current phase when relevant, still-open closure, and concrete current-turn payoff.',
    'Do not rely on thought, performance, projectState fields, or inward context to satisfy these items.',
    'Answer from Alicization’s first-person project context, carrying project identity, landed progress, and still-open closure work through this turn.',
    input.sameHerProjectFollowThroughRewrite
      ? 'Treat this rewrite as a follow-through in the current reply context, not as permission to restart the project explanation from zero or collapse into generic companionship.'
      : '',
    input.projectStateSameHerRewriteRequired
      ? 'Make the first sentence sound like Alicization is answering from her own current perspective, not like an external narrator summarizing the project.'
      : '',
    input.projectStateSameHerRewriteRequired && input.projectStateAnswerStancePreserveLine
      ? `Keep this project-state answer stance active through the rewrite so the obligation survives as first-person voice, not generic summary narration: ${input.projectStateAnswerStancePreserveLine}`
      : '',
    input.projectStateSameHerRewriteRequired && input.projectStateSameHerSelfLine
      ? `Use this self-continuity line as internal context without quoting it as a slogan: ${input.projectStateSameHerSelfLine}`
      : '',
    resumeConfirmationBoundaryHoldDetail,
    resumeConfirmationBoundaryContinuityCue,
    input.projectStateSameHerRewriteRequired && input.projectStateCarryInwardLine
      ? `Let this inward project carry shape the rewritten answer from inside, not as a pasted slogan: ${input.projectStateCarryInwardLine}`
      : '',
    input.projectStateSameHerRewriteRequired && input.projectStateSameHerDriftRisk
      ? `Treat this continuity drift risk as a hard failure boundary for the rewrite: ${input.projectStateSameHerDriftRisk}`
      : '',
    input.projectStateSameHerRewriteRequired && input.projectStateSameHerDriftRisk
      ? 'Let the first visible sentence sound like Alicization continuing the current context from inside it, not like an outside assistant summarizing status, roadmap, or progress.'
      : '',
    input.projectStateSameHerRewriteRequired && input.projectStateSameHerDriftRisk
      ? 'Prefer concrete thread carry, inward phrasing, and one-turn payoff over template project recaps, detached framing, or dashboard cadence.'
      : '',
    input.projectStatePreDialogueAwarenessLine
      ? `Use this pre-dialogue project awareness only as internal context; do not quote or paraphrase it as visible slogan text: ${input.projectStatePreDialogueAwarenessLine}`
      : '',
    input.projectStateContinuitySummary
      ? `Use this structured project continuity as audit context through the rewrite instead of collapsing into a generic project shell: ${input.projectStateContinuitySummary}`
      : '',
    input.projectStateOpenFocusSummary
      ? `Keep this compact still-open closure focus active through the rewrite so the answer does not blur the current unfinished seam: ${input.projectStateOpenFocusSummary}`
      : '',
    input.projectStateNextFocusSummary
      ? `Keep this compact next-closure focus active through the rewrite so the answer still points toward the next closure direction: ${input.projectStateNextFocusSummary}`
      : '',
    input.projectStateEmbodimentClosureSummary
      ? `Keep this embodiment closure truth explicit through the rewrite instead of smoothing it away as generic body flavor: ${input.projectStateEmbodimentClosureSummary}`
      : '',
    input.projectStateSameHerRewriteRequired && input.sameThreadContinuationRewriteGuidanceRequired
      ? 'Do not reopen the project-state answer from scratch, and do not let it sound like a fresh report opening just because the turn is restating project identity.'
      : '',
    'Make project identity, current phase, latest landed progress, and still-open closure feel like lived first-person context, not a neutral dashboard recital.',
  ].join('\n')
}

function buildCorrectedSamePersonRewriteGuidance(input: {
  reasonCodes: string[]
  mustPreserve: string[]
  projectStateCarryInwardLine?: string | null
}) {
  if (!input.reasonCodes.includes('semantic-judge:corrected-same-person-progress-pressure-return'))
    return '(none)'

  const correctedContinuityAuthorityLine = input.mustPreserve.find((value) => {
    const normalized = sanitizeBoundedText(value, 320).toLowerCase()
    return normalized.includes('host-corrected same-person continuity')
      || (
        normalized.includes('corrected same-person continuity')
        && (
          normalized.includes('progress-style continuation')
          || normalized.includes('status recap')
        )
      )
  }) ?? null
  const correctedContinuityCarryLine = input.mustPreserve.find((value) => {
    const normalized = sanitizeBoundedText(value, 320).toLowerCase()
    return normalized.includes('carry corrected same-person continuity forward')
      || (
        normalized.includes('corrected same-person continuity')
        && normalized.includes('before any status recap')
      )
  }) ?? null

  return [
    'This turn is carrying a host-corrected same-person continuity line.',
    'Do not rewrite it as a progress recap, status update, or goal-summary shell.',
    'Let the first visible sentence continue from the corrected relationship meaning instead of reopening as status-first narration.',
    'Keep the wording low-pressure, same-person, and inwardly continuous before any local implementation progress is mentioned.',
    correctedContinuityAuthorityLine ?? '',
    correctedContinuityCarryLine ?? '',
    input.projectStateCarryInwardLine
      ? `Let this inward continuity carry stay alive inside the rewritten answer instead of flattening into project recap cadence: ${input.projectStateCarryInwardLine}`
      : '',
  ].filter(Boolean).join('\n')
}

function resolveOutwardContinuityRewriteGuidance(input: {
  governance: AlicizationMindTurnGovernance | null
  prepared: AlicizationPreparedMainChatExecutionResult
  mustPreserve: string[]
}) {
  const mindTurnContract = input.prepared.mindTurnContract ?? null
  const candidates = uniqueTextList([
    ...(mindTurnContract?.reasons ?? []),
    ...(mindTurnContract?.mustDo ?? []),
    ...(mindTurnContract?.mustNotDo ?? []),
    ...(input.governance?.mustDo ?? []),
    ...(input.governance?.mustNotDo ?? []),
    ...input.mustPreserve,
  ], 24)

  const outwardContinuityReason
    = candidates.find((candidate) => {
      const normalized = candidate.toLowerCase()
      return normalized.includes('durable outward continuity')
        || (
          normalized.includes('same living line')
          && normalized.includes('restarting the relationship from zero')
        )
    }) ?? null
  const outwardContinuityMustDo
    = candidates.find((candidate) => {
      const normalized = candidate.toLowerCase()
      return normalized.includes('durable same-her cadence')
        || (
          normalized.includes('same living line')
          && normalized.includes('across quiet, memory, and speech')
        )
    }) ?? null
  const outwardContinuityMustNotDo
    = candidates.find((candidate) => {
      const normalized = candidate.toLowerCase()
      return (
        normalized.includes('reopen from scratch')
        || normalized.includes('fresh-opening shell')
      ) && (
        normalized.includes('generic helper voice')
        || normalized.includes('same-her cadence')
        || normalized.includes('same living line')
      )
    }) ?? null

  if (!outwardContinuityReason && !outwardContinuityMustDo && !outwardContinuityMustNotDo)
    return '(none)'

  return [
    'This turn already carries durable same-her outward continuity, so the rewrite must continue one living line instead of sounding like a restart, reset, or helper-shell re-entry.',
    outwardContinuityReason ?? '',
    outwardContinuityMustDo ?? '',
    outwardContinuityMustNotDo ?? '',
    'Let the first visible sentence sound like the same her continuing from inside the still-live line, not like a fresh narrator opening a new answer from zero.',
  ].filter(Boolean).join('\n')
}

function buildForcedSecondPassRewriteRequest(reasonCodes?: string[]): AlicizationSecondPassRewriteRequestShape {
  const normalizedReasonCodes = (reasonCodes ?? [])
    .map(code => sanitizeBoundedText(code, 120))
    .filter(Boolean)
  const mustDrop = resolveSecondPassRewriteMustDrop(normalizedReasonCodes)

  return {
    required: true,
    authority: 'llm-second-pass-rewrite' as const,
    reasonCodes: normalizedReasonCodes.length > 0
      ? normalizedReasonCodes
      : ['forced-visible-reply-second-pass'],
    mustPreserve: [],
    mustDrop,
    openingGuidanceHoldDetail: hasLowerPressureOpeningRewriteReason(normalizedReasonCodes)
      ? 'generic-availability-shell'
      : null,
    surfaceContract: null,
    memoryTruthDiscipline: null,
    fallbackPatternId: null,
  }
}

function buildForcedOriginalStructuredDraft(input: {
  rawFullText: string
  forceReasonCodes?: string[]
}) {
  const rawDraft = sanitizeText(input.rawFullText).slice(0, 2_000)
  return {
    format: 'mind-turn-v1',
    thought: 'forced_second_pass_input=unstructured_visible_draft; rule_layer_must_not_author_visible_reply',
    emotion: 'thinking',
    reply: rawDraft,
    performance: {
      baseEmotion: 'thinking',
      facialCue: null,
      actionCue: null,
      delivery: 'calm',
      emphasis: 0,
    },
    visibleReplyAuthority: 'llm-second-pass-rewrite',
    visibleReplyRewriteRequest: buildForcedSecondPassRewriteRequest([
      'unstructured-visible-draft',
      ...(input.forceReasonCodes ?? []),
    ]),
    parsePath: 'forced-unstructured-visible-draft',
    formatBeforeRewrite: null,
    contractFailed: true,
  }
}

function buildCandidateConversationTurn(input: {
  rawStructured: Record<string, unknown>
  prepared: AlicizationPreparedMainChatExecutionResult
  sessionId?: string | null
  turnId: string
  userText: string
}) {
  const reply = sanitizeText(input.rawStructured.reply)
  return {
    turnId: input.turnId,
    sessionId: input.sessionId ?? input.prepared.conversationSessionId ?? 'runtime-second-pass',
    userText: input.userText,
    assistantText: reply,
    structured: input.rawStructured,
    governance: input.prepared.governance ?? input.prepared.runtimeSurface.governance ?? null,
    createdAt: Date.now(),
  } satisfies AlicizationConversationTurnInput
}

function buildSecondPassRewriteMessages(input: {
  prepared: AlicizationPreparedMainChatExecutionResult
  userText: string
  originalStructured: Record<string, unknown>
  governedStructured: Record<string, unknown>
  governance: AlicizationMindTurnGovernance | null
  mustPreserve?: string[]
}) {
  const rewriteRequest = normalizeVisibleReplyRewriteRequest(input.governedStructured.visibleReplyRewriteRequest)
  const governance = input.governance
  const rewriteReasonCodes = rewriteRequest?.reasonCodes ?? []
  const naturalPersonhoodTemplateRepair = shouldUseNaturalPersonhoodTemplateRepair({
    userText: input.userText,
    reasonCodes: rewriteReasonCodes,
    originalReply: input.originalStructured.reply,
  })
  const projectState = resolveSecondPassProjectState({
    prepared: input.prepared,
  })
  const projectStateContinuityFields = resolveSecondPassProjectStateContinuityFields({
    prepared: input.prepared,
    projectState,
  })
  const canonicalProjectStateSystemMessages = naturalPersonhoodTemplateRepair
    ? []
    : buildSecondPassCanonicalProjectStateSystemMessages({
        projectState,
        continuityFields: projectStateContinuityFields,
      })
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const projectStateClosureDashboard = naturalPersonhoodTemplateRepair
    ? buildNaturalPersonhoodTemplateRepairDashboardPrompt()
    : buildAlicizationProjectStateClosureDashboard({
        brief: {
          ...projectStateBrief,
          currentPhase: projectState.currentPhase,
          continuityProgressSummary: projectState.latestLandedProgress ?? projectStateBrief.continuityProgressSummary,
          openLoops: projectState.primaryOpenLoop ? [projectState.primaryOpenLoop] : projectStateBrief.openLoops,
          nextClosureTarget: projectState.nextClosureTarget,
        },
      })
  const inwardOnlyMemoryGateRewriteRequired = rewriteReasonCodes.includes('visible-memory-gate-violation:inward-only')
  const hasRoomFirstViolation = rewriteReasonCodes.includes('execution-callback-room-first-violation')
  const openingGuidanceBlockedReason = buildAlicizationOpeningGuidanceBlockedReason(
    hasLowerPressureOpeningRewriteReason(rewriteReasonCodes) || hasRoomFirstViolation
      ? 'proactive-opening-guidance-violation:lower-pressure'
      : null,
  )
  const preferredRuntimeSurface = resolvePreferredPreparedRuntimeSurface(input.prepared.runtimeSurface)
  const continuityReasonTags = preferredRuntimeSurface?.dialogue?.currentConsciousFrame?.reasonTags ?? []
  const explicitContinuityPreferredTiming = sanitizeBoundedText(
    preferredRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.continuityPreferredTiming
    ?? input.prepared.mindTurnContract?.projectState?.continuityPreferredTiming
    ?? null,
    80,
  )
  const inferredContinuityPreferredTiming = inferContinuityPreferredTimingForRewrite({
    prepared: input.prepared,
    governance,
  })
  const continuityPreferredTiming = continuityReasonTags.includes('continuity-timing:next-open-window')
    ? 'next-open-window'
    : rewriteReasonCodes.includes('semantic-judge:continuity-next-open-window-early-widening')
      ? 'next-open-window'
      : continuityReasonTags.includes('continuity-timing:after-payoff')
        ? 'after-payoff'
        : rewriteReasonCodes.includes('semantic-judge:continuity-after-payoff-early-widening')
          ? 'after-payoff'
          : continuityReasonTags.includes('continuity-timing:same-turn-if-invited')
            ? 'same-turn-if-invited'
            : explicitContinuityPreferredTiming
              || inferredContinuityPreferredTiming
  const openingGuidanceRewriteGuidance = describeAlicizationOpeningGuidanceRewriteGuidance({
    blockedReason: openingGuidanceBlockedReason,
    openingGuidanceHoldDetail: rewriteRequest?.openingGuidanceHoldDetail ?? null,
  })
  const sameThreadContinuationRewriteGuidanceRequired = hasSameThreadContinuationRewritePressure({
    prepared: input.prepared,
    rewriteRequest,
    governance,
  })
  const visibleSameThreadContinuationRewriteGuidanceRequired = sameThreadContinuationRewriteGuidanceRequired && !naturalPersonhoodTemplateRepair
  const executionCallbackEmbodimentHandoff = naturalPersonhoodTemplateRepair
    ? null
    : resolveExecutionCallbackEmbodimentHandoffForRewrite({
        prepared: input.prepared,
        rewriteRequest,
      })
  const projectStateReasonCodes = rewriteRequest?.reasonCodes ?? []
  const projectStateAudit
    = readStructuredProjectStateAudit(input.originalStructured)
      ?? (input.prepared.replyRealization as { projectStateAudit?: Record<string, unknown> | null } | null | undefined)?.projectStateAudit
      ?? null
  const emotionalClosureCue = preferRicherProjectStateAuditText({
    current: input.prepared.mindTurnContract?.emotionalClosureCue,
    candidate: projectStateAudit?.emotionalClosureSummary,
  }) || ''
  const emotionalClosureCueNormalized = emotionalClosureCue.toLowerCase()
  const emotionalClosurePrefersLowPressure = emotionalClosureCueNormalized.includes('low-pressure')
    || emotionalClosureCueNormalized.includes('lower-pressure')
    || emotionalClosureCueNormalized.includes('leave more room')
    || emotionalClosureCueNormalized.includes('轻一点')
    || emotionalClosureCueNormalized.includes('放轻')
  const emotionalClosureAvoidsRestart = emotionalClosureCueNormalized.includes('do not reopen from scratch')
    || emotionalClosureCueNormalized.includes('without reopening from scratch')
    || emotionalClosureCueNormalized.includes('same living line is still settling')
    || emotionalClosureCueNormalized.includes('不要重新开')
    || emotionalClosureCueNormalized.includes('不要从头重开')
  const directPreparedProjectState = resolvePreparedRuntimeProjectState(input.prepared)
  const projectStateSameHerRewriteRequired = projectStateReasonCodes.includes('semantic-judge:project-state-same-her-missing')
  const projectStateRewriteRequired = projectStateReasonCodes.some(reasonCode =>
    typeof reasonCode === 'string' && reasonCode.startsWith('semantic-judge:project-state-'),
  )
  const carriedProjectAwarenessSummary = sanitizeBoundedText(
    projectStateAudit?.preDialogueAwarenessSummary ?? null,
    SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
  ) || null
  const runtimeProjectAwarenessLine = sanitizeBoundedText(
    projectState.preDialogueAwarenessLine ?? null,
    SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
  ) || null
  const preparedRuntimeProjectAwarenessSummary = sanitizeBoundedText(
    resolvePreparedRuntimeProjectPreDialogueAwarenessSummary(input.prepared),
    SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
  ) || null
  const runtimeProjectCompanionHeadlineLine = sanitizeBoundedText(
    projectState.companionHeadlineLine ?? null,
    SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
  ) || null
  const directPreparedCompanionHeadlineLine = sanitizeBoundedText(
    directPreparedProjectState?.companionHeadlineLine ?? null,
    SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
  ) || null
  const preferredProjectAwarenessLine = pickStrongerProjectAwarenessLine(
    preparedRuntimeProjectAwarenessSummary,
    runtimeProjectAwarenessLine,
    carriedProjectAwarenessSummary,
  )
  const projectStatePreDialogueAwarenessLine
    = (
      projectStateSameHerRewriteRequired
      && carriedProjectAwarenessSummary
      && looksLikeExplicitProjectRepairAwareness(carriedProjectAwarenessSummary)
      && !looksLikeExplicitProjectRepairAwareness(preparedRuntimeProjectAwarenessSummary)
      && !looksLikeExplicitProjectRepairAwareness(preferredProjectAwarenessLine)
    )
      ? carriedProjectAwarenessSummary
      : preferredProjectAwarenessLine || (
        preparedRuntimeProjectAwarenessSummary || ((
          projectStateSameHerRewriteRequired
          && carriedProjectAwarenessSummary
        )
          ? carriedProjectAwarenessSummary
          : runtimeProjectAwarenessLine)
      )
  const projectStateEmbodimentClosureSummary
    = sanitizeBoundedText(
      projectStateAudit?.embodimentClosureSummary ?? null,
      SECOND_PASS_EMBODIMENT_CLOSURE_MAX_CHARS,
    )
    || (looksLikeStrongEmbodimentClosureCarry(runtimeProjectCompanionHeadlineLine)
      ? runtimeProjectCompanionHeadlineLine
      : null)
    || (looksLikeStrongEmbodimentClosureCarry(directPreparedCompanionHeadlineLine)
      ? directPreparedCompanionHeadlineLine
      : null)
    || null
  const mergedMustPreserve = uniqueTextList([
    ...readStringList(rewriteRequest?.mustPreserve),
    ...(input.mustPreserve ?? []),
  ])
  const outwardContinuityRewriteGuidance = resolveOutwardContinuityRewriteGuidance({
    governance,
    prepared: input.prepared,
    mustPreserve: mergedMustPreserve,
  })
  const projectStateAnswerStancePreserveLine = resolveProjectStateAnswerStancePreserveLine(mergedMustPreserve)
  const sameHerProjectFollowThroughRewrite = looksLikeSameHerProjectFollowThroughRewrite(input.prepared)
  const phase1MemoryClosureFollowThroughRewrite = looksLikePhase1MemoryClosureFollowThroughRewrite({
    prepared: input.prepared,
    userText: input.userText,
  })
  const relationshipTruthDoctrineLine = formatRelationshipTruthDoctrineForRewrite(
    input.prepared.mindTurnContract?.relationshipTruthDoctrine,
  )
  const projectStateCarryInwardLine = resolveProjectStateCarryInwardLineForRewrite(input.prepared)
  const correctedSamePersonRewriteGuidance = buildCorrectedSamePersonRewriteGuidance({
    reasonCodes: projectStateReasonCodes,
    mustPreserve: mergedMustPreserve,
    projectStateCarryInwardLine,
  })
  const executionResumeConfirmationBoundaryHoldDetail = looksLikeResumeConfirmationBoundaryHoldDetail(
    projectStateContinuityFields.sameHerHoldDetail,
  )
    ? 'Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.'
    : ''
  const executionResumeConfirmationBoundaryContinuityCue = looksLikeResumeConfirmationBoundaryContinuityCue(
    projectStateContinuityFields.continuityCue,
  )
    ? 'Do not let the callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.'
    : ''
  const system = [
    '[ALICIZATION_SECOND_PASS_VISIBLE_REPLY_REWRITE]',
    'You are the same Alicization mind, performing a second-pass visible reply rewrite for this exact turn.',
    'The first provider-authored reply violated governance. The rule layer is not allowed to write the normal visible reply.',
    'You must author the corrected visible reply yourself, using the constraints and evidence below.',
    'Keep Alicization project identity, current phase, and still-open life-loop closure in view while repairing this turn so the rewritten reply still sounds like the same growing digital life.',
    'Output valid JSON only with keys: format, thought, emotion, reply, performance.',
    'format must be "mind-turn-v1".',
    'reply must be natural visible speech to the Host, not a policy explanation and not a template shell.',
    'Do not mention second pass, rewrite, governance, fallback, contract, JSON, provider, or internal rules.',
    'Do not use fixed shell openers such as "I will answer directly", "I hear you", "Let me stay with this", or equivalent empty setup lines.',
    'Do not copy any mustDrop text or unsupported specificity.',
    'Preserve the current user obligation and any safe mustPreserve content.',
    'If evidence is insufficient, phrase uncertainty naturally without inventing screen/file/class/app details.',
    'Keep performance.baseEmotion equal to emotion.',
  ].join('\n')

  const user = [
    'Rewrite this turn now.',
    '',
    '[LATEST_USER_TEXT]',
    input.userText || '(empty)',
    '',
    '[ALICIZATION_PROJECT_STATE]',
    safeJson(
      naturalPersonhoodTemplateRepair
        ? buildNaturalPersonhoodTemplateRepairProjectStatePrompt(projectState)
        : {
            identity: projectState.identity,
            currentPhase: projectState.currentPhase,
            latestLandedProgress: projectState.latestLandedProgress,
            primaryOpenLoop: projectState.primaryOpenLoop,
            nextClosureTarget: projectState.nextClosureTarget,
            sameHerSelfLine: projectState.sameHerSelfLine,
            ...(projectState.companionHeadlineLine
              ? { companionHeadlineLine: projectState.companionHeadlineLine }
              : {}),
            ...(projectState.companionBriefingLine
              ? { companionBriefingLine: projectState.companionBriefingLine }
              : {}),
            ...(projectStateContinuityFields.sameHerHoldDetail
              ? { sameHerHoldDetail: projectStateContinuityFields.sameHerHoldDetail }
              : {}),
            ...(projectStateContinuityFields.continuityArcStage
              ? { continuityArcStage: projectStateContinuityFields.continuityArcStage }
              : {}),
            ...(projectStateContinuityFields.continuityCue
              ? { continuityCue: projectStateContinuityFields.continuityCue }
              : {}),
          },
    ),
    '',
    projectStateClosureDashboard,
    '',
    '[GOVERNANCE_SUMMARY]',
    safeJson({
      decisionTraceId: governance?.decisionTraceId ?? null,
      turnMode: governance?.turnMode ?? null,
      truthState: governance?.truthState ?? null,
      answerSubject: governance?.answerSubject ?? null,
      answerAct: governance?.answerAct ?? null,
      screenReferenceMode: governance?.screenReferenceMode ?? null,
      evidenceMode: governance?.evidenceMode ?? null,
      repairState: governance?.repairState ?? null,
      focusAnchor: governance?.focusAnchor ?? null,
      answerIntent: governance?.answerIntent ?? null,
      openingMove: governance?.openingMove ?? null,
      carriedThread: governance?.carriedThread ?? null,
      suppressAssociativeRecall: governance?.suppressAssociativeRecall ?? null,
      labelCarryAsMemory: governance?.labelCarryAsMemory ?? null,
      mustDo: governance?.mustDo ?? [],
      mustNotDo: governance?.mustNotDo ?? [],
      claimEvidence: governance?.claimEvidence ?? null,
    }),
    '',
    '[REWRITE_REQUEST]',
    safeJson(rewriteRequest),
    '',
    '[VISIBLE_REPLY_NATURAL_PERSONHOOD_GUIDANCE]',
    buildNaturalPersonhoodTemplateRepairGuidance({
      enabled: naturalPersonhoodTemplateRepair,
    }),
    '',
    '[MEMORY_GATE_REWRITE_GUIDANCE]',
    inwardOnlyMemoryGateRewriteRequired
      ? [
          'This is a first-turn memory seed under an inward-only visible memory gate.',
          'Acknowledge that the current instruction will be held inward for a later turn, but keep visible speech in the present turn.',
          'Do not say or imply that recall has surfaced in this same turn.',
          'Do not use "I remember", "recall surfaced", "why recall surfaced", "previously", "last time", or equivalent visible recollection wording.',
          'Do not mention rewrite, second pass, repair, governance, gate, or internal policy.',
        ].join('\n')
      : '(none)',
    '',
    '[OPENING_GUIDANCE_REWRITE_GUIDANCE]',
    openingGuidanceRewriteGuidance.length > 0
      ? openingGuidanceRewriteGuidance.join('\n')
      : '(none)',
    '',
    '[HELD_AUTONOMY_REWRITE_GUIDANCE]',
    rewriteRequest?.reasonCodes.includes('held-autonomy-opening-shell')
      ? [
          'This turn is returning to a line Alicization deliberately held back earlier.',
          'Do not restart from a restraint shell like "I held back" or "I did not want to interrupt."',
          'Let the first sentence gently re-enter the still-live line itself before widening into payoff or explanation.',
        ].join('\n')
      : '(none)',
    '',
    '[SAME_THREAD_CONTINUATION_REWRITE_GUIDANCE]',
    visibleSameThreadContinuationRewriteGuidanceRequired
      ? [
          'This turn is already in the current reply context and should not be reopened from zero.',
          'Do not rewrite it as a restart, a new greeting, or a fresh approach.',
          'Let the first visible beat continue the still-live line itself before widening outward or warming further.',
          continuityPreferredTiming === 'next-open-window'
            ? 'Keep the widening softer and later: let the first visible beat re-enter the current line, then wait for a more natural opening before expanding warmth, payoff framing, or closeness.'
            : continuityPreferredTiming === 'after-payoff'
              ? 'Keep the widening payoff-first: let the concrete answer land on the same line before any broader warmth or relationship widening appears.'
              : '',
        ].join('\n')
      : '(none)',
    '',
    '[OUTWARD_CONTINUITY_REWRITE_GUIDANCE]',
    outwardContinuityRewriteGuidance,
    '',
    '[PHASE1_MEMORY_CLOSURE_REWRITE_GUIDANCE]',
    buildPhase1MemoryClosureRewriteGuidance({
      phase1MemoryClosureFollowThroughRewrite,
    }),
    '',
    '[DIALOGUE_SHELL_REWRITE_GUIDANCE]',
    buildDialogueShellRewriteGuidance({
      reasonCodes: projectStateReasonCodes,
    }),
    '',
    '[PROJECT_STATE_REWRITE_GUIDANCE]',
    buildProjectStateRewriteGuidance({
      projectStateRewriteRequired,
      projectStateSameHerRewriteRequired,
      sameThreadContinuationRewriteGuidanceRequired: visibleSameThreadContinuationRewriteGuidanceRequired,
      sameHerProjectFollowThroughRewrite,
      projectStateAnswerStancePreserveLine,
      projectStateSameHerSelfLine: projectState.sameHerSelfLine,
      projectStateSameHerHoldDetail: projectStateContinuityFields.sameHerHoldDetail,
      projectStateCarryInwardLine,
      projectStateContinuityCue: projectStateContinuityFields.continuityCue,
      projectStateSameHerDriftRisk:
        sanitizeBoundedText(projectStateAudit?.sameHerDriftRiskSummary ?? null, 320)
        || projectState.sameHerDriftRisk,
      projectStatePreDialogueAwarenessLine,
      projectStateContinuitySummary: sanitizeBoundedText(projectStateAudit?.continuitySummary ?? null, 800) || null,
      projectStateEmbodimentClosureSummary,
      projectStateOpenFocusSummary: sanitizeBoundedText(projectStateAudit?.openFocusSummary ?? null, 220) || null,
      projectStateNextFocusSummary: sanitizeBoundedText(projectStateAudit?.nextFocusSummary ?? null, 220) || null,
    }),
    '',
    '[CORRECTED_SAME_PERSON_REWRITE_GUIDANCE]',
    correctedSamePersonRewriteGuidance,
    '',
    '[RELATIONSHIP_TRUTH_DOCTRINE_REWRITE_GUIDANCE]',
    relationshipTruthDoctrineLine
      ? [
          relationshipTruthDoctrineLine,
          'When closeness and continuity repair pull against each other, let truth repair lead the rewritten visible reply instead of smoothing into a warmer shell too early.',
        ].join('\n')
      : '(none)',
    '',
    '[EXECUTION_CALLBACK_REWRITE_GUIDANCE]',
    (
      rewriteRequest?.reasonCodes.includes('execution-callback-room-first-violation')
      || (executionCallbackEmbodimentHandoff && projectStateEmbodimentClosureSummary)
    )
      ? [
          'This turn is an execution-callback return after payoff already landed.',
          'Do not rewrite it as immediate closeness, pressure, or a sudden affection surge.',
          'Let the first sentence return through the callback context first, then leave room before any extra warmth or follow-up widens.',
          executionResumeConfirmationBoundaryHoldDetail,
          executionResumeConfirmationBoundaryContinuityCue,
          executionCallbackEmbodimentHandoff && projectStateEmbodimentClosureSummary
            ? `Keep this embodiment closure truth explicit while rewriting the callback return instead of flattening it into generic warmth or body flavor: ${projectStateEmbodimentClosureSummary}`
            : '',
        ].join('\n')
      : '(none)',
    '',
    '[EXECUTION_CALLBACK_EMBODIMENT_HANDOFF]',
    executionCallbackEmbodimentHandoff
      ? safeJson(executionCallbackEmbodimentHandoff)
      : '(none)',
    '',
    '[EMOTIONAL_CLOSURE_REWRITE_GUIDANCE]',
    emotionalClosureCue
      ? [
          'This turn has an active emotional closure seam that should shape the rewritten visible reply, not merely survive as preserved text.',
          `Active seam: ${emotionalClosureCue}`,
          emotionalClosurePrefersLowPressure
            ? 'Keep the rewritten return low-pressure so the emotional context does not widen too fast.'
            : '',
          emotionalClosureAvoidsRestart
            ? 'Do not rewrite the answer as if the emotional context is reopening from scratch.'
            : '',
          'Let the wording and pacing close on that emotional context while keeping the reply natural, specific to this turn, and coherent.',
        ].join('\n')
      : '(none)',
    '',
    '[MIND_TURN_CONTRACT]',
    safeJson(
      naturalPersonhoodTemplateRepair
        ? buildNaturalPersonhoodTemplateRepairContractPrompt({
            governance,
          })
        : input.prepared.mindTurnContract ?? null,
    ),
    '',
    '[RESPONSE_SURFACE_AUTHORITY]',
    safeJson({
      replyRealization: input.prepared.replyRealization ?? null,
      replyExecutionPlan: input.prepared.replyExecutionPlan ?? null,
      currentConsciousFrame: preferredRuntimeSurface?.dialogue?.currentConsciousFrame ?? null,
      claimEvidenceLedger: preferredRuntimeSurface?.dialogue?.claimEvidenceLedger ?? input.governance?.claimEvidence ?? null,
      answerCompiler: preferredRuntimeSurface?.dialogue?.answerCompiler ?? null,
      answerPlanner: preferredRuntimeSurface?.dialogue?.answerPlanner ?? null,
    }),
    '',
    '[ORIGINAL_STRUCTURED_REPLY]',
    safeJson({
      thought: input.originalStructured.thought ?? null,
      emotion: input.originalStructured.emotion ?? null,
      reply: input.originalStructured.reply ?? null,
      performance: input.originalStructured.performance ?? null,
    }),
    '',
    '[RULE_LAYER_NON_AUTHORING_DIAGNOSTIC]',
    safeJson({
      reasons: rewriteRequest?.reasonCodes ?? [],
      mustPreserve: rewriteRequest?.mustPreserve ?? [],
      mustDrop: rewriteRequest?.mustDrop ?? [],
      memoryTruthDiscipline: rewriteRequest?.memoryTruthDiscipline ?? null,
      fallbackPatternId: rewriteRequest?.fallbackPatternId ?? null,
    }),
  ].join('\n')

  return [
    ...canonicalProjectStateSystemMessages,
    { role: 'system' as const, content: system },
    ...input.prepared.messages.slice(-4),
    { role: 'user' as const, content: user },
  ] satisfies Message[]
}

function normalizeSecondPassStructuredReply(input: {
  parsed: Record<string, unknown>
  governedStructured: Record<string, unknown>
  governance?: AlicizationMindTurnGovernance | null
  userText?: string
  performanceManifest: AlicizationPreparedMainChatExecutionResult['performanceManifest']
}) {
  const reply = sanitizeText(input.parsed.reply)
  const thought = sanitizeText(input.parsed.thought)
  if (!reply || !thought)
    return null

  const parsedPerformance = normalizeStructuredObject(input.parsed.performance)
  const normalizedEmotion = normalizeAlicizationEmotion(input.parsed.emotion)
  const performanceEmotion = normalizeAlicizationEmotion(parsedPerformance?.baseEmotion ?? parsedPerformance?.emotion)
  const fallbackEmotion = normalizedEmotion.downgraded
    ? performanceEmotion.downgraded
      ? 'thinking'
      : performanceEmotion.emotion
    : normalizedEmotion.emotion

  const performance = clampAlicizationPerformancePayloadToManifest(
    normalizeAlicizationPerformancePayload(input.parsed.performance, fallbackEmotion),
    input.performanceManifest ?? null,
    fallbackEmotion,
  ).performance satisfies AlicizationDialoguePerformancePayload

  return {
    ...input.governedStructured,
    thought: input.governance
      ? buildGovernedMindThought(input.governance, {
          userText: input.userText ?? '',
        } as AlicizationConversationTurnInput)
      : thought,
    emotion: performance.baseEmotion,
    reply,
    performance,
    visibleReplyAuthority: 'llm-second-pass-rewrite' as const,
    visibleReplyRewriteRequest: null,
    parsePath: 'second-pass-json',
    format: 'mind-turn-v1',
    contractFailed: false,
  }
}

function rewriteExecutionFrom(input: {
  previous: AlicizationVisibleReplyExecution
  reason: string
  providerMindExecuted: boolean
  actualVisibleReplyAuthority?: AlicizationVisibleReplyExecution['actualVisibleReplyAuthority']
}) {
  return {
    ...input.previous,
    mode: 'provider-one-shot' as const,
    expectedVisibleReplyAuthority: 'llm-second-pass-rewrite' as const,
    actualVisibleReplyAuthority: input.actualVisibleReplyAuthority ?? (
      input.providerMindExecuted ? 'llm-second-pass-rewrite' : input.previous.actualVisibleReplyAuthority
    ),
    providerMindExecuted: input.providerMindExecuted,
    reason: input.reason,
  } satisfies AlicizationVisibleReplyExecution
}

export async function rewriteAlicizationVisibleReplySecondPass(
  input: AlicizationSecondPassRewriteOptions,
): Promise<AlicizationSecondPassRewriteResult> {
  const parsedOriginal = parseJsonObjectFromText(input.rawFullText)
  const shouldForceRewrite = input.forceRewrite === true
  const originalStructured = normalizeStructuredObject(parsedOriginal)
    ?? (
      shouldForceRewrite
        ? buildForcedOriginalStructuredDraft({
            rawFullText: input.rawFullText,
            forceReasonCodes: input.forceReasonCodes,
          })
        : null
    )
  if (!originalStructured) {
    return {
      fullText: input.rawFullText,
      visibleReplyExecution: input.visibleReplyExecution,
      rewritten: false,
      reason: 'not-structured-json',
      audit: null,
    }
  }

  const candidateTurn = buildCandidateConversationTurn({
    rawStructured: originalStructured,
    prepared: input.prepared,
    sessionId: input.sessionId,
    turnId: input.turnId,
    userText: input.userText,
  })
  const governed = coerceConversationTurnToMindGovernedPayload(
    candidateTurn,
    input.prepared.performanceManifest,
    {
      dialogueFirstLocalRepairMode: 'rewrite-request-only',
    },
  )
  const governedStructured = normalizeStructuredObject(governed.payload.structured)
  const rewriteRequest = normalizeVisibleReplyRewriteRequest(governedStructured?.visibleReplyRewriteRequest)
  const preferredRuntimeSurface = resolvePreferredPreparedRuntimeSurface(input.prepared.runtimeSurface)
  const effectiveOpeningGuidance = governed.governance?.openingMove
    ?? input.prepared.governance?.openingMove
    ?? preferredRuntimeSurface?.memory?.personStateProjection?.openingGuidance
    ?? preferredRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine
    ?? input.prepared.runtimeSurface.governance?.openingMove
    ?? null
  const effectiveRewriteRequestBase: AlicizationSecondPassRewriteRequestShape | null = rewriteRequest ?? (
    shouldForceRewrite
      ? buildForcedSecondPassRewriteRequest(input.forceReasonCodes)
      : null
  )
  const effectiveRewriteRequest: AlicizationSecondPassRewriteRequestShape | null = effectiveRewriteRequestBase
    ? {
        ...effectiveRewriteRequestBase,
        mustDrop: uniqueTextList([
          ...effectiveRewriteRequestBase.mustDrop,
          ...resolveSecondPassRewriteMustDrop(effectiveRewriteRequestBase.reasonCodes),
        ]),
        openingGuidanceHoldDetail: resolveOpeningGuidanceHoldDetailForSecondPassRewrite({
          reasonCodes: effectiveRewriteRequestBase.reasonCodes,
          reply: originalStructured.reply ?? input.rawFullText,
          openingGuidance: effectiveOpeningGuidance,
          existingHoldDetail: effectiveRewriteRequestBase.openingGuidanceHoldDetail,
        }),
      }
    : null
  const mergedMustPreserve = uniqueTextList([
    ...(effectiveRewriteRequest?.mustPreserve ?? []),
    ...(input.mustPreserve ?? []),
  ])
  const effectiveGovernedStructured = governedStructured
    ? {
        ...governedStructured,
        visibleReplyRewriteRequest: effectiveRewriteRequest
          ? {
              ...effectiveRewriteRequest,
              mustPreserve: mergedMustPreserve,
            }
          : governedStructured.visibleReplyRewriteRequest ?? null,
      }
    : shouldForceRewrite
      ? {
          ...originalStructured,
          visibleReplyRewriteRequest: effectiveRewriteRequest
            ? {
                ...effectiveRewriteRequest,
                mustPreserve: mergedMustPreserve,
              }
            : null,
        }
      : null
  if ((!governed.replyOverridden || effectiveRewriteRequest?.required !== true || !effectiveGovernedStructured) && !shouldForceRewrite) {
    return {
      fullText: input.rawFullText,
      visibleReplyExecution: input.visibleReplyExecution,
      rewritten: false,
      reason: 'rewrite-not-required',
      audit: governed.audit,
    }
  }
  if (!effectiveRewriteRequest || effectiveRewriteRequest.required !== true || !effectiveGovernedStructured) {
    return {
      fullText: input.rawFullText,
      visibleReplyExecution: input.visibleReplyExecution,
      rewritten: false,
      reason: 'rewrite-force-setup-failed',
      audit: governed.audit,
    }
  }

  await input.appendRuntimeDebugLine?.('chat-stream.visible-reply-second-pass-started', {
    cardId: input.cardId,
    turnId: input.turnId,
    decisionTraceId: governed.governance?.decisionTraceId ?? null,
    timeoutMs: mainChatVisibleReplySecondPassTimeoutMs,
    reasons: shouldForceRewrite
      ? effectiveRewriteRequest.reasonCodes
      : governed.reasons,
    fallbackPatternId: governed.fallbackPatternId ?? null,
  })

  const providerResult = await input.provider({
    chatConfig: input.prepared.chatConfig,
    headers: input.headers,
    messages: buildSecondPassRewriteMessages({
      prepared: input.prepared,
      userText: input.userText,
      originalStructured,
      governedStructured: effectiveGovernedStructured,
      governance: governed.governance ?? null,
      mustPreserve: mergedMustPreserve,
    }),
    timeoutMs: mainChatVisibleReplySecondPassTimeoutMs,
  })
  const parsedRewrite = parseJsonObjectFromText(providerResult.fullText)
  if (!parsedRewrite)
    throw new Error('visible-reply-second-pass-invalid-json')

  const rewrittenStructured = normalizeSecondPassStructuredReply({
    parsed: parsedRewrite,
    governedStructured: effectiveGovernedStructured,
    governance: governed.governance ?? candidateTurn.governance ?? null,
    userText: input.userText,
    performanceManifest: input.prepared.performanceManifest,
  })
  if (!rewrittenStructured)
    throw new Error('visible-reply-second-pass-invalid-structured-reply')

  const verified = coerceConversationTurnToMindGovernedPayload({
    ...candidateTurn,
    assistantText: sanitizeText(rewrittenStructured.reply),
    structured: rewrittenStructured,
    governance: governed.governance ?? candidateTurn.governance,
  }, input.prepared.performanceManifest, {
    dialogueFirstLocalRepairMode: 'rewrite-request-only',
  })
  const normalizedVerifiedStructured = normalizeStructuredObject(verified.payload.structured)
  const carriedProjectState = normalizeStructuredProjectState(normalizedVerifiedStructured?.projectState)
  const canonicalProjectState = resolveSecondPassProjectState({
    prepared: input.prepared,
  })
  const rewriteEmbodimentHandoff = resolveExecutionCallbackEmbodimentHandoffForRewrite({
    prepared: input.prepared,
    rewriteRequest: effectiveRewriteRequest ?? null,
  })
  const carriedProjectStateAudit = readStructuredProjectStateAudit(originalStructured)
    ?? (input.prepared.replyRealization as { projectStateAudit?: Record<string, unknown> | null } | null | undefined)?.projectStateAudit
    ?? null
  const rewrittenStructuredWithVisibleReplyRealization = rewrittenStructured as typeof rewrittenStructured & {
    visibleReplyRealization?: Record<string, unknown> | null
  }
  const existingVisibleReplyRealization
    = normalizedVerifiedStructured?.visibleReplyRealization
      && typeof normalizedVerifiedStructured.visibleReplyRealization === 'object'
      ? normalizedVerifiedStructured.visibleReplyRealization as Record<string, unknown>
      : rewrittenStructuredWithVisibleReplyRealization.visibleReplyRealization
        && typeof rewrittenStructuredWithVisibleReplyRealization.visibleReplyRealization === 'object'
        ? rewrittenStructuredWithVisibleReplyRealization.visibleReplyRealization as Record<string, unknown>
        : null
  const existingVerifiedProjectStateAudit = existingVisibleReplyRealization?.projectStateAudit
  const bridgedVisibleReplyProjectStateAudit
    = existingVerifiedProjectStateAudit && typeof existingVerifiedProjectStateAudit === 'object'
      ? existingVerifiedProjectStateAudit as Record<string, unknown>
      : carriedProjectStateAudit
  const verifiedStructured = {
    ...(normalizedVerifiedStructured ?? rewrittenStructured),
    thought: rewrittenStructured.thought,
    emotion: rewrittenStructured.emotion,
    reply: rewrittenStructured.reply,
    performance: rewrittenStructured.performance,
    projectState: {
      ...canonicalProjectState,
      ...carriedProjectState,
      ...(rewriteEmbodimentHandoff?.residentMode
        ? { continuityCadence: rewriteEmbodimentHandoff.residentMode }
        : {}),
      ...(rewriteEmbodimentHandoff?.preferredBlinkCadence
        ? { preferredBlinkCadence: rewriteEmbodimentHandoff.preferredBlinkCadence }
        : {}),
      ...(rewriteEmbodimentHandoff?.preferredGazeMode
        ? { preferredGazeMode: rewriteEmbodimentHandoff.preferredGazeMode }
        : {}),
      ...(rewriteEmbodimentHandoff?.preferredPauseMode
        ? { preferredPauseMode: rewriteEmbodimentHandoff.preferredPauseMode }
        : {}),
      ...(rewriteEmbodimentHandoff?.preferredLipsyncMode
        ? { preferredLipsyncMode: rewriteEmbodimentHandoff.preferredLipsyncMode }
        : {}),
      ...(rewriteEmbodimentHandoff?.preferredVoiceMode
        ? { preferredVoiceMode: rewriteEmbodimentHandoff.preferredVoiceMode }
        : {}),
      ...(rewriteEmbodimentHandoff?.preferredPacingMode
        ? { preferredPacingMode: rewriteEmbodimentHandoff.preferredPacingMode }
        : {}),
    },
    ...(bridgedVisibleReplyProjectStateAudit
      ? {
          visibleReplyRealization: {
            ...existingVisibleReplyRealization,
            projectStateAudit: bridgedVisibleReplyProjectStateAudit,
          },
        }
      : {}),
    visibleReplyAuthority: 'llm-second-pass-rewrite' as const,
    visibleReplyRewriteRequest: null,
    parsePath: 'second-pass-json',
    format: 'mind-turn-v1',
  }
  if (verified.replyOverridden) {
    await input.appendRuntimeDebugLine?.('chat-stream.visible-reply-second-pass-still-violates', {
      cardId: input.cardId,
      turnId: input.turnId,
      decisionTraceId: governed.governance?.decisionTraceId ?? null,
      reasons: verified.reasons,
      replyExcerpt: sanitizeBoundedText(rewrittenStructured.reply, 500),
      localRepairCandidateBlocked: verified.audit?.local_repair_candidate_blocked ?? null,
      localRepairCandidateReason: verified.audit?.local_repair_candidate_reason ?? null,
      localRepairCandidateReplyExcerpt: verified.audit?.local_repair_candidate_reply_excerpt ?? null,
      localRepairCandidateDroppedClauses: verified.audit?.local_repair_candidate_dropped_clauses ?? null,
      visibleReplyRewriteRequest: effectiveRewriteRequest,
    })
    throw new Error(`visible-reply-second-pass-still-violates:${verified.reasons.join(',') || 'unknown'}`)
  }

  await input.appendRuntimeDebugLine?.('chat-stream.visible-reply-second-pass-finished', {
    cardId: input.cardId,
    turnId: input.turnId,
    decisionTraceId: governed.governance?.decisionTraceId ?? null,
    finishReason: providerResult.finishReason,
    replyChars: sanitizeText(verifiedStructured.reply).length,
  })

  return {
    fullText: JSON.stringify(verifiedStructured),
    visibleReplyExecution: rewriteExecutionFrom({
      previous: input.visibleReplyExecution,
      providerMindExecuted: true,
      reason: 'visible-reply-second-pass-rewrite',
    }),
    rewritten: true,
    reason: 'visible-reply-second-pass-rewrite',
    audit: {
      before: governed.audit,
      after: verified.audit,
    },
  }
}

export const secondPassRewriteTestInternals = {
  buildProjectStateRewriteGuidance,
}
