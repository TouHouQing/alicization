# Alicization Digital Life Filesystem Patch Tool Surface Requirement (2026-04-08)

## Context
- 主网关已经具备 read/write/edit/list/search 一等文件工具，但多步批量改写仍需模型手动编排多次 `filesystem_edit_file`。
- 对于“分多处替换、可选忽略未命中、一次写回”的任务，目前操作颗粒度偏粗，不利于稳定执行与回传解释。
- 用户目标是持续向 Codex/OpenClaw/nekoclaw 的强工具链靠拢，要求可执行、可验证、可追溯。

## Goal
在 Alicization 主网关新增 `filesystem_patch_file`，提供顺序补丁式文件修改能力（deterministic read-modify-write），并返回结构化补丁结果。

## Deliverables
1. `main-chat-execution-surface.ts` 增强
- 新增 `filesystem_patch_file`。
- 新增 patch 执行 helper，支持：
  - 顺序 `changes[]` 应用
  - `expectedHash` 冲突守卫
  - `ignoreMissing`（未命中时可跳过）
  - 统一失败码与统计字段（`appliedChanges` / `skippedChanges` / `totalReplacedCount`）
2. 路由提示增强
- 将 `filesystem_patch_file` 加入文件任务首选工具集合。
3. 回归测试
- 工具注册包含 `filesystem_patch_file`。
- patch 成功路径覆盖替换统计与写回调用。
- 空补丁输入失败路径覆盖。

## Constraints
- 不削弱 Alicization P0-P4 治理约束。
- 保留 `mcp_call_tool` 兜底路径。
- 不回滚无关脏改动。

## Acceptance Criteria
1. 主网关工具可见 `filesystem_patch_file`。
2. patch 成功返回结构化补丁统计与 hash 演进信息。
3. 空变更输入明确失败并返回稳定错误码。
4. 目标测试通过。

## Product Acceptance Criteria
- 用户要求“按补丁批量改文件”时，Alicization 能一次执行并返回可解释结果，而不是只给泛化文本回复。

## Manual Spot Checks
1. 对同一文件执行多条顺序替换，确认替换计数与结果一致。
2. 在 `ignoreMissing=false` 下，验证未命中时会给出明确失败。
3. 在 `ignoreMissing=true` 下，验证未命中项被跳过且总替换统计正确。

## Non-goals
- 本轮不引入 AST 级 patch。
- 本轮不改 UI 展示层。

## Autonomy Mode
- interactive_governed

## Inferred Assumptions
- MCP 侧 `filesystem::write_file` 在当前运行环境可用。
