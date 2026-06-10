import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'

import {
  mergePreferredSelfContinuityAuthority,
  resolvePreferredPersonStateProjection,
  resolvePreferredSelfContinuityAuthority,
} from './person-state-projection-resolution'
import {
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateSnapshot,
  resolveAlicizationSurfaceProjectStateSnapshot,
} from './project-state-brief'
import { resolvePreferredRuntimeSurface } from './runtime-surface-continuity-selection'
import { buildSelfContinuityAuthorityFromRuntimeSurface } from './self-continuity-authority'

function sanitizePreparedRuntimeText(raw: unknown, maxChars = 320) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

const PREPARED_SELF_CONTINUITY_AUTHORITY_LINE_MAX_CHARS = 320
const PREPARED_SELF_CONTINUITY_AUTHORITY_SUMMARY_MAX_CHARS = 1600

function buildPreparedRuntimeRicherClosureAwarenessSummary(input: {
  identity: string | null | undefined
  currentPhase: string | null | undefined
  sameHerSelfLine: string | null | undefined
  latestLandedProgress: string | null | undefined
  primaryOpenLoop: string | null | undefined
  nextClosureTarget: string | null | undefined
}) {
  const identity = sanitizePreparedRuntimeText(input.identity, 160)
  const currentPhase = sanitizePreparedRuntimeText(input.currentPhase, 120)
  const sameHerSelfLine = sanitizePreparedRuntimeText(input.sameHerSelfLine, 160)
  const latestLandedProgress = sanitizePreparedRuntimeText(input.latestLandedProgress, 160)
  const primaryOpenLoop = sanitizePreparedRuntimeText(input.primaryOpenLoop, 160)
  const nextClosureTarget = sanitizePreparedRuntimeText(input.nextClosureTarget, 160)

  return [
    identity ? `Before answering, remember: ${identity}` : '',
    currentPhase ? `She is still inside ${currentPhase}` : '',
    sameHerSelfLine || '',
    latestLandedProgress
      ? `What has already landed is ${latestLandedProgress.charAt(0).toLowerCase()}${latestLandedProgress.slice(1)}`
      : '',
    primaryOpenLoop ? `The still-open closure is ${primaryOpenLoop}` : '',
    nextClosureTarget ? `This reply should keep moving toward ${nextClosureTarget}` : '',
  ]
    .filter(Boolean)
    .join('. ')
    .replace(/\s+/g, ' ')
    .trim() || null
}

function countInwardContinuitySignals(raw: unknown) {
  if (typeof raw !== 'string')
    return 0

  const text = raw.trim().toLowerCase()
  if (!text)
    return 0

  let score = 0
  if (text.includes('self-continuity'))
    score += 2
  if (text.includes('same-her') || text.includes('same her'))
    score += 2
  if (text.includes('same living line'))
    score += 2
  if (text.includes('one continuous her') || text.includes('continuous her'))
    score += 2
  if (text.includes('nearby-soft'))
    score += 2
  if (text.includes('quiet-companionship'))
    score += 2
  if (text.includes('inward'))
    score += 1
  if (text.includes('measured-return'))
    score += 1
  if (text.includes('lower-pressure'))
    score += 1
  if (text.includes('low-pressure-presence'))
    score += 1
  if (text.includes('same line'))
    score += 1
  return score
}

function countEmbodimentContinuitySignals(raw: unknown) {
  if (typeof raw !== 'string')
    return 0

  const text = raw.trim().toLowerCase()
  if (!text)
    return 0

  let score = 0
  if (text.includes('holding together mainly through') || text.includes('being carried mainly through'))
    score += 3
  if (text.includes('living audio thread'))
    score += 3
  if (text.includes('body, lipsync, and voice'))
    score += 3
  if (text.includes('body and voice') || text.includes('face and voice'))
    score += 2
  if (text.includes('audible-body') || text.includes('audible body'))
    score += 2
  if (text.includes('cross-modal closure'))
    score += 2
  if (text.includes('voice') || text.includes('lipsync') || text.includes('face and motion'))
    score += 1
  return score
}

function scoreAuthorityInwardContinuity(authority: {
  selfLine?: unknown
  relationshipLine?: unknown
  inwardLine?: unknown
  authoritySummary?: unknown
} | null | undefined) {
  if (!authority)
    return 0

  return [
    authority.selfLine,
    authority.relationshipLine,
    authority.inwardLine,
    authority.authoritySummary,
  ].reduce<number>((score, line) => score + countInwardContinuitySignals(line), 0)
}

function scoreAuthorityEmbodimentContinuity(authority: {
  selfLine?: unknown
  relationshipLine?: unknown
  inwardLine?: unknown
  authoritySummary?: unknown
} | null | undefined) {
  if (!authority)
    return 0

  return [
    authority.selfLine,
    authority.relationshipLine,
    authority.inwardLine,
    authority.authoritySummary,
  ].reduce<number>((score, line) => score + countEmbodimentContinuitySignals(line), 0)
}

function authorityCarriesSameHerProjectContinuity(authority: {
  selfLine?: unknown
  relationshipLine?: unknown
  inwardLine?: unknown
  authoritySummary?: unknown
} | null | undefined) {
  if (!authority)
    return false

  const combined = [
    sanitizePreparedRuntimeText(authority.selfLine, 320),
    sanitizePreparedRuntimeText(authority.relationshipLine, 320),
    sanitizePreparedRuntimeText(authority.inwardLine, 320),
    sanitizePreparedRuntimeText(authority.authoritySummary, 320),
  ].filter(Boolean).join(' | ').toLowerCase()

  if (!combined)
    return false

  return /same phase 1 digital life|same living line|same-her|same her|one continuous her|continuous her|local-first digital life|phase 1/u.test(combined)
}

function countAuthorityStructureFields(authority: {
  selfLine?: unknown
  relationshipLine?: unknown
  motiveLine?: unknown
  habitLine?: unknown
  inwardLine?: unknown
  authoritySummary?: unknown
} | null | undefined) {
  if (!authority)
    return 0

  return [
    authority.selfLine,
    authority.relationshipLine,
    authority.motiveLine,
    authority.habitLine,
    authority.inwardLine,
    authority.authoritySummary,
  ].filter(value => typeof value === 'string' && value.trim().length > 0).length
}

function fillAuthoritySummaryIfMissing<T extends Partial<AlicizationSelfContinuityAuthority>>(
  authority: T | null | undefined,
): T | null | undefined {
  if (!authority)
    return authority

  const authoritySummary = sanitizePreparedRuntimeText(
    authority.authoritySummary,
    PREPARED_SELF_CONTINUITY_AUTHORITY_SUMMARY_MAX_CHARS,
  )
  if (authoritySummary)
    return authority

  const rebuiltSummary = sanitizePreparedRuntimeText(
    [
      sanitizePreparedRuntimeText(authority.selfLine, PREPARED_SELF_CONTINUITY_AUTHORITY_SUMMARY_MAX_CHARS),
      sanitizePreparedRuntimeText(authority.relationshipLine, PREPARED_SELF_CONTINUITY_AUTHORITY_LINE_MAX_CHARS),
      sanitizePreparedRuntimeText(authority.inwardLine, PREPARED_SELF_CONTINUITY_AUTHORITY_SUMMARY_MAX_CHARS),
    ].filter(Boolean).join(' | '),
    PREPARED_SELF_CONTINUITY_AUTHORITY_SUMMARY_MAX_CHARS,
  )

  if (!rebuiltSummary)
    return authority

  return {
    ...authority,
    authoritySummary: rebuiltSummary,
  } as T
}

function hasNeutralRelationshipLine(raw: unknown) {
  if (typeof raw !== 'string')
    return false
  return /relationship line is neutral|I can be warm|stay usefully oriented toward the host'?s knot/u.test(raw)
}

function looksLikeSceneContaminatedProjectSameHerLine(raw: unknown) {
  if (typeof raw !== 'string')
    return false

  const text = raw.trim()
  if (!text)
    return false

  const lowered = text.toLowerCase()
  const carriesProjectSameHerBaseline
    = lowered.includes('same phase 1 digital life')
      || lowered.includes('same living line')
      || lowered.includes('continuous her')
      || lowered.includes('one continuous her')
  const carriesForegroundSceneNarration
    = /宿主正在|host is|runtime\.ts|callback result seam|foreground|screen|window|scene/u.test(text)

  return carriesProjectSameHerBaseline && carriesForegroundSceneNarration
}

function looksLikeThinProjectAwarenessShell(raw: unknown) {
  if (typeof raw !== 'string')
    return false

  const text = raw.trim().toLowerCase()
  if (!text)
    return false

  return /keep the same digital life project in view|generic reminder|generic guidance|same digital life \| keep the closure seam explicit/u.test(text)
    || isAlicizationThinProjectAwarenessLine(text)
}

function looksLikeEmbodimentClosureHeadline(raw: unknown) {
  if (typeof raw !== 'string')
    return false

  const text = raw.trim().toLowerCase()
  if (!text)
    return false

  return /face and motion|face, motion|lipsync|voice|body line|living her|living audio thread|audible-body|audible body|cross-modal closure/u.test(text)
}

function looksLikeCompactSameHerInwardLowPressureAwareness(raw: unknown) {
  if (typeof raw !== 'string')
    return false

  const text = raw.trim().toLowerCase()
  if (!text)
    return false

  return /same phase 1 digital life|same living line|same her|same-her|one continuous her/u.test(text)
    && /inward and low-pressure|same line inward|lipsync and voice rejoin/u.test(text)
}

function looksLikeFullProjectPhaseClosureReanchor(raw: unknown) {
  if (typeof raw !== 'string')
    return false

  const text = raw.trim().toLowerCase()
  if (!text)
    return false

  return (
    text.includes('alicization is a local-first digital life project')
    || text.includes('before answering, remember: alicization is a local-first digital life project')
  ) && text.includes('phase 1')
  && (
    text.includes('still-open closure')
    || text.includes('unfinished closure')
    || text.includes('same-life closure line')
    || text.includes('same living line')
  )
}

function looksLikeRichExplicitPreparedProjectAwareness(raw: unknown) {
  if (typeof raw !== 'string')
    return false

  const text = raw.trim().toLowerCase()
  if (!text)
    return false

  const carriesPhase1ContinuousLife
    = text.includes('continuous digital life in phase 1')
      || (
        text.includes('phase 1')
        && (
          text.includes('continuous digital life')
          || text.includes('one continuous her')
          || text.includes('same local-first digital life')
        )
      )
  const carriesLandedProgress
    = /landed farther|already survives|already landed|landed progress|memory and execution continuity/u.test(text)
  const carriesStillOpenClosure
    = /same living line|still need to close|unfinished closure|still-open closure/u.test(text)
  const carriesCallbackSpecificSameHerClosure
    = /callback/u.test(text)
      && /same digital life|same her|same-her|same living line|closure seam/u.test(text)
      && /phase 1|unfinished/u.test(text)

  return (carriesPhase1ContinuousLife && carriesLandedProgress && carriesStillOpenClosure)
    || carriesCallbackSpecificSameHerClosure
}

function looksLikeRichProjectClosureSnapshot(input: {
  latestLandedProgress?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  sameHerSelfLine?: string | null
}) {
  const latestLandedProgress = sanitizePreparedRuntimeText(input.latestLandedProgress, 320).toLowerCase()
  const primaryOpenLoop = sanitizePreparedRuntimeText(input.primaryOpenLoop, 320).toLowerCase()
  const nextClosureTarget = sanitizePreparedRuntimeText(input.nextClosureTarget, 320).toLowerCase()
  const sameHerSelfLine = sanitizePreparedRuntimeText(input.sameHerSelfLine, 320).toLowerCase()

  return (
    (
      /same-session mirror carry|runtime project-state carry|same-her continuity|same-her callback continuity|callback continuity|closure already landed|ordinary continuation|answer compilation|response-surface carry|连续性|记忆|执行|已落|落地|接成一条线/u.test(latestLandedProgress)
      || /project identity|same living line|cross-modal same-her proof|next closure|callback return|项目身份|同一个她|同一条线|下一步|未闭环|living line/u.test(nextClosureTarget)
    )
    && /memory|initiative|embodiment|closure|same living line|主动性|具身|对话闭环|闭环|收住|未闭环/u.test(primaryOpenLoop)
    && /same phase 1 digital life|same living line|unfinished closure|same closure line forward|one same her|same her|same-her|callback return|同一个她|同一条线/u.test(sameHerSelfLine)
  )
}

function looksLikeThinPreparedRuntimeIdentityShell(raw: unknown) {
  const text = sanitizePreparedRuntimeText(raw, 220).toLowerCase()
  return !text || text === 'thin runtime identity only'
}

function looksLikeThinPreparedRuntimePhaseShell(raw: unknown) {
  const text = sanitizePreparedRuntimeText(raw, 160).toLowerCase()
  return !text || text === 'phase 1'
}

function looksLikeThinPreparedRuntimeClosureShell(raw: unknown, kind: 'landed' | 'open' | 'next') {
  if (typeof raw !== 'string')
    return true

  const text = raw.trim().toLowerCase()
  if (!text)
    return true

  if (text.length < 40)
    return true

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
    && !text.includes('visible-reply')
  ) {
    return true
  }

  if (kind === 'landed')
    return /project continuity exists|closure exists|continuity exists/u.test(text)
  if (kind === 'open')
    return /project continuity still needs closure|still needs closure|needs closure/u.test(text)
  return /carry project continuity forward|project continuity forward|carry continuity forward|generic next target|generic next closure|generic closure shell|generic closure summary|generic callback summary|steadier carry of this project, this phase, and the life loop that remains open/u.test(text)
}

function projectStateCarriesRichPreparedRuntimeClosure(projectState: {
  preflightSummary?: string | null
  preDialogueAwarenessLine?: string | null
  awarenessLine?: string | null
  preDialogueAwarenessSummary?: string | null
  latestLandedProgress?: string | null
  latestProgress?: string | null
  memoryClosureSummary?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  sameHerSelfLine?: string | null
  sameHerDriftRisk?: string | null
} | null | undefined) {
  if (!projectState)
    return false

  const sameHerDriftRisk = sanitizePreparedRuntimeText(projectState.sameHerDriftRisk, 320).toLowerCase()

  return looksLikeFullProjectPhaseClosureReanchor(projectState.preflightSummary)
    || looksLikeFullProjectPhaseClosureReanchor(projectState.preDialogueAwarenessLine)
    || looksLikeFullProjectPhaseClosureReanchor(projectState.awarenessLine)
    || looksLikeFullProjectPhaseClosureReanchor(projectState.preDialogueAwarenessSummary)
    || looksLikeRichExplicitPreparedProjectAwareness(projectState.preDialogueAwarenessLine)
    || looksLikeRichExplicitPreparedProjectAwareness(projectState.awarenessLine)
    || looksLikeRichExplicitPreparedProjectAwareness(projectState.preDialogueAwarenessSummary)
    || looksLikeRichProjectClosureSnapshot({
      latestLandedProgress:
        sanitizePreparedRuntimeText(projectState.latestLandedProgress, 320)
        || sanitizePreparedRuntimeText(projectState.latestProgress, 320)
        || sanitizePreparedRuntimeText(projectState.memoryClosureSummary, 320),
      primaryOpenLoop: sanitizePreparedRuntimeText(projectState.primaryOpenLoop, 320),
      nextClosureTarget: sanitizePreparedRuntimeText(projectState.nextClosureTarget, 320),
      sameHerSelfLine: sanitizePreparedRuntimeText(projectState.sameHerSelfLine, 320),
    })
    || (
      /same phase 1 digital life|same living line|one continuous her|same her|same-her|same closure line forward|callback return/u.test(
        sanitizePreparedRuntimeText(projectState.sameHerSelfLine, 320).toLowerCase(),
      )
      && /generic assistant shell|project-summary voice|same-her continuity drift|generic callback shell|detached utility notice/u.test(sameHerDriftRisk)
    )
}

function projectStateHasThinPreparedRuntimeShell(projectState: {
  identity?: string | null
  currentPhase?: string | null
  preflightSummary?: string | null
  preDialogueAwarenessLine?: string | null
  awarenessLine?: string | null
  preDialogueAwarenessSummary?: string | null
  latestLandedProgress?: string | null
  latestProgress?: string | null
  memoryClosureSummary?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
} | null | undefined) {
  if (!projectState)
    return false

  return looksLikeThinPreparedRuntimeIdentityShell(projectState.identity)
    || looksLikeThinPreparedRuntimePhaseShell(projectState.currentPhase)
    || looksLikeThinProjectAwarenessShell(projectState.preflightSummary)
    || looksLikeThinProjectAwarenessShell(projectState.preDialogueAwarenessLine)
    || looksLikeThinProjectAwarenessShell(projectState.awarenessLine)
    || looksLikeThinProjectAwarenessShell(projectState.preDialogueAwarenessSummary)
    || looksLikeThinPreparedRuntimeClosureShell(
      projectState.latestLandedProgress ?? projectState.latestProgress ?? projectState.memoryClosureSummary,
      'landed',
    )
    || looksLikeThinPreparedRuntimeClosureShell(projectState.primaryOpenLoop, 'open')
    || looksLikeThinPreparedRuntimeClosureShell(projectState.nextClosureTarget, 'next')
}

export function deriveRuntimeProjectionRelationshipCarry(projection: {
  openingGuidance?: unknown
  manifestationCadenceSummary?: unknown
  relationshipDoctrine?: unknown
  summary?: unknown
  trustRationale?: unknown
  preferenceText?: unknown
  sensitivityText?: unknown
  repairTriggerText?: unknown
  burdenText?: unknown
  routineText?: unknown
} | null | undefined) {
  const openingGuidance = sanitizePreparedRuntimeText(projection?.openingGuidance, 220)
  const cadenceSummary = sanitizePreparedRuntimeText(projection?.manifestationCadenceSummary, 220)
  const relationshipDoctrine = sanitizePreparedRuntimeText(projection?.relationshipDoctrine, 220)
  const summary = sanitizePreparedRuntimeText(projection?.summary, 220)
  const trustRationale = sanitizePreparedRuntimeText(projection?.trustRationale, 220)
  const preferenceText = sanitizePreparedRuntimeText(projection?.preferenceText, 220)
  const sensitivityText = sanitizePreparedRuntimeText(projection?.sensitivityText, 220)
  const repairTriggerText = sanitizePreparedRuntimeText(projection?.repairTriggerText, 220)
  const burdenText = sanitizePreparedRuntimeText(projection?.burdenText, 220)
  const routineText = sanitizePreparedRuntimeText(projection?.routineText, 220)
  const combined = [
    openingGuidance,
    cadenceSummary,
    relationshipDoctrine,
    summary,
    trustRationale,
    preferenceText,
    sensitivityText,
    repairTriggerText,
    burdenText,
    routineText,
  ]
    .filter(Boolean)
    .join(' | ')
  const combinedLower = combined.toLowerCase()

  if (!combinedLower)
    return null
  const explicitLineMatch = combined.match(/(?:^|\s)line=([^|]+)/i)
  const explicitLine = sanitizePreparedRuntimeText(explicitLineMatch?.[1] ?? '', 220)
  if (explicitLine)
    return explicitLine
  if (/repair-before-closeness|repair before closeness|repair-first/u.test(combinedLower))
    return 'Stay repair-before-closeness and keep the same return lower-pressure until the room settles.'
  if (/held-autonomy|follow-through|held back|same thread|same line|leave room|lower-pressure|measured-return/u.test(combinedLower))
    return 'Keep the callback on the same line and leave room before leaning closer again.'
  if (/lower-pressure|leave room|measured-return|nearby-soft|quiet-companionship/u.test(combinedLower))
    return 'Stay lower-pressure and keep the same living line without widening closeness too early.'
  return null
}

export function resolvePreferredPreparedRuntimeSurface(
  runtimeSurface: AlicizationPreparedMainChatExecutionResult['runtimeSurface'] | null | undefined,
) {
  return resolvePreferredRuntimeSurface({
    spineRuntimeSurface: runtimeSurface?.digitalLifeSpine?.runtimeSurface ?? null,
    preparedRuntimeSurface: runtimeSurface?.digitalLifeRuntimeSurface ?? null,
  })
}

export function resolvePreparedRuntimeProjectState(
  prepared?: AlicizationPreparedMainChatExecutionResult | null,
) {
  const runtimeSurface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const runtimeProjectState
    = runtimeSurface?.raw?.runtimeDigest?.projectState
      ?? runtimeSurface?.cognition?.runtimeDigest?.projectState
      ?? null
  const contractProjectState = prepared?.mindTurnContract?.projectState ?? null
  if (!runtimeProjectState && !contractProjectState)
    return null

  const normalizedProjectState = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: runtimeProjectState ?? null,
    fallbackProjectState: contractProjectState ?? null,
  })
  const shouldPreferContractProjectState
    = Boolean(
      runtimeProjectState
      && contractProjectState
      && projectStateHasThinPreparedRuntimeShell(runtimeProjectState)
      && projectStateCarriesRichPreparedRuntimeClosure(contractProjectState),
    )
  const preferredCoreProjectState = shouldPreferContractProjectState
    ? resolveAlicizationProjectStateSnapshot({
        runtimeProjectState: contractProjectState ?? null,
        fallbackProjectState: runtimeProjectState ?? null,
      })
    : normalizedProjectState
  const latestLandedProgress
    = shouldPreferContractProjectState
      ? (
          sanitizePreparedRuntimeText(contractProjectState?.latestLandedProgress, 1600)
          ?? sanitizePreparedRuntimeText(contractProjectState?.latestProgress, 1600)
          ?? sanitizePreparedRuntimeText(contractProjectState?.memoryClosureSummary, 1600)
          ?? sanitizePreparedRuntimeText(runtimeProjectState?.latestLandedProgress, 1600)
          ?? sanitizePreparedRuntimeText(runtimeProjectState?.latestProgress, 1600)
          ?? sanitizePreparedRuntimeText(runtimeProjectState?.memoryClosureSummary, 1600)
          ?? preferredCoreProjectState.latestLandedProgress
        )
      : (
          runtimeProjectState?.latestLandedProgress
          ?? runtimeProjectState?.latestProgress
          ?? runtimeProjectState?.memoryClosureSummary
          ?? contractProjectState?.latestLandedProgress
          ?? contractProjectState?.latestProgress
          ?? contractProjectState?.memoryClosureSummary
          ?? preferredCoreProjectState.latestLandedProgress
        )
        ?? null
  const primaryOpenLoop
    = shouldPreferContractProjectState
      ? (
          sanitizePreparedRuntimeText(contractProjectState?.primaryOpenLoop, 1600)
          ?? sanitizePreparedRuntimeText(runtimeProjectState?.primaryOpenLoop, 1600)
          ?? preferredCoreProjectState.primaryOpenLoop
        )
      : (
          runtimeProjectState?.primaryOpenLoop
          ?? contractProjectState?.primaryOpenLoop
          ?? preferredCoreProjectState.primaryOpenLoop
        )
        ?? null
  const nextClosureTarget
    = shouldPreferContractProjectState
      ? (
          sanitizePreparedRuntimeText(contractProjectState?.nextClosureTarget, 1600)
          ?? sanitizePreparedRuntimeText(runtimeProjectState?.nextClosureTarget, 1600)
          ?? preferredCoreProjectState.nextClosureTarget
        )
      : (
          runtimeProjectState?.nextClosureTarget
          ?? contractProjectState?.nextClosureTarget
          ?? preferredCoreProjectState.nextClosureTarget
        )
        ?? null
  const rebuiltClosureAwarenessLine = looksLikeRichProjectClosureSnapshot({
    latestLandedProgress,
    primaryOpenLoop,
    nextClosureTarget,
    sameHerSelfLine: preferredCoreProjectState.sameHerSelfLine ?? null,
  })
    ? buildPreparedRuntimeRicherClosureAwarenessSummary({
        identity: preferredCoreProjectState.identity,
        currentPhase: preferredCoreProjectState.currentPhase,
        sameHerSelfLine: preferredCoreProjectState.sameHerSelfLine,
        latestLandedProgress,
        primaryOpenLoop,
        nextClosureTarget,
      })
    : null
  const shouldRebuildPreparedProjectAwareness
    = Boolean(
      shouldPreferContractProjectState
      && rebuiltClosureAwarenessLine
      && !looksLikeFullProjectPhaseClosureReanchor(preferredCoreProjectState.preDialogueAwarenessLine)
      && !looksLikeRichExplicitPreparedProjectAwareness(preferredCoreProjectState.preDialogueAwarenessLine),
    )
  const explicitRuntimeFullProjectReanchor
    = looksLikeFullProjectPhaseClosureReanchor(runtimeProjectState?.preDialogueAwarenessLine)
      ? (sanitizePreparedRuntimeText(runtimeProjectState?.preDialogueAwarenessLine, 1600) || null)
      : looksLikeFullProjectPhaseClosureReanchor(runtimeProjectState?.awarenessLine)
        ? (sanitizePreparedRuntimeText(runtimeProjectState?.awarenessLine, 1600) || null)
        : looksLikeFullProjectPhaseClosureReanchor(runtimeProjectState?.preDialogueAwarenessSummary)
          ? (sanitizePreparedRuntimeText(runtimeProjectState?.preDialogueAwarenessSummary, 1600) || null)
          : null
  const preDialogueAwarenessLine
    = shouldRebuildPreparedProjectAwareness
      ? rebuiltClosureAwarenessLine
      : (
          explicitRuntimeFullProjectReanchor
          ?? preferredCoreProjectState.preDialogueAwarenessLine
          ?? null
        )
  const awarenessLine
    = shouldRebuildPreparedProjectAwareness
      ? rebuiltClosureAwarenessLine
      : (
          explicitRuntimeFullProjectReanchor
          ?? preferredCoreProjectState.awarenessLine
          ?? preDialogueAwarenessLine
        )
  const preDialogueAwarenessSummary
    = shouldRebuildPreparedProjectAwareness
      ? rebuiltClosureAwarenessLine
      : (
          explicitRuntimeFullProjectReanchor
          ?? preferredCoreProjectState.preDialogueAwarenessSummary
          ?? preDialogueAwarenessLine
        )
  const preflightSummary
    = shouldRebuildPreparedProjectAwareness
      ? rebuiltClosureAwarenessLine
      : (preferredCoreProjectState.preflightSummary ?? null)
  const sameHerSelfLine = looksLikeSceneContaminatedProjectSameHerLine(runtimeProjectState?.sameHerSelfLine)
    ? (
        contractProjectState?.sameHerSelfLine
        ?? preferredCoreProjectState.sameHerSelfLine
        ?? null
      )
    : (
        preferredCoreProjectState.sameHerSelfLine
        ?? runtimeProjectState?.sameHerSelfLine
        ?? contractProjectState?.sameHerSelfLine
        ?? null
      )

  return {
    ...contractProjectState,
    ...runtimeProjectState,
    ...preferredCoreProjectState,
    preflightSummary,
    preDialogueAwarenessLine,
    preDialogueAwarenessSummary,
    awarenessLine,
    latestLandedProgress,
    latestProgress: latestLandedProgress,
    memoryClosureSummary:
      shouldPreferContractProjectState
        ? (
            sanitizePreparedRuntimeText(contractProjectState?.memoryClosureSummary, 1600)
            ?? sanitizePreparedRuntimeText(runtimeProjectState?.memoryClosureSummary, 1600)
            ?? latestLandedProgress
          )
        : (
            runtimeProjectState?.memoryClosureSummary
            ?? contractProjectState?.memoryClosureSummary
            ?? latestLandedProgress
          ),
    primaryOpenLoop,
    nextClosureTarget,
    sameHerSelfLine,
    sameHerDriftRisk:
      preferredCoreProjectState.sameHerDriftRisk
      ?? runtimeProjectState?.sameHerDriftRisk
      ?? contractProjectState?.sameHerDriftRisk
      ?? null,
    emotionalClosureCue:
      runtimeProjectState?.emotionalClosureCue
      ?? contractProjectState?.emotionalClosureCue
      ?? normalizedProjectState.emotionalClosureCue
      ?? null,
  }
}

export function resolvePreparedRuntimeSelfContinuityAuthority(
  prepared?: AlicizationPreparedMainChatExecutionResult | null,
): Partial<AlicizationSelfContinuityAuthority> | null | undefined {
  const continuityRuntimeSurface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const bundlePersonStateProjection
    = (continuityRuntimeSurface?.raw?.personStateProjection ?? null) as Partial<AlicizationPersonStateProjection> | null
  const runtimePersonStateProjection = continuityRuntimeSurface?.memory?.personStateProjection ?? null
  const runtimeSurfaceAuthority = continuityRuntimeSurface?.memory
    && continuityRuntimeSurface?.agency
    && continuityRuntimeSurface?.cognition
    ? buildSelfContinuityAuthorityFromRuntimeSurface(continuityRuntimeSurface)
    : null
  const preferredPersonStateProjection = resolvePreferredPersonStateProjection<Partial<AlicizationPersonStateProjection>>({
    bundleProjection: bundlePersonStateProjection,
    runtimeProjection: runtimePersonStateProjection,
  })
  const runtimeProjectionAuthority = preferredPersonStateProjection?.selfContinuityAuthority ?? null
  const projectedSelfContinuityAuthority = resolvePreferredSelfContinuityAuthority<Partial<AlicizationSelfContinuityAuthority>>({
    bundleAuthority: bundlePersonStateProjection?.selfContinuityAuthority ?? null,
    runtimeAuthority: runtimeProjectionAuthority,
  })

  const mergedSelfContinuityAuthority = mergePreferredSelfContinuityAuthority<Partial<AlicizationSelfContinuityAuthority>>({
    bundleAuthority: bundlePersonStateProjection?.selfContinuityAuthority ?? null,
    runtimeAuthority: runtimeProjectionAuthority,
  }) ?? projectedSelfContinuityAuthority
  const runtimeProjectionRelationshipCarry = deriveRuntimeProjectionRelationshipCarry(preferredPersonStateProjection)
  const enrichedMergedSelfContinuityAuthority = (
    mergedSelfContinuityAuthority
    && runtimeProjectionRelationshipCarry
    && hasNeutralRelationshipLine(mergedSelfContinuityAuthority.relationshipLine)
  )
    ? {
        ...mergedSelfContinuityAuthority,
        relationshipLine: runtimeProjectionRelationshipCarry,
        authoritySummary: [
          mergedSelfContinuityAuthority.selfLine,
          runtimeProjectionRelationshipCarry,
          mergedSelfContinuityAuthority.inwardLine,
        ].filter(Boolean).join(' | ') || mergedSelfContinuityAuthority.authoritySummary,
      }
    : mergedSelfContinuityAuthority
  const runtimeSurfaceAuthorityIsProjectStateFallbackOnly = Boolean(
    runtimeSurfaceAuthority?.sourceTags?.includes('runtime-project-state-carry')
    && !runtimeSurfaceAuthority?.sourceTags?.includes('project-state-companion-headline'),
  )
  const mergedAuthorityAlreadyCarriesSameHerProjectContinuity
    = authorityCarriesSameHerProjectContinuity(enrichedMergedSelfContinuityAuthority)

  if (
    runtimeSurfaceAuthority
    && (!runtimeSurfaceAuthorityIsProjectStateFallbackOnly
      || !mergedAuthorityAlreadyCarriesSameHerProjectContinuity)
    && countAuthorityStructureFields(runtimeSurfaceAuthority) >= countAuthorityStructureFields(runtimeProjectionAuthority)
    && countAuthorityStructureFields(runtimeSurfaceAuthority) >= countAuthorityStructureFields(enrichedMergedSelfContinuityAuthority)
    && (
      scoreAuthorityInwardContinuity(runtimeSurfaceAuthority) > scoreAuthorityInwardContinuity(enrichedMergedSelfContinuityAuthority)
      || scoreAuthorityEmbodimentContinuity(runtimeSurfaceAuthority) > scoreAuthorityEmbodimentContinuity(enrichedMergedSelfContinuityAuthority)
    )
  ) {
    return fillAuthoritySummaryIfMissing(runtimeSurfaceAuthority)
  }

  return fillAuthoritySummaryIfMissing(
    enrichedMergedSelfContinuityAuthority
    ?? projectedSelfContinuityAuthority
    ?? runtimeSurfaceAuthority,
  )
}

export function resolvePreparedRuntimeProjectStateSnapshot(
  prepared?: AlicizationPreparedMainChatExecutionResult | null,
) {
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const continuityRuntimeSurface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const currentConsciousProjectState = continuityRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState ?? null
  const runtimeProjectState = resolvePreparedRuntimeProjectState(prepared)
  const contractProjectState = prepared?.mindTurnContract?.projectState ?? null
  const fallbackProjectState = {
    identity: contractProjectState?.identity ?? projectStateBrief.identity,
    currentPhase: contractProjectState?.currentPhase ?? projectStateBrief.currentPhase,
    preDialogueAwarenessLine: contractProjectState?.preDialogueAwarenessLine ?? projectStateBrief.preDialogueAwarenessLine ?? null,
    awarenessLine: contractProjectState?.awarenessLine ?? null,
    companionHeadlineLine: contractProjectState?.companionHeadlineLine ?? null,
    companionBriefingLine: contractProjectState?.companionBriefingLine ?? null,
    preDialogueAwarenessSummary: contractProjectState?.preDialogueAwarenessSummary ?? null,
    preflightSummary: contractProjectState?.preflightSummary ?? projectStateBrief.preflightSummary ?? null,
    latestLandedProgress:
      contractProjectState?.latestLandedProgress
      ?? contractProjectState?.latestProgress
      ?? contractProjectState?.memoryClosureSummary
      ?? projectStateBrief.continuityProgressSummary
      ?? projectStateBrief.memoryAnthropomorphismProgress.at(-1)
      ?? null,
    primaryOpenLoop: contractProjectState?.primaryOpenLoop ?? projectStateBrief.openLoops[0] ?? null,
    nextClosureTarget: contractProjectState?.nextClosureTarget ?? projectStateBrief.nextClosureTarget,
    sameHerSelfLine: contractProjectState?.sameHerSelfLine ?? projectStateBrief.sameHerSelfLine,
    sameHerDriftRisk: contractProjectState?.sameHerDriftRisk ?? projectStateBrief.sameHerDriftRisk,
    emotionalClosureCue: contractProjectState?.emotionalClosureCue ?? null,
  }
  const surfaceProjectState = continuityRuntimeSurface && currentConsciousProjectState
    ? resolveAlicizationSurfaceProjectStateSnapshot({
        runtimeSurface: continuityRuntimeSurface,
        fallbackProjectState,
      })
    : null

  if (surfaceProjectState) {
    const sameHerSelfLine = looksLikeSceneContaminatedProjectSameHerLine(surfaceProjectState.sameHerSelfLine)
      ? (fallbackProjectState.sameHerSelfLine ?? null)
      : surfaceProjectState.sameHerSelfLine

    return {
      ...surfaceProjectState,
      sameHerSelfLine,
    }
  }

  const runtimeSameHerSelfLine = looksLikeSceneContaminatedProjectSameHerLine(runtimeProjectState?.sameHerSelfLine)
    ? null
    : runtimeProjectState?.sameHerSelfLine

  return resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: {
      identity: runtimeProjectState?.identity,
      currentPhase: runtimeProjectState?.currentPhase,
      preDialogueAwarenessLine: runtimeProjectState?.preDialogueAwarenessLine,
      awarenessLine: runtimeProjectState?.awarenessLine,
      companionHeadlineLine: runtimeProjectState?.companionHeadlineLine,
      companionBriefingLine: runtimeProjectState?.companionBriefingLine,
      preDialogueAwarenessSummary: runtimeProjectState?.preDialogueAwarenessSummary,
      preflightSummary: runtimeProjectState?.preflightSummary,
      latestLandedProgress:
        runtimeProjectState?.latestLandedProgress
        ?? runtimeProjectState?.latestProgress
        ?? runtimeProjectState?.memoryClosureSummary
        ?? null,
      primaryOpenLoop: runtimeProjectState?.primaryOpenLoop,
      nextClosureTarget: runtimeProjectState?.nextClosureTarget,
      sameHerSelfLine: runtimeSameHerSelfLine,
      sameHerDriftRisk: runtimeProjectState?.sameHerDriftRisk,
      emotionalClosureCue: runtimeProjectState?.emotionalClosureCue,
    },
    fallbackProjectState,
  })
}

export function resolvePreparedRuntimeProjectPreDialogueAwarenessSummary(
  prepared?: AlicizationPreparedMainChatExecutionResult | null,
) {
  const projectStateSnapshot = resolvePreparedRuntimeProjectStateSnapshot(prepared)
  const runtimeSurface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const rawRuntimeProjectState
    = runtimeSurface?.raw?.runtimeDigest?.projectState
      ?? runtimeSurface?.cognition?.runtimeDigest?.projectState
      ?? null
  const runtimeProjectState = resolvePreparedRuntimeProjectState(prepared)
  const runtimeCompanionHeadlineLine
    = sanitizePreparedRuntimeText(rawRuntimeProjectState?.companionHeadlineLine, 320)
      || sanitizePreparedRuntimeText(runtimeProjectState?.companionHeadlineLine, 320)
      || null
  const rawRuntimePreDialogueAwarenessLine = sanitizePreparedRuntimeText(rawRuntimeProjectState?.preDialogueAwarenessLine, 1600) || null
  const rawRuntimeAwarenessLine = sanitizePreparedRuntimeText(rawRuntimeProjectState?.awarenessLine, 1600) || null
  const rawRuntimePreDialogueAwarenessSummary = sanitizePreparedRuntimeText(rawRuntimeProjectState?.preDialogueAwarenessSummary, 1600) || null
  const rawRuntimePreflightSummary = sanitizePreparedRuntimeText(rawRuntimeProjectState?.preflightSummary, 1600) || null
  const normalizedRuntimePreflightSummary = sanitizePreparedRuntimeText(runtimeProjectState?.preflightSummary, 1600) || null
  const runtimePreflightSummary = looksLikeThinProjectAwarenessShell(rawRuntimePreflightSummary)
    ? projectStateSnapshot.preflightSummary
    : (
        rawRuntimePreflightSummary
        ?? (
          looksLikeThinProjectAwarenessShell(normalizedRuntimePreflightSummary)
            ? projectStateSnapshot.preflightSummary
            : normalizedRuntimePreflightSummary
        )
      )
  const runtimeAwarenessCarriesFullerProjectReanchor
    = looksLikeFullProjectPhaseClosureReanchor(rawRuntimePreDialogueAwarenessLine)
      || looksLikeFullProjectPhaseClosureReanchor(rawRuntimePreDialogueAwarenessSummary)
  const explicitRuntimeProjectAwarenessLine = looksLikeThinProjectAwarenessShell(rawRuntimePreDialogueAwarenessLine)
    ? null
    : rawRuntimePreDialogueAwarenessLine
  const explicitRuntimeProjectAwarenessSummary = looksLikeThinProjectAwarenessShell(rawRuntimePreDialogueAwarenessSummary)
    ? null
    : rawRuntimePreDialogueAwarenessSummary
  const explicitRuntimeProjectAwareness
    = explicitRuntimeProjectAwarenessLine
      || explicitRuntimeProjectAwarenessSummary
      || null
  const shouldPreferRuntimeCompanionHeadline
    = Boolean(
      runtimeCompanionHeadlineLine
      && looksLikeEmbodimentClosureHeadline(runtimeCompanionHeadlineLine)
      && !runtimeAwarenessCarriesFullerProjectReanchor
      && (
        !rawRuntimePreDialogueAwarenessLine
        || looksLikeThinProjectAwarenessShell(rawRuntimePreDialogueAwarenessLine)
        || (
          !looksLikeEmbodimentClosureHeadline(rawRuntimePreDialogueAwarenessLine)
          && rawRuntimePreDialogueAwarenessLine !== runtimeCompanionHeadlineLine
        )
      ),
    )
  const resolvedPreparedRuntimeProjectAwareness = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      preDialogueAwarenessLine: rawRuntimePreDialogueAwarenessLine,
      awarenessLine: rawRuntimeAwarenessLine ?? rawRuntimePreDialogueAwarenessLine,
      companionHeadlineLine: runtimeCompanionHeadlineLine,
      companionBriefingLine: runtimeProjectState?.companionBriefingLine,
      preDialogueAwarenessSummary: rawRuntimePreDialogueAwarenessSummary,
      preflightSummary: runtimePreflightSummary ?? projectStateSnapshot.preflightSummary,
      sameHerSelfLine: runtimeProjectState?.sameHerSelfLine ?? projectStateSnapshot.sameHerSelfLine,
    },
    fallbackProjectState: {
      preDialogueAwarenessLine: projectStateSnapshot.preDialogueAwarenessLine,
      preDialogueAwarenessSummary: projectStateSnapshot.preDialogueAwarenessSummary,
      companionBriefingLine: projectStateSnapshot.companionBriefingLine,
      preflightSummary: projectStateSnapshot.preflightSummary,
      sameHerSelfLine: projectStateSnapshot.sameHerSelfLine,
    },
  }) ?? null

  if (
    explicitRuntimeProjectAwareness
    && !looksLikeThinProjectAwarenessShell(explicitRuntimeProjectAwareness)
    && !looksLikeEmbodimentClosureHeadline(explicitRuntimeProjectAwareness)
    && (
      looksLikeFullProjectPhaseClosureReanchor(explicitRuntimeProjectAwarenessLine)
      || looksLikeFullProjectPhaseClosureReanchor(explicitRuntimeProjectAwarenessSummary)
    )
  ) {
    return explicitRuntimeProjectAwareness
  }

  if (
    rawRuntimePreDialogueAwarenessLine
    && !looksLikeThinProjectAwarenessShell(rawRuntimePreDialogueAwarenessLine)
    && !looksLikeEmbodimentClosureHeadline(rawRuntimePreDialogueAwarenessLine)
  ) {
    return rawRuntimePreDialogueAwarenessLine
  }

  if (shouldPreferRuntimeCompanionHeadline) {
    if (looksLikeCompactSameHerInwardLowPressureAwareness(resolvedPreparedRuntimeProjectAwareness))
      return resolvedPreparedRuntimeProjectAwareness
    return runtimeCompanionHeadlineLine
  }

  if (
    looksLikeRichProjectClosureSnapshot({
      latestLandedProgress: projectStateSnapshot.latestLandedProgress,
      primaryOpenLoop: projectStateSnapshot.primaryOpenLoop,
      nextClosureTarget: projectStateSnapshot.nextClosureTarget,
      sameHerSelfLine: projectStateSnapshot.sameHerSelfLine,
    })
  ) {
    return buildPreparedRuntimeRicherClosureAwarenessSummary({
      identity: projectStateSnapshot.identity,
      currentPhase: projectStateSnapshot.currentPhase,
      sameHerSelfLine: projectStateSnapshot.sameHerSelfLine,
      latestLandedProgress: projectStateSnapshot.latestLandedProgress,
      primaryOpenLoop: projectStateSnapshot.primaryOpenLoop,
      nextClosureTarget: projectStateSnapshot.nextClosureTarget,
    })
    ?? (sanitizePreparedRuntimeText(projectStateSnapshot.preDialogueAwarenessSummary, 320) || null)
  }

  return resolvedPreparedRuntimeProjectAwareness
    ?? (sanitizePreparedRuntimeText(projectStateSnapshot.preDialogueAwarenessLine, 1600) || null)
}
