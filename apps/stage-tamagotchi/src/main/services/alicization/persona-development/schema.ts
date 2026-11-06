import type { PersonaDevelopmentView } from '../../../../shared/persona-development-contracts'

import { createHash } from 'node:crypto'

import * as v from 'valibot'

export const personaDevelopmentKey = 'life:persona-development'
export const personaContexts = ['companionship', 'focused-work', 'repair', 'rest', 'execution'] as const
const id = v.pipe(v.string(), v.minLength(1), v.maxLength(160))
const prose = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(260))
const bias = v.pipe(v.number(), v.minValue(-0.15), v.maxValue(0.15))
export const personaEffectsSchema = v.strictObject({ warmth: bias, directness: bias, initiative: bias, expression: bias, patience: bias, verification: bias })
export const personaFacetDraftSchema = v.strictObject({ id, kind: v.picklist(['relationship-habit', 'expression-style', 'interest', 'working-style']), subject: v.picklist(['self', 'relationship']), label: prose, context: v.picklist(personaContexts), exceptions: v.pipe(v.array(prose), v.maxLength(4)), effects: personaEffectsSchema })
export const personaObservationSchema = v.strictObject({ facet: personaFacetDraftSchema, source: v.strictObject({ cardId: id, kind: v.picklist(['memory_reflections', 'persona_reinforcement_events', 'goals']), id: v.pipe(v.string(), v.minLength(1), v.maxLength(512)), version: id }), polarity: v.picklist(['support', 'oppose']) })
export const zeroPersonaEffects = () => ({ warmth: 0, directness: 0, initiative: 0, expression: 0, patience: 0, verification: 0 })
export const personaDigest = (value: unknown) => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex')
const count = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(Number.MAX_SAFE_INTEGER))
const score = v.pipe(v.number(), v.minValue(0), v.maxValue(Number.MAX_SAFE_INTEGER))
const hash = v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))
const sourceRef = v.strictObject({ cardId: id, kind: id, id: v.pipe(v.string(), v.minLength(1), v.maxLength(512)), version: id })
export const personaFacetSchema = v.strictObject({
  ...personaFacetDraftSchema.entries,
  label: v.pipe(v.string(), v.maxLength(260)),
  version: v.pipe(count, v.minValue(1)),
  status: v.picklist(['exploring', 'supported', 'trial', 'mature', 'disputed', 'withdrawn']),
  support: score,
  opposition: score,
  independentEvents: count,
  distinctDays: count,
  firstEvidenceAt: count,
  lastEvidenceAt: count,
  successfulTrials: count,
  failedTrials: count,
  sources: v.pipe(v.array(sourceRef), v.maxLength(16)),
  adoptedSoulHash: v.nullable(hash),
  correction: v.nullable(v.strictObject({ text: prose, at: count })),
})
const stateSchema = v.strictObject({
  format: v.literal('persona-development-v1'),
  paused: v.boolean(),
  processedSources: v.pipe(v.array(sourceRef), v.maxLength(128)),
  facets: v.pipe(v.array(personaFacetSchema), v.maxLength(64)),
  adoption: v.nullable(v.strictObject({ id, baseHash: hash, targetHash: hash, facetHash: hash, status: v.picklist(['prepared', 'activated']), facets: v.pipe(v.array(personaFacetSchema), v.maxLength(32)) })),
})
export function readPersonaDevelopment(values: Record<string, string>): PersonaDevelopmentView {
  const raw = values[personaDevelopmentKey]
  if (!raw)
    return { format: 'persona-development-v1', paused: false, processedSources: [], facets: [], adoption: null }
  const value = v.parse(stateSchema, JSON.parse(raw))
  if (new Set(value.facets.map(facet => facet.id)).size !== value.facets.length)
    throw new TypeError('Duplicate personality facet identity')
  for (const facet of value.facets) {
    v.parse(personaFacetDraftSchema, { id: facet.id, kind: facet.kind, subject: facet.subject, label: facet.status === 'withdrawn' ? 'withdrawn' : facet.label, context: facet.context, exceptions: facet.exceptions, effects: facet.effects })
    if (!Number.isSafeInteger(facet.version) || facet.version < 1 || !['exploring', 'supported', 'trial', 'mature', 'disputed', 'withdrawn'].includes(facet.status))
      throw new TypeError('Invalid personality development facet')
  }
  return value
}
