import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusPlan } from './performance-visualizer-self-evolution-focus-plan'

describe('performance visualizer self evolution focus plan', () => {
  it('builds a persona-oriented focus plan with evidence, trace sections, and recommended event', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'persona',
          detail: 'selected owner',
        },
        {
          id: 'first-check',
          label: '首查点',
          layer: 'persona',
          detail: 'selected first check',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: 'persona',
          detail: 'selected evidence path',
        },
      ],
      'repair-path',
      [
        {
          id: 'event-governance',
          kind: 'governance-normalized',
          summary: 'turn=care | truth=live-grounded | repair=none',
        },
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'fallback=opening-guidance:observe-first',
        },
      ],
    )

    expect(plan).toEqual({
      selectedCardId: 'repair-path',
      highlightedEvidencePanelIds: [
        'proactive-action-chain',
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-details',
      ],
      recommendedTraceEventId: 'event-takeover',
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      explanation: 'Focused repair-path because it points to proactive-action-chain -> runtime-continuity-projection, then narrows into trace-consumption -> trace-details and event event-takeover.',
    })
  })

  it('builds a renderer-oriented focus plan with renderer authority emphasis', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'renderer',
          detail: 'selected owner',
        },
        {
          id: 'first-check',
          label: '首查点',
          layer: 'renderer',
          detail: 'selected first check',
        },
      ],
      'repair-owner',
      [
        {
          id: 'event-presence',
          kind: 'presence-pulse-dispatched',
          summary: 'protective-watch settled after fatigue pressure rose',
        },
        {
          id: 'event-person-state',
          kind: 'person-state-updated',
          summary: 'protective-watch settled after fatigue pressure rose',
        },
      ],
    )

    expect(plan).toEqual({
      selectedCardId: 'repair-owner',
      highlightedEvidencePanelIds: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
      recommendedTraceEventId: 'event-person-state',
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      explanation: 'Focused repair-owner because it points to renderer-authority-projection -> runtime-continuity-projection, then narrows into trace-consumption -> trace-timeline -> selected-trace-event and event event-person-state.',
    })
  })

  it('returns an empty focus plan when no triage card is selected', () => {
    const plan = buildSelfEvolutionFocusPlan([], null, [])

    expect(plan).toEqual({
      selectedCardId: null,
      highlightedEvidencePanelIds: [],
      highlightedTraceSectionIds: [],
      recommendedTraceEventId: null,
      explanation: null,
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
    })
  })

  it('carries explicit body-led renderer rejoin focus semantics when the selected continuity card is about manifestation rejoin', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'continuity',
          detail: 'selected owner',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: 'continuity',
          detail: 'selected evidence path',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        },
      ],
      'repair-path',
      [
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'body line kept the living segment while visible renderer authority rejoined',
        },
      ],
    )

    expect(plan).toEqual({
      selectedCardId: 'repair-path',
      highlightedEvidencePanelIds: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
      recommendedTraceEventId: 'event-takeover',
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      explanation: 'Focused repair-path because it points to renderer-authority-projection -> runtime-continuity-projection, then narrows into trace-consumption -> trace-timeline -> selected-trace-event and event event-takeover.',
    })
  })

  it('carries explicit speech body-led renderer rejoin focus semantics when the selected continuity card is about speech manifestation rejoin', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'continuity',
          detail: 'selected owner',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: 'continuity',
          detail: 'selected evidence path',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        },
      ],
      'repair-path',
      [
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'body line kept the living segment while speech authority rejoined',
        },
      ],
    )

    expect(plan).toEqual({
      selectedCardId: 'repair-path',
      highlightedEvidencePanelIds: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
      recommendedTraceEventId: 'event-takeover',
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      explanation: 'Focused repair-path because it points to renderer-authority-projection -> runtime-continuity-projection, then narrows into trace-consumption -> trace-timeline -> selected-trace-event and event event-takeover.',
    })
  })

  it('prefers structured speech renderer rejoin semantics even when the repair-path wording becomes generic', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'continuity',
          detail: 'selected owner',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: 'continuity',
          detail: 'selected evidence path',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        },
      ],
      'repair-path',
      [
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'body line kept the living segment while speech authority rejoined',
        },
      ],
    )

    expect(plan.rendererRejoinSurfaceKey).toBe('authority:renderer-rejoin:speech')
    expect(plan.bodyContinuityPhase).toBe('body-carried-to-renderer-rejoin')
  })

  it('keeps renderer rejoin surface unknown when body continuity is explicit but no manifestation surface has been identified yet', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'continuity',
          detail: 'selected owner',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: null,
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: 'continuity',
          detail: 'selected evidence path',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: null,
        },
      ],
      'repair-path',
      [
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'body line kept carrying the same living segment while manifestation authority was still being identified.',
        },
      ],
    )

    expect(plan.bodyContinuityPhase).toBe('body-carried-to-renderer-rejoin')
    expect(plan.rendererRejoinSurfaceKey).toBeNull()
  })

  it('carries body-only-hold focus semantics from structured triage cards even when the wording no longer says renderer rejoin', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'continuity',
          detail: 'selected owner',
          bodyContinuityPhase: 'body-only-hold',
          rendererRejoinSurfaceKey: null,
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: 'continuity',
          detail: 'selected evidence path',
          bodyContinuityPhase: 'body-only-hold',
          rendererRejoinSurfaceKey: null,
        },
      ],
      'repair-path',
      [
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'body line still carried the same living segment inward.',
        },
      ],
    )

    expect(plan).toEqual({
      selectedCardId: 'repair-path',
      highlightedEvidencePanelIds: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
      recommendedTraceEventId: 'event-takeover',
      bodyContinuityPhase: 'body-only-hold',
      rendererRejoinSurfaceKey: null,
      explanation: 'Focused repair-path because it points to renderer-authority-projection -> runtime-continuity-projection, then narrows into trace-consumption -> trace-timeline -> selected-trace-event and event event-takeover.',
    })
  })

  it('carries full-cross-modal-lock focus semantics from structured triage cards so same-segment lock stays explicit', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'continuity',
          detail: 'selected owner',
          bodyContinuityPhase: 'full-cross-modal-lock',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: 'continuity',
          detail: 'selected evidence path',
          bodyContinuityPhase: 'full-cross-modal-lock',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        },
      ],
      'repair-path',
      [
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'body and live2d stayed locked on the same living segment.',
        },
      ],
    )

    expect(plan.bodyContinuityPhase).toBe('full-cross-modal-lock')
    expect(plan.rendererRejoinSurfaceKey).toBe('authority:renderer-rejoin:live2d')
    expect(plan.highlightedEvidencePanelIds).toEqual([
      'renderer-authority-projection',
      'runtime-continuity-projection',
    ])
    expect(plan.highlightedTraceSectionIds).toEqual([
      'trace-consumption',
      'trace-timeline',
      'selected-trace-event',
    ])
  })

  it('carries renderer-rejoin-without-body focus semantics from structured triage cards so visible recovery without body carry stays explicit', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'continuity',
          detail: 'selected owner',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: 'continuity',
          detail: 'selected evidence path',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        },
      ],
      'repair-path',
      [
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'vrm authority rejoined without the body line carrying the same segment.',
        },
      ],
    )

    expect(plan.bodyContinuityPhase).toBe('renderer-rejoin-without-body')
    expect(plan.rendererRejoinSurfaceKey).toBe('authority:renderer-rejoin:vrm')
    expect(plan.recommendedTraceEventId).toBe('event-takeover')
  })

  it('keeps quieter face+lipsync continuity', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'continuity',
          detail: 'selected owner',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: null,
          survivingVisibleLane: 'face+lipsync-only',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: 'continuity',
          detail: 'selected evidence path',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: null,
          survivingVisibleLane: 'face+lipsync-only',
        },
      ],
      'repair-path',
      [
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'face and lipsync still held the same living segment while body motion and voice were still pending rejoin.',
        },
      ],
    )

    expect(plan).toEqual({
      selectedCardId: 'repair-path',
      highlightedEvidencePanelIds: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
      recommendedTraceEventId: 'event-takeover',
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'face+lipsync-only',
      explanation: 'Focused repair-path because it points to renderer-authority-projection -> runtime-continuity-projection, then narrows into trace-consumption -> trace-timeline -> selected-trace-event and event event-takeover.',
    })
  })

  it('keeps quieter motion+lipsync continuity', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'continuity',
          detail: 'selected owner',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: null,
          survivingVisibleLane: 'motion+lipsync-only',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: 'continuity',
          detail: 'selected evidence path',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: null,
          survivingVisibleLane: 'motion+lipsync-only',
        },
      ],
      'repair-path',
      [
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'motion and lipsync still held the same living segment while body face and voice were still pending rejoin.',
        },
      ],
    )

    expect(plan).toEqual({
      selectedCardId: 'repair-path',
      highlightedEvidencePanelIds: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
      recommendedTraceEventId: 'event-takeover',
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'motion+lipsync-only',
      explanation: 'Focused repair-path because it points to renderer-authority-projection -> runtime-continuity-projection, then narrows into trace-consumption -> trace-timeline -> selected-trace-event and event event-takeover.',
    })
  })

  it('keeps quieter face+lipsync+voice continuity', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'continuity',
          detail: 'selected owner',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: null,
          survivingVisibleLane: 'face+lipsync+voice-only',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: 'continuity',
          detail: 'selected evidence path',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: null,
          survivingVisibleLane: 'face+lipsync+voice-only',
        },
      ],
      'repair-path',
      [
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'face lipsync and voice still held the same living segment while body and motion were still pending rejoin.',
        },
      ],
    )

    expect(plan).toEqual({
      selectedCardId: 'repair-path',
      highlightedEvidencePanelIds: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
      recommendedTraceEventId: 'event-takeover',
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'face+lipsync+voice-only',
      explanation: 'Focused repair-path because it points to renderer-authority-projection -> runtime-continuity-projection, then narrows into trace-consumption -> trace-timeline -> selected-trace-event and event event-takeover.',
    })
  })

  it('keeps quieter motion+lipsync+voice continuity', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'continuity',
          detail: 'selected owner',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: null,
          survivingVisibleLane: 'motion+lipsync+voice-only',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: 'continuity',
          detail: 'selected evidence path',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: null,
          survivingVisibleLane: 'motion+lipsync+voice-only',
        },
      ],
      'repair-path',
      [
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'motion lipsync and voice still held the same living segment while body and face were still pending rejoin.',
        },
      ],
    )

    expect(plan).toEqual({
      selectedCardId: 'repair-path',
      highlightedEvidencePanelIds: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
      recommendedTraceEventId: 'event-takeover',
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'motion+lipsync+voice-only',
      explanation: 'Focused repair-path because it points to renderer-authority-projection -> runtime-continuity-projection, then narrows into trace-consumption -> trace-timeline -> selected-trace-event and event event-takeover.',
    })
  })
})
