# Alicization Organic Runtime Refactor

Date: 2026-04-10
Runtime: `vibe`
Mode: `interactive_governed`
Scope owner: root governed lane

## Goal

彻底重构 Alicization 当前主对话链路，让它从“固定修复模板 + 全局单例模型配置”转向“会话态、卡片态、认知态驱动”的有机运行时。

## Problem Statement

当前链路存在两个耦合缺陷：

1. `mind fallback` 同时承担真值纪律和可见话术生成，一旦结构化修复或治理接管触发，就会把回答压成固定句式，例如“先按你眼前这件事说……”“我还记着上一条线……”，数字生命感被模板化吞掉。
2. 主进程 main gateway 依赖 `activeProviderId/activeModelId/providerCredentials` 这组全局单例状态；当 renderer 同步延迟、会话启动早于 hydration、或 turn payload 没显式带齐路由时，就会误判为 `missing-config`，随后 renderer 再把它表面化成“provider/model/baseUrl 缺失”。

## Deliverable

交付一套新的 Alicization runtime 结构，至少覆盖：

- main gateway 路由解析与卡片/会话连续性
- renderer 到 main 的 chat route 传递
- mind-governed fallback 与 visible reply takeover 的拆分
- 相关测试和回归覆盖

## Constraints

- 允许修改相关任意位置，不做局部热修。
- 不新增为了兼容旧错误形态而存在的长期兜底分支。
- 保持现有 P0-P4 治理约束成立。
- 修改后必须跑 `pnpm typecheck` 与 `pnpm lint:fix`。

## Acceptance Criteria

- 普通对话与普通 screen/task 回答不再默认落成固定治理模板句。
- repair/grounding 纪律仍然存在，但只在真正需要 takeover 时接管可见表面。
- main gateway 能从 turn-local route、card-local remembered route、global active route 中解析模型路由，而不是只依赖单一全局内存状态。
- one-shot / proactive / reminder 类 main gateway 调用可以复用最近健康路由，而不是因全局 active route 短暂为空而失败。
- renderer 发送 Alicization chat 时显式携带更稳定的 route 信息，避免 `providerId/model` 漂移为空。
- 针对“固定 answer-opening takeover”和“missing-config 误判”的回归测试通过。

## Product Acceptance

- 同样的用户输入，在无真实 repair 需求时，回答表面应优先保留模型自己的自然表达。
- 如果确实需要纠正旧锚点，回答可以直说纠正，但不能反复复读固定模板。
- 当配置未同步完成时，系统应优先自愈路由或用最近健康路由，而不是立刻抛出配置缺失。

## Manual Spot Checks

- 输入普通问候或关系型对话，确认不再被替换成“先按你眼前这件事说……”。
- 输入需要看当前屏幕的任务型问题，确认 reply 可以保留自然短答，不会因 strict governance 被无意义接管。
- 在 renderer hydration 之前或 voice/chat 快速触发时发起一轮对话，确认不会错误掉进 `missing-config`。
- reminder/proactive/one-shot 能在当前卡片已有健康路由时继续工作。

## Completion Language Policy

- 只有在 targeted tests、`pnpm typecheck`、`pnpm lint:fix` 都完成后，才允许说“完成”。
- 如果仍有未覆盖的风险，必须明确指出。

## Delivery Truth Contract

- 不把“减少出现”描述成“彻底消除”。
- 不把未验证的生命周期推断描述成已确认事实。
- 不把 renderer/main route 自愈描述成“永不失败”。

## Non-goals

- 不重写 provider 设置 UI 本身。
- 不在这轮里重做全部 memory / subconscious / proactive 策略。
- 不引入新的外部 LLM orchestration backend。

## Inferred Assumptions

- 用户所说“这部分逻辑”以 `apps/stage-tamagotchi/src/main/services/alicization/*` 与 `packages/stage-ui/src/stores/chat*` 为主链。
- 参考 `N.E.K.O` 与 `claude-code-main` 的重点是“会话态/路由态/连续性分层”，不是机械复刻其实现。
- 当前工作树已有大量未提交改动，因此本次改动必须尽量追加式重构，不回滚用户现有修改。
