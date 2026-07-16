import { describe, expect, it } from 'vitest'

import {
  buildSessionContinuityRecallSeed,
  buildSessionMirrorRuntimeContinuitySeed,
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

  it('builds runtime and afterglow continuity recall seeds', () => {
    expect(buildSessionMirrorRuntimeContinuitySeed({
      runtimeChannelSummary: 'dominant=dialogue | phase=dialogue | handoff=dialogue',
      runtimeTransitionSummary: 'from=symbiotic-vision | to=recovering | scenario=coding | reason=host fatigue detected',
    } as any)).toContain('mirror_runtime_continuity:')
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

  it('builds held-autonomy recall seeds so later turns can re-enter the same inner line', () => {
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

    expect(seed).toContain('continuity_held_autonomy:')
    expect(seed).toContain('thread=thread-runtime')
    expect(seed).toContain('intent=follow-through')
    expect(seed).toContain('goal=re-open the unresolved runtime break and see what still blocks it')
    expect(seed).toContain('defer=busy-host')
  })

  it('treats deferred same-thread proactive continuity as held-autonomy recall pressure when the line was intentionally kept inward', () => {
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

    expect(seed).toContain('continuity_held_autonomy:')
    expect(seed).toContain('thread=thread-runtime-deferred')
    expect(seed).toContain('goal=stay near the unresolved compile seam without reopening visible speech')
    expect(seed).toContain('defer=busy-host')
    expect(seed).toContain('why_now=Stay near the unresolved compile seam without reopening visible speech.')
    expect(seed).toContain('short_term_owner=WorkingMemory')
    expect(seed).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expect(seed).toContain('template_awareness=withheld_from_held_autonomy_seed')
    expect(seed).toContain('runtime_landed=Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.')
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

  it('treats legacy projectLatestProgress and projectMemoryClosureSummary as held-autonomy recall carry when older continuity metadata has not been renamed yet', () => {
    const seed = buildSessionContinuityRecallSeed([
      {
        kind: 'proactive',
        state: 'observed',
        label: 'proactive:follow-through:held-autonomy',
        summary: 'older continuity metadata still keeps the same inner line alive',
        metadata: {
          source: 'proactive-held-autonomy',
          sourceThreadId: 'thread-runtime-legacy',
          executionIntentKind: 'follow-through',
          executionIntentSummary: 're-open the unresolved runtime break and see what still blocks it',
          projectStatePreDialogueAwarenessLine: 'pre_turn_context_digest',
          projectStateSameHerSelfLine: 'structured continuity digest.',
          projectLatestProgress: 'Legacy held-autonomy project carry still preserves what has already landed across older continuity metadata.',
          projectMemoryClosureSummary: 'Legacy held-autonomy continuity still needs to keep the still-open closure explicit before the remembered line widens outward.',
        },
      },
    ] as any)

    expect(seed).toContain('continuity_held_autonomy:')
    expect(seed).toContain('thread=thread-runtime-legacy')
    expect(seed).toContain('runtime_landed=Legacy held-autonomy project carry still preserves what has already landed across older continuity metadata.')
    expect(seed).toContain('runtime_unresolved=Legacy held-autonomy continuity still needs to keep the still-open closure explicit before the remembered line widens outward.')
    expect(seed).not.toContain('project_pre_dialogue=')
    expect(seed).not.toContain('project_preflight=')
    expect(seed).not.toContain('same_her=')
  })

  it('preserves one identity-continuity', () => {
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

    expect(recallSeed).toContain('continuity_held_autonomy:')
    expect(recallSeed).toContain('thread=thread-runtime')
    expect(recallSeed).toContain('intent=follow-through')
    expect(recallSeed).not.toContain('generic utility')
  })

  it('builds cadence reconfirmation recall seeds so runtime steering can keep measured-return continuity in view', () => {
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

    expect(seed).toContain('continuity_cadence_reconfirmation:')
    expect(seed).toContain('thread=thread-cadence-runtime')
    expect(seed).toContain('cadence=measured-return')
    expect(seed).toContain('line=keep the relationship return measured until the surface fully cools')
    expect(seed).toContain('body=measured-return')
    expect(seed).toContain('blink=linger')
    expect(seed).toContain('gaze=soften')
    expect(seed).toContain('why_now=The callback return still needs room-first continuity before closeness widens again.')
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
