import type { WorkingMemorySnapshot } from './working-memory'

function key(cardId: string, sessionId: string) {
  return `${cardId}::${sessionId}`
}

function cloneSnapshot(snapshot: WorkingMemorySnapshot): WorkingMemorySnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as WorkingMemorySnapshot
}

export interface WorkingMemoryStore {
  get: (cardId: string, sessionId: string) => WorkingMemorySnapshot | null
  latest: (cardId: string) => WorkingMemorySnapshot | null
  list: (cardId: string) => WorkingMemorySnapshot[]
  upsert: (snapshot: WorkingMemorySnapshot) => void
  clear: (cardId?: string, sessionId?: string) => void
}

export function createWorkingMemoryStore(): WorkingMemoryStore {
  const snapshots = new Map<string, WorkingMemorySnapshot>()
  return {
    get(cardId, sessionId) {
      const snapshot = snapshots.get(key(cardId, sessionId))
      return snapshot ? cloneSnapshot(snapshot) : null
    },
    latest(cardId) {
      const [snapshot] = this.list(cardId)
      return snapshot ?? null
    },
    list(cardId) {
      return [...snapshots.values()]
        .filter(snapshot => snapshot.cardId === cardId)
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .map(cloneSnapshot)
    },
    upsert(snapshot) {
      snapshots.set(key(snapshot.cardId, snapshot.sessionId), cloneSnapshot(snapshot))
    },
    clear(cardId, sessionId) {
      if (cardId && sessionId) {
        snapshots.delete(key(cardId, sessionId))
        return
      }
      if (cardId) {
        for (const snapshotKey of snapshots.keys()) {
          if (snapshotKey.startsWith(`${cardId}::`))
            snapshots.delete(snapshotKey)
        }
        return
      }
      snapshots.clear()
    },
  }
}
