import type { AlicizationSelfRevisionEvent } from './self-revision-ledger'
import type { AlicizationSelfRevisionStatePatch } from './state-revision-bus'

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
  const replayRequired = input.patch.validation.requiresRollbackCheck
    || input.patch.validation.requiresRevalidation
    || input.event.verifier.mayInternalize === false
  const rollbackSupported = input.patch.validation.rollbackPlan.length > 0
    || input.patch.validation.requiresRollbackCheck
  const activationBlockedReasons = uniqueList([
    replayRequired ? 'self-evolution:shadow-replay-required' : null,
    input.event.verifier.mayInternalize === false ? 'self-evolution:not-internalizable-yet' : null,
    input.event.resultStatus === 'blocked' ? 'self-evolution:blocked-learning-result' : null,
    input.event.resultStatus === 'failed' ? 'self-evolution:failed-learning-result' : null,
    input.event.resultStatus === 'reopened' ? 'self-evolution:reopened-learning-result' : null,
  ])

  return {
    version: 'self-evolution-version-candidate-v1',
    id: buildCandidateId(input),
    status: activationBlockedReasons.length > 0 ? 'shadow' : 'active',
    sourceEventId: input.event.id,
    decisionTraceId: input.event.decisionTraceId,
    sourceTurnId: input.event.sourceTurnId,
    patch: input.patch,
    validation: {
      replayRequired,
      replayPassed: replayRequired ? null : true,
      rollbackSupported,
      activationBlockedReasons,
    },
    activatedAt: activationBlockedReasons.length > 0 ? null : input.now,
    rolledBackAt: null,
    createdAt: input.now,
  }
}

export function applyAlicizationSelfEvolutionReplayValidation(input: {
  snapshot: AlicizationSelfEvolutionVersionRuntimeSnapshot
  candidateId: string
  replayPassed: boolean
  now: number
}) {
  const candidates = input.snapshot.candidates.map((candidate) => {
    if (candidate.id !== input.candidateId)
      return candidate
    const activationBlockedReasons = input.replayPassed
      ? candidate.validation.activationBlockedReasons.filter(reason => reason !== 'self-evolution:shadow-replay-required')
      : uniqueList([...candidate.validation.activationBlockedReasons, 'self-evolution:shadow-replay-failed'])
    const canActivate = input.replayPassed && activationBlockedReasons.length === 0
    return {
      ...candidate,
      status: canActivate ? 'active' as const : input.replayPassed ? 'shadow' as const : 'rejected' as const,
      validation: {
        ...candidate.validation,
        replayPassed: input.replayPassed,
        activationBlockedReasons,
      },
      activatedAt: canActivate ? input.now : candidate.activatedAt,
    }
  })
  const activeCandidateId = candidates.find(candidate => candidate.status === 'active')?.id
    ?? input.snapshot.activeCandidateId
  return buildAlicizationSelfEvolutionVersionRuntimeSnapshot({
    candidates,
    activeCandidateId,
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
      },
    }
  })
  const activeCandidateId = input.snapshot.activeCandidateId === input.candidateId
    ? candidates.find(candidate => candidate.status === 'active')?.id ?? null
    : input.snapshot.activeCandidateId
  return buildAlicizationSelfEvolutionVersionRuntimeSnapshot({
    candidates,
    activeCandidateId,
  })
}

export function buildAlicizationSelfEvolutionVersionRuntimeSnapshot(input: {
  candidates: AlicizationSelfEvolutionVersionCandidate[]
  activeCandidateId?: string | null
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
    })
    await options.writeSnapshot(next)
    return candidate
  }

  async function validate(input: {
    candidateId: string
    replayPassed: boolean
  }) {
    const next = applyAlicizationSelfEvolutionReplayValidation({
      snapshot: await getSnapshot(),
      candidateId: input.candidateId,
      replayPassed: input.replayPassed,
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
