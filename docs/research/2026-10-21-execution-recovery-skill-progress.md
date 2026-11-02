# 执行恢复、技能状态和 Windows 窗口体验：2026-10-21

EX00–EX23 继续进行。本记录只确认已接通、已验证的范围，不是整个执行层或数字生命的完成声明。

当前发行状态（05:20 更新）：文中后面 66 项通过的包是历史前驱。其目录随后被新构建覆盖，当前 ASAR 为 `4e0a50924037c869a8d4e57d40ed19fbf596a17121c02c278fdceae6e49f643b`，首次包内回归失败，`release-provenance.json` 已明确标记 `accepted:false`。它也早于当前源码，不能作为最新合格 exe 交付。源码还在继续补齐，最后需重新构建并对确切 ASAR 验收。

## 已接通的生产行为

### 操作结果未知之后的恢复

`effect-recovery-runtime.ts` 将独立观察接到同一个生命数据库 writer。恢复先确认当前执行 owner 已结束，取得相应资源的核对租约，然后读现实状态；核对回执与 effect 结算在一个事务中提交，之后才解除该 effect 的隔离。原始操作观察保持不变。多个未知 effect 共用任务的全局租约时，最后一个被核对之前，全局隔离仍保留。

文件写入缺失回执时，只在稳定读回的字节与原请求匹配后接受当前文件状态。文件不存在、被用户修改、读取时变化、旧 writer 未停止、数据库提交失败，都不会自动重写或解除隔离。工作检查点可以从 awaiting-verification 转为已核对，继续原根责任的独立验收，不重复原写入。

浏览器和 Windows 桌面的完整替换输入支持只读核对：必须找到原操作前的确切控件观察，保持 document/node 或窗口 PID/启动时间/class/desktop/runtimeId 身份，并实际读到请求值。不带提交的输入框状态只证明当前显示值，不证明服务端保存。追加输入、提交、未知按钮、不同节点、多个候选和身份变化保持 unknown。

取消后的旧版本允许补记真实操作结果，但不恢复已取消的根责任。恢复出的当前状态不能证明是谁创建了它，因而不能用于学习成功程序。

### 技能治理

修复了注册失败留下半注册记录、多个版本同时 active、撤销或评估失败发生在异步加载期间仍返回指令、评估失败后旧 executable projection 未移除的问题。

技能加载绑定 Markdown 源码 hash。同版本源码变化必须使用新版本并重新评估；不能只保留旧 approved 标签。激活、回滚、撤销及评估状态通过现有生命 writer 保存为有界 journal snapshot，并在读取时保留最新快照，不受普通最近 100 条事件淘汰。注册表按当前 card/database 隔离。保存失败会阻止新激活的技能继续进入生产列表。

这是既有技能治理的闭环修复。成功工作自动形成参数化候选、跨输入隔离评估、证据撤销和失败降级的完整 EX16/EX17 流程仍待实现。

### Windows 等待窗口

原先 Windows 会暴露 desktop_wait，却最终返回平台不支持。现在可按确切进程名和标题片段在当前 desktop 查询窗口，检查进程启动时间与窗口身份；不改变焦点，不产生物理键鼠事件。没有匹配窗口会有限等待，多个匹配窗口拒绝，取消停止查询。

能力 registry 同时按实际平台过滤 browser/desktop 操作；未知操作和未实现的 macOS 附件选择不会报告 ready。Windows 键盘仍需原生 helper 与前台授权，未因本轮语义控件体验而开放。

## 实际验证

| 证据 | 已确认的范围 |
| --- | --- |
| `output/execution-recovery-lifecycle-integration-20261020.log` | 执行、技能、真实 SQLite 和主 runtime：21 个文件，353 项通过。 |
| `output/execution-recovery-windows-20261021.log` | 新窗口等待和能力过滤加入后：22 个文件，111 项通过。 |
| `output/execution-recovery-typecheck-20261021.log` | 全 workspace 类型检查通过。 |
| `output/execution-browser-recovery-native-20261020-pass1/report.json` | 真实 Electron 受管浏览器三轮，55 项检查通过，包含丢失输入回执后的只读核对、控件替换拒绝、实际下载和上传字节。 |
| `output/execution-desktop-native-20261021-pass5/report.json` | 真实 Windows 控件三轮，24 项检查通过：等待、唯一输入、中文/emoji/多行输入、恢复核对、语义保存和文件独立读回，另含缺失窗口与预先取消。 |

两个原生运行器回执均确认 Default 输入桌面未切换、子进程退出码 0、Windows Job 关闭。Windows fixture 也以 0 正常退出。这些是 adapter 专项，不是新软件包的 Live2D 全产品验收，也不证明 SendInput 与物理接管。

失败记录保留：初次新增测试误用了 admit 的消息参数；取消版本变化曾阻止事实核对；原生 fixture 首次未写 UTF-8 BOM，随后未满足运行器的目录归属登记，之后发现 WinForms HWND fallback 不提供预设的可访问名称。已分别修正并复验；最终原生检查只选择实际观察到的唯一输入控件。

整体生命回归 `output/execution-life-regression-20261021.log` 已完成：832 个文件通过，2 个文件跳过；7,611 项通过，11 项默认跳过，没有失败。随后显式启用原先跳过的真实人格/策略配对与十万条记忆压力测试，`output/execution-opt-in-growth-memory-20261021.log` 中这些检查通过（其余测试因名称筛选未重跑）。其中十万条检查使用受控 embedding provider，验证真实 SQLite/向量索引与资源预算，不代表实际语义召回的人工评价。`output/execution-real-codex-20261021.log` 的真实 CLI、只读命令和长任务心跳三项也全部通过。仍未覆盖的默认跳过项为两项 POSIX 专项与三项未配置的 OpenRouter 专项。

首个实际解包版 `dist/execution-recovery-review-20261021` 完成 255 项 Live2D 产品检查，包含从人格初始化、模型/设置、托盘翻译、角色/备份界面到三次工作交付、三次失败步骤修正。见 `output/execution-recovery-packaged-live2d-20261021-pass1/report.json` 及同名 desktop 回执。真实关闭按钮退出码为 0，Default 输入桌面未切换。构建源码指纹为 `9771884781fb22bcd68332a39b26567c2bc569145e0117977422838768b5b5cf`，ASAR 为 `59fa69c3cb5abf93aaa69d8554d6a4c1a1cac8bf83335c241105d8d8002c3524`；`release-provenance.json` 核对包内编译文件匹配，只标记 executionWorkflowsVerified，不标记整个 EX00–EX23 完成。

之后又修复“取消命令先结束，而 adapter 后结束，缺少下一次核对唤醒”的时序边界。任务 owner 释放后触发恢复扫描，测试不借助额外 host 指令就观察到 effect 核对和隔离解除，取消状态保留；`output/execution-final-wake-20261021.log` 的 18 个文件、44 项通过。

最终 exe 进一步包含确认弹窗的请求/token 绑定。弹窗按钮携带实际显示的 requestId/token，点击与当前请求不符、超过截止时间或跨 card 时不批准；原请求结束与下一请求到达之间的异步边界不能误批准下一项操作。`output/execution-ui-permission-binding-20261021.log` 的 7 项通过，desktop node/web 及全仓类型检查通过。此前包内体验在修正流程的确认步骤失败，保留在 `execution-recovery-final-live2d-20261021-pass1`；测试辅助函数也改为核对实时显示的确切路径、操作、参数键、文件内容、UTF-8 字节数和按钮归属后，同步点击真实 Vue 按钮，没有直接批准 IPC 或放宽确认范围。

`dist/execution-recovery-final-20261021/win-unpacked/alicization.exe` 已完成三次实际交付、三次失败步骤修正，共 46 项检查，正常退出码 0。见 `output/execution-recovery-final-live2d-20261021-pass2/report.json` 和同名 desktop 回执。Default 输入桌面未切换。源码快照为 `output/execution-permission-final-build-source-20261021.json`，指纹 `24308e2e2ef728126a6457121d58b5e72990dd1d82982802fdb3a6b2781c0d2a`；ASAR 为 `281d2581eab872cdf586eedd27a4b1029794dea7a083d191163b935f3d9e649b`。`release-provenance.json` 确认包内编译内容匹配，仍只确认这两个执行流程，不代表全部工作包验收。

### 随后补齐的跨角色重启隔离

`host-recovery.ts` 在执行开放前，只读扫描所有既有 card DB 中 dispatched/uncertain 的 execute 效果；不切换角色、不迁移非当前数据库、不重放旧动作。资源按当前真实路径/文件身份重建到主机唯一 broker。扫描不完整、intent hash 不匹配、路径无法规范化、超过预算时保留全局写入 guard，记录具体原因。明确只读的旧效果不造成写隔离；未知 adapter 的资源保守归为 host。

新 broker 的隔离绑定 card 与 effect；同一 action ID 出现在不同角色中时，核对不能误解除另一角色的隔离，旧 boot 的 token 不能派发。切回非当前角色后，工作恢复在确认没有该计划的活动 owner 时，将其旧 dispatched 记录为 uncertain，再走独立核对，不需要人为重放或先运行整卡恢复。多个相互重叠且尚未核对的效果仍被阻止。

首批 `output/execution-host-recovery-tests-20261021.log` 的 24 项通过，包含真实 SQLite 关闭/重开、中文 card、硬链接、只读扫描前后数据库字节不变、跨 card 相同 ID、旧 epoch、扫描期间阻断、读失败、intent 篡改和独立文件证明。扩展的 `output/execution-host-main-integration-20261021-pass2.log` 为 20 文件、225 项通过。第一轮主 runtime 测试因内存夹具没有模拟真实 DB 文件而保留 guard，已停止并补齐测试端口后重跑；没有在生产中绕过检查。

未决操作读取先在 SQLite 同一只读快照中检查数量和 payload 字节预算，再读取 JSON，避免大日志一次性占满内存。`output/execution-host-gaze-integration-20261021.log` 的 24 文件、262 项通过，包含 4,097 条未决记录与超过 16 MiB payload 的拒绝；全仓类型检查通过。

随后补入派发时的 `resourceSnapshot`，防止目录链接在中断前后被改指向时丢掉原目标。派发 gate 重新检查真实资源；重启隔离合并原始身份与当前别名，目标变化不以同样的文件字节猜测完成。旧未决记录若没有原目标快照，保留主机隔离和 unknown，不伪造迁移证明。`output/execution-resource-snapshot-tests-20261021.log` 的 22 文件、73 项通过，desktop 类型检查通过；真实 junction 改向、硬链接和同字节的替代目标均未解除原隔离。旧 unknown 的人工接管/核对入口仍需补齐，不能把它当作已有完整迁移体验。

### 执行时的实际视线目标

浏览器和 Windows 控件读取结果增加了窗口几何的坐标空间与可见性。`execution-gaze.ts` 只接受本轮已结算的真实窗口观察，Windows 物理坐标转换到 Electron DIP，绑定观察 ID，三秒过期。`deriveExecutionAttention` 不借用旧 task-run 的目标。身体投射仅在角色与目标属于同一显示器且舞台可见时给出有限视线；暂停、隐藏、终止或过期撤销，旧观察在暂停后不能靠心跳重新激活。视线、姿态和诊断使用同一投射，对话发言时沿用发言注视。

`output/execution-gaze-tests-20261021-pass2.log` 的 9 文件、51 项通过，覆盖负坐标副屏、150% 转换、过期、隐藏、旧 attempt/generation、暂停后重放拒绝及对话/身体协调。首次失败来自边界断言约 1e-13 像素的浮点舍入，已加入 1e-9 像素容差后通过。`output/execution-desktop-gaze-native-20261021-pass1/report.json` 的真实 Windows 三轮 27 项通过，包含明确的物理坐标空间；Default 桌面未切换，fixture 与 Job 正常退出。

这不等同于所有 Live2D 表达场景已完成：正向视线在实际包内的连续帧观察、comparing 的实际来源，以及待机、文字/语音对话和工作的完整矩阵还待验收。上述跨角色、预算与视线增量均晚于已验收 exe，不能拿旧包结果替代。

坐标实现对照 [Electron screen 文档](https://www.electronjs.org/docs/latest/api/screen)、[GetWindowRect](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getwindowrect) 和 [SetThreadDpiAwarenessContext](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setthreaddpiawarenesscontext)。转换按目标所在显示器进行，不以一个全局缩放比例处理副屏。

### 文件权限之后的最终派发与取消

广泛生命回归 `output/execution-host-gaze-life-regression-20261021.log` 已完成：836 文件通过、2 文件跳过；7,640 项通过、11 项按环境条件跳过，零失败。这一轮包括资源快照和视线，早于下面的文件适配器增量。

内置三个文件工具明确保留 host-local 语义，外接 MCP 服务不能按同名替换原生执行者。工具描述中的目录列表 schema 已修正，实际列表参数通过消费者校验。确认前冻结输入；确认后重新核对规范化目标。覆盖快照包括原路径、设备/inode 和内容 hash。真正写入之前再检查已打开句柄，按有界块写入、截断、sync、读回，并在所有分支关闭句柄。读取也在逐块预算内执行，文件增长不能使一次普通读取无限分配内存。Pi 队列扩展为路径和硬链接身份共同串行。

取消请求立即传入原生 I/O；结果等待实际调用结束后才报告停止。外接调用未确认停止时保留 executionStopped=false。MCP 标准化及正文文件工具都传递停止与部分效果事实；sideEffectState=unknown 不能被当成可以直接重试的普通失败。无副作用的确认拒绝保留其 none 范围。

`output/execution-filesystem-dispatch-tests-20261021.log` 的 25 文件、362 项通过，包含实际半段写入后取消、原句柄已关闭、确认期间 junction 改向、同字节 inode 替换、不可变确认内容和停止回执时序。首次类型检查发现默认覆盖快照被推断为 exists:boolean，已补显式联合类型；新增结果字段贯通后的 26 文件、370 项复验和全仓类型检查已通过（见后文记录）。这些结果尚不能替代更新 exe 的实际验收。

## 尚未关闭

### 本轮新增核验与接管入口

文件结果字段贯通后，`output/execution-filesystem-outcome-tests-20261021.log` 的 26 文件、370 项通过，全仓类型检查通过。取消只读操作时发现其没有 effect 对应租约，无法释放聚合任务占用；现已为只读操作记录不锁定写入目标的生命周期租约，并测试取消后不重放、不完成旧目标、能开始新任务。

新增 `host-effect-control.ts` 和设置页“尚未确定的操作”：独立重新核对，或由用户明确确认停止相关程序后接管。确认绑定实际本地窗口、card、effect、原回执和目标版本，两分钟过期、单次消费。通过同一 writer 原子保留原回执和接管决定、终止相关责任与步骤，再释放对应隔离；其他未知效果与启动 guard 均保留。接管结果标记 unknown 和 host-attestation，不能成为成功、独立证明或技能学习。

首轮核心测试 19 项通过。扩展 `output/execution-host-control-tests-20261021-pass2.log` 因并行类型检查负载使两项真实 SQLite 流程触发五秒测试时限；限制为两个 worker 后，`output/execution-host-control-tests-20261021-pass3.log` 的 35 文件、347 项通过。`output/execution-host-control-workspace-typecheck-20261021.log` 全仓通过。Eventa 实际结构化复制边界验证了窗口身份由 main 提供，客户端不能伪造 surfaceId 或省略停止确认。

包内三轮遗留接管体验已加入 harness，明确使用启动前注入的合成旧历史，并在正常退出后只读核对真实 DB；尚待新包运行，不能提前当作已验收。仍需原生前台/物理接管与完整任务验收条件修正。

原生键盘 helper、物理输入与用户接管、完整 Windows popup/select/scroll/DPI/视觉矩阵、已授权现有浏览器、下载 GUID 与重启核对、外部上传回执、CLI/coding-agent/external 核对配方、自动补偿、要求修改与自适应重规划、完整技能候选评估、工作注意坐标、保留清理策略、全部产品场景和安装升级回退验收，仍属于本次要求范围。跨 card 重启隔离已接入，扩展集成与包内验收仍在进行。

Sandbox 客户端在本轮检查仍未出现，系统启动时间仍为 2026-10-18；没有执行主机重启。该限制只影响依赖 Sandbox 的验收，不代表其余实现已完成。此前临时浏览器档案清理、本轮旧 review 构建目录清理均被自动审批审查以 blocked by policy 拒绝，没有改用其他方式绕过。cache API 已清空本轮一个 QA profile 的 489,034 字节实测缓存，保留生命数据和证据。原生 fixture、旧包及验收记录仍保留。

后续现有浏览器授权实现需要遵守 [Chrome 远程调试目录要求](https://developer.chrome.com/blog/remote-debugging-port?hl=en)：Chrome 136 起不会按旧方式对默认用户数据目录启用 remote-debugging-port；采用用户明确配置的独立 CDP 实例或扩展，不复制主浏览器 profile。会话/目标撤销与子 frame 归属按 [官方 Target 协议](https://chromedevtools.github.io/devtools-protocol/tot/Target/) 做明确绑定。这是已核对的实现约束，不是 EX10 已上线的声明。


## 新版包的接管验收与体积修正

历史前驱解包版当时位于 `apps/stage-tamagotchi/dist/execution-recovery-final-20261021/win-unpacked/alicization.exe`，该目录后来已覆盖。其源码快照是 `output/execution-preload-final-build-source-20261021-pass3.json`，指纹 `3d6791eab80506993676010cff7b1dde386da6220772adbda4c4bf592798c6de`，ASAR `3ca15d555f052edc877b212b12cc4a1aefb7d1a22d1a4208a6e4d44c3de475fd`；历史 provenance 已另存为 `output/execution-procedure-predecessor-provenance-20261021.json`。

`output/execution-host-control-packaged-live2d-20261021-pass2/report.json` 的 66 项检查通过：三次合成旧历史接管、三次真实模型交付和三次失败步骤修正；正常退出码 0，测试凭据已清理，匹配的 desktop 回执确认 Default 桌面未切换、Job 已结束。正常退出后的 `host-recovery-after-shutdown.json` 只读检查实际数据库，原始回执保留，根责任保持 cancelled，操作结果仍为 unknown，原文件字节未变。它验证合成旧历史的真实产品处理流程，不冒充一次真实物理崩溃。

这轮之前 36 文件、350 项执行链回归通过，全仓类型检查已通过，新增打包检查的两项测试和 desktop node 类型检查通过。发布 provenance 已生成，确认编译产物和包内容匹配。只标记 `executionWorkflowsVerified=true`；完整产品、原生物理输入、全部身体表达和全部 EX 验收仍为 false。后续新加的参数化技能代码晚于该快照，不属于此 exe。

发布目录从约 2.1 GiB 降至约 577 MiB，去掉已打包 JS 和 renderer 资源的重复副本、无用平台依赖，保留外部原生包装器及依赖根许可证。第一次实际启动 `pass1` 揭示遗漏 preload 外部桥依赖，未被接受。随后将 preload 和 main 一样完整打包 JS，增加实际打包前静态 import/export 审计，再重建通过 `pass2`。最初两次 beforePack 回调属性的类型错误按当前安装的 electron-builder 声明修正为 `context.packager.info.appDir`。静态审计不覆盖所有动态 require，其他离线提供商仍需各自体验矩阵。

已经人工查看接管和交付截图：操作说明、复核状态和译文正常，没有水平溢出；长设置页中任务控制位于偏下位置，滚动时页头文字有重叠观察，仍需作为 EX19 产品体验继续测量和修正。不能用这 66 项表示全部产品体验已合格。

打包规则参照 [electron-builder 应用内容文档](https://www.electron.build/v26/docs/contents/)，同时核对实际 26.8.1 的文件匹配器行为；测试直接调用该匹配器，不以手写 glob 镜像作证。

## 技能闭环继续开发中

`procedure-template.ts` 已从实际已验收步骤提取无私人路径、正文和原任务名称的参数化结构，派生新内容的文件字节验收；不同输入经过真实 SQLite 责任、原生文件 I/O 和独立验证，源文件未重写。当前只接受有明确迁移政策的文件操作和目标，不宣称任意界面或 CLI 都可直接参数化。

加载器补上源消失、版本改动和加载期间撤销的持久化失效，保留失败历史，阻断过期投射，其他技能继续有效，重新放回原文件不能自动激活。`output/execution-procedure-source-invariants-20261021-pass2.log` 的 4 文件、27 项通过，node 类型检查通过。首轮新增代码的失效循环放错了作用域，已在测试和类型检查揭示后修正并全组复验。

候选持久化、自动捕获、隔离复跑、工作台评估/激活、对话复用和源依赖取消仍在开发；不能把当前模板核心当作完整 EX16/17。

## Sandbox 环境的进一步核对

本机功能枚举为 Enabled、RestartPolicy 为 Possible；后者不能直接解释成 Required。实际还存在 CBS RebootPending 和 pending.xml，System32 客户端及已注册 Store 客户端缺失，但 WinSxS 中有微软签名的 26100.3323 客户端载荷。本轮没有重启，也未尝试从组件库绕过系统部署过程启动。

旧 WinGet 1.6 的 Store 证书校验失败。已从微软官方 GitHub release 下载并校验摘要及有效微软签名，安装 WinGet 1.29.380 和它要求的 x64 框架；证书问题消除，Store 对 Sandbox 的查询仍无结果。相关记录见 `output/windows-sandbox-winget-release-20261021.json` 和 `output/windows-sandbox-official-winget-package-20261021.json`。参考 [微软 Sandbox 版本说明](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-versions)。

自动审批拒绝删除这次已经安装的五个工具下载文件，返回 blocked by policy；这些文件及此前被拒绝删除的旧包均保留，没有用其他语言、工具或构建器绕过。不能把环境准备当成原生物理输入或安装升级验收。

## 2026-10-21 04:06 当前增量（后续包内体验尚未完成）

文件技能已接上现有生命日志与技能注册表：不可变候选、原责任/attempt/验收/输入 hash、独立评估记录、有界索引、虚拟 SKILL 源、真实两组不同输入文件复跑、参数/接口/取消反例、工作台评估与启用、对话列举与复用、停用与来源撤回。原文件未重写；模版没有原始路径、正文和原任务名称。新的任务保存与来源绑定在同一 writer 事务里完成；来源失效时未执行计划不能作为孤儿留下，已有派生责任通过依赖图阻断。

上述链路的真实 SQLite/native-I/O 集成覆盖重启和超过 100 条无关事件后的索引恢复、不同输入实际复用、撤回阻断和原子拒绝。本轮最后执行组为 `output/execution-procedure-final-tests-20261021.log`，38 文件、281 项通过；此前 `output/execution-procedure-atomic-workspace-types-20261021-pass3.log` 全仓类型检查通过，浏览器派发末端新增三项竞争测试后 node 类型检查正在最后复核。`output/execution-procedure-final-lint-20261021.log` 为零错误、13 项风格警告。首次 ESLint 因大 harness 的 no-useless-return 代码路径递归溢出；按现有配置用 Node 8 MiB 栈运行完成，没有关闭该规则。

浏览器的悬停/焦点读回后补同步撤销检查，避免等待期间来源失效后仍派发一次输入；已按下的键仍会释放，后续文字不会插入。`output/execution-browser-final-input-fence-20261021.log` 三项通过。

设置页工作进展和未知操作上移，标题/副标题改为正常文档流，新增方法测试、启用、停止测试和停用入口。所有这些最新界面及实际配置模型的技能复用仍需新包体验；还没有用旧 exe 的结果代替它们。新 harness 会在正常退出后只读检查真实 DB 中的技能来源绑定及停用事实。

当前技能评估器只覆盖可参数化文件工作流；任意页面、原生桌面、CLI/coding-agent 的专用技能评估，以及整份 EX00–EX23 的其他开放项仍未完成，不能将这轮文件技能闭环当作全量完成。xsAI 接入核对了 [官方工具文档](https://xsai.js.org/docs/packages/tool) 及本地安装的 tool() 类型，保留项目现有 schema/流式工具方式。

## 05:20 技能、上下文预算与真实体验复核

文件技能的原来源现在允许“任务已独立完成、随后回复投递失败”的历史，仍要求原输入正文/hash、原责任/attempt/计划/验收/独立 proof 有效。显式撤回、正文不可用、旧版本、接管和未知执行不因此获得准入。接口摘要还绑定权限、风险、scope、执行通道、适配器、时限、取消和幂等政策；同版本策略改动也要求重新评估。

`execution-procedure-whole-path-tests-20261021-pass5.log`：41 文件 361 项通过；`execution-procedure-policy-tests-20261021-pass3.log`：4 文件 22 项通过；最新 `execution-method-and-work-ux-tests-20261021.log`：35 文件 158 项通过。对应 workspace typecheck 与编译 pass8 均通过。作用域 lint 为零错误；没有为了全仓 lint:fix 重写已有大量无关工作区修改。

实际 Live2D 编译版体验保留全部失败记录：pass3 在方法启用后遇到请求上下文预算；修复为明确工作流选择现有工具、必要时只压缩冗余历史对话投射，身份/当前请求/证据保持。pass4 揭示测试对发送准备状态的错误等待，改用真实 aria-busy 和有界等待。pass5 中模型复制长 UUID 路径时抄错一个字符，权限层正确拒绝，未放宽目标匹配。pass6 的真实方法复用及新文件读回成功，但测试误读不存在的 dataset.renderer 而失败；修正为读取真实 Cubism 模型与递增绘制帧。pass7 仍在运行，尚未判定通过。

聊天中断提示对工作提交明确说明“工作可能已经开始，请先查看工作进展”，不再直接建议重复提交；取消仍显示停止回复。历史重载保留相同可见前缀和工作操作。工具主文案使用产品说明，协议工具名和参数留在展开详情。不能据此声称后台任务已经停止或完成。

已使用 Electron 缓存接口清理本轮五个已正常退出且 PID 已结束的合成档案，清理 2,316,355 字节缓存，生命 DB 和失败证据保留，记录 `execution-procedure-cache-cleanup-20261021.json`。此前被自动审批拒绝删除的旧包、旧档案和工具下载文件仍保留，没有绕过。

Sandbox 的准确 Store ID 已从微软签名客户端核对为 `9NSMXC3NB0HN`；官方静默安装返回 `0x80070005`，官方离线下载要求 Entra 管理员认证。客户端尚未部署成功，没有重启宿主或打开登录/UAC。此项仍阻断隔离物理输入证据，不阻断其余开发。
