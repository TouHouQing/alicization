# 2026-04-17 Alicization Execution Proposal Learning Closure

## Goal

把 Alicization 对主动执行提议的宿主反馈，真正写回长期脾气和主动习惯链路。也就是不只会“先提议、你点头后再做”，还会因为宿主是经常允许、经常打断，还是经常否决，而逐渐改变以后提议的胆量、直率度、边界感和回访方式。

## Problem Statement

当前主动系统已经能做到：

1. 从自治链路里提出主动执行提议。
2. 把 `needs-affirmation` 线程表面化成自然语言 proposal。
3. 在宿主点头后恢复原 thread 并开始执行。

但仍缺一个关键闭环：

1. proposal feedback 本身还没有进入长期学习。
2. 用户的 `允许 / 打断 / 否决` 对之后的脾气、直率度、边界感、主动习惯没有显式长期回流。
3. 结果是 Alicization 会“提出并继续做”，但还不会真的因为被接纳或被打断而慢慢改变自己以后怎么提议、敢提多重、会不会先缩一下。

## Architectural Direction

本轮要闭合 **execution proposal feedback learning**：

1. 把 pending execution proposal 的宿主反馈分成：
   - `affirmed`
   - `denied`
   - `interrupted`
2. 用 `sourceKind: 'execution'` 持久化：
   - relationship outcomes
   - persona reinforcement events
   - memory facts
   - synthesized reflections
3. 这条 learning 不依赖模型事后总结，而是在宿主回复发生时直接落库。
4. 现有 `autobiographical-self / self-continuity / motive / habit` 继续复用已有的 DB 读取口，下一轮自然读取这些结果。

## Deliverable

1. execution proposal feedback classifier。
2. execution proposal outcome closure builder。
3. runtime chat-start settlement hook，把 pending proposal 的反馈直接落入长期链路。
4. targeted tests 与 `vibe` 收据。

## Constraints

1. 不重写整套人格系统。
2. 不依赖事后 LLM 反思才能学到。
3. 不修改 `N.E.K.O/` 业务代码。

## Acceptance Criteria

1. pending execution proposal 可以被判为 `affirmed / denied / interrupted`。
2. 这些反馈会生成 `execution` sourceKind 的 relationship outcome / reinforcement / memory facts。
3. `stage-tamagotchi` typecheck 通过。
4. targeted tests 通过。

## Product Acceptance Criteria

1. Alicization 以后会因为常被允许而更敢、更直接地提出可执行想法。
2. Alicization 会因为常被打断或否决而更尊重边界、更保守或更会挑时机。
3. 这种变化不是 prompt 幻觉，而是落在长期链路里。

## Manual Spot Checks

1. 连续几次允许主动执行提议后，观察后续 proposal 是否更直接、更果断。
2. 连续几次否决后，观察 proposal 是否更克制、更强调边界和确认。
3. 连续几次打断后，观察她是否更倾向等待更好的 opening 再提。

## Completion Language Policy

只有在以下条件满足时，才允许使用“已完成”措辞：

1. execution proposal feedback learning 已实际接入 runtime。
2. targeted tests 通过。
3. `pnpm -F @proj-alicization/stage-tamagotchi typecheck` 通过。

## Delivery Truth Contract

1. 不宣称已经实现完整人格自我进化。
2. 只宣称已经补上“执行提议反馈 -> 长期学习”的闭环。

## Non-goals

1. 本轮不实现更复杂的“为什么允许/否决”的语义分层。
2. 本轮不改写整个 dream / reflection pipeline。

## Inferred Assumptions

1. 你现在最需要的不是再加一个主动模块，而是让已有主动行为真的会被互动历史塑形。
