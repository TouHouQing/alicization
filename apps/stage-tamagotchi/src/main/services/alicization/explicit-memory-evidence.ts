import type { AlicizationProviderMemoryEvidence } from '@proj-alicization/stage-shared'

interface ResolvedPreference {
  explicit: boolean
  summary: string
  kind?: 'correction'
  supersedesText?: string[]
  claim?: {
    subject: string
    predicate: string
    object: string
  }
}

function normalizeText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/gu, ' ').slice(0, maxChars).trim()
}

function trimTrailingPunctuation(value: string) {
  return value.replace(/[。！？.!?]+$/gu, '').trim()
}

function looksLikeQuestion(value: string) {
  return /[？?]/u.test(value)
    || /(?:什么|哪[个些里种儿]?|怎么|怎样|为什么|为何|多少|是否|是不是|[谁几吗么])\s*[。！？.!?]*$/u.test(value)
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

function stripChinesePreferenceCorrectionPrefix(userText: string) {
  return userText.replace(
    /^(?:我\s*)?(?:改口了|改一下|更正一下|更新一下|纠正一下)[\s,，:：]*/u,
    '',
  ).trim()
}

function stripEnglishMemoryRequestPrefix(userText: string) {
  const match = userText.match(
    /^(?:please\s+)?remember(?:\s+that)?\s*(?:[:：,，]\s*)?(.+)$/iu,
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

function isChinesePreferenceCorrection(userText: string) {
  return /^(?:我\s*)?(?:改口了|改一下|更正一下|更新一下|纠正一下)[\s,，:：]*/u.test(userText)
}

function resolveChineseFactCorrection(userText: string) {
  const correctionText = stripChinesePreferenceCorrectionPrefix(userText)
  const naturalCorrectionMatch = /[，,；;]\s*(?:我的?\s*)?(.+?)\s*改(?:成|为)\s*(.+?)(?:[，,。；;]|$)/u.exec(correctionText)
    ?? /^(?:我的?\s*)?(.+?)\s*改(?:成|为)\s*(.+?)(?:[，,。；;]|$)/u.exec(correctionText)
  const match = isChinesePreferenceCorrection(userText)
    ? correctionText.match(
        /^(.+?)\s*(?:(?:已经|已)\s*)?(?:从|由)\s*(.+?)\s*改(?:成|为)\s*(.+?)(?:[，,。]|$)/u,
      )
    : /不对|不准确|错了|有误/u.test(userText)
      ? naturalCorrectionMatch
      : null
  if (!match)
    return null

  const subject = trimTrailingPunctuation(normalizeText(match[1], 120))
  const oldValue = isChinesePreferenceCorrection(userText)
    ? trimTrailingPunctuation(normalizeText(match[2], 120))
    : ''
  const newValue = trimTrailingPunctuation(normalizeText(
    isChinesePreferenceCorrection(userText) ? match[3] : match[2],
    120,
  ))
  if (
    !subject
    || !oldValue
    || !newValue
    || looksLikeQuestion(subject)
    || looksLikeQuestion(oldValue)
    || looksLikeQuestion(newValue)
    || subject === oldValue
    || oldValue === newValue
  ) {
    if (
      !subject
      || !newValue
      || looksLikeQuestion(subject)
      || looksLikeQuestion(newValue)
    ) {
      return null
    }
  }

  return {
    kind: 'correction' as const,
    summary: `${subject}现在是${newValue}。`,
    supersedesText: oldValue ? [oldValue] : undefined,
    claim: {
      subject,
      predicate: 'is',
      object: newValue,
    },
  }
}

function stripExpiredPreferenceExplanation(value: string) {
  return value.replace(
    /[\s,，、;；:：]*(?:之前|原来|先前)的?(?:偏好|选择|习惯|说法)?(?:已经|已)?(?:过期|作废|不再适用|无效)了?[。！？.!?]*$/u,
    '',
  ).trim()
}

function buildChinesePreferenceSummary(match: RegExpMatchArray) {
  const modifiers = (match[1] ?? '').replace(/\s+/gu, '')
  const rawPredicate = match[2] ?? ''
  const predicate = rawPredicate === '习惯于' || rawPredicate === '习惯是'
    ? '习惯'
    : rawPredicate
  const qualifiedPredicate = `${modifiers}${predicate}`
  const object = trimTrailingPunctuation(
    stripExpiredPreferenceExplanation(match[3] ?? '').replace(/[，,；;]\s*请?(?:帮我)?(?:记住|记下|别忘了|保存|记录)(?:一下)?(?:这个|这条|我的)?(?:小偏好|偏好|习惯|喜好)(?:[吧哦啊]|一下)?[。！？.!?]*$/u, '').trim(),
  )
  if (!qualifiedPredicate || !object || looksLikeQuestion(object))
    return null

  return {
    summary: `用户${qualifiedPredicate}${qualifiedPredicate === '偏好' ? ' ' : ''}${object}。`,
  }
}

function extractSupersededChinesePreferenceValues(clauses: string[]) {
  return [...new Set(clauses.flatMap((clause) => {
    const normalized = trimTrailingPunctuation(clause)
    const matches = [
      normalized.match(/^(?:我\s*)?(?:不是|不再)更?(?:喜欢|偏好)\s*(.+)$/u),
      normalized.match(/^(.+?)\s*是(?:以前|之前|原来)的?(?:偏好|选择|习惯)$/u),
      normalized.match(/^(?:我\s*)?(?:之前|以前|原来)更?(?:喜欢|偏好)\s*(.+)$/u),
    ]
    return matches
      .map(match => trimTrailingPunctuation(normalizeText(match?.[1], 120)))
      .filter(Boolean)
  }))].slice(0, 8)
}

function resolveChinesePreferenceCorrection(request: {
  explicit: boolean
  text: string
}): ResolvedPreference | null {
  if (!isChinesePreferenceCorrection(request.text))
    return null

  const correctionText = stripChinesePreferenceCorrectionPrefix(request.text)
  const preferencePattern = /^(?:我\s*)?((?:(?:最近|现在|目前|平时|通常|一直|还是|比较|更|最)\s*)*)(不喜欢|喜欢|偏好|习惯于|习惯是|习惯)\s*(.+?)\s*$/u
  const clauses = correctionText
    .split(/[，,；;。]/u)
    .map(clause => clause.trim())
    .filter(Boolean)

  for (let index = clauses.length - 1; index >= 0; index -= 1) {
    const match = clauses[index]?.match(preferencePattern)
    if (!match)
      continue
    const summary = buildChinesePreferenceSummary(match)
    if (!summary)
      continue

    const supersedesText = extractSupersededChinesePreferenceValues(
      clauses.filter((_clause, clauseIndex) => clauseIndex !== index),
    )
    return {
      explicit: request.explicit,
      kind: 'correction' as const,
      ...summary,
      supersedesText: supersedesText.length > 0 ? supersedesText : undefined,
      claim: {
        subject: 'user',
        predicate: 'prefers',
        object: summary.summary,
      },
    }
  }

  return null
}

function resolveChinesePreference(userText: string): ResolvedPreference | null {
  if (looksLikeQuestion(userText))
    return null

  const request = stripChineseMemoryRequestPrefix(userText)
  const correction = resolveChinesePreferenceCorrection(request)
  if (correction)
    return correction

  const preferenceText = stripChinesePreferenceCorrectionPrefix(request.text)
  const match = preferenceText.match(
    /^(?:我\s*)?((?:(?:最近|现在|目前|平时|通常|一直|还是|比较|更|最)\s*)*)(不喜欢|喜欢|偏好|习惯于|习惯是|习惯)\s*(.+?)\s*$/u,
  )
  if (match) {
    const summary = buildChinesePreferenceSummary(match)
    if (!summary)
      return null

    return {
      explicit: request.explicit,
      ...summary,
    }
  }

  const futurePreference = preferenceText.match(
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

function resolveEnglishPreference(userText: string): ResolvedPreference | null {
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

function buildExplicitEpisodeEvidence(input: {
  text: string
  evidenceSnippet: string
  language: 'chinese' | 'english'
}): AlicizationProviderMemoryEvidence | null {
  const text = trimTrailingPunctuation(normalizeText(input.text, 240))
  if (!text || looksLikeQuestion(text))
    return null

  const summary = input.language === 'chinese'
    ? `用户${text}。`
    : `The user ${text}.`

  return {
    version: 'provider-memory-evidence-v1',
    kind: 'episode',
    summary,
    reason: '用户明确要求长期记住这段可检索的经历或上下文。',
    evidenceSnippets: [input.evidenceSnippet],
    salience: 0.86,
    sensitivity: 'personal',
    confidence: 0.94,
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

  // A factual clause followed by a question is still reported evidence. Keep
  // the exact source clause, and leave questions and corrections to their
  // existing owners instead of treating the entire mixed turn as a question.
  if (looksLikeQuestion(userText)) {
    const clauses = userText.split(/(?<=[。！？.!?])\s*/u).filter(Boolean)
    const candidates = clauses.filter(clause => !looksLikeQuestion(clause) && (resolveChinesePreference(clause) || resolveEnglishPreference(clause)))
    if (candidates.length === 1 && !/不对|不是真的|开玩笑|更正|改口|just kidding|actually/iu.test(userText)) {
      const evidence = extractExplicitLongTermMemoryEvidence({ ...input, userText: candidates[0] })
      if (evidence)
        return evidence
    }
  }

  const factCorrection = resolveChineseFactCorrection(userText)
  if (factCorrection) {
    return {
      version: 'provider-memory-evidence-v1',
      ...factCorrection,
      reason: '用户明确纠正了之前的长期记忆事实。',
      evidenceSnippets: [userText],
      salience: 0.94,
      sensitivity: 'personal',
      confidence: 0.98,
    }
  }

  const preference = resolveChinesePreference(userText)
    ?? resolveEnglishPreference(userText)
  if (!preference) {
    const chineseRequest = stripChineseMemoryRequestPrefix(userText)
    const englishRequest = stripEnglishMemoryRequestPrefix(userText)
    const request = chineseRequest.explicit
      ? { language: 'chinese' as const, text: chineseRequest.text }
      : englishRequest.explicit
        ? { language: 'english' as const, text: englishRequest.text }
        : null
    return request
      ? buildExplicitEpisodeEvidence({
          ...request,
          evidenceSnippet: userText,
        })
      : null
  }

  return {
    version: 'provider-memory-evidence-v1',
    kind: preference.kind ?? 'preference',
    summary: preference.summary,
    reason: preference.kind === 'correction'
      ? '用户明确纠正了之前的长期记忆偏好。'
      : preference.explicit
        ? '用户明确要求长期记住这项偏好。'
        : '用户清楚表达了可持续使用的偏好。',
    evidenceSnippets: [userText],
    salience: 0.86,
    sensitivity: 'personal',
    confidence: 0.94,
    supersedesText: preference.supersedesText,
    claim: preference.claim,
  }
}
