# Windows 执行进程所有权与方法评估诊断

仍处于 Phase 1 本地数字生命。本次加强执行的可中断性和可解释性；EX00–EX23 的全部验收尚未完成。下面的自有原生程序验证执行通道，不代表模型实际执行质量或整个数字生命已验收。

## 实际反例

原 CLI 加 SQLite 生命周期测试真实启动 Node 父进程及 `detached: true` 后台子进程。取消返回 `CLI_ABORTED` 后，后台子进程仍然存活。账本正确保留 uncertain，没有误报根责任完成。测试按原始进程的可执行路径、nonce、PID 和启动时间核对身份，保留原生句柄后清理自有子进程。

原记录在开发工作树 `output/cli-descendant-cancel-native-20261030-pass2.json`。非 detached 对照通过，不能代替这个失败反例。

## 实现与边界

`execution/windows-process-job.cs` 是固定的 Windows 原生监督程序。目标通过 Windows 10+ 的 `PROC_THREAD_ATTRIBUTE_JOB_LIST`，在 CreateProcessW 创建时纳入没有 breakaway 权限的匿名 Job，并保持挂起，再出具 ready 回执。主进程重新检查当前 action、工作步骤委派及取消信号后，才签发两秒内有效的 go。撤回、超时或控制数据损坏时，目标不能恢复执行。

复查还发现单独 CreateProcess／AssignProcess 的创建窗口。对自有源副本在 API 返回后的确切位置注入暂停并终止守护进程，原方案留下挂起子进程，创建属性方案在同一位置没有残留；两者均未运行目标第一条指令。新增仓库测试 `windows-process-creation.integration.test.ts` 在真实 OS 上保留这个反例边界，回归时核对原始映像、nonce、启动时间和持有句柄后清理自有进程。CIM 在目标恢复前可能不返回 ExecutablePath，观察改用 QueryFullProcessImageName。第一次故障脚本还错误地等待了继承管道的 close，原生句柄清理后保留失败记录，第二次完成对照。这项证据覆盖显式的应用层创建窗口，不宣称已验证所有内核内部中断微步。

Job 使用 `KILL_ON_JOB_CLOSE`，句柄不被目标继承。普通 CreateProcess 后代，包括脱离控制台的子进程，属于同一 Job；正常根进程退出后也清理残留后代。监督程序保留所有者的原始进程句柄，所有者退出时停止 Job。停止后查询 active-process 数量及原始根进程句柄，才出具 treeStopped 回执。监督程序突然死亡会关闭 Job；缺少完整回执仍是 unknown，不凭 PID 猜测完成。

实现依据 [Microsoft Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)、[UpdateProcThreadAttribute](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute)、[Windows SDK 属性定义](https://github.com/microsoft/win32metadata/blob/main/generation/WinSDK/RecompiledIdlHeaders/um/WinBase.h) 和 [Process Creation Flags](https://learn.microsoft.com/en-us/windows/win32/procthread/process-creation-flags)。Job 是进程生命周期所有权，不是操作系统安全沙箱。WMI、服务、远程调用或其它独立进程代办需要另行跟踪和核验，不能把全部外部效果视作已撤销。没有移植外部项目模块源码，本次为依据公开 API 的自有实现。

`windows-process-job.ts` 管准备、签名控制、双阶段准入和回执校验。固定编译器使用 Windows PowerShell/.NET，在主进程指定的 execution-native 子树内创建唯一目录，收紧 DACL 并校验程序字节。私钥只经过控制 stdin 和内存，目标继承的 stdin 保留原始剩余字节。磁盘记录只存 nonce、摘要和有界进程事实，不存命令、凭据或密钥。控制路径不使用模型参数。

CLI、Codex、Claude 的 Windows 执行均接入同一监督程序。CLI 保留 argv、shell 和编码后的 Windows 读命令，以及现有流式输出预算。Codex 保留协议事件与终态判断，但最终成功还要通过进程停止回执；未知停止状态禁止当成成功或安全重试。Claude 的 Windows 缓冲输出、取消、超时和输出上限均在原生关闭后结算。主 runtime 经 dispatcher 和 registry 传递 execution-native 根目录；此配置不进入模型或 renderer 合约。POSIX 进程组逻辑另有原测试覆盖。

进程停止只证明写入者停止。此前已发生的文件或外部效果，仍需独立验收及对账。SQLite 联合测试明确保留 uncertain 效果和对应资源占用，禁止把取消当作完成或自动教给方法学习。

## 实际验证

- 固定 C# 程序五项原生反例通过：准确的 Unicode/引号/反斜杠 argv 与 stdin；停止 detached 子进程；守护进程突然死亡；go 前撤回；损坏 go。另一个原生测试保留自有替代所有者的句柄，观察其退出后停止后代；这个测试不代表完整成品崩溃恢复矩阵已验收。
- 三执行器、方法学习、原生 I/O 及 SQLite 联合运行 168 通过、0 失败、2 条件跳过。真实 Codex 方法和一个平台条件保持原条件，没有用替代程序冒充模型。
- 最终三执行器原生文件独立复验 13 通过、0 失败，包含正常写入、已启动后取消、挂起后撤回授权、执行超时及 Claude 输出预算溢出。Codex/Claude 使用明确隔离的自有无联网原生传输程序；真实模型质量另验。另一个活跃 Job 不受停止目标影响。
- 最终桌面 node/web 类型检查通过。原初次失败、一次被类型错误中止的测试以及测试自身的类型错误均保留；后续通过没有覆盖原记录。针对性 ESLint 修复通过，既有 runtime 的告警未当作错误隐藏。

原子创建最终源码 SHA-256 为 `343ee14770bc26b28e463bd66bc3370ef2fa88ae1a8cd46bbadd3869df38f67f`。加入原子创建及其故障注入测试后，十文件运行 169 通过、1 真实 Codex 来源失败、1 平台条件跳过；node/web 类型检查通过。原子创建之前的一轮实际 Codex 完成了来源、八项不同输入／反例评估、启用、三次新内容和撤回；新一轮在来源阶段明确返回请求连接失败，效果为 uncertain、责任 blocked。不能用前一轮通过把当前服务状态标为通过，也不能把连接失败归因于尚无证据证明的具体组件。

主要记录在开发工作树 `output/windows-process-job-native-20261030-pass1.json`、`output/windows-process-job-parent-death-20261030-pass1.json`、`output/windows-process-job-and-replay-cross-system-20261030-pass1.json`、`output/windows-process-adapter-native-20261030-pass2.json`、`output/windows-process-job-typecheck-20261030-pass5.log`。这些结果来自开发工作树；合入主目录后还要重新绑定源码、编译、安装及实际成品测试，不能继承先前成品的全部签收。

原子版本记录为 `output/windows-process-job-atomic-native-20261030-pass1.json`、`output/windows-process-job-creation-crash-20261030-pass2.json`、`output/windows-process-atomic-and-replay-cross-system-20261030-pass1.json` 和 `output/windows-process-job-typecheck-20261030-pass6.log`。第一轮实际 Codex 方法记录为 `output/windows-process-job-real-codex-method-20261030-pass1.json`。

## 方法重放可诊断性

v287 main 完整运行是 6182 通过、1 失败、21 条件跳过。唯一失败是实际 Codex 方法第一次 different-input 重放，首次来源任务已经成功。原始记录只有失败摘要及证据摘要，不能据此断言网络问题。

新的 `procedure-evaluation-diagnostic.ts` 为失败评估保留不超过 512 字符的责任状态、独立验收 verdict、步骤状态和已知错误码。任意未知错误码只记 OTHER，指令、路径、文件内容、凭据及原始模型输出不进入该摘要。真正零退出却没有目标产物的原生反例仍然失败，原始私密来源文件不变，错误方法不会启用。

## 后续验收

仍需真实配置的 Codex 方法重放、Claude 网关执行，成品的取消／崩溃／恢复与外部代办矩阵，真实用户接管、菜单／DPI／视觉兜底，以及完整 EX00–EX23 的其它开放项。原生传输程序通过不能替代这些证据。旧验证包只在确认没有进程读取、逐文件摘要一致后迁到 D 盘，原始测试记录和用户状态保留。
