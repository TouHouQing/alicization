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
          detail: 'evolution',
        },
        {
          id: 'first-check',
          label: '首查点',
          layer: 'persona',
          detail: 'self-evolution kernel -> active learning strategy -> manifestation/action-ecology/persona-bias',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: null,
          detail: 'persona drift initiative-preferred-style:light-nudge -> thought trace proactive-opening-guidance-violation:callback-bounded -> continuity anchor governor-intention-rest-1',
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
        'private-thought-governance-chain',
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-details',
      ],
      recommendedTraceEventId: 'event-takeover',
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      explanation: 'Focused repair-path because it points to private-thought-governance-chain -> runtime-continuity-projection, then narrows into trace-consumption -> trace-details and event event-takeover.',
    })
  })

  it('builds a renderer-oriented focus plan with renderer authority emphasis', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'renderer',
          detail: 'renderer authority',
        },
        {
          id: 'first-check',
          label: '首查点',
          layer: 'renderer',
          detail: 'renderer authority binding -> playback cues -> driver execution',
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
          detail: 'body continuity governance',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: null,
          detail: 'continuity governance body-led-same-segment-carry -> Live2D renderer rejoin -> cue bridge recovery',
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
      bodyContinuityGovernanceNote: '身体连续性已经明确进入身体承接态 -> 显形补回态，Live2D 显形权威仍在沿同一条连续身体线补回。',
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
          detail: 'body continuity governance',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: null,
          detail: 'continuity governance body-led-same-segment-carry -> speech renderer rejoin -> cue bridge recovery',
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
      bodyContinuityGovernanceNote: '身体连续性已经明确进入身体承接态 -> 显形补回态，speech 显形权威仍在沿同一条连续身体线补回。',
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
          detail: 'body continuity governance',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: null,
          detail: 'continuity governance renderer rejoin -> body-led-same-segment-carry -> manifestation authority recovery -> cue bridge recovery',
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
          detail: 'body continuity governance',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: null,
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: null,
          detail: 'continuity governance renderer rejoin -> body-led-same-segment-carry -> authority recovery -> cue bridge recovery',
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
          detail: 'body continuity governance',
          bodyContinuityPhase: 'body-only-hold',
          rendererRejoinSurfaceKey: null,
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: null,
          detail: 'continuity governance body-only-hold -> body authority carry -> renderer recovery gap -> cue bridge recovery',
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
      bodyContinuityGovernanceNote: '身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断。',
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
          detail: 'body continuity governance',
          bodyContinuityPhase: 'full-cross-modal-lock',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: null,
          detail: 'continuity governance full-cross-modal-lock -> body-and-live2d-same-segment-lock -> cue bridge stability',
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
          detail: 'body continuity governance',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: null,
          detail: 'continuity governance renderer-rejoin-without-body -> vrm rejoin without body carry -> cue bridge body-loss audit',
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

  it('keeps quieter face+lipsync same-her continuity explicit in the focus plan instead of flattening it back into generic body-loss wording', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'continuity',
          detail: 'body continuity governance',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: null,
          survivingVisibleLane: 'face+lipsync-only',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: null,
          detail: 'continuity governance quieter-face-lipsync-same-her-line -> body motion voice pending rejoin -> cue bridge body-loss audit',
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
      bodyContinuityGovernanceNote: '当前只有 face 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线。',
      explanation: 'Focused repair-path because it points to renderer-authority-projection -> runtime-continuity-projection, then narrows into trace-consumption -> trace-timeline -> selected-trace-event and event event-takeover.',
    })
  })

  it('keeps quieter motion+lipsync same-her continuity explicit in the focus plan instead of flattening it back into generic body-loss wording', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'continuity',
          detail: 'body continuity governance',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: null,
          survivingVisibleLane: 'motion+lipsync-only',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: null,
          detail: 'continuity governance quieter-motion-lipsync-same-her-line -> body face voice pending rejoin -> cue bridge body-loss audit',
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
      bodyContinuityGovernanceNote: '当前只有 motion 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线。',
      explanation: 'Focused repair-path because it points to renderer-authority-projection -> runtime-continuity-projection, then narrows into trace-consumption -> trace-timeline -> selected-trace-event and event event-takeover.',
    })
  })

  it('keeps quieter face+lipsync+voice same-her continuity explicit in the focus plan instead of flattening voice back out of the surviving line', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'continuity',
          detail: 'body continuity governance',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: null,
          survivingVisibleLane: 'face+lipsync+voice-only',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: null,
          detail: 'continuity governance quieter-face-lipsync-voice-same-her-line -> body motion pending rejoin -> cue bridge body-loss audit',
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
      bodyContinuityGovernanceNote: '当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线。',
      explanation: 'Focused repair-path because it points to renderer-authority-projection -> runtime-continuity-projection, then narrows into trace-consumption -> trace-timeline -> selected-trace-event and event event-takeover.',
    })
  })

  it('keeps quieter motion+lipsync+voice same-her continuity explicit in the focus plan instead of flattening voice back out of the surviving line', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'continuity',
          detail: 'body continuity governance',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: null,
          survivingVisibleLane: 'motion+lipsync+voice-only',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: null,
          detail: 'continuity governance quieter-motion-lipsync-voice-same-her-line -> body face pending rejoin -> cue bridge body-loss audit',
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
      bodyContinuityGovernanceNote: '当前仅剩动作、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线。',
      explanation: 'Focused repair-path because it points to renderer-authority-projection -> runtime-continuity-projection, then narrows into trace-consumption -> trace-timeline -> selected-trace-event and event event-takeover.',
    })
  })

  it('builds a continuity-governance focus plan so remembered familiarity is inspected before it is mistaken for a bug', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'continuity',
          detail: 'same-her continuity governance',
        },
        {
          id: 'first-check',
          label: '首查点',
          layer: 'continuity',
          detail: 'candidate trajectory -> remembered familiarity restraint -> identity drift governance',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: null,
          detail: 'continuity governance remembered-familiarity-memory-first -> candidate trajectory same-her room -> identity boundary bounded-growth',
        },
      ],
      'first-check',
      [
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'opening guidance held the room while remembered familiarity stayed memory-first',
        },
        {
          id: 'event-governance',
          kind: 'governance-normalized',
          summary: 'bounded growth preserved identity continuity',
        },
      ],
    )

    expect(plan).toEqual({
      selectedCardId: 'first-check',
      highlightedEvidencePanelIds: [
        'candidate-trajectory-summary',
        'proactive-decision-consumption-summary',
        'identity-drift-governance-summary',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-details',
      ],
      recommendedTraceEventId: 'event-takeover',
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      explanation: 'Focused first-check because it points to candidate-trajectory-summary -> proactive-decision-consumption-summary -> identity-drift-governance-summary, then narrows into trace-consumption -> trace-details and event event-takeover.',
    })
  })

  it('builds a project-state continuity focus plan so same-her internalization drift is traced through project identity, phase, and open loops first', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'continuity',
          detail: 'project-state continuity governance',
        },
        {
          id: 'first-check',
          label: '首查点',
          layer: 'continuity',
          detail: 'Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: null,
          detail: 'continuity governance project-state-continuity-drift -> Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
        },
      ],
      'repair-owner',
      [
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'project identity and unresolved open loops were not carried forward strongly enough to widen internalization.',
        },
        {
          id: 'event-governance',
          kind: 'governance-normalized',
          summary: 'phase-1 continuity is still the governing route for local digital life.',
        },
      ],
    )

    expect(plan).toEqual({
      selectedCardId: 'repair-owner',
      highlightedEvidencePanelIds: [
        'candidate-trajectory-summary',
        'proactive-decision-consumption-summary',
        'identity-drift-governance-summary',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-details',
        'selected-trace-event',
      ],
      recommendedTraceEventId: 'event-takeover',
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      explanation: 'Focused repair-owner because it points to candidate-trajectory-summary -> proactive-decision-consumption-summary -> identity-drift-governance-summary, then narrows into trace-consumption -> trace-details -> selected-trace-event and event event-takeover.',
    })
  })

  it('builds a first-check project-state continuity focus plan so default briefing-drift repair inspects the carry chain before deeper repair path steps', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'continuity',
          detail: 'project-state continuity governance',
        },
        {
          id: 'first-check',
          label: '首查点',
          layer: 'continuity',
          detail: 'Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: null,
          detail: 'continuity governance project-state-continuity-drift -> Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
        },
      ],
      'first-check',
      [
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'project identity and unresolved open loops were not carried forward strongly enough to widen internalization.',
        },
        {
          id: 'event-governance',
          kind: 'governance-normalized',
          summary: 'phase-1 continuity is still the governing route for local digital life.',
        },
      ],
    )

    expect(plan).toEqual({
      selectedCardId: 'first-check',
      highlightedEvidencePanelIds: [
        'candidate-trajectory-summary',
        'proactive-decision-consumption-summary',
        'identity-drift-governance-summary',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-details',
        'selected-trace-event',
      ],
      recommendedTraceEventId: 'event-takeover',
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      explanation: 'Focused first-check because it points to candidate-trajectory-summary -> proactive-decision-consumption-summary -> identity-drift-governance-summary, then narrows into trace-consumption -> trace-details -> selected-trace-event and event event-takeover.',
    })
  })
})
