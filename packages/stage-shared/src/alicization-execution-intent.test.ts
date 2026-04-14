import { describe, expect, it } from 'vitest'

import {
  analyzeAlicizationExecutionTurnAuthority,
  collectAlicizationExecutionChannelMentions,
  detectAlicizationExecutionCapabilityInquiry,
  detectAlicizationExecutionRoutingIntent,
  hasExplicitAlicizationExecutionDemand,
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
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['channel-mentioned', 'action-verb', 'request-frame']))
  })

  it('routes colloquial Chinese CLI requests that use 找一下 phrasing', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '用cli帮我找一下桌面有什么文件',
    })

    expect(routing?.requestedChannels).toEqual(['cli'])
    expect(routing?.requiredToolNames).toEqual(['executor_run_cli'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['channel-mentioned', 'action-verb', 'request-frame']))
  })

  it('routes channel-directed imperative phrasing without relying on action verb dictionary', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: 'Use Claude Code to continue the runtime refactor.',
    })

    expect(routing?.requestedChannels).toEqual(['claude-code'])
    expect(routing?.requiredToolNames).toEqual(['executor_run_claude_code'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['channel-mentioned', 'request-frame', 'semantic-execution-signal']))
  })

  it('defaults to CLI routing when action + command literal are present without explicit channel mention', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '帮我执行 `pnpm -F @proj-alicization/stage-tamagotchi typecheck`',
    })

    expect(routing?.requestedChannels).toEqual(['cli'])
    expect(routing?.requiredToolNames).toEqual(['executor_run_cli'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['command-literal', 'default-cli-from-command-structure']))
  })

  it('does not route when only command literal appears without action intent', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: 'pnpm -F @proj-alicization/stage-tamagotchi typecheck',
    })
    expect(routing).toBeNull()
  })

  it('does not route plain channel mention without request semantics', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: 'CLI 最近看起来不太稳定。',
    })
    expect(routing).toBeNull()
  })

  it('distinguishes explicit execution demand from capability questions', () => {
    const capabilitySignals = analyzeAlicizationExecutionTurnAuthority('你能不能用 CLI 和 Codex？')
    const executionSignals = analyzeAlicizationExecutionTurnAuthority('用 cli 命令帮我查一下桌面有什么文件')

    expect(hasExplicitAlicizationExecutionDemand(capabilitySignals.semanticSignals)).toBe(false)
    expect(capabilitySignals.executionBound).toBe(false)
    expect(hasExplicitAlicizationExecutionDemand(executionSignals.semanticSignals)).toBe(true)
    expect(executionSignals.executionBound).toBe(true)
    expect(executionSignals.reasonCodes).toEqual(expect.arrayContaining([
      'execution-bound-turn',
      'explicit-execution-demand',
      'mentioned-dispatch:cli',
    ]))
  })

  it('keeps an imperative fallback path when semantic execution scoring misses', () => {
    const authority = analyzeAlicizationExecutionTurnAuthority('麻烦你帮我重构一下这个模块')

    expect(authority.semanticSignals.hasExecutionSignal).toBe(false)
    expect(authority.fallbackImperative).toBe(true)
    expect(authority.executionBound).toBe(true)
    expect(authority.reasonCodes).toContain('fallback-imperative-request')
  })

  it('routes explicit openclaw execution requests with channel mentions', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '请用 OpenClaw 帮我关闭当前屏幕上的弹窗',
    })

    expect(routing?.requestedChannels).toEqual(['openclaw'])
    expect(routing?.requiredToolNames).toEqual(['executor_run_openclaw'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['channel-mentioned', 'action-verb', 'request-frame']))
  })

  it('collects extended channel mentions for capability focus', () => {
    const channels = collectAlicizationExecutionChannelMentions('你支持 OpenClaw、Browser 和桌面操作吗？')
    expect(channels).toEqual(expect.arrayContaining(['openclaw', 'browser', 'desktop']))
  })
})
