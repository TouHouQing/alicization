import type { AlicizationMemoryTurnArtifact } from './memory-turn-artifact'

export interface AlicizationMemoryRecallFeedbackSample {
  version: 'memory-recall-feedback-sample-v1'
  sampleId: string
  turnId: string | null
  decisionTraceId: string | null
  expectedMemoryIds: string[]
  retrievedCandidateIds: string[]
  surfacedMemoryIds: string[]
  missedIds: string[]
  falsePositiveIds: string[]
  wrongThreadIds: string[]
  recallAt3: number
  precisionAt3: number
  wrongThreadRate: number
  judgeReason: string | null
  createdAt: number
}

export interface AlicizationMemoryRecallFeedbackSummary {
  version: 'memory-recall-feedback-summary-v1'
  sampleCount: number
  recallAt3: number
  precisionAt3: number
  wrongThreadRate: number
  missedIds: string[]
  falsePositiveIds: string[]
  wrongThreadIds: string[]
  reasonCodes: string[]
}

function normalizeId(raw: unknown, maxChars = 180) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
    : ''
}

function uniqueIds(values: Array<unknown>, maxItems = 64) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeId(value)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function ratio(numerator: number, denominator: number) {
  if (denominator <= 0)
    return 1
  return Number((numerator / denominator).toFixed(2))
}

function overlap(left: string[], right: string[]) {
  const rightSet = new Set(right)
  return left.filter(item => rightSet.has(item))
}

function diff(left: string[], right: string[]) {
  const rightSet = new Set(right)
  return left.filter(item => !rightSet.has(item))
}

export function buildAlicizationMemoryRecallFeedbackSample(input: {
  turnId?: string | null
  decisionTraceId?: string | null
  expectedMemoryIds?: unknown[] | null
  artifact?: AlicizationMemoryTurnArtifact | null
  retrievedCandidateIds?: unknown[] | null
  surfacedMemoryIds?: unknown[] | null
  wrongThreadIds?: unknown[] | null
  judgeReason?: string | null
  now?: number
}): AlicizationMemoryRecallFeedbackSample {
  const artifact = input.artifact ?? null
  const expectedMemoryIds = uniqueIds(input.expectedMemoryIds ?? [])
  const retrievedCandidateIds = uniqueIds([
    ...(input.retrievedCandidateIds ?? []),
    ...(artifact?.candidates.retrievalCandidateIds ?? []),
  ])
  const surfacedMemoryIds = uniqueIds([
    ...(input.surfacedMemoryIds ?? []),
    ...(artifact?.candidates.selectedCandidateIds ?? []),
  ]).slice(0, 16)
  const wrongThreadIds = uniqueIds([
    ...(input.wrongThreadIds ?? []),
    ...(artifact?.competition.wrongThreadCandidateIds ?? []),
  ])

  const expectedHitsInTop3 = overlap(expectedMemoryIds, surfacedMemoryIds.slice(0, 3))
  const surfacedTop3 = surfacedMemoryIds.slice(0, 3)
  const missedIds = diff(expectedMemoryIds, surfacedTop3)
  const falsePositiveIds = diff(surfacedTop3, expectedMemoryIds)
  const createdAt = Number.isFinite(input.now) ? Math.max(0, Number(input.now)) : Date.now()

  return {
    version: 'memory-recall-feedback-sample-v1',
    sampleId: [
      input.decisionTraceId ?? input.turnId ?? 'turn',
      createdAt,
      expectedMemoryIds.join('|') || 'no-gold',
    ].join(':'),
    turnId: input.turnId ?? null,
    decisionTraceId: input.decisionTraceId ?? null,
    expectedMemoryIds,
    retrievedCandidateIds,
    surfacedMemoryIds,
    missedIds,
    falsePositiveIds,
    wrongThreadIds,
    recallAt3: ratio(expectedHitsInTop3.length, expectedMemoryIds.length),
    precisionAt3: ratio(overlap(surfacedTop3, expectedMemoryIds).length, surfacedTop3.length),
    wrongThreadRate: ratio(wrongThreadIds.length, Math.max(1, retrievedCandidateIds.length)),
    judgeReason: normalizeId(input.judgeReason, 260) || null,
    createdAt,
  }
}

export function summarizeAlicizationMemoryRecallFeedback(
  samples: AlicizationMemoryRecallFeedbackSample[],
): AlicizationMemoryRecallFeedbackSummary {
  const normalized = samples.filter(sample => sample.version === 'memory-recall-feedback-sample-v1')
  const sampleCount = normalized.length
  if (sampleCount === 0) {
    return {
      version: 'memory-recall-feedback-summary-v1',
      sampleCount: 0,
      recallAt3: 0,
      precisionAt3: 0,
      wrongThreadRate: 0,
      missedIds: [],
      falsePositiveIds: [],
      wrongThreadIds: [],
      reasonCodes: ['memory-feedback:no-samples'],
    }
  }
  const average = (values: number[]) => Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
  const recallAt3 = average(normalized.map(sample => sample.recallAt3))
  const precisionAt3 = average(normalized.map(sample => sample.precisionAt3))
  const wrongThreadRate = average(normalized.map(sample => sample.wrongThreadRate))
  const missedIds = uniqueIds(normalized.flatMap(sample => sample.missedIds), 32)
  const falsePositiveIds = uniqueIds(normalized.flatMap(sample => sample.falsePositiveIds), 32)
  const wrongThreadIds = uniqueIds(normalized.flatMap(sample => sample.wrongThreadIds), 32)

  return {
    version: 'memory-recall-feedback-summary-v1',
    sampleCount,
    recallAt3,
    precisionAt3,
    wrongThreadRate,
    missedIds,
    falsePositiveIds,
    wrongThreadIds,
    reasonCodes: [
      recallAt3 < 0.9 ? 'memory-feedback:recall-below-final-gate' : null,
      precisionAt3 < 0.86 ? 'memory-feedback:precision-below-final-gate' : null,
      wrongThreadRate > 0 ? 'memory-feedback:wrong-thread-present' : null,
      missedIds.length > 0 ? 'memory-feedback:missed-expected-memory' : null,
      falsePositiveIds.length > 0 ? 'memory-feedback:false-positive-memory' : null,
    ].filter((item): item is string => Boolean(item)),
  }
}

export function createAlicizationMemoryRecallFeedbackRuntime(options: {
  now: () => number
  readSamples: () => Promise<AlicizationMemoryRecallFeedbackSample[]>
  writeSamples: (samples: AlicizationMemoryRecallFeedbackSample[]) => Promise<void>
  maxSamples?: number
}) {
  const maxSamples = Math.max(1, Math.floor(options.maxSamples ?? 512))

  async function recordSample(input: Omit<Parameters<typeof buildAlicizationMemoryRecallFeedbackSample>[0], 'now'>) {
    const sample = buildAlicizationMemoryRecallFeedbackSample({
      ...input,
      now: options.now(),
    })
    const previous = await options.readSamples().catch(() => [])
    const byId = new Map(previous.map(item => [item.sampleId, item]))
    byId.set(sample.sampleId, sample)
    const next = [...byId.values()]
      .sort((left, right) => left.createdAt - right.createdAt)
      .slice(-maxSamples)
    await options.writeSamples(next)
    return sample
  }

  async function getSummary() {
    return summarizeAlicizationMemoryRecallFeedback(await options.readSamples().catch(() => []))
  }

  return {
    recordSample,
    getSummary,
  }
}
