import type { OrganicMemoryPromptContext } from '../runtime-soul'

export interface AlicizationMemoryDeliberationArtifact {
  shouldRecall: boolean
  stableCore: string[]
  unsafeDetails: string[]
  surfacePolicy: string | null
  confidence: number | null
  ambiguityPosture: string | null
  whyNow: string | null
  inwardLine: string | null
  followUp: {
    summary: string | null
    preferredTiming: string | null
    intrusionRisk: string | null
    payoffDependency: string | null
  } | null
}

function compactList(values: Array<string | null | undefined>, limit = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = typeof value === 'string'
      ? value.trim()
      : ''
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= limit)
      break
  }
  return result
}

function normalizeText(raw: unknown, maxChars = 260) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars) || null
    : null
}

export function deriveAlicizationMemoryDeliberation(input: {
  context: OrganicMemoryPromptContext
  fallbackShouldRecall: boolean
}): AlicizationMemoryDeliberationArtifact {
  const deliberation = input.context.memoryDeliberation ?? null
  const followUp = deliberation?.followUpAffordance ?? null
  return {
    shouldRecall: deliberation?.shouldRecall ?? input.fallbackShouldRecall,
    stableCore: compactList(deliberation?.stableCore ?? [], 8),
    unsafeDetails: compactList(deliberation?.unsafeDetails ?? [], 8),
    surfacePolicy: deliberation?.surfacePolicy ?? null,
    confidence: typeof deliberation?.confidence === 'number'
      ? deliberation.confidence
      : null,
    ambiguityPosture: deliberation?.ambiguityPosture ?? null,
    whyNow: normalizeText(deliberation?.whyNow),
    inwardLine: normalizeText(deliberation?.inwardLine),
    followUp: followUp
      ? {
          summary: normalizeText(followUp.summary),
          preferredTiming: followUp.preferredTiming ?? null,
          intrusionRisk: followUp.intrusionRisk ?? null,
          payoffDependency: followUp.payoffDependency ?? null,
        }
      : null,
  }
}
