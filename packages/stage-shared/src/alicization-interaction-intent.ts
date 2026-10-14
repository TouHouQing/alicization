/** A turn projection of the desktop's existing deliberation, not a new mind. */
export interface AlicizationInteractionIntent {
  version: 'interaction-intent-v1'
  cardId: string
  turnId: string
  purpose: 'care' | 'clarify' | 'reflect' | 'guide' | 'repair' | 'accompany' | 'answer' | 'defer' | 'greet' | 'celebrate' | 'play'
  attention: 'host' | 'shared-task' | 'inward'
  focus: string
  reason: string
  sourceRefs: string[]
  confidence: number
  createdAt: number
  expiresAt: number
  target?: { screenX: number, screenY: number, observationId: string, observedAt: number }
}

export function normalizeAlicizationInteractionIntent(raw: unknown): AlicizationInteractionIntent | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const value = raw as Record<string, unknown>
  const purposes = ['care', 'clarify', 'reflect', 'guide', 'repair', 'accompany', 'answer', 'defer', 'greet', 'celebrate', 'play']
  const identifier = (raw: unknown) => typeof raw === 'string' && raw.trim().length > 0 && raw.trim().length <= 120 ? raw.trim() : null
  const cardId = identifier(value.cardId)
  const turnId = identifier(value.turnId)
  if (value.version !== 'interaction-intent-v1' || !cardId || !turnId || !purposes.includes(String(value.purpose)) || !['host', 'shared-task', 'inward'].includes(String(value.attention)))
    return null
  if (typeof value.focus !== 'string' || typeof value.reason !== 'string' || !value.reason.trim() || value.focus.length > 240 || value.reason.length > 400)
    return null
  if (!Array.isArray(value.sourceRefs) || value.sourceRefs.length < 1 || value.sourceRefs.length > 8 || value.sourceRefs.some(item => typeof item !== 'string' || !item.trim() || item.length > 256))
    return null
  if (typeof value.confidence !== 'number' || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1 || typeof value.createdAt !== 'number' || !Number.isFinite(value.createdAt) || typeof value.expiresAt !== 'number' || !Number.isFinite(value.expiresAt) || value.expiresAt <= value.createdAt || value.expiresAt - value.createdAt > 120_000)
    return null
  const target = value.target as AlicizationInteractionIntent['target']
  if (target && (![target.screenX, target.screenY, target.observedAt].every(Number.isFinite) || Math.abs(target.screenX) > 100000 || Math.abs(target.screenY) > 100000 || !identifier(target.observationId) || target.observedAt > value.createdAt + 1000 || value.createdAt - target.observedAt > 30000))
    return null
  return { version: 'interaction-intent-v1', cardId, turnId, purpose: value.purpose as AlicizationInteractionIntent['purpose'], attention: value.attention as AlicizationInteractionIntent['attention'], focus: value.focus.trim(), reason: value.reason.trim(), sourceRefs: value.sourceRefs.map(item => (item as string).trim()), confidence: value.confidence, createdAt: value.createdAt, expiresAt: value.expiresAt, ...(target ? { target: { screenX: target.screenX, screenY: target.screenY, observationId: target.observationId, observedAt: target.observedAt } } : {}) }
}
