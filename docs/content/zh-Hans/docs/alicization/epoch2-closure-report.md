---
title: A.L.I.C.E Epoch2 收官验收报告
description: Epoch2（M2.1/M2.2/M2.3）闭环门禁执行结果与追溯记录
---

# A.L.I.C.E Epoch2 收官验收报告（已完成 / COMPLETED）

## 1. 执行范围

- 目标版本：Epoch2 完整闭环（M2.1 + M2.2 + M2.3）
- 执行日期：2026-03-11
- 范围：`apps/stage-tamagotchi` + `packages/stage-ui`
- 结论：Epoch2 退场门禁已全部满足，可进入 Epoch3 准备阶段。

## 2. DoD 门禁勾选

### 门禁一：M2.1 感知与提示词防线
- [x] 探针隔离与降级：`child_process.exec` 超时场景（>1500ms）不会打崩 Tick Loop，稳定标记 `degraded` 并写入 warning 审计。
- [x] 上下文无损注入：10k 压测中 `system[0]` 始终保持完整 SOUL，Runtime 末尾 `Output contract (must-follow, highest priority):` 锚点稳定存在。

### 门禁二：M2.2 表现层权威广播
- [x] 单一事实源：`alicization.dialogue.responded` 仅在 `alicization_conversation_turns` 成功落库后发射。
- [x] 中断绝对阻断：Kill Switch `AbortError` 中断轮次不发射表现层事件，Renderer 监听器保持静默。
- [x] 情绪降级兜底：非法情绪输入回退 `neutral`，Live2D/TTS 不崩溃且保留 warning 审计。

### 门禁三：M2.3 银行级工具控制
- [x] 路径防穿透：`../` 与 `userData` 绝对黑名单路径直拒，返回 `{ status: 'error', code: 'ALICIZATION_TOOL_DENIED' }`，不触发 HitL 弹窗。
- [x] 单次 Token 防重放：同一 token 第二次消费返回 `accepted: false` + `reason: 'not-found'`。
- [x] 优雅拒绝对话回环：HitL 拒绝后 LLM 可接收结构化拒绝结果并继续输出致歉结构化回复，主对话链不断裂。

## 3. 验证命令与结果

```bash
pnpm -F @proj-airi/stage-ui exec vitest run src/composables/alicization-guardrails.test.ts
# PASS (15 tests)
```

```bash
pnpm -F @proj-airi/stage-tamagotchi exec vitest run src/main/services/airi/mcp-servers/index.test.ts
# PASS (15 tests)
```

```bash
pnpm -F @proj-airi/stage-tamagotchi exec vitest run src/main/services/alicization/epoch2-e2e-closure.test.ts
# PASS (2 tests)
```

## 4. 审计日志样本（测试运行期实采）

> 以下样本来自 `epoch2-e2e-closure.test.ts` 运行时捕获的 `runtimeAuditLogs`。

```json
[
  {
    "level": "warning",
    "category": "alicization.sensory",
    "action": "sample-battery-timeout",
    "message": "Failed to sample battery telemetry.",
    "payload": {
      "reason": "probe timeout"
    }
  },
  {
    "level": "warning",
    "category": "alicization.safety.permission",
    "action": "alicization.safety.permission.denied",
    "message": "Tool permission denied by user.",
    "payload": {
      "riskLevel": "danger",
      "toolName": "write_file",
      "reason": "user-denied",
      "path": "/.../secrets.txt",
      "argumentsSummary": {
        "kind": "object",
        "keys": [
          "path",
          "content"
        ]
      }
    }
  }
]
```

## 5. 端到端主链路闭环结论

- [x] 完成 `[系统感知 -> 高危工具请求 -> HitL 弹窗 -> 用户拒绝 -> LLM 致歉(apologetic) -> Renderer 接收 alicization.dialogue.responded]` 闭环模拟。
- [x] 断言全程无 `Unhandled Promise Rejection`。
- [x] 断言流式中断场景下 Renderer `alicizationDialogueResponded` 监听器未被调用。
