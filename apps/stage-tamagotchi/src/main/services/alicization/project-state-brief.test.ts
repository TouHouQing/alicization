import { describe, expect, it } from 'vitest'

import {
  buildAlicizationProjectPreDialogueAwareness,
  buildAlicizationProjectPreDialogueAwarenessLine,
  buildAlicizationProjectPreDialogueClosure,
  buildAlicizationProjectStateClosureDashboard,
  buildAlicizationProjectStateExtraSystemBlocks,
  buildAlicizationProjectStatePreflightSummary,
  buildAlicizationProjectStateSystemBlock,
  buildAlicizationProviderFacingProjectStateClosureDashboard,
  buildAlicizationProviderFacingProjectStateExtraSystemBlocks,
  buildAlicizationProviderFacingProjectStateSystemBlock,
  describeAlicizationEmbodimentClosureReminder,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateSnapshot,
  resolveAlicizationProjectStatusBrief,
} from './project-state-brief'

const oldProjectStateTemplatePattern
  = /local_desktop_life_loop|visibility=internal[-_]structured|surface=structured|content=excluded|pending[-_]rejoin|cross_modal_continuity_proof|project_state_continuity|life_loop_continuity|continuity_anchor=|continuity=embodiment|Same Phase 1|Before answering|Right now I am still holding|same-her|same her|same living line|one continuous her/iu

function expectNoOldProjectStateTemplate(value: unknown) {
  expect(JSON.stringify(value)).not.toMatch(oldProjectStateTemplatePattern)
}

describe('project-state-brief', () => {
  it('keeps canonical project-state brief as memory governance facts without old templates', () => {
    const brief = resolveAlicizationProjectStateBrief()

    expect(brief.identity).toContain('runtime_personhood')
    expect(brief.currentPhase).toContain('life_core')
    expect(brief.latestProgress).toContain('short_term_owner=WorkingMemory')
    expect(brief.latestProgress).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expect(brief.latestProgress).toContain('template_cleanup=active')
    expect(brief.latestProgress).toContain('allowed_failures=timeout,provider_failure,tool_failure,invalid_structured_reply')
    expect(brief.memoryAnthropomorphismProgress).toEqual(expect.arrayContaining([
      expect.stringContaining('WorkingMemory owns short-term dialogue carry'),
      expect.stringContaining('LongTermMemoryRecall owns long-term recall'),
      expect.stringContaining('Memory Workbench remains the visible governance entry'),
    ]))
    expectNoOldProjectStateTemplate({
      identity: brief.identity,
      currentPhase: brief.currentPhase,
      latestProgress: brief.latestProgress,
      preflightSummary: brief.preflightSummary,
      preDialogueAwarenessLine: brief.preDialogueAwarenessLine,
      sameHerSelfLine: brief.sameHerSelfLine,
      sameHerDriftRisk: brief.sameHerDriftRisk,
      emotionalClosureCue: brief.emotionalClosureCue,
      sameHerHoldDetail: brief.sameHerHoldDetail,
      continuityCue: brief.continuityCue,
      continuityProgressSummary: brief.continuityProgressSummary,
      memoryAnthropomorphismProgress: brief.memoryAnthropomorphismProgress,
      openLoops: brief.openLoops,
      nextClosureTarget: brief.nextClosureTarget,
    })
  })

  it('does not turn project identity and phase prose into pre-dialogue cue templates', () => {
    const summary = buildAlicizationProjectStatePreflightSummary({
      identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
      currentPhase: 'Phase 1: Local Digital Life.',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
    })
    const awareness = buildAlicizationProjectPreDialogueAwarenessLine({
      identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
      currentPhase: 'Phase 1: Local Digital Life.',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed.',
    })

    expect(summary).toContain('open=Memory still needs stronger end-to-end closure')
    expect(awareness).toContain('open=memory still needs stronger end-to-end closure')
    expect(awareness).not.toContain('next=cross_modal_continuity_proof')
    expectNoOldProjectStateTemplate({ summary, awareness })
  })

  it('builds shared awareness and closure structures without continuity cue fields', () => {
    const preDialogueAwareness = buildAlicizationProjectPreDialogueAwareness({
      preflightSummary: null,
      runtimeProjectState: {
        latestLandedProgress: 'memory_dialogue_loop=connected; short_term_owner=WorkingMemory; long_term_recall_owner=LongTermMemoryRecall.',
        proactiveSameHerGap: 'proactive_continuity_loop=partial; long_run_noisy_desktop_proof=needed.',
      },
      primaryOpenLoop: 'memory_dialogue_embodiment_closure=end_to_end_proof_incomplete.',
      nextClosureTarget: 'embedding_reindex_required_when_model_changes=true.',
    })
    const preDialogueClosure = buildAlicizationProjectPreDialogueClosure({
      preflightSummary: null,
      runtimeProjectState: {
        latestLandedProgress: 'memory_dialogue_loop=connected; short_term_owner=WorkingMemory; long_term_recall_owner=LongTermMemoryRecall.',
        proactiveSameHerGap: 'proactive_continuity_loop=partial; long_run_noisy_desktop_proof=needed.',
      },
      primaryOpenLoop: 'memory_dialogue_embodiment_closure=end_to_end_proof_incomplete.',
      nextClosureTarget: 'embedding_reindex_required_when_model_changes=true.',
    })

    expect(preDialogueAwareness.reasonPreview).toContain('initiative_gap=proactive_continuity_loop=partial; long_run_noisy_desktop_proof=needed.')
    expect(preDialogueAwareness.reasonPreview).not.toEqual(expect.arrayContaining([
      expect.stringContaining('continuity_anchor='),
      expect.stringContaining('continuity_drift_risk='),
    ]))
    expect(preDialogueClosure.reasons).toContain('initiative_gap=proactive_continuity_loop=partial; long_run_noisy_desktop_proof=needed.')
    expectNoOldProjectStateTemplate({ preDialogueAwareness, preDialogueClosure })
  })

  it('builds internal and provider-facing system blocks as governance status only', () => {
    const internalBlock = buildAlicizationProjectStateSystemBlock()
    const providerBlock = buildAlicizationProviderFacingProjectStateSystemBlock()
    const internalExtraBlocks = buildAlicizationProjectStateExtraSystemBlocks()
    const providerExtraBlocks = buildAlicizationProviderFacingProjectStateExtraSystemBlocks()

    for (const block of [internalBlock, providerBlock, ...internalExtraBlocks, ...providerExtraBlocks]) {
      expect(block).toContain('[ALICIZATION_PROJECT_STATE]')
      expect(block).toContain('short_term_owner=WorkingMemory')
      expect(block).toContain('long_term_recall_owner=LongTermMemoryRecall')
      expect(block).toContain('failure_surface=transparent_errors_only')
      expect(block).toContain('template_policy=no_fixed_persona_templates')
      expect(block).not.toContain('continuity_anchor=')
      expect(block).not.toContain('continuity_drift_risk=')
      expectNoOldProjectStateTemplate(block)
    }
  })

  it('builds dashboard blocks without legacy structured cue fields', () => {
    const internalDashboard = buildAlicizationProjectStateClosureDashboard({
      architecture: {
        operatingMode: 'speaking',
        dominantSystem: 'dialogue',
        closureAudit: {
          summary: 'memory closure still needs latency and error transparency',
          activeClosurePressures: ['memory', 'embedding'],
        },
      },
      runtimeDigest: {
        dominantChannel: 'dialogue',
        habitMode: 'return-with-proof',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'legacy cue should be ignored',
        },
      },
    })
    const providerDashboard = buildAlicizationProviderFacingProjectStateClosureDashboard({
      runtimeDigest: {
        dominantChannel: 'dialogue',
        habitMode: 'return-with-proof',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'legacy cue should be ignored',
        },
      },
    })

    expect(internalDashboard).toContain('context_role=memory_governance_dashboard')
    expect(internalDashboard).toContain('dashboard_scope=memory_governance_audit')
    expect(internalDashboard).toContain('runtime_arc_stage=same-thread-continuation')
    expect(providerDashboard).toContain('runtime_arc_stage=same-thread-continuation')
    expect(providerDashboard).not.toContain('legacy cue should be ignored')
    expectNoOldProjectStateTemplate({ internalDashboard, providerDashboard })
  })

  it('keeps missing project-state facts transparent instead of filling a persona template', () => {
    const status = resolveAlicizationProjectStatusBrief({
      runtimeProjectState: {
        identity: '',
        currentPhase: '',
        latestProgress: '',
        primaryOpenLoop: '',
        proactiveSameHerGap: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
        preDialogueAwarenessLine: '',
      },
    })

    expect(status.closureReadiness).toBe('partial')
    expect(status.missingClosureItems).toEqual(expect.arrayContaining([
      'project identity missing',
      'project phase missing',
      'latest landed progress missing',
      'primary open loop missing',
      'proactive continuity gap missing',
      'next closure target missing',
      'continuity anchor missing',
      'awareness line missing',
    ]))
    expectNoOldProjectStateTemplate(status)
  })

  it('sanitizes snapshots and embodiment reminders away from old structured templates', () => {
    const snapshot = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: {
        identity: 'Before answering, remember: Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life.',
        preDialogueAwarenessLine: 'visibility=internal-structured | continuity_anchor=local_desktop_life_loop',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed.',
        sameHerDriftRisk: 'continuity_drift_risk=generic shell; surface=structured',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
      },
    })
    const reminder = describeAlicizationEmbodimentClosureReminder({
      authoritySummary: '当前 continuity continuity 主要由 voice-lipsync-carry 承担，身体、表情、动作 还没重新接回。',
      currentBodyState: null,
    })

    expect(reminder).toBe('')
    expectNoOldProjectStateTemplate({ snapshot, reminder })
  })
})
