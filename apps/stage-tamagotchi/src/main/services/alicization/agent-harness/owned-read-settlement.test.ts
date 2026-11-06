import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { isOwnedReadStopped, markOwnedReadStopped } from '../execution/owned-read-stop'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { runIsolatedProgram } from './isolated-program'

it('settles joined cancelled reads but preserves uncertainty for JSON claims and writes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-owned-read-'))
  const database = await setupAlicizationDb(root, { cardId: 'alice' })
  try {
    const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, now: Date.now })
    const signal = new AbortController().signal
    await life.admit({ cardId: 'alice', turnId: 'cancel', conversationId: 'test', messages: [{ role: 'user', content: '读取资料后停下' }] }, signal)
    let stopped = false
    const error = await runIsolatedProgram({ signal, timeoutMs: 30, code: 'return await call("read", {});', callTool: async (_name, _input, child) => {
      await new Promise<void>(resolve => child.aborted ? resolve() : child.addEventListener('abort', () => resolve(), { once: true }))
      await new Promise(resolve => setTimeout(resolve, 10))
      stopped = true
      child.throwIfAborted()
    } }).catch(error => error)
    expect(stopped).toBe(true)
    expect(isOwnedReadStopped(error)).toBe(true)
    expect(isOwnedReadStopped(JSON.parse(JSON.stringify({ nativeProcessTreeStopped: true })))).toBe(false)
    for (const [name, sideEffect, proof, expected] of [
      ['joined', 'read', error, 'settled'],
      ['forged', 'read', { nativeProcessTreeStopped: true }, 'uncertain'],
      ['mutation', 'mutation', markOwnedReadStopped({}), 'uncertain'],
    ] as const) {
      const action = await life.beforeAction({ cardId: 'alice', turnId: 'cancel', actionId: name, capabilityId: `tool.${name}`, parameters: {}, effectContract: { version: 'life-capability-effects-v1', sideEffect, retryClass: sideEffect === 'read' ? 'read-only' : 'manual-only', verifier: 'returned-observation', compensation: 'none' }, owners: (await database.readLifeState()).owners }, signal)
      await life.afterAction({ cardId: 'alice', id: action.id, interrupted: true, outcome: 'failure', output: { status: 'failed' }, stopped: proof })
      expect((await database.getLifeEffect(action.id))?.status).toBe(expected)
    }
  }
  finally {
    await database.close()
    await rm(root, { recursive: true, force: true })
  }
})
