import { expect, it } from 'vitest'

import { createEmptyWorkingMemorySnapshot, normalizeWorkingMemoryTurn } from './life-core/working-memory'
import { buildWorkingMemoryOwnerContext } from './life-core/working-memory-owner-context'
import { boundLifeProviderRequest } from './life-provider-budget'
import { buildAlicizationMainChatMemoryContext } from './main-chat-memory-context'

it('fits rich historical evidence into the inference budget without altering persisted life state or current literal input', () => {
  const snapshot = createEmptyWorkingMemorySnapshot({ cardId: 'alice', sessionId: 'home', now: 100 })
  snapshot.userCorrections = [{ text: '叫我小青，不要叫老板。', sourceTurnId: 't-0:user', scope: 'persona' }]
  snapshot.commitments = [{ text: '周末回顾那次旅行', sourceTurnId: 't-0:alice' }]
  snapshot.recentRawTurns = Array.from({ length: 24 }, (_, index) => normalizeWorkingMemoryTurn({ turnId: `t-${Math.floor(index / 2)}:${index % 2 ? 'alice' : 'user'}`, role: index % 2 ? 'alice' : 'user', text: `${'长篇的日常回忆没有句号'.repeat(300)}。但我最后说，不要叫我老板。`, createdAt: index, source: 'conversation-turn', visibility: 'user-visible', importance: 0.5 }))
  snapshot.compressedTimeline = Array.from({ length: 12 }, (_, index) => ({ id: `e-${index}`, sourceTurnIds: [`old-${index}:user`], summary: '旧的共同生活片段。'.repeat(160), thread: '共同生活', unresolvedQuestions: [], commitments: [], corrections: [], relationshipPosture: null, emotionalPosture: null, executionCarry: null, importance: 0.7, createdAt: index, evidence: Array.from({ length: 6 }, () => ({ turnId: `old-${index}:user`, role: 'user' as const, quote: '那次旅行的原始表述。'.repeat(50) })), method: 'extractive' as const }))
  const original = JSON.stringify(snapshot)
  const context = buildAlicizationMainChatMemoryContext({ workingMemory: buildWorkingMemoryOwnerContext(snapshot), workingMemorySnapshot: snapshot, longTermRecall: null })
  const envelope = JSON.parse(context.providerSystemBlock)
  expect(envelope.data.memoryProjection.afterBytes).toBeLessThanOrEqual(22_000)
  expect(context.workingMemory.corrections[0]?.text).toContain('小青')
  expect(context.workingMemory.commitments[0]).toContain('旅行')
  expect(JSON.stringify(snapshot)).toBe(original)
  const current = { role: 'user' as const, content: `完整的新请求 ${'literal-data '.repeat(600)} 结束。` }
  const bounded = boundLifeProviderRequest([{ role: 'system', content: context.providerSystemBlock }, current], [])
  expect(bounded.messages.at(-1)).toEqual(current)
})
