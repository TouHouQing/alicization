# 2026-04-17 Alicization Execution Result Feedback Learning

## Goal

把 Alicization 在主动执行提议之后真正落地的执行结果，也并入同一条长期学习链。这样她不只会因为宿主是否允许开始执行而改变，还会因为“结果靠不靠谱、是不是打扰、以后值不值得继续这样提/这样回报”而继续调整自己的提议风格、执行胆量和结果汇报方式。

## Problem Statement

当前已经补上的闭环包括：

1. 主动执行提议可以从 autonomy 里出来。
2. 宿主确认可以接回原 `needs-affirmation` thread 并开始执行。
3. 宿主对 pending proposal 的 `affirmed / denied / interrupted` 能进入长期学习。

但执行完成后的反馈还没有进入长期链路：

1. Alicization 还不会因为“这次结果不靠谱/很有用/太打扰”而长期改变自己。
2. 她只能学到“你愿不愿意让我开始做”，学不到“我做完后这样回报到底好不好”。
3. 这让主动系统仍然缺少真人感里非常关键的一层：根据实际后果调节未来胆量和风格。

## Architectural Direction

本轮做 **execution result feedback learning**：

1. 针对已经完成/回调到对话面的主动执行结果，识别宿主反馈：
   - `valued`：结果被认可、觉得有用、值得这样继续提
   - `doubted`：结果被质疑、不靠谱、做错了
   - `intrusive`：结果/回报方式被认为打扰
   - `interrupted`：宿主直接转向别处，没有接住这次结果
2. 用 `sourceKind: 'execution'` 持久化：
   - relationship outcomes
   - persona reinforcement events
   - memory facts
   - synthesized reflections
3. settlement 仍然发生在 runtime chat-start 前，不依赖事后 LLM 总结。

## Deliverable

1. execution result feedback classifier。
2. execution result feedback outcome closure builder。
3. runtime settlement hook，把最近一次主动执行结果反馈直接写入长期链路。
4. targeted tests 与 `vibe` 收据。

## Constraints

1. 不重写整套 execution callback/delivery runtime。
2. 不把所有普通工具结果都纳入学习；优先只学习 Alicization 主动发起并回到对话面的执行结果。
3. 不修改 `N.E.K.O/` 业务代码。

## Acceptance Criteria

1. 执行结果反馈可以被稳定分类为 `valued / doubted / intrusive / interrupted`。
2. 这些反馈会写成 `execution` sourceKind 的 relationship outcome / reinforcement / facts / reflections。
3. `stage-tamagotchi` typecheck 通过。
4. targeted tests 通过。

## Product Acceptance Criteria

1. Alicization 会因为“结果靠谱”而更敢以后再这样提、这样汇报。
2. Alicization 会因为“结果不对”而以后更谨慎、更强调验证。
3. Alicization 会因为“这样很打扰”而以后更注意边界和时机。

## Manual Spot Checks

1. 主动执行结果回到对话后，宿主说“这个结果不对”，观察后续她是否更强调验证。
2. 宿主说“这个挺有用，以后可以这样”，观察后续她是否更直接、更敢继续提。
3. 宿主说“别这样突然打断我报结果”，观察后续是否更收敛、更挑 opening。

## Completion Language Policy

只有在以下条件满足时，才允许使用“已完成”措辞：

1. execution result feedback learning 已接入 runtime。
2. targeted tests 通过。
3. `pnpm -F @proj-alicization/stage-tamagotchi typecheck` 通过。

## Delivery Truth Contract

1. 不宣称已经实现完整人格演化。
2. 只宣称已经补上“执行结果反馈 -> 长期学习”的闭环。

## Non-goals

1. 本轮不做更细粒度的多标签情绪分析。
2. 本轮不把所有普通 user-requested execution 一并纳入学习。

## Inferred Assumptions

1. 你要的是让主动系统真的像人一样根据真实后果修正自己，而不是再堆一个抽象人格层。
