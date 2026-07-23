import { describe, expect, it } from 'vitest'

import {
  buildSessionContinuityRecallSeed,
  deriveOrganicMemoryBudgetClass,
  filterMainGatewayToolsForRoutingIntent,
} from './runtime-turn-composition'

describe('runtime turn composition helpers', () => {
  it('derives deep recall budgets only for long-horizon temporal focus', () => {
    expect(deriveOrganicMemoryBudgetClass(null)).toBe('realtime-reply')
    expect(deriveOrganicMemoryBudgetClass({
      recollectionIntent: {
        temporalFocus: 'cross-session',
      },
    } as any)).toBe('deep-recall-reply')
    expect(deriveOrganicMemoryBudgetClass({
      recollectionIntent: {
        temporalFocus: 'experience-matched',
      },
    } as any)).toBe('deep-recall-reply')
  })

  it('builds afterglow continuity recall seeds without session-mirror prompt carry', () => {
    expect(buildSessionContinuityRecallSeed([
      {
        label: 'ordinary',
        summary: 'ignored',
        metadata: {},
      },
      {
        label: 'afterglow:repair-window',
        summary: 'repair first',
        metadata: {
          threadAnchor: 'thread-a',
          afterglowTag: 'repair',
        },
      },
    ] as any)).toContain('continuity_afterglow:')
  })

  it('serializes held-autonomy as structured metadata plus a real model summary', () => {
    const seed = buildSessionContinuityRecallSeed([
      {
        kind: 'proactive',
        state: 'observed',
        label: 'proactive:follow-through:held-autonomy',
        summary: 're-open the unresolved runtime break and see what still blocks it | intent=follow-through | defer=busy-host | thread=thread-runtime | scenario=coding',
        metadata: {
          source: 'proactive-held-autonomy',
          sourceThreadId: 'thread-runtime',
          executionIntentKind: 'follow-through',
          executionIntentSummary: 're-open the unresolved runtime break and see what still blocks it',
          deferReason: 'busy-host',
          whyNow: 'She wants to quietly return to the unresolved runtime thread.',
        },
      },
    ] as any)

    expect(seed).toContain('thread_id=thread-runtime')
    expect(seed).toContain('intent_id=follow-through')
    expect(seed).toContain('model_summary=re-open the unresolved runtime break and see what still blocks it')
    expect(seed).toContain('defer_reason=busy-host')
    expect(seed).not.toContain('continuity_held_autonomy:')
    expect(seed).not.toContain('why_now=')
  })

  it('keeps deferred same-thread metadata without returning local hold prose to recall', () => {
    const emotionalClosureCue = 'Return to the unresolved compile seam in a low-pressure same-her way, so it lands like one living continuation instead of a generic follow-up.'
    const seed = buildSessionContinuityRecallSeed([
      {
        kind: 'proactive',
        state: 'pending',
        label: 'proactive:coding:deferred',
        summary: 'no mind-authored visible reply was available | stay near the unresolved compile seam without reopening visible speech | thread=thread-runtime-deferred | scenario=coding',
        metadata: {
          source: 'proactive-deferred',
          sourceThreadId: 'thread-runtime-deferred',
          sourceThoughtThreadId: 'thought-runtime-deferred',
          sourceConcernId: 'concern-runtime-deferred',
          deferReason: 'busy-host',
          whyNow: 'Stay near the unresolved compile seam without reopening visible speech.',
          executionIntentSummary: 'stay near the unresolved compile seam without reopening visible speech',
          projectStatePreDialogueAwarenessLine: 'pre_turn_context_digest',
          projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work. | next=Keep extending cross-modal identity-continuity',
          projectLatestLandedProgress: 'Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.',
          projectNextClosureTarget: 'Keep extending cross-modal identity-continuity',
          projectStateSameHerSelfLine: 'structured continuity digest.',
          projectStateSameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct identity-continuity',
          projectStateEmotionalClosureCue: emotionalClosureCue,
        },
      },
    ] as any)

    expect(seed).toContain('thread_id=thread-runtime-deferred')
    expect(seed).toContain('model_summary=stay near the unresolved compile seam without reopening visible speech')
    expect(seed).toContain('defer_reason=busy-host')
    expect(seed).not.toContain('continuity_held_autonomy:')
    expect(seed).not.toContain('why_now=')
    expect(seed).not.toContain('WorkingMemory owns short-term memory')
    expect(seed).not.toContain('LongTermMemoryRecall owns long-term recall')
    expect(seed).not.toContain('template_awareness')
    expect(seed).not.toContain('Project-state carry already survives')
    expect(seed).not.toContain('project_pre_dialogue=')
    expect(seed).not.toContain('project_preflight=')
    expect(seed).not.toContain('same_her=')
    expect(seed).not.toContain('drift_risk=')
    expect(seed).not.toContain('project_emotional_closure=')
    expect(seed).not.toContain(`emotional_continuity=${emotionalClosureCue}`)
    expect(seed).not.toContain('same digital life project')
    expect(seed).not.toContain('legacy phase-one template')
    expect(seed).not.toContain('same-her')
    expect(seed).not.toContain('[fixed-template-excluded]')
  })

  it('serializes deferred autonomy metadata without returning local hold prose to the organic recall seed', () => {
    const seed = buildSessionContinuityRecallSeed([
      {
        kind: 'proactive',
        state: 'pending',
        label: 'proactive:coding:deferred',
        summary: '真实模型摘要：下次用户回来时继续检查 Provider 失败。',
        metadata: {
          source: 'proactive-deferred',
          reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
          sourceThreadId: 'thread-deferred',
          intentId: 'follow-through',
          deferredAt: 100,
          deferReason: 'busy-host',
          whyNow: 'Keep the opening lower-pressure while the same-her continuity settles.',
          executionIntentSummary: '真实模型摘要：下次用户回来时继续检查 Provider 失败。',
          projectPhase: 'Phase 1: Local Digital Life',
          projectPrimaryOpenLoop: 'unresolved=old governance carry',
          projectNextClosureTarget: 'next=keep the opening lower-pressure',
        },
      },
    ] as any)

    expect(seed).toContain('reason_code=provider-mind-unavailable-for-proactive-visible-utterance')
    expect(seed).toContain('thread_id=thread-deferred')
    expect(seed).toContain('intent_id=follow-through')
    expect(seed).toContain('deferred_at=100')
    expect(seed).toContain('真实模型摘要：下次用户回来时继续检查 Provider 失败。')
    expect(seed).not.toContain('continuity_held_autonomy:')
    expect(seed).not.toContain('Keep the opening lower-pressure')
    expect(seed).not.toContain('same-her')
    expect(seed).not.toContain('phase=')
    expect(seed).not.toContain('unresolved=')
    expect(seed).not.toContain('why_now=')
    expect(seed).not.toContain('proactive_state=')
  })

  it('keeps provider failure facts in the organic recall seed without the hold template', () => {
    const seed = buildSessionContinuityRecallSeed([
      {
        kind: 'proactive',
        state: 'pending',
        label: 'proactive:general:deferred',
        summary: 'Provider failed with HTTP 503: upstream unavailable.',
        metadata: {
          source: 'proactive-deferred',
          reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
          deferredAt: 200,
          failure: 'Provider failed with HTTP 503: upstream unavailable.',
        },
      },
    ] as any)

    expect(seed).toContain('failure=Provider failed with HTTP 503: upstream unavailable.')
    expect(seed).not.toContain('continuity_held_autonomy:')
    expect(seed).not.toContain('no mind-authored visible reply was available')
  })

  it('ignores unrelated continuity records while keeping held-autonomy metadata', () => {
    const recallSeed = buildSessionContinuityRecallSeed([
      {
        kind: 'proactive',
        state: 'observed',
        label: 'proactive:follow-through:held-autonomy',
        summary: 're-open the unresolved runtime break and see what still blocks it | intent=follow-through | defer=busy-host | thread=thread-runtime | scenario=coding',
        metadata: {
          source: 'proactive-held-autonomy',
          sourceThreadId: 'thread-runtime',
          executionIntentKind: 'follow-through',
          executionIntentSummary: 're-open the unresolved runtime break and see what still blocks it',
          deferReason: 'busy-host',
          whyNow: 'She wants to quietly return to the unresolved runtime thread.',
        },
      },
      {
        kind: 'execution-callback',
        state: 'observed',
        label: 'execution:callback-carry',
        summary: 'The compile result is ready to land back on the same thread without crowding the host.',
        metadata: {
          sourceThreadId: 'thread-runtime',
          executionIntentKind: 'follow-through',
          executionIntentSummary: 'land the compile result back on the same runtime thread',
          carryMode: 'lower-pressure',
        },
      },
    ] as any)

    expect(recallSeed).toContain('thread_id=thread-runtime')
    expect(recallSeed).toContain('intent_id=follow-through')
    expect(recallSeed).not.toContain('continuity_held_autonomy:')
    expect(recallSeed).not.toContain('generic utility')
  })

  it('does not turn relationship cadence signals into recall prompt cues', () => {
    const seed = buildSessionContinuityRecallSeed([
      {
        kind: 'proactive',
        state: 'observed',
        label: 'relationship:cadence-reconfirmation',
        summary: 'relationship cadence stayed on the same bounded-return line after reconfirmation',
        metadata: {
          source: 'relationship-cadence-reconfirmation',
          sourceThreadId: 'thread-cadence-runtime',
          cadenceMode: 'measured-return',
          relationshipLine: 'keep the relationship return measured until the surface fully cools',
          bodyMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          whyNow: 'The callback return still needs room-first continuity before closeness widens again.',
        },
      },
    ] as any)

    expect(seed).toBe('')
  })

  it('filters tools to required routing names without dropping fallback tools when no match exists', () => {
    const tools = [
      { function: { name: 'search_memory' } },
      { function: { name: 'execute_task' } },
    ]
    expect(filterMainGatewayToolsForRoutingIntent(tools, {
      requiredToolNames: ['execute_task'],
    } as any)).toEqual([
      { function: { name: 'execute_task' } },
    ])
    expect(filterMainGatewayToolsForRoutingIntent(tools, {
      requiredToolNames: ['missing_tool'],
    } as any)).toBe(tools)
  })
})
