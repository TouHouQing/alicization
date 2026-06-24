export interface RuntimeSubconsciousTickDecisionSurface {
  shouldInterrupt: boolean
  style: string
  reasonCodes: readonly string[]
  presenceOnlyHold?: boolean
}

export interface RuntimeSubconsciousTickEntryInput {
  decision: RuntimeSubconsciousTickDecisionSurface
  autonomyExecutionProposalSurface: unknown | null
}

export interface RuntimeSubconsciousTickEntrySurface {
  hardSuppressed: boolean
  shouldEnterProactiveFlow: boolean
  shouldHoldVisibleUtterance: boolean
}

export function resolveRuntimeSubconsciousTickEntry(
  input: RuntimeSubconsciousTickEntryInput,
): RuntimeSubconsciousTickEntrySurface {
  const screenGroundedVerifyFirstVisibleNudge = !input.decision.shouldInterrupt
    && (input.decision.style === 'light-nudge' || input.decision.style === 'silent-observe')
    && input.decision.reasonCodes.includes('coding-focus')
    && input.decision.reasonCodes.includes('foreground-error')
    && (
      input.decision.reasonCodes.includes('belief-contradicted')
      || input.decision.reasonCodes.includes('world-model-revalidation-required')
    )

  const hardSuppressed = !input.decision.shouldInterrupt
    && (
      input.decision.reasonCodes.includes('kill-switch-suspended')
      || input.decision.reasonCodes.includes('global-cooldown-active')
      || input.decision.reasonCodes.includes('busy-host')
      || input.decision.reasonCodes.includes('fullscreen-host')
    )

  const shouldSurfaceAutonomyProposal = Boolean(
    input.autonomyExecutionProposalSurface
    && !hardSuppressed,
  )

  const shouldHoldVisibleUtterance = !hardSuppressed
    && !input.decision.shouldInterrupt
    && !screenGroundedVerifyFirstVisibleNudge
    && !shouldSurfaceAutonomyProposal
    && (
      input.decision.presenceOnlyHold === true
      || input.decision.reasonCodes.includes('continuity-next-open-window')
      || input.decision.reasonCodes.includes('private-thought-observe-only')
      || input.decision.reasonCodes.includes('relationship-residue-delay-warmth')
    )

  const shouldSurfaceSilentObservePresence = !hardSuppressed
    && input.decision.style === 'silent-observe'

  return {
    hardSuppressed,
    shouldEnterProactiveFlow: input.decision.shouldInterrupt || shouldSurfaceAutonomyProposal || shouldSurfaceSilentObservePresence || screenGroundedVerifyFirstVisibleNudge,
    shouldHoldVisibleUtterance,
  }
}
