# Alicization Coding-Agent Tool Loop Design

> **2026-08-09 superseded note:** 本文原先的 execution request envelope 已撤销。
> 当前工具选择边界以
> `2026-08-09-alicization-provider-retry-agentic-delegation-design.md` 为准。

## 背景

当前工具调用故障不是单一的超时参数问题，而是多个生命周期边界没有共用同一份执行事实：

1. 主模型同时看到多个 executor 工具时，runtime 曾尝试从用户自然语言预先指定通道，
   造成能力咨询也可能被误判成真实执行。
2. Codex 产生的内部 `command_execution` 事件与顶层 executor 通道混在一起，用户会看到错误的 `CLI` 标签。
3. Provider 的 `tool-call-streaming-start`、完整 `tool-call`、executor 进度和 `tool-result` 可能携带不同 ID，渲染层因此生成多张状态卡。
4. 工具失败后，执行结果仍被送入异步 Provider execution callback。Provider 回调失败被重试，最终错误地落成 `provider-output-invalid`，遮盖了真实工具失败。

本设计只治理执行基础设施，不重新引入人格回复模板。用户可见的固定文本仅用于透明呈现超时、Provider、工具和权限失败。

## 目标

- 工具调用只能来自主模型产生的结构化 tool call，runtime 不按用户文字预选 executor。
- Codex 的所有进度都显示为同一个 Codex 执行卡，内部 shell 只作为步骤详情。
- 一个逻辑工具调用在整个 Provider step 中只有一个 canonical `toolCallId`。
- 一个工具失败回合只产生一次工具失败终态，不再追加 Provider 输出格式异常。
- Codex 长命令有持续、可理解的实时反馈，并且活动步骤不会被错误的全局 idle watchdog 杀死。
- 工具失败不进入 WorkingMemory 长期队列、LongTermMemoryRecall、persona 或 LoRA 数据。

## 非目标

- 不把所有对话改成固定关键词路由。
- 不让 Memory Workbench 成为工具 owner。
- 不把工具失败包装成人格化安慰语。
- 不在本轮替换整个 xsAI Provider 实现。

## 方案

### 1. Model-owned tool selection

主对话向 Provider 提供完整且真实可用的工具 registry，保持 `toolChoice` 为自动选择。
runtime 不读取用户自然语言来生成通道约束，也不因出现 `Codex`、`CLI` 或
`Claude Code` 等词就过滤工具或自动 dispatch。

能力咨询由模型根据对话上下文与 capability facts 直接回答；具体执行委托则由模型产生
对应 executor 的结构化 tool call。工具 owner 继续负责权限、风险、审计、取消和终态。

### 2. Stable tool-call identity

main process 继续作为 identity owner。registry 合并规则按以下优先级执行：

1. 已知 provider/executor ID 的 alias。
2. 同工具名、同 arguments fingerprint、尚未结算的唯一记录。
3. 只有无法消歧时才生成新的 synthetic ID。

不同层传来的 provider ID 不再因为“已有另一个 ID”而强制拆成两个调用；并发且参数相同的多个调用仍因无法唯一匹配而保持独立。

### 3. Progress protocol

所有 progress 事件携带：

- `toolCallId`: canonical identity
- `toolName`: 顶层 executor，例如 `executor_run_codex`
- `adapterEventType`: Codex 内部事件，例如 `item.started`
- `itemType`: `command_execution`、`reasoning` 等
- `summary`: 当前步骤安全摘要
- `signal`: `liveness`、`semantic-progress` 或 `terminal`

renderer 只把它投影成一张状态卡：

- 以 `toolCallId` upsert；
- terminal 后忽略迟到的 running/liveness；
- 同一 turn 的重复 terminal 不新增卡；
- Codex 的 shell 命令只作为详情，不能覆盖顶层 channel。

Codex adapter 在活动 item 没有新 JSONL 事件时发送 heartbeat snapshot，展示正在运行的当前 item，同时不重置 semantic idle 预算。活动 item 存在时 idle timer 必须重新安排 active-step timer，不能直接触发全局 idle timeout。

### 4. Failure settlement

main chat run 是前台工具调用的唯一终态 owner。工具失败时：

1. emit 一次 `tool-result` 和一次 `tool-execution` failure surface；
2. 结束当前 Provider step；
3. 禁止本轮再进入普通结构化回复验证；
4. failure learning policy 全部关闭。

后台 execution callback 只用于成功的、尚未 inline surfaced 的任务。失败、取消、阻塞和超时任务直接写入透明 infrastructure failure surface，不重试 Provider 生成，不落成 `provider-output-invalid`。成功回调如果 Provider 没有生成可见回复，最多按现有预算重试，但最终使用 `provider-continuation-incomplete` 或 `provider-continuation-timeout`，而不是格式异常。

## 数据流

```text
user text
  -> prepared main chat execution
  -> provider autonomous tool selection
  -> provider tool call
  -> canonical toolCallId
  -> executor task thread
  -> adapter progress (top-level channel + inner step)
  -> structured tool result
  -> provider continuation OR one transparent terminal failure
  -> renderer projection / Workbench audit
```

失败分支不会进入：

```text
failure surface -X-> long-term memory
failure surface -X-> persona candidate
failure surface -X-> LoRA manifest
```

## 参考模式

实现遵循成熟 agent harness 的共同边界：

- OpenAI Responses/function calling：使用稳定的 function-call ID 将工具调用和结果配对。
- Anthropic tool use：`tool_use_id` 与 `tool_result` 一一对应，工具错误是工具结果事实。
- Vercel AI SDK：以 step 为单位驱动多步工具循环，并在 step finish 处记录终态。
- LangGraph durable execution：执行状态、检查点和恢复身份与 UI 投影分离。
- Codex JSONL：保留 turn、item 和 command 的层级，顶层 agent channel 不被内部 shell 步骤替换。

## 验收标准

1. “你可以用 Codex 做什么”不会被 runtime 自动转换成 Codex 执行。
2. “请用 Codex 检查当前仓库”可由 Provider 选择 `executor_run_codex`。
3. 同一工具的 start/call/progress/result 只显示一张执行卡。
4. Codex 内部 shell 失败显示为 `Codex / ...` 的步骤或真实 Codex failure，不显示顶层 CLI。
5. Codex timeout、Provider timeout、工具失败分别显示真实错误码和环节。
6. 任意单次工具失败不会追加 `Model output format was invalid`。
7. 失败 turn 不进入长期记忆、persona 和 LoRA。

## 2026-08-09 安装包真实会话复盘

安装包中的真实 Codex 会话证明 adapter 已经能够完成长任务：

- 只产生一个 canonical `toolCallId`；
- 持续收到 command、web search、assistant result 和 heartbeat；
- 约 282 秒后收到 `turn.completed`；
- executor 随后产生唯一成功终态。

真正的卡死发生在工具结果交回主 Provider 之后：

1. Provider continuation 收到首个 `text-delta` 时，旧状态机会清除 deadline；
2. 后续若 Provider 不再发送事件，也不发送 `finish`，当前回合会永久悬挂；
3. 同时 terminal task thread 被无条件加入 execution delivery，后台 callback 与前台
   Provider continuation 竞争同一个用户可见回复；
4. 后台 callback 仍要求结构化输出，因此竞争失败时可能产生冗余的格式异常面。

根修复增加两个明确协议。

### Provider continuation state machine

continuation 使用三态：

```text
none
  -> awaiting-progress
  -> streaming
  -> none (terminal finish)
```

- `awaiting-progress` 和 `streaming` 都受同一 semantic idle watchdog 保护；
- 每个有效 continuation delta 重置 idle deadline；
- heartbeat 不重置 semantic idle；
- continuation 触发下一次工具调用时暂停 Provider deadline，工具结果返回后重新进入
  `awaiting-progress`；
- 只有 `finish`、明确错误、取消或 timeout 可以结算该状态。

### Result delivery ownership

每个 task-thread dispatch 必须携带：

```ts
resultDeliveryMode: 'inline' | 'callback'
```

- `inline`：当前主对话 Provider tool loop 是唯一回复 owner；
- `callback`：后台任务完成后由 execution delivery 负责唤醒和播报；
- owner 同时持久化到 execution runtime context；
- restore/reconcile 读取 owner，不能把已由前台展示的 inline 结果重新排入 callback；
- inline terminal 仍写 execution ledger、session mirror 和审计，只跳过第二次用户可见生成。

OpenAI Codex App Server 的 `Thread -> Turn -> Item` 生命周期、流式 item 通知、明确
`turn/completed` 和 `turn/interrupt` 进一步验证了这个方向：协议身份、进度、终态和
用户可见投影必须分层。Alicization 当前先修正自身 owner 与 continuation 状态机；
后续迁移 App Server 时复用同一 transport-neutral progress/result contract，而不是
重新设计 UI 和上层 task-thread 语义。
