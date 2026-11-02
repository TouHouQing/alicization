import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createAlicizationSkillLoader } from '../turn-os/skill-loader'
import { createAlicizationSkillRegistry } from '../turn-os/skill-registry'
import { createToolRegistry } from '../turn-os/tool-registry'
import { createSkillLifecyclePersistence } from './skill-lifecycle-repository'

const source = `---
id: skill.review
version: 1.0.0
description: Review a bounded result.
inputSchema: { type: object }
outputSchema: { type: object }
dependencies: []
requiredTools: []
permissions: []
risk: low
evaluationStatus: approved
activationStatus: active
---
Read only the accepted result.
`

function loader(directory: string, persistence: ReturnType<typeof createSkillLifecyclePersistence>) {
  const tools = createToolRegistry()
  return { tools, skills: createAlicizationSkillLoader({ skillsDirectory: directory, skillRegistry: createAlicizationSkillRegistry(), toolRegistry: tools, projection: { scope: 'card', executionChannel: 'skill', timeoutMs: 10000, supportsProgress: false, supportsCancellation: true, idempotency: 'none', providerToolName: item => item.id.replaceAll('.', '_'), adapterToolName: item => `${item.id.replaceAll('.', '_')}_adapter` }, availableTools: [], availablePermissions: [], ...persistence }) }
}

describe('skill registry decisions in the existing life writer', () => {
  it('retries unrelated writer contention while refusing to overwrite a competing lifecycle decision', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-skill-contention-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const persistence = createSkillLifecyclePersistence(db, 'alice')
      const snapshot = { version: 1 as const, items: [{ id: 'skill.review', version: '1.0.0', sourceHash: 'a'.repeat(64), evaluationStatus: 'approved' as const, activationStatus: 'revoked' as const }] }
      let contention = 'unrelated'
      let inject = true
      const contended = createSkillLifecyclePersistence({ ...db, commitLifeState: async (input, options) => {
        if (inject) {
          inject = false
          if (contention === 'unrelated')
            await db.commitLifeState({ cardId: 'alice', operationKey: 'unrelated-dialogue-write', changes: [], mutations: [{ type: 'ingress-accept', ingress: { id: 'unrelated-dialogue-write', source: 'dialogue', sourceKey: 'other', kind: 'system', occurredAt: Date.now(), payload: {} } }] })
          else
            await persistence.persistLifecycle({ ...snapshot, items: [{ ...snapshot.items[0], version: '2.0.0' }] })
        }
        return db.commitLifeState(input, options)
      } }, 'alice')
      await contended.persistLifecycle(snapshot)
      expect(await persistence.readLifecycle()).toEqual(snapshot)
      contention = 'competing'
      inject = true
      await expect(contended.persistLifecycle(snapshot)).rejects.toThrow('Another skill lifecycle decision changed')
      expect(await persistence.readLifecycle()).toMatchObject({ items: [{ version: '2.0.0', activationStatus: 'revoked' }] })
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
  it.each(['file', 'directory', 'changed'] as const)('records a %s source invalidated while the app was closed and prevents later silent activation', async (scenario) => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-skill-boot-missing-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    const directory = join(root, 'skills')
    const file = join(directory, 'review', 'SKILL.md')
    await mkdir(join(directory, 'review'), { recursive: true })
    try {
      await writeFile(file, source)
      await mkdir(join(directory, 'other'))
      await writeFile(join(directory, 'other', 'SKILL.md'), source.replace('skill.review', 'skill.other'))
      const original = loader(directory, createSkillLifecyclePersistence(db, 'alice'))
      await original.skills.activate('skill.review', '1.0.0')
      await db.close()
      if (scenario === 'changed')
        await writeFile(file, source.replace('Read only the accepted result.', 'Changed source without a new version.'))
      else await rm(file)
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      const missing = loader(directory, createSkillLifecyclePersistence(db, 'alice'))
      if (scenario === 'directory')
        await rm(join(directory, 'review'), { recursive: true })
      if (scenario === 'changed')
        await expect(missing.skills.projectProduction()).rejects.toThrow('source changed')
      else expect(await missing.skills.projectProduction()).toMatchObject([{ capabilityId: 'skill.other' }])
      expect(await createSkillLifecyclePersistence(db, 'alice').readLifecycle()).toMatchObject({ items: expect.arrayContaining([{ id: 'skill.review', version: '1.0.0', sourceHash: expect.any(String), evaluationStatus: 'failed', activationStatus: 'candidate' }, { id: 'skill.other', version: '1.0.0', sourceHash: expect.any(String), evaluationStatus: 'approved', activationStatus: 'active' }]) })
      if (scenario === 'changed') {
        const before = (await db.readLifeState()).revision
        await expect(missing.skills.projectProduction()).rejects.toThrow('source changed')
        expect((await db.readLifeState()).revision).toBe(before)
      }
      await mkdir(join(directory, 'review'), { recursive: true })
      await writeFile(file, source)
      expect(await missing.skills.projectProduction()).toMatchObject([{ capabilityId: 'skill.other' }])
      await expect(missing.skills.activate('skill.review', '1.0.0')).rejects.toThrow()
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      expect(await loader(directory, createSkillLifecyclePersistence(db, 'alice')).skills.projectProduction()).toMatchObject([{ capabilityId: 'skill.other' }])
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('preserves revocation across reopen and journal churn while keeping another card independent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-skill-lifecycle-'))
    let alice = await setupAlicizationDb(join(root, 'alice'), { cardId: 'alice' })
    const bob = await setupAlicizationDb(join(root, 'bob'), { cardId: 'bob' })
    try {
      const directory = join(root, 'skills')
      await mkdir(join(directory, 'review'), { recursive: true })
      await writeFile(join(directory, 'review', 'SKILL.md'), source)
      const original = loader(directory, createSkillLifecyclePersistence(alice, 'alice'))
      await original.skills.projectProduction()
      await original.skills.revoke('skill.review', '1.0.0')
      for (let batch = 0; batch < 4; batch++) {
        await alice.commitLifeState({ cardId: 'alice', operationKey: `churn:${batch}`, changes: [], mutations: Array.from({ length: 32 }, (_, index) => [
          { type: 'ingress-accept' as const, ingress: { id: `churn:${batch}:${index}`, kind: 'system' as const, source: 'other-events', sourceKey: `${batch}:${index}`, occurredAt: Date.now(), payload: {} } },
          { type: 'ingress-settle' as const, id: `churn:${batch}:${index}`, status: 'settled' as const },
        ]).flat() })
      }
      await alice.close()
      alice = await setupAlicizationDb(join(root, 'alice'), { cardId: 'alice' })
      const restored = loader(directory, createSkillLifecyclePersistence(alice, 'alice'))
      expect(await restored.skills.projectProduction()).toEqual([])
      expect(await restored.skills.discover({ productionOnly: false })).toMatchObject([{ activationStatus: 'revoked' }])
      const other = loader(directory, createSkillLifecyclePersistence(bob, 'bob'))
      expect(await other.skills.projectProduction()).toHaveLength(1)
      await writeFile(join(directory, 'review', 'SKILL.md'), source.replace('Read only the accepted result.', 'Changed implementation without reevaluation.'))
      const changed = loader(directory, createSkillLifecyclePersistence(alice, 'alice'))
      await expect(changed.skills.projectProduction()).rejects.toThrow('source changed')
      await expect(changed.skills.activate('skill.review', '1.0.0')).rejects.toThrow('source changed')
    }
    finally { await alice.close(); await bob.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('fails closed on persistence failure and never projects the candidate as executable', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-skill-write-fault-'))
    try {
      await mkdir(join(root, 'review'))
      await writeFile(join(root, 'review', 'SKILL.md'), source.replace('activationStatus: active', 'activationStatus: candidate'))
      const { skills, tools } = loader(root, { readLifecycle: async () => null, persistLifecycle: async () => { throw new Error('disk full') } })
      await expect(skills.activate('skill.review', '1.0.0')).rejects.toThrow('disk full')
      expect(await skills.discover()).toEqual([])
      expect(tools.resolveActive('skill.review')).toBeUndefined()
    }
    finally { await rm(root, { recursive: true, force: true }) }
  })
})
