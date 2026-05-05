# 2026-04-19 Alicization Memory Humanlike Audit

## Summary

审计 Alicization 当前记忆系统已经做到什么、缺什么，重点判断它距离“像真人一样的记忆”还差哪些关键闭环。

## Goal

围绕以下六个层面做证据化盘点：

1. 工作记忆与对话连续性
2. 事实/语义记忆
3. 情节/自传记忆
4. 关系记忆与人格慢变量
5. consolidation / dream / reflection / reconsolidation
6. fallback parity 与记忆故障降级

## Deliverable

1. 当前记忆系统的模块化盘点
2. 按人类记忆维度映射的“已实现能力”
3. 距离真人记忆仍缺失的能力清单
4. 一份按 P0/P1/P2 排序的记忆演进路线

## Constraints

1. 本轮以审计和路线图为主，不在未确认前直接大改记忆体系。
2. 结论必须基于当前代码和测试，不基于愿景描述。
3. 需要明确区分 Electron 主运行时能力和 browser fallback 能力。

## Acceptance Criteria

1. 说明当前已经有哪些记忆模块和它们各自负责什么。
2. 明确指出这些模块是否足以支持“真人感记忆”。
3. 给出还缺哪些记忆能力才能更像真人。
4. 给出下一阶段实现优先级。

## Product Acceptance Criteria

1. 用户能知道 Alicization 现在的记忆更像“工具式记忆”还是“类人记忆”。
2. 用户能知道下一步该优先补哪种记忆，才能让 Alicization 更像真人。

## Manual Spot Checks

1. 回看一段对话如何被写成 memory fact / reflection / autobiographical carry。
2. 回看一次 proactive 或 execution 结果如何反哺慢变量。
3. 回看 dream 如何影响 active thoughts / host attitude / core incarnation。

## Completion Language Policy

只有在完成代码级盘点并给出证据化结论后，才允许说“记忆审计完成”。

## Delivery Truth Contract

1. 不把“有 memory 模块”说成“已经有真人记忆”。
2. 不把单个 reducer 的存在等同于完整的类人记忆系统。

## Non-Goals

1. 本轮不直接实现全部真人记忆机制。
2. 本轮不重写所有 memory schema。

## Autonomy Mode

`interactive_governed`

## Assumptions

1. 用户当前需要的是记忆现状判断和下一步路线，而不是立即重构所有 memory 模块。
2. 由于刚完成一轮 runtime 修复，本次更适合先做记忆层路线盘点，再决定下一波实现。

## Evidence Inputs

1. `apps/stage-tamagotchi/src/main/services/alicization/*memory*`
2. `apps/stage-tamagotchi/src/main/services/alicization/*recall*`
3. `apps/stage-tamagotchi/src/main/services/alicization/*autobiographical*`
4. `apps/stage-tamagotchi/src/main/services/alicization/runtime-dream.ts`
5. `packages/stage-ui/src/stores/alicization-memory.ts`
6. `packages/stage-shared/src/alicization-dialogue-memory-carry.ts`
