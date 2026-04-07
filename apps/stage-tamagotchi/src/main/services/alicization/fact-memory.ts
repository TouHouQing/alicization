import type { AlicizationMemoryFactInput, AlicizationMemoryUpsertTrace } from '../../../shared/eventa'

function sanitizeText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeConfidence(raw: unknown) {
  if (!Number.isFinite(raw))
    return 0
  return Math.max(0, Math.min(1, Number(raw)))
}

function normalizeTraceOrigin(trace?: AlicizationMemoryUpsertTrace | null) {
  if (!trace)
    return ''
  if (trace.origin === 'user-turn' || trace.origin === 'subconscious-proactive' || trace.origin === 'system')
    return trace.origin
  return ''
}

function normalizeTraceTrigger(trace?: AlicizationMemoryUpsertTrace | null) {
  if (!trace)
    return ''
  if (trace.trigger === 'batch' || trace.trigger === 'idle' || trace.trigger === 'force' || trace.trigger === 'manual')
    return trace.trigger
  return ''
}

export function buildAsyncFactMemoryFragments(input: {
  facts: AlicizationMemoryFactInput[]
  trace?: AlicizationMemoryUpsertTrace | null
  maxFacts?: number
}) {
  const maxFacts = Number.isFinite(input.maxFacts)
    ? Math.max(1, Math.floor(Number(input.maxFacts)))
    : 4
  const origin = normalizeTraceOrigin(input.trace)
  const trigger = normalizeTraceTrigger(input.trace)
  const dedupedFactMap = new Map<string, {
    subject: string
    predicate: string
    object: string
    confidence: number
  }>()

  for (const candidate of input.facts) {
    const subject = sanitizeText(candidate.subject, 64).toLowerCase()
    const predicate = sanitizeText(candidate.predicate, 64).toLowerCase()
    const object = sanitizeText(candidate.object, 160)
    if (!subject || !predicate || !object)
      continue

    const key = `${subject.toLowerCase()}|${predicate.toLowerCase()}|${object.toLowerCase()}`
    const confidence = normalizeConfidence(candidate.confidence)
    const previous = dedupedFactMap.get(key)
    if (previous && previous.confidence >= confidence)
      continue

    dedupedFactMap.set(key, {
      subject,
      predicate,
      object,
      confidence,
    })
  }

  const dedupedFacts = [...dedupedFactMap.values()]
  if (dedupedFacts.length === 0)
    return [] as string[]

  return dedupedFacts
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, maxFacts)
    .map((fact) => {
      return [
        `fact_subject:${fact.subject}`,
        `fact_predicate:${fact.predicate}`,
        `fact_object:${fact.object}`,
        `fact_confidence:${fact.confidence.toFixed(2)}`,
        origin ? `fact_origin:${origin}` : '',
        trigger ? `fact_trigger:${trigger}` : '',
      ]
        .filter(Boolean)
        .join(' ')
    })
}
