import type { ProcedureTemplate } from './procedure-template'

import { isAbsolute } from 'node:path'

import * as v from 'valibot'

import { readTopLevelProcedureValues } from './declared-procedure-mapping'
import { procedureBrowserInteraction } from './procedure-browser-interaction'
import { isProcedurePageUrl } from './procedure-transfer-operations'

const label = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
const path = v.pipe(v.string(), v.minLength(1), v.maxLength(4096), v.check(isAbsolute))
const mappingSchema = v.strictObject({
  url: v.pipe(v.string(), v.maxLength(8192), v.check(value => isProcedurePageUrl(value))),
  targetPath: path,
  expectedSha256: v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u)),
  fields: v.pipe(v.array(v.strictObject({ label, text: v.pipe(v.string(), v.maxLength(16_000)) })), v.maxLength(4)),
  submitLabel: label,
  waitText: label,
  uploadLabel: v.optional(label),
  files: v.optional(v.pipe(v.array(path), v.minLength(1), v.maxLength(4), v.check(files => new Set(files).size === files.length))),
})

function failure() {
  return new Error('PROCEDURE_INTERACTION_DECLARATION: require one complete current method mapping with matching fields, uploads and the already chosen destination')
}

/** Explicit host data restores literal parameters; observed selectors and risk policy remain authoritative. */
export function restoreDeclaredProcedureInteraction(template: ProcedureTemplate, input: Record<string, unknown>, sourceText: string, identity: { id: string, version: string }) {
  const unchanged = () => ({ arguments: input, fields: [] as string[] })
  const profile = procedureBrowserInteraction(template)
  if (!profile || !/本次参数|交互映射|current parameters|interactive mapping/iu.test(sourceText))
    return unchanged()
  if (sourceText.length > 256_000)
    throw failure()
  const { values, instructions } = readTopLevelProcedureValues(sourceText, failure)
  if (!/本次参数|交互映射|current parameters|interactive mapping/iu.test(instructions))
    return unchanged()
  const records = values.filter(value => value && typeof value === 'object' && !Array.isArray(value) && ['url', 'targetPath', 'expectedSha256', 'fields', 'submitLabel', 'waitText'].every(key => Object.hasOwn(value, key)))
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
  if (mapping.targetPath !== input[profile.pathParameter] || mapping.fields.length !== profile.fields.length || profile.uploads.length > 1 || (profile.uploads.length === 1 ? !mapping.files || !mapping.uploadLabel : mapping.files !== undefined || mapping.uploadLabel !== undefined))
    throw failure()
  const literals = new Map<string, unknown>()
  function bind(name: string, value: unknown) {
    if (!Object.hasOwn(input, name) || (literals.has(name) && JSON.stringify(literals.get(name)) !== JSON.stringify(value)))
      throw failure()
    literals.set(name, value)
  }
  bind(profile.urlParameter, mapping.url)
  bind(profile.hashParameter, mapping.expectedSha256)
  bind(profile.submitLabelParameter, mapping.submitLabel)
  bind(profile.waitTextParameter, mapping.waitText)
  profile.fields.forEach((field, index) => {
    bind(field.labelParameter, mapping.fields[index].label)
    bind(field.textParameter, mapping.fields[index].text)
  })
  if (profile.uploads.length) {
    bind(profile.uploads[0].labelParameter, mapping.uploadLabel)
    bind(profile.uploads[0].filesParameter, mapping.files)
  }
  const resolved = structuredClone(input)
  const fields: string[] = []
  for (const [name, value] of literals) {
    if (JSON.stringify(resolved[name]) !== JSON.stringify(value)) {
      resolved[name] = structuredClone(value)
      fields.push(`arguments.${name}`)
    }
  }
  return { arguments: resolved, fields }
}
