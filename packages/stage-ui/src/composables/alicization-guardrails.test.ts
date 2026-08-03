import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import { applyPromptBudget, compactMessagesForPromptAssembly, sanitizeAssistantOutputForDisplay, sanitizeForRemoteModel } from './alicization-guardrails'

function fact(type: string, data: unknown) {
  return JSON.stringify({ type, data })
}

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
    expect(JSON.parse(String(nextMessages[0]?.content))).toMatchObject({
      type: 'alicization-soul-overflow',
    })
    expect(JSON.parse(String(nextMessages[1]?.content ?? ''))).toEqual({
      type: 'alicization-prompt-budget-state',
      data: {
        reason: 'soul-overflow',
        memoryIncluded: true,
        historyIncluded: false,
      },
    })
    expect(String(nextMessages[1]?.content ?? '')).not.toMatch(/Output contract|Response contract|strict JSON/iu)

    const currentTurn = nextMessages.at(-1)
    expect(currentTurn?.role).toBe('user')
    expect(typeof currentTurn?.content === 'string' ? currentTurn.content : JSON.stringify(currentTurn?.content)).toContain('修复登录流程')
  })

  it('protects the typed WorkingMemory context as the memory section under token pressure', () => {
    const memoryContext = JSON.stringify({
      type: 'alicization-turn-memory-context',
      data: {
        version: 'alicization-main-chat-memory-context-v1',
        workingMemory: {
          version: 'working-memory-owner-context-v1',
          owner: 'working-memory',
          unresolvedQuestions: ['继续追踪压缩后的问题'],
          commitments: ['保留当前任务'],
          corrections: [{ text: '保留用户纠正', scope: 'reply' }],
          relationshipPosture: { summary: '保持连续关系', source: 'conversation-state' },
          emotionalPosture: { summary: '当前专注', source: 'conscious-frame' },
          executionState: { summary: '没有待完成执行', source: 'execution-ledger' },
        },
        longTermRecall: null,
      },
    })
    const result = applyPromptBudget([
      { role: 'system', content: '人格锚点'.repeat(100) },
      { role: 'system', content: memoryContext },
      { role: 'assistant', content: '旧历史'.repeat(900) },
      { role: 'user', content: '保留当前用户回合：继续处理短期记忆。' },
    ], {
      totalTokens: 900,
    })

    const memoryMessage = result.messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('"type":"alicization-turn-memory-context"'),
    )

    expect(memoryMessage).toBeTruthy()
    expect(result.report.sections.memory.afterTokens).toBeGreaterThan(0)
    expect(result.report.totalAfterTokens).toBeLessThanOrEqual(900)
    expect(JSON.parse(String(memoryMessage?.content))).toMatchObject({
      type: 'alicization-turn-memory-context',
    })
    expect(result.report.anchorPreserved).toBe(true)
    expect(JSON.stringify(result.messages)).toContain('继续处理短期记忆')
    expect(JSON.stringify(result.messages)).not.toMatch(/Output contract|Response contract|strict JSON/iu)
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
      const budgeted = applyPromptBudget([
        { role: 'system', content: soul },
        {
          role: 'system',
          content: fact('alicization-host', {
            name: '主人',
          }),
        },
        { role: 'assistant', content: '历史对话'.repeat(120) },
        { role: 'user', content: `第 ${round} 轮：请记住我喜欢咖啡。` },
      ], {
        totalTokens: 1024,
      })
      const runtimeMessage = budgeted.messages.find((message, index) => index !== 0 && message.role === 'system')

      expect(budgeted.messages[0]?.role).toBe('system')
      expect(String(budgeted.messages[0]?.content)).toBe(soul)
      expect(budgeted.report.anchorPreserved).toBe(true)
      expect(budgeted.report.totalAfterTokens).toBeLessThanOrEqual(1024)
      expect(String(runtimeMessage?.content ?? '')).not.toMatch(/Output contract|Response contract|strict JSON/iu)
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

  it('compacts runtime sensory data without removing following runtime facts', () => {
    const messages: Message[] = [
      { role: 'system', content: '# SOUL' },
      {
        role: 'system',
        content: [
          fact('alicization-sensory-context', {
            source: 'desktop',
            content: 'battery=20%,cpu=35%,memory=66%,'.repeat(120),
          }),
          fact('runtime-facts', {
            mode: 'desktop',
          }),
        ].join('\n\n'),
      },
      { role: 'user', content: '继续' },
    ]

    const { messages: nextMessages, report } = applyPromptBudget(messages, { totalTokens: 900 })
    const runtimeSystem = String(nextMessages[1]?.content ?? '')

    expect(report.sections.sensory.beforeTokens).toBeGreaterThan(0)
    expect(report.sections.sensory.afterTokens).toBeLessThanOrEqual(report.sections.sensory.beforeTokens)
    expect(runtimeSystem).toContain('"type":"runtime-facts"')
    expect(runtimeSystem).toContain('"degraded":true')
    expect(runtimeSystem).not.toMatch(/Output contract|Response contract|strict JSON/iu)
  })

  it('keeps runtime system message protected under extreme budget pressure', () => {
    const runtime = [
      fact('alicization-sensory-context', {
        source: 'desktop',
        content: 'time=2026-03-11 10:00:00,battery=20%,cpu=35%,memory=66%,location=desktop-host,'.repeat(80),
      }),
      fact('runtime-facts', {
        mode: 'desktop',
      }),
    ].join('\n\n')

    const { messages: nextMessages, report } = applyPromptBudget([
      { role: 'system', content: '# SOUL' },
      { role: 'system', content: runtime },
      { role: 'assistant', content: 'history'.repeat(600) },
      { role: 'assistant', content: 'history'.repeat(600) },
      { role: 'user', content: '请继续回答。' },
    ], { totalTokens: 520 })

    const runtimeSystem = nextMessages.find((message, index) => index !== 0 && message.role === 'system')
    expect(runtimeSystem).toBeTruthy()
    expect(String(runtimeSystem?.content ?? '')).toContain('"type":"runtime-facts"')
    expect(String(runtimeSystem?.content ?? '')).not.toMatch(/Output contract|Response contract|strict JSON/iu)
    expect(report.runtimeContractAnchorRecovered).toBe(false)
  })

  it('does not append a natural-language response contract when runtime context lacks one', () => {
    const runtimeWithoutAnchor = fact('alicization-sensory-context', {
      source: 'desktop',
      content: 'time=2026-03-11 10:00:00,battery=20%,cpu=35%,memory=66%',
    })

    const { messages: nextMessages, report } = applyPromptBudget([
      { role: 'system', content: '# SOUL' },
      { role: 'system', content: runtimeWithoutAnchor },
      { role: 'user', content: '继续' },
    ], { totalTokens: 900 })

    const runtimeSystem = String(nextMessages[1]?.content ?? '')
    expect(report.runtimeContractAnchorRecovered).toBe(false)
    expect(runtimeSystem).not.toMatch(/Output contract|Response contract|Return (?:exactly )?one strict JSON/iu)
  })

  it('keeps SOUL anchor untouched under sensory-heavy runtime pressure', () => {
    const soul = '---\n{"profile":{"alicizationName":"Alicization"}}\n---\n# SOUL\n人格锚点'
    const runtime = [
      fact('alicization-sensory-context', {
        source: 'desktop',
        content: 'battery=19%,cpu=88%,memory=91%,'.repeat(220),
      }),
      fact('runtime-facts', {
        mode: 'desktop',
      }),
    ].join('\n\n')

    const { messages: nextMessages, report } = applyPromptBudget([
      { role: 'system', content: soul },
      { role: 'system', content: runtime },
      { role: 'user', content: '继续' },
    ], { totalTokens: 700 })

    expect(report.safeMode.activated).toBe(false)
    expect(report.anchorPreserved).toBe(true)
    expect(String(nextMessages[0]?.content)).toBe(soul)
    expect(String(nextMessages[1]?.content)).toContain('"type":"runtime-facts"')
    expect(String(nextMessages[1]?.content)).not.toMatch(/Output contract|Response contract|strict JSON/iu)
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
