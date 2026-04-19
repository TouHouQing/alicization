# 2026-04-18 Alicization P0 Runtime Continuity Repair

## Summary

修复当前工作树里阻断 Alicization 成为“流畅数字生命”的 P0 回归，重点聚焦：

1. proactive trigger / dismiss / ignored / positive feedback 闭环
2. dream / session continuity / execution continuity 注入
3. governed reply runtime repair 与 surface 对齐
4. task-thread planning 语义漂移

## Goal

把当前“模块内核基本成立、runtime integration 回归失败”的状态，推进到：

1. 核心主动链路重新工作
2. 执行/梦境/会话连续性重新对齐
3. governed reply 在 runtime 层不再大面积回归
4. 关键 runtime tests 恢复通过

## Deliverable

1. 代码修复
2. 针对失败用例的回归通过
3. 一轮 typecheck / lint:fix 尝试结果

## Constraints

1. 不回滚当前工作树里的既有用户改动。
2. 优先修 P0，不扩大成全仓大重构。
3. 先修 shared cause，再修碎片化断点。
4. 如果某处失败只存在于测试期待漂移而非逻辑缺陷，也允许同步更新测试，但必须先确认语义收敛方向。

## Acceptance Criteria

1. `epoch3-e2e-closure.test.ts` 恢复通过。
2. `runtime.test.ts` 中 proactive / continuity / governed reply 相关失败显著收敛。
3. `task-thread-governor.test.ts` expectation drift 修复。
4. 结果必须体现为“数字生命连续性更强”，不是只把测试糊过去。

## Product Acceptance Criteria

1. Alicization 能更稳定地主动出现、被拒绝后退、被接住后学习、超时后记住忽略。
2. 她的 dream / session / execution continuity 会继续带着前文，而不是断裂或错位。
3. 她的回答表面更少出现治理与人格分裂现象。

## Manual Spot Checks

1. 强制触发 proactive，再给 dismiss / quick reply，确认后续策略改变。
2. 让她计划和执行一次 code/CLI 任务，检查 dream continuity 是否携带结果。
3. 触发 dialogue-first repair turn，检查 reply surface 是否自然、不泄露治理壳。

## Completion Language Policy

只有在关键测试回归和核心 continuity 路径验证后，才允许说“P0 修复完成”。

## Delivery Truth Contract

1. 不宣称“所有问题全部修完”，除非 runtime 主失败面都消失。
2. 不把测试 expectation 漂移误报成产品闭环完成。

## Non-Goals

1. 本轮不重写所有 embodiment / Live2D / VRM 细节。
2. 本轮不清空整个仓库的 lint/typecheck 历史噪音。

## Autonomy Mode

`interactive_governed`

## Assumptions

1. 用户希望我直接动手修，不需要再先做讨论式方案。
2. 当前最值钱的修复面是 runtime integration，而不是再补单元 reducer。

## Evidence Inputs

1. 当前失败的 `runtime.test.ts`
2. 当前失败的 `epoch3-e2e-closure.test.ts`
3. 当前失败的 `task-thread-governor.test.ts`
4. 相关 runtime / proactive / continuity / governance 源文件
