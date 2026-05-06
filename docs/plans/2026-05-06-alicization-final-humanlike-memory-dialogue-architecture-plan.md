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
- `self_revision_ledger_write_coverage = 1.00`
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
3. visible reply 表面治理仍分散在多个模块，最终 authority 只有部分集中，没有真正单点实现引擎
4. active dialogue / timeout / callback / proactive 仍存在 deterministic 可见文本兜底出口
5. learning 还主要是 task executor + telemetry feedback，不是统一自我修订系统
6. proactive / subconscious 仍混合 control decision 和 visible utterance
7. replay gate 已有基础，但还不是唯一 ship 门槛

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
- [x] 迁入 `main-chat-visible-reply-execution.ts`
- [ ] 迁入 `main-chat-second-pass-rewrite.ts`
- [ ] 迁入 `main-chat-runtime-surface.ts`
- [ ] 迁入 `response-surface-contract.ts`
- [ ] 迁入 `response-charter.ts`
- [ ] 接管 timeout / required-tool-recovery / active-dialogue / callback / background-run 的 visible reply 选择逻辑
- [ ] 普通路径删除 deterministic 拟人正文 fallback
- [ ] provider 不可用时统一进入 hold / retry / explicit-unavailable lane

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
- [ ] 记忆外显只输出姿态和约束，不输出固定壳句模板

## Wave 4：Self Evolution OS 闭环

- [x] 新增 `self-evolution/` 目录
- [x] 建立 `self revision ledger`
- [x] learning task finalize 后统一生成 `SelfRevisionEvent`
- [ ] 将 learning feedback 从 telemetry-only 扩展为 state-changing bus
- [ ] `autobiographical-self.ts` 拆成 projection / revision / cadence / preference drift reducer
- [ ] relationship model、memory policy、response posture、proactive policy 都能消费同一 revision event
- [ ] 用户纠正可触发旧信念降权、撤回、重解释
- [ ] world-model learning 加强 validate-only / rollback-only lane

## Wave 5：Proactive Mind 分层

- [x] 新增 `proactive-mind/` 目录
- [ ] 把 proactive 控制决策和 visible utterance request 分层
- [ ] deterministic 路径只负责是否打断、是否提醒、是否重试、是否发起工具
- [ ] proactive visible utterance 全部接到 realization engine
- [ ] `runtime-subconscious-tick.ts` 切分 control lane 与 visible lane
- [ ] `runtime-delivery-reminders.ts` 去掉 deterministic 拟人正文出口
- [ ] provider 不可用时主动话语只 requeue / hold，不伪装回复完成

## Wave 6：Replay Gate 最终交付化

- [x] 新增 `replay/` 目录与 final gate reducer
- [x] 把 replay report 从 diagnostics 升级为 ship gate
- [x] `replay-benchmark-runtime.ts` 输出 final gate 结果
- [x] `main-chat-session-replay-harness.ts` 输出 first failing stage
- [ ] 增补 7d / 30d / 90d / 180d / wrong-thread / similar-task / relationship-repair / knowledge-conflict / delayed-recollection / template-shell-fishing benchmark pack
- [x] 增补 visible reply authority leak gate
- [x] 增补 local visible fallback gate
- [x] 增补 learning outcome -> self revision gate
- [ ] nightly replay benchmark 和 sampled replay backlog 使用同一 final standards

## Wave 7：复杂度压降与边界收尾

- [ ] `runtime.ts` 压到 2500 行以下
- [ ] `runtime-governance.ts` 压到 1400 行以下
- [ ] `runtime-organic-memory-prompt.ts` 压到 900 行以下
- [ ] `main-chat-active-dialogue-loop.ts` 压到 1200 行以下
- [ ] `main-chat-background-run.ts` 压到 900 行以下
- [ ] 删除旧 fallback lane 的重复分支与兼容残留
- [ ] 删除分散的 prompt authority / surface authority / memory authority 重算点
- [ ] 确保同一字段只在一个阶段首次决策，其他阶段只 refine / annotate

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
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-visible-reply-execution.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-second-pass-rewrite.ts`
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
- local deterministic fallback 仍存在 execution metadata 与部分 visible fallback lane
- subconscious / reminder 仍存在 deterministic visible surface 路径
- replay gate 已有基础，但还未成为唯一 ship gate

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

- [ ] 正常可见回复不再存在 deterministic 拟人正文出口
- [ ] 每个 turn 都有统一 turn graph trace
- [ ] Memory OS 已独立运行并决定是否回忆、回忆什么、如何外显
- [ ] visible reply 全部经过 realization engine
- [ ] learning outcome 已进入 self revision ledger
- [ ] proactive visible utterance 已全部改成 mind-authored
- [ ] replay gate 已成为 ship 必经门槛
- [ ] recall / precision / wrong-thread / template leakage / authority leak / unsupported specificity 全部达标
