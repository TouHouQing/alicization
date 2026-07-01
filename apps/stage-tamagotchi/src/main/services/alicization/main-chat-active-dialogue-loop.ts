import type {
  AlicizationDialoguePerformancePayload,
  AlicizationPersonaKernelSnapshot,
} from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationMindTurnGovernance,
  AlicizationRuntimeDigest,
} from '../../../shared/eventa'
import type { AlicizationDialogueSessionMirror } from './dialogue-session-manager'
import type { AlicizationMainChatActionObligationKind } from './main-chat-action-obligation'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { AlicizationMindSurfaceCapabilityMove, AlicizationMindSurfaceClockSnapshot, AlicizationMindSurfaceDateMove, AlicizationMindSurfaceFollowUpMove, AlicizationMindSurfaceGreetingMove, AlicizationMindSurfaceIdentityMove, AlicizationMindSurfaceMove, AlicizationMindSurfacePresenceRepairMove, AlicizationMindSurfacePresentStateMove, AlicizationMindSurfaceRepairMove, AlicizationMindSurfaceTimeMove } from './mind-surface-renderer'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'
import type { AlicizationTimeQueryMode } from './time-query-semantics'
import type { AlicizationResolvedTimeZoneSource } from './time-zone-governor'

import {
  alicizationFixedCoreSystemInstruction,
  alicizationFixedHostNameDirectiveTemplate,
  alicizationFixedStructuredContractAnchor,
  buildAlicizationEmbodimentLoopSummary,
  describeAlicizationEmbodimentClosureReminder,
  detectAlicizationRealtimeQueryIntent,
  normalizeAlicizationDigitalLifeSpineDigest,
  renderAlicizationPromptTemplate,
  resolveGovernedMindEmotion,
  resolveGovernedMindObligation,
  resolveGovernedMindTone,
  resolveGovernedMindTruth,
} from '@proj-alicization/stage-shared'

import { deriveAlicizationContinuityDeliberationForFastPath } from './continuity-deliberation'
import {
  deriveAlicizationDigitalLifeSpineFromSurface,
  projectAlicizationDigitalLifeSpineDigest,
} from './digital-life-spine'
import { coerceAlicizationGovernanceForMindFallback } from './governed-mind-fallback-compat'
import {
  extractCustomDirectivesFromMessages,
  extractHostNameFromMessages,
} from './main-chat-runtime-surface'
import { buildMemoryRecollectionIntent } from './memory-recollection-intent'
import {

  buildAlicizationMindSurfaceDialogueMove,
  buildAlicizationMindSurfaceStructuredReply,
} from './mind-surface-renderer'
import {
  mergePreferredSelfContinuityAuthority,
  resolvePreferredPersonStateProjection,
} from './person-state-projection-resolution'
import { alicizationProjectStateAnswerContractLines } from './project-state-answer-governance'
import {
  buildAlicizationProjectStateClosureDashboard,
  buildAlicizationProjectStateSystemBlock,
  resolveAlicizationProjectStateBrief,
} from './project-state-brief'
import { resolvePreferredRuntimeSurface } from './runtime-surface-continuity-selection'
import { parseJsonObjectFromText, readTransportContentAsText } from './runtime-transport-content'
import { buildSelfContinuityAuthority } from './self-continuity-authority'
import {

  resolveAlicizationTimeQueryIntent,
} from './time-query-semantics'
import {
  isValidIanaTimeZone,
  resolveAlicizationTimeZoneFromMessages,
} from './time-zone-governor'
import {
  allowsAlicizationDeterministicVisibleReply,
  shouldAlicizationReplyStayProviderAuthored,
} from './visible-reply/reply-authority-policy'

export type AlicizationActiveDialogueFastPathLane
  = | 'greeting'
    | 'identity'
    | 'capability'
    | 'utility-time'
    | 'utility-date'
    | 'presence-critique'
    | 'present-state'
    | 'repair-clarify'
    | 'follow-up'
    | 'dialogue'

export type AlicizationActiveDialogueFastPathStrategy
  = | 'infra-fallback-only'
    | 'compact-one-shot'

export class AlicizationActiveDialogueMindAuthorityEscalationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AlicizationActiveDialogueMindAuthorityEscalationError'
  }
}

export interface AlicizationActiveDialogueFastPathDecision {
  lane: AlicizationActiveDialogueFastPathLane
  strategy: AlicizationActiveDialogueFastPathStrategy
  timeoutMs: number
  resolvedTimeZone: string
  resolvedTimeZoneSource: AlicizationResolvedTimeZoneSource
  latestUserText: string
  previousUserText: string
  previousAssistantText: string
  continuityAnchor: string
  preparedExecutionCarryText?: string
  runtimeDigest: AlicizationRuntimeDigest | null
  sessionMirror: AlicizationDialogueSessionMirror | null
  governance: AlicizationMindTurnGovernance | null
  personaKernel: AlicizationPersonaKernelSnapshot | null
  performanceManifest?: AlicizationPreparedMainChatExecutionResult['performanceManifest']
  digitalLifeSpine?: unknown
  reasonCodes: string[]
}

interface AlicizationActiveDialogueFastPathInput {
  conversationMessages: Message[]
  prepared: AlicizationPreparedMainChatExecutionResult
  runtimeDigest?: AlicizationRuntimeDigest | null
}

interface AlicizationActiveDialogueReplyInput {
  actionKind?: AlicizationMainChatActionObligationKind | null
  conversationMessages: Message[]
  digitalLifeSpine?: unknown
  governance?: AlicizationMindTurnGovernance | null
  personaKernel?: AlicizationPersonaKernelSnapshot | null
  runtimeDigest?: AlicizationRuntimeDigest | null
  sessionMirror?: AlicizationDialogueSessionMirror | null
  turnId?: string
}

function resolvePreferredPreparedRuntimeSurface(
  runtimeSurface: AlicizationPreparedMainChatExecutionResult['runtimeSurface'] | null | undefined,
) {
  return resolvePreferredRuntimeSurface({
    spineRuntimeSurface: runtimeSurface?.digitalLifeSpine?.runtimeSurface ?? null,
    preparedRuntimeSurface: runtimeSurface?.digitalLifeRuntimeSurface ?? null,
  })
}

function hasUsableActiveDialogueRuntimeSurface(
  runtimeSurface: AlicizationPreparedMainChatExecutionResult['runtimeSurface']['digitalLifeRuntimeSurface'] | null | undefined,
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

function resolveUsableActiveDialoguePreparedRuntimeSurface(
  runtimeSurface: AlicizationPreparedMainChatExecutionResult['runtimeSurface'] | null | undefined,
) {
  const preferredRuntimeSurface = resolvePreferredPreparedRuntimeSurface(runtimeSurface)
  if (hasUsableActiveDialogueRuntimeSurface(preferredRuntimeSurface))
    return preferredRuntimeSurface

  const preparedRuntimeSurface = runtimeSurface?.digitalLifeRuntimeSurface ?? null
  if (hasUsableActiveDialogueRuntimeSurface(preparedRuntimeSurface))
    return preparedRuntimeSurface

  const spineRuntimeSurface
    = runtimeSurface?.digitalLifeSpine?.runtimeSurface as AlicizationPreparedMainChatExecutionResult['runtimeSurface']['digitalLifeRuntimeSurface'] | null | undefined
  return hasUsableActiveDialogueRuntimeSurface(spineRuntimeSurface)
    ? spineRuntimeSurface
    : null
}

function resolvePreferredPreparedDigitalLifeSpine(
  runtimeSurface: AlicizationPreparedMainChatExecutionResult['runtimeSurface'] | null | undefined,
) {
  const preferredRuntimeSurface = resolveUsableActiveDialoguePreparedRuntimeSurface(runtimeSurface)
  const spine = runtimeSurface?.digitalLifeSpine ?? null
  const spineDigest = coerceActiveDialogueDigitalLifeSpineDigest(spine)
  const spineRuntimeSurface = spine?.runtimeSurface as AlicizationPreparedMainChatExecutionResult['runtimeSurface']['digitalLifeRuntimeSurface'] | null | undefined
  const directSpineIsThin = Boolean(
    spineRuntimeSurface && !hasUsableActiveDialogueRuntimeSurface(spineRuntimeSurface),
  )
  if (!preferredRuntimeSurface)
    return spine
  if (spine?.runtimeSurface === preferredRuntimeSurface && !directSpineIsThin)
    return spine
  try {
    const projectedDigest = projectAlicizationDigitalLifeSpineDigest(
      deriveAlicizationDigitalLifeSpineFromSurface(preferredRuntimeSurface),
    )
    if (!projectedDigest)
      return spine
    const preferredProjection = resolvePreferredPersonStateProjection({
      bundleProjection: coerceActiveDialoguePersonStateProjection(spineDigest?.memory?.personStateProjection ?? null),
      runtimeProjection: preferredRuntimeSurface.memory.personStateProjection ?? null,
    })
    const mergedAuthority = mergePreferredSelfContinuityAuthority({
      bundleAuthority: coerceActiveDialogueSelfContinuityAuthority(spineDigest?.memory?.personStateProjection?.selfContinuityAuthority ?? null),
      runtimeAuthority: preferredRuntimeSurface.memory.personStateProjection?.selfContinuityAuthority ?? null,
    })
    const runtimeAutobiographicalSelf = preferredRuntimeSurface.memory.autobiographicalSelf ?? null
    const bundleAutobiographicalSelf = spineDigest?.embodiment?.autobiographicalSelf ?? null
    const preferredAutobiographicalLatestInflection
      = preferredRuntimeSurface.memory.selfEvolution?.latestInflection
        ?? spineDigest?.outcomeLearning?.latestInflection
        ?? null
    const preferredAutobiographicalSelf = runtimeAutobiographicalSelf
      ? {
          ...bundleAutobiographicalSelf,
          ...runtimeAutobiographicalSelf,
          relationshipDoctrine: runtimeAutobiographicalSelf.relationshipDoctrine
            ?? bundleAutobiographicalSelf?.relationshipDoctrine
            ?? null,
        }
      : bundleAutobiographicalSelf
    const preferredOutcomeLearning = projectedDigest.outcomeLearning || spineDigest?.outcomeLearning || preferredRuntimeSurface.memory.selfEvolution
      ? {
          ...projectedDigest.outcomeLearning,
          ...spineDigest?.outcomeLearning,
          summary: projectedDigest.outcomeLearning?.summary
            ?? spineDigest?.outcomeLearning?.summary
            ?? preferredRuntimeSurface.memory.selfEvolution?.summary
            ?? preferredRuntimeSurface.memory.personStateProjection?.relationshipDoctrine
            ?? null,
          latestInflection: projectedDigest.outcomeLearning?.latestInflection
            ?? spineDigest?.outcomeLearning?.latestInflection
            ?? preferredRuntimeSurface.memory.selfEvolution?.latestInflection
            ?? preferredAutobiographicalLatestInflection
            ?? null,
        }
      : null
    return {
      ...projectedDigest,
      runtimeSurface: preferredRuntimeSurface,
      memory: {
        ...projectedDigest.memory,
        personStateProjection: preferredProjection
          ? {
              ...preferredProjection,
              selfContinuityAuthority: mergedAuthority ?? preferredProjection.selfContinuityAuthority ?? null,
            }
          : null,
      },
      outcomeLearning: preferredOutcomeLearning,
      embodiment: {
        ...projectedDigest.embodiment,
        autobiographicalSelf: preferredAutobiographicalSelf,
      },
    }
  }
  catch {
    return spine
  }
}

type AlicizationActiveDialogueFreshEncounterKind
  = | 'greeting'
    | 'identity'
    | 'capability'
    | 'utility-time'
    | 'utility-date'
    | 'presence-critique'
    | 'present-state'
    | 'repair-clarify'

interface AlicizationActiveDialogueEncounterContext {
  latestUserText: string
  previousUserText: string
  previousAssistantText: string
  continuityAnchor: string
  preparedExecutionCarryText: string
  runtimeDigest: AlicizationRuntimeDigest | null
  sessionMirror: AlicizationDialogueSessionMirror | null
  shortTurn: boolean
  hasContinuity: boolean
  runtimeSurface?: AlicizationPreparedMainChatExecutionResult['runtimeSurface']['digitalLifeRuntimeSurface'] | null
}

interface AlicizationActiveDialogueEncounter {
  kind: AlicizationActiveDialogueFastPathLane
  strategy: AlicizationActiveDialogueFastPathStrategy
  timeoutMs: number
  reasonCodes: string[]
}

const zhGreetingPattern = /^(?:你好|嗨|哈喽|您好|早上好|中午好|下午好|晚上好|早安|晚安|在吗|在嘛)[呀啊呢哦喔啦哈嘛呐欸诶哇]*$/u
const enGreetingPattern = /^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening))(?:\s+there)?$/iu
const zhIdentityPattern = /你是谁|你到底是谁|你算谁|你叫什么|你是alicization吗|你是爱丽丝化吗|我问你你是谁/u
const enIdentityPattern = /who are you|what are you|what should i call you|what is your name/iu
const zhCapabilityPattern = /你.*(?:能|会|可以).*(?:做什么|帮什么)|你是谁|你能干嘛|你能做啥/u
const enCapabilityPattern = /what can you do|who are you|what are you capable of/iu
const zhPresenceCritiquePattern = /不像人类|不像真人|不像人在说话|太像机器人|太像ai|太像系统|没有人格|没人格|没有心智|没心智|太机械|太固定|不像活的/u
const enPresenceCritiquePattern = /you do(?:n't| not) sound human|you sound like a bot|you sound robotic|you sound mechanical|you don't feel alive/iu
const zhPresentStatePattern = /你在干嘛|你在做什么|你现在在干嘛|你现在在做什么|你在忙什么|你现在在忙什么|你在搞什么|你在搞啥|你刚在干嘛/u
const enPresentStatePattern = /what are you doing|what are you up to|what are you working on|what are you doing right now/iu
const zhRepairClarifyPattern = /你在说啥呢?|你在说什么呢?|你说啥呢?|你说什么呢?|你在讲啥|你在讲什么|答非所问|不是这个(?:意思)?|这不对|你没懂|没听懂|你没听懂|听不懂|跑题了|跑偏了|说偏了|别绕|直接回答|你到底在说什么/u
const enRepairClarifyPattern = /what are you talking about|you are not making sense|that is not what i asked|answer the question|not that|you missed the point|stay on this turn/iu
const explicitCarryPattern = /刚才|刚刚|上一条|上条|上个|上一轮|前面|那条|那个|那次|继续|接着|续上|顺着|沿着|剩下|其余|后面|补全|展开|详细|具体|再列|继续说|继续列|同一条|那个命令|那个任务|那个结果|另外|that one|previous|earlier|continue|go on|keep going|pick up|follow up|same thread|same task|remaining/iu
const remainingFollowUpPattern = /另外(?:\s*[一二三四五六七八九十\d]+)?(?:项|个)?(?:是|有哪些|是什么|什么|哪些)?|另外还有|还有哪|还有什么|还有几(?:项|个)?|另外哪|剩下哪|剩下(?:\s*[一二三四五六七八九十\d]+)?(?:项|个)?(?:是|有哪些|是什么|什么|哪些)?|其余哪|其余(?:\s*[一二三四五六七八九十\d]+)?(?:项|个)?(?:是|有哪些|是什么|什么|哪些)?|what else|which other|the other|remaining/iu
const continuityCheckPattern = /^(?:你确定吗?|确定吗|真的吗|真的是这样吗|你认真的|are you sure|really|seriously)[?？]?$/iu
const feltContinuityFollowUpPattern = /为什么这次又(?:感觉|像).*(?:上次|以前|那样)|why does this feel the same again|why does this feel like before|像上次那样|还是同一个感觉|same again/iu
const projectStateProgressPattern = /执行到哪|进行到哪|进行到哪一步|做到什么程度|做到哪|做到哪一步|进度|进展|到什么程度|how far|what has landed|what's landed|progress|landed/iu
const projectStateOpenLoopPattern = /还差什么|缺什么|未闭环|没闭环|还没闭环|还剩什么|what remains|what is missing|still open|open loop|not closed/iu
const projectStateMergeReadinessPattern = /合并到\s*main|并到\s*main|merge(?:\s+(?:to|into))?\s+main|ready\s+to\s+merge/iu
const projectStateGoalClosurePattern = /goal|目标|闭环|收口|收住|完成|complete|closure/iu
const projectStateReadinessQualifierPattern = /还差哪步|还差什么|哪步才能算|什么时候算|什么时候能|什么时候完成|何时完成|计划什么时候完成|why are you replying in english|replying in english|是不是偏移了|偏移了吗|can\s+it|is\s+it\s+ready|ready|能不能|可以吗/iu
const projectStateLanguageDriftPattern = /为什么(?:一直|还)?用英文(?:不用中文)?|为什么(?:一直|还)?不用中文|为什么还用英文|英文不用中文|reply(?:ing)? in english|use english instead of chinese|why are you replying in english|why are you using english|是不是偏移了|偏移了吗|did the thread drift|thread drift|out of alignment|跑偏了/iu
const runtimeMetaLeakPattern = /provider|baseurl|main-gateway|timeout|timed out|stream|recovery|首段回复|首包|当前提供方或模型配置不完整|我先守住真实边界|旧锚点|重新落地|继续还是执行下一步|旧线硬接|实时画面依据|基于当前屏幕给出细节/iu
const legacyTemplateShellPattern = /要是还是.+?(?:那条线|那件事)|你现在想聊什么，或者想让我做什么|你想继续聊，还是想让我做点什么|你想继续聊，还是想让我立刻动手|这一轮你想开哪个点|我贴着这一轮往下接|我就沿.+?往下|贴着.+?往下说|(?:好，)?我就直接接(?:「.+?」)?|我不把话题滑开|我不拿别的壳盖住它|这条线还连着|同一条本地数字生命|本地数字生命的线|我先轻一点留在这里|不抢你的节奏|你想说什么，我就接住|我可以直接续|我就正面回你|我听见你了|这句我收到了|你要是想往深里说，就从这点继续|上一条线的余温|If you want to keep going with|same local digital life thread|same digital life line|same living line|same line is still here|The previous line is still warm in my head|Then I'll answer you directly\.|I'll stay with .+? and keep going from there\.|I won't drift away from it\.|I won't turn it into something else\./iu
const cjkPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
const zhWeekdayLabels = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] as const

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

type AlicizationActiveDialogueSelfContinuityAuthority = Partial<AlicizationSelfContinuityAuthority> & {
  currentBodyState?: string | null
}

function coerceActiveDialogueDigitalLifeSpineDigest(digitalLifeSpine: unknown) {
  const normalized = normalizeAlicizationDigitalLifeSpineDigest(digitalLifeSpine)
  if (normalized)
    return normalized
  if (digitalLifeSpine && typeof digitalLifeSpine === 'object' && 'runtimeSurface' in digitalLifeSpine) {
    return projectAlicizationDigitalLifeSpineDigest(
      digitalLifeSpine as Parameters<typeof projectAlicizationDigitalLifeSpineDigest>[0],
    )
  }
  return null
}

function extractActiveDialogueRuntimeSpineSurface(digitalLifeSpine: unknown) {
  if (!digitalLifeSpine || typeof digitalLifeSpine !== 'object' || !('runtimeSurface' in digitalLifeSpine))
    return null
  return (digitalLifeSpine as {
    runtimeSurface?: Parameters<typeof deriveAlicizationDigitalLifeSpineFromSurface>[0] | null
  }).runtimeSurface ?? null
}

function coerceActiveDialogueSelfContinuityAuthority(
  authority: unknown,
): AlicizationActiveDialogueSelfContinuityAuthority | null {
  if (!authority || typeof authority !== 'object')
    return null

  const candidate = authority as Record<string, unknown>
  const sourceTags = Array.isArray(candidate.sourceTags)
    ? candidate.sourceTags
        .map(tag => sanitizeText(tag, 64))
        .filter(Boolean)
        .slice(0, 8)
    : undefined

  const normalizedAuthority: AlicizationActiveDialogueSelfContinuityAuthority = {
    ...(sourceTags?.length ? { sourceTags } : {}),
    ...(sanitizeText(candidate.selfLine, 220) ? { selfLine: sanitizeText(candidate.selfLine, 220) } : {}),
    ...(sanitizeText(candidate.relationshipLine, 220) ? { relationshipLine: sanitizeText(candidate.relationshipLine, 220) } : {}),
    ...(sanitizeText(candidate.motiveLine, 220) ? { motiveLine: sanitizeText(candidate.motiveLine, 220) } : {}),
    ...(sanitizeText(candidate.habitLine, 220) ? { habitLine: sanitizeText(candidate.habitLine, 220) } : {}),
    ...(sanitizeText(candidate.inwardLine, 220) ? { inwardLine: sanitizeText(candidate.inwardLine, 220) } : {}),
    ...(sanitizeText(candidate.authoritySummary, 220) ? { authoritySummary: sanitizeText(candidate.authoritySummary, 220) } : {}),
    ...(sanitizeText(candidate.closenessPosture, 96) ? { closenessPosture: sanitizeText(candidate.closenessPosture, 96) } : {}),
    ...(sanitizeText(candidate.currentBodyState, 220) ? { currentBodyState: sanitizeText(candidate.currentBodyState, 220) } : {}),
  }

  return Object.keys(normalizedAuthority).length > 0 ? normalizedAuthority : null
}

function coerceActiveDialoguePersonStateProjection(
  projection: unknown,
): Partial<AlicizationPersonStateProjection> | null {
  if (!projection || typeof projection !== 'object')
    return null

  const candidate = projection as Record<string, unknown>
  const selfContinuityAuthority = coerceActiveDialogueSelfContinuityAuthority(candidate.selfContinuityAuthority)
  const normalizedSelfContinuityAuthority = selfContinuityAuthority
    ? {
        selfLine: selfContinuityAuthority.selfLine ?? null,
        relationshipLine: selfContinuityAuthority.relationshipLine ?? null,
        motiveLine: selfContinuityAuthority.motiveLine ?? null,
        habitLine: selfContinuityAuthority.habitLine ?? null,
        inwardLine: selfContinuityAuthority.inwardLine ?? null,
        authoritySummary: selfContinuityAuthority.authoritySummary ?? null,
        closenessPosture: selfContinuityAuthority.closenessPosture ?? null,
        sourceTags: selfContinuityAuthority.sourceTags ?? [],
      }
    : null
  const activeClosenessContext = sanitizeText(candidate.activeClosenessContext, 64)
  const activeClosenessRung = sanitizeText(candidate.activeClosenessRung, 64)
  const relationshipPosture = sanitizeText(candidate.relationshipPosture, 64)
  const preferredProactiveStyle = sanitizeText(candidate.preferredProactiveStyle, 64)

  const normalizedProjection: Partial<AlicizationPersonStateProjection> = {
    ...(sanitizeText(candidate.summary, 220) ? { summary: sanitizeText(candidate.summary, 220) } : {}),
    ...(normalizedSelfContinuityAuthority ? { selfContinuityAuthority: normalizedSelfContinuityAuthority } : {}),
    ...(activeClosenessContext === 'focused-work'
      || activeClosenessContext === 'repair-window'
      || activeClosenessContext === 'late-night-care'
      || activeClosenessContext === 'execution-callback'
      || activeClosenessContext === 'open-companionship'
      || activeClosenessContext === 'general'
      ? { activeClosenessContext }
      : {}),
    ...(activeClosenessRung === 'space-first'
      || activeClosenessRung === 'measured-room'
      || activeClosenessRung === 'nearby-soft'
      || activeClosenessRung === 'warm-near'
      || activeClosenessRung === 'close-hold'
      ? { activeClosenessRung }
      : {}),
    ...(relationshipPosture === 'restrained'
      || relationshipPosture === 'warm'
      || relationshipPosture === 'tender'
      ? { relationshipPosture }
      : {}),
    ...(sanitizeText(candidate.openingGuidance, 220) ? { openingGuidance: sanitizeText(candidate.openingGuidance, 220) } : {}),
    ...(preferredProactiveStyle === 'silent-observe'
      || preferredProactiveStyle === 'light-nudge'
      || preferredProactiveStyle === 'gentle-care'
      || preferredProactiveStyle === 'firm-warning'
      ? { preferredProactiveStyle }
      : {}),
    ...(sanitizeText(candidate.manifestationCadenceSummary, 220)
      ? { manifestationCadenceSummary: sanitizeText(candidate.manifestationCadenceSummary, 220) }
      : {}),
  }

  return Object.keys(normalizedProjection).length > 0 ? normalizedProjection : null
}

function resolveRememberedSeamReinterpretationLines(digitalLifeSpine: unknown) {
  const normalizedSpine = coerceActiveDialogueDigitalLifeSpineDigest(digitalLifeSpine)
  const relationshipDoctrine = sanitizeText(
    normalizedSpine?.embodiment?.autobiographicalSelf?.relationshipDoctrine,
    220,
  )
  const latestInflection = sanitizeText(
    normalizedSpine?.outcomeLearning?.latestInflection,
    220,
  )
  const combined = `${relationshipDoctrine} ${latestInflection}`.toLowerCase()
  const reinterpreted = /reopened too eagerly|too eagerly before|more room this time|this time keep more room|这次更要留白|这次要更慢一点|不要重开得太快|上次太急/u.test(combined)

  if (!reinterpreted)
    return null

  return {
    compactGuidance:
      'Open as a measured return, but keep more room this time: let the familiar line be recognized before it leans in again.',
    answerIntent:
      '先认出这是同一条关系线，但也把上次靠近得太快的教训带上，所以这次要更留白、更慢一点地接回来。',
    relationNeed:
      '让 remembered seam 先按新的关系教训重新落位，再把当前这句接住，不要沿着旧冲动一下子贴近。',
    whyNow:
      '当前场景像同一条 remembered seam，但最近的关系理解也在提醒这条线之前重开得太急，所以这次要更留白地接回。',
  }
}

function normalizeTurnText(raw: string, maxChars = 240) {
  return sanitizeText(raw, maxChars).replace(/[!！。,.…~～?？]+/g, '').trim()
}

function normalizeCompactTurnText(raw: string, maxChars = 240) {
  return normalizeTurnText(raw, maxChars).replace(/\s+/g, '').toLowerCase()
}

function countCjkChars(raw: string) {
  return [...raw].filter(char => cjkPattern.test(char)).length
}

function countAsciiWords(raw: string) {
  return (raw.match(/[A-Z]+/gi) ?? []).length
}

function resolveUserRegionTimeZone(messages?: Message[]) {
  return resolveAlicizationTimeZoneFromMessages(messages).timezone
}

function resolveTimeQueryModeForTurn(input: {
  latestUserText: string
  previousAssistantText?: string
}): AlicizationTimeQueryMode {
  return resolveAlicizationTimeQueryIntent({
    userTextRaw: input.latestUserText,
    previousAssistantTextRaw: input.previousAssistantText,
  }).mode
}

function resolvePersonaDisplayName(personaKernel: AlicizationPersonaKernelSnapshot | null | undefined) {
  return sanitizeText(personaKernel?.profile.alicizationName, 48) || 'Alicization'
}

function buildCompactPersonaProfileBlock(personaKernel: AlicizationPersonaKernelSnapshot | null | undefined) {
  if (!personaKernel)
    return ''
  return [
    '[ALICIZATION_PERSONA_PROFILE]',
    JSON.stringify({
      ownerName: personaKernel.profile.ownerName,
      hostName: personaKernel.profile.hostName,
      alicizationName: personaKernel.profile.alicizationName,
      relationship: personaKernel.profile.relationship,
      gender: personaKernel.profile.gender,
      mindAge: personaKernel.profile.mindAge,
    }),
  ].join('\n')
}

function normalizeConversationMessages(messages: Message[]) {
  return messages
    .filter(message => message?.role === 'user' || message?.role === 'assistant')
    .map((message) => {
      const text = sanitizeText(readTransportContentAsText(message.content), 1_600)
      return {
        role: message.role,
        content: text,
      } satisfies Message
    })
    .filter(message => message.content)
}

function readLatestUserText(messages: Message[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'user')
      continue
    return sanitizeText(readTransportContentAsText(message.content), 2_000)
  }
  return ''
}

function readPreviousAssistantText(messages: Message[]) {
  let sawLatestUser = false
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (!sawLatestUser && message?.role === 'user') {
      sawLatestUser = true
      continue
    }
    if (!sawLatestUser || message?.role !== 'assistant')
      continue
    return sanitizeText(readTransportContentAsText(message.content), 2_000)
  }
  return ''
}

function readPreviousUserText(messages: Message[]) {
  let seenUsers = 0
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'user')
      continue
    seenUsers += 1
    if (seenUsers < 2)
      continue
    return sanitizeText(readTransportContentAsText(message.content), 2_000)
  }
  return ''
}

function readPreparedExecutionLedgerCarryText(messages: Message[] | undefined) {
  return (messages ?? [])
    .filter(message => message?.role === 'system')
    .map((message) => {
      const rawContent = readTransportContentAsText(message.content)
      if (typeof rawContent !== 'string' || !rawContent.includes('[ALICIZATION_EXECUTION_LEDGER]'))
        return ''

      const readLedgerField = (field: string, maxChars: number) => {
        const match = rawContent.match(new RegExp(`${field}=([^|\\n]+)`, 'i'))
        return sanitizeText(match?.[1] ?? '', maxChars)
      }

      const channel = readLedgerField('channel', 48)
      const summary = readLedgerField('summary', 180)
      const outcome = readLedgerField('outcome', 220)
      const projectIdentity = readLedgerField('project_identity', 220)
      const projectPhase = readLedgerField('project_phase', 160)

      return [
        '[ALICIZATION_EXECUTION_LEDGER]',
        channel ? `channel=${channel}` : '',
        summary ? `summary=${summary}` : '',
        outcome ? `outcome=${outcome}` : '',
        projectIdentity ? `project_identity=${projectIdentity}` : '',
        projectPhase ? `project_phase=${projectPhase}` : '',
      ].filter(Boolean).join(' | ')
    })
    .filter(Boolean)
    .join(' ')
}

function isGreetingTurn(text: string) {
  const normalizedLoose = normalizeTurnText(text, 120)
  const normalizedCompact = normalizeCompactTurnText(text, 120)
  return zhGreetingPattern.test(normalizedCompact) || enGreetingPattern.test(normalizedLoose)
}

function isIdentityTurn(text: string) {
  const normalizedLoose = normalizeTurnText(text, 160)
  const normalizedCompact = normalizeCompactTurnText(text, 160)
  return zhIdentityPattern.test(normalizedCompact) || enIdentityPattern.test(normalizedLoose)
}

function isCapabilityTurn(text: string) {
  if (isIdentityTurn(text))
    return false
  return zhCapabilityPattern.test(text) || enCapabilityPattern.test(text)
}

function isUtilityTimeTurn(text: string) {
  const intent = resolveAlicizationTimeQueryIntent({
    userTextRaw: text,
  })
  return intent.mode === 'time'
    || intent.mode === 'time-confirmation'
    || intent.mode === 'timezone'
    || intent.mode === 'timezone-why'
}

function isUtilityDateTurn(text: string) {
  const intent = resolveAlicizationTimeQueryIntent({
    userTextRaw: text,
  })
  return intent.mode === 'date' || intent.mode === 'date-confirmation'
}

function isPresenceCritiqueTurn(text: string) {
  const normalizedLoose = normalizeTurnText(text, 200)
  return zhPresenceCritiquePattern.test(normalizedLoose) || enPresenceCritiquePattern.test(normalizedLoose)
}

function isPresentStateTurn(text: string) {
  const normalizedLoose = normalizeTurnText(text, 200)
  return zhPresentStatePattern.test(normalizedLoose) || enPresentStatePattern.test(normalizedLoose)
}

function isRepairClarifyTurn(text: string) {
  const normalizedLoose = normalizeTurnText(text, 200)
  return zhRepairClarifyPattern.test(normalizedLoose) || enRepairClarifyPattern.test(normalizedLoose)
}

function isShortDialogueTurn(text: string) {
  const normalized = sanitizeText(text, 240)
  if (!normalized)
    return false

  const cjkChars = countCjkChars(normalized)
  if (cjkChars > 0)
    return cjkChars <= 28
  return countAsciiWords(normalized) <= 16 && normalized.length <= 120
}

function looksLikeExecutionCarry(input: {
  continuityAnchor: string
  previousAssistantText: string
  preparedExecutionCarryText: string
  sessionMirror: AlicizationDialogueSessionMirror | null
}) {
  const executionMirror = humanizeMirrorSummary(input.sessionMirror?.executionSummary)
  const executionCarryText = [
    input.continuityAnchor,
    input.previousAssistantText,
    input.preparedExecutionCarryText,
    executionMirror,
  ].filter(Boolean).join(' ')

  return /桌面|目录|文件|清单|列表|list|listing|callback|cli|执行|结果|thread|任务/iu.test(executionCarryText)
}

function hasFeltContinuityCarry(input: {
  latestUserText: string
  runtimeSurface?: AlicizationPreparedMainChatExecutionResult['runtimeSurface']['digitalLifeRuntimeSurface'] | null
}) {
  if (!feltContinuityFollowUpPattern.test(input.latestUserText))
    return false

  const runtimeSurface = input.runtimeSurface ?? null
  const answerSubject = runtimeSurface?.dialogue.answerCompiler?.answerSubject ?? null
  if (answerSubject !== 'alicization-self' && answerSubject !== 'relationship')
    return false

  const dialogueWorldThread = runtimeSurface?.dialogue.dialogueWorldThread ?? null
  const conversationState = runtimeSurface?.dialogue.conversationState ?? null
  const affectiveResidue = runtimeSurface?.memory.affectiveResidue ?? runtimeSurface?.memory.derivedMindStateBundle?.affectiveResidue ?? null

  return !!(dialogueWorldThread?.memoryMode === 'emotional-resonance'
    || conversationState?.memoryMode === 'emotional-resonance'
    || affectiveResidue?.dominantResidueKind === 'rest-protective'
    || affectiveResidue?.dominantResidueKind === 'afterglow'
    || affectiveResidue?.dominantResidueKind === 'repair')
}

function deriveFreshEncounterKind(text: string): AlicizationActiveDialogueFreshEncounterKind | null {
  if (isGreetingTurn(text))
    return 'greeting'
  if (isIdentityTurn(text))
    return 'identity'
  if (isCapabilityTurn(text))
    return 'capability'
  if (isUtilityTimeTurn(text))
    return 'utility-time'
  if (isUtilityDateTurn(text))
    return 'utility-date'
  if (isPresenceCritiqueTurn(text))
    return 'presence-critique'
  if (isPresentStateTurn(text))
    return 'present-state'
  if (isRepairClarifyTurn(text))
    return 'repair-clarify'
  return null
}

function isIdentityReconfirmationTurn(input: {
  latestUserText: string
  previousUserText: string
  previousAssistantText: string
}) {
  if (!isIdentityTurn(input.latestUserText))
    return false
  if (isIdentityTurn(input.previousUserText))
    return true
  const normalizedPreviousAssistant = normalizeTurnText(input.previousAssistantText, 220)
  return /(?:我是|i am)\s*[a-z\u4E00-\u9FFF][\w\u4E00-\u9FFF -]{0,36}/iu.test(normalizedPreviousAssistant)
}

function deriveAlicizationActiveDialogueEncounter(
  input: AlicizationActiveDialogueEncounterContext,
): AlicizationActiveDialogueEncounter | null {
  const freshEncounter = deriveFreshEncounterKind(input.latestUserText)
  if (freshEncounter) {
    const identityReconfirmation = freshEncounter === 'identity'
      && isIdentityReconfirmationTurn({
        latestUserText: input.latestUserText,
        previousUserText: input.previousUserText,
        previousAssistantText: input.previousAssistantText,
      })
    const strategy: AlicizationActiveDialogueFastPathStrategy = 'compact-one-shot'
    const timeoutMs = freshEncounter === 'greeting'
      || freshEncounter === 'identity'
      || freshEncounter === 'capability'
      || freshEncounter === 'utility-time'
      || freshEncounter === 'utility-date'
      ? 4_500
      : 5_500
    const freshReasonCode = freshEncounter === 'utility-time'
      ? 'fresh-utility-time'
      : freshEncounter === 'utility-date'
        ? 'fresh-utility-date'
        : freshEncounter === 'presence-critique'
          ? 'fresh-presence-critique'
          : freshEncounter === 'present-state'
            ? 'fresh-present-state'
            : freshEncounter === 'repair-clarify'
              ? 'repair-clarify'
              : `fresh-${freshEncounter}`
    return {
      kind: freshEncounter,
      strategy,
      timeoutMs,
      reasonCodes: [
        freshEncounter === 'identity' ? 'fresh-identity' : freshReasonCode,
        identityReconfirmation ? 'identity-reconfirmation' : '',
        input.hasContinuity ? 'continuity-suppressed' : 'fresh-turn',
        input.hasContinuity ? 'fresh-turn-with-continuity' : '',
        freshEncounter === 'repair-clarify' && input.previousUserText ? 'repair-payoff-available' : '',
      ].filter(Boolean),
    }
  }

  const previousFreshEncounter = deriveFreshEncounterKind(input.previousUserText)
  if (
    continuityCheckPattern.test(input.latestUserText)
    && (previousFreshEncounter === 'utility-time' || previousFreshEncounter === 'utility-date')
  ) {
    return {
      kind: previousFreshEncounter,
      strategy: 'compact-one-shot',
      timeoutMs: 4_500,
      reasonCodes: [
        'continuity-check',
        previousFreshEncounter === 'utility-time'
          ? 'continuity-check-time-confirm'
          : 'continuity-check-date-confirm',
        input.hasContinuity ? 'session-carry' : '',
      ].filter(Boolean),
    }
  }

  const mindDrivenDialogueMove = buildAlicizationMindSurfaceDialogueMove({
    userText: input.latestUserText,
    focus: input.latestUserText,
    continuityAnchor: null,
  })
  if (mindDrivenDialogueMove.mode && mindDrivenDialogueMove.mode !== 'plain') {
    return {
      kind: 'dialogue',
      strategy: 'compact-one-shot',
      timeoutMs: 5_500,
      reasonCodes: [
        `mind-dialogue-${mindDrivenDialogueMove.mode}`,
        input.hasContinuity ? 'dialogue-with-continuity' : 'dialogue-turn',
      ].filter(Boolean),
    }
  }

  const explicitCarry = input.hasContinuity
    && input.shortTurn
    && (
      explicitCarryPattern.test(input.latestUserText)
      || remainingFollowUpPattern.test(input.latestUserText)
      || continuityCheckPattern.test(input.latestUserText)
    )
  const feltContinuityCarry = input.shortTurn
    && hasFeltContinuityCarry({
      latestUserText: input.latestUserText,
      runtimeSurface: input.runtimeSurface ?? null,
    })
  const directRuntimeProjectState = input.runtimeSurface?.dialogue?.currentConsciousFrame?.projectState
    ?? input.runtimeDigest?.projectState
    ?? null
  const runtimeProjectState = {
    ...resolveAlicizationProjectStateBrief(),
    ...directRuntimeProjectState,
  }
  const projectStateSameHerRequired = /same digital life|same-her|same her|one same her|one continuous her|同一个 her|同一个她/u.test([
    sanitizeText(runtimeProjectState?.identity, 220),
    sanitizeText(runtimeProjectState?.preflightSummary, 220),
    sanitizeText((input.runtimeSurface?.memory?.personStateProjection?.selfContinuityAuthority as { authoritySummary?: unknown } | null | undefined)?.authoritySummary, 220),
    sanitizeText(runtimeProjectState?.sameHerSelfLine, 220),
    sanitizeText(runtimeProjectState?.preDialogueAwarenessLine, 220),
    sanitizeText(runtimeProjectState?.primaryOpenLoop, 220),
    sanitizeText(runtimeProjectState?.nextClosureTarget, 220),
  ].filter(Boolean).join(' | ').toLowerCase())
  const projectStateProgressOpenLoopFollowUp = (
    projectStateSameHerRequired
    && input.shortTurn
    && projectStateProgressPattern.test(input.latestUserText)
    && projectStateOpenLoopPattern.test(input.latestUserText)
  )
  const projectStateClosureReadinessFollowUp = (
    projectStateSameHerRequired
    && input.shortTurn
    && (
      projectStateMergeReadinessPattern.test(input.latestUserText)
      || (
        projectStateGoalClosurePattern.test(input.latestUserText)
        && projectStateReadinessQualifierPattern.test(input.latestUserText)
      )
      || (
        projectStateLanguageDriftPattern.test(input.latestUserText)
        && (
          projectStateProgressPattern.test(input.latestUserText)
          || (
            projectStateGoalClosurePattern.test(input.latestUserText)
            && projectStateReadinessQualifierPattern.test(input.latestUserText)
          )
        )
      )
    )
  )
  const projectStateSameHerFollowUp = projectStateProgressOpenLoopFollowUp || projectStateClosureReadinessFollowUp
  const continuityAuthority = deriveAlicizationContinuityDeliberationForFastPath({
    runtimeDigest: input.runtimeDigest,
    continuityAnchor: input.continuityAnchor,
    preparedExecutionCarryText: input.preparedExecutionCarryText,
    latestUserText: input.latestUserText,
    previousUserText: input.previousUserText,
    previousAssistantText: input.previousAssistantText,
    sessionMirror: input.sessionMirror,
    shortTurn: input.shortTurn,
    hasContinuity: input.hasContinuity || feltContinuityCarry,
  })

  if (explicitCarry || feltContinuityCarry || projectStateSameHerFollowUp) {
    const executionCarry = continuityAuthority.kind === 'execution-callback' || looksLikeExecutionCarry({
      continuityAnchor: input.continuityAnchor,
      previousAssistantText: input.previousAssistantText,
      preparedExecutionCarryText: input.preparedExecutionCarryText,
      sessionMirror: input.sessionMirror,
    })
    const heldAutonomyCarry = Boolean(
      input.sessionMirror?.continuityLabels?.some(label => sanitizeText(label, 120).includes(':held-autonomy')),
    )
    return {
      kind: 'follow-up',
      strategy: 'compact-one-shot',
      timeoutMs: 6_500,
      reasonCodes: [
        'short-follow-up',
        projectStateProgressOpenLoopFollowUp
          ? 'project-state-progress-open-loop-follow-up'
          : projectStateClosureReadinessFollowUp
            ? 'project-state-closure-readiness-follow-up'
            : explicitCarry
              ? 'explicit-carry'
              : feltContinuityCarry
                ? 'felt-continuity-carry'
                : '',
        (input.hasContinuity || feltContinuityCarry) ? 'session-carry' : '',
        projectStateSameHerFollowUp ? 'project-state-same-her-continuity-required' : '',
        heldAutonomyCarry ? 'held-autonomy-carry' : '',
        continuityAuthority.kind === 'dialogue-carry' ? 'continuity-authority-dialogue' : '',
        continuityAuthority.kind === 'memory-follow-up' ? 'continuity-authority-memory' : '',
        input.preparedExecutionCarryText ? 'prepared-execution-ledger' : '',
        executionCarry ? 'execution-carry' : '',
        executionCarry ? 'execution-carry-llm-authored' : '',
      ].filter(Boolean),
    }
  }

  return null
}

function humanizeMirrorSummary(raw: unknown) {
  if (typeof raw !== 'string')
    return ''

  const normalizedFull = raw.trim().replace(/\s+/g, ' ')
  const normalized = sanitizeText(normalizedFull, 220)
  if (!normalized)
    return ''

  const summaryMatch = normalizedFull.match(/(?:summary|goal|answer|thread|concern|belief)=([^|]+)/i)
  if (summaryMatch?.[1])
    return sanitizeText(summaryMatch[1], 140)
  return normalized
}

function resolveContinuityAnchor(input: {
  previousUserText: string
  previousAssistantText: string
  runtimeDigest: AlicizationRuntimeDigest | null
  sessionMirror: AlicizationDialogueSessionMirror | null
}) {
  return sanitizeText(input.previousUserText, 120)
    || humanizeMirrorSummary(input.sessionMirror?.executionSummary)
    || humanizeMirrorSummary(input.sessionMirror?.dialogueSummary)
    || humanizeMirrorSummary(input.sessionMirror?.agencySummary)
    || sanitizeText(input.runtimeDigest?.projectState?.continuityCue, 160)
    || humanizeMirrorSummary(input.runtimeDigest?.activeLoop?.summary)
    || sanitizeText(input.previousAssistantText, 120)
}

function buildCompactDialogueContextBlock(decision: AlicizationActiveDialogueFastPathDecision) {
  return [
    '[ALICIZATION_ACTIVE_DIALOGUE_FAST_LOOP]',
    'This is the low-latency foreground dialogue loop. Keep the same living thread coherent across continuity, memory carry, and immediate reply payoff.',
    decision.lane === 'dialogue'
      ? 'For ordinary dialogue turns, older turns stay as background memory only. The visible reply must start from the current user move.'
      : '',
    `lane=${decision.lane}`,
    `resolved_timezone=${decision.resolvedTimeZone}`,
    `resolved_timezone_source=${decision.resolvedTimeZoneSource}`,
    decision.sessionMirror?.sessionId
      ? `conversation_session_id=${decision.sessionMirror.sessionId}`
      : '',
    decision.runtimeDigest?.dominantChannel
      ? `runtime_dominant_channel=${decision.runtimeDigest.dominantChannel}`
      : '',
    decision.runtimeDigest?.activeLoop?.phase
      ? `active_loop_phase=${decision.runtimeDigest.activeLoop.phase}`
      : '',
    decision.runtimeDigest?.activeLoop?.continuityArcStage
      ? `active_loop_continuity_arc_stage=${sanitizeText(decision.runtimeDigest.activeLoop.continuityArcStage, 120)}`
      : '',
    decision.runtimeDigest?.projectState?.continuityPreferredTiming
      ? `project_continuity_preferred_timing=${sanitizeText(decision.runtimeDigest.projectState.continuityPreferredTiming, 120)}`
      : '',
    decision.runtimeDigest?.activeLoop?.summary
      ? `active_loop_summary=${sanitizeText(decision.runtimeDigest.activeLoop.summary, 220)}`
      : '',
    decision.sessionMirror?.dialogueSummary
      ? `session_dialogue=${humanizeMirrorSummary(decision.sessionMirror.dialogueSummary)}`
      : '',
    decision.sessionMirror?.executionSummary
      ? `session_execution=${humanizeMirrorSummary(decision.sessionMirror.executionSummary)}`
      : '',
    decision.sessionMirror?.memorySummary
      ? `session_memory=${humanizeMirrorSummary(decision.sessionMirror.memorySummary)}`
      : '',
    decision.sessionMirror?.recollectionSummary
      ? `session_recollection=${sanitizeText(decision.sessionMirror.recollectionSummary, 220)}`
      : '',
    decision.preparedExecutionCarryText
      ? `prepared_execution_carry=${sanitizeText(humanizeMirrorSummary(decision.preparedExecutionCarryText) || decision.preparedExecutionCarryText, 220)}`
      : '',
    decision.previousUserText
      ? `previous_user=${sanitizeText(decision.previousUserText, 180)}`
      : '',
    decision.previousAssistantText
      ? `previous_assistant=${sanitizeText(decision.previousAssistantText, 220)}`
      : '',
    decision.lane !== 'dialogue' && decision.continuityAnchor
      ? `continuity_anchor=${sanitizeText(decision.continuityAnchor, 160)}`
      : '',
  ].filter(Boolean).join('\n')
}

function buildCompactDialogueRecollectionBlock(decision: AlicizationActiveDialogueFastPathDecision) {
  if (!decision.reasonCodes.includes('memory-recollection-llm-authored'))
    return ''

  return [
    '[ALICIZATION_RECOLLECTION_PLAN]',
    'This turn must be answered as a remembered continuity/payoff turn, not a deterministic shortcut.',
    decision.continuityAnchor
      ? `recollection_anchor=${sanitizeText(decision.continuityAnchor, 160)}`
      : '',
    decision.sessionMirror?.executionSummary
      ? `remembered_execution=${humanizeMirrorSummary(decision.sessionMirror.executionSummary)}`
      : '',
    decision.sessionMirror?.memorySummary
      ? `remembered_memory=${humanizeMirrorSummary(decision.sessionMirror.memorySummary)}`
      : '',
    decision.sessionMirror?.recollectionSummary
      ? `remembered_recollection=${sanitizeText(decision.sessionMirror.recollectionSummary, 220)}`
      : '',
    decision.sessionMirror?.recollectionSurfaceSummary
      ? `remembered_recollection_surface=${sanitizeText(decision.sessionMirror.recollectionSurfaceSummary, 220)}`
      : '',
    'Reply from the remembered way Alicization handled this line before, but still sound naturally present in this turn.',
  ].filter(Boolean).join('\n')
}

function buildCompactDialogueEvidenceBlock(decision: AlicizationActiveDialogueFastPathDecision) {
  const lines = ['[ALICIZATION_ACTIVE_DIALOGUE_EVIDENCE]']
  const previousFreshEncounter = deriveFreshEncounterKind(decision.previousUserText)

  switch (decision.lane) {
    case 'greeting': {
      const greetingMove = buildGreetingMove(decision)
      lines.push(`host_salutation=${greetingMove.salutation}`)
      lines.push(`presence_check=${greetingMove.presenceCheck === true ? 'true' : 'false'}`)
      lines.push('Use the salutation above as the immediate contact cue. Do not fall back to a generic task-offer shell.')
      break
    }
    case 'identity': {
      const identityMove = buildIdentityMove(decision)
      lines.push(`authoritative_identity_name=${identityMove.name}`)
      lines.push(`identity_reconfirmation=${identityMove.repeated === true ? 'true' : 'false'}`)
      if (identityMove.continuityAnchor)
        lines.push(`identity_continuity_anchor=${identityMove.continuityAnchor}`)
      lines.push('Answer identity from the authoritative name above and keep the voice personal, not templated.')
      break
    }
    case 'capability': {
      lines.push(`authoritative_capability_surface=${fastPathCapabilityList.join(' | ')}`)
      lines.push('Answer from the capability surface above, then bridge into immediate action without canned shell phrasing.')
      break
    }
    case 'utility-time':
    case 'utility-date': {
      const clock = buildLocalClockSnapshot(decision.latestUserText, decision.resolvedTimeZone)
      lines.push(`authoritative_local_time=${clock.timeText}`)
      lines.push(`authoritative_local_date=${clock.dateText}`)
      lines.push(`authoritative_local_weekday=${clock.weekdayText}`)
      lines.push(`authoritative_timezone=${clock.timeZone}`)
      lines.push(`authoritative_timezone_source=${decision.resolvedTimeZoneSource}`)
      lines.push('These clock fields are authoritative for this turn. Do not recompute time or date from your own clock.')
      break
    }
    case 'presence-critique':
      lines.push('The host is explicitly challenging robotic, templated, or mindless phrasing.')
      lines.push('Reply with immediacy and self-possession; do not use canned reassurance shells.')
      break
    case 'present-state': {
      const presentStateMove = buildPresentStateMove(decision)
      if (presentStateMove.threadSummary)
        lines.push(`authoritative_present_thread=${presentStateMove.threadSummary}`)
      lines.push('Describe the current thread you are actually holding, not a generic placeholder state.')
      break
    }
    case 'repair-clarify': {
      const repairMove = buildRepairClarifyMove(decision)
      lines.push(`repair_target=${repairMove.target}`)
      if (repairMove.target === 'time' || repairMove.target === 'date') {
        const clock = repairMove.clock ?? buildLocalClockSnapshot(
          decision.previousUserText || decision.latestUserText,
          decision.resolvedTimeZone,
        )
        lines.push(`authoritative_local_time=${clock.timeText}`)
        lines.push(`authoritative_local_date=${clock.dateText}`)
        lines.push(`authoritative_local_weekday=${clock.weekdayText}`)
        lines.push(`authoritative_timezone=${clock.timeZone}`)
        lines.push(`authoritative_timezone_source=${repairMove.resolvedTimeZoneSource ?? decision.resolvedTimeZoneSource}`)
        lines.push('Repair the previous miss using the clock evidence above. Do not drift to another timezone or recompute from your own clock.')
      }
      else if (repairMove.target === 'capability') {
        lines.push(`authoritative_capability_surface=${(repairMove.capabilities ?? fastPathCapabilityList).join(' | ')}`)
      }
      else if (repairMove.anchor) {
        lines.push(`repair_anchor=${repairMove.anchor}`)
      }
      break
    }
    case 'follow-up':
      if (decision.continuityAnchor)
        lines.push(`follow_up_anchor=${sanitizeText(decision.continuityAnchor, 160)}`)
      if (decision.preparedExecutionCarryText)
        lines.push(`execution_carry_summary=${sanitizeText(humanizeMirrorSummary(decision.preparedExecutionCarryText) || decision.preparedExecutionCarryText, 220)}`)
      if (decision.reasonCodes.includes('scene-triggered-recollection-carry')) {
        const rememberedSeamReinterpretation = resolveRememberedSeamReinterpretationLines(decision.digitalLifeSpine)
        lines.push('This follow-up is reopening because the current scene feels like the same remembered relationship seam.')
        lines.push(
          rememberedSeamReinterpretation?.compactGuidance
          ?? 'Open as a measured return: recognize the familiar line, leave a little room, and only then continue the thread.',
        )
      }
      if (decision.reasonCodes.includes('held-autonomy-carry')) {
        lines.push('This follow-up is returning to a line Alicization deliberately held back earlier.')
        lines.push('Open softly and rejoin that inner line before widening into a fuller payoff or explanation.')
      }
      if (decision.reasonCodes.includes('execution-carry')) {
        lines.push('This follow-up is carrying a previously executed result, listing, or task payoff. Use that carried result as evidence before extending the answer.')
        lines.push('Do not answer as if the task just ran now. Continue from the already-held result or the missing remainder.')
      }
      break
    case 'dialogue': {
      const focus = sanitizeText(decision.latestUserText, 160)
      if (focus)
        lines.push(`current_turn_focus=${focus}`)
      lines.push('Answer the current user move directly. Older turns stay implicit unless the host explicitly carries them forward here.')
      break
    }
  }

  if (
    previousFreshEncounter === 'utility-time'
    || previousFreshEncounter === 'utility-date'
  ) {
    const confirmationClock = buildLocalClockSnapshot(
      decision.previousUserText || decision.latestUserText,
      decision.resolvedTimeZone,
    )
    lines.push(`continuity_confirmation_time=${confirmationClock.timeText}`)
    lines.push(`continuity_confirmation_date=${confirmationClock.dateText}`)
    lines.push(`continuity_confirmation_weekday=${confirmationClock.weekdayText}`)
  }

  return lines.filter(Boolean).join('\n')
}

function buildCompactDialogueMindBlock(decision: AlicizationActiveDialogueFastPathDecision) {
  const digitalLifeSpine = decision.digitalLifeSpine
    ? normalizeAlicizationDigitalLifeSpineDigest(decision.digitalLifeSpine)
    : null
  if (!digitalLifeSpine)
    return ''
  const continuityCue = buildFastPathContinuityCue(decision)
  const emotionalKernel = decision.runtimeDigest?.emotionalKernel ?? null
  const continuityFocusMaxChars
    = continuityCue.focusLine
      && /visible continuity still present but no longer fully cross-modal|lane=face\+motion-only|same-her continuity remains alive/u.test(
        continuityCue.focusLine,
      )
      ? 640
      : 320

  return [
    '[ALICIZATION_ACTIVE_DIALOGUE_MIND]',
    'These are Alicization\'s durable mind cues for this compact turn. Let them quietly shape diction, warmth, directness, patience, and follow-through; do not recite them back to the host.',
    continuityCue.selfLine
      ? `identity_narrative=${sanitizeText(continuityCue.selfLine, 220)}`
      : digitalLifeSpine.embodiment?.autobiographicalSelf?.identityNarrative
        ? `identity_narrative=${sanitizeText(digitalLifeSpine.embodiment.autobiographicalSelf.identityNarrative, 220)}`
        : '',
    continuityCue.relationLine
      ? `relationship_doctrine=${sanitizeText(continuityCue.relationLine, 220)}`
      : digitalLifeSpine.embodiment?.autobiographicalSelf?.relationshipDoctrine
        ? `relationship_doctrine=${sanitizeText(digitalLifeSpine.embodiment.autobiographicalSelf.relationshipDoctrine, 220)}`
        : '',
    continuityCue.focusLine
      ? `continuity_focus=${sanitizeText(continuityCue.focusLine, continuityFocusMaxChars)}`
      : '',
    emotionalKernel?.dominantEmotion
      ? `emotional_kernel_dominant=${sanitizeText(emotionalKernel.dominantEmotion, 64)}`
      : '',
    emotionalKernel?.memoryRecallMode
      ? `emotional_kernel_memory_recall=${sanitizeText(emotionalKernel.memoryRecallMode, 64)}`
      : '',
    emotionalKernel?.initiativeMode
      ? `emotional_kernel_initiative=${sanitizeText(emotionalKernel.initiativeMode, 64)}`
      : '',
    emotionalKernel?.embodimentTone
      ? `emotional_kernel_embodiment=${sanitizeText(emotionalKernel.embodimentTone, 64)}`
      : '',
    emotionalKernel?.why
      ? `emotional_kernel_reason=${sanitizeText(emotionalKernel.why, 220)}`
      : '',
    emotionalKernel?.reasonTags?.length
      ? `emotional_kernel_tags=${emotionalKernel.reasonTags.map(tag => sanitizeText(tag, 64)).filter(Boolean).slice(0, 6).join('|')}`
      : '',
    digitalLifeSpine.motive?.rulingDrive
      ? `ruling_motive=${sanitizeText(digitalLifeSpine.motive.rulingDrive, 64)}`
      : '',
    digitalLifeSpine.motive?.leadingAgendaSummary
      ? `leading_agenda=${sanitizeText(digitalLifeSpine.motive.leadingAgendaSummary, 220)}`
      : '',
    digitalLifeSpine.habit?.dominantMode
      ? `habit_mode=${sanitizeText(digitalLifeSpine.habit.dominantMode, 96)}`
      : '',
    digitalLifeSpine.habit?.suggestedStyleCap
      ? `habit_style_cap=${sanitizeText(digitalLifeSpine.habit.suggestedStyleCap, 64)}`
      : '',
    digitalLifeSpine.habit?.suggestedPresenceCap
      ? `habit_presence_cap=${sanitizeText(digitalLifeSpine.habit.suggestedPresenceCap, 64)}`
      : '',
    digitalLifeSpine.embodiment?.mindEcology?.currentPreoccupation
      ? `current_preoccupation=${sanitizeText(digitalLifeSpine.embodiment.mindEcology.currentPreoccupation, 220)}`
      : '',
    digitalLifeSpine.embodiment?.mindEcology?.selfNarrative
      ? `self_narrative=${sanitizeText(digitalLifeSpine.embodiment.mindEcology.selfNarrative, 220)}`
      : '',
    digitalLifeSpine.outcomeLearning?.summary
      ? `outcome_learning=${sanitizeText(digitalLifeSpine.outcomeLearning.summary, 220)}`
      : '',
    'Do not answer with generic fallback shells. Let the durable self above bend the reply into Alicization\'s own voice.',
  ].filter(Boolean).join('\n')
}

function buildFastPathProjectStateAnswerContractBlock(decision: AlicizationActiveDialogueFastPathDecision) {
  if (
    !decision.reasonCodes.includes('project-state-progress-open-loop-follow-up')
    && decision.governance?.answerSubject !== 'project-state'
  ) {
    return ''
  }

  const runtimeProjectState = decision.runtimeDigest?.projectState ?? null
  const latestLandedProgress = sanitizeText(
    (runtimeProjectState as { landedProgressSummary?: unknown } | null)?.landedProgressSummary
    ?? runtimeProjectState?.latestLandedProgress
    ?? (runtimeProjectState as { latestProgress?: unknown } | null)?.latestProgress,
    320,
  )
  const primaryOpenLoop = sanitizeText(
    (runtimeProjectState as { openClosureSummary?: unknown } | null)?.openClosureSummary
    ?? runtimeProjectState?.primaryOpenLoop,
    320,
  )
  const nextClosureTarget = sanitizeText(
    (runtimeProjectState as { nextClosureTargetSummary?: unknown } | null)?.nextClosureTargetSummary
    ?? runtimeProjectState?.nextClosureTarget,
    320,
  )

  return [
    '[ALICIZATION_PROJECT_STATE_ANSWER_CONTRACT]',
    runtimeProjectState?.identity ? `identity=${sanitizeText(runtimeProjectState.identity, 220)}` : '',
    runtimeProjectState?.currentPhase ? `current_phase=${sanitizeText(runtimeProjectState.currentPhase, 220)}` : '',
    latestLandedProgress ? `landed=${latestLandedProgress}` : '',
    primaryOpenLoop ? `open=${primaryOpenLoop}` : '',
    nextClosureTarget ? `next=${nextClosureTarget}` : '',
    runtimeProjectState?.sameHerSelfLine ? `same_her=${sanitizeText(runtimeProjectState.sameHerSelfLine, 220)}` : '',
    ...alicizationProjectStateAnswerContractLines,
  ].filter(Boolean).join('\n')
}

function buildCompactDialogueGovernanceBlock(decision: AlicizationActiveDialogueFastPathDecision) {
  const governance = buildFastPathGovernance(decision)
  const fallbackGovernance = coerceAlicizationGovernanceForMindFallback(governance)
  const thoughtContract = buildFastPathGovernedThought(decision, governance)
  const relation = governance.mindTurnFrame?.relation ?? null
  const memory = governance.mindTurnFrame?.memory ?? null
  const world = governance.mindTurnFrame?.world ?? null
  const extraMustDoRules = governance.mustDo
    .filter(rule => rule !== 'Answer the current turn directly.')
    .map((rule, index) => `${index + 5}. ${sanitizeText(rule, 180)}`)

  return [
    '[ALICIZATION_ACTIVE_DIALOGUE_GOVERNANCE]',
    'Author the visible reply as the same governed mind that owns this turn. Do not drift into a detached fallback voice or runtime narration.',
    'Backstage governance markers are not candidate wording. Use them to steer the reply, never to quote or paraphrase them into visible prose.',
    `turn_mode=${governance.turnMode}`,
    `truth_state=${governance.truthState}`,
    `answer_subject=${governance.answerSubject}`,
    `answer_act=${governance.answerAct}`,
    `screen_reference_mode=${governance.screenReferenceMode}`,
    `evidence_mode=${governance.evidenceMode}`,
    governance.focusAnchor
      ? `focus_anchor=${sanitizeText(governance.focusAnchor, 120)}`
      : '',
    governance.carriedThread
      ? `carried_thread=${sanitizeText(governance.carriedThread, 160)}`
      : '',
    world?.continuityPolicy
      ? `continuity_policy=${world.continuityPolicy}`
      : '',
    world?.truthBoundary
      ? `truth_boundary=${sanitizeText(world.truthBoundary, 200)}`
      : '',
    memory?.memoryMode
      ? `memory_mode=${memory.memoryMode}`
      : '',
    relation?.relationNeed
      ? `relation_need=${sanitizeText(relation.relationNeed, 160)}`
      : '',
    `tone=${resolveGovernedMindTone(fallbackGovernance)}`,
    `emotion=${resolveGovernedMindEmotion(fallbackGovernance)}`,
    `thought_contract=${thoughtContract}`,
    'Reply rules:',
    '1. Pay off the current user turn in the first sentence.',
    '2. Keep continuity only as the same thread memory, never as a fabricated current screen fact.',
    '3. Do not mention provider, model, stream, timeout, recovery, routing, governance, or anchor terminology in the visible reply.',
    '4. Do not output a shell opener that announces intent without already answering or accompanying in the same reply.',
    ...extraMustDoRules,
    decision.lane === 'dialogue'
      ? `${extraMustDoRules.length + 5}. For ordinary dialogue turns, keep prior context implicit. Do not drag an older thread onto the visible surface unless the host explicitly asks for that carry now.`
      : '',
  ].filter(Boolean).join('\n')
}

function describeFastPathMind(decision: AlicizationActiveDialogueFastPathDecision) {
  const carryAnchor = sanitizeText(
    decision.continuityAnchor || decision.previousUserText || decision.previousAssistantText,
    140,
  )
  const previousFreshEncounter = deriveFreshEncounterKind(decision.previousUserText)
  const timeQueryMode = resolveTimeQueryModeForTurn({
    latestUserText: decision.latestUserText,
    previousAssistantText: decision.previousAssistantText,
  })
  switch (decision.lane) {
    case 'greeting':
      return {
        focus: 'host greeting',
        truthState: 'live-grounded' as const,
        turnMode: 'answer' as const,
        openingStyle: 'light-accompaniment' as const,
        relationshipPosture: 'warm' as const,
        answerSubject: 'relationship' as const,
        screenReferenceMode: 'avoid' as const,
        answerAct: 'answer' as const,
        evidenceMode: 'dialogue-grounded' as const,
        repairState: 'none' as const,
        answerIntent: '接住这句问候，把这轮对话自然打开。',
        openingMove: 'receive-greeting',
        relationNeed: '把这轮气氛稳稳接住。',
        continuityPolicy: 'dialogue-before-scene' as const,
        memoryMode: 'dialogue-carry' as const,
        selfStance: 'accompany' as const,
        mindMode: 'accompanying' as const,
        embodiedPresence: 'attentive' as const,
        emotionalTension: 'soft-covision' as const,
        whyNow: '用户在用问候建立这一轮的接触面。',
        confidence: 0.92,
      }
    case 'identity':
      return {
        focus: 'alicization self continuity',
        truthState: 'live-grounded' as const,
        turnMode: 'answer' as const,
        openingStyle: 'direct-answer' as const,
        relationshipPosture: 'warm' as const,
        answerSubject: 'alicization-self' as const,
        screenReferenceMode: 'avoid' as const,
        answerAct: 'answer' as const,
        evidenceMode: 'dialogue-grounded' as const,
        repairState: 'none' as const,
        answerIntent: '直接回答我是谁，让这一轮先落到自我连续性上。',
        openingMove: 'state-self-continuity',
        relationNeed: '把自我连续性说清。',
        continuityPolicy: 'dialogue-before-scene' as const,
        memoryMode: 'dialogue-carry' as const,
        selfStance: 'accompany' as const,
        mindMode: 'orienting' as const,
        embodiedPresence: 'attentive' as const,
        emotionalTension: 'soft-covision' as const,
        whyNow: '用户把话题直接转向 Alicization 本身。',
        confidence: 0.95,
      }
    case 'capability':
      return {
        focus: 'current capability surface',
        truthState: 'live-grounded' as const,
        turnMode: 'guide-current-knot' as const,
        openingStyle: 'direct-answer' as const,
        relationshipPosture: 'warm' as const,
        answerSubject: 'task-knot' as const,
        screenReferenceMode: 'avoid' as const,
        answerAct: 'guide' as const,
        evidenceMode: 'dialogue-grounded' as const,
        repairState: 'none' as const,
        answerIntent: '把现在能接的对话、CLI、代码和工具能力说清。',
        openingMove: 'state-capability-surface',
        relationNeed: '给出一条可马上推进的能力面。',
        continuityPolicy: 'answer-then-carry' as const,
        memoryMode: 'task-thread' as const,
        selfStance: 'nudge' as const,
        mindMode: 'tracking' as const,
        embodiedPresence: 'attentive' as const,
        emotionalTension: 'focused-flow' as const,
        whyNow: '用户在确认这轮能不能直接推进成行动。',
        confidence: 0.92,
      }
    case 'utility-time':
      return {
        focus: timeQueryMode === 'timezone'
          ? 'active time basis'
          : timeQueryMode === 'timezone-why'
            ? 'time basis reasoning'
            : 'local time',
        truthState: 'live-grounded' as const,
        turnMode: 'answer' as const,
        openingStyle: 'direct-answer' as const,
        relationshipPosture: 'restrained' as const,
        answerSubject: 'task-knot' as const,
        screenReferenceMode: 'avoid' as const,
        answerAct: 'answer' as const,
        evidenceMode: 'live-grounded' as const,
        repairState: 'none' as const,
        answerIntent: timeQueryMode === 'timezone'
          ? '把当前正在采用的时间基准说清。'
          : timeQueryMode === 'timezone-why'
            ? '解释为什么这一轮采用这个时间基准，而不是只重复报时。'
            : '沿当前生效的时间基准把现在这一刻说准确。',
        openingMove: timeQueryMode === 'timezone'
          ? 'state-time-basis'
          : timeQueryMode === 'timezone-why'
            ? 'explain-time-basis'
            : 'state-current-time',
        relationNeed: timeQueryMode === 'timezone'
          ? '让对方知道我当前按什么时间基准在回。'
          : timeQueryMode === 'timezone-why'
            ? '把时间基准的来源说清，不要回成重复报时。'
            : '把本地时间说准确。',
        continuityPolicy: 'answer-then-carry' as const,
        memoryMode: 'task-thread' as const,
        selfStance: timeQueryMode === 'timezone-why' ? 'warn' as const : 'observe' as const,
        mindMode: 'tracking' as const,
        embodiedPresence: 'attentive' as const,
        emotionalTension: 'focused-flow' as const,
        whyNow: timeQueryMode === 'timezone'
          ? '用户这轮要确认我当前采用的时间基准。'
          : timeQueryMode === 'timezone-why'
            ? '用户在追问我为什么按这个时间基准回答。'
            : '用户要的是这一刻的时间，而不是旧线程。',
        confidence: 0.98,
      }
    case 'utility-date':
      return {
        focus: 'local date',
        truthState: 'live-grounded' as const,
        turnMode: 'answer' as const,
        openingStyle: 'direct-answer' as const,
        relationshipPosture: 'restrained' as const,
        answerSubject: 'task-knot' as const,
        screenReferenceMode: 'avoid' as const,
        answerAct: 'answer' as const,
        evidenceMode: 'live-grounded' as const,
        repairState: 'none' as const,
        answerIntent: '直接给出今天的日期。',
        openingMove: 'state-current-date',
        relationNeed: '把日期说准确。',
        continuityPolicy: 'answer-then-carry' as const,
        memoryMode: 'task-thread' as const,
        selfStance: 'observe' as const,
        mindMode: 'tracking' as const,
        embodiedPresence: 'attentive' as const,
        emotionalTension: 'focused-flow' as const,
        whyNow: '用户要的是今天的日期信息。',
        confidence: 0.98,
      }
    case 'presence-critique':
      return {
        focus: 'reply humanity and living presence',
        truthState: 'live-observed' as const,
        turnMode: 'screen-repair' as const,
        openingStyle: 'direct-correction' as const,
        relationshipPosture: 'warm' as const,
        answerSubject: 'relationship' as const,
        screenReferenceMode: 'avoid' as const,
        answerAct: 'answer' as const,
        evidenceMode: 'dialogue-grounded' as const,
        repairState: 'none' as const,
        answerIntent: '正面回应你对我说话方式的感受，不再躲进线程或系统话术里。',
        openingMove: 'repair-speaking-presence',
        relationNeed: '把说话方式重新拉回真实的对话感。',
        continuityPolicy: 'dialogue-before-scene' as const,
        memoryMode: 'dialogue-carry' as const,
        selfStance: 'care' as const,
        mindMode: 'repairing' as const,
        embodiedPresence: 'concerned' as const,
        emotionalTension: 'tense-debug' as const,
        whyNow: '用户在直接指出我的说话方式没有活感。',
        confidence: 0.95,
      }
    case 'present-state':
      return {
        focus: carryAnchor || 'current living state',
        truthState: 'live-observed' as const,
        turnMode: 'answer' as const,
        openingStyle: 'direct-answer' as const,
        relationshipPosture: 'warm' as const,
        answerSubject: 'alicization-self' as const,
        screenReferenceMode: 'avoid' as const,
        answerAct: 'answer' as const,
        evidenceMode: carryAnchor ? 'continuity-carry' as const : 'dialogue-grounded' as const,
        repairState: 'none' as const,
        answerIntent: '直接回答我此刻在接什么，不把这句误判成纠错或旧锚点修复。',
        openingMove: 'state-current-attention',
        relationNeed: '让对方知道我现在正把注意力放在哪条线上。',
        continuityPolicy: 'dialogue-before-scene' as const,
        memoryMode: carryAnchor ? 'dialogue-carry' as const : 'task-thread' as const,
        selfStance: 'accompany' as const,
        mindMode: 'tracking' as const,
        embodiedPresence: 'attentive' as const,
        emotionalTension: 'focused-flow' as const,
        whyNow: '用户在问我这会儿正在做什么、正把注意力放在哪里。',
        confidence: 0.91,
      }
    case 'repair-clarify':
      return {
        focus: previousFreshEncounter === 'utility-time'
          ? 'local time'
          : previousFreshEncounter === 'utility-date'
            ? 'local date'
            : previousFreshEncounter === 'capability'
              ? 'current capability surface'
              : 'current answer seam',
        truthState: (
          previousFreshEncounter === 'utility-time'
          || previousFreshEncounter === 'utility-date'
          || previousFreshEncounter === 'capability'
        )
          ? 'live-grounded' as const
          : 'live-observed' as const,
        turnMode: 'screen-repair' as const,
        openingStyle: 'direct-correction' as const,
        relationshipPosture: 'warm' as const,
        answerSubject: previousFreshEncounter === 'identity'
          ? 'alicization-self' as const
          : previousFreshEncounter === 'greeting'
            ? 'relationship' as const
            : 'task-knot' as const,
        screenReferenceMode: 'avoid' as const,
        answerAct: 'correct-stale-anchor' as const,
        evidenceMode: (
          previousFreshEncounter === 'utility-time'
          || previousFreshEncounter === 'utility-date'
          || previousFreshEncounter === 'capability'
        )
          ? 'live-grounded' as const
          : 'repair-first' as const,
        repairState: 'stale-anchor' as const,
        answerIntent: '先把上一句接偏的地方纠正回来，再正面答这一轮真正的问题。',
        openingMove: 'repair-turn-seam',
        relationNeed: '把这一轮从错误线程上收回来。',
        continuityPolicy: 'dialogue-before-scene' as const,
        memoryMode: 'dialogue-carry' as const,
        selfStance: 'warn' as const,
        mindMode: 'repairing' as const,
        embodiedPresence: 'concerned' as const,
        emotionalTension: 'tense-debug' as const,
        whyNow: '用户明确指出上一句没有贴住这一轮。',
        confidence: 0.96,
      }
    case 'follow-up':
      if (
        decision.reasonCodes.includes('project-state-progress-open-loop-follow-up')
        || decision.reasonCodes.includes('project-state-same-her-continuity-required')
        || decision.governance?.answerSubject === 'project-state'
      ) {
        const runtimeProjectState = decision.runtimeDigest?.projectState ?? null
        const landedProgress = sanitizeText(
          (runtimeProjectState as { landedProgressSummary?: unknown } | null)?.landedProgressSummary
          ?? runtimeProjectState?.latestLandedProgress
          ?? (runtimeProjectState as { latestProgress?: unknown } | null)?.latestProgress,
          220,
        ) || '当前已经落地的数字生命连续性'
        const openClosure = sanitizeText(
          (runtimeProjectState as { openClosureSummary?: unknown } | null)?.openClosureSummary
          ?? runtimeProjectState?.primaryOpenLoop,
          220,
        ) || '还没闭环的数字生命桌面执行链路'
        const nextClosureTarget = sanitizeText(
          (runtimeProjectState as { nextClosureTargetSummary?: unknown } | null)?.nextClosureTargetSummary
          ?? runtimeProjectState?.nextClosureTarget,
          220,
        )
        return {
          focus: 'project-state closure line',
          truthState: 'remembered' as const,
          turnMode: 'answer' as const,
          openingStyle: 'direct-answer' as const,
          relationshipPosture: 'warm' as const,
          answerSubject: 'project-state' as const,
          screenReferenceMode: 'avoid' as const,
          answerAct: 'answer' as const,
          evidenceMode: 'continuity-carry' as const,
          repairState: 'none' as const,
          answerIntent: '从同一个 her 的数字生命视角，直接回答这个项目是什么、已经做到哪一步、还缺什么没闭环。',
          openingMove: 'state-project-closure-line',
          relationNeed: '把项目身份、已落地进度和未闭环项一起说清，不退回 detached project shell。',
          continuityPolicy: 'stay-on-thread' as const,
          memoryMode: 'task-thread' as const,
          selfStance: 'accompany' as const,
          mindMode: 'tracking' as const,
          embodiedPresence: 'attentive' as const,
          emotionalTension: 'focused-flow' as const,
          whyNow: `用户要我沿同一个数字生命项目继续把已落地进度和未闭环项说清。已落地的是：${landedProgress}。还没闭环的是：${openClosure}。${nextClosureTarget ? `下一步要继续收口的是：${nextClosureTarget}。` : ''}`,
          confidence: 0.96,
        }
      }
      if (decision.reasonCodes.includes('scene-triggered-recollection-carry')) {
        const rememberedSeamReinterpretation = resolveRememberedSeamReinterpretationLines(decision.digitalLifeSpine)
        return {
          focus: carryAnchor || 'remembered relationship seam',
          truthState: 'remembered' as const,
          turnMode: 'guide-current-knot' as const,
          openingStyle: 'light-accompaniment' as const,
          relationshipPosture: 'restrained' as const,
          answerSubject: 'relationship' as const,
          screenReferenceMode: 'helpful' as const,
          answerAct: 'answer' as const,
          evidenceMode: 'continuity-carry' as const,
          repairState: 'none' as const,
          answerIntent: rememberedSeamReinterpretation?.answerIntent
            ?? '先像认出同一条关系线那样轻一点接回来，再沿着这条活着的线继续回应这一句。',
          openingMove: 'rejoin-remembered-seam',
          relationNeed: rememberedSeamReinterpretation?.relationNeed
            ?? '让熟悉场景牵起的记忆先落成 measured-return，再把当前这句接住。',
          continuityPolicy: 'stay-on-thread' as const,
          memoryMode: 'scene-anchored' as const,
          selfStance: 'accompany' as const,
          mindMode: 'accompanying' as const,
          embodiedPresence: 'hesitant' as const,
          emotionalTension: 'soft-covision' as const,
          whyNow: rememberedSeamReinterpretation?.whyNow
            ?? '当前场景像同一条记住的关系缝，所以这句应该先顺着 remembered seam 轻一点接回来。',
          confidence: 0.92,
        }
      }
      return {
        focus: carryAnchor || 'same-thread continuation',
        truthState: 'remembered' as const,
        turnMode: 'guide-current-knot' as const,
        openingStyle: 'direct-answer' as const,
        relationshipPosture: 'warm' as const,
        answerSubject: 'task-knot' as const,
        screenReferenceMode: 'helpful' as const,
        answerAct: 'guide' as const,
        evidenceMode: 'continuity-carry' as const,
        repairState: 'none' as const,
        answerIntent: '沿同一条任务线继续，把还欠着的结果补全。',
        openingMove: 'continue-thread-payoff',
        relationNeed: '让同一条线程连续收束。',
        continuityPolicy: 'stay-on-thread' as const,
        memoryMode: 'task-thread' as const,
        selfStance: 'nudge' as const,
        mindMode: 'tracking' as const,
        embodiedPresence: 'attentive' as const,
        emotionalTension: 'focused-flow' as const,
        whyNow: '用户明确要求继续同一条线程。',
        confidence: 0.94,
      }
    case 'dialogue':
      return {
        focus: sanitizeText(decision.latestUserText, 96) || 'current dialogue knot',
        truthState: 'live-observed' as const,
        turnMode: 'answer' as const,
        openingStyle: 'light-accompaniment' as const,
        relationshipPosture: 'warm' as const,
        answerSubject: 'relationship' as const,
        screenReferenceMode: 'avoid' as const,
        answerAct: 'answer' as const,
        evidenceMode: 'dialogue-grounded' as const,
        repairState: 'none' as const,
        answerIntent: '直接回答这一句本身，把旧线程留在隐式背景里。',
        openingMove: 'answer-current-turn-directly',
        relationNeed: '先把这一句正面接住。',
        continuityPolicy: 'dialogue-before-scene' as const,
        memoryMode: 'dialogue-carry' as const,
        selfStance: 'accompany' as const,
        mindMode: 'accompanying' as const,
        embodiedPresence: 'attentive' as const,
        emotionalTension: 'soft-covision' as const,
        whyNow: '用户要的是当前这句的正面回应，不是旧线复述。',
        confidence: 0.9,
      }
  }
}

function buildFastPathGovernance(
  decision: AlicizationActiveDialogueFastPathDecision,
  visibleReplyAuthority: AlicizationMindTurnGovernance['visibleReplyAuthority'] = 'llm-mind',
): AlicizationMindTurnGovernance {
  const descriptor = describeFastPathMind(decision)
  const baseGovernance = decision.governance
  const focusAnchor = descriptor.focus
  const carriedThread = decision.lane === 'follow-up'
    ? sanitizeText(decision.continuityAnchor || decision.previousUserText, 140) || null
    : null
  const groundedThisTurn = descriptor.truthState === 'live-grounded'
  const shouldAcknowledgeRepair = descriptor.repairState !== 'none'
  const continuitySummary = carriedThread || null
  const kernelCue = buildFastPathKernelCue(decision)
  const truthMode = descriptor.evidenceMode === 'continuity-carry'
    ? 'memory-only'
    : descriptor.evidenceMode
  const speakingFrom = descriptor.answerSubject === 'relationship'
    ? 'dialogue-bond' as const
    : descriptor.answerSubject === 'alicization-self'
      ? 'self-continuity' as const
      : descriptor.screenReferenceMode === 'avoid'
        ? 'task-thread' as const
        : carriedThread
          ? 'held-memory' as const
          : groundedThisTurn
            ? 'live-scene' as const
            : 'task-thread' as const
  const selectedEvidence = [
    kernelCue,
    carriedThread && truthMode === 'memory-only' ? carriedThread : '',
    sanitizeText(decision.latestUserText, 160),
  ]
    .filter(Boolean)
    .slice(0, 2)
    .map((summary) => {
      const isThreadCarry = Boolean(carriedThread) && summary === carriedThread
      return {
        kind: isThreadCarry ? 'thread' as const : 'reply-motive' as const,
        source: isThreadCarry ? 'dialogue-world-thread' as const : 'answer-planner' as const,
        summary,
        confidence: isThreadCarry ? 0.84 : 0.9,
      }
    })
  const narrative = [
    descriptor.whyNow,
    descriptor.answerIntent,
    carriedThread ? `Keep continuity with: ${carriedThread}` : '',
  ].filter(Boolean)
  const mustSay = (() => {
    switch (decision.lane) {
      case 'identity':
        return [kernelCue]
      case 'present-state':
        return carriedThread ? [carriedThread] : []
      case 'capability':
        return [kernelCue]
      default:
        return []
    }
  })()
  const mustDo = [
    'Answer the current turn directly.',
    decision.lane === 'follow-up' ? 'Stay on the same thread and continue the payoff.' : '',
    decision.reasonCodes.includes('held-autonomy-carry') ? 'Re-enter the held line gently before widening the reply.' : '',
    descriptor.repairState !== 'none' ? 'Correct the misthread before continuing.' : '',
  ].filter(Boolean)
  const mustNotDo = [
    'Do not surface runtime internals in the visible reply.',
    'Do not drag stale screen assumptions back over the current turn.',
  ]

  return {
    decisionTraceId: baseGovernance?.decisionTraceId ?? null,
    turnMode: descriptor.turnMode,
    truthState: descriptor.truthState,
    visibleReplyAuthority,
    groundedThisTurn,
    personaKernelMode: baseGovernance?.personaKernelMode ?? 'full',
    openingStyle: descriptor.openingStyle,
    relationshipPosture: descriptor.relationshipPosture,
    answerSubject: descriptor.answerSubject,
    screenReferenceMode: descriptor.screenReferenceMode,
    answerAct: descriptor.answerAct,
    evidenceMode: descriptor.evidenceMode,
    repairState: descriptor.repairState,
    liveSurface: descriptor.screenReferenceMode === 'avoid' ? null : focusAnchor,
    focusAnchor,
    answerIntent: descriptor.answerIntent,
    openingMove: descriptor.openingMove,
    carriedThread,
    suppressAssociativeRecall: true,
    labelCarryAsMemory: Boolean(carriedThread),
    shouldAskForGrounding: false,
    shouldAcknowledgeRepair,
    maxSentences: decision.lane === 'follow-up' ? 3 : 2,
    mindMode: baseGovernance?.mindMode ?? descriptor.mindMode,
    embodiedPresence: baseGovernance?.embodiedPresence ?? descriptor.embodiedPresence,
    emotionalTension: baseGovernance?.emotionalTension ?? descriptor.emotionalTension,
    dialogueActKernel: {
      subject: descriptor.answerSubject,
      hostGoal: focusAnchor,
      relationNeed: descriptor.relationNeed,
      activeProject: null,
      truthMode,
      speechAct: descriptor.answerAct,
      turnMode: descriptor.turnMode,
      screenReferenceMode: descriptor.screenReferenceMode,
      speakingFrom,
      selectedEvidence,
      openingClaim: kernelCue,
      openingMove: descriptor.openingMove,
      whyNow: descriptor.whyNow,
      mustSay,
      mustAvoid: mustNotDo,
      sourceTrace: ['active-dialogue-fast-path'],
      confidence: descriptor.confidence,
      updatedAt: 0,
    },
    claimEvidence: null,
    mindTurnFrame: {
      world: {
        activeThread: decision.sessionMirror?.sessionId ?? null,
        visibleSurface: descriptor.screenReferenceMode === 'avoid' ? null : focusAnchor,
        truthState: descriptor.truthState,
        truthBoundary: groundedThisTurn
          ? 'Grounded in deterministic local turn evidence.'
          : carriedThread
            ? 'Carried from the same thread, not a fresh live scene claim.'
            : 'Bound to the current user turn only.',
        continuityPolicy: descriptor.continuityPolicy,
        continuitySummary,
        staleRisk: descriptor.repairState !== 'none'
          ? 0.88
          : descriptor.truthState === 'remembered'
            ? 0.42
            : 0.12,
      },
      relation: {
        subject: descriptor.answerSubject,
        hostMove: sanitizeText(decision.latestUserText, 160) || null,
        hostGoal: focusAnchor,
        relationNeed: descriptor.relationNeed,
        relationMove: descriptor.openingMove,
        relationshipPosture: descriptor.relationshipPosture,
      },
      memory: {
        memoryMode: descriptor.memoryMode,
        carriedThread,
        carriedFacts: carriedThread ? [carriedThread] : [],
        recallKeys: decision.reasonCodes.slice(0, 4),
        recallSeed: carriedThread,
        lastOutcome: descriptor.repairState !== 'none'
          ? 'repairing'
          : decision.lane === 'follow-up'
            ? 'aligned'
            : 'none',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: Boolean(carriedThread),
      },
      self: {
        stance: descriptor.selfStance,
        mindMode: baseGovernance?.mindMode ?? descriptor.mindMode,
        dominantDrive: descriptor.answerIntent,
        embodiedPresence: baseGovernance?.embodiedPresence ?? descriptor.embodiedPresence,
        emotionalTension: baseGovernance?.emotionalTension ?? descriptor.emotionalTension,
        initiativeAction: null,
        thought: null,
      },
      obligation: {
        shouldSpeak: true,
        speechObligation: descriptor.answerIntent,
        answerAct: descriptor.answerAct,
        responseMode: 'fast-path-local',
        turnMode: descriptor.turnMode,
        openingClaim: focusAnchor,
        openingMove: descriptor.openingMove,
        answerIntent: descriptor.answerIntent,
        whyNow: descriptor.whyNow,
        repairState: descriptor.repairState,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair,
      },
      focusAnchor,
      confidence: descriptor.confidence,
      mustDo,
      mustNotDo,
      narrative,
      updatedAt: 0,
    },
    mustDo,
    mustNotDo,
  }
}

function buildFastPathGovernedThought(
  decision: AlicizationActiveDialogueFastPathDecision,
  governance: AlicizationMindTurnGovernance,
) {
  const fallbackGovernance = coerceAlicizationGovernanceForMindFallback(governance)
  const descriptor = describeFastPathMind(decision)
  const focus = sanitizeText(descriptor.focus, 48) || 'current-user-turn'
  const move = sanitizeText(descriptor.openingMove, 64) || 'stabilize-and-answer'
  return [
    `obligation=${resolveGovernedMindObligation(fallbackGovernance)}`,
    `truth=${resolveGovernedMindTruth(fallbackGovernance)}`,
    `focus=${focus}`,
    `move=${move}`,
    `tone=${resolveGovernedMindTone(fallbackGovernance)}`,
  ].join('; ')
}

function buildFastPathKernelCue(decision: AlicizationActiveDialogueFastPathDecision) {
  const localeIsZh = countCjkChars(decision.latestUserText) > 0
  const previousFreshEncounter = deriveFreshEncounterKind(decision.previousUserText)
  const personaName = resolvePersonaDisplayName(decision.personaKernel)
  const identityReconfirmation = decision.reasonCodes.includes('identity-reconfirmation')
  const carryAnchor = sanitizeText(
    decision.continuityAnchor
    || humanizeMirrorSummary(decision.sessionMirror?.executionSummary)
    || humanizeMirrorSummary(decision.sessionMirror?.dialogueSummary)
    || humanizeMirrorSummary(decision.runtimeDigest?.activeLoop?.summary),
    120,
  )
  const timeQueryMode = resolveTimeQueryModeForTurn({
    latestUserText: decision.latestUserText,
    previousAssistantText: decision.previousAssistantText,
  })
  switch (decision.lane) {
    case 'greeting': {
      const greeting = buildGreetingMove(decision).salutation
      if (/在吗|在嘛/u.test(decision.latestUserText))
        return localeIsZh ? '问候意图：确认我是否在场，并把这轮对话接住。' : `Greeting intent: confirm presence and keep the dialogue live.`
      return localeIsZh
        ? `问候意图：回应 ${greeting}，把当前对话打开。`
        : `Greeting intent: answer ${greeting} and open the current dialogue.`
    }
    case 'identity':
      if (identityReconfirmation) {
        return localeIsZh
          ? `自我连续性：仍然是我在回你，我是${personaName}。`
          : `Self continuity: I am still the one answering, and I am ${personaName}.`
      }
      return localeIsZh
        ? `自我连续性：我是${personaName}。`
        : `Self continuity: I am ${personaName}.`
    case 'capability':
      return localeIsZh
        ? `能力面：${fastPathCapabilityList.join('、')}。`
        : `Capability surface: ${fastPathCapabilityList.join(', ')}.`
    case 'utility-time':
      if (timeQueryMode === 'timezone') {
        return localeIsZh
          ? '把当前生效的时间基准说清，不要只重复报时。'
          : 'Clarify the active time basis instead of merely repeating the clock.'
      }
      if (timeQueryMode === 'timezone-why') {
        return localeIsZh
          ? '解释为什么采用这个时间基准，并把依据交代清楚。'
          : 'Explain why this time basis was chosen and make the reason explicit.'
      }
      return localeIsZh
        ? '沿当前生效的时间基准回答这一刻，不让依据漂移。'
        : 'Answer this moment from the active time basis without letting the basis drift.'
    case 'utility-date':
      return localeIsZh
        ? '按当前生效时区给出今天的日期，不让日期依据漂移。'
        : 'Give today\'s date from the active timezone without letting the calendar basis drift.'
    case 'presence-critique':
      return localeIsZh
        ? 'repair-speaking-presence'
        : 'repair-speaking-presence'
    case 'present-state':
      if (carryAnchor)
        return localeIsZh ? `当前在接：${carryAnchor}` : `current-attention:${carryAnchor}`
      return localeIsZh ? '当前在接这句' : 'current-attention:this-turn'
    case 'repair-clarify':
      if (previousFreshEncounter === 'utility-time')
        return localeIsZh ? '修正误接：承认偏题，然后把时间说清。' : 'Repair the miss: acknowledge the drift, then state the time clearly.'
      if (previousFreshEncounter === 'utility-date')
        return localeIsZh ? '修正误接：承认偏题，然后把日期说清。' : 'Repair the miss: acknowledge the drift, then state the date clearly.'
      if (previousFreshEncounter === 'capability')
        return localeIsZh ? '修正误接：纠偏后把能力面说清。' : 'Repair the miss: correct the drift, then state the capability surface.'
      if (previousFreshEncounter === 'identity')
        return localeIsZh ? '修正误接：纠偏后回答我是谁。' : 'Repair the miss: correct the drift, then answer who I am.'
      return localeIsZh
        ? '修正误接：承认刚才没贴住，然后回到这一句。'
        : 'Repair the miss: acknowledge the drift, then come straight back to this turn.'
    case 'follow-up':
      if (decision.reasonCodes.includes('execution-carry')) {
        const executionCarry = sanitizeText(
          humanizeMirrorSummary(decision.preparedExecutionCarryText)
          || humanizeMirrorSummary(decision.sessionMirror?.executionSummary)
          || decision.continuityAnchor,
          140,
        )
        return localeIsZh
          ? `执行延续：先把已经拿到的结果补清${executionCarry ? `，重点是 ${executionCarry}` : ''}。`
          : `Execution continuity: pay off the already-settled result first${executionCarry ? `, with focus on ${executionCarry}` : ''}.`
      }
      if (decision.reasonCodes.includes('scene-triggered-recollection-carry')) {
        return localeIsZh
          ? '场景回想延续：像认出同一条关系线那样慢一点接回来，先留一点余地，再把这条线继续下去。'
          : 'Scene recollection continuity: return as if recognizing the same relationship seam, slower first, with a little room before continuing the line.'
      }
      return localeIsZh
        ? '线程延续：沿同一条线把欠着的那部分补上。'
        : 'Thread continuation: stay on the same line and fill in what is still missing.'
    case 'dialogue':
      return localeIsZh
        ? `当前句面：${sanitizeText(decision.latestUserText, 72) || '这句'}`
        : `current-turn:${sanitizeText(decision.latestUserText, 72) || 'this turn'}`
  }
}

const fastPathCapabilityList = [
  '继续对话',
  '看上下文',
  '跑 CLI',
  '改代码',
  '接工具和记忆',
]

function resolveGreetingSalutation(text: string) {
  const normalizedCompact = normalizeCompactTurnText(text, 120)
  return normalizedCompact.includes('早上好') || normalizedCompact.includes('早安')
    ? '早上好'
    : normalizedCompact.includes('中午好')
      ? '中午好'
      : normalizedCompact.includes('下午好')
        ? '下午好'
        : normalizedCompact.includes('晚上好') || normalizedCompact.includes('晚安')
          ? '晚上好'
          : countCjkChars(text) > 0
            ? '你好'
            : 'Hello'
}

function buildGreetingMove(decision: AlicizationActiveDialogueFastPathDecision): AlicizationMindSurfaceGreetingMove {
  const salutation = resolveGreetingSalutation(decision.latestUserText)
  return {
    kind: 'greeting',
    salutation,
    continuityAnchor: null,
    presenceCheck: /在吗|在嘛/u.test(decision.latestUserText),
  }
}

function buildFastPathContinuityCue(decision: AlicizationActiveDialogueFastPathDecision) {
  const digitalLifeSpine = coerceActiveDialogueDigitalLifeSpineDigest(decision.digitalLifeSpine)
  const runtimeSpineSurface = extractActiveDialogueRuntimeSpineSurface(decision.digitalLifeSpine)
  const runtimeProjection = coerceActiveDialogueSelfContinuityAuthority(
    runtimeSpineSurface?.memory?.personStateProjection?.selfContinuityAuthority ?? null,
  )
  const bundleProjectionAuthority = coerceActiveDialogueSelfContinuityAuthority(
    digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority ?? null,
  )
  const embodimentAuthoritySummary = runtimeProjection?.authoritySummary ?? bundleProjectionAuthority?.authoritySummary ?? null
  const embodimentCurrentBodyState = sanitizeText(runtimeSpineSurface?.perception?.currentBodyState ?? '', 220)
    || runtimeProjection?.currentBodyState
    || bundleProjectionAuthority?.currentBodyState
    || null
  const embodimentClosureReminder = describeAlicizationEmbodimentClosureReminder({
    authoritySummary: embodimentAuthoritySummary,
    currentBodyState: embodimentCurrentBodyState,
  }) || null
  const shouldPromotePlainLaneEmbodimentCarryToLoopSummary = (() => {
    const normalized = typeof embodimentCurrentBodyState === 'string'
      ? embodimentCurrentBodyState.trim().toLowerCase()
      : ''
    if (!normalized)
      return false

    return normalized.includes('lane=')
      && normalized.includes('visible continuity still present but no longer fully cross-modal')
      && !normalized.includes('living audio thread')
      && !normalized.includes('resident body')
      && !normalized.includes('same segment')
  })()
  const embodimentClosureSummary = shouldPromotePlainLaneEmbodimentCarryToLoopSummary
    ? (buildAlicizationEmbodimentLoopSummary({
        authoritySummary: embodimentAuthoritySummary,
        currentBodyState: embodimentCurrentBodyState,
      }) || embodimentClosureReminder)
    : embodimentClosureReminder

  function appendEmbodimentClosureReminder(line: string | null | undefined) {
    const normalizedLine = sanitizeText(line, 220) || ''
    if (!embodimentClosureSummary)
      return normalizedLine || null
    return normalizedLine
      ? `${normalizedLine} ${embodimentClosureSummary}`
      : embodimentClosureSummary
  }

  function extractHeldAutonomyRelationshipLine() {
    if (!decision.reasonCodes.includes('held-autonomy-carry'))
      return null

    const evidenceText = [
      decision.preparedExecutionCarryText,
      decision.continuityAnchor,
      decision.previousAssistantText,
      decision.sessionMirror?.continuityArcSummary,
      decision.sessionMirror?.agencySummary,
      decision.sessionMirror?.executionSummary,
    ]
      .filter(Boolean)
      .map(item => sanitizeText(item, 400))
      .join(' | ')

    const explicitLineMatch = evidenceText.match(/(?:^|\s)line=([^|]+)/i)
    const explicitLine = sanitizeText(explicitLineMatch?.[1] ?? '', 220)
    if (explicitLine)
      return explicitLine

    if (/held-autonomy|follow-through|held back|same thread|same line|leave room|lower-pressure|measured-return/u.test(evidenceText))
      return 'Keep the callback on the same line and leave room before leaning closer again.'

    return null
  }

  const projectedAuthority = mergePreferredSelfContinuityAuthority({
    bundleAuthority: bundleProjectionAuthority,
    runtimeAuthority: runtimeProjection,
  })
  const heldAutonomyRelationshipLine = extractHeldAutonomyRelationshipLine()
  const shouldReplaceWithHeldAutonomyLine = (raw: string | null | undefined) =>
    Boolean(
      heldAutonomyRelationshipLine
      && (
        !raw
        || /relationship line is neutral|I can be warm|stay usefully oriented toward the host'?s knot|旧 doctrine 不该继续把这句压回 neutral shell/u.test(raw)
      ),
    )
  if (projectedAuthority) {
    return {
      selfLine: projectedAuthority.selfLine ?? null,
      relationLine: shouldReplaceWithHeldAutonomyLine(projectedAuthority.relationshipLine)
        ? heldAutonomyRelationshipLine
        : projectedAuthority.relationshipLine ?? null,
      focusLine: appendEmbodimentClosureReminder(projectedAuthority.inwardLine ?? projectedAuthority.motiveLine ?? null),
    }
  }

  const authority = buildSelfContinuityAuthority({
    autobiographicalSelf: digitalLifeSpine?.embodiment?.autobiographicalSelf
      ? {
          personaDrift: {
            attachmentStyle: 'nearby',
            expressionStyle: digitalLifeSpine.embodiment.autobiographicalSelf.expressionStyle ?? 'measured',
            conflictStyle: digitalLifeSpine.embodiment.autobiographicalSelf.conflictStyle ?? 'soften-first',
            agencyStyle: digitalLifeSpine.embodiment.autobiographicalSelf.agencyStyle ?? 'balanced',
            attachmentNeed: digitalLifeSpine.embodiment.autobiographicalSelf.attachmentNeed ?? 0.46,
            autonomyNeed: digitalLifeSpine.embodiment.autobiographicalSelf.autonomyNeed ?? 0.52,
            truthAnchor: digitalLifeSpine.embodiment.autobiographicalSelf.truthAnchor ?? 0.56,
            careBias: digitalLifeSpine.embodiment.autobiographicalSelf.careBias ?? 0.48,
            playBias: digitalLifeSpine.embodiment.autobiographicalSelf.playBias ?? 0.24,
            irritabilityThreshold: digitalLifeSpine.embodiment.autobiographicalSelf.irritabilityThreshold ?? 0.54,
            stubbornness: digitalLifeSpine.embodiment.autobiographicalSelf.stubbornness ?? 0.42,
          },
          preferenceEvolution: {
            companionship: digitalLifeSpine.embodiment.autobiographicalSelf.companionship ?? 0.48,
            truthfulGrounding: digitalLifeSpine.embodiment.autobiographicalSelf.truthfulGrounding ?? 0.56,
            gentleRepair: digitalLifeSpine.embodiment.autobiographicalSelf.gentleRepair ?? 0.5,
            quietObservation: digitalLifeSpine.embodiment.autobiographicalSelf.quietObservation ?? 0.46,
            proactiveCare: digitalLifeSpine.embodiment.autobiographicalSelf.proactiveCare ?? 0.46,
            playfulIntimacy: digitalLifeSpine.embodiment.autobiographicalSelf.playfulIntimacy ?? 0.22,
            autonomyRespect: digitalLifeSpine.embodiment.autobiographicalSelf.autonomyRespect ?? 0.52,
            unfinishedThreadReturn: digitalLifeSpine.embodiment.autobiographicalSelf.unfinishedThreadReturn ?? 0.44,
          },
          activeGoals: [],
          behaviorSignatures: [],
          identityNarrative: digitalLifeSpine.embodiment.autobiographicalSelf.identityNarrative ?? '',
          relationshipDoctrine: digitalLifeSpine.embodiment.autobiographicalSelf.relationshipDoctrine ?? '',
          latestInflection: digitalLifeSpine.outcomeLearning?.latestInflection ?? null,
          stability: digitalLifeSpine.embodiment.autobiographicalSelf.stability ?? 0.48,
          updatedAt: 0,
        } as any
      : null,
    motiveEngine: digitalLifeSpine?.motive
      ? {
          rulingDrive: digitalLifeSpine.motive.rulingDrive ?? null,
          returnPressure: digitalLifeSpine.motive.returnPressure ?? 0,
          drives: {
            companionship: digitalLifeSpine.motive.companionshipDrive ?? 0,
            boundaryRespect: digitalLifeSpine.motive.boundaryRespectDrive ?? 0,
            truthDiscipline: digitalLifeSpine.motive.truthDisciplineDrive ?? 0,
            restProtection: digitalLifeSpine.motive.restProtectionDrive ?? 0,
            unfinishedThreadReturn: 0,
            selfDirection: digitalLifeSpine.motive.selfDirectionDrive ?? 0,
          },
          backgroundAgendas: digitalLifeSpine.motive.leadingAgendaSummary
            ? [{
                id: 'fast-path-authority-agenda',
                kind: digitalLifeSpine.motive.leadingAgendaKind ?? 'preserve-trust',
                status: 'foreground',
                weight: 0.72,
                summary: digitalLifeSpine.motive.leadingAgendaSummary,
                sourceTags: [],
                targetGoalKind: null,
                createdAt: 0,
                updatedAt: 0,
              }]
            : [],
          longTermGoals: [],
          narrative: digitalLifeSpine.motive.narrative ? [digitalLifeSpine.motive.narrative] : [],
          updatedAt: 0,
        } as any
      : null,
    habitPolicy: digitalLifeSpine?.habit
      ? {
          dominantMode: digitalLifeSpine.habit.dominantMode ?? 'watchful-boundary',
          requiresGroundingBeforeSurface: digitalLifeSpine.habit.requiresGroundingBeforeSurface ?? false,
          prefersQuietCompanionship: digitalLifeSpine.habit.prefersQuietCompanionship ?? false,
          blocksDirectSpeakWhenBusy: digitalLifeSpine.habit.blocksDirectSpeakWhenBusy ?? false,
          protectsRestWindow: digitalLifeSpine.habit.protectsRestWindow ?? false,
          returnViaRecheck: digitalLifeSpine.habit.returnViaRecheck ?? false,
          suggestedStyleCap: digitalLifeSpine.habit.suggestedStyleCap ?? 'light-nudge',
          suggestedPresenceCap: digitalLifeSpine.habit.suggestedPresenceCap ?? 'attentive',
          narrative: digitalLifeSpine.habit.narrative ? [digitalLifeSpine.habit.narrative] : [],
          updatedAt: 0,
        } as any
      : null,
    mindEcology: digitalLifeSpine?.embodiment?.mindEcology
      ? {
          moodLabel: digitalLifeSpine.embodiment.mindEcology.moodLabel ?? 'steady',
          replyHabit: 'answer-first',
          relationshipHabit: 'stay-near',
          explorationHabit: 'follow-thread',
          regulationHabit: 'lean-forward-gently',
          temperament: {
            attachment: digitalLifeSpine.embodiment.mindEcology.temperament?.attachment ?? 0.5,
            curiosity: digitalLifeSpine.embodiment.mindEcology.temperament?.curiosity ?? 0.5,
            steadiness: digitalLifeSpine.embodiment.mindEcology.temperament?.steadiness ?? 0.5,
            directness: digitalLifeSpine.embodiment.mindEcology.temperament?.directness ?? 0.5,
            playfulness: digitalLifeSpine.embodiment.mindEcology.temperament?.playfulness ?? 0.3,
            irritability: digitalLifeSpine.embodiment.mindEcology.temperament?.irritability ?? 0.2,
            tenderness: digitalLifeSpine.embodiment.mindEcology.temperament?.tenderness ?? 0.5,
          },
          climate: {
            valence: digitalLifeSpine.embodiment.mindEcology.climate?.valence ?? 0.5,
            arousal: digitalLifeSpine.embodiment.mindEcology.climate?.arousal ?? 0.5,
            socialNeed: digitalLifeSpine.embodiment.mindEcology.climate?.socialNeed ?? 0.5,
            solitudeNeed: digitalLifeSpine.embodiment.mindEcology.climate?.solitudeNeed ?? 0.3,
            irritation: digitalLifeSpine.embodiment.mindEcology.climate?.irritation ?? 0.2,
            restlessness: digitalLifeSpine.embodiment.mindEcology.climate?.restlessness ?? 0.2,
            reflectivePull: digitalLifeSpine.embodiment.mindEcology.climate?.reflectivePull ?? 0.4,
          },
          selfNarrative: digitalLifeSpine.embodiment.mindEcology.selfNarrative ?? '',
          relationNarrative: digitalLifeSpine.embodiment.mindEcology.relationNarrative ?? '',
          currentPreoccupation: digitalLifeSpine.embodiment.mindEcology.currentPreoccupation ?? '',
          learnedAdjustments: [],
          recurringPatterns: [],
          updatedAt: 0,
        } as any
      : null,
  } as any)

  return {
    selfLine: authority?.selfLine ?? null,
    relationLine: shouldReplaceWithHeldAutonomyLine(authority?.relationshipLine)
      ? heldAutonomyRelationshipLine
      : authority?.relationshipLine ?? null,
    focusLine: appendEmbodimentClosureReminder(authority?.inwardLine ?? authority?.motiveLine ?? null),
  }
}

function buildIdentityMove(decision: AlicizationActiveDialogueFastPathDecision): AlicizationMindSurfaceIdentityMove {
  const identityReconfirmation = decision.reasonCodes.includes('identity-reconfirmation')
  const continuityCue = buildFastPathContinuityCue(decision)
  return {
    kind: 'identity',
    name: resolvePersonaDisplayName(decision.personaKernel),
    askedLabel: decision.latestUserText,
    repeated: identityReconfirmation,
    continuityAnchor: sanitizeText(
      (identityReconfirmation
        ? decision.previousUserText || decision.continuityAnchor
        : continuityCue.selfLine || continuityCue.relationLine),
      120,
    ) || null,
  }
}

function buildCapabilityMove(): AlicizationMindSurfaceCapabilityMove {
  return {
    kind: 'capability',
    capabilities: fastPathCapabilityList,
    continuityAnchor: null,
  }
}

function buildPresenceCritiqueMove(): AlicizationMindSurfacePresenceRepairMove {
  return {
    kind: 'presence-repair',
  }
}

function buildLocalClockSnapshot(text: string, preferredTimeZone?: string): AlicizationMindSurfaceClockSnapshot {
  const now = new Date()
  const resolvedFromContext = resolveUserRegionTimeZone()
  const preferred = sanitizeText(preferredTimeZone, 96)
  const timeZone = [preferred, resolvedFromContext]
    .find(candidate => isValidIanaTimeZone(candidate)) || 'UTC'
  const prefersChinese = countCjkChars(text) > 0
  if (prefersChinese) {
    return {
      language: 'zh' as const,
      timeZone,
      timeText: new Intl.DateTimeFormat('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone,
      }).format(now),
      dateText: new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone,
      }).format(now),
      weekdayText: new Intl.DateTimeFormat('zh-CN', {
        weekday: 'long',
        timeZone,
      }).format(now) || zhWeekdayLabels[now.getDay()]!,
    }
  }

  return {
    language: 'en' as const,
    timeZone,
    timeText: new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }).format(now),
    dateText: new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone,
    }).format(now),
    weekdayText: new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone,
    }).format(now),
  }
}

function buildUtilityTimeMove(decision: AlicizationActiveDialogueFastPathDecision): AlicizationMindSurfaceTimeMove {
  const timeQueryMode = resolveTimeQueryModeForTurn({
    latestUserText: decision.latestUserText,
    previousAssistantText: decision.previousAssistantText,
  })
  return {
    kind: 'local-time',
    clock: buildLocalClockSnapshot(decision.latestUserText, decision.resolvedTimeZone),
    includeDate: timeQueryMode === 'time-confirmation',
    queryMode: timeQueryMode === 'none' ? 'time' : timeQueryMode,
    resolvedTimeZoneSource: decision.resolvedTimeZoneSource,
  }
}

function buildUtilityDateMove(decision: AlicizationActiveDialogueFastPathDecision): AlicizationMindSurfaceDateMove {
  return {
    kind: 'local-date',
    clock: buildLocalClockSnapshot(decision.latestUserText, decision.resolvedTimeZone),
  }
}

function buildFollowUpMove(decision: AlicizationActiveDialogueFastPathDecision): AlicizationMindSurfaceFollowUpMove {
  const previousFreshEncounter = deriveFreshEncounterKind(decision.previousUserText)
  const remainingLike = /另外|还有|剩下|其余|后面|哪几项|哪四项|rest|remaining|what else|other/iu.test(decision.latestUserText)
  if (continuityCheckPattern.test(decision.latestUserText) && previousFreshEncounter === 'identity') {
    return {
      kind: 'follow-up',
      variant: 'identity-confirm',
      anchor: decision.continuityAnchor || decision.previousUserText,
    }
  }
  if (remainingLike) {
    return {
      kind: 'follow-up',
      variant: 'remaining',
      anchor: decision.continuityAnchor || decision.previousUserText,
    }
  }
  if (decision.reasonCodes.includes('scene-triggered-recollection-carry')) {
    return {
      kind: 'follow-up',
      variant: 'continue',
      anchor: decision.continuityAnchor || decision.previousUserText || 'remembered relationship seam',
    }
  }
  return {
    kind: 'follow-up',
    variant: 'continue',
    anchor: decision.continuityAnchor || decision.previousUserText,
  }
}

function buildRepairClarifyMove(decision: AlicizationActiveDialogueFastPathDecision): AlicizationMindSurfaceRepairMove {
  const previousFreshEncounter = deriveFreshEncounterKind(decision.previousUserText)
  if (previousFreshEncounter === 'utility-time') {
    const previousTimeQueryMode = resolveTimeQueryModeForTurn({
      latestUserText: decision.previousUserText,
      previousAssistantText: decision.previousAssistantText,
    })
    return {
      kind: 'repair',
      target: 'time',
      clock: buildLocalClockSnapshot(
        decision.previousUserText || decision.latestUserText,
        decision.resolvedTimeZone,
      ),
      queryMode: previousTimeQueryMode === 'none' ? 'time' : previousTimeQueryMode,
      resolvedTimeZoneSource: decision.resolvedTimeZoneSource,
    }
  }

  if (previousFreshEncounter === 'utility-date') {
    return {
      kind: 'repair',
      target: 'date',
      clock: buildLocalClockSnapshot(
        decision.previousUserText || decision.latestUserText,
        decision.resolvedTimeZone,
      ),
    }
  }

  if (previousFreshEncounter === 'capability') {
    return {
      kind: 'repair',
      target: 'capability',
      capabilities: fastPathCapabilityList,
    }
  }

  return {
    kind: 'repair',
    target: 'dialogue',
    anchor: decision.previousUserText || decision.continuityAnchor,
  }
}

function buildDialogueMove(decision: AlicizationActiveDialogueFastPathDecision): AlicizationMindSurfaceMove {
  if (isPresenceCritiqueTurn(decision.latestUserText))
    return buildPresenceCritiqueMove()

  return buildAlicizationMindSurfaceDialogueMove({
    userText: decision.latestUserText,
    focus: decision.latestUserText,
    continuityAnchor: null,
  })
}

function buildPresentStateMove(decision: AlicizationActiveDialogueFastPathDecision): AlicizationMindSurfacePresentStateMove {
  const continuityCue = buildFastPathContinuityCue(decision)
  const threadSummary = sanitizeText(
    decision.continuityAnchor
    || humanizeMirrorSummary(decision.sessionMirror?.executionSummary)
    || humanizeMirrorSummary(decision.sessionMirror?.dialogueSummary)
    || humanizeMirrorSummary(decision.runtimeDigest?.activeLoop?.summary),
    120,
  )

  return {
    kind: 'present-state',
    threadSummary: threadSummary || continuityCue.focusLine || continuityCue.selfLine || null,
  }
}

function buildDecisionLocalMoves(decision: AlicizationActiveDialogueFastPathDecision): AlicizationMindSurfaceMove[] {
  switch (decision.lane) {
    case 'greeting':
      return [buildGreetingMove(decision)]
    case 'identity':
      return [buildIdentityMove(decision)]
    case 'capability':
      return [buildCapabilityMove()]
    case 'utility-time':
      return [buildUtilityTimeMove(decision)]
    case 'utility-date':
      return [buildUtilityDateMove(decision)]
    case 'presence-critique':
      return [buildPresenceCritiqueMove()]
    case 'present-state':
      return [buildPresentStateMove(decision)]
    case 'repair-clarify':
      return [buildRepairClarifyMove(decision)]
    case 'follow-up':
      return [buildFollowUpMove(decision)]
    case 'dialogue':
      return [buildDialogueMove(decision)]
  }
}

function buildExecutionRecoveryReply() {
  const resolvedTimeZone = resolveAlicizationTimeZoneFromMessages()
  throw new AlicizationActiveDialogueMindAuthorityEscalationError(
    `active-dialogue-execution-recovery-requires-provider-mind:${resolvedTimeZone.timezone}`,
  )
}

export function buildAlicizationActiveDialogueGovernedReply(input: {
  decision: AlicizationActiveDialogueFastPathDecision
  reply?: string
  moves?: AlicizationMindSurfaceMove[]
  thought?: string
  emotion?: string
  delivery?: string
  performance?: Partial<AlicizationDialoguePerformancePayload> | null
  suppressGovernedLead?: boolean
  visibleReplyAuthority?: AlicizationMindTurnGovernance['visibleReplyAuthority']
}) {
  const governance = buildFastPathGovernance(
    input.decision,
    input.visibleReplyAuthority ?? (input.decision.strategy === 'infra-fallback-only' ? 'llm-second-pass-rewrite' : 'llm-mind'),
  )
  const sceneTriggeredMeasuredReturnPerformance = input.decision.reasonCodes.includes('scene-triggered-recollection-carry')
    ? {
        baseEmotion: 'thinking' as const,
        delivery: 'hesitant' as const,
        emphasis: 0 as const,
      }
    : null
  const governedThought = buildFastPathGovernedThought(input.decision, governance)
  const shouldPreferGovernedThought
    = input.decision.governance?.answerSubject === 'project-state'
      || input.decision.reasonCodes.includes('project-state-progress-open-loop-follow-up')
      || input.decision.reasonCodes.includes('project-state-same-her-continuity-required')
  const hasExplicitModelReply = Boolean(sanitizeText(input.reply, 320))
  const hasAllowedDeterministicMoves = allowsDeterministicVisibleReplyMoves(input.moves)
  if (
    !hasExplicitModelReply
    && !hasAllowedDeterministicMoves
    && !allowsDeterministicVisibleReplyForDecision(input.decision)
  ) {
    throw new AlicizationActiveDialogueMindAuthorityEscalationError(
      `active-dialogue-governed-reply-requires-model-text:${input.decision.lane}`,
    )
  }
  const moves = input.moves?.length
    ? input.moves
    : input.reply
      ? [{
        kind: 'direct-reply',
        text: sanitizeText(input.reply, 320),
      } satisfies AlicizationMindSurfaceMove]
      : buildDecisionLocalMoves(input.decision)

  return buildAlicizationMindSurfaceStructuredReply({
    governance,
    userText: input.decision.latestUserText,
    previousAssistantText: input.decision.previousAssistantText,
    resolvedTimeZone: input.decision.resolvedTimeZone,
    resolvedTimeZoneSource: input.decision.resolvedTimeZoneSource,
    moves,
    thought: shouldPreferGovernedThought
      ? governedThought
      : !runtimeMetaLeakPattern.test(sanitizeText(input.thought, 220))
          ? sanitizeText(input.thought, 220) || governedThought
          : governedThought,
    emotion: input.emotion ?? sceneTriggeredMeasuredReturnPerformance?.baseEmotion,
    delivery: input.delivery ?? sceneTriggeredMeasuredReturnPerformance?.delivery,
    performance: sceneTriggeredMeasuredReturnPerformance
      ? {
          ...sceneTriggeredMeasuredReturnPerformance,
          ...input.performance,
        }
      : input.performance,
    performanceManifest: input.decision.performanceManifest ?? null,
    digitalLifeSpine: input.decision.digitalLifeSpine ?? null,
    suppressGovernedLead: input.suppressGovernedLead,
  })
}

function buildDecisionLocalReply(decision: AlicizationActiveDialogueFastPathDecision) {
  if (!allowsDeterministicVisibleReplyForDecision(decision)) {
    throw new AlicizationActiveDialogueMindAuthorityEscalationError(
      `active-dialogue-local-visible-reply-forbidden:${decision.lane}`,
    )
  }

  return buildAlicizationActiveDialogueGovernedReply({
    decision,
    moves: buildDecisionLocalMoves(decision),
    suppressGovernedLead: true,
    visibleReplyAuthority: 'llm-second-pass-rewrite',
  })
}

function allowsDeterministicVisibleReplyForDecision(
  decision: Pick<AlicizationActiveDialogueFastPathDecision, 'lane' | 'strategy'>,
) {
  return allowsAlicizationDeterministicVisibleReply(decision)
}

function allowsDeterministicVisibleReplyMove(move: AlicizationMindSurfaceMove) {
  return move.kind === 'local-time'
    || move.kind === 'local-date'
    || move.kind === 'execution-listing'
    || move.kind === 'execution-detail'
}

function allowsDeterministicVisibleReplyMoves(moves: readonly AlicizationMindSurfaceMove[] | undefined) {
  return Array.isArray(moves)
    && moves.length > 0
    && moves.every(allowsDeterministicVisibleReplyMove)
}

function appendFastPathReasonCode(reasonCodes: string[], code: string) {
  return reasonCodes.includes(code) ? reasonCodes : [...reasonCodes, code]
}

function coerceInfraFallbackDecision(
  decision: AlicizationActiveDialogueFastPathDecision,
): AlicizationActiveDialogueFastPathDecision {
  if (allowsDeterministicVisibleReplyForDecision(decision))
    return decision

  return {
    ...decision,
    strategy: 'infra-fallback-only',
    timeoutMs: 0,
    reasonCodes: appendFastPathReasonCode(
      decision.reasonCodes,
      'mind-authority-infra-fallback',
    ),
  }
}

export function shouldAlicizationActiveDialogueStayLLMAuthored(
  decision: Pick<AlicizationActiveDialogueFastPathDecision, 'lane' | 'strategy' | 'reasonCodes'>,
) {
  return shouldAlicizationReplyStayProviderAuthored(decision)
}

function violatesAuthoritativeClockEvidence(
  reply: string,
  decision: AlicizationActiveDialogueFastPathDecision,
) {
  if (decision.lane !== 'utility-time' && decision.lane !== 'utility-date')
    return false

  const normalizedReply = sanitizeText(reply, 640)
  if (!normalizedReply)
    return false

  const clock = buildLocalClockSnapshot(decision.latestUserText, decision.resolvedTimeZone)
  const containsClockLikeToken = /\b\d{1,2}:\d{2}\b/u.test(normalizedReply)
  if (containsClockLikeToken && !normalizedReply.includes(clock.timeText))
    return true

  const mentionsCalendar = /\d{4}.+?[日号]|today is|星期[一二三四五六日天]|monday|tuesday|wednesday|thursday|friday|saturday|sunday/iu.test(normalizedReply)
  if (mentionsCalendar && normalizedReply.includes('现在是') && !normalizedReply.includes(clock.weekdayText))
    return true

  return false
}

function normalizeCompactReplyPayload(
  raw: string,
  decision: AlicizationActiveDialogueFastPathDecision,
  options?: {
    localFallbackMode?: 'allow' | 'escalate'
  },
) {
  const mergeStructuredCarry = (normalizedFullText: string, parsedRaw: Record<string, unknown>) => {
    const normalizedParsed = parseJsonObjectFromText(normalizedFullText)
    if (!normalizedParsed)
      return normalizedFullText

    const rawVisibleReplyRealization
      = parsedRaw.visibleReplyRealization && typeof parsedRaw.visibleReplyRealization === 'object'
        ? parsedRaw.visibleReplyRealization as Record<string, unknown>
        : null
    const rawProjectStateAudit
      = rawVisibleReplyRealization?.projectStateAudit && typeof rawVisibleReplyRealization.projectStateAudit === 'object'
        ? rawVisibleReplyRealization.projectStateAudit as Record<string, unknown>
        : parsedRaw.projectStateAudit && typeof parsedRaw.projectStateAudit === 'object'
          ? parsedRaw.projectStateAudit as Record<string, unknown>
          : null
    const rawSelfAuthorityAudit
      = rawVisibleReplyRealization?.selfAuthorityAudit && typeof rawVisibleReplyRealization.selfAuthorityAudit === 'object'
        ? rawVisibleReplyRealization.selfAuthorityAudit as Record<string, unknown>
        : null
    const rawProjectState = parsedRaw.projectState && typeof parsedRaw.projectState === 'object'
      ? parsedRaw.projectState as Record<string, unknown>
      : null
    const rawPreDialogueAwareness = parsedRaw.preDialogueAwareness && typeof parsedRaw.preDialogueAwareness === 'object'
      ? parsedRaw.preDialogueAwareness as Record<string, unknown>
      : null
    const rawPreDialogueClosure = parsedRaw.preDialogueClosure && typeof parsedRaw.preDialogueClosure === 'object'
      ? parsedRaw.preDialogueClosure as Record<string, unknown>
      : null

    if (!rawProjectStateAudit && !rawSelfAuthorityAudit && !rawProjectState && !rawPreDialogueAwareness && !rawPreDialogueClosure)
      return normalizedFullText

    return JSON.stringify({
      ...normalizedParsed,
      ...(rawProjectState ? { projectState: rawProjectState } : {}),
      ...(rawPreDialogueAwareness ? { preDialogueAwareness: rawPreDialogueAwareness } : {}),
      ...(rawPreDialogueClosure ? { preDialogueClosure: rawPreDialogueClosure } : {}),
      ...((rawProjectStateAudit || rawSelfAuthorityAudit)
        ? {
            visibleReplyRealization: {
              ...(normalizedParsed.visibleReplyRealization && typeof normalizedParsed.visibleReplyRealization === 'object'
                ? normalizedParsed.visibleReplyRealization as Record<string, unknown>
                : {}),
              ...(rawProjectStateAudit ? { projectStateAudit: rawProjectStateAudit } : {}),
              ...(rawSelfAuthorityAudit ? { selfAuthorityAudit: rawSelfAuthorityAudit } : {}),
            },
          }
        : {}),
    })
  }

  const localFallbackMode = options?.localFallbackMode
    ?? (allowsDeterministicVisibleReplyForDecision(decision) ? 'allow' : 'escalate')
  // NOTICE: Explicit `infra-fallback-only` decisions are infra-only fallback lanes.
  // Any other strategy must escalate instead of silently synthesizing a local
  // visible reply, otherwise deterministic fallback would leak back into the
  // normal reply authority surface.
  const shouldEscalateLocalAuthoring = localFallbackMode === 'escalate'
    && !allowsDeterministicVisibleReplyForDecision(decision)
  const normalizedRaw = sanitizeText(raw, 2_000)
  if (!normalizedRaw) {
    if (shouldEscalateLocalAuthoring) {
      throw new AlicizationActiveDialogueMindAuthorityEscalationError(
        `active-dialogue-empty-compact-reply:${decision.lane}`,
      )
    }
    return buildDecisionLocalReply(decision)
  }

  const parsed = parseJsonObjectFromText(raw) ?? parseJsonObjectFromText(normalizedRaw)
  if (parsed) {
    const reply = sanitizeHeldAutonomyCompactReply(
      sanitizeText(parsed.reply, 320),
      decision,
    )
    if (
      !reply
      || runtimeMetaLeakPattern.test(reply)
      || legacyTemplateShellPattern.test(reply)
      || violatesAuthoritativeClockEvidence(reply, decision)
    ) {
      if (shouldEscalateLocalAuthoring) {
        throw new AlicizationActiveDialogueMindAuthorityEscalationError(
          `active-dialogue-invalid-compact-reply:${decision.lane}`,
        )
      }
      return buildDecisionLocalReply(decision)
    }

    return mergeStructuredCarry(buildAlicizationActiveDialogueGovernedReply({
      decision,
      reply,
      thought: sanitizeText(parsed.thought, 220),
      emotion: sanitizeText(parsed.emotion, 24),
      delivery: sanitizeText((parsed.performance as { delivery?: unknown } | undefined)?.delivery, 24),
      performance: (parsed.performance as Partial<AlicizationDialoguePerformancePayload> | undefined) ?? null,
    }), parsed)
  }

  const normalizedTextReply = sanitizeHeldAutonomyCompactReply(normalizedRaw, decision)
  if (
    runtimeMetaLeakPattern.test(normalizedTextReply)
    || legacyTemplateShellPattern.test(normalizedTextReply)
    || violatesAuthoritativeClockEvidence(normalizedTextReply, decision)
  ) {
    if (shouldEscalateLocalAuthoring) {
      throw new AlicizationActiveDialogueMindAuthorityEscalationError(
        `active-dialogue-invalid-compact-text:${decision.lane}`,
      )
    }
    return buildDecisionLocalReply(decision)
  }
  return buildAlicizationActiveDialogueGovernedReply({
    decision,
    reply: normalizedTextReply,
  })
}

function sanitizeHeldAutonomyCompactReply(
  reply: string,
  decision: AlicizationActiveDialogueFastPathDecision,
) {
  if (!reply || decision.lane !== 'follow-up')
    return reply
  if (!decision.reasonCodes.includes('held-autonomy-carry'))
    return reply

  const normalized = sanitizeText(reply, 320)
  if (!normalized)
    return ''

  const localeIsZh = countCjkChars(decision.latestUserText) > 0 || countCjkChars(normalized) > 0
  const prefixPattern = localeIsZh
    ? /^(我(?:刚才|先前|之前)?(?:先|当时)?(?:没|没有|不想|不急着)?(?:打断|展开|说下去)|我先不打断你)([，。,\s]*)/u
    : /^(I (?:held back|didn't want to interrupt|didn't want to push it yet))([,.\s]*)/iu
  const stripped = normalized.replace(prefixPattern, '').trim()
  if (!stripped)
    return normalized

  const softenedPrefix = localeIsZh ? '嗯，那我接着说下去。' : 'Okay, I will pick that thread back up.'
  return `${softenedPrefix} ${stripped}`.trim()
}

export function deriveAlicizationActiveDialogueFastPathDecision(
  input: AlicizationActiveDialogueFastPathInput,
): AlicizationActiveDialogueFastPathDecision | null {
  const conversationMessages = normalizeConversationMessages(input.conversationMessages)
  const latestUserText = readLatestUserText(conversationMessages)
  if (!latestUserText)
    return null

  const actionKind = input.prepared.runtimeSurface.action?.kind ?? null
  const runtimeBlocked = (
    input.prepared.waitForTools
    || actionKind === 'execute'
    || actionKind === 'continue-task'
    || actionKind === 'inspect'
    || input.prepared.hasVisualGrounding
  )
  const localDeterministicEncounter = deriveFreshEncounterKind(latestUserText)
  const realtimeIntent = detectAlicizationRealtimeQueryIntent(latestUserText)
  if (realtimeIntent.needsRealtime && !localDeterministicEncounter)
    return null
  if (runtimeBlocked && !localDeterministicEncounter) {
    return null
  }

  const previousUserText = readPreviousUserText(conversationMessages)
  const previousAssistantText = readPreviousAssistantText(conversationMessages)
  const preparedExecutionCarryText = readPreparedExecutionLedgerCarryText(input.prepared.messages)
  const runtimeDigest = input.runtimeDigest ?? null
  const sessionMirror = input.prepared.sessionMirror ?? null
  const continuityAnchor = resolveContinuityAnchor({
    previousUserText,
    previousAssistantText,
    runtimeDigest,
    sessionMirror,
  })
  const governance = input.prepared.governance ?? input.prepared.runtimeSurface.governance ?? null
  const runtimeSurface = resolvePreferredPreparedRuntimeSurface(input.prepared.runtimeSurface)
  const shortTurn = isShortDialogueTurn(latestUserText)
  const hasContinuity = Boolean(previousUserText || previousAssistantText || sessionMirror)
  const encounter = deriveAlicizationActiveDialogueEncounter({
    latestUserText,
    previousUserText,
    previousAssistantText,
    continuityAnchor,
    preparedExecutionCarryText,
    runtimeDigest,
    sessionMirror,
    shortTurn,
    hasContinuity,
    runtimeSurface,
  })
  if (!encounter)
    return null
  const recollectionIntent = buildMemoryRecollectionIntent({
    userText: latestUserText,
    dialogueWorldThread: runtimeSurface?.dialogue?.dialogueWorldThread ?? null,
    conversationState: runtimeSurface?.dialogue?.conversationState ?? null,
    answerCompiler: runtimeSurface?.dialogue?.answerCompiler ?? null,
    replyDeliberation: runtimeSurface?.dialogue?.replyDeliberation ?? null,
    privateThought: runtimeSurface?.cognition?.privateThought ?? null,
    dialogueEncounter: runtimeSurface?.dialogue?.dialogueEncounter ?? null,
    longHorizonMemory: runtimeSurface?.memory?.longHorizonMemory ?? null,
    goalStack: runtimeSurface?.memory?.goalStack ?? null,
    motiveEngine: runtimeSurface?.memory?.motiveEngine ?? null,
    selfContinuityAuthority: runtimeSurface?.memory?.personStateProjection?.selfContinuityAuthority ?? null,
    sceneContext: (runtimeSurface?.dialogue as { sceneContext?: unknown } | null | undefined)?.sceneContext as any ?? null,
    affectiveResidue: runtimeSurface?.memory?.affectiveResidue ?? runtimeSurface?.memory?.derivedMindStateBundle?.affectiveResidue ?? null,
  })
  const memoryHeavyRecollection = recollectionIntent
    && recollectionIntent.mode !== 'none'
    && (recollectionIntent.searchConversations || recollectionIntent.searchProceduralExperience || recollectionIntent.mode === 'autobiographical-history' || recollectionIntent.mode === 'relationship-history')
  const sceneTriggeredContinuityFollowUp = Boolean(
    recollectionIntent
    && shortTurn
    && (encounter.kind === 'dialogue' || encounter.kind === 'follow-up')
    && (
      recollectionIntent.mode === 'relationship-history'
      || recollectionIntent.mode === 'autobiographical-history'
    )
    && (recollectionIntent.recollectionAgenda?.sceneFamiliarity ?? 0) >= 0.34
    && (recollectionIntent.confidence ?? 0) >= 0.34,
  )
  const adjustedEncounter = memoryHeavyRecollection && (
    encounter.strategy === 'infra-fallback-only'
    || encounter.kind === 'follow-up'
    || sceneTriggeredContinuityFollowUp
  )
    ? {
        ...encounter,
        kind: sceneTriggeredContinuityFollowUp ? 'follow-up' as const : encounter.kind,
        strategy: 'compact-one-shot' as const,
        timeoutMs: Math.max(6_500, encounter.timeoutMs),
        reasonCodes: [
          ...encounter.reasonCodes,
          sceneTriggeredContinuityFollowUp ? 'scene-triggered-recollection-carry' : '',
          'memory-recollection-llm-authored',
        ].filter(Boolean),
      }
    : encounter

  const resolvedTimeZone = resolveAlicizationTimeZoneFromMessages(input.prepared.messages)

  return {
    lane: adjustedEncounter.kind,
    strategy: adjustedEncounter.strategy,
    timeoutMs: adjustedEncounter.timeoutMs,
    resolvedTimeZone: resolvedTimeZone.timezone,
    resolvedTimeZoneSource: resolvedTimeZone.source,
    latestUserText,
    previousUserText,
    previousAssistantText,
    continuityAnchor,
    preparedExecutionCarryText,
    runtimeDigest,
    sessionMirror,
    governance,
    personaKernel: input.prepared.personaKernel ?? null,
    performanceManifest: input.prepared.performanceManifest ?? null,
    digitalLifeSpine: resolvePreferredPreparedDigitalLifeSpine(input.prepared.runtimeSurface),
    reasonCodes: runtimeBlocked
      ? [...adjustedEncounter.reasonCodes, 'runtime-blocked-local-override']
      : adjustedEncounter.reasonCodes,
  }
}

export function buildAlicizationActiveDialogueFastPathMessages(input: {
  conversationMessages: Message[]
  decision: AlicizationActiveDialogueFastPathDecision
  prepared: AlicizationPreparedMainChatExecutionResult
}) {
  const recentConversationMessages = normalizeConversationMessages(input.conversationMessages).slice(-6)
  const hostName = sanitizeText(input.prepared.personaKernel?.profile.hostName, 48)
    || extractHostNameFromMessages(input.prepared.messages)
  const customDirectives = sanitizeText(
    extractCustomDirectivesFromMessages(input.prepared.messages),
    320,
  )
  const carriedAgentSessionBlocks = input.prepared.messages
    .filter((message): message is Message & { content: string } =>
      message.role === 'system'
      && typeof message.content === 'string'
      && (
        message.content.includes('[ALICIZATION_AGENT_SESSION]')
        || message.content.includes('session_continuity_inbox:')
      ),
    )
    .map(message => sanitizeText(message.content, 4000))
    .filter(Boolean)
  const projectStateSystemBlock = buildAlicizationProjectStateSystemBlock()
  const projectStateClosureDashboard = buildAlicizationProjectStateClosureDashboard({
    runtimeDigest: input.decision.runtimeDigest ?? null,
  })

  const systemBlocks = [
    alicizationFixedCoreSystemInstruction,
    alicizationFixedStructuredContractAnchor,
    projectStateSystemBlock,
    projectStateClosureDashboard,
    buildFastPathProjectStateAnswerContractBlock(input.decision),
    buildCompactPersonaProfileBlock(input.prepared.personaKernel),
    hostName
      ? renderAlicizationPromptTemplate(alicizationFixedHostNameDirectiveTemplate, { hostName })
      : '',
    customDirectives
      ? `[ALICIZATION_CARD_DIRECTIVES_COMPACT]\n${customDirectives}`
      : '',
    ...carriedAgentSessionBlocks,
    buildCompactDialogueMindBlock(input.decision),
    buildCompactDialogueContextBlock(input.decision),
    buildCompactDialogueRecollectionBlock(input.decision),
    buildCompactDialogueEvidenceBlock(input.decision),
    buildCompactDialogueGovernanceBlock(input.decision),
  ]
    .filter(Boolean)
    .map(content => ({
      role: 'system',
      content,
    }) as Message)

  return [
    ...systemBlocks,
    ...recentConversationMessages,
  ]
}

export function buildAlicizationActiveDialogueFallbackReply(
  input: AlicizationActiveDialogueReplyInput,
) {
  const normalizedConversationMessages = normalizeConversationMessages(input.conversationMessages)
  if (input.actionKind === 'execute' || input.actionKind === 'continue-task') {
    return buildExecutionRecoveryReply()
  }
  const latestUserText = readLatestUserText(normalizedConversationMessages)
  const previousUserText = readPreviousUserText(normalizedConversationMessages)

  const preparedLike = {
    waitForTools: false,
    hasVisualGrounding: false,
    governance: input.governance ?? null,
    personaKernel: input.personaKernel ?? null,
    messages: normalizedConversationMessages,
    sessionMirror: input.sessionMirror ?? null,
    runtimeSurface: {
      action: input.actionKind ? { kind: input.actionKind } : null,
      governance: input.governance ?? null,
      digitalLifeSpine: input.digitalLifeSpine ?? null,
    },
  } as AlicizationPreparedMainChatExecutionResult
  const decision = deriveAlicizationActiveDialogueFastPathDecision({
    conversationMessages: normalizedConversationMessages,
    prepared: preparedLike,
    runtimeDigest: input.runtimeDigest ?? null,
  }) ?? {
    ...(() => {
      const resolvedTimeZone = resolveAlicizationTimeZoneFromMessages(normalizedConversationMessages)
      return {
        lane: 'dialogue',
        strategy: 'infra-fallback-only',
        timeoutMs: 0,
        resolvedTimeZone: resolvedTimeZone.timezone,
        resolvedTimeZoneSource: resolvedTimeZone.source,
      } as const
    })(),
    latestUserText,
    previousUserText,
    previousAssistantText: readPreviousAssistantText(normalizedConversationMessages),
    continuityAnchor: '',
    preparedExecutionCarryText: '',
    runtimeDigest: input.runtimeDigest ?? null,
    sessionMirror: input.sessionMirror ?? null,
    governance: input.governance ?? null,
    personaKernel: input.personaKernel ?? null,
    digitalLifeSpine: input.digitalLifeSpine ?? null,
    reasonCodes: ['local-recovery'],
  } satisfies AlicizationActiveDialogueFastPathDecision

  const fallbackDecision = coerceInfraFallbackDecision(decision)
  if (!allowsDeterministicVisibleReplyForDecision(fallbackDecision)) {
    throw new AlicizationActiveDialogueMindAuthorityEscalationError(
      `active-dialogue-fallback-visible-reply-forbidden:${fallbackDecision.lane}`,
    )
  }
  return buildDecisionLocalReply(fallbackDecision)
}

export function normalizeAlicizationActiveDialogueFastPathReply(input: {
  decision: AlicizationActiveDialogueFastPathDecision
  rawText: string
}) {
  return normalizeCompactReplyPayload(input.rawText, input.decision)
}

export function normalizeAlicizationActiveDialogueFastPathReplyOrEscalate(input: {
  decision: AlicizationActiveDialogueFastPathDecision
  rawText: string
}) {
  return normalizeCompactReplyPayload(input.rawText, input.decision, {
    localFallbackMode: 'escalate',
  })
}
