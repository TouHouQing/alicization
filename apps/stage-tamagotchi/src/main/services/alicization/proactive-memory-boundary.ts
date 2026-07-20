export interface AlicizationProactiveMemoryBoundaryDecision {
  style: string
  reasonCodes: readonly string[]
  cooldownMs?: number | null
  companionshipHoldMode?: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | 'rest-protective' | null
}

export interface AlicizationProactiveMemoryBoundaryRestraint {
  shouldStayInward?: boolean | null
  shouldDelayUntilAfterPayoff?: boolean | null
  stableCoreOnly?: boolean | null
  visibleCarryMode?: string | null
}

export function applyProactiveMemoryBoundaryRestraint(input: {
  decision: AlicizationProactiveMemoryBoundaryDecision
  memorySurfaceRestraint: AlicizationProactiveMemoryBoundaryRestraint | null | undefined
}) {
  const memorySurfaceRestraint = input.memorySurfaceRestraint ?? null
  if (!memorySurfaceRestraint)
    return input.decision

  const shouldHoldForNextOpenWindow = Boolean(
    memorySurfaceRestraint.shouldStayInward
    || memorySurfaceRestraint.shouldDelayUntilAfterPayoff
    || memorySurfaceRestraint.stableCoreOnly
    || memorySurfaceRestraint.visibleCarryMode === 'withhold',
  )
  if (!shouldHoldForNextOpenWindow)
    return input.decision

  const nextReasonCodes = [
    ...new Set([
      ...input.decision.reasonCodes,
      'continuity-next-open-window',
      'relationship-residue-delay-warmth',
    ]),
  ]
  const companionshipHoldMode = memorySurfaceRestraint.shouldDelayUntilAfterPayoff
    ? 'repair-before-closeness' as const
    : memorySurfaceRestraint.shouldStayInward || memorySurfaceRestraint.visibleCarryMode === 'withhold'
      ? 'measured-return' as const
      : 'quiet-companionship' as const

  return {
    ...input.decision,
    style: 'silent-observe',
    reasonCodes: nextReasonCodes,
    cooldownMs: Math.max(input.decision.cooldownMs ?? 0, 20 * 60_000),
    companionshipHoldMode,
  }
}
