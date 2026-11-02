# Execution implementation attribution

## Windows-MCP owned input ledger

- Upstream: https://github.com/CursorTouch/Windows-MCP
- Reviewed commit: `a3d8e0160fd61d8f1002988333fd11c5ad71a639`
- Source: `src/windows_mcp/desktop/control_ledger.py`
- License: MIT, copyright 2025 JEOMON GEORGE. Included at `apps/stage-tamagotchi/resources/licenses/windows-mcp-MIT.txt`.
- Adaptation: a TypeScript driver-based implementation in `execution/windows-input-ledger.ts`; ownership before key-down, reverse cleanup, retained failed releases, serialized injection and takeover. No Python runtime dependency. Native Windows injection is a separate Alicization implementation and requires isolated acceptance.
- The source-study manifest records the exact retained source hash. This attribution does not assert completion of native acceptance.
