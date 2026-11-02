# Native popup ownership at dispatch

Phase 1 computer execution must keep an observed popup attached to the same window context through risk review and actual dispatch. A stable HWND, PID, process birth time, title and control descriptor do not prove a stable `GW_OWNER` relationship.

The owned WinForms reproduction changes only a popup's native parent owner. The old worker still invokes the unchanged save button and writes a marker after that change. The failed native report retains both owners, the dispatched action and a normal fixture exit. Two focused runtime tests independently fail because the captured owner is absent from the worker request.

The desktop runtime now includes the observed nullable owner in the risk-review target and target fingerprint, and passes it into native semantic mutations. The worker compares the actual `GW_OWNER` immediately before each semantic dispatch. An explicit null is a binding, so a previously unowned window that acquires an owner also invalidates the old authority. A mismatch returns `WINDOWS_UIA_WINDOW_OWNER_CHANGED`, with no dispatched side effect. Fresh observation and a newly bound action can succeed; the old action is never automatically retried.

The native fixture operates on an inactive private desktop with exact owned HWND/PID/process-birth/class/title identities. It checks that refusal leaves the marker absent, then uses a new observation and independently verifies the real writer's UTF8 file. It never switches the input desktop or injects global input. This proves a native capability boundary, not a complete model-driven product workflow or physical user takeover.

The first null-owner fixture assumption was wrong: `ShowInTaskbar=false` makes WinForms install an internal parking owner. That failed report remains. The fixture now explicitly clears only its own popup's native owner and verifies the real null before publishing readiness. The original owned-parent reproduction and the production refusal assertions remain unchanged.

The current targeted desktop/interface suite executes 19 cases, including three new propagation and risk-review checks, with no failures. Desktop Node and Vue type checks pass. A qualification controller initially expected at least 20 cases although the selected five files contain 19; that controller failure is retained, and the continuation verifies all 19 identities and the three new checks rather than deleting tests or changing their assertions. Final three-round source-bound native qualification and promotion receipts live under the worktree output directory.

Separately, the v320 cross-system run has 2039 passing cases, one failed fixture wait and three explicitly skipped cases. The read-repair fixture used the default one-second wait for real SQLite work to become blocked and idle; the unchanged required postconditions exceeded that interval under concurrent native/build load. Its bounded wait now matches the surrounding ten-second integration waits. No production deadline, cancellation requirement, side-effect check or model request is relaxed. A fresh complete run remains required.

Current-source packaging, real configured generation, full product scenarios, common Windows file dialogs, interactive menu capture, physical takeover and mixed-DPI experience remain separate acceptance items. This repair does not declare EX00–EX23 complete.
