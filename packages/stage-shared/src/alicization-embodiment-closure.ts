const ALICIZATION_EMBODIMENT_FACT_LANES = ['body', 'face', 'motion', 'lipsync', 'voice'] as const

type AlicizationEmbodimentFactLane = typeof ALICIZATION_EMBODIMENT_FACT_LANES[number]

const STRUCTURED_ACTIVE_LANE_KEYS = [
  'active_lanes',
  'carrying_lanes',
  'embodiment_lanes',
  'matched_drivers',
  'authority_matched_drivers',
] as const

const STRUCTURED_PENDING_LANE_KEYS = [
  'missing_lanes',
  'pending_lanes',
] as const

const STRUCTURED_EVIDENCE_VALUES = [
  'full-cross-modal-lock',
  'long-horizon-emotion-memory',
  'low-pressure-inward-carry',
  'runtime-lane-authority',
] as const

function normalizeClosureText(raw: unknown) {
  if (typeof raw !== 'string')
    return ''

  return raw.trim().replace(/\s+/g, ' ')
}

function splitStructuredSegments(source: string) {
  return source
    .split(/\s*\|\s*/u)
    .map(segment => segment.trim())
    .filter(Boolean)
}

function readStructuredField(source: string, key: string) {
  const normalizedKey = key.toLowerCase()
  for (const segment of splitStructuredSegments(source)) {
    const separatorIndex = segment.indexOf('=')
    if (separatorIndex <= 0)
      continue
    const field = segment.slice(0, separatorIndex).trim()
    if (!/^[a-z][\w-]*$/iu.test(field) || field.toLowerCase() !== normalizedKey)
      continue
    return segment.slice(separatorIndex + 1).trim()
  }
  return ''
}

function readStructuredFields(sources: string[], keys: readonly string[]) {
  const values: string[] = []
  for (const source of sources) {
    for (const key of keys) {
      const value = readStructuredField(source, key)
      if (value)
        values.push(value)
    }
  }
  return values
}

function parseLaneList(raw: string) {
  const lanes: AlicizationEmbodimentFactLane[] = []
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/\bonly\b/gu, '')
    .replace(/-only\b/gu, '')
  for (const part of normalized.split(/[+,/;，、\s]+/u)) {
    const lane = part.trim()
    if (!ALICIZATION_EMBODIMENT_FACT_LANES.includes(lane as AlicizationEmbodimentFactLane))
      continue
    if (!lanes.includes(lane as AlicizationEmbodimentFactLane))
      lanes.push(lane as AlicizationEmbodimentFactLane)
  }
  return lanes
}

function parseStructuredLanes(values: string[]) {
  const lanes: AlicizationEmbodimentFactLane[] = []
  for (const value of values) {
    for (const lane of parseLaneList(value)) {
      if (!lanes.includes(lane))
        lanes.push(lane)
    }
  }
  return lanes
}

function readStructuredEvidence(sources: string[], hasFullLock: boolean) {
  const evidence = new Set<typeof STRUCTURED_EVIDENCE_VALUES[number]>()
  if (hasFullLock)
    evidence.add('full-cross-modal-lock')

  for (const value of readStructuredFields(sources, ['evidence', 'closure_evidence'])) {
    for (const rawPart of value.split(/[+,/;，、\s]+/u)) {
      const part = rawPart.trim().toLowerCase()
      if (STRUCTURED_EVIDENCE_VALUES.includes(part as typeof STRUCTURED_EVIDENCE_VALUES[number]))
        evidence.add(part as typeof STRUCTURED_EVIDENCE_VALUES[number])
    }
  }

  return [...evidence]
}

function sourceHasCanonicalFullLock(source: string) {
  const authority = readStructuredField(source, 'authority').toLowerCase()
  const segment = readStructuredField(source, 'segment').toLowerCase()
  const hasOpenSegment = splitStructuredSegments(source)
    .some(part => /^segment\s*=\s*open$/iu.test(part))
  return authority === 'body+face+motion+lipsync+voice'
    && segment === 'locked'
    && !hasOpenSegment
}

function hasContradictoryStructuredPartialFact(sources: string[]) {
  return readStructuredFields(sources, STRUCTURED_PENDING_LANE_KEYS).length > 0
    || readStructuredFields(sources, STRUCTURED_ACTIVE_LANE_KEYS)
      .some(value => parseLaneList(value).length > 0 && parseLaneList(value).length < ALICIZATION_EMBODIMENT_FACT_LANES.length)
}

function readStructuredClosureSources(input: {
  authoritySummary?: string | null
  currentBodyState?: string | null
}) {
  return [
    normalizeClosureText(input.authoritySummary),
    normalizeClosureText(input.currentBodyState),
  ].filter(Boolean)
}

function buildAlicizationStructuredEmbodimentClosureFacts(input: {
  authoritySummary?: string | null
  currentBodyState?: string | null
  perspective: 'headline' | 'reminder'
}) {
  const sources = readStructuredClosureSources(input)
  if (sources.length === 0)
    return ''

  const hasFullLock = sources.some(sourceHasCanonicalFullLock)
    && !hasContradictoryStructuredPartialFact(sources)
  const activeLanes = hasFullLock
    ? [...ALICIZATION_EMBODIMENT_FACT_LANES]
    : parseStructuredLanes(readStructuredFields(sources, STRUCTURED_ACTIVE_LANE_KEYS))

  if (activeLanes.length === 0)
    return ''

  const explicitPendingLanes = parseStructuredLanes(readStructuredFields(sources, STRUCTURED_PENDING_LANE_KEYS))
  const pendingLanes = hasFullLock
    ? []
    : explicitPendingLanes.length > 0
      ? explicitPendingLanes
      : ALICIZATION_EMBODIMENT_FACT_LANES.filter(laneName => !activeLanes.includes(laneName))
  const evidence = readStructuredEvidence(sources, hasFullLock)

  return [
    `Active embodiment lanes: ${activeLanes.join(', ')}.`,
    `Status: ${hasFullLock ? 'closed' : 'partial'}.`,
    pendingLanes.length ? `Pending lanes: ${pendingLanes.join(', ')}.` : '',
    evidence.length ? `Evidence: ${evidence.join(', ')}.` : '',
  ].filter(Boolean).join(' | ')
}

export function describeAlicizationEmbodimentClosureReminder(input: {
  authoritySummary?: string | null
  currentBodyState?: string | null
}) {
  return buildAlicizationStructuredEmbodimentClosureFacts({
    ...input,
    perspective: 'reminder',
  })
}

export function describeAlicizationEmbodimentClosureHeadline(input: {
  authoritySummary?: string | null
  currentBodyState?: string | null
}) {
  return buildAlicizationStructuredEmbodimentClosureFacts({
    ...input,
    perspective: 'headline',
  })
}

export function describeAlicizationProjectClosureBriefing(input: {
  identity?: string | null
  currentPhase?: string | null
  primaryOpenLoop?: string | null
}) {
  if (!input.identity && !input.currentPhase && !input.primaryOpenLoop)
    return ''

  return [
    input.identity ? `Identity: ${input.identity}.` : '',
    input.currentPhase ? `Phase: ${input.currentPhase}.` : '',
    input.primaryOpenLoop ? `Open loop: ${input.primaryOpenLoop}.` : '',
  ].filter(Boolean).join(' | ')
}

export function describeAlicizationProjectNextClosure(input: {
  nextClosureTarget?: string | null
}) {
  const nextClosureTarget = typeof input.nextClosureTarget === 'string'
    ? input.nextClosureTarget.trim()
    : ''

  if (!nextClosureTarget)
    return ''

  return `Next closure: ${nextClosureTarget}.`
}
