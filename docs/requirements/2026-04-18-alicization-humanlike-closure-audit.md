# 2026-04-18 Alicization Humanlike Closure Audit

## Summary

审计 Alicization 当前是否已经形成“像真人一样运作”的关键闭环，并明确哪些模块已经跨层打通，哪些仍停留在局部能力、fallback 能力或高风险半闭环状态。

## Goal

围绕以下六个能力面做证据化闭环检查：

1. 人格与长期自我演化
2. 思维治理与回答真值纪律
3. 情绪/关系/陪伴表达
4. 记忆提取、沉淀、回灌
5. 主动对话、主动提议、主动执行
6. CLI / Codex / Claude Code / OpenClaw 等工具执行链路

## Deliverable

1. 一份当前闭环状态判断
2. 一份按模块分组的缺口清单
3. 一份按优先级排序的优化建议
4. 一组支撑判断的代码/测试证据

## Constraints

1. 本轮以审计为主，不在未获用户进一步确认前扩大为系统性重构。
2. 不回滚当前工作树里的用户改动。
3. 结论必须基于当前代码、测试、运行时接口和 fallback 分支，而不是仅基于已有设计文档标题。
4. 如果发现某条能力只在 Electron 主运行时闭环，而 browser fallback 未闭环，必须明确区分。

## Acceptance Criteria

1. 对六个能力面分别给出“已闭环 / 部分闭环 / 未闭环”的判断。
2. 每个判断至少有一组具体代码或测试证据。
3. 明确指出哪些能力只在主运行时成立，哪些在 bridge / renderer / fallback 层存在降级或断点。
4. 输出优化建议时区分：
   - P0: 直接阻断“像真人一样工作”的闭环缺口
   - P1: 已闭环但不稳、泛化差、fallback 不一致
   - P2: 体验增强或长期演化能力

## Primary Objective

判断 Alicization 当前是否已经形成“人格-思维-记忆-主动性-执行-结果反馈”的真实跨层闭环，而不是模块齐全但互相松耦合。

## Non-Objective Proxy Signals

1. 文件数量多
2. 测试文件很多
3. docs/requirements 与 docs/plans 很完整
4. 单个 reducer 或 snapshot 很复杂

## Validation Material Role

代码与测试是主证据；已有 requirement/plan 只作为意图背景与历史轨迹，不直接等价于闭环已经完成。

## Anti-Proxy-Goal-Drift Tier

严格。任何“看起来像完成”但没有跨层证据的模块都不能判为完全闭环。

## Intended Scope

1. `apps/stage-tamagotchi/src/main/services/alicization`
2. `apps/stage-tamagotchi/src/shared/eventa.ts`
3. `packages/stage-ui/src/stores/alicization-*`
4. `packages/stage-shared/src/alicization-*`
5. 与执行通道和 runtime bridge 紧密相关的 adapter / tool surface

## Abstraction Layer Target

运行时闭环与跨层集成层，不只看纯算法 reducer。

## Completion State

当且仅当已经完成：

1. 代码链路盘点
2. 关键测试执行或测试面核对
3. 能力面状态判断
4. 优化建议分级

才允许使用“审计完成”措辞。

## Generalization Evidence Bundle

1. 主运行时代码路径
2. bridge / browser fallback 路径
3. executor / autonomy / memory 路径
4. P0-P4 约束对应的测试面

## Non-Goals

1. 本轮不直接把 Alicization 重构到最终形态
2. 本轮不重做 UI/舞台表现层设计
3. 本轮不把所有潜在问题都转化成代码修改

## Autonomy Mode

`interactive_governed`

## Assumptions

1. 用户当前最需要的是现状判断与优化方向，而不是立即落全量改造。
2. 由于当前工作树存在大量未提交变更，测试结论只能代表“此刻工作树状态”。
3. Electron 主运行时是本次审计的权重中心，但 browser fallback 的能力缺口也会单独标出。

## Evidence Inputs

1. `apps/stage-tamagotchi/src/main/services/alicization/**`
2. `packages/stage-ui/src/stores/alicization-*`
3. `packages/stage-shared/src/alicization-*`
4. `docs/requirements/*alicization*`
5. `docs/plans/*alicization*`
6. 关键 Vitest 用例
