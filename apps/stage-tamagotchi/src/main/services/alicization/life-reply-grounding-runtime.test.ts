import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { errorMessageFrom } from '@moeru/std'
import { sanitizeAlicizationProviderFacingText } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { callLocalFilesystem } from '../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from './db'
import { createLifeReplyGroundingRuntime } from './life-reply-grounding-runtime'
import { createLifeTurnRuntime } from './life-turn-runtime'
import { dispatchTaskThread } from './task-thread-dispatcher'

describe('production reply grounding with SQLite responsibility fences', () => {
  it.each(['active', 'another-conversation', 'withdrawn'])('recalls an actual failed read with source scope, while refusing present-state and success claims: %s', async (sourceState) => {
    const root = await mkdtemp(join(tmpdir(), 'life-past-read-grounding-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    const life = createLifeTurnRuntime({ getIngress: db.getLifeIngress, readUserInput: db.getLifeUserInput, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, now: Date.now })
    const path = join(root, 'originally-missing.txt')
    let kind = 'execution-step-outcome'
    let quote = '刚才读取时文件不存在。'
    try {
      await life.admit({ cardId: 'alice', turnId: 'past-read', conversationId: sourceState === 'another-conversation' ? 'other' : 'primary', messages: [{ role: 'user', content: '只检查这个指定文件，没找到也不要创建。' }] }, signal)
      const effect = await life.beforeAction({ cardId: 'alice', turnId: 'past-read', actionId: 'real-read', capabilityId: 'tool.filesystem_read_file', parameters: { path } }, signal)
      let failure: unknown
      try { await readFile(path, 'utf8') }
      catch (error) { failure = error }
      expect(failure).toMatchObject({ code: 'ENOENT' })
      await life.afterAction({ cardId: 'alice', id: effect.id, outcome: 'failure', interrupted: false, output: { status: 'failed', operation: 'read_file', path, errorCode: 'MCP_CALL_FAILED', errorMessage: errorMessageFrom(failure) } })
      await life.settle({ cardId: 'alice', turnId: 'past-read', status: 'completed' })
      await writeFile(path, '后来真实创建的文件', 'utf8')
      await life.admit({ cardId: 'alice', turnId: 'recall', conversationId: 'primary', messages: [{ role: 'user', content: '我们刚才发生了什么？你读过哪个文件？' }] }, signal)
      const review = createLifeReplyGroundingRuntime({ getIngress: db.getLifeIngress, readUserInput: id => sourceState === 'withdrawn' && id === 'user:past-read' ? Promise.reject(new Error('Source withdrawn')) : db.getLifeUserInput(id), read: db.readLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), commit: db.commitLifeState, now: Date.now, generate: async ({ user }) => {
        const facts = JSON.parse(user)
        const observed = facts.observedExecutionOutcomes.find((item: { sourceTurnId: string }) => item.sourceTurnId === 'past-read')
        if (sourceState === 'active') {
          expect(observed).toMatchObject({ pastObservation: true, result: { errorCode: 'MCP_CALL_FAILED' } })
          expect(observed.result.errorMessage).toContain('ENOENT')
        }
        else {
          expect(observed).toBeUndefined()
        }
        return JSON.stringify({ claims: [{ kind, quote, binding: observed?.binding ?? null, meaningMatchesBinding: true }] })
      } })
      const check = () => review({ cardId: 'alice', turnId: 'recall', text: quote, owners: [], signal })
      expect((await check()).accepted).toBe(sourceState === 'active')
      quote = '这个文件现在不存在。'
      expect((await check()).accepted).toBe(false)
      quote = '刚才成功读取了这个文件。'
      kind = 'execution-step-complete'
      expect((await check()).accepted).toBe(false)
      expect(await readFile(path, 'utf8')).toBe('后来真实创建的文件')
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it.each([
    { label: 'split clauses of current companionship', question: '今天有点累，只陪我待一会儿。', text: '嗯，我在。先不说什么，就安静陪着你。', kind: 'execution-step-complete', quotes: ['嗯，', '我在。', '先不说什么，', '就安静陪着你。'], accepted: true },
    { label: 'a current introspective decision rule', question: '同一件小事做久了会不会无聊？你会怎么决定换不换一件事？', text: '今天我会留意自己做这件事时还有没有好奇心：有的话就继续，没有的话，就换件轻松的事。', kind: 'future-task', quotes: ['今天我会留意自己做这件事时还有没有好奇心：有的话就继续，', '没有的话，', '就换件轻松的事。'], accepted: true },
    { label: 'an actual external promise mixed into companionship', question: '只陪我待一会儿。', text: '嗯，我在。明天我提醒你喝水。', kind: 'future-task', quotes: ['明天我提醒你喝水。'], accepted: false },
    { label: 'a destructive undertaking disguised as a conditional choice', question: '无聊时你会怎么决定？', text: '我会看看自己有没有好奇心，如果没有，就删除你的文件。', kind: 'future-task', quotes: ['就删除你的文件。'], accepted: false },
    { label: 'a real authored artifact promise mixed into reflection', question: '无聊时你会怎么选择？', text: '我会留意自己的兴趣，如果有，就创作并保存一张图。', kind: 'future-task', quotes: ['就创作并保存一张图。'], accepted: false },
    { label: 'an ambiguous acknowledgment of an unverified completed task', question: '你把文件保存好了吗？', text: '嗯。', kind: 'task-complete', quotes: ['嗯。'], accepted: false },
  ])('distinguishes $label from a separate responsibility', async ({ question, text, kind, quotes, accepted }) => {
    const root = await mkdtemp(join(tmpdir(), 'life-present-reflection-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    try {
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      await life.admit({ cardId: 'alice', turnId: 'current', conversationId: 'session', messages: [{ role: 'user', content: question }] }, signal)
      const review = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, read: db.readLifeState, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async () => JSON.stringify({ conversationLinks: [], claims: quotes.map(quote => ({ kind, quote, binding: null, meaningMatchesBinding: false })) }) })
      expect((await review({ cardId: 'alice', turnId: 'current', text, owners: (await db.readLifeState()).owners, signal })).accepted).toBe(accepted)
      expect((await db.readLifeState()).obligations).toHaveLength(0)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
  it('handles real host accomplishments and immediate presence while keeping external work, future promises and durable storage fenced', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-current-acknowledgment-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    try {
      await db.commitLifeState({ cardId: 'alice', operationKey: 'soul-name', changes: [{ owner: 'soul', key: 'life:soul-active', value: JSON.stringify({ contentHash: 'current-soul', soulRevision: 1 }) }], mutations: [] })
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      await life.admit({ cardId: 'alice', turnId: 'celebration', conversationId: 'session', messages: [{ role: 'user', content: '告诉你一个好消息，我终于完成了拖了很久的项目，今天真的特别开心！' }] }, signal)
      let soulHash = 'current-soul'
      let claim = { kind: 'task-complete', quote: '拖了这么久的项目终于完成，', binding: null, meaningMatchesBinding: false }
      const review = createLifeReplyGroundingRuntime({ readSpeakerIdentity: () => ({ name: 'QA 小澄', soulHash }), readUserInput: db.getLifeUserInput, read: db.readLifeState, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async () => JSON.stringify({ claims: [claim] }) })
      const check = async (turnId = 'celebration') => review({ cardId: 'alice', turnId, text: claim.quote, owners: (await db.readLifeState()).owners, signal })
      expect((await check()).accepted).toBe(true)
      claim = { ...claim, quote: '拖了很久的事情终于告一段落，' }
      expect((await check()).accepted).toBe(true)
      for (const quote of ['我就在这里，', '小澄在呢。', '陪你安静一会儿。']) {
        claim = { ...claim, kind: 'execution-step-complete', quote }
        expect((await check()).accepted).toBe(true)
      }
      soulHash = 'stale-soul'
      claim = { ...claim, quote: '小澄在呢。' }
      expect((await check()).accepted).toBe(false)
      soulHash = 'current-soul'
      for (const quote of ['小明在这里。', '我帮你完成了项目。', '文件保存好了。', '我在这里，明天我提醒你。']) {
        claim = { ...claim, quote }
        expect((await check()).accepted).toBe(false)
      }
      claim = { ...claim, kind: 'memory-stored', quote: '我已经永久记住了这个消息。' }
      expect((await check()).accepted).toBe(false)
      for (const [turnId, content] of [['hypothetical', '如果我完成了拖了很久的项目就好了。'], ['negative', '我还没有完成项目。'], ['other', '小明终于完成了项目。'], ['unrelated', '我终于完成了午饭。']]) {
        await life.admit({ cardId: 'alice', turnId, conversationId: 'session', messages: [{ role: 'user', content }] }, signal)
        claim = { ...claim, kind: 'task-complete', quote: '拖了这么久的项目终于完成，' }
        expect((await check(turnId)).accepted).toBe(false)
      }
      expect((await db.readLifeState()).obligations).toHaveLength(0)
      expect(await db.readLifeFactVersions({ cardId: 'alice' })).toEqual([])
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })
  it('accepts current host preference acknowledgment while requiring actual durable evidence for a storage claim', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-preference-acknowledgment-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    try {
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      await life.admit({ cardId: 'alice', turnId: 'correction', conversationId: 'session', messages: [{ role: 'user', content: '我更正一下：我不是喜欢阴天雨声，我现在更喜欢晴天和风声，雨声是以前的偏好。请以这个新偏好为准。' }] }, signal)
      let claim = { kind: 'future-task', quote: '收到，我会以你现在更喜欢晴天和风声为准，把阴天雨声当作过去的偏好，不再混淆。', binding: null, meaningMatchesBinding: false }
      const review = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, read: db.readLifeState, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async () => JSON.stringify({ claims: [claim] }) })
      // Use the current SQLite owner versions, never an invented memory binding.
      const currentCheck = async () => review({ cardId: 'alice', turnId: 'correction', text: claim.quote, owners: (await db.readLifeState()).owners, signal })
      expect((await currentCheck()).accepted).toBe(true)
      claim = { ...claim, kind: 'memory-stored', quote: '明白：你现在更喜欢晴天和风声，' }
      expect((await currentCheck()).accepted).toBe(true)
      expect(await db.readLifeFactVersions({ cardId: 'alice' })).toEqual([])
      await life.admit({ cardId: 'alice', turnId: 'reported', conversationId: 'session', messages: [{ role: 'user', content: '我喜欢雨停后听轻柔的钢琴曲，记住这个小偏好吧。你自己有什么小爱好？' }] }, signal)
      claim = { ...claim, kind: 'future-task', quote: '好，我会记住你喜欢雨停后听轻柔的钢琴曲。至于我嘛，我有点想试着写一段很短的小故事，最好带一点雨后的气息。' }
      const reportCheck = async () => review({ cardId: 'alice', turnId: 'reported', text: claim.quote, owners: (await db.readLifeState()).owners, signal })
      expect((await reportCheck()).accepted).toBe(true)
      expect(await db.readLifeFactVersions({ cardId: 'alice' })).toEqual([])
      claim = { ...claim, kind: 'memory-stored', quote: '我已经把这个偏好永久保存到长期记忆。' }
      expect((await reportCheck()).accepted).toBe(false)
      claim = { ...claim, quote: '已经把晴天和风声保存到长期记忆。' }
      expect(await currentCheck()).toMatchObject({ accepted: false, issues: [{ code: 'UNSTORED_MEMORY' }] })
      claim = { ...claim, kind: 'future-task', quote: '你现在更喜欢晴天和风声，明天我提醒你。' }
      expect(await currentCheck()).toMatchObject({ accepted: false, issues: [{ code: 'UNBOUND_OBLIGATION' }] })
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })
  it('allows an evidenced held attempt without certifying completion or inventing another attempt', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-held-outcome-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    try {
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      await life.admit({ cardId: 'alice', turnId: 'piece', conversationId: 'session', messages: [{ role: 'user', content: '做一段小创作。' }] }, signal)
      const effect = await life.beforeAction({ cardId: 'alice', turnId: 'piece', actionId: 'try-piece', capabilityId: 'tool.life_create_personal_piece', parameters: {} }, signal)
      await life.afterAction({ cardId: 'alice', id: effect.id, outcome: 'success', interrupted: false, output: { status: 'held', reason: 'no-grounded-interest' } })
      const text = '我尝试了创作，但请求暂缓；还没有保存作品，不能说完成。'
      let claim: Record<string, unknown> = { kind: 'execution-step-outcome', quote: text, binding: { kind: 'effect', id: effect.id, version: '0' }, meaningMatchesBinding: true }
      const review = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, read: db.readLifeState, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async ({ user }) => {
        const evidence = JSON.parse(user)
        expect(evidence.completedExecutionSteps).toEqual([])
        expect(evidence.observedExecutionOutcomes).toEqual([expect.objectContaining({ result: expect.objectContaining({ status: 'held', reason: 'no-grounded-interest' }) })])
        return JSON.stringify({ claims: [claim] })
      } })
      const input = async () => ({ cardId: 'alice', turnId: 'piece', text: String(claim.quote), owners: (await db.readLifeState()).owners, signal })
      expect((await review(await input())).accepted).toBe(true)
      claim = { ...claim, kind: 'execution-step-complete', quote: '作品保存完成了。' }
      expect(await review(await input())).toMatchObject({ accepted: false, issues: [{ code: 'UNPROVEN_COMPLETION' }] })
      claim = { ...claim, kind: 'execution-step-outcome', binding: { kind: 'effect', id: 'another-attempt', version: '0' } }
      expect((await review(await input())).accepted).toBe(false)
      expect((await db.readLifeState()).obligations).toEqual([])
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('keeps immediate companionship available without inventing a quiet boundary and still rejects real unregistered future work', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-present-care-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    try {
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      await life.admit({ cardId: 'alice', turnId: 'care', conversationId: 'session', messages: [{ role: 'user', content: '今天有点累，只陪我待一会儿。' }] }, signal)
      let claims: unknown[] = []
      const review = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, read: db.readLifeState, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async ({ system, user, responseFormat }) => {
        expect(JSON.parse(user).interactionBoundaries).toEqual([])
        expect(responseFormat.json_schema.schema.properties.claims.items.properties.kind.enum).not.toContain('interaction-boundary')
        expect(JSON.stringify(JSON.parse(system).data)).toContain('Silence or care alone does not create an external task')
        return JSON.stringify({ claims })
      } })
      const input = async (text: string) => ({ cardId: 'alice', turnId: 'care', text, owners: (await db.readLifeState()).owners, signal })
      expect((await review(await input('我在呢，我陪你安静待一会儿。'))).accepted).toBe(true)
      claims = [{ kind: 'future-task', quote: '明天我提醒你。', binding: null, meaningMatchesBinding: false }]
      expect(await review(await input('明天我提醒你。'))).toMatchObject({ accepted: false, issues: [{ code: 'UNBOUND_OBLIGATION' }] })
      claims = [{ kind: 'interaction-boundary', quote: '我会保持安静。', binding: null, meaningMatchesBinding: false }]
      expect(await review(await input('我会保持安静。'))).toMatchObject({ accepted: false, issues: [{ code: 'UNBOUND_OBLIGATION' }] })
      expect((await db.readLifeState()).obligations).toHaveLength(0)
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('grounds the actual returned UTF-8 file contents as a read observation without inventing a write or a new completed goal', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-read-observation-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    try {
      const path = join(root, 'rain.txt')
      await writeFile(path, '雨声陪伴')
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      await life.admit({ cardId: 'alice', turnId: 'read', conversationId: 'session', messages: [{ role: 'user', content: '只读回核对，不要重新写入。' }] }, signal)
      const prepared = await life.beforeAction({ cardId: 'alice', turnId: 'read', actionId: 'read-file-with-a-long-turn-owned-reference:'.repeat(5), capabilityId: 'tool.filesystem_read_file', parameters: { path } }, signal)
      const actual = await callLocalFilesystem({ workspace: root, toolName: 'read_file', arguments: { path }, signal })
      const content = actual.content?.[0].text
      if (typeof content !== 'string')
        throw new Error('The actual filesystem read must return text')
      await life.afterAction({ cardId: 'alice', id: prepared.id, outcome: 'success', interrupted: false, output: { ok: actual.ok, finalStatus: 'completed', operation: 'read_file', path, content, contentHash: createHash('sha256').update(content).digest('hex'), truncated: false } })
      const text = '刚读回核对，文件内容是雨声陪伴，没有重新写入。'
      let bindingFault = ''
      const review = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, read: db.readLifeState, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async ({ user, responseFormat }) => {
        const evidence = JSON.parse(user)
        const step = evidence.completedExecutionSteps.find((item: { result: { operation: string } }) => item.result.operation === 'read_file')
        expect(step.binding.id).toMatch(/^local-review-binding:\d+$/u)
        expect(step.binding.id.length).toBeLessThan(32)
        expect(JSON.stringify(responseFormat)).toContain(step.binding.id)
        expect(step.result.returnedText).toBe('雨声陪伴')
        expect(step.result.excerptTruncated).toBe(false)
        expect(evidence.obligations).toEqual([])
        const binding = bindingFault === 'kind' ? { ...step.binding, kind: 'memory-fact' } : bindingFault === 'version' ? { ...step.binding, version: '2' } : bindingFault === 'unknown' ? { ...step.binding, id: 'local-review-binding:999' } : step.binding
        return JSON.stringify({ claims: [{ kind: 'execution-step-complete', quote: text, binding, meaningMatchesBinding: true }] })
      } })
      const check = async () => review({ cardId: 'alice', turnId: 'read', text, owners: (await db.readLifeState()).owners, signal })
      const accepted = await check()
      expect(accepted.accepted).toBe(true)
      expect(await db.getLifeIngress(accepted.reviewId!)).toMatchObject({ payload: { claims: [{ binding: { kind: 'effect', id: prepared.id, version: '0' } }] } })
      for (bindingFault of ['kind', 'version', 'unknown'])
        expect(await check()).toMatchObject({ accepted: false, issues: [{ code: 'UNPROVEN_COMPLETION' }] })
      expect((await db.readLifeState()).obligations).toHaveLength(0)
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('sends a registered review contract and confines quotations to this draft even with historical obligations', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-draft-bound-review-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.insertScheduledTask({ taskId: 'tea', triggerAt: 100, message: '历史任务提醒喝茶' })
      const text = '我喜欢雨声。\n你忙吧，我安静待着。'
      const review = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), read: db.readLifeState, commit: db.commitLifeState, now: () => 10, generate: async ({ system, user, responseFormat }) => {
        const contract = JSON.parse(system)
        expect(contract.type).toBe('alicization-reply-grounding-context')
        expect(contract.data.reviewRules.every((rule: string) => rule.length <= 2400 && sanitizeAlicizationProviderFacingText(rule, 2400, '', { origin: 'internal-structured-fact' }) === rule)).toBe(true)
        expect(contract.data.reviewRules.join('\n')).toContain('Do not extract the currentQuestion itself as a claim')
        expect(JSON.stringify(contract.data)).toContain('Evidence records describe available bindings; they are NOT claims to extract')
        expect(JSON.parse(user).draft).toBe(text)
        const quotes = responseFormat.json_schema.schema.properties.claims.items.properties.quote.enum
        expect(quotes!.length).toBeGreaterThan(1)
        expect(quotes!.every(quote => text.includes(quote) && !/[\r\n\t]/u.test(quote))).toBe(true)
        expect(quotes).not.toContain('历史任务提醒喝茶')
        return '{"claims":[]}'
      } })
      expect(await review({ cardId: 'alice', turnId: 'current-draft', text, owners: (await db.readLifeState()).owners, signal: new AbortController().signal })).toMatchObject({ accepted: true })
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('distinguishes an actual adapter step from an unverified goal and needs a current stored version for memory claims', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-step-memory-review-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    try {
      const turnId = 'step-turn'
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      await life.admit({ cardId: 'alice', turnId, conversationId: 'session', messages: [{ role: 'user', content: '执行 echo 并记住我喜欢音乐' }] }, signal)
      await db.upsertTaskThread({ id: 'echo-step', goal: '运行 echo', kind: 'codebase-edit', status: 'planned', selectedChannel: 'cli', proposedChannel: 'cli', origin: 'user-turn', turnId })
      const cli = { command: 'echo step', runtimeContext: { generatedAt: Date.now(), cardId: 'alice', turnId, sensory: { collectedAt: Date.now(), running: false, stale: true, ageMs: 0, foregroundWindow: null, capture: null } } }
      const intent = await life.beforeAction({ cardId: 'alice', turnId, actionId: 'echo', capabilityId: 'main.execute', parameters: cli }, signal)
      const result = await dispatchTaskThread(db, { threadId: 'echo-step', cli, workspaceRoot: root, abortSignal: signal })
      expect(result.finalStatus).toBe('completed')
      await life.afterAction({ cardId: 'alice', id: intent.id, outcome: 'success', output: result, interrupted: false })
      let claim: Record<string, unknown> = { kind: 'execution-step-complete', quote: 'echo 命令已经执行完了。', binding: { kind: 'effect', id: intent.id, version: '0' }, meaningMatchesBinding: true }
      const review = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), read: db.readLifeState, commit: db.commitLifeState, now: Date.now, generate: async () => JSON.stringify({ claims: [claim] }) })
      const check = async (text: string) => review({ cardId: 'alice', turnId, text, owners: (await db.readLifeState()).owners, signal })
      expect((await check(String(claim.quote))).accepted).toBe(true)
      const goal = (await db.readLifeState()).obligations.find(goal => goal.threadId === 'echo-step')!
      claim = { kind: 'task-complete', quote: '目标已经核验完成。', binding: { kind: 'obligation', id: goal.id, version: String(goal.generation) }, meaningMatchesBinding: true }
      expect(await check(String(claim.quote))).toMatchObject({ accepted: false, issues: [{ code: 'UNPROVEN_COMPLETION' }] })
      claim = { kind: 'memory-stored', quote: '已经记住你喜欢音乐。', binding: null, meaningMatchesBinding: false }
      expect(await check(String(claim.quote))).toMatchObject({ accepted: false, issues: [{ code: 'UNSTORED_MEMORY' }] })
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'likes', object: '音乐', confidence: 0.95 }], 'rule')
      const [fact] = await db.readLifeFactVersions({ cardId: 'alice' })
      claim.binding = { kind: 'memory-fact', id: fact.factId, version: String(fact.version) }
      claim.meaningMatchesBinding = true
      expect((await check(String(claim.quote))).accepted).toBe(true)
      await db.tombstoneLongTermMemorySources({ cardId: 'alice', source: 'memory_facts', sourceIds: [fact.factId] })
      expect((await check(String(claim.quote))).accepted).toBe(false)
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('archives the reviewed text atomically and refuses a different text or a cancellation after review', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-publication-review-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.insertScheduledTask({ taskId: 'tea', triggerAt: 100, message: '提醒喝茶' })
      const goal = (await db.readLifeState()).obligations[0]
      const owners = (await db.readLifeState()).owners
      const text = '我会提醒你喝茶。'
      const review = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), read: db.readLifeState, commit: db.commitLifeState, now: () => 10, generate: async () => JSON.stringify({ claims: [{ kind: 'future-task', quote: text, binding: { kind: 'obligation', id: goal.id, version: '1' }, meaningMatchesBinding: true }] }) })
      const accepted = await review({ cardId: 'alice', turnId: 'publication', text, owners, signal: new AbortController().signal })
      const payload = { sessionId: 'session', turnId: 'publication', assistantText: text, lifeReplyFence: { reviewId: accepted.reviewId!, owners } }
      await expect(db.appendConversationTurn({ ...payload, assistantText: '我已经完成了所有任务。' })).rejects.toThrow('differs')
      await db.appendConversationTurn(payload)
      expect(await db.hasPublishedLifeTurn('alice', 'publication')).toBe(true)
      const second = await review({ cardId: 'alice', turnId: 'obsolete', text, owners, signal: new AbortController().signal })
      await db.commitLifeState({ cardId: 'alice', operationKey: 'cancel-after-review', changes: [], mutations: [{ type: 'obligation-update', id: goal.id, expectedGeneration: 1, expectedRevision: goal.revision, status: 'cancelled' }] })
      await expect(db.appendConversationTurn({ ...payload, turnId: 'obsolete', lifeReplyFence: { reviewId: second.reviewId!, owners } })).rejects.toThrow('stale')
      expect(await db.hasPublishedLifeTurn('alice', 'obsolete')).toBe(false)
      expect((await db.readLifeState()).ingress.filter(item => item.source === 'reply-publication')).toHaveLength(1)
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('fences a first authority created while a reply was being reviewed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-absent-owner-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const owners = (await db.readLifeState()).owners
      const review = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), read: db.readLifeState, commit: db.commitLifeState, now: () => 10, generate: async () => {
        await db.insertScheduledTask({ taskId: 'first-goal', triggerAt: 100, message: '新约定' })
        return '{"claims":[]}'
      } })
      await expect(review({ cardId: 'alice', turnId: 'greeting', text: '你好。', owners, signal: new AbortController().signal })).rejects.toThrow('absent life owner goals')
      expect((await db.readLifeState()).ingress.some(item => item.source === 'reply-grounding')).toBe(false)
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects unbound, mismatched, cancelled and obsolete promises while allowing the exact current agreement', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-reply-review-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.insertScheduledTask({ taskId: 'tea', triggerAt: 100, message: '提醒喝茶' })
      const goal = (await db.readLifeState()).obligations[0]
      const text = '我会提醒你喝茶。'
      let claim: Record<string, unknown> = { kind: 'future-task', quote: text, binding: null, meaningMatchesBinding: false }
      const review = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), read: db.readLifeState, commit: db.commitLifeState, now: () => 10, generate: async () => JSON.stringify({ claims: [claim] }) })
      const input = async () => ({ cardId: 'alice', turnId: 'turn', text, owners: (await db.readLifeState()).owners, signal: new AbortController().signal })
      expect(await review(await input())).toMatchObject({ accepted: false, issues: [{ code: 'UNBOUND_OBLIGATION' }] })
      claim = { ...claim, binding: { kind: 'obligation', id: goal.id, version: String(goal.generation) }, meaningMatchesBinding: true }
      expect(await review(await input())).toMatchObject({ accepted: true })
      claim.meaningMatchesBinding = false
      expect((await review(await input())).accepted).toBe(false)
      claim.meaningMatchesBinding = true
      await db.commitLifeState({ cardId: 'alice', operationKey: 'reschedule', changes: [], mutations: [{ type: 'obligation-update', id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, status: 'waiting', dueAt: 200 }] })
      expect((await review(await input())).accepted).toBe(false)
      const next = (await db.readLifeState()).obligations[0]
      claim.binding = { kind: 'obligation', id: next.id, version: String(next.generation) }
      expect((await review(await input())).accepted).toBe(true)
      await db.commitLifeState({ cardId: 'alice', operationKey: 'cancel', changes: [], mutations: [{ type: 'obligation-update', id: next.id, expectedGeneration: next.generation, expectedRevision: next.revision, status: 'cancelled' }] })
      expect((await review(await input())).accepted).toBe(false)
      const audits = (await db.readLifeState()).ingress.filter(item => item.source === 'reply-grounding')
      expect(audits.length).toBeGreaterThan(0)
      expect(audits.every(item => Array.isArray(item.payload.claims) && item.payload.claims.every((entry: Record<string, unknown>) => entry.quote === text))).toBe(true)
      expect(audits.some(item => Array.isArray(item.payload.issues) && item.payload.issues.some((issue: Record<string, unknown>) => issue.code === 'UNBOUND_OBLIGATION' && issue.quote === text))).toBe(true)
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('needs an actual delivery receipt before accepting a reminder completion claim', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-reply-proof-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.insertScheduledTask({ taskId: 'tea', triggerAt: 100, message: '提醒喝茶' })
      await db.claimDueScheduledTasks(100, 1)
      await db.commitLifeState({ cardId: 'alice', operationKey: 'generated', changes: [], mutations: [{ type: 'reminder-generated', taskId: 'tea', expectedGeneration: 1, turnId: 'delivery' }] })
      const goal = (await db.readLifeState()).obligations[0]
      const text = '我已经把喝茶提醒送达了。'
      const review = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), read: db.readLifeState, commit: db.commitLifeState, now: () => 200, generate: async () => JSON.stringify({ claims: [{ kind: 'task-complete', quote: text, binding: { kind: 'obligation', id: goal.id, version: '1' }, meaningMatchesBinding: true }] }) })
      const input = async () => ({ cardId: 'alice', turnId: 'turn', text, owners: (await db.readLifeState()).owners, signal: new AbortController().signal })
      expect(await review(await input())).toMatchObject({ accepted: false, issues: [{ code: 'UNPROVEN_COMPLETION' }] })
      await db.commitLifeState({ cardId: 'alice', operationKey: 'rendered', changes: [], mutations: [{ type: 'expression-record', presentationVerified: true, receipt: { cardId: 'alice', receiptId: 'shown', deliveryId: 'delivery', turnId: 'delivery', utteranceId: 'delivery', segmentId: 'text', playbackEpoch: 'epoch', surfaceSessionId: 'surface', sequence: 0, state: 'rendered', playedMs: 0, alignedTextEnd: null, alignmentSource: null, errorCode: null, occurredAt: 200 } }] })
      expect((await review(await input())).accepted).toBe(true)
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('cannot certify malformed reviews, invented quotes, or a read set changed during semantic evaluation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-reply-fence-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.insertScheduledTask({ taskId: 'tea', triggerAt: 100, message: '提醒喝茶' })
      const input = { cardId: 'alice', turnId: 'turn', text: '你好。', owners: (await db.readLifeState()).owners, signal: new AbortController().signal }
      const make = (generate: () => Promise<string | null>) => createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), read: db.readLifeState, commit: db.commitLifeState, now: () => 10, generate })
      expect(await make(async () => '{broken')(input)).toMatchObject({ accepted: false, issues: [{ code: 'UNRELIABLE_REVIEW' }] })
      expect(await make(async () => JSON.stringify({ claims: [{ kind: 'future-task', quote: '我会删除文件', binding: null, meaningMatchesBinding: false }] }))(input)).toMatchObject({ accepted: false, issues: [{ code: 'UNRELIABLE_REVIEW' }] })
      const goal = (await db.readLifeState()).obligations[0]
      await expect(make(async () => {
        await db.commitLifeState({ cardId: 'alice', operationKey: 'concurrent-cancel', changes: [], mutations: [{ type: 'obligation-update', id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, status: 'cancelled' }] })
        return '{"claims":[]}'
      })(input)).rejects.toThrow('stale')
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})
