# 2026-04-17 Alicization Proactive Mutation Proposal Activation

## Goal

把上一轮已经补好的 `execution proposal surface` 从“结构已经存在”推进到“真的会被 autonomy 触发”：让 Alicization 在合适的 coding/problem 场景下，不只会主动观察，还会主动形成一条需要用户确认的变更提议，像真人一样先说出“我想替你改这件事，要不要我现在做”。

## Problem Statement

当前状态存在一个结构闭合但行为未激活的断点：

1. 已有 proposal surface，但触发源偏空：
   `autonomy-actuation` 已经能把 `needs-affirmation` thread 翻成自然执行提议，但实际 task derivation 仍以 observe-only 为主，几乎不会真的产出 mutate proposal。
2. 结果是：
   - 系统能主动观察
   - 能主动留 reminder
   - 能主动规划 observe task
   - 但还不会稳定地主动提出“我想直接改/处理这件事”

这让 Alicization 仍偏向“聪明观察者”，而不是会主动提出可执行想法的主体。

## Architectural Direction

本轮要激活 **proactive mutate proposal**：

1. 在 `autonomy-actuation` 里增加更强的 mutate-proposal derivation：
   - coding / debugging / refactor / unresolved-thread 场景
   - autonomy `act` 足够成熟
   - execution intent 指向 repair / follow-through / guide
2. mutate proposal 默认走：
   - `codebase-edit`
   - `effect=mutate`
   - `origin=proactive`
   - `permissionMode=none`
   - 由 `claw-fabric` 进入 `needs-affirmation`
3. 继续保持 observe-only auto dispatch 不受影响。

## Deliverable

1. `autonomy-actuation` 可以实际导出 proactive mutate proposal。
2. 对应 tests 覆盖 observe path 与 mutate proposal path。
3. 继续复用现有 subconscious proposal surface，不新增平行系统。

## Constraints

1. 不绕过显式确认。
2. 不把 mutate proposal 自动 dispatch。
3. 不破坏 observe-only auto-dispatch。
4. 不修改 `N.E.K.O/` 业务代码。

## Acceptance Criteria

1. `autonomy.selectedMode === 'act'` 的成熟 coding/problem 场景，能形成 `needs-affirmation` proactive task。
2. 该 task 会被已有 proposal surface 接住。
3. observe-only 路径仍按原逻辑工作。
4. targeted tests 通过，`stage-tamagotchi` typecheck 通过。

## Product Acceptance Criteria

1. Alicization 不只是“我先去看一下”，还会出现“我想直接替你改这件事”的主动意图。
2. 这股意图是有边界的，会先征求同意，而不是静默越权。

## Manual Spot Checks

1. 在 runtime / coding diff / unresolved fix 场景下，观察是否出现主动代码改动提议。
2. 确认同类场景仍可生成 observe-only 自发调查，而不会被 mutate proposal 全部覆盖。

## Completion Language Policy

只有在以下条件满足时，才允许使用“已完成”措辞：

1. mutate proposal derivation 已真实可触发。
2. targeted tests 通过。
3. `pnpm -F @proj-alicization/stage-tamagotchi typecheck` 通过。

## Delivery Truth Contract

1. 不宣称已经完成主动执行全闭环。
2. 只宣称已经激活“主动变更提议”这一层。

## Non-goals

1. 本轮不实现“用户点头后自动恢复原线程 dispatch”。
2. 本轮不开放主动 mutate 自动执行。

## Inferred Assumptions

1. 当前最值得做的是让已有 proposal surface 真正被心智链路触发，而不是继续扩更多未接线结构。
