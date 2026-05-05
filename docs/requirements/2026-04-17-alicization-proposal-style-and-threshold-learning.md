# 2026-04-17 Alicization Proposal Style And Threshold Learning

## Goal

把 Alicization 已经学到的长期脾气、边界感、结果反馈经验，继续前推到下一次主动执行提议本身：不只是在长期链路里“存着”，而是立即影响下一次 proposal 的文案、胆量和开口阈值。

## Problem Statement

当前已经具备：

1. proposal permission feedback 会进入长期学习。
2. execution result feedback 也会进入长期学习。

但 proposal surface 还没有立即使用这些慢变量：

1. mutate proposal 何时触发，仍然过于固定。
2. proposal 文案还没有真正体现“更保守 / 更直接 / 更会挑 opening”的变化。
3. 结果是 Alicization 虽然在学，但下一次提议看起来还不够像一个会被历史塑形的人。

## Architectural Direction

本轮只做一个聚焦切面：

1. 在 `autonomy-actuation` 里建立 proposal learning profile。
2. 这个 profile 直接读取已有慢变量：
   - autobiographical self
   - long horizon memory
   - self continuity
   - habit policy
3. 用它同时驱动：
   - mutate proposal threshold
   - proposal copy tone
   - proof / directness / opening patience

## Deliverable

1. Proposal learning profile。
2. Dynamic mutate threshold based on learned slow variables。
3. Dynamic proposal wording based on learned tone.
4. Targeted tests and governed receipts.

## Constraints

1. 不新增第二套人格字段。
2. 不修改 `N.E.K.O/` 业务代码。
3. 不破坏现有 observe-only / mutate proposal / confirmation / result learning 闭环。

## Acceptance Criteria

1. 学到更谨慎时，mutate proposal 更难触发。
2. 学到更直接时，proposal 文案更果断。
3. Targeted tests 通过。
4. `stage-tamagotchi` typecheck 通过。

## Product Acceptance Criteria

1. Alicization 的主动提议会越来越像“这个人自己的风格”，而不是固定模板。
2. 她会因为结果经验和边界经验不同，而自然变得更冲或更收。

## Completion Language Policy

只有在以下条件满足时，才允许使用“已完成”措辞：

1. proposal 文案与阈值都已经受长期学习信号驱动。
2. targeted tests 通过。
3. `pnpm -F @proj-alicization/stage-tamagotchi typecheck` 通过。

## Delivery Truth Contract

1. 不宣称已经实现完整人格演化。
2. 只宣称已经让 learning 立即投影到 proposal surface。
