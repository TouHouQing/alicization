import type { AlicizationExecutionEventInput } from '@proj-alicization/stage-shared'

import type { AlicizationCliAdapterInput, AlicizationCliAdapterResult } from './cli'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { lstat, open, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { errorMessageFrom } from '@moeru/std'

import { isPassiveLifeSvg } from '../life-visual-activity'
import { resolveOwnedArtifactDirectory } from '../owned-artifact-path'

// This native CLI operation creates immutable notes in an application-owned
// workspace. It never interprets note content as a shell command or a file path.
export async function executeOwnedNote(input: AlicizationCliAdapterInput): Promise<AlicizationCliAdapterResult> {
  const note = input.command.ownedNote
  const now = input.now ?? Date.now
  const events: AlicizationExecutionEventInput[] = []
  const publish = async (kind: 'dispatch' | 'result', status: 'running' | 'completed' | 'failed' | 'cancelled', payload: Record<string, unknown>) => {
    const event: AlicizationExecutionEventInput = { threadId: input.thread.id, channel: 'cli', kind, threadStatus: status, turnId: input.thread.turnId, sessionId: input.thread.sessionId, origin: input.thread.origin, decisionTraceId: input.thread.decisionTraceId, payload: { adapter: 'owned-note', ...payload }, createdAt: now() }
    if (input.onExecutionEvent)
      await input.onExecutionEvent(event)
    else
      events.push(event)
  }
  try {
    if (input.command.command !== 'alicization:owned-note' || !note || !/^[a-f\d]{64}\.(?:md|svg)$/u.test(note.name) || !input.ownedNoteRoot || note.content.length > 64_000 || createHash('sha256').update(note.content).digest('hex') !== note.contentHash || note.name.endsWith('.svg') && !isPassiveLifeSvg(note.content))
      throw new Error('Invalid owned note capability input')
    input.abortSignal?.throwIfAborted()
    const root = await resolveOwnedArtifactDirectory(input.ownedNoteRoot)
    const path = join(root, note.name)
    await publish('dispatch', 'running', { path, contentHash: note.contentHash, risk: 'ordinary-owned-file-create', overwritesExisting: false })
    let file
    try {
      file = await open(path, 'wx')
    }
    catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'EEXIST')
        throw error
      // An existing immutable artifact is usable only when its exact bytes match.
      const existingFile = await lstat(path)
      if (!existingFile.isFile() || existingFile.isSymbolicLink() || existingFile.size > 256_000)
        throw new Error('Existing note is outside the owned artifact boundary')
      const existing = await readFile(path)
      if (createHash('sha256').update(existing).digest('hex') !== note.contentHash)
        throw new Error('Existing note differs; explicit repair is required')
    }
    if (file) {
      try {
        input.abortSignal?.throwIfAborted()
        await file.writeFile(note.content, { encoding: 'utf8', signal: input.abortSignal })
        await file.sync()
      }
      finally {
        await file.close()
      }
    }
    input.abortSignal?.throwIfAborted()
    const actualHash = createHash('sha256').update(await readFile(path)).digest('hex')
    if (actualHash !== note.contentHash)
      throw new Error('Owned note content verification failed')
    await publish('result', 'completed', { path, actualHash, bytes: Buffer.byteLength(note.content, 'utf8') })
    return { ok: true, finalStatus: 'completed', summary: '已整理一份有来源引用的兴趣札记。', output: JSON.stringify({ path, actualHash }), events }
  }
  catch (error) {
    const cancelled = input.abortSignal?.aborted === true
    const errorCode = cancelled ? 'OWNED_NOTE_CANCELLED' : 'OWNED_NOTE_FAILED'
    await publish('result', cancelled ? 'cancelled' : 'failed', { errorCode, error: errorMessageFrom(error), partialArtifactPossible: true })
    return { ok: false, finalStatus: cancelled ? 'cancelled' : 'failed', summary: cancelled ? '兴趣札记已中断，产物尚未核验。' : '兴趣札记未完成。', output: null, errorCode, errorMessage: errorMessageFrom(error), events }
  }
}
