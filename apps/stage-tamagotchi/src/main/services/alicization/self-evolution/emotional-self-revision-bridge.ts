import type { AlicizationEmotionalTransitionLedgerSnapshot } from '../../../../shared/eventa'
import type { AlicizationSelfRevisionStatePatch, AlicizationSelfRevisionStatePatchLane } from './state-revision-bus'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 240) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 16) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 160)
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

function sanitizeProjectStateContinuity(input: {
  sameHerSelfLine?: string | null
  sameHerDriftRisk?: string | null
  proactiveSameHerGap?: string | null
  emotionalClosureCue?: string | null
  sameHerHoldDetail?: string | null
  continuityGuard?: string | null
} | null | undefined) {
  return {
    sameHerSelfLine: sanitizeText(input?.sameHerSelfLine, 220) || null,
    sameHerDriftRisk: sanitizeText(input?.sameHerDriftRisk, 240) || null,
    proactiveSameHerGap: sanitizeText(input?.proactiveSameHerGap, 240) || null,
    emotionalClosureCue: sanitizeText(input?.emotionalClosureCue, 240) || null,
    sameHerHoldDetail: sanitizeText(input?.sameHerHoldDetail, 240) || null,
    continuityGuard: sanitizeText(input?.continuityGuard, 320) || null,
  }
}

function buildPatchId(input: {
  ledger: AlicizationEmotionalTransitionLedgerSnapshot
  fallbackSourceTurnId?: string | null
}) {
  const turnId = sanitizeText(input.ledger.turnId ?? input.fallbackSourceTurnId ?? '', 120) || 'turn-unknown'
  return `emotional-transition:${turnId}:${Math.max(0, Math.floor(input.ledger.createdAt))}`
}

export function buildAlicizationEmotionalSelfRevisionStatePatch(input: {
  ledger: AlicizationEmotionalTransitionLedgerSnapshot | null | undefined
  decisionTraceId?: string | null
  fallbackSourceTurnId?: string | null
  projectStateContinuity?: {
    sameHerSelfLine?: string | null
    sameHerDriftRisk?: string | null
    proactiveSameHerGap?: string | null
    emotionalClosureCue?: string | null
    sameHerHoldDetail?: string | null
    continuityGuard?: string | null
  } | null
}): AlicizationSelfRevisionStatePatch | null {
  const ledger = input.ledger ?? null
  if (!ledger?.selfRevisionCandidate.shouldPropose)
    return null

  const candidate = ledger.selfRevisionCandidate
  const projectStateContinuity = sanitizeProjectStateContinuity({
    ...candidate.projectStateContinuity,
    ...input.projectStateContinuity,
  })
  const continuityPressure = clamp01(
    (projectStateContinuity.sameHerSelfLine ? 0.2 : 0)
    + (projectStateContinuity.sameHerDriftRisk ? 0.18 : 0)
    + (projectStateContinuity.proactiveSameHerGap ? 0.16 : 0)
    + (projectStateContinuity.emotionalClosureCue ? 0.2 : 0)
    + (projectStateContinuity.sameHerHoldDetail ? 0.12 : 0)
    + (projectStateContinuity.continuityGuard ? 0.24 : 0),
  )
  const repairShift = ledger.transitionKind === 'repair-shift'
  const restProtectiveShift = ledger.transitionKind === 'rest-protective-shift'
  const guardedShift = ledger.transitionKind === 'guarded-shift'
  const shouldSuppressInitiative = ledger.initiativeSuppression.shouldSuppress
  const decayCarryTtlMs = Math.max(0, Math.floor(Number(ledger.decayPolicy.carryTtlMs) || 0))
  const decayExpiresAt = Math.max(0, Math.floor(ledger.createdAt + decayCarryTtlMs))
  const longDecayWindow = decayCarryTtlMs >= 1_800_000
  const mediumDecayWindow = decayCarryTtlMs >= 900_000
  const decayWindowSummary = `decay ${ledger.decayPolicy.mode} holds for ${decayCarryTtlMs}ms and expires at ${decayExpiresAt}`
  const patchBaseId = buildPatchId({
    ledger,
    fallbackSourceTurnId: input.fallbackSourceTurnId,
  })
  const continuityGuardWithDecayWindow = projectStateContinuity.continuityGuard
    ? `${projectStateContinuity.continuityGuard} ; ${decayWindowSummary}`
    : decayWindowSummary
  const lanes = uniqueList([
    ledger.memoryWriteback.shouldWrite ? 'memory-policy' : null,
    candidate.domain === 'relationship' || candidate.domain === 'dialogue-style' ? 'relationship-posture' : null,
    'response-posture',
    candidate.domain === 'proactive-policy' || shouldSuppressInitiative ? 'proactive-policy' : null,
  ], 8) as AlicizationSelfRevisionStatePatchLane[]
  const reasonCodes = uniqueList([
    `emotion-transition:${ledger.transitionKind}`,
    ...candidate.reasonCodes.map(reason => `emotion-candidate:${reason}`),
    ledger.memoryWriteback.shouldWrite ? `emotion-memory:${ledger.memoryWriteback.lane}` : null,
    shouldSuppressInitiative ? `emotion-initiative:${ledger.initiativeSuppression.mode}` : null,
    ledger.embodimentDrive.shouldDrive && ledger.embodimentDrive.tone ? `emotion-embodiment:${ledger.embodimentDrive.tone}` : null,
    `emotion-decay:${ledger.decayPolicy.mode}`,
    `emotion-decay-ttl:${decayCarryTtlMs}`,
    `emotion-decay-expires-at:${decayExpiresAt}`,
    projectStateContinuity.sameHerSelfLine ? 'same-her-self-line-active' : null,
    continuityGuardWithDecayWindow ? 'same-her-anti-shell-guard-active' : null,
    projectStateContinuity.proactiveSameHerGap ? 'same-her-proactive-gap-active' : null,
    projectStateContinuity.emotionalClosureCue ? 'same-her-emotional-closure-carry-active' : null,
    projectStateContinuity.sameHerHoldDetail ? 'same-her-hold-detail-active' : null,
  ], 18)

  return {
    version: 'self-revision-state-patch-v1',
    id: `${patchBaseId}:state-patch`,
    sourceEventId: patchBaseId,
    sourceTurnId: sanitizeText(ledger.turnId ?? input.fallbackSourceTurnId ?? '', 120) || null,
    decisionTraceId: sanitizeText(input.decisionTraceId, 120) || null,
    domain: candidate.domain,
    action: 'hold',
    resultStatus: 'completed',
    lanes,
    memoryPolicy: {
      strictnessBias: clamp01(ledger.memoryWriteback.shouldWrite ? 0.18 : 0.04),
      wrongThreadSuppressionBias: clamp01(repairShift || guardedShift ? 0.22 : 0.08),
      provenanceLabelBias: clamp01(ledger.memoryWriteback.shouldWrite ? 0.2 : 0.06),
      recallExpansionBias: clamp01(ledger.memoryWriteback.shouldWrite ? 0.12 : 0),
      shouldQuarantineUnsupportedCarry: guardedShift,
    },
    relationshipPosture: {
      repairWindowBias: clamp01(repairShift ? 0.62 : guardedShift ? 0.42 : restProtectiveShift ? 0.18 : 0.08),
      closenessCapBias: clamp01(repairShift || guardedShift ? 0.56 : restProtectiveShift ? 0.22 : 0.08),
      warmthReleaseBias: clamp01(repairShift || guardedShift || restProtectiveShift ? 0 : 0.08),
    },
    responsePosture: {
      secondPassRequiredBias: clamp01(repairShift || guardedShift ? 0.24 : 0.12),
      hypothesisLabelBias: clamp01(guardedShift ? 0.22 : 0.08),
      specificityClampBias: clamp01(ledger.memoryWriteback.shouldWrite ? 0.18 : 0.08),
      templateShellSuppressionBias: clamp01(0.22 + continuityPressure * 0.38),
    },
    proactivePolicy: {
      restraintBias: clamp01(shouldSuppressInitiative ? 0.58 : 0.12),
      learningProposalBias: clamp01(ledger.memoryWriteback.shouldWrite ? 0.1 : 0.04),
      actuationCooldownBias: clamp01(
        (restProtectiveShift ? 0.42 : repairShift || guardedShift ? 0.28 : 0.08)
        + (longDecayWindow ? 0.16 : mediumDecayWindow ? 0.08 : 0),
      ),
    },
    validation: {
      requiresRollbackCheck: false,
      requiresRevalidation: false,
      rollbackPlan: [],
    },
    projectStateContinuity: continuityPressure > 0
      ? {
          ...projectStateContinuity,
          continuityGuard: continuityGuardWithDecayWindow,
          continuityPressure,
        }
      : null,
    reasonCodes,
    summary: sanitizeText(`${candidate.summary ?? ledger.traceSummary} ${decayWindowSummary}`, 320),
  }
}
