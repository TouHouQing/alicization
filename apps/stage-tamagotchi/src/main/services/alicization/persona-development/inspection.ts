import type { PersonaSourcePreview } from '../../../../shared/persona-development-contracts'
import type { LifeTransaction } from '../life-transaction'

import { personaDevelopmentKey, readPersonaDevelopment } from './schema'
import { resolvePersonaSource } from './sources'

export async function readPersonaSourcePreviews(tx: Pick<LifeTransaction, 'get' | 'cardId' | 'now'>, facetId: string, version: number): Promise<PersonaSourcePreview[]> {
  const row = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = ?', [personaDevelopmentKey])
  const state = readPersonaDevelopment(row ? { [personaDevelopmentKey]: row.value } : {})
  const facet = state.facets.find(item => item.id === facetId && item.version === version && item.status !== 'withdrawn')
  if (!facet)
    throw new Error('Personality sources changed; reload before inspection')
  return Promise.all(facet.sources.map(async (source) => {
    try {
      const resolved = await resolvePersonaSource(tx, source)
      return { source, text: resolved.text, occurredAt: resolved.occurredAt, available: true }
    }
    catch {
      return { source, text: null, occurredAt: null, available: false }
    }
  }))
}
