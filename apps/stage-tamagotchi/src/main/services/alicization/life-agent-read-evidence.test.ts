import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { lifeAgentReadEvidence } from './life-agent-read-evidence'
import { createLifeTurnRuntime } from './life-turn-runtime'

it('grounds an isolated return in its own actual read receipts and rejects borrowed or duplicated sources', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-read-result-proof-'))
  const database = await setupAlicizationDb(root, { cardId: 'alice' })
  const signal = new AbortController().signal
  const contract = { version: 'life-capability-effects-v1' as const, sideEffect: 'read' as const, retryClass: 'read-only' as const, verifier: 'returned-observation' as const, compensation: 'none' as const }
  try {
    const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, now: Date.now })
    await life.admit({ cardId: 'alice', turnId: 'turn', conversationId: 'session', messages: [{ role: 'user', content: '读取并计算测试资料' }] }, signal)
    const path = join(root, 'source.json')
    await writeFile(path, '{"value":46}')
    const parent = await life.beforeAction({ cardId: 'alice', turnId: 'turn', actionId: 'program', capabilityId: 'tool.life_programmatic_read', parameters: {}, effectContract: contract }, signal)
    const sources = []
    for (const actionId of ['program:read:1', 'unrelated:read:1']) {
      const child = await life.beforeAction({ cardId: 'alice', turnId: 'turn', actionId, capabilityId: 'tool.filesystem_read_file', parameters: { path }, effectContract: contract }, signal)
      const content = await readFile(path, 'utf8')
      await life.afterAction({ cardId: 'alice', id: child.id, interrupted: false, outcome: 'success', output: { ok: true, finalStatus: 'completed', operation: 'read_file', content, contentHash: createHash('sha256').update(content).digest('hex'), verifiedPath: path } })
      sources.push(child.id)
    }
    await life.afterAction({ cardId: 'alice', id: parent.id, interrupted: false, outcome: 'success', output: { ok: true, finalStatus: 'completed', type: 'life-programmatic-read', result: { sum: 46 }, calls: 1, effectRefs: [sources[0]] } })
    const view = await database.readLifeState()
    const effect = (await database.getLifeEffect(parent.id))!
    expect(lifeAgentReadEvidence(effect, view)).toMatchObject({ evidenceScope: 'isolated-program-return-and-actual-read-sources', independentGoalProof: false })
    const borrowed = structuredClone(effect)
    ;(borrowed.receipt!.output as any).effectRefs = [sources[1]]
    expect(lifeAgentReadEvidence(borrowed, view)).toBeNull()
    const duplicated = structuredClone(effect)
    Object.assign(duplicated.receipt!.output as object, { calls: 2, effectRefs: [sources[0], sources[0]] })
    expect(lifeAgentReadEvidence(duplicated, view)).toBeNull()
    const forgedWrite = structuredClone(effect)
    forgedWrite.payload.effectContract = { ...contract, sideEffect: 'mutation' }
    expect(lifeAgentReadEvidence(forgedWrite, view)).toBeNull()
  }
  finally {
    await database.close()
    await rm(root, { recursive: true, force: true })
  }
})
