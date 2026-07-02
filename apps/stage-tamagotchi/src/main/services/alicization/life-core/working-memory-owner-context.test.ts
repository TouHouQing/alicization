import { describe, expect, it } from 'vitest'

import { createEmptyWorkingMemorySnapshot } from './working-memory'
import {
  buildWorkingMemoryOwnerContext,
  buildWorkingMemoryOwnerReplyGovernance,
  buildWorkingMemoryOwnerSystemBlock,
  projectWorkingMemoryOwnerEpisodes,
} from './working-memory-owner-context'

describe('working memory owner context', () => {
  it('promotes snapshot state into an authoritative short-term owner context', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-1',
      now: 1200,
    })
    snapshot.currentThread = {
      title: 'B 线短期记忆 owner',
      currentUserMove: '继续',
      currentAliceMove: '收束 WorkingMemory 第二层',
      primaryAnchor: 'WorkingMemory owner',
      mode: 'task',
      shouldHold: true,
      confidence: 0.82,
    }
    snapshot.activeTask = {
      summary: '让 WorkingMemory 成为短期记忆链路 owner',
      status: 'active',
      evidenceTurnIds: ['turn-1:user'],
    }
    snapshot.unresolvedQuestions = [{
      text: '如何避免它只是另一个提示块？',
      sourceTurnId: 'turn-1:user',
    }]
    snapshot.commitments = [{
      text: '先做短期记忆 owner，再做长期记忆',
      sourceTurnId: 'turn-1:user',
    }]
    snapshot.userCorrections = [{
      text: '不要固定模板回复，要数字生命自身人格',
      sourceTurnId: 'turn-1:user',
      scope: 'persona',
    }]
    snapshot.executionState = {
      summary: 'execution_callback_status:failed execution_callback_goal:old template cleanup',
      source: 'execution-callback',
    }
    snapshot.audit.failureTurnIds = ['turn-failed:alice']
    snapshot.audit.excludedLongTermCandidateTurnIds = ['turn-failed:alice']
    snapshot.memoryQueryHints = ['WorkingMemory', '短期记忆']

    const context = buildWorkingMemoryOwnerContext(snapshot)
    const block = buildWorkingMemoryOwnerSystemBlock(context)

    expect(context.owner).toBe('working-memory')
    expect(context.authorityLine).toContain('authoritative short-term dialogue state')
    expect(context.current.threadTitle).toBe('B 线短期记忆 owner')
    expect(context.current.taskStatus).toBe('active')
    expect(context.obligations[0]).toContain('respect_correction(persona):不要固定模板回复')
    expect(context.obligations).toContain('answer_unresolved_question:如何避免它只是另一个提示块？')
    expect(context.obligations).toContain('honor_commitment:先做短期记忆 owner，再做长期记忆')
    expect(context.audit.failureTurnIds).toEqual(['turn-failed:alice'])
    expect(block).toContain('[ALICIZATION_WORKING_MEMORY_OWNER]')
    expect(block).toContain('owner=working-memory')
    expect(block).toContain('thread=B 线短期记忆 owner')
    expect(block).toContain('task=active:让 WorkingMemory 成为短期记忆链路 owner')
    expect(block).toContain('failure_audit_only=turn-failed:alice')

    const replyGovernance = buildWorkingMemoryOwnerReplyGovernance(context)
    expect(replyGovernance.mustDo).toEqual(expect.arrayContaining([
      'Respect WorkingMemory correction: 不要固定模板回复，要数字生命自身人格',
      'Answer WorkingMemory unresolved question before widening: 如何避免它只是另一个提示块？',
      'Honor WorkingMemory commitment: 先做短期记忆 owner，再做长期记忆',
      'Carry WorkingMemory active task: active:让 WorkingMemory 成为短期记忆链路 owner',
    ]))
    expect(replyGovernance.mustNotDo).toEqual(expect.arrayContaining([
      'Do not replace WorkingMemory owner state with generic project-status narration or fixed fallback wording.',
      'Do not treat WorkingMemory failure/audit-only turns as learned personality or long-term memory.',
    ]))
  })

  it('projects the owner context into runtime working-memory episodes without marking it as sediment', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-1',
      now: 1600,
    })
    snapshot.currentThread = {
      title: '继续 B 线',
      currentUserMove: '继续',
      currentAliceMove: null,
      primaryAnchor: 'WorkingMemory',
      mode: 'task',
      shouldHold: true,
      confidence: 0.76,
    }
    snapshot.activeTask = {
      summary: '把 WorkingMemory 接入 runtime surface',
      status: 'waiting-user',
      evidenceTurnIds: ['turn-2:user'],
    }
    snapshot.userCorrections = [{
      text: '别用固定模板',
      sourceTurnId: 'turn-1:user',
      scope: 'persona',
    }]
    snapshot.recentRawTurns = [{
      turnId: 'turn-2:user',
      role: 'user',
      text: '继续',
      createdAt: 1500,
      source: 'conversation-turn',
      visibility: 'user-visible',
      failureKind: null,
      importance: 1,
    }]

    const episodes = projectWorkingMemoryOwnerEpisodes(snapshot, [{
      scene: 'older visual context',
      summary: 'keep this existing visual episode',
      beganAt: 100,
      endedAt: 200,
      confidence: 0.5,
      emotionalTension: 'soft-covision',
      sedimentCandidate: false,
    }])

    expect(episodes).toHaveLength(2)
    expect(episodes.at(-1)).toEqual(expect.objectContaining({
      scene: 'working-memory-owner',
      beganAt: 1500,
      endedAt: 1600,
      emotionalTension: 'focused-flow',
      sedimentCandidate: false,
    }))
    expect(episodes.at(-1)?.summary).toContain('thread=继续 B 线')
    expect(episodes.at(-1)?.summary).toContain('task=waiting-user:把 WorkingMemory 接入 runtime surface')
    expect(episodes.at(-1)?.summary).toContain('correction=别用固定模板')
  })
})
