import { describe, expect, it } from 'vitest'

import {
  buildAlicizationDeterministicExecutionDeliveryReply,
  buildAlicizationExecutionPayoffPrompt,
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
    expect(reply).toMatch(/有结果|落到结果|收束成结果|做完/u)
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
    expect(reply).toMatch(/跑出去|拦住|失败/u)
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
  })
})
