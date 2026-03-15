---
title: A.L.I.C.E Epoch1 收官验收报告
description: Epoch1 最终收官门禁执行结果与可追溯记录
---

# A.L.I.C.E Epoch1 收官验收报告（最终版）

## 1. 执行范围

- 目标版本：Epoch1 最终收官执行计划（完整闭环版）
- 执行日期：2026-03-09
- 范围：`apps/stage-tamagotchi` + `packages/stage-ui`

## 2. 关键门禁结论

1. 对话 strict 收口：通过
实时请求在 strict 下走人格化拒绝路径，不进入 execution-engine/MCP，并写入 `policyLocked=epoch1-strict-realtime`。
2. Kill Switch 零落盘：通过
流式中断后不写 `conversation_turns`、不写 memory、不保留半截 turn；恢复后新轮次可继续。
3. 情绪透传审计双模式：通过
默认仅落 `emotion/parsePath/contractFailed/turnId`；`ALICIZATION_DEBUG_AUDIT=true` 才落 `thought` 原文。
4. Prompt Budget SOUL 锚点与 Safe Mode：通过
10k 长会话下 `system[0]` 始终为完整 SOUL；SOUL 过载触发安全降级并写 `alicization.budget.overflow_soul`。
5. 休眠态子链路一致性：通过
`spark:notify` 休眠时直接丢弃不入队；异步记忆抽取 flush 在休眠时跳过并审计。

## 3. 验证命令与结果

```bash
pnpm -F @proj-airi/stage-ui exec vitest run \
  src/stores/chat.test.ts \
  src/composables/alicization-guardrails.test.ts \
  src/composables/alicization-prompt-composer.test.ts \
  src/stores/character/orchestrator/index.test.ts \
  src/stores/alicization-epoch1.test.ts \
  src/stores/alicization-execution-engine.test.ts
# 结果：PASS
```

```bash
pnpm -F @proj-airi/stage-tamagotchi exec vitest run \
  src/main/services/alicization/runtime.test.ts \
  src/main/services/alicization/db.test.ts \
  src/main/services/airi/mcp-servers/index.test.ts
# 结果：PASS
```

```bash
pnpm -F @proj-airi/stage-tamagotchi typecheck
# 结果：PASS（存在历史 volar ESM 警告，不阻断）
```

```bash
pnpm -F @proj-airi/stage-tamagotchi build
# 结果：PASS（存在历史构建告警，不阻断）
```

```bash
pnpm -F @proj-airi/stage-tamagotchi build:mac
# 结果：PASS
# 产物：
# - apps/stage-tamagotchi/dist/AIRI-0.9.0-alpha.5-darwin-arm64.dmg
#   mtime: 2026-03-09 12:43:34 +0800
# - apps/stage-tamagotchi/dist/AIRI-0.9.0-alpha.5-arm64-mac.zip
#   mtime: 2026-03-09 12:46:42 +0800
```

## 4. 非阻断已知项

1. `pnpm -F @proj-airi/stage-ui typecheck` 与 `pnpm -F @proj-airi/stage-tamagotchi typecheck` 过程中存在上游 `@vue-macros/volar` ESM 兼容告警（当前环境历史问题，不阻断）。
2. 根级 `pnpm lint:fix` 受 `oxlint` native binding 缺失与仓库其他目录历史 lint 问题影响失败，不属于本次 Alicization Epoch1 变更引入。
3. `build:mac` 日志中的 Xcode/asset/plugin timing 警告为环境与工具链常见告警，不影响打包产物可运行性。

## 5. 退场标准对照

1. 冷启动一致性：满足（SOUL 真源 + SQLite 持久化路径贯通，重启后关键状态保持）。
2. 情绪透传：满足（每轮审计记录 emotion/parsePath/contract 状态，可选 debug thought）。
3. 记忆不爆栈：满足（Prompt Budget + SOUL Safe Mode + Memory Pruning + 10k 锚点门禁）。
4. 一键拔电源：满足（Kill Switch 广播中断 + 零落盘 + spark 链路休眠丢弃 + 恢复后可用）。
