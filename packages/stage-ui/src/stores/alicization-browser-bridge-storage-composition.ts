import type { AlicizationVisualPresenceStateSnapshot } from './alicization-bridge'
import type {
  BrowserConversationTurnRecord,
  BrowserEpisodicMemoryRecord,
  BrowserMindTurnEventRecord,
  BrowserOrganicMemoryRecord,
  BrowserProactiveLoopState,
} from './alicization-browser-storage'

import {
  readConversationTurns as readConversationTurnsFromStorage,
  readEpisodicMemory as readEpisodicMemoryFromStorage,
  readMindTurnEvents as readMindTurnEventsFromStorage,
  readOrganicMemory as readOrganicMemoryFromStorage,
  readProactiveLoopState as readProactiveLoopStateFromStorage,
  readVisualPresenceState as readVisualPresenceStateFromStorage,
  writeConversationTurns as writeConversationTurnsToStorage,
  writeEpisodicMemory as writeEpisodicMemoryToStorage,
  writeMindTurnEvents as writeMindTurnEventsToStorage,
  writeOrganicMemory as writeOrganicMemoryToStorage,
  writeProactiveLoopState as writeProactiveLoopStateToStorage,
} from './alicization-browser-storage'

export function createAlicizationBrowserBridgeStorageComposition(input: {
  maxConversationTurns: number
  now: () => number
}) {
  const readOrganicMemory = async (cardId: string) => await readOrganicMemoryFromStorage(cardId)

  const writeOrganicMemory = async (cardId: string, record: BrowserOrganicMemoryRecord) => {
    await writeOrganicMemoryToStorage(cardId, record)
  }

  const readEpisodicMemory = async (cardId: string) => await readEpisodicMemoryFromStorage(cardId)

  const writeEpisodicMemory = async (cardId: string, record: BrowserEpisodicMemoryRecord) => {
    await writeEpisodicMemoryToStorage(cardId, {
      events: [...record.events]
        .sort((left, right) => right.occurredAt - left.occurredAt || right.updatedAt - left.updatedAt)
        .slice(0, 160),
    } satisfies BrowserEpisodicMemoryRecord)
  }

  const readConversationTurns = async (cardId: string) => await readConversationTurnsFromStorage(cardId)

  const writeConversationTurns = async (cardId: string, turns: BrowserConversationTurnRecord[]) => {
    await writeConversationTurnsToStorage(cardId, turns.slice(-input.maxConversationTurns))
  }

  async function readMindTurnEvents(cardId: string) {
    return await readMindTurnEventsFromStorage(cardId)
  }

  async function writeMindTurnEvents(cardId: string, events: BrowserMindTurnEventRecord[]) {
    await writeMindTurnEventsToStorage(cardId, events.slice(-(input.maxConversationTurns * 4)))
  }

  const readProactiveLoopState = async (cardId: string) => await readProactiveLoopStateFromStorage(cardId, input.now)

  const writeProactiveLoopState = async (cardId: string, state: BrowserProactiveLoopState) => {
    await writeProactiveLoopStateToStorage(cardId, state)
  }

  const readVisualPresenceState = async (cardId: string): Promise<AlicizationVisualPresenceStateSnapshot | null> => await readVisualPresenceStateFromStorage(cardId)

  return {
    readOrganicMemory,
    writeOrganicMemory,
    readEpisodicMemory,
    writeEpisodicMemory,
    readConversationTurns,
    writeConversationTurns,
    readMindTurnEvents,
    writeMindTurnEvents,
    readProactiveLoopState,
    writeProactiveLoopState,
    readVisualPresenceState,
  }
}
