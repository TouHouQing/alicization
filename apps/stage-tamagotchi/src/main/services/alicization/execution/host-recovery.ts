import type { LifeEffect } from '../../../../shared/life-contracts'
import type { ExecutionResourceBroker } from './resource-broker'

import { lstat, readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { executionRecoveryResources } from './uncertain-resource-fence'

/** Rebuild host resource facts without activating another card or replaying work. */
export function createHostExecutionRecovery(options: {
  userDataPath: string
  broker: ExecutionResourceBroker
  readCardEffects: (cardId: string) => Promise<LifeEffect[]>
  readCardDownloadResources?: (cardId: string) => Promise<Array<{ effectId: string, resources: string[], resourceOnly: true }>>
}) {
  const guard = options.broker.acquire({ owner: 'host-execution-recovery', resources: ['host:execution'], ttlMs: 300_000 })
  let completion: Promise<{ cards: number, quarantines: number }> | undefined
  async function restore() {
    const root = join(options.userDataPath, 'alicizations', 'cards')
    const entries = await readdir(root, { withFileTypes: true })
    if (entries.length > 256)
      throw new Error('Execution recovery exceeds its card scan budget')
    let cards = 0
    let quarantines = 0
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink())
        throw new Error('Execution recovery cannot follow a linked card directory')
      if (!entry.isDirectory())
        continue
      if (entry.name.length > 120 || entry.name !== entry.name.trim())
        throw new Error('Execution recovery found an invalid card directory')
      const path = join(root, entry.name, 'alicization.db')
      const info = await lstat(path).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT')
          return null
        throw error
      })
      // A card can have a model/profile directory before its life DB is created.
      if (!info)
        continue
      if (!info.isFile() || info.isSymbolicLink())
        throw new Error('Execution recovery needs the card\'s own database file')
      const effects = await options.readCardEffects(entry.name)
      if (effects.length > 4096 || quarantines + effects.length > 8192)
        throw new Error('Execution recovery exceeds its unresolved-effect budget')
      cards++
      for (const effect of effects) {
        if (effect.kind !== 'execute' || !['dispatched', 'uncertain'].includes(effect.status))
          throw new Error('Execution recovery received a non-pending effect')
        const contract = effect.payload.effectContract as { sideEffect?: string, retryClass?: string } | undefined
        if (contract?.sideEffect === 'read' && contract.retryClass === 'read-only')
          continue
        // An unavailable path must not turn a pending write into a free resource.
        // Keep the global guard on any read/canonicalization error.
        const { resources } = await executionRecoveryResources(entry.name, effect)
        options.broker.restoreQuarantine({ cardId: entry.name, effectId: effect.id, resources })
        quarantines++
      }
      const downloads = await options.readCardDownloadResources?.(entry.name) ?? []
      if (downloads.length > 4096 || quarantines + downloads.length > 8192)
        throw new Error('Execution recovery exceeds its native-child budget')
      for (const download of downloads) {
        options.broker.restoreQuarantine({ cardId: entry.name, ...download })
        quarantines++
      }
    }
    options.broker.settle(guard, { stopped: true, uncertain: false })
    return { cards, quarantines }
  }
  return { restore: () => completion ??= restore() }
}
