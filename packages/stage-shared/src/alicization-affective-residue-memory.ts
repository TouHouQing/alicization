import type {
  AlicizationAffectiveResidueEntrySnapshot,
  AlicizationAffectiveResidueKind,
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationEpisodicEventRecord,
  AlicizationHostPersonModelSnapshot,
  AlicizationMemoryReflectionRecord,
  AlicizationPersonStateEvolutionSummary,
  AlicizationRelationshipOutcomeRecord,
  AlicizationSelfEvolutionKernelSnapshot,
} from './alicization-transport-contracts'

export interface AlicizationAffectiveResidueRhythmStateInput {
  cadenceMode?: AlicizationAffectiveResidueMemorySnapshot['relationshipCadence']['cadenceMode'] | null
  restMode?: 'rest-protective' | 'low-pressure' | string | null
  moodLabel?: 'afterglow' | string | null
  memoryResonance?: number | null
  summary?: string | null
  rationale?: string[] | null
}

export interface AlicizationAffectiveResidueContinuityStateInput {
  currentRegime?: string | null
  repairPosture?: 'repair-first' | 'measured-repair' | string | null
  energyProfile?: 'rest-sensitive' | string | null
  autonomyPosture?: 'protect-space' | string | null
  trustStage?: 'trusted' | 'warming' | string | null
  closenessPosture?: string | null
  rhythmState?: AlicizationAffectiveResidueRhythmStateInput | null
}

export interface AlicizationAffectiveResidueRelationshipDynamicsInput {
  hostAttitude?: string | null
}

export interface AlicizationAffectiveResidueRecollectionForegroundInput {
  mode?: 'conversation-history' | 'autobiographical-history' | 'relationship-history' | 'execution-procedure' | 'experience-pattern' | string | null
  summary?: string | null
  surfaceSummary?: string | null
}

interface AlicizationAffectivePressureVector {
  afterglow: number
  repair: number
  burden: number
  trust: number
  restProtective: number
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(3))))
}

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueTexts(values: Array<string | null | undefined>, maxItems = 12) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 140)
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function compactTextSignals(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
}

function summarizeOutcomePressure(outcomes: AlicizationRelationshipOutcomeRecord[]) {
  return outcomes.reduce<AlicizationAffectivePressureVector>((acc, outcome) => {
    acc.afterglow += Math.max(0, outcome.closenessDelta) * 0.55 + Math.max(0, outcome.openLoopDelta) * 0.35
    acc.repair += Math.max(0, outcome.repairDelta) * 0.7 + Math.max(0, -outcome.misreadDelta) * 0.42
    acc.burden += Math.max(0, outcome.burdenDelta) * 0.88 + Math.max(0, -outcome.boundaryDelta) * 0.34
    acc.trust += Math.max(0, outcome.trustDelta) * 0.92 + Math.max(0, outcome.closenessDelta) * 0.24
    acc.restProtective += Math.max(0, outcome.burdenDelta) * 0.46 + Math.max(0, outcome.openLoopDelta) * 0.12
    return acc
  }, {
    afterglow: 0,
    repair: 0,
    burden: 0,
    trust: 0,
    restProtective: 0,
  })
}

function summarizeReflectionPressure(reflections: AlicizationMemoryReflectionRecord[]) {
  return reflections.reduce<AlicizationAffectivePressureVector>((acc, reflection) => {
    const weight = reflection.status === 'confirmed'
      ? 1
      : reflection.status === 'pending'
        ? 0.72
        : reflection.status === 'superseded'
          ? 0.32
          : 0.18
    if (reflection.targetScope === 'relationship') {
      acc.afterglow += 0.08 * weight
      acc.trust += 0.18 * weight
    }
    if (reflection.targetScope === 'boundary') {
      acc.repair += 0.12 * weight
      acc.burden += 0.2 * weight
      acc.restProtective += 0.14 * weight
    }
    if (reflection.targetScope === 'truth')
      acc.repair += 0.22 * weight
    return acc
  }, {
    afterglow: 0,
    repair: 0,
    burden: 0,
    trust: 0,
    restProtective: 0,
  })
}

function normalizeTypedSignal(raw: unknown) {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

function typedEpisodeSignals(event: AlicizationEpisodicEventRecord) {
  return new Set([
    ...event.tags,
    ...event.emotionTags,
    ...(event.latestReconsolidation?.emotionTags ?? []),
  ].map(normalizeTypedSignal).filter(Boolean))
}

function hasTypedEpisodeSignal(
  event: AlicizationEpisodicEventRecord,
  accepted: ReadonlySet<string>,
) {
  for (const signal of typedEpisodeSignals(event)) {
    if (accepted.has(signal))
      return true
  }
  return false
}

function buildResidueEntry(input: {
  kind: AlicizationAffectiveResidueKind
  intensity: number
  persistence: number
  confidence: number
  polarity: AlicizationAffectiveResidueEntrySnapshot['polarity']
  releaseMode: AlicizationAffectiveResidueEntrySnapshot['releaseMode']
  summary: string
  sourceSignals: string[]
  lastUpdatedAt: number | null
}): AlicizationAffectiveResidueEntrySnapshot | null {
  const intensity = clamp01(input.intensity)
  if (intensity <= 0.04)
    return null
  return {
    kind: input.kind,
    intensity,
    persistence: clamp01(input.persistence),
    confidence: clamp01(input.confidence),
    polarity: input.polarity,
    releaseMode: input.releaseMode,
    summary: sanitizeText(input.summary, 180),
    sourceSignals: uniqueTexts(input.sourceSignals, 8),
    lastUpdatedAt: input.lastUpdatedAt,
  }
}

function deriveDominantResidueKind(pressure: AlicizationAffectivePressureVector) {
  const sorted: Array<readonly [AlicizationAffectiveResidueKind, number]> = [
    ['afterglow', pressure.afterglow],
    ['repair', pressure.repair],
    ['burden', pressure.burden],
    ['trust', pressure.trust],
    ['rest-protective', pressure.restProtective],
  ]
  sorted.sort((left, right) => right[1] - left[1])

  if (!sorted[0] || sorted[0][1] <= 0)
    return null

  return sorted[0][0]
}

function buildRelationshipCadence(input: {
  continuity: AlicizationAffectiveResidueContinuityStateInput | null
  hostPersonModel: AlicizationHostPersonModelSnapshot | null
  personStateSummary: AlicizationPersonStateEvolutionSummary | null
  pressure: AlicizationAffectivePressureVector
}) {
  const continuity = input.continuity
  const hostPersonModel = input.hostPersonModel
  const personStateSummary = input.personStateSummary
  const { afterglow, burden, repair, restProtective, trust } = input.pressure
  return {
    cadenceMode: continuity?.rhythmState?.cadenceMode
      ?? (repair >= 0.54 || restProtective >= 0.5 || burden >= 0.62 ? 'cooldown' : trust >= 0.56 ? 'warm-hold' : afterglow >= 0.42 ? 'measured-return' : 'ready-return'),
    distancePosture: restProtective >= 0.5 || burden >= 0.56
      ? 'protect-space'
      : repair >= 0.56
        ? 'measured-room'
        : trust >= 0.62
          ? 'warm-near'
          : 'nearby-soft',
    companionshipDensity: clamp01(
      trust * 0.44
      + afterglow * 0.18
      - burden * 0.34
      - restProtective * 0.28,
    ),
    repairRecovery: clamp01(
      repair * 0.62
      + trust * 0.16
      - burden * 0.18,
    ),
    overreachRisk: clamp01(
      burden * 0.52
      + repair * 0.24
      + (continuity?.autonomyPosture === 'protect-space' ? 0.14 : 0)
      - trust * 0.12,
    ),
    fatigueGuard: clamp01(
      restProtective * 0.62
      + burden * 0.24
      + (continuity?.energyProfile === 'rest-sensitive' ? 0.14 : 0),
    ),
    afterglowCarry: clamp01(
      afterglow * 0.68
      + Math.max(0, continuity?.rhythmState?.memoryResonance ?? 0) * 0.18,
    ),
    shouldDelayWarmth: repair >= 0.54 || burden >= 0.58,
    shouldProtectRest: restProtective >= 0.5,
    reasonTags: uniqueTexts([
      `cadence-mode:${continuity?.rhythmState?.cadenceMode ?? 'derived'}`,
      `distance:${continuity?.closenessPosture ?? 'derived'}`,
      continuity?.rhythmState?.restMode ? `rest:${continuity.rhythmState.restMode}` : null,
      continuity?.currentRegime ? `regime:${continuity.currentRegime}` : null,
      hostPersonModel?.trustLadder.stage ? `trust-stage:${hostPersonModel.trustLadder.stage}` : null,
    ], 10),
    summary: sanitizeText(
      personStateSummary?.recentSummaries?.[0]
      ?? personStateSummary?.latestDoctrine
      ?? personStateSummary?.latestTrustMeaning
      ?? personStateSummary?.latestBurdenLine
      ?? '',
      200,
    ),
  } satisfies AlicizationAffectiveResidueMemorySnapshot['relationshipCadence']
}

function buildDominantSummary(dominantResidueKind: AlicizationAffectiveResidueKind | null) {
  return sanitizeText(dominantResidueKind ?? '', 220)
}

export function buildAlicizationAffectiveResidueMemory(input: {
  now: number
  recentRelationshipOutcomes?: AlicizationRelationshipOutcomeRecord[] | null
  recentMemoryReflections?: AlicizationMemoryReflectionRecord[] | null
  personStateEvolutionSummary?: AlicizationPersonStateEvolutionSummary | null
  personalityContinuityState?: AlicizationAffectiveResidueContinuityStateInput | null
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  relationshipDynamics?: AlicizationAffectiveResidueRelationshipDynamicsInput | null
}) {
  const outcomes = input.recentRelationshipOutcomes?.slice(0, 8) ?? []
  const reflections = input.recentMemoryReflections?.slice(0, 8) ?? []
  const continuity = input.personalityContinuityState ?? null
  const personStateSummary = input.personStateEvolutionSummary ?? null
  const hostPersonModel = input.hostPersonModel ?? null
  const relationshipDynamics = input.relationshipDynamics ?? null
  const outcomePressure = summarizeOutcomePressure(outcomes)
  const reflectionPressure = summarizeReflectionPressure(reflections)
  const repairShift = Math.max(0, personStateSummary?.repairShift ?? 0)
  const burdenShift = Math.max(0, personStateSummary?.burdenShift ?? 0)
  const trustShift = Math.max(0, personStateSummary?.trustShift ?? 0)
  const pressure = {
    afterglow: clamp01(
      outcomePressure.afterglow
      + reflectionPressure.afterglow
      + (continuity?.rhythmState?.moodLabel === 'afterglow' ? 0.2 : 0)
      + Math.max(0, continuity?.rhythmState?.memoryResonance ?? 0) * 0.22,
    ),
    repair: clamp01(
      outcomePressure.repair
      + reflectionPressure.repair
      + repairShift * 0.5
      + (continuity?.repairPosture === 'repair-first' ? 0.24 : continuity?.repairPosture === 'measured-repair' ? 0.1 : 0),
    ),
    burden: clamp01(
      outcomePressure.burden
      + reflectionPressure.burden
      + burdenShift * 0.58
      + (continuity?.energyProfile === 'rest-sensitive' ? 0.2 : 0)
      + ((relationshipDynamics?.hostAttitude ?? '').includes('tired') ? 0.08 : 0),
    ),
    trust: clamp01(
      outcomePressure.trust
      + reflectionPressure.trust
      + trustShift * 0.42
      + (continuity?.trustStage === 'trusted' ? 0.16 : continuity?.trustStage === 'warming' ? 0.08 : 0)
      + Math.max(0, hostPersonModel?.trustLadder.score ?? 0) * 0.18,
    ),
    restProtective: clamp01(
      outcomePressure.restProtective
      + reflectionPressure.restProtective
      + (continuity?.rhythmState?.restMode === 'rest-protective' ? 0.36 : continuity?.rhythmState?.restMode === 'low-pressure' ? 0.12 : 0)
      + (continuity?.energyProfile === 'rest-sensitive' ? 0.22 : 0),
    ),
  } satisfies AlicizationAffectivePressureVector

  const relationshipCadence = buildRelationshipCadence({
    continuity,
    hostPersonModel,
    personStateSummary,
    pressure,
  })
  const repairReflection = reflections.find(item =>
    item.targetScope === 'truth' || item.targetScope === 'boundary',
  )
  const burdenReflection = reflections.find(item => item.targetScope === 'boundary')

  const residues = [
    buildResidueEntry({
      kind: 'afterglow',
      intensity: pressure.afterglow,
      persistence: clamp01(pressure.afterglow * 0.74 + Math.max(0, continuity?.rhythmState?.memoryResonance ?? 0) * 0.18),
      confidence: clamp01(0.48 + outcomes.length * 0.04 + (continuity?.rhythmState?.moodLabel === 'afterglow' ? 0.12 : 0)),
      polarity: 'warm',
      releaseMode: relationshipCadence.shouldDelayWarmth ? 'delay-until-open-window' : 'surface-eligible',
      summary: personStateSummary?.recentSummaries?.[0] ?? continuity?.rhythmState?.summary ?? reflections[0]?.summary ?? outcomes[0]?.summary ?? '',
      sourceSignals: compactTextSignals([
        continuity?.rhythmState?.summary ?? null,
        reflections[0]?.summary ?? null,
        outcomes[0]?.summary ?? null,
      ]),
      lastUpdatedAt: input.now,
    }),
    buildResidueEntry({
      kind: 'repair',
      intensity: pressure.repair,
      persistence: clamp01(pressure.repair * 0.82 + repairShift * 0.12),
      confidence: clamp01(0.54 + repairShift * 0.24 + outcomes.length * 0.03),
      polarity: 'protective',
      releaseMode: 'mind-only',
      summary: personStateSummary?.latestDoctrine ?? repairReflection?.lesson ?? outcomes[0]?.summary ?? '',
      sourceSignals: compactTextSignals([
        continuity?.repairPosture ? `repair-posture:${continuity.repairPosture}` : null,
        repairReflection?.lesson ?? null,
        outcomes[0]?.summary ?? null,
      ]),
      lastUpdatedAt: input.now,
    }),
    buildResidueEntry({
      kind: 'burden',
      intensity: pressure.burden,
      persistence: clamp01(pressure.burden * 0.8 + pressure.restProtective * 0.08),
      confidence: clamp01(0.5 + burdenShift * 0.2 + reflections.length * 0.03),
      polarity: 'strained',
      releaseMode: 'protect-rest',
      summary: personStateSummary?.latestBurdenLine ?? hostPersonModel?.recurrentBurdens?.[0] ?? '',
      sourceSignals: compactTextSignals([
        continuity?.energyProfile ? `energy:${continuity.energyProfile}` : null,
        hostPersonModel?.recurrentBurdens?.[0] ?? null,
        burdenReflection?.lesson ?? null,
      ]),
      lastUpdatedAt: input.now,
    }),
    buildResidueEntry({
      kind: 'trust',
      intensity: pressure.trust,
      persistence: clamp01(pressure.trust * 0.84),
      confidence: clamp01(0.52 + Math.min(0.24, Math.max(0, hostPersonModel?.trustLadder.score ?? 0) * 0.26)),
      polarity: 'warm',
      releaseMode: relationshipCadence.shouldDelayWarmth ? 'delay-until-open-window' : 'surface-eligible',
      summary: personStateSummary?.latestTrustMeaning ?? hostPersonModel?.trustLadder.rationale ?? outcomes.find(item => item.trustDelta > 0)?.summary ?? '',
      sourceSignals: compactTextSignals([
        hostPersonModel?.summary ?? null,
        hostPersonModel?.trustLadder.rationale ?? null,
        outcomes.find(item => item.trustDelta > 0)?.summary ?? null,
      ]),
      lastUpdatedAt: input.now,
    }),
    buildResidueEntry({
      kind: 'rest-protective',
      intensity: pressure.restProtective,
      persistence: clamp01(pressure.restProtective * 0.88),
      confidence: clamp01(0.56 + (continuity?.rhythmState?.restMode === 'rest-protective' ? 0.18 : 0)),
      polarity: 'protective',
      releaseMode: 'protect-rest',
      summary: continuity?.rhythmState?.rationale?.[0] ?? continuity?.rhythmState?.summary ?? hostPersonModel?.recurrentBurdens?.[0] ?? '',
      sourceSignals: compactTextSignals([
        continuity?.rhythmState?.summary ?? null,
        continuity?.rhythmState?.rationale?.[0] ?? null,
        hostPersonModel?.recurrentBurdens?.[0] ?? null,
      ]),
      lastUpdatedAt: input.now,
    }),
  ].filter((item): item is AlicizationAffectiveResidueEntrySnapshot => Boolean(item)).sort((left, right) => right.intensity - left.intensity)

  const dominantResidueKind = residues[0]?.kind ?? null

  return {
    version: 'affective-residue-memory-v1',
    updatedAt: input.now,
    residues,
    dominantResidueKind,
    afterglowPressure: pressure.afterglow,
    repairPressure: pressure.repair,
    burdenPressure: pressure.burden,
    trustPressure: pressure.trust,
    restProtectivePressure: pressure.restProtective,
    relationshipCadence,
    sourceSignals: uniqueTexts([
      relationshipCadence.summary,
      personStateSummary?.recentSummaries?.[0] ?? null,
      personStateSummary?.latestDoctrine ?? null,
      continuity?.rhythmState?.summary ?? null,
      hostPersonModel?.summary ?? null,
    ], 12),
    summary: buildDominantSummary(dominantResidueKind),
  } satisfies AlicizationAffectiveResidueMemorySnapshot
}

export function buildAlicizationBrowserAffectiveResidueMemory(input: {
  now: number
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  recollectionForeground?: AlicizationAffectiveResidueRecollectionForegroundInput | null
  recentEpisodicEvents?: AlicizationEpisodicEventRecord[] | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
}) {
  const hostPersonModel = input.hostPersonModel ?? null
  const recollectionForeground = input.recollectionForeground ?? null
  const selfEvolution = input.selfEvolution ?? null
  const recentEpisodicEvents = input.recentEpisodicEvents?.slice(0, 8) ?? []
  const lateNightSignals = new Set([
    'deep-night',
    'fatigue',
    'late-night',
    'late night',
    'rest',
    'rest-protective',
    'tired',
    '休息',
    '深夜',
    '疲惫',
  ])
  const repairSignals = new Set([
    'clarification',
    'reground',
    'repair',
    'repair-first',
    '修复',
    '澄清',
  ])
  const warmSignals = new Set([
    'afterglow',
    'care',
    'cared-for',
    'trust',
    'warm',
    '余温',
    '温暖',
  ])
  const lateNightCount = recentEpisodicEvents.filter(event =>
    hasTypedEpisodeSignal(event, lateNightSignals),
  ).length
  const repairCount = recentEpisodicEvents.filter(event =>
    hasTypedEpisodeSignal(event, repairSignals)
    || (event.relationshipShift?.repairDelta ?? 0) > 0.04
    || (event.relationshipShift?.misreadDelta ?? 0) < -0.04,
  ).length
  const warmCount = recentEpisodicEvents.filter(event =>
    hasTypedEpisodeSignal(event, warmSignals)
    || (event.relationshipShift?.closenessDelta ?? 0) > 0.04
    || (event.relationshipShift?.trustDelta ?? 0) > 0.04,
  ).length
  const burdenSignals = hostPersonModel?.recurrentBurdens ?? []
  const trustScore = clamp01(hostPersonModel?.trustLadder.score ?? 0)
  const pressure = {
    afterglow: clamp01((warmCount * 0.14) + (recollectionForeground?.mode === 'relationship-history' ? 0.12 : 0)),
    repair: clamp01((repairCount * 0.18) + (selfEvolution?.nextLearningAction === 'verify' ? 0.16 : 0)),
    burden: clamp01((burdenSignals.length * 0.18) + (lateNightCount * 0.08)),
    trust: clamp01((trustScore * 0.72) + (warmCount * 0.06)),
    restProtective: clamp01((lateNightCount * 0.16) + (burdenSignals.length > 0 ? 0.12 : 0)),
  } satisfies AlicizationAffectivePressureVector

  const relationshipCadence = buildRelationshipCadence({
    continuity: null,
    hostPersonModel,
    personStateSummary: null,
    pressure,
  })

  const residues = [
    buildResidueEntry({
      kind: 'afterglow',
      intensity: pressure.afterglow,
      persistence: clamp01(pressure.afterglow * 0.72),
      confidence: clamp01(0.42 + warmCount * 0.08),
      polarity: 'warm',
      releaseMode: relationshipCadence.shouldDelayWarmth ? 'delay-until-open-window' : 'surface-eligible',
      summary: recollectionForeground?.summary ?? recentEpisodicEvents[0]?.relationshipMeaning ?? '',
      sourceSignals: compactTextSignals([
        recollectionForeground?.summary ?? null,
        recentEpisodicEvents[0]?.relationshipMeaning ?? null,
      ]),
      lastUpdatedAt: input.now,
    }),
    buildResidueEntry({
      kind: 'repair',
      intensity: pressure.repair,
      persistence: clamp01(pressure.repair * 0.78),
      confidence: clamp01(0.44 + repairCount * 0.08),
      polarity: 'protective',
      releaseMode: 'mind-only',
      summary: selfEvolution?.relationshipDoctrine ?? selfEvolution?.summary ?? recentEpisodicEvents[0]?.lesson ?? '',
      sourceSignals: compactTextSignals([
        selfEvolution?.summary ?? null,
        recentEpisodicEvents[0]?.lesson ?? null,
      ]),
      lastUpdatedAt: input.now,
    }),
    buildResidueEntry({
      kind: 'burden',
      intensity: pressure.burden,
      persistence: clamp01(pressure.burden * 0.84),
      confidence: clamp01(0.48 + burdenSignals.length * 0.06),
      polarity: 'strained',
      releaseMode: 'protect-rest',
      summary: burdenSignals[0] ?? '',
      sourceSignals: burdenSignals.slice(0, 2),
      lastUpdatedAt: input.now,
    }),
    buildResidueEntry({
      kind: 'trust',
      intensity: pressure.trust,
      persistence: clamp01(pressure.trust * 0.82),
      confidence: clamp01(0.48 + trustScore * 0.22),
      polarity: 'warm',
      releaseMode: relationshipCadence.shouldDelayWarmth ? 'delay-until-open-window' : 'surface-eligible',
      summary: hostPersonModel?.trustLadder.rationale ?? hostPersonModel?.summary ?? '',
      sourceSignals: compactTextSignals([
        hostPersonModel?.summary ?? null,
        hostPersonModel?.trustLadder.rationale ?? null,
      ]),
      lastUpdatedAt: input.now,
    }),
    buildResidueEntry({
      kind: 'rest-protective',
      intensity: pressure.restProtective,
      persistence: clamp01(pressure.restProtective * 0.88),
      confidence: clamp01(0.52 + lateNightCount * 0.08),
      polarity: 'protective',
      releaseMode: 'protect-rest',
      summary: burdenSignals[0] ?? recentEpisodicEvents[0]?.whatHappened ?? '',
      sourceSignals: compactTextSignals([
        burdenSignals[0] ?? null,
        recentEpisodicEvents[0]?.whatHappened ?? null,
      ]),
      lastUpdatedAt: input.now,
    }),
  ].filter((item): item is AlicizationAffectiveResidueEntrySnapshot => Boolean(item)).sort((left, right) => right.intensity - left.intensity)

  const dominantResidueKind = residues[0]?.kind ?? deriveDominantResidueKind(pressure)

  return {
    version: 'affective-residue-memory-v1',
    updatedAt: input.now,
    residues,
    dominantResidueKind,
    afterglowPressure: pressure.afterglow,
    repairPressure: pressure.repair,
    burdenPressure: pressure.burden,
    trustPressure: pressure.trust,
    restProtectivePressure: pressure.restProtective,
    relationshipCadence,
    sourceSignals: uniqueTexts([
      hostPersonModel?.summary ?? null,
      recollectionForeground?.summary ?? null,
      selfEvolution?.summary ?? null,
      relationshipCadence.summary,
    ], 12),
    summary: buildDominantSummary(dominantResidueKind),
  } satisfies AlicizationAffectiveResidueMemorySnapshot
}
