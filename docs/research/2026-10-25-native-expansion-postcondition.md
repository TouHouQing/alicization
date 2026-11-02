# Windows 菜单展开结果校验

本改动补充实际展开状态检查，不表示完整菜单、弹窗、视觉输入或EX07已验收。

私有桌面的WPF实际菜单已观察到正确标题、进程出生时间、HWND及desktop，ExpandCollapse调用返回后菜单仍关闭。打开事件不证明展开：fixture实际记录 `opened=False;capture=False;active=True`，子项不可见、popup HWND为0。

微软WPF的 [MenuBase实现](https://github.com/dotnet/wpf/blob/main/src/Microsoft.DotNet.Wpf/src/PresentationFramework/System/Windows/Controls/Primitives/MenuBase.cs) 在进入菜单模式时尝试取得鼠标捕获；失败立即退出并关闭子菜单。该路径与本机私有非输入桌面的观察吻合；尚未在独立交互Windows来宾中确认正向菜单操作，不能把推断当作该环境的全部根因。参考 [微软winapp UI自动化说明](https://github.com/microsoft/winappCli/blob/main/docs/ui-automation.md)，控件模式操作与真实输入分开；没有引入其通用祖先回退或未限定窗口的输入。

`life-windows-desktop-worker.ps1` 现在只调用一次Expand，在原动作期限内有界读取当前ExpandCollapseState，500毫秒仍未展开则返回 `WINDOWS_UIA_EXPANSION_NOT_OBSERVED`。已派发的效果保留unknown；不会自动重放、转成鼠标输入或报告菜单已展开。叶节点在派发前拒绝。取消仍由原有受管worker生命周期负责。

证据位于隔离目录 `C:/Users/Administrator/.codex/worktrees/execution-transfer/alicization/output/`：

- `execution-native-wpf-expansion-postcondition-20261025-pass7.log`：真实菜单仍失败，已正确返回未观察到展开、effectMayHaveOccurred=true、unknown；窗口正常关闭0、worker全部关闭、Default未切换。失败结果保留，不计正向菜单覆盖。
- `execution-native-expansion-pattern-boundary-20261025.log`：实际PowerShell函数的五种受控pattern边界通过，包括展开、未展开、叶节点、派发前过期、派发后过期，确认不重复Expand并区分是否可能产生效果。
- `execution-native-expansion-runtime-20261025.log`：两文件八项通过；运行时保留unknown并使旧观察失效，再次输入必须重新观察。
- `execution-native-expansion-types-20261025.log`：隔离目录Node类型通过。两文件按主目录v125原哈希审查合入，完整主目录组合验证待完成。

未合入实验性的ownedWindows枚举、菜单fixture诊断及popup API。完整菜单和弹窗能力仍属开放项。
