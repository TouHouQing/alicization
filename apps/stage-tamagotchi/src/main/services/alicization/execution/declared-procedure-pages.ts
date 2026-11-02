import type { ProcedureTemplate } from './procedure-template'

import * as v from 'valibot'

import { procedurePageCount, procedurePageRoutes } from './procedure-page-routes'

const identifier = v.pipe(v.string(), v.minLength(1), v.maxLength(128))
const rowsSchema = v.pipe(v.array(v.strictObject({
  page: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(4)),
  navigationStep: identifier,
  writeStep: identifier,
  criterion: identifier,
  url: v.pipe(v.string(), v.maxLength(8192), v.check(value => URL.canParse(value) && ['http:', 'https:'].includes(new URL(value).protocol))),
  path: v.pipe(v.string(), v.minLength(1), v.maxLength(8192)),
  sha256: v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u)),
})), v.minLength(2), v.maxLength(4))

function failure() {
  return new Error('PROCEDURE_PAGE_DECLARATION: require one complete current method mapping with matching steps, criteria and file targets')
}

function readArray(text: string, start: number) {
  if (text[start] !== '[')
    throw failure()
  let depth = 0
  let quoted = false
  let escaped = false
  for (let index = start; index < text.length; index++) {
    const character = text[index]
    if (quoted) {
      if (escaped)
        escaped = false
      else if (character === '\\')
        escaped = true
      else if (character === '"')
        quoted = false
      continue
    }
    if (character === '"') {
      quoted = true
    }
    else if (character === '[') {
      depth++
    }
    else if (character === ']') {
      depth--
      if (!depth) {
        try { return v.parse(rowsSchema, JSON.parse(text.slice(start, index + 1))) }
        catch { throw failure() }
      }
    }
  }
  throw failure()
}

/** Host-authored mappings restore literals; file destinations must already agree. */
export function restoreDeclaredProcedurePages(template: ProcedureTemplate, input: Record<string, unknown>, sourceText: string, identity: { id: string, version: string }) {
  if (procedurePageCount(template) <= 1)
    return { arguments: input, fields: [] as string[] }
  const starts = [...sourceText.matchAll(/(?:^|[。；;\n])\s*映射\s*[:：]\s*/gu)]
  if (!starts.length)
    return { arguments: input, fields: [] as string[] }
  if (sourceText.length > 256_000 || starts.length !== 1)
    throw failure()
  const marker = starts[0]
  const prefix = sourceText.slice(0, marker.index)
  const ids = new Set([...prefix.matchAll(/\bid\s*[:=]\s*([\w.-]+)(?=[\s、，,;；。]|$)/gu)].map(match => match[1]))
  const versions = new Set([...prefix.matchAll(/\bversion\s*[:=]\s*([a-f\d]{64})(?=[\s、，,;；。]|$)/gu)].map(match => match[1]))
  if (ids.size !== 1 || !ids.has(identity.id) || versions.size !== 1 || !versions.has(identity.version) || !/\blife_use_learned_procedure\b/u.test(sourceText))
    throw failure()
  const routes = procedurePageRoutes(template)
  const rows = readArray(sourceText, marker.index + marker[0].length)
  if (!routes || rows.length !== routes.length || new Set(rows.map(row => row.page)).size !== rows.length || new Set(rows.map(row => row.path)).size !== rows.length)
    throw failure()
  const resolved = structuredClone(input)
  const fields: string[] = []
  routes.forEach((route, index) => {
    const row = rows.find(row => row.page === index + 1)
    const criterion = template.criteria.find(criterion => criterion.predicate && typeof criterion.predicate === 'object' && 'path' in criterion.predicate && JSON.stringify(criterion.predicate.path) === JSON.stringify({ $parameter: route.pathParameter }))
    if (!row || row.navigationStep !== route.openStepId || row.writeStep !== route.writeStepId || row.criterion !== criterion?.id || row.path !== input[route.pathParameter])
      throw failure()
    for (const [name, value] of [[route.urlParameter, row.url], [route.hashParameter, row.sha256]]) {
      if (resolved[name] !== value) {
        resolved[name] = value
        fields.push(`arguments.${name}`)
      }
    }
  })
  return { arguments: resolved, fields }
}
