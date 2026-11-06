import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'

import sqlite3 from 'sqlite3'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { personaDigest, readPersonaDevelopment, zeroPersonaEffects } from './schema'

it('keeps a cross-day review window bounded over 100,000 actual independent SQLite witnesses', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-persona-scale-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice', rootDir: root })
  const connection = await new Promise<sqlite3.Database>((resolve, reject) => {
    const value = new sqlite3.Database(join(root, 'alicization.db'), error => error ? reject(error) : resolve(value))
  })
  const run = (sql: string, parameters: unknown[] = []) => new Promise<void>((resolve, reject) => connection.run(sql, parameters, error => error ? reject(error) : resolve()))
  const facet = { id: 'scale-work-habit', kind: 'relationship-habit' as const, subject: 'relationship' as const, label: '在工作停顿时再接上话题', context: 'focused-work' as const, exceptions: [], effects: { ...zeroPersonaEffects(), initiative: -0.1 } }
  const text = '一起工作时，在停顿后自然接话更合适。'
  const now = Date.now() - 1000
  try {
    const [source] = await db.upsertMemoryReflections([{ cardId: 'alice', turnId: 'first-real-root', sourceKind: 'reply', targetScope: 'relationship', summary: text, lesson: text, status: 'confirmed', confidence: 0.9 }])
    await db.commitLifeState({ cardId: 'alice', operationKey: 'scale-initial', changes: [], mutations: [{ type: 'persona-development', operation: { action: 'observe', observations: [{ facet, source: { cardId: 'alice', kind: 'memory_reflections', id: source.id, version: String(source.updatedAt) }, polarity: 'support' }] } }] })
    await run('BEGIN IMMEDIATE')
    for (let offset = 0; offset < 100_000; offset += 1000) {
      const records = Array.from({ length: 1000 }, (_, index) => {
        const id = `scale-${offset + index}`
        const at = now - (offset + index) * 60_000
        const rootId = `turn:${id}`
        return { id, at, rootId, day: new Date(at).toLocaleDateString('en-CA'), hash: personaDigest({ rootId, occurredAt: at, text, context: 'companionship', selfChosen: false, positive: true, strength: 0.6, feedback: null }) }
      })
      const payload = JSON.stringify(records)
      await run(`INSERT INTO memory_reflections(id,card_id,turn_id,source_kind,target_scope,summary,lesson,status,confidence,created_at,updated_at) SELECT json_extract(value,'$.id'),'alice',json_extract(value,'$.id'),'reply','relationship',?,?,'confirmed',0.9,json_extract(value,'$.at'),json_extract(value,'$.at') FROM json_each(?)`, [text, text, payload])
      await run(`INSERT INTO life_persona_evidence(card_id,facet_id,root_id,polarity,source_kind,source_id,source_version,source_hash,strength,occurred_at,context,facet_version,evidence_day) SELECT 'alice',?,json_extract(value,'$.rootId'),'support','memory_reflections',json_extract(value,'$.id'),CAST(json_extract(value,'$.at') AS TEXT),json_extract(value,'$.hash'),0.6,json_extract(value,'$.at'),'focused-work',1,json_extract(value,'$.day') FROM json_each(?)`, [facet.id, payload])
    }
    await run('COMMIT')
    const started = performance.now()
    await db.commitLifeState({ cardId: 'alice', operationKey: 'scale-review', changes: [], mutations: [{ type: 'persona-development', operation: { action: 'reconcile' } }] })
    const reviewMs = performance.now() - started
    const state = readPersonaDevelopment((await db.readLifeState()).values)
    expect(state.facets[0]).toMatchObject({ independentEvents: 128, distinctDays: 16, status: 'supported', successfulTrials: 0 })
    expect(state.facets[0].sources).toHaveLength(16)
    expect(reviewMs).toBeLessThan(10_000)
    const output = resolve('output')
    await mkdir(output, { recursive: true })
    await writeFile(join(output, 'personality-scale.json'), JSON.stringify({ scope: '100000 independently identified synthetic reviewed reflections and matching provenance rows in real SQLite; no model quality or elapsed-day claim', witnesses: 100000, decisionWindow: 128, representedDays: 16, reviewMs, passed: true }, null, 2))
  }
  finally {
    await new Promise<void>((resolve, reject) => connection.close(error => error ? reject(error) : resolve()))
    await db.close()
    await rm(root, { recursive: true, force: true })
  }
}, 120000)
