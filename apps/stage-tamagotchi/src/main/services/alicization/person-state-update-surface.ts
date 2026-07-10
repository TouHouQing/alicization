import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationEpisodicEventRecord,
  AlicizationMindTurnEventRecord,
  AlicizationPersonaReinforcementDimension,
  AlicizationRelationshipOutcomeSourceKind,
  AlicizationPersonStateUpdateRecord as SharedAlicizationPersonStateUpdateRecord,
  AlicizationPersonStateUpdateSurface as SharedAlicizationPersonStateUpdateSurface,
} from '../../../shared/eventa'
import type { AlicizationOutcomeClosureResult } from './outcome-reinforcement'

import {
  normalizeAlicizationDerivedMindStateBundle,
  readAffectiveResidueFromDerivedMindStateBundle,
} from '@proj-alicization/stage-shared'

import { deriveMemorySupersessionSignal } from './humanlike-memory'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'

export type AlicizationPersonStateUpdateSurface = SharedAlicizationPersonStateUpdateSurface
export type AlicizationPersonStateUpdateRecord = SharedAlicizationPersonStateUpdateRecord

const focusedContextPattern = /focused|focus|debug|coding|cursor|terminal|runtime|工作|写代码|调试/iu
const lateNightPattern = /late[- ]?night|drain|夜|熬夜|很晚|疲惫|累/iu
const executionContextPattern = /execution|result|proposal|callback|cli|codex|claude|task|执行|结果|提案|回调/iu
const openContextPattern = /open|warming|聊天|陪|一起|靠近|轻松|放松/iu
const closenessPattern = /warm|gentle|care|companionship|陪|温和|柔和|陪伴|靠近/iu
const spacePattern = /space|boundary|lighter|light touch|quiet|room|边界|空间|轻一点|安静|留白/iu
const repairPattern = /repair|clarify|recheck|not this|missed|澄清|修复|重说|不是这个|没答到/iu
const burdenPattern = /burden|tired|busy|drained|interrupt|压力|累|忙|打断|疲惫|不想被催/iu
const intrusivePattern = /intrusive|heavy|pressure|挤|黏|压迫|太近|太重|打扰/iu
const roboticPattern = /robotic|template|system|模板|机械|机器人|系统口气/iu
const initiativeStrategyPattern = /future follow-ups|follow-up timing|clearer opening|fresher opening|leave more room|less eager|quieter timing|memory-led|still receiving them|reopening this line/iu
const acceptedInitiativeStrategyPattern = /memory-led|still receiving them|received without obvious resistance|accepted or continued/iu

function clamp(value: number, maxAbs = 0.5) {
  if (!Number.isFinite(value))
    return 0
  return Number(Math.max(-maxAbs, Math.min(maxAbs, value)).toFixed(3))
}

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeContinuityRestraint(raw: unknown) {
  const normalized = sanitizeText(raw, 64)
  return normalized === 'lower-pressure'
    || normalized === 'measured-return'
    || normalized === 'repair-before-closeness'
    || normalized === 'rest-protective'
    || normalized === 'single-thread'
    ? normalized
    : null
}

function normalizePreferredBlinkCadence(raw: unknown) {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'normal'
    || normalized === 'linger'
    || normalized === 'quiet'
    ? normalized
    : null
}

function normalizePreferredGazeMode(raw: unknown) {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'steady'
    || normalized === 'soften'
    || normalized === 'drift'
    ? normalized
    : null
}

function normalizePreferredPauseMode(raw: unknown) {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'longer'
    || normalized === 'natural'
    ? normalized
    : null
}

function normalizePreferredLipsyncMode(raw: unknown) {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'restrained'
    || normalized === 'matched'
    ? normalized
    : null
}

function normalizePreferredVoiceMode(raw: unknown) {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'lower-pressure'
    || normalized === 'even'
    ? normalized
    : null
}

function normalizePreferredPacingMode(raw: unknown) {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'slower'
    || normalized === 'natural'
    ? normalized
    : null
}

function asObject(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function normalizeAffectiveResidue(raw: unknown): AlicizationAffectiveResidueMemorySnapshot | null {
  const derivedMindStateBundle = normalizeAlicizationDerivedMindStateBundle({
    version: 'derived-mind-state-bundle-v1',
    source: 'browser-fallback',
    producedAt: 0,
    summary: 'person-state-update-affective-residue',
    affectiveResidue: raw,
  })
  return readAffectiveResidueFromDerivedMindStateBundle(derivedMindStateBundle)
}

function readProjectStateLandedProgress(projectStateBrief: {
  latestLandedProgress?: unknown[] | unknown
  latestProgress?: unknown
}) {
  const raw = Array.isArray(projectStateBrief.latestLandedProgress)
    ? projectStateBrief.latestLandedProgress[0]
    : projectStateBrief.latestLandedProgress ?? projectStateBrief.latestProgress
  return sanitizeText(raw, 220) || null
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
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

function stringListFrom(raw: unknown, maxItems = 8) {
  if (!Array.isArray(raw))
    return []
  return uniqueList(
    raw.map(item => typeof item === 'string' ? item : ''),
    maxItems,
  )
}

function numericOr(raw: unknown, fallback = 0) {
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

function normalizeClosureEpisodicReconsolidation(
  event: AlicizationOutcomeClosureResult['episodicEvents'][number],
  fallbackAt: number,
) {
  const raw = asObject(event)?.latestReconsolidation
  const normalized = asObject(raw)
  if (!normalized)
    return null

  return {
    at: numericOr(normalized.at, fallbackAt),
    decisionTraceId: sanitizeText(normalized.decisionTraceId, 96) || null,
    provenance: event.provenance,
    confidence: numericOr(normalized.confidence, event.confidence),
    reason: sanitizeText(normalized.reason, 220),
    emotionTags: uniqueList(stringListFrom(normalized.emotionTags ?? [], 8), 8),
    relationshipMeaning: sanitizeText(normalized.relationshipMeaning, 220) || null,
    lesson: sanitizeText(normalized.lesson, 220) || null,
  }
}

function closureEventToComparableRecord(
  event: AlicizationOutcomeClosureResult['episodicEvents'][number],
  index: number,
): AlicizationEpisodicEventRecord {
  const occurredAt = numericOr(event.occurredAt, event.createdAt ?? event.updatedAt ?? index + 1)
  const latestReconsolidation = normalizeClosureEpisodicReconsolidation(event, occurredAt)
  const reconsolidationCount = numericOr(asObject(event)?.reconsolidationCount, 0)

  return {
    id: sanitizeText(event.id, 120) || `closure-episodic-${index + 1}`,
    cardId: event.cardId,
    decisionTraceId: sanitizeText(event.decisionTraceId, 120) || null,
    turnId: sanitizeText(event.turnId, 120) || null,
    sessionId: sanitizeText(event.sessionId, 120) || null,
    sourceKind: event.sourceKind,
    provenance: event.provenance,
    occurredAt,
    whereSummary: sanitizeText(event.whereSummary, 180) || null,
    withWhom: event.withWhom ?? [],
    threadAnchor: sanitizeText(event.threadAnchor, 180) || null,
    whatHappened: sanitizeText(event.whatHappened, 220),
    felt: sanitizeText(event.felt, 220) || null,
    emotionTags: uniqueList(event.emotionTags ?? [], 8),
    whatChanged: sanitizeText(event.whatChanged, 220) || null,
    relationshipMeaning: sanitizeText(event.relationshipMeaning, 220) || null,
    lesson: sanitizeText(event.lesson, 220) || null,
    sourceSummary: sanitizeText(event.sourceSummary, 220) || null,
    confidence: numericOr(event.confidence, 0),
    salience: numericOr(event.salience, 0.5),
    sceneAttachment: numericOr(event.sceneAttachment, 0),
    consolidationPriority: numericOr(event.consolidationPriority, 0),
    relationshipShift: event.relationshipShift ?? null,
    derivedFrom: event.derivedFrom ?? [],
    tags: uniqueList(event.tags ?? [], 8),
    createdAt: numericOr(event.createdAt, occurredAt),
    updatedAt: numericOr(event.updatedAt, occurredAt),
    lastRecalledAt: null,
    recallCount: 0,
    reconsolidationCount,
    latestReconsolidation,
  }
}

function filterSupersededClosureEpisodicEvents(
  events: AlicizationOutcomeClosureResult['episodicEvents'],
) {
  const comparable = events.map((event, index) => ({
    event,
    record: closureEventToComparableRecord(event, index),
  }))

  return comparable
    .filter((current, _index, all) => !all.some((candidate) => {
      if (candidate.record.id === current.record.id)
        return false
      return deriveMemorySupersessionSignal({
        current: current.record,
        candidate: candidate.record,
      }).suppressCurrent
    }))
    .map(item => item.event)
}

function inferContexts(text: string) {
  const contexts = ['general']
  if (lateNightPattern.test(text))
    contexts.push('late-night')
  if (focusedContextPattern.test(text))
    contexts.push('focused-work')
  if (executionContextPattern.test(text))
    contexts.push('execution')
  if (openContextPattern.test(text) || closenessPattern.test(text))
    contexts.push('open-window')
  return [...new Set(contexts)]
}

function inferPreferenceHints(text: string) {
  if (spacePattern.test(text))
    return 'Lighter touch, more room, less interruption pressure.'
  if (closenessPattern.test(text))
    return 'Warmer directness can land when the opening is clearly there.'
  return ''
}

function inferSensitivityHints(text: string) {
  if (intrusivePattern.test(text))
    return 'Pressure and over-close timing become intrusive quickly.'
  if (roboticPattern.test(text))
    return 'Template-like speech breaks the sense of a living reply.'
  if (spacePattern.test(text))
    return 'Boundary pressure is felt strongly; leaving room matters.'
  return ''
}

function inferRepairHints(text: string) {
  if (initiativeStrategyPattern.test(text)) {
    if (acceptedInitiativeStrategyPattern.test(text))
      return 'Keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them.'
    return 'Keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening before reopening this line.'
  }
  if (repairPattern.test(text))
    return 'When the seam is off, repair before continuing.'
  if (roboticPattern.test(text))
    return 'If the reply feels robotic, repair the living seam before continuing.'
  return ''
}

function inferBurdenHints(text: string) {
  if (burdenPattern.test(text) || lateNightPattern.test(text))
    return 'Interruption cost rises quickly when the host is tired, busy, or already carrying pressure.'
  if (focusedContextPattern.test(text))
    return 'Focused work gets overloaded quickly by extra conversational pressure.'
  return ''
}

function scoreEmotionalClosureCue(text: string) {
  const normalized = sanitizeText(text, 220).toLowerCase()
  if (!normalized)
    return 0

  let score = 0
  if (/repair-before-closeness|repair before closeness|repair first|repair settle/iu.test(normalized))
    score += 10
  if (/rest-protective|rest protective|fatigue-aware/iu.test(normalized))
    score += 8
  if (/measured-return|measured return|lower-pressure|leave more room|do not reopen from scratch/iu.test(normalized))
    score += 6
  if (/same living line|same callback line|same line|same-her/iu.test(normalized))
    score += 4
  if (/initiative/iu.test(normalized))
    score += 2
  if (/embodiment|voice|face|motion|lipsync/iu.test(normalized))
    score += 2
  return score
}

function resolveProjectStateEmotionalClosureCue(input: {
  closureTexts: string[]
  fallbackCue?: string | null
}) {
  const fallbackCue = sanitizeText(input.fallbackCue, 220) || null
  let best = fallbackCue
  let bestScore = scoreEmotionalClosureCue(fallbackCue ?? '')

  for (const candidate of input.closureTexts) {
    const normalized = sanitizeText(candidate, 220)
    if (!normalized)
      continue

    const candidateScore = scoreEmotionalClosureCue(normalized)
    if (candidateScore <= 0)
      continue

    if (
      candidateScore > bestScore
      || (candidateScore === bestScore && normalized.length > (best?.length ?? 0))
    ) {
      best = normalized
      bestScore = candidateScore
    }
  }

  return best
}

function mergeSurface(previous: AlicizationPersonStateUpdateSurface | null, next: AlicizationPersonStateUpdateSurface) {
  if (!previous)
    return next

  const mergedTrail = [...next.sourceTrail, ...previous.sourceTrail]
    .sort((left, right) => right.createdAt - left.createdAt)
    .filter((entry, index, array) => array.findIndex(candidate => candidate.kind === entry.kind && candidate.summary === entry.summary) === index)
    .slice(0, 12)

  const mergedRelationshipShift = {
    trustDelta: clamp(previous.relationshipShift.trustDelta + next.relationshipShift.trustDelta),
    closenessDelta: clamp(previous.relationshipShift.closenessDelta + next.relationshipShift.closenessDelta),
    burdenDelta: clamp(previous.relationshipShift.burdenDelta + next.relationshipShift.burdenDelta),
    boundaryDelta: clamp(previous.relationshipShift.boundaryDelta + next.relationshipShift.boundaryDelta),
    repairDelta: clamp(previous.relationshipShift.repairDelta + next.relationshipShift.repairDelta),
  }

  const mergedReinforcementBias: AlicizationPersonStateUpdateSurface['reinforcementBias'] = {
    ...previous.reinforcementBias,
  }
  for (const [dimension, delta] of Object.entries(next.reinforcementBias)) {
    const key = dimension as AlicizationPersonaReinforcementDimension
    mergedReinforcementBias[key] = clamp(Number(mergedReinforcementBias[key] ?? 0) + Number(delta ?? 0), 0.8)
  }

  return {
    ...next,
    updatedAt: Math.max(previous.updatedAt, next.updatedAt),
    summary: uniqueList([next.summary, previous.summary], 2)[0] ?? next.summary,
    dominantContexts: uniqueList([...next.dominantContexts, ...previous.dominantContexts], 6),
    relationshipShift: mergedRelationshipShift,
    reinforcementBias: mergedReinforcementBias,
    preferenceHints: uniqueList([...next.preferenceHints, ...previous.preferenceHints], 6),
    sensitivityHints: uniqueList([...next.sensitivityHints, ...previous.sensitivityHints], 6),
    repairHints: uniqueList([...next.repairHints, ...previous.repairHints], 6),
    burdenHints: uniqueList([...next.burdenHints, ...previous.burdenHints], 6),
    narrative: uniqueList([...next.narrative, ...previous.narrative], 8),
    sourceTrail: mergedTrail,
  }
}

export function buildAlicizationPersonStateUpdateSurface(input: {
  closure: AlicizationOutcomeClosureResult
  previous?: AlicizationPersonStateUpdateSurface | null
  now: number
}) {
  const filteredEpisodicEvents = filterSupersededClosureEpisodicEvents(input.closure.episodicEvents)
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const relationshipShift = input.closure.relationshipOutcomes.reduce((acc, outcome) => ({
    trustDelta: clamp(acc.trustDelta + outcome.trustDelta),
    closenessDelta: clamp(acc.closenessDelta + outcome.closenessDelta),
    burdenDelta: clamp(acc.burdenDelta + outcome.burdenDelta),
    boundaryDelta: clamp(acc.boundaryDelta + outcome.boundaryDelta),
    repairDelta: clamp(acc.repairDelta + outcome.repairDelta),
  }), {
    trustDelta: 0,
    closenessDelta: 0,
    burdenDelta: 0,
    boundaryDelta: 0,
    repairDelta: 0,
  })

  const reinforcementBias = input.closure.reinforcementEvents.reduce<AlicizationPersonStateUpdateSurface['reinforcementBias']>((acc, event) => {
    const direction = event.valence === 'reinforce' ? 1 : -1
    acc[event.dimension] = clamp(Number(acc[event.dimension] ?? 0) + event.delta * direction, 0.8)
    return acc
  }, {})

  const allTexts = uniqueList([
    ...input.closure.relationshipOutcomes.flatMap(outcome => [outcome.summary, outcome.actionSummary]),
    ...input.closure.reinforcementEvents.map(event => event.summary),
    ...filteredEpisodicEvents.flatMap(event => [event.relationshipMeaning, event.lesson, event.whatChanged, event.whatHappened]),
  ], 64)
  const dominantContexts = uniqueList(allTexts.flatMap(text => inferContexts(sanitizeText(text, 220))), 6)
  const preferenceHints = uniqueList(allTexts.map(text => inferPreferenceHints(sanitizeText(text, 220))), 6)
  const sensitivityHints = uniqueList(allTexts.map(text => inferSensitivityHints(sanitizeText(text, 220))), 6)
  const repairHints = uniqueList(allTexts.map(text => inferRepairHints(sanitizeText(text, 220))), 6)
  const burdenHints = uniqueList(allTexts.map(text => inferBurdenHints(sanitizeText(text, 220))), 6)
  const emotionalClosureCue = resolveProjectStateEmotionalClosureCue({
    closureTexts: allTexts,
    fallbackCue: projectStateBrief.emotionalClosureCue ?? null,
  })
  const narrative = uniqueList([
    ...input.closure.relationshipOutcomes.map(outcome => outcome.summary),
    ...input.closure.reinforcementEvents.map(event => event.summary),
    ...filteredEpisodicEvents.map(event => event.relationshipMeaning || event.lesson || event.whatChanged || event.whatHappened),
  ], 8)
  const sourceTrail = [
    ...input.closure.relationshipOutcomes.map(outcome => ({
      kind: 'relationship-outcome' as const,
      sourceKind: outcome.sourceKind,
      summary: sanitizeText(outcome.summary, 180),
      createdAt: outcome.createdAt ?? input.now,
    })),
    ...input.closure.reinforcementEvents.map(event => ({
      kind: 'reinforcement' as const,
      sourceKind: event.sourceKind,
      summary: sanitizeText(event.summary, 180),
      createdAt: event.createdAt ?? input.now,
    })),
  ]
    .filter(entry => entry.summary)
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, 12)
  const affectiveResidue = normalizeAffectiveResidue(input.closure.affectiveResidue)
    ?? input.previous?.affectiveResidue
    ?? null

  const next: AlicizationPersonStateUpdateSurface = {
    version: 'person-state-update-surface-v1',
    updatedAt: input.now,
    summary: uniqueList([
      relationshipShift.trustDelta > 0 ? 'Recent outcomes nudged trust upward.' : null,
      relationshipShift.burdenDelta > 0 ? 'Recent outcomes also raised burden pressure.' : null,
      preferenceHints[0] ? `Preference shift: ${preferenceHints[0]}` : null,
      repairHints[0] ? `Repair line: ${repairHints[0]}` : null,
      burdenHints[0] ? `Burden line: ${burdenHints[0]}` : null,
      narrative[0],
    ], 4).join(' '),
    projectStateContinuity: {
      identity: projectStateBrief.identity,
      currentPhase: projectStateBrief.currentPhase,
      sameHerSummary: 'continuity_scope=memory,initiative,dialogue,embodiment; owner=project_state; visibility=internal-structured',
      landedProgressSummary: readProjectStateLandedProgress(projectStateBrief),
      openClosureSummary: projectStateBrief.openLoops[0] ?? null,
      nextClosureTarget: projectStateBrief.nextClosureTarget ?? null,
      preDialogueAwarenessLine: projectStateBrief.preDialogueAwarenessLine ?? null,
      emotionalClosureCue,
      sameHerSelfLine: projectStateBrief.sameHerSelfLine,
      sameHerHoldDetail: projectStateBrief.sameHerHoldDetail ?? null,
      sameHerDriftRisk: projectStateBrief.sameHerDriftRisk,
      proactiveSameHerGap: projectStateBrief.proactiveSameHerGap ?? null,
      continuityRestraint: projectStateBrief.continuityRestraint ?? null,
      preferredBlinkCadence: projectStateBrief.preferredBlinkCadence ?? null,
      preferredGazeMode: projectStateBrief.preferredGazeMode ?? null,
      preferredPauseMode: projectStateBrief.preferredPauseMode ?? null,
      preferredLipsyncMode: projectStateBrief.preferredLipsyncMode ?? null,
      preferredVoiceMode: projectStateBrief.preferredVoiceMode ?? null,
      preferredPacingMode: projectStateBrief.preferredPacingMode ?? null,
    },
    dominantContexts,
    relationshipShift,
    reinforcementBias,
    preferenceHints,
    sensitivityHints,
    repairHints,
    burdenHints,
    narrative,
    sourceTrail,
    affectiveResidue,
  }

  return mergeSurface(input.previous ?? null, next)
}

const reinforcementDimensions: AlicizationPersonaReinforcementDimension[] = [
  'companionship',
  'truthful-grounding',
  'gentle-repair',
  'autonomy-respect',
  'unfinished-thread-return',
  'temper-guardedness',
  'temper-directness',
]

function normalizeOutcomeSourceKind(raw: unknown): AlicizationRelationshipOutcomeSourceKind | null {
  const normalized = sanitizeText(raw, 48).toLowerCase()
  if (normalized === 'reply' || normalized === 'dialogue-feedback')
    return 'reply'
  if (normalized === 'proactive' || normalized === 'dream' || normalized === 'dream-reforge')
    return 'proactive'
  if (normalized === 'execution' || normalized === 'execution-proposal' || normalized === 'execution-result')
    return 'execution'
  return null
}

function inferPersonStateUpdateOrigin(sourceKinds: AlicizationRelationshipOutcomeSourceKind[]) {
  if (sourceKinds.length === 1 && sourceKinds[0] === 'proactive')
    return 'subconscious-proactive' as const
  if (sourceKinds.length === 0)
    return 'system' as const
  return 'user-turn' as const
}

function normalizeNumeric(raw: unknown) {
  const value = Number(raw)
  return Number.isFinite(value) ? value : 0
}

function extractClosureMetadata(closure: AlicizationOutcomeClosureResult) {
  const candidates = [
    ...closure.relationshipOutcomes.map(item => ({
      decisionTraceId: sanitizeText(item.decisionTraceId, 96) || null,
      turnId: sanitizeText(item.turnId, 96) || null,
      sessionId: sanitizeText(item.sessionId, 96) || null,
      createdAt: normalizeNumeric(item.createdAt),
      sourceKind: normalizeOutcomeSourceKind(item.sourceKind),
    })),
    ...closure.reinforcementEvents.map(item => ({
      decisionTraceId: sanitizeText(item.decisionTraceId, 96) || null,
      turnId: sanitizeText(item.turnId, 96) || null,
      sessionId: sanitizeText(item.sessionId, 96) || null,
      createdAt: normalizeNumeric(item.createdAt),
      sourceKind: normalizeOutcomeSourceKind(item.sourceKind),
    })),
    ...closure.episodicEvents.map(item => ({
      decisionTraceId: sanitizeText(item.decisionTraceId, 96) || null,
      turnId: sanitizeText(item.turnId, 96) || null,
      sessionId: sanitizeText(item.sessionId, 96) || null,
      createdAt: normalizeNumeric(item.occurredAt),
      sourceKind: normalizeOutcomeSourceKind(item.sourceKind),
    })),
  ]
    .sort((left, right) => right.createdAt - left.createdAt)

  const latest = candidates[0] ?? null
  const sourceKinds = uniqueList(candidates.map(item => item.sourceKind), 3)
    .filter((item): item is AlicizationRelationshipOutcomeSourceKind => item === 'reply' || item === 'proactive' || item === 'execution')

  return {
    decisionTraceId: latest?.decisionTraceId ?? null,
    turnId: latest?.turnId ?? null,
    sessionId: latest?.sessionId ?? null,
    createdAt: latest?.createdAt ?? 0,
    sourceKinds,
  }
}

export function buildAlicizationPersonStateUpdateRecord(input: {
  closure: AlicizationOutcomeClosureResult
  surface: AlicizationPersonStateUpdateSurface
  createdAt?: number
  activeThreadId?: string | null
}): AlicizationPersonStateUpdateRecord {
  const metadata = extractClosureMetadata(input.closure)
  const createdAt = Number.isFinite(input.createdAt)
    ? Math.max(0, Math.floor(Number(input.createdAt)))
    : metadata.createdAt > 0
      ? metadata.createdAt
      : input.surface.updatedAt

  return {
    decisionTraceId: metadata.decisionTraceId,
    turnId: metadata.turnId,
    sessionId: metadata.sessionId,
    origin: inferPersonStateUpdateOrigin(metadata.sourceKinds),
    createdAt,
    activeThreadId: sanitizeText(input.activeThreadId, 120) || null,
    version: input.surface.version,
    updatedAt: input.surface.updatedAt,
    summary: sanitizeText(input.surface.summary, 220),
    projectStateContinuity: input.surface.projectStateContinuity
      ? {
          identity: sanitizeText(input.surface.projectStateContinuity.identity, 220) || null,
          currentPhase: sanitizeText(input.surface.projectStateContinuity.currentPhase, 160) || null,
          sameHerSummary: sanitizeText(input.surface.projectStateContinuity.sameHerSummary, 220) || null,
          landedProgressSummary: sanitizeText(input.surface.projectStateContinuity.landedProgressSummary, 220) || null,
          openClosureSummary: sanitizeText(input.surface.projectStateContinuity.openClosureSummary, 220) || null,
          nextClosureTarget: sanitizeText(input.surface.projectStateContinuity.nextClosureTarget, 220) || null,
          preDialogueAwarenessLine: sanitizeText(input.surface.projectStateContinuity.preDialogueAwarenessLine, 320) || null,
          emotionalClosureCue: sanitizeText(input.surface.projectStateContinuity.emotionalClosureCue, 220) || null,
          sameHerSelfLine: sanitizeText(input.surface.projectStateContinuity.sameHerSelfLine, 220) || null,
          sameHerHoldDetail: sanitizeText(input.surface.projectStateContinuity.sameHerHoldDetail, 220) || null,
          sameHerDriftRisk: sanitizeText(input.surface.projectStateContinuity.sameHerDriftRisk, 320) || null,
          proactiveSameHerGap: sanitizeText(input.surface.projectStateContinuity.proactiveSameHerGap, 220) || null,
          continuityRestraint: normalizeContinuityRestraint(input.surface.projectStateContinuity.continuityRestraint),
          preferredBlinkCadence: normalizePreferredBlinkCadence(input.surface.projectStateContinuity.preferredBlinkCadence),
          preferredGazeMode: normalizePreferredGazeMode(input.surface.projectStateContinuity.preferredGazeMode),
          preferredPauseMode: normalizePreferredPauseMode(input.surface.projectStateContinuity.preferredPauseMode),
          preferredLipsyncMode: normalizePreferredLipsyncMode(input.surface.projectStateContinuity.preferredLipsyncMode),
          preferredVoiceMode: normalizePreferredVoiceMode(input.surface.projectStateContinuity.preferredVoiceMode),
          preferredPacingMode: normalizePreferredPacingMode(input.surface.projectStateContinuity.preferredPacingMode),
        }
      : null,
    dominantContexts: uniqueList(input.surface.dominantContexts, 8),
    relationshipShift: {
      trustDelta: clamp(input.surface.relationshipShift.trustDelta),
      closenessDelta: clamp(input.surface.relationshipShift.closenessDelta),
      burdenDelta: clamp(input.surface.relationshipShift.burdenDelta),
      boundaryDelta: clamp(input.surface.relationshipShift.boundaryDelta),
      repairDelta: clamp(input.surface.relationshipShift.repairDelta),
    },
    reinforcementBias: reinforcementDimensions.reduce<Partial<Record<AlicizationPersonaReinforcementDimension, number>>>((acc, dimension) => {
      const value = input.surface.reinforcementBias[dimension]
      if (typeof value === 'number' && Number.isFinite(value))
        acc[dimension] = clamp(value, 0.8)
      return acc
    }, {}),
    preferenceHints: uniqueList(input.surface.preferenceHints, 8),
    sensitivityHints: uniqueList(input.surface.sensitivityHints, 8),
    repairHints: uniqueList(input.surface.repairHints, 8),
    burdenHints: uniqueList(input.surface.burdenHints, 8),
    narrative: uniqueList(input.surface.narrative, 10),
    sourceTrail: input.surface.sourceTrail
      .map(entry => ({
        kind: entry.kind,
        sourceKind: entry.sourceKind,
        summary: sanitizeText(entry.summary, 180),
        createdAt: Math.max(0, Math.floor(Number(entry.createdAt ?? createdAt))),
      }))
      .filter(entry => entry.summary)
      .slice(0, 12),
    affectiveResidue: normalizeAffectiveResidue(input.surface.affectiveResidue),
    sourceKinds: metadata.sourceKinds,
    sourceCounts: {
      relationshipOutcomes: input.closure.relationshipOutcomes.length,
      reinforcementEvents: input.closure.reinforcementEvents.length,
      episodicEvents: input.closure.episodicEvents.length,
      reflections: input.closure.reflections.length,
      memoryFacts: input.closure.memoryFacts.length,
    },
  }
}

export function personStateUpdateRecordFromMindTurnEvent(event: AlicizationMindTurnEventRecord): AlicizationPersonStateUpdateRecord | null {
  if (event.kind !== 'person-state-updated')
    return null

  const payload = asObject(event.payload)
  if (!payload)
    return null

  const version = sanitizeText(payload.version, 48)
  const summary = sanitizeText(payload.summary, 220)
  if (version !== 'person-state-update-surface-v1' || !summary)
    return null

  const relationshipShift = asObject(payload.relationshipShift)

  return {
    decisionTraceId: sanitizeText(event.decisionTraceId, 96) || null,
    turnId: sanitizeText(event.turnId, 96) || null,
    sessionId: sanitizeText(event.sessionId, 96) || null,
    origin: event.origin,
    createdAt: Math.max(0, Math.floor(Number(event.createdAt ?? 0))),
    activeThreadId: sanitizeText(payload.activeThreadId, 120) || null,
    version: 'person-state-update-surface-v1',
    updatedAt: Math.max(0, Math.floor(Number(payload.updatedAt ?? event.createdAt ?? 0))),
    summary,
    projectStateContinuity: asObject(payload.projectStateContinuity)
      ? {
          identity: sanitizeText(asObject(payload.projectStateContinuity)?.identity, 220) || null,
          currentPhase: sanitizeText(asObject(payload.projectStateContinuity)?.currentPhase, 160) || null,
          sameHerSummary: sanitizeText(asObject(payload.projectStateContinuity)?.sameHerSummary, 220) || null,
          landedProgressSummary: sanitizeText(asObject(payload.projectStateContinuity)?.landedProgressSummary, 220) || null,
          openClosureSummary: sanitizeText(asObject(payload.projectStateContinuity)?.openClosureSummary, 220) || null,
          nextClosureTarget: sanitizeText(asObject(payload.projectStateContinuity)?.nextClosureTarget, 220) || null,
          preDialogueAwarenessLine: sanitizeText(asObject(payload.projectStateContinuity)?.preDialogueAwarenessLine, 320) || null,
          emotionalClosureCue: sanitizeText(asObject(payload.projectStateContinuity)?.emotionalClosureCue, 220) || null,
          sameHerSelfLine: sanitizeText(asObject(payload.projectStateContinuity)?.sameHerSelfLine, 220) || null,
          sameHerHoldDetail: sanitizeText(asObject(payload.projectStateContinuity)?.sameHerHoldDetail, 220) || null,
          sameHerDriftRisk: sanitizeText(asObject(payload.projectStateContinuity)?.sameHerDriftRisk, 320) || null,
          proactiveSameHerGap: sanitizeText(asObject(payload.projectStateContinuity)?.proactiveSameHerGap, 220) || null,
          continuityRestraint: normalizeContinuityRestraint(asObject(payload.projectStateContinuity)?.continuityRestraint),
          preferredBlinkCadence: normalizePreferredBlinkCadence(asObject(payload.projectStateContinuity)?.preferredBlinkCadence),
          preferredGazeMode: normalizePreferredGazeMode(asObject(payload.projectStateContinuity)?.preferredGazeMode),
          preferredPauseMode: normalizePreferredPauseMode(asObject(payload.projectStateContinuity)?.preferredPauseMode),
          preferredLipsyncMode: normalizePreferredLipsyncMode(asObject(payload.projectStateContinuity)?.preferredLipsyncMode),
          preferredVoiceMode: normalizePreferredVoiceMode(asObject(payload.projectStateContinuity)?.preferredVoiceMode),
          preferredPacingMode: normalizePreferredPacingMode(asObject(payload.projectStateContinuity)?.preferredPacingMode),
        }
      : null,
    dominantContexts: Array.isArray(payload.dominantContexts)
      ? uniqueList(payload.dominantContexts.filter((item): item is string => typeof item === 'string'), 8)
      : [],
    relationshipShift: {
      trustDelta: clamp(normalizeNumeric(relationshipShift?.trustDelta)),
      closenessDelta: clamp(normalizeNumeric(relationshipShift?.closenessDelta)),
      burdenDelta: clamp(normalizeNumeric(relationshipShift?.burdenDelta)),
      boundaryDelta: clamp(normalizeNumeric(relationshipShift?.boundaryDelta)),
      repairDelta: clamp(normalizeNumeric(relationshipShift?.repairDelta)),
    },
    reinforcementBias: reinforcementDimensions.reduce<Partial<Record<AlicizationPersonaReinforcementDimension, number>>>((acc, dimension) => {
      const source = asObject(payload.reinforcementBias)
      const value = source?.[dimension]
      if (typeof value === 'number' && Number.isFinite(value))
        acc[dimension] = clamp(value, 0.8)
      return acc
    }, {}),
    preferenceHints: Array.isArray(payload.preferenceHints)
      ? uniqueList(payload.preferenceHints.filter((item): item is string => typeof item === 'string'), 8)
      : [],
    sensitivityHints: Array.isArray(payload.sensitivityHints)
      ? uniqueList(payload.sensitivityHints.filter((item): item is string => typeof item === 'string'), 8)
      : [],
    repairHints: Array.isArray(payload.repairHints)
      ? uniqueList(payload.repairHints.filter((item): item is string => typeof item === 'string'), 8)
      : [],
    burdenHints: Array.isArray(payload.burdenHints)
      ? uniqueList(payload.burdenHints.filter((item): item is string => typeof item === 'string'), 8)
      : [],
    narrative: Array.isArray(payload.narrative)
      ? uniqueList(payload.narrative.filter((item): item is string => typeof item === 'string'), 10)
      : [],
    sourceTrail: Array.isArray(payload.sourceTrail)
      ? payload.sourceTrail
          .map((entry) => {
            const candidate = asObject(entry)
            const sourceKind = normalizeOutcomeSourceKind(candidate?.sourceKind)
            const kind = sanitizeText(candidate?.kind, 64)
            const trailSummary = sanitizeText(candidate?.summary, 180)
            if (!sourceKind || (kind !== 'relationship-outcome' && kind !== 'reinforcement') || !trailSummary)
              return null
            return {
              kind: kind as 'relationship-outcome' | 'reinforcement',
              sourceKind,
              summary: trailSummary,
              createdAt: Math.max(0, Math.floor(Number(candidate?.createdAt ?? event.createdAt ?? 0))),
            }
          })
          .filter((entry): entry is AlicizationPersonStateUpdateRecord['sourceTrail'][number] => Boolean(entry))
          .slice(0, 12)
      : [],
    affectiveResidue: normalizeAffectiveResidue(payload.affectiveResidue),
    sourceKinds: Array.isArray(payload.sourceKinds)
      ? payload.sourceKinds
          .map(item => normalizeOutcomeSourceKind(item))
          .filter((item): item is AlicizationRelationshipOutcomeSourceKind => Boolean(item))
      : [],
    sourceCounts: {
      relationshipOutcomes: Math.max(0, Math.floor(Number(asObject(payload.sourceCounts)?.relationshipOutcomes ?? 0))),
      reinforcementEvents: Math.max(0, Math.floor(Number(asObject(payload.sourceCounts)?.reinforcementEvents ?? 0))),
      episodicEvents: Math.max(0, Math.floor(Number(asObject(payload.sourceCounts)?.episodicEvents ?? 0))),
      reflections: Math.max(0, Math.floor(Number(asObject(payload.sourceCounts)?.reflections ?? 0))),
      memoryFacts: Math.max(0, Math.floor(Number(asObject(payload.sourceCounts)?.memoryFacts ?? 0))),
    },
  }
}
