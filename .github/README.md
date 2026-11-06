# GitHub Actions

## Continuous integration

`ci.yml` runs on pushes and pull requests targeting `main`, and can also be
started manually. It uses Node.js 24 and the pnpm version pinned in the root
`package.json`, with frozen dependency installation.

The checks cover lint, workspace types, application builds, the Alicization final
gate, and dependency provenance. Build matrix entries finish independently so a
web build failure does not hide the desktop build result.

The web build includes the Histoire component site. Story collection runs in
Node and must not require browser storage; the server uses the default locale,
while the browser can read its saved language.
The component site's ES2022 build target supports the top-level await used by
its WASM dependencies.

The final gate retains the current life-loop contracts: two recent exchanges
survive compression, executable interfaces remain available through capability
discovery, and relationship reflections do not create automatic positive
personality feedback or duplicate training examples.
The workbench database integration suite has a bounded 30-second timeout per
case because a production trial also verifies four isolated native SQLite
scopes. Unit tests retain their normal timeout.
Desktop capability fixtures explicitly select Windows; Linux availability
checks still reject operations without an implemented adapter. CI runs the
capability registry's platform checks before the final gate. Local worktrees stay
ignored and must not be committed as unregistered submodules.

## Manual deployment

Production deployment is currently manual. Pushing code does not start
`deploy-stage-web-server.yml` or `deploy-stage-server-docker.yml`.

To deploy, open the corresponding workflow in GitHub Actions, choose **Run
workflow**, and select the intended ref. Web deployment builds the application,
documentation and component site before uploading them. Docker deployment syncs
the repository, builds the server stack and checks its health endpoint.

Both workflows require the configured deployment user, SSH port and private key.
The server must accept the matching public key. An SSH `Permission denied
(publickey,password)` error means authentication failed before repository sync;
rerunning a build does not repair the server's authorized keys. Check deployment
credentials and server access before manually deploying.
