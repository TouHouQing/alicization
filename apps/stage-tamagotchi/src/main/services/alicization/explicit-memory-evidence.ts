import type { AlicizationProviderMemoryEvidence } from '@proj-alicization/stage-shared'

function normalizeText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/gu, ' ').slice(0, maxChars).trim()
}

function trimTrailingPunctuation(value: string) {
  return value.replace(/[。！？.!?]+$/gu, '').trim()
}

function resolveChinesePreference(userText: string) {
  const match = userText.match(
    /请?(?:记住|记下|别忘了|保存|记录)[\s,，:：]*(?:我\s*)?(不喜欢|喜欢|偏好|习惯是)\s*(.+?)\s*$/u,
  )
  if (!match)
    return null

  const predicate = match[1]
  const object = trimTrailingPunctuation(match[2] ?? '')
  if (!predicate || !object)
    return null

  return {
    predicate,
    object,
  }
}

function resolveEnglishPreference(userText: string) {
  const match = userText.match(
    /^(?:please\s+)?remember(?:\s+that)?\s+i\s+(don't like|do not like|prefer|like)\s+(.+?)\s*$/iu,
  )
  if (!match)
    return null

  const rawPredicate = match[1]?.toLowerCase()
  const object = trimTrailingPunctuation(match[2] ?? '')
  if (!rawPredicate || !object)
    return null

  return {
    predicate: rawPredicate.includes('like') && rawPredicate.includes('not')
      ? '不喜欢'
      : rawPredicate === 'prefer'
        ? '偏好'
        : rawPredicate === 'like'
          ? '喜欢'
          : '不喜欢',
    object,
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
    summary: `用户${preference.predicate}${preference.predicate === '偏好' ? ' ' : ''}${preference.object}。`,
    reason: '用户明确要求长期记住这项偏好。',
    evidenceSnippets: [userText],
    salience: 0.86,
    sensitivity: 'personal',
    confidence: 0.94,
  }
}
