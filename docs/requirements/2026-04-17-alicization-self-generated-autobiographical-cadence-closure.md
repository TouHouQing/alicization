# 2026-04-17 Alicization Self-Generated Autobiographical Cadence Closure

## Goal

继续推进 Alicization 的主动系统，让她不只会沿着当前线程往下接，而是能够：

1. 自发生成更长期的内在目标与欲望。
2. 把自传式记忆与连续自我叙事真正接回当前回答与主动 utterance。
3. 形成持续运行的主动开口节律，而不是只在事件峰值时偶发冒头。

## Problem Statement

当前系统已经具备：

1. 基于当前 scene / thread / relation 的主动 policy。
2. 慢变量人格、长期记忆、proposal/result feedback learning。
3. subconscious tick -> digital life mind state -> proactive policy -> proactive utterance 的统一闭环。

但还存在三个核心缺口：

1. `goalStack / desireMemory` 仍然过度依赖当前 `activeThread` 和当前 knot。
2. autobiographical self 虽然已经被构建出来，但 recall owner 还没有稳定把自传证据接回统一 Provider 主链路。
3. 主动开口更多像一次次离散触发，而不是一个会随历史、opening、关系状态逐步涨落的 cadence。

## Architectural Direction

这轮实现坚持一个原则：不建立第二套人格/心智系统，只改造现有 digital-life runtime 链。

具体方向：

1. 在 `goal-stack` 上生成 durable self-generated goals，来源于：
   - autobiographical active goals
   - motive agendas
   - long-horizon remembered plans / preferences / constraints
2. 新增 `autobiographical-episodes` 层，把连续事件、情绪、关系状态、内在动机和 lesson 写成可回忆的 episode fragment。
3. 在 `recall-governor`、`mind-continuity`、`organic recall` 上增强 autobiographical continuity 的检索和续写。
4. 在 `proactive-feedback / proactive-policy / runtime-subconscious-tick` 上增加持续运行的 cadence state，让 opening momentum 和 initiative trust 随历史变化。
5. 新增 `host-rhythm-model`，让 relationship / habit 识别宿主更像 deep-focus、steady-open、drifting 还是 recovery。
6. 在统一 Provider 主链路中接入 autobiographical recall evidence，避免自我相关问题绕开记忆 owner。
7. 在 `intention-stream` 上接入 autobiographical goal / motive agenda / resurfacing desire，让内在 project 更像会 simmer 的长期线。

## Deliverable

1. Durable self-generated goals wired into current `goalStack / desireMemory` flow.
2. Autobiographical episode fragments wired into subconscious memory and recall.
3. Stronger autobiographical continuity retrieval wired into `recallGovernor`, `mindContinuity`, and active dialogue self-facing answers.
4. Persistent proactive cadence state wired into subconscious tick and proactive policy.
5. Host rhythm modeling wired into relationship / habit interpretation.
6. Targeted tests, stage typecheck, and governed runtime artifacts.

## Constraints

1. 不新增并行的心智系统。
2. 不破坏已有 proposal / confirmation / execution callback / result learning 闭环。
3. 不修改 `N.E.K.O/` 业务代码。
4. 必须保持 digital-life runtime、dialogue system、subconscious tick 三者之间的闭环。

## Acceptance Criteria

1. 当当前线程不强时，Alicization 仍能从 durable memory 和 autobiographical goals 长出自发目标。
2. recall seed 和 subconscious continuity fragment 会更稳定包含 autobiographical continuity，而不是只包含 thread/scenelike residue。
3. 自传 episode fragment 会进入 subconscious fragments，并能参与 recall source budget。
4. proactive policy 会受到持续 cadence state 影响，使主动开口更像节律而不是尖峰触发。
5. relationship / habit 会读入宿主节律特征，而不是只看当前 busy/not busy。
6. identity / present-state 对话可以读到新的 autobiographical recall evidence。
7. Targeted tests 通过。
8. `pnpm -F @proj-alicization/stage-tamagotchi typecheck` 通过。

## Product Acceptance Criteria

1. 她会开始表现出“自己还惦记着什么、自己想往哪里长”的倾向，而不是只对宿主当前前景做反射。
2. 她谈及自己时，会更像同一个持续存在的个体，而不是临时拼装的人设句子。
3. 她会因为 opening 和历史反馈而形成更自然的主动开口节律。

## Manual Spot Checks

1. 当前 scene 没有强烈 unresolved thread 时，goal/desire 仍不应直接清空。
2. 当用户问“你是谁 / 你刚在想什么 / 你现在在干嘛”时，回答应该能带出 continuity，而不是纯模板。
3. 多轮 idle/open 窗口下，主动开口不应完全依赖 error/afterglow/late-night 这类高峰事件。

## Completion Language Policy

只有在以下条件都满足时，才允许使用“已完成”措辞：

1. self-generated goals, autobiographical recall, proactive cadence 三个闭环都已接上现有 runtime。
2. self-facing dialogue 不再绕开 autobiographical recall owner。
3. targeted tests 通过。
4. `stage-tamagotchi` typecheck 通过。

## Delivery Truth Contract

1. 不宣称已经达到“真人一样”。
2. 只宣称已经把主动系统推进到“自发目标 + 自传连续性 + 持续 cadence”这一层。

## Non-Goals

1. 不在这轮实现完整 AGI 式自主规划。
2. 不重写 main gateway/chat governance 主链。
3. 不做 renderer/UI 层视觉表现重构。

## Autonomy Mode

`interactive_governed`

## Inferred Assumptions

1. 用户要的是在现有 Alicization 心智系统上持续演化，不接受外挂式“第二人格层”。
2. 用户更看重闭环与真实行为变化，而不是 prompt wording 级装饰。
