; Prefer our pinned multiUser.nsh before any macro is expanded. Keep the
; standard builder entrypoint, including its signed-uninstaller build pass.
; The config resolves the original template directory from the installed builder.
!addincludedir "$%ALICIZATION_NSIS_UPSTREAM_TEMPLATES%"
!cd "${BUILD_RESOURCES_DIR}\nsis"

; Cold NSIS startup failed with inherited pipes in the Windows acceptance host.
; Clear only pipe standard handles before multi-user initialization. Console and
; file handles remain valid; child helpers establish their own I/O handles.
; https://learn.microsoft.com/en-us/windows/console/setstdhandle
!macro AlicizationClearInheritedPipe device
  Push $0
  Push $1
  System::Call 'kernel32::GetStdHandle(i ${device}) p.r0'
  System::Call 'kernel32::GetFileType(p r0) i.r1'
  ${If} $1 = 3
    System::Call 'kernel32::SetStdHandle(i ${device}, p 0) i.r1'
    ${If} $1 = 0
      SetErrorLevel 1
      Quit
    ${EndIf}
  ${EndIf}
  Pop $1
  Pop $0
!macroend

!macro preInit
  !insertmacro AlicizationClearInheritedPipe -10
  !insertmacro AlicizationClearInheritedPipe -11
  !insertmacro AlicizationClearInheritedPipe -12
!macroend
