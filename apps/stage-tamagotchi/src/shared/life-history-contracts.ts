import type { LifeObligation } from './life-contracts'

export interface LifeObligationHistoryCursor { cardId: string, updatedAt: number, id: string }
export interface LifeObligationHistoryRequest { cardId: string, cursor?: LifeObligationHistoryCursor, limit?: number }
export type LifeObligationHistoryItem = Pick<LifeObligation, 'id' | 'kind' | 'summary' | 'status' | 'generation' | 'revision' | 'updatedAt'>
export interface LifeObligationHistoryPage { cardId: string, items: LifeObligationHistoryItem[], nextCursor: LifeObligationHistoryCursor | null }
