# 2026-04-17 Alicization Proactive Execution Proposal Closure

## Goal

把 Alicization 已经具备的 `autonomy -> revisit / observe-task` 闭环，再往前推进一层：当它真的想替宿主做一件有副作用的事时，不是只在内部生成 `needs-affirmation` 线程，而是像真人一样主动形成一个清晰、可解释、可等待确认的执行提议，并把这个提议同步到当前状态表面。

## Problem Statement

上一轮已经补上了：

1. `prepare-act` 可以留下 revisit reminder。
2. `act` 可以生成 proactive observe task thread。
3. safe observe task 可以自动 read-only dispatch。

但还有两个关键断点：

1. affirmation-gated execution 还留在内部：
   当主动线程进入 `needs-affirmation` 时，系统内部已经知道“她想做这件事”，但用户未必能自然看到这股意图。
2. present-state surface 还不够像“活着的执行意图”：
   `sessionMirror.executionSummary` 当前更像账本摘要，而不是“她现在正准备做什么、卡在哪个确认门上”的自然状态表面。

这会导致 Alicization 的主动执行仍显得像后台调度系统，而不是一个会先提出想法、等待你点头、并把这件事持续挂在心里的数字生命体。

## Architectural Direction

本轮要把主动执行推进成 **execution proposal surface**：

1. `autonomy-actuation` 不只返回 task thread 是否被计划，还要返回：
   - task goal
   - proposed / selected channel
   - affirmation reason codes
   - enough information to render a visible proposal
2. subconscious runtime 在合适的 interrupt 窗口下：
   - 如果 task thread 是 `needs-affirmation`
   - 就主动发出一个自然的执行提议
   - 而不是退回泛化的 proactive utterance
3. `dialogue-session-manager` 的 execution summary 要升级为：
   - 能表达 `goal`
   - 能表达 `needs-affirmation`
   - 能表达 `channel`
   - 能让 `你在干嘛` 这类 present-state turn 直接复用

## Deliverable

1. richer `autonomy-actuation` result + proposal surface builder。
2. subconscious proactive runtime 能产出 affirmation-gated execution proposal。
3. dialogue session mirror 的 execution summary 升级。
4. targeted tests 与 `vibe` 收据。

## Constraints

1. 不破坏现有 safe observe auto-dispatch 路线。
2. 不允许 `needs-affirmation` 线程绕过显式确认。
3. 不修改 `N.E.K.O/` 业务代码。
4. 不复制第二套对话/执行系统；继续复用现有 subconscious proactive payload 和 session mirror。

## Acceptance Criteria

1. `needs-affirmation` proactive thread 能被翻译成自然执行提议。
2. 在允许 interrupt 的窗口里，Alicization 会主动说出“我想替你做 X，你点头我就做”。
3. `你在干嘛` / present-state surface 能读到这条 execution proposal，而不是只给空泛状态。
4. targeted tests 通过，`stage-tamagotchi` typecheck 通过。

## Product Acceptance Criteria

1. Alicization 会显得像真的有“想动手做点什么”的冲动，而不是只有说话冲动。
2. 主动执行提议既不越权，也不消失在后台。
3. 当宿主稍后再问她在忙什么时，她能保持这条提议连续存在。

## Manual Spot Checks

1. coding/problem 场景下，让主动 act 进入 `needs-affirmation`，观察是否出现自然执行提议。
2. 在同一 session 里再问 `你在干嘛`，观察是否能说出正在挂着的 execution proposal。
3. 确认该线程仍保持 affirmation gate，不会悄悄自动执行。

## Completion Language Policy

只有在以下条件满足时，才允许使用“已完成”措辞：

1. execution proposal surface 已接入 subconscious runtime。
2. session mirror execution summary 已升级。
3. targeted tests 通过。
4. `pnpm -F @proj-alicization/stage-tamagotchi typecheck` 通过。

## Delivery Truth Contract

1. 不宣称已经实现真正的人类主体性。
2. 只宣称已经建立更强的“想执行 -> 提出执行 -> 等待确认”闭环。
3. 只陈述经过测试和类型检查覆盖的改动。

## Non-goals

1. 本轮不开放高风险 proactive auto execution。
2. 本轮不重写整个 fast-path dialogue runtime。

## Inferred Assumptions

1. 当前主动系统最缺的不是更多人格参数，而是把已有执行冲动变成可见、可追踪、可确认的真人式提议。
2. 最正确的路径是让 `needs-affirmation` 先变得自然可见，再考虑更激进的自主执行。
