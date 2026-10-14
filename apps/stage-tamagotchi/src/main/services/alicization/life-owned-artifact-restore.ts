import type { LifeCommitInput, LifeCommitReceipt, LifeEffect, LifeStateView } from '../../../shared/life-contracts'
import type { LifeArtifactCommand } from '../../../shared/life-events'

import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { copyFile, lstat, readFile, realpath } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { platform } from 'node:process'

import { resolveOwnedArtifactDirectory } from './owned-artifact-path'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
async function contentHash(path: string) {
  try {
    const info = await lstat(path)
    if (!info.isFile() || info.isSymbolicLink() || info.size > 256_000)
      throw new Error('Restoration requires an immutable application-owned note')
    return hash(await readFile(path, 'utf8'))
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return null
    throw error
  }
}

export function createLifeOwnedArtifactRestore(options: {
  read: () => Promise<LifeStateView>
  getEffect: (id: string) => Promise<LifeEffect | null>
  commit: (input: LifeCommitInput) => Promise<LifeCommitReceipt>
  workspace: (cardId: string) => string
  copy?: (source: string, target: string) => Promise<void>
}) {
  const restore = async (input: LifeArtifactCommand) => {
    const view = await options.read()
    const goal = view.obligations.find(goal => goal.id === input.goalId)
    if (view.cardId !== input.cardId || !goal || goal.kind !== 'personal-project' || goal.invalidationMode !== 'forget' || goal.generation !== input.expectedGeneration || goal.proof.kind !== 'file' || goal.proof.contentHash !== input.expectedHash || !goal.proof.path)
      throw new Error('The withdrawn artifact or its generation changed')
    const root = await resolveOwnedArtifactDirectory(options.workspace(input.cardId))
    const directory = await realpath(dirname(goal.proof.path))
    const sameDirectory = platform === 'win32' ? directory.toLowerCase() === root.toLowerCase() : directory === root
    const name = basename(goal.proof.path)
    if (!sameDirectory || !/^[a-f\d]{64}\.(?:md|svg)$/u.test(name))
      throw new Error('Artifact restoration escaped the application-owned workspace')
    const withdrawalId = `artifact-withdrawal:${hash(JSON.stringify({ cardId: input.cardId, goalId: goal.id, path: goal.proof.path, contentHash: goal.proof.contentHash }))}`
    const withdrawal = await options.getEffect(withdrawalId)
    if (withdrawal?.status !== 'settled' || withdrawal.receipt?.outcome !== 'quarantined')
      throw new Error('Reconcile the original withdrawal before restoring this document')
    const vault = await resolveOwnedArtifactDirectory(join(root, '.withdrawn', withdrawalId.split(':')[1]))
    const source = join(vault, name)
    const target = join(root, name)
    if (await contentHash(source) !== input.expectedHash)
      throw new Error('The quarantined document changed; restoration is held for review')
    const id = `artifact-restore:${hash(JSON.stringify({ cardId: input.cardId, goalId: goal.id, generation: goal.generation, withdrawalId }))}`
    const previous = await options.getEffect(id)
    const existingHash = await contentHash(target)
    if (previous) {
      if (previous.payload.goalId !== goal.id || previous.payload.contentHash !== input.expectedHash)
        throw new Error('Artifact restoration operation was reused for another document')
      if (existingHash !== input.expectedHash)
        return { status: 'held' }
      if (previous.status === 'dispatched' || previous.status === 'uncertain')
        await options.commit({ cardId: input.cardId, operationKey: `reconcile:${id}`, changes: [], mutations: [{ type: 'effect-transition', id, expected: previous.status, status: 'settled', receipt: { outcome: 'restored', actualHash: existingHash, readOnlyReconciliation: true, activitiesRemainWithdrawn: true } }] })
      return { status: 'restored' }
    }
    if (existingHash)
      return { status: 'held' }
    await options.commit({ cardId: input.cardId, operationKey: `dispatch:${id}`, expectedRevision: view.revision, changes: [], mutations: [{ type: 'effect-prepare', effect: { id, operationKey: id, kind: 'index', turnId: goal.threadId, actionId: 'restore-owned-artifact', generation: goal.generation, payload: { capability: 'owned-note-restore', goalId: goal.id, contentHash: input.expectedHash, source, target, activitiesRemainWithdrawn: true } } }, { type: 'effect-transition', id, expected: 'prepared', status: 'claimed' }, { type: 'effect-transition', id, expected: 'claimed', status: 'dispatched' }] })
    try {
      // COPYFILE_EXCL cannot overwrite a file created after our preflight. The
      // quarantine remains available; restoring a document never revives work.
      await (options.copy ?? ((from, to) => copyFile(from, to, constants.COPYFILE_EXCL)))(source, target)
      const actual = await contentHash(target)
      if (actual !== input.expectedHash)
        throw new Error('Restored document failed its independent content verification')
      await options.commit({ cardId: input.cardId, operationKey: `settle:${id}`, changes: [], mutations: [{ type: 'effect-transition', id, expected: 'dispatched', status: 'settled', receipt: { outcome: 'restored', actualHash: actual, activitiesRemainWithdrawn: true } }] })
      return { status: 'restored' }
    }
    catch (error) {
      await options.commit({ cardId: input.cardId, operationKey: `uncertain:${id}`, changes: [], mutations: [{ type: 'effect-transition', id, expected: 'dispatched', status: 'uncertain', receipt: { outcome: 'restore-requires-verification', activitiesRemainWithdrawn: true } }] })
      throw error
    }
  }
  async function reconcile(cardId: string) {
    const view = await options.read()
    if (view.cardId !== cardId)
      throw new Error('Artifact recovery crossed the card boundary')
    const outcomes = []
    for (const effect of view.effects.filter(item => item.payload.capability === 'owned-note-restore' && ['dispatched', 'uncertain'].includes(item.status)).slice(0, 32)) {
      const goal = view.obligations.find(item => item.id === effect.payload.goalId)
      if (!goal || !goal.proof.contentHash || goal.generation !== effect.generation) {
        outcomes.push({ id: effect.id, status: 'held' })
        continue
      }
      // This invocation is guaranteed to have an existing intent. Its recovery
      // branch only reads the files and settles a receipt; it never copies.
      try {
        const result = await restore({ cardId, goalId: goal.id, expectedGeneration: goal.generation, expectedHash: goal.proof.contentHash, operationId: `reconcile:${effect.id}` })
        outcomes.push({ id: effect.id, status: result.status })
      }
      catch { outcomes.push({ id: effect.id, status: 'held' }) }
    }
    return outcomes
  }
  return Object.assign(restore, { reconcile })
}
