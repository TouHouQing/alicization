import type { LifeEffect } from '../../../../shared/life-contracts'
import type { EffectReconciliation } from './effect-reconciler'
import type { FileRecoveryNativeProcess } from './file-recovery-native-contracts'
import type { createWindowsPointerJournalIndex } from './windows-pointer-journal'

import { createHash } from 'node:crypto'
import { join } from 'node:path'

import { errorMessageFrom } from '@moeru/std'

import * as v from 'valibot'

import { executionDigest } from './acceptance-compiler'
import { controlFileRecoveryProcess } from './file-recovery-process'
import { readOwnedPointerJournalFile } from './windows-pointer-journal'
import { decodeWindowsPointerGuardianRelease, decodeWindowsPointerNoInput, decodeWindowsPointerReady, decodeWindowsPointerResult, windowsPointerNoInputSchema } from './windows-pointer-protocol'
import { validateWindowsPointerSnapshot } from './windows-pointer-types'
import { windowsVisualActSchema } from './windows-visual-tool-contracts'

const hash = v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/u))
const ticks = v.pipe(v.string(), v.regex(/^[1-9]\d{17,18}$/u))
const pid = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(0x7FFF_FFFF))
const intentSchema = v.strictObject({
  version: v.literal(1),
  owner: v.unknown(),
  observationId: v.string(),
  programSha256: hash,
  admittedAt: v.pipe(v.number(), v.integer(), v.minValue(1)),
  request: v.strictObject({ version: v.literal(1), mappingName: v.string(), tag: v.pipe(v.string(), v.regex(/^[1-9]\d{0,19}$/u)), bindingHash: hash, parentProcessId: pid, parentStartTicks: ticks, expiresAt: v.pipe(v.number(), v.integer(), v.minValue(1)), action: v.strictObject({ kind: v.picklist(['click', 'drag', 'scroll']), button: v.picklist(['left', 'right', 'middle', 'none']), wheel: v.pipe(v.number(), v.integer(), v.minValue(-1200), v.maxValue(1200)), points: v.pipe(v.array(v.strictObject({ x: v.pipe(v.number(), v.integer()), y: v.pipe(v.number(), v.integer()) })), v.minLength(1), v.maxLength(33)) }), snapshot: v.unknown() }),
})
const readyRecordSchema = v.strictObject({ version: v.literal(1), owner: v.unknown(), actorProcessId: pid, ready: v.unknown() })
const byteHash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

export interface WindowsPointerRecoveryObservation { stopped: boolean, result: EffectReconciliation }

/** Read-only reconciliation. No native input, process termination or replay port. */
export function createWindowsPointerRecovery(options: {
  index: ReturnType<typeof createWindowsPointerJournalIndex>
  inspectProcess?: (identity: FileRecoveryNativeProcess) => Promise<'running' | 'stopped' | 'unknown'>
}) {
  const inspectProcess = options.inspectProcess ?? (identity => controlFileRecoveryProcess('inspect', identity))
  return async (effect: LifeEffect): Promise<WindowsPointerRecoveryObservation> => {
    const unknown = (reason: string, stopped = false): WindowsPointerRecoveryObservation => ({ stopped, result: { effectId: effect.id, verdict: 'unknown', independent: true, evidence: { reason, scope: 'native-pointer-delivery-only' } } })
    if (effect.status !== 'uncertain' || effect.payload.capabilityId !== 'tool.desktop_pointer_action')
      return unknown('not-an-uncertain-native-pointer-effect')
    try {
      const admission = await options.index.find(effect)
      if (!admission)
        return unknown('native-admission-index-is-absent')
      const intentBytes = await readOwnedPointerJournalFile(admission.programRoot, `main-intent-${admission.nonce}.json`)
      if (createHash('sha256').update(intentBytes).digest('hex') !== admission.intentHash)
        return unknown('native-admission-bytes-changed')
      const intent = v.parse(intentSchema, JSON.parse(intentBytes.toString('utf8')))
      const terminalBytes = await readOwnedPointerJournalFile(join(admission.programRoot, `alicization-owned-input-${admission.nonce}`), 'actor-result.json')
      const preflight = v.safeParse(windowsPointerNoInputSchema, JSON.parse(terminalBytes.toString('utf8')))
      if (preflight.success) {
        if (executionDigest(intent.owner) !== executionDigest(admission.owner))
          return unknown('native-preflight-owner-changed')
        const receiptRoot = join(admission.programRoot, `alicization-owned-input-${admission.nonce}`)
        const binding = { bindingHash: intent.request.bindingHash, actorProcessId: preflight.output.actorProcessId, parentProcessId: intent.request.parentProcessId, parentStartTicks: intent.request.parentStartTicks, receiptRoot, keys: [], repeat: 1, expectedEvents: 0 }
        const refusal = decodeWindowsPointerNoInput(terminalBytes.toString('utf8'), binding)
        const marker = await readOwnedPointerJournalFile(receiptRoot, 'session-owner.txt')
        if (marker.toString('utf8') !== `AlicizationOwnedInputReceipt1\n${binding.bindingHash}\n${intent.request.tag}\n`)
          return unknown('native-preflight-session-owner-changed')
        const executable = join(admission.programRoot, 'pointer.exe')
        const programBytes = await readOwnedPointerJournalFile(admission.programRoot, 'pointer.exe')
        if (byteHash(programBytes) !== intent.programSha256)
          return unknown('native-program-bytes-changed')
        if (await inspectProcess({ executable, workerPath: executable, workerHash: intent.programSha256, pid: refusal.actorProcessId, creationTimeTicks: refusal.actorStartTicks }) !== 'stopped')
          return unknown('original-preflight-owner-is-not-confirmed-stopped')
        if (executionDigest(await options.index.find(effect)) !== executionDigest(admission) || byteHash(await readOwnedPointerJournalFile(receiptRoot, 'actor-result.json')) !== byteHash(terminalBytes) || byteHash(await readOwnedPointerJournalFile(receiptRoot, 'session-owner.txt')) !== byteHash(marker) || byteHash(await readOwnedPointerJournalFile(admission.programRoot, 'pointer.exe')) !== intent.programSha256)
          return unknown('native-preflight-evidence-changed-during-inspection')
        return { stopped: true, result: { effectId: effect.id, verdict: 'not-applied', independent: true, evidence: { scope: 'native-pointer-preflight-only', actorReceiptHash: byteHash(terminalBytes), admissionHash: admission.intentHash, programSha256: intent.programSha256, actorProcessId: refusal.actorProcessId, actorStartTicks: refusal.actorStartTicks, guardianStarted: false, hooksInstalled: false, taskCompletionProven: false }, output: { ok: false, recovered: true, inputReleased: true, writerStopped: true, effectMayHaveOccurred: false, sideEffectState: 'none', proofScope: 'no-native-pointer-delivery', taskCompletionProven: false } } }
      }
      const readyBytes = await readOwnedPointerJournalFile(admission.programRoot, `main-ready-${admission.nonce}.json`)
      const readyRecord = v.parse(readyRecordSchema, JSON.parse(readyBytes.toString('utf8')))
      if (executionDigest(intent.owner) !== executionDigest(admission.owner) || executionDigest(readyRecord.owner) !== executionDigest(admission.owner) || readyRecord.actorProcessId === intent.request.parentProcessId)
        return unknown('native-main-owner-binding-changed')
      const input = v.parse(windowsVisualActSchema, effect.payload.parameters)
      validateWindowsPointerSnapshot(intent.request.snapshot as never)
      if (intent.observationId !== input.observationId || intent.request.mappingName !== `Local\\AlicizationInput_${admission.nonce}`)
        return unknown('native-intent-observation-binding-changed')
      const action = intent.request.action
      const buttons = action.button === 'left' ? [1] : action.button === 'right' ? [2] : action.button === 'middle' ? [4] : []
      const expectedEvents = action.kind === 'scroll' ? 2 : action.points.length + 2
      const receiptRoot = join(admission.programRoot, `alicization-owned-input-${admission.nonce}`)
      const markerBytes = await readOwnedPointerJournalFile(receiptRoot, 'session-owner.txt')
      if (markerBytes.toString('utf8') !== `AlicizationOwnedInputReceipt1\n${intent.request.bindingHash}\n${intent.request.tag}\n`)
        return unknown('native-session-owner-changed')
      const binding = { bindingHash: intent.request.bindingHash, actorProcessId: readyRecord.actorProcessId, parentProcessId: intent.request.parentProcessId, parentStartTicks: intent.request.parentStartTicks, receiptRoot, keys: buttons, repeat: 1, expectedEvents }
      const ready = decodeWindowsPointerReady(JSON.stringify(readyRecord.ready), binding)
      const actorBytes = await readOwnedPointerJournalFile(receiptRoot, 'actor-result.json')
      const guardianBytes = await readOwnedPointerJournalFile(receiptRoot, 'guardian-release.json')
      const actor = decodeWindowsPointerResult(actorBytes.toString('utf8'), binding)
      const guardian = decodeWindowsPointerGuardianRelease(guardianBytes.toString('utf8'), binding.bindingHash)
      if (!actor.inputReleased || !guardian.inputReleased || actor.ownedKeys.length)
        return unknown('native-release-evidence-is-incomplete')
      if (actor.guardianReceipt && executionDigest(decodeWindowsPointerGuardianRelease(actor.guardianReceipt, binding.bindingHash)) !== executionDigest(guardian))
        return unknown('independent-guardian-release-disagrees')
      const executableBytes = await readOwnedPointerJournalFile(admission.programRoot, 'pointer.exe')
      if (createHash('sha256').update(executableBytes).digest('hex') !== intent.programSha256)
        return unknown('native-program-bytes-changed')
      const executable = join(admission.programRoot, 'pointer.exe')
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
        readOwnedPointerJournalFile(admission.programRoot, `main-ready-${admission.nonce}.json`),
        readOwnedPointerJournalFile(receiptRoot, 'actor-result.json'),
        readOwnedPointerJournalFile(receiptRoot, 'guardian-release.json'),
        readOwnedPointerJournalFile(receiptRoot, 'session-owner.txt'),
        readOwnedPointerJournalFile(admission.programRoot, 'pointer.exe'),
      ])
      if (currentBytes.some((bytes, index) => byteHash(bytes) !== initialHashes[index]))
        return unknown('native-release-record-changed-during-inspection')
      const evidence = { scope: 'native-pointer-delivery-only', admissionHash: admission.intentHash, bindingHash: binding.bindingHash, readyRecordHash: initialHashes[0], actorReceiptHash: initialHashes[1], guardianReceiptHash: initialHashes[2], programSha256: intent.programSha256, actorProcessId: readyRecord.actorProcessId, actorStartTicks: ready.actorStartTicks, guardianProcessId: ready.guardianProcessId, guardianStartTicks: ready.guardianStartTicks, inputReleased: true, writerStopped: true, taskCompletionProven: false }
      if (!actor.effectMayHaveOccurred && actor.insertedEvents === 0 && actor.completedRounds === 0)
        return { stopped: true, result: { effectId: effect.id, verdict: 'not-applied', independent: true, evidence, output: { ok: false, recovered: true, effectMayHaveOccurred: false, inputReleased: true, writerStopped: true, proofScope: 'no-native-pointer-delivery' } } }
      if (actor.completedRounds !== 1 || actor.insertedEvents !== expectedEvents)
        return unknown('partial-native-pointer-delivery-needs-operation-specific-readback', true)
      return { stopped: true, result: { effectId: effect.id, verdict: 'applied', independent: true, evidence, output: { ok: true, status: 'completed', operation: 'desktop_pointer_action', observationId: input.observationId, kind: input.kind, recovered: true, inputReleased: true, writerStopped: true, requiresReadback: true, requiresVerification: true, proofScope: 'native-pointer-delivery-only', taskCompletionProven: false } } }
    }
    catch (error) { return unknown(`native-journal-unconfirmed: ${errorMessageFrom(error)}`) }
  }
}
