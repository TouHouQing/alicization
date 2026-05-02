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

  it('keeps deterministic callback structured payload on mind-turn-v1 instead of a separate callback-only surface', () => {
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
    expect((structured as any).visibleReplyAuthority).toBe('governed-repair-fallback')
  })

  it('labels missing llm callback payoff as governed repair fallback instead of raw deterministic authority', () => {
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
})
