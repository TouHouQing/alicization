# Windows 前台键盘实施约束

当前原生实现及主程序接线已选择性合入主工作区，保留每份原文件和前后SHA256。该能力属于Phase1 execution，由同一card、责任、effect和全局资源broker管理；它不产生独立人格或记忆语义，也不把输入成功当成任务完成。EX06及全部EX工作包的未完成项仍保留。

按用户最新授权，后续真实输入直接在本机自有测试窗口进行，测试虚拟机已正常关机。本机pass5通过144项检查：18轮正常／拒绝执行、3轮真实Node进程崩溃和SQLite重开后的只读核对。fixture正常关闭，数据库关闭，原生actor和guardian释放并退出；三次恢复均没有重放按键，也不证明根任务完成。确切454份源码及依赖清单见`output/execution-keyboard-owned-host-proof-20261025.json`。32份文件已按前后哈希选择性合入主工作区，19份原文件有备份，并保留主项目已有的人格状态策略；主项目回归待进行。审批端口仍是合成实现，不能据此关闭完整Electron和最终安装包验收。

本机发现并修复两个路径问题：原生回执必须从已校验程序集所在目录派生，不能依赖可能回退的TEMP；Win32回执、SQLite连接及迁移／快照／备份读取使用扩展路径，不更改系统长路径设置。真实文件锁定100轮检查、长路径双回执及56项相关测试通过；备份／迁移相关62项及新增状态连续性测试通过。原夹具读写命令文件的共享冲突也已修复，状态采用完整原子替换。原始失败结果保留，包括外部输入接管导致的零输入、双方已释放的拒绝；没有放宽接管或释放要求。

最新隔离来宾pass11通过450项原生和111项生产组合检查：9轮正常输入、21轮故障、18轮产品操作全部完成，fixture、数据库、键盘和来宾正常关闭。确切ISO22、439份bundle源码及7份原生源码哈希见主目录output/execution-keyboard-product-current-source-proof-20261025-v2.json，完整结果为output/execution-keyboard-product-guest-green-20261025-pass11.json。生产desktop adapter、SQLite、action gate、全局broker及原生writer均真实，审批端口为合成实现；完整Electron原生输入和最终安装包验收仍待完成。历史449项、pass9及其失败记录保留，不沿用到改过的源码。

心跳读取顺序、启动首拍、停止后接管均有确定性RED/GREEN；最新宿主纯原生141项通过，不挂hook或注入输入。原生编译/hash/关闭及只读observer/writer19项通过。普通聊天现在后台合并能力健康检查，冷编译期间快捷键保持不可用；显式执行仍等待真实就绪及逐次权限核对。完整运行时173项及Node类型在独立工作区通过，未处理错误为零。

主工作区旧v161完整回归因运行时冷编译阻塞而失败，11项失败、40个未处理拒绝；其通过计数不替代整体验收。Live2D pass113在88项后因现有20秒模型请求超时停止，正常退出且凭据清除。新修复合入后必须重新完成主项目回归、构建和Live2D体验；此前build113/pass112不替代新源码。没有放宽3秒execute握手、500ms心跳、15秒许可、目标身份或输入释放要求。

## Native writer 与独立 guardian

1. Node保存UIA实际观察的窗口、focus身份、card及action authority。只读准备阶段在受保护userData子树编译随产品分发的七份C#源码，验证x64布局、exe哈希和无文件链接；健康检查不读取前台或挂hook。目录保留经核对的原所有者，仅设置当前SID/SYSTEM/Administrators的受限DACL，避免要求普通账户取得WRITE_OWNER。
2. 执行前先持久化当前effect/turn/card、lease epoch/fencing、目标和参数绑定，再以严格JSON stdin启动短生命周期exe actor。固定命令行有`--actor/--guardian`及独立只读`--observe`；后者不读请求、不建输入账本、不挂hook、不派发按键。没有任意shell、窗口激活或提权。actor启动同一exe的guardian，双方持有对方和Node parent的实际进程句柄并核对创建时间。
3. 两个 helper 都安装快速低级键盘/鼠标 hook 和消息泵，避免单一 hook 进程失效后丢失物理接管状态。回调内不得文件 IO、等待锁、调用 Provider 或查询 `GetAsyncKeyState`。
4. 使用随机 nonce 命名、当前 SID/SYSTEM/Administrators DACL 的本机会话共享内存及停止 event。逐键记录 `pending/delivered/released`，在 down 前登记归属。原子字段与明确内存屏障代替回调等待锁；cleanup 的互斥不得阻止 hook 链返回。
5. 输入以一次完整 `SendInput` 数组插入：修饰键 down、主键 down、逆序 up。repeat 不展开为一个大数组，每一轮重新核对目标、许可、停止状态及物理键。核对实际插入数，部分插入不可当作完成。
6. 两个 helper 都监视对方心跳、进程句柄、父进程和目标。任一停止原因先置停止 event，再阻止自己的后续 down；保留自己已拥有按键的释放路径。guardian 在 Node/writer 崩溃后仍完成释放核对。不得绕过私有 QA Job 的进程约束。
7. 两个 helper 同时消失、整个 Job 被杀、系统挂起/安全桌面切换等无法验证情形，记录未知效果并保留隔离；不能宣称绝对释放或自动重放。

## 目标、许可和风险

- 目标来自实际观察，包含 desktop、HWND、PID、进程开始 ticks、窗口 class 和当前 focus 身份；请求中由模型自行写入的 PID/句柄没有授权意义。
- Node 的 foreground broker 持有 `physical-input:<desktop>` 独占租约，资源 epoch、fencing token、card、当前 effect、参数摘要、目标观察和 approval 均有绑定。调用前后核对来源/责任版本和 action authority。
- 原生下发前重新核对同一 foreground HWND、PID、原进程句柄、class、focus 及输入 desktop。不得 `SetForegroundWindow`、切 desktop、自动选一个标题相似的窗口或执行提权。
- 对高于自身 integrity 的目标明确报阻止；不根据 SendInput 的模糊零返回判断 UIPI 具体原因。
- 常规观察/导航沿用本地默认能力；明确删除、外传、付款、凭据、系统锁定/退出以及不能确定效果的应用快捷键，通过当前目标与快捷键摘要绑定的风险确认。不能把“允许过键盘”变成永久豁免。已知只改变焦点的操作也须有新观察和可中断租约。
- helper 健康与一次动作的前台授权分别建模。健康探测不注入按键；不能设置环境变量或全局 `foregroundAuthorized=true` 来开放能力。没有当前观察时要求先观察；已有的“helper 不存在则不可用”必须保留到实现与验收完成。
- Unicode/多行文本继续走已核对身份的 UIA/语义编辑通道。快捷键编排不接受 Unicode 字符串、宏、多主键、原始 VK 注入、空 token 或静默截断。

## 物理接管与释放

- 物理事件始终向下传递，不允许复制上游“阻止用户输入”的策略。只有 `CallNextHookEx` 返回允许后，才把物理 down 记为实际用户归属。
- 物理键鼠输入先触发停止，再更新实际归属；自己的 tag 只标识本次 writer 的注入，不把所有 injected 事件都当成自己。
- 回调只允许阻止已停止/目标变化后的自有 down；自有 up 不能释放用户后来实际持有的键。物理持有时转移归属并删除自己的释放责任，不能吞掉用户随后 up。
- writer与guardian分别保存每个键的pending/delivered/released；二者都清空后才能开始下一批，避免较慢hook的旧up覆盖新批次。实际双hook、半按键、进程退出及物理Ctrl归属已在449项矩阵中验证。较早61项、112项、136项宿主检查仅作历史编译/协议证据，不替代来宾实际输入。
- 预检时在 hook 外读取实际已按下修饰键和目标键；用户已有按住时拒绝本轮，不用 synthetic up “纠正”用户状态。
- Node 只有取得两个 helper 的实际停止/释放回执和进程关闭，才能释放 broker 租约。`AbortError`、已发 cancel、管道断开或 kill 请求不等于停止完成。未知状态保留资源隔离和原始回执。
- 启动失败可在ready之前返回失败结果，但只能声明零输入、零已完成轮次；仍须核对独立持久actor/guardian释放记录和真实进程退出。guardian原操作失败不等于释放失败，也不让动作变为成功。尚未获准执行却声称输入成功的结果一律拒绝并保留不确定性。
- Node收到ready后先落盘实际guardian身份，再检查当前来源、窗口、焦点、审批时的内容和同一资源租约，最后发送execute。父进程意图记录、actor结果和独立guardian释放记录均限量、CreateNew并刷新磁盘；TEMP/TMP由主进程指向受保护子树。拒绝重用未知writer，未知结果不会因close或超时自动释放输入资源。
- 前台broker沿用当前life effect的同一把锁，正常输入释放不提前释放上层effect；缺少释放确认则隔离原effect。通用physical-input:desktop与具体desktop输入锁对称冲突。采用broker自己的资源记录，不能靠修改返回的lease资源数组扩大授权。外部输入停止本轮并通知主程序取消其执行所有者。

## 实施次序与测试证据

1. 实现严格协议、native 目标读回、hook/账本和双 helper 生命周期。先在宿主仅编译，不注入或挂输入 hook。
2. 在已有隔离 Windows VM 内运行真实 WinForms/WPF 键盘 fixture；刷新只读 QA ISO，验证 guest UUID/nonce/用户、清单和确切源码 hash。不得把任意宿主 shell 开放为来宾命令。
3. Ctrl+S、Tab、Escape 各三轮，独立读取实际 fixture 的事件/产物；Unicode 通过原 UIA 通道独立比对完整字节。
4. 半按键故障、取消、Node/writer/guardian 各自退出、心跳失效、物理持有后接管、用户 up、不匹配 foreground/PID/start/focus/desktop、许可过期和并发竞争。通过 QEMU 虚拟 USB 注入物理事件，确认事件不带 injected 标记；宿主绝不注入。
5. 接入 desktop runtime、local-browser-automation、动态健康、foreground broker、统一风险/许可、取消与 shutdown，再验收真实产品及安装包。纯 TS 账本测试、Chrome CDP、UIA 正常读写和 VM 已启动均不能替代这一证据。

原生基础检查的可复验命令：在独立工作区运行 `powershell.exe -NoProfile -NonInteractive -File apps/stage-tamagotchi/scripts/life-acceptance/windows-keyboard-primitives-check.ps1 -Output <本工作区output下不存在的新json路径>`。原始 24 项纯布局/目标比较、19 项共享视图以及两次跨进程退出检查失败日志均保留；失败确认为模块 progress 的 CLIXML stderr，修复为子进程关闭 progress 并明确 UTF-8 管道，仍要求 stderr 为空和真实退出码 0。最终证据：`output/execution-keyboard-native-primitives-durable-20261025-pass4.json`。没有为通过测试跳过错误或放宽退出约束。

参考：Microsoft [SendInput](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput)、[VK codes](https://learn.microsoft.com/en-us/windows/win32/inputdev/virtual-key-codes)、[LowLevelKeyboardProc](https://learn.microsoft.com/en-us/windows/win32/winmsg/lowlevelkeyboardproc)，以及仓库已固定 commit 的 Windows-MCP 输入账本/监视模块。复用前保留许可与归属说明；不复制阻止物理用户输入的默认策略。
