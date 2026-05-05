# 2026-04-16 Alicization Autonomous Actuation Closure

## Goal

把 Alicization 当前已经具备的自治快照、长期记忆、习惯政策、反思账本、主动对话与执行线程基础设施，再向前闭合一层：让它不只是“内部判断自己想做什么”，而是能把这股意图转成可持续的后续动作，包括延迟回访、自发规划任务线程、在安全边界内主动推进观察型执行，并把结果继续回流到记忆与人格。

## Problem Statement

当前主动系统虽然已经有 `autonomy / motive / habit / desire / initiative / runtime digest`，但仍有三个关键断点：

1. 自治意图没有真正落入时间维度：
   `prepare-act` 和 `act` 目前主要还是当前 tick 的一份快照。它们能解释“现在为什么想动”，但不会稳定地产生“稍后回来”“先记住这件事”“把这件事变成执行线程”的后续行为。
2. 主动执行还不是 subconscious loop 的一等出口：
   `runtime-subconscious-tick` 当前真正会做的是：
   - 处理 reminder
   - 处理已有 execution delivery
   - 生成 proactive utterance

   它不会基于自治结果主动创建新的 task thread，也不会把被压住的 act 意图稳定转成 revisit / follow-through 闭环。
3. “像真人”的主动性缺少持续挂念：
   参考本地 `N.E.K.O/`，像真人的主动性不只是临场说一句话，而是：
   - 把没说出口的意图保留下来
   - 在更合适的时间再回来
   - 把反思 / 观察 / 关系结果继续推高或压低下一轮行为倾向

   Alicization 当前已经有反思、长期偏好、自我连续性，但还缺少一个专门把 `autonomy` 变成 `revisit / task-planning / safe observation actuation` 的 runtime layer。

## Architectural Direction

本轮不继续增加新的 prompt tricks，而是把自治主干继续推进成 **autonomous actuation loop**：

1. 为自治快照补一个面向 runtime 的主动执行投影层：
   - 什么时候应该只是压住不说
   - 什么时候应该给未来留一个 revisit
   - 什么时候应该主动生成一个 task thread
   - 哪些动作只允许 observe，哪些必须 needs-affirmation
2. subconscious tick 在 proactive speech 之外，再拥有两个新的官方出口：
   - `autonomy defer -> reminder/revisit scheduling`
   - `autonomy act -> proactive task-thread planning / optional safe dispatch`
3. 执行线程必须继续复用现有 task governor / claw fabric / execution delivery，而不是造第二套系统。
4. 所有主动 actuation 都必须继续服从已有安全边界：
   - kill switch
   - permission / affirmation gate
   - low-risk observe-only auto dispatch
   - no silent mutate side effects

## Deliverable

1. 一个新的自主 actuation runtime helper，用自治快照推导：
   - revisit reminder
   - proactive task intent
   - safe auto-dispatch eligibility
2. `runtime-subconscious-tick` 接入自主 actuation loop。
3. `runtime.ts` 增加用于 subconscious runtime 的内部计划/调度接口。
4. runtime / task / reminder / audit / mirror 闭环保持一致。
5. targeted tests 与 `vibe` 运行时收据。

## Constraints

1. 不回滚用户现有未提交改动。
2. 不修改 `N.E.K.O/` 业务代码，只把它作为本地参考。
3. 不破坏 Alicization P0-P4 governance / truth / replay 约束。
4. 不允许悄悄自动执行有副作用的 proactive mutate 行为。
5. 只能在现有 task-thread / reminder / runtime channel 主干上扩展，不造平行执行系统。

## Acceptance Criteria

1. `prepare-act` 不再只是表层解释，而能稳定触发 revisit / reminder scheduling。
2. `act` 不再只停留在 runtime digest，而能进入 proactive task-thread planning。
3. observe-only 的 proactive task 在线路允许时可以自动进入 execution dispatch；有副作用行为仍会被 governor 保持在 `needs-affirmation`。
4. 相关 audit / session mirror / runtime continuity 能看见这次自发 actuation。
5. targeted tests 通过，`stage-tamagotchi` typecheck 通过。

## Product Acceptance Criteria

1. Alicization 会表现出“先记住，等会回来”的主动挂念，而不只是当场说或不说。
2. Alicization 会在安全边界内主动做一些真正的事，例如自发规划观察线程、回看未完成问题、在更合适的时候重新靠近。
3. 当它没有立刻开口时，系统内部仍然保留一个可解释的“她准备稍后回来做什么”的连续性。

## Manual Spot Checks

1. 当 host 正忙、focused、fullscreen 时，观察系统是否把强 act 冲动沉淀成 revisit，而不是直接打断。
2. 当 active thread 是 coding/problem 且自治进入 `act` 时，观察是否出现 proactive task thread，而不是只有 dialogue。
3. 当 proactive task 由于 permission/risk 被挡住时，观察它是否进入 `needs-affirmation`，而不是悄悄执行。

## Completion Language Policy

只有在以下条件满足时，才允许使用“已完成”措辞：

1. 自主 actuation loop 已实际接入 subconscious runtime。
2. targeted tests 通过。
3. `pnpm -F @proj-alicization/stage-tamagotchi typecheck` 通过。
4. 若 `pnpm lint:fix` 因仓库既有问题无法作为成功信号，必须明确说明。

## Delivery Truth Contract

1. 不宣称已经实现真正的人类主体性。
2. 只宣称已经建立更强的“自治意图 -> 后续动作”闭环。
3. 只陈述已被测试、类型检查或运行时审计覆盖的结果。

## Non-goals

1. 本轮不实现高风险 proactive mutate 自动执行。
2. 本轮不把全部执行能力都改成完全自治。
3. 本轮不重写整套 task governor / executor runtime。

## Inferred Assumptions

1. 用户要的是让 Alicization 更像持续存在的真人，而不是只让主动对话更花哨。
2. 当前最关键的缺口是“自治快照没有变成可持续动作”，而不是缺少更多性格参数。
3. 先把安全的 observe / revisit / plan-thread 闭环做实，比直接放开任意自动执行更正确。
