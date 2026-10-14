import type { LifeOwnerVersion } from './life-contracts'

export type LifeClosureStatus = 'recorded' | 'adopted' | 'pending' | 'failed' | 'not-invoked' | 'unverified'
export interface LifeClosureNode { id: string, status: LifeClosureStatus, references: string[], reasons: string[] }
export interface LifeClosureRecord {
  cardId: string
  turnId: string
  revision: number
  contentHash: string
  adoptedOwners: LifeOwnerVersion[]
  nodes: LifeClosureNode[]
  boundaries: { evidenceLimit: number, rawInputIncluded: false, provesConsciousness: false }
}
