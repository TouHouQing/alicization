export function preferProjectStateSpecificClosureSummary(input: {
  canonical?: unknown
  persisted?: unknown
  canonicalFallback?: unknown
}) {
  const canonical = typeof input.canonical === 'string' ? input.canonical.trim() : ''
  const persisted = typeof input.persisted === 'string' ? input.persisted.trim() : ''
  const canonicalFallback = typeof input.canonicalFallback === 'string' ? input.canonicalFallback.trim() : ''

  if (!persisted)
    return canonical || canonicalFallback || null
  if (!canonical)
    return persisted
  if (!canonicalFallback)
    return canonical
  if (canonical === canonicalFallback && persisted !== canonicalFallback)
    return persisted

  return canonical
}
