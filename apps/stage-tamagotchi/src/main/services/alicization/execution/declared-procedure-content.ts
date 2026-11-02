import type { ProcedureTemplate } from './procedure-template'

import { createHash } from 'node:crypto'

import { executionDigest } from './acceptance-compiler'
import { restoreDeclaredProcedureDesktop } from './declared-procedure-desktop'
import { restoreDeclaredProcedureInteraction } from './declared-procedure-interaction'
import { readTopLevelProcedureValues } from './declared-procedure-mapping'
import { restoreDeclaredProcedurePages } from './declared-procedure-pages'

interface Declaration { operation: string, fields: Record<string, string> }

/** Parse explicit operation-qualified assignments, not general natural language. */
function declarations(text: string): Declaration[] {
  if (text.length > 256_000)
    throw new Error('Procedure request exceeds its source-reading budget')
  const found = new Map<string, Declaration>()
  const starts = [...text.matchAll(/\b(?:tool\.)?(?:filesystem_)?(write_file|read_file|list_directory)\b\s*(?:的\s*)?(?=path\s*[:=])/gu)]
  if (starts.length > 64)
    throw new Error('Procedure request contains too many operation declarations')
  for (const start of starts) {
    const begin = start.index + start[0].length
    let end = begin
    let quoted = false
    let escaped = false
    for (; end < text.length; end++) {
      const character = text[end]
      if (quoted) {
        if (escaped)
          escaped = false
        else if (character === '\\')
          escaped = true
        else if (character === '"')
          quoted = false
      }
      else if (character === '"') {
        quoted = true
      }
      else if (/[；;。\n]/u.test(character)) {
        break
      }
    }
    const segment = text.slice(begin, end)
    const fields: Record<string, string> = {}
    let cursor = 0
    let valid = true
    while (cursor < segment.length) {
      const field = /^\s*(path|content)\s*[:=]\s*/u.exec(segment.slice(cursor))
      if (!field || Object.hasOwn(fields, field[1])) {
        valid = false
        break
      }
      cursor += field[0].length
      if (segment[cursor] === '"') {
        const valueStart = cursor++
        let escaped = false
        for (; cursor < segment.length; cursor++) {
          if (escaped) {
            escaped = false
          }
          else if (segment[cursor] === '\\') {
            escaped = true
          }
          else if (segment[cursor] === '"') {
            cursor++
            break
          }
        }
        try {
          const value: unknown = JSON.parse(segment.slice(valueStart, cursor))
          if (typeof value !== 'string' || value.length > 64_000)
            throw new Error('Invalid declared literal')
          fields[field[1]] = value
        }
        catch {
          valid = false
          break
        }
      }
      else {
        const value = /^[^、，,]+/u.exec(segment.slice(cursor))?.[0]
        if (field[1] !== 'path' || !value?.trim()) {
          valid = false
          break
        }
        fields.path = value.trim()
        cursor += value.length
      }
      if (!segment.slice(cursor).trim())
        break
      const separator = /^\s*[、，,]\s*/u.exec(segment.slice(cursor))
      if (!separator) {
        valid = false
        break
      }
      cursor += separator[0].length
    }
    if (valid && fields.path) {
      const declaration = { operation: start[1], fields }
      found.set(executionDigest(declaration), declaration)
    }
  }
  return [...found.values()]
}

/** Restore only quoted content when every fresh target and operation agrees. */
export function restoreDeclaredProcedureContent(template: ProcedureTemplate, input: Record<string, unknown>, sourceText: string) {
  const unchanged = () => ({ arguments: input, projection: null })
  const declared = declarations(sourceText)
  if (!declared.length)
    return unchanged()
  const paths = new Set<string>()
  const contents = new Map<string, string>()
  for (const step of template.steps) {
    const operation = typeof step.capabilityId === 'string' ? step.capabilityId.replace(/^tool\.filesystem_/u, '') : ''
    if (!['write_file', 'read_file', 'list_directory'].includes(operation) || !step.input || typeof step.input !== 'object' || Array.isArray(step.input))
      return unchanged()
    const fields = step.input as Record<string, unknown>
    const reference = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) && typeof (value as Record<string, unknown>).$parameter === 'string' ? (value as { $parameter: string }).$parameter : null
    const path = reference(fields.path)
    if (!path || typeof input[path] !== 'string')
      return unchanged()
    const matches = declared.filter(item => item.operation === operation && item.fields.path === input[path])
    if (matches.length !== 1)
      return unchanged()
    paths.add(path)
    for (const [field, value] of Object.entries(fields)) {
      const parameter = reference(value)
      if (parameter && !['path', 'content'].includes(field))
        return unchanged()
    }
    if (operation !== 'write_file')
      continue
    const content = reference(fields.content)
    const literal = matches[0].fields.content
    if (!content || typeof input[content] !== 'string' || typeof literal !== 'string' || !template.parameters.some(item => item.name === content && item.role === 'content') || (contents.has(content) && contents.get(content) !== literal))
      return unchanged()
    contents.set(content, literal)
  }
  if (!contents.size || template.parameters.some(item => !paths.has(item.name) && !contents.has(item.name)))
    return unchanged()
  const resolved = structuredClone(input)
  const fields: string[] = []
  for (const [name, literal] of contents) {
    if (resolved[name] !== literal) {
      resolved[name] = literal
      fields.push(`arguments.${name}`)
    }
  }
  if (!fields.length)
    return unchanged()
  return { arguments: resolved, projection: { version: 'declared-procedure-literal-content-v1', sourceHash: createHash('sha256').update(sourceText).digest('hex'), proposedHash: executionDigest(input), resolvedHash: executionDigest(resolved), fields, actionAdmitted: false } }
}

/** A method-qualified exact goal assignment is data, not a model paraphrase. */
export function restoreDeclaredProcedureInvocation(template: ProcedureTemplate, input: { goal: string, arguments: Record<string, unknown> }, sourceText: string, identity: { id: string, version: string }) {
  const pages = restoreDeclaredProcedurePages(template, input.arguments, sourceText, identity)
  const interaction = restoreDeclaredProcedureInteraction(template, pages.arguments, sourceText, identity)
  const desktop = restoreDeclaredProcedureDesktop(template, interaction.arguments, sourceText, identity)
  const content = restoreDeclaredProcedureContent(template, desktop.arguments, sourceText)
  const goals = new Set<string>()
  let instructions = ''
  try { instructions = readTopLevelProcedureValues(sourceText, () => new Error('Malformed literal request')).instructions }
  catch { /* Malformed quoted data cannot authorize a goal rewrite. */ }
  const starts = sourceText.matchAll(/\b(?:tool\.)?life_use_learned_procedure\s*[，,；;]\s*goal\s*(?:必须为|[:=])\s*/gu)
  for (const start of starts) {
    if (instructions.slice(start.index, start.index + 5) !== sourceText.slice(start.index, start.index + 5))
      continue
    const rest = sourceText.slice(start.index + start[0].length)
    const quoted = /^"(?:[^"\\\r\n]|\\.)*"(?=\s*(?:[。；;\r\n]|$))/u.exec(rest)
    const plain = rest.startsWith('"') ? null : /^[^。；;\r\n]+(?=[。；;\r\n]|$)/u.exec(rest)
    try {
      const goal: unknown = quoted ? JSON.parse(quoted[0]) : plain?.[0].trim()
      if (typeof goal === 'string' && goal.length > 0 && goal.length <= 2000)
        goals.add(goal)
    }
    catch { /* Ambiguous or malformed declarations grant no rewrite. */ }
  }
  const goal = goals.size === 1 ? [...goals][0] : input.goal
  const fields = [...pages.fields, ...interaction.fields, ...desktop.fields, ...(content.projection?.fields ?? []), ...(goal !== input.goal ? ['goal'] : [])]
  const resolved = { goal, arguments: content.arguments }
  return fields.length ? { ...resolved, projection: { version: 'declared-procedure-literal-invocation-v1', sourceHash: createHash('sha256').update(sourceText).digest('hex'), proposedHash: executionDigest(input), resolvedHash: executionDigest(resolved), fields, actionAdmitted: false } } : { ...input, projection: null }
}
