import { describe, expect, it } from 'vitest'

import { createEmptyWorkingMemorySnapshot } from './working-memory'

import * as workingMemoryOwnerContextModule from './working-memory-owner-context'

describe('working memory owner context', () => {
  it('promotes snapshot state into a short-term owner context without fixed reply governance APIs', () => {
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
    snapshot.longTermCandidates = [{
      sourceTurnIds: ['turn-1:user'],
      kind: 'correction',
      summary: '不要固定模板回复，要数字生命自身人格',
      reason: 'User corrected Alicization persona expression during the current dialogue.',
      salience: 0.82,
      sensitivity: 'personal',
      confidence: 0.78,
      allowTraining: true,
    }]

    const context = workingMemoryOwnerContextModule.buildWorkingMemoryOwnerContext(snapshot)

    expect(context.owner).toBe('working-memory')
    expect(context).not.toHaveProperty('authorityLine')
    expect(context.current.threadTitle).toBe('B 线短期记忆 owner')
    expect(context.current.taskStatus).toBe('active')
    expect(context.obligations[0]).toContain('respect_correction(persona):不要固定模板回复')
    expect(context.obligations).toContain('answer_unresolved_question:如何避免它只是另一个提示块？')
    expect(context.obligations).toContain('honor_commitment:先做短期记忆 owner，再做长期记忆')
    expect(context.audit.failureTurnIds).toEqual(['turn-failed:alice'])
    expect(context.longTermQueue).toHaveLength(1)
    expect(context.longTermQueue[0]).toEqual(expect.objectContaining({
      allowTraining: false,
      kind: 'correction',
      source: 'working-memory-owner',
      status: 'pending-cleaning',
      summary: '不要固定模板回复，要数字生命自身人格',
    }))
    expect(workingMemoryOwnerContextModule).not.toHaveProperty('buildWorkingMemoryOwnerReplyGovernance')
    expect(workingMemoryOwnerContextModule).not.toHaveProperty('buildWorkingMemoryOwnerSystemBlock')
  })

  it('sanitizes fixed-template residue inside the owner context', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-template-owner',
      now: 1400,
    })
    snapshot.currentThread = {
      title: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      currentUserMove: '不要再用 Before speaking, remember this is still one continuous her 这种 same-her 固定模板。',
      currentAliceMove: null,
      primaryAnchor: null,
      mode: 'repair',
      shouldHold: true,
      confidence: 0.8,
    }
    snapshot.userCorrections = [{
      text: '不要再用 Before speaking, remember this is still one continuous her 这种 same-her 固定模板。',
      sourceTurnId: 'turn-template:user',
      scope: 'persona',
    }]
    snapshot.memoryQueryHints = [
      'Before speaking, remember this is still one continuous her.',
      '失败面透明',
    ]

    const context = workingMemoryOwnerContextModule.buildWorkingMemoryOwnerContext(snapshot)
    const serializedContext = JSON.stringify(context)

    expect(context.queryHints).toContain('失败面透明')
    expect(serializedContext).not.toMatch(/Before speaking|same-her|one continuous her|Same Phase 1 digital life|same living line/u)
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

    const episodes = workingMemoryOwnerContextModule.projectWorkingMemoryOwnerEpisodes(snapshot, [{
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
