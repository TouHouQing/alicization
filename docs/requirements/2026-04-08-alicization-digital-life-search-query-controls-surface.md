# Alicization Digital Life Search Query Controls Surface Requirement (2026-04-08)

## Context
- 现有 `filesystem_search_files` 仅支持基础关键词搜索，缺少大小写、正则、include/exclude 等检索控制。
- 不同 MCP 文件系统实现对搜索参数字段命名差异较大，若只发单一参数形态，成功率不稳定。
- 用户目标持续是把 Alicization 工具面做成“可执行、可回传、可治理”的数字生命系统。

## Goal
增强 `filesystem_search_files` 的查询控制能力，并提高对异构 MCP 参数接口的兼容性。

## Deliverables
1. 执行面增强
- `filesystem_search_files` 新增参数：`caseSensitive`、`regex`、`includeGlobs`、`excludeGlobs`、`pathMode`。
- 参数归一化：去空、去重、布尔标准化。
- MCP 调用候选参数扩展，兼容 `query/pattern/text` 与 `include*/exclude*` 字段族。
2. 结果契约增强
- 返回 payload 增加归一化后的查询控制字段与 `filteredOutCount`。
- 结果路径支持 `pathMode`（`raw`/`relative`/`absolute`）。
3. 测试增强
- 覆盖搜索控制参数透传与归一化回传断言。

## Constraints
- 保持 Alicization P0-P4 不退化。
- 继续保留 `mcp_call_tool` escape hatch。
- 不回滚无关脏改动。

## Acceptance Criteria
1. `filesystem_search_files` 支持并回传查询控制参数。
2. 搜索调用在 fallback 路径下可带上控制参数。
3. 目标测试与 typecheck 通过。

## Product Acceptance Criteria
- 用户请求“正则/大小写/范围过滤搜索”时，Alicization 能执行并给出可消费结果。

## Manual Spot Checks
1. 启用 `regex=true` + `caseSensitive=true` 做搜索，检查结果元数据一致。
2. 配置 include/exclude 后验证返回中有归一化后的过滤条件。
3. 将 `pathMode=relative`，确认输出路径相对化。

## Non-goals
- 本轮不实现全文索引或语义检索。
- 本轮不做 UI 面板改造。

## Autonomy Mode
- interactive_governed

## Inferred Assumptions
- MCP 服务端至少有一种搜索工具别名可用（`search_files`/`search`/`grep` 等）。
