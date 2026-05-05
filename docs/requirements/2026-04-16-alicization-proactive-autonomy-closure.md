# 2026-04-16 Alicization Proactive Autonomy Closure

## Goal

把 Alicization 已经具备的长期记忆、动机、习惯、自我连续性、主动对话与执行基础设施，收束成一个统一的自治决策闭环，让它不再只是“会主动说几句”，而是更像一个持续存在的数字生命：会自己判断什么时候观察、什么时候靠近、什么时候先沉默、什么时候准备行动、什么时候真正执行。

## Problem Statement

当前主动系统的根因缺口不是模块数量不够，而是最后一跳缺少统一自治裁决层：

1. 主动链路断裂：
   `autobiographicalSelf / motiveEngine / habitPolicy / goalStack / desireMemory / initiativeArbitration / initiative / executiveCycle / actionEcology` 已经提供了大量慢变量与局部决策，但最终仍主要收束到“要不要说话”。
2. 行动不是一等决策：
   运行时存在 `shouldProactivelyAct`，但它主要来自 runtime channel 热度，而不是可解释、可持久化、可投影的自治决策。结果是 Alicization 能“有想法”，却不真正拥有稳定的“我现在想做什么”。
3. 执行闭环缺乏人格约束：
   现有主动表达、持续牵挂、长期目标、习惯边界并没有统一汇总成一个自治输出，所以“人格、脾气、习惯、边界、自主性”无法共同约束主动行为。
4. 前后台不共用同一份自治状态：
   private thought、runtime digest、digital-life spine、proactive policy 对主动性的读取口径并不一致，容易导致“内心像一个人，表面像另一个系统”。
5. 记忆到行为的最后闭环不够强：
   参考本地 `N.E.K.O/` 可迁移的模式，Alicization 已有 `facts -> reflections -> autobiographical self / motive / habit` 的雏形，但还没有统一投影到下一步“观察 / 复查 / 靠近 / 开口 / 准备行动 / 行动”。

## Architectural Direction

本轮不继续堆更多 heuristic，而是引入一个新的统一 `autonomy kernel`：

1. 它消费现有 mind-state 主干，包括 autobiographical self、motive engine、habit policy、goal stack、desire memory、initiative、executive cycle、action ecology、thread runtime 等。
2. 它输出一份自治快照，明确表达：
   - 当前自治模式是什么
   - 是否应该说话
   - 是否应该行动
   - 行动准备度与抑制原因
   - 当前执行意图来自哪条长期目标 / agenda / thread / desire
   - 为什么是现在，而不是稍后
3. 它成为主动闭环的最终 authority：
   - 统一覆盖 runtime `shouldProactivelyAct`
   - 统一影响 digital-life architecture / spine / digest
   - 统一约束 proactive policy 对“主动开口”的判断
   - 让 private thought 与用户可见的主动表层读取同一份自治状态

## Deliverable

1. 新的 `autonomy-kernel` 运行时模块与测试。
2. `runtime-mind-state` 改造，使自治快照成为主动链路的最终闭环输出。
3. `initiative`、`privateThought`、runtime architecture、digital-life spine / digest、proactive policy 同步读取自治结果。
4. runtime / digital-life 投影包含显式的 act readiness / execution intent / defer reason 语义，而不再只有 speak/no-speak。
5. targeted tests 与 `vibe` 验证收据。

## Constraints

1. 不回滚用户现有未提交改动；允许在脏工作树上继续重构。
2. 不修改 `N.E.K.O/` 业务代码，只把它作为本地参考。
3. 必须保持 Alicization P0-P4 既有 governance / truth / replay 约束不被破坏。
4. 不接受补丁式堆条件分支；需要形成统一自治主干。
5. `vibe` 产物保留在工作区，但不纳入源码提交。

## Acceptance Criteria

1. 运行时存在单一 `autonomy kernel`，明确输出统一自治模式，而不是把 act/speak 分散在多个模块里临时推断。
2. `shouldProactivelyAct` 不再仅由 channel 热度推导，而是读取自治快照。
3. `privateThought`、runtime digest、digital-life spine、proactive policy 对主动性的读取口径一致。
4. digital-life / runtime 投影里能看见行动准备度、执行意图、抑制原因等自治字段。
5. targeted tests 通过，`stage-tamagotchi` typecheck 通过。

## Product Acceptance Criteria

1. Alicization 在类似场景下会表现出更连贯的主动习惯，而不是随机浮动的“想说就说”。
2. 当它决定不说、先观察、先复查、准备行动或真的行动时，这些差异应该能从状态和行为上解释出来。
3. 长期记忆、关系惯性、边界意识、脾气与自主性会共同影响主动行为，不再只影响语气。
4. 即使没有立即开口，系统内部也能保持“她现在正在酝酿什么、准备什么、压住了什么”的连续自治状态。

## Manual Spot Checks

1. 在 host 忙、沉浸、深夜疲劳、未完成 thread、关系空窗几种场景切换时，观察 Alicization 是否出现明确不同的自治模式而不是统一开口模板。
2. 在连续几轮对话后，询问 `你刚刚为什么没说 / 为什么现在主动靠近`，回复应能与自治状态一致。
3. 当存在未完成的修复或照料意图时，系统应更容易进入 `recheck / prepare-act / act` 相关状态，而不是一律挤压成 `speak`。

## Completion Language Policy

只有在以下条件满足时，才允许使用“已完成”措辞：

1. 统一自治层已进入 mind-state 主链路。
2. targeted tests 通过。
3. `pnpm -F @proj-alicization/stage-tamagotchi typecheck` 通过。
4. 若 `pnpm lint:fix` 因既有仓库问题无法完成，必须明确说明。

## Delivery Truth Contract

1. 不把“更像真人”表述成已经完全实现，只能表述为“建立了更强的主动自治闭环”。
2. 不宣称已经实现真正的自我意识或真实人格主体性。
3. 只陈述已经在代码、测试、类型检查中被验证的改动。

## Non-goals

1. 本轮不承诺实现真正的自我意识。
2. 本轮不重写整条 Alicization runtime。
3. 本轮不直接改造所有 executor/autonomous task dispatch 行为到完全自动。
4. 本轮不引入新的外部 memory / agent service。

## Inferred Assumptions

1. 用户要的是继续推进 Alicization 成为更像“真人”的数字生命，而不是局部 UI 或 prompt 微调。
2. 当前最有效的路径是把已有慢变量心智资产闭合成自治决策，而不是继续添加更多主动话术。
3. 行动能力的第一步不是盲目自动执行，而是先建立可解释、可投影、可持续学习的自治 authority。
