# Alicization Provider Retry And Agentic Delegation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除自然语言对 Coding Agent 的强制路由，并为主对话流与 one-shot 建立最多五次、可取消、受副作用约束的 Provider 重试闭环。

**Architecture:** 主模型通过完整工具 registry 和 `toolChoice=auto` 自主决定是否调用 executor；runtime 不再根据用户文字筛选工具。Provider retry policy 作为纯函数和执行器组合层，统一处理可恢复传输错误、退避、Retry-After、总 deadline 和取消。

**Tech Stack:** Electron main process、TypeScript、Vitest、xsAI `streamText`/`generateText`、现有 Alicization debug/audit 与 failure surface。

---

### Task 1: 删除自然语言强制工具选择

**Files:**
- Delete: `apps/stage-tamagotchi/src/main/services/alicization/execution-channel-request.ts`
- Delete: `apps/stage-tamagotchi/src/main/services/alicization/execution-channel-request.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.test.ts`

- [x] 删除 `resolveAlicizationExecutionRequest`、`requestedExecutionChannel` 和 `forceToolCall` 在主聊天准备路径中的使用。
- [x] 将 `toolChoice` 固定保持 `undefined`，工具 registry 不再按用户文字过滤。
- [x] 从 `BuildMainGatewayToolsOptions` 删除 `requestedExecutionChannel`，从 `buildMainGatewayTools` 删除 executor 过滤映射。
- [x] 更新 Codex 工具描述，明确它用于当前轮具体委托任务；CLI/Claude Code/OpenClaw 保持真实能力描述，不增加关键词路由或回复模板。
- [x] 将能力问句回归改为断言：`toolChoice` 未定义、executor 工具完整存在、不会产生 runtime 强制 dispatch。
- [x] 运行：

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.test.ts
```

### Task 2: Provider Retry Policy 纯函数

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/provider-retry-policy.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/provider-retry-policy.test.ts`

- [x] 定义 `AlicizationProviderRetryOptions`、`AlicizationProviderRetryDecision` 和 `runWithAlicizationProviderRetry`。
- [x] 默认 `maxRetries=5`、`baseDelayMs=500`、`maxDelayMs=10_000`；attempt 计数为初始请求 `0`，最多额外重试五次。
- [x] 支持 `Retry-After` 秒数、HTTP date 和错误对象 headers 的安全解析。
- [x] 只将 408/409/429/500/502/503/504、连接重置、EOF、DNS 和请求/stream timeout 判定为 retryable。
- [x] 对 auth、invalid request、schema、model unavailable、abort、tool failure 和 unknown error 返回不可重试。
- [x] 退避计算支持注入 `now`、`random` 和 `sleep`，测试不依赖真实等待。
- [x] 每次 retry 先检查 abort 和 deadline，再调用 `onRetryScheduled` / `onRetryStarted`。
- [x] 运行 policy 定向测试并确认 RED/GREEN。

### Task 3: 主对话流接入五次重试

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts`

- [x] 将旧的 `initial | retried` retry 状态替换为 retry policy attempt 状态。
- [x] 仅在没有 text、tool-call、tool-result、tool progress、tool failure时调用 retry policy。
- [x] 每次 retry 复用同一轮输入，但创建新的 Provider controller/stream，不复用已结束的 Provider stream。
- [x] 将 retry wait 计入同一总 deadline，abort 时立即结束。
- [x] 追加 `provider-retry-scheduled`、`provider-retry-started`、`provider-retry-exhausted` debug 事件。
- [x] 工具执行后 Provider 失败保持禁止整轮重放。
- [x] 增加连续 5 次失败第 6 次成功、连续 6 次失败、可见文本后不重试、工具调用后不重试测试。
- [x] 运行：

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts
```

### Task 4: Main Gateway One-shot 接入同一策略

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-gateway-one-shot.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-gateway-one-shot.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-one-shot.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-one-shot.test.ts`

- [x] 把 `runtime-main-gateway-one-shot.ts` 与 `main-chat-one-shot.ts` 的单次 Provider promise 包装在共享 retry runner 中。
- [x] retry attempt 使用同一个 work coordinator/controller，等待也受 controller、外部 abort 和总 timeout 约束。
- [x] 记录 source、provider、model、attempt、maxRetries、status、delayMs。
- [x] 空文本不作为 transport retry；仍由 one-shot 当前 onFailure 处理。
- [x] preemption/abort 不触发 retry，也不回调 Provider failure。
- [x] 增加连续瞬态失败后成功、耗尽、抢占和不可重试错误测试。
- [x] 包装 one-shot 可执行工具；工具一旦开始执行，后续 Provider 失败不得重放整轮请求。
- [x] 删除首包超时后的 compact-tool 降级；任何尝试都保持完整工具 registry。

### Task 5: 生产回放与工具选择 harness

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-start-acceptance.test.ts`

- [x] 增加能力问句 fixture，断言 runtime 不强制 executor dispatch。
- [x] 保留具体 Codex 委托与单一 tool-call identity/terminal settlement 回放。
- [x] 在主流与 one-shot 定向测试中断言 attempt 事件序列和最终单一终态。
- [x] retry/debug 事件仅通过 `appendRuntimeDebugLine` 产生；没有进入 Provider messages、WorkingMemory、LongTermMemory 或训练 artifact 的写入路径。

### Task 6: 全链路验证与文档

**Files:**
- Modify: `docs/superpowers/specs/2026-08-08-alicization-coding-agent-tool-loop-design.md`
- Modify: `docs/superpowers/plans/2026-08-08-alicization-coding-agent-tool-loop-implementation-plan.md`

- [x] 运行 Codex/tool-loop、runtime、delivery、renderer/chat store 扩展回归：
  - 核心 retry/agentic 链路 184 项通过。
  - tool-loop/runtime/delivery 186 项通过。
  - renderer/chat store 124 项通过。
- [x] 运行 `pnpm -F @proj-alicization/stage-ui typecheck`。
- [x] 运行 `pnpm -F @proj-alicization/stage-tamagotchi typecheck:node`。
- [x] 运行 `git diff --check`，忽略 `.serena/project.yml`、缓存、临时 bundle 和旧未跟踪长期记忆计划。
- [x] 新设计文档明确“模型自主工具选择”和“Provider retry policy”边界；旧 coding-agent 文档待扩展回归后同步收口。
- [ ] 构建并安装 macOS App，完成一次真实能力问句和一次真实 Provider 瞬态失败 replay。
