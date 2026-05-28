import { describe, expect, it } from 'vitest'

import { resolveRuntimeSubconsciousTickEntry } from './runtime-subconscious-tick-entry'

describe('resolveRuntimeSubconsciousTickEntry', () => {
  it('lets silent-observe decisions enter proactive flow as low-pressure presence', () => {
    expect(resolveRuntimeSubconsciousTickEntry({
      decision: {
        shouldInterrupt: false,
        style: 'silent-observe',
        reasonCodes: [],
      },
      autonomyExecutionProposalSurface: { reply: 'stay quiet' },
    })).toEqual({
      hardSuppressed: false,
      shouldEnterProactiveFlow: true,
      shouldHoldVisibleUtterance: false,
    })
  })

  it('hard-suppresses host and cooldown reasons even when the style is not silent-observe', () => {
    expect(resolveRuntimeSubconsciousTickEntry({
      decision: {
        shouldInterrupt: false,
        style: 'gentle-care',
        reasonCodes: ['busy-host', 'global-cooldown-active'],
      },
      autonomyExecutionProposalSurface: { reply: 'stay quiet' },
    })).toEqual({
      hardSuppressed: true,
      shouldEnterProactiveFlow: false,
      shouldHoldVisibleUtterance: false,
    })
  })

  it('surfaces an autonomy proposal when the decision is not hard suppressed', () => {
    expect(resolveRuntimeSubconsciousTickEntry({
      decision: {
        shouldInterrupt: false,
        style: 'light-nudge',
        reasonCodes: [],
      },
      autonomyExecutionProposalSurface: { reply: 'do the thing' },
    })).toEqual({
      hardSuppressed: false,
      shouldEnterProactiveFlow: true,
      shouldHoldVisibleUtterance: false,
    })
  })

  it('enters proactive flow immediately when the policy already authorizes interruption', () => {
    expect(resolveRuntimeSubconsciousTickEntry({
      decision: {
        shouldInterrupt: true,
        style: 'gentle-care',
        reasonCodes: ['global-cooldown-active'],
      },
      autonomyExecutionProposalSurface: null,
    })).toEqual({
      hardSuppressed: false,
      shouldEnterProactiveFlow: true,
      shouldHoldVisibleUtterance: false,
    })
  })

  it('marks observe-first lower-pressure continuity returns as proactive-flow holds instead of early visible interruption', () => {
    expect(resolveRuntimeSubconsciousTickEntry({
      decision: {
        shouldInterrupt: false,
        style: 'silent-observe',
        reasonCodes: [
          'continuity-next-open-window',
          'private-thought-observe-only',
          'relationship-residue-delay-warmth',
        ],
      },
      autonomyExecutionProposalSurface: null,
    })).toEqual({
      hardSuppressed: false,
      shouldEnterProactiveFlow: true,
      shouldHoldVisibleUtterance: true,
    })
  })
})
