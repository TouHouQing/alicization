import type { OrganicMemoryPromptContext } from '../runtime-soul'

import type {
  AlicizationOrganicMemoryStageReplay,
} from '@proj-alicization/stage-shared'
import type {
  AlicizationMemoryResolutionLedger,
} from '@proj-alicization/stage-shared'

function sanitizeText(raw: unknown, maxChars = 220) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
    : ''
}

function compact(values: Array<string | null | undefined>, limit = 8, maxChars = 200) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, maxChars)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= limit)
      break
  }
  return result
}

export function buildAlicizationMemoryStageReplay(input: {
  producedAt: number
  stages: Array<{
    stage: string
    summary: string
    latencyMs: number | null
    budgetClass: string | null
    inputs?: string[]
    outputs?: string[]
    diagnostics?: string[]
  }>
}): AlicizationOrganicMemoryStageReplay {
  return {
    version: 'organic-memory-stage-replay-v1',
    producedAt: input.producedAt,
    stages: input.stages.map(stage => ({
      stage: stage.stage as any,
      summary: sanitizeText(stage.summary, 220),
      latencyMs: stage.latencyMs == null ? null : Math.max(0, stage.latencyMs),
      budgetClass: stage.budgetClass as any,
      inputs: compact(stage.inputs ?? [], 8, 180),
      outputs: compact(stage.outputs ?? [], 8, 180),
      diagnostics: compact(stage.diagnostics ?? [], 8, 200),
    })),
  }
}

export function buildAlicizationMemoryResolutionLedger(input: {
  producedAt: number
  dominantClusterId?: string | null
  dominantClusterSummary?: string | null
  competingClusterId?: string | null
  competingClusterSummary?: string | null
  candidates: AlicizationMemoryResolutionLedger['candidates']
  finalSurfacePolicy?: string | null
  shouldStayInward: boolean
  shouldDelayUntilAfterPayoff: boolean
  stableCoreOnly: boolean
  suppressionTags?: string[]
  closureState: AlicizationMemoryResolutionLedger['closureState']
  surfaceConfidence: number | null
  shouldLabelUncertainty: boolean
  visibleCarryMode: AlicizationMemoryResolutionLedger['visibleCarryMode']
  conflictPressure: AlicizationMemoryResolutionLedger['conflictPressure']
  retrievalQuality: AlicizationMemoryResolutionLedger['retrievalQuality']
  finalRationale?: string | null
}): AlicizationMemoryResolutionLedger {
  const candidates = input.candidates.slice(0, 24)
  return {
    version: 'memory-resolution-ledger-v1',
    producedAt: input.producedAt,
    dominantClusterId: input.dominantClusterId ?? null,
    dominantClusterSummary: sanitizeText(input.dominantClusterSummary, 220) || null,
    competingClusterId: input.competingClusterId ?? null,
    competingClusterSummary: sanitizeText(input.competingClusterSummary, 220) || null,
    candidates,
    selectedCandidates: candidates.filter(item => item.status === 'selected'),
    rejectedCandidates: candidates.filter(item => item.status === 'rejected'),
    finalSurfacePolicy: sanitizeText(input.finalSurfacePolicy, 120) || null,
    shouldStayInward: input.shouldStayInward,
    shouldDelayUntilAfterPayoff: input.shouldDelayUntilAfterPayoff,
    stableCoreOnly: input.stableCoreOnly,
    suppressionTags: compact(input.suppressionTags ?? [], 8, 120),
    closureState: input.closureState,
    surfaceConfidence: Number.isFinite(input.surfaceConfidence) ? Math.max(0, Math.min(1, Number(input.surfaceConfidence))) : null,
    shouldLabelUncertainty: input.shouldLabelUncertainty,
    visibleCarryMode: input.visibleCarryMode,
    conflictPressure: input.conflictPressure,
    retrievalQuality: input.retrievalQuality,
    finalRationale: sanitizeText(input.finalRationale, 220) || null,
  }
}

export function enrichOrganicMemoryPromptContextWithSettlement(input: {
  context: OrganicMemoryPromptContext
  memoryStageReplay: AlicizationOrganicMemoryStageReplay
  memoryResolutionLedger: AlicizationMemoryResolutionLedger
}): OrganicMemoryPromptContext {
  return {
    ...input.context,
    memoryStageReplay: input.memoryStageReplay,
    memoryResolutionLedger: input.memoryResolutionLedger,
  }
}
