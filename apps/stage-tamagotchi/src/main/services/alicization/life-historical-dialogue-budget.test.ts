import { expect, it } from 'vitest'

import { compactLifeHistoricalMemory } from './life-historical-memory-compaction'
import { lifeProviderOutputOptions, planLifeProviderRequest } from './life-provider-budget'

function fixture() {
  const text = '窗外雨声细密，柔和的光落在画纸上，笔尖沿着浅浅的纹理慢慢走过。'.repeat(16)
  return { type: 'alicization-turn-memory-context', data: { workingMemory: { version: 'working-memory-owner-context-v1', owner: 'working-memory', current: { currentUserMove: '保留当前请求和人格' }, recentDialogue: [{ turnId: 'earlier-alice', role: 'alice', text, createdAt: 20 }], compressedTimeline: [{ summary: `她曾说：${text} 这是当时的景色。`, thread: '之前聊过的雨天', sourceTurnIds: ['earlier-user', 'earlier-alice'], commitments: [], corrections: [] }, { summary: `后来再次提起：${text} 这属于另一段记录。`, thread: '稍后的回忆', sourceTurnIds: ['later-user', 'later-alice'], commitments: [], corrections: [] }], corrections: [{ text: '当前修正保持原文' }], commitments: ['仍未完成的责任保持原文'] }, longTermRecall: { evidence: [{ id: 'current-source', text: '当前证据保持原文' }] } } }
}

function restore(content: string) {
  const projected = JSON.parse(content)
  const values = projected.data.historicalTextDictionary.values as string[]
  const literal = (value: unknown): string | unknown => {
    if (value && typeof value === 'object' && 'h' in value) {
      const ref = (value as { h: number | Array<string | number> }).h
      return typeof ref === 'number' ? values[ref] : ref.map(item => typeof item === 'number' ? values[item] : item).join('')
    }
    return value
  }
  const memory = projected.data.workingMemory
  memory.recentDialogue.forEach((turn: { text: unknown }) => turn.text = literal(turn.text))
  memory.compressedTimeline.forEach((episode: Record<string, unknown>) => {
    for (const key of ['summary', 'thread']) episode[key] = literal(episode[key])
    for (const key of ['commitments', 'corrections']) episode[key] = (episode[key] as unknown[]).map(literal)
  })
  delete projected.data.historicalTextDictionary
  return projected
}

it('losslessly shares a past reply embedded in different source-bound timeline statements', () => {
  const source = fixture()
  const original = JSON.stringify(source)
  const result = compactLifeHistoricalMemory(original)
  expect(result).not.toBeNull()
  expect(restore(result!.content)).toEqual(source)
  expect(JSON.stringify(source)).toBe(original)
  expect(result!.savedBytes).toBeGreaterThan(1000)
  const projected = JSON.parse(result!.content)
  expect(projected.data.workingMemory.current).toEqual(source.data.workingMemory.current)
  expect(projected.data.workingMemory.corrections).toEqual(source.data.workingMemory.corrections)
  expect(projected.data.longTermRecall).toEqual(source.data.longTermRecall)
})

it('fits long dialogue alongside the unchanged tools, identity, request and real output reserve', () => {
  const source = fixture()
  const messages = [{ role: 'system' as const, content: 'i'.repeat(19_000) }, { role: 'system' as const, content: JSON.stringify(source) }, { role: 'user' as const, content: '请写八百字散文，当前要求必须完整保留。' }]
  const tools = [{ type: 'function', function: { name: 'unchanged_operations', description: 't'.repeat(38_400), parameters: { type: 'object', additionalProperties: false } } }]
  const original = JSON.stringify({ messages, tools })
  const limits = { contextTokens: 65_536, outputReserve: 4096, completionTokenField: 'maxTokens' as const, contextSource: 'unknown-conservative-default' as const }
  const planned = planLifeProviderRequest(messages, tools, limits, { allowOutputReserveReduction: true })
  expect(planned.report.beforeTokens + planned.report.toolTokens + planned.report.safetyReserve + 2048).toBeGreaterThan(limits.contextTokens)
  expect(restore(String(planned.messages[1].content))).toEqual(source)
  expect(planned.messages[0]).toEqual(messages[0])
  expect(planned.messages.at(-1)).toEqual(messages.at(-1))
  expect(planned.report.outputReserve).toBeGreaterThanOrEqual(2048)
  expect(planned.report.afterTokens + planned.report.toolTokens + planned.report.outputReserve + planned.report.safetyReserve).toBeLessThanOrEqual(limits.contextTokens)
  expect(lifeProviderOutputOptions(planned.providerBudget)).toEqual({ maxTokens: planned.report.outputReserve, maxCompletionTokens: undefined })
  expect(JSON.stringify({ messages, tools })).toBe(original)
})
