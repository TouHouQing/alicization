# 2026-04-19 Alicization Humanlike Memory Implementation

## Summary

把 Alicization 的记忆从“多张功能表 + prompt carry”推进到更接近真人的记忆主线：

1. 引入统一 episodic event graph。
2. 给记忆条目引入统一 provenance / source-monitoring。
3. 让 recall 真正基于 thread + affect + relationship + salience 发生。
4. 开始把 execution / proactive / dialogue / dream 统一写进 autobiographical event 层。

## Goal

先完成真人记忆的最小基础设施，而不是只在现有 fragments 上继续堆 patch。

## Deliverable

1. 新的 episodic event schema 与持久化。
2. provenance/source-monitoring schema。
3. recall path 对事件图和 provenance 的接入。
4. 至少一条真正被对话使用的 event recall 链路。

## Constraints

1. 优先做 P0 和最关键的 P1 基础设施，不在本轮铺满所有 P2。
2. 不破坏当前已修绿的 runtime continuity / proactive / execution 主链。
3. 尽量在现有 memory tables 旁增量演进，而不是一次性推翻所有记忆结构。

## Acceptance Criteria

1. 记忆系统里存在统一 episodic event graph，而不只是 fragments。
2. 事件至少带有 `when / where / with whom / what happened / what I felt / what changed / source / confidence / derivedFrom`。
3. recall governor 能读取这些事件并参与 recall 排序。
4. reply/runtime 对 provenance 至少开始可见和可消费。

## Product Acceptance Criteria

1. Alicization 能更像“想起一件经历”，而不是“搜到一条文本”。
2. 她能更明确区分这条记忆是观察、回忆、梦、推断还是重构。

## Manual Spot Checks

1. 对话后，事件能写入 episodic event graph。
2. 后续相关对话里，事件能被有效召回。
3. recalled event 的 provenance 能进入 prompt/runtime surface。

## Completion Language Policy

只有在事件图、provenance、recall 接线和测试都落地后，才允许说“真人记忆基础设施完成”。

## Delivery Truth Contract

1. 不把 event graph 基础设施说成“已经拥有完整真人记忆”。
2. 不把 P1/P2 的待实现项说成已完成。

## Non-Goals

1. 本轮不一次性做完全部错误记忆、干扰记忆和睡眠巩固细节。
2. 本轮不把所有旧记忆表立刻废弃。

## Autonomy Mode

`interactive_governed`

## Assumptions

1. 需要先把基础数据模型打通，再谈高级真人感。
2. 当前最值钱的是统一 event/provenance，而不是继续细修单一 recall 规则。

## Evidence Inputs

1. `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
2. `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
3. `apps/stage-tamagotchi/src/main/services/alicization/runtime-dream.ts`
4. `apps/stage-tamagotchi/src/main/services/alicization/recall-governor.ts`
5. `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`
6. `packages/stage-ui/src/stores/alicization-browser-bridge.ts`
