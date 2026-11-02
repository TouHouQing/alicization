import type { LifeObligationHistoryItem, LifeObligationHistoryPage, LifeObligationHistoryRequest } from '../../../shared/life-history-contracts'
import type { LifeTransaction } from './life-transaction'

import * as v from 'valibot'

const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
export const lifeObligationHistoryRequestSchema = v.strictObject({
  cardId: id,
  cursor: v.optional(v.strictObject({ cardId: id, id, updatedAt: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(Number.MAX_SAFE_INTEGER)) })),
  limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50))),
})

/** Read a bounded UI projection; core responsibility ownership is unchanged. */
export async function readLifeObligationHistoryPage(tx: Pick<LifeTransaction, 'cardId' | 'all'>, raw: LifeObligationHistoryRequest): Promise<LifeObligationHistoryPage> {
  const input = v.parse(lifeObligationHistoryRequestSchema, raw)
  if (input.cardId !== tx.cardId || (input.cursor && input.cursor.cardId !== tx.cardId))
    throw new Error('History pagination crossed the current card boundary')
  const limit = input.limit ?? 20
  const cursor = input.cursor
  const rows = await tx.all<LifeObligationHistoryItem>(`SELECT obligation_id AS id,kind,summary,status,generation,revision,updated_at AS updatedAt FROM life_obligations WHERE card_id=? AND status IN ('fulfilled','cancelled','superseded') ${cursor ? 'AND (updated_at < ? OR (updated_at = ? AND obligation_id < ?))' : ''} ORDER BY updated_at DESC,obligation_id DESC LIMIT ?`, cursor ? [tx.cardId, cursor.updatedAt, cursor.updatedAt, cursor.id, limit + 1] : [tx.cardId, limit + 1])
  const items = rows.slice(0, limit)
  const last = items.at(-1)
  return { cardId: tx.cardId, items, nextCursor: rows.length > limit && last ? { cardId: tx.cardId, updatedAt: last.updatedAt, id: last.id } : null }
}
