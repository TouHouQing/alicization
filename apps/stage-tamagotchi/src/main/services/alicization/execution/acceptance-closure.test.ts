import type { LifeObligation } from '../../../../shared/life-contracts'

import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { platform } from 'node:process'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { verifyLifeTaskCompletion } from '../life-task-verification-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { compileTaskAcceptance } from './acceptance-compiler'
import { probeOperationCapability } from './operation-capabilities'
import { admitVerifiedExecutionProcedure } from './procedure-admission'
import { createWorkPlanToolSpec } from './work-plan-tool'

describe('execution acceptance across task, writer, verification and procedural memory', () => {
  it.skipIf(platform !== 'win32').each(['<搜索结果中的确切路径>.txt', 'unknown?.txt', 'bad|filename.txt'])('refuses an impossible Windows artifact before persisting its goal: %s', async (name) => {
    const root = await mkdtemp(join(tmpdir(), 'acceptance-path-syntax-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await expect(db.upsertTaskThread({ id: 'unresolved-path', status: 'planned', kind: 'mixed', goal: 'Read the exact discovered file', metadata: { acceptanceCriteria: [{ id: 'read-complete', required: true, proofScope: 'bytes', predicate: { kind: 'file-matches-read', path: join(root, name), stepId: 'read-hit' } }] } })).rejects.toThrow()
      expect(await db.getTaskThread('unresolved-path')).toBeUndefined()
      expect((await db.readLifeState()).obligations).toHaveLength(0)
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it.each(['', '中文🙂\r\n', 'literal\n'])('independently verifies exact UTF-8 literal bytes, including empty content and line endings: %j', async (content) => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-literal-acceptance-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const path = join(root, 'exact.txt')
    try {
      const tool = createWorkPlanToolSpec(async input => db.upsertTaskThread({ id: 'literal', status: 'planned', kind: 'mixed', goal: input.goal, metadata: { acceptanceCriteria: input.criteria } }))
      await tool.execute(tool.parameters.parse({ goal: 'Retain the exact accepted UTF-8 bytes', criteria: [{ id: 'exact', required: true, proofScope: 'bytes', predicate: { kind: 'file-content', path, content } }], steps: [{ id: 'write', dependsOn: [], capabilityId: 'tool.filesystem_write_file', input: { path, content } }] }))
      const initial = (await db.getTaskThread('literal'))!
      await writeFile(path, content === '' ? 'extra bytes' : content.replace(/\r\n|\n/u, '\n\n'))
      await db.upsertTaskThread({ ...initial, status: 'completed', expectedUpdatedAt: initial.updatedAt })
      const verify = () => verifyLifeTaskCompletion({ cardId: 'alice', threadId: initial.id, read: db.readLifeState, commit: db.commitLifeState, readSetting: db.getMetaValue })
      expect(await verify()).toMatchObject({ verdict: 'not-satisfied', independent: true })
      await writeFile(path, content)
      const goal = (await db.readLifeState()).obligations.find(item => item.threadId === initial.id)!
      await db.commitLifeState({ cardId: 'alice', operationKey: 'verify-correct-literal', changes: [], mutations: [{ type: 'obligation-update', id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, status: 'verifying' }] })
      expect(await verify()).toMatchObject({ verdict: 'satisfied', independent: true })
      expect((await db.readLifeState()).execution?.contracts[0].criteria[0].predicate).toEqual({ kind: 'file-bytes', path, sha256: createHash('sha256').update(content, 'utf8').digest('hex') })
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('requires exact directory membership rather than accepting a partial or extra-file inventory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-directory-acceptance-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const path = join(root, 'classified')
    try {
      await mkdir(path)
      const initial = await db.upsertTaskThread({ id: 'classify', status: 'planned', kind: 'mixed', goal: 'Prepare exactly the requested two members', metadata: { acceptanceCriteria: [{ id: 'members', required: true, proofScope: 'structure', predicate: { kind: 'directory-members', path, names: ['first.txt', 'second.txt'], exact: true } }] } })
      await writeFile(join(path, 'first.txt'), 'first')
      await db.upsertTaskThread({ ...initial, status: 'completed', expectedUpdatedAt: initial.updatedAt })
      const verify = async () => {
        const goal = (await db.readLifeState()).obligations[0]
        if (goal.status === 'blocked')
          await db.commitLifeState({ cardId: 'alice', operationKey: `verify-members:${goal.revision}`, changes: [], mutations: [{ type: 'obligation-update', id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, status: 'verifying' }] })
        return verifyLifeTaskCompletion({ cardId: 'alice', threadId: 'classify', read: db.readLifeState, commit: db.commitLifeState, readSetting: db.getMetaValue })
      }
      expect((await verify())?.verdict).toBe('not-satisfied')
      await writeFile(join(path, 'second.txt'), 'second')
      await writeFile(join(path, 'extra.txt'), 'extra')
      expect((await verify())?.verdict).toBe('not-satisfied')
      await rm(join(path, 'extra.txt'))
      expect(await verify()).toMatchObject({ verdict: 'satisfied', independent: true })
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('keeps a completed adapter blocked until all artifacts and structure match the frozen acceptance', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-acceptance-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const first = join(root, 'report.json')
      const second = join(root, 'notes.txt')
      const criteria = [
        { id: 'report', required: true, predicate: { kind: 'json-structure', path: first, requiredKeys: ['sources', 'conclusion'] }, proofScope: 'structure' },
        { id: 'notes', required: true, predicate: { kind: 'file-bytes', path: second, sha256: createHash('sha256').update('checked').digest('hex') }, proofScope: 'bytes' },
      ]
      const initial = await db.upsertTaskThread({ id: 'research', goal: 'Write the report and notes', kind: 'codebase-investigation', status: 'planned', metadata: { acceptanceCriteria: criteria } })
      await writeFile(first, JSON.stringify({ sources: [] }))
      await writeFile(second, 'checked')
      await db.upsertTaskThread({ ...initial, status: 'completed', expectedUpdatedAt: initial.updatedAt })
      let result = await verifyLifeTaskCompletion({ cardId: 'alice', threadId: initial.id, read: db.readLifeState, commit: db.commitLifeState, readSetting: db.getMetaValue })
      expect(result?.verdict).toBe('not-satisfied')
      const completed = (await db.getTaskThread(initial.id))!
      expect(admitVerifiedExecutionProcedure(completed, await db.readLifeState())).toBe(false)
      await expect(db.upsertTaskThread({ ...completed, status: 'running', metadata: { acceptanceCriteria: [criteria[1]] }, expectedUpdatedAt: completed.updatedAt })).rejects.toThrow('accepted execution contract')
      await writeFile(first, JSON.stringify({ sources: [], conclusion: 'ready' }))
      const goal = (await db.readLifeState()).obligations.find(item => item.threadId === initial.id)!
      await db.commitLifeState({ cardId: 'alice', operationKey: 'verify-again', changes: [], mutations: [{ type: 'obligation-update', id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, status: 'verifying' }] })
      result = await verifyLifeTaskCompletion({ cardId: 'alice', threadId: initial.id, read: db.readLifeState, commit: db.commitLifeState, readSetting: db.getMetaValue })
      expect(result?.verdict).toBe('satisfied')
      expect(admitVerifiedExecutionProcedure(completed, await db.readLifeState())).toBe(true)
      const fulfilled = (await db.readLifeState()).obligations[0]
      expect(admitVerifiedExecutionProcedure({ ...completed, attemptId: 'old-attempt' }, await db.readLifeState())).toBe(false)
      expect(admitVerifiedExecutionProcedure(completed, { ...await db.readLifeState(), obligations: [{ ...fulfilled, invalidatedBy: { cardId: 'alice', kind: 'memory_facts', id: 'withdrawn', version: '1' } }] })).toBe(false)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('cannot upgrade a byte check into a quality judgment or admit an unverified completion', () => {
    expect(() => compileTaskAcceptance({ cardId: 'alice', rootObligationId: 'task:1', obligationGeneration: 1, revision: 1, sourceInputIds: [], permittedResourceIds: [], permittedEffectPolicyId: 'local', stopConditions: [], criteria: [{ id: 'a', required: true, proofScope: 'quality', predicate: { kind: 'file-bytes', path: join(tmpdir(), 'x'), sha256: 'a'.repeat(64) } }] })).toThrow('proof scope')
    expect(admitVerifiedExecutionProcedure({ id: 'x', status: 'completed', attemptId: 'one' } as never, { cardId: 'alice', obligations: [{ threadId: 'x', sourceAttemptId: 'one', status: 'verifying' } as LifeObligation] } as never)).toBe(false)
  })

  it('withholds unsupported and unauthorized Windows keyboard operations from the active model surface', () => {
    expect(createCanonicalToolRegistry({ platform: 'win32' }).get('tool.desktop_press_keys')?.activationStatus).toBe('disabled')
    expect(createCanonicalToolRegistry({ platform: 'win32', windowsKeyboardReady: true }).get('tool.desktop_press_keys')?.activationStatus).toBe('disabled')
    expect(createCanonicalToolRegistry({ platform: 'darwin' }).get('tool.desktop_press_keys')?.activationStatus).toBe('active')
    expect(createCanonicalToolRegistry({ platform: 'darwin' }).get('tool.browser_upload_files')?.activationStatus).toBe('disabled')
    expect(createCanonicalToolRegistry({ platform: 'win32' }).get('tool.desktop_wait')?.activationStatus).toBe('active')
    expect(createCanonicalToolRegistry({ platform: 'linux' }).resolveActive('tool.browser_type_text')).toBeUndefined()
    expect(probeOperationCapability('desktop_undefined_operation', { platform: 'win32' }).status).toBe('unsupported')
  })
})
