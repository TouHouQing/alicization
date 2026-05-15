export type RuntimeSubconsciousTickDecisionSurface = {
  shouldInterrupt: boolean
  style: string
  reasonCodes: readonly string[]
}

export type RuntimeSubconsciousTickEntryInput = {
  decision: RuntimeSubconsciousTickDecisionSurface
  autonomyExecutionProposalSurface: unknown | null
}

export type RuntimeSubconsciousTickEntrySurface = {
  hardSuppressed: boolean
  shouldSurfaceAutonomyProposal: boolean
  shouldEnterProactiveFlow: boolean
}

export function resolveRuntimeSubconsciousTickEntry(
  input: RuntimeSubconsciousTickEntryInput,
): RuntimeSubconsciousTickEntrySurface {
  const hardSuppressed = !input.decision.shouldInterrupt
    && (
      input.decision.style === 'silent-observe'
      || input.decision.reasonCodes.includes('kill-switch-suspended')
      || input.decision.reasonCodes.includes('global-cooldown-active')
      || input.decision.reasonCodes.includes('busy-host')
      || input.decision.reasonCodes.includes('fullscreen-host')
    )

  const shouldSurfaceAutonomyProposal = Boolean(
    input.autonomyExecutionProposalSurface
    && !hardSuppressed,
  )

  return {
    hardSuppressed,
    shouldSurfaceAutonomyProposal,
    shouldEnterProactiveFlow: input.decision.shouldInterrupt || shouldSurfaceAutonomyProposal,
  }
}
