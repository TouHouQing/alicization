import type { LifeObligationHistoryCursor } from '../../../shared/life-history-contracts'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import sqlite from './sqlite3-runtime'

import { setupAlicizationDb } from './db'
import { admitProcedureEvidence } from './execution/procedure-admission'

async function seed(root: string, plans: boolean) {
  const handle = await new Promise<InstanceType<typeof sqlite.Database>>((resolve, reject) => {
    const database = new sqlite.Database(join(root, 'alicizations/cards/alice/alicization.db'), error => error ? reject(error) : resolve(database))
  })
  const run = (sql: string, values: unknown[] = []) => new Promise<void>((resolve, reject) => handle.run(sql, values, error => error ? reject(error) : resolve()))
  try {
    await run('BEGIN IMMEDIATE')
    for (const [kind, count] of [['terminal', 200], ['active', 140]] as const) {
      for (let index = 0; index < count; index++) {
        const key = `${kind}-${String(index).padStart(3, '0')}`
        const rootId = `task:${key}`
        const status = kind === 'terminal' ? 'cancelled' : ['accepted', 'blocked', 'waiting', 'failed', 'verifying'][index % 5]
        const timestamp = kind === 'terminal' ? 1000 + index : index + 1
        await run('INSERT INTO life_obligations(card_id,obligation_id,dedupe_key,generation,revision,kind,source_ref_json,beneficiary_ref_json,summary,status,expiry_policy,required_proof_json,created_at,updated_at) VALUES (\'alice\',?,?,1,0,\'task\',\'{}\',\'{}\',?,?,\'none\',\'{"kind":"user-reported"}\',?,?)', [rootId, key, `Owned ${key}`, status, timestamp, timestamp])
        if (plans) {
          const hash = 'a'.repeat(64)
          const body = { id: key, cardId: 'alice', revision: 1, rootThreadId: key, rootObligationId: rootId, obligationGeneration: 1, acceptanceHash: hash, steps: [], sourceEvidenceRefs: [], createdAt: timestamp }
          const contract = { rootObligationId: rootId, obligationGeneration: 1, contractHash: hash, criteria: [], revision: 1 }
          await run('INSERT INTO life_work_plans(card_id,plan_id,revision,root_thread_id,root_obligation_id,obligation_generation,contract_hash,body_json,event_cursor,created_at) VALUES (\'alice\',?,1,?,?,1,?,?,0,?)', [key, key, rootId, hash, JSON.stringify(body), timestamp])
          await run('INSERT INTO life_execution_contracts(card_id,obligation_id,obligation_generation,revision,contract_hash,body_json,active,created_at) VALUES (\'alice\',?,1,1,?,?,1,?)', [rootId, hash, JSON.stringify(contract), timestamp])
        }
      }
    }
    await run('INSERT INTO life_obligations(card_id,obligation_id,dedupe_key,generation,revision,kind,source_ref_json,beneficiary_ref_json,summary,status,expiry_policy,required_proof_json,created_at,updated_at) VALUES (\'other\',\'task:foreign\',\'foreign\',1,0,\'task\',\'{}\',\'{}\',\'Foreign private task\',\'accepted\',\'none\',\'{"kind":"user-reported"}\',1,1)')
    await run('COMMIT')
  }
  finally { await new Promise<void>((resolve, reject) => handle.close(error => error ? reject(error) : resolve())) }
}

for (const plans of [false, true]) {
  it(`bounds terminal history while preserving every older live responsibility${plans ? ', plan and contract' : ' and exact historical command'}`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-life-read-window-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.close()
      await seed(root, plans)
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      const view = await db.readLifeState()
      const active = view.obligations.filter(item => item.status !== 'cancelled')
      expect(active).toHaveLength(140)
      expect(view.obligations.filter(item => item.status === 'cancelled')).toHaveLength(plans ? 128 : 100)
      expect(view.obligations.some(item => item.cardId !== 'alice' || item.id === 'task:foreign')).toBe(false)
      expect(view.obligations.some(item => item.id === 'task:terminal-000')).toBe(false)
      const exact = await db.readLifeState({ obligationId: 'task:terminal-000' })
      expect(exact.obligations.find(item => item.id === 'task:terminal-000')).toMatchObject({ cardId: 'alice', status: 'cancelled' })
      const scope = { obligationId: 'task:terminal-000' }
      const captured = db.readLifeState(scope)
      scope.obligationId = 'task:terminal-001'
      const capturedView = await captured
      expect(capturedView.obligations.some(item => item.id === 'task:terminal-000')).toBe(true)
      expect(capturedView.obligations.some(item => item.id === 'task:terminal-001')).toBe(false)
      expect((await db.readLifeState({ obligationId: 'task:foreign' })).obligations.some(item => item.id === 'task:foreign')).toBe(false)
      await expect(db.readLifeState({ obligationId: 'x'.repeat(513) })).rejects.toThrow('bounded')
      if (plans) {
        expect(view.execution?.plans).toHaveLength(268)
        expect(view.execution?.contracts).toHaveLength(268)
        expect(view.execution?.plans.some(item => item.id === 'active-000')).toBe(true)
        const historical = await db.readLifeState({ executionPlanId: 'terminal-000' })
        expect(historical.execution?.plans).toHaveLength(1)
        expect(historical.execution?.contracts).toHaveLength(1)
        expect(historical.obligations.find(item => item.id === 'task:terminal-000')).toBeDefined()
      }
      const ids: string[] = []
      let cursor: LifeObligationHistoryCursor | undefined
      do {
        const page = await db.readLifeObligationHistory({ cardId: 'alice', cursor, limit: 50 })
        ids.push(...page.items.map(item => item.id))
        cursor = page.nextCursor ?? undefined
      } while (cursor)
      expect(new Set(ids).size).toBe(200)
      expect((await db.readLifeState()).revision).toBe(view.revision)
      expect((await db.readLifeState()).owners).toEqual(view.owners)
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      expect((await db.readLifeState()).obligations.map(item => item.id)).toEqual(view.obligations.map(item => item.id))
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  }, 30000)
}

it('reads bounded old procedure roots and their recovery evidence together without admitting recovered authorship', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-procedure-old-roots-'))
  let db = await setupAlicizationDb(root, { cardId: 'alice' })
  try {
    await db.close()
    await seed(root, true)
    const handle = await new Promise<InstanceType<typeof sqlite.Database>>((resolve, reject) => {
      const database = new sqlite.Database(join(root, 'alicizations/cards/alice/alicization.db'), error => error ? reject(error) : resolve(database))
    })
    const run = (sql: string, values: unknown[] = []) => new Promise<void>((resolve, reject) => handle.run(sql, values, error => error ? reject(error) : resolve()))
    try {
      for (const id of ['task:terminal-000', 'task:terminal-001']) {
        await run('UPDATE life_obligations SET status=\'fulfilled\',source_ref_json=?,fulfilled_receipt_ref_json=? WHERE card_id=\'alice\' AND obligation_id=?', [JSON.stringify({ attemptId: 'original-attempt' }), JSON.stringify({ id: `verification:${id}`, verdict: 'satisfied', independent: true, verifiedAt: 1500 }), id])
      }
      await run('INSERT INTO life_work_step_results(card_id,plan_id,plan_revision,step_id,attempt_id,input_hash,observation_refs_json,result_json,state,created_at) VALUES (\'alice\',\'terminal-000\',1,\'recover\',\'original-attempt\',?,\'[]\',\'{"recoveredFromReality":true}\',\'verified\',1500)', ['a'.repeat(64)])
    }
    finally { await new Promise<void>((resolve, reject) => handle.close(error => error ? reject(error) : resolve())) }
    db = await setupAlicizationDb(root, { cardId: 'alice' })
    const roots = ['task:terminal-000', 'task:terminal-001']
    const view = await db.readLifeState({ obligationIds: roots })
    const source = (id: string) => ({ execution: { obligationId: id, generation: 1, attemptId: 'original-attempt', verificationId: `verification:${id}` } })
    expect(view.execution?.plans.some(plan => plan.id === 'terminal-000')).toBe(true)
    expect(view.execution?.results.some(result => result.planId === 'terminal-000' && result.output.recoveredFromReality === true)).toBe(true)
    expect(admitProcedureEvidence(source(roots[0]), view)).toBe(false)
    expect(admitProcedureEvidence(source(roots[1]), view)).toBe(true)
    expect(view.obligations.filter(goal => goal.status === 'fulfilled')).toHaveLength(2)
    const queuedScope = { obligationIds: [roots[0]] }
    const queuedRead = db.readLifeState(queuedScope)
    queuedScope.obligationIds[0] = roots[1]
    expect((await queuedRead).obligations.filter(goal => goal.status === 'fulfilled').map(goal => goal.id)).toEqual([roots[0]])
    await expect(db.readLifeState({ obligationIds: Array.from({ length: 33 }, (_, index) => `task:${index}`) })).rejects.toThrow('budget')
    await expect(db.readLifeState({ obligationIds: ['task:foreign', 'x'.repeat(513)] })).rejects.toThrow('bounded')
    expect((await db.readLifeState()).obligations.some(goal => roots.includes(goal.id))).toBe(false)
  }
  finally {
    await db.close()
    await rm(root, { recursive: true, force: true })
  }
}, 30000)
