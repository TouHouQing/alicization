# 2026-04-15 Alicization Total Mind-Memory Closure Execution Plan

## Internal Grade

XL

## Strategy

本轮不再把心智与记忆拆成若干局部修补，而是按“慢变量先落盘、再进主链、再进行为、最后进表层和回流”的顺序做波次推进。执行策略是 wave-sequential：每一波只在前一波 contract 稳定后继续扩张 consumer，避免再次出现“有模块、没闭环”的结构回退。

## Wave Structure

### Wave 1. Freeze Shared Truth And Persistence

目标：先把跨宿主真相源与持久化表面固定下来，否则后面所有人格和记忆慢变量都会继续漂移。

实施：

1. 把所有 Alicization mind / memory slow-variable contracts 收敛到：
   `packages/stage-shared/src/alicization-transport-contracts.ts`
2. `apps/stage-tamagotchi/src/shared/eventa.ts` 只保留 re-export，不再定义独立真相。
3. 扩展 persistence surface：
   `memory_reflections`
   `memory_contradictions`
   `persona_reinforcement_events`
   `motive_episodes`
   `relationship_outcomes`
4. 统一 query / upsert APIs 到 `db.ts` 与 runtime invoke handlers。

交付门槛：

- shared contract 单一来源成立
- runtime / bridge / UI 不再本地复制 slow-variable 类型

### Wave 2. Build Memory Reconciliation Core

目标：让记忆不只是越积越多，而是会晋升、降级、抑制、纠错和遗忘。

新增或重构：

1. `memory-reconciliation.ts`
2. `reflection-synthesizer.ts`
3. `runtime-mind-state.ts` 内的 async extraction queue
4. `epoch1` extraction pipeline

规则：

1. `memory_facts` 按 type 分类：
   preference
   boundary
   value
   identity
   relationship
   task/open-loop
   affect/outcome
2. contradiction set 显式维护，禁止只靠后写覆盖前写。
3. 支持：
   confidence decay
   suppression cooldown
   reflection promotion
   stale fact demotion
4. 建立 facts -> reflections 的正式转译，而不是只靠 prompt summarize。

交付门槛：

- 事实不再只累加
- 反思不再只是 turn-local 修订

### Wave 3. Upgrade Autobiographical Self Into A Real Slow Variable

目标：把已有 `autobiographicalSelf` 从“有 persona drift”推进成“真正的长期自我沉淀器”。

实施文件：

1. `autobiographical-self.ts`
2. `self-continuity.ts`
3. `relationship-history.ts` 新增
4. `visual-episodic-memory.ts`
5. `digital-life-kernel.ts`

新增能力：

1. `identityCommitments`
2. `temperThresholds`
3. `repairDiscipline`
4. `relationshipDoctrine`
5. `selfContradictionTension`
6. `habitSignatures`
7. `relationshipTrajectories`

更新策略：

1. 所有更新显式区分快变量和慢变量。
2. 慢变量使用 blend / promotion / reinforcement，不允许每轮直接覆盖。
3. `autobiographicalSelf` 与 `longHorizonMemory` 分工明确：
   `longHorizonMemory` 负责 durable cues
   `autobiographicalSelf` 负责 durable identity

交付门槛：

- Alicization 能表达“最近变成了什么样的人”
- 该表达由 persisted state 支撑，而不是当场编造

### Wave 4. Build Motive Engine And Long-Term Agenda

目标：让 Alicization 的主动性开始来自长期人格与长期未完成线程，而不是只来自当前 scene pressure。

新增或重构：

1. `motive-engine.ts`
2. `habit-policy.ts`
3. `goal-stack.ts`
4. `desire-memory.ts`
5. `initiative-arbiter.ts`
6. `initiative-engine.ts`

必须实现：

1. `longTermGoals`
2. `backgroundAgendas`
3. `returnPressure`
4. `boundaryRespectDrive`
5. `companionshipDrive`
6. `truthDisciplineDrive`
7. `restProtectionDrive`

关键规则：

1. 当前场景只能影响 motive selection，不能每次重置 motive identity。
2. 长期未完成线程必须进入 motive 层，而不是只留在 recall 文本。
3. habit policy 要能压住“明明能说但不该说”的 impulse。

交付门槛：

- proactive / answer / execution routing 都能看见 motive bias

### Wave 5. Unify Conscious Workspace And Executive Control

目标：解决“很多模块都在想，但没有一个统一前台意识工作台”的问题。

新增或重构：

1. `mind-workspace.ts`
2. `current-conscious-frame.ts`
3. `executive-cycle.ts`
4. `thought-threads.ts`
5. `private-thought-loop.ts`
6. `mind-synthesizer.ts`

要求：

1. 单一 foreground preoccupation
2. 单一 ruling motive
3. 单一 active tension band
4. 单一 next-action bias
5. 支持内部 thought budget 与 inhibition band

交付门槛：

- 当前“她在想什么”能被一个统一结构解释
- 该结构可被 response/action side 复用

### Wave 6. Build Outcome Reinforcement And Persona Feedback

目标：形成真正闭环。没有结果反哺，就没有人格进化。

新增或重构：

1. `outcome-reinforcement.ts`
2. `reflection-ledger.ts`
3. `runtime.ts`
4. proactive outcome recording
5. execution completion / failure feedback path

每次 reply / proactive / execution 都要计算：

1. closeness delta
2. trust delta
3. misread delta
4. burden delta
5. boundary violation risk
6. open-loop closure score
7. repair payoff

回流目标：

1. `memory_facts`
2. `memory_reflections`
3. `autobiographicalSelf`
4. `relationshipHistory`
5. `motiveEngine`
6. `habitPolicy`

交付门槛：

- 结果不再只存日志
- 人格和习惯会因结果改变

### Wave 7. Project The Mind To All Runtime Surfaces

目标：让这套心智内核不只在内部存在，还能稳定投影到任何宿主。

实施文件：

1. `main-chat-runtime-surface.ts`
2. `main-chat-stream-meta.ts`
3. `digital-life-spine.ts`
4. `packages/stage-ui/src/stores/alicization-bridge.ts`
5. `packages/stage-ui/src/stores/alicization-browser-bridge.ts`

必须投影：

1. autobiographical self digest
2. long horizon memory digest
3. motive / agenda digest
4. habit policy digest
5. outcome learning digest
6. conscious workspace digest

规则：

1. prompt blocks 只能消费内核状态，不允许自己成为真相源。
2. stream meta 必须在慢变量变化时发出新签名。
3. digital-life spine 要成为未来任意宿主的统一读取面。

### Wave 8. Verification, Tuning, And Scenario Packs

目标：用场景包而不是直觉来校验“更像真人”的提升。

新增测试面：

1. `memory-reconciliation.test.ts`
2. `reflection-synthesizer.test.ts`
3. `autobiographical-self.test.ts`
4. `relationship-history.test.ts`
5. `motive-engine.test.ts`
6. `habit-policy.test.ts`
7. `outcome-reinforcement.test.ts`
8. `mind-workspace.test.ts`
9. `runtime-long-horizon-e2e.test.ts`

场景包至少覆盖：

1. repair-then-trust
2. ignored-then-boundary-learning
3. warmth-then-overcrowding
4. late-night-rest-protection
5. unfinished-thread-return
6. execution-success-vs-execution-failure
7. relationship-warmup-vs-relationship-cooling

## Ownership Boundaries

### Shared Contract / Persistence

- `packages/stage-shared/src/alicization-transport-contracts.ts`
- `packages/stage-shared/src/alicization-digital-life.ts`
- `apps/stage-tamagotchi/src/shared/eventa.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/digital-life-kernel.ts`

### Memory Core

- `apps/stage-tamagotchi/src/main/services/alicization/long-horizon-memory.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/memory-reconciliation.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/reflection-synthesizer.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/reflection-ledger.ts`

### Self / Relationship / Habit / Motive

- `apps/stage-tamagotchi/src/main/services/alicization/autobiographical-self.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/self-continuity.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/relationship-history.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/motive-engine.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/habit-policy.ts`

### Conscious Workspace / Decision

- `apps/stage-tamagotchi/src/main/services/alicization/runtime-mind-state.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/goal-stack.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/desire-memory.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/current-conscious-frame.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/private-thought-loop.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/mind-synthesizer.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/initiative-arbiter.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/initiative-engine.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/executive-cycle.ts`

### Projection / Runtime Surface

- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-meta.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/digital-life-spine.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`

## Implementation Rules

1. 不允许再把慢变量只做成 prompt block。所有慢变量必须进入 persisted runtime state。
2. 不允许 duplicated heuristics 在 main / renderer / UI 三处各算一遍。
3. 所有 persona drift / motive drift 都必须有更新率、抑制条件、强化条件，不能每轮直接覆盖。
4. outcome evaluator 不能只记成功失败，而必须拆成关系/信任/边界/open-loop/repair 五类影响。
5. `runtime-mind-state.ts` 必须继续是唯一装配根，其他模块只负责纯函数 builder 或 persistence adapter。
6. 若某层暂时只能先做 provisional/final 两阶段装配，必须保持依赖方向清晰，不允许形成多重真相源。

## Verification Commands

1. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
2. `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/long-horizon-memory.test.ts`
3. `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/autobiographical-self.test.ts`
4. `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/mind-ecology.test.ts`
5. `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/goal-stack.test.ts`
6. `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/initiative-engine.test.ts`
7. `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/main-chat-runtime-surface.test.ts`
8. `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/main-chat-stream-meta.test.ts`
9. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`
10. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`
11. `pnpm lint:fix`

## Delivery Acceptance Plan

1. 先证明 shared contract 和 persistence hierarchy 已固定。
2. 再证明 facts -> reflections -> self -> motive -> outcome reinforcement 的闭环代码已经存在。
3. 再证明 reply / proactive / execution 都消费同一份心智内核。
4. 只有在上述三点和验证都成立后，才允许说“本轮闭环主干已完成”。

## Rollback Rules

1. 若主动性被长期 motive 拉得过强，优先下调 motive weights，不回退 motive layer。
2. 若人格漂移过快，优先收紧 reinforcement / blend rate，不删除 autobiographical self。
3. 若 prompt surface 出现“自说自话”，优先减薄 projection block，不删除 slow-variable persistence。
4. 若结果反哺造成噪声，优先提高 promotion threshold，不删除 outcome evaluator。

## Phase Cleanup Expectations

1. 不提交 `docs/requirements/**`、`docs/plans/**`、`outputs/runtime/**`。
2. 不提交 `N.E.K.O/**`、`claude-code-main/**`。
3. 源码提交前确认只有 Alicization runtime / tests / shared contracts 相关文件入索引。

## Current Code To Target Mapping

本节冻结“现有模块保留什么、下放什么、新增什么”，避免后续又回到局部 patch。

### Keep As Core Builders

1. `long-horizon-memory.ts`
   保留为 semantic memory projector，但输入要从“裸 facts”升级为“facts + contradictions + reflection digest”。
2. `autobiographical-self.ts`
   保留为 self-head builder，但输入必须加入 reinforcement events、relationship history head、habit policy head。
3. `mind-ecology.ts`
   保留为 ecology projector，但明确降级为 `self/motive/workspace -> ecology digest`，不再偷偷承担慢变量真相源职责。
4. `goal-stack.ts`、`desire-memory.ts`、`initiative-arbiter.ts`、`initiative-engine.ts`
   保留，但要从 motive/habit heads 读取 bias，而不是各自散算一套长期人格偏好。
5. `digital-life-kernel.ts`、`digital-life-spine.ts`、`main-chat-runtime-surface.ts`、`main-chat-stream-meta.ts`
   保留为 projection surface，只消费 runtime-mind-state 的 canonical result。

### Must Be Reframed

1. `reflection-ledger.ts`
   从 turn-local revision ledger 升级为 runtime 对 persisted reflection memory 的当前消费面。
2. `self-continuity.ts`
   从“上一帧 + 当前关系压力”升级为“relationship history head + current world + long horizon bias”的 continuity reducer。
3. `runtime.ts`
   需要承担统一 turn close / proactive close / execution close 的 outcome write-back orchestration。
4. `packages/stage-ui/src/stores/alicization-epoch1.ts`
   保留 async extraction 调度职责，但不得继续承担心智治理 authority。

### New Canonical Modules

1. `memory-reconciliation.ts`
2. `reflection-synthesizer.ts`
3. `relationship-history.ts`
4. `motive-engine.ts`
5. `habit-policy.ts`
6. `outcome-reinforcement.ts`
7. `mind-workspace.ts`

## Frozen Persistence Design

### Design Rule

不做“每次启动从全部事件重放整个人格”，而是做：

1. `ledger tables` 保存变化依据
2. `head snapshots` 保存当前稳定慢变量
3. runtime 每轮读取：
   head + recent ledgers + current world
4. async worker 负责：
   ledgers -> reconcile -> new heads

### New Tables

#### `memory_reflections`

用途：正式 reflective memory，不再只靠 `reflectionLedger` 在内存里转瞬即逝。

建议字段：

1. `id TEXT PRIMARY KEY`
2. `card_id TEXT NOT NULL`
3. `decision_trace_id TEXT NULL`
4. `turn_id TEXT NULL`
5. `session_id TEXT NULL`
6. `source_kind TEXT NOT NULL`
   `reply` | `proactive` | `execution` | `maintenance`
7. `target_scope TEXT NOT NULL`
   `self` | `relationship` | `boundary` | `truth` | `task` | `habit`
8. `summary TEXT NOT NULL`
9. `lesson TEXT NOT NULL`
10. `status TEXT NOT NULL`
    `pending` | `confirmed` | `denied` | `superseded`
11. `confidence REAL NOT NULL`
12. `supporting_fact_ids_json TEXT NULL`
13. `supporting_outcome_ids_json TEXT NULL`
14. `created_at INTEGER NOT NULL`
15. `updated_at INTEGER NOT NULL`
16. `confirmed_at INTEGER NULL`
17. `denied_at INTEGER NULL`

索引：

1. `(card_id, updated_at DESC)`
2. `(card_id, status, updated_at DESC)`
3. `(decision_trace_id, created_at DESC)`

#### `memory_contradictions`

用途：显式记录事实冲突和解决状态，禁止“后写覆盖前写”。

建议字段：

1. `id TEXT PRIMARY KEY`
2. `card_id TEXT NOT NULL`
3. `left_fact_id TEXT NOT NULL`
4. `right_fact_id TEXT NOT NULL`
5. `domain TEXT NOT NULL`
   `preference` | `boundary` | `identity` | `relationship` | `task` | `affect`
6. `reason TEXT NOT NULL`
7. `resolution_status TEXT NOT NULL`
   `open` | `suppressed-left` | `suppressed-right` | `merged` | `expired`
8. `winner_fact_id TEXT NULL`
9. `created_at INTEGER NOT NULL`
10. `updated_at INTEGER NOT NULL`

索引：

1. `(card_id, resolution_status, updated_at DESC)`
2. `(left_fact_id)`
3. `(right_fact_id)`

#### `persona_reinforcement_events`

用途：把 reply / proactive / execution 的结果写成对人格维度的强化/抑制事件。

建议字段：

1. `id TEXT PRIMARY KEY`
2. `card_id TEXT NOT NULL`
3. `decision_trace_id TEXT NULL`
4. `turn_id TEXT NULL`
5. `session_id TEXT NULL`
6. `source_kind TEXT NOT NULL`
   `reply` | `proactive` | `execution`
7. `dimension TEXT NOT NULL`
   `companionship` | `truthful-grounding` | `autonomy-respect` | `gentle-repair` | `unfinished-thread-return` | `temper-guardedness` | `temper-directness`
8. `delta REAL NOT NULL`
9. `valence TEXT NOT NULL`
   `reinforce` | `suppress`
10. `summary TEXT NOT NULL`
11. `created_at INTEGER NOT NULL`

索引：

1. `(card_id, dimension, created_at DESC)`
2. `(turn_id, created_at DESC)`

#### `motive_episodes`

用途：记录长期 motive/agenda 的出现、持续、转向与关闭。

建议字段：

1. `id TEXT PRIMARY KEY`
2. `card_id TEXT NOT NULL`
3. `motive_kind TEXT NOT NULL`
   `preserve-trust` | `respect-boundary` | `return-thread` | `care-body` | `sustain-companionship` | `protect-rest` | `maintain-truth`
4. `status TEXT NOT NULL`
   `forming` | `active` | `dormant` | `resolved` | `suppressed`
5. `weight REAL NOT NULL`
6. `trigger_summary TEXT NOT NULL`
7. `source_reflection_id TEXT NULL`
8. `source_outcome_id TEXT NULL`
9. `opened_at INTEGER NOT NULL`
10. `updated_at INTEGER NOT NULL`
11. `closed_at INTEGER NULL`

索引：

1. `(card_id, status, updated_at DESC)`
2. `(card_id, motive_kind, updated_at DESC)`

#### `relationship_outcomes`

用途：统一 reply / proactive / execution 对关系的结果评分。

建议字段：

1. `id TEXT PRIMARY KEY`
2. `card_id TEXT NOT NULL`
3. `decision_trace_id TEXT NULL`
4. `turn_id TEXT NULL`
5. `session_id TEXT NULL`
6. `source_kind TEXT NOT NULL`
   `reply` | `proactive` | `execution`
7. `action_summary TEXT NOT NULL`
8. `closeness_delta REAL NOT NULL`
9. `trust_delta REAL NOT NULL`
10. `burden_delta REAL NOT NULL`
11. `boundary_delta REAL NOT NULL`
12. `misread_delta REAL NOT NULL`
13. `repair_delta REAL NOT NULL`
14. `open_loop_delta REAL NOT NULL`
15. `summary TEXT NOT NULL`
16. `created_at INTEGER NOT NULL`

索引：

1. `(card_id, created_at DESC)`
2. `(turn_id, created_at DESC)`

### Head Snapshots In `alicization_meta`

为了避免新增过多 snapshot 表且保持读取成本稳定，当前 head 先落到 `alicization_meta`：

1. `mind_head_autobiographical_self_v1`
2. `mind_head_relationship_history_v1`
3. `mind_head_motive_state_v1`
4. `mind_head_habit_policy_v1`
5. `mind_head_reflection_digest_v1`

规则：

1. `head` 永远由 runtime/main 写。
2. renderer / UI 只能读投影，不得写 head。
3. 若以后 head 体积或版本演进需要独立表，再从 `meta` 升级，不改变调用语义。

## Frozen Runtime Build Pipeline

### Synchronous Hot Path

每个 user turn / proactive tick / execution callback 都走同一条热路径：

1. 读取 ingress world 与当前 screen/dialogue context
2. 建立 `worldModel`
3. 建立 `dialogueEncounter` / `truthDiscipline`
4. 读取：
   `memory_facts`
   reflection digest head
   autobiographical self head
   relationship history head
   motive head
   habit policy head
5. 基于 head + recent ledgers 构建：
   `longHorizonMemory`
   `selfContinuity`
   `relationshipHistory`
   `autobiographicalSelf`
   `motiveState`
   `habitPolicy`
   `mindWorkspace`
6. 再向下游投影：
   `goalStack`
   `desireMemory`
   `initiative`
   `privateThought`
   `mindEcology`
   `runtime surface`
   `digital-life spine`

### Asynchronous Closure Path

reply / proactive / execution 完成后统一进入：

1. `turn outcome evaluation`
2. `relationship_outcomes` append
3. `persona_reinforcement_events` append
4. async extraction 产出 facts candidates
5. `memory-reconciliation.ts` 做：
   dedupe
   contradiction detection
   decay
   suppression
   promotion/demotion
6. `reflection-synthesizer.ts` 产生 new reflection entries
7. `relationship-history.ts` 刷新 relationship head
8. `autobiographical-self.ts` 刷新 self head
9. `motive-engine.ts` / `habit-policy.ts` 刷新 motive/habit heads

## Frozen Module APIs

以下 API 不是最终逐字签名，但它们冻结了职责边界。

### `memory-reconciliation.ts`

```ts
export interface AlicizationMemoryReconciliationResult {
  upserts: AlicizationMemoryFactInput[]
  suppressions: string[]
  contradictions: AlicizationMemoryContradictionInput[]
  promotedFactIds: string[]
  demotedFactIds: string[]
  reflectionCandidates: AlicizationReflectionCandidate[]
}

export async function reconcileAlicizationMemoryBatch(input: {
  now: number
  cardId: string
  extractedFacts: AlicizationMemoryFactInput[]
  existingFacts: AlicizationMemoryFact[]
  existingContradictions: AlicizationMemoryContradictionRecord[]
  recentOutcomes: AlicizationRelationshipOutcomeRecord[]
}): Promise<AlicizationMemoryReconciliationResult>
```

### `reflection-synthesizer.ts`

```ts
export interface AlicizationReflectionSynthesisResult {
  entries: AlicizationMemoryReflectionInput[]
  digestHead: AlicizationReflectionDigestHead
  promotedLessons: string[]
}

export function synthesizeAlicizationReflections(input: {
  now: number
  facts: AlicizationMemoryFact[]
  contradictions: AlicizationMemoryContradictionRecord[]
  outcomes: AlicizationRelationshipOutcomeRecord[]
  previousDigestHead?: AlicizationReflectionDigestHead | null
}): AlicizationReflectionSynthesisResult
```

### `relationship-history.ts`

```ts
export function buildAlicizationRelationshipHistory(input: {
  now: number
  previous?: AlicizationRelationshipHistoryHead | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  recentOutcomes: AlicizationRelationshipOutcomeRecord[]
  recentReflections: AlicizationMemoryReflectionRecord[]
}): AlicizationRelationshipHistoryHead
```

### `outcome-reinforcement.ts`

```ts
export interface AlicizationTurnOutcomeEvaluation {
  relationshipOutcome: AlicizationRelationshipOutcomeInput
  reinforcementEvents: AlicizationPersonaReinforcementEventInput[]
  openLoopChanges: AlicizationOpenLoopDelta[]
}

export function evaluateAlicizationTurnOutcome(input: {
  now: number
  sourceKind: 'reply' | 'proactive' | 'execution'
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface
  resultPayload: Record<string, unknown> | null
}): AlicizationTurnOutcomeEvaluation
```

### `motive-engine.ts`

```ts
export interface AlicizationMotiveStateHead {
  longTermGoals: AlicizationLongTermGoal[]
  backgroundAgendas: AlicizationBackgroundAgenda[]
  dominantMotive: string | null
  motiveWeights: Record<string, number>
  updatedAt: number
}

export function buildAlicizationMotiveState(input: {
  now: number
  previous?: AlicizationMotiveStateHead | null
  autobiographicalSelf: AlicizationAutobiographicalSelfSnapshot | null
  relationshipHistory: AlicizationRelationshipHistoryHead | null
  reflectionDigest: AlicizationReflectionDigestHead | null
  unresolvedThreads: AlicizationUnresolvedThreadDigest[]
}): AlicizationMotiveStateHead
```

### `habit-policy.ts`

```ts
export function buildAlicizationHabitPolicy(input: {
  now: number
  previous?: AlicizationHabitPolicyHead | null
  autobiographicalSelf: AlicizationAutobiographicalSelfSnapshot | null
  motiveState: AlicizationMotiveStateHead | null
  recentOutcomes: AlicizationRelationshipOutcomeRecord[]
}): AlicizationHabitPolicyHead
```

### `mind-workspace.ts`

```ts
export function buildAlicizationMindWorkspace(input: {
  now: number
  worldModel: AlicizationWorldModelSnapshot
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  motiveState?: AlicizationMotiveStateHead | null
  habitPolicy?: AlicizationHabitPolicyHead | null
  reflectionDigest?: AlicizationReflectionDigestHead | null
  relationshipHistory?: AlicizationRelationshipHistoryHead | null
}): AlicizationMindWorkspaceSnapshot
```

## File-Level Landing Order

### Step 1. Shared Types And DB First

先改：

1. `packages/stage-shared/src/alicization-transport-contracts.ts`
2. `packages/stage-shared/src/alicization-digital-life.ts`
3. `apps/stage-tamagotchi/src/shared/eventa.ts`
4. `apps/stage-tamagotchi/src/main/services/alicization/db.ts`

完成标准：

1. 新增 slow-variable heads、records、DB input/output types。
2. 新增 db methods：
   `listMemoryReflections`
   `upsertMemoryReflections`
   `listMemoryContradictions`
   `upsertMemoryContradictions`
   `appendPersonaReinforcementEvents`
   `listPersonaReinforcementEvents`
   `upsertMindHead`
   `readMindHead`
   `appendRelationshipOutcomes`
   `listRelationshipOutcomes`
   `upsertMotiveEpisodes`

### Step 2. Memory Core

改：

1. `long-horizon-memory.ts`
2. `reflection-ledger.ts`
3. `memory-reconciliation.ts` 新增
4. `reflection-synthesizer.ts` 新增

完成标准：

1. facts 进入正式 reconciliation。
2. reflection 进入正式 persistence。
3. `longHorizonMemory` 不再只吃 `memory_facts`。

### Step 3. Self / Relationship / Motive / Habit

改：

1. `autobiographical-self.ts`
2. `self-continuity.ts`
3. `relationship-history.ts` 新增
4. `motive-engine.ts` 新增
5. `habit-policy.ts` 新增

完成标准：

1. 自我、关系、动机、习惯都有 head。
2. 当前 builder 从 heads 读取，不再靠临时 blend 硬撑全部长期人格。

### Step 4. Runtime Assembly Refactor

改：

1. `runtime-mind-state.ts`
2. `runtime.ts`
3. `runtime-invoke-handlers-memory.ts`
4. `runtime-invoke-handlers-soul-state.ts`

完成标准：

1. `runtime-mind-state.ts` 内部按：
   observe
   recall
   self
   workspace
   projection
   分段装配
2. `runtime.ts` 统一 turn close / proactive close / execution close 的 write-back path。

### Step 5. Consumers And Surfaces

改：

1. `goal-stack.ts`
2. `desire-memory.ts`
3. `initiative-arbiter.ts`
4. `initiative-engine.ts`
5. `private-thought-loop.ts`
6. `mind-ecology.ts`
7. `main-chat-runtime-surface.ts`
8. `main-chat-stream-meta.ts`
9. `digital-life-kernel.ts`
10. `digital-life-spine.ts`
11. `packages/stage-ui/src/stores/alicization-bridge.ts`
12. `packages/stage-ui/src/stores/alicization-browser-bridge.ts`

完成标准：

1. 所有消费端都从 canonical heads / digests 读取。
2. 没有第二套人格推导。

## Ownership Matrix

### Writers

1. `runtime.ts`
   写 turn/outcome/reinforcement orchestration
2. `db.ts`
   唯一 persistence adapter
3. async extraction worker
   只负责事实抽取与 reconcile，不直接生成 UI surface

### Readers

1. `runtime-mind-state.ts`
   唯一汇总 reader
2. projection surfaces
   只读 runtime result
3. renderer / UI bridges
   只读 invoke/query results

### Forbidden Patterns

1. renderer 自己根据 message history 推 persona drift
2. stream meta 自己计算第二套 long-term bias
3. prompt block 自己缓存“她最近变成什么样的人”
4. initiative engine 不经过 motive/habit head 直接长期化当前压力

## Performance And Safety Strategy

### Performance

1. 热路径不引入新的 blocking LLM 总结器。
2. 新增 memory/reflection synthesis 放入 async closure pipeline。
3. runtime 只读取有限 recent ledgers：
   reflections 最近 8 条
   reinforcement 最近 24 条
   relationship outcomes 最近 24 条
4. head 永远优先于长历史回放。

### Safety

1. 若反思 synthesis 失败，只跳过 reflection promotion，不阻塞 turn。
2. 若某个 head 解析失败，回退默认 head，同时记录 audit log。
3. contradiction resolution 初期只做 `open/suppress/merged`，不做复杂多事实推理。
4. 所有新 head 和 digest 都带 version 字段，便于未来 schema 演进。

## Verification Matrix

### Unit

1. `memory-reconciliation.test.ts`
   验证 dedupe / contradiction / suppression / decay
2. `reflection-synthesizer.test.ts`
   验证 facts+outcomes -> reflections
3. `relationship-history.test.ts`
   验证 ignored/dismiss/repair/helped 如何改变关系 head
4. `motive-engine.test.ts`
   验证 unresolved thread + self doctrine 如何形成长期 motive
5. `habit-policy.test.ts`
   验证 boundary learning 如何压住不合时宜的靠近冲动
6. `outcome-reinforcement.test.ts`
   验证 reply/proactive/execution 不同结果如何回写 reinforcement
7. `mind-workspace.test.ts`
   验证单一 foreground preoccupation 与 ruling motive

### Integration

1. `runtime.test.ts`
   验证 turn close 后 ledger/head 变化
2. `db.test.ts`
   验证新表、新索引、clearConversationData 清理完整
3. `main-chat-runtime-surface.test.ts`
   验证 surface 消费 canonical heads
4. `main-chat-stream-meta.test.ts`
   验证慢变量变化触发新 meta signature
5. `digital-life-spine.test.ts`
   验证 spine digest 包含长期自我/动机/习惯摘要

### Scenario Packs

1. `repair-then-trust`
   修复成功后 truth/gentle-repair 上升
2. `ignored-then-boundary-learning`
   被忽略后 autonomy-respect 和 quiet-observation 上升
3. `unfinished-thread-return`
   未完成线程在数小时后仍维持 return pressure
4. `execution-success-vs-failure`
   成功执行提高 self-direction，失败提高 caution/repair bias

## Delivery Rule For The First Code Slice

为了避免 XL 计划再次膨胀失控，真正开始编码时第一交付切片必须是：

1. shared contracts 完成
2. db tables + heads 完成
3. runtime 读 heads 完成
4. outcome -> reinforcement -> reflection -> self/motive head 更新打通

只要这四项打通，Alicization 的心智与记忆就首次真正形成闭环主链；其余细化生态、习惯细粒度、更多场景包，才是第二层增强。
