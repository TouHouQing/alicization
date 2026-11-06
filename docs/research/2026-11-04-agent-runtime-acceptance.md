# 四个 Agent 项目的运行层吸收与验收

本轮以 Phase 1 的本地执行闭环为目标：沿用 Alicization 的人格、会话、责任树、风险准入、记忆来源和身体状态。四个上游提供执行机制和代码来源；执行事实仍由本地持久记录、真实文件/进程观察和独立验收确定。

基线 commit：`45f74b07740e44eda1bc92252932a74c952355d8`。此前已有的未提交开发保留。本轮最终源码指纹、测试结果、实际编译产物和清理记录以同目录 `2026-11-04-agent-runtime-validation.json` 为准。

**整轮验收尚未全部通过。** 最终串行批次 1330/1332 通过，2 项真实 Codex 用例失败：原生计量请求明确连接失败，委派方法复跑未取得可靠回执。较早隔离复跑确认过响应流断开，但不能据此将所有未知失败都归为网络问题。本地及后台产品检查的成功不覆盖这两项失败。后续定向补测的合并总数见机器报告；下列兼容范围也不等于完整复制四个上游产品。

最后定向补测合并后为 80 个文件、1334 项：1332 通过、2 失败、0 跳过。真实 Electron/原生语言服务测试归入 integration 文件，独立 framing 单元测试另列；不会把同一组重命名前后的测试重复计数。较早通过的 Codex 记录不替换较晚的失败结果。

## 已实现的能力

| 上游优势 | 实现和归属 | 闭环边界 |
| --- | --- | --- |
| Codex 编码工具链与原生工具 | 保留真实 Codex CLI 委派、文件读写/修改/补丁、搜索、原生执行、工作验收；增加原生 TypeScript/JavaScript LSP | 委派继续使用原责任、审批、沙箱参数、停止凭证及文件结果核验，CLI 自述不能证明任务完成 |
| Codex 并行效率 | `codex-tool-scheduler.ts`、`parallel-admission.ts`、TurnOS | 默认最多 4 个明确允许的只读动作并行；完整提案先持久化；启动与结果按提案顺序登记；修改、界面状态和桌面操作形成独占屏障 |
| Pi 持久用量账本 | `provider-usage-ledger.ts`、`provider-usage-scope.ts`、流式与 one-shot 请求入口 | 每次实际请求先记 started，再记 completed/failed/retrying/aborted；崩溃恢复记 interrupted；请求 ID 去重；各人格独立，记录不依赖普通调试日志 |
| Pi 扩展及恢复 | `pi-extension-runtime.ts`、`pi-extension-program.ts`、`extension-checkpoint.ts` | 版本及权限固定；执行前保存同一 action 的输入和会话记录快照；扩展记录与返回结果在一个事务提交；恢复同一调用直接读取已提交结果；改变参数或版本不能冒领检查点 |
| DeepSeek Harness 插件组合、检查点 | 注册工具与阻止执行的插件可以组合；复用 TurnOS 动作/观察检查点；增加扩展事务检查点 | 全局阻止钩子只能收紧权限；扩展执行仍进入原 Life 准入、事件账本、资源租约与取消链 |
| DeepSeek Harness 程序化工具调用 | `life_programmatic_read`、`isolated-program.ts`、`governed-read-scope.ts` | 真实 QuickJS WASM 堆；JSON 桥接；内部读取各自留下同一 turn/action 的凭证；外层向模型只返回汇总；程序没有直接文件、网络、进程、导入或计时器能力 |
| 原生 LSP | `life_language_query`、`native-language-runtime.ts`、构建资源插件 | 固定随包发布的语言服务器和 TypeScript；支持诊断、定义、引用、悬停、符号；UTF-16 坐标、源文件哈希、结果上限、超时和进程树停止核验 |
| Hermes 会话检索 | `life_search_sessions`、`session-search.ts`、`retrieved-dialogue-proof.ts` | 同人格跨会话的真实发言；查询原始来源和呈现凭证；实际摘录与偏移绑定；发布回复时再次检查撤回和源内容；历史请求不恢复执行授权 |
| Hermes 技能成长与自主选择 | 已验证方法索引、当前版本检索、参数角色、独立复跑、启用/撤销、真实模型自然选择 | 从成功且独立核验的工作提炼方法；新请求重新绑定路径和内容；原来源、参数接口、评测及启用状态共同决定能否使用 |
| Hermes 委派与自动化 | 既有委派责任链；新增 `life_schedule_work`、`life_list_automations`、`life_cancel_automation` | 用户原始定时意图、未来时间、每次责任和验收要求先入库；到点进入普通执行；错过批次只补最近一次；取消记录立即阻止后续派发；未知副作用继续核对 |

## 上游代码、版本与保留的许可

1. [Codex 并行工具调度](https://github.com/openai/codex/blob/bfdbf01bfaeaa6ab23b10e2bd64ed031fd1e5619/codex-rs/core/src/tools/parallel.rs)：共享/独占调度转为 TypeScript 的有限读取批次和顺序持久结算。Apache-2.0 与修改说明保存在桌面 resources/licenses。此前吸收的工具发现与排序保持各自原始固定版本。
2. [Pi 扩展 Runner](https://github.com/earendil-works/pi/blob/642e30b68930a644050794011555a04ed9027eb4/packages/coding-agent/src/core/extensions/runner.ts)：改编 `emitToolCall`、`emitToolResult` 的拦截及结果合并语义，含清除过时 structuredContent 的规则。测试直接改编 permission-gate 示例。保留 MIT 许可。另研究了 [Pi durable runtime](https://github.com/earendil-works/pi/tree/d71c66e05bdafd67e0558bfa65e748c71cd1f379/packages/durable) 的任务所有权、恢复和 UsageDoc；Alicization 用现有 Life writer 实现这些语义。
3. [DeepSeek Harness LSP framing](https://github.com/deepseek-ai/deepseek-harness/blob/8bd073392eef6f54e921a093b95076248eb08cbb/packages/lsp/lsp-stdio/src/framing.ts)：移植 Content-Length 编解码并增加重复长度、数据边界校验。PTC 参考同版本 workflow-ptc 的 JSON realm 和子调用收束；执行引擎使用真实 WASM 堆。保留 MIT 许可。
4. [Hermes 会话检索](https://github.com/NousResearch/hermes-agent/blob/c314285f077e91937c995d419b9fa40af9eb4981/tools/session_search_tool.py)：吸收有界摘录、真实会话来源与内部消息过滤；方法成长、委派、定时工作参考其完整生命周期。查询实现使用 Alicization 的归属和撤回模型。此前直接移植的工具目录筛选保留原 MIT 许可与 notice。
5. 实际依赖：`quickjs-emscripten@0.32.0`、`typescript-language-server@5.3.0` 与仓库固定的 TypeScript。随包保留 WASM、语言服务器、TypeScript 的许可证及第三方声明。语言服务没有要求用户另装开发依赖。

## 一次执行怎样闭环

1. 原始用户输入固定人格、会话、turn 和来源哈希；模型、压缩、修复等实际请求分别写入持久账本。
2. 当前注册表、方法版本及能力发现决定工具接口；Pi 钩子可以拒绝请求，不能替代风险策略授予权限。
3. TurnOS 保存完整工具提案。每个动作仍取得自己的 Life effect、当前来源、资源租约和派发凭证。
4. 明确允许的读取组成有限并行批次。独占动作等待已启动读取全部收束。PTC 与扩展内部读取继续走上述入口，合并的只是交给模型的结果。
5. 扩展将会话输入保存为不可变检查点。结果和 appendEntry 原子提交；同一 action 恢复不会重复写入成长记录。
6. 本地工具或原生子进程返回真实观察。取消、超时、撤销与人格切换先停止并等待所属任务；JSON 中自称“已停止”不能冒充进程停止凭证。未证明停止的动作保持 uncertain。
7. 程序化返回和 LSP 快照可以支持“实际读到了什么、计算得到什么”的回复，不能代替独立业务验收。程序的读取引用必须属于同一个父动作；不能借用别的调用或重复引用凑证据。
8. 回复审核和发布再次检查来源、记忆/方法撤回、人格版本与执行事实。身体状态继续来自同一执行与对话状态。

## 新工具的实际使用边界

### 程序化读取

```javascript
const rows = await Promise.all(paths.map(path => call('filesystem_read_file', { path })))
return rows.map(row => JSON.parse(row.content)).reduce((sum, row) => sum + row.value, 0)
```

外部工具参数是 `{ "code": "...完整程序..." }`，程序通过 `return` 返回 JSON。只有当前仍可用的本地文件读取、目录和内容搜索接口可以作为子调用。普通工具仍负责修改、委派和执行。单次程序默认 16 次读取、16 MB 堆、256 KB 栈、250 ms 累计执行片段、30 秒墙钟、128 KB JSON 边界。整个模型 turn 的 63 动作预算也计入内部读取；外层最多 64 个模型步骤，保留最终回复机会。

### Pi 扩展安装与恢复

每个人格的目录为 `<userData>/alicizations/extensions/<SHA256(cardId)>/`，清单文件 `extensions.json`：

```json
[
  {
    "id": "calculator",
    "file": "calculator.js",
    "sha256": "替换为该文件真实字节的64位SHA256",
    "enabled": true,
    "readTools": []
  }
]
```

```javascript
export default function (pi) {
  pi.registerTool({
    name: 'multiply',
    label: 'Multiply',
    description: 'Multiply two numbers.',
    parameters: {
      type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } },
      required: ['a', 'b'], additionalProperties: false,
    },
    async execute(id, input, signal, onUpdate, context) {
      pi.appendEntry('calculation', { a: input.a, b: input.b })
      return { content: [{ type: 'text', text: String(input.a * input.b) }] }
    },
  })
}
```

模型看到的名称为 `ext_calculator_multiply`。扩展 ID 中的连字符保留，避免 `a` + `b_x` 与 `a-b` + `x` 路由碰撞；ID 不含下划线，工具名不含连字符。过长的组合名称使用稳定哈希后缀限制为 64 字符，完整 canonical capability ID 保留，具有相同截断前缀的工具仍分别路由。工具参数使用 JSON Schema。模块必须预先构建成独立 JavaScript，只有一个 default export；保留前置声明、注释和 UTF-8 BOM 的字节哈希。安装根目录、常规文件、大小、版本与启用状态在准备及调用时重新检查。清单最多 32 个扩展，每个最多 16 个工具、8 种声明读取能力。

支持 `registerTool`、自有工具的 `tool_call` / `tool_result`、`appendEntry`、只读 session entries、实际会话 ID 和受准入约束的 `context.tools.call`。全局 `tool_call` 可用于无 UI 的阻止策略。自定义记录只在所属工具执行内提交。会话快照最多 32 条并另受字节预算约束；同一 action 的快照固定。禁用、改动或接口版本变化会使已捕获的旧工具失效。

Pi 的 Node/UI、自定义 provider、全部生命周期事件以及 experimental durable SDK ABI 没有被声明为兼容。插件不能通过导入 Node、注册额外权限或传入 usage 改写本地权限和用量事实。

### LSP

参数包含 `workspaceRoot`、`filePath`、`operation`，可选 `line` / `character`。支持 TS/JS、TSX/JSX、相应的 m/c 扩展；坐标从零开始。固定语言服务器不运行服务器提供的 executeCommand、applyEdit 或模型指定命令；返回值明确标注单个文档的已发布诊断快照。

Windows 的 Job Object 用于整个进程树的所有权和停止确认。它不等同于 Windows Sandbox 或文件系统隔离。原生语言服务器为可信发行依赖，项目和依赖分析仍使用操作系统权限；位置结果限制在声明工作区，敏感目录入口拒绝。任意程序代码使用的能力隔离来自 QuickJS WASM。Codex 委派的 read-only/workspace-write 沙箱继续由真实 Codex CLI 执行并受原风险策略约束。

### 会话检索、自动化和用量

- `life_search_sessions` 使用 1–4 个精确关键词，支持会话、时间与游标条件，最多 8 条。当前实现是受约束的 SQL 字面量检索，没有宣称与 Hermes FTS5 排序等价。用户撤回、缺少原始输入或未实际呈现的伴随者回复均不能冒充可引用历史。
- `life_schedule_work` 使用带时区的 `firstRunAt`、可选的间隔分钟和有限运行次数。最多 16 次、未来 366 天、同时 64 个有效计划；不是通用 cron 表达式解释器。每次都有独立工作和验收。`{{run}}`、`{{scheduled_at}}`、`{{utc_date}}` 在计算准入哈希之前绑定，避免重复写到原轮次。
- 用量账本保存请求元数据、归属、哈希和服务商实际报告值，不保存密钥或完整请求。缺失 token 分项保留 null，不估造金额或总数。分页摘要只代表该页。原生 Codex 委派报告属于 external-agent-aggregate，另计 invocation，不能计入直接 provider request 数；外部 CLI 没有报告的调用和用量继续未知。

页摘要中的 complete 只表示该页所有条目均报告了相应字段，不能证明原生 CLI 的每个内部 API 请求都报告了计费数据。纯 Agent 文件、LSP、会话和扩展读取会释放旧的屏幕检视延续；独立的当前画面请求仍按原感知准入处理。上下文超限诊断只记录内容类型与大小，不记录图片或用户文本。

## 验收与发现的问题

详细结果由最终机器可读报告给出，原失败证据保存在 `output/agent-runtime-20261104/`。

- 综合回归曾实际执行 74 个文件、1285 项测试，0 失败、0 跳过，包含真实 Codex、被动原生编辑器、方法复用和模型自主修复；末次结果以 validation JSON 为准。
- 真实 SSE、SQLite 和原生文件测试覆盖读取并行、独占屏障、结果顺序、无效/越界程序、缺失全局能力、CPU 循环、取消后的子调用收束、预算、来源和发布栅栏。
- 真实语言服务器覆盖定义、引用、悬停、符号、TS2322 诊断、取消及停止。另用真实 Electron 执行由构建插件实际生成的全部语言服务资源，补上开发依赖路径测试未覆盖的打包边界。
- 语言服务另以真实 Electron 执行实际 ASAR 归档中的 CLI、package.json 和 TypeScript，7 项完整语言服务用例通过。独立子进程探针还验证了 WASM 正则回溯会触发中断，约 263 ms 结束，不依赖主循环计时器打断它。
- 后台 Live2D 产品测试通过真实模型执行 PTC、LSP、Pi 插件、历史检索和定时写入；原生退出后只读重开数据库，核对真实读取凭证、源文件、版本、进程树停止及用量。一次已完成链路保留 25 条请求记录，19 条有实际 usage，6 条保持未知，未闭合请求为 0。
- 三轮自然语言工作不提供工具名、方法 ID 或版本号。真实模型查找已启用方法、映射不同路径和文本，完成独立交付；重载与停用也被实际验证。
- 产品验收发现并修复：定时参数混入运行时字段；LSP 随包资源遗漏 CLI 必需的 package.json；检查器错误依赖可改写的展示标题及不存在的 actionId 字段。保留原失败报告，修正后重新核验原记录并复跑实际产品链路。
- 后续产品复跑还发现纯会话检索的异常上下文膨胀。补上 Agent 读取的感知路由隔离、过期视觉附加内容的防御和不泄露原文的大小诊断后，该版本完整产品链路重新通过：24 条请求、19 条实际 usage、5 条未知、0 条未闭合请求。
- 扩展名称收尾发现跨插件命名边界碰撞；保留 ID 连字符并补上实际隔离堆、注册表路由和 SQLite 回归后，使用最终编译再次跑完五项产品链路，25 项检查通过。16 条实际请求均有 usage、0 条未闭合请求；扩展实际写入 1 条成长记录，退出后核验通过。报告中的编译哈希与最终 main bundle 完全一致。测试目录清理前已导出数据库和停止凭证；本轮共释放约 119 MiB 已确认归属的测试数据。
- 新增真实原生 Codex 计量集成测试，验证实际终端 usage 进入持久账本，重复终端观察不重复计算，且不混入直接 provider request 数。较大验收中出现过 `CODEX_PROVIDER_UNAVAILABLE`：实际错误为响应流断开、网络传输解码失败；原测试及隔离复跑失败均保留，未放宽超时、跳过断言或盲目重放未知副作用。最终复验状态见 validation JSON。
- 检查扩展的改版、撤销、BOM、恢复、参数改变和重复结果；结果与成长记录原子提交，避免崩溃重试产生重复成长记录。

所有产品窗口由原生观察确认位于显示器范围之外且不能获取焦点。原生编辑器使用不激活的测试窗口；主桌面不承担测试输入。清理前先确认原生正常退出、移除测试凭据、导出所需证据，并核对每个测试目录的归属、清单与文件哈希。

## 与上游的差异及判断范围

本轮完成的是上述有边界的执行闭环。Alicization 的优势仍是同一人格、记忆来源、关系/主动性、执行责任和 Live2D 表现连在一起，以及本地可检查的结果核验。上游在其完整领域仍有更宽的覆盖：Codex 的专用编码环境与平台适配、Pi 的完整扩展 ABI、DeepSeek Harness 的多语言插件组合、Hermes 的通用日历自动化与 FTS5 检索。

短期真实使用、独立反例与故障恢复测试支持当前实现质量；它们不能代替数月真实生活的泛化观察，也没有形成四个产品在相同模型、成本与任务集上的排名。长期技能扩张仍需持续保留未知输入、来源变化、负例、撤销、重启和实际结果的验收记录，避免把多次演示成功当作普遍能力。
