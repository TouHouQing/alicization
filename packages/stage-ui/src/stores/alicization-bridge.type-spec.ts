import type { AlicizationPersistentPresenceAuthoritySnapshot } from '../../../stage-shared/src/alicization-transport-contracts'
import type {
  AlicizationMemoryWorkbenchSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from './alicization-bridge'

type Expect<T extends true> = T
type Extends<T, U> = T extends U ? true : false

const authorityFields: AlicizationPersistentPresenceAuthoritySnapshot = {} as AlicizationVisualPresenceStateSnapshot

const memoryWorkbenchSnapshot: AlicizationMemoryWorkbenchSnapshot = {
  cardId: 'default',
  sessionId: null,
  updatedAt: 1,
  workingMemory: null,
  longTerm: {
    total: 0,
    byKind: {},
    items: [],
  },
  review: {
    pending: 0,
    items: [],
  },
  health: {
    status: 'ok',
    queue: {
      pending: 0,
      review: 0,
      applied: 0,
      failed: 0,
      deadLettered: 0,
    },
    recall: {
      lastLatencyMs: null,
      p95LatencyMs: null,
      lastError: null,
    },
    embedding: {
      providerConfigured: false,
      modelId: null,
      dimensions: null,
      reindexRequired: false,
    },
    errors: [],
  },
}

void authorityFields
void memoryWorkbenchSnapshot

export type BridgeSnapshotExtendsAuthority = Expect<
  Extends<AlicizationVisualPresenceStateSnapshot, AlicizationPersistentPresenceAuthoritySnapshot>
>
