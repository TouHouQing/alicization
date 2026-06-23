import type { AlicizationSelfEvolutionBaselineAdoptionRecordSnapshot } from '@proj-alicization/stage-shared'

import type { AlicizationSelfRevisionEvent } from './self-revision-ledger'
import type { AlicizationSelfRevisionStatePatch } from './state-revision-bus'

import { resolveAlicizationProjectStateBrief } from '../project-state-brief'

export type AlicizationSelfEvolutionVersionStatus
  = 'shadow'
    | 'active'
    | 'rejected'
    | 'rolled-back'

export interface AlicizationSelfEvolutionVersionCandidate {
  version: 'self-evolution-version-candidate-v1'
  id: string
  status: AlicizationSelfEvolutionVersionStatus
  sourceEventId: string
  decisionTraceId: string | null
  sourceTurnId: string | null
  patch: AlicizationSelfRevisionStatePatch
  validation: {
    replayRequired: boolean
    replayPassed: boolean | null
    rollbackSupported: boolean
    activationBlockedReasons: string[]
    projectStateContinuityReasons?: string[]
    finalReplayGatePassed?: boolean | null
    productionGoldSampleCount?: number | null
    productionGoldCoverage?: number | null
  }
  activatedAt: number | null
  rolledBackAt: number | null
  createdAt: number
}

export interface AlicizationSelfEvolutionVersionRuntimeSnapshot {
  version: 'self-evolution-version-runtime-v1'
  activeCandidateId: string | null
  candidates: AlicizationSelfEvolutionVersionCandidate[]
  reasonCodes: string[]
  baselineAdoptionHistory?: AlicizationSelfEvolutionBaselineAdoptionRecordSnapshot[]
}

function normalizeText(raw: unknown, maxChars = 160) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
    : ''
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 16) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeText(value)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function buildCandidateId(input: {
  event: AlicizationSelfRevisionEvent
  patch: AlicizationSelfRevisionStatePatch
}) {
  return [
    'self-evolution',
    input.event.decisionTraceId ?? input.event.sourceTurnId ?? input.event.id,
    input.patch.id,
  ].join(':')
}

export function buildAlicizationSelfEvolutionVersionCandidate(input: {
  event: AlicizationSelfRevisionEvent
  patch: AlicizationSelfRevisionStatePatch
  now: number
}): AlicizationSelfEvolutionVersionCandidate {
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const projectStatePreflightSummary = projectStateBrief.preflightSummary ?? ''
  const projectStateSameHerHoldDetail
    = input.patch.projectStateContinuity?.sameHerHoldDetail
      ?? input.event.projectStateContinuity?.sameHerHoldDetail
      ?? projectStateBrief.sameHerHoldDetail
      ?? ''
  const projectStatePrimaryOpenLoop = projectStateBrief.openLoops[0] ?? ''
  const projectStateProactiveSameHerGap
    = input.patch.projectStateContinuity?.proactiveSameHerGap
      ?? input.event.projectStateContinuity?.proactiveSameHerGap
      ?? projectStateBrief.proactiveSameHerGap
      ?? ''
  const projectStateSameHerSelfLine = projectStateBrief.sameHerSelfLine ?? ''
  const projectStateSameHerDriftRisk = projectStateBrief.sameHerDriftRisk ?? ''
  const anthropomorphicMemoryClosureStillOpen = `${projectStatePreflightSummary} ${projectStatePrimaryOpenLoop} ${projectStateProactiveSameHerGap} ${projectStateSameHerSelfLine} ${projectStateSameHerDriftRisk} ${projectStateSameHerHoldDetail}`
    .toLowerCase()
    .match(/memory still needs stronger end-to-end closure|same her|same-her|same living line|one continuous "her"|generic assistant shell|project-summary voice|generic project shell|visible proactive hold|subconscious carry|next-session feedback carry/u) != null
  const replayRequired = input.patch.validation.requiresRollbackCheck
    || input.patch.validation.requiresRevalidation
    || input.event.verifier.mayInternalize === false
  const rollbackSupported = input.patch.validation.rollbackPlan.length > 0
    || input.patch.validation.requiresRollbackCheck
  const activationBlockedReasons = uniqueList([
    'self-evolution:shadow-replay-required',
    'self-evolution:final-replay-gate-required',
    'self-evolution:production-gold-required',
    input.event.verifier.mayInternalize === false ? 'self-evolution:not-internalizable-yet' : null,
    input.event.resultStatus === 'blocked' ? 'self-evolution:blocked-learning-result' : null,
    input.event.resultStatus === 'failed' ? 'self-evolution:failed-learning-result' : null,
    input.event.resultStatus === 'reopened' ? 'self-evolution:reopened-learning-result' : null,
  ])

  return {
    version: 'self-evolution-version-candidate-v1',
    id: buildCandidateId(input),
    status: 'shadow',
    sourceEventId: input.event.id,
    decisionTraceId: input.event.decisionTraceId,
    sourceTurnId: input.event.sourceTurnId,
    patch: input.patch,
    validation: {
      replayRequired,
      replayPassed: null,
      rollbackSupported,
      activationBlockedReasons,
      projectStateContinuityReasons: uniqueList([
        projectStatePreflightSummary ? 'self-evolution:project-preflight-carry-present' : null,
        projectStateSameHerHoldDetail ? 'self-evolution:project-same-her-hold-detail-present' : null,
        projectStateProactiveSameHerGap ? 'self-evolution:project-proactive-same-her-gap-present' : null,
        projectStateSameHerSelfLine ? 'self-evolution:project-same-her-self-line-present' : null,
        projectStateSameHerDriftRisk ? 'self-evolution:project-same-her-drift-risk-present' : null,
        anthropomorphicMemoryClosureStillOpen ? 'self-evolution:project-phase-memory-closure-still-open' : null,
      ]),
      finalReplayGatePassed: null,
      productionGoldSampleCount: null,
      productionGoldCoverage: null,
    },
    activatedAt: null,
    rolledBackAt: null,
    createdAt: input.now,
  }
}

export function applyAlicizationSelfEvolutionReplayValidation(input: {
  snapshot: AlicizationSelfEvolutionVersionRuntimeSnapshot
  candidateId: string
  replayPassed: boolean
  finalReplayGatePassed?: boolean | null
  productionGoldSampleCount?: number | null
  productionGoldCoverage?: number | null
  projectStateContinuityDrift?: boolean | null
  projectStateSummary?: {
    comparedTurnCount: number
    identityHitCount: number
    phaseHitCount: number
    openLoopHitCount: number
    sameHerHitCount?: number
    proactiveSameHerGapHitCount?: number
    continuityHitCount: number
  } | null
  projectStateContinuitySummary?: string | null
  now: number
}) {
  const candidates = input.snapshot.candidates.map((candidate) => {
    if (candidate.id !== input.candidateId)
      return candidate
    const finalReplayGatePassed = input.finalReplayGatePassed === true
    const productionGoldSampleCount = Number.isFinite(input.productionGoldSampleCount)
      ? Math.max(0, Math.floor(Number(input.productionGoldSampleCount)))
      : null
    const productionGoldCoverage = Number.isFinite(input.productionGoldCoverage)
      ? Math.max(0, Math.min(1, Number(input.productionGoldCoverage)))
      : null
    const projectStateContinuityDrift = input.projectStateContinuityDrift === true
    const projectStateSummary = input.projectStateSummary ?? null
    const projectStateContinuitySummary = normalizeText(input.projectStateContinuitySummary, 320)
    const comparedTurnCount = Math.max(1, Number(projectStateSummary?.comparedTurnCount ?? 0))
    const identityCarryWeak = projectStateContinuityDrift
      && Number(projectStateSummary?.identityHitCount ?? 0) < comparedTurnCount
    const sameHerCarryWeak = projectStateContinuityDrift
      && Number(projectStateSummary?.sameHerHitCount ?? 0) < comparedTurnCount
    const phaseCarryWeak = projectStateContinuityDrift
      && Number(projectStateSummary?.phaseHitCount ?? 0) < comparedTurnCount
    const openLoopCarryWeak = projectStateContinuityDrift
      && Number(projectStateSummary?.openLoopHitCount ?? 0) < comparedTurnCount
    const proactiveGapCarryWeak = projectStateContinuityDrift
      && Number(projectStateSummary?.proactiveSameHerGapHitCount ?? 0) < comparedTurnCount
    const activationBlockedReasons = input.replayPassed
      ? uniqueList([
          ...candidate.validation.activationBlockedReasons
            .filter(reason => reason !== 'self-evolution:shadow-replay-required')
            .filter(reason => reason !== 'self-evolution:final-replay-gate-required')
            .filter(reason => reason !== 'self-evolution:production-gold-required'),
          finalReplayGatePassed ? null : 'self-evolution:final-replay-gate-required',
          (productionGoldSampleCount ?? 0) > 0 && (productionGoldCoverage ?? 0) > 0
            ? null
            : 'self-evolution:production-gold-required',
          projectStateContinuityDrift ? 'self-evolution:project-state-continuity-drift' : null,
        ])
      : uniqueList([...candidate.validation.activationBlockedReasons, 'self-evolution:shadow-replay-failed'])
    const canActivate = input.replayPassed && finalReplayGatePassed && (productionGoldSampleCount ?? 0) > 0 && (productionGoldCoverage ?? 0) > 0 && activationBlockedReasons.length === 0
    return {
      ...candidate,
      status: canActivate ? 'active' as const : input.replayPassed ? 'shadow' as const : 'rejected' as const,
      validation: {
        ...candidate.validation,
        replayPassed: input.replayPassed,
        activationBlockedReasons,
        projectStateContinuityReasons: uniqueList([
          ...(candidate.validation.projectStateContinuityReasons ?? []),
          projectStateContinuityDrift ? 'self-evolution:project-state-continuity-drift' : null,
          identityCarryWeak ? 'self-evolution:project-state-identity-carry-weak' : null,
          sameHerCarryWeak ? 'self-evolution:project-state-same-her-carry-weak' : null,
          phaseCarryWeak ? 'self-evolution:project-state-phase-carry-weak' : null,
          openLoopCarryWeak ? 'self-evolution:project-state-open-loop-carry-weak' : null,
          proactiveGapCarryWeak ? 'self-evolution:project-state-proactive-gap-carry-weak' : null,
          projectStateContinuitySummary ? `self-evolution:project-state-continuity-summary=${projectStateContinuitySummary}` : null,
        ]),
        finalReplayGatePassed,
        productionGoldSampleCount,
        productionGoldCoverage,
      },
      activatedAt: canActivate ? input.now : candidate.activatedAt,
    }
  })
  const activeCandidateId = candidates.find(candidate => candidate.id === input.candidateId && candidate.status === 'active')?.id
    ?? candidates.find(candidate => candidate.status === 'active')?.id
    ?? input.snapshot.activeCandidateId
  return buildAlicizationSelfEvolutionVersionRuntimeSnapshot({
    candidates,
    activeCandidateId,
    baselineAdoptionHistory: input.snapshot.baselineAdoptionHistory,
  })
}

export function rollbackAlicizationSelfEvolutionCandidate(input: {
  snapshot: AlicizationSelfEvolutionVersionRuntimeSnapshot
  candidateId: string
  reason: string
  now: number
}) {
  const candidates = input.snapshot.candidates.map((candidate) => {
    if (candidate.id !== input.candidateId)
      return candidate
    return {
      ...candidate,
      status: 'rolled-back' as const,
      rolledBackAt: input.now,
      validation: {
        ...candidate.validation,
        activationBlockedReasons: uniqueList([
          ...candidate.validation.activationBlockedReasons,
          `rollback:${input.reason}`,
        ]),
        projectStateContinuityReasons: candidate.validation.projectStateContinuityReasons ?? [],
      },
    }
  })
  const activeCandidateId = input.snapshot.activeCandidateId === input.candidateId
    ? candidates.find(candidate => candidate.status === 'active')?.id ?? null
    : input.snapshot.activeCandidateId
  return buildAlicizationSelfEvolutionVersionRuntimeSnapshot({
    candidates,
    activeCandidateId,
    baselineAdoptionHistory: input.snapshot.baselineAdoptionHistory,
  })
}

export function buildAlicizationSelfEvolutionVersionRuntimeSnapshot(input: {
  candidates: AlicizationSelfEvolutionVersionCandidate[]
  activeCandidateId?: string | null
  baselineAdoptionHistory?: AlicizationSelfEvolutionBaselineAdoptionRecordSnapshot[] | null
}): AlicizationSelfEvolutionVersionRuntimeSnapshot {
  const deduped = new Map(input.candidates.map(candidate => [candidate.id, candidate]))
  const candidates = [...deduped.values()]
    .sort((left, right) => left.createdAt - right.createdAt)
    .slice(-128)
  const activeCandidateId = input.activeCandidateId
    ?? [...candidates].reverse().find(candidate => candidate.status === 'active')?.id
    ?? null
  return {
    version: 'self-evolution-version-runtime-v1',
    activeCandidateId,
    candidates,
    reasonCodes: uniqueList([
      candidates.some(candidate => candidate.status === 'shadow') ? 'self-evolution:shadow-candidates-present' : null,
      candidates.some(candidate => candidate.status === 'rolled-back') ? 'self-evolution:rollback-history-present' : null,
      activeCandidateId ? 'self-evolution:active-version-present' : 'self-evolution:no-active-version',
    ]),
    baselineAdoptionHistory: input.baselineAdoptionHistory?.slice(0, 32) ?? [],
  }
}

export function createAlicizationSelfEvolutionVersionRuntime(options: {
  now: () => number
  readSnapshot: () => Promise<AlicizationSelfEvolutionVersionRuntimeSnapshot | null>
  writeSnapshot: (snapshot: AlicizationSelfEvolutionVersionRuntimeSnapshot) => Promise<void>
}) {
  async function getSnapshot() {
    return await options.readSnapshot().catch(() => null)
      ?? buildAlicizationSelfEvolutionVersionRuntimeSnapshot({ candidates: [] })
  }

  async function getActiveCandidate() {
    const snapshot = await getSnapshot()
    return snapshot.candidates.find(candidate => candidate.id === snapshot.activeCandidateId)
      ?? [...snapshot.candidates].reverse().find(candidate => candidate.status === 'active')
      ?? null
  }

  async function getActivePatch() {
    return (await getActiveCandidate())?.patch ?? null
  }

  async function propose(input: {
    event: AlicizationSelfRevisionEvent
    patch: AlicizationSelfRevisionStatePatch
  }) {
    const previous = await getSnapshot()
    const candidate = buildAlicizationSelfEvolutionVersionCandidate({
      ...input,
      now: options.now(),
    })
    const next = buildAlicizationSelfEvolutionVersionRuntimeSnapshot({
      candidates: [...previous.candidates, candidate],
      activeCandidateId: candidate.status === 'active' ? candidate.id : previous.activeCandidateId,
      baselineAdoptionHistory: previous.baselineAdoptionHistory,
    })
    await options.writeSnapshot(next)
    return candidate
  }

  async function validate(input: {
    candidateId: string
    replayPassed: boolean
    finalReplayGatePassed?: boolean | null
    productionGoldSampleCount?: number | null
    productionGoldCoverage?: number | null
    projectStateContinuityDrift?: boolean | null
    projectStateSummary?: {
      comparedTurnCount: number
      identityHitCount: number
      phaseHitCount: number
      openLoopHitCount: number
      sameHerHitCount?: number
      proactiveSameHerGapHitCount?: number
      continuityHitCount: number
    } | null
    projectStateContinuitySummary?: string | null
  }) {
    const next = applyAlicizationSelfEvolutionReplayValidation({
      snapshot: await getSnapshot(),
      candidateId: input.candidateId,
      replayPassed: input.replayPassed,
      finalReplayGatePassed: input.finalReplayGatePassed,
      productionGoldSampleCount: input.productionGoldSampleCount,
      productionGoldCoverage: input.productionGoldCoverage,
      projectStateContinuityDrift: input.projectStateContinuityDrift,
      projectStateSummary: input.projectStateSummary,
      projectStateContinuitySummary: input.projectStateContinuitySummary,
      now: options.now(),
    })
    await options.writeSnapshot(next)
    return next
  }

  async function rollback(input: {
    candidateId: string
    reason: string
  }) {
    const next = rollbackAlicizationSelfEvolutionCandidate({
      snapshot: await getSnapshot(),
      candidateId: input.candidateId,
      reason: input.reason,
      now: options.now(),
    })
    await options.writeSnapshot(next)
    return next
  }

  return {
    getActiveCandidate,
    getActivePatch,
    getSnapshot,
    propose,
    validate,
    rollback,
  }
}
