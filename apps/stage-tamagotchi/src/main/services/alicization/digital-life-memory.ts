import type {
  AlicizationDigitalLifeSpineMemoryDigest,
  AlicizationReflectionEntrySnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

function sanitizeText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeUnit(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return null
  return Math.max(0, Math.min(1, value))
}

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : []
}

function firstNonEmptyText(...values: unknown[]) {
  for (const value of values) {
    const text = sanitizeText(value)
    if (text)
      return text
  }
  return ''
}

function pickFocusBelief(surface: Partial<AlicizationDigitalLifeRuntimeSurface>) {
  const beliefs = asArray(surface.cognition?.beliefLedger?.beliefs)
  return beliefs.find(
    belief => belief.id === surface.cognition?.beliefLedger?.focusBeliefId,
  ) ?? beliefs[0] ?? null
}

function pickLeadingGoal(surface: Partial<AlicizationDigitalLifeRuntimeSurface>) {
  const goals = asArray(surface.memory?.goalStack?.alicizationGoals)
  return goals.find(
    goal => goal.id === surface.memory?.goalStack?.leadingAlicizationGoalId,
  ) ?? goals[0] ?? null
}

function pickDominantConcern(surface: Partial<AlicizationDigitalLifeRuntimeSurface>) {
  return surface.memory?.concerns?.[0] ?? null
}

function pickForegroundThoughtThread(surface: Partial<AlicizationDigitalLifeRuntimeSurface>) {
  const thoughtThreads = surface.memory?.thoughtThreads
  const threads = asArray(thoughtThreads?.threads)
  const foregroundThreadId = thoughtThreads?.foregroundThreadId ?? null
  return threads.find(
    thread => thread.id === foregroundThreadId,
  ) ?? threads[0] ?? null
}

function latestReflectionEntry(surface: Partial<AlicizationDigitalLifeRuntimeSurface>): AlicizationReflectionEntrySnapshot | null {
  const ledger = surface.memory?.reflectionLedger
  const entries = asArray(ledger?.entries)
  const latestEntryId = ledger?.latestEntryId ?? null
  const latest = entries.find(entry => entry.id === latestEntryId)
  if (latest && latest.outcome !== 'released')
    return latest

  return entries.find(entry => entry.outcome !== 'released')
    ?? entries[0]
    ?? null
}

function summarizeGoal(goal: ReturnType<typeof pickLeadingGoal>) {
  return firstNonEmptyText(goal?.label)
}

function summarizeReflection(entry: AlicizationReflectionEntrySnapshot | null) {
  return firstNonEmptyText(entry?.summary, entry?.revision, entry?.observedOutcome)
}

export function buildAlicizationDigitalLifeMemoryDigest(
  surface: AlicizationDigitalLifeRuntimeSurface | null | undefined,
): AlicizationDigitalLifeSpineMemoryDigest | null {
  if (!surface)
    return null

  const memory = surface.memory ?? null

  const recentEpisode = asArray(memory?.workingMemoryEpisodes).at(-1) ?? null
  const focusBelief = pickFocusBelief(surface)
  const leadingGoal = pickLeadingGoal(surface)
  const dominantConcern = pickDominantConcern(surface)
  const latestReflection = latestReflectionEntry(surface)
  const recallGovernor = memory?.recallGovernor ?? null
  const thoughtThread = pickForegroundThoughtThread(surface)
  const longHorizonMemory = memory?.longHorizonMemory ?? null

  const recentEpisodeSummary = sanitizeText(recentEpisode?.summary, 180) || null
  const focusBeliefStatement = sanitizeText(focusBelief?.statement, 160) || null
  const leadingGoalSummary = sanitizeText(summarizeGoal(leadingGoal), 160) || null
  const dominantConcernSummary = sanitizeText(dominantConcern?.summary, 160) || null
  const reflectionSummary = sanitizeText(summarizeReflection(latestReflection), 180) || null
  const recallMode = sanitizeText(recallGovernor?.mode, 48) || null
  const recallSeed = sanitizeText(recallGovernor?.recallSeed, 160) || null
  const recollectionIntent = recallGovernor?.recollectionIntent ?? null
  const recollectionSummary = recollectionIntent
    ? [
        recollectionIntent.mode ? `mode=${sanitizeText(recollectionIntent.mode, 48)}` : '',
        recollectionIntent.temporalFocus ? `temporal=${sanitizeText(recollectionIntent.temporalFocus, 48)}` : '',
        recollectionIntent.rationale ? `why=${sanitizeText(recollectionIntent.rationale, 120)}` : '',
      ].filter(Boolean).join(' | ') || null
    : null
  const recollectionSurfaceSummary = recollectionIntent
    ? recallGovernor?.carryAsMemory ? 'carry=memory' : 'carry=none'
    : null
  const recollectionConfidence = recollectionIntent
    ? normalizeUnit(recollectionIntent.confidence)
    : null
  const thoughtThreadSummary = sanitizeText(
    firstNonEmptyText(thoughtThread?.summary, thoughtThread?.title, thoughtThread?.question),
    160,
  ) || null
  const longHorizonSummary = sanitizeText(
    firstNonEmptyText(longHorizonMemory?.summary, longHorizonMemory?.dominantCueSummary),
    180,
  ) || null
  const rememberedPreferenceSummary = sanitizeText(longHorizonMemory?.rememberedPreferenceSummary, 180) || null
  const rememberedConstraintSummary = sanitizeText(longHorizonMemory?.rememberedConstraintSummary, 180) || null
  const rememberedPlanSummary = sanitizeText(longHorizonMemory?.rememberedPlanSummary, 180) || null
  const longHorizonCueCount = Array.isArray(longHorizonMemory?.anchorFacts)
    ? longHorizonMemory.anchorFacts.length
    : 0
  const selfEvolution = memory?.selfEvolution ?? null
  const derivedMindStateBundle = memory?.derivedMindStateBundle ?? null
  const personStateProjection = memory?.personStateProjection ?? null

  return {
    summary: [
      recentEpisodeSummary ? `recent=${sanitizeText(recentEpisodeSummary, 72)}` : '',
      leadingGoalSummary ? `goal=${sanitizeText(leadingGoalSummary, 72)}` : '',
      dominantConcernSummary ? `concern=${sanitizeText(dominantConcernSummary, 72)}` : '',
      focusBeliefStatement ? `belief=${sanitizeText(focusBeliefStatement, 72)}` : '',
      reflectionSummary ? `reflection=${sanitizeText(reflectionSummary, 72)}` : '',
      recallMode ? `recall=${recallMode}` : '',
      recollectionSummary ? `recollection=${sanitizeText(recollectionSummary, 72)}` : '',
      thoughtThreadSummary ? `thread=${sanitizeText(thoughtThreadSummary, 72)}` : '',
      longHorizonSummary ? `durable=${sanitizeText(longHorizonSummary, 72)}` : '',
    ].filter(Boolean).join(' | ') || null,
    recentEpisodeSummary,
    recentEpisodeCount: asArray(memory?.workingMemoryEpisodes).length,
    focusBeliefStatement,
    focusBeliefConfidence: normalizeUnit(focusBelief?.confidence),
    leadingGoalSummary,
    dominantConcernSummary,
    reflectionSummary,
    reflectionPressure: normalizeUnit(memory?.reflectionLedger?.revisionPressure),
    recallMode,
    recallSeed,
    recollectionSummary,
    recollectionSurfaceSummary,
    recollectionConfidence,
    thoughtThreadSummary,
    longHorizonSummary,
    rememberedPreferenceSummary,
    rememberedConstraintSummary,
    rememberedPlanSummary,
    longHorizonCueCount,
    selfEvolution: selfEvolution
      ? {
          relationshipDoctrine: sanitizeText(selfEvolution.relationshipDoctrine, 220) || null,
          relationshipCadenceSummary: sanitizeText(selfEvolution.relationshipCadenceSummary, 220) || null,
          latestInflection: sanitizeText(selfEvolution.latestInflection, 220) || null,
          burdenLine: sanitizeText(selfEvolution.burdenLine, 220) || null,
          trustMeaning: sanitizeText(selfEvolution.trustMeaning, 220) || null,
          summary: sanitizeText(selfEvolution.summary, 220) || null,
        }
      : null,
    affectiveResidue: memory?.affectiveResidue ?? null,
    derivedMindStateBundle,
    personStateProjection: personStateProjection
      ? {
          summary: sanitizeText(personStateProjection.summary, 220) || null,
          selfContinuityAuthority: personStateProjection.selfContinuityAuthority
            ? {
                selfLine: sanitizeText(personStateProjection.selfContinuityAuthority.selfLine, 220) || null,
                relationshipLine: sanitizeText(personStateProjection.selfContinuityAuthority.relationshipLine, 220) || null,
                motiveLine: sanitizeText(personStateProjection.selfContinuityAuthority.motiveLine, 220) || null,
                habitLine: sanitizeText(personStateProjection.selfContinuityAuthority.habitLine, 220) || null,
                inwardLine: sanitizeText(personStateProjection.selfContinuityAuthority.inwardLine, 220) || null,
                authoritySummary: sanitizeText(personStateProjection.selfContinuityAuthority.authoritySummary, 220) || null,
              }
            : null,
          activeClosenessContext: sanitizeText(personStateProjection.activeClosenessContext, 64) || null,
          activeClosenessRung: sanitizeText(personStateProjection.activeClosenessRung, 64) || null,
          relationshipPosture: sanitizeText(personStateProjection.relationshipPosture, 64) || null,
          openingGuidance: sanitizeText(personStateProjection.openingGuidance, 220) || null,
          preferredProactiveStyle: sanitizeText(personStateProjection.preferredProactiveStyle, 64) || null,
          manifestationCadenceSummary: sanitizeText(personStateProjection.manifestationCadenceSummary, 220) || null,
        }
      : null,
    memoryClosureTrace: memory?.memoryClosureTrace ?? null,
  }
}
