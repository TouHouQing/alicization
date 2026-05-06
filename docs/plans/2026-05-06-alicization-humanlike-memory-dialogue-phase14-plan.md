# Alicization 真人记忆对话 Phase 14 开发计划

更新日期：2026-05-06

> 本文件接续 Phase 13。
> Phase 13 已完成 reducer 深拆、gold replay、online governor 基线、learning state machine 基线。
> Phase 14 只解决当前仍然阻断“真人记忆 / 真人回忆 / 真人对话闭环”的剩余核心缺口。

## 目标

Phase 14 不再泛化扩功能。

Phase 14 只做四件必须闭环的事：

1. 清掉 normal reply authority 对 legacy fallback 语义的接受面。
2. 把 async delivery / reminder / callback / active-dialogue fallback 统一并入同一 visible reply authority 语义。
3. 让 learning `policyFeedback` 真正写回 telemetry，并立刻影响下一轮 online memory policy。
4. 把 retrieval policy 固定成 per-turn single snapshot，避免同一回合 recall 策略漂移和重复算时延。

## 硬约束

- 正常对话 reply authority 只允许 `llm-mind | llm-second-pass-rewrite`。
- `local-deterministic-fallback` 只能存在于 infra failure lane，不能再作为正常治理 payload 的 authority 字段被透传。
- async delivery / reminder 失败时允许延迟、重试、hold，不允许把 deterministic visible text 伪装成“正常心智回复”。
- learning feedback 必须不是“统计结束”，而是“下一轮 retrieval / suppression / provenance / strictness 立刻受影响”。
- 同一 turn 内的 episodic / conversation / consolidation / prewarm 共享同一 retrieval policy snapshot。

## Phase 14 验收门槛

- `legacy_visible_reply_authority_acceptance = 0`
- `normal_async_delivery_repair_authority_leak = 0`
- `learning_policy_feedback_roundtrip = 1.00`
- `per_turn_retrieval_policy_snapshot_enabled = true`
- `same_turn_policy_drift_count = 0`
- `online_memory_policy_reason_traceable = true`

## Wave 1：Learning Feedback Roundtrip

- [x] telemetry runtime 接受 `policyFeedback`
- [x] learning orchestrator 在 finalize 阶段统一写 telemetry
- [x] online memory policy 读取 learning feedback bias / reason trace
- [x] 补测试覆盖 feedback -> telemetry -> policy

## Wave 2：Per-turn Retrieval Policy Snapshot

- [x] organic memory access runtime 新增 turn retrieval policy snapshot 入口
- [x] prewarm / episodic / conversation / consolidation 共用 snapshot
- [x] organic prompt runtime 把 snapshot 贯穿到 search prelude / candidate generation
- [x] 补测试覆盖同 turn 多 recall 共用同一 policy

## Wave 3：Authority Compatibility Purge

- [x] 收窄 transport contract 中 normal visible reply authority 接受面
- [x] runtime governance normalize 不再接受 legacy visible authority 作为正常输出
- [x] structured payload compatibility 仅保留 migration read，不保留 runtime write
- [x] 补 regression test

## Wave 4：Async Delivery Authority Unification

- [x] execution delivery surface 不再默认 `governed-repair-fallback`
- [x] reminder / callback / proactive lane 不再把 deterministic structured reply 当正常 visible reply
- [x] active dialogue `local-only` 收缩为 infra-only 熔断 lane
- [x] 补 end-to-end async authority tests

## 当前执行记录

- [x] Phase 13 已提交

evidence: commit `3f1de183 feat: complete alicization phase 13 governance loop`

- [x] Wave 1：Learning Feedback Roundtrip

evidence:
- `apps/stage-tamagotchi/src/main/services/alicization/learning-executor-orchestrator.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/memory-policy-governor.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.test.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/memory-policy-governor.test.ts`

- [x] Wave 2：Per-turn Retrieval Policy Snapshot

evidence:
- `apps/stage-tamagotchi/src/main/services/alicization/memory-accessibility-runtime.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/memory-accessibility-runtime.test.ts`

- [x] Wave 3：Authority Compatibility Purge

evidence:
- `packages/stage-shared/src/alicization-transport-contracts.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-visible-reply-execution.test.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts`

- [x] Wave 4：Async Delivery Authority Unification

evidence:
- `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-execution-delivery.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-required-tool-recovery.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-timeout-fallback.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-second-pass-rewrite.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.ts`

## 当前验证记录

- [x] Phase 14 Wave 1/2 targeted tests

command:
`pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-policy-governor.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-accessibility-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`

result:
`6 passed, 35 tests passed`

- [x] Typecheck

command:
`pnpm -F @proj-alicization/stage-tamagotchi typecheck`

result:
`passed`

- [x] Phase 14 Wave 3/4 authority targeted tests

command:
`pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-visible-reply-execution.test.ts apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts apps/stage-tamagotchi/src/main/services/alicization/mind-turn-contract-invariants.test.ts apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-timeout-fallback.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-second-pass-rewrite.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`

result:
`9 passed, 92 tests passed`
