import type { AlicizationPersistentPresenceAuthoritySnapshot } from '../../../../packages/stage-shared/src/alicization-transport-contracts'

import type { AlicizationVisualPresenceStateSnapshot } from './eventa'

type Expect<T extends true> = T
type Extends<T, U> = T extends U ? true : false

const authorityFields: AlicizationPersistentPresenceAuthoritySnapshot = {} as AlicizationVisualPresenceStateSnapshot

void authorityFields

export type EventaSnapshotExtendsAuthority = Expect<
  Extends<AlicizationVisualPresenceStateSnapshot, AlicizationPersistentPresenceAuthoritySnapshot>
>
