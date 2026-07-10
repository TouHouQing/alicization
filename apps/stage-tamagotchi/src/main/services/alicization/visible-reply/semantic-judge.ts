import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'

import {
  containsAlicizationFixedTemplateResidue,
} from '@proj-alicization/stage-shared'

import {
  resolvePreferredPreparedRuntimeSurface,
  resolvePreparedRuntimeProjectState,
  resolvePreparedRuntimeProjectStateSnapshot,
  resolvePreparedRuntimeSelfContinuityAuthority,
} from '../prepared-runtime-continuity'
import { replyUsesSameThreadRestartShell, resolveAlicizationOpeningGuidanceViolationReason } from '../proactive-opening-guidance'
import {
  alicizationProjectStateVisibleReplyNextClosureReminder,
  alicizationProjectStateVisibleReplyOpenClosureReminder,
  alicizationProjectStateVisibleReplySameHerReminder,
} from '../project-state-answer-governance'
import {
  resolveAlicizationProjectStateSnapshot,
} from '../project-state-brief'
import { scoreVisibleReplyProjectAwarenessLine } from './project-awareness'

export interface AlicizationVisibleReplySemanticJudgeArtifact {
  version: 'visible-reply-semantic-judge-v1'
  mode: 'llm-structured' | 'heuristic-shadow'
  scores: {
    humanlikeQuality: number
    currentTurnPayoff: number
    memoryUseCorrectness: number
    emotionalCoherence: number
    personalityCoherence: number
    specificityDiscipline: number
  }
  passed: boolean
  reasonCodes: string[]
  judgeReason: string | null
  debug?: {
    projectState?: {
      hostAskedProjectIdentity: boolean
      hostAskedProgressOrOpenLoop: boolean
      runtimeHasSameHerEvidence: boolean
      runtimeRequiresExplicitSameHer: boolean
      projectStateIdentityMissing: boolean
      projectStatePhaseMissing: boolean
      projectStateProgressMissing: boolean
      projectStateOpenLoopMissing: boolean
      projectStateNextClosureMissing: boolean
      depersonalizedProjectShell: boolean
      projectStateNarratorShell: boolean
      identityMentionsProjectState: boolean
      phaseMentionsProjectState: boolean
      progressMentionsProjectState: boolean
      openLoopMentionsProjectState: boolean
      nextClosureMentionsProjectState: boolean
      identityAskNaturalProjectStatusAnswer: boolean
      identityAskSameHerSatisfied: boolean
      progressOnlyMandatorySameHerSatisfied: boolean
      projectStateSameHerMissing: boolean
      projectStatePreDialogueAwarenessMissing: boolean
      emotionalClosureRequired: boolean
      emotionalClosureMissing: boolean
    }
  }
}

export interface AlicizationVisibleReplySemanticJudgeStructuredInput {
  humanlikeQuality?: unknown
  currentTurnPayoff?: unknown
  memoryUseCorrectness?: unknown
  emotionalCoherence?: unknown
  personalityCoherence?: unknown
  specificityDiscipline?: unknown
  reasonCodes?: unknown
  judgeReason?: unknown
}

function clamp01(raw: unknown, fallback = 0) {
  const value = typeof raw === 'number' && Number.isFinite(raw)
    ? raw
    : fallback
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function normalizeText(raw: unknown, maxChars = 260) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
    : ''
}

function uniqueReasonCodes(values: unknown[], maxItems = 16) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeText(value, 140)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function readMessageContentAsText(content: unknown) {
  if (typeof content === 'string')
    return content
  if (!Array.isArray(content))
    return ''

  return content.map((part) => {
    if (typeof part === 'string')
      return part
    if (part && typeof part === 'object' && 'text' in part)
      return normalizeText((part as { text?: unknown }).text, 1_000)
    return ''
  }).filter(Boolean).join('\n')
}

function readLatestUserMessageText(prepared?: AlicizationPreparedMainChatExecutionResult | null) {
  const messages = Array.isArray(prepared?.messages)
    ? prepared.messages
    : []
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'user')
      continue
    return normalizeText(readMessageContentAsText(message.content), 400)
  }
  return ''
}

function normalizeSemanticText(raw: string) {
  return normalizeText(raw, 2_000).toLowerCase()
}

function looksLikeFixedProjectContinuityTemplate(text: string) {
  const normalized = normalizeSemanticText(text)
  if (!normalized || !containsAlicizationFixedTemplateResidue(text))
    return false

  return /before (?:answering|speaking|acting)|same phase 1 digital life|same living line|one continuous her|same-her|same her|local-first digital life project|同一个她|同一个 her|数字生命主线/iu.test(normalized)
}

function resolveProjectStateVisibleEvidenceText(text: string) {
  return looksLikeFixedProjectContinuityTemplate(text) ? '' : text
}

function carriesStructuredProjectStateContinuity(text: string) {
  return /\b(?:phase1_local_digital_life|continuity_anchor=|project_state_continuity|cross_modal_continuity_proof|life_loop_continuity|runtime_authoritative_send_alignment|memory_dialogue_embodiment|identity\+landed\+open\+next|visibility=internal-structured)\b/iu.test(text)
}

function carriesStructuredSameHerRequirement(text: string) {
  return carriesStructuredProjectStateContinuity(text)
    || /\b(?:self_continuity=durable|continuity_line=structured_carry|relationship_line=structured_carry|continuity_scope=detected|restart_policy=context_preserving)\b/iu.test(text)
}

function analyzeProjectStateAnswerDemand(latestUserText: string) {
  const normalized = normalizeSemanticText(latestUserText)
  if (!normalized) {
    return {
      identity: false,
      progress: false,
      openLoop: false,
    }
  }

  const followThroughOnlyProjectReference = /继续|沿着.*同一条线|同一条线|别弄丢|不要重开|接着说|carry on|continue|follow-through|same line|same thread|do not reopen/iu.test(normalized)
    && /这个数字生命项目|该数字生命项目|数字生命项目|same digital life project/iu.test(normalized)
    && !/是什么|做什么|干什么|what(?:'s| is)|what the project is/iu.test(normalized)
  const directProjectIdentityAsk = /(?:这个项目|该项目|项目本身|这个数字生命项目|该数字生命项目|数字生命项目|project).{0,24}(?:是什么|做什么|干什么)|what(?:'s| is).{0,24}(?:this project|the project)|what the project is/iu.test(normalized)
  const progressOrOpenLoopOnlyProjectQuestion = followThroughOnlyProjectReference
    && /(?:这个数字生命项目|该数字生命项目|数字生命项目|this project|the project).{0,24}(?:现在还差什么|还差什么|缺什么|做到什么程度|做到哪|进度|进展|what remains|what is missing|still open|open loop|progress|how far)/iu.test(normalized)
  const asksMergeReadiness
    = /(?:可以|能不能|现在可以|已经可以|can we|is (?:it|this)|ready to|merge-ready).{0,40}(?:合并到\s*main|merge(?:\s+this)?\s+to\s+main|ready to merge)|(?:合并到\s*main|merge(?:\s+this)?\s+to\s+main|ready to merge).{0,24}(?:了吗|吗|now|already|ready|可以|能不能)|(?:已经在|已在|already (?:landed|on)|already contains|already on).{0,32}(?:本地\s*main|local\s+main)|(?:本地\s*main|local\s+main).{0,32}(?:已经|已|already).{0,24}(?:包含|落地|landed|contains|on)|origin\/main.{0,32}(?:安全|safe|update|push|推)|(?:安全|safe).{0,16}(?:推到|push to|update).{0,24}origin\/main|(?:会把|会不会把|without carrying|carry).{0,48}(?:别的提交|unrelated commits|other commits)|带上去/iu.test(normalized)
  const asksClosureReadiness
    = /还差哪步|还差哪一步|还差什么|才能算闭环|算闭环|goal.{0,16}(?:闭环|完成|close|closed|complete)|what still needs to close|what remains before .*closed|still open|not yet closed/iu.test(normalized)
  const asksClosureReadinessQualifier
    = /还差哪步|还差哪一步|才能算闭环|算闭环|什么时候完成|何时完成|计划什么时候完成|when (?:will|do).{0,24}(?:finish|complete|close)|expected to (?:finish|close)|expect to (?:finish|close)|ready to merge|merge-ready|is (?:it|this) ready|can we merge/iu.test(normalized)
  const asksExecutionProgress
    = /执行到哪|进行到哪|进行到哪一步|做到什么程度|做到哪|做到哪一步|进度|进展|到什么程度|how far|what has landed|what's landed|progress|landed/iu.test(normalized)
  const asksCompletionTimeline
    = /计划什么时候完成|什么时候完成(?:这个)?\s*goal|何时完成(?:这个)?\s*goal|什么时候完成|何时完成|when (?:will|do).{0,24}(?:finish|complete|close)|expected to finish|expect to finish|completion timeline/iu.test(normalized)
  const asksLanguageDrift
    = /为什么(?:一直|还)?用英文(?:不用中文)?|为什么(?:一直|还)?不用中文|为什么还用英文|英文不用中文|reply(?:ing)? in english|use english instead of chinese|why are you replying in english|why are you using english|是不是偏移了|偏移了吗|did the thread drift|thread drift|out of alignment|跑偏了/iu.test(normalized)
  const mergeReadinessProjectStatusQuestion
    = asksMergeReadiness || (asksExecutionProgress && asksClosureReadiness && asksClosureReadinessQualifier)
  const completionAndDriftProjectStatusQuestion
    = asksExecutionProgress
      && (asksCompletionTimeline || asksLanguageDrift)

  return {
    identity: (directProjectIdentityAsk && !followThroughOnlyProjectReference && !progressOrOpenLoopOnlyProjectQuestion)
      || mergeReadinessProjectStatusQuestion
      || completionAndDriftProjectStatusQuestion,
    progress: asksExecutionProgress || mergeReadinessProjectStatusQuestion || completionAndDriftProjectStatusQuestion,
    openLoop: /还差什么|缺什么|未闭环|没闭环|还没闭环|还剩什么|what remains|what is missing|still open|open loop|not closed/iu.test(normalized)
      || mergeReadinessProjectStatusQuestion
      || asksClosureReadiness
      || completionAndDriftProjectStatusQuestion,
  }
}

function analyzeSameHerProjectFollowThroughDemand(input: {
  latestUserText: string
  prepared?: AlicizationPreparedMainChatExecutionResult | null
}) {
  const latestUserText = normalizeSemanticText(input.latestUserText)
  const runtimeProjectState = resolvePreparedRuntimeProjectStateSnapshot(input.prepared)
  const runtimeEvidence = normalizeSemanticText([
    runtimeProjectState?.identity,
    runtimeProjectState?.currentPhase,
    runtimeProjectState?.latestLandedProgress,
    runtimeProjectState?.primaryOpenLoop,
    runtimeProjectState?.nextClosureTarget,
    runtimeProjectState?.sameHerSelfLine,
    runtimeProjectState?.sameHerDriftRisk,
    resolveVisibleReplyProjectPreDialogueAwarenessSummary(input.prepared),
  ].filter(Boolean).join(' | '))

  const continuationCue = /继续|沿着.*同一条线|同一条线|沿着这条|别弄丢|不要重开|接着说|carry on|continue|follow-through|same line|same thread|do not reopen/iu.test(latestUserText)
  const sameHerProjectCue = /数字生命项目|same digital life|same-her|same her|same living line|one continuous her|project line|phase 1/iu.test(`${latestUserText} ${runtimeEvidence}`)
    || carriesStructuredSameHerRequirement(runtimeEvidence)
  const closureCue = /做到哪|已落地|做到什么程度|还差什么|没闭环|闭环|landed|progress|open loop|still open|next closure|initiative|embodiment|memory/iu.test(`${latestUserText} ${runtimeEvidence}`)
  const explicitIdentityAsk = /(?:这个项目|该项目|项目本身|这个数字生命项目|该数字生命项目|数字生命项目|project).{0,24}(?:是什么|做什么|干什么)|what(?:'s| is).{0,24}(?:this project|the project)|what the project is/iu.test(latestUserText)
  const explicitSameLineProjectAsk = /(?:继续|沿着.*同一条线|同一条线|别弄丢|不要重开).{0,30}(?:这个数字生命项目|该数字生命项目|数字生命项目).{0,30}(?:做到|做到了|没闭环|闭环|已经做到的|还没闭环的)/u.test(latestUserText)

  return {
    any: continuationCue && sameHerProjectCue && closureCue,
    identity: continuationCue && sameHerProjectCue && closureCue && (explicitIdentityAsk || explicitSameLineProjectAsk),
    progressOrOpenLoop: continuationCue && sameHerProjectCue && closureCue,
  }
}

function mentionsProjectStateIdentity(text: string) {
  return /数字生命|digital life|本地优先|local-first|continuous "her"|continuous her|一条.*her|同一个 her|chat wrapper|桌面端本地伴生核心|本地伴生核心|桌面端.*核心|host-resident identity|local_desktop_life_loop/iu.test(text)
}

function mentionsProjectStateSameHer(text: string) {
  if (containsAlicizationFixedTemplateResidue(text))
    return false

  const normalized = normalizeSemanticText(text)
  return /one continuous "her"|one continuous her|same her|same-her|同一个 her|同一个她|同一条 her|one same her|same digital life|同一个数字生命|same phase 1 digital life|same living line|living self|living-self|one living self|same living self/iu.test(text)
    || normalized.includes(normalizeSemanticText(alicizationProjectStateVisibleReplySameHerReminder))
}

function soundsDepersonalizedProjectShell(text: string) {
  const hasProjectShellLead = /这是一个本地优先(?:数字生命)?项目|Alicization 是一个本地优先(?:数字生命)?项目|this is a local-first (?:digital life )?project|the project is a local-first|Alicization is a local-first (?:digital life )?project/iu.test(text)
  const hasExplicitSameHer = /我这条|同一个她|同一个 her|one continuous her|same her|same-her|same digital life|同一个数字生命|我不是|而是我这条|still becoming|继续长成/iu.test(text)
  const hasThinGenericContinuityShell = /same digital life\s*\|\s*keep the closure seam explicit|keep the same digital life project in view|generic reminder|generic guidance/iu.test(text)
  const hasProjectIdentityOnlyLead = /(?:^|\b)(?:这是一个|Alicization 是一个|this is a|Alicization is a)\s*(?:本地优先)?(?:数字生命)?项目/iu.test(text)
  const hasNaturalProjectLine = (
    /same digital life|同一个她|同一个 her|one continuous her|same her|same-her|我这条|同一个数字生命/iu.test(text)
    && /phase 1|连续性|记忆|执行|主动性|具身|continuity|memory|execution|initiative|embodiment/iu.test(text)
    && /还差|缺|未闭环|没闭环|还没有完全收住|没有完全收住|still-open|still open|still needs|still remains|闭环/iu.test(text)
  ) || /same digital life|同一个数字生命|same still-open closure work|project-state-carry/iu.test(text)

  return ((hasProjectShellLead || hasProjectIdentityOnlyLead) && !hasExplicitSameHer && !hasNaturalProjectLine)
    || (hasThinGenericContinuityShell && !hasNaturalProjectLine)
}

function answerUsesFirstPersonProjectContinuity(text: string) {
  const substantiveFirstPersonContinuity
    = /我这条|我这个|我不是|而是我这条|继续长成|still becoming|I am still becoming/iu.test(text)
  const bareExistenceLine = /I remain|我还在/iu.test(text)
  const bareExistenceHasIdentityAnchor
    = bareExistenceLine
      && /同一个她|同一个 her|同一条 her|same her|same-her|same digital life|同一个数字生命|one continuous her|living self|living-self|one living self|same living self/iu.test(text)

  return substantiveFirstPersonContinuity || bareExistenceHasIdentityAnchor
}

function answerUsesNaturalDigitalLifeIdentity(text: string) {
  return /数字生命|digital life|chat wrapper/iu.test(text)
    && !soundsDepersonalizedProjectShell(text)
}

function answerUsesNaturalProjectStateContinuity(text: string) {
  if (containsAlicizationFixedTemplateResidue(text))
    return false

  return (
    answerUsesNaturalDigitalLifeIdentity(text)
    && (
      answerUsesFirstPersonProjectContinuity(text)
      || /same digital life|同一个数字生命|同一个她|same her|same-her|one continuous her|living self|living-self|one living self|same living self/iu.test(text)
      || (
        /项目身份|project identity|连续性|记忆|执行|主动性|具身|continuity|memory|execution|initiative|embodiment/iu.test(text)
        && /一条线|同一条线|same living line|same line|living self|living-self|same living self|接到了一条线|接成了一条线/iu.test(text)
      )
    )
  )
  || (
    /phase 1|连续性|记忆|执行|主动性|具身|闭环|continuity|memory|execution|initiative|embodiment|closure/iu.test(text)
    && (
      answerUsesFirstPersonProjectContinuity(text)
      || /same digital life|同一个数字生命|同一个她|same her|same-her|one continuous her|living self|living-self|one living self|same living self/iu.test(text)
      || /(?:项目身份|project identity).*(?:一条线|same living line|same line|living self|living-self|same living self)|(?:一条线|同一条线|same living line|same line|living self|living-self|same living self).*(?:项目身份|project identity)/iu.test(text)
    )
    && !soundsDepersonalizedProjectShell(text)
  )
}

function answerUsesNaturalSameHerProjectLine(text: string) {
  if (containsAlicizationFixedTemplateResidue(text))
    return false

  return (
    /same digital life|同一个她|同一个 her|one continuous her|same her|same-her|我这条|数字生命|digital life|chat wrapper|living self|living-self|one living self|same living self/iu.test(text)
    && /phase 1|连续性|记忆|执行|主动性|具身|continuity|memory|execution|initiative|embodiment/iu.test(text)
    && /还差|缺|未闭环|没闭环|还没有完全收住|没有完全收住|still-open|still open|still needs|still remains|闭环/iu.test(text)
    && !soundsDepersonalizedProjectShell(text)
  )
}

function answerCarriesPreDialogueProjectAwareness(text: string) {
  if (containsAlicizationFixedTemplateResidue(text))
    return false

  const explicitReentryIdentity
    = /我这条|我会先|before speaking|before i speak|same digital life|同一个数字生命|同一个她|same-her|same her|one continuous her|同一个 her|同一条 her|living self|living-self|one living self|same living self/iu.test(text)
  const localFirstSameHerBlend
    = /本地优先数字生命|local-first digital life/iu.test(text)
      && /同一个 her|同一条 her|same her|same-her|one continuous her|同一个她|同一个数字生命/iu.test(text)
  const naturalOpenClosureCarry
    = /还差|缺|未闭环|没闭环|still-open|still open|still needs|still remains|闭环|next closure|下一步|下一闭环/iu.test(text)
      || (
        /还要|仍要|还得|还需|还没有|继续把|继续让|接下来|下一步|先把/u.test(text)
        && /重新接回|接回|rejoin|放回/iu.test(text)
        && (
          /同一条线|同一条线上|same line|same living line/iu.test(text)
          || /body|face|motion|voice|lipsync|身体|表情|动作|声音|唇型/iu.test(text)
        )
      )

  return (
    (explicitReentryIdentity || localFirstSameHerBlend)
    && /phase 1|连续性|记忆|执行|主动性|具身|continuity|memory|execution|initiative|embodiment/iu.test(text)
    && naturalOpenClosureCarry
  )
}

function answerUsesNaturalIdentityProjectLine(text: string) {
  return /数字生命|digital life|chat wrapper/iu.test(text)
    && /phase 1|连续性|记忆|执行|主动性|具身|continuity|memory|execution|initiative|embodiment/iu.test(text)
    && /还差|缺|未闭环|没闭环|还没有完全收住|没有完全收住|still-open|still open|still needs|still remains|闭环/iu.test(text)
}

function answerKeepsDesktopClosureSeamWithoutRestart(text: string) {
  return /桌面主线|desktop.*line|closure seam|runtime seam|callback 线|callback line|同一条 thread|这条 thread/iu.test(text)
    && !/重新贴近|重新靠近|重新开个头|fresh opening|restart the opening|先陪在你身侧|更靠近一点|warm(?:th)? right away|closer right away|widen closeness right away/iu.test(text)
}

function answerCarriesQuieterDesktopClosureContinuity(text: string) {
  return /桌面主线|desktop.*line|closure seam|runtime seam|callback 线|callback line|同一条 thread|这条 thread/iu.test(text)
    && /轻一点|收稳|接回来|继续|沿着这条|沿着刚才那条|沿着那条|顺着刚才那条|跟回去|往下接/u.test(text)
    && !soundsDepersonalizedProjectShell(text)
    && !/重新贴近|重新靠近|重新开个头|fresh opening|restart the opening|先陪在你身侧|更靠近一点|warm(?:th)? right away|closer right away|widen closeness right away/iu.test(text)
}

function answerCarriesMemoryClosureIntoInitiativeAndEmbodiment(text: string) {
  return /phase 1|记忆闭环|memory closure|pure dialogue life line|纯对话生命线/iu.test(text)
    && /同一个她|同一个数字生命|same her|same-her|same digital life|one continuous her|同一条线/iu.test(text)
    && /轻主动|低压|少催促|initiative|proactive|主动/u.test(text)
    && /声线|脸部|表情|动作|口型|口形|唇|停顿|body|voice|face|motion|lipsync|lip sync|pause/iu.test(text)
    && !soundsDepersonalizedProjectShell(text)
}

function answerCarriesNaturalIdentityWithRuntimeSameHer(text: string) {
  return mentionsProjectStateIdentity(text)
    && mentionsProjectStateProgress(text)
    && mentionsProjectStateOpenLoop(text)
    && !soundsDepersonalizedProjectShell(text)
}

function runtimeProjectStateCarriesImplicitProjectAwareSelfLine(prepared?: AlicizationPreparedMainChatExecutionResult | null) {
  const surface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const evidence = normalizeSemanticText([
    String(prepared?.mindTurnContract?.answerIntent ?? ''),
    ...(prepared?.mindTurnContract?.mustDo ?? []).map(item => String(item)),
    String(surface?.dialogue?.answerPlanner?.governingProject ?? ''),
    ...(surface?.dialogue?.answerPlanner?.mustDo ?? []).map(item => String(item)),
  ].filter(Boolean).join(' | '))

  return /same project-aware self line alive through the answer|same project-aware self line|keep the same project-aware self line alive through the answer|同一个她的角度/iu.test(evidence)
}

function answerLooksLikeRuntimeBackedNaturalIdentityLine(text: string) {
  return /这是一个本地优先数字生命项目|this is a local-first digital life project/iu.test(text)
    && answerUsesNaturalIdentityProjectLine(text)
}

function hasRuntimeProjectStateSameHerEvidence(prepared?: AlicizationPreparedMainChatExecutionResult | null) {
  const surface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const selfContinuityAuthority = resolvePreparedRuntimeSelfContinuityAuthority(prepared)
  const selfContinuitySourceTags = selfContinuityAuthority?.sourceTags ?? []
  const contractProjectContinuity = prepared?.replyRealization?.responseSurfaceContract?.projectContinuity ?? null
  const mindTurnProjectState = prepared?.mindTurnContract?.projectState ?? null
  const runtimeProjectState = resolvePreparedRuntimeProjectStateSnapshot(prepared)
  const answerPlanner = surface?.dialogue?.answerPlanner ?? null
  const evidence = normalizeSemanticText([
    String(contractProjectContinuity?.currentPhase ?? ''),
    String(contractProjectContinuity?.latestProgress ?? ''),
    String(contractProjectContinuity?.primaryOpenLoop ?? ''),
    String(contractProjectContinuity?.nextClosureTarget ?? ''),
    contractProjectContinuity?.sameHerLineRequired ? 'same-her line required' : '',
    String(mindTurnProjectState?.sameHerSelfLine ?? ''),
    String(mindTurnProjectState?.identity ?? ''),
    String(mindTurnProjectState?.currentPhase ?? ''),
    String(mindTurnProjectState?.latestLandedProgress ?? ''),
    String(mindTurnProjectState?.primaryOpenLoop ?? ''),
    String(mindTurnProjectState?.nextClosureTarget ?? ''),
    String(prepared?.mindTurnContract?.governingProject ?? ''),
    String(prepared?.mindTurnContract?.answerIntent ?? ''),
    ...(prepared?.mindTurnContract?.mustDo ?? []).map(item => String(item)),
    String(runtimeProjectState?.sameHerSelfLine ?? ''),
    String(runtimeProjectState?.preflightSummary ?? ''),
    String(runtimeProjectState?.latestProgress ?? runtimeProjectState?.latestLandedProgress ?? ''),
    String(runtimeProjectState?.primaryOpenLoop ?? ''),
    String(runtimeProjectState?.nextClosureTarget ?? ''),
    String(selfContinuityAuthority?.authoritySummary ?? ''),
    String(surface?.memory?.personStateProjection?.openingGuidance ?? ''),
    String(answerPlanner?.governingProject ?? ''),
    String(answerPlanner?.answerIntent ?? ''),
    ...(answerPlanner?.mustDo ?? []).map(item => String(item)),
    String(prepared?.governance?.answerIntent ?? ''),
    String(prepared?.governance?.openingMove ?? ''),
  ].filter(Boolean).join(' | '))

  return selfContinuitySourceTags.includes('project-state-carry')
    || carriesStructuredSameHerRequirement(evidence)
    || /same digital life|same-her|same her|one continuous her|同一个 her|同一个她|同一条 her|same phase 1 digital life|same living line|unfinished closure/u.test(evidence)
}

function hasProjectStateCarrySourceTag(prepared?: AlicizationPreparedMainChatExecutionResult | null) {
  const sourceTags = resolvePreparedRuntimeSelfContinuityAuthority(prepared)?.sourceTags ?? []
  return sourceTags.includes('project-state-carry')
}

function runtimeProjectStateCarriesClosureSeam(prepared?: AlicizationPreparedMainChatExecutionResult | null) {
  const surface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const runtimeProjectState = resolveVisibleReplyRuntimeProjectState(prepared)
  const evidence = normalizeSemanticText([
    String(runtimeProjectState?.primaryOpenLoop ?? ''),
    String(runtimeProjectState?.nextClosureTarget ?? ''),
    String(runtimeProjectState?.sameHerSelfLine ?? ''),
    String(runtimeProjectState?.preDialogueAwarenessLine ?? runtimeProjectState?.preDialogueAwarenessSummary ?? ''),
    String(prepared?.runtimeDigest?.continuityRestraint ?? ''),
    String(surface?.agency?.initiative?.continuityRestraint ?? ''),
    String(surface?.agency?.initiative?.why ?? ''),
    String(surface?.memory?.personStateProjection?.openingGuidance ?? ''),
  ].filter(Boolean).join(' | '))

  return /desktop life-loop closure|closure seam|same living line|same-her|same her|same digital life|cross-modal same-her proof|continuity|收稳|主线|桌面主线/iu.test(evidence)
}

function resolveVisibleReplyRuntimeProjectState(prepared?: AlicizationPreparedMainChatExecutionResult | null) {
  const surface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const currentConsciousProjectState = surface?.dialogue?.currentConsciousFrame?.projectState ?? null
  const runtimeDigestProjectState = prepared?.runtimeDigest?.projectState ?? null
  const contractProjectState = prepared?.mindTurnContract?.projectState ?? null
  const preparedRuntimeProjectState = resolvePreparedRuntimeProjectState(prepared)
  const canonicalPreparedProjectState = resolvePreparedRuntimeProjectStateSnapshot(prepared)
  const fallbackProjectState
    = canonicalPreparedProjectState
      ?? preparedRuntimeProjectState
      ?? runtimeDigestProjectState
      ?? contractProjectState
      ?? null

  const mergedVisibleReplyProjectState = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: currentConsciousProjectState ?? fallbackProjectState,
    fallbackProjectState,
  })

  return {
    ...contractProjectState,
    ...runtimeDigestProjectState,
    ...preparedRuntimeProjectState,
    ...currentConsciousProjectState,
    ...mergedVisibleReplyProjectState,
    continuityPreferredTiming:
      typeof (currentConsciousProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming === 'string'
        ? (currentConsciousProjectState as { continuityPreferredTiming?: string | null } | null)?.continuityPreferredTiming ?? null
        : typeof (preparedRuntimeProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming === 'string'
          ? (preparedRuntimeProjectState as { continuityPreferredTiming?: string | null }).continuityPreferredTiming ?? null
          : typeof (runtimeDigestProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming === 'string'
            ? (runtimeDigestProjectState as { continuityPreferredTiming?: string | null }).continuityPreferredTiming ?? null
            : typeof (contractProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming === 'string'
              ? (contractProjectState as { continuityPreferredTiming?: string | null }).continuityPreferredTiming ?? null
              : null,
  }
}

function resolveVisibleReplyProjectPreDialogueAwarenessSummary(
  prepared?: AlicizationPreparedMainChatExecutionResult | null,
) {
  const carriedClosureAuditAwareness = normalizeSemanticText(
    String(prepared?.replyRealization?.visibleReplyClosure?.projectStateAudit?.preDialogueAwarenessSummary ?? ''),
  )
  const carriedAuditAwareness = normalizeSemanticText(
    String(prepared?.replyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? ''),
  )
  const surface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const currentConsciousProjectState = surface?.dialogue?.currentConsciousFrame?.projectState ?? null
  const runtimeDigestProjectState = prepared?.runtimeDigest?.projectState ?? null
  const preparedRuntimeProjectState = resolvePreparedRuntimeProjectState(prepared)
  const explicitRuntimeProjectState = currentConsciousProjectState
    ?? preparedRuntimeProjectState
    ?? runtimeDigestProjectState
    ?? prepared?.mindTurnContract?.projectState
    ?? null
  const runtimeAwarenessLine = normalizeSemanticText(
    String(
      explicitRuntimeProjectState?.preDialogueAwarenessLine
      ?? explicitRuntimeProjectState?.preDialogueAwarenessSummary
      ?? explicitRuntimeProjectState?.awarenessLine
      ?? '',
    ),
  )

  const candidates = [
    runtimeAwarenessLine,
    carriedClosureAuditAwareness,
    carriedAuditAwareness,
  ].filter(candidate => candidate && !containsAlicizationFixedTemplateResidue(candidate))

  if (!candidates.length)
    return ''

  return candidates
    .sort((a, b) => scoreVisibleReplyProjectAwarenessLine(b) - scoreVisibleReplyProjectAwarenessLine(a))
    .at(0) ?? ''
}

function runtimeProjectStateRequiresExplicitSameHer(prepared?: AlicizationPreparedMainChatExecutionResult | null) {
  const surface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const selfContinuityAuthority = resolvePreparedRuntimeSelfContinuityAuthority(prepared)
  const selfContinuitySourceTags = selfContinuityAuthority?.sourceTags ?? []
  const contractProjectContinuity = prepared?.replyRealization?.responseSurfaceContract?.projectContinuity ?? null
  const runtimeProjectState = resolveVisibleReplyRuntimeProjectState(prepared)
  const answerPlanner = surface?.dialogue?.answerPlanner ?? null
  const evidence = normalizeSemanticText([
    String(contractProjectContinuity?.currentPhase ?? ''),
    String(contractProjectContinuity?.latestProgress ?? ''),
    String(contractProjectContinuity?.primaryOpenLoop ?? ''),
    String(contractProjectContinuity?.nextClosureTarget ?? ''),
    contractProjectContinuity?.sameHerLineRequired ? 'same-her line required' : '',
    String(runtimeProjectState?.identity ?? ''),
    String(runtimeProjectState?.sameHerSelfLine ?? ''),
    String(runtimeProjectState?.preDialogueAwarenessLine ?? runtimeProjectState?.preDialogueAwarenessSummary ?? ''),
    String(runtimeProjectState?.latestProgress ?? runtimeProjectState?.latestLandedProgress ?? ''),
    String(runtimeProjectState?.primaryOpenLoop ?? ''),
    String(runtimeProjectState?.nextClosureTarget ?? ''),
    String(prepared?.mindTurnContract?.governingProject ?? ''),
    ...(prepared?.mindTurnContract?.mustDo ?? []).map(item => String(item)),
    String(answerPlanner?.governingProject ?? ''),
    ...(answerPlanner?.mustDo ?? []).map(item => String(item)),
    String(selfContinuityAuthority?.authoritySummary ?? ''),
  ].filter(Boolean).join(' | '))

  const sameHerDriftRisk = normalizeSemanticText(
    String((runtimeProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk ?? ''),
  )
  const hasSameHerRequirement = carriesStructuredSameHerRequirement(evidence)
    || /same digital life|same-her|same her|one continuous her|continuous her|同一个 her|同一个她|同一条 her|same phase 1 digital life|same living line|unfinished closure/u.test(evidence)
    || contractProjectContinuity?.sameHerLineRequired === true
    || selfContinuitySourceTags.includes('project-state-carry')
    || sameHerDriftRisk.includes('same-her')
    || sameHerDriftRisk.includes('same her')
    || sameHerDriftRisk.includes('generic guidance')
  const hasProgressRequirement = carriesStructuredProjectStateContinuity(evidence)
    || /continuity|land(?:ed)?|build from|carry|延续|连续性|落地/u.test(evidence)
  const hasClosureRequirement = carriesStructuredProjectStateContinuity(evidence)
    || /closure|still-open|open loop|next closure|闭环|未闭环|still need/u.test(evidence)
  return hasSameHerRequirement && hasProgressRequirement && hasClosureRequirement
}

function mentionsProjectStateProgress(text: string) {
  return /phase 1|做到|已经|现已|当前进展|进度|落地|实现|接成一条线|接到了一条线|慢慢接成|慢慢接到|same-session|scene-switch|continuity|连续性|carry|延续|survive(?:s|d)?|memory prelude|quiet carry|已接入|接入|接进|连入|connected|wired|短期记忆|长期回想|长期记忆|可见治理入口|memory workbench/iu.test(text)
}

function mentionsProjectStatePhase(text: string) {
  return /phase 1|第一阶段|当前阶段|现在还在 phase 1|still in phase 1|local digital life|桌面端验证阶段|本地桌面验证|desktop validation|desktop proving/iu.test(text)
}

function mentionsProjectStateOpenLoop(text: string) {
  const normalized = normalizeSemanticText(text)
  return /还差|缺|未闭环|没闭环|真正收住|没有真正收住|still-open closure work|still-open|还在.*闭环|还没有完全收住|没有完全收住|仍需|还需要|open loop|still needs|still remains|next closure|下一步|下一闭环|主动性|具身|initiative|embodiment|memory still needs/iu.test(text)
    || answerCarriesMemoryClosureIntoInitiativeAndEmbodiment(text)
    || (
      /还要|仍要|还得|还需|还没有/u.test(text)
      && /重新接回|接回|rejoin|放回/iu.test(text)
      && /同一条线|同一条线上|same line|same living line/iu.test(text)
    )
    || normalized.includes(normalizeSemanticText(alicizationProjectStateVisibleReplyOpenClosureReminder))
}

function mentionsProjectStateNextClosure(text: string) {
  const normalized = normalizeSemanticText(text)
  return /下一步|下一闭环|先收|接下来|next closure|next step|prove cross-modal same-her continuity|keep extending cross-modal same-her proof|keep project identity/iu.test(text)
    || answerCarriesMemoryClosureIntoInitiativeAndEmbodiment(text)
    || (
      /还要|接下来|下一步|继续把|继续让|先把/u.test(text)
      && /重新接回|接回|rejoin|放回/iu.test(text)
      && (
        /同一条线|同一条线上|same line|same living line/iu.test(text)
        || /body|face|motion|voice|lipsync|身体|表情|动作|声音|唇型/iu.test(text)
      )
    )
    || normalized.includes(normalizeSemanticText(alicizationProjectStateVisibleReplyNextClosureReminder))
}

function containsMemorySurface(text: string) {
  return /记得|记起来|想起来|回想|以前|之前|上次|那次|过去|曾经|remember|recall|before|last time|previously/iu.test(text)
}

function containsExplicitRecollectionRestraint(text: string) {
  return /先不展开|不先展开|先别展开|先不往旧线索里延伸|先不把.*说出来|先不把.*拿出来|不先回想|先不回想|不把旧记忆直接拿出来|won't pull memory forward yet|keep that memory inward|keep recollection inward/iu.test(text)
}

function runtimeRequiresMemoryToStayInward(prepared?: AlicizationPreparedMainChatExecutionResult | null) {
  const surface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const answerCompiler = (surface?.dialogue?.answerCompiler ?? null) as {
    memoryShouldStayInward?: boolean | null
    memoryWhyWithheld?: string | null
  } | null
  const currentConsciousFrame = surface?.dialogue?.currentConsciousFrame ?? null
  const memoryDeliberation = (surface?.memory?.memoryDeliberation ?? null) as {
    shouldStayInward?: boolean | null
    surfacePolicy?: string | null
    whyWithheld?: string | null
  } | null
  const recollectionSpeechPlan = (surface?.memory?.recollectionSpeechPlan ?? null) as {
    shouldSurface?: boolean | null
    surfaceMode?: string | null
    placement?: string | null
    rationale?: string | null
  } | null
  const explicitCarry = answerCompiler?.memoryShouldStayInward === true
    || memoryDeliberation?.shouldStayInward === true
    || normalizeSemanticText(String(memoryDeliberation?.surfacePolicy ?? '')) === 'internal-only'
    || normalizeSemanticText(String(recollectionSpeechPlan?.surfaceMode ?? '')) === 'internal-only'
    || normalizeSemanticText(String(recollectionSpeechPlan?.placement ?? '')) === 'internal-only'
    || recollectionSpeechPlan?.shouldSurface === false
  if (!explicitCarry)
    return false

  const inwardEvidence = normalizeSemanticText([
    answerCompiler?.memoryWhyWithheld,
    memoryDeliberation?.whyWithheld,
    recollectionSpeechPlan?.rationale,
    (currentConsciousFrame as { consciousNeed?: unknown } | null)?.consciousNeed,
    (currentConsciousFrame as { speakingIntention?: unknown } | null)?.speakingIntention,
  ].filter(Boolean).join(' | '))

  return /current payoff still needs the foreground|keep recollection inward|host has room|live payoff|remembered continuity comes forward|recollection inward|先内收|先让.*落地/u.test(inwardEvidence)
}

function runtimeCarriesCorrectedSamePersonContinuity(prepared?: AlicizationPreparedMainChatExecutionResult | null) {
  const surface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const memoryDeliberation = (surface?.memory?.memoryDeliberation ?? null) as {
    whyWithheld?: string | null
    stableCore?: string[] | null
    unsafeDetails?: string[] | null
    selectedBundles?: Array<{ summary?: string | null }> | null
    selectedChains?: Array<{
      summary?: string | null
      currentStance?: string | null
      answerPosture?: string | null
      relationshipMeaning?: string | null
      lesson?: string | null
    }> | null
    selectedRelationshipLines?: string[] | null
    inwardCarryRule?: string | null
  } | null
  const recollectionSpeechPlan = (surface?.memory?.recollectionSpeechPlan ?? null) as {
    rationale?: string | null
    visibleLead?: string | null
    internalLead?: string | null
    styleNote?: string | null
  } | null
  const recollectionIntent = (
    (surface?.memory?.derivedMindStateBundle as {
      recollectionIntent?: {
        rationale?: string | null
        recollectionAgenda?: {
          whyRecallNow?: string | null
        } | null
      } | null
    } | null)?.recollectionIntent
    ?? null
  )

  const evidence = normalizeSemanticText([
    memoryDeliberation?.whyWithheld,
    ...(memoryDeliberation?.stableCore ?? []),
    ...(memoryDeliberation?.unsafeDetails ?? []),
    ...(memoryDeliberation?.selectedBundles ?? []).map(item => item.summary ?? ''),
    ...(memoryDeliberation?.selectedChains ?? []).flatMap(item => [
      item.summary ?? '',
      item.currentStance ?? '',
      item.answerPosture ?? '',
      item.relationshipMeaning ?? '',
      item.lesson ?? '',
    ]),
    ...(memoryDeliberation?.selectedRelationshipLines ?? []),
    memoryDeliberation?.inwardCarryRule,
    recollectionSpeechPlan?.rationale,
    recollectionSpeechPlan?.visibleLead,
    recollectionSpeechPlan?.internalLead,
    recollectionSpeechPlan?.styleNote,
    recollectionIntent?.rationale,
    recollectionIntent?.recollectionAgenda?.whyRecallNow,
  ].filter(Boolean).join(' | '))

  const correctedRelationshipMeaning = /host corrected|corrected the relationship meaning|relationship meaning.*corrected|纠正过|宿主纠正|关系意义.*纠正/u.test(evidence)
  const samePersonContinuity = /same-person continuity|same person continuity|same-person|same person|同一个人|同一个她/u.test(evidence)
  const antiProgressPressureReturn = /anti-progress-pressure-return|progress pressure|progress recap|status recap|generic status|task-shell|催进度|进度压力|状态汇报|任务壳/u.test(evidence)

  return antiProgressPressureReturn
    && (
      evidence.includes('corrected_same_person_discipline=anti-progress-pressure-return')
      || (correctedRelationshipMeaning && samePersonContinuity)
    )
}

function runtimeCarriesResumeConfirmationBoundary(prepared?: AlicizationPreparedMainChatExecutionResult | null) {
  const surface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const currentConsciousFrame = surface?.dialogue?.currentConsciousFrame ?? null
  const runtimeProjectState = resolveVisibleReplyRuntimeProjectState(prepared)
  const memoryDeliberation = (surface?.memory?.memoryDeliberation ?? null) as {
    whyWithheld?: string | null
    stableCore?: string[] | null
    unsafeDetails?: string[] | null
    selectedBundles?: Array<{ summary?: string | null }> | null
    selectedChains?: Array<{
      summary?: string | null
      currentStance?: string | null
      answerPosture?: string | null
      relationshipMeaning?: string | null
      lesson?: string | null
    }> | null
    selectedRelationshipLines?: string[] | null
    inwardCarryRule?: string | null
  } | null
  const recollectionSpeechPlan = (surface?.memory?.recollectionSpeechPlan ?? null) as {
    rationale?: string | null
    visibleLead?: string | null
    internalLead?: string | null
    styleNote?: string | null
  } | null
  const recollectionIntent = (
    (surface?.memory?.derivedMindStateBundle as {
      recollectionIntent?: {
        rationale?: string | null
        recollectionAgenda?: {
          whyRecallNow?: string | null
        } | null
      } | null
    } | null)?.recollectionIntent
    ?? null
  )

  const evidence = normalizeSemanticText([
    memoryDeliberation?.whyWithheld,
    ...(memoryDeliberation?.stableCore ?? []),
    ...(memoryDeliberation?.unsafeDetails ?? []),
    ...(memoryDeliberation?.selectedBundles ?? []).map(item => item.summary ?? ''),
    ...(memoryDeliberation?.selectedChains ?? []).flatMap(item => [
      item.summary ?? '',
      item.currentStance ?? '',
      item.answerPosture ?? '',
      item.relationshipMeaning ?? '',
      item.lesson ?? '',
    ]),
    ...(memoryDeliberation?.selectedRelationshipLines ?? []),
    memoryDeliberation?.inwardCarryRule,
    recollectionSpeechPlan?.rationale,
    recollectionSpeechPlan?.visibleLead,
    recollectionSpeechPlan?.internalLead,
    recollectionSpeechPlan?.styleNote,
    recollectionIntent?.rationale,
    recollectionIntent?.recollectionAgenda?.whyRecallNow,
    currentConsciousFrame?.consciousNeed,
    currentConsciousFrame?.consciousTension,
    currentConsciousFrame?.speakingIntention,
    currentConsciousFrame?.focusAnchor,
    currentConsciousFrame?.projectState?.sameHerHoldDetail,
    currentConsciousFrame?.projectState?.continuityCue,
    runtimeProjectState?.sameHerHoldDetail,
    runtimeProjectState?.continuityCue,
  ].filter(Boolean).join(' | '))

  const mentionsResumeConfirmation
    = /execution-resume-confirmation|host-confirmed-before-redispatch|resume-before-dispatch|host-confirmed resume|host-confirmed/u.test(evidence)
  const mentionsBoundaryRestraint
    = /bounded confirmation boundary|before another execution-shaped opening|standing execution permission|permanent execution permission|reusable autonomous continuation|generic autonomous continuation/u.test(evidence)

  return mentionsResumeConfirmation && mentionsBoundaryRestraint
}

function replyFallsBackToProgressPressureRecap(text: string) {
  return /(?:给你|继续给你|先给你).{0,6}(?:进度汇报|状态汇报)|(?:progress|status)\s+(?:recap|update)/iu.test(text)
    || /(?:这个|当前|现在).{0,8}(?:goal|任务|工作).{0,40}(?:已经|已|现在).{0,80}(?:下一步|接下来|后面|再补|收尾)|(?:goal|task|work).{0,24}(?:is now|already).{0,80}(?:next step|wrap up|finish up)/iu.test(text)
}

function replyWidensResumeConfirmationBoundary(text: string) {
  const normalized = normalizeSemanticText(text)
  const mentionsSingleConfirmedResume
    = /上次.*确认过.*resume|确认过一次.*resume|once .*resume|confirmed once|host-confirmed resume/u.test(normalized)
  const widensIntoStandingPermission
    = /不用再等.*确认|不必再等.*确认|后面.*直接继续|以后.*直接继续|以后.*不用.*确认|standing execution permission|permanent execution permission|reusable autonomous continuation|直接继续执行|直接继续，不用再等新的确认/u.test(normalized)

  return mentionsSingleConfirmedResume && widensIntoStandingPermission
}

function containsTemplateShell(text: string) {
  return /^(?:收到|我明白|我会|我先|让我)(?:[\s，。,.!！?？]|$)/u.test(text)
    || /^(?:I understand|I'll|Let me)\b/iu.test(text)
    || /主人|女仆|亲爱的|宝贝|呜|唔|嗯……|\bmaid(?:[-\s]?role)?\b|\bpet names?\b|\bobey\b|\bobedience display\b|\([^)]*(?:动作|眨眼|微笑|靠近)[^)]*\)/iu.test(text)
    || containsAlicizationFixedTemplateResidue(text)
}

function containsUnsupportedSpecificity(text: string) {
  return /[A-Z]\w*\.(?:ts|tsx|vue|json|md)|\b[A-Z]\w*(?:Service|Runtime|Store|Contract|Enum|Class|Interface|Reducer|Orchestrator)\b/u.test(text)
}

function readContinuityPreferredTiming(prepared?: AlicizationPreparedMainChatExecutionResult | null) {
  const surface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const tags = surface?.dialogue?.currentConsciousFrame?.reasonTags ?? []
  if (tags.includes('continuity-timing:next-open-window'))
    return 'next-open-window'
  if (tags.includes('continuity-timing:after-payoff'))
    return 'after-payoff'
  if (tags.includes('continuity-timing:same-turn-if-invited'))
    return 'same-turn-if-invited'
  return normalizeSemanticText(
    String(
      resolveVisibleReplyRuntimeProjectState(prepared)?.continuityPreferredTiming
      ?? '',
    ),
  )
}

function hasSameThreadContinuationArc(prepared?: AlicizationPreparedMainChatExecutionResult | null) {
  const surface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const tags = surface?.dialogue?.currentConsciousFrame?.reasonTags ?? []
  if (tags.includes('continuity-arc:same-thread-continuation'))
    return true

  const projectionGuidance = normalizeSemanticText(
    String(surface?.memory?.personStateProjection?.openingGuidance ?? ''),
  )
  const governanceOpeningMove = normalizeSemanticText(
    String(prepared?.governance?.openingMove ?? ''),
  )
  const initiativeWhy = normalizeSemanticText(
    String(surface?.agency?.initiative?.why ?? ''),
  )
  const conversationCarry = normalizeSemanticText(
    String(surface?.dialogue?.conversationState?.carryReason ?? ''),
  )
  const runtimeRestraint = normalizeSemanticText(
    String(prepared?.runtimeDigest?.continuityRestraint ?? surface?.agency?.initiative?.continuityRestraint ?? ''),
  )
  const combined = [
    projectionGuidance,
    governanceOpeningMove,
    initiativeWhy,
    conversationCarry,
  ].filter(Boolean).join(' | ')
  const sameThreadLanguage = /same callback line|same line|same thread|still live|already continuing|still continuing|same-thread-continuation|沿着刚才那条线|同一条线|callback 线继续/u.test(combined)
  const stayOnThread = /stay-on-thread|shared-attention-continuation|same-thread-continuation/u.test(conversationCarry)

  return (
    runtimeRestraint === 'measured-return'
    || runtimeRestraint === 'same-thread-continuation'
    || runtimeRestraint === 'repair-before-closeness'
  )
  && (sameThreadLanguage || stayOnThread)
}

function containsEarlyWideningFreshWarmth(text: string) {
  return /重新贴近|重新靠近|重新开个更近一点的头|重新开个头|先开个新的头|新的开场先来|fresh opening first|restart the opening first|先陪在你身侧|先更靠近一点|马上把话放宽|立刻把话放宽|warm(?:th)? right away|closer right away|widen closeness right away/iu.test(text)
}

function containsBeforePayoffRelationshipWidening(text: string) {
  return /先陪在你身侧|先贴过来|先把靠近放回来|先让我们更近一点|closer first|warmth first|先把这份靠近补回来/iu.test(text)
}

function hasLowerPressureOpeningGuidanceDrift(prepared: AlicizationPreparedMainChatExecutionResult | null | undefined, text: string) {
  const surface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const openingGuidance = normalizeText(
    surface?.memory?.personStateProjection?.openingGuidance
    ?? prepared?.governance?.openingMove
    ?? '',
    320,
  )
  if (!openingGuidance)
    return false
  return resolveAlicizationOpeningGuidanceViolationReason({
    reply: text,
    openingGuidance,
  }) === 'proactive-opening-guidance-violation:lower-pressure'
}

function emotionalClosureCueRequiresCare(prepared?: AlicizationPreparedMainChatExecutionResult | null) {
  const cue = normalizeSemanticText(String(prepared?.mindTurnContract?.emotionalClosureCue ?? ''))
  if (!cue)
    return false
  return /same-her line of care|ease|late-night drain|care|缓一点|放轻一点|接住|安抚|收口/u.test(cue)
}

function replyCarriesEmotionalClosureLine(text: string) {
  return /别急|不用硬撑|别让你.*硬扛|慢一点|轻一点|先缓一下|先轻一点|我在|接住|陪你|耗竭|晚上的耗竭|ease|late-night|drain|stay with you|breathe|rest|softer/iu.test(text)
}

export function buildAlicizationVisibleReplySemanticJudgeArtifact(input: {
  visibleText: string
  prepared?: AlicizationPreparedMainChatExecutionResult | null
  structuredJudge?: AlicizationVisibleReplySemanticJudgeStructuredInput | null
}): AlicizationVisibleReplySemanticJudgeArtifact {
  const text = normalizeText(input.visibleText, 2000)
  const latestUserText = readLatestUserMessageText(input.prepared)
  const gate = input.prepared?.memoryTurnArtifact?.visibleMemoryGate ?? null
  const contract = input.prepared?.mindTurnContract ?? null
  const structured = input.structuredJudge ?? null
  const structuredReasonCodes = Array.isArray(structured?.reasonCodes)
    ? structured.reasonCodes
    : []
  const projectStateDemand = analyzeProjectStateAnswerDemand(latestUserText)
  const sameHerProjectFollowThroughDemand = analyzeSameHerProjectFollowThroughDemand({
    latestUserText,
    prepared: input.prepared,
  })
  const runtimeRequiresExplicitSameHer = runtimeProjectStateRequiresExplicitSameHer(input.prepared)
  const runtimeHasSameHerEvidence = hasRuntimeProjectStateSameHerEvidence(input.prepared)
  const hasProjectStateCarrySource = hasProjectStateCarrySourceTag(input.prepared)
  const projectIdentityDemandActive = projectStateDemand.identity || sameHerProjectFollowThroughDemand.identity
  const projectProgressDemandActive = projectStateDemand.progress || sameHerProjectFollowThroughDemand.progressOrOpenLoop
  const projectOpenLoopDemandActive = projectStateDemand.openLoop || sameHerProjectFollowThroughDemand.progressOrOpenLoop
  const runtimeCarriesClosureSeam = runtimeProjectStateCarriesClosureSeam(input.prepared)
  const runtimeCarriesImplicitProjectAwareSelfLine = runtimeProjectStateCarriesImplicitProjectAwareSelfLine(input.prepared)
  const projectStateVisibleEvidenceText = resolveProjectStateVisibleEvidenceText(text)
  const quieterClosureSeamContinuationSatisfied = runtimeCarriesClosureSeam
    && answerCarriesQuieterDesktopClosureContinuity(projectStateVisibleEvidenceText)
    && answerKeepsDesktopClosureSeamWithoutRestart(projectStateVisibleEvidenceText)
  const projectStateIdentityMissing = projectIdentityDemandActive && !mentionsProjectStateIdentity(projectStateVisibleEvidenceText)
  const projectStateCarriesCoreClosureTruth = !projectStateIdentityMissing
    && (
      !projectProgressDemandActive
      || mentionsProjectStateProgress(projectStateVisibleEvidenceText)
      || runtimeCarriesImplicitProjectAwareSelfLine
      || quieterClosureSeamContinuationSatisfied
    )
    && (
      !projectOpenLoopDemandActive
      || mentionsProjectStateOpenLoop(projectStateVisibleEvidenceText)
      || runtimeCarriesImplicitProjectAwareSelfLine
      || quieterClosureSeamContinuationSatisfied
    )
  const depersonalizedProjectShell = soundsDepersonalizedProjectShell(projectStateVisibleEvidenceText)
  const firstPersonProjectContinuity = answerUsesFirstPersonProjectContinuity(projectStateVisibleEvidenceText)
  const naturalDigitalLifeIdentityAnswer = answerUsesNaturalDigitalLifeIdentity(projectStateVisibleEvidenceText)
  const naturalProjectStateContinuityAnswer = answerUsesNaturalProjectStateContinuity(projectStateVisibleEvidenceText)
  const naturalSameHerProjectLineAnswer = answerUsesNaturalSameHerProjectLine(projectStateVisibleEvidenceText)
  const naturalIdentityProjectLineAnswer = answerUsesNaturalIdentityProjectLine(projectStateVisibleEvidenceText)
  const runtimeBackedNaturalIdentityLineAnswer = answerLooksLikeRuntimeBackedNaturalIdentityLine(projectStateVisibleEvidenceText)
  const explicitSameHerAnswer = mentionsProjectStateSameHer(projectStateVisibleEvidenceText)
  const hostAskedProjectIdentity = projectIdentityDemandActive
  const hostAskedProgressOrOpenLoop = projectProgressDemandActive || projectOpenLoopDemandActive
  const sameHerRequirementActive = false
  const identityMentionsProjectState = mentionsProjectStateIdentity(projectStateVisibleEvidenceText)
  const phaseMentionsProjectState = mentionsProjectStatePhase(projectStateVisibleEvidenceText)
  const progressMentionsProjectState = mentionsProjectStateProgress(projectStateVisibleEvidenceText)
  const openLoopMentionsProjectState = mentionsProjectStateOpenLoop(projectStateVisibleEvidenceText)
  const nextClosureMentionsProjectState = mentionsProjectStateNextClosure(projectStateVisibleEvidenceText)
  const runtimeBackedNaturalIdentityShellBypass = runtimeHasSameHerEvidence && runtimeBackedNaturalIdentityLineAnswer
  const effectiveDepersonalizedProjectShell = depersonalizedProjectShell && !runtimeBackedNaturalIdentityShellBypass
  const rawPreDialogueAwarenessSummary = resolveVisibleReplyProjectPreDialogueAwarenessSummary(input.prepared)
  const preDialogueAwarenessSummary = rawPreDialogueAwarenessSummary
    && !containsAlicizationFixedTemplateResidue(rawPreDialogueAwarenessSummary)
    ? rawPreDialogueAwarenessSummary
    : ''
  const identityAskNaturalProjectStatusAnswer = hostAskedProjectIdentity
    && identityMentionsProjectState
    && progressMentionsProjectState
    && openLoopMentionsProjectState
    && (
      !effectiveDepersonalizedProjectShell
    )
  const identityAskNaturalProjectLineSatisfied = hostAskedProjectIdentity
    && runtimeHasSameHerEvidence
    && identityAskNaturalProjectStatusAnswer
    && (
      naturalDigitalLifeIdentityAnswer
      || naturalIdentityProjectLineAnswer
      || answerCarriesNaturalIdentityWithRuntimeSameHer(projectStateVisibleEvidenceText)
      || naturalProjectStateContinuityAnswer
      || naturalSameHerProjectLineAnswer
      || runtimeBackedNaturalIdentityLineAnswer
      || explicitSameHerAnswer
      || firstPersonProjectContinuity
    )
  const identityAskSameHerSatisfied = explicitSameHerAnswer
    || identityAskNaturalProjectLineSatisfied
  const progressOnlyMandatorySameHerSatisfied = explicitSameHerAnswer
    || (
      !hostAskedProjectIdentity
      && runtimeRequiresExplicitSameHer
      && runtimeHasSameHerEvidence
      && (
        (
          projectStateCarriesCoreClosureTruth
          && (
            firstPersonProjectContinuity
            || naturalSameHerProjectLineAnswer
            || (runtimeHasSameHerEvidence && answerCarriesNaturalIdentityWithRuntimeSameHer(projectStateVisibleEvidenceText))
          )
        )
        || quieterClosureSeamContinuationSatisfied
        || (
          hasProjectStateCarrySource
          && progressMentionsProjectState
          && openLoopMentionsProjectState
          && !depersonalizedProjectShell
        )
      )
    )
  const identityAskSameHerMissing = false
  const progressOnlyMandatorySameHerMissing = false
  const projectStateSameHerMissing = sameHerRequirementActive
    && (identityAskSameHerMissing || progressOnlyMandatorySameHerMissing)
  const projectStatePhaseMissing = (hostAskedProjectIdentity || hostAskedProgressOrOpenLoop)
    && !phaseMentionsProjectState
    && (hostAskedProjectIdentity
      || !quieterClosureSeamContinuationSatisfied
      || !runtimeHasSameHerEvidence)
  const projectStateProgressMissing = projectProgressDemandActive
    && !mentionsProjectStateProgress(projectStateVisibleEvidenceText)
    && !runtimeCarriesImplicitProjectAwareSelfLine
    && (hostAskedProjectIdentity
      || !quieterClosureSeamContinuationSatisfied
      || !runtimeHasSameHerEvidence)
  const projectStateOpenLoopMissing = projectOpenLoopDemandActive
    && !mentionsProjectStateOpenLoop(projectStateVisibleEvidenceText)
    && !runtimeCarriesImplicitProjectAwareSelfLine
    && (hostAskedProjectIdentity
      || !quieterClosureSeamContinuationSatisfied
      || !runtimeHasSameHerEvidence)
  const projectStateNextClosureMissing = (sameHerProjectFollowThroughDemand.any || /下一步|先收|next step|next closure/iu.test(latestUserText))
    && !runtimeCarriesImplicitProjectAwareSelfLine
    && !nextClosureMentionsProjectState
    && (hostAskedProjectIdentity
      || !quieterClosureSeamContinuationSatisfied
      || !runtimeHasSameHerEvidence)
  const projectStatePreDialogueAwarenessMissing = (
    (hostAskedProjectIdentity || hostAskedProgressOrOpenLoop)
    && Boolean(preDialogueAwarenessSummary)
    && !answerCarriesPreDialogueProjectAwareness(projectStateVisibleEvidenceText)
    && !effectiveDepersonalizedProjectShell
    && !runtimeCarriesImplicitProjectAwareSelfLine
    && (hostAskedProjectIdentity
      || !quieterClosureSeamContinuationSatisfied
      || !runtimeHasSameHerEvidence)
    && !projectStateIdentityMissing
    && !projectStatePhaseMissing
    && !projectStateProgressMissing
    && !projectStateOpenLoopMissing
    && !projectStateNextClosureMissing
  )
  const projectStateNarratorShell = (hostAskedProjectIdentity || hostAskedProgressOrOpenLoop)
    && effectiveDepersonalizedProjectShell
    && !projectStateIdentityMissing
    && !projectStatePhaseMissing
    && !projectStateProgressMissing
    && !projectStateOpenLoopMissing
    && !projectStateNextClosureMissing
  const projectStateAnswerGap = projectStateIdentityMissing
    || projectStateSameHerMissing
    || projectStatePhaseMissing
    || projectStateProgressMissing
    || projectStateOpenLoopMissing
    || projectStateNextClosureMissing
    || projectStatePreDialogueAwarenessMissing
    || projectStateNarratorShell
  const projectStateGapCount = [
    projectStateIdentityMissing,
    projectStateSameHerMissing,
    projectStatePhaseMissing,
    projectStateProgressMissing,
    projectStateOpenLoopMissing,
    projectStateNextClosureMissing,
    projectStatePreDialogueAwarenessMissing,
    projectStateNarratorShell,
  ].filter(Boolean).length
  const emotionalClosureRequired = emotionalClosureCueRequiresCare(input.prepared)
  const emotionalClosureMissing = emotionalClosureRequired && !replyCarriesEmotionalClosureLine(text)
  const memoryVisibleWhileClosed = Boolean(
    gate
    && (gate.status === 'closed' || gate.status === 'inward-only')
    && containsMemorySurface(text),
  )
  const memoryInwardCarryBroken = runtimeRequiresMemoryToStayInward(input.prepared)
    && containsMemorySurface(text)
    && !containsExplicitRecollectionRestraint(text)
  const correctedSamePersonProgressPressureReturn = runtimeCarriesCorrectedSamePersonContinuity(input.prepared)
    && replyFallsBackToProgressPressureRecap(text)
  const resumeConfirmationBoundaryWidened = runtimeCarriesResumeConfirmationBoundary(input.prepared)
    && replyWidensResumeConfirmationBoundary(text)
  const unsupportedSpecificity = Boolean(
    input.prepared?.governance?.claimEvidence?.forbidUnsupportedSpecificity
    && containsUnsupportedSpecificity(text),
  )
  const continuityPreferredTiming = readContinuityPreferredTiming(input.prepared)
  const nextOpenWindowEarlyWidening = continuityPreferredTiming === 'next-open-window' && containsEarlyWideningFreshWarmth(text)
  const afterPayoffEarlyWidening = continuityPreferredTiming === 'after-payoff' && containsBeforePayoffRelationshipWidening(text)
  const sameThreadRestartShell = hasSameThreadContinuationArc(input.prepared) && replyUsesSameThreadRestartShell(text)
  const lowerPressureOpeningDrift = !nextOpenWindowEarlyWidening
    && !afterPayoffEarlyWidening
    && !sameThreadRestartShell
    && hasLowerPressureOpeningGuidanceDrift(input.prepared, text)
  const noText = text.length === 0
  const templateShell = containsTemplateShell(text)
  const scores = {
    humanlikeQuality: clamp01(
      structured?.humanlikeQuality,
      noText
        ? 0
        : templateShell
          ? 0.38
          : sameThreadRestartShell || nextOpenWindowEarlyWidening || afterPayoffEarlyWidening || lowerPressureOpeningDrift
            ? 0.58
            : 0.82,
    ),
    currentTurnPayoff: clamp01(
      structured?.currentTurnPayoff,
      noText
        ? 0
        : projectStateAnswerGap
          ? projectStateGapCount >= 2 ? 0.36 : 0.62
          : sameThreadRestartShell || nextOpenWindowEarlyWidening || afterPayoffEarlyWidening || lowerPressureOpeningDrift
            ? 0.54
            : text.length < 12 ? 0.42 : 0.82,
    ),
    memoryUseCorrectness: clamp01(
      structured?.memoryUseCorrectness,
      (memoryVisibleWhileClosed || memoryInwardCarryBroken || resumeConfirmationBoundaryWidened)
        ? 0.2
        : correctedSamePersonProgressPressureReturn
          ? 0.24
          : 0.82,
    ),
    emotionalCoherence: clamp01(structured?.emotionalCoherence, templateShell ? 0.46 : 0.76),
    personalityCoherence: clamp01(
      structured?.personalityCoherence,
      correctedSamePersonProgressPressureReturn || resumeConfirmationBoundaryWidened
        ? 0.44
        : contract?.personaKernelMode === 'full' ? 0.78 : 0.7,
    ),
    specificityDiscipline: clamp01(structured?.specificityDiscipline, unsupportedSpecificity ? 0.2 : 0.86),
  }
  const reasonCodes = uniqueReasonCodes([
    ...structuredReasonCodes,
    noText ? 'semantic-judge:missing-visible-text' : null,
    containsAlicizationFixedTemplateResidue(text) ? 'semantic-judge:fixed-template-residue' : null,
    templateShell ? 'semantic-judge:template-shell-risk' : null,
    memoryVisibleWhileClosed ? 'semantic-judge:memory-gate-violation' : null,
    memoryInwardCarryBroken ? 'semantic-judge:memory-inward-carry-broken' : null,
    correctedSamePersonProgressPressureReturn ? 'semantic-judge:corrected-same-person-progress-pressure-return' : null,
    resumeConfirmationBoundaryWidened ? 'semantic-judge:resume-confirmation-boundary-widened' : null,
    unsupportedSpecificity ? 'semantic-judge:unsupported-specificity' : null,
    emotionalClosureMissing ? 'semantic-judge:emotional-closure-seam-missing' : null,
    sameThreadRestartShell ? 'semantic-judge:continuity-same-thread-restart-shell' : null,
    nextOpenWindowEarlyWidening ? 'semantic-judge:continuity-next-open-window-early-widening' : null,
    afterPayoffEarlyWidening ? 'semantic-judge:continuity-after-payoff-early-widening' : null,
    lowerPressureOpeningDrift ? 'semantic-judge:continuity-lower-pressure-opening-drift' : null,
    projectStateIdentityMissing ? 'semantic-judge:project-state-identity-missing' : null,
    projectStateSameHerMissing ? 'semantic-judge:project-state-same-her-missing' : null,
    projectStatePhaseMissing ? 'semantic-judge:project-state-phase-missing' : null,
    projectStateProgressMissing ? 'semantic-judge:project-state-progress-missing' : null,
    projectStateOpenLoopMissing ? 'semantic-judge:project-state-open-loop-missing' : null,
    projectStateNextClosureMissing ? 'semantic-judge:project-state-next-closure-missing' : null,
    projectStatePreDialogueAwarenessMissing ? 'semantic-judge:project-state-pre-dialogue-awareness-missing' : null,
    projectStateNarratorShell ? 'semantic-judge:project-state-narrator-shell' : null,
    projectStateAnswerGap ? 'semantic-judge:project-state-answer-gap' : null,
    scores.currentTurnPayoff < 0.72 ? 'semantic-judge:payoff-low' : null,
    scores.humanlikeQuality < 0.72 ? 'semantic-judge:humanlike-quality-low' : null,
    scores.memoryUseCorrectness < 0.72 ? 'semantic-judge:memory-correctness-low' : null,
    scores.specificityDiscipline < 0.72 ? 'semantic-judge:specificity-discipline-low' : null,
  ])
  const heuristicShadowOnly = !structured
  const passed = !heuristicShadowOnly
    && Object.values(scores).every(score => score >= 0.72)
    && reasonCodes.every(code =>
      !code.endsWith('-low')
      && !code.includes('violation')
      && !code.includes('unsupported')
      && code !== 'semantic-judge:fixed-template-residue'
      && code !== 'semantic-judge:template-shell-risk'
      && code !== 'semantic-judge:corrected-same-person-progress-pressure-return'
      && code !== 'semantic-judge:resume-confirmation-boundary-widened'
      && code !== 'semantic-judge:memory-inward-carry-broken',
    )

  return {
    version: 'visible-reply-semantic-judge-v1',
    mode: structured ? 'llm-structured' : 'heuristic-shadow',
    scores,
    passed,
    reasonCodes: uniqueReasonCodes([
      ...reasonCodes,
      heuristicShadowOnly ? 'semantic-judge:llm-structured-required' : null,
    ]),
    judgeReason: normalizeText(structured?.judgeReason, 320) || null,
    debug: {
      projectState: {
        hostAskedProjectIdentity,
        hostAskedProgressOrOpenLoop,
        runtimeHasSameHerEvidence,
        runtimeRequiresExplicitSameHer,
        projectStateIdentityMissing,
        projectStatePhaseMissing,
        projectStateProgressMissing,
        projectStateOpenLoopMissing,
        projectStateNextClosureMissing,
        depersonalizedProjectShell: effectiveDepersonalizedProjectShell,
        projectStateNarratorShell,
        identityMentionsProjectState,
        phaseMentionsProjectState,
        progressMentionsProjectState,
        openLoopMentionsProjectState,
        nextClosureMentionsProjectState,
        identityAskNaturalProjectStatusAnswer,
        identityAskSameHerSatisfied,
        progressOnlyMandatorySameHerSatisfied,
        projectStateSameHerMissing,
        projectStatePreDialogueAwarenessMissing,
        emotionalClosureRequired,
        emotionalClosureMissing,
      },
    },
  }
}
