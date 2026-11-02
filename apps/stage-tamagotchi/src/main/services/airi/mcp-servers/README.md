# Governed tools and local filesystem

`index.ts` owns the desktop MCP entry and its confirmation policy. Requests are
copied before asynchronous permission work. The request/token owns the displayed
content; canonical path scope is checked again before invoking the tool.

## Canonical local operations

`filesystem::read_file`, `filesystem::write_file` and
`filesystem::list_directory` have host-local semantics. They always use the
built-in adapter and its schemas, including when a configured MCP server also
advertises those names. External filesystem services should use their own server
namespace. Other configured MCP tool names keep their external route.

`local-filesystem.ts` bounds native reads and writes to two MiB, validates UTF-8
reads, and binds approved writes to a canonical path, inode/device and content
hash. The opened file is checked before the first write. Bounded chunks, final
truncation, sync and readback use one owned handle; all exit paths close it.
Exclusive creation protects a new destination. A partial write is an uncertain
effect rather than a failure that permits a blind retry.

`file-mutation-queue.ts` serializes canonical path and inode aliases in one
registration order. It is a local adapter queue; the life runtime's host broker
remains the authority for cross-card execution ownership and durable uncertainty.
The queue retains Pi's MIT attribution and packaged license.

## Cancellation and observations

Cancellation immediately aborts the native operation signal. Its result waits
for the actual native invocation to settle, including handle cleanup, before it
reports `executionStopped`. Opaque external invocations can return an interrupted
result with `executionStopped: false`; such a result cannot release a resource
quarantine through file readback. Error normalization preserves both this fact
and `effectMayHaveOccurred` through the dialogue/work boundary.

Before tool dispatch, cancellation/refusal can carry a private receipt bound to
the current card/effect. Internal normalization preserves that receipt; a JSON
copy cannot release the action as definitely not started. Once an adapter has
begun, the original uncertainty and native-stop protocol still applies.

Write approval snapshots include a bounded preview, full UTF-8 length, full
SHA-256 and explicit truncation state. The renderer shows the complete-content
binding, and the eventual write uses the same immutable approved request.

## Verification

Run targeted tests with `pnpm exec vitest run
apps/stage-tamagotchi/src/main/services/airi/mcp-servers`. Tests include actual
UTF-8 disk effects, half-written cancellation with a closed handle, hard-link
serialization, equal-byte replacement, directory-link changes during approval,
immutable request content and waiting for native stop acknowledgement. Packaged
Windows/Live2D acceptance is recorded separately from these tests.
