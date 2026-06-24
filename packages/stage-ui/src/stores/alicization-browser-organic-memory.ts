import type {
  AlicizationEpisodicEventRecord,
  AlicizationHostPersonModelSnapshot,
  AlicizationMemoryProvenance,
  AlicizationOrganicMemorySnapshot,
  AlicizationSubconsciousFragment,
  AlicizationSubconsciousFragmentSourceKind,
} from './alicization-bridge'

import {
  buildAlicizationBrowserAffectiveResidueMemory,
  pickDominantAlicizationMemoryProvenance,
} from '@proj-alicization/stage-shared'

export interface BrowserMemoryConsolidationSnapshot {
  id: string
  kind: 'procedural' | 'autobiographical'
  facet?: 'phase' | 'relationship-era' | 'task-era' | 'self-era' | null
  periodKey: string
  periodStartedAt: number
  periodEndedAt: number
  summary: string
  lesson: string | null
  cues: string[]
  confidence: number
  dominantProvenance: AlicizationMemoryProvenance
}

function clamp01(value: number) {
  if (Number.isNaN(value))
    return 0
  return Math.max(0, Math.min(1, value))
}

function sanitizeText(raw: unknown, fallback = '') {
  if (typeof raw !== 'string')
    return fallback
  const normalized = raw.trim().replace(/\s+/g, ' ')
  return normalized || fallback
}

function sanitizeBriefText(raw: unknown, maxChars = 220) {
  return sanitizeText(raw).slice(0, maxChars)
}

function uniqueTexts(values: Array<unknown>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeBriefText(value, 220)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function computeBrowserTrustScore(events: AlicizationEpisodicEventRecord[]) {
  if (events.length === 0)
    return 0.48
  let score = 0.48
  for (const event of events) {
    const shift = event.relationshipShift
    if (!shift)
      continue
    score += Math.max(0, shift.trustDelta) * 0.6
    score += Math.max(0, shift.closenessDelta) * 0.22
    score += Math.max(0, shift.repairDelta) * 0.18
    score -= Math.max(0, shift.misreadDelta) * 0.4
    score -= Math.max(0, shift.burdenDelta) * 0.25
    score -= Math.max(0, -shift.boundaryDelta) * 0.45
  }
  return clamp01(score)
}

export function buildBrowserHostPersonModel(events: AlicizationEpisodicEventRecord[]): AlicizationHostPersonModelSnapshot | null {
  if (events.length === 0)
    return null
  const recent = [...events]
    .sort((left, right) => right.salience - left.salience || right.occurredAt - left.occurredAt)
    .slice(0, 16)
  const trustScore = computeBrowserTrustScore(recent)
  const stage = trustScore < 0.32
    ? 'guarded'
    : trustScore < 0.52
      ? 'cautious-open'
      : trustScore < 0.76
        ? 'warming'
        : 'trusted'

  const routines = uniqueTexts(recent.flatMap((event) => {
    const text = `${event.whereSummary ?? ''} ${event.whatHappened} ${event.tags.join(' ')}`
    return [
      /focused|debug|coding|cursor|runtime|工作|写代码/u.test(text) ? 'Focused work windows usually need space first.' : null,
      /late[- ]?night|夜|熬夜|drain|累/u.test(text) ? 'Late-night windows need softer pace and rest-sensitive care.' : null,
      /execution|callback|cli|codex|结果|执行/u.test(text) ? 'Execution flows land best when proposal and callback stay bounded.' : null,
    ]
  }), 5)
  const sensitivities = uniqueTexts(recent.flatMap((event) => {
    const text = `${event.whatHappened} ${event.whatChanged ?? ''} ${event.relationshipMeaning ?? ''}`
    return [
      /intrusive|pressure|太近|太重|打扰|boundary/u.test(text) ? 'Pressure and over-close timing become intrusive quickly.' : null,
      /robotic|template|机械|机器人|系统/u.test(text) ? 'Template-like speech breaks the sense of a living reply.' : null,
      /busy|focused|累|忙|疲惫/u.test(text) ? 'When the host is busy or tired, interruption cost rises quickly.' : null,
    ]
  }), 6)
  const repairTriggers = uniqueTexts(recent.flatMap((event) => {
    const text = `${event.whatHappened} ${event.relationshipMeaning ?? ''} ${event.lesson ?? ''}`
    return [
      /not this|repair|missed|澄清|修复|不是这个/u.test(text) ? 'When the host says not this, repair the seam before continuing.' : null,
      /robotic|template|机械|机器人/u.test(text) ? 'If the reply feels robotic, replace shell wording with lived continuity.' : null,
      /intrusive|boundary|太近|打扰/u.test(text) ? 'If closeness feels heavy, reopen with lighter presence.' : null,
    ]
  }), 5)
  const recurrentBurdens = uniqueTexts(recent.flatMap((event) => {
    const text = `${event.whereSummary ?? ''} ${event.whatHappened} ${event.whatChanged ?? ''}`
    return [
      /late[- ]?night|夜|熬夜|累/u.test(text) ? 'Late-night fatigue turns small nudges into real burden.' : null,
      /focused|debug|coding|工作|写代码/u.test(text) ? 'Focused work is easy to overload with extra conversational pressure.' : null,
      /callback|execution|结果|执行/u.test(text) && /intrusive|打扰|pressure/u.test(text) ? 'Execution callbacks can feel interruptive when timing is off.' : null,
    ]
  }), 5)

  const preferredClosenessByContext = uniqueTexts(recent.map((event) => {
    const text = `${event.whereSummary ?? ''} ${event.whatHappened} ${event.tags.join(' ')}`
    if (/focused|debug|coding|工作|写代码/u.test(text))
      return 'focused-work: Lighter touch and less interruption pressure.'
    if (/late[- ]?night|夜|熬夜|drain|累/u.test(text))
      return 'late-night: Soft care can come closer, but pacing should stay gentle.'
    if (/execution|callback|cli|codex|执行|结果/u.test(text))
      return 'execution: Keep proposal, action, and callback bounded.'
    return 'general: Stay near, but keep the approach responsive to the host move.'
  }), 4).map((item) => {
    const [context, ...rest] = item.split(':')
    return {
      context: sanitizeText(context),
      preference: sanitizeText(rest.join(':')),
      confidence: 0.72,
    }
  })

  return {
    summary: uniqueTexts([
      routines[0] ? `routine=${routines[0]}` : null,
      sensitivities[0] ? `sensitivity=${sensitivities[0]}` : null,
      repairTriggers[0] ? `repair=${repairTriggers[0]}` : null,
    ], 3).join(' | '),
    routines,
    sensitivities,
    repairTriggers,
    trustLadder: {
      stage,
      score: trustScore,
      rationale: stage === 'guarded'
        ? 'Distance still closes quickly; openings must be earned.'
        : stage === 'cautious-open'
          ? 'There is room, but trust still depends on timing and repair.'
          : stage === 'warming'
            ? 'Warmth can land when continuity stays coherent.'
            : 'Trust is strong enough for more direct warmth when timing stays good.',
    },
    preferredClosenessByContext,
    recurrentBurdens,
    narrative: uniqueTexts([
      ...routines,
      ...sensitivities,
      ...repairTriggers,
      ...recurrentBurdens,
    ], 8),
    updatedAt: Math.max(...recent.map(event => event.updatedAt), Date.now()),
  }
}

export function buildBrowserMemoryConsolidations(events: AlicizationEpisodicEventRecord[]): BrowserMemoryConsolidationSnapshot[] {
  if (events.length === 0)
    return []

  const recent = [...events]
    .sort((left, right) => right.occurredAt - left.occurredAt || right.salience - left.salience)
    .slice(0, 20)
  const latest = recent[0] ?? null
  const relationshipEvents = recent.filter((event) => {
    const text = `${event.relationshipMeaning ?? ''} ${event.lesson ?? ''} ${event.whatChanged ?? ''}`
    return Boolean(event.relationshipShift) || /trust|boundary|repair|靠近|关系|信任|边界|修复/iu.test(text)
  })
  const taskEvents = recent.filter((event) => {
    const text = `${event.sourceKind} ${event.threadAnchor ?? ''} ${event.whatHappened} ${event.lesson ?? ''}`
    return /execution|reply|proposal|result|callback|cli|codex|claude|patch|verify|runtime|执行|回调|补丁|核验/u.test(text)
  })
  const selfEvents = recent.filter((event) => {
    const text = `${event.sourceKind} ${event.whatHappened} ${event.lesson ?? ''}`
    return event.sourceKind === 'dream-reforge' || /self|my own line|自己的线|自我|hold my line|identity/iu.test(text)
  })

  const summaries: BrowserMemoryConsolidationSnapshot[] = []
  if (latest) {
    summaries.push({
      id: `browser-autobio-phase:${latest.id}`,
      kind: 'autobiographical',
      facet: 'phase',
      periodKey: new Date(latest.occurredAt).toISOString().slice(0, 10),
      periodStartedAt: Math.min(...recent.map(event => event.occurredAt)),
      periodEndedAt: Math.max(...recent.map(event => event.occurredAt)),
      summary: sanitizeBriefText(latest.relationshipMeaning || latest.whatChanged || latest.whatHappened, 280),
      lesson: sanitizeBriefText(latest.lesson ?? '', 220) || null,
      cues: uniqueTexts([latest.threadAnchor, latest.whereSummary, latest.whatHappened, latest.relationshipMeaning], 5),
      confidence: clamp01((latest.confidence * 0.62) + (latest.salience * 0.38)),
      dominantProvenance: latest.latestReconsolidation?.provenance ?? latest.provenance,
    })
  }
  if (relationshipEvents.length > 0) {
    const strongest = relationshipEvents[0]!
    summaries.push({
      id: `browser-autobio-relationship:${strongest.id}`,
      kind: 'autobiographical',
      facet: 'relationship-era',
      periodKey: `relationship-${new Date(strongest.occurredAt).toISOString().slice(0, 10)}`,
      periodStartedAt: Math.min(...relationshipEvents.map(event => event.occurredAt)),
      periodEndedAt: Math.max(...relationshipEvents.map(event => event.occurredAt)),
      summary: sanitizeBriefText(strongest.relationshipMeaning || strongest.whatChanged || strongest.whatHappened, 280),
      lesson: sanitizeBriefText(strongest.lesson ?? '', 220) || null,
      cues: uniqueTexts(relationshipEvents.flatMap(event => [event.relationshipMeaning, event.lesson, event.threadAnchor]), 5),
      confidence: clamp01(relationshipEvents.reduce((sum, event) => sum + event.confidence, 0) / relationshipEvents.length),
      dominantProvenance: pickDominantAlicizationMemoryProvenance(relationshipEvents.map(event => event.latestReconsolidation?.provenance ?? event.provenance)),
    })
  }
  if (taskEvents.length > 0) {
    const strongest = taskEvents[0]!
    summaries.push({
      id: `browser-autobio-task:${strongest.id}`,
      kind: 'autobiographical',
      facet: 'task-era',
      periodKey: `task-${sanitizeText(strongest.threadAnchor || strongest.whereSummary || 'general', 'general').slice(0, 48)}`,
      periodStartedAt: Math.min(...taskEvents.map(event => event.occurredAt)),
      periodEndedAt: Math.max(...taskEvents.map(event => event.occurredAt)),
      summary: sanitizeBriefText(strongest.whatHappened || strongest.lesson || strongest.whatChanged || '', 280),
      lesson: sanitizeBriefText(strongest.lesson ?? strongest.whatChanged ?? '', 220) || null,
      cues: uniqueTexts(taskEvents.flatMap(event => [event.threadAnchor, event.whatHappened, event.lesson]), 5),
      confidence: clamp01(taskEvents.reduce((sum, event) => sum + event.confidence, 0) / taskEvents.length),
      dominantProvenance: pickDominantAlicizationMemoryProvenance(taskEvents.map(event => event.latestReconsolidation?.provenance ?? event.provenance)),
    })

    summaries.push({
      id: `browser-procedural:${strongest.id}`,
      kind: 'procedural',
      facet: null,
      periodKey: sanitizeBriefText(strongest.threadAnchor || strongest.whereSummary || 'general', 96) || 'general',
      periodStartedAt: Math.min(...taskEvents.map(event => event.occurredAt)),
      periodEndedAt: Math.max(...taskEvents.map(event => event.occurredAt)),
      summary: sanitizeBriefText(strongest.whatHappened || strongest.lesson || strongest.whatChanged || '', 280),
      lesson: sanitizeBriefText(strongest.lesson ?? '', 220) || null,
      cues: uniqueTexts(taskEvents.flatMap(event => [event.threadAnchor, event.whereSummary, ...event.tags]), 5),
      confidence: clamp01(taskEvents.reduce((sum, event) => sum + event.confidence * 0.6 + event.salience * 0.4, 0) / taskEvents.length),
      dominantProvenance: pickDominantAlicizationMemoryProvenance(taskEvents.map(event => event.latestReconsolidation?.provenance ?? event.provenance)),
    })
  }
  if (selfEvents.length > 0) {
    const strongest = selfEvents[0]!
    summaries.push({
      id: `browser-autobio-self:${strongest.id}`,
      kind: 'autobiographical',
      facet: 'self-era',
      periodKey: `self-${new Date(strongest.occurredAt).toISOString().slice(0, 10)}`,
      periodStartedAt: Math.min(...selfEvents.map(event => event.occurredAt)),
      periodEndedAt: Math.max(...selfEvents.map(event => event.occurredAt)),
      summary: sanitizeBriefText(strongest.whatHappened || strongest.lesson || strongest.whatChanged || '', 280),
      lesson: sanitizeBriefText(strongest.lesson ?? strongest.whatChanged ?? '', 220) || null,
      cues: uniqueTexts(selfEvents.flatMap(event => [event.whatHappened, event.lesson, event.threadAnchor]), 5),
      confidence: clamp01(selfEvents.reduce((sum, event) => sum + event.confidence, 0) / selfEvents.length),
      dominantProvenance: pickDominantAlicizationMemoryProvenance(selfEvents.map(event => event.latestReconsolidation?.provenance ?? event.provenance)),
    })
  }

  return summaries.slice(0, 6)
}

export function buildBrowserOrganicMemorySnapshot(input: {
  now: () => number
  soul: { frontmatter: { host_attitude: string, core_incarnation: string } }
  organicMemory: {
    activeThoughts: AlicizationOrganicMemorySnapshot['activeThoughts']
    subconsciousFragments: AlicizationSubconsciousFragment[]
    lastDreamedAt: number | null
  }
  recentEpisodicEvents: AlicizationEpisodicEventRecord[]
  mapFragmentSourceToProvenance: (sourceKind: AlicizationSubconsciousFragmentSourceKind) => AlicizationMemoryProvenance
}): AlicizationOrganicMemorySnapshot {
  const hostPersonModel = buildBrowserHostPersonModel(input.recentEpisodicEvents)
  const memoryConsolidations = buildBrowserMemoryConsolidations(input.recentEpisodicEvents)
  const affectiveResidue = buildAlicizationBrowserAffectiveResidueMemory({
    now: input.now(),
    hostPersonModel,
    recollectionForeground: null,
    recentEpisodicEvents: input.recentEpisodicEvents,
    selfEvolution: null,
  })

  return {
    hostAttitude: input.soul.frontmatter.host_attitude,
    coreIncarnation: input.soul.frontmatter.core_incarnation,
    activeThoughts: [...input.organicMemory.activeThoughts].sort((left, right) => right.updatedAt - left.updatedAt),
    subconsciousCount: input.organicMemory.subconsciousFragments.length,
    recentSubconsciousFragments: [...input.organicMemory.subconsciousFragments]
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, 12)
      .map(fragment => ({
        ...fragment,
        provenance: fragment.provenance ?? input.mapFragmentSourceToProvenance(fragment.sourceKind),
      })),
    recentEpisodicEvents: input.recentEpisodicEvents,
    hostPersonModel,
    memoryConsolidations,
    recollectionIntent: null,
    recollectionPlan: null,
    recollectionSpeechPlan: null,
    recollectionForeground: null,
    knowledgeEvidence: null,
    selfEvolution: null,
    affectiveResidue,
    recallLatencyPolicy: null,
    derivedMindStateBundle: null,
    memoryStageReplay: null,
    memoryResolutionLedger: null,
    learningExecutionState: null,
    lastDreamedAt: input.organicMemory.lastDreamedAt,
  }
}
