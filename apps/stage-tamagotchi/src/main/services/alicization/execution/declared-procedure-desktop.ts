import type { ProcedureTemplate } from './procedure-template'

import { isAbsolute } from 'node:path'

import * as v from 'valibot'

import { readTopLevelProcedureValues } from './declared-procedure-mapping'
import { procedureDesktopInteraction } from './procedure-desktop-interaction'

const mappingSchema = v.strictObject({ windowTitle: v.pipe(v.string(), v.minLength(1), v.maxLength(180)), saveLabel: v.pipe(v.string(), v.minLength(1), v.maxLength(511)), targetPath: v.pipe(v.string(), v.minLength(1), v.maxLength(4096), v.check(isAbsolute)), text: v.pipe(v.string(), v.minLength(1), v.maxLength(16_000)) })
const failure = () => new Error('PROCEDURE_DESKTOP_DECLARATION: require one current exact method/window/save/file mapping before restoring its literal text')

/** Current host text can correct wording; it cannot retarget a chosen native action. */
export function restoreDeclaredProcedureDesktop(template: ProcedureTemplate, input: Record<string, unknown>, sourceText: string, identity: { id: string, version: string }) {
  const unchanged = () => ({ arguments: input, fields: [] as string[] })
  const profile = procedureDesktopInteraction(template)
  if (!profile || !/本次编辑器参数|当前编辑器参数|current editor parameters/iu.test(sourceText))
    return unchanged()
  if (sourceText.length > 256_000)
    throw failure()
  const { values, instructions } = readTopLevelProcedureValues(sourceText, failure)
  if (!/本次编辑器参数|当前编辑器参数|current editor parameters/iu.test(instructions))
    return unchanged()
  const records = values.filter(value => value && typeof value === 'object' && !Array.isArray(value) && ['windowTitle', 'saveLabel', 'targetPath', 'text'].every(key => Object.hasOwn(value, key)))
  if (!records.length)
    return unchanged()
  const ids = new Set([...instructions.matchAll(/\bid\s*[:=]\s*([\w.-]+)(?=[\s、，,;；。]|$)/gu)].map(match => match[1]))
  const versions = new Set([...instructions.matchAll(/\bversion\s*[:=]\s*([a-f\d]{64})(?=[\s、，,;；。]|$)/gu)].map(match => match[1]))
  if (records.length !== 1 || ids.size !== 1 || !ids.has(identity.id) || versions.size !== 1 || !versions.has(identity.version) || !/\blife_use_learned_procedure\b/u.test(instructions))
    throw failure()
  const parsed = v.safeParse(mappingSchema, records[0])
  if (!parsed.success)
    throw failure()
  const mapping = parsed.output
  if (mapping.windowTitle !== input[profile.windowParameter] || mapping.saveLabel !== input[profile.saveLabelParameter] || mapping.targetPath !== input[profile.pathParameter] || !Object.hasOwn(input, profile.textParameter))
    throw failure()
  if (input[profile.textParameter] === mapping.text)
    return unchanged()
  return { arguments: { ...input, [profile.textParameter]: mapping.text }, fields: [`arguments.${profile.textParameter}`] }
}
