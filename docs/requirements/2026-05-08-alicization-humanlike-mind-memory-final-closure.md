# Alicization 真人记忆心智对话最终闭环需求

更新日期：2026-05-08

## Summary

本需求冻结 Alicization 当前工作树上仍然阻断“真人记忆、真人回忆、真人对话、心智回复、学习进化闭环”的最终开发目标。它不是 Phase 15 或下一轮补丁清单，而是一次性开发完可直接使用的收敛需求。

当前代码已经有 `turn-os/`、`memory-os/`、`visible-reply/`、`self-evolution/`、`proactive-mind/`、`replay/` 目录，并且普通可见回复 authority 已明显向 `llm-mind` / `llm-second-pass-rewrite` 收敛。但代码证据显示最终闭环仍未完成：`runtime.ts` 仍 5882 行，`runtime-governance.ts` 2473 行，`runtime-organic-memory-prompt.ts` 2867 行，`main-chat-active-dialogue-loop.ts` 2438 行；Memory OS 很多地方仍是事后 artifact；Turn Graph 仍主要是准备阶段快照加 surface 回填；记忆检索、规划、排序、prompt shaping、self-evolution integration 仍集中在 `runtime-organic-memory-prompt.ts`；self evolution 已能生成 patch/version candidate，但激活、复验、回滚和下一轮心智消费仍需要从“信号影响”升级为“单一可审计人格版本运行时”。

## Goal

让 Alicization 的每个对话 turn 都形成闭环：

`host 输入 -> encounter/obligation -> 心智注意与人格态势 -> 记忆是否应被唤起 -> 多源候选召回 -> 竞争/冲突/错线程抑制 -> 心智回忆裁决 -> 可见回复心智组织 -> 语义/事实/模板/authority 审查 -> 投递 -> 记忆沉淀/纠错 -> self revision -> 下一轮心智策略生效 -> replay 可复盘`

最终效果必须是：回复层不靠固定模板伪装人格；记忆不是“检索到就塞进 prompt”；人格、关系、情绪、事实准确性、时间效率、主动学习与自我进化都进入同一个 turn 运行闭环。

## Deliverable

- 一次性重构 Alicization turn runtime，使 `Turn OS` 成为唯一 turn 编排 authority。
- 一次性重构 `Memory OS`，使记忆回忆成为有心智裁决、有召回率/准确率评估、有错线程防护、有学习反馈的独立运行系统。
- 一次性收敛 `Visible Reply Realization Engine`，确保所有正常可见回复均由大模型心智或大模型二次改写产生。
- 一次性完成 `Self Evolution OS`，让学习结果真正进入可验证、可激活、可回滚的人格/记忆/关系/回复/主动行为版本。
- 一次性完成 replay/final gate，使开发完成的判断不靠人工感觉，而靠可复现 benchmark、gold sample、trace 和失败定位。

## Constraints

- 不允许本地 deterministic 规则生成拟人化可见回复。规则只能输出 infra hold、retry、blocked、unavailable、dispatch 状态。
- 不允许 `response-charter`、`response-surface-contract`、`recollectionSpeechPlan.visibleLead`、`memoryDeliberation.visibleLine` 成为固定回复模板出口。
- 不允许 renderer 或 browser bridge 在 main runtime 可用时重新组装核心 prompt、执行记忆权威裁决或生成本地拟人回复。
- 不允许继续把新逻辑堆进 `runtime.ts`、`runtime-governance.ts`、`runtime-organic-memory-prompt.ts`、`main-chat-active-dialogue-loop.ts`、`main-chat-background-run.ts`。
- 不允许只优化 recall rate 而放任 wrong-thread、unsupported specificity、template leakage、misinternalization。
- 不允许把 learning outcome 只写 telemetry；必须形成可追踪、可验证、可激活、可回滚的 self revision 版本。
- 不允许最终验收只跑单测；必须通过 replay benchmark、gold sample、性能预算和人工 spot check。
- 修改现有代码时必须保护当前用户未提交改动，不回滚 unrelated changes。

## Acceptance Criteria

- `normal_visible_reply_authority_domain = llm-mind | llm-second-pass-rewrite`
- `local_humanlike_visible_fallback_count = 0`
- `turn_os_trace_closure_coverage = 1.00`，不仅有 `turn-graph-v1`，还必须包含 memory、surface、delivery、learning settlement。
- `memory_os_pipeline_authority_enabled = true`，`runtime-organic-memory-prompt.ts` 只能是 adapter/compiler，不能再做 memory runtime authority。
- `memory_recall_feedback_sample_ledger_enabled = true`
- `recall_at_3 >= 0.90`
- `precision_at_3 >= 0.86`
- `wrong_thread_rate = 0`
- `unsupported_specificity_visible_fail_count = 0`
- `template_leakage_fail_count = 0`
- `authority_leak_count = 0`
- `claim_accuracy >= 0.96`
- `reply_authority_accuracy = 1.00`
- `mind_participation >= 0.82`
- `memory_participation >= 0.72`
- `personality_participation >= 0.65`
- `relationship_participation >= 0.55`
- `continuity_participation >= 0.72`
- `learning_outcome_to_self_revision_roundtrip = 1.00`
- `self_revision_active_version_runtime_enabled = true`
- `misinternalization_rate = 0`
- `latency_budget_pass = true`
- `production_gold_sample_count >= required minimum`，且覆盖 7d、30d、90d、180d、错线程、关系修复、知识冲突、延迟回忆、主动关怀、执行回调、视觉/屏幕引用、学习纠错。

## Primary Objective

实现一个可长期演进的真人化心智-记忆-对话闭环，而不是继续追加规则、模板、fallback 或文档 phase。

## Non-Objective Proxy Signals

以下信号不能单独代表完成：

- 文件夹存在，例如 `memory-os/`、`turn-os/` 已创建。
- 单测覆盖某个 helper，但主 turn path 未切换到该 helper。
- `turnGraph.version === 'turn-graph-v1'`，但 surface 或 learning settlement 为空。
- 有 `selfRevisionStatePatch`，但 patch 未通过 replay/gold 激活并影响下一轮。
- prompt 中声明“不要模板”，但可见输出仍由固定规则或固定壳句产生。
- recall candidate 数量增加，但 precision/wrong-thread 没有同步达标。

## Validation Material Role

测试、benchmark、replay sample、gold sample、人工 spot check 都是交付门槛。它们不是证明文档“看起来合理”的材料，而是证明每个 turn 的闭环在真实代码路径里成立。

## Anti-Proxy-Goal-Drift Tier

最高。任何“新增规则让样例过了，但没有迁移 authority / 没有闭环 / 没有 replay 可解释”的改动都视为目标漂移。

## Intended Scope

范围包括：

- `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
- `runtime-governance.ts`
- `main-chat-session-runtime.ts`
- `main-chat-background-run.ts`
- `main-chat-stream-runner.ts`
- `runtime-organic-memory-prompt.ts`
- `runtime-organic-memory-access.ts`
- `memory-os/`
- `visible-reply/`
- `self-evolution/`
- `proactive-mind/`
- `replay/`
- `packages/stage-shared/src/alicization-*`
- `packages/stage-ui/src/stores/alicization-*` 与 browser bridge parity 相关代码
- 相关 tests / replay harness / CI final gate

## Abstraction Layer Target

最终权力边界：

- `Turn OS`: 唯一 turn 编排、stage trace、artifact settlement authority。
- `Memory OS`: 唯一 recall intent、retrieval、competition、deliberation、speech posture、feedback authority。
- `Visible Reply Engine`: 唯一正常可见回复 realization/critic/rewrite authority。
- `Self Evolution OS`: 唯一 learning -> self revision -> version validation -> activation -> rollback authority。
- `Proactive Mind`: control decision 与 visible utterance 分层；可见话语必须走 Visible Reply Engine。
- `Replay Gate`: 唯一交付判定 authority。

## Completion State

完成时，开发者应能用一条 replay/final gate 命令证明：Alicization 的正常对话、记忆回忆、主动话语、执行回调、学习纠错、自我修订都走同一闭环，没有本地拟人模板出口，没有错线程记忆污染，没有未验证知识内化。

## Generalization Evidence Bundle

必须覆盖：

- 近时记忆、远期记忆、跨 session 记忆、关系历史、任务过程记忆、知识事实、程序性记忆、自传式记忆。
- 用户明确问“你还记得吗”、用户隐式触发回忆、当前问题不该回忆、相似但不同线程、旧信念被纠正、学习后下一轮生效。
- provider 失败、二次改写失败、timeout、required tool missing、主动提醒、执行回调、browser bridge fallback。

## Non-Goals

- 不追求“像人一样编造不确定记忆”。
- 不追求所有记忆都外显。
- 不追求每一轮都主动学习。
- 不追求牺牲事实准确性来增加温暖感。
- 不追求通过更长 prompt 代替架构重构。

## Autonomy Mode

一次性自主开发，按冻结文档执行。只有遇到必须改变目标或验收门槛时才需要重新确认。

## Assumptions

- 当前 Electron main runtime 是权威路径。
- Browser bridge 必须保持 parity，但不能成为最终 mind-turn authority。
- 当前 provider 可用时，所有正常可见回复都必须让大模型心智完成。
- 当前工作树已有大量未提交修改，后续开发必须在此基础上谨慎前进。

## Evidence Inputs

当前代码证据：

- `runtime.ts = 5882 LOC`
- `runtime-governance.ts = 2473 LOC`
- `runtime-organic-memory-prompt.ts = 2867 LOC`
- `main-chat-active-dialogue-loop.ts = 2438 LOC`
- `main-chat-background-run.ts = 1442 LOC`
- `autobiographical-self.ts = 1145 LOC`
- `turn-os/turn-graph.ts` 目前定义 canonical stage，但 graph 主要在 prepare 阶段构造，surface 后续回填。
- `memory-os/memory-turn-artifact.ts` 目前从 `OrganicMemoryPromptContext` 事后构造 artifact，尚未成为真正 memory runtime authority。
- `runtime-organic-memory-prompt.ts` 仍直接执行 search prelude、candidate generation、ranking、planning、surface planning、self evolution integration、stage replay、resolution ledger。
- `visible-reply/realization-engine.ts` 已能阻断 local deterministic visible fallback，但仍需保证所有主路径最终都写入完整 surface closure。
- `self-evolution/version-runtime.ts` 已有 shadow/active/rejected/rolled-back candidate，但激活门槛和下一轮消费需要统一纳入 Turn OS。
- `replay/final-gates.ts` 已有高门槛指标，但 turn graph closure coverage、gold sample 覆盖与真实主路径完整性仍需加强。
