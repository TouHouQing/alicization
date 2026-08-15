# Alicization Codex Tool Call Root Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## 2026-08-06 实施结果

本计划的主修复已经落地，当前工作区待提交。

已完成：

1. `runtime-call-chain` 改为 `AsyncLocalStorage` 隔离，同一 Provider step 的并发 sibling executor 不再互相污染调用栈，真实 nested recursion 仍会被阻止。
2. executor throw path 统一转成结构化 tool result，保留 `toolName`、稳定错误码和安全错误摘要。
3. executor inspection 产生的新 executor 建议不再内部递归执行，而是交还主模型决定下一步 tool call。
4. OpenAI-compatible 工具 schema 移除高风险兼容字段，同时保留完整工具注册表，避免静默裁剪 Codex、文件、浏览器、桌面和 MCP 能力。
5. `tool-call-streaming-start` 会立即通知 renderer，长时间 Codex 执行不会再因为没有早期可见事件而被误判无响应。
6. failed tool result 会在主进程 stream runner 和 renderer 两层升级为 `tool-execution` failure surface；即使 Provider 后续输出普通文本，也不会覆盖真实工具失败。
7. Circular、Codex/CLI timeout、command not found 和普通 tool failure 使用统一分类器，用户可见错误包含工具、错误码和安全摘要。
8. 工具失败回合固定关闭 `allowLongTermCondensation`、`allowPersonaLearning`、`allowTraining`，不会进入长期记忆、persona 或 LoRA 数据。

截图中三个连续症状对应的根因和修复：

| 用户可见症状 | 根因 | 修复 |
| --- | --- | --- |
| `回复流失败` | executor 异常或 circular error 未分类，直接 reject 整轮 stream | executor catch + `tool-execution` failure surface |
| `Model output format was invalid` | failed tool result 后 Provider 普通文本仍被当成成功回复进入结构校验 | failed tool result 锁定整轮失败，禁止 Provider 文本覆盖 |
| `超时了` | Codex 长任务开始后 renderer 未收到早期 tool progress | `tool-call-streaming-start` 立即发出 tool-call 进度 |

已验证：

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/runtime-call-chain.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/provider-tool-compatibility.test.ts \
  packages/stage-shared/src/alicization-chat-failure-surface.test.ts \
  packages/stage-ui/src/stores/chat.test.ts
# 6 files, 84 tests passed

pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts
# 15 tests passed

pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts \
  --testNamePattern "tool|Codex|executor|failure|memory"
# 27 passed

pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts \
  --testNamePattern "tool|Codex|executor|provider|failure|memory"
# 26 passed

pnpm -F @proj-alicization/stage-ui typecheck
pnpm -F @proj-alicization/stage-tamagotchi typecheck:node
# both passed
```

打包后的人工验收：

1. 对话输入：`请用 Codex 只读检查当前仓库，列出可以安全清理的构建缓存，不要删除文件。`
2. 预期先出现 Codex 执行中状态，不应停在空白等待。
3. Codex 成功时，tool result 回到同一个对话 turn，最终回复由主模型基于结果生成。
4. Codex 不存在时，应显示 `Codex / CODEX_COMMAND_NOT_FOUND` 和安全摘要。
5. Codex 超时时，应显示 `Codex / CODEX_TIMEOUT`，不得出现 `回复流失败` 或 `模型输出格式异常`。
6. 打开 Memory Workbench 检查该失败 turn，只能作为失败审计存在，不得进入长期记忆、persona candidate 或 LoRA manifest。

**Goal:** 修复 Alicization 调用 CLI/Codex/其他 executor 时的循环误判、工具异常打断整轮 stream、Provider 工具请求 400 和泛化错误面，让模型可以拿到真实 tool result 后继续人格与记忆主链路。

**Architecture:** 主模型仍负责是否调用工具；工具层负责 schema、权限、执行和结构化失败。一个 turn 内的工具调用使用异步隔离的调用链，允许并发 sibling invocation，只阻止真实 nested invocation。executor 工具完成后的 GUI 检查可以继续生成建议，但不在 executor 工具内部隐式再次启动 executor；下一次 executor 必须由主模型在下一步 tool call 中决定。Provider 兼容层采用保守 schema，并在无可见进度且明确为工具请求拒绝时只做一次无工具重试。

**Tech Stack:** Electron main process、TypeScript、Vitest、`@xsai/stream-text`、`@xsai/shared-chat`、Zod、Eventa、pnpm workspace。

---

## 已证实的根因

1. `apps/stage-tamagotchi/src/main/services/alicization/agent-runtime.ts` 为整个 turn 复用一个可变 `stack`。`@xsai/stream-text` 用 `Promise.all` 并发执行同一轮多个 tool call，两个同 channel executor 会被错误判定为 `tool:executor:cli -> tool:executor:cli`。
2. `main-chat-execution-surface.ts` 的 executor post-action workflow 可以在 executor 工具尚未结束的执行边界内再次执行 executor suggested action，形成隐藏的 executor-to-executor 递归。
3. `@xsai/shared-chat` 的 `executeTool()` 不捕获 `tool.execute()` 异常；异常会使 `streamText()` reject，导致主链路丢失工具失败事实。
4. `packages/stage-ui/src/stores/chat.ts` 只能从 stream rejection 生成通用 failure surface，无法显示 `Circular runtime call`、`CODEX_TIMEOUT`、`CODEX_COMMAND_NOT_FOUND` 和 Provider 400 的真实摘要。
5. OpenAI-compatible provider 每轮可能收到较大的工具注册表；此前兼容层只移除少量 schema keyword，且硬截断会误删能力。当前先做无损 schema 兼容化，工具能力不再静默丢失；Provider 明确拒绝工具时由 renderer 侧只重试一次无工具请求并记录能力观察。

## 参考实现原则

- 工具调用必须形成显式循环：model -> validated tool call -> execution -> structured tool result -> model final response。
- 工具失败属于 tool result 或 infrastructure failure，不应作为未捕获异常摧毁 reply stream。
- 能力事实、工具可用性和真实执行结果分开记录。
- 工具错误和 Provider 错误禁止进入长期记忆、persona learning 和 LoRA 数据集。

## 文件边界

### Task 1: 异步隔离的 runtime call chain

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-call-chain.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/runtime-call-chain.test.ts`

- [ ] 写测试：两个同级并发 `track('tool:executor:cli', ...)` 都成功；真实嵌套 `track('outer', () => track('outer', ...))` 仍抛 `AlicizationRuntimeCircularCallError`。
- [ ] 运行：
  `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-call-chain.test.ts`
  预期新增并发测试失败，证明当前共享 stack 是问题。
- [ ] 使用 Node `AsyncLocalStorage<string[]>` 或等价的每次 invocation chain 隔离实现：父调用链从当前异步上下文读取，兄弟调用各自复制链，只有父链中已经存在相同 call id 才判定循环。
- [ ] 保留 `maxDepth`、history、phaseOrder、错误元数据和既有嵌套循环保护。
- [ ] 重新运行该测试文件，确认并发与嵌套两类断言都通过。

### Task 2: executor 失败作为结构化 tool result

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts`

- [ ] 写测试：让 `executeTaskThread` reject `Circular runtime call detected...`，直接调用 `executor_run_cli.execute()`，断言 promise 不 reject，而返回 `status: 'failed'`、`failureKind: 'tool-execution'`、原始安全摘要和 `allowLongTermCondensation: false` 的失败元数据。
- [ ] 运行相关测试，预期新增断言失败。
- [ ] 增加统一的 executor failure normalizer，提取错误名、错误码、错误消息和有限长度安全摘要；不要把错误降成 `done` 或普通人格文本。
- [ ] 将 `executorRunTools` 的 wrapper 改成捕获 `spec.execute` 和 `maybeFollowUpExecutorWorkflow` 的异常，并返回 JSON 可序列化的失败对象。
- [ ] 在 stream runner 回归中模拟 tool execute 抛错，确认 stream 能收到 `tool-result`，后续 provider text 能正常完成；失败内容不应进入 visible reply learning policy。
- [ ] 运行：
  `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts`

### Task 3: 删除 executor 内部的隐式 executor 递归

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/executor-adapters/local-visual.test.ts`

- [ ] 写测试：executor 完成后的 inspection 返回 `suggestedActions: [{ toolName: 'executor_run_codex' }]` 时，不直接执行该 action；返回 `autoContinuation.stoppedReason: 'executor-continuation-deferred-to-model'`，并保留建议动作。
- [ ] 运行测试确认当前实现仍会直接执行 executor suggested action。
- [ ] 从 `executeAutoContinuationAction`/`executeAutoContinuation` 的自动执行集合移除 `executor_run_cli`、`executor_run_codex`、`executor_run_claude_code`；executor suggested action 作为模型下一步可见事实返回。
- [ ] 保留低风险 browser/desktop follow-up；高影响动作继续确认门控。
- [ ] 更新旧的 “Auto-continued with executor...” 断言为“deferred to model”语义，不改变显式模型 tool call 的 executor 能力。
- [ ] 运行 executor surface 和 local visual targeted tests。

### Task 4: Provider 工具兼容与一次性无工具降级

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/provider-tool-compatibility.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.ts`
- Modify: `packages/stage-ui/src/stores/chat.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/provider-tool-compatibility.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts`
- Test: `packages/stage-ui/src/stores/chat.test.ts`

- [ ] 写测试：OpenAI-compatible tools 的 schema 不包含 `$schema`、`format`、`propertyNames`、`default` 等高风险兼容字段；完整工具注册表保持稳定顺序，不静默裁剪可用能力。
- [ ] 写测试：Provider 在首个进度前返回 HTTP 400 `invalid_request_error` 时，当前 turn 只重试一次 `tools: undefined`、`waitForTools: false`；重试仍失败则保留 Provider 400 诊断，不再重复重试。
- [ ] 运行测试确认当前兼容层没有预算裁剪，stream runner 没有独立 retry 诊断。
- [ ] 实现 provider tool profile：官方 OpenAI 与 OpenAI-compatible 都保留调用方提供的完整工具集合；兼容层只转换 schema，不以固定数量删掉工具。Provider 明确不支持工具时，renderer 侧执行一次无工具降级，并持久化该 Provider/model 的能力观察。
- [ ] 只在 `sawProgress === false`、尚未执行 tool、请求错误明确是 tools/schema/function-calling 兼容问题时进行一次无工具重试；不得重放已经产生可见内容或已经执行工具的 turn。
- [ ] 记录 provider id、model、tool count、裁剪列表、第一次错误和 retry 结果，供 Workbench/日志查看。

### Task 5: 用户可见透明失败与学习边界

**Files:**
- Modify: `packages/stage-ui/src/stores/chat.ts`
- Modify: `packages/stage-shared/src/alicization-chat-failure-surface.ts`
- Modify: `packages/i18n/src/locales/zh-Hans/stage.yaml`
- Modify: `packages/i18n/src/locales/en/stage.yaml`
- Test: `packages/stage-shared/src/alicization-chat-failure-surface.test.ts`
- Test: `packages/stage-ui/src/stores/chat.test.ts`

- [ ] 写测试：Circular、Codex timeout、Codex command not found、tool execution failed、Provider HTTP 400 分别产生明确的 infrastructure failure surface，不再统一为“回复流失败”。
- [ ] 将错误环节和安全摘要放进 failure surface 的诊断字段；敏感 token、Authorization、用户输入仍脱敏。
- [ ] 失败消息保持固定基础设施错误提示，但必须包含真实环节/错误码；不生成假人格回复。
- [ ] 保证 `allowLongTermCondensation=false`、`allowPersonaLearning=false`、`allowTraining=false`，并补充失败回合不进入记忆/训练的回归断言。
- [ ] 运行 shared failure surface、stage-ui chat tests。

### Task 6: 端到端回放与验证

**Files:**
- Modify only when a failing invariant identifies a real regression:
  `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`

- [ ] 增加真实回放：用户请求“用 Codex 检查仓库”，Provider 发出 Codex tool call，Codex 成功后返回最终回复。
- [ ] 增加失败回放：Codex timeout、command not found、call-chain guard、Provider 400，均显示真实失败并结束在基础设施 failure surface。
- [ ] 增加并发回放：同一 provider step 的两个 sibling tool call 不触发 circular false positive。
- [ ] 增加记忆不变量：失败 turn 不进入 WorkingMemory long-term queue、LongTermMemoryRecall、persona dataset 或 LoRA manifest。
- [ ] 运行：
  `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts --testNamePattern "tool|Codex|executor|provider|failure|memory"`

## 最终验证

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/runtime-call-chain.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/provider-tool-compatibility.test.ts \
  packages/stage-shared/src/alicization-chat-failure-surface.test.ts \
  packages/stage-ui/src/stores/chat.test.ts
pnpm -F @proj-alicization/stage-ui typecheck
pnpm -F @proj-alicization/stage-tamagotchi typecheck:node
```

验收必须同时满足：

- 模型可以自主产生 `executor_run_codex`，且 Codex 结果回到同一个人格与记忆主链路。
- 并发 sibling executor 不再误报 circular；真实 nested recursion 仍被阻止。
- Codex/工具/provider 失败不再把整轮变成无原因的“回复流失败”。
- OpenAI-compatible provider 不再因固定数量上限静默丢失 coding、文件、浏览器、桌面或 MCP 工具；工具 schema 会移除兼容风险字段，工具请求 400 只触发一次无工具降级。
- 所有失败产物都不进入长期记忆、persona 和 LoRA 训练数据。
- `.serena/project.yml`、构建缓存、`.claude-flow/`、`.swarm/`、`.pnpm-store/` 和两个旧未跟踪长期记忆计划不进入提交。
