import { describe, expect, it } from 'vitest'

import {
  buildAlicizationProjectPreDialogueAwareness,
  buildAlicizationProjectPreDialogueAwarenessLine,
  buildAlicizationProjectPreDialogueClosure,
  buildAlicizationProjectStateClosureDashboard,
  buildAlicizationProjectStateExtraSystemBlocks,
  buildAlicizationProjectStatePreflightSummary,
  buildAlicizationProjectStateSystemBlock,
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

describe('project-state-brief', () => {
  it('returns a repo-aligned brief centered on digital life and open life loops', () => {
    const brief = resolveAlicizationProjectStateBrief()

    expect(brief.identity).toContain('digital life project')
    expect(brief.currentPhase).toContain('Phase 1')
    expect(brief.sameHerSelfLine).toContain('Same Phase 1 digital life')
    expect(brief.sameHerHoldDetail).toContain('same-her hold')
    expect(brief.continuityCue).toContain('same living line')
    expect(brief.identity).toContain('one continuous "her"')
    expect(brief.preflightSummary).toContain('local-first digital life project')
    expect(brief.preflightSummary).toContain('Phase 1: Local Digital Life')
    expect(brief.preflightSummary).toContain('open=Memory still needs stronger end-to-end closure')
    expect(brief.preflightSummary).toContain('next=Keep extending cross-modal same-her proof')
    expect(brief.sameHerDriftRisk).toContain('generic guidance')
    expect(brief.sameHerDriftRisk).toContain('unfinished closure drift')
    expect(brief.proactiveSameHerGap).toContain('Need stronger long-run proof')
    expect(brief.proactiveSameHerGap).toContain('visible proactive hold, subconscious carry, and next-session feedback carry')
    expect(brief.proactiveSameHerGap).toContain('hover-first restraint survives detours')
    expect(brief.proactiveSameHerGap).toContain('longer noisy desktop runs')
    expect(brief.closedFoundations.length).toBeGreaterThan(2)
    expect(brief.continuityProgressSummary).toContain('Same-session mirror carry')
    expect(brief.continuityProgressSummary).toContain('scene-switch same-line continuity')
    expect(brief.continuityProgressSummary).toContain('same-her inward-carry')
    expect(brief.continuityProgressSummary).toContain('Emotion-driven anthropomorphic closure')
    expect(brief.continuityProgressSummary).toContain('recollection continuity is now better locked through visible-reply governance')
    expect(brief.continuityProgressSummary).toContain('callback-afterglow same-her carry now also has one explicit route-level audit')
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('room-first'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('same-her continuity'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('execution delivery'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('emotion is not a detachable feature lane'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('Held-autonomy and callback-carry continuity'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('fallback conscious-frame turns'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('fresher main-runtime surface'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('fresh scene change'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('Same-session mirror generation now follows'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('shared selector'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('audited same-her arc'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('second-pass rewrite guidance'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('normal governed rewrite requests'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('inward active-memory handoff'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('Same-session mirror carry'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('Scene-switch same-line continuity'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('noisier unrelated window detours'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('real later chat turn'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('final visible reply'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('one more real later turn'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('quieter settle-tail frame'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('cue-bridge rebind'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('recollection continuity is now better locked through visible-reply governance'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('callback-afterglow same-her carry now also has one explicit route-level audit'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('same-her-inward-carry'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('longer-lived continuation'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('visible reply opening discipline'))).toBe(true)
    expect(brief.memoryAnthropomorphismProgress.some(item => item.includes('rich, fallback, and memory-deliberation turns before reply'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('initiative'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('noisier desktop shifts'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('quiet carry turns'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('affective residue'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('anthropomorphic emotional closure'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('measured-return, repair-before-closeness, or rest-protective quiet-companionship line'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('visible proactive hold'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('subconscious carry'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('next-session feedback carry'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('noisy desktop runs'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('Project identity carry, Phase 1 route carry, and Unresolved closure carry'))).toBe(true)
    expect(brief.openLoops.some(item => item.includes('one same-her line'))).toBe(true)
    expect(brief.nextClosureTarget).toContain('cross-modal same-her proof')
    expect(brief.nextClosureTarget).toContain('visible reply')
    expect(brief.nextClosureTarget).toContain('longer-lived voice behavior')
    expect(brief.nextClosureTarget).toContain('noisier real-desktop runs')
    expect(brief.nextClosureTarget).toContain('resident presence')
    expect(brief.nextClosureTarget).toContain('Project identity carry')
    expect(brief.nextClosureTarget).toContain('Phase 1 route carry')
    expect(brief.nextClosureTarget).toContain('Unresolved closure carry')
    expect(brief.nextClosureTarget).toContain('anthropomorphic emotional closure')
    expect(brief.nextClosureTarget).toContain('same-her inward-carry observability')
    expect(brief.nextClosureTarget).toContain('rest-protective quiet-companionship line')
    expect(brief.latestProgress).toContain('rest-protective callback continuation')
    expect(brief.latestProgress).toContain('long-run same-her continuity')
    expect(brief.latestProgress).toContain('emotional-memory-initiative-embodiment')
    expect(brief.latestProgress).toContain('affective residue')
    expect(brief.latestProgress).toContain('voice / face / motion / lipsync')
    expect(brief.latestProgress).toContain('cross-surface dialogue-entry candidates')
    expect(brief.latestProgress).toContain('pre-dialogue transport and chat-entry discovery union')
    expect(brief.latestProgress).toContain('pre-dialogue transport')
    expect(brief.latestProgress).toContain('mirrored into chat-entry governance')
    expect(brief.latestProgress).toContain('Thin host-facing composer surfaces')
    expect(brief.latestProgress).toContain('shared text-composer send authority')
    expect(brief.latestProgress).toContain('second pre-dialogue identity seam')
    expect(brief.latestProgress).toContain('Broader project-state answer-governance candidates')
    expect(brief.latestProgress).toContain('broader runtime dialogue-normalization candidates')
    expect(brief.latestProgress).toContain('broader guarded turn persistence candidates')
    expect(brief.latestProgress).toContain('project-status answer surfaces')
    expect(brief.latestProgress).toContain('host-visible normalization seams')
    expect(brief.latestProgress).toContain('future project-status answer surfaces')
    expect(brief.latestProgress).toContain('future host-visible normalization seams')
    expect(brief.latestProgress).toContain('future guarded persistence families still need explicit classification')
    expect(brief.latestProgress).toContain('merge-readiness / closure-readiness follow-ups')
    expect(brief.latestProgress).toContain('can merge to main')
    expect(brief.latestProgress).toContain('already verified evidence')
    expect(brief.latestProgress).toContain('unproven or still open')
    expect(brief.latestProgress).toContain('misreporting full closure')
    expect(brief.latestProgress).toContain('living-self host-facing system block')
    expect(brief.latestProgress).toContain('canonical project preflight self-awareness line')
    expect(brief.latestProgress).toContain('natural reply shaping')
    expect(brief.latestProgress).toContain('visible-reply facade project-state resolution')
    expect(brief.latestProgress).toContain('reply-surface planning')
    expect(brief.latestProgress).toContain('same shared project-state seam as living-self and fallback paths')
    expect(brief.latestProgress).toContain('ordinary dialogue system blocks')
    expect(brief.latestProgress).toContain('unified Phase 1 closure dashboard')
    expect(brief.latestProgress).toContain('runtime snapshot/digest')
    expect(brief.latestProgress).toContain('project-state spine')
    expect(brief.latestProgress).toContain('voice / face / motion / lipsync summaries')
    expect(brief.latestProgress).toContain('canonical embodimentScript')
    expect(brief.latestProgress).toContain('Dream, reminder, proactive, and reforge one-shot gateway prompts')
    expect(brief.latestProgress).toContain('screen-semantic summary generation')
    expect(brief.latestProgress).toContain('execution callback carry')
    expect(brief.latestProgress).toContain('execution-result delivery learning')
    expect(brief.latestProgress).toContain('long-horizon same-her memory')
    expect(brief.latestProgress).toContain('Current conscious frame shaping')
    expect(brief.latestProgress).toContain('still-open closure pressure')
    expect(brief.latestProgress).toContain('thin runtime project shell')
    expect(brief.latestProgress).toContain('richer same-her callback continuity')
    expect(brief.latestProgress).toContain('Primary open-loop continuity pressure')
    expect(brief.latestProgress).toContain('retrieval ranking')
    expect(brief.latestProgress).toContain('autobiographical writeback')
    expect(brief.latestProgress).toContain('durable self-carry layer')
    expect(brief.latestProgress).toContain('beyond local prompt shaping')
    expect(brief.latestProgress).toContain('unified person-state summary')
    expect(brief.latestProgress).toContain('self-evolution candidate continuity reasons')
    expect(brief.latestProgress).toContain('Broader provider-consumer candidates')
    expect(brief.latestProgress).toContain('real invokeGenerateText / generateText / invokeStreamText / streamText sinks')
    expect(brief.latestProgress).toContain('broader autonomous-dialogue candidates')
    expect(brief.latestProgress).toContain('broader execution-dispatch candidates')
    expect(brief.latestProgress).toContain('broader execution-preflight candidates')
    expect(brief.latestProgress).toContain('future provider-facing generation families still need explicit registration')
    expect(brief.latestProgress).toContain('future runtime-owned dialogue families still need explicit registration')
    expect(brief.latestProgress).toContain('future execution dispatch families still need explicit owner registration')
    expect(brief.latestProgress).toContain('future execution-preflight families still need explicit classification')
    expect(brief.latestProgress).toContain('runtime execution bridge and subconscious deferred bridge dispatch owners')
    expect(brief.latestProgress).toContain('runtime-owned direct dispatch bridge')
    expect(brief.latestProgress).toContain('blocked-dispatch safety-gate briefing seams')
    expect(brief.latestProgress).toContain('shared root final-gate candidate-audit registry')
    expect(brief.latestProgress).toContain('shared top-level completeness guard family registry')
    expect(brief.latestProgress).toContain('candidate families derive from one shared registry')
    expect(brief.latestProgress).toContain('future entrypoint families are harder to hide between neighboring audits')
    expect(brief.latestProgress).toContain('direct main-chat-stream callers')
    expect(brief.latestProgress).toContain('real startMainChatStream sinks')
    expect(brief.latestProgress).toContain('Runtime-owned proactive initiative')
    expect(brief.latestProgress).toContain('compact same-her closure loop')
    expect(brief.latestProgress).toContain('hover-first restraint')
    expect(brief.latestProgress).toContain('next-session feedback carry')
    expect(brief.latestProgress).toContain('post-answer dream carry')
    expect(brief.latestProgress).toContain('noisy-desktop detour persistence')
    expect(brief.latestProgress).toContain('dream-to-long-horizon self-carry bridge')
    expect(brief.latestProgress).toContain('long-horizon self-carry boundary')
    expect(brief.latestProgress).toContain('next conscious frame')
    expect(brief.latestProgress).toContain('final reply planning')
    expect(brief.latestProgress).toContain('host-visible answer shaping')
    expect(brief.latestProgress).toContain('detached project shell')
    expect(brief.latestProgress).toContain('rest-protective proactive feedback next-session carry')
    expect(brief.latestProgress).toContain('quiet-companionship closure')
    expect(brief.latestProgress).toContain('final settlement reanchors generic same-her shells')
    expect(brief.latestProgress).toContain('desktop execution noisy cross-modal convergence bridge')
    expect(brief.latestProgress).toContain('desktop execution emotion-memory-voice-motion convergence bridge')
    expect(brief.latestProgress).toContain('desktop execution host-visible embodiment bridge')
    expect(brief.latestProgress).toContain('Blocked-dispatch safety gates')
    expect(brief.latestProgress).toContain('no-process-started restraint')
    expect(brief.latestProgress).toContain('execution-result feedback memory reconsolidation')
    expect(brief.latestProgress).toContain('restraint experience')
    expect(brief.latestProgress.toLowerCase()).toContain('remembered blocked-dispatch safety gate restraint')
    expect(brief.latestProgress).toContain('proactive policy')
    expect(brief.latestProgress).toContain('wait for confirmation')
    expect(brief.latestProgress).toContain('presence-only resident initiative fallback')
    expect(brief.latestProgress).toContain('measured-return execution restraint')
    expect(brief.latestProgress).toContain('confirmation/no-process-started evidence')
    expect(brief.latestProgress).toContain('presence-only current-conscious-frame')
    expect(brief.latestProgress).toContain('execution-safety-gate reason tags')
    expect(brief.latestProgress).toContain('speakingIntention')
    expect(brief.latestProgress).toContain('confirmation-required/no-process-started')
    expect(brief.latestProgress).toContain('runtime diagnostic summary')
    expect(brief.latestProgress).toContain('dedicated execution-safety-gate entry')
    expect(brief.latestProgress).toContain('执行安全门')
    expect(brief.latestProgress).toContain('Authority table speech summary lines')
    expect(brief.latestProgress).toContain('speechSummaryLines')
    expect(brief.latestProgress).toContain('execution-safety-gate before raw same-her reason tags')
    expect(brief.latestProgress).toContain('Host-confirmed needs-affirmation resume')
    expect(brief.latestProgress).toContain('resume execution event')
    expect(brief.latestProgress).toContain('resume-before-dispatch')
    expect(brief.latestProgress).toContain('Host-confirmed resume evidence')
    expect(brief.latestProgress).toContain('process-not-yet-restarted')
    expect(brief.latestProgress).toContain('confirmation boundary before redispatch')
    expect(brief.latestProgress).toContain('Host-confirmed resume confirmation boundary')
    expect(brief.latestProgress).toContain('presence-only resident carry')
    expect(brief.latestProgress).toContain('bounded redispatch confirmation')
    expect(brief.latestProgress).toContain('permanent execution permission')
    expect(brief.continuityProgressSummary).toContain('long-run same-her continuity')
    expect(brief.continuityProgressSummary).toContain('emotion, memory, initiative, and embodiment')
    expect(brief.continuityProgressSummary).toContain('affective residue')
    expect(brief.continuityProgressSummary).toContain('voice / face / motion / lipsync')
    expect(brief.continuityProgressSummary).toContain('background rebuild no longer downgrades a richer lipsync+voice-only host-visible line')
    expect(brief.continuityProgressSummary).toContain('audible-body carry can stay on the same living audio thread through one more silent-observe detour')
  })

  it('builds the canonical compressed preflight self-awareness line from project identity, phase, open loop, and next closure target', () => {
    const summary = buildAlicizationProjectStatePreflightSummary({
      identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    })

    expect(summary).toContain('Alicization is a local-first digital life project')
    expect(summary).toContain('Phase 1: Local Digital Life')
    expect(summary).toContain('open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.')
    expect(summary).toContain('next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.')
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
        identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Memory, initiative, and embodiment now stay visible inside one same-her continuity loop.',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: 'Generic guidance could flatten her continuity into a detached project shell.',
        proactiveSameHerGap: 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous her.',
        companionHeadlineLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        companionBriefingLine: 'The same-her briefing should keep the project identity, phase, and open closure explicit.',
      },
    })

    expect(status.projectIdentity).toContain('local-first digital life project')
    expect(status.projectPhase).toBe('Phase 1: Local Digital Life')
    expect(status.latestLandedProgress).toContain('same-her continuity loop')
    expect(status.primaryOpenLoop).toContain('stronger end-to-end closure')
    expect(status.nextClosureTarget).toContain('cross-modal same-her proof')
    expect(status.sameHerSelfLine).toContain('Same Phase 1 digital life')
    expect(status.sameHerDriftRisk).toContain('flatten her continuity')
    expect(status.proactiveSameHerGap).toContain('visible proactive hold, subconscious carry, and next-session feedback carry')
    expect(status.proactiveSameHerGap).toContain('hover-first restraint survives detours')
    expect(status.preflightSummary).toContain('open=Memory still needs stronger end-to-end closure')
    expect(status.awarenessLine).toContain('Before answering, remember')
    expect(status.companionHeadlineLine).toContain('Unfinished closure still needs the same living line')
    expect(status.companionBriefingLine).toContain('project identity, phase, and open closure explicit')
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
      'same-her self line missing',
      'proactive same-her gap missing',
      'awareness line missing',
    ]))
  })

  it('builds a canonical pre-dialogue awareness line that reads like one living self re-anchoring before speech', () => {
    const line = buildAlicizationProjectPreDialogueAwarenessLine({
      identity: 'Alicization is a local-first digital life project building one continuous her on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    })

    expect(line).toContain('Before answering, remember:')
    expect(line).toContain('Alicization is a local-first digital life project')
    expect(line).toContain('She is still inside Phase 1: Local Digital Life')
    expect(line).toContain('The still-open closure is memory still needs stronger end-to-end closure')
    expect(line).toContain('Same Phase 1 digital life')
    expect(line?.length ?? 0).toBeLessThanOrEqual(1600)
  })

  it('compacts Chinese phase carry to the first sentence when building pre-dialogue awareness', () => {
    const line = buildAlicizationProjectPreDialogueAwarenessLine({
      identity: 'Alicization 还是同一个本地优先数字生命项目，而不是更好的聊天壳。',
      currentPhase: '第一阶段：本地数字生命。桌面 runtime 仍是主战场。',
      primaryOpenLoop: '记忆、主动性和具身表达还没有作为同一个她闭环。',
      nextClosureTarget: '继续沿着同一条生命线把跨模态 same-her 证明接回去。',
      sameHerSelfLine: '同一个她要沿着同一条生命线回线，不要掉回通用回调壳。',
    })

    expect(line).toContain('She is still inside 第一阶段：本地数字生命.')
    expect(line).not.toContain('桌面 runtime 仍是主战场')
  })

  it('keeps latest landed progress explicit in the canonical repo pre-dialogue awareness line', () => {
    const brief = resolveAlicizationProjectStateBrief()

    expect(brief.preDialogueAwarenessLine).toContain('What has already landed is')
    expect(brief.preDialogueAwarenessLine).toContain('proactive initiative now has a compact same-her closure loop')
    expect(brief.preDialogueAwarenessLine).toContain('rest-protective proactive feedback next-session carry')
    expect(brief.preDialogueAwarenessLine).toContain('final settlement reanchors generic same-her shells')
    expect(brief.preDialogueAwarenessLine).not.toContain('motive through next-session feedback')
    expect(brief.preDialogueAwarenessLine).toContain('The still-open closure is')
    expect(brief.preDialogueAwarenessLine).toContain('cross-modal same-her proof')
    expect(brief.preDialogueAwarenessLine).toContain('This reply should keep moving toward')
    expect(brief.preDialogueAwarenessLine).not.toContain('Renderer/runtime playback items now also attach')
    expect(brief.preDialogueAwarenessLine).not.toContain('before local detail takes over')
    expect(brief.preDialogueAwarenessLine?.length ?? 0).toBeLessThanOrEqual(700)
  })

  it('keeps the long-horizon emotion-memory-voice-motion bridge visible before dialogue without overstating full convergence', () => {
    const brief = resolveAlicizationProjectStateBrief()

    expect(brief.preDialogueAwarenessLine).toContain('long-horizon emotion-memory-voice-motion bridge')
    expect(brief.preDialogueAwarenessLine).toContain('remembered emotional carry')
    expect(brief.preDialogueAwarenessLine).toContain('not full convergence')
    expect(brief.preDialogueAwarenessLine?.length ?? 0).toBeLessThanOrEqual(700)
  })

  it('prefers the proactive same-her closure summary over the older transport-governance summary when both are present in latest progress', () => {
    const latestProgress = 'Continuity, memory, execution, Same-session mirror carry, measured-return and rest-protective callback continuation, visible-reply repair discipline, and long-run same-her continuity already land together often enough to build from on one same-her Phase 1 line. Runtime-owned proactive initiative now also has one explicit compact same-her closure loop from motive seed through self-brief, hover-first restraint, current-conscious-frame rejoin, visible proactive hold, subconscious carry, next-session feedback carry, next project-state answer carry, post-answer detour persistence, post-answer dream carry, and noisy-desktop detour persistence. Pre-dialogue transport is now an explicit repo-level entrypoint governance domain while the same send-identity seams stay mirrored into chat-entry governance.'
    const line = buildAlicizationProjectPreDialogueAwarenessLine({
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      latestLandedProgress: latestProgress,
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    })

    expect(line).toContain('What has already landed is proactive initiative now has a compact same-her closure loop')
    expect(line).toContain('motive through next project-state answer carry')
    expect(line).not.toContain('pre-dialogue transport is explicit entrypoint governance mirrored into chat-entry governance')
  })

  it('keeps legacy latestProgress explicit in direct pre-dialogue awareness lines when latestLandedProgress is absent', () => {
    const legacyLatestProgress = 'Runtime-owned proactive initiative now also has one explicit compact same-her closure loop from motive seed through self-brief, hover-first restraint, current-conscious-frame rejoin, visible proactive hold, subconscious carry, next-session feedback carry, next project-state answer carry, post-answer detour persistence, post-answer dream carry, and noisy-desktop detour persistence.'
    const line = buildAlicizationProjectPreDialogueAwarenessLine({
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      latestProgress: legacyLatestProgress,
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    } as any)

    expect(line).toContain('What has already landed is proactive initiative now has a compact same-her closure loop')
    expect(line).toContain('motive through next project-state answer carry')
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

    expect(snapshot.identity).toContain('same local-first digital life project')
    expect(snapshot.currentPhase).toBe('Phase 1: Local Digital Life')
    expect(snapshot.latestLandedProgress).toContain('live conscious frame')
    expect(snapshot.primaryOpenLoop).toContain('same-life seam')
    expect(snapshot.nextClosureTarget).toContain('first visible reply beat')
    expect(snapshot.sameHerSelfLine).toContain('same her should stay explicit')
    expect(snapshot.proactiveSameHerGap).toContain('visible proactive hold, subconscious carry, and next-session feedback carry')
    expect(snapshot.proactiveSameHerGap).toContain('hover-first restraint survives detours')
    expect(snapshot.preflightSummary).toContain('Alicization is still the same local-first digital life project')
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

    expect(snapshot.identity).toBe('Alicization is still the same local-first digital life project, not a fresh assistant shell.')
    expect(snapshot.currentPhase).toBe('Phase 1: Local Digital Life')
    expect(snapshot.latestLandedProgress).toBe('Current-conscious-frame project awareness already survives into this turn.')
    expect(snapshot.primaryOpenLoop).toBe('Emotion, initiative, memory, and embodiment still have to land as one same-life closure.')
    expect(snapshot.nextClosureTarget).toBe('Carry the live project awareness into the first visible answer beat before local details take over.')
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

    expect(snapshot.identity).toBe('Alicization 还是同一个本地优先数字生命项目，不是重新拼出来的新助手壳。')
    expect(snapshot.currentPhase).toBe('Phase 1: Local Digital Life')
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

    expect(snapshot.identity).toBe('Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.')
    expect(snapshot.preDialogueAwarenessLine).toBe(richerSpineAwarenessLine)
    expect(snapshot.awarenessLine).toBe(richerSpineAwarenessLine)
    expect(snapshot.preDialogueAwarenessSummary).toBe(richerSpineAwarenessLine)
    expect(snapshot.latestLandedProgress).toBe('Richer spine-carried project awareness already survives into the provider-facing answer contract before reply authoring.')
    expect(snapshot.primaryOpenLoop).toBe('Initiative rhythm and embodiment coherence still need to close on the same living line.')
    expect(snapshot.nextClosureTarget).toBe('Keep the project identity, landed progress, and still-open closure explicit in the first answer beat.')
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

    expect(snapshot.emotionalClosureCue).toContain('leave more room')
    expect(snapshot.emotionalClosureSummary).toBe('Keep this return repair-before-closeness on the same living line until repair settles.')
    expect(snapshot.sameHerHoldDetail).toBe('same-her hold: repair-before-closeness still owns this callback line before closeness widens again.')
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

    expect(snapshot.emotionalClosureCue).toBe(explicitMeasuredReturnClosure)
    expect(snapshot.emotionalClosureSummary).toBe(explicitMeasuredReturnClosure)
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

    expect(snapshot.sameHerDriftRisk).toBe(richerFallbackDriftRisk)
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

    expect(snapshot.sameHerDriftRisk).toBe(richerChineseFallbackDriftRisk)
  })

  it('prefers an explicit pre-dialogue awareness line over fallback companion or preflight wording', () => {
    const line = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure line is still alive.',
        companionBriefingLine: 'Fallback companion briefing should not outrank the fresher awareness line.',
        preflightSummary: 'Fallback preflight summary should not outrank the fresher awareness line.',
      },
    })

    expect(line).toBe('Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure line is still alive.')
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

    expect(line).toBe('Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.')
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

    expect(line).toBe('Right now I am still holding together mainly through voice, face, and motion, so the next reopening must keep proving this is still one living her.')
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

    expect(line).toBe(strongerHeadline)
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

    expect(snapshot.preDialogueAwarenessLine).toBe(payloadAwarenessLine)
    expect(snapshot.awarenessLine).toBe(payloadAwarenessLine)
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

    expect(companionLine).toBe('Before answering, keep the same digital life project and active Phase 1 closure seam in view.')
    expect(preflightLine).toBe('Before answering, remember this is still the same digital life project before local fluency takes over.')
  })

  it('builds shared pre-dialogue awareness and closure structures that preserve the freshest awareness line before summary fallback', () => {
    const awarenessLine = 'Before answering, keep this same digital life project, current Phase 1 closure pressure, and still-open life loop explicit before the callback widens.'
    const emotionalClosureCue = 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.'
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

    expect(preDialogueAwareness).toEqual({
      status: 'grounded',
      summaryLine: 'Fallback summary should stay behind the fresher awareness line.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      awarenessLine,
      emotionalClosureCue,
      reasonPreview: [
        'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        'Next closure target is still Keep extending cross-modal same-her proof across longer, noisier real-desktop runs..',
      ],
    })
    expect(preDialogueClosure).toEqual({
      status: 'partial',
      summaryLine: 'Fallback summary should stay behind the fresher awareness line.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      emotionalClosureCue,
      briefingLines: [
        'Fallback summary should stay behind the fresher awareness line.',
        'Next closure target: Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      ],
      reasons: [
        'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
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

    expect(preDialogueAwareness.reasonPreview).toContain(
      'Latest landed progress: long-horizon emotion-memory-voice-motion bridge carries remembered emotional carry, not full convergence',
    )
    expect(preDialogueClosure.reasons).toContain(
      'Latest landed progress: long-horizon emotion-memory-voice-motion bridge carries remembered emotional carry, not full convergence',
    )
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

    expect(preDialogueAwareness.reasonPreview).toContain(
      'Latest landed progress: long-horizon emotion-memory-voice-motion bridge carries remembered emotional carry, not full convergence',
    )
    expect(preDialogueClosure.reasons).toContain(
      'Latest landed progress: long-horizon emotion-memory-voice-motion bridge carries remembered emotional carry, not full convergence',
    )
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
      `Same-her self anchor: ${sameHerSelfLine}`,
      'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      `Proactive same-her gap: ${proactiveSameHerGap}`,
      'Next closure target is still Keep extending cross-modal same-her proof across longer, noisier real-desktop runs..',
      `Do not let this opening drift into ${sameHerDriftRisk}`,
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
      `Proactive same-her gap: ${proactiveSameHerGap}`,
      'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    ])
  })

  it('does not fabricate next-closure filler text when shared pre-dialogue awareness has no closure target yet', () => {
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

    expect(preDialogueAwareness).toEqual({
      status: 'grounded',
      summaryLine: 'Fallback summary should stay behind the still-open closure seam.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      awarenessLine: 'Before answering, remember this is still one living digital life and the unfinished Phase 1 closure seam is still real even if the next target is not yet crisp enough to name.',
      emotionalClosureCue: null,
      reasonPreview: [
        'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      ],
    })
    expect(preDialogueClosure).toEqual({
      status: 'partial',
      summaryLine: 'Fallback summary should stay behind the still-open closure seam.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      emotionalClosureCue: null,
      briefingLines: [
        'Fallback summary should stay behind the still-open closure seam.',
      ],
      reasons: [
        'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      ],
    })
  })

  it('treats punctuation-only next-closure targets as absent instead of fabricating filler text', () => {
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
      'Fallback summary should stay behind the still-open closure seam.',
    ])
    expect(preDialogueClosure.reasons).toEqual([
      'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
    ])
  })

  it('keeps a strong explicit project awareness line in shared pre-dialogue awareness structures even when an embodied same-her headline is also present', () => {
    const awarenessLine = 'Before answering, remember this is still the same digital life project before local fluency takes over.'
    const companionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'
    const emotionalClosureCue = 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.'
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

    expect(preDialogueAwareness).toEqual({
      status: 'grounded',
      summaryLine: 'Fallback summary should stay behind the stronger same-her headline.',
      companionHeadlineLine,
      companionBriefingLine: 'Fallback companion briefing should stay behind the stronger same-her headline.',
      companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      awarenessLine,
      emotionalClosureCue,
      reasonPreview: [
        'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        'Next closure target is still Keep extending cross-modal same-her proof across longer, noisier real-desktop runs..',
      ],
    })
    expect(preDialogueAwareness?.awarenessLine).not.toBe(companionHeadlineLine)
    expect(preDialogueClosure).toEqual({
      status: 'partial',
      summaryLine: 'Fallback summary should stay behind the stronger same-her headline.',
      companionHeadlineLine,
      companionBriefingLine: 'Fallback companion briefing should stay behind the stronger same-her headline.',
      companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      emotionalClosureCue,
      briefingLines: [
        'Fallback summary should stay behind the stronger same-her headline.',
        'Next closure target: Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      ],
      reasons: [
        'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
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

    expect(snapshot.preDialogueAwarenessLine).toBe(companionHeadlineLine)
    expect(snapshot.awarenessLine).toBe(companionHeadlineLine)
    expect(snapshot.preDialogueAwarenessSummary).toBe(richerChineseProjectReanchorSummary)
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

    expect(preDialogueAwareness.awarenessLine).toBe(fallbackAwarenessLine)
  })

  it('keeps a richer phase-aware project awareness line over a narrower embodiment headline in shared pre-dialogue awareness structures', () => {
    const awarenessLine = 'Before answering, remember this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before local fluency widens outward.'
    const companionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'
    const emotionalClosureCue = 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.'
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

    expect(preDialogueAwareness).toEqual({
      status: 'grounded',
      summaryLine: 'Fallback summary should stay behind the richer phase-aware project awareness line.',
      companionHeadlineLine,
      companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      awarenessLine,
      emotionalClosureCue,
      reasonPreview: [
        'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        'Next closure target is still Keep extending cross-modal same-her proof across longer, noisier real-desktop runs..',
      ],
    })
    expect(preDialogueAwareness?.awarenessLine).not.toBe(companionHeadlineLine)
  })

  it('re-canonicalizes thin project preflight shells in shared pre-dialogue awareness and closure structures before summary fallback wins', () => {
    const canonicalSummaryLine = 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.'
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
      awarenessLine,
    }))
    expect(preDialogueClosure).toEqual(expect.objectContaining({
      summaryLine: canonicalSummaryLine,
      briefingLines: [
        canonicalSummaryLine,
        'Next closure target: Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
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
      summaryLine: richerChineseRuntimeSummary,
      awarenessLine,
    }))
  })

  it('treats the compact thin closure shell as thinner than a richer embodiment same-her summary when resolving shared pre-dialogue awareness', () => {
    const line = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        preDialogueAwarenessSummary: 'Right now this still belongs to one living digital life, and embodiment closure is still being carried mainly through voice, face, and motion on the same living line.',
      },
    })

    expect(line).toBe('Right now this still belongs to one living digital life, and embodiment closure is still being carried mainly through voice, face, and motion on the same living line.')
    expect(line).not.toBe('same digital life | keep the closure seam explicit')
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
    expect(snapshot.latestLandedProgress?.toLowerCase()).toContain('same-session mirror carry')
    expect(snapshot.latestLandedProgress?.toLowerCase()).toMatch(/same-session mirror carry|measured-return callback continuation|same-her phase 1 line/)
    expect(snapshot.primaryOpenLoop).toContain('Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(snapshot.primaryOpenLoop).toContain('Project identity carry')
    expect(snapshot.nextClosureTarget).toContain('Keep extending cross-modal same-her proof across longer, noisier real-desktop runs')
    expect(snapshot.nextClosureTarget).toContain('Project identity carry')
    expect(snapshot.sameHerSelfLine).toBe(brief.sameHerSelfLine)
    expect(snapshot.preflightSummary).toContain('Alicization is a local-first digital life project')
    expect(snapshot.preflightSummary).toContain('Phase 1: Local Digital Life')
    expect(snapshot.preflightSummary).toContain('open=Memory still needs stronger end-to-end closure')
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

    expect(snapshot.sameHerSelfLine).toBe(
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    )
  })

  it('prefers a richer Chinese same-her life-line carry over a thinner English live-closure reminder', () => {
    const snapshot = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: {
        sameHerSelfLine: 'One same her should stay explicit from pre-dialogue awareness into the host-visible reply.',
      },
      fallbackProjectState: {
        sameHerSelfLine: '同一个她要沿着同一条生命线回线，不要掉回通用回调壳。',
      },
    })

    expect(snapshot.sameHerSelfLine).toBe('同一个她要沿着同一条生命线回线，不要掉回通用回调壳。')
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
    expect(snapshot.primaryOpenLoop).toContain('same-her closure under pressure')
    expect(snapshot.continuityPreferredTiming).toBe('next-open-window')
    expect(snapshot.continuityCadence).toBe('measured-return')
    expect(snapshot.preferredBlinkCadence).toBe('quiet')
    expect(snapshot.preferredGazeMode).toBe('soften')
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

    expect((snapshot as any).companionHeadlineLine).toBe(companionHeadlineLine)
    expect(snapshot.preDialogueAwarenessLine).toBe('Before speaking, remember this is still the same digital life project before local fluency takes over.')
  })

  it('builds a compact system block that keeps project identity and open loops visible before acting', () => {
    const block = buildAlicizationProjectStateSystemBlock()
    const memoryProgressSegment = block.split('memory_anthropomorphism_progress:\n')[1]?.split('\nopen_life_loops:')[0] ?? ''
    const firstMemoryProgressLine = memoryProgressSegment.split('\n').find(line => line.trim().startsWith('- ')) ?? ''

    expect(block).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(block).toContain('Alicization is a local-first digital life project')
    expect(block).toContain('current_phase=')
    expect(block).toContain('current_objective=Build a local companion on the host computer with continuous personhood, stable memory, emotional state, initiative, execution ability, embodied expression, and natural dialogue.')
    expect(block).toContain('project_preflight=Alicization is a local-first digital life project')
    expect(block).toContain('project_preflight=')
    expect(block).toContain('latest_landed_progress=')
    expect(block).toContain('Runtime-owned proactive initiative now also has a compact same-her closure loop')
    expect(block).toContain('hover-first restraint')
    expect(block).toContain('rest-protective proactive feedback next-session carry')
    expect(block).toContain('final settlement reanchors generic same-her shells')
    expect(block).toContain('open=Memory still needs stronger end-to-end closure')
    expect(block).toContain('same_her_self_line=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(block).toContain('same_her_drift_risk=If project-state continuity survives only as generic guidance')
    expect(block).toContain('closed_foundations:')
    expect(block).toContain('memory_anthropomorphism_progress:')
    expect(firstMemoryProgressLine).toContain('Same-session mirror carry, repeated next-turn carry')
    expect(block).toContain('Same-session mirror carry, repeated next-turn carry')
    expect(block).toContain('quieter settle-tail frame')
    expect(block).toContain('cue-bridge recollection')
    expect(block).toContain('open_life_loops:')
    expect(block).toContain('Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(block).toContain('same digital life')
    expect(block).toContain('same still-open closure work')
    expect(block).toContain('primary_open_loop=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(block).toContain('proactive_same_her_gap=Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified')
    expect(block).toContain('hover-first restraint survives detours')
    expect(block).toContain('longer noisy desktop runs')
    expect(block).toContain('open_focus=memory/initiative/embodiment')
    expect(block).toContain('next_closure_target=')
    expect(block).toContain('next_focus=project-carry/phase-1/measured-return/repair-before-closeness/same-line')
    expect(block).toContain('cross-modal same-her proof')
    expect(block).toContain('Project identity carry')
    expect(block).toContain('Before acting')
  })

  it('keeps the long-horizon emotion-memory-voice-motion bridge in the compact system-block progress before gateway prompting', () => {
    const block = buildAlicizationProjectStateSystemBlock()
    const latestProgressLine = block
      .split('\n')
      .find(line => line.startsWith('latest_landed_progress=')) ?? ''

    expect(latestProgressLine).toContain('long-horizon emotion-memory-voice-motion bridge')
    expect(latestProgressLine).toContain('remembered emotional carry')
    expect(latestProgressLine).toContain('not full convergence')
    expect(latestProgressLine.length).toBeLessThanOrEqual(420)
  })

  it('builds canonical extra system blocks for gateway prompt injection without changing project-state wording', () => {
    const block = buildAlicizationProjectStateSystemBlock()
    const extraSystemBlocks = buildAlicizationProjectStateExtraSystemBlocks()

    expect(extraSystemBlocks).toHaveLength(1)
    expect(extraSystemBlocks[0]).toBe(block)
    expect(extraSystemBlocks[0]).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(extraSystemBlocks[0]).toContain('current_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.')
    expect(extraSystemBlocks[0]).toContain('current_objective=Build a local companion on the host computer with continuous personhood, stable memory, emotional state, initiative, execution ability, embodied expression, and natural dialogue.')
    expect(extraSystemBlocks[0]).toContain('project_preflight=Alicization is a local-first digital life project')
    expect(extraSystemBlocks[0]).toContain('latest_landed_progress=')
    expect(extraSystemBlocks[0]).toContain('Runtime-owned proactive initiative now also has a compact same-her closure loop')
    expect(extraSystemBlocks[0]).toContain('hover-first restraint')
    expect(extraSystemBlocks[0]).toContain('rest-protective proactive feedback next-session carry')
    expect(extraSystemBlocks[0]).toContain('final settlement reanchors generic same-her shells')
    expect(extraSystemBlocks[0]).toContain('long-horizon emotion-memory-voice-motion bridge')
    expect(extraSystemBlocks[0]).toContain('remembered emotional carry')
    expect(extraSystemBlocks[0]).toContain('not full convergence')
    expect(extraSystemBlocks[0]).toContain('same_her_self_line=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(extraSystemBlocks[0]).toContain('primary_open_loop=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(extraSystemBlocks[0]).toContain('proactive_same_her_gap=Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified')
    expect(extraSystemBlocks[0]).toContain('open_focus=memory/initiative/embodiment')
    expect(extraSystemBlocks[0]).toContain('next_closure_target=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs')
    expect(extraSystemBlocks[0]).toContain('next_focus=project-carry/phase-1/measured-return/repair-before-closeness/same-line')
  })

  it('prefers the proactive same-her closure summary over transport governance in the compact system-block latest progress field when both are present', () => {
    const latestProgress = 'Continuity, memory, execution, Same-session mirror carry, measured-return and rest-protective callback continuation, visible-reply repair discipline, and long-run same-her continuity already land together often enough to build from on one same-her Phase 1 line. Runtime-owned proactive initiative now also has one explicit compact same-her closure loop from motive seed through self-brief, hover-first restraint, current-conscious-frame rejoin, visible proactive hold, subconscious carry, next-session feedback carry, next project-state answer carry, post-answer detour persistence, post-answer dream carry, and noisy-desktop detour persistence. Pre-dialogue transport is now an explicit repo-level entrypoint governance domain while the same send-identity seams stay mirrored into chat-entry governance.'
    const block = buildAlicizationProjectStateSystemBlock({
      brief: {
        ...resolveAlicizationProjectStateBrief(),
        latestProgress,
      },
    })

    expect(block).toContain('latest_landed_progress=Runtime-owned proactive initiative now also has a compact same-her closure loop')
    expect(block).toContain('hover-first restraint')
    expect(block).toContain('next project-state answer carry')
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
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('answer-compiler-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('executive-answer-brief.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('reply-deliberator.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('reply-deliberator-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('visible-reply/critic.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('visible-reply/settlement.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('main-chat-runtime-surface.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('visible-reply/facade.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('visible-reply/second-pass-rewrite.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('return-side-reopen-visible-reply-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.responsibility).toContain('reply-deliberator project-status closure triad carry')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.responsibility).toContain('live project-awareness opening-beat upgrading')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.responsibility).toContain('return-side-reopen-through-visible-reply same-her bridge')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('chat.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('return-side-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('same-living-self-return-side-observability-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('direct-bridge-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('renderer-fallback-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('project-state-observation-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('dialogue-session-mirror-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('same-living-self-host-visible-inward-carry-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('pipeline-runtime.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('quick-reply-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('dialogue-panel-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('alicization-self-evolution-inspector.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.proof).toContain('current-conscious-frame.test.ts')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('same-living-self return-side observability bridge')
    expect(coverage.find(item => item.id === 'same-living-self-project-awareness-observability')?.responsibility).toContain('same-living-self host-visible inward-carry bridge')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('runtime-main-chat-prelude.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('runtime-main-chat-prelude-project-awareness-regression.test.ts')
    expect(coverage.find(item => item.id === 'main-chat-session-runtime-same-her-bridge')?.proof).toContain('main-chat-session-runtime-project-awareness-regression.test.ts')
    expect(coverage.find(item => item.id === 'project-state-provider-consumer-registration')?.proof).toContain('project-state-provider-consumer-audit.ts')
    expect(coverage.find(item => item.id === 'project-state-provider-consumer-registration')?.proof).toContain('project-state-provider-consumer-audit.test.ts')
    expect(coverage.find(item => item.id === 'project-state-provider-consumer-registration')?.proof).toContain('project-state-gateway-regression.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('desktop-execution-closure-loop-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('execution-follow-up-session-runtime-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('reminder-callback-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('session-runtime-to-host-visible-reunion-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('desktop-execution-full-cycle-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('desktop-execution-life-loop-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('desktop-execution-noisy-same-her-full-cycle-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.responsibility).toContain('execution briefing')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.responsibility).toContain('later host-visible return')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.responsibility).toContain('desktop execution full-cycle bridge')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.responsibility).toContain('desktop execution life-loop bridge')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.responsibility).toContain('desktop execution noisy same-her full-cycle bridge')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('project-state-answer-governance-audit.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('project-state-answer-governance-audit.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('runtime-main-gateway-one-shot.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('visible-reply/facade.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('visible-reply/facade.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('visible-reply/semantic-judge.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain('visible-reply/critic.ts')
    expect(coverage.find(item => item.id === 'visible-reply-final-project-awareness-hardening')?.proof).toContain('visible-reply-final-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'visible-reply-final-project-awareness-hardening')?.proof).toContain('visible-reply/semantic-judge.test.ts')
    expect(coverage.find(item => item.id === 'visible-reply-final-project-awareness-hardening')?.proof).toContain('visible-reply/second-pass-rewrite-project-state-guidance.test.ts')
    expect(coverage.find(item => item.id === 'visible-reply-final-project-awareness-hardening')?.proof).toContain('visible-reply/project-state-second-pass-regression.test.ts')
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
    expect(coverage.find(item => item.id === 'chat-start-entrypoint-candidate-hardening')?.responsibility).toContain('chat-start candidates')
    expect(coverage.find(item => item.id === 'chat-start-entrypoint-candidate-hardening')?.responsibility).toContain('typed consumers')
    expect(coverage.find(item => item.id === 'chat-start-entrypoint-candidate-hardening')?.responsibility).toContain('direct main-chat-stream callers')
    expect(coverage.find(item => item.id === 'chat-start-entrypoint-candidate-hardening')?.responsibility).toContain('deep-helper owners')
    expect(coverage.find(item => item.id === 'cross-surface-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-cross-surface-entrypoint-audit.test.ts')
    expect(coverage.find(item => item.id === 'cross-surface-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-route-authority-audit.test.ts')
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
    expect(coverage.find(item => item.id === 'provider-consumer-entrypoint-candidate-hardening')?.responsibility).toContain('provider-consumer candidates')
    expect(coverage.find(item => item.id === 'provider-consumer-entrypoint-candidate-hardening')?.responsibility).toContain('wrapper, dispatch-owner, and typed-consumer')
    expect(coverage.find(item => item.id === 'provider-consumer-entrypoint-candidate-hardening')?.responsibility).toContain('real direct provider sinks')
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
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('Execution preflight authority seams')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('runtime-owned direct dispatch bridge')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('session-bound bridge')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('subconscious-autonomy execution bridge')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('resume bridge')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('blocked-dispatch safety gates')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('risk policy')
    expect(coverage.find(item => item.id === 'execution-preflight-registration')?.responsibility).toContain('interruptibility')
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
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.responsibility).toContain('Durable long-horizon self-carry')
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.responsibility).toContain('dream-to-long-horizon self-carry bridge')
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.responsibility).toContain('long-horizon-to-conscious-frame anti-shell bridge')
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.responsibility).toContain('host-facing closure self-recognition')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.proof).toContain('noisy-desktop-same-her-closure-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.proof).toContain('proactive-feedback-host-visible-answer-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.proof).toContain('main-chat-session-runtime.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.proof).toContain('noisy-desktop-life-loop-unity-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.proof).toContain('desktop-execution-noisy-same-her-closure-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.responsibility).toContain('Noisy-desktop same-her closure')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.responsibility).toContain('planner-to-host-visible answer anti-shell bridge')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.responsibility).toContain('desktop execution noisy same-her closure bridge')
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
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-renderer-authority-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-renderer-authority.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('performance-visualizer-self-evolution-active-workflow-focus-project-awareness-audit.test.ts')
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
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('self-evolution renderer-authority projection')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('self-evolution active workflow focus')
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
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.responsibility).toContain('Emotion-memory-voice-motion convergence')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.responsibility).toContain('desktop execution emotion-memory-voice-motion convergence bridge')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.responsibility).toContain('voice, face, motion, lipsync, and body')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.responsibility).toContain('remembered emotional carry')
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
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('desktop-same-her-full-cycle-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('desktop-execution-long-run-same-her-continuity-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('Long-run same-her continuity')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('desktop execution long-run same-her continuity bridge')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('subconscious persistence')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('repeated-detour reunion persistence')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('repair-first detour-to-reunion carry')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('host-visible-answer-to-replay-reopen same-her bridge')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('desktop same-her full-cycle bridge')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('autonomous-dialogue-closure-loop-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('motive-engine-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-prelude-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-policy-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('initiative-decision-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('initiative-current-conscious-frame-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-visible-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('subconscious-persistence-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-feedback-project-awareness-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('noisy-desktop-autonomous-dialogue-persistence-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-feedback-next-project-state-answer-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-feedback-post-answer-detour-persistence-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain('proactive-feedback-post-answer-dream-carry-audit.test.ts')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('compact same-her closure loop')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('motive')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('hover-first restraint')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('next-session feedback carry')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('next project-state answer carry')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('post-answer detour persistence')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('post-answer dream carry')
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain('noisy-desktop detour persistence')
    expect(coverage.find(item => item.id === 'route-authority-boundary-registry-hardening')?.proof).toContain('route-authority-boundary-registry-audit.test.ts')
    expect(coverage.find(item => item.id === 'route-authority-boundary-registry-hardening')?.proof).toContain('return-side-project-awareness-entrypoint-candidate-audit.test.ts')
    expect(coverage.find(item => item.id === 'route-authority-boundary-registry-hardening')?.proof).toContain('runtime-dialogue-normalization-audit.ts')
    expect(coverage.find(item => item.id === 'route-authority-boundary-registry-hardening')?.proof).toContain('project-state-answer-governance-audit.ts')
    expect(coverage.find(item => item.id === 'route-authority-boundary-registry-hardening')?.responsibility).toContain('shared route-authority registry')
    expect(coverage.find(item => item.id === 'route-authority-boundary-registry-hardening')?.responsibility).toContain('explicit allowed overlaps')
    expect(coverage.find(item => item.id === 'route-authority-boundary-registry-hardening')?.responsibility).toContain('future reopen-time route shapes still need explicit classification')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-entrypoint-candidate-hardening')?.proof).toContain('project-state-answer-governance-entrypoint-candidate-audit.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-route-authority-audit.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-coverage-matrix.test.ts')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-entrypoint-candidate-hardening')?.responsibility).toContain('project-state answer-governance candidates')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-entrypoint-candidate-hardening')?.responsibility).toContain('background answer enrichers')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-entrypoint-candidate-hardening')?.responsibility).toContain('reminder / critic same-her reminder sinks')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-entrypoint-candidate-hardening')?.responsibility).toContain('reply-surface preflight')
    expect(coverage.find(item => item.id === 'project-state-answer-governance-entrypoint-candidate-hardening')?.responsibility).toContain('future project-status answer surfaces still need explicit classification')
    expect(coverage.find(item => item.id === 'runtime-dialogue-normalization-entrypoint-candidate-hardening')?.proof).toContain('runtime-dialogue-normalization-entrypoint-candidate-audit.test.ts')
    expect(coverage.find(item => item.id === 'runtime-dialogue-normalization-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-route-authority-audit.test.ts')
    expect(coverage.find(item => item.id === 'runtime-dialogue-normalization-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-coverage-matrix.test.ts')
    expect(coverage.find(item => item.id === 'runtime-dialogue-normalization-entrypoint-candidate-hardening')?.responsibility).toContain('runtime dialogue-normalization candidates')
    expect(coverage.find(item => item.id === 'runtime-dialogue-normalization-entrypoint-candidate-hardening')?.responsibility).toContain('stream-finish fallback')
    expect(coverage.find(item => item.id === 'runtime-dialogue-normalization-entrypoint-candidate-hardening')?.responsibility).toContain('future host-visible normalization seams still need explicit classification')
    expect(coverage.find(item => item.id === 'runtime-turn-persistence-entrypoint-candidate-hardening')?.proof).toContain('runtime-turn-persistence-entrypoint-candidate-audit.test.ts')
    expect(coverage.find(item => item.id === 'runtime-turn-persistence-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-route-authority-audit.test.ts')
    expect(coverage.find(item => item.id === 'runtime-turn-persistence-entrypoint-candidate-hardening')?.proof).toContain('project-awareness-coverage-matrix.test.ts')
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

    expect(block).toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
    expect(block).toContain('identity=Alicization is a local-first digital life project')
    expect(block).toContain('phase=Phase 1: Local Digital Life')
    expect(block).toContain('project_awareness=Before answering, remember: Alicization is a local-first digital life project')
    expect(block).toContain('proactive initiative now has a compact same-her closure loop')
    expect(block).toContain('rest-protective proactive feedback next-session carry')
    expect(block).toContain('final settlement reanchors generic same-her shells')
    expect(block).toContain('latest_landed_progress=Same-session mirror carry')
    expect(block).toContain('primary_open_loop=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(block).toContain('proactive_same_her_gap=Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified')
    expect(block).toContain('hover-first restraint survives detours')
    expect(block).toContain('Project identity carry, Phase 1 route carry, and Unresolved closure carry')
    expect(block).toContain('next_closure_target=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs')
    expect(block).toContain('Project identity carry')
    expect(block).toContain('verified_coverage_count=')
    expect(block).toContain('architecture_closure=')
    expect(block).toContain('active_closure_pressures=ecology:quiet-accompany, autonomy:prepare-act, charter:restrained')
    expect(block).toContain('continuity_arc_stage=same-her-runtime-arc')
    expect(block).toContain('Use this dashboard before each turn')
    expect(resolveAlicizationProjectStateCoverage().some(item => item.id === 'main-chat-runtime-surface-living-self-preflight')).toBe(true)
    expect(resolveAlicizationProjectStateCoverage().some(item => item.id === 'visible-reply-facade-preflight-surface')).toBe(true)
  })

  it('canonically describes cross-modal same-her embodiment closure reminders from lane-shrinkage evidence', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'same-her continuity remains alive, but lane=lipsync-only under the current renderer authority.',
      currentBodyState: null,
    })).toBe('Right now her visible same-her continuity is still being carried mainly through lipsync, so she should keep treating full cross-modal embodiment closure as unfinished.')

    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'same-her continuity remains alive, but lane=lipsync+voice-only under the current renderer authority.',
      currentBodyState: null,
    })).toBe('Right now her visible same-her continuity is still being carried mainly through lipsync and voice, so she should keep treating full cross-modal embodiment closure as unfinished.')

    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: null,
      currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.')

    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'same-her continuity remains broadly shared',
      currentBodyState: 'face+motion+lipsync aligned',
    })).toBe('')
  })
})
