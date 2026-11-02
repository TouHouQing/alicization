import { Buffer } from 'node:buffer'
import { win32 } from 'node:path'

import * as v from 'valibot'

const hash = v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/u))
const ticks = v.pipe(v.string(), v.regex(/^[1-9]\d{17,18}$/u))
const pid = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(0x7FFF_FFFF))
const count = (maximum: number) => v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(maximum))
const path = v.pipe(v.string(), v.minLength(1), v.maxLength(2048))
const detail = v.nullable(v.pipe(v.string(), v.maxLength(4096)))
const key = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(254))
const stopReason = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(8))

const readySchema = v.strictObject({
  type: v.literal('ready'),
  bindingHash: hash,
  actorStartTicks: ticks,
  guardianProcessId: pid,
  guardianStartTicks: ticks,
  receiptRoot: path,
})
const guardianReadySchema = v.strictObject({ type: v.literal('guardian-ready'), bindingHash: hash })
const guardianReleaseSchema = v.strictObject({
  type: v.literal('guardian-release'),
  bindingHash: hash,
  inputReleased: v.boolean(),
  stopReason,
  failure: detail,
  readyPreparationMs: count(15_000),
})
const resultSchema = v.strictObject({
  type: v.literal('result'),
  bindingHash: hash,
  ok: v.boolean(),
  completedRounds: count(5),
  insertedEvents: count(50),
  effectMayHaveOccurred: v.boolean(),
  inputReleased: v.boolean(),
  guardianNormalExit: v.boolean(),
  guardianReady: detail,
  guardianReceipt: detail,
  stopReason,
  failure: detail,
  ownedKeys: v.pipe(v.array(key), v.maxLength(5)),
  receiptRoot: path,
})

export interface WindowsKeyboardBinding {
  bindingHash: string
  actorProcessId: number
  parentProcessId: number
  receiptRoot: string
  keys: readonly number[]
  repeat: number
}
export type WindowsKeyboardReady = v.InferOutput<typeof readySchema>
export type WindowsKeyboardResult = v.InferOutput<typeof resultSchema>

export function decodeWindowsKeyboardGuardianRelease(line: string, bindingHash: string) {
  const release = v.parse(guardianReleaseSchema, record(line))
  if (release.bindingHash !== bindingHash)
    throw new Error('Native keyboard guardian release belongs to a different action')
  return release
}

function record(line: string) {
  if (Buffer.byteLength(line, 'utf8') > 16_384 || !line.trim())
    throw new Error('Native keyboard frame exceeds its protocol budget')
  return JSON.parse(line) as unknown
}
function assertBinding(actual: { bindingHash: string, receiptRoot: string }, expected: WindowsKeyboardBinding) {
  if (actual.bindingHash !== expected.bindingHash || !win32.isAbsolute(actual.receiptRoot) || win32.resolve(actual.receiptRoot).toLowerCase() !== win32.resolve(expected.receiptRoot).toLowerCase())
    throw new Error('Native keyboard receipt belongs to a different action or journal')
}

/** Readiness attests a distinct guardian; it never grants dispatch authority. */
export function decodeWindowsKeyboardReady(line: string, expected: WindowsKeyboardBinding): WindowsKeyboardReady {
  const ready = v.parse(readySchema, record(line))
  assertBinding(ready, expected)
  if (ready.guardianProcessId === expected.actorProcessId || ready.guardianProcessId === expected.parentProcessId)
    throw new Error('Native keyboard guardian is not an independent process')
  return ready
}

/**
 * Preserve uncertainty. A successful shortcut needs both release receipts,
 * actual insertion counts and the complete originally authorized repetition.
 */
export function decodeWindowsKeyboardResult(line: string, expected: WindowsKeyboardBinding): WindowsKeyboardResult {
  const result = v.parse(resultSchema, record(line))
  assertBinding(result, expected)
  if (new Set(result.ownedKeys).size !== result.ownedKeys.length || result.ownedKeys.some(key => !expected.keys.includes(key)))
    throw new Error('Native keyboard ownership contains an unrequested key')
  const perRound = expected.keys.length * 2
  if (result.completedRounds > expected.repeat || result.insertedEvents > perRound * expected.repeat || result.insertedEvents < perRound * result.completedRounds || (result.insertedEvents > 0 && !result.effectMayHaveOccurred))
    throw new Error('Native keyboard delivery counts contradict the admitted batch')
  if (result.inputReleased && result.ownedKeys.length)
    throw new Error('Native keyboard release still has pending ownership')
  if (result.ok) {
    if (!result.inputReleased || !result.guardianNormalExit || result.failure !== null || result.completedRounds !== expected.repeat || result.insertedEvents !== perRound * expected.repeat)
      throw new Error('Native keyboard completion lacks confirmed delivery and release')
    const ready = v.parse(guardianReadySchema, record(result.guardianReady ?? ''))
    const release = v.parse(guardianReleaseSchema, record(result.guardianReceipt ?? ''))
    if (ready.bindingHash !== expected.bindingHash || release.bindingHash !== expected.bindingHash || !release.inputReleased || release.failure !== null)
      throw new Error('Native keyboard guardian did not attest this action release')
  }
  return result
}
