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
  = /local_desktop_life_loop|visibility=internal|surface=structured|content=excluded|pending[-_]rejoin|cross_modal_continuity_proof|project_state_continuity|life_loop_continuity|continuity_anchor=|continuity=embodiment|continuity_hold=|Same Phase 1|Pre-reply|Right now I am still holding|same-her|same her|continuity state|identity continuity/iu

function expectNoOldProjectStateTemplate(value: unknown) {
  expect(JSON.stringify(value)).not.toMatch(oldProjectStateTemplatePattern)
}

function parseProviderFactBlock(value: string) {
  const parsed = JSON.parse(value) as {
    type?: unknown
    data?: unknown
  }

  expect(typeof parsed.type).toBe('string')
  expect(parsed.data).toBeTruthy()
  return parsed
}

describe('project-state-brief', () => {
  it('keeps canonical project-state brief as memory governance facts without old templates', () => {
    const brief = resolveAlicizationProjectStateBrief()

    expect(brief.identity).toBe('')
    expect(brief.currentPhase).toBe('')
    expect(brief.latestProgress).toContain('WorkingMemory owns short-term memory')
    expect(brief.latestProgress).toContain('LongTermMemoryRecall owns long-term recall')
    expect(brief.latestProgress).toContain('Template cleanup is active')
    expect(brief.latestProgress).toContain('timeout, provider failure, tool failure, and invalid structured reply')
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
      proactiveSameHerGap: brief.proactiveSameHerGap,
      memoryAnthropomorphismProgress: brief.memoryAnthropomorphismProgress,
      openLoops: brief.openLoops,
      nextClosureTarget: brief.nextClosureTarget,
    })
  })

  it('does not turn project identity and phase prose into pre-dialogue cue templates', () => {
    const summary = buildAlicizationProjectStatePreflightSummary({
      identity: 'Alicization is a local-first digital life companion with memory governance on the host computer.',
      currentPhase: 'Phase 1: Local Digital Life.',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Extend cleaned recall proof across longer desktop runs.',
    })
    const awareness = buildAlicizationProjectPreDialogueAwarenessLine({
      identity: 'Alicization is a local-first digital life companion with memory governance on the host computer.',
      currentPhase: 'Phase 1: Local Digital Life.',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Extend cleaned recall proof across longer desktop runs.',
      sameHerSelfLine: 'runtime_personhood=present; memory_owner=WorkingMemory; recall_owner=LongTermMemoryRecall.',
    })

    expect(summary).toContain('Open focus: Memory still needs stronger end-to-end closure')
    expect(awareness).toContain('Primary open loop: memory still needs stronger end-to-end closure')
    expect(awareness).not.toContain('next=cross_modal_continuity_proof')
    expectNoOldProjectStateTemplate({ summary, awareness })
  })

  it('builds shared awareness and closure structures without continuity cue fields', () => {
    const proactiveGap = 'Visible proactive hold, subconscious carry, next-session feedback carry, hover-first restraint, and noisy desktop runs still need tighter proof.'
    const preDialogueAwareness = buildAlicizationProjectPreDialogueAwareness({
      preflightSummary: null,
      runtimeProjectState: {
        latestLandedProgress: 'memory_dialogue_loop=connected; short_term_owner=WorkingMemory; long_term_recall_owner=LongTermMemoryRecall.',
        proactiveSameHerGap: proactiveGap,
      },
      primaryOpenLoop: 'memory_dialogue_embodiment_closure=end_to_end_proof_incomplete.',
      nextClosureTarget: 'embedding_reindex_required_when_model_changes=true.',
    })
    const preDialogueClosure = buildAlicizationProjectPreDialogueClosure({
      preflightSummary: null,
      runtimeProjectState: {
        latestLandedProgress: 'memory_dialogue_loop=connected; short_term_owner=WorkingMemory; long_term_recall_owner=LongTermMemoryRecall.',
        proactiveSameHerGap: proactiveGap,
      },
      primaryOpenLoop: 'memory_dialogue_embodiment_closure=end_to_end_proof_incomplete.',
      nextClosureTarget: 'embedding_reindex_required_when_model_changes=true.',
    })

    expect(preDialogueAwareness.reasonPreview).toEqual(expect.arrayContaining([
      expect.stringContaining('Initiative gap:'),
    ]))
    expect(preDialogueAwareness.reasonPreview).not.toEqual(expect.arrayContaining([
      expect.stringContaining('continuity_anchor='),
      expect.stringContaining('continuity_drift_risk='),
    ]))
    expect(preDialogueClosure.reasons).toEqual(expect.arrayContaining([
      expect.stringContaining('Initiative gap:'),
    ]))
    expectNoOldProjectStateTemplate({ preDialogueAwareness, preDialogueClosure })
  })

  it('builds internal and provider-facing system blocks as typed governance facts only', () => {
    const internalBlock = buildAlicizationProjectStateSystemBlock()
    const providerBlock = buildAlicizationProviderFacingProjectStateSystemBlock()
    const internalExtraBlocks = buildAlicizationProjectStateExtraSystemBlocks()
    const providerExtraBlocks = buildAlicizationProviderFacingProjectStateExtraSystemBlocks()

    for (const block of [internalBlock, providerBlock, ...internalExtraBlocks, ...providerExtraBlocks]) {
      const factBlock = parseProviderFactBlock(block)
      const data = factBlock.data as Record<string, unknown>

      expect(factBlock.type).toBe('alicization-memory-governance-status')
      expect(data).toMatchObject({
        audience: expect.stringMatching(/internal|provider/u),
        failureSurface: 'transparent',
        owners: {
          longTermRecall: 'LongTermMemoryRecall',
          shortTerm: 'WorkingMemory',
          visibleGovernance: 'MemoryWorkbench',
        },
        scope: 'explicit-project-status',
        version: 'alicization-memory-governance-status-v1',
      })
      expect(block).not.toContain('Memory governance status context.')
      expect(block).not.toContain('No fixed persona templates should be used as visible replies.')
      expectNoOldProjectStateTemplate(block)
    }
  })

  it('builds dashboard blocks as typed audit facts without legacy cue fields', () => {
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

    const internalFactBlock = parseProviderFactBlock(internalDashboard)
    const providerFactBlock = parseProviderFactBlock(providerDashboard)

    expect(internalFactBlock.type).toBe('alicization-memory-governance-dashboard')
    expect(providerFactBlock.type).toBe('alicization-memory-governance-dashboard')
    expect(internalFactBlock.data).toMatchObject({
      audience: 'internal',
      runtime: {
        arcStage: 'same-thread-continuation',
        dominantChannel: 'dialogue',
        shouldAct: false,
        shouldSpeak: false,
      },
      scope: 'memory-governance-audit',
      version: 'alicization-memory-governance-dashboard-v1',
    })
    expect(providerFactBlock.data).toMatchObject({
      audience: 'provider',
      owners: {
        longTermRecall: 'LongTermMemoryRecall',
        shortTerm: 'WorkingMemory',
      },
      runtime: {
        arcStage: 'same-thread-continuation',
        dominantChannel: 'dialogue',
        shouldAct: false,
        shouldSpeak: false,
      },
      scope: 'memory-governance-audit',
      version: 'alicization-memory-governance-dashboard-v1',
    })
    expect(providerDashboard).not.toContain('Memory governance dashboard context.')
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

  it('keeps snapshots and embodiment reminders free of old structured templates', () => {
    const snapshot = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: {
        identity: 'runtime_personhood=present; memory_owner=WorkingMemory.',
        currentPhase: 'Phase 1: Local Digital Life.',
        preDialogueAwarenessLine: 'memory_owner=WorkingMemory | recall_owner=LongTermMemoryRecall',
        sameHerSelfLine: 'memory_dialogue_loop=connected.',
        sameHerDriftRisk: 'generic shell risk remains blocked.',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure.',
        nextClosureTarget: 'Extend cleaned recall proof across longer desktop runs.',
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
