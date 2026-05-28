function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

export function resolveAuthorityMismatchDisplay(input: {
  authorityMismatchSummary?: string | null
  authorityMismatchReasonSummary?: string | null
}) {
  return normalizeText(input.authorityMismatchReasonSummary)
    ?? normalizeText(input.authorityMismatchSummary)
}
