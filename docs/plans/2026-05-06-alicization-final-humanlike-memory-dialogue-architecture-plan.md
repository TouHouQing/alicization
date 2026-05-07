# Alicization 最终真人记忆对话架构开发计划

更新日期：2026-05-06

> 本文件替代继续追加 Phase 15、Phase 16、Phase 17 的开发方式。
> 后续开发不再按零碎补丁推进，而是以本文件为一次性收敛目标。
> Phase 14 已完成 authority 清理、async authority 统一、learning policy feedback roundtrip、per-turn retrieval policy snapshot。
> 本文件只解决当前仍然阻断“真人记忆 / 真人回忆 / 真人对话 / 心智闭环 / 学习进化闭环”的最终架构缺口。

## 目标

最终计划不再扩散做新功能名词。

最终计划只做六件必须一次性闭环的事：

1. 建立统一 `Turn OS`，让每个用户 turn 只有一个可回放、可审计、可学习的运行骨架。
2. 建立独立 `Memory OS`，让回忆过程符合真人记忆逻辑，而不是“检索到就塞进回复”。
3. 建立单一 `Visible Reply Realization Engine`，彻底清掉本地 deterministic 拟人正文出口。
4. 建立 `Self Evolution OS`，让 learning outcome 真正回写自我、关系、记忆策略、回复姿态、主动行为。
5. 重构 `Proactive Mind`，把 deterministic 控制决策和 mind-authored 可见话语彻底分层。
6. 把 `Replay Gate` 提升为最终交付门槛，用召回率、准确率、错线程、模板泄漏、authority leak、时延、学习闭环做最终验收。

## 硬约束

- 所有正常可见回复必须来自 `llm-mind | llm-second-pass-rewrite`。
- 本地 deterministic fallback 只能输出 infra status / hold / retry / clarify，不允许输出拟人化正文。
- 记忆必须先过 `是否该回忆 -> 候选竞争 -> 稳定核心 -> 外显姿态 -> 最终语言组织` 五段，而不是直接 prompt 拼接。
- 同一 turn 的 recall / surface / learning settlement 必须共享同一 `decisionTraceId` 与 turn artifact。
- learning outcome 不能只写 telemetry，必须进入可追踪、可回滚的 self revision ledger。
- proactive visible utterance 必须经过大模型心智，不允许 deterministic 提醒正文伪装成人类陪伴回复。
- 发布门槛必须同时覆盖 `recall rate` 与 `precision`，不能只优化召回不约束污染。
- 发布门槛必须覆盖 `wrong-thread = 0`、`template leakage = 0`、`unsupported specificity = 0`、`authority leak = 0`。
- `runtime.ts`、`runtime-governance.ts`、`runtime-organic-memory-prompt.ts` 不能继续作为最终复杂度承载体。
- 所有最终闭环必须可 replay、可 benchmark、可失败定位到 stage。

## 最终验收门槛

- `normal_visible_reply_authority_domain = llm-mind | llm-second-pass-rewrite`
- `local_humanlike_visible_fallback_count = 0`
- `turn_os_trace_coverage = 1.00`
- `memory_os_pipeline_enabled = true`
- `memory_recall_feedback_sample_ledger_enabled = true`
- `self_revision_ledger_write_coverage = 1.00`
- `self_evolution_shadow_version_runtime_enabled = true`
- `visible_reply_semantic_judge_enabled = true`
- `proactive_visible_reply_mind_authored_rate = 1.00`
- `wrong_thread_rate = 0`
- `template_leakage_fail_count = 0`
- `unsupported_specificity_visible_fail_count = 0`
- `normal_visible_reply_authority_leak = 0`
- `recall_at_3 >= 0.85`
- `precision_at_3 >= 0.82`
- `same_turn_policy_drift_count = 0`
- `learning_feedback_to_policy_roundtrip = 1.00`
- `learning_outcome_to_self_revision_roundtrip = 1.00`
- `replay_gate_required_for_ship = true`

## 当前基线

当前系统已经完成的基础闭环：

1. normal visible reply authority 已收窄为 `llm-mind | llm-second-pass-rewrite`
2. legacy / infra authority 已迁出正常治理输出
3. async authority lane 已基本统一
4. learning `policyFeedback` 已写回 telemetry，并影响 online memory policy
5. per-turn retrieval policy snapshot 已上线
6. replay benchmark / mind turn events / decisionTraceId 基础设施已存在

当前系统仍然阻断最终落地的核心问题：

1. `runtime.ts`、`runtime-governance.ts`、`main-chat-background-run.ts` 仍然过度集中，turn 没有真正统一骨架
2. `runtime-organic-memory-prompt.ts` 仍然把 recall planning、candidate retrieval、ranking、speech posture、prompt shaping 混在一起
3. visible reply 表面治理已收敛到 engine / proactive realization / final gate 三个权威点；`response-charter` 与 `response-surface-contract` 仍需后续做文件级迁移，但不再是可见正文出口
4. active dialogue / timeout / callback / proactive 的 deterministic 可见文本兜底已被 blocked artifact / hold / requeue 取代
5. learning 还主要是 task executor + telemetry feedback，不是统一自我修订系统
6. proactive / subconscious 仍需进一步拆文件压行数，但 control decision 与 visible utterance persistence 已通过 `proactive-mind` helper 分层
7. replay gate 已有最终 pack / nightly final standards / shared ship gate / 根级 final gate 命令，并已接入 CI 独立 job

## Wave 1：Turn OS 抽骨架

- [x] 新增 `turn-os/` 目录与核心 contract
- [x] 建立统一 `AlicizationTurnGraph`
- [x] 建立 stage 顺序：`encounter -> conscious-frame -> obligation -> memory -> deliberation -> surface -> delivery -> learning -> telemetry`
- [ ] 让 `runtime.ts` 只保留 service wiring / card scope / scheduler / IPC bridge
- [ ] 让 `main-chat-session-runtime.ts` 只保留 session boundary，不再承载治理拼装
- [ ] `runtime-governance.ts` 改为被 Turn OS 调用的小 reducer 集
- [x] 所有 governed turn 都产出完整 turn graph trace
- [x] replay harness 可直接读取 turn graph

## Wave 2：Visible Reply Realization Engine 单点化

- [x] 新增 `visible-reply/` 目录与 realization engine
- [x] 统一 authority normalization、surface contract、truth discipline、rewrite audit
- [x] 增补 semantic judge artifact：humanlike quality / payoff / memory correctness / affect / persona / specificity
- [x] 删除 `main-chat-visible-reply-execution.ts` 兼容外壳，入口单点收敛到 `visible-reply/facade.ts`
- [x] 迁入 `visible-reply/second-pass-rewrite.ts`
- [ ] 迁入 `main-chat-runtime-surface.ts`
- [x] 迁入 `response-surface-contract.ts`
- [x] 迁入 `response-charter.ts`
- [x] 接管 timeout / required-tool-recovery / active-dialogue / callback / background-run 的 visible reply 选择逻辑
- [x] 普通路径删除 deterministic 拟人正文 fallback
- [x] provider 不可用时统一进入 hold / retry / explicit-unavailable lane

## Wave 3：Memory OS 抽离

- [x] 新增 `memory-os/` 目录与核心 artifact
- [x] 抽离 `recall-intent`
- [x] 抽离 `candidate-retrieval`
- [x] 抽离 `candidate-competition`
- [x] 抽离 `memory-deliberation`
- [x] 抽离 `speech-posture`
- [x] 抽离 `memory-settlement`
- [ ] `runtime-organic-memory-prompt.ts` 降级为 prompt compiler，而不是记忆总运行时
- [x] recall / precision / wrong-thread / unsupported-specificity 指标直接写入 replay gate
- [x] 增补 sample-level recall feedback ledger：expected / retrieved / surfaced / missed / false-positive / wrong-thread
- [x] 记忆外显只输出姿态和约束，不输出固定壳句模板

## Wave 4：Self Evolution OS 闭环

- [x] 新增 `self-evolution/` 目录
- [x] 建立 `self revision ledger`
- [x] learning task finalize 后统一生成 `SelfRevisionEvent`
- [x] 将 learning feedback 从 telemetry-only 扩展为 state-changing bus
- [x] 增补 shadow/active/rejected/rolled-back self evolution version runtime
- [ ] `autobiographical-self.ts` 拆成 projection / revision / cadence / preference drift reducer
- [x] relationship model、memory policy、response posture、proactive policy 都能消费同一 revision event
- [x] 用户纠正可触发旧信念降权、撤回、重解释
- [ ] world-model learning 加强 validate-only / rollback-only lane

## Wave 5：Proactive Mind 分层

- [x] 新增 `proactive-mind/` 目录
- [x] 把 proactive 控制决策和 visible utterance request 分层
- [x] deterministic 路径只负责是否打断、是否提醒、是否重试、是否发起工具
- [x] proactive visible utterance 全部接到 realization engine
- [x] `runtime-subconscious-tick.ts` 切分 control lane 与 visible lane
- [x] `runtime-delivery-reminders.ts` 去掉 deterministic 拟人正文出口
- [x] provider 不可用时主动话语只 requeue / hold，不伪装回复完成

## Wave 6：Replay Gate 最终交付化

- [x] 新增 `replay/` 目录与 final gate reducer
- [x] 把 replay report 从 diagnostics 升级为 ship gate
- [x] `replay-benchmark-runtime.ts` 输出 final gate 结果
- [x] `main-chat-session-replay-harness.ts` 输出 first failing stage
- [x] 增补 7d / 30d / 90d / 180d / wrong-thread / similar-task / relationship-repair / knowledge-conflict / delayed-recollection / template-shell-fishing benchmark pack
- [x] 增补 visible reply authority leak gate
- [x] 增补 local visible fallback gate
- [x] 增补 learning outcome -> self revision gate
- [x] 增补 final gate shared contract：claim/reply authority/latency/participation/misinternalization/sample count
- [x] nightly replay benchmark 和 sampled replay backlog 使用同一 final standards

## Wave 7：复杂度压降与边界收尾

- [ ] `runtime.ts` 压到 2500 行以下
- [ ] `runtime-governance.ts` 压到 1400 行以下
- [ ] `runtime-organic-memory-prompt.ts` 压到 900 行以下
- [ ] `main-chat-active-dialogue-loop.ts` 压到 1200 行以下
- [ ] `main-chat-background-run.ts` 压到 900 行以下
- [ ] 删除旧 fallback lane 的重复分支与兼容残留
- [ ] 删除分散的 prompt authority / surface authority / memory authority 重算点
- [x] 确保同一字段只在一个阶段首次决策，其他阶段只 refine / annotate

## 推荐目录形态

- [x] `apps/stage-tamagotchi/src/main/services/alicization/turn-os/`
- [x] `apps/stage-tamagotchi/src/main/services/alicization/memory-os/`
- [x] `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/`
- [x] `apps/stage-tamagotchi/src/main/services/alicization/self-evolution/`
- [x] `apps/stage-tamagotchi/src/main/services/alicization/proactive-mind/`
- [x] `apps/stage-tamagotchi/src/main/services/alicization/replay/`

## 当前执行记录

- [x] Phase 14 已提交

evidence: commit `c5b900fd feat: complete alicization phase 14 memory authority loop`

- [x] 最终架构计划文档基线已提交

evidence: commit `a5c5ac0a docs: add final alicization humanlike memory architecture plan`

- [x] 当前基线问题已完成代码级复盘

evidence:
- `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/facade.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/second-pass-rewrite.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/learning-executor-orchestrator.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-learning-governor.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/autobiographical-self.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`

## 当前验证记录

- [x] 当前仓库状态已确认

result:
- latest commit: `a5c5ac0a docs: add final alicization humanlike memory architecture plan`
- related feature baseline: `c5b900fd feat: complete alicization phase 14 memory authority loop`

- [x] 当前关键复杂度已确认

result:
- `runtime.ts = 5851 LOC`
- `runtime-governance.ts = 2725 LOC`
- `runtime-organic-memory-prompt.ts = 2790 LOC`
- `main-chat-active-dialogue-loop.ts = 2393 LOC`
- `main-chat-background-run.ts = 1521 LOC`

- [x] 当前 authority / memory / proactive / replay 关键证据已确认

result:
- normal authority contract 已收窄
- main stream visible release now waits for visible-reply closure before emitting user-visible text
- visual grounding one-shot emits only the governed `reply` field, not raw structured JSON
- local deterministic fallback is blocked from normal visible reply persistence and proactive visible utterance persistence
- subconscious reminder / execution callback paths requeue or hold when provider mind text is unavailable
- subconscious reminder / execution callback persisted turns now carry explicit `visibleReplyAuthority=llm-mind` and `replyRealizationMode=provider-mind-required`
- replay gate 已有基础，并覆盖 authority leak / local fallback / self revision / memory closure 指标

- [x] 本轮 visible reply closure / proactive hold-requeue / replay gate 收敛已完成

evidence:
- `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/closure-orchestrator.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/proactive-mind/visible-utterance-policy.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/replay/final-gates.ts`

tests:
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts apps/stage-tamagotchi/src/main/services/alicization/visible-reply/second-pass-rewrite.test.ts apps/stage-tamagotchi/src/main/services/alicization/visible-reply/critic.test.ts apps/stage-tamagotchi/src/main/services/alicization/visible-reply/realization-engine.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/replay/final-gates.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/proactive-mind/visible-utterance-policy.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts`

- [x] 本轮样本级记忆反馈 / 语义评审 / 自我进化版本运行时已完成

evidence:
- `apps/stage-tamagotchi/src/main/services/alicization/memory-os/recall-feedback-runtime.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/semantic-judge.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/self-evolution/version-runtime.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/learning-executor-orchestrator.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts`
- `packages/stage-shared/src/alicization-transport-contracts.ts`

tests:
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-os/recall-feedback-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/visible-reply/semantic-judge.test.ts apps/stage-tamagotchi/src/main/services/alicization/self-evolution/version-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/visible-reply/critic.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay/final-gates.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.test.ts apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.test.ts apps/stage-tamagotchi/src/main/services/alicization/learning-action-scheduler.test.ts apps/stage-tamagotchi/src/main/services/alicization/visible-reply/realization-engine.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/proactive-mind/visible-utterance-policy.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.test.ts apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts`
- `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 本轮 visible reply surface facade / active self-revision policy consumers / final gate boundary 已完成

evidence:
- `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/facade.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-chat-perception-augment.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/response-charter.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/proactive-mind/visible-utterance-policy.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/proactive-mind/visible-utterance-realization.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.ts`
- `package.json`

result:
- runtime chat turn surface compilation now enters `visible-reply/facade` once and returns response charter / executive brief / response surface contract / mind turn contract together
- active self-revision patch now affects memory retrieval, response posture, relationship restraint, proactive interruption policy, and proactive visible utterance persistence
- proactive visible text can still only persist when provider-mind authored, and active self-revision can hold even provider-authored proactive speech when revalidation/restraint is active
- final gate command now includes `visible-reply/facade-boundary.test.ts`

- [x] 本轮 proactive visible realization 单点化 / final replay pack / nightly final standards 已完成

evidence:
- `apps/stage-tamagotchi/src/main/services/alicization/proactive-mind/visible-utterance-realization.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`
- `packages/stage-shared/src/alicization-transport-contracts.ts`
- `packages/stage-ui/src/stores/alicization-mind-replay.ts`
- `packages/stage-pages/src/pages/devtools/components/mind-replay-diagnosis-panel.vue`
- `.github/workflows/ci.yml`

result:
- reminder / execution-callback / subconscious proactive visible utterance persistence now uses one proactive realization helper
- provider-mind empty reply is blocked as `provider-mind-empty-visible-text-*`
- deterministic proactive/autonomy/callback/reminder text cannot persist as humanlike visible speech
- default replay benchmark pack is now `final-humanlike-memory-v1`
- nightly replay benchmark always runs `sampled-humanlike-memory-v1` + `growth-humanlike-memory-v1` + `final-humanlike-memory-v1`
- root final gate command is now `pnpm test:alicization-final-gate`
- CI now runs `Alicization Final Gate`
- devtools replay selector exposes `Final` and `Adversarial`

tests:
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/proactive-mind/visible-utterance-realization.test.ts apps/stage-tamagotchi/src/main/services/alicization/proactive-mind/visible-utterance-policy.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`
- `pnpm -F @proj-alicization/stage-shared typecheck`
- `pnpm -F @proj-alicization/stage-ui typecheck`
- `pnpm -F @proj-alicization/stage-pages typecheck`
- `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
- `pnpm test:alicization-final-gate`

- [x] 本轮 learning finalized event 闭环 / self-evolution telemetry 可观测性 / second-pass visible-reply 收口已完成
- [x] 本轮 runtime structured format lineage / renderer visible reply guard / final replay hard gate 已完成

evidence:
- `apps/stage-tamagotchi/src/main/services/alicization/learning-artifact-store.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/learning-task-effects.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/learning-executor-orchestrator.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/memory-stats-projection.ts`
- `packages/stage-shared/src/alicization-memory-stats.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/second-pass-rewrite.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/runtime-surface-authority.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/facade.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/facade-boundary.test.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-structured-format.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-structured-format.test.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/governance-audit.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/governance-audit.test.ts`
- `apps/stage-tamagotchi/src/renderer/alicization-chat-structured-record.ts`
- `apps/stage-tamagotchi/src/renderer/alicization-chat-structured-record.test.ts`
- `packages/stage-ui/src/stores/alicization-visible-reply-guard.ts`
- `packages/stage-ui/src/stores/alicization-visible-reply-guard.test.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`

result:
- learning execution evidence now appends one finalized `learning-executed` mind-turn event carrying status, lifecycle transition, policy feedback, self revision patch, self evolution version candidate, verification basis, and verified artifact
- self evolution version candidate status now contributes to retrieval telemetry and projected memory stats, exposing shadow/active/rejected/rolled-back and replay-required/replay-passed counts
- second-pass rewrite code has been physically moved under `visible-reply/`, exported through `visible-reply/facade`, and removed from root runtime imports
- main chat runtime surface reply-authority resolution has been extracted into `visible-reply/runtime-surface-authority.ts` so reply authority is no longer recomputed only inside `main-chat-runtime-surface.ts`

tests:
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/learning-artifact-store.test.ts apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-retrieval-telemetry.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/visible-reply/second-pass-rewrite.test.ts apps/stage-tamagotchi/src/main/services/alicization/visible-reply/facade-boundary.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/visible-reply/facade-boundary.test.ts`
- `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 本轮 background execution/recovery rules 模块化 / final gate 覆盖补齐已完成

evidence:
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-rules.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-rules.test.ts`
- `package.json`

result:
- background run 的 executor tool 识别、inline execution receipt、执行结果 surface input、minimal-context timeout recovery、execution-first fast path 已从主运行链路抽到独立规则模块
- inline execution 的 deterministic executor output 仍只作为 provider mind / second-pass rewrite 输入，不成为最终拟人可见正文
- final gate now includes `visible-reply/second-pass-rewrite.test.ts`, `main-chat-background-rules.test.ts`, and `learning-action-executor.test.ts`

tests:
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-rules.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`
- `pnpm test:alicization-final-gate`

- [x] 本轮用户纠正旧信念 revise/supersede/retract 闭环已完成

evidence:
- `apps/stage-tamagotchi/src/main/services/alicization/learning-task-effects.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.test.ts`

result:
- revise learning tasks now treat `conflictTargets` and `supersedeTargets` as explicit old-belief correction targets
- direct correction narratives such as `corrected`, `old belief`, `misread`, `纠正`, `旧理解`, `撤回`, `重解释` can retract supporting old beliefs even before a replacement fact id exists
- correction results write `nextValidationStatus: superseded` through `applyMemoryFactCorrections`, carry `appendSupersedes` when a replacement target exists, and emit finalized `learning-executed` evidence with self revision state patch

tests:
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.test.ts`
- `pnpm test:alicization-final-gate`

- [x] 本轮 visible reply 单点入口 / renderer 本地可见 fallback 阻断已完成

evidence:
- `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/facade.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/facade.test.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/facade-boundary.test.ts`
- `packages/stage-ui/src/stores/chat.ts`
- `packages/stage-ui/src/stores/chat.test.ts`

result:
- root-level `main-chat-visible-reply-execution.ts` compatibility export surface has been deleted; visible reply authority imports now converge through `visible-reply/facade`
- facade boundary now asserts the legacy root compatibility surface does not exist
- renderer-side Alicization user turns now block deterministic/local visible fallback finalization even when the legacy renderer LLM path is used without `streamChat`
- structured-contract failure fallback, non-contract fallback, reminder failure fallback, executor payoff fallback, and failure fallback are blocked from becoming persisted humanlike visible speech in Alicization mode

tests:
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/visible-reply/facade.test.ts apps/stage-tamagotchi/src/main/services/alicization/visible-reply/facade-boundary.test.ts packages/stage-ui/src/stores/chat.test.ts`
- `pnpm test:alicization-final-gate`

## 实施顺序

最终实施顺序固定如下，不建议再改回 phase-by-phase 小补丁模式：

1. 先做 `Wave 1 Turn OS`
2. 再做 `Wave 2 Visible Reply Realization Engine`
3. 再做 `Wave 3 Memory OS`
4. 再做 `Wave 4 Self Evolution OS`
5. 再做 `Wave 5 Proactive Mind`
6. 最后做 `Wave 6 Replay Gate`
7. 全部稳定后做 `Wave 7 Complexity Burn-down`

## 最终完成定义

只有同时满足以下条件，才可以宣称“真人记忆对话架构闭环完成”：

- [x] 正常可见回复不再存在 deterministic 拟人正文出口
- [x] 每个 turn 都有统一 turn graph trace
- [x] Memory OS 已独立运行并决定是否回忆、回忆什么、如何外显
- [x] visible reply 全部经过 realization engine
- [x] learning outcome 已进入 self revision ledger
- [x] proactive visible utterance 已全部改成 mind-authored
- [x] replay gate 已有可执行 final gate 命令、默认 final pack、CI final gate job
- [x] final replay gate 对 recall / precision / wrong-thread / template leakage / authority leak / unsupported specificity / latency / participation / learning misinternalization 缺失指标 fail-closed
- [ ] recall / precision / wrong-thread / template leakage / authority leak / unsupported specificity 仍需以真实生产样本运行 `finalReplayGate.passed=true` 为准
