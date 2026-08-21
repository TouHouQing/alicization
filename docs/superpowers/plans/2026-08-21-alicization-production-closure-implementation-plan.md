# Alicization 生产闭环实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task by task. 每个任务先写失败测试，再实现最小行为，最后做专项审阅。

**目标：** 把 Persona/LoRA、Memory Workbench 人工回归、100k 语义检索、Codex 长任务和 embedding reindex 阶段推进到可真实验收的本地生产闭环。

**架构：** WorkingMemory、LongTermMemoryRecall、Persona/LoRA、Codex executor 和 LongTermMemorySearchIndex 保持各自 owner；Memory Workbench 只聚合状态、写入人工治理动作和展示证据。真实运行必须落到隔离 DB、真实进程、真实向量 adapter 或真实安装包，不用 fake 结果冒充生产完成。

**技术栈：** TypeScript、Electron、Vue 3、Eventa、SQLite/sqlite-vec、Vitest、Node child process、Python MLX/Transformers trainer、electron-builder。

---

## 任务 1：真实 Persona/LoRA trainer 与运行时诊断

**文件：**
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/persona-training-process-executor.ts`
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/persona-training-pipeline-gate.ts`
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/llama-cpp-persona-runtime.ts`
- 修改：`packages/stage-shared/src/alicization-memory-workbench-contracts.ts`
- 修改：`apps/stage-tamagotchi/src/renderer/pages/settings/modules/components/persona-training-executor-config.vue`
- 修改：`apps/stage-tamagotchi/src/renderer/pages/settings/modules/components/persona-training-runs.vue`
- 修改：`packages/i18n/src/locales/zh-Hans/settings.yaml`
- 修改：`packages/i18n/src/locales/en/settings.yaml`
- 修改：`apps/stage-tamagotchi/electron-builder.config.ts`
- 新增：`apps/stage-tamagotchi/resources/persona-training/mlx-lm-trainer.py`
- 新增：`apps/stage-tamagotchi/src/main/services/alicization/persona-training-runtime-diagnostics.ts`
- 测试：对应 executor、runtime、pipeline、loader、renderer 测试

- [x] 写测试证明训练器配置会保存训练参数快照，连接测试会区分 Python 缺失、`mlx_lm` 缺失、模型路径不可读和协议失败。
- [x] 写测试证明真正的 MLX wrapper 接收已通过治理门的数据集，拒绝 raw transcript、review queue、failure artifact 和未授权样本。
- [x] 写测试证明训练成功后只接受真实 artifact manifest/hash，加载器启动真实本地推理进程；Provider 不兼容时明确显示 unsupported，不伪装为已激活。
- [x] 增加 MLX LoRA 参数：`iters`、`learningRate`、`loraLayers`、`batchSize`、`maxSeqLength`、`maskPrompt`、`seed`，在 run record 中保存不可变 config snapshot。
- [x] 让运行时诊断提供可执行的安装/修复提示，但不在后台静默安装依赖；资源包只携带 wrapper 和说明。
- [ ] 运行真实小模型 smoke training，完成 `dataset export -> train -> artifact validate -> activate -> chat route -> rollback`；本机 Python 3.13 当前未安装 `mlx`/`mlx_lm`，已验证透明阻塞诊断，不写成功状态。

## 任务 2：Memory Workbench 黄金标注与月度回归 pack

**文件：**
- 修改：`packages/stage-shared/src/alicization-memory-workbench-contracts.ts`
- 修改：`apps/stage-tamagotchi/src/shared/eventa.ts`
- 修改：`packages/stage-ui/src/stores/alicization-bridge.ts`
- 修改：`packages/stage-ui/src/stores/alicization-memory-workbench.ts`
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-memory.ts`
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/memory-production-trial-runner.ts`
- 修改：`apps/stage-tamagotchi/src/renderer/pages/settings/modules/memory.vue`
- 修改：`packages/i18n/src/locales/zh-Hans/settings.yaml`
- 修改：`packages/i18n/src/locales/en/settings.yaml`
- 测试：gold label、DB、Eventa、store、Workbench 页面和 production trial 测试

- [x] 先让错误测试失败：`missing` 必须选择 expected memory；`unwanted` 才能表达 expected 为空；handler 必须独立透传 `reason`。
- [x] 将标注绑定到真实 `sessionId/turnId/decisionTraceId`，保存 assistant reply、retrieved evidence snapshot、surfaced IDs、expected IDs、forbidden IDs、rank reason、model/index version。
- [x] 添加 `humanConfirmed`、`supersededAt`、`excludedFromRegression` 和审计事件；重复或冲突标注只能 supersede，不能静默并列评分。
- [x] 新增不可变月度 pack 表和 hash：`packId/revision/month/frozenAt/contentHash/itemsSnapshot`；pack 冻结后新增标注不改变旧 pack。
- [x] UI 用中文展示“用户问题、她的回复、实际召回证据、为什么召回”，四个小白标签分别引导选择正确/遗漏/错误线程或过期/不该提。
- [x] 生产 trial 显式接收 `packId`；没有人工确认标签时返回 `not-run`，不能由空数组得到“通过”。
- [x] 验证 200+ 标签分页、2000+ pack 无静默截断，以及 card/session/turn/evidence scope 隔离。

## 任务 3：100k 语义向量真实规模门

**文件：**
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/memory-semantic-scale-job-runtime.ts`
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/memory-semantic-scale-soak-runtime.ts`
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/memory-quality-workbench-health.ts`
- 修改：`apps/stage-tamagotchi/src/renderer/pages/settings/modules/memory.vue`
- 测试：真实 sqlite-vec adapter、job execution、recovery、scale governance

- [x] 先用真实 adapter 写一个 100k RED 门：必须报告完成数、P95/P99、Recall@K、错误召回率、磁盘、内存峰值和 native index 状态。
- [x] 执行真实 100k job，记录持久化 JSON report；不得用纯内存 fake provider 或只扩大 source window。
- [x] 在 100k 运行中验证 cancel、retry、dead-letter、crash recovery、lease 恢复和模型切换 reindex。
- [x] Workbench 展示 tier、阶段、进度、最后错误、资源指标和是否达到质量门。
- [x] 资源超限或 native index 不可用时以失败/降级状态结束，不输出“通过”。

## 任务 4：真实 Codex 长任务 soak

**文件：**
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/executor-adapters/codex.ts`
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/executor-runtime.ts`
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.ts`
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/runtime-execution-delivery.ts`
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`
- 测试：真实 Codex adapter、delivery、replay、package smoke

- [x] 用真实 `codex` 可执行文件启动长任务，验证 JSONL item/command/heartbeat/terminal 全链路。
- [x] 验证一张 execution card、一次 terminal、一次 continuation、取消和超时分类，确保无 callback 竞争、无 `provider-output-invalid`。
- [x] soak 报告持久化命令数、活跃步骤、心跳间隔、首个语义进展、总耗时、重试和终态。
- [ ] 对真实安装包做一次启动、聊天、coding agent、后台继续和 Workbench 交互验收；本轮已完成 Electron/Vite 桌面构建，但尚未安装并手动验收 macOS 包。

## 任务 5：reindex projection refresh 纳入 durable job

**文件：**
- 修改：`packages/stage-shared/src/alicization-memory-workbench-contracts.ts`
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/memory-embedding-reindex-runtime.ts`
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-search-index.ts`
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.ts`
- 修改：`apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-health.ts`
- 修改：`apps/stage-tamagotchi/src/renderer/pages/settings/modules/memory.vue`
- 测试：reindex runtime、DB facade、health、renderer

- [x] 先写 RED 测试：reindex start 只创建 job，不同步阻塞；阶段必须经过 `projection-refresh-queued`、`projection-refresh-running`、`embedding-indexing`。
- [x] 将 projection refresh 和 embedding indexing 纳入同一 durable attempt，持久化阶段、进度、lastError、attempt、取消和 dead-letter。
- [x] 应用重启后从 projection 或 embedding 阶段恢复；阶段边界重复执行必须幂等，不能混入旧模型向量。
- [x] Workbench 显示真实阶段和预计剩余工作，不把“job 已创建”显示成完成。

## 最终验收

- [x] 运行目标 Vitest、生产 life-loop gate、stage-shared/stage-ui/desktop typecheck。
- [x] 运行定向 lint 和 `git diff --check`；已确认 0 lint error，剩余为既有/非阻塞 warning。
- [x] 真实 100k report、真实 trainer smoke 或透明阻塞报告、真实 Codex soak report、reindex recovery report 均可复盘。
- [ ] 构建并安装 macOS App，验证对话、记忆、训练诊断、scale job、Codex execution card 均可操作；本轮仅完成桌面构建，安装包手验仍待执行。
- [x] 提交本轮 Conventional Commit；不提交 `.serena/project.yml`，不写入任何 API Key。
