# Alicization Digital Life Filesystem Search Tool Surface Requirement (2026-04-08)

## Context
- 现有主网关已具备 `filesystem_read_file` / `filesystem_write_file` / `filesystem_edit_file` / `filesystem_list_directory`。
- 但缺失“按内容检索代码/文件”的一等工具，模型仍需退回 `mcp_call_tool`，工具名和参数形态不稳定，失败率高。
- 用户目标是继续向 Codex/OpenClaw/nekoclaw 风格靠拢：工具调用要直接、稳定、可解释。

## Goal
在 Alicization 主网关补齐一等文件搜索能力，确保模型可直接执行“搜索文件内容”任务并返回结构化结果。

## Deliverables
1. `main-chat-execution-surface.ts` 增强
- 新增 `filesystem_search_files`。
- 支持 MCP 工具名候选回退与参数形态候选回退。
- 统一结果归一化（`matches` / `matchCount` / `totalMatchCount` / `output` / `truncated`）。
- 保持输出字节预算控制与显式 `[ALICIZATION_NOTICE]` 截断提示。
2. 执行路由提示增强
- `ALICIZATION_EXECUTION_ROUTER` 明确将 `filesystem_search_files` 纳入首选文件操作工具集。
3. 回归测试
- `main-chat-execution-surface.test.ts` 覆盖搜索工具注册和 fallback 成功路径。

## Constraints
- 保持 Alicization P0-P4 治理约束不削弱。
- 不移除 `mcp_call_tool` 兜底能力。
- 不回滚工作树既有脏改动。

## Acceptance Criteria
1. 工具注册包含 `filesystem_search_files`。
2. 搜索工具在首选 MCP 名称失败时可回退至候选工具名并成功返回。
3. 搜索结果返回结构稳定，包含 `matches` 与匹配计数元数据。
4. 目标测试通过。

## Product Acceptance Criteria
- 用户提出“在项目里搜关键字/定位文件内容”时，Alicization 可执行真实搜索并回传可消费结果，而非泛化拒答。

## Manual Spot Checks
1. 请求“在某目录递归搜索关键词”，检查返回包含路径与行级线索。
2. 在工具名 fallback 场景下确认自动回退成功。

## Non-goals
- 本轮不引入 AST/语义索引搜索。
- 本轮不改 UI 层展示。

## Autonomy Mode
- interactive_governed

## Inferred Assumptions
- MCP 文件系统服务至少提供一个可工作的“搜索/grep”别名工具。
