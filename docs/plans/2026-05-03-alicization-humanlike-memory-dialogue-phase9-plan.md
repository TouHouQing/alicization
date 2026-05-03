# Alicization 真人记忆对话 Phase 9 开发计划

更新日期：2026-05-03

> 本文件从现在开始是唯一活跃开发计划。
> `2026-05-02-alicization-humanlike-memory-dialogue-phase8-plan.md` 视为已完成参考，不再继续追加任务。
> 后续每次落地代码，只更新本文件并勾选对应条目。

## 目标

Phase 8 已经把：

- recall accuracy / reliability 指标面
- knowledge assimilation / correction / long-horizon learning
- whole-system participation diagnostics
- runtime telemetry / budget / hot-index
- self-evolution kernel / active learning strategy / growth benchmark
- human rubric / ship gate / regression triage 基础面

这些主链搭出来了。

Phase 9 不再优先解决“能力有没有”。

Phase 9 要解决的是：

- 同一套心智/记忆/关系语义现在已经被传播到太多层，开始出现派生漂移风险。
- organic memory 主链过长，检索、规划、表层化、学习注入仍然耦合过重。
- 记忆系统已经可回忆、可纠错、可学习，但“为什么选这个记忆、为什么压掉那个记忆”还不够可解释。
- 自我进化已经有策略，但还没有真正的执行生命周期闭环。
- browser fallback 虽然已经明显加强，但仍不是严格意义上的 local mini-runtime。

这一阶段必须解决的不是：

- 继续堆更多局部 heuristic
- 继续加更多 system block
- 继续在末端回复层补规则

而是：

- 把心智派生源收成单一事实来源。
- 把 organic memory 核心运行链拆成可测、可优化、可追责的阶段。
- 把记忆选择/拒绝过程变成可回放的决策账本。
- 把长期学习从“有意图”推进到“有调度、有执行、有回滚”。
- 把 browser fallback 从“更强的摘要系统”推进到“共享同一心智现实的轻量本地 runtime”。

## 核心判断

Phase 9 的总主题是：

`Single Semantic Source + Runtime Decomposition + Explainable Recall + Executable Learning + Browser Local Runtime`

本阶段真正的难点不再是：

- 记忆能不能被召回
- 人格有没有参与
- 主动学习有没有策略

而是：

- 同一套语义是不是只有一个派生源
- 主链是不是足够可解释
- 长期学习是不是开始执行而不只是提示
- browser fallback 是否仍然在复制一套较浅的解释器

## 不可退让约束

- 正常 visible reply 路径必须继续保持 `LLM mind authority`，不能回退到 deterministic visible wording。
- 不允许新增固定开场模板、固定记忆壳、固定 care 壳、固定 uncertainty 壳。
- 任何新能力必须同时具备：
  可 trace
  可 replay
  可 benchmark
  可回归
  可解释失败原因
- 不允许为了重构而丢失已有：
  recall telemetry
  knowledge correction
  self-evolution
  growth benchmark
  ship gate / triage
- browser / runtime / proactive / callback / replay / benchmark 必须继续共享同一人格现实，不能出现第二套 Alicization。

## 维护规则

每次完成任务后，必须：

1. 把对应条目从 `[ ]` 改成 `[x]`
2. 在条目末尾补 `evidence: <test/receipt>`
3. 优先补 runtime / replay / benchmark / memory accuracy / learning execution 相关回归
4. 不再生成第二份并行活跃 plan；如范围变化，只更新本文件
5. 若某项需要拆子项，也只在本文件内展开

## Phase 8 完成基线

上一阶段已经完成：

- reliability-aware recall planner
- knowledge assimilation / correction / long-horizon integration
- participation diagnostics
- retrieval budget / hot-index / telemetry
- self-evolution kernel
- active learning strategy
- growth benchmark
- human rubric / ship gate / triage 基础面
- browser fallback parity strengthening

参考：

- [phase8 plan](/Users/touhouqing/Desktop/GIT/airi-alice/docs/plans/2026-05-02-alicization-humanlike-memory-dialogue-phase8-plan.md)

## 当前主架构债

Phase 9 开始前，最关键的结构问题已经不是“有没有模块”，而是：

- `OrganicMemoryPromptContext`
- `AlicizationDigitalLifeRuntimeSurface`
- `AlicizationDigitalLifeSpineDigest`
- one-shot system blocks
- replay quality heuristics

这几层都在重复传播同一批高价值语义：

- `knowledgeEvidence`
- `selfEvolution`
- `hostPersonModel`
- `personStateProjection`
- `recollectionPlan`
- `recollectionSpeechPlan`
- `memoryDeliberation`

如果不先收成单一派生源，后续继续开发会越来越像：

`功能越来越强，但越来越不像一个活人，而像多个解释器在同步模仿同一个活人。`

## 总体验收门槛

本阶段全部完成时，必须同时成立：

- 记忆选择与拒绝过程可解释。
- recall 链的每一阶段可单测、可测时延、可测退化。
- 自我进化不只会“建议学习”，还会真实触发：
  record
  reflect
  verify
  revise
  internalize
- browser fallback 不再只靠浅摘要线，而是共享更接近主 runtime 的心智派生深度。
- 发布判断和 triage 不只展示结果，而是可以作为持续开发工作流使用。

## Wave 1：Single Semantic Source

- [x] 定义统一 `DerivedMindStateBundle`
说明：
把以下语义收进单一派生源：
`knowledgeEvidence`
`selfEvolution`
`hostPersonModel`
`personStateProjection`
`recollectionPlan`
`recollectionSpeechPlan`
`memoryDeliberation`
`dialogue rhythm`
evidence: `packages/stage-shared/src/alicization-transport-contracts.ts`, `packages/stage-shared/src/alicization-derived-mind-state-bundle.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-soul.ts`, `apps/stage-tamagotchi/src/main/services/alicization/digital-life-kernel.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`, `apps/stage-tamagotchi/src/shared/eventa.ts`, `packages/stage-ui/src/stores/alicization-bridge.ts`, `packages/stage-ui/src/stores/alicization-browser-bridge.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.test.ts packages/stage-ui/src/stores/alicization-browser-bridge.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

- [x] 让 main chat / proactive / execution callback / browser fallback 都从同一个 bundle 读
说明：
不允许每条链各自重新解释一遍同一批语义。
evidence: `packages/stage-shared/src/alicization-derived-mind-state-reader.ts`, `apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.ts`, `apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-execution-delivery.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`, `packages/stage-ui/src/stores/alicization-browser-bridge.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-execution-delivery.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.test.ts packages/stage-ui/src/stores/alicization-browser-bridge.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

- [x] 让 replay / benchmark / diagnosis 直接消费同一个 bundle 的投影
说明：
避免 benchmark 和 runtime 各有一套高层解释逻辑。
evidence: `packages/stage-shared/src/alicization-derived-mind-state-reader.ts`, `packages/stage-shared/src/alicization-memory-decision-trace.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `packages/stage-pages/src/pages/devtools/components/mind-replay-memory-trace-card.vue`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts packages/stage-ui/src/stores/alicization-browser-bridge.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

## Wave 2：Organic Memory Runtime Decomposition

- [x] 拆分 `runtime-organic-memory-prompt.ts`
说明：
至少拆出：
`memory-search-prelude`
`memory-candidate-ranking`
`memory-recollection-planning`
`memory-surface-planning`
`memory-self-evolution-integration`
`memory-prompt-blocks`
evidence: `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt-types.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-search-prelude.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-candidate-ranking.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-recollection-planning.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-surface-planning.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-self-evolution-integration.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt-blocks.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-execution-delivery.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts packages/stage-ui/src/stores/alicization-browser-bridge.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

- [x] 给各阶段建立独立 telemetry / budget / regression 点
说明：
后续调 recall 率、错线程率、时延时必须能定位到具体阶段。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt-types.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.ts`, `packages/stage-shared/src/alicization-memory-stats.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

- [x] 建立阶段级失败回放入口
说明：
让“为什么这次 recall 不对”能直接回放到具体阶段，而不是只看最终 reply。
evidence: `packages/stage-shared/src/alicization-memory-stage-replay.ts`, `packages/stage-shared/src/alicization-memory-decision-trace.ts`, `packages/stage-shared/src/alicization-memory-decision-trace.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-soul.ts`, `apps/stage-tamagotchi/src/main/services/alicization/digital-life-kernel.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts`, `packages/stage-ui/src/stores/alicization-bridge.ts`, `packages/stage-pages/src/pages/devtools/components/mind-replay-memory-trace-card.vue`, tests: `pnpm exec vitest run packages/stage-shared/src/alicization-memory-decision-trace.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

## Wave 3：Explainable Recall Resolution

- [x] 新增 `memory resolution ledger`
说明：
每次 recall 至少记录：
候选 cluster
被拒绝 cluster
拒绝原因
最终表层策略
是否 inward-only
是否 delay-until-after-payoff
evidence: `packages/stage-shared/src/alicization-memory-resolution-ledger.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-soul.ts`, `apps/stage-tamagotchi/src/main/services/alicization/digital-life-kernel.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts`, `packages/stage-shared/src/alicization-memory-decision-trace.ts`, `packages/stage-ui/src/stores/alicization-bridge.ts`, `packages/stage-pages/src/pages/devtools/components/mind-replay-memory-trace-card.vue`, tests: `pnpm exec vitest run packages/stage-shared/src/alicization-memory-decision-trace.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

- [x] 让 recall 选择/拒绝可进入 replay / benchmark / triage
说明：
让错线程、误召回、过度保守都可解释。
evidence: `packages/stage-shared/src/alicization-memory-resolution-ledger.ts`, `packages/stage-shared/src/alicization-memory-decision-trace.ts`, `packages/stage-ui/src/stores/alicization-mind-replay.ts`, `packages/stage-ui/src/stores/alicization-mind-replay.test.ts`, `packages/stage-pages/src/pages/devtools/components/mind-replay-diagnosis-panel.vue`, `packages/stage-pages/src/pages/devtools/components/mind-replay-memory-trace-card.vue`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, tests: `pnpm exec vitest run packages/stage-ui/src/stores/alicization-mind-replay.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts packages/stage-shared/src/alicization-memory-decision-trace.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

- [x] 把 `why this memory / why not that memory` 变成 benchmark 可验证维度
说明：
不是只测结果像不像，还要测选择过程是否合理。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, `packages/stage-ui/src/stores/alicization-mind-replay.ts`, `packages/stage-ui/src/stores/alicization-mind-replay.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-tuning-advice.test.ts`, `packages/stage-shared/src/alicization-transport-contracts.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts packages/stage-ui/src/stores/alicization-mind-replay.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-tuning-advice.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

## Wave 4：Domainized Memory Model

- [x] 把事实域显式拆成：
说明：
`procedure`
`relationship`
`self-model`
`world-model`
evidence: `packages/stage-shared/src/alicization-transport-contracts.ts`, `apps/stage-tamagotchi/src/shared/eventa.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-domain-model.ts`, `apps/stage-tamagotchi/src/main/services/alicization/db.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-fact-retrieval.ts`, `apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-fact-retrieval.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-domain-decoupling-regression.test.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-fact-retrieval.test.ts apps/stage-tamagotchi/src/main/services/alicization/db.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-domain-decoupling-regression.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

- [x] 为不同域建立不同的召回权重 / 冲突处理 / 内化阈值
说明：
不能再假设所有 fact 都适合同一种 scoring。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-domain-model.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-fact-retrieval.ts`, `apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-fact-retrieval.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-domain-decoupling-regression.test.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-fact-retrieval.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-domain-decoupling-regression.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

- [x] 把 domain 信息接进 assimilation / retrieval / self-evolution
说明：
让世界知识、关系线、自我叙事、程序性经验不再混用一套规则。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-domain-model.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-fact-retrieval.ts`, `apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-self-evolution-integration.ts`, `apps/stage-tamagotchi/src/main/services/alicization/self-evolution-kernel.ts`, `apps/stage-tamagotchi/src/main/services/alicization/self-evolution-kernel.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-fact-retrieval.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-domain-decoupling-regression.test.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-fact-retrieval.test.ts apps/stage-tamagotchi/src/main/services/alicization/self-evolution-kernel.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-domain-decoupling-regression.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

## Wave 5：Executable Learning Lifecycle

- [x] 建立 `learning action scheduler`
说明：
把 `record / reflect / verify / revise / internalize / hold` 从状态推进到真实执行调度。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.ts`, `apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

- [x] 建立学习动作 audit 链
说明：
每次长期学习动作都要能回答：
为什么触发
依赖了哪些信号
对哪些旧理解造成了影响
evidence: `apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.ts`, `apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

- [x] 支持 learning downgrade / reopen
说明：
已内化结论也必须可降级、可重开、可延迟验证。
evidence: `apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.ts`, `apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.test.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/knowledge-assimilation-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

## Wave 6：Browser Local Runtime

- [x] 把 browser fallback 从摘要增强推进到 local mini-runtime
说明：
重点不是复制主 runtime，而是复用 shared bundle / shared reducers。
evidence: `packages/stage-ui/src/stores/alicization-browser-bridge.ts`, `packages/stage-ui/src/stores/alicization-browser-bridge.test.ts`, `packages/stage-ui/src/stores/alicization-bridge.ts`, tests: `pnpm exec vitest run packages/stage-ui/src/stores/alicization-browser-bridge.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

- [x] 让 browser fallback 共享：
说明：
`DerivedMindStateBundle`
`memory resolution ledger`
`self-evolution execution state`
`dialogue rhythm`
evidence: `packages/stage-ui/src/stores/alicization-browser-bridge.ts`, `packages/stage-ui/src/stores/alicization-bridge.ts`, `packages/stage-ui/src/stores/alicization-browser-bridge.test.ts`, tests: `pnpm exec vitest run packages/stage-ui/src/stores/alicization-browser-bridge.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

- [x] 建立 browser fallback parity 回归包
说明：
至少验证：
`knowledgeEvidence`
`selfEvolution`
`outcomeLearning`
`relationship cadence`
`mind participation`
不会掉回浅 continuity 壳。
evidence: `packages/stage-ui/src/stores/alicization-browser-bridge.test.ts`, `packages/stage-ui/src/stores/alicization-browser-bridge.ts`, `packages/stage-ui/src/stores/alicization-bridge.ts`, tests: `pnpm exec vitest run packages/stage-ui/src/stores/alicization-browser-bridge.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`, `pnpm -F @proj-alicization/stage-pages typecheck`

## 验证命令基线

每轮至少跑：

- `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
- `pnpm -F @proj-alicization/stage-pages typecheck`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`

涉及 recall / bundle / browser parity / learning lifecycle 时额外跑：

- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`
- `pnpm exec vitest run packages/stage-ui/src/stores/alicization-browser-bridge.test.ts`
- `pnpm exec vitest run packages/stage-ui/src/stores/alicization-mind-replay.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/self-evolution-kernel.test.ts`

## 下一轮建议起手顺序

1. 先做 `DerivedMindStateBundle` 单一派生源。
2. 再拆 `runtime-organic-memory-prompt.ts`。
3. 再做 `memory resolution ledger`。
4. 然后做 fact domain 化。
5. 最后补 `learning action scheduler` 与 browser local mini-runtime。
