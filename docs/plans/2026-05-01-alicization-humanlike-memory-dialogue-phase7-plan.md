# Alicization 真人记忆对话 Phase 7 开发计划

更新日期：2026-05-01

> 本文件从现在开始是唯一活跃开发计划。
> `2026-04-26-alicization-humanlike-memory-dialogue-phase6-plan.md` 视为已完成参考，不再继续追加任务。
> 后续每次落地代码，只更新本文件并勾选对应条目。

## 目标

Phase 7 的重点不是继续“堆更多像人”的功能，而是继续减少语义 authority 的分叉，把“像真人一样记得、回想、说话、成长”收敛成更少但更强的几条主链。

这一阶段必须解决的不是：

- 再加一些 recall rule
- 再加一些 reply patch
- 再加一些 post-hoc 语气修补

而是：

- 让“想起什么”由统一 `recall planner` 决策，而不是由 retrieval ranking + 多层 heuristics 半决定。
- 让 episodic memory 真正升级成一等 `event graph`，不是继续在 row 上堆字段。
- 让 `person-state` 从当前投影升级成可回放的 `evolution log`，能解释人格为什么变了。
- 让 reply 层只消费一条统一 `mind-turn contract`，不再由 planner/compiler/charter/surface 各自再判断一遍。
- 让 benchmark 从“能跑”升级成“能持续监控 drift 并拦截退化”。

最终必须满足：

- 正常可见回复必须仍然只经过大模型心智链生成。
- 记忆召回不能靠固定模板、固定时间规则、固定“我想起了”壳子。
- 同一句用户输入在不同关系阶段、不同任务 continuity、不同 repair 历史下，会想起不同东西，但必须仍然可 replay、可解释。
- 系统必须能稳定回答：
  “为什么这次想起这一段”
  “为什么这次不说”
  “为什么这次只说 stable core”
  “为什么这次像记得几天前的事，而不是只记得最近两轮”
- 长时记忆对话必须在 indirect task continuation 上生效，而不只是对显式回顾问题生效。

## 核心判断

Phase 6 解决的是闭环骨架。
Phase 7 要解决的是：

- 语义决策源太多
- recall authority 还不够单一
- person-state 还偏 current snapshot
- event memory 还不是真正图结构
- eval 还不能长期拦截 drift

所以本阶段的总主题是：

`Authority Unification + Recall Planner + Event Graph + Person-State Evolution + Drift Eval`

## 不可退让约束

- 正常回复路径必须保持 `LLM mind authority`，不能回退到 deterministic visible wording。
- reply 层不允许新增固定模板开场、固定 uncertainty 壳、固定 care 壳、固定 memory 壳。
- retrieval 层只能负责 candidate shaping，不能代替 recall decision。
- 原始经历不能因为性能或清理策略被删除；只能做层级、摘要、索引、缓存，不做“遗忘式裁剪”。
- raw event ledger 与 reconsolidation overlay 必须并存，不能只保改写后的版本。
- browser / runtime / fallback / replay / benchmark 必须继续共享同一人格现实。
- 任何新增 Phase 7 能力都必须：
  可 replay
  可 trace
  可 benchmark
  可 regression

## 维护规则

每次完成任务后，必须：

1. 把对应条目从 `[ ]` 改成 `[x]`
2. 在条目末尾补 `evidence: <test/receipt>`
3. 优先补 runtime / recall planner / event graph / evolution log / benchmark 相关回归
4. 不再生成第二份并行活跃 plan；如范围变化，只更新本文件
5. 若发现某项需要拆出更细子项，也在本文件内展开，不重开旁支清单

## Phase 6 完成基线

上一阶段已经完成：

- 单一 visible reply authority 主链
- memory deliberation kernel / restraint judge / reply authority invariants
- person-state projection / closeness ladder / person-state update surface
- replay benchmark runtime / nightly gate / diagnosis console
- runtime.ts orchestration shell 主体拆分
- db.ts memory domain 子层主体拆分

参考：

- [phase6 plan](/Users/touhouqing/Desktop/GIT/airi-alice/docs/plans/2026-04-26-alicization-humanlike-memory-dialogue-phase6-plan.md)

## 当前架构债

Phase 7 开始前，仍然存在的结构问题：

- retrieval 很强，但最终“想起哪段”还不是真正的单一 planner authority。
- episodic memory 仍然是 graph-like ranking，不是真正的 graph-native storage / query。
- person-state 主要还是 current projection，缺少完整 evolution log 与版本化 replay。
- answer planner / answer compiler / response charter / response surface contract 之间仍有重复判断。
- benchmark 已能跑，但 human rating / drift monitoring / long-run regression gate 还不够产品化。

## 总体验收门槛

本阶段全部完成时，必须同时成立：

- Alicization 可以在不依赖显式日期问题的前提下，针对“继续按之前那样做”“你上次是怎么修这个的”“为什么你这次更谨慎”“几天前我们聊过的那个点”自然回想。
- recall planner 能解释：
  为什么进入 recall
  为什么选中某段
  为什么压住某些段
  为什么先 inward 再 overt
- event graph 能解释：
  这段记忆和哪些人物、任务、修复、关系节点相连
  哪些边来自观察，哪些来自重构
- person-state evolution 能解释：
  哪次事件改变了 trust / closeness / repair posture / burden
  当前 person-state 是如何从历史中演化出来的
- reply 层只消费同一条 `mind-turn contract`，不再多层重复判断
- benchmark 能稳定发现：
  recent-only 漂移
  template leakage
  wrong-thread recall
  repair/closeness drift
  long-horizon continuity 退化

## Wave 1：Recall Planner 单一化

- [x] 抽出单一 `recall-planner` authority
说明：
retrieval 只给 candidate；
最终 recall decision 必须由一处 planner 统一决定。
至少统一产出：
`shouldRecall`
`selectedMemorySet`
`whyThisMemory`
`whyNotOthers`
`surfaceMode`
`stableCore`
`unsafeDetails`
`followUpTiming`
`relationshipMeaning`
`confidence`
`uncertaintyLabel`
evidence: `apps/stage-tamagotchi/src/main/services/alicization/recall-planner.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/recall-planner.test.ts`

- [x] 把 `runtime-organic-memory-prompt / memory-search-retrieval-operators / memory-deliberation-kernel` 改成 planner 上下游
说明：
retrieval operator 只做 candidate generation；
planner 决定 recall；
kernel/speech plan 只消费 planner 结果。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立 indirect recall regression pack
说明：
至少覆盖：
“继续按之前那样做”
“你以前怎么修这个”
“你为什么这次不一样”
“几天前我们聊过那个”
不能退化成 recent-only 或 literal-search。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/recall-planner.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`

## Wave 2：Event Graph 一等公民化

- [x] 正式引入 `event graph` storage/runtime
说明：
至少有：
`event`
`person`
`task-thread`
`repair-arc`
`scene`
`relationship-meaning`
`derived-from`
这类 node / edge。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-event-graph-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/db.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`

- [x] 拆分 raw ledger 与 reconsolidation overlay
说明：
raw ledger 不可丢失；
overlay 允许 confidence / lesson / relationship meaning / affect 改写。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-episodic-reconsolidation-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/db.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-episodic-reconsolidation-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 把 recall / replay / benchmark 改成 graph-aware query surface
说明：
不能只靠 row rank；
必须能从 graph neighborhood 解释 recall 来源。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-episodic-retrieval.ts`, `apps/stage-tamagotchi/src/main/services/alicization/db.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 3：Person-State Evolution Log

- [x] 正式引入 `person-state-evolution-log`
说明：
记录：
`trust shift`
`closeness shift`
`repair posture shift`
`autonomy shift`
`burden shift`
`execution trust shift`
`relationship doctrine shift`
evidence: `apps/stage-tamagotchi/src/main/services/alicization/person-state-evolution-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/person-state-evolution.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-closure.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/person-state-evolution-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-closure.test.ts`

- [x] 让 `person-state-projection` 改由 evolution log + host model + continuity state 生成
说明：
projection 仍然保留，但不能只靠 latest aggregate surface。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/person-state-projection.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/person-state-projection.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 增加 evolution replay/query surface
说明：
至少能回答：
“为什么现在更谨慎”
“哪次修复之后变近了”
“哪段 burden 让主动性收住了”
evidence: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`, `apps/stage-tamagotchi/src/main/services/alicization/person-state-evolution-runtime.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/person-state-evolution-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 4：Mind-Turn Contract 收口

- [x] 把 `answer-planner / answer-compiler / response-charter / response-surface-contract` 收成单一 `mind-turn contract`
说明：
reply 层前的语义 authority 只允许有一条主 contract。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/mind-turn-contract.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-chat-perception-augment.ts`, `apps/stage-tamagotchi/src/main/services/alicization/chat-mind-governance.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/mind-turn-contract.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 将 provider visible realization 改成只消费 contract
说明：
provider 仍然写最终可见文本，但前面只看一条统一 contract，不再多处重复做 relationship/recall 判断。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-visible-reply-execution.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-chat-perception-augment.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/mind-turn-contract.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-visible-reply-execution.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立 contract invariants 回归
说明：
至少锁：
latent contract 唯一
surface guard 唯一
visible realization 仍是 LLM
evidence: `apps/stage-tamagotchi/src/main/services/alicization/mind-turn-contract-invariants.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-visible-reply-execution.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/mind-turn-contract.test.ts apps/stage-tamagotchi/src/main/services/alicization/mind-turn-contract-invariants.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-visible-reply-execution.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 5：长时连续体与评测产品化

- [x] 扩真实长期样本与长期任务迁移集
说明：
加入：
跨天任务
多次 repair arc
长期 companionship drift
多轮 execution callback
长期 burden 积累
evidence: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立 human rating rubric
说明：
至少评：
同一人格感
真实记得感
模板味
关系节律
修复可信度
任务连续感
evidence: `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/shared/eventa.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 做 drift monitoring 与 gate
说明：
持续看：
recent-only drift
template leakage
wrong-thread recall
repair-first drift
closeness ladder drift
event graph recall collapse
evidence: `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/shared/eventa.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-tuning-advice.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-tuning-advice.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 6：运行时优化与可达性

- [x] 做多分辨率记忆可达性
说明：
不是删记忆；
而是：
raw ledger 全保
summary layer 增长
index layer 优化
scenario-dependent expansion
evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-accessibility-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-accessibility-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 做 recall latency budget
说明：
candidate generation
graph expansion
planner
speech plan
benchmark sampling
要支持分级执行和缓存化。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-accessibility-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-accessibility-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 做 proactive prewarm / hot indexing
说明：
对高频 thread、长期任务、敏感关系线提前 consolidation 与 hot indexing。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.test.ts`, `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-accessibility-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## 验证命令基线

每轮至少跑：

- `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
- `pnpm -F @proj-alicization/stage-ui typecheck`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`

涉及 recall planner / event graph / evolution log 时额外跑：

- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-deliberation-regression.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`
- `pnpm exec vitest run packages/stage-ui/src/stores/alicization-mind-replay.test.ts`

## 下一轮建议起手顺序

1. 先做 `recall-planner` 单一化。
2. 再做 `event graph` 原生化。
3. 再做 `person-state evolution log`。
4. 然后收 `mind-turn contract`。
5. 最后把 benchmark/human rating/drift monitoring 产品化。
