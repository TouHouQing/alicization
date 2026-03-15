import { describe, expect, it } from 'vitest'

import { detectRealtimeQueryIntent, evaluateRealtimeQueryToolCoverage, runRealtimeQueryPreflight } from './alicization-realtime-query'

describe('alicization realtime query', () => {
  it('detects realtime news intent from user sample', () => {
    const intent = detectRealtimeQueryIntent('帮我查一下今天美国发生了什么')

    expect(intent.needsRealtime).toBe(true)
    expect(intent.hasTimeSignal).toBe(true)
    expect(intent.categories).toContain('news')
  })

  it('blocks realtime preflight when there are no tools', () => {
    const intent = detectRealtimeQueryIntent('今天美国发生了什么')
    const result = evaluateRealtimeQueryToolCoverage(intent, [])

    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('no-tools')
  })

  it('allows realtime preflight when a matching tool exists', () => {
    const intent = detectRealtimeQueryIntent('今天美国发生了什么')
    const result = evaluateRealtimeQueryToolCoverage(intent, [
      {
        serverName: 'current_events',
        name: 'current_events::get_recent_events',
        toolName: 'get_recent_events',
        description: 'Get latest news',
        inputSchema: {},
      },
    ])

    expect(result.allowed).toBe(true)
    expect(result.reason).toBe('ok')
    expect(result.matchedCategories).toContain('news')
  })

  it('returns timeout reason when listTools does not complete in time', async () => {
    const intent = detectRealtimeQueryIntent('今天美国发生了什么')

    const result = await runRealtimeQueryPreflight({
      intent,
      timeoutMs: 10,
      listTools: async () => {
        await new Promise(resolve => setTimeout(resolve, 30))
        return []
      },
    })

    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('list-tools-timeout')
  })
})
