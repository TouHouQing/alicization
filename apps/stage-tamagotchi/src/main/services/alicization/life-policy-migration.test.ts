import type { AlicizationSelfRevisionEvent } from './self-evolution/self-revision-ledger'

import { createHash } from 'node:crypto'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifeSoulActivationRuntime } from './life-soul-activation-runtime'
import { writeAlicizationAtomicContent } from './runtime-atomic-write'
import { createAlicizationRuntimeSelfEvolutionComposition } from './runtime-self-evolution-composition'
import { buildAlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

describe('policy proof migration', () => {
  it('preserves identity and sources while returning an unsupported v4 active policy to review', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-policy-v5-migration-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice', rootDir: root })
    const soulPath = join(root, 'SOUL.md')
    try {
      await createLifeSoulActivationRuntime({ cardId: 'alice', rootDir: root, soulPath, validate: () => {}, writeAtomic: (path, content) => writeAlicizationAtomicContent({ path, content, category: 'qa' }), read: db.readLifeState, commit: db.commitLifeState, getEffect: db.getLifeEffect }).write('same continuing identity')
      const soulBefore = await readFile(soulPath, 'utf8')
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'likes', object: '音乐', confidence: 0.95 }], 'rule')
      const fact = (await db.readLifeFactVersions({ cardId: 'alice' }))[0]
      const event: AlicizationSelfRevisionEvent = { version: 'self-revision-event-v1', id: 'old-growth', sourceTurnId: 'experience', decisionTraceId: 'trace', domain: 'self-model', taskAction: 'revise', resultStatus: 'completed', evidence: { supportCount: 1, contradictionCount: 0, verificationBasis: ['cleaned-memory'], supportingFactIds: [fact.factId] }, proposedRevision: { summary: '保守召回', lifecycleState: 'verifying', nextLifecycleState: 'settled' }, verifier: { status: 'validated', mayInternalize: true, mayValidateOnly: false }, appliedTargets: [fact.factId], rollbackPlan: ['restore-previous-policy'] }
      const growth = createAlicizationRuntimeSelfEvolutionComposition({ now: Date.now, snapshotMetaKey: 'legacy-growth', alicizationDb: db }).selfEvolutionRuntime
      const candidate = await growth.proposeVersion({ event, patch: buildAlicizationSelfRevisionStatePatch({ event }) })
      const snapshot = await growth.getSnapshot()
      snapshot.candidates[0].status = 'active'
      snapshot.activeCandidateId = candidate.id
      const value = JSON.stringify(snapshot)
      const path = db.dbPath
      await db.close()
      const connection = await new Promise<sqlite3.Database>((resolve, reject) => { const sql = new sqlite3.Database(path, error => error ? reject(error) : resolve(sql)) })
      const run = (sql: string, args: unknown[] = []) => new Promise<void>((resolve, reject) => connection.run(sql, args, error => error ? reject(error) : resolve()))
      try {
        await run('UPDATE alicization_meta SET value = \'4\' WHERE key = \'life.schema.version\'')
        await run('UPDATE alicization_meta SET value = ? WHERE key = \'legacy-growth\'', [value])
        await run('UPDATE life_owner_versions SET content_hash = ? WHERE card_id = \'alice\' AND owner = \'growth\'', [createHash('sha256').update(value).digest('hex')])
      }
      finally { await new Promise<void>((resolve, reject) => connection.close(error => error ? reject(error) : resolve())) }
      db = await setupAlicizationDb(root, { cardId: 'alice', rootDir: root })
      expect(await db.getMetaValue('life.schema.version')).toBe('5')
      const view = await db.readLifeState()
      const migrated = JSON.parse(view.values['legacy-growth'])
      expect(migrated.activeCandidateId).toBeNull()
      expect(migrated.candidates[0]).toMatchObject({ id: candidate.id, status: 'shadow', sourceEvidence: snapshot.candidates[0].sourceEvidence })
      expect(migrated.candidates[0].validation.activationBlockedReasons).toContain('self-evolution:paired-evaluation-required')
      expect(await readFile(soulPath, 'utf8')).toBe(soulBefore)
      expect((await readdir(join(root, 'backups'))).some(name => /^life-schema-4-to-5-.*\.db$/u.test(name))).toBe(true)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})
