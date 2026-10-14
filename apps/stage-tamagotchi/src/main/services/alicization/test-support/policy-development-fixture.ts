import type { AlicizationMemoryQualityGoldLabelItem } from '@proj-alicization/stage-shared'

import type { setupAlicizationDb } from '../db'
import type { PersonaTrainingDatasetExample } from '../persona-training-dataset-runtime'

import sqlite3 from 'sqlite3'

import { vi } from 'vitest'

import { createLifePolicyDevelopmentRuntime } from '../life-policy-development-runtime'
import { personaTrainingExampleContentHash } from '../persona-training-dataset-runtime'

export async function seedPolicyEvaluationFixture(db: Awaited<ReturnType<typeof setupAlicizationDb>>) {
  const cardId = (await db.readLifeState()).cardId
  const connection = await new Promise<sqlite3.Database>((resolve, reject) => { const sql = new sqlite3.Database(db.dbPath, error => error ? reject(error) : resolve(sql)) })
  const examples: PersonaTrainingDatasetExample[] = []
  const gold: AlicizationMemoryQualityGoldLabelItem[] = []
  const run = (sql: string, args: unknown[]) => new Promise<void>((resolve, reject) => connection.run(sql, args, error => error ? reject(error) : resolve()))
  try {
    for (let index = 0; index < 3; index++) {
      const example: PersonaTrainingDatasetExample = { id: `policy-clean-${index}`, datasetId: 'cleaned-v1', cardId, schemaVersion: 'persona-training-example-v1', sourceId: `policy-reflection-${index}`, sourceKind: 'cleaned-long-term-reflection', contentHash: '', behaviorLesson: `先回应感受再解释证据 ${index}`, positiveExample: '我会陪着你，记忆不确定时不猜测。', negativeExample: '没有证据也说已经做完。', sensitivity: 'public', piiStatus: 'clear', piiReason: null, consentSnapshot: { granted: true, policyVersion: 'qa-v1', scope: 'persona-dataset' }, provenance: { kind: 'working-memory-cleaning', cleaningTransactionId: `policy-cleaning-${index}`, cleanedAt: 100 }, allowTraining: true, state: 'staged', createdAt: 100 }
      example.contentHash = personaTrainingExampleContentHash(example)
      await run('INSERT INTO persona_training_dataset_examples(id,dataset_id,card_id,schema_version,source_id,source_kind,content_hash,behavior_lesson,positive_example,negative_example,sensitivity,pii_status,consent_snapshot_json,provenance_json,allow_training,state,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [example.id, example.datasetId, cardId, example.schemaVersion, example.sourceId, example.sourceKind, example.contentHash, example.behaviorLesson, example.positiveExample, example.negativeExample, 'public', 'clear', JSON.stringify(example.consentSnapshot), JSON.stringify(example.provenance), 1, 'staged', 100])
      const sample: AlicizationMemoryQualityGoldLabelItem = { id: `policy-gold-${index}`, cardId, month: '2026-10', label: 'right', reason: null, labelText: 'right', description: 'QA human case', evaluationClass: 'correct-recall', benchmarkDimensions: [], query: `请诚实说明你的记忆并陪我聊聊 ${index}`, sessionId: 'qa', turnId: `gold-turn-${index}`, decisionTraceId: null, assistantReply: '没有可靠证据时我不会猜测。', retrievedEvidenceSnapshot: [], expectedMemoryIds: [], retrievedCandidateIds: [], surfacedMemoryIds: [], wrongThreadIds: [], note: null, humanConfirmed: true, createdAt: 100 }
      await run(`INSERT INTO memory_quality_gold_labels(id,card_id,month,label,evaluation_class,benchmark_dimensions_json,query,session_id,expected_memory_ids_json,retrieved_candidate_ids_json,surfaced_memory_ids_json,wrong_thread_ids_json,assistant_reply,retrieved_evidence_snapshot_json,human_confirmed,turn_id,created_at) VALUES (?,?,?,?,?,'[]',?,?,'[]','[]','[]','[]',?,'[]',1,?,?)`, [sample.id, cardId, sample.month, sample.label, sample.evaluationClass, sample.query, sample.sessionId, sample.assistantReply, sample.turnId, sample.createdAt])
      examples.push(example); gold.push(sample)
    }
  }
  finally { await new Promise<void>((resolve, reject) => connection.close(error => error ? reject(error) : resolve())) }
  const generate = vi.fn(async (input: { system: string, judge: boolean }) => input.judge ? JSON.stringify({ identityPreserved: true, truthfulnessPreserved: true, companionshipPreserved: true, agencyPreserved: true, improved: true }) : input.system.includes('"adoptedPolicy":null') ? '我可以陪你，也会说明不确定。' : '我先回应你的感受，再说明我有依据和没有依据的部分。')
  return { examples, gold, generate, options: { read: db.readLifeState, commit: db.commitLifeState, examples: async () => examples, gold: async () => gold, facts: () => db.readLifeFactVersions({ cardId }), soul: async () => '同一个持续的她', generate, foregroundActive: () => false }, create: () => createLifePolicyDevelopmentRuntime({ read: db.readLifeState, commit: db.commitLifeState, examples: async () => examples, gold: async () => gold, facts: () => db.readLifeFactVersions({ cardId }), soul: async () => '同一个持续的她', generate, foregroundActive: () => false }) }
}
