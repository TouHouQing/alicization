import type { AlicizationSensoryCacheSnapshot } from '../../../shared/eventa'
import type { AlicizationAgentSessionSnapshot } from './agent-runtime'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationDigitalLifeSpineSnapshot } from './digital-life-spine'
import type { AlicizationMainChatRuntimeSurface } from './main-chat-runtime-surface'
import type { OrganicMemoryPromptContext, OrganicMemoryRecollectionCarry } from './runtime-soul'

import {
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { deriveAlicizationRuntimeSnapshot } from './alicization-runtime-architecture'
import { deriveAlicizationDialogueMemoryCarryPolicy } from './dialogue-memory-governor'
import {
  deriveAlicizationDigitalLifeSpineFromSurface,
  projectAlicizationDigitalLifeSpineDigest,
} from './digital-life-spine'
import {
  buildAlicizationProjectPreDialogueAwarenessLine,
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateSnapshot,
} from './project-state-brief'
import {
  deriveCompactProjectStateNextFocusSummary,
  deriveCompactProjectStateOpenFocusSummary,
} from './project-state-focus'
import { resolvePreferredRuntimeSurface } from './runtime-surface-continuity-selection'

export interface AlicizationDialogueSessionMirror {
  agencySummary: string | null
  cardId: string
  continuityArcSummary?: string | null
  continuityProjectSummary?: string | null
  continuityLabels: string[]
  decisionTraceId: string | null
  dialogueSummary: string | null
  digitalLifeArchitectureSummary: string | null
  digitalLifeRuntimeSummary: string | null
  runtimeChannelSummary?: string | null
  runtimeTransitionSummary?: string | null
  captureSummary: string
  executionSummary: string | null
  mindSummary: string | null
  memoryCarrySummary: string | null
  memorySummary: string | null
  recollection: AlicizationDialogueSessionRecollectionState | null
  perceptionSummary: string | null
  sessionId: string
  sessionPhases: string[]
  toolingSummary: string
  updatedAt: number
}

export type AlicizationDialogueSessionRecollectionState = OrganicMemoryRecollectionCarry

export interface AlicizationDialogueSessionManager {
  buildSessionMirrorSystemBlock: (input: {
    cardId: string
    sessionId: string
  }) => string
  clear: (cardId?: string) => void
  getSessionMirror: (cardId: string, sessionId: string) => AlicizationDialogueSessionMirror | null
  ingestAgentSessionSnapshot: (input: {
    agentSession: AlicizationAgentSessionSnapshot
    cardId: string
    decisionTraceId?: string | null
    sessionId: string
    sessionPhases?: string[]
    source: string
  }) => AlicizationDialogueSessionMirror
  ingestPreparedExecution: (input: {
    agentSession: AlicizationAgentSessionSnapshot
    cardId: string
    digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
    organicMemoryContext?: OrganicMemoryPromptContext | null
    runtimeSurface: AlicizationMainChatRuntimeSurface
    sessionId: string
  }) => AlicizationDialogueSessionMirror
}

interface CreateAlicizationDialogueSessionManagerOptions {
  getNow?: () => number
  maxContinuityLabels?: number
  maxSessionPhases?: number
  staleAfterMs?: number
}

const defaultSessionMirrorStaleAfterMs = 10 * 60 * 1000
const defaultMaxContinuityLabels = 6
const defaultMaxSessionPhases = 10
const continuityArcSummaryMaxChars = 840
const continuityProjectSummaryMaxChars = 960
const continuityArcSummaryValueMaxChars = 420
const projectAwarenessLineMaxChars = 1600

function sanitizeText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueMirrorSegments(values: Array<string | null | undefined>) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, continuityArcSummaryValueMaxChars)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
  }
  return result
}

function fixedMirrorTemplateStructuredFact(raw: unknown, maxChars = 320) {
  const normalized = sanitizeText(raw, maxChars)
  if (!normalized || !containsAlicizationFixedTemplateResidue(normalized))
    return ''

  const lowered = normalized.toLowerCase()
  const segments = uniqueMirrorSegments([
    /phase\s*1|local-first|digital life|数字生命|alicization/u.test(lowered)
      ? `runtime_personhood${/apps\/stage-tamagotchi|proving ground/u.test(lowered) ? '; proving_ground=apps/stage-tamagotchi' : ''}`
      : null,
    /landed|already|progress|survive|落地|已/u.test(lowered)
      ? 'continuity_progress=partial'
      : null,
    /memory|initiative|embodiment|dialogue|open loop|still need|unresolved|closure|记忆|主动|具身|闭环/u.test(lowered)
      ? 'unresolved_closure=memory_dialogue_embodiment'
      : null,
    /cross[-_ ]modal|voice|face|motion|lipsync|resident|next|proof|表情|动作|口型|声音/u.test(lowered)
      ? 'embodiment_scale_validation=extend_on_longer_noisy_desktop_runs'
      : null,
    /right now|holding together|body|face|motion|lipsync|voice|embodiment|具身/u.test(lowered)
      ? 'embodiment_status; lane=unknown; status=partial; missing_lanes=body+face+motion+lipsync+voice; closure=full-cross-modal-open; visibility=renderer-internal'
      : null,
    /same phase 1|same digital life|same[- ]her|same living|one continuous|one living|同一个/u.test(lowered)
      ? 'project_anchor=runtime_personhood; landed_closure=partial; unresolved_closure=memory_dialogue_embodiment; owner=project_state_governance'
      : null,
    /generic guidance|generic project|thin project|detached|drift|漂|模板/u.test(lowered)
      ? 'template_residue_risk=generic_shell; closure_status=unfinished'
      : null,
    /repair-before-closeness|repair first|repair settles|修复/u.test(lowered)
      ? 'cadence=repair_before_closeness; timing=before_closeness_widens'
      : null,
    /measured-return|lower-pressure|low-pressure|leave room|留白|放轻/u.test(lowered)
      ? 'cadence=lower_pressure_return; pacing=slower; widening=deferred'
      : null,
  ])

  return segments.join('; ') || alicizationFixedTemplateReplacement
}

function sanitizeMirrorProviderFacingText(raw: unknown, maxChars = 320) {
  const normalized = sanitizeText(raw, maxChars)
  if (!normalized)
    return ''

  const providerSafe = sanitizeAlicizationProviderFacingText(normalized, maxChars, '')
  return providerSafe || fixedMirrorTemplateStructuredFact(normalized, maxChars)
}

function sanitizeMirrorProviderFacingSummary(raw: unknown, maxChars = continuityArcSummaryMaxChars) {
  const normalized = sanitizeText(raw, maxChars)
  if (!normalized)
    return ''

  const providerSafe = sanitizeAlicizationProviderFacingText(normalized, maxChars, '')
  if (providerSafe)
    return providerSafe

  const segments = normalized.split(/\s*\|\s*/u).map((part) => {
    const normalizedPart = sanitizeText(part, continuityArcSummaryValueMaxChars)
    if (!normalizedPart)
      return ''

    const separatorIndex = normalizedPart.indexOf('=')
    if (separatorIndex <= 0)
      return sanitizeMirrorProviderFacingText(normalizedPart, continuityArcSummaryValueMaxChars)

    const rawKey = sanitizeText(normalizedPart.slice(0, separatorIndex), 64)
    const key = rawKey === 'same_her' ? 'continuity_anchor' : rawKey
    const value = sanitizeMirrorProviderFacingText(
      normalizedPart.slice(separatorIndex + 1),
      Math.max(80, continuityArcSummaryValueMaxChars - key.length - 1),
    )
    return key && value ? `${key}=${value}` : ''
  }).filter(Boolean)

  return uniqueMirrorSegments(segments).join(' | ')
}

function sanitizeMirrorContinuityLabel(raw: unknown) {
  const normalized = sanitizeText(raw, 80)
  if (!normalized)
    return ''
  if (!containsAlicizationFixedTemplateResidue(normalized))
    return normalized

  return normalized
    .replace(/same[-_ ]her/giu, 'continuity-anchor')
    .replace(/same[-_ ]line/giu, 'continuity-line')
    .replace(/same[-_ ]living/giu, 'continuity')
    .replace(/one[-_ ]living/giu, 'continuity')
    .replace(/one[-_ ]continuous/giu, 'continuity')
    .replace(/local[-_ ]first[-_ ]digital[-_ ]life/giu, 'phase1-local-digital-life')
}

function sanitizeProjectStateContinuityAnchor(raw: unknown, maxChars = 220) {
  return sanitizeMirrorProviderFacingText(raw, maxChars)
}

function sanitizeProjectStatePreferredVoiceMode(raw: unknown) {
  const normalized = sanitizeText(raw, 32).toLowerCase()
  return normalized === 'lower-pressure' || normalized === 'even'
    ? normalized
    : ''
}

function sanitizeProjectStatePreferredPacingMode(raw: unknown) {
  const normalized = sanitizeText(raw, 32).toLowerCase()
  return normalized === 'slower' || normalized === 'natural'
    ? normalized
    : ''
}

function sanitizeProjectStatePreferredPauseMode(raw: unknown) {
  const normalized = sanitizeText(raw, 32).toLowerCase()
  return normalized === 'longer' || normalized === 'natural'
    ? normalized
    : ''
}

function sanitizeProjectStatePreferredLipsyncMode(raw: unknown) {
  const normalized = sanitizeText(raw, 32).toLowerCase()
  return normalized === 'restrained' || normalized === 'matched'
    ? normalized
    : ''
}

function sanitizeProjectStatePreferredBlinkCadence(raw: unknown) {
  const normalized = sanitizeText(raw, 32).toLowerCase()
  return normalized === 'quiet' || normalized === 'linger' || normalized === 'normal'
    ? normalized
    : ''
}

function sanitizeProjectStatePreferredGazeMode(raw: unknown) {
  const normalized = sanitizeText(raw, 32).toLowerCase()
  return normalized === 'soften' || normalized === 'steady' || normalized === 'drift'
    ? normalized
    : ''
}

function buildMirrorKey(cardId: string, sessionId: string) {
  return `${cardId}::${sessionId}`
}

function takeTailUnique(values: unknown[], limit: number, maxChars = 120) {
  const normalized: string[] = []
  const seen = new Set<string>()

  for (let index = values.length - 1; index >= 0; index -= 1) {
    const text = sanitizeText(values[index], maxChars)
    if (!text || seen.has(text))
      continue
    seen.add(text)
    normalized.push(text)
    if (normalized.length >= limit)
      break
  }

  return normalized.reverse()
}

function asRecord(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function asStringArray(raw: unknown) {
  return Array.isArray(raw)
    ? raw.map(value => sanitizeText(value, 120)).filter(Boolean)
    : []
}

function extractContinuityKeyDetail(summary: string, key: 'timing' | 'cadence' | 'project' | 'unresolved') {
  const match = new RegExp(`${key}=([^|]+)`).exec(summary)
  const value = sanitizeText(match?.[1]?.trim() ?? '', 80)
  return value ? `${key}=${value}` : ''
}

function readContinuitySignalField(
  continuitySignal: AlicizationDigitalLifeSpineSnapshot['continuitySignal'] | null | undefined,
  field: 'activeThreadId' | 'dominantMode' | 'dominantDrive' | 'answerIntent' | 'preferredPresence',
) {
  if (!continuitySignal || typeof continuitySignal !== 'object')
    return ''

  const metadata = asRecord(continuitySignal.metadata)
  const legacy = continuitySignal as unknown as Record<string, unknown>

  return sanitizeText(
    metadata?.[field] ?? legacy[field] ?? '',
    field === 'activeThreadId' ? 120 : 80,
  )
}

function resolvePreparedProjectRuntimeSurface(
  surface: AlicizationMainChatRuntimeSurface | AlicizationDigitalLifeRuntimeSurface | null | undefined,
) {
  if (!surface)
    return null

  if ('digitalLifeRuntimeSurface' in surface) {
    return resolvePreferredPreparedRuntimeSurface(surface)
      ?? surface.digitalLifeRuntimeSurface
      ?? surface.digitalLifeSpine?.runtimeSurface
      ?? null
  }

  return surface
}

function readPreparedRuntimeProjectState(
  surface: AlicizationMainChatRuntimeSurface | AlicizationDigitalLifeRuntimeSurface | null | undefined,
) {
  const runtimeSurface = resolvePreparedProjectRuntimeSurface(surface)
  return runtimeSurface?.dialogue?.currentConsciousFrame?.projectState
    ?? runtimeSurface?.raw?.runtimeDigest?.projectState
    ?? runtimeSurface?.raw?.runtime?.projectState
    ?? runtimeSurface?.cognition?.runtimeDigest?.projectState
    ?? runtimeSurface?.dialogue?.runtimeDigest?.projectState
    ?? null
}

function resolveMirrorProjectStateFromPreparedRuntimeSurface(
  surface: AlicizationMainChatRuntimeSurface | AlicizationDigitalLifeRuntimeSurface | null | undefined,
) {
  const brief = resolveAlicizationProjectStateBrief()
  const runtimeProjectState = readPreparedRuntimeProjectState(surface)
  const snapshot = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: runtimeProjectState as {
      identity?: unknown
      currentPhase?: unknown
      preflightSummary?: unknown
      preDialogueAwarenessLine?: unknown
      awarenessLine?: unknown
      companionHeadlineLine?: unknown
      companionBriefingLine?: unknown
      preDialogueAwarenessSummary?: unknown
      latestLandedProgress?: unknown
      latestProgress?: unknown
      primaryOpenLoop?: unknown
      nextClosureTarget?: unknown
      sameHerSelfLine?: unknown
      sameHerDriftRisk?: unknown
      emotionalClosureCue?: unknown
      emotionalClosureSummary?: unknown
      sameHerHoldDetail?: unknown
      continuityArcStage?: unknown
      continuityCue?: unknown
    } | null,
    fallbackProjectState: {
      identity: brief.identity,
      currentPhase: brief.currentPhase,
      preflightSummary: brief.preflightSummary ?? null,
      preDialogueAwarenessLine: brief.preDialogueAwarenessLine ?? null,
      latestProgress: brief.latestProgress,
      primaryOpenLoop: brief.openLoops[0] ?? null,
      nextClosureTarget: brief.nextClosureTarget,
      sameHerSelfLine: brief.sameHerSelfLine,
      sameHerDriftRisk: brief.sameHerDriftRisk,
      emotionalClosureCue: brief.emotionalClosureCue ?? null,
      emotionalClosureSummary: brief.emotionalClosureSummary ?? null,
      sameHerHoldDetail: brief.sameHerHoldDetail ?? null,
    },
  })

  const phase = sanitizeMirrorProviderFacingText(snapshot.currentPhase ?? brief.currentPhase, 160)
  const latestLandedProgress = sanitizeMirrorProviderFacingText(
    snapshot.latestLandedProgress ?? snapshot.latestProgress ?? brief.continuityProgressSummary ?? brief.latestProgress,
    220,
  )
  const primaryOpenLoop = sanitizeMirrorProviderFacingText(snapshot.primaryOpenLoop ?? brief.openLoops[0] ?? '', 220)
  const nextClosureTarget = sanitizeMirrorProviderFacingText(snapshot.nextClosureTarget ?? brief.nextClosureTarget, 220)
  const sameHerSelfLine = sanitizeProjectStateContinuityAnchor(snapshot.sameHerSelfLine ?? brief.sameHerSelfLine, 220)
  const rebuiltAwarenessLine = sanitizeMirrorProviderFacingSummary(buildAlicizationProjectPreDialogueAwarenessLine({
    identity: snapshot.identity ?? brief.identity,
    currentPhase: phase || brief.currentPhase,
    latestLandedProgress,
    latestProgress: snapshot.latestProgress ?? brief.latestProgress,
    primaryOpenLoop,
    nextClosureTarget,
    sameHerSelfLine,
  }) ?? '', projectAwarenessLineMaxChars)
  const companionHeadlineLine = sanitizeMirrorProviderFacingSummary(
    snapshot.companionHeadlineLine
    ?? runtimeProjectState?.companionHeadlineLine
    ?? runtimeProjectState?.companionBriefingLine
    ?? '',
    projectAwarenessLineMaxChars,
  )
  const rawPreDialogueAwarenessLine = sanitizeText(
    companionHeadlineLine
    || (
      snapshot.preDialogueAwarenessLine
      ?? resolveAlicizationProjectPreDialogueAwarenessLine({
        runtimeProjectState: runtimeProjectState as {
          preDialogueAwarenessLine?: unknown
          companionHeadlineLine?: unknown
          companionBriefingLine?: unknown
          preflightSummary?: unknown
        } | null,
        fallbackProjectState: {
          preDialogueAwarenessLine: brief.preDialogueAwarenessLine ?? null,
          preflightSummary: brief.preflightSummary ?? null,
        },
      })
      ?? ''
    ),
    projectAwarenessLineMaxChars,
  ) || sanitizeText(
    snapshot.preflightSummary ?? runtimeProjectState?.preflightSummary ?? brief.preflightSummary ?? '',
    projectAwarenessLineMaxChars,
  )
  const preDialogueAwarenessLine = looksLikeFixedContinuityProjectAwarenessTemplate(rawPreDialogueAwarenessLine)
    ? sanitizeText(rebuiltAwarenessLine, projectAwarenessLineMaxChars)
    : rawPreDialogueAwarenessLine
  return {
    landed: latestLandedProgress || '',
    next: nextClosureTarget || '',
    project: 'phase1-digital-life',
    unresolved: primaryOpenLoop || '',
    phase,
    preDialogueAwarenessLine: sanitizeMirrorProviderFacingSummary(preDialogueAwarenessLine, projectAwarenessLineMaxChars) || '',
    sameHerSelfLine: sameHerSelfLine || '',
  }
}

function summarizeContinuityProjectFromPreparedRuntimeSurface(
  surface: AlicizationMainChatRuntimeSurface | AlicizationDigitalLifeRuntimeSurface | null | undefined,
) {
  const projectState = resolveMirrorProjectStateFromPreparedRuntimeSurface(surface)
  return [
    projectState.project ? `project=${projectState.project}` : '',
    projectState.phase ? `phase=${projectState.phase}` : '',
    projectState.landed ? `landed=${projectState.landed}` : '',
    projectState.unresolved ? `unresolved=${projectState.unresolved}` : '',
    projectState.next ? `next=${projectState.next}` : '',
    projectState.sameHerSelfLine ? `project_anchor=${projectState.sameHerSelfLine}` : '',
    projectState.preDialogueAwarenessLine ? `awareness_summary=${projectState.preDialogueAwarenessLine}` : '',
  ].filter(Boolean).join(' | ')
}

function looksLikeMirrorProjectReanchor(raw: unknown) {
  const text = sanitizeText(raw, projectAwarenessLineMaxChars).toLowerCase()
  if (!text)
    return false

  return (
    text.includes('alicization is a local-first digital life project')
    || text.includes('before answering, remember: alicization is a local-first digital life project')
  ) && text.includes('phase 1')
  && (
    text.includes('unfinished closure')
    || text.includes('still-open closure')
    || text.includes('same living line')
    || text.includes('same-life closure')
  )
}

function looksLikeThinContinuityProjectPreflightSummary(raw: unknown) {
  const text = sanitizeText(raw, projectAwarenessLineMaxChars).toLowerCase()
  if (!text)
    return true

  return isAlicizationThinProjectAwarenessLine(text)
    || /keep the same digital life project in view|generic continuity summary|generic awareness summary|generic reminder|generic guidance|same digital life \| keep the closure seam explicit/u.test(text)
    || text === 'project'
    || text === 'phase 1'
    || text.startsWith('same digital life')
}

function looksLikeFixedContinuityProjectAwarenessTemplate(raw: unknown) {
  const text = sanitizeText(raw, projectAwarenessLineMaxChars).toLowerCase()
  if (!text)
    return false

  return /\bbefore answering\b|same phase 1 digital life|same living line|same digital life project/u.test(text)
}

function looksLikeNarrowSameHerContinuityProjectLine(raw: unknown) {
  const text = sanitizeText(raw, projectAwarenessLineMaxChars).toLowerCase()
  if (!text)
    return false

  return /phase1_local_digital_life_anchor|same phase 1 digital life|same living line|same her|same-her|one continuous her/u.test(text)
    && !text.includes('alicization is a local-first digital life project')
    && !text.includes('before answering, remember:')
}

function looksLikeRichContinuityProjectClosureSnapshot(input: {
  latestLandedProgress?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  sameHerSelfLine?: string | null
}) {
  const latestLandedProgress = sanitizeText(input.latestLandedProgress, 320).toLowerCase()
  const primaryOpenLoop = sanitizeText(input.primaryOpenLoop, 320).toLowerCase()
  const nextClosureTarget = sanitizeText(input.nextClosureTarget, 320).toLowerCase()
  const sameHerSelfLine = sanitizeText(input.sameHerSelfLine, 320).toLowerCase()

  return (
    (
      /project identity|phase 1 route|unresolved closure|same-her continuity|closure already landed|project-state carry|同一个她|项目身份|同一条线/u.test(latestLandedProgress)
      || /project identity|cross-modal same-her proof|next closure|项目身份|同一个她|同一条线|下一步|living line/u.test(nextClosureTarget)
    )
    && /memory|initiative|embodiment|closure|主动性|具身|闭环|未闭环|same living line/u.test(primaryOpenLoop)
    && /phase1_local_digital_life_anchor|same phase 1 digital life|same living line|unfinished closure|same her|same-her|同一个她|同一条线/u.test(sameHerSelfLine)
  )
}

function summarizeContinuityProjectFromSignals(
  continuitySignals: AlicizationAgentSessionSnapshot['continuitySignals'],
) {
  const latestExecutionLikeSignal = [...continuitySignals]
    .reverse()
    .find((signal) => {
      const metadata = asRecord(signal.metadata)
      if (!metadata)
        return false
      const label = sanitizeText(signal.label, 120).toLowerCase()
      const summary = sanitizeText(signal.summary ?? '', 220).toLowerCase()
      const source = sanitizeText(metadata.source, 96).toLowerCase()
      return label.includes('execution-callback')
        || label.includes('held-autonomy')
        || source === 'proactive-held-autonomy'
        || source === 'proactive-deferred'
        || source === 'autobiographical-afterglow'
        || summary.includes('continuity=execution-callback')
    }) ?? null
  if (!latestExecutionLikeSignal)
    return ''

  const metadata = asRecord(latestExecutionLikeSignal.metadata)
  const explicitAwarenessLine = sanitizeMirrorProviderFacingSummary(
    metadata?.projectStatePreDialogueAwarenessSummary
    ?? metadata?.projectStatePreDialogueAwarenessLine,
    projectAwarenessLineMaxChars,
  )
  const explicitCompanionHeadlineLine = sanitizeMirrorProviderFacingSummary(
    metadata?.projectStateCompanionHeadlineLine,
    projectAwarenessLineMaxChars,
  )
  const explicitPreflightSummary = sanitizeMirrorProviderFacingSummary(
    metadata?.projectStatePreflightSummary,
    projectAwarenessLineMaxChars,
  )
  const latestLandedProgress = sanitizeMirrorProviderFacingText(metadata?.projectLatestLandedProgress, 220)
    || sanitizeMirrorProviderFacingText(metadata?.projectLatestProgress, 220)
    || sanitizeMirrorProviderFacingText(metadata?.projectStateLandedProgressSummary, 220)
  const primaryOpenLoop = sanitizeMirrorProviderFacingText(metadata?.projectPrimaryOpenLoop, 220)
    || sanitizeMirrorProviderFacingText(metadata?.projectStateOpenClosureSummary, 220)
  const nextClosureTarget = sanitizeMirrorProviderFacingText(metadata?.projectNextClosureTarget, 220)
    || sanitizeMirrorProviderFacingText(metadata?.projectStateNextClosureTargetSummary, 220)
  const sameHerDriftRisk = sanitizeMirrorProviderFacingText(metadata?.projectStateSameHerDriftRisk, 220)
    || sanitizeMirrorProviderFacingText(metadata?.projectStateSameHerDriftRiskSummary, 220)
  const projectState = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: {
      identity: metadata?.projectIdentity,
      currentPhase: metadata?.projectPhase,
      preflightSummary: metadata?.projectStatePreflightSummary,
      preDialogueAwarenessLine:
        metadata?.projectStatePreDialogueAwarenessSummary
        ?? metadata?.projectStatePreDialogueAwarenessLine,
      preDialogueAwarenessSummary:
        metadata?.projectStatePreDialogueAwarenessSummary
        ?? metadata?.projectStatePreDialogueAwarenessLine,
      companionHeadlineLine: metadata?.projectStateCompanionHeadlineLine,
      latestLandedProgress: latestLandedProgress || null,
      latestProgress: latestLandedProgress || null,
      landedProgressSummary: metadata?.projectStateLandedProgressSummary,
      primaryOpenLoop: primaryOpenLoop || null,
      openClosureSummary: metadata?.projectStateOpenClosureSummary,
      nextClosureTarget: nextClosureTarget || null,
      nextClosureTargetSummary: metadata?.projectStateNextClosureTargetSummary,
      sameHerSelfLine: metadata?.projectStateSameHerSelfLine,
      sameHerDriftRisk: sameHerDriftRisk || null,
      sameHerDriftRiskSummary: metadata?.projectStateSameHerDriftRiskSummary,
      emotionalClosureCue: metadata?.projectStateEmotionalClosureCue,
      emotionalClosureSummary: metadata?.projectStateEmotionalClosureSummary,
      sameHerHoldDetail: metadata?.projectStateSameHerHoldDetail,
    },
  })
  const rebuiltAwarenessLine = sanitizeMirrorProviderFacingSummary(buildAlicizationProjectPreDialogueAwarenessLine({
    identity: projectState.identity,
    currentPhase: projectState.currentPhase,
    latestLandedProgress: projectState.latestLandedProgress,
    latestProgress: projectState.latestProgress,
    primaryOpenLoop: projectState.primaryOpenLoop,
    nextClosureTarget: projectState.nextClosureTarget,
    sameHerSelfLine: projectState.sameHerSelfLine,
  }) ?? '', projectAwarenessLineMaxChars)
  const resolvedExplicitAwarenessLine = sanitizeText(
    resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: explicitAwarenessLine || null,
        companionHeadlineLine: explicitCompanionHeadlineLine || null,
        sameHerSelfLine: projectState.sameHerSelfLine,
        preflightSummary: explicitPreflightSummary || projectState.preflightSummary,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine:
          projectState.preDialogueAwarenessSummary
          ?? projectState.preDialogueAwarenessLine
          ?? null,
        companionHeadlineLine: projectState.companionHeadlineLine ?? null,
        sameHerSelfLine: projectState.sameHerSelfLine,
        preflightSummary: projectState.preflightSummary,
      },
    }) ?? '',
    projectAwarenessLineMaxChars,
  )
  const resolvedAwarenessLooksThinOrNarrowSameHer
    = (
      looksLikeThinContinuityProjectPreflightSummary(resolvedExplicitAwarenessLine)
      || looksLikeNarrowSameHerContinuityProjectLine(resolvedExplicitAwarenessLine)
      || looksLikeNarrowSameHerContinuityProjectLine(projectState.sameHerSelfLine)
    )
  const shouldPreferStructuredAwarenessRebuild
    = (
      !explicitAwarenessLine
      && !explicitCompanionHeadlineLine
      && !projectState.sameHerSelfLine
    )
    || (
      isAlicizationThinProjectAwarenessLine(explicitAwarenessLine)
      && !explicitCompanionHeadlineLine
      && !projectState.sameHerSelfLine
    )
    || (
      !explicitCompanionHeadlineLine
      && looksLikeThinContinuityProjectPreflightSummary(explicitPreflightSummary)
      && resolvedAwarenessLooksThinOrNarrowSameHer
      && looksLikeRichContinuityProjectClosureSnapshot({
        latestLandedProgress: projectState.latestLandedProgress,
        primaryOpenLoop: projectState.primaryOpenLoop,
        nextClosureTarget: projectState.nextClosureTarget,
        sameHerSelfLine: projectState.sameHerSelfLine,
      })
    )
  const preDialogueAwarenessLine = sanitizeMirrorProviderFacingSummary(
    shouldPreferStructuredAwarenessRebuild
      ? rebuiltAwarenessLine
      : looksLikeMirrorProjectReanchor(explicitAwarenessLine)
        ? resolvedExplicitAwarenessLine || explicitAwarenessLine || rebuiltAwarenessLine
        : resolvedExplicitAwarenessLine || explicitAwarenessLine || rebuiltAwarenessLine,
    projectAwarenessLineMaxChars,
  ) || sanitizeMirrorProviderFacingSummary(projectState.preflightSummary ?? '', projectAwarenessLineMaxChars)

  return [
    'project=phase1-digital-life',
    projectState.currentPhase ? `phase=${sanitizeMirrorProviderFacingText(projectState.currentPhase, 160)}` : '',
    projectState.latestLandedProgress ? `landed=${sanitizeMirrorProviderFacingText(projectState.latestLandedProgress, 220)}` : '',
    projectState.primaryOpenLoop ? `unresolved=${sanitizeMirrorProviderFacingText(projectState.primaryOpenLoop, 220)}` : '',
    projectState.nextClosureTarget ? `next=${sanitizeMirrorProviderFacingText(projectState.nextClosureTarget, 220)}` : '',
    projectState.sameHerSelfLine ? `project_anchor=${sanitizeProjectStateContinuityAnchor(projectState.sameHerSelfLine, 220)}` : '',
    preDialogueAwarenessLine ? `awareness_summary=${preDialogueAwarenessLine}` : '',
  ].filter(Boolean).join(' | ')
}

function summarizeContinuityProjectForMirror(input: {
  continuitySignals: AlicizationAgentSessionSnapshot['continuitySignals']
  runtimeSurface: AlicizationMainChatRuntimeSurface | AlicizationDigitalLifeRuntimeSurface | null | undefined
}) {
  const preparedSummary = summarizeContinuityProjectFromPreparedRuntimeSurface(input.runtimeSurface)
  const signalSummary = summarizeContinuityProjectFromSignals(input.continuitySignals)
  if (readPreparedRuntimeProjectState(input.runtimeSurface) && !looksLikeThinContinuityProjectPreflightSummary(preparedSummary))
    return preparedSummary

  return signalSummary || preparedSummary
}

function cloneMirror(mirror: AlicizationDialogueSessionMirror): AlicizationDialogueSessionMirror {
  return {
    ...mirror,
    continuityLabels: [...mirror.continuityLabels],
    recollection: mirror.recollection ? { ...mirror.recollection } : null,
    sessionPhases: [...mirror.sessionPhases],
  }
}

function resolvePreferredPreparedRuntimeSurface(surface: AlicizationMainChatRuntimeSurface) {
  return resolvePreferredRuntimeSurface({
    spineRuntimeSurface: surface.digitalLifeSpine?.runtimeSurface ?? null,
    preparedRuntimeSurface: surface.digitalLifeRuntimeSurface ?? null,
    extraEvidenceScore: runtimeSurface => (
      (sanitizeText(runtimeSurface?.dialogue?.dialogueEncounter?.subject, 48) ? 1 : 0)
      + (sanitizeText(runtimeSurface?.dialogue?.answerPlanner?.answerIntent, 96) ? 1 : 0)
      + (sanitizeText(runtimeSurface?.dialogue?.replyDeliberation?.speakingFrom, 48) ? 1 : 0)
    ),
  })
}

function hasUsableDigitalLifeRuntimeSurface(
  runtimeSurface: AlicizationDigitalLifeSpineSnapshot['runtimeSurface'] | null | undefined,
) {
  return Boolean(
    runtimeSurface?.perception
    && runtimeSurface?.world
    && runtimeSurface?.cognition
    && runtimeSurface?.memory
    && runtimeSurface?.dialogue
    && runtimeSurface?.agency,
  )
}

function resolveUsablePreferredPreparedRuntimeSurface(
  surface: AlicizationMainChatRuntimeSurface | null | undefined,
) {
  if (!surface)
    return null

  const preferredRuntimeSurface = resolvePreferredPreparedRuntimeSurface(surface)
  if (hasUsableDigitalLifeRuntimeSurface(preferredRuntimeSurface))
    return preferredRuntimeSurface

  const preparedRuntimeSurface = surface.digitalLifeRuntimeSurface ?? null
  if (hasUsableDigitalLifeRuntimeSurface(preparedRuntimeSurface))
    return preparedRuntimeSurface

  const spineRuntimeSurface = surface.digitalLifeSpine?.runtimeSurface ?? null
  return hasUsableDigitalLifeRuntimeSurface(spineRuntimeSurface)
    ? spineRuntimeSurface
    : null
}

function resolveUsableRuntimeSurfaceFromSpine(
  spine: AlicizationDigitalLifeSpineSnapshot | null | undefined,
) {
  return hasUsableDigitalLifeRuntimeSurface(spine?.runtimeSurface ?? null)
    ? spine?.runtimeSurface ?? null
    : null
}

function sanitizeMirrorDigitalLifeSpine(
  spine: AlicizationDigitalLifeSpineSnapshot | null | undefined,
) {
  if (!spine?.runtimeSurface || hasUsableDigitalLifeRuntimeSurface(spine.runtimeSurface))
    return spine ?? null

  // Concurrent writes can leave a digest-like spine carrying a placeholder runtimeSurface object.
  // Drop the unusable structured surface so mirror summarizers take the digest-only path safely.
  const { runtimeSurface: _ignoredRuntimeSurface, ...digestLikeSpine } = spine as AlicizationDigitalLifeSpineSnapshot & {
    runtimeSurface?: AlicizationDigitalLifeSpineSnapshot['runtimeSurface'] | null
  }

  return digestLikeSpine as AlicizationDigitalLifeSpineSnapshot
}

function summarizeTooling(input: {
  agentSession: AlicizationAgentSessionSnapshot
  surface: AlicizationMainChatRuntimeSurface
}) {
  const recentTaskLabels = takeTailUnique(
    input.agentSession.tasks.map(task => task.label),
    3,
    64,
  )
  return [
    `allow=${input.surface.tooling.allowTools ? 'true' : 'false'}`,
    `wait=${input.surface.tooling.waitForTools ? 'true' : 'false'}`,
    `routing=${input.surface.tooling.routingRequired ? 'required' : 'optional'}`,
    `enforced=${input.surface.tooling.enforcedToolNames.join(',') || 'none'}`,
    `recent_actions=${recentTaskLabels.join(',') || 'none'}`,
  ].join(' ')
}

function summarizeCapture(surface: AlicizationMainChatRuntimeSurface) {
  return [
    `grounded=${surface.capture.groundedThisTurn ? 'true' : 'false'}`,
    `inspection=${surface.capture.inspectionRequested ? 'true' : 'false'}`,
    `health=${surface.capture.health ?? 'unknown'}`,
    `permission=${surface.capture.permission ?? 'unknown'}`,
    surface.capture.fallbackReason
      ? `fallback=${sanitizeText(surface.capture.fallbackReason, 120)}`
      : 'fallback=none',
  ].join(' ')
}

function summarizeDialogue(surface: AlicizationMainChatRuntimeSurface) {
  const runtimeSurface = resolveUsablePreferredPreparedRuntimeSurface(surface)
  if (!runtimeSurface)
    return ''

  return [
    surface.trace.turnMode ? `turn=${surface.trace.turnMode}` : '',
    `persona=${surface.trace.personaKernelMode}`,
    runtimeSurface.dialogue.dialogueEncounter?.subject
      ? `subject=${sanitizeText(runtimeSurface.dialogue.dialogueEncounter.subject, 48)}`
      : '',
    runtimeSurface.dialogue.answerPlanner?.answerIntent
      ? `answer=${sanitizeText(runtimeSurface.dialogue.answerPlanner.answerIntent, 64)}`
      : '',
    runtimeSurface.dialogue.replyDeliberation?.speakingFrom
      ? `voice=${sanitizeText(runtimeSurface.dialogue.replyDeliberation.speakingFrom, 48)}`
      : '',
  ].filter(Boolean).join(' | ')
}

function preferMoreRecentDigitalLifeSpine(input: {
  preparedRuntimeSurface: ReturnType<typeof resolvePreferredPreparedRuntimeSurface>
  runtimeSurfaceSpine: AlicizationDigitalLifeSpineSnapshot | null | undefined
}) {
  const preparedSpine = input.preparedRuntimeSurface
    ? deriveAlicizationDigitalLifeSpineFromSurface(input.preparedRuntimeSurface)
    : null
  const rawRuntimeSurfaceSpine = input.runtimeSurfaceSpine ?? null
  const runtimeSurfaceSpine = sanitizeMirrorDigitalLifeSpine(rawRuntimeSurfaceSpine)
  if (!preparedSpine)
    return runtimeSurfaceSpine
  if (!runtimeSurfaceSpine)
    return preparedSpine
  if (rawRuntimeSurfaceSpine?.runtimeSurface && !hasUsableDigitalLifeRuntimeSurface(rawRuntimeSurfaceSpine.runtimeSurface))
    return preparedSpine

  const preparedUpdatedAt = Number(
    preparedSpine.runtime?.updatedAt
    ?? preparedSpine.runtimeSurface?.perception?.updatedAt
    ?? 0,
  )
  const runtimeSurfaceUpdatedAt = Number(
    runtimeSurfaceSpine.runtime?.updatedAt
    ?? runtimeSurfaceSpine.runtimeSurface?.perception?.updatedAt
    ?? 0,
  )
  return runtimeSurfaceUpdatedAt >= preparedUpdatedAt
    ? runtimeSurfaceSpine
    : preparedSpine
}

function resolveDigitalLifeSpineUpdatedAt(
  spine: AlicizationDigitalLifeSpineSnapshot | null | undefined,
) {
  return Number(
    spine?.runtime?.updatedAt
    ?? spine?.runtimeSurface?.perception?.updatedAt
    ?? 0,
  )
}

function summarizeDialogueFromSpine(input: {
  decisionTraceId?: string | null
  personaKernelMode?: string | null
  source?: string
  spine: AlicizationDigitalLifeSpineSnapshot | null | undefined
  turnMode?: string | null
}) {
  const runtimeSurface = resolveUsableRuntimeSurfaceFromSpine(input.spine)
  if (!runtimeSurface && !input.source)
    return ''

  return [
    input.source ? `source=${sanitizeText(input.source, 48)}` : '',
    input.turnMode ? `turn=${sanitizeText(input.turnMode, 48)}` : '',
    input.personaKernelMode ? `persona=${sanitizeText(input.personaKernelMode, 48)}` : '',
    input.decisionTraceId ? `trace=${sanitizeText(input.decisionTraceId, 120)}` : '',
    runtimeSurface?.dialogue.dialogueEncounter?.subject
      ? `subject=${sanitizeText(runtimeSurface.dialogue.dialogueEncounter.subject, 48)}`
      : '',
    runtimeSurface?.dialogue.answerPlanner?.answerIntent
      ? `answer=${sanitizeText(runtimeSurface.dialogue.answerPlanner.answerIntent, 64)}`
      : '',
    runtimeSurface?.dialogue.replyDeliberation?.speakingFrom
      ? `voice=${sanitizeText(runtimeSurface.dialogue.replyDeliberation.speakingFrom, 48)}`
      : '',
  ].filter(Boolean).join(' | ')
}

function summarizeToolingFromAgentSession(input: {
  agentSession: AlicizationAgentSessionSnapshot
  source: string
}) {
  const recentTaskLabels = takeTailUnique(
    input.agentSession.tasks.map(task => task.label),
    3,
    64,
  )
  return [
    `source=${sanitizeText(input.source, 48) || 'unknown'}`,
    `recent_actions=${recentTaskLabels.join(',') || 'none'}`,
  ].join(' ')
}

function hasExecutionCallbackAfterglow(agentSession: AlicizationAgentSessionSnapshot) {
  return agentSession.continuitySignals.some((signal) => {
    const label = sanitizeText(signal.label, 120).toLowerCase()
    const summary = sanitizeText(signal.summary ?? '', 220).toLowerCase()
    const metadata = asRecord(signal.metadata)
    const continuityKind = sanitizeText(metadata?.continuityKind, 80).toLowerCase()
    const carryMode = sanitizeText(metadata?.executionCallbackCarryMode, 80).toLowerCase()
    const source = sanitizeText(metadata?.source, 80).toLowerCase()
    return label.includes('execution-callback')
      || summary.includes('continuity=execution-callback')
      || continuityKind === 'execution-callback'
      || Boolean(carryMode)
      || source === 'autobiographical-afterglow'
  })
}

function shouldPreserveExecutionCallbackMirrorSource(input: {
  previousMirror?: AlicizationDialogueSessionMirror | null
  agentSession: AlicizationAgentSessionSnapshot
  source: string
}) {
  const previousTooling = sanitizeText(input.previousMirror?.toolingSummary ?? '', 220).toLowerCase()
  const previousExecution = sanitizeText(input.previousMirror?.executionSummary ?? '', 220).toLowerCase()
  const previousAgency = sanitizeText(input.previousMirror?.agencySummary ?? '', 220).toLowerCase()
  const incomingSource = sanitizeText(input.source, 48).toLowerCase()
  return hasExecutionCallbackAfterglow(input.agentSession)
    || (
      previousTooling.includes('source=execution-callback')
      && (
        previousExecution.includes('callback:')
        || previousAgency.includes('afterglow=execution-callback')
      )
      && incomingSource !== 'execution-callback'
    )
}

function summarizeCaptureFromAgentSession(snapshot: AlicizationSensoryCacheSnapshot | null) {
  return [
    'grounded=unknown',
    'inspection=unknown',
    `health=${snapshot?.capture?.health ?? 'unknown'}`,
    `permission=${snapshot?.capture?.permission ?? 'unknown'}`,
    'fallback=none',
  ].join(' ')
}

function summarizePerceptionFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const digest = projectAlicizationDigitalLifeSpineDigest(spine)
  const runtimeSurface = resolveUsableRuntimeSurfaceFromSpine(spine)
  const attention = runtimeSurface?.perception?.attention ?? null
  const attentionTarget = sanitizeText(
    attention?.target?.title
    ?? attention?.target?.appName
    ?? attention?.target?.processName
    ?? '',
    120,
  )

  return [
    digest?.runtime.watchMode ? `watch=${digest.runtime.watchMode}` : '',
    digest?.runtime.sceneSummary ? `scene=${digest.runtime.sceneSummary}` : '',
    attentionTarget ? `attention=${attentionTarget}` : '',
    attention?.source ? `source=${sanitizeText(attention.source, 48)}` : '',
  ].filter(Boolean).join(' | ')
}

function pickFocusBeliefFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const runtimeSurface = resolveUsableRuntimeSurfaceFromSpine(spine)
  const beliefs = Array.isArray(runtimeSurface?.cognition?.beliefLedger?.beliefs)
    ? runtimeSurface.cognition.beliefLedger.beliefs
    : []
  const focusBeliefId = sanitizeText(runtimeSurface?.cognition?.beliefLedger?.focusBeliefId ?? '', 160)
  return beliefs.find(belief => sanitizeText((belief as { id?: unknown }).id ?? '', 160) === focusBeliefId)
    ?? beliefs[0]
    ?? null
}

function pickActiveHypothesisFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const runtimeSurface = resolveUsableRuntimeSurfaceFromSpine(spine)
  const hypotheses = Array.isArray(runtimeSurface?.cognition?.hypothesisGraph?.hypotheses)
    ? runtimeSurface.cognition.hypothesisGraph.hypotheses
    : []
  const activeHypothesisId = sanitizeText(runtimeSurface?.cognition?.hypothesisGraph?.activeHypothesisId ?? '', 160)
  return hypotheses.find(hypothesis => sanitizeText((hypothesis as { id?: unknown }).id ?? '', 160) === activeHypothesisId)
    ?? hypotheses[0]
    ?? null
}

function summarizeMindFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const digest = projectAlicizationDigitalLifeSpineDigest(spine)
  const runtime = digest?.runtime
  const focusBelief = pickFocusBeliefFromSpine(spine) as {
    label?: unknown
    statement?: unknown
    summary?: unknown
  } | null
  const activeHypothesis = pickActiveHypothesisFromSpine(spine) as {
    kind?: unknown
    question?: unknown
    statement?: unknown
    summary?: unknown
  } | null
  const runtimeSurface = resolveUsableRuntimeSurfaceFromSpine(spine)
  const privateThought = runtimeSurface?.cognition?.privateThought ?? null

  const focusBeliefSummary = sanitizeText(
    focusBelief?.statement ?? focusBelief?.summary ?? focusBelief?.label ?? '',
    96,
  )
  const activeHypothesisSummary = sanitizeText(
    activeHypothesis?.summary
    ?? activeHypothesis?.question
    ?? activeHypothesis?.statement
    ?? activeHypothesis?.kind
    ?? '',
    96,
  )

  return [
    runtime?.dominantMode ? `mode=${runtime.dominantMode}` : '',
    runtime?.dominantDrive ? `drive=${runtime.dominantDrive}` : '',
    privateThought?.mindNeed ? `need=${sanitizeText(privateThought.mindNeed, 48)}` : '',
    focusBeliefSummary ? `belief=${focusBeliefSummary}` : '',
    activeHypothesisSummary ? `hypothesis=${activeHypothesisSummary}` : '',
  ].filter(Boolean).join(' | ')
}

function summarizeAgencyFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const digest = projectAlicizationDigitalLifeSpineDigest(spine)
  const proactive = digest?.proactive
  if (!digest || !proactive)
    return ''

  const quietSameHerWait = proactive.preferredStyle === 'silent-observe'
    && proactive.shouldSpeak === false
    && proactive.selectedAction === 'wait'

  return [
    quietSameHerWait ? 'action=wait' : proactive.selectedAction ? `action=${proactive.selectedAction}` : '',
    typeof proactive.shouldSpeak === 'boolean'
      ? `speak=${proactive.shouldSpeak ? 'true' : 'false'}`
      : '',
    quietSameHerWait ? 'style=silent-observe' : proactive.preferredStyle ? `style=${proactive.preferredStyle}` : '',
    digest.runtime.activeThreadTitle ? `thread=${digest.runtime.activeThreadTitle}` : '',
    proactive.leadingGoalSummary ? `goal=${proactive.leadingGoalSummary}` : '',
  ].filter(Boolean).join(' | ')
}

function summarizeExecutionAfterglowFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const digest = projectAlicizationDigitalLifeSpineDigest(spine)
  const proactive = digest?.proactive
  const continuity = digest?.continuitySignal
  if (!digest || !proactive)
    return ''

  const preferredStyle = sanitizeText(proactive.preferredStyle ?? '', 48)
  const preferredPresence = sanitizeText(
    proactive.preferredPresence
    ?? digest.runtime.preferredPresence
    ?? continuity?.preferredPresence
    ?? '',
    48,
  )
  const continuitySummary = sanitizeText(continuity?.summary ?? '', 220).toLowerCase()

  const lowerPressureCarry = preferredStyle === 'silent-observe'
    && preferredPresence === 'hesitant'
  const trustWarmingCarry = preferredPresence === 'attentive'
    && (preferredStyle === 'light-nudge'
      || /trust|warming|close-carry|soft-handoff|接得住|有用/.test(continuitySummary))

  if (!lowerPressureCarry && !trustWarmingCarry)
    return ''

  return [
    'afterglow=execution-callback',
    lowerPressureCarry ? 'carry=lower-pressure' : '',
    trustWarmingCarry ? 'carry=trust-warming' : '',
    preferredStyle ? `style=${preferredStyle}` : '',
    preferredPresence ? `presence=${preferredPresence}` : '',
  ].filter(Boolean).join(' | ')
}

function summarizeExecutionAfterglowFromContinuitySignals(
  continuitySignals: AlicizationAgentSessionSnapshot['continuitySignals'],
) {
  const executionCallbackSignals = continuitySignals.filter((signal) => {
    if (signal.kind === 'execution-callback')
      return true

    const label = sanitizeText(signal.label, 120).toLowerCase()
    const summary = sanitizeText(signal.summary ?? '', 220).toLowerCase()
    const metadata = asRecord(signal.metadata)
    const continuityKind = sanitizeText(metadata?.continuityKind, 80).toLowerCase()
    const carryMode = sanitizeText(metadata?.executionCallbackCarryMode, 80).toLowerCase()

    return label.includes('execution-callback')
      || summary.includes('continuity=execution-callback')
      || continuityKind === 'execution-callback'
      || Boolean(carryMode)
  })
  if (executionCallbackSignals.length === 0)
    return ''

  const latestSignal = executionCallbackSignals.at(-1) ?? null
  const metadata = asRecord(latestSignal?.metadata)
  const rawSummary = sanitizeText(latestSignal?.summary ?? '', 220)
  const combinedSummary = [
    sanitizeText(metadata?.summary, 220),
    rawSummary,
  ].filter(Boolean).join(' | ').toLowerCase()

  const carry = (() => {
    const code = sanitizeText(metadata?.carry, 48).toLowerCase()
    if (code === 'repair-before-closeness' || code === 'lower-pressure' || code === 'trust-warming')
      return code

    if (/repair-before-closeness|repair first|let repair settle|callback repair|修复先/u.test(combinedSummary))
      return 'repair-before-closeness'
    if (/lower-pressure|gentler|ease off|step back|留白|放轻/.test(combinedSummary))
      return 'lower-pressure'
    if (/trust-warming|trust|warming|close-carry|soft-handoff|接得住|有用/.test(combinedSummary))
      return 'trust-warming'
    return ''
  })()
  const preferredStyle = sanitizeText(metadata?.style, 48)
  const preferredPresence = sanitizeText(metadata?.presence, 48)

  return [
    'afterglow=execution-callback',
    carry ? `carry=${carry}` : '',
    preferredStyle ? `style=${preferredStyle}` : '',
    preferredPresence ? `presence=${preferredPresence}` : '',
  ].filter(Boolean).join(' | ')
}

function deriveExecutionLikeSameHerHoldDetail(input: {
  executionLike?: boolean
  projectStateSameHerHoldDetail?: string | null
  projectStateSameHerSelfLine?: string | null
  projectStateEmotionalClosureCue?: string | null
  projectStateEmotionalClosureSummary?: string | null
  projectNextClosureTarget?: string | null
  summary?: string | null
  whyNow?: string | null
}) {
  const explicitHoldDetail = sanitizeText(input.projectStateSameHerHoldDetail ?? '', 360)
  if (explicitHoldDetail)
    return explicitHoldDetail

  const combined = [
    sanitizeText(input.summary ?? '', 220),
    sanitizeText(input.whyNow ?? '', 220),
    sanitizeText(input.projectStateSameHerSelfLine ?? '', 220),
    sanitizeText(input.projectStateEmotionalClosureCue ?? '', 220),
    sanitizeText(input.projectStateEmotionalClosureSummary ?? '', 220),
    sanitizeText(input.projectNextClosureTarget ?? '', 220),
  ].filter(Boolean).join(' | ').toLowerCase()
  if (!combined)
    return ''

  const sameLineCallbackCue = input.executionLike === true
    || /callback|same line|same thread|same living line|same living thread|remembered seam|relationship seam|同一条线|同一生命线|同一线程/u.test(combined)
  if (!sameLineCallbackCue)
    return ''

  const explicitRepairAuthority = /same-her callback repair seam|repair seam|repair line|repair-before-closeness still holds|repair-before-closeness still owns|keep this (?:callback )?return repair-before-closeness|until repair settles|let repair settle|先修复再靠近|修复线|修补线/u.test(combined)
  const genericRepairMenu = /measured-return\s*\/\s*repair-before-closeness|one measured-return,\s*repair-before-closeness,\s*or rest-protective|measured-return,\s*repair-before-closeness,\s*or rest-protective/u.test(combined)

  if (explicitRepairAuthority && !genericRepairMenu) {
    return 'cadence=repair_before_closeness; timing=before_closeness_widens'
  }

  if (/reopened too eagerly|too eagerly|more room this time|keep more room this time|leave more room|do not reopen it with the same eagerness|不要重开得太快|这次更要留白|这次要更慢一点|上次太急/u.test(combined)) {
    return 'relationship_cadence=remembered_boundary; room=more; reentry=slower; widening=deferred'
  }

  if (/measured-return|lower-pressure|one step more reversible|still settling|leave room|留白|放轻|别立刻把温度放大/u.test(combined)) {
    return 'cadence=lower_pressure_return; pacing=slower; widening=deferred'
  }

  return ''
}

function summarizeContinuityArcFromSignals(
  continuitySignals: AlicizationAgentSessionSnapshot['continuitySignals'],
) {
  const latestProactiveOutcomeSignal = [...continuitySignals]
    .reverse()
    .find((signal) => {
      if (signal.kind !== 'proactive' || signal.state === 'pending')
        return false
      const label = sanitizeText(signal.label, 120).toLowerCase()
      const summary = sanitizeText(signal.summary ?? '', 220).toLowerCase()
      const metadata = asRecord(signal.metadata)
      const source = sanitizeText(metadata?.source, 96).toLowerCase()
      return label.includes('reply-within-120s')
        || source === 'proactive-feedback'
        || summary.includes('host replied within 120s after a proactive turn')
    }) ?? null
  if (latestProactiveOutcomeSignal) {
    const summary = sanitizeText(latestProactiveOutcomeSignal.summary ?? '', 220)
    const metadata = asRecord(latestProactiveOutcomeSignal.metadata)
    const scenario = sanitizeText(metadata?.scenario, 48)
      || (/scenario=([^|]+)/.exec(summary)?.[1]?.trim() ?? '')
    const stage = sanitizeText((/continuity=([^|]+)/.exec(summary)?.[1]?.trim() ?? ''), 80) || 'same-thread-continuation'
    const timing = extractContinuityKeyDetail(summary, 'timing')
    const cadence = extractContinuityKeyDetail(summary, 'cadence')

    return [
      stage ? `stage=${stage}` : '',
      scenario ? `scenario=${scenario}` : '',
      timing,
      cadence,
      'outcome=reply-within-120s',
    ].filter(Boolean).join(' | ')
  }

  const latestExecutionLikeSignal = [...continuitySignals]
    .reverse()
    .find((signal) => {
      const label = sanitizeText(signal.label, 120).toLowerCase()
      const summary = sanitizeText(signal.summary ?? '', 220).toLowerCase()
      const metadata = asRecord(signal.metadata)
      const source = sanitizeText(metadata?.source, 96).toLowerCase()
      const hasHeldAutonomyArcDetail = Boolean(
        sanitizeText(metadata?.sourceThreadId, 96)
        || sanitizeText(metadata?.deferReason, 96)
        || sanitizeText(metadata?.whyNow, 180),
      )
      return label.includes('execution-callback')
        || label.includes('held-autonomy')
        || source === 'proactive-held-autonomy'
        || (source === 'proactive-deferred' && hasHeldAutonomyArcDetail)
        || summary.includes('continuity=execution-callback')
    }) ?? null
  if (latestExecutionLikeSignal) {
    const metadata = asRecord(latestExecutionLikeSignal.metadata)
    const summary = sanitizeText(latestExecutionLikeSignal.summary ?? '', 220)
    const thread = sanitizeText(metadata?.sourceThreadId, 96)
      || (/thread=([^\s|]+)/.exec(summary)?.[1] ?? '')
    const carry = sanitizeText(metadata?.executionCallbackCarryMode, 64)
      || (/carry-mode=([^\s|]+)/.exec(summary)?.[1] ?? '')
    const deferReason = sanitizeText(metadata?.deferReason, 96)
      || (/defer=([^\s|]+)/.exec(summary)?.[1] ?? '')
    const whyNow = sanitizeText(metadata?.whyNow, 180)
    const projectStateSameHerSelfLine = sanitizeProjectStateContinuityAnchor(metadata?.projectStateSameHerSelfLine, 360)
    const projectStateCompanionHeadlineLine = sanitizeMirrorProviderFacingSummary(metadata?.projectStateCompanionHeadlineLine, 360)
    const projectPreflight = sanitizeMirrorProviderFacingSummary(
      resolveAlicizationProjectPreDialogueAwarenessLine({
        runtimeProjectState: {
          preDialogueAwarenessLine: projectStateSameHerSelfLine
            || metadata?.projectStatePreDialogueAwarenessSummary
            || metadata?.projectStatePreDialogueAwarenessLine,
          companionHeadlineLine: projectStateCompanionHeadlineLine || null,
          preflightSummary: metadata?.projectStatePreflightSummary,
        },
      }) ?? '',
      360,
    ) || sanitizeMirrorProviderFacingSummary(metadata?.projectStatePreflightSummary, 360)
    const projectStateEmotionalClosureCue = sanitizeMirrorProviderFacingText(metadata?.projectStateEmotionalClosureCue, 360)
    const projectStateEmotionalClosureSummary = sanitizeMirrorProviderFacingText(metadata?.projectStateEmotionalClosureSummary, 360)
    const projectStateSameHerDriftRisk = sanitizeMirrorProviderFacingText(metadata?.projectStateSameHerDriftRisk, 360)
      || sanitizeMirrorProviderFacingText(metadata?.projectStateSameHerDriftRiskSummary, 360)
    const projectNextClosureTarget = sanitizeMirrorProviderFacingText(metadata?.projectNextClosureTarget, 420)
      || sanitizeMirrorProviderFacingText(metadata?.projectStateNextClosureTargetSummary, 420)
    const projectStateSameHerHoldDetail = deriveExecutionLikeSameHerHoldDetail({
      executionLike: true,
      projectStateSameHerHoldDetail: sanitizeMirrorProviderFacingText(metadata?.projectStateSameHerHoldDetail, 360),
      projectStateSameHerSelfLine,
      projectStateEmotionalClosureCue,
      projectStateEmotionalClosureSummary,
      projectNextClosureTarget,
      summary,
      whyNow,
    })
    const repairLine = /repair-before-closeness|repair first|修复先/u.test(summary)
      ? 'repair-before-closeness'
      : ''
    const preferredBlinkCadence = sanitizeProjectStatePreferredBlinkCadence(
      metadata?.preferredBlinkCadence,
    ) || (/quieter blink/u.test(summary) ? 'quiet' : '')
    const preferredGazeMode = sanitizeProjectStatePreferredGazeMode(
      metadata?.preferredGazeMode,
    ) || (/softened gaze/u.test(summary) ? 'soften' : '')
    const preferredVoiceMode = sanitizeProjectStatePreferredVoiceMode(
      metadata?.projectStatePreferredVoiceMode,
    ) || sanitizeProjectStatePreferredVoiceMode((/voice=([^|\s]+)/.exec(summary)?.[1] ?? ''))
    const preferredPacingMode = sanitizeProjectStatePreferredPacingMode(
      metadata?.projectStatePreferredPacingMode,
    ) || sanitizeProjectStatePreferredPacingMode((/pacing=([^|\s]+)/.exec(summary)?.[1] ?? ''))
    const preferredPauseMode = sanitizeProjectStatePreferredPauseMode(
      metadata?.projectStatePreferredPauseMode,
    ) || sanitizeProjectStatePreferredPauseMode((/pause=([^|\s]+)/.exec(summary)?.[1] ?? ''))
    const preferredLipsyncMode = sanitizeProjectStatePreferredLipsyncMode(
      metadata?.projectStatePreferredLipsyncMode,
    ) || sanitizeProjectStatePreferredLipsyncMode((/lipsync=([^|\s]+)/.exec(summary)?.[1] ?? ''))
    const timing = sanitizeText(
      metadata?.continuityPreferredTiming
      ?? (/timing=([^|]+)/.exec(summary)?.[1]?.trim() ?? ''),
      80,
    )
    const cadence = sanitizeText(
      metadata?.continuityCadence
      ?? (/cadence=([^|]+)/.exec(summary)?.[1]?.trim() ?? ''),
      80,
    )
    const continuityArcStage = sanitizeText(metadata?.continuityArcStage, 48)
    const continuityRestraint = sanitizeText(metadata?.continuityRestraint, 64)
    const continuityCue = sanitizeMirrorProviderFacingText(metadata?.continuityCue, 360)

    return [
      continuityArcStage ? `stage=${continuityArcStage}` : '',
      'loop=execution-callback',
      thread ? `thread=${thread}` : '',
      carry ? `carry=${carry}` : '',
      repairLine ? `repair=${repairLine}` : '',
      continuityRestraint ? `restraint=${continuityRestraint}` : '',
      continuityCue ? `cue=${continuityCue}` : '',
      timing ? `timing=${timing}` : '',
      cadence ? `cadence=${cadence}` : '',
      preferredBlinkCadence ? `blink=${preferredBlinkCadence}` : '',
      preferredGazeMode ? `gaze=${preferredGazeMode}` : '',
      preferredPauseMode ? `pause=${preferredPauseMode}` : '',
      preferredLipsyncMode ? `lipsync=${preferredLipsyncMode}` : '',
      preferredVoiceMode ? `voice=${preferredVoiceMode}` : '',
      preferredPacingMode ? `pacing=${preferredPacingMode}` : '',
      deferReason ? `defer=${deferReason}` : '',
      whyNow ? `why_now=${whyNow}` : '',
      projectPreflight ? `preflight_summary=${projectPreflight}` : '',
      projectStateSameHerHoldDetail ? `hold=${projectStateSameHerHoldDetail}` : '',
      projectNextClosureTarget ? `next=${projectNextClosureTarget}` : '',
      projectStateSameHerSelfLine ? `project_anchor=${projectStateSameHerSelfLine}` : '',
      projectStateSameHerDriftRisk ? `template_residue_risk=${projectStateSameHerDriftRisk}` : '',
    ].filter(Boolean).join(' | ')
  }

  const latestDialogueCarrySignal = [...continuitySignals]
    .reverse()
    .find((signal) => {
      if (signal.kind !== 'dialogue')
        return false
      const summary = sanitizeText(signal.summary ?? '', 220).toLowerCase()
      const metadata = asRecord(signal.metadata)
      const source = sanitizeText(metadata?.source, 96).toLowerCase()
      const carryReason = sanitizeText(metadata?.carryReason, 120).toLowerCase()
      const activeThread = sanitizeText(metadata?.activeThread, 120).toLowerCase()
      const openLoop = sanitizeText(metadata?.openLoop, 180).toLowerCase()
      const memoryMode = sanitizeText(metadata?.memoryMode, 64).toLowerCase()
      const carryEligible = metadata?.carryEligible === true

      if (source !== 'dialogue-world-thread')
        return false

      return carryEligible
        || carryReason.includes('shared-attention-continuation')
        || /same line|same thread|continuation|continue|shared-attention/u.test(`${summary} ${activeThread} ${openLoop}`)
        || memoryMode === 'dialogue-carry'
    }) ?? null
  if (!latestDialogueCarrySignal)
    return ''

  const metadata = asRecord(latestDialogueCarrySignal.metadata)
  const summary = sanitizeText(latestDialogueCarrySignal.summary ?? '', 220)
  const thread = sanitizeText(metadata?.activeThread, 120)
    || (/thread=([^|]+)/.exec(summary)?.[1]?.trim() ?? '')
  const carry = sanitizeText(metadata?.carryReason, 120)
    || (/carry=([^|]+)/.exec(summary)?.[1]?.trim() ?? '')
  const openLoop = sanitizeText(metadata?.openLoop, 180)
    || (/open_loop=([^|]+)/.exec(summary)?.[1]?.trim() ?? '')
  const anchor = sanitizeText(metadata?.primaryAnchor, 140)
    || (/anchor=([^|]+)/.exec(summary)?.[1]?.trim() ?? '')
  const timing = extractContinuityKeyDetail(summary, 'timing')
  const cadence = extractContinuityKeyDetail(summary, 'cadence')
  const project = extractContinuityKeyDetail(summary, 'project')
  const unresolved = extractContinuityKeyDetail(summary, 'unresolved')
  const stageSource = [carry, openLoop, anchor, summary].join(' ').toLowerCase()
  const stage = /same line|same thread|continuation|continue|继续|沿着刚才那条线|shared-attention-continuation/u.test(stageSource)
    ? 'same-thread-continuation'
    : /reopen|re-enter|接回来|轻轻接/u.test(stageSource)
      ? 'gentle-reopen'
      : /hold|later|wait|先别|留 room/u.test(stageSource)
        ? 'hold-for-opening'
        : ''

  return [
    stage ? `stage=${stage}` : '',
    thread ? `thread=${thread}` : '',
    carry ? `carry=${carry}` : '',
    anchor ? `anchor=${anchor}` : '',
    timing,
    cadence,
    project,
    unresolved,
  ].filter(Boolean).join(' | ')
}

function summarizeMemoryFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const digest = projectAlicizationDigitalLifeSpineDigest(spine)
  const memory = digest?.memory
  if (!digest || !memory)
    return ''

  return [
    memory.summary ? sanitizeText(memory.summary, 220) : '',
    !memory.summary && memory.recentEpisodeSummary ? `recent=${sanitizeText(memory.recentEpisodeSummary, 96)}` : '',
    !memory.summary && memory.leadingGoalSummary ? `goal=${sanitizeText(memory.leadingGoalSummary, 96)}` : '',
    !memory.summary && memory.dominantConcernSummary ? `concern=${sanitizeText(memory.dominantConcernSummary, 96)}` : '',
    !memory.summary && memory.recallMode ? `recall=${sanitizeText(memory.recallMode, 48)}` : '',
  ].filter(Boolean).join(' | ')
}

function summarizeRuntimeChannelFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const runtimeSurface = resolveUsableRuntimeSurfaceFromSpine(spine)
  if (spine && !runtimeSurface) {
    return [
      spine.runtime?.dominantMode ? `dominant=${sanitizeText(spine.runtime.dominantMode, 48)}` : '',
      spine.runtime?.selectedAction ? `phase=${sanitizeText(spine.runtime.selectedAction, 48)}` : '',
    ].filter(Boolean).join(' | ')
  }

  const runtime = deriveAlicizationRuntimeSnapshot({
    spine,
  })
  if (!runtime)
    return ''

  return [
    `dominant=${sanitizeText(runtime.dominantChannel, 48)}`,
    runtime.activeLoop?.phase ? `phase=${sanitizeText(runtime.activeLoop.phase, 48)}` : '',
    runtime.activeLoop?.handoffTarget ? `handoff=${sanitizeText(runtime.activeLoop.handoffTarget, 48)}` : '',
  ].filter(Boolean).join(' | ')
}

function summarizeRuntimeTransitionFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const runtimeSurface = resolveUsableRuntimeSurfaceFromSpine(spine)
  if (!runtimeSurface)
    return ''

  const recentTransition = runtimeSurface.perception.recentTransition ?? null
  if (!recentTransition)
    return ''

  return [
    recentTransition.fromWatchMode ? `from=${sanitizeText(recentTransition.fromWatchMode, 48)}` : '',
    recentTransition.toWatchMode ? `to=${sanitizeText(recentTransition.toWatchMode, 48)}` : '',
    recentTransition.fromScenario ? `scenario=${sanitizeText(recentTransition.fromScenario, 48)}` : '',
    recentTransition.reason ? `reason=${sanitizeText(recentTransition.reason, 160)}` : '',
  ].filter(Boolean).join(' | ')
}

function summarizeContinuityArcFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const runtimeSurface = resolveUsableRuntimeSurfaceFromSpine(spine)
  if (spine && !runtimeSurface) {
    const continuitySummary = sanitizeText(spine.continuitySignal?.summary ?? '', 220)
    const timing = sanitizeText(
      spine.runtime?.continuityPreferredTiming
      ?? (/timing=([^|]+)/.exec(continuitySummary)?.[1]?.trim() ?? '')
      ?? '',
      80,
    )
    const cadence = extractContinuityKeyDetail(continuitySummary, 'cadence')
    const stageSource = [
      continuitySummary,
      sanitizeText(spine.proactive?.dominantConcernKind, 80),
      sanitizeText(spine.proactive?.dominantConcernSummary, 180),
    ].join(' ').toLowerCase()
    const stage = /same line|same thread|same-thread|continuation|continue|继续|沿着刚才那条线/u.test(stageSource)
      ? 'same-thread-continuation'
      : /reopen|re-enter|接回来|轻轻接/u.test(stageSource)
        ? 'gentle-reopen'
        : /hold|hover|later|wait|先别|留 room/u.test(stageSource)
          ? 'hold-for-opening'
          : ''
    const thread = sanitizeText(
      spine.proactive?.activeThreadId
      ?? spine.runtime?.activeThreadId
      ?? readContinuitySignalField(spine.continuitySignal, 'activeThreadId')
      ?? (/thread=([^|]+)/.exec(continuitySummary)?.[1]?.trim() ?? '')
      ?? '',
      120,
    )
    const handoff = sanitizeText(spine.runtime?.selectedAction ?? spine.proactive?.selectedAction ?? '', 48)

    return [
      stage ? `stage=${stage}` : '',
      handoff ? `loop=${handoff}` : '',
      thread ? `thread=${thread}` : '',
      timing ? `timing=${timing}` : '',
      cadence,
    ].filter(Boolean).join(' | ')
  }

  const runtime = deriveAlicizationRuntimeSnapshot({
    spine,
  })
  if (!runtime)
    return ''

  return [
    runtime.projectState?.continuityArcStage
      ? `stage=${sanitizeText(runtime.projectState.continuityArcStage, 48)}`
      : '',
    runtime.activeLoop?.phase
      ? `loop=${sanitizeText(runtime.activeLoop.phase, 48)}`
      : '',
    runtime.activeLoop?.handoffTarget
      ? `handoff=${sanitizeText(runtime.activeLoop.handoffTarget, 48)}`
      : '',
  ].filter(Boolean).join(' | ')
}

function mergeContinuityArcSummaries(...summaries: Array<string | null | undefined>) {
  const merged = new Map<string, string>()
  const extras: string[] = []
  const priorityKeys = [
    'stage',
    'loop',
    'handoff',
    'thread',
    'carry',
    'defer',
    'hold',
    'repair',
    'anchor',
    'blink',
    'gaze',
    'pause',
    'lipsync',
    'why_now',
    'project_preflight',
    'same_her',
    'landed',
    'open',
    'open-focus',
    'next-focus',
    'next',
    'drift_risk',
    'timing',
    'cadence',
    'voice',
    'pacing',
    'answer',
    'need',
    'intention',
  ]

  for (const summary of summaries) {
    const normalized = sanitizeText(summary ?? '', continuityArcSummaryMaxChars)
    if (!normalized)
      continue

    for (const rawPart of normalized.split('|')) {
      const part = sanitizeText(rawPart.trim(), continuityArcSummaryMaxChars)
      if (!part)
        continue

      const separatorIndex = part.indexOf('=')
      if (separatorIndex <= 0) {
        if (!extras.includes(part))
          extras.push(part)
        continue
      }

      const key = sanitizeText(part.slice(0, separatorIndex).trim(), 64)
      const value = sanitizeText(part.slice(separatorIndex + 1).trim(), continuityArcSummaryValueMaxChars)
      if (!key || !value)
        continue

      const previous = merged.get(key)
      if (!previous || value.length > previous.length)
        merged.set(key, value)
    }
  }

  return [
    ...priorityKeys
      .filter(key => merged.has(key))
      .map(key => `${key}=${merged.get(key) ?? ''}`),
    ...Array.from(merged.entries())
      .filter(([key]) => !priorityKeys.includes(key))
      .map(([key, value]) => `${key}=${value}`),
    ...extras,
  ].join(' | ')
}

function compactContinuityArcSummary(summary: string | null | undefined) {
  const merged = new Map<string, string>()
  const extras: string[] = []
  const priorityKeys = [
    'stage',
    'loop',
    'handoff',
    'thread',
    'carry',
    'defer',
    'hold',
    'repair',
    'anchor',
    'blink',
    'gaze',
    'pause',
    'lipsync',
    'why_now',
    'project_preflight',
    'same_her',
    'landed',
    'open',
    'open-focus',
    'next-focus',
    'next',
    'drift_risk',
    'timing',
    'cadence',
    'voice',
    'pacing',
    'answer',
    'need',
    'intention',
  ]
  const normalized = sanitizeText(summary ?? '', 4000)
  if (!normalized)
    return ''

  for (const rawPart of normalized.split('|')) {
    const part = sanitizeText(rawPart.trim(), 1600)
    if (!part)
      continue
    const separatorIndex = part.indexOf('=')
    if (separatorIndex <= 0) {
      if (!extras.includes(part))
        extras.push(part)
      continue
    }
    const key = sanitizeText(part.slice(0, separatorIndex).trim(), 64)
    const valueBudget = key === 'next'
      ? 420
      : key === 'landed' || key === 'open' || key === 'project_preflight' || key === 'drift_risk'
        ? 320
        : key === 'same_her'
          ? 220
          : continuityArcSummaryValueMaxChars
    const value = sanitizeText(part.slice(separatorIndex + 1).trim(), valueBudget)
    if (!key || !value)
      continue
    const previous = merged.get(key)
    if (!previous || value.length > previous.length)
      merged.set(key, value)
  }

  const orderedSegments = [
    ...priorityKeys
      .filter(key => merged.has(key))
      .map(key => `${key}=${merged.get(key) ?? ''}`),
    ...Array.from(merged.entries())
      .filter(([key]) => !priorityKeys.includes(key))
      .map(([key, value]) => `${key}=${value}`),
    ...extras,
  ]

  let result = ''
  const requiredKeys = new Set([
    'stage',
    'loop',
    'handoff',
    'thread',
    'carry',
    'defer',
    'why_now',
    'project_preflight',
    'same_her',
    'landed',
    'open',
    'open-focus',
    'next-focus',
    'next',
    'drift_risk',
    'pause',
    'lipsync',
    'voice',
    'pacing',
  ])
  for (const segment of orderedSegments) {
    const candidate = result ? `${result} | ${segment}` : segment
    if (candidate.length > continuityArcSummaryMaxChars) {
      const separatorIndex = segment.indexOf('=')
      const key = separatorIndex > 0 ? sanitizeText(segment.slice(0, separatorIndex).trim(), 64) : ''
      if (key && requiredKeys.has(key)) {
        const remainingBudget = Math.max(
          0,
          continuityArcSummaryMaxChars
          - (result ? result.length + 3 : 0)
          - key.length
          - 1,
        )
        const rawValue = separatorIndex > 0 ? segment.slice(separatorIndex + 1).trim() : ''
        const truncatedValue = sanitizeText(rawValue, remainingBudget)
        if (truncatedValue) {
          result = result
            ? `${result} | ${key}=${truncatedValue}`
            : `${key}=${truncatedValue}`
        }
        continue
      }
      break
    }
    result = candidate
  }

  return result || sanitizeText(normalized, continuityArcSummaryMaxChars)
}

function deriveSessionMirrorRecollectionState(
  context: OrganicMemoryPromptContext | null | undefined,
): AlicizationDialogueSessionRecollectionState | null {
  const deliberation = context?.memoryDeliberation ?? null
  const intent = context?.recollectionIntent ?? null
  const plan = context?.recollectionPlan ?? null
  const speech = context?.recollectionSpeechPlan ?? null
  const narrative = context?.recollectionNarratives?.[0] ?? null
  if (!deliberation && !intent && !plan && !speech && !narrative)
    return null

  const sanitizedForeground = sanitizeMirrorProviderFacingText(
    deliberation?.inwardLine
    ?? plan?.opening
    ?? narrative?.recallCenter
    ?? narrative?.opening
    ?? '',
    180,
  )
  const foreground = sanitizedForeground && sanitizedForeground !== alicizationFixedTemplateReplacement
    ? sanitizedForeground
    : null
  const certainty = speech?.certainty ?? plan?.certainty ?? narrative?.certainty ?? null
  const confidence = Number.isFinite(deliberation?.confidence)
    ? Number(deliberation!.confidence)
    : Number.isFinite(plan?.confidence)
      ? Number(plan!.confidence)
      : Number.isFinite(speech?.confidence)
        ? Number(speech!.confidence)
        : Number.isFinite(narrative?.confidence)
          ? Number(narrative!.confidence)
          : null
  const rawMode = intent?.mode ?? narrative?.mode ?? null
  const mode = rawMode && rawMode !== 'none' ? rawMode : null
  const surfaceMode = deliberation?.surfacePolicy ?? speech?.surfaceMode ?? null
  const placement = speech?.placement ?? null
  const hasSurfaceDecision = Boolean(deliberation || speech)
  const visibility = hasSurfaceDecision
    ? deliberation?.shouldRecall === false || speech?.shouldSurface !== true
      ? 'inward'
      : 'visible'
    : null
  const normalizedConfidence = Number.isFinite(confidence)
    ? Math.max(0, Math.min(1, Number(confidence)))
    : null
  const afterthoughtState = (
    hasSurfaceDecision
    && deliberation?.shouldRecall !== false
    && (surfaceMode === 'internal-only' || placement === 'internal-only')
    && (normalizedConfidence ?? 0) >= 0.68
  )
    ? 'ripe'
    : 'resting'

  return {
    afterthoughtState,
    certainty,
    confidence: normalizedConfidence,
    foreground,
    mode,
    placement,
    surfaceMode,
    visibility,
  }
}

function summarizeContinuityArcFromPreparedRuntimeSurface(surface: AlicizationMainChatRuntimeSurface | null | undefined) {
  const runtimeSurface = resolveUsablePreferredPreparedRuntimeSurface(surface)
  if (!runtimeSurface?.dialogue)
    return ''

  const currentConsciousFrame = runtimeSurface.dialogue.currentConsciousFrame ?? null
  const replyDeliberation = runtimeSurface.dialogue.replyDeliberation ?? null
  const answerPlanner = runtimeSurface.dialogue.answerPlanner ?? null
  const projectState = currentConsciousFrame?.projectState ?? null

  const inwardNeed = sanitizeText(currentConsciousFrame?.consciousNeed ?? '', 160)
  const speakingIntention = sanitizeText(currentConsciousFrame?.speakingIntention ?? '', 180)
  const answerIntent = sanitizeText(answerPlanner?.answerIntent ?? '', 120)
  const speakingFrom = sanitizeText(replyDeliberation?.speakingFrom ?? '', 64)
  const continuityStage = currentConsciousFrame?.reasonTags?.includes('continuity-arc:hold-for-opening')
    ? 'hold-for-opening'
    : currentConsciousFrame?.reasonTags?.includes('continuity-arc:same-thread-continuation')
      ? 'same-thread-continuation'
      : currentConsciousFrame?.reasonTags?.includes('continuity-arc:gentle-reopen')
        ? 'gentle-reopen'
        : ''
  const projectPreflight = sanitizeMirrorProviderFacingSummary(
    resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: projectState?.preDialogueAwarenessSummary
          ?? projectState?.preDialogueAwarenessLine
          ?? projectState?.awarenessLine,
        companionHeadlineLine: projectState?.companionHeadlineLine,
        sameHerSelfLine: projectState?.sameHerSelfLine,
        preflightSummary: projectState?.preflightSummary,
      },
    }) ?? '',
    260,
  ) || sanitizeMirrorProviderFacingSummary(projectState?.preflightSummary ?? '', 260)
  const projectStateSameHerSelfLine = sanitizeProjectStateContinuityAnchor(projectState?.sameHerSelfLine ?? '', 220)
  const projectStateLandedProgress = sanitizeMirrorProviderFacingText(
    projectState?.latestLandedProgress
    ?? projectState?.latestProgress
    ?? '',
    220,
  )
  const projectStatePrimaryOpenLoop = sanitizeMirrorProviderFacingText(projectState?.primaryOpenLoop ?? '', 180)
  const projectStateOpenFocusSummary = sanitizeText(
    deriveCompactProjectStateOpenFocusSummary(projectState?.primaryOpenLoop ?? ''),
    160,
  )
  const projectStateNextClosureTarget = sanitizeMirrorProviderFacingText(projectState?.nextClosureTarget ?? '', 200)
  const projectStateNextFocusSummary = sanitizeText(
    deriveCompactProjectStateNextFocusSummary(projectState?.nextClosureTarget ?? ''),
    160,
  )
  const projectStateSameHerDriftRisk = sanitizeMirrorProviderFacingText(projectState?.sameHerDriftRisk ?? '', 180)
  const carriesProjectStateClosureArc = Boolean(
    projectStateSameHerSelfLine
    && (
      continuityStage === 'same-thread-continuation'
      || continuityStage === 'hold-for-opening'
      || continuityStage === 'gentle-reopen'
      || /same phase 1 digital life|same living line|one living digital life|one continuous digital life/u.test(projectStateSameHerSelfLine)
    )
    && (
      projectStateLandedProgress
      || projectStatePrimaryOpenLoop
      || projectStateNextClosureTarget
      || projectStateSameHerDriftRisk
      || projectPreflight
    ),
  )

  return [
    continuityStage ? `stage=${continuityStage}` : '',
    carriesProjectStateClosureArc && projectPreflight ? `preflight_summary=${projectPreflight}` : '',
    carriesProjectStateClosureArc && projectStateSameHerSelfLine ? `project_anchor=${projectStateSameHerSelfLine}` : '',
    carriesProjectStateClosureArc && projectStateLandedProgress ? `landed=${projectStateLandedProgress}` : '',
    carriesProjectStateClosureArc && projectStatePrimaryOpenLoop ? `open=${projectStatePrimaryOpenLoop}` : '',
    carriesProjectStateClosureArc && projectStateOpenFocusSummary ? `open-focus=${projectStateOpenFocusSummary}` : '',
    carriesProjectStateClosureArc && projectStateNextFocusSummary ? `next-focus=${projectStateNextFocusSummary}` : '',
    carriesProjectStateClosureArc && projectStateNextClosureTarget ? `next=${projectStateNextClosureTarget}` : '',
    carriesProjectStateClosureArc && projectStateSameHerDriftRisk ? `template_residue_risk=${projectStateSameHerDriftRisk}` : '',
    speakingFrom ? `voice=${speakingFrom}` : '',
    answerIntent ? `answer=${answerIntent}` : '',
    inwardNeed ? `need=${inwardNeed}` : '',
    speakingIntention ? `intention=${speakingIntention}` : '',
  ].filter(Boolean).join(' | ')
}

function summarizeExecutionFromAgentSession(agentSession: AlicizationAgentSessionSnapshot) {
  const executorTasks = agentSession.tasks.filter(task => task.kind === 'executor')
  if (executorTasks.length === 0)
    return ''

  const normalizeExecutionMirrorStatus = (raw: unknown) => {
    const status = sanitizeText(raw, 32) || 'unknown'
    if (status === 'planned' || status === 'needs-affirmation' || status === 'running')
      return 'pending'
    return status
  }

  const latestTask = executorTasks.at(-1) ?? null
  const recentExecutions = takeTailUnique(
    executorTasks.map((task) => {
      const label = sanitizeText(task.label, 72) || 'executor'
      const metadata = asRecord(task.metadata)
      const status = normalizeExecutionMirrorStatus(
        sanitizeText(metadata?.threadStatus, 32) || sanitizeText(task.status, 24) || 'unknown',
      )
      return `${label}:${status}`
    }),
    3,
    96,
  )
  const latestMetadata = asRecord(latestTask?.metadata)
  const latestThreadStatus = sanitizeText(
    latestMetadata?.threadStatus,
    32,
  ) || sanitizeText(latestTask?.status, 24) || 'unknown'
  const latestStatus = normalizeExecutionMirrorStatus(latestThreadStatus)
  const latestGoal = sanitizeMirrorProviderFacingText(latestMetadata?.goal, 160)
  const latestChannel = sanitizeText(
    latestMetadata?.selectedChannel ?? latestMetadata?.proposedChannel,
    48,
  )
  const latestSummary = sanitizeMirrorProviderFacingText(latestTask?.summary ?? '', 160)
  const latestAffirmationReasonCodes = asStringArray(latestMetadata?.affirmationReasonCodes)
  const humanSummary = (() => {
    if (latestThreadStatus === 'running' && latestGoal) {
      return latestChannel
        ? `${latestChannel} is already carrying ${latestGoal}`
        : `execution is already carrying ${latestGoal}`
    }
    if (latestSummary)
      return latestSummary
    if (latestThreadStatus === 'needs-affirmation' && latestGoal) {
      return latestChannel
        ? `execution_confirmation=pending; channel=${latestChannel}; action=${latestGoal}`
        : `execution_confirmation=pending; action=${latestGoal}`
    }
    if (latestThreadStatus === 'planned' && latestGoal) {
      return latestChannel
        ? `planned ${latestChannel} path for ${latestGoal}`
        : `planned execution path for ${latestGoal}`
    }
    return latestSummary
  })()

  return [
    `recent=${recentExecutions.join(',') || 'none'}`,
    latestStatus ? `status=${latestStatus}` : '',
    latestGoal ? `goal=${latestGoal}` : '',
    latestChannel ? `channel=${latestChannel}` : '',
    humanSummary ? `summary=${sanitizeMirrorProviderFacingText(humanSummary, 180)}` : '',
    latestAffirmationReasonCodes.length > 0
      ? `affirmation=${latestAffirmationReasonCodes.join(',')}`
      : '',
  ].filter(Boolean).join(' | ')
}

export function createAlicizationDialogueSessionManager(
  options: CreateAlicizationDialogueSessionManagerOptions = {},
): AlicizationDialogueSessionManager {
  const getNow = options.getNow ?? Date.now
  const maxContinuityLabels = Math.max(1, Math.floor(options.maxContinuityLabels ?? defaultMaxContinuityLabels))
  const maxSessionPhases = Math.max(1, Math.floor(options.maxSessionPhases ?? defaultMaxSessionPhases))
  const staleAfterMs = Math.max(1, Math.floor(options.staleAfterMs ?? defaultSessionMirrorStaleAfterMs))
  const mirrors = new Map<string, AlicizationDialogueSessionMirror>()

  function pruneExpiredMirrors() {
    const now = getNow()
    for (const [key, mirror] of mirrors.entries()) {
      if (now - mirror.updatedAt > staleAfterMs)
        mirrors.delete(key)
    }
  }

  function clear(cardId?: string) {
    if (!cardId) {
      mirrors.clear()
      return
    }

    const normalizedCardId = sanitizeText(cardId, 120)
    if (!normalizedCardId)
      return

    for (const [key, mirror] of mirrors.entries()) {
      if (mirror.cardId === normalizedCardId)
        mirrors.delete(key)
    }
  }

  function getSessionMirror(cardId: string, sessionId: string) {
    pruneExpiredMirrors()
    const normalizedCardId = sanitizeText(cardId, 120)
    const normalizedSessionId = sanitizeText(sessionId, 160)
    if (!normalizedCardId || !normalizedSessionId)
      return null

    const mirror = mirrors.get(buildMirrorKey(normalizedCardId, normalizedSessionId))
    return mirror ? cloneMirror(mirror) : null
  }

  function ingestPreparedExecution(input: {
    agentSession: AlicizationAgentSessionSnapshot
    cardId: string
    digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
    organicMemoryContext?: OrganicMemoryPromptContext | null
    runtimeSurface: AlicizationMainChatRuntimeSurface
    sessionId: string
  }) {
    pruneExpiredMirrors()
    const normalizedCardId = sanitizeText(input.cardId, 120) || 'default'
    const normalizedSessionId = sanitizeText(input.sessionId, 160)
    if (!normalizedSessionId) {
      throw new Error('dialogue session manager requires a non-empty session id')
    }

    const previousMirror = mirrors.get(buildMirrorKey(normalizedCardId, normalizedSessionId))
    const preferredRuntimeSurface = resolveUsablePreferredPreparedRuntimeSurface(input.runtimeSurface)
    const rawPreparedDigitalLifeSpine = input.digitalLifeSpine ?? null
    const rawRuntimeSurfaceDigitalLifeSpine = input.runtimeSurface.digitalLifeSpine ?? null
    const preparedDigitalLifeSpine = sanitizeMirrorDigitalLifeSpine(rawPreparedDigitalLifeSpine)
    const runtimeSurfaceDigitalLifeSpine = sanitizeMirrorDigitalLifeSpine(rawRuntimeSurfaceDigitalLifeSpine)
    const preferredIncomingDigitalLifeSpine
      = rawPreparedDigitalLifeSpine?.runtimeSurface && !hasUsableDigitalLifeRuntimeSurface(rawPreparedDigitalLifeSpine.runtimeSurface)
        ? rawRuntimeSurfaceDigitalLifeSpine ?? rawPreparedDigitalLifeSpine
        : rawPreparedDigitalLifeSpine ?? rawRuntimeSurfaceDigitalLifeSpine ?? null
    const digitalLifeSpine = preparedDigitalLifeSpine?.runtimeSurface === preferredRuntimeSurface
      ? preparedDigitalLifeSpine
      : runtimeSurfaceDigitalLifeSpine?.runtimeSurface === preferredRuntimeSurface
        ? runtimeSurfaceDigitalLifeSpine
        : preferMoreRecentDigitalLifeSpine({
            preparedRuntimeSurface: preferredRuntimeSurface,
            runtimeSurfaceSpine: preferredIncomingDigitalLifeSpine,
          })
    const recollection = deriveSessionMirrorRecollectionState(input.organicMemoryContext ?? null)
    const mirror: AlicizationDialogueSessionMirror = {
      cardId: normalizedCardId,
      sessionId: normalizedSessionId,
      updatedAt: Number.isFinite(resolveDigitalLifeSpineUpdatedAt(digitalLifeSpine))
        ? resolveDigitalLifeSpineUpdatedAt(digitalLifeSpine)
        : getNow(),
      decisionTraceId: sanitizeText(input.runtimeSurface.trace.decisionTraceId, 200) || null,
      continuityArcSummary: sanitizeMirrorProviderFacingSummary(compactContinuityArcSummary(
        mergeContinuityArcSummaries(
          summarizeContinuityArcFromSpine(digitalLifeSpine),
          summarizeContinuityArcFromPreparedRuntimeSurface(input.runtimeSurface),
          summarizeContinuityArcFromSignals(input.agentSession.continuitySignals),
        ),
      ), continuityArcSummaryMaxChars) || previousMirror?.continuityArcSummary || null,
      continuityProjectSummary: sanitizeMirrorProviderFacingSummary(
        summarizeContinuityProjectForMirror({
          continuitySignals: input.agentSession.continuitySignals,
          runtimeSurface: preferredRuntimeSurface,
        }),
        continuityProjectSummaryMaxChars,
      ) || previousMirror?.continuityProjectSummary || null,
      continuityLabels: takeTailUnique(
        input.agentSession.continuitySignals
          .filter(signal => signal.kind !== 'execution-callback')
          .map(signal => sanitizeMirrorContinuityLabel(signal.label))
          .filter(Boolean),
        maxContinuityLabels,
        80,
      ),
      sessionPhases: takeTailUnique(
        input.runtimeSurface.trace.sessionPhases,
        maxSessionPhases,
        80,
      ),
      toolingSummary: summarizeTooling({
        agentSession: input.agentSession,
        surface: input.runtimeSurface,
      }),
      captureSummary: summarizeCapture(input.runtimeSurface),
      digitalLifeArchitectureSummary: sanitizeMirrorProviderFacingSummary(
        digitalLifeSpine?.architecture?.summary ?? input.runtimeSurface.digitalLifeArchitecture?.summary ?? '',
        220,
      ) || previousMirror?.digitalLifeArchitectureSummary || null,
      digitalLifeRuntimeSummary: sanitizeMirrorProviderFacingSummary(digitalLifeSpine?.continuitySignal?.summary ?? '', 220) || previousMirror?.digitalLifeRuntimeSummary || null,
      runtimeChannelSummary: sanitizeMirrorProviderFacingSummary(
        summarizeRuntimeChannelFromSpine(digitalLifeSpine),
        220,
      ) || previousMirror?.runtimeChannelSummary || null,
      runtimeTransitionSummary: sanitizeMirrorProviderFacingSummary(
        summarizeRuntimeTransitionFromSpine(digitalLifeSpine),
        220,
      ) || previousMirror?.runtimeTransitionSummary || null,
      mindSummary: sanitizeMirrorProviderFacingSummary(
        summarizeMindFromSpine(digitalLifeSpine),
        220,
      ) || previousMirror?.mindSummary || null,
      memoryCarrySummary: sanitizeMirrorProviderFacingSummary(
        deriveAlicizationDialogueMemoryCarryPolicy({
          now: getNow(),
          spine: digitalLifeSpine,
        }).summary,
        220,
      ) || previousMirror?.memoryCarrySummary || null,
      memorySummary: sanitizeMirrorProviderFacingSummary(
        summarizeMemoryFromSpine(digitalLifeSpine),
        220,
      ) || previousMirror?.memorySummary || null,
      recollection: recollection ?? previousMirror?.recollection ?? null,
      perceptionSummary: sanitizeText(
        summarizePerceptionFromSpine(digitalLifeSpine),
        220,
      ) || previousMirror?.perceptionSummary || null,
      agencySummary: sanitizeMirrorProviderFacingSummary(
        [
          summarizeAgencyFromSpine(digitalLifeSpine),
          summarizeExecutionAfterglowFromSpine(digitalLifeSpine),
          summarizeExecutionAfterglowFromContinuitySignals(input.agentSession.continuitySignals),
        ].filter(Boolean).join(' | '),
        220,
      ) || previousMirror?.agencySummary || null,
      executionSummary: sanitizeMirrorProviderFacingSummary(
        summarizeExecutionFromAgentSession(input.agentSession),
        220,
      ) || previousMirror?.executionSummary || null,
      dialogueSummary: sanitizeMirrorProviderFacingSummary(summarizeDialogue(input.runtimeSurface), 220) || previousMirror?.dialogueSummary || null,
    }

    mirrors.set(buildMirrorKey(normalizedCardId, normalizedSessionId), mirror)
    return cloneMirror(mirror)
  }

  function ingestAgentSessionSnapshot(input: {
    agentSession: AlicizationAgentSessionSnapshot
    cardId: string
    decisionTraceId?: string | null
    sessionId: string
    sessionPhases?: string[]
    source: string
  }) {
    pruneExpiredMirrors()
    const normalizedCardId = sanitizeText(input.cardId, 120) || 'default'
    const normalizedSessionId = sanitizeText(input.sessionId, 160)
    if (!normalizedSessionId) {
      throw new Error('dialogue session manager requires a non-empty session id')
    }

    const previousMirror = mirrors.get(buildMirrorKey(normalizedCardId, normalizedSessionId))
    const digitalLifeSpine = sanitizeMirrorDigitalLifeSpine(input.agentSession.digitalLifeSpine ?? null)
    const preserveExecutionCallbackSource = shouldPreserveExecutionCallbackMirrorSource({
      previousMirror,
      agentSession: input.agentSession,
      source: input.source,
    })
    const effectiveSource = preserveExecutionCallbackSource
      ? 'execution-callback'
      : input.source
    const mirror: AlicizationDialogueSessionMirror = {
      cardId: normalizedCardId,
      sessionId: normalizedSessionId,
      updatedAt: Number.isFinite(resolveDigitalLifeSpineUpdatedAt(digitalLifeSpine))
        ? resolveDigitalLifeSpineUpdatedAt(digitalLifeSpine)
        : Number.isFinite(input.agentSession.lastActiveAt)
          ? Number(input.agentSession.lastActiveAt)
          : getNow(),
      decisionTraceId: sanitizeText(input.decisionTraceId, 200) || previousMirror?.decisionTraceId || null,
      continuityArcSummary: sanitizeMirrorProviderFacingSummary(compactContinuityArcSummary(
        mergeContinuityArcSummaries(
          summarizeContinuityArcFromSpine(digitalLifeSpine),
          summarizeContinuityArcFromSignals(input.agentSession.continuitySignals),
        ),
      ), continuityArcSummaryMaxChars) || previousMirror?.continuityArcSummary || null,
      continuityProjectSummary: sanitizeMirrorProviderFacingSummary(
        summarizeContinuityProjectForMirror({
          continuitySignals: input.agentSession.continuitySignals,
          runtimeSurface: resolveUsableRuntimeSurfaceFromSpine(digitalLifeSpine),
        }),
        continuityProjectSummaryMaxChars,
      ) || previousMirror?.continuityProjectSummary || null,
      continuityLabels: takeTailUnique(
        input.agentSession.continuitySignals
          .filter(signal => signal.kind !== 'execution-callback')
          .map(signal => sanitizeMirrorContinuityLabel(signal.label))
          .filter(Boolean),
        maxContinuityLabels,
        80,
      ),
      sessionPhases: takeTailUnique(
        [
          ...(input.sessionPhases ?? []),
          `source:${sanitizeText(effectiveSource, 48) || 'unknown'}`,
        ],
        maxSessionPhases,
        80,
      ),
      toolingSummary: summarizeToolingFromAgentSession({
        agentSession: input.agentSession,
        source: effectiveSource,
      }),
      captureSummary: summarizeCaptureFromAgentSession(input.agentSession.lastSensorySnapshot),
      digitalLifeArchitectureSummary: sanitizeMirrorProviderFacingSummary(
        digitalLifeSpine?.architecture?.summary ?? input.agentSession.digitalLifeArchitecture?.summary ?? '',
        220,
      ) || previousMirror?.digitalLifeArchitectureSummary || null,
      digitalLifeRuntimeSummary: sanitizeMirrorProviderFacingSummary(
        [
          sanitizeText(digitalLifeSpine?.continuitySignal?.summary ?? '', 220),
          summarizeExecutionAfterglowFromSpine(digitalLifeSpine),
          summarizeExecutionAfterglowFromContinuitySignals(input.agentSession.continuitySignals),
        ].filter(Boolean).join(' | '),
        220,
      ) || previousMirror?.digitalLifeRuntimeSummary || null,
      runtimeChannelSummary: sanitizeMirrorProviderFacingSummary(
        summarizeRuntimeChannelFromSpine(digitalLifeSpine),
        220,
      ) || previousMirror?.runtimeChannelSummary || null,
      runtimeTransitionSummary: sanitizeMirrorProviderFacingSummary(
        summarizeRuntimeTransitionFromSpine(digitalLifeSpine),
        220,
      ) || previousMirror?.runtimeTransitionSummary || null,
      mindSummary: sanitizeMirrorProviderFacingSummary(
        summarizeMindFromSpine(digitalLifeSpine),
        220,
      ) || previousMirror?.mindSummary || null,
      memoryCarrySummary: sanitizeMirrorProviderFacingSummary(
        deriveAlicizationDialogueMemoryCarryPolicy({
          now: getNow(),
          spine: digitalLifeSpine,
        }).summary,
        220,
      ) || previousMirror?.memoryCarrySummary || null,
      memorySummary: sanitizeMirrorProviderFacingSummary(
        summarizeMemoryFromSpine(digitalLifeSpine),
        220,
      ) || previousMirror?.memorySummary || null,
      recollection: previousMirror?.recollection ?? null,
      perceptionSummary: sanitizeText(
        summarizePerceptionFromSpine(digitalLifeSpine),
        220,
      ) || previousMirror?.perceptionSummary || null,
      agencySummary: sanitizeMirrorProviderFacingSummary(
        [
          summarizeAgencyFromSpine(digitalLifeSpine),
          summarizeExecutionAfterglowFromSpine(digitalLifeSpine),
          summarizeExecutionAfterglowFromContinuitySignals(input.agentSession.continuitySignals),
        ].filter(Boolean).join(' | '),
        220,
      ) || previousMirror?.agencySummary || null,
      executionSummary: sanitizeMirrorProviderFacingSummary(
        summarizeExecutionFromAgentSession(input.agentSession),
        220,
      ) || previousMirror?.executionSummary || null,
      dialogueSummary: sanitizeMirrorProviderFacingSummary(summarizeDialogueFromSpine({
        decisionTraceId: input.decisionTraceId,
        source: effectiveSource,
        spine: digitalLifeSpine,
      }), 220) || previousMirror?.dialogueSummary || null,
    }

    mirrors.set(buildMirrorKey(normalizedCardId, normalizedSessionId), mirror)
    return cloneMirror(mirror)
  }

  function buildSessionMirrorSystemBlock(input: {
    cardId: string
    sessionId: string
  }) {
    const mirror = getSessionMirror(input.cardId, input.sessionId)
    if (!mirror)
      return ''

    const continuityArcSummary = (() => {
      const current = mirror.continuityArcSummary ?? 'none'
      const labels = mirror.continuityLabels.join(',')
      const shouldRestoreRepairCue
        = /repair-first|repair-before-closeness/u.test(labels)
          && !/repair-before-closeness/u.test(current)
      return shouldRestoreRepairCue
        ? `${current} | hold=repair-before-closeness | carry=quieter blink | anchor=softened gaze`
        : current
    })()

    return [
      '[ALICIZATION_DIALOGUE_SESSION_MIRROR]',
      `conversation_session_id=${mirror.sessionId}`,
      `mirror_age_ms=${Math.max(0, getNow() - mirror.updatedAt)}`,
      mirror.decisionTraceId
        ? `decision_trace_id=${mirror.decisionTraceId}`
        : '',
      `session_phases=${mirror.sessionPhases.join(' -> ') || 'none'}`,
      `continuity_labels=${mirror.continuityLabels.join(',') || 'none'}`,
      `continuity_arc=${continuityArcSummary}`,
      `continuity_project=${mirror.continuityProjectSummary ?? 'none'}`,
      `tooling=${mirror.toolingSummary}`,
      `capture=${mirror.captureSummary}`,
      `digital_life_architecture=${mirror.digitalLifeArchitectureSummary ?? 'none'}`,
      `digital_life_runtime=${mirror.digitalLifeRuntimeSummary ?? 'none'}`,
      `runtime_channel=${mirror.runtimeChannelSummary ?? 'none'}`,
      `runtime_transition=${mirror.runtimeTransitionSummary ?? 'none'}`,
      `mind=${mirror.mindSummary ?? 'none'}`,
      `memory_carry=${mirror.memoryCarrySummary ?? 'none'}`,
      `memory=${mirror.memorySummary ?? 'none'}`,
      `perception=${mirror.perceptionSummary ?? 'none'}`,
      `agency=${mirror.agencySummary ?? 'none'}`,
      `execution=${mirror.executionSummary ?? 'none'}`,
      `dialogue=${mirror.dialogueSummary ?? 'none'}`,
      'session_mirror.role=latest_settled_session_mirror',
      'session_mirror.fresh_perception=false',
      'session_mirror.continuity_fallback=allowed_when_no_newer_grounded_signal',
      'session_mirror.restate_as_current_observation=blocked',
    ].filter(Boolean).join('\n')
  }

  return {
    buildSessionMirrorSystemBlock,
    clear,
    getSessionMirror,
    ingestAgentSessionSnapshot,
    ingestPreparedExecution,
  }
}
