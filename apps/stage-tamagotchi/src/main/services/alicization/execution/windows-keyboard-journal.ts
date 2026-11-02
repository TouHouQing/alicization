import type { LifeEffect } from '../../../../shared/life-contracts'
import type { AlicizationDbService } from '../db'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { lstat, open, realpath } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { platform } from 'node:process'

import * as v from 'valibot'

import { executionDigest } from './acceptance-compiler'
import { compileWindowsKeyboardShortcut } from './windows-keyboard-shortcut'

const text = v.pipe(v.string(), v.minLength(1), v.maxLength(256))
const hash = v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/u))
const ownerSchema = v.strictObject({ cardId: text, turnId: text, effectId: text, leaseId: text, epoch: text, fencingToken: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(Number.MAX_SAFE_INTEGER)) })
const admissionSchema = v.strictObject({ version: v.literal(1), programRoot: v.pipe(v.string(), v.maxLength(4096), v.check(isAbsolute)), nonce: v.pipe(v.string(), v.regex(/^[a-f0-9]{32}$/u)), intentHash: hash, owner: ownerSchema })
const indexSchema = v.strictObject({ admission: admissionSchema, effectHash: hash })
export type WindowsKeyboardJournalAdmission = v.InferOutput<typeof admissionSchema>

/** Read one bounded immutable journal through its actual open file identity. */
export async function readOwnedKeyboardJournalFile(directory: string, name: string) {
  if (!/^(?:main-(?:intent|ready)-[a-f0-9]{32}\.json|(?:actor-result|guardian-release)\.json|session-owner\.txt|keyboard\.exe)$/u.test(name))
    throw new Error('WINDOWS_KEYBOARD_JOURNAL_FILE_NAME')
  const budget = name === 'keyboard.exe' ? 2_097_152 : 16_384
  const folder = await lstat(directory)
  if (!folder.isDirectory() || folder.isSymbolicLink())
    throw new Error('WINDOWS_KEYBOARD_JOURNAL_DIRECTORY')
  const path = join(directory, name)
  const before = await lstat(path)
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || before.size > budget)
    throw new Error('WINDOWS_KEYBOARD_JOURNAL_FILE_IDENTITY')
  const file = await open(path, 'r')
  try {
    const opened = await file.stat()
    if (opened.dev !== before.dev || opened.ino !== before.ino || opened.nlink !== 1 || opened.size !== before.size)
      throw new Error('WINDOWS_KEYBOARD_JOURNAL_FILE_CHANGED')
    const buffer = Buffer.alloc(budget + 1)
    let length = 0
    while (length < buffer.length) {
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, length)
      if (!bytesRead)
        break
      length += bytesRead
    }
    const body = buffer.subarray(0, length)
    const after = await file.stat()
    const current = await lstat(path)
    const directoryAfter = await lstat(directory)
    if (body.length > budget || body.length !== opened.size || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || current.isSymbolicLink() || current.dev !== opened.dev || current.ino !== opened.ino || current.nlink !== 1 || directoryAfter.isSymbolicLink() || directoryAfter.dev !== folder.dev || directoryAfter.ino !== folder.ino)
      throw new Error('WINDOWS_KEYBOARD_JOURNAL_FILE_CHANGED')
    return body
  }
  finally { await file.close() }
}

type JournalDatabase = Pick<AlicizationDbService, 'readLifeState' | 'getLifeEffect' | 'getMetaValue' | 'compareAndSetMetaValue'>
export const windowsKeyboardJournalIndexPrefix = 'execution.native.keyboard.intent:'
const indexKey = (cardId: string, effectId: string) => `${windowsKeyboardJournalIndexPrefix}${executionDigest({ cardId, effectId })}`
const pathKey = (value: string) => platform === 'win32' ? resolve(value).toLowerCase() : resolve(value)
const samePath = (left: string, right: string) => pathKey(left) === pathKey(right)

/** The index stays in the existing card database; it is not another life store. */
export function createWindowsKeyboardJournalIndex(options: { protectedRoot: string, database: () => JournalDatabase }) {
  async function assertRoot(admission: WindowsKeyboardJournalAdmission) {
    const base = await lstat(options.protectedRoot)
    const program = await lstat(admission.programRoot)
    const canonical = await realpath(options.protectedRoot)
    if (!base.isDirectory() || base.isSymbolicLink() || !program.isDirectory() || program.isSymbolicLink() || !samePath(dirname(admission.programRoot), canonical) || !samePath(await realpath(admission.programRoot), admission.programRoot) || !/^keyboard-[a-z0-9]{6}$/iu.test(basename(admission.programRoot)))
      throw new Error('WINDOWS_KEYBOARD_JOURNAL_PROGRAM_ROOT')
  }
  function assertEffect(effect: LifeEffect | null, admission: WindowsKeyboardJournalAdmission) {
    if (!effect || effect.id !== admission.owner.effectId || effect.turnId !== admission.owner.turnId || effect.payload.capabilityId !== 'tool.desktop_press_keys')
      throw new Error('WINDOWS_KEYBOARD_JOURNAL_EFFECT_IDENTITY')
    return effect
  }
  async function assertIntent(effect: LifeEffect, admission: WindowsKeyboardJournalAdmission) {
    const body = await readOwnedKeyboardJournalFile(admission.programRoot, `main-intent-${admission.nonce}.json`)
    if (createHash('sha256').update(body).digest('hex') !== admission.intentHash)
      throw new Error('WINDOWS_KEYBOARD_JOURNAL_INTENT_HASH')
    const intent = JSON.parse(body.toString('utf8'))
    v.parse(hash, intent.programSha256)
    v.parse(hash, intent.request?.bindingHash)
    const input = effect.payload.parameters as { shortcut: string, repeat?: number }
    const chord = compileWindowsKeyboardShortcut(input.shortcut, input.repeat ?? 1)
    if (intent.version !== 1 || executionDigest(v.parse(ownerSchema, intent.owner)) !== executionDigest(admission.owner) || intent.request?.mappingName !== `Local\\AlicizationInput_${admission.nonce}` || executionDigest(intent.request.keys) !== executionDigest(chord.keys) || intent.request.repeat !== chord.repeat)
      throw new Error('WINDOWS_KEYBOARD_JOURNAL_INTENT_BINDING')
  }
  async function admit(raw: WindowsKeyboardJournalAdmission) {
    const admission = v.parse(admissionSchema, raw)
    const database = options.database()
    const view = await database.readLifeState()
    if (view.cardId !== admission.owner.cardId)
      throw new Error('WINDOWS_KEYBOARD_JOURNAL_CARD_IDENTITY')
    const effect = assertEffect(await database.getLifeEffect(admission.owner.effectId), admission)
    if (effect.status !== 'dispatched')
      throw new Error('WINDOWS_KEYBOARD_JOURNAL_EFFECT_NOT_DISPATCHED')
    await assertRoot(admission)
    await assertIntent(effect, admission)
    const value = JSON.stringify({ admission, effectHash: executionDigest(effect.payload) })
    // A durable CAS burns this effect across process restarts. A second nonce
    // cannot overwrite the first admission, including concurrent callbacks.
    if (!await database.compareAndSetMetaValue(indexKey(view.cardId, effect.id), undefined, value))
      throw new Error('WINDOWS_KEYBOARD_JOURNAL_ALREADY_ADMITTED')
  }
  async function find(effect: LifeEffect) {
    const database = options.database()
    const view = await database.readLifeState()
    const raw = await database.getMetaValue(indexKey(view.cardId, effect.id))
    if (!raw)
      return null
    if (Buffer.byteLength(raw) > 8192)
      throw new Error('WINDOWS_KEYBOARD_JOURNAL_INDEX_BUDGET')
    const index = v.parse(indexSchema, JSON.parse(raw))
    if (index.admission.owner.cardId !== view.cardId || index.effectHash !== executionDigest(effect.payload))
      throw new Error('WINDOWS_KEYBOARD_JOURNAL_INDEX_BINDING')
    assertEffect(effect, index.admission)
    await assertRoot(index.admission)
    await assertIntent(effect, index.admission)
    return index.admission
  }
  return { admit, find }
}
