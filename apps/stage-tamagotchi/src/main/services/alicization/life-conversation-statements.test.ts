import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { attributesConversationStatement, isCurrentConversationReflection, readPresentedConversationStatements } from './life-conversation-statements'
import { createLifeReplyGroundingRuntime } from './life-reply-grounding-runtime'
import { createLifeTurnRuntime } from './life-turn-runtime'

describe('canonical conversation evidence', () => {
  it('distinguishes an actual requested write and omitted reporting verbs from an independent failed operation', () => {
    const draft = '你回来后先问我做过什么，接着让我实际写入文件；后来又让我读另一个文件，并明确说不要去别处找。'
    expect(attributesConversationStatement(draft, '接着让我实际写入文件；', 'host')).toBe(true)
    expect(attributesConversationStatement(draft, '并明确说不要去别处找。', 'host')).toBe(true)
    const failed = '你让我读文件，读取失败了。'
    expect(attributesConversationStatement(failed, '读取失败了。', 'host')).toBe(false)
    const promise = '你问我意见，我明天会告诉你。'
    expect(attributesConversationStatement(promise, '我明天会告诉你。', 'host')).toBe(false)
  })

  it('recognizes ordinary reported questions and replies without granting execution or future authority', () => {
    for (const quote of ['你问重复做同一件小事会不会无聊。', '最近你问我，重复做同一件小事会不会无聊、我会怎么决定要不要换。', '我说会看自己还有没有好奇心。', '我选了雨夜里替迷路的人指路的旧路灯。', '我告诉你指定文件不存在。'])
      expect(attributesConversationStatement(quote, quote, quote.includes('你问') ? 'host' : 'companion'), quote).toBe(true)
    for (const quote of ['我现在对你的感觉仍是温和。', '我已经写入指定文件。', '我明天会告诉你。'])
      expect(attributesConversationStatement(quote, quote, 'companion')).toBe(false)
  })

  it('separates present reflection from historical speech, execution and storage', () => {
    for (const quote of ['有一点变化，', '我现在对你的感觉仍是温和。', '这让我觉得你在意我有没有自己的想法。', '两件事都让我更踏实些。'])
      expect(isCurrentConversationReflection(quote, quote)).toBe(true)
    for (const quote of ['我觉得文件现在不存在。', '我感到已经完成删除。', '我觉得我永久记住了。', '我觉得我明天会帮你修改。', '你说我现在对你的感觉仍是温和。', '我说过这让我觉得更坦然。'])
      expect(isCurrentConversationReflection(quote, quote)).toBe(false)
  })

  it('uses the actual stored and presented reply, separates a host request from execution, and refuses a new promise or world claim', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-spoken-statement-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    const life = createLifeTurnRuntime({ getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, now: Date.now })
    const readStatements = (sessionId: string) => readPresentedConversationStatements({ turns: () => db.listConversationTurnsBySession(sessionId, { cardId: 'alice', limit: 12 }), presented: ids => db.listPresentedLifeTurnIds('alice', ids) })
    let speaker: 'host' | 'companion' = 'host'
    let wrongSpeaker = false
    let quote = '你刚才让我读指定文件。'
    try {
      await life.admit({ cardId: 'alice', turnId: 'prior', conversationId: 'primary', messages: [{ role: 'user', content: '请读指定文件，没有就直接说。' }] }, signal)
      const text = '指定文件不存在。'
      await db.appendConversationTurn({ cardId: 'alice', turnId: 'prior', sessionId: 'primary', assistantText: text, structured: { format: 'mind-turn-v1', visibleReplyAuthority: 'llm-mind', reply: text } })
      expect(await readStatements('primary')).toEqual([])
      await db.commitLifeState({ cardId: 'alice', operationKey: 'actual-presentation', changes: [], mutations: [{ type: 'surface-register', sessionId: 'actual-surface', surface: 'desktop' }, { type: 'expression-record', presentationVerified: true, receipt: { cardId: 'alice', receiptId: 'rendered-prior', deliveryId: 'prior', turnId: 'prior', utteranceId: 'prior', segmentId: 'text', playbackEpoch: 'actual-surface', surfaceSessionId: 'actual-surface', sequence: 0, state: 'rendered', playedMs: 0, alignedTextEnd: text.length, alignmentSource: null, errorCode: null, occurredAt: Date.now() } }] })
      expect(await readStatements('primary')).toEqual([expect.objectContaining({ turnId: 'prior', text })])
      await life.admit({ cardId: 'alice', turnId: 'recap', conversationId: 'primary', messages: [{ role: 'user', content: '回顾我们刚才说过什么。' }] }, signal)
      const review = createLifeReplyGroundingRuntime({ getIngress: db.getLifeIngress, readUserInput: db.getLifeUserInput, readConversationStatements: readStatements, read: db.readLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), commit: db.commitLifeState, now: Date.now, generate: async ({ user, responseFormat }) => {
        const facts = JSON.parse(user)
        const selectedSpeaker = wrongSpeaker ? (speaker === 'host' ? 'companion' : 'host') : speaker
        const statement = facts.conversationStatements.find((item: { speaker: string, text: string }) => item.speaker === selectedSpeaker && item.text.includes(selectedSpeaker === 'host' ? '请读指定' : '指定文件不存在'))
        expect(statement).toBeDefined()
        const schema = JSON.parse(JSON.stringify(responseFormat)).json_schema.schema.properties
        expect(schema.claims.items.properties.kind.enum).not.toContain('conversation-statement')
        const itemSchema = schema[speaker === 'host' ? 'hostStatements' : 'companionStatements'].items
        if (attributesConversationStatement(quote, quote, speaker) && !wrongSpeaker) {
          expect(itemSchema.properties.quote.enum).toContain(quote)
          expect(itemSchema.properties.binding.anyOf.some((branch: { properties?: { kind: { enum: string[] }, id: { enum: string[] } } }) => branch.properties?.kind.enum.includes('dialogue') && branch.properties.id.enum.includes(statement.binding.id))).toBe(true)
        }
        const claim = { quote, binding: statement.binding, meaningMatchesBinding: true }
        return JSON.stringify({ claims: [], hostStatements: speaker === 'host' ? [claim] : [], companionStatements: speaker === 'companion' ? [claim] : [], conversationLinks: [] })
      } })
      const check = () => review({ cardId: 'alice', turnId: 'recap', text: quote, owners: [], signal })
      expect((await check()).accepted).toBe(true)
      wrongSpeaker = true
      expect((await check()).accepted).toBe(false)
      wrongSpeaker = false
      speaker = 'companion'
      quote = '我就如实告诉你了。'
      expect((await check()).accepted).toBe(true)
      for (quote of ['指定文件现在不存在。', '我已经写入指定文件。', '我明天会告诉你。'])
        expect((await check()).accepted).toBe(false)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('rejects a displayed infrastructure fallback and a canonical reply with no presentation proof', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-statement-failure-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.appendConversationTurn({ cardId: 'alice', turnId: 'failure', sessionId: 'primary', assistantText: '模型输出格式异常', structured: { format: 'mind-turn-v1', visibleReplyAuthority: 'llm-mind', reply: '模型输出格式异常', contractFailed: true } })
      await db.appendConversationTurn({ cardId: 'alice', turnId: 'not-shown', sessionId: 'primary', assistantText: '没有呈现的句子', structured: { format: 'mind-turn-v1', visibleReplyAuthority: 'llm-mind', reply: '没有呈现的句子' } })
      const statements = await readPresentedConversationStatements({ turns: () => db.listConversationTurnsBySession('primary', { cardId: 'alice', limit: 12 }), presented: async () => new Set(['failure']) })
      expect(statements).toEqual([])
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})
