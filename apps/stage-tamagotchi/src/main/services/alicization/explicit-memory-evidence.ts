import type { AlicizationProviderMemoryEvidence } from '@proj-alicization/stage-shared'

function normalizeText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/gu, ' ').slice(0, maxChars).trim()
}

function trimTrailingPunctuation(value: string) {
  return value.replace(/[。！？.!?]+$/gu, '').trim()
}

function looksLikeQuestion(value: string) {
  return /[？?]\s*$/u.test(value)
    || /(?:什么|哪[个些里种]?|怎么|怎样|为什么|为何|多少|是否|是不是|[谁几吗么])\s*[。！？.!?]*$/u.test(value)
}

function stripChineseMemoryRequestPrefix(userText: string) {
  const match = userText.match(
    /^(?:请\s*)?把(?:这件事|这个|这条|它)\s*作为\s*长期(?:\s*(?:偏好|记忆))?\s*(?:记住|记下|别忘了|保存|记录)(?:一下)?[\s,，:：]*(.+)$/u,
  ) ?? userText.match(
    /^(?:请\s*)?(?:记住|记下|别忘了|保存|记录)(?:一下)?[\s,，:：]*(.+)$/u,
  )
  if (!match) {
    return {
      explicit: false,
      text: userText,
    }
  }

  return {
    explicit: true,
    text: match[1]?.trim() ?? '',
  }
}

function resolveChinesePreference(userText: string) {
  if (looksLikeQuestion(userText))
    return null

  const request = stripChineseMemoryRequestPrefix(userText)
  const match = request.text.match(
    /^(?:我\s*)?((?:(?:最近|现在|目前|平时|通常|一直|还是|比较|更|最)\s*)*)(不喜欢|喜欢|偏好|习惯于|习惯是|习惯)\s*(.+?)\s*$/u,
  )
  if (match) {
    const modifiers = (match[1] ?? '').replace(/\s+/gu, '')
    const rawPredicate = match[2] ?? ''
    const predicate = rawPredicate === '习惯于' || rawPredicate === '习惯是'
      ? '习惯'
      : rawPredicate
    const qualifiedPredicate = `${modifiers}${predicate}`
    const object = trimTrailingPunctuation(match[3] ?? '')
    if (!qualifiedPredicate || !object || looksLikeQuestion(object))
      return null

    return {
      explicit: request.explicit,
      summary: `用户${qualifiedPredicate}${qualifiedPredicate === '偏好' ? ' ' : ''}${object}。`,
    }
  }

  const futurePreference = request.text.match(
    /^(以后|之后|今后)\s*(?:请\s*|就\s*|希望你\s*|麻烦你\s*)?(.+?)\s*$/u,
  )
  const futureAction = trimTrailingPunctuation(futurePreference?.[2] ?? '')
  if (
    !futurePreference
    || !futureAction
    || looksLikeQuestion(futureAction)
    || !/回答|回复|交流|称呼|提醒|解释|表达|使用|不要|[说写用先别]/u.test(futureAction)
  ) {
    return null
  }

  return {
    explicit: request.explicit,
    summary: `用户希望${futurePreference[1]}${futureAction}。`,
  }
}

function resolveEnglishPreference(userText: string) {
  if (looksLikeQuestion(userText))
    return null

  const match = userText.match(
    /^(?:(?:please\s+)?remember(?:\s+that)?\s+)?i\s+(don't like|do not like|prefer|like)\s+(.+?)\s*$/iu,
  )
  if (!match)
    return null

  const rawPredicate = match[1]?.toLowerCase()
  const object = trimTrailingPunctuation(match[2] ?? '')
  if (!rawPredicate || !object)
    return null

  const predicate = rawPredicate.includes('not')
    ? '不喜欢'
    : rawPredicate === 'prefer'
      ? '偏好'
      : '喜欢'

  return {
    explicit: /^(?:please\s+)?remember\b/iu.test(userText),
    summary: `用户${predicate}${predicate === '偏好' ? ' ' : ''}${object}。`,
  }
}

export function extractExplicitLongTermMemoryEvidence(input: {
  userText: string
  assistantText?: string | null
  providerSucceeded?: boolean
}): AlicizationProviderMemoryEvidence | null {
  void input.assistantText
  if (input.providerSucceeded === false)
    return null

  const userText = normalizeText(input.userText, 260)
  if (!userText)
    return null

  const preference = resolveChinesePreference(userText)
    ?? resolveEnglishPreference(userText)
  if (!preference)
    return null

  return {
    version: 'provider-memory-evidence-v1',
    kind: 'preference',
    summary: preference.summary,
    reason: preference.explicit
      ? '用户明确要求长期记住这项偏好。'
      : '用户清楚表达了可持续使用的偏好。',
    evidenceSnippets: [userText],
    salience: 0.86,
    sensitivity: 'personal',
    confidence: 0.94,
  }
}
