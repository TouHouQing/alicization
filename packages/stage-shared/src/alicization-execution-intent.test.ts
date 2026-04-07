import { describe, expect, it } from 'vitest'

import {
  collectAlicizationExecutionChannelMentions,
  detectAlicizationExecutionCapabilityInquiry,
  detectAlicizationExecutionRoutingIntent,
} from './alicization-execution-intent'

describe('alicization execution intent', () => {
  it('detects capability inquiries without routing them as execution', () => {
    const inquiry = detectAlicizationExecutionCapabilityInquiry('你能不能用 CLI 和 Codex？')
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '你能不能用 CLI 和 Codex？',
      capabilityInquiry: inquiry,
    })

    expect(inquiry.capabilityQuestion).toBe(true)
    expect(inquiry.mentionedChannels).toEqual(expect.arrayContaining(['cli', 'codex']))
    expect(routing).toBeNull()
  })

  it('routes explicit CLI execution requests with channel mentions', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '请用 CLI 执行 pnpm -F @proj-alicization/stage-tamagotchi typecheck',
    })

    expect(routing?.requestedChannels).toEqual(['cli'])
    expect(routing?.requiredToolNames).toEqual(['executor_run_cli'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['channel-mentioned', 'action-verb']))
  })

  it('defaults to CLI routing when action + command literal are present without explicit channel mention', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '帮我执行 `pnpm -F @proj-alicization/stage-tamagotchi typecheck`',
    })

    expect(routing?.requestedChannels).toEqual(['cli'])
    expect(routing?.requiredToolNames).toEqual(['executor_run_cli'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['command-literal', 'default-cli-from-command-literal']))
  })

  it('does not route when only command literal appears without action intent', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: 'pnpm -F @proj-alicization/stage-tamagotchi typecheck',
    })
    expect(routing).toBeNull()
  })

  it('routes explicit openclaw execution requests with channel mentions', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '请用 OpenClaw 帮我关闭当前屏幕上的弹窗',
    })

    expect(routing?.requestedChannels).toEqual(['openclaw'])
    expect(routing?.requiredToolNames).toEqual(['executor_run_openclaw'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['channel-mentioned', 'action-verb']))
  })

  it('collects extended channel mentions for capability focus', () => {
    const channels = collectAlicizationExecutionChannelMentions('你支持 OpenClaw、Browser 和桌面操作吗？')
    expect(channels).toEqual(expect.arrayContaining(['openclaw', 'browser', 'desktop']))
  })
})
