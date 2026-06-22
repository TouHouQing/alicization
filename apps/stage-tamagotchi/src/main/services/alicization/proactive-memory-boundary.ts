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
  projectStatePreflightSummary?: string | null | undefined
  projectStateEmotionalClosureCue?: string | null | undefined
  projectStatePrimaryOpenLoop?: string | null | undefined
}) {
  const memorySurfaceRestraint = input.memorySurfaceRestraint ?? null
  const projectStateSignal = typeof input.projectStatePreflightSummary === 'string' && input.projectStatePreflightSummary.trim()
    ? input.projectStatePreflightSummary.trim().toLowerCase()
    : typeof input.projectStatePrimaryOpenLoop === 'string'
      ? input.projectStatePrimaryOpenLoop.trim().toLowerCase()
      : ''
  const primaryOpenLoop = projectStateSignal
  const memoryClosureStillOpen = primaryOpenLoop.includes('memory still needs stronger end-to-end closure')
  const emotionalClosureCue = typeof input.projectStateEmotionalClosureCue === 'string'
    ? input.projectStateEmotionalClosureCue.trim().toLowerCase()
    : ''
  const emotionalClosureStillActive = /same her|same-her|low-pressure|lower-pressure|measured-return|repair-before-closeness|rest-protective|quiet-companionship|line holds inward|without reopening from scratch|same living line/u.test(emotionalClosureCue)
  const projectEmotionRequiresMeasuredReturn = emotionalClosureStillActive
    && /same her|same-her|without reopening from scratch|low-pressure|lower-pressure|measured-return/u.test(emotionalClosureCue)
  const projectEmotionRequiresRestProtective = emotionalClosureStillActive
    && /rest-protective|quiet-companionship|line holds inward/u.test(emotionalClosureCue)
  if (!memorySurfaceRestraint) {
    return projectEmotionRequiresMeasuredReturn || projectEmotionRequiresRestProtective
      ? {
          ...input.decision,
          style: 'silent-observe',
          reasonCodes: [
            ...new Set([
              ...input.decision.reasonCodes,
              'project-emotional-closure-active',
              'continuity-next-open-window',
              'relationship-residue-delay-warmth',
              ...(memoryClosureStillOpen ? ['project-memory-closure-still-open'] : []),
            ]),
          ],
          cooldownMs: Math.max(
            input.decision.cooldownMs ?? 0,
            memoryClosureStillOpen ? 24 * 60_000 : 20 * 60_000,
          ),
          companionshipHoldMode: projectEmotionRequiresRestProtective
            ? 'rest-protective'
            : /repair-before-closeness/u.test(emotionalClosureCue)
              ? 'repair-before-closeness'
              : 'measured-return',
        }
      : memoryClosureStillOpen
        ? {
            ...input.decision,
            reasonCodes: [
              ...new Set([
                ...input.decision.reasonCodes,
                'project-memory-closure-still-open',
              ]),
            ],
            cooldownMs: Math.max(input.decision.cooldownMs ?? 0, 12 * 60_000),
          }
        : input.decision
  }

  const shouldHoldForNextOpenWindow = Boolean(
    memorySurfaceRestraint.shouldStayInward
    || memorySurfaceRestraint.shouldDelayUntilAfterPayoff
    || memorySurfaceRestraint.stableCoreOnly
    || memorySurfaceRestraint.visibleCarryMode === 'withhold'
    || projectEmotionRequiresMeasuredReturn
    || projectEmotionRequiresRestProtective,
  )
  if (!shouldHoldForNextOpenWindow) {
    return memoryClosureStillOpen
      ? {
          ...input.decision,
          reasonCodes: [
            ...new Set([
              ...input.decision.reasonCodes,
              'project-memory-closure-still-open',
            ]),
          ],
          cooldownMs: Math.max(input.decision.cooldownMs ?? 0, 12 * 60_000),
        }
      : input.decision
  }

  const nextReasonCodes = [
    ...new Set([
      ...input.decision.reasonCodes,
      'continuity-next-open-window',
      'relationship-residue-delay-warmth',
      ...(memoryClosureStillOpen ? ['project-memory-closure-still-open'] : []),
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
    cooldownMs: Math.max(
      input.decision.cooldownMs ?? 0,
      memoryClosureStillOpen ? 24 * 60_000 : 20 * 60_000,
    ),
    companionshipHoldMode,
  }
}
