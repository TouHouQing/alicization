import type { LifeGoalVerification, LifeObligation } from '../../../shared/life-contracts'
import type { LifeInterfaceObservation } from './life-interface-action-closure'

import { Buffer } from 'node:buffer'
import { createHash, randomUUID } from 'node:crypto'
import { open } from 'node:fs/promises'
import { isAbsolute } from 'node:path'

import * as v from 'valibot'

const text = v.pipe(v.string(), v.minLength(1), v.maxLength(4096))
export const lifeGoalProofSchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('file'), path: v.pipe(text, v.check(isAbsolute)), contentHash: v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/i)) }),
  v.strictObject({ kind: v.literal('interface-state'), channel: v.picklist(['browser', 'desktop']), targetId: text, contentHash: v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/i)), expectedValue: v.pipe(v.string(), v.maxLength(8192)) }),
  v.strictObject({ kind: v.literal('setting'), settingKey: text, expectedValue: v.string() }),
  v.strictObject({ kind: v.literal('user-reported') }),
  v.strictObject({ kind: v.literal('reminder'), channel: v.picklist(['text-rendered', 'audio-ended']) }),
])

export async function verifyLifeGoal(input: {
  obligation: LifeObligation
  readSetting: (key: string) => Promise<string | undefined>
  observeInterface?: (proof: LifeObligation['proof']) => Promise<LifeInterfaceObservation | null>
  userReported?: boolean
  now?: () => number
}): Promise<LifeGoalVerification> {
  const { obligation } = input
  const base = { id: randomUUID(), kind: obligation.proof.kind, verifiedAt: (input.now ?? Date.now)(), independent: true }
  const proof = obligation.proof
  if (obligation.invalidatedBy || ['cancelled', 'superseded', 'fulfilled'].includes(obligation.status))
    return { ...base, verdict: 'stale', evidence: { status: obligation.status } }
  if (proof.kind === 'user-reported')
    return { ...base, verdict: input.userReported === true ? 'satisfied' : 'unknown', independent: false, evidence: { userReported: input.userReported === true } }
  if (proof.kind === 'reminder')
    return { ...base, verdict: 'unknown', evidence: { reason: 'awaiting-actual-expression-receipt' } }
  if (proof.kind === 'interface-state') {
    const actual = await input.observeInterface?.(proof)
    if (!actual)
      return { ...base, verdict: 'unknown', evidence: { reason: 'interface-observation-unavailable' } }
    const matches = actual.predicateMatched === true && actual.channel === proof.channel && actual.targetId === proof.targetId && actual.contentHash === proof.contentHash
    return { ...base, verdict: matches ? 'satisfied' : 'not-satisfied', evidence: { channel: actual.channel, targetId: actual.targetId, actualHash: actual.contentHash, expectedHash: proof.contentHash ?? null, scope: 'displayed-interface-only' } }
  }
  if (proof.kind === 'setting') {
    if (!proof.settingKey || proof.expectedValue == null)
      return { ...base, verdict: 'unknown', evidence: { reason: 'incomplete-setting-proof' } }
    const value = await input.readSetting(proof.settingKey)
    return { ...base, verdict: value === proof.expectedValue ? 'satisfied' : 'not-satisfied', evidence: { settingKey: proof.settingKey, actualValue: value ?? null, expectedValue: proof.expectedValue } }
  }
  return verifyLifeFileProof(proof, input.now)
}

/** Observes file bytes without reopening or modifying a terminal obligation. */
export async function verifyLifeFileProof(proof: Pick<LifeObligation['proof'], 'path' | 'contentHash'>, now: () => number = Date.now): Promise<LifeGoalVerification> {
  const base = { id: randomUUID(), kind: 'file' as const, verifiedAt: now(), independent: true }
  if (!proof.path || !proof.contentHash || !/^[a-f\d]{64}$/i.test(proof.contentHash))
    return { ...base, verdict: 'unknown', evidence: { reason: 'incomplete-file-proof' } }
  try {
    const file = await open(proof.path, 'r')
    try {
      const before = await file.stat()
      if (!before.isFile() || before.size > 16 * 1024 * 1024)
        return { ...base, verdict: 'unknown', evidence: { reason: 'file-outside-verification-budget' } }
      const bytes = Buffer.alloc(before.size)
      let bytesRead = 0
      while (bytesRead < bytes.length) {
        const read = await file.read(bytes, bytesRead, bytes.length - bytesRead, bytesRead)
        if (read.bytesRead === 0)
          break
        bytesRead += read.bytesRead
      }
      const after = await file.stat()
      if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || bytesRead !== before.size)
        return { ...base, verdict: 'unknown', evidence: { reason: 'file-changed-during-verification' } }
      const actualHash = createHash('sha256').update(bytes).digest('hex')
      return { ...base, verdict: actualHash === proof.contentHash.toLowerCase() ? 'satisfied' : 'not-satisfied', evidence: { path: proof.path, actualHash, expectedHash: proof.contentHash, bytes: before.size } }
    }
    finally { await file.close() }
  }
  catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'READ_FAILED'
    return { ...base, verdict: code === 'ENOENT' ? 'not-satisfied' : 'unknown', evidence: { reason: 'file-verification-failed', code } }
  }
}
