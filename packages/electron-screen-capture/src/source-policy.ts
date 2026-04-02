export interface ScreenCaptureSourceIdentity {
  id: string
  name: string
  display_id?: string
}

export type ScreenCaptureSourceKind = 'display' | 'window' | 'device' | 'unknown'

export interface SortScreenCaptureSourcesOptions {
  preferredKinds?: ScreenCaptureSourceKind[]
  preferredNameKeywords?: string[]
}

const defaultPreferredKinds: ScreenCaptureSourceKind[] = ['display', 'window', 'device', 'unknown']

function normalizePreferredKinds(preferredKinds?: ScreenCaptureSourceKind[]) {
  const candidates = preferredKinds?.length ? preferredKinds : defaultPreferredKinds
  const deduped = Array.from(new Set(candidates))
  if (deduped.length === 0)
    return defaultPreferredKinds

  if (!deduped.includes('unknown'))
    deduped.push('unknown')

  return deduped
}

function normalizeNameKeywords(preferredNameKeywords?: string[]) {
  return (preferredNameKeywords ?? [])
    .map(keyword => keyword.trim().toLowerCase())
    .filter(Boolean)
}

export function classifyScreenCaptureSourceKind(source: ScreenCaptureSourceIdentity): ScreenCaptureSourceKind {
  if (source.id.startsWith('screen:'))
    return 'display'
  if (source.id.startsWith('window:'))
    return 'window'
  if (source.id.startsWith('device:'))
    return 'device'

  return 'unknown'
}

function getSourceKindRank(kind: ScreenCaptureSourceKind, preferredKinds: ScreenCaptureSourceKind[]) {
  const rank = preferredKinds.indexOf(kind)
  return rank >= 0 ? rank : preferredKinds.length
}

function getNameKeywordRank(name: string, preferredNameKeywords: string[]) {
  if (preferredNameKeywords.length === 0)
    return preferredNameKeywords.length

  const normalizedName = name.trim().toLowerCase()
  if (!normalizedName)
    return preferredNameKeywords.length

  for (const [index, keyword] of preferredNameKeywords.entries()) {
    if (normalizedName.includes(keyword))
      return index
  }

  return preferredNameKeywords.length
}

function compareScreenCaptureSources(
  left: ScreenCaptureSourceIdentity,
  right: ScreenCaptureSourceIdentity,
  options?: SortScreenCaptureSourcesOptions,
) {
  const preferredKinds = normalizePreferredKinds(options?.preferredKinds)
  const preferredNameKeywords = normalizeNameKeywords(options?.preferredNameKeywords)

  const leftKindRank = getSourceKindRank(classifyScreenCaptureSourceKind(left), preferredKinds)
  const rightKindRank = getSourceKindRank(classifyScreenCaptureSourceKind(right), preferredKinds)
  if (leftKindRank !== rightKindRank)
    return leftKindRank - rightKindRank

  const leftNameKeywordRank = getNameKeywordRank(left.name, preferredNameKeywords)
  const rightNameKeywordRank = getNameKeywordRank(right.name, preferredNameKeywords)
  if (leftNameKeywordRank !== rightNameKeywordRank)
    return leftNameKeywordRank - rightNameKeywordRank

  const leftName = left.name.trim()
  const rightName = right.name.trim()
  const nameComparison = leftName.localeCompare(rightName)
  if (nameComparison !== 0)
    return nameComparison

  return left.id.localeCompare(right.id)
}

export function sortScreenCaptureSources<T extends ScreenCaptureSourceIdentity>(
  sources: readonly T[],
  options?: SortScreenCaptureSourcesOptions,
) {
  return [...sources].sort((left, right) => compareScreenCaptureSources(left, right, options))
}

export function choosePreferredScreenCaptureSource<T extends ScreenCaptureSourceIdentity>(
  sources: readonly T[],
  options?: SortScreenCaptureSourcesOptions,
): T | null {
  const sorted = sortScreenCaptureSources(sources, options)
  return sorted.length > 0 ? sorted[0] ?? null : null
}
