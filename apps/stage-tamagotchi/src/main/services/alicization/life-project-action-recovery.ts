import type { AlicizationExecutionEventRecord, AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import type { LifeEffect, LifeObligation } from '../../../shared/life-contracts'

import { lstat } from 'node:fs/promises'
import { join } from 'node:path'

import { resolveOwnedArtifactDirectory } from './owned-artifact-path'

/** File bytes prove state; the adapter's persisted result proves who acted. */
export async function recoveredProjectAction(goal: LifeObligation, effect: LifeEffect, task: AlicizationTaskThreadRecord | null | undefined, events: AlicizationExecutionEventRecord[], workspace: string) {
  const parameters = effect.payload.parameters as { ownedNote?: { name?: string, contentHash?: string } } | undefined
  const note = parameters?.ownedNote
  if (effect.status !== 'uncertain' || effect.turnId !== goal.threadId || effect.payload.capabilityId !== 'owned-note' || !note?.name || !/^[a-f0-9]{64}\.md$/u.test(note.name) || goal.proof.kind !== 'file' || goal.proof.path !== join(workspace, note.name) || goal.proof.contentHash !== note.contentHash || task?.id !== goal.threadId || !task.attemptId || task.status !== 'completed')
    return null
  // Windows can spell the same directory with an 8.3 alias. The adapter records
  // the guarded real directory; compare that spelling without trusting links.
  const root = await resolveOwnedArtifactDirectory(workspace).catch(() => null)
  if (!root)
    return null
  const artifact = join(root, note.name)
  const entry = await lstat(artifact).catch(() => null)
  if (!entry?.isFile() || entry.isSymbolicLink())
    return null
  return events.find(event => event.threadId === goal.threadId && event.attemptId === task.attemptId && event.kind === 'result' && event.channel === 'cli' && event.threadStatus === 'completed' && event.payload?.adapter === 'owned-note' && event.payload.path === artifact && event.payload.actualHash === goal.proof.contentHash) ?? null
}
