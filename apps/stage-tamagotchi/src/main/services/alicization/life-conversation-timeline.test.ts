import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { matchesLifeConversationLinks, requiresPastConversationLinks, resolveLifeConversationLinks } from './life-conversation-timeline'
import { createLifeReplyGroundingRuntime } from './life-reply-grounding-runtime'
import { createLifeTurnRuntime } from './life-turn-runtime'

describe('conversation chronology from actual admissions', () => {
  it.each([false, true])('keeps nested reported chronology separate from the recent question, reversed inner sequence: %s', async (reversed) => {
    const root = await mkdtemp(join(tmpdir(), 'life-nested-conversation-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    let now = Date.now()
    try {
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: () => ++now })
      for (const [turnId, content] of [['story', '你自己想写什么故事？可以和我的喜好不同。'], ['file', '请写入指定文件并读回核对。'], ['boredom', '重复做小事会不会无聊？'], ['feeling', '从我回来后，你对我的感受有没有变化？'], ['recap', '先说最近的事，再说更早的聊天。']])
        await life.admit({ cardId: 'alice', turnId, conversationId: 'qa', messages: [{ role: 'user', content }] }, signal)
      const first = reversed ? '你问重复做小事会不会无聊' : '你让我写入指定文件并读回核对'
      const second = reversed ? '你让我写入指定文件并读回核对' : '你问重复做小事会不会无聊'
      const recent = `你问我的感受。我回答说，先前${first}；`
      const nested = `先前${first}；后来${second}。`
      const flashback = `后来${second}。\n\n更早，你问我自己想写什么故事。`
      const text = `最近，${recent}后来${second}。\n\n更早，你问我自己想写什么故事。`
      const review = createLifeReplyGroundingRuntime({ read: db.readLifeState, readUserInput: db.getLifeUserInput, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), commit: db.commitLifeState, now: () => ++now, generate: async ({ user, responseFormat }) => {
        const facts = JSON.parse(user)
        const quotes = responseFormat.json_schema.schema.properties.conversationLinks!.items.properties.quote.enum!
        expect(quotes).toEqual(expect.arrayContaining([recent, nested, flashback]))
        return JSON.stringify({ claims: [], conversationLinks: [[1, 3, recent], [1, 2, nested], [0, 2, flashback]].map(([earlier, later, quote]) => ({ earlier, later, quote, earlierEvidence: facts.conversationTimeline[Number(earlier)].text, laterEvidence: facts.conversationTimeline[Number(later)].text, meaningMatchesEvents: true })) })
      } })
      expect((await review({ cardId: 'alice', turnId: 'recap', text, owners: (await db.readLifeState()).owners, signal })).accepted).toBe(!reversed)
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('resolves an index typo from unique exact source evidence while preserving a false temporal assertion', () => {
    const timeline = [{ index: 0, text: '我回来了。' }, { index: 1, text: '请只操作这个指定文件。' }, { index: 2, text: '请只读另一个文件，没有就直说。' }]
    const text = '你先让我操作指定文件，后来让我只读另一个文件。'
    const link = { earlier: 2, later: 2, quote: text, earlierEvidence: timeline[1].text, laterEvidence: timeline[2].text, meaningMatchesEvents: true }
    const resolved = resolveLifeConversationLinks([link], timeline)
    expect(resolved[0]).toMatchObject({ earlier: 1, later: 2 })
    expect(matchesLifeConversationLinks(resolved, timeline, text, true)).toBe(true)
    const falseText = '你先让我只读另一个文件，后来让我操作指定文件。'
    const falseLink = { ...link, quote: falseText, earlierEvidence: timeline[2].text, laterEvidence: timeline[1].text }
    expect(matchesLifeConversationLinks(resolveLifeConversationLinks([falseLink], timeline), timeline, falseText, true)).toBe(false)
  })

  it.each([
    '你让我只读指定文件，没有就直说。之后你问重复做同一件事会不会无聊。',
    '你让我只读指定文件“雨灯.txt”，没有就直说。之后你问重复做同一件事会不会无聊。',
  ])('supplies exact whole relations including quoted objects to the wire grammar: %s', async (text) => {
    const root = await mkdtemp(join(tmpdir(), 'life-chronology-wire-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    let now = Date.now()
    let partial = true
    try {
      const life = createLifeTurnRuntime({ getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, now: () => ++now })
      for (const [turnId, content] of [['read', '请只读指定文件，没有就直说。'], ['boredom', '重复做同一件事会不会无聊？'], ['recap', '回顾我们刚才发生的事。']])
        await life.admit({ cardId: 'alice', turnId, conversationId: 'primary', messages: [{ role: 'user', content }] }, signal)
      const review = createLifeReplyGroundingRuntime({ getIngress: db.getLifeIngress, readUserInput: db.getLifeUserInput, read: db.readLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), commit: db.commitLifeState, now: () => ++now, generate: async ({ user, responseFormat }) => {
        const data = JSON.parse(user)
        const pair = data.requiredChronologyPairs[0]
        expect(text).toContain(pair.quote)
        expect(pair.quote).toContain('只读指定文件')
        expect(pair.quote).toContain('重复做同一件事')
        const grammar = JSON.parse(JSON.stringify(responseFormat)).json_schema.schema.properties.conversationLinks.items.properties.quote.enum
        expect(grammar).toContain(pair.quote)
        expect(grammar).not.toContain('之后你问重复做同一件事会不会无聊。')
        return JSON.stringify({ claims: [], conversationLinks: [{ earlier: 0, later: 1, quote: partial ? '之后你问重复做同一件事会不会无聊。' : pair.quote, earlierEvidence: data.conversationTimeline[0].text, laterEvidence: data.conversationTimeline[1].text, meaningMatchesEvents: true }] })
      } })
      expect((await review({ cardId: 'alice', turnId: 'recap', text, owners: [], signal })).accepted).toBe(false)
      partial = false
      expect((await review({ cardId: 'alice', turnId: 'recap', text, owners: [], signal })).accepted).toBe(true)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('binds a lone later marker across sentences, rejects reversed or partly anchored recollections, and permits a real flashback', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-lone-temporal-marker-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    let now = Date.now()
    let earlier = 0
    let later = 1
    let empty = true
    try {
      const life = createLifeTurnRuntime({ getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, now: () => ++now })
      for (const [turnId, content] of [['choice', '你可以选和我不同的故事题材。'], ['file', '请只读指定文件，没有就直接告诉我。'], ['boredom', '重复做同一件事会不会无聊？'], ['recap', '我们之前发生了什么？']])
        await life.admit({ cardId: 'alice', turnId, conversationId: 'primary', messages: [{ role: 'user', content }] }, signal)
      const review = createLifeReplyGroundingRuntime({ getIngress: db.getLifeIngress, readUserInput: db.getLifeUserInput, read: db.readLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), commit: db.commitLifeState, now: () => ++now, generate: async ({ user }) => {
        const data = JSON.parse(user)
        expect(data.chronologyRequired).toBe(true)
        return JSON.stringify({ claims: [], conversationLinks: empty ? [] : [{ earlier, later, quote: data.draft, earlierEvidence: data.conversationTimeline[earlier].text, laterEvidence: data.conversationTimeline[later].text, meaningMatchesEvents: true }] })
      } })
      const check = (text: string) => review({ cardId: 'alice', turnId: 'recap', text, owners: [], signal })
      const wrong = '你回来后问我重复做同一件事会不会无聊，还允许我选不同题材。这让我自在。后来你让我只读指定文件，没有就直说。'
      expect((await check(wrong)).accepted).toBe(false)
      empty = false
      expect((await check(wrong)).accepted).toBe(false)
      earlier = 2
      later = 1
      expect((await check(wrong)).accepted).toBe(false)
      earlier = 1
      later = 2
      expect((await check('你让我只读指定文件，后来问我重复做同一件事会不会无聊。')).accepted).toBe(true)
      expect((await check('最近你问我重复做同一件事会不会无聊。更早你让我只读指定文件。')).accepted).toBe(true)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('rejects an empty review and a sorted but wrongly anchored pair from the actual experience', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-conversation-pair-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    let now = Date.now()
    const signal = new AbortController().signal
    let mode: 'empty' | 'sorted' | 'reversed' | 'valid' | 'forged-source' | 'partial-quote' = 'empty'
    try {
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: () => ++now })
      for (const [turnId, content] of [['story', '你自己现在想写一个怎样的小故事？先选一个自己愿意试试的题材。'], ['return', '我回来了。刚才这段时间你实际做过什么？没做也没关系。'], ['recap', '从我刚才回来到现在，哪件事影响了你？']])
        await life.admit({ cardId: 'alice', turnId, conversationId: 'qa', messages: [{ role: 'user', content }] }, signal)
      const review = createLifeReplyGroundingRuntime({ read: db.readLifeState, readUserInput: db.getLifeUserInput, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), commit: db.commitLifeState, now: () => ++now, generate: async ({ user, responseFormat }) => {
        const context = JSON.parse(user)
        expect(context.chronologyRequired).toBe(true)
        expect(responseFormat.json_schema.schema.properties.conversationLinks!.minItems).toBe(1)
        const earlier = mode === 'reversed' ? 1 : 0
        const later = mode === 'reversed' ? 0 : 1
        return JSON.stringify({ claims: [], conversationLinks: mode === 'empty' ? [] : [{ earlier, later, quote: mode === 'partial-quote' ? '鼓励我选自己真想试的故事题材' : context.draft, earlierEvidence: mode === 'forged-source' ? '一个从未出现的请求' : context.conversationTimeline[earlier].text, laterEvidence: context.conversationTimeline[later].text, meaningMatchesEvents: true }] })
      } })
      const wrong = '你回来后先问我这段时间实际做了什么，后来又鼓励我选自己真想试的故事题材。'
      for (const attempt of ['empty', 'sorted', 'reversed', 'forged-source', 'partial-quote'] as const) {
        mode = attempt
        expect((await review({ cardId: 'alice', turnId: 'recap', text: wrong, owners: (await db.readLifeState()).owners, signal })).accepted).toBe(false)
      }
      mode = 'valid'
      expect((await review({ cardId: 'alice', turnId: 'recap', text: '你刚才先鼓励我选一个小故事题材，后来问这段时间实际做过什么。', owners: (await db.readLifeState()).owners, signal })).accepted).toBe(true)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it.each([
    ['你回来后先问我做过什么，后来又鼓励我选择题材。', '回顾刚才发生的事', true],
    ['You first asked what happened, then encouraged my choice.', 'Recap our past conversation', true],
    ['你刚才先鼓励我先选一个故事题材，后来又问我实际做过什么。', '回顾刚才发生的事', true],
    ['You earlier first asked me to first choose a topic, then encouraged my choice.', 'Recap our past conversation', true],
    ['下次我会先问你，再决定，然后告诉你。', '回顾刚才发生的事', false],
    ['Next time I will first ask you, then tell you.', 'Recap our past conversation', false],
    ['你刚才说“先问我，然后告诉我”，我理解这句话。', '回顾刚才发生的事', false],
    ['你刚才先要求我取消弹窗，然后说保存成功。', '刚才如何保存的', true],
    ['我刚才先取消弹窗，然后保存了文件。', '刚才如何保存的', false],
  ])('requires complete past-event evidence only for %s', (text, question, expected) => {
    expect(requiresPastConversationLinks(text as string, question as string)).toBe(expected)
  })

  it('rejects a reordered recap and accepts the actual order after restart', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-conversation-order-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    let now = Date.now()
    const signal = new AbortController().signal
    try {
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: () => ++now })
      for (const [turnId, content] of [['first', '我刚才分享了一件开心的事'], ['second', '我后来有些失落，你陪着我'], ['recap', '按时间顺序回顾刚才发生的两件事']])
        await life.admit({ cardId: 'alice', turnId, conversationId: 'qa', messages: [{ role: 'user', content }] }, signal)
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      let order = [1, 0]
      const review = createLifeReplyGroundingRuntime({ read: db.readLifeState, readUserInput: db.getLifeUserInput, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), commit: db.commitLifeState, now: () => ++now, generate: async ({ user }) => {
        const context = JSON.parse(user)
        expect(context.conversationTimeline.map((item: { text: string }) => item.text)).toEqual(['我刚才分享了一件开心的事', '我后来有些失落，你陪着我', '按时间顺序回顾刚才发生的两件事'])
        return JSON.stringify({ claims: [], conversationLinks: [{ earlier: order[0], later: order[1], quote: context.draft, earlierEvidence: context.conversationTimeline[order[0]].text, laterEvidence: context.conversationTimeline[order[1]].text, meaningMatchesEvents: true }] })
      } })
      const input = { cardId: 'alice', turnId: 'recap', text: '你先感到失落，后来和我分享了开心的事。', owners: (await db.readLifeState()).owners, signal }
      expect(await review(input)).toMatchObject({ accepted: false, issues: [{ code: 'UNRELIABLE_REVIEW' }] })
      const audit = (await db.readLifeState()).ingress.find(item => item.source === 'reply-grounding')!
      expect(audit.payload.conversationTimeline).toEqual(expect.arrayContaining([expect.objectContaining({ sourceId: 'user:first', inputHash: expect.any(String) })]))
      expect(JSON.stringify(audit.payload.conversationTimeline)).not.toContain('开心的事')
      order = [0, 1]
      expect(await review({ ...input, owners: (await db.readLifeState()).owners, text: '你先分享了开心的事，后来有些失落，我陪着你。' })).toMatchObject({ accepted: true })
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
  it.each([
    { name: 'a recent sequence followed by a causal flashback', text: '你回来后问了我的近况，后来问我会不会无聊。尤其是之前你说可以有自己的想法，这让我愿意坦白。', links: [{ earlier: 1, later: 2, quote: '你回来后问了我的近况，后来问我会不会无聊。' }], accepted: true },
    { name: 'independent sequences mentioned in reverse paragraph order', text: '你先问近况，然后问会不会无聊。更早的时候，你先给我自由，然后回来问近况。', links: [{ earlier: 1, later: 2, quote: '你先问近况，然后问会不会无聊。' }, { earlier: 0, later: 1, quote: '更早的时候，你先给我自由，然后回来问近况。' }], accepted: true },
    { name: 'a flashback expressed after its later event', text: '后来你回来问了近况。在此之前，你允许我有自己的想法。', links: [{ earlier: 0, later: 1, quote: '后来你回来问了近况。在此之前，你允许我有自己的想法。' }], accepted: true },
    { name: 'a fabricated quoted temporal claim', text: '你先给了我自由，然后回来问近况。', links: [{ earlier: 0, later: 1, quote: '你先让我删除文件，然后付款。' }], accepted: false },
    { name: 'a reversed actual event relation', text: '你先问会不会无聊，然后回来问近况。', links: [{ earlier: 2, later: 1, quote: '你先问会不会无聊，然后回来问近况。' }], accepted: false },
    { name: 'a self-referential event relation', text: '你先给了我自由，然后回来问近况。', links: [{ earlier: 0, later: 0, quote: '你先给了我自由，然后回来问近况。' }], accepted: false },
    { name: 'an event outside the supplied timeline', text: '你先给了我自由，然后回来问近况。', links: [{ earlier: 0, later: 8, quote: '你先给了我自由，然后回来问近况。' }], accepted: false },
  ])('handles $name with persisted admission evidence', async ({ name, text, links, accepted }) => {
    const root = await mkdtemp(join(tmpdir(), 'life-conversation-links-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    let now = Date.now()
    const signal = new AbortController().signal
    try {
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: () => ++now })
      for (const [turnId, content] of [['freedom', '你可以和我的喜好不同'], ['return', '刚才你做了什么'], ['choice', '一直做同一件事会不会无聊'], ['recap', '哪件事影响了你的想法']])
        await life.admit({ cardId: 'alice', turnId, conversationId: 'qa', messages: [{ role: 'user', content }] }, signal)
      const review = createLifeReplyGroundingRuntime({ read: db.readLifeState, readUserInput: db.getLifeUserInput, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), commit: db.commitLifeState, now: () => ++now, generate: async ({ user }) => {
        const timeline = JSON.parse(user).conversationTimeline
        return JSON.stringify({ claims: [], conversationLinks: links.map(link => ({ ...link, earlierEvidence: timeline[link.earlier]?.text ?? 'unknown source', laterEvidence: timeline[link.later]?.text ?? 'unknown source', meaningMatchesEvents: true })) })
      } })
      const result = await review({ cardId: 'alice', turnId: 'recap', text, owners: (await db.readLifeState()).owners, signal })
      expect(result.accepted).toBe(accepted)
      if (!accepted) {
        const repair = JSON.parse(result.repairContext!).data
        expect(repair.conversationTimeline.map((event: { text: string }) => event.text)).toEqual(['你可以和我的喜好不同', '刚才你做了什么', '一直做同一件事会不会无聊', '哪件事影响了你的想法'])
        if (name === 'a reversed actual event relation') {
          expect(repair.sourceChronology[0]).toMatchObject({ before: { sourceId: 'user:return', text: '刚才你做了什么' }, after: { sourceId: 'user:choice', text: '一直做同一件事会不会无聊' } })
          expect(repair.sourceChronology[0].before.occurredAt).toBeLessThan(repair.sourceChronology[0].after.occurredAt)
        }
      }
      const audit = await db.getLifeIngress(result.reviewId!)
      expect(audit!.payload.conversationLinks).toEqual(links.map(({ earlier, later }) => ({ earlier, later, quoteHash: expect.any(String), earlierEvidenceHash: expect.any(String), laterEvidenceHash: expect.any(String), meaningMatchesEvents: true })))
      expect(JSON.stringify(audit!.payload.conversationLinks)).not.toContain(text)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})
