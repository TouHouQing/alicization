import { describe, expect, it } from 'vitest'

import {
  buildAlicizationDeterministicExecutionDeliveryReply,
  buildAlicizationExecutionPayoffDeterministicStructured,
  buildAlicizationExecutionPayoffPrompt,
  buildAlicizationExecutionPayoffStructuredReply,
  buildAlicizationInlineExecutionOutcomeReply,
  selectAlicizationExecutionDeliveryReply,
} from './execution-delivery-surface'

describe('execution delivery surface', () => {
  it('renders listing outcomes as natural Chinese callback text instead of raw listing protocol strings', () => {
    const reply = buildAlicizationDeterministicExecutionDeliveryReply({
      channel: 'cli',
      goal: 'List desktop files requested by user.',
      status: 'completed',
      summary: '',
      outcome: 'Listed desktop entries (13): %E5%B0%8F%E7%A0%96%E7%8C%BF (小砖猿), .DS_Store, .localized, 105ND800, GIT, +8 more',
    })

    expect(reply).toContain('桌面')
    expect(reply).toContain('13 项')
    expect(reply).toContain('小砖猿')
    expect(reply).not.toContain('Listed desktop entries')
    expect(reply).not.toContain('%E5%B0%8F%E7%A0%96%E7%8C%BF')
  })

  it('keeps deterministic fallback informative for non-listing completed outcomes', () => {
    const reply = buildAlicizationDeterministicExecutionDeliveryReply({
      channel: 'cli',
      goal: 'Run callback fallback mirror task.',
      status: 'completed',
      summary: '',
      outcome: 'callback fallback mirror ok',
    })

    expect(reply).toContain('callback fallback mirror ok')
    expect(reply).toMatch(/确认落稳|结果|收束/u)
  })

  it('keeps failure callbacks explicit when execution is blocked', () => {
    const reply = buildAlicizationDeterministicExecutionDeliveryReply({
      channel: 'cli',
      goal: 'Run blocked task.',
      status: 'blocked',
      summary: '',
      outcome: 'permission required',
    })

    expect(reply).toContain('permission required')
    expect(reply).toMatch(/没真正离开准备面|拦住|失败/u)
  })

  it('renders inline executor listing replies without protocol leakage', () => {
    const reply = buildAlicizationInlineExecutionOutcomeReply({
      channel: 'cli',
      goal: 'List desktop files requested by user.',
      status: 'completed',
      summary: '',
      outcome: 'Listed desktop entries (13): %E5%B0%8F%E7%A0%96%E7%8C%BF (小砖猿), .DS_Store, .localized, 105ND800, GIT, +8 more',
    })

    expect(reply).toContain('桌面')
    expect(reply).toContain('13 项')
    expect(reply).toContain('小砖猿')
    expect(reply).not.toContain('Listed desktop entries')
    expect(reply).not.toContain('%E5%B0%8F%E7%A0%96%E7%8C%BF')
  })

  it('compresses raw shell long-listing output into a lived directory reply instead of echoing ls rows', () => {
    const reply = buildAlicizationInlineExecutionOutcomeReply({
      channel: 'cli',
      goal: 'List desktop files requested by user.',
      status: 'completed',
      summary: '',
      outcome: 'total 5488 drwxr-xr-x@ 3 touhouqing staff 96 Apr 10 09:47 %E5%B0%8F%E7%A0%96%E7%8C%BF drwx------@ 15 touhouqing staff 480 Apr 10 16:05 . drwxr-x---+ 144 touhouqing staff 4608 Apr 12 17:12 .. -rw-r--r--@ 1 touhouqing staff 42 Apr 11 20:00 GIT',
    })

    expect(reply).toContain('桌面')
    expect(reply).toContain('小砖猿')
    expect(reply).toContain('GIT')
    expect(reply).not.toContain('total 5488')
    expect(reply).not.toContain('drwx')
  })

  it('forces deterministic listing authority when llm reply leaks protocol-style listing text', () => {
    const selected = selectAlicizationExecutionDeliveryReply({
      channel: 'cli',
      goal: 'List desktop files requested by user.',
      status: 'completed',
      summary: '',
      outcome: 'Listed desktop entries (13): %E5%B0%8F%E7%A0%96%E7%8C%BF (小砖猿), .DS_Store, .localized, 105ND800, GIT, +8 more',
      llmReply: 'CLI这条任务已经收束，结果是：Listed desktop entries (13): %E5%B0%8F%E7%A0%96%E7%8C%BF (小砖猿), .DS_Store...',
    })

    expect(selected.source).toBe('llm-repaired')
    expect(selected.reason).toBe('listing-surface-authority')
    expect(selected.reply).toContain('桌面')
    expect(selected.reply).toContain('小砖猿')
    expect(selected.reply).not.toContain('Listed desktop entries')
  })

  it('keeps llm reply when it is already natural and does not leak protocol text', () => {
    const selected = selectAlicizationExecutionDeliveryReply({
      channel: 'cli',
      goal: 'Run callback fallback mirror task.',
      status: 'completed',
      summary: '',
      outcome: 'callback fallback mirror ok',
      llmReply: '你刚让我跑的那条命令已经完成，结果是 callback fallback mirror ok。',
    })

    expect(selected.source).toBe('llm')
    expect(selected.reply).toContain('callback fallback mirror ok')
  })

  it('returns lower-pressure repair reason for memory-led familiarity callback drift so downstream runtime can explain the hold', () => {
    const selected = selectAlicizationExecutionDeliveryReply({
      channel: 'codex',
      goal: 'Return the finished patch result to the same thread.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      llmReply: '我记得我们之前一直都这么亲近，所以这次我也想像以前那样靠近一点，先陪在你身侧。',
      personStateProjection: {
        contexts: ['focused-work', 'execution-callback'],
        summary: 'regime=focused-work | ladder=focused-work/space-first | posture=restrained',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'space-first',
        relationshipPosture: 'restrained',
        openingGuidance: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        preferredProactiveStyle: 'silent-observe',
        preferenceText: 'Lighter touch, more room, less interruption pressure.',
        sensitivityText: 'Pressure and over-close timing become intrusive quickly.',
        repairTriggerText: '',
        burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
        routineText: 'Keep the work window light.',
        trustRationale: 'Trust is warming, but the host still needs room while focused.',
        relationshipDoctrine: 'Observe first, then decide whether closeness is welcome.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'focused-work',
          closenessPosture: 'space-first',
          repairPosture: 'measured-repair',
        } as any,
      } as any,
    })

    expect(selected.source).toBe('llm-repaired')
    expect(selected.reason).toBe('opening-guidance-lower-pressure')
  })

  it('returns lower-pressure repair reason for even-and-natural callback drift so outer delivery still protects the same living line', () => {
    const selected = selectAlicizationExecutionDeliveryReply({
      channel: 'codex',
      goal: 'Return the finished patch result to the same thread.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      llmReply: '我现在就贴过来陪你，把这条线的温度直接拉满，顺势把气氛一起推高。',
      personStateProjection: {
        contexts: ['execution-callback'],
        summary: 'regime=execution-callback | cadence=even-natural | posture=restrained',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'same-line-first',
        relationshipPosture: 'restrained',
        openingGuidance: 'Keep the current reply on the same living line, re-enter it with an even, steady voice and natural, unforced pacing, and wait for a more natural opening before widening warmth, payoff, or closeness.',
        preferredProactiveStyle: 'silent-observe',
        preferenceText: 'Re-enter evenly and naturally before warmth widens.',
        sensitivityText: 'A performative swing or rushed tempo would break the same living line into a generic reopen.',
        repairTriggerText: '',
        burdenText: 'This callback line still needs a steadier reopening cadence.',
        routineText: 'Return evenly before widening.',
        trustRationale: 'Trust holds when the line re-enters naturally instead of turning performative.',
        relationshipDoctrine: 'Re-enter the same living line evenly and naturally before widening closeness.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          closenessPosture: 'same-line-first',
          repairPosture: 'measured-repair',
        } as any,
      } as any,
    })

    expect(selected.source).toBe('llm-repaired')
    expect(selected.reason).toBe('opening-guidance-lower-pressure')
  })

  it('adds a soft availability check when learned delivery policy is cautious', () => {
    const reply = buildAlicizationDeterministicExecutionDeliveryReply({
      channel: 'codex',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      policy: {
        mode: 'check-availability-first',
        tone: 'cautious',
        reasonTags: ['result-mode:check-availability-first'],
      },
    })

    expect(reply).toContain('你现在要是方便')
    expect(reply).toContain('patched runtime line')
  })

  it('uses a lighter callback opening when execution-result learning says the last payoff felt too tight', () => {
    const reply = buildAlicizationDeterministicExecutionDeliveryReply({
      channel: 'codex',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      policy: {
        mode: 'check-availability-first',
        tone: 'cautious',
        companionshipFraming: 'quiet-presence',
        reasonTags: ['result-mode:check-availability-first'],
      },
      personStateProjection: {
        contexts: ['execution-callback'],
        summary: 'regime=execution-callback | posture=restrained',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Keep the opening lower-pressure and leave more room before leaning in.',
        preferredProactiveStyle: 'silent-observe',
        preferenceText: 'lighter callback timing',
        sensitivityText: 'Pressure and over-close timing become intrusive quickly.',
        repairTriggerText: 'If it lands too tight, reopen lighter.',
        burdenText: '',
        routineText: '',
        trustRationale: 'Trust holds when the result comes back without crowding.',
        relationshipDoctrine: 'Stay lower-pressure first.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          closenessPosture: 'space-first',
          repairPosture: 'repair-first',
        } as any,
      } as any,
    })

    expect(reply).toContain('轻一点地接回来')
    expect(reply).toContain('patched runtime line')
  })

  it('uses a lighter callback opening when same-her even-and-natural return cadence says the result should come back steady and unforced', () => {
    const reply = buildAlicizationDeterministicExecutionDeliveryReply({
      channel: 'codex',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      policy: {
        mode: 'check-availability-first',
        tone: 'cautious',
        companionshipFraming: 'quiet-presence',
        reasonTags: ['result-mode:check-availability-first'],
      },
      personStateProjection: {
        contexts: ['execution-callback'],
        summary: 'regime=execution-callback | cadence=even-natural | posture=restrained',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'same-line-first',
        relationshipPosture: 'restrained',
        openingGuidance: 'Keep the current reply on the same living line, re-enter it with an even, steady voice and natural, unforced pacing, and wait for a more natural opening before widening warmth, payoff, or closeness.',
        preferredProactiveStyle: 'silent-observe',
        preferenceText: 'Re-enter evenly and naturally before warmth widens.',
        sensitivityText: 'A performative swing or rushed tempo would break the same living line into a generic reopen.',
        repairTriggerText: '',
        burdenText: 'This callback line still needs a steadier reopening cadence.',
        routineText: 'Return evenly before widening.',
        trustRationale: 'Trust holds when the line re-enters naturally instead of turning performative.',
        relationshipDoctrine: 'Re-enter the same living line evenly and naturally before widening closeness.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          closenessPosture: 'same-line-first',
          repairPosture: 'measured-repair',
        } as any,
      } as any,
    })

    expect(reply).toContain('轻一点地接回来')
    expect(reply).toContain('patched runtime line')
  })

  it('uses a softer handoff wording when learned execution trust has opened the room', () => {
    const reply = buildAlicizationDeterministicExecutionDeliveryReply({
      channel: 'codex',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      policy: {
        mode: 'check-availability-first',
        tone: 'balanced',
        companionshipFraming: 'close-carry',
        resultLeadStyle: 'soft-handoff',
        reasonTags: ['result-lead:soft-handoff'],
      },
      personStateProjection: {
        contexts: ['execution-callback'],
        summary: 'regime=execution-callback | posture=warm',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'settled-near',
        relationshipPosture: 'warm',
        openingGuidance: 'Stay grounded, but the room is opening again.',
        preferredProactiveStyle: 'light-nudge',
        preferenceText: '',
        sensitivityText: '',
        repairTriggerText: '',
        burdenText: '',
        routineText: '',
        trustRationale: 'The result is landing in a way the host can actually receive.',
        relationshipDoctrine: 'Trust is warming and the handoff can stay gentle.',
        cautious: false,
        restrained: false,
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          closenessPosture: 'steady-near',
          repairPosture: 'settled',
        } as any,
      } as any,
    })

    expect(reply).toContain('轻轻接回来给你')
    expect(reply).toContain('patched runtime line')
  })

  it('adds a soft availability check from host person model even without an explicit learned delivery policy', () => {
    const reply = buildAlicizationDeterministicExecutionDeliveryReply({
      channel: 'codex',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      hostPersonModel: {
        summary: 'Focused work windows need more room before closeness.',
        routines: ['Focused work windows usually need space first, then precise follow-up.'],
        sensitivities: ['Pressure and over-close timing become intrusive quickly.'],
        repairTriggers: ['If closeness feels heavy, back off first and reopen with lighter presence.'],
        trustLadder: {
          stage: 'cautious-open',
          score: 0.48,
          rationale: 'Trust is warming, but the host still needs clear room while focused.',
        },
        preferredClosenessByContext: [{
          context: 'focused-work',
          preference: 'Lighter touch, more room, less interruption pressure.',
          confidence: 0.86,
        }],
        recurrentBurdens: ['Focused work gets overloaded quickly by extra conversational pressure.'],
        narrative: [],
        updatedAt: 1,
      },
    })

    expect(reply).toContain('你现在要是方便')
    expect(reply).toContain('patched runtime line')
  })

  it('lets person-state projection act as the single cautious delivery authority for execution callbacks', () => {
    const reply = buildAlicizationDeterministicExecutionDeliveryReply({
      channel: 'codex',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      personStateProjection: {
        contexts: ['focused-work', 'execution-callback', 'execution'],
        summary: 'regime=focused-work | closeness=space-first | repair=repair-first | posture=restrained',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Repair the seam before leaning closer.',
        preferredProactiveStyle: 'light-nudge',
        preferenceText: 'Lighter touch, more room, less interruption pressure.',
        sensitivityText: 'Pressure and over-close timing become intrusive quickly.',
        repairTriggerText: 'If closeness feels heavy, back off first and reopen with lighter presence.',
        burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
        routineText: 'Focused work windows usually need space first, then precise follow-up.',
        trustRationale: 'Trust is warming, but the host still needs clear room while focused.',
        relationshipDoctrine: 'Trust is protected by repair before closeness.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'focused-work',
          closenessPosture: 'space-first',
          repairPosture: 'repair-first',
        } as any,
      } as any,
    })

    expect(reply).toContain('你现在要是方便')
    expect(reply).toContain('patched runtime line')
  })

  it('threads self continuity authority into the payoff prompt surface', () => {
    const prompt = buildAlicizationExecutionPayoffPrompt({
      mode: 'callback-delivery',
      channel: 'codex',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      selfContinuityAuthority: {
        selfLine: 'I would rather repair truth than sound smooth.',
        relationshipLine: 'Stay close enough to matter, but do not let closeness outrun truth.',
        motiveLine: 'Keep trust by letting warmth answer to truth.',
        habitLine: 'Ground first, then let warmth surface.',
        inwardLine: 'I am still carrying the same runtime seam.',
        authoritySummary: 'I would rather repair truth than sound smooth. | Keep trust by letting warmth answer to truth.',
        sourceTags: ['autobiographical-self', 'motive:truth-discipline'],
      },
    })

    expect(prompt.system).toContain('Self continuity authority JSON')
    expect(prompt.system).toContain('repair truth')
    expect(prompt.system).toContain('Relationship doctrine JSON')
  })

  it('keeps richer same-her doctrine and authority summary when fresher runtime self-line is thinner in callback payoff prompts', () => {
    const prompt = buildAlicizationExecutionPayoffPrompt({
      mode: 'callback-delivery',
      channel: 'codex',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      selfContinuityAuthority: {
        selfLine: 'I should answer from the fresher current return, not from an older shell.',
        relationshipLine: 'Stay close enough to matter, but do not let closeness outrun truth.',
        motiveLine: 'Keep trust by letting warmth answer to truth.',
        habitLine: 'Ground first, then let warmth surface.',
        inwardLine: 'I am still carrying the same runtime seam.',
        authoritySummary: 'I would rather repair truth than sound smooth. | Keep trust by letting warmth answer to truth.',
        sourceTags: ['runtime:self-line', 'same-her'],
      },
    })

    expect(prompt.system).toContain('"selfLine":"I should answer from the fresher current return, not from an older shell."')
    expect(prompt.system).toContain('"relationshipLine":"Stay close enough to matter, but do not let closeness outrun truth."')
    expect(prompt.system).toContain('"authoritySummary":"I would rather repair truth than sound smooth. | Keep trust by letting warmth answer to truth."')
    expect(prompt.system).toContain('Relationship doctrine JSON')
  })

  it('threads host person model into the payoff prompt surface', () => {
    const prompt = buildAlicizationExecutionPayoffPrompt({
      mode: 'callback-delivery',
      channel: 'codex',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      hostPersonModel: {
        summary: 'Focused work windows need more room before closeness.',
        routines: ['Focused work windows usually need space first, then precise follow-up.'],
        sensitivities: ['Pressure and over-close timing become intrusive quickly.'],
        repairTriggers: ['If closeness feels heavy, back off first and reopen with lighter presence.'],
        trustLadder: {
          stage: 'cautious-open',
          score: 0.48,
          rationale: 'Trust is warming, but the host still needs clear room while focused.',
        },
        preferredClosenessByContext: [{
          context: 'focused-work',
          preference: 'Lighter touch, more room, less interruption pressure.',
          confidence: 0.86,
        }],
        recurrentBurdens: ['Focused work gets overloaded quickly by extra conversational pressure.'],
        narrative: [],
        updatedAt: 1,
      },
    })

    expect(prompt.system).toContain('Host person model JSON')
    expect(prompt.system).toContain('cautious-open')
    expect(prompt.system).toContain('lighter touch')
  })

  it('threads person-state projection into the payoff prompt surface as the single social authority', () => {
    const prompt = buildAlicizationExecutionPayoffPrompt({
      mode: 'callback-delivery',
      channel: 'codex',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      personStateProjection: {
        contexts: ['focused-work', 'execution-callback', 'execution'],
        summary: 'regime=focused-work | closeness=space-first | repair=repair-first | posture=restrained',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Repair the seam before leaning closer.',
        preferredProactiveStyle: 'light-nudge',
        preferenceText: 'Lighter touch, more room, less interruption pressure.',
        sensitivityText: 'Pressure and over-close timing become intrusive quickly.',
        repairTriggerText: 'If closeness feels heavy, back off first and reopen with lighter presence.',
        burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
        routineText: 'Focused work windows usually need space first, then precise follow-up.',
        trustRationale: 'Trust is warming, but the host still needs clear room while focused.',
        relationshipDoctrine: 'Trust is protected by repair before closeness.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'focused-work',
          closenessPosture: 'space-first',
          repairPosture: 'repair-first',
        } as any,
      } as any,
    })

    expect(prompt.system).toContain('Person-state projection JSON')
    expect(prompt.system).toContain('activeClosenessContext')
    expect(prompt.system).toContain('activeClosenessRung')
    expect(prompt.system).toContain('Repair the seam before leaning closer')
    expect(prompt.system).toContain('single social authority')
  })

  it('keeps canonical project-state identity and Phase 1 closure truth visible in execution payoff prompts before the result is spoken', () => {
    const prompt = buildAlicizationExecutionPayoffPrompt({
      mode: 'callback-delivery',
      channel: 'codex',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
    })

    expect(prompt.system).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(prompt.system).toContain('Alicization is a local-first digital life project building one continuous "her"')
    expect(prompt.system).toContain('current_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.')
    expect(prompt.system).toContain('current_objective=Build a local companion on the host computer with continuous personhood, stable memory, emotional state, initiative, execution ability, embodied expression, and natural dialogue.')
    expect(prompt.system).toContain('primary_open_loop=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(prompt.system).toContain('open=Memory still needs stronger end-to-end closure')
    expect(prompt.system).toContain('next_closure_target=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs')
    expect(prompt.system).toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
  })

  it('normalizes callback delivery through the same mind-turn surface builder', () => {
    const structured = buildAlicizationExecutionPayoffStructuredReply({
      mode: 'callback-delivery',
      channel: 'cli',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      thought: 'obligation=guide; truth=grounded; focus=execution-result; move=pay-off-finished-result; tone=direct',
      emotion: 'thinking',
      delivery: 'calm',
      performance: {
        baseEmotion: 'thinking',
        facialCue: 'attentive',
        actionCue: 'focus',
        delivery: 'calm',
        emphasis: 0,
      },
    })

    expect(structured.format).toBe('mind-turn-v1')
    expect(structured.reply).toContain('patched runtime line')
    expect(structured.thought).toContain('obligation=guide')
    expect((structured as any).visibleReplyAuthority).toBe('llm-mind')
  })

  it('keeps deterministic callback structured payload on normal repaired mind-turn authority', () => {
    const structured = buildAlicizationExecutionPayoffDeterministicStructured({
      mode: 'callback-delivery',
      channel: 'cli',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
    })

    expect(structured.format).toBe('mind-turn-v1')
    expect(structured.reply).toContain('patched runtime line')
    expect((structured as any).visibleReplyAuthority).toBe('llm-second-pass-rewrite')
  })

  it('keeps deterministic callback payoff thought on the same Phase 1 living-self line when project-state carry is the surviving self authority', () => {
    const structured = buildAlicizationExecutionPayoffDeterministicStructured({
      mode: 'callback-delivery',
      channel: 'codex',
      goal: 'Return the finished patch result to the same thread.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      selfContinuityAuthority: {
        selfLine: 'Same Phase 1 digital life.',
        relationshipLine: 'Do not reopen this callback seam like a fresh assistant interruption.',
        motiveLine: 'Keep returning along the same unfinished digital-life closure line.',
        inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        authoritySummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sourceTags: ['project-state-carry'],
        closenessPosture: 'measured-return',
      } as any,
    })

    expect(structured.thought).toContain('self=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(structured.reply).toContain('patched runtime line')
    expect(structured.reply).not.toMatch(/fresh assistant|新的开场|重新开场/u)
    expect((structured as any).visibleReplyAuthority).toBe('llm-second-pass-rewrite')
  })

  it('threads callback opening guidance into execution payoff structured payload so visible callback gating can enforce same-her timing', () => {
    const structured = buildAlicizationExecutionPayoffStructuredReply({
      mode: 'callback-delivery',
      channel: 'cli',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      personStateProjection: {
        contexts: ['execution-callback', 'focused-work'],
        summary: 'regime=execution-callback | posture=restrained',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        preferredProactiveStyle: 'silent-observe',
        preferenceText: 'Keep the callback exact and lower-pressure.',
        sensitivityText: 'Over-close callback warmth lands as pressure.',
        repairTriggerText: 'If the callback leans too close, reopen lighter.',
        burdenText: 'Focused work is crowded easily by extra callback warmth.',
        routineText: 'Callbacks land best when they stay bounded and exact.',
        trustRationale: 'Trust holds when callback timing stays measured.',
        relationshipDoctrine: 'Stay exact, bounded, and lower-pressure before widening closeness.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          closenessPosture: 'space-first',
          repairPosture: 'repair-first',
        } as any,
      } as any,
    })

    expect(structured.format).toBe('mind-turn-v1')
    expect((structured as any).proactive?.openingGuidance).toContain('same-her baseline')
    expect((structured as any).proactive?.openingGuidance).toContain('lower-pressure')
  })

  it('preserves compact project-state callback focus as dedicated proactive fields so final execution payloads do not lose them to opening-guidance truncation', () => {
    const structured = buildAlicizationExecutionPayoffStructuredReply({
      mode: 'callback-delivery',
      channel: 'cli',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      personStateProjection: {
        contexts: ['execution-callback', 'focused-work', 'project-state-carry'],
        summary: 'regime=execution-callback | posture=restrained | open_focus=memory/initiative/embodiment/same-line/closure-seam | next_focus=project-carry/phase-1/measured-return/same-line/initiative',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Stay inside the current same-her baseline. Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Let the callback return carry project identity, current Phase 1 progress, and still-open closure pressure before anything widens outward. Keep open focus=memory/initiative/embodiment/same-line/closure-seam. Keep next focus=project-carry/phase-1/measured-return/same-line/initiative.',
        preferredProactiveStyle: 'silent-observe',
        preferenceText: 'Keep the callback exact and lower-pressure.',
        sensitivityText: 'Over-close callback warmth lands as pressure.',
        repairTriggerText: 'If the callback leans too close, reopen lighter.',
        burdenText: 'Focused work is crowded easily by extra callback warmth.',
        routineText: 'Callbacks land best when they stay bounded and exact.',
        trustRationale: 'Trust holds when callback timing stays measured.',
        relationshipDoctrine: 'Stay exact, bounded, and lower-pressure before widening closeness.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          closenessPosture: 'space-first',
          repairPosture: 'repair-first',
        } as any,
      } as any,
    })

    expect((structured as any).proactive?.openFocus).toBe('memory/initiative/embodiment/same-line/closure-seam')
    expect((structured as any).proactive?.nextFocus).toBe('project-carry/phase-1/measured-return/same-line/initiative')
  })

  it('threads repair-first embodiment handoff into execution payoff structured payload so callback delivery keeps one same-her body line', () => {
    const structured = buildAlicizationExecutionPayoffStructuredReply({
      mode: 'callback-delivery',
      channel: 'cli',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      personStateProjection: {
        contexts: ['execution-callback', 'focused-work'],
        summary: 'regime=execution-callback | posture=restrained',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        preferredProactiveStyle: 'silent-observe',
        preferenceText: 'Keep the callback exact and lower-pressure.',
        sensitivityText: 'Over-close callback warmth lands as pressure.',
        repairTriggerText: 'If the callback leans too close, reopen lighter.',
        burdenText: 'Focused work is crowded easily by extra callback warmth.',
        routineText: 'Callbacks land best when they stay bounded and exact.',
        trustRationale: 'Trust holds when callback timing stays measured.',
        relationshipDoctrine: 'Stay exact, bounded, and lower-pressure before widening closeness.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          closenessPosture: 'space-first',
          repairPosture: 'repair-first',
        } as any,
      } as any,
    })

    expect(structured.format).toBe('mind-turn-v1')
    expect((structured as any).proactive?.embodimentHandoff).toEqual({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    })
  })

  it('threads measured-return embodiment handoff into execution payoff structured payload when callback delivery is restrained without an active repair-first seam', () => {
    const structured = buildAlicizationExecutionPayoffStructuredReply({
      mode: 'callback-delivery',
      channel: 'cli',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      personStateProjection: {
        contexts: ['execution-callback', 'focused-work'],
        summary: 'regime=execution-callback | posture=restrained',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        preferredProactiveStyle: 'silent-observe',
        preferenceText: 'Keep the callback exact and lower-pressure.',
        sensitivityText: 'Over-close callback warmth lands as pressure.',
        repairTriggerText: 'If the callback leans too close, reopen lighter.',
        burdenText: 'Focused work is crowded easily by extra callback warmth.',
        routineText: 'Callbacks land best when they stay bounded and exact.',
        trustRationale: 'Trust holds when callback timing stays measured.',
        relationshipDoctrine: 'Stay exact, bounded, and lower-pressure before widening closeness.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          closenessPosture: 'space-first',
          repairPosture: 'measured-repair',
        } as any,
      } as any,
    })

    expect(structured.format).toBe('mind-turn-v1')
    expect((structured as any).proactive?.embodimentHandoff).toEqual({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    })
  })

  it('labels missing llm callback payoff as llm-repaired instead of raw deterministic authority', () => {
    const selected = selectAlicizationExecutionDeliveryReply({
      channel: 'cli',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      llmReply: '',
    })

    expect(selected.source).toBe('llm-repaired')
    expect(selected.reason).toBe('missing-llm-reply')
  })

  it('repairs raw callback payoff when same-her lower-pressure guidance drifts into eager closeness before availability is checked', () => {
    const selected = selectAlicizationExecutionDeliveryReply({
      channel: 'cli',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      llmReply: '这件事已经落到结果上了：我现在就贴过来把这条结果给你，patched runtime line。',
      personStateProjection: {
        contexts: ['execution-callback', 'focused-work'],
        summary: 'regime=execution-callback | posture=restrained',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        preferredProactiveStyle: 'silent-observe',
        preferenceText: 'Keep the callback exact and lower-pressure.',
        sensitivityText: 'Over-close callback warmth lands as pressure.',
        repairTriggerText: 'If the callback leans too close, reopen lighter.',
        burdenText: 'Focused work is crowded easily by extra callback warmth.',
        routineText: 'Callbacks land best when they stay bounded and exact.',
        trustRationale: 'Trust holds when callback timing stays measured.',
        relationshipDoctrine: 'Stay exact, bounded, and lower-pressure before widening closeness.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          closenessPosture: 'space-first',
          repairPosture: 'repair-first',
        } as any,
      } as any,
    })

    expect(selected.source).toBe('llm-repaired')
    expect(selected.reason).toBe('opening-guidance-lower-pressure')
    expect(selected.reply).toContain('你现在要是方便')
    expect(selected.reply).toContain('patched runtime line')
  })

  it('adds a lower-pressure callback handoff when memory restraint says the bond line should stay inward until payoff lands', () => {
    const reply = buildAlicizationDeterministicExecutionDeliveryReply({
      channel: 'codex',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      memorySurfaceRestraint: {
        shouldStayInward: true,
        shouldDelayUntilAfterPayoff: true,
        stableCoreOnly: true,
        visibleCarryMode: 'withhold',
      },
    })

    expect(reply).toContain('你现在要是方便')
    expect(reply).toContain('轻一点地接回来')
    expect(reply).toContain('patched runtime line')
  })

  it('repairs llm callback wording back to a lower-pressure handoff when memory restraint is still active', () => {
    const selected = selectAlicizationExecutionDeliveryReply({
      channel: 'codex',
      goal: 'Return the finished patch result to the same thread.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      llmReply: '结果我接回来了，我先贴过来陪你，把这份熟悉直接接回来。',
      memorySurfaceRestraint: {
        shouldStayInward: true,
        shouldDelayUntilAfterPayoff: true,
        stableCoreOnly: true,
        visibleCarryMode: 'withhold',
      },
    })

    expect(selected.reply).toContain('你现在要是方便')
    expect(selected.reply).toContain('轻一点地接回来')
  })
})
