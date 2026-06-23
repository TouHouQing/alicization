import { describe, expect, it } from 'vitest'

import {
  buildPerformanceVisualizerClosureNavigationState,
  readPerformanceVisualizerClosureNavigationContext,
} from './performance-visualizer-closure-navigation'

describe('performance visualizer closure navigation', () => {
  it('routes same-her continuity diagnostics into renderer authority evidence before generic repair-path defaults', () => {
    const context = readPerformanceVisualizerClosureNavigationContext({
      source: 'quick-reply-closure',
      status: 'partial',
      focus: 'same-her-continuity',
      eventFocus: 'renderer-authority',
    })

    expect(buildPerformanceVisualizerClosureNavigationState(context)).toEqual({
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'repair-owner',
      preferredScrollTargetId: 'self-evolution-evidence:renderer-authority-projection',
      preferredTraceEventKind: 'person-state-updated',
    })
  })

  it('routes body-led same-her continuity diagnostics into runtime continuity evidence before renderer-local repair views', () => {
    const context = readPerformanceVisualizerClosureNavigationContext({
      source: 'quick-reply-closure',
      status: 'partial',
      focus: 'same-her-continuity',
      eventFocus: 'renderer-authority',
      sameHerFocus: 'body-continuity',
    } as any)

    expect(buildPerformanceVisualizerClosureNavigationState(context)).toEqual({
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'repair-owner',
      preferredScrollTargetId: 'self-evolution-evidence:runtime-continuity-projection',
      preferredTraceEventKind: 'takeover-audit',
    })
  })

  it('routes body-only same-her continuity diagnostics into concrete body-held runtime evidence before stopping at the broader runtime continuity panel', () => {
    const context = readPerformanceVisualizerClosureNavigationContext({
      source: 'quick-reply-closure',
      status: 'partial',
      focus: 'same-her-continuity',
      eventFocus: 'renderer-authority',
      sameHerFocus: 'body-continuity',
      sameHerClosureStage: 'body-only-hold',
    } as any)

    expect(buildPerformanceVisualizerClosureNavigationState(context)).toEqual({
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'repair-owner',
      preferredScrollTargetId: 'self-evolution-evidence:runtime-continuity-body-only-hold',
      preferredTraceEventKind: 'takeover-audit',
    })
  })

  it('routes audible-body same-her continuity diagnostics into concrete speech observability evidence before stopping at abstract runtime continuity panels', () => {
    const context = readPerformanceVisualizerClosureNavigationContext({
      source: 'quick-reply-closure',
      status: 'partial',
      focus: 'same-her-continuity',
      eventFocus: 'renderer-authority',
      sameHerFocus: 'body-continuity',
      sameHerClosureStage: 'audible-body-carry',
    } as any)

    expect(buildPerformanceVisualizerClosureNavigationState(context)).toEqual({
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'repair-owner',
      preferredScrollTargetId: 'self-evolution-speech:observability-summary',
      preferredTraceEventKind: 'takeover-audit',
    })
  })

  it('routes body-led renderer-rejoin same-her continuity diagnostics into concrete runtime continuity evidence before stopping at the broader runtime continuity panel', () => {
    const context = readPerformanceVisualizerClosureNavigationContext({
      source: 'quick-reply-closure',
      status: 'partial',
      focus: 'same-her-continuity',
      eventFocus: 'renderer-authority',
      sameHerFocus: 'body-continuity',
      sameHerClosureStage: 'body-carried-to-renderer-rejoin',
    } as any)

    expect(buildPerformanceVisualizerClosureNavigationState(context)).toEqual({
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'repair-owner',
      preferredScrollTargetId: 'self-evolution-evidence:runtime-continuity-body-carried-to-renderer-rejoin',
      preferredTraceEventKind: 'takeover-audit',
    })
  })

  it('routes full-cross-modal-lock same-her continuity diagnostics into concrete runtime continuity lock evidence before stopping at the broader runtime continuity panel', () => {
    const context = readPerformanceVisualizerClosureNavigationContext({
      source: 'quick-reply-closure',
      status: 'partial',
      focus: 'same-her-continuity',
      eventFocus: 'renderer-authority',
      sameHerFocus: 'body-continuity',
      sameHerClosureStage: 'full-cross-modal-lock',
    } as any)

    expect(buildPerformanceVisualizerClosureNavigationState(context)).toEqual({
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'repair-owner',
      preferredScrollTargetId: 'self-evolution-evidence:runtime-continuity-full-cross-modal-lock',
      preferredTraceEventKind: 'takeover-audit',
    })
  })

  it('routes voice-lipsync same-her continuity diagnostics into concrete speech authority evidence before stopping at abstract renderer authority panels', () => {
    const context = readPerformanceVisualizerClosureNavigationContext({
      source: 'quick-reply-closure',
      status: 'partial',
      focus: 'same-her-continuity',
      eventFocus: 'renderer-authority',
      sameHerFocus: 'renderer-authority',
      sameHerClosureStage: 'voice-lipsync-carry',
    } as any)

    expect(buildPerformanceVisualizerClosureNavigationState(context)).toEqual({
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'repair-owner',
      preferredScrollTargetId: 'self-evolution-authority:speech-hotspots',
      preferredTraceEventKind: 'person-state-updated',
    })
  })

  it('routes voice-only same-her continuity diagnostics into concrete speech observability evidence before stopping at abstract renderer authority panels', () => {
    const context = readPerformanceVisualizerClosureNavigationContext({
      source: 'quick-reply-closure',
      status: 'partial',
      focus: 'same-her-continuity',
      eventFocus: 'renderer-authority',
      sameHerFocus: 'renderer-authority',
      sameHerClosureStage: 'voice-only-carry',
    } as any)

    expect(buildPerformanceVisualizerClosureNavigationState(context)).toEqual({
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'repair-owner',
      preferredScrollTargetId: 'self-evolution-speech:observability-summary',
      preferredTraceEventKind: 'person-state-updated',
    })
  })

  it('routes renderer-rejoin-without-body same-her continuity diagnostics into concrete runtime continuity audit evidence before stopping at abstract renderer authority panels', () => {
    const context = readPerformanceVisualizerClosureNavigationContext({
      source: 'quick-reply-closure',
      status: 'partial',
      focus: 'same-her-continuity',
      eventFocus: 'renderer-authority',
      sameHerFocus: 'renderer-authority',
      sameHerClosureStage: 'renderer-rejoin-without-body',
    } as any)

    expect(buildPerformanceVisualizerClosureNavigationState(context)).toEqual({
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'repair-owner',
      preferredScrollTargetId: 'self-evolution-evidence:runtime-continuity-renderer-rejoin-without-body',
      preferredTraceEventKind: 'takeover-audit',
    })
  })

  it('routes emotional closure diagnostics into repair-path evidence', () => {
    const context = readPerformanceVisualizerClosureNavigationContext({
      source: 'quick-reply-closure',
      status: 'drift',
      focus: 'emotional-closure',
      eventFocus: 'takeover-audit',
    })

    expect(buildPerformanceVisualizerClosureNavigationState(context)).toEqual({
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'repair-path',
      preferredScrollTargetId: 'self-evolution-evidence:proactive-decision-consumption',
      preferredTraceEventKind: 'takeover-audit',
    })
  })

  it('routes project-state diagnostics into first continuity check', () => {
    const context = readPerformanceVisualizerClosureNavigationContext({
      source: 'quick-reply-closure',
      status: 'drift',
      focus: 'project-state',
      eventFocus: 'takeover-audit',
    })

    expect(buildPerformanceVisualizerClosureNavigationState(context)).toEqual({
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'first-check',
      preferredScrollTargetId: 'self-evolution-evidence:runtime-continuity',
      preferredTraceEventKind: 'takeover-audit',
    })
  })

  it('routes pre-dialogue briefing drift into first continuity check so developers inspect the self-brief before generic repair flow', () => {
    const context = readPerformanceVisualizerClosureNavigationContext({
      source: 'quick-reply-closure',
      status: 'drift',
      focus: 'pre-dialogue-briefing',
      eventFocus: 'takeover-audit',
    })

    expect(buildPerformanceVisualizerClosureNavigationState(context)).toEqual({
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'first-check',
      preferredScrollTargetId: 'self-evolution-evidence:runtime-continuity',
      preferredTraceEventKind: 'takeover-audit',
    })
  })

  it('routes project identity drift into candidate trajectory evidence', () => {
    const context = readPerformanceVisualizerClosureNavigationContext({
      source: 'quick-reply-closure',
      status: 'drift',
      focus: 'project-identity',
      eventFocus: 'takeover-audit',
    })

    expect(buildPerformanceVisualizerClosureNavigationState(context)).toEqual({
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'first-check',
      preferredScrollTargetId: 'self-evolution-evidence:candidate-trajectory-summary',
      preferredTraceEventKind: 'takeover-audit',
    })
  })

  it('routes current phase drift into identity governance evidence', () => {
    const context = readPerformanceVisualizerClosureNavigationContext({
      source: 'quick-reply-closure',
      status: 'drift',
      focus: 'current-phase',
      eventFocus: 'takeover-audit',
    })

    expect(buildPerformanceVisualizerClosureNavigationState(context)).toEqual({
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'first-check',
      preferredScrollTargetId: 'self-evolution-evidence:identity-drift-governance-summary',
      preferredTraceEventKind: 'takeover-audit',
    })
  })

  it('routes unresolved open-loop drift into repair-path consumption evidence', () => {
    const context = readPerformanceVisualizerClosureNavigationContext({
      source: 'quick-reply-closure',
      status: 'drift',
      focus: 'unresolved-open-loop',
      eventFocus: 'takeover-audit',
    })

    expect(buildPerformanceVisualizerClosureNavigationState(context)).toEqual({
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'repair-path',
      preferredScrollTargetId: 'self-evolution-evidence:proactive-decision-consumption-summary',
      preferredTraceEventKind: 'takeover-audit',
    })
  })

  it('does not auto-focus repair when closure is already grounded', () => {
    const context = readPerformanceVisualizerClosureNavigationContext({
      source: 'quick-reply-closure',
      status: 'grounded',
    })

    expect(buildPerformanceVisualizerClosureNavigationState(context)).toEqual({
      shouldAutoFocusRepairPath: false,
      preferredTriageCardId: 'first-check',
      preferredScrollTargetId: 'self-evolution-snapshot:capture',
      preferredTraceEventKind: 'governance-normalized',
    })
  })

  it('ignores unrelated entry sources', () => {
    const context = readPerformanceVisualizerClosureNavigationContext({
      source: 'developer-menu',
      status: 'drift',
      focus: 'emotional-closure',
    })

    expect(buildPerformanceVisualizerClosureNavigationState(context)).toEqual({
      shouldAutoFocusRepairPath: false,
      preferredTriageCardId: null,
      preferredScrollTargetId: null,
      preferredTraceEventKind: null,
    })
  })
})
