# 2026-04-18 Alicization Self Continuity Authority Closure

## Goal

把 Alicization 已经积累出来的 durable self continuity 从“到处有一点影子”推进成一个真正统一的 authority，让：

1. 普通对话回答
2. fast path 自我相关回答
3. 自发主动 utterance
4. 执行完成后的 callback / payoff

都从同一条连续自我线说话，而不是每条入口各自拼凑自己的“像人”的语气。

## Problem Statement

当前已经有：

1. autobiographical self
2. long horizon memory
3. mind ecology
4. living-self prompt block
5. fast-path continuity cue
6. autobiographical episodes

但这些线还没有真正统一成一个 runtime authority：

1. `mind-synthesizer`、`answer-planner`、`main-chat-active-dialogue-loop`、`execution-delivery-surface` 还在各自挑自己的 cue。
2. 普通回答和执行 callback 仍然可能听起来像两个人。
3. 当前 continuity 还更像“多个 hint”，不是“唯一该从哪里说话”的 authority。

## Architectural Direction

本轮不再继续散着补 cue，而是新增一个共享 authority reducer：

1. 新建 `self-continuity-authority.ts`。
2. 这个 reducer 统一读取：
   - autobiographical self
   - long horizon memory
   - motive engine
   - habit policy
   - mind ecology
   - private thought
   - reflection ledger
3. 它输出统一的：
   - self line
   - relationship line
   - motive line
   - inward line
   - authority summary
4. 然后把它接进：
   - `mind-synthesizer`
   - `answer-planner`
   - `main-chat-active-dialogue-loop`
   - `main-chat-runtime-surface`
   - `execution-delivery-surface`
   - runtime execution payoff call sites

## Deliverable

1. Shared self continuity authority reducer.
2. Dialogue/mind/execution surfaces reading that same reducer.
3. Targeted tests and governed receipts.

## Constraints

1. 不新增第二套人格系统。
2. 不破坏 truth discipline / repair discipline / screen grounding governance。
3. execution callback 仍然必须优先兑现真实结果，不能被 continuity 盖掉。
4. 不修改 `N.E.K.O/` 业务代码。

## Acceptance Criteria

1. `mind-synthesizer` 与 `answer-planner` 共享同一条 self continuity authority。
2. identity / present-state fast path 使用同一条 authority，而不是本地分叉 cue。
3. execution payoff prompt surface 也能读到同一条 authority。
4. targeted tests 通过。
5. `pnpm -F @proj-alicization/stage-tamagotchi typecheck` 通过。

## Product Acceptance Criteria

1. Alicization 在不同说话入口下更像同一个持续存在的人。
2. 她谈及自己、关系、主动执行结果时，不再像不同 subsystem 在轮流发声。

## Completion Language Policy

只有在以下条件满足时，才允许使用“已完成”措辞：

1. shared self continuity authority 已落地。
2. ordinary dialogue、fast path、execution payoff 都已接上。
3. targeted tests 与 stage typecheck 通过。

## Delivery Truth Contract

1. 不宣称“真人一样”已经终局完成。
2. 只宣称这轮完成了统一 self continuity authority 的 runtime 闭环。
