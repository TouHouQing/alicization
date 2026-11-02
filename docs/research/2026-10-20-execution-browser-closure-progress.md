# 执行层续作记录：2026-10-20

EX00–EX23 仍在进行中。本轮实现浏览器可信输入、受控附件选择和下载核对，并修复输入所有权边界。其余未关闭工作仍属于请求范围。

## 本轮生产接线

- 受管浏览器通过 Electron Debugger/CDP 观察隔离 world、frame、document 和 backend node。模型仍只使用一次观察中的 opaque ref；同外观节点替换不能接收旧输入。
- 实际输入使用 `Input.dispatchMouseEvent`、`Input.dispatchKeyEvent`、`Input.insertText`；输入前核对文档、节点和焦点。对 OOPIF 逐层换算位置并检查外层遮挡；鼠标移动之后再次核对控件，防止 hover 改变目标。按键和鼠标按下/释放成对清理。
- 下载许可绑定实际点击的链接、角色、操作及取消信号，单次使用并有短时限。DownloadItem 对象拥有独立传输身份，同名文件存入不同自有目录；完成后读回稳定文件大小和 SHA-256。原始 URL 凭据及签名查询不进入传输历史。
- 下载开始及结束通过现有生命数据库 writer 写入 ingress。重启后缺少结束回执的传输保持未验证；不自动重下，不因路径存在就标成功。
- `tool.browser_upload_files` 通过持久工作计划接入现有能力 registry 和执行端口。仅接受一至四个绝对路径、每文件至多 4 MiB、总计至多 16 MiB；先创建稳定字节快照，确认绑定确切文件、大小、hash 和页面目标，再向观察到的 file input 选择这些快照。返回明确区分文件选择与服务端接收。
- 单行控件拒绝含换行的输入；多行文本使用 textarea。带既有附件或秘密字段的外部表单保持受限，不能用文件选择成功推断已授权提交。
- 前台 broker 防止并发获取覆盖旧租约，读取目标后再次检查租约，释放失败保持隔离。按键账本不发送会释放用户后来物理按下按键的 key-up。原生输入 helper 仍未接通，这些 helper 验证不能算原生键鼠验收。

## 实际体验与已发现问题

真实 Electron 私有桌面检查完成三轮中文/emoji/多行输入、表单提交、下载独立读回、拒绝附件选择、批准附件选择和服务端实际字节核对，并检查关闭后重开浏览器继续下载。最终记录为 `output/execution-browser-native-20261020-pass11/report.json`：46 项检查通过。

对应 `output/execution-browser-native-20261020-pass11-desktop.json` 记录原生窗口位于指定私有桌面，开始与结束的输入桌面均为 Default、没有切换，退出码 0，Windows Job 已关闭。该体验是浏览器适配器专项，不是完整 Live2D 产品场景，也不是物理 SendInput 验收。最新版本包含输入前的焦点防护；真实 Chromium 测试另外验证 focus 处理器把焦点移走时，两个字段都不被误写。

实际失败记录保留在 `output/execution-browser-native-20261020*.log` 及各 pass 目录：

1. 单行文本吞掉换行，改为拒绝不匹配的控件并用多行控件验证。
2. 下载事件晚于点击返回，加入目标绑定的有限一次性许可。
3. 只派发按下/释放时，隐藏 Electron 窗口中的后续链接没有实际发出请求；补齐真实鼠标移动和按钮状态，再检查服务器请求与真实下载。
4. 销毁原生窗口之后再访问其 `webContents.session`，会破坏清理。改为在窗口存活时捕获 session，并检查关闭后重开不会遗留下载监听器。
5. pass8 的功能报告已经写为通过，但进程实际超时，不能作为通过的原生验收。专项运行器现在在关闭窗口、清理快照和关闭测试服务器之后才保存成功报告，并显式管理最后窗口关闭时的退出；pass11 同时具有成功报告和原生退出回执。

## 回归记录

| 记录 | 实际结果 |
| --- | --- |
| `output/execution-life-regression-20261020.log` | 593 个测试文件范围：5721 项通过、13 项失败、8 项跳过；失败均位于旧 DB 假驱动的执行任务测试。 |
| `output/execution-final-targeted-repaired-20261020.log` | 13 项旧测试改用真实 SQLite，事件幂等增加关闭重开后的持久化检查；相关 25 个文件、208 项全部通过。未放宽任务投影中的契约读取。 |
| `output/execution-final-browser-20261020.log` | 最后焦点防护及输入清理改动后，浏览器、快照、下载和输入所有权共 13 项通过。 |
| `output/execution-workspace-typecheck-20261020-closure.log` | 最后窗口生命周期修复后，全仓类型检查通过。初始运行缺少根级 vue-tsc 命令，使用现有桌面工具 bin 路径后通过，没有安装或升级依赖。 |
| `output/execution-verified-lint-20261020.log` | 定向 lint 0 错误、54 条警告；已在此前运行定向自动修复。 |

上述保留了完整回归的失败和后续修复记录；8 项跳过及全产品场景仍不视为通过。

本轮未重打包 exe；2026-10-19 的验收版不包含本轮源码修改。

## 剩余范围

原生键盘与接管、完整 Windows 控件矩阵、浏览器弹窗/现有会话授权与撤销、Chromium 下载 GUID 的完整关联、跨重启的下载结果核对、外部上传回执配方、五类 adapter 的未知效果恢复、自动补偿、技能评估激活、重规划/要求修改、真实注意坐标、长期保留策略和完整发行验收仍需完成。浏览器专项通过不能关闭这些项目。

Sandbox 最新记录 `output/windows-sandbox-current-state-20261020.json` 仍是客户端未就绪、CBS 等待完整重启；未执行系统重启。

## 清理限制

已记录六个本轮临时浏览器档案，合计 26,166,862 字节，见 `output/execution-browser-cleanup-candidates-20261020.json`。自动审批审查拒绝递归删除，原因为 `blocked by policy`；未绕过限制，目录暂时保留。后续原生复验档案也暂时保留，路径在各轮报告及档案自身的 owner manifest 中。见 `output/execution-browser-cleanup-blocked-20261020.json`。下载产物、失败日志和验收证据保留。

实现依据：[Electron Debugger](https://www.electronjs.org/docs/latest/api/debugger)、[Chromium Input 协议](https://chromedevtools.github.io/devtools-protocol/tot/Input/)、[Chromium DOM 协议](https://chromedevtools.github.io/devtools-protocol/tot/DOM/)、[Electron DownloadItem](https://www.electronjs.org/docs/latest/api/download-item/)。本轮新增实现没有复制额外上游源码；已有 Windows-MCP 算法归属继续保留。
