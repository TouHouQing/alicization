# 执行层优化：同类实现调研与复用决策

调研日期：2026-10-18。10 个开源项目固定到具体提交，静态检查 29 个实现/包配置文件及根目录许可证；另查阅 5 项已发布商业 API/产品的官方资料。外部源码未安装、未执行，闭源内部机制保持未知。

本文件为 [开发优化方案](../plans/2026-10-18-execution-life-optimization-plan.md) 的来源依据。哈希、提交、许可证与文件列表见 [来源清单](2026-10-18-execution-reference-source-manifest.json)。外部源码节选保留在 workspace output 中，源码与许可证合计约 1.22 MB；未克隆完整仓库。

## 开源实现

### O01 Pi

- 仓库：[正式来源](https://github.com/earendil-works/pi)；提交 `482c1381a00d8d00bc81697e4a980c593db6803e`；提交时间 `2026-10-18T02:15:33Z`；根许可 `MIT`。
- 实际机制：工具调用生命周期、steering 与 follow-up 分开；finishTurn 可给出显式继续决定；截断的工具参数不派发。会话管理保存树状来源。
- 本地落点：保留既有 EventLoop，吸收工具生命周期和中途纠正语义；优先复用仓库已经适配的事件流。
- 取舍：当前仓库由 badlogic/pi-mono 重定向至 earendil-works/pi。核心循环和会话保存不提供 Alicization 的权限、外部效果核验或人格权威。
- 阅读入口：
  - [packages/agent/src/agent-loop.ts](https://github.com/earendil-works/pi/blob/482c1381a00d8d00bc81697e4a980c593db6803e/packages/agent/src/agent-loop.ts)
  - [packages/coding-agent/src/core/session-manager.ts](https://github.com/earendil-works/pi/blob/482c1381a00d8d00bc81697e4a980c593db6803e/packages/coding-agent/src/core/session-manager.ts)

### O02 Hermes Agent

- 仓库：[正式来源](https://github.com/NousResearch/hermes-agent)；提交 `354ad3d48786f2978c49be88f28c13d78fa0b6e0`；提交时间 `2026-10-18T10:27:21Z`；根许可 `MIT`。
- 实际机制：GoalContract 表达 outcome、verification、constraints、boundaries、stop_when；GoalGate 在模型评审前运行确定性检查。技能管理有路径校验、写锁和原子写入。
- 本地落点：把目标契约与验收配方接入 LifeObligation；把经验转成隔离评估的技能候选。
- 取舍：不照搬任意 shell=True 验收命令，不把模型 judge 当独立事实；技能被写入不等于已经可靠。
- 阅读入口：
  - [tools/skill_manager_tool.py](https://github.com/NousResearch/hermes-agent/blob/354ad3d48786f2978c49be88f28c13d78fa0b6e0/tools/skill_manager_tool.py)
  - [hermes_cli/goals.py](https://github.com/NousResearch/hermes-agent/blob/354ad3d48786f2978c49be88f28c13d78fa0b6e0/hermes_cli/goals.py)
  - [agent/tool_executor.py](https://github.com/NousResearch/hermes-agent/blob/354ad3d48786f2978c49be88f28c13d78fa0b6e0/agent/tool_executor.py)

### O03 N.E.K.O.

- 仓库：[正式来源](https://github.com/Project-N-E-K-O/N.E.K.O)；提交 `61c7766dba74462e0f7726b60e2854d9b7343dcb`；提交时间 `2026-10-18T10:39:33Z`；根许可 `Apache-2.0`。
- 实际机制：DirectTaskExecutor 分析当前意图并选择 computer/browser/plugin 等执行通道；任务带身份；computer-use 循环在截图、模型返回及操作边界检查取消。
- 本地落点：借鉴陪伴主体与专用执行适配器的职责分离、任务关联及密集取消检查。
- 取舍：保留本项目单一心智；不直接接受模型生成的 pyautogui 代码为可执行授权，也不复制另一个人格/记忆中心。
- 阅读入口：
  - [brain/task_executor.py](https://github.com/Project-N-E-K-O/N.E.K.O/blob/61c7766dba74462e0f7726b60e2854d9b7343dcb/brain/task_executor.py)
  - [brain/computer_use.py](https://github.com/Project-N-E-K-O/N.E.K.O/blob/61c7766dba74462e0f7726b60e2854d9b7343dcb/brain/computer_use.py)

### O04 OpenHands Software Agent SDK

- 仓库：[正式来源](https://github.com/OpenHands/software-agent-sdk)；提交 `59b2831c17fbd6793f1cb8103d3fd91e57420324`；提交时间 `2026-10-18T04:37:04Z`；根许可 `MIT`。
- 实际机制：EventLog 追加前检查重复 ID 和父事件，持久化时有锁和写保护；ConfirmRisky 将风险判断与是否需要确认分开。
- 本地落点：强化事件因果链、版本栅栏和可替换的风险决策接口。
- 取舍：文件日志锁不是外部操作 exactly-once。Python 的锁和存储不直接替换现有 SQLite 单 writer。
- 阅读入口：
  - [openhands-sdk/openhands/sdk/conversation/event_store.py](https://github.com/OpenHands/software-agent-sdk/blob/59b2831c17fbd6793f1cb8103d3fd91e57420324/openhands-sdk/openhands/sdk/conversation/event_store.py)
  - [openhands-sdk/openhands/sdk/security/confirmation_policy.py](https://github.com/OpenHands/software-agent-sdk/blob/59b2831c17fbd6793f1cb8103d3fd91e57420324/openhands-sdk/openhands/sdk/security/confirmation_policy.py)

### O05 Browser Use

- 仓库：[正式来源](https://github.com/browser-use/browser-use)；提交 `aa093a843da5edbf323c0b4145c9b6a0db3ecde8`；提交时间 `2026-10-17T18:53:21Z`；根许可 `MIT`。
- 实际机制：动作与观察由 watchdog 协作；点击关联下载开始/进度/完成及 GUID；保留动作批次中的部分结果。当前 judge 记录附于结果但不覆盖代理自报 success。
- 本地落点：适配 iframe/控件操作、下载生命周期、部分动作结果；在本地验证器单独裁定目标。
- 取舍：不导入整套 Python 代理。不能把 self-report、judge 或下载开始当作真实业务完成。
- 阅读入口：
  - [browser_use/browser/watchdogs/default_action_watchdog.py](https://github.com/browser-use/browser-use/blob/aa093a843da5edbf323c0b4145c9b6a0db3ecde8/browser_use/browser/watchdogs/default_action_watchdog.py)
  - [browser_use/browser/watchdogs/downloads_watchdog.py](https://github.com/browser-use/browser-use/blob/aa093a843da5edbf323c0b4145c9b6a0db3ecde8/browser_use/browser/watchdogs/downloads_watchdog.py)
  - [browser_use/agent/service.py](https://github.com/browser-use/browser-use/blob/aa093a843da5edbf323c0b4145c9b6a0db3ecde8/browser_use/agent/service.py)

### O06 UI-TARS Desktop

- 仓库：[正式来源](https://github.com/bytedance/UI-TARS-desktop)；提交 `3ac2cb8d946d78d5ff92ad17b318eaafa18c178c`；提交时间 `2026-10-09T01:29:51Z`；根许可 `Apache-2.0`。
- 实际机制：GUIAgent 分离模型和 Operator，支持暂停、恢复、取消、截图重试与循环预算。NutJSOperator 明确键盘/拖动/滚动动作，并换算截图像素密度。
- 本地落点：采用 typed operator、坐标空间元数据与逐动作取消；视觉输入作为语义控件的兜底。
- 取舍：NutJS 的全局鼠标/键盘不能直接作为后台输入；依赖 @computer-use/nut-js 的二进制和依赖许可证需在实际引入时单独核验。
- 阅读入口：
  - [packages/ui-tars/operators/nut-js/src/index.ts](https://github.com/bytedance/UI-TARS-desktop/blob/3ac2cb8d946d78d5ff92ad17b318eaafa18c178c/packages/ui-tars/operators/nut-js/src/index.ts)
  - [packages/ui-tars/sdk/src/GUIAgent.ts](https://github.com/bytedance/UI-TARS-desktop/blob/3ac2cb8d946d78d5ff92ad17b318eaafa18c178c/packages/ui-tars/sdk/src/GUIAgent.ts)
  - [packages/ui-tars/operators/nut-js/package.json](https://github.com/bytedance/UI-TARS-desktop/blob/3ac2cb8d946d78d5ff92ad17b318eaafa18c178c/packages/ui-tars/operators/nut-js/package.json)

### O07 Windows-MCP

- 仓库：[正式来源](https://github.com/CursorTouch/Windows-MCP)；提交 `a3d8e0160fd61d8f1002988333fd11c5ad71a639`；提交时间 `2026-10-16T07:31:35Z`；根许可 `MIT`。
- 实际机制：UIA 与窗口服务覆盖多类控件；InputLedger 先记录自身按下的键，再派发，并在中断时释放；物理接管和遗漏释放恢复有独立状态。
- 本地落点：优先移植 InputLedger 与输入接管算法到本地 native helper，补齐 Windows 目标和焦点验证。
- 取舍：快捷键依赖前台 SendKeys；整个项目要求 Python >=3.14。采用小模块移植，避免整包引入与主桌面焦点争抢。
- 阅读入口：
  - [src/windows_mcp/desktop/service.py](https://github.com/CursorTouch/Windows-MCP/blob/a3d8e0160fd61d8f1002988333fd11c5ad71a639/src/windows_mcp/desktop/service.py)
  - [src/windows_mcp/tree/service.py](https://github.com/CursorTouch/Windows-MCP/blob/a3d8e0160fd61d8f1002988333fd11c5ad71a639/src/windows_mcp/tree/service.py)
  - [pyproject.toml](https://github.com/CursorTouch/Windows-MCP/blob/a3d8e0160fd61d8f1002988333fd11c5ad71a639/pyproject.toml)
  - [src/windows_mcp/desktop/control_ledger.py](https://github.com/CursorTouch/Windows-MCP/blob/a3d8e0160fd61d8f1002988333fd11c5ad71a639/src/windows_mcp/desktop/control_ledger.py)
  - [src/windows_mcp/desktop/control_recovery.py](https://github.com/CursorTouch/Windows-MCP/blob/a3d8e0160fd61d8f1002988333fd11c5ad71a639/src/windows_mcp/desktop/control_recovery.py)

### O08 LangGraph.js

- 仓库：[正式来源](https://github.com/langchain-ai/langgraphjs)；提交 `cc29753d529caa5eed97a65e765ba26c0f88c631`；提交时间 `2026-10-16T20:52:09Z`；根许可 `MIT`。
- 实际机制：SqliteSaver 以 thread/namespace/checkpoint/task/index 存节点写入；普通写入与控制通道有不同冲突语义。Runner 控制并发、取消和节点错误处理。
- 本地落点：在现有 SQLite writer 中实现同等节点产物、恢复游标、错误节点和版本检查。
- 取舍：不再引入 better-sqlite3 第二 writer；节点重试不等于可以重发外部副作用。
- 阅读入口：
  - [libs/checkpoint-sqlite/src/index.ts](https://github.com/langchain-ai/langgraphjs/blob/cc29753d529caa5eed97a65e765ba26c0f88c631/libs/checkpoint-sqlite/src/index.ts)
  - [libs/langgraph-core/src/pregel/runner.ts](https://github.com/langchain-ai/langgraphjs/blob/cc29753d529caa5eed97a65e765ba26c0f88c631/libs/langgraph-core/src/pregel/runner.ts)
  - [libs/langgraph-core/src/pregel/retry.ts](https://github.com/langchain-ai/langgraphjs/blob/cc29753d529caa5eed97a65e765ba26c0f88c631/libs/langgraph-core/src/pregel/retry.ts)

### O09 Temporal TypeScript SDK

- 仓库：[正式来源](https://github.com/temporalio/sdk-typescript)；提交 `34a7913e9c9495c43bc63f445a845cc18a5cebd1`；提交时间 `2026-10-16T16:34:33Z`；根许可 `MIT`。
- 实际机制：Activity 区分排队、单次执行和整体时限，提供 heartbeat、取消完成语义和声明式重试；CancellationScope 区分作用域取消。
- 本地落点：给后台工作窗口、适配器心跳、取消确认和恢复设置明确协议。
- 取舍：本地 Phase 1 不引入 Temporal 服务；其默认 Activity 重试策略不能直接套到发送、付款或未知写入。
- 阅读入口：
  - [packages/common/src/retry-policy.ts](https://github.com/temporalio/sdk-typescript/blob/34a7913e9c9495c43bc63f445a845cc18a5cebd1/packages/common/src/retry-policy.ts)
  - [packages/common/src/activity-options.ts](https://github.com/temporalio/sdk-typescript/blob/34a7913e9c9495c43bc63f445a845cc18a5cebd1/packages/common/src/activity-options.ts)
  - [packages/workflow/src/cancellation-scope.ts](https://github.com/temporalio/sdk-typescript/blob/34a7913e9c9495c43bc63f445a845cc18a5cebd1/packages/workflow/src/cancellation-scope.ts)

### O10 Agent-S

- 仓库：[正式来源](https://github.com/simular-ai/Agent-S)；提交 `15776a8dc659658b1963816ea006f7af1978e595`；提交时间 `2026-10-08T22:27:32Z`；根许可 `Apache-2.0`。
- 实际机制：当前 S3 的 AgentS3 使用单 Worker 加可选反思，保存有限截图轨迹，并以 grounding 接口形成动作；procedural_memory 文件主要构造行动提示。
- 本地落点：把操作前反思限制在当前观察和失败证据，区分思考、动作建议、已执行回执。
- 取舍：不沿用旧版本“全部分层规划”的描述，不把反思提示当已验证技能或把预测代码直接作为执行事实。
- 阅读入口：
  - [gui_agents/s3/agents/agent_s.py](https://github.com/simular-ai/Agent-S/blob/15776a8dc659658b1963816ea006f7af1978e595/gui_agents/s3/agents/agent_s.py)
  - [gui_agents/s3/agents/worker.py](https://github.com/simular-ai/Agent-S/blob/15776a8dc659658b1963816ea006f7af1978e595/gui_agents/s3/agents/worker.py)
  - [gui_agents/s3/memory/procedural_memory.py](https://github.com/simular-ai/Agent-S/blob/15776a8dc659658b1963816ea006f7af1978e595/gui_agents/s3/memory/procedural_memory.py)

## 已发布商业 API 与产品

这些条目依据官方公开协议、功能说明及示例；均不声称取得商业产品内部代码，也不声称已经在 Alicization 中实现其能力。

### C01 OpenAI Computer Use

- 公开可核实：公开协议分开 computer_call 与环境执行结果，动作按顺序运行后反馈新截图；示例另验证页面结果。
- 本地实现：模型生成完成、操作派发完成和目标验证完成分别落库；保留 provider-neutral 适配层。
- 资料边界：模型和托管服务内部实现、训练与总体成功率不作推断。
- [官方资料 1](https://developers.openai.com/api/docs/guides/tools-computer-use)

### C02 Claude Computer Use

- 公开可核实：应用负责执行代理循环；同批每个工具块都返回结果，失败和跳过项可供下一轮重规划；高影响动作在执行前检查。
- 本地实现：动作批次逐项验证目标、风险和取消；失败后交付部分回执；外部页面内容仅作观察。
- 资料边界：闭源模型判断和服务内部注入防御不可复制；不预设它保证完成验收。
- [官方资料 1](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)

### C03 Microsoft Power Automate Desktop

- 公开可核实：UI 元素保存层级属性和有序备用 selector，动作和动作块提供错误处理；官方说明布局、DPI、权限等会导致失效。
- 本地实现：控件多候选定位、强目标身份校验、有限重新观察和逐动作错误恢复。
- 资料边界：selector repair 的专有模型与实现未知；不能凭页面宣传认定它能在任意后台窗口输入。
- [官方资料 1](https://learn.microsoft.com/en-us/power-automate/desktop-flows/ui-elements)
- [官方资料 2](https://learn.microsoft.com/en-us/power-automate/desktop-flows/errors)
- [官方资料 3](https://learn.microsoft.com/en-us/troubleshoot/power-platform/power-automate/desktop-flows/ui-automation/ui-automation-action-fails-errors)

### C04 UiPath Action Center

- 公开可核实：Wait For Job And Resume 通过 JobData 引用暂停并在对应 Job 完成后继续；区分运行、挂起、恢复和停止。
- 本地实现：等待用户或外部依赖时持久化引用并释放执行资源；接续时核验同一责任版本。
- 资料边界：未取得内部服务源码；Job 成功不能代替本项目的业务验收。
- [官方资料 1](https://docs.uipath.com/action-center/automation-cloud/latest/user-guide/wait-for-job-and-resume)

### C05 Manus Browser Operator

- 公开可核实：用户选择并授权已有登录状态的浏览器环境；遇到困难或用户主动干预时可接管。
- 本地实现：区分自有浏览器和用户授权浏览器，复用指定 tab/session，支持接管并让旧操作失效。
- 资料边界：内部规划、验证和持久化实现未知；登录态复用不提供权限绕过或完成保证。
- [官方资料 1](https://www.manus.im/blog/manus-preferred-browser)
- [官方资料 2](https://help.manus.im/en/articles/11711218-how-can-i-take-over-manus-browser-or-vs-code)

## 实际复用准则

1. 优先移植小而独立的协议或算法：Windows-MCP 的输入持有账本、Pi 已适配事件流、下载生命周期及坐标换算。语言不同的模块明确记录为移植，不把 Python 文件放进 TypeScript 目录后宣称已经集成。
2. 适配时固定本清单的提交和文件哈希，保留原许可、版权、NOTICE 与修改说明；所有关联 helper 一起检查。仓库根许可不能替代依赖、模型权重、素材与原生二进制的许可。UI-TARS 的 native 依赖尚不列为已批准可发行依赖。
3. 沿用 SQLite 单 writer、人格/记忆/目标权威和现有工具策略。不复制另一个代理循环来并行决定人格和完成状态。
4. 功能引入后必须有参数化场景、取消/崩溃测试、真实窗口或页面证据。反思、模型自报成功、示例运行、人工注入身体动作均不替代任务完成证据。
5. 项目代码可二开不代表需要整体引入。Temporal 服务、整套 Hermes/Python runtime、完整 Windows-MCP 和另一个 Live2D 人格中心均不作为默认依赖。
