import type sqlite3 from 'sqlite3'

import type { AlicizationEpisodicEventRecord } from '../../../shared/eventa'
import type { AlicizationRankedEpisodicCandidate } from './memory-episodic-retrieval'

import { buildAlicizationRecalledEpisodicEvents } from './memory-episodic-retrieval'

interface CreateAlicizationMemoryEpisodicReconsolidationRuntimeOptions {
  database: sqlite3.Database
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  runInTransaction: <T>(database: sqlite3.Database, task: () => Promise<T>) => Promise<T>
}

export function createAlicizationMemoryEpisodicReconsolidationRuntime(
  input: CreateAlicizationMemoryEpisodicReconsolidationRuntimeOptions,
) {
  const persistRecalledEvents = async (events: AlicizationEpisodicEventRecord[]) => {
    await input.runInTransaction(input.database, async () => {
      for (const event of events) {
        const latestReconsolidation = event.latestReconsolidation
        if (latestReconsolidation) {
          await input.run(
            input.database,
            `
            INSERT INTO episodic_reconsolidation_overlays (
              id,
              event_id,
              at,
              decision_trace_id,
              provenance,
              confidence,
              reason,
              emotion_tags_json,
              relationship_meaning,
              lesson,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              `${event.id}:${latestReconsolidation.at}:${event.reconsolidationCount}`,
              event.id,
              latestReconsolidation.at,
              latestReconsolidation.decisionTraceId ?? null,
              latestReconsolidation.provenance,
              latestReconsolidation.confidence,
              latestReconsolidation.reason,
              JSON.stringify(latestReconsolidation.emotionTags),
              latestReconsolidation.relationshipMeaning ?? null,
              latestReconsolidation.lesson ?? null,
              event.updatedAt,
            ],
          )
        }
        await input.run(
          input.database,
          `
          UPDATE episodic_events
          SET updated_at = ?,
              last_recalled_at = ?,
              recall_count = ?,
              reconsolidation_count = ?,
              latest_reconsolidation_json = ?
          WHERE id = ?
          `,
          [
            event.updatedAt,
            event.lastRecalledAt,
            event.recallCount,
            event.reconsolidationCount,
            JSON.stringify(event.latestReconsolidation),
            event.id,
          ],
        )
      }
    })
  }

  const reconcileSelectedEvents = async (runtimeInput: {
    selected: AlicizationRankedEpisodicCandidate[]
    recalledAt: number
    affectAnchors?: string[]
    relationshipAnchors?: string[]
    carryAsMemory?: boolean
    correctionShapingRationale?: string
    reconsolidationDecisionTraceId?: string | null
  }) => {
    const returned = buildAlicizationRecalledEpisodicEvents(runtimeInput)
    await persistRecalledEvents(returned)
    return returned
  }

  return {
    persistRecalledEvents,
    reconcileSelectedEvents,
  }
}
