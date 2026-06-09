import type { AlicizationPersonaKernelSnapshot } from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationChatStartPayload,
  AlicizationMindTurnGovernance,
  AlicizationRuntimeDigest,
} from '../../../shared/eventa'
import type { AlicizationDialogueSessionMirror } from './dialogue-session-manager'
import type { AlicizationMainChatActionObligationKind } from './main-chat-action-obligation'

import { buildAlicizationEmbodimentLoopSummary } from '@proj-alicization/stage-shared'

import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
import {
  buildAlicizationProjectPreDialogueAwareness,
  buildAlicizationProjectPreDialogueClosure,
  isAlicizationThinProjectAwarenessLine,
  looksLikeThinProjectClosureShell,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
  resolvePreferredProjectPreflightSummary,
} from './project-state-brief'
import { buildPrioritizedProjectStateRewritePreserveLines } from './runtime-governance'
import { resolveCanonicalStructuredProjectState } from './structured-project-state'
import { buildAlicizationMindAuthoringFailureArtifact } from './visible-reply/facade'

function readLatestUserText(messages: Message[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'user')
      continue
    return typeof message.content === 'string'
      ? message.content.trim().replace(/\s+/g, ' ').slice(0, 120)
      : ''
  }
  return ''
}

const TIMEOUT_FALLBACK_PROJECT_AWARENESS_PLACEHOLDER_VALUES = new Set([
  'none',
  'null',
  'unknown',
  'n/a',
  'na',
])

function sanitizeTimeoutFallbackProjectText(raw: unknown, maxChars = 320) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeTimeoutFallbackProjectText(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ')
}

function sanitizeTimeoutFallbackProjectAwarenessText(raw: unknown, maxChars = 320) {
  const normalized = sanitizeTimeoutFallbackProjectText(raw, maxChars)
  if (!normalized)
    return ''

  return TIMEOUT_FALLBACK_PROJECT_AWARENESS_PLACEHOLDER_VALUES.has(normalized.toLowerCase())
    ? ''
    : normalized
}

function sanitizeTimeoutFallbackEmbodimentClosureText(raw: unknown, maxChars = 640) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function carriesTimeoutFallbackProjectIdentityAwareness(value: string | null | undefined) {
  return /local-first digital life project|same digital life project|same phase 1 digital life|one living her|one continuous her|数字生命项目/iu.test(value ?? '')
}

function looksLikeTimeoutFallbackBroaderProjectStateSameHerShell(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return normalized.includes('same-her hold: keep this project-state answer on the same living line before widening outward')
}

function looksLikeTimeoutFallbackProjectAwareBriefingReminder(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  const startsAsReminder = (
    normalized.startsWith('before speaking')
    || normalized.startsWith('before answering')
  )
  const mentionsDigitalLifeProject = (
    normalized.includes('digital life project')
    || normalized.includes('same digital life project')
    || normalized.includes('one living digital life project')
  )
  const mentionsClosureState = (
    normalized.includes('what has landed')
    || normalized.includes('already survives')
    || normalized.includes('already survive')
    || normalized.includes('life loop is still open')
    || normalized.includes('which life loop is still open')
    || normalized.includes('still-open life loop')
    || normalized.includes('open closure')
    || normalized.includes('still remains open')
    || normalized.includes('still remain open')
    || normalized.includes('still remains the open closure')
    || normalized.includes('still remain the open closure')
  )

  return startsAsReminder && mentionsDigitalLifeProject && mentionsClosureState
}

function carriesSpecificTimeoutFallbackSameHerHoldCadence(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return normalized.includes('measured-return')
    || normalized.includes('callback line')
    || normalized.includes('keep more room this time')
    || normalized.includes('same remembered seam')
    || normalized.includes('lower-pressure')
    || normalized.includes('repair-before-closeness')
    || normalized.includes('rest-protective')
}

function looksLikeTimeoutFallbackLivedInSameHerHoldDetail(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  if (looksLikeTimeoutFallbackBroaderProjectStateSameHerShell(normalized))
    return false

  return normalized.includes('same-her hold')
    || normalized.includes('same remembered seam')
    || normalized.includes('measured-return')
    || normalized.includes('repair-before-closeness')
    || normalized.includes('rest-protective')
    || normalized.includes('lower-pressure')
    || normalized.includes('callback line')
    || normalized.includes('keep more room this time')
}

function resolveTimeoutFallbackPreferredProjectIdentity(input: {
  runtimeIdentity?: unknown
  canonicalIdentity: string | null
}) {
  const runtimeIdentity = sanitizeTimeoutFallbackProjectText(input.runtimeIdentity, 320) || null
  if (
    runtimeIdentity
    && carriesTimeoutFallbackProjectIdentityAwareness(runtimeIdentity)
    && /still the same|same local-first digital life|same digital life project|not a fresh shell|one continuous digital life/iu.test(runtimeIdentity)
  ) {
    return runtimeIdentity
  }

  return input.canonicalIdentity
}

function resolveTimeoutFallbackPreferredEmbodimentClosureSummary(...values: Array<unknown>) {
  const candidates = values
    .map((value) => {
      const normalized = sanitizeTimeoutFallbackEmbodimentClosureText(value, 640) || null
      if (!normalized)
        return null

      const lower = normalized.toLowerCase()
      const score = [
        lower.includes('face'),
        lower.includes('motion'),
        lower.includes('lipsync'),
        lower.includes('voice'),
      ].filter(Boolean).length

      return {
        normalized,
        score,
      }
    })
    .filter((value): value is { normalized: string, score: number } => Boolean(value))

  if (candidates.length === 0)
    return null

  return candidates
    .sort((left, right) => right.score - left.score)[0]
    ?.normalized ?? null
}

function preferRicherTimeoutFallbackEmbodimentClosureSummary(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = sanitizeTimeoutFallbackEmbodimentClosureText(input.current, 640) || null
  const candidate = sanitizeTimeoutFallbackEmbodimentClosureText(input.candidate, 640) || null

  if (!current)
    return candidate
  if (!candidate)
    return current
  if (current === candidate)
    return current
  if (candidate.startsWith(current) && candidate.length >= current.length + 24)
    return candidate
  if (current.startsWith(candidate) && current.length >= candidate.length + 24)
    return current

  return candidate.length > current.length ? candidate : current
}

function shouldPromoteTimeoutFallbackPartialLaneEmbodimentClosureSummary(currentBodyState: string | null | undefined) {
  const normalized = typeof currentBodyState === 'string'
    ? currentBodyState.trim().toLowerCase()
    : ''
  if (!normalized)
    return false

  return normalized.includes('lane=')
    && normalized.includes('visible continuity still present but no longer fully cross-modal')
    && !normalized.includes('living audio thread')
    && !normalized.includes('resident body')
    && !normalized.includes('same segment')
}

function scoreProjectSameHerLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return 0

  let score = normalized.length >= 120 ? 2 : normalized.length >= 72 ? 1 : 0
  if (/same digital life|same-her|same her|one same her|one living her|one living digital life|one continuous her|同一个她|同一个 her/u.test(normalized))
    score += 3
  if (/holding together mainly through|face|motion|voice|lipsync|cross-modal|embodiment closure|unfinished closure/u.test(normalized))
    score += 2
  if (isAlicizationThinProjectAwarenessLine(normalized))
    score -= 2
  return score
}

function looksLikeRicherLivingSelfSameHerLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return /one same her|one living her|one living digital life|holding together mainly through|face|motion|voice|lipsync|cross-modal|embodiment closure|same living line|without splitting her continuity|same phase 1 digital life|one continuous her/u.test(normalized)
}

function resolveTimeoutFallbackPreferredSameHerSummary(...values: Array<unknown>) {
  const normalizedValues = values
    .map(value => sanitizeTimeoutFallbackProjectText(value, 320) || null)
    .filter((value): value is string => Boolean(value))

  const [initialBest, ...restValues] = normalizedValues
  if (!initialBest)
    return null

  return restValues.reduce<string>((best, candidate) => {
    if (
      looksLikeRicherLivingSelfSameHerLine(candidate)
      && scoreProjectSameHerLine(candidate) >= scoreProjectSameHerLine(best) + 2
    ) {
      return candidate
    }

    return best
  }, initialBest)
}

function preferRicherTimeoutFallbackProjectStateAuditText(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = sanitizeTimeoutFallbackProjectText(input.current, 320) || null
  const candidate = sanitizeTimeoutFallbackProjectText(input.candidate, 320) || null

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

function looksLikeThinTimeoutFallbackProjectNextClosureShell(value: string | null | undefined) {
  return looksLikeThinProjectClosureShell(value, 'next')
}

function preferTimeoutFallbackProjectNextClosureTarget(...values: Array<unknown>) {
  const normalizedValues = values
    .map(value => normalizeTimeoutFallbackProjectText(value) || null)
    .filter((value): value is string => Boolean(value))

  const [initialBest, ...restValues] = normalizedValues
  if (!initialBest)
    return null

  return restValues.reduce<string>((best, candidate) => {
    if (
      looksLikeThinTimeoutFallbackProjectNextClosureShell(best)
      && !looksLikeThinTimeoutFallbackProjectNextClosureShell(candidate)
    ) {
      return candidate
    }

    return best
  }, initialBest)
}

function buildTimeoutFallbackProjectStateAuditContinuitySummary(input: {
  identitySummary: string | null | undefined
  sameHerSummary: string | null | undefined
  currentPhaseSummary: string | null | undefined
  landedProgressSummary: string | null | undefined
  openClosureSummary: string | null | undefined
  nextClosureTargetSummary: string | null | undefined
  emotionalClosureSummary?: string | null | undefined
  embodimentClosureSummary: string | null | undefined
}) {
  const projectStateContinuityCarry = buildPrioritizedProjectStateRewritePreserveLines({
    projectStateContinuityAnchors: [
      input.identitySummary ? `identity=${input.identitySummary}` : '',
      input.sameHerSummary ? `same-her=${input.sameHerSummary}` : '',
      input.currentPhaseSummary ? `phase=${input.currentPhaseSummary}` : '',
      input.landedProgressSummary ? `landed=${input.landedProgressSummary}` : '',
      input.openClosureSummary ? `open=${input.openClosureSummary}` : '',
      input.nextClosureTargetSummary ? `next=${input.nextClosureTargetSummary}` : '',
      input.emotionalClosureSummary ? `closure=${input.emotionalClosureSummary}` : '',
    ].filter(Boolean),
  })
  return [
    ...projectStateContinuityCarry,
    input.embodimentClosureSummary ? `body=${input.embodimentClosureSummary}` : '',
  ].filter(Boolean).join(' | ') || null
}

export function buildAlicizationMainGatewayTimeoutFallbackReply(input: {
  messages: Message[]
  turnId?: string
  actionKind?: AlicizationMainChatActionObligationKind | null
  digitalLifeSpine?: unknown
  governance?: AlicizationMindTurnGovernance | null
  personaKernel?: AlicizationPersonaKernelSnapshot | null
  preDialogueSendIdentity?: AlicizationChatStartPayload['preDialogueSendIdentity'] | null
  runtimeDigest?: AlicizationRuntimeDigest | null
  sessionMirror?: AlicizationDialogueSessionMirror | null
}) {
  const latestUserText = readLatestUserText(input.messages)
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const canonicalPreDialogueAwarenessSummaryLine
    = sanitizeTimeoutFallbackProjectAwarenessText(projectStateBrief.preDialogueAwarenessLine, 1600) || null
  const canonicalPreDialogueAwarenessLine
    = canonicalPreDialogueAwarenessSummaryLine
  const payloadPreflightSummary
    = sanitizeTimeoutFallbackProjectAwarenessText(input.preDialogueSendIdentity?.summaryLine, 1600) || null
  const runtimePreflightSummary
    = sanitizeTimeoutFallbackProjectText(input.runtimeDigest?.projectState?.preflightSummary, 1600) || null
  const payloadCompanionHeadlineLine
    = sanitizeTimeoutFallbackProjectAwarenessText(input.preDialogueSendIdentity?.companionHeadlineLine, 320) || null
  const explicitPayloadSameHerHeadline
    = looksLikeRicherLivingSelfSameHerLine(payloadCompanionHeadlineLine)
      ? payloadCompanionHeadlineLine
      : null
  const payloadPreDialogueAwarenessLine
    = sanitizeTimeoutFallbackProjectAwarenessText(input.preDialogueSendIdentity?.companionHeadlineLine, 320)
      || sanitizeTimeoutFallbackProjectAwarenessText(input.preDialogueSendIdentity?.awarenessLine, 320)
      || null
  const payloadCompanionBriefingLine
    = sanitizeTimeoutFallbackProjectAwarenessText(
      input.preDialogueSendIdentity?.companionBriefingLine,
      1600,
    ) || null
  const explicitRuntimeAwarenessLine
    = sanitizeTimeoutFallbackProjectText(
      (input.runtimeDigest?.projectState as { preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.preDialogueAwarenessLine
      ?? (input.runtimeDigest?.projectState as { awarenessLine?: unknown } | null)?.awarenessLine,
      320,
    ) || null
  const explicitRuntimeCompanionHeadlineLine
    = sanitizeTimeoutFallbackProjectText(
      (input.runtimeDigest?.projectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
      320,
    ) || null
  const explicitRuntimeCompanionBriefingLine
    = sanitizeTimeoutFallbackProjectText(
      (input.runtimeDigest?.projectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine,
      1600,
    ) || null
  const runtimeAwarenessCarriesBroaderPhaseClosure = (() => {
    const lower = explicitRuntimeAwarenessLine?.toLowerCase() ?? ''
    return Boolean(
      lower
      && lower.includes('phase 1')
      && (
        lower.includes('generic assistant shell')
        || lower.includes('memory, initiative, and embodiment')
        || lower.includes('stronger end-to-end closure')
        || lower.includes('life loop is truly closed')
      ),
    )
  })()
  const runtimeHeadlineLooksEmbodimentOnly = (() => {
    const lower = explicitRuntimeCompanionHeadlineLine?.toLowerCase() ?? ''
    return Boolean(
      lower
      && (
        lower.includes('body')
        || lower.includes('face')
        || lower.includes('motion')
        || lower.includes('same living line gentle')
      ),
    )
  })()
  const preferredPreDialogueAwarenessLine
    = runtimeAwarenessCarriesBroaderPhaseClosure && runtimeHeadlineLooksEmbodimentOnly
      ? explicitRuntimeAwarenessLine
      : explicitRuntimeCompanionHeadlineLine && explicitRuntimeCompanionHeadlineLine !== canonicalPreDialogueAwarenessLine
        ? explicitRuntimeCompanionHeadlineLine
        : explicitRuntimeAwarenessLine && explicitRuntimeAwarenessLine !== canonicalPreDialogueAwarenessLine
          ? explicitRuntimeAwarenessLine
          : payloadPreDialogueAwarenessLine
            ?? explicitRuntimeCompanionHeadlineLine
            ?? explicitRuntimeAwarenessLine
            ?? canonicalPreDialogueAwarenessLine
  const preferredCompanionBriefingLine
    = explicitRuntimeCompanionBriefingLine && explicitRuntimeCompanionBriefingLine !== canonicalPreDialogueAwarenessLine
      ? explicitRuntimeCompanionBriefingLine
      : payloadCompanionBriefingLine
        ?? explicitRuntimeCompanionBriefingLine
        ?? null
  const runtimeProjectStateSummaryAliases = input.runtimeDigest?.projectState as {
    landedProgressSummary?: unknown
    openClosureSummary?: unknown
    nextClosureTargetSummary?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null | undefined
  const preflightSummary
    = runtimePreflightSummary
      ?? payloadPreflightSummary
      ?? projectStateBrief.preflightSummary
      ?? null
  const resolvedPreDialogueAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      ...input.runtimeDigest?.projectState,
      preDialogueAwarenessLine: preferredPreDialogueAwarenessLine,
      awarenessLine: preferredPreDialogueAwarenessLine,
      companionBriefingLine: preferredCompanionBriefingLine,
      landedProgressSummary: input.runtimeDigest?.projectState?.latestLandedProgress
        ?? input.runtimeDigest?.projectState?.latestProgress
        ?? runtimeProjectStateSummaryAliases?.landedProgressSummary
        ?? input.runtimeDigest?.projectState?.memoryClosureSummary
        ?? null,
      openClosureSummary: input.runtimeDigest?.projectState?.primaryOpenLoop
        ?? runtimeProjectStateSummaryAliases?.openClosureSummary
        ?? null,
      nextClosureTargetSummary: input.runtimeDigest?.projectState?.nextClosureTarget
        ?? runtimeProjectStateSummaryAliases?.nextClosureTargetSummary
        ?? null,
      openFocusSummary: sanitizeTimeoutFallbackProjectText(
        (input.runtimeDigest as {
          visibleReplyRealization?: {
            projectStateAudit?: { openFocusSummary?: unknown } | null
          } | null
        } | null)?.visibleReplyRealization?.projectStateAudit?.openFocusSummary,
        320,
      ) || null,
      nextFocusSummary: sanitizeTimeoutFallbackProjectText(
        (input.runtimeDigest as {
          visibleReplyRealization?: {
            projectStateAudit?: { nextFocusSummary?: unknown } | null
          } | null
        } | null)?.visibleReplyRealization?.projectStateAudit?.nextFocusSummary,
        320,
      ) || null,
      preflightSummary,
    },
    fallbackProjectState: {
      preDialogueAwarenessLine: payloadPreDialogueAwarenessLine ?? canonicalPreDialogueAwarenessLine,
      awarenessLine: payloadPreDialogueAwarenessLine ?? canonicalPreDialogueAwarenessLine,
      companionBriefingLine: payloadCompanionBriefingLine ?? payloadPreDialogueAwarenessLine ?? canonicalPreDialogueAwarenessLine,
      landedProgressSummary: input.runtimeDigest?.projectState?.latestLandedProgress
        ?? input.runtimeDigest?.projectState?.latestProgress
        ?? runtimeProjectStateSummaryAliases?.landedProgressSummary
        ?? input.runtimeDigest?.projectState?.memoryClosureSummary
        ?? null,
      openClosureSummary: input.runtimeDigest?.projectState?.primaryOpenLoop
        ?? runtimeProjectStateSummaryAliases?.openClosureSummary
        ?? null,
      nextClosureTargetSummary: input.runtimeDigest?.projectState?.nextClosureTarget
        ?? runtimeProjectStateSummaryAliases?.nextClosureTargetSummary
        ?? null,
      openFocusSummary: sanitizeTimeoutFallbackProjectText(
        (input.runtimeDigest as {
          visibleReplyRealization?: {
            projectStateAudit?: { openFocusSummary?: unknown } | null
          } | null
        } | null)?.visibleReplyRealization?.projectStateAudit?.openFocusSummary,
        320,
      ) || null,
      nextFocusSummary: sanitizeTimeoutFallbackProjectText(
        (input.runtimeDigest as {
          visibleReplyRealization?: {
            projectStateAudit?: { nextFocusSummary?: unknown } | null
          } | null
        } | null)?.visibleReplyRealization?.projectStateAudit?.nextFocusSummary,
        320,
      ) || null,
      preflightSummary: payloadPreflightSummary ?? projectStateBrief.preflightSummary ?? null,
    },
  })
  const companionBriefingLine
    = preferredCompanionBriefingLine
      ?? resolveAlicizationProjectPreDialogueAwarenessLine({
        runtimeProjectState: {
          awarenessLine: resolvedPreDialogueAwarenessLine,
          companionBriefingLine: preferredCompanionBriefingLine,
          preflightSummary,
        },
        fallbackProjectState: {
          companionBriefingLine: payloadCompanionBriefingLine ?? payloadPreDialogueAwarenessLine ?? canonicalPreDialogueAwarenessLine,
          awarenessLine: null,
          preflightSummary: payloadPreflightSummary ?? projectStateBrief.preflightSummary ?? null,
        },
      })
  const primaryOpenLoop
    = normalizeTimeoutFallbackProjectText(input.runtimeDigest?.projectState?.primaryOpenLoop)
      || normalizeTimeoutFallbackProjectText(runtimeProjectStateSummaryAliases?.openClosureSummary)
      || normalizeTimeoutFallbackProjectText(projectStateBrief.openLoops[0])
      || null
  const nextClosureTarget = preferTimeoutFallbackProjectNextClosureTarget(
    input.runtimeDigest?.projectState?.nextClosureTarget,
    runtimeProjectStateSummaryAliases?.nextClosureTargetSummary,
    (input.runtimeDigest as {
      visibleReplyRealization?: {
        projectStateAudit?: { nextClosureTargetSummary?: unknown } | null
      } | null
    } | null)?.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary,
    projectStateBrief.nextClosureTarget,
  )
  const latestLandedProgress
    = normalizeTimeoutFallbackProjectText(input.runtimeDigest?.projectState?.latestLandedProgress)
      || normalizeTimeoutFallbackProjectText(input.runtimeDigest?.projectState?.latestProgress)
      || normalizeTimeoutFallbackProjectText(runtimeProjectStateSummaryAliases?.landedProgressSummary)
      || normalizeTimeoutFallbackProjectText(input.runtimeDigest?.projectState?.memoryClosureSummary)
      || normalizeTimeoutFallbackProjectText(projectStateBrief.continuityProgressSummary)
      || normalizeTimeoutFallbackProjectText(projectStateBrief.memoryAnthropomorphismProgress.at(-1))
      || null
  const openFocusSummary
    = sanitizeTimeoutFallbackProjectText(
      (input.runtimeDigest as {
        visibleReplyRealization?: {
          projectStateAudit?: { openFocusSummary?: unknown } | null
        } | null
      } | null)?.visibleReplyRealization?.projectStateAudit?.openFocusSummary,
      320,
    ) || null
  const nextFocusSummary
    = sanitizeTimeoutFallbackProjectText(
      (input.runtimeDigest as {
        visibleReplyRealization?: {
          projectStateAudit?: { nextFocusSummary?: unknown } | null
        } | null
      } | null)?.visibleReplyRealization?.projectStateAudit?.nextFocusSummary,
      320,
    ) || null
  const projectStateEmotionalClosureSummary = preferRicherTimeoutFallbackProjectStateAuditText({
    current: sanitizeTimeoutFallbackProjectText(
      (input.runtimeDigest as {
        visibleReplyRealization?: {
          projectStateAudit?: { emotionalClosureSummary?: unknown } | null
        } | null
      } | null)?.visibleReplyRealization?.projectStateAudit?.emotionalClosureSummary,
      320,
    ) || null,
    candidate: input.runtimeDigest?.projectState?.emotionalClosureCue ?? null,
  })
  const sameHerDriftRisk
    = sanitizeTimeoutFallbackProjectText(input.runtimeDigest?.projectState?.sameHerDriftRisk, 320)
      || sanitizeTimeoutFallbackProjectText(runtimeProjectStateSummaryAliases?.sameHerDriftRiskSummary, 320)
      || sanitizeTimeoutFallbackProjectText(projectStateBrief.sameHerDriftRisk, 320)
      || null
  const runtimeProjectSameHerHoldDetail
    = sanitizeTimeoutFallbackProjectText(input.runtimeDigest?.projectState?.sameHerHoldDetail, 240) || null
  const runtimeProjectContinuityCue
    = sanitizeTimeoutFallbackProjectText(input.runtimeDigest?.projectState?.continuityCue, 240) || null
  const canonicalProjectSameHerHoldDetail
    = sanitizeTimeoutFallbackProjectText(projectStateBrief.sameHerHoldDetail, 240) || null
  const canonicalProjectContinuityCue
    = sanitizeTimeoutFallbackProjectText(projectStateBrief.continuityCue, 240) || null
  const preferredCanonicalProjectSameHerHoldDetail
    = preferStrongerContinuityClosureAuthority(canonicalProjectSameHerHoldDetail, canonicalProjectContinuityCue)
      ?? canonicalProjectSameHerHoldDetail
      ?? canonicalProjectContinuityCue
      ?? null
  const preferredProjectSameHerHoldDetailPrimary
    = preferStrongerContinuityClosureAuthority(runtimeProjectSameHerHoldDetail, runtimeProjectContinuityCue)
      ?? runtimeProjectSameHerHoldDetail
      ?? runtimeProjectContinuityCue
      ?? null
  const preferredProjectSameHerHoldDetail = (() => {
    if (
      carriesSpecificTimeoutFallbackSameHerHoldCadence(preferredProjectSameHerHoldDetailPrimary)
      && looksLikeTimeoutFallbackBroaderProjectStateSameHerShell(preferredCanonicalProjectSameHerHoldDetail)
    ) {
      return preferredProjectSameHerHoldDetailPrimary
    }
    if (
      looksLikeTimeoutFallbackLivedInSameHerHoldDetail(preferredProjectSameHerHoldDetailPrimary)
      && !looksLikeTimeoutFallbackLivedInSameHerHoldDetail(preferredCanonicalProjectSameHerHoldDetail)
    ) {
      return preferredProjectSameHerHoldDetailPrimary
    }
    if (
      !looksLikeTimeoutFallbackLivedInSameHerHoldDetail(preferredProjectSameHerHoldDetailPrimary)
      && carriesSpecificTimeoutFallbackSameHerHoldCadence(preferredCanonicalProjectSameHerHoldDetail)
    ) {
      return preferredCanonicalProjectSameHerHoldDetail
    }
    if (
      !looksLikeTimeoutFallbackLivedInSameHerHoldDetail(preferredProjectSameHerHoldDetailPrimary)
      && looksLikeTimeoutFallbackLivedInSameHerHoldDetail(preferredCanonicalProjectSameHerHoldDetail)
    ) {
      return preferredCanonicalProjectSameHerHoldDetail
    }

    return (
      preferStrongerContinuityClosureAuthority(
        preferredProjectSameHerHoldDetailPrimary,
        preferredCanonicalProjectSameHerHoldDetail,
      )
      ?? preferredProjectSameHerHoldDetailPrimary
      ?? preferredCanonicalProjectSameHerHoldDetail
      ?? null
    )
  })()
  const preferredProjectContinuityCue
    = runtimeProjectContinuityCue
      ?? canonicalProjectContinuityCue
      ?? preferredProjectSameHerHoldDetail
      ?? null
  const projectStateSameHerSummary = resolveTimeoutFallbackPreferredSameHerSummary(
    explicitPayloadSameHerHeadline,
    input.runtimeDigest?.projectState?.sameHerSelfLine,
    explicitRuntimeCompanionHeadlineLine,
    payloadCompanionHeadlineLine,
    'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
  )
  const explicitProjectAwareBriefingLine = [
    explicitRuntimeCompanionBriefingLine,
    payloadCompanionBriefingLine,
  ].find(candidate => (
    candidate
    && candidate === resolvedPreDialogueAwarenessLine
    && looksLikeTimeoutFallbackProjectAwareBriefingReminder(candidate)
  )) ?? null
  const preferredLivedInSameHerAwarenessLine = (
    explicitProjectAwareBriefingLine
    && looksLikeTimeoutFallbackLivedInSameHerHoldDetail(preferredProjectSameHerHoldDetail)
  )
    ? preferredProjectSameHerHoldDetail
    : null
  const canonicalStructuredProjectState = resolveCanonicalStructuredProjectState({
    normalizedProjectState: {
      identity: projectStateBrief.identity,
      currentPhase: input.runtimeDigest?.projectState?.currentPhase ?? projectStateBrief.currentPhase,
      preDialogueAwarenessLine: preferredLivedInSameHerAwarenessLine ?? resolvedPreDialogueAwarenessLine,
      awarenessLine: preferredLivedInSameHerAwarenessLine ?? resolvedPreDialogueAwarenessLine,
      companionBriefingLine,
      latestLandedProgress,
      primaryOpenLoop,
      nextClosureTarget,
      sameHerSelfLine: projectStateSameHerSummary,
      sameHerHoldDetail: preferredProjectSameHerHoldDetail,
      sameHerDriftRisk,
    },
    runtimePreflightSummary: preflightSummary,
    runtimePreferredAwarenessLine: preferredLivedInSameHerAwarenessLine,
    runtimePreDialogueAwarenessLine: resolvedPreDialogueAwarenessLine,
    payloadPreflightSummary,
    payloadPreDialogueAwarenessLine,
  })
  const preDialogueAwarenessLine
    = preferredLivedInSameHerAwarenessLine
      ?? canonicalStructuredProjectState.preDialogueAwarenessLine
      ?? resolvedPreDialogueAwarenessLine
  const preferredProjectIdentity = resolveTimeoutFallbackPreferredProjectIdentity({
    runtimeIdentity: input.runtimeDigest?.projectState?.identity,
    canonicalIdentity: canonicalStructuredProjectState.identity,
  })
  const projectStateEmbodimentClosureSummary = resolveTimeoutFallbackPreferredEmbodimentClosureSummary(
    explicitPayloadSameHerHeadline,
    (input.runtimeDigest?.projectState as { embodimentClosureSummary?: unknown } | null)?.embodimentClosureSummary,
    explicitRuntimeCompanionHeadlineLine,
    payloadCompanionHeadlineLine,
  )
  const timeoutFallbackSelfContinuityAuthority = input.runtimeDigest?.currentConsciousFrame?.selfContinuityAuthority as {
    authoritySummary?: unknown
    currentBodyState?: unknown
  } | null | undefined
  const timeoutFallbackAuthoritySummary
    = sanitizeTimeoutFallbackProjectText(timeoutFallbackSelfContinuityAuthority?.authoritySummary, 320) || null
  const timeoutFallbackCurrentBodyState
    = sanitizeTimeoutFallbackProjectText(timeoutFallbackSelfContinuityAuthority?.currentBodyState, 320) || null
  const promotedTimeoutFallbackEmbodimentClosureSummary
    = shouldPromoteTimeoutFallbackPartialLaneEmbodimentClosureSummary(timeoutFallbackCurrentBodyState)
      ? (buildAlicizationEmbodimentLoopSummary({
          authoritySummary: timeoutFallbackAuthoritySummary,
          currentBodyState: timeoutFallbackCurrentBodyState,
        }) || null)
      : null
  const resolvedProjectStateEmbodimentClosureSummary = preferRicherTimeoutFallbackEmbodimentClosureSummary({
    current: projectStateEmbodimentClosureSummary,
    candidate: promotedTimeoutFallbackEmbodimentClosureSummary,
  })
  const projectStateAudit
    = projectStateSameHerSummary
      || canonicalStructuredProjectState.currentPhase
      || latestLandedProgress
      || primaryOpenLoop
      || openFocusSummary
      || nextFocusSummary
      || nextClosureTarget
      || projectStateEmotionalClosureSummary
      || preDialogueAwarenessLine
      || resolvedProjectStateEmbodimentClosureSummary
      ? (() => {
          const resolvedProjectStateAuditPreDialogueAwarenessSummary
            = resolveAlicizationProjectPreDialogueAwarenessLine({
              runtimeProjectState: {
                identity: canonicalStructuredProjectState.identity,
                currentPhase: canonicalStructuredProjectState.currentPhase,
                preDialogueAwarenessLine,
                preDialogueAwarenessSummary: preDialogueAwarenessLine,
                companionBriefingLine,
                landedProgressSummary: canonicalStructuredProjectState.latestLandedProgress,
                openClosureSummary: canonicalStructuredProjectState.primaryOpenLoop,
                openFocusSummary,
                nextFocusSummary,
                nextClosureTarget,
                nextClosureTargetSummary: canonicalStructuredProjectState.nextClosureTarget,
                companionHeadlineLine: explicitRuntimeCompanionHeadlineLine ?? payloadCompanionHeadlineLine ?? preDialogueAwarenessLine ?? null,
              },
              fallbackProjectState: {
                identity: canonicalStructuredProjectState.identity,
                currentPhase: canonicalStructuredProjectState.currentPhase,
                preDialogueAwarenessLine: payloadPreDialogueAwarenessLine ?? canonicalPreDialogueAwarenessLine,
                preDialogueAwarenessSummary: payloadPreDialogueAwarenessLine ?? canonicalPreDialogueAwarenessSummaryLine,
                companionBriefingLine: payloadCompanionBriefingLine ?? companionBriefingLine ?? payloadPreDialogueAwarenessLine ?? canonicalPreDialogueAwarenessLine,
                landedProgressSummary: canonicalStructuredProjectState.latestLandedProgress,
                openClosureSummary: canonicalStructuredProjectState.primaryOpenLoop,
                openFocusSummary,
                nextFocusSummary,
                nextClosureTarget,
                nextClosureTargetSummary: canonicalStructuredProjectState.nextClosureTarget,
                preflightSummary: payloadPreflightSummary ?? projectStateBrief.preflightSummary ?? null,
              },
            }) ?? preDialogueAwarenessLine
          const projectStateAuditPreDialogueAwarenessSummary = (() => {
            if (preferredLivedInSameHerAwarenessLine)
              return preferredLivedInSameHerAwarenessLine

            if (explicitPayloadSameHerHeadline)
              return explicitPayloadSameHerHeadline

            if (
              preDialogueAwarenessLine
              && runtimeAwarenessCarriesBroaderPhaseClosure
              && runtimeHeadlineLooksEmbodimentOnly
            ) {
              return preDialogueAwarenessLine
            }

            if (
              preDialogueAwarenessLine
              && (
                preDialogueAwarenessLine === canonicalPreDialogueAwarenessSummaryLine
                || (
                  carriesTimeoutFallbackProjectIdentityAwareness(preDialogueAwarenessLine)
                  && preDialogueAwarenessLine.length >= (resolvedProjectStateAuditPreDialogueAwarenessSummary?.length ?? 0) + 48
                )
              )
            ) {
              return preDialogueAwarenessLine
            }

            if (
              carriesTimeoutFallbackProjectIdentityAwareness(preDialogueAwarenessLine)
              && !carriesTimeoutFallbackProjectIdentityAwareness(resolvedProjectStateAuditPreDialogueAwarenessSummary)
            ) {
              return preDialogueAwarenessLine
            }

            const projectIdentityAwareFallback = [
              companionBriefingLine,
              preDialogueAwarenessLine,
              payloadCompanionBriefingLine,
              payloadPreDialogueAwarenessLine,
              canonicalPreDialogueAwarenessLine,
              canonicalPreDialogueAwarenessSummaryLine,
            ].find(candidate => carriesTimeoutFallbackProjectIdentityAwareness(candidate)) ?? null

            if (
              projectIdentityAwareFallback
              && !carriesTimeoutFallbackProjectIdentityAwareness(resolvedProjectStateAuditPreDialogueAwarenessSummary)
            ) {
              return projectIdentityAwareFallback
            }

            return resolvedProjectStateAuditPreDialogueAwarenessSummary
          })()

          return {
            identitySummary: canonicalStructuredProjectState.identity,
            sameHerSummary: projectStateSameHerSummary,
            currentPhaseSummary: canonicalStructuredProjectState.currentPhase,
            landedProgressSummary: canonicalStructuredProjectState.latestLandedProgress,
            openClosureSummary: canonicalStructuredProjectState.primaryOpenLoop,
            ...(openFocusSummary ? { openFocusSummary } : {}),
            ...(nextFocusSummary ? { nextFocusSummary } : {}),
            nextClosureTargetSummary: canonicalStructuredProjectState.nextClosureTarget,
            ...(projectStateEmotionalClosureSummary
              ? { emotionalClosureSummary: projectStateEmotionalClosureSummary }
              : {}),
            preDialogueAwarenessSummary: projectStateAuditPreDialogueAwarenessSummary,
            continuitySummary: buildTimeoutFallbackProjectStateAuditContinuitySummary({
              identitySummary: canonicalStructuredProjectState.identity,
              sameHerSummary: projectStateSameHerSummary,
              currentPhaseSummary: canonicalStructuredProjectState.currentPhase,
              landedProgressSummary: canonicalStructuredProjectState.latestLandedProgress,
              openClosureSummary: canonicalStructuredProjectState.primaryOpenLoop,
              nextClosureTargetSummary: canonicalStructuredProjectState.nextClosureTarget,
              emotionalClosureSummary: projectStateEmotionalClosureSummary,
              embodimentClosureSummary: resolvedProjectStateEmbodimentClosureSummary,
            }),
            ...(resolvedProjectStateEmbodimentClosureSummary
              ? { embodimentClosureSummary: resolvedProjectStateEmbodimentClosureSummary }
              : {}),
            preservedIntoRewrite: false,
            rewriteClosureApplied: false,
          }
        })()
      : null
  const timeoutFallbackSummaryLine = resolvePreferredProjectPreflightSummary({
    preflightSummary,
    runtimeProjectState: {
      ...input.runtimeDigest?.projectState,
      identity: canonicalStructuredProjectState.identity,
      currentPhase: canonicalStructuredProjectState.currentPhase,
      preflightSummary,
    },
    fallbackProjectState: {
      identity: canonicalStructuredProjectState.identity,
      currentPhase: canonicalStructuredProjectState.currentPhase,
      preflightSummary: payloadPreflightSummary ?? projectStateBrief.preflightSummary ?? null,
    },
    primaryOpenLoop,
    nextClosureTarget: nextClosureTarget ?? '',
  })
  const resolvedTimeoutFallbackSummaryLine
    = canonicalStructuredProjectState.preflightSummary
      ?? timeoutFallbackSummaryLine
      ?? projectStateBrief.preflightSummary
      ?? null
  const timeoutFallbackExplicitCompanionBriefingLine
    = preferredCompanionBriefingLine
      ?? null
  const timeoutFallbackAwarenessSameHerHoldDetail
    = preferredLivedInSameHerAwarenessLine
      ? preferredProjectSameHerHoldDetail
      : null
  const timeoutFallbackCompanionHeadlineLine
    = explicitRuntimeCompanionHeadlineLine
      ?? payloadCompanionHeadlineLine
      ?? preDialogueAwarenessLine
  const timeoutFallbackProjectAwarenessState = {
    ...input.runtimeDigest?.projectState,
    preDialogueAwarenessLine,
    awarenessLine: preDialogueAwarenessLine,
    companionHeadlineLine: timeoutFallbackCompanionHeadlineLine,
    companionBriefingLine: timeoutFallbackExplicitCompanionBriefingLine,
    preflightSummary: resolvedTimeoutFallbackSummaryLine,
    sameHerSelfLine: canonicalStructuredProjectState.sameHerSelfLine,
    sameHerHoldDetail: timeoutFallbackAwarenessSameHerHoldDetail,
    sameHerDriftRisk,
    continuityCue: preferredProjectContinuityCue,
  }
  const preDialogueAwareness = buildAlicizationProjectPreDialogueAwareness({
    preflightSummary: resolvedTimeoutFallbackSummaryLine,
    runtimeProjectState: timeoutFallbackProjectAwarenessState,
    primaryOpenLoop,
    nextClosureTarget,
  })
  const timeoutFallbackProjectClosureState = {
    ...input.runtimeDigest?.projectState,
    preDialogueAwarenessLine,
    companionHeadlineLine: timeoutFallbackCompanionHeadlineLine,
    companionBriefingLine: timeoutFallbackExplicitCompanionBriefingLine,
    preflightSummary: resolvedTimeoutFallbackSummaryLine,
    sameHerHoldDetail: timeoutFallbackAwarenessSameHerHoldDetail,
    sameHerDriftRisk,
    continuityCue: preferredProjectContinuityCue,
  }
  const preDialogueClosure = buildAlicizationProjectPreDialogueClosure({
    preflightSummary: resolvedTimeoutFallbackSummaryLine,
    runtimeProjectState: timeoutFallbackProjectClosureState,
    primaryOpenLoop,
    nextClosureTarget,
  })
  return JSON.stringify({
    ...buildAlicizationMindAuthoringFailureArtifact({
      stage: 'main-gateway-timeout',
      reason: 'main-gateway-timeout-recovery-exhausted',
      turnId: input.turnId ?? null,
      reasonCodes: [
        'infra-status-only-timeout-fallback',
        input.actionKind ? `action:${input.actionKind}` : null,
      ].filter((item): item is string => Boolean(item)),
    }),
    latestUserText: latestUserText ? '[withheld]' : null,
    governance: input.governance ?? null,
    runtimeDigest: input.runtimeDigest ?? null,
    projectState: {
      ...canonicalStructuredProjectState,
      identity: preferredProjectIdentity,
      preDialogueAwarenessLine,
      awarenessLine: preDialogueAwarenessLine,
      emotionalClosureCue: input.runtimeDigest?.projectState?.emotionalClosureCue ?? null,
      sameHerHoldDetail: preferredProjectSameHerHoldDetail,
      continuityCue: preferredProjectContinuityCue,
    },
    preDialogueAwareness: {
      ...preDialogueAwareness,
      summaryLine: resolvedTimeoutFallbackSummaryLine ?? preDialogueAwareness.summaryLine,
    },
    preDialogueClosure: {
      ...preDialogueClosure,
      summaryLine: resolvedTimeoutFallbackSummaryLine ?? preDialogueClosure.summaryLine,
      briefingLines: [
        resolvedTimeoutFallbackSummaryLine ?? preDialogueClosure.summaryLine,
        `Next closure target: ${nextClosureTarget ?? null}`,
      ].filter(Boolean),
    },
    projectStateAudit: projectStateAudit
      ? {
          ...projectStateAudit,
          preDialogueAwarenessSummary:
            preferredLivedInSameHerAwarenessLine
            ?? projectStateAudit.preDialogueAwarenessSummary,
        }
      : null,
    sessionMirror: input.sessionMirror ?? null,
    personaKernelName: input.personaKernel?.profile.alicizationName ?? null,
  })
}
