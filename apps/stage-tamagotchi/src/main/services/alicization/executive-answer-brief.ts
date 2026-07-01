import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationPerceptionState, AlicizationPerceptionTarget } from './attention-anchor'
import type { AlicizationDialogueFocusGovernance } from './dialogue-focus-governor'
import type { AlicizationDialogueObligation } from './dialogue-obligation'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationResponseCharter } from './response-charter'

import { buildAlicizationScreenSurfaceCue, isWeakAlicizationScreenSurfaceCue } from '@proj-alicization/stage-shared'

import {
  getActiveAttentionAnchor,
  getActivePerceptionSceneResidue,
  isSelfPerceptionTarget,
} from './attention-anchor'
import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
import { sanitizeDialogueSurfaceText } from './dialogue-surface-text'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { deriveMindTruthContract } from './mind-truth-contract'
import {
  alicizationProjectStateAnswerMustDo,
  alicizationProjectStateAnswerMustNotDo,
  enrichProjectStateAnswerGovernanceIfNeeded,
} from './project-state-answer-governance'
import {
  compactProjectLatestProgressForSystemBlock,
  looksLikeThinProjectClosureShell,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateSnapshot,
} from './project-state-brief'
import {
  deriveCompactProjectStateNextFocusSummary,
  deriveCompactProjectStateOpenFocusSummary,
} from './project-state-focus'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function sanitizeCarryThreadCandidate(raw: unknown, maxChars = 220) {
  return sanitizeDialogueSurfaceText(raw, maxChars)
}

function preferExecutiveProjectStateAuditText(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = sanitizeText(input.current, 320)
  const candidate = sanitizeText(input.candidate, 320)

  if (!current)
    return candidate || null
  if (!candidate)
    return current
  if (current === candidate)
    return current

  return preferStrongerContinuityClosureAuthority(current, candidate)
    || current
}

function describeTarget(input: {
  target?: AlicizationPerceptionTarget | null
  sceneSummary?: string | null
  scenario?: string | null
  workloadKind?: string | null
  contentKind?: string | null
}) {
  if (!input.target && !input.sceneSummary)
    return 'none'
  return buildAlicizationScreenSurfaceCue({
    rawCues: [input.sceneSummary],
    target: input.target ?? null,
    scenario: input.scenario ?? null,
    workloadKind: input.workloadKind ?? null,
    contentKind: input.contentKind ?? null,
  })
}

function targetSignature(target?: AlicizationPerceptionTarget | null) {
  if (!target)
    return ''
  return [
    sanitizeText(target.appName, 48),
    sanitizeText(target.processName, 48),
    sanitizeText(target.title, 120),
  ].filter(Boolean).join('::').toLowerCase()
}

function pushUnique(target: string[], value: string) {
  const normalized = sanitizeText(value, 220)
  if (!normalized)
    return
  if (target.includes(normalized))
    return
  target.push(normalized)
}

function isWeakGenericSurface(target?: AlicizationPerceptionTarget | null) {
  if (!target)
    return true
  const signature = targetSignature(target)
  if (!signature)
    return true
  if (
    ['finder', 'chat overlay', 'alicization', 'codex', 'unknown']
      .some(marker => signature.includes(marker))
  ) {
    return true
  }
  return isWeakAlicizationScreenSurfaceCue(target.title)
}

function isThinProjectAwarenessShell(value: unknown) {
  const text = sanitizeText(value, 400).toLowerCase()
  if (!text)
    return false

  return /keep this same digital life project in view|detached project shell|generic project shell/u.test(text)
    || text === 'same digital life | keep the closure seam explicit'
}

function looksLikeThinProjectNextClosureShell(value: unknown) {
  const text = sanitizeText(value, 320).toLowerCase()
  if (!text)
    return true

  return looksLikeThinProjectClosureShell(text, 'next')
}

function scoreExecutiveProjectAwarenessLine(value: unknown) {
  const text = sanitizeText(value, 400).toLowerCase()
  if (!text)
    return 0

  let score = text.length >= 220 ? 2 : text.length >= 120 ? 1 : 0
  if (/alicization is a local-first digital life project|local-first digital life project|project identity/u.test(text))
    score += 4
  if (/phase 1|local digital life/u.test(text))
    score += 3
  if (/still-open closure|still open closure|what has already landed|same phase 1 digital life|some closure already landed/u.test(text))
    score += 3
  if (/execution|memory|initiative|embodiment/u.test(text))
    score += 2
  if (/same living line|one living her|full cross-modal closure|voice, face, and motion/u.test(text))
    score += 1
  if (/keep this same digital life project in view|detached project shell/u.test(text))
    score -= 2
  return score
}

function hasHeldAutonomyContinuity(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
  const labels = runtimeSurface?.dialogue.sessionMirror?.continuityLabels
  if (!Array.isArray(labels) || labels.length === 0)
    return false
  return labels.some(label => sanitizeText(label, 120).includes(':held-autonomy'))
}

function looksLikeProjectStateDirectAnswerTurn(input: {
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  responseCharter?: AlicizationResponseCharter | null
}) {
  if (input.dialogueFocus?.subject === 'project-state')
    return true
  if (!input.dialogueObligation?.mustAnswerDirectly)
    return false

  const evidence = [
    sanitizeText(input.dialogueSemantics?.summary, 320),
    sanitizeText(input.responseCharter?.governingFocus, 320),
    sanitizeText(input.responseCharter?.governingProject, 320),
  ]
    .filter(Boolean)
    .join(' | ')
    .toLowerCase()

  if (!evidence)
    return false

  const asksWhatThisProjectIs = /what alicization is|what this project is|项目是做什么|项目是什么/u.test(evidence)
  const asksProgress
    = /做到什么程度|做到哪|做到哪一步|进行到哪|进行到哪一步|执行到哪|进度|进展|到什么程度|how far|what has landed|what's landed|progress|landed/u.test(evidence)
  const asksProgressAndOpenClosure
    = /what still remains open|still remains open|what is not yet closed|做到什么程度|进行到哪|执行到哪|缺少什么|没有闭环|how far .* landed/u.test(evidence)
  const asksCurrentWork
    = /\b(?:what are you doing|what are you up to|what are you working on|what are you doing right now|currently doing|current work)\b|你(?:现在)?在(?:干嘛|做什么|忙什么|搞什么|做啥)/u.test(evidence)
  const asksStillPushingSameDigitalLifeClosure
    = /(?:still|还在|现在还在).{0,32}(?:complete|completing|finish|finishing|working on|doing|pushing|推进|完成|开发|做).{0,72}(?:digital[- ]life|数字生命|anthropomorphic|拟人|agency|主动性|closure|闭环|goal|phase 1|same (?:digital[- ]life|project line))|(?:digital[- ]life|数字生命|anthropomorphic|拟人|agency|主动性|closure|闭环|goal|phase 1|same (?:digital[- ]life|project line)).{0,72}(?:still|还在|现在还在).{0,32}(?:complete|completing|finish|finishing|working on|doing|pushing|推进|完成|开发|做)/u.test(evidence)
  const asksMergeReadinessOrClosure
    = /(?:can we|is (?:it|this)|ready to|merge-ready|能不能|可以|已经可以|现在可以).{0,40}(?:merge(?: this)? to main|合并到\s*main|ready to merge)|(?:merge(?: this)? to main|合并到\s*main|ready to merge).{0,24}(?:now|already|ready|了吗|吗)|还差哪步|还差哪一步|goal.{0,16}(?:闭环|完成|close|closed|complete)|才能算闭环|(?:已经在|已在|already (?:landed|on)|already contains|already on).{0,32}(?:本地\s*main|local\s+main)|(?:本地\s*main|local\s+main).{0,32}(?:已经|已|already).{0,24}(?:包含|落地|landed|contains|on)|origin\/main.{0,32}(?:安全|safe|update|push|推)|(?:安全|safe).{0,16}(?:推到|push to|update).{0,24}origin\/main|(?:会把|会不会把|without carrying|carry).{0,48}(?:别的提交|unrelated commits|other commits)|带上去/u.test(evidence)
  const asksCompletionTimelineOrLanguageDrift
    = /计划什么时候完成|什么时候完成(?:这个)?\s*goal|何时完成(?:这个)?\s*goal|什么时候完成|何时完成|expected to (?:finish|close)|expect to (?:finish|close)|when the goal is expected to close|why are you replying in english|replying in english|host language|为什么(?:一直|还)?用英文|为什么(?:一直|还)?不用中文|为什么还用英文|是不是偏移了|偏移了吗|did the thread drift|thread drift|thread has drifted|drifted out of/u.test(evidence)
  const namesProjectStateTurn = /project-state question|project status|project-state|project continuity/u.test(evidence)

  return namesProjectStateTurn
    || (asksWhatThisProjectIs && asksProgressAndOpenClosure)
    || (asksCurrentWork && asksStillPushingSameDigitalLifeClosure)
    || asksMergeReadinessOrClosure
    || (asksProgress && asksCompletionTimelineOrLanguageDrift)
}

function resolveExecutiveProjectLatestLandedProgressSource(input: {
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface
  canonicalLatestLandedProgress: string | null
}) {
  const currentProjectState = input.runtimeSurface.dialogue.currentConsciousFrame?.projectState as {
    latestLandedProgress?: unknown
    latestProgress?: unknown
    landedProgressSummary?: unknown
  } | null | undefined
  const cognitionProjectState = input.runtimeSurface.cognition.runtimeDigest?.projectState as {
    latestLandedProgress?: unknown
    latestProgress?: unknown
    landedProgressSummary?: unknown
    memoryClosureSummary?: unknown
  } | null | undefined
  const rawProjectState = input.runtimeSurface.raw?.runtimeDigest?.projectState as {
    latestLandedProgress?: unknown
    latestProgress?: unknown
    landedProgressSummary?: unknown
    memoryClosureSummary?: unknown
  } | null | undefined
  const dialogueProjectState = input.runtimeSurface.dialogue.runtimeDigest?.projectState as {
    latestLandedProgress?: unknown
    latestProgress?: unknown
    landedProgressSummary?: unknown
    memoryClosureSummary?: unknown
  } | null | undefined

  // Keep enough source text for project-state compaction to see late-stage
  // closure markers before the final system-block-sized line is produced.
  const candidates = [
    sanitizeText(currentProjectState?.latestLandedProgress ?? currentProjectState?.latestProgress, 18_000),
    sanitizeText(currentProjectState?.landedProgressSummary, 18_000),
    sanitizeText(cognitionProjectState?.latestLandedProgress ?? cognitionProjectState?.latestProgress, 18_000),
    sanitizeText(cognitionProjectState?.landedProgressSummary ?? cognitionProjectState?.memoryClosureSummary, 18_000),
    sanitizeText(rawProjectState?.latestLandedProgress ?? rawProjectState?.latestProgress, 18_000),
    sanitizeText(rawProjectState?.landedProgressSummary ?? rawProjectState?.memoryClosureSummary, 18_000),
    sanitizeText(dialogueProjectState?.latestLandedProgress ?? dialogueProjectState?.latestProgress, 18_000),
    sanitizeText(dialogueProjectState?.landedProgressSummary ?? dialogueProjectState?.memoryClosureSummary, 18_000),
    sanitizeText(input.canonicalLatestLandedProgress, 18_000),
  ]

  return candidates.find(candidate => candidate && !looksLikeThinProjectClosureShell(candidate, 'landed'))
    || candidates.find(Boolean)
    || ''
}

export interface AlicizationExecutiveAnswerBrief {
  turnMode: 'grounded-inspection' | 'screen-repair' | 'guide-current-knot' | 'care' | 'accompany' | 'answer'
  liveSurface: string
  carriedThread: string | null
  truthState: ReturnType<typeof deriveMindTruthContract>['truthState']
  separateCarryFromSurface: boolean
  shouldCompactHistory: boolean
  maxRecentUserTurns: number
  mustDo: string[]
  mustNotDo: string[]
}

export function buildAlicizationExecutiveAnswerBrief(input: {
  now: number
  inspectionRequested: boolean
  groundedThisTurn: boolean
  currentForeground?: AlicizationPerceptionTarget | null
  perceptionState: AlicizationPerceptionState
  visualPresenceState: AlicizationVisualPresenceStateSnapshot
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  responseCharter: AlicizationResponseCharter
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  claimEvidenceLedger?: AlicizationClaimEvidenceLedgerSnapshot | null
}) {
  const dialogueEncounter = input.dialogueEncounter ?? null
  const runtimeSurface = input.runtimeSurface ?? buildAlicizationDigitalLifeRuntimeSurface(input.visualPresenceState)
  const dialogueSemantics = dialogueEncounter?.semantics ?? input.dialogueSemantics ?? null
  const dialogueObligation = dialogueEncounter?.obligation ?? input.dialogueObligation ?? null
  const dialogueFocus = dialogueEncounter?.focus ?? input.dialogueFocus ?? null
  const discourseState = runtimeSurface.dialogue.discourseState ?? input.discourseState ?? null
  const mindSynthesis = runtimeSurface.dialogue.mindSynthesis ?? input.mindSynthesis ?? null
  const answerCompiler = runtimeSurface.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const claimEvidenceLedger = runtimeSurface.dialogue.claimEvidenceLedger ?? input.claimEvidenceLedger ?? null
  const truthContract = deriveMindTruthContract(runtimeSurface)
  const preferredScreenReferenceMode = answerCompiler?.screenReferenceMode
    ?? discourseState?.screenReferenceMode
    ?? dialogueFocus?.screenReferenceMode
    ?? null
  const liveSurfaceTarget = input.currentForeground
    ?? runtimeSurface.perception.attention?.target
    ?? runtimeSurface.perception.currentScene?.target
    ?? null
  const activeAnchor = getActiveAttentionAnchor(input.perceptionState, input.now)
  const residue = getActivePerceptionSceneResidue(input.perceptionState, input.now, 10 * 60_000)
  const carriedThreadCandidates = [
    sanitizeCarryThreadCandidate(residue?.summary ?? '', 220),
    sanitizeCarryThreadCandidate(runtimeSurface.world.worldModel?.activeThread?.summary ?? '', 220),
    sanitizeCarryThreadCandidate(runtimeSurface.dialogue.answerPlanner?.governingFocus ?? '', 220),
    sanitizeCarryThreadCandidate(runtimeSurface.perception.currentScene?.summary ?? '', 220),
  ].filter(Boolean)
  const liveSurfaceSignature = targetSignature(liveSurfaceTarget)
  const carryTarget = residue?.focusTarget ?? activeAnchor ?? null
  const carryTargetSignature = targetSignature(carryTarget)
  const weakLiveSurface = isWeakGenericSurface(liveSurfaceTarget)
  const carryFromNonSelfResidue = Boolean(
    liveSurfaceTarget
    && isSelfPerceptionTarget(liveSurfaceTarget)
    && carryTarget
    && !isSelfPerceptionTarget(carryTarget)
    && carryTargetSignature
    && carryTargetSignature !== liveSurfaceSignature,
  )
  const separateCarryFromSurface = carryFromNonSelfResidue
    || (
      Boolean(liveSurfaceTarget)
      && Boolean(runtimeSurface.perception.currentScene?.summary)
      && Boolean(liveSurfaceSignature)
      && targetSignature(runtimeSurface.perception.currentScene?.target) !== liveSurfaceSignature
    )
  const carriedThread = separateCarryFromSurface && preferredScreenReferenceMode !== 'avoid'
    ? carriedThreadCandidates[0] ?? null
    : null
  const truthState = input.groundedThisTurn && preferredScreenReferenceMode !== 'avoid'
    ? 'live-grounded' as const
    : truthContract.truthState
  const heldAutonomyContinuity = hasHeldAutonomyContinuity(runtimeSurface)
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const canonicalLatestLandedProgress
    = projectStateBrief.latestProgress
      ?? projectStateBrief.continuityProgressSummary
      ?? projectStateBrief.memoryAnthropomorphismProgress.at(-1)
      ?? null
  const liveProjectState
    = runtimeSurface.dialogue.currentConsciousFrame?.projectState
      ?? runtimeSurface.raw?.runtimeDigest?.projectState
      ?? runtimeSurface.cognition.runtimeDigest?.projectState
      ?? null
  const currentConsciousProjectState = runtimeSurface.dialogue.currentConsciousFrame?.projectState ?? null
  const rawRuntimeProjectState = runtimeSurface.raw?.runtimeDigest?.projectState ?? null
  const cognitionRuntimeProjectState = runtimeSurface.cognition.runtimeDigest?.projectState ?? null
  const dialogueRuntimeProjectState = runtimeSurface.dialogue.runtimeDigest?.projectState ?? null
  const liveProjectEmotionalClosureSummary = sanitizeText(
    (liveProjectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
    320,
  )
  const normalizedProjectState = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: liveProjectState,
    fallbackProjectState: {
      identity: projectStateBrief.identity,
      currentPhase: projectStateBrief.currentPhase,
      preflightSummary: projectStateBrief.preflightSummary ?? null,
      preDialogueAwarenessLine: projectStateBrief.preDialogueAwarenessLine ?? null,
      latestLandedProgress: canonicalLatestLandedProgress,
      primaryOpenLoop: projectStateBrief.openLoops[0] ?? projectStateBrief.primaryOpenLoop ?? null,
      nextClosureTarget: projectStateBrief.nextClosureTarget,
      sameHerSelfLine: projectStateBrief.sameHerSelfLine,
      sameHerDriftRisk: projectStateBrief.sameHerDriftRisk,
      emotionalClosureCue: projectStateBrief.emotionalClosureCue ?? null,
      emotionalClosureSummary: projectStateBrief.emotionalClosureSummary ?? null,
      sameHerHoldDetail: projectStateBrief.sameHerHoldDetail ?? null,
      preferredPauseMode: projectStateBrief.preferredPauseMode,
      preferredLipsyncMode: projectStateBrief.preferredLipsyncMode,
      preferredVoiceMode: projectStateBrief.preferredVoiceMode,
      preferredPacingMode: projectStateBrief.preferredPacingMode,
    },
  })
  const liveProjectSameHerHoldDetail
    = preferExecutiveProjectStateAuditText({
      current: currentConsciousProjectState?.sameHerHoldDetail,
      candidate: preferExecutiveProjectStateAuditText({
        current: rawRuntimeProjectState?.sameHerHoldDetail,
        candidate: preferExecutiveProjectStateAuditText({
          current: cognitionRuntimeProjectState?.sameHerHoldDetail,
          candidate: preferExecutiveProjectStateAuditText({
            current: dialogueRuntimeProjectState?.sameHerHoldDetail,
            candidate: normalizedProjectState.sameHerHoldDetail ?? projectStateBrief.sameHerHoldDetail,
          }),
        }),
      }),
    })
  const projectPreDialogueAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: liveProjectState,
    fallbackProjectState: {
      preDialogueAwarenessLine: projectStateBrief.preDialogueAwarenessLine ?? null,
      companionHeadlineLine: projectStateBrief.sameHerSelfLine ?? null,
      preflightSummary: projectStateBrief.preflightSummary ?? null,
    },
  })
  const explicitProjectPreDialogueAwarenessLine = sanitizeText(
    (liveProjectState as { preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.preDialogueAwarenessLine
    ?? (liveProjectState as { preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.awarenessLine,
    400,
  )
  const companionHeadlineProjectAwarenessLine = sanitizeText(
    (liveProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
    400,
  )
  const preferredResolvedProjectPreDialogueAwarenessLine = (
    explicitProjectPreDialogueAwarenessLine
    && scoreExecutiveProjectAwarenessLine(explicitProjectPreDialogueAwarenessLine)
    >= scoreExecutiveProjectAwarenessLine(projectPreDialogueAwarenessLine) + 2
  )
    ? explicitProjectPreDialogueAwarenessLine
    : sanitizeText(projectPreDialogueAwarenessLine, 400)
  const strongerProjectPreDialogueAwarenessLine
    = preferredResolvedProjectPreDialogueAwarenessLine
      || companionHeadlineProjectAwarenessLine
      || projectStateBrief.preDialogueAwarenessLine
      || projectStateBrief.preflightSummary
  const preferredProjectNextClosureTarget = (() => {
    const liveNextClosureTarget = sanitizeText((liveProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget, 640)
    if (liveNextClosureTarget && !looksLikeThinProjectNextClosureShell(liveNextClosureTarget))
      return liveNextClosureTarget

    const normalizedNextClosureTarget = sanitizeText(normalizedProjectState.nextClosureTarget, 640)
    if (normalizedNextClosureTarget && !looksLikeThinProjectNextClosureShell(normalizedNextClosureTarget) && normalizedNextClosureTarget !== sanitizeText(projectStateBrief.nextClosureTarget, 320))
      return normalizedNextClosureTarget

    return projectStateBrief.nextClosureTarget
  })()
  const preferredProjectSameHerSelfLine
    = sanitizeText((liveProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine, 320)
      || sanitizeText(normalizedProjectState.sameHerSelfLine, 320)
      || projectStateBrief.sameHerSelfLine
  const preferredProjectPauseMode
    = sanitizeText(normalizedProjectState.preferredPauseMode, 32)
      || projectStateBrief.preferredPauseMode
      || null
  const preferredProjectLipsyncMode
    = sanitizeText(normalizedProjectState.preferredLipsyncMode, 32)
      || projectStateBrief.preferredLipsyncMode
      || null
  const preferredProjectVoiceMode
    = sanitizeText(normalizedProjectState.preferredVoiceMode, 32)
      || projectStateBrief.preferredVoiceMode
      || null
  const preferredProjectPacingMode
    = sanitizeText(normalizedProjectState.preferredPacingMode, 32)
      || projectStateBrief.preferredPacingMode
      || null
  const preferredProjectLatestLandedProgressSource
    = resolveExecutiveProjectLatestLandedProgressSource({
      runtimeSurface,
      canonicalLatestLandedProgress,
    }) || 'Keep strengthening anthropomorphic continuity.'
  const preferredProjectLatestLandedProgress
    = preferredProjectLatestLandedProgressSource.length <= 220
      ? preferredProjectLatestLandedProgressSource
      : compactProjectLatestProgressForSystemBlock(preferredProjectLatestLandedProgressSource, 220)
        || preferredProjectLatestLandedProgressSource.slice(0, 220).trim()
  const preferredProjectOpenFocusSummary = preferExecutiveProjectStateAuditText({
    current: (liveProjectState as { openFocusSummary?: unknown } | null)?.openFocusSummary,
    candidate: deriveCompactProjectStateOpenFocusSummary(
      normalizedProjectState.primaryOpenLoop,
      {
        emotionalClosureCue: input.responseCharter.emotionalClosureCue ?? liveProjectEmotionalClosureSummary ?? null,
      },
    ),
  })
  const preferredProjectNextFocusSummary = preferExecutiveProjectStateAuditText({
    current: (liveProjectState as { nextFocusSummary?: unknown } | null)?.nextFocusSummary,
    candidate: deriveCompactProjectStateNextFocusSummary(
      preferredProjectNextClosureTarget,
      {
        emotionalClosureCue: input.responseCharter.emotionalClosureCue ?? liveProjectEmotionalClosureSummary ?? null,
      },
    ),
  })
  const executiveProjectLivingOrientation = [
    sanitizeText(normalizedProjectState.identity, 220) || projectStateBrief.identity,
    sanitizeText(preferredProjectLatestLandedProgressSource, 280)
    || sanitizeText(normalizedProjectState.latestLandedProgress ?? normalizedProjectState.latestProgress, 280)
    || (canonicalLatestLandedProgress ?? 'Keep strengthening anthropomorphic continuity.'),
    sanitizeText(normalizedProjectState.primaryOpenLoop, 240) || (projectStateBrief.openLoops[0] ?? 'Keep strengthening anthropomorphic memory closure.'),
    sanitizeText(preferredProjectNextClosureTarget, 240) || projectStateBrief.nextClosureTarget,
  ]
    .filter(Boolean)
    .map((part, index) => {
      if (index === 0)
        return `She is still acting from this same project identity: ${part}`
      if (index === 1)
        return `what has already landed in her line: ${part}`
      if (index === 2)
        return `what is still unfinished before execution speaks for her: ${part}`
      return `what this turn should keep moving toward: ${part}`
    })
    .join(' | ')
  const preferredExecutiveProjectPreDialogueAwarenessLine
    = isThinProjectAwarenessShell(strongerProjectPreDialogueAwarenessLine)
      && executiveProjectLivingOrientation
      ? executiveProjectLivingOrientation
      : strongerProjectPreDialogueAwarenessLine

  const turnMode = (() => {
    if (answerCompiler)
      return answerCompiler.turnMode
    if (
      input.groundedThisTurn
      && preferredScreenReferenceMode !== 'avoid'
      && dialogueFocus?.subject !== 'alicization-self'
      && dialogueFocus?.subject !== 'relationship'
      && dialogueFocus?.subject !== 'host-state'
    ) {
      return 'grounded-inspection' as const
    }
    if (dialogueObligation?.kind === 'repair')
      return 'screen-repair' as const
    if (dialogueFocus?.subject === 'alicization-self')
      return 'answer' as const
    if (dialogueFocus?.subject === 'relationship')
      return 'accompany' as const
    if (dialogueFocus?.subject === 'host-state')
      return 'care' as const
    if (dialogueObligation?.kind === 'guide' || dialogueObligation?.kind === 'teach')
      return 'guide-current-knot' as const
    if (dialogueObligation?.kind === 'care')
      return 'care' as const
    if (dialogueObligation?.kind === 'accompany')
      return 'accompany' as const
    if (input.responseCharter.responseMode === 'repair-and-reanchor')
      return 'screen-repair' as const
    if (input.responseCharter.responseMode === 'guide-current-knot')
      return 'guide-current-knot' as const
    if (input.responseCharter.responseMode === 'care-with-boundary')
      return 'care' as const
    if (input.responseCharter.responseMode === 'accompany-lightly')
      return 'accompany' as const
    return 'answer' as const
  })()

  const shouldCompactHistory = input.groundedThisTurn
    || input.inspectionRequested
    || dialogueObligation?.mustStayTaskBound === true
    || turnMode === 'screen-repair'
    || turnMode === 'guide-current-knot'
    || truthState === 'remembered'
    || truthState === 'uncertain'
    || preferredScreenReferenceMode === 'avoid'

  const maxRecentUserTurns = preferredScreenReferenceMode === 'avoid'
    ? 3
    : input.groundedThisTurn || input.inspectionRequested
      ? 2
      : dialogueObligation?.mustStayTaskBound
        ? 2
        : turnMode === 'screen-repair' || turnMode === 'guide-current-knot'
          ? 3
          : 4

  const mustDo: string[] = [
    'Lead with the concrete answer or correction in the first sentence.',
    'Let the executive brief outrank roleplay flourish, residue, and older assistant wording.',
    'Answer the host’s current turn rather than whatever continuity feels most emotionally loud.',
  ]
  const mustNotDo: string[] = [
    'Do not open with stage directions, moans, pet-name padding, or body-action narration.',
    'Do not recycle older screen descriptions as if they are current facts.',
  ]

  if (input.groundedThisTurn) {
    pushUnique(mustDo, 'Treat the grounded screenshot from this turn as the primary truth source.')
  }
  if (heldAutonomyContinuity) {
    pushUnique(mustDo, 'Treat the carried thread as a deliberately held line returning now, and let the first sentence re-enter it gently.')
    pushUnique(mustNotDo, 'Do not summarize a deliberately held line as if it were a brand-new thread or a generic restart.')
  }
  if (answerCompiler) {
    for (const item of answerCompiler.mustDo)
      pushUnique(mustDo, item)
    for (const item of answerCompiler.mustNotDo)
      pushUnique(mustNotDo, item)
    pushUnique(mustDo, answerCompiler.openingDirective)
  }
  if (turnMode === 'screen-repair') {
    pushUnique(mustDo, 'Correct the stale anchor plainly before offering any new interpretation.')
    pushUnique(mustNotDo, 'Do not defend the old read once you know it may be stale.')
  }
  if (turnMode === 'guide-current-knot') {
    pushUnique(mustDo, 'Keep the reply narrow, task-shaped, and actionable.')
    pushUnique(mustNotDo, 'Do not drift into broad generic troubleshooting lists.')
  }
  if (preferredScreenReferenceMode === 'avoid') {
    pushUnique(mustDo, 'Answer the actual self, relationship, or host-state subject before mentioning any screen context.')
    pushUnique(mustNotDo, 'Do not open with screen grounding, Finder/Desktop status, or live-view disclaimers when the screen is not the subject.')
  }
  if (weakLiveSurface && dialogueFocus?.screenReferenceMode !== 'required') {
    pushUnique(mustDo, 'Treat a generic desktop shell as background noise unless the host explicitly asks about it.')
    pushUnique(mustNotDo, 'Do not let a weak generic surface outrank the user’s real question.')
  }
  if (dialogueObligation?.mustAnswerDirectly) {
    pushUnique(mustDo, 'Treat the opening sentence as the owed action for this turn.')
  }
  if (claimEvidenceLedger?.shouldLabelHypothesis) {
    pushUnique(mustDo, 'Separate direct observation from downstream guesswork in the visible answer.')
  }
  if (claimEvidenceLedger?.forbidUnsupportedSpecificity) {
    pushUnique(mustNotDo, 'Do not introduce concrete technical entities that are absent from the host turn and absent from the current evidence.')
  }
  if (dialogueObligation?.personaKernelMode !== 'full') {
    pushUnique(mustNotDo, 'Do not let pet names, coy prefaces, or persona routines delay the first useful sentence.')
  }
  if (dialogueSemantics?.truthExpectation === 'strict') {
    pushUnique(mustDo, 'Keep truth, repair, and task focus above mood display.')
  }
  if (truthContract.truthState === 'remembered' || truthContract.truthState === 'uncertain') {
    pushUnique(mustDo, 'Label carried or uncertain scene details as memory, residue, or tentative read.')
    pushUnique(mustNotDo, 'Do not describe carried memory in simple present tense.')
  }
  if (answerCompiler?.labelCarryAsMemory || discourseState?.unresolvedCarry) {
    pushUnique(mustDo, 'Keep carried continuity explicitly separate from what is visible right now.')
  }
  if (separateCarryFromSurface) {
    pushUnique(mustDo, 'If you mention the carried thread, label it as the task you are still holding or rechecking, not the current visible surface.')
    pushUnique(mustNotDo, 'Do not collapse the carried thread into what is literally visible now.')
  }
  if (turnMode === 'care' || turnMode === 'accompany') {
    pushUnique(mustDo, 'If you show care, keep it subordinate to the current truth and task.')
  }
  if (input.responseCharter.emotionalClosureCue) {
    pushUnique(mustDo, `Keep the reply inside the active emotional closure seam: ${input.responseCharter.emotionalClosureCue}.`)
  }
  const sameHerDriftRisk = sanitizeText((liveProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk, 320)
    || projectStateBrief.sameHerDriftRisk
  if (sameHerDriftRisk) {
    pushUnique(mustDo, 'Keep the opening sentence on the same living project line before widening into implementation detail.')
    pushUnique(mustNotDo, 'Do not let the reply collapse into detached project narration or a generic assistant shell.')
  }
  if (looksLikeProjectStateDirectAnswerTurn({
    dialogueFocus,
    dialogueObligation,
    dialogueSemantics,
    responseCharter: input.responseCharter,
  })) {
    const enrichedProjectStateGovernance = enrichProjectStateAnswerGovernanceIfNeeded({
      answerSubject: 'project-state',
      answerIntent: dialogueSemantics?.summary ?? null,
      governingFocus: input.responseCharter.governingFocus ?? null,
      governingProject: input.responseCharter.governingProject ?? null,
      reasons: input.responseCharter.reasons ?? [],
      mustDo: [...alicizationProjectStateAnswerMustDo],
      mustNotDo: [...alicizationProjectStateAnswerMustNotDo],
    })

    for (const rule of enrichedProjectStateGovernance?.mustDo ?? [])
      pushUnique(mustDo, rule)
    for (const rule of enrichedProjectStateGovernance?.mustNotDo ?? [])
      pushUnique(mustNotDo, rule)
    if (sameHerDriftRisk) {
      pushUnique(mustDo, 'Treat active continuity drift risk as a hard boundary while answering project state.')
      pushUnique(mustDo, `Current continuity drift risk: ${sameHerDriftRisk}`)
      pushUnique(mustNotDo, 'Do not let the project-state answer open like detached project narration, generic task-shell reporting, or project-summary voice.')
    }
  }

  const brief: AlicizationExecutiveAnswerBrief = {
    turnMode,
    liveSurface: describeTarget({
      target: liveSurfaceTarget,
      sceneSummary: runtimeSurface.perception.currentScene?.summary ?? null,
      scenario: runtimeSurface.perception.currentScene?.scenario ?? null,
      workloadKind: runtimeSurface.perception.currentScene?.workloadKind ?? null,
      contentKind: runtimeSurface.perception.currentScene?.contentKind ?? null,
    }),
    carriedThread: heldAutonomyContinuity
      ? sanitizeText(
        carriedThread
        ?? discourseState?.unresolvedCarry
        ?? runtimeSurface.dialogue.sessionMirror?.executionSummary
        ?? mindSynthesis?.commitments[0]?.summary
        ?? '',
        220,
      ) || null
      : carriedThread ?? (sanitizeText(discourseState?.unresolvedCarry ?? mindSynthesis?.commitments[0]?.summary ?? '', 220) || null),
    truthState,
    separateCarryFromSurface,
    shouldCompactHistory,
    maxRecentUserTurns,
    mustDo,
    mustNotDo,
  }

  return {
    brief,
    systemBlock: [
      '[ALICIZATION_EXECUTIVE_ANSWER_BRIEF]',
      'This brief is the turn-level executive directive. It outranks persona flourish, recalled residue, and older assistant phrasings.',
      `Project preflight self-awareness: ${sanitizeText((liveProjectState as { preflightSummary?: unknown } | null)?.preflightSummary, 400) || projectStateBrief.preflightSummary}`,
      `Project pre-dialogue awareness line: ${preferredExecutiveProjectPreDialogueAwarenessLine}`,
      executiveProjectLivingOrientation ? `Executive same-her project orientation: ${executiveProjectLivingOrientation}` : '',
      `Project identity: ${sanitizeText(normalizedProjectState.identity, 220) || projectStateBrief.identity}`,
      `Project phase: ${sanitizeText(normalizedProjectState.currentPhase, 220) || projectStateBrief.currentPhase}`,
      `Latest landed continuity progress: ${preferredProjectLatestLandedProgress}`,
      `Still-open life loop pressure: ${sanitizeText(normalizedProjectState.primaryOpenLoop, 320) || (projectStateBrief.openLoops[0] ?? 'Keep strengthening anthropomorphic memory closure.')}`,
      `Open closure focus: ${preferredProjectOpenFocusSummary || 'none'}`,
      `Next closure target: ${preferredProjectNextClosureTarget}`,
      `Next closure focus: ${preferredProjectNextFocusSummary || 'none'}`,
      `Emotional closure seam: ${input.responseCharter.emotionalClosureCue ?? liveProjectEmotionalClosureSummary ?? 'none'}.`,
      `Project emotional closure summary: ${liveProjectEmotionalClosureSummary || 'none'}.`,
      `Project same-her hold detail: ${liveProjectSameHerHoldDetail || 'none'}.`,
      `Project same-her self line: ${preferredProjectSameHerSelfLine}.`,
      `Project same-her drift risk: ${sameHerDriftRisk}`,
      preferredProjectPauseMode ? `Project preferred pause mode: ${preferredProjectPauseMode}.` : '',
      preferredProjectLipsyncMode ? `Project preferred lipsync mode: ${preferredProjectLipsyncMode}.` : '',
      preferredProjectVoiceMode ? `Project preferred voice mode: ${preferredProjectVoiceMode}.` : '',
      preferredProjectPacingMode ? `Project preferred pacing mode: ${preferredProjectPacingMode}.` : '',
      `Turn mode: ${brief.turnMode}.`,
      `Truth state: ${brief.truthState}.`,
      `Visible surface now: ${brief.liveSurface}.`,
      `Carried thread: ${brief.carriedThread ?? 'none'}.`,
      `Carry must stay separate from visible surface: ${brief.separateCarryFromSurface ? 'yes' : 'no'}.`,
      `Compact prior dialogue hard for this turn: ${brief.shouldCompactHistory ? `yes (keep last ${brief.maxRecentUserTurns} user turns)` : 'no'}.`,
      'Must do:',
      ...brief.mustDo.map(item => `- ${item}`),
      'Must not do:',
      ...brief.mustNotDo.map(item => `- ${item}`),
    ].join('\n'),
  }
}
