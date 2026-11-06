import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

import { executionDigest } from '../execution/acceptance-compiler'
import { buildProcedureContext } from './procedure-context'

export interface ProcedureCatalogQuery { query?: string, offset?: number, limit?: number, expectedCatalogHash?: string }

/** A bounded projection of already verified metadata, never a second skill store. */
export function procedureCatalogPage(catalog: unknown, input: ProcedureCatalogQuery) {
  const entries = Array.isArray(catalog) ? catalog.filter(entry => typeof entry?.id === 'string' && typeof entry?.version === 'string') : []
  entries.sort((a, b) => `${a.id}@${a.version}`.localeCompare(`${b.id}@${b.version}`, 'en'))
  const query = input.query?.trim() ?? ''
  const exact = query ? entries.filter(entry => query === entry.id || query === `${entry.id}@${entry.version}` || query === entry.version) : []
  const context = query && !exact.length ? buildProcedureContext(query, entries) : null
  const selected = new Set<string>(context ? JSON.parse(context).data.methods.map((method: { id: string, version: string }) => `${method.id}@${method.version}`) : [])
  const matches = query ? exact.length ? exact : entries.filter(entry => selected.has(`${entry.id}@${entry.version}`)) : entries
  // Hash individually bounded entries; never serialize the whole 1000-item
  // inventory through the execution contract's 256 KB single-object budget.
  const digest = createHash('sha256').update(executionDigest({ query }))
  for (const entry of matches)
    digest.update(executionDigest(entry))
  const catalogHash = digest.digest('hex')
  if (input.expectedCatalogHash && input.expectedCatalogHash !== catalogHash)
    return { status: 'catalog-changed', catalogHash, items: [], nextOffset: 0, notice: 'The live method inventory changed. Restart paging; no previous approval or interface is implied.' }
  const offset = input.offset ?? 0
  const limit = input.limit ?? 8
  const items: unknown[] = []
  for (const entry of matches.slice(offset, offset + limit)) {
    if (items.length && Buffer.byteLength(JSON.stringify([...items, entry])) > 16_000)
      break
    // A single larger schema remains readable through the existing observation reader.
    items.push(entry)
  }
  const end = offset + items.length
  return { status: 'completed', catalogHash, total: matches.length, offset, items, nextOffset: end < matches.length ? end : null, notice: 'Metadata only. Inspect the current input schema and use fresh arguments. Activation, source proof and execution policy are rechecked at use.' }
}
