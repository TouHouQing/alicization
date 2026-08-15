# Alicization Provider Retry And Agentic Delegation Design

## 背景

当前两个用户可见问题来自同一类边界错误：基础设施在用户意图尚未被模型判断前，越权替模型决定了动作。

1. 用户询问“你可以用 Codex 做什么”时，`execution-channel-request.ts` 通过自然语言正则判断是否应执行。长问句没有命中能力问题模板，却命中“用 Codex”执行模板，runtime 因此设置强制 `toolChoice`，导致 Codex 被直接调用。
2. Provider 请求失败的重试分散在主对话流和 one-shot 链路中，当前只覆盖少数首次请求瞬态错误，不能形成统一的五次重试、退避、取消和副作用边界。

这不是继续增加关键词或继续放宽超时可以解决的问题。需要让对话模型拥有工具选择权，让执行 runtime 只负责工具生命周期、安全和真实错误；同时把 Provider retry 作为独立的 transport policy。

## 目标

- 能力/知识问题不因提到 Codex、CLI 或 Claude Code 而自动调用工具。
- 具体任务仍可由模型自主选择合适 executor；用户明确要求某个工具时，模型可以从工具能力和当前上下文中选择对应工具。
- 不再由自然语言 regex 设置强制 `toolChoice` 或按文字过滤 executor 工具。
- 主对话流和 main-gateway one-shot 对可恢复 Provider 失败最多重试 5 次。
- 重试支持 408、409、429、500、502、503、504，以及明确的连接重置、EOF、DNS、请求超时等传输错误。
- 使用指数退避和抖动，尊重可解析的 `Retry-After`，并受总 deadline 与 AbortSignal 约束。
- 只允许在尚未产生用户可见文本、工具调用或工具副作用时重放完整主对话请求。
- 一旦发生工具调用或工具执行，Provider 失败只能透明失败，不能整轮重放导致重复执行。
- 每次重试写入结构化诊断，最终失败仍保留真实 Provider 错误，不生成固定人格回复。

## 非目标

- 不引入新的固定人格 system prompt。
- 不用关键词分类器替代模型意图判断。
- 不自动重试工具本身；Codex/CLI adapter 的内部重试由各自协议 owner 负责。
- 不在本轮迁移 Codex App Server。
- 不将失败文本写入 WorkingMemory、长期记忆、persona 或 LoRA 数据集。

## 设计

### 1. 模型拥有工具选择权

删除 runtime 侧的自然语言执行请求 envelope。`execution-channel-request.ts` 不再参与主对话工具选择；如果没有其他业务 owner 使用它，则删除该文件及其旧的 regex 测试。

主对话准备阶段遵循：

```text
allowTools = provider supports tools
toolChoice = undefined
tools = complete available tool registry
```

Provider 首包超时、瞬态失败和后续 retry 都不得缩窄工具列表。工具 schema 的兼容处理由
provider adapter 负责，不能通过删除部分能力来改变模型下一次尝试可见的行动空间。

工具描述只说明真实能力和输入，不包含回复模板。executor 描述明确其输入是“当前轮已经委托的具体任务”，但不通过用户文本匹配来执行。

因此：

```text
用户询问能力
  -> 主模型读取能力事实
  -> 普通回复

用户委托具体项目任务
  -> 主模型选择 executor tool
  -> executor runtime 执行
  -> Provider 根据工具事实继续回复
```

如果模型选择了 Codex，内部 task intent 仍由 `executor_run_codex` 工具 owner 生成，`requestedChannel` 由工具 schema 事实产生，而不是由用户文本预先注入。

### 2. 统一 Provider Retry Policy

新增 `provider-retry-policy.ts`，只处理 Provider request/stream invocation 的 transport retry，不处理 tool execution。

```ts
interface ProviderRetryContext {
  operation: 'main-chat-stream' | 'main-gateway-one-shot'
  attempt: number
  maxRetries: number
  hasVisibleProgress: boolean
  hasToolCall: boolean
  hasToolSideEffect: boolean
}
```

默认策略：

```ts
maxRetries = 5
baseDelayMs = 500
maxDelayMs = 10_000
retryableStatuses = [408, 409, 429, 500, 502, 503, 504]
```

等待时间为指数退避加 full jitter：

```text
min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1))
```

如果错误携带 `Retry-After`，取它与本地退避中的较大值，但不超过单次 retry delay 上限和总 deadline。AbortSignal 在等待和请求期间都必须立即停止重试。

### 3. 主对话流的安全边界

主对话流只在以下条件同时满足时重试：

- 当前尝试没有用户可见 text delta；
- 没有 tool-call、tool-call-streaming-start 或 tool-result；
- 没有 executor progress 产生副作用；
- 当前 run 仍然 active；
- 错误被 retry policy 归类为可恢复传输错误。

收到任意工具调用或工具结果后，即使 Provider 随后返回 503，也不能重放整个 `streamText` 调用，因为 xsAI 可能重新执行已完成的工具。

重试事件：

```text
chat-stream.provider-retry-scheduled
chat-stream.provider-retry-started
chat-stream.provider-retry-exhausted
```

事件只写 debug/audit，不进入人格回复。

### 4. One-shot 的安全边界

main-gateway one-shot 也可能收到带 `execute` 的工具并由 `generateText` 完成多步工具循环。
因此 one-shot 必须包装每个可执行工具，在工具开始执行前记录副作用状态。只有一次
attempt 尚未产生工具执行或结果时，才可以使用同一个 retry policy 最多重试 5 次。

以下情况不得重试：

- AbortSignal 已取消；
- work coordinator 已抢占该 one-shot；
- Provider 已返回非空文本；
- response format 已产生不可恢复的 schema/auth/config 错误。
- 任意工具的 `execute` 已开始运行，即使 Provider 随后返回 429/5xx。

one-shot 超时仍由当前调用 deadline 控制；retry wait 必须计入 deadline，不能通过重试把后台任务无限延长。

### 5. 错误分类

分类顺序：

1. Abort/cancel：不可重试。
2. 工具失败或已产生副作用：不可整轮重试。
3. Auth、权限、模型不存在、schema 无效、配置错误：不可重试。
4. 408/409/429/5xx、连接重置、EOF、DNS、请求超时：可重试。
5. 未知错误：默认不可重试，保持失败透明。

最终错误保留原始 Provider request diagnostics 的安全摘要，并通过既有 failure surface 展示；不会把“重试耗尽”伪装成 `provider-output-invalid`。

## 测试策略

### 工具选择

- 长能力问句不设置 `toolChoice`。
- 长能力问句仍保留完整 executor registry，且不只暴露 Codex。
- 具体任务的模型回放可选择 Codex；runtime 不从用户文字生成 `requestedChannel`。
- 删除/不再调用自然语言执行正则。

### Retry policy

- 503、429、连接重置分别可重试。
- 连续五次失败后第六次成功，最终成功。
- 连续六次失败，返回原始安全错误。
- 每次等待受 AbortSignal 取消。
- `Retry-After` 被解析并受上限限制。
- 已产生可见文本后不重试。
- 已产生工具调用/副作用后不重试。
- one-shot 失败后同样重试。

### 端到端

- replay“你认为你可以用 Codex 做什么……”只生成普通回复路径。
- replay“请用 Codex 检查当前仓库”由模型选择 Codex tool，且只有一个执行 owner。
- Provider 瞬态失败时最终只产生一条回复或一条透明失败。
- retry 事件和 attempt 数写入 debug，不写入长期记忆。

## 验收标准

1. 用户询问 Codex 能力时，Codex 子进程调用次数为 0。
2. 用户明确委托项目任务时，模型可以选择 Codex，且不会被 CLI 替换。
3. Provider 瞬态错误最多重试 5 次，成功时用户只看到一次最终回复。
4. Provider 永久失败时显示真实 Provider/网络错误，不显示结构化格式异常。
5. 工具已执行后，Provider 失败不重放工具，不产生第二个执行任务。
6. 主对话流和 one-shot 使用同一套 retry policy 与结构化诊断字段。
7. retry 前后模型看到同一份完整工具 registry，不存在 compact-tool 隐式裁剪。
