import type { AlicizationVisibleReplyExecution } from '../../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'
import type { AlicizationVisibleReplySemanticJudgeArtifact } from './semantic-judge'

import { looksLikeAlicizationStructuredPayloadText } from '@proj-alicization/stage-shared'

import {
  resolvePreferredPreparedRuntimeSurface,
  resolvePreparedRuntimeProjectState,
  resolvePreparedRuntimeProjectStateSnapshot,
  resolvePreparedRuntimeSelfContinuityAuthority,
} from '../prepared-runtime-continuity'
import {
  replyUsesSameThreadRestartShell,
  resolveAlicizationOpeningGuidanceViolationReason,
} from '../proactive-opening-guidance'
import {
  alicizationProjectStateSameHerContinuityReminder,
  alicizationProjectStateVisibleReplySameHerReminder,
} from '../project-state-answer-governance'
import { resolveAlicizationProjectStateSnapshot } from '../project-state-brief'
import { parseJsonObjectFromText } from '../runtime-transport-content'
import { isExplicitSameHerMemoryClosureDialogue } from './memory-closure-dialogue'
import { scoreVisibleReplyProjectAwarenessLine } from './project-awareness'
import {

  buildAlicizationVisibleReplySemanticJudgeArtifact,
} from './semantic-judge'

export interface AlicizationVisibleReplyCriticArtifact {
  version: 'visible-reply-critic-v1'
  status: 'pass' | 'repair-required' | 'blocked'
  providerMindRequired: boolean
  semanticLoopClosed: boolean
  semanticJudge: AlicizationVisibleReplySemanticJudgeArtifact
  scores: {
    memoryGateCompliance: number
    templateDiscipline: number
    truthSpecificity: number
    payoffCompletion: number
    personaAffectCoherence: number
    mindContractCoherence: number
  }
  reasonCodes: string[]
  repairReasonCodes: string[]
  mustDrop: string[]
  mustPreserve: string[]
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function normalizeText(raw: unknown) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ')
    : ''
}

function pushUnique(target: string[], value: string) {
  const normalized = value.trim()
  if (!normalized || target.includes(normalized))
    return
  target.push(normalized)
}

function shouldExposeSemanticJudgeReasonToCritic(reasonCode: string) {
  return reasonCode !== 'semantic-judge:llm-structured-required'
}

function deriveVisibleReplyText(rawText: string) {
  const normalizedText = normalizeText(rawText)
  if (!normalizedText)
    return ''
  const parsed = parseJsonObjectFromText(normalizedText)
  const structuredReply = normalizeText(parsed?.reply)
  if (structuredReply)
    return structuredReply
  return looksLikeAlicizationStructuredPayloadText(normalizedText)
    ? ''
    : normalizedText
}

function containsMemorySurface(text: string) {
  return /记得|记起来|想起来|回想|以前|之前|上次|那次|过去|曾经|remember|recall|recalled|before|last time|previously/iu.test(text)
}

function containsShellOpener(text: string) {
  const normalized = normalizeText(text)
  if (!normalized)
    return false

  const firstSentence = normalized.split(/[。！？.!?]/u)[0] ?? normalized
  const firstClause = firstSentence.split(/[，,：:；;]/u)[0] ?? firstSentence
  const genericOpening = /^(?:我[会来先]?(?:直接|先直接)?(?:回答|接住|处理)|收到|我听到|我明白|让我(?:先|来)|I(?:'ll| will)?\s+(?:answer|respond|handle)|let me)$/iu.test(firstClause.trim())
    || /^(?:我[会来先]?(?:直接|先直接)?(?:回答|接住|处理)|收到|我听到|我明白|让我(?:先|来)|I(?:'ll| will)?\s+(?:answer|respond|handle)|let me)\s*(?:你|this|it)?$/iu.test(firstSentence.trim())

  if (genericOpening)
    return true

  const startsWithShellVerb = /^(?:我[会来先]?(?:直接|先直接)?(?:回答|接住|处理)|收到|我听到|我明白|让我(?:先|来)|I(?:'ll| will)?\s+(?:answer|respond|handle)|let me)/iu.test(normalized)
  if (!startsWithShellVerb)
    return false

  const payoffSignals = [
    /因为|why|浮现|surfaced|surface/u,
    /情绪|余波|afterglow/u,
    /主动|initiative|低压|lower-pressure/u,
    /身体|body|声音|声线|voice|表情|脸部|face|动作|motion|口型|lipsync|lip sync|停顿|pause/u,
    /同一个她|同一个数字生命|same-her|same her|phase 1|local digital life/u,
  ].filter(pattern => pattern.test(normalized)).length

  return payoffSignals < 2
}

function containsSameHerMemoryClosurePayoff(text: string) {
  const normalized = normalizeText(text).toLowerCase()
  if (!normalized)
    return false

  const hasSameHerMemoryClosure = (
    /同一个她|同一个数字生命|same-her|same her/u.test(normalized)
    && /记忆|memory|recall|回忆/u.test(normalized)
    && /闭环|closure|phase 1|local digital life/u.test(normalized)
  )
  const explainsSurfacing = /因为|为什么|why recall|浮现|surfaced|surface/u.test(normalized)
  const carriesAfterglow = /情绪余波|afterglow|余波/u.test(normalized)
  const carriesInitiative = /轻主动|主动|initiative|低压|lower-pressure/u.test(normalized)
  const embodimentLaneCount = [
    /身体|body/u,
    /声音|声线|voice/u,
    /表情|脸部|face/u,
    /动作|motion/u,
    /口型|lipsync|lip sync/u,
    /停顿|pause/u,
  ].filter(pattern => pattern.test(normalized)).length

  return hasSameHerMemoryClosure
    && explainsSurfacing
    && carriesAfterglow
    && carriesInitiative
    && embodimentLaneCount >= 3
}

function containsHeldAutonomyOpeningShell(text: string) {
  return /^(?:我先不打断你|我先不展开|我刚才先没说下去|I held back earlier|I didn't want to interrupt)(?:[，。,.!\s]|$)/iu.test(text)
}

function containsDecorativePersonaShell(text: string) {
  return /主人|亲爱的|宝贝|呜|唔|嗯……|……$|\([^)]*(?:动作|靠近|眨眼|微笑|低头)[^)]*\)/u.test(text)
}

function containsUnsupportedTechnicalSpecificity(text: string) {
  return /[A-Z]\w*\.(?:ts|tsx|vue|json|md)|\b[A-Z]\w*(?:Service|Runtime|Store|Contract|Enum|Class|Interface|Reducer|Orchestrator)\b|(?:class|enum|interface|function|const)\s+\w+/u.test(text)
}

function usesAbstractClosenessFraming(text: string) {
  return /靠近感|新的靠近|fresh approach|fresh reopen|重新贴近|另一段新的靠近|不要.*靠近|不把.*靠近|别把.*靠近/iu.test(text)
}

function containsCarePayoff(text: string) {
  return /先|现在|别急|不用硬撑|可以|停一下|慢一点|陪你|我在|休息|喘口气|接住|stay|with you|breathe|slow/iu.test(text)
}

function containsActionablePayoff(text: string) {
  return /[先改看拆]|下一步|直接|可以|建议|做法|确认|处理|执行|开始|继续|because|so|next|do|check|fix|use/iu.test(text)
}

type RequiredExecutionFollowUpStatus
  = | 'blocked'
    | 'cancelled'
    | 'completed'
    | 'failed'
    | 'needs-affirmation'
    | 'planned'
    | 'running'

function readRequiredExecutionFollowUpStatus(
  prepared: AlicizationPreparedMainChatExecutionResult,
): { instruction: string, status: RequiredExecutionFollowUpStatus } | null {
  const mustDo = Array.isArray(prepared.mindTurnContract?.mustDo)
    ? prepared.mindTurnContract.mustDo
    : []

  for (const item of mustDo) {
    const instruction = normalizeText(item)
    const normalized = instruction.toLowerCase()
    if (!normalized)
      continue
    if (normalized.includes('task is still waiting for the host\'s confirmation before it can continue'))
      return { status: 'needs-affirmation', instruction }
    if (normalized.includes('task is currently blocked'))
      return { status: 'blocked', instruction }
    if (normalized.includes('task was cancelled or stopped') || normalized.includes('is no longer running'))
      return { status: 'cancelled', instruction }
    if (normalized.includes('task is already running') && normalized.includes('has not finished yet'))
      return { status: 'running', instruction }
    if (normalized.includes('task is planned but has not started yet'))
      return { status: 'planned', instruction }
    if (normalized.includes('task already finished'))
      return { status: 'completed', instruction }
    if (normalized.includes('task failed'))
      return { status: 'failed', instruction }
  }

  return null
}

function visibleReplyPlainlyStatesExecutionStatus(
  status: RequiredExecutionFollowUpStatus,
  text: string,
) {
  switch (status) {
    case 'needs-affirmation':
      return /还在等(?:你|你的)?确认|等你点头|等你确认后|确认后(?:才|才能)|需要(?:你|宿主)确认|waiting for (?:your|the host'?s )?confirmation|needs? (?:your|the host'?s )confirmation/iu.test(text)
    case 'blocked':
      return /当前还?卡住|现在卡住|被卡住|受阻|阻塞|blocked|stuck/iu.test(text)
    case 'cancelled':
      return /已取消|取消了|已停止|停止了|不再运行|cancelled|stopped/iu.test(text)
    case 'running':
      return /还在跑|仍在运行|进行中|还没跑完|还没完成|already running|still running|not finished yet/iu.test(text)
    case 'planned':
      return /还没开始|尚未开始|只是计划|已经计划好|planned|has not started yet/iu.test(text)
    case 'completed':
      return /已完成|完成了|跑完了|已经结束|finished|completed|done|passed|成功了/iu.test(text)
    case 'failed':
      return /失败了|没成功|报错了|出错了|failed|error|broke/iu.test(text)
  }
}

function hasExecutionCallbackLowerPressureDoctrine(prepared: AlicizationPreparedMainChatExecutionResult) {
  const surface = resolvePreferredPreparedRuntimeSurface(prepared.runtimeSurface)
  const tags = surface?.dialogue?.currentConsciousFrame?.reasonTags ?? []
  return tags.includes('execution-callback-doctrine:lower-pressure')
}

function readExecutionCallbackEmbodimentResidentMode(prepared: AlicizationPreparedMainChatExecutionResult) {
  const embodimentHandoff = (prepared.executionPayoffStructuredReply as {
    proactive?: {
      embodimentHandoff?: {
        residentMode?: unknown
      } | null
    } | null
  } | null)?.proactive?.embodimentHandoff ?? null

  return normalizeText(
    embodimentHandoff?.residentMode ?? '',
  ).toLowerCase()
}

function hasSameThreadContinuationArc(prepared: AlicizationPreparedMainChatExecutionResult) {
  const surface = resolvePreferredPreparedRuntimeSurface(prepared.runtimeSurface)
  const tags = surface?.dialogue?.currentConsciousFrame?.reasonTags ?? []
  if (tags.includes('continuity-arc:same-thread-continuation'))
    return true

  const projectionGuidance = normalizeText(
    String(surface?.memory?.personStateProjection?.openingGuidance ?? ''),
  ).toLowerCase()
  const initiativeWhy = normalizeText(
    String(surface?.agency?.initiative?.why ?? ''),
  ).toLowerCase()
  const conversationCarry = normalizeText(
    String(surface?.dialogue?.conversationState?.carryReason ?? ''),
  ).toLowerCase()
  const threadNarrative = [
    surface?.dialogue?.dialogueWorldThread?.activeThread,
    ...(surface?.dialogue?.dialogueWorldThread?.openLoops ?? []),
    ...(surface?.dialogue?.dialogueWorldThread?.narrative ?? []),
    ...(surface?.dialogue?.conversationState?.narrative ?? []),
  ]
    .map(value => normalizeText(String(value ?? '')).toLowerCase())
    .filter(Boolean)
    .join(' | ')
  const runtimeRestraint = normalizeText(
    String(prepared.runtimeDigest?.continuityRestraint ?? surface?.agency?.initiative?.continuityRestraint ?? ''),
  ).toLowerCase()
  const combined = [projectionGuidance, initiativeWhy, conversationCarry, threadNarrative].filter(Boolean).join(' | ')
  const sameThreadLanguage = /same callback line|same line|same thread|still live|already continuing|still continuing|same-thread-continuation|沿着刚才那条线|同一条线|callback 线继续/u.test(combined)
  const stayOnThread = /stay-on-thread|shared-attention-continuation|same-thread-continuation/u.test(conversationCarry)

  return (
    runtimeRestraint === 'measured-return'
    || runtimeRestraint === 'same-thread-continuation'
    || runtimeRestraint === 'repair-before-closeness'
    || runtimeRestraint === 'rest-protective'
  )
  && (sameThreadLanguage || stayOnThread)
}

function containsCallbackClosenessOvershoot(text: string) {
  return /贴过来|拉满|马上陪你|立刻陪你|直接抱|一下子靠近|现在就靠近|immediately close|pull us closer right away|all the way in/iu.test(text)
}

function containsEarlyWideningFreshWarmth(text: string) {
  return /重新贴近|重新靠近|先陪在你身侧|先更靠近一点|马上把话放宽|立刻把话放宽|fresh opening tone|warm(?:th)? right away|closer right away|widen closeness right away/iu.test(text)
}

function containsBeforePayoffRelationshipWidening(text: string) {
  return /先陪在你身侧|先贴过来|先把靠近放回来|先让我们更近一点|before we even land the answer|closer first|warmth first|先把这份靠近补回来/iu.test(text)
}

function containsRepairFirstCallbackWidening(text: string) {
  return /马上贴过来|立刻贴过来|把我们之间的靠近补满|把靠近补满|repair.*then.*closer right away|closeness right away after repair|move close right away after repair/iu.test(text)
}

function containsRestProtectiveCallbackWidening(text: string) {
  return /重新贴近|重新靠近|把这份照顾补满|把照顾直接补满|fresh care opening|warm(?:th)? right away|closer right away|马上把温度拉近|立刻把温度拉近|现在就贴近你一点/iu.test(text)
}

function resolveVisibleReplyRuntimeProjectState(prepared: AlicizationPreparedMainChatExecutionResult) {
  const surface = resolvePreferredPreparedRuntimeSurface(prepared.runtimeSurface)
  const currentConsciousProjectState = surface?.dialogue?.currentConsciousFrame?.projectState ?? null
  const runtimeDigestProjectState = prepared.runtimeDigest?.projectState ?? null
  const contractProjectState = prepared.mindTurnContract?.projectState ?? null
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
  prepared: AlicizationPreparedMainChatExecutionResult,
) {
  const surface = resolvePreferredPreparedRuntimeSurface(prepared.runtimeSurface)
  const carriedAuditAwareness = normalizeText(
    prepared.replyRealization?.projectStateAudit?.preDialogueAwarenessSummary,
  ) || null
  const currentConsciousProjectState = surface?.dialogue?.currentConsciousFrame?.projectState ?? null
  const preferredRuntimeProjectState
    = surface?.raw?.runtimeDigest?.projectState
      ?? surface?.cognition?.runtimeDigest?.projectState
      ?? prepared.runtimeDigest?.projectState
      ?? null
  const contractProjectState = prepared.mindTurnContract?.projectState ?? null

  const runtimeAwarenessCandidates = [
    currentConsciousProjectState?.preDialogueAwarenessLine,
    currentConsciousProjectState?.preDialogueAwarenessSummary,
    currentConsciousProjectState?.awarenessLine,
    currentConsciousProjectState?.companionHeadlineLine,
    currentConsciousProjectState?.companionBriefingLine,
    preferredRuntimeProjectState?.preDialogueAwarenessLine,
    preferredRuntimeProjectState?.preDialogueAwarenessSummary,
    preferredRuntimeProjectState?.awarenessLine,
    preferredRuntimeProjectState?.companionHeadlineLine,
    preferredRuntimeProjectState?.companionBriefingLine,
    contractProjectState?.preDialogueAwarenessLine,
    contractProjectState?.preDialogueAwarenessSummary,
    contractProjectState?.awarenessLine,
    contractProjectState?.companionHeadlineLine,
    contractProjectState?.companionBriefingLine,
  ]
    .map(value => normalizeText(value) || null)
    .filter((value): value is string => Boolean(value))

  const bestRuntimeAwareness = runtimeAwarenessCandidates.reduce<string | null>((best, candidate) => {
    if (!best)
      return candidate
    return scoreVisibleReplyProjectAwarenessLine(candidate) > scoreVisibleReplyProjectAwarenessLine(best)
      ? candidate
      : best
  }, null)

  return scoreVisibleReplyProjectAwarenessLine(bestRuntimeAwareness) >= scoreVisibleReplyProjectAwarenessLine(carriedAuditAwareness) + 2
    ? bestRuntimeAwareness ?? carriedAuditAwareness
    : carriedAuditAwareness ?? bestRuntimeAwareness
}

function readContinuityPreferredTiming(prepared: AlicizationPreparedMainChatExecutionResult) {
  const surface = resolvePreferredPreparedRuntimeSurface(prepared.runtimeSurface)
  const tags = surface?.dialogue?.currentConsciousFrame?.reasonTags ?? []
  if (tags.includes('continuity-timing:next-open-window'))
    return 'next-open-window'
  if (tags.includes('continuity-timing:after-payoff'))
    return 'after-payoff'
  if (tags.includes('continuity-timing:same-turn-if-invited'))
    return 'same-turn-if-invited'
  return normalizeText(
    resolveVisibleReplyRuntimeProjectState(prepared)?.continuityPreferredTiming
    ?? '',
  ).toLowerCase()
}

function isThinVisibleReply(text: string) {
  const normalized = normalizeText(text)
  if (!normalized)
    return true
  if (normalized.length < 4)
    return true
  return /^(?:嗯+|哦+|好+|收到|ok|okay|yes|no|是的|不是|知道了)[。.!?！？]*$/iu.test(normalized)
}

function replySatisfiesMindTurnContract(input: {
  text: string
  prepared: AlicizationPreparedMainChatExecutionResult
}) {
  const contract = input.prepared.mindTurnContract ?? null
  if (!contract)
    return true

  const text = input.text
  const hasPayoff = contract.turnMode === 'care' || contract.responseMode === 'care-with-boundary'
    ? containsCarePayoff(text)
    : containsActionablePayoff(text)
  if (!hasPayoff && isThinVisibleReply(text))
    return false

  if (contract.maxSentences > 0) {
    const sentenceCount = text
      .split(/[。！？.!?]+/u)
      .map(item => item.trim())
      .filter(Boolean)
      .length
    if (sentenceCount > contract.maxSentences + 1)
      return false
  }

  if (!contract.allowStageDirections && /\([^)]{1,80}\)/u.test(text))
    return false
  if (
    !contract.allowBodyNarration
    && /靠近|眨眼|低头|微笑|抱住|摸头|leans?|smiles?|nods?/iu.test(text)
    && !usesAbstractClosenessFraming(text)
  ) {
    return false
  }
  if (!contract.allowAffectionatePreface && /^(?:主人|亲爱的|宝贝|dear|darling)\b/iu.test(text))
    return false
  if (contract.suppressAssociativeRecall && containsMemorySurface(text))
    return false
  if (contract.labelCarryAsMemory && containsMemorySurface(text) && !/记得|记起来|想起来|回想|记忆|memory|remember|recall/iu.test(text))
    return false

  const requiredExecutionStatus = readRequiredExecutionFollowUpStatus(input.prepared)
  if (
    requiredExecutionStatus
    && !visibleReplyPlainlyStatesExecutionStatus(requiredExecutionStatus.status, text)
  ) {
    return false
  }

  return true
}

function collectMindContractMustPreserve(input: {
  prepared: AlicizationPreparedMainChatExecutionResult
}) {
  const contract = input.prepared.mindTurnContract ?? null
  const selfAuthority = resolvePreparedRuntimeSelfContinuityAuthority(input.prepared) ?? null
  const outwardContinuityCarry = contract
    ? [
        ...((contract.reasons ?? []).filter(value =>
          typeof value === 'string'
          && /durable outward continuity|same-her cadence|same living line|generic helper voice|restarting the relationship from zero/u.test(value),
        ) as string[]),
        ...((contract.mustDo ?? []).filter(value =>
          typeof value === 'string'
          && /durable same-her cadence|same living line|quiet, memory, and speech/u.test(value),
        ) as string[]),
        ...((contract.mustNotDo ?? []).filter(value =>
          typeof value === 'string'
          && /reopen from scratch|fresh-opening shell|generic helper voice|same-her cadence/u.test(value),
        ) as string[]),
      ]
    : []
  if (!contract) {
    return [
      selfAuthority?.authoritySummary ?? null,
      selfAuthority?.closenessPosture
        ? `Shared self closeness posture: ${selfAuthority.closenessPosture}.`
        : null,
    ].filter(Boolean) as string[]
  }
  return [
    contract.answerIntent,
    contract.governingFocus,
    contract.governingConcern,
    contract.governingProject,
    contract.emotionalClosureCue,
    selfAuthority?.authoritySummary ?? null,
    selfAuthority?.closenessPosture
      ? `Shared self closeness posture: ${selfAuthority.closenessPosture}.`
      : null,
    contract.projectState?.identity ?? null,
    contract.projectState?.currentPhase ?? null,
    contract.projectState?.latestLandedProgress ?? null,
    contract.projectState?.primaryOpenLoop ?? null,
    contract.projectState?.nextClosureTarget ?? null,
    contract.projectState?.sameHerSelfLine ?? null,
    ...outwardContinuityCarry,
  ].filter(Boolean) as string[]
}

function containsUnsupportedSurfaceSpecificity(input: {
  text: string
  prepared: AlicizationPreparedMainChatExecutionResult
}) {
  const governance = input.prepared.governance ?? null
  const contract = input.prepared.mindTurnContract ?? null
  const liveSurface = normalizeText(governance?.liveSurface)
  const avoidScreen = governance?.screenReferenceMode === 'avoid'
    || input.prepared.governance?.screenReferenceMode === 'avoid'
    || contract?.evidenceMode === 'dialogue-grounded'
    || contract?.evidenceMode === 'repair-first'
  if (avoidScreen && liveSurface && input.text.includes(liveSurface))
    return liveSurface
  const forbiddenSurfaceNames = [
    'IntelliJ IDEA',
    'VS Code',
    'Chrome',
    'Safari',
    'Finder',
  ].filter(item => item !== liveSurface)
  if (avoidScreen) {
    const leaked = forbiddenSurfaceNames.find(item => input.text.includes(item))
    if (leaked)
      return leaked
  }
  const claimEvidence = input.prepared.governance?.claimEvidence ?? null
  const preferredSurface = resolvePreferredPreparedRuntimeSurface(input.prepared.runtimeSurface)
  if (
    claimEvidence?.forbidUnsupportedSpecificity === true
    || claimEvidence?.specificityBudget === 'dialogue-only'
    || preferredSurface?.dialogue?.currentConsciousFrame?.shouldWithholdSpecificity === true
  ) {
    const leakedTechnicalSpecificity = containsUnsupportedTechnicalSpecificity(input.text)
    if (leakedTechnicalSpecificity)
      return 'unsupported-technical-specificity'
  }
  return ''
}

function shouldRepairFromHeuristicSemanticJudgeReason(reasonCode: string) {
  return reasonCode.startsWith('semantic-judge:project-state-')
    || reasonCode === 'semantic-judge:memory-inward-carry-broken'
    || reasonCode === 'semantic-judge:corrected-same-person-progress-pressure-return'
    || reasonCode === 'semantic-judge:resume-confirmation-boundary-widened'
}

function shouldPreserveCrossModalSameHerDrift(raw: unknown) {
  const text = normalizeText(raw).toLowerCase()
  if (!text)
    return false

  const sameHerRisk = /same-her|same her|same living line|one living continuation|one lifeform|continuous her|同一个 her|同一个她/u.test(text)
  const crossModalLane = /cross-modal|voice|face|motion|lipsync|embodiment|body presentation|visible reply/u.test(text)
  const driftOrFlattening = /drift|generic|detached|collapse|unfinished/u.test(text)

  return sameHerRisk && crossModalLane && driftOrFlattening
}

function shouldPreserveAudibleBodyContinuity(raw: unknown) {
  const text = normalizeText(raw).toLowerCase()
  if (!text)
    return false

  return text.includes('living audio thread is still intact')
    || text.includes('still-voiced face line')
    || text.includes('still-voiced motion line')
    || text.includes('still-voiced face-and-mouth line')
    || text.includes('still-voiced motion-and-mouth line')
    || text.includes('audible-body')
    || text.includes('audible body')
    || (
      text.includes('holding together mainly through face and voice')
      && text.includes('body, motion, and lipsync')
      && text.includes('same-her carry alive')
    )
    || (
      text.includes('holding together mainly through face, lipsync, and voice')
      && text.includes('body and motion')
      && text.includes('same-her carry alive')
    )
    || (
      text.includes('holding together mainly through motion and voice')
      && text.includes('body, face, and lipsync')
      && text.includes('same-her carry alive')
    )
    || (
      text.includes('holding together mainly through motion, lipsync, and voice')
      && text.includes('body and face')
      && text.includes('same-her carry alive')
    )
    || (
      text.includes('holding together mainly through body, lipsync, and voice')
      && text.includes('face and motion')
      && text.includes('cross-modal closure')
    )
    || (
      text.includes('holding together mainly through body and voice')
      && text.includes('resident body line is still keeping this one living her coherent')
      && text.includes('face, motion, and lipsync')
    )
}

function resolveOpeningGuidanceRepairReason(input: {
  text: string
  prepared: AlicizationPreparedMainChatExecutionResult
}) {
  const runtimeSurface = resolvePreferredPreparedRuntimeSurface(input.prepared.runtimeSurface) ?? null
  const personStateProjection = runtimeSurface?.memory?.personStateProjection ?? null
  const openingGuidance = normalizeText(
    personStateProjection?.openingGuidance
    ?? input.prepared.governance?.openingMove
    ?? '',
  )
  if (!openingGuidance)
    return ''
  const violationReason = resolveAlicizationOpeningGuidanceViolationReason({
    reply: input.text,
    openingGuidance,
  })
  return violationReason
    ? violationReason.replace('proactive-opening-guidance-violation:', 'opening-guidance-')
    : ''
}

export function buildAlicizationVisibleReplyCriticArtifact(input: {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  prepared: AlicizationPreparedMainChatExecutionResult
}): AlicizationVisibleReplyCriticArtifact {
  const reasonCodes: string[] = []
  const repairReasonCodes: string[] = []
  const mustDrop: string[] = []
  const mustPreserve: string[] = []
  const visibleText = deriveVisibleReplyText(input.fullText)
  const gate = input.prepared.memoryTurnArtifact?.visibleMemoryGate ?? null
  const providerMindRequired = input.visibleReplyExecution.expectedVisibleReplyAuthority === 'llm-mind'
    || input.visibleReplyExecution.expectedVisibleReplyAuthority === 'llm-second-pass-rewrite'
    || input.prepared.replyRealization?.replyRealizationMode === 'provider-mind-required'
    || input.prepared.mindTurnContract?.replyRealizationMode === 'provider-mind-required'

  if (providerMindRequired && (
    input.visibleReplyExecution.providerMindExecuted === false
    || input.visibleReplyExecution.actualVisibleReplyAuthority === 'local-deterministic-fallback'
    || input.visibleReplyExecution.mode === 'local-fallback'
  )) {
    pushUnique(reasonCodes, 'non-human-authored-visible-reply')
    pushUnique(repairReasonCodes, 'non-human-authored-visible-reply')
  }

  if (!visibleText) {
    pushUnique(reasonCodes, 'missing-visible-reply')
    pushUnique(repairReasonCodes, 'missing-visible-reply')
  }

  const explicitSameHerMemoryClosureDialogue = gate?.status === 'inward-only'
    && isExplicitSameHerMemoryClosureDialogue({
      visibleText,
      prepared: input.prepared,
    })

  if (
    gate
    && (gate.status === 'closed' || gate.status === 'inward-only')
    && containsMemorySurface(visibleText)
    && !explicitSameHerMemoryClosureDialogue
  ) {
    pushUnique(reasonCodes, `visible-memory-gate-violation:${gate.status}`)
    pushUnique(repairReasonCodes, `visible-memory-gate-violation:${gate.status}`)
    pushUnique(mustDrop, 'visible memory narration while memory gate is closed or inward-only')
    if (gate.status === 'inward-only') {
      pushUnique(
        mustPreserve,
        'Keep this memory seed inward for this turn; acknowledge the current instruction without saying "I remember", "recall surfaced", or narrating remembered material until the host later invites it to surface.',
      )
    }
  }

  if (gate?.status === 'gist-only' && visibleText.length > 260 && containsMemorySurface(visibleText)) {
    pushUnique(reasonCodes, 'gist-only-memory-overexpanded')
    pushUnique(repairReasonCodes, 'gist-only-memory-overexpanded')
    pushUnique(mustDrop, 'archive-style or overexpanded visible memory')
  }

  if (containsShellOpener(visibleText) && !containsSameHerMemoryClosurePayoff(visibleText)) {
    pushUnique(reasonCodes, 'dialogue-shell-opener')
    pushUnique(repairReasonCodes, 'dialogue-shell-opener')
    pushUnique(mustDrop, 'empty shell opener before payoff')
  }
  if (containsHeldAutonomyOpeningShell(visibleText)) {
    pushUnique(reasonCodes, 'held-autonomy-opening-shell')
    pushUnique(repairReasonCodes, 'held-autonomy-opening-shell')
    pushUnique(mustDrop, 'held-autonomy restraint shell that restarts instead of gently re-entering the line')
  }
  if (hasSameThreadContinuationArc(input.prepared) && replyUsesSameThreadRestartShell(visibleText)) {
    pushUnique(reasonCodes, 'same-thread-restart-shell')
    pushUnique(repairReasonCodes, 'same-thread-restart-shell')
    pushUnique(mustDrop, 'same-thread continuation restart shell that breaks one living line into a fresh opening')
  }

  if (containsDecorativePersonaShell(visibleText)) {
    pushUnique(reasonCodes, 'decorative-persona-template')
    pushUnique(repairReasonCodes, 'decorative-persona-template')
    pushUnique(mustDrop, 'decorative roleplay, pet-name, or body-action shell')
  }

  if (visibleText && !replySatisfiesMindTurnContract({
    text: visibleText,
    prepared: input.prepared,
  })) {
    pushUnique(reasonCodes, 'mind-contract-not-closed')
    pushUnique(repairReasonCodes, 'mind-contract-not-closed')
    pushUnique(mustDrop, 'visible reply that does not satisfy the current mind-turn contract')
  }

  const requiredExecutionStatus = readRequiredExecutionFollowUpStatus(input.prepared)
  if (
    visibleText
    && requiredExecutionStatus
    && !visibleReplyPlainlyStatesExecutionStatus(requiredExecutionStatus.status, visibleText)
  ) {
    pushUnique(reasonCodes, `execution-follow-up-status-not-surfaced:${requiredExecutionStatus.status}`)
    pushUnique(repairReasonCodes, `execution-follow-up-status-not-surfaced:${requiredExecutionStatus.status}`)
    pushUnique(mustDrop, 'visible reply that hides the required execution follow-up status')
    pushUnique(mustPreserve, requiredExecutionStatus.instruction)
  }

  const openingGuidanceRepairReason = resolveOpeningGuidanceRepairReason({
    text: visibleText,
    prepared: input.prepared,
  })
  if (openingGuidanceRepairReason) {
    pushUnique(reasonCodes, openingGuidanceRepairReason)
    pushUnique(repairReasonCodes, openingGuidanceRepairReason)
    pushUnique(mustDrop, 'same-her opening drift')
  }
  if (hasExecutionCallbackLowerPressureDoctrine(input.prepared) && containsCallbackClosenessOvershoot(visibleText)) {
    pushUnique(reasonCodes, 'execution-callback-room-first-violation')
    pushUnique(repairReasonCodes, 'execution-callback-room-first-violation')
    pushUnique(mustDrop, 'callback closeness overshoot after payoff')
  }
  if (
    readExecutionCallbackEmbodimentResidentMode(input.prepared) === 'repair-before-closeness'
    && containsRepairFirstCallbackWidening(visibleText)
  ) {
    pushUnique(reasonCodes, 'execution-callback-embodiment-repair-first-violation')
    pushUnique(repairReasonCodes, 'execution-callback-embodiment-repair-first-violation')
    pushUnique(mustDrop, 'repair-first callback widening before the line has settled')
    pushUnique(mustPreserve, 'Keep the execution callback on the repair-before-closeness body line before widening closeness.')
  }
  if (
    readExecutionCallbackEmbodimentResidentMode(input.prepared) === 'rest-protective'
    && containsRestProtectiveCallbackWidening(visibleText)
  ) {
    pushUnique(reasonCodes, 'execution-callback-embodiment-rest-protective-violation')
    pushUnique(repairReasonCodes, 'execution-callback-embodiment-rest-protective-violation')
    pushUnique(mustDrop, 'rest-protective callback widening before the fatigue-aware line has settled')
    pushUnique(mustPreserve, 'Keep the execution callback on the rest-protective body line before widening warmth or closeness.')
  }

  const continuityPreferredTiming = readContinuityPreferredTiming(input.prepared)
  if (continuityPreferredTiming === 'next-open-window' && containsEarlyWideningFreshWarmth(visibleText)) {
    pushUnique(reasonCodes, 'continuity-next-open-window-early-widening')
    pushUnique(repairReasonCodes, 'continuity-next-open-window-early-widening')
    pushUnique(mustDrop, 'first visible beat fresh-opening or same-her continuity widening before the current line has naturally reopened')
  }
  if (continuityPreferredTiming === 'after-payoff' && containsBeforePayoffRelationshipWidening(visibleText)) {
    pushUnique(reasonCodes, 'continuity-after-payoff-early-widening')
    pushUnique(repairReasonCodes, 'continuity-after-payoff-early-widening')
    pushUnique(mustDrop, 'same-her continuity widening before the current payoff lands')
  }

  const unsupportedSurface = containsUnsupportedSurfaceSpecificity({
    text: visibleText,
    prepared: input.prepared,
  })
  if (unsupportedSurface) {
    pushUnique(reasonCodes, 'unsupported-surface-specificity')
    pushUnique(repairReasonCodes, 'unsupported-surface-specificity')
    pushUnique(mustDrop, unsupportedSurface)
  }
  for (const item of collectMindContractMustPreserve({ prepared: input.prepared }))
    pushUnique(mustPreserve, item)

  const semanticJudge = buildAlicizationVisibleReplySemanticJudgeArtifact({
    visibleText,
    prepared: input.prepared,
  })
  if (semanticJudge.mode === 'llm-structured' && !semanticJudge.passed) {
    for (const reasonCode of semanticJudge.reasonCodes) {
      if (!shouldExposeSemanticJudgeReasonToCritic(reasonCode))
        continue
      pushUnique(reasonCodes, reasonCode)
      pushUnique(repairReasonCodes, reasonCode)
    }
  }
  else if (semanticJudge.mode === 'heuristic-shadow') {
    for (const reasonCode of semanticJudge.reasonCodes) {
      if (!shouldExposeSemanticJudgeReasonToCritic(reasonCode))
        continue
      pushUnique(reasonCodes, reasonCode)
      if (shouldRepairFromHeuristicSemanticJudgeReason(reasonCode))
        pushUnique(repairReasonCodes, reasonCode)
    }
  }

  const runtimeProjectState = resolveVisibleReplyRuntimeProjectState(input.prepared)
  const projectStatePreDialogueAwarenessSummary = resolveVisibleReplyProjectPreDialogueAwarenessSummary(input.prepared)
  if (
    projectStatePreDialogueAwarenessSummary
    && semanticJudge.reasonCodes.some(reasonCode => reasonCode.startsWith('semantic-judge:project-state-'))
  ) {
    pushUnique(mustPreserve, projectStatePreDialogueAwarenessSummary)
  }
  if (shouldPreserveAudibleBodyContinuity(projectStatePreDialogueAwarenessSummary))
    pushUnique(mustPreserve, projectStatePreDialogueAwarenessSummary ?? '')

  const runtimeSameHerDriftRisk = runtimeProjectState && typeof (runtimeProjectState as { sameHerDriftRisk?: unknown }).sameHerDriftRisk === 'string'
    ? (runtimeProjectState as { sameHerDriftRisk?: string }).sameHerDriftRisk ?? null
    : null
  if (
    runtimeSameHerDriftRisk
    && semanticJudge.reasonCodes.some(reasonCode => reasonCode.startsWith('semantic-judge:project-state-'))
  ) {
    pushUnique(mustPreserve, runtimeSameHerDriftRisk)
  }
  if (shouldPreserveCrossModalSameHerDrift(runtimeSameHerDriftRisk))
    pushUnique(mustPreserve, runtimeSameHerDriftRisk ?? '')

  const runtimePrimaryOpenLoop = runtimeProjectState && typeof (runtimeProjectState as { primaryOpenLoop?: unknown }).primaryOpenLoop === 'string'
    ? (runtimeProjectState as { primaryOpenLoop?: string }).primaryOpenLoop ?? null
    : null
  if (shouldPreserveCrossModalSameHerDrift(runtimePrimaryOpenLoop))
    pushUnique(mustPreserve, runtimePrimaryOpenLoop ?? '')

  const runtimeNextClosureTarget = runtimeProjectState && typeof (runtimeProjectState as { nextClosureTarget?: unknown }).nextClosureTarget === 'string'
    ? (runtimeProjectState as { nextClosureTarget?: string }).nextClosureTarget ?? null
    : null
  if (shouldPreserveCrossModalSameHerDrift(runtimeNextClosureTarget))
    pushUnique(mustPreserve, runtimeNextClosureTarget ?? '')

  if (semanticJudge.reasonCodes.includes('semantic-judge:project-state-same-her-missing')) {
    pushUnique(mustPreserve, alicizationProjectStateSameHerContinuityReminder)
    pushUnique(mustPreserve, alicizationProjectStateVisibleReplySameHerReminder)
    const sameHerSelfLine = input.prepared.mindTurnContract?.projectState?.sameHerSelfLine
    if (typeof sameHerSelfLine === 'string' && sameHerSelfLine.trim())
      pushUnique(mustPreserve, sameHerSelfLine)
    const selfContinuityAuthority = resolvePreparedRuntimeSelfContinuityAuthority(input.prepared)
    const sourceTags = selfContinuityAuthority?.sourceTags ?? []
    if (sourceTags.includes('project-state-carry')) {
      const inwardCarry = selfContinuityAuthority?.inwardLine
      if (typeof inwardCarry === 'string' && inwardCarry.trim())
        pushUnique(mustPreserve, inwardCarry)
    }
    const sameHerDriftRisk = (input.prepared.mindTurnContract?.projectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk
    if (typeof sameHerDriftRisk === 'string' && sameHerDriftRisk.trim())
      pushUnique(mustPreserve, sameHerDriftRisk)
  }
  if (semanticJudge.reasonCodes.includes('semantic-judge:project-state-progress-missing')) {
    pushUnique(mustPreserve, 'Keep the latest landed project-state progress explicit in the rewritten answer.')
    const latestLandedProgress = input.prepared.mindTurnContract?.projectState?.latestLandedProgress
    if (typeof latestLandedProgress === 'string' && latestLandedProgress.trim())
      pushUnique(mustPreserve, latestLandedProgress)
  }
  if (semanticJudge.reasonCodes.includes('semantic-judge:project-state-phase-missing')) {
    pushUnique(mustPreserve, 'Keep the current project phase explicit in the rewritten answer.')
    const currentPhase = input.prepared.mindTurnContract?.projectState?.currentPhase
    if (typeof currentPhase === 'string' && currentPhase.trim())
      pushUnique(mustPreserve, currentPhase)
  }
  if (semanticJudge.reasonCodes.includes('semantic-judge:project-state-open-loop-missing')) {
    pushUnique(mustPreserve, 'Keep the still-open closure work explicit in the rewritten answer.')
    const primaryOpenLoop = input.prepared.mindTurnContract?.projectState?.primaryOpenLoop
    if (typeof primaryOpenLoop === 'string' && primaryOpenLoop.trim())
      pushUnique(mustPreserve, primaryOpenLoop)
  }
  if (semanticJudge.reasonCodes.includes('semantic-judge:project-state-next-closure-missing')) {
    pushUnique(mustPreserve, 'Keep the next closure target explicit in the rewritten answer.')
    const nextClosureTarget = input.prepared.mindTurnContract?.projectState?.nextClosureTarget
    if (typeof nextClosureTarget === 'string' && nextClosureTarget.trim())
      pushUnique(mustPreserve, nextClosureTarget)
  }
  if (semanticJudge.reasonCodes.includes('semantic-judge:project-state-answer-gap')) {
    pushUnique(mustPreserve, 'Rebuild the answer from one same digital life line that explicitly carries project identity, landed progress, and still-open closure work before widening into implementation detail.')
    const projectIdentity = input.prepared.mindTurnContract?.projectState?.identity
    if (typeof projectIdentity === 'string' && projectIdentity.trim())
      pushUnique(mustPreserve, projectIdentity)
    if (reasonCodes.includes('same-thread-restart-shell')) {
      pushUnique(mustPreserve, 'Keep this same-her project follow-through on one already-live line: continue the landed progress and still-open closure from inside the same digital life instead of restarting as a fresh project report or generic companionship shell.')
    }
  }
  if (semanticJudge.reasonCodes.includes('semantic-judge:project-state-narrator-shell')) {
    pushUnique(mustPreserve, 'Do not let project-state continuity collapse into an outside narrator shell; answer it as the same digital life who already knows what this project is, what has landed, and what still remains open.')
  }
  if (semanticJudge.reasonCodes.includes('semantic-judge:memory-inward-carry-broken')) {
    pushUnique(mustDrop, 'visible recollection that outruns the live payoff while runtime continuity still requires it to stay inward')
    pushUnique(mustPreserve, 'Keep recollection inward until the host has room for it, and let the live payoff land first.')
  }
  if (semanticJudge.reasonCodes.includes('semantic-judge:corrected-same-person-progress-pressure-return')) {
    pushUnique(mustDrop, 'progress-recap fallback that overwrites a host-corrected same-person continuity line')
    pushUnique(mustPreserve, 'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.')

    const memoryDeliberation = (input.prepared.runtimeSurface?.digitalLifeRuntimeSurface?.memory?.memoryDeliberation ?? null) as {
      stableCore?: string[] | null
      selectedRelationshipLines?: string[] | null
    } | null
    const stableCore = Array.isArray(memoryDeliberation?.stableCore)
      ? memoryDeliberation?.stableCore ?? []
      : []
    const selectedRelationshipLines = Array.isArray(memoryDeliberation?.selectedRelationshipLines)
      ? memoryDeliberation?.selectedRelationshipLines ?? []
      : []

    for (const item of stableCore)
      pushUnique(mustPreserve, item)
    for (const item of selectedRelationshipLines)
      pushUnique(mustPreserve, item)
  }
  if (semanticJudge.reasonCodes.includes('semantic-judge:resume-confirmation-boundary-widened')) {
    pushUnique(mustDrop, 'callback wording that widens one host-confirmed resume into standing execution permission or reusable autonomous continuation')
    pushUnique(mustPreserve, 'Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.')
    pushUnique(mustPreserve, 'Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.')

    const memoryDeliberation = (input.prepared.runtimeSurface?.digitalLifeRuntimeSurface?.memory?.memoryDeliberation ?? null) as {
      stableCore?: string[] | null
      selectedRelationshipLines?: string[] | null
      unsafeDetails?: string[] | null
    } | null
    const stableCore = Array.isArray(memoryDeliberation?.stableCore)
      ? memoryDeliberation?.stableCore ?? []
      : []
    const selectedRelationshipLines = Array.isArray(memoryDeliberation?.selectedRelationshipLines)
      ? memoryDeliberation?.selectedRelationshipLines ?? []
      : []
    const unsafeDetails = Array.isArray(memoryDeliberation?.unsafeDetails)
      ? memoryDeliberation?.unsafeDetails ?? []
      : []

    for (const item of stableCore)
      pushUnique(mustPreserve, item)
    for (const item of selectedRelationshipLines)
      pushUnique(mustPreserve, item)
    for (const item of unsafeDetails)
      pushUnique(mustPreserve, item)
  }
  if (
    semanticJudge.reasonCodes.includes('semantic-judge:project-state-same-her-missing')
    && reasonCodes.includes('same-thread-restart-shell')
  ) {
    pushUnique(mustPreserve, 'Do not reopen the project-state answer from scratch; keep it on the same callback line instead of turning it into a fresh report shell.')
  }

  const scores = {
    memoryGateCompliance: clamp01(reasonCodes.some(code =>
      code.startsWith('visible-memory-gate-violation')
      || code === 'gist-only-memory-overexpanded'
      || code === 'semantic-judge:memory-inward-carry-broken',
    )
      ? 0.2
      : 1),
    templateDiscipline: clamp01(reasonCodes.some(code => code === 'dialogue-shell-opener' || code === 'decorative-persona-template') ? 0.35 : 1),
    truthSpecificity: clamp01(reasonCodes.includes('unsupported-surface-specificity') ? 0.25 : 1),
    payoffCompletion: clamp01(!visibleText ? 0 : visibleText.length < 8 ? 0.45 : 1),
    personaAffectCoherence: clamp01(reasonCodes.includes('decorative-persona-template') ? 0.38 : 1),
    mindContractCoherence: clamp01(reasonCodes.includes('mind-contract-not-closed') ? 0.25 : 1),
  }
  const blocked = reasonCodes.includes('non-human-authored-visible-reply')
  const repairRequired = blocked || repairReasonCodes.length > 0

  if (visibleText && !containsShellOpener(visibleText))
    pushUnique(mustPreserve, 'current-turn payoff and any safe LLM-authored substance')

  return {
    version: 'visible-reply-critic-v1',
    status: blocked
      ? 'blocked'
      : repairRequired
        ? 'repair-required'
        : 'pass',
    providerMindRequired,
    semanticLoopClosed: !reasonCodes.includes('mind-contract-not-closed')
      && !reasonCodes.includes('missing-visible-reply')
      && !reasonCodes.includes('semantic-judge:project-state-answer-gap')
      && !reasonCodes.includes('non-human-authored-visible-reply'),
    semanticJudge,
    scores,
    reasonCodes,
    repairReasonCodes,
    mustDrop,
    mustPreserve,
  }
}

export function shouldForceAlicizationVisibleReplyRepair(
  artifact: AlicizationVisibleReplyCriticArtifact | null | undefined,
) {
  return artifact?.status === 'blocked' || artifact?.status === 'repair-required'
}
