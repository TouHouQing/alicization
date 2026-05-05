# Alicization Digital Life Filesystem Tool Surface Requirement (2026-04-08)

## Context
- 用户目标持续是“真正可执行、可回传、可追溯”的数字生命工具系统。
- 当前主网关工具层虽然有 `mcp_call_tool`，但对文件操作仍是低层透传：
  - 模型需要记住 MCP 合格工具名和参数细节，容易调用失败。
  - 返回载荷未做统一归一化，文件内容过大时不易消费。
  - 缺少 read/edit/write 的一等工作流（含并发防护与可解释失败）。

## Goal
在 Alicization 主网关补齐一等文件操作工具面，达到“像 Codex/OpenClaw/nekoclaw 一样可直接用”的体验：
1. 提供语义化文件工具（读/写/编辑/列目录）而不是只暴露裸 `mcp_call_tool`。
2. 文件工具返回结构稳定，可提供 hash、截断标记、错误解释。
3. 编辑路径具备最小并发防护（`expectedHash`）与 deterministic read-modify-write 语义。

## Deliverables
1. `main-chat-execution-surface.ts` 增强
- 新增工具：
  - `filesystem_read_file`
  - `filesystem_write_file`
  - `filesystem_edit_file`
  - `filesystem_list_directory`
- 新增 MCP 调用候选回退和参数候选回退机制。
- 新增文件输出归一化：文本提取、字节统计、hash 计算、截断标记。
- `filesystem_edit_file` 使用 read-modify-write 路径，支持 `expectedHash` 校验。
2. 执行路由系统提示增强
- 指引优先使用 `filesystem_*`，`mcp_call_tool` 作为未覆盖能力的兜底。
3. 回归测试
- `main-chat-execution-surface.test.ts` 覆盖：
  - 工具注册
  - 文件读结果归一化
  - 编辑写回路径
  - 目录列举 fallback

## Constraints
- 保持 Alicization P0-P4 主治理不被削弱。
- 不移除现有 `mcp_call_tool`。
- 不回滚用户现有 in-flight 脏工作树改动。

## Acceptance Criteria
1. 主网关工具集中可见 `filesystem_*` 一等工具。
2. 文件读工具返回中含 `contentHash`、`byteLength`、`truncated` 等关键字段。
3. 文件编辑在命中替换时会触发写回，并返回 `replacedCount` 与新 hash。
4. 目录列举在主工具名不可用时可通过候选 fallback 成功。
5. 目标测试通过。

## Product Acceptance Criteria
- 用户请求“读文件/改文件/看目录”时，Alicization 优先走语义化文件工具并给出可消费结果。
- 工具失败时返回明确错误码与原因，而非含糊拒答。

## Manual Spot Checks
1. 让模型读取文件，确认返回包含哈希与截断元信息。
2. 让模型执行精确替换编辑，确认替换计数与写回结果一致。
3. 让模型列目录，在 fallback 场景确认自动切换工具名成功。

## Non-goals
- 本轮不改 MCP 安全策略核心实现。
- 本轮不新增新的外部执行 channel。
- 本轮不做 UI 展示层改版。

## Autonomy Mode
- interactive_governed

## Inferred Assumptions
- 现有 `filesystem::read_file` / `filesystem::write_file` 工具在 MCP 侧已具备基础可用性。
- 文件操作工具封装可在本轮作为执行面增量升级，不影响现有执行线程治理。
