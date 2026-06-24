import type {
  AlicizationLearningExecutionStateSnapshot,
  AlicizationLearningTaskStatus,
  AlicizationSameHerCausalityRepairPressureSnapshot,
  AlicizationSelfEvolutionKernelSnapshot,
} from './alicization-transport-contracts'

export type AlicizationLearningExecutionProjectionMode = 'advisory-only' | 'browser-local-scheduled'

export interface AlicizationLearningExecutionProjectionInput {
  persistedState?: AlicizationLearningExecutionStateSnapshot | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  sameHerCausalityRepairPressure?: AlicizationSameHerCausalityRepairPressureSnapshot | null
  projectionMode?: AlicizationLearningExecutionProjectionMode
}

function sanitizeText(raw: unknown, maxChars = 140) {
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
    if (result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function readInitiativeExecutionRepairFocus(
  repairPressure?: AlicizationSameHerCausalityRepairPressureSnapshot | null,
) {
  if (repairPressure?.status !== 'pending-runtime-evidence')
    return []

  const lane = repairPressure.lanes.find(item => item.lane === 'initiative-execution') ?? null
  if (!lane)
    return []

  return [
    'same-her initiative/execution causality pending',
    'verify proactive opening, execution callback, and learning feedback follow the recalled same-her line',
  ]
}

function readMemoryIdentityRequirementFocus(
  repairPressure?: AlicizationSameHerCausalityRepairPressureSnapshot | null,
) {
  const requirement = repairPressure?.memoryIdentityRequirement ?? null
  if (
    repairPressure?.status !== 'pending-runtime-evidence'
    || requirement?.status !== 'required'
    || requirement.requiredPath !== 'memoryClosureCausality.memoryIdentity'
  ) {
    return []
  }

  return [
    'verify downstream memoryClosureCausality.memoryIdentity before counting memory closure',
    requirement.excludedProofs.length > 0
      ? `reject ${requirement.excludedProofs.map((item) => {
        return item === 'route-chain-text'
          ? 'route-chain text'
          : item.replace(/-/g, ' ')
      }).join(' and ')} as memory closure proof`
      : null,
  ]
}

export function deriveAlicizationLearningExecutionProjection(
  input: AlicizationLearningExecutionProjectionInput,
): AlicizationLearningExecutionStateSnapshot | null {
  if (input.persistedState)
    return input.persistedState

  const selfEvolution = input.selfEvolution ?? null
  const pendingInitiativeExecutionFocus = readInitiativeExecutionRepairFocus(input.sameHerCausalityRepairPressure)
  const pendingMemoryIdentityRequirementFocus = readMemoryIdentityRequirementFocus(input.sameHerCausalityRepairPressure)
  const hasPendingInitiativeExecutionRepair = pendingInitiativeExecutionFocus.length > 0
  const hasPendingMemoryIdentityRequirement = pendingMemoryIdentityRequirementFocus.length > 0

  if (!selfEvolution && !hasPendingInitiativeExecutionRepair && !hasPendingMemoryIdentityRequirement)
    return null

  const nextLearningAction = selfEvolution?.nextLearningAction ?? null
  const projectedLearningAction = (hasPendingInitiativeExecutionRepair || hasPendingMemoryIdentityRequirement) && (!nextLearningAction || nextLearningAction === 'hold')
    ? 'verify'
    : nextLearningAction
  const hasExecutableAction = Boolean(projectedLearningAction && projectedLearningAction !== 'hold')
  const currentStatus: AlicizationLearningTaskStatus | null = hasExecutableAction && input.projectionMode === 'browser-local-scheduled'
    ? 'scheduled'
    : null

  return {
    currentTaskId: null,
    currentStatus,
    currentAttemptCount: 0,
    currentMaxAttempts: 0,
    currentNextRetryAt: null,
    currentBlockedReason: null,
    currentFailureKind: null,
    nextLearningAction: projectedLearningAction,
    shouldRecord: selfEvolution?.shouldRecord ?? false,
    shouldReflect: selfEvolution?.shouldReflect === true || hasPendingInitiativeExecutionRepair || hasPendingMemoryIdentityRequirement,
    shouldVerify: selfEvolution?.shouldVerify === true || hasPendingInitiativeExecutionRepair || hasPendingMemoryIdentityRequirement,
    shouldRevise: selfEvolution?.shouldRevise ?? false,
    shouldInternalize: selfEvolution?.shouldInternalize ?? false,
    activeLearningFocuses: uniqueTexts([
      ...pendingInitiativeExecutionFocus,
      ...pendingMemoryIdentityRequirementFocus,
      ...(selfEvolution?.activeLearningFocuses ?? []),
    ], 12),
    queuedTaskCount: currentStatus === 'scheduled' ? 1 : 0,
    runningTaskCount: 0,
    blockedTaskCount: 0,
    recentTaskIds: [],
    lastCompletedTaskId: null,
    lastCompletedAction: null,
    lastCompletedSummary: null,
    lastFailureTaskId: null,
    lastFailureKind: null,
    lastFailureReason: null,
    lastFailureNextRetryAt: null,
    updatedAt: Number.isFinite(Number(selfEvolution?.updatedAt)) ? Math.max(0, Math.floor(Number(selfEvolution?.updatedAt))) : null,
  }
}
