import type { LifeEvidenceRef } from '../../../../shared/life-contracts'
import type { PersonaFacetDraft } from '../../../../shared/persona-development-contracts'
import type { PersonaDevelopmentMutation } from '../../../../shared/persona-development-mutations'

import process from 'node:process'

import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createLifeSoulActivationRuntime } from '../life-soul-activation-runtime'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { writeAlicizationAtomicContent } from '../runtime-atomic-write'
import { configuredLifeGeneration } from '../test-support/configured-life-generation'
import { createDesktopPersonaDevelopment } from './composition'
import { effectivePersonaEvidence } from './evidence'
import { projectPersonaDevelopment } from './projection'
import { createPersonaDevelopmentRuntime } from './runtime'
import { personaDigest, readPersonaDevelopment, zeroPersonaEffects } from './schema'
import { personaSoulCore, readPersonaSoul } from './soul'

const day = 86_400_000
const draft: PersonaFacetDraft = { id: 'quiet-companionship', kind: 'relationship-habit', subject: 'relationship', label: '在工作停顿时温和地接上话题', context: 'focused-work', exceptions: ['用户明确要求立即回应时'], effects: { ...zeroPersonaEffects(), initiative: -0.1, patience: 0.1 } }
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'alicization-persona-development-'))
  let now = Date.now()
  const beganAt = now - 20 * day
  let db = await setupAlicizationDb(root, { cardId: 'alice' })
  const commit = (operation: PersonaDevelopmentMutation) => db.commitLifeState({ cardId: 'alice', operationKey: randomUUID(), changes: [], mutations: [{ type: 'persona-development', operation }] })
  const state = async () => readPersonaDevelopment((await db.readLifeState()).values)
  async function reflection(index: number, turnId = `experience-${index}`): Promise<LifeEvidenceRef> {
    const [record] = await db.upsertMemoryReflections([{ id: `reflection-${index}`, cardId: 'alice', turnId, sourceKind: 'reply', targetScope: 'relationship', summary: `第${index}次工作停顿后的交流更合适。`, lesson: `第${index}次共同经历：先留出专注空间，在停顿后再接话。`, status: 'confirmed', confidence: 0.9, createdAt: beganAt + (index + 1) * day, updatedAt: beganAt + (index + 1) * day }])
    return { cardId: 'alice', kind: 'memory_reflections', id: record.id, version: String(record.updatedAt) }
  }
  async function observe(ref: LifeEvidenceRef, facet = draft, polarity: 'support' | 'oppose' = 'support') {
    await commit({ action: 'observe', observations: [{ facet, source: ref, polarity }] })
  }
  async function trials() {
    const life = createLifeTurnRuntime({ read: db.readLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, commit: db.commitLifeState, now: () => now })
    for (let index = 0; index < 3; index++) {
      const turnId = `trial-${index}`
      await life.admit({ cardId: 'alice', turnId, conversationId: 'trial-session', messages: [{ role: 'user', content: '继续工作' }] }, new AbortController().signal)
      await commit({ action: 'consume', facetIds: [draft.id], context: draft.context, turnId, requestHash: 'a'.repeat(64) })
      const [feedback] = await db.appendPersonaReinforcementEvents([{ cardId: 'alice', turnId, sourceKind: 'reply', dimension: 'companionship', valence: 'reinforce', delta: 0.12, summary: 'dialogue_feedback=received; dimension=companionship', createdAt: now }])
      await commit({ action: 'observe', observations: [], extracted: { cardId: 'alice', kind: 'persona_reinforcement_events', id: feedback.id, version: String(feedback.createdAt) } })
    }
  }
  const soulPath = join(root, 'SOUL.md')
  const soul = createLifeSoulActivationRuntime({ cardId: 'alice', rootDir: root, soulPath, validate: () => {}, read: db.readLifeState, getEffect: db.getLifeEffect, commit: db.commitLifeState, writeAtomic: (path, content) => writeAlicizationAtomicContent({ path, content, category: 'persona-test' }) })
  const runtime = createPersonaDevelopmentRuntime({ read: db.readLifeState, commit: db.commitLifeState, sources: async () => [], extract: async () => [], readSoul: () => readFile(soulPath, 'utf8'), activate: (content, base, authorization) => soul.write(content, base, undefined, authorization), foregroundActive: () => false, now: () => now })
  return {
    get db() { return db },
    root,
    commit,
    state,
    reflection,
    observe,
    trials,
    soul,
    runtime,
    soulPath,
    setNow: (value: number) => { now = value },
    reopen: async () => {
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
    },
    close: async () => {
      await db.close()
      await rm(root, { recursive: true, force: true })
    },
  }
}

describe('durable personality development', () => {
  it('deduplicates two representations of the same experience across restart', async () => {
    const f = await fixture()
    try {
      const source = await f.reflection(1, 'same-turn')
      await f.observe(source)
      const [duplicate] = await f.db.appendPersonaReinforcementEvents([{ cardId: 'alice', turnId: 'same-turn', sourceKind: 'reply', dimension: 'companionship', valence: 'reinforce', delta: 0.12, summary: '这次留出了空间。', createdAt: 3 * day }])
      await f.observe({ cardId: 'alice', kind: 'persona_reinforcement_events', id: duplicate.id, version: String(duplicate.createdAt) })
      await f.reopen()
      for (let index = 0; index < 20; index++) await f.observe(source)
      expect((await f.state()).facets[0]).toMatchObject({ independentEvents: 1, status: 'exploring' })
      expect(projectPersonaDevelopment(await f.db.readLifeState(), 'focused-work').facets).toHaveLength(0)
    }
    finally { await f.close() }
  })
  it('requires independent days and exact interaction feedback before adopting a scoped habit into SOUL', async () => {
    const f = await fixture()
    try {
      await f.soul.write('One continuous identity.\n')
      for (let index = 0; index < 8; index++) await f.observe(await f.reflection(index))
      expect((await f.state()).facets[0]).toMatchObject({ independentEvents: 8, distinctDays: 8, status: 'supported' })
      await f.runtime.reconcileSoul(new AbortController().signal)
      expect(readPersonaSoul(await readFile(f.soulPath, 'utf8'))).toEqual([])
      await f.trials()
      expect((await f.state()).facets[0]).toMatchObject({ successfulTrials: 3, status: 'mature' })
      await f.runtime.reconcileSoul(new AbortController().signal)
      const content = await readFile(f.soulPath, 'utf8')
      expect(personaSoulCore(content)).toBe('One continuous identity.')
      expect(readPersonaSoul(content)[0].id).toBe(draft.id)
      const projection = projectPersonaDevelopment(await f.db.readLifeState(), 'focused-work')
      expect(projection.effects.initiative).toBe(-0.1)
      expect(projectPersonaDevelopment(await f.db.readLifeState(), 'rest').facets).toHaveLength(0)
      await expect(f.soul.write(content.replace('One continuous identity.', 'Another identity.'), personaDigest(content), undefined, { developmentId: 'forged', facetHash: 'a'.repeat(64) })).rejects.toThrow('core personality')
    }
    finally { await f.close() }
  })
  it('rejects host likes as own interests, wrong cards, stale evidence and changed hypothesis identities', async () => {
    const f = await fixture()
    try {
      const source = await f.reflection(1)
      await expect(f.observe(source, { ...draft, kind: 'interest', subject: 'self' })).rejects.toThrow('Host preferences')
      await expect(f.observe({ ...source, cardId: 'other' })).rejects.toThrow('boundary')
      await expect(f.observe({ ...source, version: '0' })).rejects.toThrow('stale')
      await f.observe(source)
      await expect(f.observe(source, { ...draft, label: 'A different hypothesis' })).rejects.toThrow('different hypothesis')
    }
    finally { await f.close() }
  })
  it('withdraws contributing evidence and cannot resurrect a forgotten facet', async () => {
    const f = await fixture()
    try {
      const source = await f.reflection(1)
      await f.observe(source)
      await f.db.commitLifeState({ cardId: 'alice', operationKey: 'forget-persona-source', changes: [], mutations: [{ type: 'evidence-invalidate', source, mode: 'forget', reason: 'host-request' }] })
      expect((await f.state()).facets[0]).toMatchObject({ status: 'withdrawn', label: '', independentEvents: 0 })
      await expect(f.observe(source)).rejects.toThrow()
      expect(projectPersonaDevelopment(await f.db.readLifeState(), 'focused-work').facets).toEqual([])
    }
    finally { await f.close() }
  })
  it('pauses adaptation and rejects feedback for an unrelated reply', async () => {
    const f = await fixture()
    try {
      const source = await f.reflection(1)
      await f.commit({ action: 'pause' })
      await expect(f.observe(source)).rejects.toThrow('paused')
      await f.commit({ action: 'resume' })
      await expect(f.commit({ action: 'feedback', facetId: draft.id, turnId: 'another-reply', source, positive: true })).rejects.toThrow('exact interaction')
    }
    finally { await f.close() }
  })
  it('decays positive and negative evidence independently and never amplifies through reading', () => {
    expect(effectivePersonaEvidence(1, 0, 180 * day, 180)).toBeCloseTo(0.5)
    expect(effectivePersonaEvidence(1, 180 * day, 180 * day, 90)).toBe(1)
    expect(effectivePersonaEvidence(1, day, 0, 180)).toBe(1)
    expect(() => effectivePersonaEvidence(1, 0, 1, 0)).toThrow()
  })
  it('keeps mature identity during pause and immediately removes withdrawn SOUL material', async () => {
    const f = await fixture()
    try {
      await f.soul.write('One continuous identity.\n')
      for (let index = 0; index < 8; index++) await f.observe(await f.reflection(index))
      await f.trials()
      await f.runtime.reconcileSoul(new AbortController().signal)
      await f.commit({ action: 'pause' })
      expect(projectPersonaDevelopment(await f.db.readLifeState(), draft.context).facets[0].status).toBe('mature')
      const previews = await f.db.readPersonaSources(draft.id, 1)
      expect(previews).toHaveLength(8)
      expect(previews.every(source => source.available && source.text)).toBe(true)
      const view = await f.db.readLifeState()
      await f.runtime.command({ cardId: 'alice', operationId: 'withdraw-adopted', expectedHash: view.owners.find(owner => owner.owner === 'persona-development')!.contentHash, action: 'withdraw', facetId: draft.id, expectedVersion: 1 })
      expect(readPersonaSoul(await readFile(f.soulPath, 'utf8'))).toEqual([])
      expect((await f.state()).adoption?.facets).toEqual([])
      expect(projectPersonaDevelopment(await f.db.readLifeState(), draft.context).facets).toEqual([])
      await expect(f.db.readPersonaSources(draft.id, 1)).rejects.toThrow('changed')
    }
    finally { await f.close() }
  })
  it('restarts a corrected hypothesis with fresh evidence and never counts old roots again', async () => {
    const f = await fixture()
    try {
      const refs: LifeEvidenceRef[] = []
      for (let index = 0; index < 8; index++) {
        const ref = await f.reflection(index)
        refs.push(ref)
        await f.observe(ref)
      }
      await f.commit({ action: 'correct', facetId: draft.id, expectedVersion: 1, correction: '明确邀请聊天时可以直接接话' })
      const revised = (await f.state()).facets[0]
      expect(revised).toMatchObject({ version: 2, independentEvents: 0, successfulTrials: 0, status: 'exploring', adoptedSoulHash: null })
      const revisedDraft = { ...draft, exceptions: revised.exceptions }
      for (const ref of refs) await f.observe(ref, revisedDraft)
      expect((await f.state()).facets[0].independentEvents).toBe(0)
      await f.observe(await f.reflection(8), revisedDraft)
      expect((await f.state()).facets[0].independentEvents).toBe(1)
      await expect(f.commit({ action: 'withdraw', facetId: draft.id, expectedVersion: 1 })).rejects.toThrow('changed')
    }
    finally { await f.close() }
  })
  it('distinguishes negative, interrupted and unjudged trials from directions reinforced by feedback', async () => {
    const f = await fixture()
    try {
      for (let index = 0; index < 3; index++) await f.observe(await f.reflection(index))
      const life = createLifeTurnRuntime({ read: f.db.readLifeState, getIngress: f.db.getLifeIngress, getEffect: f.db.getLifeEffect, commit: f.db.commitLifeState, now: Date.now })
      for (const [index, summary] of ['普通的陪伴经历。', 'dialogue_feedback=interrupted; dimension=companionship', 'dialogue_feedback=robotic; dimension=companionship'].entries()) {
        const turnId = `attribution-${index}`
        await life.admit({ cardId: 'alice', turnId, conversationId: 'test', messages: [{ role: 'user', content: '说说看' }] }, new AbortController().signal)
        await f.commit({ action: 'consume', facetIds: [draft.id], context: draft.context, turnId, requestHash: 'a'.repeat(64) })
        const [feedback] = await f.db.appendPersonaReinforcementEvents([{ cardId: 'alice', turnId, sourceKind: 'reply', dimension: 'companionship', valence: 'reinforce', delta: 0.08, summary }])
        await f.commit({ action: 'observe', observations: [], extracted: { cardId: 'alice', kind: 'persona_reinforcement_events', id: feedback.id, version: String(feedback.createdAt) } })
        expect((await f.state()).facets[0].successfulTrials).toBe(0)
      }
      expect((await f.state()).facets[0]).toMatchObject({ failedTrials: 1, status: 'disputed' })
      await f.commit({ action: 'reconsider', facetId: draft.id, expectedVersion: 1 })
      expect((await f.state()).facets[0]).toMatchObject({ version: 2, failedTrials: 0, status: 'exploring', independentEvents: 0 })
    }
    finally { await f.close() }
  })
  it('uses the desktop extraction pipeline incrementally and keeps private evidence away from generation', async () => {
    const f = await fixture()
    try {
      await f.soul.write('One continuous identity.\n')
      for (let index = 0; index < 3; index++) await f.reflection(index)
      await f.db.upsertMemoryReflections([{ id: 'private-reflection', cardId: 'alice', turnId: 'private-turn', sourceKind: 'reply', targetScope: 'relationship', summary: '联系邮箱 alice@example.com', lesson: '联系邮箱 alice@example.com', status: 'confirmed', confidence: 0.9 }])
      const prompts: string[] = []
      const desktop = () => createDesktopPersonaDevelopment({ database: f.db, cardId: 'alice', readSoul: () => readFile(f.soulPath, 'utf8'), activate: (content, base, authorization) => f.soul.write(content, base, undefined, authorization), foregroundActive: () => false, generate: async (_system, user) => {
        prompts.push(user)
        return JSON.stringify([{ facet: { ...draft, id: 'learned-habit' }, polarity: 'support' }])
      } })
      const first = desktop()
      expect(await first.run('alice')).toMatchObject({ processed: 2 })
      expect(prompts.join('')).not.toContain('alice@example.com')
      expect((await f.state()).facets[0].independentEvents).toBe(2)
      const second = desktop()
      expect(await second.run('alice')).toMatchObject({ processed: 1 })
      expect(await second.run('alice')).toMatchObject({ processed: 0 })
      expect(prompts).toHaveLength(3)
      expect((await f.state()).facets[0]).toMatchObject({ independentEvents: 3, status: 'supported' })
    }
    finally { await f.close() }
  })
  it('cancels learning when actual foreground activity resumes before a model answer can commit', async () => {
    const f = await fixture()
    try {
      await f.soul.write('One continuous identity.\n')
      await f.reflection(1)
      let foreground = false
      const desktop = createDesktopPersonaDevelopment({ database: f.db, cardId: 'alice', readSoul: () => readFile(f.soulPath, 'utf8'), activate: (content, base, authorization) => f.soul.write(content, base, undefined, authorization), foregroundActive: () => foreground, generate: async () => {
        foreground = true
        return JSON.stringify([{ facet: draft, polarity: 'support' }])
      } })
      expect(await desktop.run('alice')).toMatchObject({ processed: 0 })
      expect((await f.state()).facets).toHaveLength(0)
      expect(await f.db.readPersonaLearningEvidence()).toHaveLength(1)
      await expect(f.commit({ action: 'skip-source', source: await f.reflection(2) })).rejects.toThrow('cannot be silently skipped')
    }
    finally { await f.close() }
  })
  it('can support a repaired new habit from negative feedback while an interruption teaches no hypothesis', async () => {
    const f = await fixture()
    try {
      await f.soul.write('One continuous identity.\n')
      await f.db.appendPersonaReinforcementEvents([
        { cardId: 'alice', turnId: 'unhelpful-style', sourceKind: 'reply', dimension: 'companionship', valence: 'reinforce', delta: 0.08, summary: 'dialogue_feedback=robotic; dimension=companionship' },
        { cardId: 'alice', turnId: 'interrupted-style', sourceKind: 'reply', dimension: 'companionship', valence: 'suppress', delta: 0.03, summary: 'dialogue_feedback=interrupted; dimension=companionship' },
      ])
      let calls = 0
      const desktop = createDesktopPersonaDevelopment({ database: f.db, cardId: 'alice', readSoul: () => readFile(f.soulPath, 'utf8'), activate: (content, base, authorization) => f.soul.write(content, base, undefined, authorization), foregroundActive: () => false, generate: async () => {
        calls++
        return JSON.stringify([{ facet: draft, polarity: 'support' }])
      } })
      expect(await desktop.run('alice')).toMatchObject({ processed: 2 })
      expect(calls).toBe(1)
      expect((await f.state()).facets[0]).toMatchObject({ independentEvents: 1, opposition: 0, successfulTrials: 0 })
    }
    finally { await f.close() }
  })
  it('restores the exact prior core if a personality source is forgotten during file replacement', async () => {
    const f = await fixture()
    try {
      const original = 'One continuous identity.\n'
      await f.soul.write(original)
      const refs: LifeEvidenceRef[] = []
      for (let index = 0; index < 8; index++) {
        const ref = await f.reflection(index)
        refs.push(ref)
        await f.observe(ref)
      }
      await f.trials()
      const fenced = createLifeSoulActivationRuntime({ cardId: 'alice', rootDir: f.root, soulPath: f.soulPath, validate: () => {}, read: f.db.readLifeState, commit: f.db.commitLifeState, writeAtomic: async (path, content) => {
        await writeAlicizationAtomicContent({ path, content, category: 'persona-race-test' })
        if (path === f.soulPath && content.includes('Learned Personality'))
          await f.db.commitLifeState({ cardId: 'alice', operationKey: 'forget-during-soul-write', changes: [], mutations: [{ type: 'evidence-invalidate', source: refs[0], mode: 'forget', reason: 'source withdrawn while activation was writing' }] })
      } })
      const runtime = createPersonaDevelopmentRuntime({ read: f.db.readLifeState, commit: f.db.commitLifeState, sources: async () => [], extract: async () => [], readSoul: () => readFile(f.soulPath, 'utf8'), activate: (content, base, authorization) => fenced.write(content, base, undefined, authorization), foregroundActive: () => false, now: Date.now })
      await expect(runtime.reconcileSoul(new AbortController().signal)).rejects.toThrow('prepared development')
      expect(await readFile(f.soulPath, 'utf8')).toBe(original)
      expect((await f.state()).facets[0]).toMatchObject({ status: 'withdrawn', label: '' })
      expect((await f.db.readLifeState()).soulActivations.filter(intent => intent.developmentAuthorization).every(intent => intent.status === 'failed')).toBe(true)
      expect(await f.soul.recover()).toBe(false)
    }
    finally { await f.close() }
  })
  it.skipIf(process.env.LIFE_QA_CONFIGURED_GROWTH !== '1')('extracts bounded actual model hypotheses from synthetic reviewed desktop experiences', async () => {
    const f = await fixture()
    try {
      await f.soul.write('One continuous identity.\n')
      await f.reflection(1)
      await f.reflection(2)
      const provider = await configuredLifeGeneration()
      const desktop = createDesktopPersonaDevelopment({ database: f.db, cardId: 'alice', readSoul: () => readFile(f.soulPath, 'utf8'), activate: (content, base, authorization) => f.soul.write(content, base, undefined, authorization), foregroundActive: () => false, generate: (system, user, signal) => provider.generate({ system, user, signal, judge: false }) })
      expect(await desktop.run('alice')).toMatchObject({ processed: 2 })
      const state = await f.state()
      expect(state.facets.length).toBeGreaterThan(0)
      expect(state.facets.every(facet => facet.status === 'exploring' && facet.adoptedSoulHash === null && facet.independentEvents <= 2)).toBe(true)
      expect(readPersonaSoul(await readFile(f.soulPath, 'utf8'))).toEqual([])
      await provider.save('configured-personality-extraction', state)
    }
    finally { await f.close() }
  }, 180000)
})
