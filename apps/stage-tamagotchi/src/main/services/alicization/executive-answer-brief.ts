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

import {
  buildAlicizationScreenSurfaceCue,
  formatAlicizationProjectStateAwarenessFields,
  isWeakAlicizationScreenSurfaceCue,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

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

function sanitizeExecutiveProviderText(raw: unknown, maxChars = 360) {
  return sanitizeAlicizationProviderFacingText(raw, maxChars, '')
}

function sanitizeExecutiveProjectFactValue(raw: unknown, maxChars = 360) {
  const sanitized = sanitizeExecutiveProviderText(raw, maxChars)
  if (!sanitized)
    return ''

  return sanitized
    .replace(/\bsame[-\s]her\b/giu, 'continuity_identity')
    .replace(/\bone continuous "?her"?\b/giu, 'project_state_review')
    .replace(/同一个\s*her/giu, 'continuity_identity')
    .replace(/同一个她/gu, 'continuity_identity')
    .replace(/\bsame\s+living\s+line\b/giu, 'continuity_line')
    .replace(/\bliving line\b/giu, 'continuity_line')
}

function looksProviderFacingStructuredControl(value: string) {
  return /^[\w.:-]+=[^.!?。！？]*?(?:[;|,]\s*[\w.:-]+=[^.!?。！？]*?)*$/iu.test(value.trim())
    || /^[\w.:-]+$/iu.test(value.trim())
}

function normalizeKnownExecutiveStructuredControl(raw: string) {
  if (raw === 'local_main_contains_work_not_equal_origin_main_safe_to_push; local_merge_not_equal_origin_main_safe_to_push')
    return 'local_main_contains_work_not_equal_origin_main_safe_to_push=true; local_merge_not_equal_origin_main_safe_to_push=true'
  return raw
}

function renderExecutiveProviderControl(raw: unknown) {
  const normalized = sanitizeText(raw, 360)
  if (!normalized)
    return ''
  const knownStructured = normalizeKnownExecutiveStructuredControl(normalized)
  if (looksProviderFacingStructuredControl(knownStructured))
    return `- ${knownStructured}`
  return '- executive_control_present=true; executive_control_source_text=withheld_non_structured_instruction'
}

function structuredExecutiveControlFromNaturalLanguage(raw: unknown, section: 'must_do' | 'must_not_do') {
  const text = sanitizeText(raw, 720)
  const normalized = text.toLowerCase()
  if (!normalized)
    return null

  const controls: string[] = []
  const push = (control: string) => {
    if (!controls.includes(control))
      controls.push(control)
  }

  if (/first sentence|opening sentence|concrete answer|owed action|current turn/u.test(normalized))
    push('first_sentence=current_turn_payoff')
  if (/executive brief outrank|roleplay flourish|older assistant wording|residue/u.test(normalized))
    push('executive_brief_priority=above_persona_residue')
  if (/stage directions|moans|pet-name|body-action|persona routines|coy prefaces/u.test(normalized))
    push('stage_direction_persona_padding=blocked')
  if (/older screen descriptions|screen grounding|finder\/desktop|live-view|generic desktop shell|weak generic surface/u.test(normalized))
    push('stale_or_weak_visual_surface=background_only')
  if (/grounded screenshot|primary truth source|current evidence|direct observation/u.test(normalized))
    push('evidence_priority=current_grounded_state')
  if (/held line|deliberately held|carried thread|brand-new thread|generic restart/u.test(normalized))
    push('held_autonomy_reentry=gentle; fresh_restart=blocked')
  if (/stale anchor|old read/u.test(normalized))
    push('stale_anchor_repair=plain_before_new_interpretation')
  if (/narrow|task-shaped|actionable|broad generic troubleshooting/u.test(normalized))
    push('task_answer_shape=narrow_actionable')
  if (/self, relationship, or host-state|screen context/u.test(normalized))
    push('non_screen_subject=answer_before_screen_context')
  if (/observation.*guesswork|hypothesis|tentative read/u.test(normalized))
    push('observation_hypothesis_separation=visible')
  if (/concrete technical entities|absent from the host turn|current evidence/u.test(normalized))
    push('unsupported_specificity=blocked')
  if (/truth, repair, and task focus|mood display/u.test(normalized))
    push('truth_repair_task_focus=above_mood_display')
  if (/carried|memory|residue|visible right now|present tense|current visible surface/u.test(normalized))
    push('carried_context_separate_from_current_surface=true')
  if (/care|current truth and task/u.test(normalized))
    push('care_expression=subordinate_to_truth_and_task')
  if (/emotional closure seam/u.test(normalized))
    push('emotional_closure_context=active')
  if (/one continuous her line|same thread|fresh opening|restarting the relationship|reintroduction/u.test(normalized))
    push('same_thread_reentry=preserve; fresh_opening=blocked')
  if (/callback|repair-before-closeness|repair settles|widening closeness|widen closeness/u.test(normalized))
    push('callback_repair_first=preserve; closeness_widening=deferred')
  if (/projectstategovernance|workingmemory|longtermmemoryrecall/u.test(normalized))
    push('memory_owner_boundary=preserve; project_state_owner=ProjectStateGovernance')
  if (/detached project narration|generic assistant shell|project-summary voice|generic task-shell/u.test(normalized))
    push('Avoid detached project-summary narration.')
  if (/active continuity drift risk|continuity drift risk/u.test(normalized))
    push('template_residue_risk=hard_boundary')
  if (/answer what alicization is|project identity|project-state answer|project status/u.test(normalized))
    push('Answer the current project-state question directly before broader framing.')
  if (/landed phase 1 progress|latest landed|landed progress/u.test(normalized))
    push('latest_landed_progress=explicit')
  if (/still-open closure|open closure|still remains open/u.test(normalized))
    push('still_open_closure_work=explicit')
  if (/next closure target|next closure/u.test(normalized))
    push('next_closure_target=explicit')
  if (/merge-readiness|merge ready|local main|origin\/main|goal closure|goal completion|full closure/u.test(normalized))
    push('merge_or_closure_claim=requires_current_evidence')

  if (controls.length === 0)
    return null
  return `Executive ${section} controls: ${controls.join(' ')}`
}

function normalizeExecutiveControlList(values: readonly string[], section: 'must_do' | 'must_not_do') {
  const normalized: string[] = []
  let withheldCount = 0
  for (const value of values) {
    const structuredFromText = structuredExecutiveControlFromNaturalLanguage(value, section)
    if (structuredFromText) {
      if (!normalized.includes(structuredFromText))
        normalized.push(structuredFromText)
      continue
    }
    const sanitized = sanitizeText(value, 360)
    if (!sanitized)
      continue
    const knownStructured = normalizeKnownExecutiveStructuredControl(sanitized)
    if (looksProviderFacingStructuredControl(knownStructured)) {
      if (!normalized.includes(knownStructured))
        normalized.push(knownStructured)
      continue
    }
    withheldCount += 1
  }

  if (withheldCount > 0) {
    const diagnostic = `Executive ${section} controls withheld ${withheldCount} non-structured instruction(s).`
    if (!normalized.includes(diagnostic))
      normalized.push(diagnostic)
  }

  return normalized
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
  if (/same\s+living\s+line|one\s+living\s+her|full cross-modal closure|voice, face, and motion/u.test(text))
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
  const executiveProjectLivingOrientationControls = [
    'Answer the current project-state question directly before broader framing.',
    'latest_landed_progress=explicit',
    'still_open_closure_work=explicit',
    'next_closure_target=explicit',
    'template_residue_risk=hard_boundary',
    'memory_owner_boundary=preserve; project_state_owner=ProjectStateGovernance',
  ]
    .join(' | ')
  const preferredExecutiveProjectPreDialogueAwarenessLine
    = isThinProjectAwarenessShell(strongerProjectPreDialogueAwarenessLine)
      ? executiveProjectLivingOrientationControls
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
    pushUnique(mustNotDo, 'weak_generic_surface_outranks_user_question=blocked')
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
    pushUnique(mustNotDo, 'pet_names_coy_prefaces_persona_routines_delay_first_useful_sentence=blocked')
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
  const sameHerDriftRisk = sanitizeExecutiveProviderText((liveProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk, 320)
    || sanitizeExecutiveProviderText(projectStateBrief.sameHerDriftRisk, 320)
  const isProjectStateDirectAnswerTurn = looksLikeProjectStateDirectAnswerTurn({
    dialogueFocus,
    dialogueObligation,
    dialogueSemantics,
    responseCharter: input.responseCharter,
  })
  if (sameHerDriftRisk && isProjectStateDirectAnswerTurn) {
    pushUnique(mustDo, 'Answer from ProjectStateGovernance facts without replacing WorkingMemory or LongTermMemoryRecall.')
    pushUnique(mustNotDo, 'detached_project_narration_or_generic_assistant_shell=blocked')
  }
  if (isProjectStateDirectAnswerTurn) {
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
      pushUnique(mustNotDo, 'project_state_answer_opening=direct; detached_project_narration=blocked; generic_task_shell=blocked; project_summary_voice=blocked')
    }
  }

  const normalizedMustDo = normalizeExecutiveControlList(mustDo, 'must_do')
  const normalizedMustNotDo = normalizeExecutiveControlList(mustNotDo, 'must_not_do')

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
    mustDo: normalizedMustDo,
    mustNotDo: normalizedMustNotDo,
  }

  const projectStateSystemLines = isProjectStateDirectAnswerTurn
    ? [
        '[ALICIZATION_EXECUTIVE_PROJECT_STATE_FACTS]',
        'owner=ProjectStateGovernance',
        formatAlicizationProjectStateAwarenessFields({
          identity: normalizedProjectState.identity || projectStateBrief.identity,
          currentPhase: normalizedProjectState.currentPhase || projectStateBrief.currentPhase,
          latestLandedProgress: preferredProjectLatestLandedProgress,
          primaryOpenLoop: normalizedProjectState.primaryOpenLoop || projectStateBrief.openLoops[0] || projectStateBrief.primaryOpenLoop,
          nextClosureTarget: preferredProjectNextClosureTarget,
          continuityAnchor: preferredProjectSameHerSelfLine,
          sameHerHoldDetail: liveProjectSameHerHoldDetail || null,
          continuityDriftRisk: sameHerDriftRisk,
          emotionalClosureCue: input.responseCharter.emotionalClosureCue ?? liveProjectEmotionalClosureSummary ?? null,
          status: (liveProjectState as { preflightSummary?: unknown } | null)?.preflightSummary ?? projectStateBrief.preflightSummary,
          summary: preferredExecutiveProjectPreDialogueAwarenessLine,
          visibility: 'internal-structured',
          maxChars: 1200,
        }),
        '[ALICIZATION_EXECUTIVE_PROJECT_LIVING_ORIENTATION]',
        'owner=ProjectStateGovernance',
        'short_term_owner=WorkingMemory',
        'long_term_recall_owner=LongTermMemoryRecall',
        'visible_governance_entry=MemoryWorkbench',
        'template_policy=no_fixed_persona_templates',
        'orientation_scope=governance_only',
        executiveProjectLivingOrientationControls,
        `preflight_summary=${sanitizeExecutiveProjectFactValue((liveProjectState as { preflightSummary?: unknown } | null)?.preflightSummary, 400) || sanitizeExecutiveProjectFactValue(projectStateBrief.preflightSummary, 400) || 'none'}`,
        `awareness_summary=${sanitizeExecutiveProjectFactValue(preferredExecutiveProjectPreDialogueAwarenessLine, 800) || 'none'}`,
        `latest_landed_progress=${sanitizeExecutiveProjectFactValue(preferredProjectLatestLandedProgress, 360) || 'none'}`,
        `primary_open_loop=${sanitizeExecutiveProjectFactValue(normalizedProjectState.primaryOpenLoop, 360) || sanitizeExecutiveProjectFactValue(projectStateBrief.openLoops[0], 360) || sanitizeExecutiveProjectFactValue(projectStateBrief.primaryOpenLoop, 360) || 'none'}`,
        `open_focus=${preferredProjectOpenFocusSummary || 'none'}`,
        `next_closure_target=${sanitizeExecutiveProjectFactValue(preferredProjectNextClosureTarget, 360) || 'none'}`,
        `next_focus=${preferredProjectNextFocusSummary || 'none'}`,
        `emotional_closure_seam=${sanitizeExecutiveProjectFactValue(input.responseCharter.emotionalClosureCue ?? liveProjectEmotionalClosureSummary, 360) || 'none'}`,
        `emotional_closure_summary=${sanitizeExecutiveProjectFactValue(liveProjectEmotionalClosureSummary, 360) || 'none'}`,
        `cadence_detail=${sanitizeExecutiveProjectFactValue(liveProjectSameHerHoldDetail, 360) || 'none'}`,
        `project_anchor=${sanitizeExecutiveProjectFactValue(preferredProjectSameHerSelfLine, 360) || 'none'}`,
        `template_residue_risk=${sameHerDriftRisk || 'none'}`,
        preferredProjectPauseMode ? `preferred_pause_mode=${preferredProjectPauseMode}` : '',
        preferredProjectLipsyncMode ? `preferred_lipsync_mode=${preferredProjectLipsyncMode}` : '',
        preferredProjectVoiceMode ? `preferred_voice_mode=${preferredProjectVoiceMode}` : '',
        preferredProjectPacingMode ? `preferred_pacing_mode=${preferredProjectPacingMode}` : '',
      ]
    : [
        'project_state_visibility=governance_only',
        'short_term_owner=WorkingMemory',
        'long_term_recall_owner=LongTermMemoryRecall',
      ]

  return {
    brief,
    systemBlock: [
      '[ALICIZATION_EXECUTIVE_ANSWER_BRIEF]',
      'brief_role=turn_level_executive_directive; outranks=persona_flourish,recalled_residue,older_assistant_phrasings',
      ...projectStateSystemLines,
      `turn_mode=${brief.turnMode}`,
      `truth_state=${brief.truthState}`,
      `visible_surface=${brief.liveSurface}`,
      `carried_thread=${brief.carriedThread ?? 'none'}`,
      `carry_visible_surface_separation=${brief.separateCarryFromSurface ? 'yes' : 'no'}`,
      `prior_dialogue_compaction=${brief.shouldCompactHistory ? 'yes' : 'no'}; max_recent_user_turns=${brief.maxRecentUserTurns}`,
      'control_section=must_do',
      ...brief.mustDo.map(renderExecutiveProviderControl).filter(Boolean),
      'control_section=must_not_do',
      ...brief.mustNotDo.map(renderExecutiveProviderControl).filter(Boolean),
    ].join('\n'),
  }
}
