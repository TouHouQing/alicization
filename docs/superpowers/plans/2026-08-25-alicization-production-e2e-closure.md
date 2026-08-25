# Alicization Production E2E Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Alicization 的本地生产闭环从“单元测试覆盖”推进到可真实试用、可解释、可恢复的对话、记忆、执行和训练治理链路。

**Architecture:** 继续以 `apps/stage-tamagotchi` 为唯一生命主链路，WorkingMemory 负责短期上下文，LongTermMemoryRecall 负责长期检索，Memory Workbench 只做聚合和治理展示。所有用户可见内容只来自模型自然回复或明确错误状态；内部诊断、验收 cue 和结构化状态只能留在审计数据中。Provider、执行器、记忆和 LoRA 治理都通过可观测的生命周期事件连接，失败必须可分类、可重试、可取消、可恢复。

**Tech Stack:** Electron/Vue/TypeScript、Eventa、Valibot、SQLite、Vitest、pnpm workspace、现有 xsAI provider 和 Codex/CLI executor adapter。

---

### Task 1: 提交 Provider 验证超时修复

**Files:**
- Modify: `packages/stage-ui/src/libs/providers/validators/openai-compatible.ts`
- Test: `packages/stage-ui/src/libs/providers/validators/openai-compatible.test.ts`

- [x] **Step 1: 运行回归测试确认当前修复有效**

Run: `pnpm exec vitest run packages/stage-ui/src/libs/providers/validators/openai-compatible.test.ts`

Expected: 10 tests pass.

- [x] **Step 2: 只提交 Provider 两个业务文件**

Run: `git add packages/stage-ui/src/libs/providers/validators/openai-compatible.ts packages/stage-ui/src/libs/providers/validators/openai-compatible.test.ts && git commit -m "fix(providers): bound validation requests"`

Expected: commit succeeds; `.serena/project.yml`、`.claude-flow/`、`.serena/memories/memory_maintenance.md`、`index.js` remain unstaged.

### Task 2: 真实本地对话 E2E 试用与根因记录

**Files:**
- Inspect: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
- Inspect: `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-prelude.ts`
- Inspect: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/persona-runtime-main-chat.e2e.test.ts`

- [ ] **Step 1: 先用现有测试和本地 API 配置复现首轮、连续轮、错误轮**

Run: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/persona-runtime-main-chat.e2e.test.ts`

Record: provider 请求开始/结束、WorkingMemory 输入输出、LongTermMemoryRecall 查询和最终 transport 事件，不能用 mock 结果冒充真实调用。

- [ ] **Step 2: 用失败测试固定真实链路契约**

要求：首轮消息进入同一个主会话；压缩快照进入下一轮 provider 请求；长期召回只在相关时注入；Provider 失败以明确错误状态结束，不生成成功样式 fallback。

- [ ] **Step 3: 根据边界日志修复唯一根因并跑 E2E**

Run: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/persona-runtime-main-chat.e2e.test.ts`

### Task 3: 清理用户可见内部 cue 和验收文本

**Files:**
- Inspect/Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-mind-state.ts`
- Inspect/Modify: `apps/stage-tamagotchi/src/main/services/alicization/project-state-brief.ts`
- Inspect/Modify: `apps/stage-tamagotchi/src/main/services/alicization/alicization-runtime-architecture.ts`
- Inspect/Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-mind-state-reflection.ts`
- Inspect/Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench*.ts`
- Test: matching legacy fixture and renderer tests under `apps/stage-tamagotchi/src/main/services/alicization/`

- [x] **Step 1: 写失败测试证明普通记忆页和对话 transport 不泄露内部 cue**

覆盖 `请只回复：收到。`、能力验收句、`emotional_tension`、`relationship`、`belief-conflict`、`reply_motive` 等内部值；审计接口可以保留结构化字段，但普通用户投影必须为空或自然化后的摘要。

- [x] **Step 2: 在投影边界过滤内部诊断，不删除合法内部状态**

过滤必须发生在用户可见 projection/transport 层，而不是破坏 WorkingMemory、LongTermMemory 或审计数据库的 owner 数据。

- [x] **Step 3: 跑记忆 Workbench、对话和旧 fixture 回归**

Run: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench*.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat*.test.ts`

### Task 4: 压缩快照进入下一轮主链路的 E2E

**Files:**
- Inspect/Modify: `apps/stage-tamagotchi/src/main/services/alicization/working-memory-compression-behavior-harness.ts`
- Inspect/Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/working-memory-compression-behavior-harness.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`

- [ ] **Step 1: 添加 provider request capture 失败测试**

第一轮产生压缩快照后，第二轮请求必须包含压缩后的任务、纠正、失败透明和未完成事项；不得把内部 JSON 原样作为用户回复。

- [ ] **Step 2: 修复快照生命周期和请求装配**

WorkingMemory 仍是 owner；主聊天 runtime 只读取当前快照并组装 provider 输入，不能另造第二套短期记忆。

- [ ] **Step 3: 验证下一轮回复/召回行为确实受压缩快照影响**

Run: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/working-memory-compression-behavior-harness.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`

### Task 5: Coding Agent 真实调用闭环

**Files:**
- Inspect/Modify: `apps/stage-tamagotchi/src/main/services/alicization/executor-runtime.ts`
- Inspect/Modify: `apps/stage-tamagotchi/src/main/services/alicization/executor-adapters/`
- Inspect/Modify: `packages/stage-shared/src/alicization-execution-intent.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/executor-adapters/codex.real-cli.integration.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/provider-tool-compatibility.test.ts`

- [ ] **Step 1: 固定“能力询问不执行、明确编码请求才执行”的失败测试**

能力范围问题只返回模型自然回复；只有包含明确目标、工作区或修改/编写意图时才创建 executor job。

- [ ] **Step 2: 以结构化 job 生命周期重构 CLI 调用**

状态至少包含 queued/running/progress/succeeded/failed/cancelled/timed_out；stdout/stderr 和 semantic progress 分开记录；每个 job 使用独立 abort/cancel 信号，不以固定回复模板代替结果。

- [ ] **Step 3: 补 retry/timeout/cancel/只读 smoke/最小 workspace-write smoke**

Run: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/executor-adapters/codex.real-cli.integration.test.ts apps/stage-tamagotchi/src/main/services/alicization/provider-tool-compatibility.test.ts`

### Task 6: LoRA/Persona dataset 真实治理闭环

**Files:**
- Inspect/Modify: `apps/stage-tamagotchi/src/main/services/alicization/persona-training-dataset-db.ts`
- Inspect/Modify: `apps/stage-tamagotchi/src/main/services/alicization/persona-training-runtime.ts`
- Inspect/Modify: `apps/stage-tamagotchi/src/main/services/alicization/persona-training-dataset-quality.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/persona-training-dataset-db.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/mlx-persona-runtime-main-chat.e2e.test.ts`

- [ ] **Step 1: 为 export/activate/rollback/revoke/consent/PII/schema/version/dedupe 写失败测试**

raw transcript、review candidate、失败 fallback 和未授权样本必须被拒绝或隔离；训练只能接收质量通过且 consent 有效的 manifest。

- [ ] **Step 2: 将 manifest gate 接到真实 dataset store 和训练入口**

激活、回滚和撤销都必须留下审计事件；失败训练不得改变 active manifest。

- [ ] **Step 3: 运行 persona/LoRA runtime E2E 与导出快照回归**

Run: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/persona-training-dataset-db.test.ts apps/stage-tamagotchi/src/main/services/alicization/mlx-persona-runtime-main-chat.e2e.test.ts`

### Task 7: 长期记忆和向量规模化验证

**Files:**
- Inspect/Modify: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-search-index.ts`
- Inspect/Modify: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-vector-index-adapter.ts`
- Inspect/Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-embedding-reindex-runtime.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/memory-semantic-scale-soak-runtime.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/memory-scope-fuzz-integration.test.ts`

- [ ] **Step 1: 先运行现有 10k/100k、scope fuzz、reindex job 测试找真实缺口**

Run: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-semantic-scale-soak-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-scope-fuzz-integration.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-embedding-reindex-runtime.test.ts`

- [ ] **Step 2: 修复真实 DB/index/job 缺口**

分页和搜索必须在 DB/index 层完成；模型切换不能混用向量空间；reindex 必须支持 progress/cancel/retry/dead-letter/crash recovery；memory_facts、consolidations、vectors、review 和 persona dataset 必须同时按 cardId/userId 隔离。

- [ ] **Step 3: 记录 p95/p99 和恢复结果**

报告必须输出样本规模、provider/model/dimensions、延迟分位数、失败类型、重试次数、dead-letter 数量和恢复后的剩余工作。

### Task 8: 最终验证、App 构建和真实试用

**Files:**
- Inspect: all changed files from Tasks 1-7
- Build artifacts: `apps/stage-tamagotchi`

- [ ] **Step 1: 运行分层测试和 typecheck**

Run: `pnpm -F @proj-alicization/stage-ui typecheck`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck:node`, and the targeted Vitest suites from Tasks 2-7.

- [ ] **Step 2: 构建、签名并启动 macOS App**

验证首屏、首条消息、多轮短期记忆、长期召回、压缩后下一轮、明确/非明确 Coding Agent 请求、失败透明展示和 Memory Workbench 投影。

- [ ] **Step 3: 运行 `git diff --check`、审阅排除文件并按小步 Conventional Commit 提交**

不得提交 `.serena/project.yml`、`.claude-flow/`、`.serena/memories/memory_maintenance.md`、`index.js` 或真实密钥。
