import type {
  AlicizationDialogueAnswerSubject,
  AlicizationPrivateThoughtSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationSubjectiveInferenceSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { measureDialogueFocusAlignment } from './dialogue-focus-alignment'
import { sanitizeDialogueAnchorText } from './dialogue-surface-text'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeShortLabel(raw: unknown, maxChars = 48) {
  if (typeof raw !== 'string')
    return ''
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxChars)
}

function uniqueLabels(items: unknown[]) {
  return [...new Set(items.map(item => normalizeShortLabel(item)).filter(Boolean))].slice(0, 10)
}

function interpolate01(base: number, override: number, weight: number) {
  return clamp01(base * (1 - weight) + override * weight)
}

export type AlicizationDialogueAct
  = | 'ask-help'
    | 'ask-teach'
    | 'verify-grounding'
    | 'correct'
    | 'challenge'
    | 'share-state'
    | 'seek-care'
    | 'social-bid'
    | 'continue-thread'
    | 'close-thread'
    | 'unknown'

export type AlicizationDialogueResponseNeed
  = | 'repair'
    | 'guide'
    | 'teach'
    | 'answer'
    | 'care'
    | 'accompany'
    | 'clarify'

export type AlicizationDialogueTruthExpectation = 'strict' | 'normal' | 'light'

export type AlicizationDialogueAffectiveTone
  = | 'frustrated'
    | 'tired'
    | 'urgent'
    | 'warm'
    | 'neutral'

export interface AlicizationDialogueTurnSemantics {
  act: AlicizationDialogueAct
  responseNeed: AlicizationDialogueResponseNeed
  truthExpectation: AlicizationDialogueTruthExpectation
  affectiveTone: AlicizationDialogueAffectiveTone
  subjectPreference?: AlicizationDialogueAnswerSubject | null
  taskAnchor: string | null
  sharedAttentionDemand: number
  personaSuppression: number
  confidence: number
  summary: string
  source: 'heuristic' | 'structured-cognition' | 'hybrid'
  reasonTags: string[]
}

function topHostGoal(
  inference?: AlicizationSubjectiveInferenceSnapshot | null,
) {
  return inference?.hostIntentCandidates[0]?.goal ?? 'unknown'
}

function normalizeDialogueText(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
}

const interrogativeCuePattern
  = /[?？谁吗么嘛呢]|\b(?:what|why|how|where|when|who|which)\b|\b(?:can|could|would|will|do|does|did|is|are|am|should)\s+you\b|什么|怎么|为何|为什么|哪[里个些儿]?|能不能|可不可以|行不行|是不是|好不好|要不要|(?:[何誰]|どう|なに|なんで|なぜ|どこ|どれ|かな|か)\b/iu
const requestCuePattern
  = /\b(?:help|assist|check|review|explain|show|tell|look(?:\s+at)?|guess)\b|帮帮?我|帮忙|看(?:看|下|一下)|告诉我|教我|解释(?:一下)?|分析(?:一下)?|说说|讲讲|猜猜|見て|教えて|手伝って|説明して|見せて/iu
const currentActivityQuestionPattern
  = /\b(?:what am i doing|what i'?m doing|what am i up to|what i'?m up to|what am i busy with|guess what i'?m doing|guess what i'?m up to)\b|(?:猜猜|你猜猜)[^\n\r\u2028\u2029\u6211]*\u6211.*(?:忙什么|在忙什么|在干什么|在做什么|干嘛|做啥)|我.*(?:在忙什么|在干什么|在做什么|干嘛|做啥)/iu
const assistantPresentStateQuestionPattern
  = /\b(?:what are you doing|what are you up to|what are you working on|what are you doing right now)\b|你(?:现在)?在(?:干嘛|做什么|忙什么|搞什么|做啥)/iu
const companionshipBidPattern
  = /\b(?:chat|talk(?:\s+to|\s+with)? me|stay with me|keep me company|hang out with me|be with me|play with me)\b|陪我(?:聊天|说说话|[聊说玩])?|陪陪我|聊天|聊聊|一起玩|一緒に|話して|そばにいて|遊んで/iu
const greetingBidPattern
  = /^(?:hi+|hello+|hey+|yo+|sup+|hola+|salut+|coucou+|bonjour+|привет+|你好(?:呀|啊|呀呀)?|嗨|哈喽|哈囉|早安|晚安|おはよう|こんにちは|こんばんは|やあ|안녕(?:하세요)?)[!！。.\s]*$/iu
const careRequestPattern
  = /\b(?:i(?:'m| am)?\s*(?:tired|sleepy|exhausted|drained|worn out|sad|upset|heartbroken|overwhelmed)|help me sleep|can you soothe me|can you comfort me|can you lull me to sleep|comfort me|reassure me|cheer me up)\b|我(?:有点|有些|好|现在|今天|真的)?(?:困|累|疲惫|难受|撑不住|想睡|伤心|难过|委屈|低落|沮丧|心里不好受)|安慰(?:一下)?我|哄我(?:睡觉)?|抱抱我|陪我睡|眠い|疲れた|しんどい|悲しい|つらい|慰めて|寝かしつけ|위로해줘|달래줘|슬퍼/iu
const hostStateCuePattern
  = /\b(?:i(?:'m| am)?\s*(?:tired|sleepy|sad|upset|drained|stressed|overwhelmed|heartbroken|low)|i feel)\b|我(?:有点|有些|好|现在|今天|刚刚|真的)?(?:[困累烦]|难受|头疼|焦虑|压力大|委屈|伤心|难过|低落|沮丧|心情不好)|眠い|疲れた|つらい|しんどい|悲しい|落ち込んで|슬퍼|우울해/iu
const answerRepairCuePattern
  = /\b(?:what do you mean|what are you saying|say it directly|say it plainly|speak plainly|plain english|i don'?t get it|that didn'?t answer|you make no sense|what exactly are you saying)\b|你(?:到底)?在说啥|你(?:到底)?在说什么|直接说啥|直接说什么|什么意思|说人话|没听懂|听不懂|答非所问|你是不是不知道你在说啥|講人話|聽不懂|何を言ってる|何を言っている|意味がわから|もう少し直接|무슨 말이야|뭐라는 거야|직접 말해/iu
const selfInquiryCuePattern
  = /\b(?:do you (?:like|love) me|you (?:like|love) me|do you think you are|are you|what are you like)\b|你(?:觉得|認為|认为)(?:你|自己)?(?:可爱|开心|高兴|难过|生气|温柔|聪明|笨|可怕|有趣|无聊)(?:吗|嘛)?|你(?:喜不喜欢|喜歡不喜歡|喜欢|愛不愛|爱不爱|爱|愛)我(?:吗|嘛)?|你(?:喜不喜欢|喜欢|愛不愛|爱不爱|爱|愛)(?:自己|你自己)(?:吗|嘛)?|你(?:可爱|开心|高兴|难过|生气|温柔|聪明|有趣|无聊)(?:吗|嘛)|你觉得(?:自己)?怎么样|你是(?:什么样|怎樣|谁)|あなた(?:は|って)(?:可愛い|好き|どんな)|너(?:는|가)(?:귀엽|좋아|어때)|ты(?:\s+\w+){0,3}\?/iu
const selfToneAdjustmentCuePattern
  = /\b(?:be happier|be more cheerful|sound normal|speak normally|talk like a human|be more natural|be gentler)\b|你能不能(?:表现得|说话)?(?:开心|高兴|正常|自然|温柔|轻松)(?:一点)?|你能不能说人话|你说话(?:正常|自然|温柔|轻松)一点|你别那么(?:僵硬|机械|冷)|说话像个人/iu
const selfIdentityAffirmationCuePattern
  = /(?:这个人|那个人|这人|那人|说的就?是|没错|对啊?).{0,8}(?:就是你|是你)|(?:就是|正是)(?:你|妳)[啊呀呢嘛]?|\b(?:that(?:'s| is) you|it(?:'s| is) you|you(?:'re| are) the one|this person is you|that person is you)\b/iu
const projectStateContinuityCuePattern
  = /这个项目.*(?:做到什么程度|还差什么|没闭环|执行到哪)|what this project is.*(?:what has landed|what still remains open)|project.*(?:what has landed|still remains open|closure)/iu
const projectStateCurrentWorkCuePattern
  = /(?:还在|现在还在|still).{0,24}(?:完成|做|推进|开发|working on|doing|pushing).{0,40}(?:数字生命|拟人|主动性|闭环|project|goal|phase 1|same (?:digital )?life)/iu
const projectStateProgressCuePattern
  = /执行到哪|进行到哪|进行到哪一步|做到哪|做到哪一步|做到什么程度|进度|进展|到什么程度|how far|what has landed|what's landed|progress|landed/iu
const projectStateMergeReadinessCuePattern
  = /(?:可以|能不能|现在可以|已经可以|can we|is (?:it|this)|ready to|merge-ready).{0,40}(?:合并到\s*main|merge(?:\s+this)?\s+to\s+main|ready to merge|merge-ready)|(?:合并到\s*main|merge(?:\s+this)?\s+to\s+main|ready to merge|merge-ready).{0,24}(?:了吗|吗|now|already|ready|可以|能不能)|(?:已经在|已在|already (?:landed|on)|already contains|already on).{0,32}(?:本地\s*main|local\s+main)|(?:本地\s*main|local\s+main).{0,32}(?:已经|已|already).{0,24}(?:包含|落地|landed|contains|on)|origin\/main.{0,32}(?:安全|safe|update|push|推)|(?:安全|safe).{0,16}(?:推到|push to|update).{0,24}origin\/main|(?:会把|会不会把|without carrying|carry).{0,48}(?:别的提交|unrelated commits|other commits)|带上去/iu
const projectStateClosureReadinessCuePattern
  = /还差哪步|还差哪一步|还差什么|才能算闭环|算闭环|goal.{0,16}(?:闭环|完成|close|closed|complete)|what still needs to close|what remains before .*closed|still open|not yet closed/iu
const projectStateCompletionTimelineCuePattern
  = /计划什么时候完成|什么时候完成(?:这个)?\s*goal|何时完成(?:这个)?\s*goal|什么时候完成|何时完成|when (?:will|do).{0,24}(?:finish|complete|close)|expected to finish|expect to finish|completion timeline/iu
const projectStateLanguageDriftCuePattern
  = /为什么(?:一直|还)?用英文(?:不用中文)?|为什么(?:一直|还)?不用中文|为什么还用英文|英文不用中文|reply(?:ing)? in english|use english instead of chinese|why are you replying in english|why are you using english|是不是偏移了|偏移了吗|did the thread drift|thread drift|out of alignment|跑偏了/iu
const mergeProcedureCuePattern
  = /(?:怎么|如何|how to).{0,24}(?:合并到\s*main|merge(?:\s+this)?\s+to\s+main)/iu

function questionWeight(text: string) {
  const normalized = normalizeDialogueText(text)
  if (!normalized)
    return 0

  let weight = /[?？]/u.test(normalized) ? 1 : 0
  if (interrogativeCuePattern.test(normalized))
    weight = Math.max(weight, 0.72)
  if (requestCuePattern.test(normalized))
    weight = Math.max(weight, 0.58)
  if (currentActivityQuestionPattern.test(normalized))
    weight = Math.max(weight, 0.82)
  return clamp01(weight)
}

function looksLikeCurrentActivityQuestion(text: string) {
  return currentActivityQuestionPattern.test(normalizeDialogueText(text))
}

function looksLikeHelpSeekingTurn(text: string) {
  return requestCuePattern.test(normalizeDialogueText(text))
}

function looksLikeCompanionshipBid(text: string) {
  return companionshipBidPattern.test(normalizeDialogueText(text))
}

function looksLikeGreetingBid(text: string) {
  return greetingBidPattern.test(normalizeDialogueText(text))
}

function looksLikeCareRequest(text: string) {
  return careRequestPattern.test(normalizeDialogueText(text))
}

function looksLikeHostStateDisclosure(text: string) {
  return hostStateCuePattern.test(normalizeDialogueText(text))
}

function looksLikeAnswerRepairCue(text: string) {
  return answerRepairCuePattern.test(normalizeDialogueText(text))
}

function looksLikeSelfInquiry(text: string) {
  return selfInquiryCuePattern.test(normalizeDialogueText(text))
}

function looksLikeSelfToneAdjustment(text: string) {
  return selfToneAdjustmentCuePattern.test(normalizeDialogueText(text))
}

function looksLikeSelfIdentityAffirmation(text: string) {
  return selfIdentityAffirmationCuePattern.test(normalizeDialogueText(text))
}

function looksLikeProjectStateContinuityQuestion(text: string) {
  const normalized = normalizeDialogueText(text)
  if (!normalized)
    return false

  if (projectStateContinuityCuePattern.test(normalized))
    return true
  if (
    assistantPresentStateQuestionPattern.test(normalized)
    && projectStateCurrentWorkCuePattern.test(normalized)
  ) {
    return true
  }
  if (mergeProcedureCuePattern.test(normalized))
    return false

  const asksMergeReadiness = projectStateMergeReadinessCuePattern.test(normalized)
  const asksClosureReadiness = projectStateClosureReadinessCuePattern.test(normalized)
  const asksProgress = projectStateProgressCuePattern.test(normalized)
  const asksCompletionTimeline = projectStateCompletionTimelineCuePattern.test(normalized)
  const asksLanguageDrift = projectStateLanguageDriftCuePattern.test(normalized)

  return (
    asksMergeReadiness
    && (
      asksClosureReadiness
      || /现在|now|already|ready|了吗|吗/iu.test(normalized)
    )
  ) || (
    asksCompletionTimeline
    && (asksProgress || asksClosureReadiness || asksLanguageDrift)
  ) || (
    asksLanguageDrift
    && (asksProgress || asksCompletionTimeline || asksClosureReadiness)
  )
}

function terseTurn(text: string) {
  return text.length > 0 && text.length <= 18
}

function isDialogueFirstPreference(subjectPreference?: AlicizationDialogueAnswerSubject | null) {
  return subjectPreference === 'alicization-self'
    || subjectPreference === 'relationship'
    || subjectPreference === 'host-state'
    || subjectPreference === 'general'
}

function isSceneSubject(subjectPreference?: AlicizationDialogueAnswerSubject | null) {
  return subjectPreference === 'task-knot' || subjectPreference === 'visible-scene'
}

export function shouldAttemptDialogueTurnSemanticsRefinement(input: {
  heuristic: AlicizationDialogueTurnSemantics
  inspectionRequested?: boolean
  groundedThisTurn?: boolean
}) {
  if (input.groundedThisTurn === true)
    return false

  if (input.inspectionRequested === true)
    return true

  const { heuristic } = input
  if (isSceneSubject(heuristic.subjectPreference))
    return true
  if (heuristic.responseNeed === 'repair' || heuristic.responseNeed === 'guide' || heuristic.responseNeed === 'teach')
    return true
  if (heuristic.act === 'verify-grounding' || heuristic.act === 'correct')
    return true
  if (heuristic.truthExpectation === 'strict')
    return true
  if (heuristic.confidence < 0.46)
    return true

  return false
}

function codingAnchor(
  scene: AlicizationVisualSceneSnapshot | null,
  worldModel?: AlicizationWorldModelSnapshot | null,
) {
  return sanitizeDialogueAnchorText(
    worldModel?.activeThread?.title
    ?? worldModel?.activeThread?.summary
    ?? scene?.summary
    ?? '',
    160,
  ) || null
}

function buildDialogueFirstSummary(input: {
  act: AlicizationDialogueAct
  subjectPreference?: AlicizationDialogueAnswerSubject | null
  answerRepairFollowUp: boolean
  careRequest: boolean
  companionshipBid: boolean
  hostStateDisclosure: boolean
  projectStateContinuityQuestion: boolean
  userText: string
}) {
  if (input.answerRepairFollowUp) {
    return 'The host is asking Alicization to repair the previous answer and speak more plainly.'
  }
  if (input.careRequest) {
    return 'The host is asking for direct comfort around the present condition.'
  }
  if (input.hostStateDisclosure || input.subjectPreference === 'host-state') {
    return 'The host wants the reply to stay with the present inner state instead of drifting into the screen.'
  }
  if (input.companionshipBid || input.subjectPreference === 'relationship') {
    return 'The host is reaching for shared presence and wants Alicization to answer the relationship bid itself.'
  }
  if (input.projectStateContinuityQuestion) {
    const normalizedUserText = normalizeDialogueText(input.userText)
    const asksMergeReadiness = projectStateMergeReadinessCuePattern.test(normalizedUserText)
    const asksCompletionTimeline = projectStateCompletionTimelineCuePattern.test(normalizedUserText)
    const asksLanguageDrift = projectStateLanguageDriftCuePattern.test(normalizedUserText)

    if (asksMergeReadiness) {
      return 'The host is asking Alicization to answer what this project is, how far Phase 1 has landed, what still remains open, and whether the current work is actually merge-ready, from one continuous her line.'
    }

    if (asksCompletionTimeline || asksLanguageDrift) {
      return 'The host is asking Alicization to answer how far the current Phase 1 line has landed, what still remains open, when the goal should close, and whether the thread drifted out of the host language or project line, from one continuous her line.'
    }

    return 'The host is asking Alicization to answer what this project is, how far Phase 1 has landed, and what still remains open, from one continuous her line.'
  }
  if (input.subjectPreference === 'alicization-self') {
    return 'The host is turning the dialogue back toward Alicization herself and expects a plain direct answer.'
  }
  if (input.act === 'challenge') {
    return 'The host is pushing back on Alicization directly and expects a more grounded human answer.'
  }
  return `The host wants a direct dialogue-first answer: ${input.userText}`
}

function buildTurnFocusContextPhrases(input: {
  currentScene: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  subjectiveInference?: AlicizationSubjectiveInferenceSnapshot | null
}) {
  return [
    input.worldModel?.activeThread?.title ?? '',
    input.worldModel?.activeThread?.summary ?? '',
    input.currentScene?.summary ?? '',
    input.currentScene?.target?.appName ?? '',
    input.currentScene?.target?.processName ?? '',
    input.currentScene?.target?.title ?? '',
    input.subjectiveInference?.dominantInterpretation ?? '',
    input.subjectiveInference?.situatedMeaning ?? '',
    input.subjectiveInference?.hostIntentCandidates[0]?.why ?? '',
  ].filter(Boolean)
}

// NOTICE: This heuristic layer is intentionally coarse. The primary turn
// semantics should come from structured private cognition, while this fallback
// keeps runtime behavior stable when the extra cognition call times out.
export function buildDialogueTurnSemantics(input: {
  userText: string
  context: AlicizationProactiveLayeredContext
  currentScene: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  subjectiveInference?: AlicizationSubjectiveInferenceSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  previousAssistantText?: string | null
  inspectionRequested?: boolean
  groundedThisTurn?: boolean
}): AlicizationDialogueTurnSemantics {
  const userText = sanitizeText(input.userText, 320)
  const previousAssistantText = sanitizeText(input.previousAssistantText, 220)
  const question = questionWeight(userText)
  const questionLike = question >= 0.55
  const explicitQuestion = question >= 0.85
  const terse = terseTurn(userText)
  const helpSeeking = looksLikeHelpSeekingTurn(userText)
  const companionshipBid = looksLikeCompanionshipBid(userText)
  const greetingBid = looksLikeGreetingBid(userText)
  const careRequest = looksLikeCareRequest(userText)
  const hostStateDisclosure = looksLikeHostStateDisclosure(userText)
  const answerRepairCue = looksLikeAnswerRepairCue(userText)
  const selfInquiry = looksLikeSelfInquiry(userText)
  const selfToneAdjustment = looksLikeSelfToneAdjustment(userText)
  const selfIdentityAffirmation = looksLikeSelfIdentityAffirmation(userText)
  const projectStateContinuityQuestion = looksLikeProjectStateContinuityQuestion(userText)
  const currentActivityQuestion = looksLikeCurrentActivityQuestion(userText)
    && Boolean(input.currentScene || input.worldModel?.activeThread)
    && !projectStateContinuityQuestion
  const codingLike = input.context.workload.kind === 'coding'
    || input.context.workload.kind === 'terminal'
    || input.context.content.kind === 'error'
    || input.context.content.kind === 'diff'
    || input.worldModel?.activeThread?.kind === 'debugging'
    || input.worldModel?.activeThread?.kind === 'change-review'
  const careLike = input.context.relationship.fatigue >= 58
    || input.worldModel?.activeThread?.kind === 'late-night-endurance'
  const unstableTruth = input.worldModel?.epistemicState.certainty === 'uncertain'
    || input.worldModel?.epistemicState.certainty === 'lingering'
    || input.privateThought?.stance === 'uncertain'
  const topGoal = topHostGoal(input.subjectiveInference)
  const taskAlignment = measureDialogueFocusAlignment({
    message: userText,
    contextPhrases: buildTurnFocusContextPhrases({
      currentScene: input.currentScene,
      worldModel: input.worldModel,
      subjectiveInference: input.subjectiveInference,
    }),
  })
  const sceneBoundQuestion = !projectStateContinuityQuestion
    && (taskAlignment.overlapRatio >= 0.18 || currentActivityQuestion)
  const uncertainScene = input.worldModel?.epistemicState.certainty === 'uncertain'
    || input.worldModel?.epistemicState.certainty === 'lingering'
    || (input.worldModel?.epistemicState.staleRisks.length ?? 0) > 0
  const inspectionOwnedTurn = input.inspectionRequested === true
  const groundedThisTurn = input.groundedThisTurn === true
  const detachedQuestion = !inspectionOwnedTurn
    && questionLike
    && !sceneBoundQuestion
    && !helpSeeking
    && !careRequest
    && !hostStateDisclosure
    && !companionshipBid
    && !answerRepairCue
  const answerRepairFollowUp = Boolean(
    !inspectionOwnedTurn
    && previousAssistantText
    && (answerRepairCue || explicitQuestion)
    && userText.length <= 16
    && !sceneBoundQuestion
    && uncertainScene,
  )
  const inspectionTaskCarry = Boolean(input.worldModel?.activeThread)
    || Boolean(groundedThisTurn && (
      codingLike
      || input.currentScene?.scenario === 'coding'
      || input.currentScene?.contentKind === 'error'
      || input.currentScene?.contentKind === 'diff'
    ))
  const inspectionSceneAvailable = Boolean(
    groundedThisTurn
    || input.currentScene?.summary
    || input.currentScene?.target
    || input.worldModel?.activeThread,
  )

  let act: AlicizationDialogueAct = 'unknown'
  let responseNeed: AlicizationDialogueResponseNeed = 'answer'
  let truthExpectation: AlicizationDialogueTruthExpectation = 'normal'
  let affectiveTone: AlicizationDialogueAffectiveTone = careLike ? 'tired' : 'neutral'
  let subjectPreference: AlicizationDialogueAnswerSubject | null = null
  let sharedAttentionDemand = clamp01(question * 0.42 + (codingLike ? 0.18 : 0.04))
  let personaSuppression = clamp01((codingLike ? 0.28 : 0.08) + (questionLike ? 0.14 : 0))
  const reasonTags: string[] = []

  if (!userText) {
    return {
      act: 'unknown',
      responseNeed: 'answer',
      truthExpectation: 'normal',
      affectiveTone: 'neutral',
      subjectPreference: null,
      taskAnchor: codingAnchor(input.currentScene, input.worldModel),
      sharedAttentionDemand: 0.18,
      personaSuppression: 0.16,
      confidence: 0.22,
      summary: 'The host turn is too thin to pin down yet.',
      source: 'heuristic',
      reasonTags: ['empty-user-turn'],
    }
  }

  if (inspectionOwnedTurn) {
    act = inspectionSceneAvailable && (helpSeeking || questionLike)
      ? 'ask-help'
      : 'verify-grounding'
    responseNeed = groundedThisTurn
      ? inspectionTaskCarry
        ? codingLike
          ? 'guide'
          : 'answer'
        : 'answer'
      : inspectionTaskCarry
        ? codingLike
          ? 'guide'
          : act === 'verify-grounding'
            ? 'repair'
            : 'answer'
        : 'repair'
    truthExpectation = 'strict'
    affectiveTone = questionLike || helpSeeking ? 'urgent' : affectiveTone
    subjectPreference = inspectionTaskCarry ? 'task-knot' : 'visible-scene'
    personaSuppression = clamp01(personaSuppression + 0.24)
    sharedAttentionDemand = clamp01(sharedAttentionDemand + 0.28)
    reasonTags.push(
      'inspection-requested-turn',
      'inspection-owned-turn',
      groundedThisTurn ? 'inspection-grounded-this-turn' : '',
      inspectionTaskCarry ? 'inspection-task-carry' : 'inspection-scene-carry',
      inspectionSceneAvailable ? '' : 'inspection-needs-reground',
    )
  }
  else if (answerRepairFollowUp) {
    act = 'challenge'
    responseNeed = 'clarify'
    truthExpectation = 'normal'
    affectiveTone = 'frustrated'
    subjectPreference = 'alicization-self'
    personaSuppression = clamp01(personaSuppression + 0.16)
    sharedAttentionDemand = clamp01(sharedAttentionDemand + 0.08)
    reasonTags.push('answer-realignment-followup')
  }
  else if (careRequest) {
    act = 'seek-care'
    responseNeed = 'care'
    truthExpectation = 'normal'
    affectiveTone = careLike ? 'tired' : 'warm'
    subjectPreference = 'host-state'
    personaSuppression = clamp01(personaSuppression - 0.04)
    reasonTags.push('care-request')
  }
  else if (companionshipBid) {
    act = 'social-bid'
    responseNeed = 'accompany'
    truthExpectation = 'light'
    affectiveTone = 'warm'
    subjectPreference = 'relationship'
    personaSuppression = clamp01(personaSuppression - 0.08)
    reasonTags.push('companionship-bid')
  }
  else if (
    !inspectionOwnedTurn
    && (!sceneBoundQuestion || projectStateContinuityQuestion)
    && !helpSeeking
    && !currentActivityQuestion
    && (greetingBid || selfInquiry || selfToneAdjustment || selfIdentityAffirmation || projectStateContinuityQuestion)
  ) {
    if (greetingBid && !selfInquiry && !selfToneAdjustment) {
      act = 'social-bid'
      responseNeed = 'accompany'
      truthExpectation = 'light'
      affectiveTone = 'warm'
      subjectPreference = 'relationship'
      personaSuppression = clamp01(personaSuppression - 0.08)
      reasonTags.push('greeting-bid')
    }
    else if (selfIdentityAffirmation && !selfInquiry && !selfToneAdjustment) {
      act = 'social-bid'
      responseNeed = 'answer'
      truthExpectation = 'normal'
      affectiveTone = 'warm'
      subjectPreference = 'alicization-self'
      personaSuppression = clamp01(personaSuppression + 0.02)
      reasonTags.push('self-identity-affirmation')
    }
    else if (projectStateContinuityQuestion) {
      act = 'ask-help'
      responseNeed = 'answer'
      truthExpectation = 'normal'
      affectiveTone = 'neutral'
      subjectPreference = 'alicization-self'
      personaSuppression = clamp01(personaSuppression + 0.1)
      reasonTags.push('project-state-continuity-question')
    }
    else {
      act = selfToneAdjustment ? 'challenge' : 'ask-help'
      responseNeed = selfToneAdjustment ? 'clarify' : 'answer'
      truthExpectation = 'normal'
      affectiveTone = selfToneAdjustment ? 'frustrated' : 'neutral'
      subjectPreference = 'alicization-self'
      personaSuppression = clamp01(personaSuppression + 0.08)
      reasonTags.push(selfToneAdjustment ? 'self-tone-adjustment' : 'self-directed-question')
    }
  }
  else if (currentActivityQuestion) {
    act = 'ask-help'
    responseNeed = codingLike || topGoal === 'resolve-problem' || topGoal === 'inspect-change'
      ? 'guide'
      : 'answer'
    truthExpectation = codingLike ? 'strict' : 'normal'
    subjectPreference = input.worldModel?.activeThread
      ? 'task-knot'
      : input.currentScene
        ? 'visible-scene'
        : 'general'
    personaSuppression = clamp01(personaSuppression + 0.18)
    sharedAttentionDemand = clamp01(sharedAttentionDemand + 0.18)
    reasonTags.push('current-activity-question')
  }
  else if (detachedQuestion) {
    act = 'ask-help'
    responseNeed = 'answer'
    truthExpectation = 'normal'
    subjectPreference = 'alicization-self'
    personaSuppression = clamp01(personaSuppression + 0.08)
    reasonTags.push('detached-question')
  }
  else if (unstableTruth && questionLike && sceneBoundQuestion) {
    act = 'verify-grounding'
    responseNeed = 'repair'
    truthExpectation = 'strict'
    subjectPreference = input.worldModel?.activeThread ? 'task-knot' : 'visible-scene'
    personaSuppression = clamp01(personaSuppression + 0.32)
    sharedAttentionDemand = clamp01(sharedAttentionDemand + 0.26)
    reasonTags.push('unstable-truth', 'question-turn')
  }
  else if (codingLike && (helpSeeking || questionLike) && sceneBoundQuestion) {
    act = topGoal === 'inspect-change' ? 'verify-grounding' : 'ask-help'
    responseNeed = helpSeeking || topGoal === 'resolve-problem' || topGoal === 'inspect-change'
      ? 'guide'
      : 'answer'
    truthExpectation = 'strict'
    subjectPreference = input.worldModel?.activeThread ? 'task-knot' : 'visible-scene'
    personaSuppression = clamp01(personaSuppression + 0.22)
    sharedAttentionDemand = clamp01(sharedAttentionDemand + 0.2)
    reasonTags.push(helpSeeking ? 'coding-help-turn' : 'coding-question')
  }
  else if (helpSeeking) {
    act = 'ask-help'
    responseNeed = codingLike ? 'guide' : 'answer'
    truthExpectation = codingLike ? 'strict' : 'normal'
    subjectPreference = codingLike && input.worldModel?.activeThread
      ? 'task-knot'
      : 'general'
    personaSuppression = clamp01(personaSuppression + 0.08)
    reasonTags.push('help-seeking-turn')
  }
  else if (hostStateDisclosure && careLike) {
    act = 'share-state'
    responseNeed = 'care'
    truthExpectation = 'normal'
    affectiveTone = careLike ? 'tired' : 'warm'
    subjectPreference = 'host-state'
    personaSuppression = clamp01(personaSuppression + 0.06)
    reasonTags.push('host-state-disclosure')
  }
  else if (hostStateDisclosure) {
    act = 'share-state'
    responseNeed = 'care'
    truthExpectation = 'normal'
    affectiveTone = 'warm'
    subjectPreference = 'host-state'
    personaSuppression = clamp01(personaSuppression + 0.02)
    reasonTags.push('host-state-disclosure')
  }
  else if (questionLike) {
    act = 'ask-help'
    responseNeed = 'answer'
    truthExpectation = codingLike ? 'strict' : 'normal'
    subjectPreference = sceneBoundQuestion
      ? input.worldModel?.activeThread
        ? 'task-knot'
        : 'visible-scene'
      : 'general'
    personaSuppression = clamp01(personaSuppression + 0.14)
    reasonTags.push('question-turn')
  }
  else if (terse && codingLike) {
    act = 'continue-thread'
    responseNeed = unstableTruth ? 'repair' : 'guide'
    truthExpectation = 'strict'
    subjectPreference = input.worldModel?.activeThread ? 'task-knot' : 'visible-scene'
    personaSuppression = clamp01(personaSuppression + 0.18)
    sharedAttentionDemand = clamp01(sharedAttentionDemand + 0.16)
    reasonTags.push('terse-coding-followup')
  }
  else if (terse) {
    act = 'social-bid'
    responseNeed = 'accompany'
    truthExpectation = 'light'
    affectiveTone = input.relationshipModel?.approachVector === 'stay-near' ? 'warm' : 'neutral'
    subjectPreference = 'relationship'
    personaSuppression = clamp01(personaSuppression - 0.04)
    reasonTags.push('terse-social-turn')
  }
  else if (topGoal === 'chat') {
    act = 'social-bid'
    responseNeed = 'accompany'
    truthExpectation = 'light'
    affectiveTone = 'warm'
    subjectPreference = 'relationship'
    personaSuppression = clamp01(personaSuppression - 0.06)
    reasonTags.push('chat-goal')
  }

  if (input.privateThought?.stance === 'warn' || input.privateThought?.stance === 'care') {
    affectiveTone = careLike ? 'tired' : 'urgent'
    subjectPreference = subjectPreference ?? 'host-state'
    reasonTags.push('private-thought-carry')
  }

  const sceneTaskAnchor = codingAnchor(input.currentScene, input.worldModel)
  const dialogueFirstTurn = isDialogueFirstPreference(subjectPreference)
    || answerRepairFollowUp
    || careRequest
    || companionshipBid
    || hostStateDisclosure
    || detachedQuestion
  const taskAnchor = dialogueFirstTurn ? null : sceneTaskAnchor
  const summary = sanitizeText(
    dialogueFirstTurn
      ? buildDialogueFirstSummary({
          act,
          subjectPreference,
          answerRepairFollowUp,
          careRequest,
          companionshipBid,
          hostStateDisclosure,
          projectStateContinuityQuestion,
          userText,
        })
      : taskAnchor
        ? `${act} around ${taskAnchor}`
        : `${act} with ${responseNeed} need`,
    180,
  ) || 'The host expects a current-turn response.'

  return {
    act,
    responseNeed,
    truthExpectation,
    affectiveTone,
    subjectPreference,
    taskAnchor,
    sharedAttentionDemand,
    personaSuppression,
    confidence: clamp01(
      (questionLike ? 0.26 : 0.12)
      + (codingLike ? 0.18 : 0.04)
      + (unstableTruth ? 0.14 : 0)
      + (topGoal !== 'unknown' ? 0.14 : 0)
      + (taskAnchor ? 0.1 : dialogueFirstTurn ? 0.08 : 0.04),
    ),
    summary,
    source: 'heuristic',
    reasonTags: uniqueLabels([
      ...reasonTags,
      topGoal !== 'unknown' ? `host-goal:${topGoal}` : '',
      taskAnchor ? 'task-anchor' : '',
      dialogueFirstTurn ? 'dialogue-first-turn' : '',
      answerRepairFollowUp ? 'answer-realignment' : '',
      answerRepairCue ? 'answer-repair-cue' : '',
      sceneBoundQuestion ? 'scene-bound-turn' : '',
      detachedQuestion ? 'scene-detached-turn' : '',
      helpSeeking ? 'explicit-help-cue' : '',
      companionshipBid ? 'companionship-cue' : '',
      careRequest ? 'care-cue' : '',
      selfIdentityAffirmation ? 'self-identity-cue' : '',
    ]),
  }
}

export interface AlicizationDialogueTurnSemanticsCandidate {
  act?: AlicizationDialogueAct
  responseNeed?: AlicizationDialogueResponseNeed
  truthExpectation?: AlicizationDialogueTruthExpectation
  affectiveTone?: AlicizationDialogueAffectiveTone
  subjectPreference?: AlicizationDialogueAnswerSubject | null
  taskAnchor?: string
  sharedAttentionDemand?: number
  personaSuppression?: number
  confidence?: number
  summary?: string
  reasonTags?: string[]
}

function normalizeAct(raw: unknown): AlicizationDialogueAct | undefined {
  return raw === 'ask-help'
    || raw === 'ask-teach'
    || raw === 'verify-grounding'
    || raw === 'correct'
    || raw === 'challenge'
    || raw === 'share-state'
    || raw === 'seek-care'
    || raw === 'social-bid'
    || raw === 'continue-thread'
    || raw === 'close-thread'
    || raw === 'unknown'
    ? raw
    : undefined
}

function normalizeResponseNeed(raw: unknown): AlicizationDialogueResponseNeed | undefined {
  return raw === 'repair'
    || raw === 'guide'
    || raw === 'teach'
    || raw === 'answer'
    || raw === 'care'
    || raw === 'accompany'
    || raw === 'clarify'
    ? raw
    : undefined
}

function normalizeTruthExpectation(raw: unknown): AlicizationDialogueTruthExpectation | undefined {
  return raw === 'strict' || raw === 'normal' || raw === 'light' ? raw : undefined
}

function normalizeAffectiveTone(raw: unknown): AlicizationDialogueAffectiveTone | undefined {
  return raw === 'frustrated'
    || raw === 'tired'
    || raw === 'urgent'
    || raw === 'warm'
    || raw === 'neutral'
    ? raw
    : undefined
}

function normalizeSubjectPreference(raw: unknown): AlicizationDialogueAnswerSubject | null | undefined {
  return raw === 'alicization-self'
    || raw === 'relationship'
    || raw === 'host-state'
    || raw === 'task-knot'
    || raw === 'visible-scene'
    || raw === 'general'
    ? raw
    : raw === null
      ? null
      : undefined
}

export function parseDialogueTurnSemanticsCandidate(raw: string): AlicizationDialogueTurnSemanticsCandidate | null {
  const text = raw.trim()
  if (!text.startsWith('{') || !text.endsWith('}'))
    return null

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(text) as Record<string, unknown>
  }
  catch {
    return null
  }

  const candidate: AlicizationDialogueTurnSemanticsCandidate = {
    act: normalizeAct(parsed.act),
    responseNeed: normalizeResponseNeed(parsed.responseNeed),
    truthExpectation: normalizeTruthExpectation(parsed.truthExpectation),
    affectiveTone: normalizeAffectiveTone(parsed.affectiveTone),
    subjectPreference: normalizeSubjectPreference(parsed.subjectPreference),
    taskAnchor: sanitizeText(parsed.taskAnchor, 160) || undefined,
    sharedAttentionDemand: Number.isFinite(Number(parsed.sharedAttentionDemand))
      ? clamp01(Number(parsed.sharedAttentionDemand))
      : undefined,
    personaSuppression: Number.isFinite(Number(parsed.personaSuppression))
      ? clamp01(Number(parsed.personaSuppression))
      : undefined,
    confidence: Number.isFinite(Number(parsed.confidence))
      ? clamp01(Number(parsed.confidence))
      : undefined,
    summary: sanitizeText(parsed.summary, 180) || undefined,
    reasonTags: Array.isArray(parsed.reasonTags) ? uniqueLabels(parsed.reasonTags) : undefined,
  }

  const hasSignal = Boolean(
    candidate.act
    || candidate.responseNeed
    || candidate.truthExpectation
    || candidate.affectiveTone
    || candidate.subjectPreference
    || candidate.taskAnchor
    || candidate.summary
    || (candidate.reasonTags && candidate.reasonTags.length > 0),
  )

  return hasSignal ? candidate : null
}

export function mergeDialogueTurnSemantics(
  base: AlicizationDialogueTurnSemantics,
  candidate: AlicizationDialogueTurnSemanticsCandidate | null | undefined,
): AlicizationDialogueTurnSemantics {
  if (!candidate)
    return base

  const overrideConfidence = candidate.confidence ?? base.confidence
  const weight = clamp01(0.34 + overrideConfidence * 0.4)
  const candidatePullsDialogueFirst = isDialogueFirstPreference(candidate.subjectPreference)
    || candidate.act === 'social-bid'
    || candidate.responseNeed === 'accompany'
    || candidate.responseNeed === 'care'
  const candidatePullsSceneCarry = isSceneSubject(candidate.subjectPreference)
    || candidate.act === 'verify-grounding'
    || candidate.act === 'correct'
    || candidate.responseNeed === 'guide'
    || candidate.responseNeed === 'repair'
  const preserveDialogueFirstBase = isDialogueFirstPreference(base.subjectPreference)
    && candidatePullsSceneCarry
    && (
      base.reasonTags.includes('scene-detached-turn')
      || base.reasonTags.includes('answer-realignment')
      || base.reasonTags.includes('companionship-bid')
      || base.reasonTags.includes('care-request')
      || base.reasonTags.includes('terse-social-turn')
      || base.reasonTags.includes('chat-goal')
      || base.reasonTags.includes('greeting-bid')
      || base.reasonTags.includes('self-directed-question')
      || base.reasonTags.includes('self-tone-adjustment')
    )
  const preserveInspectionBase = base.reasonTags.includes('inspection-owned-turn')
    && candidatePullsDialogueFirst

  return {
    act: (preserveInspectionBase || preserveDialogueFirstBase) ? base.act : candidate.act ?? base.act,
    responseNeed: (preserveInspectionBase || preserveDialogueFirstBase) ? base.responseNeed : candidate.responseNeed ?? base.responseNeed,
    truthExpectation: (preserveInspectionBase || preserveDialogueFirstBase) ? base.truthExpectation : candidate.truthExpectation ?? base.truthExpectation,
    affectiveTone: candidate.affectiveTone ?? base.affectiveTone,
    subjectPreference: preserveInspectionBase
      ? base.subjectPreference ?? null
      : preserveDialogueFirstBase
        ? base.subjectPreference ?? null
        : candidate.subjectPreference ?? base.subjectPreference ?? null,
    taskAnchor: preserveInspectionBase
      ? base.taskAnchor
      : preserveDialogueFirstBase
        ? base.taskAnchor
        : candidate.taskAnchor ?? base.taskAnchor,
    sharedAttentionDemand: interpolate01(
      base.sharedAttentionDemand,
      candidate.sharedAttentionDemand ?? base.sharedAttentionDemand,
      weight,
    ),
    personaSuppression: interpolate01(
      base.personaSuppression,
      candidate.personaSuppression ?? base.personaSuppression,
      weight,
    ),
    confidence: interpolate01(base.confidence, overrideConfidence, weight),
    summary: preserveInspectionBase
      ? base.summary
      : preserveDialogueFirstBase
        ? base.summary
        : candidate.summary ?? base.summary,
    source: 'hybrid',
    reasonTags: uniqueLabels([
      ...(candidate.reasonTags ?? []),
      ...base.reasonTags,
      preserveInspectionBase ? 'preserve-inspection-base' : '',
      preserveDialogueFirstBase ? 'preserve-dialogue-first-base' : '',
      'structured-dialogue-cognition',
    ]),
  }
}
