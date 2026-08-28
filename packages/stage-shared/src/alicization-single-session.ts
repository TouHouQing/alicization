const defaultCardId = 'default'

function stableScopeHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function normalizePrimarySessionScope(raw: unknown) {
  const normalized = typeof raw === 'string' ? raw.trim() : ''
  if (!normalized)
    return defaultCardId

  const scope = normalized
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    || defaultCardId

  if (scope === normalized)
    return scope

  return `${scope}-${stableScopeHash(normalized)}`
}

export function alicizationPrimaryConversationSessionId(cardId: unknown) {
  return `session:primary:${normalizePrimarySessionScope(cardId)}`
}
