import type { AlicizationDbService } from '../db'
import type { ProviderUsage } from './provider-usage'

import { isDeepStrictEqual } from 'node:util'

import * as v from 'valibot'

import { summarizeProviderUsage } from './provider-usage'

const text = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
const count = v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))
const usage = v.nullable(v.strictObject({ inputTokens: count, outputTokens: count, totalTokens: count, cacheReadTokens: count, cacheWriteTokens: count, reasoningTokens: count }))
const request = v.strictObject({ requestId: text, cardId: text, turnId: text, rootTurnId: text, parentRequestId: v.nullable(text), providerId: text, model: text, measurement: v.optional(v.picklist(['provider-request', 'external-agent-aggregate'])), requestHash: v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u)), providerAttempt: v.pipe(v.number(), v.integer(), v.minValue(1)), startedAt: v.pipe(v.number(), v.integer(), v.minValue(0)) })
const settled = v.strictObject({ ...request.entries, finishedAt: v.pipe(v.number(), v.integer(), v.minValue(0)), settlement: v.picklist(['completed', 'failed', 'retrying', 'aborted', 'interrupted']), usage })

export type ProviderRequestStarted = v.InferOutput<typeof request>
export type ProviderRequestSettled = v.InferOutput<typeof settled>
export interface ProviderAccounting {
  started: (record: ProviderRequestStarted) => Promise<void>
  settled: (record: ProviderRequestSettled) => Promise<void>
}

/** Pi's request identity / persisted UsageDoc semantics, using the life writer. */
export function createProviderUsageLedger(database: AlicizationDbService, cardId: string): ProviderAccounting & {
  recoverInterrupted: () => Promise<number>
  read: (options?: { rootTurnId?: string, afterId?: string, limit?: number }) => Promise<{ entries: ProviderRequestSettled[], next: string | null, summary: ReturnType<typeof summarizeProviderUsage>, external: { invocationCount: number, usageReported: number, totals: ReturnType<typeof summarizeProviderUsage>['totals'] } }>
} {
  async function write(record: ProviderRequestStarted | ProviderRequestSettled, final: boolean) {
    const parsed = v.parse(final ? settled : request, record)
    if (parsed.cardId !== cardId || (await database.readLifeState()).cardId !== cardId)
      throw new Error('Provider accounting crossed its life owner')
    const id = `provider-usage:${parsed.requestId}:${final ? 'settled' : 'started'}`
    const existing = await database.getLifeIngress(id)
    if (existing) {
      if (!isDeepStrictEqual(existing.payload.record, parsed))
        throw new Error('Provider accounting request identity changed')
      return
    }
    if (final) {
      const start = await database.getLifeIngress(`provider-usage:${parsed.requestId}:started`)
      const { finishedAt: _finishedAt, settlement: _settlement, usage: _usage, ...started } = parsed as ProviderRequestSettled
      if (!start || !isDeepStrictEqual(start.payload.record, started))
        throw new Error('Provider settlement has no matching durable request')
    }
    await database.commitLifeState({ cardId, operationKey: id, changes: [], mutations: [
      { type: 'ingress-accept', ingress: { id, kind: 'system', source: final ? 'agent-provider-usage-settled' : 'agent-provider-usage-started', sourceKey: id, occurredAt: final ? (parsed as ProviderRequestSettled).finishedAt : parsed.startedAt, payload: { record: parsed } } },
      { type: 'ingress-settle', id, status: 'settled' },
    ] })
  }
  return {
    async recoverInterrupted() {
      let recovered = 0
      for (;;) {
        const records = await database.readOpenAgentProviderRequests(64)
        if (!records.length)
          return recovered
        for (const record of records) {
          const started = v.parse(request, record.payload.record)
          await write({ ...started, finishedAt: Date.now(), settlement: 'interrupted', usage: null }, true)
          recovered++
        }
        if (recovered > 4096)
          throw new Error('Provider accounting recovery exceeded its startup budget')
      }
    },
    started: record => write(record, false),
    settled: record => write(record, true),
    async read(options = {}) {
      const page = await database.readLifeIngressPage({ source: 'agent-provider-usage-settled', afterId: options.afterId, limit: options.limit ?? 64 })
      if (page.cardId !== cardId)
        throw new Error('Provider accounting crossed its life owner')
      const entries = page.entries.map(entry => v.parse(settled, entry.payload.record)).filter(entry => !options.rootTurnId || entry.rootTurnId === options.rootTurnId)
      const external = summarizeProviderUsage(entries.filter(entry => entry.measurement === 'external-agent-aggregate'))
      return { entries, next: page.next, summary: summarizeProviderUsage(entries.filter(entry => entry.measurement !== 'external-agent-aggregate') as Array<{ requestId: string, usage: ProviderUsage | null }>), external: { invocationCount: external.requestCount, usageReported: external.usageReported, totals: external.totals } }
    },
  }
}
