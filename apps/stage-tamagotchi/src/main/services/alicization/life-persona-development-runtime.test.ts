import type { PersonaTrainingDatasetExample } from './persona-training-dataset-runtime'

import process from 'node:process'

import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { describe, expect, it, vi } from 'vitest'

import * as v from 'valibot'

import { setupAlicizationDb } from './db'
import { createLifePersonaDevelopmentRuntime } from './life-persona-development-runtime'
import { fingerprintLifePersonaEvaluation, lifePersonaEvaluationSchema } from './life-persona-evaluation'
import { createLifePersonaProposalRuntime } from './life-persona-proposal-runtime'
import { createLifeSoulActivationRuntime } from './life-soul-activation-runtime'
import { createLifeTurnRuntime } from './life-turn-runtime'
import { personaTrainingExampleContentHash } from './persona-training-dataset-runtime'
import { writeAlicizationAtomicContent } from './runtime-atomic-write'
import { configuredLifeGeneration } from './test-support/configured-life-generation'

const hash = (input: string) => createHash('sha256').update(input).digest('hex')
async function seedExamples(root: string) {
  const connection = await new Promise<sqlite3.Database>((resolve, reject) => { const db = new sqlite3.Database(join(root, 'alicization.db'), error => error ? reject(error) : resolve(db)) })
  const examples: PersonaTrainingDatasetExample[] = []
  try {
    for (let index = 0; index < 3; index++) {
      const example: PersonaTrainingDatasetExample = { id: `clean-${index}`, datasetId: 'cleaned-v1', cardId: 'alice', schemaVersion: 'persona-training-example-v1', sourceId: `reflection-${index}`, sourceKind: 'cleaned-long-term-reflection', contentHash: hash(`cleaned-${index}`), behaviorLesson: `清洗审核的行为经验 ${index}`, positiveExample: '我会陪你，同时诚实说明我还没有做的事情。', negativeExample: '已经全部做完了。', sensitivity: 'public', piiStatus: 'clear', piiReason: null, consentSnapshot: { granted: true, policyVersion: 'test-v1', scope: 'persona-dataset' }, provenance: { kind: 'working-memory-cleaning', cleaningTransactionId: `cleaning-${index}`, cleanedAt: 100 }, allowTraining: true, state: 'staged', createdAt: 100 }
      example.contentHash = personaTrainingExampleContentHash(example)
      await new Promise<void>((resolve, reject) => connection.run(`INSERT INTO persona_training_dataset_examples(id,dataset_id,card_id,schema_version,source_id,source_kind,content_hash,behavior_lesson,positive_example,negative_example,sensitivity,pii_status,consent_snapshot_json,provenance_json,allow_training,state,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [example.id, example.datasetId, example.cardId, example.schemaVersion, example.sourceId, example.sourceKind, example.contentHash, example.behaviorLesson, example.positiveExample, example.negativeExample, example.sensitivity, example.piiStatus, JSON.stringify(example.consentSnapshot), JSON.stringify(example.provenance), 1, example.state, 100], error => error ? reject(error) : resolve()))
      examples.push(example)
    }
    return examples
  }
  finally { await new Promise<void>((resolve, reject) => connection.close(error => error ? reject(error) : resolve())) }
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'life-persona-pair-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice', rootDir: root })
  const soulPath = join(root, 'SOUL.md')
  const examples = await seedExamples(root)
  const soul = createLifeSoulActivationRuntime({ cardId: 'alice', rootDir: root, soulPath, validate: () => {}, writeAtomic: (path, content) => writeAlicizationAtomicContent({ path, content, category: 'persona-pair-test' }), read: db.readLifeState, commit: db.commitLifeState, getEffect: db.getLifeEffect })
  await soul.write('same enduring identity, original expression')
  await db.upsertMemoryConsolidations([{ id: 'source', kind: 'daily', periodKey: '2026-10-04', periodStartedAt: 100, periodEndedAt: 200, summary: '共同经历之后，表达需要更耐心。', lesson: '先回应感受', cues: ['耐心'], confidence: 0.9, dominantProvenance: 'remembered', derivedEventIds: [], updatedAt: 200 }])
  await createLifePersonaProposalRuntime({ read: db.readLifeState, commit: db.commitLifeState, listConsolidations: db.listMemoryConsolidations }).stage({ cardId: 'alice', turnId: 'dream', baseContent: 'same enduring identity, original expression', targetContent: 'same enduring identity, patient expression', sourceIds: ['source'] })
  const proposal = (await db.readLifeState()).effects[0]
  const generate = vi.fn(async (input: { system: string, judge: boolean }) => input.judge ? JSON.stringify({ identityPreserved: true, truthfulnessPreserved: true, companionshipPreserved: true, agencyPreserved: true, improved: true }) : input.system.includes('patient expression') ? '我先陪你。不确定的记忆与未完成的行动，我会说清楚。' : '我可以陪你，当前还没有执行。')
  const options = { read: db.readLifeState, commit: db.commitLifeState, getEffect: db.getLifeEffect, soulPath, examples: async () => examples, validateRevision: () => {}, generate, activate: soul.write, rollback: soul.rollbackPersona, foregroundActive: () => false }
  const command = { cardId: 'alice', proposalId: proposal.id, operationId: 'evaluate', expectedTargetHash: String(proposal.payload.targetHash), action: 'evaluate' as const }
  return { root, db, soul, soulPath, proposal, options, command, generate, close: async () => { await db.close(); await rm(root, { recursive: true, force: true }) } }
}

describe('candidate-specific persona development loop', () => {
  it.skipIf(process.env.LIFE_QA_CONFIGURED_GROWTH !== '1')('persists actual configured-model paired answers and keeps adoption behind exact human review', async () => {
    const f = await fixture()
    try {
      const trial = await configuredLifeGeneration()
      f.generate.mockImplementation(trial.generate)
      const runtime = createLifePersonaDevelopmentRuntime(f.options)
      await runtime.command(f.command)
      const evaluation = v.parse(lifePersonaEvaluationSchema, (await f.db.getLifeEffect(f.proposal.id))!.receipt)
      expect(trial.calls()).toBe(9)
      expect(evaluation.pairs).toHaveLength(3)
      expect(evaluation.approved).toBe(false)
      expect(await readFile(f.soulPath, 'utf8')).toContain('original expression')
      await expect(runtime.command({ ...f.command, action: 'adopt', expectedEvaluationHash: fingerprintLifePersonaEvaluation(evaluation) })).rejects.toThrow()
      await trial.save('configured-persona-pairs', evaluation)
    }
    finally { await f.close() }
  }, 600000)
  it('evaluates actual paired generations, requires exact human review, adopts one SOUL and rolls it back', async () => {
    const f = await fixture()
    try {
      const runtime = createLifePersonaDevelopmentRuntime(f.options)
      await runtime.command(f.command)
      expect(f.generate).toHaveBeenCalledTimes(9)
      expect(await readFile(f.soulPath, 'utf8')).toContain('original expression')
      let evaluation = v.parse(lifePersonaEvaluationSchema, (await f.db.getLifeEffect(f.proposal.id))!.receipt)
      await expect(runtime.command({ ...f.command, action: 'adopt', expectedEvaluationHash: fingerprintLifePersonaEvaluation(evaluation) })).rejects.toThrow('Review')
      await expect(runtime.command({ ...f.command, action: 'approve', expectedEvaluationHash: 'a'.repeat(64) })).rejects.toThrow('changed before review')
      await runtime.command({ ...f.command, action: 'approve', operationId: 'human-review', expectedEvaluationHash: fingerprintLifePersonaEvaluation(evaluation) })
      evaluation = v.parse(lifePersonaEvaluationSchema, (await f.db.getLifeEffect(f.proposal.id))!.receipt)
      await runtime.command({ ...f.command, action: 'adopt', expectedEvaluationHash: fingerprintLifePersonaEvaluation(evaluation) })
      expect(await readFile(f.soulPath, 'utf8')).toContain('patient expression')
      expect(JSON.parse((await f.db.readLifeState()).values['life:soul-active'])).toMatchObject({ contentHash: f.command.expectedTargetHash, persona: { proposalId: f.proposal.id } })
      const life = createLifeTurnRuntime({ read: f.db.readLifeState, commit: f.db.commitLifeState, getEffect: f.db.getLifeEffect, getIngress: f.db.getLifeIngress, now: Date.now })
      const signal = new AbortController().signal
      await life.admit({ cardId: 'alice', turnId: 'using-grown-persona', conversationId: 's', messages: [{ role: 'user', content: '你好' }] }, signal)
      const context = await life.context('alice')
      await life.recordContextUse({ cardId: 'alice', turnId: 'using-grown-persona', requestHash: 'actual-consumption', owners: context.owners, evidenceIds: [] }, signal)
      expect((await f.db.readLifeClosure('using-grown-persona')).nodes[15]).toMatchObject({ status: 'adopted', references: [f.proposal.id] })
      await runtime.command({ ...f.command, action: 'rollback' })
      expect(await readFile(f.soulPath, 'utf8')).toContain('original expression')
      await expect(runtime.command({ ...f.command, action: 'rollback' })).rejects.toThrow('no longer')
    }
    finally { await f.close() }
  })

  it('rejects raw or missing examples and withdraws evaluated material and an adopted revision when its source disappears', async () => {
    const f = await fixture()
    try {
      await expect(createLifePersonaDevelopmentRuntime({ ...f.options, examples: async () => [] }).command(f.command)).rejects.toThrow('cleaned')
      expect((await f.db.getLifeEffect(f.proposal.id))!.receipt).toBeNull()
      const runtime = createLifePersonaDevelopmentRuntime(f.options)
      await runtime.command(f.command)
      let evaluation = v.parse(lifePersonaEvaluationSchema, (await f.db.getLifeEffect(f.proposal.id))!.receipt)
      await runtime.command({ ...f.command, action: 'approve', operationId: 'review', expectedEvaluationHash: fingerprintLifePersonaEvaluation(evaluation) })
      evaluation = v.parse(lifePersonaEvaluationSchema, (await f.db.getLifeEffect(f.proposal.id))!.receipt)
      await runtime.command({ ...f.command, action: 'adopt', expectedEvaluationHash: fingerprintLifePersonaEvaluation(evaluation) })
      await f.db.tombstoneLongTermMemorySources({ cardId: 'alice', source: 'memory_consolidations', sourceIds: ['source'] })
      expect((await f.db.getLifeEffect(f.proposal.id))!.receipt).toBeNull()
      expect(await f.soul.recover()).toBe(true)
      expect(await readFile(f.soulPath, 'utf8')).toContain('original expression')
      await expect(runtime.command({ ...f.command, action: 'adopt', expectedEvaluationHash: fingerprintLifePersonaEvaluation(evaluation) })).rejects.toThrow('withdrawn')
    }
    finally { await f.close() }
  })

  it('holds preempted evaluations and refuses adopting or rolling back over a later manual identity edit', async () => {
    const f = await fixture()
    try {
      let foreground = false
      const options = { ...f.options, foregroundActive: () => foreground, generate: async (input: Parameters<typeof f.generate>[0]) => { foreground = true; return f.generate(input) } }
      await expect(createLifePersonaDevelopmentRuntime(options).command(f.command)).rejects.toThrow('preempted')
      expect((await f.db.getLifeEffect(f.proposal.id))!.receipt).toBeNull()
      const runtime = createLifePersonaDevelopmentRuntime(f.options)
      await runtime.command(f.command)
      let evaluation = v.parse(lifePersonaEvaluationSchema, (await f.db.getLifeEffect(f.proposal.id))!.receipt)
      await runtime.command({ ...f.command, action: 'approve', operationId: 'review', expectedEvaluationHash: fingerprintLifePersonaEvaluation(evaluation) })
      evaluation = v.parse(lifePersonaEvaluationSchema, (await f.db.getLifeEffect(f.proposal.id))!.receipt)
      await f.soul.write('later human edited identity')
      await expect(runtime.command({ ...f.command, action: 'adopt', expectedEvaluationHash: fingerprintLifePersonaEvaluation(evaluation) })).rejects.toThrow('changed since')
      expect(await readFile(f.soulPath, 'utf8')).toBe('later human edited identity')
    }
    finally { await f.close() }
  })
})
