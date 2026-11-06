import * as v from 'valibot'

import { executionDigest } from './acceptance-compiler'

export const procedureIndexPageSize = 32
export const maxProcedureCandidates = 1000
export const maxDesktopSkillVersions = maxProcedureCandidates + 128

const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
const hash = v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))
const itemSchema = v.strictObject({ candidateId: id, evaluationId: v.nullable(id) })
const pageSchema = v.strictObject({ version: v.literal(1), items: v.pipe(v.array(itemSchema), v.minLength(1), v.maxLength(procedureIndexPageSize)) })
const legacySchema = v.strictObject({ version: v.literal(1), items: v.pipe(v.array(itemSchema), v.maxLength(procedureIndexPageSize)) })
const rootSchema = v.strictObject({
  version: v.literal(2),
  count: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(maxProcedureCandidates)),
  pages: v.pipe(v.array(v.strictObject({
    id: v.pipe(v.string(), v.regex(/^procedure-index-page:[a-f\d]{64}$/u)),
    hash,
    count: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(procedureIndexPageSize)),
  })), v.maxLength(Math.ceil(maxProcedureCandidates / procedureIndexPageSize))),
})

export type ProcedureIndexItem = v.InferOutput<typeof itemSchema>
export interface ProcedureIndexSnapshot {
  items: ProcedureIndexItem[]
  pageHashes: Set<string>
}

function assertUnique(items: ProcedureIndexItem[]) {
  if (new Set(items.map(item => item.candidateId)).size !== items.length)
    throw new Error('Procedure index has duplicate identities')
}

/** Read the released v1 index; its next mutation atomically writes v2 pages. */
export async function readProcedureIndex(
  input: unknown,
  readPage: (id: string) => Promise<unknown>,
): Promise<ProcedureIndexSnapshot> {
  if (input === undefined)
    return { items: [], pageHashes: new Set() }
  if (input && typeof input === 'object' && 'version' in input && input.version === 1) {
    const index = v.parse(legacySchema, input)
    assertUnique(index.items)
    return { items: index.items, pageHashes: new Set() }
  }
  const root = v.parse(rootSchema, input)
  if (new Set(root.pages.map(page => page.id)).size !== root.pages.length)
    throw new Error('Procedure index has duplicate pages')
  if (root.pages.reduce((count, page) => count + page.count, 0) !== root.count)
    throw new Error('Procedure index count does not match its pages')
  const items: ProcedureIndexItem[] = []
  for (const [position, reference] of root.pages.entries()) {
    if (position < root.pages.length - 1 && reference.count !== procedureIndexPageSize)
      throw new Error('Procedure index has a non-final partial page')
    const page = v.parse(pageSchema, await readPage(reference.id))
    const digest = executionDigest(page)
    if (digest !== reference.hash || reference.id !== `procedure-index-page:${digest}` || page.items.length !== reference.count)
      throw new Error('Procedure index page content changed')
    items.push(...page.items)
  }
  assertUnique(items)
  return { items, pageHashes: new Set(root.pages.map(page => page.hash)) }
}

/** Immutable, content-addressed pages in the existing life journal, never a second skill owner. */
export function planProcedureIndex(snapshot: ProcedureIndexSnapshot, input: ProcedureIndexItem[]) {
  const items = v.parse(v.pipe(v.array(itemSchema), v.maxLength(maxProcedureCandidates)), input)
  assertUnique(items)
  const pages: v.InferOutput<typeof rootSchema>['pages'] = []
  const writes: Array<{ id: string, page: v.InferOutput<typeof pageSchema> }> = []
  for (let offset = 0; offset < items.length; offset += procedureIndexPageSize) {
    const page = { version: 1 as const, items: items.slice(offset, offset + procedureIndexPageSize) }
    const hash = executionDigest(page)
    const id = `procedure-index-page:${hash}`
    pages.push({ id, hash, count: page.items.length })
    if (!snapshot.pageHashes.has(hash))
      writes.push({ id, page })
  }
  return { root: { version: 2 as const, count: items.length, pages }, writes }
}
