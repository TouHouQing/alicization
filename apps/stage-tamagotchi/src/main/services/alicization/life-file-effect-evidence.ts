import type { LifeEffect, LifeStateView } from '../../../shared/life-contracts'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

import { mainFilesystemMutationDispatchInput } from './execution/filesystem-mutation-input'
import { completedLifeExecutionStep } from './life-dialogue-claim'
import { lifeFileVerificationEvidence } from './life-file-verification-evidence'

/** Project an independently read-back file result, never an adapter's assertion alone. */
export function lifeFileEffectEvidence(effect: LifeEffect, view: LifeStateView) {
  if (!completedLifeExecutionStep(effect) || !['tool.filesystem_write_file', 'tool.filesystem_edit_file', 'tool.filesystem_patch_file'].includes(String(effect.payload.capabilityId)))
    return null
  const goal = view.obligations.find(goal => goal.id === `file-goal:${effect.id}` && goal.sourceTurnId === effect.turnId && goal.cardId === view.cardId)
  const verified = goal && lifeFileVerificationEvidence(goal)
  const output = effect.receipt!.output as Record<string, unknown>
  if (!verified || output.verifiedPath !== verified.path || output.contentHash !== verified.contentHash || output.byteLength !== verified.bytes)
    return null
  const parameters = effect.payload.parameters as Record<string, unknown> | undefined
  let content = effect.payload.capabilityId === 'tool.filesystem_write_file' && typeof parameters?.content === 'string' ? parameters.content : null
  if (content === null && parameters) {
    const expectedHash = typeof parameters.expectedHash === 'string' ? parameters.expectedHash : output.previousHash
    const source = typeof expectedHash === 'string' && view.effects.find(read => read.turnId === effect.turnId && read.payload.capabilityId === 'tool.filesystem_read_file' && completedLifeExecutionStep(read)
      && read.receipt?.output && typeof read.receipt.output === 'object' && (read.receipt.output as Record<string, unknown>).verifiedPath === verified.path
      && (read.receipt.output as Record<string, unknown>).contentHash === expectedHash)
    const original = source ? source.receipt!.output as Record<string, unknown> : null
    if (original?.truncated === false && typeof original.content === 'string' && createHash('sha256').update(original.content).digest('hex') === expectedHash) {
      try {
        content = mainFilesystemMutationDispatchInput(String(effect.payload.capabilityId), parameters, original.content).content
      }
      catch {
        // Invalid or missing source instructions cannot certify literal content.
      }
    }
  }
  const text = content !== null && Buffer.byteLength(content) === verified.bytes && createHash('sha256').update(content).digest('hex') === verified.contentHash ? content : null
  return { fileVerification: verified, ...(text !== null ? { returnedText: text.slice(0, 1600), excerptTruncated: text.length > 1600, returnedTextSource: 'independent-file-hash-match' } : {}) }
}
