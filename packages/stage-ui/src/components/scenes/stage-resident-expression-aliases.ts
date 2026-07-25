import { mergePreferredAliases } from './stage-runtime-embodiment-cues'

function uniqueAliases(values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const normalized = typeof value === 'string' ? value.trim() : ''
    if (!normalized)
      continue

    const dedupeKey = normalized.toLowerCase()
    if (seen.has(dedupeKey))
      continue

    seen.add(dedupeKey)
    result.push(normalized)
  }

  return result
}

function resolveResidentConfiguredAliasesFromRuntimeState(input: {
  emotion: string
  configuredAliases: readonly string[] | null | undefined
  runtimeSegmentExpressionAliasesByEmotion: Partial<Record<string, string[]>>
  runtimeTurnExpressionAliasesByEmotion: Partial<Record<string, string[]>>
}) {
  return mergePreferredAliases(
    input.runtimeSegmentExpressionAliasesByEmotion[input.emotion],
    mergePreferredAliases(
      input.runtimeTurnExpressionAliasesByEmotion[input.emotion],
      input.configuredAliases,
    ),
  )
}

function preserveAuthoritativeSegmentAliases(
  authoritativeSegmentAliases: readonly string[] | null | undefined,
  resolvedAliases: readonly string[] | null | undefined,
) {
  return mergePreferredAliases(
    authoritativeSegmentAliases,
    resolvedAliases,
  )
}

export function resolveResidentLive2DPreferredExpressionAliases(input: {
  emotion: string
  configuredAliases: readonly string[] | null | undefined
}) {
  return uniqueAliases([
    ...input.configuredAliases ?? [],
    input.emotion,
  ])
}

export function resolveResidentLive2DPreferredExpressionAliasesFromRuntimeState(input: {
  emotion: string
  configuredAliases: readonly string[] | null | undefined
  runtimeSegmentExpressionAliasesByEmotion: Partial<Record<string, string[]>>
  runtimeTurnExpressionAliasesByEmotion: Partial<Record<string, string[]>>
}) {
  const authoritativeSegmentAliases = input.runtimeSegmentExpressionAliasesByEmotion[input.emotion]

  return preserveAuthoritativeSegmentAliases(
    authoritativeSegmentAliases,
    resolveResidentLive2DPreferredExpressionAliases({
      emotion: input.emotion,
      configuredAliases: resolveResidentConfiguredAliasesFromRuntimeState(input),
    }),
  )
}

export function resolveResidentVrmPreferredExpressionAliases(input: {
  emotion: string
  configuredAliases: readonly string[] | null | undefined
}) {
  return resolveResidentLive2DPreferredExpressionAliases(input)
}

export function resolveResidentVrmPreferredExpressionAliasesFromRuntimeState(input: {
  emotion: string
  configuredAliases: readonly string[] | null | undefined
  runtimeSegmentExpressionAliasesByEmotion: Partial<Record<string, string[]>>
  runtimeTurnExpressionAliasesByEmotion: Partial<Record<string, string[]>>
}) {
  const authoritativeSegmentAliases = input.runtimeSegmentExpressionAliasesByEmotion[input.emotion]

  return preserveAuthoritativeSegmentAliases(
    authoritativeSegmentAliases,
    resolveResidentVrmPreferredExpressionAliases({
      emotion: input.emotion,
      configuredAliases: resolveResidentConfiguredAliasesFromRuntimeState(input),
    }),
  )
}

export function normalizeResidentFacialCue(configuredCue: string | null | undefined) {
  const normalized = typeof configuredCue === 'string'
    ? configuredCue.trim()
    : ''
  return normalized || null
}
