import type {
  AlicizationOrganicMemoryRuntimeStage,
  AlicizationOrganicMemoryRuntimeStageReplaySnapshot,
  AlicizationOrganicMemoryStageReplay,
} from './alicization-memory-stats'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function asObject(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function asStringList(raw: unknown, maxItems = 8, maxChars = 160) {
  if (!Array.isArray(raw))
    return [] as string[]
  return raw
    .map(item => sanitizeText(item, maxChars))
    .filter(Boolean)
    .slice(0, maxItems)
}

export function normalizeAlicizationOrganicMemoryStageReplay(raw: unknown): AlicizationOrganicMemoryStageReplay | null {
  const candidate = asObject(raw)
  if (!candidate)
    return null
  const producedAt = Number(candidate.producedAt)
  const stagesRaw = Array.isArray(candidate.stages) ? candidate.stages : []
  if (!Number.isFinite(producedAt))
    return null

  const normalizedStages: AlicizationOrganicMemoryRuntimeStageReplaySnapshot[] = stagesRaw.flatMap((item) => {
    const stageEntry = asObject(item)
    if (!stageEntry)
      return []
    const stage = sanitizeText(stageEntry.stage, 80) as AlicizationOrganicMemoryRuntimeStage
    if (
      stage !== 'search-prelude'
      && stage !== 'candidate-generation'
      && stage !== 'candidate-ranking'
      && stage !== 'recollection-planning'
      && stage !== 'surface-planning'
      && stage !== 'self-evolution-integration'
      && stage !== 'prompt-blocks'
    ) {
      return []
    }
    const budgetClassText = sanitizeText(stageEntry.budgetClass, 80)
    const budgetClass = budgetClassText === 'realtime-reply'
      || budgetClassText === 'deep-recall-reply'
      || budgetClassText === 'proactive-generation'
      || budgetClassText === 'nightly-benchmark'
      || budgetClassText === 'diagnosis-replay'
      ? budgetClassText
      : null
    const latencyMs = Number(stageEntry.latencyMs)
    return [{
      stage,
      summary: sanitizeText(stageEntry.summary, 240),
      latencyMs: Number.isFinite(latencyMs) ? Math.max(0, latencyMs) : null,
      budgetClass,
      inputs: asStringList(stageEntry.inputs, 8, 200),
      outputs: asStringList(stageEntry.outputs, 8, 200),
      diagnostics: asStringList(stageEntry.diagnostics, 8, 220),
    } satisfies AlicizationOrganicMemoryRuntimeStageReplaySnapshot]
  })

  return {
    version: 'organic-memory-stage-replay-v1',
    producedAt: Math.max(0, Math.floor(producedAt)),
    stages: normalizedStages,
  }
}
