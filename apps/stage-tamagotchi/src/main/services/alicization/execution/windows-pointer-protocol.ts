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

export interface WindowsPointerBinding {
  bindingHash: string
  actorProcessId: number
  parentProcessId: number
  receiptRoot: string
  keys: readonly number[]
  repeat: number
  expectedEvents: number
  parentStartTicks: string
}
export const windowsPointerNoInputSchema = v.strictObject({ type: v.literal('preflight-refused'), bindingHash: hash, actorProcessId: pid, actorStartTicks: ticks, parentProcessId: pid, parentStartTicks: ticks, receiptRoot: path, guardianStarted: v.literal(false), hooksInstalled: v.literal(false), insertedEvents: v.literal(0), effectMayHaveOccurred: v.literal(false), stopReason, failure: v.pipe(v.string(), v.regex(/^WINDOWS_(?:POINTER|VISUAL|KEYBOARD)_[A-Z_]+$/u)) })
export type WindowsPointerNoInput = v.InferOutput<typeof windowsPointerNoInputSchema>

/** A pre-hook refusal is neither delivery nor a fabricated guardian release. */
export function decodeWindowsPointerNoInput(line: string, expected: WindowsPointerBinding) {
  const result = v.parse(windowsPointerNoInputSchema, record(line))
  assertBinding(result, expected)
  if (result.actorProcessId !== expected.actorProcessId || result.parentProcessId !== expected.parentProcessId || !expected.parentStartTicks || result.parentStartTicks !== expected.parentStartTicks || result.actorProcessId === result.parentProcessId)
    throw new Error('Native pointer preflight refusal belongs to another process lifetime')
  return result
}
export type WindowsPointerReady = v.InferOutput<typeof readySchema>
export type WindowsPointerResult = v.InferOutput<typeof resultSchema>

export function decodeWindowsPointerGuardianRelease(line: string, bindingHash: string) {
  const release = v.parse(guardianReleaseSchema, record(line))
  if (release.bindingHash !== bindingHash)
    throw new Error('Native pointer guardian release belongs to a different action')
  return release
}

function record(line: string) {
  if (Buffer.byteLength(line, 'utf8') > 16_384 || !line.trim())
    throw new Error('Native pointer frame exceeds its protocol budget')
  return JSON.parse(line) as unknown
}
function assertBinding(actual: { bindingHash: string, receiptRoot: string }, expected: WindowsPointerBinding) {
  if (actual.bindingHash !== expected.bindingHash || !win32.isAbsolute(actual.receiptRoot) || win32.resolve(actual.receiptRoot).toLowerCase() !== win32.resolve(expected.receiptRoot).toLowerCase())
    throw new Error('Native pointer receipt belongs to a different action or journal')
}

/** Readiness attests a distinct guardian; it never grants dispatch authority. */
export function decodeWindowsPointerReady(line: string, expected: WindowsPointerBinding): WindowsPointerReady {
  const ready = v.parse(readySchema, record(line))
  assertBinding(ready, expected)
  if (ready.guardianProcessId === expected.actorProcessId || ready.guardianProcessId === expected.parentProcessId)
    throw new Error('Native pointer guardian is not an independent process')
  return ready
}

/**
 * Preserve uncertainty. A successful shortcut needs both release receipts,
 * actual insertion counts and the complete originally authorized repetition.
 */
export function decodeWindowsPointerResult(line: string, expected: WindowsPointerBinding): WindowsPointerResult {
  const result = v.parse(resultSchema, record(line))
  assertBinding(result, expected)
  if (new Set(result.ownedKeys).size !== result.ownedKeys.length || result.ownedKeys.some(key => !expected.keys.includes(key)))
    throw new Error('Native pointer ownership contains an unrequested key')
  const perRound = expected.expectedEvents
  if (result.completedRounds > expected.repeat || result.insertedEvents > perRound * expected.repeat || result.insertedEvents < perRound * result.completedRounds || (result.insertedEvents > 0 && !result.effectMayHaveOccurred))
    throw new Error('Native pointer delivery counts contradict the admitted batch')
  if (result.inputReleased && result.ownedKeys.length)
    throw new Error('Native pointer release still has pending ownership')
  if (result.ok) {
    if (!result.inputReleased || !result.guardianNormalExit || result.failure !== null || result.completedRounds !== expected.repeat || result.insertedEvents !== perRound * expected.repeat)
      throw new Error('Native pointer completion lacks confirmed delivery and release')
    const ready = v.parse(guardianReadySchema, record(result.guardianReady ?? ''))
    const release = v.parse(guardianReleaseSchema, record(result.guardianReceipt ?? ''))
    if (ready.bindingHash !== expected.bindingHash || release.bindingHash !== expected.bindingHash || !release.inputReleased || release.failure !== null)
      throw new Error('Native pointer guardian did not attest this action release')
  }
  return result
}
