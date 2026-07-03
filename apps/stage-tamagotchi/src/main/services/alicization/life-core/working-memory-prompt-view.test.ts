import { describe, expect, it } from 'vitest'

import type { WorkingMemorySnapshot } from './working-memory'

import { createEmptyWorkingMemorySnapshot } from './working-memory'
import {
  buildWorkingMemoryPromptBlock,
  buildWorkingMemoryPromptView,
} from './working-memory-prompt-view'

function emptySnapshot(): WorkingMemorySnapshot {
  return createEmptyWorkingMemorySnapshot({
    cardId: 'card-1',
    sessionId: 'session-1',
    now: 1234,
  })
}

describe('working memory prompt view', () => {
  it('renders an empty snapshot as a compact stable block', () => {
    const view = buildWorkingMemoryPromptView(emptySnapshot())

    expect(view).toMatchObject({
      version: 'working-memory-prompt-view-v1',
      scope: {
        cardId: 'card-1',
        sessionId: 'session-1',
        turnRange: {
          fromTurnId: null,
          toTurnId: null,
        },
      },
      modules: {
        thread: {
          title: null,
        },
        task: {
          summary: null,
        },
        compression: {
          level: 'none',
          sourceTurnIds: [],
          lastCompressedAt: null,
        },
        audit: {
          failureTurnIds: [],
          excludedLongTermCandidateTurnIds: [],
          notes: [],
        },
      },
    })
    expect(view.rendering.blockLines).toEqual([
      '[ALICIZATION_WORKING_MEMORY]',
      'Compact short-term memory for the current local dialogue. Use as inward state, not visible wording.',
      'thread=none',
      'task=none',
      'compressed_timeline=none',
      'questions=none',
      'memory_query_hints=none',
      'commitments=none',
      'corrections=none',
      'relationship=none',
      'emotion=none',
      'execution=none',
      'compression=none',
      'audit=none',
    ])
    expect(buildWorkingMemoryPromptBlock(emptySnapshot())).toBe(view.rendering.blockLines.join('\n'))
  })

  it('renders current thread, task, questions, corrections, and compression info', () => {
    const view = buildWorkingMemoryPromptView({
      ...emptySnapshot(),
      turnRange: {
        fromTurnId: 'turn-1:user',
        toTurnId: 'turn-4:alice',
      },
      currentThread: {
        title: 'Task 5 working-memory prompt view',
        currentUserMove: 'implement the pure formatter',
        currentAliceMove: 'reading compact prompt patterns',
        primaryAnchor: 'working-memory-prompt-view.ts',
        mode: 'task',
        shouldHold: true,
        confidence: 0.84,
      },
      activeTask: {
        summary: 'Add prompt-facing working-memory block',
        status: 'active',
        evidenceTurnIds: ['turn-4:alice'],
      },
      compressedTimeline: [{
        id: 'wm-episodelet:session-1:1250',
        sourceTurnIds: ['turn-1:user', 'turn-2:alice'],
        summary: 'Earlier dialogue kept the fixed-template correction alive',
        thread: 'Task 5 working-memory prompt view',
        unresolvedQuestions: [],
        commitments: [],
        corrections: [],
        relationshipPosture: 'same-her local companion posture',
        emotionalPosture: 'focused and careful',
        executionCarry: null,
        importance: 0.78,
        createdAt: 1250,
      }],
      unresolvedQuestions: [
        { text: 'Should failures stay audit-only?', sourceTurnId: 'turn-2:user' },
        { text: 'Should failures stay audit-only?', sourceTurnId: 'turn-2:user' },
      ],
      memoryQueryHints: ['旧模板', '短期记忆'],
      commitments: [
        { text: 'Do not touch main-chat-session-runtime.ts', sourceTurnId: null },
      ],
      userCorrections: [
        { text: 'Do not invent a generic assistant opener', sourceTurnId: 'turn-3:user', scope: 'persona' },
      ],
      relationshipPosture: {
        summary: 'same-her local companion posture',
        source: 'conversation-state',
      },
      emotionalPosture: {
        summary: 'focused and careful',
        source: 'conscious-frame',
      },
      executionState: {
        summary: 'tests-first implementation in progress',
        source: 'execution-callback',
      },
      compression: {
        level: 'light',
        sourceTurnIds: ['turn-1:user', 'turn-2:alice'],
        lastCompressedAt: 1300,
      },
      audit: {
        failureTurnIds: ['turn-2:alice'],
        excludedLongTermCandidateTurnIds: ['turn-2:alice'],
        notes: ['timeout was excluded from long-term candidates'],
      },
      longTermCandidates: [
        {
          sourceTurnIds: ['turn-3:user'],
          kind: 'correction',
          summary: 'Do not invent a generic assistant opener',
          reason: 'User corrected persona expression.',
          salience: 0.82,
          sensitivity: 'personal',
          confidence: 0.78,
          allowTraining: false,
        },
      ],
    })

    expect(view.rendering.blockLines).toContain('range=turn-1:user..turn-4:alice')
    expect(view.rendering.blockLines).toContain('thread=Task 5 working-memory prompt view | mode=task | hold=yes | user=implement the pure formatter | alice=reading compact prompt patterns | anchor=working-memory-prompt-view.ts | confidence=0.84')
    expect(view.rendering.blockLines).toContain('task=active:Add prompt-facing working-memory block | evidence=turn-4:alice')
    expect(view.rendering.blockLines).toContain('compressed_timeline=Earlier dialogue kept the fixed-template correction alive | thread=Task 5 working-memory prompt view | sources=turn-1:user,turn-2:alice')
    expect(view.rendering.blockLines).toContain('questions=Should failures stay audit-only?')
    expect(view.rendering.blockLines).toContain('memory_query_hints=旧模板 ; 短期记忆')
    expect(view.rendering.blockLines).toContain('corrections=persona:Do not invent a generic assistant opener')
    expect(view.rendering.blockLines).toContain('compression=light | sources=turn-1:user,turn-2:alice | last=1300')
    expect(view.rendering.blockLines).toContain('audit=failures=turn-2:alice | excluded_long_term=turn-2:alice | notes=timeout was excluded from long-term candidates')
    expect(view.modules.longTermCandidates).toHaveLength(1)
    expect(view.rendering.blockLines.join('\n')).not.toContain('long_term_candidates=')
  })

  it('does not misrepresent fallback templates or failures as long-term candidates', () => {
    const block = buildWorkingMemoryPromptBlock({
      ...emptySnapshot(),
      recentRawTurns: [
        {
          turnId: 'fallback-1',
          role: 'alice',
          text: 'fallback template visible line',
          createdAt: 1200,
          source: 'conversation-turn',
          visibility: 'user-visible',
          failureKind: null,
          importance: 0.52,
        },
        {
          turnId: 'timeout-1',
          role: 'alice',
          text: 'Timed out.',
          createdAt: 1201,
          source: 'conversation-turn',
          visibility: 'user-visible',
          failureKind: 'timeout',
          importance: 0.05,
        },
      ],
      audit: {
        failureTurnIds: ['timeout-1'],
        excludedLongTermCandidateTurnIds: ['fallback-1', 'timeout-1'],
        notes: ['fallback template excluded', 'timeout excluded'],
      },
      longTermCandidates: [],
    })

    expect(block).toContain('audit=failures=timeout-1 | excluded_long_term=fallback-1,timeout-1 | notes=fallback template excluded ; timeout excluded')
    expect(block).not.toContain('long_term_candidates=')
    expect(block).not.toContain('candidate=fallback-1')
    expect(block).not.toContain('candidate=timeout-1')
  })

  it('dedupes repeated prompt lines and keeps output stable', () => {
    const snapshot: WorkingMemorySnapshot = {
      ...emptySnapshot(),
      unresolvedQuestions: [
        { text: 'Can we keep this local?', sourceTurnId: null },
        { text: 'Can we keep this local?', sourceTurnId: null },
      ],
      commitments: [
        { text: 'Run targeted tests', sourceTurnId: null },
        { text: 'Run targeted tests', sourceTurnId: null },
      ],
      userCorrections: [
        { text: 'Keep the block compact', sourceTurnId: null, scope: 'reply' },
        { text: 'Keep the block compact', sourceTurnId: null, scope: 'reply' },
      ],
      longTermCandidates: [
        {
          sourceTurnIds: ['turn-1'],
          kind: 'correction',
          summary: 'Keep the block compact',
          reason: 'User corrected prompt shape.',
          salience: 0.8,
          sensitivity: 'personal',
          confidence: 0.7,
          allowTraining: false,
        },
        {
          sourceTurnIds: ['turn-1'],
          kind: 'correction',
          summary: 'Keep the block compact',
          reason: 'User corrected prompt shape.',
          salience: 0.8,
          sensitivity: 'personal',
          confidence: 0.7,
          allowTraining: false,
        },
      ],
    }

    const first = buildWorkingMemoryPromptBlock(snapshot)
    const second = buildWorkingMemoryPromptBlock(snapshot)

    expect(first).toBe(second)
    expect(first.match(/Can we keep this local\?/g)).toHaveLength(1)
    expect(first.match(/Run targeted tests/g)).toHaveLength(1)
    expect(first.match(/reply:Keep the block compact/g)).toHaveLength(1)
    expect(first).not.toContain('long_term_candidates=')
  })
})
