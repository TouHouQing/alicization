import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createLifeReplyGroundingRuntime } from '../life-reply-grounding-runtime'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { readRetrievedDialogue } from './retrieved-dialogue-proof'
import { createSessionSearchRuntime } from './session-search'

it('reviews the actual late excerpt from a long historical input instead of its unrelated beginning', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-session-excerpt-'))
  const database = await setupAlicizationDb(root, { cardId: 'alice' })
  const signal = new AbortController().signal
  const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, now: Date.now })
  try {
    const userText = `${'无关前言。'.repeat(700)}我为白露茶项目选择了青绿色。`
    await life.admit({ cardId: 'alice', turnId: 'old', conversationId: 'previous', messages: [{ role: 'user', content: userText }] }, signal)
    await database.appendConversationTurn({ cardId: 'alice', turnId: 'old', sessionId: 'previous', userText })
    await database.commitLifeState({ cardId: 'alice', operationKey: 'settled-old', changes: [], mutations: [{ type: 'ingress-settle', id: 'user:old', status: 'settled' }] })
    const result = await createSessionSearchRuntime(database, 'alice').search({ query: '白露茶' })
    expect(result.matches[0]!.host.offset).toBeGreaterThan(1600)
    await life.admit({ cardId: 'alice', turnId: 'now', conversationId: 'current', messages: [{ role: 'user', content: '回忆一下白露茶的选择' }] }, signal)
    const action = await life.beforeAction({ cardId: 'alice', turnId: 'now', actionId: 'search', capabilityId: 'tool.life_search_sessions', parameters: { query: '白露茶' } }, signal)
    await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'success', output: result, interrupted: false })
    const reviewed = await readRetrievedDialogue(database, 'alice', 'now')
    expect(reviewed.statements[0]!.text).toContain('我为白露茶项目选择了青绿色。')
    expect(reviewed.statements[0]!.text).toBe(result.matches[0]!.host.text)
    expect(reviewed.sources).toHaveLength(1)
    const page = await createSessionSearchRuntime(database, 'alice').search({ query: '白露茶', sourceId: result.matches[0]!.id, offset: 0 })
    expect(page.matches[0]?.host.text).toBe(userText.slice(0, 1600))
    expect(page.readNext).toMatchObject({ sourceId: result.matches[0]!.id, offset: 1600, speaker: 'host' })
    const pageAction = await life.beforeAction({ cardId: 'alice', turnId: 'now', actionId: 'source-page', capabilityId: 'tool.life_search_sessions', parameters: { query: '白露茶', sourceId: result.matches[0]!.id } }, signal)
    await life.afterAction({ cardId: 'alice', id: pageAction.id, outcome: 'success', output: page, interrupted: false })
    const pagedReview = await readRetrievedDialogue(database, 'alice', 'now')
    expect(pagedReview.statements.map(statement => statement.text)).toEqual(expect.arrayContaining([page.matches[0]!.host.text, result.matches[0]!.host.text]))
  }
  finally {
    await database.close()
    await rm(root, { recursive: true, force: true })
  }
})

it('searches actual cross-session speech, excludes other identities and withdrawn sources, and fences publication against late withdrawal', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-session-search-'))
  const database = await setupAlicizationDb(root, { cardId: 'alice' })
  const other = await setupAlicizationDb(root, { cardId: 'bob' })
  const signal = new AbortController().signal
  const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, now: Date.now })
  try {
    for (const [turnId, sessionId, userText] of [['old', 'last-week', '我喜欢乌龙茶，晚上不喝咖啡。'], ['literal', 'older', '我希望保留 100%_完成 这个原文标记。']]) {
      await life.admit({ cardId: 'alice', turnId: turnId!, conversationId: sessionId!, messages: [{ role: 'user', content: userText }] }, signal)
      await database.appendConversationTurn({ cardId: 'alice', turnId, sessionId: sessionId!, userText, assistantText: '未呈现的内部回复。', structured: { format: 'mind-turn-v1', visibleReplyAuthority: 'llm-mind', reply: '未呈现的内部回复。' } })
      await database.commitLifeState({ cardId: 'alice', operationKey: `settle:${turnId}`, changes: [], mutations: [{ type: 'ingress-settle', id: `user:${turnId}`, status: 'settled' }] })
    }
    const search = createSessionSearchRuntime(database, 'alice')
    expect((await search.search({ query: '100%_完成' })).matches).toHaveLength(1)
    expect((await search.search({ query: '100__完成' })).matches).toHaveLength(0)
    const result = await search.search({ query: '乌龙茶', sessionId: 'last-week' })
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0]).toMatchObject({ host: { text: '我喜欢乌龙茶，晚上不喝咖啡。' }, companion: null })
    expect((await search.search({ query: '未呈现的内部回复' })).matches).toEqual([])
    expect((await createSessionSearchRuntime(other, 'bob').search({ query: '乌龙茶' })).matches).toEqual([])
    expect((await search.search({ query: '乌龙茶', since: Date.now() + 1000 })).matches).toEqual([])
    await expect(search.search({ query: 'a b c d e' })).rejects.toThrow('query budget')
    await life.admit({ cardId: 'alice', turnId: 'recall', conversationId: 'today', messages: [{ role: 'user', content: '我以前说过喜欢什么茶？' }] }, signal)
    const dispatch = await life.beforeAction({ cardId: 'alice', turnId: 'recall', actionId: 'search', capabilityId: 'tool.life_search_sessions', parameters: { query: '乌龙茶' }, effectContract: { version: 'life-capability-effects-v1', sideEffect: 'read', retryClass: 'read-only', verifier: 'returned-observation', compensation: 'none' }, owners: (await database.readLifeState()).owners }, signal)
    await life.afterAction({ cardId: 'alice', id: dispatch.id, outcome: 'success', output: result, interrupted: false })
    expect((await readRetrievedDialogue(database, 'alice', 'recall')).statements).toEqual(expect.arrayContaining([expect.objectContaining({ speaker: 'host', text: '我喜欢乌龙茶，晚上不喝咖啡。' })]))
    const owners = (await database.readLifeState()).owners
    const draft = '你之前告诉我，你喜欢乌龙茶。'
    const review = createLifeReplyGroundingRuntime({ read: database.readLifeState, getIngress: database.getLifeIngress, readUserInput: database.getLifeUserInput, readMemoryEvidence: () => database.readLifeFactVersions({ cardId: 'alice' }), readRetrievedDialogue: turnId => readRetrievedDialogue(database, 'alice', turnId), commit: database.commitLifeState, now: Date.now, generate: async ({ user }) => {
      const facts = JSON.parse(user)
      const statement = facts.conversationStatements.find((item: any) => item.speaker === 'host' && item.text.includes('乌龙茶'))
      expect(statement).toBeDefined()
      return JSON.stringify({ claims: [], hostStatements: [{ quote: draft, binding: statement.binding, meaningMatchesBinding: true }], companionStatements: [], conversationLinks: [] })
    } })
    const reviewed = await review({ cardId: 'alice', turnId: 'recall', text: draft, owners, signal })
    expect(reviewed.accepted).toBe(true)
    await database.commitLifeState({ cardId: 'alice', operationKey: 'forget-old-source', changes: [], mutations: [{ type: 'evidence-invalidate', source: { cardId: 'alice', kind: 'life_ingress', id: 'user:old', version: '*' }, mode: 'forget', reason: 'User withdrew this history' }] })
    await expect(database.appendConversationTurn({ cardId: 'alice', turnId: 'recall', sessionId: 'today', assistantText: draft, structured: { format: 'mind-turn-v1', visibleReplyAuthority: 'llm-mind', reply: draft }, lifeReplyFence: { reviewId: reviewed.reviewId!, owners } })).rejects.toThrow(/withdrawn|revoked|changed/u)
    expect((await search.search({ query: '乌龙茶' })).matches).toEqual([])
    expect((await readRetrievedDialogue(database, 'alice', 'recall')).statements).toEqual([])
    expect((await database.listConversationTurnsBySession('today')).every(turn => !turn.assistantText)).toBe(true)
  }
  finally {
    await database.close()
    await other.close()
    await rm(root, { recursive: true, force: true })
  }
})
