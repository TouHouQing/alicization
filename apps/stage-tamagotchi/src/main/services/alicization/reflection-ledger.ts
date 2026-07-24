import type {
  AlicizationAnswerPlannerSnapshot,
  AlicizationIntentionStreamSnapshot,
  AlicizationMindProjectSnapshot,
  AlicizationReflectionEntrySnapshot,
  AlicizationReflectionLedgerSnapshot,
  AlicizationReflectionOutcome,
  AlicizationRepairLedgerSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'

const reflectionLimit = 6
const reflectionTtlMs = 45 * 60_000

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function dominantProject(stream?: AlicizationIntentionStreamSnapshot | null) {
  return stream?.projects.find(project => project.id === stream.dominantProjectId)
    ?? stream?.projects[0]
    ?? null
}

function governingRepair(ledger?: AlicizationRepairLedgerSnapshot | null) {
  return ledger?.entries.find(entry => entry.id === ledger.governingRepairId)
    ?? ledger?.entries[0]
    ?? null
}

function latestEntry(ledger?: AlicizationReflectionLedgerSnapshot | null) {
  const latest = ledger?.entries.find(entry => entry.id === ledger.latestEntryId)
  if (latest && latest.outcome !== 'released')
    return latest

  return ledger?.entries.find(entry => entry.outcome !== 'released')
    ?? ledger?.entries[0]
    ?? null
}

function stableEntryId(input: {
  projectId?: string | null
  act?: string | null
  outcome: AlicizationReflectionOutcome
  summary: string
}) {
  return [
    'reflection-ledger',
    sanitizeText(input.projectId, 160).toLowerCase() || 'projectless',
    sanitizeText(input.act, 80).toLowerCase() || 'actless',
    input.outcome,
    sanitizeText(input.summary, 120).toLowerCase() || 'global',
  ].join('::')
}

function createEntry(input: {
  now: number
  previous?: AlicizationReflectionEntrySnapshot | null
  project?: AlicizationMindProjectSnapshot | null
  act?: AlicizationAnswerPlannerSnapshot['act'] | null
  repairId?: string | null
  threadId?: string | null
  summary: string
  expectation: string
  observedOutcome: string
  outcome: AlicizationReflectionOutcome
  revision: string
  confidenceShift: number
}) {
  return {
    id: stableEntryId({
      projectId: input.project?.id ?? null,
      act: input.act ?? null,
      outcome: input.outcome,
      summary: input.summary,
    }),
    targetProjectId: input.project?.id ?? null,
    targetAnswerAct: input.act ?? null,
    targetRepairId: sanitizeText(input.repairId, 160) || null,
    targetThreadId: sanitizeText(input.threadId, 160) || null,
    summary: sanitizeText(input.summary, 180) || input.outcome,
    expectation: sanitizeText(input.expectation, 220),
    observedOutcome: sanitizeText(input.observedOutcome, 220),
    outcome: input.outcome,
    revision: sanitizeText(input.revision, 220),
    confidenceShift: clamp(Number(input.confidenceShift.toFixed(2)), -0.3, 0.3),
    createdAt: input.previous?.createdAt ?? input.now,
  } satisfies AlicizationReflectionEntrySnapshot
}

function maybeCreateRepairReflection(input: {
  now: number
  previousProject: AlicizationMindProjectSnapshot | null
  previousAnswerPlanner?: AlicizationAnswerPlannerSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  previousReflection?: AlicizationReflectionEntrySnapshot | null
}) {
  const repair = governingRepair(input.repairLedger)
  const previousProject = input.previousProject
  const previousAct = input.previousAnswerPlanner?.act ?? null
  const wasRepairLine = previousProject?.kind === 'repair-truth'
    || previousProject?.kind === 'reacquire-scene'
    || previousAct === 'ask-reground'
    || previousAct === 'correct-stale-anchor'
  if (!wasRepairLine)
    return null

  if (
    input.worldModel?.epistemicState.certainty === 'grounded'
    && input.worldModel?.activeThread?.source === 'grounded-scene'
    && !input.repairLedger?.shouldConstrainPresentTense
  ) {
    return createEntry({
      now: input.now,
      previous: input.previousReflection,
      project: previousProject,
      act: previousAct,
      repairId: repair?.id ?? null,
      threadId: input.worldModel?.activeThread?.id ?? null,
      summary: input.worldModel?.activeThread?.summary ?? previousProject?.summary ?? repair?.summary ?? '',
      expectation: repair?.rationale ?? previousProject?.summary ?? '',
      observedOutcome: input.worldModel?.activeThread?.summary ?? input.worldModel?.activeThread?.title ?? '',
      outcome: previousAct === 'correct-stale-anchor' ? 'corrected' : 'helped',
      revision: input.worldModel?.activeThread?.summary ?? repair?.summary ?? '',
      confidenceShift: 0.08,
    })
  }

  if (
    input.repairLedger?.shouldConstrainPresentTense
    || input.worldModel?.epistemicState.certainty === 'uncertain'
    || input.worldModel?.epistemicState.certainty === 'lingering'
    || repair?.kind === 'stale-scene-anchor'
  ) {
    return createEntry({
      now: input.now,
      previous: input.previousReflection,
      project: previousProject,
      act: previousAct,
      repairId: repair?.id ?? null,
      threadId: input.worldModel?.activeThread?.id ?? null,
      summary: repair?.summary ?? previousProject?.summary ?? input.worldModel?.activeThread?.summary ?? '',
      expectation: repair?.rationale ?? previousProject?.summary ?? '',
      observedOutcome: [
        ...(input.worldModel?.epistemicState.openQuestions ?? []),
        ...(input.worldModel?.epistemicState.staleRisks ?? []),
        input.worldModel?.activeThread?.summary,
      ].filter(Boolean).join(' '),
      outcome: previousAct === 'correct-stale-anchor' ? 'missed' : 'stalled',
      revision: repair?.summary ?? previousProject?.summary ?? '',
      confidenceShift: previousAct === 'correct-stale-anchor' ? -0.1 : -0.06,
    })
  }

  return null
}

function maybeCreateThreadReflection(input: {
  now: number
  previousProject: AlicizationMindProjectSnapshot | null
  previousAnswerPlanner?: AlicizationAnswerPlannerSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  previousReflection?: AlicizationReflectionEntrySnapshot | null
}) {
  const previousProject = input.previousProject
  const previousAct = input.previousAnswerPlanner?.act ?? null
  const wasProblemLine = previousProject?.kind === 'hold-knot' || previousAct === 'guide'
  if (!wasProblemLine)
    return null

  const movedAwayFromThread
    = Boolean(previousProject?.targetThreadId)
      && input.worldModel?.activeThread?.id !== previousProject?.targetThreadId
      && input.worldModel?.activeThread?.source !== 'continuity'
  if (movedAwayFromThread || input.worldModel?.activeThread?.unresolved === false) {
    return createEntry({
      now: input.now,
      previous: input.previousReflection,
      project: previousProject,
      act: previousAct,
      threadId: previousProject?.targetThreadId ?? input.worldModel?.activeThread?.id ?? null,
      summary: previousProject?.summary ?? input.worldModel?.activeThread?.summary ?? input.worldModel?.activeThread?.title ?? '',
      expectation: previousProject?.summary ?? '',
      observedOutcome: input.worldModel?.activeThread?.summary ?? input.worldModel?.activeThread?.title ?? '',
      outcome: 'released',
      revision: input.worldModel?.activeThread?.summary ?? '',
      confidenceShift: 0.05,
    })
  }

  if (
    input.worldModel?.activeThread?.id === previousProject?.targetThreadId
    && input.worldModel?.activeThread?.unresolved
    && input.worldModel?.epistemicState.certainty !== 'grounded'
  ) {
    return createEntry({
      now: input.now,
      previous: input.previousReflection,
      project: previousProject,
      act: previousAct,
      threadId: previousProject?.targetThreadId ?? null,
      summary: input.worldModel?.activeThread?.summary ?? previousProject?.summary ?? '',
      expectation: previousProject?.summary ?? '',
      observedOutcome: [
        input.worldModel?.activeThread?.summary,
        ...(input.worldModel?.epistemicState.openQuestions ?? []),
      ].filter(Boolean).join(' '),
      outcome: 'stalled',
      revision: input.worldModel?.activeThread?.summary ?? previousProject?.summary ?? '',
      confidenceShift: -0.05,
    })
  }

  return null
}

function maybeCreateCareReflection(input: {
  now: number
  previousProject: AlicizationMindProjectSnapshot | null
  previousAnswerPlanner?: AlicizationAnswerPlannerSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  previousReflection?: AlicizationReflectionEntrySnapshot | null
}) {
  const previousProject = input.previousProject
  const previousAct = input.previousAnswerPlanner?.act ?? null
  if (previousProject?.kind !== 'care-host' && previousAct !== 'care')
    return null

  if (
    input.worldModel?.hostState.availability === 'open'
    || input.worldModel?.hostState.availability === 'drifting'
    || input.worldModel?.activeThread?.kind !== 'late-night-endurance'
  ) {
    return createEntry({
      now: input.now,
      previous: input.previousReflection,
      project: previousProject,
      act: previousAct,
      threadId: input.worldModel?.activeThread?.id ?? null,
      summary: previousProject?.summary ?? input.worldModel?.activeThread?.summary ?? '',
      expectation: previousProject?.summary ?? '',
      observedOutcome: input.worldModel?.activeThread?.summary ?? '',
      outcome: 'helped',
      revision: input.worldModel?.activeThread?.summary ?? previousProject?.summary ?? '',
      confidenceShift: 0.04,
    })
  }

  return null
}

export function buildReflectionLedger(input: {
  now: number
  worldModel?: AlicizationWorldModelSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  intentionStream?: AlicizationIntentionStreamSnapshot | null
  previousIntentionStream?: AlicizationIntentionStreamSnapshot | null
  previousAnswerPlanner?: AlicizationAnswerPlannerSnapshot | null
  persistedEntries?: AlicizationReflectionEntrySnapshot[] | null
  previous?: AlicizationReflectionLedgerSnapshot | null
}): AlicizationReflectionLedgerSnapshot {
  const previousEntries = [...(input.persistedEntries ?? []), ...(input.previous?.entries ?? [])]
    .filter(entry => input.now - entry.createdAt <= reflectionTtlMs)
    .filter((entry, index, entries) => entries.findIndex(candidate => candidate.id === entry.id) === index)
    .sort((left, right) => right.createdAt - left.createdAt)
  const previousReflection = latestEntry(input.previous)
  const previousProject = dominantProject(input.previousIntentionStream)

  const nextEntry
    = maybeCreateRepairReflection({
      now: input.now,
      previousProject,
      previousAnswerPlanner: input.previousAnswerPlanner,
      worldModel: input.worldModel,
      repairLedger: input.repairLedger,
      previousReflection,
    })
    ?? maybeCreateThreadReflection({
      now: input.now,
      previousProject,
      previousAnswerPlanner: input.previousAnswerPlanner,
      worldModel: input.worldModel,
      previousReflection,
    })
    ?? maybeCreateCareReflection({
      now: input.now,
      previousProject,
      previousAnswerPlanner: input.previousAnswerPlanner,
      worldModel: input.worldModel,
      previousReflection,
    })

  const dedupedEntries = [...previousEntries]
  if (nextEntry && !dedupedEntries.some(entry => entry.id === nextEntry.id))
    dedupedEntries.unshift(nextEntry)

  const entries = dedupedEntries.slice(0, reflectionLimit)
  const latest = entries.find(entry => entry.outcome !== 'released')
    ?? entries[0]
    ?? null

  return {
    latestEntryId: latest?.id ?? null,
    entries,
    revisionPressure: clamp01(entries.reduce((sum, entry) => {
      if (entry.outcome === 'missed')
        return sum + 0.22
      if (entry.outcome === 'stalled')
        return sum + 0.16
      if (entry.outcome === 'corrected')
        return sum + 0.1
      return sum
    }, 0)),
    narrative: [
      latest ? `latest_reflection:${latest.outcome}` : 'latest_reflection:none',
      latest?.revision ?? '',
      input.intentionStream?.dominantProjectId ? `carrying_project:${input.intentionStream.dominantProjectId}` : '',
    ].filter(Boolean),
    updatedAt: input.now,
  } satisfies AlicizationReflectionLedgerSnapshot
}
