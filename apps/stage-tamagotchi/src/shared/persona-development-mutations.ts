import type { LifeEvidenceRef } from './life-contracts'
import type { PersonaContext, PersonaEvidenceObservation, PersonaFacet } from './persona-development-contracts'

export type PersonaDevelopmentMutation
  = { action: 'observe', observations: PersonaEvidenceObservation[], extracted?: LifeEvidenceRef }
    | { action: 'skip-source', source: LifeEvidenceRef }
    | { action: 'pause' | 'resume' }
    | { action: 'withdraw', facetId: string, expectedVersion: number }
    | { action: 'reconsider', facetId: string, expectedVersion: number }
    | { action: 'correct', facetId: string, expectedVersion: number, correction: string }
    | { action: 'consume', facetIds: string[], context: PersonaContext, turnId: string, requestHash: string }
    | { action: 'feedback', facetId: string, turnId: string, source: LifeEvidenceRef, positive: boolean }
    | { action: 'reconcile' }
    | { action: 'prepare-adoption', id: string, baseHash: string, targetHash: string, facetHash: string, facets: PersonaFacet[] }
