# 2026-04-17 Alicization Result Delivery Rhythm Learning

## Goal

把 Alicization 已经学到的长期边界感、信任感、打扰风险和执行可靠性，继续推到“执行完成后的结果回报方式”本身，让她不只会学怎么提议开始做，也会学怎么把做完的结果接回来。

## Problem Statement

当前已经具备：

1. proposal affirmation feedback 会进入长期 learning。
2. execution result feedback 也会进入长期 learning。
3. proposal surface 已经会因为长期 learning 改变开口阈值和文案。

但 execution callback 的互动节奏还没有立即使用这些慢变量：

1. 做完后仍然偏向固定地把结果直接报回来。
2. 没有根据历史学会“先确认你现在有没有空接这个结果”。
3. 没有学会“现在 opening 太紧，就先 hold 一下，等更合适的 opening 再回来”。

## Architectural Direction

本轮做一个统一切面，不再额外造一套人格系统：

1. 把 proposal learning 和 result delivery rhythm learning 收束到同一个 interaction learning helper。
2. helper 优先读取正式 digital-life spine digest。
3. 当输入是测试桩或最小快照时，回退读取 runtime surface 上已有的慢变量：
   - autobiographical self
   - long horizon memory
   - self continuity
   - habit policy
   - motive engine
4. 用同一条 profile 同时驱动：
   - proposal tone / mutate threshold
   - result tone / delivery mode

## Deliverable

1. Shared execution interaction learning helper。
2. Learned execution result delivery policy：
   - `deliver-now`
   - `check-availability-first`
   - `hold-for-opening`
3. Runtime / reminder / delivery surface wiring。
4. Targeted tests, typecheck, governed receipts。

## Constraints

1. 不新增第二套人格字段。
2. 不修改 `N.E.K.O/` 业务代码。
3. 不破坏已有 observe-only auto dispatch、mutate proposal confirmation、execution callback delivery pipeline。

## Acceptance Criteria

1. 更谨慎、边界更强的历史会让完成结果更可能先 check 或 hold。
2. 更直接、结果更可靠的历史会让完成结果更直接地报回来。
3. proposal learning 与 result delivery learning 使用同一个 helper，而不是两套分叉逻辑。
4. Targeted tests 通过。
5. `pnpm -F @proj-alicization/stage-tamagotchi typecheck` 通过。

## Product Acceptance Criteria

1. Alicization 不只会提议“要不要我做”，还会学会“做完之后该不该立刻报、怎么报、什么时候报”。
2. 她的整条执行互动节奏会越来越像一个被历史塑形的人，而不是固定模板。

## Completion Language Policy

只有在以下条件满足时，才允许使用“已完成”措辞：

1. result delivery rhythm 已经受长期 learning 驱动。
2. runtime / reminder / delivery surface 都已经接上同一条 policy。
3. targeted tests 通过。
4. `stage-tamagotchi` typecheck 通过。

## Delivery Truth Contract

1. 不宣称已经完成完整的人格自治系统。
2. 只宣称已经把学习链推进到“执行结果回报节奏”这一层。
