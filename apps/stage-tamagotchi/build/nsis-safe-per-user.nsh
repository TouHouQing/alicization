; Adapted from electron-builder (MIT), commit a356198ec7c54c7795659342bff36d9a5162cd93.
; Copyright (c) 2015 Loopline Systems. Full license: resources/licenses/electron-builder-MIT.txt.
; Keep the existing registry path and explicit /D override; only replace the
; unsafe fixed-width PWSTR read and System::Store register handling.
!ifndef ALICIZATION_SAFE_PER_USER_MODE
!define ALICIZATION_SAFE_PER_USER_MODE

!macro setInstallModePerUser
  StrCpy $installMode CurrentUser
  SetShellVarContext current
  ReadRegStr $perUserInstallationFolder HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
  ${if} $perUserInstallationFolder != ""
    StrCpy $INSTDIR $perUserInstallationFolder
  ${else}
    StrCpy $0 "$LocalAppData\Programs"
    Push $1
    Push $2
    StrCpy $2 0
    System::Call 'SHELL32::SHGetKnownFolderPath(g "${FOLDERID_UserProgramFiles}", i ${KF_FLAG_CREATE}, p 0, *p .r2)i.r1'
    ${If} $1 == 0
      System::Call 'KERNEL32::lstrcpynW(w .r0, p r2, i ${NSIS_MAX_STRLEN})p'
    ${endif}
    ; The API may allocate even on failure; every returned pointer is freed.
    ${If} $2 != 0
      System::Call 'OLE32::CoTaskMemFree(p r2)'
    ${endif}
    Pop $2
    Pop $1
    StrCpy $INSTDIR "$0\${APP_FILENAME}"
  ${endif}
  !insertmacro GetDParameter $R0
  ${If} $R0 != ""
    StrCpy $INSTDIR $R0
  ${endif}
!macroend
!endif
