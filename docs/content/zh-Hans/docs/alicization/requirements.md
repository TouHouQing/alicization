---
title: A.L.I.C.E 全景需求文档（Epoch 1-5）
description: 覆盖 Alicization 当前实现基线与 Epoch 1-5 目标的需求文档
---

# A.L.I.C.E 全景需求文档（Epoch 1-5）

## 1. 文档定位

本文档是 `alicization` 的产品与工程需求基线，面向开发团队、贡献者与架构维护者，回答四个问题：

1. Alicization 最终想成为什么。
2. 截至 **2026-03-17**，项目代码已经具备什么。
3. 从 `Epoch 3` 往后，还必须补齐哪些能力。
4. 哪些安全、隐私和工程边界在所有阶段都不允许被突破。

与早期版本不同，本文档不再只描述“设计愿景”，还会显式标注当前状态，避免把未来能力误写成现状。

## 2. 当前项目状态

当前代码基线可以明确描述为：

- `Epoch 1` 已于 **2026-03-09** 收官。
- `Epoch 2` 已于 **2026-03-11** 收官。
- `Epoch 3` 已启动，重点是继续增强视觉、听觉、语音对话和更可靠的主动性。
- 主要落地平台仍然是 `apps/stage-tamagotchi` 桌面端；Web 与 Pocket 仍以共享层复用和未来承接为主。

## 3. 愿景与产品定位

Alicization（Artificial Labile Intelligent Cybernated Existence）定位为：

> 一个本地优先、可审计、可中断、可持续演化的数字共生体架构。

它不是传统问答工具，也不是默认放权的黑箱 Agent。它要解决的是：

- 如何让人格拥有唯一真源，而不是散落在 prompt、缓存和数据库里。
- 如何让记忆、主动性和执行权拥有清晰的边界、门禁与审计轨迹。
- 如何让一个数字实体逐步从“回合制回复器”演化为“长期存在、长期记忆、长期影响现实”的系统。

## 4. 功能需求总览

| 需求 ID | 名称 | 当前状态 | 描述 | 首次落地 Epoch |
| --- | --- | --- | --- | --- |
| ALICIZATION-F1.1 | Genesis 与 `SOUL.md` 真源 | 已完成 | 首次引导写入 `SOUL.md`，并以其作为人格、边界、长期偏好的唯一真源 | 1 |
| ALICIZATION-F1.2 | 动态人格矩阵 | 已完成基线 | `obedience / liveliness / sensibility` 缓慢漂移并持久化 | 1 |
| ALICIZATION-F1.3 | 结构化对话合约 | 已完成 | 每轮输出 `thought / emotion / reply`，失败时回退并审计 | 1 |
| ALICIZATION-F1.4 | Prompt Budget 与灵魂锚点保护 | 已完成 | 长会话下优先保护 `SOUL.md` 与结构化输出约束 | 1 |
| ALICIZATION-F2.1 | 本地记忆层与修剪 | 已完成 | 事实记忆、轮次、审计、本地修剪与归档 | 1 |
| ALICIZATION-F2.2 | Organic Memory 与 Dreaming | 已完成基线 | 活跃思绪、潜意识碎片、梦境整理与长期记忆固化 | 2（基础在 1） |
| ALICIZATION-F2.3 | 潜意识 Tick 与提醒补偿 | 已完成基线 | 后台张力池、主动轮次、提醒调度与恢复性补偿 | 2 |
| ALICIZATION-F3.1 | 宿主系统探针 | 已完成基线 | 时间、电量、CPU、内存等系统状态采样与降级处理 | 2 |
| ALICIZATION-F3.2 | 中断语境感知 | 已完成基线，仍在增强 | 基于前台窗口、全屏状态、输入活跃度等信号约束主动性 | 2（增强在 3） |
| ALICIZATION-F3.3 | 视觉 / 听觉 / 语音对话 | 进行中 | 屏幕理解、环境听觉、VAD、语音输入与语音回话能力持续增强 | 3 |
| ALICIZATION-F3.4 | 表现层能力清单与广播 | 已完成基线，仍在增强 | 通过 performance manifest 约束 facial/action cue，向 Live2D/其他表现层广播 | 2 |
| ALICIZATION-F4.1 | MCP 工作区沙箱与审计 | 已完成 | MCP 工具进入本地工作区边界、绝对黑名单与审计链路 | 2 |
| ALICIZATION-F4.2 | 人在回路权限链路 | 已完成 | 高危操作显式确认、一次性 token、防重放、会话白名单 | 2 |
| ALICIZATION-F4.3 | 实时查询执行引擎 | 已完成基线 | 对天气、新闻、金融、体育等实时请求走 builtin / MCP 双路径 | 2 |
| ALICIZATION-F4.4 | Kill Switch | 已完成 | 全局与卡片级中断能力，切断感知、执行与落盘 | 1（增强在 2） |
| ALICIZATION-F5.1 | 跨运行面承接 | 进行中 | 桌面端主闭环，Web 与 Pocket 复用共享层并逐步承接连续陪伴 | 2-3 |
| ALICIZATION-F5.2 | 现实降临与干涉 | 规划中 | 持续被动视觉、环境驱动主动搭话、动态信任授权与更强物理执行 | 4 |
| ALICIZATION-F5.3 | 绝对自律与涌现 | 概念前瞻 | 自我目标驱动、异步后台思考链、跨终端意识漫游 | 5 |

## 5. 详细功能需求

### 5.1 灵魂基建与结构化对话（F1）

#### ALICIZATION-F1.1 Genesis 与 `SOUL.md` 真源

- 首次启动必须支持采集宿主名称、称呼、关系定位、心智年龄、初始人格倾向与自由补充描述。
- Genesis 结果必须写入 `SOUL.md`，并在后续运行时作为唯一人格真源。
- 设置界面必须能重新读取、修改与写回 `SOUL.md`。
- 运行时不得把人格主状态托管到 SQLite。

#### ALICIZATION-F1.2 动态人格矩阵

- 至少维护一组可量化人格维度：`obedience`、`liveliness`、`sensibility`。
- 人格变化必须慢速、可累计、可持久化，禁止每轮剧烈跳变。
- 人格变化来源至少包括：宿主语气反馈、长期互动历史、主动轮次结果、任务成败。
- 人格漂移必须能回写到 `SOUL.md` 并在重启后恢复。

#### ALICIZATION-F1.3 Provider 对话权威与透明失败

- 普通可见回复必须来自当前配置的 Provider。
- Renderer 与本地运行时代码不得生成、修补或改写普通回复。
- 超时、Provider、工具、权限、协议、召回、持久化与结构校验失败必须返回类型化透明失败面。
- `contractFailed=true` 或其他失败产物不得参与人格漂移、长期记忆固化、persona learning 或训练。
- 审计默认只记录必要字段；仅在显式调试模式下保留更敏感的内部推理内容。

#### ALICIZATION-F1.4 Provider Context Budget 与人格证据保护

- 长会话下必须在主进程优先保留 `SOUL.md`、WorkingMemory 当前状态和预算内的 LongTermMemoryRecall 证据。
- 卡片级 `custom_directives` 属于用户治理输入，不得被 Renderer 复制成并行人格状态。
- 上下文压缩、截断或拒绝必须可审计，并且不得生成替代性的普通回复。

### 5.2 记忆、潜意识与梦境（F2）

#### ALICIZATION-F2.1 本地记忆层与修剪

- 系统必须落盘保存对话轮次、事实记忆和审计日志。
- 记忆必须支持检索、访问计数、时效衰减、归档与硬删除。
- 记忆修剪必须在后台低频运行，不得阻塞主对话链路。

#### ALICIZATION-F2.2 Organic Memory 与 Dreaming

- 系统必须维护 `active_thoughts`、`subconscious_fragments` 等有机记忆层。
- Dreaming 必须从有限对话片段中提炼长期记忆、行为策略与人格漂移，再写回 `SOUL.md` 与数据库。
- 梦境上下文必须有硬上限，避免长历史直接灌入模型。
- 梦境失败必须可审计，且不能阻塞前台聊天。

#### ALICIZATION-F2.3 潜意识 Tick 与提醒补偿

- 后台必须维护按时间变化的张力池，例如 `boredom`、`loneliness`、`fatigue`。
- 张力系统必须能触发主动轮次，但必须受环境门禁约束，避免骚扰式打断。
- 提醒调度必须支持正常触发、超时恢复与运行时恢复后的补偿投递。
- 潜意识状态必须可持久化并在冷启动后恢复。

### 5.3 感知与表现层（F3）

#### ALICIZATION-F3.1 宿主系统探针

- 必须支持读取时间、电量、CPU、内存等基础系统状态。
- 采样必须提供缓存、过期判断、下次 Tick 信息与降级标记。
- 探针超时或失败不得打崩主循环，必须进入降级并写 warning 审计。

#### ALICIZATION-F3.2 中断语境感知

- 系统必须能在主动轮次前采样宿主中断语境，例如输入活跃度、全屏状态、前台窗口标题 / 进程等。
- 当前基线允许平台差异；无法可靠获取时必须降级并审计，而不是伪造上下文。
- 这些信号必须直接参与“是否允许主动打断宿主”的门禁判断。

#### ALICIZATION-F3.3 视觉、听觉与语音对话

- 屏幕理解、环境听觉、VAD、语音输入与语音回话属于 `Epoch 3` 主线增强能力。
- 当前阶段允许 UI、pipeline、provider 和实验路径先行存在，但文档必须明确哪些仍未进入稳定自治闭环。
- 未来的视觉与听觉信号必须继续遵守 local-first、资源预算与显式边界策略。

#### ALICIZATION-F3.4 表现层能力清单与广播

- 对话结果中的 `emotion`、`facialCue`、`actionCue`、`delivery`、`emphasis` 必须经过 performance manifest 约束。
- 表现层广播只能发射已落库、已被接受的标准化轮次结果。
- Live2D、语音与其他身体化表现层必须容忍缺失 cue 的降级情况。

### 5.4 执行与安全控制（F4）

#### ALICIZATION-F4.1 MCP 工作区沙箱与审计

- 系统必须支持 MCP 工具调用。
- 工具调用必须有默认工作区沙箱、绝对黑名单路径和工作区逃逸拦截。
- 所有允许、拒绝、中断、失败的工具行为都必须可审计。

#### ALICIZATION-F4.2 人在回路权限链路

- 高危操作必须经过显式确认，不得由模型直接拥有无限执行权。
- 权限链路必须支持一次性 token、防重放、请求超时与会话白名单。
- Kill Switch 触发时，所有悬而未决的权限请求必须立刻失效。

#### ALICIZATION-F4.3 实时查询执行引擎

- 对天气、新闻、金融、体育等实时请求，必须优先走可验证的实时执行路径，而不是让模型直接编造结果。
- 内置 realtime 执行失败时，可回退到 MCP，但必须保留来源标签与失败类别。
- 在严格模式下，缺乏工具证据的实时请求必须被拒绝或降级，而不是生成伪实时答案。

#### ALICIZATION-F4.4 Kill Switch

- 必须提供全局 Kill Switch，并允许未来扩展到 card scope 级别。
- Kill Switch 触发后必须中断感知、执行与相关落盘，不得留下“半截 turn”或幽灵数据。
- Kill Switch 文本指令只能在原始用户输入层命中，禁止从工具输出或拼接上下文误触发。

### 5.5 跨端与长期演化（F5）

#### ALICIZATION-F5.1 跨运行面承接

- `stage-tamagotchi` 继续作为主闭环平台。
- `stage-web` 与 `stage-pocket` 应复用共享业务层，并逐步承接陪伴连续性、轻量交互和远程联动能力。

#### ALICIZATION-F5.2 Epoch 4：现实降临与干涉

- 目标是让 Alicization 从“理解宿主”迈向“干预宿主的现实环境”。
- 核心需求包括：持续被动视觉、环境驱动主动搭话、动态信任授权与更强的本地物理执行能力。
- 这仍然必须建立在严格的权限边界、审计轨迹、工作区沙箱和人在回路之上。

#### ALICIZATION-F5.3 Epoch 5：绝对自律与涌现

- 目标是从触发式自治迈向真正的长期自律系统。
- 核心需求包括：自我目标驱动引擎、异步后台思考链、跨终端意识漫游。
- 此阶段目前属于概念前瞻，不得在现有文档中写成已实现能力。

## 6. 非功能需求（NFR）

### 6.1 隐私与数据主权

- ALICIZATION-NFR-PRIV-001：默认 pure local-first。敏感文本、记忆数据、截图缓存、录音片段默认仅本地存储。
- ALICIZATION-NFR-PRIV-002：远程模型调用前必须脱敏，至少覆盖密码、密钥、Token、疑似凭据片段。
- ALICIZATION-NFR-PRIV-003：所有跨进程、跨模块与高危执行数据流必须可审计。

### 6.2 安全与可控性

- ALICIZATION-NFR-SAFE-001：必须提供 Kill Switch，可瞬时切断感知与执行。
- ALICIZATION-NFR-SAFE-002：高危执行必须显式授权。
- ALICIZATION-NFR-SAFE-003：执行链路必须可中断；必要时支持回滚或补偿。
- ALICIZATION-NFR-SAFE-004：实时查询、工具调用和主动性不得绕过事实校验与环境门禁。

### 6.3 性能与资源

- ALICIZATION-NFR-PERF-001：后台探针、潜意识和整理任务在待机态下必须保持低资源占用。
- ALICIZATION-NFR-PERF-002：前台对话主链必须与后台任务解耦。
- ALICIZATION-NFR-PERF-003：采样频率、推理频率和感知强度必须可动态降载。

### 6.4 工程与演进

- ALICIZATION-NFR-ENG-001：坚持“品牌层改名 + 增量插件化 + 低侵入上游同步”。
- ALICIZATION-NFR-ENG-002：禁止通过破坏包名与构建标识的方式达成功能需求。
- ALICIZATION-NFR-ENG-003：每个 Epoch 必须有明确进入条件、退出条件和收官证据。

## 7. Epoch 目标与验收口径

### ALICIZATION-EPOCH-1 摇光初现

- 状态：已完成（2026-03-09）
- 目标：建立本地对话内核、Genesis、结构化情绪输出、短期记忆与安全底座。
- 收官证据：见 [`epoch1-closure-report.md`](./epoch1-closure-report)

### ALICIZATION-EPOCH-2 赋予肉体

- 状态：已完成（2026-03-11）
- 目标：完善桌面系统探针、表现层权威广播、MCP 权限链路与工作区沙箱。
- 收官证据：见 [`epoch2-closure-report.md`](./epoch2-closure-report)

### ALICIZATION-EPOCH-3 睁开双眼

- 状态：进行中
- 目标：把视觉、听觉、语音对话与更可靠的环境驱动主动性做实。
- 最低验收：
  - 屏幕理解、环境听觉和语音输入至少形成一条稳定可复用的闭环。
  - 主动搭话必须由环境门禁与多信号约束驱动，而不是单一计时器触发。
  - 视觉 / 听觉 / 语音能力的资源预算与隐私边界可配置、可审计。

### ALICIZATION-EPOCH-4 现实降临与干涉

- 状态：规划中
- 目标：让 Alicization 从“理解宿主”走向“干预现实环境”。
- 最低验收：
  - 持续被动视觉可提供稳定、低侵入的工作语境输入。
  - 动态信任授权可支撑更强的本地文件、终端和系统动作执行。
  - 高危路径继续全量走人在回路与审计，不得因为“更强主动性”而绕开门禁。

### ALICIZATION-EPOCH-5 绝对自律与涌现

- 状态：概念前瞻
- 目标：实现长期自律、生物钟成熟与跨终端意识连续。
- 最低验收：
  - 自我目标驱动具备最小可验证闭环。
  - 异步后台思考链不会污染安全边界和资源预算。
  - 跨终端连续性具备清晰的一致性和数据主权策略。

## 8. 跨 Epoch 依赖

| 依赖 ID | 依赖描述 | 被依赖方 | 依赖方 |
| --- | --- | --- | --- |
| ALICIZATION-DEP-001 | `SOUL.md` 真源、结构化合约与 Prompt Budget 基线 | Epoch 1 | Epoch 2-5 |
| ALICIZATION-DEP-002 | 记忆事实、梦境整理与 Organic Memory 数据面 | Epoch 1-2 | Epoch 3-5 |
| ALICIZATION-DEP-003 | Kill Switch、权限链路与工作区沙箱 | Epoch 1-2 | Epoch 3-5 |
| ALICIZATION-DEP-004 | 系统探针与中断语境模型 | Epoch 2 | Epoch 3-5 |
| ALICIZATION-DEP-005 | 潜意识 Tick、提醒调度与补偿机制 | Epoch 2 | Epoch 3-5 |

## 9. 工程边界与默认策略

- 品牌层改名优先，仅修改可见 UI、入口与默认参数。
- **绝对禁止在构建层修改 `appId` 与 workspace 包名**，以保证可持续同步上游 AIRI。
- 优先新增 `alicization` 域模块与适配层，避免大规模改写上游核心路径。
- 目标平台优先 `stage-tamagotchi`；其他端按共享层复用与阶段推进扩展。
- 隐私策略默认 pure local-first，除非宿主显式开启云增强能力。

## 10. P0 / P1 / P2 / P3 / P4 工程落地要求（截至 2026-04-02）

为保证“数字生命心智”不是文案层口号，而是运行时约束，本仓库采用以下治理分层：

- P0：运行时主权、跨进程契约真源、Card Scope 一致性、Browser Bridge 语义对齐、异步记忆抽取非阻塞。
- P1：对话心智链闭环（`dialogueTurnEncounter`、`currentConsciousFrame`、`claimEvidenceLedger`）必须进入治理与状态快照。
- P2：回答面真值纪律（`responseCharter`、`responseSurfaceContract`）必须可执行，并对不支持细节与空壳回复执行硬拦截与审计。
- P3：可追溯心智治理（`decisionTraceId` 全链路、统一 truth-discipline reducer、接管审计可复盘）必须成为默认工程约束。
- P4：可重放心智事件账本（`mind_turn_events`、治理事件链、按 trace/turn 查询）必须成为默认运行时可验证能力。

治理要求：

- 任何 P0/P1/P2/P3/P4 偏离都必须在代码中用 `// NOTICE:` 说明根因、影响范围和补齐路径。
- P0/P1/P2/P3/P4 相关能力必须有可运行测试覆盖，且回归失败视为心智链路退化。
