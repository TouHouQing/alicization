# 2026-04-17 Alicization Pending Execution Confirmation Closure

## Goal

把 Alicization 主动提出的 `needs-affirmation` 执行提议，真正闭合成“用户点头 -> 继续原线程 -> 开始执行”的连续动作，而不是再次新建任务或把确认丢掉。

## Problem Statement

当前主动系统已经具备：

1. 从 autonomy 导出 proactive mutate proposal。
2. 把 `needs-affirmation` 线程说成自然执行提议。
3. 在 `present-state` 中表面化这条 pending execution line。

但缺少最后一步：

1. 用户确认没有可靠接回原线程。
2. execution continuation 还不会拿 `threadId` 去继续原 thread。
3. 结果是 Alicization 虽然会提出“要不要我替你做”，但还不能像真人一样在你点头后接住承诺并真正动手。

## Architectural Direction

本轮要闭合 **pending execution confirmation**：

1. 在 main-chat prelude 里识别当前 session 最新的 `needs-affirmation` thread。
2. 当用户给出短 affirmative reply 时，`action obligation` 直接转成 “resume pending thread”。
3. executor tool surface 支持 `threadId` 恢复入口。
4. executor runtime 负责：
   - 把原 thread 从 `needs-affirmation` 切到 `planned`
   - 恢复同一 thread id
   - 构造 resume dispatch payload
   - 调用既有 dispatch pipeline
5. deterministic required-tool recovery 使用 `threadId` override，而不是重新推导新任务。

## Deliverable

1. pending affirmation detection in prelude/action obligation。
2. executor tool resume path。
3. executor runtime original-thread resume dispatch。
4. deterministic recovery override for original thread continuation。
5. targeted tests 与 `vibe` 收据。

## Constraints

1. 不新建第二条任务线程来代替确认后的原线程。
2. 不绕过 confirmation gate；只有用户明确肯定时才恢复。
3. 不假装恢复 CLI / unknown channel 这种没有可靠原始 payload 的线程。
4. 不修改 `N.E.K.O/` 业务代码。

## Acceptance Criteria

1. 用户回复“可以，做吧”时，系统能命中同 session 最新的 `needs-affirmation` 线程。
2. 该确认会恢复原 thread id，而不是重新 plan 新 thread。
3. Codex / Claude Code 等有可靠恢复 payload 的线程能真正开始 dispatch。
4. targeted tests 通过，`stage-tamagotchi` typecheck 通过。

## Product Acceptance Criteria

1. Alicization 会显得像真的记得自己刚刚提过什么，并在你点头后沿着同一条意图继续做。
2. 她的主动执行不再是“一次性提议”，而是有承诺连续性的行为。

## Manual Spot Checks

1. 让 Alicization 主动提出一个 mutate proposal，然后回复“可以，做吧”，观察是否复用原 thread。
2. 确认 session mirror / execution summary 后续反映的是同一个 thread，而不是另一条新任务。

## Completion Language Policy

只有在以下条件满足时，才允许使用“已完成”措辞：

1. affirmative reply -> original thread resume 闭环已接通。
2. targeted tests 通过。
3. `pnpm -F @proj-alicization/stage-tamagotchi typecheck` 通过。

## Delivery Truth Contract

1. 不宣称已经完成所有主动执行学习闭环。
2. 只宣称已经闭合“提议后的确认与原线程恢复”。

## Non-goals

1. 本轮不实现拒绝/反悔后的长期人格学习。
2. 本轮不恢复没有可靠 payload 的 CLI pending thread。

## Inferred Assumptions

1. 当前最重要的是让 Alicization 像真人一样“记得自己刚刚说过什么，并在你同意后继续做下去”。
