# Alicization Digital Life Filesystem Patch DryRun Surface Requirement (2026-04-08)

## Context
- 目前 `filesystem_patch_file` 已支持顺序补丁写回，但缺少“预演不落盘”能力。
- 在高风险批量修改中，模型需要先验证补丁是否命中、会改多少处、预期内容是否合理，再决定是否真实写入。
- 用户目标是持续逼近 Codex/OpenClaw/nekoclaw 风格：先计划、再执行、可追溯可回传。

## Goal
为 `filesystem_patch_file` 增加 `dryRun` 模式，支持补丁预演与结果回传（不写文件）。

## Deliverables
1. 执行面增强
- `filesystem_patch_file` 新增参数：`dryRun`、`maxPreviewBytes`。
- dryRun 返回：`writeApplied=false`、`nextHash`、`preview`、`previewTruncated` 等。
- dryRun 仅做读与计算，不触发写入。
2. 行为一致性
- patch 内部校验与统计逻辑复用正式写回路径，确保 dryRun/real-run 结果一致。
- `changes[].oldText` 校验允许空白字符替换（仅禁止真正空字符串）。
3. 回归测试
- 覆盖 dryRun 成功路径：确认未调用 `filesystem::write_file`。

## Constraints
- 保持 Alicization P0-P4 治理不削弱。
- 不移除 `mcp_call_tool`。
- 不回滚无关脏改动。

## Acceptance Criteria
1. `filesystem_patch_file` 参数包含 `dryRun`。
2. dryRun 返回结构化预演结果并明确 `writeApplied=false`。
3. dryRun 不会触发 MCP 写操作。
4. 目标测试通过。

## Product Acceptance Criteria
- 用户要求“先预览补丁结果再应用”时，Alicization 可以真实预演并返回可消费结果。

## Manual Spot Checks
1. dryRun 执行后检查文件未变、返回内容已更新预览。
2. 同一补丁在 dryRun 与 real-run 下替换计数一致。

## Non-goals
- 本轮不引入多文件原子事务 patch。
- 本轮不改 UI 交互层。

## Autonomy Mode
- interactive_governed

## Inferred Assumptions
- MCP 读能力稳定可用，可支撑 dryRun 的基线输入。
