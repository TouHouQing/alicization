import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifeSoulActivationRuntime } from './life-soul-activation-runtime'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
function validate(content: string) {
  if (!content.startsWith('SOUL:'))
    throw new Error('invalid soul')
}
async function writeAtomic(path: string, content: string) {
  await writeFile(`${path}.tmp`, content)
  await rename(`${path}.tmp`, path)
}

describe('sOUL file and committed identity continuity', () => {
  it('recovers a file replacement interrupted before database activation without losing revision continuity', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-soul-saga-'))
    const soulPath = join(root, 'SOUL.md')
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const runtime = createLifeSoulActivationRuntime({ cardId: 'alice', rootDir: root, soulPath, validate, writeAtomic, read: db.readLifeState, commit: db.commitLifeState })
      await runtime.write('SOUL:first')
      expect(await runtime.activate('SOUL:first')).toBe(1)
      const faulty = createLifeSoulActivationRuntime({ cardId: 'alice', rootDir: root, soulPath, validate, writeAtomic, read: db.readLifeState, commit: async (input) => {
        if (input.changes.some(change => change.owner === 'soul'))
          throw new Error('disk write interrupted')
        return db.commitLifeState(input)
      } })
      await expect(faulty.write('SOUL:next', hash('SOUL:first'))).rejects.toThrow('interrupted')
      expect(await readFile(soulPath, 'utf8')).toBe('SOUL:next')
      expect(JSON.parse((await db.readLifeState()).values['life:soul-active']).soulRevision).toBe(1)
    }
    finally { await db.close() }
    const restarted = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const runtime = createLifeSoulActivationRuntime({ cardId: 'alice', rootDir: root, soulPath, validate, writeAtomic, read: restarted.readLifeState, commit: restarted.commitLifeState })
      await runtime.recover()
      await runtime.recover()
      expect(await runtime.activate('SOUL:next')).toBe(2)
      expect((await restarted.readLifeState()).soulActivations).toHaveLength(0)
      await expect(runtime.write('SOUL:stale', hash('SOUL:first'))).rejects.toThrow('changed since')
    }
    finally {
      await restarted.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('preserves a manual file edit made while an automatic replacement is prepared', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-soul-conflict-'))
    const soulPath = join(root, 'SOUL.md')
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await writeFile(soulPath, 'SOUL:first')
      const runtime = createLifeSoulActivationRuntime({ cardId: 'alice', rootDir: root, soulPath, validate, writeAtomic, read: db.readLifeState, commit: async (input) => {
        const result = await db.commitLifeState(input)
        if (input.mutations?.some(item => item.type === 'soul-prepare'))
          await writeFile(soulPath, 'SOUL:manual')
        return result
      } })
      await runtime.activate('SOUL:first')
      await expect(runtime.write('SOUL:automatic')).rejects.toThrow('edited manually')
      await runtime.recover()
      expect(await readFile(soulPath, 'utf8')).toBe('SOUL:manual')
      expect((await db.readLifeState()).soulActivations[0].status).toBe('conflicted')
      expect(await runtime.activate('SOUL:manual')).toBe(2)
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})
