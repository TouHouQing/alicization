import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import { applyPromptBudget, compactMessagesForPromptAssembly, sanitizeAssistantOutputForDisplay, sanitizeForRemoteModel } from './alicization-guardrails'
import { composeAlicizationPromptMessages } from './alicization-prompt-composer'

describe('alicization guardrails', () => {
  it('redacts sensitive values before outbound model call', () => {
    const messages: Message[] = [
      { role: 'system', content: 'SOUL prompt' },
      {
        role: 'user',
        content: 'api_key=secret1234 token=tok_abcdef sk-1234567890123456789012345',
      },
    ]

    const sanitized = sanitizeForRemoteModel(messages)

    expect(sanitized.blocked).toBe(false)
    expect(sanitized.redactions).toBeGreaterThan(0)
    expect(JSON.stringify(sanitized.messages)).toContain('[REDACTED]')
  })

  it('keeps image parts while sanitizing text parts', () => {
    const sanitized = sanitizeForRemoteModel([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'password=abc123' },
          { type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } },
        ],
      },
    ])

    expect(sanitized.blocked).toBe(false)
    const serialized = JSON.stringify(sanitized.messages[0]?.content)
    expect(serialized).toContain('[REDACTED]')
    expect(serialized).toContain('image_url')
  })

  it('blocks outbound request on sanitize timeout', () => {
    const hugeText = 'token=abc123 '.repeat(8000)
    const sanitized = sanitizeForRemoteModel([
      { role: 'user', content: hugeText },
    ], {
      timeBudgetMs: 0,
      chunkSize: 32,
    })

    expect(sanitized.blocked).toBe(true)
    expect(sanitized.reason).toBe('sanitize-timeout')
  })

  it('compacts stale dialogue history before prompt composition while keeping the recent tail', () => {
    const messages: Message[] = Array.from({ length: 12 }).flatMap((_, index) => ([
      { role: 'user', content: `用户第 ${index + 1} 轮问题：${'旧上下文 '.repeat(20)}` },
      { role: 'assistant', content: `助手第 ${index + 1} 轮回答：${'旧回答 '.repeat(20)}` },
    ]))

    const compacted = compactMessagesForPromptAssembly(messages, {
      maxRecentUserTurns: 4,
      maxMessages: 10,
      totalDialogueTokens: 900,
    })

    expect(compacted.report.afterCount).toBeLessThan(compacted.report.beforeCount)
    expect(compacted.report.retainedUserTurns).toBeLessThanOrEqual(4)
    expect(JSON.stringify(compacted.messages)).toContain('用户第 12 轮问题')
    expect(JSON.stringify(compacted.messages)).not.toContain('用户第 1 轮问题')
  })

  it('keeps the latest repair turn bundle protected during prompt assembly compaction', () => {
    const messages: Message[] = [
      { role: 'assistant', content: '很早之前的闲聊'.repeat(80) },
      { role: 'user', content: '继续'.repeat(80) },
      { role: 'assistant', content: '上一次我看错了浏览器页面。'.repeat(30) },
      { role: 'user', content: '不是这个，重新看我现在的 diff'.repeat(30) },
      { role: 'assistant', content: '收到，我重新以当前画面为准。'.repeat(30) },
      { role: 'user', content: '只看现在这个窗口'.repeat(30) },
    ]

    const compacted = compactMessagesForPromptAssembly(messages, {
      maxRecentUserTurns: 2,
      maxMessages: 4,
      totalDialogueTokens: 260,
    })

    const serialized = JSON.stringify(compacted.messages)
    expect(serialized).toContain('重新看我现在的 diff')
    expect(serialized).toContain('只看现在这个窗口')
    expect(compacted.messages.at(-1)?.role).toBe('user')
  })

  it('applies section budgets and keeps current user turn', () => {
    const messages: Message[] = [
      {
        role: 'system',
        content: 'SOUL'.repeat(1200),
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: [
              'Relevant memory facts:',
              '- user likes coffee (confidence=0.91)',
              '- user dislikes bugs (confidence=0.23)',
              '- user plan ship release (confidence=0.45)',
            ].join('\n'),
          },
        ],
      },
      {
        role: 'assistant',
        content: 'history'.repeat(900),
      },
      {
        role: 'user',
        content: '请保留这一轮关键指令：修复登录流程并写测试。'.repeat(100),
      },
    ]

    const { messages: nextMessages, report } = applyPromptBudget(messages, { totalTokens: 600 })

    expect(report.truncated).toBe(true)
    expect(report.totalAfterTokens).toBeLessThanOrEqual(600)
    expect(report.safeMode.activated).toBe(true)
    expect(String(nextMessages[0]?.content)).toContain('# Alicization SOUL (SAFE MODE)')
    expect(String(nextMessages[1]?.content ?? '')).toContain('Output contract: You must output JSON with { thought, emotion, reply, performance }')

    const currentTurn = nextMessages.at(-1)
    expect(currentTurn?.role).toBe('user')
    expect(typeof currentTurn?.content === 'string' ? currentTurn.content : JSON.stringify(currentTurn?.content)).toContain('修复登录流程')
  })

  it('keeps system[0] soul anchor unchanged across 10k budget rounds', () => {
    const soul = [
      '---',
      JSON.stringify({
        schemaVersion: 1,
        initialized: true,
        profile: {
          ownerName: '主人',
          hostName: '主人',
          alicizationName: 'Alicization',
        },
      }),
      '---',
      '# SOUL',
      '你是 Alicization，始终保持温柔、克制、诚实。',
    ].join('\n')

    for (let round = 0; round < 10_000; round += 1) {
      const composed = composeAlicizationPromptMessages({
        messages: [
          { role: 'assistant', content: '历史对话'.repeat(120) },
          { role: 'user', content: `第 ${round} 轮：请记住我喜欢咖啡。` },
        ],
        soulContent: soul,
        hostName: '主人',
        contextsSnapshot: {},
      })
      const budgeted = applyPromptBudget(composed.messages, {
        totalTokens: 1024,
      })
      const runtimeMessage = budgeted.messages.find((message, index) => index !== 0 && message.role === 'system')

      expect(budgeted.messages[0]?.role).toBe('system')
      expect(String(budgeted.messages[0]?.content)).toBe(soul)
      expect(budgeted.report.anchorPreserved).toBe(true)
      expect(budgeted.report.totalAfterTokens).toBeLessThanOrEqual(1024)
      expect(String(runtimeMessage?.content ?? '')).toContain('Output contract (must-follow, highest priority):')
    }
  })

  it('keeps soul anchor untouched when under budget and truncates history first', () => {
    const soul = '---\n{"profile":{"alicizationName":"Alicization"}}\n---\n# SOUL\n核心人格设定'
    const messages: Message[] = [
      { role: 'system', content: soul },
      { role: 'system', content: 'runtime constraints' },
      { role: 'assistant', content: 'history'.repeat(1200) },
      { role: 'user', content: '保留当前需求：修复登录 token 刷新' },
    ]

    const { messages: nextMessages, report } = applyPromptBudget(messages, { totalTokens: 900 })

    expect(report.safeMode.activated).toBe(false)
    expect(report.anchorPreserved).toBe(true)
    expect(String(nextMessages[0]?.content)).toBe(soul)
    expect(report.totalAfterTokens).toBeLessThanOrEqual(900)
  })

  it('compacts runtime sensory section without removing structured contract anchor', () => {
    const messages: Message[] = [
      { role: 'system', content: '# SOUL' },
      {
        role: 'system',
        content: [
          'Current sensory state:',
          '[System Context: Sensory], '.concat('battery=20%,cpu=35%,memory=66%,'.repeat(120)),
          '',
          'Output contract (must-follow, highest priority):',
          '- Return exactly one strict JSON object with keys: thought, emotion, reply, performance.',
          '- No markdown fences, no extra keys, no prose outside JSON.',
        ].join('\n'),
      },
      { role: 'user', content: '继续' },
    ]

    const { messages: nextMessages, report } = applyPromptBudget(messages, { totalTokens: 900 })
    const runtimeSystem = String(nextMessages[1]?.content ?? '')

    expect(report.sections.sensory.beforeTokens).toBeGreaterThan(0)
    expect(report.sections.sensory.afterTokens).toBeLessThanOrEqual(report.sections.sensory.beforeTokens)
    expect(runtimeSystem).toContain('Output contract (must-follow, highest priority):')
  })

  it('keeps runtime system message protected under extreme budget pressure', () => {
    const runtime = [
      'Current sensory state:',
      '[System Context: Sensory], time=2026-03-11 10:00:00,battery=20%,cpu=35%,memory=66%,location=desktop-host,'.repeat(80),
      '',
      'Output contract (must-follow, highest priority):',
      '- Return exactly one strict JSON object with keys: thought, emotion, reply, performance.',
      '- No markdown fences, no extra keys, no prose outside JSON.',
    ].join('\n')

    const { messages: nextMessages, report } = applyPromptBudget([
      { role: 'system', content: '# SOUL' },
      { role: 'system', content: runtime },
      { role: 'assistant', content: 'history'.repeat(600) },
      { role: 'assistant', content: 'history'.repeat(600) },
      { role: 'user', content: '请继续回答。' },
    ], { totalTokens: 520 })

    const runtimeSystem = nextMessages.find((message, index) => index !== 0 && message.role === 'system')
    expect(runtimeSystem).toBeTruthy()
    expect(String(runtimeSystem?.content ?? '')).toContain('Output contract (must-follow, highest priority):')
    expect(report.runtimeContractAnchorRecovered).toBe(false)
  })

  it('recovers runtime contract anchor when it is unexpectedly missing', () => {
    const runtimeWithoutAnchor = [
      'Current sensory state:',
      '[System Context: Sensory], time=2026-03-11 10:00:00,battery=20%,cpu=35%,memory=66%',
    ].join('\n')

    const { messages: nextMessages, report } = applyPromptBudget([
      { role: 'system', content: '# SOUL' },
      { role: 'system', content: runtimeWithoutAnchor },
      { role: 'user', content: '继续' },
    ], { totalTokens: 900 })

    const runtimeSystem = String(nextMessages[1]?.content ?? '')
    expect(report.runtimeContractAnchorRecovered).toBe(true)
    expect(runtimeSystem).toContain('Output contract (must-follow, highest priority):')
  })

  it('keeps SOUL anchor untouched under sensory-heavy runtime pressure', () => {
    const soul = '---\n{"profile":{"alicizationName":"Alicization"}}\n---\n# SOUL\n人格锚点'
    const runtime = [
      'Current sensory state:',
      '[System Context: Sensory], '.concat('battery=19%,cpu=88%,memory=91%,'.repeat(220)),
      '',
      'Output contract (must-follow, highest priority):',
      '- Return exactly one strict JSON object with keys: thought, emotion, reply, performance.',
      '- No markdown fences, no extra keys, no prose outside JSON.',
    ].join('\n')

    const { messages: nextMessages, report } = applyPromptBudget([
      { role: 'system', content: soul },
      { role: 'system', content: runtime },
      { role: 'user', content: '继续' },
    ], { totalTokens: 700 })

    expect(report.safeMode.activated).toBe(false)
    expect(report.anchorPreserved).toBe(true)
    expect(String(nextMessages[0]?.content)).toBe(soul)
    expect(String(nextMessages[1]?.content)).toContain('Output contract (must-follow, highest priority):')
    expect(report.sections.sensory.afterTokens).toBeLessThanOrEqual(report.sections.sensory.beforeTokens)
  })

  it('removes leaked mcp tool payload text from assistant output', () => {
    const leaked = [
      '{"name":"mcp_call_tool","arguments":{"name":"weather::get_weather","parameters":[{"name":"location","value":"United States"}],"toolbench_rapidapi_key":"secret-key"}}',
      'mcp_call_tool',
    ].join('\n')

    const sanitized = sanitizeAssistantOutputForDisplay(leaked)

    expect(sanitized.leakDetected).toBe(true)
    expect(sanitized.removedCount).toBeGreaterThan(0)
    expect(sanitized.redactedSecrets).toBeGreaterThan(0)
    expect(sanitized.cleanText).toBe('')
    expect(sanitized.cleanText).not.toContain('mcp_call_tool')
    expect(sanitized.cleanText).not.toContain('toolbench_rapidapi_key')
  })

  it('keeps natural language content while dropping leaked tool fragments', () => {
    const mixed = [
      '今天美国有几件值得关注的新闻：',
      '{"name":"mcp_call_tool","arguments":{"name":"current_events::get_recent_events","parameters":[{"name":"location","value":"UnitedStates"}]}}',
      '1. 国会预算谈判继续推进。',
    ].join('\n')

    const sanitized = sanitizeAssistantOutputForDisplay(mixed)

    expect(sanitized.leakDetected).toBe(true)
    expect(sanitized.cleanText).toContain('今天美国有几件值得关注的新闻')
    expect(sanitized.cleanText).toContain('1. 国会预算谈判继续推进。')
    expect(sanitized.cleanText).not.toContain('mcp_call_tool')
    expect(sanitized.cleanText).not.toContain('current_events::get_recent_events')
  })

  it('returns leakDetected with empty clean text for pure internal call output', () => {
    const onlyLeak = 'mcp_list_tools {"arguments":{"parameters":[{"name":"location","value":"US"}]}}'
    const sanitized = sanitizeAssistantOutputForDisplay(onlyLeak)

    expect(sanitized.leakDetected).toBe(true)
    expect(sanitized.cleanText).toBe('')
  })

  it('detects fabricated api execution snippets in realtime strict mode', () => {
    const fabricated = '好的，让我帮您查一下今天美国发生了什么。pythonimportrequestsdefget_recent_events(location):url=f"https://api.example.com/events?location={location}"我正在调用一个假设的API，请稍等一下，我会返回具体的信息。'
    const sanitized = sanitizeAssistantOutputForDisplay(fabricated, {
      realtimeIntent: true,
      verifiedToolResult: false,
    })

    expect(sanitized.fabricationDetected).toBe(true)
    expect(sanitized.fabricationRemovedCount).toBeGreaterThan(0)
    expect(sanitized.cleanText).toBe('')
  })

  it('keeps non-fabricated summary while dropping wait promises in realtime strict mode', () => {
    const mixed = [
      '我查到今天美国有三条值得关注的事件。',
      '请稍等一下，我会返回具体的信息。',
    ].join('\n')

    const sanitized = sanitizeAssistantOutputForDisplay(mixed, {
      realtimeIntent: true,
      verifiedToolResult: false,
    })

    expect(sanitized.fabricationDetected).toBe(true)
    expect(sanitized.cleanText).toContain('三条值得关注的事件')
    expect(sanitized.cleanText).not.toContain('请稍等')
  })
})
