# 后台生命体验与原生验收

所有 GUI 脚本必须通过 `run-private-desktop.ps1` 启动。它创建独立 Windows desktop 和受控子进程 job，不切换输入桌面。`electron-launch.cjs` 会验证调用桌面及 QA profile 命名。截图只来自自身应用页面。

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

`life-completion-experience.cjs` 从新 QA 身份和自然输入观察临时创作愿望、真实作品、六分钟安静期间实际身体动作、经历索引与需要变化。回执必须包含实际模型帧、可见像素及同一 owned mixer 的结束，不能注入需要或将时间经过当作身体完成。续接同包报告时，先读原有成果与已应用收益，再提出回忆问题。

`life-completion-execution.cjs` 使用真实 localhost 页面与自有 WPF 窗口，在真实覆盖审批处暂停 Kill Switch，核对旧文件未改变；恢复后观察并取消旧弹窗，再重新完成输入、保存、新审批与独立文件读回。每次主窗口与弹窗都有独立原生身份；显式 windowTitle 必须符合当前观察。截图禁止时，视觉执行器不得启动。

`life-completion-postures.cjs` 是独立身体校准：通过生产模型播放入口在两个 QA VRM 上采样五种姿态、恢复站立和三种新增手势的具体关节。校准中的播放请求不代表自然主动性，不能充当无人输入活动的证明。

## 产品体验检查

`life-product-audit.cjs` 使用独立 QA 身份和命令文件逐步操作真实界面，记录首启、设置、窗口、文案和错误恢复；不修改用户档案。`life-product-regression.cjs` 将发现的问题固化为完整界面流程：人格初始化、配置失败返回、模型显式确认、设置返回、所有服务配置入口、记忆页签、模型切换、角色卡文件与拖放、主动节律保存、备份、托盘辅助窗口、实际模型对话及聊天导入导出。

通过 `run-private-desktop.ps1` 启动，设置 `LIFE_PRODUCT_REGRESSION_ROOT` 到 workspace `output/` 下的新目录；设置 `LIFE_QA_EXE` 可检查指定解包版，省略时检查编译输出。完整流程上限为 900 秒。供应商密钥仅从本机已有配置读取，在合成 QA 身份中通过真实配置输入框使用；报告和截图不得包含密钥，退出后移除 QA 配置和 Local Storage 中的凭据。

新产品检查通过 `registerPrivateRuntime` 校验 Electron 主进程子进程继承的私有桌面，再登记准确 PID、可执行文件和 QA 档案，运行器核对身份并纳入自己的 Windows Job。Job 关闭仅收束本轮 QA 进程。不得凭进程名批量终止程序。其他脚本未登记时，不应据此声称其额外进程均被新检查覆盖。

按钮点击核验真实控件的几何、可见性和启用状态，再触发 Vue 事件链；托盘窗口检查调用实际菜单回调。因此这些结果不证明 Default 桌面的物理鼠标命中、硬件麦克风、扬声器听感或所有付费供应商可连接。产品回归必须记录正常退出完成，窗口消失本身不算退出成功。
