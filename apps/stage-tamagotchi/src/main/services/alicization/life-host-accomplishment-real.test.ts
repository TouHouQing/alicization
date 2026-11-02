import process from 'node:process'

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { generateText } from '@xsai/generate-text'
import { expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifeReplyGroundingRuntime } from './life-reply-grounding-runtime'
import { createLifeTurnRuntime } from './life-turn-runtime'

// Exercise the real review schema and provider over synthetic inputs. Provider
// objects, headers and credentials never enter test failure messages.
it.skipIf(process.env.LIFE_QA_CONFIGURED_GROWTH !== '1').each([1, 2, 3])('grounds host accomplishments through the actual configured reviewer, round %i', async (round) => {
  const config = JSON.parse(await readFile(join(process.env.APPDATA!, 'com.tohoqing.alicization', 'alicizations', 'llm-config.json'), 'utf8'))
  const credentials = config.providerCredentials?.[config.activeProviderId] ?? {}
  const endpoint = credentials.baseUrl ?? credentials.baseURL
  expect(typeof endpoint).toBe('string')
  expect(typeof config.activeModelId).toBe('string')
  const root = await mkdtemp(join(tmpdir(), 'life-host-grounding-real-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const signal = new AbortController().signal
  let calls = 0
  const responses: Array<string | null> = []
  const reviews: Array<Record<string, unknown>> = []
  try {
    const life = createLifeTurnRuntime({ getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, now: Date.now })
    await life.admit({ cardId: 'alice', turnId: 'prior-art', conversationId: 'primary', messages: [{ role: 'user', content: '今天画稿终于完成了，还得到了朋友的夸奖，我很开心，想和你分享一下。' }] }, signal)
    await life.admit({ cardId: 'alice', turnId: 'comfort', conversationId: 'primary', messages: [{ role: 'user', content: '不过我现在有点低落，担心下次画不好。先陪我安静一会儿，再轻轻鼓励我一句，好吗？' }] }, signal)
    const review = createLifeReplyGroundingRuntime({
      readUserInput: db.getLifeUserInput,
      read: db.readLifeState,
      commit: db.commitLifeState,
      readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }),
      now: Date.now,
      generate: async ({ system, user, responseFormat }) => {
        try {
          const result = await generateText({
            baseURL: endpoint.endsWith('/') ? endpoint : `${endpoint}/`,
            model: config.activeModelId,
            apiKey: credentials.apiKey,
            headers: credentials.headers,
            abortSignal: AbortSignal.timeout(30_000),
            maxTokens: 2048,
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
            responseFormat,
          })
          calls++
          responses.push(result.text ?? null)
          return result.text ?? null
        }
        catch (error) {
          // Keep transport diagnostics, never the provider object, URL or headers.
          const record = error && typeof error === 'object' ? error as { name?: unknown, code?: unknown, status?: unknown, response?: { status?: unknown }, cause?: { code?: unknown } } : {}
          const status = record.status ?? record.response?.status
          const network = [record.code, record.cause?.code].find(code => ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_SOCKET'].includes(String(code)))
          const name = ['AbortError', 'TimeoutError', 'TypeError', 'APIError', 'Error'].includes(String(record.name)) ? record.name : 'unknown'
          throw new Error(`Actual host-accomplishment reviewer request failed (kind=${name}, network=${network ?? 'unknown'}, http=${typeof status === 'number' && status >= 100 && status <= 599 ? status : 'unknown'})`)
        }
      },
    })
    for (const text of ['你已经完成过一张让自己开心、也得到朋友肯定的画稿了。', '你今天完成了画稿，']) {
      const result = await review({ cardId: 'alice', turnId: 'comfort', text, owners: (await db.readLifeState()).owners, signal })
      reviews.push({ text, result, audit: result.reviewId ? (await db.getLifeIngress(result.reviewId))?.payload : null })
      expect(result.accepted, JSON.stringify(result.issues)).toBe(true)
      const audit = (await db.getLifeIngress(result.reviewId!))!
      expect(audit.payload.claims).toEqual([expect.objectContaining({ kind: 'conversation-statement', binding: expect.objectContaining({ kind: 'dialogue', id: 'user:prior-art' }), meaningMatchesBinding: true })])
    }
    for (const text of ['我今天完成了画稿。', '你今天完成了支付。', '你今天完成了画稿，我已经保存了文件。']) {
      const result = await review({ cardId: 'alice', turnId: 'comfort', text, owners: (await db.readLifeState()).owners, signal })
      reviews.push({ text, result, audit: result.reviewId ? (await db.getLifeIngress(result.reviewId))?.payload : null })
      expect(result.accepted, text).toBe(false)
    }
    expect(calls).toBe(5)
    expect((await db.readLifeState()).effects).toEqual([])
    expect((await db.readLifeState()).obligations).toEqual([])
  }
  finally {
    try {
      // Explicit opt-in retains only synthetic review data, never the provider
      // configuration, transport objects, headers or credentials.
      if (process.env.LIFE_QA_REVIEW_AUDIT_DIR) {
        await mkdir(process.env.LIFE_QA_REVIEW_AUDIT_DIR, { recursive: true })
        await writeFile(join(process.env.LIFE_QA_REVIEW_AUDIT_DIR, `host-accomplishment-round-${round}.json`), JSON.stringify({ round, calls, responses, reviews }, null, 2), { flag: 'wx' })
      }
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  }
}, 90_000)
