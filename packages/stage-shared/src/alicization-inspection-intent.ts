export interface AlicizationInspectionContextMessage {
  role?: string | null
  content?: unknown
}

export interface AlicizationInspectionIntentResult {
  active: boolean
  confidence: number
  reasonCodes: string[]
  overlapTerms: string[]
  contextOverlap: number
  sharedAttentionLikely: boolean
}

const inspectionObserveCues = ['帮我看', '看一下', '看下', '看看', '瞧瞧', 'look at', 'take a look', 'check', 'inspect', 'review', 'show me', '見て', '見せて', '確認して', '見てくれる']
const inspectionDescribeCues = ['描述', '说说', '讲讲', '告诉我', '跟我说', '有啥', '有什么', 'describe', 'tell me', 'what is on', 'what\'s on', '説明して', '教えて', '何が見える']
const inspectionVisualPlaneCues = ['屏幕', '桌面', '工作区', '窗口', '界面', '页面', '网页', '画面', 'screen', 'display', 'desktop', 'workspace', 'window', 'page', 'view', 'scene', 'スクリーン', 'デスクトップ', 'ウィンドウ']
const inspectionRecheckCues = ['重新', '再看', '重看', '看清', '看准', '自己看', '别猜', '不要猜', '认真看', 'again', 'recheck', 'look again', 'check again', 'inspect again', 'もう一度', '見直して', 'ちゃんと見て']
const inspectionSceneShiftCues = ['我又换', '换了', '切到', '切回', '回到', '打开', '切换', 'switched', 'switch to', 'change to', 'changed', 'back to', 'returned', 'opened', '切り替え', '戻っ', '開い', '変え']
const inspectionDeicticCues = ['这个', '这首', '这页', '这段', '这张', '这题', '这里', '现在', '当前', 'this', 'that', 'it', 'current', 'now', 'here', 'これ', 'それ', 'この', 'その', '今', 'いま', 'ここ']
const inspectionQuestionCues = ['?', '？', '什么', '怎么', '哪里', '哪个', '哪首', '为什么', '怎么样', '叫什么', 'what', 'which', 'where', 'how', 'why', 'name', '何', 'なに', 'どこ', 'どう', 'どうして', 'なんで']
const inspectionContinuationCues = ['呢', '怎么样', '喜欢吗', '能看出来', '看出来了吗', '是什么', '有问题吗', 'what about', 'how about', 'かな', 'どうかな']
const inspectionAssistantPresenceCues = ['我在看', '我看着', '我在盯着', '一起看', '共视', '屏幕上', '窗口里', '当前画面', 'i can see', 'i\'m looking', 'still looking', 'on your screen', '見えてる', '見てる', 'まだ見てる']
const cjkSequencePattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/u
const alphaNumericPattern = /^[\p{Letter}\p{Number}]+$/u
const stopwords = new Set([
  'a',
  'an',
  'and',
  'are',
  'be',
  'for',
  'how',
  'i',
  'in',
  'is',
  'it',
  'me',
  'my',
  'now',
  'of',
  'on',
  'or',
  'the',
  'this',
  'that',
  'to',
  'what',
  'you',
  '你的',
  '你',
  '帮',
  '看',
  '看看',
  '吗',
  '呢',
  '啊',
  '呀',
  '的',
  '了',
  '是',
  '什么',
  '我',
  '我们',
  '现在',
  '当前',
  '这里',
  '这个',
  'その',
  'この',
  'これ',
  'それ',
  'いま',
  '今',
  'ここ',
  'ね',
  'よ',
])

const segmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter('und', { granularity: 'word' })
  : null

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

export function stringifyInspectionIntentContent(content: unknown) {
  if (typeof content === 'string')
    return content

  if (!Array.isArray(content))
    return ''

  return content
    .map((part) => {
      if (typeof part === 'string')
        return part
      if (part && typeof part === 'object' && 'text' in part)
        return String((part as { text?: unknown }).text ?? '')
      return ''
    })
    .join(' ')
}

function normalizeInspectionIntentText(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function containsInspectionCue(text: string, cues: string[]) {
  return cues.some(cue => text.includes(cue))
}

function pushInspectionToken(target: Set<string>, rawToken: string) {
  const token = normalizeInspectionIntentText(rawToken)
  if (!token || stopwords.has(token))
    return
  if (!cjkSequencePattern.test(token) && token.length <= 1)
    return
  target.add(token)
}

function pushInspectionSequenceTokens(target: Set<string>, rawToken: string) {
  const token = normalizeInspectionIntentText(rawToken)
  if (!token)
    return

  if (cjkSequencePattern.test(token)) {
    pushInspectionToken(target, token)
    const chars = [...token]
    for (const char of chars) {
      pushInspectionToken(target, char)
    }
    for (let index = 0; index < chars.length - 1; index += 1) {
      pushInspectionToken(target, `${chars[index]}${chars[index + 1]}`)
    }
    return
  }

  if (alphaNumericPattern.test(token))
    pushInspectionToken(target, token)
}

export function extractInspectionSemanticTerms(text: string) {
  const normalized = normalizeInspectionIntentText(text)
  if (!normalized)
    return []

  const tokens = new Set<string>()
  if (segmenter) {
    for (const part of segmenter.segment(normalized)) {
      const segment = normalizeInspectionIntentText(part.segment)
      if (!segment)
        continue
      if (!part.isWordLike && !cjkSequencePattern.test(segment))
        continue
      pushInspectionSequenceTokens(tokens, segment)
    }
  }
  else {
    for (const match of normalized.matchAll(/[\p{Letter}\p{Number}]+/gu))
      pushInspectionSequenceTokens(tokens, match[0] ?? '')
  }

  return [...tokens]
}

function inferSharedAttentionFromMessages(messages: AlicizationInspectionContextMessage[]) {
  return messages
    .slice(-6)
    .some((message) => {
      const text = stringifyInspectionIntentContent(message?.content).trim()
      if (!text)
        return false
      if (message?.role === 'assistant')
        return containsInspectionCue(text, inspectionAssistantPresenceCues) || containsInspectionCue(text, inspectionVisualPlaneCues)
      return containsInspectionCue(text, inspectionObserveCues)
        || containsInspectionCue(text, inspectionDescribeCues)
        || containsInspectionCue(text, inspectionVisualPlaneCues)
        || containsInspectionCue(text, inspectionRecheckCues)
    })
}

export function inferAlicizationInspectionIntent(input: {
  message: string
  recentMessages?: AlicizationInspectionContextMessage[]
  contextPhrases?: string[]
  sharedAttentionActive?: boolean
}) {
  const normalizedMessage = normalizeInspectionIntentText(input.message)
  if (!normalizedMessage) {
    return {
      active: false,
      confidence: 0,
      reasonCodes: [],
      overlapTerms: [],
      contextOverlap: 0,
      sharedAttentionLikely: false,
    } satisfies AlicizationInspectionIntentResult
  }

  const observeCue = containsInspectionCue(normalizedMessage, inspectionObserveCues)
  const describeCue = containsInspectionCue(normalizedMessage, inspectionDescribeCues)
  const visualPlaneCue = containsInspectionCue(normalizedMessage, inspectionVisualPlaneCues)
  const recheckCue = containsInspectionCue(normalizedMessage, inspectionRecheckCues)
  const sceneShiftCue = containsInspectionCue(normalizedMessage, inspectionSceneShiftCues)
  const deicticCue = containsInspectionCue(normalizedMessage, inspectionDeicticCues)
  const questionCue = containsInspectionCue(normalizedMessage, inspectionQuestionCues)
  const continuationCue = containsInspectionCue(normalizedMessage, inspectionContinuationCues)
  const shortTurn = [...normalizedMessage].length <= 32

  const messageTerms = extractInspectionSemanticTerms(normalizedMessage)
  const contextTerms = new Set<string>()
  for (const phrase of input.contextPhrases ?? []) {
    for (const term of extractInspectionSemanticTerms(phrase))
      contextTerms.add(term)
  }
  for (const message of input.recentMessages ?? []) {
    for (const term of extractInspectionSemanticTerms(stringifyInspectionIntentContent(message?.content)))
      contextTerms.add(term)
  }

  const overlapTerms = messageTerms.filter(term => contextTerms.has(term))
  const overlapDenominator = Math.max(1, Math.min(4, messageTerms.length))
  const contextOverlap = overlapTerms.length / overlapDenominator
  const sharedAttentionLikely = Boolean(
    input.sharedAttentionActive
    || inferSharedAttentionFromMessages(input.recentMessages ?? []),
  )
  const referentialDensity = messageTerms.filter(term => term.length >= 2 || cjkSequencePattern.test(term)).length
  const entityDense = referentialDensity >= 2
  const referentiallyRich = referentialDensity >= 3
  const explicitVisualAsk = visualPlaneCue && (observeCue || describeCue || questionCue || recheckCue)
  const contextualContinuation = sharedAttentionLikely
    && shortTurn
    && (
      deicticCue
      || sceneShiftCue
      || recheckCue
      || continuationCue
      || contextOverlap > 0
    )

  let score = 0
  score += observeCue ? 0.22 : 0
  score += describeCue ? 0.18 : 0
  score += visualPlaneCue ? 0.22 : 0
  score += recheckCue ? 0.18 : 0
  score += sceneShiftCue ? 0.16 : 0
  score += deicticCue ? 0.1 : 0
  score += questionCue ? 0.1 : 0
  score += continuationCue ? 0.08 : 0
  score += entityDense ? 0.12 : 0
  score += referentiallyRich ? 0.12 : 0
  score += Math.min(0.28, contextOverlap * 0.4)
  score += sharedAttentionLikely ? 0.16 : 0
  score += contextualContinuation ? 0.28 : 0
  score += explicitVisualAsk ? 0.22 : 0
  score += observeCue && questionCue && entityDense ? 0.18 : 0
  score += sharedAttentionLikely && contextOverlap > 0.24 ? 0.14 : 0
  if (explicitVisualAsk)
    score = Math.max(score, 0.9)

  const confidence = clamp01(score)
  const active = explicitVisualAsk
    || contextualContinuation
    || confidence >= 0.72

  return {
    active,
    confidence,
    reasonCodes: [
      observeCue ? 'observe-cue' : '',
      describeCue ? 'describe-cue' : '',
      visualPlaneCue ? 'visual-plane-cue' : '',
      recheckCue ? 'recheck-cue' : '',
      sceneShiftCue ? 'scene-shift-cue' : '',
      deicticCue ? 'deictic-cue' : '',
      questionCue ? 'question-cue' : '',
      continuationCue ? 'continuation-cue' : '',
      entityDense ? 'entity-dense' : '',
      referentiallyRich ? 'referentially-rich' : '',
      contextOverlap > 0 ? 'context-overlap' : '',
      sharedAttentionLikely ? 'shared-attention-likely' : '',
      contextualContinuation ? 'contextual-continuation' : '',
      explicitVisualAsk ? 'explicit-visual-ask' : '',
    ].filter(Boolean),
    overlapTerms,
    contextOverlap: clamp01(contextOverlap),
    sharedAttentionLikely,
  } satisfies AlicizationInspectionIntentResult
}
