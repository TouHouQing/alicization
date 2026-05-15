import { describe, expect, it } from 'vitest'

import { resolveRuntimeSubconsciousTickEntry } from './runtime-subconscious-tick-entry'

describe('resolveRuntimeSubconsciousTickEntry', () => {
  it('hard suppresses silent-observe and host/cooldown decisions without surfacing autonomy proposals', () => {
    expect(
      resolveRuntimeSubconsciousTickEntry({
        decision: {
          shouldInterrupt: false,
          style: 'silent-observe',
          reasonCodes: ['global-cooldown-active'],
        },
        autonomyExecutionProposalSurface: {
          thought: 'stay steady',
        },
      }),
    ).toEqual({
      hardSuppressed: true,
      shouldSurfaceAutonomyProposal: false,
      shouldEnterProactiveFlow: false,
    })
  })

  it('hard suppresses autonomy proposals when a suppression reason blocks entry', () => {
    expect(
      resolveRuntimeSubconsciousTickEntry({
        decision: {
          shouldInterrupt: false,
          style: 'soft-nudge',
          reasonCodes: ['busy-host'],
        },
        autonomyExecutionProposalSurface: {
          thought: 'offer a reminder',
        },
      }),
    ).toEqual({
      hardSuppressed: true,
      shouldSurfaceAutonomyProposal: false,
      shouldEnterProactiveFlow: false,
    })
  })

  it('surfaces an autonomy proposal when the decision is non-silent and not hard suppressed', () => {
    expect(
      resolveRuntimeSubconsciousTickEntry({
        decision: {
          shouldInterrupt: false,
          style: 'soft-nudge',
          reasonCodes: [],
        },
        autonomyExecutionProposalSurface: {
          thought: 'offer a reminder',
        },
      }),
    ).toEqual({
      hardSuppressed: false,
      shouldSurfaceAutonomyProposal: true,
      shouldEnterProactiveFlow: true,
    })
  })
})
