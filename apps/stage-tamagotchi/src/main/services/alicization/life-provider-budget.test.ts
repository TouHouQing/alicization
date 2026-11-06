import { describe, expect, it } from 'vitest'

import { boundLifeProviderRequest, lifeProviderOutputOptions, resolveLifeProviderRequestLimits } from './life-provider-budget'

describe('final life provider budget', () => {
  it('identifies oversized content kinds without logging private image bytes or user text', () => {
    let failure = ''
    try {
      boundLifeProviderRequest([{ role: 'user', content: [{ type: 'text', text: 'PRIVATE_QUESTION' }, { type: 'image_url', image_url: { url: `data:image/png;base64,PRIVATE_FRAME${'a'.repeat(6000)}` } }] }], [], { contextTokens: 4096, outputReserve: 1024, safetyReserve: 512 })
    }
    catch (error) { failure = String(error) }
    expect(failure).toContain('PROVIDER_CONTEXT_BUDGET_EXCEEDED')
    expect(failure).toContain('"kind":"image_url"')
    expect(failure).not.toContain('PRIVATE_FRAME')
    expect(failure).not.toContain('PRIVATE_QUESTION')
    expect(failure.length).toBeLessThan(1000)
  })
  it('continues a long current tool exchange through exact pageable receipts without dropping calls or life state', () => {
    const tools = [{ type: 'function', function: { name: 'life_read_tool_observation', parameters: { type: 'object' } } }]
    const messages = [
      { role: 'system' as const, content: 'The adopted identity and relationship remain authoritative.' },
      { role: 'user' as const, content: '检查这些日志并找出问题，保留原始任务。' },
      ...Array.from({ length: 6 }, (_, index) => [
        { role: 'assistant' as const, content: '', tool_calls: [{ id: `call-${index}`, type: 'function' as const, function: { name: 'read_log', arguments: JSON.stringify({ path: `log-${index}.txt` }) } }] },
        { role: 'tool' as const, tool_call_id: `call-${index}`, content: `log-${index}\n${'ordinary log detail 中文🙂\n'.repeat(300)}ERROR: exact failure ${index}` },
      ]).flat(),
    ]
    const original = structuredClone(messages)
    const result = boundLifeProviderRequest(messages, tools, { contextTokens: 16384, outputReserve: 1024, safetyReserve: 512 })
    expect(result.messages).toHaveLength(messages.length)
    expect(result.messages.slice(0, 2)).toEqual(messages.slice(0, 2))
    expect(result.report.droppedHistory).toEqual([])
    expect(result.report.compactedToolObservations?.length).toBeGreaterThan(0)
    for (let index = 2; index < result.messages.length; index += 2)
      expect(result.messages[index]).toEqual(messages[index])
    expect(result.report.afterTokens + result.report.toolTokens + 1536).toBeLessThanOrEqual(16384)
    expect(messages).toEqual(original)
  })
  it.each(['maxTokens', 'maxCompletionTokens'] as const)('reallocates a small overflow from output headroom while preserving all input and actual %s', (completionTokenField) => {
    const messages = [{ role: 'system' as const, content: 'Exact identity and source evidence 中文🙂'.repeat(45) }, { role: 'user' as const, content: '请写八百字，保留每个字和来源。' }]
    const tools = [{ type: 'function', function: { name: 'ordinary_execution', parameters: { type: 'object', properties: {} } } }]
    const initial = boundLifeProviderRequest(messages, tools).report
    const limits = { contextTokens: initial.beforeTokens + initial.toolTokens + 4096 + 1024 - 147, outputReserve: 4096, completionTokenField, contextSource: 'configured' as const }
    const options = { ...limits, allowOutputReserveReduction: true }
    expect(() => boundLifeProviderRequest(messages, tools, limits)).toThrow('PROVIDER_CONTEXT_BUDGET_EXCEEDED')
    const planned = boundLifeProviderRequest(messages, tools, options)
    expect(planned.messages).toEqual(messages)
    expect(planned.report).toMatchObject({ outputReserve: 3949, droppedHistory: [], outputReserveReduction: { requested: 4096, minimum: 2048, selected: 3949 } })
    expect(planned.report.afterTokens + planned.report.toolTokens + planned.report.outputReserve + planned.report.safetyReserve).toBe(limits.contextTokens)
    expect(lifeProviderOutputOptions({ ...limits, outputReserve: planned.report.outputReserve })).toEqual(completionTokenField === 'maxTokens' ? { maxTokens: 3949, maxCompletionTokens: undefined } : { maxTokens: undefined, maxCompletionTokens: 3949 })
  })
  it('refuses required context that cannot retain the minimum output allocation', () => {
    const messages = [{ role: 'system' as const, content: 'Current evidence must remain literal.'.repeat(90) }, { role: 'user' as const, content: 'Keep the whole request.' }]
    const initial = boundLifeProviderRequest(messages, []).report
    const options = { contextTokens: initial.beforeTokens + initial.toolTokens + 2048 + 1024 - 1, outputReserve: 4096, allowOutputReserveReduction: true }
    expect(() => boundLifeProviderRequest(messages, [], options)).toThrow('PROVIDER_CONTEXT_BUDGET_EXCEEDED')
  })
  it('keeps ordinary conversation and its whole recent dialogue by losslessly interning historical repetitions under pressure', () => {
    const repeated = 'A source-backed earlier painting afternoon, without inventing a new fact. '.repeat(8)
    const memory = { type: 'alicization-turn-memory-context', data: { workingMemory: { version: 'working-memory-owner-context-v1', owner: 'working-memory', current: { activeTask: 'write the requested scene' }, recentDialogue: [{ turnId: 'actual-past-turn', role: 'user', text: 'Keep every literal word from our recent conversation.' }], compressedTimeline: Array.from({ length: 5 }, (_, index) => ({ summary: `Actual distinct event ${index}`, thread: repeated, sourceTurnIds: [`actual-source-${index}`] })), corrections: [{ text: 'Keep this current correction' }], emotionalPosture: { summary: 'Continuous feeling' } }, longTermRecall: { evidence: [{ id: 'actual-proof', summary: 'Exact required proof' }] } } }
    const messages = [{ role: 'system' as const, content: 'Exact adopted identity' }, { role: 'system' as const, content: JSON.stringify(memory) }, { role: 'user' as const, content: '请写一篇雨天绘画散文，保留当前请求的每个字。' }]
    const costs = boundLifeProviderRequest(messages, []).report
    const result = boundLifeProviderRequest(messages, [], { contextTokens: costs.beforeTokens + costs.toolTokens + 512 + 1024 - 166, outputReserve: 512 })
    const projected = JSON.parse(String(result.messages[1].content))
    expect(projected.data.historicalTextDictionary.values).toEqual([repeated])
    expect(projected.data.workingMemory.recentDialogue).toEqual(memory.data.workingMemory.recentDialogue)
    expect(projected.data.workingMemory.current).toEqual(memory.data.workingMemory.current)
    expect(projected.data.workingMemory.corrections).toEqual(memory.data.workingMemory.corrections)
    expect(projected.data.longTermRecall).toEqual(memory.data.longTermRecall)
    expect(result.messages[0]).toEqual(messages[0])
    expect(result.messages.at(-1)).toEqual(messages.at(-1))
    expect(result.report.compactedHistoricalMemory).toBeUndefined()
    expect(result.report.deduplicatedHistoricalMemory).toHaveLength(1)
    expect(JSON.parse(String(messages[1].content))).toEqual(memory)
  })
  it('budgets decoded text without charging transport escaping while preserving every fact', () => {
    const fact = JSON.stringify({ path: 'C:\\Users\\AlicizationQA\\Documents\\note.txt', text: 'She said "keep this exact evidence".\nThen read it again.' }).repeat(60)
    const messages = [{ role: 'system' as const, content: fact }, { role: 'user' as const, content: 'Use all of the original evidence.' }]
    const limits = { contextTokens: new TextEncoder().encode(fact).byteLength + 1024, outputReserve: 256, safetyReserve: 256 }
    expect(new TextEncoder().encode(JSON.stringify(messages)).byteLength + 514).toBeGreaterThan(limits.contextTokens)
    const result = boundLifeProviderRequest(messages, [], limits)
    expect(result.messages).toEqual(messages)
    expect(result.report.droppedHistory).toEqual([])
    expect(result.report.afterTokens + result.report.toolTokens + 512).toBeLessThanOrEqual(limits.contextTokens)
  })

  it('still reserves complete tool-call metadata and structured content', () => {
    const limits = { contextTokens: 4096, outputReserve: 512, safetyReserve: 256 }
    const call = { id: 'required-call', type: 'function' as const, function: { name: 'read_file', arguments: JSON.stringify({ path: 'C:\\required\\'.repeat(400) }) } }
    expect(() => boundLifeProviderRequest([{ role: 'user', content: 'Keep the call' }, { role: 'assistant', content: 'Read it', tool_calls: [call] }], [], limits)).toThrow('PROVIDER_CONTEXT_BUDGET_EXCEEDED')
    expect(() => boundLifeProviderRequest([{ role: 'user', content: [{ type: 'text', text: 'required content'.repeat(500) }] }], [], limits)).toThrow('PROVIDER_CONTEXT_BUDGET_EXCEEDED')
  })

  it('fits a completed tool exchange by losslessly interning repeated historical text without removing its sources', () => {
    const repeated = 'An earlier explicitly accepted responsibility, with its original limits and uncertainty. '.repeat(6)
    const memory = { type: 'alicization-turn-memory-context', data: { workingMemory: { version: 'working-memory-owner-context-v1', owner: 'working-memory', current: { activeTask: 'the current request' }, recentDialogue: [], compressedTimeline: Array.from({ length: 6 }, (_, index) => ({ summary: `Different event ${index}`, sourceTurnIds: [`source-${index}`], thread: repeated, commitments: [repeated], corrections: [`Distinct correction ${index}`] })), corrections: [{ text: repeated, scope: 'session' }], emotionalPosture: { summary: 'current feeling' } }, longTermRecall: { evidence: [{ id: 'required-proof', summary: repeated }] } } }
    const messages = [{ role: 'system' as const, content: 'exact identity' }, { role: 'system' as const, content: JSON.stringify(memory) }, { role: 'user' as const, content: 'Keep the entire request and do not repeat the finished write.' }]
    const cost = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength
    const limits = { contextTokens: cost(messages) + 512 + 1024 + 32, outputReserve: 512, compactHistoricalDialogue: true }
    expect(boundLifeProviderRequest(messages, [], limits).messages).toEqual(messages)
    const exchange = [{ role: 'assistant' as const, content: 'Actual write call with its exact original arguments.'.repeat(20) }, { role: 'tool' as const, tool_call_id: 'write-once', content: JSON.stringify({ status: 'completed', receipt: 'observed bytes'.repeat(20) }) }]
    const result = boundLifeProviderRequest([...messages, ...exchange], [], limits)
    const projected = JSON.parse(String(result.messages[1].content))
    const dictionary = projected.data.historicalTextDictionary
    expect(dictionary.version).toBe('historical-text-dictionary-v2')
    const restore = (value: unknown): unknown => {
      if (Array.isArray(value))
        return value.map(restore)
      if (value && typeof value === 'object') {
        if ('h' in value && Object.keys(value).length === 1) {
          const ref = (value as { h: number | Array<string | number> }).h
          return typeof ref === 'number' ? dictionary.values[ref] : ref.map(item => typeof item === 'number' ? dictionary.values[item] : item).join('')
        }
        return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, restore(child)]))
      }
      return value
    }
    expect(restore(projected.data.workingMemory)).toEqual(memory.data.workingMemory)
    expect(projected.data.workingMemory.current).toEqual(memory.data.workingMemory.current)
    expect(projected.data.workingMemory.corrections).toEqual(memory.data.workingMemory.corrections)
    expect(projected.data.longTermRecall).toEqual(memory.data.longTermRecall)
    expect(result.messages.slice(-2)).toEqual(exchange)
    expect(JSON.parse(String(messages[1].content))).toEqual(memory)
    expect(result.report.deduplicatedHistoricalMemory).toEqual([{ index: 1, sourceHash: expect.stringMatching(/^[a-f\d]{64}$/u), dictionaryEntries: 1, references: 12, savedBytes: expect.any(Number) }])
    expect(result.report.afterTokens + result.report.toolTokens + 1536).toBeLessThanOrEqual(limits.contextTokens)
    expect(boundLifeProviderRequest([...messages, ...exchange], [], { ...limits, compactHistoricalDialogue: false })).toEqual(result)
  })
  it('compacts only redundant past dialogue for an explicit workflow while preserving current identity, posture and proof', () => {
    const memory = { type: 'alicization-turn-memory-context', data: { workingMemory: { version: 'working-memory-owner-context-v1', owner: 'working-memory', current: { activeTask: 'current duty' }, recentDialogue: [{ turnId: 'past-user', text: 'past dialogue'.repeat(400) }, { turnId: 'past-alice', text: 'earlier reply'.repeat(400) }], compressedTimeline: [{ summary: 'An earlier event', sourceTurnIds: ['past-user', 'past-alice'] }], corrections: [{ text: 'keep this correction' }], relationshipPosture: { summary: 'continuous trust' }, emotionalPosture: { summary: 'current feeling' } }, longTermRecall: { evidence: [{ id: 'required-source', summary: 'actual proof' }] } } }
    const messages = [{ role: 'system' as const, content: 'exact identity' }, { role: 'system' as const, content: JSON.stringify(memory) }, { role: 'user' as const, content: 'Entire new request' }]
    const limits = { contextTokens: 4096, outputReserve: 512, safetyReserve: 256 }
    expect(() => boundLifeProviderRequest(messages, [], limits)).toThrow('PROVIDER_CONTEXT_BUDGET_EXCEEDED')
    const result = boundLifeProviderRequest(messages, [], { ...limits, compactHistoricalDialogue: true })
    const projected = JSON.parse(result.messages[1].content as string)
    expect(projected).toEqual({ ...memory, data: { ...memory.data, workingMemory: { ...memory.data.workingMemory, recentDialogue: [] } } })
    expect(result.messages[0]).toEqual(messages[0])
    expect(result.messages[2]).toEqual(messages[2])
    expect(JSON.parse(messages[1].content)).toEqual(memory)
    expect(result.report.compactedHistoricalMemory).toEqual([{ index: 1, sourceHash: expect.stringMatching(/^[a-f\d]{64}$/u), omittedTurnIds: ['past-user', 'past-alice'] }])
    const required = [{ role: 'system' as const, content: JSON.stringify({ ...memory, data: { ...memory.data, longTermRecall: { evidence: [{ summary: 'required fact'.repeat(700) }] } } }) }, messages[2]]
    expect(() => boundLifeProviderRequest(required, [], { ...limits, compactHistoricalDialogue: true })).toThrow('PROVIDER_CONTEXT_BUDGET_EXCEEDED')
  })
  it('uses the same configured output cap for context reservation and exactly one real provider parameter', () => {
    const limits = resolveLifeProviderRequestLimits({ contextWindowTokens: 8192, maxOutputTokens: 1024, completionTokenField: 'maxCompletionTokens' })
    expect(limits).toMatchObject({ contextTokens: 8192, outputReserve: 1024, contextSource: 'configured' })
    expect(lifeProviderOutputOptions(limits)).toEqual({ maxCompletionTokens: 1024, maxTokens: undefined })
    expect(lifeProviderOutputOptions(resolveLifeProviderRequestLimits())).toEqual({ maxTokens: 4096, maxCompletionTokens: undefined })
    expect(() => resolveLifeProviderRequestLimits({ contextWindowTokens: 4096, maxOutputTokens: 4096 })).toThrow()
    expect(() => resolveLifeProviderRequestLimits({ completionTokenField: 'ignored-field' })).toThrow()
  })
  it('reserves schemas and output, removes complete old exchanges and preserves identity, evidence and the current input', () => {
    const current = '首先不能遗漏这个条件。'.repeat(30)
    const messages = [{ role: 'system' as const, content: 'SOUL exact identity' }, { role: 'user' as const, content: 'old'.repeat(1500) }, { role: 'assistant' as const, content: 'old result' }, { role: 'system' as const, content: JSON.stringify({ lifeRevision: 7, goal: 'unknown' }) }, { role: 'user' as const, content: current }]
    const result = boundLifeProviderRequest(messages, [{ parameters: { description: 'schema'.repeat(100) } }], { contextTokens: 4096, outputReserve: 512, safetyReserve: 256 })
    expect(result.messages).toEqual([messages[0], messages[3], messages[4]])
    expect(result.report.toolTokens).toBeGreaterThan(600)
    expect(result.report.afterTokens + result.report.toolTokens + 768).toBeLessThanOrEqual(4096)
    expect(result.report.droppedHistory).toHaveLength(2)
  })
  it('fails before generation when protected content cannot fit instead of truncating the start of the user request', () => {
    expect(() => boundLifeProviderRequest([{ role: 'system', content: 'identity' }, { role: 'user', content: '条件'.repeat(1000) }], [], { contextTokens: 4096, outputReserve: 512, safetyReserve: 256 })).toThrow('PROVIDER_CONTEXT_BUDGET_EXCEEDED')
  })
  it('identifies protected message sizes without exposing their contents', () => {
    try {
      boundLifeProviderRequest([{ role: 'system', content: 'PRIVATE_IDENTITY'.repeat(1000) }, { role: 'user', content: 'PRIVATE_REQUEST' }], [], { contextTokens: 4096, outputReserve: 512, safetyReserve: 256 })
      throw new Error('The protected request must exceed this budget')
    }
    catch (error) {
      expect(String(error)).toMatch(/budget=\d+, required=\d+, tools=\d+, messages=\[system#0=\d+,user#1=\d+\]/u)
      expect(String(error)).not.toContain('PRIVATE_IDENTITY')
      expect(String(error)).not.toContain('PRIVATE_REQUEST')
    }
  })
})
