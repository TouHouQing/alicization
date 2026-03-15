---
title: A.L.I.C.E 开发需求文档（Epoch 1）
description: 面向开发团队的 Epoch 1 任务级执行清单
---

# A.L.I.C.E 开发需求文档（Epoch 1）

## 1. 文档定位

本文档仅覆盖 Epoch 1，目标是让工程师不需要二次决策即可开工。

- 适用范围：`stage-tamagotchi` 优先。
- 非目标：Epoch 2-5 的 Live2D、TTS、多模态感知、预测执行等能力。
- 任务编号：`ALICIZATION-E1-T001` 起。
- 核心边界：`SOUL.md` 为人格真源，SQLite 仅记录结构化流式数据。

## 2. Epoch 1 交付基线

必须交付：

1. 初始化流程与 `SOUL.md` 真源（ALICIZATION-F1.1）。
2. Personality Matrix v0（ALICIZATION-F1.2）。
3. 每轮结构化输出 `thought/emotion/reply`（ALICIZATION-F2.2）。
4. 短期事实记忆写入/检索与修剪（ALICIZATION-F1.3 基础）。
5. 本地隐私、Kill Switch、审计链路（NFR）。

## 3. 任务清单（开发即执行）

### ALICIZATION-E1-T001 品牌层改名边界与 Alicization 入口模块

- 关联需求ID：`ALICIZATION-NFR-ENG-001`、`ALICIZATION-NFR-ENG-002`
- 关联架构章节：`1`、`2`、`10`
- 背景/目标：在不破坏上游 AIRI 核心结构的前提下，建立 `alicization` 域入口与可持续同步边界。
- 输入输出与接口：
  - 输入：当前 monorepo 主干结构。
  - 输出：`alicization` 域文档入口、配置入口、模块目录骨架。
  - 接口：`apps/stage-tamagotchi/src/main/services/alicization/index.ts` 对外暴露初始化函数。
- 影响模块：`apps/stage-tamagotchi`、`packages/stage-shared`、`packages/i18n`。
- 前置依赖：无。
- 实现步骤：
  1. 建立 `alicization` 域目录与导出入口。
  2. 将品牌化配置放到独立配置文件，不改写上游核心常量。
  3. 在主进程注入点增加 `alicization` 模块装配逻辑。
- 测试点：
  1. 启动时 `alicization` 模块可被正常加载。
  2. 不启用 `alicization` 时原 AIRI 行为不受影响。
- 完成定义（DoD）：
  - 有独立入口模块。
  - 无跨域硬编码引用。
  - 文档中明确“不改 `appId`/workspace 包名”的硬边界。
- 风险与回滚点：
  - 风险：目录调整影响现有导入路径。
  - 回滚：保留原入口并通过 feature flag 切回。

### ALICIZATION-E1-T002 事件总线最小契约与 Topic 常量

- 关联需求ID：`ALICIZATION-DEP-001`、`ALICIZATION-NFR-ENG-003`
- 关联架构章节：`4.1`、`4.2`、`4.3`
- 背景/目标：统一 Epoch 1 内部通信，避免模块直接耦合。
- 输入输出与接口：
  - 输入：对话、初始化、安全事件需求。
  - 输出：类型化事件信封、Topic 常量、发布订阅接口。
  - 接口：`publish(event)`、`subscribe(topic, handler)`。
- 影响模块：`apps/stage-tamagotchi/src/shared/alicization`、`packages/stage-shared/src/alicization`。
- 前置依赖：`ALICIZATION-E1-T001`。
- 实现步骤：
  1. 定义 `AlicizationEvent` 类型与 topic 命名规范。
  2. 实现最小发布订阅层（进程内即可）。
  3. 增加审计钩子，关键 topic 自动落审计。
- 测试点：
  1. 同一 topic 多订阅者可同时接收。
  2. 非法 topic 在开发环境抛出错误。
  3. Kill Switch 事件可全局广播。
- 完成定义（DoD）：
  - Topic 常量统一来源。
  - 无字符串散落硬编码。
  - 事件类型可被 TypeScript 推断。
- 风险与回滚点：
  - 风险：事件风暴导致调试困难。
  - 回滚：保留直接调用路径作为临时降级开关。

### ALICIZATION-E1-T003 Genesis + `SOUL.md` 真源与文件并发控制

- 关联需求ID：`ALICIZATION-F1.1`、`ALICIZATION-NFR-SAFE-003`
- 关联架构章节：`6.2`、`8.1`、`9.1`、`9.4`
- 背景/目标：实现首次初始化与人格真源文件管理，保证外部编辑与系统回写不冲突。
- 输入输出与接口：
  - 输入：`ownerName`、`hostName`、`alicizationName`、`gender`、`relationship`、`mindAge`、`personality`、`personaNotes`。
  - 输出：`SOUL.md` 初始文件、`alicization.onboarding.completed` 事件。
  - 接口：`initializeGenesis(input)`、`readSoul()`、`writeSoulAtomic(next, expectedRevision)`。
- 影响模块：`main/services/alicization/onboarding`、`main/services/alicization/soul`、`shared/alicization/contracts`。
- 前置依赖：`ALICIZATION-E1-T001`、`ALICIZATION-E1-T002`。
- 实现步骤：
  1. 定义 Genesis Schema（Valibot）并生成 `SOUL.md` Frontmatter + 正文模板。
  2. 实现原子写：`tmp -> fsync -> rename`。
  3. 实现 CAS + 单写队列，避免并发脏写。
  4. 生命周期控制：`needsGenesis=true` 期间不启动 `fs.watch`。
  5. Genesis 成功后启动 `fs.watch`，收到外部变更时发布 `alicization.soul.changed` 并热重载。
  6. Genesis 期间外部变更只作为“表单预填充候选”，由用户确认合并。
  7. 升级时清理并废弃 `prompt-profile.json` / `spark-profile.json`，不再进入运行链路。
- 测试点：
  1. 输入越界值校验失败。
  2. 重启后读取同一 `SOUL.md`。
  3. 外部手改 `SOUL.md` 后热重载成功。
  4. 并发写不会损坏文件。
- 完成定义（DoD）：
  - `SOUL.md` 是人格唯一真源。
  - 原子写与 CAS 生效。
  - Genesis 与热重载无竞态脏写。
  - Prompt/Spark 使用系统固定注入，不存在运行时用户配置链路。
- 风险与回滚点：
  - 风险：文件监听在部分平台行为不一致。
  - 回滚：降级为定时 hash 轮询 + 手动重载按钮。

### ALICIZATION-E1-T004 Personality Matrix v0 状态机

- 关联需求ID：`ALICIZATION-F1.2`
- 关联架构章节：`5.1`、`6.2`
- 背景/目标：实现慢速、可累计、可持久化的人格漂移。
- 输入输出与接口：
  - 输入：`userSentimentScore`、`sentimentConfidence`、任务结果信号。
  - 输出：更新后人格向量。
  - 接口：`updatePersonality(signal)`、`getPersonality()`。
- 影响模块：`main/services/alicization/personality`、`main/services/alicization/soul`。
- 前置依赖：`ALICIZATION-E1-T003`。
- 实现步骤：
  1. 定义人格维度和阈值常量。
  2. 漂移计算：`delta = clamp(score * confidence * weight, -0.02, 0.02)`。
  3. 增加 Deadzone：`abs(score) < 0.25 => delta = 0`。
  4. 回写 `SOUL.md` Frontmatter 并发布状态变更事件。
- 测试点：
  1. 连续 100 轮中性事务对话无漂移。
  2. 边界值 `0.24 / 0.25 / 0.26` 行为正确。
  3. 冷启动后人格状态一致。
- 完成定义（DoD）：
  - 漂移可解释（更新原因与前后值日志）。
  - 中性噪声不会导致累积漂移。
  - 人格参数可被对话编排读取。
- 风险与回滚点：
  - 风险：漂移过快造成角色失真。
  - 回滚：关闭漂移写入，仅保留只读人格。

### ALICIZATION-E1-T005 对话编排主链路（Orchestrator）

- 关联需求ID：`ALICIZATION-F1.1`、`ALICIZATION-F2.2`
- 关联架构章节：`3`、`5.2`、`9.2`
- 背景/目标：建立 Epoch 1 核心会话链路，串起输入、记忆、人格与模型调用。
- 输入输出与接口：
  - 输入：`DialogueRequest`。
  - 输出：`DialogueResponse`。
  - 接口：`handleDialogue(request)`。
- 影响模块：`main/services/alicization/orchestrator`。
- 前置依赖：`ALICIZATION-E1-T002`、`ALICIZATION-E1-T003`、`ALICIZATION-E1-T004`。
- 实现步骤：
  1. 聚合 `SOUL`、短期记忆与当前输入构造上下文。
  2. 调用模型网关并拿到原始响应。
  3. 交给结构化解析器，失败时走安全回退。
  4. 发布 `alicization.dialogue.responded` 并记录 `conversation_turns`。
- 测试点：
  1. 正常路径返回完整结构体。
  2. 模型超时时可返回降级回复。
  3. 链路中任一子模块失败不会崩溃。
- 完成定义（DoD）：
  - 主链路可连续稳定运行。
  - 错误路径覆盖并可观测。
- 风险与回滚点：
  - 风险：链路耦合过高难以扩展。
  - 回滚：保留分段调用开关，支持逐段排障。

### ALICIZATION-E1-T006 结构化输出解析器与防御性回退

- 关联需求ID：`ALICIZATION-F2.2`
- 关联架构章节：`5.2`、`9.2`
- 背景/目标：强制每轮响应生成 `thought/emotion/reply`，解析失败也不能宕机。
- 输入输出与接口：
  - 输入：模型原始文本。
  - 输出：标准化 `DialogueResponse`。
  - 接口：`parseStructuredReply(raw)`。
- 影响模块：`main/services/alicization/orchestrator/parsers`。
- 前置依赖：`ALICIZATION-E1-T005`。
- 实现步骤：
  1. 定义结构化 JSON Schema。
  2. 主解析失败后执行线性修复（`{`/`}` 窗口截取 + 轻量容错解析），禁止复杂正则修复。
  3. 非 JSON 合约时触发一次结构化重采样（仅一次）。
  4. 重采样仍失败时进入绝对安全 Fallback：
     - `reply = rawText`
     - `emotion = neutral`
     - `thought = ''`
     - `contractFailed = true`
  5. `emotion` 白名单映射，非法值归一到 `neutral`。
- 测试点：
  1. 合法 JSON 全字段解析通过。
  2. 非 JSON 首次失败会重采样一次；二次失败触发 Fallback。
  3. 破损 JSON（噪声包裹、缺失前后文本）可经线性修复解析。
  4. 彻底失败时触发安全 Fallback 且不中断会话。
- 完成定义（DoD）：
  - 解析器具备主路径 + 线性修复 + 重采样一次 + 绝对回退。
  - `contractFailed=true` 轮次不参与人格漂移和异步记忆抽取。
  - 任意模型输出都能返回有效 `DialogueResponse`。
- 风险与回滚点：
  - 风险：重采样增加少量时延。
  - 回滚：关闭重采样，直接进入安全 Fallback。

### ALICIZATION-E1-T007 记忆抽取与置信度校准（异步）

- 关联需求ID：`ALICIZATION-F1.3`
- 关联架构章节：`6.3`、`6.4`、`9.2`
- 背景/目标：降低规则抽取脆弱性，并避免盲信 LLM 自评置信度。
- 输入输出与接口：
  - 输入：最近 N 轮对话、规则抽取结果、LLM 抽取结果。
  - 输出：`memoryWrites[]`（含 `confidenceRaw` 与 `confidenceCalibrated`）。
  - 接口：`extractFactsAsync(turnWindow)`、`calibrateConfidence(input)`。
- 影响模块：`main/services/alicization/memory/extractor`、`main/services/alicization/confidence`。
- 前置依赖：`ALICIZATION-E1-T005`。
- 实现步骤：
  1. 规则抽取快速路径（同步）。
  2. 异步抽取调度：`pendingTurns >= 10` 或 `idle >= 5min` 触发批处理。
  3. 抽取 provider 支持 `remote|local|off`，默认 `remote`。
  4. 预算超限时降级为规则抽取并写审计。
  5. 置信度校准器融合：`raw + 情绪词典强度 + 近两轮连贯性 + 抽取器一致性`。
  6. 上游写入统一使用 `calibratedConfidence`，保留 `raw` 供审计。
- 测试点：
  1. 规则抽取失败时异步路径可补救。
  2. 高 raw 低一致场景置信度被下调。
  3. `raw` 缺失时启发式置信度仍可用。
- 完成定义（DoD）：
  - 抽取过程不阻塞主对话链路。
  - 调度具备批处理、防抖、限流与降级路径。
  - 记忆写入不直接依赖 raw confidence。
- 风险与回滚点：
  - 风险：异步任务积压。
  - 回滚：降级为仅规则抽取 + 低置信阈值过滤。

### ALICIZATION-E1-T008 短期记忆检索注入与 Prompt Budget Manager

- 关联需求ID：`ALICIZATION-F1.3`、`ALICIZATION-NFR-PERF-002`
- 关联架构章节：`6.4`、`9.2`
- 背景/目标：在对话前检索相关事实并受控注入，避免 Token 爆炸。
- 输入输出与接口：
  - 输入：当前用户输入 + 会话信息。
  - 输出：排序后的记忆片段列表。
  - 接口：`retrieveFacts(queryContext)`、`buildPromptWithBudget(input)`。
- 影响模块：`main/services/alicization/memory/retriever`、`orchestrator`。
- 前置依赖：`ALICIZATION-E1-T007`。
- 实现步骤：
  1. 定义检索排序（时间衰减 + 置信度 + 访问频率）。
  2. 设计预算切片（`SOUL`/记忆/当前轮）。
  3. 超预算时执行可解释截断策略并记录日志。
- 测试点：
  1. 命中率在典型场景下可接受。
  2. 长会话下 token 不超预算。
  3. 无命中时平滑退化。
- 完成定义（DoD）：
  - 检索结果稳定且可解释。
  - 上下文注入不破坏响应时延。
- 风险与回滚点：
  - 风险：检索噪音影响回复质量。
  - 回滚：降低注入上限或关闭记忆注入开关。

### ALICIZATION-E1-T009 本地存储与 DAO（仅结构化流式数据）

- 关联需求ID：`ALICIZATION-NFR-PRIV-001`、`ALICIZATION-DEP-002`
- 关联架构章节：`6.1`、`6.3`
- 背景/目标：建立统一本地数据访问层，防止各模块直接写库造成混乱。
- 输入输出与接口：
  - 输入：turn、fact、audit、archive 数据对象。
  - 输出：统一 DAO API。
  - 接口：`memoryDao`、`conversationDao`、`auditDao`、`memoryArchiveDao`。
- 影响模块：`main/services/alicization/storage`。
- 前置依赖：`ALICIZATION-E1-T007`、`ALICIZATION-E1-T008`。
- 实现步骤：
  1. 创建 `memory_facts`、`conversation_turns`、`audit_logs`、`memory_archive` 表及迁移脚本。
  2. 封装 DAO，禁止业务层直写 SQL。
  3. 给检索命中更新 `lastAccessAt` 与 `accessCount`。
- 测试点：
  1. 迁移可重复执行。
  2. DAO 异常返回可诊断错误。
  3. 并发读写不出现数据损坏。
- 完成定义（DoD）：
  - SQLite 不包含人格主状态表。
  - 数据操作统一收敛到 DAO。
- 风险与回滚点：
  - 风险：迁移失败导致启动失败。
  - 回滚：保留上一版 schema 并支持只读降级。

### ALICIZATION-E1-T010 记忆修剪任务（Memory Pruning）

- 关联需求ID：`ALICIZATION-F1.3`、`ALICIZATION-NFR-PERF-001`
- 关联架构章节：`6.4`、`9.5`
- 背景/目标：控制记忆规模和检索时延，避免只增不减。
- 输入输出与接口：
  - 输入：`memory_facts` 命中历史与置信度。
  - 输出：归档数、删除数、统计信息。
  - 接口：`runMemoryPrune()`、`getMemoryStats()`。
- 影响模块：`main/services/alicization/memory/maintenance`。
- 前置依赖：`ALICIZATION-E1-T009`。
- 实现步骤：
  1. 启动后执行一次修剪并注册 24h 定时任务。
  2. 实现 `pruneScore` 计算与归档/删除阈值。
  3. 暴露手动触发与统计 IPC（开发调试用途）。
- 测试点：
  1. 长期未命中低置信记忆被归档/删除。
  2. 高频命中记忆不会被误删。
  3. 修剪后检索性能稳定。
- 完成定义（DoD）：
  - 修剪任务默认启用。
  - 提供统计接口：总量、活跃量、归档量、最近修剪时间。
- 风险与回滚点：
  - 风险：阈值不当导致过删。
  - 回滚：仅归档不删除 + 提高阈值。

### ALICIZATION-E1-T011 脱敏网关与云调用防护

- 关联需求ID：`ALICIZATION-NFR-PRIV-002`、`ALICIZATION-NFR-PRIV-003`
- 关联架构章节：`7.1`
- 背景/目标：任何云模型调用前执行脱敏与审计。
- 输入输出与接口：
  - 输入：原始 prompt/context。
  - 输出：脱敏后的 payload + 脱敏报告。
  - 接口：`sanitizeForRemoteModel(input)`。
- 影响模块：`main/services/alicization/security`、`orchestrator`。
- 前置依赖：`ALICIZATION-E1-T005`。
- 实现步骤：
  1. 定义敏感模式规则（token/password/key）。
  2. 执行替换并生成脱敏 diff 摘要。
  3. 将脱敏过程写入审计日志（不记录原始敏感值）。
- 测试点：
  1. 常见密钥格式可识别并替换。
  2. 误杀率可接受。
  3. 脱敏失败时默认阻断外发。
- 完成定义（DoD）：
  - 云调用必须经过网关。
  - 审计中不泄露敏感原文。
- 风险与回滚点：
  - 风险：误杀导致回复质量下降。
  - 回滚：启用规则分级并支持白名单配置。

### ALICIZATION-E1-T012 Kill Switch 全链路（含 Origin Tracking）

- 关联需求ID：`ALICIZATION-NFR-SAFE-001`、`ALICIZATION-NFR-SAFE-003`
- 关联架构章节：`5.3`、`7.3`、`9.3`
- 背景/目标：提供硬中断能力，能瞬时切断感知探针与执行权，且防止上下文注入误触发。
- 输入输出与接口：
  - 输入：快捷键事件或用户原始口令。
  - 输出：系统状态 `ACTIVE/SUSPENDED`。
  - 接口：`suspend(reason, origin)`、`resume(reason, origin)`、`getState()`。
- 影响模块：`main/services/alicization/safety`、`shared/alicization/contracts`。
- 前置依赖：`ALICIZATION-E1-T002`。
- 实现步骤：
  1. 在主进程注册 Kill Switch 触发器。
  2. 对文本口令增加来源标记：仅 `origin=ui-user` 执行拦截。
  3. 统一中断入口 `abortAllPipelines(reason)`：覆盖 chat/spark/hearing/transcription。
  4. 显式捕获 `AbortError` 并执行“零落盘”策略（不写 `conversation_turns`、不写 memory、不触发 turn hooks）。
  5. 增加恢复流程与状态查询。
- 测试点：
  1. 触发后执行链路立即拒绝请求。
  2. 恢复后可继续正常对话。
  3. MCP/网页工具输出中包含口令文本时不会触发休眠。
- 完成定义（DoD）：
  - 中断耗时在目标阈值内。
  - 指令拦截只发生在原始用户输入层。
  - 主动中断轮次不留下“幽灵数据”。
  - 状态可观测且可恢复。
- 风险与回滚点：
  - 风险：来源标记漏传导致误判。
  - 回滚：关闭文本口令，仅保留物理快捷键。

### ALICIZATION-E1-T013 审计日志、集成验证与 Epoch1 退场门禁

- 关联需求ID：`ALICIZATION-EPOCH-1`、`ALICIZATION-NFR-PERF-001`、`ALICIZATION-NFR-PERF-002`
- 关联架构章节：`3`、`4`、`8.1`
- 背景/目标：将 Epoch 1 能力串成可验收基线，形成 CI 可执行门禁。
- 输入输出与接口：
  - 输入：前 12 个任务产物。
  - 输出：测试报告、验收报告、回归脚本。
  - 接口：`pnpm lint:fix`、`pnpm typecheck`、目标 Vitest 套件。
- 影响模块：根目录 CI、`apps/stage-tamagotchi` 测试目录。
- 前置依赖：`ALICIZATION-E1-T001` 至 `ALICIZATION-E1-T012`。
- 实现步骤：
  1. 编写主链路集成测试（初始化 -> 对话 -> 记忆 -> Kill Switch）。
  2. 增加结构化合约测试（非 JSON 重采样一次，失败回退）。
  3. 增加 Kill Switch 中断一致性测试（中途中断零落盘）。
  4. 增加异步抽取调度测试（10轮触发/5分钟触发/预算降级）。
  5. 增加 `SOUL.md` 外部编辑一致性测试（冷热启动 + 热重载）。
  6. 建立性能基线采样（空闲态 CPU、对话时延）。
  7. 汇总验收报告并冻结 M1 基线标签。
- 测试点：
  1. 端到端链路连续通过。
  2. Kill Switch 中断/恢复通过。
  3. 冷/热启动与文件外部篡改下人格状态最终一致。
  4. 关键性能指标满足阈值。
- 完成定义（DoD）：
  - M1 验收报告可复现。
  - 关键链路与安全边界无阻断缺陷。
- 风险与回滚点：
  - 风险：CI 环境无法稳定复现文件监听行为。
  - 回滚：补充平台隔离测试并在本地门禁强制执行。

## 4. 任务执行顺序建议

1. `T001 -> T002 -> T003 -> T004`（先立边界与真源）。
2. `T005 -> T006 -> T007 -> T008`（完成对话与记忆主链路）。
3. `T009 -> T010`（收敛存储并实现遗忘曲线）。
4. `T011 -> T012`（隐私与安全闭环）。
5. `T013`（统一验收与发布门禁）。
