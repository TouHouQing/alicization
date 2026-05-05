# Alicization 真人记忆对话 Phase 12 开发计划

更新日期：2026-05-05

> 本文件从现在开始是唯一活跃开发计划。
> Phase 10 / Phase 11 已经完成基础模块接入；Phase 12 只解决“权威收敛、持久证据、真实评测、主链闭环”。
> 后续 Phase 12 代码落地、回归、勾选、补证据，只更新本文件。

## 目标

Phase 12 的目标不是继续增加 prompt，也不是继续让规则层写得更像人。

Phase 12 要把当前已经存在的记忆、心智、学习、回复模块收束成一条可审计主链：

- 普通 visible reply 只能由 `llm-mind` 或 `llm-second-pass-rewrite` 产生。
- 规则层只能给出约束、证据、冲突、抑制理由、rewrite request，不能接管普通可见回复。
- 记忆召回必须从“候选排名”升级为“情景仲裁”，能解释 selected / rejected / suppressed / delayed / unresolved。
- claim evidence graph 必须从 prompt 临时图升级为 durable ledger，能支撑学习内化、降级、回滚和重验。
- learning executor 必须拆成可测试的小模块，避免验证、写库、telemetry、任务副作用混在同一个函数里。
- browser/main parity 必须比较 typed artifacts，而不是只比较摘要字符串。
- replay benchmark 必须有 gold cases 与 DB-backed causal metrics，持续衡量召回率、准确率、错线程抑制和延迟。

最终判断标准：

`真人记忆对话 = 当前输入 -> 情景候选竞争 -> 证据/矛盾仲裁 -> 心智帧整合 -> LLM 生成/二次重写 -> 回复结果入账 -> 学习/内化/回滚 -> 后续召回可复盘`

## 不可退让约束

- 不允许新增 deterministic visible reply 模板。
- 不允许新增固定回忆 opening、固定陪伴壳、固定不确定性壳。
- 普通对话路径如果发现 reply 污染、unsupported specificity、dialogue shell、memory template leakage，必须进入 LLM second-pass rewrite。
- 只有 provider/auth/transport 失败可以返回最小错误面，并必须标记为 transport failure，不能伪装成 Alicization 的真人心智回复。
- memory / learning / reply authority / benchmark 新机制必须有 trace、test、replay 入口。
- browser fallback 不允许复制一套浅层模拟；必须共享 main runtime reducer/policy 语义。
- 主运行时仍是 mind-turn composition 与 contract enforcement 的唯一权威。

## Phase 11 完成基线

已具备：

- recollection narrative 已去掉固定自然语言 opening，改成结构化心智输入。
- deterministic governed fallback visible override 已推进到 rewrite request。
- second-pass rewrite 已接入 provider one-shot，并会二次验证 rewrite 结果。
- MemorySituationCandidate contract 已存在，并接入 organic memory prompt。
- event graph 已能生成 neighborhood candidate。
- claim evidence graph / VerifiedLearningArtifact 已存在，并接入 learning executor。
- browser/main parity 已比较 memory situation candidate、claim evidence、learning causal chain 摘要。
- replay benchmark 已能读取部分 DB-backed learning telemetry。

仍未完成：

- 部分普通路径仍可能把 `local-deterministic-fallback` 作为预期回复权威。
- MemorySituationCandidate 还缺真正的 suppressed 仲裁，不只是 lost-to rejected。
- claim evidence graph 主要还是即时构造，缺 durable graph/artifact ledger。
- learning executor 职责过重。
- parity 仍是字符串摘要比较，不是 typed artifact 精确比较。
- recall/accuracy 还缺 gold case evaluation harness。

## Phase 12 验收门槛

- `normal_visible_reply_local_fallback_count = 0`
- `second_pass_rewrite_required_paths_covered = 1.00`
- `wrong_thread_suppression >= 0.88`
- `recall_at_3 >= 0.86`
- `precision_at_3 >= 0.82`
- `unsupported_specificity_visible_leak = 0`
- `template_shell_visible_leak = 0`
- `claim_graph_durable_replay_pass = 1.00`
- `learning_artifact_internalization_audit_pass = 1.00`
- `browser_main_typed_parity_pass = 1.00`
- `realtime_reply_p95_latency_within_policy = true`

## Wave 1：Visible Reply Authority Consolidation

- [x] 新增普通回复 authority gate

把普通 runtime surface 中的 `governed-repair-fallback` / `local-deterministic-fallback` 预期权威归一到 `llm-second-pass-rewrite`。

验收：

- mind-turn contract / runtime surface / prepared execution plan 不能把普通回复计划成 `local-fallback`。
- transport failure 的 `local-fallback` 保留，但必须只能从显式 timeout/provider/auth/transport failure 入口产生。

evidence: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-visible-reply-execution.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-visible-reply-execution.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/mind-turn-contract-invariants.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [ ] 增加 authority regression

覆盖：

- legacy runtime surface 试图用 `local-deterministic-fallback`
- governance 试图用 `governed-repair-fallback`
- mind-turn contract 缺失时仍不能落到普通 local fallback
- timeout transport failure 仍可标记为 infra-only local fallback

## Wave 2：Memory Situation Suppression Reducer

- [x] 增加显式 suppressed 仲裁

MemorySituationCandidate 竞争器必须产出真正的 `suppressed`，而不是把所有非赢家都写成 rejected / delayed / unresolved。

必须覆盖：

- relationship arc conflict
- era conflict
- world claim contradiction
- source-provided suppressed candidate
- wrong-thread suppression reason

evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-situation-competition.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-situation-competition.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 增加 wrong-thread suppression tests

测试必须断言：

- `suppressed.length > 0`
- suppressed candidate 保留 `candidateId`
- suppression reason 说明为什么不是当前线程
- selected candidate 不继承 suppressed reason

evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-situation-competition.test.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-situation-competition.test.ts`

## Wave 3：Durable Claim Evidence Ledger

- [ ] 新增 durable claim graph/artifact store

将 claim evidence graph / VerifiedLearningArtifact 写入 DB 或 mind_turn_events typed payload。

必须能按：

- `claimId`
- `artifactId`
- `taskId`
- `decisionTraceId`
- `sourceFactId`

查询。

- [x] 替换 prompt 临时 graph 构造

移除 organic memory prompt 中的 fake task `as any` 构造，改为 typed claim graph builder 或 durable ledger query。

evidence: `apps/stage-tamagotchi/src/main/services/alicization/learning-claim-evidence-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 4：Learning Executor Split

- [ ] 拆出 domain verifiers

目标文件：

- `learning-domain-verifiers.ts`
- `learning-artifact-store.ts`
- `learning-task-effects.ts`
- `learning-executor-orchestrator.ts`

- [ ] 保留 executor 行为回归

现有 `learning-action-executor.test.ts` 必须继续通过，并新增 world-model revalidation、relationship rollback、self-model downgrade 测试。

## Wave 5：Typed Browser/Main Parity

- [ ] typed artifact parity

比较稳定字段：

- candidate id / status / statusReason / suppressionReasons
- claim id / validationState / sourceTrust / revalidation reason
- verified artifact id / status / internalizationStage
- decisionTraceId / turnId / sessionId

- [ ] parity fixture 升级

现有 summary parity 保留为 UI 摘要，但测试必须断言 typed diff。

## Wave 6：Recall/Accuracy Gold Harness

- [ ] 新增 recall gold cases

每个 case 包含：

- latest user text
- memory facts / events / conversations / consolidations
- expected selected candidate ids
- expected suppressed candidate ids
- expected claim validation states
- expected reply authority

- [ ] 输出 recall metrics

至少输出：

- `recallAt1`
- `recallAt3`
- `precisionAt3`
- `wrongThreadSuppression`
- `claimAccuracy`
- `latencyBudgetPass`

## Wave 7：Runtime Size / Boundary Refactor

- [ ] runtime prompt/memory/learning/persistence 分层

优先切出：

- `runtime-turn-composition.ts`
- `runtime-memory-governor.ts`
- `runtime-learning-governor.ts`
- `runtime-reply-authority.ts`

- [ ] 保留 card-scope consistency

任何 runtime chat lifecycle handler 在 touching card data/state 前必须继续处于 `withCardScope(cardId, ...)`。

## 当前执行记录

- [x] Phase 11 及之前修改已提交

evidence: commit `67500991 feat: advance alicization memory dialogue closure`
