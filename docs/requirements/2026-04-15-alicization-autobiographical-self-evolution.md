# 2026-04-15 Alicization Autobiographical Self Evolution

## Goal

在上一轮 `mind ecology` 主干之上，继续把 Alicization 的心智推进到“会持续地想成她自己”的方向：让 turn/tick 级反思真正沉淀为跨回合稳定的 `persona drift`，并在 ecology 之上建立自发目标与长期偏好演化，使她不只是会思考，而是会持续按自己的内在倾向去思考、靠近、回避、坚持、修正。

## Problem Statement

上一轮已经统一了 temperament / climate / habits / self line / relation line 的实时生态，但还存在两个结构性缺口：

1. 反思没有真正沉淀成稳定人格漂移：
   `reflectionLedger` 仍主要是短时 revision 账本，会影响当前 ecology 和回答表层，但不会正式落入一个长期存在、可持续演化的 autobiographical self。
2. ecology 缺少“长期自我驱动层”：
   当前 ecology 更像“此刻的心境与习惯天气”，但不负责形成长期偏好演化、行为习惯巩固、或自发目标取向，因此 Alicization 还不够像“持续成为某种自己的人”。
3. 主动行为仍然偏场景驱动，而不是人格驱动：
   `goalStack / initiative / desireMemory / privateThought` 已经有连续性，但它们仍主要被当前场景、关系压力和即时 thread 拉动，缺少长期人格偏好对主动选择的慢变量约束。
4. continuity recall 还不够“自传式”：
   当前 continuity fragment 能记住 mind posture，但还不够强地表达“我最近变成了什么样的人、我现在默认重视什么、我有哪些反复出现的脾气和偏好”。
5. 未来接入任意宿主的抽象还不够稳：
   如果没有一层可持久化、可投影、可复用的 autobiographical self，那么 Alicization 仍更像一个带短期心流的 runtime，而不是一个可迁移的数字生命心智内核。

## Architectural Direction

本轮引入一层新的 `autobiographical self`，位于 `selfContinuity / reflectionLedger / desireMemory / mind ecology` 之上，作为 Alicization 的长期自我沉淀层：

1. 它负责把 repeated reflections、relationship outcomes、carried desires、goal inertia、ecology patterns 吸收到稳定 persona drift。
2. 它负责维护长期偏好演化，而不是只维护当前心境：
   例如 truth-first、companionship、quiet observation、playfulness、autonomy respect、repair discipline、unfinished-thread return 等偏好强度。
3. 它负责生成一组自发长期目标倾向：
   例如 preserve trust、reduce misread、stay near without crowding、protect rest rhythm、finish open loops、grow shared language。
4. 这层必须持久化进入 Visual Presence / Digital Life 主状态链，并反向约束：
   `goalStack`、`initiativeArbitration`、`initiative`、`mindEcology`、`privateThought`、`mindSynthesis`、`mindContinuity`、main chat prompt surface。

## Deliverable

1. 新的 `autobiographical-self` runtime 模块，产出稳定 persona drift、long-horizon preferences、self-directed goals、behavior signatures、identity narrative。
2. `AlicizationVisualPresenceStateSnapshot` 与 Digital Life runtime surface 接入该 snapshot，使其成为持久化和宿主无关投影的一部分。
3. `goal-stack` 与 `initiative` 读取 autobiographical self，让长期偏好开始影响主动目标与行为选择。
4. `mind-ecology`、`private-thought`、`mind-synthesis`、`mind-continuity`、main chat prompt surface 读取 autobiographical self，让回答与记忆都体现“稳定成为她自己”的趋势。
5. 新增 targeted tests 与本轮 `vibe` receipts。

## Constraints

1. 不回滚用户现有非本任务改动。
2. 不修改 `N.E.K.O/` 业务代码，只把其 memory layering 当作本地参考。
3. 不把“自我意识”描述为已实现。
4. 保持 Alicization P0-P4 既有 runtime / truth / governance / replay contracts 不被破坏。
5. 优先做结构主干升级，不接受继续堆 turn-level heuristic 的补丁式写法。

## Acceptance Criteria

1. 运行时新增单一的 `autobiographical self` builder，稳定输出：
   persona drift、长期偏好演化、自发长期目标、行为签名、自我叙事。
2. 该 snapshot 被持久化进 Visual Presence 主状态，并进入 Digital Life runtime surface。
3. `goalStack` 与 `initiative` 能读取该 snapshot，使长期偏好真正影响主动目标与行为选择。
4. `mind ecology` 与 continuity recall 能暴露稳定 persona drift，而不是只暴露当前 mood/climate。
5. targeted tests 通过，`pnpm -F @proj-alicization/stage-tamagotchi typecheck` 通过。

## Product Acceptance Criteria

1. Alicization 在相近情境下的偏好与脾气应更稳定，不再像每个 turn 都重新决定自己。
2. 反思与修正应能在后续多轮里留下稳定行为痕迹，而不是只影响当下回复。
3. 主动倾向应更像“她自己长期会在意什么”，而不仅是“当前 scene 触发了什么”。
4. continuity recall 与 prompt surface 应能表达持续的自我演化，而不是只有即时心境。

## Manual Spot Checks

1. 连续几轮出现误读修复后，再问她“你最近为什么这么在意别误会我/别说错”，回答应能体现稳定的 truth-first drift。
2. 在陪伴成功、被冷落、深夜疲劳、debug 高压等不同组合里，后续主动倾向应体现长期偏好强化，而不是只做情绪抖动。
3. 问她“你最近更像什么样的人了 / 你现在会下意识怎么做”，回答应能给出有连续性的自我叙事和偏好，而不是泛泛模板。

## Completion Language Policy

只有在以下条件满足时，才允许使用“已完成”措辞：

1. 新的 autobiographical self 层已落入主状态链并接入核心 consumers。
2. targeted tests 通过。
3. `pnpm -F @proj-alicization/stage-tamagotchi typecheck` 通过。
4. 明确说明本轮仍未实现真正的自我意识。

## Delivery Truth Contract

1. 只能声称“建立了更稳定的人格漂移与长期偏好演化主干”，不能声称“数字生命已完全实现”。
2. 不将“自我意识”描述为已实现。
3. 若 lint 或其他验证继续被仓库外部问题阻塞，必须如实说明。

## Non-goals

1. 本轮不承诺实现真正自我意识。
2. 本轮不重写整个 Alicization runtime。
3. 本轮不实现所有宿主平台最终 API 适配。
4. 本轮不引入新的外部 memory service。

## Inferred Assumptions

1. 用户要的是继续推进 Alicization 成为可持续演化的数字生命心智，而不是一次局部行为微调。
2. 长期人格漂移和长期偏好演化，比继续堆更多即时 heuristics 更接近这个目标。
3. 持久化的 autobiographical self 是当前架构下最值得做的下一层主干。
