# Main catalogue contract and native content-search acceptance

The actual main MCP port returns `ElectronMcpToolDescriptor[]`. The main chat consumer previously expected `{ tools: [...] }`, silently hiding directory listing and content search from the model. Tests used the same incorrect wrapper and did not expose the integration defect.

V307 uses the existing array contract in the port type, consumer, replay harness and test fixtures. Tool identity still requires the exact `filesystem::<toolName>` descriptor and active capability registry. Missing binaries still omit search. No compatibility branch or new permission bypass is added.

Two real-array cases failed before the consumer fix. Both pass afterward, along with the two upstream-truncation cases. The broader worktree run passes 302 tests across 13 files. Desktop types pass after correcting one typed sensory fixture and the replay-harness catalogue. Scoped lint passes with one existing warning.

The actual product scenario uses 24 random file names in one new nonce-owned child of `Documents/Alicization_Workspace`. Only a root and random content marker enter the normal chat UI. After normal native exit, a read-only SQLite connection checks persisted search and subsequent full-read effects in the same turn, native stopped-tree binding, exact UTF-8 byte hash, and absence of writes. It checks directory identity, owner nonce, file identities and hashes before removing only that fixture. Any failed assertion preserves the fixture and original report. Native receipt signatures are verified by the live search runtime; the post-exit inspector does not claim to reverify an in-memory signing key.

The packaged search binary and notices must match the fixed source resource hashes in `resources/tools/ripgrep`; those extra resources are verified outside ASAR. All other compiled inputs, native bindings, lockfile and NSIS includes retain their existing checks.

Primary checks, package identity and actual product outcomes are recorded under `output/execution-v307-*`. They remain distinct from the worktree result. This checkpoint does not close EX01–EX23, the external native Codex/Claude provider failures, physical human takeover, long-term continuity or delayed-glyph mouth synchronization. The retained V305 timing failure and later successful first-glyph replay are both evidence; neither establishes all-glyph synchronization under renderer stalls.
