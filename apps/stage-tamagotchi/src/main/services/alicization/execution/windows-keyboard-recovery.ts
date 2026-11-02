import type { LifeEffect } from '../../../../shared/life-contracts'
import type { EffectReconciliation } from './effect-reconciler'
import type { FileRecoveryNativeProcess } from './file-recovery-native-contracts'
import type { createWindowsKeyboardJournalIndex } from './windows-keyboard-journal'

import { createHash } from 'node:crypto'
import { join } from 'node:path'

import { errorMessageFrom } from '@moeru/std'

import * as v from 'valibot'

import { executionDigest } from './acceptance-compiler'
import { controlFileRecoveryProcess } from './file-recovery-process'
import { readOwnedKeyboardJournalFile } from './windows-keyboard-journal'
import { windowsKeyboardTargetSchema } from './windows-keyboard-program'
import { decodeWindowsKeyboardGuardianRelease, decodeWindowsKeyboardReady, decodeWindowsKeyboardResult } from './windows-keyboard-protocol'
import { compileWindowsKeyboardShortcut } from './windows-keyboard-shortcut'

const hash = v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/u))
const ticks = v.pipe(v.string(), v.regex(/^[1-9]\d{17,18}$/u))
const pid = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(0x7FFF_FFFF))
const intentSchema = v.strictObject({
  version: v.literal(1),
  owner: v.unknown(),
  programSha256: hash,
  admittedAt: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(Number.MAX_SAFE_INTEGER)),
  request: v.strictObject({ version: v.literal(1), mappingName: v.string(), tag: v.pipe(v.string(), v.regex(/^[1-9]\d{0,19}$/u)), bindingHash: hash, parentProcessId: pid, parentStartTicks: ticks, expiresAt: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(Number.MAX_SAFE_INTEGER)), keys: v.pipe(v.array(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(254))), v.minLength(1), v.maxLength(5)), repeat: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(5)), target: windowsKeyboardTargetSchema }),
})
const readyRecordSchema = v.strictObject({ version: v.literal(1), owner: v.unknown(), actorProcessId: pid, ready: v.unknown() })
const byteHash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

export interface WindowsKeyboardRecoveryObservation { stopped: boolean, result: EffectReconciliation }

/** Read-only reconciliation. No native input, process termination or replay port. */
export function createWindowsKeyboardRecovery(options: {
  index: ReturnType<typeof createWindowsKeyboardJournalIndex>
  inspectProcess?: (identity: FileRecoveryNativeProcess) => Promise<'running' | 'stopped' | 'unknown'>
}) {
  const inspectProcess = options.inspectProcess ?? (identity => controlFileRecoveryProcess('inspect', identity))
  return async (effect: LifeEffect): Promise<WindowsKeyboardRecoveryObservation> => {
    const unknown = (reason: string, stopped = false): WindowsKeyboardRecoveryObservation => ({ stopped, result: { effectId: effect.id, verdict: 'unknown', independent: true, evidence: { reason, scope: 'native-key-delivery-only' } } })
    if (effect.status !== 'uncertain' || effect.payload.capabilityId !== 'tool.desktop_press_keys')
      return unknown('not-an-uncertain-native-keyboard-effect')
    try {
      const admission = await options.index.find(effect)
      if (!admission)
        return unknown('native-admission-index-is-absent')
      const intentBytes = await readOwnedKeyboardJournalFile(admission.programRoot, `main-intent-${admission.nonce}.json`)
      if (createHash('sha256').update(intentBytes).digest('hex') !== admission.intentHash)
        return unknown('native-admission-bytes-changed')
      const intent = v.parse(intentSchema, JSON.parse(intentBytes.toString('utf8')))
      const readyBytes = await readOwnedKeyboardJournalFile(admission.programRoot, `main-ready-${admission.nonce}.json`)
      const readyRecord = v.parse(readyRecordSchema, JSON.parse(readyBytes.toString('utf8')))
      if (executionDigest(intent.owner) !== executionDigest(admission.owner) || executionDigest(readyRecord.owner) !== executionDigest(admission.owner) || readyRecord.actorProcessId === intent.request.parentProcessId)
        return unknown('native-main-owner-binding-changed')
      const input = effect.payload.parameters as { shortcut: string, repeat?: number }
      const chord = compileWindowsKeyboardShortcut(input.shortcut, input.repeat ?? 1)
      if (intent.request.mappingName !== `Local\\AlicizationInput_${admission.nonce}` || executionDigest(intent.request.keys) !== executionDigest(chord.keys) || intent.request.repeat !== chord.repeat)
        return unknown('native-intent-chord-binding-changed')
      const receiptRoot = join(admission.programRoot, `alicization-owned-input-${admission.nonce}`)
      const markerBytes = await readOwnedKeyboardJournalFile(receiptRoot, 'session-owner.txt')
      if (markerBytes.toString('utf8') !== `AlicizationOwnedInputReceipt1\n${intent.request.bindingHash}\n${intent.request.tag}\n`)
        return unknown('native-session-owner-changed')
      const binding = { bindingHash: intent.request.bindingHash, actorProcessId: readyRecord.actorProcessId, parentProcessId: intent.request.parentProcessId, receiptRoot, keys: chord.keys, repeat: chord.repeat }
      const ready = decodeWindowsKeyboardReady(JSON.stringify(readyRecord.ready), binding)
      const actorBytes = await readOwnedKeyboardJournalFile(receiptRoot, 'actor-result.json')
      const guardianBytes = await readOwnedKeyboardJournalFile(receiptRoot, 'guardian-release.json')
      const actor = decodeWindowsKeyboardResult(actorBytes.toString('utf8'), binding)
      const guardian = decodeWindowsKeyboardGuardianRelease(guardianBytes.toString('utf8'), binding.bindingHash)
      if (!actor.inputReleased || !guardian.inputReleased || actor.ownedKeys.length)
        return unknown('native-release-evidence-is-incomplete')
      if (actor.guardianReceipt && executionDigest(decodeWindowsKeyboardGuardianRelease(actor.guardianReceipt, binding.bindingHash)) !== executionDigest(guardian))
        return unknown('independent-guardian-release-disagrees')
      const executableBytes = await readOwnedKeyboardJournalFile(admission.programRoot, 'keyboard.exe')
      if (createHash('sha256').update(executableBytes).digest('hex') !== intent.programSha256)
        return unknown('native-program-bytes-changed')
      const executable = join(admission.programRoot, 'keyboard.exe')
      const identity = { executable, workerPath: executable, workerHash: intent.programSha256 }
      // The generic kernel identity reader is deliberately restricted to its
      // inspect operation. A reused PID never authorizes terminating a process.
      const states = await Promise.all([
        inspectProcess({ ...identity, pid: readyRecord.actorProcessId, creationTimeTicks: ready.actorStartTicks }),
        inspectProcess({ ...identity, pid: ready.guardianProcessId, creationTimeTicks: ready.guardianStartTicks }),
      ])
      if (states.some(state => state !== 'stopped'))
        return unknown('an-original-native-owner-is-not-confirmed-stopped')
      if (executionDigest(await options.index.find(effect)) !== executionDigest(admission))
        return unknown('native-index-changed-during-inspection')
      const initialHashes = [readyBytes, actorBytes, guardianBytes, markerBytes, executableBytes].map(byteHash)
      const currentBytes = await Promise.all([
        readOwnedKeyboardJournalFile(admission.programRoot, `main-ready-${admission.nonce}.json`),
        readOwnedKeyboardJournalFile(receiptRoot, 'actor-result.json'),
        readOwnedKeyboardJournalFile(receiptRoot, 'guardian-release.json'),
        readOwnedKeyboardJournalFile(receiptRoot, 'session-owner.txt'),
        readOwnedKeyboardJournalFile(admission.programRoot, 'keyboard.exe'),
      ])
      if (currentBytes.some((bytes, index) => byteHash(bytes) !== initialHashes[index]))
        return unknown('native-release-record-changed-during-inspection')
      const evidence = { scope: 'native-key-delivery-only', admissionHash: admission.intentHash, bindingHash: binding.bindingHash, readyRecordHash: initialHashes[0], actorReceiptHash: initialHashes[1], guardianReceiptHash: initialHashes[2], programSha256: intent.programSha256, actorProcessId: readyRecord.actorProcessId, actorStartTicks: ready.actorStartTicks, guardianProcessId: ready.guardianProcessId, guardianStartTicks: ready.guardianStartTicks, inputReleased: true, writerStopped: true, taskCompletionProven: false }
      if (!actor.effectMayHaveOccurred && actor.insertedEvents === 0 && actor.completedRounds === 0)
        return { stopped: true, result: { effectId: effect.id, verdict: 'not-applied', independent: true, evidence, output: { ok: false, recovered: true, effectMayHaveOccurred: false, inputReleased: true, writerStopped: true, proofScope: 'no-native-key-delivery' } } }
      if (actor.completedRounds !== chord.repeat || actor.insertedEvents !== chord.keys.length * 2 * chord.repeat)
        return unknown('partial-native-key-delivery-needs-operation-specific-readback', true)
      return { stopped: true, result: { effectId: effect.id, verdict: 'applied', independent: true, evidence, output: { ok: true, status: 'completed', operation: 'desktop_press_keys', shortcut: chord.shortcut, repeat: chord.repeat, recovered: true, inputReleased: true, writerStopped: true, requiresReadback: true, requiresVerification: true, proofScope: 'native-key-delivery-only', taskCompletionProven: false } } }
    }
    catch (error) { return unknown(`native-journal-unconfirmed: ${errorMessageFrom(error)}`) }
  }
}
