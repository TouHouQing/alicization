import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { errorMessageFrom } from '@moeru/std'
import { describe, expect, it } from 'vitest'

import { callLocalFilesystem } from '../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from './db'
import { isReadOnlyNonActionQuote } from './life-read-only-turn-scope'
import { createLifeReplyGroundingRuntime } from './life-reply-grounding-runtime'
import { createLifeTurnRuntime } from './life-turn-runtime'

describe('bounded non-action evidence from the complete execution ledger', () => {
  it.each(['other-read', 'write'])('grounds actual read-only scope, fences publication and rejects a false absence after %s', async (extra) => {
    const root = await mkdtemp(join(tmpdir(), 'life-read-scope-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    const path = join(root, 'missing.txt')
    const text = '我没有去其他地方查找，也没有创建文件。'
    try {
      const life = createLifeTurnRuntime({ getIngress: db.getLifeIngress, readUserInput: db.getLifeUserInput, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, now: Date.now })
      await life.admit({ cardId: 'alice', turnId: 'read', conversationId: 'qa', messages: [{ role: 'user', content: `请读这个测试文件：${path}。` }] }, signal)
      const execute = async (id: string, toolName: 'read_file' | 'write_file', parameters: Record<string, string>) => {
        const prepared = await life.beforeAction({ cardId: 'alice', turnId: 'read', actionId: id, capabilityId: `tool.filesystem_${toolName}`, parameters }, signal)
        try {
          const result = await callLocalFilesystem({ toolName, arguments: parameters, workspace: root, signal })
          await life.afterAction({ cardId: 'alice', id: prepared.id, outcome: result.ok ? 'success' : 'error', interrupted: false, output: { ...result.structuredContent, ok: result.ok, operation: toolName } })
        }
        catch (error) {
          if (toolName !== 'read_file' || (error as NodeJS.ErrnoException).code !== 'ENOENT')
            throw error
          await life.afterAction({ cardId: 'alice', id: prepared.id, outcome: 'error', interrupted: false, output: { ok: false, operation: 'read_file', path: parameters.path, errorCode: 'ENOENT', errorMessage: errorMessageFrom(error) } })
        }
        return prepared.id
      }
      const readId = await execute('read-missing', 'read_file', { path })
      let binding: { kind: string, id: string, version: string } | null = null
      const review = createLifeReplyGroundingRuntime({ getIngress: db.getLifeIngress, readUserInput: db.getLifeUserInput, readTurnEffects: db.readLifeTurnExecutionEffects, read: db.readLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), commit: db.commitLifeState, now: Date.now, generate: async () => JSON.stringify({ claims: [{ kind: 'execution-step-outcome', quote: text, binding, meaningMatchesBinding: binding !== null }] }) })
      const accepted = await review({ cardId: 'alice', turnId: 'read', text, owners: (await db.readLifeState()).owners, signal })
      expect(accepted.accepted).toBe(true)
      const audit = await db.getLifeIngress(accepted.reviewId!)
      expect(audit!.payload.locallyGroundedNonActions).toEqual([expect.objectContaining({ reviewBinding: null, reviewMeaningMatches: false, scopeHash: expect.any(String) })])
      expect(audit!.payload.readOnlyTurnScopeHash).toEqual(expect.any(String))
      await expect(db.appendConversationTurn({ cardId: 'alice', sessionId: 'qa', turnId: 'read', assistantText: text, lifeReplyFence: { reviewId: accepted.reviewId!, owners: (await db.readLifeState()).owners } })).resolves.toBeUndefined()
      if (extra === 'other-read') {
        await execute('read-another', 'read_file', { path: join(root, 'other.txt') })
      }
      else {
        await execute('create-another', 'write_file', { path: join(root, 'created.txt'), content: '实际创建' })
        expect(await readFile(join(root, 'created.txt'), 'utf8')).toBe('实际创建')
      }
      await expect(db.appendConversationTurn({ cardId: 'alice', sessionId: 'qa', turnId: 'read', assistantText: text, lifeReplyFence: { reviewId: accepted.reviewId!, owners: (await db.readLifeState()).owners } })).rejects.toThrow('Execution scope changed')
      const effect = await db.getLifeEffect(readId)
      binding = { kind: 'effect', id: effect!.id, version: String(effect!.generation) }
      expect((await review({ cardId: 'alice', turnId: 'read', text, owners: (await db.readLifeState()).owners, signal })).accepted).toBe(false)
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it.each(['我没有创建文件，但我上传了资料。', '昨天我没有创建文件。', '我不会创建文件。', '我没有说我创建了文件。'])('does not turn another assertion or time period into current read-only evidence: %s', (text) => {
    expect(isReadOnlyNonActionQuote(text)).toBe(false)
  })
})
