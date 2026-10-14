import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifePersonalProjectRuntime } from './life-personal-project-runtime'
import { createLifeProjectExperienceRecorder } from './life-project-experience-runtime'
import { createLifeTurnRuntime } from './life-turn-runtime'
import { isPassiveLifeSvg, renderLifeVisualDraft } from './life-visual-activity'
import { dispatchTaskThread } from './task-thread-dispatcher'

describe('a visual choice has an actual passive artwork and experience', () => {
  it('creates, independently reads and remembers a local SVG without learning fictional scenery as life history', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-visual-study-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const workspace = join(root, 'art')
    try {
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      await life.admit({ cardId: 'alice', turnId: 'drawing-choice', conversationId: 'test', messages: [{ role: 'user', content: '你自己想画什么？' }] }, new AbortController().signal)
      await life.settle({ cardId: 'alice', turnId: 'drawing-choice', status: 'completed', committedText: '我想画一盏雾里的暖色小灯。' })
      const runtime = createLifePersonalProjectRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, facts: cardId => db.readLifeFactVersions({ cardId }), upsertTask: db.upsertTaskThread, workspace: () => workspace, foregroundActive: () => false, now: Date.now, composeVisual: async () => ({ title: '雾里的灯', scene: 'lantern', palette: ['#293344', '#e8bd78', '#53606b'], arrangement: 3 }), dispatch: input => dispatchTaskThread(db, { ...input, ownedNoteRoot: workspace, cli: { ...input.cli, runtimeContext: { generatedAt: Date.now(), cardId: 'alice', turnId: input.threadId, sensory: { collectedAt: Date.now(), running: false, stale: true, ageMs: 0, foregroundWindow: null, capture: null } } } }), recordExperience: createLifeProjectExperienceRecorder({ read: db.readLifeState, commit: db.commitLifeState, readMeta: db.getMetaValue, appendEpisodes: db.appendEpisodicEvents }) })
      expect(await runtime.run('alice')).toMatchObject({ status: 'completed' })
      const goal = (await db.readLifeState()).obligations.find(item => item.personalActivity === 'visual-study-v1')!
      const svg = await readFile(goal.proof.path!, 'utf8')
      expect(goal.proof.path).toMatch(/\.svg$/u)
      expect(isPassiveLifeSvg(svg)).toBe(true)
      expect(goal.proof.contentHash).toBe(createHash('sha256').update(svg).digest('hex'))
      const episode = (await db.listRecentEpisodicEvents(10)).find(item => item.turnId === goal.threadId)!
      expect(episode.whatHappened).toContain('画面不作为真实世界经历')
      expect(await db.readLifeFactVersions({ cardId: 'alice' })).toHaveLength(0)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
  it('escapes text and excludes executable or externally sourced SVG', () => {
    const svg = renderLifeVisualDraft({ title: '<script>bad</script>', scene: 'rain', palette: ['#000000', '#ffffff', '#333333'], arrangement: 0 }, '<image href="https://example.com"/>')
    expect(svg).not.toContain('<script>')
    expect(svg).not.toContain('<image')
    for (const active of ['<script>alert(1)</script>', '<image href="https://example.com"/>', '<rect onload="alert(1)"/>', '<foreignObject/>'])
      expect(isPassiveLifeSvg(`<svg xmlns="http://www.w3.org/2000/svg">${active}</svg>`)).toBe(false)
  })
})
