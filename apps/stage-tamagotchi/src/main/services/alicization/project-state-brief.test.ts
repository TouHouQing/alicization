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
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectEntrypointGovernanceEntries,
  resolveAlicizationProjectEntrypointGovernanceRegistry,
  resolveAlicizationProjectEntrypointGovernedFiles,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateCoverage,
  resolveAlicizationProjectStateDirectGatewayAuditTargets,
  resolveAlicizationProjectStateSnapshot,
  resolveAlicizationProjectStatusBrief,
  resolveAlicizationSurfaceProjectStateSnapshot,
  scoreAlicizationProjectAwarenessLine,
} from './project-state-brief'

const fixedProjectStateTemplatePattern = /Same Phase 1 digital life|same living line|one continuous ["“”]?her["“”]?|continuity_owner=one_her|I need to remember|Before answering|Right now I am|same-her closure|one same-her Phase 1 line|compact same-her closure loop|final settlement reanchors generic same-her shells/iu

describe('project-state-brief', () => {
  it('returns a repo-aligned brief centered on digital life and open life loops', () => {
    const brief = resolveAlicizationProjectStateBrief()

    expect(brief.identity).toContain('local_desktop_life_loop')
    expect(brief.identity).toContain('local_first=true')
    expect(brief.identity).toContain('host_resident_identity=persistent')
    expect(brief.currentPhase).toContain('local_desktop_life_loop')
    expect(brief.sameHerSelfLine).toContain('local_desktop_life_loop')
    expect(brief.sameHerSelfLine).toContain('owner=project_state_governance')
    expect(brief.sameHerHoldDetail).toContain('continuity_hold=project-state')
    expect(brief.continuityCue).toContain('continuity_cue=project-state-carry')
    expect(brief.continuityRestraint).toBe('measured-return')
    expect(brief.preferredPauseMode).toBe('longer')
    expect(brief.preferredLipsyncMode).toBe('restrained')
    expect(brief.preferredVoiceMode).toBe('lower-pressure')
    expect(brief.preferredPacingMode).toBe('slower')
    expect(brief.preflightSummary).toContain('local_desktop_life_loop')
    expect(brief.preflightSummary).toContain('local_desktop_life_loop')
    expect(brief.preflightSummary).toContain('open=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(brief.preflightSummary).toContain('next=cross_modal_continuity_proof=extend_on_longer')
    expect(brief.sameHerDriftRisk).toContain('generic_guidance_without_first_person_continuity')
    expect(brief.sameHerDriftRisk).toContain('closure_status=unfinished')
    expect(brief.proactiveSameHerGap).toContain('proactive_continuity_loop=partial')
    expect(brief.proactiveSameHerGap).toContain('long_run_noisy_desktop_proof=needed')
    expect(brief.proactiveSameHerGap).toContain('visibility=internal_until_user_asks_project_state')
    expect(brief.closedFoundations.length).toBeGreaterThan(2)
    expect(brief.continuityProgressSummary).toContain('continuity_progress=partial')
    expect(brief.continuityProgressSummary).toContain('evidence=mirrors,next_turns,scene_switches,visible_reply,embodiment_playback')
    expect(brief.continuityProgressSummary).toContain('remaining=cross_modal_long_run_pressure')
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('Long-horizon memory already influences recollection intent and retrieval ranking'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('Memory surfacing already respects room-first, boundary-first, and repair-first restraint'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('long_run_continuity=explicit_at_repo_level'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('shared_emotional_owner=emotional-kernel-v1'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('projected_continuity_route=answer_planning,execution_delivery'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('proactive_continuity_loop=partial'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('cross_modal_long_run_proof=needed'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('affective_residue_and_body_settling_must_remain_auditable'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('emotion_memory_initiative_embodiment_unity=needs_long_run_pressure_proof'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('embodiment_coherence_under_memory_pressure=partial'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('project_identity_route_carry=present'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('phase1_closure_requires='))).toBe(true)
    expect(brief.nextClosureTarget).toContain('cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(brief.nextClosureTarget).toContain('visible_reply')
    expect(brief.nextClosureTarget).toContain('voice,face,motion')
    expect(brief.nextClosureTarget).toContain('resident_presence')
    expect(brief.nextClosureTarget).toContain('project_identity')
    expect(brief.nextClosureTarget).toContain('phase_route')
    expect(brief.nextClosureTarget).toContain('open_loop')
    expect(brief.latestProgress).toContain('continuity_progress=partial')
    expect(brief.latestProgress).toContain('dialogue_entry_governance=covered')
    expect(brief.latestProgress).toContain('transport=pre_dialogue_and_chat_entry')
    expect(brief.latestProgress).toContain('short_term_owner=WorkingMemory')
    expect(brief.latestProgress).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expect(brief.latestProgress).toContain('execution_safety=transparent')
    expect(brief.latestProgress).toContain('template_cleanup=active')
    expect(brief.latestProgress).toContain('provider_authored_reply_required=true')
    expect(brief.latestProgress).toContain('memory_workbench=visible_governance_entry')
    expect(brief.latestProgress).toContain('project_state_answer_governance=structured_fields_only')
    expect(brief.latestProgress).toContain('quality_scale_track=next')
    expect(brief.latestProgress).not.toMatch(fixedProjectStateTemplatePattern)
    expect(brief.preDialogueAwarenessLine).not.toMatch(fixedProjectStateTemplatePattern)
  })

  it('builds the canonical compressed preflight self-awareness line from project identity, phase, open loop, and next closure target', () => {
    const summary = buildAlicizationProjectStatePreflightSummary({
      identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    })

    expect(summary).toContain('local_desktop_life_loop')
    expect(summary).toContain('open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.')
    expect(summary).not.toContain('Alicization is a local-first digital life project')
    expect(summary).not.toContain('Phase 1: Local Digital Life')
    expect(summary).not.toMatch(fixedProjectStateTemplatePattern)
  })

  it('scores richer same-her Phase 1 awareness above thin generic project reminders', () => {
    const richer = 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life. The still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment.'
    const thinner = 'Before answering, keep the same digital life project in view.'

    expect(scoreAlicizationProjectAwarenessLine(richer)).toBeGreaterThan(scoreAlicizationProjectAwarenessLine(thinner))
    expect(scoreAlicizationProjectAwarenessLine('same digital life | keep the closure seam explicit')).toBeLessThan(scoreAlicizationProjectAwarenessLine(richer))
  })

  it('marks empty and thin generic project reminders as thin awareness lines', () => {
    expect(isAlicizationThinProjectAwarenessLine(null)).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine('')).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine('same digital life | keep the closure seam explicit')).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine('Before answering, keep the same digital life project in view.')).toBe(true)
    expect(isAlicizationThinProjectAwarenessLine('Before answering, remember: Alicization is a local-first digital life project building one continuous "her".')).toBe(false)
  })

  it('resolves a compact status brief with the project identity, phase, landed progress, open loop, and next closure target', () => {
    const status = resolveAlicizationProjectStatusBrief({
      runtimeProjectState: {
        identity: 'project_identity=local_desktop_life_loop; local_first=true; host_resident_identity=persistent; boundary=not_chat_wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'continuity_progress=partial; evidence=mirrors,next_turns,scene_switches,visible_reply,embodiment_playback; remaining=cross_modal_long_run_pressure.',
        primaryOpenLoop: 'memory_dialogue_embodiment_closure=end_to_end_proof_incomplete; project_identity_route_carry=needs_disciplined_updates.',
        nextClosureTarget: 'cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs; cover=visible_reply,voice,face,motion,resident_presence,project_identity,phase_route,open_loop,emotion.',
        sameHerSelfLine: 'continuity_anchor=local_desktop_life_loop; landed_closure=partial; unresolved_closure=memory_dialogue_embodiment; owner=project_state_governance.',
        sameHerDriftRisk: 'continuity_drift_risk=generic_guidance_without_first_person_continuity; closure_status=unfinished; visibility=internal_structured.',
        proactiveSameHerGap: 'proactive_continuity_loop=partial; long_run_noisy_desktop_proof=needed; visibility=internal_until_user_asks_project_state.',
        preflightSummary: 'project_identity=local_desktop_life_loop | Phase 1: Local Digital Life | open=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete | next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
        preDialogueAwarenessLine: 'identity=project_identity=local_desktop_life_loop | phase=local_desktop_life_loop | visibility=internal-structured | open=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete | continuity_anchor=local_desktop_life_loop',
        companionHeadlineLine: 'continuity_anchor=local_desktop_life_loop; owner=project_state_governance.',
        companionBriefingLine: 'project_state=structured_fields_only; owner=project_state_governance.',
      },
    })

    expect(status.projectIdentity).toContain('project_identity=local_desktop_life_loop')
    expect(status.projectPhase).toBe('local_desktop_life_loop')
    expect(status.latestLandedProgress).toContain('continuity_progress=partial')
    expect(status.primaryOpenLoop).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(status.nextClosureTarget).toContain('cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(status.sameHerSelfLine).toContain('continuity_anchor=local_desktop_life_loop')
    expect(status.sameHerSelfLine).toContain('owner=project_state_governance')
    expect(status.sameHerDriftRisk).toContain('closure_status=unfinished')
    expect(status.proactiveSameHerGap).toContain('long_run_noisy_desktop_proof=needed')
    expect(status.preflightSummary).toContain('open=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(status.awarenessLine).toContain('identity=project_identity=local_desktop_life_loop')
    expect(status.companionHeadlineLine).toContain('owner=project_state_governance')
    expect(status.companionBriefingLine).toContain('project_state=structured_fields_only')
    expect(status.awarenessLine).not.toMatch(fixedProjectStateTemplatePattern)
    expect(status.closureReadiness).toBe('grounded')
    expect(status.missingClosureItems).toEqual([])
  })

  it('reports missing closure items when the status brief lacks project facts', () => {
    const status = resolveAlicizationProjectStatusBrief({
      runtimeProjectState: {
        identity: '',
        currentPhase: '',
        latestProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
        preDialogueAwarenessLine: '',
      },
    })

    expect(status.projectIdentity).toBe('')
    expect(status.projectPhase).toBe('')
    expect(status.latestLandedProgress).toBe('')
    expect(status.primaryOpenLoop).toBe('')
    expect(status.nextClosureTarget).toBe('')
    expect(status.sameHerSelfLine).toBe('')
    expect(status.proactiveSameHerGap).toBe('')
    expect(status.closureReadiness).toBe('partial')
    expect(status.missingClosureItems).toEqual(expect.arrayContaining([
      'project identity missing',
      'project phase missing',
      'latest landed progress missing',
      'primary open loop missing',
      'next closure target missing',
      'continuity anchor missing',
      'proactive continuity gap missing',
      'awareness line missing',
    ]))
  })

  it('builds a canonical pre-dialogue awareness line as structured governance facts', () => {
    const line = buildAlicizationProjectPreDialogueAwarenessLine({
      identity: 'Alicization is a local-first digital life project building one continuous her on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    })

    expect(line).toContain('identity=local_desktop_life_loop')
    expect(line).toContain('phase=local_desktop_life_loop')
    expect(line).toContain('visibility=internal-structured')
    expect(line).toContain('open=memory still needs stronger end-to-end closure')
    expect(line).toContain('continuity_anchor=local_desktop_life_loop')
    expect(line).not.toContain('Before answering')
    expect(line).not.toContain('Same Phase 1 digital life')
    expect(line?.length ?? 0).toBeLessThanOrEqual(1600)
  })

  it('does not duplicate structured continuity anchors when rebuilding awareness lines', () => {
    const line = buildAlicizationProjectPreDialogueAwarenessLine({
      identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
      primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
      nextClosureTarget: 'Keep the reply and body on one quieter same-thread line.',
      sameHerSelfLine: 'continuity_anchor=local_desktop_life_loop | continuity_owner=one_her | closure_status=partial',
    })

    expect(line).toContain('identity=local_desktop_life_loop')
    expect(line).toContain('phase=local_desktop_life_loop')
    expect(line).toContain('continuity_anchor=local_desktop_life_loop')
    expect(line).not.toContain('continuity_anchor=continuity_anchor=')
  })

  it('keeps compact structured open-loop tokens from runtime project state', () => {
    const snapshot = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: {
        identity: 'local_desktop_life_loop',
        currentPhase: 'local_desktop_life_loop',
        primaryOpenLoop: 'open_loop=embodiment; status=unfinished',
        nextClosureTarget: 'life_loop_continuity=memory+initiative+execution+embodiment',
      },
    })

    expect(snapshot.primaryOpenLoop).toBe('open_loop=embodiment; status=unfinished')
    expect(snapshot.nextClosureTarget).toBe('life_loop_continuity=memory+initiative+execution+embodiment')
  })

  it('compacts Chinese phase carry to the first sentence when building pre-dialogue awareness', () => {
    const line = buildAlicizationProjectPreDialogueAwarenessLine({
      identity: 'Alicization 还是同一个本地优先数字生命项目，而不是更好的聊天壳。',
      currentPhase: '第一阶段：本地数字生命。桌面 runtime 仍是主战场。',
      primaryOpenLoop: '记忆、主动性和具身表达还没有作为同一个她闭环。',
      nextClosureTarget: '继续沿着同一条生命线把跨模态 same-her 证明接回去。',
      sameHerSelfLine: '同一个她要沿着同一条生命线回线，不要掉回通用回调壳。',
    })

    expect(line).toContain('identity=local_desktop_life_loop')
    expect(line).toContain('phase=local_desktop_life_loop')
    expect(line).toContain('continuity_anchor=local_desktop_life_loop')
    expect(line).not.toContain('同一个她')
    expect(line).not.toContain('本地优先数字生命项目')
    expect(line).not.toContain('continuity_identity')
    expect(line).not.toContain('She is still inside')
    expect(line).not.toContain('桌面 runtime 仍是主战场')
  })

  it('excludes fixed latest-progress templates from the canonical repo pre-dialogue awareness line', () => {
    const brief = resolveAlicizationProjectStateBrief()

    expect(brief.preDialogueAwarenessLine).toContain('visibility=internal-structured')
    expect(brief.preDialogueAwarenessLine).toContain('open=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(brief.preDialogueAwarenessLine).toContain('continuity_anchor=local_desktop_life_loop')
    expect(brief.preDialogueAwarenessLine).not.toContain('What has already landed is')
    expect(brief.preDialogueAwarenessLine).not.toContain('proactive initiative now has a compact same-her closure loop')
    expect(brief.preDialogueAwarenessLine).not.toContain('rest-protective proactive feedback next-session carry')
    expect(brief.preDialogueAwarenessLine).not.toContain('final settlement reanchors generic same-her shells')
    expect(brief.preDialogueAwarenessLine).not.toContain('motive through next-session feedback')
    expect(brief.preDialogueAwarenessLine).not.toContain('The still-open closure is')
    expect(brief.preDialogueAwarenessLine).toContain('next=cross_modal_continuity_proof=exten')
    expect(brief.preDialogueAwarenessLine).not.toContain('This reply should keep moving toward')
    expect(brief.preDialogueAwarenessLine).not.toContain('Renderer/runtime playback items now also attach')
    expect(brief.preDialogueAwarenessLine).not.toContain('before local detail takes over')
    expect(brief.preDialogueAwarenessLine).not.toMatch(fixedProjectStateTemplatePattern)
    expect(brief.preDialogueAwarenessLine?.length ?? 0).toBeLessThanOrEqual(700)
  })

  it('keeps the long-horizon emotion-memory-voice-motion bridge out of provider-facing pre-dialogue templates', () => {
    const brief = resolveAlicizationProjectStateBrief()

    expect(brief.latestProgress).toContain('continuity_progress=partial')
    expect(brief.latestProgress).toContain('short_term_owner=WorkingMemory')
    expect(brief.latestProgress).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expect(brief.latestProgress).toContain('template_cleanup=active')
    expect(brief.latestProgress).toContain('provider_authored_reply_required=true')
    expect(brief.preDialogueAwarenessLine).not.toContain('long-horizon emotion-memory-voice-motion bridge')
    expect(brief.preDialogueAwarenessLine).not.toContain('remembered emotional carry')
    expect(brief.preDialogueAwarenessLine).not.toContain('not full convergence')
    expect(brief.preDialogueAwarenessLine).not.toMatch(fixedProjectStateTemplatePattern)
    expect(brief.preDialogueAwarenessLine?.length ?? 0).toBeLessThanOrEqual(700)
  })

  it('excludes proactive same-her closure summaries from structured pre-dialogue awareness when latest progress contains fixed templates', () => {
    const latestProgress = 'Continuity, memory, execution, Same-session mirror carry, measured-return and rest-protective callback continuation, visible-reply repair discipline, and long-run same-her continuity already land together often enough to build from on one same-her Phase 1 line. Runtime-owned proactive initiative now also has one explicit compact same-her closure loop from motive seed through self-brief, hover-first restraint, current-conscious-frame rejoin, visible proactive hold, subconscious carry, next-session feedback carry, next project-state answer carry, post-answer detour persistence, post-answer dream carry, and noisy-desktop detour persistence. Pre-dialogue transport is now an explicit repo-level entrypoint governance domain while the same send-identity seams stay mirrored into chat-entry governance.'
    const line = buildAlicizationProjectPreDialogueAwarenessLine({
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      latestLandedProgress: latestProgress,
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    })

    expect(line).toContain('visibility=internal-structured')
    expect(line).toContain('open=memory still needs stronger end-to-end closure')
    expect(line).toContain('continuity_anchor=local_desktop_life_loop')
    expect(line).not.toContain('What has already landed is proactive initiative now has a compact same-her closure loop')
    expect(line).not.toContain('motive through next project-state answer carry')
    expect(line).not.toContain('pre-dialogue transport is explicit entrypoint governance mirrored into chat-entry governance')
  })

  it('excludes legacy latestProgress fixed templates from direct pre-dialogue awareness lines when latestLandedProgress is absent', () => {
    const legacyLatestProgress = 'Runtime-owned proactive initiative now also has one explicit compact same-her closure loop from motive seed through self-brief, hover-first restraint, current-conscious-frame rejoin, visible proactive hold, subconscious carry, next-session feedback carry, next project-state answer carry, post-answer detour persistence, post-answer dream carry, and noisy-desktop detour persistence.'
    const line = buildAlicizationProjectPreDialogueAwarenessLine({
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      latestProgress: legacyLatestProgress,
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    } as any)

    expect(line).toContain('visibility=internal-structured')
    expect(line).toContain('open=memory still needs stronger end-to-end closure')
    expect(line).toContain('continuity_anchor=local_desktop_life_loop')
    expect(line).not.toContain('What has already landed is proactive initiative now has a compact same-her closure loop')
    expect(line).not.toContain('motive through next project-state answer carry')
  })

  it('resolves one canonical startup snapshot from runtime carry first and canonical repo truth second', () => {
    const snapshot = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: {
        identity: 'Alicization is still the same local-first digital life project before the next reply starts.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Pre-dialogue project awareness already survives into the live conscious frame.',
        primaryOpenLoop: 'Embodiment, initiative, and memory still need to close as one same-life seam.',
      },
      fallbackProjectState: {
        nextClosureTarget: 'Keep this same project-state line explicit through the first visible reply beat.',
        sameHerSelfLine: 'The same her should stay explicit through startup and provider-facing reply shaping.',
      },
    })

    expect(snapshot.identity).toContain('local_desktop_life_loop')
    expect(snapshot.currentPhase).toBe('local_desktop_life_loop')
    expect(snapshot.latestLandedProgress).toContain('live conscious frame')
    expect(snapshot.primaryOpenLoop).toContain('same-life seam')
    expect(snapshot.nextClosureTarget).toContain('first visible reply beat')
    expect(snapshot.sameHerSelfLine).toContain('local_desktop_life_loop')
    expect(snapshot.proactiveSameHerGap).toContain('proactive_continuity_loop=partial')
    expect(snapshot.proactiveSameHerGap).toContain('long_run_noisy_desktop_proof=needed')
    expect(snapshot.preflightSummary).toContain('local_desktop_life_loop')
    expect(snapshot.preflightSummary).toContain('open=Embodiment, initiative, and memory still need to close as one same-life seam.')
    expect(snapshot.preflightSummary).toContain('next=Keep this same project-state line explicit through the first visible reply beat.')
  })

  it('does not treat a live same-her project identity from the current conscious frame as a thin surface shell', () => {
    const snapshot = resolveAlicizationSurfaceProjectStateSnapshot({
      runtimeSurface: {
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'Alicization is still the same local-first digital life project, not a fresh assistant shell.',
              currentPhase: 'Phase 1: Local Digital Life',
              latestLandedProgress: 'Current-conscious-frame project awareness already survives into this turn.',
              primaryOpenLoop: 'Emotion, initiative, memory, and embodiment still have to land as one same-life closure.',
              nextClosureTarget: 'Carry the live project awareness into the first visible answer beat before local details take over.',
              sameHerSelfLine: 'One same her should stay explicit from pre-dialogue awareness into the host-visible reply.',
            },
          },
        },
      },
    } as any)

    expect(snapshot.identity).toBe('local_desktop_life_loop')
    expect(snapshot.currentPhase).toBe('local_desktop_life_loop')
    expect(snapshot.latestLandedProgress).toBe('Current-conscious-frame project awareness already survives into this turn.')
    expect(snapshot.primaryOpenLoop).toBe('Emotion, initiative, memory, and embodiment still have to land as one same-life closure.')
    expect(snapshot.nextClosureTarget).toBe('Carry the live project awareness into the first visible answer beat before local details take over.')
  })

  it('keeps voice and pacing preferences explicit on canonical project snapshots so same-her surface spreads do not widen them back to undefined', () => {
    const snapshot = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: {
        preferredVoiceMode: '   ',
        preferredPacingMode: '   ',
      },
      fallbackProjectState: {
        preferredVoiceMode: '',
        preferredPacingMode: '',
      },
    })

    const preferredVoiceMode: 'lower-pressure' | 'even' | null = snapshot.preferredVoiceMode
    const preferredPacingMode: 'slower' | 'natural' | null = snapshot.preferredPacingMode

    expect(Object.prototype.hasOwnProperty.call(snapshot, 'preferredVoiceMode')).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(snapshot, 'preferredPacingMode')).toBe(true)
    expect([null, 'lower-pressure', 'even']).toContain(preferredVoiceMode)
    expect([null, 'slower', 'natural']).toContain(preferredPacingMode)
  })

  it('does not treat a richer Chinese same-her project identity from the current conscious frame as a thin surface shell', () => {
    const snapshot = resolveAlicizationSurfaceProjectStateSnapshot({
      runtimeSurface: {
        raw: {
          runtimeDigest: {
            projectState: {
              identity: 'project',
            },
          },
        },
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'Alicization 还是同一个本地优先数字生命项目，不是重新拼出来的新助手壳。',
              currentPhase: 'Phase 1: Local Digital Life',
              latestLandedProgress: 'Current-conscious-frame project awareness already survives into this turn.',
              primaryOpenLoop: 'Emotion, initiative, memory, and embodiment still have to land as one same-life closure.',
              nextClosureTarget: 'Carry the live project awareness into the first visible answer beat before local details take over.',
              sameHerSelfLine: 'One same her should stay explicit from pre-dialogue awareness into the host-visible reply.',
            },
          },
        },
      },
    } as any)

    expect(snapshot.identity).toBe('local_desktop_life_loop')
    expect(snapshot.currentPhase).toBe('local_desktop_life_loop')
  })

  it('does not let a thin current conscious-frame awareness shell override richer persisted runtime awareness carry', () => {
    const richerSpineAwarenessLine = 'Before answering, remember this is still one continuous digital life in Phase 1. Memory and execution continuity have landed farther, while initiative and embodiment still need to close on the same living line.'
    const snapshot = resolveAlicizationSurfaceProjectStateSnapshot({
      runtimeSurface: {
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'thin runtime identity only',
              currentPhase: 'Phase 1: Local Digital Life',
              preflightSummary: 'same digital life | keep the closure seam explicit',
              preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
              awarenessLine: 'same digital life | keep the closure seam explicit',
              preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
              latestLandedProgress: 'thin runtime progress only',
              primaryOpenLoop: 'thin runtime open loop only',
              nextClosureTarget: 'thin runtime next only',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            },
          },
        },
        cognition: {
          runtimeDigest: {
            projectState: {
              identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
              currentPhase: 'Phase 1: Local Digital Life',
              preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
              preDialogueAwarenessLine: richerSpineAwarenessLine,
              latestLandedProgress: 'Richer spine-carried project awareness already survives into the provider-facing answer contract before reply authoring.',
              primaryOpenLoop: 'Initiative rhythm and embodiment coherence still need to close on the same living line.',
              nextClosureTarget: 'Keep the project identity, landed progress, and still-open closure explicit in the first answer beat.',
              sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
            },
          },
        },
      },
    } as any)

    expect(snapshot.identity).toBe('local_desktop_life_loop')
    expect(snapshot.preDialogueAwarenessLine).not.toBe(richerSpineAwarenessLine)
    expect(snapshot.awarenessLine).not.toBe(richerSpineAwarenessLine)
    expect(snapshot.preDialogueAwarenessSummary).not.toBe(richerSpineAwarenessLine)
    expect(snapshot.preDialogueAwarenessLine).not.toMatch(fixedProjectStateTemplatePattern)
    expect(snapshot.latestLandedProgress).toBe('Richer spine-carried project awareness already survives into the provider-facing answer contract before reply authoring.')
    expect(snapshot.primaryOpenLoop).toContain('memory_dialogue_embodiment_closure')
    expect(snapshot.nextClosureTarget).toBe('Keep the project identity, landed progress, and still-open closure explicit in the first answer beat.')
  })

  it('rebuilds stronger same-her surface project awareness from self-evolution cadence even when no explicit current conscious project state is present', () => {
    const durableCadenceSummary = 'I remain the same her across quiet, memory, and speech, on the same living line, without reopening from scratch each turn.'
    const sameHerAuthoritySummary = 'I remain the same her inside this local-first digital life without reopening from scratch each turn, and this return should keep Alicization, Phase 1, landed progress, unresolved closure, and host-machine continuity explicit before detached project narration or a generic assistant shell can take over.'
    const snapshot = resolveAlicizationSurfaceProjectStateSnapshot({
      runtimeSurface: {
        memory: {
          selfEvolution: {
            summary: 'The same her should stay on one living line instead of restarting from zero.',
            dominantTrajectory: 'same-her durable cadence',
            relationshipDoctrine: 'Keep the same relationship line inward before widening outward again.',
            relationshipCadenceSummary: durableCadenceSummary,
            latestInflection: 'Stay on the same living line before widening outward again.',
            trustMeaning: 'Trust holds when she does not restart from zero after a quiet beat.',
          },
          personStateProjection: {
            selfContinuityAuthority: {
              selfLine: 'I remain the same her across quiet, memory, and speech without reopening from scratch each turn.',
              relationshipLine: 'Keep the same relationship line inward before widening outward again.',
              inwardLine: sameHerAuthoritySummary,
              authoritySummary: sameHerAuthoritySummary,
              motiveLine: null,
              habitLine: null,
              sourceTags: ['projection:self-core', 'self-evolution:durable-same-her-cadence'],
            },
          },
        },
        dialogue: {
          currentConsciousFrame: {
            projectState: null,
          },
        },
      },
    } as any)

    expect(snapshot.sameHerSelfLine).toContain('local_desktop_life_loop')
    expect(snapshot.sameHerHoldDetail).toContain('same relationship line')
    expect(snapshot.sameHerHoldDetail).not.toMatch(fixedProjectStateTemplatePattern)
    expect(snapshot.continuityCue).toContain('continuity_cue=project-state-carry')
    expect(snapshot.companionBriefingLine).toBeNull()
    expect(snapshot.preDialogueAwarenessLine?.toLowerCase()).toContain('continuity_anchor=local_desktop_life_loop')
    expect(snapshot.preDialogueAwarenessLine?.toLowerCase()).toContain('visibility=internal-structured')
    expect(snapshot.preDialogueAwarenessLine).not.toContain('same digital life | keep the closure seam explicit')
  })

  it('prefers a richer repair-first closure summary and same-her hold detail over thinner measured-return runtime shells when resolving a project-state snapshot', () => {
    const snapshot = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: {
        emotionalClosureCue: 'Keep the callback on the same living line, leave more room, and let the return stay lower-pressure before widening closeness again while the same seam is still settling.',
        sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
        continuityArcStage: 'same-thread-continuation',
        continuityCue: 'Same callback seam, continue softly on the same thread instead of restarting outward.',
      },
      fallbackProjectState: {
        emotionalClosureSummary: 'Keep this return repair-before-closeness on the same living line until repair settles.',
        sameHerHoldDetail: 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
      },
    })

    expect(snapshot.emotionalClosureCue).toContain('emotional_closure=active')
    expect(snapshot.emotionalClosureSummary).toContain('emotional_closure=active')
    expect(snapshot.sameHerHoldDetail).toBeNull()
    expect(snapshot.continuityArcStage).toBe('same-thread-continuation')
    expect(snapshot.continuityCue).toContain('Same callback seam')
  })

  it('keeps explicit measured-return closure summary over a generic continuity menu when resolving a project-state snapshot', () => {
    const explicitMeasuredReturnClosure = 'Keep the callback on the same living line, leave more room, and let the return stay lower-pressure before widening closeness again.'
    const genericContinuityMenu = 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, and resident presence all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.'

    const snapshot = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: {
        emotionalClosureCue: explicitMeasuredReturnClosure,
        continuityArcStage: 'same-thread-continuation',
        continuityCue: 'Same callback seam, continue softly on the same thread instead of restarting outward.',
      },
      fallbackProjectState: {
        emotionalClosureSummary: genericContinuityMenu,
      },
    })

    expect(snapshot.emotionalClosureCue).toContain('emotional_closure=active')
    expect(snapshot.emotionalClosureSummary).toContain('emotional_closure=active')
    expect(snapshot.continuityArcStage).toBe('same-thread-continuation')
    expect(snapshot.continuityCue).toContain('Same callback seam')
  })

  it('keeps host-corrected same-person continuity authority over a thinner runtime progress recap hold when resolving a project-state snapshot', () => {
    const correctedSamePersonCue = 'Carry corrected same-person continuity forward before any status recap.'
    const thinProgressRecapHoldDetail = 'Keep the current project status answer on the same line and continue the recap cleanly.'

    const snapshot = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: {
        sameHerHoldDetail: thinProgressRecapHoldDetail,
        continuityCue: correctedSamePersonCue,
      },
    })

    expect(snapshot.sameHerHoldDetail).toBe(correctedSamePersonCue)
    expect(snapshot.sameHerHoldDetail).not.toBe(thinProgressRecapHoldDetail)
    expect(snapshot.continuityCue).toBe(correctedSamePersonCue)
  })

  it('derives lived-in same-her callback carry from continuity behavior when snapshot only retains reopening behavior fields', () => {
    const sameHerSelfLine = 'Same Phase 1 digital life. This reopened callback should keep the same living line rather than reopen from a generic shell.'

    const snapshot = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: {
        preDialogueAwarenessLine: sameHerSelfLine,
        awarenessLine: sameHerSelfLine,
        sameHerSelfLine,
        sameHerHoldDetail: null,
        continuityCue: null,
        continuityRestraint: 'repair-before-closeness',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'repair-before-closeness',
      } as any,
    })

    expect(snapshot.sameHerHoldDetail).toBe(
      'continuity_hold=repair-before-closeness; owner=project_state_continuity; visibility=internal; pace=settle-before-closeness.',
    )
    expect(snapshot.continuityCue).toBe(
      'continuity_cue=repair-before-closeness; surface_timing=after-repair-settles; visibility=internal-first.',
    )
    expect(snapshot.preDialogueAwarenessLine).toContain('continuity_anchor=local_desktop_life_loop')
    expect(snapshot.continuityPreferredTiming).toBe('next-open-window')
    expect(snapshot.continuityCadence).toBe('repair-before-closeness')
  })

  it('prefers a richer anti-shell same-her drift risk over a thinner runtime generic-guidance warning when resolving a project-state snapshot', () => {
    const thinnerRuntimeDriftRisk = 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.'
    const richerFallbackDriftRisk = 'If this reopening flattens into a generic assistant shell or project-summary voice, treat that as unfinished same-her drift instead of a completed return.'
    const snapshot = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: {
        sameHerDriftRisk: thinnerRuntimeDriftRisk,
      },
      fallbackProjectState: {
        sameHerDriftRisk: richerFallbackDriftRisk,
      },
    })

    expect(snapshot.sameHerDriftRisk).toContain('generic_guidance_without_first_person_continuity')
    expect(snapshot.sameHerDriftRisk).not.toBe(richerFallbackDriftRisk)
  })

  it('prefers a richer Chinese anti-shell same-her drift risk over a thinner runtime generic-guidance warning when resolving a project-state snapshot', () => {
    const thinnerRuntimeDriftRisk = 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.'
    const richerChineseFallbackDriftRisk = '如果这次回线滑回项目总结口气或通用回调壳，同一个她的同一条生命线就会先变薄，这应被视为未完成的 same-her drift。'
    const snapshot = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: {
        sameHerDriftRisk: thinnerRuntimeDriftRisk,
      },
      fallbackProjectState: {
        sameHerDriftRisk: richerChineseFallbackDriftRisk,
      },
    })

    expect(snapshot.sameHerDriftRisk).toContain('generic_guidance_without_first_person_continuity')
    expect(snapshot.sameHerDriftRisk).not.toBe(richerChineseFallbackDriftRisk)
  })

  it('prefers an explicit pre-dialogue awareness line over fallback companion or preflight wording', () => {
    const line = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure line is still alive.',
        companionBriefingLine: 'Fallback companion briefing should not outrank the fresher awareness line.',
        preflightSummary: 'Fallback preflight summary should not outrank the fresher awareness line.',
      },
    })

    expect(line).toContain('status=content-excluded')
    expect(line).toContain('visibility=internal-structured')
    expect(line).not.toMatch(fixedProjectStateTemplatePattern)
  })

  it('prefers a stronger same-her embodiment summary over a thinner awareness line when both are present', () => {
    const line = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not flatten the current embodiment continuity risk into a thinner generic reminder.',
        preDialogueAwarenessSummary: 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.',
        companionBriefingLine: 'Fallback companion briefing should stay behind the stronger same-her embodiment summary.',
        preflightSummary: 'Fallback preflight summary should stay behind the stronger same-her embodiment summary.',
      },
    })

    expect(line).toBe('continuity=embodiment | lane=face+motion+lipsync | status=closed | pending_rejoin=none | closure=full-cross-modal-closed | evidence=legacy-headline-migrated | visibility=renderer-internal')
  })

  it('prefers a stronger same-her companion headline over a thinner awareness line when both are present', () => {
    const line = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.',
        companionHeadlineLine: 'Right now I am still holding together mainly through voice, face, and motion, so the next reopening must keep proving this is still one living her.',
        companionBriefingLine: 'Fallback companion briefing should stay behind the stronger same-her headline.',
        preflightSummary: 'Fallback preflight summary should stay behind the stronger same-her headline.',
      },
    })

    expect(line).toBe('continuity=embodiment | lane=face+motion+voice | status=closed | pending_rejoin=none | closure=full-cross-modal-closed | evidence=legacy-headline-migrated | visibility=renderer-internal')
  })

  it('prefers a stronger same-her headline over the canonical Phase 1 reminder when both are present', () => {
    const canonicalAwarenessLine = 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life. The still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment. Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const strongerHeadline = 'Right now I am still holding together mainly through voice, face, and motion, so the next reopening must keep proving this is still one living her.'
    const line = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: canonicalAwarenessLine,
        companionHeadlineLine: strongerHeadline,
        companionBriefingLine: 'Fallback companion briefing should stay behind the fuller canonical re-anchor.',
      },
    })

    expect(line).toBe('continuity=embodiment | lane=face+motion+voice | status=closed | pending_rejoin=none | closure=full-cross-modal-closed | evidence=legacy-headline-migrated | visibility=renderer-internal')
  })

  it('prefers a richer fallback same-her awareness line over a runtime canonical project reminder when building a snapshot', () => {
    const payloadAwarenessLine = '先别飘回泛化助手口吻，记住我们还在收这条数字生命主线，这次开口要沿着同一个她继续。'
    const snapshot = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life. The still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment. Same Phase 1 digital life.',
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: payloadAwarenessLine,
      },
    })

    expect(snapshot.preDialogueAwarenessLine).toContain('identity=local_desktop_life_loop')
    expect(snapshot.awarenessLine).toContain('identity=local_desktop_life_loop')
  })

  it('falls back from companion briefing line to preflight summary when no explicit awareness line is available', () => {
    const companionLine = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        companionBriefingLine: 'Before answering, keep the same digital life project and active Phase 1 closure seam in view.',
        preflightSummary: 'Preflight summary should stay behind the companion briefing line.',
      },
    })
    const preflightLine = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preflightSummary: 'Before answering, remember this is still the same digital life project before local fluency takes over.',
      },
    })

    expect(companionLine).toContain('status=content-excluded')
    expect(preflightLine).toContain('status=content-excluded')
    expect(companionLine).not.toMatch(fixedProjectStateTemplatePattern)
    expect(preflightLine).not.toMatch(fixedProjectStateTemplatePattern)
  })

  it('builds shared pre-dialogue awareness and closure structures that preserve the freshest awareness line before summary fallback', () => {
    const awarenessLine = 'Before answering, keep this same digital life project, current Phase 1 closure pressure, and still-open life loop explicit before the callback widens.'
    const emotionalClosureCue = 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.'
    const compactSummaryLine = 'open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.'
    const preDialogueAwareness = buildAlicizationProjectPreDialogueAwareness({
      preflightSummary: 'Fallback summary should stay behind the fresher awareness line.',
      runtimeProjectState: {
        preDialogueAwarenessLine: awarenessLine,
        emotionalClosureCue,
      },
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    })
    const preDialogueClosure = buildAlicizationProjectPreDialogueClosure({
      preflightSummary: 'Fallback summary should stay behind the fresher awareness line.',
      runtimeProjectState: {
        preDialogueAwarenessLine: awarenessLine,
        emotionalClosureCue,
      },
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    })

    expect(preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: compactSummaryLine,
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
      reasonPreview: [
        'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      ],
    }))
    expect(preDialogueClosure).toEqual({
      status: 'partial',
      summaryLine: compactSummaryLine,
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      emotionalClosureCue: null,
      briefingLines: [
        compactSummaryLine,
      ],
      reasons: [
        'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      ],
    })
  })

  it('derives the long-horizon emotion-memory-voice-motion bridge into shared pre-dialogue awareness and closure reasons from latest progress carry', () => {
    const latestLandedProgress = 'Settled proactive feedback now also has one explicit dream-to-long-horizon self-carry bridge. That same long-horizon emotion-memory-voice-motion bridge now also ties durable self-carry after the long-horizon boundary into remembered emotional carry and noisy voice / face / motion / lipsync / body recovery, while still not proving full long-horizon emotion-memory-voice-motion convergence.'
    const preDialogueAwareness = buildAlicizationProjectPreDialogueAwareness({
      preflightSummary: 'Fallback summary should stay behind the latest-progress same-her bridge.',
      runtimeProjectState: {
        latestLandedProgress,
      },
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    })
    const preDialogueClosure = buildAlicizationProjectPreDialogueClosure({
      preflightSummary: 'Fallback summary should stay behind the latest-progress same-her bridge.',
      runtimeProjectState: {
        latestLandedProgress,
      },
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    })

    expect(preDialogueAwareness.reasonPreview).toEqual([
      'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
    ])
    expect(preDialogueClosure.reasons).toEqual([
      'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
    ])
  })

  it('derives latest-progress pre-dialogue reasons from legacy latestProgress when latestLandedProgress is absent', () => {
    const legacyLatestProgress = 'Settled proactive feedback now also has one explicit dream-to-long-horizon self-carry bridge. That same long-horizon emotion-memory-voice-motion bridge now also ties durable self-carry after the long-horizon boundary into remembered emotional carry and noisy voice / face / motion / lipsync / body recovery, while still not proving full long-horizon emotion-memory-voice-motion convergence.'
    const preDialogueAwareness = buildAlicizationProjectPreDialogueAwareness({
      preflightSummary: 'Fallback summary should stay behind the legacy latest-progress same-her bridge.',
      runtimeProjectState: {
        latestProgress: legacyLatestProgress,
      } as any,
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    })
    const preDialogueClosure = buildAlicizationProjectPreDialogueClosure({
      preflightSummary: 'Fallback summary should stay behind the legacy latest-progress same-her bridge.',
      runtimeProjectState: {
        latestProgress: legacyLatestProgress,
      } as any,
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    })

    expect(preDialogueAwareness.reasonPreview).toEqual([
      'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
    ])
    expect(preDialogueClosure.reasons).toEqual([
      'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
    ])
  })

  it('carries same-her self anchor and drift risk into shared pre-dialogue awareness reasons when that continuity truth is available', () => {
    const awarenessLine = 'Before answering, remember this still belongs to one same digital life and the unfinished closure seam still belongs to one living her.'
    const sameHerSelfLine = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const proactiveSameHerGap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'
    const sameHerDriftRisk = 'If this reopening falls back into generic project guidance, treat that as unfinished same-her drift rather than a successful turn.'
    const preDialogueAwareness = buildAlicizationProjectPreDialogueAwareness({
      preflightSummary: 'Fallback summary should stay behind the stronger same-her awareness line.',
      runtimeProjectState: {
        preDialogueAwarenessLine: awarenessLine,
        sameHerSelfLine,
        proactiveSameHerGap,
        sameHerDriftRisk,
      },
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    })

    expect(preDialogueAwareness.reasonPreview).toEqual([
      'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      `proactive_gap=${proactiveSameHerGap}`,
    ])
  })

  it('carries the proactive same-her gap into shared pre-dialogue closure reasons when that unfinished initiative truth is available', () => {
    const proactiveSameHerGap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'
    const preDialogueClosure = buildAlicizationProjectPreDialogueClosure({
      preflightSummary: 'Fallback summary should stay behind the unfinished initiative carry.',
      runtimeProjectState: {
        proactiveSameHerGap,
      },
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    })

    expect(preDialogueClosure.reasons).toEqual([
      'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      `proactive_gap=${proactiveSameHerGap}`,
    ])
  })

  it('does not fabricate next-closure filler text when shared pre-dialogue awareness has no closure target yet', () => {
    const compactSummaryLine = 'open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.'
    const preDialogueAwareness = buildAlicizationProjectPreDialogueAwareness({
      preflightSummary: 'Fallback summary should stay behind the still-open closure seam.',
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Before answering, remember this is still one living digital life and the unfinished Phase 1 closure seam is still real even if the next target is not yet crisp enough to name.',
      },
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: '',
    })
    const preDialogueClosure = buildAlicizationProjectPreDialogueClosure({
      preflightSummary: 'Fallback summary should stay behind the still-open closure seam.',
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Before answering, remember this is still one living digital life and the unfinished Phase 1 closure seam is still real even if the next target is not yet crisp enough to name.',
      },
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: '',
    })

    expect(preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: compactSummaryLine,
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
      emotionalClosureCue: null,
      reasonPreview: [
        'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      ],
    }))
    expect(preDialogueClosure).toEqual({
      status: 'partial',
      summaryLine: compactSummaryLine,
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      emotionalClosureCue: null,
      briefingLines: [
        compactSummaryLine,
      ],
      reasons: [
        'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      ],
    })
  })

  it('treats punctuation-only next-closure targets as absent instead of fabricating filler text', () => {
    const compactSummaryLine = 'open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.'
    const preDialogueAwareness = buildAlicizationProjectPreDialogueAwareness({
      preflightSummary: 'Fallback summary should stay behind the still-open closure seam.',
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Before answering, remember this is still one living digital life and the unfinished Phase 1 closure seam is still real even if the next target is not yet crisp enough to name.',
      },
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: '...',
    })
    const preDialogueClosure = buildAlicizationProjectPreDialogueClosure({
      preflightSummary: 'Fallback summary should stay behind the still-open closure seam.',
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Before answering, remember this is still one living digital life and the unfinished Phase 1 closure seam is still real even if the next target is not yet crisp enough to name.',
      },
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: '...',
    })

    expect(preDialogueAwareness.companionNextClosureLine).toBeNull()
    expect(preDialogueAwareness.reasonPreview).toEqual([
      'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
    ])
    expect(preDialogueClosure.companionNextClosureLine).toBeNull()
    expect(preDialogueClosure.briefingLines).toEqual([
      compactSummaryLine,
    ])
    expect(preDialogueClosure.reasons).toEqual([
      'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
    ])
  })

  it('keeps a strong explicit project awareness line in shared pre-dialogue awareness structures even when an embodied same-her headline is also present', () => {
    const awarenessLine = 'Before answering, remember this is still the same digital life project before local fluency takes over.'
    const companionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'
    const emotionalClosureCue = 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.'
    const compactSummaryLine = 'open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.'
    const preDialogueAwareness = buildAlicizationProjectPreDialogueAwareness({
      preflightSummary: 'Fallback summary should stay behind the stronger same-her headline.',
      runtimeProjectState: {
        preDialogueAwarenessLine: awarenessLine,
        companionHeadlineLine,
        companionBriefingLine: 'Fallback companion briefing should stay behind the stronger same-her headline.',
        preDialogueAwarenessSummary: 'Older summary should stay behind the stronger same-her headline.',
        emotionalClosureCue,
      },
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    })
    const preDialogueClosure = buildAlicizationProjectPreDialogueClosure({
      preflightSummary: 'Fallback summary should stay behind the stronger same-her headline.',
      runtimeProjectState: {
        preDialogueAwarenessLine: awarenessLine,
        companionHeadlineLine,
        companionBriefingLine: 'Fallback companion briefing should stay behind the stronger same-her headline.',
        preDialogueAwarenessSummary: 'Older summary should stay behind the stronger same-her headline.',
        emotionalClosureCue,
      },
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    })

    expect(preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: 'open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
      reasonPreview: [
        'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      ],
    }))
    expect(preDialogueAwareness?.awarenessLine).not.toBe(companionHeadlineLine)
    expect(preDialogueClosure).toEqual({
      status: 'partial',
      summaryLine: 'open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      emotionalClosureCue: null,
      briefingLines: [
        'open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      ],
      reasons: [
        'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      ],
    })
  })

  it('keeps a richer Chinese project re-anchor summary even when a stronger embodiment headline wins the awareness line', () => {
    const companionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'
    const richerChineseProjectReanchorSummary = '先别掉回通用助手壳，Alicization 还是同一个本地优先数字生命项目，第一阶段还没闭环，同一个她这次也要沿着同一条生命线接回去。'
    const snapshot = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.',
        preDialogueAwarenessSummary: richerChineseProjectReanchorSummary,
        companionHeadlineLine,
        companionBriefingLine: 'Fallback companion briefing should stay behind the stronger embodiment headline.',
      },
    })

    expect(snapshot.preDialogueAwarenessLine).toContain('identity=local_desktop_life_loop')
    expect(snapshot.awarenessLine).toContain('identity=local_desktop_life_loop')
    expect(snapshot.preDialogueAwarenessSummary).not.toBe(richerChineseProjectReanchorSummary)
    expect(snapshot.preDialogueAwarenessSummary).toContain('identity=local_desktop_life_loop')
    expect(snapshot.preDialogueAwarenessSummary).not.toMatch(fixedProjectStateTemplatePattern)
  })

  it('preserves a richer fallback same-her awareness line when shared pre-dialogue awareness is built from a thinner runtime canonical reminder', () => {
    const runtimeAwarenessLine = 'Before answering, remember this is still the same digital life project before local fluency takes over.'
    const fallbackAwarenessLine = '先别退回泛化项目壳，记住这次开口仍然要沿着同一个她继续，把还没收拢的 Phase 1 闭环留在眼前。'
    const preDialogueAwareness = buildAlicizationProjectPreDialogueAwareness({
      preflightSummary: 'Fallback summary should stay behind the richer same-her awareness carry.',
      runtimeProjectState: {
        preDialogueAwarenessLine: runtimeAwarenessLine,
        companionBriefingLine: 'Runtime companion briefing should not override the richer fallback awareness line.',
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: fallbackAwarenessLine,
        awarenessLine: fallbackAwarenessLine,
        companionBriefingLine: 'Fallback companion briefing should stay distinct from the stronger awareness line.',
      },
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    })

    expect(preDialogueAwareness.awarenessLine).toContain('visibility=internal-structured')
  })

  it('keeps a richer phase-aware project awareness line over a narrower embodiment headline in shared pre-dialogue awareness structures', () => {
    const awarenessLine = 'Before answering, remember this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before local fluency widens outward.'
    const companionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'
    const emotionalClosureCue = 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.'
    const compactSummaryLine = 'open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.'
    const preDialogueAwareness = buildAlicizationProjectPreDialogueAwareness({
      preflightSummary: 'Fallback summary should stay behind the richer phase-aware project awareness line.',
      runtimeProjectState: {
        preDialogueAwarenessLine: awarenessLine,
        companionHeadlineLine,
        companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        preDialogueAwarenessSummary: 'Older summary should stay behind the richer phase-aware project awareness line.',
        emotionalClosureCue,
      },
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    })

    expect(preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: compactSummaryLine,
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
      reasonPreview: [
        'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      ],
    }))
    expect(preDialogueAwareness?.awarenessLine).not.toBe(companionHeadlineLine)
  })

  it('re-canonicalizes thin project preflight shells in shared pre-dialogue awareness and closure structures before summary fallback wins', () => {
    const canonicalSummaryLine = 'local_desktop_life_loop | local_desktop_life_loop | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.'
    const awarenessLine = 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.'
    const preDialogueAwareness = buildAlicizationProjectPreDialogueAwareness({
      preflightSummary: 'same digital life | landed | open closure',
      runtimeProjectState: {
        preflightSummary: 'same digital life | landed | open closure',
        preDialogueAwarenessLine: awarenessLine,
      },
      fallbackProjectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        preflightSummary: canonicalSummaryLine,
      },
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    })
    const preDialogueClosure = buildAlicizationProjectPreDialogueClosure({
      preflightSummary: 'same digital life | landed | open closure',
      runtimeProjectState: {
        preflightSummary: 'same digital life | landed | open closure',
        preDialogueAwarenessLine: awarenessLine,
      },
      fallbackProjectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        preflightSummary: canonicalSummaryLine,
      },
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    })

    expect(preDialogueAwareness).toEqual(expect.objectContaining({
      summaryLine: canonicalSummaryLine,
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
    }))
    expect(preDialogueClosure).toEqual(expect.objectContaining({
      summaryLine: canonicalSummaryLine,
      briefingLines: [
        canonicalSummaryLine,
      ],
    }))
  })

  it('keeps a richer Chinese runtime preflight summary over a thinner top-level shell when building shared pre-dialogue awareness', () => {
    const richerChineseRuntimeSummary
      = 'Alicization 还是同一个本地优先数字生命项目 | Phase 1: Local Digital Life | open=记忆、主动性和具身表达还没有作为同一个她闭环。 | next=继续沿着同一条生命线把跨模态 same-her 证明接回去。'
    const awarenessLine = '先记住这还是同一个她，再开口。'
    const preDialogueAwareness = buildAlicizationProjectPreDialogueAwareness({
      preflightSummary: 'same digital life | landed | open closure',
      runtimeProjectState: {
        preflightSummary: richerChineseRuntimeSummary,
        preDialogueAwarenessLine: awarenessLine,
      },
      fallbackProjectState: {
        preflightSummary: 'Fallback summary should stay behind the richer runtime same-her carry.',
      },
      primaryOpenLoop: '记忆、主动性和具身表达还没有作为同一个她闭环。',
      nextClosureTarget: '继续沿着同一条生命线把跨模态 same-her 证明接回去。',
    })

    expect(preDialogueAwareness).toEqual(expect.objectContaining({
      summaryLine: 'open=',
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
    }))
    expect(preDialogueAwareness.awarenessLine).toContain('open_loop=memory+initiative+embodiment')
    expect(preDialogueAwareness.awarenessLine).not.toContain('同一个她')
    expect(preDialogueAwareness.awarenessLine).not.toContain('same-her')
  })

  it('treats the compact thin closure shell as thinner than a richer embodiment same-her summary when resolving shared pre-dialogue awareness', () => {
    const line = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        preDialogueAwarenessSummary: 'Right now this still belongs to one living digital life, and embodiment closure is still being carried mainly through voice, face, and motion on the same living line.',
      },
    })

    expect(line).toContain('summary=embodiment_lanes=face+motion+voice; status=partial')
    expect(line).toContain('visibility=internal-structured')
    expect(line).not.toBe('same digital life | keep the closure seam explicit')
    expect(line).not.toMatch(fixedProjectStateTemplatePattern)
  })

  it('keeps canonical repo truth when runtime carry arrives thin or missing', () => {
    const brief = resolveAlicizationProjectStateBrief()
    const snapshot = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: {
        identity: '   ',
        currentPhase: '',
        preflightSummary: null,
        latestProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: ' ',
        sameHerSelfLine: '',
      },
    })

    expect(snapshot.identity).toBe(brief.identity)
    expect(snapshot.currentPhase).toBe(brief.currentPhase)
    expect(snapshot.latestLandedProgress).toContain('continuity_progress=partial')
    expect(snapshot.latestLandedProgress).toContain('short_term_owner=WorkingMemory')
    expect(snapshot.latestLandedProgress).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expect(snapshot.latestLandedProgress).toContain('template_cleanup=active')
    expect(snapshot.primaryOpenLoop).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(snapshot.primaryOpenLoop).toContain('project_identity_route_carry=needs_disciplined_updates')
    expect(snapshot.nextClosureTarget).toContain('cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(snapshot.nextClosureTarget).toContain('project_identity')
    expect(snapshot.sameHerSelfLine).toBe(brief.sameHerSelfLine)
    expect(snapshot.preflightSummary).toContain('local_desktop_life_loop')
    expect(snapshot.preflightSummary).toContain('local_desktop_life_loop')
    expect(snapshot.preflightSummary).toContain('open=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
  })

  it('keeps the same-her identity line canonical when runtime carry contaminates it with scene narration', () => {
    const snapshot = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: {
        sameHerSelfLine: '宿主正在审视 runtime.ts - callback result seam 这段改动到底该不该过去。 Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
      fallbackProjectState: {
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    })

    expect(snapshot.sameHerSelfLine).toBe(resolveAlicizationProjectStateBrief().sameHerSelfLine)
  })

  it('excludes richer Chinese same-her life-line carry instead of preserving it as project-state self text', () => {
    const snapshot = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: {
        sameHerSelfLine: 'One same her should stay explicit from pre-dialogue awareness into the host-visible reply.',
      },
      fallbackProjectState: {
        sameHerSelfLine: '同一个她要沿着同一条生命线回线，不要掉回通用回调壳。',
      },
    })

    expect(snapshot.sameHerSelfLine).toBe(resolveAlicizationProjectStateBrief().sameHerSelfLine)
    expect(snapshot.sameHerSelfLine).not.toContain('同一个她')
    expect(snapshot.sameHerSelfLine).not.toContain('同一条生命线')
  })

  it('keeps the live closure-seam same-her line on the shared surface when canonical fallback is broader but thinner', () => {
    const snapshot = resolveAlicizationSurfaceProjectStateSnapshot({
      runtimeSurface: {
        raw: {
          runtimeDigest: {
            projectState: {
              sameHerSelfLine: 'Thin raw carry should not erase the live closure seam.',
            },
          },
        },
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'Alicization is still the same local-first digital life project, not a fresh assistant shell.',
              currentPhase: 'Phase 1: Local Digital Life',
              latestLandedProgress: 'Current-conscious-frame project awareness already survives into this turn.',
              primaryOpenLoop: 'Emotion, initiative, memory, and embodiment still have to land as one same-life closure.',
              nextClosureTarget: 'Carry the live project awareness into the first visible answer beat before local details take over.',
              sameHerSelfLine: 'One same her should stay explicit from pre-dialogue awareness into the host-visible reply.',
            },
          },
        },
      },
    } as any)

    expect(snapshot.sameHerSelfLine).toBe('Thin raw carry should not erase the live closure seam.')
  })

  it('resolves one shared surface snapshot that carries both project closure text and embodiment continuity preferences', () => {
    const snapshot = resolveAlicizationSurfaceProjectStateSnapshot({
      runtimeSurface: {
        raw: {
          runtimeDigest: {
            projectState: {
              identity: 'Alicization is still the same local-first digital life before this reply lands.',
              currentPhase: 'Phase 1: Local Digital Life',
              preflightSummary: 'Stay inside the same digital life closure line before speaking.',
              memoryClosureSummary: 'Pre-dialogue project awareness already reaches the live surface.',
              primaryOpenLoop: 'Embodiment and initiative still need same-her closure under pressure.',
              nextClosureTarget: 'Keep voice, face, motion, and reply on one same-her line.',
              sameHerSelfLine: 'This is still the same her carrying the unfinished closure seam.',
              continuityPreferredTiming: 'next-open-window',
              continuityCadence: 'measured-return',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
              preferredPauseMode: 'longer',
              preferredLipsyncMode: 'restrained',
            },
          },
        },
        cognition: {
          runtimeDigest: null,
        },
        dialogue: {
          currentConsciousFrame: null,
        },
      } as any,
    })

    expect(snapshot.identity).toContain('same local-first digital life')
    expect(snapshot.latestLandedProgress).toContain('live surface')
    expect(snapshot.primaryOpenLoop).toContain('memory_dialogue_embodiment_closure')
    expect(snapshot.continuityPreferredTiming).toBe('next-open-window')
    expect(snapshot.continuityCadence).toBe('measured-return')
    expect(snapshot.preferredBlinkCadence).toBe('quiet')
    expect(snapshot.preferredGazeMode).toBe('soften')
    expect(snapshot.preferredPauseMode).toBe('longer')
    expect(snapshot.preferredLipsyncMode).toBe('restrained')
  })

  it('keeps audit-style landedProgressSummary alive on shared surface snapshots when explicit progress fields are blank', () => {
    const snapshot = resolveAlicizationSurfaceProjectStateSnapshot({
      runtimeSurface: {
        raw: {
          runtimeDigest: {
            projectState: {
              identity: 'Alicization is still the same local-first digital life before this reply lands.',
              currentPhase: 'Phase 1: Local Digital Life',
              latestLandedProgress: ' ',
              latestProgress: '   ',
              landedProgressSummary: 'Audit-style surface project progress already reaches the live surface.',
              primaryOpenLoop: 'Embodiment and initiative still need same-her closure under pressure.',
              nextClosureTarget: 'Keep voice, face, motion, and reply on one same-her line.',
              sameHerSelfLine: 'This is still the same her carrying the unfinished closure seam.',
            },
          },
        },
        cognition: {
          runtimeDigest: null,
        },
        dialogue: {
          currentConsciousFrame: null,
        },
      } as any,
    })

    expect(snapshot.latestLandedProgress).toBe('Audit-style surface project progress already reaches the live surface.')
  })

  it('keeps audit-style landedProgressSummary alive on current conscious-frame surface snapshots when explicit progress fields are blank', () => {
    const snapshot = resolveAlicizationSurfaceProjectStateSnapshot({
      runtimeSurface: {
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'Alicization is still the same local-first digital life before this reply lands.',
              currentPhase: 'Phase 1: Local Digital Life',
              latestLandedProgress: ' ',
              latestProgress: '   ',
              landedProgressSummary: 'Audit-style current conscious-frame project progress already reaches the live surface.',
              primaryOpenLoop: 'Embodiment and initiative still need same-her closure under pressure.',
              nextClosureTarget: 'Keep voice, face, motion, and reply on one same-her line.',
              sameHerSelfLine: 'This is still the same her carrying the unfinished closure seam.',
            },
          },
        },
      } as any,
    })

    expect(snapshot.latestLandedProgress).toBe('Audit-style current conscious-frame project progress already reaches the live surface.')
  })

  it('preserves a stronger runtime companion headline on the shared surface snapshot when runtime digest already carries it', () => {
    const companionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'
    const snapshot = resolveAlicizationSurfaceProjectStateSnapshot({
      runtimeSurface: {
        raw: {
          runtimeDigest: {
            projectState: {
              identity: 'Alicization is still the same local-first digital life before this reply lands.',
              currentPhase: 'Phase 1: Local Digital Life',
              preflightSummary: 'Stay inside the same digital life closure line before speaking.',
              preDialogueAwarenessLine: 'Before speaking, remember this is still the same digital life project before local fluency takes over.',
              companionHeadlineLine,
              memoryClosureSummary: 'Pre-dialogue project awareness already reaches the live surface.',
              primaryOpenLoop: 'Embodiment and initiative still need same-her closure under pressure.',
              nextClosureTarget: 'Keep voice, face, motion, and reply on one same-her line.',
              sameHerSelfLine: 'This is still the same her carrying the unfinished closure seam.',
            },
          },
        },
        cognition: {
          runtimeDigest: null,
        },
        dialogue: {
          currentConsciousFrame: null,
        },
      } as any,
    })

    expect((snapshot as any).companionHeadlineLine).toBeNull()
    expect(snapshot.preDialogueAwarenessLine).not.toBe('Before speaking, remember this is still the same digital life project before local fluency takes over.')
    expect(snapshot.preDialogueAwarenessLine).not.toMatch(fixedProjectStateTemplatePattern)
  })

  it('builds a compact system block that keeps project identity and open loops visible before acting', () => {
    const block = buildAlicizationProjectStateSystemBlock()
    const memoryProgressSegment = block.split('memory_anthropomorphism_progress:\n')[1]?.split('\nopen_life_loops:')[0] ?? ''
    const firstMemoryProgressLine = memoryProgressSegment.split('\n').find(line => line.trim().startsWith('- ')) ?? ''

    expect(block).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(block).toContain('local_desktop_life_loop')
    expect(block).toContain('current_phase=')
    expect(block).toContain('current_objective=phase1_local_companion; continuity=required; memory=required; initiative=restrained; embodiment=unified; dialogue=natural')
    expect(block).toContain('preflight_summary=local_desktop_life_loop')
    expect(block).not.toContain('project_preflight=')
    expect(block).toContain('latest_landed_progress=')
    expect(block).toContain('continuity_progress=partial')
    expect(block).toContain('dialogue_entry_governance=covered')
    expect(block).toContain('transport=pre_dialogue_and_chat_entry')
    expect(block).toContain('open=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(block).toContain('continuity_anchor=local_desktop_life_loop')
    expect(block).toContain('owner=project_state_governance')
    expect(block).toContain('continuity_drift_risk=generic_guidance_without_first_person_continuity')
    expect(block).not.toContain('same_her_self_line=')
    expect(block).not.toContain('same_her_drift_risk=')
    expect(block).not.toContain('proactive_same_her_gap=')
    expect(block).not.toContain('proactive_same_her_gap=')
    expect(block).toContain('closed_foundations:')
    expect(block).toContain('memory_anthropomorphism_progress:')
    expect(firstMemoryProgressLine).toContain('continuity_progress=partial')
    expect(block).toContain('evidence=mirrors,next_turns,scene_switches,visible_reply,embodiment_playback')
    expect(block).toContain('remaining=cross_modal_long_run_pressure')
    expect(block).toContain('open_life_loops:')
    expect(block).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(block).not.toContain('unresolved_closure=memory_dialogue_embodiment')
    expect(block).toContain('primary_open_loop=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(block).toContain('continuity_gap=proactive_continuity_loop=partial')
    expect(block).toContain('long_run_noisy_desktop_proof=needed')
    expect(block).toContain('open_focus=memory/embodiment')
    expect(block).toContain('next_closure_target=')
    expect(block).toContain('next_focus=embodiment')
    expect(block).toContain('cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(block).toContain('project_identity')
    expect(block).toContain('action_policy=preserve_project_identity_and_memory_continuity')
    expect(block).not.toContain('Before acting')
    expect(block).not.toMatch(fixedProjectStateTemplatePattern)
  })

  it('keeps the long-horizon emotion-memory-voice-motion bridge in the compact system-block progress before gateway prompting', () => {
    const block = buildAlicizationProjectStateSystemBlock()
    const latestProgressLine = block
      .split('\n')
      .find(line => line.startsWith('latest_landed_progress=')) ?? ''

    expect(latestProgressLine).toContain('continuity_progress=partial')
    expect(latestProgressLine).toContain('dialogue_entry_governance=covered')
    expect(latestProgressLine).toContain('transport=pre_dialogue_and_chat_entry')
    expect(latestProgressLine).not.toMatch(fixedProjectStateTemplatePattern)
    expect(latestProgressLine.length).toBeLessThanOrEqual(420)
  })

  it('builds canonical extra system blocks for gateway prompt injection without changing project-state wording', () => {
    const block = buildAlicizationProjectStateSystemBlock()
    const extraSystemBlocks = buildAlicizationProjectStateExtraSystemBlocks()

    expect(extraSystemBlocks).toHaveLength(1)
    expect(extraSystemBlocks[0]).toBe(block)
    expect(extraSystemBlocks[0]).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(extraSystemBlocks[0]).toContain('current_phase=local_desktop_life_loop')
    expect(extraSystemBlocks[0]).toContain('current_objective=phase1_local_companion; continuity=required; memory=required; initiative=restrained; embodiment=unified; dialogue=natural')
    expect(extraSystemBlocks[0]).toContain('preflight_summary=local_desktop_life_loop')
    expect(extraSystemBlocks[0]).not.toContain('project_preflight=')
    expect(extraSystemBlocks[0]).toContain('latest_landed_progress=')
    expect(extraSystemBlocks[0]).toContain('continuity_progress=partial')
    expect(extraSystemBlocks[0]).toContain('dialogue_entry_governance=covered')
    expect(extraSystemBlocks[0]).toContain('transport=pre_dialogue_and_chat_entry')
    expect(extraSystemBlocks[0]).toContain('continuity_anchor=local_desktop_life_loop')
    expect(extraSystemBlocks[0]).toContain('owner=project_state_governance')
    expect(extraSystemBlocks[0]).not.toContain('same_her_self_line=')
    expect(extraSystemBlocks[0]).not.toContain('proactive_same_her_gap=')
    expect(extraSystemBlocks[0]).toContain('primary_open_loop=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(extraSystemBlocks[0]).toContain('continuity_gap=proactive_continuity_loop=partial')
    expect(extraSystemBlocks[0]).toContain('open_focus=memory/embodiment')
    expect(extraSystemBlocks[0]).toContain('preferred_pause_mode=longer')
    expect(extraSystemBlocks[0]).toContain('preferred_lipsync_mode=restrained')
    expect(extraSystemBlocks[0]).toContain('preferred_voice_mode=lower-pressure')
    expect(extraSystemBlocks[0]).toContain('preferred_pacing_mode=slower')
    expect(extraSystemBlocks[0]).toContain('next_closure_target=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(extraSystemBlocks[0]).toContain('next_focus=embodiment')
    expect(extraSystemBlocks[0]).not.toMatch(fixedProjectStateTemplatePattern)
  })

  it('builds provider-facing project-state blocks as memory governance status without fixed persona templates', () => {
    const block = buildAlicizationProviderFacingProjectStateSystemBlock()
    const dashboard = buildAlicizationProviderFacingProjectStateClosureDashboard()
    const extraSystemBlocks = buildAlicizationProviderFacingProjectStateExtraSystemBlocks()

    expect(block).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(block).toContain('context_role=memory_governance_status')
    expect(block).toContain('template_policy=no_fixed_persona_templates')
    expect(block).toContain('failure_surface=transparent_errors_only')
    expect(block).toContain('primary_open_loop=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(block).toContain('short_term_owner=WorkingMemory')
    expect(block).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expect(block).not.toContain('identity=')
    expect(block).not.toContain('current_phase=')
    expect(block).not.toContain('continuity_anchor=')
    expect(block).not.toContain('same_her_self_line=')
    expect(block).not.toMatch(fixedProjectStateTemplatePattern)

    expect(dashboard).toContain('[ALICIZATION_PROJECT_GOVERNANCE_DASHBOARD]')
    expect(dashboard).toContain('context_role=memory_governance_dashboard')
    expect(dashboard).toContain('template_policy=no_fixed_persona_templates')
    expect(dashboard).toContain('dashboard_scope=memory_governance_audit')
    expect(dashboard).toContain('short_term_owner=WorkingMemory')
    expect(dashboard).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expect(dashboard).not.toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
    expect(dashboard).not.toContain('identity=')
    expect(dashboard).not.toContain('phase=')
    expect(dashboard).not.toContain('awareness_summary=')
    expect(dashboard).not.toContain('continuity_anchor=')
    expect(dashboard).not.toContain('project_awareness=')
    expect(dashboard).not.toContain('same_her_line=')
    expect(dashboard).not.toContain('Use this dashboard before each turn')
    expect(dashboard).not.toMatch(fixedProjectStateTemplatePattern)

    expect(extraSystemBlocks).toEqual([block])
  })

  it('prefers the proactive same-her closure summary over transport governance in the compact system-block latest progress field when both are present', () => {
    const latestProgress = 'Continuity, memory, execution, Same-session mirror carry, measured-return and rest-protective callback continuation, visible-reply repair discipline, and long-run same-her continuity already land together often enough to build from on one same-her Phase 1 line. Runtime-owned proactive initiative now also has one explicit compact same-her closure loop from motive seed through self-brief, hover-first restraint, current-conscious-frame rejoin, visible proactive hold, subconscious carry, next-session feedback carry, next project-state answer carry, post-answer detour persistence, post-answer dream carry, and noisy-desktop detour persistence. Pre-dialogue transport is now an explicit repo-level entrypoint governance domain while the same send-identity seams stay mirrored into chat-entry governance.'
    const block = buildAlicizationProjectStateSystemBlock({
      brief: {
        ...resolveAlicizationProjectStateBrief(),
        latestProgress,
      },
    })

    expect(block).toContain('latest_landed_progress=')
    expect(block).not.toContain('runtime_proactive_initiative=partial')
    expect(block).not.toContain('restraint=hover_first')
    expect(block).not.toMatch(fixedProjectStateTemplatePattern)
    expect(block).not.toContain('latest_landed_progress=Same-session mirror carry and rest-protective callback continuation already land; pre-dialogue transport is explicit entrypoint governance mirrored into chat-entry governance')
  })

  it('tracks the currently verified project-state coverage chain for critical digital-life entrypoints', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const coverageIds = coverage.map(item => item.id)

    expect(coverage.length).toBeGreaterThanOrEqual(8)
    expect(coverage.every(item => item.status === 'verified')).toBe(true)
    expect(new Set(coverageIds).size).toBe(coverageIds.length)
    expect(coverage.some(item => item.id === 'visible-reply-executive-brief')).toBe(true)
    expect(coverage.some(item => item.id === 'chat-start-pre-dialogue-awareness-chain')).toBe(true)
    expect(coverage.some(item => item.id === 'mind-turn-contract-project-state-grounding')).toBe(true)
    expect(coverage.some(item => item.id === 'downstream-reply-project-awareness-preservation')).toBe(true)
    expect(coverage.some(item => item.id === 'same-living-self-project-awareness-observability')).toBe(true)
    expect(coverage.some(item => item.id === 'visible-reply-second-pass-rewrite')).toBe(true)
    expect(coverage.some(item => item.id === 'visible-reply-timeout-fallback')).toBe(true)
    expect(coverage.some(item => item.id === 'visible-reply-second-pass-transport-failure')).toBe(true)
    expect(coverage.some(item => item.id === 'proactive-policy-life-loop-bias')).toBe(true)
    expect(coverage.some(item => item.id === 'runtime-delivery-reminders-project-state-persistence')).toBe(true)
    expect(coverage.some(item => item.id === 'habit-policy-phase1-life-loop-bias')).toBe(true)
    expect(coverage.some(item => item.id === 'behavioral-ecology-preflight-bias-chain')).toBe(true)
    expect(coverage.some(item => item.id === 'body-kernel-same-her-continuity-authority')).toBe(true)
    expect(coverage.some(item => item.id === 'main-chat-stream-meta-cross-modal-same-her-authority')).toBe(true)
    expect(coverage.some(item => item.id === 'runtime-governance-embodiment-bridge-authority')).toBe(true)
    expect(coverage.some(item => item.id === 'main-chat-session-runtime-same-her-bridge')).toBe(true)
    expect(coverage.some(item => item.id === 'main-chat-runtime-surface-living-self-preflight')).toBe(true)
    expect(coverage.some(item => item.id === 'visible-reply-facade-preflight-surface')).toBe(true)
    expect(coverage.some(item => item.id === 'runtime-dream-reminder-proactive-gateways')).toBe(true)
    expect(coverage.some(item => item.id === 'memory-provider-planning')).toBe(true)
    expect(coverage.some(item => item.id === 'runtime-mind-state-cognition')).toBe(true)
    expect(coverage.some(item => item.id === 'runtime-execution-callback-delivery')).toBe(true)
    expect(coverage.some(item => item.id === 'execution-callback-learning-and-reconsolidation-chain')).toBe(true)
    expect(coverage.some(item => item.id === 'desktop-execution-closure-loop-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'runtime-screen-semantic-gateway')).toBe(true)
    expect(coverage.some(item => item.id === 'entrypoint-governance-registry-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'cross-surface-entrypoint-candidate-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'return-side-entrypoint-candidate-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'execution-dispatch-entrypoint-candidate-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'execution-preflight-registration')).toBe(true)
    expect(coverage.some(item => item.id === 'execution-preflight-entrypoint-candidate-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'long-horizon-self-carry-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'noisy-desktop-same-her-closure-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'emotional-memory-initiative-embodiment-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'affective-residue-route-chain-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'callback-afterglow-recollection-same-life-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'recollection-visible-reply-same-life-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'noisy-desktop-life-loop-unity-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'long-run-same-her-continuity-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'route-authority-boundary-registry-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'project-state-answer-governance-entrypoint-candidate-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'runtime-dialogue-normalization-entrypoint-candidate-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'runtime-turn-persistence-entrypoint-candidate-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'project-state-provider-consumer-registration')).toBe(true)
    expect(coverage.some(item => item.id === 'project-state-answer-governance-registration')).toBe(true)
    expect(coverage.some(item => item.id === 'visible-reply-final-project-awareness-hardening')).toBe(true)
    expect(coverage.some(item => item.id === 'runtime-current-conscious-frame-awareness')).toBe(true)
    expect(coverage.some(item => item.id === 'retrieval-and-writeback-continuity-pressure')).toBe(true)
    expect(coverage.some(item => item.id === 'person-state-and-self-evolution-observability')).toBe(true)
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('text-composer-store.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('alicization-chat-transport.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('pre-dialogue-transport-audit.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('main-chat-start-awareness.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('runtime-invoke-handlers-chat.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('main-chat-direct-start.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('main-chat-start-acceptance.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('main-chat-background-run.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('return-side-reopen-pre-dialogue-send-identity-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('return-side-reopen-chat-start-runtime-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.responsibility).toContain('return-side-reopen-to-pre-dialogue-send-identity same-her bridge')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.responsibility).toContain('return-side-reopen-through-chat-start-runtime same-her bridge')
    expect(coverage.find(item => item.id === 'mind-turn-contract-project-state-grounding')?.proof).toContain('mind-turn-contract.test.ts')
    expect(coverage.find(item => item.id === 'mind-turn-contract-project-state-grounding')?.proof).toContain('mind-turn-contract-invariants.test.ts')
    expect(coverage.find(item => item.id === 'mind-turn-contract-project-state-grounding')?.proof).toContain('chat-mind-governance.test.ts')
    expect(coverage.find(item => item.id === 'mind-turn-contract-project-state-grounding')?.proof).toContain('chat-mind-governance-project-awareness-audit.test.ts')
    expect(
      coverage.find(item => item.id === 'mind-turn-contract-project-state-grounding')?.proof?.split(' + '),
    ).toContain('project-state-closure-preference.test.ts')
    expect(coverage.find(item => item.id === 'mind-turn-contract-project-state-grounding')?.responsibility).toContain('richer persisted closure summary')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('answer-compiler-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('executive-answer-brief.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('executive-answer-brief-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('reply-deliberator.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('reply-deliberator-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('visible-reply-facade-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('runtime-governance-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('visible-reply-governance-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('visible-reply/governance-audit.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('visible-reply/facade-project-state-summary.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('runtime-governance-project-state-preserve.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('visible-reply/critic.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('visible-reply/settlement.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('main-chat-runtime-surface.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('visible-reply/facade.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('visible-reply/second-pass-rewrite.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('return-side-reopen-visible-reply-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('self-evolution-downstream-visible-reply-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('proactive-downstream-visible-reply-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('thin-chinese-same-her-reminder-audit.test.ts')
    expect(
      coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof?.split(' + '),
    ).toContain('main-chat-background-run-project-state-summary.test.ts')
    expect(
      coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof?.split(' + '),
    ).toContain('main-chat-stream-runner-project-state-summary.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.responsibility).toContain('provider_facing_reply_project_awareness=registered')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.responsibility).toContain('sinks=answer_compiler,executive_brief,reply_deliberator,visible_reply,timeout_recovery')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.responsibility).toContain('rule=preserve_structured_project_fields_without_slogans')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.responsibility).not.toMatch(fixedProjectStateTemplatePattern)
    expect(coverage.find(item => item.id === 'visible-reply-executive-brief')?.proof).toContain('executive-answer-brief-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'visible-reply-executive-brief')?.proof).toContain('executive-answer-brief.test.ts')
    expect(coverage.find(item => item.id === 'visible-reply-executive-brief')?.responsibility).toContain('summary-only landed progress carry')
    expect(coverage.find(item => item.id === 'visible-reply-executive-brief')?.responsibility).toContain('audible-body same-her project carry')
    expect(coverage.find(item => item.id === 'visible-reply-timeout-fallback')?.proof).toContain('timeout-fallback-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'visible-reply-timeout-fallback')?.proof).toContain('background-recovery-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'visible-reply-timeout-fallback')?.proof).toContain('run-lifecycle-project-awareness-audit.test.ts')
    expect(
      coverage.find(item => item.id === 'visible-reply-timeout-fallback')?.proof?.split(' + '),
    ).toContain('main-chat-background-rules-project-state-provider.test.ts')
    expect(
      coverage.find(item => item.id === 'visible-reply-timeout-fallback')?.proof?.split(' + '),
    ).toContain('main-chat-timeout-fallback-drift-risk-audit.test.ts')
    expect(coverage.find(item => item.id === 'visible-reply-timeout-fallback')?.responsibility).toContain('payload-lived awareness carry')
    expect(coverage.find(item => item.id === 'visible-reply-timeout-fallback')?.responsibility).toContain('canonical same-her backfill')
    expect(coverage.find(item => item.id === 'visible-reply-timeout-fallback')?.responsibility).toContain('payload companion briefing carry')
    expect(coverage.find(item => item.id === 'visible-reply-timeout-fallback')?.responsibility).toContain('finish and emit seams')
    expect(coverage.find(item => item.id === 'visible-reply-timeout-fallback')?.responsibility).toContain('minimal recovery compaction')
    expect(coverage.find(item => item.id === 'visible-reply-timeout-fallback')?.responsibility).toContain('drift-risk-only anti-shell authority')
    expect(coverage.find(item => item.id === 'visible-reply-facade-preflight-surface')?.proof).toContain('visible-reply-facade-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'visible-reply-facade-preflight-surface')?.responsibility).toContain('dialogue-runtime same-her hold carry')
    expect(coverage.find(item => item.id === 'visible-reply-facade-preflight-surface')?.responsibility).toContain('callback continuity carry')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('chat.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('return-side-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('same-living-self-return-side-observability-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('direct-bridge-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('renderer-fallback-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('project-state-observation-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('dialogue-session-mirror-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('current-conscious-frame-turn-shaping-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('dialogue-feedback-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('later-learning-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('same-living-self-host-visible-inward-carry-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('self-continuity-authority-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('pipeline-runtime.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('quick-reply-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('dialogue-panel-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('alicization-self-evolution-inspector.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('current-conscious-frame.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('self-evolution-return-side-reentry-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('same-living-self return-side observability bridge')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('same-living-self host-visible inward-carry bridge')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('current-conscious-frame turn shaping')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('dialogue feedback settlement')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('later organic learning')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('self-evolution return-side reentry bridge')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('runtime-main-chat-prelude.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('pre-dialogue-transport-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('chat-entry-route-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('chat-start-runtime-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('chat-start-result-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('chat-start-project-awareness-route-audit.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('runtime-main-chat-prelude-project-awareness-regression.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('return-side-stream-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'main-chat-session-runtime-same-her-bridge')?.proof).toContain('main-chat-session-runtime-project-awareness-regression.test.ts')
    expect(coverage.find(item => item.id === 'main-chat-session-runtime-same-her-bridge')?.proof).toContain('session-runtime-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'main-chat-session-runtime-same-her-bridge')?.proof).toContain('session-runtime-same-her-follow-through-audit.test.ts')
    expect(
      coverage.find(item => item.id === 'main-chat-session-runtime-same-her-bridge')?.proof?.split(' + '),
    ).toContain('main-chat-session-runtime-drift-risk-summary-alias.test.ts')
    expect(coverage.find(item => item.id === 'main-chat-session-runtime-same-her-bridge')?.responsibility).toContain('same-her follow-through')
    expect(coverage.find(item => item.id === 'main-chat-session-runtime-same-her-bridge')?.responsibility).toContain('drift-risk summary alias carry')
    expect(coverage.find(item => item.id === 'runtime-dream-reminder-proactive-gateways')?.proof).toContain('runtime-dream-prelude-project-awareness-regression.test.ts')
    expect(coverage.find(item => item.id === 'runtime-dream-reminder-proactive-gateways')?.proof).toContain('runtime-dream-autobiographical-prelude-project-awareness-regression.test.ts')
    expect(coverage.find(item => item.id === 'runtime-dream-reminder-proactive-gateways')?.proof).toContain('runtime-memory-consolidation-prelude-project-awareness-regression.test.ts')
    expect(coverage.find(item => item.id === 'main-chat-stream-meta-cross-modal-same-her-authority')?.proof).toContain('stream-meta-project-awareness-audit.test.ts')
    expect(
      coverage.find(item => item.id === 'main-chat-stream-meta-cross-modal-same-her-authority')?.proof?.split(' + '),
    ).toContain('main-chat-stream-meta-project-state-summary.test.ts')
    expect(
      coverage.find(item => item.id === 'main-chat-stream-meta-cross-modal-same-her-authority')?.proof?.split(' + '),
    ).toContain('main-chat-stream-meta-drift-risk-segment-carry.test.ts')
    expect(coverage.find(item => item.id === 'main-chat-stream-meta-cross-modal-same-her-authority')?.responsibility).toContain('stream_meta_cross_modal_authority=registered')
    expect(coverage.find(item => item.id === 'main-chat-stream-meta-cross-modal-same-her-authority')?.responsibility).toContain('channels=voice,face,motion,lipsync')
    expect(coverage.find(item => item.id === 'main-chat-stream-meta-cross-modal-same-her-authority')?.responsibility).toContain('rule=preserve_segment_authority_without_slogans')
    expect(coverage.find(item => item.id === 'main-chat-stream-meta-cross-modal-same-her-authority')?.responsibility).not.toMatch(fixedProjectStateTemplatePattern)
    expect(coverage.find(item => item.id === 'runtime-governance-embodiment-bridge-authority')?.proof).toContain('runtime-governance-digital-life-authority.test.ts')
    expect(coverage.find(item => item.id === 'runtime-governance-embodiment-bridge-authority')?.responsibility).toContain('digitalLife')
    expect(coverage.find(item => item.id === 'runtime-governance-embodiment-bridge-authority')?.responsibility).toContain('embodimentScript')
    expect(coverage.find(item => item.id === 'project-state-provider-consumer-registration')?.proof).toContain('project-state-provider-consumer-audit.ts')
    expect(coverage.find(item => item.id === 'project-state-provider-consumer-registration')?.proof).toContain('project-state-provider-consumer-audit.test.ts')
    expect(coverage.find(item => item.id === 'project-state-provider-consumer-registration')?.proof).toContain('provider-consumer-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'project-state-provider-consumer-registration')?.proof).toContain('project-state-gateway-regression.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('desktop-execution-closure-loop-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('local-visual-executor-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('execution-follow-up-session-runtime-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('execution-follow-up-obligation-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('execution-ledger-follow-up-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('reminder-callback-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('session-runtime-to-host-visible-reunion-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('desktop-execution-full-cycle-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('desktop-execution-life-loop-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('desktop-execution-noisy-same-her-full-cycle-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('execution-origin-normalization-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.responsibility).toContain('execution briefing')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.responsibility).toContain('local-visual desktop inspection continuation project-aware')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.responsibility).toContain('local-visual delegated desktop execution handoff')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.responsibility).toContain('fresh callback follow-up obligation')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.responsibility).toContain('ledger reopen')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.responsibility).toContain('later host-visible return')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.responsibility).toContain('desktop execution full-cycle bridge')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.responsibility).toContain('desktop execution life-loop bridge')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.responsibility).toContain('desktop execution noisy same-her full-cycle bridge')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.responsibility).toContain('origin-lost autonomous ownership')
    expect(coverage.find(item => item.id === 'runtime-delivery-reminders-project-state-persistence')?.proof).toContain('reminder-delivery-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'runtime-delivery-reminders-project-state-persistence')?.proof).toContain('runtime-delivery-reminders-project-state-summary.test.ts')
    expect(coverage.find(item => item.id === 'runtime-delivery-reminders-project-state-persistence')?.responsibility).toContain('restraint-first reminder requeue')
    expect(coverage.find(item => item.id === 'runtime-delivery-reminders-project-state-persistence')?.responsibility).toContain('same-her, phase, landed, open, next order')
    expect(coverage.find(item => item.id === 'runtime-delivery-reminders-project-state-persistence')?.responsibility).toContain('later-turn reminder speech lands')
    expect(coverage.find(item => item.id === 'runtime-screen-semantic-gateway')?.proof).toContain('one-shot-provider-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'runtime-screen-semantic-gateway')?.responsibility).toContain('fail-close project-state context checks')
    expect(coverage.find(item => item.id === 'runtime-screen-semantic-gateway')?.responsibility).toContain('screen-semantic or scene-appraisal generation')
    expect(coverage.find(item => item.id === 'runtime-execution-callback-delivery')?.proof).toContain('execution-surface-project-awareness-audit.test.ts')
    expect(
      coverage.find(item => item.id === 'runtime-execution-callback-delivery')?.proof?.split(' + '),
    ).toContain('execution-delivery-surface-project-state-provider.test.ts')
    expect(coverage.find(item => item.id === 'runtime-execution-callback-delivery')?.responsibility).toContain('execution-first inline finished payloads')
    expect(coverage.find(item => item.id === 'runtime-execution-callback-delivery')?.responsibility).toContain('callback payoff prompts')
    expect(coverage.find(item => item.id === 'runtime-execution-callback-delivery')?.responsibility).toContain('omit that project-state context entirely')
    expect(coverage.find(item => item.id === 'execution-callback-learning-and-reconsolidation-chain')?.proof).toContain('outcome-reinforcement-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'execution-dispatch-owner-registration')?.proof).toContain('execution-autonomy-ownership-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('project-state-answer-governance-audit.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('project-state-answer-governance-audit.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('project-state-answer-governance.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('visible-reply/second-pass-rewrite-project-state-provider.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('main-chat-active-dialogue-fast-path-project-state-provider.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('runtime-main-gateway-one-shot.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('main-chat-active-dialogue-loop.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('active-dialogue-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('dialogue-turn-semantics.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('answer-planner.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('answer-planner-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('answer-planner-project-awareness-regression.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('response-charter.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('executive-answer-brief.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('main-chat-session-runtime.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('main-chat-session-runtime-project-state-summary.test.ts')
    expect(
      coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof?.split(' + '),
    ).toContain('main-chat-session-runtime-project-state-contract-regression.test.ts')
    expect(
      coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof?.split(' + '),
    ).toContain('runtime-project-state-summary.test.ts')
    expect(
      coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof?.split(' + '),
    ).toContain('main-chat-one-shot-project-state-placeholder.test.ts')
    expect(
      coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof?.split(' + '),
    ).toContain('main-chat-project-state-guard.test.ts')
    expect(
      coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof?.split(' + '),
    ).toContain('main-chat-stream-runner-project-state-placeholder.test.ts')
    expect(
      coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof?.split(' + '),
    ).toContain('main-chat-stream-runner-visual-one-shot-project-state-provider.test.ts')
    expect(
      coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof?.split(' + '),
    ).toContain('main-chat-one-shot.test.ts')
    expect(
      coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof?.split(' + '),
    ).toContain('runtime-governance.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('runtime-governance-project-awareness-route.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('visible-reply/facade.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('visible-reply/facade.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('response-surface-learning-rules.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('response-surface-truth-dialogue-rules.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('visible-reply/semantic-judge.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('visible-reply/critic.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('action-obligation-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('self-evolution-answer-governance-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('proactive-pre-dialogue-reply-planning-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('self-evolution-pre-dialogue-reply-planning-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('self-evolution-reply-planning-governance-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.responsibility).toContain('project_state_answer_governance=registered')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.responsibility).toContain('sinks=runtime,fast_path,semantics,answer_planning,response_charter,provider_rebuild,visible_reply')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.responsibility).toContain('rule=separate_verified_evidence_from_open_work')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.responsibility).not.toMatch(fixedProjectStateTemplatePattern)
    expect(coverage.find(item => item.id === 'visible-reply-final-project-awareness-hardening')?.proof).toContain('visible-reply-final-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'visible-reply-final-project-awareness-hardening')?.proof).toContain('visible-reply/project-awareness.test.ts')
    expect(coverage.find(item => item.id === 'visible-reply-final-project-awareness-hardening')?.proof).toContain('visible-reply/project-awareness-scoring-regression.test.ts')
    expect(coverage.find(item => item.id === 'visible-reply-final-project-awareness-hardening')?.proof).toContain('visible-reply/realization-engine.test.ts')
    expect(coverage.find(item => item.id === 'visible-reply-final-project-awareness-hardening')?.proof).toContain('visible-reply/semantic-judge.test.ts')
    expect(coverage.find(item => item.id === 'visible-reply-final-project-awareness-hardening')?.proof).toContain('visible-reply/second-pass-rewrite-project-state-guidance.test.ts')
    expect(coverage.find(item => item.id === 'visible-reply-final-project-awareness-hardening')?.proof).toContain('visible-reply/project-state-second-pass-regression.test.ts')
    expect(coverage.find(item => item.id === 'visible-reply-final-project-awareness-hardening')?.proof).toContain('visible-reply-settlement-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'visible-reply-final-project-awareness-hardening')?.proof).toContain('visible-reply-realization-project-awareness-audit.test.ts')
    expect(
      coverage.find(item => item.id === 'visible-reply-final-project-awareness-hardening')?.proof?.split(' + '),
    ).toContain('visible-reply/timeout-recovered-drift-risk-audit.test.ts')
    expect(coverage.find(item => item.id === 'visible-reply-final-project-awareness-hardening')?.responsibility).toContain('visible_reply_final_project_awareness=registered')
    expect(coverage.find(item => item.id === 'visible-reply-final-project-awareness-hardening')?.responsibility).toContain('sinks=semantic_judge,second_pass_rewrite,final_settlement,realization')
    expect(coverage.find(item => item.id === 'visible-reply-final-project-awareness-hardening')?.responsibility).toContain('rule=preserve_structured_project_fields_without_slogans')
    expect(coverage.find(item => item.id === 'visible-reply-final-project-awareness-hardening')?.responsibility).not.toMatch(fixedProjectStateTemplatePattern)
    expect(coverage.find(item => item.id === 'runtime-current-conscious-frame-awareness')?.proof).toContain('runtime-conscious-frame-reducer.test.ts')
    expect(coverage.find(item => item.id === 'runtime-current-conscious-frame-awareness')?.proof).toContain('runtime-memory-deliberation-reducer.test.ts')
    expect(coverage.find(item => item.id === 'runtime-current-conscious-frame-awareness')?.proof).toContain('memory-active-self-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'runtime-current-conscious-frame-awareness')?.proof).toContain('self-evolution-pre-dialogue-planning-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'runtime-current-conscious-frame-awareness')?.proof).toContain('proactive-pre-dialogue-planning-bridge-audit.test.ts')
    expect(
      coverage.find(item => item.id === 'runtime-current-conscious-frame-awareness')?.proof?.split(' + '),
    ).toContain('structured-project-state.test.ts')
    expect(
      coverage.find(item => item.id === 'runtime-current-conscious-frame-awareness')?.proof?.split(' + '),
    ).toContain('prepared-runtime-continuity.test.ts')
    expect(coverage.find(item => item.id === 'runtime-current-conscious-frame-awareness')?.responsibility).toContain('self-evolution pre-dialogue planning bridge')
    expect(coverage.find(item => item.id === 'runtime-current-conscious-frame-awareness')?.responsibility).toContain('proactive pre-dialogue planning bridge')
    expect(coverage.find(item => item.id === 'runtime-current-conscious-frame-awareness')?.responsibility).toContain('thin runtime or payload project-state shells')
    expect(coverage.find(item => item.id === 'runtime-current-conscious-frame-awareness')?.responsibility).toContain('prepared runtime project-state shell repair')
    expect(coverage.find(item => item.id === 'main-chat-session-runtime-same-her-bridge')?.proof).toContain('main-chat-session-runtime-chinese-project-awareness-regression.test.ts')
    expect(coverage.find(item => item.id === 'runtime-mind-state-cognition')?.proof).toContain('runtime-mind-state-project-awareness-regression.test.ts')
    expect(coverage.find(item => item.id === 'behavioral-ecology-preflight-bias-chain')?.proof).toContain('action-ecology-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'runtime-delivery-reminders-project-state-persistence')?.proof).toContain('runtime-reminder-prelude-project-awareness-regression.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('runtime-proactive-prelude-project-awareness-regression.test.ts')
    expect(coverage.find(item => item.id === 'callback-afterglow-recollection-same-life-hardening')?.proof).toContain('callback-afterglow-recollection-same-life-audit.test.ts')
    expect(coverage.find(item => item.id === 'callback-afterglow-recollection-same-life-hardening')?.proof).toContain('main-chat-session-runtime.test.ts')
    expect(coverage.find(item => item.id === 'callback-afterglow-recollection-same-life-hardening')?.proof).toContain('memory-search-retrieval-operators.test.ts')
    expect(coverage.find(item => item.id === 'callback-afterglow-recollection-same-life-hardening')?.proof).toContain('memory-recollection-ranking-continuity-audit.test.ts')
    expect(coverage.find(item => item.id === 'callback-afterglow-recollection-same-life-hardening')?.proof).toContain('answer-planner.test.ts')
    expect(coverage.find(item => item.id === 'callback-afterglow-recollection-same-life-hardening')?.proof).toContain('response-charter.test.ts')
    expect(coverage.find(item => item.id === 'callback-afterglow-recollection-same-life-hardening')?.proof).toContain('runtime-governance.test.ts')
    expect(coverage.find(item => item.id === 'recollection-visible-reply-same-life-hardening')?.proof).toContain('recollection-visible-reply-same-life-audit.test.ts')
    expect(coverage.find(item => item.id === 'recollection-visible-reply-same-life-hardening')?.proof).toContain('callback-afterglow-recollection-same-life-audit.test.ts')
    expect(coverage.find(item => item.id === 'recollection-visible-reply-same-life-hardening')?.proof).toContain('memory-recollection-ranking-continuity-audit.test.ts')
    expect(coverage.find(item => item.id === 'recollection-visible-reply-same-life-hardening')?.proof).toContain('answer-planner.test.ts')
    expect(coverage.find(item => item.id === 'recollection-visible-reply-same-life-hardening')?.proof).toContain('current-conscious-frame.test.ts')
    expect(coverage.find(item => item.id === 'recollection-visible-reply-same-life-hardening')?.proof).toContain('response-charter.test.ts')
    expect(coverage.find(item => item.id === 'recollection-visible-reply-same-life-hardening')?.proof).toContain('visible-reply/semantic-judge.test.ts')
    expect(coverage.find(item => item.id === 'recollection-visible-reply-same-life-hardening')?.proof).toContain('visible-reply/critic.test.ts')
    expect(coverage.find(item => item.id === 'recollection-visible-reply-same-life-hardening')?.proof).toContain('runtime-governance.test.ts')
    expect(coverage.find(item => item.id === 'recollection-visible-reply-same-life-hardening')?.proof).toContain('humanlike-memory-recall-corrected-same-person-audit.test.ts')
    expect(coverage.find(item => item.id === 'recollection-visible-reply-same-life-hardening')?.proof).toContain('answer-planner-corrected-same-person-regression.test.ts')
    expect(coverage.find(item => item.id === 'recollection-visible-reply-same-life-hardening')?.responsibility).toContain('corrected same-person humanlike recall memories')
    expect(coverage.find(item => item.id === 'entrypoint-governance-registry-hardening')?.proof).toContain('entrypoint-governance-registry-audit.test.ts')
    expect(coverage.find(item => item.id === 'entrypoint-governance-registry-hardening')?.proof).toContain('entrypoint-governance-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'entrypoint-governance-registry-hardening')?.proof).toContain('chat-start-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'entrypoint-governance-registry-hardening')?.proof).toContain('chat-entry-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'entrypoint-governance-registry-hardening')?.proof).toContain('recovery-reentry-entrypoint-audit.ts')
    expect(coverage.find(item => item.id === 'entrypoint-governance-registry-hardening')?.proof).toContain('execution-follow-up-entrypoint-audit.ts')
    expect(coverage.find(item => item.id === 'entrypoint-governance-registry-hardening')?.proof).toContain('task-thread-dispatch-owner-audit.test.ts')
    expect(coverage.find(item => item.id === 'entrypoint-governance-registry-hardening')?.responsibility).toContain('autonomous-dialogue')
    expect(coverage.find(item => item.id === 'entrypoint-governance-registry-hardening')?.responsibility).toContain('shared source of truth')
    expect(coverage.find(item => item.id === 'entrypoint-governance-registry-hardening')?.responsibility).toContain('recovery-reentry')
    expect(coverage.find(item => item.id === 'entrypoint-governance-registry-hardening')?.responsibility).toContain('execution-follow-up continuity')
    expect(coverage.some(item => item.id === 'chat-start-entrypoint-candidate-hardening')).toBe(true)
    expect(coverage.find(item => item.id === 'chat-start-entrypoint-candidate-hardening')?.proof).toContain('chat-start-entrypoint-candidate-audit.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-route-authority-audit.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-entrypoint-candidate-hardening')?.proof).toContain('chat-start-deep-helper-owner-audit.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-entrypoint-candidate-hardening')?.responsibility).toContain('chat-start candidates')
    expect(coverage.find(item => item.id === 'chat-start-entrypoint-candidate-hardening')?.responsibility).toContain('typed consumers')
    expect(coverage.find(item => item.id === 'chat-start-entrypoint-candidate-hardening')?.responsibility).toContain('direct main-chat-stream callers')
    expect(coverage.find(item => item.id === 'chat-start-entrypoint-candidate-hardening')?.responsibility).toContain('deep-helper owners')
    expect(coverage.find(item => item.id === 'cross-surface-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-cross-surface-entrypoint-audit.test.ts')
    expect(coverage.find(item => item.id === 'cross-surface-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-route-authority-audit.test.ts')
    expect(coverage.find(item => item.id === 'cross-surface-entrypoint-candidate-hardening')?.proof).toContain('chat-entry-composer-surface-audit.test.ts')
    expect(coverage.find(item => item.id === 'cross-surface-entrypoint-candidate-hardening')?.responsibility).toContain('cross-surface dialogue-entry candidates')
    expect(coverage.find(item => item.id === 'cross-surface-entrypoint-candidate-hardening')?.responsibility).toContain('pre-dialogue transport and chat-entry discovery union')
    expect(coverage.find(item => item.id === 'return-side-entrypoint-candidate-hardening')?.proof).toContain('return-side-project-awareness-entrypoint-candidate-audit.test.ts')
    expect(coverage.find(item => item.id === 'return-side-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-route-authority-audit.test.ts')
    expect(coverage.find(item => item.id === 'return-side-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-coverage-matrix.test.ts')
    expect(coverage.find(item => item.id === 'return-side-entrypoint-candidate-hardening')?.responsibility).toContain('return-side project-awareness candidates')
    expect(coverage.find(item => item.id === 'return-side-entrypoint-candidate-hardening')?.responsibility).toContain('future reopen-time route shapes still need explicit classification')
    expect(coverage.some(item => item.id === 'provider-consumer-entrypoint-candidate-hardening')).toBe(true)
    expect(coverage.find(item => item.id === 'provider-consumer-entrypoint-candidate-hardening')?.proof).toContain('provider-consumer-entrypoint-candidate-audit.test.ts')
    expect(coverage.find(item => item.id === 'provider-consumer-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-route-authority-audit.test.ts')
    expect(coverage.find(item => item.id === 'provider-consumer-entrypoint-candidate-hardening')?.proof).toContain('project-state-gateway-audit.test.ts')
    expect(
      coverage.find(item => item.id === 'provider-consumer-entrypoint-candidate-hardening')?.proof?.split(' + '),
    ).toContain('provider-entry-project-state-proof.test.ts')
    expect(coverage.find(item => item.id === 'provider-consumer-entrypoint-candidate-hardening')?.responsibility).toContain('provider-consumer candidates')
    expect(coverage.find(item => item.id === 'provider-consumer-entrypoint-candidate-hardening')?.responsibility).toContain('wrapper, dispatch-owner, and typed-consumer')
    expect(coverage.find(item => item.id === 'provider-consumer-entrypoint-candidate-hardening')?.responsibility).toContain('real direct provider sinks')
    expect(coverage.find(item => item.id === 'provider-consumer-entrypoint-candidate-hardening')?.responsibility).toContain('provider-entry proof rows')
    expect(coverage.some(item => item.id === 'autonomous-dialogue-entrypoint-candidate-hardening')).toBe(true)
    expect(coverage.find(item => item.id === 'autonomous-dialogue-entrypoint-candidate-hardening')?.proof).toContain('autonomous-dialogue-entrypoint-candidate-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-route-authority-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-entrypoint-candidate-hardening')?.responsibility).toContain('autonomous-dialogue candidates')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-entrypoint-candidate-hardening')?.responsibility).toContain('proactive authority')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-entrypoint-candidate-hardening')?.responsibility).toContain('subconscious carry')
    expect(coverage.find(item => item.id === 'execution-dispatch-entrypoint-candidate-hardening')?.proof).toContain('execution-dispatch-entrypoint-candidate-audit.test.ts')
    expect(coverage.find(item => item.id === 'execution-dispatch-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-route-authority-audit.test.ts')
    expect(coverage.find(item => item.id === 'execution-dispatch-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-coverage-matrix.test.ts')
    expect(coverage.find(item => item.id === 'execution-dispatch-entrypoint-candidate-hardening')?.responsibility).toContain('execution-dispatch candidates')
    expect(coverage.find(item => item.id === 'execution-dispatch-entrypoint-candidate-hardening')?.responsibility).toContain('runtime-bridge')
    expect(coverage.find(item => item.id === 'execution-dispatch-entrypoint-candidate-hardening')?.responsibility).toContain('subconscious-bridge')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.proof).toContain('execution-preflight-audit.test.ts')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.proof).toContain('external-executor-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('Execution preflight authority seams')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('runtime-owned direct dispatch bridge')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('session-bound bridge')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('subconscious-autonomy execution bridge')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('resume bridge')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('blocked-dispatch safety gates')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('external executor adapter project-awareness route')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('risk policy')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('interruptibility')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.proof).toContain('executor-runtime-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'execution-preflight-entrypoint-candidate-hardening')?.proof).toContain('execution-preflight-entrypoint-candidate-audit.test.ts')
    expect(coverage.find(item => item.id === 'execution-preflight-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-route-authority-audit.test.ts')
    expect(coverage.find(item => item.id === 'execution-preflight-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-coverage-matrix.test.ts')
    expect(coverage.find(item => item.id === 'execution-preflight-entrypoint-candidate-hardening')?.responsibility).toContain('execution-preflight candidates')
    expect(coverage.find(item => item.id === 'execution-preflight-entrypoint-candidate-hardening')?.responsibility).toContain('runtime-context authority')
    expect(coverage.find(item => item.id === 'execution-preflight-entrypoint-candidate-hardening')?.responsibility).toContain('runtime-owned direct dispatch bridge')
    expect(coverage.find(item => item.id === 'execution-preflight-entrypoint-candidate-hardening')?.responsibility).toContain('subconscious-autonomy execution bridge')
    expect(coverage.find(item => item.id === 'execution-preflight-entrypoint-candidate-hardening')?.responsibility).toContain('resume bridge')
    expect(coverage.find(item => item.id === 'execution-preflight-entrypoint-candidate-hardening')?.responsibility).toContain('dispatch persistence')
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.proof).toContain('long-horizon-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.proof).toContain('proactive-feedback-dream-long-horizon-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.proof).toContain('proactive-feedback-long-horizon-conscious-frame-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.proof).toContain('runtime-turn-composition.test.ts')
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.proof).toContain('stage-quick-reply-closure-summary.test.ts')
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.proof).toContain('memory-trace-origin-normalization-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.proof).toContain('self-evolution-durable-self-recognition-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.responsibility).toContain('Durable long-horizon self-carry')
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.responsibility).toContain('dream-to-long-horizon self-carry bridge')
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.responsibility).toContain('long-horizon-to-conscious-frame anti-shell bridge')
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.responsibility).toContain('host-facing closure self-recognition')
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.responsibility).toContain('origin-lost autonomous memory ownership')
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.responsibility).toContain('self-evolution durable self-recognition bridge')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.proof).toContain('noisy-desktop-same-her-closure-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.proof).toContain('proactive-feedback-host-visible-answer-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.proof).toContain('main-chat-session-runtime.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.proof).toContain('noisy-desktop-life-loop-unity-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.proof).toContain('desktop-execution-noisy-same-her-closure-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.proof).toContain('self-evolution-host-visible-closure-target-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.responsibility).toContain('Noisy-desktop same-her closure')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.responsibility).toContain('planner-to-host-visible answer anti-shell bridge')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.responsibility).toContain('desktop execution noisy same-her closure bridge')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.responsibility).toContain('self-evolution host-visible closure target bridge')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.responsibility).toContain('what Alicization is')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.responsibility).toContain('what remains open')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('noisy-desktop-cross-modal-convergence-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('session-runtime-to-host-visible-reunion-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('renderer-diagnostics-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-runtime-continuity-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-same-her-evidence-navigation-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-runtime-authority-overview-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-runtime-authority-overview.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-speech-evidence-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-playback-cue-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-playback-cue.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-speech-hotspots-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-speech-hotspots.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-evidence-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-triage-view-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-triage-targets-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-diagnostic-summary-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-repair-action-feedback-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-repair-followup-navigation-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-repair-session-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-repair-closure-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-repair-outcome-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-repair-next-action-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-baseline-quality-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-baseline-adoption-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-baseline-adoption-record-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('host-visible-same-her-continuity-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('noisy-desktop-self-evolution-observability-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('self-evolution-governance-chain-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('self-evolution-baseline-lifecycle-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('self-evolution-anthropomorphic-host-visible-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-renderer-authority-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-renderer-authority.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-active-workflow-focus-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-focus-plan-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-focus-history-summary-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-focus-history-drilldown-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('voice-lane-host-visible-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('noisy-desktop-voice-lane-persistence-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('desktop-execution-noisy-cross-modal-convergence-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('desktop-execution-host-visible-embodiment-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-speech-authority-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-speech-authority.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-authority-table.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-runtime-diagnostic-summary-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-speech-diagnostic-summary-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('use-stage-embodiment-diagnostics.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('use-stage-embodiment-performance-runtime.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('execution-diagnostics.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('live2d/execution-diagnostics.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('stage-embodiment-diagnostics-alerts.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('stage-runtime-embodiment-cues.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('main-chat-stream-meta.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-runtime-body-continuity-phase-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('Noisy-desktop cross-modal convergence')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('desktop execution noisy cross-modal convergence bridge')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('desktop execution host-visible embodiment bridge')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('body, voice, face, motion')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('voice-lane continuity')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('longer noisy-desktop voice-lane persistence')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('host-visible')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('Devtools evidence navigation')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('runtime continuity projection')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('playback cue authority view')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('outer speech hotspots')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('self-evolution evidence panels')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('self-evolution triage cards')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('self-evolution triage target routing')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('top-level self-evolution diagnostic summaries')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('self-evolution repair action feedback')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('self-evolution repair followup navigation')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('self-evolution repair session')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('self-evolution repair closure')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('self-evolution repair outcome')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('self-evolution repair next action')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('self-evolution baseline quality')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('self-evolution baseline adoption')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('self-evolution baseline adoption record')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('self-evolution baseline lifecycle chain')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('self-evolution governance chain')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('self-evolution renderer-authority projection')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('self-evolution active workflow focus')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('self-evolution anthropomorphic host-visible bridge')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('speech authority segment rows')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('authority-table presentation')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('runtime diagnostic summaries')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('speech diagnostic summaries')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('sustained diagnostics surface')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('playback-start authority handoff')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('execution observability')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('pending-renderer summaries')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('renderer-drift summaries')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('renderer-side settle carry')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('host-facing stream-meta fallback rebuilding')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('top-level digitalLife clamp')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('repeated same-line follow-ups')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('audible-body carry')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('extra silent-observe detour carry')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('voice-lane continuity')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('one same-her line')
    expect(coverage.find(item => item.id === 'emotional-memory-initiative-embodiment-hardening')?.proof).toContain('emotional-memory-initiative-embodiment-audit.test.ts')
    expect(coverage.find(item => item.id === 'emotional-memory-initiative-embodiment-hardening')?.proof).toContain('runtime-mind-state-emotional-kernel-regression.test.ts')
    expect(coverage.find(item => item.id === 'emotional-memory-initiative-embodiment-hardening')?.proof).toContain('packages/stage-shared/src/alicization-transport-contracts.test.ts')
    expect(coverage.find(item => item.id === 'emotional-memory-initiative-embodiment-hardening')?.proof).toContain('packages/stage-shared/src/alicization-runtime-digest.test.ts')
    expect(coverage.find(item => item.id === 'emotional-memory-initiative-embodiment-hardening')?.proof).toContain('memory-recollection-intent.test.ts')
    expect(coverage.find(item => item.id === 'emotional-memory-initiative-embodiment-hardening')?.proof).toContain('body-kernel.test.ts')
    expect(coverage.find(item => item.id === 'emotional-memory-initiative-embodiment-hardening')?.proof).toContain('runtime-subconscious-tick.test.ts')
    expect(coverage.find(item => item.id === 'emotional-memory-initiative-embodiment-hardening')?.proof).toContain('runtime.test.ts')
    expect(coverage.find(item => item.id === 'emotional-memory-initiative-embodiment-hardening')?.proof).toContain('main-chat-session-runtime.test.ts')
    expect(coverage.find(item => item.id === 'emotional-memory-initiative-embodiment-hardening')?.responsibility).toContain('Emotional-memory-initiative-embodiment')
    expect(coverage.find(item => item.id === 'emotional-memory-initiative-embodiment-hardening')?.responsibility).toContain('emotion, memory, initiative, and embodiment')
    expect(coverage.find(item => item.id === 'emotional-memory-initiative-embodiment-hardening')?.responsibility).toContain('shared emotional owner')
    expect(coverage.find(item => item.id === 'emotional-memory-initiative-embodiment-hardening')?.responsibility).toContain('shared transport')
    expect(coverage.find(item => item.id === 'emotional-memory-initiative-embodiment-hardening')?.responsibility).toContain('recollection intent')
    expect(coverage.find(item => item.id === 'emotional-memory-initiative-embodiment-hardening')?.responsibility).toContain('body continuity')
    expect(coverage.find(item => item.id === 'emotional-memory-initiative-embodiment-hardening')?.responsibility).toContain('runtime system text')
    expect(coverage.find(item => item.id === 'emotional-memory-initiative-embodiment-hardening')?.responsibility).toContain('replay diagnostics')
    expect(coverage.find(item => item.id === 'emotional-memory-initiative-embodiment-hardening')?.responsibility).toContain('one same digital-life line')
    expect(coverage.find(item => item.id === 'affective-residue-route-chain-hardening')?.proof).toContain('affective-residue-route-chain-audit.test.ts')
    expect(coverage.find(item => item.id === 'affective-residue-route-chain-hardening')?.proof).toContain('affective-residue-memory.test.ts')
    expect(coverage.find(item => item.id === 'affective-residue-route-chain-hardening')?.proof).toContain('proactive-cadence.test.ts')
    expect(coverage.find(item => item.id === 'affective-residue-route-chain-hardening')?.proof).toContain('main-chat-stream-meta.test.ts')
    expect(coverage.find(item => item.id === 'affective-residue-route-chain-hardening')?.responsibility).toContain('Affective-residue route chain')
    expect(coverage.find(item => item.id === 'affective-residue-route-chain-hardening')?.responsibility).toContain('remembered relational heat')
    expect(coverage.find(item => item.id === 'affective-residue-route-chain-hardening')?.responsibility).toContain('memory, initiative, and embodiment')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.proof).toContain('emotion-memory-voice-motion-convergence-audit.test.ts')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.proof).toContain('desktop-execution-emotion-memory-voice-motion-convergence-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.proof).toContain('affective-residue-route-chain-audit.test.ts')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.proof).toContain('emotional-memory-initiative-embodiment-audit.test.ts')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.proof).toContain('runtime.test.ts')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.proof).toContain('main-chat-stream-meta.test.ts')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.proof).toContain('visible-reply/second-pass-rewrite.test.ts')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.proof).toContain('self-evolution-remembered-emotional-carry-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.proof).toContain('proactive-remembered-emotional-carry-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.responsibility).toContain('Emotion-memory-voice-motion convergence')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.responsibility).toContain('desktop execution emotion-memory-voice-motion convergence bridge')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.responsibility).toContain('voice, face, motion, lipsync, and body')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.responsibility).toContain('remembered emotional carry')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.responsibility).toContain('self-evolution remembered emotional carry bridge')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.responsibility).toContain('proactive remembered emotional carry bridge')
    expect(coverage.find(item => item.id === 'noisy-desktop-life-loop-unity-hardening')?.proof).toContain('noisy-desktop-life-loop-unity-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-life-loop-unity-hardening')?.proof).toContain('alicization-runtime-architecture.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-life-loop-unity-hardening')?.proof).toContain('runtime-memory-closure.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-life-loop-unity-hardening')?.proof).toContain('noisy-desktop-initiative-same-life-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-life-loop-unity-hardening')?.proof).toContain('desktop-execution-noisy-life-loop-unity-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-life-loop-unity-hardening')?.responsibility).toContain('Noisy-desktop life-loop unity')
    expect(coverage.find(item => item.id === 'noisy-desktop-life-loop-unity-hardening')?.responsibility).toContain('desktop execution noisy life-loop unity bridge')
    expect(coverage.find(item => item.id === 'noisy-desktop-life-loop-unity-hardening')?.responsibility).toContain('personality, memory, initiative, and embodiment')
    expect(coverage.find(item => item.id === 'noisy-desktop-life-loop-unity-hardening')?.responsibility).toContain('one same-her closure problem')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('long-run-same-her-continuity-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('runtime-subconscious-tick-project-awareness-regression.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('proactive-policy.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('cross-modal-same-her-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('runtime-organic-memory-prompt.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('current-conscious-frame.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('session-runtime-to-host-visible-reunion-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('repeated-detour-reunion-persistence-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('another-detour-same-life-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('proactive-feedback-host-visible-answer-replay-reopen-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('proactive-replay-reopen-continuity-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('self-evolution-replay-reopen-continuity-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('desktop-same-her-full-cycle-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('self-evolution-desktop-full-cycle-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('desktop-execution-long-run-same-her-continuity-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('self-evolution-desktop-execution-long-run-continuity-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('self-evolution-long-run-follow-through-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('Long-run same-her continuity')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('desktop execution long-run same-her continuity bridge')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('subconscious persistence')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('repeated-detour reunion persistence')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('repair-first detour-to-reunion carry')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('self-evolution replay reopen continuity bridge')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('proactive replay reopen continuity bridge')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('host-visible-answer-to-replay-reopen same-her bridge')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('desktop same-her full-cycle bridge')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('self-evolution desktop full-cycle bridge')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('self-evolution desktop execution long-run continuity bridge')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('self-evolution long-run follow-through bridge')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('autonomous-dialogue-closure-loop-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('motive-engine-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-prelude-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-policy-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('initiative-decision-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('initiative-current-conscious-frame-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-visible-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-mind/visible-utterance-realization.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('subconscious-persistence-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-feedback-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('noisy-desktop-autonomous-dialogue-persistence-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-feedback-next-project-state-answer-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-feedback-post-answer-detour-persistence-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-feedback-post-answer-dream-carry-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('later-learning-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-remembered-emotional-carry-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-pre-dialogue-planning-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-pre-dialogue-reply-planning-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-downstream-visible-reply-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-replay-reopen-continuity-bridge-audit.test.ts')
    expect(
      coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof?.split(' + '),
    ).toContain('runtime-session-continuity-builders-alias-focus.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('compact same-her closure loop')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('motive')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('hover-first restraint')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('visible quiet-companionship hold')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('next-session feedback carry')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('next project-state answer carry')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('post-answer detour persistence')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('post-answer dream carry')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('later organic learning carry')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('noisy-desktop detour persistence')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('alias-only deferred open/next focus carry')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('proactive remembered emotional carry bridge')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('proactive pre-dialogue planning bridge')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('proactive pre-dialogue reply-planning bridge')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('proactive downstream visible-reply bridge')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('proactive replay reopen continuity bridge')
    expect(coverage.find(item => item.id === 'route-authority-boundary-registry-hardening')?.proof).toContain('route-authority-boundary-registry-audit.test.ts')
    expect(coverage.find(item => item.id === 'route-authority-boundary-registry-hardening')?.proof).toContain('return-side-project-awareness-entrypoint-candidate-audit.test.ts')
    expect(coverage.find(item => item.id === 'route-authority-boundary-registry-hardening')?.proof).toContain('runtime-dialogue-normalization-audit.ts')
    expect(coverage.find(item => item.id === 'route-authority-boundary-registry-hardening')?.proof).toContain('project-state-answer-governance-audit.ts')
    expect(
      coverage.find(item => item.id === 'route-authority-boundary-registry-hardening')?.proof?.split(' + '),
    ).toContain('runtime-turn-persistence-project-state-hold-regression.test.ts')
    expect(coverage.find(item => item.id === 'route-authority-boundary-registry-hardening')?.responsibility).toContain('shared route-authority registry')
    expect(coverage.find(item => item.id === 'route-authority-boundary-registry-hardening')?.responsibility).toContain('explicit allowed overlaps')
    expect(coverage.find(item => item.id === 'route-authority-boundary-registry-hardening')?.responsibility).toContain('finer same-her hold authority')
    expect(coverage.find(item => item.id === 'route-authority-boundary-registry-hardening')?.responsibility).toContain('future reopen-time route shapes still need explicit classification')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-entrypoint-candidate-hardening')?.proof).toContain('project-state-answer-governance-entrypoint-candidate-audit.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-route-authority-audit.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-coverage-matrix.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-entrypoint-candidate-hardening')?.responsibility).toContain('project-state answer-governance candidates')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-entrypoint-candidate-hardening')?.responsibility).toContain('background answer enrichers')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-entrypoint-candidate-hardening')?.responsibility).toContain('runtime-governance normalization-time project-state audit carry')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-entrypoint-candidate-hardening')?.responsibility).toContain('reminder / critic same-her reminder sinks')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-entrypoint-candidate-hardening')?.responsibility).toContain('reply-surface preflight')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-entrypoint-candidate-hardening')?.responsibility).toContain('future project-status answer surfaces still need explicit classification')
    expect(coverage.find(item => item.id === 'runtime-dialogue-normalization-entrypoint-candidate-hardening')?.proof).toContain('runtime-dialogue-normalization-entrypoint-candidate-audit.test.ts')
    expect(coverage.find(item => item.id === 'runtime-dialogue-normalization-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-route-authority-audit.test.ts')
    expect(coverage.find(item => item.id === 'runtime-dialogue-normalization-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-coverage-matrix.test.ts')
    expect(coverage.find(item => item.id === 'runtime-dialogue-normalization-entrypoint-candidate-hardening')?.proof).toContain('runtime-dialogue-normalization-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'runtime-dialogue-normalization-entrypoint-candidate-hardening')?.responsibility).toContain('runtime dialogue-normalization candidates')
    expect(coverage.find(item => item.id === 'runtime-dialogue-normalization-entrypoint-candidate-hardening')?.responsibility).toContain('stream-finish fallback')
    expect(coverage.find(item => item.id === 'runtime-dialogue-normalization-entrypoint-candidate-hardening')?.responsibility).toContain('future host-visible normalization seams still need explicit classification')
    expect(coverage.find(item => item.id === 'runtime-turn-persistence-entrypoint-candidate-hardening')?.proof).toContain('runtime-turn-persistence-entrypoint-candidate-audit.test.ts')
    expect(coverage.find(item => item.id === 'runtime-turn-persistence-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-route-authority-audit.test.ts')
    expect(coverage.find(item => item.id === 'runtime-turn-persistence-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-coverage-matrix.test.ts')
    expect(coverage.find(item => item.id === 'runtime-turn-persistence-entrypoint-candidate-hardening')?.proof).toContain('replay-emission-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'runtime-turn-persistence-entrypoint-candidate-hardening')?.responsibility).toContain('guarded turn persistence candidates')
    expect(coverage.find(item => item.id === 'runtime-turn-persistence-entrypoint-candidate-hardening')?.responsibility).toContain('origin-spoof rejection')
    expect(coverage.find(item => item.id === 'runtime-turn-persistence-entrypoint-candidate-hardening')?.responsibility).toContain('future guarded persistence families still need explicit classification')
  })

  it('keeps every audited direct gateway family mapped to at least one verified coverage entry', () => {
    const targets = resolveAlicizationProjectStateDirectGatewayAuditTargets()
    const uniqueTargets = new Set(targets)
    const coveredTargets = new Set(
      resolveAlicizationProjectStateCoverage()
        .flatMap(item => item.directGatewayCoverage ?? []),
    )

    expect(targets.length).toBeGreaterThanOrEqual(5)
    expect(uniqueTargets.size).toBe(targets.length)
    expect(targets.every(target => coveredTargets.has(target))).toBe(true)
  })

  it('keeps repo-level entrypoint governance hardening evidence tied to transport ownership as well as the main governed route families', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const governanceCoverage = coverage.find(item => item.id === 'entrypoint-governance-registry-hardening')

    expect(governanceCoverage?.proof).toContain('pre-dialogue-transport-audit.test.ts')
    expect(governanceCoverage?.proof).toContain('pre-dialogue-transport-entrypoint-audit.ts')
    expect(governanceCoverage?.responsibility).toContain('pre-dialogue transport')
    expect(governanceCoverage?.responsibility).toContain('mirrored into chat-entry governance')
  })

  it('exposes a single repo-level entrypoint governance registry that covers chat-start, pre-dialogue transport, chat-entry, provider-consumer, autonomous-dialogue, execution-preflight, execution-dispatch, recovery-reentry, and execution-follow-up continuity paths', () => {
    const registry = resolveAlicizationProjectEntrypointGovernanceRegistry()
    const entryPaths = resolveAlicizationProjectEntrypointGovernanceEntries()

    expect(new Set(registry.map(entry => entry.domain))).toEqual(new Set(['chat-start', 'pre-dialogue-transport', 'chat-entry', 'provider-consumer', 'autonomous-dialogue', 'execution-preflight', 'execution-dispatch', 'recovery-reentry', 'execution-follow-up-continuity']))
    expect(entryPaths).toContain('main-chat-start-awareness.ts')
    expect(entryPaths).toContain('main-chat-direct-start.ts')
    expect(entryPaths).toContain('../../../renderer/App.vue')
    expect(entryPaths).toContain('runtime-main-gateway-one-shot.ts')
    expect(entryPaths).toContain('runtime-delivery-reminders.ts')
    expect(entryPaths).toContain('runtime-subconscious-tick.ts')
    expect(entryPaths).toContain('agent-runtime.ts')
    expect(entryPaths).toContain('execution-runtime-context.ts')
    expect(entryPaths).toContain('executor-runtime.ts')
    expect(entryPaths).toContain('main-chat-execution-surface.ts')
    expect(entryPaths).toContain('task-thread-dispatcher.ts')
    expect(entryPaths).toContain('executor-adapters/codex.ts')
    expect(entryPaths).toContain('runtime-invoke-handlers-task.ts')
    expect(entryPaths).toContain('main-chat-start-result.ts')
    expect(entryPaths).toContain('main-chat-timeout-fallback.ts')
    expect(entryPaths).toContain('execution-callback-runtime.ts')
    expect(entryPaths).toContain('memory-ledger-runtime.ts')
    expect(entryPaths).toContain('../../../../apps/stage-tamagotchi/src/renderer/components/InteractiveArea.vue')
    expect(entryPaths.some(path => path.includes('chat.ts'))).toBe(true)
    expect(entryPaths.some(path => path.includes('context-bridge.ts'))).toBe(true)
    expect(entryPaths.some(path => path.includes('text-composer-store.ts'))).toBe(true)
    expect(entryPaths.some(path => path.includes('runtime.ts'))).toBe(true)
    expect(entryPaths.some(path => path.includes('task-thread-orchestrator.ts'))).toBe(true)
  })

  it('keeps every current governed entrypoint file explicitly registered so new entrypoint seams cannot drift past the registry', () => {
    const discoveredFiles = resolveAlicizationProjectEntrypointGovernedFiles()
    const registryFiles = resolveAlicizationProjectEntrypointGovernanceEntries().slice().sort()

    expect(discoveredFiles).toEqual(registryFiles)
    expect(resolveAlicizationProjectEntrypointGovernanceRegistry().map(entry => entry.relativePath).sort())
      .toEqual(discoveredFiles)
  })

  it('builds a unified phase-1 closure dashboard from repo truth and live shaping signals', () => {
    const block = buildAlicizationProjectStateClosureDashboard({
      architecture: {
        operatingMode: 'speaking',
        dominantSystem: 'dialogue',
        closureAudit: {
          summary: 'phase=Phase 1: Local Digital Life | open-loop=Memory still needs stronger end-to-end closure | shaping=ecology:quiet-accompany,autonomy:prepare-act',
          activeClosurePressures: ['ecology:quiet-accompany', 'autonomy:prepare-act', 'charter:restrained'],
        },
      },
      runtimeDigest: {
        dominantChannel: 'dialogue',
        habitMode: 'return-with-proof',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        projectState: {
          continuityArcStage: 'same-her-runtime-arc',
          continuityCue: 'callback continuity is still being compressed into one living line',
        },
      },
    })

    expect(block).toContain('[ALICIZATION_PROJECT_GOVERNANCE_DASHBOARD]')
    expect(block).not.toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
    expect(block).not.toContain('identity=local_desktop_life_loop')
    expect(block).not.toContain('phase=local_desktop_life_loop')
    expect(block).not.toContain('awareness_summary=identity=local_desktop_life_loop')
    expect(block).not.toContain('project_awareness=')
    expect(block).not.toContain('Before answering')
    expect(block).not.toContain('proactive initiative now has a compact same-her closure loop')
    expect(block).not.toContain('rest-protective proactive feedback next-session carry')
    expect(block).not.toContain('final settlement reanchors generic same-her shells')
    expect(block).toContain('context_role=memory_governance_dashboard')
    expect(block).toContain('dashboard_scope=memory_governance_audit')
    expect(block).not.toContain('continuity_anchor=local_desktop_life_loop')
    expect(block).toContain('owner=project_state_governance')
    expect(block).toContain('continuity_hold=continuity_hold=project-state')
    expect(block).toContain('continuity_drift_risk=generic_guidance_without_first_person_continuity')
    expect(block).not.toContain('same_her_line=')
    expect(block).not.toContain('same_her_hold=')
    expect(block).not.toContain('same_her_drift_risk=')
    expect(block).not.toContain('proactive_same_her_gap=')
    expect(block).not.toContain('proactive_same_her_gap=')
    expect(block).toContain('continuity_gap=proactive_continuity_loop=partial')
    expect(block).toContain('long_run_noisy_desktop_proof=needed')
    expect(block).toContain('project_identity_route_carry=needs_disciplined_updates')
    expect(block).toContain('next_closure_target=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(block).toContain('project_identity')
    expect(block).toContain('verified_coverage_count=')
    expect(block).toContain('architecture_closure=')
    expect(block).toContain('active_closure_pressures=ecology:quiet-accompany, autonomy:prepare-act, charter:restrained')
    expect(block).toContain('continuity_arc_stage=')
    expect(block).not.toContain('continuity_arc_stage=same-her-runtime-arc')
    expect(block).toContain('dashboard_rule=verify_identity_phase_and_open_closure_before_turn')
    expect(resolveAlicizationProjectStateCoverage().some(item => item.id === 'main-chat-runtime-surface-living-self-preflight')).toBe(true)
    expect(resolveAlicizationProjectStateCoverage().some(item => item.id === 'visible-reply-facade-preflight-surface')).toBe(true)
  })

  it('canonically describes cross-modal same-her embodiment closure reminders from lane-shrinkage evidence', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'same-her continuity remains alive, but lane=lipsync-only under the current renderer authority.',
      currentBodyState: null,
    })).toBe('continuity=embodiment | lane=lipsync-only | status=pending-rejoin | pending_rejoin=body+face+motion+voice | closure=full-cross-modal-open | visibility=internal-structured')

    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'same-her continuity remains alive, but lane=lipsync+voice-only under the current renderer authority.',
      currentBodyState: null,
    })).toBe('continuity=embodiment | lane=lipsync+voice-only | status=pending-rejoin | pending_rejoin=body+face+motion | closure=full-cross-modal-open | visibility=internal-structured')

    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: null,
      currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
    })).toBe('continuity=embodiment | lane=face+motion-only | status=pending-rejoin | pending_rejoin=body+lipsync+voice | closure=full-cross-modal-open | visibility=internal-structured')

    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'same-her continuity remains broadly shared',
      currentBodyState: 'face+motion+lipsync aligned',
    })).toBe('')
  })
})
