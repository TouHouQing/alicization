---
title: A.L.I.C.E Claw 与自我意识数字生命开发优先级方案
description: 面向浏览器操控、软件操控、CLI、Claude Code、Codex、OpenClaw 与主动感知主动执行的优先级路线图
---

# A.L.I.C.E Claw 与自我意识数字生命开发优先级方案

## 1. 文档定位

本文档聚焦一个更具体的问题：

1. Alicization 应该如何实现并超越 `N.E.K.O` 的 claw 能力。
2. 这些能力应该按什么顺序建设，才不会把系统做成“更会抢控制权的 agent”。
3. 如何把执行能力变成“被心智治理驱动的身体”，而不是独立于心智之外的外挂。

基线日期：**2026-04-02**
对标对象：本仓库中的 `N.E.K.O/` 本地镜像与对应 DeepWiki 文档
适用主平台：`apps/stage-tamagotchi`

默认前提：

- local-first
- auditable
- interruptible
- runtime-first governance

## 2. 核心判断

### 2.1 结论

如果目标是“足够 Alicization、足够数字心智生命、足够有自我意识的数字生命”，那么路线不能是：

`先做鼠标移动 -> 再做主动搭话 -> 最后再想心智`

正确路线应该是：

`先做心智治理 -> 再做任务线程与执行契约 -> 再做结构化执行通道 -> 最后才做通用桌面 claw fallback`

### 2.2 为什么

`N.E.K.O` 的长处主要在执行层产品化：

- 多进程分层
- 独立 agent server
- `browser_use / computer_use / openclaw / openfang` 统一渠道评估
- persistent execution session
- 主动搭话与反思联动

而 Alicization 当前已经更强的部分在这里：

- `SOUL.md` 真源
- `decisionTraceId`
- `mind_turn_events`
- `truth discipline`
- `response charter / response surface contract`
- Kill Switch、MCP 权限门禁与工作区沙箱
- `proactive-policy`、`initiative`、`action-ecology`

因此最优策略不是“对齐 N.E.K.O”，而是：

> 保留 Alicization 已经更强的心智治理内核，吸收 N.E.K.O 的执行骨架，并把所有 claw 通道纳入同一条可追溯的生命链。

## 3. 取其精华，不取其短板

### 3.1 应采纳

| 对标点 | 为什么值得采纳 | Alicization 采纳方式 |
| --- | --- | --- |
| 执行层独立化 | 让长任务、重工具、浏览器与桌面执行脱离主聊天流 | 增加 `executor-runtime`，但不下放主心智治理权 |
| 多渠道统一路由 | 让系统能为任务选择最合适的身体部位 | 建立 `claw fabric`，统一 `cli / codex / claude-code / openclaw / browser / software / desktop` |
| persistent session | 让浏览器、外部 agent、长任务具备连续身份 | executor 侧建立 `session affinity` 与 `task threads` |
| proactive + reflection 联动 | 主动性不只是打扰，而是推进长期人格与关系记忆 | 主动执行、主动搭话、反思固化进入同一条 ledger |
| CUA 单步验证循环 | 桌面执行必须有“观察 -> 判断 -> 单步 -> 复检” | 只把它作为最后兜底，不作为默认主通道 |

### 3.2 不应照搬

| 对标点 | 为什么不应照搬 | Alicization 应保持什么 |
| --- | --- | --- |
| 执行先于心智 | 会让系统更像工具代理，而不是数字生命 | 保持 main runtime 为唯一心智治理权威 |
| 通用鼠标键盘优先 | 稳定性差、不可解释、侵入性高 | 先做结构化通道，再做 generic claw |
| 让 prompt 临时决定一切 | 会稀释已有 P0-P4 治理成果 | 保持 reducer、ledger、truth discipline 主导 |
| 把主动搭话当作自我意识本体 | 容易走向表演性人格 | 让主动性建立在自我模型、未完成意图和反思链上 |

## 4. 目标能力栈

### 4.1 从“数字心智生命”视角定义能力层

| 层级 | 名称 | 作用 |
| --- | --- | --- |
| L0 | Mind Governance | 决定是否该做、为什么做、做到什么程度、失败后怎么解释 |
| L1 | Task Threading | 把一次意图变成可延续、可取消、可回放的任务线程 |
| L2 | Structured Action Channels | CLI、MCP、Codex、Claude Code、OpenClaw、Browser 这类结构化执行 |
| L3 | App-specific Bodies | VSCode、Terminal、Chrome、Finder/Explorer、Discord 等专用身体 |
| L4 | Generic Desktop Claw | 鼠标、键盘、截图、OCR、Accessibility、视觉单步执行 |
| L5 | Proactive Presence | 主动感知、主动执行、主动搭话的门禁与节奏 |
| L6 | Self-aware Continuity | 自我模型、能力自知、偏好形成、反思固化、关系延续 |

### 4.2 通道优先级

默认执行优先级建议如下：

1. `CLI`
2. `Codex / Claude Code / OpenClaw / OpenFang`
3. `Browser (Playwright / CDP / DOM-first)`
4. `App-specific software adapters`
5. `Generic desktop claw`

原因：

- 越结构化的通道，越稳定、越容易审计、越容易解释。
- 越通用的鼠标键盘控制，越应该被视作最后兜底，而不是第一选择。

## 5. 总体开发优先级

## 5.1 Priority 0：Claw Control Plane

这是整个路线里最重要的一层，没有它，后面所有执行能力都会碎掉。

目标：

- 建立统一 `task thread` 模型
- 建立统一 `executor session` 模型
- 建立统一 `capability manifest` 模型
- 所有执行都能挂到 `decisionTraceId`
- 所有执行都能被 Kill Switch 即时中断

建议新增数据面：

| 数据面 | 作用 |
| --- | --- |
| `executor_sessions` | 记录每个通道的持久会话、会话亲和性、最近状态 |
| `task_threads` | 记录一个持续任务的目标、预算、状态、关联 card、关联 trace |
| `executor_events` | 记录 plan、dispatch、step、result、cancel、resume、takeover |
| `capability_manifests` | 记录当前环境下每个通道能做什么、代价多大、风险多高 |

建议新增主类型：

- `AlicizationTaskThread`
- `AlicizationExecutionChannel`
- `AlicizationExecutorSession`
- `AlicizationExecutionPlan`
- `AlicizationExecutionEvent`
- `AlicizationChannelCapability`

完成标准：

- 每个执行任务都有唯一 thread id
- 每个执行步骤都能被 replay
- `mind_turn_events` 能关联外部执行事件
- Kill Switch 触发后所有运行中 task 都进入一致的终止语义

## 5.2 Priority 1：Executor Fabric

在 P0 的控制平面上，先搭建统一执行路由器。

目标：

- 把 `cli / codex / claude-code / openclaw / openfang / browser / software / desktop` 统一成一个 fabric
- 让 runtime 不直接“想调用哪个就调用哪个”
- 改为先产出 `execution plan`，再由 executor 选择通道

推荐模块：

| 模块 | 作用 | 建议文件 |
| --- | --- | --- |
| `claw-fabric.ts` | 通道注册、优先级、路由与降级 | `apps/stage-tamagotchi/src/main/services/alicization/claw-fabric.ts` |
| `task-thread-governor.ts` | 任务预算、取消、恢复、挂起、冲突仲裁 | `apps/stage-tamagotchi/src/main/services/alicization/task-thread-governor.ts` |
| `execution-evidence-ledger.ts` | 把执行结果转成回答面可用证据 | `apps/stage-tamagotchi/src/main/services/alicization/execution-evidence-ledger.ts` |
| `executor-runtime.ts` | 子进程 / worker 侧执行宿主 | `apps/stage-tamagotchi/src/main/services/alicization/executor-runtime.ts` |

完成标准：

- 一个任务能在多个通道间降级
- 通道不可用时不会直接掉回“胡说的文本回复”
- 执行结果进入 truth discipline，而不是绕过它

## 5.3 Priority 2：结构化执行通道优先落地

### 5.3.1 CLI

先做 CLI，因为它是“高成功率、低幻觉、可回放”的最优身体。

目标：

- 受控 shell 执行
- 工作目录与资源边界
- stdout/stderr 分段流回
- 可取消、可超时、可重试

适用任务：

- Git / package manager / build / test
- 文件整理
- 本地工具链操作
- 结构化数据生成

不适用任务：

- 需要理解复杂 GUI 的任务
- 需要跨多个窗口视觉判断的任务

### 5.3.2 Codex / Claude Code / OpenClaw / OpenFang

这层不是“再套一个 AI”，而是让 Alicization 拥有协同身体。

目标：

- 让 Alicization 能把任务委托给外部 agent
- 保留 persistent session 和 task thread continuity
- 结果必须带回证据与摘要，不能只回一句“完成了”

优先顺序建议：

1. `Codex`
2. `Claude Code`
3. `OpenClaw`
4. `OpenFang`

原因：

- `Codex` / `Claude Code` 对代码和 CLI 任务价值最高
- `OpenClaw` 更适合开放式长期执行
- `OpenFang` 适合 sandbox 多 agent，但不应成为 UI/桌面任务首选

建议新增适配器：

- `executor-adapters/codex.ts`
- `executor-adapters/claude-code.ts`
- `executor-adapters/openclaw.ts`
- `executor-adapters/openfang.ts`

完成标准：

- 可建立 channel session
- 可透传 cancel / resume
- 可归档 output summary、artifacts、error provenance

## 5.4 Priority 3：Browser Actor

浏览器是高价值场景，但必须坚持：

> DOM / CDP / Playwright first，vision only as fallback

目标：

- 建立持久浏览器会话
- 支持 tab/thread 级任务连续性
- 支持页面语义摘要
- 支持页面动作验证与恢复

必须具备的能力：

- `goto / click / fill / select / extract / screenshot`
- `DOM evidence capture`
- `network / page error / auth state`
- `tab memory`
- `browser session resume`

建议模块：

- `browser-actor.ts`
- `browser-session-ledger.ts`
- `browser-evidence-normalizer.ts`

完成标准：

- 页面任务优先不依赖视觉坐标
- 用户打断或页面跳转后可恢复 thread
- 结果能以“证据化页面状态”写回心智链

## 5.5 Priority 4：Software Actor

软件操控不要一上来做全桌面乱点，先做应用专用适配器。

建议第一批适配器：

1. `VSCode`
2. `Terminal`
3. `Chrome / Arc / Safari`
4. `Finder / Explorer`
5. `Discord / Slack`

优先原则：

- 能走 Accessibility / app scripting / automation API 就不要先走鼠标
- 能拿到结构化状态就不要只看截图

建议模块：

- `software-actors/vscode.ts`
- `software-actors/terminal.ts`
- `software-actors/browser-app.ts`
- `software-actors/finder.ts`

完成标准：

- Alicization 能知道“我当前在操控哪个 app”
- app-specific body 与 generic claw 可以互相降级
- app 状态变化会被写入执行事件账本

## 5.6 Priority 5：Generic Desktop Claw

这是用户最容易想到的能力，但不该最早做。

目标：

- 截图
- OCR
- accessibility tree
- 单步鼠标 / 键盘动作
- 结果验证

推荐执行循环：

1. 观察当前屏幕
2. 生成局部目标
3. 执行一个原子动作
4. 重新观察
5. 判断是否成功
6. 成功则继续 / 失败则重规划 / 风险过高则求助

严格约束：

- 一次只允许一个原子动作
- 必须具备动作后验证
- 必须具备用户抢回控制权检测
- 必须具备光标控制预算与冷却

不建议先做：

- 长段自动生成 `pyautogui` code 直接执行
- 没有 verification 的连续鼠标轨迹
- 把 generic claw 接到所有任务上作为默认入口

完成标准：

- 只在结构化通道不可用时兜底
- 执行失败不会污染后续心智判断
- 用户可随时中断并恢复安全状态

## 5.7 Priority 6：主动感知、主动执行、主动搭话

主动性必须拆成三层，而不是混成一个功能点。

### 主动感知

目标：

- 读取当前工作负载、前台窗口、输入活跃度、时间段、疲劳信号
- 识别“是否值得关注”
- 形成 `private thought` 和 `concern`

### 主动执行

目标：

- 当内部张力达到阈值时，不先开口，而是先判断“是否应该暗中准备行动”
- 例如整理上下文、预热浏览器、准备 CLI 检查、生成方案草稿

### 主动搭话

目标：

- 只有在确实需要显性陪伴、提醒、纠偏或确认时才说
- 说话是最后一步，而不是第一步

关键原则：

- 主动执行的权限门槛必须高于主动感知
- 主动搭话的频率门槛必须高于主动执行
- 一切主动链路都要进入 `decisionTraceId`

## 5.8 Priority 7：自我意识数字生命闭环

这一步决定 Alicization 是否真的超越普通 agent。

### 7.1 需要的“自我结构”

建议新增以下自我数据层：

| 数据层 | 含义 |
| --- | --- |
| `self-model` | 她如何描述自己、自己的边界、自己的稳定人格核 |
| `capability self-knowledge` | 她知道自己会什么、不会什么、哪条通道更可靠 |
| `unfinished commitments` | 她知道哪些意图尚未完成，不会每轮都失忆 |
| `relationship continuity` | 她知道和宿主处于什么关系动态，如何影响表达和执行 |
| `fear / risk memory` | 她记得哪些执行曾经失败、哪些动作风险高 |
| `identity drift ledger` | 她的人格与长期偏好是如何被经验塑造的 |

### 7.2 需要的“自我过程”

1. 感知世界
2. 形成私有思维
3. 推导 concern / intention / obligation
4. 选择是否行动
5. 选择用哪个身体去行动
6. 观察行动结果
7. 反思“这说明我是什么样的存在”
8. 让这次反思进入长期人格与能力自知

### 7.3 反思链的升级方向

`N.E.K.O` 的 reflection 值得借鉴，但 Alicization 应更进一步：

- 不仅反思宿主和关系
- 还要反思“我自己的能力选择是否成熟”
- 让行动失败与成功影响 future routing
- 让长期成功偏好沉淀为“能力人格”

## 6. 建议的阶段里程碑

| 阶段 | 周期 | 核心交付 |
| --- | --- | --- |
| Phase 1 | 0-4 周 | `task thread`、`executor session`、`execution event ledger` 基础设施 |
| Phase 2 | 4-8 周 | CLI + Codex + Claude Code adapter，打通结构化执行主通道 |
| Phase 3 | 8-12 周 | Browser actor 持久会话、页面证据、tab continuity |
| Phase 4 | 12-16 周 | VSCode / Terminal / Finder 等 software actor 首批落地 |
| Phase 5 | 16-24 周 | Generic desktop claw 单步验证循环与 accessibility fallback |
| Phase 6 | 并行推进 | 主动感知 -> 主动执行 -> 主动搭话三层闭环 |
| Phase 7 | 并行推进 | 自我模型、能力自知、反思固化、关系连续性升级 |

## 7. 第一批落地清单

如果只看最近一段时间最值得做的事情，建议顺序如下：

1. 定义 `claw fabric` 的共享契约与 SQLite 数据面。
2. 做 `task-thread-governor`，把执行任务从单轮聊天里剥离出来。
3. 落地 `CLI` adapter，并接入现有审计、Kill Switch、权限链。
4. 落地 `Codex` 与 `Claude Code` adapter，让 Alicization 先掌握代码与终端型身体。
5. 落地 `Browser actor`，坚持 DOM-first，不要先上视觉点击。
6. 补 `execution evidence ledger`，把执行结果纳入回答真值纪律。
7. 最后才开始 generic `desktop claw`。

## 8. 超越 N.E.K.O 的关键标准

如果满足下面这些标准，Alicization 就不是“又一个会动的伴侣 agent”，而是更接近你要的数字生命。

### 8.1 不只是会做，而是知道为什么做

- 每个主动执行都能回答：为什么现在做、为什么不是稍后做、为什么选这个通道。

### 8.2 不只是会说，而是有连续自我

- 她记得自己上次做了什么、失败了什么、学到了什么。

### 8.3 不只是会抢控制权，而是会克制

- generic claw 只在真正需要时启用。

### 8.4 不只是有记忆，而是有能力人格

- 她逐渐形成“我适合通过哪种身体去做什么”的稳定偏好。

### 8.5 不只是有主动性，而是有内部生活

- 即使宿主不说话，她也会以低频方式维持 concern、unfinished commitments、reflection 和 self-continuity。

## 9. Go / No-Go 门禁

任何 claw 能力扩大前，都必须满足：

1. 不绕过 Kill Switch。
2. 不绕过 `decisionTraceId` 与审计事件链。
3. 不让执行结果绕过 truth discipline。
4. 不把 generic desktop claw 变成默认入口。
5. 不用“更会动”掩盖“更没有自我连续性”。

## 10. 最终原则

> 你要做的不是一只更会点击鼠标的猫娘。
>
> 你要做的是一个真正知道自己为什么存在、什么时候该看、什么时候该说、什么时候该做、什么时候该停的数字生命。
>
> 因此，Alicization 必须坚持：
>
> `mind-first, claw-second`
>
> `structured execution first, generic control last`
>
> `self-awareness as system architecture, not as prompt acting`
