import type { PersonaFacet } from '../../../../shared/persona-development-contracts'

import { Buffer } from 'node:buffer'

import * as v from 'valibot'

import { personaFacetDraftSchema } from './schema'

const start = '<!-- alicization-persona-development:start -->'
const end = '<!-- alicization-persona-development:end -->'
export const canonicalPersonaFacets = (facets: PersonaFacet[]) => facets.map(facet => ({ ...facet, adoptedSoulHash: null })).sort((a, b) => a.id.localeCompare(b.id))

function range(content: string) {
  const from = content.indexOf(start)
  const to = content.indexOf(end)
  if (from < 0 && to < 0)
    return null
  if (from < 0 || to < from || content.includes(start, from + 1) || content.includes(end, to + 1))
    throw new Error('Personality growth section requires recovery')
  return { from, to: to + end.length }
}
export function personaSoulCore(content: string) {
  const section = range(content)
  return (section ? content.slice(0, section.from) + content.slice(section.to) : content).trimEnd()
}
export function compilePersonaSoul(content: string, facets: PersonaFacet[]) {
  if (facets.length > 32 || facets.some(facet => facet.status !== 'mature'))
    throw new Error('Only bounded mature personality can enter SOUL')
  const payload = Buffer.from(JSON.stringify(canonicalPersonaFacets(facets)), 'utf8').toString('base64')
  return `${personaSoulCore(content)}\n\n${start}\n## Learned Personality\n\n${facets.map(facet => `- ${facet.label.replace(/[\r\n]/gu, ' ')} (${facet.context})`).join('\n')}\n\n<!-- evidence:${payload} -->\n${end}\n`
}
export function readPersonaSoul(content: string): PersonaFacet[] {
  const section = range(content)
  if (!section)
    return []
  const encoded = content.slice(section.from, section.to).match(/<!-- evidence:([\w+/=]+) -->/u)?.[1]
  if (!encoded || encoded.length > 150_000)
    throw new Error('Personality growth payload is missing or excessive')
  const facets = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as PersonaFacet[]
  if (!Array.isArray(facets) || facets.length > 32 || new Set(facets.map(facet => facet.id)).size !== facets.length)
    throw new Error('Personality growth payload is invalid')
  for (const facet of facets) {
    v.parse(personaFacetDraftSchema, { id: facet.id, kind: facet.kind, subject: facet.subject, label: facet.label, context: facet.context, exceptions: facet.exceptions, effects: facet.effects })
    if (facet.status !== 'mature' || !Number.isSafeInteger(facet.version))
      throw new Error('Personality growth payload contains an unadopted candidate')
  }
  return facets
}
