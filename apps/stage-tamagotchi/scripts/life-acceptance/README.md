# 后台生命体验与原生验收

`windows-process-owner.integration.test.ts` 在真实 Windows 上终止独立的
生产执行所有者，覆盖 CLI／Codex／Claude 的四个时点、每个三轮。它使用
实际 Job、原生进程身份和 SQLite；两种 Coding Agent 使用明确的惰性传输
夹具，不能替代模型网关验收。`node --import tsx` 保证保留的子进程句柄
就是实际所有者。失败目录只有在身份与停止证明齐全、且该轮通过后才清理。

`pnpm -F @proj-alicization/stage-tamagotchi codex:acceptance` 仍使用 tsx。
独立入口在延迟加载真实 dispatcher 前注册 `execution-raw-loader.mjs`，只为
固定的 Windows 监督程序 C# 和编译器 PowerShell 两个 `?raw` 导入提供文本；
桌面和 Vitest 继续使用各自的 bundler。重试回归先核对实际子进程退出和输出，
避免报告缺失掩盖入口加载错误。该入口没有替换生产传输或绕过原生准入检查。

WPF 下拉框通过同一 Windows worker 的 `SelectionPattern` 和
`SelectionItemPattern` 读取/选择实际选项；未展开且没有可观察选项时须先展开。
worker 核对同一进程和选择容器、选中值、完整有界选项以及许可期限，不以文字
写入替代选择。`life-windows-native-scene.cjs` 的 WPF 模式实际验证 Unicode
选项、独立事件文件、控件读回、旧值/选项变化、隐式提交和过期许可拒绝。
2026-10-27 pass7–9 三轮通过，均正常关闭 fixture，Default input desktop
未切换；这是后台原生控件证据，不代表物理输入或全部菜单/滚动/DPI 验收。

`life-installer-schema-cycle.cjs` 用 `LIFE_SCHEMA_CYCLE_INPUT` 指定本轮 output
中的精确 artifact manifest，校验旧 schema6/new schema7 NSIS、ASAR、主入口
与同一个 nonce 合成档案。备份目录故障恢复、旧版拒绝和 Live2D 重开均使用
实际程序；原生错误对话框只在本机不活跃的 QA desktop 上通过精确 PID/出生
时间/哈希核对本次进程新建日志中的错误，并用有界 WM_GETTEXT 核对原生窗的
标题和三个按钮，再发送一次 WM_CLOSE，不切换用户
桌面。这是标题栏关闭语义，不证明物理鼠标操作。它与版本号元数据循环是独立
验收，脚本存在和语法通过均不算实际迁移通过。

`life-release-provenance.ts` 现在识别确切 QA exe 身份，并分别验证 private
desktop 与实际 host 后台报告。host 需要 isPackaged=true、当前 ASAR/入口、
同一原生子进程正常退出，以及每张页面截图对应的全部窗口/显示器几何记录；
开发版、抢焦点、遗漏截图观察、不同入口或异常退出均拒绝。Vitest 还须整体
success=true、实际执行且无失败，不能只检查失败数为零。

正常主进程现在安装有条件的后台测试窗口约束；普通启动不安装 hook。开发版
包装入口只保留模块解析，不再独立实现约束。打包后台运行须同时设置
`LIFE_QA_HOST_VIEWPORT=1`、`LIFE_PRODUCT_RENDERER=live2d`、`LIFE_QA_EXE` 和
对应 `LIFE_QA_INSTALLER_ID`；只允许临时合成档案，或通过既有安装器 nonce、
目录/文件对象、安装目录和确切 exe 校验的本轮 AppData 合成档案。
启动前核对实际 ASAR 的身份、入口标记和当前编译入口 SHA；运行中另核对
真实 app.isPackaged、ASAR 入口哈希及原生窗口。不替换 app 入口，不通过
NODE_OPTIONS 注入。v225 解包版已实际三轮九场景通过，51 项检查和只读核对通过，
实际 ASAR、isPackaged=true、无 Node inspector、原生退出 0/436ms。
新接线和安装档案接续版本仍待构建与安装生命周期验证。

`life-raw-long-work.cjs` 配合 `LIFE_PRODUCT_DELEGATED_WORK=1` 使用相同的
真实引导、模型配置、Live2D 和签名原生退出流程，运行九个委托场景：正常完成、
拒绝后修改参数并重新批准、运行中从父任务取消，各三轮。每次完整核对确认框的
参数、工作目录、请求和令牌，仅点击实际按钮；禁止宽泛自动批准。退出后以只读
SQLite 核对子线程归属、独立根验收、未知效果和只有一次进程启动。取消后先
独立检查确切自有子进程已结束，再使用真实恢复界面的重新核对、明确接管和
停止确认；原未知回执始终保留。主桌面保持在所有显示器以外且不可聚焦。
pass42 的接管残留资源锁失败保留。修复后 v224 pass43 完成三轮九场景，
51 项检查和独立只读 SQLite 核对通过，实际 UI 正常退出 0/498ms。
不代表物理输入、实际 Claude Code 后端或成品通过。

后台入口还拦截开发模式的自动分离 DevTools，并记录拦截次数。原生焦点检查
继续要求本应用不拥有前台窗口，不能用不可见或离屏替代该条件。

`LIFE_PRODUCT_VERIFIERS=1` 增加三轮实际规则导入、预览、应用、重载、拒绝非法
配置和撤销；退出后只读核对六条原子审计及最终配置。与
`LIFE_PRODUCT_VERIFIERS_ONLY=1`、`LIFE_PRODUCT_WORK_ONLY=1`、
`LIFE_PRODUCT_EXECUTION_WORK=1` 一起使用时只验证这组产品场景，不代表全体验通过。

`LIFE_PRODUCT_HISTORY=1` 在启动前向同一个合成档案写入 65 条已取消责任，并
关闭种子 writer。实际设置界面三轮浏览每页 20 条、加载更早记录和手动刷新；
退出后只读核对 65 条责任仍存在且保持取消。可以与上一组的 focused 模式组合，
也可以加入完整执行体验。所有场景仍要求自有后台 surface 和真实 Live2D，保留
源码与编译身份、失败记录、正常退出和凭据移除证明。

嵌套 iframe 原生验收使用 `build-browser-probe.cjs --frames`，必须指定新的 `LIFE_PROBE_BUNDLE` 和 `LIFE_FRAME_PROBE_ROOT`（均位于当前工作区 `output/`）。然后通过 `run-private-desktop.ps1` 运行 `run-browser-probe.cjs`。它使用本机自有服务器验证三轮双层跨进程框架、缩放、精确多行 Unicode 输入及悬停后移位的停止行为；同时核对 `report.json.passed` 与外部正常退出回执。它不证明 Windows 物理键盘能力。失败报告、检查点和原始日志必须保留。

`live2d-product-checks.cjs` 在真实 `beforeModelUpdate` 中记录最终绘制值与帧号。SDK 绘制后会恢复保存的动作基准，读取该基准不能用来判断身体是否停止呼吸或眨眼。`provider-transport-observer.cjs` 透传原始请求，只记录主进程 HTTP 状态、耗时与配置端点是否匹配，不记录凭据、请求头和正文；用于区分真实服务连接故障与界面问题。

`LIFE_EXPRESSION_PRESENCE_ASSERTIONS=1` 配合 `LIFE_EXPRESSION_ASSERTIONS=1` 和 120000–180000 的 `LIFE_EXPRESSION_IDLE_MS`，记录默认 Live2D 待机的真实动作启动、最终绘制参数及每 10 秒截图。新增检查要求没有自动重播模型动作，中性表情不循环，头部保持轻微幅度，同时仍有呼吸、眨眼和注视。完整产品检查另外验证单次动作预览、相同动作再次预览、每模型显式循环及设置重载后的恢复。

用户最新授权直接在本机测试。当前 Live2D 验收使用 `LIFE_QA_HOST_VIEWPORT=1` 和 `LIFE_PRODUCT_RENDERER=live2d`，不设置 `LIFE_QA_PRIVATE_DESKTOP` 或包覆盖入口；真实应用窗口放到所有显示区域之外并禁止抢焦点，截图只来自自身页面。该模式不证明物理摆放、点击穿透或桌面注视坐标。旧的 `run-private-desktop.ps1` 记录属于历史范围，当前不再将隔离环境作为前置要求。

`LIFE_PRODUCT_NATIVE_KEYS=1` 是单独的三轮真实 Electron 原生保存体验，要求工作模式及新建的 `LIFE_PRODUCT_NATIVE_KEYBOARD_BUNDLE`。它点击当前真实确认弹窗，随后核对编辑器创建的文件和退出后的 SQLite、批准审计及 actor/guardian 回执；不能与其他工作场景标志混用。`windows-keyboard-host-check.ps1` 的完整矩阵必须通过 Windows PowerShell 5.1 和显式 Node 路径运行。两类检查只允许精确自有编辑器，一次初始前台设置失败即停止；后续焦点丢失不自动抢回。没有确认按键释放或正常退出的轮次不作为通过或缓存清理依据。

安装验收必须先生成本轮唯一标识，例如 `$env:LIFE_QA_INSTALLER_ID=(Get-Date -Format yyyyMMdd)+'-'+([guid]::NewGuid().ToString('N').Substring(0,8))`，并将同一环境值传给 `scripts/life-installer-qa.config.ts` 的构建和 `life-current-installer.cjs` 的私有桌面运行。它使用独立 QA appId、卸载注册键、exe 和档案；构建禁止自动启动、提权和快捷方式。子流程核对标识、一次 nonce、专属安装目录和实际包哈希，正常退出后才通过。报告放在 `output/life-acceptance/installer-<ID>/`。这些配置/身份检查不能替代实际安装、不同版本升级、回滚、卸载和数据保留验证。

`life-release-provenance.ts` 要求明确提供候选目录和证据清单，或用 `--snapshot <output-path>` 创建源码快照。它不再默认读取旧发行目录或旧日期报告；最终验收必须检查同一包的实际字节、最新源码快照和各自范围内的真实结果。

Live2D 产品与表达检查先断开测试工具持有的 Node inspector，再点击主舞台真实的“关闭”按钮；从标准输出核对生命与窗口状态保存、服务停止、日志排空和窗口清理，并观察进程退出。其他旧检查只请求一次 app.quit，在最终清理标记后断开 inspector。原生进程须在上限内以 0 退出，日志标记和强制终止均不能替代成功退出。Playwright 1.58 没有公开的仅断开接口，适配器只关闭其内部 Node 调试连接，不注入退出或修改应用结果；升级时须核对接口，缺少接口会明确失败。`life-native-live2d-exit.cjs` 另行从启动起不带 Node inspector，只用渲染器 CDP 检查真实 Live2D 和点击关闭按钮。它可明确选择编译输出，或只复用凭据已移除且原进程已退出的合成 QA 档案；这些模式不能当成最终包的全流程验收。`assert-private-desktop.ps1 -RuntimePid` 枚举指定私有桌面的窗口，验证实际进程归属。

`life-product-regression.cjs` 设置 `LIFE_PRODUCT_RENDERER=live2d` 后只体验 Live2D。`live2d-product-checks.cjs` 记录真实 Cubism 参数、动作和透明区域像素，检查角色拖动、缩放、重置、取色、动作选择、导入、改名和宽窄窗口布局。模型“已选中”或挂载标志不能代替实际角色绘制证据。

已退出的本轮产品测试档案可通过 `life-product-cache-cleanup.cjs` 清理缓存。`LIFE_PRODUCT_CLEANUP_REPORTS` 是 workspace `output/` 内 `report.json`／`audit.json` 或 Live2D 读取诊断报告路径的 JSON 数组；脚本验证正常退出或本轮已登记的强制清理、PID 已结束、私有桌面与临时档案归属，再通过 Electron 的缓存接口清理缓存、代码缓存、着色器与模型临时文件系统，保留人格、数据库和证据。失败记录不会被改成通过。清理控制进程也使用独立端口、私有桌面和正常退出检查。

`life-current-experience.cjs` 使用新建的合成 QA 人格、客户端现有语言模型配置和真正的对话界面，记录实际对白、meta／工具事件、骨骼、表情、确认和结果。它不会将用户私密记忆复制到 QA。音频输出静音，本地 SAPI 适配器验证播放链；它不评估真实云声音质量。

前置条件是已打包 exe，以及 `life-current-persona-smoke.cjs` 保存的 QA 人格报告。示例从仓库根目录运行：

```powershell
$persona = Get-Content output/life-acceptance/life-completion-final-persona-20261009.json -Raw | ConvertFrom-Json
$env:LIFE_QA_READY_SOURCE = $persona.profile
$env:LIFE_QA_EXE = Join-Path (Get-Location).Path 'apps/stage-tamagotchi/dist/life-completion-20261009/win-unpacked/alicization.exe'
$env:LIFE_QA_SOFTWARE_GL = '1'
$qaScript = Join-Path (Get-Location).Path 'apps/stage-tamagotchi/scripts/life-acceptance/life-current-experience.cjs'
$qaLog = Join-Path (Get-Location).Path 'output/life-experience-native.log'
powershell.exe -NoProfile -NonInteractive -File apps/stage-tamagotchi/scripts/life-acceptance/run-private-desktop.ps1 -NodePath (Get-Command node).Source -ScriptPath $qaScript -LogPath $qaLog -TimeoutSeconds 900
```

若设置 `LIFE_QA_EXPERIENCE_PARENT_REPORT`，脚本只接受本目录对应的 workspace output 报告，核验合成身份、相同 ASAR 与 QA 临时路径，再继续该人格。结束时清除 QA 凭据和浏览器 local storage，保留合成会话与诊断记录。

执行场景核对当前权威确认请求快照，服务器／工具、完整规范化路径、参数键、新建模式、写入字节和预览必须与当前自有测试目标精确匹配。派发前被撤销的旧提案不计为重复执行；无法核对的当前操作会被拒绝。独立拒绝场景只拒绝一次真实请求，并核对 DENIED 回执及目标文件不存在，不能以模型自述替代后端和文件证据。

确认按钮通过本应用真实 DOM 按钮的 click 事件触发，事件执行与当前 requestId、启用状态和可见性检查处于同一个同步页面调用，防止旧观察批准新请求。这覆盖 Vue 确认队列、Eventa、主进程权限和实际文件操作；不证明默认桌面的物理鼠标命中。独立 Windows desktop 中 CDP 原生鼠标事件曾超时，其失败记录须保留。

`life-body-experience.cjs` 不配置真实语言模型，以公开模型 API 手动探查四种手势与表情。该记录属于身体能力观察，不能当成自然对话或自主行为证明。QA SwiftShader 与截图可能错过动作峰值，应保留帧数据和实际截图时点。

运行 `life-current-action-scene.cjs` 的四类意图场景前，须立即执行 `pnpm exec tsx apps/stage-tamagotchi/scripts/life-acceptance/life-interaction-fixture.ts output/life-acceptance/closure-scenes.json`，再把 `LIFE_QA_INTERACTION_FIXTURE` 指向该文件。场景包含真实的两分钟有效期，不能沿用前一轮保存的文件，也不能延长产品有效期来让测试通过。

报告与图像位于 `output/life-experience-20261006`。完整体验结论见 `docs/research/2026-10-06-actual-life-experience-review.md`。产品源码和发行包的修改需走独立的开发与验证流程。

完整体验每轮等待最多 120 秒，整个私有桌面任务最多 900 秒；真实流式输出延迟不会被无限重试掩盖。严格模式在真实回复、同轮身体意图和音频开始回执落库后才继续；返回安静时段的回复还须通过真实起止时间核验。

私有桌面的 CDP 原生点击在打开设置窗口时也出现过派发超时。设置入口、真实路由链接、作品反馈及节律保存改用 `clickVisiblePrivateControl`，在同一次 DOM 调用里检查连接、几何、CSS 可见性与启用状态后点击真实控件。它不直接调用 store、IPC 或数据库，验证编译后的 Vue 事件链；不证明主桌面物理鼠标命中。音频解锁仍使用真实受信任点击。

`LIFE_QA_DIAGNOSTIC_SOURCE_REPORT` 仅复用经过检查的合成测试身份，允许诊断修复后的编译版本；与同包续测互斥，报告为 `life-actual-experience-diagnostic-v1`，不能充当发行证明。默认复现文件拒绝链；`LIFE_QA_DIAGNOSTIC_SCENE=memory-correction` 验证真实纠正、当前／历史回忆、唯一语音和 SQLite 当前版本。最终发行仍重新运行首次体验与同 ASAR 重启纠正。
LIFE_QA_MEMORY_FRESH_PROBE=1 使用全新合成身份运行首次偏好、纠正、当前与历史回忆三轮；不能与任何续接身份同时启用。报告仍是 diagnostic，不充当发行证明。实际回答必须包含对应当前和旧偏好，数据库的已存标志本身不足以通过。
## 生活闭环验收

Windows Sandbox 环境准备使用 `start-windows-sandbox.ps1 -Start`。首次启用系统功能可能需要重启；脚本在客户端不可用时仅记录 `restart-required`，不重启主机。每次使用独立的只读启动脚本快照与可写报告目录，关闭宿主剪贴板、音视频输入、打印机与网络共享。沙盒内的 `windows-sandbox-bootstrap.ps1` 先检查来宾身份，再对自有前台 WPF 输入框做 Unicode 读回；报告只证明隔离环境就绪，不能替代 Alicization 应用或输入适配器验收。客户端隐藏启动，宿主主页面不作为测试操作目标。

`life-completion-experience.cjs` 从新 QA 身份和自然输入观察临时创作愿望、真实作品、六分钟安静期间实际身体动作、经历索引与需要变化。回执必须包含实际模型帧、可见像素及同一 owned mixer 的结束，不能注入需要或将时间经过当作身体完成。续接同包报告时，先读原有成果与已应用收益，再提出回忆问题。

`life-completion-execution.cjs` 使用真实 localhost 页面与自有 WPF 窗口，在真实覆盖审批处暂停 Kill Switch，核对旧文件未改变；恢复后观察并取消旧弹窗，再重新完成输入、保存、新审批与独立文件读回。每次主窗口与弹窗都有独立原生身份；显式 windowTitle 必须符合当前观察。截图禁止时，视觉执行器不得启动。

`life-completion-postures.cjs` 是独立身体校准：通过生产模型播放入口在两个 QA VRM 上采样五种姿态、恢复站立和三种新增手势的具体关节。校准中的播放请求不代表自然主动性，不能充当无人输入活动的证明。

## 产品体验检查

`life-product-audit.cjs` 使用独立 QA 身份和命令文件逐步操作真实界面，记录首启、设置、窗口、文案和错误恢复；不修改用户档案。`life-product-regression.cjs` 将发现的问题固化为完整界面流程：人格初始化、配置失败返回、模型显式确认、设置返回、所有服务配置入口、记忆页签、模型切换、角色卡文件与拖放、主动节律保存、备份、托盘辅助窗口、实际模型对话及聊天导入导出。

通过 `run-private-desktop.ps1` 启动，设置 `LIFE_PRODUCT_REGRESSION_ROOT` 到 workspace `output/` 下的新目录；设置 `LIFE_QA_EXE` 可检查指定解包版，省略时检查编译输出。完整流程上限为 900 秒。供应商密钥仅从本机已有配置读取，在合成 QA 身份中通过真实配置输入框使用；报告和截图不得包含密钥，退出后移除 QA 配置和 Local Storage 中的凭据。

新产品检查通过 `registerPrivateRuntime` 校验 Electron 主进程子进程继承的私有桌面，再登记准确 PID、可执行文件和 QA 档案，运行器核对身份并纳入自己的 Windows Job。Job 关闭仅收束本轮 QA 进程。不得凭进程名批量终止程序。其他脚本未登记时，不应据此声称其额外进程均被新检查覆盖。

按钮点击核验真实控件的几何、可见性和启用状态，再触发 Vue 事件链；托盘窗口检查调用实际菜单回调。因此这些结果不证明 Default 桌面的物理鼠标命中、硬件麦克风、扬声器听感或所有付费供应商可连接。产品回归必须记录正常退出完成，窗口消失本身不算退出成功。

`LIFE_PRODUCT_RENDERER=live2d` 配合 `LIFE_PRODUCT_EXPRESSION=1` 会在完整产品流程中追加真实模型对话与最终 Cubism 绘制帧观察。语音使用有界 localhost SAPI 测试服务，音频输出静音；供应商与语音配置仅写入合成 QA 环境。它验证常规语音流水线与身体投射，不验证商业语音品质或真实声卡听感。

`life-live2d-expression-probe.cjs` 记录待机、左右指针、停住指针的实际最后绘制值；`LIFE_EXPRESSION_ASSERTIONS=1` 启用结果断言。`LIFE_EXPRESSION_CALIBRATE=1` 追加标明为受控输入的渲染校准：暂时替换该组件的表演输入，检查愤怒、微笑、睁大眼、闭口音、点头、重复点头及摇头。校准不改生命 store，也不充当自然行为证明。采样标签必须在同一次输入切换之前更换，防止下一用例的首帧被归入上一用例。报告目录由 `LIFE_EXPRESSION_ROOT` 指定到 workspace `output/` 下。

`LIFE_EXPRESSION_IDLE_MS=60000` 可延长真实待机观察；上限 180 秒。`LIFE_EXPRESSION_QUIET_ASSERTIONS=1` 检查无语音待机的嘴部开合；受控校准另检查有声元音、音频静音时仍存在的文字发音提示、停止后残留的元音提示。最终绘制值必须响应声音状态，不能只检查输入意图。

真实对话观察器也会在实际 AudioContext 播放时钟上读取已解码 PCM 的短窗 RMS，不修改音频、生命状态或渲染输出。`LIFE_PRODUCT_QUIET_MOUTH_ASSERTIONS=1` 检查嘴部在静音观察中回落。最终验收同时启用 `LIFE_PRODUCT_STRICT_PCM=1`，读取连续 200 毫秒窗口内的全部 PCM 样本，要求整窗 RMS 和当前 speech energy 均低于门限；未开启时仅观察跨越 200 毫秒的连续低 RMS 绘制采样，不能等同于完整音频窗口证明。此检查和真实发声张嘴、播放结束释放共同验收；不能把局部静音或整段说话中的单张截图当作完整口型质量证明。

纯文字模式使用 `LIFE_PRODUCT_TEXT_DIALOGUE=1`、`LIFE_PRODUCT_TEXT_ASSERTIONS=1`、`LIFE_PRODUCT_TEXT_GESTURE_ASSERTIONS=1`，保持真实默认 `speech-noop`，不启用合成语音。覆盖喜悦、安慰、点头、长回复、实际 UI 中断及中断后的下一轮，记录最终绘制、原生动作调用来源、单轮动作预算与手臂部件恢复。原生惊喜动作允许张嘴，但无音频时不能产生模拟声学时钟或持续声学口型。`LIFE_PRODUCT_FAST_EXPRESSION=1` 仅为诊断；完整产品验收必须关闭该标志。单轮和仅取消诊断分别使用 `LIFE_PRODUCT_TEXT_DIAGNOSTIC_ONE_TURN=1`、`LIFE_PRODUCT_TEXT_DIAGNOSTIC_CANCEL=1`，不得代替全流程。

工作计划的定向体验使用 `LIFE_PRODUCT_EXECUTION_WORK=1` 与 `LIFE_PRODUCT_RENDERER=live2d`，连续运行三轮真实模型请求、实际新文件、界面验收、Live2D 完成提示和重载检查。`LIFE_PRODUCT_EXECUTION_REPAIR=1` 在每轮追加缺失来源、真实读取审批、界面调整路径、继续执行和原文件未重复写入检查。审批只核对实际确认弹窗中的已授权合成目标及写入预览；聊天历史中出现的路径不能充当本次审批的证明。这两组是定向体验，不替代 EX22 的全部八类场景，也不证明原生键鼠、声音听感或全部 Live2D 绘制细节。

`LIFE_EXPRESSION_POSE_ASSERTIONS=1` 为独立、明确标注的原生动作校准：执行模型 `FlickUp:0` 一次，然后核对最终手臂部件透明度与初始姿势。它使用实际模型资产与 SDK，属于受控渲染验证；真实聊天中的动作仍需由文字产品回归独立证明。

`LIFE_EXPRESSION_HANDOFF_ASSERTIONS=1` 在程序点头前启动尚未结束的原生举手，验证新前景动作交接后能到达真实绘制并有限结束。`LIFE_PRODUCT_COHERENCE=1` 配合语音检查，额外保存实际说话中的截图，通过真实 UI 在音频正在播放时发送下一轮，核对旧音频中止、不复活，新一轮点头与嘴部恢复，以及同一语义片段的预备、播放和节拍事件不重复动作。前者是受控校准，后者使用实际配置模型与静音 SAPI 音频，不得混称。

语音一致性还核对一个逻辑 utterance 最多一个主要动作，避免不同分句轮换大动作。当前用户请求点头只统计发出下一轮之后、来源为 dialogue 且实际执行 revision 一致的帧，排除旧动作带入。纯文字在 18 秒观察后允许最多 6 秒等待独立主动事件的有限恢复；保留全部原始事件和帧，最终仍须 idle、无声且原生优先级为 0。

LIFE_PRODUCT_TEXT_PACING=1 配合 FAST_EXPRESSION=1 使用真实聊天 UI 检查逐字实际间隔、逗号停顿、单条消息 DOM、提前持久化的全文遮罩、拼音口型和 UI 中断。它是本次节奏修复的定向体验，不等同于全产品验收。

LIFE_PRODUCT_TRUE_STREAM_ASSERTIONS=1 在文字定向体验中对照真实 Provider finish 日志的 observedAt、首个正文 DOM 和首个口型输入。三个正常文本用例都要求正文发出后 150 毫秒内启动显示和口型；另加每次内容不同的长文本请求，要求正文到 Provider finish 至少持续 150 毫秒，且显示和口型均在 finish 前开始。短回复可能在同一网络突发中结束，因此单独记录它是否早于 finish，不用这个不可控的间隔判断完整缓冲。取消后保留前缀和状态，并在真实聊天窗口重新加载后再次核对。该检查读取自己的 QA runtime-debug.log，不替换请求或响应。
## Managed browser execution probe

`LIFE_PRODUCT_HOST_RECOVERY=1` supplements the three-round execution experience
with three synthetic legacy interrupted operations. The fixture uses the existing
life writer and closes it before the application launches. Real settings controls
recheck and take over only the displayed synthetic targets. After normal app exit,
a separate read-only inspection checks cancelled roots, preserved original
receipts, unknown effects and unchanged artifact bytes. This fixture explicitly
injects legacy history; it does not claim to reproduce a physical process crash.

`build-browser-probe.cjs` bundles the production Windows browser adapter and raw
page-observation source into `output/browser-execution-probe-20261020.cjs`.
Run `run-browser-probe.cjs` through `run-private-desktop.ps1` with an explicit
Node runtime. Set `LIFE_BROWSER_PROBE_ROOT` to a fresh output directory per run.
The child verifies its actual native window's desktop and registers its exact
PID with the runner. It never calls physical SendInput or switches the host
input desktop.

The three-round probe covers Chinese/emoji/multiline editing, form receipt,
same-name downloads with independent file/hash readback, denied upload and
approved exact-file upload received by a localhost server. It exercises the
managed browser adapter; it does not replace the Live2D product matrix, physical
input VM tests or full release acceptance. Reports retain the synthetic profile
path so cleanup can be limited to the exact completed run.

The browser probe also checks lost typing receipts by reading the actual field
without generating another input event, and rejects a replaced node with the
same label/value.

`build-browser-probe.cjs --desktop` builds the production Windows semantic
adapter into `output/desktop-execution-probe-20261020.cjs`. Run
`run-desktop-probe.cjs` with the same private desktop runner and set
`LIFE_DESKTOP_PROBE_ROOT` to a fresh output directory. It starts an owned WinForms
fixture, registers its real window/process, exercises three rounds of waiting,
typing, recovery, saving and independent file readback, and closes the fixture
normally. It uses no physical SendInput and is not the isolated foreground-input
acceptance. The fixture script is copied with UTF-8 BOM for Windows PowerShell.

The native desktop probe also checks UIA worker health without a window read,
three exact ComboBox selections and independent application event receipts.
Unknown choices, changed option lists and duplicate option text do not inject
an arbitrary selection. These are real semantic control tests on the private
desktop; the second fixture controller explicitly simulates an external UI edit
and does not establish physical input takeover.

`private-desktop-timeout-probe.cjs` is an intentional owned-process timeout
fixture. A five-second runner deadline must return a failure receipt, close its
Job and terminate both fixture PIDs without switching Default. This qualifies
the test infrastructure's fault cleanup, never a successful application exit.

Work product requests require one actual foreground assistant reply and reject
an interrupted acknowledgment. Background callback messages have their own
identities and cannot satisfy that check. Compiled diagnostics and exact-package
acceptance remain distinct.

`LIFE_PRODUCT_AUTHORIZED_BROWSER=1` adds three actual configured-model workflows
through the real browser-access settings and content-bound permission controls.
The fixture owns a separate headless Chromium profile, logs into its own localhost
business using an HttpOnly synthetic session and keeps that session in the original
browser. Unauthenticated fetch returns 401; no profile/cookie is copied into the
application. An ungranted iframe contains a unique sentinel that must not enter
the persisted observations. Only the fixture server can write the accepted receipt
file, and duplicate submissions fail the check.

The second workflow denies the initial input, takes over and regrants the page,
then uses the actual **reobserve and continue** work control. Read-only inspection
after normal exit requires the same goal/contract, a new bound plan revision and
one server submission. Every workflow samples actual Live2D final draws and keeps
the original browser tab open after takeover. `authorized-browser-inspection.ts`
checks committed plan/effect identities and final receipt bytes. This qualifies
only the owned authenticated fixture and explicit UI takeover. It does not prove
commercial-site behavior, physical input hooks, external downloads or the complete
eight-group acceptance matrix. All earlier delivery/repair/learned-method checks
remain enabled in the combined run, and their failure is never converted to pass.

For development, `LIFE_PRODUCT_BROWSER_DIAGNOSTIC=1` with the authorized-browser
flag runs only those three browser workflows after normal onboarding. It records
`life-selected-browser-product-diagnostic-v1` and an explicit diagnostic scope.
Do not combine it with host-recovery/learned-method flags. Final combined acceptance
must leave it unset. A foreground work reply must also have neither failure-surface
origin nor a failed contract; an infrastructure error bubble is not an acknowledgment.

`LIFE_PRODUCT_CRITERIA_CHANGE=1` adds three further actual-model workflows to the
combined work run. The host uses the real requirements editor to add an exact
file-byte condition, keeps the same root responsibility, repairs only the later
blocked input and continues. The three original repair workflows remain enabled.
`criteria-revision-inspection.ts` opens the exited profile read-only and checks
the new generation/contract, unchanged task identity, carried original write and
current acceptance. File mtime and the actual effect journal both reject replay.
This flag is not part of the selected-browser-only diagnostic.

`LIFE_PRODUCT_CRITERIA_DIAGNOSTIC=1` runs only the three requirements-change
workflows after normal onboarding, with an explicit diagnostic format and scope.
It cannot be combined with selected-browser, host-recovery or learned-method flags.
All foreground, permission-byte, same-task and post-exit assertions still apply.
Final combined acceptance leaves both diagnostic flags unset.

## Preserving native probe bundles

`LIFE_PRODUCT_DOWNLOAD_RECOVERY=1` adds three synthetic previous-runtime download
owners before app launch and exercises the real recovery UI with Live2D active.
It checks exact directory previews, explicit stopped-writer confirmation, scoped
release, preserved partial bytes and read-only database reopening. These fixtures
claim no native execution or successful download; `browser-execution-probe.ts`
separately verifies actual Electron transfers and their resource ownership. The
combined run retains every original work, repair, criteria, download-goal,
learned-method and selected-browser assertion. Leave diagnostic flags unset.

`LIFE_PRODUCT_EXECUTION_DOWNLOAD=1` adds three actual-model managed-browser
download goals before the selected-browser workflows. A loopback server supplies
real native files; its request count rejects repeated activation. The second goal
requires host review of the downloaded artifact. The third deliberately accepts
an incorrect hash first, then the host edits that criterion through the real UI;
the same responsibility rechecks the original file without downloading again.
All three sample Live2D final draws and survive settings reload. After normal
exit, `download-goal-inspection.ts` reads the actual database and file bytes.
Artifact buttons are checked without launching an external application that
could reuse a window on the user's Default desktop. This flag is combined
acceptance; leave diagnostic flags unset.

Set LIFE_PROBE_BUNDLE to a new absolute .cjs path under workspace output for both build-browser-probe.cjs --desktop and run-desktop-probe.cjs. This preserves a prior bundle with its original evidence. The desktop probe injects an expired child-process dispatch deadline, verifies refusal before mutation and checks the real control remains unchanged. It then runs the existing three native window workflows. This is semantic Windows control acceptance, not physical SendInput acceptance.

The work repair and requirement-change product flows now click the real life-view Refresh button after editing and before Save. The corrected source path and newly added hash criterion must survive this same-scope snapshot replacement. Permission decisions still bind the exact current request, token, operation, path and UTF-8 bytes; an old or unrelated target fails the run.

## Native keyboard acceptance

When host input testing is explicitly authorized, build a fresh bundle from the
project root with Node 24:

```powershell
node apps/stage-tamagotchi/scripts/life-acceptance/build-windows-keyboard-check.cjs
powershell.exe -NoProfile -NonInteractive -File apps/stage-tamagotchi/scripts/life-acceptance/windows-keyboard-host-check.ps1 -NodePath <absolute-node.exe> -BundleDirectory <payload-directory-returned-by-builder>
```

The host launcher checks every bundled source/dependency hash, creates one owned
fixture near the desktop edge, and binds its actual executable, process birth,
window, session and user before the product adapter observes or injects input.
External input retains the ordinary takeover behavior. The 144-check composition
uses the real SQLite/action gate/broker/native pair with a synthetic approval port.
It includes 18 normal/refusal rounds and three real Node crashes after independently
confirmed native release, followed by database reopening and read-only recovery.
Recovery proves key delivery only; it does not complete a root responsibility or
establish full Electron/bootstrap or release acceptance. The fixture closes normally.

The user authorized actual host testing on 2026-10-25. For background Live2D
development checks, set `LIFE_QA_HOST_VIEWPORT=1`,
`LIFE_PRODUCT_RENDERER=live2d` and run `life-product-regression.cjs` directly.
The wrapper uses the actual Default desktop and compiled main entry, keeps its
windows outside every display and disables their focus. It does not certify
physical placement, focus, click-through or desktop gaze coordinates. Saved
reports and post-exit readers retain this scope and the actual main hash.

`LIFE_PRODUCT_STORAGE=1` adds three actual settings/cache workflows to the
execution product run. `LIFE_PRODUCT_STORAGE_ONLY=1` scopes a work-only run to
that group. An owned localhost HTTP fixture seeds native default-session cache;
the real UI clears it through Eventa. Independent native readback must show
cache removal while a synthetic cookie, localStorage and Live2D remain intact.
These flags do not simulate low disk or certify the other execution groups.

`native-quit-observation.cjs` waits for native process exit independently of the
renderer acknowledging its closing click. A completed request alone is never
an exit receipt; request failures still propagate, the existing sixty-second
budget remains, and diagnostics record native exit and UI response separately.
Configuration audits use paged ingress reads because later task events can push
them beyond the recent Life snapshot. Neither fix changes an older failed report.

The v4 installer acceptance also uninstalls, reinstalls, reopens the same saved
persona and Live2D selection, and uninstalls again while preserving the reopened
state. `life-installer-reopen.cjs` requires the exact candidate owner/nonce,
executable hashes and a fresh report UUID. This proves same-candidate lifecycle
continuity; different-version upgrades, rollbacks and migration failures need
their own evidence.

Run `windows-keyboard-host-check.ps1` with Windows PowerShell 5.1
(`powershell.exe`); PowerShell Core cannot compile the .NET Framework fixture
executable. A missing state file during its atomic publication remains pending
within the original focus poll budget; this never retries an input operation.

`windows-keyboard-guest-check.ps1` verifies the actual owned guest UUID, user and
desktop before compiling or sending input. It requires a nonce-owned fixture,
exact native source hashes, and the production composition bundle. Full mode runs
Ctrl+S, Tab and Escape three times each, then three rounds each of cancellation,
actor/guardian/parent exit, expiry, focus change and virtual physical Ctrl
takeover. The production bundle then uses the real life database, action gate,
global resource broker and desktop adapter for nine normal actions and nine
source/focus/approval refusals. Its approval port is synthetic. No full Electron
bootstrap claim follows from that bundle.

`windows-keyboard-primitives-check.ps1 -Output <fresh-output-json>` only compiles
and rehearses protected state, layouts and process ownership on the host. It
does not install hooks, observe foreground windows or inject input. The gated
`ALICIZATION_NATIVE_PROGRAM_CHECK=1` integration tests compile and verify owned
helpers, and additionally require successful startup of the fixed `--health`
role without foreground reads, hooks or input. Windows EPERM remains a failed
real startup gate; it cannot be replaced by a passing compiler/hash check.
A private desktop cannot replace the guest for
real SendInput acceptance. Host acceptance has its own explicit owned-fixture
guard; it never bypasses the guest UUID/user guard. Retain failed reports and compare exact hashes before
reusing any result.

`LIFE_PRODUCT_LONG_WORK=1`, with `LIFE_PRODUCT_WORK_ONLY=1`,
`LIFE_PRODUCT_EXECUTION_WORK=1` and `LIFE_PRODUCT_RENDERER=live2d`, runs three
actual configured-model/UI tasks with twenty-one dependent file steps each.
Only fresh source fixtures are written by the controller; all copied artifacts
and index files must be produced through the real permission controls and tool
ports. Post-exit read-only inspection checks all sixty-three effects, two
durable work windows per task, independent root verification and unchanged source
bytes/timestamps. This scope does not claim a process restart between windows;
the six backend restart/host-edit cases retain their separate evidence.
This long-work scenario keeps its owned background windows rendering through
Electron `setBackgroundThrottling(false)`, matching the existing body experience
harness. Focus remains disabled/offscreen. This tests normal animation pacing
while the user's desktop stays available; OS visibility/throttling semantics
are explicitly excluded and the policy is recorded in the report.
The long-work scenario configures the real chosen service directly during its
normal onboarding. Connection-failure/back-navigation checks run separately;
the earlier failed background back-navigation reports remain failed.
Onboarding uses the product's real reduced-motion preference, which skips CSS
and out-in transition waiting. Navigation does not require a screenshot after every click.
The Live2D canvas keeps its own clocks in a separate stage window; this does not
verify onboarding-animation timing.
Process exit, page closure and page crashes are recorded before cleanup. An app
that already exited cannot pass requested UI shutdown, and a dead inspector
cannot overwrite the original failure or prevent saving the final report.
The long-work scenario also uses the installed Playwright 1.58.2 Chromium
defaults for background timers, occluded windows and renderer scheduling.
On Windows, Playwright 1.58.2 uses `shell: true`; its `process()` is the cmd
launcher. `windows-native-launcher.cjs` keeps a console Node owner alive and
directly spawns Electron without a shell. Per-launch nonce/HMAC receipts bind
the actual PID, executable and parent, and the actual child's close event owns
exit observation. Signing secrets are removed from Electron's environment.
Launcher exit alone cannot certify shutdown. Playwright ignores child stdin;
forced stop uses an immutable signed control file read by the retained owner,
and remains a failed normal-shutdown check. That owner also stops its child
when its original controller is gone. Actual ignored-stdin Windows shell-chain
tests cover both normal child exit and controlled stop. The raw
native-exit probe uses `launchOptions(profile, { launcher: 'direct' })`, retaining
its actual ChildProcess without this Playwright adapter. Explicit executable
overrides must be passed into `launchOptions` before wrapper preparation.
Earlier Windows Playwright exit/latency conclusions, including the v184 package
and installer checkpoint, are withdrawn; old reports stay unchanged. Rendered
frames, independent storage checks and exact hashes retain their own scope.

File-write approval checks the exact path, operation, bounded preview, full UTF-8
length and SHA-256 shown by the actual permission component. Identical previews
with a different tail must fail. Normal shutdown results are saved before any
credential cleanup. Only an ended synthetic runtime may have its credential
storage cleared; bounded forced cleanup of the exact retained host child stays
a failed experience and cannot certify normal shutdown or task completion.

Actual Default-desktop background captures use `webContents.capturePage` with
`stayHidden` and `stayAwake`, retaining native image size, window bounds and
focus/display observations. The original eight-second budget remains. This
records the actual application frame without bringing its window onscreen;
it does not certify compositor visibility or foreground input. The onboarding
reduced-motion preference now skips CSS/out-in transitions in production,
instead of waiting for a nominal one-millisecond animation frame.

Shutdown reports now retain `nativeProcessObservation` from their actual owned
child observer. Release provenance requires this authenticated ownership,
distinct native/owner/shell PIDs, native exit time, log flush and window teardown
for packaged Electron evidence. Older launcher-only receipts cannot qualify a
release. Thirty-eight lifecycle/guard checks cover this boundary.
Cold-document diagnostics retain bounded direct document polling and native
load/throttling observations. Host pre-capture warming was removed after it
timed out; the failed runs do not establish a working offscreen driver.

无 Node inspector 的长任务入口为 life-raw-long-work.cjs，使用全新的 output 子目录 LIFE_RAW_LONG_WORK_ROOT。本机后台开发版设置 LIFE_QA_HOST_VIEWPORT=1、LIFE_PRODUCT_RENDERER=live2d，不设置 LIFE_QA_EXE 或 LIFE_QA_PRIVATE_DESKTOP；窗口在创建时放到所有显示器之外并禁止抢焦点，Win32 另核对真实窗口和前台状态。main 的自有档案回执只记录进程、源码哈希、显示器和窗口几何，不注入生命状态。成品另指定与 LIFE_QA_INSTALLER_ID 匹配且通过 ASAR 预检的 LIFE_QA_EXE，同样可在 Default 桌面后台运行；只有明确选择独立桌面时才使用 run-private-desktop.ps1，不混用两种来源声明。

它复用三轮二十一步、精确路径与内容批准及退出后的只读 SQLite 验收，模型和产品工具真实执行。每项检查和 30 秒心跳原子保存进度；不能因上一份快照陈旧推断卡死。pass29 已完成两轮，第三轮因正式会话截断请求导致模型重写参数并超时，整轮仍失败。签名 actual-child 回执、文件落盘和窗口关闭证明正常退出为 2,773 ms。修复后完整重跑仍待完成，不能把局部结果作为三轮通过。

后续 pass31 三轮实际通过，18 项检查、六张截图；关闭后独立只读 SQLite 核对 63 个步骤/效果、六个工作窗口和三份独立 fulfilled 根责任。原请求字节、来源文件和时间戳保留，Live2D 绘制持续推进。签名实际原生进程经舞台按钮正常退出为 0、4,879 ms，日志落盘与窗口关闭均已观察。该范围不包括物理输入、桌面注视或安装包验收；失败的 pass29/30 记录继续保留。

原生 owner 连接诊断可运行 native-owner-desktop-probe.cjs，并给出全新的 LIFE_NATIVE_OWNER_PROBE_ROOT。它仅运行 45 秒控制台子进程来检查 shell、签名 child-close 与 Windows Job，不证明 Electron、Live2D 或物理输入。

自主读修正体验复用 `life-raw-long-work.cjs`，设置
`LIFE_PRODUCT_ADAPTIVE_WORK=1`、`LIFE_QA_HOST_VIEWPORT=1`、
`LIFE_PRODUCT_RENDERER=live2d` 和全新的 `LIFE_RAW_LONG_WORK_ROOT`；不要同时
选择 delegated 模式。三轮自然语言请求通过真实模型建立任务，先保留已完成
写入，再观察候选读取失败后的原任务修正，最后独立验收原目标。退出后
`adaptive-work-inspection.ts` 只读检查原请求、失败效果、修订审计、精确两次
写入和独立 fulfilled。新场景的实际产品运行仍待完成。

本机键盘夹具现在置于整个虚拟屏幕范围之外并隐藏任务栏项；每次核验使用
原始 HWND、实际所属进程、进程出生时间、可见根窗口及 Win32 实际矩形，
拒绝覆盖任一显示器。只在开始时设置一次前台，后续用户接管不重新夺取。
`windows-keyboard-host-check.ps1 -NativeFaults` 在正常产品组合和三次崩溃恢复后，
复用原生故障夹具检查取消、actor/guardian/parent 退出、过期和子控件改变，
各三轮。host 模式仍只允许精确自有窗口；guest 的 UUID/用户限制保持独立。
真实非注入物理按键接管需要实际设备控制，host 自动矩阵不把注入事件冒充
物理输入，也不将此专项标记为通过。

受管弹窗的原生专项入口是 `managed-popup-native.cjs`，在项目根目录运行。
设置 `LIFE_QA_HOST_VIEWPORT=1`、`LIFE_PRODUCT_RENDERER=live2d`；成品同时给出
匹配的 `LIFE_QA_EXE` 与 `LIFE_QA_INSTALLER_ID`。入口将当前生产浏览器模块和
`managed-popup-native-check.ts` 打包到全新归属目录，保存所有源码哈希，再在
受认证的真实后台应用中执行三个回合：打开/读取弹窗、实际下载、关闭返回原页、
target=_blank 下载和关闭慢下载。真实窗口不得覆盖显示器或取得焦点。
每 WebContents 的调试连接保持到该页面关闭；关闭引用使用提前保存的对象，
避免已销毁 BrowserWindow 的属性再次访问。这是有界合成 host 批准的 adapter
集成验证，不能替代普通模型/UI 根责任与成品完整矩阵。所有失败报告保留。

专用身份跨版本验证使用 `life-installer-version-cycle.cjs`，要求
`LIFE_QA_INSTALLER_ID`、`LIFE_QA_HOST_VIEWPORT=1`、Live2D 和确切的
`LIFE_QA_VERSION_MAIN_SHA256`。预先通过标准打包器另建同身份 0.3.1 元数据
夹具到原 release 目录加 `-upgrade-0.3.1` 的新目录，保留 0.3.0 原包。
每次重新打开记录实际 `app.getVersion()` 并保存独立截图；只更新 QA 归属
marker 的候选哈希，不写人格、数据库或模型选择。已存在的基线须匹配确切
归属和包哈希，报告明确记录跳过基线安装。它只证明此代码/schema 的版本
元数据升级/回滚，不代表 schema 迁移或新产品发布。早先冷重装异常保留。

The WPF native fixture also validates semantic ScrollPattern operations with an independent ScrollChanged viewport file, fresh UIA readback and stale viewport/identity/expiry counterexamples. Three inactive-desktop runs do not constitute physical wheel, DPI coordinate or user takeover acceptance. Preserve failed runs and normal fixture/worker shutdown receipts.

`node apps/stage-tamagotchi/scripts/life-acceptance/nsis-per-user-check.cjs` compiles and executes the pinned NSIS System plugin. It checks 32 known-folder reads, register preservation, saved installation directory and explicit override, plus exact upstream template parity. Full install/repair/uninstall remains a separate native lifecycle check. The standard electron-builder installer and signed-uninstaller passes remain in use; `build/nsis/multiUser.nsh` applies the attributed MIT upstream fix before macro expansion.

`life-imported-model-restart.cjs` runs from the workspace root with `LIFE_MODEL_RESTART_BASELINE_REPORT` pointing to a passed, normally closed, credential-cleaned actual product report under `output/`. Set `LIFE_MODEL_RESTART_PREVIOUS_REPORT` when another closed experience ran afterwards. Use the exact matching `LIFE_QA_EXE` / `LIFE_QA_INSTALLER_ID`, `LIFE_QA_HOST_VIEWPORT=1` and Live2D. The driver copies the synthetic profile, imports and selects a model through the real UI, then performs three full native cold restarts, checking exact File bytes and Cubism drawing. It does not rewrite preferences between restarts and verifies that every original profile file remains byte-identical. Preserve failed reports and each normal-exit receipt.

`build-procedure-browser-check.cjs` bundles the current production work/browser
sources with their actual SQLite runtime and immutable input hashes.
`life-procedure-browser-native.cjs` consumes that bundle in three owned Electron
cycles. Set `LIFE_PROCEDURE_BROWSER_BUNDLE`, `LIFE_PROCEDURE_SOURCE_SNAPSHOT` and
`LIFE_PROCEDURE_BROWSER_BASE_REPORT` to current paths under `output/`, plus the
usual exact package identity, host viewport and Live2D settings. The baseline
must be normally closed and credential-cleaned. Each cycle verifies dedicated
replay, fresh uses, actual changed-page failure, automatic method downgrade,
a newly verified/evaluated replacement and three replacement uses. Source and
baseline profile bytes stay unchanged. This is component integration evidence;
the package itself still needs its product UI and lifecycle acceptance.

### Atomic future-step changes and native restart

Use `LIFE_PRODUCT_ATOMIC_REQUIREMENTS_ONLY=1` with the existing work-only,
execution-work, owned host viewport and Live2D settings. The actual configured
model accepts three 25-step plans. Each completes 17 writes, blocks on a missing
read and uses the actual requirements editor to change seven future paths and
their byte criteria in one save. The preparation report only certifies this
paused state and normal exit.

After that process exits, set `LIFE_ATOMIC_BASELINE_REPORT` to its report and run
`life-atomic-requirements-restart.cjs` with the same package identity and owned
temporary-directory settings. It requires the exact accepted controller hash,
copies the closed synthetic profile and normally closes/reopens the process
between three continuations. It waits for actual Cubism drawing, navigates
through the settings link, approves each exact owned operation and waits for
permissions to finish before refreshing. Use fresh preparation/artifact roots
after a failed attempt that wrote output; a new profile copy does not restore
the external files referenced by an accepted plan.

Finally run `atomic-requirements-restart-inspection.ts <profile> <report-root>`
under the same owned temporary directory. Read-only SQLite and file checks
require one root per task, generation 2/revision 3, the seven-step atomic audit,
24 actual write effects, 17 unchanged earlier files, seven revised outputs and
independent root verification. Module, preparation, native and read-only results
have separate scopes; a preparation pass does not certify final completion.

### Authenticated business form and export

`business-form-product-checks.cjs` adds three actual model/UI workflows in an
owned authenticated browser. The current page contains a same-origin iframe
with a select and file input, plus an ungranted foreign frame. Every mutation
uses a fresh observation binding. Exact previews approve the note, choice,
attachment bytes, submission and a fixed CLI export program individually.

The service creates its receipt only after receiving the original attachment
bytes and all expected fields. A single-use public export token becomes usable
after that submission. The approved program fetches that exact localhost URL
without copying browser cookies and writes a new file. This tests a composed
browser/CLI workflow; native external-browser download interception and popup
transfer ownership need their separate acceptance.

Enable `LIFE_PRODUCT_BUSINESS_FORM=1`, `LIFE_PRODUCT_AUTHORIZED_BROWSER=1`,
`LIFE_PRODUCT_EXECUTION_WORK=1`, `LIFE_PRODUCT_WORK_ONLY=1` and
`LIFE_PRODUCT_RENDERER=live2d` in the normal owned host harness. The entry keeps
its package/profile guards and produces `business-form-after-shutdown.json`
through `business-form-inspection.ts` after normal native exit. It checks eleven
actual steps per root, independent receipts, exact uploaded/exported bytes,
unchanged source timestamps and exactly one submission/export per case.

The fixture's unauthenticated, premature-export, corrupt-attachment,
duplicate-submit and duplicate-export counterexamples are validated separately.
The actual three-workflow run now passes in the unchanged v276 package:
`output/execution-v276-business-form-20261028-pass1/report.json` in the primary
workspace, with 26 checks and normal exit. Its separate read-only inspection
binds all 33 steps, five exact approvals per root, unchanged source bytes and
one real submission/export per case. The WT QA source is separately frozen;
this does not claim that newer development runtime changes were packaged.

`LIFE_PRODUCT_DOWNLOAD_DIAGNOSTIC=1` with
`LIFE_PRODUCT_NATIVE_DOWNLOAD_OBSERVE=1` narrows the owned Live2D harness to
the three original native download scenarios. `native-download-observer.cjs`
records actual item updates and forwards every original cancellation unchanged.
It records neither cookies nor query tokens. The v276 failure is retained:
Chromium interrupted a 299-character target after receiving all bytes. A direct
native counterexample passed with normal exit: short path succeeds, a missing
long parent fails, and Node-precreated long parent succeeds. Development now
prepares the exact reserved directory before activation; final package replay
remains required. Namespaced native paths are deliberately excluded after the
controlled counterexample showed they still interrupt.

Actual Windows low-space checks can run from an elevated project PowerShell with `powershell -NoProfile -File apps/stage-tamagotchi/scripts/life-acceptance/life-owned-low-disk-volume.ps1`. Use the project Node/pnpm runtime. The script creates one fresh96MiB owned VHD, validates its exact image association before formatting, mounts it without a drive letter, runs nine actual storage checks: three prewrite refusal/cache recovery cases, three partial-write ENOSPC atomic-target preservation cases, and three SQLite FULL transaction rollback/reopen/idempotent retry cases, detaches it, and removes only a successful owned image. Failure reports and the detached failure image remain. It never fills the host disk. `-WorkspaceRoot` and `-CheckoutRoot` support reviewed source comparison; report IDs must be fresh.

A destroyed closing inspector context is retained as a request transport diagnostic. The authenticated native child must still close under the original sixty-second deadline; a lost acknowledgement never synthesizes success. Other request errors, abnormal exit and forced cleanup remain failures. QA-only controller revisions can reuse an unchanged package when both the original production snapshot and new QA snapshot are retained and every compiled/resource/native input still matches.


Interactive method integration: run build-procedure-browser-check.cjs --interaction to bundle procedure-interaction-check.ts. The authenticated native controller keeps its original entry, source/hash and exit checks; module sources and a compiled host from different checkouts require explicit, separately recorded source-root bindings. Three native cycles validate ten-case form evaluation and old/new method uses, rejection, repair and withdrawal. This is module integration, not release acceptance.

### Nonverbal presence settlement and actual Claude CLI

`life-presence-settle-native.cjs` requires `LIFE_PRESENCE_ROOT`, `LIFE_PRESENCE_BASE_REPORT` and `LIFE_PRESENCE_SOURCE_SNAPSHOT`, all under the current workspace output directory. Use the usual authenticated package identity and off-display host viewport, with TEMP set to the original owned baseline profile parent. The baseline must have passed, normally exited and removed credentials. The controller clones it, verifies every frozen source before/after, dispatches one synthetic nonverbal execution event per case through the real renderer dispatcher, and reads final Cubism draw frames. Three voice-enabled and three text-only cases must retire the pulse without rearming, audio or open mouth. This is actual body integration; model dialogue/TTS is separate.

`claude-code.real-cli.integration.test.ts` opts in with `ALICIZATION_RUN_REAL_CLAUDE=1`. Supply an independently owned `CLAUDE_CONFIG_DIR`, an actual CLI on PATH, configured provider environment and optional `ALICIZATION_REAL_CLAUDE_REPORT_ROOT`. It never discovers or copies user credentials. Three actual provider turns, three independently verified approved file writes, pre-spawn source withdrawal and three observed Windows direct-client cancellations have separate assertions. The six initial provider failures are retained, not replaced by the passing cancellation subset. The latter proves direct-client exit only, not a delegated child-command tree.

Background placement must be constrained before setBounds/setPosition/center native calls; move/show observers alone do not provide that guarantee. The controller records all actual window coordinates before the boundary assertion, including failed snapshots. Do not infer physical placement, click-through or gaze acceptance from this QA mode. Interactive native-method checks now include actual LF/CRLF textarea submissions; their HTTP fixture applies browser form newline normalization and enforces a finite wire-byte budget.

### Interactive form methods, fresh native text and causal dialogue

LIFE_PRODUCT_INTERACTIVE_FORM=1 together with LIFE_PRODUCT_BROWSER_PROCEDURE_ONLY=1, LIFE_PRODUCT_BROWSER_PROCEDURE=1 and LIFE_PRODUCT_LEARNED_PROCEDURE=1 selects an actual model/UI ten-step form method lifecycle. The matching read-only inspector uses explicit plan step identity to order journal results, binds both actual field texts and all nine exact-once server submissions, and verifies failed receipt downgrade plus a newly evaluated repaired version and withdrawal. The original failed v286 inspector report stays immutable; its separately recorded read-only recheck did not alter the report or database.

LIFE_PRODUCT_UNICODE_KEYS=1 extends the ordinary native-keyboard scenario with three distinct Unicode replacements and a fresh observation before each original Ctrl+S. It retains one initial focus acquisition and the exact original window/process-birth approval, actor/guardian release and independent saved-byte verification. The plan builder is checked against the real work admission schema as well as the capability registry. It does not claim generic save/overwrite dialog or real human takeover acceptance.

The text dialogue observer records both prompt and reply DOM identities at each public cursor change, then checks every settled turn and actual reload. Native capture phase and original redacted failure stack are retained when the harness fails. Original deadlines, frame assertions, native shutdown and credential cleanup remain required.

### Owned direct file mutations

LIFE_PRODUCT_LOCAL_MUTATION_ONLY=1 with the existing work-only, execution-work, background viewport and Live2D flags runs three explicitly selected real-model file operations. Each uses a fresh owned file, actual full read, expectedHash and real replacement confirmation. The reviewer checks exact path, before-image hash, complete replacement bytes and the current permission token. Read-only SQLite inspection happens after normal native shutdown and binds original instructions to before/after version journals. Successful fixtures are removed only after exact inventory, object identity and content checks; failed fixtures remain. This proves explicit file operations and is separate from general autonomous planning.

### Native inspector observation lifetime

The exact owned capture promise is rooted until its inspector return-by-value response arrives, then explicitly released. Real Inspector forced-GC tests cover success and rejection. PID, executable, profile, renderer URL, offscreen/nonfocusable guards, the 8-second capture deadline and zero retries remain unchanged. Preserve failed attempts and qualify later runs against their own source.

## Method version comparison evidence

The repaired browser-method product scenario checks the exact old version in the rendered comparison, both paired completions and the measured operation/retry/confirmation rows before activation. Its read-only post-shutdown inspector verifies the baseline/candidate/input bindings and actual native outcome journal. These assertions require a current build and do not qualify older packages.

The v311 business-form failure is retained separately from its passed full435/form30 scopes. Its second request lost admission to a stale consumed life owner, then produced an unsupported completion. Actual HTTP SSE tests now cover fresh-proposal recovery and a provider that ignores the required action. The repaired interactive-form product/readonly-inspection path also verifies paired method-version metrics.

# Upload method integration

`build-procedure-browser-check.cjs --upload` builds `procedure-upload-check.ts`
for the existing authenticated native module controller. It checks native file
selection without delivery, cancellation before submit, actual multipart receipt
hashes, source capture, eleven-case evaluation, three fresh uses, wrong-receipt
downgrade, fresh repair/evaluation, three repaired uses, withdrawal and a file-only
form. Windows remain outside every display and cannot acquire focus. The module
bundle's exact source/native hashes are recorded separately from the packaged host;
passing it does not claim those new sources are already in the packaged host.

The packaged model/UI variant uses `LIFE_PRODUCT_UPLOAD_METHOD=1` with the existing
browser-procedure-only scenario. The shared form flow then submits fresh file
vectors, checks the full visible frozen-snapshot approval, requires eleven replay
cases, tests three deliveries and three repaired deliveries, and independently
inspects persisted effects and server file hashes after normal exit. It explicitly
closes only each exact nonce receipt window after delivery to retire its snapshots;
this does not claim automatic retirement of arbitrary user browser documents.


### Read-only native visual qualification

Run `check-windows-visual-window.ps1 -OutputRoot <fresh-owned-directory> -Workspace <checkout>` with Windows PowerShell 5.1. It compiles the exact current native sources, uses a self-owned WinForms window beyond every monitor with activation disabled, and validates three RGB captures plus stale identity, authority, hidden-window and background-input refusal cases. It retains source hashes and a JSON report in the new directory. It never injects input or activates windows. `ALICIZATION_NATIVE_PROGRAM_CHECK=1` includes the same portable script through `windows-visual-capture.integration.test.ts`. These reads do not certify physical mouse delivery, user takeover, mixed-DPI hardware or packaged visual expression.

The actual visual-review component and repository UnoCSS can be checked without opening a visible browser: `node apps/stage-tamagotchi/scripts/life-acceptance/check-window-preview-browser.cjs output/<fresh-owned-directory>`. A local Chromium/Chrome/Edge installation is required; the script creates its own headless profile. It checks PNG aspect ratios, scaled marker centers, Chinese operation labels and small-window overflow, retaining screenshots and source hashes. This is component acceptance; packaged Live2D remains a separate product check.
