import type { LifeEvidenceRef } from './life-contracts'

export type PersonaContext = 'companionship' | 'focused-work' | 'repair' | 'rest' | 'execution'
export type PersonaFacetKind = 'relationship-habit' | 'expression-style' | 'interest' | 'working-style'
export type PersonaFacetStatus = 'exploring' | 'supported' | 'trial' | 'mature' | 'disputed' | 'withdrawn'
export interface PersonaEffects { warmth: number, directness: number, initiative: number, expression: number, patience: number, verification: number }
export interface PersonaFacetDraft {
  id: string
  kind: PersonaFacetKind
  subject: 'self' | 'relationship'
  label: string
  context: PersonaContext
  exceptions: string[]
  effects: PersonaEffects
}
export interface PersonaFacet extends PersonaFacetDraft {
  version: number
  status: PersonaFacetStatus
  support: number
  opposition: number
  independentEvents: number
  distinctDays: number
  firstEvidenceAt: number
  lastEvidenceAt: number
  successfulTrials: number
  failedTrials: number
  sources: LifeEvidenceRef[]
  adoptedSoulHash: string | null
  correction: { text: string, at: number } | null
}
export interface PersonaDevelopmentView {
  format: 'persona-development-v1'
  paused: boolean
  processedSources: LifeEvidenceRef[]
  facets: PersonaFacet[]
  adoption: { id: string, baseHash: string, targetHash: string, facetHash: string, status: 'prepared' | 'activated', facets: PersonaFacet[] } | null
}
export interface PersonaEvidenceObservation { facet: PersonaFacetDraft, source: LifeEvidenceRef, polarity: 'support' | 'oppose' }
export type PersonaDevelopmentCommand = {
  cardId: string
  operationId: string
  expectedHash: string | null
} & ({ action: 'pause' | 'resume' } | { action: 'withdraw' | 'reconsider', facetId: string, expectedVersion: number } | { action: 'correct', facetId: string, expectedVersion: number, correction: string })
export interface PersonaSourcePreview { source: LifeEvidenceRef, text: string | null, occurredAt: number | null, available: boolean }
export interface PersonaDevelopmentAuthorization { developmentId: string, facetHash: string }
export interface PersonaDevelopmentProjection {
  format: 'persona-behavior-projection-v1'
  soulHash: string | null
  facets: Array<Pick<PersonaFacet, 'id' | 'version' | 'label' | 'context' | 'status' | 'exceptions'>>
  effects: PersonaEffects
}
