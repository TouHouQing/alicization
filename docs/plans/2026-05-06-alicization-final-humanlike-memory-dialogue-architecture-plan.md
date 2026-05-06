# Alicization 最终真人记忆对话架构计划

更新日期：2026-05-06

> 本文件替代继续追加 Phase 15、Phase 16 的开发方式。
> 后续开发应以本文件作为一次性收敛目标，而不是继续做分散补丁。

## 当前结论

Phase 14 已经关闭当前最危险的 authority 与 retrieval policy 漏洞：

- 正常 visible reply authority 已收窄为 `llm-mind | llm-second-pass-rewrite`。
- legacy fallback authority 已从正常治理输出中迁出。
- learning feedback 已能写回 telemetry，并影响下一轮 online memory policy。
- 同一 turn 已有 per-turn retrieval policy snapshot，避免同回合 recall 策略漂移。

但系统还不能宣称完成“真人记忆对话”。剩余阻塞点不是单个功能缺失，而是架构形状仍然像多套 reducer / fallback / prompt builder 协作出来的心智，而不是一个统一的、可回放、可学习、可自我约束的 turn OS。

## 最终目标

最终可用版本必须满足以下硬标准：

- 所有正常可见回复必须经过大模型心智生成或大模型二次改写，不允许本地规则生成拟人化正文。
- 记忆必须像真人回忆一样工作：先判断是否该想起，再竞争候选，再形成稳定核心，再决定是否外显，而不是“检索到就塞进回复”。
- 记忆召回率和准确率必须同时被度量；不能只追求 recall 导致错线索、错人、错时间、错任务污染回复。
- 对话必须由统一心智帧驱动：语义、义务、人格、情绪、关系、记忆、任务执行、表面表达都必须在同一个 turn graph 中闭环。
- 主动学习必须能自我进化：学习结果要能回写自传体自我、关系模型、检索策略、回复姿态、主动行为策略，而不是只留在 telemetry。
- 性能必须受预算约束：实时对话有 fast path，深回忆有 deep path，失败时 hold / retry / clarify，不允许假装成真人内容。
- 每轮必须可回放：decision trace、memory candidates、surface contract、visible authority、learning settlement 全链路可审计。

## 非目标

- 不继续增加孤立 prompt block。
- 不继续在 `runtime.ts`、`runtime-governance.ts`、`runtime-organic-memory-prompt.ts` 里直接堆逻辑。
- 不用本地模板模拟情绪、陪伴、回忆正文。
- 不为了短期“有回复”牺牲 truth / memory / mind authority。
- 不以单元测试通过替代 replay benchmark 通过。

## 目标架构

### 1. Turn OS

新增统一 turn graph，作为每个用户 turn 的唯一运行骨架。

建议目录：

```text
apps/stage-tamagotchi/src/main/services/alicization/turn-os/
```

核心类型：

```ts
interface AlicizationTurnGraph {
  ids: {
    cardId: string
    sessionId: string
    turnId: string
    decisionTraceId: string
  }
  encounter: DialogueEncounter
  consciousFrame: CurrentConsciousFrame
  obligation: TurnObligation
  memory: MemoryTurnArtifact
  deliberation: MindDeliberationArtifact
  surface: VisibleReplyRealizationArtifact
  delivery: DeliveryArtifact
  learning: LearningSettlementArtifact
  telemetry: TurnQualityTelemetry
}
```

迁移原则：

- `runtime.ts` 只保留 service wiring、IPC/Eventa、card scope、background scheduler。
- `main-chat-session-runtime.ts` 只负责 session boundary，不再拼装治理细节。
- `runtime-governance.ts` 拆成小 reducer，被 Turn OS 按阶段调用。
- 每个阶段只读上游 artifact，不直接穿透读取远处 runtime 状态。

验收：

- `runtime.ts` 降到 2500 行以下。
- 每个 turn 都产出完整 `AlicizationTurnGraph` trace。
- 同一字段只在一个阶段首次决定，后续只能 refine 或 annotate，不能多处重算。

### 2. Memory OS

把记忆从“prompt context builder”升级为独立记忆系统。

建议目录：

```text
apps/stage-tamagotchi/src/main/services/alicization/memory-os/
```

Memory OS 必须拆成以下阶段：

- `recall-intent`：判断这一轮是否应该回忆、回忆什么、是否只是内隐影响。
- `candidate-retrieval`：按同一 turn policy snapshot 检索 episodic / consolidation / conversation / procedure / relationship。
- `candidate-competition`：做候选竞争、错线程抑制、时间窗冲突、相似任务聚类。
- `memory-deliberation`：由大模型心智决定稳定核心、危险细节、是否可外显。
- `speech-posture`：决定记忆是内隐、简短外显、关系连续性、流程承接，不能生成固定句式正文。
- `memory-settlement`：本轮回复后写入 recall outcome，影响下一轮策略。

核心 artifact：

```ts
interface MemoryTurnArtifact {
  policySnapshotId: string
  recallIntent: RecallIntent
  candidates: MemoryCandidateSet
  competition: MemoryCandidateCompetition
  deliberation: MemoryDeliberation
  speechPosture: MemorySpeechPosture
  withheld: WithheldMemoryReason[]
  metrics: {
    recallCandidateCount: number
    selectedCandidateCount: number
    wrongThreadSuppressedCount: number
    unsupportedSpecificityBlockedCount: number
    latencyMs: number
  }
}
```

必须从以下文件迁出逻辑：

- `runtime-organic-memory-prompt.ts`
- `runtime-organic-memory-access.ts`
- `memory-accessibility-runtime.ts`
- `recall-planner.ts`
- `memory-policy-governor.ts`

验收：

- `runtime-organic-memory-prompt.ts` 降到 900 行以下，最终只负责向 prompt 编排 Memory OS artifact。
- replay benchmark 必须覆盖 7d / 30d / 90d / 180d / wrong-thread / similar-task / relationship-repair / knowledge-conflict。
- `recall@3`、`precision@3`、`wrong_thread_rate`、`unsupported_specificity_rate` 必须进入 release gate。

### 3. Visible Reply Realization Engine

建立单一可见回复实现引擎，替代分散在多个模块里的表面治理。

建议目录：

```text
apps/stage-tamagotchi/src/main/services/alicization/visible-reply/
```

职责：

- 接收 Turn OS、Memory OS、response charter、truth discipline、persona / affect artifact。
- 只允许两种正常输出 authority：`llm-mind`、`llm-second-pass-rewrite`。
- 任何本地 deterministic fallback 只能返回 non-human authored status，不得生成陪伴式、回忆式、拟人化正文。
- 二次改写失败时进入 hold / retry / ask-resend / explicit-unavailable lane，而不是继续本地编拟人回复。
- 统一处理 shell ban、template leakage、unsupported specificity firewall、hypothesis labeling。

核心 artifact：

```ts
interface VisibleReplyRealizationArtifact {
  expectedAuthority: 'llm-mind' | 'llm-second-pass-rewrite'
  actualAuthority: 'llm-mind' | 'llm-second-pass-rewrite' | 'local-deterministic-fallback'
  providerMindExecuted: boolean
  visibleText: string | null
  nonHumanAuthoredStatus: string | null
  surfaceContract: ResponseSurfaceContract
  truthDiscipline: TruthDiscipline
  rewriteAudit: RewriteAudit | null
  blockedReasons: string[]
}
```

必须迁入：

- `main-chat-visible-reply-execution.ts`
- `main-chat-second-pass-rewrite.ts`
- `main-chat-runtime-surface.ts`
- `response-surface-contract.ts`
- `response-charter.ts`
- `main-chat-timeout-fallback.ts`
- `main-chat-required-tool-recovery.ts`
- `main-chat-active-dialogue-loop.ts` 中可见回复兜底段
- `main-chat-background-run.ts` 中 reply selection / rewrite / fallback 段

验收：

- 普通对话、主动提醒、执行回调、timeout、required tool recovery 共用同一 realization engine。
- normal structured payload 中 `visibleReplyAuthority` 不出现 legacy / infra authority。
- 本地 fallback 不再产出“我记得 / 我会 / 我懂你 / 我在”这类拟人正文。
- replay template leakage gate 为 0。

### 4. Self Evolution OS

现有 learning 仍偏 task executor，需要升级为统一自我演化闭环。

建议目录：

```text
apps/stage-tamagotchi/src/main/services/alicization/self-evolution/
```

一个 learning outcome 必须能传播到：

- autobiographical self
- relationship model
- memory policy
- retrieval tuning
- response posture
- proactive policy
- world model validation

核心 artifact：

```ts
interface SelfRevisionEvent {
  id: string
  sourceTurnId: string
  decisionTraceId: string
  domain: 'relationship' | 'self-model' | 'memory-policy' | 'world-model' | 'dialogue-style' | 'proactive-policy'
  evidence: LearningEvidenceSnapshot
  proposedRevision: unknown
  verifier: LearningVerifierResult
  appliedTargets: string[]
  rollbackPlan: string[]
}
```

迁移原则：

- `learning-executor-orchestrator.ts` 只做 task lifecycle，不负责决定所有下游影响。
- `runtime-learning-governor.ts` 不只 schedule；它应变成 Turn OS 的 learning settlement 阶段。
- `autobiographical-self.ts` 拆成 projection、revision、cadence、preference drift 四类 reducer。
- learning telemetry 只能作为 feedback；真实状态变更必须落 self revision ledger。

验收：

- 每个 completed / blocked / revised learning task 都生成 self revision event。
- policy feedback 影响下一轮 retrieval，同时影响 reply posture 和 proactive cadence。
- world-model 学习不能直接内化未经验证的新知识。
- 用户纠正必须能触发旧信念降权、撤回或重解释。

### 5. Proactive Mind Partition

主动/潜意识路径需要拆成“控制决策”和“可见话语”两层。

控制决策可以本地 deterministic：

- 是否该打断。
- 是否该延迟。
- 是否该发提醒。
- 是否该重试。
- 是否该执行工具。

可见话语必须 mind-authored：

- 主动关心正文。
- 提醒表达。
- 任务完成回调。
- 关系修复。
- 记忆外显。

必须改造：

- `runtime-subconscious-tick.ts`
- `runtime-delivery-reminders.ts`
- `main-chat-background-run.ts`
- `execution-delivery-surface.ts`

验收：

- deterministic proactive proposal 只能作为 control payload。
- visible proactive utterance 进入 Visible Reply Realization Engine。
- provider 不可用时，主动话语应 requeue / hold，不生成本地拟人文本。

### 6. Replay-Gated Release System

开发完成标准必须从“测试通过”升级为“replay gate 通过”。

必须建立这些 release gate：

- memory recall gate：`recall@3 >= 0.85`
- memory precision gate：`precision@3 >= 0.82`
- wrong-thread gate：`wrong_thread_rate = 0`
- unsupported specificity gate：`unsupported_specificity_rate = 0`
- template leakage gate：`template_leakage = 0`
- authority leak gate：`normal_visible_authority_leak = 0`
- latency gate：`p95_realtime_turn <= target`
- second-pass rate gate：二次改写率不应长期过高，否则说明一阶段心智 prompt / contract 不稳。
- local fallback visible text gate：正常对话本地拟人文本为 0。
- learning closure gate：learning outcome 进入 self revision ledger 的比例为 1.0。

必须扩展：

- `replay-benchmark-runtime.ts`
- `main-chat-session-replay-harness.ts`
- `mind_turn_events`
- nightly replay benchmark

验收：

- 每次大重构都能用同一 replay pack 回放。
- 每个 replay failure 都能定位到 Turn OS stage。
- replay report 给出 first failing stage，而不是只给最终质量分。

## 一次性开发顺序

### Step 1：冻结现状并建安全网

- 保留 Phase 14 所有 regression tests。
- 新增 architecture acceptance tests，只校验 trace shape 和 authority invariants。
- 给当前 replay benchmark 增加 final gate 字段，但先不强制失败。

完成标志：

- 现有测试全绿。
- replay report 已能输出最终目标指标，即使部分为 warning。

### Step 2：抽 Turn OS contract

- 新增 `turn-os/` types 和 orchestrator。
- 先让旧 runtime 调用 Turn OS wrapper，不立刻搬完逻辑。
- 所有 governed turn 产出 `AlicizationTurnGraph`。

完成标志：

- `decisionTraceId` 贯穿所有 stage。
- runtime persistence 写入 turn graph summary。
- replay harness 能读取 turn graph。

### Step 3：抽 Visible Reply Realization Engine

- 先迁入 authority normalization、execution tracking、second pass、fallback classification。
- 删除普通路径上分散的 visible reply fallback 写法。
- timeout / tool recovery / active dialogue / background delivery 全部走同一 engine。

完成标志：

- 没有正常路径直接写 deterministic 拟人正文。
- 失败路径只返回 status / hold / retry / clarify。

### Step 4：抽 Memory OS

- 从 `runtime-organic-memory-prompt.ts` 拆出 recall intent、candidate retrieval、candidate ranking、deliberation、speech posture。
- Memory OS 输出 artifact，prompt builder 只消费 artifact。
- 记忆外显不提供固定句，只提供 posture 和 constraints，由心智最终组织语言。

完成标志：

- `runtime-organic-memory-prompt.ts` 降到 900 行以下。
- replay memory gates 纳入强制。
- per-turn policy snapshot 全链路只生成一次。

### Step 5：抽 Self Evolution OS

- 建 self revision ledger。
- learning task finalize 后生成 revision event。
- 将 policy feedback、autobiographical self、relationship outcome、proactive policy 通过同一 event bus 更新。

完成标志：

- 用户纠正可以追踪到旧信念变更。
- 学习失败 / blocked 不会被误内化。
- 下一轮 retrieval 和 surface posture 都能看到 revision effect。

### Step 6：重构 proactive / subconscious

- 把 deterministic 决策保留在 control lane。
- 把所有可见主动话语接入 Visible Reply Realization Engine。
- provider 不可用时 requeue / hold。

完成标志：

- 主动提醒、执行回调、潜意识关心没有本地拟人 fallback。
- 主动行为仍能在无 provider 时安全延迟，不污染对话表面。

### Step 7：Replay gate 强制上线

- 将 final gates 从 warning 改为 fail。
- CI 或本地 ship 流程必须跑 targeted replay pack。
- 所有 failure 输出 first failing stage。

完成标志：

- replay benchmark gate 通过才允许认为完成。
- `pnpm -F @proj-alicization/stage-tamagotchi typecheck` 和 targeted replay tests 必须通过。

## 最终验收清单

- [ ] 正常可见回复 authority 只来自 `llm-mind | llm-second-pass-rewrite`。
- [ ] 本地 deterministic fallback 不生成拟人对话正文。
- [ ] 所有 visible reply 经过 Visible Reply Realization Engine。
- [ ] 所有 user turn 都有 Turn OS trace。
- [ ] Memory OS 输出 recall intent、candidate competition、deliberation、speech posture、settlement。
- [ ] 记忆外显由心智最终组织，不由规则模板输出。
- [ ] recall@3 和 precision@3 均进入强制 gate。
- [ ] wrong-thread、unsupported specificity、template leakage 均为 0。
- [ ] learning outcome 进入 self revision ledger。
- [ ] 用户纠正能触发旧信念降权 / 撤回 / 重解释。
- [ ] proactive visible utterance 必须 mind-authored。
- [ ] provider 不可用时，系统 hold / retry / clarify，不假装真人继续说。
- [ ] replay failure 能定位 first failing stage。

## 风险与处理

- 风险：一次性搬太多导致行为回归。
  - 处理：先抽 wrapper 和 artifact，不立即删除旧逻辑；每一步都用 replay gate 对照。

- 风险：Memory OS 拆分后延迟上升。
  - 处理：保留 realtime / deep-recall budget；realtime 只跑必要召回，deep path 可异步补全。

- 风险：完全禁止本地拟人 fallback 后，弱网或 provider 故障时回复变少。
  - 处理：这是正确退化。可见层应明确不可用 / 稍后重试，而不是输出假心智内容。

- 风险：学习自我演化误内化错误知识。
  - 处理：world-model 必须验证；relationship / self-model 可低权重试探，但必须可回滚。

## 推荐最终文件边界

```text
alicization/
  turn-os/
    turn-graph.ts
    turn-orchestrator.ts
    turn-stage-trace.ts
  memory-os/
    recall-intent.ts
    candidate-retrieval.ts
    candidate-competition.ts
    memory-deliberation.ts
    speech-posture.ts
    memory-settlement.ts
  visible-reply/
    realization-engine.ts
    authority.ts
    second-pass.ts
    fallback-classifier.ts
    surface-verifier.ts
  self-evolution/
    self-revision-ledger.ts
    learning-settlement.ts
    autobiographical-revision.ts
    relationship-revision.ts
    policy-feedback-bus.ts
  proactive-mind/
    control-policy.ts
    visible-utterance-request.ts
    retry-hold-policy.ts
  replay/
    final-gates.ts
    stage-failure-attribution.ts
```

## 开发完成定义

只有同时满足以下条件，才可以称为“真人记忆对话闭环完成”：

- 架构上：Turn OS、Memory OS、Visible Reply Realization Engine、Self Evolution OS、Proactive Mind Partition 全部落地。
- 行为上：记忆像人一样选择性回忆、可内隐、可外显、可承认不确定、可被纠正。
- 回复上：没有固定模板壳，没有本地规则伪装心智，没有 unsupported specificity。
- 学习上：新信息经过证据、验证、修订、回滚策略后进入自我系统。
- 质量上：replay gate 对召回率、准确率、错线程、模板泄漏、时延、authority leak 全部强制通过。
