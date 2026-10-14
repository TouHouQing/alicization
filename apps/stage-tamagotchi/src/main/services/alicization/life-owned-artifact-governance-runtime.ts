import type { LifeCommitInput, LifeCommitReceipt, LifeEffect, LifeStateView } from '../../../shared/life-contracts'

import { createHash } from 'node:crypto'
import { lstat, readFile, realpath, rename } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

import { errorMessageFrom } from '@moeru/std'

import { resolveOwnedArtifactDirectory } from './owned-artifact-path'

async function artifactHash(path: string) {
  try {
    const stat = await lstat(path)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 256_000)
      throw new Error('Artifact is outside the immutable owned-note boundary')
    return createHash('sha256').update(await readFile(path)).digest('hex')
  }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
      return null
    throw error
  }
}

// Source withdrawal authorizes reversible relocation of immutable app-owned
// notes only. Edited files and files outside this card's root are held for review.
// A dispatched move is reconciled by reading both locations, never replayed.
export function createLifeOwnedArtifactGovernanceRuntime(options: {
  read: () => Promise<LifeStateView>
  getEffect: (id: string) => Promise<LifeEffect | null>
  commit: (input: LifeCommitInput) => Promise<LifeCommitReceipt>
  workspace: (cardId: string) => string
  now: () => number
  move?: (from: string, to: string) => Promise<void>
}) {
  async function reconcile(cardId: string) {
    const view = await options.read()
    if (view.cardId !== cardId)
      throw new Error('Artifact governance crossed the card boundary')
    const goals = view.obligations.filter(goal => goal.kind === 'personal-project' && goal.invalidationMode === 'forget' && goal.proof.kind === 'file' && goal.proof.path && goal.proof.contentHash)
    const outcomes: Array<{ goalId: string, status: 'quarantined' | 'absent' | 'held' }> = []
    for (const goal of goals.slice(0, 32)) {
      const id = `artifact-withdrawal:${createHash('sha256').update(JSON.stringify({ cardId, goalId: goal.id, path: goal.proof.path, contentHash: goal.proof.contentHash })).digest('hex')}`
      const previous = await options.getEffect(id)
      if (previous?.status === 'settled' || previous?.status === 'failed')
        continue
      const root = await resolveOwnedArtifactDirectory(options.workspace(cardId))
      const sourceDirectory = await realpath(dirname(goal.proof.path!))
      const name = basename(goal.proof.path!)
      const sameDirectory = process.platform === 'win32' ? root.toLowerCase() === sourceDirectory.toLowerCase() : root === sourceDirectory
      if (!sameDirectory || !/^[a-f\d]{64}\.(?:md|svg)$/u.test(name)) {
        outcomes.push({ goalId: goal.id, status: 'held' })
        continue
      }
      const vault = await resolveOwnedArtifactDirectory(join(root, '.withdrawn', id.split(':')[1]))
      const source = join(root, name)
      const target = join(vault, name)
      const sourceHash = await artifactHash(source)
      const targetHash = await artifactHash(target)
      const expectedHash = goal.proof.contentHash!
      if (sourceHash && sourceHash !== expectedHash || targetHash && targetHash !== expectedHash) {
        outcomes.push({ goalId: goal.id, status: 'held' })
        continue
      }
      if (previous?.status === 'dispatched' || previous?.status === 'uncertain') {
        if (!sourceHash && targetHash === expectedHash) {
          await options.commit({ cardId, operationKey: `reconcile:${id}`, changes: [], mutations: [{ type: 'effect-transition', id, expected: previous.status, status: 'settled', receipt: { outcome: 'quarantined', path: target, actualHash: targetHash, readOnlyReconciliation: true } }] })
          outcomes.push({ goalId: goal.id, status: 'quarantined' })
        }
        else { outcomes.push({ goalId: goal.id, status: 'held' }) }
        continue
      }
      if (previous && previous.status !== 'prepared') {
        outcomes.push({ goalId: goal.id, status: 'held' })
        continue
      }
      if (!previous) {
        await options.commit({ cardId, operationKey: `prepare:${id}`, changes: [], mutations: [{ type: 'effect-prepare', effect: { id, operationKey: id, kind: 'index', turnId: goal.threadId, actionId: 'withdraw-owned-artifact', generation: goal.generation, payload: { capability: 'owned-note-quarantine', source, target, contentHash: expectedHash, reversible: true, sourceEvidence: goal.invalidatedBy } } }] })
      }
      await options.commit({ cardId, operationKey: `dispatch:${id}`, changes: [], mutations: [{ type: 'effect-transition', id, expected: 'prepared', status: 'claimed', leaseUntil: options.now() + 60_000 }, { type: 'effect-transition', id, expected: 'claimed', status: 'dispatched', leaseUntil: options.now() + 60_000 }] })
      try {
        if (sourceHash) {
          if (targetHash)
            throw new Error('Both artifact locations exist; reconciliation needs review')
          await (options.move ?? rename)(source, target)
        }
        const actualHash = await artifactHash(target)
        if (sourceHash && actualHash !== expectedHash)
          throw new Error('Artifact changed during relocation')
        const outcome = actualHash ? 'quarantined' as const : 'absent' as const
        await options.commit({ cardId, operationKey: `settle:${id}`, changes: [], mutations: [{ type: 'effect-transition', id, expected: 'dispatched', status: 'settled', receipt: { outcome, path: actualHash ? target : null, actualHash, reversible: true } }] })
        outcomes.push({ goalId: goal.id, status: outcome })
      }
      catch (error) {
        // If receipt storage failed after rename, the durable intent remains the
        // authority; the next restart verifies the move without executing it again.
        const current = await options.getEffect(id)
        if (current?.status === 'dispatched')
          await options.commit({ cardId, operationKey: `uncertain:${id}`, changes: [], mutations: [{ type: 'effect-transition', id, expected: 'dispatched', status: 'uncertain', receipt: { reason: errorMessageFrom(error), requiresVerification: true } }] })
        outcomes.push({ goalId: goal.id, status: 'held' })
      }
    }
    return outcomes
  }
  return { reconcile }
}
