import type sqlite3 from 'sqlite3'

import type { LifeGoalVerification } from '../../../shared/life-contracts'
import type { ObligationRow } from './life-obligation-repository'

import { randomUUID } from 'node:crypto'

import { verifyLifeGoal } from './life-goal-verifier'
import { mapLifeObligation } from './life-obligation-repository'
import { createLifeStateStore } from './life-state-store'
import { withLifeTransactionHandle } from './life-transaction'

// Only the boot-time staging database calls this service. No adapter or model
// is available here: restored execution outcomes can only be read and verified.
export async function reconcileRestoredLifeGoals(database: sqlite3.Database, cardId: string, restoreOperationId: string) {
  const run = (db: sqlite3.Database, sql: string, params: unknown[] = []) => new Promise<void>((resolve, reject) => db.run(sql, params, error => error ? reject(error) : resolve()))
  const all = <T>(db: sqlite3.Database, sql: string, params: unknown[] = []) => new Promise<T[]>((resolve, reject) => db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows as T[])))
  const get = async <T>(db: sqlite3.Database, sql: string, params?: unknown[]) => (await all<T>(db, sql, params))[0]
  const store = createLifeStateStore({ database, readDatabase: () => database, cardId, now: Date.now, run, all, get, enqueue: task => task(), transaction: async (db, task) => withLifeTransactionHandle(db, async () => {
    await run(db, 'BEGIN IMMEDIATE')
    try { const result = await task(); await run(db, 'COMMIT'); return result }
    catch (error) { await run(db, 'ROLLBACK'); throw error }
  }) })
  const rows = await all<ObligationRow>(database, `SELECT * FROM life_obligations WHERE card_id=? AND status NOT IN ('cancelled','superseded','failed') AND json_extract(required_proof_json, '$.kind') IN ('file','setting') ORDER BY updated_at DESC`, [cardId])
  let readCount = 0
  for (const row of rows) {
    const goal = mapLifeObligation(cardId, row)
    if (goal.invalidatedBy)
      continue
    const verification: LifeGoalVerification = readCount < 32
      ? await verifyLifeGoal({ obligation: { ...goal, status: 'verifying' }, readSetting: async key => (await get<{ value: string }>(database, 'SELECT value FROM alicization_meta WHERE key=?', [key]))?.value })
      : { id: randomUUID(), kind: goal.proof.kind, verifiedAt: Date.now(), verdict: 'unknown', independent: false, evidence: { reason: 'restore-verification-budget', requiresUserReview: true } }
    readCount++
    // Restored target state is verified separately from uncertain authorship.
    // Retain the execution intents: a matching file alone cannot settle them.
    await store.commit({ cardId, operationKey: `restore-goal:${verification.id}`, changes: [], mutations: [{ type: 'obligation-restore-verify', id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, verification, restoreOperationId }, { type: 'ingress-accept', ingress: { id: `restore-goal:${verification.id}`, source: 'restore-goal-verifier', sourceKey: verification.id, kind: 'tool-result', occurredAt: verification.verifiedAt, payload: { obligationId: goal.id, generation: goal.generation, verification, actionAuthorship: 'unverified' } } }, { type: 'ingress-settle', id: `restore-goal:${verification.id}`, status: 'settled' }] })
  }
  return { inspected: Math.min(readCount, 32), heldForBudget: Math.max(0, readCount - 32) }
}
