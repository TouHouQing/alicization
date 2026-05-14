import type { AlicizationPersistentPresenceAuthoritySnapshot } from '../../../stage-shared/src/alicization-transport-contracts'

import type { AlicizationVisualPresenceStateSnapshot } from './alicization-bridge'

type Expect<T extends true> = T
type Extends<T, U> = T extends U ? true : false

const authorityFields: AlicizationPersistentPresenceAuthoritySnapshot = {} as AlicizationVisualPresenceStateSnapshot

void authorityFields

export type BridgeSnapshotExtendsAuthority = Expect<
  Extends<AlicizationVisualPresenceStateSnapshot, AlicizationPersistentPresenceAuthoritySnapshot>
>
