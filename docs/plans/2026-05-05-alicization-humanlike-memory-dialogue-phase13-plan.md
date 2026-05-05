# Alicization 真人记忆对话 Phase 13 开发计划

更新日期：2026-05-05

> 本文件从现在开始是唯一活跃开发计划。
> Phase 12 已完成 replay / telemetry / governor / parity / learning split 基线。
> Phase 13 只处理“剩余正常回复泄漏、权威类型收束、主心智 reducer 深拆、在线策略闭环”。

## 目标

Phase 13 不是继续加规则模板，也不是继续堆 prompt。

Phase 13 要把当前仍然可能绕开主心智链路的出口全部收口，让 Alicization 真正满足下面这条硬定义：

`当前输入 -> 记忆召回/抑制 -> 证据与矛盾仲裁 -> 人格/关系/意识帧整合 -> LLM visible reply / second-pass rewrite -> 回复入账 -> 学习验证/回滚 -> 下一轮召回策略更新`

必须达成：

- 正常 visible reply 只能来自 `llm-mind` 或 `llm-second-pass-rewrite`。
- deterministic visible text 只能存在于 `timeout/auth/provider/transport failure` 这类基础设施失败面。
- follow-up / proactive / inline execution / required-tool recovery 不能再把本地结构化 payload 直接当最终回复发出去。
- 记忆指标不能只停留在 replay 统计，必须开始反哺在线检索 budget / suppression / verification 策略。
- 人格、关系、心智、回忆 shaping 不能继续堆在单个大函数里，必须拆成独立 reducer。

## 不可退让约束

- 不允许新增 deterministic visible reply 模板。
- 不允许把 `governed-repair-fallback` 当成普通回复权威继续透传。
- 不允许 reply layer 用固定开场白、固定陪伴壳、固定“我来直接回答你”壳。
- 任何正常路径如果拿不到可通过治理校验的 mind-authored reply，必须升级到 second-pass 或失败，不能静默本地兜底。
- 主运行时仍是唯一的 mind-turn composition / contract enforcement authority。
- 新增重构必须保留 card-scope、trace、replay、typed parity、测试可回归。

## 当前基线

已完成：

- replay benchmark 已输出 recall / precision / claim / authority / latency 指标。
- browser/main parity 已比较 typed artifact。
- learning executor 已拆出 orchestrator / task effects / domain verifier。
- runtime 已切出第一层 `runtime-turn-composition` / `runtime-memory-governor` / `runtime-learning-governor` / `runtime-reply-authority`。

仍然存在：

- background required-tool / inline execution payoff 仍可能把 deterministic structured reply 发到 visible surface。
- follow-up payoff helper 仍保留 deterministic visible reply 生成能力。
- reply authority 类型仍把正常回复与 infra fallback 混在一个 union 里。
- `main-chat-session-runtime.ts` 仍同时承担 memory deliberation、host person model、conscious frame、answer planner shaping。
- replay gold 仍然高度依赖运行时导出的 organic context，缺独立 gold memory dataset。
- telemetry/tuning advice 还没有形成真正的在线 MemoryPolicyGovernor。

## Phase 13 验收门槛

- `normal_path_deterministic_visible_reply_count = 0`
- `inline_execution_payoff_second_pass_coverage = 1.00`
- `followup_local_visible_reply_count = 0`
- `normal_reply_authority_union_leak = 0`
- `independent_memory_gold_pack_enabled = true`
- `online_memory_policy_governor_enabled = true`
- `reply_authority_accuracy >= 0.95`
- `wrong_thread_suppression >= 0.90`
- `realtime_reply_p95_within_policy = true`

## Wave 1：Normal Reply Authority Closure

- [x] 收口 required-tool / inline execution 正常回复出口

要求：

- `main-chat-background-run.ts` 中 inline execution payoff 若首轮结果不可直接采用，必须进入 second-pass rewrite 或显式失败。
- 只有确认 `main-gateway` 不可达时，才允许 `local-deterministic-fallback`。
- `selectedReply.source !== 'llm'` 不再直接把 deterministic reply 发到 visible surface。

- [x] 封死 follow-up deterministic visible reply helper

要求：

- `main-chat-follow-up-payoff.ts` 不再把本地 payoff 结构化文本当作最终 visible reply 返回。
- 若后续需要复用 follow-up payoff，只能作为 LLM authored recovery 的素材，不得直接可见。

- [x] 增加 authority closure regression tests

至少覆盖：

- inline execution 首轮 reply 被 deterministic repair 时必须进入 second pass
- provider 不可达时才允许 infra-only local fallback
- follow-up payoff helper 不再返回 deterministic final reply

## Wave 2：Authority Contract Split

- [x] 拆分 normal reply authority 与 infra fallback authority

目标：

- normal authority: `llm-mind | llm-second-pass-rewrite`
- infra fallback authority: `local-deterministic-fallback`

要求：

- transport contracts / runtime surface / response surface contract / replay harness 全部更新。
- 正常治理输出类型不能再携带 infra fallback authority。

## Wave 3：Mind Reducer Deep Split

- [x] 从 `main-chat-session-runtime.ts` 深拆 4 个 reducer

目标文件：

- [x] `runtime-host-person-model-reducer.ts`
- [x] `runtime-memory-deliberation-reducer.ts`
- [x] `runtime-conscious-frame-reducer.ts`
- [x] `runtime-answer-planner-reducer.ts`

要求：

- reducer 纯函数化，输入输出 typed。
- 主运行时只保留编排，不再塞大段字符串拼接与混合 shaping 逻辑。

## Wave 4：Independent Gold Memory Pack

- [x] 建独立 gold memory dataset

必须覆盖：

- cross-session autobiographical recall
- relationship shift recall
- wrong-thread negative cases
- stale self-model negative cases
- claim validation contradiction

- [x] replay harness 改为优先读取独立 gold，而不是从 prepared organic context 反推 gold

## Wave 5：Online Memory Policy Governor

- [x] 新增 `memory-policy-governor.ts`

在线输入至少包括：

- replay tuning advice
- memory retrieval telemetry
- budget latency telemetry
- wrong-thread suppression / recall / precision 指标

在线输出至少包括：

- retrieval budget class override
- topK / source weight / cache TTL / verification strictness
- wrong-thread suppression bias
- provenance labeling bias

## Wave 6：Learning Closed Loop Hardening

- [x] learning 从“执行器”升级成状态机

至少拆出：

- [x] candidate extraction state
- [x] verification state
- [x] internalization state
- [x] revalidation state
- [x] rollback / downgrade state

要求：

- relationship / self-model / world-model 分别保留误内化审计。
- 失败和回滚结果必须反哺下一轮 memory policy。

## 当前执行记录

- [x] Phase 12 基线提交完成

evidence: commit `b64bb94a feat: advance alicization replay telemetry and runtime governors`

- [x] Wave 2 authority contract split 完成

evidence:
- `packages/stage-shared/src/alicization-transport-contracts.ts`
- `apps/stage-tamagotchi/src/shared/eventa.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-visible-reply-execution.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/mind-turn-contract.ts`

- [x] Wave 3 reducer deep split 完成

evidence:
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-host-person-model-reducer.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-deliberation-reducer.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-conscious-frame-reducer.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-answer-planner-reducer.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`

- [x] Wave 4 independent gold pack 完成

evidence:
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`

- [x] Wave 5 online memory policy governor 完成

evidence:
- `apps/stage-tamagotchi/src/main/services/alicization/memory-policy-governor.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/memory-accessibility-runtime.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/memory-policy-governor.test.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/memory-accessibility-runtime.test.ts`

- [x] Wave 6 learning closed loop hardening 完成

evidence:
- `apps/stage-tamagotchi/src/main/services/alicization/learning-state-machine.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/learning-executor-orchestrator.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/learning-state-machine.test.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.test.ts`

- [x] Phase 13 核心回归验证完成

evidence:
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-follow-up-payoff.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-visible-reply-execution.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-accessibility-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-policy-governor.test.ts apps/stage-tamagotchi/src/main/services/alicization/learning-state-machine.test.ts apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.test.ts`
- `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

notice:
- 根级 lint 与定向 eslint 都被现有 eslint runtime 依赖问题阻塞：`@masknet/eslint-plugin` 在当前环境解析 `typescript` 失败。
- 根级 lint 同时会扫到无关脏目录 `claude-code-main/`、`N.E.K.O/`，不适合作为本轮 Phase 13 代码质量判断依据。
