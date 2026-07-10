import type { AlicizationEpisodicEventRecord, AlicizationMemoryProvenance } from '../../../shared/eventa'

import {
  pickDominantAlicizationMemoryProvenance,
  shouldAlicizationMemoryProvenanceEnterLongTermConsolidation,
} from '@proj-alicization/stage-shared'

import { buildProceduralMemoryAbstractions } from './memory-procedural-abstraction'
import {
  scoreSemanticGraphWalk,
  scoreSemanticRecall,
} from './memory-semantic-retrieval'
import {
  deriveConsolidationMemoryTier,
  scoreMemoryTierReachability,
} from './memory-tiering'

export interface AlicizationMemoryConsolidationRecord {
  id: string
  kind: 'daily' | 'weekly' | 'procedural' | 'autobiographical'
  facet?: 'phase' | 'relationship-era' | 'task-era' | 'self-era' | null
  periodKey: string
  periodStartedAt: number
  periodEndedAt: number
  summary: string
  lesson: string | null
  cues: string[]
  confidence: number
  dominantProvenance: AlicizationMemoryProvenance
  derivedEventIds: string[]
  updatedAt: number
  memoryTier?: 'hot' | 'warm' | 'cold' | null
  metadata?: Record<string, unknown> | null
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 6) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value)
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

function lowerText(...values: Array<string | null | undefined>) {
  return values.map(value => sanitizeText(value, 320)).filter(Boolean).join(' ').toLowerCase()
}

function sanitizeHumanlikeCarryMetadataText(raw: unknown, maxChars = 220) {
  return sanitizeText(raw, maxChars)
    .replace(/same living line/giu, 'relationship continuity line')
    .replace(/same[- ]?her/giu, 'relationship-continuity')
    .replace(/one continuous her/giu, 'continuous self-context')
    .trim()
}

const samePersonContinuityPattern = /same[- ]?person|same[- ]?her|same living line|continuous digital life|tool shell|generic shell|同一个她|同一条线|数字生命|工具壳/u
const progressPressurePattern = /progress pressure|status recap|status report|generic recap|催进度|催状态|状态汇报/u
const progressPressureNegationPattern = /not a status report|not .*status recap|不是状态汇报|不是催进度|不是催状态/u
const continuityWorryPattern = /worr|afraid|drift|split|断线|滑成|担心/u
const correctedMeaningPattern = /corrected|host corrected|纠正|更正|corrected meaning|first interpretation/u
const tentativeRecallPattern = /tentative|not sure|uncertain|maybe|might|seems|不完全确定|似乎|也许/u
const phaseOneDigitalLifePattern = /phase[- ]?1|local digital life|digital life|数字生命/u
const executionCallbackPattern = /execution callback|callback|回调/u
const unfinishedClosurePattern = /unfinished|open loop|closure|still open|same living line|未完成|闭环|还缺/u
const lowerPressurePattern = /lower-pressure|lower pressure|低压|轻一点|measured-return|leave more room/u
const slowerPacingPattern = /slower pacing|slower|慢一点|更慢/u
const stableGazePattern = /stable gaze|gaze stable|steady gaze|视线更稳|视线稳定/u
const metabolismPattern = /downrank|merge|forget|superseded|older status shell|temporary noise|stale emotional wobble/u
const hostEmotionLabelPattern = /host(?: affect|[- ]emotion)[=:]\s*([a-z-]+)/giu
const selfEmotionLabelPattern = /self(?: affect|[- ]emotion)[=:]\s*([a-z-]+)/giu
const embodimentRecallStrengthPattern = /embodiment(?:[- ]recall)?(?:[=:]\s*| stayed )([a-z-]+)/giu
const embodimentRiskPattern = /(?:embodiment-risk=|modality risk )([a-z-]+)/giu

function collectEventTexts(event: AlicizationEpisodicEventRecord) {
  return [
    event.threadAnchor,
    event.whereSummary,
    event.whatHappened,
    event.felt,
    event.whatChanged,
    event.relationshipMeaning,
    event.lesson,
    event.sourceSummary,
    event.latestReconsolidation?.reason ?? null,
    event.latestReconsolidation?.relationshipMeaning ?? null,
    event.latestReconsolidation?.lesson ?? null,
    ...event.emotionTags,
    ...(event.latestReconsolidation?.emotionTags ?? []),
    ...event.tags,
  ]
}

function collectPatternMatches(
  texts: Array<string | null | undefined>,
  pattern: RegExp,
  maxItems = 4,
) {
  const result: string[] = []
  for (const rawText of texts) {
    const text = sanitizeText(rawText, 320)
    if (!text)
      continue
    pattern.lastIndex = 0
    for (const match of text.matchAll(pattern)) {
      const value = sanitizeText(match[1], 80).toLowerCase()
      if (!value || result.includes(value))
        continue
      result.push(value)
      if (result.length >= maxItems)
        return result
    }
  }
  return result
}

function extractEmbodimentKeyValue(text: string, key: string) {
  const match = new RegExp(`(?:^|\\s)${key}=([^\\s]+)`, 'iu').exec(text)
  return sanitizeText(match?.[1], 48).toLowerCase()
}

function escapeStructuredCarryKey(key: string) {
  return key.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function collectStructuredCarryValues(
  texts: Array<string | null | undefined>,
  key: string,
  maxItems = 4,
  maxChars = 220,
) {
  const result: string[] = []
  const pattern = new RegExp(`(?:^|\\s*\\|\\s*)${escapeStructuredCarryKey(key)}=([^|]+)`, 'giu')

  for (const rawText of texts) {
    const text = sanitizeText(rawText, 320)
    if (!text)
      continue
    pattern.lastIndex = 0
    for (const match of text.matchAll(pattern)) {
      const value = sanitizeText(match[1], maxChars)
      if (!value || result.some(item => item.toLowerCase() === value.toLowerCase()))
        continue
      result.push(value)
      if (result.length >= maxItems)
        return result
    }
  }

  return result
}

function collectStructuredCarryList(
  texts: Array<string | null | undefined>,
  key: string,
  maxItems = 8,
  maxChars = 96,
) {
  return uniqueList(
    collectStructuredCarryValues(texts, key, maxItems, 320).flatMap((value) => {
      return value
        .split(',')
        .map(item => sanitizeText(item, maxChars).toLowerCase() || null)
    }),
    maxItems,
  )
}

function buildStructuredMetabolismPolicyMetadata(
  events: AlicizationEpisodicEventRecord[],
  textParts: Array<string | null | undefined>,
) {
  const downrankMemoryIds = collectStructuredCarryList(textParts, 'downrank', 8)
  const mergeMemoryIds = collectStructuredCarryList(textParts, 'merge', 8)
  const forgetMemoryIds = collectStructuredCarryList(textParts, 'forget', 8)
  const structuredReasons = uniqueList(
    collectStructuredCarryValues(textParts, 'metabolism', 4, 320).flatMap((value) => {
      return value
        .split(/\s*;\s*/u)
        .map(item => sanitizeText(item, 220) || null)
    }),
    6,
  )
  const reconsolidationReasons = uniqueList(events.map((event) => {
    const reason = sanitizeText(event.latestReconsolidation?.reason, 220)
    return metabolismPattern.test(reason) ? reason : null
  }), 3)
  const reasons = uniqueList([
    ...structuredReasons,
    ...reconsolidationReasons,
    downrankMemoryIds.length > 0 ? 'Downrank low-value, generic, or superseded summaries.' : null,
    mergeMemoryIds.length > 0 ? 'Merge repeated embodiment traces or same-thread continuity echoes into the stronger same-thread memory.' : null,
    forgetMemoryIds.length > 0 ? 'Forget low-salience temporary noise or stale emotional wobble once it no longer explains behavior.' : null,
  ], 6)

  if (
    downrankMemoryIds.length === 0
    && mergeMemoryIds.length === 0
    && forgetMemoryIds.length === 0
    && reasons.length === 0
  ) {
    return null
  }

  return {
    downrankMemoryIds,
    mergeMemoryIds,
    forgetMemoryIds,
    reasons,
  } satisfies Record<string, unknown>
}

function normalizeEmbodimentExpressionValue(
  key: 'face' | 'gaze' | 'blink' | 'voice' | 'pause' | 'lipsync' | 'pacing',
  raw: string,
) {
  const normalized = sanitizeText(raw, 48).toLowerCase()
  if (!normalized)
    return ''

  switch (key) {
    case 'face':
      if (/^steady(?:-s(?:o(?:ft?)?)?)?$/u.test(normalized))
        return 'steady-soft'
      if (/^neutral(?:-s(?:o(?:ft?)?)?)?$/u.test(normalized))
        return 'neutral-soft'
      return normalized
    case 'gaze':
      if (/^soft(?:en?)?$/u.test(normalized))
        return 'soft'
      if (/^st(?:a(?:b(?:le?)?)?|ead(?:y|ier)?)$/u.test(normalized))
        return 'stable'
      if (/^dr(?:i(?:ft?)?)?$/u.test(normalized))
        return 'drift'
      return normalized
    case 'blink':
      if (/^sl(?:o(?:w(?:er?)?)?)?$/u.test(normalized) || /^ling(?:er?)?$/u.test(normalized))
        return 'slower'
      if (/^nat(?:u(?:r(?:al?)?)?)?$/u.test(normalized))
        return 'natural'
      return normalized
    case 'voice':
      if (/^lower(?:-p(?:r(?:e(?:s(?:s(?:u(?:re?)?)?)?)?)?)?)?$/u.test(normalized))
        return 'lower-pressure'
      if (/^even$/u.test(normalized))
        return 'even'
      return normalized
    case 'pause':
      if (/^long(?:er?)?$/u.test(normalized))
        return 'longer'
      if (/^nat(?:u(?:r(?:al?)?)?)?$/u.test(normalized))
        return 'natural'
      return normalized
    case 'lipsync':
      if (/^restr(?:a(?:i(?:n(?:ed?)?)?)?)?$/u.test(normalized))
        return 'restrained'
      if (/^match(?:ed?)?$/u.test(normalized))
        return 'matched'
      return normalized
    case 'pacing':
      if (/^sl(?:o(?:w(?:er?)?)?)?$/u.test(normalized))
        return 'slower'
      if (/^nat(?:u(?:r(?:al?)?)?)?$/u.test(normalized))
        return 'natural'
      return normalized
  }
}

function buildEmbodimentExpressionMetadata(textParts: Array<string | null | undefined>) {
  const combined = lowerText(...textParts)
  if (!combined)
    return null

  const face = normalizeEmbodimentExpressionValue('face', extractEmbodimentKeyValue(combined, 'face'))
    || (/steady[- ]soft|steady soft/u.test(combined) ? 'steady-soft' : /neutral[- ]soft|neutral soft/u.test(combined) ? 'neutral-soft' : '')
  const gaze = normalizeEmbodimentExpressionValue('gaze', extractEmbodimentKeyValue(combined, 'gaze'))
    || (stableGazePattern.test(combined) ? 'stable' : /soft gaze|gaze soft|视线放软|目光放软/u.test(combined) ? 'soft' : '')
  const blink = normalizeEmbodimentExpressionValue('blink', extractEmbodimentKeyValue(combined, 'blink'))
    || (/slower blink|blink slower|linger blink|blink linger|眨眼更慢|眨眼放慢/u.test(combined) ? 'slower' : /natural blink/u.test(combined) ? 'natural' : '')
  const voice = normalizeEmbodimentExpressionValue('voice', extractEmbodimentKeyValue(combined, 'voice'))
    || (lowerPressurePattern.test(combined) ? 'lower-pressure' : /even voice|voice even/u.test(combined) ? 'even' : '')
  const pause = normalizeEmbodimentExpressionValue('pause', extractEmbodimentKeyValue(combined, 'pause'))
    || (/longer pause|pause longer|停顿更长|停顿拉长/u.test(combined) ? 'longer' : /natural pause/u.test(combined) ? 'natural' : '')
  const lipsync = normalizeEmbodimentExpressionValue('lipsync', extractEmbodimentKeyValue(combined, 'lipsync'))
    || (/restrained lipsync|lipsync restrained|restrained lip sync|lip sync restrained|口型更克制/u.test(combined) ? 'restrained' : /matched lipsync|lipsync matched|matched lip sync|lip sync matched/u.test(combined) ? 'matched' : '')
  const pacing = normalizeEmbodimentExpressionValue('pacing', extractEmbodimentKeyValue(combined, 'pacing'))
    || (slowerPacingPattern.test(combined) || /reply should slow down|reply slower|放慢|慢下来|放缓/u.test(combined) ? 'slower' : /natural pacing|pacing natural/u.test(combined) ? 'natural' : '')

  if (!face && !gaze && !blink && !voice && !pause && !lipsync && !pacing)
    return null

  return {
    face,
    gaze,
    blink,
    voice,
    pause,
    lipsync,
    pacing,
  } satisfies Record<string, string>
}

function inferRelationshipPrimaryIntent(text: string) {
  const samePerson = samePersonContinuityPattern.test(text)
  const continuityWorry = continuityWorryPattern.test(text)
  const progressPressure = progressPressurePattern.test(text) && !progressPressureNegationPattern.test(text)
  if (progressPressure && (samePerson || continuityWorry))
    return 'mixed'
  if (samePerson)
    return 'same-person-test'
  if (continuityWorry)
    return 'continuity-worry'
  if (progressPressure)
    return 'progress-pressure'
  return 'ordinary-relationship'
}

function buildHumanlikeCarryMetadata(events: AlicizationEpisodicEventRecord[]) {
  const textParts = events.flatMap(collectEventTexts)
  const combined = lowerText(...textParts)
  if (!combined)
    return null

  const structuredRelationshipIntent = sanitizeText(
    collectStructuredCarryValues(textParts, 'relationship-intent', 1, 80)[0],
    80,
  ).toLowerCase()
  const structuredRecallCertainty = sanitizeText(
    collectStructuredCarryValues(textParts, 'recall-certainty', 1, 48)[0],
    48,
  ).toLowerCase()
  const relationshipPrimaryIntent = structuredRelationshipIntent || inferRelationshipPrimaryIntent(combined)
  const emotionalResidueTags = uniqueList([
    ...events.flatMap(event => [
      ...event.emotionTags,
      ...(event.latestReconsolidation?.emotionTags ?? []),
    ]),
    ...collectStructuredCarryList(textParts, 'emotional-residue', 8, 64),
  ], 8)
  const embodimentExpression = buildEmbodimentExpressionMetadata(textParts)
  const embodimentCadenceParts = uniqueList([
    embodimentExpression?.voice === 'lower-pressure' || lowerPressurePattern.test(combined) ? 'lower-pressure voice' : null,
    embodimentExpression?.pacing === 'slower' || slowerPacingPattern.test(combined) ? 'slower pacing' : null,
    embodimentExpression?.gaze === 'stable' || stableGazePattern.test(combined) ? 'stable gaze' : null,
  ], 4)
  const metabolismPolicy = buildStructuredMetabolismPolicyMetadata(events, textParts)
  const metabolismSummary = collectStructuredCarryValues(textParts, 'metabolism', 1, 320)[0]
    || uniqueList(events.map((event) => {
      const reason = sanitizeText(event.latestReconsolidation?.reason, 220)
      return metabolismPattern.test(reason) ? reason : null
    }), 1)[0]
    || metabolismPolicy?.reasons.join(' ')
    || (correctedMeaningPattern.test(combined) && samePersonContinuityPattern.test(combined)
      ? 'Downrank the older status shell and keep the corrected same-person continuity meaning active.'
      : null)
  const stablePreferenceHint = collectStructuredCarryValues(textParts, 'stable-preference', 2, 220).join(' ')
    || uniqueList(textParts.flatMap((text) => {
      const normalized = sanitizeText(text, 320)
      if (!normalized)
        return []
      return normalized.match(/Prefer [^.?!]+[.?!]?/giu) ?? []
    }), 2).join(' ')
    || null
  const autobiographicalDelta = uniqueList([
    ...events.map(event => sanitizeHumanlikeCarryMetadataText(event.latestReconsolidation?.lesson, 220) || null),
    ...events.map(event => sanitizeHumanlikeCarryMetadataText(event.lesson, 220) || null),
    correctedMeaningPattern.test(combined) && samePersonContinuityPattern.test(combined)
      ? 'I learned to carry corrected same-person continuity on a lower-pressure relationship continuity line instead of defending the first interpretation.'
      : null,
  ], 1)[0] ?? null
  const hostEmotionLabels = collectPatternMatches(textParts, hostEmotionLabelPattern, 4)
  const selfEmotionLabels = collectPatternMatches(textParts, selfEmotionLabelPattern, 4)
  const embodimentRecallStrength = collectPatternMatches(textParts, embodimentRecallStrengthPattern, 1)[0] ?? null
  const embodimentRisk = collectPatternMatches(textParts, embodimentRiskPattern, 1)[0] ?? null

  return {
    relationshipPrimaryIntent,
    relationshipSignals: uniqueList([
      samePersonContinuityPattern.test(combined) ? 'same-person-continuity' : null,
      continuityWorryPattern.test(combined) ? 'continuity-worry' : null,
      progressPressurePattern.test(combined) && !progressPressureNegationPattern.test(combined) ? 'progress-pressure' : null,
      correctedMeaningPattern.test(combined) ? 'host-corrected-meaning' : null,
    ], 6),
    recallCertainty:
      structuredRecallCertainty === 'corrected'
      || structuredRecallCertainty === 'tentative'
      || structuredRecallCertainty === 'steady'
        ? structuredRecallCertainty
        : correctedMeaningPattern.test(combined)
          ? 'corrected'
          : tentativeRecallPattern.test(combined)
            ? 'tentative'
            : 'steady',
    emotionalResidueTags,
    embodimentSummary: uniqueList(events.flatMap(event => [
      event.relationshipMeaning,
      event.whatChanged,
      event.latestReconsolidation?.relationshipMeaning ?? null,
    ]), 2).join(' '),
    embodimentCadence: embodimentCadenceParts.join(', ') || null,
    ...(embodimentExpression ? { embodimentExpression } : {}),
    affectivePerspective: hostEmotionLabels.length > 0 || selfEmotionLabels.length > 0
      ? {
          hostEmotionLabels,
          selfEmotionLabels,
        }
      : null,
    embodimentRecallProfile: embodimentRecallStrength || embodimentRisk
      ? {
          recallStrength: embodimentRecallStrength,
          modalityRisk: embodimentRisk,
        }
      : null,
    metabolismSummary,
    ...(metabolismPolicy ? { metabolismPolicy } : {}),
    stablePreferenceHint,
    autobiographicalDelta,
  } satisfies Record<string, unknown>
}

function buildProjectStateCarryMetadata(events: AlicizationEpisodicEventRecord[]) {
  const combined = lowerText(...events.flatMap(collectEventTexts))
  const sourceTags = uniqueList([
    (phaseOneDigitalLifePattern.test(combined) || samePersonContinuityPattern.test(combined) || unfinishedClosurePattern.test(combined))
      ? 'project-state-carry'
      : null,
    executionCallbackPattern.test(combined)
      ? 'continuity-execution-callback-project-carry'
      : null,
  ], 4)

  if (sourceTags.length === 0)
    return null

  const inwardLine = sanitizeText([
    (phaseOneDigitalLifePattern.test(combined) || samePersonContinuityPattern.test(combined))
      ? 'memory_continuity=local_runtime.'
      : '',
    executionCallbackPattern.test(combined)
      ? 'verified_closure_progress=partial.'
      : '',
    unfinishedClosurePattern.test(combined)
      ? 'unresolved_closure=continuity.'
      : '',
  ].filter(Boolean).join(' '), 220)

  return inwardLine
    ? {
        selfContinuityInwardLine: inwardLine,
        selfContinuitySourceTags: sourceTags,
      }
    : null
}

function buildConsolidationMetadata(events: AlicizationEpisodicEventRecord[]) {
  const humanlikeCarry = buildHumanlikeCarryMetadata(events)
  const projectState = buildProjectStateCarryMetadata(events)
  if (!humanlikeCarry && !projectState)
    return null
  return {
    ...(humanlikeCarry ? { humanlikeCarry } : {}),
    ...(projectState ? { projectState } : {}),
  } satisfies Record<string, unknown>
}

function buildDayKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10)
}

function buildWeekKey(timestamp: number) {
  const date = new Date(timestamp)
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${utcDate.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

const pickDominantProvenance = pickDominantAlicizationMemoryProvenance

function sortEvents(events: AlicizationEpisodicEventRecord[]) {
  return [...events].sort((left, right) => {
    if (left.salience !== right.salience)
      return right.salience - left.salience
    if (left.confidence !== right.confidence)
      return right.confidence - left.confidence
    return right.occurredAt - left.occurredAt
  })
}

function buildSummary(kind: 'daily' | 'weekly', periodKey: string, events: AlicizationEpisodicEventRecord[]) {
  const sorted = sortEvents(events)
  const lead = sorted[0] ?? null
  const cues = uniqueList(sorted.flatMap(event => [
    event.threadAnchor,
    event.whereSummary,
    event.whatHappened,
    event.relationshipMeaning,
  ]), 4)
  const label = kind === 'daily' ? `On ${periodKey}` : `During ${periodKey}`
  return sanitizeText(
    `${label}, the strongest remembered line was ${lead?.threadAnchor || lead?.whereSummary || 'an ongoing continuity seam'}; ${lead?.relationshipMeaning || lead?.whatHappened || cues[0] || 'the period stayed emotionally and relationally live.'}`,
    280,
  )
}

function buildLesson(events: AlicizationEpisodicEventRecord[]) {
  const lessons = uniqueList(events.flatMap(event => [
    event.lesson,
    event.relationshipMeaning,
    event.whatChanged,
  ]), 3)
  return lessons[0] ?? null
}

function inferAutobiographicalFacets(event: AlicizationEpisodicEventRecord): Array<NonNullable<AlicizationMemoryConsolidationRecord['facet']>> {
  const text = [
    event.threadAnchor,
    event.whereSummary,
    event.whatHappened,
    event.felt,
    event.whatChanged,
    event.relationshipMeaning,
    event.lesson,
    event.sourceSummary,
    ...event.emotionTags,
    ...event.tags,
  ].filter(Boolean).join(' ').toLowerCase()

  const facets = new Set<NonNullable<AlicizationMemoryConsolidationRecord['facet']>>()

  if (
    event.sourceKind === 'dream'
    || event.sourceKind === 'dream-reforge'
    || event.sourceKind === 'reflection'
    || event.sourceKind === 'maintenance'
    || /identity|self|incarnation|doctrine|persona|temperament|same[- ]?person|same[- ]?her|same living line|continuous digital life|tool shell|generic shell|corrected meaning|defending the first interpretation|我更想|我开始|我学会|我不再|同一个她|同一条线|数字生命|工具壳/u.test(text)
  ) {
    facets.add('self-era')
  }

  if (
    event.sourceKind === 'dialogue-feedback'
    || /relationship|bond|closeness|distance|repair|boundary|intrusive|lighter touch|space before closeness|host needed space|room before closeness|same[- ]?person|same[- ]?her|tool shell|generic shell|host corrected|not a status report|not .*status recap|progress pressure|same living line|同一个她|工具壳|不是状态汇报|不是催进度/u.test(text)
  ) {
    facets.add('relationship-era')
  }

  if (
    event.sourceKind === 'execution-proposal'
    || event.sourceKind === 'execution-result'
    || /runtime|cli|codex|claude|patch|verify|test|workflow|procedure|task|执行|修复|continuity/u.test(text)
  ) {
    facets.add('task-era')
  }

  if (facets.size === 0)
    facets.add('phase')

  return [...facets]
}

function deriveDominantMood(events: AlicizationEpisodicEventRecord[]) {
  const ranked = uniqueList(events.flatMap(event => [
    ...event.emotionTags,
    event.felt,
  ]), 6)
  return ranked[0] ?? null
}

function deriveRecurrentBurden(events: AlicizationEpisodicEventRecord[]) {
  const burdenCandidates = uniqueList(events.flatMap(event => [
    event.lesson,
    event.relationshipMeaning,
    event.whatChanged,
  ]), 6)
  return burdenCandidates.find(item => /space|room|pressure|intrusive|burden|repair|boundary|focused windows|closeness|重压|空间|边界|修复|压力/u.test(item))
    ?? burdenCandidates[0]
    ?? null
}

function buildAutobiographicalSummary(input: {
  facet: NonNullable<AlicizationMemoryConsolidationRecord['facet']>
  periodKey: string
  events: AlicizationEpisodicEventRecord[]
}) {
  const sorted = sortEvents(input.events)
  const lead = sorted[0] ?? null
  const dominantMood = deriveDominantMood(input.events)
  const recurrentBurden = deriveRecurrentBurden(input.events)
  const facetLabel = input.facet === 'relationship-era'
    ? 'relationship era'
    : input.facet === 'task-era'
      ? 'task era'
      : input.facet === 'self-era'
        ? 'self era'
        : 'phase'
  return sanitizeText([
    `During ${input.periodKey}, the dominant ${facetLabel} centered on ${lead?.relationshipMeaning || lead?.lesson || lead?.threadAnchor || lead?.whatHappened || 'an ongoing continuity seam'}.`,
    dominantMood ? `The dominant mood was ${dominantMood}.` : '',
    recurrentBurden ? `The recurrent burden was ${recurrentBurden}.` : '',
  ].filter(Boolean).join(' '), 320)
}

function buildAutobiographicalCues(events: AlicizationEpisodicEventRecord[]) {
  const dominantMood = deriveDominantMood(events)
  const recurrentBurden = deriveRecurrentBurden(events)
  return uniqueList(events.flatMap(event => [
    event.threadAnchor,
    event.whereSummary,
    event.relationshipMeaning,
    event.lesson,
    dominantMood,
    recurrentBurden,
  ]), 6)
}

function buildConfidence(events: AlicizationEpisodicEventRecord[]) {
  if (events.length === 0)
    return 0
  const total = events.reduce((sum, event) => sum + event.confidence * 0.45 + event.salience * 0.45 + event.consolidationPriority * 0.1, 0)
  return clamp01(total / events.length)
}

function shouldPreserveSingleEventAutobiographicalCarry(input: {
  facet: NonNullable<AlicizationMemoryConsolidationRecord['facet']>
  events: AlicizationEpisodicEventRecord[]
}) {
  if (input.events.length !== 1)
    return false
  if (input.facet === 'phase' || input.facet === 'task-era')
    return false

  const [event] = input.events
  const humanlikeCarry = buildHumanlikeCarryMetadata(input.events)
  if (!humanlikeCarry)
    return false

  const signalText = lowerText(
    ...collectEventTexts(event),
    humanlikeCarry.autobiographicalDelta,
    humanlikeCarry.embodimentSummary,
    humanlikeCarry.embodimentCadence,
    humanlikeCarry.metabolismSummary,
    ...(humanlikeCarry.metabolismPolicy?.reasons ?? []),
  )
  const residueTags = new Set(humanlikeCarry.emotionalResidueTags.map(tag => sanitizeText(tag, 64).toLowerCase()))
  const metabolismPolicy = humanlikeCarry.metabolismPolicy ?? null
  const vulnerableCareCarry
    = residueTags.has('rest-protective')
      || residueTags.has('vulnerable-care')
      || /overloaded|fragile|vulnerable|care arrive before analysis|stay nearby gently|lighter companionship|care-before-analysis|先陪|轻一点|不要分析太多/u.test(signalText)
  const correctedSamePersonCarry
    = (
      humanlikeCarry.relationshipPrimaryIntent === 'same-person-test'
      || humanlikeCarry.relationshipPrimaryIntent === 'continuity-worry'
      || humanlikeCarry.relationshipPrimaryIntent === 'mixed'
    ) && (
      humanlikeCarry.recallCertainty === 'corrected'
      || /same[- ]?person|same[- ]?her|same living line|tool shell|corrected same-person continuity|defending the first interpretation|同一个她|工具壳/u.test(signalText)
    )
  const durableMetabolismCarry
    = (
      Boolean(humanlikeCarry.metabolismSummary)
      || Boolean(
        metabolismPolicy
        && (
          metabolismPolicy.downrankMemoryIds.length > 0
          || metabolismPolicy.mergeMemoryIds.length > 0
          || metabolismPolicy.forgetMemoryIds.length > 0
          || metabolismPolicy.reasons.length > 0
        ),
      )
    ) && (
      humanlikeCarry.relationshipPrimaryIntent === 'same-person-test'
      || humanlikeCarry.relationshipPrimaryIntent === 'continuity-worry'
      || humanlikeCarry.relationshipPrimaryIntent === 'mixed'
      || /same[- ]?person|same[- ]?her|same living line|tool shell|同一个她|工具壳/u.test(signalText)
    )
  const durableExecutionBoundaryCarry
    = /blocked-before-dispatch|confirmation=required|no-process-started|explicit confirmation|explicit consent|bounded execution|execution boundary|wait for explicit confirmation|wait for confirmation|risky local action|host-confirmed-before-redispatch|resume-before-dispatch|bounded confirmation boundary/u.test(signalText)
      && (
        lowerPressurePattern.test(signalText)
        || slowerPacingPattern.test(signalText)
        || stableGazePattern.test(signalText)
        || /ordinary proactive closeness|resumable safety memory|not permanent execution permission/u.test(signalText)
      )
  const embodiedCarry
    = lowerPressurePattern.test(signalText)
      || slowerPacingPattern.test(signalText)
      || stableGazePattern.test(signalText)
  const autobiographicalWeight
    = buildConfidence(input.events) >= 0.82
      || (event.salience >= 0.84 && event.consolidationPriority >= 0.82)

  return autobiographicalWeight
    && (embodiedCarry || durableMetabolismCarry || durableExecutionBoundaryCarry)
    && (vulnerableCareCarry || correctedSamePersonCarry || durableMetabolismCarry || durableExecutionBoundaryCarry)
}

export function buildMemoryConsolidationRecords(input: {
  events: AlicizationEpisodicEventRecord[]
  now: number
}): AlicizationMemoryConsolidationRecord[] {
  const events = [...input.events]
    .filter(event => shouldAlicizationMemoryProvenanceEnterLongTermConsolidation(event.provenance))
    .sort((left, right) => left.occurredAt - right.occurredAt)
  if (events.length === 0)
    return []

  const dailyBuckets = new Map<string, AlicizationEpisodicEventRecord[]>()
  const weeklyBuckets = new Map<string, AlicizationEpisodicEventRecord[]>()
  for (const event of events) {
    const dayKey = buildDayKey(event.occurredAt)
    const weekKey = buildWeekKey(event.occurredAt)
    dailyBuckets.set(dayKey, [...(dailyBuckets.get(dayKey) ?? []), event])
    weeklyBuckets.set(weekKey, [...(weeklyBuckets.get(weekKey) ?? []), event])
  }

  const consolidated: AlicizationMemoryConsolidationRecord[] = []
  for (const [periodKey, bucketEvents] of dailyBuckets) {
    const sorted = sortEvents(bucketEvents)
    const record: AlicizationMemoryConsolidationRecord = {
      id: `daily:${periodKey}`,
      kind: 'daily',
      facet: null,
      periodKey,
      periodStartedAt: Math.min(...bucketEvents.map(event => event.occurredAt)),
      periodEndedAt: Math.max(...bucketEvents.map(event => event.occurredAt)),
      summary: buildSummary('daily', periodKey, bucketEvents),
      lesson: buildLesson(bucketEvents),
      cues: uniqueList(sorted.flatMap(event => [
        event.threadAnchor,
        event.whereSummary,
        event.whatHappened,
        event.relationshipMeaning,
        event.lesson,
      ]), 5),
      confidence: buildConfidence(bucketEvents),
      dominantProvenance: pickDominantProvenance(sorted.map(event => event.latestReconsolidation?.provenance ?? event.provenance)),
      derivedEventIds: sorted.map(event => event.id),
      metadata: buildConsolidationMetadata(sorted),
      updatedAt: input.now,
    }
    record.memoryTier = deriveConsolidationMemoryTier(record, input.now)
    consolidated.push(record)
  }

  for (const [periodKey, bucketEvents] of weeklyBuckets) {
    const sorted = sortEvents(bucketEvents)
    const weeklyRecord: AlicizationMemoryConsolidationRecord = {
      id: `weekly:${periodKey}`,
      kind: 'weekly',
      facet: null,
      periodKey,
      periodStartedAt: Math.min(...bucketEvents.map(event => event.occurredAt)),
      periodEndedAt: Math.max(...bucketEvents.map(event => event.occurredAt)),
      summary: buildSummary('weekly', periodKey, bucketEvents),
      lesson: buildLesson(bucketEvents),
      cues: uniqueList(sorted.flatMap(event => [
        event.threadAnchor,
        event.whereSummary,
        event.relationshipMeaning,
        event.lesson,
      ]), 5),
      confidence: buildConfidence(bucketEvents),
      dominantProvenance: pickDominantProvenance(sorted.map(event => event.latestReconsolidation?.provenance ?? event.provenance)),
      derivedEventIds: sorted.map(event => event.id),
      metadata: buildConsolidationMetadata(sorted),
      updatedAt: input.now,
    }
    weeklyRecord.memoryTier = deriveConsolidationMemoryTier(weeklyRecord, input.now)
    consolidated.push(weeklyRecord)

    const autobiographicalBuckets = new Map<NonNullable<AlicizationMemoryConsolidationRecord['facet']>, AlicizationEpisodicEventRecord[]>()
    for (const event of bucketEvents) {
      for (const facet of inferAutobiographicalFacets(event))
        autobiographicalBuckets.set(facet, [...(autobiographicalBuckets.get(facet) ?? []), event])
    }
    if (bucketEvents.length >= 2)
      autobiographicalBuckets.set('phase', bucketEvents)

    for (const [facet, facetEvents] of autobiographicalBuckets) {
      const rankedEvents = sortEvents(facetEvents)
      if (
        facet !== 'phase'
        && facetEvents.length < 2
        && !shouldPreserveSingleEventAutobiographicalCarry({
          facet,
          events: rankedEvents,
        })
      ) {
        continue
      }
      const autobiographicalRecord: AlicizationMemoryConsolidationRecord = {
        id: `autobio:${facet}:${periodKey}`,
        kind: 'autobiographical',
        facet,
        periodKey,
        periodStartedAt: Math.min(...facetEvents.map(event => event.occurredAt)),
        periodEndedAt: Math.max(...facetEvents.map(event => event.occurredAt)),
        summary: buildAutobiographicalSummary({
          facet,
          periodKey,
          events: facetEvents,
        }),
        lesson: buildLesson(facetEvents),
        cues: buildAutobiographicalCues(facetEvents),
        confidence: buildConfidence(facetEvents),
        dominantProvenance: pickDominantProvenance(rankedEvents.map(event => event.latestReconsolidation?.provenance ?? event.provenance)),
        derivedEventIds: rankedEvents.map(event => event.id),
        metadata: buildConsolidationMetadata(rankedEvents),
        updatedAt: input.now,
      }
      autobiographicalRecord.memoryTier = deriveConsolidationMemoryTier(autobiographicalRecord, input.now)
      consolidated.push(autobiographicalRecord)
    }
  }

  const procedural = buildProceduralMemoryAbstractions({
    intent: {
      mode: 'execution-procedure',
      temporalFocus: 'experience-matched',
      searchEpisodes: true,
      searchConversations: false,
      searchProceduralExperience: true,
      queryHints: [],
      rationale: 'derive persistent procedural abstraction',
      confidence: 1,
    },
    episodes: events,
  })
  for (const item of procedural) {
    const supporting = events.filter((event) => {
      const anchor = `${event.threadAnchor ?? ''} ${event.whereSummary ?? ''} ${event.whatHappened} ${event.lesson ?? ''}`
      return anchor.toLowerCase().includes(item.label.toLowerCase())
        || item.cues.some(cue => anchor.toLowerCase().includes(cue.toLowerCase()))
    })
    if (supporting.length === 0)
      continue
    const proceduralRecord: AlicizationMemoryConsolidationRecord = {
      id: `procedural:${item.id}`,
      kind: 'procedural',
      facet: null,
      periodKey: item.id,
      periodStartedAt: Math.min(...supporting.map(event => event.occurredAt)),
      periodEndedAt: Math.max(...supporting.map(event => event.occurredAt)),
      summary: sanitizeText(`The remembered way of handling ${item.label} is ${item.approach}.`, 280),
      lesson: item.pitfalls[0] ?? null,
      cues: uniqueList(item.cues, 5),
      confidence: item.confidence,
      dominantProvenance: pickDominantProvenance(supporting.map(event => event.latestReconsolidation?.provenance ?? event.provenance)),
      derivedEventIds: supporting.map(event => event.id),
      metadata: buildConsolidationMetadata(supporting),
      updatedAt: input.now,
    }
    proceduralRecord.memoryTier = deriveConsolidationMemoryTier(proceduralRecord, input.now)
    consolidated.push(proceduralRecord)
  }

  return consolidated
    .sort((left, right) => {
      if (left.kind !== right.kind) {
        const rank = { daily: 0, weekly: 1, autobiographical: 2, procedural: 3 } as const
        return rank[left.kind] - rank[right.kind]
      }
      if (left.periodEndedAt !== right.periodEndedAt)
        return right.periodEndedAt - left.periodEndedAt
      return right.confidence - left.confidence
    })
}

export function searchMemoryConsolidationRecords(input: {
  query: string
  records: AlicizationMemoryConsolidationRecord[]
  limit?: number
  recollectionIntent?: {
    mode: 'none' | 'conversation-history' | 'autobiographical-history' | 'relationship-history' | 'execution-procedure' | 'experience-pattern'
    temporalFocus: 'recent' | 'recent-or-mid' | 'cross-session' | 'experience-matched' | 'distant'
    searchEpisodes: boolean
    searchConversations: boolean
    searchProceduralExperience: boolean
    queryHints: string[]
    rationale: string
    confidence: number
    recollectionAgenda?: {
      whyRecallNow: string
      goalSimilarity: number
      relationshipNeed: number
      affectivePull: number
      sceneFamiliarity: number
      candidateTimeScopes: Array<{
        scope: 'recent' | 'recent-or-mid' | 'cross-session' | 'experience-matched' | 'distant'
        weight: number
        rationale?: string | null
      }>
      candidateEraFacets: Array<{
        facet: 'phase' | 'relationship-era' | 'task-era' | 'self-era' | 'window'
        weight: number
        rationale?: string | null
      }>
      candidateProcedureLines: string[]
      uncertaintyTolerance: 'low' | 'medium' | 'high'
    } | null
  } | null
}): AlicizationMemoryConsolidationRecord[] {
  const query = sanitizeText(input.query, 320).toLowerCase()
  if (!query)
    return []
  const limit = Math.max(1, Math.min(8, Math.floor(input.limit ?? 4)))
  const intent = input.recollectionIntent ?? null
  const hints = uniqueList(intent?.queryHints ?? [], 8).map(item => item.toLowerCase())
  const agenda = intent?.recollectionAgenda ?? null
  const semanticGraph = scoreSemanticGraphWalk({
    nodes: input.records.map(record => ({
      id: record.id,
      primaryText: record.summary,
      semanticTexts: [record.lesson ?? '', ...record.cues],
      groupKeys: [record.kind, record.facet ?? '', record.memoryTier ?? ''],
      neighborKeys: [...record.cues, ...record.derivedEventIds],
    })),
    queryTexts: [query, ...hints, ...(agenda?.candidateProcedureLines ?? [])],
    getId: node => node.id,
  })

  return [...input.records]
    .map((record) => {
      const haystack = `${record.summary} ${record.lesson ?? ''} ${record.cues.join(' ')}`.toLowerCase()
      let lexicalScore = haystack.includes(query) ? 1 : 0
      for (const hint of hints) {
        if (hint && haystack.includes(hint))
          lexicalScore += hint.length >= 10 ? 0.6 : 0.24
      }
      const proceduralBoost = intent?.searchProceduralExperience && record.kind === 'procedural' ? 0.28 : 0
      const autobiographicalBoost = (intent?.mode === 'autobiographical-history' || intent?.mode === 'relationship-history') && record.kind === 'autobiographical'
        ? 0.24
        : 0
      const relationshipEraBoost = intent?.mode === 'relationship-history' && record.facet === 'relationship-era' ? 0.14 : 0
      const taskEraBoost = (intent?.mode === 'execution-procedure' || intent?.mode === 'experience-pattern') && record.facet === 'task-era' ? 0.14 : 0
      const selfEraBoost = intent?.mode === 'autobiographical-history' && record.facet === 'self-era' ? 0.14 : 0
      const distantBoost = (intent?.temporalFocus === 'cross-session' || intent?.temporalFocus === 'distant') && record.kind !== 'daily' ? 0.18 : 0
      const agendaProcedureBoost = agenda && agenda.candidateProcedureLines.length > 0
        ? agenda.candidateProcedureLines.some(line => haystack.includes(line.toLowerCase()))
          ? 0.08 + clamp01(agenda.goalSimilarity) * 0.12
          : 0
        : 0
      const agendaFacetBoost = agenda && record.facet
        ? (agenda.candidateEraFacets.find(item => item.facet === record.facet)?.weight ?? 0) * 0.18
        : 0
      const agendaTimeBoost = agenda && agenda.candidateTimeScopes.some(item => item.scope === 'cross-session' || item.scope === 'distant')
        ? record.kind !== 'daily'
          ? Math.max(...agenda.candidateTimeScopes.map(item => clamp01(item.weight))) * 0.12
          : 0
        : 0
      const semanticScore = scoreSemanticRecall({
        queryTexts: [query, ...hints, ...(agenda?.candidateProcedureLines ?? [])],
        candidateTexts: [record.summary, record.lesson ?? '', ...record.cues],
      })
      const graphBoost = semanticGraph.graphBoostById.get(record.id) ?? 0
      const tierBoost = scoreMemoryTierReachability({
        tier: record.memoryTier ?? deriveConsolidationMemoryTier(record, Date.now()),
        vagueQuery: query.split(/\s+/u).length <= 3,
        temporalFocus: intent?.temporalFocus ?? null,
        longHorizonPreferred: intent?.temporalFocus === 'cross-session' || intent?.temporalFocus === 'distant',
      })
      const score = lexicalScore * 0.46
        + record.confidence * 0.3
        + semanticScore * 0.22
        + graphBoost * 0.16
        + proceduralBoost
        + autobiographicalBoost
        + relationshipEraBoost
        + taskEraBoost
        + selfEraBoost
        + distantBoost
        + tierBoost
        + agendaProcedureBoost
        + agendaFacetBoost
        + agendaTimeBoost
      return {
        record,
        score,
      }
    })
    .filter(item => item.score > 0.18)
    .sort((left, right) => {
      if (left.score !== right.score)
        return right.score - left.score
      return right.record.periodEndedAt - left.record.periodEndedAt
    })
    .slice(0, limit)
    .map(item => item.record)
}
