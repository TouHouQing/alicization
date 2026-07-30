# Alicization Working Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production-safe WorkingMemory owner for Alicization so current dialogue context, user corrections, commitments, emotional posture, execution carry, and compression boundaries are explicit, testable, and available to the main chat runtime.

**Architecture:** Add a focused `life-core/working-memory*` module family under the desktop runtime. The first implementation runs in shadow-compatible mode: it creates snapshots from existing runtime signals, renders a bounded prompt view, and injects that view into the provider-facing message stack without replacing long-term memory or old contextual recall yet.

**Tech Stack:** TypeScript, Vitest, Electron main-process service modules, existing Alicization runtime snapshots, existing `@xsai/shared-chat` `Message` type, existing pnpm workspace commands.

---

## File Structure

- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory.ts`
  Owns WorkingMemory types, sanitizers, normalization helpers, and empty snapshot construction.
- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-policy.ts`
  Owns retention priority, failure contamination rules, and long-term candidate eligibility.
- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-builder.ts`
  Builds `WorkingMemorySnapshot` from existing runtime inputs: recent contextual turns, `conversationState`, `dialogueWorldThread`, `currentConsciousFrame`, execution carry, and current user text.
- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-compressor.ts`
  Moves older raw turns into short-lived episodelets while preserving source turn ids, corrections, commitments, and unresolved questions.
- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.ts`
  Provides a small in-memory session snapshot store for hot runtime reads. SQLite persistence is kept out of this first pass because `conversation_turns` already stores raw evidence.
- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.ts`
  Builds bounded prompt views and system blocks from snapshots; injects the block into provider-facing messages.
- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory.test.ts`
  Covers types, normalization, and empty snapshot behavior.
- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-policy.test.ts`
  Covers retention priority, failure exclusions, and template/fallback contamination boundaries.
- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-builder.test.ts`
  Covers snapshot creation from existing conversation signals.
- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-compressor.test.ts`
  Covers episodelet compression and preservation of corrections/commitments/questions.
- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.test.ts`
  Covers hot snapshot read/write/clear behavior.
- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.test.ts`
  Covers prompt view budget, injection placement, and exclusion of audit-only failure turns.
- Modify `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
  Imports the builder/prompt-view helpers and injects a WorkingMemory system block after provider-facing runtime messages are assembled.

---

### Task 1: WorkingMemory Types And Normalization

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  createEmptyWorkingMemorySnapshot,
  normalizeWorkingMemoryText,
  normalizeWorkingMemoryTurn,
} from './working-memory'

describe('working memory core types', () => {
  it('creates an empty v1 snapshot with stable owner fields', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-1',
      now: 1234,
    })

    expect(snapshot).toMatchObject({
      version: 'working-memory-v1',
      cardId: 'default',
      sessionId: 'session-1',
      updatedAt: 1234,
      turnRange: {
        fromTurnId: null,
        toTurnId: null,
      },
      currentThread: null,
      activeTask: null,
      relationshipPosture: null,
      emotionalPosture: null,
      executionState: null,
    })
    expect(snapshot.recentRawTurns).toEqual([])
    expect(snapshot.compressedTimeline).toEqual([])
    expect(snapshot.unresolvedQuestions).toEqual([])
    expect(snapshot.commitments).toEqual([])
    expect(snapshot.userCorrections).toEqual([])
    expect(snapshot.longTermCandidates).toEqual([])
    expect(snapshot.compression.level).toBe('none')
    expect(snapshot.audit.failureTurnIds).toEqual([])
  })

  it('normalizes text and clamps turn importance', () => {
    expect(normalizeWorkingMemoryText('  我们\\n\\n继续   B 线  ', 20)).toBe('我们 继续 B 线')

    const turn = normalizeWorkingMemoryTurn({
      turnId: 'turn-1',
      role: 'user',
      text: '  不是这个，继续短期记忆方案  ',
      createdAt: 2000,
      source: 'conversation-turn',
      visibility: 'user-visible',
      importance: 5,
    })

    expect(turn).toMatchObject({
      turnId: 'turn-1',
      role: 'user',
      text: '不是这个，继续短期记忆方案',
      createdAt: 2000,
      source: 'conversation-turn',
      visibility: 'user-visible',
      importance: 1,
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory.test.ts
```

Expected: FAIL because `./working-memory` does not exist.

- [ ] **Step 3: Implement the minimal core module**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory.ts`:

```ts
export type AlicizationWorkingMemoryVersion = 'working-memory-v1'

export type WorkingMemoryTurnRole = 'user' | 'alice' | 'tool' | 'system'
export type WorkingMemoryTurnSource = 'conversation-turn' | 'tool-result' | 'runtime-event'
export type WorkingMemoryTurnVisibility = 'user-visible' | 'internal'
export type WorkingMemoryFailureKind = 'timeout' | 'provider-error' | 'tool-error' | 'abort'

export interface WorkingMemoryTurn {
  turnId: string
  role: WorkingMemoryTurnRole
  text: string
  createdAt: number
  source: WorkingMemoryTurnSource
  visibility: WorkingMemoryTurnVisibility
  failureKind: WorkingMemoryFailureKind | null
  importance: number
}

export interface WorkingMemoryEpisodelet {
  id: string
  sourceTurnIds: string[]
  summary: string
  thread: string | null
  unresolvedQuestions: string[]
  commitments: string[]
  corrections: string[]
  relationshipPosture: string | null
  emotionalPosture: string | null
  executionCarry: string | null
  importance: number
  createdAt: number
}

export interface WorkingMemoryThread {
  title: string
  currentUserMove: string
  currentAliceMove: string | null
  primaryAnchor: string | null
  mode: 'casual' | 'task' | 'repair' | 'execution' | 'reflection' | 'recollection'
  shouldHold: boolean
  confidence: number
}

export interface WorkingMemoryTask {
  summary: string
  status: 'active' | 'waiting-user' | 'waiting-tool' | 'blocked' | 'settled'
  evidenceTurnIds: string[]
}

export interface WorkingMemoryQuestion {
  text: string
  sourceTurnId: string | null
}

export interface WorkingMemoryCommitment {
  text: string
  sourceTurnId: string | null
}

export interface WorkingMemoryCorrection {
  text: string
  sourceTurnId: string | null
  scope: 'reply' | 'memory' | 'persona' | 'task' | 'unknown'
}

export interface WorkingMemoryRelationshipPosture {
  summary: string
  source: 'conversation-state' | 'conscious-frame' | 'runtime'
}

export interface WorkingMemoryEmotionalPosture {
  summary: string
  source: 'conscious-frame' | 'runtime'
}

export interface WorkingMemoryExecutionState {
  summary: string
  source: 'execution-callback' | 'execution-ledger' | 'tool-result'
}

export interface WorkingMemoryLongTermCandidate {
  sourceTurnIds: string[]
  kind: 'episode' | 'preference' | 'relationship' | 'procedure' | 'correction'
  summary: string
  reason: string
  salience: number
  sensitivity: 'public' | 'personal' | 'private' | 'secret'
  confidence: number
  allowTraining: boolean
}

export interface WorkingMemoryCompressionState {
  level: 'none' | 'light' | 'heavy'
  sourceTurnIds: string[]
  lastCompressedAt: number | null
}

export interface WorkingMemoryAuditState {
  failureTurnIds: string[]
  excludedLongTermCandidateTurnIds: string[]
  notes: string[]
}

export interface WorkingMemorySnapshot {
  version: AlicizationWorkingMemoryVersion
  cardId: string
  sessionId: string
  updatedAt: number
  turnRange: {
    fromTurnId: string | null
    toTurnId: string | null
  }
  recentRawTurns: WorkingMemoryTurn[]
  compressedTimeline: WorkingMemoryEpisodelet[]
  currentThread: WorkingMemoryThread | null
  activeTask: WorkingMemoryTask | null
  unresolvedQuestions: WorkingMemoryQuestion[]
  commitments: WorkingMemoryCommitment[]
  userCorrections: WorkingMemoryCorrection[]
  relationshipPosture: WorkingMemoryRelationshipPosture | null
  emotionalPosture: WorkingMemoryEmotionalPosture | null
  executionState: WorkingMemoryExecutionState | null
  memoryQueryHints: string[]
  longTermCandidates: WorkingMemoryLongTermCandidate[]
  compression: WorkingMemoryCompressionState
  audit: WorkingMemoryAuditState
}

export function normalizeWorkingMemoryText(raw: unknown, maxChars = 500) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars))
}

export function clampWorkingMemoryScore(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric))
    return 0
  return Math.max(0, Math.min(1, Number(numeric.toFixed(2))))
}

export function normalizeWorkingMemoryTurn(input: Omit<WorkingMemoryTurn, 'failureKind'> & {
  failureKind?: WorkingMemoryFailureKind | null
}): WorkingMemoryTurn {
  return {
    turnId: normalizeWorkingMemoryText(input.turnId, 120),
    role: input.role,
    text: normalizeWorkingMemoryText(input.text, 1600),
    createdAt: Number.isFinite(input.createdAt) ? Number(input.createdAt) : 0,
    source: input.source,
    visibility: input.visibility,
    failureKind: input.failureKind ?? null,
    importance: clampWorkingMemoryScore(input.importance),
  }
}

export function uniqueWorkingMemoryTexts(values: Array<string | null | undefined>, maxItems = 8, maxChars = 220) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeWorkingMemoryText(value, maxChars)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

export function createEmptyWorkingMemorySnapshot(input: {
  cardId: string
  sessionId: string
  now: number
}): WorkingMemorySnapshot {
  const now = Number.isFinite(input.now) ? Number(input.now) : Date.now()
  return {
    version: 'working-memory-v1',
    cardId: normalizeWorkingMemoryText(input.cardId, 120) || 'default',
    sessionId: normalizeWorkingMemoryText(input.sessionId, 160) || 'detached',
    updatedAt: now,
    turnRange: {
      fromTurnId: null,
      toTurnId: null,
    },
    recentRawTurns: [],
    compressedTimeline: [],
    currentThread: null,
    activeTask: null,
    unresolvedQuestions: [],
    commitments: [],
    userCorrections: [],
    relationshipPosture: null,
    emotionalPosture: null,
    executionState: null,
    memoryQueryHints: [],
    longTermCandidates: [],
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
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory.test.ts
git commit -m "feat(alicization): add working memory core types"
```

---

### Task 2: WorkingMemory Retention And Contamination Policy

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-policy.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-policy.test.ts`

- [ ] **Step 1: Write the failing policy tests**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-policy.test.ts`:

```ts
import type { WorkingMemoryTurn } from './working-memory'

import { describe, expect, it } from 'vitest'

import {
  createLongTermCandidatesFromWorkingTurns,
  rankWorkingMemoryRetention,
  shouldExcludeTurnFromLongTermCandidate,
} from './working-memory-policy'

function turn(input: Partial<WorkingMemoryTurn> & Pick<WorkingMemoryTurn, 'turnId' | 'role' | 'text'>): WorkingMemoryTurn {
  return {
    createdAt: 1000,
    failureKind: null,
    importance: 0.3,
    source: 'conversation-turn',
    visibility: 'user-visible',
    ...input,
  }
}

describe('working memory policy', () => {
  it('keeps corrections and commitments above ordinary chat', () => {
    const ranked = rankWorkingMemoryRetention([
      turn({ turnId: 'chat', role: 'user', text: '今天还可以' }),
      turn({ turnId: 'correction', role: 'user', text: '不是这个，我不想要固定模板回复' }),
      turn({ turnId: 'commitment', role: 'alice', text: '我会先把 A 线清空，然后再开始 B 线' }),
    ])

    expect(ranked.map(item => item.turnId).slice(0, 2)).toEqual(['correction', 'commitment'])
  })

  it('excludes timeout and provider failures from long-term candidates', () => {
    const failure = turn({
      turnId: 'timeout-1',
      role: 'alice',
      text: '超时了。',
      failureKind: 'timeout',
    })

    expect(shouldExcludeTurnFromLongTermCandidate(failure)).toBe(true)
    expect(createLongTermCandidatesFromWorkingTurns([failure])).toEqual([])
  })

  it('creates correction candidates without allowing training from fallback-like turns', () => {
    const candidates = createLongTermCandidatesFromWorkingTurns([
      turn({
        turnId: 'turn-correction',
        role: 'user',
        text: '我不是要固定回复，我需要她数字生命自身的人格回复',
      }),
      turn({
        turnId: 'turn-fallback',
        role: 'alice',
        text: '我在。结构化连续性状态的线还在。',
      }),
    ])

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      kind: 'correction',
      allowTraining: false,
      sourceTurnIds: ['turn-correction'],
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-policy.test.ts
```

Expected: FAIL because `./working-memory-policy` does not exist.

- [ ] **Step 3: Implement the policy module**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-policy.ts`:

```ts
import type {
  WorkingMemoryLongTermCandidate,
  WorkingMemoryTurn,
} from './working-memory'

import {
  clampWorkingMemoryScore,
  normalizeWorkingMemoryText,
} from './working-memory'

const correctionPattern = /不是这个|不想要|不要固定|固定模板|我需要|你搞错|你错了|别这样|不要这样/u
const commitmentPattern = /我会|我先|我已经|接下来|继续|开始|完成|修复|提交|commit|push|编译/u
const fallbackTemplatePattern = /我在。结构化连续性状态的线还在|结构化连续性状态的线还在|中性可见占位|中性可见占位/u

export function shouldExcludeTurnFromLongTermCandidate(turn: WorkingMemoryTurn) {
  if (turn.failureKind)
    return true
  if (fallbackTemplatePattern.test(turn.text))
    return true
  if (turn.role === 'tool' || turn.visibility === 'internal')
    return true
  return false
}

export function scoreWorkingMemoryRetention(turn: WorkingMemoryTurn) {
  if (turn.failureKind)
    return 0.05
  if (turn.role === 'user' && correctionPattern.test(turn.text))
    return 0.98
  if (commitmentPattern.test(turn.text))
    return 0.86
  if (turn.role === 'user')
    return 0.72
  if (turn.role === 'alice')
    return 0.58
  if (turn.role === 'tool')
    return 0.3
  return clampWorkingMemoryScore(turn.importance)
}

export function rankWorkingMemoryRetention(turns: WorkingMemoryTurn[]) {
  return turns
    .map(turn => ({
      ...turn,
      importance: Math.max(turn.importance, scoreWorkingMemoryRetention(turn)),
    }))
    .sort((left, right) => right.importance - left.importance || right.createdAt - left.createdAt)
}

export function createLongTermCandidatesFromWorkingTurns(turns: WorkingMemoryTurn[]): WorkingMemoryLongTermCandidate[] {
  const candidates: WorkingMemoryLongTermCandidate[] = []
  for (const turn of turns) {
    if (shouldExcludeTurnFromLongTermCandidate(turn))
      continue
    if (turn.role === 'user' && correctionPattern.test(turn.text)) {
      candidates.push({
        sourceTurnIds: [turn.turnId],
        kind: 'correction',
        summary: normalizeWorkingMemoryText(turn.text, 260),
        reason: 'User corrected Alicization behavior, memory use, or persona expression during the current dialogue.',
        salience: 0.82,
        sensitivity: 'personal',
        confidence: 0.78,
        allowTraining: false,
      })
    }
  }
  return candidates
}
```

- [ ] **Step 4: Run policy tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-policy.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-policy.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-policy.test.ts
git commit -m "feat(alicization): guard working memory retention policy"
```

---

### Task 3: Build Snapshots From Existing Runtime Signals

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-builder.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-builder.test.ts`

- [ ] **Step 1: Write builder tests**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-builder.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { buildWorkingMemorySnapshot } from './working-memory-builder'

describe('working memory snapshot builder', () => {
  it('builds current thread, questions, commitments, corrections, and query hints from runtime signals', () => {
    const snapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-b',
      now: 10_000,
      currentUserText: '继续，我不是要固定回复',
      recentTurns: [
        {
          turnId: 'turn-1',
          userText: '你是谁',
          assistantText: '我是 Alicization',
          createdAt: 9000,
        },
      ],
      conversationState: {
        jointThread: 'B 线短期记忆工程',
        hostMove: '继续，我不是要固定回复',
        primaryTurnAnchor: '继续',
        primaryTurnAnchorSource: 'user-text',
        activeProject: 'WorkingMemory owner',
        unansweredQuestion: '怎么让短期记忆不断片',
        owedRepair: null,
        activeCommitments: ['先做短期记忆 owner，再接长期记忆'],
        relationFrame: 'repair',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: ['短期记忆', '固定模板'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: ['memory:task-thread'],
        updatedAt: 10_000,
      },
      dialogueWorldThread: {
        activeThread: 'B 线短期记忆工程',
        currentQuestion: '怎么让短期记忆不断片',
        openLoops: ['保留用户纠正'],
        recentlyResolvedLoops: [],
        carriedFacts: ['记忆证据不能被旧对话规则覆盖'],
        relationDrift: 'repairing',
        memoryMode: 'task-thread',
        recallKeys: ['短期记忆', '记忆连续性'],
        lastUserMove: '继续，我要的是记忆连续性',
        lastAssistantMove: null,
        lastOutcome: 'pending',
        confidence: 0.8,
        narrative: [],
        updatedAt: 10_000,
      },
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'guide',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Hold the current B-line working memory task.',
        consciousTension: 'Keep current memory evidence authoritative.',
        speakingIntention: 'Answer from the current implementation thread.',
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.8,
        reasonTags: ['subject:task-knot'],
        updatedAt: 10_000,
      },
    })

    expect(snapshot.currentThread).toMatchObject({
      title: 'B 线短期记忆工程',
      currentUserMove: '继续，我要的是记忆连续性',
      mode: 'repair',
      shouldHold: true,
    })
    expect(snapshot.activeTask?.summary).toBe('WorkingMemory owner')
    expect(snapshot.unresolvedQuestions.map(item => item.text)).toContain('怎么让短期记忆不断片')
    expect(snapshot.commitments.map(item => item.text)).toContain('先做短期记忆 owner，再接长期记忆')
    expect(snapshot.userCorrections.map(item => item.text)).toContain('继续，我要的是记忆连续性')
    expect(snapshot.relationshipPosture?.summary).toContain('repair')
    expect(snapshot.emotionalPosture?.summary).toContain('Keep current memory evidence authoritative.')
    expect(snapshot.memoryQueryHints).toEqual(['短期记忆', '记忆连续性'])
    expect(snapshot.recentRawTurns.at(-1)?.text).toBe('继续，我要的是记忆连续性')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-builder.test.ts
```

Expected: FAIL because `./working-memory-builder` does not exist.

- [ ] **Step 3: Implement snapshot builder**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-builder.ts`:

```ts
import type {
  AlicizationConversationStateSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDialogueWorldThreadSnapshot,
} from '../../../../shared/eventa'
import type {
  WorkingMemoryFailureKind,
  WorkingMemoryQuestion,
  WorkingMemorySnapshot,
  WorkingMemoryTurn,
} from './working-memory'

import {
  createEmptyWorkingMemorySnapshot,
  normalizeWorkingMemoryText,
  normalizeWorkingMemoryTurn,
  uniqueWorkingMemoryTexts,
} from './working-memory'
import { createLongTermCandidatesFromWorkingTurns } from './working-memory-policy'

export interface WorkingMemoryRecentTurnInput {
  turnId?: string | null
  userText?: string | null
  assistantText?: string | null
  createdAt?: number | null
}

export interface BuildWorkingMemorySnapshotInput {
  cardId: string
  sessionId: string
  now: number
  currentUserText: string
  recentTurns?: WorkingMemoryRecentTurnInput[]
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  executionCarry?: string | null
}

function detectCorrectionScope(text: string) {
  if (/人格|固定回复|固定模板|数字生命|persona|same-her/iu.test(text))
    return 'persona' as const
  if (/记忆|回想|长期|短期/u.test(text))
    return 'memory' as const
  if (/任务|执行|工具|commit|push|编译/iu.test(text))
    return 'task' as const
  if (/不是这个|你错了|别这样|不要这样/u.test(text))
    return 'reply' as const
  return 'unknown' as const
}

function looksLikeCorrection(text: string) {
  return /不是这个|不想要|不要固定|固定模板|我需要|你搞错|你错了|别这样|不要这样/u.test(text)
}

function detectFailureKindFromVisibleText(text: string): WorkingMemoryFailureKind | null {
  if (/^超时了[。.]?$/u.test(text))
    return 'timeout'
  if (/provider|供应方|模型服务|模型调用/u.test(text) && /失败|错误|error|failed/iu.test(text))
    return 'provider-error'
  if (/工具|tool/u.test(text) && /失败|错误|error|failed/iu.test(text))
    return 'tool-error'
  return null
}

function mapRecentTurns(input: BuildWorkingMemorySnapshotInput): WorkingMemoryTurn[] {
  const turns: WorkingMemoryTurn[] = []
  for (const [index, turn] of (input.recentTurns ?? []).entries()) {
    const createdAt = Number.isFinite(turn.createdAt) ? Number(turn.createdAt) : input.now - (index + 2)
    const turnId = normalizeWorkingMemoryText(turn.turnId, 120) || `recent-${index + 1}`
    const userText = normalizeWorkingMemoryText(turn.userText, 900)
    const assistantText = normalizeWorkingMemoryText(turn.assistantText, 900)
    if (userText) {
      turns.push(normalizeWorkingMemoryTurn({
        turnId: `${turnId}:user`,
        role: 'user',
        text: userText,
        createdAt,
        source: 'conversation-turn',
        visibility: 'user-visible',
        importance: 0.66,
      }))
    }
    if (assistantText) {
      turns.push(normalizeWorkingMemoryTurn({
        turnId: `${turnId}:alice`,
        role: 'alice',
        text: assistantText,
        createdAt: createdAt + 1,
        source: 'conversation-turn',
        visibility: 'user-visible',
        failureKind: detectFailureKindFromVisibleText(assistantText),
        importance: 0.52,
      }))
    }
  }

  const currentText = normalizeWorkingMemoryText(input.currentUserText, 1200)
  if (currentText) {
    turns.push(normalizeWorkingMemoryTurn({
      turnId: 'current-user',
      role: 'user',
      text: currentText,
      createdAt: input.now,
      source: 'conversation-turn',
      visibility: 'user-visible',
      importance: 1,
    }))
  }
  return turns
}

function buildQuestions(input: BuildWorkingMemorySnapshotInput): WorkingMemoryQuestion[] {
  return uniqueWorkingMemoryTexts([
    input.conversationState?.unansweredQuestion,
    input.dialogueWorldThread?.currentQuestion,
  ], 6, 220).map(text => ({
    text,
    sourceTurnId: null,
  }))
}

export function buildWorkingMemorySnapshot(input: BuildWorkingMemorySnapshotInput): WorkingMemorySnapshot {
  const snapshot = createEmptyWorkingMemorySnapshot({
    cardId: input.cardId,
    sessionId: input.sessionId,
    now: input.now,
  })
  const recentRawTurns = mapRecentTurns(input)
  const firstTurn = recentRawTurns[0] ?? null
  const lastTurn = recentRawTurns.at(-1) ?? null
  const threadTitle = normalizeWorkingMemoryText(
    input.dialogueWorldThread?.activeThread
    || input.conversationState?.jointThread
    || input.conversationState?.primaryTurnAnchor
    || input.currentUserText,
    220,
  )
  const currentUserMove = normalizeWorkingMemoryText(
    input.conversationState?.hostMove
    || input.dialogueWorldThread?.lastUserMove
    || input.currentUserText,
    220,
  )
  const relationFrame = input.conversationState?.relationFrame ?? null
  const currentThreadMode = relationFrame === 'repair'
    ? 'repair'
    : input.conversationState?.memoryMode === 'task-thread'
      ? 'task'
      : input.conversationState?.memoryMode === 'scene-anchored'
        ? 'execution'
        : 'casual'

  return {
    ...snapshot,
    turnRange: {
      fromTurnId: firstTurn?.turnId ?? null,
      toTurnId: lastTurn?.turnId ?? null,
    },
    recentRawTurns,
    currentThread: threadTitle
      ? {
          title: threadTitle,
          currentUserMove,
          currentAliceMove: normalizeWorkingMemoryText(input.dialogueWorldThread?.lastAssistantMove, 220) || null,
          primaryAnchor: normalizeWorkingMemoryText(input.conversationState?.primaryTurnAnchor ?? input.dialogueWorldThread?.primaryTurnAnchor, 180) || null,
          mode: currentThreadMode,
          shouldHold: input.conversationState?.shouldHoldThread ?? input.dialogueWorldThread?.lastOutcome === 'pending',
          confidence: Math.max(input.conversationState?.confidence ?? 0, input.dialogueWorldThread?.confidence ?? 0),
        }
      : null,
    activeTask: input.conversationState?.activeProject
      ? {
          summary: normalizeWorkingMemoryText(input.conversationState.activeProject, 220),
          status: input.dialogueWorldThread?.lastOutcome === 'pending' ? 'active' : 'waiting-user',
          evidenceTurnIds: lastTurn ? [lastTurn.turnId] : [],
        }
      : null,
    unresolvedQuestions: buildQuestions(input),
    commitments: uniqueWorkingMemoryTexts([
      ...(input.conversationState?.activeCommitments ?? []),
      ...(input.dialogueWorldThread?.openLoops ?? []),
    ], 8, 220).map(text => ({
      text,
      sourceTurnId: null,
    })),
    userCorrections: recentRawTurns
      .filter(turn => turn.role === 'user' && looksLikeCorrection(turn.text))
      .map(turn => ({
        text: turn.text,
        sourceTurnId: turn.turnId,
        scope: detectCorrectionScope(turn.text),
      })),
    relationshipPosture: relationFrame
      ? {
          summary: `relation=${relationFrame}`,
          source: 'conversation-state',
        }
      : null,
    emotionalPosture: input.currentConsciousFrame?.consciousTension
      ? {
          summary: normalizeWorkingMemoryText(input.currentConsciousFrame.consciousTension, 260),
          source: 'conscious-frame',
        }
      : null,
    executionState: input.executionCarry
      ? {
          summary: normalizeWorkingMemoryText(input.executionCarry, 260),
          source: 'execution-callback',
        }
      : null,
    memoryQueryHints: uniqueWorkingMemoryTexts([
      ...(input.conversationState?.memoryQueryHints ?? []),
      ...(input.dialogueWorldThread?.recallKeys ?? []),
    ], 8, 120),
    longTermCandidates: createLongTermCandidatesFromWorkingTurns(recentRawTurns),
  }
}
```

- [ ] **Step 4: Run builder tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-builder.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-builder.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-builder.test.ts
git commit -m "feat(alicization): build working memory snapshots"
```

---

### Task 4: Compression And Hot Snapshot Store

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-compressor.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-compressor.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.test.ts`

- [ ] **Step 1: Write compression and store tests**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-compressor.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { createEmptyWorkingMemorySnapshot, normalizeWorkingMemoryTurn } from './working-memory'
import { compressWorkingMemorySnapshot } from './working-memory-compressor'

describe('working memory compressor', () => {
  it('compresses older raw turns into episodelets while preserving correction and commitment slots', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-1',
      now: 5000,
    })
    snapshot.recentRawTurns = Array.from({ length: 8 }, (_, index) => normalizeWorkingMemoryTurn({
      turnId: `turn-${index + 1}`,
      role: index % 2 === 0 ? 'user' : 'alice',
      text: index === 1 ? '我会保留你的纠正' : `普通对话 ${index + 1}`,
      createdAt: 1000 + index,
      source: 'conversation-turn',
      visibility: 'user-visible',
      importance: 0.4,
    }))
    snapshot.userCorrections = [{
      text: '不是这个，我不要固定模板',
      sourceTurnId: 'turn-3',
      scope: 'persona',
    }]
    snapshot.commitments = [{
      text: '保留用户纠正',
      sourceTurnId: 'turn-2',
    }]
    snapshot.unresolvedQuestions = [{
      text: '短期记忆怎么不断片',
      sourceTurnId: 'turn-1',
    }]

    const compressed = compressWorkingMemorySnapshot(snapshot, {
      maxRawTurns: 4,
      now: 6000,
    })

    expect(compressed.recentRawTurns.map(turn => turn.turnId)).toEqual(['turn-5', 'turn-6', 'turn-7', 'turn-8'])
    expect(compressed.compressedTimeline).toHaveLength(1)
    expect(compressed.compressedTimeline[0].sourceTurnIds).toEqual(['turn-1', 'turn-2', 'turn-3', 'turn-4'])
    expect(compressed.compressedTimeline[0].corrections).toContain('不是这个，我不要固定模板')
    expect(compressed.compressedTimeline[0].commitments).toContain('保留用户纠正')
    expect(compressed.compression.level).toBe('light')
  })
})
```

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { createEmptyWorkingMemorySnapshot } from './working-memory'
import { createWorkingMemoryStore } from './working-memory-store'

describe('working memory store', () => {
  it('stores snapshots by card and session without sharing mutable references', () => {
    const store = createWorkingMemoryStore()
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-1',
      now: 1000,
    })
    snapshot.memoryQueryHints.push('短期记忆')

    store.upsert(snapshot)
    snapshot.memoryQueryHints.push('外部修改')

    expect(store.get('default', 'session-1')?.memoryQueryHints).toEqual(['短期记忆'])
    store.clear('default', 'session-1')
    expect(store.get('default', 'session-1')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-compressor.test.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.test.ts
```

Expected: FAIL because compressor and store modules do not exist.

- [ ] **Step 3: Implement compressor**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-compressor.ts`:

```ts
import type { WorkingMemoryEpisodelet, WorkingMemorySnapshot } from './working-memory'

import { normalizeWorkingMemoryText, uniqueWorkingMemoryTexts } from './working-memory'

export interface CompressWorkingMemoryOptions {
  maxRawTurns?: number
  now: number
}

function summarizeTurns(turns: WorkingMemorySnapshot['recentRawTurns']) {
  return turns
    .map(turn => `${turn.role}:${normalizeWorkingMemoryText(turn.text, 120)}`)
    .filter(Boolean)
    .join(' | ')
    .slice(0, 700)
}

export function compressWorkingMemorySnapshot(
  snapshot: WorkingMemorySnapshot,
  options: CompressWorkingMemoryOptions,
): WorkingMemorySnapshot {
  const maxRawTurns = Math.max(2, Math.floor(options.maxRawTurns ?? 8))
  if (snapshot.recentRawTurns.length <= maxRawTurns)
    return snapshot

  const splitIndex = snapshot.recentRawTurns.length - maxRawTurns
  const olderTurns = snapshot.recentRawTurns.slice(0, splitIndex)
  const retainedTurns = snapshot.recentRawTurns.slice(splitIndex)
  const sourceTurnIds = olderTurns.map(turn => turn.turnId).filter(Boolean)
  const olderIdSet = new Set(sourceTurnIds)
  const episodelet: WorkingMemoryEpisodelet = {
    id: `wm-episodelet:${snapshot.sessionId}:${options.now}`,
    sourceTurnIds,
    summary: summarizeTurns(olderTurns),
    thread: snapshot.currentThread?.title ?? null,
    unresolvedQuestions: snapshot.unresolvedQuestions
      .filter(item => !item.sourceTurnId || olderIdSet.has(item.sourceTurnId))
      .map(item => item.text),
    commitments: snapshot.commitments
      .filter(item => !item.sourceTurnId || olderIdSet.has(item.sourceTurnId))
      .map(item => item.text),
    corrections: snapshot.userCorrections
      .filter(item => !item.sourceTurnId || olderIdSet.has(item.sourceTurnId))
      .map(item => item.text),
    relationshipPosture: snapshot.relationshipPosture?.summary ?? null,
    emotionalPosture: snapshot.emotionalPosture?.summary ?? null,
    executionCarry: snapshot.executionState?.summary ?? null,
    importance: Math.max(0.4, ...olderTurns.map(turn => turn.importance)),
    createdAt: options.now,
  }

  return {
    ...snapshot,
    recentRawTurns: retainedTurns,
    compressedTimeline: [...snapshot.compressedTimeline, episodelet],
    compression: {
      level: retainedTurns.length <= 2 ? 'heavy' : 'light',
      sourceTurnIds: uniqueWorkingMemoryTexts([
        ...snapshot.compression.sourceTurnIds,
        ...sourceTurnIds,
      ], 200, 160),
      lastCompressedAt: options.now,
    },
    updatedAt: options.now,
  }
}
```

- [ ] **Step 4: Implement hot store**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.ts`:

```ts
import type { WorkingMemorySnapshot } from './working-memory'

function key(cardId: string, sessionId: string) {
  return `${cardId}::${sessionId}`
}

function cloneSnapshot(snapshot: WorkingMemorySnapshot): WorkingMemorySnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as WorkingMemorySnapshot
}

export interface WorkingMemoryStore {
  get: (cardId: string, sessionId: string) => WorkingMemorySnapshot | null
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
```

- [ ] **Step 5: Run compression and store tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-compressor.test.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-compressor.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-compressor.test.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.test.ts
git commit -m "feat(alicization): add working memory compression store"
```

---

### Task 5: Prompt View And System Block Injection

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.test.ts`

- [ ] **Step 1: Write prompt view tests**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.test.ts`:

```ts
import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import { createEmptyWorkingMemorySnapshot, normalizeWorkingMemoryTurn } from './working-memory'
import {
  buildWorkingMemoryPromptView,
  buildWorkingMemorySystemBlock,
  injectWorkingMemorySystemBlock,
} from './working-memory-prompt-view'

describe('working memory prompt view', () => {
  it('renders bounded current-conscious working memory without audit-only failure text', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-1',
      now: 1000,
    })
    snapshot.currentThread = {
      title: 'B 线短期记忆工程',
      currentUserMove: '继续',
      currentAliceMove: null,
      primaryAnchor: '继续',
      mode: 'task',
      shouldHold: true,
      confidence: 0.8,
    }
    snapshot.recentRawTurns = [
      normalizeWorkingMemoryTurn({
        turnId: 'turn-user',
        role: 'user',
        text: '继续',
        createdAt: 900,
        source: 'conversation-turn',
        visibility: 'user-visible',
        importance: 1,
      }),
      normalizeWorkingMemoryTurn({
        turnId: 'turn-timeout',
        role: 'alice',
        text: '超时了。',
        createdAt: 901,
        source: 'runtime-event',
        visibility: 'user-visible',
        failureKind: 'timeout',
        importance: 0.05,
      }),
    ]
    snapshot.userCorrections = [{
      text: '不要固定模板',
      sourceTurnId: 'turn-user',
      scope: 'persona',
    }]
    snapshot.commitments = [{
      text: '先完成 WorkingMemory owner',
      sourceTurnId: 'turn-user',
    }]

    const view = buildWorkingMemoryPromptView(snapshot, { maxRecentDialogueTurns: 4 })
    const block = buildWorkingMemorySystemBlock(view)

    expect(block).toContain('[ALICIZATION_WORKING_MEMORY]')
    expect(block).toContain('Current thread: B 线短期记忆工程')
    expect(block).toContain('User corrections: 不要固定模板')
    expect(block).toContain('Commitments: 先完成 WorkingMemory owner')
    expect(block).not.toContain('超时了。')
  })

  it('injects the block before provider-facing dialogue messages', () => {
    const messages: Message[] = [
      { role: 'system', content: 'SOUL' },
      { role: 'user', content: '继续' },
    ]

    const next = injectWorkingMemorySystemBlock(messages, '[ALICIZATION_WORKING_MEMORY]\\nCurrent thread: B 线')

    expect(next[0]).toEqual({
      role: 'system',
      content: '[ALICIZATION_WORKING_MEMORY]\\nCurrent thread: B 线',
    })
    expect(next[1]).toEqual(messages[0])
    expect(next[2]).toEqual(messages[1])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.test.ts
```

Expected: FAIL because prompt view module does not exist.

- [ ] **Step 3: Implement prompt view module**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.ts`:

```ts
import type { Message } from '@xsai/shared-chat'

import type { WorkingMemorySnapshot } from './working-memory'

import { normalizeWorkingMemoryText, uniqueWorkingMemoryTexts } from './working-memory'

export interface WorkingMemoryPromptView {
  recentRawDialogue: Array<{ role: 'user' | 'alice', text: string }>
  currentThread: string | null
  activeTask: string | null
  unresolvedQuestions: string[]
  commitments: string[]
  userCorrections: string[]
  relationshipPosture: string | null
  emotionalPosture: string | null
  executionCarry: string | null
  memoryQueryHints: string[]
  compressionNotice: string | null
}

export interface BuildWorkingMemoryPromptViewOptions {
  maxRecentDialogueTurns?: number
}

export function buildWorkingMemoryPromptView(
  snapshot: WorkingMemorySnapshot,
  options: BuildWorkingMemoryPromptViewOptions = {},
): WorkingMemoryPromptView {
  const maxRecentDialogueTurns = Math.max(1, Math.floor(options.maxRecentDialogueTurns ?? 8))
  const recentRawDialogue = snapshot.recentRawTurns
    .filter(turn => !turn.failureKind)
    .filter(turn => turn.role === 'user' || turn.role === 'alice')
    .slice(-maxRecentDialogueTurns)
    .map(turn => ({
      role: turn.role as 'user' | 'alice',
      text: normalizeWorkingMemoryText(turn.text, 420),
    }))
    .filter(turn => turn.text)

  return {
    recentRawDialogue,
    currentThread: snapshot.currentThread?.title ?? null,
    activeTask: snapshot.activeTask?.summary ?? null,
    unresolvedQuestions: uniqueWorkingMemoryTexts(snapshot.unresolvedQuestions.map(item => item.text), 6, 180),
    commitments: uniqueWorkingMemoryTexts(snapshot.commitments.map(item => item.text), 6, 180),
    userCorrections: uniqueWorkingMemoryTexts(snapshot.userCorrections.map(item => item.text), 6, 180),
    relationshipPosture: snapshot.relationshipPosture?.summary ?? null,
    emotionalPosture: snapshot.emotionalPosture?.summary ?? null,
    executionCarry: snapshot.executionState?.summary ?? null,
    memoryQueryHints: uniqueWorkingMemoryTexts(snapshot.memoryQueryHints, 8, 120),
    compressionNotice: snapshot.compression.level === 'none'
      ? null
      : `compression=${snapshot.compression.level}; source_turns=${snapshot.compression.sourceTurnIds.length}`,
  }
}

function joinOrNone(values: string[]) {
  return values.length > 0 ? values.join(' | ') : 'none'
}

export function buildWorkingMemorySystemBlock(view: WorkingMemoryPromptView) {
  const lines = [
    '[ALICIZATION_WORKING_MEMORY]',
    'This block is the current-conscious short-term working memory for this turn. It is not long-term memory and not persona truth.',
    `Current thread: ${view.currentThread ?? 'none'}`,
    `Active task: ${view.activeTask ?? 'none'}`,
    `Unresolved questions: ${joinOrNone(view.unresolvedQuestions)}`,
    `Commitments: ${joinOrNone(view.commitments)}`,
    `User corrections: ${joinOrNone(view.userCorrections)}`,
    `Relationship posture: ${view.relationshipPosture ?? 'none'}`,
    `Emotional posture: ${view.emotionalPosture ?? 'none'}`,
    `Execution carry: ${view.executionCarry ?? 'none'}`,
    `Memory query hints: ${joinOrNone(view.memoryQueryHints)}`,
    `Compression: ${view.compressionNotice ?? 'none'}`,
    'Recent raw dialogue:',
    ...view.recentRawDialogue.map(turn => `${turn.role === 'user' ? 'U' : 'A'}: ${turn.text}`),
    'Use this to stay with the current living thread. Do not turn audit failures, timeouts, or fallback text into personality.',
  ]
  return lines.map(line => normalizeWorkingMemoryText(line, 900)).filter(Boolean).join('\n')
}

export function injectWorkingMemorySystemBlock(messages: Message[], systemBlock: string | null | undefined): Message[] {
  const normalized = normalizeWorkingMemoryText(systemBlock, 5000)
  if (!normalized)
    return messages
  return [
    {
      role: 'system',
      content: normalized,
    } as Message,
    ...messages,
  ]
}
```

- [ ] **Step 4: Run prompt view tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.test.ts
git commit -m "feat(alicization): render working memory prompt view"
```

---

### Task 6: Main Chat Runtime Shadow Integration

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-main-chat-integration.test.ts`

- [ ] **Step 1: Write the integration helper test**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-main-chat-integration.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { buildWorkingMemorySnapshot } from './working-memory-builder'
import {
  buildWorkingMemoryPromptView,
  buildWorkingMemorySystemBlock,
  injectWorkingMemorySystemBlock,
} from './working-memory-prompt-view'

describe('working memory main chat integration helpers', () => {
  it('builds an injectable block from runtime-surface-like state and keeps failure text out', () => {
    const snapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-main',
      now: 10_000,
      currentUserText: '继续，不要固定模板',
      recentTurns: [{
        turnId: 'turn-old',
        userText: '你是谁',
        assistantText: '超时了。',
        createdAt: 9000,
      }],
      conversationState: {
        jointThread: 'B 线 WorkingMemory',
        hostMove: '继续，不要固定模板',
        activeProject: 'WorkingMemory integration',
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: ['把短期记忆注入主回复链路'],
        relationFrame: 'repair',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: ['WorkingMemory'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: [],
        updatedAt: 10_000,
      },
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'guide',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep the current WorkingMemory line.',
        consciousTension: 'No fixed template.',
        speakingIntention: 'Continue the implementation thread.',
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.8,
        reasonTags: [],
        updatedAt: 10_000,
      },
    })
    const block = buildWorkingMemorySystemBlock(buildWorkingMemoryPromptView(snapshot))
    const messages = injectWorkingMemorySystemBlock([{ role: 'user', content: '继续' }], block)

    expect(messages[0]?.role).toBe('system')
    expect(String(messages[0]?.content)).toContain('[ALICIZATION_WORKING_MEMORY]')
    expect(String(messages[0]?.content)).toContain('B 线 WorkingMemory')
    expect(String(messages[0]?.content)).toContain('不要固定模板')
    expect(String(messages[0]?.content)).not.toContain('超时了。')
  })
})
```

- [ ] **Step 2: Run integration helper test**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-main-chat-integration.test.ts
```

Expected: PASS because previous tasks created the helper modules.

- [ ] **Step 3: Modify main chat session runtime imports**

In `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`, add these imports near the other local Alicization imports:

```ts
import { buildWorkingMemorySnapshot } from './life-core/working-memory-builder'
import {
  buildWorkingMemoryPromptView,
  buildWorkingMemorySystemBlock,
  injectWorkingMemorySystemBlock,
} from './life-core/working-memory-prompt-view'
```

- [ ] **Step 4: Add recent-turn extraction helper**

In `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`, add this helper near other small local helpers:

```ts
function readWorkingMemoryRecentTurnsFromContextualString(contextualString: string) {
  const chunks = contextualString
    .split(/\n{2,}/u)
    .map(chunk => chunk.trim())
    .filter(Boolean)

  return chunks.map((chunk, index) => {
    const userMatch = chunk.match(/(?:^|\n)U:\s*([^\n]+)/u)
    const assistantMatch = chunk.match(/(?:^|\n)A:\s*([^\n]+)/u)
    return {
      turnId: `contextual-${index + 1}`,
      userText: userMatch?.[1] ?? null,
      assistantText: assistantMatch?.[1] ?? null,
      createdAt: index + 1,
    }
  })
}
```

- [ ] **Step 5: Build and inject the WorkingMemory block after provider-facing messages are assembled**

In `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`, find this block:

```ts
messages = injectProviderFacingMindTurnContractSystemMessage({
  contract: finalizedReturnedMindTurnContract,
  messages: runtimeSurface.messages,
})
if (!carriesAlicizationCanonicalProjectState(messages)) {
  messages = [
    ...buildAlicizationProjectStateExtraSystemBlocks().map(content => ({ role: 'system', content }) as Message),
    ...messages,
  ]
}
runtimeSurface.messages = messages
```

Replace it with:

```ts
messages = injectProviderFacingMindTurnContractSystemMessage({
  contract: finalizedReturnedMindTurnContract,
  messages: runtimeSurface.messages,
})
if (!carriesAlicizationCanonicalProjectState(messages)) {
  messages = [
    ...buildAlicizationProjectStateExtraSystemBlocks().map(content => ({ role: 'system', content }) as Message),
    ...messages,
  ]
}

const workingMemorySnapshot = buildWorkingMemorySnapshot({
  cardId: payload.cardId,
  sessionId: agentTurn.conversationSessionId ?? payload.cardId,
  now,
  currentUserText: readLatestUserTextFromMessages(payload.messages),
  recentTurns: readWorkingMemoryRecentTurnsFromContextualString(contextualString),
  conversationState: runtimeSurface.digitalLifeRuntimeSurface?.dialogue?.conversationState ?? null,
  dialogueWorldThread: runtimeSurface.digitalLifeRuntimeSurface?.dialogue?.dialogueWorldThread ?? null,
  currentConsciousFrame: runtimeSurface.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame ?? null,
  executionCarry: executionCallbackContext.recallText || executionLedgerContext.recallText || null,
})
const workingMemorySystemBlock = buildWorkingMemorySystemBlock(
  buildWorkingMemoryPromptView(workingMemorySnapshot),
)
messages = injectWorkingMemorySystemBlock(messages, workingMemorySystemBlock)
runtimeSurface.messages = messages
```

Add this helper near `readWorkingMemoryRecentTurnsFromContextualString`:

```ts
function readLatestUserTextFromMessages(messages: Message[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message.role !== 'user')
      continue
    if (typeof message.content === 'string')
      return message.content.trim()
    if (Array.isArray(message.content)) {
      return message.content
        .map((part) => {
          if (typeof part === 'string')
            return part
          if (part && typeof part === 'object' && 'text' in part)
            return String((part as { text?: unknown }).text ?? '')
          return ''
        })
        .join('\n')
        .trim()
    }
  }
  return ''
}
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory.test.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-policy.test.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-builder.test.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-compressor.test.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.test.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.test.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-main-chat-integration.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run typecheck**

Run:

```bash
pnpm -F @proj-alicization/stage-tamagotchi typecheck
```

Expected: PASS. If this command triggers the existing MediaPipe postinstall failure, record the failure path and run the focused Vitest set again to confirm the WorkingMemory change itself is green.

- [ ] **Step 8: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-main-chat-integration.test.ts
git commit -m "feat(alicization): inject working memory prompt view"
```

---

## Final Verification

- [ ] Run the focused WorkingMemory test set:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory.test.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-policy.test.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-builder.test.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-compressor.test.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.test.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.test.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-main-chat-integration.test.ts
```

Expected: PASS.

- [ ] Run stage-tamagotchi typecheck:

```bash
pnpm -F @proj-alicization/stage-tamagotchi typecheck
```

Expected: PASS, unless the known MediaPipe asset postinstall failure blocks the command before TypeScript starts. If blocked, include the exact `vision_wasm_nosimd_internal.wasm` error in the handoff.

- [ ] Confirm there is no fallback/persona contamination in the new tests:

```bash
rg -n "我在。结构化连续性状态的线还在|中性可见占位" apps/stage-tamagotchi/src/main/services/alicization/life-core
```

Expected: only the policy test fixture should match.

- [ ] Confirm git status is clean:

```bash
git status --short
```

Expected: no output.

## Implementation Notes

- This plan intentionally does not change long-term memory, embeddings, vector search, LoRA, or nightly training.
- The first runtime integration injects a bounded WorkingMemory prompt block but does not remove old contextual recall.
- `conversation_turns` remains the raw evidence store. The hot store is an optimization and a future integration point.
- Any timeout/provider/tool failure must be visible as failure semantics and excluded from long-term candidate generation.
- If the WorkingMemory injection causes prompt-size issues, reduce `maxRecentDialogueTurns` in `buildWorkingMemoryPromptView` before changing the data model.
